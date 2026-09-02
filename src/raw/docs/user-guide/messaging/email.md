---
title: "メール"
description: "IMAP/SMTP 経由で Hermes Agent をメール応対の相棒として設定する"
upstream_path: user-guide/messaging/email.md
upstream_blob: 71f932d6e927131e66887698730c1e61f6440ecb
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/email
---

# メールの設定 {#email-setup}

Hermes は標準の IMAP と SMTP でメールを受け取り、返信できます。エージェントのアドレス宛にメールを送ると、同じスレッドの中で返事が返ってきます。専用のクライアントもボット API も要りません。Gmail、Outlook、Yahoo、Fastmail など、IMAP/SMTP に対応した提供元ならどれでも動きます。

:::info ゲートウェイのアダプターだけで完結します（外部依存なし）
このページで扱うのはメールのゲートウェイアダプターで、Python に最初から入っている `imaplib`、`smtplib`、`email` の各モジュールを使います。この経路では追加のパッケージも外部サービスも必要ありません。
:::

これは同梱の [Himalaya メールスキル](/hermes/docs/user-guide/skills/bundled/email/email-himalaya/) とは別物です。あちらはエージェントがターミナルのコマンド越しにメールを扱うためのもので、外部の `himalaya` CLI と Himalaya の設定ファイルが要ります。

| やりたいこと | 設定する対象 | 外部依存 |
|---|---|---|
| Hermes エージェントにメールを送って返信を受け取れるようにする | このページのメールゲートウェイアダプター | IMAP/SMTP のメールアカウント以外は不要 |
| ターミナルの道具からメールボックスの中身を調べる・書く・移動する・管理する | Himalaya メールスキル | `himalaya` CLI と `~/.config/himalaya/config.toml` |

---

## 事前に用意するもの {#prerequisites}

- Hermes エージェント専用の**メールアカウント**（普段使いのメールは使わないでください）
- そのアカウントで **IMAP が有効**になっていること
- Gmail など二段階認証を使う提供元なら**アプリパスワード**

### Gmail の設定 {#gmail-setup}

