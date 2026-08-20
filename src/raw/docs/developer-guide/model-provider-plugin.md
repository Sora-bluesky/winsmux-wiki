---
title: "モデルプロバイダプラグイン"
description: "Hermes Agent 用のモデルプロバイダ（推論バックエンド）プラグインの作り方"
upstream_path: developer-guide/model-provider-plugin.md
upstream_blob: 5127107fa3122304d55a856308491d78d72b5eac
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/model-provider-plugin
---

# モデルプロバイダプラグインを作る {#building-a-model-provider-plugin}

モデルプロバイダプラグインは推論バックエンドを申告するものです。OpenAI 互換のエンドポイント、Anthropic Messages のサーバー、Codex 形式の Responses API、Bedrock ネイティブの窓口などを申告すると、Hermes は `AIAgent` の呼び出しをそこへ流せるようになります。組み込みのプロバイダ（OpenRouter、Anthropic、GMI、DeepSeek、Nvidia など）はすべてこの形のプラグインとして同梱されています。第三者も `$HERMES_HOME/plugins/model-providers/` の下にディレクトリを置くだけで、リポジトリには一切手を入れずに自分のプロバイダを追加できます。

:::tip
モデルプロバイダプラグインは、3 種類ある **プロバイダプラグイン** のうちの 1 つです。残りは [メモリプロバイダプラグイン](/hermes/docs/developer-guide/memory-provider-plugin/)（セッションをまたぐ知識）と [コンテキストエンジンプラグイン](/hermes/docs/developer-guide/context-engine-plugin/)（コンテキストの圧縮方式）です。3 つとも「ディレクトリを置き、プロファイルを申告し、リポジトリは触らない」という同じ形をとります。
:::

## 探索のしくみ {#how-discovery-works}

`providers/__init__.py._discover_providers()` は、どこかのコードが最初に `get_provider_profile()` か `list_providers()` を呼んだ時点で遅延実行されます。探索の順序は次のとおりです。

1. **同梱のプラグイン** — `<repo>/plugins/model-providers/<name>/` — Hermes に付属します
2. **利用者のプラグイン** — `$HERMES_HOME/plugins/model-providers/<name>/` — 好きなディレクトリを置くだけで、次のセッションからは再起動なしで有効です
3. **従来の単一ファイル形式** — `<repo>/providers/<name>.py` — リポジトリ外の editable インストール向けの後方互換です

**同じ名前なら、利用者のプラグインが同梱のプラグインを上書きします。** `register_provider()` は後から書いたほうが勝つ作りだからです。`$HERMES_HOME/plugins/model-providers/gmi/` というディレクトリを置けば、リポジトリに触らずに組み込みの GMI のプロファイルを差し替えられます。

## ディレクトリ構成 {#directory-structure}

```
plugins/model-providers/my-provider/
├── __init__.py       # Calls register_provider(profile) at module-level
├── plugin.yaml       # kind: model-provider + metadata (optional but recommended)
└── README.md         # Setup instructions (optional)
```

必須のファイルは `__init__.py` だけです。`plugin.yaml` は `hermes plugins` が中身を調べるときと、汎用の PluginManager がプラグインを正しい読み込み処理へ振り分けるときに使われます。無い場合、汎用の読み込み処理はソースコードの文面から推測して判断します。

## 最小の例 — API キーだけの単純なプロバイダ {#minimal-example-a-simple-api-key-provider}

```python
# plugins/model-providers/acme-inference/__init__.py
from providers import register_provider
from providers.base import ProviderProfile

acme = ProviderProfile(
    name="acme-inference",
    aliases=("acme",),
    display_name="Acme Inference",
    description="Acme — OpenAI-compatible direct API",
    signup_url="https://acme.example.com/keys",
    env_vars=("ACME_API_KEY", "ACME_BASE_URL"),
    base_url="https://api.acme.example.com/v1",
    auth_type="api_key",
    default_aux_model="acme-small-fast",
    fallback_models=(
        "acme-large-v3",
        "acme-medium-v3",
        "acme-small-fast",
    ),
)

register_provider(acme)
```

```yaml
# plugins/model-providers/acme-inference/plugin.yaml
name: acme-inference
kind: model-provider
version: 1.0.0
description: Acme Inference — OpenAI-compatible direct API
author: Your Name
```

これで終わりです。この 2 つのファイルを置くだけで、以下が他に何も編集せずに **自動でつながります**。

