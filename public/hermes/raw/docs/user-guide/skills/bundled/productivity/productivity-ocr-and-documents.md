---
title: "Ocr And Documents — PDF やスキャン画像から文字を取り出す（pymupdf、marker-pdf）"
description: "PDF やスキャン画像から文字を取り出す（pymupdf、marker-pdf）"
upstream_path: user-guide/skills/bundled/productivity/productivity-ocr-and-documents.md
upstream_blob: 9aed152a6f504bbe8e74e1aa3dc97e7f71d67413
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/productivity/productivity-ocr-and-documents
---

# Ocr And Documents {#ocr-and-documents}

PDF やスキャン画像から文字を取り出します（pymupdf、marker-pdf）。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/productivity/ocr-and-documents` |
| バージョン | `2.3.0` |
| 作者 | Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `PDF`, `Documents`, `Research`, `Arxiv`, `Text-Extraction`, `OCR` |
| 関連 skill | [`pdf`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-pdf/), [`docx`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-docx/), [`powerpoint`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-powerpoint/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# PDF & Document Extraction {#pdf-document-extraction}

DOCX を扱うなら `docx` skill（作成と編集）を見るか、構造まで含めて読むなら `python-docx` を使ってください。
PPTX を扱うなら `powerpoint` skill を見てください（作成・読み取り・編集にひととおり対応しています）。
PDF そのものの操作（結合、分割、フォーム、透かし、新規作成）は `pdf` skill を見てください。
この skill が扱うのは **PDF とスキャンした書類から文字を取り出すこと** です。

> **`read_file` の EXTRACTION COVERAGE WARNING を見てここに来ましたか。** `read_file` は手元の PDF を自動で変換しますが、読むのは文字の層だけです。警告の末尾には、文字が取れなかったページ（画像としてスキャンされたページ）が並びます。数ページだけなら、画像にしてから目で読ませるのがいちばん速いです。`pdftoppm -jpeg -r 150 -f N -l N file.pdf /tmp/page` を実行して、それぞれの画像を `vision_analyze` にかけてください。ページ数が多くまとめて OCR したい場合は、下の marker-pdf を使います（手順 2）。

## 手順 1: URL はありますか {#step-1-remote-url-available}

その書類に URL があるなら、**まず `web_extract` を試してください**。

```
web_extract(urls=["https://arxiv.org/pdf/2402.03300"])
web_extract(urls=["https://example.com/report.pdf"])
```

Firecrawl 経由で PDF を Markdown に変換してくれるので、手元に何も入れずに済みます。

手元で取り出すのは、ファイルがローカルにあるとき、web_extract が失敗したとき、まとめて処理したいときだけにしてください。

## 手順 2: 手元で使う道具を選ぶ {#step-2-choose-local-extractor}

| できること | pymupdf（約 25MB） | marker-pdf（約 3〜5GB） |
|---------|-----------------|---------------------|
| **文字入りの PDF** | ✅ | ✅ |
| **スキャンした PDF（OCR）** | ❌ | ✅（90 言語以上） |
| **表** | ✅（簡易） | ✅（精度が高い） |
| **数式 / LaTeX** | ❌ | ✅ |
| **コードブロック** | ❌ | ✅ |
| **フォーム** | ❌ | ✅ |
| **ヘッダーとフッターの除去** | ❌ | ✅ |
| **読む順序の判定** | ❌ | ✅ |
| **画像の取り出し** | ✅（埋め込み分） | ✅（前後の文脈つき） |
| **画像から文字へ（OCR）** | ❌ | ✅ |
| **EPUB** | ✅ | ✅ |
| **Markdown での出力** | ✅（pymupdf4llm 経由） | ✅（本来の機能。品質が高い） |
| **導入時の容量** | 約 25MB | 約 3〜5GB（PyTorch とモデル） |
| **速さ** | すぐ終わる | 1 ページ約 1〜14 秒（CPU）、約 0.2 秒（GPU） |

**選び方**: OCR、数式、フォーム、込み入ったレイアウトの解析が要らないなら pymupdf を使ってください。

marker の機能が必要なのに、空き容量が 5GB ほどない場合は、こう伝えます。
> 「この書類には OCR や高度な取り出し（marker-pdf）が要りますが、PyTorch とモデルのために 5GB ほどの空きが必要です。いまの空き容量は [X]GB です。選べるのは、空き容量を作る、URL をもらって web_extract を使う、あるいは pymupdf で試す（文字入りの PDF には効きますが、スキャンした書類や数式には効きません）の 3 つです。」

---

## pymupdf（軽いほう） {#pymupdf-lightweight}

```bash
pip install pymupdf pymupdf4llm
```

**補助スクリプトを使う場合**:
```bash
python scripts/extract_pymupdf.py document.pdf              # Plain text
python scripts/extract_pymupdf.py document.pdf --markdown    # Markdown
python scripts/extract_pymupdf.py document.pdf --tables      # Tables
python scripts/extract_pymupdf.py document.pdf --images out/ # Extract images
python scripts/extract_pymupdf.py document.pdf --metadata    # Title, author, pages
python scripts/extract_pymupdf.py document.pdf --pages 0-4   # Specific pages
```

**その場で書く場合**:
```bash
python3 -c "

