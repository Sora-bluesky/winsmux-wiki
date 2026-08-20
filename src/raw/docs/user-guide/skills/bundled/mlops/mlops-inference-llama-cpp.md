---
title: "Llama Cpp — llama.cpp によるローカル GGUF 推論と HF Hub でのモデル探索"
description: "llama.cpp によるローカル GGUF 推論と HF Hub でのモデル探索"
upstream_path: user-guide/skills/bundled/mlops/mlops-inference-llama-cpp.md
upstream_blob: 95997729c5779a8d19e1b5542eaafe9563c85d93
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/mlops/mlops-inference-llama-cpp
---

# Llama Cpp {#llama-cpp}

llama.cpp でローカルの GGUF 推論を動かし、HF Hub でモデルを探します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/mlops/inference/llama-cpp` |
| バージョン | `2.1.2` |
| 作者 | Orchestra Research |
| ライセンス | MIT |
| 依存関係 | `llama-cpp-python>=0.2.0` |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `llama.cpp`, `GGUF`, `Quantization`, `Hugging Face Hub`, `CPU Inference`, `Apple Silicon`, `Edge Deployment`, `AMD GPUs`, `Intel GPUs`, `NVIDIA`, `URL-first` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# llama.cpp + GGUF {#llamacpp-gguf}

ローカルでの GGUF 推論、量子化の選択、llama.cpp 向けの Hugging Face リポジトリ探しには、この skill を使います。

## 使いどころ {#when-to-use}

- CPU、Apple Silicon、CUDA、ROCm、Intel GPU でローカルのモデルを動かす
- 特定の Hugging Face リポジトリに合った GGUF を見つける
- Hub の情報から `llama-server` や `llama-cli` のコマンドを組み立てる
- llama.cpp にすでに対応しているモデルを Hub で探す
- あるリポジトリにどんな `.gguf` ファイルがあり、それぞれ何バイトかを列挙する
- 手元の RAM や VRAM に合わせて Q4/Q5/Q6/IQ のどれを選ぶか決める

## モデル探索の流れ {#model-discovery-workflow}

`hf` コマンドや Python、独自スクリプトを求める前に、まず URL でたどれる手順を試します。

1. 候補になるリポジトリを Hub で探します。
   - 基本: `https://huggingface.co/models?apps=llama.cpp&sort=trending`
   - モデルファミリーを絞るなら `search=<term>` を足します
   - サイズの制約があるときは `num_parameters=min:0,max:24B` などを足します
2. llama.cpp のローカルアプリ表示でリポジトリを開きます。
   - `https://huggingface.co/<repo>?local-app=llama.cpp`
3. ローカルアプリのスニペットが見えているなら、それを正とみなします。
   - `llama-server` や `llama-cli` のコマンドをそのまま写します
   - 推奨の量子化は HF の表示どおりに伝えます
4. 同じ `?local-app=llama.cpp` の URL をページのテキストか HTML として読み、`Hardware compatibility` の節を取り出します。
   - 一般的な表よりも、そこに書かれた正確な量子化ラベルとサイズを優先します
   - `UD-Q4_K_M` や `IQ4_NL_XL` のような、そのリポジトリ固有のラベルはそのまま残します
   - 取得したページのソースにその節が見当たらないときは、その旨を伝えたうえで、tree API と一般的な量子化の指針に切り替えます
5. 実際に何が存在するかを tree API で確かめます。
   - `https://huggingface.co/api/models/<repo>/tree/main?recursive=true`
   - `type` が `file` で、`path` が `.gguf` で終わるものだけを残します
   - ファイル名とバイト数は `path` と `size` を正とします
   - 量子化済みのチェックポイントと、`mmproj-*.gguf` のプロジェクタファイルや `BF16/` のシャードファイルは分けて扱います
   - `https://huggingface.co/<repo>/tree/main` は人が見るための予備としてだけ使います
6. ローカルアプリのスニペットがテキストとして読めないときは、リポジトリ名と選んだ量子化からコマンドを組み立てます。
   - 短縮形での量子化指定: `llama-server -hf <repo>:<QUANT>`
   - ファイル名を直接指定する場合: `llama-server --hf-repo <repo> --hf-file <filename.gguf>`
7. Transformers の重みからの変換をすすめるのは、そのリポジトリに GGUF ファイルが用意されていないときだけです。

