---
title: "Web 検索プロバイダのプラグイン"
description: "Hermes Agent 向けに Web 検索・抽出・クロールのバックエンドプラグインを作る方法"
upstream_path: developer-guide/web-search-provider-plugin.md
upstream_blob: 257df89548d2e1503f2747ebd5ec36253ef429fc
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/web-search-provider-plugin
---

# Web 検索プロバイダのプラグインを作る {#building-a-web-search-provider-plugin}

Web 検索プロバイダのプラグインは、`web_search`、`web_extract`、そして必要なら深いクロールのツール呼び出しを担当するバックエンドを登録します。組み込みのプロバイダ（Firecrawl、SearXNG、Tavily、Exa、Parallel、Keenable、Brave Search の無料枠、xAI、DDGS）はすべて `plugins/web/<name>/` の下にプラグインとして入っています。その隣にディレクトリを置くだけで、新しいものを足したり、同梱のものを差し替えたりできます。

:::tip
Web 検索は、Hermes が対応している **バックエンドプラグイン** のうちの 1 つです。それぞれ独自の ABC を持つ仲間として、[画像生成プロバイダのプラグイン](/hermes/docs/developer-guide/image-gen-provider-plugin/)、[動画生成プロバイダのプラグイン](/hermes/docs/developer-guide/video-gen-provider-plugin/)、[記憶プロバイダのプラグイン](/hermes/docs/developer-guide/memory-provider-plugin/)、[コンテキストエンジンのプラグイン](/hermes/docs/developer-guide/context-engine-plugin/)、[モデルプロバイダのプラグイン](/hermes/docs/developer-guide/model-provider-plugin/) があります。一般的なツール・フック・CLI のプラグインについては [Hermes のプラグインを作る](/hermes/docs/developer-guide/plugins/) を見てください。
:::

## 見つけ方の仕組み {#how-discovery-works}

Hermes は次の 3 か所で Web 検索のバックエンドを探します。

1. **同梱** — `<repo>/plugins/web/<name>/`（`kind: backend` として自動で読み込まれ、常に使えます）
2. **ユーザー** — `~/.hermes/plugins/web/<name>/`（`plugins.enabled` か `hermes plugins enable <name>` で自分で有効にします）
3. **pip** — `hermes_agent.plugins` のエントリーポイントを宣言しているパッケージ

各プラグインの `register(ctx)` 関数が `ctx.register_web_search_provider(...)` を呼ぶと、そのインスタンスが `agent/web_search_registry.py` のレジストリに入ります。機能ごとにどのプロバイダを使うかは設定で決まります。

| 機能 | 設定キー | 未設定なら参照するもの |
|---|---|---|
| `web_search` | `web.search_backend` | `web.backend` |
| `web_extract` | `web.extract_backend` | `web.backend` |
| `web_extract` の中の深いクロールのモード | `web.extract_backend` | `web.backend` |

どちらのキーも設定されていない場合、Hermes は環境にある API キーや URL からバックエンドを自動で判別します。`hermes tools` が選択の手順を案内してくれます。

## ディレクトリの構成 {#directory-structure}

```
plugins/web/my-backend/
├── __init__.py     # register() entry point
├── provider.py     # WebSearchProvider subclass
└── plugin.yaml     # Manifest with kind: backend and provides_web_providers
```

リポジトリ内で一番小さい参考例は `brave_free/` と `ddgs/` です。`brave_free` は API キーが要る検索専用のプロバイダ、`ddgs` はキーが要らず SDK を遅延インストールするプロバイダです。

## WebSearchProvider の ABC {#the-websearchprovider-abc}

