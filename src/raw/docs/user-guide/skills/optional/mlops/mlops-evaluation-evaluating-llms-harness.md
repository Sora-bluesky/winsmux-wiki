---
title: "Evaluating Llms Harness — lm-eval-harness で LLM を評価する（MMLU、GSM8K など）"
description: "lm-eval-harness で LLM を評価する（MMLU、GSM8K など）"
upstream_path: user-guide/skills/optional/mlops/mlops-evaluation-evaluating-llms-harness.md
upstream_blob: 8d449ee126a49a78d7183845dda06a9742d4158c
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/mlops/mlops-evaluation-evaluating-llms-harness
---

# Evaluating Llms Harness {#evaluating-llms-harness}

lm-eval-harness で LLM を評価します（MMLU、GSM8K など）。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加 skill — `hermes skills install official/mlops/evaluating-llms-harness` で入れます |
| パス | `optional-skills/mlops\evaluation\evaluating-llms-harness` |
| バージョン | `1.0.1` |
| 作者 | Orchestra Research |
| ライセンス | MIT |
| 依存関係 | `lm-eval`, `transformers`, `vllm` |
| 対応プラットフォーム | linux, macos |
| タグ | `Evaluation`, `LM Evaluation Harness`, `Benchmarking`, `MMLU`, `HumanEval`, `GSM8K`, `EleutherAI`, `Model Quality`, `Academic Benchmarks`, `Industry Standard` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# lm-evaluation-harness - LLM Benchmarking {#lm-evaluation-harness---llm-benchmarking}

## 何が入っているか {#whats-inside}

60 種類以上の学術ベンチマーク（MMLU、HumanEval、GSM8K、TruthfulQA、HellaSwag）で LLM を評価します。モデルの品質をはかるとき、モデル同士を比べるとき、論文向けの数値を出すとき、学習の進み具合を追うときに使ってください。EleutherAI や HuggingFace、主要な研究所が使っている業界標準です。HuggingFace、vLLM、API のいずれにも対応します。

## すぐ始める {#quick-start}

lm-evaluation-harness は、共通のプロンプトと指標を使って、60 種類以上の学術ベンチマークで LLM を評価します。

**導入**:
```bash
pip install lm-eval
```

**HuggingFace のモデルを評価する**:
```bash
lm_eval --model hf \
  --model_args pretrained=meta-llama/Llama-2-7b-hf \
  --tasks mmlu,gsm8k,hellaswag \
  --device cuda:0 \
  --batch_size 8
```

**使えるタスクを見る**:
```bash
lm-eval ls tasks
```

## よくある進め方 {#common-workflows}

### Workflow 1: 標準的なベンチマーク評価 {#workflow-1-standard-benchmark-evaluation}

主要なベンチマーク（MMLU、GSM8K、HumanEval）でモデルを評価します。

次のチェックリストをコピーして使ってください。

```
Benchmark Evaluation:
- [ ] Step 1: Choose benchmark suite
- [ ] Step 2: Configure model
- [ ] Step 3: Run evaluation
- [ ] Step 4: Analyze results
```

**ステップ 1: ベンチマークの組み合わせを選ぶ**

**推論の中心的なベンチマーク**:
- **MMLU**（Massive Multitask Language Understanding）- 57 分野、選択式
- **GSM8K** - 小学校レベルの文章題
- **HellaSwag** - 常識的な推論
- **TruthfulQA** - 正直さと事実性
- **ARC**（AI2 Reasoning Challenge）- 理科の問題

**コードのベンチマーク**:
- **HumanEval** - Python のコード生成（164 問）
- **MBPP**（Mostly Basic Python Problems）- Python のコーディング

**標準の組み合わせ**（モデルを公開するときにおすすめ）:
```bash
--tasks mmlu,gsm8k,hellaswag,truthfulqa,arc_challenge
```

**ステップ 2: モデルを設定する**

**HuggingFace のモデル**:
```bash
lm_eval --model hf \
  --model_args pretrained=meta-llama/Llama-2-7b-hf,dtype=bfloat16 \
  --tasks mmlu \
  --device cuda:0 \
  --batch_size auto  # Auto-detect optimal batch size
```

