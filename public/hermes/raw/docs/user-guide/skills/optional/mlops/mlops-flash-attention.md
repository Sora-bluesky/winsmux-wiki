---
title: "Flash Attention — 長い系列を扱う Transformer の学習と推論を速くする"
description: "長い系列を扱う Transformer の学習と推論を速くする"
upstream_path: user-guide/skills/optional/mlops/mlops-flash-attention.md
upstream_blob: 52b717fee5023c18494c9d78ba50b8f6b1443dce
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/mlops/mlops-flash-attention
---

# Flash Attention {#flash-attention}

長い系列を扱う Transformer の学習と推論を速くします。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/mlops/flash-attention` で導入します |
| パス | `optional-skills/mlops\flash-attention` |
| バージョン | `1.0.1` |
| 作者 | Orchestra Research |
| ライセンス | MIT |
| 依存関係 | `flash-attn`, `torch`, `transformers` |
| 対応プラットフォーム | linux, macos |
| タグ | `Optimization`, `Flash Attention`, `Attention Optimization`, `Memory Efficiency`, `Speed Optimization`, `Long Context`, `PyTorch`, `SDPA`, `H100`, `FP8`, `Transformers` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Flash Attention - 速くてメモリに優しい Attention {#flash-attention---fast-memory-efficient-attention}

## はじめの一歩 {#quick-start}

Flash Attention は、IO を意識したタイル分割と再計算によって、Transformer の attention を 2〜4 倍速くし、メモリ使用量を 10〜20 分の 1 に抑えます。

**PyTorch 標準の機能を使う（いちばん簡単。PyTorch 2.2 以降）**:
```python

q = torch.randn(2, 8, 512, 64, device='cuda', dtype=torch.float16)  # [batch, heads, seq, dim]
k = torch.randn(2, 8, 512, 64, device='cuda', dtype=torch.float16)
v = torch.randn(2, 8, 512, 64, device='cuda', dtype=torch.float16)

# Automatically uses Flash Attention if available
out = F.scaled_dot_product_attention(q, k, v)
```

**flash-attn ライブラリを使う（機能が多い）**:
```bash
pip install flash-attn --no-build-isolation
```

```python
from flash_attn import flash_attn_func

# q, k, v: [batch, seqlen, nheads, headdim]
out = flash_attn_func(q, k, v, dropout_p=0.0, causal=True)
```

## よくある進め方 {#common-workflows}

### 進め方 1: 今ある PyTorch のモデルで有効にする {#workflow-1-enable-in-existing-pytorch-model}

次のチェックリストをコピーして使ってください。

```
Flash Attention Integration:
- [ ] Step 1: Check PyTorch version (≥2.2)
- [ ] Step 2: Enable Flash Attention backend
- [ ] Step 3: Verify speedup with profiling
- [ ] Step 4: Test accuracy matches baseline
```

**手順 1: PyTorch のバージョンを確認する**

次のコマンドで、入っている PyTorch のバージョンが表示されます。

```bash
python -c "import torch; print(torch.__version__)"
# Should be ≥2.2.0
```

&lt;2.2 だった場合は、次のコマンドで新しくします。
```bash
pip install --upgrade torch
```

**手順 2: Flash Attention のバックエンドを有効にする**

これまでの attention を次のように置き換えます。
```python
# Before (standard attention)
attn_weights = torch.softmax(q @ k.transpose(-2, -1) / math.sqrt(d_k), dim=-1)
out = attn_weights @ v

# After (Flash Attention)

out = F.scaled_dot_product_attention(q, k, v, attn_mask=mask)
```

Flash Attention のバックエンドを強制的に使わせるときは、次のように書きます（`torch.backends.cuda.sdp_kernel` は非推奨です。`torch.nn.attention.sdpa_kernel` と `SDPBackend` を使ってください）。
```python
from torch.nn.attention import SDPBackend, sdpa_kernel

with sdpa_kernel(SDPBackend.FLASH_ATTENTION):
    out = F.scaled_dot_product_attention(q, k, v)
```

**手順 3: プロファイリングで速くなったことを確かめる**

次のコードは、Flash Attention ありとなしの実行時間を測って並べて表示します。

```python

def test_attention(use_flash):
    q, k, v = [torch.randn(2, 8, 2048, 64, device='cuda', dtype=torch.float16) for _ in range(3)]

    if use_flash:
        from torch.nn.attention import SDPBackend, sdpa_kernel
        with sdpa_kernel(SDPBackend.FLASH_ATTENTION):
            return F.scaled_dot_product_attention(q, k, v)
    else:
        attn = (q @ k.transpose(-2, -1) / 8.0).softmax(dim=-1)
        return attn @ v

# Benchmark
t_flash = benchmark.Timer(stmt='test_attention(True)', globals=globals())
t_standard = benchmark.Timer(stmt='test_attention(False)', globals=globals())

