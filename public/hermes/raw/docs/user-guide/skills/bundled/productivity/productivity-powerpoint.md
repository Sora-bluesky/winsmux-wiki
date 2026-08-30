---
title: "Powerpoint — python-pptx で .pptx のスライドを作る・読む・直す"
description: "python-pptx で .pptx のスライドを作る・読む・直す"
upstream_path: user-guide/skills/bundled/productivity/productivity-powerpoint.md
upstream_blob: 72e4dc8e754f6b023c9250c8292cdf6bb18d609e
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/productivity/productivity-powerpoint
---

# Powerpoint {#powerpoint}

python-pptx で .pptx のスライドを作り、読み、直します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/productivity\powerpoint` |
| バージョン | `1.1.0` |
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
中身を調べ、直します。補助スクリプトは 5 本あり、JSON の指定からの資料作成、
構造を保った読み出し、その場での修正、ひな形をもとにした社内書式の資料づくり、
スライドの画像化をまかなえます。すべてオフラインで動き、
PowerPoint を入れておく必要はありません。

## こんなときに使います {#when-to-use}

- スライド資料・報告用の資料・提案資料を作ってほしいと頼まれたとき。
- 誰かから共有された .pptx から、本文・ノート・表・グラフのデータ・
  画像を取り出したいとき。
- 既存の資料を更新したいとき: 文字の差し替え、グラフのデータの更新や
  部分的な修正、ロゴの入れ替え、スライドの複製・削除・並べ替え、背景・
  フッター・リンク・発表者用のノートの設定。
- 会社のひな形 .pptx から、書式に沿った資料を作りたいとき。
- .ppt（古いバイナリー形式）には使いません。LibreOffice があるなら
  `soffice --convert-to pptx old.ppt` で先に変換してください。

## 事前に必要なもの {#prerequisites}

- Python 3.10 以上と、入れておいた `python-pptx`
  （`pip install python-pptx`）。
- 任意: スライドを PNG にしたり PDF に書き出したりするための
  LibreOffice（`soffice`）と poppler（`pdftoppm` または
  `pdftocairo`）。`pptx_render.py` は `shutil.which` で両方の有無を調べ、
  なければ穏やかに切り上げます（`{"rendered": false, "missing": [...]}`
  を返し、終了コードは 0）。作成・読み出し・修正はどれも、これなしで動きます。
- 使えるかどうかは `terminal` で確かめます:
  `python -c "import pptx; print(pptx.__version__)"` と `which soffice pdftoppm`。

## 実行のしかた {#how-to-run}

スクリプトはすべて `scripts/` にあり、`--help` に対応し、JSON を標準出力に
表示し、失敗すると 0 以外の終了コードを返します。`terminal` から実行します:

```bash
python scripts/pptx_create.py deck.json out.pptx
python scripts/pptx_read.py deck.pptx --outline      # full JSON outline
python scripts/pptx_read.py deck.pptx --notes        # speaker notes
python scripts/pptx_read.py deck.pptx --images ./img # export pictures
python scripts/pptx_edit.py deck.pptx --replace-text "Old Corp" "New Corp"
python scripts/pptx_edit.py deck.pptx --chart-data update.json
python scripts/pptx_edit.py deck.pptx --duplicate-slide 2
python scripts/pptx_edit.py deck.pptx --remove-slide 3 --move-slide 2 0
python scripts/pptx_from_template.py brand.pptx out.pptx --values vals.json
python scripts/pptx_render.py deck.pptx --outdir ./render  # slide PNGs
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
| グラフのデータを入れ替える | `pptx_edit.py deck.pptx --chart-data spec.json` |
| 系列を 1 つだけ直す | 同じフラグで、指定に `"ops"` を書きます（後述） |
| 画像を入れ替える | `pptx_edit.py deck.pptx --swap-image N NAME new.png` |
| スライドを複製する | `pptx_edit.py deck.pptx --duplicate-slide N` |
| スライドを削除する | `pptx_edit.py deck.pptx --remove-slide N` |
| スライドを並べ替える | `pptx_edit.py deck.pptx --move-slide FROM TO` |
| スライドの背景を変える | `pptx_edit.py deck.pptx --set-background N RRGGBB` |
| 文字にリンクを張る | `pptx_edit.py deck.pptx --hyperlink N TEXT URL` |
| ページ番号を出す | `pptx_edit.py deck.pptx --enable-slide-number N` |
| フッターの文字 | `pptx_edit.py deck.pptx --set-footer N TEXT` |
| ノートを設定する | `pptx_edit.py deck.pptx --set-notes N TEXT` |
| ノートを書き足す | `pptx_edit.py deck.pptx --append-notes N TEXT` |
| ひな形を埋める | `pptx_from_template.py tpl.pptx out.pptx --values v.json` |
| スライドを PNG にする | `pptx_render.py deck.pptx --outdir DIR` |

