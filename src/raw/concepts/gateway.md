---
title: Gateway
description: メッセージの窓口。Telegram や LINE からの受信を自分の Hermes に届ける常駐部分。
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging
  - https://hermes-agent.nousresearch.com/docs/developer-guide/gateway-internals
hermes_version: "0.21.0"
confidence: high
raw: /hermes/raw/concepts/gateway.md
---

# Gateway

Gateway は、メッセージの窓口です。Telegram や LINE などから届いたメッセージを受け取り、自分の Hermes に渡し、返事を送り返します。端末で開く CLI とは別に、動かしっぱなしにしておく部分です。

Gateway が動いている間だけ、外からのメッセージが届きます。止まっていると、送っても返事は来ません。だから [運用](/hermes/ops/) では「動き続けているか」を最初に見ます。

対応する窓口は Telegram、Discord、Slack、LINE など 21 以上あります。全体像は公式の [Messaging Overview](https://hermes-agent.nousresearch.com/docs/user-guide/messaging)（英語）にあります。

## 公式で読む

- 窓口の全体像 — [Messaging Overview](https://hermes-agent.nousresearch.com/docs/user-guide/messaging)
- 内部のしくみ（起動、認可、配送） — [Gateway Internals](https://hermes-agent.nousresearch.com/docs/developer-guide/gateway-internals)

## このサイトの関連

- [LINE から使う](/hermes/docs/user-guide/messaging/line/)
- [Telegram から使う](/hermes/docs/user-guide/messaging/telegram/)
- [運用](/hermes/ops/)
