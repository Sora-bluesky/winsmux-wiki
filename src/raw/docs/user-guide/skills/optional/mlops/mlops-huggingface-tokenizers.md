---
title: "Huggingface Tokenizers — 高速な BPE/WordPiece のトークン分割と、独自語彙の学習"
description: "高速な BPE/WordPiece のトークン分割と、独自語彙の学習"
upstream_path: user-guide/skills/optional/mlops/mlops-huggingface-tokenizers.md
upstream_blob: b627c762ecc75ad71b46dc4e32f1b3013f4ec95e
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/mlops/mlops-huggingface-tokenizers
---

# Huggingface Tokenizers {#huggingface-tokenizers}

高速な BPE/WordPiece のトークン分割と、独自語彙の学習を行います。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/mlops/huggingface-tokenizers` で導入します |
| パス | `optional-skills/mlops\huggingface-tokenizers` |
| バージョン | `1.0.0` |
| 作者 | Orchestra Research |
| ライセンス | MIT |
| 依存関係 | `tokenizers`, `transformers`, `datasets` |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Tokenization`, `HuggingFace`, `BPE`, `WordPiece`, `Unigram`, `Fast Tokenization`, `Rust`, `Custom Tokenizer`, `Alignment Tracking`, `Production` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# HuggingFace Tokenizers - 自然言語処理のための高速なトークン分割 {#huggingface-tokenizers---fast-tokenization-for-nlp}

Rust 並みの速さと Python の書きやすさを兼ね備えた、実運用で使えるトークナイザです。

## HuggingFace Tokenizers を使う場面 {#when-to-use-huggingface-tokenizers}

**HuggingFace Tokenizers を使うとよい場面:**
- とても速いトークン分割が要るとき（1GB のテキストを &lt;20s で処理）
- 独自のトークナイザを一から学習させるとき
- 位置の対応づけ（トークン → 元のテキストの位置）を追いたいとき
- 実運用の自然言語処理のパイプラインを組むとき
- 大きなコーパスを効率よくトークン分割したいとき

**性能**:
- **速さ**: CPU で 1GB を &lt;20 秒
- **実装**: Rust で書かれた中核に、Python/Node.js から使える口が付いています
- **効率**: 純粋な Python の実装より 10〜100 倍速い

**ほかの手段のほうが向いている場面**:
- **SentencePiece**: 言語に依存しない方式。T5/ALBERT で使われています
- **tiktoken**: GPT 向けの、OpenAI による BPE のトークナイザ
- **transformers の AutoTokenizer**: 学習済みのものを読み込むだけのとき（内部でこのライブラリを使っています）

## はじめの一歩 {#quick-start}

### 導入 {#installation}

次のコマンドで導入します。transformers と組み合わせる場合は 2 つ目のほうを使います。

```bash
# Install tokenizers
pip install tokenizers

# With transformers integration
pip install tokenizers transformers
```

### 学習済みのトークナイザを読み込む {#load-pretrained-tokenizer}

次のコードは、HuggingFace Hub からトークナイザを取得し、文をトークンに分けてから元に戻します。

```python
from tokenizers import Tokenizer

# Load from HuggingFace Hub
tokenizer = Tokenizer.from_pretrained("bert-base-uncased")

# Encode text
output = tokenizer.encode("Hello, how are you?")
print(output.tokens)  # ['hello', ',', 'how', 'are', 'you', '?']
print(output.ids)     # [7592, 1010, 2129, 2024, 2017, 1029]

# Decode back
text = tokenizer.decode(output.ids)
print(text)  # "hello, how are you?"
```

### 独自の BPE トークナイザを学習させる {#train-custom-bpe-tokenizer}

次のコードは、BPE のトークナイザを用意し、手元のファイルで学習させて保存します。

```python
from tokenizers import Tokenizer
from tokenizers.models import BPE
from tokenizers.trainers import BpeTrainer
from tokenizers.pre_tokenizers import Whitespace

# Initialize tokenizer with BPE model
tokenizer = Tokenizer(BPE(unk_token="[UNK]"))
tokenizer.pre_tokenizer = Whitespace()

# Configure trainer
trainer = BpeTrainer(
    vocab_size=30000,
    special_tokens=["[UNK]", "[CLS]", "[SEP]", "[PAD]", "[MASK]"],
    min_frequency=2
)

# Train on files
files = ["train.txt", "validation.txt"]
tokenizer.train(files, trainer)

# Save
tokenizer.save("my-tokenizer.json")
```

**学習にかかる時間**: 100MB のコーパスで 1〜2 分、1GB で 10〜20 分ほど

### まとめて処理し、長さをそろえる {#batch-encoding-with-padding}

次のコードは、パディングを有効にしてから複数の文をまとめてトークン分割します。

