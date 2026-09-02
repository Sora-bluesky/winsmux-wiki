---
title: "Telegram"
description: "Hermes Agent を Telegram のボットとして設定する"
upstream_path: user-guide/messaging/telegram.md
upstream_blob: 2becfab4caae3e6c5ddaaa131fa6d48326dc430c
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/telegram
---

# Telegram の設定 {#telegram-setup}

Hermes Agent は、Telegram で一通りのことができる会話ボットとしてつながります。つないでしまえば、どの端末からでもエージェントと話せますし、送った音声メモは自動で文字になり、予定していた仕事の結果も受け取れ、グループの会話でも使えます。この連携は [python-telegram-bot](https://python-telegram-bot.org/) の上に作られていて、文章・音声・画像・添付ファイルを扱えます。

## 手順 1: BotFather でボットを作る {#step-1-create-a-bot-via-botfather}

Telegram のボットには、Telegram 公式の管理用ボットである [@BotFather](https://t.me/BotFather) が発行する API トークンが必ず要ります。

1. Telegram で **@BotFather** を検索するか、[t.me/BotFather](https://t.me/BotFather) を開きます
2. `/newbot` と送ります
3. **表示名**を決めます（例:「Hermes Agent」）。ここは何でも構いません
4. **ユーザー名**を決めます。重ならない名前で、末尾が `bot` である必要があります（例: `my_hermes_bot`）
5. BotFather が **API トークン**を返します。こういう形です:

```
123456789:ABCdefGHIjklMNOpqrSTUvwxYZ
```

:::warning
ボットのトークンは人に見せないでください。これを持っている人は誰でもボットを操れます。漏れたときは、BotFather で `/revoke` を送ってすぐに無効にします。
:::

## 手順 2: ボットの見た目を整える（任意） {#step-2-customize-your-bot-optional}

次の BotFather のコマンドを使うと、使う人にとって分かりやすくなります。@BotFather に送ってください。

| コマンド | 用途 |
|---------|---------|
| `/setdescription` | 会話を始める前に出る「このボットは何ができるか」の説明 |
| `/setabouttext` | ボットのプロフィールに出る短い文 |
| `/setuserpic` | ボットのアイコンを上げる |
| `/setcommands` | コマンドのメニュー（チャットの `/` ボタン）を決める |
| `/setprivacy` | グループのメッセージをどこまで見られるかを決める（手順 3 を参照） |

:::tip
`/setcommands` の最初の一組としては、これが使いやすいです。

```
help - Show help information
new - Start a new conversation
sethome - Set this chat as the home channel
```
:::

### オンライン・オフラインの表示（任意） {#onlineoffline-status-indicator-optional}

Telegram のボットには、本当の意味でのオンライン・オフラインの表示がありません。あの緑の点は
*利用者アカウント*の機能で、ボット向けの API では扱えないのです。いちばん近いのは
ボットの**短い説明**（プロフィールで名前の下に出る一行）です。

`status_indicator` を有効にすると、Hermes はゲートウェイがつながったときに短い説明を **Online** に、
きちんと終了したときに **Offline** に書き換えます。

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

覚えておくこと:

- 短い説明はボット**全体**のもので（すべての利用者に見えます）、チャットごとではありません。
  開いているチャットの中の目印ではなく、プロフィールのページで見えます。
- 「Offline」が書かれるのは、ゲートウェイが**きちんと**終了したとき（`/stop`、`disconnect`）だけです。
  突然落ちたときは最後の状態が残ります。プロフィールの文で表す以上、避けられない限界です。
- ボット全体のプロフィールを書き換えるので、既定では切ってあります。

### コマンドメニューの優先順と上限（任意） {#command-menu-priority-and-cap-optional}

Hermes は Telegram のゲートウェイが起動したときに、コマンドのメニューを自動で登録します。メニューは中心にあるスラッシュコマンドの一覧と、条件に合うプラグインやスキルのコマンドから組み立てられ、Telegram が確実に受け取れるように数を抑えます。既定の上限は 60 個で、組み込みのコマンド全部と、よく使うスキルのコマンドが並ぶくらいの余裕があります。

Telegram の `/` の候補に出しておきたいスキル・プラグイン・組み込みのコマンドがあるときは、`~/.hermes/config.yaml` で優先順を決めます。

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

`priority_mode` は、書いた一覧と Hermes に元からある優先順の組み合わせ方を決めます。

- `prepend`: 自分のコマンドを先に、そのあとに Hermes の既定
- `append`: Hermes の既定を先に、そのあとに自分のコマンド
- `replace`: 優先順は自分の一覧だけで決める

優先順は、上限を当てる前に**まとめた**候補の一覧（中心のコマンド、プラグインのコマンド、スキルのコマンド）に対して適用されます。ですから、優先すると決めたスキルのコマンドは、中心のコマンドだけでメニューが埋まる場合でも席が確保されます。以前はスキルがいつも先にアルファベット順で削られていたので、後ろの方の名前のスキルは `priority` に関係なく出られませんでした。

Telegram は BotCommand を 100 個まで受け付けますが、大きな一覧は失敗することがあります。確実さのために Hermes は 60 を既定とし、設定した値も `1..100` に収めます。全部の一覧は `/commands` で見られます。

### インラインのコマンド検索: 上限なしで全部から探す {#inline-command-picker-search-every-command-no-cap}

`/` のメニューには上限がありますが、Telegram の**インラインモード**にはありません。有効にすると、どのチャットでも `@yourbotname` に続けて言葉を打つだけで、Hermes の**すべての**コマンドと入っているスキルを、その場で検索できます。打つたびに結果が計算され、ページに分かれるので、削られるものはありません。

```
@yourbotname plan            → tap the /plan result to send it
@yourbotname plan migrate auth to OIDC   → sends /plan migrate auth to OIDC
@yourbotname pdf             → finds skills matching "pdf" by name or description
```

最初の語で候補が絞られ、そのあとに書いたものは送られるコマンドの引数になります。結果を押すと、自分からのふつうのメッセージとしてコマンドが送られるので、いつものコマンドの経路を通ります（コマンドで始まるメッセージは、プライバシーモードが有効でもボットに届きます）。

**一度だけの準備:** インラインモードは、どの Telegram ボットでも既定では切ってあります。[@BotFather](https://t.me/BotFather) で `/setinline` を送って有効にしてください（自分のボットを選び、`Search commands and skills...` のような案内文を決めます）。それまでは、Telegram はインラインの問い合わせを届けず、検索も動きません。

結果が返るのは、ゲートウェイの許可リストを通った人だけです。許可されていない人には空の一覧が返るので、入れてあるスキルの顔ぶれが知らない人に知られることはありません（インラインの問い合わせは、ボットがいないチャットからでも送れます）。

## 手順 3: プライバシーモード（グループでは要です） {#step-3-privacy-mode-critical-for-groups}

Telegram のボットには**プライバシーモード**があり、**既定で有効**です。グループでボットを使うとき、いちばんよく混乱の元になるところです。

**プライバシーモードが有効なとき**、ボットに見えるのは次だけです。
- `/` で始まるコマンドのメッセージ
- ボット自身のメッセージへの直接の返信
- 参加・退出・ピン留めなどの案内メッセージ
- ボットが管理者になっているチャンネルのメッセージ

**プライバシーモードを切ると**、グループのすべてのメッセージがボットに届きます。

### プライバシーモードの切り方 {#how-to-disable-privacy-mode}

1. **@BotFather** に話しかけます
2. `/mybots` と送ります
3. 自分のボットを選びます
4. **Bot Settings → Group Privacy → Turn off** と進みます

:::warning
設定を変えたら、**そのボットをグループから一度外して入れ直す必要があります**。Telegram はボットがグループに入った時点のプライバシーの状態を覚えていて、外して入れ直すまで更新しません。
:::

:::tip
プライバシーモードを切る代わりに、ボットを**グループの管理者**にする手もあります。管理者のボットには、プライバシーの設定に関係なくすべてのメッセージが届くので、ボット全体の設定を切り替えずに済みます。
:::

### 自動で返さずにグループの会話を見ておく {#observe-group-chatter-without-auto-replying}

OpenClaw や元宝のようなグループでのふるまいにしたいときは、ふつうのグループのメッセージを**見る**ことはできて、はっきり呼ばれたときだけ**答える**ように設定します。

```yaml
telegram:
  allowed_chats:
    - "-1001234567890"
  group_allowed_chats:
    - "-1001234567890"
  require_mention: true
  observe_unmentioned_group_messages: true
```

この形にすると、はっきり許可したチャットやトピックからの、呼びかけのないグループのメッセージは、共有のチャット・トピックの会話の記録に見聞きした文脈として足されますが、エージェントは動きません。`allowed_chats` はボットが答える場所を決め、`group_allowed_chats` は見聞きした文脈をためる共有のグループのセッションを許可します。ですから、この形では同じチャット ID を書いてください。あとから同じ許可済みのチャットやトピックで `@botname` と呼んだり、ボットに返信したり、決めておいた呼びかけの形に当てはまったりすると、そこまでの文脈を使えます。呼ばれたメッセージには `[nickname|user_id]` の印が付き、その一巡だけの安全のための指示も添えられるので、モデルはそれまでの見聞きした行を「文脈」として扱い、ボットへの指示とは受け取りません。

同じことを環境変数で書くとこうです。

```bash
TELEGRAM_ALLOWED_CHATS=-1001234567890
TELEGRAM_GROUP_ALLOWED_CHATS=-1001234567890
TELEGRAM_OBSERVE_UNMENTIONED_GROUP_MESSAGES=true
```

これには、ふつうのグループのメッセージが Telegram からゲートウェイに届いている必要があります。上に書いたとおり、BotFather のプライバシーモードを切るか、ボットをグループの管理者にしてください。

## 手順 4: 自分の利用者 ID を調べる {#step-4-find-your-user-id}

Hermes Agent は、誰が使えるかを Telegram の数字の利用者 ID で決めます。利用者 ID はユーザー名では**ありません**。`123456789` のような数字です。

**方法 1（おすすめ）:** [@userinfobot](https://t.me/userinfobot) に話しかけると、すぐに利用者 ID を返してくれます。

**方法 2:** [@get_id_bot](https://t.me/get_id_bot) も同じように使えます。

この数字を控えておいてください。次の手順で使います。

## 手順 5: Hermes を設定する {#step-5-configure-hermes}

### 方法 A: 対話形式で設定する（おすすめ） {#option-a-interactive-setup-recommended}

```bash
hermes gateway setup
```

聞かれたら **Telegram** を選びます。ウィザードがボットのトークンと、許可する利用者 ID を尋ね、設定を書き込んでくれます。

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

数秒でボットがつながります。Telegram でメッセージを送って確かめてください。

## Docker のターミナルで作ったファイルを送る {#sending-generated-files-from-docker-backed-terminals}

ターミナルの実行先が `docker` のときは、Telegram への添付を送るのは
コンテナの中ではなく**ゲートウェイのプロセス**だということを覚えておいてください。つまり、
最後に書く `MEDIA:/...` のパスは、ゲートウェイが動いているホスト側から読める必要があります。

よくある落とし穴:

- エージェントが Docker の中の `/workspace/report.txt` にファイルを書く
- モデルが `MEDIA:/workspace/report.txt` と出す
- `/workspace/report.txt` はコンテナの中にしかなくホストにはないので、Telegram への送信が失敗する

おすすめの形:

```yaml
terminal:
  backend: docker
  docker_volumes:
    - "/home/user/.hermes/cache/documents:/output"
```

そのうえで、

- Docker の中では `/output/...` にファイルを書く
- `MEDIA:` には**ホストから見える**パスを書く。たとえばこうです:
  `MEDIA:/home/user/.hermes/cache/documents/report.txt`

すでに `docker_volumes:` の項目があるときは、その一覧に足してください。
YAML では同じ見出しを二度書くと、あとのものが黙って前のものを上書きします。

### `MEDIA:` で送れるファイルの拡張子 {#supported-media-file-extensions}

ゲートウェイは、エージェントの返答から `MEDIA:/path/to/file` の印を取り出し、そのファイルをそれぞれのサービス本来の添付として送ります。すべてのゲートウェイで扱える拡張子は次のとおりです。

| 種類 | 拡張子 |
|---|---|
| 画像 | `png`、`jpg`、`jpeg`、`gif`、`webp`、`bmp`、`tiff`、`svg` |
| 音声 | `mp3`、`wav`、`ogg`、`m4a`、`opus`、`flac`、`aac` |
| 動画 | `mp4`、`mov`、`webm`、`mkv`、`avi` |
| **書類** | `pdf`、`txt`、`md`、`csv`、`json`、`xml`、`html`、`yaml`、`yml`、`log` |
| **オフィス文書** | `docx`、`xlsx`、`pptx`、`odt`、`ods`、`odp` |
| **書庫** | `zip`、`rar`、`7z`、`tar`、`gz`、`bz2` |
| **書籍・パッケージ** | `epub`、`apk`、`ipa` |

この一覧にあるものは、対応しているサービス（Telegram、Discord、Signal、Slack、WhatsApp、飛書、Matrix など）ではそのサービス本来の添付として届きます。本来の添付に対応していないところでは、リンクか文字での案内に落ちます。**太字**の種類はここ数回のリリースで足されたものです。モデルに `here is the file: /path/to/report.docx` と言わせて済ませていたなら、`MEDIA:/path/to/report.docx` に切り替えると本来の添付で届きます。

## Webhook で受け取る {#webhook-mode}

Hermes は既定で**ロングポーリング**を使って Telegram につながります。ゲートウェイの側から Telegram のサーバーへ新しい更新を取りに行く形です。手元で動かす場合や、いつも動かしっぱなしの場合はこれで十分です。

**クラウドに置く場合**（Fly.io、Railway、Render など）は、**Webhook** の方が費用を抑えられます。この種のサービスは、外から HTTP が来たときに眠っているマシンを起こせますが、こちらから出ていく通信では起こせません。ポーリングは出ていく通信なので、ポーリングのボットは眠れないのです。Webhook は向きを逆にします。Telegram がボットの HTTPS の URL へ更新を押し込むので、暇なときは眠らせておけます。

| | ポーリング（既定） | Webhook |
|---|---|---|
| 向き | ゲートウェイ → Telegram（出ていく） | Telegram → ゲートウェイ（入ってくる） |
| 向いている場面 | 手元、いつも動いているサーバー | 自動で起きるクラウド |
| 設定 | 追加の設定は不要 | `TELEGRAM_WEBHOOK_URL` を設定 |
| 待っている間の費用 | マシンを動かし続ける必要がある | メッセージの合間はマシンを眠らせられる |

### 設定 {#configuration}

`~/.hermes/.env` に次を足します。

```bash
TELEGRAM_WEBHOOK_URL=https://my-app.fly.dev/telegram
TELEGRAM_WEBHOOK_SECRET="$(openssl rand -hex 32)"  # required
# TELEGRAM_WEBHOOK_PORT=8443        # optional, default 8443
```

| 変数 | 必須 | 説明 |
|----------|----------|-------------|
| `TELEGRAM_WEBHOOK_URL` | はい | Telegram が更新を送ってくる、公開された HTTPS の URL です。パスの部分は自動で取り出されます（上の例なら `/telegram`）。 |
| `TELEGRAM_WEBHOOK_SECRET` | **はい**（`TELEGRAM_WEBHOOK_URL` を設定したとき） | Telegram が毎回の webhook の要求に付け返す、確認用の秘密の文字列です。これがないとゲートウェイは起動しません。[GHSA-3vpc-7q5r-276h](https://github.com/NousResearch/hermes-agent/security/advisories/GHSA-3vpc-7q5r-276h) を参照してください。`openssl rand -hex 32` で作れます。 |
| `TELEGRAM_WEBHOOK_PORT` | いいえ | webhook のサーバーが待ち受ける手元のポートです（既定は `8443`）。 |

`TELEGRAM_WEBHOOK_URL` を設定すると、ゲートウェイはポーリングの代わりに HTTP の webhook サーバーを立ち上げます。設定しなければポーリングのままで、これまでの版とふるまいは変わりません。

### クラウドに置く例（Fly.io） {#cloud-deployment-example-flyio}

1. Fly.io のアプリの秘密の値に、環境変数を足します。

```bash
fly secrets set TELEGRAM_WEBHOOK_URL=https://my-app.fly.dev/telegram
fly secrets set TELEGRAM_WEBHOOK_SECRET=$(openssl rand -hex 32)
```

2. `fly.toml` で webhook のポートを開けます。

```toml
[[services]]
  internal_port = 8443
  protocol = "tcp"

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443
```

3. 配備します。

```bash
fly deploy
```

ゲートウェイのログに `[telegram] Connected to Telegram (webhook mode)` と出れば成功です。

## プロキシに対応する {#proxy-support}

Telegram の API が塞がれている場合や、通信をプロキシ越しにしたい場合は、Telegram 専用のプロキシ URL を設定します。これは汎用の `HTTPS_PROXY` / `HTTP_PROXY` の環境変数より優先されます。

**方法 1: config.yaml（おすすめ）**

```yaml
telegram:
  proxy_url: "socks5://127.0.0.1:1080"
```

**方法 2: 環境変数**

```bash
TELEGRAM_PROXY=socks5://127.0.0.1:1080
```

使える方式: `http://`、`https://`、`socks5://`。

このプロキシは、Telegram への主な接続にも、控えの IP を使う接続にも効きます。Telegram 専用のプロキシを設定していなければ、ゲートウェイは `HTTPS_PROXY` / `HTTP_PROXY` / `ALL_PROXY`（または macOS のシステムのプロキシの自動検出）に頼ります。

控えの IP を調べる経路が手元の環境でうまく動かないときは、`HERMES_TELEGRAM_DISABLE_FALLBACK_IPS=true` にすると、素の `api.telegram.org` の経路だけで最初の接続を試します。DNS-over-HTTPS で控えを調べる時間も `HERMES_TELEGRAM_FALLBACK_DISCOVERY_TIMEOUT` に秒で指定して区切れます。既定は `5` です。

## ホームチャンネル {#home-channel}

Telegram のどのチャット（DM でもグループでも）でも `/sethome` と送ると、そこが**ホームチャンネル**になります。予定していた仕事（cron ジョブ）の結果は、このチャンネルに届きます。

`~/.hermes/.env` で手で設定することもできます。

```bash
TELEGRAM_HOME_CHANNEL=-1001234567890
TELEGRAM_HOME_CHANNEL_NAME="My Notes"
```

:::tip
グループのチャット ID はマイナスの数字です（例: `-1001234567890`）。自分との DM のチャット ID は、自分の利用者 ID と同じです。
:::

### トピックを使っているときの cron の届け先 {#cron-deliveries-in-topic-mode}

ボットとの DM でトピックを使っていると、いちばん上のチャットに届いた cron のメッセージは、システムのコマンド専用の待合室に落ちます。そこで返信してもセッションは開かず、「main chat is reserved for system commands」という案内が出ます。専用のトピック（`Cron` など）を作って、次を設定してください。

```bash
TELEGRAM_CRON_THREAD_ID=<topic_thread_id>
```

`TELEGRAM_CRON_THREAD_ID` は、cron の配送に限って `TELEGRAM_HOME_CHANNEL_THREAD_ID` より優先されます。そのトピックでの返信は、トピックのいまのセッションの続きになります。

## 音声のメッセージ {#voice-messages}

### 受け取る音声（文字起こし） {#incoming-voice-speech-to-text}

Telegram で送った音声のメッセージは、設定してある文字起こしの提供元で自動的に文字になり、会話の中に文章として入ります。

- `local` は Hermes が動いているマシンで `faster-whisper` を使います。API キーは要りません
- `groq` は Groq の Whisper を使い、`GROQ_API_KEY` が要ります
- `openai` は OpenAI の Whisper を使い、`VOICE_TOOLS_OPENAI_KEY` が要ります

#### 文字起こしを飛ばして、音声ファイルのままエージェントに渡す {#skipping-stt-pass-the-raw-audio-file-to-the-agent}

話者の切り分け、自前の文字起こしの道具、あるいは録音をそのまま残しておきたいなど、**エージェント自身**に音声を扱わせたいときは、`~/.hermes/config.yaml` で `stt.enabled: false` にします。

```yaml
stt:
  enabled: false
```

文字起こしを切っても、ゲートウェイは音声の添付を Hermes の音声の置き場に取ってきます。ただし**文字にはしません**。エージェントには、次のような印の付いたメッセージが届きます。

```
[The user sent a voice message: /home/<user>/.hermes/cache/audio/<hash>.ogg]
```

自分の道具やスキルから、このパスをそのまま読めます（手元の話者切り分けの流れに渡す、もっと丁寧な文字起こしのモデルにかける、長く保管する場所に上げる、といった具合です）。拡張子は Telegram が届けた元の形式のままです（音声メモなら `.ogg`、音声の添付なら `.mp3` や `.m4a` など）。

これは下の [手元の Bot API サーバー](#large-files-20mb-via-local-bot-api-server) の節と相性がよく、そちらは Telegram の getFile の 20MB の上限を 2GB まで引き上げます。数分を超える録音を扱いたいときに役立ちます。

### 送り出す音声（読み上げ） {#outgoing-voice-text-to-speech}

エージェントが読み上げで音声を作ると、Telegram 本来の**音声の吹き出し**として届きます。丸い形で、その場で再生できるあれです。

- **OpenAI と ElevenLabs** は最初から Opus を作るので、追加の準備は要りません
- **Edge TTS**（既定の無料の提供元）は MP3 を出すので、Opus に変えるために **ffmpeg** が要ります:

```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# macOS
brew install ffmpeg
```

ffmpeg がないと、Edge TTS の音声はふつうの音声ファイルとして送られます（再生はできますが、音声の吹き出しではなく四角い再生画面になります）。

読み上げの提供元は `config.yaml` の `tts.provider` で決めます。

## 大きなファイル（20MB 超）を手元の Bot API サーバーで扱う {#large-files-20mb-via-local-bot-api-server}

Telegram の**公開**の Bot API では `getFile` の取得が **20 MB** までに制限されているので、それより大きい音声メモ・音声ファイル・動画・書類は、Hermes から「too large」と返されて黙って弾かれます。案内されている回避策は、**手元で** [telegram-bot-api](https://github.com/tdlib/telegram-bot-api) を動かすことです。Telegram が使っているのと同じサーバーのソフトを、自分のネットワークで動かします。手元のサーバーならファイルの上限は **2 GB** に上がり、Hermes は `base_url` が設定されているのを見て、自分の側の上限も自動で引き上げます。

これで、こんな使い方ができるようになります。

- 長い音声メモ（45 分の打ち合わせ、ポッドキャスト）をボットに送る
- 大きな動画を上げて、画像を見る道具で処理させる
- 話者の切り分け、位置合わせ、学習データ作りのために、元の音声をそのまま残す

### 手順 1: Telegram の API の認証情報を取る {#step-1-obtain-telegram-api-credentials}

手元のサーバーは、公開の Bot API ではなく Telegram の MTProto の層と直接やりとりするので、**MTProto の認証情報**が要ります。

1. [my.telegram.org/apps](https://my.telegram.org/apps) を開き、自分の Telegram のアカウントでログインします。
2. 新しいアプリケーションを作ります（名前も短い説明も何でも構いません）。
3. `api_id` と `api_hash` を控えます。どちらも要ります。

### 手順 2: telegram-bot-api のサーバーを動かす {#step-2-run-the-telegram-bot-api-server}

有志が管理している [`aiogram/telegram-bot-api`](https://hub.docker.com/r/aiogram/telegram-bot-api) の Docker イメージがいちばん手軽です。最小限の `docker-compose.yaml` はこうなります（上限を上げるには `--local` を使います）。

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

立ち上げます。

```bash
docker compose up -d tg-bot-api
docker logs --tail 20 tg-bot-api
```

:::warning セキュリティ
手元の Bot API サーバーは、ボットのトークンを URL のパスに書いて受け取ります（例: `/bot<TOKEN>/getMe`）。**それ以外の認証はありません**。そのポートに届く人は誰でも、ボットを完全に操れます。見えるメッセージをすべて読み、ボットとしてメッセージを送れます。コンテナは `127.0.0.1` に縛るか、社内のネットワークでリバースプロキシの後ろに置いてください。**ポート 8081 をインターネットに公開してはいけません。**
:::

### 手順 3: 公開の API からボットをログアウトさせる（一度だけ） {#step-3-log-the-bot-out-of-the-public-api-one-time}

ボットが同時に動けるのは**一つ**の Bot API サーバーだけです。すでに `api.telegram.org` でボットを動かしていたなら（ほぼ間違いなくそうです）、手元のサーバーに受け入れてもらう前に、向こうからはっきりログアウトさせる必要があります。

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/logOut"
# expected response: {"ok":true,"result":true}
```

これは引っ越しのときの一度きりの手順で、再起動のたびに繰り返す必要はありません。`logOut` のあとに届いたメッセージは、Telegram が新しいサーバーの方へ流します。

手元のサーバーがボットの代わりに Telegram と話せるか確かめます。

```bash
curl "http://127.0.0.1:8081/bot<YOUR_BOT_TOKEN>/getMe"
# expected response: {"ok":true,"result":{"id":...,"is_bot":true,...}}
```

### 手順 4: Hermes を手元のサーバーに向ける {#step-4-point-hermes-at-the-local-server}

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

:::caution `telegram.extra` ではなく `platforms.telegram.extra` に書きます
いまのところ、プラットフォームの設定に深く混ぜられるのは `platforms.<name>.extra` の形だけです。いちばん上の `telegram.extra` の下に直接書いた項目は、黙って捨てられます。
:::

`base_url` を設定すると、Hermes は次のように動きます。

- python-telegram-bot のクライアントを、手元のサーバー向けに組み立てます
- 書類と音声の上限を 20 MB から 2 GB へ自動で引き上げます
- 「too large」のエラーの文言に、いま効いている上限を出します（`Maximum: 2048 MB.`）。どちらの状態にいるかがすぐ分かります

ゲートウェイを再起動し、それを確かめるログを探します。

```bash
hermes gateway restart
grep -E "Using custom Telegram base_url|Using Telegram local_mode" ~/.hermes/logs/gateway.log | tail
```

### 手順 5: `local_mode` — ディスク上のファイルを読む {#step-5-localmode-file-access-on-disk}

手元のサーバーがファイルを渡す方法は**二つ**あります。

1. **`--local` なし**（既定）: 公開の Bot API と同じく、`/file/bot<TOKEN>/<path>` で HTTP を通して渡されます。20MB の上限はそのままです。ネットワークの問題を回避する目的にだけ役立ちます（`api.telegram.org` に届かないけれど自前で立てられる場合など）。上限を上げたいときの答えではありません。
2. **`--local` あり**（上の `TELEGRAM_LOCAL=1` で設定します）: ファイルはサーバーのファイルシステムに書かれ、`getFile` は HTTP の URL ではなく**絶対パス**を返します。20MB の上限はなくなります。Hermes は HTTP ではなく**ディスクから**中身を読むことになります。

ディスクから読む経路を働かせるには、上の設定で `local_mode: true` にしたうえで、**さらに** Hermes のプロセスがサーバーの返すパスを読めるようにします。場合は二つあります。

- **同じマシン** — telegram-bot-api と Hermes が同じホストで動いている場合。データの置き場を Hermes が読めるディレクトリ（`/var/lib/telegram-bot-api` など）に結び付け、ファイルの持ち主が合っていることを確かめます。コンテナは内部の `telegram-bot-api` という利用者に権限を落とします（uid はイメージによって違います）。いちばん簡単なのは、compose のサービスに `user: "<UID>:<GID>"` を足して、Hermes がすでに使っている uid の持ち物にしてしまうことです。
- **別のマシン** — ボットのサーバーがどこか（NAS や別の仮想マシン）で動き、Hermes が別のところにある場合。サーバーのデータのディレクトリを、サーバーが返すのと**同じ絶対パス**（たいていは `/var/lib/telegram-bot-api`）で Hermes 側のマシンからも見えるようにします。NFS がよく合います。ファイルシステムの層で uid の食い違いを扱いたくなければ、`uid=` で読み替えられる CIFS/SMB の方が楽です。

`local_mode: true` にしても Hermes が返されたパスを `stat` できないとき（権限が足りない、結び付けが違う）、python-telegram-bot は黙って手元のサーバーへの HTTP の `getFile` に切り替えます。`--local` の状態では、それは `404 Not Found` を返します。症状は `gateway.log` にこう出ます。

```
[Telegram] Failed to cache voice: Not Found
telegram.error.InvalidToken: Not Found
```

これが出ているなら、上限の引き上げは効いていて、ファイルの共有が効いていません。Hermes 側のホストで、ゲートウェイを動かしている利用者として `ls -la /var/lib/telegram-bot-api/<TOKEN>/voice/` を実行し、どれか一つのファイルが権限のエラーなしで `cat` できることを確かめてください。

### 手順 6: 試す {#step-6-test-it}

20 MB を超える音声メモか音声ファイルをボットに送ります。ゲートウェイのログを追いかけます。

```bash
tail -f ~/.hermes/logs/gateway.log | grep -iE "telegram|cache"
```

`[Telegram] Cached user voice at /home/<user>/.hermes/cache/audio/...` の行が出て、「too large」で断られ**ない**はずです。上に書いた `stt.enabled: false` と組み合わせれば、元の音声ファイルのパスがエージェントへのメッセージに入り、そのあとの処理へ渡せます。

## グループでの使い方 {#group-chat-usage}

Hermes Agent は Telegram のグループでも動きます。次の点に気をつけてください。

- **プライバシーモード**で、ボットに見えるメッセージが決まります（[手順 3](#step-3-privacy-mode-critical-for-groups) を参照）
- `TELEGRAM_ALLOWED_USERS` はグループでも効きます。許可された人だけがボットを動かせます
- `telegram.require_mention: true` にすると、ふつうのグループの会話には反応しなくなります
- `telegram.require_mention: true` のとき、グループのメッセージが受け付けられるのは次の場合です:
  - ボットのメッセージへの返信
  - `@botusername` での呼びかけ
  - `/command@botusername`（ボット名を含む、Telegram のメニューから出るコマンドの形）
  - `telegram.mention_patterns` に書いた正規表現の合図に当てはまるもの
- Hermes のボットが何体もいるグループでは、`telegram.exclusive_bot_mentions` が行き先をはっきりさせます。メッセージが一つ以上の Telegram のボット名をはっきり呼んでいるときは、呼ばれたボットだけが処理し、ほかの Hermes は返信や合図の判定より前に無視します。既定で有効です。
- BotFather でボットの `@username` を変えても自動で追いかけます。ゲートウェイを再起動しなくても、Hermes は新しい名前で呼びかけを判定します。末尾が `bot` でない、収集品（Fragment）のユーザー名にも対応しています。
- `telegram.ignored_threads` を使うと、そのグループが自由な応答や呼びかけでの返信を許していても、特定の Telegram のフォーラムのトピックでは Hermes を黙らせておけます
- `telegram.require_mention` を設定しないか false のままにすると、Hermes はこれまでどおり開けたグループのふるまいをして、見えるふつうのメッセージに応じます

### 一つのグループに Hermes のボットが何体もいるとき {#multiple-hermes-bots-in-one-group}

同じ Telegram のグループで Hermes のプロファイルを何本か動かすときは、プロファイルごとに Telegram のボットのトークンを作り、プロファイルごとにゲートウェイを一つ起動します。同じボットのトークンを複数の動いているゲートウェイで使い回さないでください。Telegram は同じトークンで同時にポーリングすることを拒みます。

グループでのおすすめの設定はこうです。

```yaml
telegram:
  require_mention: true
  exclusive_bot_mentions: true
  mention_patterns: []
```

こうしておくと、`@research_bot @ops_bot summarize this` のようなグループのメッセージは `research_bot` と `ops_bot` だけが処理します。グループにいるほかの Hermes は、そのメッセージが自分の前の発言への返信であっても、共通の合図に当てはまっていても、黙っています。

`exclusive_bot_mentions: false` にするのは、はっきりした呼びかけが返信や合図より優先されては困る、昔ながらのグループの場合だけにしてください。

いくつものプロファイルを動かすには、ゲートウェイのコマンドをプロファイルごとに実行します。たとえばこうです。

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

数が決まっている小さな一群なら、既定のプロファイルには `hermes gateway <action>` を、名前付きのプロファイルには `hermes -p <profile> gateway <action>` を呼ぶ簡単なシェルのループや script を書くとよいでしょう。プロセス全体を扱う一つのコマンドが、どのサービス管理の仕組みでも名前付きプロファイルを全部まとめて操れると思い込むより、こちらの方が確実です。

### うまくいかないとき: DM では動くのにグループで動かない {#troubleshooting-works-in-dms-but-not-groups}

一対一のチャットでは応じるのに、グループでは黙ったままのときは、次の順に確かめてください。

1. **Telegram が届けているか:** BotFather のプライバシーモードを切るか、ボットを管理者にするか、
   ボットをはっきり呼んでください。Telegram がボットに届けていないメッセージには、
   Hermes は応じられません。
2. **プライバシーを変えたら入れ直す:** BotFather のプライバシーの設定を変えたら、ボットを
   グループから外して入れ直します。Telegram は、すでにある参加状態については古いふるまいを
   続けることがあります。
3. **Hermes 側の許可:** 送った人が
   `TELEGRAM_ALLOWED_USERS` か `TELEGRAM_GROUP_ALLOWED_USERS` に入っているか、
   あるいは `TELEGRAM_GROUP_ALLOWED_CHATS` でそのグループを許可しているかを確かめます。
4. **呼びかけの条件:** `telegram.require_mention: true` にしていると、スラッシュコマンド、
   ボットへの返信、`@botusername` での呼びかけ、`mention_patterns` に当てはまるもの以外の
   ふつうの会話は無視されます。
5. **ボットが何体もいるときの行き先:** グループに複数のボットがいるなら、Hermes の
   プロファイルごとにボットのトークンが違うことを確かめ、昔ながらの共通の合図のふるまいを
   わざと使いたいのでなければ `exclusive_bot_mentions` は有効のままにします。

Telegram のグループやスーパーグループのチャット ID がマイナスなのはふつうのことです。
チャット単位で許可するときは、その ID を送信者の許可リストではなく
`TELEGRAM_GROUP_ALLOWED_CHATS` に入れてください。

### グループで反応させる設定の例 {#example-group-trigger-configuration}

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

この例では、いつもの直接の呼びかけに加えて、`@mention` を使わなくても `chompy` で始まるメッセージに反応します。
Telegram のトピック `31` と `42` のメッセージは、呼びかけや自由応答の判定より前にいつも無視されます。

### `mention_patterns` について {#notes-on-mentionpatterns}

- 書き方は Python の正規表現です
- 大文字と小文字は区別しません
- 文章のメッセージにも、ファイルに添えた説明文にも当てられます
- 正しくない正規表現は、ボットを落とさずに、ゲートウェイのログに警告を出して無視されます
- メッセージの先頭だけに当てたいときは、`^` で頭を固定します

## DM の中のトピック（Bot API 9.4） {#private-chat-topics-bot-api-94}

Telegram の Bot API 9.4（2026 年 2 月）で **DM の中のトピック**が入りました。ボットが一対一の DM の中に、フォーラムのようなトピックのスレッドを直接作れます。スーパーグループは要りません。これで、Hermes との既存の DM の中に、独立した作業場をいくつも持てます。

### 使いどころ {#use-case}

長く続く仕事をいくつも抱えているなら、トピックごとに文脈を分けられます。

- **「Website」のトピック** — 本番の web サービスの作業
- **「Research」のトピック** — 文献の下調べと論文の探索
- **「General」のトピック** — こまごました用事と短い質問

トピックごとに会話のセッション・履歴・文脈が分かれ、互いにまったく混ざりません。

### 設定 {#configuration}

:::caution 前もって必要なこと
設定にトピックを足す前に、利用者がボットとの DM で **Topics（トピック）を有効にする**必要があります。

1. Telegram で Hermes のボットとの一対一のチャットを開きます
2. 上の方にあるボットの名前を押して、チャットの情報を開きます
3. **Topics** を有効にします（チャットをフォーラムにする切り替えです）

これをしないと、Hermes は起動時に `The chat is not a forum` と記録し、トピックを作らずに進みます。これは Telegram のアプリ側の設定で、ボットから有効にすることはできません。
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

**書ける項目:**

| 項目 | 必須 | 説明 |
|-------|----------|-------------|
| `name` | はい | トピックの表示名 |
| `icon_color` | いいえ | Telegram のアイコンの色の番号（整数） |
| `icon_custom_emoji_id` | いいえ | トピックのアイコンに使う絵文字の ID |
| `skill` | いいえ | このトピックで新しいセッションが始まるときに読むスキル |
| `thread_id` | いいえ | トピックを作ったあとに自動で入ります。手で書かないでください |

### どう動くか {#how-it-works}

1. ゲートウェイの起動時に、Hermes はまだ `thread_id` を持たないトピックごとに `createForumTopic` を呼びます
2. `thread_id` は `config.yaml` に自動で書き戻されます。次からの起動では API を呼びません
3. トピックはそれぞれ独立したセッションの鍵に結び付きます: `agent:main:telegram:dm:{chat_id}:{thread_id}`
4. トピックごとに、会話の履歴・記憶の書き出し・文脈の窓が別々になります

### いちばん上の DM の扱い {#root-dm-handling}

既定では、トピックの外、つまりいちばん上の DM に送られたメッセージもふつうに処理されます。
`ignore_root_dm: true` にすると、そこは待合室になります。DM のトピックを設定してある利用者からの
ふつうのメッセージは黙って無視され、システムのコマンド（`/start`、`/help`、`/status` など）は
これまでどおり動きます。

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

この判定は**チャットごと**です。`dm_topics` に一つでも書かれている利用者だけが、
いちばん上の DM の扱いが変わります。トピックを設定していない利用者には影響しません。

### スキルの割り当て {#skill-binding}

`skill` の項目を持つトピックでは、そこで新しいセッションが始まるときにそのスキルが自動で読まれます。会話の頭で `/skill-name` と打つのとまったく同じで、スキルの中身が最初のメッセージに差し込まれ、そのあとのメッセージからは会話の履歴として見えます。

たとえば `skill: arxiv` を持つトピックでは、セッションがやり直されるたび（放っておいた時間切れ、日ごとのやり直し、手動の `/reset`）に arxiv のスキルが先に読まれます。

:::tip
設定の外で作られたトピック（Telegram の API を直接叩いて作った場合など）は、`forum_topic_created` の案内メッセージが届いたときに自動で見つかります。ゲートウェイを動かしたまま設定にトピックを足すこともでき、次に手元の控えが外れたときに拾われます。
:::

## DM を複数セッションで使う（`/topic`） {#multi-session-dm-mode-topic}

ChatGPT のように、一つのボットの中で会話をいくつも並行して進める DM の使い方です。上に書いた運用側が決める `extra.dm_topics` とは違い、こちらは**使う人が動かします**。設定も、あらかじめ決めたトピック名も要りません。使う人が `/topic` で有効にし、Telegram の **+** ボタンから好きなだけトピックを作ります。どれもが完全に独立した Hermes のセッションになります。

### `/topic` の使い方 {#topic-subcommands}

| 書き方 | 使う場所 | 起きること |
|------|---------|--------|
| `/topic` | いちばん上の DM、まだ有効でないとき | BotFather 側の状態を確かめ、複数セッションの形を有効にし、ピン留めした System のトピックを作ります |
| `/topic` | いちばん上の DM、すでに有効なとき | 状態を表示します。呼び戻せる、どのトピックにも結び付いていないセッションが並びます |
| `/topic` | トピックの中 | いまのトピックが、どのセッションに結び付いているかを表示します |
| `/topic help` | どこでも | 使い方を表示します |
| `/topic off` | いちばん上の DM | 複数セッションの形をやめ、このチャットのトピックの結び付きをすべて消します |
| `/topic <session-id>` | トピックの中 | 前の Telegram のセッションを、いまのトピックに呼び戻します |

`/topic` を使えるのは許可された利用者だけです（`TELEGRAM_ALLOWED_USERS` や、プラットフォームの認証の設定による許可リスト）。許可されていない人には、有効にせず断りが返ります。

### DM のトピックと、複数セッションの DM の違い {#dm-topics-vs-multi-session-dm-mode}

| | `extra.dm_topics`（設定で決める） | `/topic`（使う人が決める） |
|---|---|---|
| 誰が有効にするか | 運用する人が `config.yaml` で | 使う人が `/topic` を送って |
| トピックの並び | 設定に書いた決まった顔ぶれ | 使う人が自由に作り、消す |
| トピックの名前 | 運用する人が決める | 使う人が決め、Hermes のセッション名に合わせて自動で付け直される |
| いちばん上の DM | ふつうのチャット（`ignore_root_dm: true` なら待合室） | システム用の待合室になる（コマンド以外のメッセージは断られる） |
| 主な使いどころ | 決まった作業場と、必要ならスキルの割り当て | その場かぎりの並行したやりとり |
| どこに残るか | 設定の `extra.dm_topics` | SQLite の `telegram_dm_topic_mode` と `telegram_dm_topic_bindings` の表 |

この二つは同じボットで同時に使えます。ある人の DM で `/topic` を動かしつつ、ほかのチャットでは `extra.dm_topics` が運用側の決めたトピックを管理し続けます。

### 前もって必要なこと {#prerequisites}

**@BotFather** で自分のボットを開き、**Bot Settings → Threads Settings** と進みます。

1. **Threaded Mode** を有効にします（`has_topics_enabled` が立ちます）
2. 利用者がトピックを作ることを**禁止しないで**ください（`allows_users_to_create_topics` を有効のままにします）

使う人が最初に `/topic` を送ったとき、Hermes は `getMe` でこの二つを確かめます。どちらかが切れていれば、BotFather の Threads Settings の画面の写真を送り、どこを切り替えるかを説明します。条件が揃うまで、有効にはなりません。

### 有効にする流れ {#activation-flow}

いちばん上の DM から、こう送ります。

```
/topic
```

Hermes は次のように動きます。

1. `getMe().has_topics_enabled` と `allows_users_to_create_topics` を確かめます
2. 両方とも立っていれば、この DM で複数セッションのトピックの形を有効にします
3. 状態やコマンド用の **System** のトピックを作ってピン留めします（できる範囲で）
4. 呼び戻せる、どのトピックにも結び付いていない前の Telegram のセッションを並べて返します

有効にしたあと、**いちばん上の DM は待合室**になります。ふつうの問いかけは断られ、**All Messages** を使うよう案内が出ます。システムのコマンド（`/status`、`/sessions`、`/usage`、`/help` など）は、いちばん上でもこれまでどおり動きます。

### 新しいトピックを作る（使う人の手順） {#creating-a-new-topic-end-user-flow}

1. Telegram でボットとの DM を開きます
2. ボットの画面の上にある **All Messages** を押し、何かメッセージを送ります
3. そのメッセージのために、Telegram が新しいトピックを作ります
4. Hermes がそのトピックの中で返します。これでそのトピックが独立したセッションになります

トピックごとに、会話の履歴・モデルの状態・道具の実行・セッション ID が分かれます。切り分けの鍵は `agent:main:telegram:dm:{chat_id}:{thread_id}` で、設定で決める DM のトピックの切り分けとまったく同じです。

### トピック名の自動の付け直し {#auto-renamed-topics}

最初のやりとりのあと、Hermes が自動でセッション名を作ると（自動の題名付けの仕組みによります）、Telegram のトピックの名前もそれに合わせて変わります。「New Topic」が「Database migration plan」になる、といった具合です。付け直しはできる範囲で行われ、失敗しても記録に残るだけでセッションは壊れません。

これをやめて、自分で付けたトピック名をそのままにしたいときは、こう設定します。

```yaml
gateway:
  platforms:
    telegram:
      extra:
        disable_topic_auto_rename: true
```

これを有効にしても、Hermes は内部のセッション名（`hermes sessions` や TUI などで使います）を作り続けますが、Telegram のトピック名には触れません。BotFather の Threaded Mode でトピックを手で整理していて、最初の返信のたびに題名を書き換えられたくないときに役立ちます。

### トピックの中での `/new` {#new-inside-a-topic}

いまのトピックのセッションをやり直します（新しいセッション ID と、まっさらな履歴になります）。ほかのトピックには触れません。Hermes は、並行して進めたいならもう一つトピックを作る（**All Messages** から）のがたいてい望みのものだ、と添えて返します。

### 前のセッションを呼び戻す {#restoring-a-previous-session}

トピックの中で、こう送ります。

```
/topic <session-id>
```

これで、新しく始める代わりに、いまのトピックを既存の Hermes のセッションに結び付けます。トピックの形を有効にする前に始めた会話を続けたいときに役立ちます。条件は次のとおりです。

- そのセッションは、同じ Telegram の利用者のものである必要があります
- そのセッションは、ほかのトピックにまだ結び付いていない必要があります

Hermes はセッション名を添えて確かめ、文脈のために最後のアシスタントの発言をもう一度出します。

セッション ID を知るには、いちばん上の DM で引数なしの `/topic` を送ってください。どのトピックにも結び付いていない Telegram のセッションが並びます。

### トピックの中で引数なしの `/topic` {#topic-inside-a-topic-no-argument}

いまのトピックの結び付き（セッション名、セッション ID）と、`/new` を使うか別のトピックを作るかの目安を表示します。

### 内部のしくみ {#under-the-hood}

- 有効にしたことは `state.db` の `telegram_dm_topic_mode(profile_name, chat_id, user_id, enabled, ...)` に残ります。主キーが `(profile_name, chat_id)` なので、一つの `state.db` を分け合う多重化・振り分けのボットどうしは、同じ Telegram の利用者が複数のボットに DM しても互いを上書きしません（DM の `chat_id` は利用者 ID そのもので、どのボットでも同じになります）。
- トピックごとの結び付きは `telegram_dm_topic_bindings(profile_name, chat_id, thread_id, session_id, ...)` に残ります。主キーは `(profile_name, chat_id, thread_id)` で、`session_id` に `ON DELETE CASCADE` が付いているので、セッションを整理すればトピックの結び付きも一緒に消えます
- トピックの形のための SQLite の書き換えは**必要になってから**走ります。最初の `/topic` のときだけで、ゲートウェイの起動時ではありません。そのプロファイルで誰かが `/topic` を使うまで、`state.db` は変わりません。スキーマの v3 で `profile_name` が加わり、古い行は `default` の名前空間にだけ移ります
- 届いた DM のメッセージごとに、**振り分け先の**プロファイル（プロセス全体のいまのプロファイルではなく `source.profile`）で `(profile_name, chat_id, thread_id)` の結び付きを調べます。見つかれば `SessionStore.switch_session()` でそのセッションへ振り分けるので、セッションの鍵とセッション ID の対応がディスク上でも食い違いません
- トピックの中の `/new` は、結び付きの行を新しいセッション ID に書き換えます。次のメッセージからは、新しいセッションのままです
- `extra.dm_topics` に書かれたトピックの名前は**自動で付け直されません**。複数セッションの形を有効にしても、運用する人が決めた名前は残ります
- `extra.disable_topic_auto_rename: true` にすると、そのチャットの**すべての**トピック（Threaded Mode でその場かぎりに作ったものも含みます）で自動の付け直しが止まります
- フォーラムにした DM の General（いちばん上にピン留めされる）のトピックは、Telegram が `message_thread_id=1` を付けて届けても、何も付けずに届けても、いちばん上の待合室として扱われます
- 待合室での案内は、**（プロファイル、チャット）**ごとに 30 秒に 1 通までに抑えられます。トピックの形が有効なのを忘れて、いちばん上で十回打ってしまった人に十通返ることはありませんし、同じチャット ID を分け合う二つのプロファイルが互いの案内を抑え込むこともありません
- BotFather の設定の画面写真は、**（プロファイル、チャット）**ごとに 5 分に 1 通までです。Threads Settings が切れたまま `/topic` を何度も送っても、同じ画像を繰り返し送りません
- トピックの中で始めた `/bg <prompt>` の結果は、同じトピックに返ります。裏で動くセッションが、そのトピックの名前を自動で付け直すことはありません
- `/topic` そのものも、ボットの利用者の許可の判定を通ります。許可されていない DM には、有効にせず断りが返ります

### 複数セッションの形をやめる {#disabling-multi-session-mode}

いちばん上の DM で `/topic off` と送ります。Hermes は**このプロファイルの**名前空間の行を無効にし、そのチャットについてそのプロファイルの `(thread_id → session_id)` の結び付きを消します。いちばん上の DM は、ふつうの Hermes のチャットに戻ります。Telegram にあるトピックそのものは消えません。ただ、独立したセッションとして扱われなくなるだけです。あとで `/topic` をもう一度送れば、また有効になります。

手で片づけたいとき（たくさんのチャットをまとめて戻す場合など）は、`profile_name` で範囲を絞ってください（プロファイルが一つだけなら `default` です）。

```bash
sqlite3 ~/.hermes/state.db \
  "UPDATE telegram_dm_topic_mode SET enabled = 0
     WHERE profile_name = 'default' AND chat_id = '<your_chat_id>';
   DELETE FROM telegram_dm_topic_bindings
     WHERE profile_name = 'default' AND chat_id = '<your_chat_id>';"
```

### Hermes を古い版に戻すとき {#downgrading-hermes}

`/topic` より前の版に戻すと、この機能はただ動かなくなります。`telegram_dm_topic_mode` と `telegram_dm_topic_bindings` の表は `state.db` に残りますが、古いコードからは見向きもされません。DM は、もともとのスレッドごとの切り分けに戻ります（`message_thread_id` ごとに `build_session_key` でセッションが分かれます）。ですから、いまある Telegram のトピックは並行したやりとりとして使い続けられます。いちばん上の DM は待合室ではなくなり、そこでのメッセージは以前どおりエージェントに届きます。もう一度上げ直せば、複数セッションの形はそのままの状態で戻ります。

## グループのフォーラムのトピックにスキルを割り当てる {#group-forum-topic-skill-binding}

**Topics** を有効にしたスーパーグループ（「フォーラムのトピック」とも呼ばれます）では、もともとトピックごとにセッションが分かれています。`thread_id` ごとに別の会話になります。ただ、DM のトピックへのスキルの割り当てと同じように、特定のグループのトピックにメッセージが来たときに**スキルを自動で読ませたい**こともあるでしょう。

### 使いどころ {#use-case}

仕事の流れごとにフォーラムのトピックを分けている、チームのスーパーグループの例です。

- **Engineering** のトピック → `software-development` のスキルを自動で読む
- **Research** のトピック → `arxiv` のスキルを自動で読む
- **General** のトピック → スキルなし。何でも扱う相棒として

### 設定 {#configuration}

`~/.hermes/config.yaml` の `platforms.telegram.extra.group_topics` の下に割り当てを足します。

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

**書ける項目:**

| 項目 | 必須 | 説明 |
|-------|----------|-------------|
| `chat_id` | はい | スーパーグループの数字の ID（`-100` で始まるマイナスの数字） |
| `name` | いいえ | そのトピックに付ける分かりやすい名前（説明のためだけのものです） |
| `thread_id` | はい | Telegram のフォーラムのトピックの ID。`t.me/c/<group_id>/<thread_id>` のリンクで見えます |
| `skill` | いいえ | このトピックで新しいセッションが始まるときに読むスキル |

### どう動くか {#how-it-works}

1. 割り当てのあるグループのトピックにメッセージが届くと、Hermes は `group_topics` の設定から `chat_id` と `thread_id` を探します
2. 見つかった項目に `skill` があれば、そのセッションでスキルが自動で読まれます。DM のトピックへの割り当てとまったく同じです
3. `skill` のないトピックは、セッションが分かれるだけです（これまでどおりのふるまいで、変わりません）
4. 割り当てのない `thread_id` や `chat_id` は黙って素通りします。エラーも出ず、スキルも読まれません

### DM のトピックとの違い {#differences-from-dm-topics}

| | DM のトピック | グループのトピック |
|---|---|---|
| 設定の項目 | `extra.dm_topics` | `extra.group_topics` |
| トピックを作る人 | `thread_id` がなければ Hermes が API で作る | 管理者が Telegram の画面で作る |
| `thread_id` | 作ったあとに自動で入る | 手で設定する必要がある |
| `icon_color` / `icon_custom_emoji_id` | 使えます | 当てはまりません（見た目は管理者が決めます） |
| スキルの割り当て | ✓ | ✓ |
| セッションの切り分け | ✓ | ✓（フォーラムのトピックには元から備わっています） |

:::tip
トピックの `thread_id` を知るには、Telegram の Web 版かデスクトップ版でそのトピックを開き、URL を見ます。`https://t.me/c/1234567890/5` なら、最後の数字（`5`）が `thread_id` です。スーパーグループの `chat_id` は、グループの ID の頭に `-100` を付けたものです（グループ `1234567890` なら `-1001234567890`）。
:::

## 最近の Bot API の機能 {#recent-bot-api-features}

- **Bot API 9.4（2026 年 2 月）:** DM の中のトピック。ボットが `createForumTopic` で、一対一の DM にフォーラムのトピックを作れます。Hermes はこれを二つの別々の機能に使っています。運用する人が決める [DM の中のトピック](#private-chat-topics-bot-api-94)（設定で決める、決まった顔ぶれ）と、使う人が動かす [複数セッションの DM](#multi-session-dm-mode-topic)（`/topic` で有効にし、いくつでも作れます）です。
- **プライバシーポリシー:** Telegram はボットにプライバシーポリシーを求めるようになりました。BotFather の `/setprivacy_policy` で設定してください。設定しないと、Telegram が仮のものを自動で作ることがあります。広く公開するボットではとくに大事です。
- **Bot API 9.5（2026 年 3 月）: `sendMessageDraft` による本来の流し込み。** Hermes は、Telegram 本来の下書きを流し込む API を、DM で選んで使える送り方として支えています。既定は昔ながらの `editMessageText` の経路のままです。Telegram のアプリによっては、下書きの表示がいったん崩れて描き直されることがあるからです。

### 流し込みの送り方（`gateway.streaming.transport`） {#streaming-transport-gatewaystreamingtransport}

流し込みを有効にすると（`gateway.streaming.enabled: true`）、Hermes は四つの送り方から一つを選びます。

| 値 | ふるまい |
|---|---|
| `auto`（既定） | 対応しているチャット（いまのところ Telegram の DM）では本来の下書きで流し、それ以外では昔ながらの書き換え方式にします。下書きの一片が失敗しても、うまく切り替わります。 |
| `draft` | 本来の下書きを必ず使います。そのチャットが下書きに対応していないとき（グループやトピックなど）は、記録を残して書き換え方式に切り替えます。 |
| `edit` | どのチャットでも、昔ながらの `editMessageText` を重ねる方式にします。 |
| `off` | 流し込みをやめます（最後の返答だけで、途中経過は出ません）。 |

`~/.hermes/config.yaml` ではこう書きます。

```yaml
gateway:
  streaming:
    enabled: true
    transport: auto    # auto | draft | edit | off
```

**`edit`（既定）で DM のときに見えるもの** — ゲートウェイがふつうの下読み用のメッセージを送り、`editMessageText` で少しずつ書き換えます。Telegram の下書きの表示が崩れて戻る現象を避けられます。

**`auto` か `draft` で DM のときに見えるもの** — Telegram が、語ごとに更新される下書きの表示を出します。返答が終わると、ふつうのメッセージとして届き、下書きの表示はアプリ側で自然に消えます。下書きにはメッセージ ID がないので、履歴に残るのは最後の答えです。

**グループやスーパーグループ、フォーラムのトピックでは?** Telegram は `sendMessageDraft` を DM に限っています。それ以外では、ゲートウェイが黙って書き換え方式に切り替えます。使い心地はこれまでと変わりません。

**下書きの一片が失敗したら?** 何かの失敗（一時的な通信の不調、サーバー側の拒否、古い python-telegram-bot）があれば、その返答は残りの間ずっと書き換え方式になります。次の返答では、また下書きを試します。

## 表示: 凝ったメッセージ、表、リンクの下読み {#rendering-rich-messages-tables-and-link-previews}

**凝ったメッセージ（Bot API 10.1）。** 昔ながらの MarkdownV2 の経路では形が崩れるもの（表、作業の一覧、折りたためる `<details>`、数式のブロック）を含む最後の返答は、エージェントの**素のマークダウン**のまま Telegram 本来の [`sendRichMessage`](https://core.telegram.org/bots/api#sendrichmessage) で送られます。アプリ側で潰されずに、そのまま表示されます。DM では既定の `rich_drafts: false` によって、流し込みの下読みは素のままです（Telegram の一時的な下書きの経路を、昔ながらの表示で使うので、表など凝った書き方は下読みでは素のマークダウンのまま残ります）。そのうえで、出来上がった返答を `sendRichMessage` で残します。`rich_drafts: true` にすると、その場の下読みにも `sendRichMessageDraft` を使います。書き換え方式の流し込みでは、`editMessageText` の `rich_message` の指定で、いまある下読みをその場で仕上げられます。ふつうの返答（素の文章、太字や斜体、簡単な箇条書き）は、どのアプリでも字の太さや間隔が揃うように MarkdownV2 の経路のままです。

凝った表示は、中身が 32,768 文字の上限を超えると自動的に見送られます。Telegram からの拒否（古い `python-telegram-bot` で受け口がない、解析のエラー、大きすぎる塊や列）があれば、**黙って** MarkdownV2 の経路に切り替わるので、メッセージが消えることはありません。一時的な通信のエラーは、送り直され*ません*（同じ返答が二重に届かないようにするためです）。

**MarkdownV2 での代わりの表示。** 凝った経路を使えないメッセージでは、Hermes がマークダウンを MarkdownV2 に変えます。MarkdownV2 には表の書き方がないので、縦棒で書かれた表はこう整えられます。

- **小さな表**は、**行ごとのまとまった箇条書き**にほどかれます。列の見出しの下に、各行が読みやすい箇条書きとして並びます。2〜4 列で、各ますが短いときに向いています。
- **大きい表や横に広い表**は、桁を揃えた**コードブロック**に落ちるので、形が崩れません。

凝ったメッセージは**自分で選んで使うもの**です。既定が昔ながらの MarkdownV2 の経路のままなのは、いまの Telegram のアプリでは Bot API の凝ったメッセージを素の文字としてコピーしにくいことがあるからです。コマンドの断片や、スマホから別の場所へ移したいときにはとくに困ります。表・作業の一覧・折りたたみ・数式を本来の形で表示したいときは、こうします。

```yaml
gateway:
  platforms:
    telegram:
      extra:
        rich_messages: true
        rich_drafts: false
```

この設定は、アプリでの表示とコピーのしやすさのためのものです。Telegram が凝った API の呼び出しを拒んだときは、Hermes がすでに自動で切り替えます。`rich_drafts` は、DM の流し込みの下読みを凝った形で*表示する*かどうか（`sendRichMessageDraft`）を決めるもので、既定では切ってあります。Telegram のデスクトップ版や macOS 版では、チャットが描き直されるまで凝った下書きが重なって見えることがあるからです。切ってあれば、下読みは素のまま流れ、最後の返答は本来の凝ったメッセージとして届きます。凝ったメッセージは使いたいけれど、表は昔ながらの「いつもコードブロック」のままがよい場合は、`config.yaml` で `telegram.pretty_tables: false` にして表の整えをやめてください（既定は `true`）。

**リンクの下読み。** Telegram は、ボットのメッセージにある URL の下読みを自動で作ります。それを出したくないとき（長い `/tools` の出力、リンクを十個並べた返答など）はこうします。

```yaml
gateway:
  platforms:
    telegram:
      extra:
        disable_link_previews: true
```

有効にすると、Hermes は送るすべてのメッセージに Telegram の `LinkPreviewOptions(is_disabled=True)` を付け、古い `python-telegram-bot` では昔ながらの `disable_web_page_preview` の指定に切り替えます。

## グループの許可リスト {#group-allowlisting}

Telegram のグループとフォーラムのチャットには、別々に設定できる二つの入口があります。

- **送った人の利用者 ID**（`group_allow_from` / `TELEGRAM_GROUP_ALLOWED_USERS`）— グループやフォーラムのメッセージにだけ効く、送信者ごとの許可リストです。特定の人にグループでボットを使わせたいけれど、`TELEGRAM_ALLOWED_USERS` に入れて DM まで使えるようにはしたくない、というときに使います。
- **チャット ID**（`group_allowed_chats` / `TELEGRAM_GROUP_ALLOWED_CHATS`）— チャットごとの許可リストです。そのグループやフォーラムにいる人なら誰でもボットを使えます。グループに入っていること自体が資格になる、チームや問い合わせ用のボットに向いています。

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

同じことを環境変数で書くとこうです。

```bash
TELEGRAM_ALLOWED_USERS="123456789"
TELEGRAM_GROUP_ALLOWED_USERS="987654321"
TELEGRAM_GROUP_ALLOWED_CHATS="-1001234567890"
```

どう動くか:

- `TELEGRAM_ALLOWED_USERS` は、すべての種類のチャット（DM、グループ、フォーラム）に効きます。
- `TELEGRAM_GROUP_ALLOWED_USERS` は、書かれた人をグループとフォーラムでだけ許可します。`TELEGRAM_ALLOWED_USERS` に入っていなければ、ボットに DM はできません。
- `TELEGRAM_GROUP_ALLOWED_CHATS` に書いたチャットでは、送った人が誰であれ、そこにいる全員が許可されます。
- どれにも `*` を書けば、送った人やチャットを問わず許可できます。
- これらは、いまある呼びかけや合図の判定、`group_topics` と `ignored_threads` の上に重なって効きます。

### PR #17686 より前からの移行 {#migration-from-before-pr-17686}

この二つに分かれる前は `TELEGRAM_GROUP_ALLOWED_USERS` しかなく、そこに**チャット ID** を書く人がいました。互換のため、`TELEGRAM_GROUP_ALLOWED_USERS` の中でチャット ID の形をした値（`-` で始まるもの）は、いまもチャット ID として扱われ、廃止予定の警告が一度だけ記録されます。移行のしかたはこうです。

```bash
# Old (still works, but deprecated)
TELEGRAM_GROUP_ALLOWED_USERS="-1001234567890"

# New
TELEGRAM_GROUP_ALLOWED_CHATS="-1001234567890"
```

### 呼ばれたときだけ客として応じる（`guest_mode`） {#guest-mention-bypass-guestmode}

ふつうの設定では、`group_allowed_chats` は固い入口です。一覧にないグループからのメッセージは、誰かがはっきり @ で呼んでも黙って落とされます。問い合わせ用やチームのボットには、これが正しい既定です。

もっと気軽な使い方、たとえば友達のグループで、ボットには**たいてい黙っていてほしい**けれど**はっきり呼ばれたときだけ応じてほしい**場合は、`guest_mode` を有効にします。

```yaml
gateway:
  platforms:
    telegram:
      extra:
        group_allowed_chats:
          - "-1001234567890"   # your main allowlisted group
        guest_mode: true       # non-allowlisted groups: allow on @mention only
```

環境変数ではこうです。

```bash
TELEGRAM_GUEST_MODE=true
```

既定は `false` です。

`guest_mode: true` のとき、一覧にないグループからのメッセージが処理されるのは、はっきりボットを @ で呼んでいるときだけです。呼びかけは毎回必要で、客としてのやりとりにセッションの粘りはありません。ですから、呼ばれていない友達のグループのスレッドに、ボットが勝手に入り込むことはありません。

DM と、一覧にあるグループのふるまいはこれまでどおりです。

## スラッシュコマンドを誰に使わせるか {#slash-command-access-control}

既定では、許可されたすべての人がすべてのスラッシュコマンドを使えます。許可リストを、**管理者**（すべてのスラッシュコマンドを使える人）と**ふつうの利用者**（はっきり許したコマンドだけ使える人）に分けたいときは、プラットフォームの `extra` の下に `allow_admin_from` と `user_allowed_commands` を足します。

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

**どう動くか:**

- ある範囲（DM かグループ）で `allow_admin_from` に書かれた人は、登録されている**すべての**スラッシュコマンドを、その場の一覧から使えます。組み込みのものも、プラグインが登録したものもです。
- `allow_from` にはいるが `allow_admin_from` にはいない人は、`user_allowed_commands` に書かれたコマンドと、いつでも使える最低限の `/help` と `/whoami` だけを使えます。
- ふつうの会話（スラッシュでないメッセージ）には影響しません。管理者でない人も、これまでどおりエージェントと話せます。ただ、好きなコマンドを動かせないだけです。
- **これまでとの互換:** ある範囲で `allow_admin_from` を設定していなければ、その範囲ではスラッシュコマンドの絞り込みは働きません。いまある環境はそのまま動きます。
- DM の管理者だからといって、グループの管理者になるわけではありません。範囲ごとに別の一覧を持ちます。
- `group_allow_admin_from` だけを設定した場合、DM の範囲は絞り込みなし（これまでどおり）のままです。

いまの範囲、自分の立場（管理者 / 利用者 / 絞り込みなし）、使えるスラッシュコマンドは `/whoami` で確かめられます。

## その場で選べるモデルの一覧 {#interactive-model-picker}

Telegram のチャットで引数なしの `/model` を送ると、Hermes はモデルを切り替えるためのボタンを出します。

1. **提供元を選ぶ** — 使える提供元とモデルの数がボタンに並びます（例:「OpenAI (15)」、いま使っている提供元には「✓ Anthropic (12)」）。
2. **モデルを選ぶ** — ページに分かれたモデルの一覧が、**Prev** / **Next** の移動、提供元に戻る **Back**、そして **Cancel** と一緒に出ます。

いま使っているモデルと提供元は、いちばん上に表示されます。移動はすべて同じメッセージを書き換えて行われるので、チャットが散らかりません。

:::tip
モデル名がはっきり分かっているなら、`/model <name>` と直接打てば一覧を飛ばせます。`/model <name> --global` と打てば、セッションをまたいでその選択が残ります。
:::

## DNS-over-HTTPS による控えの IP {#dns-over-https-fallback-ips}

制限のあるネットワークでは、`api.telegram.org` が届かない IP に解決されることがあります。Telegram のアダプターには**控えの IP** の仕組みがあり、正しい TLS のホスト名と SNI を保ったまま、別の IP へ黙ってつなぎ直します。

### どう動くか {#how-it-works}

1. `TELEGRAM_FALLBACK_IPS` が設定されていれば、その IP をそのまま使います。
2. 設定されていなければ、アダプターが **Google の DNS** と **Cloudflare の DNS** に DNS-over-HTTPS（DoH）で問い合わせ、`api.telegram.org` の別の IP を探します。
3. 分かっている IPv4 の Telegram API の IP を、IPv4 と IPv6 の両方を持つ `api.telegram.org` の名前より**先に**試します。行き止まりの IPv6 の経路は `connect()` の中でエラーも出さずに止まってしまい、以前はそれがイベントループを縛って 30 秒の初期化の期限が来ないままになっていました。
4. DoH も塞がれているか時間切れになるときは、あらかじめ書かれた IPv4 の一覧（`149.154.166.110`、`149.154.167.220`）を、その IPv4 優先の一覧として使います。ホスト名は最後の手段のままです。
5. どれか一つでつながれば、その経路が「そのまま使われる」ようになり、以降はそこへ直接つなぎます。IPv6 しかないネットワークのために、ホスト名は最後の手段として残します。

### 設定 {#configuration}

```bash
# Explicit fallback IPs (comma-separated)
TELEGRAM_FALLBACK_IPS=149.154.167.220,149.154.167.221
```

`~/.hermes/config.yaml` ではこう書きます。

```yaml
platforms:
  telegram:
    extra:
      fallback_ips:
        - "149.154.167.220"
```

:::tip
ふだんはここを手で設定する必要はありません。DoH による自動の探索が、制限のあるネットワークのたいていの場面をまかないます。`TELEGRAM_FALLBACK_IPS` が要るのは、DoH まで塞がれているときだけです。手元で IPv6 が壊れているなら、`config.yaml` で `network.force_ipv4: true` にして、プロセス全体で AAAA の問い合わせを飛ばすこともできます。
:::

## プロキシに対応する {#proxy-support}

インターネットに出るのに HTTP のプロキシが要るネットワーク（会社ではよくあります）では、Telegram のアダプターが決まった名前の環境変数を自動で読み、すべての接続をプロキシ越しにします。

### 読まれる変数 {#supported-variables}

アダプターは次の順に環境変数を見て、最初に設定されているものを使います。

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

`~/.hermes/.env` に書くこともできます。

```bash
HTTPS_PROXY=http://proxy.example.com:8080
```

このプロキシは、主な通信にも控えの IP を使う通信にも効きます。Hermes 側の追加の設定は要りません。環境変数が設定されていれば、自動で使われます。

:::note
ここで扱っているのは、Hermes が Telegram との接続に使う独自の控えの通信の層です。ほかの場所で使っている `httpx` のクライアントは、もともとプロキシの環境変数に従います。
:::

## メッセージへの反応 {#message-reactions}

ボットは、処理の様子を伝えるためにメッセージへ絵文字の反応を付けられます。

- 👀 メッセージの処理を始めたとき
- ✅ 返答をきちんと届けたとき
- ❌ 処理の途中でエラーが起きたとき

反応は**既定では切ってあります**。`config.yaml` で有効にします。

```yaml
telegram:
  reactions: true
```

環境変数でも設定できます。

```bash
TELEGRAM_REACTIONS=true
```

:::note
反応が足し重なる Discord とは違い、Telegram の Bot API では一度の呼び出しでボットの反応をまるごと置き換えます。👀 から ✅ や ❌ への切り替わりは一度で起きるので、両方が同時に見えることはありません。
:::

:::tip
グループで反応を付ける権限がボットにないときは、反応の呼び出しが黙って失敗し、メッセージの処理はそのまま続きます。
:::

## チャンネルごとの指示 {#per-channel-prompts}

特定の Telegram のグループやフォーラムのトピックに、その場限りのシステムの指示を割り当てられます。指示は一巡ごとに実行時に差し込まれ、会話の記録には残りません。書き換えればすぐに効きます。

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

見出しに書くのは、チャット ID（グループやスーパーグループ）か、フォーラムのトピック ID です。フォーラムのグループでは、トピックの指示がグループの指示より優先されます。

- グループ `-1001234567890` の中のトピック `42` のメッセージ → トピック `42` の指示を使います
- トピック `99`（そのトピックの指定はなし）のメッセージ → グループ `-1001234567890` の指示に戻ります
- どの指定もないグループのメッセージ → 指示は差し込まれません

YAML で数字として書かれた見出しは、自動で文字列に直されます。

## うまくいかないとき {#troubleshooting}

| 症状 | 対処 |
|---------|----------|
| ボットがまったく応じない | `TELEGRAM_BOT_TOKEN` が合っているか確かめます。`hermes gateway` のログにエラーがないかも見ます。 |
| 「unauthorized」と返る | 自分の利用者 ID が `TELEGRAM_ALLOWED_USERS` に入っていません。@userinfobot でもう一度確かめてください。 |
| グループのメッセージを無視する | プライバシーモードが有効だと思われます。切る（手順 3）か、ボットをグループの管理者にしてください。**プライバシーを変えたら、ボットを外して入れ直すのを忘れずに。** |
| 音声のメッセージが文字にならない | 文字起こしが使えるか確かめます。手元でやるなら `faster-whisper` を入れ、そうでなければ `~/.hermes/.env` に `GROQ_API_KEY` か `VOICE_TOOLS_OPENAI_KEY` を設定します。 |
| 音声の返事が吹き出しでなくファイルになる | `ffmpeg` を入れてください（Edge TTS を Opus に変えるのに要ります）。 |
| ボットのトークンが無効になった | BotFather で `/revoke` のあと `/newbot` か `/token` を使って新しいトークンを作り、`.env` を書き換えます。 |
| webhook に更新が届かない | `TELEGRAM_WEBHOOK_URL` が外から届くか確かめます（`curl` で試せます）。使っているサービスやリバースプロキシが、その URL のポートに来た HTTPS を `TELEGRAM_WEBHOOK_PORT` で決めた手元のポートへ渡しているか確かめます（番号は同じでなくて構いません）。SSL/TLS が有効かも確かめてください。Telegram は HTTPS の URL にしか送りません。ファイアウォールの設定も見ます。 |

## 危ない操作の確認 {#exec-approval}

エージェントが危ないかもしれないコマンドを実行しようとすると、チャットで確認してきます。

> ⚠️ This command is potentially dangerous (recursive delete). Reply "yes" to approve.

「yes」か「y」で許可、「no」か「n」で断ります。

## 聞き返し（clarify） {#interactive-prompts-clarify}

エージェントが `clarify` の道具を使うとき、つまりどちらのやり方がよいか尋ねる、終わったあとの感想を聞く、それなりの判断の前に確かめる、といった場面では、Telegram はその質問を**押せるボタン**として表示します。

> ❓ Which framework should I use for the dashboard?
>
> [1. Next.js] [2. Remix] [3. Astro]
> [✏️ Other (type answer)]

ボタンを押して答えるか、**Other** を押して自由に書きます（次に送ったメッセージが答えになります）。選択肢のない `clarify`（自由回答）ではボタンは出ず、次のメッセージがそのまま答えになります。

答えを待つ時間は `~/.hermes/config.yaml` の `agent.clarify_timeout` で決めます（既定は `600` 秒）。その間に答えないと、エージェントは決まった合図のメッセージで止まらずに進み、自分で判断します。

## 通知の多さを抑える {#push-notification-volume}

Telegram は、ボットがメッセージを送るたびに通知を出します。長い一巡で道具の進み具合の吹き出し、流し込みの更新、状態の知らせが続くと、すぐにうるさくなります。Telegram のアダプターには、通知のしかたが二つあります。

| 種類 | ふるまい |
|------|----------|
| `important`（既定） | 通知が鳴るのは、**最後の返答**、**確認の問いかけ**、**スラッシュコマンドの返事**だけです。道具の進み具合、流し込みの断片、状態の知らせは `disable_notification=true` で届きます。 |
| `all` | 送るすべてのメッセージで通知が鳴ります。昔ながらのふるまいです。道具の呼び出しのたびに知りたい人向けです。 |

`~/.hermes/config.yaml` で設定します。

```yaml
display:
  platforms:
    telegram:
      notifications: important   # or "all"
```

環境変数でも上書きできます（ちょっと試すのに便利です）。

```bash
HERMES_TELEGRAM_NOTIFICATIONS=all
```

知らない値のときは警告を出して `important` に戻ります。

## 状態のメッセージはその場で書き換わる {#status-messages-edited-in-place}

Telegram のアダプターは、繰り返し出るエージェントの状態の知らせ（「Compressing context…」「Calling tool…」など）を `send_or_update_status()` に通します。ここでは `{(chat_id, status_key) → message_id}` の対応を覚えていて、次からは新しく足すのではなく**いまの吹き出しを書き換えます**。`status_key` が違えば別のメッセージになり、チャットが違えば混ざりません。書き換えに失敗したとき（利用者がメッセージを消した、Telegram が書き換えを許す時間を過ぎたなど）は、覚えていた対応を捨て、次のときに新しいメッセージを出して覚え直します。設定は要りません。これが Telegram での既定のふるまいです。`send_or_update_status` を持たないほかのアダプターは、これまでどおり素の `send()` に落ちます。

## 一巡の間、届いたメッセージをピン留めする {#pin-incoming-user-message-during-agent-turn}

利用者がエージェントを動かすメッセージを送ると、Telegram のアダプターはその一巡の間そのメッセージをピン留めし、返答が終わると外します。ボットが無視しているのではなく、いまそのメッセージに取りかかっていることを、軽く目に見せるためのものです。ピン留めには `disable_notification=true` を使うので、余計な通知は出ません。設定は要りません。

## 安全に使うために {#security}

:::warning
`TELEGRAM_ALLOWED_USERS` は必ず設定して、ボットと話せる相手を絞ってください。設定しないと、安全のためにゲートウェイはすべての利用者を拒みます。
:::

ボットのトークンを人前に出さないでください。漏れたときは、BotFather の `/revoke` ですぐに無効にします。

詳しくは [セキュリティの案内](/hermes/docs/user-guide/security/) を参照してください。許可リストのほかに、[DM でのペアリング](/hermes/docs/user-guide/messaging/#dm-pairing-alternative-to-allowlists) を使う、もっと柔軟なやり方もあります。
