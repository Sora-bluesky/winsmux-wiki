---
title: "Weights And Biases — W&B で ML の実験・sweep・モデルレジストリ・ダッシュボードを記録する"
description: "W&B で ML の実験・sweep・モデルレジストリ・ダッシュボードを記録する"
upstream_path: user-guide/skills/bundled/mlops/mlops-evaluation-weights-and-biases.md
upstream_blob: c99938e6db182517613102167cc066fe45b20239
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/mlops/mlops-evaluation-weights-and-biases
---

# Weights And Biases {#weights-and-biases}

W&B で ML の実験・sweep・モデルレジストリ・ダッシュボードを記録します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/mlops/evaluation/weights-and-biases` |
| バージョン | `1.0.1` |
| 作者 | Orchestra Research |
| ライセンス | MIT |
| 依存関係 | `wandb` |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `MLOps`, `Weights And Biases`, `WandB`, `Experiment Tracking`, `Hyperparameter Tuning`, `Model Registry`, `Collaboration`, `Real-Time Visualization`, `PyTorch`, `TensorFlow`, `HuggingFace` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Weights & Biases: ML の実験管理と MLOps {#weights-biases-ml-experiment-tracking-mlops}

## この skill を使う場面 {#when-to-use-this-skill}

Weights & Biases（W&B）は、次のようなことをしたいときに使います。
- **ML の実験を記録する** — 指標が自動で記録されます
- **学習を可視化する** — リアルタイムのダッシュボードで見られます
- **run を比べる** — ハイパーパラメータや設定をまたいで比較できます
- **ハイパーパラメータを調整する** — sweep で自動探索します
- **モデルレジストリを管理する** — バージョンと来歴を残せます
- **ML プロジェクトで協働する** — チーム用のワークスペースがあります
- **成果物を追跡する** — データセット・モデル・コードを来歴付きで管理できます

**利用者**: 20 万人以上の ML 実務者 | **GitHub スター**: 10.5k 以上 | **連携先**: 100 以上

## 導入 {#installation}

```bash
# Install W&B
pip install wandb

# Login (creates API key)
wandb login

# Or set API key programmatically
export WANDB_API_KEY=your_api_key_here
```

## さっそく使う {#quick-start}

### 基本の実験記録 {#basic-experiment-tracking}

```python

# Initialize a run
run = wandb.init(
    project="my-project",
    config={
        "learning_rate": 0.001,
        "epochs": 10,
        "batch_size": 32,
        "architecture": "ResNet50"
    }
)

# Training loop
for epoch in range(run.config.epochs):
    # Your training code
    train_loss = train_epoch()
    val_loss = validate()

    # Log metrics
    wandb.log({
        "epoch": epoch,
        "train/loss": train_loss,
        "val/loss": val_loss,
        "train/accuracy": train_acc,
        "val/accuracy": val_acc
    })

# Finish the run
wandb.finish()
```

### PyTorch と組み合わせる {#with-pytorch}

```python

# Initialize
wandb.init(project="pytorch-demo", config={
    "lr": 0.001,
    "epochs": 10
})

# Access config
config = wandb.config

# Training loop
for epoch in range(config.epochs):
    for batch_idx, (data, target) in enumerate(train_loader):
        # Forward pass
        output = model(data)
        loss = criterion(output, target)

        # Backward pass
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

        # Log every 100 batches
        if batch_idx % 100 == 0:
            wandb.log({
                "loss": loss.item(),
                "epoch": epoch,
                "batch": batch_idx
            })

# Save model
torch.save(model.state_dict(), "model.pth")
wandb.save("model.pth")  # Upload to W&B

wandb.finish()
```

## 基本のしくみ {#core-concepts}

### 1. project と run {#1-projects-and-runs}

**project**: 関連する実験のまとまり
**run**: 学習スクリプトの 1 回の実行

```python
# Create/use project
run = wandb.init(
    project="image-classification",
    name="resnet50-experiment-1",  # Optional run name
    tags=["baseline", "resnet"],    # Organize with tags
    notes="First baseline run"      # Add notes
)

# Each run has unique ID
print(f"Run ID: {run.id}")
print(f"Run URL: {run.url}")
```

### 2. 設定の記録 {#2-configuration-tracking}

ハイパーパラメータを自動で記録します。

```python
config = {
    # Model architecture
    "model": "ResNet50",
    "pretrained": True,

    # Training params
    "learning_rate": 0.001,
    "batch_size": 32,
    "epochs": 50,
    "optimizer": "Adam",

    # Data params
    "dataset": "ImageNet",
    "augmentation": "standard"
}

wandb.init(project="my-project", config=config)

# Access config during training
lr = wandb.config.learning_rate
batch_size = wandb.config.batch_size
```

### 3. 指標の記録 {#3-metric-logging}

```python
# Log scalars
wandb.log({"loss": 0.5, "accuracy": 0.92})

# Log multiple metrics
wandb.log({
    "train/loss": train_loss,
    "train/accuracy": train_acc,
    "val/loss": val_loss,
    "val/accuracy": val_acc,
    "learning_rate": current_lr,
    "epoch": epoch
})

