---
title: "シークレットソースプラグイン"
description: "Hermes Agent 用のシークレットマネージャ連携プラグインの作り方"
upstream_path: developer-guide/secret-source-plugin.md
upstream_blob: 3c0dd465e263a0b676d16156313a07e1f8b87da0
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/secret-source-plugin
---

# シークレットソースプラグインを作る {#building-a-secret-source-plugin}

シークレットソースは、外部のシークレットマネージャ（保管庫、パスワード管理ソフト、OS のキーストア、独自のスクリプトなど）からプロバイダの認証情報を取り出し、プロセスの起動時に環境変数として渡します。タイミングは `~/.hermes/.env` を読み込んだあと、Hermes が認証情報を参照する前です。Bitwarden、1Password、そして汎用のコマンド補助ソースは本体に同梱されていますが、**それ以外のバックエンドはすべてプラグイン** です。このページではその作り方を説明します。

:::tip
同梱するものを絞っているのは意図的で、[メモリプロバイダ](/hermes/docs/developer-guide/memory-provider-plugin/) と同じ方針です。`agent/secret_sources/` の下に新しい保管庫バックエンドを足す PR は、このページを案内したうえでクローズされます。バックエンドは独立したプラグインのリポジトリとして公開し、Nous Research の Discord（`#plugins-skills-and-skins`）で共有してください。
:::

## 最初のプロセスでの起動タイミング {#first-process-bootstrap-timing}

`load_hermes_dotenv()` は多くの場合、プラグインが登録される **前** のインポート時点で走ります。
そこで Hermes は、**有効になっている** プラグインのシークレットソースが設定されている場合、
プラグインの探索後にシークレットを取り直します。有効かどうかの判定にはソースの
`is_enabled(cfg)` の取り決めを使い、標準的な書き方は
`secrets.<name>.enabled: true` ですが、独自の有効化条件も引き続き使えます。
これで「Bitwarden を自分の保管庫に置き換える」ときに最初のプロセスだけ穴が空く問題（#64177）が塞がりました。

- 取り直しは何度実行しても同じ結果になり、失敗しても素通りします（起動を止めることはありません）。
- ソースが環境変数を渡す経路はオーケストレータ経由だけです。他のプラグインや利用者のシークレット全体を、
  自分のソースの設定で許された範囲を超えて吸い出すようなプラグイン API は **ありません**。
- 読み込み後の `os.environ` は、同じプロセス内のコードならどれでも読めます —
  信頼の境界は「有効なプラグインはエージェントと同じ権限で動く」ままです。

## フレームワークが受け持つもの／自分が受け持つもの {#what-the-framework-owns-vs-what-you-own}

オーケストレータ（`agent.secret_sources.registry.apply_all`）が、セキュリティと優先順位に関わる部分をすべて受け持ちます。バックエンド側が間違えようがない作りです。

| フレームワークが受け持つ | 自分が受け持つ |
|---|---|
| ソースの順序、mapped と bulk の優先順位 | バックエンドから値を取ってくること |
| 先に主張したほうが勝つ衝突処理と警告 | 参照の書式を検証すること |
| `override_existing` の意味づけ（ソースをまたぐことはない） | CLI／SDK／API とやり取りすること |
| 保護された起動用トークン | どの環境変数が自分の起動用トークンかを申告すること |
| ソースごとの実時間タイムアウト | `fetch()` をそれなりに速く保つこと |
| 変数ごとの出どころと `(from X)` のラベル | 人が読める `label` |
| `os.environ` への書き込み | 何もなし — 環境変数には一切触れません |

## ディレクトリ構成 {#directory-structure}

```
~/.hermes/plugins/my-vault/
├── plugin.yaml      # name, description
└── __init__.py      # SecretSource subclass + register(ctx)
```

## SecretSource 抽象基底クラス {#the-secretsource-abc}

`agent.secret_sources.base.SecretSource` を実装します。必須のメソッドは 1 つだけです。

