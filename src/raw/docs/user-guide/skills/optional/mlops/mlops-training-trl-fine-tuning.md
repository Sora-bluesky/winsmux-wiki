---
title: "Trl Fine Tuning — TRL: LLM の RLHF に使う SFT、DPO、GRPO、RLOO と報酬モデリング"
description: "TRL: LLM の RLHF に使う SFT、DPO、GRPO、RLOO と報酬モデリング"
upstream_path: user-guide/skills/optional/mlops/mlops-training-trl-fine-tuning.md
upstream_blob: d46746137ad327c1289134659272e02c0482f576
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/mlops/mlops-training-trl-fine-tuning
---

# Trl Fine Tuning {#trl-fine-tuning}

TRL: LLM の RLHF に使う SFT、DPO、GRPO、RLOO と報酬モデリングです。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/mlops/trl-fine-tuning` で導入します |
| パス | `optional-skills/mlops/training/trl-fine-tuning` |
| バージョン | `1.0.1` |
| 作者 | Orchestra Research |
| ライセンス | MIT |
| 依存関係 | `trl`, `transformers`, `datasets`, `peft`, `accelerate`, `torch` |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Post-Training`, `TRL`, `Reinforcement Learning`, `Fine-Tuning`, `SFT`, `DPO`, `GRPO`, `RLOO`, `RLHF`, `Preference Alignment`, `HuggingFace` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# TRL - Transformer Reinforcement Learning {#trl---transformer-reinforcement-learning}

## まず動かす {#quick-start}

TRL には、言語モデルを人間の好みに合わせるための学習後の手法がそろっています。

**インストール**:
```bash
pip install trl transformers datasets peft accelerate
```

**教師ありファインチューニング**（指示への追従を学ばせる）:
```python
from trl import SFTTrainer

trainer = SFTTrainer(
    model="Qwen/Qwen2.5-0.5B",
    train_dataset=dataset,  # Prompt-completion pairs
)
trainer.train()
```

**DPO**（好みに合わせる）:
```python
from trl import DPOTrainer, DPOConfig

config = DPOConfig(output_dir="model-dpo", beta=0.1)
trainer = DPOTrainer(
    model=model,
    args=config,
    train_dataset=preference_dataset,  # chosen/rejected pairs
    processing_class=tokenizer
)
trainer.train()
```

## よくある進め方 {#common-workflows}

### 進め方 1: RLHF のひととおりの流れ（SFT → 報酬モデル → RLOO） {#workflow-1-full-rlhf-pipeline-sft-reward-model-rloo}

ベースのモデルから、人間の好みに合ったモデルまでを通しで作ります。

> **補足（TRL 1.x）:** PPO は TRL から **削除されました** — `PPOTrainer`、`PPOConfig`、
> `python -m trl.scripts.ppo` はもうありません。TRL に残っているオンライン RL の学習器を使ってください。
> 報酬モデルを使う RLHF の流れなら **RLOO**（`RLOOTrainer` / `trl rloo`）がいちばん近い置き換えで、
> メモリを節約したいなら **GRPO**（`GRPOTrainer` / `trl grpo`、進め方 3 を参照）が選択肢になります。
> 以下の手順では RLOO を使います。

次のチェックリストをそのまま使ってください:

```
RLHF Training:
- [ ] Step 1: Supervised fine-tuning (SFT)
- [ ] Step 2: Train reward model
- [ ] Step 3: RLOO reinforcement learning
- [ ] Step 4: Evaluate aligned model
```

**手順 1: 教師ありファインチューニング**

指示に従うデータでベースのモデルを学習させます:

```python
from transformers import AutoModelForCausalLM, AutoTokenizer
from trl import SFTTrainer, SFTConfig
from datasets import load_dataset

# Load model
model = AutoModelForCausalLM.from_pretrained("Qwen/Qwen2.5-0.5B")
tokenizer = AutoTokenizer.from_pretrained("Qwen/Qwen2.5-0.5B")

# Load instruction dataset
dataset = load_dataset("trl-lib/Capybara", split="train")

# Configure training
training_args = SFTConfig(
    output_dir="Qwen2.5-0.5B-SFT",
    per_device_train_batch_size=4,
    num_train_epochs=1,
    learning_rate=2e-5,
    logging_steps=10,
    save_strategy="epoch"
)

# Train
trainer = SFTTrainer(
    model=model,
    args=training_args,
    train_dataset=dataset,
    processing_class=tokenizer
)
trainer.train()
trainer.save_model()
```

