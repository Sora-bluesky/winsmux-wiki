---
title: LINE
description: 自分の Hermes を LINE から使えるようにする。常時起動と公開 URL が要る。
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/line
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/
hermes_version: "0.20.4"
confidence: high
raw: /hermes/raw/line.md
---

# LINE

自分の Hermes を、LINE のメッセージから使えるようにします。ボットは第三者のものではなく、あなた自身の Hermes です。届いたかどうかは、1通送って返事が返ることです。

対話で進めるときは、次を実行して **LINE** を選びます。

```
hermes gateway setup
```

## 前提

LINE は、Hermes が常に動いていることと、インターネットから届く公開 URL が要ります。ノート PC を閉じると切れます。Webhook 用のトンネルも、確認しているあいだは止めないでください。本番ではホスト名が変わらないトンネルにします。

## LINE Messaging API のチャネルを作る

1. [LINE Developers Console](https://developers.line.biz/console/) を開きます。
2. Provider を作り、その下に Messaging API チャネルを作ります。
3. Basic settings から Channel secret をコピーします。
4. Messaging API タブの Channel access token (long-lived) で Issue を押し、トークンをコピーします。
5. 同じタブで Auto-reply messages と Greeting messages をオフにします。Hermes の返事とぶつからないようにするためです。

## 公開 URL を用意する

LINE は公開 HTTPS に Webhook を送ります。既定のポートは `8646` です。変えるときは `LINE_PORT` です。

公式が挙げている例:

```
cloudflared tunnel --url http://localhost:8646
```

開発用:

```
ngrok http 8646
```

`https://...` の URL を控えます。確認中はトンネルを止めません。

## Hermes に書く

`~/.hermes/.env` に次を書きます。

```
LINE_CHANNEL_ACCESS_TOKEN=長いトークン
LINE_CHANNEL_SECRET=チャネルシークレット
LINE_ALLOWED_USERS=Uで始まる自分のID
LINE_PUBLIC_URL=https://あなたの公開ホスト
```

画像や音声を送るときも `LINE_PUBLIC_URL` が要ります。

`~/.hermes/config.yaml` には次です。

```
gateway:
  platforms:
    line:
      enabled: true
```

許可する相手がまだ分からない開発中だけ、`LINE_ALLOW_ALL_USERS=true` があります。普段は許可リストを使います。

## Webhook URL を付ける

LINE のコンソールに戻り、Messaging API タブの Webhook URL に次を貼ります。

```
https://あなたの公開ホスト/line/webhook
```

末尾は `/line/webhook` です。Verify が 200 になったら、Use webhook を On にします。

## ゲートウェイを動かす

```
hermes gateway
```

ログに、Webhook を待っている行が出ます。チャネルの QR からボットを友だち追加し、1通送ります。返事が返れば届いています。

常に動かしたいときは、公式どおり `hermes gateway install` でサービスにします。ノート PC を閉じる使い方では LINE は切れます。常時起動できるコンピュータに置いてください。

つながったあとは [運用方法](/hermes/ops/) と [どこまで任せるか？](/hermes/trust/) です。
