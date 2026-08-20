---
title: "トラジェクトリ形式"
description: ""
upstream_path: developer-guide/trajectory-format.md
upstream_blob: fbc46632305461a4e73d16f07d8e8846b5773401
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/trajectory-format
---

# トラジェクトリ形式 {#trajectory-format}

Hermes Agent は、会話のトラジェクトリ（やり取りの記録）を ShareGPT 互換の JSONL 形式で保存します。
学習データ、不具合を追うための記録、強化学習用のデータセットとして使えます。

該当するソースファイル: `agent/trajectory.py`、`run_agent.py`（`_save_trajectory` を検索してください）、`batch_runner.py`

## ファイル名の決まり {#file-naming-convention}

トラジェクトリは、現在の作業ディレクトリに次のファイルとして書き出されます:

| ファイル | 書き出される場面 |
|------|------|
| `trajectory_samples.jsonl` | 最後まで完了した会話（`completed=True`） |
| `failed_trajectories.jsonl` | 失敗した、または途中で中断された会話（`completed=False`） |

バッチ実行（`batch_runner.py`）は、バッチごとに指定した出力ファイル
（たとえば `batch_001_output.jsonl`）へ、追加のメタデータ項目とともに書き出します。

ファイル名は `save_trajectory()` の `filename` 引数で変更できます。

## JSONL の 1 件の形式 {#jsonl-entry-format}

ファイルの各行が、それ単体で完結した JSON オブジェクトです。形は 2 種類あります:

### CLI・対話利用の形式（`_save_trajectory` から） {#cliinteractive-format-from-savetrajectory}

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

`tool_stats` と `tool_error_counts` の辞書は、あり得るすべてのツール
（`model_tools.TOOL_TO_TOOLSET_MAP` に載っているもの）を 0 を既定値として含む形にそろえられます。
これにより各行のスキーマが同じになり、HuggingFace のデータセットとして読み込めます。

## conversations 配列（ShareGPT 形式） {#conversations-array-sharegpt-format}

`conversations` 配列は、ShareGPT の役割の呼び方に従います:

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

### 思考内容の書き方 {#reasoning-content-markup}

トラジェクトリの変換処理は、モデルがもともとどんな形で出力したかによらず、
思考の内容をすべて `<think>` タグにそろえます:

1. **モデル自身の思考トークン**（Anthropic や OpenAI の o 系など、提供元が返す
   `msg["reasoning"]` の項目）: `<think>\n{reasoning}\n</think>\n` で包み、
   本文の前に置きます。

2. **REASONING_SCRATCHPAD の XML**（モデル自身の思考機能を切り、システムプロンプトの
   指示で XML を使って考えさせた場合）: `<REASONING_SCRATCHPAD>` タグを
   `convert_scratchpad_to_think()` で `<think>` に変換します。

3. **空の think ブロック**: `gpt` の各ターンには必ず `<think>` ブロックが付きます。
   思考が出力されなかった場合は、空のブロックを差し込みます:
   `<think>\n</think>\n` — 学習データとして形をそろえるためです。

### ツール呼び出しの正規化 {#tool-call-normalization}

API の形式によるツール呼び出し（`tool_call_id`、関数名、JSON 文字列としての引数を持つもの）は、
XML で包んだ JSON に変換されます:

```
<tool_call>
{"name": "terminal", "arguments": {"command": "ls -la"}}
</tool_call>
```

- 引数は JSON 文字列からオブジェクトへ戻して展開します（二重にエンコードしません）
- JSON の解析に失敗した場合（会話中に検証しているので、本来は起きません）は、
  空の `{}` を使い、警告をログに残します
- 1 回のアシスタントのターンで複数のツールを呼び出した場合は、1 つの `gpt` メッセージの中に
  `<tool_call>` ブロックが複数並びます

### ツール応答の正規化 {#tool-response-normalization}

アシスタントのメッセージに続くツールの結果は、まとめて 1 つの `tool` のターンにされ、
XML で包んだ JSON の応答になります:

```
<tool_response>
{"tool_call_id": "call_abc123", "name": "terminal", "content": "output here"}
</tool_response>
```

- ツールの結果が JSON らしい見た目（`{` か `[` で始まる）なら解析され、content の項目には
  文字列ではなく JSON のオブジェクトや配列が入ります
- 複数のツール結果は、改行でつないで 1 つのメッセージにまとめます
- ツール名は、親にあたるアシスタントの `tool_calls` 配列と並び順で突き合わせます

### システムメッセージ {#system-message}

システムメッセージは会話から取り出すのではなく、保存する時点で生成されます。
Hermes の関数呼び出し用プロンプトのひな形に沿っており、次のものを含みます:

- 関数呼び出しの手順を説明する前置き
- ツール定義の JSON を収めた `<tools>` の XML ブロック
- `FunctionCall` オブジェクトのスキーマの提示
- `<tool_call>` の例

ツール定義には `name`、`description`、`parameters`、`required` が含まれます
（最後の項目は、本来の形式に合わせて `null` にしてあります）。

## トラジェクトリを読み込む {#loading-trajectories}

トラジェクトリはごく普通の JSONL なので、JSON Lines を読めるものなら何でも使えます:

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

### HuggingFace Datasets で読み込む {#loading-for-huggingface-datasets}

```python
from datasets import load_dataset

ds = load_dataset("json", data_files="trajectory_samples.jsonl")
```

`tool_stats` のスキーマをそろえてあるので、すべての行が同じ列を持ち、
データセットの読み込み時に Arrow のスキーマ不一致エラーが起きません。

## トラジェクトリの保存を切り替える {#controlling-trajectory-saving}

トラジェクトリの保存は `run_agent.py` やライブラリの側で切り替えるもので、`hermes` の CLI には
そのための設定キーやフラグはありません:

```bash
python run_agent.py --save_trajectories --query='your question here'
```

プログラムから使う場合は `AIAgent(..., save_trajectories=True)` や
`initialize_agent(..., save_trajectories=True)` です。有効にすると、会話のターンが終わるたびに
`_save_trajectory()` が呼ばれます。

バッチ実行は常にトラジェクトリを保存します（それが本来の目的だからです）。

どのターンにも思考が含まれないサンプルは、思考のない例で学習データが薄まらないよう、
バッチ実行が自動的に捨てます。
