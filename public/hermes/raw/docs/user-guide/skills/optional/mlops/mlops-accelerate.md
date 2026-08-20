---
title: "Accelerate — PyTorch の学習を、ほとんど書き換えずに複数の GPU で走らせる"
description: "PyTorch の学習を、ほとんど書き換えずに複数の GPU で走らせる"
upstream_path: user-guide/skills/optional/mlops/mlops-accelerate.md
upstream_blob: ef74ff473a946d106cdb74242c666e2e36cfac0c
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/mlops/mlops-accelerate
---

# Accelerate {#accelerate}

PyTorch の学習を、ほとんど書き換えずに複数の GPU で走らせます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/mlops/accelerate` で導入します |
| パス | `optional-skills/mlops/accelerate` |
| バージョン | `1.0.1` |
| 作者 | Orchestra Research |
| ライセンス | MIT |
| 依存関係 | `accelerate`, `torch`, `transformers` |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Distributed Training`, `HuggingFace`, `Accelerate`, `DeepSpeed`, `FSDP`, `Mixed Precision`, `PyTorch`, `DDP`, `Unified API`, `Simple` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# HuggingFace Accelerate - Unified Distributed Training {#huggingface-accelerate---unified-distributed-training}

## すぐ試す {#quick-start}

Accelerate を使うと、複数の計算機やGPUに分けて学習させる仕組みが、たった 4 行で書けます。

**導入**:
```bash
pip install accelerate
```

**PyTorch のスクリプトを書き換える**（4 行）:
```python

+ from accelerate import Accelerator

+ accelerator = Accelerator()

  model = torch.nn.Transformer()
  optimizer = torch.optim.Adam(model.parameters())
  dataloader = torch.utils.data.DataLoader(dataset)

+ model, optimizer, dataloader = accelerator.prepare(model, optimizer, dataloader)

  for batch in dataloader:
      optimizer.zero_grad()
      loss = model(batch)
-     loss.backward()
+     accelerator.backward(loss)
      optimizer.step()
```

**走らせる**（コマンドはひとつ）:
```bash
accelerate launch train.py
```

## よくある進め方 {#common-workflows}

### 進め方 1: GPU 1 枚から複数枚へ {#workflow-1-from-single-gpu-to-multi-gpu}

**もとのスクリプト**:
```python
# train.py

model = torch.nn.Linear(10, 2).to('cuda')
optimizer = torch.optim.Adam(model.parameters())
dataloader = torch.utils.data.DataLoader(dataset, batch_size=32)

for epoch in range(10):
    for batch in dataloader:
        batch = batch.to('cuda')
        optimizer.zero_grad()
        loss = model(batch).mean()
        loss.backward()
        optimizer.step()
```

**Accelerate を使った場合**（4 行を足しています）:
```python
# train.py

from accelerate import Accelerator  # +1

accelerator = Accelerator()  # +2

model = torch.nn.Linear(10, 2)
optimizer = torch.optim.Adam(model.parameters())
dataloader = torch.utils.data.DataLoader(dataset, batch_size=32)

model, optimizer, dataloader = accelerator.prepare(model, optimizer, dataloader)  # +3

for epoch in range(10):
    for batch in dataloader:
        # No .to('cuda') needed - automatic!
        optimizer.zero_grad()
        loss = model(batch).mean()
        accelerator.backward(loss)  # +4
        optimizer.step()
```

**設定する**（対話式）:
```bash
accelerate config
```

**聞かれること**:
- どの計算機で走らせますか（GPU 1 枚 / 複数枚 / TPU / CPU）
- 計算機は何台ですか（1）
- 混合精度を使いますか（no/fp16/bf16/fp8）
- DeepSpeed を使いますか（no/yes）

**起動する**（どんな構成でも同じコマンドです）:
```bash
# Single GPU
accelerate launch train.py

# Multi-GPU (8 GPUs)
accelerate launch --multi_gpu --num_processes 8 train.py

# Multi-node
accelerate launch --multi_gpu --num_processes 16 \
  --num_machines 2 --machine_rank 0 \
  --main_process_ip $MASTER_ADDR \
  train.py
```

