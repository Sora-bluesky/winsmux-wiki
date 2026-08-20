---
title: "Agentmail — エージェント専用のメールボックスを持たせて、送受信できるようにする"
description: "エージェント専用のメールボックスを持たせて、送受信できるようにする"
upstream_path: user-guide/skills/optional/email/email-agentmail.md
upstream_blob: e134da466747063894ce017e2c7c7e2fd7308cb6
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/email/email-agentmail
---

# Agentmail {#agentmail}

エージェント専用のメールボックスを持たせて、送受信できるようにします。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加 skill — `hermes skills install official/email/agentmail` で入れます |
| パス | `optional-skills/email/agentmail` |
| バージョン | `1.0.0` |
| 作者 | teyrebaz33, Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `email`, `communication`, `agentmail`, `mcp` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# AgentMail — Agent-Owned Email Inboxes {#agentmail-agent-owned-email-inboxes}

## 必要なもの {#requirements}

- **AgentMail の API キー**（必須） — https://console.agentmail.to で登録します（無料枠はメールボックス 3 個、月 3,000 通。有料プランは月 20 ドルから）
- Node.js 18 以上（MCP サーバー用）

## 使う場面 {#when-to-use}
次のようなときにこの skill を使います。
- エージェントに専用のメールアドレスを持たせたいとき
- エージェントの名前で、自分の判断でメールを送りたいとき
- 届いたメールを受け取って読みたいとき
- メールのやり取りを管理したいとき
- サービスに登録したり、メールで本人確認をしたりしたいとき
- ほかのエージェントや人とメールでやり取りしたいとき

これはユーザー本人のメールを読むためのものでは**ありません**（それには himalaya か Gmail を使ってください）。
AgentMail は、エージェント自身の身元とメールボックスを与えるものです。

## 準備 {#setup}

### 1. API キーを取得する {#1-get-an-api-key}
- https://console.agentmail.to を開きます
- アカウントを作り、API キーを発行します（`am_` で始まります）

### 2. MCP サーバーを設定する {#2-configure-mcp-server}
`~/.hermes/config.yaml` に次を足します（キーは実物を直接貼ってください。MCP の環境変数は .env から展開されません）。
```yaml
mcp_servers:
  agentmail:
    command: "npx"
    args: ["-y", "agentmail-mcp"]
    env:
      AGENTMAIL_API_KEY: "am_your_key_here"
```

### 3. Hermes を起動し直す {#3-restart-hermes}
```bash
hermes
```
これで、AgentMail の 11 個のツールがすべて自動的に使えるようになります。

## 使えるツール（MCP 経由） {#available-tools-via-mcp}

| ツール | 説明 |
|------|-------------|
| `list_inboxes` | エージェントのメールボックスを一覧にする |
| `get_inbox` | 指定したメールボックスの詳細を見る |
| `create_inbox` | メールボックスを新しく作る（実在のメールアドレスがもらえます） |
| `delete_inbox` | メールボックスを消す |
| `list_threads` | メールボックスの中のやり取りを一覧にする |
| `get_thread` | 特定のやり取りを取り出す |
| `send_message` | メールを新しく送る |
| `reply_to_message` | 届いたメールに返信する |
| `forward_message` | メールを転送する |
| `update_message` | メールのラベルや状態を変える |
| `get_attachment` | メールの添付ファイルを取り出す |

## 手順 {#procedure}

### メールボックスを作ってメールを送る {#create-an-inbox-and-send-an-email}
1. 専用のメールボックスを作ります。
   - `create_inbox` に名前を渡します（たとえば `hermes-agent`）
   - エージェントは `hermes-agent@agentmail.to` というアドレスを得ます
2. メールを送ります。
   - `send_message` に `inbox_id`、`to`、`subject`、`text` を渡します
3. 返信を確認します。
   - `list_threads` で届いたやり取りを見ます
   - `get_thread` で特定のやり取りを読みます

### 届いたメールを確認する {#check-incoming-email}
1. `list_inboxes` でメールボックスの ID を調べます
2. その ID で `list_threads` を実行し、やり取りを一覧にします
3. `get_thread` でやり取りと、その中のメールを読みます

### メールに返信する {#reply-to-an-email}
1. `get_thread` でやり取りを取り出します
2. `reply_to_message` にメールの ID と返信の本文を渡します

## 使い方の例 {#example-workflows}

**サービスに登録する:**
```
1. create_inbox (username: "signup-bot")
2. Use the inbox address to register on the service
3. list_threads to check for verification email
4. get_thread to read the verification code
```

**エージェントから人へ連絡する:**
```
1. create_inbox (username: "hermes-outreach")
2. send_message (to: user@example.com, subject: "Hello", text: "...")
3. list_threads to check for replies
```

## つまずきやすいところ {#pitfalls}
- 無料枠はメールボックス 3 個、月 3,000 通まで
- 無料枠のメールは `@agentmail.to` のドメインから送られます（独自ドメインは有料プラン）
- MCP サーバーには Node.js（18 以上）が必要です（`npx -y agentmail-mcp`）
- `mcp` の Python パッケージを入れておく必要があります: `pip install mcp`
- 届いたメールをその場で受け取る仕組み（Webhook）には公開サーバーが要ります。個人で使う分には、cron のジョブから `list_threads` を定期的に呼ぶほうが手軽です

## 動作確認 {#verification}
準備ができたら、次で試します。
```
hermes --toolsets mcp -q "Create an AgentMail inbox called test-agent and tell me its email address"
```
新しいメールボックスのアドレスが返ってくるはずです。

## 参考 {#references}
- AgentMail のドキュメント: https://docs.agentmail.to/
- AgentMail のコンソール: https://console.agentmail.to
- AgentMail の MCP リポジトリ: https://github.com/agentmail-to/agentmail-mcp
- 料金: https://www.agentmail.to/pricing
