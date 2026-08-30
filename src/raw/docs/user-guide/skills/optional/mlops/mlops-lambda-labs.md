---
title: "Lambda Labs — ML の学習用に、必要なときだけ GPU を借りるクラウド"
description: "ML の学習用に、必要なときだけ GPU を借りるクラウド"
upstream_path: user-guide/skills/optional/mlops/mlops-lambda-labs.md
upstream_blob: 416a9962727d19569f1b13d8511a32296e6e0a39
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/mlops/mlops-lambda-labs
---

# Lambda Labs {#lambda-labs}

ML の学習用に、必要なときだけ GPU を借りるクラウドです。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/mlops/lambda-labs` で導入します |
| パス | `optional-skills/mlops\lambda-labs` |
| バージョン | `1.0.0` |
| 作者 | Orchestra Research |
| ライセンス | MIT |
| 依存関係 | `lambda-cloud-client>=1.0.0` |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Infrastructure`, `GPU Cloud`, `Training`, `Inference`, `Lambda Labs` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Lambda Labs GPU クラウド {#lambda-labs-gpu-cloud}

Lambda Labs の GPU クラウドで、必要なときだけ借りるインスタンスや 1-Click Clusters を使って ML の処理を動かすための案内です。

## Lambda Labs を使う場面 {#when-to-use-lambda-labs}

**次のようなときに向いています:**
- SSH で自由に触れる専用の GPU インスタンスがほしい
- 数時間から数日かかる学習を回したい
- 料金の仕組みが単純で、データ持ち出しの料金もかからないほうがよい
- 作業を終えてもデータを残しておきたい
- 16〜512 GPU の高性能なクラスタが必要
- PyTorch や CUDA、NCCL が入った状態（Lambda Stack）ですぐ始めたい

**主な特長:**
- **GPU の種類が豊富**: B200、H100、GH200、A100、A10、A6000、V100
- **Lambda Stack**: PyTorch、TensorFlow、CUDA、cuDNN、NCCL が導入済み
- **残るファイルシステム**: インスタンスを立て直してもデータが残る
- **1-Click Clusters**: InfiniBand でつながった 16〜512 GPU の Slurm クラスタ
- **単純な料金**: 分単位の従量課金で、データ持ち出しの料金なし
- **世界各地のリージョン**: 12 以上のリージョン

**こちらのほうが向いている場合:**
- **Modal**: サーバーの管理なしで自動的に増減させたいとき
- **SkyPilot**: 複数のクラウドをまたいで安く回したいとき
- **RunPod**: 安いスポットインスタンスやサーバーレスの窓口がほしいとき
- **Vast.ai**: いちばん安い GPU を市場から探したいとき

## すぐ試す {#quick-start}

### アカウントの準備 {#account-setup}

1. https://lambda.ai でアカウントを作ります
2. 支払い方法を登録します
3. ダッシュボードで API キーを発行します
4. SSH 鍵を登録します（インスタンスを起動する前に必要です）

### コンソールから起動する {#launch-via-console}

1. https://cloud.lambda.ai/instances を開きます
2. 「Launch instance」を押します
3. GPU の種類とリージョンを選びます
4. SSH 鍵を選びます
5. 必要であればファイルシステムを結びつけます
6. 起動して 3〜15 分ほど待ちます

### SSH でつなぐ {#connect-via-ssh}

```bash
# Get instance IP from console
ssh ubuntu@<INSTANCE-IP>

# Or with specific key
ssh -i ~/.ssh/lambda_key ubuntu@<INSTANCE-IP>
```

## GPU インスタンス {#gpu-instances}

### 使える GPU {#available-gpus}

| GPU | VRAM | 1 GPU あたりの時間料金 | 向いている用途 |
|-----|------|--------------|----------|
| B200 SXM6 | 180 GB | $4.99 | いちばん大きなモデル、いちばん速い学習 |
| H100 SXM | 80 GB | $2.99-3.29 | 大きなモデルの学習 |
| H100 PCIe | 80 GB | $2.49 | 費用を抑えた H100 |
| GH200 | 96 GB | $1.49 | 1 GPU で大きなモデルを扱う |
| A100 80GB | 80 GB | $1.79 | 本番の学習 |
| A100 40GB | 40 GB | $1.29 | ふつうの学習 |
| A10 | 24 GB | $0.75 | 推論、ファインチューニング |
| A6000 | 48 GB | $0.80 | VRAM と価格の釣り合いがよい |
| V100 | 16 GB | $0.55 | 費用を抑えた学習 |

### インスタンスの構成 {#instance-configurations}

```
8x GPU: Best for distributed training (DDP, FSDP)
4x GPU: Large models, multi-GPU training
2x GPU: Medium workloads
1x GPU: Fine-tuning, inference, development
```

### 起動にかかる時間 {#launch-times}

- GPU 1 枚: 3〜5 分
- GPU 複数枚: 10〜15 分

## Lambda Stack {#lambda-stack}

どのインスタンスにも Lambda Stack が最初から入っています。

```bash
# Included software
- Ubuntu 22.04 LTS
- NVIDIA drivers (latest)
- CUDA 12.x
- cuDNN 8.x
- NCCL (for multi-GPU)
- PyTorch (latest)
- TensorFlow (latest)
- JAX
- JupyterLab
```

### 導入を確かめる {#verify-installation}

```bash
# Check GPU
nvidia-smi

# Check PyTorch
python -c "import torch; print(torch.cuda.is_available())"

# Check CUDA version
nvcc --version
```

## Python の API {#python-api}

### 導入 {#installation}

```bash
pip install lambda-cloud-client
```

### 認証 {#authentication}

```python

# Configure with API key
configuration = lambda_cloud_client.Configuration(
    host="https://cloud.lambdalabs.com/api/v1",
    access_token=os.environ["LAMBDA_API_KEY"]
)
```

### 使えるインスタンスを一覧する {#list-available-instances}

```python
with lambda_cloud_client.ApiClient(configuration) as api_client:
    api = lambda_cloud_client.DefaultApi(api_client)

    # Get available instance types
    types = api.instance_types()
    for name, info in types.data.items():
        print(f"{name}: {info.instance_type.description}")
```

### インスタンスを起動する {#launch-instance}

```python
from lambda_cloud_client.models import LaunchInstanceRequest

request = LaunchInstanceRequest(
    region_name="us-west-1",
    instance_type_name="gpu_1x_h100_sxm5",
    ssh_key_names=["my-ssh-key"],
    file_system_names=["my-filesystem"],  # Optional
    name="training-job"
)

response = api.launch_instance(request)
instance_id = response.data.instance_ids[0]
print(f"Launched: {instance_id}")
```

### 動いているインスタンスを一覧する {#list-running-instances}

```python
instances = api.list_instances()
for instance in instances.data:
    print(f"{instance.name}: {instance.ip} ({instance.status})")
```

### インスタンスを止めて片づける {#terminate-instance}

```python
from lambda_cloud_client.models import TerminateInstanceRequest

request = TerminateInstanceRequest(
    instance_ids=[instance_id]
)
api.terminate_instance(request)
```

### SSH 鍵の管理 {#ssh-key-management}

```python
from lambda_cloud_client.models import AddSshKeyRequest

# Add SSH key
request = AddSshKeyRequest(
    name="my-key",
    public_key="ssh-rsa AAAA..."
)
api.add_ssh_key(request)

# List keys
keys = api.list_ssh_keys()

# Delete key
api.delete_ssh_key(key_id)
```

## curl で操作する {#cli-with-curl}

### インスタンスの種類を一覧する {#list-instance-types}

```bash
curl -u $LAMBDA_API_KEY: \
  https://cloud.lambdalabs.com/api/v1/instance-types | jq
```

### インスタンスを起動する {#launch-instance}

```bash
curl -u $LAMBDA_API_KEY: \
  -X POST https://cloud.lambdalabs.com/api/v1/instance-operations/launch \
  -H "Content-Type: application/json" \
  -d '{
    "region_name": "us-west-1",
    "instance_type_name": "gpu_1x_h100_sxm5",
    "ssh_key_names": ["my-key"]
  }' | jq
```

### インスタンスを止めて片づける {#terminate-instance}

```bash
curl -u $LAMBDA_API_KEY: \
  -X POST https://cloud.lambdalabs.com/api/v1/instance-operations/terminate \
  -H "Content-Type: application/json" \
  -d '{"instance_ids": ["<INSTANCE-ID>"]}' | jq
```

## 残しておける保存領域 {#persistent-storage}

### ファイルシステム {#filesystems}

ファイルシステムに置いたデータは、インスタンスを立て直しても残ります。

```bash
# Mount location
/lambda/nfs/<FILESYSTEM_NAME>

# Example: save checkpoints
python train.py --checkpoint-dir /lambda/nfs/my-storage/checkpoints
```

### ファイルシステムを作る {#create-filesystem}

1. Lambda のコンソールで Storage を開きます
2. 「Create filesystem」を押します
3. リージョンを選びます（インスタンスと同じにします）
4. 名前をつけて作成します

### インスタンスに結びつける {#attach-to-instance}

ファイルシステムは、インスタンスを起動するときにしか結びつけられません。
- コンソールから: 起動時にファイルシステムを選びます
- API から: 起動のリクエストに `file_system_names` を入れます

### うまく使うコツ {#best-practices}

<!-- ascii-guard-ignore -->
```bash
# Store on filesystem (persists)
/lambda/nfs/storage/
  ├── datasets/
  ├── checkpoints/
  ├── models/
  └── outputs/

# Local SSD (faster, ephemeral)
~/ (instance home)
  └── working/  # Temporary files
```
<!-- ascii-guard-ignore-end -->

## SSH の設定 {#ssh-configuration}

### SSH 鍵を登録する {#add-ssh-key}

```bash
# Generate key locally
ssh-keygen -t ed25519 -f ~/.ssh/lambda_key

# Add public key to Lambda console
# Or via API
```

### 鍵を増やす {#multiple-keys}

```bash
# On instance, add more keys
echo 'ssh-rsa AAAA...' >> ~/.ssh/authorized_keys
```

### GitHub から取り込む {#import-from-github}

```bash
# On instance
ssh-import-id gh:username
```

### SSH でポートを手元に引く {#ssh-tunneling}

```bash
# Forward Jupyter
ssh -L 8888:localhost:8888 ubuntu@<IP>

# Forward TensorBoard
ssh -L 6006:localhost:6006 ubuntu@<IP>

# Multiple ports
ssh -L 8888:localhost:8888 -L 6006:localhost:6006 ubuntu@<IP>
```

## JupyterLab {#jupyterlab}

### コンソールから開く {#launch-from-console}

1. Instances のページを開きます
2. Cloud IDE の列にある「Launch」を押します
3. ブラウザで JupyterLab が開きます

### 自分で開く場合 {#manual-access}

```bash
# On instance
jupyter lab --ip=0.0.0.0 --port=8888

# From local machine with tunnel
ssh -L 8888:localhost:8888 ubuntu@<IP>
# Open http://localhost:8888
```

## 学習の進め方 {#training-workflows}

### GPU 1 枚での学習 {#single-gpu-training}

```bash
# SSH to instance
ssh ubuntu@<IP>

# Clone repo
git clone https://github.com/user/project
cd project

# Install dependencies
pip install -r requirements.txt

# Train
python train.py --epochs 100 --checkpoint-dir /lambda/nfs/storage/checkpoints
```

### GPU 複数枚での学習（1 ノード） {#multi-gpu-training-single-node}

```python
# train_ddp.py

from torch.nn.parallel import DistributedDataParallel as DDP

def main():
    dist.init_process_group("nccl")
    rank = dist.get_rank()
    device = rank % torch.cuda.device_count()

    model = MyModel().to(device)
    model = DDP(model, device_ids=[device])

    # Training loop...

if __name__ == "__main__":
    main()
```

```bash
# Launch with torchrun (8 GPUs)
torchrun --nproc_per_node=8 train_ddp.py
```

### 途中経過をファイルシステムに保存する {#checkpoint-to-filesystem}

```python

checkpoint_dir = "/lambda/nfs/my-storage/checkpoints"
os.makedirs(checkpoint_dir, exist_ok=True)

# Save checkpoint
torch.save({
    'epoch': epoch,
    'model_state_dict': model.state_dict(),
    'optimizer_state_dict': optimizer.state_dict(),
    'loss': loss,
}, f"{checkpoint_dir}/checkpoint_{epoch}.pt")
```

## 1-Click Clusters {#1-click-clusters}

### 概要 {#overview}

次のような構成の、高性能な Slurm クラスタです。

- NVIDIA H100 または B200 を 16〜512 GPU
- NVIDIA Quantum-2 の 400 Gb/s InfiniBand
- 3200 Gb/s の GPUDirect RDMA
- 分散学習用の ML 一式が導入済み

### 入っているソフトウェア {#included-software}

- Ubuntu 22.04 LTS と Lambda Stack
- NCCL、Open MPI
- DDP と FSDP に対応した PyTorch
- TensorFlow
- OFED ドライバ

### 保存領域 {#storage}

- 計算ノードごとに 24 TB の NVMe（一時的なもの）
- データを残すには Lambda のファイルシステム

### 複数ノードでの学習 {#multi-node-training}

```bash
# On Slurm cluster
srun --nodes=4 --ntasks-per-node=8 --gpus-per-node=8 \
  torchrun --nnodes=4 --nproc_per_node=8 \
  --rdzv_backend=c10d --rdzv_endpoint=$MASTER_ADDR:29500 \
  train.py
```

## ネットワーク {#networking}

### 通信速度 {#bandwidth}

- インスタンス同士（同じリージョン）: 最大 200 Gbps
- インターネットへの送出: 最大 20 Gbps

### ファイアウォール {#firewall}

- 初期状態では 22 番（SSH）だけが開いています
- ほかのポートは Lambda のコンソールで設定します
- ICMP の通信は初期状態で通ります

### プライベート IP {#private-ips}

```bash
# Find private IP
ip addr show | grep 'inet '
```

## よくある進め方 {#common-workflows}

### 進め方 1: LLM のファインチューニング {#workflow-1-fine-tuning-llm}

```bash
# 1. Launch 8x H100 instance with filesystem

# 2. SSH and setup
ssh ubuntu@<IP>
pip install transformers accelerate peft

# 3. Download model to filesystem
python -c "
from transformers import AutoModelForCausalLM
model = AutoModelForCausalLM.from_pretrained('meta-llama/Llama-2-7b-hf')
model.save_pretrained('/lambda/nfs/storage/models/llama-2-7b')
"

# 4. Fine-tune with checkpoints on filesystem
accelerate launch --num_processes 8 train.py \
  --model_path /lambda/nfs/storage/models/llama-2-7b \
  --output_dir /lambda/nfs/storage/outputs \
  --checkpoint_dir /lambda/nfs/storage/checkpoints
```

### 進め方 2: まとめて推論する {#workflow-2-batch-inference}

```bash
# 1. Launch A10 instance (cost-effective for inference)

# 2. Run inference
python inference.py \
  --model /lambda/nfs/storage/models/fine-tuned \
  --input /lambda/nfs/storage/data/inputs.jsonl \
  --output /lambda/nfs/storage/data/outputs.jsonl
```

## 費用を抑える {#cost-optimization}

### 合った GPU を選ぶ {#choose-right-gpu}

| やりたいこと | おすすめの GPU |
|------|-----------------|
| LLM のファインチューニング（7B） | A100 40GB |
| LLM のファインチューニング（70B） | H100 8 枚 |
| 推論 | A10、A6000 |
| 開発 | V100、A10 |
| 性能を最大にしたい | B200 |

### 費用を減らす {#reduce-costs}

1. **ファイルシステムを使う**: データを何度も落とし直さずに済みます
2. **こまめに途中経過を保存する**: 学習が止まっても続きから再開できます
3. **必要な分だけにする**: GPU を余分に借りすぎないようにします
4. **使っていないものは止める**: 自動停止はないので、自分で止めます

### 使用状況を見る {#monitor-usage}

- ダッシュボードで GPU の使用率がその場で見られます
- API を使えばプログラムから監視できます

## 困ったとき {#common-issues}

| 症状 | 対処 |
|-------|----------|
| インスタンスが起動しない | リージョンの空き状況を確認し、別の GPU を試します |
| SSH の接続を断られる | インスタンスの準備が終わるまで待ちます（3〜15 分） |
| 片づけたらデータが消えた | 残るファイルシステムを使います |
| データの転送が遅い | 同じリージョンのファイルシステムを使います |
| GPU が認識されない | インスタンスを再起動し、ドライバを確認します |

## 参考資料 {#references}

- **[Advanced Usage](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops\lambda-labs/references/advanced-usage.md)** - 複数ノードでの学習、API による自動化
- **[Troubleshooting](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops\lambda-labs/references/troubleshooting.md)** - よくある症状と対処

## 参考リンク {#resources}

- **ドキュメント**: https://docs.lambda.ai
- **コンソール**: https://cloud.lambda.ai
- **料金**: https://lambda.ai/instances
- **サポート**: https://support.lambdalabs.com
- **ブログ**: https://lambda.ai/blog