```python
# Enable padding
tokenizer.enable_padding(pad_id=3, pad_token="[PAD]")

# Encode batch
texts = ["Hello world", "This is a longer sentence"]
encodings = tokenizer.encode_batch(texts)

for encoding in encodings:
    print(encoding.ids)
# [101, 7592, 2088, 102, 3, 3, 3]
# [101, 2023, 2003, 1037, 2936, 6251, 102]
```

## トークン分割のアルゴリズム {#tokenization-algorithms}

### BPE（Byte-Pair Encoding） {#bpe-byte-pair-encoding}

**仕組み**:
1. 文字単位の語彙から始めます
2. いちばんよく出る文字の組を探します
3. それを 1 つのトークンにまとめ、語彙に加えます
4. 語彙の大きさが目標に届くまで繰り返します

**採用例**: GPT-2、GPT-3、RoBERTa、BART、DeBERTa

```python
from tokenizers import Tokenizer
from tokenizers.models import BPE
from tokenizers.trainers import BpeTrainer
from tokenizers.pre_tokenizers import ByteLevel

tokenizer = Tokenizer(BPE(unk_token="<|endoftext|>"))
tokenizer.pre_tokenizer = ByteLevel()

trainer = BpeTrainer(
    vocab_size=50257,
    special_tokens=["<|endoftext|>"],
    min_frequency=2
)

tokenizer.train(files=["data.txt"], trainer=trainer)
```

**よいところ**:
- 未知語にうまく対処できます（部分語に分けられます）
- 語彙の大きさを自由に決められます
- 語形の変化が多い言語に向いています

**引き換えになるところ**:
- 分け方が、まとめた順番に左右されます
- よく使う語が思わぬところで分割されることがあります

### WordPiece {#wordpiece}

**仕組み**:
1. 文字単位の語彙から始めます
2. まとめる組に点数を付けます: `frequency(pair) / (frequency(first) × frequency(second))`
3. 点数のいちばん高い組をまとめます
4. 語彙の大きさが目標に届くまで繰り返します

**採用例**: BERT、DistilBERT、MobileBERT

```python
from tokenizers import Tokenizer
from tokenizers.models import WordPiece
from tokenizers.trainers import WordPieceTrainer
from tokenizers.pre_tokenizers import Whitespace
from tokenizers.normalizers import BertNormalizer

tokenizer = Tokenizer(WordPiece(unk_token="[UNK]"))
tokenizer.normalizer = BertNormalizer(lowercase=True)
tokenizer.pre_tokenizer = Whitespace()

trainer = WordPieceTrainer(
    vocab_size=30522,
    special_tokens=["[UNK]", "[CLS]", "[SEP]", "[PAD]", "[MASK]"],
    continuing_subword_prefix="##"
)

tokenizer.train(files=["corpus.txt"], trainer=trainer)
```

**よいところ**:
- 意味のあるまとめ方が優先されます（点数が高い＝意味のつながりが強い）
- BERT で実際に成果を上げています（当時の最高性能）

**引き換えになるところ**:
- 部分語にも当てはまらない未知語は `[UNK]` になります
- まとめ方の規則ではなく語彙を保存するので、ファイルが大きくなります

### Unigram {#unigram}

**仕組み**:
1. 大きな語彙（あらゆる部分文字列）から始めます
2. いまの語彙でコーパスの損失を計算します
3. 損失への影響がいちばん小さいトークンを取り除きます
4. 語彙の大きさが目標に届くまで繰り返します

**採用例**: ALBERT、T5、mBART、XLNet（SentencePiece 経由）

```python
from tokenizers import Tokenizer
from tokenizers.models import Unigram
from tokenizers.trainers import UnigramTrainer

tokenizer = Tokenizer(Unigram())

trainer = UnigramTrainer(
    vocab_size=8000,
    special_tokens=["<unk>", "<s>", "</s>"],
    unk_token="<unk>"
)

tokenizer.train(files=["data.txt"], trainer=trainer)
```

**よいところ**:
- 確率にもとづくので、いちばんありそうな分け方を見つけられます
- 語の切れ目がない言語にうまく合います
- 幅広い言語の状況に対応できます

**引き換えになるところ**:
- 学習に計算量がかかります
- 調整するパラメータが多めです

## トークン分割の流れ {#tokenization-pipeline}

全体の流れは **正規化 → 事前分割 → モデル → 後処理** です。

### 正規化 {#normalization}

テキストをきれいに整えます。

```python
from tokenizers.normalizers import NFD, StripAccents, Lowercase, Sequence

tokenizer.normalizer = Sequence([
    NFD(),           # Unicode normalization (decompose)
    Lowercase(),     # Convert to lowercase
    StripAccents()   # Remove accents
])

# Input: "Héllo WORLD"
# After normalization: "hello world"
```

