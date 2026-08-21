---
title: Hermes Agentの使い方
description: よく使うページ。入口に全件は出さない。
sources:
  - https://hermes-agent.nousresearch.com/docs/
  - https://hermes-agent.nousresearch.com/docs/llms.txt
hermes_version: "0.20.5"
confidence: high
raw: /hermes/raw/guide.md
---

# Hermes Agentの使い方

よく使うページだけを出します。公式の全 URL は [すべて](/hermes/guide/all/) にあります。

## このサイトの中

- [Hermes Agentをインストールする](/hermes/docs/getting-started/quickstart/)
- [LINE でつなぐ](/hermes/docs/user-guide/messaging/line/)
- [Telegram でつなぐ](/hermes/docs/user-guide/messaging/telegram/)
- [運用](/hermes/ops/)
- [どこまで任せるか](/hermes/trust/)

ここから下のリンク先は公式 docs（英語）です。操作の結果を先に、公式ページの名前を後に書きます。

## 毎日の操作

- 端末での操作とキーの割り当てを覚える — [CLI](https://hermes-agent.nousresearch.com/docs/user-guide/cli)
- 前の会話の続きから再開する。過去の会話を探す — [Sessions](https://hermes-agent.nousresearch.com/docs/user-guide/sessions)
- モデルや API キーを設定する（config.yaml） — [Configuration](https://hermes-agent.nousresearch.com/docs/user-guide/configuration)
- 最新版に更新する。やめるときは削除する — [Updating](https://hermes-agent.nousresearch.com/docs/getting-started/updating)

## 覚えさせる・自動化する

- 会話をまたいで覚えさせる（MEMORY.md / USER.md） — [Memory](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory)
- 手順を skill として持たせ、必要なときだけ読ませる — [Skills System](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills)
- 決まった時刻に自動で動かす — [Cron Jobs](https://hermes-agent.nousresearch.com/docs/user-guide/features/cron)
- 終わるまで働き続けさせる目標を置く — [Persistent Goals](https://hermes-agent.nousresearch.com/docs/user-guide/features/goals)

## 守る

- 危険なコマンドの承認、利用者の認可、隔離の考え方 — [Security](https://hermes-agent.nousresearch.com/docs/user-guide/security)

## 連絡手段

- Telegram / LINE / Discord など 21 以上の窓口の全体像 — [Messaging Overview](https://hermes-agent.nousresearch.com/docs/user-guide/messaging)

日本語の手順は、このサイトの [LINE](/hermes/docs/user-guide/messaging/line/) と [Telegram](/hermes/docs/user-guide/messaging/telegram/) にあります。

## コツ

- 使いこなしの実践的な助言 — [Tips & Best Practices](https://hermes-agent.nousresearch.com/docs/guides/tips)
- skill の探し方、入れ方、作り方 — [Work with Skills](https://hermes-agent.nousresearch.com/docs/guides/work-with-skills)
- cron の実例パターン（監視、レポート、パイプライン） — [Automate with Cron](https://hermes-agent.nousresearch.com/docs/guides/automate-with-cron)

## しくみを知る

日本語の短い説明です。手順はありません。正本は各ページに書いてあります。

- [Gateway](/hermes/concepts/gateway/) — メッセージの窓口
- [Skills](/hermes/concepts/skills/) — あとから足せる知識
- [Memory](/hermes/concepts/memory/) — 会話をまたぐ記憶
- [Cron](/hermes/concepts/cron/) — 定時実行
- [承認](/hermes/concepts/approval/) — 危険な操作を止める
- [設定](/hermes/concepts/config/) — config.yaml とモデル
- [コストとモデル](/hermes/syntheses/cost-and-model/) — お金のかかりどころ
- [正本との差分](/hermes/syntheses/not-a-mirror/) — このサイトと公式の関係

## 置き場所とつなぎ先

- [ローカル](/hermes/entities/local/) — 手元のマシン
- [Docker](/hermes/entities/docker/) — コンテナで隔離
- [VPS](/hermes/entities/vps/) — 借りたサーバーに常駐
- [LINE](/hermes/entities/line/) — LINE から使う
- [Telegram](/hermes/entities/telegram/) — Telegram から使う
- [Nous Portal](/hermes/entities/nous-portal/) — 推奨のモデル契約

skill の全一覧は [skill](/hermes/guide/skills/)、開発者向けは [developer-guide](/hermes/guide/dev/) にあります。正本は [公式 docs](https://hermes-agent.nousresearch.com/docs/) です。