1. Google アカウントで二段階認証を有効にします
2. [アプリパスワード](https://myaccount.google.com/apppasswords) のページを開きます
3. 新しいアプリパスワードを作ります（「メール」か「その他」を選びます）
4. 表示された 16 文字のパスワードを控えます。普段のパスワードの代わりにこれを使います

### Outlook / Microsoft 365 {#outlook-microsoft-365}

1. [セキュリティ設定](https://account.microsoft.com/security) を開きます
2. 二段階認証がまだなら有効にします
3. 「セキュリティ情報の追加」からアプリパスワードを作ります
4. IMAP のホストは `outlook.office365.com`、SMTP のホストは `smtp.office365.com` です

### そのほかの提供元 {#other-providers}

たいていのメール提供元は IMAP/SMTP に対応しています。次の点を提供元の案内で確かめてください。
- IMAP のホストとポート（多くはポート 993 で SSL）
- SMTP のホストとポート（多くはポート 587 で STARTTLS）
- アプリパスワードが必要かどうか

### Proton Mail Bridge やローカルの中継 {#proton-mail-bridge-local-relays}

Proton Mail Bridge（自前で立てた MTA のような中継も同じです）は
ループバック上で **STARTTLS** と自己署名証明書を使って待ち受けます。そのため既定値
（IMAP 993 での暗黙の TLS と証明書の検証）のままではつながりません。
`~/.hermes/config.yaml` で通信のしかたを上書きします。

```yaml
platforms:
  email:
    enabled: true
    extra:
      imap_host: 127.0.0.1
      imap_security: starttls     # tls (default) | starttls | plain
      imap_tls_verify: false      # Bridge uses a self-signed cert
      smtp_host: 127.0.0.1
      smtp_security: starttls     # default: tls on port 465, starttls otherwise
      smtp_tls_verify: false
```

あわせて `~/.hermes/.env` に Bridge の認証情報と一緒に `EMAIL_IMAP_PORT=1143` と
`EMAIL_SMTP_PORT=1025` を書きます。`*_security` に知らない値を書くと警告が出て、
安全な既定値に戻ります。`*_tls_verify` を切ってよいのはループバックのホストだけです。
それ以外のホストで検証を切ると、Hermes が警告を出します。

---

## 手順 1: Hermes を設定する {#step-1-configure-hermes}

いちばん簡単なのはこれです。

```bash
hermes gateway setup
```

プラットフォームの一覧から **Email** を選びます。ウィザードがメールアドレス、パスワード、IMAP/SMTP のホスト、許可する差出人を順に聞いてきます。

### 手で設定する場合 {#manual-configuration}

`~/.hermes/.env` に次を足します。

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

## 手順 2: ゲートウェイを起動する {#step-2-start-the-gateway}

```bash
hermes gateway              # Run in foreground
hermes gateway install      # Install as a user service
sudo hermes gateway install --system   # Linux only: boot-time system service
```

起動すると、アダプターは次の順に動きます。
1. IMAP と SMTP の接続を試します
2. 受信箱にある既存のメールをすべて「既読」にします（以後は新着だけを扱います）
3. 新着メールの巡回を始めます

---

## しくみ {#how-it-works}

### メールを受け取る {#receiving-messages}

アダプターは IMAP の受信箱を決まった間隔（既定は 15 秒）で見に行き、未読のメールを拾います。新しいメール 1 通ごとに次のように扱われます。

- **件名**が文脈として添えられます（例: `[Subject: Deploy to production]`）
- **返信メール**（件名が `Re:` で始まるもの）では件名の頭書きを省きます。スレッドの文脈はもう伝わっているからです
- **添付ファイル**は手元に控えられます:
  - 画像（JPEG、PNG、GIF、WebP）→ 画像を見る道具から使えます
  - 書類（PDF、ZIP など）→ ファイルとして開けます
- **HTML だけのメール**はタグを取り除いて本文を取り出します
- **自分宛のメール**は返信の堂々巡りを防ぐために除かれます
- **自動送信や返信不要の差出人**は黙って無視されます。`noreply@`、`mailer-daemon@`、`bounce@`、`no-reply@` のほか、`Auto-Submitted`、`Precedence: bulk`、`List-Unsubscribe` のヘッダーが付いたメールが該当します

### 返信を送る {#sending-replies}

返信は SMTP で送られ、スレッドがきちんとつながるようになっています。

- **In-Reply-To** と **References** のヘッダーでスレッドを保ちます
- **件名**は `Re:` を付けて引き継ぎます（`Re: Re:` と重なることはありません）
- **Message-ID** はエージェントのドメインで作られます
- 返信はプレーンテキスト（UTF-8）で送られます

### ファイルを添付する {#file-attachments}

エージェントは返信にファイルを添付できます。返答の中に `MEDIA:/path/to/file` と書けば、そのファイルが送信するメールに添付されます。

### 添付を受け取らない {#skipping-attachments}

届いた添付をすべて無視したいとき（不正なファイルを避けたい、通信量を抑えたいなど）は、`config.yaml` に次を足します。

```yaml
platforms:
  email:
    skip_attachments: true
```

有効にすると、添付と本文に埋め込まれた部分は中身を読み解く前に飛ばされます。メール本文の文章はこれまでどおり処理されます。

---

## 誰に応じるかを決める {#access-control}

メールの応対範囲は、チャット系のプラットフォームより既定で厳しめです。

1. **`EMAIL_ALLOWED_USERS` を設定した場合** → そのアドレスから届いたメールだけを処理します
2. **許可リストを設定しない場合** → 見知らぬ差出人は黙って無視されます
3. **`EMAIL_ALLOW_ALL_USERS=true`** → どんな差出人でも受け付けます（気をつけて使ってください）
4. **`platforms.email.unauthorized_dm_behavior: pair`** → 見知らぬ差出人にはペアリング用のコードが届きます

:::warning
**普段の運用では、専用の受信箱を用意して `EMAIL_ALLOWED_USERS` を設定してください。** メールのペアリングを既定で切ってあるのは、共有の受信箱には関係のない未読メールが溜まりがちで、Hermes がその相手に勝手に返事をするべきではないからです。
:::

---

## うまくいかないとき {#troubleshooting}

| 症状 | 対処 |
|---------|----------|
| 起動時に **"IMAP connection failed"** と出る | `EMAIL_IMAP_HOST` と `EMAIL_IMAP_PORT` を確かめてください。アカウントで IMAP が有効かどうかも見ます。Gmail なら設定の「メール転送と POP/IMAP」から有効にします。 |
| 起動時に **"SMTP connection failed"** と出る | `EMAIL_SMTP_HOST` と `EMAIL_SMTP_PORT` を確かめてください。パスワードが合っているかも見ます（Gmail ならアプリパスワードを使います）。 |
| **メールが届かない** | `EMAIL_ALLOWED_USERS` に差出人のアドレスが入っているか確かめてください。迷惑メールフォルダも見ます。自動返信を迷惑メール扱いにする提供元があります。 |
| **"Authentication failed"** と出る | Gmail では普段のパスワードではなくアプリパスワードが必要です。先に二段階認証を有効にしてください。 |
| **同じ返信が二重に届く** | ゲートウェイが一つだけ動いているか確かめてください。`hermes gateway status` で見られます。 |
| **返事が遅い** | 巡回の間隔は既定で 15 秒です。`EMAIL_POLL_INTERVAL=5` にすると速くなります（そのぶん IMAP への接続は増えます）。 |
| **返信がスレッドにつながらない** | アダプターは In-Reply-To ヘッダーを使います。メールクライアントによっては（とくにブラウザで使うもの）自動送信のメールをうまくつなげないことがあります。 |

---

## 安全に使うために {#security}

:::warning
**専用のメールアカウントを使ってください。** 普段使いのメールは避けます。エージェントはパスワードを `.env` に保存し、IMAP で受信箱の中身をすべて見られる状態になります。
:::

- 主なパスワードではなく**アプリパスワード**を使います（二段階認証を使う Gmail では必須です）
- `EMAIL_ALLOWED_USERS` を設定して、エージェントとやりとりできる相手を絞ります
- パスワードは `~/.hermes/.env` に保存されます。このファイルは守ってください（`chmod 600`）
- 既定では IMAP が SSL（ポート 993）、SMTP が STARTTLS（ポート 587）を使います。通信は暗号化されます

---

## 環境変数の一覧 {#environment-variables-reference}

| 変数 | 必須 | 既定値 | 説明 |
|----------|----------|---------|-------------|
| `EMAIL_ADDRESS` | はい | — | エージェントのメールアドレス |
| `EMAIL_PASSWORD` | はい | — | メールのパスワードまたはアプリパスワード |
| `EMAIL_IMAP_HOST` | はい | — | IMAP サーバーのホスト（例: `imap.gmail.com`） |
| `EMAIL_SMTP_HOST` | はい | — | SMTP サーバーのホスト（例: `smtp.gmail.com`） |
| `EMAIL_IMAP_PORT` | いいえ | `993` | IMAP サーバーのポート |
| `EMAIL_SMTP_PORT` | いいえ | `587` | SMTP サーバーのポート |
| `EMAIL_POLL_INTERVAL` | いいえ | `15` | 受信箱を見に行く間隔（秒） |
| `EMAIL_ALLOWED_USERS` | いいえ | — | 許可する差出人アドレスをカンマ区切りで |
| `EMAIL_HOME_ADDRESS` | いいえ | — | cron ジョブの既定の宛先 |
| `EMAIL_ALLOW_ALL_USERS` | いいえ | `false` | すべての差出人を許可（おすすめしません） |
