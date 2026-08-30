---
title: "Pdf — PDF ファイルを作る・読む・結合する・入力する・OCR にかける・本文を書き換える"
description: "PDF ファイルを作る・読む・結合する・入力する・OCR にかける・本文を書き換える"
upstream_path: user-guide/skills/bundled/productivity/productivity-pdf.md
upstream_blob: a375340613a50f26788733f49862fc0ccdb61358
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/productivity/productivity-pdf
---

# Pdf {#pdf}

PDF ファイルを作り、読み、結合し、フォームに入力し、OCR にかけ、本文を書き換えます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/productivity\pdf` |
| バージョン | `1.1.0` |
| 作者 | Nous Research |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `pdf`, `documents`, `forms`, `ocr`, `text-extraction`, `reportlab`, `pypdf`, `pdfplumber`, `pymupdf`, `marker` |
| 関連 skill | [`docx`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-docx/), [`xlsx`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-xlsx/), [`powerpoint`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-powerpoint/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# PDF Skill {#pdf-skill}

決まった形式の指定から PDF を作り、AcroForm のフォームを組み立てて入力し（配置の点検と重ね合わせ画像付き）、本文・表・メタデータを取り出し、ページの結合・分割・回転・透かし入れ・スタンプを行い、ページを画像として書き出し、メタデータと添付ファイルを扱い、暗号化と解除をします。使うのは pypdf・reportlab・pdfplumber です。取り込んだ機能が 2 つ references/ にあります（その作業に入る前に、対応するファイルを読んでください）。

- **スキャンした画像だけの PDF と OCR**（pymupdf の速い経路、marker-pdf の高品質な経路、scripts/extract_pymupdf.py + scripts/extract_marker.py）: `references/ocr-extraction.md`
- **すでにある PDF の本文を、ふつうの言葉での指示で書き換える**（nano-pdf コマンド）: `references/nano-pdf-editing.md`

## こんなときに使います {#when-to-use}

- 報告書・請求書・複数ページの文書を PDF として作りたいとき。
- JSON の指定から入力できる AcroForm（テキスト・チェックボックス・ラジオボタン・ドロップダウン）を組み立てたいとき。まず配置を点検します。
- PDF から本文・表（JSON/CSV）・メタデータ・フォーム欄の値を取り出したいとき。
- PDF の結合・分割・回転・一部ページの抜き出し・透かし入れ・座標を指定した文字や画像のスタンプ・しおり付け・圧縮をしたいとき。
- 見た目の確認や OCR への受け渡しのためにページを PNG として書き出したいとき。文書のメタデータを設定・消去したいとき。添付ファイルを追加・取り出ししたいとき。
- AcroForm のフォームに入力したり内容を固定したりしたいとき。パスワードで暗号化・解除したいとき。
- スキャンした画像だけの PDF には使いません（`references/ocr-extraction.md` を使ってください）。HTML を見た目そのままに PDF 化する用途にも使いません（ヘッドレスブラウザーを使ってください）。

## 事前に必要なもの {#prerequisites}

- Python 3.10 以上と `pypdf`・`reportlab`・`pdfplumber`:
  `python -m pip install pypdf reportlab pdfplumber`
- ページを画像にする処理（`pdf_page_image.py`、重ね合わせ画像の書き出し）には、任意で `python -m pip install pypdfium2` を入れるか、poppler の `pdftoppm` を PATH に通しておきます。スクリプトは pypdfium2 → pdftoppm の順に切り替え、どちらも無いときは `{"rendered": false, "missing": [...]}` を表示して終了コード 0 で終わります。
- 補助スクリプトはそれぞれ、必要になった時点で読み込みを確かめ、足りないものがあれば導入の案内を表示します。

## 実行のしかた {#how-to-run}

補助スクリプトはすべて `scripts/` にあり、argparse のコマンドとして作られています。`terminal` ツールから実行してください。どれも `--help` に対応します。JSON の読み書きは必ず UTF-8 で行い、結果は JSON として標準出力に表示し、失敗すると 0 以外の終了コードを返します。

```bash
python scripts/pdf_create.py spec.json -o out.pdf         # build PDF from JSON spec
python scripts/pdf_make_form.py formspec.json -o form.pdf # build fillable AcroForm from JSON spec
python scripts/pdf_form_layout.py formspec.json           # lint form layout BEFORE building
python scripts/pdf_form_layout.py formspec.json --render-overlay boxes.png [--pdf form.pdf]
python scripts/pdf_read.py doc.pdf --text                 # per-page text (JSON)
python scripts/pdf_read.py doc.pdf --tables --csv-dir t/  # tables to JSON + CSV files
python scripts/pdf_read.py doc.pdf --meta                 # metadata, page sizes, encrypted/scanned flags
python scripts/pdf_read.py form.pdf --fields              # form fields: name, type, value
python scripts/pdf_merge.py a.pdf b.pdf -o merged.pdf [--bookmarks]
python scripts/pdf_split.py doc.pdf --pages 1-3,7 -o part.pdf [--rotate 90]
python scripts/pdf_fill_form.py form.pdf --fields-json values.json -o filled.pdf [--flatten]
python scripts/pdf_secure.py doc.pdf --encrypt -o enc.pdf --user-password your-password
python scripts/pdf_secure.py enc.pdf --decrypt -o dec.pdf --password your-password
python scripts/pdf_watermark.py doc.pdf --stamp mark.pdf -o stamped.pdf [--under]
python scripts/pdf_stamp.py doc.pdf -o out.pdf --text "DRAFT" --x 150 --y 400 \
    --font-size 60 --rotation 45 --opacity 0.3 --color "#cc0000" [--pages 1-3]