# Log with custom x-axis
wandb.log({"loss": loss}, step=global_step)

# Log media (images, audio, video)
wandb.log({"examples": [wandb.Image(img) for img in images]})

# Log histograms
wandb.log({"gradients": wandb.Histogram(gradients)})

# Log tables
table = wandb.Table(columns=["id", "prediction", "ground_truth"])
wandb.log({"predictions": table})
```

### 4. モデルのチェックポイント {#4-model-checkpointing}

```python

# Save model checkpoint
checkpoint = {
    'epoch': epoch,
    'model_state_dict': model.state_dict(),
    'optimizer_state_dict': optimizer.state_dict(),
    'loss': loss,
}

torch.save(checkpoint, 'checkpoint.pth')

# Upload to W&B
wandb.save('checkpoint.pth')

# Or use Artifacts (recommended)
artifact = wandb.Artifact('model', type='model')
artifact.add_file('checkpoint.pth')
wandb.log_artifact(artifact)
```

## ハイパーパラメータの sweep {#hyperparameter-sweeps}

最適なハイパーパラメータを自動で探索します。

### sweep の設定を書く {#define-sweep-configuration}

```python
sweep_config = {
    'method': 'bayes',  # or 'grid', 'random'
    'metric': {
        'name': 'val/accuracy',
        'goal': 'maximize'
    },
    'parameters': {
        'learning_rate': {
            'distribution': 'log_uniform_values',
            'min': 1e-5,
            'max': 1e-1
        },
        'batch_size': {
            'values': [16, 32, 64, 128]
        },
        'optimizer': {
            'values': ['adam', 'sgd', 'rmsprop']
        },
        'dropout': {
            'distribution': 'uniform',
            'min': 0.1,
            'max': 0.5
        }
    }
}

# Initialize sweep
sweep_id = wandb.sweep(sweep_config, project="my-project")
```

### 学習用の関数を書く {#define-training-function}

```python
def train():
    # Initialize run
    run = wandb.init()

    # Access sweep parameters
    lr = wandb.config.learning_rate
    batch_size = wandb.config.batch_size
    optimizer_name = wandb.config.optimizer

    # Build model with sweep config
    model = build_model(wandb.config)
    optimizer = get_optimizer(optimizer_name, lr)

    # Training loop
    for epoch in range(NUM_EPOCHS):
        train_loss = train_epoch(model, optimizer, batch_size)
        val_acc = validate(model)

        # Log metrics
        wandb.log({
            "train/loss": train_loss,
            "val/accuracy": val_acc
        })

# Run sweep
wandb.agent(sweep_id, function=train, count=50)  # Run 50 trials
```

### sweep の探索方法 {#sweep-strategies}

```python
# Grid search - exhaustive
sweep_config = {
    'method': 'grid',
    'parameters': {
        'lr': {'values': [0.001, 0.01, 0.1]},
        'batch_size': {'values': [16, 32, 64]}
    }
}

# Random search
sweep_config = {
    'method': 'random',
    'parameters': {
        'lr': {'distribution': 'uniform', 'min': 0.0001, 'max': 0.1},
        'dropout': {'distribution': 'uniform', 'min': 0.1, 'max': 0.5}
    }
}

# Bayesian optimization (recommended)
sweep_config = {
    'method': 'bayes',
    'metric': {'name': 'val/loss', 'goal': 'minimize'},
    'parameters': {
        'lr': {'distribution': 'log_uniform_values', 'min': 1e-5, 'max': 1e-1}
    }
}
```

## Artifact {#artifacts}

データセット・モデル・そのほかのファイルを、来歴付きで追跡します。

### Artifact を記録する {#log-artifacts}

```python
# Create artifact
artifact = wandb.Artifact(
    name='training-dataset',
    type='dataset',
    description='ImageNet training split',
    metadata={'size': '1.2M images', 'split': 'train'}
)

# Add files
artifact.add_file('data/train.csv')
artifact.add_dir('data/images/')

# Log artifact
wandb.log_artifact(artifact)
```

### Artifact を使う {#use-artifacts}

```python
# Download and use artifact
run = wandb.init(project="my-project")

# Download artifact
artifact = run.use_artifact('training-dataset:latest')
artifact_dir = artifact.download()

# Use the data
data = load_data(f"{artifact_dir}/train.csv")
```

### モデルレジストリ {#model-registry}

```python
# Log model as artifact
model_artifact = wandb.Artifact(
    name='resnet50-model',
    type='model',
    metadata={'architecture': 'ResNet50', 'accuracy': 0.95}
)

model_artifact.add_file('model.pth')
wandb.log_artifact(model_artifact, aliases=['best', 'production'])

# Link to model registry
run.link_artifact(model_artifact, 'model-registry/production-models')
```

## 連携の例 {#integration-examples}

### HuggingFace Transformers {#huggingface-transformers}

```python
from transformers import Trainer, TrainingArguments

# Initialize W&B
wandb.init(project="hf-transformers")

