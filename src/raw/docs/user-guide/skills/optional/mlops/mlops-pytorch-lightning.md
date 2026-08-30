---
title: "Pytorch Lightning — 分散学習まで組み込まれた、すっきりした学習ループ"
description: "分散学習まで組み込まれた、すっきりした学習ループ"
upstream_path: user-guide/skills/optional/mlops/mlops-pytorch-lightning.md
upstream_blob: dbf67607574dd4b94a31de349b2fa536764f46f5
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/mlops/mlops-pytorch-lightning
---

# Pytorch Lightning {#pytorch-lightning}

分散学習まで組み込まれた、すっきりした学習ループです。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/mlops/pytorch-lightning` で導入します |
| パス | `optional-skills/mlops\pytorch-lightning` |
| バージョン | `1.0.0` |
| 作者 | Orchestra Research |
| ライセンス | MIT |
| 依存関係 | `lightning`, `torch`, `transformers` |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `PyTorch Lightning`, `Training Framework`, `Distributed Training`, `DDP`, `FSDP`, `DeepSpeed`, `High-Level API`, `Callbacks`, `Best Practices`, `Scalable` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# PyTorch Lightning - High-Level Training Framework {#pytorch-lightning---high-level-training-framework}

## すぐ試す {#quick-start}

PyTorch Lightning は PyTorch のコードを整理して、決まりきった記述をなくしつつ、自由度はそのまま残します。

**導入**:
```bash
pip install lightning
```

**PyTorch を Lightning に書き換える**（3 ステップ）:

```python

from torch import nn
from torch.utils.data import DataLoader, Dataset

# Step 1: Define LightningModule (organize your PyTorch code)
class LitModel(L.LightningModule):
    def __init__(self, hidden_size=128):
        super().__init__()
        self.model = nn.Sequential(
            nn.Linear(28 * 28, hidden_size),
            nn.ReLU(),
            nn.Linear(hidden_size, 10)
        )

    def training_step(self, batch, batch_idx):
        x, y = batch
        y_hat = self.model(x)
        loss = nn.functional.cross_entropy(y_hat, y)
        self.log('train_loss', loss)  # Auto-logged to TensorBoard
        return loss

    def configure_optimizers(self):
        return torch.optim.Adam(self.parameters(), lr=1e-3)

# Step 2: Create data
train_loader = DataLoader(train_dataset, batch_size=32)

# Step 3: Train with Trainer (handles everything else!)
trainer = L.Trainer(max_epochs=10, accelerator='gpu', devices=2)
model = LitModel()
trainer.fit(model, train_loader)
```

**これだけです。** あとは Trainer が引き受けます:
- GPU / TPU / CPU の切り替え
- 分散学習（DDP、FSDP、DeepSpeed）
- 混合精度（FP16、BF16）
- 勾配の積み上げ
- チェックポイントの保存
- ログの記録
- 進捗バーの表示

## よくある使い方 {#common-workflows}

### 使い方 1: PyTorch から Lightning へ {#workflow-1-from-pytorch-to-lightning}

**元の PyTorch のコード**:
```python
model = MyModel()
optimizer = torch.optim.Adam(model.parameters())
model.to('cuda')

for epoch in range(max_epochs):
    for batch in train_loader:
        batch = batch.to('cuda')
        optimizer.zero_grad()
        loss = model(batch)
        loss.backward()
        optimizer.step()
```

**Lightning で書いた場合**:
```python
class LitModel(L.LightningModule):
    def __init__(self):
        super().__init__()
        self.model = MyModel()

    def training_step(self, batch, batch_idx):
        loss = self.model(batch)  # No .to('cuda') needed!
        return loss

    def configure_optimizers(self):
        return torch.optim.Adam(self.parameters())