| つながる先 | 場所 | 得られるもの |
|---|---|---|
| 認証情報の解決 | `hermes_cli/auth.py` | `PROVIDER_REGISTRY["acme-inference"]` がプロファイルから埋まります |
| `--provider` の CLI フラグ | `hermes_cli/main.py` | `acme-inference` を受け付けます |
| `hermes model` のモデル選択画面 | `hermes_cli/models.py` | `CANONICAL_PROVIDERS` に現れ、モデル一覧は `{base_url}/models` から取得されます |
| `hermes doctor` | `hermes_cli/doctor.py` | `ACME_API_KEY` の確認と `{base_url}/models` への疎通チェック |
| `hermes setup` | `hermes_cli/config.py` | `ACME_API_KEY` が `OPTIONAL_ENV_VARS` と初期設定の案内に現れます |
| URL からの逆引き | `agent/model_metadata.py` | ホスト名からプロバイダ名を自動で判定します |
| 補助モデル | `agent/auxiliary_client.py` | 圧縮や要約に `default_aux_model` を使います |
| 実行時の解決 | `hermes_cli/runtime_provider.py` | 正しい `base_url`、`api_key`、`api_mode` を返します |
| 通信層 | `agent/transports/chat_completions.py` | プロファイル経由の経路が `prepare_messages` / `build_extra_body` / `build_api_kwargs_extras` から引数を組み立てます |

## ProviderProfile の項目 {#providerprofile-fields}

完全な定義は `providers/base.py` にあります。よく使うものは次のとおりです。

| 項目 | 型 | 用途 |
|---|---|---|
| `name` | str | 正式な id — `config.yaml` の `model.provider` と `--provider` フラグに一致します |
| `aliases` | `tuple[str, ...]` | `get_provider_profile()` が解決してくれる別名（例: `grok` → `xai`） |
| `api_mode` | str | `chat_completions` \| `codex_responses` \| `anthropic_messages` \| `bedrock_converse` |
| `display_name` | str | `hermes model` の選択画面に出す表示名 |
| `description` | str | 選択画面の副題 |
| `signup_url` | str | 初回設定のときに出す案内（「API キーはここで取得」） |
| `env_vars` | `tuple[str, ...]` | API キーの環境変数を優先順に並べたもの。最後の `*_BASE_URL` の項目は、利用者がベース URL を上書きするために使われます |
| `base_url` | str | 既定の推論エンドポイント |
| `models_url` | str | カタログの URL を明示するもの（無ければ `{base_url}/models`） |
| `auth_type` | str | `api_key` \| `oauth_device_code` \| `oauth_external` \| `copilot` \| `aws_sdk` \| `external_process` |
| `fallback_models` | `tuple[str, ...]` | 実際のカタログ取得に失敗したときに見せる、選りすぐりの一覧 |
| `default_headers` | `dict[str, str]` | すべてのリクエストに付けるもの（例: Copilot の `Editor-Version`） |
| `fixed_temperature` | Any | `None` なら呼び出し側の値を使い、`OMIT_TEMPERATURE` という目印なら temperature を一切送りません（Kimi） |
| `default_max_tokens` | `int \| None` | プロバイダごとの max_tokens の上限（Nvidia は 16384） |
| `default_aux_model` | str | 補助的な処理（圧縮、画像の読み取り、要約）に使う安価なモデル |

## 上書きできるフック {#overridable-hooks}

込み入った癖に対応したいときは `ProviderProfile` を継承してください。

```python
from typing import Any
from providers.base import ProviderProfile

class AcmeProfile(ProviderProfile):
    def prepare_messages(self, messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Provider-specific message preprocessing. Runs after codex
        sanitization, before developer-role swap. Default: pass-through."""
        # Example: Qwen normalizes plain-text content to a list-of-parts
        # array and injects cache_control; Kimi rewrites tool-call JSON
        return messages

    def build_extra_body(self, *, session_id=None, **context) -> dict:
        """Provider-specific extra_body fields merged into the API call.
        Context includes: session_id, provider_preferences, model, base_url,
        reasoning_config. Default: empty dict."""
        # Example: OpenRouter's provider-preferences block,
        # Gemini's thinking_config translation.
        return {}

    def build_api_kwargs_extras(self, *, reasoning_config=None, **context):
        """Returns (extra_body_additions, top_level_kwargs). Needed when some
        fields go top-level (Kimi's reasoning_effort, OpenRouter's verbosity for
        adaptive Anthropic models) and some go in extra_body (OpenRouter's
        reasoning dict). Default: ({}, {})."""
        return {}, {}

    def fetch_models(self, *, api_key=None, base_url=None, timeout=8.0) -> list[str] | None:
        """Live catalog fetch. Default hits {models_url or base_url}/models with
        Bearer auth. Override for: custom auth (Anthropic), no REST endpoint
        (Bedrock → None), or public/unauthenticated catalogs (OpenRouter)."""
        return super().fetch_models(api_key=api_key, base_url=base_url, timeout=timeout)
```

## フックの実例 {#hook-reference-examples}

