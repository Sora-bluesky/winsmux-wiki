---
title: "ツールの追加"
description: "Hermes Agent に新しいツールを追加する方法 — スキーマ、ハンドラ、登録、ツールセット"
upstream_path: developer-guide/adding-tools.md
upstream_blob: 975bdaca0603d6f961da0cbaff63f8a40f95ff00
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/adding-tools
---

# ツールの追加 {#adding-tools}

ツールを書き始める前に、いちど考えてみてください。**それは [スキル](/hermes/docs/developer-guide/creating-skills/) で足りませんか?**

:::warning 組み込みのコアツール専用です
このページは、リポジトリ本体に **Hermes の組み込みツール** を追加するためのものです。
Hermes の中核に手を入れずに、個人用・プロジェクト用・その他の独自ツールを
作りたい場合は、代わりにプラグインの方法を使ってください。

- [プラグイン](/hermes/docs/user-guide/features/plugins/)
- [Hermes プラグインを作る](/hermes/docs/developer-guide/plugins/)

独自のツールを作るときは、まずプラグインを検討してください。`tools/` と
`toolsets.py` に新しい組み込みツールを載せると決めたときだけ、このページに従ってください。
:::

指示とシェルコマンドと既存のツールの組み合わせで表せるなら、**スキル** にしてください（arXiv の検索、git の作業手順、Docker の管理、PDF の処理など）。

API キーを使った一連の連携、独自の処理、バイナリデータの扱い、逐次配信が必要なら、**ツール** にしてください（ブラウザの自動操作、音声合成、画像の解析など）。

## 全体像 {#overview}

ツールの追加で触るのは **2 つのファイル** です。

1. **`tools/your_tool.py`** — ハンドラ、スキーマ、利用可否の判定関数、`registry.register()` の呼び出し
2. **`toolsets.py`** — ツール名を `_HERMES_CORE_TOOLS`（または特定のツールセット）に追加

`tools/*.py` のうち、トップレベルで `registry.register()` を呼んでいるファイルは起動時に自動で見つかります。import の一覧を手で管理する必要はありません。

## 手順 1: 組み込みツールのファイルを作る {#step-1-create-the-built-in-tool-file}

ツールのファイルは、どれも同じ構成です。

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
- ハンドラは **必ず** JSON 文字列を返してください（`json.dumps()` を使います）。生の辞書を返してはいけません
- エラーは **必ず** `{"error": "message"}` の形で返してください。例外として投げてはいけません
- `check_fn` はツールの定義を組み立てるときに呼ばれます。`False` を返すと、そのツールは黙って外されます
- `handler` は `(args: dict, **kwargs)` を受け取ります。`args` には LLM がツールを呼ぶときに渡した引数が入ります
:::

## 手順 2: 組み込みツールをツールセットに追加する {#step-2-add-the-built-in-tool-to-a-toolset}

`toolsets.py` にツール名を追加します。

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

## ~~手順 3: 検出用の import を追加する~~（不要になりました） {#step-3-add-discovery-import-no-longer-needed}

トップレベルで `registry.register()` を呼んでいるツールのモジュールは、`tools/registry.py` の `discover_builtin_tools()` が自動で見つけます。import の一覧を保守する必要はありません。`tools/` にファイルを作れば、起動時に拾われます。

## 非同期のハンドラ {#async-handlers}

ハンドラで非同期の処理が必要なら、`is_async=True` を指定します。

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

非同期の橋渡しはレジストリが引き受けます。自分で `asyncio.run()` を呼ぶことはありません。

## task_id が必要なハンドラ {#handlers-that-need-taskid}

セッションごとの状態を扱うツールは、`**kwargs` 経由で `task_id` を受け取ります。

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

一部のツール（`todo`、`memory`、`session_search`、`delegate_task`）は、セッションごとのエージェントの状態にアクセスする必要があります。これらはレジストリに届く前に `run_agent.py` が横取りします。スキーマ自体はレジストリが持っていますが、横取りを通らなかった場合は `dispatch()` が予備のエラーを返します。

## 任意: セットアップウィザードへの組み込み {#optional-setup-wizard-integration}

ツールが API キーを必要とするなら、`hermes_cli/config.py` に追加します。

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

- [ ] ハンドラ、スキーマ、利用可否の判定関数、登録を含むツールのファイルを作った
- [ ] `toolsets.py` の適切なツールセットに追加した
- [ ] プラグインではなく、本当に組み込みのコアツールにすべきか確認した
- [ ] ハンドラが JSON 文字列を返し、エラーは `{"error": "..."}` で返している
- [ ] 任意: `hermes_cli/config.py` の `OPTIONAL_ENV_VARS` に API キーを追加した
- [ ] 任意: バッチ処理のために `toolset_distributions.py` に追加した
- [ ] `hermes chat -q "Use the weather tool for London"` で動作を確認した
