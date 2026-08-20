---
title: "まとめて処理する"
description: "エージェントの軌跡を大量に生成する — 並列処理、途中経過の保存、ツールセットの配分"
upstream_path: user-guide/features/batch-processing.md
upstream_blob: 87bbf03af162883671a24d8b58b26cde684b50de
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/batch-processing
---

# まとめて処理する {#batch-processing}

まとめて処理する仕組みを使うと、何百、何千という指示文に対して Hermes エージェントを並列で走らせ、構造化された軌跡のデータを作れます。主な用途は**学習データの生成**です。ツールの利用統計が付いた ShareGPT 形式の軌跡が手に入り、そのまま追加学習や評価に回せます。

## 全体像 {#overview}

一括実行の担い手（`batch_runner.py`）は、指示文を並べた JSONL のデータセットを読み込み、それぞれをツール付きの完全なエージェント対話として走らせます。指示文ごとに隔離された環境が用意されます。出てくるのは、会話の全履歴、ツール呼び出しの統計、推論がどれだけ含まれていたかの指標を持つ構造化された軌跡データです。

## さっそく動かす {#quick-start}

```bash
# Basic batch run
python batch_runner.py \
    --dataset_file=data/prompts.jsonl \
    --batch_size=10 \
    --run_name=my_first_run \
    --model=anthropic/claude-sonnet-4.6 \
    --num_workers=4

# Resume an interrupted run
python batch_runner.py \
    --dataset_file=data/prompts.jsonl \
    --batch_size=10 \
    --run_name=my_first_run \
    --resume

# List available toolset distributions
python batch_runner.py --list_distributions
```

:::tip 規模が大きくても費用が読める
一括実行では同時にたくさんのエージェント対話が立ち上がり、そのひとつひとつがモデルを呼び、ツールを呼びます。[Nous Portal](/hermes/docs/user-guide/features/tool-gateway/) を契約すると、モデルの利用に加えて Web 検索、画像生成、読み上げ、クラウド上のブラウザまでがひとつの請求にまとまります。5社ぶんの利用上限を気にしながら回す代わりに、軌跡1本あたりの費用を安定させたいときに向いています。`hermes setup --portal` で設定し、`--model` に Nous のモデルを指定してください。
:::

## データセットの形式 {#dataset-format}

入力となるデータセットは JSONL ファイル（1行に JSON オブジェクトを1つ）です。各行には `prompt` フィールドが必要です。

```jsonl
{"prompt": "Write a Python function that finds the longest palindromic substring"}
{"prompt": "Create a REST API endpoint for user authentication using Flask"}
{"prompt": "Debug this error: TypeError: cannot unpack non-iterable NoneType object"}
```

次の項目は、必要に応じて足せます。

- `image` または `docker_image`: この指示文のサンドボックスに使うコンテナイメージ（Docker、Modal、Singularity のいずれの実行基盤でも働きます）
- `cwd`: この仕事のターミナルで使う作業ディレクトリの指定

## 設定できる項目 {#configuration-options}

| 引数 | 既定値 | 説明 |
|-----------|---------|-------------|
| `--dataset_file` | （必須） | JSONL データセットへのパス |
| `--batch_size` | （必須） | 1つの束あたりの指示文の数 |
| `--run_name` | （必須） | この実行の名前（出力先ディレクトリと途中経過の保存に使われます） |
| `--distribution` | `"default"` | ツールセットを抽選するときの配分 |
| `--model` | `claude-sonnet-4.6` | 使うモデル |
| `--base_url` | `https://openrouter.ai/api/v1` | API の基点となる URL |
| `--api_key` | （環境変数） | モデル用の API キー |
| `--max_turns` | `10` | 指示文1つあたりのツール呼び出しの上限回数 |
| `--num_workers` | `4` | 並列で動かすワーカープロセスの数 |
| `--resume` | `false` | 途中経過から再開する |
| `--verbose` | `false` | 詳しいログを出す |
| `--max_samples` | すべて | データセットの先頭 N 件だけを処理する |
| `--max_tokens` | モデルの既定値 | モデルの応答1回あたりのトークン上限 |

### 提供元の振り分け（OpenRouter） {#provider-routing-openrouter}

| 引数 | 説明 |
|-----------|-------------|
| `--providers_allowed` | 許可する提供元をカンマ区切りで（例: `"anthropic,openai"`） |
| `--providers_ignored` | 使わない提供元をカンマ区切りで（例: `"together,deepinfra"`） |
| `--providers_order` | 優先したい提供元の順番をカンマ区切りで |
| `--provider_sort` | `"price"`、`"throughput"`、`"latency"` のいずれかで並べ替える |

### 推論の制御 {#reasoning-control}