`agent.web_search_provider.WebSearchProvider` を継承します。必ず用意しなければならないのは `name`、`is_available()`、そして実装するほうの `search()` / `extract()` だけです。（深いクロールは別のメソッドではなく、`extract()` のモードの 1 つです。）

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
| `kind: backend` | プラグインをバックエンド読み込みの経路に回します |
| `provides_web_providers` | このプラグインが登録するプロバイダの `name` の一覧です。`register()` が走る前でも `hermes tools` にプラグインを載せるために、ローダーがこれを使います |
| `requires_env` | `hermes plugins install` の途中で、認証情報を対話的に尋ねます（詳しい書き方は [Hermes のプラグインを作る](/hermes/docs/developer-guide/plugins/#gate-on-environment-variables) を見てください） |

## ABC の一覧 {#abc-reference}

取り決めの全文は `agent/web_search_provider.py` にあります。上書きできるメソッドは次のとおりです。

| メンバー | 必須 | 既定 | 役割 |
|---|---|---|---|
| `name` | ✅ | — | `web.*_backend` の設定で使う、変わらない ID |
| `display_name` | — | `name` | `hermes tools` に表示される名前 |
| `is_available()` | ✅ | — | 環境変数や任意の依存パッケージを見る、軽い利用可否の判定 |
| `supports_search()` | — | `True` | `web_search` を振り分けるための機能フラグ |
| `supports_extract()` | — | `False` | `web_extract` を振り分けるための機能フラグ |
| `search(query, limit)` | 条件付き | 例外を投げます | `supports_search()` が `True` を返すなら必須です |
| `extract(urls, **kwargs)` | 条件付き | 例外を投げます | `supports_extract()` が `True` を返すなら必須です |

プロバイダは 1 つのクラスで複数の機能を名乗れます。Firecrawl、Tavily、Keenable、Exa、Parallel はどれも検索と抽出の両方を実装しています。Brave Search と DDGS は検索専用です。SearXNG も検索専用で、「抽出のプロバイダと組み合わせて使う」という進め方がドキュメントに書かれています。

## 応答の形 {#response-shape}

ツール側のラッパーは、バックエンドごとの違いを吸収せずに済むよう、決まった形の入れ物を期待します。

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

`search()` と `extract()` はどちらも `async def` にできます。ディスパッチャが `inspect.iscoroutinefunction` でコルーチン関数かどうかを見分け、必要なら await します。ブロッキングする I/O（HTTP や SDK の呼び出し）を行う同期の実装でも、小さなバックエンドなら問題ありません。スレッドの扱いはディスパッチャが引き受けます。

## 機能フラグ {#capability-flags}

Hermes は `supports_*` のフラグを見て、呼び出しを適切なプロバイダへ振り分けます。複数のプロバイダを組み合わせるよくある構成は次のとおりです。

```yaml
# ~/.hermes/config.yaml
web:
  search_backend: "brave-free"     # search-only, fast, free 2k/mo
  extract_backend: "firecrawl"     # extract + crawl, paid quota
```

`web.search_backend` や `web.extract_backend` を設定していない場合、どちらも `web.backend` に落ちます。それも未設定なら、Hermes は環境変数の有無を見て、求められた機能に対応している最初のプロバイダを選びます。

作ったプロバイダが片方の機能にしか対応していないなら、もう片方のフラグは既定（`False`）のままにしてください。そうすればレジストリはそのツールの候補からそのプロバイダを外します。検索にだけ X を使っているユーザーがエージェントに抽出を頼んだとき、「プロバイダ X が失敗しました」という紛らわしいエラーを見せずに済みます。

## Hermes がツールにつなぐ流れ {#how-hermes-wires-it-into-the-tools}

`web_search` と `web_extract` のツールは `tools/web_tools.py` にあります。呼び出し時にこう動きます。

1. 該当する設定キーを読みます（`web_search` なら `web.search_backend`、`web_extract` なら `web.extract_backend`）
2. その `name` を持つプロバイダをレジストリに問い合わせます
3. `is_available()` と、対応する `supports_*()` のフラグを確認します
4. `search()` / `extract()` を呼びます（深いクロールは `extract()` の中のモードとして動きます）。メソッドがコルーチンなら await します
5. 応答の入れ物を JSON にして LLM へ返します

エラーはツールの結果として表に出て、それをどう説明するかは LLM が決めます。プロバイダが 1 つも登録されていない場合（または使えるものがすべて機能の条件を満たさない場合）、ツールは `hermes tools` を案内する分かりやすいエラーを返します。

## 任意の依存パッケージを遅延インストールする {#lazy-installing-optional-dependencies}

DDGS が `ddgs` パッケージに対してそうしているように、プロバイダがサードパーティの SDK を包む場合は、モジュールの先頭で `import` しないでください。`is_available()` や `search()` の中で `tools.lazy_deps.ensure(...)` を使えば、Hermes が最初の利用時にパッケージを入れます。この動きは `security.allow_lazy_installs` で制御されます。安全性の考え方は [Hermes のプラグインを作る → 遅延インストール](/hermes/docs/developer-guide/plugins/#lazy-install-optional-python-dependencies) を見てください。

## 参考になる実装 {#reference-implementations}

- **`plugins/web/brave_free/`** — 小さく、API キーが要る、検索専用の HTTP プロバイダです。出発点のひな形に向いています。
- **`plugins/web/ddgs/`** — キーが要らず、SDK を遅延インストールするプロバイダです。Python のパッケージを包むバックエンドで参考になります。
- **`plugins/web/firecrawl/`** — 複数の機能をひととおり備えたプロバイダ（検索 + 抽出 + クロール）で、出力形式のモードも複数あります。
- **`plugins/web/searxng/`** — 自分で立てて URL で設定する、認証なしのバックエンドです。
- **`plugins/web/xai/`** — Grok のサーバー側の `web_search` ツールを使った、LLM を土台にした検索です。新しい環境変数を足さずに既存の OAuth・環境変数の認証まわり（`tools/xai_http.py`）を再利用する方法と、ネットワークを使わないという取り決めを守った軽い `is_available()` の書き方を示しています。

## pip で配布する {#distribute-via-pip}

```toml
# pyproject.toml
[project.entry-points."hermes_agent.plugins"]
my-backend-web = "my_backend_web_package"
```

`my_backend_web_package` はトップレベルに `register` 関数を用意する必要があります。ひととおりの手順は、一般的なプラグインの手引きの [pip で配布する](/hermes/docs/developer-guide/plugins/#distribute-via-pip) を見てください。

## 関連ページ {#related-pages}

- [Web 検索](/hermes/docs/user-guide/features/web-search/) — 使う側から見た機能の説明と、バックエンドごとの設定
- [プラグインの概要](/hermes/docs/user-guide/features/plugins/) — プラグインの種類をひととおり
- [Hermes のプラグインを作る](/hermes/docs/developer-guide/plugins/) — 一般的なツール・フック・スラッシュコマンドの手引き
