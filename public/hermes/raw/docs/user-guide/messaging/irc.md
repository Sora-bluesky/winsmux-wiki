---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "IRC"
description: ""
upstream_path: user-guide/messaging/irc.md
upstream_blob: 4fd21061621fc5e44a64222b7813561b41b28dd9
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/irc
---

# IRC {#irc}

IRC アダプターは Hermes を任意の IRC サーバーにつなぎ、IRC のチャンネル（またはダイレクトメッセージ）とエージェントのあいだでメッセージを中継します。IRC プロトコルは Python 標準ライブラリの `asyncio` だけで話します。**外部の依存パッケージも SDK も常駐プロセスも必要ありません**。[Libera.Chat](https://libera.chat/) のような公開ネットワークでも、自分で立てた ircd でも動きます。

IRC は素のテキストだけの世界なので、音声・画像・ファイル・スレッド・リアクション・入力中表示・逐次表示には対応していません。返信は `PRIVMSG` の行として送られ、長いメッセージは IRC の行長制限に収まるように分割されます。

> `hermes gateway setup` を実行して **IRC** を選ぶと、対話形式で設定を進められます。

## 前提 {#prerequisites}

- つなぎ先の IRC サーバー（例: `irc.libera.chat`）
- 参加するチャンネル（例: `#hermes`）。カンマ区切りで複数参加できます
- ボットが名乗るニックネーム（既定値: `hermes-bot`）
- 任意: ネットワークが本人確認を求める場合は、登録済みのニックと NickServ のパスワード

## Hermes を設定する {#configure-hermes}

IRC の設定は 2 通りあります。環境変数だけで手早く済ませる方法と、`~/.hermes/config.yaml` の `gateway` ブロックに書く方法です。

### 方法 A — config.yaml {#option-a-configyaml}

```yaml
gateway:
  platforms:
    irc:
      enabled: true
      extra:
        server: irc.libera.chat
        port: 6697
        nickname: hermes-bot
        channel: "#hermes"
        use_tls: true
        server_password: ""       # optional server password
        nickserv_password: ""     # optional NickServ identification
        allowed_users: []         # empty = allow all, or list of nicks
        max_message_length: 450   # IRC line limit (safe default)
```

### 方法 B — 環境変数 {#option-b-environment-variables}

| 変数 | 必須 | 説明 |
|----------|:--------:|-------------|
| `IRC_SERVER` | ✅ | IRC サーバーのホスト名（例: `irc.libera.chat`） |
| `IRC_CHANNEL` | ✅ | 参加するチャンネル。複数指定するときはカンマ区切り |
| `IRC_NICKNAME` | ✅ | ボットのニックネーム（既定値: `hermes-bot`） |
| `IRC_PORT` | — | サーバーのポート（既定値: TLS ありで `6697`、なしで `6667`） |
| `IRC_USE_TLS` | — | TLS を使うかどうか（`true`/`false`。ポート 6697 では既定で `true`） |
| `IRC_SERVER_PASSWORD` | — | `PASS` コマンドで送るサーバーのパスワード |
| `IRC_NICKSERV_PASSWORD` | — | 接続時に自動で IDENTIFY するための NickServ のパスワード |
| `IRC_ALLOWED_USERS` | — | ボットに話しかけられるニックをカンマ区切りで指定 |
| `IRC_ALLOW_ALL_USERS` | — | チャンネルにいる全員がボットに話しかけられるようにする（開発用途のみ） |
| `IRC_HOME_CHANNEL` | — | cron や通知の送り先チャンネル（未指定なら `IRC_CHANNEL`） |

## アクセス制御 {#access-control}

既定では、`allowed_users`（または `IRC_ALLOWED_USERS`）に挙げたニックだけがボットに話しかけられます。この一覧を空にした**うえで** `IRC_ALLOW_ALL_USERS=true` を設定すると、チャンネルにいる誰もが Hermes と会話できます。試すときには便利ですが、ネットワークが NickServ を強制していないかぎり IRC のニックは本人確認されないため、公開ネットワークではおすすめしません。

ニックの登録制度があるネットワークでは `IRC_NICKSERV_PASSWORD`（または `nickserv_password`）を設定してください。接続時にボットが NickServ へ本人確認を行い、登録済みのニックを保てます。

## チャンネルと DM の違い {#channels-vs-dms}

- 参加中のチャンネルでのメッセージは**グループ**の会話として扱われます。
- ボット宛てのプライベートメッセージは**ダイレクトメッセージ**として扱われます。

cron ジョブと通知は**ホームチャンネル**に届きます。`IRC_HOME_CHANNEL` を設定していればそこへ、していなければ `IRC_CHANNEL` の先頭のチャンネルへ送られます。

## ゲートウェイを起動する {#run-the-gateway}

```bash
hermes gateway start
```

状態は `hermes gateway status` で確認します。環境変数だけで設定した場合も含め、IRC の接続状態はここに表示されます。

## 補足 {#notes}

- エージェントの返信が長いときは、IRC の行長制限（`max_message_length`。プロトコルのオーバーヘッドを引いた既定値は 450 バイト）に収まるよう、複数の `PRIVMSG` 行へ自動的に分割されます。
- アダプターはサーバーとニックの組ごとに専用の認証情報ロックを取るため、2 つの Hermes プロファイルが同じ IRC の名義を奪い合うことはありません。
