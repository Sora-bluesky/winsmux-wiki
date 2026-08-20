---
title: "Imessage — macOS の imsg CLI で iMessage / SMS を送受信する"
description: "macOS の imsg CLI で iMessage / SMS を送受信する"
upstream_path: user-guide/skills/bundled/apple/apple-imessage.md
upstream_blob: d29fab6ebc73a3802a0c68a41845699e1c024af3
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/apple/apple-imessage
---

# Imessage {#imessage}

macOS の imsg CLI で iMessage / SMS を送受信します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/apple/imessage` |
| バージョン | `1.0.0` |
| 作者 | Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | macos |
| タグ | `iMessage`, `SMS`, `messaging`, `macOS`, `Apple` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# iMessage {#imessage}

`imsg` を使うと、macOS のメッセージ.app 経由で iMessage / SMS を読み書きできます。

## 事前に必要なもの {#prerequisites}

- **macOS** と、サインイン済みのメッセージ.app
- インストール: `brew install steipete/tap/imsg`
- ターミナルにフルディスクアクセスを許可してください（システム設定 → プライバシー → フルディスクアクセス）
- 確認を求められたら、メッセージ.app へのオートメーション権限を許可してください

## こんなときに使います {#when-to-use}

- iMessage やショートメッセージを送ってほしいと言われたとき
- iMessage のやり取りをさかのぼって読みたいとき
- メッセージ.app の最近のやり取りを確認したいとき
- 電話番号や Apple ID あてに送りたいとき

## 使わないほうがよい場面 {#when-not-to-use}

- Telegram / Discord / Slack / WhatsApp のメッセージ → それぞれのゲートウェイのチャンネルを使ってください
- グループチャットの管理（メンバーの追加・削除）→ 対応していません
- 大量に一斉送信する用途 → 必ず先に本人に確認してください

## 早見表 {#quick-reference}

### やり取りの一覧 {#list-chats}

```bash
imsg chats --limit 10 --json
```

### 履歴を見る {#view-history}

```bash
# By chat ID
imsg history --chat-id 1 --limit 20 --json

# With attachments info
imsg history --chat-id 1 --limit 20 --attachments --json
```

### メッセージを送る {#send-messages}

```bash
# Text only
imsg send --to "+14155551212" --text "Hello!"

# With attachment
imsg send --to "+14155551212" --text "Check this out" --file /path/to/image.jpg

# Force iMessage or SMS
imsg send --to "+14155551212" --text "Hi" --service imessage
imsg send --to "+14155551212" --text "Hi" --service sms
```

### 新着メッセージを見張る {#watch-for-new-messages}

```bash
imsg watch --chat-id 1 --attachments
```

## 送信方法の選択肢 {#service-options}

- `--service imessage` — iMessage で送ります（相手が iMessage を使えることが前提です）
- `--service sms` — SMS で送ります（緑色の吹き出しになります）
- `--service auto` — メッセージ.app に任せます（既定）

## ルール {#rules}

1. **送る前に、宛先と本文を必ず確認します**
2. **知らない番号には送りません**。本人がはっきり許可した場合だけにします
3. **添付するファイルのパスが実在するか確かめます**
4. **送りすぎないこと**。自分で送信の間隔を空けます

## 実際の流れの例 {#example-workflow}

本人からの依頼:「お母さんに遅れると送っておいて」

```bash
# 1. Find mom's chat
imsg chats --limit 20 --json | jq '.[] | select(.displayName | contains("Mom"))'

# 2. Confirm with user: "Found Mom at +1555123456. Send 'I'll be late' via iMessage?"

# 3. Send after confirmation
imsg send --to "+1555123456" --text "I'll be late"
```