### 進め方 2: 混合精度での学習 {#workflow-2-mixed-precision-training}

**FP16 / BF16 を有効にする**:
```python
from accelerate import Accelerator

# FP16 (with gradient scaling)
accelerator = Accelerator(mixed_precision='fp16')

# BF16 (no scaling, more stable)
accelerator = Accelerator(mixed_precision='bf16')

# FP8 (H100+)
accelerator = Accelerator(mixed_precision='fp8')

model, optimizer, dataloader = accelerator.prepare(model, optimizer, dataloader)

# Everything else is automatic!
for batch in dataloader:
    with accelerator.autocast():  # Optional, done automatically
        loss = model(batch)
    accelerator.backward(loss)
```

### 進め方 3: DeepSpeed ZeRO と組み合わせる {#workflow-3-deepspeed-zero-integration}

**DeepSpeed ZeRO-2 を有効にする**（素の辞書ではなく `DeepSpeedPlugin` を渡します）:
```python
from accelerate import Accelerator, DeepSpeedPlugin

deepspeed_plugin = DeepSpeedPlugin(
    zero_stage=2,                     # ZeRO-2
    offload_optimizer_device="none",  # or "cpu" to offload
    gradient_accumulation_steps=4,
)

accelerator = Accelerator(
    mixed_precision='bf16',
    deepspeed_plugin=deepspeed_plugin,  # DeepSpeedPlugin instance (or dict[str, DeepSpeedPlugin])
)

# Same code as before!
model, optimizer, dataloader = accelerator.prepare(model, optimizer, dataloader)
```

**プラグイン経由で、DeepSpeed の JSON 設定をまるごと指すこともできます**:
```python
from accelerate import Accelerator, DeepSpeedPlugin

# hf_ds_config accepts a path to a DeepSpeed config JSON (or a dict)
deepspeed_plugin = DeepSpeedPlugin(hf_ds_config="ds_config.json")
accelerator = Accelerator(mixed_precision='bf16', deepspeed_plugin=deepspeed_plugin)
```

**ds_config.json**（素の DeepSpeed 設定です。`--config_file` ではなくプラグイン経由で渡します）:
```json
{
    "fp16": {"enabled": false},
    "bf16": {"enabled": true},
    "zero_optimization": {
        "stage": 2,
        "offload_optimizer": {"device": "cpu"},
        "allgather_bucket_size": 5e8,
        "reduce_bucket_size": 5e8
    }
}
```

**対話式の設定から指定することもできます**:
```bash
accelerate config
# Select: DeepSpeed → ZeRO-2
# This writes an accelerate YAML config (default: ~/.cache/huggingface/accelerate/default_config.yaml)
```

**起動する**（`--config_file` が受け取るのは accelerate の YAML であって、素の DeepSpeed の JSON ではありません）:
```bash
# Uses the default accelerate config written by `accelerate config`
accelerate launch train.py

# Or point at a specific accelerate YAML
accelerate launch --config_file accelerate_deepspeed.yaml train.py
```

### 進め方 4: FSDP（Fully Sharded Data Parallel） {#workflow-4-fsdp-fully-sharded-data-parallel}

**FSDP を有効にする**:
```python
from accelerate import Accelerator, FullyShardedDataParallelPlugin

fsdp_plugin = FullyShardedDataParallelPlugin(
    sharding_strategy="FULL_SHARD",  # ZeRO-3 equivalent
    auto_wrap_policy="transformer_based_wrap",  # valid: transformer_based_wrap | size_based_wrap | no_wrap
    cpu_offload=False
)

accelerator = Accelerator(
    mixed_precision='bf16',
    fsdp_plugin=fsdp_plugin
)

model, optimizer, dataloader = accelerator.prepare(model, optimizer, dataloader)
```

**設定から指定することもできます**:
```bash
accelerate config
# Select: FSDP → Full Shard → No CPU Offload
```

### 進め方 5: 勾配の蓄積 {#workflow-5-gradient-accumulation}

