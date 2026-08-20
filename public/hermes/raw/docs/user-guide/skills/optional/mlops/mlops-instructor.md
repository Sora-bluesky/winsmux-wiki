---
title: "Instructor — LLM の出力を Pydantic で検証しながら決まった形で受け取る"
description: "LLM の出力を Pydantic で検証しながら決まった形で受け取る"
upstream_path: user-guide/skills/optional/mlops/mlops-instructor.md
upstream_blob: 323b03847d9124ef34ba84d23654738cb3cea38b
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/mlops/mlops-instructor
---

# Instructor {#instructor}

LLM の出力を Pydantic で検証しながら、決まった形で受け取ります。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/mlops/instructor` で導入します |
| パス | `optional-skills/mlops/instructor` |
| バージョン | `1.0.0` |
| 作者 | Orchestra Research |
| ライセンス | MIT |
| 依存関係 | `instructor`, `pydantic`, `openai`, `anthropic` |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Prompt Engineering`, `Instructor`, `Structured Output`, `Pydantic`, `Data Extraction`, `JSON Parsing`, `Type Safety`, `Validation`, `Streaming`, `OpenAI`, `Anthropic` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Instructor: 決まった形の LLM 出力 {#instructor-structured-llm-outputs}

## この skill を使う場面 {#when-to-use-this-skill}

次のようなことをしたいときに Instructor を使います。

- LLM の返答から**決まった形のデータを取り出す**（しかも確実に）
- Pydantic のスキーマに沿って**出力を自動で検証する**
- 取り出しに失敗したときに、エラー処理込みで**やり直させる**
- 型の安全性と検証つきで**複雑な JSON を解釈する**
- リアルタイム処理のために**途中経過を少しずつ受け取る**
- 同じ書き方のまま**複数の LLM 提供元に対応する**

**GitHub のスター**: 15,000 以上 | **実績**: 10 万人を超える開発者が使用

## 導入 {#installation}

```bash
# Base installation
pip install instructor

# With specific providers
pip install "instructor[anthropic]"  # Anthropic Claude
pip install "instructor[openai]"     # OpenAI
pip install "instructor[all]"        # All providers
```

## すぐ試す {#quick-start}

### 基本の例: ユーザー情報を取り出す {#basic-example-extract-user-data}

```python

from pydantic import BaseModel
from anthropic import Anthropic

# Define output structure
class User(BaseModel):
    name: str
    age: int
    email: str

# Create instructor client
client = instructor.from_anthropic(Anthropic())

# Extract structured data
user = client.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=1024,
    messages=[{
        "role": "user",
        "content": "John Doe is 30 years old. His email is john@example.com"
    }],
    response_model=User
)

print(user.name)   # "John Doe"
print(user.age)    # 30
print(user.email)  # "john@example.com"
```

### OpenAI で使う場合 {#with-openai}

```python
from openai import OpenAI

client = instructor.from_openai(OpenAI())

user = client.chat.completions.create(
    model="gpt-4o-mini",
    response_model=User,
    messages=[{"role": "user", "content": "Extract: Alice, 25, alice@email.com"}]
)
```

## 中心となる考え方 {#core-concepts}

### 1. 応答モデル（Pydantic） {#1-response-models-pydantic}

応答モデルは、LLM の出力がどんな形であるべきか、どう検証するかを決めるものです。

#### 基本のモデル {#basic-model}

```python
from pydantic import BaseModel, Field

class Article(BaseModel):
    title: str = Field(description="Article title")
    author: str = Field(description="Author name")
    word_count: int = Field(description="Number of words", gt=0)
    tags: list[str] = Field(description="List of relevant tags")

article = client.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=1024,
    messages=[{
        "role": "user",
        "content": "Analyze this article: [article text]"
    }],
    response_model=Article
)
```

**うれしいところ:**
- Python の型ヒントによる型の安全性
- 自動での検証（word_count > 0 など）
- Field の説明がそのまま仕様書になる
- エディタの入力補完が効く

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

person = client.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=1024,
    messages=[{
        "role": "user",
        "content": "John lives at 123 Main St, Boston, USA"
    }],
    response_model=Person
)

print(person.address.city)  # "Boston"
```

#### 任意の項目 {#optional-fields}

```python
from typing import Optional

class Product(BaseModel):
    name: str
    price: float
    discount: Optional[float] = None  # Optional
    description: str = Field(default="No description")  # Default value

# LLM doesn't need to provide discount or description
```

#### 選択肢を絞る Enum {#enums-for-constraints}

```python
from enum import Enum

