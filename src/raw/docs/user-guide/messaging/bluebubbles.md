---
title: "BlueBubbles（iMessage）"
description: ""
upstream_path: user-guide/messaging/bluebubbles.md
upstream_blob: 12efd3823bcde90ad642c0deb565d7314d9eb642
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/bluebubbles
---

# BlueBubbles（iMessage） {#bluebubbles-imessage}

[BlueBubbles](https://bluebubbles.app/) を使って、Hermes を Apple の iMessage につなぎます。BlueBubbles は無料の macOS 向けサーバーで、ソースも公開されており、iMessage をどの端末からでも使えるように橋渡しします。

## 事前に必要なもの {#prerequisites}

- [BlueBubbles Server](https://bluebubbles.app/) を動かしっぱなしにできる **Mac** が一台
- その Mac の メッセージ.app に Apple ID でサインインしていること
- BlueBubbles Server の v1.0.0 以降（Webhook にはこのバージョンが必要です）
- Hermes と BlueBubbles サーバーのあいだが、ネットワークでつながっていること

## 設定 {#setup}

### 1. BlueBubbles Server を入れる {#1-install-bluebubbles-server}

[bluebubbles.app](https://bluebubbles.app/) からダウンロードしてインストールします。セットアップウィザードを最後まで進め、Apple ID でサインインし、つなぎ方（ローカルネットワーク、Ngrok、Cloudflare、ダイナミック DNS のいずれか）を選びます。

### 2. サーバー URL とパスワードを控える {#2-get-your-server-url-and-password}

BlueBubbles Server の **Settings → API** を開き、次の二つを控えます。
- **Server URL**（例: `http://192.168.1.10:1234`）
- **Server Password**

### 3. Hermes を設定する {#3-configure-hermes}

セットアップウィザードを動かします。

```bash
hermes gateway setup
```

**BlueBubbles (iMessage)** を選び、サーバー URL とパスワードを入力します。

`~/.hermes/.env` に環境変数を直接書いてもかまいません。

```bash
BLUEBUBBLES_SERVER_URL=http://192.168.1.10:1234
BLUEBUBBLES_PASSWORD=your-server-password
```

#### 任意: グループチャットで呼びかけを必須にする {#optional-require-mentions-in-group-chats}

初期状態では、Hermes は許可済みの BlueBubbles / iMessage の個別チャットにもグループのメッセージにも、すべて返事をします。グループチャットだけは呼びかけられたときに限りたい場合は、メンションによる制限を有効にします。

```yaml
platforms:
  bluebubbles:
    enabled: true
    extra:
      require_mention: true
```

`require_mention: true` にすると、個別のやり取りはこれまでどおり動き、グループチャットのメッセージは呼びかけのパターンに合致しないかぎり無視されます。パターンを自分で決めていない場合、Hermes は `Hermes` と `@Hermes agent` の言い回しに合わせた、控えめな初期値を使います。

エージェントの名前を変えているときは、正規表現でパターンを指定します。

```yaml
platforms:
  bluebubbles:
    extra:
      require_mention: true
      mention_patterns:
        - '(?<![\w@])@?amos\b[,:\-]?'
```

### 4. 使える人を許可する {#4-authorize-users}

やり方は次のうちどれか一つを選びます。

**個別チャットでのペアリング（おすすめ）:**
誰かがあなたの iMessage にメッセージを送ると、Hermes が自動でペアリングコードを返します。次のコマンドで承認します。
```bash
hermes pairing approve bluebubbles <CODE>
```
`hermes pairing list` を使うと、承認待ちのコードと承認済みの相手を確認できます。

**特定の相手をあらかじめ許可する**（`~/.hermes/.env` に記述）:
```bash
BLUEBUBBLES_ALLOWED_USERS=user@icloud.com,+15551234567
```

**誰でも使えるようにする**（`~/.hermes/.env` に記述）:
```bash
BLUEBUBBLES_ALLOW_ALL_USERS=true
```

### 5. ゲートウェイを動かす {#5-start-the-gateway}

```bash
hermes gateway run
```

Hermes が BlueBubbles サーバーに接続し、Webhook を登録して、iMessage のメッセージを待ち受ける状態になります。

## 仕組み {#how-it-works}

```
iMessage → Messages.app → BlueBubbles Server → Webhook → Hermes
Hermes → BlueBubbles REST API → Messages.app → iMessage
```

- **受信:** 新しいメッセージが届くと、BlueBubbles がローカルの待ち受け口へ Webhook のイベントを送ります。定期的に問い合わせる必要がなく、そのまま届きます。
- **送信:** Hermes は BlueBubbles の REST API を使ってメッセージを送ります。
- **メディア:** 画像、音声メッセージ、動画、書類は送受信のどちらにも対応します。受け取った添付ファイルは手元にダウンロードして保存され、エージェントが扱えるようになります。

## 環境変数 {#environment-variables}

| 変数 | 必須 | 初期値 | 説明 |
|----------|----------|---------|-------------|
| `BLUEBUBBLES_SERVER_URL` | はい | — | BlueBubbles サーバーの URL |
| `BLUEBUBBLES_PASSWORD` | はい | — | サーバーのパスワード |
| `BLUEBUBBLES_WEBHOOK_HOST` | いいえ | `127.0.0.1` | Webhook を待ち受けるアドレス |
| `BLUEBUBBLES_WEBHOOK_PORT` | いいえ | `8645` | Webhook を待ち受けるポート |
| `BLUEBUBBLES_WEBHOOK_PATH` | いいえ | `/bluebubbles-webhook` | Webhook の URL のパス |
| `BLUEBUBBLES_HOME_CHANNEL` | いいえ | — | 定期実行の届け先になる電話番号かメールアドレス |
| `BLUEBUBBLES_ALLOWED_USERS` | いいえ | — | 許可する相手をカンマ区切りで指定 |
| `BLUEBUBBLES_ALLOW_ALL_USERS` | いいえ | `false` | 誰でも使えるようにする |
| `BLUEBUBBLES_REQUIRE_MENTION` | いいえ | `false` | グループチャットでは呼びかけのパターンに合ったときだけ返事をする |
| `BLUEBUBBLES_MENTION_PATTERNS` | いいえ | Hermes の呼びかけ語 | グループでの呼びかけ判定に使う正規表現。JSON の配列、改行区切り、カンマ区切りのいずれかで指定 |

受け取ったメッセージを自動で既読にするかどうかは、`~/.hermes/config.yaml` の `platforms.bluebubbles.extra` にある `send_read_receipts` で決めます（初期値は `true`）。これに対応する環境変数はありません。

## できること {#features}

### テキストのやり取り {#text-messaging}
iMessage の送受信ができます。Markdown の記号は自動で取り除かれ、読みやすいそのままの文字として届きます。

### 画像や音声 {#rich-media}
- **画像:** 写真は iMessage の会話にそのまま表示されます
- **音声メッセージ:** 音声ファイルは iMessage のボイスメッセージとして送られます
- **動画:** 動画の添付に対応します
- **書類:** ファイルは iMessage の添付として送られます

### Tapback のリアクション {#tapback-reactions}
ハート、いいね、よくないね、笑い、強調、疑問のリアクションを付けられます。BlueBubbles の [Private API helper](https://docs.bluebubbles.app/helper-bundle/installation) が必要です。

### 入力中の表示 {#typing-indicators}
エージェントが考えているあいだ、iMessage の会話に「入力中…」が表示されます。Private API が必要です。

### 開封の通知 {#read-receipts}
処理が終わったメッセージを自動で既読にします。Private API が必要です。

### 相手の指定 {#chat-addressing}
チャットはメールアドレスや電話番号で指定できます。Hermes がそれを BlueBubbles のチャット GUID に自動で読み替えるため、生の GUID を書く必要はありません。

## Private API {#private-api}

一部の機能には BlueBubbles の [Private API helper](https://docs.bluebubbles.app/helper-bundle/installation) が必要です。
- Tapback のリアクション
- 入力中の表示
- 開封の通知
- 宛先を指定した新しいチャットの作成

Private API がなくても、文字のやり取りと画像・音声などの送受信はそのまま使えます。

## 困ったときは {#troubleshooting}

### 「Cannot reach server」と出る {#cannot-reach-server}
- サーバー URL が正しいか、Mac の電源が入っているかを確かめます
- BlueBubbles Server が動いているかを確かめます
- ネットワークがつながっているかを確かめます（ファイアウォールやポート転送の設定）

### メッセージが届かない {#messages-not-arriving}
- BlueBubbles Server の Settings → API → Webhooks に、Webhook が登録されているかを確かめます
- その Webhook の URL に Mac から届くかを確かめます
- `hermes logs gateway` で Webhook のエラーを確認します（`hermes logs -f` を使うと流れてくる様子をそのまま追えます）

### 「Private API helper not connected」と出る {#private-api-helper-not-connected}
- Private API helper を入れます: [docs.bluebubbles.app](https://docs.bluebubbles.app/helper-bundle/installation)
- 文字のやり取りだけならこれがなくても動きます。必要になるのはリアクション、入力中の表示、開封の通知だけです