**手順 2: 報酬モデルを学習する**

人間の好みを予測するモデルを学習させます:

```python
from transformers import AutoModelForSequenceClassification
from trl import RewardTrainer, RewardConfig

# Load SFT model as base
model = AutoModelForSequenceClassification.from_pretrained(
    "Qwen2.5-0.5B-SFT",
    num_labels=1  # Single reward score
)
tokenizer = AutoTokenizer.from_pretrained("Qwen2.5-0.5B-SFT")

# Load preference data (chosen/rejected pairs)
dataset = load_dataset("trl-lib/ultrafeedback_binarized", split="train")

# Configure training
training_args = RewardConfig(
    output_dir="Qwen2.5-0.5B-Reward",
    per_device_train_batch_size=2,
    num_train_epochs=1,
    learning_rate=1e-5
)

# Train reward model
trainer = RewardTrainer(
    model=model,
    args=training_args,
    processing_class=tokenizer,
    train_dataset=dataset
)
trainer.train()
trainer.save_model()
```

**手順 3: RLOO による強化学習**

報酬モデルを使って方策を最適化します。PPO は TRL 1.x で削除されたので、学習済みの報酬モデルを
`--reward_model_name_or_path` で渡して RLOO のコマンド（`trl rloo`）を使ってください:

```bash
trl rloo \
    --model_name_or_path Qwen2.5-0.5B-SFT \
    --reward_model_name_or_path Qwen2.5-0.5B-Reward \
    --dataset_name trl-internal-testing/descriptiveness-sentiment-trl-style \
    --output_dir Qwen2.5-0.5B-RLOO \
    --learning_rate 3e-6 \
    --per_device_train_batch_size 64 \
    --num_generations 4
```

同じことを Python で書くと次のようになります（`RLOOTrainer` / `RLOOConfig`）:
```python
from trl import RLOOTrainer, RLOOConfig
from transformers import AutoModelForSequenceClassification, AutoTokenizer

reward_model = AutoModelForSequenceClassification.from_pretrained(
    "Qwen2.5-0.5B-Reward", num_labels=1
)

config = RLOOConfig(
    output_dir="Qwen2.5-0.5B-RLOO",
    per_device_train_batch_size=64,
    learning_rate=3e-6,
    num_generations=4,
)

trainer = RLOOTrainer(
    model="Qwen2.5-0.5B-SFT",
    reward_funcs=reward_model,   # a reward model (or a callable reward function)
    args=config,
    train_dataset=dataset,       # prompt-only dataset
    processing_class=tokenizer,
)
trainer.train()
```

**手順 4: 評価する**

```python
from transformers import pipeline

# Load aligned model
generator = pipeline("text-generation", model="Qwen2.5-0.5B-RLOO")

# Test
prompt = "Explain quantum computing to a 10-year-old"
output = generator(prompt, max_length=200)[0]["generated_text"]
print(output)
```

### 進め方 2: DPO で手軽に好みへ合わせる {#workflow-2-simple-preference-alignment-with-dpo}

報酬モデルを使わずに、モデルを好みへ合わせます。

次のチェックリストをそのまま使ってください:

```
DPO Training:
- [ ] Step 1: Prepare preference dataset
- [ ] Step 2: Configure DPO
- [ ] Step 3: Train with DPOTrainer
- [ ] Step 4: Evaluate alignment
```

**手順 1: 好みのデータを用意する**

データの形式:
```json
{
  "prompt": "What is the capital of France?",
  "chosen": "The capital of France is Paris.",
  "rejected": "I don't know."
}
```

データを読み込みます:
```python
from datasets import load_dataset

dataset = load_dataset("trl-lib/ultrafeedback_binarized", split="train")
# Or load your own
# dataset = load_dataset("json", data_files="preferences.json")
```

**手順 2: DPO の設定を書く**

```python
from trl import DPOConfig

config = DPOConfig(
    output_dir="Qwen2.5-0.5B-DPO",
    per_device_train_batch_size=4,
    num_train_epochs=1,
    learning_rate=5e-7,
    beta=0.1,  # KL penalty strength
    max_prompt_length=512,
    max_length=1024,
    logging_steps=10
)
```

**手順 3: DPOTrainer で学習する**

