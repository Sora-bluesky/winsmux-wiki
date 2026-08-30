---
title: "Simpo — 参照モデルなしで好みに合わせる、DPO より手軽な手法"
description: "参照モデルなしで好みに合わせる、DPO より手軽な手法"
upstream_path: user-guide/skills/optional/mlops/mlops-simpo.md
upstream_blob: a7736fd510761e3fb4d463f6f3da9796b230ba37
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/mlops/mlops-simpo
---

# Simpo {#simpo}

参照モデルなしで好みに合わせる、DPO より手軽な手法です。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/mlops/simpo` で導入します |
| パス | `optional-skills/mlops\simpo` |
| バージョン | `1.0.0` |
| 作者 | Orchestra Research |
| ライセンス | MIT |
| 依存関係 | `torch`, `transformers`, `datasets`, `trl`, `accelerate` |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Post-Training`, `SimPO`, `Preference Optimization`, `Alignment`, `DPO Alternative`, `Reference-Free`, `LLM Alignment`, `Efficient Training` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# SimPO - Simple Preference Optimization {#simpo---simple-preference-optimization}

## すぐ試す {#quick-start}

SimPO は参照モデルを必要としない好み最適化の手法で、参照モデルなしでも DPO を上回る成績を出します。

**導入**:
```bash
# Create environment
conda create -n simpo python=3.10 && conda activate simpo

# Install PyTorch 2.2.2
# Visit: https://pytorch.org/get-started/locally/

# Install alignment-handbook
git clone https://github.com/huggingface/alignment-handbook.git
cd alignment-handbook
python -m pip install .

# Install Flash Attention 2
python -m pip install flash-attn --no-build-isolation
```

**学習**（Mistral 7B の場合）:
```bash
ACCELERATE_LOG_LEVEL=info accelerate launch \
  --config_file accelerate_configs/deepspeed_zero3.yaml \
  scripts/run_simpo.py \
  training_configs/mistral-7b-base-simpo.yaml
```

## よくある使い方 {#common-workflows}

### ワークフロー 1: ベースモデルから学習する（Mistral 7B） {#workflow-1-train-from-base-model-mistral-7b}

**設定ファイル**（`mistral-7b-base-simpo.yaml`）:
```yaml
# Model
model_name_or_path: mistralai/Mistral-7B-v0.1
torch_dtype: bfloat16

# Dataset
dataset_mixer:
  HuggingFaceH4/ultrafeedback_binarized: 1.0
dataset_splits:
  - train_prefs
  - test_prefs

# SimPO hyperparameters
beta: 2.0                  # Reward scaling (2.0-10.0)
gamma_beta_ratio: 0.5       # Target margin (0-1)
loss_type: sigmoid          # sigmoid or hinge
sft_weight: 0.0             # Optional SFT regularization

# Training
learning_rate: 5e-7         # Critical: 3e-7 to 1e-6
num_train_epochs: 1
per_device_train_batch_size: 1
gradient_accumulation_steps: 8

# Output
output_dir: ./outputs/mistral-7b-simpo
```

**学習を始める**:
```bash
accelerate launch --config_file accelerate_configs/deepspeed_zero3.yaml \
  scripts/run_simpo.py training_configs/mistral-7b-base-simpo.yaml
```

### ワークフロー 2: 指示追従モデルを微調整する（Llama 3 8B） {#workflow-2-fine-tune-instruct-model-llama-3-8b}

**設定ファイル**（`llama3-8b-instruct-simpo.yaml`）:
```yaml
model_name_or_path: meta-llama/Meta-Llama-3-8B-Instruct

dataset_mixer:
  argilla/ultrafeedback-binarized-preferences-cleaned: 1.0

beta: 2.5
gamma_beta_ratio: 0.5
learning_rate: 5e-7
sft_weight: 0.1             # Add SFT loss to preserve capabilities

num_train_epochs: 1
per_device_train_batch_size: 2
gradient_accumulation_steps: 4
output_dir: ./outputs/llama3-8b-simpo
```

**実行する**:
```bash
accelerate launch --config_file accelerate_configs/deepspeed_zero3.yaml \
  scripts/run_simpo.py training_configs/llama3-8b-instruct-simpo.yaml
```

