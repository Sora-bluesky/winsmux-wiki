---
title: 設定
description: config.yaml が正本。使うモデル、API キー、窓口の設定がここに集まる。
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/configuration
  - https://hermes-agent.nousresearch.com/docs/user-guide/configuring-models
hermes_version: "0.20.5"
confidence: high
raw: /hermes/raw/concepts/config.md
---

# 設定

Hermes の設定は config.yaml というファイルが正本です。どのモデルを使うか、API キーはどれか、どの窓口を開くか。会話で変えた設定も、最終的にはこのファイルに残ります。

モデルは Nous Portal のほか、OpenRouter、OpenAI、Anthropic、Google など OpenAI 互換の接続先を選べます。ブラウザから設定を触れる Web Dashboard もあります。

## 公式で読む

- config.yaml の全体 — [Configuration](https://hermes-agent.nousresearch.com/docs/user-guide/configuration)
- モデルの選び方 — [Configuring Models](https://hermes-agent.nousresearch.com/docs/user-guide/configuring-models)
- 環境変数の一覧 — [Environment Variables](https://hermes-agent.nousresearch.com/docs/reference/environment-variables)
- ブラウザからの管理 — [Web Dashboard](https://hermes-agent.nousresearch.com/docs/user-guide/features/web-dashboard)

## このサイトの関連

- [コストとモデル](/hermes/syntheses/cost-and-model/)
