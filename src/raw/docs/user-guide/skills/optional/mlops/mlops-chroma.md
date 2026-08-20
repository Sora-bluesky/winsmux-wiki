---
title: "Chroma — RAG と意味検索のための埋め込みデータベース"
description: "RAG と意味検索のための埋め込みデータベース"
upstream_path: user-guide/skills/optional/mlops/mlops-chroma.md
upstream_blob: 1dafc4cc54bcb635f8ed5757b0b031b649a26e01
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/mlops/mlops-chroma
---

# Chroma {#chroma}

RAG と意味検索のための埋め込みデータベースです。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/mlops/chroma` で導入します |
| パス | `optional-skills/mlops/chroma` |
| バージョン | `1.0.0` |
| 作者 | Orchestra Research |
| ライセンス | MIT |
| 依存関係 | `chromadb`, `sentence-transformers` |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `RAG`, `Chroma`, `Vector Database`, `Embeddings`, `Semantic Search`, `Open Source`, `Self-Hosted`, `Document Retrieval`, `Metadata Filtering` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Chroma - Open-Source Embedding Database {#chroma---open-source-embedding-database}

記憶を持つ LLM アプリを作るための、AI に寄り添った作りのデータベースです。

## Chroma が向いているとき {#when-to-use-chroma}

**次のようなときに使います:**
- RAG（検索して補いながら文章を作る仕組み）のアプリを作る
- 手元や自前のサーバーでベクトルデータベースを動かしたい
- オープンソース（Apache 2.0）で済ませたい
- ノートブックで試作したい
- 文書を意味で検索したい
- 埋め込みをメタデータと一緒に保存したい

**数字で見ると**:
- **GitHub のスター 24,300 以上**
- **フォーク 1,900 以上**
- **v1.3.3**（安定版。毎週リリースされています）
- **Apache 2.0 ライセンス**

**他を選んだほうがよいとき**:
- **Pinecone**: 運用込みのクラウド、自動でのスケール
- **FAISS**: 純粋な類似検索だけでよく、メタデータは不要
- **Weaviate**: 本番向けの、機械学習に寄せたデータベース
- **Qdrant**: Rust 製で性能が高い

## すぐ試す {#quick-start}

### 導入 {#installation}

```bash
# Python
pip install chromadb

# JavaScript/TypeScript
npm install chromadb @chroma-core/default-embed
```

### 基本の使い方（Python） {#basic-usage-python}

```python

# Create client
client = chromadb.Client()

# Create collection
collection = client.create_collection(name="my_collection")

# Add documents
collection.add(
    documents=["This is document 1", "This is document 2"],
    metadatas=[{"source": "doc1"}, {"source": "doc2"}],
    ids=["id1", "id2"]
)

# Query
results = collection.query(
    query_texts=["document about topic"],
    n_results=2
)

print(results)
```

## 基本の操作 {#core-operations}

### 1. コレクションを作る {#1-create-collection}

```python
# Simple collection
collection = client.create_collection("my_docs")

# With custom embedding function
from chromadb.utils import embedding_functions

openai_ef = embedding_functions.OpenAIEmbeddingFunction(
    api_key="your-key",
    model_name="text-embedding-3-small"
)

collection = client.create_collection(
    name="my_docs",
    embedding_function=openai_ef
)

# Get existing collection
collection = client.get_collection("my_docs")

# Delete collection
client.delete_collection("my_docs")
```

### 2. 文書を追加する {#2-add-documents}

```python
# Add with auto-generated IDs
collection.add(
    documents=["Doc 1", "Doc 2", "Doc 3"],
    metadatas=[
        {"source": "web", "category": "tutorial"},
        {"source": "pdf", "page": 5},
        {"source": "api", "timestamp": "2025-01-01"}
    ],
    ids=["id1", "id2", "id3"]
)

# Add with custom embeddings
collection.add(
    embeddings=[[0.1, 0.2, ...], [0.3, 0.4, ...]],
    documents=["Doc 1", "Doc 2"],
    ids=["id1", "id2"]
)
```

### 3. 検索する（類似検索） {#3-query-similarity-search}

```python
# Basic query
results = collection.query(
    query_texts=["machine learning tutorial"],
    n_results=5
)

# Query with filters
results = collection.query(
    query_texts=["Python programming"],
    n_results=3,
    where={"source": "web"}
)

# Query with metadata filters
results = collection.query(
    query_texts=["advanced topics"],
    where={
        "$and": [
            {"category": "tutorial"},
            {"difficulty": {"$gte": 3}}
        ]
    }
)

# Access results
print(results["documents"])      # List of matching documents
print(results["metadatas"])      # Metadata for each doc
print(results["distances"])      # Similarity scores
print(results["ids"])            # Document IDs
```

### 4. 文書を取り出す {#4-get-documents}

```python
# Get by IDs
docs = collection.get(
    ids=["id1", "id2"]
)

# Get with filters
docs = collection.get(
    where={"category": "tutorial"},
    limit=10
)

# Get all documents
docs = collection.get()
```

### 5. 文書を更新する {#5-update-documents}

```python
# Update document content
collection.update(
    ids=["id1"],
    documents=["Updated content"],
    metadatas=[{"source": "updated"}]
)
```

### 6. 文書を削除する {#6-delete-documents}

```python
# Delete by IDs
collection.delete(ids=["id1", "id2"])

