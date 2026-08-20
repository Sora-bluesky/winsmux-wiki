---
title: "Powerpoint — python-pptx で .pptx のスライドを作る・読む・直す"
description: "python-pptx で .pptx のスライドを作る・読む・直す"
upstream_path: user-guide/skills/bundled/productivity/productivity-powerpoint.md
upstream_blob: fad7d26eaf086240ae1b1fd05b5f818c4acb8d1f
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/productivity/productivity-powerpoint
---

# Powerpoint {#powerpoint}

python-pptx で .pptx のスライドを作り、読み、直します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/productivity/powerpoint` |
| バージョン | `1.0.0` |
| 作者 | Nous Research |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `pptx`, `powerpoint`, `presentations`, `slides`, `office`, `python-pptx` |
| 関連 skill | [`docx`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-docx/), [`xlsx`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-xlsx/), [`pdf`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-pdf/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Powerpoint Skill {#powerpoint-skill}

python-pptx ライブラリーを使って、PowerPoint（.pptx）の資料を作り、
中身を調べ、直します。補助スクリプトは 4 本あり、JSON の指定からの
資料作成、構造を保った読み出し、その場での修正、ひな形をもとにした
社内書式の資料づくりをまかなえます。すべてオフラインで動き、
PowerPoint を入れておく必要はありません。

## こんなときに使います {#when-to-use}

- スライド資料・報告用の資料・提案資料を作ってほしいと頼まれたとき。
- 誰かから共有された .pptx から、本文・ノート・表・グラフのデータ・
  画像を取り出したいとき。
- 既存の資料を更新したいとき: 文字の差し替え、グラフのデータ更新、
  ロゴの入れ替え、スライドの削除や並べ替え。
- 会社のひな形 .pptx から、書式に沿った資料を作りたいとき。
- .ppt（古いバイナリー形式）には使いません。LibreOffice があるなら
  `soffice --convert-to pptx old.ppt` で先に変換してください。

## 事前に必要なもの {#prerequisites}

- Python 3.10 以上と `python-pptx`
  （`pip install python-pptx`）。Pillow は任意です（自分で画像の大きさを
  調べたいときだけ必要になります）。
- 任意: スライドを画像にして見た目を確かめるための LibreOffice
  （`soffice`）。なくても支障ないようにしてあります。作成・読み出し・
  修正はどれも、これなしで動きます。
- 使えるかどうかは `terminal` で確かめます:
  `python3 -c "import pptx; print(pptx.__version__)"` と `which soffice`。

## 実行のしかた {#how-to-run}

スクリプトはすべて `scripts/` にあり、`--help` に対応し、JSON を標準出力に
表示し、失敗すると 0 以外の終了コードを返します。`terminal` から実行します:

```bash
python3 scripts/pptx_create.py deck.json out.pptx
python3 scripts/pptx_read.py deck.pptx --outline      # full JSON outline
python3 scripts/pptx_read.py deck.pptx --notes        # speaker notes
python3 scripts/pptx_read.py deck.pptx --images ./img # export pictures
python3 scripts/pptx_edit.py deck.pptx --replace-text "Old Corp" "New Corp"
python3 scripts/pptx_edit.py deck.pptx --chart-data update.json
python3 scripts/pptx_edit.py deck.pptx --remove-slide 3 --move-slide 2 0
python3 scripts/pptx_from_template.py brand.pptx out.pptx --values vals.json
```

JSON の指定は `write_file` で書き、スクリプトの出力や作られた
JSON は `read_file` で確かめてください。

## 早見表 {#quick-reference}

| やりたいこと | コマンド |
|---|---|
| 指定から新しい資料を作る | `pptx_create.py spec.json out.pptx` |
| 16:9 か 4:3 か | 指定の中で `"slide_size": "16:9"` または `"4:3"` |
| 構成を JSON で見る | `pptx_read.py deck.pptx --outline` |
| 画像を書き出す | `pptx_read.py deck.pptx --images DIR` |
| 文字を置き換える | `pptx_edit.py deck.pptx --replace-text OLD NEW` |
| グラフを更新する | `pptx_edit.py deck.pptx --chart-data spec.json` |
| 画像を入れ替える | `pptx_edit.py deck.pptx --swap-image N NAME new.png` |
| スライドを削除する | `pptx_edit.py deck.pptx --remove-slide N` |
| スライドを並べ替える | `pptx_edit.py deck.pptx --move-slide FROM TO` |
| ひな形を埋める | `pptx_from_template.py tpl.pptx out.pptx --values v.json` |

## 手順 {#procedure}

### 1. 資料を作る {#1-create-a-deck}

JSON の指定を書いてから（形式の全体は `pptx_create.py --help` を見てください）、
`pptx_create.py` を実行します。スライドごとに指定できるのは、`layout`（title、
title_content、section、two_content、title_only、blank）、`title`、
`subtitle`、`bullets`（文字列、または `level` 0〜4・`size` をポイントで・
`bold`・`italic`・`font`・`color` を 16 進数で指定した辞書）、`images`（パスと
左・上・幅・高さをインチで）、`tables`（`rows` は入れ子の一覧）、`shapes`
（rectangle、rounded_rectangle、oval、diamond、right_arrow、chevron。
`fill` を 16 進数で、`text` は任意）、`charts`（bar、bar_h、line、pie に
`categories` と `series`）、`notes`（発表者用のノート）です。

### 2. 資料を読む {#2-read-a-deck}

`pptx_read.py deck.pptx --outline` は、スライドの大きさ、使われている
レイアウトの一覧、そしてスライドごとにレイアウト名・すべての図形の文字・
表のセル・画像の一覧（ファイル名・拡張子・バイト数）・グラフの項目と系列と
値・発表者用のノートを返します。`--images DIR` で埋め込まれた画像を
ファイルに書き出し、中身を見たいときは書き出した画像を `vision_analyze` に
かけてください。

### 3. 資料を直す {#3-edit-a-deck}

`pptx_edit.py` は複数の操作を一度にまとめて行います。元のファイルを
残したいときは `--output` を使ってください。文字の置き換えは、スライドの
図形・表のセル・ノートを調べます。グラフの更新は `chart.replace_data()` を
使い、スライドとグラフの番号、新しい項目と系列を JSON で指定します。画像の
入れ替えは画像の関連付け ID を差し替えるので、位置と大きさはそのまま
保たれます。スライドの削除は関連付けと `<p:sldId>` の項目を取り除き、
並べ替えは `<p:sldIdLst>` の中で `<p:sldId>` の要素を動かします（どちらも
python-pptx には公開された API がないため、スクリプトが XML の
段階で処理します）。

### 4. ひな形から作る {#4-build-from-a-template}

`pptx_from_template.py` は書式付きの .pptx を開き、値の JSON にある
`{{token}}` をスライド・表・ノートのすべてで置き換えます。さらに、ひな形が
持つレイアウト（名前か番号で指定）を使って新しいスライドを足せるので、
マスターのフォントと配色をそのまま受け継げます。ヒント: スライドが 1 枚も
ない状態からひな形を使いたいときは、あとから `pptx_edit.py --remove-slide` で
元のスライドを消してください。

### 5. 見た目の確認（任意） {#5-visual-verification-optional}

`soffice` があれば、スライドを PNG にして `vision_analyze` で
見てください:

```bash
soffice --headless --convert-to png --outdir ./render deck.pptx  # slide 1
soffice --headless --convert-to pdf --outdir ./render deck.pptx  # all slides
```

PNG への書き出しは 1 枚目のスライドだけです。全部のスライドを見たいときは
PDF に変換してください（poppler があれば、そのあと
`pdftoppm -png render/deck.pdf render/slide`）。`soffice` がないときは
`pptx_read.py` の JSON の構成に頼ります。中身と構造は確かめられますが、
見た目までは分かりません。

## つまずきやすいところ {#pitfalls}

- **文字が分かれること**: PowerPoint は、スペルチェックや書式の切れ目で
  段落の文字を複数の断片に分けます。`--replace-text` は、探している文字が
  1 つの断片に収まっているときは書式をそのまま保ちます。断片をまたぐ場合は、
  段落が最初の断片の書式だけで書き直されます。大事なスライドは置き換えの
  あとに確かめてください。
- **並べ替えは XML の段階の操作です**: python-pptx には対応した
  並べ替えの API がありません。`--move-slide` は `<p:sldIdLst>` を直接
  操作します。ふつうの資料なら安全ですが、あとで資料を読み直して確かめて
  ください。
- **資料のあいだでスライドをコピーすることはできません**。レイアウト・
  画像・関連付けを深くたどって複製する必要があるためです。移す先の資料で
  スライドを作り直してください。
- グラフの修正はデータの全体を入れ替えます。1 つのセルだけを直すことは
  できません。系列の追加と削除はできますが、グラフの*種類*を変えることは
  できません。
- python-pptx の既定のひな形は 4:3 です。作成用のスクリプトは、指定が
  なければ 16:9 にします。独自のひな形はそれぞれの大きさを保ちます。
- レイアウトの番号はひな形によって変わります。書式付きのひな形では、まず
  レイアウト名を調べてください: `pptx_read.py template.pptx --outline`
  （`layouts_available`）。
- 白紙のレイアウトでは `slide.shapes.title` が None になります。作成用の
  スクリプトはこれに対応していますが、その場で python-pptx のコードを
  書くときは覚えておいてください。
- 指定ファイルを書くときは必ず `encoding="utf-8"` を渡してください。
  `{{city}}` のような差し込みには ASCII 以外の値が入ることがあります。

## 確認 {#verification}

1. 作成や修正のあとは `pptx_read.py OUT.pptx --outline` を実行し、
   スライド数・文字・表・ノート・グラフの値が意図どおりか確かめます。
2. `--images DIR` を実行してファイルの大きさを見れば、画像が埋め込まれて
   いることを確かめられます。
3. 大事な資料では `soffice` で書き出し（手順の 5 を参照）、スライドごとの
   画像を `vision_analyze` で見てください。
4. 同梱のテスト一式が仕様そのものです:
   `python3 -m pytest tests/ -q`（python-pptx と pytest が必要です）。