**勾配をためる**:
```python
from accelerate import Accelerator

accelerator = Accelerator(gradient_accumulation_steps=4)

model, optimizer, dataloader = accelerator.prepare(model, optimizer, dataloader)

for batch in dataloader:
    with accelerator.accumulate(model):  # Handles accumulation
        optimizer.zero_grad()
        loss = model(batch)
        accelerator.backward(loss)
        optimizer.step()
```

**実質のバッチサイズ**: `batch_size * num_gpus * gradient_accumulation_steps`

## 他の選択肢との使い分け {#when-to-use-vs-alternatives}

**Accelerate が向いているとき**:
- 分散学習をいちばん簡単に済ませたい
- どんなハードウェアでも同じスクリプトを使いたい
- HuggingFace 系のツールを使っている
- DDP / DeepSpeed / FSDP / Megatron を切り替えたい
- 手早く試作したい

**主な利点**:
- **4 行**: コードの書き換えが最小限で済みます
- **共通の API**: DDP、DeepSpeed、FSDP、Megatron で同じコードが使えます
- **自動**: デバイスへの配置、混合精度、分割を任せられます
- **対話式の設定**: 起動まわりを手で組む必要がありません
- **ひとつの起動方法**: どの構成でも同じように動きます

**他を選んだほうがよいとき**:
- **PyTorch Lightning**: コールバックや高水準の枠組みが要る
- **Ray Train**: 複数ノードの取りまとめや、ハイパーパラメータの探索がしたい
- **DeepSpeed**: API を直接触りたい、込み入った機能を使いたい
- **素の DDP**: 抽象を挟まず、細かく制御したい

## つまずきやすいところ {#common-issues}

**デバイスへの配置がおかしい**

自分でデバイスへ移さないでください。
```python
# WRONG
batch = batch.to('cuda')

# CORRECT
# Accelerate handles it automatically after prepare()
```

**勾配の蓄積が効かない**

コンテキストマネージャーを使ってください。
```python
# CORRECT
with accelerator.accumulate(model):
    optimizer.zero_grad()
    accelerator.backward(loss)
    optimizer.step()
```

**分散環境での途中保存**

accelerator のメソッドを使ってください。
```python
# Save only on main process
if accelerator.is_main_process:
    accelerator.save_state('checkpoint/')

# Load on all processes
accelerator.load_state('checkpoint/')
```

**FSDP だと結果が変わる**

乱数の種をそろえてください。
```python
from accelerate.utils import set_seed
set_seed(42)
```

## さらに踏み込む {#advanced-topics}

**Megatron との連携**: テンソル並列、パイプライン並列、シーケンス並列の設定は [references/megatron-integration.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops/accelerate/references/megatron-integration.md) を見てください。

**独自のプラグイン**: 独自の分散プラグインを作る方法や、込み入った設定は [references/custom-plugins.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops/accelerate/references/custom-plugins.md) を見てください。

**性能の調整**: プロファイリング、メモリの節約、うまくやるこつは [references/performance.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops/accelerate/references/performance.md) を見てください。

## 必要なハードウェア {#hardware-requirements}

- **CPU**: 動きます（遅いです）
- **GPU 1 枚**: 動きます
- **GPU 複数枚**: DDP（既定）、DeepSpeed、FSDP
- **複数ノード**: DDP、DeepSpeed、FSDP、Megatron
- **TPU**: 対応しています
- **Apple MPS**: 対応しています

**起動に必要なもの**:
- **DDP**: `torch.distributed.run`（同梱）
- **DeepSpeed**: `deepspeed`（pip install deepspeed）
- **FSDP**: PyTorch 1.12 以降（同梱）
- **Megatron**: 個別の設定が必要です

## 参考先 {#resources}

- Docs: https://huggingface.co/docs/accelerate
- GitHub: https://github.com/huggingface/accelerate
- バージョン: 1.11.0 以降
- チュートリアル: "Accelerate your scripts"
- 例: https://github.com/huggingface/accelerate/tree/main/examples
- 使っているところ: HuggingFace Transformers、TRL、PEFT、HF のライブラリ全般
