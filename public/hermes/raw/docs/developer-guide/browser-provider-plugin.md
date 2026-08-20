---
title: "ブラウザプロバイダプラグイン"
description: "Hermes Agent 向けのクラウドブラウザバックエンドプラグインを作る方法"
upstream_path: developer-guide/browser-provider-plugin.md
upstream_blob: 0f71b1684feb27c6244880bd3f1ca09b6c5ed501
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/browser-provider-plugin
---

# ブラウザプロバイダプラグインを作る {#building-a-browser-provider-plugin}

ブラウザプロバイダプラグインは、クラウドモードの `browser_*` ツール呼び出し（ページを開く、クリックする、画面を撮る、など）を引き受ける**クラウドブラウザのバックエンド**を登録します。組み込みのプロバイダ（Browserbase、Browser Use、Firecrawl）は、いずれも `plugins/browser/<name>/` にプラグインとして同梱されています。新しいものを足したい場合も、同梱のものを差し替えたい場合も、その隣にディレクトリを 1 つ置くだけです。

:::tip
ブラウザのバックエンドは、Hermes が扱う**バックエンドプラグイン**のうちの 1 つです。ほかにもそれぞれ専用の抽象基底クラスを持つものとして、[ウェブ検索プロバイダプラグイン](/hermes/docs/developer-guide/web-search-provider-plugin/)（この抽象基底クラスは、あえてそれに合わせた形にしています）、[画像生成](/hermes/docs/developer-guide/image-gen-provider-plugin/)、[動画生成](/hermes/docs/developer-guide/video-gen-provider-plugin/)、[メモリプロバイダ](/hermes/docs/developer-guide/memory-provider-plugin/)、[コンテキストエンジン](/hermes/docs/developer-guide/context-engine-plugin/)、[シークレットソース](/hermes/docs/developer-guide/secret-source-plugin/)、[モデルプロバイダ](/hermes/docs/developer-guide/model-provider-plugin/) があります。一般のツール・フック・CLI のプラグインについては [Hermes プラグインを作る](/hermes/docs/developer-guide/plugins/) を参照してください。
:::

## どうつながっているか {#how-it-fits-together}

ブラウザプロバイダは、ブラウザの操作そのものを実装するわけでは**ありません**。実装するのは**セッションの出し入れ**です。遠隔のブラウザセッションを作り、CDP の websocket URL を返し、終わったらセッションを片付けます。ページを実際に動かすのは Hermes 自身のブラウザまわり（`agent-browser` と `tools/browser_tool.py`）で、返ってきた CDP の URL につないで操作します。そのため、どのプロバイダでも `browser_*` のツール一式がそのまま使えます。

どのプロバイダを使うかは `config.yaml` の `browser.cloud_provider` で決まります。`tools/browser_tool.py` の振り分けは登録簿を引くだけで、プロバイダごとの分岐は入っていません。

## 見つけ方 {#discovery}

Hermes はブラウザのバックエンドを次の 3 か所から探します。

1. **同梱** — `<repo>/plugins/browser/<name>/`（`kind: backend` として自動で読み込まれます）
2. **ユーザー** — `~/.hermes/plugins/browser/<name>/`（`plugins.enabled` か `hermes plugins enable <name>` で自分から有効にします）
3. **Pip** — `hermes_agent.plugins` のエントリポイントを宣言したパッケージ

各プラグインの `register(ctx)` が `ctx.register_browser_provider(...)` を呼び、そのインスタンスが `agent/browser_registry.py` の登録簿に入ります。

## ディレクトリ構成 {#directory-structure}

```
plugins/browser/my-backend/
├── __init__.py     # register() entry point
├── provider.py     # BrowserProvider subclass
└── plugin.yaml     # Manifest with kind: backend and provides_browser_providers
```

`plugin.yaml`:

```yaml
name: browser-my-backend
version: 1.0.0
description: "My cloud browser backend. Requires MY_BACKEND_API_KEY."
author: you
kind: backend
provides_browser_providers:
  - my-backend
```

`__init__.py`:

```python
from plugins.browser.my_backend.provider import MyBackendProvider

def register(ctx) -> None:
    ctx.register_browser_provider(MyBackendProvider())
```

## BrowserProvider の抽象基底クラス {#the-browserprovider-abc}

