---
title: "Faiss — 10 億件規模でも速い、ベクトルの類似検索"
description: "10 億件規模でも速い、ベクトルの類似検索"
upstream_path: user-guide/skills/optional/mlops/mlops-faiss.md
upstream_blob: e83bc5a59be3fbee511f771d7b657232b0ae024c
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/mlops/mlops-faiss
---

# Faiss {#faiss}

10 億件規模でも速い、ベクトルの類似検索です。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/mlops/faiss` で導入します |
| パス | `optional-skills/mlops/faiss` |
| バージョン | `1.0.0` |
| 作者 | Orchestra Research |
| ライセンス | MIT |
| 依存関係 | `faiss-cpu`, `faiss-gpu`, `numpy` |
| 対応プラットフォーム | linux, macos |
| タグ | `RAG`, `FAISS`, `Similarity Search`, `Vector Search`, `Facebook AI`, `GPU Acceleration`, `Billion-Scale`, `K-NN`, `HNSW`, `High Performance`, `Large Scale` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# FAISS - Efficient Similarity Search {#faiss---efficient-similarity-search}

10 億件規模のベクトルの類似検索を扱う、Facebook AI のライブラリです。

## FAISS が向いているとき {#when-to-use-faiss}

**次のようなときに使います:**
- 大きなベクトルの集まり（数百万〜数十億件）を素早く検索したい
- GPU で速くしたい
- 純粋なベクトルの近さだけで足り、メタデータでの絞り込みは要らない
- 高いスループットと短い待ち時間が欠かせない
- 埋め込みをまとめて処理したい

**数字で見ると**:
- **GitHub のスター 31,700 以上**
- Meta / Facebook AI Research 製
- **数十億件のベクトルを扱えます**
- **C++** 製で、Python から使えます

**他を選んだほうがよいとき**:
- **Chroma / Pinecone**: メタデータでの絞り込みが要る
- **Weaviate**: データベースとしての機能がひととおり要る
- **Annoy**: もっと単純で、機能は少なくてよい

## すぐ試す {#quick-start}

### 導入 {#installation}

```bash
# CPU only
pip install faiss-cpu

# GPU support
pip install faiss-gpu
```

### 基本の使い方 {#basic-usage}

```python

# Create sample data (1000 vectors, 128 dimensions)
d = 128
nb = 1000
vectors = np.random.random((nb, d)).astype('float32')

# Create index
index = faiss.IndexFlatL2(d)  # L2 distance
index.add(vectors)             # Add vectors

# Search
k = 5  # Find 5 nearest neighbors
query = np.random.random((1, d)).astype('float32')
distances, indices = index.search(query, k)

print(f"Nearest neighbors: {indices}")
print(f"Distances: {distances}")
```

## 索引の種類 {#index-types}

### 1. Flat（厳密に探す） {#1-flat-exact-search}

```python
# L2 (Euclidean) distance
index = faiss.IndexFlatL2(d)

# Inner product (cosine similarity if normalized)
index = faiss.IndexFlatIP(d)

# Slowest, most accurate
```

### 2. IVF（転置ファイル）- 速いおおよその検索 {#2-ivf-inverted-file---fast-approximate}

```python
# Create quantizer
quantizer = faiss.IndexFlatL2(d)

# IVF index with 100 clusters
nlist = 100
index = faiss.IndexIVFFlat(quantizer, d, nlist)

# Train on data
index.train(vectors)

# Add vectors
index.add(vectors)

# Search (nprobe = clusters to search)
index.nprobe = 10
distances, indices = index.search(query, k)
```

### 3. HNSW（階層型 NSW）- 質と速さのつり合いがいちばん良い {#3-hnsw-hierarchical-nsw---best-qualityspeed}

```python
# HNSW index
M = 32  # Number of connections per layer
index = faiss.IndexHNSWFlat(d, M)

# No training needed
index.add(vectors)

# Search
distances, indices = index.search(query, k)
```

### 4. Product Quantization - メモリを節約する {#4-product-quantization---memory-efficient}

```python
# PQ reduces memory by 16-32×
m = 8   # Number of subquantizers
nbits = 8
index = faiss.IndexPQ(d, m, nbits)

# Train and add
index.train(vectors)
index.add(vectors)
```

## 保存と読み込み {#save-and-load}

```python
# Save index
faiss.write_index(index, "large.index")

# Load index
index = faiss.read_index("large.index")

# Continue using
distances, indices = index.search(query, k)
```

## GPU で速くする {#gpu-acceleration}

```python
# Single GPU
res = faiss.StandardGpuResources()
index_cpu = faiss.IndexFlatL2(d)
index_gpu = faiss.index_cpu_to_gpu(res, 0, index_cpu)  # GPU 0

# Multi-GPU
index_gpu = faiss.index_cpu_to_all_gpus(index_cpu)

# 10-100× faster than CPU
```

## LangChain と組み合わせる {#langchain-integration}

```python
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings

# Create FAISS vector store
vectorstore = FAISS.from_documents(docs, OpenAIEmbeddings())

# Save
vectorstore.save_local("faiss_index")

# Load
vectorstore = FAISS.load_local(
    "faiss_index",
    OpenAIEmbeddings(),
    allow_dangerous_deserialization=True
)

# Search
results = vectorstore.similarity_search("query", k=5)
```

## LlamaIndex と組み合わせる {#llamaindex-integration}

```python
from llama_index.vector_stores.faiss import FaissVectorStore

# Create FAISS index
d = 1536
faiss_index = faiss.IndexFlatL2(d)

vector_store = FaissVectorStore(faiss_index=faiss_index)
```

## うまくやるこつ {#best-practices}

1. **合う索引を選ぶ** - 1 万件未満なら Flat、1 万〜100 万件なら IVF、質を取るなら HNSW
2. **コサイン類似度には正規化を** - 正規化したベクトルと IndexFlatIP を使います
3. **大きなデータには GPU を** - 10〜100 倍速くなります
4. **学習済みの索引を保存する** - 学習には手間がかかります
5. **nprobe や ef_search を調整する** - 速さと正確さのつり合いを取ります
6. **メモリを見ておく** - 大きなデータには PQ を使います
7. **問い合わせをまとめる** - GPU を活かしやすくなります

## 性能の目安 {#performance}

| 索引の種類 | 作成の時間 | 検索の時間 | メモリ | 正確さ |
|------------|------------|-------------|--------|----------|
| Flat | 速い | 遅い | 多い | 100% |
| IVF | ふつう | 速い | ふつう | 95〜99% |
| HNSW | 遅い | いちばん速い | 多い | 99% |
| PQ | ふつう | 速い | 少ない | 90〜95% |

## 参考先 {#resources}

- **GitHub**: https://github.com/facebookresearch/faiss ⭐ 31,700+
- **解説ページ**: https://github.com/facebookresearch/faiss/wiki
- **ライセンス**: MIT
