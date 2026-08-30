---
title: "Qdrant — 本番の RAG システムのためのベクトル検索エンジン"
description: "本番の RAG システムのためのベクトル検索エンジン"
upstream_path: user-guide/skills/optional/mlops/mlops-qdrant.md
upstream_blob: 80c171381c8a8b771af2cf25992e0714395e2db4
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/mlops/mlops-qdrant
---

# Qdrant {#qdrant}

本番の RAG システムのためのベクトル検索エンジンです。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/mlops/qdrant` で導入します |
| パス | `optional-skills/mlops\qdrant` |
| バージョン | `1.0.1` |
| 作者 | Orchestra Research |
| ライセンス | MIT |
| 依存関係 | `qdrant-client>=1.14.0` |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `RAG`, `Vector Search`, `Qdrant`, `Semantic Search`, `Embeddings`, `Similarity Search`, `HNSW`, `Production`, `Distributed` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Qdrant - Vector Similarity Search Engine {#qdrant---vector-similarity-search-engine}

本番の RAG と意味検索のために Rust で書かれた、性能の高いベクトルデータベースです。

## Qdrant が向いているとき {#when-to-use-qdrant}

**次のようなときに使います:**
- 応答の速さが求められる、本番の RAG システムを作る
- ハイブリッド検索（ベクトル + メタデータでの絞り込み）が必要
- シャーディングやレプリケーションで横に広げたい
- 自前の環境に置いて、データを完全に手元で管理したい
- 1 件のレコードに複数のベクトルを持たせたい（密 + 疎）
- リアルタイムのおすすめ機能を作る

**主な特徴:**
- **Rust 製**: メモリ安全で、性能が高い
- **絞り込みが充実**: 検索中に任意のペイロードのフィールドで絞り込めます
- **複数のベクトル**: 1 点につき密ベクトル、疎ベクトル、複数の密ベクトルを持てます
- **量子化**: スカラー、直積、バイナリでメモリを節約できます
- **分散対応**: Raft による合意、シャーディング、レプリケーション
- **REST + gRPC**: どちらの API でも同じ機能が使えます

**他を選んだほうがよいとき:**
- **Chroma**: 手軽に始めたい、アプリに組み込んで使いたい
- **FAISS**: 生の速度を最優先したい、研究や一括処理
- **Pinecone**: 運用込みで任せたい、手間をかけたくない
- **Weaviate**: GraphQL を使いたい、ベクトル化まで内蔵していてほしい

## すぐ試す {#quick-start}

### 導入 {#installation}

```bash
# Python client
pip install qdrant-client

# Docker (recommended for development)
docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant

# Docker with persistent storage
docker run -p 6333:6333 -p 6334:6334 \
    -v $(pwd)/qdrant_storage:/qdrant/storage \
    qdrant/qdrant
```

### 基本の使い方 {#basic-usage}

```python
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

# Connect to Qdrant
client = QdrantClient(host="localhost", port=6333)

# Create collection
client.create_collection(
    collection_name="documents",
    vectors_config=VectorParams(size=384, distance=Distance.COSINE)
)

# Insert vectors with payload
client.upsert(
    collection_name="documents",
    points=[
        PointStruct(
            id=1,
            vector=[0.1, 0.2, ...],  # 384-dim vector
            payload={"title": "Doc 1", "category": "tech"}
        ),
        PointStruct(
            id=2,
            vector=[0.3, 0.4, ...],
            payload={"title": "Doc 2", "category": "science"}
        )
    ]
)

# Search with filtering (query_points is the current API; client.search is removed in qdrant-client 1.14+)
response = client.query_points(
    collection_name="documents",
    query=[0.15, 0.25, ...],
    query_filter={
        "must": [{"key": "category", "match": {"value": "tech"}}]
    },
    limit=10
)

for point in response.points:
    print(f"ID: {point.id}, Score: {point.score}, Payload: {point.payload}")
