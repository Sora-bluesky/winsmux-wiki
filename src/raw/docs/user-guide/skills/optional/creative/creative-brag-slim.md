---
title: "Brag Slim — プロジェクトや URL から紹介動画を作る、上流で保守"
description: "プロジェクトや URL から紹介動画を作る、上流で保守"
upstream_path: user-guide/skills/optional/creative/creative-brag-slim.md
upstream_blob: 38b87fcab88bc5afd68302d154b88f11518cc77c
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/creative/creative-brag-slim
---

# Brag Slim {#brag-slim}

プロジェクトや URL から紹介動画を作ります。上流で保守されています。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/creative/brag-slim` で入れます |
| パス | `optional-skills/creative/brag-slim` |
| バージョン | `0.4.0` |
| 作者 | Shunit Haviv Hakimi (shunithaviv) |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `video`, `launch-video`, `marketing`, `motion-graphics`, `share-copy` |
| 関連 skill | [`brag`](/hermes/docs/user-guide/skills/optional/creative/creative-brag/), [`hyperframes`](/hermes/docs/user-guide/skills/optional/creative/creative-hyperframes/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として見ています。
:::

# Brag Slim（上流で保守） {#brag-slim-upstream-maintained}

> **カタログ用の見出しだけの項目です。** この項目の中身は上流の
> [latent-spaces/brag](https://github.com/latent-spaces/brag) で保守されています。このプロジェクトは
> `/brag-slim` を `skills/brag-slim/` の下の `SKILL.md` 1 つとして配布しています。`hermes
> skills install official/creative/brag-slim` を実行すると、そのリポジトリから最新のファイルを直接取得します
> （hub からの他のインストールと同じく隔離して検査します）。ここに置いてあるのは
> カタログの情報だけなので、同梱したコピーが古くなることはありません。

`/brag-slim` は `/brag` の軽量版で、Claude Opus 5.5 向けに書かれています。Hyperframes も
同梱の素材も使いません。紹介動画の全体（ストーリー、映像、音楽、効果音、ミックス、書き出し）を、
マシンにすでに入っているツールでモデル自身が作ります。入力はいまのプロジェクトのディレクトリか Web サイトの URL です。
元の UI、フォント、素材は描き直さずに実物をそのまま使い、
計画、書き出した動画、共有用の文面を `brag-output/` に書き出します。オプションは
`--tone`, `--format landscape|vertical|square`, `--duration` です。

`brag` は、従来の Hyperframes のワークフロー、同梱のサウンドトラックと効果音、
`--voice` によるナレーションを加えたものです（そちらの「事前に必要なもの」を参照してください）。この skill を含んでいて、
Opus 5.5 ではこの skill に処理を引き継ぎます。

## 事前に必要なもの {#prerequisites}

- 決まったツール一式はありません。モデルは入っているものを使って組み立てます。実際には、
  音声のミックスとエンコードに FFmpeg、それにヘッドレスブラウザ
  （Playwright か Puppeteer を入れた Node、または Chrome）が要ります。ブラウザは HTML からコマを描くときと、
  JavaScript でページを描画する Web サイトを取り込むときに使います。

詳しい説明はこちらです。https://github.com/latent-spaces/brag#readme
