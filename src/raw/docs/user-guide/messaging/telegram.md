---
title: "Telegram"
description: "Hermes Agent を Telegram のボットとして設定する"
upstream_path: user-guide/messaging/telegram.md
upstream_blob: 720217ec7effb55ffd413e0791414e1dac08a64b
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/telegram
---

# Telegram の設定 {#telegram-setup}

Hermes Agent は、機能のそろった会話ボットとして Telegram につながります。つないでしまえば、どの端末からでもエージェントと話せますし、送ったボイスメモは自動で文字起こしされ、定期実行の結果も届き、グループチャットでも使えます。この連携は [python-telegram-bot](https://python-telegram-bot.org/) の上に作られていて、テキスト、音声、画像、ファイルの添付に対応しています。

## 手順 1: BotFather でボットを作る {#step-1-create-a-bot-via-botfather}

Telegram のボットには、公式のボット管理ツールである [@BotFather](https://t.me/BotFather) が発行する API トークンが必ず必要です。

1. Telegram を開いて **@BotFather** を検索するか、[t.me/BotFather](https://t.me/BotFather) を開きます
2. `/newbot` を送ります
3. **表示名**を決めます（例: 「Hermes Agent」）。これは何でも構いません
4. **ユーザー名**を決めます。他と重ならず、末尾が `bot` である必要があります（例: `my_hermes_bot`）
5. BotFather が **API トークン**を返します。次のような文字列です。

```
123456789:ABCdefGHIjklMNOpqrSTUvwxYZ
```

:::warning
ボットのトークンは秘密にしてください。これを持っている人は誰でもボットを操れます。漏れた場合は、BotFather で `/revoke` を実行してすぐ無効にしてください。
:::

## 手順 2: ボットを整える（任意） {#step-2-customize-your-bot-optional}

次の BotFather のコマンドを使うと、使い心地がよくなります。@BotFather に送ってください。

| コマンド | 用途 |
|---------|---------|
| `/setdescription` | 会話を始める前に出る「このボットは何ができるか」の説明文 |
| `/setabouttext` | ボットのプロフィールに出る短い文 |
| `/setuserpic` | ボットのアイコンを設定します |
| `/setcommands` | コマンドのメニュー（チャットの `/` ボタン）を決めます |
| `/setprivacy` | ボットがグループのすべてのメッセージを見られるかを決めます（手順 3 を参照） |

:::tip
`/setcommands` の出発点としては、次の組み合わせが便利です。

```
help - Show help information
new - Start a new conversation
sethome - Set this chat as the home channel
```
:::

### オンライン / オフラインの表示（任意） {#onlineoffline-status-indicator-optional}

Telegram のボットには、本当の意味でのオンライン / オフラインの点は付きません。あの緑の点は
*利用者アカウント*の機能で、Bot API がボットのために公開しているものではありません。いちばん近いのは
ボットの**短い説明**（プロフィールで名前の下に出る行）です。

`status_indicator` を有効にすると、Hermes はゲートウェイがつながったときにその短い説明を **Online** に、
きちんと終了したときに **Offline** にします。

```yaml
gateway:
  platforms:
    telegram:
      extra:
        status_indicator: true
        # Optional custom strings (defaults: "Online" / "Offline"):
        status_online: "🟢 Online"
        status_offline: "🔴 Offline"
```

補足です。

- 短い説明はボット**全体**のもので（すべての利用者に見えます）、チャットごとではありません。
  開いているチャットの中の表示ではなく、ボットのプロフィールで見えます。
- 「Offline」が書かれるのは、ゲートウェイが**きちんと**終了したとき（`/stop`、`disconnect`）だけです。
  強制終了すると最後の状態が残ります。プロフィールの文で表す以上、避けられない限界です。
- ボット全体のプロフィールを書き換えるので、既定では無効です。

### コマンドメニューの優先度と上限（任意） {#command-menu-priority-and-cap-optional}

Hermes は Telegram のゲートウェイが起動したとき、コマンドのメニューを自動で登録します。メニューは、中心となるスラッシュコマンドの登録一覧に、条件を満たすプラグインや skill のコマンドを足して組み立て、Telegram が確実に受け取れるよう上限で切ります。既定の上限は 60 個で、組み込みのコマンド全部とよく使う skill のコマンドが見える程度です。

Telegram の `/` の一覧に必ず出したい skill・プラグイン・組み込みのコマンドがあるなら、`~/.hermes/config.yaml` で優先度を指定します。

```yaml
platforms:
  telegram:
    extra:
      command_menu:
        max_commands: 60
        priority_mode: prepend  # prepend | append | replace
        priority:
          - my_plugin_command
          - songsee          # skill commands work here too
```

`priority_mode` は、指定した並びを Hermes の組み込みの優先度とどう組み合わせるかを決めます。

- `prepend`: 指定したコマンドを先に置き、そのあとに Hermes の既定を並べます
- `append`: Hermes の既定を先に置き、そのあとに指定したコマンドを並べます
- `replace`: 優先度の並びとして、指定した分だけを使います

優先度は、上限で切る前の**まとめた**候補の一覧（本体のコマンド、プラグインのコマンド、skill のコマンド）に対して効きます。そのため、本体のコマンドだけでメニューが埋まる状況でも、優先度を指定した skill のコマンドには必ず場所が確保されます。以前は skill が常に先にアルファベット順で削られていたため、名前が後ろのほうにある skill は `priority` を書いても出てきませんでした。

Telegram は BotCommand を 100 個まで受け付けますが、大きな内容は失敗することがあります。Hermes は確実さを優先して既定を 60 にし、設定値は `1..100` に収めます。全部の一覧は `/commands` で見られます。

### インラインのコマンド選択: すべてを検索できます（上限なし） {#inline-command-picker-search-every-command-no-cap}

`/` のメニューには上限がありますが、Telegram の**インラインモード**にはありません。これを有効にすると、どのチャットでも `@yourbotname` に続けて語を打つだけで、Hermes の**すべての**コマンドと入れてある skill を、その場で検索できる一覧が出ます。結果は打つたびに計算されてページに分かれるので、削られるものはありません。

```
@yourbotname plan            → tap the /plan result to send it
@yourbotname plan migrate auth to OIDC   → sends /plan migrate auth to OIDC
@yourbotname pdf             → finds skills matching "pdf" by name or description
```

最初の語で絞り込み、そのあとの文字はすべて、送られるコマンドの引数として引き継がれます。結果を選ぶと、あなたからの普通のメッセージとしてコマンドが送られるので、通常のコマンドの経路で処理されます（コマンドで始まるメッセージは、プライバシーモードが有効でもボットに届きます）。

**一度だけの準備:** インラインモードは、どの Telegram のボットでも既定で無効です。[@BotFather](https://t.me/BotFather) で `/setinline` を実行して有効にしてください（ボットを選び、`Search commands and skills...` のような案内文を設定します）。それまで Telegram はインラインの問い合わせを届けないので、選択の一覧は動きません。

結果が返るのは、ゲートウェイの許可リストを通った利用者だけです。許可されていない相手には空の一覧が返るので、入れてある skill の顔ぶれが知らない相手に見えることはありません（インラインの問い合わせは、ボットがいないチャットからでも送れます）。

## 手順 3: プライバシーモード（グループでは重要） {#step-3-privacy-mode-critical-for-groups}

Telegram のボットには**プライバシーモード**があり、**既定で有効**です。グループでボットを使うときに、いちばんよく混乱のもとになる点です。

**プライバシーモードが有効**のとき、ボットが見られるのは次のものだけです。

- `/` で始まるコマンドのメッセージ
- ボット自身のメッセージへの返信
- サービスのメッセージ（参加・退出、ピン留めなど）
- ボットが管理者になっているチャンネルのメッセージ

**プライバシーモードが無効**のとき、ボットはグループのすべてのメッセージを受け取ります。

### プライバシーモードを切る手順 {#how-to-disable-privacy-mode}

1. **@BotFather** にメッセージを送ります
2. `/mybots` を送ります
3. 対象のボットを選びます
4. **Bot Settings → Group Privacy → Turn off** と進みます

:::warning
プライバシーの設定を変えたら、**そのボットをいったんグループから外して入れ直してください**。Telegram はボットがグループに入った時点のプライバシーの状態を覚えていて、外して入れ直すまで更新されません。
:::

:::tip
プライバシーモードを切る代わりに、ボットを**グループの管理者**にする方法もあります。管理者のボットは、プライバシーの設定にかかわらず必ずすべてのメッセージを受け取るので、ボット全体のプライバシーモードを切り替えずに済みます。
:::

### 自動で返さずにグループの会話を見せる {#observe-group-chatter-without-auto-replying}

OpenClaw や元宝のようなグループでの振る舞いにしたいなら、ボットが普通のグループのメッセージを**見られる**けれど、はっきり呼ばれたときだけ**答える**ように設定します。

```yaml
telegram:
  allowed_chats:
    - "-1001234567890"
  group_allowed_chats:
    - "-1001234567890"
  require_mention: true
  observe_unmentioned_group_messages: true
```

これを有効にすると、はっきり許可したチャットやトピックで、ボットを呼んでいないグループのメッセージが、共有のチャット・トピックのセッションの記録に、見ていた文脈として書き足されます。ただしエージェントは動きません。`allowed_chats` はボットが答える場所を決め、`group_allowed_chats` は見ていた文脈に使う共有のグループセッションを許可します。このモードでは同じチャット ID を両方に書いてください。あとから同じ許可済みのチャットやトピックで `@botname` と呼ばれたり、ボットへの返信があったり、設定した呼びかけの形に当たったりすると、見ていた文脈を使えます。呼ばれたメッセージには `[nickname|user_id]` の印が付き、そのターン限りの安全のための注意も添えられるので、モデルはそれまでの見ていた行を、ボットへの指示ではなく文脈として扱います。

同じことを環境変数で書くと次のようになります。

```bash
TELEGRAM_ALLOWED_CHATS=-1001234567890
TELEGRAM_GROUP_ALLOWED_CHATS=-1001234567890
TELEGRAM_OBSERVE_UNMENTIONED_GROUP_MESSAGES=true
```

これには、Telegram が普通のグループのメッセージをゲートウェイへ届ける必要があります。上に書いたとおり、BotFather のプライバシーモードを切るか、ボットをグループの管理者にしてください。

## 手順 4: 自分のユーザー ID を調べる {#step-4-find-your-user-id}

Hermes Agent は、Telegram の数字のユーザー ID で誰が使えるかを決めます。ユーザー ID はユーザー名では**なく**、`123456789` のような数字です。

**方法 1（おすすめ）:** [@userinfobot](https://t.me/userinfobot) にメッセージを送ると、すぐにユーザー ID が返ってきます。

**方法 2:** [@get_id_bot](https://t.me/get_id_bot) にメッセージを送ります。これも確実です。

この数字は次の手順で使うので、控えておいてください。

## 手順 5: Hermes を設定する {#step-5-configure-hermes}

### 方法 A: 対話形式の設定（おすすめ） {#option-a-interactive-setup-recommended}

```bash
hermes gateway setup
```

尋ねられたら **Telegram** を選びます。ウィザードがボットのトークンと許可するユーザー ID を聞き、設定を書き込んでくれます。

### 方法 B: 手で設定する {#option-b-manual-configuration}

`~/.hermes/.env` に次を足します。

```bash
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUvwxYZ
TELEGRAM_ALLOWED_USERS=123456789    # Comma-separated for multiple users
```

### ゲートウェイを起動する {#start-the-gateway}

```bash
hermes gateway
```

数秒でボットがつながるはずです。Telegram でメッセージを送って確かめてください。

## Docker のターミナルで作ったファイルを送る {#sending-generated-files-from-docker-backed-terminals}

ターミナルのバックエンドが `docker` の場合、Telegram への添付を送るのは
コンテナの中ではなく**ゲートウェイのプロセス**だという点に注意してください。つまり、
最後に書く `MEDIA:/...` のパスは、ゲートウェイが動いているホスト側から読めなければなりません。

よくあるつまずきは次のとおりです。

- エージェントが Docker の中で `/workspace/report.txt` にファイルを書く
- モデルが `MEDIA:/workspace/report.txt` と書く
- `/workspace/report.txt` はコンテナの中にしかなくホストにはないので、Telegram への配信が失敗する

おすすめのやり方は次のとおりです。

```yaml
terminal:
  backend: docker
  docker_volumes:
    - "/home/user/.hermes/cache/documents:/output"
```

そのうえで、

- Docker の中では `/output/...` にファイルを書きます
- `MEDIA:` には**ホストから見える**パスを書きます。たとえば
  `MEDIA:/home/user/.hermes/cache/documents/report.txt` です

すでに `docker_volumes:` の節があるなら、同じ並びに新しいマウントを足してください。
YAML のキーが重複すると、前のものが黙って上書きされます。

### `MEDIA:` で使えるファイルの拡張子 {#supported-media-file-extensions}

ゲートウェイは、エージェントの返答から `MEDIA:/path/to/file` の印を取り出し、そのファイルをプラットフォームに合った添付として送ります。ゲートウェイのすべてのプラットフォームで使える拡張子は次のとおりです。

| 種類 | 拡張子 |
|---|---|
| 画像 | `png`、`jpg`、`jpeg`、`gif`、`webp`、`bmp`、`tiff`、`svg` |
| 音声 | `mp3`、`wav`、`ogg`、`m4a`、`opus`、`flac`、`aac` |
| 動画 | `mp4`、`mov`、`webm`、`mkv`、`avi` |
| **文書** | `pdf`、`txt`、`md`、`csv`、`json`、`xml`、`html`、`yaml`、`yml`、`log` |
| **オフィス** | `docx`、`xlsx`、`pptx`、`odt`、`ods`、`odp` |
| **書庫** | `zip`、`rar`、`7z`、`tar`、`gz`、`bz2` |
| **書籍・パッケージ** | `epub`、`apk`、`ipa` |

この一覧にあるものは、対応しているプラットフォーム（Telegram、Discord、Signal、Slack、WhatsApp、Feishu、Matrix など）では添付として届きます。対応していないプラットフォームでは、リンクか文字での案内になります。**太字**の種類はここ数回のリリースで足されたものです。モデルに `here is the file: /path/to/report.docx` と書かせていたなら、`MEDIA:/path/to/report.docx` に変えれば添付として届きます。

## webhook モード {#webhook-mode}

既定では、Hermes は**ロングポーリング**で Telegram につながります。ゲートウェイが Telegram のサーバーへ外向きのリクエストを出して、新しい更新を取ってくる形です。手元の環境や、常に動かしておく構成ではこれでうまくいきます。

**クラウドに置く場合**（Fly.io、Railway、Render など）は、**webhook モード**のほうが費用を抑えられます。これらの環境は、外から HTTP が来たときに停止中のマシンを起こせますが、外向きの接続では起こせません。ポーリングは外向きなので、ポーリングのボットは眠れないのです。webhook モードは向きを逆にします。Telegram があなたのボットの HTTPS の URL へ更新を送るので、何もない間は眠らせておけます。

| | ポーリング（既定） | webhook |
|---|---|---|
| 向き | ゲートウェイ → Telegram（外向き） | Telegram → ゲートウェイ（内向き） |
| 向いている場面 | 手元の環境、常に動くサーバー | 自動で起きるクラウド |
| 準備 | 追加の設定は不要 | `TELEGRAM_WEBHOOK_URL` を設定します |
| 何もない間の費用 | マシンを動かし続ける必要があります | メッセージの合間はマシンを眠らせられます |

### 設定 {#configuration}

`~/.hermes/.env` に次を足します。

```bash
TELEGRAM_WEBHOOK_URL=https://my-app.fly.dev/telegram
TELEGRAM_WEBHOOK_SECRET="$(openssl rand -hex 32)"  # required
# TELEGRAM_WEBHOOK_PORT=8443        # optional, default 8443
```

| 変数 | 必須 | 説明 |
|----------|----------|-------------|
| `TELEGRAM_WEBHOOK_URL` | はい | Telegram が更新を送る、公開された HTTPS の URL。パスの部分は自動で取り出されます（上の例なら `/telegram`）。 |
| `TELEGRAM_WEBHOOK_SECRET` | **はい**（`TELEGRAM_WEBHOOK_URL` を設定したとき） | Telegram が確認のために毎回の webhook のリクエストに載せて返す秘密のトークン。これがないとゲートウェイは起動しません。[GHSA-3vpc-7q5r-276h](https://github.com/NousResearch/hermes-agent/security/advisories/GHSA-3vpc-7q5r-276h) を参照してください。`openssl rand -hex 32` で作れます。 |
| `TELEGRAM_WEBHOOK_PORT` | いいえ | webhook のサーバーが待ち受ける手元のポート（既定: `8443`）。 |

`TELEGRAM_WEBHOOK_URL` を設定すると、ゲートウェイはポーリングの代わりに HTTP の webhook サーバーを立ち上げます。設定しなければポーリングのままで、これまでの版と挙動は変わりません。

### クラウドに置く例（Fly.io） {#cloud-deployment-example-flyio}

1. Fly.io のアプリの secret に環境変数を足します。

```bash
fly secrets set TELEGRAM_WEBHOOK_URL=https://my-app.fly.dev/telegram
fly secrets set TELEGRAM_WEBHOOK_SECRET=$(openssl rand -hex 32)
```

2. `fly.toml` で webhook のポートを公開します。

```toml
[[services]]
  internal_port = 8443
  protocol = "tcp"

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443
```

3. デプロイします。

```bash
fly deploy
```

ゲートウェイのログに `[telegram] Connected to Telegram (webhook mode)` と出るはずです。

## プロキシへの対応 {#proxy-support}

Telegram の API が塞がれている場合や、通信をプロキシ経由にしたい場合は、Telegram 専用のプロキシの URL を設定します。これは汎用の `HTTPS_PROXY` / `HTTP_PROXY` の環境変数より優先されます。

**方法 1: config.yaml（おすすめ）**

```yaml
telegram:
  proxy_url: "socks5://127.0.0.1:1080"
```

**方法 2: 環境変数**

```bash
TELEGRAM_PROXY=socks5://127.0.0.1:1080
```

使える書き方は `http://`、`https://`、`socks5://` です。

プロキシは、Telegram への主な接続にも、代わりの IP を使う接続にも効きます。Telegram 専用のプロキシを設定していなければ、ゲートウェイは `HTTPS_PROXY` / `HTTP_PROXY` / `ALL_PROXY`（または macOS のシステムのプロキシの自動検出）に頼ります。

代わりの IP を探す経路が自分の環境でうまく動かない場合は、`HERMES_TELEGRAM_DISABLE_FALLBACK_IPS=true` を設定して、`api.telegram.org` への素の経路だけで最初の接続をするようにできます。DNS-over-HTTPS での探索にかける時間は `HERMES_TELEGRAM_FALLBACK_DISCOVERY_TIMEOUT` に秒で指定できます。既定は `5` です。

## ホームチャンネル {#home-channel}

Telegram のどのチャットでも（DM でもグループでも）`/sethome` を実行すると、そこが**ホームチャンネル**になります。定期実行（cron）の結果はここに届きます。

`~/.hermes/.env` で手で設定することもできます。

```bash
TELEGRAM_HOME_CHANNEL=-1001234567890
TELEGRAM_HOME_CHANNEL_NAME="My Notes"
```

:::tip
グループのチャット ID は負の数です（例: `-1001234567890`）。自分との DM のチャット ID は、自分のユーザー ID と同じです。
:::

### トピックモードでの cron の配信 {#cron-deliveries-in-topic-mode}

ボットとの DM でトピックモードを有効にしていると、チャットの根元に届く cron のメッセージはシステム専用の待合室に落ちます。そこで返信してもセッションは始まらず、「main chat is reserved for system commands」の案内が出ます。専用のフォーラムのトピック（たとえば `Cron`）を作り、次を設定してください。

```bash
TELEGRAM_CRON_THREAD_ID=<topic_thread_id>
```

`TELEGRAM_CRON_THREAD_ID` は、cron の配信についてだけ `TELEGRAM_HOME_CHANNEL_THREAD_ID` より優先されます。そのトピックでの返信は、トピックのいまのセッションの続きになります。

## ボイスメッセージ {#voice-messages}

### 受け取る音声（音声認識） {#incoming-voice-speech-to-text}

Telegram で送ったボイスメッセージは、Hermes に設定した音声認識の提供元によって自動で文字起こしされ、会話にテキストとして差し込まれます。

- `local` は Hermes が動いている端末で `faster-whisper` を使います。API キーは要りません
- `groq` は Groq の Whisper を使い、`GROQ_API_KEY` が必要です
- `openai` は OpenAI の Whisper を使い、`VOICE_TOOLS_OPENAI_KEY` が必要です

#### 文字起こしを飛ばして、音声ファイルをそのままエージェントへ渡す {#skipping-stt-pass-the-raw-audio-file-to-the-agent}

話者の切り分け、独自の文字起こしのツール、あるいは録音をそのまま残しておきたい、といった理由で、音声を**エージェント自身**に扱わせたい場合は、`~/.hermes/config.yaml` で `stt.enabled: false` にします。

```yaml
stt:
  enabled: false
```

音声認識を切ると、ゲートウェイはボイスや音声の添付を Hermes の音声の控えに保存はしますが、**文字起こしはしません**。エージェントには、次のような印の付いたメッセージが届きます。

```
[The user sent a voice message: /home/<user>/.hermes/cache/audio/<hash>.ogg]
```

自分のツールや skill から、そのパスを直接読めます（手元の話者切り分けの処理に渡す、もっと精度の高い文字起こしのモデルにかける、長期の保存先へ送るなど）。拡張子は Telegram が届けたもとの形式のままです（ボイスメモなら `.ogg`、音声の添付なら `.mp3` や `.m4a` など）。

これは後述の[手元の Bot API サーバー](#large-files-20mb-via-local-bot-api-server)の節と相性がよく、そちらは Telegram の getFile の 20MB の上限を 2GB まで引き上げます。処理したい録音が数分を超えるときに役立ちます。

### 送る音声（音声合成） {#outgoing-voice-text-to-speech}

エージェントが音声合成で音声を作ると、Telegram の**ボイスの吹き出し**として届きます。丸くて、その場で再生できるあれです。

- **OpenAI と ElevenLabs** はそのまま Opus を作るので、追加の準備は要りません
- **Edge TTS**（既定の無料の提供元）は MP3 を出すので、Opus に変換するために **ffmpeg** が必要です。

```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# macOS
brew install ffmpeg
```

ffmpeg がないと、Edge TTS の音声は普通の音声ファイルとして送られます（再生はできますが、ボイスの吹き出しではなく四角い再生の枠になります）。

音声合成の提供元は `config.yaml` の `tts.provider` で設定します。

## 大きなファイル（20MB 超）を手元の Bot API サーバーで {#large-files-20mb-via-local-bot-api-server}

Telegram の**公開の** Bot API は `getFile` での取得を **20 MB** までに制限しているので、それより大きいボイスメモ、音声、動画、文書は、Hermes から「too large」と返されて静かに弾かれます。これを避ける正式な方法は、**手元で** [telegram-bot-api](https://github.com/tdlib/telegram-bot-api) を動かすことです。Telegram が使っているのと同じサーバーのソフトを、自分のネットワークで動かします。手元のサーバーならファイルの上限が **2 GB** に上がり、Hermes は独自の `base_url` の設定を見つけると、自分の内部の上限も自動で引き上げます。

これでできるようになるのは、たとえば次のようなことです。

- 長いボイスメモ（45 分の打ち合わせ、ポッドキャスト）をボットに送る
- 画像認識のツールにかけるために大きな動画を上げる
- 話者の切り分け、位置合わせ、学習データ作りのために、素の音声を残しておく

### 手順 1: Telegram の API の資格情報を取る {#step-1-obtain-telegram-api-credentials}

手元のサーバーは、公開の Bot API ではなく Telegram の MTProto の層と直接話すので、**MTProto の資格情報**が必要です。

1. [my.telegram.org/apps](https://my.telegram.org/apps) を開き、Telegram のアカウントでサインインします。
2. 新しいアプリケーションを作ります（名前と短い説明は何でも構いません）。
3. `api_id` と `api_hash` を控えます。どちらも必要です。

### 手順 2: telegram-bot-api のサーバーを動かす {#step-2-run-the-telegram-bot-api-server}

いちばん手軽なのは、有志が管理している [`aiogram/telegram-bot-api`](https://hub.docker.com/r/aiogram/telegram-bot-api) の Docker イメージです。最小限の `docker-compose.yaml` は次のようになります（上限を上げるには `--local` モードを使います）。

```yaml
services:
  tg-bot-api:
    image: aiogram/telegram-bot-api:latest
    container_name: tg-bot-api
    restart: unless-stopped
    ports:
      - "127.0.0.1:8081:8081"   # bind to loopback only; see security note
    environment:
      TELEGRAM_API_ID: "12345"           # your api_id from Step 1
      TELEGRAM_API_HASH: "abcdef..."     # your api_hash from Step 1
      TELEGRAM_LOCAL: "1"                # enable --local mode (raises 20MB → 2GB)
    volumes:
      - ./tg-bot-api-data:/var/lib/telegram-bot-api
```

起動します。

```bash
docker compose up -d tg-bot-api
docker logs --tail 20 tg-bot-api
```

:::warning セキュリティ
手元の Bot API サーバーは、ボットのトークンを URL のパスに入れて受け取ります（例: `/bot<TOKEN>/getMe`）。**それ以外の認証はありません。** そのポートに届く相手は誰でも、ボットを完全に操れます。見えるメッセージをすべて読み、ボットとしてメッセージを送ることもできます。コンテナは `127.0.0.1` に縛るか、私設のネットワークでリバースプロキシの後ろに置いてください。**ポート 8081 を公開のインターネットにさらしてはいけません。**
:::

### 手順 3: 公開の API からボットをログアウトさせる（一度だけ） {#step-3-log-the-bot-out-of-the-public-api-one-time}

1 つのボットが同時に動けるのは、**1 つの** Bot API サーバーだけです。すでに `api.telegram.org` でボットを動かしていたなら（ほぼ間違いなくそうです）、手元のサーバーが受け付ける前に、そちらから明示的にログアウトさせる必要があります。

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/logOut"
# expected response: {"ok":true,"result":true}
```

これは一度きりの移行の手順で、再起動のたびに繰り返す必要はありません。`logOut` のあとに届いたメッセージは、Telegram が新しいサーバーへ届けます。

手元のサーバーが、ボットの代わりに Telegram と話せるか確かめます。

```bash
curl "http://127.0.0.1:8081/bot<YOUR_BOT_TOKEN>/getMe"
# expected response: {"ok":true,"result":{"id":...,"is_bot":true,...}}
```

### 手順 4: Hermes を手元のサーバーへ向ける {#step-4-point-hermes-at-the-local-server}

`~/.hermes/config.yaml` の `platforms.telegram.extra` の下に URL を足します。

```yaml
platforms:
  telegram:
    extra:
      base_url: "http://127.0.0.1:8081/bot"
      base_file_url: "http://127.0.0.1:8081/file/bot"
      local_mode: true        # see Step 5 below — only set this if the bot's data
                              # directory is readable by the Hermes process
```

:::caution `telegram.extra` ではなく `platforms.telegram.extra` を使ってください
いまのところ、プラットフォームの設定に深く合成されるのは `platforms.<name>.extra` の形だけです。最上位の `telegram.extra` の下に直接書いたキーは、黙って捨てられます。
:::

`base_url` を設定すると、Hermes は次のように動きます。

- python-telegram-bot のクライアントを、手元のサーバー向けに組み立てます
- 内部の文書・音声のサイズの上限を 20 MB から 2 GB へ自動で引き上げます
- 「too large」のエラーに、いま効いている上限を出します（`Maximum: 2048 MB.`）。どちらのモードで動いているかがすぐ分かります

ゲートウェイを再起動し、確認のログの行を探してください。

```bash
hermes gateway restart
grep -E "Using custom Telegram base_url|Using Telegram local_mode" ~/.hermes/logs/gateway.log | tail
```

### 手順 5: `local_mode` — ディスク上のファイルへの読み取り {#step-5-localmode-file-access-on-disk}

手元のサーバーがファイルを渡す方法は**2 通り**あります。

1. **`--local` なし**（既定）: ファイルは公開の Bot API と同じく `/file/bot<TOKEN>/<path>` の HTTP で配られます。20MB の上限はそのままです。ネットワークの問題を避けるためだけに使えます（`api.telegram.org` に届かないが自分で立てられる場合など）。サイズの上限を上げる目的には向きません。
2. **`--local` あり**（上の `TELEGRAM_LOCAL=1`）: ファイルはサーバーのファイルシステムへ書かれ、`getFile` の応答は HTTP の URL ではなく**絶対パス**を返します。20MB の上限はなくなります。Hermes は HTTP ではなく**ディスクから**中身を読むことになります。

ディスクからの読み取りを成り立たせるには、上の設定で `local_mode: true` にし、**そのうえで** Hermes のプロセスがサーバーの返すパスを読めるようにします。状況は 2 つあります。

- **同じ端末** — telegram-bot-api と Hermes が同じホストで動いている場合。データの置き場を Hermes が読めるディレクトリ（たとえば `/var/lib/telegram-bot-api`）にマウントし、ファイルの持ち主が合っているか確かめます。コンテナは内部の `telegram-bot-api` という利用者へ権限を落とします（uid はイメージによって違います）。いちばん簡単なのは、compose のサービスに `user: "<UID>:<GID>"` を足して、Hermes がすでに使っている uid の持ち物にすることです。
- **別の端末** — ボットのサーバーが 1 台（NAS や別の仮想マシンなど）、Hermes が別の端末で動いている場合。サーバーのデータのディレクトリは、サーバーが報告するのと**同じ絶対パス**（たいてい `/var/lib/telegram-bot-api`）で Hermes の端末から見える必要があります。これには NFS が向いています。ファイルシステムの層で uid の食い違いを扱いたくないなら、`uid=` で読み替えられる CIFS / SMB のほうが扱いやすいでしょう。

`local_mode: true` にしてあるのに、Hermes が返されたパスを `stat` できない場合（権限やマウントの誤り）、python-telegram-bot は黙って手元のサーバーへの HTTP の `getFile` に落ちます。ところが `--local` モードのサーバーはそれに `404 Not Found` を返します。症状は `gateway.log` に次のように出ます。

```
[Telegram] Failed to cache voice: Not Found
telegram.error.InvalidToken: Not Found
```

これが出たら、上限の引き上げは効いていて、ファイルの共有ができていない状態です。Hermes の端末で、ゲートウェイを動かしている利用者として `ls -la /var/lib/telegram-bot-api/<TOKEN>/voice/` を実行し、ファイルを 1 つ権限のエラーなく `cat` できることを確かめてください。

### 手順 6: 試す {#step-6-test-it}

20 MB より大きいボイスメモか音声ファイルをボットに送ります。ゲートウェイのログを流し見します。

```bash
tail -f ~/.hermes/logs/gateway.log | grep -iE "telegram|cache"
```

`[Telegram] Cached user voice at /home/<user>/.hermes/cache/audio/...` の行が出て、「too large」の拒否が**出ない**はずです。上に書いた `stt.enabled: false` と組み合わせれば、もとの音声ファイルのパスがエージェントへの受信メッセージに入り、そのあとの処理に使えます。

## グループチャットでの使い方 {#group-chat-usage}

Hermes Agent は Telegram のグループチャットでも動きますが、いくつか気をつける点があります。

- **プライバシーモード**が、ボットの見られるメッセージを決めます（[手順 3](#step-3-privacy-mode-critical-for-groups)を参照）
- `TELEGRAM_ALLOWED_USERS` は変わらず効きます。グループでも、許可された利用者だけがボットを動かせます
- `telegram.require_mention: true` にすれば、普通のグループの会話には反応しなくなります
- `telegram.require_mention: true` のとき、グループのメッセージが受け付けられるのは次の場合です。
  - ボットのメッセージへの返信
  - `@botusername` の呼びかけ
  - `/command@botusername`（Telegram のボットメニューの、ボット名を含むコマンドの形）
  - `telegram.mention_patterns` に設定した正規表現の呼びかけに当たったとき
- 1 つのグループに Hermes のボットが複数いる場合、`telegram.exclusive_bot_mentions` が振り分けをはっきりさせます。メッセージが Telegram のボットのユーザー名をはっきり呼んでいるときは、呼ばれたボットのプロファイルだけが処理し、他の Hermes のボットは、返信や呼びかけの語による受け付けが動く前に無視します。これは既定で有効です。
- BotFather でボットの `@username` を変えても自動で追随します。Hermes はゲートウェイを再起動しなくても新しい名前で呼びかけを振り分けます。末尾が `bot` でない収集品（Fragment）のユーザー名にも対応しています。
- `telegram.ignored_threads` を使うと、そのグループが自由な応答や呼びかけによる応答を許していても、特定の Telegram のフォーラムのトピックでは Hermes を黙らせておけます
- `telegram.require_mention` を書かないか false にすると、Hermes はこれまでどおり開かれたグループの振る舞いで、見えている普通のグループのメッセージに応答します

### 1 つのグループに複数の Hermes のボットを置く {#multiple-hermes-bots-in-one-group}

同じ Telegram のグループで Hermes のプロファイルをいくつも動かすなら、プロファイルごとに Telegram のボットのトークンを 1 つ作り、プロファイルごとにゲートウェイを 1 つ起動してください。同じボットのトークンを、動いている複数のゲートウェイで使い回してはいけません。Telegram は同じトークンでの同時のポーリングを拒否します。

グループでのおすすめの設定は次のとおりです。

```yaml
telegram:
  require_mention: true
  exclusive_bot_mentions: true
  mention_patterns: []
```

この設定なら、`@research_bot @ops_bot summarize this` のようなグループのメッセージは `research_bot` と `ops_bot` だけが処理します。そのグループにいる他の Hermes のボットは、そのメッセージが自分の以前のメッセージへの返信であっても、共通の呼びかけの語に当たっていても、黙ったままです。

グループの会話の文章やメディアの説明文は、他の参加者の名前も入っているときはすべての呼びかけを残します（`@research_bot , @ops_bot are you both listening?` は `research_bot` にそのまま届きます）。呼ばれているのがそのボットだけのときは、自分の名前は取り除かれるので、`@hermes_bot 2` のような短い答えも通ります。グループのターンでは、チャンネルごとの文脈にそのボット自身の Telegram のユーザー名も載るので、残った呼びかけのどれが自分あてかをモデルが判断できます。スラッシュコマンドは、これまでどおりコマンドとして整えられます。

`exclusive_bot_mentions: false` にするのは、はっきりした呼びかけが返信や呼びかけの語より優先されては困る、古い設定のグループのときだけにしてください。

いくつものプロファイルを動かすには、プロファイルごとにゲートウェイのコマンドを実行します。たとえば次のようにします。

```bash
# default profile
hermes gateway start
hermes gateway status
hermes gateway stop

# named profiles
hermes -p research gateway start
hermes -p research gateway status
hermes -p research gateway stop
```

数の決まった小さな構成なら、既定のプロファイルには `hermes gateway <action>`、名前付きのプロファイルには `hermes -p <profile> gateway <action>` を呼ぶシェルのループやスクリプトを使ってください。1 つのプロセス単位のコマンドで、どのサービス管理のしくみでも名前付きのプロファイル全部を操れる、と決めてかかるよりずっと確実です。

### 困ったとき: DM では動くのにグループでは動かない {#troubleshooting-works-in-dms-but-not-groups}

DM では応答するのにグループでは黙っている場合、次の関門を順に確かめてください。

1. **Telegram が届けているか:** BotFather のプライバシーモードを切る、ボットを管理者にする、
   またはボットをはっきり呼ぶ。Telegram がボットに届けていないグループのメッセージには、
   Hermes は応答できません。
2. **プライバシーを変えたら入れ直す:** BotFather のプライバシーの設定を変えたら、ボットを
   グループから外して入れ直してください。Telegram は、すでにある参加の状態については
   古い配信の挙動を保つことがあります。
3. **Hermes 側の許可:** 送信者が `TELEGRAM_ALLOWED_USERS` か
   `TELEGRAM_GROUP_ALLOWED_USERS` に入っているか、あるいはそのグループのチャットが
   `TELEGRAM_GROUP_ALLOWED_CHATS` で許可されているかを確かめます。
4. **呼びかけの条件:** `telegram.require_mention: true` にしていると、普通のグループの
   会話は、スラッシュコマンド、ボットへの返信、`@botusername` の呼びかけ、設定した
   `mention_patterns` に当たったもの以外は無視されます。
5. **複数のボットの振り分け:** グループにボットが何体もいるなら、Hermes の各プロファイルが
   別々のボットのトークンを使っているか確かめ、古い共通の呼びかけの挙動をあえて使いたいので
   なければ `exclusive_bot_mentions` は有効のままにしてください。

Telegram のグループやスーパーグループでは、チャット ID が負の数になるのが普通です。
チャット単位で許可するなら、その ID は送信者の許可リストではなく
`TELEGRAM_GROUP_ALLOWED_CHATS` に書いてください。

### グループでの呼び出しの設定例 {#example-group-trigger-configuration}

`~/.hermes/config.yaml` に次を足します。

```yaml
telegram:
  require_mention: true
  exclusive_bot_mentions: true
  mention_patterns:
    - "^\\s*chompy\\b"
  ignored_threads:
    - 31
    - "42"
```

この例では、いつもの呼び出し方に加えて、`@mention` を使わなくても `chompy` で始まるメッセージが通ります。
Telegram のトピック `31` と `42` のメッセージは、呼びかけの確認や自由な応答の確認より前に、常に無視されます。

### `mention_patterns` についての補足 {#notes-on-mentionpatterns}

- 書き方は Python の正規表現です
- 大文字と小文字は区別しません
- テキストのメッセージと、メディアの説明文の両方が照合されます
- 正しくない正規表現は、ボットを落とすのではなく、ゲートウェイのログに警告を出して無視されます
- メッセージの先頭でだけ当てたいときは、`^` を付けてください

## DM のトピック（Bot API 9.4） {#private-chat-topics-bot-api-94}

Telegram の Bot API 9.4（2026 年 2 月）で**私的なチャットのトピック**が入りました。ボットが 1 対 1 の DM の中に、フォーラムのようなトピックのスレッドを直接作れます。スーパーグループは要りません。これを使えば、Hermes との既存の DM の中で、互いに独立した作業場所をいくつも動かせます。

### 使いどころ {#use-case}

長く続くプロジェクトをいくつも抱えているなら、トピックで文脈を分けられます。

- **トピック「Website」** — 本番の Web サービスの作業
- **トピック「Research」** — 文献の調査と論文の探索
- **トピック「General」** — 雑多な作業と短い質問

トピックごとに会話のセッション、履歴、文脈を持ち、互いに完全に分かれています。

### 設定 {#configuration}

:::caution 前もって必要なこと
設定にトピックを足す前に、利用者がボットとの DM で **Topics モードを有効にする**必要があります。

1. Telegram で Hermes のボットとの私的なチャットを開きます
2. 上部のボットの名前を押して、チャットの情報を開きます
3. **Topics** を有効にします（そのチャットをフォーラムに変える切り替えです）

これをしないと、Hermes は起動時に `The chat is not a forum` とログに出して、トピックの作成を飛ばします。これは Telegram のクライアント側の設定で、ボットからは有効にできません。
:::

`~/.hermes/config.yaml` の `platforms.telegram.extra.dm_topics` の下にトピックを足します。

```yaml
platforms:
  telegram:
    extra:
      dm_topics:
      - chat_id: 123456789        # Your Telegram user ID
        topics:
        - name: General
          icon_color: 7322096
        - name: Website
          icon_color: 9367192
        - name: Research
          icon_color: 16766590
          skill: arxiv              # Auto-load a skill in this topic
```

**項目:**

| 項目 | 必須 | 説明 |
|-------|----------|-------------|
| `name` | はい | トピックの表示名 |
| `icon_color` | いいえ | Telegram のアイコンの色の番号（整数） |
| `icon_custom_emoji_id` | いいえ | トピックのアイコンに使う絵文字の ID |
| `skill` | いいえ | このトピックで新しいセッションが始まったときに自動で読み込む skill |
| `thread_id` | いいえ | トピックを作ったあとに自動で書き込まれます。手で書かないでください |

### しくみ {#how-it-works}

1. ゲートウェイの起動時、Hermes はまだ `thread_id` のないトピックそれぞれについて `createForumTopic` を呼びます
2. `thread_id` は `config.yaml` へ自動で書き戻されるので、次からの起動では API の呼び出しを飛ばします
3. トピックはそれぞれ、分けられたセッションのキー `agent:main:telegram:dm:{chat_id}:{thread_id}` に対応します
4. どのトピックのメッセージも、自分だけの会話の履歴、記憶の書き出し、文脈の窓を持ちます

### 根元の DM の扱い {#root-dm-handling}

既定では、根元の DM（どのトピックにも属さない場所）へ送ったメッセージも普通に処理されます。
`ignore_root_dm: true` にすると、根元の DM は待合室になります。DM のトピックを設定している
利用者からの普通のメッセージは黙って無視され、システムのコマンド（`/start`、`/help`、`/status` など）は
そのまま使えます。

```yaml
platforms:
  telegram:
    extra:
      ignore_root_dm: true
      dm_topics:
        - chat_id: 123456789
          topics:
            - name: General
```

この判定は**チャットごと**です。`dm_topics` に少なくとも 1 つ項目のある利用者だけが、
根元の DM の扱いが変わります。トピックを設定していない利用者には影響しません。

### skill の結び付け {#skill-binding}

`skill` の項目を持つトピックでは、そのトピックで新しいセッションが始まったときに、その skill が自動で読み込まれます。会話の最初に `/skill-name` と打つのとまったく同じで、skill の内容が最初のメッセージに差し込まれ、以降のメッセージからは会話の履歴として見えます。

たとえば `skill: arxiv` のトピックでは、セッションが作り直されるたび（自分で `/new` か `/reset` を実行したあと）に arxiv の skill が先に読み込まれます。

:::tip
設定の外で作ったトピック（Telegram の API を手で呼んだ場合など）は、`forum_topic_created` のサービスメッセージが届いたときに自動で見つかります。ゲートウェイが動いている間に設定へトピックを足すこともできます。次に控えが外れたときに拾われます。
:::

## DM を複数セッションにするモード（`/topic`） {#multi-session-dm-mode-topic}

ChatGPT のように、1 つのボットで複数の会話を並べて進められる DM のモードです。上の、運用する人が決める `extra.dm_topics` と違い、こちらは**利用者が動かします**。設定も、あらかじめ決めたトピック名も要りません。利用者が `/topic` で有効にし、Telegram の **+** ボタンで好きなだけトピックを作れます。それぞれが完全に独立した Hermes のセッションになります。

### `/topic` のサブコマンド {#topic-subcommands}

| 形 | 使う場所 | 効果 |
|------|---------|--------|
| `/topic` | 根元の DM、まだ有効でない | BotFather 側の対応を確かめ、複数セッションのモードを有効にし、ピン留めした System のトピックを作ります |
| `/topic` | 根元の DM、すでに有効 | 状況を表示します。呼び戻せる、結び付いていないセッションの一覧です |
| `/topic` | トピックの中 | いまのトピックが結び付いているセッションを表示します |
| `/topic help` | どこでも | その場での使い方 |
| `/topic off` | 根元の DM | 複数セッションのモードを止め、このチャットのトピックの結び付きをすべて消します |
| `/topic <session-id>` | トピックの中 | 以前の Telegram のセッションを、いまのトピックへ呼び戻します |

`/topic` を実行できるのは、許可された利用者だけです（`TELEGRAM_ALLOWED_USERS` やプラットフォームの認可の設定による許可リスト）。許可されていない送信者には、有効化ではなく断りが返ります。

### DM のトピックと、複数セッションの DM モードの違い {#dm-topics-vs-multi-session-dm-mode}

| | `extra.dm_topics`（設定で決める） | `/topic`（利用者が決める） |
|---|---|---|
| 有効にする人 | 運用する人が `config.yaml` で | 利用者が `/topic` を送って |
| トピックの並び | 設定に書いた決まった数 | 利用者が自由に作ったり消したり |
| トピックの名前 | 運用する人が決めます | 利用者が決めます。Hermes のセッションのタイトルに合わせて自動で変わります |
| 根元の DM の扱い | 普通のチャット（`ignore_root_dm: true` なら待合室） | システム用の待合室になります（コマンド以外のメッセージは断られます） |
| 主な用途 | 常設の作業場所と、任意の skill の結び付け | その場その場の並行したセッション |
| 保存先 | 設定の `extra.dm_topics` | SQLite の `telegram_dm_topic_mode` と `telegram_dm_topic_bindings` のテーブル |

この 2 つは同じボットで同時に使えます。ある利用者の DM で `/topic` を動かしつつ、他のチャットでは `extra.dm_topics` が運用する人の決めたトピックを管理し続けます。

### 前もって必要なこと {#prerequisites}

**@BotFather** で対象のボットを開き、**Bot Settings → Threads Settings** と進みます。

1. **Threaded Mode** を有効にします（`has_topics_enabled` が立ちます）
2. 利用者によるトピックの作成を無効に**しない**でください（`allows_users_to_create_topics` を有効なままにします）

利用者が最初に `/topic` を実行したとき、Hermes は `getMe` を呼んでこの 2 つを確かめます。どちらかが無効なら、Hermes は BotFather の Threads Settings の画面のスクリーンショットを送り、何を切り替えればよいかを説明します。条件がそろうまで有効にはなりません。

### 有効にする流れ {#activation-flow}

根元の DM から次を送ります。

```
/topic
```

Hermes は次のことをします。

1. `getMe().has_topics_enabled` と `allows_users_to_create_topics` を確かめます
2. どちらも有効なら、この DM で複数セッションのトピックのモードを有効にします
3. 状況やコマンド用の **System** のトピックを作ってピン留めします（できる範囲で）
4. 呼び戻せる、以前の結び付いていない Telegram のセッションの一覧を返します

有効にしたあと、**根元の DM は待合室になります**。普通の依頼は断られ、**All Messages** を使うよう案内されます。システムのコマンド（`/status`、`/sessions`、`/usage`、`/help` など）は根元でも使えます。

### 新しいトピックを作る（利用者の操作） {#creating-a-new-topic-end-user-flow}

1. Telegram でボットとの DM を開きます
2. ボットの画面の上にある **All Messages** を押して、何かメッセージを送ります
3. Telegram がそのメッセージのために新しいトピックを作ります
4. Hermes がそのトピックの中で応答します。そのトピックはこれで独立したセッションです

どのトピックも、自分だけの会話の履歴、モデルの状態、ツールの実行、セッション ID を持ちます。分けるためのキーは `agent:main:telegram:dm:{chat_id}:{thread_id}` で、設定で決める DM のトピックと同じです。

### トピックの名前が自動で変わります {#auto-renamed-topics}

Hermes が最初のやり取りのあと、自動のタイトル付けでそのトピックのセッションのタイトルを作ると、Telegram のトピックの名前もそれに合わせて変わります。たとえば「New Topic」が「Database migration plan」になります。これはできる範囲での動きで、失敗してもログに残るだけでセッションは壊れません。

これをやめて、自分で付けたトピックの名前をそのままにしたい場合は、次を設定します。

```yaml
gateway:
  platforms:
    telegram:
      extra:
        disable_topic_auto_rename: true
```

これを有効にすると、Hermes は内部のセッションのタイトル（`hermes sessions` や TUI などが使うもの）は作り続けますが、Telegram のトピック名には手を触れません。BotFather の Threaded Mode で自分でトピックを整理していて、最初の返答のたびに名前を書き換えられたくないときに便利です。

### トピックの中の `/new` {#new-inside-a-topic}

いまのトピックのセッションを作り直します（新しいセッション ID、まっさらな履歴）。他のトピックには触れません。Hermes は、並行して進めたいなら（**All Messages** から）別のトピックを作るほうがたいてい向いている、という案内を添えて返します。

### 以前のセッションを呼び戻す {#restoring-a-previous-session}

トピックの中で次を送ります。

```
/topic <session-id>
```

新しく始める代わりに、いまのトピックを既存の Hermes のセッションに結び付けます。トピックのモードを有効にする前に始めた会話を続けたいときに便利です。制限は次のとおりです。

- 対象のセッションは、同じ Telegram の利用者のものである必要があります
- 対象のセッションが、すでに別のトピックに結び付いていてはいけません

Hermes はセッションのタイトルを添えて確認し、文脈のために最後のアシスタントのメッセージをもう一度出します。

セッション ID を調べるには、根元の DM で（引数なしの）`/topic` を送ります。Hermes が、その利用者の結び付いていない Telegram のセッションを並べます。

### トピックの中で引数なしの `/topic` {#topic-inside-a-topic-no-argument}

いまのトピックの結び付きを表示します。セッションのタイトル、セッション ID、そして `/new` と別のトピックを作ることの使い分けの案内です。

### 内側のしくみ {#under-the-hood}

- 有効にした状態は `state.db` の `telegram_dm_topic_mode(profile_name, chat_id, user_id, enabled, ...)` に残ります。主キーは `(profile_name, chat_id)` なので、1 つの `state.db` を共有する多重化・プロファイル振り分けのボットどうしが、同じ Telegram の利用者が複数のボットに DM しても互いを踏み潰しません（私的なチャットの `chat_id` は利用者の id なので、どのボットでも同じになります）。
- トピックごとの結び付きは `telegram_dm_topic_bindings(profile_name, chat_id, thread_id, session_id, ...)` に残ります。主キーは `(profile_name, chat_id, thread_id)` で、`session_id` に `ON DELETE CASCADE` が付いているので、セッションを整理すればトピックの結び付きも自動で消えます
- トピックのモードのための SQLite の移行は**必要になったときだけ**走ります。ゲートウェイの起動時ではなく、最初の `/topic` の呼び出しで実行されます。そのプロファイルで誰かが `/topic` を実行するまで、`state.db` は変わりません。スキーマの v3 で `profile_name` が足され、古い行は `default` の名前空間へ移されます
- 受信した DM のメッセージはそれぞれ、**振り分けられた**プロファイル（プロセス全体で動いているプロファイルではなく `source.profile`）を使って `(profile_name, chat_id, thread_id)` の結び付きを探します。見つかれば `SessionStore.switch_session()` で、そのメッセージを結び付いたセッションへ回すので、セッションのキーとセッション ID の対応がディスク上で食い違いません
- トピックの中の `/new` は、結び付きの行を新しいセッション ID へ書き換えるので、次のメッセージは新しいセッションのままです
- `extra.dm_topics` に書いたトピックの名前が**自動で変わることはありません**。複数セッションのモードを有効にしていても、運用する人が決めた名前が保たれます
- `extra.disable_topic_auto_rename: true` にすると、そのチャットの**すべての**トピック（Threaded Mode でその場で作ったものも含めて）で自動の名前変更が止まります
- フォーラムになっている DM の General（上にピン留めされたもの）のトピックは、Telegram がそのメッセージを `message_thread_id=1` で届けても thread_id なしで届けても、根元の待合室として扱われます
- 根元の待合室の案内は、**（プロファイル, チャット）**ごとに 30 秒に 1 通までに抑えられます。トピックのモードが有効なのを忘れて根元に 10 回書いた人に 10 回返すことはありませんし、1 つのチャット ID を共有する 2 つの多重化されたプロファイルが、互いの案内を止めてしまうこともありません
- BotFather の設定のスクリーンショットは、**（プロファイル, チャット）**ごとに 5 分に 1 回までです。Threads Settings が無効なまま `/topic` を繰り返しても、同じ画像を何度も送ることはありません
- トピックの中で始めた `/bg <prompt>` は、結果を同じトピックへ返します。バックグラウンドのセッションが、そのトピックの名前の自動変更を起こすことはありません
- `/topic` そのものも、ボットの利用者の認可の確認を通ります。許可されていない DM には、有効化ではなく断りが返ります

### 複数セッションのモードを止める {#disabling-multi-session-mode}

根元の DM で `/topic off` を送ります。Hermes は**このプロファイルの**名前空間の行を無効にし、そのチャットについてそのプロファイルの `(thread_id → session_id)` の結び付きを消し、根元の DM は普通の Hermes のチャットに戻ります。Telegram にあるトピックが消えるわけではなく、独立したセッションとして扱われなくなるだけです。あとでもう一度 `/topic` を実行すれば元に戻せます。

手で片付ける必要があるとき（たくさんのチャットをまとめて戻すときなど）は、`profile_name` で範囲を絞ってください（プロファイルが 1 つだけなら `default` です）。

```bash
sqlite3 ~/.hermes/state.db \
  "UPDATE telegram_dm_topic_mode SET enabled = 0
     WHERE profile_name = 'default' AND chat_id = '<your_chat_id>';
   DELETE FROM telegram_dm_topic_bindings
     WHERE profile_name = 'default' AND chat_id = '<your_chat_id>';"
```

### Hermes を古い版に戻すとき {#downgrading-hermes}

`/topic` より前の版の Hermes に戻すと、この機能はただ動かなくなります。`telegram_dm_topic_mode` と `telegram_dm_topic_bindings` のテーブルは `state.db` に残りますが、古いコードは見ません。DM はもともとのスレッドごとの分け方に戻り（`message_thread_id` ごとに `build_session_key` で自分のセッションを持ちます）、いまある Telegram のトピックは並行したセッションとして使えます。根元の DM は待合室ではなくなり、そこへのメッセージはこれまでどおりエージェントに届きます。もう一度新しい版に上げれば、複数セッションのモードはそのままの状態で戻ります。

## グループのフォーラムのトピックへの skill の結び付け {#group-forum-topic-skill-binding}

**Topics モード**を有効にしたスーパーグループ（「フォーラムのトピック」とも呼ばれます）では、すでにトピックごとにセッションが分かれています。`thread_id` ごとに自分の会話を持ちます。ただ、DM のトピックの skill の結び付けと同じように、特定のグループのトピックにメッセージが来たとき **skill を自動で読み込ませたい**こともあるでしょう。

### 使いどころ {#use-case}

仕事の流れごとにフォーラムのトピックを分けたチームのスーパーグループなら、次のようになります。

- **Engineering** のトピック → `software-development` の skill を自動で読み込む
- **Research** のトピック → `arxiv` の skill を自動で読み込む
- **General** のトピック → skill なし。汎用の助け手として動く

### 設定 {#configuration}

`~/.hermes/config.yaml` の `platforms.telegram.extra.group_topics` の下にトピックの結び付きを足します。

```yaml
platforms:
  telegram:
    extra:
      group_topics:
      - chat_id: -1001234567890       # Supergroup ID
        topics:
        - name: Engineering
          thread_id: 5
          skill: software-development
        - name: Research
          thread_id: 12
          skill: arxiv
        - name: General
          thread_id: 1
          # No skill — general purpose
```

**項目:**

| 項目 | 必須 | 説明 |
|-------|----------|-------------|
| `chat_id` | はい | スーパーグループの数字の ID（`-100` で始まる負の数） |
| `name` | いいえ | そのトピックの分かりやすい名前（案内のためだけのものです） |
| `thread_id` | はい | Telegram のフォーラムのトピックの ID。`t.me/c/<group_id>/<thread_id>` のリンクで見えます |
| `skill` | いいえ | このトピックで新しいセッションが始まったときに自動で読み込む skill |

### しくみ {#how-it-works}

1. 対応付けたグループのトピックにメッセージが来ると、Hermes は `group_topics` の設定から `chat_id` と `thread_id` を探します
2. 見つかった項目に `skill` があれば、その skill がそのセッションで自動で読み込まれます。DM のトピックの skill の結び付けと同じです
3. `skill` のないトピックはセッションが分かれるだけです（これまでどおりで、変わりません）
4. 対応付けのない `thread_id` や `chat_id` は黙って素通りします。エラーも skill もありません

### DM のトピックとの違い {#differences-from-dm-topics}

| | DM のトピック | グループのトピック |
|---|---|---|
| 設定のキー | `extra.dm_topics` | `extra.group_topics` |
| トピックの作成 | `thread_id` がなければ Hermes が API で作ります | 管理者が Telegram の画面で作ります |
| `thread_id` | 作成後に自動で書き込まれます | 手で設定する必要があります |
| `icon_color` / `icon_custom_emoji_id` | 使えます | 当てはまりません（見た目は管理者が決めます） |
| skill の結び付け | ✓ | ✓ |
| セッションの分離 | ✓ | ✓（フォーラムのトピックでは最初からそうなっています） |

:::tip
トピックの `thread_id` を調べるには、Telegram の Web 版かデスクトップ版でそのトピックを開いて URL を見ます。`https://t.me/c/1234567890/5` の最後の数字（`5`）が `thread_id` です。スーパーグループの `chat_id` は、グループの ID の頭に `-100` を付けたものです（例: グループ `1234567890` なら `-1001234567890`）。
:::

## 最近の Bot API の機能 {#recent-bot-api-features}

- **Bot API 9.4（2026 年 2 月）:** 私的なチャットのトピック。ボットが `createForumTopic` で 1 対 1 の DM にフォーラムのトピックを作れます。Hermes はこれを 2 つの別々の機能に使っています。運用する人が決める [DM のトピック](#private-chat-topics-bot-api-94)（設定で決める、トピックの並びが固定）と、利用者が動かす [DM を複数セッションにするモード](#multi-session-dm-mode-topic)（`/topic` で有効にし、利用者がいくつでもトピックを作れます）です。
- **プライバシーポリシー:** Telegram は、ボットにプライバシーポリシーを求めるようになりました。BotFather の `/setprivacy_policy` で設定してください。設定しないと、Telegram が仮のものを自動で作ることがあります。広く公開するボットではとくに大事です。
- **Bot API 9.5（2026 年 3 月）: `sendMessageDraft` によるそのままの逐次表示。** Hermes は、私的なチャット向けの経路として、Telegram の下書きを使った逐次表示に対応しています（任意で有効にします）。既定は従来の `editMessageText` の経路のままです。下書きのプレビューは、クライアントによっては目に見えて崩れたり描き直されたりするからです。

### 逐次表示の経路（`gateway.streaming.transport`） {#streaming-transport-gatewaystreamingtransport}

逐次表示を有効にすると（`gateway.streaming.enabled: true`）、Hermes は 4 つの経路から 1 つを選びます。

| 値 | 挙動 |
|---|---|
| `auto`（既定） | 対応しているチャット（いまのところ Telegram の DM）では下書きによる逐次表示、それ以外は従来の編集による経路。下書きの表示に失敗しても、静かに切り替わります。 |
| `draft` | 下書きを強制します。チャットが下書きに対応していないとき（グループやトピックなど）は、切り替えをログに残して編集の経路に落ちます。 |
| `edit` | どのチャットでも、従来の `editMessageText` を繰り返す経路を使います。 |
| `off` | 逐次表示を完全に切ります（最後の返答だけで、途中の更新はありません）。 |

`~/.hermes/config.yaml` では次のように書きます。

```yaml
gateway:
  streaming:
    enabled: true
    transport: auto    # auto | draft | edit | off
```

**DM で `edit`（既定）のときに見えるもの** — ゲートウェイは普通のプレビューのメッセージを送り、`editMessageText` で少しずつ更新していきます。Telegram の下書きのプレビューが崩れて戻る現象を避けられます。

**DM で `auto` か `draft` のときに見えるもの** — Telegram が、語ごとに更新される下書きのプレビューを動かして見せます。返答が終わると普通のメッセージとして届き、下書きのプレビューはクライアント側で自然に消えます。下書きにはメッセージの id がないので、チャットの履歴に残るのは最後の答えです。

**グループやスーパーグループ、フォーラムのトピックでは?** Telegram は `sendMessageDraft` を私的なチャット（DM）に限っています。それ以外では、ゲートウェイが黙って編集の経路に切り替えます。見え方はこれまでどおりです。

**下書きの表示に失敗したら?** 何か失敗すると（一時的な通信のエラー、サーバー側の拒否、古い python-telegram-bot）、その応答は残りの間ずっと編集の経路に切り替わります。次の応答では、また下書きから試します。

## 表示: リッチメッセージ、表、リンクのプレビュー {#rendering-rich-messages-tables-and-link-previews}

**リッチメッセージ（Bot API 10.1）。** 従来の MarkdownV2 の経路では崩れてしまうもの——表、チェックリスト、折りたためる `<details>`、数式のブロック——を含む最後の返答は、エージェントの**素の markdown** のまま Telegram の [`sendRichMessage`](https://core.telegram.org/bots/api#sendrichmessage) で送られるので、クライアント側で平らにされずそのまま表示されます。DM では、既定の `rich_drafts: false` によって逐次表示のプレビューは素のままです（Telegram の一時的な下書きの経路を、従来の表示で使います。表などリッチでしか表せないものは、プレビューでは素の markdown のまま残ります）。そのあと、できあがった応答を `sendRichMessage` で残します。`rich_drafts: true` にすると、進行中のプレビューも `sendRichMessageDraft` を使います。編集による逐次表示では、`editMessageText` の `rich_message` の引数で、すでにあるプレビューをその場で仕上げられます。普通の返答（ただの文章、太字や斜体、簡単な箇条書き）は、クライアント間で字の太さや間隔をそろえるために MarkdownV2 の経路のままです。

内容が 32,768 文字のリッチテキストの上限を超えるときは、リッチの経路は自動で飛ばされます。また Telegram から拒否されたとき（古い `python-telegram-bot` でその入口がない、解析のエラー、大きすぎるブロックや列）は、**そのまま** MarkdownV2 の経路に切り替わるので、メッセージが失われることはありません。一時的な通信のエラーで黙って送り直すことは*ありません*（最後のメッセージが二重に届くことはありません）。

**MarkdownV2 での代わりの表示。** リッチの経路が使えないメッセージでは、Hermes が markdown を MarkdownV2 に変換します。MarkdownV2 には表の書き方がないので、縦棒の表は次のように整えられます。

- **小さい表**は、**行ごとの箇条書き**に開かれます。それぞれの行が、見出しの下に読みやすい箇条書きとして並びます。2〜4 列で、各項目が短いときに向いています。
- **大きい表や横に広い表**は、列をそろえた**コードブロック**になり、崩れずに済みます。

リッチメッセージは**任意で有効にするもの**です。既定が従来の MarkdownV2 の経路のままなのは、いまの Telegram のクライアントでは Bot API のリッチメッセージをただの文字としてコピーしづらいことがあるからです。コマンドの断片やスマートフォンとの受け渡しでは、これがとくに困ります。表・チェックリスト・折りたたみ・数式をそのまま表示させたいときは、次のようにします。

```yaml
gateway:
  platforms:
    telegram:
      extra:
        rich_messages: true
        rich_drafts: false
```

この設定は、クライアントでの表示とコピーのしやすさのためのものです。Telegram がリッチの呼び出しを拒否したときは、Hermes がすでに自動で切り替えます。`rich_drafts` は、DM の逐次表示のプレビューをリッチで*表示する*（`sendRichMessageDraft`）かどうかを決めるもので、既定では無効です。Telegram のデスクトップ版や macOS 版では、チャットが描き直されるまでリッチの下書きが重なって見えることがあるからです。無効なら、プレビューは素のまま流れ、最後の返答はリッチメッセージとして届きます。リッチメッセージは使いたいが、表については従来の「常にコードブロック」の動きにしたいなら、`config.yaml` で `telegram.pretty_tables: false` にして表の整形を切ってください（既定は `true`）。

**リンクのプレビュー。** Telegram は、ボットのメッセージにある URL のプレビューを自動で作ります。それを出したくないとき（長い `/tools` の出力、リンクが 10 個出てくるエージェントの返答など）は次のようにします。

```yaml
gateway:
  platforms:
    telegram:
      extra:
        disable_link_previews: true
```

有効にすると、Hermes は送るメッセージすべてに Telegram の `LinkPreviewOptions(is_disabled=True)` を付け、古い `python-telegram-bot` では従来の `disable_web_page_preview` の引数に切り替えます。

## グループの許可リスト {#group-allowlisting}

Telegram のグループとフォーラムのチャットには、別々に設定できる関門が 2 つあります。

- **送信者のユーザー ID**（`group_allow_from` / `TELEGRAM_GROUP_ALLOWED_USERS`）— グループやフォーラムのメッセージにだけ効く、送信者単位の許可リスト。特定の人にグループでボットを使わせたいが、`TELEGRAM_ALLOWED_USERS` に足して DM も使えるようにはしたくない、というときに使います。
- **チャット ID**（`group_allowed_chats` / `TELEGRAM_GROUP_ALLOWED_CHATS`）— チャット単位の許可リスト。そのグループやフォーラムの参加者なら誰でもボットと話せます。参加していること自体を許可の印にする、チームや窓口のボットに向いています。

```yaml
gateway:
  platforms:
    telegram:
      extra:
        # Global access (DMs + groups). Users here can always invoke the bot.
        allow_from:
          - "123456789"
        # Sender IDs allowed in groups/forums only. Does NOT grant DM access.
        group_allow_from:
          - "987654321"
        # Entire groups/forums — any member is authorized.
        group_allowed_chats:
          - "-1001234567890"
```

同じことを環境変数で書くと次のようになります。

```bash
TELEGRAM_ALLOWED_USERS="123456789"
TELEGRAM_GROUP_ALLOWED_USERS="987654321"
TELEGRAM_GROUP_ALLOWED_CHATS="-1001234567890"
```

挙動は次のとおりです。

- `TELEGRAM_ALLOWED_USERS` は、どの種類のチャットにも効きます（DM、グループ、フォーラム）。
- `TELEGRAM_GROUP_ALLOWED_USERS` は、挙げた送信者をグループやフォーラムでだけ許可します。`TELEGRAM_ALLOWED_USERS` に入っていなければ、ボットに DM はできません。
- `TELEGRAM_GROUP_ALLOWED_CHATS` に挙げたチャットは、送信者が誰であれ、その参加者全員を許可します。
- どれにも `*` を書けば、送信者やチャットをすべて許可できます。
- これは既存の呼びかけや語句による起動、そして `group_topics` と `ignored_threads` の上に重なって効きます。

### PR #17686 より前からの移行 {#migration-from-before-pr-17686}

この分割の前は `TELEGRAM_GROUP_ALLOWED_USERS` しかなく、そこに**チャット ID** を書いていました。後方互換のため、`TELEGRAM_GROUP_ALLOWED_USERS` に書かれたチャット ID の形の値（`-` で始まるもの）はいまもチャット ID として扱われ、非推奨の警告が一度だけログに出ます。移行は次のようにします。

```bash
# Old (still works, but deprecated)
TELEGRAM_GROUP_ALLOWED_USERS="-1001234567890"

# New
TELEGRAM_GROUP_ALLOWED_CHATS="-1001234567890"
```

### 呼ばれたときだけ答える客人の扱い（`guest_mode`） {#guest-mention-bypass-guestmode}

普通の設定では、`group_allowed_chats` は固い関門です。一覧にないグループからのメッセージは、参加者がはっきり @ で呼んでも黙って捨てられます。窓口やチームのボットには、それが正しい既定です。

もっと気軽な使い方——友人のグループチャットで、ボットには**基本は黙っていてほしい**が、**はっきり呼ばれたときだけ答えてほしい**——なら、`guest_mode` を有効にします。

```yaml
gateway:
  platforms:
    telegram:
      extra:
        group_allowed_chats:
          - "-1001234567890"   # your main allowlisted group
        guest_mode: true       # non-allowlisted groups: allow on @mention only
```

環境変数では次のようになります。

```bash
TELEGRAM_GUEST_MODE=true
```

既定は `false` です。

`guest_mode: true` のとき、許可リストにないグループからのメッセージは、ボットをはっきり @ で呼んでいるときに**だけ**処理されます。呼びかけは毎回必要で、客人としてのやり取りにセッションの粘りはありません。ですから、呼ばれていない友人のグループの流れにボットが勝手に入り込むことはありません。

DM と、許可リストにあるグループの挙動はこれまでどおりです。

## スラッシュコマンドの権限 {#slash-command-access-control}

既定では、許可されたどの利用者もすべてのスラッシュコマンドを実行できます。許可リストを、**管理者**（すべてのスラッシュコマンドを使える）と**一般の利用者**（明示的に許したコマンドだけ）に分けたい場合は、そのプラットフォームの `extra` に `allow_admin_from` と `user_allowed_commands` を足します。

```yaml
gateway:
  platforms:
    telegram:
      extra:
        # Existing allowlists (unchanged)
        allow_from:
          - "123456789"     # admin
          - "555555555"     # regular user
          - "777777777"     # regular user

        # NEW — admins get all slash commands (built-in + plugin)
        allow_admin_from:
          - "123456789"

        # NEW — non-admin allowed users can only run these slash commands.
        # /help and /whoami are always allowed so users can see their access.
        user_allowed_commands:
          - status
          - model
          - history

        # Optional: separate admin/command lists for groups
        group_allow_admin_from:
          - "123456789"
        group_user_allowed_commands:
          - status
```

**挙動:**

- ある範囲（DM かグループ）で `allow_admin_from` に入っている利用者は、登録されている**すべての**スラッシュコマンド——組み込みのものも、プラグインが登録したものも——を、その場の一覧から実行できます。
- `allow_from` にはいるが `allow_admin_from` には**いない**利用者は、`user_allowed_commands` に挙げたコマンドと、常に許される `/help` と `/whoami` だけを実行できます。
- 普通の会話（スラッシュでないメッセージ）には影響しません。管理者でない利用者も、これまでどおりエージェントと話せます。好きなコマンドを実行できないだけです。
- **後方互換:** ある範囲に `allow_admin_from` を設定していなければ、その範囲ではスラッシュコマンドの制限は効きません。いまお使いの環境はそのまま動きます。
- DM の管理者だからといって、グループの管理者になるわけではありません。範囲ごとに管理者の一覧があります。
- `group_allow_admin_from` だけを設定した場合、DM の範囲は制限なし（後方互換）のままです。

`/whoami` を使うと、いまの範囲、自分の区分（管理者 / 一般 / 制限なし）、実行できるスラッシュコマンドが分かります。

## その場で選べるモデルの一覧 {#interactive-model-picker}

Telegram のチャットで引数なしの `/model` を送ると、Hermes はモデルを切り替えるためのボタンの一覧を出します。

1. **提供元を選ぶ** — 使える提供元とモデルの数を並べたボタンです（例: 「OpenAI (15)」、いま使っている提供元なら「✓ Anthropic (12)」）。
2. **モデルを選ぶ** — ページ分けされたモデルの一覧で、**Prev** と **Next** で移動し、**Back** で提供元へ戻り、**Cancel** で取り消せます。

いま使っているモデルと提供元は上に表示されます。移動はすべて同じメッセージを書き換えて行われるので、チャットが散らかりません。

:::tip
モデルの正確な名前が分かっているなら、`/model <name>` と打てば一覧を飛ばせます。`/model <name> --global` と書けば、その変更をセッションをまたいで残せます。
:::

## DNS-over-HTTPS による代わりの IP {#dns-over-https-fallback-ips}

制限のあるネットワークでは、`api.telegram.org` が届かない IP に解決されることがあります。Telegram のアダプターには**代わりの IP** のしくみがあり、正しい TLS のホスト名と SNI を保ったまま、別の IP へ静かに接続をやり直します。

### しくみ {#how-it-works}

1. `TELEGRAM_FALLBACK_IPS` を設定していれば、その IP をそのまま使います。
2. 設定していなければ、アダプターが **Google DNS** と **Cloudflare DNS** に DNS-over-HTTPS（DoH）で問い合わせ、`api.telegram.org` の別の IP を探します。
3. 分かっている Telegram の API の IPv4 のアドレスを、IPv4 と IPv6 の両方を持つ `api.telegram.org` のホスト名より**先に**試します。行き止まりの IPv6 の経路は、エラーにならないまま `connect()` に留まることがあり、以前はそれがイベントループを塞いで、30 秒の初期化の期限が働かなくなっていました。
4. DoH も塞がれているか時間切れになった場合は、コードに書かれた IPv4 の初期値（`149.154.166.110`、`149.154.167.220`）を、その IPv4 優先の並びとして使います。ホスト名は最後の手段のままです。
5. 一度うまくいった経路は「そのまま使う」状態になり、以降のリクエストはそれを直接使います。ホスト名は、IPv6 だけのネットワークのために最後の手段として残されます。

### 設定 {#configuration}

```bash
# Explicit fallback IPs (comma-separated)
TELEGRAM_FALLBACK_IPS=149.154.167.220,149.154.167.221
```

`~/.hermes/config.yaml` では次のようにします。

```yaml
platforms:
  telegram:
    extra:
      fallback_ips:
        - "149.154.167.220"
```

:::tip
たいていの場合、これを手で設定する必要はありません。DoH による自動の探索が、制限のあるネットワークのほとんどの場面をまかないます。`TELEGRAM_FALLBACK_IPS` が要るのは、DoH もネットワークで塞がれているときだけです。その端末で IPv6 が壊れているなら、`config.yaml` で `network.force_ipv4: true` にして、プロセス全体で AAAA の問い合わせを飛ばすこともできます。
:::

## プロキシへの対応 {#proxy-support}

ネットワークからインターネットへ出るのに HTTP のプロキシが必要な場合（企業の環境ではよくあります）、Telegram のアダプターは標準のプロキシの環境変数を自動で読み、すべての接続をプロキシ経由にします。

### 対応している変数 {#supported-variables}

アダプターは次の環境変数を順に見て、最初に設定されているものを使います。

1. `HTTPS_PROXY`
2. `HTTP_PROXY`
3. `ALL_PROXY`
4. `https_proxy` / `http_proxy` / `all_proxy`（小文字のもの）

### 設定 {#configuration}

ゲートウェイを起動する前に、環境にプロキシを設定します。

```bash
export HTTPS_PROXY=http://proxy.example.com:8080
hermes gateway
```

`~/.hermes/.env` に書いても構いません。

```bash
HTTPS_PROXY=http://proxy.example.com:8080
```

プロキシは、主な接続にも、代わりの IP を使う接続にも効きます。Hermes 側の追加の設定は要りません。環境変数が設定されていれば、自動で使われます。

:::note
これは、Hermes が Telegram への接続に使う独自の予備の通信の層についての説明です。他の場所で使っている標準の `httpx` のクライアントは、もともとプロキシの環境変数に従います。
:::

## メッセージへのリアクション {#message-reactions}

ボットは、処理の様子を見せるために、メッセージへ絵文字のリアクションを付けられます。

- 👀 メッセージの処理を始めたとき
- ✅ 応答を無事に届けたとき
- ❌ 処理の途中でエラーが起きたとき

リアクションは**既定で無効**です。`config.yaml` で有効にします。

```yaml
telegram:
  reactions: true
```

環境変数でも設定できます。

```bash
TELEGRAM_REACTIONS=true
```

:::note
リアクションが積み上がる Discord と違い、Telegram の Bot API は 1 回の呼び出しでボットのリアクションをすべて置き換えます。👀 から ✅ や ❌ への切り替わりは一度に起きるので、両方が同時に見えることはありません。
:::

:::tip
グループでリアクションを付ける権限がボットにない場合、リアクションの呼び出しは黙って失敗し、メッセージの処理はそのまま続きます。
:::

## チャンネルごとのプロンプト {#per-channel-prompts}

特定の Telegram のグループやフォーラムのトピックに、その場限りのシステムプロンプトを割り当てられます。このプロンプトは毎ターン、実行時に差し込まれ、会話の記録には残らないので、変更はすぐに効きます。

```yaml
telegram:
  channel_prompts:
    "-1001234567890": |
      You are a research assistant. Focus on academic sources,
      citations, and concise synthesis.
    "42":  |
      This topic is for creative writing feedback. Be warm and
      constructive.
```

キーはチャット ID（グループやスーパーグループ）か、フォーラムのトピックの ID です。フォーラムのグループでは、トピックのプロンプトがグループのプロンプトより優先されます。

- グループ `-1001234567890` のトピック `42` のメッセージ → トピック `42` のプロンプトを使います
- （項目のない）トピック `99` のメッセージ → グループ `-1001234567890` のプロンプトを使います
- 項目のないグループのメッセージ → チャンネルのプロンプトは使いません

YAML のキーが数字でも、自動で文字列として扱われます。

## 困ったとき {#troubleshooting}

| 症状 | 対処 |
|---------|----------|
| ボットが何も返さない | `TELEGRAM_BOT_TOKEN` が正しいか確かめます。`hermes gateway` のログにエラーが出ていないか見ます。 |
| ボットが「unauthorized」と返す | 自分のユーザー ID が `TELEGRAM_ALLOWED_USERS` に入っていません。@userinfobot でもう一度確かめてください。 |
| ボットがグループのメッセージを無視する | プライバシーモードが有効のはずです。切る（手順 3）か、ボットをグループの管理者にしてください。**プライバシーを変えたら、ボットを外して入れ直すのを忘れずに。** |
| ボイスメッセージが文字起こしされない | 音声認識が使える状態か確かめます。手元で文字起こしするなら `faster-whisper` を入れるか、`~/.hermes/.env` に `GROQ_API_KEY` か `VOICE_TOOLS_OPENAI_KEY` を設定します。 |
| 音声の返答が吹き出しでなくファイルになる | `ffmpeg` を入れてください（Edge TTS の Opus への変換に必要です）。 |
| ボットのトークンが無効になった | BotFather で `/revoke` のあと `/newbot` か `/token` を実行して新しいトークンを作り、`.env` を更新します。 |
| webhook に更新が届かない | `TELEGRAM_WEBHOOK_URL` に外から届くか確かめます（`curl` で試せます）。使っているサービスやリバースプロキシが、その URL のポートに来た HTTPS を、`TELEGRAM_WEBHOOK_PORT` で設定した手元の待ち受けのポートへ回すようにします（同じ番号である必要はありません）。SSL / TLS が有効か確かめます。Telegram は HTTPS の URL にしか送りません。ファイアウォールの設定も見てください。 |

## 実行の承認 {#exec-approval}

エージェントが危険かもしれないコマンドを実行しようとすると、チャットで承認を求めます。

> ⚠️ This command is potentially dangerous (recursive delete). Reply "yes" to approve.

「yes」か「y」で許可、「no」か「n」で拒否します。

## その場での問いかけ（clarify） {#interactive-prompts-clarify}

エージェントが `clarify` ツールを呼ぶと——どちらの進め方がよいか尋ねる、作業のあとの感想を聞く、大きめの判断の前に確かめる——Telegram はその質問を**ボタン付き**で表示します。

> ❓ Which framework should I use for the dashboard?
>
> [1. Next.js] [2. Remix] [3. Astro]
> [✏️ Other (type answer)]

ボタンを押して答えるか、**Other** を押して自由に書きます（次に送るメッセージが答えになります）。選択肢のない開かれた `clarify` では、ボタンは出ず、次のメッセージがそのまま答えになります。

答えを待つ時間は `~/.hermes/config.yaml` の `agent.clarify_timeout` で設定します（既定は `600` 秒）。その時間内に答えないと、エージェントは目印のメッセージを受け取って先へ進むので、止まったままにはなりません。

## 通知の多さ {#push-notification-volume}

Telegram は、ボットが送るメッセージのたびに通知を出します。長いエージェントのターンでツールの進み具合の吹き出し、逐次の更新、状況の知らせが飛ぶと、すぐにうるさくなります。Telegram のアダプターには通知の形が 2 つあります。

| 形 | 挙動 |
|------|----------|
| `important`（既定） | **最後の応答**、**承認の問いかけ**、**スラッシュコマンドの確認**だけが鳴ります。ツールの進み具合、逐次の更新、状況のメッセージは `disable_notification=true` で送られます。 |
| `all` | 送るメッセージすべてが通知を出します。以前の挙動です。ツールの呼び出しを 1 つずつ知りたい人だけ選んでください。 |

`~/.hermes/config.yaml` では次のように設定します。

```yaml
display:
  platforms:
    telegram:
      notifications: important   # or "all"
```

環境変数で上書きもできます（さっと比べたいときに便利です）。

```bash
HERMES_TELEGRAM_NOTIFICATIONS=all
```

知らない値を書くと、警告をログに出して `important` に戻ります。

## 状況のメッセージはその場で書き換わります {#status-messages-edited-in-place}

Telegram のアダプターは、繰り返し出るエージェントの状況の知らせ（「Compressing context…」「Calling tool…」など）を `send_or_update_status()` を通して送ります。これは `{(chat_id, status_key) → message_id}` の控えを持っていて、次に同じものが出たときは新しく足すのではなく**いまの吹き出しを書き換え**ます。`status_key` が違えば別のメッセージになりますし、別のチャットどうしがぶつかることもありません。書き換えに失敗したら（利用者がそのメッセージを消した、Telegram が書き換えを許す期間より古い、など）、控えの項目を捨てて、次のときは新しいメッセージを出してその id を控え直します。設定は要りません。これが Telegram での既定の動きです。`send_or_update_status` を持たない他のアダプターは、これまでどおり素の `send()` に落ちます。

## エージェントが動いている間、受け取ったメッセージをピン留めします {#pin-incoming-user-message-during-agent-turn}

利用者のメッセージでエージェントのターンが始まると、Telegram のアダプターはそのメッセージをターンの間ピン留めし、応答が終わったら外します。ボットが無視しているのではなく、そのメッセージに取りかかっていることが目で分かる、軽い印です。ピン留めには `disable_notification=true` を使うので、余計な通知は出ません。設定は要りません。

## セキュリティ {#security}

:::warning
`TELEGRAM_ALLOWED_USERS` は必ず設定して、誰がボットと話せるかを絞ってください。設定しない場合、ゲートウェイは安全のため、既定ですべての利用者を断ります。
:::

ボットのトークンを人前に出してはいけません。漏れたら、BotFather の `/revoke` ですぐ無効にしてください。

詳しくは[セキュリティの説明](/hermes/docs/user-guide/security/)を参照してください。利用者の認可をもっと動的に扱う方法として、[DM でのペア設定](/hermes/docs/user-guide/messaging/#dm-pairing-alternative-to-allowlists)もあります。