```python
from transformers import AutoModelForCausalLM, AutoTokenizer
from trl import DPOTrainer

model = AutoModelForCausalLM.from_pretrained("Qwen/Qwen2.5-0.5B-Instruct")
tokenizer = AutoTokenizer.from_pretrained("Qwen/Qwen2.5-0.5B-Instruct")

trainer = DPOTrainer(
    model=model,
    args=config,
    train_dataset=dataset,
    processing_class=tokenizer
)

trainer.train()
trainer.save_model()
```

**コマンドで済ませる場合**:
```bash
trl dpo \
    --model_name_or_path Qwen/Qwen2.5-0.5B-Instruct \
    --dataset_name argilla/Capybara-Preferences \
    --output_dir Qwen2.5-0.5B-DPO \
    --per_device_train_batch_size 4 \
    --learning_rate 5e-7 \
    --beta 0.1
```

### 進め方 3: GRPO でメモリを節約しながらオンライン RL を回す {#workflow-3-memory-efficient-online-rl-with-grpo}

わずかなメモリで強化学習をします。

報酬関数の設計、学習で押さえておくべき勘所（損失の動き、モード崩壊、調整の仕方）、多段の高度な進め方など、GRPO を掘り下げた内容は **[references/grpo-training.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops/training/trl-fine-tuning/references/grpo-training.md)** にあります。そのまま実運用に使える学習スクリプトは **[templates/basic_grpo_training.py](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops/training/trl-fine-tuning/templates/basic_grpo_training.py)** です。

次のチェックリストをそのまま使ってください:

```
GRPO Training:
- [ ] Step 1: Define reward function
- [ ] Step 2: Configure GRPO
- [ ] Step 3: Train with GRPOTrainer
```

**手順 1: 報酬関数を定義する**

```python
def reward_function(completions, **kwargs):
    """
    Compute rewards for completions.

    Args:
        completions: List of generated texts

    Returns:
        List of reward scores (floats)
    """
    rewards = []
    for completion in completions:
        # Example: reward based on length and unique words
        score = len(completion.split())  # Favor longer responses
        score += len(set(completion.lower().split()))  # Reward unique words
        rewards.append(score)
    return rewards
```

報酬モデルを使うこともできます:
```python
from transformers import pipeline

reward_model = pipeline("text-classification", model="reward-model-path")

def reward_from_model(completions, prompts, **kwargs):
    # Combine prompt + completion
    full_texts = [p + c for p, c in zip(prompts, completions)]
    # Get reward scores
    results = reward_model(full_texts)
    return [r["score"] for r in results]
```

**手順 2: GRPO の設定を書く**

```python
from trl import GRPOConfig

config = GRPOConfig(
    output_dir="Qwen2-GRPO",
    per_device_train_batch_size=4,
    num_train_epochs=1,
    learning_rate=1e-5,
    num_generations=4,  # Generate 4 completions per prompt
    max_new_tokens=128
)
```

**手順 3: GRPOTrainer で学習する**

```python
from datasets import load_dataset
from trl import GRPOTrainer

# Load prompt-only dataset
dataset = load_dataset("trl-lib/tldr", split="train")

trainer = GRPOTrainer(
    model="Qwen/Qwen2-0.5B-Instruct",
    reward_funcs=reward_function,  # Your reward function
    args=config,
    train_dataset=dataset
)

trainer.train()
```

**コマンド**:
```bash
trl grpo \
    --model_name_or_path Qwen/Qwen2-0.5B-Instruct \
    --dataset_name trl-lib/tldr \
    --output_dir Qwen2-GRPO \
    --num_generations 4
```

## 使いどころと他の選択肢 {#when-to-use-vs-alternatives}

**TRL が向いているとき:**
- モデルを人間の好みに合わせたい
- 好みのデータ（chosen/rejected の組）が手元にある
- 強化学習（RLOO、GRPO）を使いたい
- 報酬モデルを学習させたい
- RLHF をひととおり回したい

**手法の選び方**:
- **SFT**: プロンプトと応答の組があり、まず指示に従わせたいとき
- **DPO**: 好みのデータがあり、手軽に合わせたいとき（報酬モデルは不要）
- **RLOO**: 報酬モデルがあり、オンライン RL を回したいとき（報酬モデルを使う RLHF の道筋。PPO は TRL 1.x で削除されました）
- **GRPO**: メモリに余裕がなく、報酬関数でオンライン RL を回したいとき
- **報酬モデル**: RLHF の流れを組んでいて、生成結果に点数を付ける必要があるとき

