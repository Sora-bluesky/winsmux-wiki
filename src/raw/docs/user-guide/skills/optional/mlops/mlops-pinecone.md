---
title: "Pinecone — 本番の RAG と検索のためのマネージド型ベクトルデータベース"
description: "本番の RAG と検索のためのマネージド型ベクトルデータベース"
upstream_path: user-guide/skills/optional/mlops/mlops-pinecone.md
upstream_blob: c6cf88b25d4d9cad94b2ed1db11601e610262688
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/mlops/mlops-pinecone
---

# Pinecone {#pinecone}

本番の RAG と検索のためのマネージド型ベクトルデータベースです。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/mlops/pinecone` で導入します |
| パス | `optional-skills/mlops\pinecone` |
| バージョン | `1.0.1` |
| 作者 | Orchestra Research |
| ライセンス | MIT |
| 依存関係 | `pinecone` |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `RAG`, `Pinecone`, `Vector Database`, `Managed Service`, `Serverless`, `Hybrid Search`, `Production`, `Auto-Scaling`, `Low Latency`, `Recommendations` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Pinecone - Managed Vector Database {#pinecone---managed-vector-database}

本番の AI アプリケーションのためのベクトルデータベースです。

## Pinecone が向いているとき {#when-to-use-pinecone}

**次のようなときに使います:**
- 運用込みでサーバー管理のいらないベクトルデータベースがほしい
- 本番で動かす RAG（検索して補いながら文章を作る仕組み）のアプリケーション
- 負荷に応じた自動のスケールが必要
- 応答の速さが重要（&lt;100ms）
- インフラの面倒を見たくない
- ハイブリッド検索（密ベクトル + 疎ベクトル）が必要

**数字で見ると**:
- 運用まで込みの SaaS
- 数十億のベクトルまで自動でスケール
- **p95 の応答時間が &lt;100ms**
- 稼働率 99.9% の SLA

**他を選んだほうがよいとき**:
- **Chroma**: 自前で動かす、オープンソース
- **FAISS**: オフラインで、純粋な類似検索だけ
- **Weaviate**: 自前で動かして、機能をもっと使いたい

## すぐ試す {#quick-start}

### 導入 {#installation}

```bash
pip install pinecone
```

> 補足: 以前の `pinecone-client` パッケージは非推奨になりました。`pinecone`（v5 以降、現行は 9.x）を入れてください。読み込み方は `from pinecone import Pinecone` のままです。

### 基本の使い方 {#basic-usage}

```python
from pinecone import Pinecone, ServerlessSpec

# Initialize
pc = Pinecone(api_key="your-api-key")

# Create index
pc.create_index(
    name="my-index",
    dimension=1536,  # Must match embedding dimension
    metric="cosine",  # or "euclidean", "dotproduct"
    spec=ServerlessSpec(cloud="aws", region="us-east-1")
)

# Connect to index
index = pc.Index("my-index")

# Upsert vectors
index.upsert(vectors=[
    {"id": "vec1", "values": [0.1, 0.2, ...], "metadata": {"category": "A"}},
    {"id": "vec2", "values": [0.3, 0.4, ...], "metadata": {"category": "B"}}
])

# Query
results = index.query(
    vector=[0.1, 0.2, ...],
    top_k=5,
    include_metadata=True
)

print(results["matches"])
```

## 基本の操作 {#core-operations}

### インデックスを作る {#create-index}

```python
# Serverless (recommended)
pc.create_index(
    name="my-index",
    dimension=1536,
    metric="cosine",
    spec=ServerlessSpec(
        cloud="aws",         # or "gcp", "azure"
        region="us-east-1"
    )
)

# Pod-based (for consistent performance)
from pinecone import PodSpec

pc.create_index(
    name="my-index",
    dimension=1536,
    metric="cosine",
    spec=PodSpec(
        environment="us-east1-gcp",
        pod_type="p1.x1"
    )
)
```

### ベクトルを登録・更新する {#upsert-vectors}

```python
# Single upsert
index.upsert(vectors=[
    {
        "id": "doc1",
        "values": [0.1, 0.2, ...],  # 1536 dimensions
        "metadata": {
            "text": "Document content",
            "category": "tutorial",
            "timestamp": "2025-01-01"
        }
    }
])

# Batch upsert (recommended)
vectors = [
    {"id": f"vec{i}", "values": embedding, "metadata": metadata}
    for i, (embedding, metadata) in enumerate(zip(embeddings, metadatas))
]

index.upsert(vectors=vectors, batch_size=100)
```

### ベクトルを検索する {#query-vectors}

```python
# Basic query
results = index.query(
    vector=[0.1, 0.2, ...],
    top_k=10,
    include_metadata=True,
    include_values=False
)

# With metadata filtering
results = index.query(
    vector=[0.1, 0.2, ...],
    top_k=5,
    filter={"category": {"$eq": "tutorial"}}
)

# Namespace query
results = index.query(
    vector=[0.1, 0.2, ...],
    top_k=5,
    namespace="production"
)

# Access results
for match in results["matches"]:
    print(f"ID: {match['id']}")
    print(f"Score: {match['score']}")
    print(f"Metadata: {match['metadata']}")
```

### メタデータで絞り込む {#metadata-filtering}

```python
# Exact match
filter = {"category": "tutorial"}

# Comparison
filter = {"price": {"$gte": 100}}  # $gt, $gte, $lt, $lte, $ne

# Logical operators
filter = {
    "$and": [
        {"category": "tutorial"},
        {"difficulty": {"$lte": 3}}
    ]
}  # Also: $or

# In operator
filter = {"tags": {"$in": ["python", "ml"]}}
```

## 名前空間 {#namespaces}

```python
# Partition data by namespace
index.upsert(
    vectors=[{"id": "vec1", "values": [...]}],
    namespace="user-123"
)