## すぐ試す {#quick-start}

### llama.cpp のインストール {#install-llamacpp}

```bash
# macOS / Linux (simplest)
brew install llama.cpp
```

```bash
winget install llama.cpp
```

```bash
git clone https://github.com/ggml-org/llama.cpp
cd llama.cpp
cmake -B build
cmake --build build --config Release
```

### Hugging Face Hub から直接動かす {#run-directly-from-the-hugging-face-hub}

```bash
llama-cli -hf bartowski/Llama-3.2-3B-Instruct-GGUF:Q8_0
```

```bash
llama-server -hf bartowski/Llama-3.2-3B-Instruct-GGUF:Q8_0
```

### Hub の特定の GGUF ファイルを指定して動かす {#run-an-exact-gguf-file-from-the-hub}

tree API を見てファイル名の付け方が独自だったときや、HF のスニペットが見当たらないときは、この形を使います。

```bash
llama-server \
    --hf-repo microsoft/Phi-3-mini-4k-instruct-gguf \
    --hf-file Phi-3-mini-4k-instruct-q4.gguf \
    -c 4096
```

### OpenAI 互換サーバーの動作確認 {#openai-compatible-server-check}

```bash
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Write a limerick about Python exceptions"}
    ]
  }'
```

## Python バインディング (llama-cpp-python) {#python-bindings-llama-cpp-python}

`pip install llama-cpp-python` で入ります（CUDA なら `CMAKE_ARGS="-DGGML_CUDA=on" pip install llama-cpp-python --force-reinstall --no-cache-dir`、Metal なら `CMAKE_ARGS="-DGGML_METAL=on" ...`）。

### 基本の生成 {#basic-generation}

```python
from llama_cpp import Llama

llm = Llama(
    model_path="./model-q4_k_m.gguf",
    n_ctx=4096,
    n_gpu_layers=35,     # 0 for CPU, 99 to offload everything
    n_threads=8,
)

out = llm("What is machine learning?", max_tokens=256, temperature=0.7)
print(out["choices"][0]["text"])
```

### チャットとストリーミング {#chat-streaming}

```python
llm = Llama(
    model_path="./model-q4_k_m.gguf",
    n_ctx=4096,
    n_gpu_layers=35,
    chat_format="llama-3",   # or "chatml", "mistral", etc.
)

resp = llm.create_chat_completion(
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "What is Python?"},
    ],
    max_tokens=256,
)
print(resp["choices"][0]["message"]["content"])

# Streaming
for chunk in llm("Explain quantum computing:", max_tokens=256, stream=True):
    print(chunk["choices"][0]["text"], end="", flush=True)
```

### 埋め込み {#embeddings}

```python
llm = Llama(model_path="./model-q4_k_m.gguf", embedding=True, n_gpu_layers=35)
vec = llm.embed("This is a test sentence.")
print(f"Embedding dimension: {len(vec)}")
```

GGUF を Hub から直接読み込むこともできます。

```python
llm = Llama.from_pretrained(
    repo_id="bartowski/Llama-3.2-3B-Instruct-GGUF",
    filename="*Q4_K_M.gguf",
    n_gpu_layers=35,
)
```

## 量子化の選び方 {#choosing-a-quant}

まず Hub のページを見て、一般的な目安はその次に使います。

- 使う人のハードウェア構成に対して HF が対応と示している量子化を、そのまま選びます。
- ふつうのチャット用途なら、まず `Q4_K_M` から始めます。
- コードや技術的な作業では、メモリに余裕があれば `Q5_K_M` か `Q6_K` を選びます。
- RAM がかなり厳しいときは `Q3_K_M` や `IQ` 系、`Q2` 系も候補になりますが、品質より収まることを優先すると本人が明言した場合だけにします。
- マルチモーダルのリポジトリでは `mmproj-*.gguf` を別扱いで案内します。プロジェクタはモデル本体のファイルではありません。
- リポジトリ独自のラベルを一般的な名前に直さないでください。ページに `UD-Q4_K_M` とあれば、`UD-Q4_K_M` と伝えます。

## リポジトリにある GGUF を洗い出す {#extracting-available-ggufs-from-a-repo}

どんな GGUF があるかを聞かれたら、次を返します。

- ファイル名
- ファイルサイズ
- 量子化のラベル
- モデル本体か、補助のプロジェクタか

