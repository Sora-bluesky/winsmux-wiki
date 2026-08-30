---
title: "Tensorrt Llm — NVIDIA の GPU で LLM の推論を高い処理量で動かす"
description: "NVIDIA の GPU で LLM の推論を高い処理量で動かす"
upstream_path: user-guide/skills/optional/mlops/mlops-tensorrt-llm.md
upstream_blob: 727812c1c8d7fa0526979788ec47601086c77053
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/mlops/mlops-tensorrt-llm
---

# Tensorrt Llm {#tensorrt-llm}

NVIDIA の GPU で、LLM の推論を高い処理量で動かします。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/mlops/tensorrt-llm` で導入します |
| パス | `optional-skills/mlops\tensorrt-llm` |
| バージョン | `1.0.1` |
| 作者 | Orchestra Research |
| ライセンス | MIT |
| 依存関係 | `tensorrt-llm`, `torch` |
| 対応プラットフォーム | linux, macos |
| タグ | `Inference Serving`, `TensorRT-LLM`, `NVIDIA`, `Inference Optimization`, `High Throughput`, `Low Latency`, `Production`, `FP8`, `INT4`, `In-Flight Batching`, `Multi-GPU` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# TensorRT-LLM {#tensorrt-llm}

NVIDIA の GPU 上で LLM の推論を高い性能で動かすための、NVIDIA 製のオープンソースライブラリです。

## TensorRT-LLM が向いているとき {#when-to-use-tensorrt-llm}

**次のようなときに使います:**
- NVIDIA の GPU（A100、H100、GB200）で動かす
- 処理量を最大にしたい（Llama 3 で毎秒 24,000 トークン以上）
- 応答が返るまでの遅れを小さくしたい
- 量子化したモデル（FP8、INT4、FP4）を扱う
- 複数の GPU やノードにまたがって動かす

**代わりに vLLM を使うとき:**
- 準備を簡単に済ませ、Python 中心の書き方をしたい
- TensorRT のコンパイルなしで PagedAttention を使いたい
- AMD の GPU など、NVIDIA 以外のハードウェアで動かす

**代わりに llama.cpp を使うとき:**
- CPU や Apple Silicon で動かす
- NVIDIA の GPU がない環境で、端末側で動かしたい
- GGUF という手軽な量子化形式を使いたい

## すぐ試す {#quick-start}

### 導入 {#installation}

```bash
# Docker (recommended) — images are on NGC (nvcr.io), not Docker Hub.
# Replace x.y.z with the desired version (e.g. 1.2.1). Browse tags on NGC:
# https://catalog.ngc.nvidia.com/orgs/nvidia/teams/tensorrt-llm/containers/release/tags
docker pull nvcr.io/nvidia/tensorrt-llm/release:x.y.z

# pip install (current stable GA)
pip install tensorrt_llm

# Requires CUDA 13.2.1, TensorRT 10.x, Python 3.10-3.12
```

### まずは推論を動かす {#basic-inference}

```python
from tensorrt_llm import LLM, SamplingParams

# Initialize model
llm = LLM(model="meta-llama/Meta-Llama-3-8B")

# Configure sampling
sampling_params = SamplingParams(
    max_tokens=100,
    temperature=0.7,
    top_p=0.9
)

# Generate
prompts = ["Explain quantum computing"]
outputs = llm.generate(prompts, sampling_params)

for output in outputs:
    print(output.text)
```

### trtllm-serve で公開する {#serving-with-trtllm-serve}

```bash
# Start server (automatic model download and compilation)
trtllm-serve meta-llama/Meta-Llama-3-8B \
    --tp_size 4 \              # Tensor parallelism (4 GPUs)
    --max_batch_size 256 \
    --max_num_tokens 4096

# Client request
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "meta-llama/Meta-Llama-3-8B",
    "messages": [{"role": "user", "content": "Hello!"}],
    "temperature": 0.7,
    "max_tokens": 100
  }'
```

## 主な機能 {#key-features}

### 性能まわりの工夫 {#performance-optimizations}
- **In-flight batching**: 生成の途中でも動的にまとめて処理します
- **Paged KV cache**: メモリを無駄なく使います
- **Flash Attention**: アテンションの計算を最適化します
- **量子化**: FP8、INT4、FP4 で推論が 2〜4 倍速くなります
- **CUDA graphs**: カーネル起動の手間を減らします

### 並列化 {#parallelism}
- **テンソル並列（TP）**: モデルを GPU 間で分けます
- **パイプライン並列（PP）**: 層ごとに分けて配置します
- **エキスパート並列**: Mixture-of-Experts のモデル向けです
- **複数ノード**: 1 台の枠を超えて広げられます

### 進んだ機能 {#advanced-features}
- **投機的デコード**: 下書き用モデルを併用して生成を速めます
- **LoRA の提供**: 複数のアダプタを効率よく配信します
- **役割を分けた提供**: 入力処理と生成を別々に動かします

## よく使う書き方 {#common-patterns}

### 量子化したモデル（FP8） {#quantized-model-fp8}

```python
from tensorrt_llm import LLM

# Load FP8 quantized model (2× faster, 50% memory)
llm = LLM(
    model="meta-llama/Meta-Llama-3-70B",
    dtype="fp8",
    max_num_tokens=8192
)

# Inference same as before
outputs = llm.generate(["Summarize this article..."])
```

### 複数 GPU での運用 {#multi-gpu-deployment}

```python
# Tensor parallelism across 8 GPUs
llm = LLM(
    model="meta-llama/Meta-Llama-3-405B",
    tensor_parallel_size=8,
    dtype="fp8"
)
```

### まとめて推論する {#batch-inference}

```python
# Process 100 prompts efficiently
prompts = [f"Question {i}: ..." for i in range(100)]

outputs = llm.generate(
    prompts,
    sampling_params=SamplingParams(max_tokens=200)
)

# Automatic in-flight batching for maximum throughput
```

## 性能の実測値 {#performance-benchmarks}

**Meta Llama 3-8B**（H100 GPU）:
- 処理量: 毎秒 24,000 トークン
- 遅延: 1 トークンあたり約 10ms
- PyTorch との比較: **100 倍の速さ**

**Llama 3-70B**（A100 80GB × 8）:
- FP8 の量子化: FP16 の 2 倍の速さ
- メモリ: FP8 で 50% 減ります

## 対応しているモデル {#supported-models}

- **LLaMA 系**: Llama 2、Llama 3、CodeLlama
- **GPT 系**: GPT-2、GPT-J、GPT-NeoX
- **Qwen**: Qwen、Qwen2、QwQ
- **DeepSeek**: DeepSeek-V2、DeepSeek-V3
- **Mixtral**: Mixtral-8x7B、Mixtral-8x22B
- **画像対応**: LLaVA、Phi-3-vision
- **HuggingFace 上に 100 以上のモデル**

## 参考ドキュメント {#references}

- **[Optimization Guide](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops\tensorrt-llm/references/optimization.md)** - 量子化、まとめ処理、KV キャッシュの調整
- **[Multi-GPU Setup](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops\tensorrt-llm/references/multi-gpu.md)** - テンソル並列とパイプライン並列、複数ノード
- **[Serving Guide](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops\tensorrt-llm/references/serving.md)** - 本番での運用、監視、自動での増減

## 参考情報 {#resources}

- **ドキュメント**: https://nvidia.github.io/TensorRT-LLM/
- **GitHub**: https://github.com/NVIDIA/TensorRT-LLM
- **モデル**: https://huggingface.co/models?library=tensorrt_llm