**別のものを選んだほうがよいとき:**
- **HuggingFace Trainer**: 強化学習を使わない基本的なファインチューニング
- **Axolotl**: YAML で学習の設定を書きたい場合
- **LitGPT**: 学習用途で、最小限のファインチューニング
- **Unsloth**: LoRA を速く回したい場合

## つまずきやすいところ {#common-issues}

**症状: DPO の学習中にメモリが足りなくなる**

バッチサイズと系列長を下げます:
```python
config = DPOConfig(
    per_device_train_batch_size=1,  # Reduce from 4
    max_length=512,  # Reduce from 1024
    gradient_accumulation_steps=8  # Maintain effective batch
)
```

もしくは勾配チェックポイントを使います:
```python
model.gradient_checkpointing_enable()
```

**症状: 好みへの合わせ方が今ひとつ**

beta の値を調整します:
```python
# Higher beta = more conservative (stays closer to reference)
config = DPOConfig(beta=0.5)  # Default 0.1

# Lower beta = more aggressive alignment
config = DPOConfig(beta=0.01)
```

**症状: 報酬モデルが学習しない**

損失の種類と学習率を確認します:
```python
config = RewardConfig(
    learning_rate=1e-5,  # Try different LR
    num_train_epochs=3  # Train longer
)
```

好みのデータで、どちらが良いかがはっきりしているかを確かめます:
```python
# Verify dataset
print(dataset[0])
# Should have clear chosen > rejected
```

**症状: オンライン RL（RLOO/GRPO）の学習が安定しない**

参照方策に対する KL / beta の正則化を調整します:
```python
from trl import RLOOConfig

config = RLOOConfig(
    beta=0.05,          # KL coefficient toward the reference model (increase for stability)
    num_generations=4,  # more samples per prompt = lower-variance advantage estimates
)
```

## さらに踏み込んだ話題 {#advanced-topics}

**SFT の手引き**: データの形式、チャットテンプレート、パッキングの方針、複数 GPU での学習は [references/sft-training.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops/training/trl-fine-tuning/references/sft-training.md) を参照してください。

**DPO の派生手法**: IPO、cDPO、RPO などの DPO 系の損失関数と、推奨されるハイパーパラメータは [references/dpo-variants.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops/training/trl-fine-tuning/references/dpo-variants.md) を参照してください。

**報酬モデリング**: 結果に対する報酬と過程に対する報酬の違い、Bradley-Terry の損失、報酬モデルの評価は [references/reward-modeling.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops/training/trl-fine-tuning/references/reward-modeling.md) を参照してください。

**オンライン RL の手法**: PPO、GRPO、RLOO、OnlineDPO の詳しい設定は [references/online-rl.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops/training/trl-fine-tuning/references/online-rl.md) を参照してください。

**GRPO の掘り下げ**: 報酬関数の設計の考え方、学習の勘所（損失が増える理由、モード崩壊の見つけ方）、ハイパーパラメータの調整、多段での学習、困ったときの対処など、踏み込んだ内容は [references/grpo-training.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops/training/trl-fine-tuning/references/grpo-training.md) を参照してください。そのまま実運用に使えるひな形は [templates/basic_grpo_training.py](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops/training/trl-fine-tuning/templates/basic_grpo_training.py) にあります。

## 必要なハードウェア {#hardware-requirements}

- **GPU**: NVIDIA（CUDA が必要）
- **VRAM**: モデルと手法によって変わります
  - SFT 7B: 16GB（LoRA を使う場合）
  - DPO 7B: 24GB（参照モデルを保持するため）
  - RLOO 7B: 40GB（方策と報酬モデル）
  - GRPO 7B: 24GB（メモリ効率がよい）
- **複数 GPU**: `accelerate` で対応
- **混合精度**: BF16 を推奨（A100/H100）

**メモリを節約するには**:
- どの手法でも LoRA/QLoRA を使う
- 勾配チェックポイントを有効にする
- バッチサイズを小さくして勾配を累積する

## 参考リンク {#resources}

- ドキュメント: https://huggingface.co/docs/trl/
- GitHub: https://github.com/huggingface/trl
- 論文:
  - "Training language models to follow instructions with human feedback"（InstructGPT、2022）
  - "Direct Preference Optimization: Your Language Model is Secretly a Reward Model"（DPO、2023）
  - "Group Relative Policy Optimization"（GRPO、2024）
- 例: https://github.com/huggingface/trl/tree/main/examples/scripts
