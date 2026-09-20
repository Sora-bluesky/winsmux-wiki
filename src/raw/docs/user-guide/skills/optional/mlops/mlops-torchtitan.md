---
title: "Torchtitan — PyTorch の 4D 並列で LLM を大規模に事前学習する"
description: "PyTorch の 4D 並列で LLM を大規模に事前学習する"
upstream_path: user-guide/skills/optional/mlops/mlops-torchtitan.md
upstream_blob: 40a7b94a8750f5c94f057feec782d19c2d4c1065
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/mlops/mlops-torchtitan
---

# Torchtitan {#torchtitan}

PyTorch の 4D 並列で LLM を大規模に事前学習します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/mlops/torchtitan` で導入します |
| パス | `optional-skills/mlops/torchtitan` |
| バージョン | `1.0.1` |
| 作者 | Orchestra Research |
| ライセンス | MIT |
| 依存関係 | `torch>=2.6.0`, `torchtitan>=0.2.0`, `torchao>=0.5.0` |
| 対応プラットフォーム | linux, macos |
| タグ | `Model Architecture`, `Distributed Training`, `TorchTitan`, `FSDP2`, `Tensor Parallel`, `Pipeline Parallel`, `Context Parallel`, `Float8`, `Llama`, `Pretraining` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# TorchTitan - PyTorch 標準の分散 LLM 事前学習 {#torchtitan---pytorch-native-distributed-llm-pretraining}

## まず動かす {#quick-start}

TorchTitan は、組み合わせ可能な 4D 並列（FSDP2、TP、PP、CP）で大規模な LLM を事前学習するための PyTorch 公式の基盤です。H100 GPU では基準値に対して 65% 以上の高速化が出ています。

**インストール**:
```bash
# From PyPI (stable)
pip install torchtitan

# From source (latest features, requires PyTorch nightly)
git clone https://github.com/pytorch/torchtitan
cd torchtitan
pip install -r requirements.txt
```

**トークナイザーを取得する**:
```bash
# Get HF token from https://huggingface.co/settings/tokens
python scripts/download_hf_assets.py --repo_id meta-llama/Llama-3.1-8B --assets tokenizer --hf_token=...
```

**GPU 8 枚で学習を始める**:
```bash
# Configs are selected by name from the Python config registry
# (torchtitan/models/llama3/config_registry.py), not by TOML path
MODULE=llama3 CONFIG=llama3_8b ./run_train.sh
```

## よくある進め方 {#common-workflows}

### 進め方 1: 1 台のマシンで Llama 3.1 8B を事前学習する {#workflow-1-pretrain-llama-31-8b-on-single-node}

次のチェックリストをそのまま使ってください:

```
Single Node Pretraining:
- [ ] Step 1: Download tokenizer
- [ ] Step 2: Configure training
- [ ] Step 3: Launch training
- [ ] Step 4: Monitor and checkpoint
```

**手順 1: トークナイザーを取得する**

```bash
python scripts/download_hf_assets.py \
  --repo_id meta-llama/Llama-3.1-8B \
  --assets tokenizer \
  --hf_token=YOUR_HF_TOKEN
```

**手順 2: 学習の設定を書く**

いまの torchtitan では、実行時の設定は Python の **config registry**
（`torchtitan/models/llama3/config_registry.py`）に定義し、`CONFIG=<name>`
（または `--config <name>`）で名前を指定して選びます。内容を変えたいときは、自分の設定を registry に登録するか、
コマンドラインで個々の項目を上書きします（たとえば `--optimizer.lr 3e-4 --training.steps 1000`）。

8B の学習に相当する設定は次のようになります（項目として示しています。registry の登録内容に書くか、
`--section.key value` の上書きで渡してください）:

```toml
# fields for a llama3 8B run (register in config_registry.py or pass as --overrides)
[job]
dump_folder = "./outputs"
description = "Llama 3.1 8B training"

[model]
name = "llama3"
flavor = "8B"
hf_assets_path = "./assets/hf/Llama-3.1-8B"

[optimizer]
name = "AdamW"
lr = 3e-4

[lr_scheduler]
warmup_steps = 200

[training]
local_batch_size = 2
seq_len = 8192
max_norm = 1.0
steps = 1000
dataset = "c4"

[parallelism]
data_parallel_shard_degree = -1  # Use all GPUs for FSDP

[activation_checkpoint]
mode = "selective"
selective_ac_option = "op"

[checkpoint]
enable = true
folder = "checkpoint"
interval = 500
```

**手順 3: 学習を開始する**

```bash
# 8 GPUs on single node (config selected by name from the registry)
MODULE=llama3 CONFIG=llama3_8b ./run_train.sh

