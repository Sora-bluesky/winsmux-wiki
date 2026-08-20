---
title: どこまで任せる
description: 会話が通ってから、コマンド実行の許可をどうするかを決める。
sources:
  - https://hermes-agent.nousresearch.com/docs/getting-started/quickstart
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/
hermes_version: "0.20.4"
confidence: high
raw: /hermes/raw/trust.md
---

# どこまで任せる

導線の到達点であり、使い方のページでもあります。公式 Quickstart は、普通の会話が通るまで機能を足さない、としています。

## 先に確認すること

- 端末の `hermes` で返事が返る
- LINE や Telegram を使うなら、1通送って返事が返る

これが通っていないときは、許可の話より先に [すでにインストールしている](/hermes/live/) です。

## コマンドの許可

破壊的になりうるコマンドは、既定では実行前に確認します。設定名は `approvals.mode` です。

- `manual` — 毎回確認する（既定）
- `smart` — 危険が低そうなものは通し、高いものだけ確認する
- `off` — 確認しない。`--yolo` と同じです

値を変える例:

```
hermes config set approvals.mode smart
```

確認を全部外すのは、中身が分かっている人向けです。公式も推奨していません。

メッセージ側では `/approve` と `/deny` で、保留中のコマンドを許可または拒否できます。

## ボットは自分の Hermes

LINE や Telegram のボットは、公開された誰かのボットではありません。あなたのコンピュータ（または常時起動のコンピュータ）で動いている Hermes です。許可リストに書いた相手だけが使えます。トークンが漏れたら、LINE ならチャネルのトークンを再発行し、Telegram なら BotFather の `/revoke` です。