python scripts/pdf_stamp.py doc.pdf -o out.pdf --image sig.png --x 400 --y 60 --width 120
python scripts/pdf_page_image.py doc.pdf --pages 1-3 --dpi 150 --out-dir imgs/
python scripts/pdf_meta.py doc.pdf --set-meta --title "T" --author "A" -o out.pdf
python scripts/pdf_meta.py doc.pdf --attach data.csv -o out.pdf
python scripts/pdf_meta.py doc.pdf --list-attachments | --extract-attachments dir/
```

## 早見表 {#quick-reference}

| やりたいこと | ツール | コマンド / API |
|---|---|---|
| 文書を作る（見出し・表・画像） | reportlab platypus | `pdf_create.py spec.json -o out.pdf` |
| 入力できるフォームを組み立てる | reportlab acroForm | `pdf_make_form.py formspec.json -o form.pdf` |
| フォームの配置を点検する / 重ね合わせ画像 | pure python + PIL | `pdf_form_layout.py formspec.json [--render-overlay o.png]` |
| ページごとの本文 | pdfplumber | `pdf_read.py f.pdf --text` |
| 表を JSON/CSV に | pdfplumber | `pdf_read.py f.pdf --tables` |
| メタデータ / 用紙サイズ / 暗号化 / スキャン判定 | pypdf + pdfplumber | `pdf_read.py f.pdf --meta` |
| 結合（しおり付き） | pypdf | `pdf_merge.py a.pdf b.pdf -o m.pdf` |
| 分割 / 抜き出し / 回転 | pypdf | `pdf_split.py f.pdf --pages 2-5 --rotate 90` |
| フォームの一覧 / 入力 / 固定 | pypdf | `pdf_read.py --fields`, `pdf_fill_form.py` |
| 暗号化 / 解除（AES-256） | pypdf | `pdf_secure.py --encrypt/--decrypt` |
| PDF のページに透かし / スタンプ | pypdf | `pdf_watermark.py f.pdf --stamp w.pdf` |
| 座標を指定して文字や画像をスタンプ | reportlab + pypdf | `pdf_stamp.py f.pdf --text "Sign here" --x 400 --y 60` |
| ページを PNG に（確認 / OCR への受け渡し） | pypdfium2 or pdftoppm | `pdf_page_image.py f.pdf --pages 1-3 --out-dir imgs/` |
| メタデータの設定・消去、添付ファイル | pypdf | `pdf_meta.py --set-meta / --attach / --extract-attachments` |
| 内容の流れを圧縮 | pypdf | `pdf_split.py f.pdf --pages 1-N --compress` |

## 手順 {#procedure}

1. **まず中身を見ます。** `pdf_read.py file.pdf --meta` を実行します。`encrypted` を確認し（true なら先に `pdf_secure.py --decrypt` で解除します）、`likely_scanned_pages` も見ます。ページが画像だけなら `pdf_page_image.py --pages <scanned> --dpi 300 --out-dir imgs/` で書き出し、その PNG を `references/ocr-extraction.md` の skill に引き継ぎます。本文が空だったことを「中身なし」と報告してはいけません。
2. **作ります。** `write_file` で JSON の指定を書き（使える要素は `heading`・`paragraph`・`table`・`image`・`pagebreak`。`title`/`author` のメタデータは任意で、ページ番号は自動で付きます）、`pdf_create.py` を実行します。配置が重要なら、書き出したページの画像を `vision_analyze` で見て確かめます。
3. **取り出します。** `--text` はページごとの文字列を JSON の一覧で返し、`--tables` はページごとの行の配列を返すほか、CSV ファイルとしても書き出せます。結果は `read_file` で読んでください。バイナリの PDF をそのまま目で見ようとしないでください。
4. **加工します。** `pdf_merge.py` は順につなぎ、元ファイルごとにしおりを 1 つ付けられます。`pdf_split.py` はページ範囲（1 から数えます。例: `1-3,5,9-`）、90 度きざみの回転、`--compress` に対応します。透かしは、1 ページのスタンプ用 PDF を用意し（たとえば `pdf_create.py` で作ります）、`pdf_watermark.py` で重ねます。「ここに署名」「斜めの DRAFT」「隅のラベル」といった一発もののスタンプには、座標をはっきり指定して `pdf_stamp.py` に文字か画像を渡します。
5. **フォームを組み立てます。** フォームの指定を JSON で 1 つ書き（各欄の `label_box`/`entry_box` は PDF のポイント単位で指定します。`references/forms.md` を見てください）、`pdf_form_layout.py` で点検して報告された問題をすべて直し、必要なら `--render-overlay` の PNG を `vision_analyze` で確認してから、`pdf_make_form.py` で組み立て、`pdf_read.py --fields` で確かめます。
6. **フォームに入力します。** `--fields` で欄の正確な名前と種類を調べ、`{"FieldName": "value"}` の形の JSON を UTF-8 で `write_file` を使って書き（チェックボックスは `true`/`false`、ラジオボタンや選択肢の値は欄の書き出し用の選択肢と一致させます）、`pdf_fill_form.py` を実行します。もう一度 `--fields` で読み直し、値が入ったことを確かめてください。
7. **メタデータと添付ファイル。** `pdf_meta.py --set-meta` はタイトル・作者・件名・キーワード（DocInfo）を書き込み、`--clear-meta` はそれらを消します。`--attach`/`--list-attachments`/`--extract-attachments` で、埋め込んだファイルを追加・一覧・取り出しできます。
8. **保護します。** 利用者用と所有者用に別々のパスワードを設定し、AES-256 で暗号化します。分かっているパスワードを外したいときは、`--decrypt` で暗号化なしの複製を書き出します。
9. 成功と報告する前に、**確認**（下記）を行います。

## つまずきやすいところ {#pitfalls}

- **スキャンした PDF**: `extract_text()` が空で、ページに画像がある場合は、文字の層がありません。`references/ocr-extraction.md` に回してください。文字をでっち上げてはいけません。
- **内容固定の限界**: `pdf_fill_form.py --flatten` は pypdf の固定機能を使い、入力欄の見た目をページの内容に変換します。ふつうのテキスト欄やチェックボックスでは確実に動きますが、変わった部品（リッチテキスト、独自の見た目の定義、一部のラジオボタン群）は消えたり崩れたりすることがあります。固定後の結果は `vision_analyze` で目視で確かめてください。確実に固定したいときは、外部の描画ツール（Ghostscript や `pdftoppm`+組み直しなど）を代わりに使ってください。
- **NeedAppearances**: 入力後、見た目の定義がないと値を表示しない閲覧ソフトがあります。入力用スクリプトは AcroForm の `NeedAppearances` フラグを立てるので、仕様に沿った閲覧ソフトなら見た目を作り直します。ただし機能の少ない閲覧ソフトはこれを無視します。表示の正確さが大事なら固定してください。
- **ラテン文字以外のフォームの値**: 値そのものは（UTF-16 で）正しく保存されますが、欄の既定フォントに字形がないことがあり、データは往復できているのに閲覧ソフトでは空白に見える場合があります。見た目ではなく `--fields` で確かめてください。
- **圧縮の効き方**: `--compress` は内容の流れを縮めるだけです。減るのはふつう 0〜20% 程度で、画像が主体の PDF やすでに圧縮済みのものにはほとんど効きません。画像の解像度を落とす処理（Ghostscript の領分）の代わりにはなりません。
- **権限のフラグは強制力を持ちません**: 所有者パスワードによる権限のビット（印刷不可、コピー不可）は閲覧ソフトへのお願いにすぎず、pypdf を含むどのライブラリーからも読めて外せます。中身を実際に守るのは利用者パスワードによる暗号化だけです。権限のフラグを安全対策として説明しないでください。
- **表の取り出しは推測です**: pdfplumber は罫線や単語の並びから表を見つけます。罫線のない表やセルを結合した表では、`table_settings` の調整や手直しが必要になることがあります。
- **ページ番号の数え方**: 補助コマンドはページを 1 から数えますが、pypdf の API は 0 から数えます。スクリプト側で変換しているので、二重に変換しないでください。
- **回転したスタンプの文字取り出し**: pdfplumber は行のまとめ方の都合で、回転した字形を並べ替えてしまいます（45 度の "DRAFT" はばらばらの文字として取り出されます）。回転したスタンプは、代わりに `pypdf` の `extract_text()` か、書き出した画像で確かめてください。
- **ラジオボタン群**: reportlab は 1 つの群に `radio()` の部品が 2 つ以上必要で、入力にはスラッシュ付きの書き出し用の値（`"/red"`）を渡します。固定したときの再現性もラジオボタンがいちばん低いです。`references/forms.md` を見てください。
- **メタデータの範囲**: `pdf_meta.py` が書くのは昔ながらの DocInfo の辞書だけです。埋め込まれた XMP のメタデータ（あれば）はそのまま残るので、閲覧ソフトによっては違う値が表示されることがあります。
- **PDF/A は対象外です**: pypdf と reportlab では、規格に沿った PDF/A を作ることも検証することもできません。保存用の規格適合が必要なら、`terminal` ツールから Ghostscript を実行し（たとえば `gs -dPDFA=2 -dPDFACompatibilityPolicy=1 -sColorConversionStrategy=UseDeviceIndependentColor -sDEVICE=pdfwrite -o out.pdf in.pdf` に適切な ICC プロファイルを添えます）、veraPDF で検証してください。どちらも別途の導入が必要で、結果は思い込みで済ませず必ず検証してください。
- 回転は 90 の倍数にしてください。暗号化された入力は、ほかの操作の前に解除する必要があります。

## 確認 {#verification}

- 作成・結合・分割のあと: `pdf_read.py out.pdf --meta` で `page_count` を確かめ、回転させたならページごとの `rotation` も見ます。
- 取り出しのあと: JSON が空でないことを確かめ、分かっている文字列やセルをいくつか抜き取って照合します。
- フォーム設計の繰り返し: `pdf_form_layout.py spec.json` が終了コード 0 で終わることを確かめ、次に `--render-overlay boxes.png --pdf form.pdf` を実行して、その PNG を `vision_analyze` で確認します（赤は欄の名前が付いた入力枠、青はラベルの枠です）。重なり・ずれ・ラベルが対応する欄から離れていないかを尋ねてください。指定 → 点検 → 重ね合わせ、をきれいになるまで繰り返します。
- フォームを組み立てたあと: `pdf_read.py form.pdf --fields` に、指定したすべての欄が正しい種類と選択肢で並びます。
- フォーム入力のあと: `pdf_read.py filled.pdf --fields` で値を比べます（ASCII 以外も含め、完全に一致するか確かめます）。
- スタンプのあと: 本文をもう一度取り出すか（回転したスタンプは pypdf で）、`pdf_page_image.py` でページを書き出して `vision_analyze` で見ます。
- メタデータや添付ファイルを編集したあと: `pdf_read.py --meta` / `pdf_meta.py --list-attachments` を実行し、添付ファイルを取り出してバイト単位で比べます。
- 暗号化のあと: `--meta` に `"encrypted": true` と表示され、パスワードなしでは開けないことを確かめます。解除のあとは、取り出した本文が元と一致することを確かめます。
- 見た目に関わるもの（透かし、固定したフォーム）は、書き出して `vision_analyze` で確かめてください。
