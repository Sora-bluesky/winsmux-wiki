---
title: "Telegram"
description: "Hermes Agent を Telegram のボットとして設定する"
upstream_path: user-guide/messaging/telegram.md
upstream_blob: cd651d7df50fe6a19e953ed5c157f81cd11e822d
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/telegram
---

# Telegram の設定 {#telegram-setup}

Hermes Agent は、機能をひととおり備えた会話ボットとして Telegram と連携します。つないでしまえば、どの端末からでもエージェントと話せますし、送った音声メモは自動で文字起こしされ、定期タスクの結果を受け取ることも、グループチャットでエージェントを使うこともできます。この連携は [python-telegram-bot](https://python-telegram-bot.org/) を土台にしており、テキスト、音声、画像、添付ファイルに対応します。

## 手順 1: BotFather でボットを作る {#step-1-create-a-bot-via-botfather}

Telegram のボットにはすべて、Telegram 公式のボット管理ツールである [@BotFather](https://t.me/BotFather) が発行する API トークンが必要です。

1. Telegram を開いて **@BotFather** を検索するか、[t.me/BotFather](https://t.me/BotFather) を開きます
2. `/newbot` を送ります
3. **表示名**を決めます（例: 「Hermes Agent」）。これは何でも構いません
4. **ユーザー名**を決めます。他と重複せず、`bot` で終わる必要があります（例: `my_hermes_bot`）
5. BotFather が **API トークン**を返します。次のような形です。

```
123456789:ABCdefGHIjklMNOpqrSTUvwxYZ
```

:::warning
ボットのトークンは他人に見せないでください。このトークンを持っている人は、誰でもボットを操作できます。漏れてしまったら、BotFather で `/revoke` を送ってすぐに無効化してください。
:::

## 手順 2: ボットを整える（任意） {#step-2-customize-your-bot-optional}

次の BotFather のコマンドを使うと、使い勝手がよくなります。@BotFather にメッセージを送って使ってください。

| コマンド | 用途 |
|---------|---------|
| `/setdescription` | 会話を始める前に表示される「このボットは何ができるのか」の説明文 |
| `/setabouttext` | ボットのプロフィールページに出る短い文 |
| `/setuserpic` | ボットのアイコン画像をアップロードする |
| `/setcommands` | コマンドメニュー（チャットの `/` ボタン）を定義する |
| `/setprivacy` | ボットがグループの全メッセージを見られるかどうかを決める（手順 3 を参照） |

:::tip
`/setcommands` の出発点としては、次の組み合わせが便利です。

```
help - Show help information
new - Start a new conversation
sethome - Set this chat as the home channel
```
:::

### オンライン／オフラインの表示（任意） {#onlineoffline-status-indicator-optional}

Telegram のボットには、本当の意味でのオンライン／オフラインの点灯表示がありません。あの緑の点は
*ユーザーアカウント*の機能で、Bot API がボット向けに提供しているものではないからです。いちばん近いのは
ボットの**短い説明文**（プロフィールで名前の下に出る行）です。

`status_indicator` を有効にすると、Hermes はゲートウェイの接続時にその短い説明文を **Online** に、
正常に停止したときに **Offline** に書き換えます。

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

補足:

- 短い説明文はボットに対して**全体で 1 つ**（すべてのユーザーに見えます）で、チャットごとではありません。
  開いているチャットの中にバッジとして出るのではなく、ボットのプロフィールページで見えるものです。
- 「Offline」が書き込まれるのは、ゲートウェイが**正常に**停止したとき（`/stop`、`disconnect`）だけです。
  強制終了した場合は最後の状態が残ります。プロフィール文で状態を示す方式の避けられない限界です。
- ボットのプロフィール全体を書き換えるため、既定では無効です。

### コマンドメニューの優先度と上限（任意） {#command-menu-priority-and-cap-optional}

Hermes は Telegram のゲートウェイが起動するときに、コマンドメニューを自動で登録します。メニューは中心となるスラッシュコマンドの登録簿と、条件を満たすプラグイン／スキルのコマンドから組み立てられ、Telegram が確実に受け付けられるように件数を制限します。既定の上限は 60 件で、組み込みコマンドすべてに加えてよく使うスキルのコマンドが表示に残る程度の数です。

Telegram の `/` の候補に出したままにしたい skill・プラグイン・組み込みのコマンドがある場合は、`~/.hermes/config.yaml` で優先度を指定します。

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

`priority_mode` は、指定した一覧を Hermes の組み込みの優先リストとどう組み合わせるかを決めます。

- `prepend`: 自分のコマンドを先に置き、そのあとに Hermes の既定を並べる
- `append`: Hermes の既定を先に置き、そのあとに自分のコマンドを並べる
- `replace`: 優先順位には自分の一覧だけを使う

優先度は、上限で切る前の**まとめた**候補の一覧（中心のコマンド、プラグインのコマンド、skill のコマンド）に対して効きます。そのため、中心のコマンドだけでメニューが埋まってしまう場合でも、優先に指定した skill のコマンドには必ず枠が残ります。以前は skill が常に先に、しかもアルファベット順で切られていたため、名前が後ろのほうにある skill は `priority` を指定しても出てきませんでした。

Telegram は BotCommand を 100 件まで受け付けますが、量が多いと登録に失敗することがあります。Hermes は確実さを優先して既定を 60 件にし、設定値は `1..100` に収めます。コマンドの全体は `/commands` で確認してください。

### インラインの候補検索: すべてのコマンドを探せます（上限なし） {#inline-command-picker-search-every-command-no-cap}

`/` のメニューには上限がありますが、Telegram の**インラインモード**にはありません。有効にすると、どのチャットでも `@yourbotname` に続けて語句を打つだけで、Hermes の**すべて**のコマンドと導入済みの skill をその場で検索できます。候補は 1 文字打つごとに計算され、ページ送りされるので、切り落とされるものはありません:

```
@yourbotname plan            → tap the /plan result to send it
@yourbotname plan migrate auth to OIDC   → sends /plan migrate auth to OIDC
@yourbotname pdf             → finds skills matching "pdf" by name or description
```

最初の語で一覧を絞り込み、それより後ろは、送られるコマンドの引数としてそのまま渡ります。候補をタップすると自分からの通常のメッセージとしてコマンドが送られるので、いつものコマンドの経路で処理されます（コマンドで始まるメッセージは、プライバシーモードが有効でもボットに届きます）。

**最初に一度だけ必要な設定:** インラインモードは、どの Telegram のボットでも既定では無効です。[@BotFather](https://t.me/BotFather) で `/setinline` を実行して有効にしてください（対象のボットを選び、入力欄に出す案内文を決めます。たとえば `Search commands and skills...`）。それまでは Telegram がインラインの問い合わせを送ってこないので、この検索は動きません。

候補が返るのは、ゲートウェイの許可リストを通ったユーザーだけです。許可されていないユーザーには空の一覧が返るため、導入済みの skill の一覧が見知らぬ相手に見えることはありません（インラインの問い合わせは、ボットが入っていないチャットからでも送られてきます）。

## 手順 3: プライバシーモード（グループでは重要） {#step-3-privacy-mode-critical-for-groups}

Telegram のボットには**プライバシーモード**があり、**既定で有効**になっています。グループでボットを使うときに混乱するいちばんの原因がこれです。

**プライバシーモードが有効のとき**、ボットが見られるのは次のものだけです。
- `/` で始まるコマンドのメッセージ
- ボット自身のメッセージへの直接の返信
- サービスメッセージ（メンバーの参加・退出、ピン留めなど）
- ボットが管理者になっているチャンネルのメッセージ

**プライバシーモードが無効のとき**、ボットはグループのすべてのメッセージを受け取ります。

### プライバシーモードを無効にする方法 {#how-to-disable-privacy-mode}

1. **@BotFather** にメッセージを送る
2. `/mybots` を送る
3. 自分のボットを選ぶ
4. **Bot Settings → Group Privacy → Turn off** と進む

:::warning
プライバシー設定を変えたら、**そのボットをグループからいったん外して入れ直す必要があります**。Telegram はボットがグループに参加した時点のプライバシー状態を保持しており、外して入れ直すまで更新されません。
:::

:::tip
プライバシーモードを無効にする代わりに、ボットを**グループの管理者**にする方法もあります。管理者のボットはプライバシー設定に関わらず常にすべてのメッセージを受け取るので、全体のプライバシーモードを切り替えずに済みます。
:::

### 自動で返信せずにグループの会話を見ておく {#observe-group-chatter-without-auto-replying}

OpenClaw や Yuanbao のようなグループでの振る舞いにしたい場合は、ボットが通常のグループメッセージを**見る**ことはできても、直接呼ばれたときだけ**返す**ように Telegram を設定します。

```yaml
telegram:
  allowed_chats:
    - "-1001234567890"
  group_allowed_chats:
    - "-1001234567890"
  require_mention: true
  observe_unmentioned_group_messages: true
```

このモードを有効にすると、明示的に許可したチャットやトピックで、メンションのないグループメッセージが共有のチャット／トピックのセッション記録に「見ていた文脈」として追記されます。ただしエージェントは起動しません。`allowed_chats` はボットが返信する場所を決め、`group_allowed_chats` は見ていた文脈を保持する共有グループセッションを許可します。そのため、このモードでは同じチャット ID を両方に設定してください。あとから同じ許可済みチャット／トピックで `@botname` のメンション、ボットへの返信、設定したメンションのパターンに合うメッセージが来ると、その文脈を使えます。呼び出したメッセージには `[nickname|user_id]` の印が付き、ターンごとの安全のための指示が添えられるので、モデルはそれまでの記録をボットへの指示ではなく文脈として扱います。

同じことを環境変数で書くと次のようになります。

```bash
TELEGRAM_ALLOWED_CHATS=-1001234567890
TELEGRAM_GROUP_ALLOWED_CHATS=-1001234567890
TELEGRAM_OBSERVE_UNMENTIONED_GROUP_MESSAGES=true
```

これには Telegram が通常のグループメッセージをゲートウェイへ届けてくれる必要があるので、上で説明したとおり BotFather のプライバシーモードを無効にするか、ボットをグループの管理者にしてください。

## 手順 4: 自分のユーザー ID を調べる {#step-4-find-your-user-id}

Hermes Agent は、数値の Telegram ユーザー ID でアクセスを制御します。ユーザー ID はユーザー名では**なく**、`123456789` のような数値です。

**方法 1（おすすめ）:** [@userinfobot](https://t.me/userinfobot) にメッセージを送ると、すぐにユーザー ID が返ってきます。

**方法 2:** [@get_id_bot](https://t.me/get_id_bot) にメッセージを送ります。こちらも確実です。

この番号は次の手順で使うので、控えておいてください。

## 手順 5: Hermes を設定する {#step-5-configure-hermes}

### 方法 A: 対話式セットアップ（おすすめ） {#option-a-interactive-setup-recommended}

```bash
hermes gateway setup
```

聞かれたら **Telegram** を選びます。ウィザードがボットのトークンと許可するユーザー ID をたずね、設定を書き込んでくれます。

### 方法 B: 手動で設定する {#option-b-manual-configuration}

`~/.hermes/.env` に次を追加します。

```bash
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUvwxYZ
TELEGRAM_ALLOWED_USERS=123456789    # Comma-separated for multiple users
```

### ゲートウェイを起動する {#start-the-gateway}

```bash
hermes gateway
```

数秒でボットがオンラインになります。Telegram からメッセージを送って確かめてください。

## Docker のターミナルで作ったファイルを送る {#sending-generated-files-from-docker-backed-terminals}

ターミナルのバックエンドが `docker` の場合、Telegram の添付ファイルはコンテナの中からではなく
**ゲートウェイのプロセス**が送っている点に注意してください。つまり、最終的な `MEDIA:/...` の
パスは、ゲートウェイが動いているホスト側から読めなければなりません。

よくあるつまずき:

- エージェントが Docker の中で `/workspace/report.txt` にファイルを書く
- モデルが `MEDIA:/workspace/report.txt` を出力する
- `/workspace/report.txt` はコンテナの中にしか存在せずホストにはないため、Telegram への送信が
  失敗する

おすすめの形:

```yaml
terminal:
  backend: docker
  docker_volumes:
    - "/home/user/.hermes/cache/documents:/output"
```

そのうえで、

- Docker の中では `/output/...` にファイルを書く
- `MEDIA:` には**ホストから見える**パスを出す。たとえば
  `MEDIA:/home/user/.hermes/cache/documents/report.txt`

すでに `docker_volumes:` の項目がある場合は、同じ一覧に新しいマウントを追加してください。
YAML でキーが重複すると、あとのものが黙って前のものを上書きします。

### `MEDIA:` で使える拡張子 {#supported-media-file-extensions}

ゲートウェイはエージェントの返信から `MEDIA:/path/to/file` の印を取り出し、そのファイルをプラットフォーム本来の添付として送ります。すべてのゲートウェイのプラットフォームで対応している拡張子は次のとおりです。

| 種類 | 拡張子 |
|---|---|
| 画像 | `png`、`jpg`、`jpeg`、`gif`、`webp`、`bmp`、`tiff`、`svg` |
| 音声 | `mp3`、`wav`、`ogg`、`m4a`、`opus`、`flac`、`aac` |
| 動画 | `mp4`、`mov`、`webm`、`mkv`、`avi` |
| **文書** | `pdf`、`txt`、`md`、`csv`、`json`、`xml`、`html`、`yaml`、`yml`、`log` |
| **オフィス文書** | `docx`、`xlsx`、`pptx`、`odt`、`ods`、`odp` |
| **書庫** | `zip`、`rar`、`7z`、`tar`、`gz`、`bz2` |
| **書籍・パッケージ** | `epub`、`apk`、`ipa` |

この一覧にあるものは、対応しているプラットフォーム（Telegram、Discord、Signal、Slack、WhatsApp、Feishu、Matrix など）ではそのまま添付として届きます。対応していないプラットフォームでは、リンクかテキストでの案内になります。**太字**の種類はここ数回のリリースで追加されたものです。これまでモデルに `here is the file: /path/to/report.docx` と言わせていたなら、`MEDIA:/path/to/report.docx` に切り替えると添付として届きます。

## Webhook モード {#webhook-mode}

既定では、Hermes は**ロングポーリング**で Telegram に接続します。ゲートウェイのほうから Telegram のサーバーへ問い合わせて、新しい更新を取りに行く方式です。手元の環境や常時稼働の運用にはこれで十分です。

**クラウドへの配置**（Fly.io、Railway、Render など）では、**Webhook モード**のほうが費用を抑えられます。こうしたプラットフォームは、外から HTTP が届くと停止中のマシンを自動で起こせますが、外へ出る通信では起こせません。ポーリングは外へ出る通信なので、ポーリングするボットは眠れないのです。Webhook モードでは向きが逆になり、Telegram のほうからボットの HTTPS の URL へ更新が届くため、待機中は眠らせる運用ができます。

| | ポーリング（既定） | Webhook |
|---|---|---|
| 向き | ゲートウェイ → Telegram（外向き） | Telegram → ゲートウェイ（内向き） |
| 向いている用途 | 手元の環境、常時稼働のサーバー | 自動で起きるクラウドのプラットフォーム |
| 設定 | 追加の設定は不要 | `TELEGRAM_WEBHOOK_URL` を設定する |
| 待機中の費用 | マシンを動かし続ける必要がある | メッセージの合間はマシンを眠らせられる |

### 設定 {#configuration}

`~/.hermes/.env` に次を追加します。

```bash
TELEGRAM_WEBHOOK_URL=https://my-app.fly.dev/telegram
TELEGRAM_WEBHOOK_SECRET="$(openssl rand -hex 32)"  # required
# TELEGRAM_WEBHOOK_PORT=8443        # optional, default 8443
```

| 変数 | 必須 | 説明 |
|----------|----------|-------------|
| `TELEGRAM_WEBHOOK_URL` | はい | Telegram が更新を送る先の公開 HTTPS URL。URL のパスは自動で取り出されます（上の例なら `/telegram`）。 |
| `TELEGRAM_WEBHOOK_SECRET` | **はい**（`TELEGRAM_WEBHOOK_URL` を設定した場合） | 検証のために Telegram がすべての Webhook リクエストに載せて返す秘密トークン。これがないとゲートウェイは起動を拒みます。[GHSA-3vpc-7q5r-276h](https://github.com/NousResearch/hermes-agent/security/advisories/GHSA-3vpc-7q5r-276h) を参照してください。`openssl rand -hex 32` で作れます。 |
| `TELEGRAM_WEBHOOK_PORT` | いいえ | Webhook のサーバーが待ち受けるローカルのポート（既定: `8443`）。 |

`TELEGRAM_WEBHOOK_URL` が設定されていると、ゲートウェイはポーリングではなく HTTP の Webhook サーバーを起動します。設定していなければポーリングモードのままで、これまでの版から挙動は変わりません。

### クラウドへの配置の例（Fly.io） {#cloud-deployment-example-flyio}

1. Fly.io のアプリのシークレットに環境変数を追加します。

```bash
fly secrets set TELEGRAM_WEBHOOK_URL=https://my-app.fly.dev/telegram
fly secrets set TELEGRAM_WEBHOOK_SECRET=$(openssl rand -hex 32)
```

2. `fly.toml` で Webhook のポートを公開します。

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

ゲートウェイのログに `[telegram] Connected to Telegram (webhook mode)` と出れば成功です。

## プロキシへの対応 {#proxy-support}

Telegram の API が遮断されている場合や、プロキシ経由で通信したい場合は、Telegram 専用のプロキシ URL を設定します。これは一般的な `HTTPS_PROXY` / `HTTP_PROXY` の環境変数より優先されます。

**方法 1: config.yaml（おすすめ）**

```yaml
telegram:
  proxy_url: "socks5://127.0.0.1:1080"
```

**方法 2: 環境変数**

```bash
TELEGRAM_PROXY=socks5://127.0.0.1:1080
```

使えるスキーム: `http://`、`https://`、`socks5://`。

プロキシは Telegram への主な接続にも、代替 IP を使う通信路にも適用されます。Telegram 専用のプロキシを設定していない場合、ゲートウェイは `HTTPS_PROXY` / `HTTP_PROXY` / `ALL_PROXY`（または macOS のシステムプロキシの自動検出）を使います。

ホストの環境で代替 IP を探す経路がうまく動かないときは、`HERMES_TELEGRAM_DISABLE_FALLBACK_IPS=true` を設定すると、素の `api.telegram.org` への接続だけを使うようになります。DNS-over-HTTPS による代替 IP の探索には `HERMES_TELEGRAM_FALLBACK_DISCOVERY_TIMEOUT` で秒数の上限を設けられます。既定は `5` です。

## ホームチャンネル {#home-channel}

Telegram のどのチャット（DM でもグループでも）でも `/sethome` を使うと、そこを**ホームチャンネル**に指定できます。定期タスク（cron ジョブ）の結果はこのチャンネルに届きます。

`~/.hermes/.env` で手動で設定することもできます。

```bash
TELEGRAM_HOME_CHANNEL=-1001234567890
TELEGRAM_HOME_CHANNEL_NAME="My Notes"
```

:::tip
グループのチャット ID は負の数です（例: `-1001234567890`）。個人の DM のチャット ID は自分のユーザー ID と同じです。
:::

### トピックモードでの cron の配信 {#cron-deliveries-in-topic-mode}

ボットとの DM でトピックモードを有効にしている場合、ルートのチャットに届いた cron のメッセージはシステム専用のロビーに入ります。そこで返信してもセッションは始まらず、「main chat is reserved for system commands」という案内が出ます。専用のフォーラムトピック（たとえば `Cron`）を作り、次を設定してください。

```bash
TELEGRAM_CRON_THREAD_ID=<topic_thread_id>
```

`TELEGRAM_CRON_THREAD_ID` は cron の配信に限って `TELEGRAM_HOME_CHANNEL_THREAD_ID` より優先されます。そのトピックでの返信は、トピックの既存のセッションの続きになります。

## 音声メッセージ {#voice-messages}

### 受け取る音声（音声認識） {#incoming-voice-speech-to-text}

Telegram で送った音声メッセージは、Hermes に設定した音声認識のプロバイダーが自動で文字起こしし、テキストとして会話に差し込まれます。

- `local` は Hermes が動いている端末で `faster-whisper` を使います。API キーは不要です
- `groq` は Groq Whisper を使い、`GROQ_API_KEY` が必要です
- `openai` は OpenAI Whisper を使い、`VOICE_TOOLS_OPENAI_KEY` が必要です

#### 音声認識を飛ばして、音声ファイルをそのままエージェントに渡す {#skipping-stt-pass-the-raw-audio-file-to-the-agent}

話者の切り分け、独自の文字起こしツール、あるいは録音の保管のために、音声を**エージェント自身**に扱わせたい場合は、`~/.hermes/config.yaml` で `stt.enabled: false` を設定します。

```yaml
stt:
  enabled: false
```

音声認識を切っても、ゲートウェイは音声の添付を Hermes の音声キャッシュにダウンロードします。ただし**文字起こしはしません**。エージェントには次のような印の付いたメッセージが届きます。

```
[The user sent a voice message: /home/<user>/.hermes/cache/audio/<hash>.ogg]
```

自分のツールやスキルからそのパスを直接読めます（ローカルの話者分離の処理に渡す、より高精度な文字起こしモデルにかける、長期保管にアップロードする、など）。拡張子は Telegram が届けた元の形式を表します（ボイスメモなら `.ogg`、音声の添付なら `.mp3` や `.m4a` など）。

これは後述の [ローカルの Bot API サーバー](#large-files-20mb-via-local-bot-api-server) の節と相性がよく、Telegram の getFile の 20MB という上限を 2GB まで引き上げられます。数分を超える録音を扱いたいときに役立ちます。

### 送る音声（音声合成） {#outgoing-voice-text-to-speech}

エージェントが音声合成で音声を作ると、Telegram 本来の**ボイスメッセージ**（丸い形でその場で再生できるもの）として届きます。

- **OpenAI と ElevenLabs** はそのまま Opus を出力するので、追加の準備は要りません
- **Edge TTS**（既定の無料のプロバイダー）は MP3 を出力するため、Opus に変換する **ffmpeg** が必要です。

```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# macOS
brew install ffmpeg
```

ffmpeg がないと、Edge TTS の音声は通常の音声ファイルとして送られます（再生はできますが、ボイスメッセージではなく四角い再生プレイヤーになります）。

音声合成のプロバイダーは `config.yaml` の `tts.provider` で設定します。

## ローカルの Bot API サーバーで 20MB を超えるファイルを扱う {#large-files-20mb-via-local-bot-api-server}

Telegram の**公開**の Bot API は `getFile` によるダウンロードを **20 MB** までに制限しているため、それを超えるボイスメモ、音声ファイル、動画、文書は Hermes が「too large」と返して受け取れません。文書化された回避策は、**ローカル**に [telegram-bot-api](https://github.com/tdlib/telegram-bot-api) のデーモンを動かすことです。Telegram が使っているものと同じサーバーソフトウェアを、自分のネットワークで動かします。ローカルのサーバーにするとファイルの上限が **2 GB** になり、Hermes は独自の `base_url` の設定を見つけると自分の内部の上限も自動で引き上げます。

これで次のような使い方ができます。

- 長いボイスメモ（45 分の会議、ポッドキャスト）をボットに送る
- 画像認識のツールで処理するために大きな動画をアップロードする
- 話者分離、位置合わせ、学習データ作りといった後処理のために生の音声を保管する

### 手順 1: Telegram の API 認証情報を取得する {#step-1-obtain-telegram-api-credentials}

ローカルのサーバーは公開の Bot API ではなく Telegram の MTProto の層と直接やり取りするため、**MTProto の認証情報**が必要です。

1. [my.telegram.org/apps](https://my.telegram.org/apps) を開き、Telegram のアカウントでサインインします。
2. 新しいアプリケーションを作ります（名前と短い説明は何でも構いません）。
3. `api_id` と `api_hash` をコピーします。どちらも必要です。

### 手順 2: telegram-bot-api のサーバーを動かす {#step-2-run-the-telegram-bot-api-server}

コミュニティが保守している [`aiogram/telegram-bot-api`](https://hub.docker.com/r/aiogram/telegram-bot-api) の Docker イメージがいちばん手軽です。最小限の `docker-compose.yaml` は次のとおりです（上限を引き上げるには `--local` モードを使います）。

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
ローカルの Bot API サーバーは、URL のパスにボットのトークンを載せて受け取ります（例: `/bot<TOKEN>/getMe`）。**それ以外の認証はありません**。そのポートに届く人は誰でもボットを完全に操作でき、ボットが見られるメッセージをすべて読み、ボットとしてメッセージを送れてしまいます。コンテナは `127.0.0.1` に結び付けるか、プライベートなネットワークでリバースプロキシの内側に置いてください。**ポート 8081 を公開のインターネットに晒してはいけません。**
:::

### 手順 3: 公開 API からボットをログアウトさせる（一度だけ） {#step-3-log-the-bot-out-of-the-public-api-one-time}

1 つのボットが同時に動けるのは**ひとつ**の Bot API サーバーだけです。すでに `api.telegram.org` でボットを動かしていた場合（ほぼ確実にそうです）、ローカルのサーバーが受け付ける前に、そちらから明示的にログアウトさせる必要があります。

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/logOut"
# expected response: {"ok":true,"result":true}
```

これは移行のための一度きりの作業で、再起動のたびに繰り返す必要はありません。`logOut` のあとに届いたメッセージは、Telegram が新しいサーバーのほうへ配信します。

ローカルのサーバーがボットの代わりに Telegram と通信できるか確認します。

```bash
curl "http://127.0.0.1:8081/bot<YOUR_BOT_TOKEN>/getMe"
# expected response: {"ok":true,"result":{"id":...,"is_bot":true,...}}
```

### 手順 4: Hermes をローカルのサーバーに向ける {#step-4-point-hermes-at-the-local-server}

`~/.hermes/config.yaml` の `platforms.telegram.extra` の下に URL を追加します。

```yaml
platforms:
  telegram:
    extra:
      base_url: "http://127.0.0.1:8081/bot"
      base_file_url: "http://127.0.0.1:8081/file/bot"
      local_mode: true        # see Step 5 below — only set this if the bot's data
                              # directory is readable by the Hermes process
```

:::caution `telegram.extra` ではなく `platforms.telegram.extra` を使う
現時点でプラットフォームの設定に深く統合されるのは `platforms.<name>.extra` の形だけです。最上位の `telegram.extra` の下に直接書いたキーは黙って無視されます。
:::

`base_url` を設定すると、Hermes は次のように動きます。

- python-telegram-bot のクライアントをローカルのサーバー向けに組み立てる
- 文書・音声の内部の上限を 20 MB から 2 GB へ自動で引き上げる
- 「too large」のエラーメッセージに現在の上限（`Maximum: 2048 MB.`）を出して、どちらのモードなのかがわかるようにする

ゲートウェイを再起動して、確認のログ行を探してください。

```bash
hermes gateway restart
grep -E "Using custom Telegram base_url|Using Telegram local_mode" ~/.hermes/logs/gateway.log | tail
```

### 手順 5: `local_mode` — ディスク上のファイルへのアクセス {#step-5-localmode-file-access-on-disk}

ローカルのサーバーがファイルを渡す方法は**2 通り**あります。

1. **`--local` なし**（既定）: 公開の Bot API と同じく、`/file/bot<TOKEN>/<path>` から HTTP でファイルが配信されます。20MB の上限はそのままです。ネットワークの問題を回避する目的（`api.telegram.org` に届かないが自分でホストできる場合など）には使えますが、上限を上げたい用途には向きません。
2. **`--local` あり**（上の `TELEGRAM_LOCAL=1` で設定）: ファイルはサーバーのファイルシステムに書かれ、`getFile` の応答は HTTP の URL ではなく**絶対パス**を返します。20MB の上限はなくなります。この場合 Hermes は HTTP ではなく**ディスクから**中身を読む必要があります。

ディスクから読む経路を動かすには、上の設定で `local_mode: true` にしたうえで、**さらに** Hermes のプロセスがサーバーの返すパスを読めるようにします。2 つの状況があります。

- **同じ端末** — telegram-bot-api と Hermes が同じホストで動く場合。データのボリュームを Hermes が読めるディレクトリ（たとえば `/var/lib/telegram-bot-api`）にバインドマウントし、ファイルの所有者が合っていることを確認します。コンテナは内部の `telegram-bot-api` ユーザーへ権限を落とします（uid はイメージによって異なります）。いちばん簡単なのは、compose のサービスに `user: "<UID>:<GID>"` を足して、Hermes が動いている uid の所有にすることです。
- **別々の端末** — ボットのサーバーがあるホスト（NAS や別の VM など）で動き、Hermes は別のホストで動く場合。サーバーのデータディレクトリを、サーバーが報告するのと**同じ絶対パス**（通常は `/var/lib/telegram-bot-api`）で Hermes 側の端末と共有する必要があります。NFS がよく合います。ファイルシステムの層で uid のずれを扱いたくなければ、`uid=` でマウント時に読み替えられる CIFS/SMB のほうが楽です。

`local_mode: true` にしていても、Hermes が返ってきたファイルのパスを `stat` できない場合（権限の問題やマウント先の間違い）、python-telegram-bot は黙ってローカルのサーバーへの HTTP の `getFile` に切り替えます。`--local` モードのサーバーはこれに `404 Not Found` を返します。症状は `gateway.log` に次のように出ます。

```
[Telegram] Failed to cache voice: Not Found
telegram.error.InvalidToken: Not Found
```

これが出ているなら、上限の引き上げは効いていて、ファイルの共有ができていません。Hermes 側のホストでゲートウェイを動かしているユーザーとして `ls -la /var/lib/telegram-bot-api/<TOKEN>/voice/` を実行し、そこにあるファイルが権限エラーなく `cat` できるか確かめてください。

### 手順 6: 試す {#step-6-test-it}

20 MB より大きいボイスメモか音声ファイルをボットに送ります。ゲートウェイのログを流し見してください。

```bash
tail -f ~/.hermes/logs/gateway.log | grep -iE "telegram|cache"
```

`[Telegram] Cached user voice at /home/<user>/.hermes/cache/audio/...` の行が出て、「too large」の拒否が出**なければ**成功です。前述の `stt.enabled: false` と組み合わせると、元の音声ファイルのパスがエージェントへの受信メッセージに入り、後続の処理に回せます。

## グループチャットでの使い方 {#group-chat-usage}

Hermes Agent は Telegram のグループチャットでも動きますが、いくつか気をつける点があります。

- **プライバシーモード**がボットの見られるメッセージを決めます（[手順 3](#step-3-privacy-mode-critical-for-groups) を参照）
- `TELEGRAM_ALLOWED_USERS` はグループでも効きます。許可されたユーザーだけがボットを動かせます
- `telegram.require_mention: true` にすると、普段のグループの雑談にボットが反応しなくなります
- `telegram.require_mention: true` のとき、グループのメッセージが受け付けられるのは次の場合です。
  - ボットのメッセージへの返信
  - `@botusername` のメンション
  - `/command@botusername`（ボット名を含む、Telegram のボットメニューのコマンド形式）
  - `telegram.mention_patterns` に設定した正規表現の呼び出し語に合致したもの
- 複数の Hermes ボットがいるグループでは、`telegram.exclusive_bot_mentions` が振り分けを一意にします。メッセージが 1 つ以上の Telegram ボットのユーザー名を明示的にメンションしている場合、メンションされたボットのプロフィールだけが処理し、ほかの Hermes ボットは返信や呼び出し語による判定の前に無視します。これは既定で有効です。
- BotFather でボットの `@username` を変えると自動で反映されます。Hermes はゲートウェイを再起動しなくても、メンションの振り分けに新しいハンドルを使います。`bot` で終わらない収集型（Fragment）のユーザー名にも対応しています。
- `telegram.ignored_threads` を使うと、そのグループが自由な返信やメンションでの返信を許していても、特定の Telegram のフォーラムトピックでは Hermes を黙らせておけます
- `telegram.require_mention` を設定しない、または false のままにすると、Hermes は従来どおりグループで開かれた振る舞いをし、見えている普通のグループメッセージに返信します

### 1 つのグループに複数の Hermes ボットを置く {#multiple-hermes-bots-in-one-group}

同じ Telegram のグループで複数の Hermes プロファイルを動かす場合は、プロファイルごとに Telegram のボットのトークンを 1 つ作り、プロファイルごとにゲートウェイを 1 つ起動してください。同じボットのトークンを複数の稼働中のゲートウェイで使い回してはいけません。Telegram は同じトークンでの同時ポーリングを拒否します。

グループでのおすすめの設定:

```yaml
telegram:
  require_mention: true
  exclusive_bot_mentions: true
  mention_patterns: []
```

こうしておくと、`@research_bot @ops_bot summarize this` のようなグループのメッセージは `research_bot` と `ops_bot` だけが処理します。グループにいるほかの Hermes ボットは、そのメッセージが自分の過去のメッセージへの返信であっても、共通の呼び出し語に合致していても、黙ったままです。

`exclusive_bot_mentions: false` にするのは、明示的なメンションで返信や呼び出し語の判定を上書きしたくない、以前からのグループの場合だけにしてください。

複数のプロファイルを動かすには、プロファイルごとにゲートウェイのコマンドを実行します。たとえば次のとおりです。

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

数が決まっている小規模な構成なら、既定のプロファイルには `hermes gateway <action>` を、名前付きのプロファイルには `hermes -p <profile> gateway <action>` を呼ぶシェルのループやスクリプトを使ってください。1 つのプロセス単位のコマンドが、どのサービス管理の仕組みでも名前付きプロファイルすべてを操作してくれると考えるより確実です。

### うまくいかないとき: DM では動くのにグループでは動かない {#troubleshooting-works-in-dms-but-not-groups}

個人チャットでは返事をするのにグループでは黙っている場合は、次の関門を順番に
確認してください。

1. **Telegram が届けているか:** BotFather のプライバシーモードを切るか、ボットを
   管理者にするか、ボットを直接メンションします。Telegram がボットに届けていない
   グループのメッセージには、Hermes は返しようがありません。
2. **プライバシー設定を変えたら入れ直す:** BotFather のプライバシー設定を変えたら、
   ボットをグループから外して入れ直します。すでに参加している状態では、Telegram が
   以前の配信の挙動を保つことがあります。
3. **Hermes 側の許可:** 送信者が `TELEGRAM_ALLOWED_USERS` か
   `TELEGRAM_GROUP_ALLOWED_USERS` に載っているか、あるいは
   `TELEGRAM_GROUP_ALLOWED_CHATS` でそのグループを許可しているかを確認します。
4. **メンションの絞り込み:** `telegram.require_mention: true` を設定していると、
   スラッシュコマンド、ボットへの返信、`@botusername` のメンション、設定した
   `mention_patterns` への合致のいずれでもない普通の雑談は無視されます。
5. **複数ボットの振り分け:** グループに複数のボットがいる場合、Hermes の各
   プロファイルが別々のボットのトークンを使っているか確認し、意図して以前の
   共通の呼び出しの挙動にしたいのでなければ `exclusive_bot_mentions` は
   有効なままにします。

チャット ID が負の数なのは、Telegram のグループやスーパーグループでは普通のことです。
チャット単位の許可を使う場合は、それらの ID を送信者のユーザーの許可リストではなく
`TELEGRAM_GROUP_ALLOWED_CHATS` に入れてください。

### グループでの呼び出し設定の例 {#example-group-trigger-configuration}

`~/.hermes/config.yaml` に次を追加します。

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

この例では、いつもの直接の呼び出しに加えて、`@mention` を使っていなくても `chompy` で始まるメッセージが通ります。
Telegram のトピック `31` と `42` のメッセージは、メンションや自由な返信の判定より前に、常に無視されます。

### `mention_patterns` についての補足 {#notes-on-mentionpatterns}

- パターンには Python の正規表現を使います
- 大文字と小文字は区別しません
- パターンはテキストのメッセージにも、メディアのキャプションにも照合されます
- 正しくない正規表現はボットを落とさず、ゲートウェイのログに警告を出して無視されます
- メッセージの先頭だけに合わせたいときは、`^` で位置を固定してください

## 個人チャットのトピック（Bot API 9.4） {#private-chat-topics-bot-api-94}

Telegram Bot API 9.4（2026 年 2 月）で**個人チャットのトピック**が導入され、ボットが 1 対 1 の DM の中に直接フォーラム形式のトピックを作れるようになりました。スーパーグループは要りません。これにより、Hermes との既存の DM の中に、独立した作業場を複数持てます。

### 使いどころ {#use-case}

長く続くプロジェクトを複数抱えているなら、トピックごとに文脈を分けられます。

- **トピック「Website」** — 本番の Web サービスの作業
- **トピック「Research」** — 文献の調査と論文の探索
- **トピック「General」** — 雑多な作業や短い質問

各トピックは自分だけの会話セッション、履歴、文脈を持ち、ほかとは完全に切り離されています。

### 設定 {#configuration}

:::caution 前提
設定にトピックを書き加える前に、ボットとの DM で**トピックモードを有効にする**必要があります。

1. Telegram で Hermes のボットとの個人チャットを開きます
2. 上部のボットの名前をタップしてチャット情報を開きます
3. **Topics** を有効にします（チャットをフォーラムにする切り替えです）

これをしないと、Hermes は起動時に `The chat is not a forum` と記録してトピックの作成を飛ばします。これは Telegram のクライアント側の設定で、ボットからプログラムで有効にはできません。
:::

`~/.hermes/config.yaml` の `platforms.telegram.extra.dm_topics` の下にトピックを追加します。

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
| `icon_color` | いいえ | Telegram のアイコンの色コード（整数） |
| `icon_custom_emoji_id` | いいえ | トピックのアイコンに使うカスタム絵文字の ID |
| `skill` | いいえ | このトピックで新しいセッションが始まったときに自動で読み込むスキル |
| `thread_id` | いいえ | トピックの作成後に自動で書き込まれます。手動で設定しないでください |

### 仕組み {#how-it-works}

1. ゲートウェイの起動時に、Hermes はまだ `thread_id` を持たないトピックごとに `createForumTopic` を呼びます
2. `thread_id` は自動で `config.yaml` に書き戻され、次からの起動では API の呼び出しを飛ばします
3. 各トピックは独立したセッションのキー `agent:main:telegram:dm:{chat_id}:{thread_id}` に対応します
4. トピックごとのメッセージは、それぞれの会話履歴、記憶の書き出し、文脈の窓を持ちます

### ルートの DM の扱い {#root-dm-handling}

既定では、どのトピックにも属さないルートの DM に送ったメッセージは普通に処理されます。
`ignore_root_dm: true` にすると、ルートの DM をロビーに変えられます。DM のトピックを
設定しているユーザーからの通常のメッセージは黙って無視され、システムのコマンド
（`/start`、`/help`、`/status` など）は引き続き動きます。

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

この判定は**チャットごと**です。`dm_topics` に少なくとも 1 件の設定があるユーザーだけが
ルートの DM の影響を受けます。トピックを設定していないユーザーには影響しません。

### スキルの結び付け {#skill-binding}

`skill` の項目を持つトピックでは、そのトピックで新しいセッションが始まると自動的にそのスキルが読み込まれます。会話の最初に `/skill-name` と打つのとまったく同じ働きで、スキルの内容が最初のメッセージに差し込まれ、以降のメッセージからは会話履歴の中に見えます。

たとえば `skill: arxiv` を設定したトピックでは、（無操作でのリセット、毎日のリセット、手動の `/reset` などで）セッションが切り替わるたびに arxiv のスキルが読み込まれた状態になります。

:::tip
設定の外で作られたトピック（Telegram の API を手動で呼んだ場合など）も、`forum_topic_created` のサービスメッセージが届いた時点で自動的に見つかります。ゲートウェイを動かしたまま設定にトピックを足すこともでき、次にキャッシュが外れたときに読み込まれます。
:::

## DM の複数セッションモード（`/topic`） {#multi-session-dm-mode-topic}

ChatGPT のように、1 つのボットで複数の会話を並行して進める DM の使い方です。上で説明した運用者が用意する `extra.dm_topics` とは違い、こちらは**利用者が主導**します。設定も、あらかじめ決めたトピック名も要りません。利用者が `/topic` で有効にし、Telegram の **+** ボタンから好きなだけトピックを作れば、そのひとつひとつが完全に独立した Hermes のセッションになります。

### `/topic` のサブコマンド {#topic-subcommands}

| 書き方 | 場所 | 働き |
|------|---------|--------|
| `/topic` | ルートの DM、まだ有効でない | BotFather の設定を確認し、複数セッションモードを有効にして、ピン留めした System トピックを作る |
| `/topic` | ルートの DM、すでに有効 | 状態を表示する。復元できる未接続のセッションが見える |
| `/topic` | トピックの中 | いまのトピックがどのセッションに結び付いているかを表示する |
| `/topic help` | どこでも | その場で使い方を表示する |
| `/topic off` | ルートの DM | 複数セッションモードを無効にし、このチャットのトピックの結び付けをすべて消す |
| `/topic <session-id>` | トピックの中 | 過去の Telegram のセッションをいまのトピックに復元する |

`/topic` を実行できるのは許可されたユーザー（`TELEGRAM_ALLOWED_USERS` やプラットフォームの認証設定による許可リスト）だけです。許可されていない送信者には、有効化ではなく拒否が返ります。

### DM のトピックと DM の複数セッションモードの違い {#dm-topics-vs-multi-session-dm-mode}

| | `extra.dm_topics`（設定で決める） | `/topic`（利用者が決める） |
|---|---|---|
| 有効にする人 | 運用者が `config.yaml` で | 利用者が `/topic` を送って |
| トピックの一覧 | 設定で宣言した固定の集合 | 利用者が自由に作ったり消したりする |
| トピックの名前 | 運用者が決める | 利用者が決める。Hermes のセッションのタイトルに合わせて自動で改名される |
| ルートの DM の挙動 | 通常のチャット（`ignore_root_dm: true` ならロビー） | システム用のロビーになる（コマンド以外のメッセージは拒否される） |
| 主な用途 | スキルの結び付けもできる恒久的な作業場 | その場かぎりの並行セッション |
| 保存先 | 設定の `extra.dm_topics` | SQLite の `telegram_dm_topic_mode` と `telegram_dm_topic_bindings` のテーブル |

両方を同じボットで併用できます。あるユーザーの DM から `/topic` を使いつつ、`extra.dm_topics` はほかのチャットで運用者が宣言したトピックを管理し続けます。

### 前提 {#prerequisites}

**@BotFather** で自分のボットを開き、**Bot Settings → Threads Settings** に進みます。

1. **Threaded Mode** を有効にします（`has_topics_enabled` が立ちます）
2. 利用者によるトピックの作成を無効に**しない**でください（`allows_users_to_create_topics` を有効なままにします）

利用者が最初に `/topic` を実行すると、Hermes は `getMe` を呼んで両方のフラグを確認します。どちらかが切れていると、Hermes は BotFather の Threads Settings の画面のスクリーンショットを送り、何を切り替えればよいか説明します。前提が整うまで有効化は行われません。

### 有効にする流れ {#activation-flow}

ルートの DM から次を送ります。

```
/topic
```

Hermes は次のように動きます。

1. `getMe().has_topics_enabled` と `allows_users_to_create_topics` を確認する
2. 両方が真なら、この DM で複数セッションのトピックモードを有効にする
3. 状態やコマンド用の **System** トピックを作ってピン留めする（できる範囲で）
4. 復元できる、これまでの未接続の Telegram のセッションを一覧で返す

有効にしたあと、**ルートの DM はロビー**になります。通常のプロンプトは拒否され、**All Messages** を使うよう案内が出ます。システムのコマンド（`/status`、`/sessions`、`/usage`、`/help` など）はルートでも動きます。

### 新しいトピックを作る（利用者の操作） {#creating-a-new-topic-end-user-flow}

1. Telegram でボットとの DM を開きます
2. ボットの画面の上にある **All Messages** をタップし、何かメッセージを送ります
3. Telegram がそのメッセージのために新しいトピックを作ります
4. Hermes がそのトピックの中で応答します。これでそのトピックは独立したセッションです

トピックごとに、会話履歴、モデルの状態、ツールの実行、セッション ID が別々になります。切り分けのキーは `agent:main:telegram:dm:{chat_id}:{thread_id}` で、設定で決める DM のトピックの切り分けと同じです。

### トピックの自動改名 {#auto-renamed-topics}

最初のやり取りのあと、自動タイトル付けの処理で Hermes がトピックのセッションのタイトルを作ると、Telegram のトピック自体もそれに合わせて改名されます。たとえば「New Topic」が「Database migration plan」になります。改名はできる範囲での処理で、失敗しても記録されるだけでセッションは壊れません。

これをやめて、自分で付けたトピック名をそのままにしたい場合は、次を設定します。

```yaml
gateway:
  platforms:
    telegram:
      extra:
        disable_topic_auto_rename: true
```

このフラグを立てても、Hermes は内部のセッションのタイトル（`hermes sessions` や TUI などで使われます）を作り続けますが、Telegram のトピック名は書き換えません。BotFather の Threaded Mode でトピックを自分で整理していて、最初の返信のたびにタイトルを上書きされたくないときに便利です。

### トピックの中での `/new` {#new-inside-a-topic}

ほかのトピックに触れずに、いまのトピックのセッションをリセットします（新しいセッション ID、まっさらな履歴）。並行して作業したいなら（**All Messages** から）もう 1 つトピックを作るほうがたいてい適切だ、という案内も一緒に返ります。

### 過去のセッションを復元する {#restoring-a-previous-session}

トピックの中で次を送ります。

```
/topic <session-id>
```

新しく始める代わりに、いまのトピックを既存の Hermes のセッションに結び付けます。トピックモードを有効にする前に始めた会話を続けたいときに便利です。制限は次のとおりです。

- 対象のセッションが同じ Telegram のユーザーのものであること
- 対象のセッションが、ほかのトピックにまだ結び付いていないこと

Hermes はセッションのタイトルを添えて確認を返し、文脈のために直前のアシスタントのメッセージをもう一度表示します。

セッション ID を調べるには、ルートの DM で（引数なしの）`/topic` を送ります。そのユーザーの未接続の Telegram のセッションが一覧されます。

### トピックの中での `/topic`（引数なし） {#topic-inside-a-topic-no-argument}

いまのトピックの結び付け（セッションのタイトル、セッション ID）と、`/new` と別のトピックを作ることの使い分けのヒントを表示します。

### 内部の作り {#under-the-hood}

- 有効化の状態は `state.db` の `telegram_dm_topic_mode(chat_id, user_id, enabled, ...)` に保存されます
- トピックごとの結び付けは `telegram_dm_topic_bindings(chat_id, thread_id, session_id, ...)` に保存され、`session_id` に `ON DELETE CASCADE` が付いています。セッションを整理すると、そのトピックの結び付けも自動で消えます
- トピックモードの SQLite の移行は**必要になってから**行われます。最初に `/topic` を呼んだときだけ走り、ゲートウェイの起動時には走りません。そのプロファイルで誰も `/topic` を使わないかぎり、`state.db` は変わりません
- 届いた DM のメッセージごとに `(chat_id, thread_id)` の結び付けが引かれます。あれば `SessionStore.switch_session()` を通じて結び付いたセッションへ振り分けられ、セッションのキーとセッション ID の対応がディスク上で食い違わないようにします
- トピックの中での `/new` は結び付けの行を新しいセッション ID に書き換えるので、次のメッセージは新しいセッションのまま進みます
- `extra.dm_topics` で宣言したトピックは**自動改名されません**。複数セッションモードが有効でも、運用者が付けた名前が保たれます
- `extra.disable_topic_auto_rename: true` にすると、そのチャットの**すべての**トピック（Threaded Mode でその場で作ったものも含む）で自動改名が止まります
- フォーラムを有効にした DM の General（先頭にピン留めされた）トピックは、Telegram が `message_thread_id=1` で届けても thread_id なしで届けても、ルートのロビーとして扱われます
- ルートのロビーでの案内はチャットごとに 30 秒に 1 通までです。トピックモードが有効なことを忘れてルートで 10 回入力しても、10 回返ってくることはありません
- BotFather の設定のスクリーンショットはチャットごとに 5 分に 1 回までです。Threads Settings を無効にしたまま `/topic` を繰り返しても、同じ画像が何度も送られることはありません
- トピックの中で始めた `/bg <prompt>` は同じトピックに結果を返します。バックグラウンドのセッションが、そのトピックの自動改名を引き起こすことはありません
- `/topic` 自体もボットの利用者の認証の判定を通ります。許可されていない DM には、有効化ではなく拒否が返ります

### 複数セッションモードをやめる {#disabling-multi-session-mode}

ルートの DM で `/topic off` を送ります。Hermes は該当の行を無効にし、そのチャットの `(thread_id → session_id)` の結び付けを消し、ルートの DM は普通の Hermes のチャットに戻ります。Telegram にあるトピックが消えるわけではなく、独立したセッションとしての扱いがなくなるだけです。あとで `/topic` をもう一度実行すれば、また有効になります。

手作業で片付けたい場合（多くのチャットをまとめて戻すときなど）は、行を直接消してください。

```bash
sqlite3 ~/.hermes/state.db \
  "UPDATE telegram_dm_topic_mode SET enabled = 0 WHERE chat_id = '<your_chat_id>'; \
   DELETE FROM telegram_dm_topic_bindings WHERE chat_id = '<your_chat_id>';"
```

### Hermes を古い版に戻す場合 {#downgrading-hermes}

`/topic` より前の Hermes に戻すと、この機能はただ動かなくなります。`telegram_dm_topic_mode` と `telegram_dm_topic_bindings` のテーブルは `state.db` に残りますが、古いコードからは無視されます。DM はスレッドごとの本来の切り分けに戻り（`build_session_key` によって `message_thread_id` ごとに独自のセッションが割り当てられます）、いまある Telegram のトピックは並行するセッションとしてそのまま使えます。ルートの DM はロビーではなくなり、そこに送ったメッセージは以前どおりエージェントに渡ります。もう一度新しい版に上げれば、複数セッションモードは元の状態のまま復活します。

## グループのフォーラムトピックへのスキルの結び付け {#group-forum-topic-skill-binding}

**トピックモード**（「フォーラムトピック」とも呼ばれます）を有効にしたスーパーグループでは、トピックごとのセッションの切り分けはすでに働いており、`thread_id` ごとに別々の会話になります。それに加えて、DM のトピックでのスキルの結び付けと同じように、特定のグループのトピックにメッセージが来たら**スキルを自動で読み込みたい**こともあります。

### 使いどころ {#use-case}

作業の流れごとにフォーラムトピックを分けたチームのスーパーグループ:

- **Engineering** のトピック → `software-development` のスキルを自動で読み込む
- **Research** のトピック → `arxiv` のスキルを自動で読み込む
- **General** のトピック → スキルなし、汎用のアシスタント

### 設定 {#configuration}

`~/.hermes/config.yaml` の `platforms.telegram.extra.group_topics` の下にトピックの結び付けを追加します。

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
| `chat_id` | はい | スーパーグループの数値の ID（`-100` で始まる負の数） |
| `name` | いいえ | トピックにつける読みやすい名前（情報として書くだけ） |
| `thread_id` | はい | Telegram のフォーラムトピックの ID。`t.me/c/<group_id>/<thread_id>` のリンクで確認できます |
| `skill` | いいえ | このトピックで新しいセッションが始まったときに自動で読み込むスキル |

### 仕組み {#how-it-works}

1. 対応づけたグループのトピックにメッセージが届くと、Hermes は `group_topics` の設定から `chat_id` と `thread_id` を探します
2. 一致した項目に `skill` があれば、そのスキルがセッションに自動で読み込まれます。DM のトピックでのスキルの結び付けと同じ動きです
3. `skill` を書いていないトピックはセッションの切り分けだけになります（従来どおりで変わりません）
4. 対応づけのない `thread_id` や `chat_id` は黙って素通りします。エラーも出ず、スキルも読み込まれません

### DM のトピックとの違い {#differences-from-dm-topics}

| | DM のトピック | グループのトピック |
|---|---|---|
| 設定のキー | `extra.dm_topics` | `extra.group_topics` |
| トピックの作成 | `thread_id` がなければ Hermes が API で作る | 管理者が Telegram の画面で作る |
| `thread_id` | 作成後に自動で書き込まれる | 手動で設定する必要がある |
| `icon_color` / `icon_custom_emoji_id` | 対応している | 該当しない（見た目は管理者が決める） |
| スキルの結び付け | ✓ | ✓ |
| セッションの切り分け | ✓ | ✓（フォーラムトピックには元から備わっている） |

:::tip
トピックの `thread_id` を調べるには、Telegram の Web 版かデスクトップ版でそのトピックを開き、URL を見てください。`https://t.me/c/1234567890/5` なら、最後の数字（`5`）が `thread_id` です。スーパーグループの `chat_id` は、グループの ID の先頭に `-100` を付けたものです（グループ `1234567890` なら `-1001234567890`）。
:::

## 最近の Bot API の機能 {#recent-bot-api-features}

- **Bot API 9.4（2026 年 2 月）:** 個人チャットのトピック。ボットが `createForumTopic` で 1 対 1 の DM にフォーラムトピックを作れます。Hermes はこれを 2 つの機能に使っています。運用者が用意する [個人チャットのトピック](#private-chat-topics-bot-api-94)（設定で決める、固定のトピック一覧）と、利用者が主導する [DM の複数セッションモード](#multi-session-dm-mode-topic)（`/topic` で有効にし、利用者が好きなだけトピックを作れる）です。
- **プライバシーポリシー:** Telegram はボットにプライバシーポリシーを求めるようになりました。BotFather の `/setprivacy_policy` で設定してください。設定しないと Telegram が仮のものを自動生成することがあります。一般に公開するボットではとくに重要です。
- **Bot API 9.5（2026 年 3 月）: `sendMessageDraft` によるネイティブのストリーミング。** Hermes は Telegram 本来のストリーミング用の下書き API に、個人チャット向けの任意の通信方式として対応しています。既定は従来の `editMessageText` を使う経路のままです。クライアントによっては、下書きのプレビューが目に見えて崩れて描き直されることがあるためです。

### ストリーミングの通信方式（`gateway.streaming.transport`） {#streaming-transport-gatewaystreamingtransport}

ストリーミングを有効にすると（`gateway.streaming.enabled: true`）、Hermes は 4 つの方式のどれかを選びます。

| 値 | 挙動 |
|---|---|
| `auto`（既定） | 対応しているチャット（現時点では Telegram の DM）では下書きによるネイティブのストリーミング、それ以外では従来の編集による経路。下書きの更新に失敗しても穏やかに切り替わります。 |
| `draft` | 下書きを強制します。チャットが下書きに対応していない場合（グループやトピックなど）は、降格を記録して編集による経路に切り替えます。 |
| `edit` | すべてのチャットで、従来の `editMessageText` による段階的な更新を使います。 |
| `off` | ストリーミングを完全に止めます（最終的な返信だけで、途中の更新はありません）。 |

`~/.hermes/config.yaml` では次のように書きます。

```yaml
gateway:
  streaming:
    enabled: true
    transport: auto    # auto | draft | edit | off
```

**DM で `edit`（既定）のときに見えるもの** — ゲートウェイは通常のプレビューのメッセージを送り、それを `editMessageText` で少しずつ書き換えます。Telegram の下書きプレビューが崩れて戻る現象を避けられます。

**DM で `auto` または `draft` のときに見えるもの** — Telegram がトークンごとに更新されるアニメーションつきの下書きプレビューを表示します。返信が終わると通常のメッセージとして届き、下書きのプレビューはクライアント側で自然に消えます。下書きにはメッセージ ID がないので、チャットの履歴に残るのは最終的な答えです。

**グループ、スーパーグループ、フォーラムトピックでは?** Telegram は `sendMessageDraft` を個人チャット（DM）に限定しています。それ以外ではゲートウェイが自動的に編集による経路へ切り替えます。使い勝手は従来どおりです。

**下書きの更新が失敗したら?** 何らかの失敗（一時的なネットワークのエラー、サーバー側の拒否、古い python-telegram-bot）があると、その応答は残りの間ずっと編集による経路に切り替わります。次の応答ではあらためて下書きが試されます。

## 表示: リッチメッセージ、表、リンクプレビュー {#rendering-rich-messages-tables-and-link-previews}

**リッチメッセージ（Bot API 10.1）。** 従来の MarkdownV2 の経路では崩れてしまう要素（表、チェックリスト、折りたためる `<details>`、ブロック数式）を含む最終的な返信は、エージェントの**素のマークダウン**のまま Telegram 本来の [`sendRichMessage`](https://core.telegram.org/bots/api#sendrichmessage) で送られ、クライアント側で潰されることなくそのまま表示されます。DM では既定の `rich_drafts: false` によってストリーミングのプレビューは素のままです。Telegram の一時的な下書きの経路を従来の描画で使うため、表などリッチでしか表現できない要素はプレビューでは素のマークダウンのまま残り、完成した応答は `sendRichMessage` で保存されます。`rich_drafts: true` にすると、その場のプレビューも `sendRichMessageDraft` を使います。編集によるストリーミングでは、`editMessageText` の `rich_message` 引数を使って既存のプレビューをその場で仕上げられます。通常の返信（普通の文章、太字や斜体、単純な箇条書き）は、クライアント間で文字の太さや余白をそろえるために MarkdownV2 の経路のままです。

内容がリッチテキストの上限である 32,768 文字を超えると、リッチの経路は自動的に飛ばされます。Telegram からの拒否（古い `python-telegram-bot` で未対応のエンドポイント、解析のエラー、大きすぎるブロックや列）があった場合も**そのまま** MarkdownV2 の経路に切り替わるため、メッセージが失われることはありません。一時的な障害やネットワークのエラーでは、黙って送り直すことは*しません*（最終メッセージが二重にならないようにするためです）。

**MarkdownV2 での代替。** リッチの経路が使えないメッセージでは、Hermes がマークダウンを MarkdownV2 に変換します。MarkdownV2 には表の記法がないため、パイプで書いた表は次のように整えられます。

- **小さい表**は**行ごとの箇条書き**に展開されます。各行が、列見出しの下に読みやすい箇条書きとして並びます。2〜4 列で、セルが短い表に向いています。
- **大きい表や横に広い表**は、列をそろえた**コードブロック**として表示され、崩れないようにします。

リッチメッセージは**任意で有効にするもの**です。既定は従来の MarkdownV2 の経路のままです。今の Telegram のクライアントでは、Bot API のリッチメッセージをプレーンテキストとしてコピーしづらいことがあり、コマンドの断片やスマートフォンとの受け渡しでとくに困るからです。表、チェックリスト、details、数式をそのまま表示させたい場合は次のようにします。

```yaml
gateway:
  platforms:
    telegram:
      extra:
        rich_messages: true
        rich_drafts: false
```

この設定はクライアントでの表示とコピーのしやすさのためのものです。Telegram がリッチな API の呼び出しを拒否した場合、Hermes はすでに自動で切り替えます。`rich_drafts` は DM のストリーミングのプレビューをリッチで*表示する*か（`sendRichMessageDraft`）を決めるもので、既定では無効です。Telegram のデスクトップ版や macOS 版では、チャットが描き直されるまでリッチな下書きが重なって見えることがあるためです。無効なら、プレビューは素のまま流れ、最終的な返信はネイティブのリッチメッセージとして届きます。リッチメッセージは有効にしたまま、表については従来の「常にコードブロック」の挙動にしたい場合は、`config.yaml` で `telegram.pretty_tables: false` を設定して表の整形を切ってください（既定は `true`）。

**リンクプレビュー。** Telegram はボットのメッセージにある URL のプレビューを自動で作ります。それを出したくない場合（長い `/tools` の出力や、10 個のリンクを含むエージェントの返信など）は次のようにします。

```yaml
gateway:
  platforms:
    telegram:
      extra:
        disable_link_previews: true
```

有効にすると、Hermes は送信するすべてのメッセージに Telegram の `LinkPreviewOptions(is_disabled=True)` を付け、古い `python-telegram-bot` では従来の `disable_web_page_preview` の引数に切り替えます。

## グループの許可リスト {#group-allowlisting}

Telegram のグループとフォーラムのチャットには、独立した 2 つの関門を設定できます。

- **送信者のユーザー ID**（`group_allow_from` / `TELEGRAM_GROUP_ALLOWED_USERS`） — グループやフォーラムのメッセージにだけ効く、送信者ごとの許可リストです。`TELEGRAM_ALLOWED_USERS` に加えると DM も使えるようになってしまうので、それを避けつつ特定の人にグループでボットを呼ばせたいときに使います。
- **チャット ID**（`group_allowed_chats` / `TELEGRAM_GROUP_ALLOWED_CHATS`） — チャットごとの許可リストです。そのグループやフォーラムのメンバーなら誰でもボットとやり取りできます。グループに入っていること自体が権限になる、チーム用やサポート用のボットに向いています。

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

挙動:

- `TELEGRAM_ALLOWED_USERS` はすべてのチャットの種類（DM、グループ、フォーラム）に効きます。
- `TELEGRAM_GROUP_ALLOWED_USERS` は、載せた送信者をグループとフォーラムでだけ許可します。`TELEGRAM_ALLOWED_USERS` に載っていなければ、ボットに DM は送れません。
- `TELEGRAM_GROUP_ALLOWED_CHATS` に載せたチャットでは、送信者に関わらずそのチャットの全員が許可されます。
- どれも `*` を書けば、すべての送信者やチャットを許可できます。
- これは既存のメンションやパターンによる呼び出し、`group_topics` と `ignored_threads` の上に重なって働きます。

### PR #17686 より前からの移行 {#migration-from-before-pr-17686}

この分離より前は `TELEGRAM_GROUP_ALLOWED_USERS` だけが設定項目で、そこに**チャット ID** を書く使い方をしていました。互換性のため、`TELEGRAM_GROUP_ALLOWED_USERS` に入っているチャット ID の形をした値（`-` で始まるもの）は今もチャット ID として扱われ、非推奨の警告が一度だけ記録されます。移行は次のとおりです。

```bash
# Old (still works, but deprecated)
TELEGRAM_GROUP_ALLOWED_USERS="-1001234567890"

# New
TELEGRAM_GROUP_ALLOWED_CHATS="-1001234567890"
```

### ゲストの @メンションによる例外（`guest_mode`） {#guest-mention-bypass-guestmode}

通常の構成では `group_allowed_chats` は固い関門で、一覧にないグループからのメッセージは、メンバーがボットを明示的に @メンションしても黙って捨てられます。サポート用やチーム用のボットには、これが正しい既定です。

もっとくだけた使い方 — 友人どうしのグループチャットで、ボットには**普段は黙っていてほしい**けれど**名指しされたときだけ答えてほしい**場合 — には `guest_mode` を有効にします。

```yaml
gateway:
  platforms:
    telegram:
      extra:
        group_allowed_chats:
          - "-1001234567890"   # your main allowlisted group
        guest_mode: true       # non-allowlisted groups: allow on @mention only
```

環境変数では次のとおりです。

```bash
TELEGRAM_GUEST_MODE=true
```

既定は `false` です。

`guest_mode: true` にすると、許可リストにないグループからのメッセージは、ボットを明示的に @メンションしている場合に**だけ**処理されます。メンションは毎回必要で、ゲストとしてのやり取りにセッションの粘りはありません。呼ばれていない友人グループの会話に、ボットが勝手に入ってくることはありません。

DM と許可リストにあるグループの挙動は、これまでどおりです。

## スラッシュコマンドの権限管理 {#slash-command-access-control}

既定では、許可されたユーザーは全員がすべてのスラッシュコマンドを実行できます。許可リストを**管理者**（スラッシュコマンドをすべて使える）と**通常のユーザー**（明示的に許可したコマンドだけ）に分けるには、そのプラットフォームの `extra` に `allow_admin_from` と `user_allowed_commands` を追加します。

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

- ある範囲（DM かグループか）で `allow_admin_from` に載っているユーザーは、稼働中の登録簿を通じて、登録済みのスラッシュコマンドを**すべて**実行できます。組み込みのコマンドも、プラグインが登録したコマンドもです。
- `allow_from` には載っているが `allow_admin_from` に**載っていない**ユーザーは、`user_allowed_commands` に書いたコマンドと、常に許可される `/help`・`/whoami` だけを実行できます。
- 普通の会話（スラッシュでないメッセージ）には影響しません。管理者でないユーザーも、これまでどおりエージェントと話せます。任意のコマンドを実行できないだけです。
- **以前の設定との互換性:** ある範囲で `allow_admin_from` を設定していなければ、その範囲ではスラッシュコマンドの制限が無効になります。既存の環境は何も変えずにそのまま動きます。
- DM の管理者だからといってグループの管理者になるわけではありません。範囲ごとに別々の管理者リストがあります。
- `group_allow_admin_from` だけを設定した場合、DM の範囲は制限なし（従来どおり）のままです。

`/whoami` を使うと、現在の範囲、自分の段階（admin / user / unrestricted）、実行できるスラッシュコマンドがわかります。

## 対話式のモデル選択 {#interactive-model-picker}

Telegram のチャットで引数なしの `/model` を送ると、Hermes はモデルを切り替えるためのインラインキーボードを表示します。

1. **プロバイダーの選択** — 利用できるプロバイダーとモデル数のボタンが並びます（例: 「OpenAI (15)」、現在のプロバイダーには「✓ Anthropic (12)」）。
2. **モデルの選択** — **Prev**／**Next** でめくれるモデルの一覧に、プロバイダーへ戻る **Back** と **Cancel** が付きます。

現在のモデルとプロバイダーは上部に表示されます。移動はすべて同じメッセージをその場で書き換えて行われるので、チャットが散らかりません。

:::tip
モデル名がわかっているなら、`/model <name>` と直接打てば選択画面を飛ばせます。`/model <name> --global` と打つと、変更をセッションをまたいで残せます。
:::

## DNS-over-HTTPS による代替 IP {#dns-over-https-fallback-ips}

制限のあるネットワークでは、`api.telegram.org` がつながらない IP に解決されることがあります。Telegram のアダプターには**代替 IP** の仕組みがあり、正しい TLS のホスト名と SNI を保ったまま、別の IP へ静かに接続をやり直します。

### 仕組み {#how-it-works}

1. `TELEGRAM_FALLBACK_IPS` が設定されていれば、その IP をそのまま使います。
2. 設定がなければ、アダプターは **Google DNS** と **Cloudflare DNS** に DNS-over-HTTPS（DoH）で問い合わせ、`api.telegram.org` の別の IP を自動で探します。
3. 既知の IPv4 の Telegram API の IP を、デュアルスタックの `api.telegram.org` というホスト名より**先に**試します。IPv6 の経路が握り潰されていると `connect()` がエラーも返さずに止まることがあり、以前はそれでイベントループが固まり、30 秒の初期化の期限が働きませんでした。
4. DoH も遮断されているか時間切れになった場合は、そのまま IPv4 を優先する一覧として、埋め込みの IPv4 の初期値（`149.154.166.110`、`149.154.167.220`）を使います。ホスト名は最後の手段のままです。
5. 一度つながった経路は「くっついた」状態になり、以降はそこへ直接つなぎます。ホスト名は IPv6 だけのネットワークのための最後の手段として残します。

### 設定 {#configuration}

```bash
# Explicit fallback IPs (comma-separated)
TELEGRAM_FALLBACK_IPS=149.154.167.220,149.154.167.221
```

`~/.hermes/config.yaml` では次のとおりです。

```yaml
platforms:
  telegram:
    extra:
      fallback_ips:
        - "149.154.167.220"
```

:::tip
たいていは手で設定する必要はありません。DoH による自動探索で、制限のあるネットワークのほとんどに対応できます。`TELEGRAM_FALLBACK_IPS` の環境変数が要るのは、DoH まで遮断されている場合だけです。ホストで IPv6 が壊れている場合は、`config.yaml` で `network.force_ipv4: true` を設定して、プロセス全体で AAAA の問い合わせを飛ばすこともできます。
:::

## プロキシへの対応 {#proxy-support}

インターネットに出るのに HTTP のプロキシが必要なネットワーク（企業ではよくあります）では、Telegram のアダプターが標準的なプロキシの環境変数を自動で読み、すべての接続をプロキシ経由にします。

### 対応する変数 {#supported-variables}

アダプターは次の環境変数を順に見て、最初に設定されているものを使います。

1. `HTTPS_PROXY`
2. `HTTP_PROXY`
3. `ALL_PROXY`
4. `https_proxy` / `http_proxy` / `all_proxy`（小文字の別名）

### 設定 {#configuration}

ゲートウェイを起動する前に、環境にプロキシを設定します。

```bash
export HTTPS_PROXY=http://proxy.example.com:8080
hermes gateway
```

あるいは `~/.hermes/.env` に書きます。

```bash
HTTPS_PROXY=http://proxy.example.com:8080
```

プロキシは主な通信路にも、代替 IP を使うすべての通信路にも適用されます。Hermes 側の追加の設定は要りません。環境変数が設定されていれば自動で使われます。

:::note
ここで説明しているのは、Hermes が Telegram への接続に使う独自の代替の通信層です。ほかの場所で使っている標準の `httpx` のクライアントは、もともとプロキシの環境変数に従います。
:::

## メッセージへのリアクション {#message-reactions}

ボットは、処理の状況を目で追えるように、メッセージへ絵文字のリアクションを付けられます。

- 👀 メッセージの処理を始めたとき
- ✅ 応答が無事に届いたとき
- ❌ 処理の途中でエラーが起きたとき

リアクションは**既定では無効**です。`config.yaml` で有効にします。

```yaml
telegram:
  reactions: true
```

環境変数でも設定できます。

```bash
TELEGRAM_REACTIONS=true
```

:::note
リアクションが積み重なる Discord とは違い、Telegram の Bot API は 1 回の呼び出しでボットのリアクションをすべて置き換えます。👀 から ✅／❌ への切り替わりは一度に起こるので、両方が同時に見えることはありません。
:::

:::tip
グループでリアクションを付ける権限がボットにない場合、リアクションの呼び出しは黙って失敗し、メッセージの処理はそのまま続きます。
:::

## チャンネルごとのプロンプト {#per-channel-prompts}

特定の Telegram のグループやフォーラムトピックに、一時的なシステムプロンプトを割り当てられます。プロンプトはターンごとに実行時に差し込まれ、会話の記録には残らないので、変更はすぐに反映されます。

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

キーはチャット ID（グループやスーパーグループ）またはフォーラムトピックの ID です。フォーラムのグループでは、トピック単位のプロンプトがグループ単位のプロンプトより優先されます。

- グループ `-1001234567890` の中のトピック `42` のメッセージ → トピック `42` のプロンプトを使う
- トピック `99`（明示的な設定なし）のメッセージ → グループ `-1001234567890` のプロンプトに戻る
- 設定のないグループのメッセージ → チャンネルのプロンプトは適用されない

YAML の数値のキーは自動的に文字列に直されます。

## うまくいかないとき {#troubleshooting}

| 症状 | 対処 |
|---------|----------|
| ボットがまったく反応しない | `TELEGRAM_BOT_TOKEN` が正しいか確認します。`hermes gateway` のログにエラーが出ていないか見てください。 |
| ボットが「unauthorized」と返す | ユーザー ID が `TELEGRAM_ALLOWED_USERS` に入っていません。@userinfobot でもう一度確認してください。 |
| ボットがグループのメッセージを無視する | プライバシーモードが有効な可能性が高いです。無効にする（手順 3）か、ボットをグループの管理者にしてください。**プライバシー設定を変えたら、ボットを外して入れ直すのを忘れずに。** |
| 音声メッセージが文字起こしされない | 音声認識が使える状態か確認します。ローカルで文字起こしするなら `faster-whisper` を入れるか、`~/.hermes/.env` に `GROQ_API_KEY` / `VOICE_TOOLS_OPENAI_KEY` を設定してください。 |
| 音声の返信がボイスメッセージでなくファイルになる | `ffmpeg` を入れてください（Edge TTS の Opus への変換に必要です）。 |
| ボットのトークンが無効になった | BotFather で `/revoke` のあと `/newbot` か `/token` で新しいトークンを作り、`.env` を更新してください。 |
| Webhook に更新が届かない | `TELEGRAM_WEBHOOK_URL` が外から届くか確認します（`curl` で試せます）。プラットフォームやリバースプロキシが、その URL のポートに来た HTTPS の通信を `TELEGRAM_WEBHOOK_PORT` で指定したローカルの待ち受けポートへ渡すようにしてください（同じ番号である必要はありません）。SSL/TLS が有効なことも確認します。Telegram は HTTPS の URL にしか送りません。ファイアウォールの設定も見てください。 |

## コマンド実行の承認 {#exec-approval}

エージェントが危険になりうるコマンドを実行しようとすると、チャットで承認を求めてきます。

> ⚠️ このコマンドは危険な可能性があります（再帰的な削除）。承認するには「yes」と返信してください。

承認するなら「yes」か「y」、拒否するなら「no」か「n」と返します。

## 対話的な問いかけ（clarify） {#interactive-prompts-clarify}

どの方針がよいかをたずねる、作業後の感想を集める、判断の前に確認する、といった目的でエージェントが `clarify` ツールを呼ぶと、Telegram では質問が**インラインキーボードのボタン**として表示されます。

> ❓ ダッシュボードにはどのフレームワークを使いましょうか?
>
> [1. Next.js] [2. Remix] [3. Astro]
> [✏️ その他（入力する）]

ボタンをタップして答えるか、**その他**をタップして自由に入力します（次に送ったメッセージが答えになります）。選択肢のない自由回答の `clarify` では、ボタンは出ず、次のメッセージがそのまま答えになります。

回答の待ち時間は `~/.hermes/config.yaml` の `agent.clarify_timeout` で設定します（既定は `600` 秒）。時間内に答えないと、エージェントは待ち続けるのではなく、代わりの合図を受けて先へ進みます。

## プッシュ通知の量 {#push-notification-volume}

Telegram は、ボットが送るメッセージのたびにプッシュ通知を出します。ツールの進捗、ストリーミングの更新、状況の知らせが出る長いターンでは、これがすぐにうるさくなります。Telegram のアダプターには 2 つの通知モードがあります。

| モード | 挙動 |
|------|----------|
| `important`（既定） | **最終的な応答**、**承認の問いかけ**、**スラッシュコマンドの確認**だけが鳴ります。ツールの進捗、ストリーミングの断片、状況のメッセージは `disable_notification=true` で送られます。 |
| `all` | 送信するすべてのメッセージがプッシュ通知を出します。従来の挙動で、ツールの呼び出しをすべて知りたい場合に選びます。 |

`~/.hermes/config.yaml` で設定します。

```yaml
display:
  platforms:
    telegram:
      notifications: important   # or "all"
```

環境変数での上書きもできます（手早く比べたいときに便利です）。

```bash
HERMES_TELEGRAM_NOTIFICATIONS=all
```

知らない値を書いた場合は警告を記録し、`important` として扱います。

## 状況メッセージはその場で書き換える {#status-messages-edited-in-place}

Telegram のアダプターは、繰り返し出るエージェントの状況の知らせ（「Compressing context…」「Calling tool…」など）を `send_or_update_status()` に通します。この関数は `{(chat_id, status_key) → message_id}` のキャッシュを持ち、次に同じものを出すときは新しいメッセージを足すのではなく**既存の吹き出しを書き換えます**。`status_key` が違えば別々のメッセージになり、別のチャットどうしがぶつかることもありません。書き換えに失敗した場合（ユーザーがメッセージを消した、Telegram が編集を許す期限を過ぎた、など）はキャッシュの項目を捨て、次に出すときに新しいメッセージを送って ID を取り直します。設定は不要で、これが Telegram での既定の挙動です。`send_or_update_status` を持たないほかのアダプターは、これまでどおり素の `send()` に流れます。

## エージェントの処理中に受け取ったメッセージをピン留めする {#pin-incoming-user-message-during-agent-turn}

ユーザーのメッセージがエージェントのターンを始めると、Telegram のアダプターはそのターンの間そのメッセージをピン留めし、応答が終わると外します。無視されているのではなく作業中なのだと目で分かる、軽い合図です。ピン留めには `disable_notification=true` を使うので、余計な通知は出ません。設定は不要です。

## セキュリティ {#security}

:::warning
ボットとやり取りできる相手を絞るために、必ず `TELEGRAM_ALLOWED_USERS` を設定してください。設定がない場合、ゲートウェイは安全のため既定ですべてのユーザーを拒否します。
:::

ボットのトークンを人目に触れる場所に置かないでください。漏れた場合は、BotFather の `/revoke` ですぐに無効化します。

詳しくは [セキュリティの解説](/hermes/docs/user-guide/security/) をご覧ください。ユーザーの認証をもっと柔軟に扱いたい場合は、[DM でのペアリング](/hermes/docs/user-guide/messaging/#dm-pairing-alternative-to-allowlists) も使えます。
