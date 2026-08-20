---
title: "WhatsApp"
description: "内蔵の Baileys ブリッジを使って Hermes Agent を WhatsApp のボットとして設定する"
upstream_path: user-guide/messaging/whatsapp.md
upstream_blob: 17d89e968d41eadc0761c967d5613821c3fa56ca
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/whatsapp
---

# WhatsApp の設定 {#whatsapp-setup}

Hermes は **Baileys** をもとにした内蔵のブリッジを通して WhatsApp につながります。これは WhatsApp Web のセッションをまねる方式で、公式の WhatsApp Business API を使うものでは **ありません**。Meta の開発者アカウントもビジネスの審査も要りません。

> `hermes gateway setup` を実行して **WhatsApp** を選ぶと、案内に沿って設定を進められます。

:::tip WhatsApp の二つのつなぎ方
このページで扱うのは **Baileys ブリッジ** です。設定が早く、個人のアカウントで使え、公開の URL も要りませんが、アカウントが止められる危険があります。

business として本格的にボットを動かし、安定して運用したいなら、代わりに **[WhatsApp Business Cloud API の手引き](/hermes/docs/user-guide/messaging/whatsapp-cloud/)** を見てください。こちらは Meta が公式に支える経路で、アカウントが止められる心配はありませんが、Meta の business アカウントと公開の webhook の URL が必要になります。

理由があれば、二つのアダプターを別々の電話番号で同時に動かすこともできます。
:::

:::warning 非公式の API — アカウントが止められる危険
WhatsApp は Business API の外にある第三者製のボットを公式には認めていません。第三者のブリッジを使うと、アカウントが制限される危険がわずかにあります。危険を減らすには次のようにします。
- ボット用に **専用の電話番号を用意します**（個人の番号は使いません）
- **大量送信や迷惑メッセージを送りません** — 会話らしい使い方にとどめます
- 先に連絡してきていない相手へ、**こちらから自動でメッセージを送りません**
:::

:::warning WhatsApp Web のプロトコルの更新
WhatsApp は Web のプロトコルをときどき更新します。そのたびに第三者のブリッジが一時的に動かなくなることがあります。その場合、Hermes 側でブリッジの依存を更新します。WhatsApp の更新のあとにボットが止まったら、Hermes を最新版にしてから連携をやり直してください。
:::

## 二つの使い方 {#two-modes}

| 使い方 | しくみ | 向いている場面 |
|------|-------------|----------|
| **ボット用の番号を分ける**（おすすめ） | ボット専用の電話番号を用意します。相手はその番号あてに直接メッセージを送ります。 | 使い勝手がすっきりし、複数人で使え、アカウントが止められる危険も低くなります |
| **自分あてのチャットを使う** | 自分の WhatsApp をそのまま使います。自分あてにメッセージを送ってエージェントと話します。 | すぐに始められ、一人で使う場合や試すときに向きます |

---

## 事前に必要なもの {#prerequisites}

- **Node.js v18 以上** と **npm** — WhatsApp のブリッジは Node.js のプロセスとして動きます
- WhatsApp を入れた **電話** — QR コードを読み取るために使います

以前のブラウザを動かす方式のブリッジと違い、いまの Baileys 方式のブリッジでは、手元に Chromium や Puppeteer 一式を用意する必要は **ありません**。

---

## ステップ 1: 設定のウィザードを動かす {#step-1-run-the-setup-wizard}

```bash
hermes whatsapp
```

ウィザードは次のように進みます。

1. どちらの使い方にするかを聞きます（**bot** か **self-chat**）
2. 必要ならブリッジの依存を入れます
3. 端末の画面に **QR コード** を出します
4. 読み取られるのを待ちます

**QR コードの読み取り方**

1. 電話で WhatsApp を開きます
2. **設定 → リンク済みデバイス** を開きます
3. **デバイスをリンク** を選びます
4. カメラを端末の QR コードに向けます

連携できるとウィザードが接続を知らせて終わります。セッションは自動で保存されます。

:::tip
QR コードが崩れて見えるときは、端末の幅が 60 桁以上あり、Unicode を表示できるか確かめてください。別の端末エミュレーターを試すのも手です。
:::

---

## ステップ 2: 二つ目の電話番号を用意する（ボットの使い方） {#step-2-getting-a-second-phone-number-bot-mode}

