---
title: "モデルプロバイダのプラグイン"
description: "Hermes Agent 向けにモデルプロバイダ（推論のバックエンド）のプラグインを作る方法"
upstream_path: developer-guide/model-provider-plugin.md
upstream_blob: df11914f3fee66aaabcc737ebd005ec30540dd05
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/model-provider-plugin
---

# モデルプロバイダのプラグインを作る {#building-a-model-provider-plugin}

モデルプロバイダのプラグインは、推論のバックエンドを宣言するものです。OpenAI 互換のエンドポイント、Anthropic Messages のサーバー、Codex 形式の Responses API、Bedrock 独自の口などがそれにあたり、Hermes は `AIAgent` の呼び出しをそこへ流します。組み込みのプロバイダ（OpenRouter、Anthropic、GMI、DeepSeek、Nvidia など）はすべて、このプラグインの形で入っています。外部の人も `$HERMES_HOME/plugins/model-providers/` の下にディレクトリを置くだけで自分のものを追加でき、リポジトリには一切手を入れません。

:::tip
モデルプロバイダのプラグインは、3種類ある**プロバイダプラグイン**のうちの1つです。残りは [メモリプロバイダのプラグイン](/hermes/docs/developer-guide/memory-provider-plugin/)（セッションをまたぐ知識）と [コンテキストエンジンのプラグイン](/hermes/docs/developer-guide/context-engine-plugin/)（文脈の圧縮のやり方）です。3つとも「ディレクトリを置いて、プロファイルを宣言する。リポジトリは触らない」という同じ形です。
:::

## 見つけ方の仕組み {#how-discovery-works}

`providers/__init__.py._discover_providers()` は、どこかのコードが `get_provider_profile()` または `list_providers()` を最初に呼んだときに、そのときになって走ります。探す順番は次のとおりです。

1. **同梱のプラグイン** — `<repo>/plugins/model-providers/<name>/` — Hermes に最初から入っているもの
2. **利用者のプラグイン** — `$HERMES_HOME/plugins/model-providers/<name>/` — ディレクトリを置くだけです。次回以降のセッションでは再起動もいりません
3. **導入したプラグイン** — `$HERMES_HOME/plugins/<name>/`（`hermes plugins install owner/repo` がクローンする先）— ここから読み込まれるのは `plugin.yaml` に `kind: model-provider` と書かれているものだけです。それ以外の種類は汎用の PluginManager の担当になります
4. **旧来の単一ファイル** — `<repo>/providers/<name>.py` — リポジトリ外の編集可能インストール向けの互換用です

**同じ名前なら、利用者のプラグインが同梱のものを上書きします。** `register_provider()` は最後に書いたものが勝つためです。`$HERMES_HOME/plugins/model-providers/gmi/` というディレクトリを置けば、リポジトリに触らずに組み込みの GMI のプロファイルを差し替えられます。

## ディレクトリの構成 {#directory-structure}

```
plugins/model-providers/my-provider/
├── __init__.py       # Calls register_provider(profile) at module-level
├── plugin.yaml       # kind: model-provider + metadata (optional but recommended)
└── README.md         # Setup instructions (optional)
```

必ず要るのは `__init__.py` だけです。`plugin.yaml` は `hermes plugins` が中身を調べるときと、汎用の PluginManager が正しい読み込み口へ振り分けるときに使われます。これがない場合、汎用の読み込み側はソースの文面から推測して判断します。

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

これで終わりです。この2つのファイルを置くと、ほかに何も書き換えなくても次のものが**自動でつながります**。

| つながる先 | 場所 | 何が得られるか |
|---|---|---|
| 資格情報の解決 | `hermes_cli/auth.py` | プロファイルから `PROVIDER_REGISTRY["acme-inference"]` が埋まります |
| CLI の `--provider` オプション | `hermes_cli/main.py` | `acme-inference` を受け付けるようになります |
| `hermes model` の選択画面 | `hermes_cli/models.py` | `CANONICAL_PROVIDERS` に現れ、モデルの一覧は `{base_url}/models` から取得されます |
| `hermes doctor` | `hermes_cli/doctor.py` | `ACME_API_KEY` の確認と `{base_url}/models` への疎通確認が入ります |
| `hermes setup` | `hermes_cli/config.py` | `ACME_API_KEY` が `OPTIONAL_ENV_VARS` と初期設定の案内に現れます |
| URL からの逆引き | `agent/model_metadata.py` | ホスト名からプロバイダ名を割り出して自動判定します |
| 補助のモデル | `agent/auxiliary_client.py` | 圧縮や要約に `default_aux_model` を使います |
| 実行時の解決 | `hermes_cli/runtime_provider.py` | 正しい `base_url`、`api_key`、`api_mode` を返します |
| 通信 | `agent/transports/chat_completions.py` | プロファイルの経路で `prepare_messages` / `build_extra_body` / `build_api_kwargs_extras` から引数を組み立てます |