# Train
trainer = L.Trainer(max_epochs=10, accelerator='gpu')
trainer.fit(LitModel(), train_loader)
```

**うれしいところ**: 40 行以上 → 15 行、デバイスの指定が不要、分散学習も自動

### 使い方 2: 検証とテスト {#workflow-2-validation-and-testing}

```python
class LitModel(L.LightningModule):
    def __init__(self):
        super().__init__()
        self.model = MyModel()

    def training_step(self, batch, batch_idx):
        x, y = batch
        y_hat = self.model(x)
        loss = nn.functional.cross_entropy(y_hat, y)
        self.log('train_loss', loss)
        return loss

    def validation_step(self, batch, batch_idx):
        x, y = batch
        y_hat = self.model(x)
        val_loss = nn.functional.cross_entropy(y_hat, y)
        acc = (y_hat.argmax(dim=1) == y).float().mean()
        self.log('val_loss', val_loss)
        self.log('val_acc', acc)

    def test_step(self, batch, batch_idx):
        x, y = batch
        y_hat = self.model(x)
        test_loss = nn.functional.cross_entropy(y_hat, y)
        self.log('test_loss', test_loss)

    def configure_optimizers(self):
        return torch.optim.Adam(self.parameters(), lr=1e-3)

# Train with validation
trainer = L.Trainer(max_epochs=10)
trainer.fit(model, train_loader, val_loader)

# Test
trainer.test(model, test_loader)
```

**自動でやってくれること**:
- 検証は既定でエポックごとに走ります
- 指標は TensorBoard に記録されます
- val_loss を見て、いちばん良いモデルを保存します

### 使い方 3: 分散学習（DDP） {#workflow-3-distributed-training-ddp}

```python
# Same code as single GPU!
model = LitModel()

# 8 GPUs with DDP (automatic!)
trainer = L.Trainer(
    accelerator='gpu',
    devices=8,
    strategy='ddp'  # Or 'fsdp', 'deepspeed'
)

trainer.fit(model, train_loader)
```

**起動**:
```bash
# Single command, Lightning handles the rest
python train.py
```

**書き換えは要りません**:
- データの分配は自動です
- 勾配の同期も自動です
- 複数ノードにも対応しています（`num_nodes=2` を指定するだけです）

### 使い方 4: コールバックで様子を見る {#workflow-4-callbacks-for-monitoring}

```python
from lightning.pytorch.callbacks import ModelCheckpoint, EarlyStopping, LearningRateMonitor

# Create callbacks
checkpoint = ModelCheckpoint(
    monitor='val_loss',
    mode='min',
    save_top_k=3,
    filename='model-{epoch:02d}-{val_loss:.2f}'
)

early_stop = EarlyStopping(
    monitor='val_loss',
    patience=5,
    mode='min'
)

lr_monitor = LearningRateMonitor(logging_interval='epoch')

# Add to Trainer
trainer = L.Trainer(
    max_epochs=100,
    callbacks=[checkpoint, early_stop, lr_monitor]
)

trainer.fit(model, train_loader, val_loader)
```

**こうなります**:
- 成績の良い上位 3 つのモデルが自動で保存されます
- 5 エポック改善しなければ、そこで学習を打ち切ります
- 学習率が TensorBoard に記録されます

### 使い方 5: 学習率のスケジューリング {#workflow-5-learning-rate-scheduling}

```python
class LitModel(L.LightningModule):
    # ... (training_step, etc.)

    def configure_optimizers(self):
        optimizer = torch.optim.Adam(self.parameters(), lr=1e-3)

        # Cosine annealing
        scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
            optimizer,
            T_max=100,
            eta_min=1e-5
        )

        return {
            'optimizer': optimizer,
            'lr_scheduler': {
                'scheduler': scheduler,
                'interval': 'epoch',  # Update per epoch
                'frequency': 1
            }
        }