class Sentiment(str, Enum):
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"

class Review(BaseModel):
    text: str
    sentiment: Sentiment  # Only these 3 values allowed

review = client.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=1024,
    messages=[{
        "role": "user",
        "content": "This product is amazing!"
    }],
    response_model=Review
)

print(review.sentiment)  # Sentiment.POSITIVE
```

### 2. 検証 {#2-validation}

Pydantic が LLM の出力を自動で検証します。検証に通らなかったときは、Instructor がやり直させます。

#### 最初から用意されている検証 {#built-in-validators}

```python
from pydantic import Field, EmailStr, HttpUrl

class Contact(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    age: int = Field(ge=0, le=120)  # 0 <= age <= 120
    email: EmailStr  # Validates email format
    website: HttpUrl  # Validates URL format

# If LLM provides invalid data, Instructor retries automatically
```

#### 自分で書く検証 {#custom-validators}

```python
from pydantic import field_validator

class Event(BaseModel):
    name: str
    date: str
    attendees: int

    @field_validator('date')
    def validate_date(cls, v):
        """Ensure date is in YYYY-MM-DD format."""
        import re
        if not re.match(r'\d{4}-\d{2}-\d{2}', v):
            raise ValueError('Date must be YYYY-MM-DD format')
        return v

    @field_validator('attendees')
    def validate_attendees(cls, v):
        """Ensure positive attendees."""
        if v < 1:
            raise ValueError('Must have at least 1 attendee')
        return v
```

#### モデル全体での検証 {#model-level-validation}

```python
from pydantic import model_validator

class DateRange(BaseModel):
    start_date: str
    end_date: str

    @model_validator(mode='after')
    def check_dates(self):
        """Ensure end_date is after start_date."""
        from datetime import datetime
        start = datetime.strptime(self.start_date, '%Y-%m-%d')
        end = datetime.strptime(self.end_date, '%Y-%m-%d')

        if end < start:
            raise ValueError('end_date must be after start_date')
        return self
```

### 3. 自動でのやり直し {#3-automatic-retrying}

検証に通らなかったとき、Instructor は何が悪かったかを LLM に伝えたうえで自動的にやり直させます。

```python
# Retries up to 3 times if validation fails
user = client.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=1024,
    messages=[{
        "role": "user",
        "content": "Extract user from: John, age unknown"
    }],
    response_model=User,
    max_retries=3  # Default is 3
)

# If age can't be extracted, Instructor tells the LLM:
# "Validation error: age - field required"
# LLM tries again with better extraction
```

**動きの流れ:**
1. LLM が出力を作る
2. Pydantic が検証する
3. 通らなければ、エラーの内容が LLM に送り返される
4. LLM がそのエラーを踏まえてもう一度やってみる
5. max_retries の回数まで繰り返す

### 4. 少しずつ受け取る {#4-streaming}

途中結果を受け取りながら、その場で処理を進められます。

#### 途中経過のオブジェクトを受け取る {#streaming-partial-objects}

```python
from instructor import Partial

class Story(BaseModel):
    title: str
    content: str
    tags: list[str]

# Stream partial updates as LLM generates
for partial_story in client.messages.create_partial(
    model="claude-sonnet-4-5-20250929",
    max_tokens=1024,
    messages=[{
        "role": "user",
        "content": "Write a short sci-fi story"
    }],
    response_model=Story
):
    print(f"Title: {partial_story.title}")
    print(f"Content so far: {partial_story.content[:100]}...")
    # Update UI in real-time
```

#### 一覧を順に受け取る {#streaming-iterables}

```python
class Task(BaseModel):
    title: str
    priority: str

# Stream list items as they're generated
tasks = client.messages.create_iterable(
    model="claude-sonnet-4-5-20250929",
    max_tokens=1024,
    messages=[{
        "role": "user",
        "content": "Generate 10 project tasks"
    }],
    response_model=Task
)

for task in tasks:
    print(f"- {task.title} ({task.priority})")
    # Process each task as it arrives
```

## 提供元ごとの設定 {#provider-configuration}

### Anthropic Claude {#anthropic-claude}

```python

from anthropic import Anthropic

client = instructor.from_anthropic(
    Anthropic(api_key="your-api-key")
)

# Use with Claude models
response = client.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=1024,
    messages=[...],
    response_model=YourModel
)
```

### OpenAI {#openai}

```python
from openai import OpenAI

client = instructor.from_openai(
    OpenAI(api_key="your-api-key")
)

