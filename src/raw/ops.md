---
title: 運用
description: 自分の Hermes を常に動かし、LINE や Telegram から届く状態を保つ。
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/
hermes_version: "0.20.6"
confidence: high
raw: /hermes/raw/ops.md
---

# 運用

導線の到達点であり、使い方のページでもあります。ボットはあなた自身の Hermes です。届いている状態とは、1通送って返事が返ることです。

## ゲートウェイを動かす

今すぐ動かす:

```
hermes gateway
```

サービスにする:

```
hermes gateway install
hermes gateway start
hermes gateway status
```

Linux でログアウトしても残したいときは、公式どおり linger を有効にします。サービスユーザーで動かしている場合の例:

```
sudo loginctl enable-linger ユーザー名
```

## LINE を使うとき

LINE は公開 URL が前提です。トンネルや固定ホストが止まると、LINE からのメッセージは届きません。ノート PC を閉じると切れます。常時起動できるコンピュータに置いてください。

Webhook の確認:

```
curl -i https://あなたの公開ホスト/line/webhook/health
```

`status` が ok なら、公開側は生きています。

## Telegram を使うとき

既定の long polling なら、公開 URL は不要です。代わりに、ゲートウェイのプロセスが動き続けていることが条件です。

## 止まっているとき

`hermes gateway status` を見ます。ログは `~/.hermes/logs/gateway.log` です。直したあとに 1通送り、返事が返るかで確認します。

どこまで任せるかは [どこまで任せるか](/hermes/trust/) です。
