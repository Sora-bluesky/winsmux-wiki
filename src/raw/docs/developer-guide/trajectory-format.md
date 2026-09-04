---
title: "developer-guide/trajectory-format"
description: ""
upstream_path: developer-guide/trajectory-format.md
upstream_blob: e0fbfb319c1bcf499f64e6705d53f50e26e8d90b
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/trajectory-format
---

# 軌跡の形式 {#trajectory-format}

Hermes Agent は会話の軌跡を ShareGPT 互換の JSONL 形式で保存します。学習データ、
不具合を調べるための記録、強化学習のデータセットとして使えます。

ソースファイル: `agent/trajectory.py`、`agent/session_persistence.py`（`_save_trajectory` を検索してください）、`batch_runner.py`

## ファイル名の決まり {#file-naming-convention}

軌跡は、現在の作業ディレクトリにあるファイルへ書き込まれます。

| ファイル | 書き込まれるとき |
|------|------|
| `trajectory_samples.jsonl` | 会話が最後まで終わったとき（`completed=True`） |
| `failed_trajectories.jsonl` | 会話が失敗したか、途中で止まったとき（`completed=False`） |

バッチ実行の仕組み（`batch_runner.py`）は、バッチごとに指定した出力ファイル
（`batch_001_output.jsonl` など）へ書き込み、メタデータの項目がいくつか増えます。

ファイル名は `save_trajectory()` の `filename` 引数で変えられます。

## JSONL 1 行の形式 {#jsonl-entry-format}

ファイルの各行が、それだけで完結した JSON オブジェクトです。形は 2 種類あります。

### CLI・対話時の形式（`_save_trajectory` から） {#cliinteractive-format-from-savetrajectory}

```json
{
  "conversations": [ ... ],
  "timestamp": "2026-03-30T14:22:31.456789",
  "model": "anthropic/claude-sonnet-4.6",
  "completed": true
}
```

### バッチ実行の形式（`batch_runner.py` から） {#batch-runner-format-from-batchrunnerpy}

```json
{
  "prompt_index": 42,
  "conversations": [ ... ],
  "metadata": { "prompt_source": "gsm8k", "difficulty": "hard" },
  "completed": true,
  "partial": false,
  "api_calls": 7,
  "toolsets_used": ["code_tools", "file_tools"],
  "tool_stats": {
    "terminal": {"count": 3, "success": 3, "failure": 0},
    "read_file": {"count": 2, "success": 2, "failure": 0},
    "write_file": {"count": 0, "success": 0, "failure": 0}
  },
  "tool_error_counts": {
    "terminal": 0,
    "read_file": 0,
    "write_file": 0
  }
}
```

`tool_stats` と `tool_error_counts` の辞書は、あり得るツールをすべて
（`model_tools.TOOL_TO_TOOLSET_MAP` から）並べ、値が無いものは 0 で埋めて正規化されます。
これにより行ごとのスキーマが揃い、HuggingFace のデータセットとして読み込めます。

## conversations 配列（ShareGPT 形式） {#conversations-array-sharegpt-format}

`conversations` 配列は、ShareGPT の役割の呼び方に従います。

| API での役割 | ShareGPT の `from` |
|----------|-----------------|
| system | `"system"` |
| user | `"human"` |
| assistant | `"gpt"` |
| tool | `"tool"` |

### 全体の例 {#complete-example}

```json
{
  "conversations": [
    {
      "from": "system",
      "value": "You are a function calling AI model. You are provided with function signatures within <tools> </tools> XML tags. You may call one or more functions to assist with the user query. If available tools are not relevant in assisting with user query, just respond in natural conversational language. Don't make assumptions about what values to plug into functions. After calling & executing the functions, you will be provided with function results within <tool_response> </tool_response> XML tags. Here are the available tools:\n<tools>\n[{\"name\": \"terminal\", \"description\": \"Execute shell commands\", \"parameters\": {\"type\": \"object\", \"properties\": {\"command\": {\"type\": \"string\"}}}, \"required\": null}]\n</tools>\nFor each function call return a JSON object, with the following pydantic model json schema for each:\n{'title': 'FunctionCall', 'type': 'object', 'properties': {'name': {'title': 'Name', 'type': 'string'}, 'arguments': {'title': 'Arguments', 'type': 'object'}}, 'required': ['name', 'arguments']}\nEach function call should be enclosed within <tool_call> </tool_call> XML tags.\nExample:\n<tool_call>\n{'name': <function-name>,'arguments': <args-dict>}\n</tool_call>"
    },
    {
      "from": "human",
      "value": "What Python version is installed?"
    },
    {
      "from": "gpt",
      "value": "<think>\nThe user wants to know the Python version. I should run python3 --version.\n</think>\n<tool_call>\n{\"name\": \"terminal\", \"arguments\": {\"command\": \"python3 --version\"}}\n</tool_call>"
    },
    {
      "from": "tool",
      "value": "<tool_response>\n{\"tool_call_id\": \"call_abc123\", \"name\": \"terminal\", \"content\": \"Python 3.11.6\"}\n</tool_response>"
    },
    {
      "from": "gpt",
      "value": "<think>\nGot the version. I can now answer the user.\n</think>\nPython 3.11.6 is installed on this system."
    }
  ],
  "timestamp": "2026-03-30T14:22:31.456789",
  "model": "anthropic/claude-sonnet-4.6",
  "completed": true
}
```

