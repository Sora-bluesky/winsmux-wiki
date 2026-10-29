---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "Pdf — PDF ファイルの作成・読み取り・結合・フォーム入力・OCR・テキスト編集"
description: "PDF ファイルの作成・読み取り・結合・フォーム入力・OCR・テキスト編集"
upstream_path: user-guide/skills/bundled/productivity/productivity-pdf.md
upstream_blob: 330f50718f947e37f5eddf5108c2eb019cbeb3f8
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/productivity/productivity-pdf
---

# Pdf {#pdf}

PDF ファイルの作成、読み取り、結合、フォーム入力、OCR、テキスト編集を行います。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/productivity/pdf` |
| バージョン | `1.1.0` |
| 作者 | Nous Research |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `pdf`, `documents`, `forms`, `ocr`, `text-extraction`, `reportlab`, `pypdf`, `pdfplumber`, `pymupdf`, `marker` |
| 関連 skill | [`microsoft-office`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-microsoft-office/) |

## 一覧: SKILL.md の全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効な間、エージェントはこれを指示として受け取ります。
:::

# PDF Skill {#pdf-skill}

構造化された仕様から PDF を作成する、入力できる AcroForm フォームを作って記入する（レイアウトの lint と、配置を確かめるためのオーバーレイ画像つき）、テキスト・表・メタデータを抽出する、ページの結合・分割・回転・透かし・スタンプを行う、ページを画像として書き出す、メタデータと添付ファイルを管理する、暗号化・復号する、といった作業を pypdf、reportlab、pdfplumber で行います。この skill に取り込まれた 2 つの機能は references/ にまとめてあります（該当する作業の前に、対応するファイルを読んでください）:

- **スキャンした PDF や画像だけの PDF、および OCR**（高速に処理する pymupdf と、品質を重視する marker-pdf の 2 通り。scripts/extract_pymupdf.py と scripts/extract_marker.py を使用）: `references/ocr-extraction.md`
- **既存の PDF 内のテキストを、自然な文章での指示で編集する**（nano-pdf CLI）: `references/nano-pdf-editing.md`

## 使う場面 {#when-to-use}

- レポートや請求書、複数ページの文書を PDF として作成したいとき。
- JSON の仕様から、入力できる AcroForm（テキスト・チェックボックス・ラジオボタン・ドロップダウン）を作りたいとき。作る前にレイアウトを lint します。
- PDF からテキスト、表（JSON/CSV）、メタデータ、フォームフィールドの値を取り出したいとき。
- PDF の結合、分割、回転、一部ページの抽出、透かし、指定座標へのテキストや画像のスタンプ、しおりの追加、圧縮を行いたいとき。
- 目で確認するためや OCR に渡すためにページを PNG として書き出したいとき、文書のメタデータを設定・消去したいとき、ファイルを添付・取り出したいとき。
- AcroForm フォームに記入したり、フラット化したりしたいとき。パスワードで暗号化・復号したいとき。
- スキャンした PDF や画像だけの PDF には使いません（`references/ocr-extraction.md` を使ってください）。HTML をピクセル単位で正確に PDF 化する用途にも使いません（ヘッドレスブラウザを使ってください）。

## 前提条件 {#prerequisites}

- Python 3.10 以降と、`pypdf`、`reportlab`、`pdfplumber`。
- 使う Python インタープリターは `terminal` で決めます。`python` でこれらのライブラリをすでに読み込めるなら、それを使います（Hermes の Docker イメージには同梱されています）。読み込めない場合、`hermes` が PATH にあれば、Hermes のホームディレクトリ内に、文書処理用の共有環境（バージョン固定）を Hermes に作らせます。この環境はコンテナを再起動しても残り、Hermes 本体のインストールには一切手を触れず、複数のエージェントから同時に実行しても安全です。hermes コマンドが PATH にない場合（ターミナルが Hermes の入っていない Docker サンドボックスで動いている場合）は、下のブロックがサンドボックスのホームに、同じ固定バージョンで venv を作ります。すべての文書系 skill が 1 つの環境を共有できるよう、どの skill でもこのブロックをそのまま使ってください:

  ```bash
  python -c "import pypdf, reportlab, pdfplumber" 2>/dev/null && PY=python || if command -v hermes >/dev/null 2>&1; then
    PY="$(hermes pm environment documents --extra documents --extra documents-pdf)"
  else
    PY="$HOME/.cache/hermes-docs-venv/bin/python"
    "$PY" -c "import docx, openpyxl, pptx, reportlab, pypdf, pdfplumber, pypdfium2" 2>/dev/null || (
      # Safe to run from several agents at once: each caller builds a private venv,
      # a symlink publishes the first finished one atomically, the others delete theirs.
      mkdir -p "$HOME/.cache" && cd "$HOME/.cache" && stage="$(mktemp -d hermes-docs-venv.XXXXXX)" || exit 1
      old="$(readlink hermes-docs-venv)"  # an earlier build that no longer imports, if any
      python3 -m venv "$stage" &&
        "$stage/bin/python" -m pip install -q --disable-pip-version-check python-docx==1.2.0 openpyxl==3.1.5 python-pptx==1.0.2 reportlab==5.1.0 pypdf==6.21.2 pdfplumber==0.11.10 pypdfium2==5.14.0 &&
        "$stage/bin/python" -c "import docx, openpyxl, pptx, reportlab, pypdf, pdfplumber, pypdfium2" &&
        if [ -z "$old" ]; then python3 -c 'import os, sys; os.symlink(*sys.argv[1:])' "$stage" hermes-docs-venv
        elif [ "$(readlink hermes-docs-venv)" = "$old" ]; then
          ln -s "$stage" "$stage.lnk" && python3 -c 'import os, sys; os.replace(*sys.argv[1:])' "$stage.lnk" hermes-docs-venv &&
            case "$old" in hermes-docs-venv.??????) rm -rf "$old" ;; esac
        fi 2>/dev/null
      [ "$(readlink hermes-docs-venv)" = "$stage" ] || rm -rf "$stage" "$stage.lnk"
    )
  fi
  export PY
  "$PY" scripts/pdf_create.py --help
  ```

  以下の補助スクリプトは、すべて `"$PY"` で実行してください。PowerShell の場合は次のコマンドで設定します（Hermes はそのホスト上で動いているので、PATH に入っています）:
  `$env:PY = hermes pm environment documents --extra documents --extra documents-pdf`。
  Hermes を動かしているインタープリターや、`hermes pm environment` の環境には、決して `pip install` しないでください。どちらも Hermes が管理しています。
- ページのラスタライズ（`pdf_page_image.py` やオーバーレイの描画）には `pypdfium2` を使います。これは文書処理用の環境にすでに入っています（お使いの `python` に入っていない場合は、上のコマンドで `PY` をその環境に切り替えてください）。PATH 上にある poppler の `pdftoppm` も使えます。スクリプトは pypdfium2 → pdftoppm の順に試し、どちらもなければ `{"rendered": false, "missing": [...]}` を出力します（終了コードは 0）。
- 各補助スクリプトは、必要になった時点で import を確認し、依存関係が足りなければインストール方法を表示します。

## 実行方法 {#how-to-run}

補助スクリプトはすべて `scripts/` にあり、argparse で作られた CLI です。`terminal` ツールで実行してください。どのスクリプトも `--help` に対応しています。JSON の読み書きは必ず UTF-8 で行い、結果を JSON として標準出力に出し、失敗したときは 0 以外の終了コードで終わります。

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

| 作業 | ツール | コマンド / API |
|---|---|---|
| 文書の作成（見出し、表、画像） | reportlab platypus | `pdf_create.py spec.json -o out.pdf` |
| 入力できるフォームの作成 | reportlab acroForm | `pdf_make_form.py formspec.json -o form.pdf` |
| フォームレイアウトの lint / オーバーレイ画像 | pure python + PIL | `pdf_form_layout.py formspec.json [--render-overlay o.png]` |
| ページごとのテキスト | pdfplumber | `pdf_read.py f.pdf --text` |
| 表 → JSON/CSV | pdfplumber | `pdf_read.py f.pdf --tables` |
| メタデータ / ページサイズ / 暗号化の有無 / スキャンの有無 | pypdf + pdfplumber | `pdf_read.py f.pdf --meta` |
| 結合（+ しおり） | pypdf | `pdf_merge.py a.pdf b.pdf -o m.pdf` |
| 分割 / 抽出 / 回転 | pypdf | `pdf_split.py f.pdf --pages 2-5 --rotate 90` |
| フォームの一覧 / 記入 / フラット化 | pypdf | `pdf_read.py --fields`, `pdf_fill_form.py` |
| 暗号化 / 復号（AES-256） | pypdf | `pdf_secure.py --encrypt/--decrypt` |
| PDF ページの透かし / スタンプ | pypdf | `pdf_watermark.py f.pdf --stamp w.pdf` |
| 指定座標へのテキスト・画像のスタンプ | reportlab + pypdf | `pdf_stamp.py f.pdf --text "Sign here" --x 400 --y 60` |
| ページ → PNG（目視確認 / OCR への受け渡し） | pypdfium2 or pdftoppm | `pdf_page_image.py f.pdf --pages 1-3 --out-dir imgs/` |
| メタデータの設定・消去、添付ファイル | pypdf | `pdf_meta.py --set-meta / --attach / --extract-attachments` |
| コンテンツストリームの圧縮 | pypdf | `pdf_split.py f.pdf --pages 1-N --compress` |

## 手順 {#procedure}

1. **まず中身を調べます。** `pdf_read.py file.pdf --meta` を実行します。`encrypted` を確認し（true なら、先に `pdf_secure.py --decrypt` で復号します）、`likely_scanned_pages` も確認します。画像だけのページがあれば、`pdf_page_image.py --pages <scanned> --dpi 300 --out-dir imgs/` で書き出し、その PNG を `references/ocr-extraction.md` の skill に渡してください。テキストが空だったからといって「内容なし」と報告してはいけません。
2. **作成します。** `write_file` で JSON の仕様を書き（要素は `heading`、`paragraph`、`table`、`image`、`pagebreak`。メタデータの `title`/`author` は任意。ページ番号は自動で入ります）、`pdf_create.py` を実行します。レイアウトが重要な場合は、ページを画像に描画し、`vision_analyze` で見た目を確認してください。
3. **抽出します。** `--text` はページごとの文字列を JSON のリストで返します。`--tables` はページごとに行の配列を返し、CSV ファイルとして書き出すこともできます。結果は `read_file` で読んでください。バイナリの PDF を直接見て判断してはいけません。
4. **加工します。** `pdf_merge.py` はファイルをつなぎ合わせ、元ファイルごとにしおりを 1 つずつ追加することもできます。`pdf_split.py` はページ範囲の指定（1 始まり。例: `1-3,5,9-`）、90° 単位の回転、`--compress` を扱います。透かしを入れるには、1 ページだけのスタンプ用 PDF を用意し（`pdf_create.py` などで作成）、`pdf_watermark.py` で重ねます。ちょっとしたスタンプ（「sign here」、斜めの DRAFT、隅のラベルなど）なら、`pdf_stamp.py` でテキストや画像を座標指定して押せます。
5. **フォームを作ります。** フォーム仕様の JSON を 1 つ書き（各フィールドに PDF ポイント単位で `label_box`/`entry_box` を指定します。詳しくは `references/forms.md` を参照）、`pdf_form_layout.py` で lint して、指摘された問題をすべて直します。必要なら `--render-overlay` の PNG を `vision_analyze` で確認し、そのうえで `pdf_make_form.py` で作成し、`pdf_read.py --fields` で確かめます。
6. **フォームに記入します。** まずフィールドを一覧表示し（`--fields`）、正確な名前と種類を把握します。次に `write_file` で `{"FieldName": "value"}` 形式の UTF-8 の JSON を書き（チェックボックスには `true`/`false` が使えます。ラジオボタンや選択肢の値は、そのフィールドのエクスポート値と一致させる必要があります）、`pdf_fill_form.py` を実行します。最後に `--fields` で読み直し、値が入ったことを確認します。
7. **メタデータと添付ファイル。** `pdf_meta.py --set-meta` は Title/Author/Subject/Keywords（DocInfo）を書き込みます。`--clear-meta` はそれらを削除します。`--attach`/`--list-attachments`/`--extract-attachments` で、埋め込みファイルの追加・一覧・取り出しができます。
8. **保護します。** ユーザーパスワードとオーナーパスワードを別々にし、AES-256 で暗号化します。分かっているパスワードを外すには、`--decrypt` で暗号化されていないコピーを書き出します。
9. 成功を報告する前に、**確認** を行います（下記参照）。

## 注意点 {#pitfalls}

- **スキャンした PDF**: `extract_text()` が空で、ページが画像になっている場合は、テキストレイヤーがありません。`references/ocr-extraction.md` に回してください。テキストをでっち上げてはいけません。
- **フラット化の限界**: `pdf_fill_form.py --flatten` は pypdf のフラット化機能を使い、ウィジェットの見た目をページの内容に変換します。普通のテキストフィールドやチェックボックスなら確実ですが、特殊なウィジェット（リッチテキスト、独自の appearance stream、一部のラジオボタングループ）は消えたり正しく描画されなかったりすることがあります。フラット化した結果は `vision_analyze` で目視確認してください。確実にフラット化したい場合は、代わりの手段として外部のレンダラー（Ghostscript や、`pdftoppm` で画像化して組み直す方法など）を使ってください。
- **NeedAppearances**: 記入後、ビューアーが値を表示するのは appearance stream がある場合だけです。記入スクリプトは AcroForm の `NeedAppearances` フラグを立てるので、仕様に沿ったビューアーは見た目を作り直します。ただし、機能の少ないビューアーの中にはこれを無視するものがあります。表示の正確さが重要ならフラット化してください。
- **ラテン文字以外のフォームの値**: 値自体は正しく（UTF-16 で）保存されますが、フィールドの既定フォントにその文字のグリフがないことがあり、データは正しく保存・読み出しできていても、ビューアーでは空白に見える場合があります。見た目だけでなく、`--fields` で確認してください。
- **圧縮への期待値**: `--compress` はコンテンツストリームを deflate で圧縮するだけです。削減できるのは通常 0〜20% ほどで、画像が大半を占める PDF や、すでに圧縮済みのストリームには効果がありません。画像のダウンサンプリング（Ghostscript の領分）の代わりにはなりません。
- **権限フラグには強制力がありません**: オーナーパスワードによる権限ビット（印刷禁止、コピー禁止）は、ビューアーが尊重するかもしれない「お願い」にすぎず、どのライブラリでも（pypdf を含めて）読み取って外せます。暗号化によって実際に内容を守れるのは、ユーザーパスワードだけです。権限フラグをセキュリティ対策として説明してはいけません。
- **表の抽出は推定です**: pdfplumber は罫線や単語の並びから表を検出します。枠線のない表やセルを結合した表は、`table_settings` の調整や手作業での整理が必要になることがあります。
- **ページ番号の数え方**: 補助 CLI はページを 1 始まりで受け取り、pypdf の API は 0 始まりです。スクリプトが変換するので、二重に変換しないでください。
- **回転したスタンプのテキスト抽出**: pdfplumber の行のまとめ方では、回転した文字がばらばらになります（45° の「DRAFT」が、散らばった文字として抽出されます）。回転したスタンプは、`pypdf` の `extract_text()` か、描画した画像で確認してください。
- **ラジオボタングループ**: reportlab では 1 グループにつき 2 つ以上の `radio()` ウィジェットが必要で、記入にはスラッシュ付きのエクスポート値（`"/red"`）が必要です。また、フラット化の再現性が最も低いのもラジオボタンです。`references/forms.md` を参照してください。
- **メタデータの範囲**: `pdf_meta.py` が書き込むのは、従来の DocInfo 辞書だけです。埋め込みの XMP メタデータ（ある場合）はそのまま残るため、ビューアーによっては異なる値が表示されることがあります。
- **PDF/A は対象外です**: pypdf/reportlab では、規格に準拠した PDF/A の作成も検証もできません。長期保存向けの準拠が必要な場合は、`terminal` ツールで Ghostscript を実行し（例: 適切な ICC プロファイルを用意したうえで `gs -dPDFA=2 -dPDFACompatibilityPolicy=1 -sColorConversionStrategy=UseDeviceIndependentColor -sDEVICE=pdfwrite -o out.pdf in.pdf`）、veraPDF で検証してください。どちらも別途インストールが必要で、結果も準拠していると決めつけず、必ず検証する必要があります。
- 回転角は 90 の倍数でなければなりません。暗号化された入力ファイルは、ほかの操作の前に必ず復号してください。

## 確認 {#verification}

- 作成・結合・分割の後: `pdf_read.py out.pdf --meta` を実行し、`page_count` を確認します。回転した場合は、ページごとの `rotation` も確認します。
- 抽出の後: JSON が空でないことを確かめ、分かっている文字列やセルをいくつか抜き出して照合します。
- フォーム設計の繰り返し: `pdf_form_layout.py spec.json` が終了コード 0 で終わる必要があります。次に `--render-overlay boxes.png --pdf form.pdf` を実行し、その PNG を `vision_analyze` で確認します（赤 = フィールド名つきの入力欄、青 = ラベル欄）。重なり、位置のずれ、フィールドから離れてしまったラベルがないかを尋ねてください。問題がなくなるまで、仕様 → lint → オーバーレイを繰り返します。
- フォーム作成の後: `pdf_read.py form.pdf --fields` で、仕様のすべてのフィールドが正しい種類と選択肢で一覧に出ることを確かめます。
- フォーム記入の後: `pdf_read.py filled.pdf --fields` を実行し、値を比べます（ASCII 以外の文字も含めて完全一致すること）。
- スタンプの後: テキストを抽出し直す（回転したスタンプは pypdf で）か、`pdf_page_image.py` でページを描画して `vision_analyze` で確認します。
- メタデータや添付ファイルの編集後: `pdf_read.py --meta` / `pdf_meta.py --list-attachments` を実行し、添付ファイルを取り出し直してバイト単位で比較します。
- 暗号化の後: `--meta` に `"encrypted": true` と表示され、パスワードなしでは開けないことを確かめます。復号の後は、抽出したテキストが元のものと一致することを確かめます。
- 見た目に関わるもの（透かし、フラット化したフォーム）は、すべて描画して `vision_analyze` で確認します。