## ProviderProfile のフィールド {#providerprofile-fields}

定義の全文は `providers/base.py` にあります。よく使うものは次のとおりです。

| フィールド | 型 | 役割 |
|---|---|---|
| `name` | str | 正式な id。`config.yaml` の `model.provider` と `--provider` オプションの値に一致します |
| `aliases` | `tuple[str, ...]` | `get_provider_profile()` が解決してくれる別名（例: `grok` → `xai`） |
| `api_mode` | str | `chat_completions` \| `codex_responses` \| `anthropic_messages` \| `bedrock_converse` |
| `display_name` | str | `hermes model` の選択画面に出す、人が読むための名前 |
| `description` | str | 選択画面での説明文 |
| `signup_url` | str | 初回の設定時に「API キーはここで取得します」として示されます |
| `env_vars` | `tuple[str, ...]` | API キーの環境変数を優先順に並べたもの。末尾の `*_BASE_URL` は利用者によるベース URL の上書きとして使われます |
| `base_url` | str | 既定の推論エンドポイント |
| `models_url` | str | モデル一覧の URL を明示するもの（未指定なら `{base_url}/models`） |
| `auth_type` | str | `api_key` \| `oauth_device_code` \| `oauth_external` \| `copilot` \| `aws_sdk` \| `external_process` |
| `fallback_models` | `tuple[str, ...]` | 一覧の取得に失敗したときに出す、選りすぐりのモデル名 |
| `default_headers` | `dict[str, str]` | 毎回の要求に付けるヘッダ（例: Copilot の `Editor-Version`） |
| `fixed_temperature` | Any | `None` なら呼び出し側の値を使います。`OMIT_TEMPERATURE` を指定すると temperature を一切送りません（Kimi） |
| `default_max_tokens` | `int \| None` | プロバイダ単位での max_tokens の上限（Nvidia は 16384） |
| `default_aux_model` | str | 補助的な作業（圧縮、画像の読み取り、要約）に使う安価なモデル |

## 差し替えできるフック {#overridable-hooks}

一筋縄でいかない癖があるときは `ProviderProfile` を継承します。

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

## 別プロセスで動くプロバイダ（ACP） {#external-process-acp-providers}

標準入出力でやり取りするエージェント CLI は、HTTP のエンドポイントではありません。この場合は `auth_type="external_process"` を指定し、実行ファイルの起動方法を書き、`create_client` でクライアントを渡します。コア側の書き換えは要りません。`hermes -m <name>`、`/model`、資格情報の解決、実行時の解決、補助のクライアント（圧縮、画像の読み取り）はどれもプロバイダ名ではなく `auth_type` を手がかりにしているからです。リポジトリ内の実例は `plugins/model-providers/copilot-acp/` です。

| フィールド | 役割 |
|---|---|
| `process_command` | 既定の実行ファイル。たとえば `"copilot"` |
| `process_args` | 既定で後ろに付ける引数。たとえば `("--acp", "--stdio")` |
| `process_command_env_vars` | 実行ファイルを上書きする環境変数。書いた順に見ます |
| `process_args_env_var` | 引数を上書きする環境変数（shlex で分割されます） |

`create_client` が返すクライアントには、`client_kwargs` の中で `command` と `args` が渡されます。そのクライアントがすでに完成していて非同期でも安全なら、クラス属性として `HERMES_SKIP_TRANSPORT_WRAP = True` と `HERMES_SKIP_ASYNC_WRAP = True` を宣言してください。そうすれば補助のクライアントが HTTP 用のアダプタへ改めて流し直すことがなくなります。

## フックの書き方の実例 {#hook-reference-examples}

