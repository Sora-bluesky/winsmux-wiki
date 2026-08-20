---
title: "Nano Pdf — 手元の PDF の文字を、ふつうの言葉での指示で書き換える"
description: "手元の PDF の文字を、ふつうの言葉での指示で書き換える"
upstream_path: user-guide/skills/bundled/productivity/productivity-nano-pdf.md
upstream_blob: acd3b12ba9de7316755356ae245352fbc3088b3c
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/productivity/productivity-nano-pdf
---

# Nano Pdf {#nano-pdf}

手元の PDF の文字を、ふつうの言葉での指示で書き換えます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/productivity/nano-pdf` |
| バージョン | `1.0.0` |
| 作者 | community |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `PDF`, `Documents`, `Editing`, `NLP`, `Productivity` |
| 関連 skill | [`pdf`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-pdf/), [`ocr-and-documents`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-ocr-and-documents/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# nano-pdf {#nano-pdf}

ふつうの言葉での指示で PDF を書き換えます。ページを指定して、何をどう変えたいかを書くだけです。PDF の構造そのものを扱う作業（結合、分割、フォーム、透かし、新規作成）は `pdf` skill を、スキャンした紙から文字を取り出す作業は `ocr-and-documents` を見てください。

## 事前に必要なもの {#prerequisites}

```bash
# Install with uv (recommended — already available in Hermes)
uv pip install nano-pdf

# Or with pip
pip install nano-pdf
```

## 使い方 {#usage}

```bash
nano-pdf edit <file.pdf> <page_number> "<instruction>"
```

## 例 {#examples}

```bash
# Change a title on page 1
nano-pdf edit deck.pdf 1 "Change the title to 'Q3 Results' and fix the typo in the subtitle"

# Update a date on a specific page
nano-pdf edit report.pdf 3 "Update the date from January to February 2026"

# Fix content
nano-pdf edit contract.pdf 2 "Change the client name from 'Acme Corp' to 'Acme Industries'"
```

## 補足 {#notes}

- ページ番号は、版によって 0 から数える場合と 1 から数える場合があります。狙いと違うページが書き換わったら、±1 してやり直してください
- 書き換えたあとは、必ず出力された PDF を確認してください（`read_file` でファイルサイズを見るか、実際に開いてみます）
- 内部で LLM を使うので、API キーが必要です（設定のしかたは `nano-pdf --help` を見てください）
- 文字の書き換えはよく効きます。込み入ったレイアウトの変更には、別の手立てが要るかもしれません
