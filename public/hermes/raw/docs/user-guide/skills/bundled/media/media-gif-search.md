---
title: "Gif Search — Tenor の GIF を curl + jq で検索・ダウンロードする"
description: "Tenor の GIF を curl + jq で検索・ダウンロードする"
upstream_path: user-guide/skills/bundled/media/media-gif-search.md
upstream_blob: 31d0e03eb88298fe59401d3959079befc56b75e0
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/media/media-gif-search
---

# Gif Search {#gif-search}

Tenor の GIF を curl + jq で検索・ダウンロードします。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/media/gif-search` |
| バージョン | `1.1.0` |
| 作者 | Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `GIF`, `Media`, `Search`, `Tenor`, `API` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# GIF 検索（Tenor API） {#gif-search-tenor-api}

curl を使って Tenor API から GIF を直接検索し、ダウンロードします。ほかのツールは要りません。

## こんなときに {#when-to-use}

リアクション用の GIF を探すとき、ビジュアルを含むコンテンツを作るとき、チャットに GIF を送りたいときに便利です。

## 準備 {#setup}

Tenor の API キーを環境変数に設定します（`${HERMES_HOME:-~/.hermes}/.env` に追記してください）。

```bash
TENOR_API_KEY=your_key_here
```

API キーは https://developers.google.com/tenor/guides/quickstart から無料で取得できます。Google Cloud Console で発行する Tenor の API キーは無料で、レート制限もかなり緩やかです。

## 事前に必要なもの {#prerequisites}

- `curl` と `jq`（どちらも macOS / Linux には標準で入っています）
- `TENOR_API_KEY` 環境変数

## GIF を検索する {#search-for-gifs}

```bash
# Search and get GIF URLs
curl -s "https://tenor.googleapis.com/v2/search?q=thumbs+up&limit=5&key=${TENOR_API_KEY}" | jq -r '.results[].media_formats.gif.url'

# Get smaller/preview versions
curl -s "https://tenor.googleapis.com/v2/search?q=nice+work&limit=3&key=${TENOR_API_KEY}" | jq -r '.results[].media_formats.tinygif.url'
```

## GIF をダウンロードする {#download-a-gif}

```bash
# Search and download the top result
URL=$(curl -s "https://tenor.googleapis.com/v2/search?q=celebration&limit=1&key=${TENOR_API_KEY}" | jq -r '.results[0].media_formats.gif.url')
curl -sL "$URL" -o celebration.gif
```

## メタデータをまとめて取得する {#get-full-metadata}

```bash
curl -s "https://tenor.googleapis.com/v2/search?q=cat&limit=3&key=${TENOR_API_KEY}" | jq '.results[] | {title: .title, url: .media_formats.gif.url, preview: .media_formats.tinygif.url, dimensions: .media_formats.gif.dims}'
```

## API のパラメータ {#api-parameters}

| パラメータ | 説明 |
|-----------|-------------|
| `q` | 検索語（スペースは `+` に URL エンコードします） |
| `limit` | 取得件数の上限（1〜50、既定は 20） |
| `key` | API キー（環境変数 `$TENOR_API_KEY` から） |
| `media_filter` | 形式の絞り込み: `gif`, `tinygif`, `mp4`, `tinymp4`, `webm` |
| `contentfilter` | セーフティ設定: `off`, `low`, `medium`, `high` |
| `locale` | 言語: `en_US`, `es`, `fr` など |

## 使えるメディア形式 {#available-media-formats}

検索結果はそれぞれ `.media_formats` の下に複数の形式を持ちます。

| 形式 | 使いどころ |
|--------|----------|
| `gif` | フル画質の GIF |
| `tinygif` | プレビュー用の小さい GIF |
| `mp4` | 動画版（ファイルサイズが小さい） |
| `tinymp4` | プレビュー用の小さい動画 |
| `webm` | WebM 形式の動画 |
| `nanogif` | ごく小さいサムネイル |

## 補足 {#notes}

- 検索語は URL エンコードしてください。スペースは `+`、特殊文字は `%XX` です
- チャットに送るなら、`tinygif` の URL のほうが軽くて扱いやすいです
- GIF の URL はマークダウンにそのまま書けます: `![alt](https://github.com/NousResearch/hermes-agent/blob/main/skills/media/gif-search/url)`
