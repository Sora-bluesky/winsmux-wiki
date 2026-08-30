---
title: "Dspy — DSPy: 宣言的に言語モデルのプログラムを書き、プロンプトを自動で最適化し、RAG を作る"
description: "DSPy: 宣言的に言語モデルのプログラムを書き、プロンプトを自動で最適化し、RAG を作る"
upstream_path: user-guide/skills/optional/mlops/mlops-research-dspy.md
upstream_blob: 07abb63dcd4681896c4f2e83c693093695b38f6e
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/mlops/mlops-research-dspy
---

# Dspy {#dspy}

DSPy: 宣言的に言語モデルのプログラムを書き、プロンプトを自動で最適化し、RAG を作ります。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/mlops/dspy` で導入します |
| パス | `optional-skills/mlops\research\dspy` |
| バージョン | `1.0.0` |
| 作者 | Orchestra Research |
| ライセンス | MIT |
| 依存関係 | `dspy`, `openai`, `anthropic` |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Prompt Engineering`, `DSPy`, `Declarative Programming`, `RAG`, `Agents`, `Prompt Optimization`, `LM Programming`, `Stanford NLP`, `Automatic Optimization`, `Modular AI` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# DSPy: Declarative Language Model Programming {#dspy-declarative-language-model-programming}

## この skill を使うとき {#when-to-use-this-skill}

DSPy は次のようなときに使います:
- **複雑な AI システムを作る**（部品や処理の流れが複数ある場合）
- **言語モデルを宣言的に書く**（プロンプトを手で書き分けるのをやめる）
- **プロンプトを自動で最適化する**（データにもとづく方法で）
- **AI の処理を部品として組み立てる**（手入れしやすく、持ち運びやすい形に）
- **出力を筋道立てて良くしていく**（オプティマイザを使う）
- **RAG（検索して補いながら文章を作る仕組み）やエージェント、分類器を、より安定した形で作る**

**GitHub のスター**: 22,000 以上 | **作った人たち**: Stanford NLP

## 導入 {#installation}

```bash
# Stable release
pip install dspy

# Latest development version
pip install git+https://github.com/stanfordnlp/dspy.git

# With specific LM providers
pip install dspy[openai]        # OpenAI
pip install dspy[anthropic]     # Anthropic Claude
pip install dspy[all]           # All providers
```

## すぐ試す {#quick-start}

### 基本の例: 質問に答える {#basic-example-question-answering}

```python

# Configure your language model
lm = dspy.Claude(model="claude-sonnet-4-5-20250929")
dspy.settings.configure(lm=lm)

# Define a signature (input → output)
class QA(dspy.Signature):
    """Answer questions with short factual answers."""
    question = dspy.InputField()
    answer = dspy.OutputField(desc="often between 1 and 5 words")

# Create a module
qa = dspy.Predict(QA)

# Use it
response = qa(question="What is the capital of France?")
print(response.answer)  # "Paris"
```

### 考える手順を書かせる {#chain-of-thought-reasoning}

```python

lm = dspy.Claude(model="claude-sonnet-4-5-20250929")
dspy.settings.configure(lm=lm)

# Use ChainOfThought for better reasoning
class MathProblem(dspy.Signature):
    """Solve math word problems."""
    problem = dspy.InputField()
    answer = dspy.OutputField(desc="numerical answer")

# ChainOfThought generates reasoning steps automatically
cot = dspy.ChainOfThought(MathProblem)

response = cot(problem="If John has 5 apples and gives 2 to Mary, how many does he have?")
print(response.rationale)  # Shows reasoning steps
print(response.answer)     # "3"
```

## 基本の考え方 {#core-concepts}

### 1. シグネチャ {#1-signatures}

シグネチャは、AI にやらせたいことの形（入力 → 出力）を決めるものです:

```python
# Inline signature (simple)
qa = dspy.Predict("question -> answer")

# Class signature (detailed)
class Summarize(dspy.Signature):
    """Summarize text into key points."""
    text = dspy.InputField()
    summary = dspy.OutputField(desc="bullet points, 3-5 items")

summarizer = dspy.ChainOfThought(Summarize)
```

**どちらを使うか:**
- **1 行で書く形**: さっと試したいとき、単純な処理
- **クラスで書く形**: 複雑な処理、型の情報を残したいとき、説明を書き添えたいとき

### 2. モジュール {#2-modules}

モジュールは、入力を出力に変える再利用可能な部品です:

#### dspy.Predict {#dspypredict}
いちばん基本の予測モジュールです:

```python
predictor = dspy.Predict("context, question -> answer")
result = predictor(context="Paris is the capital of France",
                   question="What is the capital?")
```

#### dspy.ChainOfThought {#dspychainofthought}
答える前に、考える手順を書き出させます:

```python
cot = dspy.ChainOfThought("question -> answer")
result = cot(question="Why is the sky blue?")
print(result.rationale)  # Reasoning steps
print(result.answer)     # Final answer
```

#### dspy.ReAct {#dspyreact}
道具を使いながら、エージェントのように考えます:

```python
from dspy.predict import ReAct

class SearchQA(dspy.Signature):
    """Answer questions using search."""
    question = dspy.InputField()
    answer = dspy.OutputField()

def search_tool(query: str) -> str:
    """Search Wikipedia."""
    # Your search implementation
    return results

react = ReAct(SearchQA, tools=[search_tool])
result = react(question="When was Python created?")
```

#### dspy.ProgramOfThought {#dspyprogramofthought}
考えるためのコードを書いて、その場で実行します:

```python
pot = dspy.ProgramOfThought("question -> answer")
result = pot(question="What is 15% of 240?")
# Generates: answer = 240 * 0.15
```

### 3. オプティマイザ {#3-optimizers}

オプティマイザは、学習用のデータを使ってモジュールを自動で良くしていきます:

#### BootstrapFewShot {#bootstrapfewshot}
例から学びます:

```python
from dspy.teleprompt import BootstrapFewShot

# Training data
trainset = [
    dspy.Example(question="What is 2+2?", answer="4").with_inputs("question"),
    dspy.Example(question="What is 3+5?", answer="8").with_inputs("question"),
]

# Define metric
def validate_answer(example, pred, trace=None):
    return example.answer == pred.answer

# Optimize
optimizer = BootstrapFewShot(metric=validate_answer, max_bootstrapped_demos=3)
optimized_qa = optimizer.compile(qa, trainset=trainset)

# Now optimized_qa performs better!
```

#### MIPRO（Most Important Prompt Optimization） {#mipro-most-important-prompt-optimization}
プロンプトを繰り返し改善します:

```python
from dspy.teleprompt import MIPRO

optimizer = MIPRO(
    metric=validate_answer,
    num_candidates=10,
    init_temperature=1.0
)

optimized_cot = optimizer.compile(
    cot,
    trainset=trainset,
    num_trials=100
)
```

#### BootstrapFinetune {#bootstrapfinetune}
モデルの追加学習に使うデータセットを作ります:

```python
from dspy.teleprompt import BootstrapFinetune

optimizer = BootstrapFinetune(metric=validate_answer)
optimized_module = optimizer.compile(qa, trainset=trainset)

# Exports training data for fine-tuning
```

### 4. 複雑なシステムを組み立てる {#4-building-complex-systems}

#### 複数段の処理 {#multi-stage-pipeline}

```python

class MultiHopQA(dspy.Module):
    def __init__(self):
        super().__init__()
        self.retrieve = dspy.Retrieve(k=3)
        self.generate_query = dspy.ChainOfThought("question -> search_query")
        self.generate_answer = dspy.ChainOfThought("context, question -> answer")

    def forward(self, question):
        # Stage 1: Generate search query
        search_query = self.generate_query(question=question).search_query

        # Stage 2: Retrieve context
        passages = self.retrieve(search_query).passages
        context = "\n".join(passages)

        # Stage 3: Generate answer
        answer = self.generate_answer(context=context, question=question).answer
        return dspy.Prediction(answer=answer, context=context)

# Use the pipeline
qa_system = MultiHopQA()
result = qa_system(question="Who wrote the book that inspired the movie Blade Runner?")
```

#### 最適化つきの RAG システム {#rag-system-with-optimization}

```python

from dspy.retrieve.chromadb_rm import ChromadbRM

# Configure retriever
retriever = ChromadbRM(
    collection_name="documents",
    persist_directory="./chroma_db"
)

class RAG(dspy.Module):
    def __init__(self, num_passages=3):
        super().__init__()
        self.retrieve = dspy.Retrieve(k=num_passages)
        self.generate = dspy.ChainOfThought("context, question -> answer")

    def forward(self, question):
        context = self.retrieve(question).passages
        return self.generate(context=context, question=question)

# Create and optimize
rag = RAG()

# Optimize with training data
from dspy.teleprompt import BootstrapFewShot

optimizer = BootstrapFewShot(metric=validate_answer)
optimized_rag = optimizer.compile(rag, trainset=trainset)
```

