---
title: "ウェブ検索プロバイダプラグイン"
description: "Hermes Agent 向けのウェブ検索・本文抽出・クロールのバックエンドプラグインを作る方法"
upstream_path: developer-guide/web-search-provider-plugin.md
upstream_blob: 4f880866c69966b6569c9365b665d700ec5d15c3
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/web-search-provider-plugin
---

# ウェブ検索プロバイダプラグインを作る {#building-a-web-search-provider-plugin}

ウェブ検索プロバイダプラグインは、`web_search` と `web_extract`、そして必要ならページを深くたどるクロールのツール呼び出しを引き受けるバックエンドを登録します。組み込みのプロバイダ（Firecrawl、SearXNG、Tavily、Exa、Parallel、Brave Search の無料枠、xAI、DDGS）は、いずれも `plugins/web/<name>/` にプラグインとして同梱されています。新しいものを足したい場合も、同梱のものを差し替えたい場合も、その隣にディレクトリを 1 つ置くだけです。

:::tip
ウェブ検索は、Hermes が扱う**バックエンドプラグイン**のうちの 1 つです。ほかにもそれぞれ専用の抽象基底クラスを持つものとして、[画像生成プロバイダプラグイン](/hermes/docs/developer-guide/image-gen-provider-plugin/)、[動画生成プロバイダプラグイン](/hermes/docs/developer-guide/video-gen-provider-plugin/)、[メモリプロバイダプラグイン](/hermes/docs/developer-guide/memory-provider-plugin/)、[コンテキストエンジンプラグイン](/hermes/docs/developer-guide/context-engine-plugin/)、[モデルプロバイダプラグイン](/hermes/docs/developer-guide/model-provider-plugin/) があります。一般のツール・フック・CLI のプラグインについては [Hermes プラグインを作る](/hermes/docs/developer-guide/plugins/) を参照してください。
:::

## 見つけ方 {#how-discovery-works}

Hermes はウェブ検索のバックエンドを次の 3 か所から探します。

1. **同梱** — `<repo>/plugins/web/<name>/`（`kind: backend` として自動で読み込まれ、いつでも使えます）
2. **ユーザー** — `~/.hermes/plugins/web/<name>/`（`plugins.enabled` か `hermes plugins enable <name>` で自分から有効にします）
3. **Pip** — `hermes_agent.plugins` のエントリポイントを宣言したパッケージ

各プラグインの `register(ctx)` 関数が `ctx.register_web_search_provider(...)` を呼び、そのインスタンスが `agent/web_search_registry.py` の登録簿に入ります。どの機能にどのプロバイダを使うかは設定で決まります。

| 機能 | 設定キー | 未設定なら |
|---|---|---|
| `web_search` | `web.search_backend` | `web.backend` |
| `web_extract` | `web.extract_backend` | `web.backend` |
| `web_extract` の中で動く深いクロール | `web.extract_backend` | `web.backend` |

どちらのキーも設定していないときは、環境にある API キーや URL を手がかりに Hermes がバックエンドを自動で判断します。`hermes tools` から選ぶこともできます。

## ディレクトリ構成 {#directory-structure}

```
plugins/web/my-backend/
├── __init__.py     # register() entry point
├── provider.py     # WebSearchProvider subclass
└── plugin.yaml     # Manifest with kind: backend and provides_web_providers
```

ツリー内でいちばん小さいお手本は `brave_free/` と `ddgs/` です。`brave_free` は API キーが要る検索専用のプロバイダ、`ddgs` はキーが要らず、SDK を必要になってから入れるプロバイダです。

## WebSearchProvider の抽象基底クラス {#the-websearchprovider-abc}

`agent.web_search_provider.WebSearchProvider` を継承します。必ず用意するのは `name` と `is_available()`、それに `search()` / `extract()` のうち実装する側だけです。（深いクロールは別のメソッドではなく、`extract()` の 1 つのモードです。）