```

## 基本の考え方 {#core-concepts}

### 点（point） - データの最小単位 {#points---basic-data-unit}

```python
from qdrant_client.models import PointStruct

# Point = ID + Vector(s) + Payload
point = PointStruct(
    id=123,                              # Integer or UUID string
    vector=[0.1, 0.2, 0.3, ...],        # Dense vector
    payload={                            # Arbitrary JSON metadata
        "title": "Document title",
        "category": "tech",
        "timestamp": 1699900000,
        "tags": ["python", "ml"]
    }
)

# Batch upsert (recommended)
client.upsert(
    collection_name="documents",
    points=[point1, point2, point3],
    wait=True  # Wait for indexing
)
```

### コレクション - ベクトルの入れ物 {#collections---vector-containers}

```python
from qdrant_client.models import VectorParams, Distance, HnswConfigDiff

# Create with HNSW configuration
client.create_collection(
    collection_name="documents",
    vectors_config=VectorParams(
        size=384,                        # Vector dimensions
        distance=Distance.COSINE         # COSINE, EUCLID, DOT, MANHATTAN
    ),
    hnsw_config=HnswConfigDiff(
        m=16,                            # Connections per node (default 16)
        ef_construct=100,                # Build-time accuracy (default 100)
        full_scan_threshold=10000        # Switch to brute force below this
    ),
    on_disk_payload=True                 # Store payload on disk
)

# Collection info
info = client.get_collection("documents")
print(f"Points: {info.points_count}, Vectors: {info.vectors_count}")
```

### 距離の測り方 {#distance-metrics}

| 測り方 | 向いている用途 | 値の範囲 |
|--------|----------|-------|
| `COSINE` | テキストの埋め込み、正規化済みのベクトル | 0〜2 |
| `EUCLID` | 空間のデータ、画像の特徴量 | 0〜∞ |
| `DOT` | おすすめ機能、正規化していないベクトル | -∞〜∞ |
| `MANHATTAN` | 疎な特徴量、離散のデータ | 0〜∞ |

## 検索の操作 {#search-operations}

### 基本の検索 {#basic-search}

```python
# Simple nearest neighbor search (returns a QueryResponse; use .points)
response = client.query_points(
    collection_name="documents",
    query=[0.1, 0.2, ...],
    limit=10,
    with_payload=True,
    with_vectors=False  # Don't return vectors (faster)
)
results = response.points
```

### 絞り込み付きの検索 {#filtered-search}

```python
from qdrant_client.models import Filter, FieldCondition, MatchValue, Range

# Complex filtering
response = client.query_points(
    collection_name="documents",
    query=query_embedding,
    query_filter=Filter(
        must=[
            FieldCondition(key="category", match=MatchValue(value="tech")),
            FieldCondition(key="timestamp", range=Range(gte=1699000000))
        ],
        must_not=[
            FieldCondition(key="status", match=MatchValue(value="archived"))
        ]
    ),
    limit=10
).points

# Shorthand filter syntax
response = client.query_points(
    collection_name="documents",
    query=query_embedding,
    query_filter={
        "must": [
            {"key": "category", "match": {"value": "tech"}},
            {"key": "price", "range": {"gte": 10, "lte": 100}}
        ]
    },
    limit=10
).points
```

### まとめて検索する {#batch-search}

```python
from qdrant_client.models import QueryRequest

# Multiple queries in one request (search_batch is replaced by query_batch_points)
responses = client.query_batch_points(
    collection_name="documents",
    requests=[
        QueryRequest(query=[0.1, ...], limit=5),
        QueryRequest(query=[0.2, ...], limit=5, filter={"must": [...]}),
        QueryRequest(query=[0.3, ...], limit=10)
    ]
)
# Each element is a QueryResponse; use .points
for resp in responses:
    for point in resp.points:
        print(point.id, point.score)
```

## RAG との連携 {#rag-integration}

### sentence-transformers と組み合わせる {#with-sentence-transformers}

```python
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct

