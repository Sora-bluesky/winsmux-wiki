---
title: "BlueBubbles (iMessage)"
description: ""
upstream_path: user-guide/messaging/bluebubbles.md
upstream_blob: f195ed9bf771ed13202cd440bf8574aabb5f07a4
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/bluebubbles
---

# BlueBubbles (iMessage) {#bluebubbles-imessage}

[BlueBubbles](https://bluebubbles.app/) を使って、Hermes を Apple の iMessage につなぎます。BlueBubbles は無料でオープンソースの macOS 向けサーバーで、iMessage をどの端末からでも使えるように橋渡しします。

## 前提条件 {#prerequisites}

- [BlueBubbles Server](https://bluebubbles.app/) を動かしっぱなしにしておく **Mac**
- その Mac の Messages.app にサインイン済みの Apple ID
- BlueBubbles Server v1.0.0 以降（webhook を使うにはこのバージョンが必要です）
- Hermes と BlueBubbles サーバーのあいだがネットワークでつながっていること

## セットアップ {#setup}

### 1. BlueBubbles Server を入れる {#1-install-bluebubbles-server}

[bluebubbles.app](https://bluebubbles.app/) からダウンロードしてインストールします。セットアップウィザードを最後まで進め、Apple ID でサインインして、接続方法（ローカルネットワーク、Ngrok、Cloudflare、ダイナミック DNS のいずれか）を設定します。

### 2. サーバー URL とパスワードを控える {#2-get-your-server-url-and-password}

BlueBubbles Server の **Settings → API** を開き、次の 2 つを控えます。
- **Server URL**（例: `http://192.168.1.10:1234`）
- **Server Password**

### 3. Hermes を設定する {#3-configure-hermes}

セットアップウィザードを実行します。

```bash
hermes gateway setup
```

**BlueBubbles (iMessage)** を選び、控えておいたサーバー URL とパスワードを入力します。

環境変数を `~/.hermes/.env` に直接書いてもかまいません。

```bash
BLUEBUBBLES_SERVER_URL=http://192.168.1.10:1234
BLUEBUBBLES_PASSWORD=your-server-password
```

#### 任意: グループチャットでは呼びかけを必須にする {#optional-require-mentions-in-group-chats}

既定では、Hermes は許可済みの BlueBubbles/iMessage の DM とグループメッセージすべてに返信します。グループチャットだけは呼びかけられたときに限って動くようにしたい場合は、メンション判定を有効にします。

```yaml
platforms:
  bluebubbles:
    enabled: true
    extra:
      require_mention: true
```

`require_mention: true` にしても DM はこれまでどおり動きますが、グループチャットのメッセージはメンションのパターンに合致しない限り無視されます。独自のパターンを設定しなかった場合は、`Hermes` と `@Hermes agent` の書き方に対応した控えめな既定パターンが使われます。

エージェントの名前を変えているときは、正規表現のパターンを指定します。

```yaml
platforms:
  bluebubbles:
    extra:
      require_mention: true
      mention_patterns:
        - '(?<![\w@])@?amos\b[,:\-]?'
```

### 4. 利用者を許可する {#4-authorize-users}

次のどれか 1 つを選びます。

**DM でのペアリング（おすすめ）:**
誰かがあなたの iMessage にメッセージを送ると、Hermes がペアリングコードを自動で返します。次のコマンドで承認します。
```bash
hermes pairing approve bluebubbles <CODE>
```
`hermes pairing list` を使うと、承認待ちのコードと許可済みの利用者を確認できます。

**特定の利用者をあらかじめ許可する**（`~/.hermes/.env` に記入）:
```bash
BLUEBUBBLES_ALLOWED_USERS=user@icloud.com,+15551234567
```

**誰でも使えるようにする**（`~/.hermes/.env` に記入）:
```bash
BLUEBUBBLES_ALLOW_ALL_USERS=true
```

### 5. ゲートウェイを起動する {#5-start-the-gateway}

```bash
hermes gateway run
```

Hermes が BlueBubbles サーバーに接続し、webhook を登録して、iMessage のメッセージを待ち受けはじめます。

### 6. 設定できているか確かめる {#6-verify-the-setup}

セットアップウィザードが保存するのは `~/.hermes/.env` の認証情報だけで、`~/.hermes/config.yaml` に `platforms.bluebubbles.enabled` を書き込むわけでは **ありません**。明示的な設定が無ければ、認証情報がそろっているだけでアダプターは起動します。ただし明示的な `enabled: false` は認証情報より強いので、以前にアダプターを無効にしたことがある場合（たとえば別の iMessage ブリッジを使っていたとき）は、ウィザードは成功したと表示するのにアダプターはいつまでも起動しません。

保存されている設定を確認します。

```bash
hermes config get platforms.bluebubbles.enabled
```

- `true` — 明示的に有効
- `Config key not set` — 明示的な設定なし。`.env` の認証情報で有効かどうかが決まります
- `false` — 明示的に無効。セットアップをやり直してもここは変わらないので、自分で `true` にしてください

次に、接続と webhook 登録が成功したことを示す 2 行が出ているか、ゲートウェイのログで確かめます。

```bash
hermes logs gateway
```

```text
[bluebubbles] connected to http://192.168.1.10:1234 (private_api=False, helper=False)
[bluebubbles] webhook registered with server: http://localhost:8645/bluebubbles-webhook?password=***
```

最後に、別の端末から自分宛てにテストのメッセージを送ってみます。返信（新規の DM ならペアリングコード）が返ってくれば、受信まで一通り届いている証拠になります。

## 仕組み {#how-it-works}

```
iMessage → Messages.app → BlueBubbles Server → Webhook → Hermes
Hermes → BlueBubbles REST API → Messages.app → iMessage
```

- **受信:** 新しいメッセージが届くと、BlueBubbles がローカルの待ち受け先に webhook のイベントを送ります。ポーリングはしないので、すぐに届きます。
- **送信:** Hermes は BlueBubbles の REST API を通してメッセージを送ります。
- **メディア:** 画像、ボイスメッセージ、動画、書類を送受信どちらでも扱えます。受信した添付ファイルはダウンロードされ、エージェントが処理できるようローカルに保存されます。

### 2 つの URL は向きが逆 {#two-urls-opposite-directions}

このセットアップでは向きが逆の URL を 2 つ使います。混同しないでください。

- `BLUEBUBBLES_SERVER_URL`（例: `http://192.168.1.10:1234`）— Hermes のほうから BlueBubbles サーバーの API を **呼び出す** 先です。BlueBubbles Server の Settings → API に表示される Server URL がこれにあたります。
- webhook（既定は `http://localhost:8645/bluebubbles-webhook`）— BlueBubbles のほうから Hermes へ新着メッセージのイベントを **POST** する先です。ホスト名・ポート・パスは `BLUEBUBBLES_WEBHOOK_HOST` / `BLUEBUBBLES_WEBHOOK_PORT` / `BLUEBUBBLES_WEBHOOK_PATH` で決まります。

### webhook はどう登録されるのか {#how-the-webhook-is-registered}

BlueBubbles の画面で webhook を作る必要は **ありません**。ゲートウェイが接続すると、Hermes 自身が BlueBubbles の REST API（`/api/v1/webhook`）を使って `new-message` と `updated-message` のイベント向けに webhook を登録し、正常に終了するときには登録を消します。

知っておくとよい点が 2 つあります。

- 登録される URL には、サーバーのパスワードがクエリパラメータ（`?password=…`）として付きます。BlueBubbles の webhook API は独自のヘッダーに対応していないためで、受信イベントの認証はこの形で行われます。
- webhook の待ち受けは既定で `127.0.0.1` に紐づきます。Hermes と BlueBubbles が同じ機械で動いているなら問題ありませんが、別々の機械なら、BlueBubbles を動かしている Mac から届くアドレスを `BLUEBUBBLES_WEBHOOK_HOST` に設定してください。

## 環境変数 {#environment-variables}

| 変数 | 必須 | 既定値 | 説明 |
|----------|----------|---------|-------------|
| `BLUEBUBBLES_SERVER_URL` | はい | — | BlueBubbles サーバーの URL |
| `BLUEBUBBLES_PASSWORD` | はい | — | サーバーのパスワード |
| `BLUEBUBBLES_WEBHOOK_HOST` | いいえ | `127.0.0.1` | webhook の待ち受けアドレス |
| `BLUEBUBBLES_WEBHOOK_PORT` | いいえ | `8645` | webhook の待ち受けポート |
| `BLUEBUBBLES_WEBHOOK_PATH` | いいえ | `/bluebubbles-webhook` | webhook の URL のパス |
| `BLUEBUBBLES_HOME_CHANNEL` | いいえ | — | 定時実行の通知先になる電話番号／メールアドレス |
| `BLUEBUBBLES_ALLOWED_USERS` | いいえ | — | 許可する利用者をカンマ区切りで指定 |
| `BLUEBUBBLES_ALLOW_ALL_USERS` | いいえ | `false` | 誰でも使えるようにする |
| `BLUEBUBBLES_REQUIRE_MENTION` | いいえ | `false` | グループチャットでは呼びかけられたときだけ返信する |
| `BLUEBUBBLES_MENTION_PATTERNS` | いいえ | Hermes の呼び出し語 | グループでの呼びかけ判定に使う正規表現。JSON 配列、改行区切り、カンマ区切りのいずれかで指定 |

メッセージを自動で既読にするかどうかは、`~/.hermes/config.yaml` の `platforms.bluebubbles.extra` にある `send_read_receipts` で決まります（既定は `true`）。これに対応する環境変数はありません。

## できること {#features}

### テキストのやりとり {#text-messaging}
iMessage の送受信ができます。Markdown の記法は自動で取り除かれ、読みやすいプレーンテキストで届きます。

### 写真や音声 {#rich-media}
- **画像:** 写真は iMessage の会話のなかにそのまま表示されます
- **ボイスメッセージ:** 音声ファイルは iMessage のボイスメッセージとして送られます
- **動画:** 動画の添付に対応します
- **書類:** ファイルは iMessage の添付として送られます

### Tapback のリアクション {#tapback-reactions}
ハート、いいね、よくないね、笑い、強調、疑問のリアクションを使えます。BlueBubbles の [Private API helper](https://docs.bluebubbles.app/helper-bundle/installation) が必要です。

### 入力中の表示 {#typing-indicators}
エージェントが処理しているあいだ、iMessage の会話に「入力中…」と表示します。Private API が必要です。

### 開封の通知 {#read-receipts}
処理が終わったメッセージを自動で既読にします。Private API が必要です。

### 宛先の指定 {#chat-addressing}
メールアドレスや電話番号で相手を指定できます。Hermes が BlueBubbles のチャット GUID に自動で変換するので、生の GUID を書く必要はありません。

## Private API {#private-api}

一部の機能には BlueBubbles の [Private API helper](https://docs.bluebubbles.app/helper-bundle/installation) が必要です。
- Tapback のリアクション
- 入力中の表示
- 開封の通知
- 宛先を指定した新しいチャットの作成

Private API が無くても、基本的なテキストのやりとりとメディアの送受信はできます。

ひとつ注意があります。「Private API が無くても基本的なやりとりはできる」というのは、BlueBubbles が、ログイン中の macOS ユーザーの手前側で Messages.app を動かせることが前提です。BlueBubbles を動かしている Mac がログイン画面のままだったり、ファストユーザスイッチでそのユーザーから切り替わっていたりすると、AppleScript による送信は失敗します（[BlueBubbles: multiple users on the same Mac](https://docs.bluebubbles.app/server/basic-guides/multiple-users-on-the-same-mac) を参照）。こうした構成では、上に挙げた追加機能のためだけでなく、確実に送信するために Private API が要ります。

## 困ったとき {#troubleshooting}

### 「Cannot reach server」と出る {#cannot-reach-server}
- サーバー URL が正しいか、Mac の電源が入っているかを確かめます
- BlueBubbles Server が動いているかを確かめます
- ネットワークがつながっているかを確かめます（ファイアウォール、ポート転送）

### メッセージが届かない {#messages-not-arriving}
- `hermes logs gateway` で webhook のエラーが出ていないか確かめます（`hermes logs -f` ならリアルタイムで追えます）
- webhook は接続時に Hermes 自身が登録します。BlueBubbles Server → Settings → API → Webhooks を見るのは、ログに登録の失敗が出ているときだけで十分です
- BlueBubbles の画面に webhook の行があっても、それは届いている証拠にはなりません。確かな証拠は、Hermes がメッセージをログに記録して返信することです
- Hermes と BlueBubbles を別々の機械で動かしている場合、既定の待ち受けアドレス `127.0.0.1` には Mac から届きません。`BLUEBUBBLES_WEBHOOK_HOST` に届くアドレスを設定して、ゲートウェイを再起動してください

### セットアップは成功したのにアダプターが起動しない {#setup-succeeded-but-the-adapter-never-starts}
- `hermes gateway setup` は `~/.hermes/.env` に認証情報を保存するだけで、`platforms.bluebubbles.enabled: true` は設定しません
- `~/.hermes/config.yaml` に明示的な `enabled: false` があると、認証情報がそろっていてもそちらが優先されます。`hermes config get platforms.bluebubbles.enabled` で確認してください
- これは iMessage のブリッジを乗り換えたあとによく起こります。別の iMessage ブリッジを使っていて、そのとき BlueBubbles を無効にしていたなら、セットアップをやり直しても有効には戻りません。`enabled: true` を設定してください（そして使わなくなったブリッジのほうは無効にします。iMessage のブリッジが 2 つあるとメッセージを二重に処理してしまいます）

### 1 台の Mac に BlueBubbles サーバーが 2 つある（Apple ID を取り違える） {#two-bluebubbles-servers-on-one-mac-wrong-apple-id}
- Hermes が見るのは `~/.hermes/.env` の `BLUEBUBBLES_SERVER_URL` であって、BlueBubbles の画面に出ている Server URL ではありません（画面の表示は DHCP でアドレスが変わったあと古いままのことがあります）
- 1 台の Mac に macOS のユーザーが 2 人いると、それぞれが自分の BlueBubbles サーバーを、別々の API ポートと Apple ID で動かします。Hermes がどちらにつながっているかを確かめてください: `curl "http://<server-url>/api/v1/server/info?password=<password>"` を実行し、`computer_id` を見比べます
- 複数ユーザーの構成そのものについては [BlueBubbles: multiple users on the same Mac](https://docs.bluebubbles.app/server/basic-guides/multiple-users-on-the-same-mac) に従ってください。ユーザーごとにポートを 1 つ割り当て、サーバーを動かしているユーザーをログアウトさせないことです

### 同じ返信が二重に届く {#duplicate-replies}
- 既知の問題です。セッションの扱いによって、同じ相手が 2 つのセッションに分かれてしまうこと（生の GUID の形と、電話番号／メールアドレスの形）があります。[#30708](https://github.com/NousResearch/hermes-agent/issues/30708) と [#34372](https://github.com/NousResearch/hermes-agent/issues/34372) で追跡しています
- ドキュメントや設定の問題ではありません。修正についてはこれらの issue を追ってください

### 「♻️ Recovered reply」が繰り返される、送信が何分も止まる {#recovered-reply-repeats-or-sends-hang-for-minutes}
- `BLUEBUBBLES_HOME_CHANNEL`（または `platforms.bluebubbles.home_channel`）を設定していると、ゲートウェイの再起動やプラットフォームの再接続のたびにその宛先へ通知が飛び、保留中の返信が「♻️ Recovered reply」として送り直されることがあります
- BlueBubbles 側の送信が黙って失敗している場合（背後にいる macOS ユーザーで起きる `Not authorized to send Apple events to Messages. (-1743)` のような AppleScript のエラーと、長い待ち時間が典型です）、再送が積み上がって webhook の配達を押しのけてしまうことがあります
- 送信が確実にできると分かるまでは home channel を空のままにして、背後のユーザーで動かす構成では Private API helper を有効にしてください（[Private API](#private-api) を参照）

### 「Private API helper not connected」と出る {#private-api-helper-not-connected}
- Private API helper を入れてください: [docs.bluebubbles.app](https://docs.bluebubbles.app/helper-bundle/installation)
- これが無くても基本的なやりとりはできます。必要になるのはリアクション、入力中の表示、開封の通知だけです
