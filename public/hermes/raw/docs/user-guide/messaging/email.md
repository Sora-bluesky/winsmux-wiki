---
title: "メール"
description: "IMAP / SMTP を使って Hermes Agent をメールアシスタントとして設定する"
upstream_path: user-guide/messaging/email.md
upstream_blob: eabde5da496fcddd2bc9511576ac02fba392a5e5
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/email
---

# メールの設定 {#email-setup}

Hermes は標準の IMAP と SMTP を使ってメールを受け取り、返信できます。エージェント用のアドレスにメールを送ると、同じスレッドの中で返事が返ってきます。専用のクライアントやボット用 API は要りません。Gmail、Outlook、Yahoo、Fastmail など、IMAP/SMTP に対応した提供元ならどこでも使えます。

:::info ゲートウェイのアダプター専用 — 外部の依存なし
このページで扱うのはメールのゲートウェイアダプターです。Python に最初から入っている `imaplib`、`smtplib`、`email` の各モジュールだけで動きます。このゲートウェイ経路に限っては、追加のパッケージも外部サービスも要りません。
:::

これは同梱の [Himalaya メールスキル](/hermes/docs/user-guide/skills/bundled/email/email-himalaya/) とは別ものです。あちらはエージェントが端末のコマンドからメールを操作するためのもので、外部の `himalaya` CLI と Himalaya の設定ファイルが必要になります。

| 用途 | 設定するもの | 外部の依存 |
|---|---|---|
| 人が Hermes のエージェントにメールを送り、返信を受け取れるようにする | このページのメールゲートウェイアダプター | IMAP/SMTP のメールアカウント以外は不要 |
| エージェントが端末のツールからメールを読み、書き、移動し、管理できるようにする | Himalaya メールスキル | `himalaya` CLI と `~/.config/himalaya/config.toml` |

---

## 事前に必要なもの {#prerequisites}

- **Hermes のエージェント専用のメールアカウント**（個人用のメールは使わないでください）
- アカウントで **IMAP が有効**になっていること
- Gmail など二要素認証を使う提供元なら **アプリパスワード**

### Gmail の設定 {#gmail-setup}

