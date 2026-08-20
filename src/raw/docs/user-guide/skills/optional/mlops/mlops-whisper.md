---
title: "Whisper — 99 の言語で音声を文字にし、翻訳する"
description: "99 の言語で音声を文字にし、翻訳する"
upstream_path: user-guide/skills/optional/mlops/mlops-whisper.md
upstream_blob: 458316b67c1a106dea1d93020c31c421dd185ff3
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/mlops/mlops-whisper
---

# Whisper {#whisper}

99 の言語で音声を文字にし、翻訳します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/mlops/whisper` で導入します |
| パス | `optional-skills/mlops/whisper` |
| バージョン | `1.0.0` |
| 作者 | Orchestra Research |
| ライセンス | MIT |
| 依存関係 | `openai-whisper`, `transformers`, `torch` |
| 対応プラットフォーム | linux, macos |
| タグ | `Whisper`, `Speech Recognition`, `ASR`, `Multimodal`, `Multilingual`, `OpenAI`, `Speech-To-Text`, `Transcription`, `Translation`, `Audio Processing` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Whisper - 頑丈な音声認識 {#whisper---robust-speech-recognition}

OpenAI の多言語対応の音声認識モデルです。

## Whisper を使うとき {#when-to-use-whisper}

**向いているとき:**
- 音声を文字に起こす（99 の言語に対応）
- ポッドキャストや動画の文字起こし
- 会議メモの自動化
- 英語への翻訳
- 雑音の多い音声の文字起こし
- 多言語の音声を扱う処理

**数字で見ると**:
- **GitHub のスター 72,900 個以上**
- 99 の言語に対応
- 68 万時間の音声で学習
- MIT ライセンス

**別のものを選んだほうがよいとき**:
- **AssemblyAI**: マネージドの API で、話者の切り分けにも対応
- **Deepgram**: リアルタイムに流しながらの音声認識
- **Google Speech-to-Text**: クラウド上で動く

## まず動かす {#quick-start}

### インストール {#installation}

```bash
# Requires Python 3.8-3.11
pip install -U openai-whisper

# Requires ffmpeg
# macOS: brew install ffmpeg
# Ubuntu: sudo apt install ffmpeg
# Windows: choco install ffmpeg
```

### 基本の文字起こし {#basic-transcription}

```python

# Load model
model = whisper.load_model("base")

# Transcribe
result = model.transcribe("audio.mp3")

# Print text
print(result["text"])

# Access segments
for segment in result["segments"]:
    print(f"[{segment['start']:.2f}s - {segment['end']:.2f}s] {segment['text']}")
```

## モデルの大きさ {#model-sizes}

```python
# Available models
models = ["tiny", "base", "small", "medium", "large", "turbo"]

# Load specific model
model = whisper.load_model("turbo")  # Fastest, good quality
```

| モデル | パラメータ数 | 英語専用 | 多言語 | 速度 | VRAM |
|-------|------------|--------------|--------------|-------|------|
| tiny | 39M | ✓ | ✓ | ~32x | ~1 GB |
| base | 74M | ✓ | ✓ | ~16x | ~1 GB |
| small | 244M | ✓ | ✓ | ~6x | ~2 GB |
| medium | 769M | ✓ | ✓ | ~2x | ~5 GB |
| large | 1550M | ✗ | ✓ | 1x | ~10 GB |
| turbo | 809M | ✗ | ✓ | ~8x | ~6 GB |

**おすすめ**: 速度と品質のバランスなら `turbo`、試作段階なら `base` を使ってください

## 文字起こしの設定 {#transcription-options}

### 言語を指定する {#language-specification}

```python
# Auto-detect language
result = model.transcribe("audio.mp3")

# Specify language (faster)
result = model.transcribe("audio.mp3", language="en")

# Supported: en, es, fr, de, it, pt, ru, ja, ko, zh, and 89 more
```

### 処理の種類を選ぶ {#task-selection}

```python
# Transcription (default)
result = model.transcribe("audio.mp3", task="transcribe")

# Translation to English
result = model.transcribe("spanish.mp3", task="translate")
# Input: Spanish audio → Output: English text
```

### 最初に渡すプロンプト {#initial-prompt}

```python
# Improve accuracy with context
result = model.transcribe(
    "audio.mp3",
    initial_prompt="This is a technical podcast about machine learning and AI."
)

# Helps with:
# - Technical terms
# - Proper nouns
# - Domain-specific vocabulary
```

### タイムスタンプ {#timestamps}

```python
# Word-level timestamps
result = model.transcribe("audio.mp3", word_timestamps=True)

for segment in result["segments"]:
    for word in segment["words"]:
        print(f"{word['word']} ({word['start']:.2f}s - {word['end']:.2f}s)")
```

### temperature を段階的に変えて試す {#temperature-fallback}

```python
# Retry with different temperatures if confidence low
result = model.transcribe(
    "audio.mp3",
    temperature=(0.0, 0.2, 0.4, 0.6, 0.8, 1.0)
)
```

## コマンドラインでの使い方 {#command-line-usage}

```bash
# Basic transcription
whisper audio.mp3