## 手順 {#procedure}

### 1. 資料を作る {#1-create-a-deck}

JSON の指定を書いてから（形式の全体は `pptx_create.py --help` を見てください）、
`pptx_create.py` を実行します。スライドごとに指定できるのは、`layout`（title、
title_content、section、two_content、title_only、blank）、`title`、
`subtitle`、`bullets`（文字列、または `level` 0〜4・`size` をポイントで・
`bold`・`italic`・`font`・`color` を 16 進数で・リンクにする `link` の URL を
指定した辞書）、`background`（べた塗りを 16 進数で）、`footer`（文字。
レイアウトのフッター枠を有効にします）、`slide_number`（true。レイアウトの
ページ番号枠を有効にします）、`images`（パスと左・上・幅・高さをインチで）、
`tables`（`rows` は入れ子の一覧）、`shapes`（rectangle、rounded_rectangle、
oval、diamond、right_arrow、chevron。`fill` を 16 進数で、`text` は任意）、
`charts`（bar、bar_h、line、pie に `categories` と `series`）、
`notes`（発表者用のノート）です。

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
図形・表のセル・ノートを調べます。画像の入れ替えは画像の関連付け ID を
差し替えるので、位置と大きさはそのまま保たれます。スライドの削除は
関連付けと `<p:sldId>` の項目を取り除き、並べ替えは `<p:sldIdLst>` の中で
`<p:sldId>` の要素を動かします（どちらも python-pptx には公開された API が
ないため、スクリプトが XML の段階で処理します）。`--duplicate-slide N` は
N 枚目のスライドを丸ごと複製して末尾に足します。図形の XML に加えて画像・
メディア・リンクの関連付けも複製され、rId が振り直されるので、複製したほうを
直しても元のスライドには影響しません。グラフのあるスライドは受け付けません
（「つまずきやすいところ」を参照）。`--set-notes` と `--append-notes` は
発表者用のノートを編集します。`--set-background`、`--hyperlink`、
`--enable-slide-number`、`--set-footer` は資料の仕上げに使います。

グラフの更新は `--chart-data` に JSON の指定を渡します。まるごと入れ替えるなら
`{"slide": 0, "chart": 0, "categories": [...], "series": {...}}` です。細かく
直したいときは代わりに `"ops"` を渡してください。
`{"op": "update_series", "name": ..., "values": [...]}`、
`add_series`、`remove_series`、`rename_category`（`from` と `to`、または
`index`）、`set_title` の一覧です。python-pptx はグラフのデータ一式を
まるごと入れ替えること（`replace_data`）しかできないので、ops は
「今の値を読む → 直す → 入れ替える」という形で実現しています。部分的に直せる
ように見えるのは包み紙で、項目と数値の系列として表せないグラフのデータは、
この往復で整えられてしまいます。

### 4. ひな形から作る {#4-build-from-a-template}