**量子化したモデル（4 ビット / 8 ビット）**:
```bash
lm_eval --model hf \
  --model_args pretrained=meta-llama/Llama-2-7b-hf,load_in_4bit=True \
  --tasks mmlu \
  --device cuda:0
```

**自分のチェックポイント**:
```bash
lm_eval --model hf \
  --model_args pretrained=/path/to/my-model,tokenizer=/path/to/tokenizer \
  --tasks mmlu \
  --device cuda:0
```

**ステップ 3: 評価を実行する**

```bash
# Full MMLU evaluation (57 subjects)
lm_eval --model hf \
  --model_args pretrained=meta-llama/Llama-2-7b-hf \
  --tasks mmlu \
  --num_fewshot 5 \  # 5-shot evaluation (standard)
  --batch_size 8 \
  --output_path results/ \
  --log_samples  # Save individual predictions

# Multiple benchmarks at once
lm_eval --model hf \
  --model_args pretrained=meta-llama/Llama-2-7b-hf \
  --tasks mmlu,gsm8k,hellaswag,truthfulqa,arc_challenge \
  --num_fewshot 5 \
  --batch_size 8 \
  --output_path results/llama2-7b-eval.json
```

**ステップ 4: 結果を読み解く**

結果は `results/llama2-7b-eval.json` に保存されます。

```json
{
  "results": {
    "mmlu": {
      "acc": 0.459,
      "acc_stderr": 0.004
    },
    "gsm8k": {
      "exact_match": 0.142,
      "exact_match_stderr": 0.006
    },
    "hellaswag": {
      "acc_norm": 0.765,
      "acc_norm_stderr": 0.004
    }
  },
  "config": {
    "model": "hf",
    "model_args": "pretrained=meta-llama/Llama-2-7b-hf",
    "num_fewshot": 5
  }
}
```

### Workflow 2: 学習の進み具合を追う {#workflow-2-track-training-progress}

学習の途中でチェックポイントを評価します。

```
Training Progress Tracking:
- [ ] Step 1: Set up periodic evaluation
- [ ] Step 2: Choose quick benchmarks
- [ ] Step 3: Automate evaluation
- [ ] Step 4: Plot learning curves
```

**ステップ 1: 定期的な評価を組む**

学習ステップ N ごとに評価します。

```bash
#!/bin/bash
# eval_checkpoint.sh

CHECKPOINT_DIR=$1
STEP=$2

lm_eval --model hf \
  --model_args pretrained=$CHECKPOINT_DIR/checkpoint-$STEP \
  --tasks gsm8k,hellaswag \
  --num_fewshot 0 \  # 0-shot for speed
  --batch_size 16 \
  --output_path results/step-$STEP.json
```

**ステップ 2: 短時間で終わるベンチマークを選ぶ**

こまめに評価するのに向いた、速いベンチマークです。
- **HellaSwag**: GPU 1 枚でおよそ 10 分
- **GSM8K**: およそ 5 分
- **PIQA**: およそ 2 分

こまめな評価には向きません（時間がかかりすぎます）。
- **MMLU**: およそ 2 時間（57 分野）
- **HumanEval**: コードの実行が必要です

**ステップ 3: 評価を自動で回す**

学習スクリプトに組み込みます。

```python
# In training loop
if step % eval_interval == 0:
    model.save_pretrained(f"checkpoints/step-{step}")

    # Run evaluation
    os.system(f"./eval_checkpoint.sh checkpoints step-{step}")
```

PyTorch Lightning のコールバックを使う方法もあります。

```python
from pytorch_lightning import Callback

class EvalHarnessCallback(Callback):
    def on_validation_epoch_end(self, trainer, pl_module):
        step = trainer.global_step
        checkpoint_path = f"checkpoints/step-{step}"

        # Save checkpoint
        trainer.save_checkpoint(checkpoint_path)

        # Run lm-eval
        os.system(f"lm_eval --model hf --model_args pretrained={checkpoint_path} ...")
```

**ステップ 4: 学習曲線を描く**

```python

# Load all results
steps = []
mmlu_scores = []

for file in sorted(glob.glob("results/step-*.json")):
    with open(file) as f:
        data = json.load(f)
        step = int(file.split("-")[1].split(".")[0])
        steps.append(step)
        mmlu_scores.append(data["results"]["mmlu"]["acc"])

# Plot
plt.plot(steps, mmlu_scores)
plt.xlabel("Training Step")
plt.ylabel("MMLU Accuracy")
plt.title("Training Progress")
plt.savefig("training_curve.png")
```

