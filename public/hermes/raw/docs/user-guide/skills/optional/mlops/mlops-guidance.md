---
title: "Guidance — 文法で LLM の出力を縛り、必ず妥当な JSON を得る"
description: "文法で LLM の出力を縛り、必ず妥当な JSON を得る"
upstream_path: user-guide/skills/optional/mlops/mlops-guidance.md
upstream_blob: d8f7de7512a1f21224c9067aed93f14d32bd62f9
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/mlops/mlops-guidance
---

# Guidance {#guidance}

文法で LLM の出力を縛り、必ず妥当な JSON を得ます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/mlops/guidance` で導入します |
| パス | `optional-skills/mlops/guidance` |
| バージョン | `1.0.1` |
| 作者 | Orchestra Research |
| ライセンス | MIT |
| 依存関係 | `guidance`, `transformers` |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Prompt Engineering`, `Guidance`, `Constrained Generation`, `Structured Output`, `JSON Validation`, `Grammar`, `Microsoft Research`, `Format Enforcement`, `Multi-Step Workflows` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Guidance: 制約付きの LLM 生成 {#guidance-constrained-llm-generation}

## この skill を使う場面 {#when-to-use-this-skill}

Guidance は、次のようなことをしたいときに使います。
- **LLM の出力の形を制御する**（正規表現や文法で）
- **妥当な JSON/XML/コードを必ず生成する**
- 従来のプロンプトの書き方に比べて**待ち時間を減らす**
- **決まった形式を守らせる**（日付、メールアドレス、ID など）
- Python らしい制御構文で**複数手順の処理を組み立てる**
- 文法上の制約によって**おかしな出力を出させない**

**GitHub のスター数**: 18,000 以上 | **提供**: Microsoft Research

## 導入 {#installation}

次のコマンドで導入します。バックエンドごとの追加指定もあります。

```bash
# Base installation
pip install guidance

# With specific backends
pip install guidance[transformers]  # Hugging Face models
pip install guidance[llama_cpp]     # llama.cpp models
```

## はじめの一歩 {#quick-start}

### 基本の例: 形の決まった生成 {#basic-example-structured-generation}

次のコードは、モデルを読み込んで「フランスの首都」を最大 5 トークンで生成し、その結果を取り出します。

```python
from guidance import models, gen

# Load model (supports OpenAI, Transformers, llama.cpp)
lm = models.OpenAI("gpt-4")

# Generate with constraints
result = lm + "The capital of France is " + gen("capital", max_tokens=5)

print(result["capital"])  # "Paris"
```

### 手元のモデルでチャット形式を使う {#chat-format-with-a-local-model}

> **制約を効かせるには、logit に直接触れる必要があります。** 正規表現、`select()`、文法による制約付き生成が使えるのは手元で動くバックエンド（`Transformers`、`LlamaCpp`）だけです。リモートの API バックエンド（`OpenAI` と Azure 系）は、制約なしの `gen()` とチャットにしか対応しておらず、トークン単位の制約はかけられません。guidance 0.3.x に `models.Anthropic` クラスはありません。

```python
from guidance import models, gen, system, user, assistant

# Local model (supports constrained generation)
lm = models.Transformers("microsoft/Phi-4-mini-instruct")

# Use context managers for chat format
with system():
    lm += "You are a helpful assistant."

with user():
    lm += "What is the capital of France?"

with assistant():
    lm += gen(max_tokens=20)
```

## 中心となる考え方 {#core-concepts}

### 1. コンテキストマネージャ {#1-context-managers}

Guidance では、チャット形式のやり取りを Python のコンテキストマネージャで書きます。

```python
from guidance import system, user, assistant, gen

lm = models.Transformers("microsoft/Phi-4-mini-instruct")

# System message
with system():
    lm += "You are a JSON generation expert."

# User message
with user():
    lm += "Generate a person object with name and age."

# Assistant response
with assistant():
    lm += gen("response", max_tokens=100)

print(lm["response"])
```

**よいところ:**
- 会話の流れがそのまま書ける
- 役割の区切りがはっきりする
- 読みやすく、直しやすい

### 2. 制約付きの生成 {#2-constrained-generation}

Guidance は、正規表現や文法を使って、出力が指定した形に必ず合うようにします。

#### 正規表現による制約 {#regex-constraints}

次のコードは、メールアドレス・日付・電話番号をそれぞれの形式に必ず合う形で生成します。

```python
from guidance import models, gen

lm = models.Transformers("microsoft/Phi-4-mini-instruct")

# Constrain to valid email format
lm += "Email: " + gen("email", regex=r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")

# Constrain to date format (YYYY-MM-DD)
lm += "Date: " + gen("date", regex=r"\d{4}-\d{2}-\d{2}")

# Constrain to phone number
lm += "Phone: " + gen("phone", regex=r"\d{3}-\d{3}-\d{4}")

print(lm["email"])  # Guaranteed valid email
print(lm["date"])   # Guaranteed YYYY-MM-DD format
```

**仕組み:**
- 正規表現がトークン単位の文法に変換されます
- 生成中に、条件に合わないトークンが取り除かれます
- モデルは、条件に合う出力しか出せなくなります

#### 選択肢による制約 {#selection-constraints}

次のコードは、決まった選択肢の中からしか答えが出ないようにします。

```python
from guidance import models, gen, select

lm = models.Transformers("microsoft/Phi-4-mini-instruct")

# Constrain to specific choices
lm += "Sentiment: " + select(["positive", "negative", "neutral"], name="sentiment")

# Multiple-choice selection
lm += "Best answer: " + select(
    ["A) Paris", "B) London", "C) Berlin", "D) Madrid"],
    name="answer"
)

print(lm["sentiment"])  # One of: positive, negative, neutral
print(lm["answer"])     # One of: A, B, C, or D
```

### 3. トークンヒーリング {#3-token-healing}

Guidance は、プロンプトと生成のあいだにできるトークンの切れ目を自動で「治し」ます。

**困りごと:** トークン分割によって、不自然な切れ目ができてしまいます。

```python
# Without token healing
prompt = "The capital of France is "
# Last token: " is "
# First generated token might be " Par" (with leading space)
# Result: "The capital of France is  Paris" (double space!)
```

**解決策:** Guidance はトークンを 1 つ戻してから生成し直します。

```python
from guidance import models, gen

lm = models.Transformers("microsoft/Phi-4-mini-instruct")

# Token healing enabled by default
lm += "The capital of France is " + gen("capital", max_tokens=5)
# Result: "The capital of France is Paris" (correct spacing)
```

**よいところ:**
- 文の切れ目が自然になる
- 余計な空白が入らない
- モデルが自然なトークンの並びを見るので、性能も上がる

### 4. 文法にもとづく生成 {#4-grammar-based-generation}

込み入った構造は、文法を作る関数を組み合わせて定義します。テンプレート文字列を渡す `grammar=` の書き方は、いまの guidance にはありません。組み合わせ可能な関数から文法を作るか、JSON なら `guidance.json()` を使ってください。

次のコードは、Pydantic のスキーマから文法を作って JSON を生成し、あわせて関数を組み合わせる書き方も示します。

```python
from guidance import models, gen
from guidance import json as gen_json
from pydantic import BaseModel, Field

lm = models.Transformers("microsoft/Phi-4-mini-instruct")

# JSON via a Pydantic schema (guidance.json compiles the schema to a grammar)
class Person(BaseModel):
    name: str = Field(pattern=r"[A-Za-z ]+")
    age: int
    email: str = Field(pattern=r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")

lm += gen_json(name="person", schema=Person)

print(lm["person"])  # Guaranteed valid JSON matching the schema

# Or compose grammar functions directly:
grammar = "name=" + gen("name", regex=r"[A-Za-z ]+") + " age=" + gen("age", regex=r"[0-9]+")
lm += grammar
```

**使いどころ:**
- 込み入った形の出力
- 入れ子になったデータ
- プログラミング言語の構文
- 特定分野向けの言語

### 5. Guidance の関数 {#5-guidance-functions}

`@guidance` デコレータを使うと、生成のパターンを何度も使い回せる形にまとめられます。

```python
from guidance import guidance, gen, models

@guidance
def generate_person(lm):
    """Generate a person with name and age."""
    lm += "Name: " + gen("name", max_tokens=20, stop="\n")
    lm += "\nAge: " + gen("age", regex=r"[0-9]+", max_tokens=3)
    return lm

# Use the function
lm = models.Transformers("microsoft/Phi-4-mini-instruct")
lm = generate_person(lm)

print(lm["name"])
print(lm["age"])
```

**状態を持つ関数:**

```python
@guidance(stateless=False)
def react_agent(lm, question, tools, max_rounds=5):
    """ReAct agent with tool use."""
    lm += f"Question: {question}\n\n"

    for i in range(max_rounds):
        # Thought
        lm += f"Thought {i+1}: " + gen("thought", stop="\n")

        # Action
        lm += "\nAction: " + select(list(tools.keys()), name="action")

        # Execute tool
        tool_result = tools[lm["action"]]()
        lm += f"\nObservation: {tool_result}\n\n"

        # Check if done
        lm += "Done? " + select(["Yes", "No"], name="done")
        if lm["done"] == "Yes":
            break

    # Final answer
    lm += "\nFinal Answer: " + gen("answer", max_tokens=100)
    return lm
```

## バックエンドの設定 {#backend-configuration}

### OpenAI（リモート。制約なしのみ） {#openai-remote-unconstrained-only}

> リモートの API バックエンドは制約付きの生成（正規表現・select・文法）ができません。ふつうのチャットや `gen()` にだけ使ってください。制約をかけたいときは、手元で動くバックエンドを使います。

```python
from guidance import models

lm = models.OpenAI(
    model="gpt-4o-mini",
    api_key="your-api-key"  # Or set OPENAI_API_KEY env var
)
```

### 手元のモデル（Transformers） {#local-models-transformers}

```python
from guidance.models import Transformers

lm = Transformers(
    "microsoft/Phi-4-mini-instruct",
    device="cuda"  # Or "cpu"
)
```

### 手元のモデル（llama.cpp） {#local-models-llamacpp}

```python
from guidance.models import LlamaCpp

lm = LlamaCpp(
    model_path="/path/to/model.gguf",
    n_ctx=4096,
    n_gpu_layers=35
)
```

## よく使う型 {#common-patterns}

### 型 1: JSON の生成 {#pattern-1-json-generation}

次のコードは、各項目に正規表現をかけながら、妥当な JSON を組み立てます。

```python
from guidance import models, gen, system, user, assistant

lm = models.Transformers("microsoft/Phi-4-mini-instruct")

with system():
    lm += "You generate valid JSON."

with user():
    lm += "Generate a user profile with name, age, and email."

with assistant():
    lm += """{
    "name": """ + gen("name", regex=r'"[A-Za-z ]+"', max_tokens=30) + """,
    "age": """ + gen("age", regex=r"[0-9]+", max_tokens=3) + """,
    "email": """ + gen("email", regex=r'"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"', max_tokens=50) + """
}"""

print(lm)  # Valid JSON guaranteed
```

### 型 2: 分類 {#pattern-2-classification}

次のコードは、文章の感情を 3 つの選択肢から選ばせ、あわせて確信度を数字で出させます。

```python
from guidance import models, gen, select

lm = models.Transformers("microsoft/Phi-4-mini-instruct")

text = "This product is amazing! I love it."

lm += f"Text: {text}\n"
lm += "Sentiment: " + select(["positive", "negative", "neutral"], name="sentiment")
lm += "\nConfidence: " + gen("confidence", regex=r"[0-9]+", max_tokens=3) + "%"

print(f"Sentiment: {lm['sentiment']}")
print(f"Confidence: {lm['confidence']}%")
```

### 型 3: 複数手順の推論 {#pattern-3-multi-step-reasoning}

次のコードは、答えを出すまでの考える手順を 3 段階に分けて生成させます。

```python
from guidance import models, gen, guidance

@guidance
def chain_of_thought(lm, question):
    """Generate answer with step-by-step reasoning."""
    lm += f"Question: {question}\n\n"

    # Generate multiple reasoning steps
    for i in range(3):
        lm += f"Step {i+1}: " + gen(f"step_{i+1}", stop="\n", max_tokens=100) + "\n"

    # Final answer
    lm += "\nTherefore, the answer is: " + gen("answer", max_tokens=50)

    return lm

lm = models.Transformers("microsoft/Phi-4-mini-instruct")
lm = chain_of_thought(lm, "What is 15% of 200?")

print(lm["answer"])
```

### 型 4: ReAct エージェント {#pattern-4-react-agent}

次のコードは、思考 → 道具の選択 → 実行 → 観察を繰り返すエージェントを組み立てます。

```python
from guidance import models, gen, select, guidance

@guidance(stateless=False)
def react_agent(lm, question):
    """ReAct agent with tool use."""
    tools = {
        "calculator": lambda expr: eval(expr),
        "search": lambda query: f"Search results for: {query}",
    }

    lm += f"Question: {question}\n\n"

    for round in range(5):
        # Thought
        lm += f"Thought: " + gen("thought", stop="\n") + "\n"

        # Action selection
        lm += "Action: " + select(["calculator", "search", "answer"], name="action")

        if lm["action"] == "answer":
            lm += "\nFinal Answer: " + gen("answer", max_tokens=100)
            break

        # Action input
        lm += "\nAction Input: " + gen("action_input", stop="\n") + "\n"

        # Execute tool
        if lm["action"] in tools:
            result = tools[lm["action"]](lm["action_input"])
            lm += f"Observation: {result}\n\n"

    return lm

lm = models.Transformers("microsoft/Phi-4-mini-instruct")
lm = react_agent(lm, "What is 25 * 4 + 10?")
print(lm["answer"])
```

### 型 5: データの抜き出し {#pattern-5-data-extraction}

次のコードは、文章から人名・組織名・日付・場所を順に抜き出します。

```python
from guidance import models, gen, guidance

@guidance
def extract_entities(lm, text):
    """Extract structured entities from text."""
    lm += f"Text: {text}\n\n"

    # Extract person
    lm += "Person: " + gen("person", stop="\n", max_tokens=30) + "\n"

    # Extract organization
    lm += "Organization: " + gen("organization", stop="\n", max_tokens=30) + "\n"

    # Extract date
    lm += "Date: " + gen("date", regex=r"\d{4}-\d{2}-\d{2}", max_tokens=10) + "\n"

    # Extract location
    lm += "Location: " + gen("location", stop="\n", max_tokens=30) + "\n"

    return lm

text = "Tim Cook announced at Apple Park on 2024-09-15 in Cupertino."

lm = models.Transformers("microsoft/Phi-4-mini-instruct")
lm = extract_entities(lm, text)

print(f"Person: {lm['person']}")
print(f"Organization: {lm['organization']}")
print(f"Date: {lm['date']}")
print(f"Location: {lm['location']}")
```

## うまく使うこつ {#best-practices}

### 1. 形式の確認には正規表現を使う {#1-use-regex-for-format-validation}

```python
# ✅ Good: Regex ensures valid format
lm += "Email: " + gen("email", regex=r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")

# ❌ Bad: Free generation may produce invalid emails
lm += "Email: " + gen("email", max_tokens=50)
```

### 2. 決まった分類には select() を使う {#2-use-select-for-fixed-categories}

```python
# ✅ Good: Guaranteed valid category
lm += "Status: " + select(["pending", "approved", "rejected"], name="status")

# ❌ Bad: May generate typos or invalid values
lm += "Status: " + gen("status", max_tokens=20)
```

### 3. トークンヒーリングを活かす {#3-leverage-token-healing}

```python
# Token healing is enabled by default
# No special action needed - just concatenate naturally
lm += "The capital is " + gen("capital")  # Automatic healing
```

### 4. stop を指定する {#4-use-stop-sequences}

```python
# ✅ Good: Stop at newline for single-line outputs
lm += "Name: " + gen("name", stop="\n")

# ❌ Bad: May generate multiple lines
lm += "Name: " + gen("name", max_tokens=50)
```

### 5. 使い回せる関数にする {#5-create-reusable-functions}

```python
# ✅ Good: Reusable pattern
@guidance
def generate_person(lm):
    lm += "Name: " + gen("name", stop="\n")
    lm += "\nAge: " + gen("age", regex=r"[0-9]+")
    return lm

# Use multiple times
lm = generate_person(lm)
lm += "\n\n"
lm = generate_person(lm)
```

### 6. 制約はほどほどに {#6-balance-constraints}

```python
# ✅ Good: Reasonable constraints
lm += gen("name", regex=r"[A-Za-z ]+", max_tokens=30)

# ❌ Too strict: May fail or be very slow
lm += gen("name", regex=r"^(John|Jane)$", max_tokens=10)
```

## ほかの手段との比較 {#comparison-to-alternatives}

| 項目 | Guidance | Instructor | Outlines | LMQL |
|---------|----------|------------|----------|------|
| 正規表現による制約 | ✅ あり | ❌ なし | ✅ あり | ✅ あり |
| 文法への対応 | ✅ CFG | ❌ なし | ✅ CFG | ✅ CFG |
| Pydantic での検証 | ❌ なし | ✅ あり | ✅ あり | ❌ なし |
| トークンヒーリング | ✅ あり | ❌ なし | ✅ あり | ❌ なし |
| 手元のモデル | ✅ 対応 | ⚠️ 一部のみ | ✅ 対応 | ✅ 対応 |
| API のモデル | ✅ 対応 | ✅ 対応 | ⚠️ 一部のみ | ✅ 対応 |
| Python らしい書き方 | ✅ そう | ✅ そう | ✅ そう | ❌ SQL 風 |
| 学習のしやすさ | 易しい | 易しい | ふつう | 難しい |

**Guidance を選ぶとよい場面:**
- 正規表現や文法による制約が要るとき
- トークンヒーリングを使いたいとき
- 制御構文を使った込み入った処理を組みたいとき
- 手元のモデル（Transformers、llama.cpp）を使うとき
- Python らしい書き方を好むとき

**ほかの手段を選ぶとよい場面:**
- Instructor: Pydantic での検証と自動の再試行が要るとき
- Outlines: JSON スキーマでの検証が要るとき
- LMQL: 宣言的なクエリの書き方を好むとき

## 性能の特徴 {#performance-characteristics}

**待ち時間の短縮:**
- 形の決まった出力なら、従来のプロンプトより 30〜50% 速くなります
- トークンヒーリングによって、無駄な再生成が減ります
- 文法による制約が、おかしなトークンの生成を防ぎます

**メモリの使用量:**
- 制約なしの生成と比べて、増える分はごくわずかです
- 文法の変換結果は、最初の一度だけで済むようキャッシュされます
- 推論時のトークンの絞り込みが効率よく行われます

**トークンの効率:**
- おかしな出力に費やすトークンがなくなります
- 再試行の繰り返しが要りません
- 妥当な出力までまっすぐ進みます

## 参考資料 {#resources}

- **ドキュメント**: https://guidance.readthedocs.io
- **GitHub**: https://github.com/guidance-ai/guidance（スター 18,000 以上）
- **ノートブック**: https://github.com/guidance-ai/guidance/tree/main/notebooks
- **Discord**: コミュニティのサポートがあります

## あわせて読む {#see-also}

- `references/constraints.md` - 正規表現と文法の書き方をひととおり
- `references/backends.md` - バックエンドごとの設定
- `references/examples.md` - 実運用で使える例
