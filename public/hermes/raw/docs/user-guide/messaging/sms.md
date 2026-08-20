---
title: "SMS（Twilio）"
description: "Hermes Agent を Twilio 経由の SMS チャットボットとして設定する"
upstream_path: user-guide/messaging/sms.md
upstream_blob: 8878cc5f0ab5bac6e5741e2954c56248bd08ccc7
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/sms
---

# SMS の設定（Twilio） {#sms-setup-twilio}

Hermes は [Twilio](https://www.twilio.com/) の API を通して SMS につながります。相手が Twilio の電話番号にショートメッセージを送ると、AI からの返事がそのまま返ってきます。Telegram や Discord と同じ会話体験を、ふつうのショートメッセージの上で味わえるということです。

:::info 共通の認証情報
SMS ゲートウェイは、任意で追加できる[電話スキル](/hermes/docs/reference/skills-catalog/)と認証情報を共有します。音声通話や単発の SMS のためにすでに Twilio を設定してあるなら、同じ `TWILIO_ACCOUNT_SID`、`TWILIO_AUTH_TOKEN`、`TWILIO_PHONE_NUMBER` のままゲートウェイも動きます。
:::

---

## 前提条件 {#prerequisites}

- **Twilio アカウント** — [twilio.com で登録します](https://www.twilio.com/try-twilio)（無料トライアルあり）
- **SMS を扱える Twilio の電話番号**
- **外部から到達できるサーバー** — SMS が届いたとき、Twilio はあなたのサーバーへ webhook を送ります
- **aiohttp** — `cd ~/.hermes/hermes-agent && uv pip install -e ".[sms]"` でインストールします

---

## ステップ 1: Twilio の認証情報を取得する {#step-1-get-your-twilio-credentials}

1. [Twilio コンソール](https://console.twilio.com/)を開きます
2. ダッシュボードから **Account SID** と **Auth Token** をコピーします
3. **Phone Numbers → Manage → Active Numbers** へ進み、E.164 形式の電話番号（例: `+15551234567`）を控えます

---

## ステップ 2: Hermes を設定する {#step-2-configure-hermes}

### 対話式のセットアップ（おすすめ） {#interactive-setup-recommended}

```bash
hermes gateway setup
```

プラットフォームの一覧から **SMS (Twilio)** を選びます。ウィザードが認証情報を順に聞いてくれます。

### 手動で設定する {#manual-setup}

`~/.hermes/.env` に次を追記します。

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567

# Security: restrict to specific phone numbers (recommended)
SMS_ALLOWED_USERS=+15559876543,+15551112222

# Optional: set a home channel for cron job delivery
SMS_HOME_CHANNEL=+15559876543
```

---

## ステップ 3: Twilio の webhook を設定する {#step-3-configure-twilio-webhook}

受信したメッセージをどこへ送ればよいか、Twilio に教える必要があります。[Twilio コンソール](https://console.twilio.com/)で次のように操作します。

1. **Phone Numbers → Manage → Active Numbers** を開きます
2. 対象の電話番号をクリックします
3. **Messaging → A MESSAGE COMES IN** で次を設定します
   - **Webhook**: `https://your-server:8080/webhooks/twilio`
   - **HTTP Method**: `POST`

:::tip webhook を外部に公開する
Hermes を手元のマシンで動かしている場合は、トンネルを使って webhook を外から届く形にします。

```bash
# Using cloudflared
cloudflared tunnel --url http://localhost:8080

# Using ngrok
ngrok http 8080
```

表示された公開 URL を、そのまま Twilio の webhook に設定します。
:::

**Twilio に設定したものと同じ URL を `SMS_WEBHOOK_URL` にも指定してください。** Twilio の署名検証に必要なので、これがないとアダプターは起動を拒否します。

```bash
# Must match the webhook URL in your Twilio Console
SMS_WEBHOOK_URL=https://your-server:8080/webhooks/twilio
```

webhook のポートは既定で `8080` です。変えたいときは次のように指定します。

```bash
SMS_WEBHOOK_PORT=3000
```

---

## ステップ 4: ゲートウェイを起動する {#step-4-start-the-gateway}

```bash
hermes gateway
```

次のような表示が出れば起動できています。

```
[sms] Twilio webhook server listening on 127.0.0.1:8080, from: +1555***4567
```

`Refusing to start: SMS_WEBHOOK_URL is required` と出た場合は、Twilio コンソールに設定した公開 URL を `SMS_WEBHOOK_URL` に指定してください（ステップ 3 を参照）。

Twilio の番号にメッセージを送ってみると、Hermes が SMS で返事をします。

---

## 環境変数 {#environment-variables}

| 変数 | 必須 | 説明 |
|----------|----------|-------------|
| `TWILIO_ACCOUNT_SID` | はい | Twilio の Account SID（`AC` で始まります） |
| `TWILIO_AUTH_TOKEN` | はい | Twilio の Auth Token（webhook の署名検証にも使われます） |
| `TWILIO_PHONE_NUMBER` | はい | 自分の Twilio 電話番号（E.164 形式） |
| `SMS_WEBHOOK_URL` | はい | Twilio の署名検証に使う公開 URL。Twilio コンソールの webhook URL と一致させます |
| `SMS_WEBHOOK_PORT` | いいえ | webhook を待ち受けるポート（既定: `8080`） |
| `SMS_WEBHOOK_HOST` | いいえ | webhook のバインドアドレス（既定: `127.0.0.1`） |
| `SMS_INSECURE_NO_SIGNATURE` | いいえ | `true` にすると署名検証を無効化します（ローカル開発専用。**本番では使わないでください**） |
| `SMS_ALLOWED_USERS` | いいえ | 会話を許可する電話番号（E.164 形式、カンマ区切り） |
| `SMS_ALLOW_ALL_USERS` | いいえ | `true` にすると誰でも使えるようになります（おすすめしません） |
| `SMS_HOME_CHANNEL` | いいえ | 定期ジョブや通知の届け先となる電話番号 |
| `SMS_HOME_CHANNEL_NAME` | いいえ | ホームチャンネルの表示名（既定: `Home`） |

---

## SMS ならではの挙動 {#sms-specific-behavior}

- **プレーンテキストのみ** — SMS では Markdown が記号のまま表示されてしまうため、自動的に取り除かれます
- **1600 文字の上限** — それより長い返答は、改行、次に空白といった自然な区切りで複数のメッセージに分割されます
- **エコー防止** — 自分の Twilio 番号から届いたメッセージは無視され、返信の無限ループを防ぎます
- **電話番号の伏せ字化** — プライバシー保護のため、ログ上の電話番号は伏せられます

---

## セキュリティ {#security}

### webhook の署名検証 {#webhook-signature-validation}

Hermes は `X-Twilio-Signature` ヘッダー（HMAC-SHA1）を検証し、届いた webhook が本当に Twilio から来たものかを確かめます。これにより、攻撃者が偽のメッセージを流し込むのを防げます。

**`SMS_WEBHOOK_URL` は必須です。** Twilio コンソールに設定した公開 URL を指定してください。指定がないとアダプターは起動を拒否します。

公開 URL のないローカル開発では、検証を無効化できます。

```bash
# Local dev only — NOT for production
SMS_INSECURE_NO_SIGNATURE=true
```

### 利用者の許可リスト {#user-allowlists}

**ゲートウェイは既定ですべての利用者を拒否します。** 許可リストを設定してください。

```bash
# Recommended: restrict to specific phone numbers
SMS_ALLOWED_USERS=+15559876543,+15551112222

# Or allow all (NOT recommended for bots with terminal access)
SMS_ALLOW_ALL_USERS=true
```

:::warning
SMS そのものには暗号化の仕組みがありません。何が起こりうるかを理解していないうちは、機微な操作を SMS で行わないでください。慎重に扱いたい用途では Signal や Telegram のほうが向いています。
:::

---

## 困ったときは {#troubleshooting}

### メッセージが届かない {#messages-not-arriving}

1. Twilio の webhook URL が正しく、外部から到達できるか確かめます
2. `TWILIO_ACCOUNT_SID` と `TWILIO_AUTH_TOKEN` が正しいか確かめます
3. Twilio コンソールの **Monitor → Logs → Messaging** で配信エラーが出ていないか見ます
4. 自分の電話番号が `SMS_ALLOWED_USERS` に入っているか（または `SMS_ALLOW_ALL_USERS=true` か）確かめます

### 返信が送られない {#replies-not-sending}

1. `TWILIO_PHONE_NUMBER` が正しく設定されているか確かめます（`+` 付きの E.164 形式）
2. Twilio アカウントに SMS 対応の番号があるか確かめます
3. Hermes ゲートウェイのログに Twilio API のエラーが出ていないか見ます

### webhook のポートがぶつかる {#webhook-port-conflicts}

ポート 8080 がすでに使われている場合は、別のポートに変えます。

```bash
SMS_WEBHOOK_PORT=3001
```

Twilio コンソール側の webhook URL も、同じポートに合わせて更新してください。
