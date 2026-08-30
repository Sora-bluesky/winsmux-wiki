---
title: "Docx — Word の .docx ファイルを作る・読む・書き換える・ひな形から埋める・査読する"
description: "Word の .docx ファイルを作る・読む・書き換える・ひな形から埋める・査読する"
upstream_path: user-guide/skills/bundled/productivity/productivity-docx.md
upstream_blob: 5b27f0f0b4bd5f184b64ef04bdd4f5df6a35bcee
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/productivity/productivity-docx
---

# Docx {#docx}

Word の .docx ファイルを作る・読む・書き換える・ひな形から埋める・査読するための skill です。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/productivity\docx` |
| バージョン | `1.1.0` |
| 作者 | Nous Research |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `word`, `docx`, `documents`, `office`, `templates`, `revisions`, `comments` |
| 関連 skill | [`pdf`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-pdf/), [`xlsx`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-xlsx/), [`powerpoint`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-powerpoint/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Docx Skill {#docx-skill}

Microsoft Word の `.docx` ファイルを、python-docx を使った小さな CLI
から作成・読み取り・編集・ひな形からの差し込みまで行います。本文、スタイル、
箇条書き、表、画像、ヘッダーとフッター、`{{token}}` 形式の差し込み、変更履歴
（一覧・承認・却下）、コメント（一覧・追加・削除）、目次とページ番号の
フィールド、ファイルの健全性チェックに対応します。文書の見た目を描画すること
（PDF には LibreOffice が要ります。「PDF に変換する」を参照）や、旧形式の
`.doc` の編集はできません。

## こんなときに使います {#when-to-use}

- Word 文書（報告書、手紙、契約書）を作ってほしいと頼まれたとき。
- `.docx` の本文、見出しの構成、スタイル、埋め込み画像を取り出したいとき。
- 既存の `.docx` を変更する必要があるとき。文字列の置換、表のセルの編集、
  段落の挿入や削除、スタイルの適用、ばらけた run の結合など。
- `{{placeholders}}` の入った `.docx` のひな形に、データを差し込みたいとき。
- 文書に変更履歴があり、中身を確認して承認または却下したいとき。
- 査読者のコメントを読みたいとき、あるいはコメントを追加・削除したいとき。
- `.docx` が開かない、動きがおかしいなど、壊れていないか切り分けたいとき。
- 文書に目次や「Page X of Y」のフッターを入れたいとき。
- 向いていない用途: `.doc`（旧形式）、`.odt`、見た目を直接操作するレイアウト作業。

## 事前に必要なもの {#prerequisites}

- Python 3.10 以上と `python-docx`。
  `pip install python-docx` で入ります（import 名は `docx` で、lxml も一緒に入ります）。
- コメントの `add` は、python-docx 1.2 以上では専用の API を、それより古い版では
  XML を直接書く方法を使います。どちらになるかは自動で決まります。
- 画像ブロックを使う場合、画像ファイル（PNG か JPEG）が手元にある必要があります。

## 実行のしかた {#how-to-run}

補助スクリプトはすべて、このファイルと同じ場所の `scripts/` にあります。
`terminal` ツールから実行してください。どれも `--help` に対応していて、
結果は JSON で標準出力に出ます。

```bash
python scripts/docx_create.py spec.json out.docx
python scripts/docx_read.py out.docx --text
python scripts/docx_edit.py replace out.docx --find old --replace new
python scripts/docx_template.py tpl.docx values.json filled.docx
python scripts/docx_revisions.py list out.docx
python scripts/docx_comments.py list out.docx
python scripts/docx_validate.py out.docx
```

## 早見表 {#quick-reference}

| やること | コマンド |
| --- | --- |
| JSON の仕様から作る | `docx_create.py spec.json out.docx` |
| 全文（本文＋表＋ヘッダー／フッター） | `docx_read.py f.docx --text` |
| 見出しの構成と表の形 | `docx_read.py f.docx --structure` |
| 実際に使われているスタイル | `docx_read.py f.docx --styles` |
| 埋め込み画像を取り出す | `docx_read.py f.docx --images outdir/` |
| 変更履歴とコメントを検出する | `docx_read.py f.docx --revisions` |
| 検索して置換する（書式は保つ） | `docx_edit.py replace f.docx --find A --replace B -o out.docx` |
| 表のセルに書き込む | `docx_edit.py set-cell f.docx --table 0 --row 1 --col 2 --text X` |
| N 番目の段落の前に挿入する | `docx_edit.py insert f.docx --index N --text X --style Normal` |
| N 番目の段落を削除する | `docx_edit.py delete f.docx --index N` |
| N 番目の段落にスタイルを当てる | `docx_edit.py style f.docx --index N --style "Heading 1"` |
| 書式が同じ隣り合う run をまとめる | `docx_edit.py normalize f.docx -o out.docx` |
| N 番目の段落の前に目次を入れる | `docx_edit.py toc f.docx --index N -o out.docx` |
| 「Page X of Y」のフッター | `docx_edit.py page-numbers f.docx` |
| `{{tokens}}` を埋める | `docx_template.py tpl.docx values.json out.docx --strict` |
| 変更履歴の一覧（id・作成者・日付・本文） | `docx_revisions.py list f.docx` |
| 変更履歴をすべて承認／却下する | `docx_revisions.py accept-all f.docx -o out.docx`（却下は `reject-all`） |
| 変更履歴をひとつだけ承認／却下する | `docx_revisions.py accept f.docx --id 3 -o out.docx` |
| コメントの一覧（付いている本文も） | `docx_comments.py list f.docx` |
| 本文に紐づけてコメントを付ける | `docx_comments.py add f.docx --target "phrase" --text "note" --author You` |
| id を指定してコメントを消す | `docx_comments.py delete f.docx --id 0` |
| ファイルの健全性を調べる | `docx_validate.py f.docx`（問題があれば終了コード 1） |

## 手順 {#procedure}

1. **作る。** `write_file` で JSON の仕様を書いてから、
   `scripts/docx_create.py` を実行します。仕様に書けるのは、`page`（用紙サイズと
   余白をミリ単位で）、`header` と `footer` の文字列、`footer_page_numbers`
   （「Page X of Y」のフィールドをフッターに入れます）、`styles`（フォント、
   サイズ、太字と斜体、16 進の `color` を指定する独自の段落スタイル）、そして
   `blocks` です。ここに書けるのは `heading`（レベル 1〜9）、`paragraph`（`text` か、
   run ごとに `bold` / `italic` / `underline` を指定できる `runs` のリスト）、
   `bullet_list`、`numbered_list`、`table`（`header` の行は太字で描かれます。
   ほかに `rows`、`Table Grid` のような組み込みの表 `style` も指定できます）、
   `image`（`path` と、必要なら `width_mm`）、`toc`（目次のフィールド）、
   `page_break` が使えます。仕様の書式は `scripts/docx_create.py` の冒頭に
   全部書いてあります。
2. **読む。** `scripts/docx_read.py` に、モードのフラグをちょうど 1 つ渡します。
   `--text` は本文の段落、表のセルの文字列すべて、ヘッダーとフッターの文字列を
   JSON で返します。`--structure` は見出しの構成と、段落・表・セクションの数を
   返します。`--images DIR` は、パッケージ内の `word/media/` にあるファイルを
   すべて取り出します。
3. **書き換える。** `scripts/docx_edit.py` を使います。`replace` は本文、表
   （入れ子も含みます）、ヘッダー、フッターをたどり、run の書式を保ったまま
   置換します。ヘッダーとフッターを飛ばしたいときは `--body-only` を足します。
   元のファイルを残したいときは `-o out.docx` を渡し、その場で書き換えたい
   ときは省きます。`insert` / `delete` / `style` / `toc` で使う段落の番号は、
   `--structure` や `--text` で見える本文の並び順です。Word で何度も編集された
   文書には、まず `normalize` をかけてください。書式が同じ隣り合う run を
   まとめてくれるので、あとの検索と置換が確実に当たるようになります。
4. **変更履歴を確認する。** `docx_revisions.py list` は、本文・表・ヘッダー・
   フッターのどこにあっても、すべての `w:ins` と `w:del` を（id、作成者、日付、
   対象の文字列とともに）報告します。`accept-all` と `reject-all` はまとめて
   片づけ、`accept` / `reject --id N` はひとつだけ処理します。承認すると挿入が
   残って削除された文字列が消え、却下するとその逆になります。
5. **コメント。** `docx_comments.py list` は、それぞれのコメントの id、作成者、
   日付、本文、そして紐づいている文書中の文字列を返します。
   `add --target "some phrase"` は、その語句が最初に現れた場所に新しいコメントを
   付けます（必要に応じて run を分割しますが、書式は保たれます）。
   `delete --id N` は、文書の本文には手を触れずに、コメントと目印を取り除きます。
6. **ひな形から埋める。** 文書に `{{name}}` の形の token を置きます。値を並べた
   JSON オブジェクトを渡して `scripts/docx_template.py` を実行します。埋まらない
   token が残ったときに失敗させたいなら `--strict` を付けてください。どちらの
   場合も、JSON の出力に `filled` の件数と `unfilled_tokens` が並びます。
7. **確かめる**（毎回）。書き出したファイルを `--text` か `--structure` で
   読み直します。変更履歴やコメントに手を入れて作ったものには、
   `docx_validate.py` をかけてください。

## PDF に変換する {#converting-to-pdf}

スクリプトは要りません。LibreOffice が入っていれば、画面なしで変換できます。

```bash
soffice --headless --convert-to pdf --outdir outdir/ file.docx
```

まず使えるかどうかを確かめてください（`command -v soffice || command -v libreoffice`）。どちらもなければ、その場でごまかさずに、この環境では PDF への変換ができないと利用者に伝えてください。python-docx は PDF を描画できませんし、見た目を忠実に保つには本物の描画エンジンが必要です。

## つまずきやすいところ {#pitfalls}

- **token が複数の run に分かれる。** Word は文字列をいくつもの run に
  ばらばらに分けてしまうことがよくあります。置換の補助スクリプトは、一致した
  run をまとめます（置き換えた文字列は最初の run の書式を引き継ぎます）。
  先に `docx_edit.py normalize` をかけておくと、そのあとの編集すべてで
  ばらけが減ります。
- **変更履歴で扱える範囲。** `docx_revisions.py` が片づけられるのは run 単位の
  挿入と削除です（実際にはこれが大半を占めます）。段落記号や表の行の変更、
  書式変更の記録、移動は、`--revisions` で検出はできても自動では片づきません。
  `references/revisions-and-comments.md` を見たうえで、そこは Word に任せて
  ください。
- **コメントの返信。** 返信と「解決済み」の状態は `commentsExtended.xml` に
  入っていますが、この skill はそこを見ません。追加できるのは、返信でない
  ふつうのコメントだけです。
- **フィールドの中身を計算するのは Word。** `toc`、`page-numbers`、そして仕様の
  `toc` と `footer_page_numbers` が書き込むのは *フィールドのコード* です。
  実際の項目やページ番号は、ファイルを開いたときに Word や LibreOffice が
  埋めます（Word ではフィールドの更新を尋ねられることがあります）。
  python-docx は計算しないので、それまでは仮の文字列が見えたままです。
- **検証は健全性チェックであって、スキーマの検証ではない。**
  `docx_validate.py` が調べるのは、zip の中身、必要なパート、関係の指す先、
  画像の先頭バイト、参照されているスタイルです。XSD による検証ではないので、
  ここを通っても Word が嫌がる XML が残っていることはあります。
- **スタイル名は実在するものだけ。** 文書に定義されていないスタイルを当てると
  `KeyError` になります。`Heading 1`、`List Bullet`、`List Number`、`Table Grid`
  といった組み込みのものは既定のひな形に入っていますが、独自のスタイルは
  作成時の仕様で先に宣言しておく必要があります。
- **番号付きリストの振り直し。** `List Number` は Word の既定の連番に任せて
  いるため、1 つの文書に別々のリストがあると、振り直されずに続き番号に
  なることがあります。複数のリストで番号を細かく制御したい人には、あらかじめ
  伝えてください。
- **セルへの書き込みは書式を消す。** `set-cell` は `cell.text = ...` を使うため、
  そのセルの run が素の書式に戻ります。
- **文字コード。** JSON の仕様ファイルと値ファイルは、いずれも明示的に UTF-8 と
  して読みます。自分でつなぎのコードを書くときも、環境の既定の文字コードに
  頼らないでください。
- **展開して XML を sed で書き換えない。** 編集はスクリプト（または python-docx）
  を通してください。`document.xml` を素の文字列置換で書き換えると、簡単に
  ファイルが壊れます。`patch` や `write_file` を使うのは JSON の入力ファイルだけに
  して、`.docx` そのものには使わないでください。

## 確かめかた {#verification}

- 作成・編集・差し込みのあとは `docx_read.py out.docx --text` を実行して、
  期待した文字列が出ていること（そして古い文字列が消えていること）を確認します。
- 承認・却下のあとは、`docx_revisions.py list` が `[]` を返すはずです（わざと
  残した id があれば、それだけが出ます）。コメントに手を入れたあとは、
  `docx_comments.py list` に変更が反映され、`--text` の出力は変わっていない
  はずです。
- 健全なファイルなら `docx_validate.py out.docx` は `"ok": true` を出して 0 で
  終わります。変更履歴・コメント・フィールドをいじったあとは必ず実行してください。
- ひな形は `--strict` を付けて実行するか、`unfilled_tokens == []` を確認します。
- 構造の確認: `--structure` で期待どおりの見出しの構成と表の形が出るはずです。
  `--styles` を見れば、独自のスタイルが当たっているかがわかります。