書き方の型は、同梱の次のプラグインが参考になります。

| プラグイン | 見どころ |
|---|---|
| `plugins/model-providers/openrouter/` | 集約型。プロバイダの優先設定と、公開されたモデル一覧 |
| `plugins/model-providers/gemini/` | `thinking_config` の変換（独自形式と OpenAI 互換の入れ子形式の両方） |
| `plugins/model-providers/kimi-coding/` | `OMIT_TEMPERATURE`、`extra_body.thinking`、最上位の `reasoning_effort` |
| `plugins/model-providers/qwen-oauth/` | メッセージの正規化、`cache_control` の差し込み、VL の高解像度対応 |
| `plugins/model-providers/nous/` | 帰属のタグ付け、「無効なときは推論部分を送らない」 |
| `plugins/model-providers/custom/` | Ollama の `num_ctx` と `think: false` という癖 |
| `plugins/model-providers/bedrock/` | `api_mode="bedrock_converse"`、`fetch_models` が None を返す（REST のエンドポイントがないため） |

## 利用者による上書き — リポジトリを触らずに組み込みを差し替える {#user-overrides-replace-a-built-in-without-editing-the-repo}

たとえば試験用に、`gmi` を自分の非公開のステージング環境へ向けたいとします。`~/.hermes/plugins/model-providers/gmi/__init__.py` を次のように作ります。

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

次のセッションからは、`get_provider_profile("gmi").base_url` がステージングの URL を返します。リポジトリへの当て込みも、作り直しも不要です。利用者のプラグインは同梱のものより後に見つかるので、利用者側の `register_provider()` の呼び出しが勝ちます。

## api_mode の選ばれ方 {#apimode-selection}

値は4つあります。Hermes は次の順で決めます。

1. 利用者による明示的な指定（`config.yaml` の `model.api_mode` が設定されている場合）
2. OpenCode のモデルごとの振り分け（Zen と Go 向けの `opencode_model_api_mode`）
3. URL からの自動判定 — 末尾が `/anthropic` なら `anthropic_messages`、`api.openai.com` なら `codex_responses`、`api.x.ai` なら `codex_responses`、Kimi のドメインで `/coding` が付く場合は `chat_completions`
4. URL からは何も分からなかったときの受け皿としての **プロファイルの `api_mode`**
5. 既定値の `chat_completions`

`profile.api_mode` には、そのプロバイダが標準としている値を書いてください。これは手がかりとして働きます。利用者が URL で上書きした場合は、そちらが優先されます。

## 認証の種類 {#auth-types}

