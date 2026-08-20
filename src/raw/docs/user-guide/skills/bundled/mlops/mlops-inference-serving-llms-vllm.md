---
title: "Serving Llms Vllm — vLLM: 高スループットな LLM 配信、OpenAI API、量子化"
description: "vLLM: 高スループットな LLM 配信、OpenAI API、量子化"
upstream_path: user-guide/skills/bundled/mlops/mlops-inference-serving-llms-vllm.md
upstream_blob: 7aaca4c2bdb302e0be3b9508c44bceb7f4ec02a3
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/mlops/mlops-inference-serving-llms-vllm
---

# Serving Llms Vllm {#serving-llms-vllm}

vLLM で LLM を高スループットに配信します。OpenAI API と量子化にも対応します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/mlops/inference/serving-llms-vllm` |
| バージョン | `1.0.1` |
| 作者 | Orchestra Research |
| ライセンス | MIT |
| 依存関係 | `vllm`, `torch`, `transformers` |
| 対応プラットフォーム | linux, macos |
| タグ | `vLLM`, `Inference Serving`, `PagedAttention`, `Continuous Batching`, `High Throughput`, `Production`, `OpenAI API`, `Quantization`, `Tensor Parallelism` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# vLLM - 高性能な LLM 配信 {#vllm---high-performance-llm-serving}

## 使いどころ {#when-to-use}

本番の LLM API を配備するとき、推論の遅延やスループットを詰めるとき、GPU メモリが限られた環境でモデルを動かすときに使います。OpenAI 互換のエンドポイント、量子化（GPTQ/AWQ/FP8）、テンソル並列に対応しています。

## すぐ試す {#quick-start}

vLLM は PagedAttention（ブロック単位の KV キャッシュ）と継続バッチング（プリフィルとデコードの要求を混ぜて処理する仕組み）によって、素の transformers の 24 倍のスループットを出します。

**インストール**:
```bash
pip install vllm
```

**オフライン推論の基本**:
```python
from vllm import LLM, SamplingParams

llm = LLM(model="meta-llama/Meta-Llama-3-8B-Instruct")
sampling = SamplingParams(temperature=0.7, max_tokens=256)

outputs = llm.generate(["Explain quantum computing"], sampling)
print(outputs[0].outputs[0].text)
```

**OpenAI 互換サーバー**:
```bash
vllm serve meta-llama/Meta-Llama-3-8B-Instruct

# Query with OpenAI SDK
python -c "
from openai import OpenAI
client = OpenAI(base_url='http://localhost:8000/v1', api_key='EMPTY')
print(client.chat.completions.create(
    model='meta-llama/Meta-Llama-3-8B-Instruct',
    messages=[{'role': 'user', 'content': 'Hello!'}]
).choices[0].message.content)
"
```

## よくある進め方 {#common-workflows}

### 進め方 1: 本番 API の配備 {#workflow-1-production-api-deployment}

次のチェックリストを写して、進み具合を追いかけます。

```
Deployment Progress:
- [ ] Step 1: Configure server settings
- [ ] Step 2: Test with limited traffic
- [ ] Step 3: Enable monitoring
- [ ] Step 4: Deploy to production
- [ ] Step 5: Verify performance metrics
```

**手順 1: サーバーの設定を決める**

モデルの大きさに合わせて設定を選びます。

```bash
# For 7B-13B models on single GPU
vllm serve meta-llama/Meta-Llama-3-8B-Instruct \
  --gpu-memory-utilization 0.9 \
  --max-model-len 8192 \
  --port 8000

# For 30B-70B models with tensor parallelism
vllm serve meta-llama/Meta-Llama-3-70B-Instruct \
  --tensor-parallel-size 4 \
  --gpu-memory-utilization 0.9 \
  --quantization awq \
  --port 8000

# For production with caching (Prometheus metrics are exposed
# automatically at /metrics on the API port)
vllm serve meta-llama/Meta-Llama-3-8B-Instruct \
  --gpu-memory-utilization 0.9 \
  --enable-prefix-caching \
  --port 8000 \
  --host 0.0.0.0
```

**手順 2: 少ないトラフィックで試す**

本番に出す前に負荷試験をします。

```bash
# Install load testing tool
pip install locust