## 言語モデルの設定 {#lm-provider-configuration}

### Anthropic Claude {#anthropic-claude}

```python

lm = dspy.Claude(
    model="claude-sonnet-4-5-20250929",
    api_key="your-api-key",  # Or set ANTHROPIC_API_KEY env var
    max_tokens=1000,
    temperature=0.7
)
dspy.settings.configure(lm=lm)
```

### OpenAI {#openai}

```python
lm = dspy.OpenAI(
    model="gpt-4",
    api_key="your-api-key",
    max_tokens=1000
)
dspy.settings.configure(lm=lm)
```

### 手元で動かすモデル（Ollama） {#local-models-ollama}

```python
lm = dspy.OllamaLocal(
    model="llama3.1",
    base_url="http://localhost:11434"
)
dspy.settings.configure(lm=lm)
```

### 複数のモデルを使い分ける {#multiple-models}

```python
# Different models for different tasks
cheap_lm = dspy.OpenAI(model="gpt-3.5-turbo")
strong_lm = dspy.Claude(model="claude-sonnet-4-5-20250929")

# Use cheap model for retrieval, strong model for reasoning
with dspy.settings.context(lm=cheap_lm):
    context = retriever(question)

with dspy.settings.context(lm=strong_lm):
    answer = generator(context=context, question=question)
```

## よくある書き方 {#common-patterns}

### 書き方 1: 決まった形で出力させる {#pattern-1-structured-output}

```python
from pydantic import BaseModel, Field

class PersonInfo(BaseModel):
    name: str = Field(description="Full name")
    age: int = Field(description="Age in years")
    occupation: str = Field(description="Current job")

class ExtractPerson(dspy.Signature):
    """Extract person information from text."""
    text = dspy.InputField()
    person: PersonInfo = dspy.OutputField()

extractor = dspy.TypedPredictor(ExtractPerson)
result = extractor(text="John Doe is a 35-year-old software engineer.")
print(result.person.name)  # "John Doe"
print(result.person.age)   # 35
```

### 書き方 2: 条件を課しながら最適化する {#pattern-2-assertion-driven-optimization}

```python

from dspy.primitives.assertions import assert_transform_module, backtrack_handler

class MathQA(dspy.Module):
    def __init__(self):
        super().__init__()
        self.solve = dspy.ChainOfThought("problem -> solution: float")

    def forward(self, problem):
        solution = self.solve(problem=problem).solution

        # Assert solution is numeric
        dspy.Assert(
            isinstance(float(solution), float),
            "Solution must be a number",
            backtrack=backtrack_handler
        )

        return dspy.Prediction(solution=solution)
```

### 書き方 3: 答えをそろえる {#pattern-3-self-consistency}

```python

from collections import Counter

class ConsistentQA(dspy.Module):
    def __init__(self, num_samples=5):
        super().__init__()
        self.qa = dspy.ChainOfThought("question -> answer")
        self.num_samples = num_samples

    def forward(self, question):
        # Generate multiple answers
        answers = []
        for _ in range(self.num_samples):
            result = self.qa(question=question)
            answers.append(result.answer)

        # Return most common answer
        most_common = Counter(answers).most_common(1)[0][0]
        return dspy.Prediction(answer=most_common)
```

### 書き方 4: 取り出したものを並べ直す {#pattern-4-retrieval-with-reranking}

```python
class RerankedRAG(dspy.Module):
    def __init__(self):
        super().__init__()
        self.retrieve = dspy.Retrieve(k=10)
        self.rerank = dspy.Predict("question, passage -> relevance_score: float")
        self.answer = dspy.ChainOfThought("context, question -> answer")

    def forward(self, question):
        # Retrieve candidates
        passages = self.retrieve(question).passages

        # Rerank passages
        scored = []
        for passage in passages:
            score = float(self.rerank(question=question, passage=passage).relevance_score)
            scored.append((score, passage))

        # Take top 3
        top_passages = [p for _, p in sorted(scored, reverse=True)[:3]]
        context = "\n\n".join(top_passages)

        # Generate answer
        return self.answer(context=context, question=question)
```

## 評価と指標 {#evaluation-and-metrics}

### 自分で指標を決める {#custom-metrics}

```python
def exact_match(example, pred, trace=None):
    """Exact match metric."""
    return example.answer.lower() == pred.answer.lower()

def f1_score(example, pred, trace=None):
    """F1 score for text overlap."""
    pred_tokens = set(pred.answer.lower().split())
    gold_tokens = set(example.answer.lower().split())

    if not pred_tokens:
        return 0.0

    precision = len(pred_tokens & gold_tokens) / len(pred_tokens)
    recall = len(pred_tokens & gold_tokens) / len(gold_tokens)

    if precision + recall == 0:
        return 0.0

    return 2 * (precision * recall) / (precision + recall)
```

