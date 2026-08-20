---
title: "user-guide/messaging/irc"
description: ""
upstream_path: user-guide/messaging/irc.md
upstream_blob: f9fa9d94ceef9cdd502c535bf5185a341ea8ffd3
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/irc
---

# IRC {#irc}

IRC アダプターは Hermes を任意の IRC サーバーにつなぎ、IRC のチャンネル（またはダイレクトメッセージ）とエージェントの間でメッセージを中継します。Python 標準ライブラリの `asyncio` の上で IRC プロトコルを直接話すので、**外部依存も SDK もデーモンも要りません**。[Libera.Chat](https://libera.chat/) のような公開ネットワークでも、自分で立てた ircd でも動きます。

IRC は素のテキストです。音声・画像・ファイル・スレッド・リアクション・入力中表示・逐次表示には対応していません。返信は `PRIVMSG` の行として送られ、長いメッセージは IRC の 1 行の上限に収まるように分割されます。

> `hermes gateway setup` を実行して **IRC** を選ぶと、対話形式で設定を進められます。

## 事前に必要なもの {#prerequisites}

- 接続先の IRC サーバー（例: `irc.libera.chat`）
- 参加するチャンネル（例: `#hermes`）。カンマ区切りで複数指定できます
- ボットが使うニックネーム（既定: `hermes-bot`）
- 任意: ネットワークが本人確認を求める場合は、登録済みのニックネームと NickServ のパスワード

## Hermes を設定する {#configure-hermes}

IRC の設定方法は 2 通りあります。環境変数だけで手早く済ませる方法と、`~/.hermes/gateway-config.yaml` の `gateway` ブロックに書く方法です。

### 方法 A — gateway-config.yaml {#option-a-gateway-configyaml}

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
| `IRC_CHANNEL` | ✅ | 参加するチャンネル。複数指定するときはカンマ区切りにします |
| `IRC_NICKNAME` | ✅ | ボットのニックネーム（既定: `hermes-bot`） |
| `IRC_PORT` | — | サーバーのポート（既定: TLS ありなら `6697`、なしなら `6667`） |
| `IRC_USE_TLS` | — | TLS を使うかどうか（`true`/`false`。ポート 6697 では既定で `true`） |
| `IRC_SERVER_PASSWORD` | — | `PASS` コマンドで送るサーバーのパスワード |
| `IRC_NICKSERV_PASSWORD` | — | 接続時に自動で IDENTIFY するための NickServ のパスワード |
| `IRC_ALLOWED_USERS` | — | ボットに話しかけられるニックネームをカンマ区切りで指定 |
| `IRC_ALLOW_ALL_USERS` | — | チャンネルにいる誰もがボットに話しかけられるようにします（開発時のみ） |
| `IRC_HOME_CHANNEL` | — | cron や通知の配信先チャンネル（既定は `IRC_CHANNEL`） |

## アクセス制御 {#access-control}

既定では、`allowed_users`（または `IRC_ALLOWED_USERS`）に挙げたニックネームだけがボットに話しかけられます。リストを空にした**うえで** `IRC_ALLOW_ALL_USERS=true` を設定すると、チャンネルにいる誰もが Hermes と会話できます。動作確認には便利ですが、IRC のニックネームはネットワークが NickServ を強制していない限り認証されないため、公開ネットワークではおすすめしません。

ネットワークがニックネームの登録に対応しているなら、`IRC_NICKSERV_PASSWORD`（または `nickserv_password`）を設定しておくと、ボットが接続時に NickServ へ本人確認を行い、登録済みのニックネームを保てます。

## チャンネルとダイレクトメッセージ {#channels-vs-dms}

- 参加中のチャンネルでのメッセージは、**グループ**での会話として扱われます。
- ボット宛てのプライベートメッセージは、**ダイレクトメッセージ**として扱われます。

cron ジョブと通知は**ホームチャンネル**に配信されます。`IRC_HOME_CHANNEL` が設定されていればそこへ、なければ `IRC_CHANNEL` の先頭のチャンネルへ届きます。

## ゲートウェイを起動する {#run-the-gateway}

```bash
hermes gateway start
```

状態は `hermes gateway status` で確認できます。IRC の接続状態もそこに表示され、環境変数だけで設定した場合も同様です。

## 補足 {#notes}

- エージェントの返信が長い場合は、IRC の 1 行の上限に収まるよう自動で複数の `PRIVMSG` に分割されます（`max_message_length`。プロトコルの分を差し引いた既定値は 450 バイトです）。
- アダプターはサーバーとニックネームの組ごとに資格情報のロックを取得するので、2 つの Hermes プロファイルが同じ IRC の識別情報を取り合うことはありません。