```python
# plugins/web/my-backend/provider.py
from __future__ import annotations

from typing import Any, Dict, List

from agent.web_search_provider import WebSearchProvider

class MyBackendWebSearchProvider(WebSearchProvider):
    """Minimal search-only provider against the My Backend HTTP API."""

    @property
    def name(self) -> str:
        # Stable id used in web.search_backend / web.extract_backend / web.backend
        # config keys. Lowercase, no spaces; hyphens permitted.
        return "my-backend"

    @property
    def display_name(self) -> str:
        # Human label shown in `hermes tools`. Defaults to `name`.
        return "My Backend"

    def is_available(self) -> bool:
        # Cheap check — env var present, optional dep importable, etc.
        # MUST NOT make network calls (runs on every `hermes tools` paint).
        return bool(os.getenv("MY_BACKEND_API_KEY", "").strip())

    def supports_search(self) -> bool:
        return True

    def supports_extract(self) -> bool:
        return False

    def search(self, query: str, limit: int = 5) -> Dict[str, Any]:
        import httpx

        api_key = os.environ["MY_BACKEND_API_KEY"]
        try:
            resp = httpx.get(
                "https://api.example.com/search",
                params={"q": query, "count": max(1, min(int(limit), 20))},
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()
        except httpx.HTTPError as exc:
            return {"success": False, "error": str(exc)}

        # Response shape is fixed — see "Response shape" below.
        return {
            "success": True,
            "data": {
                "web": [
                    {
                        "title": item.get("title", ""),
                        "url": item.get("url", ""),
                        "description": item.get("snippet", ""),
                        "position": idx + 1,
                    }
                    for idx, item in enumerate(data.get("results", []))
                ],
            },
        }
```

```python
# plugins/web/my-backend/__init__.py
from plugins.web.my_backend.provider import MyBackendWebSearchProvider

def register(ctx) -> None:
    """Plugin entry point — called once at load time."""
    ctx.register_web_search_provider(MyBackendWebSearchProvider())
```

## plugin.yaml {#pluginyaml}

```yaml
name: web-my-backend
version: 1.0.0
description: "My Backend web search — Bearer-auth REST API"
author: Your Name
kind: backend
provides_web_providers:
  - my-backend
requires_env:
  - MY_BACKEND_API_KEY
```

