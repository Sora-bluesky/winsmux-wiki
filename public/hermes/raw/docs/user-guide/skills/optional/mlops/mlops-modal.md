---
title: "Modal — ML の処理やモデル API を、サーバー管理なしで GPU に載せる"
description: "ML の処理やモデル API を、サーバー管理なしで GPU に載せる"
upstream_path: user-guide/skills/optional/mlops/mlops-modal.md
upstream_blob: 9b744da7c55c649eaeea3224c1a1fd283d13d78a
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/mlops/mlops-modal
---

# Modal {#modal}

ML の処理やモデルの API を、サーバーの管理なしで GPU に載せられるクラウドです。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/mlops/modal` で導入します |
| パス | `optional-skills/mlops\modal` |
| バージョン | `1.0.1` |
| 作者 | Orchestra Research |
| ライセンス | MIT |
| 依存関係 | `modal>=1.0` |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Infrastructure`, `Serverless`, `GPU`, `Cloud`, `Deployment`, `Modal` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Modal のサーバーレス GPU {#modal-serverless-gpu}

Modal のサーバーレス GPU クラウドで ML の処理を動かすための案内です。

## Modal を使う場面 {#when-to-use-modal}

**次のようなときに向いています:**
- 基盤の面倒を見ずに、GPU を多く使う ML の処理を動かしたい
- ML のモデルを、自動で増減する API として公開したい
- まとめて動かす処理（学習、推論、データ加工）を回したい
- 待機中の費用をかけずに、秒単位で GPU の料金を払いたい
- ML のアプリをすばやく試作したい
- 決まった時刻に動く処理（cron のようなもの）を回したい

**主な特長:**
- **サーバーレスの GPU**: T4、L4、A10G、L40S、A100、H100、H200、B200 を必要なときに
- **Python がそのまま設定になる**: YAML なしで、基盤を Python のコードで書けます
- **自動での増減**: ゼロまで減らせて、100 GPU 以上にもすぐ増やせます
- **1 秒未満で立ち上がる**: Rust で作られた基盤により、コンテナの起動が速いです
- **コンテナの使い回し**: イメージの層が保存され、手直しのたびに待たされません
- **Web の窓口**: 関数をそのまま REST API として公開でき、更新中も止まりません

**こちらのほうが向いている場合:**
- **RunPod**: 状態を保ったまま長く動かしたいとき
- **Lambda Labs**: GPU インスタンスを確保しておきたいとき
- **SkyPilot**: 複数のクラウドをまたいで安く回したいとき
- **Kubernetes**: 複雑で多くのサービスからなる構成のとき

## すぐ試す {#quick-start}

### 導入 {#installation}

```bash
pip install modal
modal setup  # Opens browser for authentication
```

### GPU で Hello World {#hello-world-with-gpu}

```python

app = modal.App("hello-gpu")

@app.function(gpu="T4")
def gpu_info():
    import subprocess
    return subprocess.run(["nvidia-smi"], capture_output=True, text=True).stdout

@app.local_entrypoint()
def main():
    print(gpu_info.remote())
```

実行するには `modal run hello_gpu.py` と打ちます。

### 推論の窓口を作る {#basic-inference-endpoint}

```python

app = modal.App("text-generation")
image = modal.Image.debian_slim().pip_install("transformers", "torch", "accelerate")

@app.cls(gpu="A10G", image=image)
class TextGenerator:
    @modal.enter()
    def load_model(self):
        from transformers import pipeline
        self.pipe = pipeline("text-generation", model="gpt2", device=0)

    @modal.method()
    def generate(self, prompt: str) -> str:
        return self.pipe(prompt, max_length=100)[0]["generated_text"]

@app.local_entrypoint()
def main():
    print(TextGenerator().generate.remote("Hello, world"))
```

## 中心となる考え方 {#core-concepts}

### 主な部品 {#key-components}

| 部品 | 役割 |
|-----------|---------|
| `App` | 関数や資源をまとめる入れ物 |
| `Function` | 計算資源の指定を持つサーバーレスの関数 |
| `Cls` | 起動時の処理などを持てる、クラス形式の関数 |
| `Image` | コンテナイメージの定義 |
| `Volume` | モデルやデータを残しておく保存領域 |
| `Secret` | 秘密の情報を安全に置く場所 |

### 実行のしかた {#execution-modes}

| コマンド | 説明 |
|---------|-------------|
| `modal run script.py` | 実行して終わります |
| `modal serve script.py` | 変更を反映しながら開発します |
| `modal deploy script.py` | クラウドに常設で置きます |

## GPU の指定 {#gpu-configuration}

### 使える GPU {#available-gpus}

| GPU | VRAM | 向いている用途 |
|-----|------|----------|
| `T4` | 16GB | 費用を抑えた推論、小さなモデル |
| `L4` | 24GB | 推論、Ada Lovelace 世代 |
| `A10G` | 24GB | 学習と推論、T4 の 3.3 倍の速さ |
| `L40S` | 48GB | 推論におすすめ（費用と性能の釣り合いがよい） |
| `A100-40GB` | 40GB | 大きなモデルの学習 |
| `A100-80GB` | 80GB | とても大きなモデル |
| `H100` | 80GB | 最速、FP8 と Transformer Engine に対応 |
| `H200` | 141GB | H100 から自動で切り替わる、4.8TB/s の帯域 |
| `B200` | 最新 | Blackwell 世代 |

### GPU の書き方 {#gpu-specification-patterns}

```python
# Single GPU
@app.function(gpu="A100")

# Specific memory variant
@app.function(gpu="A100-80GB")

# Multiple GPUs (up to 8)
@app.function(gpu="H100:4")

# GPU with fallbacks
@app.function(gpu=["H100", "A100", "L40S"])

# Any available GPU
@app.function(gpu="any")
```

## コンテナイメージ {#container-images}

```python
# Basic image with pip
image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "torch==2.1.0", "transformers==4.36.0", "accelerate"
)

# From CUDA base
image = modal.Image.from_registry(
    "nvidia/cuda:12.1.0-cudnn8-devel-ubuntu22.04",
    add_python="3.11"
).pip_install("torch", "transformers")

# With system packages
image = modal.Image.debian_slim().apt_install("git", "ffmpeg").pip_install("whisper")
```

## 残しておける保存領域 {#persistent-storage}

```python
volume = modal.Volume.from_name("model-cache", create_if_missing=True)

@app.function(gpu="A10G", volumes={"/models": volume})
def load_model():
    import os
    model_path = "/models/llama-7b"
    if not os.path.exists(model_path):
        model = download_model()
        model.save_pretrained(model_path)
        volume.commit()  # Persist changes
    return load_from_path(model_path)
```

## Web の窓口 {#web-endpoints}

### FastAPI の窓口をつける {#fastapi-endpoint-decorator}

```python
@app.function()
@modal.fastapi_endpoint(method="POST")
def predict(text: str) -> dict:
    return {"result": model.predict(text)}
```

### ASGI のアプリをまるごと載せる {#full-asgi-app}

```python
from fastapi import FastAPI
web_app = FastAPI()

@web_app.post("/predict")
async def predict(text: str):
    return {"result": await model.predict.remote.aio(text)}

@app.function()
@modal.asgi_app()
def fastapi_app():
    return web_app
```

### 窓口の種類 {#web-endpoint-types}

| デコレータ | 使いどころ |
|-----------|----------|
| `@modal.fastapi_endpoint()` | 関数をそのまま API にする |
| `@modal.asgi_app()` | FastAPI や Starlette のアプリ全体 |
| `@modal.wsgi_app()` | Django や Flask のアプリ |
| `@modal.web_server(port)` | 任意の HTTP サーバー |

## 自動でまとめて処理する {#dynamic-batching}

```python
@app.function()
@modal.batched(max_batch_size=32, wait_ms=100)
async def batch_predict(inputs: list[str]) -> list[dict]:
    # Inputs automatically batched
    return model.batch_predict(inputs)
```
## 秘密の情報の管理 {#secrets-management}

```bash
# Create secret
modal secret create huggingface HF_TOKEN=hf_xxx
```

```python
@app.function(secrets=[modal.Secret.from_name("huggingface")])
def download_model():
    import os
    token = os.environ["HF_TOKEN"]
```

## 決まった時刻に動かす {#scheduling}

```python
@app.function(schedule=modal.Cron("0 0 * * *"))  # Daily midnight
def daily_job():
    pass

@app.function(schedule=modal.Period(hours=1))
def hourly_job():
    pass
```

## 速くするために {#performance-optimization}

### 立ち上がりの遅さを減らす {#cold-start-mitigation}

```python
# Modal 1.0 autoscaler params: scaledown_window (was container_idle_timeout).
# Input concurrency moved to the @modal.concurrent decorator.
@app.function(scaledown_window=300)  # Keep warm 5 min
@modal.concurrent(max_inputs=10)     # Handle concurrent requests per container
def inference():
    pass
```

### モデルの読み込みのコツ {#model-loading-best-practices}

```python
@app.cls(gpu="A100")
class Model:
    @modal.enter()  # Run once at container start
    def load(self):
        self.model = load_model()  # Load during warm-up

    @modal.method()
    def predict(self, x):
        return self.model(x)
```

## 並行して処理する {#parallel-processing}

```python
@app.function()
def process_item(item):
    return expensive_computation(item)

@app.function()
def run_parallel():
    items = list(range(1000))
    # Fan out to parallel containers
    results = list(process_item.map(items))
    return results
```

## よく使う設定 {#common-configuration}

```python
@app.function(
    gpu="A100",
    memory=32768,              # 32GB RAM
    cpu=4,                     # 4 CPU cores
    timeout=3600,              # 1 hour max
    scaledown_window=120,      # Keep warm 2 min (was container_idle_timeout)
    retries=3,                 # Retry on failure
    max_containers=10,         # Max concurrent containers (was concurrency_limit)
    min_containers=1,          # Keep N containers warm (was keep_warm)
)
def my_function():
    pass
```

> **Modal 1.0 で変わった自動増減の設定名**（[移行の案内](https://modal.com/docs/guide/modal-1-0-migration)を参照してください）:
> - `container_idle_timeout` → `scaledown_window`
> - `concurrency_limit` → `max_containers`
> - `keep_warm` → `min_containers`
> - `allow_concurrent_inputs=N` → `@modal.concurrent(max_inputs=N)` デコレータ

## 動きを調べる {#debugging}

```python
# Test locally
if __name__ == "__main__":
    result = my_function.local()

# View logs
# modal app logs my-app
```

## 困ったとき {#common-issues}

| 症状 | 対処 |
|-------|----------|
| 立ち上がりに時間がかかる | `scaledown_window` を長くし、`@modal.enter()` を使います |
| GPU のメモリが足りない | 大きな GPU（`A100-80GB`）に変え、勾配チェックポイントを有効にします |
| イメージの構築に失敗する | 依存関係の版を固定し、CUDA との組み合わせを確認します |
| 時間切れになる | `timeout` を延ばし、途中経過の保存を入れます |

## 参考資料 {#references}

- **[Advanced Usage](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops\modal/references/advanced-usage.md)** - 複数 GPU、分散学習、費用の最適化
- **[Troubleshooting](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops\modal/references/troubleshooting.md)** - よくある症状と対処

## 参考リンク {#resources}

- **ドキュメント**: https://modal.com/docs
- **例**: https://github.com/modal-labs/modal-examples
- **料金**: https://modal.com/pricing
- **Discord**: https://discord.gg/modal
