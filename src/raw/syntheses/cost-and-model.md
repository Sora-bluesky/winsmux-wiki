---
title: コストとモデル
description: お金のかかりどころと、モデルの選び方。公式資料を横断してまとめた。
sources:
  - https://hermes-agent.nousresearch.com/docs/integrations/nous-portal
  - https://hermes-agent.nousresearch.com/docs/user-guide/configuring-models
  - https://hermes-agent.nousresearch.com/docs/guides/tips
  - https://hermes-agent.nousresearch.com/docs/guides/local-ollama-setup
hermes_version: "0.20.4"
confidence: medium
raw: /hermes/raw/syntheses/cost-and-model.md
---

# コストとモデル

Hermes 自体は無料の OSS です。お金がかかるのは、頭脳にあたるモデル（LLM）の利用料です。かかり方は、どこにつなぐかで決まります。公式資料を横断してまとめました（切り口はこのサイトのもの。だから確度は medium です）。

## つなぎ先は大きく3通り

- [Nous Portal](/hermes/entities/nous-portal/) — 定額サブスク。300 以上のモデルと Tool Gateway 込み。公式の推奨で、いちばん迷わない
- 各社の API キー — OpenRouter、OpenAI、Anthropic、Google など。使った分だけの従量制。すでにキーを持っているならすぐ試せる
- ローカルモデル — Ollama などで手元のマシンだけで動かす。API 料金ゼロ。ただしモデルの実力とマシンの性能に左右される

## 節約の公式資料

- 使い方のコツ（コスト節も含む） — [Tips & Best Practices](https://hermes-agent.nousresearch.com/docs/guides/tips)
- 安い接続先へ自動で流す — [Provider Routing](https://hermes-agent.nousresearch.com/docs/user-guide/features/provider-routing)
- 障害時の予備 — [Fallback Providers](https://hermes-agent.nousresearch.com/docs/user-guide/features/fallback-providers)
- 完全無料で動かす — [Run Hermes Locally with Ollama](https://hermes-agent.nousresearch.com/docs/guides/local-ollama-setup)

## モデルの切り替え

つないだあとにモデルを替えるのは設定 1 箇所です。詳細は [Configuring Models](https://hermes-agent.nousresearch.com/docs/user-guide/configuring-models)、設定ファイルの全体は [設定](/hermes/concepts/config/) にあります。