`pptx_from_template.py` は書式付きの .pptx を開き、値の JSON にある
`{{token}}` をスライド・表・ノートのすべてで置き換えます。さらに、ひな形が
持つレイアウト（名前か番号で指定）を使って新しいスライドを足せるので、
マスターのフォントと配色をそのまま受け継げます。ヒント: スライドが 1 枚も
ない状態からひな形を使いたいときは、あとから `pptx_edit.py --remove-slide` で
元のスライドを消してください。

### 5. 見た目の確認 {#5-visual-verification}

`pptx_render.py deck.pptx --outdir ./render` は、`soffice --headless` で資料を
PDF に変換し、`pdftoppm`（または `pdftocairo`）でスライド 1 枚ごとの PNG に
分割します。出力の JSON に PNG のパスが並ぶので、`vision_analyze` で 1 枚ずつ
見てください。どちらかの道具がないときは、スクリプトは
`{"rendered": false, "missing": [...]}` と案内を出して終了コード 0 で終わります。
そのときは `pptx_read.py` の JSON の構成に頼ります。中身と構造は確かめられますが、
見た目までは分かりません。

## PDF にする {#converting-to-pdf}

LibreOffice が入っているなら、仕上がった資料をそのまま PDF に書き出せます:

```bash
soffice --headless --convert-to pdf --outdir ./out deck.pptx
```

出来上がりは `./out/deck.pdf` です。その端末に入っていないフォントは別のものに
置き換わるので、PDF を渡す前に見た目の確認（手順の 5）をしてください。
オフラインで Python だけを使って .pptx を PDF にする道はありません。`soffice` が
ないときは、近いもので済ませずに、その旨を伝えてください。

## つまずきやすいところ {#pitfalls}

- **文字が分かれること**: PowerPoint は、スペルチェックや書式の切れ目で
  段落の文字を複数の断片に分けます。`--replace-text` は、まず書式が同じ
  隣り合った断片をつなげてから探すので、そうした断片をまたいだ文字も、
  書式をそのまま保ったまま置き換えられます。段落が最初の断片の書式で
  書き直されるのは、*書式が本当に違う*断片をまたいだときだけです。
  そのスライドは置き換えのあとに確かめてください。
- **グラフのあるスライドは複製できません**: グラフの関連付けにはそれぞれ
  別の XLSX のブックが埋め込まれていて、それを確実に複製する手立てが
  ありません。そのため `--duplicate-slide` は、資料を壊す代わりに、
  グラフのあるスライドをきちんと断ります。新しいスライドでグラフを作り直して
  ください。外部リンクと画像・メディアの関連付けは引き継がれ、レイアウトと
  ノートの関連付けは作り直されます。
- **グラフの ops は包み紙です**: python-pptx はデータ一式をまるごと
  入れ替えます。`"ops"` は今の値を `replace_data` で往復させているだけで、
  グラフの*種類*を変えることはできません。
- **並べ替えは XML の段階の操作です**: python-pptx には対応した
  並べ替えの API がありません。`--move-slide` は `<p:sldIdLst>` を直接
  操作します。ふつうの資料なら安全ですが、あとで資料を読み直して確かめて
  ください。
- **資料のあいだでスライドをコピーすることはできません**。複製が使えるのは
  1 つの資料の中だけで、そこではレイアウトとマスターが共通だからです。
- フッターとページ番号は、そのスライドのレイアウトから枠を写して有効にします。
  枠を持たないレイアウトでは `--set-footer` が分かりやすいメッセージを出して
  失敗します（代わりにテキストボックスを置いてください）。
- リンクは断片の単位で付きます。`--hyperlink` は、そのスライドで指定した文字を
  含む断片すべてにリンクを張ります。
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
3. `pptx_render.py deck.pptx --outdir ./render` ですべてのスライドを画像にし、
   1 枚ずつ `vision_analyze` で見てください。図形の重なり、切れた文字、色の
   おかしなところは、構成の JSON では見つけられません。画像化の道具がない
   ときは、スクリプトがその旨を伝えます。そのときは構成の JSON に頼ります。
4. 同梱のテスト一式が仕様そのものです:
   `python -m pytest tests/ -q`（python-pptx と pytest が必要です）。