### Workflow 3: 複数のモデルを比べる {#workflow-3-compare-multiple-models}

モデルを比べるためのベンチマーク一式です。

```
Model Comparison:
- [ ] Step 1: Define model list
- [ ] Step 2: Run evaluations
- [ ] Step 3: Generate comparison table
```

**ステップ 1: 対象のモデルを並べる**

```bash
# models.txt
meta-llama/Llama-2-7b-hf
meta-llama/Llama-2-13b-hf
mistralai/Mistral-7B-v0.1
microsoft/phi-2
```

**ステップ 2: 評価を実行する**

```bash
#!/bin/bash
# eval_all_models.sh

TASKS="mmlu,gsm8k,hellaswag,truthfulqa"

while read model; do
    echo "Evaluating $model"

    # Extract model name for output file
    model_name=$(echo $model | sed 's/\//-/g')

    lm_eval --model hf \
      --model_args pretrained=$model,dtype=bfloat16 \
      --tasks $TASKS \
      --num_fewshot 5 \
      --batch_size auto \
      --output_path results/$model_name.json

done < models.txt
```

**ステップ 3: 比較表を作る**

```python

models = [
    "meta-llama-Llama-2-7b-hf",
    "meta-llama-Llama-2-13b-hf",
    "mistralai-Mistral-7B-v0.1",
    "microsoft-phi-2"
]

tasks = ["mmlu", "gsm8k", "hellaswag", "truthfulqa"]

results = []
for model in models:
    with open(f"results/{model}.json") as f:
        data = json.load(f)
        row = {"Model": model.replace("-", "/")}
        for task in tasks:
            # Get primary metric for each task
            metrics = data["results"][task]
            if "acc" in metrics:
                row[task.upper()] = f"{metrics['acc']:.3f}"
            elif "exact_match" in metrics:
                row[task.upper()] = f"{metrics['exact_match']:.3f}"
        results.append(row)

df = pd.DataFrame(results)
print(df.to_markdown(index=False))
```

出力:
```
| Model                  | MMLU  | GSM8K | HELLASWAG | TRUTHFULQA |
|------------------------|-------|-------|-----------|------------|
| meta-llama/Llama-2-7b  | 0.459 | 0.142 | 0.765     | 0.391      |
| meta-llama/Llama-2-13b | 0.549 | 0.287 | 0.801     | 0.430      |
| mistralai/Mistral-7B   | 0.626 | 0.395 | 0.812     | 0.428      |
| microsoft/phi-2        | 0.560 | 0.613 | 0.682     | 0.447      |
```

### Workflow 4: vLLM で評価する（推論が速くなります） {#workflow-4-evaluate-with-vllm-faster-inference}

vLLM を推論の土台に使うと、評価が 5〜10 倍速くなります。

```
vLLM Evaluation:
- [ ] Step 1: Install vLLM
- [ ] Step 2: Configure vLLM backend
- [ ] Step 3: Run evaluation
```

**ステップ 1: vLLM を入れる**

```bash
pip install vllm
```

**ステップ 2: vLLM を使うように設定する**

```bash
lm_eval --model vllm \
  --model_args pretrained=meta-llama/Llama-2-7b-hf,tensor_parallel_size=1,dtype=auto,gpu_memory_utilization=0.8 \
  --tasks mmlu \
  --batch_size auto
```

**ステップ 3: 評価を実行する**

vLLM は標準の HuggingFace より 5〜10 倍速く動きます。

```bash
# Standard HF: ~2 hours for MMLU on 7B model
lm_eval --model hf \
  --model_args pretrained=meta-llama/Llama-2-7b-hf \
  --tasks mmlu \
  --batch_size 8

# vLLM: ~15-20 minutes for MMLU on 7B model
lm_eval --model vllm \
  --model_args pretrained=meta-llama/Llama-2-7b-hf,tensor_parallel_size=2 \
  --tasks mmlu \
  --batch_size auto
```

## ほかの選択肢との使い分け {#when-to-use-vs-alternatives}