1. Google アカウントで二要素認証を有効にします
2. [App Passwords](https://myaccount.google.com/apppasswords) を開きます
3. 新しいアプリパスワードを作ります（「メール」か「その他」を選びます）
4. 表示された 16 文字のパスワードを控えます。通常のパスワードの代わりにこれを使います

### Outlook / Microsoft 365 {#outlook-microsoft-365}

1. [Security Settings](https://account.microsoft.com/security) を開きます
2. 二要素認証が未設定なら有効にします
3. 「セキュリティ情報の追加」からアプリパスワードを作ります
4. IMAP のホストは `outlook.office365.com`、SMTP のホストは `smtp.office365.com` です

### そのほかの提供元 {#other-providers}

たいていのメール提供元は IMAP/SMTP に対応しています。次の点を提供元のドキュメントで確認してください。
- IMAP のホストとポート（多くは SSL のポート 993）
- SMTP のホストとポート（多くは STARTTLS のポート 587）
- アプリパスワードが必要かどうか

---

## ステップ 1: Hermes を設定する {#step-1-configure-hermes}

いちばん簡単なやり方は次のとおりです。

```bash
hermes gateway setup
```

プラットフォームの一覧から **Email** を選びます。ウィザードがメールアドレス、パスワード、IMAP/SMTP のホスト、許可する送信者を順に聞いてきます。

### 手作業での設定 {#manual-configuration}

`~/.hermes/.env` に次を書き足します。

```bash
# Required
EMAIL_ADDRESS=hermes@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop    # App password (not your regular password)
EMAIL_IMAP_HOST=imap.gmail.com
EMAIL_SMTP_HOST=smtp.gmail.com

# Security (recommended)
EMAIL_ALLOWED_USERS=your@email.com,colleague@work.com

# Optional
EMAIL_IMAP_PORT=993                    # Default: 993 (IMAP SSL)
EMAIL_SMTP_PORT=587                    # Default: 587 (SMTP STARTTLS)
EMAIL_POLL_INTERVAL=15                 # Seconds between inbox checks (default: 15)
EMAIL_HOME_ADDRESS=your@email.com      # Default delivery target for cron jobs
```

---

## ステップ 2: ゲートウェイを起動する {#step-2-start-the-gateway}

```bash
hermes gateway              # Run in foreground
hermes gateway install      # Install as a user service
sudo hermes gateway install --system   # Linux only: boot-time system service
```

起動したとき、アダプターは次の順に動きます。
1. IMAP と SMTP の接続を確かめます
2. 受信箱にすでにあるメールをすべて「既読」にします（新しいメールだけを処理するためです）
3. 新しいメールの取得を始めます

---

## 動きのしくみ {#how-it-works}

### メールを受け取る {#receiving-messages}

アダプターは IMAP の受信箱を一定の間隔（初期値は 15 秒）で見に行き、未読のメールを拾います。新しいメールごとに次のように扱われます。

- **件名** が文脈として渡されます（たとえば `[Subject: Deploy to production]`）
- **返信メール**（件名が `Re:` で始まるもの）では件名の前置きを省きます。スレッドの流れがすでに伝わっているためです
- **添付ファイル** は手元に保存されます。
  - 画像（JPEG、PNG、GIF、WebP）→ 画像認識ツールから使えます
  - 書類（PDF、ZIP など）→ ファイルとして読めます
- **HTML だけのメール** はタグを取り除いて本文だけを取り出します
- **自分あてのメール** は返信の無限ループを防ぐため除外されます
- **自動送信や noreply の送信者** は黙って無視されます。`noreply@`、`mailer-daemon@`、`bounce@`、`no-reply@` のほか、`Auto-Submitted`、`Precedence: bulk`、`List-Unsubscribe` のヘッダーが付いたメールが対象です

### 返信を送る {#sending-replies}

返信は SMTP で送られ、スレッドが正しくつながるようになっています。

- **In-Reply-To** と **References** のヘッダーでスレッドを保ちます
- **件名** は `Re:` を付けて引き継ぎます（`Re: Re:` と重ねません）
- **Message-ID** はエージェントのドメインで作られます
- 本文はプレーンテキスト（UTF-8）で送られます

### ファイルの添付 {#file-attachments}

エージェントは返信にファイルを添付できます。応答の中に `MEDIA:/path/to/file` と書けば、そのファイルが送信するメールに添付されます。

### 添付を読み飛ばす {#skipping-attachments}

届いた添付をすべて無視したいとき（マルウェア対策や通信量の節約など）は、`config.yaml` に次を書き足します。

```yaml
platforms:
  email:
    skip_attachments: true
```

有効にすると、添付と本文に埋め込まれたパートが、中身を取り出す前に読み飛ばされます。メール本文のテキストはこれまでどおり処理されます。

---

## アクセスの制御 {#access-control}

メールのアクセス制御は、チャット系のプラットフォームより初期状態が厳しめです。

1. **`EMAIL_ALLOWED_USERS` を設定している** → そのアドレスから来たメールだけを処理します
2. **許可リストがない** → 知らない送信者は黙って無視されます
3. **`EMAIL_ALLOW_ALL_USERS=true`** → どの送信者も受け付けます（扱いには注意してください）
4. **`platforms.email.unauthorized_dm_behavior: pair`** → 知らない送信者にペアリング用のコードを返します

:::warning
**ふだんの運用では専用の受信箱を用意し、`EMAIL_ALLOWED_USERS` を設定してください。** メールのペアリングを既定にしていないのは、共有の受信箱には関係のない未読メールが混ざっていることが多く、Hermes がそうした相手に勝手に返信しないようにするためです。
:::

---

## 困ったときは {#troubleshooting}

| 症状 | 対処 |
|---------|----------|
| 起動時に **"IMAP connection failed"** と出る | `EMAIL_IMAP_HOST` と `EMAIL_IMAP_PORT` を確かめます。アカウントで IMAP が有効かも確認してください。Gmail なら「設定 → メール転送と POP/IMAP」で有効にします。 |
| 起動時に **"SMTP connection failed"** と出る | `EMAIL_SMTP_HOST` と `EMAIL_SMTP_PORT` を確かめます。パスワードが正しいかも確認してください（Gmail はアプリパスワードを使います）。 |
| **メールが届かない** | `EMAIL_ALLOWED_USERS` に送信者のアドレスが入っているか確かめます。迷惑メールフォルダーも見てください。自動返信を迷惑メール扱いにする提供元があります。 |
| **"Authentication failed"** と出る | Gmail では通常のパスワードではなくアプリパスワードが必要です。先に二要素認証を有効にしてください。 |
| **同じ返信が二重に届く** | ゲートウェイが一つだけ動いているか確かめます。`hermes gateway status` で確認できます。 |
| **返事が遅い** | 取得の間隔は初期値で 15 秒です。`EMAIL_POLL_INTERVAL=5` にすると速くなります（そのぶん IMAP への接続は増えます）。 |
| **返信がスレッドにまとまらない** | アダプターは In-Reply-To ヘッダーを使っています。メールクライアントによっては（とくにブラウザで使うもの）自動送信のメールをうまくまとめないことがあります。 |

---

## セキュリティ {#security}

:::warning
**専用のメールアカウントを使ってください。** 個人用のメールは避けます。エージェントはパスワードを `.env` に保存し、IMAP で受信箱すべてに触れられるためです。
:::

- 主パスワードではなく **アプリパスワード** を使います（Gmail で二要素認証を使う場合は必須です）
- `EMAIL_ALLOWED_USERS` を設定して、エージェントとやり取りできる相手を絞ります
- パスワードは `~/.hermes/.env` に保存されます。このファイルは守ってください（`chmod 600`）
- IMAP は SSL（ポート 993）、SMTP は STARTTLS（ポート 587）が初期値です。通信は暗号化されます

---

## 環境変数の一覧 {#environment-variables-reference}

| 変数 | 必須 | 初期値 | 説明 |
|----------|----------|---------|-------------|
| `EMAIL_ADDRESS` | はい | — | エージェントのメールアドレス |
| `EMAIL_PASSWORD` | はい | — | メールのパスワード、またはアプリパスワード |
| `EMAIL_IMAP_HOST` | はい | — | IMAP サーバーのホスト（例: `imap.gmail.com`） |
| `EMAIL_SMTP_HOST` | はい | — | SMTP サーバーのホスト（例: `smtp.gmail.com`） |
| `EMAIL_IMAP_PORT` | いいえ | `993` | IMAP サーバーのポート |
| `EMAIL_SMTP_PORT` | いいえ | `587` | SMTP サーバーのポート |
| `EMAIL_POLL_INTERVAL` | いいえ | `15` | 受信箱を見に行く間隔（秒） |
| `EMAIL_ALLOWED_USERS` | いいえ | — | 許可する送信者のアドレス（カンマ区切り） |
| `EMAIL_HOME_ADDRESS` | いいえ | — | cron ジョブの既定の送り先 |
| `EMAIL_ALLOW_ALL_USERS` | いいえ | `false` | すべての送信者を許可します（おすすめしません） |