| `auth_type` | 意味 | 使っているところ |
|---|---|---|
| `api_key` | 環境変数1つに固定の API キーを入れる方式 | ほとんどのプロバイダ |
| `oauth_device_code` | デバイスコードを使う OAuth の流れ | — |
| `oauth_external` | 別の場所でログインし、トークンが `auth.json` に置かれる方式 | Anthropic OAuth、MiniMax OAuth、Qwen Portal、Nous Portal |
| `copilot` | GitHub Copilot のトークン更新の流れ | `copilot` プラグインのみ |
| `aws_sdk` | AWS SDK の資格情報の連なり（IAM ロール、プロファイル、環境変数） | `bedrock` プラグインのみ |
| `external_process` | エージェントが起動するサブプロセス側で認証する（[別プロセスで動くプロバイダ](#external-process-acp-providers) を参照） | `copilot-acp` プラグイン、リポジトリ外の ACP プラグイン |

`auth_type` は、そのプロバイダを「単純な API キー方式のプロバイダ」として扱うかどうかの分かれ目です。`api_key` でない場合、PluginManager はマニフェストを記録しますが、Hermes の CLI 側の自動処理（doctor の確認、`--provider` オプション、初期設定の案内への引き渡し）は素通りすることがあります。

## いつ見つかるか {#discovery-timing}

プロバイダを探す処理は**そのときになって走る**方式で、プロセスの中で最初に `get_provider_profile()` か `list_providers()` が呼ばれたときに動きます。実際には起動の早い段階で走ります（`auth.py` を読み込む時点で `PROVIDER_REGISTRY` が先に拡張されるためです）。自分のプラグインが読み込まれたかを確かめたいときは、次を実行します。

```bash
hermes doctor
```

`auth_type="api_key"` のプロファイルがうまく読み込まれていれば、Provider Connectivity の節に `/models` への疎通確認とともに現れます。

コードから調べるには次のようにします。

```python
from providers import list_providers
for p in list_providers():
    print(p.name, p.base_url, p.api_mode)
```

## プラグインを試す {#testing-your-plugin}

本番の設定を汚さないよう、`HERMES_HOME` を一時ディレクトリに向けます。

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

汎用の `PluginManager`（`hermes plugins` が扱うもの）は、モデルプロバイダのプラグインを**見えてはいます**が、読み込みはしません。その面倒を見るのは `providers/__init__.py` です。マネージャの側は中身を調べるためにマニフェストを記録し、`kind: model-provider` として分類するだけです。種類を書かない利用者のプラグインを `$HERMES_HOME/plugins/` に置いた場合でも、その中で `ProviderProfile` を使って `register_provider` を呼んでいれば、マネージャはソースの文面から推測して `kind: model-provider` とみなします。つまり `plugin.yaml` がなくても正しく振り分けられます。

## pip で配る {#distribute-via-pip}

モデルプロバイダは pip のパッケージとして配れます。`pyproject.toml` の
`hermes_agent.plugins` グループにエントリポイントを出してください。

```toml
[project.entry-points."hermes_agent.plugins"]
acme-inference = "acme_hermes_plugin:register"
```

指す先は次のどちらでもかまいません。

- **呼び出せるもの**（`module:func`）— 引数なしで呼ばれます。その中で
  `register_provider(profile)` を呼んでください。
- **モジュールそのもの**（`module`）— 読み込んだときに走るモジュールレベルの
  `register_provider(...)` を目当てに読み込まれます。ディレクトリ形式のプラグインの
  `__init__.py` と同じ取り決めです。

これらのエントリポイントを見つけるのは `providers/__init__.py` 自身です。汎用の
`PluginManager` は pip パッケージのプロバイダ登録を呼び出しません（そちらの
エントリポイントの経路は `register(ctx)` 形式の汎用プラグインが対象で、
`plugins.enabled` で管理されています）。そのためプロバイダの登録簿は自前で探します。
ここには2つの決まりがあります。

- **明示的に有効にする必要があります。** この探索も `config.yaml` の
  `plugins.enabled` という許可リスト（および `plugins.disabled` の拒否リスト）に従います。
  導入されているというだけで pip パッケージが読み込まれることはありません。
  エントリポイントの名前を `plugins.enabled` に足す必要があります。

  ```yaml
  plugins:
    enabled:
      - acme-inference
  ```

- **優先度は最も低くなります。** エントリポイントのプラグインは、ファイルシステム上の
  プラグインより**先に**見つかります。`register_provider()` は最後に書いたものが勝つので、
  同じ名前の同梱プロファイルや `$HERMES_HOME` のプロファイルがあれば、
  pip で入れたものより必ず優先されます。pip パッケージは本当に新しいプロバイダを
  足すことはできますが、公式のプロバイダ名を黙って乗っ取ることはできません。

引数を要求する指し先（汎用プラグインの `register(ctx)`）は、プロバイダの探索では
飛ばされます。そちらは `PluginManager` の担当だからです。壊れたエントリポイントは
切り離され、警告として記録されて飛ばされます。ほかのプロバイダが見つからなくなることは
ありません。

エントリポイントの設定の全体は [Hermes のプラグインを作る](/hermes/docs/developer-guide/plugins/#distribute-via-pip) を見てください。

## 関連するページ {#related-pages}

- [プロバイダの実行時解決](/hermes/docs/developer-guide/provider-runtime/) — 解決の優先順位と、どの層がプロファイルのどこを読むか
- [プロバイダを追加する](/hermes/docs/developer-guide/adding-providers/) — 新しい推論バックエンドを足すときの通しの手順（手軽なプラグインの道と、CLI や認証まで含めた作り込みの両方）
- [メモリプロバイダのプラグイン](/hermes/docs/developer-guide/memory-provider-plugin/)
- [コンテキストエンジンのプラグイン](/hermes/docs/developer-guide/context-engine-plugin/)
- [Hermes のプラグインを作る](/hermes/docs/developer-guide/plugins/) — プラグイン全般の作り方