# Query specific namespace
results = index.query(
    vector=[...],
    namespace="user-123",
    top_k=5
)

# List namespaces
stats = index.describe_index_stats()
print(stats['namespaces'])
```

## ハイブリッド検索（密 + 疎） {#hybrid-search-dense-sparse}

```python
# Upsert with sparse vectors
index.upsert(vectors=[
    {
        "id": "doc1",
        "values": [0.1, 0.2, ...],  # Dense vector
        "sparse_values": {
            "indices": [10, 45, 123],  # Token IDs
            "values": [0.5, 0.3, 0.8]   # TF-IDF scores
        },
        "metadata": {"text": "..."}
    }
])

# Hybrid query
# NOTE: index.query() does NOT accept an `alpha` kwarg. Pinecone stores a
# single sparse-dense vector, so weighting must be applied by pre-scaling the
# query vectors before sending them. Use the hybrid_score_norm helper below
# (alpha * dense + (1 - alpha) * sparse; alpha=1 → pure dense, 0 → pure sparse).

def hybrid_score_norm(dense, sparse, alpha: float):
    """Scale dense/sparse query vectors for weighted hybrid search."""
    if not 0 <= alpha <= 1:
        raise ValueError("alpha must be between 0 and 1")
    scaled_sparse = {
        "indices": sparse["indices"],
        "values": [v * (1 - alpha) for v in sparse["values"]],
    }
    return [v * alpha for v in dense], scaled_sparse

hdense, hsparse = hybrid_score_norm(
    dense=[0.1, 0.2, ...],
    sparse={"indices": [10, 45], "values": [0.5, 0.3]},
    alpha=0.5,  # 0=sparse, 1=dense, 0.5=balanced
)

results = index.query(
    vector=hdense,
    sparse_vector=hsparse,
    top_k=5,
)
```

## LangChain との連携 {#langchain-integration}

```python
from langchain_pinecone import PineconeVectorStore
from langchain_openai import OpenAIEmbeddings

# Create vector store
vectorstore = PineconeVectorStore.from_documents(
    documents=docs,
    embedding=OpenAIEmbeddings(),
    index_name="my-index"
)

# Query
results = vectorstore.similarity_search("query", k=5)

# With metadata filter
results = vectorstore.similarity_search(
    "query",
    k=5,
    filter={"category": "tutorial"}
)

# As retriever
retriever = vectorstore.as_retriever(search_kwargs={"k": 10})
```

## LlamaIndex との連携 {#llamaindex-integration}

```python
from llama_index.vector_stores.pinecone import PineconeVectorStore

# Connect to Pinecone
pc = Pinecone(api_key="your-key")
pinecone_index = pc.Index("my-index")

# Create vector store
vector_store = PineconeVectorStore(pinecone_index=pinecone_index)

# Use in LlamaIndex
from llama_index.core import StorageContext, VectorStoreIndex

storage_context = StorageContext.from_defaults(vector_store=vector_store)
index = VectorStoreIndex.from_documents(documents, storage_context=storage_context)
```

## インデックスを管理する {#index-management}

```python
# List indices
indexes = pc.list_indexes()

# Describe index
index_info = pc.describe_index("my-index")
print(index_info)

# Get index stats
stats = index.describe_index_stats()
print(f"Total vectors: {stats['total_vector_count']}")
print(f"Namespaces: {stats['namespaces']}")

# Delete index
pc.delete_index("my-index")
```

## ベクトルを削除する {#delete-vectors}

```python
# Delete by ID
index.delete(ids=["vec1", "vec2"])

# Delete by filter
index.delete(filter={"category": "old"})

# Delete all in namespace
index.delete(delete_all=True, namespace="test")

# Delete entire index
index.delete(delete_all=True)
```

## うまく使うこつ {#best-practices}

1. **サーバーレスを選ぶ** - 自動でスケールし、費用も抑えられます
2. **まとめて登録する** - そのほうが効率的です（1 回あたり 100〜200 件）
3. **メタデータを付ける** - 絞り込みができるようになります
4. **名前空間を使う** - 利用者やテナントごとにデータを分けられます
5. **使用量を見る** - Pinecone のダッシュボードで確認します
6. **絞り込みを最適化する** - よく使う条件のフィールドにはインデックスを張ります
7. **無料枠で試す** - インデックス 1 個、10 万ベクトルまで無料です
8. **ハイブリッド検索を使う** - 精度が上がります
9. **次元数を合わせる** - 埋め込みモデルと同じにします
10. **こまめにバックアップする** - 大事なデータは書き出しておきます

## 性能 {#performance}

| 操作 | 応答時間 | 補足 |
|-----------|---------|-------|
| 登録・更新 | 約 50〜100ms | 1 バッチあたり |
| 検索（p50） | 約 50ms | インデックスの大きさで変わります |
| 検索（p95） | 約 100ms | SLA の目標値 |
| メタデータでの絞り込み | 約 +10〜20ms | 追加でかかる分 |

## 料金（2025 年時点） {#pricing-as-of-2025}

**サーバーレス**:
- 読み取り 100 万ユニットあたり 0.096 ドル
- 書き込み 100 万ユニットあたり 0.06 ドル
- ストレージ 1GB あたり月 0.06 ドル

**無料枠**:
- サーバーレスのインデックス 1 個
- 10 万ベクトル（1536 次元）
- 試作にはこれで十分です

## 参考リンク {#resources}

- **サイト**: https://www.pinecone.io
- **ドキュメント**: https://docs.pinecone.io
- **コンソール**: https://app.pinecone.io
- **料金**: https://www.pinecone.io/pricing
