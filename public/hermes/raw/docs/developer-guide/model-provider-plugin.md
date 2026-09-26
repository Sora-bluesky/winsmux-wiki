---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "モデルプロバイダーのプラグイン"
description: "Hermes Agent 向けにモデルプロバイダー（推論バックエンド）のプラグインを作る方法"
upstream_path: developer-guide/model-provider-plugin.md
upstream_blob: 850fc5ce117f83ef64a2e8002a4675a6e597e249
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/model-provider-plugin
---

# モデルプロバイダーのプラグインを作る {#building-a-model-provider-plugin}

モデルプロバイダーのプラグインは、推論バックエンドを宣言します。OpenAI 互換のエンドポイント、Anthropic Messages のサーバー、Codex 形式の Responses API、Bedrock ネイティブの窓口などで、Hermes は `AIAgent` の呼び出しをここへ振り分けます。組み込みのプロバイダー（OpenRouter、Anthropic、GMI、DeepSeek、Nvidia など）は、すべてこの形のプラグインとして同梱されています。第三者も、`$HERMES_HOME/plugins/model-providers/` の下にディレクトリを置くだけで、リポジトリに手を入れずに独自のものを追加できます。

:::tip
モデルプロバイダーのプラグインは、3 種類ある**プロバイダープラグイン**のうちの 1 つです。ほかの 2 つは[メモリプロバイダーのプラグイン](/hermes/docs/developer-guide/memory-provider-plugin/)（セッションをまたぐ知識）と[コンテキストエンジンのプラグイン](/hermes/docs/developer-guide/context-engine-plugin/)（コンテキストの圧縮方式）です。3 つとも「ディレクトリを置いてプロファイルを宣言する。リポジトリは触らない」という同じ形をとります。
:::

## 見つけられる仕組み {#how-discovery-works}

`providers/__init__.py._discover_providers()` は、どこかのコードが最初に `get_provider_profile()` か `list_providers()` を呼んだ時点で遅延実行されます。探す順番は次のとおりです。

1. **同梱のプラグイン** — `<repo>/plugins/model-providers/<name>/` — Hermes に最初から入っているもの
2. **利用者のプラグイン** — `$HERMES_HOME/plugins/model-providers/<name>/` — ディレクトリを置くだけで、動いているプロセスも次のプロバイダー検索のときに拾います（再起動は不要です）
3. **インストール済みのプラグイン** — `$HERMES_HOME/plugins/<name>/`（`hermes plugins install owner/repo` がクローンする場所）— `plugin.yaml` が `kind: model-provider` と宣言しているときだけ読み込まれます。それ以外の種類は、汎用の PluginManager の担当です
4. **従来の単一ファイル** — `<repo>/providers/<name>.py` — ツリー外の editable インストール向けの後方互換です

手順 2 と 3 は**プロファイルの HOME ごと**に効きます。複数のプロファイルを 1 プロセスで受け持つ場合（多重化ゲートウェイや、デスクトップアプリの `hermes serve`）、検索した時点で結び付いている `$HERMES_HOME` のプラグインが解決されるので、あるプロファイルに入れたプラグインは別のプロファイルからは見えません。使いたいプロファイルすべてにインストールしてください（`hermes -p <profile> plugins install ...`）。

**同じ名前なら、利用者のプラグインが同梱のものを上書きします。** `register_provider()` は後から書いたほうが勝つからです。`$HERMES_HOME/plugins/model-providers/gmi/` というディレクトリを置けば、リポジトリを触らずに組み込みの GMI のプロファイルを置き換えられます。

## ディレクトリ構成 {#directory-structure}

```
plugins/model-providers/my-provider/
├── __init__.py       # Calls register_provider(profile) at module-level
├── plugin.yaml       # kind: model-provider + metadata (optional but recommended)
└── README.md         # Setup instructions (optional)
```

必須なのは `__init__.py` だけです。`plugin.yaml` は `hermes plugins` が中身を調べるときと、汎用の PluginManager がプラグインを適切なローダーへ振り分けるときに使われます。無い場合、汎用のローダーはソースの文面から推測して判断します。

## 最小の例 — API キーだけの単純なプロバイダー {#minimal-example-a-simple-api-key-provider}

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

これで終わりです。この 2 つのファイルを置くだけで、ほかに何も編集せずに次が**自動でつながります**。

| つながる先 | 場所 | 得られるもの |
|---|---|---|
| 資格情報の解決 | `hermes_cli/auth.py` | プロファイルから `PROVIDER_REGISTRY["acme-inference"]` が埋まります |
| `--provider` の CLI フラグ | `hermes_cli/main.py` | `acme-inference` を受け付けます |
| `/model --provider` とモデル選択画面での切り替え | `hermes_cli/providers.py::resolve_provider_full` | `acme-inference` と別名のすべてがプロファイルに解決されます（切り替え先は `name` なので、`acme` は `acme-inference` として保存されます）。利用者の `providers:` / `custom_providers:` のブロックは引き続き優先されます。`base_url` が空のプロファイル（実行時にエンドポイントを作る場合）も、最後の段で解決されます |
| `hermes model` の選択画面 | `hermes_cli/models.py` | `CANONICAL_PROVIDERS` に現れ、モデル一覧は `{base_url}/models` から取得されます |
| `hermes doctor` | `hermes_cli/doctor.py` | `ACME_API_KEY` の確認と `{base_url}/models` への疎通チェック |
| `hermes setup` | `hermes_cli/config.py` | `ACME_API_KEY` が `OPTIONAL_ENV_VARS` と初期設定ウィザードに現れます |
| URL からの逆引き | `agent/model_metadata.py` | ホスト名 → プロバイダー名の自動判定 |
| 補助モデル | `agent/auxiliary_client.py` | 圧縮や要約に `default_aux_model` を使います |
| 実行時の解決 | `hermes_cli/runtime_provider.py` | 正しい `base_url`、`api_key`、`api_mode` を返します |
| トランスポート | `agent/transports/chat_completions.py` | プロファイル経路が `prepare_messages` / `build_extra_body` / `build_api_kwargs_extras` を通して kwargs を組み立てます |

