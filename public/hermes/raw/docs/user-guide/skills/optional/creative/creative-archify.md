---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "Archify — 検証済みのインタラクティブな HTML 図（本体は上流で管理）"
description: "検証済みのインタラクティブな HTML 図（本体は上流で管理）"
upstream_path: user-guide/skills/optional/creative/creative-archify.md
upstream_blob: aaca38c574ae1c32ca70b31baa2ae17fedd61e3a
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/creative/creative-archify
---

# Archify {#archify}

検証済みのインタラクティブな HTML 図を作ります。本体は上流で管理されています。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加で入れるもの — `hermes skills install official/creative/archify` で導入します |
| パス | `optional-skills/creative/archify` |
| バージョン | `2.17.0` |
| 作者 | tt-a1i |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `diagram`, `architecture`, `workflow`, `sequence`, `dataflow`, `state-machine`, `mermaid`, `html`, `svg` |
| 関連 skill | [`architecture-diagram`](/hermes/docs/user-guide/skills/bundled/creative/creative-architecture-diagram/), [`excalidraw`](/hermes/docs/user-guide/skills/optional/creative/creative-excalidraw/), [`concept-diagrams`](/hermes/docs/user-guide/skills/optional/creative/creative-concept-diagrams/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Archify（本体は上流で管理） {#archify-upstream-maintained}

> **カタログ用の控えです。** この項目の本体は上流の
> [tt-a1i/archify](https://github.com/tt-a1i/archify) で管理されています。上流のプロジェクトは、
> Node の CLI、スキーマ、レンダラー、例、参考資料をまとめた自己完結の skill ディレクトリ（`archify/`）を配布しています。`hermes skills install
> official/creative/archify` を実行すると、その時点のツリーをそのリポジトリから直接取り込みます
> （ほかのハブからの導入と同じく、隔離とスキャンを経ます）。このディレクトリにはカタログ用のメタデータしか置いていないので、
> 同梱の写しが古くなることはありません。

Archify は、型付きの小さな JSON の仕様から、それだけで完結し、自由に見て回れる HTML の図を作ります。
図の種類は `architecture`、`workflow`、`sequence`、`dataflow`、`lifecycle`
（状態遷移図）で、ダーク／ライトのテーマ、パンとズーム、検索、関係のたどり、
必要に応じたトレースのアニメーション、PNG/JPEG/WebP/SVG/WebM への書き出しに対応します。
ふつうの言葉で書いた要件や、貼り付けた Mermaid（`flowchart`、`sequenceDiagram`、
`stateDiagram`）を受け付け、図を実際のコードに合わせる必要があるときは、リポジトリの中身を根拠として読み込めます。
どの候補も 9 項目のチェックからなる `validate` / `deliver` の受領記録を通るので、
出来ばえは目で眺めて判断するのではなく、検証で確かめられます。

## 事前に必要なもの {#prerequisites}

- `PATH` 上に Node.js 18 以上（`node bin/archify.mjs doctor` で導入できているか確認できます。
  skill のパッケージの中で `npm install` を実行する必要はありません）。
- 導入では GitHub から約 200 ファイル（約 8 MB。大半は上流のテストと例）を取得します。
  取得は 1 つのツリー SHA に固定され、その SHA はバンドルのメタデータに記録されます。
- 上流の「Update awareness」（更新の確認）の手順は `scripts/check-update.mjs` を実行します。
  これは GitHub からリリースのマニフェストを読んで通知を表示するだけで、
  何かをダウンロードしたりインストールしたりすることはありません。外部への通信を避けたいなら、この手順は飛ばしてください。

導入したあとも、最初から入っている `architecture-diagram` skill が、依存なしで使える代わりとして残ります
（archify の出発点になった Cocoon AI の系譜を同じく受け継いでいます）。
検証の受領記録、Mermaid からの変換、sequence/lifecycle の種類、1 つの HTML ファイルにとどまらない書き出しを
利用者が求めているときは、archify を優先してください。

完全なドキュメント: https://github.com/tt-a1i/archify#readme
