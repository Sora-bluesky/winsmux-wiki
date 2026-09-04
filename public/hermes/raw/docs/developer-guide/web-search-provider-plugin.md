---
title: "ウェブ検索プロバイダのプラグイン"
description: "Hermes Agent 向けに、ウェブ検索・本文抽出・巡回のバックエンドとなるプラグインを作る方法"
upstream_path: developer-guide/web-search-provider-plugin.md
upstream_blob: 2cce42ac6c3ab1f391f0049c2e35999de7750ff0
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/web-search-provider-plugin
---

# ウェブ検索プロバイダのプラグインを作る {#building-a-web-search-provider-plugin}

ウェブ検索プロバイダのプラグインは、`web_search`、`web_extract`、そして必要なら深い巡回のツール呼び出しを引き受けるバックエンドを登録します。組み込みのプロバイダ（Firecrawl、SearXNG、Tavily、Perplexity、Exa、Parallel、Keenable、Brave Search の無料枠、xAI、DDGS）は、すべて `plugins/web/<name>/` の下のプラグインとして同梱されています。その隣にディレクトリを置くだけで、新しいものを足したり、同梱のものを上書きしたりできます。

:::tip
ウェブ検索は、Hermes が対応する**バックエンドのプラグイン**のひとつです。ほかにも（それぞれ独自の抽象基底クラスを持つものとして）[画像生成プロバイダのプラグイン](/hermes/docs/developer-guide/image-gen-provider-plugin/)、[動画生成プロバイダのプラグイン](/hermes/docs/developer-guide/video-gen-provider-plugin/)、[メモリプロバイダのプラグイン](/hermes/docs/developer-guide/memory-provider-plugin/)、[コンテキストエンジンのプラグイン](/hermes/docs/developer-guide/context-engine-plugin/)、[モデルプロバイダのプラグイン](/hermes/docs/developer-guide/model-provider-plugin/)があります。一般的なツール・フック・CLI のプラグインについては [Hermes プラグインを作る](/hermes/docs/developer-guide/plugins/)をご覧ください。
:::

## 見つけ方の仕組み {#how-discovery-works}

Hermes は、ウェブ検索のバックエンドを 3 か所から探します。

1. **同梱** — `<repo>/plugins/web/<name>/`（`kind: backend` として自動で読み込まれ、常に使えます）
2. **利用者ごと** — `~/.hermes/plugins/web/<name>/`（`plugins.enabled` か `hermes plugins enable <name>` で自分で有効にします）
3. **pip** — `hermes_agent.plugins` のエントリポイントを宣言したパッケージ

各プラグインの `register(ctx)` 関数が `ctx.register_web_search_provider(...)` を呼ぶと、そのインスタンスが `agent/web_search_registry.py` の登録簿に入ります。どの機能にどのプロバイダを使うかは設定で決まります。

| 機能 | 設定キー | 未設定なら参照する先 |
|---|---|---|
| `web_search` | `web.search_backend` | `web.backend` |
| `web_extract` | `web.extract_backend` | `web.backend` |
| `web_extract` の中で動く深い巡回 | `web.extract_backend` | `web.backend` |

どちらのキーも設定されていない場合、Hermes は環境にある API キーや URL からバックエンドを自動で判定します。`hermes tools` を実行すれば、選ぶところまで案内してくれます。

## ディレクトリの構成 {#directory-structure}

```
plugins/web/my-backend/
├── __init__.py     # register() entry point
├── provider.py     # WebSearchProvider subclass
└── plugin.yaml     # Manifest with kind: backend and provides_web_providers
```

同梱のもので最も小さいお手本は `brave_free/` と `ddgs/` です。`brave_free` は API キーを要する検索専用のプロバイダ、`ddgs` はキー不要で SDK を必要になったときに入れるプロバイダです。

## WebSearchProvider の抽象基底クラス {#the-websearchprovider-abc}