書き方の参考には、同梱の次のプラグインを見てください。

| プラグイン | 見どころ |
|---|---|
| `plugins/model-providers/openrouter/` | プロバイダの優先設定を持つ集約型、公開されたモデルカタログ |
| `plugins/model-providers/gemini/` | `thinking_config` の変換（ネイティブ形式と OpenAI 互換の入れ子形式の両方） |
| `plugins/model-providers/kimi-coding/` | `OMIT_TEMPERATURE`、`extra_body.thinking`、トップレベルの `reasoning_effort` |
| `plugins/model-providers/qwen-oauth/` | メッセージの正規化、`cache_control` の差し込み、VL の高解像度対応 |
| `plugins/model-providers/nous/` | 帰属タグ、「無効なときは reasoning を送らない」処理 |
| `plugins/model-providers/custom/` | Ollama の `num_ctx` と `think: false` の癖 |
| `plugins/model-providers/bedrock/` | `api_mode="bedrock_converse"`、REST のエンドポイントが無いため `fetch_models` は None を返す |

## 利用者による上書き — リポジトリを編集せずに組み込みを差し替える {#user-overrides-replace-a-built-in-without-editing-the-repo}

たとえば試験用に `gmi` を自分の非公開ステージング環境へ向けたいとします。`~/.hermes/plugins/model-providers/gmi/__init__.py` を次のように作ります。

```python
from providers import register_provider
from providers.base import ProviderProfile

register_provider(ProviderProfile(
    name="gmi",
    aliases=("gmi-cloud", "gmicloud"),
    env_vars=("GMI_API_KEY",),
    base_url="https://gmi-staging.internal.example.com/v1",
    auth_type="api_key",
    default_aux_model="google/gemini-3.1-flash-lite-preview",
))
```

次のセッションから `get_provider_profile("gmi").base_url` はステージングの URL を返します。リポジトリへのパッチも再ビルドも要りません。利用者のプラグインは同梱のものより後で見つかるので、利用者側の `register_provider()` の呼び出しが勝ちます。

## api_mode の決まり方 {#apimode-selection}

認識される値は 4 つです。Hermes は次の順で決めます。

1. 利用者による明示的な上書き（`config.yaml` の `model.api_mode` が設定されているとき）
2. OpenCode のモデルごとの振り分け（Zen と Go 向けの `opencode_model_api_mode`）
3. URL からの自動判定 — 末尾が `/anthropic` なら `anthropic_messages`、`api.openai.com` なら `codex_responses`、`api.x.ai` なら `codex_responses`、Kimi のドメインで `/coding` なら `chat_completions`
4. URL からは何も判定できなかったときの受け皿としての **プロファイルの `api_mode`**
5. 既定の `chat_completions`

`profile.api_mode` には、そのプロバイダが標準で提供している方式を設定してください。あくまでヒントとして働き、利用者による URL の上書きのほうが依然として優先されます。

## 認証の種類 {#auth-types}

| `auth_type` | 意味 | 使っているもの |
|---|---|---|
| `api_key` | 環境変数 1 つに固定の API キーが入る | ほとんどのプロバイダ |
| `oauth_device_code` | デバイスコード方式の OAuth | — |
| `oauth_external` | 利用者が別の場所でサインインし、トークンが `auth.json` に入る | Anthropic OAuth、MiniMax OAuth、Qwen Portal、Nous Portal |
| `copilot` | GitHub Copilot のトークン更新の流れ | `copilot` プラグインのみ |
| `aws_sdk` | AWS SDK の認証情報の探索（IAM ロール、プロファイル、環境変数） | `bedrock` プラグインのみ |
| `external_process` | エージェントが起動する別プロセスが認証を担う | `copilot-acp` プラグインのみ |

`auth_type` は、どの処理経路がそのプロバイダを「単純な API キーのプロバイダ」として扱うかを決めます。`api_key` でない場合、PluginManager はマニフェストを記録はしますが、Hermes の CLI まわりの自動処理（doctor の確認、`--provider` フラグ、初期設定の案内への引き渡し）は素通りすることがあります。

## 探索のタイミング {#discovery-timing}

プロバイダの探索は **遅延実行** です。そのプロセスで最初に `get_provider_profile()` か `list_providers()` が呼ばれたときに走ります。実際には起動の早い段階で起こります（`auth.py` はモジュールの読み込み時点で `PROVIDER_REGISTRY` を先に拡張します）。プラグインが読み込まれたか確かめたいときは、次を実行してください。

```bash
hermes doctor
```

— `auth_type="api_key"` のプロファイルがうまく読み込まれていれば、Provider Connectivity の節に `/models` への疎通チェックとともに現れます。

プログラムから中身を調べるには次のようにします。