print(f"Flash: {t_flash.timeit(100).mean:.3f}s")
print(f"Standard: {t_standard.timeit(100).mean:.3f}s")
```

目安として、512 トークンを超える系列では 2〜4 倍速くなります。

**手順 4: 精度がこれまでと変わらないか確かめる**

次のコードは、両方の出力の差の最大値を表示します。

```python
# Compare outputs
q, k, v = [torch.randn(1, 8, 512, 64, device='cuda', dtype=torch.float16) for _ in range(3)]

# Flash Attention
out_flash = F.scaled_dot_product_attention(q, k, v)

# Standard attention
attn_weights = torch.softmax(q @ k.transpose(-2, -1) / 8.0, dim=-1)
out_standard = attn_weights @ v

# Check difference
diff = (out_flash - out_standard).abs().max()
print(f"Max difference: {diff:.6f}")
# Should be <1e-3 for float16
```

### 進め方 2: flash-attn ライブラリで進んだ機能を使う {#workflow-2-use-flash-attn-library-for-advanced-features}

multi-query attention、sliding window、H100 の FP8 を使いたいときの方法です。

次のチェックリストをコピーして使ってください。

```
flash-attn Library Setup:
- [ ] Step 1: Install flash-attn library
- [ ] Step 2: Modify attention code
- [ ] Step 3: Enable advanced features
- [ ] Step 4: Benchmark performance
```

**手順 1: flash-attn ライブラリを入れる**

次のコマンドで導入し、続けて読み込めるかどうかを確かめます。

```bash
# NVIDIA GPUs (CUDA 12.0+)
pip install flash-attn --no-build-isolation

# Verify installation
python -c "from flash_attn import flash_attn_func; print('Success')"
```

**手順 2: attention のコードを書き換える**

```python
from flash_attn import flash_attn_func

# Input: [batch_size, seq_len, num_heads, head_dim]
# Transpose from [batch, heads, seq, dim] if needed
q = q.transpose(1, 2)  # [batch, seq, heads, dim]
k = k.transpose(1, 2)
v = v.transpose(1, 2)

out = flash_attn_func(
    q, k, v,
    dropout_p=0.1,
    causal=True,  # For autoregressive models
    window_size=(-1, -1),  # No sliding window
    softmax_scale=None  # Auto-scale
)

out = out.transpose(1, 2)  # Back to [batch, heads, seq, dim]
```

**手順 3: 進んだ機能を有効にする**

multi-query attention（head をまたいで K/V を共有する）:
```python
from flash_attn import flash_attn_func

# q: [batch, seq, num_q_heads, dim]
# k, v: [batch, seq, num_kv_heads, dim]  # Fewer KV heads
out = flash_attn_func(q, k, v)  # Automatically handles MQA
```

sliding window attention（近くだけを見る attention）:
```python
# Only attend to window of 256 tokens before/after
out = flash_attn_func(
    q, k, v,
    window_size=(256, 256),  # (left, right) window
    causal=True
)
```

**手順 4: 性能を測る**

次のコードは、1 回あたりの実行時間と使ったメモリ量を表示します。

```python

from flash_attn import flash_attn_func

q, k, v = [torch.randn(4, 4096, 32, 64, device='cuda', dtype=torch.float16) for _ in range(3)]

# Warmup
for _ in range(10):
    _ = flash_attn_func(q, k, v)

# Benchmark
torch.cuda.synchronize()
start = time.time()
for _ in range(100):
    out = flash_attn_func(q, k, v)
    torch.cuda.synchronize()
end = time.time()

print(f"Time per iteration: {(end-start)/100*1000:.2f}ms")
print(f"Memory allocated: {torch.cuda.max_memory_allocated()/1e9:.2f}GB")
```

### 進め方 3: H100 の FP8 で速くする（FlashAttention-3） {#workflow-3-h100-fp8-optimization-flashattention-3}

Hopper 世代の GPU（H100）で性能を出し切りたいときの方法です。

> **注意:** pip で入る `flash-attn`（2.8.x）に含まれているのは **FlashAttention-2 だけ**です。FA3 や H100 向けの FP8 カーネルは入っておらず、`flash_attn_func` が自動で FP8 を使うこともありません。
> FlashAttention-3 は、リポジトリの `hopper/` ディレクトリからソースをビルドする別立ての **ベータ版**で、`flash_attn_interface` モジュールとして提供されます。FA3 が対応しているのは FP16/BF16 の順伝播・逆伝播と、**FP8 の順伝播のみ**です。

```
FP8 Setup:
- [ ] Step 1: Verify Hopper (H100) GPU available
- [ ] Step 2: Build & install FlashAttention-3 from source (hopper/)
- [ ] Step 3: Use the FA3 interface (FP8 forward)
```

**手順 1: H100 の GPU があることを確かめる**

次のコマンドで、載っている GPU の名前が表示されます。

```bash
nvidia-smi --query-gpu=name --format=csv
# Should show "H100" or "H800"
```

**手順 2: FlashAttention-3 をソースからビルドして入れる**

FA3 は `pip install flash-attn` には含まれていません。`hopper/` ディレクトリからビルドしてください。

次のコマンドで、リポジトリを取得してビルドと導入まで行います。

```bash
git clone https://github.com/Dao-AILab/flash-attention.git
cd flash-attention/hopper
python setup.py install
# (compilation is heavy and requires a CUDA toolchain + Hopper GPU)
```

**手順 3: FA3 のインターフェースを使う（FP8 の順伝播）**

FA3 は、FA2 の `flash_attn` とは別に `flash_attn_interface` という独自のモジュールを持っています。FP8 は**順伝播だけ**の経路で、入力は `float8_e4m3fn` である必要があります。

```python