**よく使う正規化**:
- `NFD`, `NFC`, `NFKD`, `NFKC` - Unicode の正規化形式
- `Lowercase()` - 小文字にそろえます
- `StripAccents()` - アクセント記号を外します（é → e）
- `Strip()` - 前後の空白を落とします
- `Replace(pattern, content)` - 正規表現で置き換えます

### 事前分割 {#pre-tokenization}

テキストを語のようなまとまりに分けます。

```python
from tokenizers.pre_tokenizers import Whitespace, Punctuation, Sequence, ByteLevel

# Split on whitespace and punctuation
tokenizer.pre_tokenizer = Sequence([
    Whitespace(),
    Punctuation()
])

# Input: "Hello, world!"
# After pre-tokenization: ["Hello", ",", "world", "!"]
```

**よく使う事前分割**:
- `Whitespace()` - 空白、タブ、改行で分けます
- `ByteLevel()` - GPT-2 と同じバイト単位の分け方
- `Punctuation()` - 記号を切り出します
- `Digits(individual_digits=True)` - 数字を 1 桁ずつに分けます
- `Metaspace()` - 空白を ▁ に置き換えます（SentencePiece のやり方）

### 後処理 {#post-processing}

モデルに入れるための特別なトークンを足します。

```python
from tokenizers.processors import TemplateProcessing

# BERT-style: [CLS] sentence [SEP]
tokenizer.post_processor = TemplateProcessing(
    single="[CLS] $A [SEP]",
    pair="[CLS] $A [SEP] $B [SEP]",
    special_tokens=[
        ("[CLS]", 1),
        ("[SEP]", 2),
    ],
)
```

**よくある書き方**:
```python
# GPT-2: sentence <|endoftext|>
TemplateProcessing(
    single="$A <|endoftext|>",
    special_tokens=[("<|endoftext|>", 50256)]
)

# RoBERTa: <s> sentence </s>
TemplateProcessing(
    single="<s> $A </s>",
    pair="<s> $A </s> </s> $B </s>",
    special_tokens=[("<s>", 0), ("</s>", 2)]
)
```

## 位置の対応づけ {#alignment-tracking}

トークンが元のテキストのどこにあったかを追えます。

```python
output = tokenizer.encode("Hello, world!")

# Get token offsets
for token, offset in zip(output.tokens, output.offsets):
    start, end = offset
    print(f"{token:10} → [{start:2}, {end:2}): {text[start:end]!r}")

# Output:
# hello      → [ 0,  5): 'Hello'
# ,          → [ 5,  6): ','
# world      → [ 7, 12): 'world'
# !          → [12, 13): '!'
```

**使いどころ**:
- 固有表現の抽出（予測を元のテキストに戻す）
- 質問応答（答えの範囲を切り出す）
- トークン単位の分類（ラベルを元の位置に合わせる）

## transformers との組み合わせ {#integration-with-transformers}

### AutoTokenizer で読み込む {#load-with-autotokenizer}

次のコードは、AutoTokenizer で読み込み、内側の高速なトークナイザに触ります。

```python
from transformers import AutoTokenizer

# AutoTokenizer automatically uses fast tokenizers
tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased")

# Check if using fast tokenizer
print(tokenizer.is_fast)  # True

# Access underlying tokenizers.Tokenizer
fast_tokenizer = tokenizer.backend_tokenizer
print(type(fast_tokenizer))  # <class 'tokenizers.Tokenizer'>
```

### 独自のトークナイザを transformers 向けに包む {#convert-custom-tokenizer-to-transformers}

次のコードは、学習させたトークナイザを保存し、transformers のトークナイザとして使える形に包みます。

```python
from tokenizers import Tokenizer
from transformers import PreTrainedTokenizerFast

# Train custom tokenizer
tokenizer = Tokenizer(BPE())
# ... train tokenizer ...
tokenizer.save("my-tokenizer.json")

# Wrap for transformers
transformers_tokenizer = PreTrainedTokenizerFast(
    tokenizer_file="my-tokenizer.json",
    unk_token="[UNK]",
    pad_token="[PAD]",
    cls_token="[CLS]",
    sep_token="[SEP]",
    mask_token="[MASK]"
)

# Use like any transformers tokenizer
outputs = transformers_tokenizer(
    "Hello world",
    padding=True,
    truncation=True,
    max_length=512,
    return_tensors="pt"
)
```

## よく使う型 {#common-patterns}

### イテレータから学習させる（大きなデータ向け） {#train-from-iterator-large-datasets}

次のコードは、データセットを少しずつ取り出しながらトークナイザを学習させます。

