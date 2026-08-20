---
title: "Outlines — Outlines: JSON・正規表現・Pydantic で形を決めた LLM の生成"
description: "Outlines: JSON・正規表現・Pydantic で形を決めた LLM の生成"
upstream_path: user-guide/skills/optional/mlops/mlops-inference-outlines.md
upstream_blob: 6e247586b9e242ef3d39826401fc99cc3d81bf46
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/mlops/mlops-inference-outlines
---

# Outlines {#outlines}

Outlines: JSON・正規表現・Pydantic で形を決めた LLM の生成を行います。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/mlops/outlines` で導入します |
| パス | `optional-skills/mlops/inference/outlines` |
| バージョン | `1.0.1` |
| 作者 | Orchestra Research |
| ライセンス | MIT |
| 依存関係 | `outlines`, `transformers`, `vllm`, `pydantic` |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Prompt Engineering`, `Outlines`, `Structured Generation`, `JSON Schema`, `Pydantic`, `Local Models`, `Grammar-Based Generation`, `vLLM`, `Transformers`, `Type Safety` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Outlines: 形を決めたテキストの生成 {#outlines-structured-text-generation}

## この skill を使う場面 {#when-to-use-this-skill}

Outlines は、次のようなことをしたいときに使います。
- 生成の途中から**妥当な JSON/XML/コードの形を守らせる**
- 型の安全な出力のために **Pydantic のモデルを使う**
- **手元のモデルに対応する**（Transformers、llama.cpp、vLLM）
- 形を決めた生成でも**推論の速さを落とさない**
- **JSON スキーマに沿って**自動で生成する
- 文法のレベルで**トークンの選ばれ方を制御する**

**GitHub のスター数**: 12,000 以上 | **提供**: dottxt.ai（旧 .txt）

> **API についての注意（Outlines 1.x）:** この skill は現行の v1 API を対象にしています。
> 1.0 より前の補助関数（`outlines.models.transformers(...)`、`outlines.generate.json/choice/regex/...`）は**なくなりました**。v1 では `outlines.from_transformers(...)`（あるいは `from_vllm`、`from_llamacpp`、`from_openai`）でモデルを作り、そのモデルを出力の型とともに**直接呼び出します**: `model(prompt, output_type)`。JSON や Pydantic の出力は **JSON の文字列**として返るので、`YourModel.model_validate_json(result)` で読み取ってください。

## 導入 {#installation}

次のコマンドで導入します。使うバックエンドに合わせて追加のものを入れてください。

```bash
# Base installation
pip install outlines

# With specific backends
pip install outlines transformers  # Hugging Face models
pip install outlines llama-cpp-python  # llama.cpp
pip install outlines vllm  # vLLM for high-throughput
```

## はじめの一歩 {#quick-start}

### 基本の例: 分類 {#basic-example-classification}

次のコードは、Transformers のモデルを包んで、答えが 3 つの選択肢のどれかに必ずなるようにします。

```python

from typing import Literal
from transformers import AutoModelForCausalLM, AutoTokenizer

MODEL_NAME = "microsoft/Phi-3-mini-4k-instruct"

# v1: wrap a Transformers model + tokenizer
model = outlines.from_transformers(
    AutoModelForCausalLM.from_pretrained(MODEL_NAME, device_map="auto"),
    AutoTokenizer.from_pretrained(MODEL_NAME),
)

# Call the model directly with an output type
prompt = "Sentiment of 'This product is amazing!': "
sentiment = model(prompt, Literal["positive", "negative", "neutral"])

print(sentiment)  # "positive" (guaranteed one of these)
```

### Pydantic のモデルを使う {#with-pydantic-models}

次のコードは、文章から利用者の情報を抜き出し、Pydantic のモデルとして受け取ります。

```python
from pydantic import BaseModel

from transformers import AutoModelForCausalLM, AutoTokenizer

class User(BaseModel):
    name: str
    age: int
    email: str

MODEL_NAME = "microsoft/Phi-3-mini-4k-instruct"
model = outlines.from_transformers(
    AutoModelForCausalLM.from_pretrained(MODEL_NAME, device_map="auto"),
    AutoTokenizer.from_pretrained(MODEL_NAME),
)

# Generate structured output (returns a JSON string)
prompt = "Extract user: John Doe, 30 years old, john@example.com"
result = model(prompt, User, max_new_tokens=200)

user = User.model_validate_json(result)  # parse into the Pydantic model
print(user.name)   # "John Doe"
print(user.age)    # 30
print(user.email)  # "john@example.com"
```

## 中心となる考え方 {#core-concepts}

### 1. 制約付きのトークン選択 {#1-constrained-token-sampling}

Outlines は、出力の型から組み立てたオートマトンを使って、logit のレベルでトークンの生成を縛ります。

**仕組み:**
1. 出力の型（JSON/Pydantic/正規表現/`Literal`）をスキーマや文法に変換します
2. その文法をトークン単位のオートマトンに変換します
3. 各ステップで、条件に合わないトークンを取り除きます
4. 選べるトークンが 1 つしかないときは、そのまま先へ進めます

**よいところ:**
- **余計な負荷がない**: 絞り込みがトークン単位で行われます
- **速くなる**: 決まりきった部分を飛ばして進めます
- **必ず妥当**: おかしな出力が出ることはありません

```python

from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoTokenizer

class Person(BaseModel):
    name: str
    age: int

model = outlines.from_transformers(
    AutoModelForCausalLM.from_pretrained("microsoft/Phi-3-mini-4k-instruct", device_map="auto"),
    AutoTokenizer.from_pretrained("microsoft/Phi-3-mini-4k-instruct"),
)

result = model("Generate person: Alice, 25", Person)
person = Person.model_validate_json(result)
```

### 2. 出力の型 {#2-output-types}

v1 では、欲しい**出力の型**を 2 番目の引数に直接渡します。

#### 選択肢から選ぶ（`Literal`） {#multiple-choice-literal}

```python
from typing import Literal

sentiment = model("Review: This is great!", Literal["positive", "negative", "neutral"])
# Result: one of the three choices
```

#### Pydantic による JSON {#json-via-pydantic}

```python
from pydantic import BaseModel

class Product(BaseModel):
    name: str
    price: float
    in_stock: bool

result = model("Extract: iPhone 15, $999, available", Product)
product = Product.model_validate_json(result)  # valid Product instance
```

#### 正規表現（文字列で渡す） {#regex-pass-a-regex-string}

```python
# Generate text matching a regex pattern
phone = model("Generate phone number:", r"[0-9]{3}-[0-9]{3}-[0-9]{4}")
# Result: "555-123-4567" (guaranteed to match the pattern)
```

#### 数値の型 {#numeric-types}

```python
# Pass the Python type directly
age = model("Person's age:", int)      # guaranteed integer
price = model("Product price:", float)  # guaranteed float
```

### 3. モデルのバックエンド {#3-model-backends}

Outlines は、`from_*` の関数を通じて、手元と API の両方のバックエンドに対応しています。

#### Transformers（Hugging Face） {#transformers-hugging-face}

```python

from transformers import AutoModelForCausalLM, AutoTokenizer

model = outlines.from_transformers(
    AutoModelForCausalLM.from_pretrained("microsoft/Phi-3-mini-4k-instruct", device_map="auto"),
    AutoTokenizer.from_pretrained("microsoft/Phi-3-mini-4k-instruct"),
)

result = model(prompt, YourModel)
```

#### llama.cpp {#llamacpp}

```python

from llama_cpp import Llama

llm = Llama("./models/llama-3.1-8b-instruct.Q4_K_M.gguf", n_gpu_layers=35, n_ctx=4096)
model = outlines.from_llamacpp(llm)

result = model(prompt, YourModel)
```

#### vLLM（たくさんさばきたいとき） {#vllm-high-throughput}

```python

from vllm import LLM

llm = LLM("meta-llama/Llama-3.1-8B-Instruct", tensor_parallel_size=2)
model = outlines.from_vllm(llm)

result = model(prompt, YourModel)
```

#### OpenAI（サーバー側で JSON の形を守らせる） {#openai-server-side-constrained-json}

```python

from openai import OpenAI

client = OpenAI()
model = outlines.from_openai(client, "gpt-4o-mini")

# API backends support JSON-schema style structured output
result = model(prompt, YourModel)
```

### 4. Pydantic との組み合わせ {#4-pydantic-integration}

Outlines は Pydantic に最初から対応していて、スキーマへの変換を自動で行います。生成の結果は JSON の文字列なので、`model_validate_json` を呼んでモデルにします。

#### 基本のモデル {#basic-models}

```python
from pydantic import BaseModel, Field

class Article(BaseModel):
    title: str = Field(description="Article title")
    author: str = Field(description="Author name")
    word_count: int = Field(description="Number of words", gt=0)
    tags: list[str] = Field(description="List of tags")

result = model("Generate article about AI", Article, max_new_tokens=300)
article = Article.model_validate_json(result)
print(article.title)
print(article.word_count)  # Guaranteed > 0
```

#### 入れ子のモデル {#nested-models}

```python
class Address(BaseModel):
    street: str
    city: str
    country: str

class Person(BaseModel):
    name: str
    age: int
    address: Address  # Nested model

result = model("Generate person in New York", Person)
person = Person.model_validate_json(result)
print(person.address.city)  # "New York"
```

#### 列挙型と Literal {#enums-and-literals}

```python
from enum import Enum
from typing import Literal

class Status(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class Application(BaseModel):
    applicant: str
    status: Status  # Must be one of enum values
    priority: Literal["low", "medium", "high"]  # Must be one of literals

result = model("Generate application", Application)
app = Application.model_validate_json(result)
print(app.status)  # Status.PENDING (or APPROVED/REJECTED)
```

## よく使う型 {#common-patterns}

### 型 1: データの抜き出し {#pattern-1-data-extraction}

次のコードは、文章から会社の情報を抜き出して、項目ごとに表示します。

```python
from pydantic import BaseModel

from transformers import AutoModelForCausalLM, AutoTokenizer

class CompanyInfo(BaseModel):
    name: str
    founded_year: int
    industry: str
    employees: int

model = outlines.from_transformers(
    AutoModelForCausalLM.from_pretrained("microsoft/Phi-3-mini-4k-instruct", device_map="auto"),
    AutoTokenizer.from_pretrained("microsoft/Phi-3-mini-4k-instruct"),
)

text = """
Apple Inc. was founded in 1976 in the technology industry.
The company employs approximately 164,000 people worldwide.
"""

prompt = f"Extract company information:\n{text}\n\nCompany:"
company = CompanyInfo.model_validate_json(model(prompt, CompanyInfo, max_new_tokens=200))

print(f"Name: {company.name}")
print(f"Founded: {company.founded_year}")
print(f"Industry: {company.industry}")
print(f"Employees: {company.employees}")
```

### 型 2: 分類 {#pattern-2-classification}

次のコードは、2 択の分類、多クラスの分類、確信度つきの分類をそれぞれ行います。

```python
from typing import Literal
from pydantic import BaseModel

# Binary classification
result = model("Email: Buy now! 50% off!", Literal["spam", "not_spam"])

# Multi-class classification
category = model(
    "Article: Apple announces new iPhone...",
    Literal["technology", "business", "sports", "entertainment"],
)

# With confidence
class Classification(BaseModel):
    label: Literal["positive", "negative", "neutral"]
    confidence: float

out = model("Review: This product is okay, nothing special", Classification)
result = Classification.model_validate_json(out)
```

### 型 3: 決まった項目の入力 {#pattern-3-structured-forms}

次のコードは、書かれた内容を利用者の情報として項目ごとに読み取ります。

```python
class UserProfile(BaseModel):
    full_name: str
    age: int
    email: str
    phone: str
    country: str
    interests: list[str]

prompt = """
Extract user profile from:
Name: Alice Johnson
Age: 28
Email: alice@example.com
Phone: 555-0123
Country: USA
Interests: hiking, photography, cooking
"""

profile = UserProfile.model_validate_json(model(prompt, UserProfile, max_new_tokens=250))
print(profile.full_name)
print(profile.interests)  # ["hiking", "photography", "cooking"]
```

### 型 4: 複数の対象を抜き出す {#pattern-4-multi-entity-extraction}

次のコードは、文章に出てくる人・組織・場所をまとめて取り出します。

```python
from typing import Literal

class Entity(BaseModel):
    name: str
    type: Literal["PERSON", "ORGANIZATION", "LOCATION"]

class DocumentEntities(BaseModel):
    entities: list[Entity]

text = "Tim Cook met with Satya Nadella at Microsoft headquarters in Redmond."
prompt = f"Extract entities from: {text}"

result = DocumentEntities.model_validate_json(model(prompt, DocumentEntities, max_new_tokens=300))
for entity in result.entities:
    print(f"{entity.name} ({entity.type})")
```

### 型 5: コードの生成 {#pattern-5-code-generation}

次のコードは、関数名・引数・説明・本体に分けて Python の関数を生成し、組み立てて表示します。

```python
class PythonFunction(BaseModel):
    function_name: str
    parameters: list[str]
    docstring: str
    body: str

prompt = "Generate a Python function to calculate factorial"
func = PythonFunction.model_validate_json(model(prompt, PythonFunction, max_new_tokens=300))

print(f"def {func.function_name}({', '.join(func.parameters)}):")
print(f'    """{func.docstring}"""')
print(f"    {func.body}")
```

### 型 6: まとめて処理する {#pattern-6-batch-processing}

次のコードは、複数の文をひとまとめに渡して、それぞれから人の情報を取り出します。

```python

from transformers import AutoModelForCausalLM, AutoTokenizer
from pydantic import BaseModel

class Person(BaseModel):
    name: str
    age: int

model = outlines.from_transformers(
    AutoModelForCausalLM.from_pretrained("microsoft/Phi-3-mini-4k-instruct", device_map="auto"),
    AutoTokenizer.from_pretrained("microsoft/Phi-3-mini-4k-instruct"),
)

texts = [
    "John is 30 years old",
    "Alice is 25 years old",
    "Bob is 40 years old",
]

# v1 accepts a list of prompts for batched generation
prompts = [f"Extract from: {t}" for t in texts]
outputs = model(prompts, Person, max_new_tokens=100)
people = [Person.model_validate_json(o) for o in outputs]
for person in people:
    print(f"{person.name}: {person.age}")
```

## バックエンドの設定 {#backend-configuration}

### Transformers {#transformers}

次のコードは、基本の使い方、GPU と dtype の指定、よく使われるモデルの読み込みを順に示します。

```python

from transformers import AutoModelForCausalLM, AutoTokenizer

MODEL_NAME = "microsoft/Phi-3-mini-4k-instruct"

# Basic usage
model = outlines.from_transformers(
    AutoModelForCausalLM.from_pretrained(MODEL_NAME, device_map="auto"),
    AutoTokenizer.from_pretrained(MODEL_NAME),
)

# GPU + dtype configuration is set on the HF model itself

model = outlines.from_transformers(
    AutoModelForCausalLM.from_pretrained(MODEL_NAME, device_map="cuda", torch_dtype=torch.float16),
    AutoTokenizer.from_pretrained(MODEL_NAME),
)

# Popular models
for name in [
    "meta-llama/Llama-3.1-8B-Instruct",
    "mistralai/Mistral-7B-Instruct-v0.3",
    "Qwen/Qwen2.5-7B-Instruct",
]:
    model = outlines.from_transformers(
        AutoModelForCausalLM.from_pretrained(name, device_map="auto"),
        AutoTokenizer.from_pretrained(name),
    )
```

### llama.cpp {#llamacpp}

次のコードは、GGUF のモデルを読み込み、文脈の長さや GPU に載せる層の数を指定します。

```python

from llama_cpp import Llama

# Load GGUF model
llm = Llama(
    "./models/llama-3.1-8b.Q4_K_M.gguf",
    n_ctx=4096,       # Context window
    n_gpu_layers=35,  # GPU layers
    n_threads=8,      # CPU threads
)
model = outlines.from_llamacpp(llm)

# Full GPU offload: set n_gpu_layers=-1 on the Llama object
```

### vLLM（実運用向け） {#vllm-production}

次のコードは、GPU 1 枚、複数枚、量子化ありのそれぞれの読み込み方を示します。

```python

from vllm import LLM

# Single GPU
model = outlines.from_vllm(LLM("meta-llama/Llama-3.1-8B-Instruct"))

# Multi-GPU
model = outlines.from_vllm(LLM("meta-llama/Llama-3.1-70B-Instruct", tensor_parallel_size=4))

# With quantization
model = outlines.from_vllm(LLM("meta-llama/Llama-3.1-8B-Instruct", quantization="awq"))
```

## うまく使うこつ {#best-practices}

### 1. 型はきちんと指定する {#1-use-specific-types}

```python
# ✅ Good: Specific types
class Product(BaseModel):
    name: str
    price: float  # Not str
    quantity: int  # Not str
    in_stock: bool  # Not str

# ❌ Bad: Everything as string
class Product(BaseModel):
    name: str
    price: str  # Should be float
    quantity: str  # Should be int
```

### 2. 制約を足す {#2-add-constraints}

```python
from pydantic import Field

# ✅ Good: With constraints
class User(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    age: int = Field(ge=0, le=120)
    email: str = Field(pattern=r"^[\w\.-]+@[\w\.-]+\.\w+$")

# ❌ Bad: No constraints
class User(BaseModel):
    name: str
    age: int
    email: str
```

### 3. 決まった分類には列挙型を使う {#3-use-enums-for-categories}

```python
# ✅ Good: Enum for fixed set
class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class Task(BaseModel):
    title: str
    priority: Priority

# ❌ Bad: Free-form string
class Task(BaseModel):
    title: str
    priority: str  # Can be anything
```

### 4. プロンプトに前提を書く {#4-provide-context-in-prompts}

```python
# ✅ Good: Clear context
prompt = """
Extract product information from the following text.
Text: iPhone 15 Pro costs $999 and is currently in stock.
Product:
"""

# ❌ Bad: Minimal context
prompt = "iPhone 15 Pro costs $999 and is currently in stock."
```

### 5. 欠けるかもしれない項目を扱う {#5-handle-optional-fields}

```python
from typing import Optional

# ✅ Good: Optional fields for incomplete data
class Article(BaseModel):
    title: str  # Required
    author: Optional[str] = None  # Optional
    date: Optional[str] = None  # Optional
    tags: list[str] = []  # Default empty list

# Can succeed even if author/date missing
```

### 6. JSON の出力は必ず読み取って確かめる {#6-always-validate-json-output}

```python
# v1 returns a JSON string for Pydantic/JSON output types.
result = model(prompt, Article)          # str
article = Article.model_validate_json(result)  # Article instance
```

## ほかの手段との比較 {#comparison-to-alternatives}

| 項目 | Outlines | Instructor | Guidance | LMQL |
|---------|----------|------------|----------|------|
| Pydantic への対応 | ✅ 標準 | ✅ 標準 | ✅ あり | ❌ なし |
| JSON スキーマ | ✅ あり | ✅ あり | ✅ あり | ✅ あり |
| 正規表現による制約 | ✅ あり | ❌ なし | ✅ あり | ✅ あり |
| 手元のモデル | ✅ 全面的 | ⚠️ 一部のみ | ✅ 全面的 | ✅ 全面的 |
| API のモデル | ✅ あり | ✅ 全面的 | ✅ あり | ✅ 全面的 |
| 余計な負荷がない | ✅ そう | ❌ ちがう | ⚠️ 一部 | ✅ そう |
| 自動の再試行 | ❌ なし | ✅ あり | ❌ なし | ❌ なし |
| 学習のしやすさ | 易しい | 易しい | 易しい | 難しい |

**Outlines を選ぶとよい場面:**
- 手元のモデル（Transformers、llama.cpp、vLLM）を使うとき
- 推論の速さを最大限に出したいとき
- Pydantic のモデルを使いたいとき
- 形を決めた生成で余計な負荷をかけたくないとき
- トークンの選ばれ方を制御したいとき

**ほかの手段を選ぶとよい場面:**
- Instructor: API のモデルで自動の再試行が要るとき
- Guidance: トークンヒーリングと込み入った処理が要るとき
- LMQL: 宣言的なクエリの書き方を好むとき

## 性能の特徴 {#performance-characteristics}

**速さ:**
- **余計な負荷がない**: 形を決めた生成でも、制約なしと同じ速さです
- **決まりきった部分を飛ばす**: 選択の余地がないトークンは読み飛ばします
- 生成後に検証するやり方より **1.2〜2 倍速い**

**メモリ:**
- オートマトンは出力の型ごとに一度だけ組み立てられ、キャッシュされます
- 実行中に増える分はごくわずかです
- vLLM と組み合わせると、たくさんさばくときも効率よく動きます

**正確さ:**
- **出力は 100% 妥当**（制約付きのオートマトンが保証します）
- 再試行の繰り返しが要りません
- トークンの絞り込みが決まった手順で行われます

## 参考資料 {#resources}

- **ドキュメント**: https://dottxt-ai.github.io/outlines/
- **GitHub**: https://github.com/dottxt-ai/outlines（スター 12,000 以上）
- **Discord**: https://discord.gg/R9DSu34mGd
- **ブログ**: https://blog.dottxt.co

## あわせて読む {#see-also}

- `references/json_generation.md` - JSON と Pydantic の書き方をひととおり
- `references/backends.md` - バックエンドごとの設定
- `references/examples.md` - 実運用で使える例