# Initialize
encoder = SentenceTransformer("all-MiniLM-L6-v2")
client = QdrantClient(host="localhost", port=6333)

# Create collection
client.create_collection(
    collection_name="knowledge_base",
    vectors_config=VectorParams(size=384, distance=Distance.COSINE)
)

# Index documents
documents = [
    {"id": 1, "text": "Python is a programming language", "source": "wiki"},
    {"id": 2, "text": "Machine learning uses algorithms", "source": "textbook"},
]

points = [
    PointStruct(
        id=doc["id"],
        vector=encoder.encode(doc["text"]).tolist(),
        payload={"text": doc["text"], "source": doc["source"]}
    )
    for doc in documents
]
client.upsert(collection_name="knowledge_base", points=points)

# RAG retrieval
def retrieve(query: str, top_k: int = 5) -> list[dict]:
    query_vector = encoder.encode(query).tolist()
    response = client.query_points(
        collection_name="knowledge_base",
        query=query_vector,
        limit=top_k
    )
    return [{"text": r.payload["text"], "score": r.score} for r in response.points]

# Use in RAG pipeline
context = retrieve("What is Python?")
prompt = f"Context: {context}\n\nQuestion: What is Python?"
```

### LangChain と組み合わせる {#with-langchain}

```python
from langchain_community.vectorstores import Qdrant
from langchain_community.embeddings import HuggingFaceEmbeddings

embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
vectorstore = Qdrant.from_documents(documents, embeddings, url="http://localhost:6333", collection_name="docs")
retriever = vectorstore.as_retriever(search_kwargs={"k": 5})
```

### LlamaIndex と組み合わせる {#with-llamaindex}

```python
from llama_index.vector_stores.qdrant import QdrantVectorStore
from llama_index.core import VectorStoreIndex, StorageContext

vector_store = QdrantVectorStore(client=client, collection_name="llama_docs")
storage_context = StorageContext.from_defaults(vector_store=vector_store)
index = VectorStoreIndex.from_documents(documents, storage_context=storage_context)
query_engine = index.as_query_engine()
```

## 複数ベクトルへの対応 {#multi-vector-support}

### 名前付きベクトル（別々の埋め込みモデル） {#named-vectors-different-embedding-models}

```python
from qdrant_client.models import VectorParams, Distance

# Collection with multiple vector types
client.create_collection(
    collection_name="hybrid_search",
    vectors_config={
        "dense": VectorParams(size=384, distance=Distance.COSINE),
        "sparse": VectorParams(size=30000, distance=Distance.DOT)
    }
)

# Insert with named vectors
client.upsert(
    collection_name="hybrid_search",
    points=[
        PointStruct(
            id=1,
            vector={
                "dense": dense_embedding,
                "sparse": sparse_embedding
            },
            payload={"text": "document text"}
        )
    ]
)

# Search specific named vector (pass the vector name via `using`)
response = client.query_points(
    collection_name="hybrid_search",
    query=query_dense,
    using="dense",  # Specify which named vector to search
    limit=10
)
results = response.points
```

### 疎ベクトル（BM25、SPLADE） {#sparse-vectors-bm25-splade}

```python
from qdrant_client.models import SparseVectorParams, SparseIndexParams, SparseVector

# Collection with sparse vectors
client.create_collection(
    collection_name="sparse_search",
    vectors_config={},
    sparse_vectors_config={"text": SparseVectorParams(index=SparseIndexParams(on_disk=False))}
)

# Insert sparse vector
client.upsert(
    collection_name="sparse_search",
    points=[PointStruct(id=1, vector={"text": SparseVector(indices=[1, 5, 100], values=[0.5, 0.8, 0.2])}, payload={"text": "document"})]
)
```

## 量子化（メモリの節約） {#quantization-memory-optimization}

```python
from qdrant_client.models import ScalarQuantization, ScalarQuantizationConfig, ScalarType