```python
from pathlib import Path

from agent.secret_sources.base import (
    ErrorKind,
    FetchResult,
    SecretSource,
    run_secret_cli,
)

class MyVaultSource(SecretSource):
    name = "myvault"          # config section key: secrets.myvault
    label = "My Vault"        # used in startup lines + provenance labels
    shape = "mapped"          # "mapped" (explicit VAR→ref map) or "bulk" (project dump)
    scheme = "mv"             # optional: unique URI scheme you own (mv://...)

    def fetch(self, cfg: dict, home_path: Path) -> FetchResult:
        """Resolve secrets. MUST NOT raise. MUST NOT prompt."""
        result = FetchResult()
        token = os.environ.get("MYVAULT_TOKEN", "").strip()
        if not token:
            result.error = "secrets.myvault.enabled is true but MYVAULT_TOKEN is not set."
            result.error_kind = ErrorKind.NOT_CONFIGURED
            return result

        try:
            proc = run_secret_cli(
                ["myvault-cli", "export", "--json"],
                allow_env=["MYVAULT_TOKEN"],   # ONLY your auth vars — never full os.environ
                timeout=30,
            )
        except RuntimeError as exc:           # spawn failure / timeout
            result.error = str(exc)
            result.error_kind = ErrorKind.BINARY_MISSING
            return result

        if proc.returncode != 0:
            result.error = f"myvault-cli exited {proc.returncode}: {proc.stderr[:200]}"
            result.error_kind = ErrorKind.AUTH_FAILED
            return result

        result.secrets = parse_your_output(proc.stdout)  # {ENV_VAR: value}
        return result

    def protected_env_vars(self, cfg: dict):
        # Your bootstrap token — no source (including yours) may ever overwrite it.
        return frozenset({"MYVAULT_TOKEN"})
```

### 守るべき取り決め（お願いではなく、強制されます） {#contract-rules-enforced-not-suggestions}

- **`fetch()` は例外を投げません。** エラーは `result.error` と `result.error_kind` に入れます。例外を投げた場合はオーケストレータが受け止めて `INTERNAL` として報告します — 機能ではなく、取り決め違反です。
- **`fetch()` は入力を求めません。** 起動処理は端末のない環境（ゲートウェイ、cron、Docker）でも走ります。`run_secret_cli()` は標準入力を閉じるので、入力を求める補助コマンドはすぐ失敗します。対話的な認証は CLI の初期設定の流れに置くもので、起動経路に置くものではありません。
- **同期的に、決められた時間内で。** オーケストレータは実時間のタイムアウトを課します（既定は 120 秒、`secrets.<name>.timeout_seconds` で調整できます）。超えると `TIMEOUT` として報告され、結果は捨てられます。
- **取ってくるのは自分、適用するのはオーケストレータ。** 自分が提供する *つもりの* 対応表を返してください。`os.environ` を自分で書き換えてはいけません — 優先順位、衝突の検出、出どころの記録をすべて素通りしてしまいます。
- **API のバージョン管理。** `SecretSource.api_version` は既定で現在の `SECRET_SOURCE_API_VERSION` になります。別のバージョン向けに作られたソースは、起動を止める代わりに警告を出して読み飛ばされます。

### `shape` の選び方 {#choosing-your-shape}

- `mapped` — 利用者が設定のなかで環境変数の名前と参照を明示的に結びつける方式です（1Password の `env:` マップのように）。意図がいちばんはっきりしているので、同じ変数が競合したときは mapped の主張が bulk に勝ちます。
- `bulk` — プロジェクトやフォルダ単位のシークレットをまとめて暗黙に流し込む方式です（Bitwarden BSM のように）。mapped のソースには譲ります。

### 任意のフック {#optional-hooks}

| メソッド | 既定の動き | 上書きすべき場面 |
|---|---|---|
| `is_enabled(cfg)` | `cfg.get("enabled")` | 独自の有効化条件を使うとき |
| `override_existing(cfg)` | `cfg.get("override_existing", False)` | 既定を変えたいとき（同梱の 2 つのソースは、鍵の入れ替えを想定して `True` を既定にしています） |
| `protected_env_vars(cfg)` | 空 | 起動用トークンがあるとき（まずあるはずです） |
| `fetch_timeout_seconds(cfg)` | 120 秒 | バックエンドに別の時間配分が必要なとき |
| `config_schema()` | `{}` | 設定画面向けに設定キーを申告するとき |
| `remediation(kind, cfg)` | `ErrorKind` ごとの一般的なヒント | 失敗時の警告から自分の修復コマンドへ誘導したいとき（たとえば同梱のソースは `AUTH_FAILED` に対して `Run hermes secrets <name> token…` を返します）。種類から文字列への純粋な対応でなければなりません。入出力を行わず、例外も投げないこと。ヒントを出したくないときは `""` を返します。 |

