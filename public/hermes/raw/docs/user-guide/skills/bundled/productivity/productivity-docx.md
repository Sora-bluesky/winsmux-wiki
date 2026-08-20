---
title: "Docx — Word の .docx ファイルを作る・読む・書き換える・ひな形から埋める"
description: "Word の .docx ファイルを作る・読む・書き換える・ひな形から埋める"
upstream_path: user-guide/skills/bundled/productivity/productivity-docx.md
upstream_blob: c00e2fc02329eb49ccbf02a17725bfc8b45a6e6e
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/productivity/productivity-docx
---

# Docx {#docx}

Word の .docx ファイルを作る・読む・書き換える・ひな形から埋めるための skill です。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/productivity/docx` |
| バージョン | `1.0.0` |
| 作者 | Nous Research |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `word`, `docx`, `documents`, `office`, `templates` |
| 関連 skill | [`pdf`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-pdf/), [`xlsx`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-xlsx/), [`powerpoint`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-powerpoint/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Docx Skill {#docx-skill}

Microsoft Word の `.docx` ファイルを、python-docx を使った 4 つの小さな CLI
で作成・読み取り・編集・ひな形からの差し込みまで行います。本文、スタイル、
箇条書き、表、画像、ヘッダーとフッター、`{{token}}` 形式の差し込みに対応します。
文書を PDF に変換したり、旧形式の `.doc` バイナリを編集したり、変更履歴を
承認・却下したりはできません（検出だけはできます。「つまずきやすいところ」を
参照してください）。

## こんなときに使います {#when-to-use}

- Word 文書（報告書、手紙、契約書）を作ってほしいと頼まれたとき。
- `.docx` の本文、見出しの構成、スタイル、埋め込み画像を取り出したいとき。
- 既存の `.docx` を変更する必要があるとき。文字列の置換、表のセルの編集、
  段落の挿入や削除、スタイルの適用など。
- `{{placeholders}}` の入った `.docx` のひな形に、データを差し込みたいとき。
- 向いていない用途: `.doc`（旧形式）、`.odt`、PDF への変換、見た目を直接
  操作するレイアウト作業。

## 事前に必要なもの {#prerequisites}

- Python 3.10 以上と `python-docx`。
  `pip install python-docx` で入ります（import 名は `docx` です）。
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
| `{{tokens}}` を埋める | `docx_template.py tpl.docx values.json out.docx --strict` |

## 手順 {#procedure}

1. **作る。** `write_file` で JSON の仕様を書いてから、
   `scripts/docx_create.py` を実行します。仕様に書けるのは、`page`（用紙サイズと
   余白をミリ単位で）、`header` と `footer` の文字列、`styles`（フォント、
   サイズ、太字と斜体、16 進の `color` を指定する独自の段落スタイル）、そして
   `blocks` です。ここに書けるのは `heading`（レベル 1〜9）、`paragraph`（`text` か、
   run ごとに `bold` / `italic` / `underline` を指定できる `runs` のリスト）、
   `bullet_list`、`numbered_list`、`table`（`header` の行は太字で描かれます。
   ほかに `rows`、`Table Grid` のような組み込みの表 `style` も指定できます）、
   `image`（`path` と、必要なら `width_mm`）、`page_break` が使えます。
   仕様の書式は `scripts/docx_create.py` の冒頭に全部書いてあります。組み立てる
   前に `read_file` で読んでください。
2. **読む。** `scripts/docx_read.py` に、モードのフラグをちょうど 1 つ渡します。
   `--text` は本文の段落、表のセルの文字列すべて、ヘッダーとフッターの文字列を
   JSON で返します。`--structure` は見出しの構成と、段落・表・セクションの数を
   返します。`--images DIR` は、パッケージ内の `word/media/` にあるファイルを
   すべて取り出します。
3. **書き換える。** `scripts/docx_edit.py` を使います。`replace` は本文、表
   （入れ子も含みます）、ヘッダー、フッターをたどり、run の書式を保ったまま
   置換します。ヘッダーとフッターを飛ばしたいときは `--body-only` を足します。
   元のファイルを残したいときは `-o out.docx` を渡し、その場で書き換えたい
   ときは省きます。`insert` / `delete` / `style` で使う段落の番号は、
   `--structure` や `--text` で見える本文の並び順です。
4. **ひな形から埋める。** 文書に `{{name}}` の形の token を置きます（英数字、
   `_`、`.`、`-` が使えます。`{{ name }}` のように内側に空白を入れても
   受け付けます）。値を並べた JSON オブジェクトを渡して
   `scripts/docx_template.py` を実行します。埋まらない token が残ったときに
   失敗させたいなら `--strict` を付けてください。どちらの場合も、JSON の出力に
   `filled` の件数と `unfilled_tokens` が並びます。
5. **確かめる**（毎回）。書き出したファイルを `--text` か `--structure` で
   読み直し、期待した内容が入っていることを確認します。

## つまずきやすいところ {#pitfalls}

- **token が複数の run に分かれる。** Word は `{{name}}` をいくつもの run に
  ばらばらに分けてしまうことがよくあります。置換の補助スクリプトは run を
  まとめ直して対応しますが、置き換えた文字列は、一致が始まった run の書式を
  引き継ぎます。そのため、token の途中で書式が変わっていた場合は平らに
  ならされます。
- **変更履歴。** `--revisions` は、挿入・削除・書式変更・コメントを *検出する*
  だけです。本文の抽出は現状のまま返します（挿入は含み、削除は含まないので、
  だいたい「すべて承認した状態」に近い見え方です）。ただし、この skill では
  変更履歴を承認・却下したり、コメントの本文を読んだりはできません。推測で
  答えず、その旨を利用者に伝えてください。
- **スタイル名は実在するものだけ。** 文書に定義されていないスタイルを当てると
  `KeyError` になります。`Heading 1`、`List Bullet`、`List Number`、`Table Grid`
  といった組み込みのものは既定のひな形に入っていますが、独自のスタイルは
  作成時の仕様で先に宣言しておく必要があります。
- **番号付きリストの振り直し。** `List Number` は Word の既定の連番に任せて
  いるため、1 つの文書に別々のリストがあると、振り直されずに続き番号に
  なることがあります。単純な文書なら問題ありませんが、複数のリストで番号を
  細かく制御したい人には、あらかじめ伝えてください。
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
- ひな形は `--strict` を付けて実行するか、`unfilled_tokens == []` を確認します。
- 構造の確認: `--structure` で期待どおりの見出しの構成と表の形が出るはずです。
  `--styles` を見れば、独自のスタイルが当たっているかがわかります。
- 壊れていない `.docx` は `Document(path)` で例外なく開きます。読み取り
  スクリプトが 0 で終わること自体が、ひとつの健全性チェックになります。