## 正規化の決まり {#normalization-rules}

### 推論内容の書き方 {#reasoning-content-markup}

軌跡の変換処理は、モデルがどんな形で推論を出したかによらず、すべてを
`<think>` タグに揃えます。

1. **モデルが直接出す思考トークン**（Anthropic や OpenAI の o シリーズなどが返す
   `msg["reasoning"]` の項目）: `<think>\n{reasoning}\n</think>\n` の形で包み、
   本文の前に置きます。

2. **REASONING_SCRATCHPAD の XML**（直接の思考出力を無効にし、システムプロンプトの
   指示に従ってモデルが XML で推論した場合）: `<REASONING_SCRATCHPAD>` タグは
   `convert_scratchpad_to_think()` によって `<think>` へ変換されます。

3. **空の think ブロック**: `gpt` の発言には必ず `<think>` ブロックが付きます。
   推論が出なかった場合は空のブロックが差し込まれます:
   `<think>\n</think>\n` — 学習データとして形を揃えるためです。

### ツール呼び出しの正規化 {#tool-call-normalization}

API の形式によるツール呼び出し（`tool_call_id`、関数名、JSON 文字列の引数を持つもの）は、
XML で包んだ JSON に変換されます。

```
<tool_call>
{"name": "terminal", "arguments": {"command": "ls -la"}}
</tool_call>
```

- 引数は JSON 文字列からオブジェクトに戻されます（二重にエンコードされません）
- JSON の解析に失敗した場合は（会話中に検証済みなので起きないはずですが）、
  警告をログに残したうえで空の `{}` が使われます
- 1 回のアシスタントの発言に複数のツール呼び出しがあれば、1 つの `gpt` メッセージの中に
  `<tool_call>` ブロックが複数並びます

### ツール応答の正規化 {#tool-response-normalization}

アシスタントの発言に続くツールの結果は、XML で包んだ JSON として 1 つの `tool` の
発言にまとめられます。

```
<tool_response>
{"tool_call_id": "call_abc123", "name": "terminal", "content": "output here"}
</tool_response>
```

- ツールの内容が JSON らしい場合（`{` か `[` で始まる場合）は解析され、content の項目は
  文字列ではなく JSON のオブジェクトや配列になります
- ツールの結果が複数あるときは、改行でつないで 1 つのメッセージにまとめます
- ツール名は、親であるアシスタントの `tool_calls` 配列と位置で突き合わせます

### システムメッセージ {#system-message}

システムメッセージは保存時に生成されます（会話から取ってくるのではありません）。
Hermes の関数呼び出し用プロンプトの雛形に沿っており、次を含みます。

- 関数呼び出しの手順を説明する前置き
- JSON のツール定義を収めた `<tools>` の XML ブロック
- `FunctionCall` オブジェクトのスキーマの説明
- `<tool_call>` の例

ツール定義には `name`、`description`、`parameters`、`required` が入ります
（元の形式に合わせて `null` を入れます）。

## 軌跡の読み込み {#loading-trajectories}

軌跡はふつうの JSONL です。JSON Lines を読めるものなら何でも読み込めます。

```python

def load_trajectories(path: str):
    """Load trajectory entries from a JSONL file."""
    entries = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                entries.append(json.loads(line))
    return entries

# Filter to successful completions only
successful = [e for e in load_trajectories("trajectory_samples.jsonl")
              if e.get("completed")]

# Extract just the conversations for training
training_data = [e["conversations"] for e in successful]
```

### HuggingFace Datasets での読み込み {#loading-for-huggingface-datasets}

```python
from datasets import load_dataset

ds = load_dataset("json", data_files="trajectory_samples.jsonl")
```

`tool_stats` を正規化してあるおかげで、どの行も同じ列を持ちます。データセットを
読み込むときの Arrow のスキーマ不一致のエラーを防げます。

## 軌跡の保存を切り替える {#controlling-trajectory-saving}

軌跡の保存は `run_agent.py` すなわちライブラリの層にある切り替えで、`hermes` の
CLI には設定キーもフラグも用意されていません。

```bash
python run_agent.py --save_trajectories --query='your question here'
```

プログラムから使う場合は `AIAgent(..., save_trajectories=True)` または
`initialize_agent(..., save_trajectories=True)` です。有効にすると、会話のやり取りが
1 往復終わるたびに `_save_trajectory()` メソッドが呼ばれます。

バッチ実行の仕組みは常に軌跡を保存します（それが本来の目的だからです）。

どの発言にも推論が無かったサンプルは、推論のない例で学習データを濁さないよう、
バッチ実行の仕組みが自動で捨てます。