頼まれない限り、次は省きます。

- README
- BF16 のシャードファイル
- imatrix のデータや校正用の生成物

この手順では tree API を使います。

- `https://huggingface.co/api/models/<repo>/tree/main?recursive=true`

たとえば `unsloth/Qwen3.6-35B-A3B-GGUF` のようなリポジトリでは、ローカルアプリのページに `UD-Q4_K_M`、`UD-Q5_K_M`、`UD-Q6_K`、`Q8_0` といった量子化のチップが並び、tree API のほうには `Qwen3.6-35B-A3B-UD-Q4_K_M.gguf` や `Qwen3.6-35B-A3B-Q8_0.gguf` といった正確なファイルパスとバイト数が出てきます。量子化ラベルから実際のファイル名を突き止めるには、tree API を使います。

## 検索に使う URL の形 {#search-patterns}

次の形の URL をそのまま使います。

```text
https://huggingface.co/models?apps=llama.cpp&sort=trending
https://huggingface.co/models?search=<term>&apps=llama.cpp&sort=trending
https://huggingface.co/models?search=<term>&apps=llama.cpp&num_parameters=min:0,max:24B&sort=trending
https://huggingface.co/<repo>?local-app=llama.cpp
https://huggingface.co/api/models/<repo>/tree/main?recursive=true
https://huggingface.co/<repo>/tree/main
```

## 出力の形 {#output-format}

探索の依頼に答えるときは、次のような簡潔で構造のある形にまとめます。

```text
Repo: <repo>
Recommended quant from HF: <label> (<size>)
llama-server: <command>
Other GGUFs:
- <filename> - <size>
- <filename> - <size>
Source URLs:
- <local-app URL>
- <tree API URL>
```

## 参考資料 {#references}

- **[hub-discovery.md](https://github.com/NousResearch/hermes-agent/blob/main/skills/mlops/inference/llama-cpp/references/hub-discovery.md)** - URL だけで完結する Hugging Face の手順、検索の形、GGUF の洗い出し、コマンドの組み立て
- **[advanced-usage.md](https://github.com/NousResearch/hermes-agent/blob/main/skills/mlops/inference/llama-cpp/references/advanced-usage.md)** — 投機的デコーディング、バッチ推論、文法で制約した生成、LoRA、マルチ GPU、独自ビルド、ベンチマーク用スクリプト
- **[quantization.md](https://github.com/NousResearch/hermes-agent/blob/main/skills/mlops/inference/llama-cpp/references/quantization.md)** — 量子化による品質の増減、Q4/Q5/Q6/IQ の使い分け、モデルサイズとの関係、imatrix
- **[server.md](https://github.com/NousResearch/hermes-agent/blob/main/skills/mlops/inference/llama-cpp/references/server.md)** — Hub から直接サーバーを起動する方法、OpenAI API のエンドポイント、Docker での配備、NGINX での負荷分散、監視
- **[optimization.md](https://github.com/NousResearch/hermes-agent/blob/main/skills/mlops/inference/llama-cpp/references/optimization.md)** — CPU のスレッド設定、BLAS、GPU へのオフロードの目安、バッチの調整、ベンチマーク
- **[troubleshooting.md](https://github.com/NousResearch/hermes-agent/blob/main/skills/mlops/inference/llama-cpp/references/troubleshooting.md)** — インストール・変換・量子化・推論・サーバーで起きる問題、Apple Silicon、デバッグ

## 関連リンク {#resources}

- **GitHub**: https://github.com/ggml-org/llama.cpp
- **Hugging Face の GGUF + llama.cpp ドキュメント**: https://huggingface.co/docs/hub/gguf-llamacpp
- **Hugging Face の Local Apps ドキュメント**: https://huggingface.co/docs/hub/main/local-apps
- **Hugging Face の Local Agents ドキュメント**: https://huggingface.co/docs/hub/agents-local
- **ローカルアプリのページの例**: https://huggingface.co/unsloth/Qwen3.6-35B-A3B-GGUF?local-app=llama.cpp
- **tree API の例**: https://huggingface.co/api/models/unsloth/Qwen3.6-35B-A3B-GGUF/tree/main?recursive=true
- **llama.cpp 向け検索の例**: https://huggingface.co/models?num_parameters=min:0,max:24B&apps=llama.cpp&sort=trending
- **ライセンス**: MIT