# Override individual fields on the command line
MODULE=llama3 CONFIG=llama3_8b ./run_train.sh --optimizer.lr 3e-4 --training.steps 1000

# Or explicitly with torchrun (run_train.sh wraps this)
torchrun --nproc_per_node=8 \
  -m torchtitan.train \
  --module llama3 --config llama3_8b
```

**手順 4: 経過を見てチェックポイントを残す**

TensorBoard のログは `./outputs/tb/` に保存されます:
```bash
tensorboard --logdir ./outputs/tb
```

### 進め方 2: SLURM を使った複数マシンでの学習 {#workflow-2-multi-node-training-with-slurm}

```
Multi-Node Training:
- [ ] Step 1: Configure parallelism for scale
- [ ] Step 2: Set up SLURM script
- [ ] Step 3: Submit job
- [ ] Step 4: Resume from checkpoint
```

**手順 1: 規模に合わせて並列の設定を決める**

70B のモデルを GPU 256 枚（32 ノード）で動かす場合:
```toml
[parallelism]
data_parallel_shard_degree = 32  # FSDP across 32 ranks
tensor_parallel_degree = 8        # TP within node
pipeline_parallel_degree = 1      # No PP for 70B
context_parallel_degree = 1       # Increase for long sequences
```

**手順 2: SLURM 用のスクリプトを用意する**

```bash
#!/bin/bash
#SBATCH --job-name=llama70b
#SBATCH --nodes=32
#SBATCH --ntasks-per-node=8
#SBATCH --gpus-per-node=8

srun torchrun \
  --nnodes=32 \
  --nproc_per_node=8 \
  --rdzv_backend=c10d \
  --rdzv_endpoint=$MASTER_ADDR:$MASTER_PORT \
  -m torchtitan.train \
  --module llama3 --config llama3_70b
```

**手順 3: ジョブを投入する**

```bash
sbatch multinode_trainer.slurm
```

**手順 4: チェックポイントから再開する**

設定したフォルダーにチェックポイントがあれば、学習は自動で再開します。

### 進め方 3: H100 向けに Float8 学習を有効にする {#workflow-3-enable-float8-training-for-h100s}

Float8 を使うと H100 GPU で 30〜50% 速くなります。

```
Float8 Training:
- [ ] Step 1: Install torchao
- [ ] Step 2: Configure Float8
- [ ] Step 3: Launch with compile
```

**手順 1: torchao を入れる**

```bash
USE_CPP=0 pip install git+https://github.com/pytorch/ao.git
```

**手順 2: Float8 の設定を書く**

いまの torchtitan では、Float8 は config registry の中の `model_registry()` 呼び出しにある `quantization`
引数で設定時に適用します（`[quantize.linear.float8]` の TOML セクションではありません）。
`Float8LinearConverter.Config` を足してください:

```python
# in torchtitan/models/llama3/config_registry.py (your model_registry(...) call)
from torchtitan.components.quantization import Float8LinearConverter

model_spec = model_registry(
    "8B",
    quantization=[
        Float8LinearConverter.Config(
            recipe_name="rowwise",          # or "rowwise_with_gw_hp"
            filter_fqns=["output"],          # skip layers too small to benefit
            model_compile_enabled=True,      # requires torch.compile for competitive perf
        ),
    ],
)
```

実行用の設定でも `torch.compile` を有効にしておきます:
```toml
[compile]
enable = true
components = ["model", "loss"]
```

**手順 3: compile を有効にして起動する**

```bash
# Float8 config is baked into the registered config; just select it and enable compile
MODULE=llama3 CONFIG=llama3_8b ./run_train.sh --compile.enable
```

### 進め方 4: 405B のモデルを 4D 並列で動かす {#workflow-4-4d-parallelism-for-405b-models}

```
4D Parallelism (FSDP + TP + PP + CP):
- [ ] Step 1: Create seed checkpoint
- [ ] Step 2: Configure 4D parallelism
- [ ] Step 3: Launch on 512 GPUs
```

**手順 1: シードとなるチェックポイントを作る**

PP の各ステージで初期値をそろえるために必要です:
```bash
NGPU=1 MODULE=llama3 CONFIG=llama3_405b ./run_train.sh \
  --checkpoint.enable \
  --checkpoint.create_seed_checkpoint \
  --parallelism.data_parallel_shard_degree 1 \
  --parallelism.tensor_parallel_degree 1 \
  --parallelism.pipeline_parallel_degree 1
```

**手順 2: 4D 並列の設定を書く**

```toml
[parallelism]
data_parallel_shard_degree = 8   # FSDP
tensor_parallel_degree = 8       # TP within node
pipeline_parallel_degree = 8     # PP across nodes
context_parallel_degree = 1      # CP for long sequences