```python
from providers import list_providers
for p in list_providers():
    print(p.name, p.base_url, p.api_mode)
```

## プラグインを試す {#testing-your-plugin}

本物の設定を汚さないよう、`HERMES_HOME` を一時ディレクトリに向けてください。

```bash
export HERMES_HOME=/tmp/hermes-plugin-test
mkdir -p $HERMES_HOME/plugins/model-providers/my-provider
cat > $HERMES_HOME/plugins/model-providers/my-provider/__init__.py <<'EOF'
from providers import register_provider
from providers.base import ProviderProfile
register_provider(ProviderProfile(
    name="my-provider",
    env_vars=("MY_API_KEY",),
    base_url="https://api.my-provider.example.com/v1",
    auth_type="api_key",
))
EOF

export MY_API_KEY=your-test-key
hermes -z "hello" --provider my-provider -m some-model
```

## 汎用の PluginManager との関係 {#general-pluginmanager-integration}

汎用の `PluginManager`（`hermes plugins` が操作する対象）は、モデルプロバイダのプラグインを **認識はします** が、読み込みはしません — その面倒を見るのは `providers/__init__.py` です。マネージャはマニフェストを記録して中身を調べられるようにし、`kind: model-provider` として分類します。種別を書いていない利用者のプラグインを `$HERMES_HOME/plugins/` に置いて、それがたまたま `ProviderProfile` を伴う `register_provider` を呼んでいる場合、マネージャはソースコードの文面から推測して `kind: model-provider` に読み替えます — つまり `plugin.yaml` が無くても正しく振り分けられます。

## pip で配布する {#distribute-via-pip}

モデルプロバイダは pip のパッケージとして配れます。`pyproject.toml` で
`hermes_agent.plugins` グループのエントリポイントを公開してください。

```toml
[project.entry-points."hermes_agent.plugins"]
acme-inference = "acme_hermes_plugin:register"
```

指定先は次のどちらでもかまいません。

- **呼び出せるもの**（`module:func`）— 引数なしで呼ばれます。中で
  `register_provider(profile)` を呼んでください。
- **モジュールそのもの**（`module`）— モジュールを読み込んだときの
  `register_provider(...)` の副作用が目的です。ディレクトリ形式のプラグインの
  `__init__.py` と同じ考え方です。

これらのエントリポイントは `providers/__init__.py` が自分で探します — 汎用の
`PluginManager` は pip パッケージについてプロバイダの登録を呼び出しません
（マネージャのエントリポイント経路が対象にするのは `register(ctx)` 形式の汎用プラグインで、
`plugins.enabled` で制御されます）。そのためプロバイダのレジストリは独自に走査します。
ここには 2 つの決まりがあります。

- **明示的に有効にする必要があります。** この走査も `config.yaml` の
  `plugins.enabled` 許可リスト（と `plugins.disabled` 拒否リスト）に従います。
  pip のパッケージは、インストールされているというだけで読み込まれることはありません。
  利用者がエントリポイントの名前を `plugins.enabled` に加える必要があります。

  ```yaml
  plugins:
    enabled:
      - acme-inference
  ```

- **優先度はいちばん低いです。** エントリポイントのプラグインは、ファイルシステム上の
  プラグインより **先に** 見つかります。`register_provider()` は後から書いたほうが勝つので、
  同じ名前の同梱プロファイルや `$HERMES_HOME` のプロファイルが、必ず pip で入れたものを
  上書きします。pip のパッケージは本当に新しいプロバイダを足すことはできますが、
  一次提供のプロバイダ名を黙って乗っ取ることはできません。

引数が必要な指定先（汎用プラグインの `register(ctx)`）は、プロバイダの走査では
読み飛ばされます。そちらは `PluginManager` の担当です。壊れたエントリポイントは
切り離され、警告として記録して読み飛ばすだけなので、他のプロバイダの探索を
止めることはありません。

エントリポイントの設定全体については [Hermes プラグインを作る](/hermes/docs/developer-guide/plugins/#distribute-via-pip) を参照してください。

## 関連ページ {#related-pages}

- [プロバイダの実行時解決](/hermes/docs/developer-guide/provider-runtime/) — 解決の優先順位と、各層がプロファイルのどこを読むか
- [プロバイダを追加する](/hermes/docs/developer-guide/adding-providers/) — 新しい推論バックエンドを通しで追加するときの確認事項（手早いプラグイン経路と、CLI・認証まで含めた完全な統合の両方）
- [メモリプロバイダプラグイン](/hermes/docs/developer-guide/memory-provider-plugin/)
- [コンテキストエンジンプラグイン](/hermes/docs/developer-guide/context-engine-plugin/)
- [Hermes プラグインを作る](/hermes/docs/developer-guide/plugins/) — 汎用のプラグインの書き方
