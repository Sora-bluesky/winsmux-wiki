---
title: "Pinecone Research — Pinecone でエージェントの RAG と長期記憶を作る"
description: "Pinecone でエージェントの RAG と長期記憶を作る"
upstream_path: user-guide/skills/optional/research/research-pinecone-research.md
upstream_blob: dd6a9eb0796dbb9745d557f7f991b3dbcce50c4a
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/research/research-pinecone-research
---

# Pinecone Research {#pinecone-research}

Pinecone でエージェントの RAG と長期記憶を作ります。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加の skill です。`hermes skills install official/research/pinecone-research` で入れられます |
| パス | `optional-skills/research/pinecone-research` |
| バージョン | `1.0.0` |
| 作者 | immuhammadfurqan |
| ライセンス | MIT |
| 依存関係 | `pinecone-client`, `langchain-pinecone` |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `RAG`, `Pinecone`, `Memory`, `Research`, `Vector Database`, `Agent`, `Retrieval` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が動き出したときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Pinecone Research — エージェントの RAG と長期記憶 {#pinecone-research-agent-rag-long-term-memory}

エージェントとの会話に対して、Pinecone を検索拡張生成（RAG）の保管先として使います。
埋め込みを保存し、過去のやり取りから関係する文脈を取り出し、
長く残る記憶を作ります。

## こんなときに使います {#when-to-use-this-skill}

**使う場面:**
- Pinecone をベクトルの保管先として、エージェントの RAG を組み立てるとき
- 複数のやり取りをまたいで残る長期記憶が必要なとき
- 検索とエージェントのツール利用を組み合わせるとき
- 意味に基づく検索の流れを調べたり、試作したりするとき

**代わりに mlops/pinecone の skill を使う場面:**
- Pinecone 全般の情報（インデックスの管理、作成・読み出し・更新・削除、ハイブリッド検索）が必要なとき
- エージェントとつなげずに、本番の基盤を扱うとき

## すぐ試す {#quick-start}

### 準備 {#setup}

```bash
pip install pinecone-client langchain-pinecone langchain-openai
```

API キーを設定します:
```bash
export PINECONE_API_KEY="your-api-key"
```

### 基本の RAG の流れ {#basic-rag-pipeline}

```python
from pinecone import Pinecone, ServerlessSpec
from langchain_pinecone import PineconeVectorStore
from langchain_openai import OpenAIEmbeddings

# Initialize Pinecone
pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])

# Create or connect to index
index_name = "agent-memory"
if index_name not in [i.name for i in pc.list_indexes()]:
    pc.create_index(
        name=index_name,
        dimension=1536,
        metric="cosine",
        spec=ServerlessSpec(cloud="aws", region="us-east-1"),
    )

# Build vector store
vectorstore = PineconeVectorStore.from_documents(
    documents=docs,
    embedding=OpenAIEmbeddings(),
    index_name=index_name,
)

# Retrieve relevant context
retriever = vectorstore.as_retriever(search_kwargs={"k": 5})
results = retriever.invoke("What did the agent discuss yesterday?")
```

### 名前空間でやり取りごとに記憶を分ける {#namespace-based-session-memory}

```python
# Store per-session memory
vectorstore = PineconeVectorStore(
    index=pc.Index(index_name),
    embedding=OpenAIEmbeddings(),
    namespace=f"session-{session_id}",
)

# Query across all sessions (no namespace filter)
all_memory = PineconeVectorStore(
    index=pc.Index(index_name),
    embedding=OpenAIEmbeddings(),
)
results = all_memory.similarity_search("relevant query", k=10)
```

## うまく使うこつ {#best-practices}

1. **やり取りや利用者ごとに名前空間を分ける** — 複数の利用者が使うエージェントでは、データを切り離します
2. **まとめて登録する** — 効率よく進めるには 1 回あたり 100〜200 件が目安です
3. **メタデータで絞り込む** — やり取りの ID、時刻、話題をベクトルに付けておきます
4. **古い記憶を整理する** — 使わなくなった名前空間を消して費用を抑えます
5. **サーバーレスを使う** — 自動で規模が調整され、使った分だけの料金になります

## 参考 {#resources}

- **Pinecone のドキュメント**: https://docs.pinecone.io
- **LangChain との連携**: https://python.langchain.com/docs/integrations/vectorstores/pinecone
- **無料枠**: インデックス 1 つ、ベクトル 10 万件（1536 次元）