# Learning rate auto-logged!
trainer = L.Trainer(max_epochs=100)
trainer.fit(model, train_loader)
```

## 他の選択肢との使い分け {#when-to-use-vs-alternatives}

**PyTorch Lightning が向いているとき**:
- コードをすっきり整理したい
- 本番でそのまま使える学習ループがほしい
- 単一 GPU、複数 GPU、TPU を行き来したい
- コールバックとログが最初から使える状態がよい
- チームで作業する（書き方をそろえたい）

**主な強み**:
- **整理されている**: 研究のコードと足回りのコードを分けられます
- **自動でやってくれる**: DDP、FSDP、DeepSpeed が 1 行で使えます
- **コールバック**: 学習の処理を部品として足せます
- **再現しやすい**: 決まりきった記述が減るぶん、不具合も減ります
- **実績がある**: 月に 100 万回以上ダウンロードされ、実戦で鍛えられています

**他を選んだほうがよいとき**:
- **Accelerate**: 今あるコードをほとんど変えずに済み、自由度も高い
- **Ray Train**: 複数ノードの取りまとめ、ハイパーパラメータの探索
- **素の PyTorch**: すべてを自分で制御したい、学習目的
- **Keras**: TensorFlow のまわりで作りたい

## よくあるつまずき {#common-issues}

**うまくいかないとき: 損失が下がらない**

データとモデルの組み立てを確かめてください:
```python
# Add to training_step
def training_step(self, batch, batch_idx):
    if batch_idx == 0:
        print(f"Batch shape: {batch[0].shape}")
        print(f"Labels: {batch[1]}")
    loss = ...
    return loss
```

**うまくいかないとき: メモリが足りない**

バッチサイズを小さくするか、勾配の積み上げを使ってください:
```python
trainer = L.Trainer(
    accumulate_grad_batches=4,  # Effective batch = batch_size × 4
    precision='bf16'  # Or 'fp16', reduces memory 50%
)
```

**うまくいかないとき: 検証が走らない**

val_loader を渡しているか確かめてください:
```python
# WRONG
trainer.fit(model, train_loader)

# CORRECT
trainer.fit(model, train_loader, val_loader)
```

**うまくいかないとき: DDP で意図せず複数のプロセスが立ち上がる**

Lightning は GPU を自動で見つけます。devices を明示してください:
```python
# Test on CPU first
trainer = L.Trainer(accelerator='cpu', devices=1)

# Then GPU
trainer = L.Trainer(accelerator='gpu', devices=1)
```

## もう一歩踏み込む {#advanced-topics}

**コールバック**: EarlyStopping、ModelCheckpoint、自作のコールバック、コールバックのフックについては [references/callbacks.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops\pytorch-lightning/references/callbacks.md) を見てください。

**分散のやり方**: DDP、FSDP、DeepSpeed ZeRO との連携、複数ノードの設定については [references/distributed.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops\pytorch-lightning/references/distributed.md) を見てください。

**ハイパーパラメータの調整**: Optuna、Ray Tune、WandB sweeps との連携については [references/hyperparameter-tuning.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops\pytorch-lightning/references/hyperparameter-tuning.md) を見てください。

## 必要なハードウェア {#hardware-requirements}

- **CPU**: 動きます（動作を確かめるのに向いています）
- **単一 GPU**: 動きます
- **複数 GPU**: DDP（既定）、FSDP、DeepSpeed
- **複数ノード**: DDP、FSDP、DeepSpeed
- **TPU**: 対応しています（8 コア）
- **Apple MPS**: 対応しています

**精度の選択肢**:
- FP32（既定）
- FP16（V100 など、古めの GPU）
- BF16（A100 / H100。おすすめです）
- FP8（H100）

## 参考リンク {#resources}

- ドキュメント: https://lightning.ai/docs/pytorch/stable/
- GitHub: https://github.com/Lightning-AI/pytorch-lightning ⭐ 29,000 以上
- バージョン: 2.5.5 以降
- 使用例: https://github.com/Lightning-AI/pytorch-lightning/tree/master/examples
- Discord: https://discord.gg/lightning-ai
- 使っている人たち: Kaggle の上位入賞者、研究室、本番運用のチーム