**lm-evaluation-harness を使う場面:**
- 論文のためにモデルを評価するとき
- 標準的なタスクでモデルの品質を比べるとき
- 学習の進み具合を追うとき
- 誰もが同じプロンプトを使う、標準化された数値を出したいとき
- 何度でも同じ結果を再現できる評価が必要なとき

**ほかを使ったほうがよい場面:**
- **HELM**（スタンフォード大学）: より幅広い評価（公平性、効率、較正）
- **AlpacaEval**: LLM を審査役にした、指示への従い方の評価
- **MT-Bench**: 複数ターンの会話の評価
- **自作のスクリプト**: 特定の分野に絞った評価

## よくある問題 {#common-issues}

**問題: 評価が遅すぎる**

vLLM を使ってください。
```bash
lm_eval --model vllm \
  --model_args pretrained=model-name,tensor_parallel_size=2
```

例示の数を減らす方法もあります。
```bash
--num_fewshot 0  # Instead of 5
```

MMLU の一部だけを評価することもできます。
```bash
--tasks mmlu_stem  # Only STEM subjects
```

**問題: メモリが足りない**

バッチサイズを下げてください。
```bash
--batch_size 1  # Or --batch_size auto
```

量子化を使ってください。
```bash
--model_args pretrained=model-name,load_in_8bit=True
```

CPU への退避を有効にしてください。
```bash
--model_args pretrained=model-name,device_map=auto,offload_folder=offload
```

**問題: 公表されている数値と違う**

例示の数を確かめてください。
```bash
--num_fewshot 5  # Most papers use 5-shot
```

タスク名が正確か確かめてください。
```bash
--tasks mmlu  # Not mmlu_direct or mmlu_fewshot
```

モデルとトークナイザーが対応しているか確かめてください。
```bash
--model_args pretrained=model-name,tokenizer=same-model-name
```

**問題: HumanEval がコードを実行しない**

コードを実行するタスク（HumanEval、MBPP など）は、はっきりした確認のフラグで
守られています。実行するには `--confirm_run_unsafe_code` を渡してください。

```bash
lm_eval --model hf \
  --model_args pretrained=model-name \
  --tasks humaneval \
  --confirm_run_unsafe_code  # Required to run tasks that execute generated code
```

このフラグがないと、lm-eval はコードの実行を黙って飛ばすのではなく、
そのタスクの実行そのものを断ります。

## さらに進んだ話題 {#advanced-topics}

**ベンチマークの説明**: 60 種類以上のタスクそれぞれが何をはかるのか、結果をどう読むのかは、[references/benchmark-guide.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops\evaluation\evaluating-llms-harness/references/benchmark-guide.md) にくわしく書いてあります。

**独自のタスク**: 分野に合わせた評価タスクの作り方は [references/custom-tasks.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops\evaluation\evaluating-llms-harness/references/custom-tasks.md) を見てください。

**API のモデルの評価**: OpenAI や Anthropic をはじめとする API のモデルを評価する方法は [references/api-evaluation.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops\evaluation\evaluating-llms-harness/references/api-evaluation.md) を見てください。

**GPU を複数使う進め方**: データ並列とテンソル並列の評価については [references/distributed-eval.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops\evaluation\evaluating-llms-harness/references/distributed-eval.md) を見てください。

## 必要なハードウェア {#hardware-requirements}

- **GPU**: NVIDIA（CUDA 11.8 以上）。CPU でも動きますが、とても遅くなります
- **VRAM**:
  - 7B のモデル: 16GB（bf16）または 8GB（8 ビット）
  - 13B のモデル: 28GB（bf16）または 14GB（8 ビット）
  - 70B のモデル: GPU を複数使うか、量子化が必要です
- **所要時間**（7B のモデル、A100 1 枚）:
  - HellaSwag: 10 分
  - GSM8K: 5 分
  - MMLU（全体）: 2 時間
  - HumanEval: 20 分

## 関連情報 {#resources}

- GitHub: https://github.com/EleutherAI/lm-evaluation-harness
- ドキュメント: https://github.com/EleutherAI/lm-evaluation-harness/tree/main/docs
- タスク一覧: MMLU、GSM8K、HumanEval、TruthfulQA、HellaSwag、ARC、WinoGrande など 60 種類以上
- リーダーボード: https://huggingface.co/spaces/HuggingFaceH4/open_llm_leaderboard （この harness を使っています）