```python
from datasets import load_dataset

# Load dataset
dataset = load_dataset("wikitext", "wikitext-103-raw-v1", split="train")

# Create batch iterator
def batch_iterator(batch_size=1000):
    for i in range(0, len(dataset), batch_size):
        yield dataset[i:i + batch_size]["text"]

# Train tokenizer
tokenizer.train_from_iterator(
    batch_iterator(),
    trainer=trainer,
    length=len(dataset)  # For progress bar
)
```

**性能**: 1GB を 10〜20 分ほどで処理します

### 打ち切りとパディングを有効にする {#enable-truncation-and-padding}

次のコードは、最大の長さを 512 に決めて、足りない分を埋め、あふれる分を切ります。

```python
# Enable truncation
tokenizer.enable_truncation(max_length=512)

# Enable padding
tokenizer.enable_padding(
    pad_id=tokenizer.token_to_id("[PAD]"),
    pad_token="[PAD]",
    length=512  # Fixed length, or None for batch max
)

# Encode with both
output = tokenizer.encode("This is a long sentence that will be truncated...")
print(len(output.ids))  # 512
```

### 複数のプロセスで処理する {#multi-processing}

次のコードは、大きなコーパスを分割し、8 つのプロセスで同時にトークン分割します。

```python
from tokenizers import Tokenizer
from multiprocessing import Pool

# Load tokenizer
tokenizer = Tokenizer.from_file("tokenizer.json")

def encode_batch(texts):
    return tokenizer.encode_batch(texts)

# Process large corpus in parallel
with Pool(8) as pool:
    # Split corpus into chunks
    chunk_size = 1000
    chunks = [corpus[i:i+chunk_size] for i in range(0, len(corpus), chunk_size)]

    # Encode in parallel
    results = pool.map(encode_batch, chunks)
```

**速くなる度合い**: 8 コアで 5〜8 倍

## 性能の測定結果 {#performance-benchmarks}

### 学習の速さ {#training-speed}

| コーパスの大きさ | BPE（語彙 30k） | WordPiece（30k） | Unigram（8k） |
|-------------|-----------------|-----------------|--------------|
| 10 MB       | 15 秒          | 18 秒            | 25 秒        |
| 100 MB      | 1.5 分         | 2 分             | 4 分         |
| 1 GB        | 15 分          | 20 分            | 40 分        |

**測定環境**: 16 コアの CPU、英語版 Wikipedia で測定

### トークン分割の速さ {#tokenization-speed}

| 実装 | 1 GB のコーパス | 処理量    |
|----------------|-------------|---------------|
| 純粋な Python    | 約 20 分 | 約 50 MB/分    |
| HF Tokenizers  | 約 15 秒 | 約 4 GB/分     |
| **倍率**    | **80 倍**     | **80 倍**       |

**測定条件**: 英語のテキスト、1 文あたり平均 20 語

### メモリの使用量 {#memory-usage}

| 作業                    | メモリ  |
|-------------------------|---------|
| トークナイザの読み込み          | 約 10 MB  |
| BPE の学習（語彙 30k）   | 約 200 MB |
| 100 万文のトークン分割     | 約 500 MB |

## 対応しているモデル {#supported-models}

`from_pretrained()` で読み込める学習済みのトークナイザです。

**BERT 系**:
- `bert-base-uncased`, `bert-large-cased`
- `distilbert-base-uncased`
- `roberta-base`, `roberta-large`

**GPT 系**:
- `gpt2`, `gpt2-medium`, `gpt2-large`
- `distilgpt2`

**T5 系**:
- `t5-small`, `t5-base`, `t5-large`
- `google/flan-t5-xxl`

**その他**:
- `facebook/bart-base`, `facebook/mbart-large-cc25`
- `albert-base-v2`, `albert-xlarge-v2`
- `xlm-roberta-base`, `xlm-roberta-large`

すべての一覧: https://huggingface.co/models?library=tokenizers

## 関連ドキュメント {#references}

- **[学習の手引き](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops\huggingface-tokenizers/references/training.md)** - 独自のトークナイザの学習、トレーナーの設定、大きなデータの扱い方
- **[アルゴリズムの詳細](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops\huggingface-tokenizers/references/algorithms.md)** - BPE、WordPiece、Unigram のくわしい解説
- **[流れを構成する部品](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops\huggingface-tokenizers/references/pipeline.md)** - 正規化、事前分割、後処理、復元
- **[transformers との組み合わせ](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops\huggingface-tokenizers/references/integration.md)** - AutoTokenizer、PreTrainedTokenizerFast、特別なトークン

## 参考資料 {#resources}

- **ドキュメント**: https://huggingface.co/docs/tokenizers
- **GitHub**: https://github.com/huggingface/tokenizers ⭐ 9,000 以上
- **バージョン**: 0.20.0 以降
- **講座**: https://huggingface.co/learn/nlp-course/chapter6/1
- **論文**: BPE（Sennrich ら、2016）、WordPiece（Schuster と Nakajima、2012）