`agent.browser_provider.BrowserProvider` を実装します。名前まわりに加えて、セッションを扱うメソッドが 3 つです。

```python
from agent.browser_provider import BrowserProvider

class MyBackendProvider(BrowserProvider):
    @property
    def name(self) -> str:
        return "my-backend"          # the browser.cloud_provider config value

    @property
    def display_name(self) -> str:
        return "My Backend"          # shown in `hermes tools`

    def is_available(self) -> bool:
        """Cheap check only — env var present, dep importable.
        NO network calls: runs at tool-registration time and on every
        `hermes tools` paint."""
        return bool(os.environ.get("MY_BACKEND_API_KEY"))

    def create_session(self, task_id: str) -> dict:
        """Create a remote browser session; return the session-metadata contract."""
        session = my_api.create_browser(...)
        return {
            "session_name": f"my-backend-{task_id}",  # unique agent-browser session name
            "bb_session_id": session.id,              # provider session ID (for cleanup)
            "cdp_url": session.cdp_ws_url,            # CDP websocket URL
            "features": {"stealth": True},            # feature flags you enabled
        }

    def close_session(self, session_id: str) -> bool:
        """Terminate by provider session ID. Log-and-return-False on error —
        never raise, so the dispatcher's cleanup loop keeps moving."""
        ...

    def emergency_cleanup(self, session_id: str) -> None:
        """Best-effort teardown from atexit/signal handlers. Must not raise."""
        ...
```

### セッション情報の決まりごと {#the-session-metadata-contract}

`create_session()` は少なくとも `session_name`、`bb_session_id`、`cdp_url`、`features` を返す必要があります。知っておきたい癖が 2 つあります。

- **`bb_session_id` は昔の名残のキー名**で、`tools/browser_tool.py` との互換のためにそのまま残しています。どのベンダーを使っていても、ここに入るのは*自分の*プロバイダのセッション ID です。名前を変えないでください。
- `create_session()` は**例外を投げてかまいません**。認証情報が足りないときは `ValueError`、通信や API の失敗なら `RuntimeError` です。呼び出し側がそれを利用者に見せます。これは `close_session` や `emergency_cleanup` とは違う点で、あちらは決して例外を投げてはいけません。

`external_call_id` というキーを足すと、ゲートウェイ経由の課金に対応できます。

### `get_setup_schema()` — `hermes tools` の選択肢に出す {#getsetupschema-the-hermes-tools-picker-row}

これを実装しておくと、Browser Automation の選択肢に正式な項目として並び、API キーの入力欄やインストール時の処理も付けられます。

```python
def get_setup_schema(self) -> dict:
    return {
        "name": "My Backend",
        "badge": "paid",
        "tag": "Cloud browser with stealth and proxies",
        "env_vars": [
            {"key": "MY_BACKEND_API_KEY",
             "prompt": "My Backend API key",
             "url": "https://mybackend.example"},
        ],
        "post_setup": "agent_browser",   # ensures local Chromium is installed (agent-browser itself resolves via npx)
    }
```

このプロジェクトでは、ツールのバックエンドについて次の基準を置いています。`hermes tools` から選んで設定できないバックエンドは、まだ出来上がっていません。「環境変数を手で設定してください」では、組み込んだことになりません。

## 利用者側の設定 {#users-configure-it}

```yaml
browser:
  cloud_provider: my-backend
```

## お手本になる実装 {#reference-implementations}

`plugins/browser/` に同梱された 3 つのプロバイダが、そのままお手本になります。単純なものから順に、`firecrawl`（いちばん簡単）、`browser_use`、`browserbase`（ステルス・プロキシ・セッション維持のフラグを持ち、有料機能が使えないときは無理なく切り替えます）です。近いものを写して始めてください。

## 確認リスト {#checklist}

- [ ] `name` は小文字で、あとから変えない（利用者が設定に書く値です）
- [ ] `is_available()` は通信をいっさいしない
- [ ] `create_session()` が決まりどおりの情報を返す（`bb_session_id` というキー名はそのまま）
- [ ] `close_session()` と `emergency_cleanup()` は決して例外を投げない
- [ ] `get_setup_schema()` で環境変数を伝え、`hermes tools` から設定できるようにする
- [ ] `plugin.yaml` に `kind: backend` と `provides_browser_providers` を書く
