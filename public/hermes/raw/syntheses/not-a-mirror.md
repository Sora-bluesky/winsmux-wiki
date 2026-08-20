---
title: 正本との差分
description: このサイトは公式 docs のミラーではない。何を日本語にして、何をしないかの宣言。
sources:
  - https://hermes-agent.nousresearch.com/docs/
  - https://hermes-agent.nousresearch.com/docs/llms.txt
hermes_version: "0.20.4"
confidence: high
raw: /hermes/raw/syntheses/not-a-mirror.md
---

# 正本との差分

このサイトは、公式 docs のミラーではありません。正本は常に [公式 docs](https://hermes-agent.nousresearch.com/docs/) です。食い違っていたら、公式が正しいと考えてください。

## 日本語にしているもの

- 導線（インストールから LINE / Telegram まで）。公式の Quickstart / Installation / Messaging の順のまま、手順を足したり引いたりしていません
- しくみの短い説明（Gateway、Skills、Memory、Cron、承認、設定）と置き場所の比較

## 日本語にしていないもの

- 約 200 の skill ページ — [skill](/hermes/guide/skills/) は名前と概要と更新日の索引だけです
- developer-guide — [developer-guide](/hermes/guide/dev/) は公式へのリンク索引だけです
- 公式の全ページ — [すべて](/hermes/guide/all/) も索引です

## 追従のしかた

上流の docs の変化を毎日 1 回確認し、差分があれば反映します。ページの下の「正本:」リンクから、いつでも公式の原文に飛べます。
