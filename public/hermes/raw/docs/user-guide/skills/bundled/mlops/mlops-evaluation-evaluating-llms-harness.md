---
title: "Evaluating Llms Harness — lm-eval-harness で LLM をベンチマークする（MMLU、GSM8K ほか）"
description: "lm-eval-harness で LLM をベンチマークする（MMLU、GSM8K ほか）"
upstream_path: user-guide/skills/bundled/mlops/mlops-evaluation-evaluating-llms-harness.md
upstream_blob: 96a5423450e279ea34c9a31dc277e349fff5d930
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/mlops/mlops-evaluation-evaluating-llms-harness
---

# Evaluating Llms Harness {#evaluating-llms-harness}

lm-eval-harness で LLM をベンチマークします（MMLU、GSM8K ほか）。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/mlops/evaluation/evaluating-llms-harness` |
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

# lm-evaluation-harness - LLM のベンチマーク {#lm-evaluation-harness---llm-benchmarking}

## 何ができるか {#whats-inside}

60 を超える学術ベンチマーク（MMLU、HumanEval、GSM8K、TruthfulQA、HellaSwag）で LLM を評価します。モデルの品質を測るとき、モデル同士を比べるとき、論文向けの数値を出すとき、学習の進み具合を追うときに使います。EleutherAI、HuggingFace、主要な研究機関が使っている業界標準です。HuggingFace、vLLM、API に対応しています。

## さっそく使う {#quick-start}

lm-evaluation-harness は、共通のプロンプトと指標を使って、60 を超える学術ベンチマークで LLM を評価します。

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

**使えるタスクを一覧する**:
```bash
lm-eval ls tasks
```

## よくある進め方 {#common-workflows}

### 進め方 1: 標準的なベンチマーク評価 {#workflow-1-standard-benchmark-evaluation}

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
- **MMLU**（Massive Multitask Language Understanding）- 57 分野、多肢選択
- **GSM8K** - 小学校レベルの算数の文章題
- **HellaSwag** - 常識推論
- **TruthfulQA** - 真実性と事実性
- **ARC**（AI2 Reasoning Challenge）- 理科の問題

**コードのベンチマーク**:
- **HumanEval** - Python のコード生成（164 問）
- **MBPP**（Mostly Basic Python Problems）- Python のコーディング

**標準的な組み合わせ**（モデルを公開するときにおすすめ）:
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

**量子化したモデル（4bit / 8bit）**:
```bash
lm_eval --model hf \
  --model_args pretrained=meta-llama/Llama-2-7b-hf,load_in_4bit=True \
  --tasks mmlu \
  --device cuda:0
```

**自前のチェックポイント**:
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

**ステップ 4: 結果を読む**

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

### 進め方 2: 学習の進み具合を追う {#workflow-2-track-training-progress}

学習中のチェックポイントを評価します。

```
Training Progress Tracking:
- [ ] Step 1: Set up periodic evaluation
- [ ] Step 2: Choose quick benchmarks
- [ ] Step 3: Automate evaluation
- [ ] Step 4: Plot learning curves
```

**ステップ 1: 定期的な評価を仕込む**

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

こまめに回すなら、次のような軽いベンチマークが向いています。
- **HellaSwag**: GPU 1 枚で 10 分ほど
- **GSM8K**: 5 分ほど
- **PIQA**: 2 分ほど

逆に、こまめな評価には向きません（時間がかかりすぎます）。
- **MMLU**: 2 時間ほど（57 分野）
- **HumanEval**: コードの実行が必要

**ステップ 3: 評価を自動化する**

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

### 進め方 3: 複数のモデルを比べる {#workflow-3-compare-multiple-models}

モデル比較のためのベンチマークの組み合わせです。

```
Model Comparison:
- [ ] Step 1: Define model list
- [ ] Step 2: Run evaluations
- [ ] Step 3: Generate comparison table
```

**ステップ 1: 対象モデルを並べる**

```bash
# models.txt
meta-llama/Llama-2-7b-hf
meta-llama/Llama-2-13b-hf
mistralai/Mistral-7B-v0.1
microsoft/phi-2
```

**ステップ 2: まとめて評価する**

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

出力例:
```
| Model                  | MMLU  | GSM8K | HELLASWAG | TRUTHFULQA |
|------------------------|-------|-------|-----------|------------|
| meta-llama/Llama-2-7b  | 0.459 | 0.142 | 0.765     | 0.391      |
| meta-llama/Llama-2-13b | 0.549 | 0.287 | 0.801     | 0.430      |
| mistralai/Mistral-7B   | 0.626 | 0.395 | 0.812     | 0.428      |
| microsoft/phi-2        | 0.560 | 0.613 | 0.682     | 0.447      |
```

### 進め方 4: vLLM で評価する（推論が速い） {#workflow-4-evaluate-with-vllm-faster-inference}

vLLM をバックエンドにすると、評価が 5〜10 倍速くなります。

```
vLLM Evaluation:
- [ ] Step 1: Install vLLM
- [ ] Step 2: Configure vLLM backend
- [ ] Step 3: Run evaluation
```

**ステップ 1: vLLM を導入する**

```bash
pip install vllm
```

**ステップ 2: vLLM をバックエンドに設定する**

```bash
lm_eval --model vllm \
  --model_args pretrained=meta-llama/Llama-2-7b-hf,tensor_parallel_size=1,dtype=auto,gpu_memory_utilization=0.8 \
  --tasks mmlu \
  --batch_size auto
