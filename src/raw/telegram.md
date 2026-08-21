---
title: Telegram
description: 自分の Hermes を Telegram から使えるようにする。LINE と同じ丁寧さ。
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/telegram
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/
hermes_version: "0.20.4"
confidence: high
raw: /hermes/raw/telegram.md
---

# Telegram

自分の Hermes を、Telegram から使えるようにします。ボットは第三者のものではなく、あなた自身の Hermes です。届いたかどうかは、1通送って返事が返ることです。LINE と同じ丁寧さで書いてあります。二番手扱いにはしません。

対話で進めるときは、次を実行して **Telegram** を選びます。

```
hermes gateway setup
```

ウィザードがボットのトークンと、許可するユーザー ID を聞き、設定を書いてくれます。

## BotFather でボットを作る

1. Telegram で [@BotFather](https://t.me/BotFather) を開きます。
2. `/newbot` を送ります。
3. 表示名を決めます。例: Hermes Agent。
4. ユーザー名を決めます。末尾が `bot` で、ほかと重ならないものが要ります。
5. BotFather が API トークンを返します。このトークンを知っている人はボットを操作できます。漏れたら BotFather の `/revoke` で無効にします。

表示やコマンド一覧を整えたいときは、BotFather の `/setdescription`、`/setabouttext`、`/setuserpic`、`/setcommands` です。

## 自分のユーザー ID を知る

Hermes は、ユーザー名ではなく数字のユーザー ID で許可します。[@userinfobot](https://t.me/userinfobot) にメッセージを送ると、数字が返ってきます。

## Hermes に書く

対話が嫌なときは `~/.hermes/.env` に次です。

```
TELEGRAM_BOT_TOKEN=BotFatherのトークン
TELEGRAM_ALLOWED_USERS=自分の数字ID
```

複数人を許可するときは、カンマ区切りです。

## ゲートウェイを動かす

```
hermes gateway
```

数秒でボットがオンラインになります。Telegram から 1通送り、返事が返れば届いています。

既定は long polling です。Hermes から Telegram へ取りに行くので、LINE のような公開 URL は不要です。ただしゲートウェイ自体は動いたままにしてください。ノート PC を閉じると切れます。常に使いたいときは `hermes gateway install` です。

グループで普通の発言も見せたいときは、BotFather の Group Privacy を Off にするか、ボットを管理者にします。設定を変えたあとは、グループから外して入れ直します。詳しい値は正本の Telegram ページです。

つながったあとは [運用](/hermes/ops/) と [どこまで任せるか](/hermes/trust/) です。