response = client.chat.completions.create(
    model="gpt-4o-mini",
    response_model=YourModel,
    messages=[...]
)
```

### 手元で動かすモデル（Ollama） {#local-models-ollama}

```python
from openai import OpenAI

# Point to local Ollama server
client = instructor.from_openai(
    OpenAI(
        base_url="http://localhost:11434/v1",
        api_key="ollama"  # Required but ignored
    ),
    mode=instructor.Mode.JSON
)

response = client.chat.completions.create(
    model="llama3.1",
    response_model=YourModel,
    messages=[...]
)
```

## よくある使い方 {#common-patterns}

### 使い方 1: 文章からデータを取り出す {#pattern-1-data-extraction-from-text}

```python
class CompanyInfo(BaseModel):
    name: str
    founded_year: int
    industry: str
    employees: int
    headquarters: str

text = """
Tesla, Inc. was founded in 2003. It operates in the automotive and energy
industry with approximately 140,000 employees. The company is headquartered
in Austin, Texas.
"""

company = client.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=1024,
    messages=[{
        "role": "user",
        "content": f"Extract company information from: {text}"
    }],
    response_model=CompanyInfo
)
```

### 使い方 2: 分類する {#pattern-2-classification}

```python
class Category(str, Enum):
    TECHNOLOGY = "technology"
    FINANCE = "finance"
    HEALTHCARE = "healthcare"
    EDUCATION = "education"
    OTHER = "other"

class ArticleClassification(BaseModel):
    category: Category
    confidence: float = Field(ge=0.0, le=1.0)
    keywords: list[str]

classification = client.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=1024,
    messages=[{
        "role": "user",
        "content": "Classify this article: [article text]"
    }],
    response_model=ArticleClassification
)
```

### 使い方 3: 複数の対象をまとめて取り出す {#pattern-3-multi-entity-extraction}

```python
class Person(BaseModel):
    name: str
    role: str

class Organization(BaseModel):
    name: str
    industry: str

class Entities(BaseModel):
    people: list[Person]
    organizations: list[Organization]
    locations: list[str]

text = "Tim Cook, CEO of Apple, announced at the event in Cupertino..."

entities = client.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=1024,
    messages=[{
        "role": "user",
        "content": f"Extract all entities from: {text}"
    }],
    response_model=Entities
)

for person in entities.people:
    print(f"{person.name} - {person.role}")
```

### 使い方 4: 決まった形で分析する {#pattern-4-structured-analysis}

```python
class SentimentAnalysis(BaseModel):
    overall_sentiment: Sentiment
    positive_aspects: list[str]
    negative_aspects: list[str]
    suggestions: list[str]
    score: float = Field(ge=-1.0, le=1.0)

review = "The product works well but setup was confusing..."

analysis = client.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=1024,
    messages=[{
        "role": "user",
        "content": f"Analyze this review: {review}"
    }],
    response_model=SentimentAnalysis
)
```

### 使い方 5: まとめて処理する {#pattern-5-batch-processing}

```python
def extract_person(text: str) -> Person:
    return client.messages.create(
        model="claude-sonnet-4-5-20250929",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": f"Extract person from: {text}"
        }],
        response_model=Person
    )

texts = [
    "John Doe is a 30-year-old engineer",
    "Jane Smith, 25, works in marketing",
    "Bob Johnson, age 40, software developer"
]

people = [extract_person(text) for text in texts]
```

## 進んだ機能 {#advanced-features}

### 複数の型のどれか（Union） {#union-types}

```python
from typing import Union

class TextContent(BaseModel):
    type: str = "text"
    content: str

class ImageContent(BaseModel):
    type: str = "image"
    url: HttpUrl
    caption: str

class Post(BaseModel):
    title: str
    content: Union[TextContent, ImageContent]  # Either type

# LLM chooses appropriate type based on content
```

### 実行時に組み立てるモデル {#dynamic-models}

```python
from pydantic import create_model

# Create model at runtime
DynamicUser = create_model(
    'User',
    name=(str, ...),
    age=(int, Field(ge=0)),
    email=(EmailStr, ...)
)

user = client.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=1024,
    messages=[...],
    response_model=DynamicUser
)
```

### モードを選ぶ {#custom-modes}

```python
# For providers without native structured outputs
client = instructor.from_anthropic(
    Anthropic(),
    mode=instructor.Mode.JSON  # JSON mode
)

