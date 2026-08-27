---
title: 承認
description: 危険な操作の前に人の確認を挟むしくみ。誰の指示を聞くかの認可もここに含まれる。
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/security
hermes_version: "0.20.6"
confidence: high
raw: /hermes/raw/concepts/approval.md
---

# 承認

承認は、危険な操作の前に人の確認を挟むしくみです。ファイルを消す、システムを変えるといったコマンドは、実行前に「やっていいか」を聞いてきます。許可するまで動きません。

もうひとつの柱が認可です。メッセージの窓口を開くと、誰でも話しかけられる状態になり得ます。だから「誰の指示なら聞くか」を許可リストで絞ります。LINE や Telegram の設定で自分の ID だけを許可するのは、この認可です。

失敗しても戻れるように、ファイルの変更を自動で控えておく Checkpoints もあります。

## 公式で読む

- 全体（承認、認可、隔離） — [Security](https://hermes-agent.nousresearch.com/docs/user-guide/security)
- 変更の控えと巻き戻し — [Checkpoints & Rollback](https://hermes-agent.nousresearch.com/docs/user-guide/checkpoints-and-rollback)
- 仕事マシンで動かすとき — [Running Hermes on a Personal or Work Machine](https://hermes-agent.nousresearch.com/docs/guides/secure-hermes-on-a-work-machine)

## このサイトの関連

- [どこまで任せるか](/hermes/trust/)