## ProviderProfile のフィールド {#providerprofile-fields}

完全な定義は `providers/base.py` にあります。よく使うものは次のとおりです。

| フィールド | 型 | 用途 |
|---|---|---|
| `name` | str | 正式な ID です。`config.yaml` の `model.provider` と `--provider` フラグに対応します |
| `aliases` | `tuple[str, ...]` | `get_provider_profile()` が解決する別名です（たとえば `grok` → `xai`） |
| `api_mode` | str | `chat_completions` \| `codex_responses` \| `anthropic_messages` \| `bedrock_converse` |
| `display_name` | str | `hermes model` の選択画面に出る表示名です |
| `description` | str | 選択画面での補足文です |
| `signup_url` | str | 初回設定のときに出ます（「API キーはここで取得」） |
| `env_vars` | `tuple[str, ...]` | API キーの環境変数を優先順に並べたものです。末尾の `*_BASE_URL` の項目は、利用者によるベース URL の上書きとして扱われます |
| `base_url` | str | 既定の推論エンドポイントです |
| `models_url` | str | モデル一覧の URL を明示します（無ければ `{base_url}/models` に戻ります） |
| `auth_type` | str | `api_key` \| `oauth_device_code` \| `oauth_external` \| `copilot` \| `aws_sdk` \| `external_process` |
| `auth_handler` | `Callable \| None` | プロバイダー自身が持つ `hermes auth add/status/logout/refresh <name>` の処理です。[プロバイダー自身が持つ認証](#provider-owned-auth-auth_handler-refresh_credential)を参照してください |
| `refresh_credential` | `Callable \| None` | プール内の OAuth の行を、プロバイダー自身が更新する処理です。同じ節を参照してください |
| `classify_api_error` | `Callable \| None` | そのプロバイダーに限ったエラー分類の上書きです。[復帰とエラーの分類](#recovery-and-error-classification)を参照してください |
| `fallback_models` | `tuple[str, ...]` | 一覧の取得に失敗したときに出す、選りすぐりの候補です。`/model` の選択画面だけでなく、初回の `hermes setup` / `hermes model` の API キー入力の流れでも使われます（どちらも同じやり方で一覧を解決します。`fetch_models()` の結果に、選りすぐりを先頭にして `fallback_models` を混ぜます。取得が `None` を返すか例外を投げた場合は `fallback_models` だけになります） |
| `supports_vision` | bool | そのプロバイダーの API が、**ツールの結果**メッセージの中に画像を含められることを宣言します（プロバイダー全体としての通信上の能力です）。モデルごとの、利用者が送る画像の扱いは、このフラグではなく `model_capabilities` や models.dev から決まります |
| `model_capabilities` | `dict[str, dict[str, Any]]` | `model_overrides` のスキーマで書く、モデルごとの能力の宣言です。[モデルの能力を宣言する](#declaring-model-capabilities)を参照してください |
| `default_headers` | `dict[str, str]` | すべてのリクエストに付きます（たとえば Copilot の `Editor-Version`）。既定の `fetch_models()` による一覧取得のリクエストにも付きます |
| `fixed_temperature` | Any | `None` なら呼び出し側の値を使います。`OMIT_TEMPERATURE` という番兵を入れると temperature をまったく送りません（Kimi） |
| `default_max_tokens` | `int \| None` | プロバイダー単位の max_tokens の上限です（Nvidia は 16384） |
| `unsupported_response_formats` | `tuple` | API がはっきり拒否する `response_format` の種類です。補助的なリクエストは、確実に 400 を食らう代わりにこれらを省きます（DeepSeek は `("json_schema",)`） |
| `default_aux_model` | str | 補助的な作業（圧縮、画像認識、要約）に使う安いモデルです |

## モデルの能力を宣言する {#declaring-model-capabilities}

Hermes は、モデルごとの能力（`supports_reasoning`、`supports_vision`、
`supports_tools`、`context_window`）を models.dev の一覧から解決しますが、
そこにはツリー外のプロバイダーのモデルは載っていません。プロファイルに一度だけ
宣言してください。

```python
register_provider(ProviderProfile(
    name="acme",
    auth_type="api_key",
    env_vars=("ACME_API_KEY",),
    base_url="https://api.acme.example/v1",
    fallback_models=("acme-large-high", "acme-small"),
    model_capabilities={
        "acme-large-high": {
            "supports_reasoning": False,   # reasoning tier is fixed by the model id
            "supports_vision": True,
            "supports_tools": True,
            "context_window": 64000,
            "model_family": "acme",
        },
    },
))
```

キーはモデル ID そのものです。値は `config.yaml` の `model_overrides` と同じ
スキーマ（3 つの能力の真偽値、正の `context_window`、任意の `model_family`）を
使います。省いたフィールドは `False` ではなく「不明」のままになるので、一部だけ
書いた項目は、一覧のメタデータを消さずに上書きします。

1 回宣言すれば、`agent.models_dev` を通して一覧を読むすべての利用先に届きます。
`/model` の選択画面の `reasoning` バッジ、画像の振り分け（プロファイル全体の
`supports_vision` が未設定でも、`supports_vision: True` のモデルなら
`decide_image_input_mode` は `native` になります）、コンテキスト長の参照、
ダッシュボードの `/api/model/info` です。優先順位は、利用者が明示した
`model_overrides.<provider>.<model>` → プラグインの宣言 → 一覧 → 穴埋め用の
`_default` です。プラグインが宣言していないモデルは、これまでどおり一覧と推測の
経路をたどります。

対象外のものもあります。選択画面の `fast` バッジ（`hermes_cli/models.py::model_supports_fast_mode`
にあるモデル名からの推測）、推論の強度を表す語彙（`agent/reasoning_effort.py`）、
トランスポートのリクエストのフィールドです。宣言しても選択画面にモデルが増えるわけでは
ありません。そのためには `fallback_models` か `fetch_models` を使ってください。
この登録内容はプロセスごとに一度だけ読まれるので、書き換えたら Hermes を再起動してください。

## 上書きできるフック {#overridable-hooks}

一筋縄ではいかない癖に対応するには、`ProviderProfile` を継承してください。

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

    def fetch_account_usage(self, *, api_key=None, base_url=None):
        """Return AccountUsageSnapshot for /usage, or None when unavailable.

        The hook runs only when the provider has no built-in usage fetcher.
        It may raise: core catches failures and keeps /usage empty for that turn.
        """
        return None

    def create_client(self, **client_kwargs):
        """Supply your own client object instead of the shared openai.OpenAI.
        Default returns None (= use the standard client). Override when the
        wire protocol is not OpenAI-over-HTTP — e.g. an ACP subprocess shim.
        client_kwargs is what the core would have passed to openai.OpenAI
        (api_key, base_url, command, args, timeouts, headers…); accept **kwargs
        and pick what you need. A raise is logged and falls back to the
        standard client."""
        return None
```

## アカウントの利用状況 {#account-usage}

モデルプロバイダーのプラグインは、`ProviderProfile.fetch_account_usage` を
上書きすることで、アカウントやプランの利用状況を `/usage` に出せます。共通の
`agent.account_usage.AccountUsageSnapshot` を読み込んで返してください（必要なら
`AccountUsageWindow` の項目も添えます）。表示の整形をプラグイン側でやってはいけません。
`None` を返すか例外を投げた場合は、利用状況を持たないプロバイダーと同じように
`/usage` は空のままになります。組み込みの取得処理が常に優先されるので、このフックで
組み込みプロバイダーの利用状況の挙動を置き換えることはできません。このフックは
どの画面でも共通の 10 秒の期限（`agent.account_usage.PLUGIN_USAGE_HOOK_DEADLINE_S`）の
もとで走ります。超過した場合は `/usage` を止めるのではなく、そのターンは何も
表示しません。自分の HTTP 呼び出しには、それより短いタイムアウトを設定してください。

同梱の `plugins/model-providers/opencode-zen/` のプロファイルは、OpenCode Go の
プランの期間表示のためにこのフックを実装しています。`/usage` を出すすべての場所
（CLI の `hermes usage` と `/usage`、メッセージングのゲートウェイ、TUI とデスクトップの
利用状況表示）が、同じ中核の整形処理を通してこの結果を描画します。

```python
from datetime import datetime, timezone

from agent.account_usage import AccountUsageSnapshot, AccountUsageWindow

def fetch_account_usage(self, *, api_key=None, base_url=None):
    return AccountUsageSnapshot(
        provider=self.name,
        source="my_provider_api",
        fetched_at=datetime.now(timezone.utc),
        windows=(AccountUsageWindow(label="Monthly", used_percent=25),),
    )
```

## 外部プロセス（ACP）のプロバイダー {#external-process-acp-providers}

標準入出力でやり取りするエージェント CLI は、HTTP のエンドポイントではありません。`auth_type="external_process"` を設定し、バイナリの起動方法を書き、`create_client` でクライアントを渡してください。中核部分に手を入れる必要はありません。`hermes -m <name>`、`/model`、資格情報の解決、実行時の解決、補助クライアント（圧縮や画像認識）はどれも、プロバイダー名ではなく `auth_type` を見て動くからです。ツリー内の例は `plugins/model-providers/copilot-acp/` です。

| フィールド | 用途 |
|---|---|
| `process_command` | 既定のバイナリです。たとえば `"copilot"` |
| `process_args` | 既定の引数の並びです。たとえば `("--acp", "--stdio")` |
| `process_command_env_vars` | バイナリを上書きする環境変数です。並べた順に確認されます |
| `process_args_env_var` | 引数を上書きする環境変数です（shlex で分割されます） |

`create_client` が返すクライアントは、`client_kwargs` で `command` と `args` を受け取ります。そのクライアントがすでに完成していて非同期でも安全なら、クラス属性として `HERMES_SKIP_TRANSPORT_WRAP = True` / `HERMES_SKIP_ASYNC_WRAP = True` を宣言してください。補助クライアントが HTTP の通信アダプターを通して呼び直さなくなります。

### API キーを使わないプラグインを選択画面に出す {#picker-rows-for-non-api-key-plugins}

登録されたプロファイルはどれもスラッグで `CANONICAL_PROVIDERS` に加わるので（`bedrock` のように組み込みと同じスラッグを宣言し直したプラグインは重複が取り除かれ、二重には出ません）、外部プロセス型や OAuth 型のプラグインも、`copilot-acp` と並んで `hermes model`、`/model`、デスクトップのモデル選択に現れます。出るかどうかを決めるのは `auth_type` ではなく資格情報です。

| `auth_type` | 行が出る／`authenticated` になる条件 | モデル一覧 |
|---|---|---|
| `external_process` | バイナリが見つかるとき（`process_command` か `process_command_env_vars` のどれかが `PATH` にある）、または `base_url` が `acp+tcp://…` のとき。`hermes auth status` が報告するのと同じ構造的な条件です。バイナリが見つかることは、デスクトップのモデル選択が明示的な項目だけを絞り込むときに使うサインイン済みの証拠（`auth_verified`）でもあるので、同梱の ACP プロバイダーと同じようにそこにも出ます | `fetch_models()`（自前のサブプロセスでの問い合わせ）。無ければ `fallback_models` |
| `oauth_external` / `oauth_device_code` | 資格情報のプールに、そのスラッグの行があり、トークンが有効（期限切れでない）なとき。`hermes auth status <name>` と `list_available_providers().authenticated` はどちらもプールを読みます。`refresh_token` と `refresh_credential` のフックを持つ期限切れの行は `needs_refresh` と報告されます | プール内のトークンを使った `fetch_models()`。無ければ `fallback_models`（最低 1 つは宣言してください） |

一覧のキャッシュは、プロファイルの `process_command_env_vars` / `process_args_env_var` の値をキーにしています。そのため `HERMES_<X>_COMMAND` を別のバイナリに向ければ、モデルを探し直します。実行ファイルが見つかることはログイン済みの確認ではありません。認証していない CLI でも一覧には出て、サブプロセスは最初に使われたときに失敗を報告します。

`hermes model`（および初期設定ウィザード）でその行を選ぶと、プロファイルの `auth_type` に応じた 1 本の共通の流れが走ります。外部プロセス型のプロファイルは起動できるかを確認し（`resolve_external_process_provider_credentials`）、OAuth 型のプロファイルはプールに有効な行が要ります（無ければ `hermes auth add <name>` と表示して止まります）。そのあと統合された一覧が提示され、プロファイルの `base_url` と `api_mode` とともに `config.model` が保存されます。中核部分に `_model_flow_*` の項目を足す必要はありません。

#### 外部プロセス向けの任意のフック {#optional-external-process-hooks}

外部プロセス型のプロファイルは、`{available, logged_in, plan, detail, login_command}` を返す `setup_status(**kwargs)` と、`[{id, label, note}]` を返す `discover_models(**kwargs)` を実装できます。共通の流れは `logged_in` を見て判断し（TTY ならその場で `login_command` を実行し、そうでなければ `detail` を表示します）、`discover_models()` が行を返した場合は `fallback_models` と混ぜて提示します。`note` は行ごとの薄い注記（`· usage credits`）として描画され、モデルを隠すことはありません。`fetch_models()` も同じ ID を返すようにして、`/model` とデスクトップの選択画面が初期設定と食い違わないようにしてください。どちらのフックも軽くしてください。そして推論を行ってはいけません。`fallback_models` に任せたい場合は `None` を返します。

HTTP 以外のリクエストを途中で止められるようにするには、クラスに `cancel(self)` メソッドを宣言してください。Hermes は、リクエスト用のクライアントを使用不能と印付けたあと、中断する側のスレッドからこれを呼びます。このメソッドはすぐに戻り、自分の通信を安全に止める必要があります。プロセスの起動と中断が競合する場合も同様です。リクエスト側のスレッドが持つファイルディスクリプタを閉じてはいけません。後片付けのための `close()` は、これまでどおりリクエストの持ち主が呼びます。このメソッドを持たないクライアントは、従来のソケットを落とす中断経路のままです。

models.dev が知らない一覧のために、`model_aliases`（`{"sonnet": "claude-sonnet-5[1m]"}`）を宣言できます。そうすると、素の `/model <alias>` と `/model <id-prefix>` はまずプロセス型のプロバイダーの中で解決され、`validate_requested_model` は `process://` を叩かずに宣言済みの ID を受け付けます。

外部プロセスへの明示的な委譲では、子のコマンドを解決するときも選んだプロバイダーとその通信方式が保たれます。実行ファイルを上書きしただけでは、外部プロセス型のプロバイダーが ACP に変わることはありません。

ネイティブのクライアントは、`<provider>.native_assistant` という名前空間付きの型を使って、非公開のアシスタントの再生情報を `reasoning_details` に残せます。まったく同じ文字列を `ProviderProfile.native_reasoning_details_type`（既定は `None`）に宣言してください。Chat Completions のリクエストのサニタイズ処理は、その運び手を宣言したプロファイルにだけ渡します。フォールバックやモデルの切り替えのあとでも同じです。ほかの非公開の運び手は、たとえ元のプラグインがもう入っていなくても取り除かれます。OpenRouter の `reasoning.encrypted` のような標準的な推論情報はそのままです。取り除くのはリクエストのときだけで、保存された履歴はそのまま残るので、元のプロバイダーに戻ることもできます。

プロバイダーは `get_model_context_length(model)` を上書きして、根拠のある正のトークン数の上限を返すか、従来の参照の連鎖に任せるために `None` を返せます。明示的な設定と、エンドポイント単位の上書きが優先されます。プロバイダーが返す上限は、汎用のキャッシュや HTTP での問い合わせよりも先に参照されます。一覧上の最大値を、そのアカウントで実際に使える上限と取り違えないでください。

料金の出し方が標準的でない場合、`get_usage_cost(model, usage)` が `agent.usage_pricing.CostResult` を返せます。通常の料金計算でよければ `None` を返します。`usage` は `CanonicalUsage` で、その `raw_usage` には可能なかぎり応答のメタデータが残ります。ネイティブの定価による合計は `estimated` に分類してください。`actual` や `included` にしてはいけません。請求の情報が無いことは、請求が発生していない証拠にはなりません。既定のフックは `None` を返すので、既存のプロバイダーの挙動は変わりません。

## フックの実装例 {#hook-reference-examples}

書き方の見本として、同梱の次のプラグインを見てください。

| プラグイン | 見どころ |
|---|---|
| `plugins/model-providers/openrouter/` | プロバイダーの優先設定を持つ集約型。モデル一覧が公開されています |
| `plugins/model-providers/gemini/` | `thinking_config` の変換（ネイティブ形式と OpenAI 互換の入れ子形式の両方） |
| `plugins/model-providers/kimi-coding/` | `OMIT_TEMPERATURE`、`extra_body.thinking`、トップレベルの `reasoning_effort` |
| `plugins/model-providers/qwen-oauth/` | メッセージの正規化、`cache_control` の差し込み、VL の高解像度対応 |
| `plugins/model-providers/nous/` | 出所を示すタグ、「無効なときは推論を送らない」 |
| `plugins/model-providers/custom/` | Ollama の `num_ctx` と `think: false` の癖 |
| `plugins/model-providers/bedrock/` | `api_mode="bedrock_converse"`、`fetch_models` が None を返す（REST のエンドポイントが無いため） |

## 利用者による上書き — リポジトリを編集せずに組み込みを置き換える {#user-overrides-replace-a-built-in-without-editing-the-repo}

試験のために `gmi` を自分の非公開のステージング環境に向けたいとします。`~/.hermes/plugins/model-providers/gmi/__init__.py` を作ってください。

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

新しく立ち上げた Hermes のプロセスでは、`get_provider_profile("gmi").base_url` がステージングの URL を返します。リポジトリへのパッチも、ビルドし直す作業も要りません。利用者のプラグインは同梱のものより後に読まれるので、利用者側の `register_provider()` の呼び出しが勝ちます。

この上書きは実行時にも効きます。組み込みのプロバイダーは `hermes_cli.auth.PROVIDER_REGISTRY` に行を持っていて（`resolve_runtime_provider()` はこの表からエンドポイントと環境変数を読みます）、`$HERMES_HOME` のプラグインが同じ名前で登録し直すと、その行のプロファイル由来のフィールドが書き換わります。そのため推論は同梱の URL ではなくステージングの URL へ向かいます。

| プロファイルのフィールド | 登録表の行のフィールド | 条件 |
|---|---|---|
| `base_url` | `inference_base_url` | プロファイルが空でない `base_url` を設定している |
| `env_vars`（URL 以外の項目） | `api_key_env_vars` | API キーの行で、かつプロファイルが `env_vars` を設定している |
| `env_vars`（末尾の `*_BASE_URL` / `*_URL` の項目） | `base_url_env_var` | プロファイルがそれを宣言している。宣言していなければ組み込みの環境変数（たとえば `GMI_BASE_URL`）のまま |

これが起きるのは**利用者の**プラグイン（`$HERMES_HOME/plugins/model-providers/` か、インストールされた `kind: model-provider` のプラグイン）のときだけです。同梱のプロファイルが組み込みの行を書き換えることはありませんし、`copilot`、`kimi-coding`、`kimi-coding-cn`、`zai` は独自の資格情報の解決を保ちます。プロファイルが空のままにしたフィールドは、組み込みの値が残ります。`*_BASE_URL` の環境変数は、それでもどちらより優先されます。

## api_mode の選び方 {#apimode-selection}

組み込みの値は 4 つ認識されます（`chat_completions`、`codex_responses`、`anthropic_messages`、`bedrock_converse`）。これに加えて、プラグインが自分で登録したモードも使えます。Hermes は次の順で決めます。

1. 利用者による明示的な上書き（`config.yaml` の `model.api_mode` が設定されている場合）
2. OpenCode のモデルごとの振り分け（Zen と Go 向けの `opencode_model_api_mode`）
3. URL からの自動判定 — 末尾が `/anthropic` なら `anthropic_messages`、`api.openai.com` なら `codex_responses`、`api.x.ai` なら `codex_responses`、Kimi のドメインで `/coding` なら `chat_completions`
4. URL からの判定で何も分からなかったときの拠り所としての、**プロファイルの `api_mode`**
5. 既定の `chat_completions`

`profile.api_mode` には、そのプロバイダーの既定に合う値を設定してください。これは手がかりとして働きます。利用者による URL の上書きは、それでも優先されます。

### 独自の通信方式を用意する {#shipping-your-own-wire-dialect}

組み込みのどのトランスポートも扱えない方式を話すプラグインは、それを登録してプロファイルで名前を指定します。

```python
from agent.transports import register_transport
from agent.transports.chat_completions import ChatCompletionsTransport

class MyDialectTransport(ChatCompletionsTransport):
    api_mode = "mydialect"
    # override convert_messages / build_kwargs / normalize_response as needed

register_transport("mydialect", MyDialectTransport)
register_provider(ProviderProfile(name="myprovider", api_mode="mydialect", ...))
```

`api_mode` を見るすべての箇所（`determine_api_mode`、実行時の解決、エージェントの生成、委譲）は、トランスポートの登録簿がそのモードを知っている場合にかぎり受け付けます。誰も登録していないモードを指定したプロファイルは、`chat_completions` に落ちます。

## 認証の種類 {#auth-types}

| `auth_type` | 意味 | 使っているところ |
|---|---|---|
| `api_key` | 1 つの環境変数が固定の API キーを持ちます | ほとんどのプロバイダー |
| `oauth_device_code` | デバイスコードによる OAuth の流れです | Nous Portal。ツリー外のプラグインは `auth_handler` 経由 |
| `oauth_external` | 利用者は別の場所でサインインし、トークンが `auth.json` に入ります | Anthropic OAuth、MiniMax OAuth、Qwen Portal、Nous Portal |
| `copilot` | GitHub Copilot のトークン更新の流れです | `copilot` プラグインのみ |
| `aws_sdk` | AWS SDK の資格情報の連鎖（IAM ロール、プロファイル、環境変数） | `bedrock` プラグインのみ |
| `external_process` | エージェントが起動するサブプロセスが認証を担います（[外部プロセスのプロバイダー](#external-process-acp-providers)を参照） | `copilot-acp` プラグイン、ツリー外の ACP プラグイン |

どのプロファイルも、宣言した `auth_type` のもとで Hermes の認証の登録簿に写されます（例外は 2 つ。`env_vars` が空の `api_key` のプロファイルと、集約型・利用者指定のスラッグである `openrouter`/`custom`、それに独自の更新処理を持つ組み込みの `copilot`/`kimi-coding`/`zai` です）。そのため `hermes auth`、
`--provider <name>`、実行時の解決は、形がどうであれそれを受け付けます。違うのは、ログインを
誰が行うかです。`api_key` のプロファイルには組み込みのキー入力と環境変数の解決が付きます。それ以外の
`auth_type` は**プロバイダー自身が持つ**形で、プラグインが次の 2 つのフックを用意します。API キー以外の
プロファイルに `auth_handler` が無い場合、`hermes auth add <name>` は黙って何もするのではなく、
「auth_handler が無い」とはっきり分かるエラーで失敗します。

## プロバイダー自身が持つ認証（`auth_handler`、`refresh_credential`） {#provider-owned-auth-authhandler-refreshcredential}

`auth_type` は、そのプロバイダーが*どんな種類の*資格情報を必要とするかを表します。`auth_handler` は、
プラグインがそれをどうやって**手に入れる**かです。既存の `hermes auth` コマンド群の中で、独自の
デバイスコード・OIDC・IdC の流れを走らせます（モデルプロバイダーのマニフェストは汎用のコマンド
プラグインのローダーからは飛ばされるので、`register(ctx)` はコマンドを足す方法にはなりません）。
`refresh_credential` は、プラグインが保存したプール内のトークンを、資格情報のプールがどう**回す**かです。

```python

from providers import register_provider
from providers.base import ProviderProfile

def example_auth(action: str, args) -> bool:
    """action: "add" | "status" | "logout" | "refresh"; args: parsed CLI namespace."""
    if action == "add":
        from agent.credential_pool import AUTH_TYPE_OAUTH, PooledCredential, load_pool
        tokens = run_device_code_flow()                      # provider-specific
        load_pool("example-oauth").add_entry(PooledCredential(
            provider="example-oauth", id=uuid.uuid4().hex[:6], label=tokens["account"],
            auth_type=AUTH_TYPE_OAUTH, priority=0, source="manual:example_device",
            access_token=tokens["access_token"], refresh_token=tokens["refresh_token"],
            extra={"tenant": tokens["tenant"]}))             # any extra keys round-trip through auth.json
        print("Signed in to Example.")
        return True
    if action == "status":
        print("example-oauth: " + ("logged in" if load_pool("example-oauth").entries() else "logged out"))
        return True
    return False   # decline → this action stays with the built-in credential-pool handling

def example_refresh(entry):
    """Called by the credential pool with the pooled row; return the rotated values, None, or raise."""
    tokens = post_refresh(entry.refresh_token)          # the raw token-endpoint response is fine as-is
    return {"access_token": tokens["access_token"], "refresh_token": tokens["refresh_token"],
            "expires_at_ms": tokens["expires_at_ms"], "expires_in": tokens["expires_in"]}

register_provider(ProviderProfile(
    name="example-oauth", auth_type="oauth_external", base_url="https://api.example.com/v1",
    auth_handler=example_auth, refresh_credential=example_refresh))
```

| 取り決め | |
|---|---|
| `auth_handler(action, args)` | CLI からの操作では、`args` は `hermes auth` を解析した名前空間です。対話的な初期設定の選択画面からは `provider` だけを持つ最小限の名前空間が渡されるので、オプションは `getattr(args, name, None)` で読んでください。真を返すと「処理した」の意味になります（Hermes はそれ以上何も表示せず、終了コード 0 です）。偽を返すと、**その操作については**組み込みの経路に戻ります。例外は `SystemExit("<provider> auth handler failed for `&lt;action&gt;`: …")` になります。 |
| `refresh_credential(entry)` | `PooledCredential` を受け取り、更新後の値の対応表か `None` を返します。`PooledCredential` のフィールド名にあたるキー（`access_token`、`refresh_token`、`expires_at_ms` など）は、その行のフィールドを置き換えます。それ以外のキー（`expires_in`、`token_type`、`scope` といった、トークンのエンドポイントが返す生の形）は `entry.extra` に入り、`auth.json` を経由して往復します。`None` や空の対応表を返すのは、プラグインが更新できなかったという意味です。その行は、更新のリクエストが失敗したときとまったく同じように休ませます（更新済みとは報告されないので、死んだトークンが使い回されることはありません）。このフックがあること自体が、そのプロバイダーを*更新できる*ものにします。`hermes auth refresh <name>` とメインループの 401 からの復帰は、中核に名前の一覧を持たずにプール経由でこれを呼びます。補助クライアントの 401 からの復帰がここに届くのは、もともと復帰対象として扱っているプール内の行（API キーの行と組み込みの OAuth の経路）に限られます。 |
| 更新の失敗 | 許可そのものが死んでいるときは `hermes_cli.auth_constants.AuthError(..., relogin_required=True)` を投げてください（`code` に `invalid_grant` / `invalid_token` / `refresh_token_reused` を付けても構いません）。その行は **DEAD** になって回転から外れ、Hermes は `hermes auth add <name>` を案内する WARNING をログに出します。それ以外の例外（ネットワーク、429、5xx）は一時的なものとして扱われ、その行は 1 回分の冷却期間だけ休んでから再試行されます。 |
| 同時実行 | このフックは `auth.json` の共通ロックのもとで走ります。呼ぶ前にプールはその行を読み直し、別の Hermes のプロセス（ゲートウェイと CLI、2 つのプロファイル）がすでに組を更新していれば、そちらを採用してフックは**呼びません**。1 回しか使えない更新用トークンでも安全です。フックが戻ると、更新された行は `auth.json` へ書き出されます。 |
| フックが無い場合 | `api_key` のプロファイルはこれまでどおりです。それ以外の `auth_type` で `auth_handler` が無い場合、`hermes auth add` ではっきり失敗します。 |

`hermes auth add|status|logout|refresh <provider>` は、組み込みの資格情報プールの流れより**先に**
ハンドラーを参照します。同じ名前を 2 回登録した場合は後から書いたほうが勝つので、利用者のプラグインが
同梱のプロバイダーの流れを差し替えられます。

Hermes が渡すのは解析済みの名前空間であって、プロバイダーが宣言したフラグではありません。プロバイダー
固有の値は対話的に尋ねるか、自分の設定や環境変数から読んでください。プラグインがプールに保存した行は
そのプラグインのものです。追加したキーは `load → save → load` を通っても残りますし、Hermes が
`refresh_credential` に渡す秘密情報は、そのプール内の行にあるものだけです。

### プラグイン向けの宣言的な OAuth（PKCE） {#declarative-oauth-pkce-for-plugins}

IdP が標準の OAuth 2.0 認可コード + PKCE を話すプロバイダーなら、上のフックを手で書く必要は
ありません。エンドポイントを `OAuthPKCEConfig` に宣言して、2 つのファクトリーに組み立てさせてください。

```python
from hermes_cli.auth_oauth_pkce_plugin import OAuthPKCEConfig, pkce_auth_handler, pkce_refresh_credential
from providers import register_provider
from providers.base import ProviderProfile

cfg = OAuthPKCEConfig(
    client_id="hermes-public-client",                       # public client — no secret, PKCE is the proof
    authorize_url="https://auth.example.com/oauth/authorize",
    token_url="https://auth.example.com/oauth/token",
    scopes=("inference", "offline_access"),
    redirect_port=0,                                        # 0 = OS-assigned; pin it if the IdP allowlists the URI
)

register_provider(ProviderProfile(
    name="example-pkce", auth_type="oauth_external", base_url="https://api.example.com/v1",
    auth_handler=pkce_auth_handler(cfg), refresh_credential=pkce_refresh_credential(cfg)))
```

あとは Hermes がすべての段取りを引き受けます。`hermes auth add example-pkce [--no-browser]` は
ブラウザーを開き（あるいは URL を表示し、遠隔のマシンでは SSH トンネルの案内も出します）、
`http://127.0.0.1:<port>/callback` で待ち受け、CSRF 対策の `state` を確認し、S256 の PKCE で
コードを交換して、その許可をプール内の `oauth` の資格情報として保存します（`source: manual:loopback_pkce`、
`expires_at_ms`、`refresh_token`）。`auth status` はログイン済みか期限切れかを報告し、`auth logout` は
その行を消します。`auth refresh` と 401 からの復帰の経路は `refresh_token` の許可で更新しますが、
その前に認証のロックのもとで `auth.json` を読み直すので、ほかのプロセスによる更新があればそれを採用し、
1 回しか使えない更新用トークンを二重に使うことはありません。

セキュリティ上の線引き（リクエストの前に、ログインでも更新でも同じように強制されます）。どちらの
エンドポイントも `https://` でなければなりません（素の `http://` は、ループバックのアドレスを直接
書いたホスト、つまりローカルの開発用 IdP のときだけ通ります）。`token_url` のホストは `authorize_url` と
同じホストか、そのサブドメインである必要があります（または `allowed_hosts` に列挙してください）。
待ち受けは `127.0.0.1` そのものに結び付きます。トークン、`state`、PKCE の検証子は決してログに出ません。
任意のフィールドは `audience`、`extra_authorize_params`、`extra_token_params`、`redirect_path`、
`timeout_seconds`、`label` です。

## 復帰とエラーの分類 {#recovery-and-error-classification}

`kind: model-provider` のプラグインは、汎用のプラグインマネージャーでは**なく**プロバイダーの探索処理から
読み込まれます。そのため、2 つめのプラグイン部品を同梱しないかぎり、`transform_api_error_classification` の
プラグインフックには手が届きません。代わりに、プロファイル側が同じ役割の差し込み口を持っています。

```python
def classify(error, *, status_code, error_code, message, body, model):
    # A vendor-specific 403 that is a spent plan, not a bad credential.
    if status_code == 403 and error_code == "quota_exhausted":
        return {"reason": "billing", "retryable": False, "should_rotate_credential": True, "should_fallback": True}
    return None  # decline → built-in classification

register_provider(ProviderProfile(name="example-oauth", auth_type="oauth_external",
                                  base_url="https://api.example.com/v1",
                                  refresh_credential=example_refresh, classify_api_error=classify))
```

| 取り決め | |
|---|---|
| `classify_api_error(error, *, status_code, error_code, message, body, model)` | `agent.error_classifier.classify_api_error` が、**このプロバイダーだけ**の失敗について、汎用の `transform_api_error_classification` フックのあと、組み込みの処理の前に参照します。`message` は小文字化したエラー本文、`body` は解析済みの JSON 本文です（空のこともあります）。上書きするには `{"reason": <FailoverReason name>}` を返し、必要に応じて `retryable` / `should_compress` / `should_rotate_credential` / `should_fallback` / `error_context` を添えてください（課金、認証、model_not_found といった終端の理由では、明示しないかぎり `should_fallback: True` は `retryable: False` を意味します。フォールバックの連鎖は再試行しない判定のときにしか走らないからです。レート制限の理由は、組み込みの「再試行してからフォールバック」の形のままです）。`None`（または知らない理由）を返すと、組み込みの判定がそのまま使われます。例外は握りつぶされ、DEBUG でログに出ます。この判定は組み込みのときと同じ復帰処理を動かします。たとえば `billing` なら、一時的な 403 の冷却期間ではなく課金用の期間だけ、その資格情報を休ませます。 |
| プラグインの資格情報での 401 | 中核に手を入れずに、資格情報のプールが扱います。失敗した行は試行ごとに 1 回 `refresh_credential` を通して更新され（1 セッションあたり 1 行につき最大 2 回）、更新後のトークンでクライアントを作り直してリクエストを再試行します。`None` や空を返したり例外を投げたりすると、その行は休ませます。そのあとリクエストは別の行に回るか、汎用の「サインインし直してください: `hermes auth add <name>`」という案内に落ちます。組み込みプロバイダー向けの案内に落ちることはありません。 |
| 補助的な呼び出し | 補助クライアントの 401 も、同じプールの更新（`try_refresh_current` → `refresh_credential`）を通ります。 |

中核に名前で書かれたままの復帰処理は、汎用の形に落とせない挙動です（プロバイダー固有のトークン保管庫の
同期し直し、プランの等級による制限の壁、1 回しか使えない更新用トークンの隔離など）。そうしたものが
必要なプラグインは、`refresh_credential` や `classify_api_error` の中で自分で面倒を見ます。

## 探索されるタイミング {#discovery-timing}

プロバイダーの探索は**遅延**で走ります。そのプロセスで最初に `get_provider_profile()` か `list_providers()` が呼ばれたときです。実際には起動の早い段階で起きます（`auth.py` の読み込み時に `PROVIDER_REGISTRY` が先回りして拡張されるためです）。プラグインが読み込まれたかを確かめたい場合は、次を実行してください。

```bash
hermes doctor
```

— うまくいった `auth_type="api_key"` のプロファイルは、Provider Connectivity の節に `/models` への疎通チェックとともに現れます。

プログラムから調べるには次のようにします。

```python
from providers import list_providers
for p in list_providers():
    print(p.name, p.base_url, p.api_mode)
```

## プラグインを試す {#testing-your-plugin}

本番の設定を汚さないように、`HERMES_HOME` を一時ディレクトリに向けてください。

```bash
export HERMES_HOME=$HOME/.hermes/cache/scratch/hermes-plugin-test
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

汎用の `PluginManager`（`hermes plugins` が操作する対象）は、モデルプロバイダーのプラグインを**見え**はしますが、読み込みはしません。その一生を管理しているのは `providers/__init__.py` です。マネージャーは中身を調べるためにマニフェストを記録し、`kind: model-provider` として分類します。種類を書いていない利用者のプラグインを `$HERMES_HOME/plugins/` に置いた場合でも、それが `ProviderProfile` を渡して `register_provider` を呼んでいれば、マネージャーはソースの文面から推測して `kind: model-provider` に自動で寄せます。つまり `plugin.yaml` が無くても、プラグインは正しく振り分けられます。

## pip で配布する {#distribute-via-pip}

モデルプロバイダーは pip のパッケージとして配布できます。`pyproject.toml` の
`hermes_agent.plugins` グループにエントリーポイントを公開してください。

```toml
[project.entry-points."hermes_agent.plugins"]
acme-inference = "acme_hermes_plugin:register"
```

指す先は、次のどちらでも構いません。

- **呼び出せるもの**（`module:func`）— 引数なしで呼ばれます。中で
  `register_provider(profile)` を呼んでください。
- **モジュールそのもの**（`module`）— モジュールの読み込み時に起きる
  `register_provider(...)` の副作用のために読み込まれます。ディレクトリ型の
  プラグインの `__init__.py` と同じ取り決めです。

これらのエントリーポイントを見つけるのは `providers/__init__.py` 自身です。汎用の
`PluginManager` は、pip パッケージに対してプロバイダーの登録を呼び出しません
（そちらのエントリーポイントの経路は `register(ctx)` 形式の汎用プラグインを対象にしていて、
`plugins.enabled` で制御されます）。そのためプロバイダーの登録簿は自分で走査します。
ここには 2 つの決まりがあります。

- **明示的に有効にする必要があります。** この走査も、`config.yaml` の同じ
  `plugins.enabled`（許可一覧）と `plugins.disabled`（拒否一覧）に従います。pip の
  パッケージは、入っているというだけで読み込まれることは決してありません。利用者が
  エントリーポイントの名前を `plugins.enabled` に足す必要があります。

  ```yaml
  plugins:
    enabled:
      - acme-inference
  ```

- **優先順位はいちばん低いです。** エントリーポイント型のプラグインは、ファイル
  システム上のプラグインより**先に**見つかります。`register_provider()` は後から
  書いたほうが勝つので、同じ名前の同梱プロファイルや `$HERMES_HOME` のプロファイルが
  必ず pip 版を上書きします。pip のパッケージはまったく新しいプロバイダーを足せますが、
  公式のプロバイダー名を黙って乗っ取ることはできません。

引数を必要とする先（汎用プラグインの `register(ctx)`）は、プロバイダーの走査では
飛ばされます。そちらは `PluginManager` の担当です。壊れたエントリーポイントは
切り離され、警告としてログに出して飛ばされるだけで、ほかのプロバイダーの探索を
止めることはありません。

エントリーポイントの設定の全体は[Hermes のプラグインを作る](/hermes/docs/developer-guide/plugins/#distribute-via-pip)を参照してください。

## 関連ページ {#related-pages}

- [プロバイダーの実行時解決](/hermes/docs/developer-guide/provider-runtime/) — 解決の優先順位と、どの層がプロファイルのどこを読むか
- [プロバイダーを追加する](/hermes/docs/developer-guide/adding-providers/) — 新しい推論バックエンドを足すときの一連の確認事項（手早いプラグイン経路と、CLI と認証まで含めた完全な組み込みの両方を扱います）
- [メモリプロバイダーのプラグイン](/hermes/docs/developer-guide/memory-provider-plugin/)
- [コンテキストエンジンのプラグイン](/hermes/docs/developer-guide/context-engine-plugin/)
- [Hermes のプラグインを作る](/hermes/docs/developer-guide/plugins/) — プラグイン作りの全般
