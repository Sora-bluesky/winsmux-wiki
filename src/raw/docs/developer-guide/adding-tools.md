---
title: "ツールを追加する"
description: "Hermes Agent に新しいツールを追加する方法 — スキーマ、ハンドラー、登録、ツールセット"
upstream_path: developer-guide/adding-tools.md
upstream_blob: 2219d738010c02e2aff9771643e753056bfd79cf
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/adding-tools
---

# ツールを追加する {#adding-tools}

ツールを書き始める前に、一度立ち止まって考えてみてください。**それは[スキル](/hermes/docs/developer-guide/creating-skills/)で足りるものではありませんか？**

:::warning 組み込みのコアツール専用
このページは、リポジトリそのものに**組み込みの Hermes ツール**を追加するための説明です。
個人用・プロジェクト限定・その他の独自ツールを、Hermes 本体に手を入れずに用意したい場合は、
プラグインの経路を使ってください。

- [プラグイン](/hermes/docs/user-guide/features/plugins/)
- [Hermes プラグインを作る](/hermes/docs/developer-guide/plugins/)

独自ツールを作るときは、まずプラグインを選んでください。新しい組み込みツールを `tools/` と
`toolsets.py` に載せて配布したいと自分で決めているときだけ、このページの手順に進みます。
:::

指示とシェルコマンドと既存のツールの組み合わせで表現できる機能なら、**スキル**にします（arXiv 検索、git の作業手順、Docker の管理、PDF の処理など）。

API キーを使った端から端までの連携、独自の処理ロジック、バイナリデータの取り扱い、ストリーミングが必要なら、**ツール**にします（ブラウザ操作、音声合成、画像の解析など）。

## 全体像 {#overview}

ツールを 1 つ追加すると、触るファイルは**2 つ**です。

1. **`tools/your_tool.py`** — ハンドラー、スキーマ、利用可否のチェック関数、`registry.register()` の呼び出し
2. **`toolsets.py`** — ツール名を `_HERMES_CORE_TOOLS`（または個別のツールセット）に追加する

`tools/*.py` のうち、トップレベルで `registry.register()` を呼んでいるファイルは起動時に自動で見つかります。読み込むファイルの一覧を手で管理する必要はありません。

## ステップ 1: 組み込みツールのファイルを作る {#step-1-create-the-built-in-tool-file}

ツールのファイルは、どれも同じ形をしています。

```python
# tools/weather_tool.py
"""Weather Tool -- look up current weather for a location."""

logger = logging.getLogger(__name__)

# --- Availability check ---

def check_weather_requirements() -> bool:
    """Return True if the tool's dependencies are available."""
    return bool(os.getenv("WEATHER_API_KEY"))

# --- Handler ---

def weather_tool(location: str, units: str = "metric") -> str:
    """Fetch weather for a location. Returns JSON string."""
    api_key = os.getenv("WEATHER_API_KEY")
    if not api_key:
        return json.dumps({"error": "WEATHER_API_KEY not configured"})
    try:
        # ... call weather API ...
        return json.dumps({"location": location, "temp": 22, "units": units})
    except Exception as e:
        return json.dumps({"error": str(e)})

# --- Schema ---

WEATHER_SCHEMA = {
    "name": "weather",
    "description": "Get current weather for a location.",
    "parameters": {
        "type": "object",
        "properties": {
            "location": {
                "type": "string",
                "description": "City name or coordinates (e.g. 'London' or '51.5,-0.1')"
            },
            "units": {
                "type": "string",
                "enum": ["metric", "imperial"],
                "description": "Temperature units (default: metric)",
                "default": "metric"
            }
        },
        "required": ["location"]
    }
}

# --- Registration ---

from tools.registry import registry

registry.register(
    name="weather",
    toolset="weather",
    schema=WEATHER_SCHEMA,
    handler=lambda args, **kw: weather_tool(
        location=args.get("location", ""),
        units=args.get("units", "metric")),
    check_fn=check_weather_requirements,
    requires_env=["WEATHER_API_KEY"],
)
```

### 守るべき決まり {#key-rules}

