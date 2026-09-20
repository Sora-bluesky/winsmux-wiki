---
title: "モデルプロバイダープラグイン"
description: "Hermes Agent 向けにモデルプロバイダー（推論バックエンド）プラグインを作る方法"
upstream_path: developer-guide/model-provider-plugin.md
upstream_blob: 777e5285ab9b3823406f8829c3eb3ed52ef1abcf
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/model-provider-plugin
---

# モデルプロバイダープラグインを作る {#building-a-model-provider-plugin}

モデルプロバイダープラグインは、推論バックエンドを宣言するものです。OpenAI 互換のエンドポイント、Anthropic Messages のサーバー、Codex 形式の Responses API、Bedrock ネイティブの窓口などがそれにあたり、Hermes はここへ `AIAgent` の呼び出しを流します。組み込みのプロバイダー（OpenRouter、Anthropic、GMI、DeepSeek、Nvidia、…）はすべて、このプラグインの形で同梱されています。第三者も `$HERMES_HOME/plugins/model-providers/` の下にディレクトリを置くだけで追加でき、リポジトリには一切手を入れません。

:::tip
モデルプロバイダープラグインは、**プロバイダープラグイン** の 3 種類目です。残りの 2 つは [メモリープロバイダープラグイン](/hermes/docs/developer-guide/memory-provider-plugin/)（セッションをまたぐ知識）と [コンテキストエンジンプラグイン](/hermes/docs/developer-guide/context-engine-plugin/)（コンテキスト圧縮のやり方）です。3 つとも「ディレクトリを置き、プロファイルを宣言し、リポジトリは触らない」という同じ形をしています。
:::

## 見つけ方のしくみ {#how-discovery-works}

`providers/__init__.py._discover_providers()` は、どこかのコードが `get_provider_profile()` または `list_providers()` を最初に呼んだ時点で遅延実行されます。探す順番は次のとおりです。

1. **同梱プラグイン** — `<repo>/plugins/model-providers/<name>/` — Hermes に最初から入っています
2. **ユーザープラグイン** — `$HERMES_HOME/plugins/model-providers/<name>/` — ディレクトリを置くだけです。すでに動いている Hermes のプロセスに見つけさせるには再起動します
3. **インストール済みプラグイン** — `$HERMES_HOME/plugins/<name>/`（`hermes plugins install owner/repo` が clone する先）— `plugin.yaml` が `kind: model-provider` を宣言しているものだけ読み込みます。それ以外の種類は汎用の PluginManager の担当です
4. **旧式の単一ファイル** — `<repo>/providers/<name>.py` — ツリー外の editable インストール向けの後方互換です

`register_provider()` は最後に書いた方が勝つので、**同じ名前ならユーザープラグインが同梱プラグインを上書きします**。`$HERMES_HOME/plugins/model-providers/gmi/` というディレクトリを置けば、リポジトリに触らずに組み込みの GMI プロファイルを差し替えられます。

## ディレクトリの構成 {#directory-structure}

```
plugins/model-providers/my-provider/
├── __init__.py       # Calls register_provider(profile) at module-level
├── plugin.yaml       # kind: model-provider + metadata (optional but recommended)
└── README.md         # Setup instructions (optional)
```

必須のファイルは `__init__.py` だけです。`plugin.yaml` は `hermes plugins` が中身を調べるときと、汎用の PluginManager がプラグインを適切なローダーへ振り分けるときに使います。これが無い場合、汎用のローダーはソースの文面から推測して判断します。

## 最小の例 — API キーだけの簡単なプロバイダー {#minimal-example-a-simple-api-key-provider}

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

これだけです。この 2 つのファイルを置けば、次のものが他に何も書かずに **自動でつながります**。

| つながる先 | 場所 | 得られるもの |
|---|---|---|
| 認証情報の解決 | `hermes_cli/auth.py` | `PROVIDER_REGISTRY["acme-inference"]` がプロファイルから埋まります |
| `--provider` の CLI フラグ | `hermes_cli/main.py` | `acme-inference` を受け付けます |
| `/model --provider`、モデル選択画面での切り替え | `hermes_cli/providers.py::resolve_provider_full` | `acme-inference` と別名すべてをプロファイルへ解決します（切り替え先は `name` なので、`acme` は `acme-inference` として保存されます）。ユーザーの `providers:` / `custom_providers:` ブロックが優先されるのは変わりません。`base_url` が空のプロファイル（エンドポイントを実行時に組み立てるもの）も、最後の段で解決されます |
| `hermes model` の選択画面 | `hermes_cli/models.py` | `CANONICAL_PROVIDERS` に並び、モデル一覧は `{base_url}/models` から取得されます |
| `hermes doctor` | `hermes_cli/doctor.py` | `ACME_API_KEY` の点検と `{base_url}/models` への疎通確認 |
| `hermes setup` | `hermes_cli/config.py` | `ACME_API_KEY` が `OPTIONAL_ENV_VARS` と設定ウィザードに出てきます |
| URL からの逆引き | `agent/model_metadata.py` | ホスト名からプロバイダー名を自動判定します |
| 補助モデル | `agent/auxiliary_client.py` | 圧縮や要約に `default_aux_model` を使います |
| 実行時の解決 | `hermes_cli/runtime_provider.py` | 正しい `base_url`、`api_key`、`api_mode` を返します |
| 通信層 | `agent/transports/chat_completions.py` | プロファイル経路では `prepare_messages` / `build_extra_body` / `build_api_kwargs_extras` から呼び出しの引数が作られます |