| 引数 | 説明 |
|-----------|-------------|
| `--reasoning_effort` | 推論にかける力の入れ具合: `none`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max`、`ultra` |
| `--reasoning_disabled` | 推論・思考のトークンを完全に止める |

### 進んだ設定 {#advanced-options}

| 引数 | 説明 |
|-----------|-------------|
| `--ephemeral_system_prompt` | 実行中には使われるが、軌跡には保存されないシステムプロンプト |
| `--log_prefix_chars` | ログのプレビューに表示する文字数（既定値: 100） |
| `--prefill_messages_file` | 少数例の呼び水として使う、事前投入メッセージの JSON ファイルへのパス |

## ツールセットの配分 {#toolset-distributions}

指示文ごとに、**配分**からツールセットの組み合わせが無作為に選ばれます。こうすることで、学習データがさまざまなツールの組み合わせを覆えます。使える配分の一覧は `--list_distributions` で確認できます。

現在の実装では、配分は**個々のツールセットごと**に確率を割り当てます。抽選はツールセットを1つずつ独立に判定し、そのうえで最低1つは必ず有効になるようにします。あらかじめ手で書いた組み合わせ表から選ぶ方式とは違います。

## 出力の形式 {#output-format}

出力はすべて `data/<run_name>/` に置かれます。

```text
data/my_run/
├── trajectories.jsonl    # Combined final output (all batches merged)
├── batch_0.jsonl         # Individual batch results
├── batch_1.jsonl
├── ...
├── checkpoint.json       # Resume checkpoint
└── statistics.json       # Aggregate tool usage stats
```

### 軌跡の形式 {#trajectory-format}

`trajectories.jsonl` の1行1行が JSON オブジェクトです。

```json
{
  "prompt_index": 42,
  "conversations": [
    {"from": "human", "value": "Write a function..."},
    {"from": "gpt", "value": "I'll create that function...",
     "tool_calls": [...]},
    {"from": "tool", "value": "..."},
    {"from": "gpt", "value": "Here's the completed function..."}
  ],
  "metadata": {
    "batch_num": 2,
    "timestamp": "2026-01-15T10:30:00",
    "model": "anthropic/claude-sonnet-4.6"
  },
  "completed": true,
  "partial": false,
  "api_calls": 3,
  "toolsets_used": ["terminal", "file"],
  "tool_stats": {
    "terminal": {"count": 2, "success": 2, "failure": 0},
    "read_file": {"count": 1, "success": 1, "failure": 0}
  },
  "tool_error_counts": {
    "terminal": 0,
    "read_file": 0
  }
}
```

`conversations` は `from` と `value` を持つ ShareGPT 風の形式です。ツールの統計は、使われなかったツールも0で埋めて正規化されます。こうしておくと全行で構造が揃い、HuggingFace のデータセットとしてそのまま扱えます。

## 途中経過の保存 {#checkpointing}

一括実行は、途中で止まっても立て直せるようにしっかりと経過を残します。

- **経過ファイル:** 束が1つ終わるたびに保存され、どの指示文まで済んだかを記録します
- **中身で照合して再開:** `--resume` を付けると、既にある束のファイルを走査し、完了済みの指示文を番号ではなく実際の本文で突き合わせます。データセットの並び順が変わっていても拾い直せます
- **失敗した指示文:** 完了扱いになるのは成功したものだけなので、失敗した指示文は再開時にやり直されます
- **束の統合:** 実行が終わると、以前の実行のぶんも含めてすべての束のファイルが1つの `trajectories.jsonl` にまとめられます

### 再開の流れ {#how-resume-works}

1. `batch_*.jsonl` をすべて走査し、完了済みの指示文を（中身の照合で）洗い出す
2. 完了済みの指示文をデータセットから取り除く
3. 残った指示文を束に組み直す
4. 残った指示文だけを処理する
5. すべての束のファイル（古いぶんも新しいぶんも）を最終出力に統合する

## 品質でのふるい分け {#quality-filtering}

一括実行は、品質のふるい分けを自動でかけます。

- **推論なしのふるい:** アシスタントの発話がひとつも推論を含まない（`<REASONING_SCRATCHPAD>` もモデル自身の思考トークンもない）サンプルは捨てられます
- **壊れた行のふるい:** 実在しないツール名（有効なツール一覧にないもの）が混じった行は、最後の統合時に取り除かれます
- **推論の統計:** 実行全体を通して、推論を含む発話と含まない発話の割合を記録します

## 統計 {#statistics}

実行が終わると、まとまった統計が表示されます。

- **ツールの利用状況:** ツールごとの呼び出し回数と成功・失敗の割合
- **推論の網羅度:** アシスタントの発話のうち推論を含むものの割合
- **捨てられたサンプル:** 推論が無いとしてふるい落とされた件数
- **所要時間:** 処理全体にかかった時間

統計は `statistics.json` にも保存されるので、プログラムから解析できます。

## こんなときに使う {#use-cases}

### 学習データを作る {#training-data-generation}

追加学習のために、多様なツール利用の軌跡を生成します。

```bash
python batch_runner.py \
    --dataset_file=data/coding_prompts.jsonl \
    --batch_size=20 \
    --run_name=coding_v1 \
    --model=anthropic/claude-sonnet-4.6 \
    --num_workers=8 \
    --distribution=default \
    --max_turns=15
```

### モデルを評価する {#model-evaluation}

同じ指示文をそろえて、モデルがツールをどれだけうまく使えるかを測ります。

```bash
python batch_runner.py \
    --dataset_file=data/eval_suite.jsonl \
    --batch_size=10 \
    --run_name=eval_gpt4 \
    --model=openai/gpt-4o \
    --num_workers=4 \
    --max_turns=10
```

### 指示文ごとにコンテナイメージを変える {#per-prompt-container-images}

特定の環境が要るベンチマークでは、指示文ごとに使うコンテナイメージを指定できます。

```jsonl
{"prompt": "Install numpy and compute eigenvalues of a 3x3 matrix", "image": "python:3.11-slim"}
{"prompt": "Compile this Rust program and run it", "image": "rust:1.75"}
{"prompt": "Set up a Node.js Express server", "image": "node:20-alpine", "cwd": "/app"}
```

一括実行は、それぞれの指示文を走らせる前に Docker イメージが取得できるかを確かめます。