## サブプロセスの安全性: `run_secret_cli()` を使う {#subprocess-safety-use-runsecretcli}

バックエンドが CLI を呼び出すなら、`subprocess.run` を直接使わず共有の補助関数を使ってください。監査済みの安全な作りがそのまま手に入ります。引数配列のみ（`shell=True` は使わない）、**必要最小限だけを許可した子プロセスの環境**（ソースが走る時点で `os.environ` には Hermes が知っている認証情報がすべて入っています。それを子プロセスに丸ごと渡してはいけません）、`NO_COLOR` の指定と ANSI エスケープを除いた標準エラー出力、標準入力を閉じること、タイムアウト時はきれいな `RuntimeError` になること。利用者が指定した参照文字列は、引数配列のなかで `--` の区切りより後ろに置いて、フラグとして解釈される余地をなくしてください。

## 登録する {#registering}

```python
# __init__.py
def register(ctx):
    ctx.register_secret_source(MyVaultSource())
```

次の場合、登録は（クラッシュではなくログの警告とともに）拒否されます。`SecretSource` でないインスタンス、名前が不正または重複している、`scheme` を別のソースがすでに持っている、`api_version` が違う、`shape` が `mapped`／`bulk` のどちらでもない。

:::note タイミング
プラグインの探索は、最初の `load_hermes_dotenv()` 呼び出しより起動処理の後ろで走ります。探索の直後に Hermes は有効なプラグインのシークレットソースを取り直すので（`reset_secret_source_cache()` と `load_hermes_dotenv()`）、探索を行ったプロセス *でも* きちんと反映されます — 上の [最初のプロセスでの起動タイミング](#first-process-bootstrap-timing) を参照してください（#64177）。取り直しは失敗しても素通りし、プラグインのソースがどれも有効でなければ実行されません。プラグインのモジュールを読み込む段階や `register(ctx)` の中で `os.environ` を読むコードは、依然として取り直しより前に走るため、そのソース自身が渡す認証情報を当てにはできません。認証情報が要る処理は `fetch()` の中に置いてください。ゲートウェイ、cron、サブエージェントの各プロセスも、同じ探索と取り直しの流れをたどります。
:::

## 利用者から見れば他のソースと同じように設定できる {#users-configure-it-like-any-other-source}

```yaml
secrets:
  sources: [myvault, bitwarden]   # optional ordering
  myvault:
    enabled: true
    # ... your config_schema keys
```

複数ソースの優先順位、衝突の警告、`(from My Vault)` という出どころのラベルは、いずれも自動で働きます — 優先順位のはしごについては [利用者向けのシークレットの説明](/hermes/docs/user-guide/secrets/) を参照してください。

## 適合性テストキットで検証する {#validate-with-the-conformance-kit}

Hermes のリポジトリにあるテストキット（`tests/secret_sources/conformance.py`）を、プラグインのテストで継承してください。

```python

from tests.secret_sources.conformance import SecretSourceConformance

class TestMyVaultConformance(SecretSourceConformance):
    @pytest.fixture
    def source(self):
        return MyVaultSource()
```

このキットが確かめるのは、破ると他の人に迷惑がかかる決まりごとです。壊れた設定でも例外を投げないこと、エラーの種類が機械で読めること、既定では無効であること、タイムアウトが正の値であること、保護する変数の名前が妥当であること、そして `apply_all()` を通した一連の流れが成り立つこと。この適合性テストが通ることが、バックエンドを「取り決めに沿っている」と呼ぶためのレビューの基準です。

## ErrorKind の一覧 {#errorkind-reference}

| 種類 | 意味 |
|---|---|
| `NOT_CONFIGURED` | 有効になっているのに、トークン／プロジェクト／対応表が足りない |
| `BINARY_MISSING` | 補助の CLI が見つからない、または実行できない |
| `AUTH_FAILED` / `AUTH_EXPIRED` | 認証情報が誤っている、または期限切れ |
| `REF_INVALID` | シークレットの参照が検証に通らなかった |
| `NETWORK` | 通信の段階で失敗した |
| `EMPTY_VALUE` | バックエンドが参照に対して何も返さなかった — 正常な認証情報を `""` で上書きしてはいけない |
| `TIMEOUT` | 取得が制限時間を超えた |
| `INTERNAL` | それ以外すべて（不具合、想定外の形） |
