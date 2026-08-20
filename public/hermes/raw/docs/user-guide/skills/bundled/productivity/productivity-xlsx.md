---
title: "Xlsx — Excel の .xlsx ブックと CSV を作る・読む・直す"
description: "Excel の .xlsx ブックと CSV を作る・読む・直す"
upstream_path: user-guide/skills/bundled/productivity/productivity-xlsx.md
upstream_blob: 7315c346ec252b23a5fe3428407d0b9cfbbc31a3
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/productivity/productivity-xlsx
---

# Xlsx {#xlsx}

Excel の .xlsx ブックと CSV を作り、読み、直します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/productivity/xlsx` |
| バージョン | `1.0.0` |
| 作者 | Nous Research |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `excel`, `spreadsheet`, `xlsx`, `csv`, `openpyxl`, `productivity` |
| 関連 skill | [`docx`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-docx/), [`pdf`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-pdf/), [`powerpoint`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-powerpoint/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Xlsx Skill {#xlsx-skill}

Python と openpyxl を使って Excel の .xlsx ブックを扱います。数式や
グラフを含む、体裁の整った複数シートのブックを作り、既存のファイルの
中身を調べたり書き出したりし、セルや構造を直し、CSV との相互変換を
します。補助スクリプトはすべて argparse のコマンドで、JSON を表示し、
入出力は UTF-8 をはっきり指定して行います。

## こんなときに使います {#when-to-use}

- .xlsx の報告書を作るとき: 複数シート、数値の書式、体裁、
  セルの結合、ウィンドウ枠の固定、フィルター、条件付き書式、
  グラフ、入力規則のドロップダウン。
- ブックを読むとき: シートの一覧、データを JSON や CSV として
  書き出すこと、数式と計算済みの値の一覧。
- 既存のファイルを直すとき: セルの設定、行の追加、行や列の
  挿入と削除、シートの複製と名前の変更。
- 型の推測や UTF-8 以外の文字コードを含む、CSV とのやり取り。
- 古い .xls のバイナリー形式には使いません（先に LibreOffice で
  変換してください: `soffice --headless --convert-to xlsx old.xls`）。

## 事前に必要なもの {#prerequisites}

- Python 3.10 以上と `openpyxl`（`pip install openpyxl`）。ほかに
  外部のパッケージは要りません。あとはすべて標準ライブラリーです。
- 任意: 画面なしでの再計算や形式の変換のための LibreOffice
  （`soffice`）。

## 実行のしかた {#how-to-run}

補助スクリプトは、この skill の `scripts/` ディレクトリーから
`terminal` ツールで実行します（どのスクリプトも `--help` に対応します）:

```bash
python scripts/xlsx_create.py spec.json report.xlsx   # build from JSON spec
python scripts/xlsx_read.py report.xlsx --sheets      # inventory
python scripts/xlsx_read.py report.xlsx --json --sheet Data
python scripts/xlsx_read.py report.xlsx --formulas
python scripts/xlsx_edit.py report.xlsx --sheet Data --set B2=42 --recalc
python scripts/csv_to_xlsx.py data.csv out.xlsx --encoding utf-8
python scripts/xlsx_to_csv.py report.xlsx out.csv --sheet Data
```

JSON の指定は `write_file` で書き、スクリプトが出す JSON は
`read_file` か標準出力からそのまま確かめてください。

## 早見表 {#quick-reference}

| やりたいこと | コマンド |
|---|---|
| 指定からブックを作る | `xlsx_create.py spec.json out.xlsx` |
| シート名と大きさ | `xlsx_read.py f.xlsx --sheets` |
| シートを JSON で書き出す | `xlsx_read.py f.xlsx --json --sheet S` |
| シートを CSV で書き出す | `xlsx_read.py f.xlsx --csv --out d.csv` |
| 数式と計算済みの値を並べる | `xlsx_read.py f.xlsx --formulas` |
| セルや数式を設定する | `xlsx_edit.py f.xlsx --set "A1==SUM(B:B)"` |
| 行を追加する | `xlsx_edit.py f.xlsx --append '[1,"x",true]'` |
| 3 行目の前に 2 行挿入する | `xlsx_edit.py f.xlsx --insert-rows 3:2` |
| シートを複製 / 名前を変更 | `--copy-sheet Src:New --rename-sheet Old:New` |
| 開いたときに再計算させる | `xlsx_edit.py f.xlsx --recalc` |
| CSV から体裁付きの xlsx へ | `csv_to_xlsx.py in.csv out.xlsx` |
| xlsx から CSV へ | `xlsx_to_csv.py f.xlsx out.csv --encoding utf-8` |

## 手順 {#procedure}

1. **作ります**: JSON の指定を書きます（形式は
   `xlsx_create.py --help` とその説明文に書いてあります）。シートごとに
   `rows`（数や文字、または体裁を付けたセルの指定）、抜き差しで
   上書きする `cells`、`column_widths`、`row_heights`、`merges`、
   `freeze_panes`、`autofilter`、`conditional_formats`（cell_is の
   条件とカラースケール）、`charts`（セル範囲からの棒・折れ線・円）、
   `validations`（ドロップダウン）を指定できます。型のある値は、
   JSON の数値と真偽値がそのまま通り、日付は
   `{"value": "2026-01-31", "type": "date"}` の形にします。
   数値の書式は Excel の書式文字列です。通貨は `"$#,##0.00"`、
   百分率は `"0.0%"`、日付は `"yyyy-mm-dd"` のように書きます。
2. **数式**: 指定の中で `"formula": "SUM(B2:B9)"`、または編集時に
   `--set "C1==SUM(A:A)"` で設定します。数式を書くときは、指定に
   `"full_calc_on_load": true` を足すか、編集時に `--recalc` を
   付けてください。これでブックの `fullCalcOnLoad` フラグが立ち、
   Excel や LibreOffice が開いたときにすべて計算し直します。
   openpyxl 自体は数式を決して計算しません。
3. **読みます**: 一覧（名前、大きさ、結合された範囲、グラフの数）は
   `--sheets`、データは `--json`/`--csv`、数式の文字列と計算済みの
   結果を並べて見るには `--formulas` を使います。計算済みの結果は、
   そのファイルを最後に本物の表計算ソフトが保存したときだけ入って
   います。openpyxl で作ったばかりのファイルでは `null` が返ります。
   画面なしで結果を出したいときは、
   `soffice --headless --convert-to xlsx file.xlsx` を実行してから
   `--data-only` で読み直してください。
4. **直します**: `xlsx_edit.py` は、名前の変更と複製を先に行い、次に
   行や列の構造の変更、最後に `--set`/`--append` を行います。`--out` を
   指定しない限りその場で書き換えるので、元のファイルが必要なら
   先にコピーしてください。
5. **CSV とのやり取り**: `csv_to_xlsx.py` はセルごとに整数・小数・
   真偽値・ISO 形式の日付を推測し、見出しの行に体裁を付けます。
   `xlsx_to_csv.py` は ISO 形式の日付を書き、空のセルは空文字にします。
   どちらも既定は UTF-8 で、`--encoding` を受け付けます（Excel と
   相性のよい BOM 付きなら `utf-8-sig`、古い Windows の書き出しなら
   `cp1252` など）。

## つまずきやすいところ {#pitfalls}

- **openpyxl は計算しません。** 数式の結果を取れるのは
  `load_workbook(path, data_only=True)` を使ったときだけで、しかも
  そのファイルを以前に Excel か LibreOffice が保存していた場合に
  限られます。そうでなければ `None` が返ります。
- **挿入と削除では参照がずれません。** `insert_rows` や
  `delete_cols` などはセルの値を動かしますが、結合したセルの範囲、
  数式の参照、グラフの位置、条件付き書式の範囲は更新しません。
  結合や数式のあるシートで構造を変えたあとは、`--sheets` と
  `--formulas` で見直して手で直してください。
- **`data_only=True` で読んでから保存すると**、数式がすべて何も
  言わずに消えます（計算済みの値に置き換わります）。それが目的で
  ない限り、そうやって読んだブックを保存してはいけません。
- **読み込むとグラフや画像が落ちます**: openpyxl はグラフを
  そのまま往復させられないので、グラフのあるブックを直して保存すると
  グラフが消えます。直したあとにグラフを付け直すか、グラフのある
  ファイルを保存し直さないようにしてください。
- **CSV の地域差の罠**: 文字コードは必ずはっきり渡してください
  （スクリプトはすでにそうしています）。ヨーロッパの CSV は区切りに
  `;` を使い、小数点にコンマを使うことがよくあります。
  `--delimiter ';'` を使い、`"12,5"` のような値は文字列のままに
  なると思っておいてください。
- **日付は日時になります**: Excel は日付を連番で保存し、openpyxl は
  `datetime`/`date` のオブジェクトを返します。ここでの書き出しは
  ISO 形式の文字列にします。
- シート名は 31 文字までで、`[ ] : * ? / \` は使えません。

## 確認 {#verification}

- 作ったあと: `xlsx_read.py out.xlsx --sheets` を実行し、シート名・
  大きさ・結合された範囲・グラフの数が意図どおりか確かめます。
- `--json` でデータを書き出し、元の値と比べます。
- 直したあと: 触った範囲をもう一度書き出します。数式を書いたなら、
  `--formulas` に並ぶことと `--recalc` を付けたことを確かめます。
- 見た目までしっかり確かめたいときは LibreOffice で開きます:
  `soffice --headless --convert-to pdf out.xlsx` を実行し、その PDF を
  見てください。