# Training arguments with W&B
training_args = TrainingArguments(
    output_dir="./results",
    report_to="wandb",  # Enable W&B logging
    run_name="bert-finetuning",
    logging_steps=100,
    save_steps=500
)

# Trainer automatically logs to W&B
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset
)

trainer.train()
```

### PyTorch Lightning {#pytorch-lightning}

```python
from pytorch_lightning import Trainer
from pytorch_lightning.loggers import WandbLogger

# Create W&B logger
wandb_logger = WandbLogger(
    project="lightning-demo",
    log_model=True  # Log model checkpoints
)

# Use with Trainer
trainer = Trainer(
    logger=wandb_logger,
    max_epochs=10
)

trainer.fit(model, datamodule=dm)
```

### Keras / TensorFlow {#kerastensorflow}

```python

from wandb.integration.keras import WandbMetricsLogger, WandbModelCheckpoint

# Initialize
wandb.init(project="keras-demo")

# Add callbacks (the monolithic WandbCallback was removed;
# use the dedicated callbacks from wandb.integration.keras instead)
model.fit(
    x_train, y_train,
    validation_data=(x_val, y_val),
    epochs=10,
    callbacks=[
        WandbMetricsLogger(),                        # Auto-logs metrics
        WandbModelCheckpoint("models/model-{epoch}")  # Saves checkpoints
    ]
)
```

## 可視化と分析 {#visualization-analysis}

### 自作のグラフ {#custom-charts}

```python
# Log custom visualizations

fig, ax = plt.subplots()
ax.plot(x, y)
wandb.log({"custom_plot": wandb.Image(fig)})

# Log confusion matrix
wandb.log({"conf_mat": wandb.plot.confusion_matrix(
    probs=None,
    y_true=ground_truth,
    preds=predictions,
    class_names=class_names
)})
```

### レポート {#reports}

W&B の画面上で、共有できるレポートを作れます。
- run・グラフ・文章を組み合わせられます
- マークダウンが使えます
- 可視化をそのまま埋め込めます
- チームで一緒に編集できます

## うまく使うコツ {#best-practices}

### 1. タグとグループで整理する {#1-organize-with-tags-and-groups}

```python
wandb.init(
    project="my-project",
    tags=["baseline", "resnet50", "imagenet"],
    group="resnet-experiments",  # Group related runs
    job_type="train"             # Type of job
)
```

### 2. 関係しそうなものは全部記録する {#2-log-everything-relevant}

```python
# Log system metrics
wandb.log({
    "gpu/util": gpu_utilization,
    "gpu/memory": gpu_memory_used,
    "cpu/util": cpu_utilization
})

# Log code version
wandb.log({"git_commit": git_commit_hash})

# Log data splits
wandb.log({
    "data/train_size": len(train_dataset),
    "data/val_size": len(val_dataset)
})
```

### 3. 中身のわかる名前を付ける {#3-use-descriptive-names}

```python
# ✅ Good: Descriptive run names
wandb.init(
    project="nlp-classification",
    name="bert-base-lr0.001-bs32-epoch10"
)

# ❌ Bad: Generic names
wandb.init(project="nlp", name="run1")
```

### 4. 大事な Artifact は保存しておく {#4-save-important-artifacts}

```python
# Save final model
artifact = wandb.Artifact('final-model', type='model')
artifact.add_file('model.pth')
wandb.log_artifact(artifact)

# Save predictions for analysis
predictions_table = wandb.Table(
    columns=["id", "input", "prediction", "ground_truth"],
    data=predictions_data
)
wandb.log({"predictions": predictions_table})
```

### 5. 回線が不安定ならオフラインモードを使う {#5-use-offline-mode-for-unstable-connections}

```python

# Enable offline mode
os.environ["WANDB_MODE"] = "offline"

wandb.init(project="my-project")
# ... your code ...

# Sync later
# wandb sync <run_directory>
```

## チームでの協働 {#team-collaboration}

### run を共有する {#share-runs}

```python
# Runs are automatically shareable via URL
run = wandb.init(project="team-project")
print(f"Share this URL: {run.url}")
```

### チーム用の project {#team-projects}

- wandb.ai でチームアカウントを作ります
- メンバーを追加します
- project の公開範囲を決めます（非公開 / 公開）
- チーム単位の Artifact とモデルレジストリを使います

## 料金 {#pricing}

- **無料**: 公開 project は無制限、ストレージ 100GB
- **アカデミック**: 学生・研究者は無料
- **チーム**: 1 席あたり月 50 ドル、非公開 project、ストレージ無制限
- **エンタープライズ**: 個別見積もり、オンプレミスにも対応

## 参考情報 {#resources}

- **ドキュメント**: https://docs.wandb.ai
- **GitHub**: https://github.com/wandb/wandb （スター 10.5k 以上）
- **サンプル**: https://github.com/wandb/examples
- **コミュニティ**: https://wandb.ai/community
- **Discord**: https://wandb.me/discord

## 関連 {#see-also}

- `references/sweeps.md` - ハイパーパラメータ最適化の詳しい手引き
- `references/artifacts.md` - データとモデルのバージョン管理のやり方
- `references/integrations.md` - フレームワークごとの例
