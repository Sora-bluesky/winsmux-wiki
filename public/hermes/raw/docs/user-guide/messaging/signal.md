---
title: "Signal"
description: "signal-cli のデーモン経由で Hermes Agent を Signal のボットとして動かす"
upstream_path: user-guide/messaging/signal.md
upstream_blob: a435ed96b62b08ba5e8b87103612c5261dba18d7
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/signal
---

# Signal の設定 {#signal-setup}

Hermes は、HTTP モードで動かした [signal-cli](https://github.com/AsamK/signal-cli) のデーモンを通して Signal につながります。受信は SSE（Server-Sent Events）でリアルタイムに流れてきて、返信は JSON-RPC で送ります。

Signal は、広く使われているメッセンジャーの中でもっともプライバシーに寄ったものです。既定で端末間の暗号化がかかり、プロトコルは公開されていて、集める情報も最小限です。そのため、機密性が問われるエージェントの用途によく合います。

:::info Python の追加パッケージは不要
Signal のアダプタは、やり取りのすべてに `httpx`（すでに Hermes の中核が使っています）を利用します。Python のパッケージを追加で入れる必要はありません。必要なのは、外部に signal-cli を入れておくことだけです。
:::

---

## 事前に必要なもの {#prerequisites}

- **signal-cli** — Java で書かれた Signal のクライアント（[GitHub](https://github.com/AsamK/signal-cli)）
- **Java 17 以上**の実行環境 — signal-cli が必要とします
- Signal を入れた**電話番号** — 副端末として連携するために使います

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
signal-cli は apt にも snap にも**ありません**。上の Linux 向けの手順は、[GitHub のリリース](https://github.com/AsamK/signal-cli/releases) から直接ダウンロードしています。
:::

---

## 手順 1: Signal のアカウントを連携する {#step-1-link-your-signal-account}

signal-cli は**連携した端末**として動きます。WhatsApp Web の Signal 版だと思ってください。主となる端末は手元のスマートフォンのままです。

```bash
# Generate a linking URI (displays a QR code or link)
signal-cli link -n "HermesAgent"
```

1. スマートフォンで **Signal** を開きます
2. **設定 → 連携済みデバイス** を開きます
3. **新しいデバイスをリンク** をタップします
4. QR コードを読み取るか、URI を入力します

---

## 手順 2: signal-cli のデーモンを起動する {#step-2-start-the-signal-cli-daemon}

```bash
# Replace +1234567890 with your Signal phone number (E.164 format)
signal-cli --account +1234567890 daemon --http 127.0.0.1:8080
```

:::tip
これは動かしっぱなしにしておきます。`systemd`、`tmux`、`screen` を使ってもよいですし、サービスとして登録しても構いません。
:::

動いているか確かめます。

```bash
curl http://127.0.0.1:8080/api/v1/check
# Should return: {"versions":{"signal-cli":...}}
```

---

## 手順 3: Hermes を設定する {#step-3-configure-hermes}

いちばん簡単なのはこれです。

```bash
hermes gateway setup
```

プラットフォームの一覧から **Signal** を選びます。すると案内に沿って次のことが進みます。

1. signal-cli が入っているかを確認します
2. HTTP の URL を尋ねます（既定は `http://127.0.0.1:8080`）
3. デーモンにつながるかを試します
4. 自分のアカウントの電話番号を尋ねます
5. 許可する相手とアクセスの方針を設定します

### 手動で設定する {#manual-configuration}

`~/.hermes/.env` に次を追加します。

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

そのうえでゲートウェイを起動します。

```bash
hermes gateway              # Foreground
hermes gateway install      # Install as a user service
sudo hermes gateway install --system   # Linux only: boot-time system service
```

---

## アクセスの制御 {#access-control}

### 個別のやり取り {#dm-access}

個別のやり取りの扱いは、Hermes のほかのプラットフォームとまったく同じです。

1. **`SIGNAL_ALLOWED_USERS` を設定した場合** → そこに書いた相手だけがメッセージを送れます
2. **許可一覧を設定していない場合** → 知らない相手にはペアリング用のコードが返ります（`hermes pairing approve signal CODE` で承認します）
3. **`SIGNAL_ALLOW_ALL_USERS=true` の場合** → 誰でもメッセージを送れます（扱いには注意してください）

### グループのやり取り {#group-access}

グループの扱いは、環境変数 `SIGNAL_GROUP_ALLOWED_USERS` で決まります。

| 設定 | 動き |
|---------------|----------|
| 未設定（既定） | グループのメッセージはすべて無視されます。ボットは個別のやり取りにだけ応じます。 |
| グループ ID を設定 | 書いたグループだけを見ます（例: `groupId1,groupId2`）。 |
| `*` を設定 | ボットは、参加しているどのグループでも応じます。 |

---

## できること {#features}

### 添付ファイル {#attachments}

アダプタは、送る側・受け取る側の両方でメディアを扱えます。

**受け取る**（利用者 → エージェント）:

- **画像** — PNG、JPEG、GIF、WebP（先頭のバイト列から自動で判別します）
- **音声** — MP3、OGG、WAV、M4A（Whisper を設定していれば、音声メッセージは文字に起こされます）
- **書類** — PDF、ZIP、その他のファイル

**送る**（エージェント → 利用者）:

エージェントは返答の中の `MEDIA:` タグでメディアを送れます。送り方は次のとおりです。

- **画像** — `send_multiple_images` と `send_image_file` が、PNG、JPEG、GIF、WebP を Signal 本来の添付として送ります
- **音声** — `send_voice` が音声ファイル（OGG、MP3、WAV、M4A、AAC）を添付として送ります
- **動画** — `send_video` が MP4 の動画を送ります
- **書類** — `send_document` が、どんな種類のファイルでも送ります（PDF、ZIP など）

送信するメディアはすべて、Signal の標準の添付 API を通ります。ほかのサービスと違い、Signal はプロトコルの上で音声メッセージとファイルの添付を区別しません。

添付の上限サイズは**100 MB** です（送る側・受け取る側とも）。
:::warning
**Signal のサーバーは添付のアップロードに回数制限をかけます。** そのためアダプタは、複数の画像を送るときに専用の順番待ちの仕組みを使い、32 枚ずつまとめたうえで、Signal サーバーの方針に合わせて送る速さを抑えます。
:::

### 本来の書式、引用返信、リアクション {#native-formatting-reply-quotes-and-reactions}

Signal のメッセージは、マークダウンの記号がそのまま見えるのではなく、**Signal 本来の書式**で表示されます。アダプタはマークダウン（`**bold**`、`*italic*`、`` `code` ``、`~~strike~~`、`||spoiler||`、見出し）を Signal の `bodyRanges` に変換するので、受け取った側の画面では `**` や `` ` `` の文字が見えるのではなく、実際に装飾された文章として表示されます。

**引用返信。** Hermes が特定のメッセージに返すときは、元のメッセージを引用したかたちで返信します。Signal を使う人が自分で「返信」したときと同じ見た目です。受信したメッセージへの返答であれば、これは自動で行われます。

**リアクション。** エージェントは標準のリアクション API でメッセージに反応できます。リアクションは余計な文章としてではなく、対象のメッセージに付いた絵文字として Signal に表示されます。

これらに追加の設定は要りません。最近の signal-cli であれば、はじめから有効です。`signal-cli` の版が古すぎる場合、Hermes は装飾なしの送信に切り替え、一度だけ警告を記録します。

### 長いメッセージ {#long-messages}

Signal では、1 通のメッセージは**8,000 文字**までです。Hermes はそれを超える返答を切り捨てず、番号付きの塊（`(1/3)`、`(2/3)` …）に自動で分けます。これは送り出す経路すべてに当てはまり、会話中の返信、定期実行の通知、`hermes send`、MCP の `send_message` のいずれでも同じです。太字、斜体、コード、伏せ字といった書式も、分かれ目をまたいでそのまま保たれます。

### 入力中の表示 {#typing-indicators}

ボットはメッセージを処理している間、入力中の表示を出し続けます。8 秒ごとに更新します。

### ツールの進み具合の表示 {#tool-progress-display}

Signal には、送信済みのメッセージを編集する機能がありません。そのため Hermes は、`/verbose` を有効にしていて、そのプラットフォームに `off` 以外のモードを保存している場合でも、ゲートウェイのツール進捗の吹き出しを Signal では出しません。

ツールの動きは CLI で見られますし、Signal への最終的な返信には通常どおりエージェントの出力を含められます。チャットの中でツールごとの進み具合をその場で見たい場合は、メッセージの編集に対応したサービスを使ってください。

### 電話番号の伏せ字 {#phone-number-redaction}

電話番号は、記録の中で自動的に伏せられます。
- `+15551234567` → `+155****4567`
- これは Hermes のゲートウェイの記録にも、全体の伏せ字の仕組みにも当てはまります

### 自分宛てのメモ（番号を 1 つで使う場合） {#note-to-self-single-number-setup}

ボット用に別の番号を用意せず、自分の電話番号で signal-cli を**連携した副端末**として動かしている場合は、Signal の「自分へのメモ」から Hermes とやり取りできます。

スマートフォンから自分宛てにメッセージを送るだけで、signal-cli がそれを拾い、Hermes が同じ会話の中で返します。

**仕組みはこうです:**
- 「自分へのメモ」のメッセージは `syncMessage.sentMessage` という形で届きます
- アダプタは、それがボット自身のアカウント宛てであることを見分けて、普通の受信メッセージとして処理します
- 送信時刻の記録による折り返し防止が働くので、堂々巡りにはなりません。ボット自身の返信は自動的に除かれます

**追加の設定は要りません。** `SIGNAL_ACCOUNT` が自分の電話番号と一致していれば、そのまま動きます。

### 接続の見守り {#health-monitoring}

アダプタは SSE の接続を見張っていて、次の場合には自動でつなぎ直します。
- 接続が切れたとき（待ち時間を 2 秒から 60 秒へ少しずつ延ばしながら再接続します）
- 120 秒のあいだ何も届かないとき（signal-cli に問い合わせて生存を確かめます）

---

## 困ったときは {#troubleshooting}

| 症状 | 対処 |
|---------|----------|
| 設定中に **「Cannot reach signal-cli」** と出る | signal-cli のデーモンが動いているか確認します: `signal-cli --account +YOUR_NUMBER daemon --http 127.0.0.1:8080` |
| **メッセージが届かない** | 送り主の番号が E.164 形式（先頭に `+`）で `SIGNAL_ALLOWED_USERS` に入っているか確認します |
| **「signal-cli not found on PATH」** と出る | signal-cli を入れて PATH に通すか、Docker を使います |
| **接続がすぐ切れる** | signal-cli の記録にエラーが出ていないか確認します。Java 17 以上が入っているかも確かめてください。 |
| **グループのメッセージが無視される** | `SIGNAL_GROUP_ALLOWED_USERS` にグループ ID を設定するか、すべてのグループを許可するなら `*` を設定します。 |
| **ボットが誰にも応じない** | `SIGNAL_ALLOWED_USERS` を設定するか、個別のやり取りのペアリングを使います。広く開けたい場合は、ゲートウェイの方針ですべての利用者を明示的に許可します。 |
| **同じメッセージが二重に届く** | その電話番号を見ている signal-cli が 1 つだけになっているか確認します |

---

## セキュリティ {#security}

:::warning
**アクセスの制御は必ず設定してください。** ボットは既定でターミナルを使えます。`SIGNAL_ALLOWED_USERS` も個別のペアリングも設定していない場合、ゲートウェイは安全のために受信をすべて拒否します。
:::

- 電話番号は、記録に出るときすべて伏せられます
- 新しい利用者を安全に迎えるには、個別のペアリングか、明示した許可一覧を使います
- グループ機能が本当に必要でなければ切ったままにするか、信頼できるグループだけを許可します
- Signal の端末間暗号化が、やり取りの中身を通信中も守ります
- `~/.local/share/signal-cli/` にある signal-cli のセッションデータにはアカウントの認証情報が入っています。パスワードと同じように扱ってください

---

## 環境変数の一覧 {#environment-variables-reference}

| 変数 | 必須 | 既定値 | 説明 |
|----------|----------|---------|-------------|
| `SIGNAL_HTTP_URL` | はい | — | signal-cli の HTTP の接続先 |
| `SIGNAL_ACCOUNT` | はい | — | ボットの電話番号（E.164） |
| `SIGNAL_ALLOWED_USERS` | いいえ | — | 電話番号または UUID をカンマ区切りで |
| `SIGNAL_GROUP_ALLOWED_USERS` | いいえ | — | 見にいくグループの ID。すべてなら `*`（省略するとグループを無効にします） |
| `SIGNAL_ALLOW_ALL_USERS` | いいえ | `false` | 誰でもやり取りできるようにします（許可一覧を使いません） |
| `SIGNAL_HOME_CHANNEL` | いいえ | — | 定期実行の通知の既定の宛先 |