| キー | 役割 |
|---|---|
| `kind: backend` | このプラグインをバックエンドの読み込み経路に通します |
| `provides_web_providers` | このプラグインが登録するプロバイダの `name` の一覧です。`register()` が動く前でも `hermes tools` にこのプラグインを載せるために、読み込み側が使います |
| `requires_env` | `hermes plugins install` のときに、認証情報を対話で聞きます（細かい書き方は [Hermes プラグインを作る](/hermes/docs/developer-guide/plugins/#gate-on-environment-variables) を参照してください） |

## 抽象基底クラスの一覧 {#abc-reference}

決まりごとの全体は `agent/web_search_provider.py` にあります。上書きできるメソッドは次のとおりです。

| メンバー | 必須 | 既定 | 役割 |
|---|---|---|---|
| `name` | ✅ | — | `web.*_backend` の設定で使う、変わらない ID |
| `display_name` | — | `name` | `hermes tools` に表示される名前 |
| `is_available()` | ✅ | — | 環境変数や任意の依存パッケージを見て、使えるかを軽く確かめます |
| `supports_search()` | — | `True` | `web_search` の振り分けに使う対応フラグ |
| `supports_extract()` | — | `False` | `web_extract` の振り分けに使う対応フラグ |
| `search(query, limit)` | 条件つき | 例外を投げます | `supports_search()` が `True` を返すなら必要です |
| `extract(urls, **kwargs)` | 条件つき | 例外を投げます | `supports_extract()` が `True` を返すなら必要です |

1 つのクラスで複数の機能に対応させることもできます。Firecrawl、Tavily、Exa、Parallel はいずれも検索と本文抽出の両方を実装しています。Brave Search と DDGS は検索専用です。SearXNG も検索専用で、本文抽出のプロバイダと組み合わせて使う手順が用意されています。

## 返す形 {#response-shape}

ツール側でバックエンドごとの差を吸収しなくて済むよう、返す形は決まっています。

**検索が成功したとき:**

```python
{
    "success": True,
    "data": {
        "web": [
            {"title": str, "url": str, "description": str, "position": int},
            ...
        ],
    },
}
```

**本文抽出が成功したとき:**

```python
{
    "success": True,
    "data": [
        {
            "url": str,
            "title": str,
            "content": str,
            "raw_content": str,
            "metadata": dict,    # optional
            "error": str,        # optional, only on per-URL failure
        },
        ...
    ],
}
```

**どちらの機能でも、失敗したとき:**

```python
{"success": False, "error": "human-readable message"}
```

`search()` と `extract()` はどちらも `async def` にできます。呼び出し側は `inspect.iscoroutinefunction` でコルーチンかどうかを見分けて、必要なら await します。小さなバックエンドなら、同期のまま HTTP や SDK の呼び出しでブロックしてもかまいません。スレッドの扱いは呼び出し側が引き受けます。

## 対応フラグ {#capability-flags}

Hermes は `supports_*` のフラグを見て、呼び出しを適切なプロバイダへ振り分けます。複数のプロバイダを組み合わせる設定はたとえばこうなります。

```yaml
# ~/.hermes/config.yaml
web:
  search_backend: "brave-free"     # search-only, fast, free 2k/mo
  extract_backend: "firecrawl"     # extract + crawl, paid quota
```

`web.search_backend` や `web.extract_backend` を設定していないときは、どちらも `web.backend` を見ます。それも未設定なら、環境変数の有無をもとに、求められた機能に対応した最初のプロバイダを Hermes が選びます。

自分のプロバイダが片方の機能にしか対応しないなら、もう片方のフラグは既定の `False` のままにしておいてください。そうすれば、そのツールのときは登録簿がこのプロバイダを外してくれます。検索にだけ X を使っている利用者が本文抽出を頼んだときに、「プロバイダ X が失敗しました」という紛らわしいエラーを見ずに済みます。

## ツールとのつながり方 {#how-hermes-wires-it-into-the-tools}

`web_search` と `web_extract` のツールは `tools/web_tools.py` にあります。呼び出されると次のように動きます。

1. 該当する設定キーを読みます（`web_search` なら `web.search_backend`、`web_extract` なら `web.extract_backend`）
2. その `name` を持つプロバイダを登録簿に問い合わせます
3. `is_available()` と、対応する `supports_*()` のフラグを確かめます
4. `search()` / `extract()` を呼びます（深いクロールは `extract()` の中のモードとして動きます）。コルーチンなら await します
5. 返ってきた形を JSON にして LLM へ渡します

エラーはツールの結果としてそのまま出てきて、どう説明するかは LLM が決めます。プロバイダが 1 つも登録されていないとき（あるいは使えるものがすべて対応フラグで外れたとき）は、`hermes tools` を案内するエラーが返ります。

## 任意の依存パッケージを必要になってから入れる {#lazy-installing-optional-dependencies}

DDGS が `ddgs` パッケージを使っているように、第三者の SDK を包むプロバイダを書くときは、モジュールの先頭で `import` しないでください。`is_available()` や `search()` の中で `tools.lazy_deps.ensure(...)` を使えば、最初に使うときに Hermes がパッケージを入れます。この動きは `security.allow_lazy_installs` で制御されます。安全面の考え方は [Hermes プラグインを作る → 必要になってから入れる](/hermes/docs/developer-guide/plugins/#lazy-install-optional-python-dependencies) を参照してください。

## お手本になる実装 {#reference-implementations}

- **`plugins/web/brave_free/`** — API キーが要る、小さな検索専用の HTTP プロバイダです。書き始めの下敷きに向いています。
- **`plugins/web/ddgs/`** — キーが要らず、SDK を必要になってから入れるプロバイダです。Python のパッケージを包むバックエンドのお手本になります。
- **`plugins/web/firecrawl/`** — 検索・本文抽出・クロールのすべてに対応し、出力の形式も複数持つプロバイダです。
- **`plugins/web/searxng/`** — 自分で立てたサーバーを URL で指定する、認証なしのバックエンドです。
- **`plugins/web/xai/`** — Grok のサーバー側 `web_search` ツールを使う、LLM を通した検索です。すでにある OAuth や環境変数の仕組み（`tools/xai_http.py`）を、新しい環境変数を増やさずに再利用する書き方と、通信をしないという約束を守った軽い `is_available()` の書き方が分かります。

## pip で配る {#distribute-via-pip}

```toml
# pyproject.toml
[project.entry-points."hermes_agent.plugins"]
my-backend-web = "my_backend_web_package"
```

`my_backend_web_package` は、トップレベルに `register` 関数を持たせてください。手順の全体は、一般のプラグインの案内にある [pip で配る](/hermes/docs/developer-guide/plugins/#distribute-via-pip) を参照してください。

## 関連ページ {#related-pages}

- [ウェブ検索](/hermes/docs/user-guide/features/web-search/) — 利用者向けの機能説明と、バックエンドごとの設定
- [プラグインの概要](/hermes/docs/user-guide/features/plugins/) — プラグインの種類を一覧で見る
- [Hermes プラグインを作る](/hermes/docs/developer-guide/plugins/) — 一般のツール・フック・スラッシュコマンドの案内