# Create test_load.py with sample requests
# Run: locust -f test_load.py --host http://localhost:8000
```

TTFT（最初のトークンが返るまでの時間）が &lt; 500ms、スループットが > 100 req/sec になっているかを確かめます。

**手順 3: 監視を有効にする**

vLLM は API のポート（既定では 8000）の `/metrics` に Prometheus 用の指標を出します。

```bash
curl http://localhost:8000/metrics | grep vllm
```

見ておきたい主な指標は次のとおりです。
- `vllm:time_to_first_token_seconds` - 遅延
- `vllm:num_requests_running` - 処理中の要求数
- `vllm:gpu_cache_usage_perc` - KV キャッシュの使用率

**手順 4: 本番に出す**

環境を揃えるために Docker を使います。

```bash
# Run vLLM in Docker
docker run --gpus all -p 8000:8000 \
  vllm/vllm-openai:latest \
  --model meta-llama/Meta-Llama-3-8B-Instruct \
  --gpu-memory-utilization 0.9 \
  --enable-prefix-caching
```

**手順 5: 性能の数字を確かめる**

配備したものが目標を満たしているかを確認します。
- TTFT が &lt; 500ms（短いプロンプトの場合）
- スループットが目標の req/sec を超えている
- GPU 使用率が > 80%
- ログに OOM のエラーが出ていない

### 進め方 2: オフラインのバッチ推論 {#workflow-2-offline-batch-inference}

サーバーを立てる手間をかけずに、大きなデータセットを処理したいときの形です。

次のチェックリストを写します。

```
Batch Processing:
- [ ] Step 1: Prepare input data
- [ ] Step 2: Configure LLM engine
- [ ] Step 3: Run batch inference
- [ ] Step 4: Process results
```

**手順 1: 入力データを用意する**

```python
# Load prompts from file
prompts = []
with open("prompts.txt") as f:
    prompts = [line.strip() for line in f]

print(f"Loaded {len(prompts)} prompts")
```

**手順 2: LLM エンジンを設定する**

```python
from vllm import LLM, SamplingParams

llm = LLM(
    model="meta-llama/Meta-Llama-3-8B-Instruct",
    tensor_parallel_size=2,  # Use 2 GPUs
    gpu_memory_utilization=0.9,
    max_model_len=4096
)

sampling = SamplingParams(
    temperature=0.7,
    top_p=0.95,
    max_tokens=512,
    stop=["</s>", "\n\n"]
)
```

**手順 3: バッチ推論を走らせる**

vLLM は効率よく処理するために、要求を自動でまとめます。

```python
# Process all prompts in one call
outputs = llm.generate(prompts, sampling)

# vLLM handles batching internally
# No need to manually chunk prompts
```

**手順 4: 結果を処理する**

```python
# Extract generated text
results = []
for output in outputs:
    prompt = output.prompt
    generated = output.outputs[0].text
    results.append({
        "prompt": prompt,
        "generated": generated,
        "tokens": len(output.outputs[0].token_ids)
    })

# Save to file

with open("results.jsonl", "w") as f:
    for result in results:
        f.write(json.dumps(result) + "\n")

print(f"Processed {len(results)} prompts")
```

### 進め方 3: 量子化したモデルの配信 {#workflow-3-quantized-model-serving}

限られた GPU メモリに大きなモデルを収めるための形です。

```
Quantization Setup:
- [ ] Step 1: Choose quantization method
- [ ] Step 2: Find or create quantized model
- [ ] Step 3: Launch with quantization flag
- [ ] Step 4: Verify accuracy
```

**手順 1: 量子化の方式を選ぶ**

- **AWQ**: 70B クラスのモデルに向いています。精度の落ち込みが小さめです
- **GPTQ**: 対応するモデルが広く、圧縮率も良好です
- **FP8**: H100 GPU では最速です

**手順 2: 量子化済みのモデルを探すか、自分で作る**

HuggingFace にある量子化済みのモデルを使います。

```bash
# Search for AWQ models
# Example: TheBloke/Llama-2-70B-AWQ
```

**手順 3: 量子化のフラグを付けて起動する**

```bash
# Using pre-quantized model
vllm serve TheBloke/Llama-2-70B-AWQ \
  --quantization awq \
  --tensor-parallel-size 1 \
  --gpu-memory-utilization 0.95