# Scalar quantization (4x memory reduction)
client.create_collection(
    collection_name="quantized",
    vectors_config=VectorParams(size=384, distance=Distance.COSINE),
    quantization_config=ScalarQuantization(
        scalar=ScalarQuantizationConfig(
            type=ScalarType.INT8,
            quantile=0.99,        # Clip outliers
            always_ram=True      # Keep quantized in RAM
        )
    )
)

# Search with rescoring
response = client.query_points(
    collection_name="quantized",
    query=query,
    search_params={"quantization": {"rescore": True}},  # Rescore top results
    limit=10
)
results = response.points
```

## ペイロードへのインデックス {#payload-indexing}

```python
from qdrant_client.models import PayloadSchemaType

# Create payload index for faster filtering
client.create_payload_index(
    collection_name="documents",
    field_name="category",
    field_schema=PayloadSchemaType.KEYWORD
)

client.create_payload_index(
    collection_name="documents",
    field_name="timestamp",
    field_schema=PayloadSchemaType.INTEGER
)

# Index types: KEYWORD, INTEGER, FLOAT, GEO, TEXT (full-text), BOOL
```

## 本番での動かし方 {#production-deployment}

### Qdrant Cloud {#qdrant-cloud}

```python
from qdrant_client import QdrantClient

# Connect to Qdrant Cloud
client = QdrantClient(
    url="https://your-cluster.cloud.qdrant.io",
    api_key="your-api-key"
)
```

### 性能の調整 {#performance-tuning}

```python
# Optimize for search speed (higher recall)
client.update_collection(
    collection_name="documents",
    hnsw_config=HnswConfigDiff(ef_construct=200, m=32)
)

# Optimize for indexing speed (bulk loads)
client.update_collection(
    collection_name="documents",
    optimizer_config={"indexing_threshold": 20000}
)
```

## うまく使うこつ {#best-practices}

1. **まとめて処理する** - 登録も検索もバッチにすると効率的です
2. **ペイロードにインデックスを張る** - 絞り込みに使うフィールドが対象です
3. **量子化する** - 大きなコレクション（100 万ベクトル超）では有効にします
4. **シャーディングする** - 1000 万ベクトルを超えるコレクションで使います
5. **ディスクに置く** - ペイロードが大きいときは `on_disk_payload` を有効にします
6. **接続を使い回す** - クライアントのインスタンスは作り直さずに再利用します

## よくあるつまずき {#common-issues}

**絞り込むと検索が遅い:**
```python
# Create payload index for filtered fields
client.create_payload_index(
    collection_name="docs",
    field_name="category",
    field_schema=PayloadSchemaType.KEYWORD
)
```

**メモリが足りない:**
```python
# Enable quantization and on-disk storage
client.create_collection(
    collection_name="large_collection",
    vectors_config=VectorParams(size=384, distance=Distance.COSINE),
    quantization_config=ScalarQuantization(...),
    on_disk_payload=True
)
```

**接続がうまくいかない:**
```python
# Use timeout and retry
client = QdrantClient(
    host="localhost",
    port=6333,
    timeout=30,
    prefer_grpc=True  # gRPC for better performance
)
```

## 参照資料の一覧 {#references}

- **[Advanced Usage](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops\qdrant/references/advanced-usage.md)** - 分散モード、ハイブリッド検索、おすすめ機能
- **[Troubleshooting](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops\qdrant/references/troubleshooting.md)** - よくあるつまずき、原因の調べ方、性能の調整

## 参考リンク {#resources}

- **GitHub**: https://github.com/qdrant/qdrant （スター 22,000 以上）
- **ドキュメント**: https://qdrant.tech/documentation/
- **Python クライアント**: https://github.com/qdrant/qdrant-client
- **クラウド**: https://cloud.qdrant.io
- **バージョン**: 1.14.0 以降
- **ライセンス**: Apache 2.0
