---
title: "Impeccable — フロントエンド設計の指針、上流で保守（impeccable）"
description: "フロントエンド設計の指針、上流で保守（impeccable）"
upstream_path: user-guide/skills/optional/creative/creative-impeccable.md
upstream_blob: a94647e8f7d4a7d61a4ffbb5b9ee56c4c4c4152c
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/creative/creative-impeccable
---

# Impeccable {#impeccable}

フロントエンド設計の指針です。上流で保守されています（impeccable）。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/creative/impeccable` で入れます |
| パス | `optional-skills/creative\impeccable` |
| バージョン | `4.1.2` |
| 作者 | Paul Bakaus (pbakaus) |
| ライセンス | Apache-2.0 |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `design`, `frontend`, `ui`, `ux`, `web-design`, `anti-slop` |
| 関連 skill | [`claude-design`](/hermes/docs/user-guide/skills/bundled/creative/creative-claude-design/), [`popular-web-designs`](/hermes/docs/user-guide/skills/bundled/creative/creative-popular-web-designs/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として見ています。
:::

# Impeccable（上流で保守） {#impeccable-upstream-maintained}

> **カタログ用の見出しだけの項目です。** この項目の中身は上流の
> [pbakaus/impeccable](https://github.com/pbakaus/impeccable) で保守されています。このプロジェクトは
> `.hermes/skills/` の下に Hermes 用の skill バンドルを配布し、動作を検証しています。
> `hermes skills install impeccable` を実行すると、そのリポジトリから最新のバンドルを直接取得します（hub からの他のインストールと同じく隔離して検査します）。ここに置いてあるのは
> カタログの情報だけなので、同梱したコピーが古くなることはありません。

Impeccable は、AI コーディングエージェントのためのデザイン言語です。1 つの skill に 23 個の
サブコマンド（`/impeccable init`, `craft`, `shape`, `critique`, `audit`,
`polish`, `bolder`, `quieter`, `distill`, `harden`, `onboard`, `animate`,
`colorize`, `typeset`, `layout`, `delight`, `overdrive`, `clarify`, `adapt`,
`optimize`, `extract`, `document`, `live`）をまとめ、避けるべきパターン
（使い古されたフォント、紫のグラデーション、入れ子になったカード、跳ねるイージング）をはっきり示し、
LLM も API キーも要らない 61 ルールの検出 CLI（`npx impeccable detect`）を備えています。

インストールが終わったら、まずこれを実行します。

```
/impeccable init
```

詳しい説明はこちらです。https://impeccable.style