doc = pymupdf.open('document.pdf')
for page in doc:
    print(page.get_text())
"
```

---

## marker-pdf（品質の高い OCR） {#marker-pdf-high-quality-ocr}

```bash
# Check disk space first
python scripts/extract_marker.py --check

pip install marker-pdf
```

**補助スクリプトを使う場合**:
```bash
python scripts/extract_marker.py document.pdf                # Markdown
python scripts/extract_marker.py document.pdf --json         # JSON with metadata
python scripts/extract_marker.py document.pdf --output_dir out/  # Save images
python scripts/extract_marker.py scanned.pdf                 # Scanned PDF (OCR)
python scripts/extract_marker.py document.pdf --use_llm      # LLM-boosted accuracy
```

**CLI**（marker-pdf と一緒に入ります）:
```bash
marker_single document.pdf --output_dir ./output
marker /path/to/folder --workers 4    # Batch
```

---

## arXiv の論文 {#arxiv-papers}

```
# Abstract only (fast)
web_extract(urls=["https://arxiv.org/abs/2402.03300"])

# Full paper
web_extract(urls=["https://arxiv.org/pdf/2402.03300"])

# Search
web_search(query="arxiv GRPO reinforcement learning 2026")
```

## 分割・結合・検索 {#split-merge-search}

pymupdf だけでできます。`execute_code` か、その場で書く Python を使ってください。

```python
# Split: extract pages 1-5 to a new PDF

doc = pymupdf.open("report.pdf")
new = pymupdf.open()
for i in range(5):
    new.insert_pdf(doc, from_page=i, to_page=i)
new.save("pages_1-5.pdf")
```

```python
# Merge multiple PDFs

result = pymupdf.open()
for path in ["a.pdf", "b.pdf", "c.pdf"]:
    result.insert_pdf(pymupdf.open(path))
result.save("merged.pdf")
```

```python
# Search for text across all pages

doc = pymupdf.open("report.pdf")
for i, page in enumerate(doc):
    results = page.search_for("revenue")
    if results:
        print(f"Page {i+1}: {len(results)} match(es)")
        print(page.get_text("text"))
```

追加のライブラリは要りません。分割、結合、検索、文字の取り出しは、pymupdf ひとつでまかなえます。

---

## 補足 {#notes}

- URL があるときは、いつでも `web_extract` が第一候補です
- pymupdf は無難な既定です。すぐ終わり、モデルも要らず、どこでも動きます
- marker-pdf は OCR、スキャンした書類、数式、込み入ったレイアウト向けです。必要になったときだけ入れてください
- どちらの補助スクリプトも `--help` で使い方が全部出ます
- marker-pdf は、初回に約 2.5GB のモデルを `~/.cache/huggingface/` に落とします
- Word の文書には `pip install python-docx` を使ってください（OCR より確実です。実際の構造を読み取ります）
- PowerPoint には `powerpoint` skill を見てください（python-pptx を使います）