### ワークフロー 3: 推論を要する課題（学習率を下げる） {#workflow-3-reasoning-intensive-tasks-lower-lr}

**数学やコードの課題向け**:
```yaml
model_name_or_path: deepseek-ai/deepseek-math-7b-base

dataset_mixer:
  argilla/distilabel-math-preference-dpo: 1.0

beta: 5.0                   # Higher for stronger signal
gamma_beta_ratio: 0.7       # Larger margin
learning_rate: 3e-7         # Lower LR for reasoning
sft_weight: 0.0

num_train_epochs: 1
per_device_train_batch_size: 1
gradient_accumulation_steps: 16
```

## 他の手法との使い分け {#when-to-use-vs-alternatives}

**SimPO が向いているとき**:
- DPO よりも手軽に学習したい（参照モデルが要りません）
- 好みのデータ（選ばれた応答と退けられた応答の組）がある
- DPO より良い成績がほしい
- 使える計算資源が限られている
- 1 台のマシンでの学習で足りる

**手法の選び方**:
- **SimPO**: いちばん手軽で成績も良く、参照モデルが要りません
- **DPO**: 参照モデルを基準にしたいとき。より控えめな挙動になります
- **PPO**: いちばん細かく制御できます。報酬モデルが必要で、準備も大がかりです
- **GRPO**: メモリに優しい強化学習で、critic が要りません

**別のものを使ったほうがよいとき**:
- **OpenRLHF**: 複数の端末に分散した学習、PPO や GRPO を使いたいとき
- **TRL**: 複数の手法を一つの枠組みで扱いたいとき
- **DPO**: 定番の基準として比べたいとき

## よくある問題 {#common-issues}

**問題: 損失が発散する**

学習率を下げます。
```yaml
learning_rate: 3e-7  # Reduce from 5e-7
```

beta を下げます。
```yaml
beta: 1.0  # Reduce from 2.0
```

**問題: もともとできていたことを忘れてしまう**

SFT の正則化を加えます。
```yaml
sft_weight: 0.1  # Add SFT loss component
```

**問題: 好みの差がうまくつかない**

beta とマージンを上げます。
```yaml
beta: 5.0            # Increase from 2.0
gamma_beta_ratio: 0.8  # Increase from 0.5
```

**問題: 学習中にメモリが足りない**

バッチサイズを下げます。
```yaml
per_device_train_batch_size: 1
gradient_accumulation_steps: 16  # Maintain effective batch
```

勾配チェックポイントを有効にします。
```yaml
gradient_checkpointing: true
```

## 進んだ話題 {#advanced-topics}

**損失関数**: sigmoid と hinge の違い、数式、どちらをいつ使うかは [references/loss-functions.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops\simpo/references/loss-functions.md) を参照してください。

**ハイパーパラメータの調整**: beta、gamma、学習率の選び方と、モデルの大きさごとのおすすめは [references/hyperparameters.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops\simpo/references/hyperparameters.md) を参照してください。

**データの準備**: 好みデータの形式、質でのふるい分け、自前のデータセットの作り方は [references/datasets.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops\simpo/references/datasets.md) を参照してください。

## 必要なハードウェア {#hardware-requirements}

- **GPU**: NVIDIA A100 か H100 をおすすめします
- **VRAM**:
  - 7B モデル: A100 40GB × 1（DeepSpeed ZeRO-3）
  - 8B モデル: A100 40GB × 2
  - 70B モデル: A100 80GB × 8
- **1 台構成**: DeepSpeed ZeRO-3 で足ります
- **混合精度**: BF16 をおすすめします

**メモリの節約**:
- DeepSpeed ZeRO-3（既定の設定）
- 勾配チェックポイント
- Flash Attention 2

## 参考情報 {#resources}

- 論文: https://arxiv.org/abs/2405.14734 （NeurIPS 2024）
- GitHub: https://github.com/princeton-nlp/SimPO
- モデル: https://huggingface.co/princeton-nlp
- Alignment Handbook: https://github.com/huggingface/alignment-handbook