# Specify model
whisper audio.mp3 --model turbo

# Output formats
whisper audio.mp3 --output_format txt     # Plain text
whisper audio.mp3 --output_format srt     # Subtitles
whisper audio.mp3 --output_format vtt     # WebVTT
whisper audio.mp3 --output_format json    # JSON with timestamps

# Language
whisper audio.mp3 --language Spanish

# Translation
whisper spanish.mp3 --task translate
```

## まとめて処理する {#batch-processing}

```python

audio_files = ["file1.mp3", "file2.mp3", "file3.mp3"]

for audio_file in audio_files:
    print(f"Transcribing {audio_file}...")
    result = model.transcribe(audio_file)

    # Save to file
    output_file = audio_file.replace(".mp3", ".txt")
    with open(output_file, "w") as f:
        f.write(result["text"])
```

## リアルタイムの文字起こし {#real-time-transcription}

```python
# For streaming audio, use faster-whisper
# pip install faster-whisper

from faster_whisper import WhisperModel

model = WhisperModel("base", device="cuda", compute_type="float16")

# Transcribe with streaming
segments, info = model.transcribe("audio.mp3", beam_size=5)

for segment in segments:
    print(f"[{segment.start:.2f}s -> {segment.end:.2f}s] {segment.text}")
```

## GPU で速くする {#gpu-acceleration}

```python

# Automatically uses GPU if available
model = whisper.load_model("turbo")

# Force CPU
model = whisper.load_model("turbo", device="cpu")

# Force GPU
model = whisper.load_model("turbo", device="cuda")

# 10-20× faster on GPU
```

## ほかのツールと組み合わせる {#integration-with-other-tools}

### 字幕を作る {#subtitle-generation}

```bash
# Generate SRT subtitles
whisper video.mp4 --output_format srt --language English

# Output: video.srt
```

### LangChain と組み合わせる {#with-langchain}

```python
from langchain.document_loaders import WhisperTranscriptionLoader

loader = WhisperTranscriptionLoader(file_path="audio.mp3")
docs = loader.load()

# Use transcription in RAG
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings

vectorstore = Chroma.from_documents(docs, OpenAIEmbeddings())
```

### 動画から音声を取り出す {#extract-audio-from-video}

```bash
# Use ffmpeg to extract audio
ffmpeg -i video.mp4 -vn -acodec pcm_s16le audio.wav

# Then transcribe
whisper audio.wav
```

## うまく使うコツ {#best-practices}

1. **turbo モデルを使う** - 英語なら速度と品質のバランスがいちばんよい
2. **言語を指定する** - 自動判定より速くなる
3. **最初にプロンプトを渡す** - 専門用語の認識がよくなる
4. **GPU を使う** - 10〜20 倍速くなる
5. **まとめて処理する** - そのほうが効率がよい
6. **WAV に変換する** - 相性の問題が起きにくい
7. **長い音声は分ける** - &lt;30 分ごとの区切りにする
8. **対応言語を確認する** - 言語によって品質が変わる
9. **faster-whisper を使う** - openai-whisper より 4 倍速い
10. **VRAM を見ておく** - 手元の機材に合わせてモデルの大きさを選ぶ

## 性能 {#performance}

| モデル | 実時間比（CPU） | 実時間比（GPU） |
|-------|------------------------|------------------------|
| tiny | ~0.32 | ~0.01 |
| base | ~0.16 | ~0.01 |
| turbo | ~0.08 | ~0.01 |
| large | ~1.0 | ~0.05 |

*実時間比: 0.1 なら実時間の 10 倍の速さで処理できます*

## 対応している言語 {#language-support}

とくによく対応している言語:
- 英語 (en)
- スペイン語 (es)
- フランス語 (fr)
- ドイツ語 (de)
- イタリア語 (it)
- ポルトガル語 (pt)
- ロシア語 (ru)
- 日本語 (ja)
- 韓国語 (ko)
- 中国語 (zh)

全体では 99 の言語に対応しています

## 苦手なこと {#limitations}

1. **もっともらしい間違い** - 同じ言葉を繰り返したり、なかった言葉を作ったりすることがあります
2. **長い音声での精度** - 30 分を超えると精度が落ちます
3. **話者の特定** - 話者の切り分けには対応していません
4. **なまり** - 話し方によって品質が変わります
5. **背景の雑音** - 精度に影響します
6. **リアルタイムの遅延** - 生放送の字幕には向きません

## 参考リンク {#resources}

- **GitHub**: https://github.com/openai/whisper ⭐ 72,900+
- **論文**: https://arxiv.org/abs/2212.04356
- **モデルカード**: https://github.com/openai/whisper/blob/main/model-card.md
- **Colab**: リポジトリ内にあります
- **ライセンス**: MIT
