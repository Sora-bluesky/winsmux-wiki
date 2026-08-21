---
title: VPS
description: 借りたサーバーに常駐させる形。24時間動くので、メッセージの窓口と相性がいい。
sources:
  - https://hermes-agent.nousresearch.com/docs/getting-started/installation
  - https://hermes-agent.nousresearch.com/docs/user-guide/security
hermes_version: "0.20.4"
confidence: high
raw: /hermes/raw/entities/vps.md
---

# VPS

VPS は、借りたサーバーに常駐させる形です。24 時間動き続けるので、LINE や Telegram の「いつ送っても返事が来る」を満たしやすいのが利点です。ノート PC を閉じても切れません。

Linux サーバーなら公式の `install.sh` で入ります。外に開いたマシンなので、[承認](/hermes/concepts/approval/)で見た認可（誰の指示を聞くか）を最初に絞るのが大事です。ブラウザ認証が必要なサービスにつなぐときは、SSH 越しの OAuth の公式ガイドがあります。

## 公式で読む

- 入れ方 — [Installation](https://hermes-agent.nousresearch.com/docs/getting-started/installation)
- 守り方 — [Security](https://hermes-agent.nousresearch.com/docs/user-guide/security)
- SSH 越しのブラウザ認証 — [OAuth over SSH / Remote Hosts](https://hermes-agent.nousresearch.com/docs/guides/oauth-over-ssh)

## このサイトの関連

- [運用](/hermes/ops/)
- [LINE から使う](/hermes/docs/user-guide/messaging/line/)
- [Telegram から使う](/hermes/docs/user-guide/messaging/telegram/)
