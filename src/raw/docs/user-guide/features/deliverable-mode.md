---
title: "成果物モード（チャットに届く生成ファイル）"
description: "生成したグラフ・PDF・表計算などのファイルを、エージェントがメッセージアプリの標準の添付として送り届けるしくみ"
upstream_path: user-guide/features/deliverable-mode.md
upstream_blob: d01847ebb0573d9bd176ac083fc71ff70ba4e727
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/deliverable-mode
---

# 成果物モード {#deliverable-mode}

Hermes Agent をメッセージアプリの窓口（Slack、Discord、Telegram、
WhatsApp、Signal など）で動かしているとき、生成したファイルをそのまま
チャットへ届けられます。置き場所を写して開いてもらうのではなく、そのアプリの標準の添付として送られます。

グラフはその場で開く画像として、PDF の報告書はダウンロードできるファイルとして、
表計算は `.xlsx` として届きます。エージェントの側で `MEDIA:` の印を書いたり、
特別な操作をしたりする必要はありません。ファイルを作って、その絶対パスを
返事の中で触れるだけです。窓口側が文章からその場所を拾い、見えるメッセージからは取り除いて、
ファイルを標準の形で送り出します。

## しくみ {#how-it-works}

3 つの部品が組み合わさっています。

1. **ファイルを作るツールをエージェントが持っている。** matplotlib でグラフを描く
   `execute_code`、Word 文書の `docx` スキル、表計算の `xlsx` スキル、
   PDF の `pdf` と `latex-pdf-report` スキル、スライドの
   `powerpoint` スキル、画像の `image_generate`、
   音声の `text_to_speech` などです。

2. **窓口がエージェントの返事からファイルの場所を探す。** 対応する拡張子で終わる
   絶対パス（`/tmp/...`）やホーム起点のパス（`~/...`）が取り出されます。
   コードブロックとインラインコードの中にある場所は
   対象外なので、コード例が崩れることはありません。

3. **窓口が種類ごとに送り分ける。** 画像はアプリが対応していればその場に表示され、
   動画もその場に表示され、音声は音声メッセージや音声添付として届き、
   それ以外はファイル添付として送られます。

## 対応する拡張子 {#supported-file-extensions}

| 種類 | 拡張子 | 届き方 |
|---|---|---|
| 画像 | `.png .jpg .jpeg .gif .webp .bmp .tiff .svg` | その場に表示 |
| 動画 | `.mp4 .mov .avi .mkv .webm .3gp` | その場に表示（対応するアプリのみ） |
| 音声 | `.mp3 .m2a .wav .ogg .opus .m4a .flac` | 音声メッセージ／音声添付 |
| 文書 | `.pdf .docx .doc .odt .rtf .txt .md .epub` | ファイル送信 |
| データ | `.xlsx .xls .ods .csv .tsv .json .xml .yaml .yml` | ファイル送信 |
| 地理情報 | `.kmz .kml .geojson .gpx` | ファイル送信 |
| プレゼン資料 | `.pptx .ppt .odp .key` | ファイル送信 |
| 書庫 | `.zip .tar .gz .tgz .bz2 .xz .7z .rar .apk .ipa` | ファイル送信 |
| Web | `.html .htm` | ファイル送信 |

`.py` や `.log` などソースコードの拡張子は、エージェントが手当たり次第に
ソースを送ってしまわないよう、あえて外してあります。コードを相手に見せたいときは
コードブロックを使ってください。

## 成果物を作るように促す {#encouraging-the-agent-to-produce-artifacts}

エージェントは放っておくと成果物を作りにいきません。作ってよいと分かる必要があります。
促し方は 2 通りです。

**その場ごと：** 「比較をグラフで送って」「データは CSV で返して」のように
はっきり頼むか、メッセージアプリでは成果物の形で返しやすくなるよう
自分でカスタム指示や人格の記述を書いておきます。

**プロジェクト単位：** エージェントが作業するプロジェクトの
`AGENTS.md`／`CLAUDE.md`／`.cursorrules`、全体の人格を書く
`~/.hermes/SOUL.md`、あるいは `~/.hermes/config.yaml` の
`agent.personalities` に名前を付けた設定として書いておきます（後者は会話ごとに
`/personality` で切り替えられます）。

エージェントがやることは単純です。ファイルを絶対パス
（たとえば `/tmp/q3-revenue.png`）に書き出し、その場所を返事の中で
ただの文章として触れる。あとは窓口が引き受けます。コードブロックや
バッククォートの中にある場所は対象外なので、コード例が崩れることはありません。

## かんばん：成果物は完了の知らせに同乗する {#kanban-artifacts-ride-completion-notifications}

Hermes の複数エージェントによるかんばんの進め方を使っている場合、働き手は
`kanban_complete` を呼ぶときに成果物のファイルを添えられます。

```python
kanban_complete(
    summary="rendered Q3 revenue chart and report",
    artifacts=[
        "/tmp/q3-revenue.png",
        "/tmp/q3-report.pdf",
    ],
)
```

その仕事を Slack や Telegram などで見守っていた相手に「完了しました」の知らせが届くとき、
窓口はそれぞれの成果物もそのチャットへ標準の添付として一緒に送ります。
人の側は、成果物と要約を同じ場所で受け取れます。

知らせを送る時点でディスク上に見当たらないファイルは、黙って飛ばされます。

## MCP でつなげる先を増やす {#connecting-more-services-with-mcp}

成果物を届けるしくみとは別に、エージェントは MCP（Model Context Protocol）を通じて
ほかのサービスにも手を伸ばせます。MCP には主なツール向けの
有志のサーバーが揃っているので、必要なものを入れてください。

| サービス | できるようになること |
|---|---|
| **Notion** | Notion のページやデータベースの読み書き、ワークスペースの検索 |
| **GitHub** | issue、PR、コメント、gh CLI では届かない範囲のリポジトリ検索 |
| **Linear** | チケット、プロジェクト、サイクル |
| **Slack** | ワークスペース全体の検索、ほかのチャンネルの閲覧 |
| **Gmail** | 受信箱の仕分け、メール送信、ラベルの管理 |
| **Salesforce** | リード、商談、取引先のデータ |
| **Snowflake / BigQuery** | データウェアハウスへの SQL |
| **Google Drive** | ファイル検索、中身の取得、共有設定の管理 |

MCP サーバーは `~/.hermes/config.yaml` の `mcp_servers`
の節に書いて入れます。設定の全体は [MCP 連携](/hermes/docs/user-guide/features/mcp/) を参照してください。

## Slack 上の Perplexity Computer との比較 {#comparison-to-perplexity-computer-in-slack}

Perplexity Computer の Slack 連携も、同じ考え方で作られています。
エージェントが成果物（グラフ、PDF、スライド）を作り、
スレッドへ標準の添付として投稿する。Hermes Agent の成果物モードは、
使う人から見て同じ体験を手元で実現します。

- 生成は利用者自身の venv やサンドボックスの中で行われます（外部の間借り先ではありません）。
- ファイルは同じ Slack の `files.uploadV2` API でチャットへ届きます。
- つなげる先の広さは、400 個の連携をそろえた提供元の一覧ではなく MCP が担います。実際に使うものだけを入れてください。

OAuth のトークンは利用者の端末の `auth.json` や `.env` に置かれたままです。預けて保管する場所も、
複数の利用者で分け合う microVM もありません。行き着く先は同じです。