### 評価する {#evaluation}

```python
from dspy.evaluate import Evaluate

# Create evaluator
evaluator = Evaluate(
    devset=testset,
    metric=exact_match,
    num_threads=4,
    display_progress=True
)

# Evaluate model
score = evaluator(qa_system)
print(f"Accuracy: {score}")

# Compare optimized vs unoptimized
score_before = evaluator(qa)
score_after = evaluator(optimized_qa)
print(f"Improvement: {score_after - score_before:.2%}")
```

## うまく使うこつ {#best-practices}

### 1. 単純なところから始めて、少しずつ育てる {#1-start-simple-iterate}

```python
# Start with Predict
qa = dspy.Predict("question -> answer")

# Add reasoning if needed
qa = dspy.ChainOfThought("question -> answer")

# Add optimization when you have data
optimized_qa = optimizer.compile(qa, trainset=data)
```

### 2. シグネチャは具体的に書く {#2-use-descriptive-signatures}

```python
# ❌ Bad: Vague
class Task(dspy.Signature):
    input = dspy.InputField()
    output = dspy.OutputField()

# ✅ Good: Descriptive
class SummarizeArticle(dspy.Signature):
    """Summarize news articles into 3-5 key points."""
    article = dspy.InputField(desc="full article text")
    summary = dspy.OutputField(desc="bullet points, 3-5 items")
```

### 3. 実際の使われ方に近いデータで最適化する {#3-optimize-with-representative-data}

```python
# Create diverse training examples
trainset = [
    dspy.Example(question="factual", answer="...).with_inputs("question"),
    dspy.Example(question="reasoning", answer="...").with_inputs("question"),
    dspy.Example(question="calculation", answer="...").with_inputs("question"),
]

# Use validation set for metric
def metric(example, pred, trace=None):
    return example.answer in pred.answer
```

### 4. 最適化したモデルを保存して読み込む {#4-save-and-load-optimized-models}

```python
# Save
optimized_qa.save("models/qa_v1.json")

# Load
loaded_qa = dspy.ChainOfThought("question -> answer")
loaded_qa.load("models/qa_v1.json")
```

### 5. 動きを見て、原因を調べる {#5-monitor-and-debug}

```python
# Enable tracing
dspy.settings.configure(lm=lm, trace=[])

# Run prediction
result = qa(question="...")

# Inspect trace
for call in dspy.settings.trace:
    print(f"Prompt: {call['prompt']}")
    print(f"Response: {call['response']}")
```

## ほかのやり方との比較 {#comparison-to-other-approaches}

| 観点 | 手書きのプロンプト | LangChain | DSPy |
|---------|-----------------|-----------|------|
| プロンプトの調整 | 手作業 | 手作業 | 自動 |
| 最適化 | 試行錯誤 | なし | データにもとづく |
| 部品への分けやすさ | 低い | 中くらい | 高い |
| 型の安全性 | なし | 限定的 | あり（シグネチャ） |
| 持ち運びやすさ | 低い | 中くらい | 高い |
| 学ぶ大変さ | 小さい | 中くらい | 中〜大 |

**DSPy を選ぶとき:**
- 学習用のデータがある、または用意できる
- プロンプトを筋道立てて良くしていきたい
- 複数段の複雑なシステムを作っている
- いろいろな言語モデルにまたがって最適化したい

**ほかを選ぶとき:**
- さっと試すだけ（手書きのプロンプト）
- 既存の道具をつないだ単純な流れ（LangChain）
- 最適化のやり方を自分で書きたい

## 参考リンク {#resources}

- **ドキュメント**: https://dspy.ai
- **GitHub**: https://github.com/stanfordnlp/dspy （スター 22,000 以上）
- **Discord**: https://discord.gg/XCGy2WDCQB
- **Twitter**: @DSPyOSS
- **論文**: "DSPy: Compiling Declarative Language Model Calls into Self-Improving Pipelines"

## あわせて読む {#see-also}

- `references/modules.md` - モジュールの詳しい説明（Predict、ChainOfThought、ReAct、ProgramOfThought）
- `references/optimizers.md` - 最適化のアルゴリズム（BootstrapFewShot、MIPRO、BootstrapFinetune）
- `references/examples.md` - 実際の例（RAG、エージェント、分類器）
