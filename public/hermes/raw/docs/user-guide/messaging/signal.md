---
title: "Signal"
description: "signal-cli のデーモンを使って Hermes Agent を Signal のボットとして設定する"
upstream_path: user-guide/messaging/signal.md
upstream_blob: 597a7fa30be28962cd909f7deff3b5bf2305393e
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/signal
---

# Signal の設定 {#signal-setup}

Hermes は [signal-cli](https://github.com/AsamK/signal-cli) を HTTP モードのデーモンとして動かし、そこを通して Signal につながります。アダプターは SSE（Server-Sent Events）でメッセージをその場で受け取り、返事は JSON-RPC で送ります。

Signal は広く使われているメッセンジャーの中でも、とくにプライバシーを重んじたつくりです。初期状態で通信は端末どうしのあいだだけで暗号化され、プロトコルは公開されていて、集める情報も最小限です。そのため、機密を扱うエージェントの作業に向いています。

:::info Python の追加パッケージは不要です
Signal のアダプターは、やり取りのすべてに `httpx`（すでに Hermes の中核が使っているもの）を利用します。Python のパッケージを足す必要はありません。用意するのは、外部にインストールした signal-cli だけです。
:::

---

## 事前に必要なもの {#prerequisites}

- **signal-cli** — Java で書かれた Signal のクライアントです（[GitHub](https://github.com/AsamK/signal-cli)）
- **Java 17 以上** の実行環境 — signal-cli が必要とします
- Signal を入れた **電話番号** — 二台目の端末として連携するために使います

### signal-cli を入れる {#installing-signal-cli}

```bash
# macOS
brew install signal-cli

# Linux (download latest release)
VERSION=$(curl -Ls -o /dev/null -w %{url_effective} \
  https://github.com/AsamK/signal-cli/releases/latest | sed 's/^.*\/v//')
curl -L -O "https://github.com/AsamK/signal-cli/releases/download/v${VERSION}/signal-cli-${VERSION}.tar.gz"
sudo tar xf "signal-cli-${VERSION}.tar.gz" -C /opt
sudo ln -sf "/opt/signal-cli-${VERSION}/bin/signal-cli" /usr/local/bin/
```

:::caution
signal-cli は apt や snap のリポジトリには **ありません**。上の Linux 向けの手順は [GitHub releases](https://github.com/AsamK/signal-cli/releases) から直接ダウンロードしています。
:::

---

## ステップ 1: Signal のアカウントを連携する {#step-1-link-your-signal-account}

signal-cli は **連携した端末** として動きます。WhatsApp Web に近い仕組みを Signal で使うかたちです。主となる端末は手元の電話のままです。

```bash
# Generate a linking URI (displays a QR code or link)
signal-cli link -n "HermesAgent"
```

1. 電話で **Signal** を開きます
2. **設定 → 連携済みデバイス** を開きます
3. **新しいデバイスをリンク** を選びます
4. QR コードを読み取るか、表示された URI を入力します

---

## ステップ 2: signal-cli のデーモンを起動する {#step-2-start-the-signal-cli-daemon}

```bash
# Replace +1234567890 with your Signal phone number (E.164 format)
signal-cli --account +1234567890 daemon --http 127.0.0.1:8080
```

:::tip
これは動かしっぱなしにしておきます。`systemd`、`tmux`、`screen` を使ってもよいですし、サービスとして登録しても構いません。
:::

動いているかどうかは次で確かめます。

```bash
curl http://127.0.0.1:8080/api/v1/check
# Should return: {"versions":{"signal-cli":...}}
```

---

## ステップ 3: Hermes を設定する {#step-3-configure-hermes}

いちばん簡単なやり方は次のとおりです。

```bash
hermes gateway setup
```

プラットフォームの一覧から **Signal** を選びます。ウィザードは次のように進みます。

1. signal-cli が入っているかを調べます
2. HTTP の URL を聞きます（初期値は `http://127.0.0.1:8080`）
3. デーモンにつながるか試します
4. アカウントの電話番号を聞きます
5. 許可するユーザーとアクセスの方針を設定します

### 手作業での設定 {#manual-configuration}

`~/.hermes/.env` に次を書き足します。

```bash
# Required
SIGNAL_HTTP_URL=http://127.0.0.1:8080
SIGNAL_ACCOUNT=+1234567890

# Security (recommended)
SIGNAL_ALLOWED_USERS=+1234567890,+0987654321    # Comma-separated E.164 numbers or UUIDs

# Optional
SIGNAL_GROUP_ALLOWED_USERS=groupId1,groupId2     # Enable groups (omit to disable, * for all)
SIGNAL_HOME_CHANNEL=+1234567890                  # Default delivery target for cron jobs
```

そのあとゲートウェイを起動します。

```bash
hermes gateway              # Foreground
hermes gateway install      # Install as a user service
sudo hermes gateway install --system   # Linux only: boot-time system service
```

---

## アクセスの制御 {#access-control}

### 個別のやり取り {#dm-access}

個別のやり取りへの許可の与え方は、ほかの Hermes のプラットフォームと同じです。

1. **`SIGNAL_ALLOWED_USERS` を設定している** → そこに書いた相手だけがメッセージを送れます
2. **許可リストがない** → 知らない相手にはペアリング用のコードが返ります（`hermes pairing approve signal CODE` で承認します）
3. **`SIGNAL_ALLOW_ALL_USERS=true`** → 誰でもメッセージを送れます（扱いには注意してください）

### グループでのやり取り {#group-access}

グループでのやり取りは `SIGNAL_GROUP_ALLOWED_USERS` という環境変数で決まります。

| 設定 | 動き |
|---------------|----------|
| 設定しない（初期値） | グループのメッセージはすべて無視されます。ボットは個別のやり取りにだけ応じます。 |
| グループ ID を書く | 書いたグループだけを見ます（例: `groupId1,groupId2`）。 |
| `*` にする | ボットが参加しているすべてのグループで応じます。 |

---

## できること {#features}

### 添付ファイル {#attachments}

アダプターは、送る側と受け取る側の両方でメディアを扱えます。

**受け取る側**（利用者 → エージェント）

- **画像** — PNG、JPEG、GIF、WebP（先頭のバイト列から自動で見分けます）
- **音声** — MP3、OGG、WAV、M4A（Whisper を設定してあれば音声メッセージは文字に起こされます）
- **書類** — PDF、ZIP など、さまざまな形式

**送る側**（エージェント → 利用者）

エージェントは応答の中に `MEDIA:` のタグを書いてメディアを送れます。使える送り方は次のとおりです。

- **画像** — `send_multiple_images` と `send_image_file` が PNG、JPEG、GIF、WebP を Signal の添付として送ります
- **音声** — `send_voice` が音声ファイル（OGG、MP3、WAV、M4A、AAC）を添付として送ります
- **動画** — `send_video` が MP4 の動画を送ります
- **書類** — `send_document` がどんな形式のファイルでも送ります（PDF、ZIP など）

送り出すメディアはすべて Signal の通常の添付の仕組みを通ります。ほかのプラットフォームと違い、Signal はプロトコルの上では音声メッセージとファイルの添付を区別しません。

添付の大きさの上限は **100 MB** です（送る側・受け取る側とも）。
:::warning
**Signal のサーバーは添付のアップロードに回数の制限をかけます。** そのためアダプターは、複数の画像を送るときに 32 枚ずつまとめて順番に処理し、Signal 側の方針に合う速さになるよう調整しています。
:::

### 書式・引用返信・リアクション {#native-formatting-reply-quotes-and-reactions}

Signal のメッセージは、マークダウンの記号がそのまま見えるのではなく **もとから備わった書式** で表示されます。アダプターがマークダウン（`**bold**`、`*italic*`、`` `code` ``、`~~strike~~`、`||spoiler||`、見出し）を Signal の `bodyRanges` に変換するので、受け取った側の画面では `**` や `` ` `` の記号ではなく、実際の装飾として見えます。

**引用返信。** Hermes が特定のメッセージに返事をするとき、もとのメッセージを引用したかたちで返します。Signal の利用者が自分で「返信」を使ったときと同じ見え方です。受け取ったメッセージへの返事では自動でこうなります。

**リアクション。** エージェントは通常のリアクションの仕組みを使ってメッセージに反応できます。反応は文字として追加されるのではなく、対象のメッセージに絵文字のリアクションとして付きます。

ここまでのどれにも追加の設定は要りません。最近の signal-cli であれば最初から有効です。`signal-cli` の版が古すぎる場合、Hermes はプレーンテキストでの送信に切り替え、一度だけ警告を記録します。

### 入力中の表示 {#typing-indicators}

ボットはメッセージを処理しているあいだ、入力中であることを 8 秒ごとに送り直しながら示します。

### ツールの進み具合の表示 {#tool-progress-display}

Signal には、送ったあとのメッセージを書き換える機能がありません。そのため Hermes は、`/verbose` を有効にして `off` 以外のモードをこのプラットフォームに保存していても、ゲートウェイが出すツールの進み具合の吹き出しを抑えます。

ツールの動きは CLI では引き続き見られますし、Signal に返る最後の返事には通常どおりアシスタントの出力が入ります。チャットの中でツールごとの進み具合をその場で見たいときは、メッセージの書き換えに対応したプラットフォームを使ってください。

### 電話番号の伏せ字 {#phone-number-redaction}

ログに出る電話番号はすべて自動で伏せられます。
- `+15551234567` → `+155****4567`
- これは Hermes のゲートウェイのログにも、全体の伏せ字の仕組みにも当てはまります

### 自分あてのメモ（番号が一つの構成） {#note-to-self-single-number-setup}

ボット用に別の番号を用意するのではなく、自分の電話番号に signal-cli を **二台目の端末として連携** して動かしている場合は、Signal の「自分へのメモ」から Hermes とやり取りできます。

電話から自分あてにメッセージを送るだけで、signal-cli がそれを拾い、Hermes が同じ会話の中で返事をします。

**しくみ**
- 「自分へのメモ」のメッセージは `syncMessage.sentMessage` という形で届きます
- アダプターはそれがボット自身のアカウントあてだと見分け、通常の受信メッセージとして処理します
- 送信時刻を控えておく仕組みで自分の返事を弾くため、返信が無限に続くことはありません

**追加の設定は要りません。** `SIGNAL_ACCOUNT` が自分の電話番号と一致していれば、そのまま動きます。

### 接続の見守り {#health-monitoring}

アダプターは SSE の接続を見守り、次の場合に自動でつなぎ直します。
- 接続が切れたとき（待ち時間を 2 秒から 60 秒まで少しずつ延ばしながら再接続します）
- 120 秒のあいだ何も動きがないとき（signal-cli に問い合わせて生きているか確かめます）

---

## 困ったときは {#troubleshooting}

| 症状 | 対処 |
|---------|----------|
| 設定中に **"Cannot reach signal-cli"** と出る | signal-cli のデーモンが動いているか確かめます: `signal-cli --account +YOUR_NUMBER daemon --http 127.0.0.1:8080` |
| **メッセージが届かない** | `SIGNAL_ALLOWED_USERS` に送信者の番号が E.164 形式（先頭に `+` を付ける）で入っているか確かめます |
| **"signal-cli not found on PATH"** と出る | signal-cli を入れて PATH に通すか、Docker を使ってください |
| **接続がすぐ切れる** | signal-cli のログにエラーが出ていないか見ます。Java 17 以上が入っているかも確かめてください。 |
| **グループのメッセージが無視される** | `SIGNAL_GROUP_ALLOWED_USERS` に対象のグループ ID を設定するか、`*` にしてすべてのグループを許可します。 |
| **誰にも返事をしない** | `SIGNAL_ALLOWED_USERS` を設定するか、ペアリングを使います。もっと広く受け付けたいなら、ゲートウェイの方針で明示的に全員を許可してください。 |
| **同じメッセージが二重に届く** | その電話番号を見ている signal-cli が一つだけになっているか確かめます |

---

## セキュリティ {#security}

:::warning
**アクセスの制御は必ず設定してください。** ボットは初期状態で端末を操作できます。`SIGNAL_ALLOWED_USERS` もペアリングも設定されていない場合、ゲートウェイは安全のために届いたメッセージをすべて拒みます。
:::

- 電話番号はログの出力すべてで伏せられます
- 新しい利用者を安全に迎えるには、ペアリングか明示的な許可リストを使います
- グループが必要でなければ無効のままにしておくか、信頼できるグループだけを許可します
- Signal の端末どうしの暗号化が、通信中のメッセージの中身を守ります
- `~/.local/share/signal-cli/` にある signal-cli のセッションのデータにはアカウントの資格情報が入っています。パスワードと同じように守ってください

---

## 環境変数の一覧 {#environment-variables-reference}

| 変数 | 必須 | 初期値 | 説明 |
|----------|----------|---------|-------------|
| `SIGNAL_HTTP_URL` | はい | — | signal-cli の HTTP の接続先 |
| `SIGNAL_ACCOUNT` | はい | — | ボットの電話番号（E.164 形式） |
| `SIGNAL_ALLOWED_USERS` | いいえ | — | 電話番号や UUID をカンマ区切りで書きます |
| `SIGNAL_GROUP_ALLOWED_USERS` | いいえ | — | 見にいくグループの ID、またはすべてを表す `*`（書かなければグループは無効になります） |
| `SIGNAL_ALLOW_ALL_USERS` | いいえ | `false` | 誰でもやり取りできるようにします（許可リストを使いません） |
| `SIGNAL_HOME_CHANNEL` | いいえ | — | cron ジョブの既定の送り先 |
