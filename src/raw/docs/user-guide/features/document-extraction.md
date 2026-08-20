---
title: "文書からの本文抽出"
description: "read_file が PDF・Office 文書・ノートブックをどう文字に変換するか、そして PDF が画像を並べただけのときにどうするか"
upstream_path: user-guide/features/document-extraction.md
upstream_blob: e3872a8e70212c44962cab4c8b8d9d9b87dd0104
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/document-extraction
---

# 文書からの本文抽出 {#document-extraction}

`read_file` ツールは、よく使われる文書の形式を自動で読める文字に変換します。おかげでエージェントは、ソースコードを読むのと同じ感覚で PDF や表計算の中身を確かめられます。

## 対応している形式 {#supported-formats}

| 形式 | 拡張子 | 変換に使うもの | 使える条件 |
|--------|-----------|-----------|--------------|
| Jupyter ノートブック | `.ipynb` | 組み込み（標準ライブラリ） | 常に |
| Word 文書 | `.docx` | 組み込み（標準ライブラリ） | 常に |
| Excel ブック | `.xlsx` | 組み込み（標準ライブラリ） | 常に |
| PDF | `.pdf` | 追加の `anydoc` 変換器 | 初回利用時に自動で導入* |
| 旧来の Office | `.doc`、`.ppt`、`.xls`、`.pptx` とその仲間 | 追加の `anydoc` 変換器 | 初回利用時に自動で導入* |
| OpenDocument | `.odt`、`.ods`、`.odp` | 追加の `anydoc` 変換器 | 初回利用時に自動で導入* |
| リッチテキスト／電子書籍 | `.rtf`、`.epub` | 追加の `anydoc` 変換器 | 初回利用時に自動で導入* |

\* 追加の変換器は `firecrawl-anydoc` パッケージで、導入が許可されている場合にだけその場で入ります（`config.yaml` の `security.allow_lazy_installs`）。入っていなくても標準ライブラリで扱う3形式は動きますが、それ以外の形式はバイナリとして読み込みを断られます。

変換後の出力は Markdown で、`read_file` が普段使う `offset`／`limit` の窓で区切って読み出せます。50 MB を超える文書は、ツールの1回のやり取りが膨らみすぎないよう受け付けません。

抽出は離れた場所のターミナル（Docker、Modal、SSH）でも働きます。ファイルの中身が実行先の境界をまたいで運ばれ、手元の側で変換されるので、サンドボックスの中にある文書も手元のものと同じように読めます。

## 画像として取り込まれた PDF：読み取り率の警告 {#scanned-pdfs-the-coverage-warning}

PDF の変換が読むのは**文字の層だけ**です。紙を取り込んだ画像のページ（法律文書、不動産の売買資料、署名済みの契約書、FAX でよくあります）には文字の層がなく、何も出てこないまま静かに変換が終わります。見分けどころは、見出しはあるのに中身が空になっていることです。

読み取れないページが無視できない割合になったとき（文書全体の20%超、または実数で10ページ以上）、`read_file` は抽出結果の先頭に警告を付けます。読み取れなかった空白のかたまりには、その直前に取り出せた文字（多くは節の区切り）が目印として添えられるので、エージェントは文書全体を OCR にかけず、本当に必要な箇所だけを狙えます。

```
[EXTRACTION COVERAGE WARNING: 198 of 311 pages in this PDF yielded no
text. ... Unreadable gaps, each labeled with the last text extracted
before it:
  pages 42-77 (36 pages) — after "Antigua Maintenance Corp Bylaws" (p41)
  pages 92-213 (122 pages) — after "... Covenants, Codes and Regulations" (p91)
  page 224 (1 page) — after "... Insurance Declaration Pages" (p223)
Decide which gaps you actually need — do NOT OCR or render everything. ...]
```

警告には、正確なページの範囲と、そこから中身を取り戻す方法が並びます。

1. **数ページなら、画像にして目で読む。** ページを画像に変換し、画像を扱うツールで読ませます。
   ```bash
   pdftoppm -jpeg -r 150 -f 92 -l 94 document.pdf /tmp/page
   ```
   そのうえで各画像を `vision_analyze` で確かめます。追加で入れるものはありません（そもそも検出のために poppler が必要です）。
2. **多くのページなら、OCR。** `ocr-and-documents` スキルが marker-pdf を使った一括 OCR を扱います（90 以上の言語に対応し、数式や表も処理できます。導入には 3〜5 GB ほど必要です）。

検出にはページごとの文字数を数えるため poppler の `pdftotext` を使います。poppler が入っていない場合も抽出そのものは動き、読み取り率の確認だけが静かに省かれます。

:::tip
警告への対処はエージェントが自分で進めます。抜けたページを画像にするか OCR にかけるかを提案してくれます。抽出結果を自分の目で読むときは、「見出しがあるのに中身が空」を、欠落ではなく画像として取り込まれた節だと考えてください。
:::