ボットとして使う場合、WhatsApp にまだ登録していない電話番号が必要です。選び方は三つあります。

| 選び方 | 費用 | 補足 |
|--------|------|-------|
| **Google Voice** | 無料 | 米国のみです。[voice.google.com](https://voice.google.com) で番号を取ります。WhatsApp の確認は Google Voice のアプリに届く SMS で行います。 |
| **プリペイド SIM** | 一度きり 5〜15 ドル | どの通信会社でも構いません。開通させて WhatsApp の確認を済ませたら、SIM は引き出しにしまっておけます。番号は有効なままにしてください（90 日ごとに一度は発信します）。 |
| **VoIP のサービス** | 無料〜月 5 ドル | TextNow、TextFree などです。WhatsApp が受け付けない VoIP の番号もあるので、最初のものが通らなければいくつか試してください。 |

番号を用意したら次のようにします。

1. 電話に WhatsApp を入れます（デュアル SIM なら WhatsApp Business アプリでも構いません）
2. 新しい番号を WhatsApp に登録します
3. `hermes whatsapp` を実行し、その WhatsApp アカウントで QR コードを読み取ります

---

## ステップ 3: Hermes を設定する {#step-3-configure-hermes}

`~/.hermes/.env` に次を書き足します。

```bash
# Required
WHATSAPP_ENABLED=true
WHATSAPP_MODE=bot                          # "bot" or "self-chat"

# Access control — pick ONE of these options:
WHATSAPP_ALLOWED_USERS=15551234567         # Comma-separated phone numbers (with country code, no +)
# WHATSAPP_ALLOWED_USERS=*                 # OR use * to allow everyone
# WHATSAPP_ALLOW_ALL_USERS=true            # OR set this flag instead (same effect as *)
```

:::tip 全員を許可する書き方
`WHATSAPP_ALLOWED_USERS=*` にすると **すべての** 送信者を許可します（`WHATSAPP_ALLOW_ALL_USERS=true` と同じ意味です）。
これは [Signal のグループの許可リスト](/hermes/docs/reference/environment-variables/) と同じ書き方です。
代わりにペアリングの流れを使いたいときは、どちらの変数も書かずに
[個別のやり取りのペアリング](/hermes/docs/user-guide/security/#dm-pairing-system) に任せてください。
:::

`~/.hermes/config.yaml` では、動きを変える設定も選べます。

```yaml
unauthorized_dm_behavior: pair

whatsapp:
  unauthorized_dm_behavior: ignore
```

- `unauthorized_dm_behavior: pair` が全体の初期値です。知らない相手から個別のメッセージが来ると、ペアリング用のコードを返します。
- `whatsapp.unauthorized_dm_behavior: ignore` にすると、許可していない相手からの個別のメッセージに WhatsApp が何も返さなくなります。私用の番号ではたいていこちらのほうが向いています。

そのあとゲートウェイを起動します。

```bash
hermes gateway              # Foreground
hermes gateway install      # Install as a user service
sudo hermes gateway install --system   # Linux only: boot-time system service
```

ゲートウェイは、保存されたセッションを使って WhatsApp のブリッジを自動で立ち上げます。

---

## セッションの保存 {#session-persistence}

Baileys のブリッジはセッションを `~/.hermes/platforms/whatsapp/session` に保存します。つまり次のようになります。

- **再起動してもセッションは残ります** — 毎回 QR コードを読み取り直す必要はありません
- セッションのデータには暗号鍵と端末の資格情報が入っています
- **このセッションのディレクトリを人に渡したり、リポジトリに入れたりしないでください** — WhatsApp のアカウントに丸ごと入れてしまうものです

---

## 連携をやり直す {#re-pairing}

セッションが壊れると（電話の初期化、WhatsApp の更新、手動での連携解除など）、ゲートウェイのログに接続のエラーが出ます。直すには次を実行します。

```bash
hermes whatsapp
```

新しい QR コードが出ます。もう一度読み取ればセッションがつなぎ直されます。**一時的な** 切断（通信の乱れ、電話が短いあいだ圏外になるなど）は、ゲートウェイが再接続の仕組みで自動的に処理します。

---

## 音声メッセージ {#voice-messages}

Hermes は WhatsApp の音声にも対応しています。

- **受け取る側:** 音声メッセージ（`.ogg` の opus）は、設定した音声認識の提供元で自動的に文字に起こされます。手元で動く `faster-whisper`、Groq の Whisper（`GROQ_API_KEY`）、OpenAI の Whisper（`VOICE_TOOLS_OPENAI_KEY`）のいずれかです
- **送る側:** 音声合成の返事は MP3 の音声ファイルとして添付されます
- エージェントの返事には初期状態で「⚕ **Hermes Agent**」が先頭に付きます。これは `config.yaml` で変えたり、なくしたりできます。

```yaml
# ~/.hermes/config.yaml
whatsapp:
  reply_prefix: ""                          # Empty string disables the header
  # reply_prefix: "🤖 *My Bot*\n──────\n"  # Custom prefix (supports \n for newlines)
  send_read_receipts: false                 # Mark accepted inbound messages as read (blue ticks)
```

`send_read_receipts` が `true` のとき、アダプターは個別・グループ・メンションの絞り込みを通ったメッセージを既読にします。弾かれたメッセージ（許可リストにない相手からのものなど）は既読になりません。プライバシーへの配慮から初期状態では無効です。この設定を変えると、次に接続するときブリッジの子プロセスが自動で立ち上げ直されます。

---

## メッセージの書式と送り方 {#message-formatting-delivery}

WhatsApp は **少しずつ書き足していく返事** に対応しています。AI が文章を作るのに合わせてボットが自分のメッセージをその場で書き換えていく方式で、Discord や Telegram と同じです。内部では、送信のできることの区分として WhatsApp を TIER_MEDIUM のプラットフォームとして扱っています。

### 分割 {#chunking}

長い返事は **4,096 文字** ごとに自動で複数のメッセージに分けられます（WhatsApp が実際に表示できる上限です）。設定は要りません。ゲートウェイが分割し、順番に送ります。

### WhatsApp に合わせたマークダウン {#whatsapp-compatible-markdown}

AI の返事に含まれる通常のマークダウンは、WhatsApp 本来の書式に自動で置き換えられます。

| マークダウン | WhatsApp | 表示 |
|----------|----------|------------|
| `**bold**` | `*bold*` | **bold** |
| `~~strikethrough~~` | `~strikethrough~` | ~~strikethrough~~ |
| `# Heading` | `*Heading*` | 太字（見出しの機能はありません） |
| `[link text](/hermes/docs/user-guide/messaging/url/)` | `link text (url)` | 文中の URL |

コードブロックと文中のコードは、WhatsApp がバッククォート三つの書式にもとから対応しているため、そのまま残ります。

### ツールの進み具合 {#tool-progress}

エージェントがツールを呼ぶと（ウェブ検索、ファイルの操作など）、WhatsApp にはどのツールが動いているかがその場で表示されます。初期状態で有効なので、設定は要りません。

### アンケート・選択肢の質問・位置情報 {#native-polls-clarify-as-poll-and-locations}

Baileys ブリッジのアダプター（ボットの使い方）は、WhatsApp のいくつかの機能をそのまま使えます。

- **アンケート** — エージェントはブリッジの `/send-poll` の窓口を通して、WhatsApp のアンケート（質問と選択肢）を送れます。投票の結果は会話に戻ってきます。
- **選択肢の質問をアンケートで出す** — エージェントが選択肢のある確認の質問をするとき、一つだけ選べるアンケートとして表示されます。選択肢をタップすれば答えたことになります。アンケートを送れなかった場合、アダプターはふつうの文章の質問に切り替えます。承認を求める場面がアンケートになることは **ありません**。アンケートを使うのは、本当に選択肢から選ぶ質問だけです。
- **位置情報のピン** — エージェントは `/send-location` を通して位置情報のピン（緯度と経度、必要なら名前や住所）を送れます。届いた位置情報（現在地の共有を含みます）は、位置情報のメッセージとしてエージェントに渡されます。

どれもボット（Baileys）の使い方なら最初から動きます。設定は要りません。

### メッセージのまとめ送り（待ち合わせ） {#message-batching-debounce}

WhatsApp はメッセージを一通ずつ届けます。そのため、立て続けに届いた場合（まとめての転送、貼り付けで分かれたもの、複数行の文章）、そのままでは断片ごとにエージェントが呼ばれてしまい、トークンを無駄にしたうえ、ばらばらの返事がいくつも並ぶことになります。アダプターは同じチャットから続けて届いた文章をためておき、少し静かになってから一つの依頼としてまとめて渡します（初期値は **5 秒**、断片がとても長い場合は **10 秒** に延びます）。`config.yaml` で調整できます。

```yaml
# ~/.hermes/config.yaml
gateway:
  platforms:
    whatsapp:
      extra:
        text_batch_delay_seconds: 5.0         # quiet period before flushing a batch
        text_batch_split_delay_seconds: 10.0  # extended delay near the split threshold
```

`text_batch_delay_seconds: 0` にすると、メッセージごとにすぐ渡されます（まとめ送りは無効になります）。

---

## 困ったときは {#troubleshooting}

| 症状 | 対処 |
|---------|----------|
| **QR コードが読み取れない** | 端末の幅が足りているか確かめます（60 桁以上）。別の端末も試してください。読み取るアカウントが正しいか（個人用ではなくボットの番号か）も確認します。 |
| **QR コードの期限が切れる** | QR コードはおよそ 20 秒ごとに作り直されます。時間切れになったら `hermes whatsapp` をやり直してください。 |
| **セッションが残らない** | `~/.hermes/platforms/whatsapp/session` があり、書き込めるか確かめます。コンテナで動かしているなら、消えない場所として割り当ててください。 |
| **知らないうちにログアウトされる** | WhatsApp は長く使われていない端末の連携を解除します。電話の電源を入れ、通信につないだままにしてください。必要なら `hermes whatsapp` で連携し直します。 |
| **ブリッジが落ちる、再接続を繰り返す** | ゲートウェイを再起動し、Hermes を更新します。WhatsApp のプロトコルの変更でセッションが無効になっていたら連携し直してください。 |
| **WhatsApp の更新後にボットが動かない** | Hermes を更新して最新のブリッジにしてから、連携し直します。 |
| **macOS で端末では node が動くのに「Node.js not installed」と出る** | launchd のサービスはシェルの PATH を引き継ぎません。`hermes gateway install` を実行していまの PATH を plist に取り込み直し、`hermes gateway start` を実行してください。詳しくは [ゲートウェイのサービスの説明](/hermes/docs/user-guide/messaging/#macos-launchd) を見てください。 |
| **メッセージが届かない** | `WHATSAPP_ALLOWED_USERS` に送信者の番号が入っているか確かめます（国番号付き、`+` や空白は入れません）。全員を許可するなら `*` にします。`.env` に `WHATSAPP_DEBUG=true` を書いてゲートウェイを再起動すると、`bridge.log` に生のメッセージの動きが出ます。 |
| **知らない相手にペアリングのコードを返してしまう** | 許可していない個別のメッセージを黙って無視したいなら、`~/.hermes/config.yaml` に `whatsapp.unauthorized_dm_behavior: ignore` を設定します。 |

---

## セキュリティ {#security}

:::warning
公開して使い始める前に、**アクセスの制御を設定してください**。`WHATSAPP_ALLOWED_USERS` に対象の電話番号（国番号を含め、`+` は付けません）を書くか、`*` で全員を許可するか、`WHATSAPP_ALLOW_ALL_USERS=true` を設定します。どれも設定していないと、ゲートウェイは安全のために届いたメッセージを **すべて拒みます**。
:::

初期状態では、許可していない個別のメッセージにもペアリングのコードが返ります。私用の WhatsApp の番号で知らない相手に一切反応させたくない場合は、次を設定します。

```yaml
whatsapp:
  unauthorized_dm_behavior: ignore
```

- `~/.hermes/platforms/whatsapp/session` にはセッションの資格情報がそのまま入っています。パスワードと同じように守ってください
- ファイルの権限を絞ります: `chmod 700 ~/.hermes/platforms/whatsapp/session`
- 個人のアカウントに影響が及ばないよう、ボットには **専用の電話番号** を使います
- 乗っ取られた疑いがあるときは、WhatsApp の 設定 → リンク済みデバイス から連携を解除します
- ログの電話番号は一部が伏せられますが、ログをどれだけ残すかの方針も見直してください