[training]
local_batch_size = 32
seq_len = 8192
```

**手順 3: GPU 512 枚で起動する**

```bash
# 64 nodes x 8 GPUs = 512 GPUs
srun torchrun --nnodes=64 --nproc_per_node=8 \
  -m torchtitan.train \
  --module llama3 --config llama3_405b
```

## 使いどころと他の選択肢 {#when-to-use-vs-alternatives}

**TorchTitan が向いているとき:**
- LLM をゼロから事前学習する（8B から 405B 以上まで）
- 第三者のライブラリに頼らず、PyTorch 標準の仕組みで済ませたい
- 組み合わせ可能な 4D 並列（FSDP2、TP、PP、CP）が必要
- Float8 対応の H100 で学習する
- torchtune や HuggingFace とやり取りできるチェックポイントがほしい

**別のものを選んだほうがよいとき:**
- **Megatron-LM**: NVIDIA 環境だけで、性能を限界まで出したい場合
- **DeepSpeed**: ZeRO まわりの最適化が幅広く、推論にも対応
- **Axolotl/TRL**: 事前学習ではなくファインチューニング
- **LitGPT**: 学習用途で、小さめの規模の学習

## つまずきやすいところ {#common-issues}

**症状: 大きなモデルでメモリが足りない**

活性化チェックポイントを有効にして、バッチサイズを下げます:
```toml
[activation_checkpoint]
mode = "full"  # Instead of "selective"

[training]
local_batch_size = 1
```

もしくは勾配の累積を使います:
```toml
[training]
local_batch_size = 1
global_batch_size = 32  # Accumulates gradients
```

**症状: 非同期の集団通信で TP のメモリ使用量が増える**

環境変数を設定します:
```bash
export TORCH_NCCL_AVOID_RECORD_STREAMS=1
```

**症状: Float8 にしても速くならない**

Float8 が効くのは大きな GEMM だけです。コンバーターの `filter_fqns` で小さい層を除外してください:
```python
from torchtitan.components.quantization import Float8LinearConverter

Float8LinearConverter.Config(
    # add "auto_filter_small_kn" to auto-skip layers too small to benefit
    filter_fqns=["attention.wk", "attention.wv", "output", "auto_filter_small_kn"],
    model_compile_enabled=True,
)
```

**症状: 並列の構成を変えたらチェックポイントを読み込めなくなった**

DCP の再シャーディング機能を使います:
```bash
# Convert sharded checkpoint to single file
python -m torch.distributed.checkpoint.format_utils \
  dcp_to_torch checkpoint/step-1000 checkpoint.pt
```

**症状: パイプライン並列の初期化でつまずく**

先にシードとなるチェックポイントを作ってください（進め方 4 の手順 1 を参照）。

## 対応しているモデル {#supported-models}

| モデル | サイズ | 状態 |
|-------|-------|--------|
| Llama 3.1 | 8B, 70B, 405B | 実運用向け |
| Llama 4 | 各種 | 実験的 |
| DeepSeek V3 | 16B, 236B, 671B (MoE) | 実験的 |
| GPT-OSS | 20B, 120B (MoE) | 実験的 |
| Qwen 3 | 各種 | 実験的 |
| Flux | Diffusion | 実験的 |

## 性能の実測値（H100） {#performance-benchmarks-h100}

| モデル | GPU 数 | 並列の構成 | TPS/GPU | 使った技術 |
|-------|------|-------------|---------|------------|
| Llama 8B | 8 | FSDP | 5,762 | 基準値 |
| Llama 8B | 8 | FSDP+compile+FP8 | 8,532 | +48% |
| Llama 70B | 256 | FSDP+TP+AsyncTP | 876 | 2D 並列 |
| Llama 405B | 512 | FSDP+TP+PP | 128 | 3D 並列 |

## さらに踏み込んだ話題 {#advanced-topics}

**FSDP2 の設定**: FSDP2 と FSDP1 の詳しい比較や ZeRO との対応は [references/fsdp.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops/torchtitan/references/fsdp.md) を参照してください。

**Float8 学習**: テンソル単位とロー単位のスケーリング方法は [references/float8.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops/torchtitan/references/float8.md) を参照してください。

**チェックポイント**: HuggingFace 形式への変換や非同期のチェックポイントは [references/checkpoint.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops/torchtitan/references/checkpoint.md) を参照してください。

**独自モデルの追加**: TrainSpec の仕組みは [references/custom-models.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops/torchtitan/references/custom-models.md) を参照してください。

## 参考リンク {#resources}

- GitHub: https://github.com/pytorch/torchtitan
- 論文: https://arxiv.org/abs/2410.06511
- ICLR 2025: https://iclr.cc/virtual/2025/poster/29620
- PyTorch フォーラム: https://discuss.pytorch.org/c/distributed/torchtitan/44