# Results: 70B model in ~40GB VRAM
```

**手順 4: 精度を確かめる**

出力が期待どおりの品質かを試します。

```python
# Compare quantized vs non-quantized responses
# Verify task-specific performance unchanged
```

## 他の選択肢との使い分け {#when-to-use-vs-alternatives}

**vLLM が向いている場面:**
- 本番の LLM API を配備する（100 req/sec 以上）
- OpenAI 互換のエンドポイントを提供する
- GPU メモリは限られているが、大きなモデルを動かしたい
- 複数の利用者が同時に使う（チャットボット、アシスタント）
- 低遅延と高スループットを両立したい

**別のものを選んだほうがよい場面:**
- **llama.cpp**: CPU やエッジでの推論、利用者が1人の場合
- **HuggingFace transformers**: 研究、試作、その場かぎりの生成
- **TensorRT-LLM**: NVIDIA 環境専用で、性能を限界まで引き出したい場合
- **Text-Generation-Inference**: すでに HuggingFace のエコシステムを使っている場合

## よくある問題 {#common-issues}

**問題: モデルの読み込み中にメモリが足りなくなる**

メモリの使用量を減らします。
```bash
vllm serve MODEL \
  --gpu-memory-utilization 0.7 \
  --max-model-len 4096
```

量子化を使う方法もあります。
```bash
vllm serve MODEL --quantization awq
```

**問題: 最初のトークンが遅い（TTFT が 1 秒超）**

同じプロンプトが繰り返される場合は、プレフィックスのキャッシュを有効にします。
```bash
vllm serve MODEL --enable-prefix-caching
```

プロンプトが長い場合は、プリフィルの分割を有効にします。
```bash
vllm serve MODEL --enable-chunked-prefill
```

**問題: モデルが見つからないというエラーが出る**

独自のモデルには `--trust-remote-code` を付けます。
```bash
vllm serve MODEL --trust-remote-code
```

**問題: スループットが低い（&lt;50 req/sec）**

同時に処理するシーケンス数を増やします。
```bash
vllm serve MODEL --max-num-seqs 512
```

`nvidia-smi` で GPU の使用率を見て、80% を超えているか確かめます。

**問題: 推論が思ったより遅い**

テンソル並列の GPU 数が 2 のべき乗になっているかを確かめます。
```bash
vllm serve MODEL --tensor-parallel-size 4  # Not 3
```

生成を速くするために投機的デコーディングを有効にします（設定は JSON で渡します。`--speculative-model` は廃止され、`--speculative-config` に置き換わりました）。
```bash
vllm serve MODEL \
  --speculative-config '{"model": "DRAFT_MODEL", "num_speculative_tokens": 5, "method": "draft_model"}'
```

## さらに踏み込む {#advanced-topics}

**サーバー配備のパターン**: Docker、Kubernetes、負荷分散の設定は [references/server-deployment.md](https://github.com/NousResearch/hermes-agent/blob/main/skills/mlops/inference/serving-llms-vllm/references/server-deployment.md) を読んでください。

**性能の最適化**: PagedAttention の調整、継続バッチングの詳細、ベンチマーク結果は [references/optimization.md](https://github.com/NousResearch/hermes-agent/blob/main/skills/mlops/inference/serving-llms-vllm/references/optimization.md) を読んでください。

**量子化の手引き**: AWQ/GPTQ/FP8 の設定、モデルの準備、精度の比較は [references/quantization.md](https://github.com/NousResearch/hermes-agent/blob/main/skills/mlops/inference/serving-llms-vllm/references/quantization.md) を読んでください。

**困ったとき**: エラーメッセージの詳細、切り分けの手順、性能の診断は [references/troubleshooting.md](https://github.com/NousResearch/hermes-agent/blob/main/skills/mlops/inference/serving-llms-vllm/references/troubleshooting.md) を読んでください。

## 必要なハードウェア {#hardware-requirements}

- **小さめのモデル (7B-13B)**: A10 (24GB) 1 枚、または A100 (40GB) 1 枚
- **中くらいのモデル (30B-40B)**: A100 (40GB) 2 枚をテンソル並列で
- **大きなモデル (70B 以上)**: A100 (40GB) 4 枚、または A100 (80GB) 2 枚。AWQ/GPTQ を使います

対応プラットフォーム: NVIDIA（主軸）、AMD ROCm、Intel GPU、TPU

## 関連リンク {#resources}

- 公式ドキュメント: https://docs.vllm.ai
- GitHub: https://github.com/vllm-project/vllm
- 論文: "Efficient Memory Management for Large Language Model Serving with PagedAttention" (SOSP 2023)
- コミュニティ: https://discuss.vllm.ai
