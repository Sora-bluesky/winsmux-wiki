---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "Microsoft Office — Word・PowerPoint・Excel ファイルを作成・読み取り・編集する"
description: "Word・PowerPoint・Excel ファイルを作成・読み取り・編集します"
upstream_path: user-guide/skills/bundled/productivity/productivity-microsoft-office.md
upstream_blob: b9a6dd6cdf39bca0cddd12b4670218598c289c7c
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/productivity/productivity-microsoft-office
---

# Microsoft Office {#microsoft-office}

Word・PowerPoint・Excel ファイルを作成・読み取り・編集します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/productivity/microsoft-office` |
| バージョン | `2.0.0` |
| 作者 | Nous Research |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `office`, `word`, `docx`, `powerpoint`, `pptx`, `excel`, `xlsx`, `csv`, `documents`, `slides`, `spreadsheets` |
| 関連 skill | [`pdf`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-pdf/) |

## 一覧: SKILL.md の全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効な間、エージェントはこれを指示として受け取ります。
:::

# Microsoft Office Skill {#microsoft-office-skill}

python-docx、python-pptx、openpyxl をもとにした小さな Python CLI を使い、Word（`.docx`）、PowerPoint（`.pptx`）、
Excel（`.xlsx`、`.csv`）のファイルをオフラインで作成・読み取り・編集し、
テンプレートから生成します。Office 本体は一切不要です。
古いバイナリ形式（`.doc`、`.ppt`、`.xls`）は開けません。また、LibreOffice がなければ
ページの描画もできません。

## 使う場面 {#when-to-use}

まず形式を決め、作業の前にその形式の参照ファイルを `skill_view` で読んでください。

| ファイル | 参照ファイル | よくある依頼 |
| --- | --- | --- |
| `.docx` | `references/word.md` | 報告書、手紙、契約書、`{{token}}` テンプレート、変更履歴、コメント |
| `.pptx` | `references/powerpoint.md` | 提案用スライド、ブランドテンプレートのスライド、グラフの更新、発表者ノート、スライドの PNG |
| `.xlsx`, `.csv` | `references/excel.md` | 書式付きの複数シートのブック、数式、グラフ、CSV 変換、行・列の組み替え |

さらに詳しい補足は `references/revisions-and-comments.md`（Word の校閲記号）と
`references/restructuring.md`（Excel のセル参照のずれ）にあります。

- `.doc`/`.ppt`/`.xls` には使えません。LibreOffice が入っていれば、先に
  `soffice --headless --convert-to docx|pptx|xlsx old-file` で変換してください。
- `.odt`/`.odp`/`.ods` や、見たまま編集（WYSIWYG）でのレイアウト作業にも向きません。

## 前提条件 {#prerequisites}

- `python-docx`、`python-pptx`、`openpyxl` が入った Python 3.10 以上（import 名は
  `docx`、`pptx`、`openpyxl`）。
- 使うインタープリターは `terminal` で決めます。すでにこれらのライブラリを import できるなら
  `python` を使います（Hermes の Docker イメージには同梱されています）。そうでなく、`hermes`
  が PATH にある場合は、Hermes のホーム配下に、共有でバージョン固定のドキュメント用環境を
  Hermes に作らせます。この環境はコンテナを再起動しても残り、Hermes のインストール自体には
  一切手を触れず、複数のエージェントから同時に実行しても安全です。hermes コマンドが
  ない場合（ターミナルが Docker サンドボックス内で動いていて Hermes がない場合）は、下のブロックが
  サンドボックスのホームに同じ固定バージョンで venv を作ります。すべてのドキュメント系 skill が
  同じ環境を共有できるよう、どの skill でもこのブロックをそのまま使ってください。

  ```bash
  python -c "import docx, pptx, openpyxl" 2>/dev/null && PY=python || if command -v hermes >/dev/null 2>&1; then
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
  "$PY" scripts/docx_create.py --help
  ```

  補助スクリプトはすべて `"$PY"` で実行してください。PowerShell の場合（Hermes はそのホスト上で動くので、
  hermes コマンドは PATH にあります）は次のようにします。
  `$env:PY = hermes pm environment documents --extra documents --extra documents-pdf`
  Hermes を動かしているインタープリターや、`hermes pm environment` の
  インタープリターには、絶対に `pip install` しないでください。どちらも Hermes が管理しています。
- 任意: PDF 書き出し、Excel の再計算、スライドの描画には LibreOffice（`soffice`）、
  スライドの PNG 化にはさらに poppler（`pdftoppm` または `pdftocairo`）が必要です。
  これらを必要とする補助スクリプトは、足りないものを報告して終了コード 0 で終わります。

## 実行方法 {#how-to-run}

補助スクリプトはすべて `scripts/` にあり、`--help` 付きの argparse CLI で、
結果を JSON で標準出力に出し、失敗すると 0 以外の終了コードで終わります。skill のディレクトリから
`terminal` で実行してください。JSON の指定ファイルは `write_file` で書き、結果は
`read_file` で読むか、標準出力から直接受け取ります。

```bash
"$PY" scripts/docx_create.py spec.json out.docx
"$PY" scripts/pptx_create.py deck.json out.pptx
"$PY" scripts/xlsx_create.py spec.json report.xlsx
```

## 早見表 {#quick-reference}

| 作業 | Word | PowerPoint | Excel |
| --- | --- | --- | --- |
| JSON の指定から作成 | `docx_create.py` | `pptx_create.py` | `xlsx_create.py`, `csv_to_xlsx.py` |
| 読み戻し | `docx_read.py --text/--structure` | `pptx_read.py --outline` | `xlsx_read.py --sheets/--json` |
| 編集 | `docx_edit.py` | `pptx_edit.py` | `xlsx_edit.py`, `xlsx_restructure.py` |
| テンプレートへの差し込み | `docx_template.py` | `pptx_from_template.py` | — |
| 確認・チェック | `docx_revisions.py`, `docx_comments.py`, `docx_validate.py` | `pptx_render.py`（スライドの PNG） | `xlsx_recalc.py`, `xlsx_to_csv.py` |

フラグの一覧表は、形式ごとの参照ファイルにすべて載っています。

## 手順 {#procedure}

1. ファイルの拡張子や依頼内容から形式を見極め、その形式の参照ファイルを読み込みます
   （`skill_view` で `file_path=references/<format>.md` を指定）。
2. 前提条件のブロックで、セッションごとに一度 `PY` を設定します。
3. その形式の補助スクリプトで作成・編集・読み取りを行います。補助スクリプトが出力先の指定に
   対応している場合は、元のファイルを残すために必ず出力先のパスを渡してください。
4. 参照ファイルの「検証」セクションに従って結果を確かめ、ユーザーに
   出力ファイルの正確なパスを伝えます。

## PDF への変換 {#converting-to-pdf}

LibreOffice が入っていれば、画面なし（headless）で変換できます。

```bash
soffice --headless --convert-to pdf --outdir out/ file.docx   # also .pptx, .xlsx
soffice --headless --convert-to csv --outdir out/ report.xlsx # first sheet only
```

まず `command -v soffice || command -v libreoffice` で確認してください。ホストにないフォントは
代わりのフォントに置き換えられるので、スライドは渡す前に描画して確認しましょう。これらの形式は
どれも、Python だけで PDF にする方法はありません。`soffice` がない場合は、
それらしいもので済ませず、ないと伝えてください。最初のシート以外を CSV にするには
`xlsx_to_csv.py --sheet NAME` を使います。

## 落とし穴 {#pitfalls}

- **zip を展開して XML を直接編集しないでください。** これらのファイルは zip パッケージで、
  テキストをそのまま置き換えると壊れます。編集は補助スクリプト（またはライブラリ）を通して行い、
  `patch`/`write_file` は JSON の入力ファイルにだけ使ってください。
- **テキストは「ラン」に分割されています。** Word や PowerPoint は、編集した境目でテキストを細切れにします。
  置換用の補助スクリプトは同じ書式のランを先にまとめますが、書式の異なるランにまたがって一致した場合は、
  最初のランの書式が使われます。
- **フィールドや数式は計算されません。** Word の目次やページ番号のフィールド、Excel の
  数式は、Office アプリで開いたとき（または `xlsx_recalc.py` を実行したとき）に値が入ります。
- **文字コード。** 指定ファイルは UTF-8 で書いてください。補助スクリプトは明示的に UTF-8 として読み込みます。
- 形式ごとの落とし穴は、それぞれの参照ファイルにあります。

## 検証 {#verification}

- 出力ファイルはすべて、その形式の読み取り用補助スクリプトで読み直し、期待した
  内容が入っていて、古い内容が消えていることを確かめます。
- Word: 変更履歴・コメント・フィールドに手を入れた後は、`docx_validate.py out.docx` が終了コード 0 で
  終わることを確認します。
- PowerPoint: 描画用のツールがあれば、`pptx_render.py` で描画し、各 PNG を
  `vision_analyze` で確認します。
- Excel: `xlsx_read.py --formulas` で書き込んだ数式の一覧が出ます。キャッシュされた値が重要な場合は
  `xlsx_recalc.py` を実行してください。
- 同梱のテストが、守るべき動作の完全な基準です。
  `"$PY" -m pytest tests/ -q`（そのインタープリターに pytest が必要です）。
