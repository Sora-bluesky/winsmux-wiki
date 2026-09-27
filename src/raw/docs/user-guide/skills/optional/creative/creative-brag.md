---
title: "Brag — Hyperframes でプロジェクトの紹介動画を作る、上流で保守"
description: "Hyperframes でプロジェクトの紹介動画を作る、上流で保守"
upstream_path: user-guide/skills/optional/creative/creative-brag.md
upstream_blob: 39321584fd1122d07db1282ecdaab683c72c5fcb
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/creative/creative-brag
---

# Brag {#brag}

Hyperframes でプロジェクトの紹介動画を作ります。上流で保守されています。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/creative/brag` で入れます |
| パス | `optional-skills/creative/brag` |
| バージョン | `0.4.0` |
| 作者 | Shunit Haviv Hakimi (shunithaviv) |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `video`, `launch-video`, `marketing`, `hyperframes`, `motion-graphics`, `share-copy` |
| 関連 skill | [`brag-slim`](/hermes/docs/user-guide/skills/optional/creative/creative-brag-slim/), [`hyperframes`](/hermes/docs/user-guide/skills/optional/creative/creative-hyperframes/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として見ています。
:::

# Brag（上流で保守） {#brag-upstream-maintained}

> **カタログ用の見出しだけの項目です。** この項目の中身は上流の
> [latent-spaces/brag](https://github.com/latent-spaces/brag) で保守されています。このプロジェクトは
> skill のディレクトリ（`skills/brag/`）を配布していて、手順ごとの参照資料、トーンのプリセット、
> 同梱の音楽と効果音のライブラリ、キュー解析スクリプトが入っています。`hermes
> skills install official/creative/brag` を実行すると、そのリポジトリから最新のツリーを直接取得します
> （hub からの他のインストールと同じく隔離して検査します）。ここに置いてあるのは
> カタログの情報だけなので、同梱したコピーが古くなることはありません。

`/brag` は、いまのディレクトリにあるプロジェクトを読み、見せ方の切り口とトーン
（`default`, `polished`, `yc-parody`, `chaotic`, `deadpan`, `cinematic`,
`app-store`、または自由な指示）を決めてから、15〜25 秒の動画の絵コンテを作ります。構成の指示書を Hyperframes に渡し、
`brag-output/brag.mp4` を書き出します。いちばん良いコマを使ったポスター画像と、共有用の文面も付きます。オプションは `--tone`, `--format
landscape|vertical|square`, `--duration`, `--title`, `--no-music`, `--no-sfx`、
それに `--voice`（Kokoro によるナレーション。既定ではオフ）です。

Claude Opus 5.5 で動かすと、呼び出しで `--full` か `--voice` を指定しない限り、
同梱の `brag-slim` に処理を引き継ぎます。

## 事前に必要なもの {#prerequisites}

- Node.js 22 以降、`PATH` の通った FFmpeg、Hyperframes CLI（`npx hyperframes
  doctor` で環境を確認できます）。
- Hyperframes を使う経路（`--full`、`--voice`、または Opus 5.5 以外のモデル）では、
  HeyGen のドメイン skill を名前で読み込みます。`hyperframes-core`、
  `hyperframes-animation`、`hyperframes-creative`、`hyperframes-keyframes`、
  `hyperframes-cli` の 5 つで、`hermes skills install
  heygen-com/hyperframes/skills/<name>` で入れます。ただし現在は、例に含まれる HTML コメントや認証情報の説明が
  skills guard に引っかかり、5 つのうち 4 つがブロックされます
  （`hyperframes-creative` は dangerous と判定され、`--force` でも上書きできません）。
  そのため、この経路はまだ完全にはインストールできません。`brag-slim` にはこの依存がありません。
  このカタログにある追加の `hyperframes` skill は 1 ファイルに移植したもので、
  上の名前の skill は含んでいません。
- 自分で用意した曲にビートを合わせたキューが要るときは、`uv` が `scripts/analyze_music_cues.py` を実行します。
  同梱の曲には、計算済みのキューが付いています。
- インストールでは、GitHub の contents API を通じて約 290 ファイル（約 16 MB。ほとんどが同梱の音楽と効果音）を取得します。
  先に `GITHUB_TOKEN` を設定するか、`gh` CLI でサインインしておいてください。
  匿名の上限は 1 時間に 60 リクエストで、このバンドルには足りません。

詳しい説明はこちらです。https://github.com/latent-spaces/brag#readme