```

**ステップ 3: 評価を実行する**

vLLM は、標準の HuggingFace より 5〜10 倍高速です。

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

**lm-evaluation-harness が向いている場面:**
- 論文向けにモデルをベンチマークする
- 標準的なタスクでモデルの品質を比べる
- 学習の進み具合を追う
- 統一された指標を報告する（誰もが同じプロンプトを使っています）
- 再現できる評価が必要

**ほかを使ったほうがよい場面:**
- **HELM**（Stanford）: より広い観点での評価（公平性、効率、較正）
- **AlpacaEval**: LLM を判定役にした指示追従の評価
- **MT-Bench**: 複数ターンの会話の評価
- **自作スクリプト**: 特定分野に絞った評価

## よくある困りごと {#common-issues}

**困りごと: 評価が遅すぎる**

vLLM をバックエンドにします。
```bash
lm_eval --model vllm \
  --model_args pretrained=model-name,tensor_parallel_size=2
```

または fewshot の例を減らします。
```bash
--num_fewshot 0  # Instead of 5
```

または MMLU の一部だけを評価します。
```bash
--tasks mmlu_stem  # Only STEM subjects
```

**困りごと: メモリが足りない**

バッチサイズを下げます。
```bash
--batch_size 1  # Or --batch_size auto
```

量子化を使います。
```bash
--model_args pretrained=model-name,load_in_8bit=True
```

CPU へのオフロードを有効にします。
```bash
--model_args pretrained=model-name,device_map=auto,offload_folder=offload
```

**困りごと: 公表されている数値と結果が食い違う**

fewshot の数を確かめます。
```bash
--num_fewshot 5  # Most papers use 5-shot
```

タスク名が正確か確かめます。
```bash
--tasks mmlu  # Not mmlu_direct or mmlu_fewshot
```

モデルとトークナイザーが対応しているか確かめます。
```bash
--model_args pretrained=model-name,tokenizer=same-model-name
```

**困りごと: HumanEval でコードが実行されない**

コードを実行するタスク（HumanEval、MBPP など）は明示的な確認フラグで守られています。実行するには `--confirm_run_unsafe_code` を渡す必要があります。

```bash
lm_eval --model hf \
  --model_args pretrained=model-name \
  --tasks humaneval \
  --confirm_run_unsafe_code  # Required to run tasks that execute generated code
```

このフラグがないと、lm-eval はコードの実行を黙って飛ばすのではなく、タスクの実行そのものを拒否します。

## 踏み込んだ話題 {#advanced-topics}

**ベンチマークの解説**: 60 を超えるタスクそれぞれの内容、何を測っているか、結果の読み方は [references/benchmark-guide.md](https://github.com/NousResearch/hermes-agent/blob/main/skills/mlops/evaluation/evaluating-llms-harness/references/benchmark-guide.md) にあります。

**自作タスク**: 特定分野向けの評価タスクを作る方法は [references/custom-tasks.md](https://github.com/NousResearch/hermes-agent/blob/main/skills/mlops/evaluation/evaluating-llms-harness/references/custom-tasks.md) にあります。

**API モデルの評価**: OpenAI、Anthropic などの API モデルを評価する方法は [references/api-evaluation.md](https://github.com/NousResearch/hermes-agent/blob/main/skills/mlops/evaluation/evaluating-llms-harness/references/api-evaluation.md) にあります。

**複数 GPU での戦略**: データ並列・テンソル並列での評価は [references/distributed-eval.md](https://github.com/NousResearch/hermes-agent/blob/main/skills/mlops/evaluation/evaluating-llms-harness/references/distributed-eval.md) にあります。

## 必要なハードウェア {#hardware-requirements}

- **GPU**: NVIDIA（CUDA 11.8 以上）。CPU でも動きますが非常に遅くなります
- **VRAM**:
  - 7B のモデル: 16GB（bf16）または 8GB（8bit）
  - 13B のモデル: 28GB（bf16）または 14GB（8bit）
  - 70B のモデル: 複数 GPU か量子化が必要
- **所要時間**（7B のモデル、A100 1 枚）:
  - HellaSwag: 10 分
  - GSM8K: 5 分
  - MMLU（全分野）: 2 時間
  - HumanEval: 20 分

## 参考情報 {#resources}

- GitHub: https://github.com/EleutherAI/lm-evaluation-harness
- ドキュメント: https://github.com/EleutherAI/lm-evaluation-harness/tree/main/docs
- タスク集: MMLU、GSM8K、HumanEval、TruthfulQA、HellaSwag、ARC、WinoGrande など 60 以上
- リーダーボード: https://huggingface.co/spaces/HuggingFaceH4/open_llm_leaderboard （この harness を使っています）
