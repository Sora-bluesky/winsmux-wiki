---
title: Hermes 自身に聞く
description: docs を全部読む前に、Hermes 自身に聞けば返ってくる項目をまとめる。
sources:
  - https://hermes-agent.nousresearch.com/docs/getting-started/quickstart
  - https://hermes-agent.nousresearch.com/docs/reference/slash-commands
  - https://hermes-agent.nousresearch.com/docs/getting-started/installation
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-hermes-agent
  - https://hermes-agent.nousresearch.com/docs/user-guide/configuration
hermes_version: "0.21.3"
confidence: high
raw: /hermes/raw/ask.md
---

# Hermes 自身に聞く

docs を全部読まなくても、Hermes 自身に聞けば返ってくる項目があります。ここでは、そのまま貼れる頼み方だけを並べます。

## 使えるコマンドを一覧させる

```
/help
```

対話型 CLI で、使えるコマンドをカテゴリごとにまとめて表示します。`/help skills` でスキルのコマンドをすべて並べ、`/help <text>` で部分一致により絞り込めます。

根拠: [スラッシュコマンド早見表](/hermes/docs/reference/slash-commands/)

## いま使えるツールを一覧させる

```
/tools
```

対話型 CLI で、いまのセッションで使えるツールの一覧が返ります。特定のツールを無効・有効にすることもできます。

根拠: [スラッシュコマンド早見表](/hermes/docs/reference/slash-commands/)

## モデルを切り替える

```
/model
```

対話型 CLI で、引数なしで実行するとプロバイダとモデルの選択画面が開きます。名前を指定するとき（例: `/model claude-sonnet-4`）は、設定済みのプロバイダの範囲で切り替わります。

根拠: [スラッシュコマンド早見表](/hermes/docs/reference/slash-commands/)

## 環境の不調を診断させる

ターミナルで実行します（Hermes への発言ではありません）。

```
hermes doctor
```

何が足りないのか、どう直せばよいのかを具体的に教えてくれます。

根拠: [インストール](/hermes/docs/getting-started/installation/)

## 公式ドキュメントを読んで答えさせる

Hermes には同梱の skill「Hermes Agent」があり、公式ドキュメントと索引（llms.txt）を参照する手順を持っています。

```
公式ドキュメントで Telegram の設定方法を調べて、手順だけ教えて
```

上の例では、その手順で調べた結果の要約を依頼しています。

根拠: [Hermes Agent skill](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-hermes-agent/)

## このサイトの今週の更新を読ませる

```
https://wiki.winsmux.dev/hermes/raw/updates-weekly.md を読んで、私の設定と使い方に関係のある更新だけを3行以内で教えて。関係が無ければ「無し」と答えて。
```

自分に関係する更新に絞るよう依頼する文です。

根拠: [更新履歴](/hermes/updates/)（このファイルの出どころ）

## 自分の環境で確かめさせる

```
いまの設定でTelegramは動く状態か、設定ファイルを見て確認して
```

Telegram の設定内容の確認を依頼する例です。設定の項目は設定ページに、確認の手順はクイックスタートにあります。

根拠: [Hermes Agent の設定](/hermes/docs/user-guide/configuration/) / [Hermes Agent クイックスタート](/hermes/docs/getting-started/quickstart/)

## うまくいかないとき

コマンドが使える環境（対話型 CLI かメッセージングか）はスラッシュコマンド早見表で確認できます。環境の不調には `hermes doctor` を使ってください。
