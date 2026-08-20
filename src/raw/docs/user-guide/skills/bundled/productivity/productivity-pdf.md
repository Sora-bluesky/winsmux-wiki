---
title: "Pdf — PDF ファイルを作る・読む・結合する・入力する・保護する"
description: "PDF ファイルを作る・読む・結合する・入力する・保護する"
upstream_path: user-guide/skills/bundled/productivity/productivity-pdf.md
upstream_blob: 20950d56e418afa716df8d3ece17eeb59b9bf2fb
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/productivity/productivity-pdf
---

# Pdf {#pdf}

PDF ファイルを作り、読み、結合し、フォームに入力し、保護します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/productivity/pdf` |
| バージョン | `1.0.0` |
| 作者 | Nous Research |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `pdf`, `documents`, `forms`, `reportlab`, `pypdf`, `pdfplumber` |
| 関連 skill | [`docx`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-docx/), [`xlsx`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-xlsx/), [`powerpoint`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-powerpoint/), [`ocr-and-documents`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-ocr-and-documents/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# PDF Skill {#pdf-skill}

pypdf・reportlab・pdfplumber を使って、決まった形式の指定から PDF を作り、本文・表・メタデータを取り出し、ページの結合・分割・回転・透かし入れを行い、AcroForm のフォーム欄を埋め、暗号化と解除をします。紙をスキャンしただけの（画像だけの）PDF には文字の層がありません。OCR はこの skill の対象外です。ページが画像だけだったときは、文字を取り出せたふりをせず、そこで止めて `ocr-and-documents` skill を使ってください。

## こんなときに使います {#when-to-use}

- 報告書・請求書・複数ページの文書を PDF として作りたいとき。
- PDF から本文・表（JSON/CSV）・メタデータ・フォーム欄の値を取り出したいとき。
- PDF の結合・分割・回転・一部ページの抜き出し・透かし入れ・しおり付け・圧縮をしたいとき。
- AcroForm のフォームに入力したり、内容を固定したり、パスワードで暗号化・解除したいとき。
- スキャンした画像だけの PDF には使いません（`ocr-and-documents` を使ってください）。HTML を見た目そのままに PDF 化する用途にも使いません（ヘッドレスブラウザーを使ってください）。

## 事前に必要なもの {#prerequisites}

- Python 3.10 以上と `pypdf`・`reportlab`・`pdfplumber`:
  `python3 -m pip install pypdf reportlab pdfplumber`
- 補助スクリプトはそれぞれ、必要になった時点で読み込みを確かめ、足りないものがあれば導入の案内を表示します。

## 実行のしかた {#how-to-run}

補助スクリプトはすべて `scripts/` にあり、argparse のコマンドとして作られています。`terminal` ツールから実行してください。どれも `--help` に対応します。JSON の読み書きは必ず UTF-8 で行い、結果は JSON として標準出力に表示し、失敗すると 0 以外の終了コードを返します。

```bash
python3 scripts/pdf_create.py spec.json -o out.pdf         # build PDF from JSON spec
python3 scripts/pdf_read.py doc.pdf --text                 # per-page text (JSON)
python3 scripts/pdf_read.py doc.pdf --tables --csv-dir t/  # tables to JSON + CSV files
python3 scripts/pdf_read.py doc.pdf --meta                 # metadata, page sizes, encrypted/scanned flags
python3 scripts/pdf_read.py form.pdf --fields              # form fields: name, type, value
python3 scripts/pdf_merge.py a.pdf b.pdf -o merged.pdf [--bookmarks]
python3 scripts/pdf_split.py doc.pdf --pages 1-3,7 -o part.pdf [--rotate 90]
python3 scripts/pdf_fill_form.py form.pdf --fields-json values.json -o filled.pdf [--flatten]
python3 scripts/pdf_secure.py doc.pdf --encrypt -o enc.pdf --user-password your-password
python3 scripts/pdf_secure.py enc.pdf --decrypt -o dec.pdf --password your-password
python3 scripts/pdf_watermark.py doc.pdf --stamp mark.pdf -o stamped.pdf [--under]
```

## 早見表 {#quick-reference}

| やりたいこと | 使うもの | コマンド / API |
|---|---|---|
| 文書を作る（見出し・表・画像） | reportlab platypus | `pdf_create.py spec.json -o out.pdf` |
| ページごとの本文 | pdfplumber | `pdf_read.py f.pdf --text` |
| 表を JSON/CSV に | pdfplumber | `pdf_read.py f.pdf --tables` |
| メタデータ / 用紙サイズ / 暗号化 / スキャン判定 | pypdf + pdfplumber | `pdf_read.py f.pdf --meta` |
| 結合（しおり付き） | pypdf | `pdf_merge.py a.pdf b.pdf -o m.pdf` |
| 分割 / 抜き出し / 回転 | pypdf | `pdf_split.py f.pdf --pages 2-5 --rotate 90` |
| フォームの一覧 / 入力 / 固定 | pypdf | `pdf_read.py --fields`, `pdf_fill_form.py` |
| 暗号化 / 解除（AES-256） | pypdf | `pdf_secure.py --encrypt/--decrypt` |
| 透かし / スタンプ | pypdf | `pdf_watermark.py f.pdf --stamp w.pdf` |
| 内容の流れを圧縮 | pypdf | `pdf_split.py f.pdf --pages 1-N --compress` |

## 手順 {#procedure}

1. **まず中身を見ます。** `pdf_read.py file.pdf --meta` を実行します。`encrypted` を確認し（true なら先に `pdf_secure.py --decrypt` で解除します）、`likely_scanned_pages` も見ます。ページが画像だけなら `ocr-and-documents` skill に引き継ぎます。本文が空だったことを「中身なし」と報告してはいけません。
2. **作ります。** `write_file` で JSON の指定を書き（使える要素は `heading`・`paragraph`・`table`・`image`・`pagebreak`。`title`/`author` のメタデータは任意で、ページ番号は自動で付きます）、`pdf_create.py` を実行します。配置が重要なら、書き出したページの画像を `vision_analyze` で見て確かめます。
3. **取り出します。** `--text` はページごとの文字列を JSON の一覧で返し、`--tables` はページごとの行の配列を返すほか、CSV ファイルとしても書き出せます。結果は `read_file` で読んでください。バイナリの PDF をそのまま目で見ようとしないでください。
4. **加工します。** `pdf_merge.py` は順につなぎ、元ファイルごとにしおりを 1 つ付けられます。`pdf_split.py` はページ範囲（1 から数えます。例: `1-3,5,9-`）、90 度きざみの回転、`--compress` に対応します。透かしは、1 ページのスタンプ用 PDF を用意し（たとえば `pdf_create.py` で作ります）、`pdf_watermark.py` で重ねます。
5. **フォームを扱います。** `--fields` で欄の正確な名前と種類を調べ、`{"FieldName": "value"}` の形の JSON を UTF-8 で `write_file` を使って書き（チェックボックスは `true`/`false`、ラジオボタンや選択肢の値は欄の書き出し用の選択肢と一致させます）、`pdf_fill_form.py` を実行します。もう一度 `--fields` で読み直し、値が入ったことを確かめてください。
6. **保護します。** 利用者用と所有者用に別々のパスワードを設定し、AES-256 で暗号化します。分かっているパスワードを外したいときは、`--decrypt` で暗号化なしの複製を書き出します。
7. 成功と報告する前に、**確認**（下記）を行います。

## つまずきやすいところ {#pitfalls}

- **スキャンした PDF**: `extract_text()` が空で、ページに画像がある場合は、文字の層がありません。`ocr-and-documents` に回してください。文字をでっち上げてはいけません。
- **内容固定の限界**: `pdf_fill_form.py --flatten` は pypdf の固定機能を使い、入力欄の見た目をページの内容に変換します。ふつうのテキスト欄やチェックボックスでは確実に動きますが、変わった部品（リッチテキスト、独自の見た目の定義、一部のラジオボタン群）は消えたり崩れたりすることがあります。固定後の結果は `vision_analyze` で目視で確かめてください。確実に固定したいときは、外部の描画ツール（Ghostscript や `pdftoppm` + 組み直しなど）に頼る手もあります。
- **NeedAppearances**: 入力後、見た目の定義がないと表示されない閲覧ソフトがあります。入力用スクリプトは AcroForm の `NeedAppearances` フラグを立てるので、仕様に沿った閲覧ソフトなら見た目を作り直します。ただし機能の少ない閲覧ソフトはこれを無視します。表示の正確さが大事なら固定してください。
- **ラテン文字以外のフォームの値**: 値そのものは（UTF-16 で）正しく保存されますが、欄の既定フォントに字形がないことがあり、データは往復できているのに閲覧ソフトでは空白に見える場合があります。見た目ではなく `--fields` で確かめてください。
- **圧縮の効き方**: `--compress` は内容の流れを縮めるだけです。減るのはふつう 0〜20% 程度で、画像が主体の PDF やすでに圧縮済みのものにはほとんど効きません。画像の解像度を落とす処理（Ghostscript の領分）の代わりにはなりません。
- **権限のフラグは強制力を持ちません**: 所有者パスワードによる権限のビット（印刷不可、コピー不可）は閲覧ソフトへのお願いにすぎず、pypdf を含むどのライブラリーからも読めて外せます。中身を実際に守るのは利用者パスワードによる暗号化だけです。権限のフラグを安全対策として説明しないでください。
- **表の取り出しは推測です**: pdfplumber は罫線や単語の並びから表を見つけます。罫線のない表やセルを結合した表では、`table_settings` の調整や手直しが必要になることがあります。
- **ページ番号の数え方**: 補助コマンドはページを 1 から数えますが、pypdf の API は 0 から数えます。スクリプト側で変換しているので、二重に変換しないでください。
- 回転は 90 の倍数にしてください。暗号化された入力は、ほかの操作の前に解除する必要があります。

## 確認 {#verification}

- 作成・結合・分割のあと: `pdf_read.py out.pdf --meta` で `page_count` を確かめ、回転させたならページごとの `rotation` も見ます。
- 取り出しのあと: JSON が空でないことを確かめ、分かっている文字列やセルをいくつか抜き取って照合します。
- フォーム入力のあと: `pdf_read.py filled.pdf --fields` で値を比べます（ASCII 以外も含め、完全に一致するか確かめます）。
- 暗号化のあと: `--meta` に `"encrypted": true` と表示され、パスワードなしでは開けないことを確かめます。解除のあとは、取り出した本文が元と一致することを確かめます。
- 見た目に関わるもの（透かし、固定したフォーム）は、書き出して `vision_analyze` で確かめてください。
