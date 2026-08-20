---
title: すでにインストールしている
description: 入れ済みの人が、案内を飛ばして LINE / Telegram か運用へ進む。
sources:
  - https://hermes-agent.nousresearch.com/docs/getting-started/quickstart
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/
hermes_version: "0.20.4"
confidence: high
raw: /hermes/raw/live.md
---

# すでにインストールしている

案内は省略します。まだ入れていない人は [Hermes Agentをインストールする](/hermes/start/) です。

## 会話が通るか

端末で `hermes` を開き、1回返事が返ることを確認してください。通っていないときは、機能を足す前に `hermes doctor` と `hermes model` です。Nous Portal でそろえるなら:

```
hermes setup --portal
```

## LINE または Telegram

すでに LINE か Telegram で自分の Hermes に届いている人は [運用](/hermes/ops/) へ進んでください。

まだつないでいない人は、同じ手順です。ボットはあなた自身の Hermes です。届いたかどうかは、1通送って返事が返ることです。

- [LINE](/hermes/start/line/) — 常時起動と公開 URL が要ります。ノート PC を閉じると切れます。
- [Telegram](/hermes/start/telegram/) — LINE と同じ丁寧さです。

つなぎ終わったら [運用](/hermes/ops/) と [どこまで任せる](/hermes/trust/) です。