# Available modes:
# - Mode.ANTHROPIC_TOOLS (recommended for Claude)
# - Mode.JSON (fallback)
# - Mode.TOOLS (OpenAI tools)
```

### 後始末をまかせる {#context-management}

```python
# Single-use client
with instructor.from_anthropic(Anthropic()) as client:
    result = client.messages.create(
        model="claude-sonnet-4-5-20250929",
        max_tokens=1024,
        messages=[...],
        response_model=YourModel
    )
    # Client closed automatically
```

## エラーへの対処 {#error-handling}

### 検証エラーを受け止める {#handling-validation-errors}

```python
from pydantic import ValidationError

try:
    user = client.messages.create(
        model="claude-sonnet-4-5-20250929",
        max_tokens=1024,
        messages=[...],
        response_model=User,
        max_retries=3
    )
except ValidationError as e:
    print(f"Failed after retries: {e}")
    # Handle gracefully

except Exception as e:
    print(f"API error: {e}")
```

### エラーメッセージを自分で決める {#custom-error-messages}

```python
class ValidatedUser(BaseModel):
    name: str = Field(description="Full name, 2-100 characters")
    age: int = Field(description="Age between 0 and 120", ge=0, le=120)
    email: EmailStr = Field(description="Valid email address")

    class Config:
        # Custom error messages
        json_schema_extra = {
            "examples": [
                {
                    "name": "John Doe",
                    "age": 30,
                    "email": "john@example.com"
                }
            ]
        }
```

## うまく使うコツ {#best-practices}

### 1. 項目の説明をはっきり書く {#1-clear-field-descriptions}

```python
# ❌ Bad: Vague
class Product(BaseModel):
    name: str
    price: float

# ✅ Good: Descriptive
class Product(BaseModel):
    name: str = Field(description="Product name from the text")
    price: float = Field(description="Price in USD, without currency symbol")
```

### 2. 場面に合った検証をかける {#2-use-appropriate-validation}

```python
# ✅ Good: Constrain values
class Rating(BaseModel):
    score: int = Field(ge=1, le=5, description="Rating from 1 to 5 stars")
    review: str = Field(min_length=10, description="Review text, at least 10 chars")
```

### 3. プロンプトに例を添える {#3-provide-examples-in-prompts}

```python
messages = [{
    "role": "user",
    "content": """Extract person info from: "John, 30, engineer"

Example format:
{
  "name": "John Doe",
  "age": 30,
  "occupation": "engineer"
}"""
}]
```

### 4. 選択肢が決まっているものは Enum にする {#4-use-enums-for-fixed-categories}

```python
# ✅ Good: Enum ensures valid values
class Status(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class Application(BaseModel):
    status: Status  # LLM must choose from enum
```

### 5. 足りないデータをうまく受け流す {#5-handle-missing-data-gracefully}

```python
class PartialData(BaseModel):
    required_field: str
    optional_field: Optional[str] = None
    default_field: str = "default_value"

# LLM only needs to provide required_field
```

## ほかの選択肢との比較 {#comparison-to-alternatives}

| 機能 | Instructor | 手書きの JSON | LangChain | DSPy |
|---------|------------|-------------|-----------|------|
| 型の安全性 | ✅ あり | ❌ なし | ⚠️ 一部 | ✅ あり |
| 自動での検証 | ✅ あり | ❌ なし | ❌ なし | ⚠️ 限定的 |
| 自動でのやり直し | ✅ あり | ❌ なし | ❌ なし | ✅ あり |
| 少しずつ受け取る | ✅ あり | ❌ なし | ✅ あり | ❌ なし |
| 複数の提供元 | ✅ あり | ⚠️ 手作業 | ✅ あり | ✅ あり |
| 覚えることの多さ | 少ない | 少ない | ふつう | 多い |

**Instructor が向いている場面:**
- 決まった形で、検証済みの出力がほしい
- 型の安全性とエディタの支援がほしい
- 自動でのやり直しが必要
- データ抽出の仕組みを作っている

**ほかを選んだほうがよい場面:**
- DSPy: プロンプトの最適化をしたい
- LangChain: 複雑な処理の連鎖を組みたい
- 手書き: 単発の簡単な抽出

## 参考リンク {#resources}

- **ドキュメント**: https://python.useinstructor.com
- **GitHub**: https://github.com/jxnl/instructor (15k+ stars)
- **Cookbook**: https://python.useinstructor.com/examples
- **Discord**: コミュニティのサポートがあります

## あわせて読む {#see-also}

- `references/validation.md` - 進んだ検証の書き方
- `references/providers.md` - 提供元ごとの設定
- `references/examples.md` - 実際の使用例