:::danger 重要
- ハンドラーは `json.dumps()` を通した JSON 文字列を返さ**なければなりません**。dict をそのまま返してはいけません
- エラーは `{"error": "message"}` の形で返さ**なければなりません**。例外として送出してはいけません
- `check_fn` はツール定義を組み立てるときに呼ばれます。`False` を返すと、そのツールは何も表示せずに除外されます
- `handler` は `(args: dict, **kwargs)` を受け取ります。`args` には LLM がツール呼び出しに渡した引数が入っています
:::

## ステップ 2: 組み込みツールをツールセットに追加する {#step-2-add-the-built-in-tool-to-a-toolset}

`toolsets.py` に、ツール名を書き足します。

```python
# If it should be available on all platforms (CLI + messaging):
_HERMES_CORE_TOOLS = [
    ...
    "weather",  # <-- add here
]

# Or create a new standalone toolset:
"weather": {
    "description": "Weather lookup tools",
    "tools": ["weather"],
    "includes": []
},
```

## ~~ステップ 3: 読み込み用の import を書く~~（現在は不要） {#step-3-add-discovery-import-no-longer-needed}

トップレベルで `registry.register()` を呼んでいるツールのモジュールは、`tools/registry.py` の `discover_builtin_tools()` が自動で見つけます。import の一覧を手入れする必要はありません。`tools/` にファイルを置けば、起動時にそのまま拾われます。

## 非同期のハンドラー {#async-handlers}

ハンドラーの中で非同期のコードを動かしたいときは、`is_async=True` を付けます。

```python
async def weather_tool_async(location: str) -> str:
    async with aiohttp.ClientSession() as session:
        ...
    return json.dumps(result)

registry.register(
    name="weather",
    toolset="weather",
    schema=WEATHER_SCHEMA,
    handler=lambda args, **kw: weather_tool_async(args.get("location", "")),
    check_fn=check_weather_requirements,
    is_async=True,  # registry calls _run_async() automatically
)
```

同期と非同期の橋渡しはレジストリ側が引き受けます。自分で `asyncio.run()` を呼ぶ場面はありません。

## task_id が必要なハンドラー {#handlers-that-need-taskid}

セッションごとの状態を扱うツールには、`task_id` が `**kwargs` 経由で渡ってきます。

```python
def _handle_weather(args, **kw):
    task_id = kw.get("task_id")
    return weather_tool(args.get("location", ""), task_id=task_id)

registry.register(
    name="weather",
    ...
    handler=_handle_weather,
)
```

## エージェントループが横取りするツール {#agent-loop-intercepted-tools}

一部のツール（`todo`、`memory`、`session_search`、`delegate_task`）は、セッションごとのエージェントの状態にアクセスする必要があります。これらはレジストリに届く前に、エージェントループ（`agent/tool_executor.py`。`agent/conversation_loop.py` から呼ばれます）が横取りします。スキーマ自体はレジストリが持ったままですが、この横取りを通らずに来た場合、`dispatch()` は予備のエラーを返します。

## 任意: セットアップウィザードへの組み込み {#optional-setup-wizard-integration}

作ったツールに API キーが必要なら、`hermes_cli/config.py` に書き足します。

```python
OPTIONAL_ENV_VARS = {
    ...
    "WEATHER_API_KEY": {
        "description": "Weather API key for weather lookup",
        "prompt": "Weather API key",
        "url": "https://weatherapi.com/",
        "tools": ["weather"],
        "password": True,
    },
}
```

## チェックリスト {#checklist}

- [ ] ハンドラー、スキーマ、チェック関数、登録処理を書いたツールのファイルを作った
- [ ] `toolsets.py` の適切なツールセットに追加した
- [ ] プラグインではなく組み込みのコアツールにすべきものか、あらためて確かめた
- [ ] ハンドラーが JSON 文字列を返し、エラーは `{"error": "..."}` で返っている
- [ ] 任意: `hermes_cli/config.py` の `OPTIONAL_ENV_VARS` に API キーを追加した
- [ ] 任意: 一括処理のために `toolset_distributions.py` に追加した
- [ ] `hermes chat -q "Use the weather tool for London"` で動かして確かめた