from flash_attn_interface import flash_attn_func  # FA3 (hopper build), not `flash_attn`

# q, k, v: [batch, seqlen, nheads, headdim]
q = torch.randn(2, 4096, 32, 64, device='cuda', dtype=torch.float16)
k = torch.randn(2, 4096, 32, 64, device='cuda', dtype=torch.float16)
v = torch.randn(2, 4096, 32, 64, device='cuda', dtype=torch.float16)

# FP8 forward (inference / forward-only): cast to float8_e4m3fn
q_fp8 = q.to(torch.float8_e4m3fn)
k_fp8 = k.to(torch.float8_e4m3fn)
v_fp8 = v.to(torch.float8_e4m3fn)

out = flash_attn_func(q_fp8, k_fp8, v_fp8, causal=True)
# FP16/BF16 forward+backward is also supported by the FA3 interface.
```

## ほかの手段との使い分け {#when-to-use-vs-alternatives}

**Flash Attention を使うとよい場面:**
- 512 トークンを超える系列で Transformer を学習するとき
- 長い文脈（2K トークン超）で推論するとき
- GPU のメモリが足りないとき（通常の attention だと OOM になる）
- 精度を落とさずに 2〜4 倍速くしたいとき
- PyTorch 2.2 以降を使っている、または flash-attn を入れられるとき

**ほかの手段のほうが向いている場面:**
- **通常の attention**: &lt;256 トークンの系列（速くなる分より手間が上回ります）
- **xFormers**: 速さだけでなく、attention の種類をもっと使い分けたいとき
- **メモリ効率のよい attention**: CPU で推論するとき（Flash Attention には GPU が必要です）

## よくあるつまずき {#common-issues}

**症状: ImportError: cannot import flash_attn**

no-build-isolation を付けて入れ直してください。
```bash
pip install flash-attn --no-build-isolation
```

もしくは、先に CUDA ツールキットを入れます。
```bash
conda install cuda -c nvidia
pip install flash-attn --no-build-isolation
```

**症状: 思ったより遅い（速くならない）**

Flash Attention の効果は、系列が長いほど大きくなります。
- &lt;512 トークン: ほとんど変わりません（10〜20% 程度）
- 512〜2K トークン: 2〜3 倍
- 2K トークン超: 3〜4 倍

系列の長さが十分かどうかを確かめてください。

**症状: RuntimeError: CUDA error**

GPU が Flash Attention に対応しているか確かめます。次のコードで、GPU の世代を表す数値が表示されます。
```python

print(torch.cuda.get_device_capability())
# Should be ≥(7, 5) for Turing+
```

Flash Attention に必要な条件は次のとおりです。
- Ampere（A100、A10）: ✅ 完全に対応
- Turing（T4）: ✅ 対応
- Volta（V100）: ❌ 非対応

**症状: 精度が落ちる**

dtype が float16 か bfloat16 になっているか確かめてください（float32 は使えません）。
```python
q = q.to(torch.float16)  # Or torch.bfloat16
```

Flash Attention は速さのために float16/bfloat16 を使います。float32 には対応していません。

## さらに踏み込む {#advanced-topics}

**HuggingFace Transformers との組み合わせ**: BERT、GPT、Llama で Flash Attention を有効にする方法は [references/transformers-integration.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops\flash-attention/references/transformers-integration.md) を参照してください。

**性能の測定結果**: GPU と系列長ごとの速さとメモリの比較は [references/benchmarks.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops\flash-attention/references/benchmarks.md) にまとまっています。

## ハードウェアの条件 {#hardware-requirements}

- **GPU**: NVIDIA の Ampere 以降（A100、A10、A30）または AMD の MI200 以降
- **VRAM**: 通常の attention と同じ（Flash Attention でメモリが増えることはありません）
- **CUDA**: 12.0 以降（最低でも 11.8）
- **PyTorch**: 標準機能として使うなら 2.2 以降

**非対応**: V100（Volta）、CPU での推論

## 参考資料 {#resources}

- 論文: "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness"（NeurIPS 2022）
- 論文: "FlashAttention-2: Faster Attention with Better Parallelism and Work Partitioning"（ICLR 2024）
- ブログ: https://tridao.me/blog/2024/flash3/
- GitHub: https://github.com/Dao-AILab/flash-attention
- PyTorch のドキュメント: https://pytorch.org/docs/stable/generated/torch.nn.functional.scaled_dot_product_attention.html