# Delete with filter
collection.delete(
    where={"source": "outdated"}
)
```

## ディスクに残す {#persistent-storage}

```python
# Persist to disk
client = chromadb.PersistentClient(path="./chroma_db")

collection = client.create_collection("my_docs")
collection.add(documents=["Doc 1"], ids=["id1"])

# Data persisted automatically
# Reload later with same path
client = chromadb.PersistentClient(path="./chroma_db")
collection = client.get_collection("my_docs")
```

## 埋め込みの作り方 {#embedding-functions}

### 既定（Sentence Transformers） {#default-sentence-transformers}

```python
# Uses sentence-transformers by default
collection = client.create_collection("my_docs")
# Default model: all-MiniLM-L6-v2
```

### OpenAI {#openai}

```python
from chromadb.utils import embedding_functions

openai_ef = embedding_functions.OpenAIEmbeddingFunction(
    api_key="your-key",
    model_name="text-embedding-3-small"
)

collection = client.create_collection(
    name="openai_docs",
    embedding_function=openai_ef
)
```

### HuggingFace {#huggingface}

```python
huggingface_ef = embedding_functions.HuggingFaceEmbeddingFunction(
    api_key="your-key",
    model_name="sentence-transformers/all-mpnet-base-v2"
)

collection = client.create_collection(
    name="hf_docs",
    embedding_function=huggingface_ef
)
```

### 自分で用意した埋め込み {#custom-embedding-function}

```python
from chromadb import Documents, EmbeddingFunction, Embeddings

class MyEmbeddingFunction(EmbeddingFunction):
    def __call__(self, input: Documents) -> Embeddings:
        # Your embedding logic
        return embeddings

my_ef = MyEmbeddingFunction()
collection = client.create_collection(
    name="custom_docs",
    embedding_function=my_ef
)
```

## メタデータで絞り込む {#metadata-filtering}

```python
# Exact match
results = collection.query(
    query_texts=["query"],
    where={"category": "tutorial"}
)

# Comparison operators
results = collection.query(
    query_texts=["query"],
    where={"page": {"$gt": 10}}  # $gt, $gte, $lt, $lte, $ne
)

# Logical operators
results = collection.query(
    query_texts=["query"],
    where={
        "$and": [
            {"category": "tutorial"},
            {"difficulty": {"$lte": 3}}
        ]
    }  # Also: $or
)

# Contains
results = collection.query(
    query_texts=["query"],
    where={"tags": {"$in": ["python", "ml"]}}
)
```

## LangChain と組み合わせる {#langchain-integration}

```python
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter

# Split documents
text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000)
docs = text_splitter.split_documents(documents)

# Create Chroma vector store
vectorstore = Chroma.from_documents(
    documents=docs,
    embedding=OpenAIEmbeddings(),
    persist_directory="./chroma_db"
)

# Query
results = vectorstore.similarity_search("machine learning", k=3)

# As retriever
retriever = vectorstore.as_retriever(search_kwargs={"k": 5})
```

## LlamaIndex と組み合わせる {#llamaindex-integration}

```python
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.core import VectorStoreIndex, StorageContext

# Initialize Chroma
db = chromadb.PersistentClient(path="./chroma_db")
collection = db.get_or_create_collection("my_collection")

# Create vector store
vector_store = ChromaVectorStore(chroma_collection=collection)
storage_context = StorageContext.from_defaults(vector_store=vector_store)

# Create index
index = VectorStoreIndex.from_documents(
    documents,
    storage_context=storage_context
)

# Query
query_engine = index.as_query_engine()
response = query_engine.query("What is machine learning?")
```

## サーバーとして動かす {#server-mode}

```python
# Run Chroma server
# Terminal: chroma run --path ./chroma_db --port 8000

# Connect to server

from chromadb.config import Settings

client = chromadb.HttpClient(
    host="localhost",
    port=8000,
    settings=Settings(anonymized_telemetry=False)
)

# Use as normal
collection = client.get_or_create_collection("my_docs")
```

## うまくやるこつ {#best-practices}

1. **ディスクに残すクライアントを使う** - 再起動でデータを失わないように
2. **メタデータを付ける** - 絞り込みや追跡ができるようになります
3. **まとめて処理する** - 文書は一度に複数追加します
4. **合う埋め込みモデルを選ぶ** - 速さと質のつり合いを取ります
5. **絞り込みを使う** - 探す範囲を狭めます
6. **ID を重複させない** - ぶつからないように
7. **こまめに控えを取る** - chroma_db のディレクトリをコピーします
8. **コレクションの大きさを見ておく** - 必要なら増強します
9. **埋め込みの作り方を試す** - 質を確かめます
10. **本番ではサーバーとして動かす** - 複数の利用者に向いています

## 性能の目安 {#performance}

| 操作 | 待ち時間 | 補足 |
|-----------|---------|-------|
| 文書 100 件の追加 | 約 1〜3 秒 | 埋め込みの作成を含みます |
| 検索（上位 10 件） | 約 50〜200 ミリ秒 | コレクションの大きさによります |
| メタデータでの絞り込み | 約 10〜50 ミリ秒 | 索引が整っていれば高速です |

## 参考先 {#resources}

- **GitHub**: https://github.com/chroma-core/chroma ⭐ 24,300+
- **Docs**: https://docs.trychroma.com
- **Discord**: https://discord.gg/MMeYNTmh3x
- **バージョン**: 1.3.3 以降
- **ライセンス**: Apache 2.0