## ProviderProfile の項目 {#providerprofile-fields}

定義の全体は `providers/base.py` にあります。よく使うものは次のとおりです。

| 項目 | 型 | 役割 |
|---|---|---|
| `name` | str | 正式な id です。`config.yaml` の `model.provider` と `--provider` フラグに対応します |
| `aliases` | `tuple[str, ...]` | `get_provider_profile()` が解決する別名です（例: `grok` → `xai`） |
| `api_mode` | str | `chat_completions` \| `codex_responses` \| `anthropic_messages` \| `bedrock_converse` |
| `display_name` | str | `hermes model` の選択画面に出る表示名です |
| `description` | str | 選択画面の副題です |
| `signup_url` | str | 初回セットアップで「API キーはここで取得」として表示されます |
| `env_vars` | `tuple[str, ...]` | API キーの環境変数を優先順に並べます。末尾の `*_BASE_URL` は、ユーザーがベース URL を上書きするためのものとして扱われます |
| `base_url` | str | 既定の推論エンドポイントです |
| `models_url` | str | カタログの URL を明示します（無ければ `{base_url}/models` を使います） |
| `auth_type` | str | `api_key` \| `oauth_device_code` \| `oauth_external` \| `copilot` \| `aws_sdk` \| `external_process` |
| `auth_handler` | `Callable \| None` | プロバイダー側が持つ `hermes auth add/status/logout/refresh <name>` の処理です。[プロバイダー側が持つ認証](#provider-owned-auth-auth_handler-refresh_credential) を参照してください |
| `refresh_credential` | `Callable \| None` | プールされた OAuth の行を、プロバイダー側が更新する処理です。同じ節を参照してください |
| `classify_api_error` | `Callable \| None` | エラー分類をこのプロバイダー限定で上書きします。[復旧とエラーの分類](#recovery-and-error-classification) を参照してください |
| `fallback_models` | `tuple[str, ...]` | カタログの取得に失敗したときに表示する厳選リストです。`/model` の選択画面だけでなく、初回の `hermes setup` / `hermes model` の API キー入力の流れでも使われます（どちらも同じやり方でカタログを解決します。`fetch_models()` の結果に `fallback_models` を厳選分として先頭で混ぜ、取得が `None` を返すか例外になったときは `fallback_models` だけを使います） |
| `supports_vision` | bool | そのプロバイダーの API が **ツール結果** のメッセージに画像を含められることを宣言します（プロバイダー全体の通信上の能力です）。モデルごとのユーザー画像の扱いは、このフラグではなく `model_capabilities` や models.dev から決まります |
| `model_capabilities` | `dict[str, dict[str, Any]]` | `model_overrides` と同じ書式で、モデルごとの能力を宣言します。[モデルの能力を宣言する](#declaring-model-capabilities) を参照してください |
| `default_headers` | `dict[str, str]` | 毎回の呼び出しに付きます（例: Copilot の `Editor-Version`）。既定の `fetch_models()` がカタログを取りに行くときにも付きます |
| `fixed_temperature` | Any | `None` なら呼び出し側の値を使います。`OMIT_TEMPERATURE` を指定すると temperature を一切送りません（Kimi） |
| `default_max_tokens` | `int \| None` | プロバイダー単位の max_tokens の上限です（Nvidia は 16384） |
| `unsupported_response_formats` | `tuple` | API が端から受け付けない `response_format` の種類です。補助的な呼び出しでは、確実に 400 を食らう代わりにこれらを外します（DeepSeek は `("json_schema",)`） |
| `default_aux_model` | str | 補助的な作業（圧縮、画像の読み取り、要約）に使う安いモデルです |

## モデルの能力を宣言する {#declaring-model-capabilities}

Hermes はモデルごとの能力（`supports_reasoning`、`supports_vision`、
`supports_tools`、`context_window`）を models.dev のカタログから解決しますが、
ツリー外のプロバイダーのモデルはそこに載っていません。プロファイルで一度宣言してください。

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

キーはモデル ID の完全一致です。値は `config.yaml` の `model_overrides` と
同じ書式で、3 つの能力の真偽値、正の `context_window`、任意の
`model_family` を書けます。書かなかった項目は「不明」のままで（`False` にはなりません）、
一部だけ書けばカタログの情報を消さずに継ぎ足せます。

一度宣言すれば、`agent.models_dev` 経由でカタログを読むすべての利用箇所に反映されます。
`/model` 選択画面の `reasoning` バッジ、画像の振り分け
（プロファイル全体の `supports_vision` が未設定でも、`supports_vision: True` のモデルなら
`decide_image_input_mode` は `native` になります）、コンテキスト長の参照、
ダッシュボードの `/api/model/info` です。優先順位は、ユーザーが明示した
`model_overrides.<provider>.<model>` → プラグインの宣言 → カタログ → 隙間を埋める
`_default` の順です。プラグインが宣言していないモデルは、これまでどおりカタログと推測の経路をたどります。

対象外のものもあります。選択画面の `fast` バッジ（`hermes_cli/models.py::model_supports_fast_mode`
にあるモデル名からの推測）、推論の強さの語彙（`agent/reasoning_effort.py`）、
そして通信時のリクエスト項目です。宣言しても選択画面にモデルが増えるわけではありません。
それには `fallback_models` / `fetch_models` を使ってください。
一覧はプロセスごとに一度だけ読み込まれるので、書き換えたら Hermes を再起動してください。

## 差し替えられるフック {#overridable-hooks}

込み入った癖に対応するときは、`ProviderProfile` を継承してください。

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

モデルプロバイダープラグインは、`ProviderProfile.fetch_account_usage` を差し替えることで、
アカウントやプランの利用状況を `/usage` に出せます。共有の
`agent.account_usage.AccountUsageSnapshot` を読み込んで返してください（`AccountUsageWindow` を
必要なだけ含められます）。表示の整形をプラグイン側でしてはいけません。`None` を返すか
例外を投げた場合は、利用状況を持たないプロバイダーと同じく `/usage` が空のままになります。
組み込みの取得処理が常に優先されるので、このフックで組み込みプロバイダーの
利用状況の挙動を置き換えることはできません。このフックはどの画面でも共通の
10 秒の締め切り（`agent.account_usage.PLUGIN_USAGE_HOOK_DEADLINE_S`）の中で動きます。超えた場合は
`/usage` を止める代わりにその回は何も表示しないので、自前の HTTP 呼び出しにはもっと短い
タイムアウトを設定してください。

同梱の `plugins/model-providers/opencode-zen/` プロファイルは、OpenCode の Go プランの集計期間について
このフックを実装しています。`/usage` が出るすべての場所（CLI の `hermes usage` と `/usage`、メッセージング
ゲートウェイ、TUI や Desktop の利用状況表示）が、同じ中心の整形処理を通してこの内容を描画します。

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

## 外部プロセス（ACP）型のプロバイダー {#external-process-acp-providers}

標準入出力でやり取りするエージェント CLI は、HTTP のエンドポイントではありません。`auth_type="external_process"` を指定し、バイナリの起動方法を書き、`create_client` でクライアントを渡してください。中心部分に手を入れる必要はありません。`hermes -m <name>`、`/model`、認証情報の解決、実行時の解決、補助クライアント（圧縮、画像の読み取り）は、どれもプロバイダー名ではなく `auth_type` を見ています。ツリー内の例は `plugins/model-providers/copilot-acp/` です。

| 項目 | 役割 |
|---|---|
| `process_command` | 既定のバイナリです。例: `"copilot"` |
| `process_args` | 既定の引数の並びです。例: `("--acp", "--stdio")` |
| `process_command_env_vars` | バイナリを上書きする環境変数です。並んだ順に確認します |
| `process_args_env_var` | 引数を上書きする環境変数です（shlex で分割します） |

`create_client` が返すクライアントは、`client_kwargs` で `command` と `args` を受け取ります。そのクライアントがすでに完成していて非同期でも安全なら、クラス属性として `HERMES_SKIP_TRANSPORT_WRAP = True` / `HERMES_SKIP_ASYNC_WRAP = True` を宣言してください。補助クライアントが HTTP 用のアダプター越しに再送しなくなります。

### API キー以外のプラグインを選択画面に出す {#picker-rows-for-non-api-key-plugins}

登録されたプロファイルはすべて slug 単位で `CANONICAL_PROVIDERS` に加わります（`bedrock` のような組み込みの slug をプラグインが再宣言しても重複は取り除かれ、二重には出ません）。そのため外部プロセス型や OAuth 型のプラグインも、`copilot-acp` と並んで `hermes model`、`/model`、Desktop のモデル選択に現れます。表示されるかどうかは `auth_type` ではなく、認証情報の有無で決まります。

| `auth_type` | 行が表示され `authenticated` になる条件 | モデル一覧 |
|---|---|---|
| `external_process` | バイナリが見つかること（`process_command` か `process_command_env_vars` のどれかが `PATH` 上にある）、または `base_url` が `acp+tcp://…` であること。`hermes auth status` が報告するのと同じ構造上の条件です。バイナリが見つかることは、Desktop のモデル選択が「明示されたものだけ」で絞り込むときに使うサインイン済みの証拠（`auth_verified`）にもなるので、同梱の ACP プロバイダーと同じようにそこに表示されます | `fetch_models()`（自前のサブプロセスによる問い合わせ）。無ければ `fallback_models` |
| `oauth_external` / `oauth_device_code` | その slug の行が認証情報のプールにあり、期限切れでないトークンを持っていること。`hermes auth status <name>` も `list_available_providers().authenticated` も、どちらもプールを見ています。期限切れでも `refresh_token` と `refresh_credential` のフックがあれば `needs_refresh` と報告されます | プールのトークンを使った `fetch_models()`。無ければ `fallback_models`（最低 1 つは宣言してください） |

カタログのキャッシュは、プロファイルの `process_command_env_vars` / `process_args_env_var` の値をキーにしています。そのため `HERMES_<X>_COMMAND` を別のバイナリへ向ければ、モデルを探し直します。実行ファイルが見つかることはログイン済みの確認ではありません。未認証の CLI でも一覧には出て、サブプロセスは最初に使われた時点で失敗を報告します。

`hermes model`（およびセットアップウィザード）でその行を選ぶと、プロファイルの `auth_type` に応じた共通の流れが 1 つ動きます。外部プロセス型なら起動できるかを確認し（`resolve_external_process_provider_credentials`）、OAuth 型ならプールに有効な行が必要です（無ければ `hermes auth add <name>` と表示して止まります）。そのうえで統合されたカタログを提示し、プロファイルの `base_url` と `api_mode` とともに `config.model` を保存します。中心部分に `_model_flow_*` の項目を足す必要はありません。

#### 外部プロセス型の任意フック {#optional-external-process-hooks}

外部プロセス型のプロファイルは、`{available, logged_in, plan, detail, login_command}` を返す `setup_status(**kwargs)` と、`[{id, label, note}]` を返す `discover_models(**kwargs)` を実装できます。共通の流れは `logged_in` で分岐し（TTY ならその場で `login_command` を実行し、そうでなければ `detail` を表示します）、`discover_models()` が行を返した場合はそれを `fallback_models` と統合して提示します。`note` は行ごとの淡い注記（`· usage credits`）として描画され、モデルを隠すことはありません。`fetch_models()` も同じ id を返すようにして、`/model` や Desktop の選択画面がセットアップと食い違わないようにしてください。どちらのフックも軽く済ませ、推論は絶対に行わないでください。`None` を返すと `fallback_models` に戻ります。

HTTP 以外の通信で途中中断できるようにするには、クラスに `cancel(self)` メソッドを宣言してください。Hermes は、そのリクエストのクライアントを使用不可と印を付けたうえで、中断する側のスレッドから呼びます。この処理はすぐ戻り、自分の通信を安全に止める必要があります。プロセス起動と中断が競合する場合も同じです。リクエスト側のスレッドが持つファイル記述子を閉じてはいけません。後片付けの `close()` はこれまでどおりリクエストの持ち主が呼びます。このメソッドを持たないクライアントは、従来のソケットを閉じる中断経路のままです。

models.dev が知らないカタログには `model_aliases`（`{"sonnet": "claude-sonnet-5[1m]"}`）を宣言してください。素の `/model <alias>` と `/model <id-prefix>` はまずプロセス型プロバイダーの中で解決され、`validate_requested_model` は宣言済みの id を `process://` に問い合わせずに受け付けます。

外部プロセスへの委譲を明示した場合、子プロセスのコマンドを解決するときも選んだプロバイダーとその通信方式を保ちます。実行ファイルを上書きしただけでは、外部プロセス型のプロバイダーが ACP に変わることはありません。

ネイティブのクライアントは、`<provider>.native_assistant` という名前空間付きの型で、非公開のアシスタント再生データを `reasoning_details` に残せます。`ProviderProfile.native_reasoning_details_type`（既定は `None`）にまったく同じ文字列を宣言してください。Chat Completions のリクエスト整形は、その入れ物を宣言したプロファイルにだけ渡します。フォールバックやモデルの切り替えが起きた後も同じです。他の非公開の入れ物は、元のプラグインがすでに入っていない場合でも取り除かれます。OpenRouter の `reasoning.encrypted` のような標準的な推論データはそのままです。取り除くのはリクエストのときだけで、保存された履歴はそのまま残るので、元のプロバイダーへ戻ることができます。

プロバイダーは `get_model_context_length(model)` を差し替えて、裏付けのある正のトークン数を返すことができます。従来の参照の流れに任せる場合は `None` を返します。明示的な設定とエンドポイント単位の上書きが優先されます。プロバイダーが示す値は、汎用のキャッシュや HTTP での問い合わせより先に参照されます。カタログ上の最大値と、そのアカウントで実際に使える枠を取り違えないでください。

料金の出し方が標準的でない場合、`get_usage_cost(model, usage)` が `agent.usage_pricing.CostResult` を返せます。通常の料金計算でよければ `None` を返します。`usage` は `CanonicalUsage` で、その `raw_usage` には取得できた範囲で応答のメタデータが残っています。ネイティブの定価による合計は `estimated` として扱い、`actual` や `included` にはしないでください。請求の情報が無いことは、料金がかかっていない証拠にはなりません。既定のフックは `None` を返すので、既存のプロバイダーはそのままです。

## フックの実例 {#hook-reference-examples}

書き方の見本として、同梱の次のプラグインを読んでください。

| プラグイン | 見どころ |
|---|---|
| `plugins/model-providers/openrouter/` | プロバイダーの優先指定を持つ集約型、公開されたモデルカタログ |
| `plugins/model-providers/gemini/` | `thinking_config` の変換（ネイティブ形式と OpenAI 互換の入れ子形式の両方） |
| `plugins/model-providers/kimi-coding/` | `OMIT_TEMPERATURE`、`extra_body.thinking`、最上位の `reasoning_effort` |
| `plugins/model-providers/qwen-oauth/` | メッセージの正規化、`cache_control` の差し込み、VL の高解像度対応 |
| `plugins/model-providers/nous/` | 帰属のタグ付け、「無効なときは推論を送らない」 |
| `plugins/model-providers/custom/` | Ollama の `num_ctx` と `think: false` の癖 |
| `plugins/model-providers/bedrock/` | `api_mode="bedrock_converse"`、`fetch_models` は None を返す（REST のエンドポイントが無いため） |

## ユーザーによる上書き — リポジトリを編集せずに組み込みを差し替える {#user-overrides-replace-a-built-in-without-editing-the-repo}

たとえば、試験のために `gmi` を自分の非公開のステージング環境へ向けたいとします。`~/.hermes/plugins/model-providers/gmi/__init__.py` を作ってください。

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

新しく起動した Hermes のプロセスでは、`get_provider_profile("gmi").base_url` がステージングの URL を返します。リポジトリへのパッチも作り直しも要りません。ユーザープラグインは同梱のものより後に読み込まれるので、ユーザー側の `register_provider()` が勝ちます。

この上書きは実行時にも効きます。組み込みのプロバイダーは `hermes_cli.auth.PROVIDER_REGISTRY` に行を持っていて（`resolve_runtime_provider()` はこの表からエンドポイントと環境変数を読みます）、`$HERMES_HOME` のプラグインが同じ名前で登録し直すと、その行のプロファイル由来の項目が書き換わります。つまり推論は同梱のものではなく、ステージングの URL へ向かいます。

| プロファイルの項目 | 登録表の項目 | 条件 |
|---|---|---|
| `base_url` | `inference_base_url` | プロファイルが空でない `base_url` を持つとき |
| `env_vars`（URL でない項目） | `api_key_env_vars` | api キー型の行で、プロファイルが `env_vars` を持つとき |
| `env_vars`（末尾の `*_BASE_URL` / `*_URL` 項目） | `base_url_env_var` | プロファイルがそれを宣言したとき。宣言しなければ組み込みの環境変数（例: `GMI_BASE_URL`）のままです |

これが起きるのは **ユーザー** プラグイン（`$HERMES_HOME/plugins/model-providers/` か、インストール済みの `kind: model-provider` プラグイン）のときだけです。同梱のプロファイルが組み込みの行を書き換えることはありませんし、`copilot`、`kimi-coding`、`kimi-coding-cn`、`zai` は独自の認証情報の解決を保ちます。プロファイルが空のままにした項目は、組み込みの値が残ります。`*_BASE_URL` の環境変数は、そのどちらよりも優先されます。

## api_mode の選び方 {#apimode-selection}

組み込みで認識される値は 4 つ（`chat_completions`、`codex_responses`、`anthropic_messages`、`bedrock_converse`）で、これに加えてプラグインが自分で登録したモードも使えます。Hermes は次の順で選びます。

1. ユーザーによる明示的な上書き（`config.yaml` の `model.api_mode` が設定されているとき）
2. OpenCode のモデル単位の振り分け（Zen と Go 向けの `opencode_model_api_mode`）
3. URL からの自動判定 — 末尾が `/anthropic` なら `anthropic_messages`、`api.openai.com` なら `codex_responses`、`api.x.ai` なら `codex_responses`、Kimi のドメインで `/coding` なら `chat_completions`
4. URL の判定で何も分からなかったときの受け皿としての **プロファイルの `api_mode`**
5. 既定の `chat_completions`

`profile.api_mode` には、そのプロバイダーが標準としている値を書いてください。あくまで手がかりとして働きます。ユーザーによる URL の上書きは、やはりそちらが勝ちます。

### 独自の通信方式を用意する {#shipping-your-own-wire-dialect}

組み込みの通信層のどれにも当てはまらない方式を話すプラグインは、それを登録してプロファイルで名前を指定します。

```python
from agent.transports import register_transport
from agent.transports.chat_completions import ChatCompletionsTransport

class MyDialectTransport(ChatCompletionsTransport):
    api_mode = "mydialect"
    # override convert_messages / build_kwargs / normalize_response as needed

register_transport("mydialect", MyDialectTransport)
register_provider(ProviderProfile(name="myprovider", api_mode="mydialect", ...))
```

`api_mode` を見る箇所（`determine_api_mode`、実行時の解決、エージェントの構築、委譲）はすべて、通信層の登録表が知っているモードだけを受け付けます。誰も登録していないモードを指定したプロファイルは、`chat_completions` に落ちます。

## 認証の種類 {#auth-types}

| `auth_type` | 意味 | 使っているもの |
|---|---|---|
| `api_key` | 1 つの環境変数が固定の API キーを持ちます | ほとんどのプロバイダー |
| `oauth_device_code` | デバイスコード方式の OAuth です | Nous Portal、`auth_handler` を使うツリー外のプラグイン |
| `oauth_external` | ユーザーは別の場所でサインインし、トークンが `auth.json` に届きます | Anthropic OAuth、MiniMax OAuth、Qwen Portal、Nous Portal |
| `copilot` | GitHub Copilot のトークン更新の仕組みです | `copilot` プラグインだけ |
| `aws_sdk` | AWS SDK の認証情報の解決順です（IAM ロール、プロファイル、環境変数） | `bedrock` プラグインだけ |
| `external_process` | エージェントが起動するサブプロセスが認証を担当します（[外部プロセス型のプロバイダー](#external-process-acp-providers) を参照） | `copilot-acp` プラグイン、ツリー外の ACP プラグイン |

どのプロファイルも、宣言した `auth_type` のもとで Hermes の認証の登録表に写されます（例外は 2 つ、`env_vars` が空の `api_key` プロファイルと、集約型やユーザー指定の slug である `openrouter`/`custom`、そして独自の更新処理を持つ組み込みの `copilot`/`kimi-coding`/`zai` です）。そのため `hermes auth`、
`--provider <name>`、実行時の解決は、形がどうであれそれを受け付けます。違うのは誰がログインを
行うかです。`api_key` のプロファイルには組み込みのキー入力と環境変数の解決が付きます。それ以外の `auth_type` は
すべて **プロバイダー側の担当** で、プラグインが下の 2 つのフックを用意します。`auth_handler` の無い
api キー以外のプロファイルに対しては、`hermes auth add <name>` が黙って何もしないのではなく、
「ships no auth_handler」という分かりやすいエラーで失敗します。

## プロバイダー側が持つ認証（`auth_handler`、`refresh_credential`） {#provider-owned-auth-authhandler-refreshcredential}

`auth_type` はプロバイダーが *どんな種類* の認証情報を必要とするかを表し、`auth_handler` はプラグインが
それを **どう取得するか** です。既存の `hermes auth` コマンド群の中で、自前のデバイスコード / OIDC / IdC の流れを動かします
（モデルプロバイダーのマニフェストは汎用のコマンドプラグインのローダーから外れるので、`register(ctx)` で
コマンドを足すやり方は使えません）。`refresh_credential` は、プラグインが保存したプールのトークンを
認証情報のプールが **更新する** ときの処理です。

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
| `auth_handler(action, args)` | CLI からの操作では、`args` は `hermes auth` を解析した名前空間です。対話的なセットアップの選択画面からは `provider` だけを持つ最小限の名前空間が渡るので、値は `getattr(args, name, None)` で読んでください。真を返せば処理済みです（Hermes はそれ以上何も表示せず、終了コードは 0 です）。偽を返すと、**その操作だけ** 組み込みの経路に戻ります。例外は `SystemExit("<provider> auth handler failed for `&lt;action&gt;`: …")` になります。 |
| `refresh_credential(entry)` | `PooledCredential` を受け取り、更新後の値の対応表か `None` を返します。`PooledCredential` の項目にあたるキー（`access_token`、`refresh_token`、`expires_at_ms`、…）はその行の項目を置き換えます。それ以外のキー（`expires_in`、`token_type`、`scope` といった、トークン発行元の生の形）は `entry.extra` に入り、`auth.json` を経由して往復します。`None` や空の対応表を返すのは、プラグインが更新できなかったという意味です。その行は更新に失敗したときとまったく同じように休ませます（更新済みとは決して報告しないので、死んだトークンが再送されることはありません）。このフックがあること自体が、そのプロバイダーを *更新可能* にします。`hermes auth refresh <name>` と、主ループでの 401 からの復旧が、中心部分の名前の一覧を介さずにプール経由でこれを呼びます。補助クライアントの 401 からの復旧がここへ届くのは、もともと復旧できると見なしているプールの行（api キーの行と、組み込みの OAuth の経路）だけです。 |
| 更新の失敗 | 許可そのものが死んでいるときは、`hermes_cli.auth_constants.AuthError(..., relogin_required=True)` を投げてください（`code` に `invalid_grant` / `invalid_token` / `refresh_token_reused` を付けても構いません）。その行は **DEAD** になり、更新の対象から外れ、Hermes は `hermes auth add <name>` を示す WARNING を記録します。それ以外の例外（ネットワーク、429、5xx）は一時的なものとみなし、その行は 1 回のクールダウンのあいだ休ませてから再試行します。 |
| 同時実行 | このフックは共有の `auth.json` のロックの中で動きます。呼ぶ前にプールはその行を読み直します。別の Hermes のプロセス（ゲートウェイと CLI、2 つのプロファイル）がすでにその対を更新していた場合、その対が採用され、フックは **呼ばれません**。使い捨ての更新トークンでも安全です。フックが戻った後、更新された行は `auth.json` へ書き込まれます。 |
| フックが無い場合 | `api_key` のプロファイルはこれまでとまったく同じです。それ以外の `auth_type` で `auth_handler` が無いと、`hermes auth add` ではっきり失敗します。 |

`hermes auth add|status|logout|refresh <provider>` は、組み込みの認証情報プールの流れより **先に** ハンドラーへ
問い合わせます。同じ名前を 2 回登録すると後から書いた方が勝つので、ユーザープラグインで同梱のプロバイダーの
流れを差し替えられます。

Hermes が渡すのは解析済みの名前空間で、プロバイダーが宣言したフラグではありません。プロバイダー固有の値は
対話的に尋ねるか、自前の設定や環境変数から読んでください。プラグインがプールに保存した行はそのプラグインのもので、
追加のキーは `load → save → load` を越えて残ります。Hermes が `refresh_credential` へ渡す秘密情報は、そのプールの行だけです。

### プラグイン向けの宣言的 OAuth（PKCE） {#declarative-oauth-pkce-for-plugins}

IdP が標準の OAuth 2.0 Authorization Code + PKCE を話すプロバイダーなら、上のフックを手書きする必要は
ありません。エンドポイントを `OAuthPKCEConfig` に宣言して、2 つのファクトリーに組み立ててもらいます。

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

あとは Hermes が一連の流れをすべて引き受けます。`hermes auth add example-pkce [--no-browser]` がブラウザーを開き（または
URL を表示し、離れた機械なら SSH トンネルの案内も添えます）、`http://127.0.0.1:<port>/callback` で待ち受け、
CSRF 対策の `state` を確認し、S256 の PKCE でコードを交換して、プールの `oauth` 認証情報として保存します
（`source: manual:loopback_pkce`、`expires_at_ms`、`refresh_token`）。`auth status` はログイン済みか期限切れかを
報告し、`auth logout` は行を削除します。`auth refresh` と 401 からの復旧の経路は `refresh_token` の許可で更新しますが、
その前に認証のロックの中で `auth.json` を読み直すので、他のプロセスによる更新を採用し、使い捨ての更新トークンを
二重に使うことはありません。

セキュリティ上の境界（ログインでも更新でも、リクエストの前に必ず確認されます）は次のとおりです。両方のエンドポイントが
`https://` であること（素の `http://` が通るのは、ループバックのアドレスをそのまま書いたホスト、つまりローカル開発の IdP だけです）。
`token_url` のホストは `authorize_url` のホストか、そのサブドメインであること（または `allowed_hosts` に列挙されていること）。
待ち受けは `127.0.0.1` そのものに束ねられること。トークン、`state`、PKCE の検証子は決して記録されません。
任意で指定できる項目は `audience`、`extra_authorize_params`、`extra_token_params`、`redirect_path`、
`timeout_seconds`、`label` です。

## 復旧とエラーの分類 {#recovery-and-error-classification}

`kind: model-provider` のプラグインを読み込むのはプロバイダーの探索であって、汎用のプラグインマネージャーでは
**ありません**。そのため `transform_api_error_classification` のプラグインフックは、2 つ目のプラグイン部品を
用意しない限りここからは届きません。代わりに、プロファイルが同じ役割の差し込み口を持っています。

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
| `classify_api_error(error, *, status_code, error_code, message, body, model)` | `agent.error_classifier.classify_api_error` が、**このプロバイダーだけ** の失敗について呼びます。汎用の `transform_api_error_classification` フックの後、組み込みの処理の前です。`message` は小文字化されたエラー文、`body` は解析済みの JSON の中身です（空のこともあります）。`{"reason": <FailoverReason name>}` に加えて、任意で `retryable` / `should_compress` / `should_rotate_credential` / `should_fallback` / `error_context` を返すと上書きできます（billing、auth、model_not_found … のような終端の理由では、明示しない限り `should_fallback: True` は `retryable: False` を意味します。フォールバックの連鎖は再試行しない判定のときだけ動くからです。レート制限の理由は、組み込みの「再試行してからフォールバック」の形を保ちます）。`None`（または知らない理由）を返すと、組み込みの判定のままです。例外は握りつぶされ、DEBUG で記録されます。この判定は組み込みと同じ復旧を動かします。たとえば `billing` なら、一時的な 403 のクールダウンではなく、請求向けの期間だけ認証情報を休ませます。 |
| プラグインの認証情報での 401 | 認証情報のプールが扱うので、中心部分に手を入れる必要はありません。失敗したプールの行は `refresh_credential` を通して 1 回の試行につき 1 度更新され（1 セッションあたり 1 行につき 2 回まで）、更新後のトークンでクライアントを作り直してリクエストを再試行します。`None` や空を返したり例外が出たりすると、その行は休みに入ります。リクエストはそこで別の行に切り替わるか、汎用の「もう一度サインインしてください: `hermes auth add <name>`」という案内に落ちます。組み込みのプロバイダー向けの案内に落ちることはありません。 |
| 補助的な呼び出し | 補助クライアントの 401 も、同じプールの更新をたどります（`try_refresh_current` → `refresh_credential`）。 |

中心部分に名前で書かれたままの復旧処理は、汎用の形に落とすと安全でないものです（プロバイダー固有のトークン置き場の
取り直し、プランの等級による利用制限、使い捨ての更新トークンの隔離など）。そうしたものが必要なプラグインは、
`refresh_credential` / `classify_api_error` の中で自分で面倒を見ます。

## 探索のタイミング {#discovery-timing}

プロバイダーの探索は **遅延** 実行で、そのプロセスで最初に `get_provider_profile()` か `list_providers()` が呼ばれたときに走ります。実際には起動直後に起きます（`auth.py` のモジュール読み込みが `PROVIDER_REGISTRY` を先に広げるためです）。プラグインが読み込まれたか確かめたいときは、次を実行してください。

```bash
hermes doctor
```

— `auth_type="api_key"` のプロファイルがうまく読み込まれていれば、Provider Connectivity の節に `/models` への疎通確認とともに現れます。

プログラムから調べるには、次のようにします。

```python
from providers import list_providers
for p in list_providers():
    print(p.name, p.base_url, p.api_mode)
```

## プラグインを試す {#testing-your-plugin}

実際の設定を汚さないように、`HERMES_HOME` を一時的なディレクトリへ向けてください。

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

## 汎用 PluginManager との関係 {#general-pluginmanager-integration}

汎用の `PluginManager`（`hermes plugins` が操作する相手）は、モデルプロバイダープラグインを **見えてはいます** が、読み込みはしません。その一生を管理するのは `providers/__init__.py` です。マネージャーはマニフェストを調査用に記録し、`kind: model-provider` として分類します。種類を書いていないユーザープラグインを `$HERMES_HOME/plugins/` に置いて、それがたまたま `ProviderProfile` を使って `register_provider` を呼んでいた場合、マネージャーはソースの文面から推測して `kind: model-provider` に自動で寄せます。つまり `plugin.yaml` が無くても、正しく振り分けられます。

## pip で配布する {#distribute-via-pip}

モデルプロバイダーは pip のパッケージとしても配れます。`pyproject.toml` の
`hermes_agent.plugins` グループにエントリーポイントを書いてください。

```toml
[project.entry-points."hermes_agent.plugins"]
acme-inference = "acme_hermes_plugin:register"
```

指定先は、次のどちらでも構いません。

- **呼び出せるもの**（`module:func`）— 引数なしで呼ばれます。その中で
  `register_provider(profile)` を呼んでください。
- **モジュールそのもの**（`module`）— モジュールの読み込み時に起きる
  `register_provider(...)` の副作用のために読み込まれます。ディレクトリ型プラグインの
  `__init__.py` と同じ取り決めです。

これらのエントリーポイントを見つけるのは `providers/__init__.py` 自身です。汎用の
`PluginManager` が pip パッケージのプロバイダー登録を呼ぶことはありません（そちらの
エントリーポイント経路は `register(ctx)` 形式の汎用プラグイン向けで、`plugins.enabled` で
制御されます）。そのためプロバイダーの登録表は自前で走査します。規則が 2 つあります。

- **明示的に有効化する必要があります。** この走査も、`config.yaml` の
  `plugins.enabled` の許可リスト（と `plugins.disabled` の拒否リスト）に従います。pip の
  パッケージは、入っているというだけでは決して読み込まれません。エントリーポイントの名前を
  `plugins.enabled` に足す必要があります。

  ```yaml
  plugins:
    enabled:
      - acme-inference
  ```

- **優先順位は最も低くなります。** エントリーポイントのプラグインは、ファイルシステム上の
  プラグインより **先に** 見つかります。`register_provider()` は後から書いた方が勝つので、
  同じ名前の同梱プロファイルや `$HERMES_HOME` のプロファイルが必ず上書きします。pip の
  パッケージは本当に新しいプロバイダーを足せますが、一次提供のプロバイダー名を
  こっそり乗っ取ることはできません。

引数を必要とする指定先（汎用プラグインの `register(ctx)`）は、プロバイダーの走査では
飛ばされます。それらは `PluginManager` の担当です。壊れたエントリーポイントは
切り離され、警告として記録して飛ばすだけなので、他のプロバイダーの探索を
止めることはありません。

エントリーポイントの設定の全体は [Hermes プラグインを作る](/hermes/docs/developer-guide/plugins/#distribute-via-pip) を参照してください。

## 関連ページ {#related-pages}

- [プロバイダーの実行時解決](/hermes/docs/developer-guide/provider-runtime/) — 解決の優先順位と、どの層がプロファイルのどこを読むか
- [プロバイダーを追加する](/hermes/docs/developer-guide/adding-providers/) — 新しい推論バックエンドを足すときの一連の手順（手軽なプラグイン経路と、CLI や認証まで含めた本格的な組み込みの両方を扱います）
- [メモリープロバイダープラグイン](/hermes/docs/developer-guide/memory-provider-plugin/)
- [コンテキストエンジンプラグイン](/hermes/docs/developer-guide/context-engine-plugin/)
- [Hermes プラグインを作る](/hermes/docs/developer-guide/plugins/) — プラグイン作りの全般