`agent.web_search_provider.WebSearchProvider` を継承します。必ず用意するのは `name`、`is_available()`、それに実装するほうの `search()` か `extract()` だけです。（深い巡回は別のメソッドではなく、`extract()` の動作モードのひとつです。）

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
| `kind: backend` | プラグインをバックエンド読み込みの経路に載せます |
| `provides_web_providers` | このプラグインが登録するプロバイダの `name` の一覧です。`register()` が走る前でも `hermes tools` にプラグインを出せるよう、読み込み側が使います |
| `requires_env` | `hermes plugins install` の途中で、認証情報を対話的に尋ねます（詳しい書き方は [Hermes プラグインを作る](/hermes/docs/developer-guide/plugins/#gate-on-environment-variables)をご覧ください） |

## 抽象基底クラスの一覧 {#abc-reference}

契約の全体は `agent/web_search_provider.py` にあります。上書きできるメソッドは次のとおりです。

| メンバー | 必須 | 既定値 | 役割 |
|---|---|---|---|
| `name` | ✅ | — | `web.*_backend` の設定で使う、変わらない識別子 |
| `display_name` | — | `name` | `hermes tools` に出す表示名 |
| `is_available()` | ✅ | — | 使えるかどうかの軽い判定。環境変数や任意の依存の有無 |
| `supports_search()` | — | `True` | `web_search` の振り分けに使う対応機能のフラグ |
| `supports_extract()` | — | `False` | `web_extract` の振り分けに使う対応機能のフラグ |
| `search(query, limit)` | 条件付き | 例外を出す | `supports_search()` が `True` を返すなら必須 |
| `extract(urls, **kwargs)` | 条件付き | 例外を出す | `supports_extract()` が `True` を返すなら必須 |

1 つのクラスが複数の機能に対応してもかまいません。Firecrawl、Tavily、Perplexity、Keenable、Exa、Parallel は検索と抽出の両方を実装しています。Brave Search と DDGS は検索のみ、SearXNG も検索のみで、抽出用のプロバイダと組み合わせる使い方が案内されています。

## 返す値の形 {#response-shape}

ツール側の包み込みがバックエンドごとの違いを吸収せずに済むよう、返す値の外側の形は決まっています。

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

**抽出が成功したとき:**

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

`search()` と `extract()` はどちらも `async def` にできます。呼び出し側は `inspect.iscoroutinefunction` でコルーチン関数かどうかを見分け、必要なら await します。小さなバックエンドなら、同期の実装がブロックする入出力（HTTP や SDK の呼び出し）をしてもかまいません。スレッドの扱いは呼び出し側が引き受けます。

## 対応機能のフラグ {#capability-flags}

Hermes は `supports_*` のフラグを見て、呼び出しを適切なプロバイダへ振り分けます。複数のプロバイダを組み合わせる、よくある設定はこうです。

```yaml
# ~/.hermes/config.yaml
web:
  search_backend: "brave-free"     # search-only, fast, free 2k/mo
  extract_backend: "firecrawl"     # extract + crawl, paid quota
```

`web.search_backend` や `web.extract_backend` が設定されていない場合、どちらも `web.backend` を見にいきます。それも未設定なら、Hermes は環境変数の有無を手がかりに、求められた機能に対応していて使えるプロバイダのうち最初のものを選びます。

自分のプロバイダが片方の機能にしか対応しないなら、もう片方のフラグは既定の `False` のままにしておいてください。登録簿がそのツールでは対象外として扱うので、検索だけに使っているプロバイダに抽出を頼んで「プロバイダ X が失敗しました」という紛らわしいエラーを見せずに済みます。

## Hermes がツールにつなぐ流れ {#how-hermes-wires-it-into-the-tools}

`web_search` と `web_extract` のツールは `tools/web_tools.py` にあります。呼ばれたとき、次の順に進みます。

1. 対応する設定キーを読む（`web_search` なら `web.search_backend`、`web_extract` なら `web.extract_backend`）
2. その `name` を持つプロバイダを登録簿に問い合わせる
3. `is_available()` と、対応する `supports_*()` のフラグを確かめる
4. `search()` または `extract()` へ渡す（深い巡回は `extract()` の中のモードとして走ります）。メソッドがコルーチンなら await する
5. 返ってきた値を JSON にして LLM へ戻す

エラーはツールの結果としてそのまま表に出て、どう説明するかは LLM が決めます。プロバイダが 1 つも登録されていない場合（または使えるものがすべて機能の判定に落ちた場合）、ツールは `hermes tools` を案内するエラーを返します。

## 任意の依存を必要になってから入れる {#lazy-installing-optional-dependencies}

DDGS が `ddgs` パッケージを使うように、外部の SDK を包むプロバイダを書くときは、モジュールの先頭で `import` しないでください。`is_available()` や `search()` の中で `tools.lazy_deps.ensure(...)` を使えば、Hermes が最初に使うときにパッケージを入れます。動くかどうかは `security.allow_lazy_installs` で制御されます。安全上の考え方は [Hermes プラグインを作る → 必要になってから入れる](/hermes/docs/developer-guide/plugins/#lazy-install-optional-python-dependencies)をご覧ください。

## 手本になる実装 {#reference-implementations}

- **`plugins/web/brave_free/`** — 小さく、API キーを要する、検索専用の HTTP プロバイダ。出発点として最適です。
- **`plugins/web/ddgs/`** — キー不要で、SDK を必要になってから入れるプロバイダ。Python のパッケージを包むバックエンドの型として役立ちます。
- **`plugins/web/firecrawl/`** — 検索・抽出・巡回のすべてに対応し、出力形式のモードも複数持つプロバイダ。
- **`plugins/web/searxng/`** — 自分で立てたサーバーを URL で指す、認証なしのバックエンド。
- **`plugins/web/xai/`** — Grok のサーバー側 `web_search` ツールを使う、LLM 由来の検索。新しい環境変数を増やさずに既存の OAuth や環境変数の口（`tools/xai_http.py`）を使い回す書き方と、ネットワークに出ない約束を守る軽い `is_available()` の書き方が分かります。

## pip で配布する {#distribute-via-pip}

```toml
# pyproject.toml
[project.entry-points."hermes_agent.plugins"]
my-backend-web = "my_backend_web_package"
```

`my_backend_web_package` は、最上位に `register` 関数を公開している必要があります。設定の全体は、一般的なプラグインの案内にある [pip で配布する](/hermes/docs/developer-guide/plugins/#distribute-via-pip)をご覧ください。

## 関連するページ {#related-pages}

- [ウェブ検索](/hermes/docs/user-guide/features/web-search/) — 利用者向けの機能の説明と、バックエンドごとの設定
- [プラグインの概要](/hermes/docs/user-guide/features/plugins/) — プラグインの種類を一望する
- [Hermes プラグインを作る](/hermes/docs/developer-guide/plugins/) — 一般的なツール・フック・スラッシュコマンドの案内
