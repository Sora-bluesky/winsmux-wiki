---
title: "Agentmail — エージェントに AgentMail CLI のメールボックスを持たせたいときに使います"
description: "エージェントに AgentMail CLI のメールボックスを持たせたいときに使います"
upstream_path: user-guide/skills/optional/email/email-agentmail.md
upstream_blob: 26c682c3817386ecc46852b73ff87a3d011dac23
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/email/email-agentmail
---

# Agentmail {#agentmail}

エージェントに AgentMail CLI のメールボックスを持たせたいときに使います。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加 skill — `hermes skills install official/email/agentmail` で入れます |
| パス | `optional-skills/email\agentmail` |
| バージョン | `1.0.0` |
| 作者 | Haakam Aujla (Haakam21), AgentMail |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Email`, `CLI`, `AgentMail`, `Communication` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# AgentMail の skill {#agentmail-skill}

AgentMail は、エージェント自身のメールボックスを用意します。メールを送る、返信を
受け取る、メールで届くワンタイムパスワード（OTP）の手続きを済ませる、届いたメール
を続けて処理する、といったことができます。あくまでエージェントが持つメールボックス
のためのもので、ユーザーが元から使っている IMAP/SMTP のメールボックス向けではありません。

まずは `agentmail` の CLI を使ってください。MCP を使うのは、動かしている仕組みが MCP のツールを前提にしているときだけです。
REST は、CLI に必要な操作が見当たらないときだけ使います。

## こんなときに使います {#when-to-use}

- エージェントが自分の持ちものとしてメールアドレスを必要とするとき。
- メールでのワンタイムパスワード（OTP）のやり取り、返信、スレッド、ラベル、添付ファイルを扱う作業のとき。
- 届いたメールを Webhook や WebSocket で受け取りたいとき。

## 事前に必要なもの {#prerequisites}

- コマンドは `terminal` ツールから実行します。
- CLI を入れます。

```bash
npm install -g agentmail-cli@latest
```

- API キーを環境変数に入れます。

```bash
export AGENTMAIL_API_KEY="am_..."
```

API キーがまだない場合は [signup.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/email\agentmail/references/signup.md) を見てください。

## 実行のしかた {#how-to-run}

ほかのコマンドやスクリプトに ID を渡すときは、いつでも `--format json` を付けます。

```bash
agentmail inboxes list --format json
```

## 早見表 {#quick-reference}

- [AgentMail のエージェント向け資料](https://agentmail.md): ウェブ上に置かれている版です。
- [AgentMail](https://agentmail.to): 製品の紹介ページです。
- [コンソール](https://console.agentmail.to): API キーとアカウントを管理します。
- [ドキュメント](https://docs.agentmail.to): 製品のドキュメント全体です。
- [signup.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/email\agentmail/references/signup.md): 自分で登録して、OTP で本人確認をする手順です。
- [core.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/email\agentmail/references/core.md): メールボックス、メール、スレッド、ラベル、添付ファイルの扱いです。
- [webhooks.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/email\agentmail/references/webhooks.md): 公開された HTTPS のサーバーへ通知を送ります。
- [websockets.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/email\agentmail/references/websockets.md): 手元で動いているエージェントへ通知を送ります。
- [mcp.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/email\agentmail/references/mcp.md): MCP との連携です。

## 手順 {#procedure}

1. `agentmail-cli@latest` を入れて、`agentmail inboxes list --format json` が動くことを確かめます。
2. API キーが手元にないときは、[signup.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/email\agentmail/references/signup.md) の手順を済ませます。
3. メールボックスの用意、送信、閲覧、返信、転送、ラベル付け、スレッド、添付ファイルの扱いは [core.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/email\agentmail/references/core.md) を見ます。
4. 定期的に見にいくだけでは足りないときにかぎり、[webhooks.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/email\agentmail/references/webhooks.md) か
   [websockets.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/email\agentmail/references/websockets.md) を足します。

## つまずきやすいところ {#pitfalls}

- `--api-key` ではなく `AGENTMAIL_API_KEY` を使ってください。
- `AGENTMAIL_API_KEY` を、プロンプト、ログ、URL、コミットするファイルに出さないでください。
- 作成をやり直すときは、毎回同じ `client_id` の値を使います。
- LLM に渡す本文は、`extracted_text` か `extracted_html` があればそちらを使います。
- 反応する相手は `message.received` です。エージェント自身が送ったメールには反応しません。

## 動作確認 {#verification}

```bash
agentmail inboxes list --format json
```
