---
title: "Telegram"
description: "Hermes Agent を Telegram のボットとして設定する"
upstream_path: user-guide/messaging/telegram.md
upstream_blob: 68a6e35f8c2dd41c36da24b93d3f331eccef7bbd
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/telegram
---

# Telegram の設定 {#telegram-setup}

Hermes Agent は、Telegram の会話ボットとしてひととおりの機能を備えた形で連携します。つないでしまえば、どの端末からでもエージェントと話せますし、送った音声メモは自動で文字起こしされ、決まった時刻の作業の結果を受け取ったり、グループのトークでエージェントを使ったりもできます。この連携は [python-telegram-bot](https://python-telegram-bot.org/) の上に作られており、テキスト・音声・画像・添付ファイルに対応します。

## 手早い設定（ダッシュボードとデスクトップアプリ） {#quick-setup-dashboard-and-desktop-app}

[ダッシュボード](/hermes/docs/user-guide/features/web-dashboard/)と[デスクトップアプリ](/hermes/docs/user-guide/desktop/)の **Messaging → Telegram** のページには、**Create with QR** のボタンがあります。表示されたコードを Telegram で読み取る（またはリンクを開く）と、Hermes がボットを作り、Telegram のユーザー ID を見つけ、`TELEGRAM_BOT_TOKEN` と `TELEGRAM_ALLOWED_USERS` をプロファイルの `.env` に書き込み、ゲートウェイを再起動します。ボットを自分で作りたい場合は、下の手作業の手順に従ってください。

## 手順 1: BotFather でボットを作る {#step-1-create-a-bot-via-botfather}

Telegram のボットには、Telegram 公式のボット管理ツールである [@BotFather](https://t.me/BotFather) が発行する API トークンが必ず要ります。

1. Telegram を開いて **@BotFather** を検索するか、[t.me/BotFather](https://t.me/BotFather) を開きます
2. `/newbot` を送ります
3. **表示名**を決めます（たとえば "Hermes Agent"）。これは何でも構いません
4. **ユーザー名**を決めます。ほかと重ならず、末尾が `bot` である必要があります（たとえば `my_hermes_bot`）
5. BotFather が **API トークン**を返します。次のような文字列です。

```
123456789:ABCdefGHIjklMNOpqrSTUvwxYZ
```

:::warning
ボットのトークンは人に見せないでください。これを持っている人は誰でもボットを操作できます。漏れたときは、BotFather で `/revoke` を使ってすぐ無効にします。
:::

## 手順 2: ボットの見た目を整える（任意） {#step-2-customize-your-bot-optional}

次の BotFather のコマンドを使うと、使う人にとって分かりやすくなります。@BotFather に話しかけて実行します。

| コマンド | 用途 |
|---------|---------|
| `/setdescription` | 会話を始める前に表示される「このボットは何ができるか」の説明文 |
| `/setabouttext` | ボットのプロフィール欄に出る短い文 |
| `/setuserpic` | ボットのアイコン画像をアップロードします |
| `/setcommands` | コマンドのメニュー（トーク画面の `/` ボタン）を決めます |
| `/setprivacy` | ボットがグループのすべてのメッセージを見られるかを切り替えます（手順 3 を参照） |

:::tip
`/setcommands` の出発点として使いやすい組み合わせです。

```
help - Show help information
new - Start a new conversation
sethome - Set this chat as the home channel
```
:::

### オンライン・オフラインの表示（任意） {#onlineoffline-status-indicator-optional}

Telegram のボットには、本当の意味でのオンライン・オフラインを示す点はありません。あの緑の点は
*ユーザーアカウント*の機能で、Bot API がボット向けに出しているものではありません。いちばん近いのが
ボットの**短い説明文**（プロフィールで名前の下に出る 1 行）です。

`status_indicator` を有効にすると、Hermes はゲートウェイの接続時にその短い説明文を **Online** に、
正常に終了したときに **Offline** に書き換えます。

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

覚えておくことです。

- 短い説明文はボットに対して**ひとつ**（全員に見えます）で、トークごとに分かれてはいません。
  利用者が目にするのはボットのプロフィールの画面であって、開いているトークの中に出る
  ラベルではありません。
- "Offline" が書き込まれるのは、ゲートウェイが**正常に**終了したとき（`/stop`、`disconnect`）だけです。
  異常終了すると、最後の表示が残ります。プロフィールの文で状態を示す以上、避けられない限界です。
- ボットのプロフィールを書き換えるため、既定では無効です。

### コマンドメニューの優先順と上限（任意） {#command-menu-priority-and-cap-optional}

Hermes は、Telegram のゲートウェイが起動するときにコマンドのメニューを自動で登録します。メニューは、中心にあるスラッシュコマンドの一覧に、条件を満たしたプラグインやスキルのコマンドを足して組み立てられ、Telegram が確実に受け取れるよう上限をかけられます。既定の上限は 60 件で、組み込みのコマンド全部とよく使うスキルのコマンドが収まる程度です。

Telegram の `/` の選択肢に必ず出したいスキル・プラグイン・組み込みのコマンドがある場合は、`~/.hermes/config.yaml` で優先順を指定します。

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

`priority_mode` は、自分の指定と Hermes の組み込みの優先順をどう組み合わせるかを決めます。

- `prepend`: 自分のコマンドを先に置き、そのあとに Hermes の既定を並べます
- `append`: Hermes の既定を先に置き、そのあとに自分のコマンドを並べます
- `replace`: 優先順の指定に自分の一覧だけを使います

優先順は、上限をかける前の**まとまった**候補の一覧（中心のコマンド・プラグインのコマンド・スキルのコマンド）に対して適用されます。そのため、優先すると決めたスキルのコマンドは、中心のコマンドだけでメニューが埋まるような場合でも必ず場所を得られます。以前はスキルが常に先に、しかもアルファベット順で切られていたため、後ろのほうの名前のスキルは `priority` に関係なく出てこられませんでした。

Telegram は BotCommand を 100 件まで受け付けますが、大きすぎると失敗することがあります。Hermes は確実さを優先して既定を 60 とし、設定された値も `1..100` に収めます。コマンドの全一覧は `/commands` で見られます。

### インラインの選択画面: すべてのコマンドを検索する（上限なし） {#inline-command-picker-search-every-command-no-cap}

`/` のメニューには上限がありますが、Telegram の**インラインモード**にはありません。有効にすると、どのトークでも `@yourbotname` に続けて検索語を打つだけで、Hermes の**すべての**コマンドと導入済みのスキルを、その場で絞り込める一覧が出ます。結果は 1 文字打つごとに計算され、ページ送りできるので、何も切り落とされません。

```
@yourbotname plan            → tap the /plan result to send it
@yourbotname plan migrate auth to OIDC   → sends /plan migrate auth to OIDC
@yourbotname pdf             → finds skills matching "pdf" by name or description
```

最初の単語で候補を絞り込み、そのあとに続けた文字列はそのままコマンドの引数として送られます。結果を選ぶと、自分から送る普通のメッセージとしてそのコマンドが送信されるので、通常のコマンドの経路で処理されます（コマンドで始まるメッセージは、プライバシーモードが有効でもボットに届きます）。

**最初に一度だけ必要な設定:** インラインモードは、どの Telegram のボットでも既定では無効です。[@BotFather](https://t.me/BotFather) で `/setinline` を使って有効にします（対象のボットを選び、案内文は好きな文字列で構いません。たとえば `Search commands and skills...`）。それまで Telegram はインラインの問い合わせを届けず、選択画面は動きません。

結果が返るのは、ゲートウェイの許可リストを通った利用者に対してだけです。許可されていない相手には空の一覧が返るので、導入済みのスキルの一覧が知らない人に見えることはありません（インラインの問い合わせは、ボットがいないトークからでも送れます）。

## 手順 3: プライバシーモード（グループでは重要） {#step-3-privacy-mode-critical-for-groups}

Telegram のボットには**プライバシーモード**があり、**既定で有効**です。グループでボットを使うとき、いちばん混乱の元になるのがこれです。

**プライバシーモードが有効なとき**、ボットに見えるのは次のものだけです。
- `/` で始まるコマンドのメッセージ
- ボット自身のメッセージへの直接の返信
- 参加・退出やピン留めなどの通知メッセージ
- ボットが管理者になっているチャンネルのメッセージ

**プライバシーモードが無効なとき**、ボットはグループのすべてのメッセージを受け取ります。

### プライバシーモードを無効にする手順 {#how-to-disable-privacy-mode}

1. **@BotFather** に話しかけます
2. `/mybots` を送ります
3. 対象のボットを選びます
4. **Bot Settings → Group Privacy → Turn off** と進みます

:::warning
プライバシーの設定を変えたあとは、**そのボットをグループからいったん外して、入れ直す必要があります**。Telegram はボットがグループに入った時点のプライバシーの状態を覚えており、外して入れ直すまで更新されません。
:::

:::tip
プライバシーモードを無効にする代わりの手があります。ボットを**グループの管理者**にすることです。管理者のボットはプライバシーの設定にかかわらず常にすべてのメッセージを受け取るので、全体のプライバシーモードを切り替えずに済みます。
:::

### 自動で返さずにグループの流れを見る {#observe-group-chatter-without-auto-replying}

OpenClaw や元宝のようなグループでの振る舞いにしたい場合は、ボットが普通のグループのメッセージを**見られる**一方で、直接呼ばれたときだけ**返す**ように設定します。

```yaml
telegram:
  allowed_chats:
    - "-1001234567890"
  group_allowed_chats:
    - "-1001234567890"
  require_mention: true
  observe_unmentioned_group_messages: true
```

この設定にすると、明示的に許可したトークやトピックでメンションなしに流れたグループのメッセージは、見えている文脈として共有のトークやトピックのセッションの記録に足されますが、エージェントは動きません。`allowed_chats` はボットがどこで応答するかを決め、`group_allowed_chats` は見えている文脈を保つ共有のグループのセッションを許可します。そのため、このモードでは同じトークの ID を両方に書きます。同じ許可済みのトークやトピックで、あとから `@botname` のメンション、ボットへの返信、または設定したメンションのパターンが来ると、そこまでの見えている文脈を使えます。呼び出したメッセージには `[nickname|user_id]` の印が付き、そのやり取りごとに安全のための指示が添えられるので、モデルは前の観測した行を、ボットへの指示ではなく文脈として扱います。

環境変数で書く場合は次のとおりです。

```bash
TELEGRAM_ALLOWED_CHATS=-1001234567890
TELEGRAM_GROUP_ALLOWED_CHATS=-1001234567890
TELEGRAM_OBSERVE_UNMENTIONED_GROUP_MESSAGES=true
```

これには、Telegram が普通のグループのメッセージをゲートウェイへ届けてくれる必要があります。前述のとおり BotFather のプライバシーモードを無効にするか、ボットをグループの管理者にしてください。

## 手順 4: 自分のユーザー ID を調べる {#step-4-find-your-user-id}

Hermes Agent は、誰が使えるかを Telegram の数字のユーザー ID で制御します。ユーザー ID はユーザー名では**なく**、`123456789` のような数字です。

**方法 1（おすすめ）:** [@userinfobot](https://t.me/userinfobot) に話しかけると、すぐにユーザー ID が返ってきます。

**方法 2:** [@get_id_bot](https://t.me/get_id_bot) に話しかけます。こちらも確実です。

この数字は次の手順で使うので、控えておいてください。

## 手順 5: Hermes を設定する {#step-5-configure-hermes}

### 方法 A: 対話形式で設定する（おすすめ） {#option-a-interactive-setup-recommended}

```bash
hermes gateway setup
```

聞かれたら **Telegram** を選びます。ボットのトークンと許可するユーザー ID を尋ねられ、そのまま設定が書き込まれます。

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

ターミナルのバックエンドが `docker` の場合、Telegram への添付を送るのはコンテナの中ではなく
**ゲートウェイのプロセス**だという点に注意してください。つまり、最終的な `MEDIA:/...` の
パスは、ゲートウェイが動いているホスト側から読める必要があります。

よくある落とし穴です。

- エージェントが Docker の中の `/workspace/report.txt` にファイルを書く
- モデルが `MEDIA:/workspace/report.txt` と出力する
- `/workspace/report.txt` はコンテナの中にしかなくホストには無いので、Telegram への送信が失敗する

おすすめの形です。

```yaml
terminal:
  backend: docker
  docker_volumes:
    - "/home/user/.hermes/cache/documents:/output"
```

そのうえで、

- Docker の中では `/output/...` にファイルを書く
- `MEDIA:` には**ホストから見える**パスを出す。たとえば
  `MEDIA:/home/user/.hermes/cache/documents/report.txt` のように書きます

すでに `docker_volumes:` の節がある場合は、新しいマウントを同じ一覧に足してください。
YAML はキーが重複すると、前のほうを黙って上書きします。

### `MEDIA:` で使えるファイルの拡張子 {#supported-media-file-extensions}

ゲートウェイはエージェントの返信から `MEDIA:/path/to/file` の印を取り出し、そのファイルをそのプラットフォーム本来の添付として送ります。ゲートウェイのどのプラットフォームでも使える拡張子です。

| 種類 | 拡張子 |
|---|---|
| 画像 | `png`, `jpg`, `jpeg`, `gif`, `webp`, `bmp`, `tiff`, `svg` |
| 音声 | `mp3`, `wav`, `ogg`, `m4a`, `opus`, `flac`, `aac` |
| 動画 | `mp4`, `mov`, `webm`, `mkv`, `avi` |
| **文書** | `pdf`, `txt`, `md`, `csv`, `json`, `xml`, `html`, `yaml`, `yml`, `log` |
| **オフィス文書** | `docx`, `xlsx`, `pptx`, `odt`, `ods`, `odp` |
| **書庫** | `zip`, `rar`, `7z`, `tar`, `gz`, `bz2` |
| **電子書籍・パッケージ** | `epub`, `apk`, `ipa` |

この一覧にあるものは、対応するプラットフォーム（Telegram・Discord・Signal・Slack・WhatsApp・Feishu・Matrix など）ではそのまま本来の添付として届きます。対応していないプラットフォームでは、リンクか文字での案内に切り替わります。**太字**の種類はここ数回の更新で足されたものです。モデルに `here is the file: /path/to/report.docx` と言わせていた場合は、`MEDIA:/path/to/report.docx` に切り替えると本来の添付として届きます。

## webhook モード {#webhook-mode}

既定では、Hermes は**ロングポーリング**で Telegram につながります。ゲートウェイのほうから Telegram のサーバーへ問い合わせて、新しい更新を取りに行く方式です。手元で動かす場合や、常に起動している環境ではこれで十分です。

**クラウドで動かす場合**（Fly.io・Railway・Render など）は、**webhook モード**のほうが費用を抑えられます。これらのサービスは、外から HTTP が届いたときに休止中の機械を起こせますが、こちらから外へつなぐ通信では起きません。ポーリングは外向きなので、ポーリングのボットは眠れません。webhook モードは向きを逆にします。Telegram のほうからボットの HTTPS の URL へ更新が押し込まれるので、暇なときは眠る構成にできます。

| | ポーリング（既定） | webhook |
|---|---|---|
| 向き | ゲートウェイ → Telegram（外向き） | Telegram → ゲートウェイ（内向き） |
| 向いている場面 | 手元や、常に起動しているサーバー | 自動で起きるクラウドのサービス |
| 設定 | 追加の設定は不要 | `TELEGRAM_WEBHOOK_URL` を設定します |
| 待機中の費用 | 機械を動かし続ける必要があります | メッセージの合間は眠らせられます |

### 設定 {#configuration}

`~/.hermes/.env` に次を足します。

```bash
TELEGRAM_WEBHOOK_URL=https://my-app.fly.dev/telegram
TELEGRAM_WEBHOOK_SECRET="$(openssl rand -hex 32)"  # required
# TELEGRAM_WEBHOOK_PORT=8443        # optional, default 8443
```

| 変数 | 必須 | 説明 |
|----------|----------|-------------|
| `TELEGRAM_WEBHOOK_URL` | はい | Telegram が更新を送ってくる公開 HTTPS の URL。パスの部分は自動で取り出されます（上の例なら `/telegram`）。 |
| `TELEGRAM_WEBHOOK_SECRET` | **はい**（`TELEGRAM_WEBHOOK_URL` を設定した場合） | Telegram が webhook のたびに送り返してくる、確認用の秘密のトークン。これが無いとゲートウェイは起動しません。[GHSA-3vpc-7q5r-276h](https://github.com/NousResearch/hermes-agent/security/advisories/GHSA-3vpc-7q5r-276h) を参照してください。`openssl rand -hex 32` で作れます。 |
| `TELEGRAM_WEBHOOK_PORT` | いいえ | webhook のサーバーが手元で待ち受けるポート（既定は `8443`）。 |

`TELEGRAM_WEBHOOK_URL` が設定されていると、ゲートウェイはポーリングではなく HTTP の webhook サーバーを立ち上げます。設定していなければポーリングのままで、これまでの版と動きは変わりません。

### クラウドでの設定例（Fly.io） {#cloud-deployment-example-flyio}

1. 環境変数を Fly.io アプリの secrets に足します。

```bash
fly secrets set TELEGRAM_WEBHOOK_URL=https://my-app.fly.dev/telegram
fly secrets set TELEGRAM_WEBHOOK_SECRET=$(openssl rand -hex 32)
```

2. `fly.toml` で webhook のポートを外へ出します。

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

ゲートウェイのログに `[telegram] Connected to Telegram (webhook mode)` と出るはずです。

## プロキシへの対応 {#proxy-support}

Telegram の API がふさがれている場合や、プロキシ経由で通したい場合は、Telegram 専用のプロキシの URL を設定します。これは一般的な `HTTPS_PROXY` / `HTTP_PROXY` の環境変数より優先されます。

**方法 1: config.yaml（おすすめ）**

```yaml
telegram:
  proxy_url: "socks5://127.0.0.1:1080"
```

**方法 2: 環境変数**

```bash
TELEGRAM_PROXY=socks5://127.0.0.1:1080
```

使えるのは `http://`、`https://`、`socks5://` です。

プロキシは Telegram への主な接続にも、予備の IP を使う接続にも適用されます。Telegram 専用のプロキシを設定していない場合は、`HTTPS_PROXY` / `HTTP_PROXY` / `ALL_PROXY`（または macOS のシステムのプロキシの自動検出）に切り替わります。

予備の IP を見つける経路が自分の機械でうまく働かない場合は、`HERMES_TELEGRAM_DISABLE_FALLBACK_IPS=true` を設定して、素の `api.telegram.org` の経路で接続するようにできます。DNS-over-HTTPS による予備の探索にかける時間は `HERMES_TELEGRAM_FALLBACK_DISCOVERY_TIMEOUT` に秒で指定できます。既定は `5` です。

## ホームチャンネル {#home-channel}

Telegram のどのトーク（DM でもグループでも）でも `/sethome` と入力すると、そこが**ホームチャンネル**になります。決まった時刻の作業（cron ジョブ）の結果はここに届きます。

`~/.hermes/.env` で手で設定することもできます。

```bash
TELEGRAM_HOME_CHANNEL=-1001234567890
TELEGRAM_HOME_CHANNEL_NAME="My Notes"
```

:::tip
グループのトークの ID は負の数です（たとえば `-1001234567890`）。自分との DM のトークの ID は、自分のユーザー ID と同じです。
:::

### トピックモードでの cron の配信 {#cron-deliveries-in-topic-mode}

ボットとの DM でトピックモードを有効にしていると、大元のトークへ届いた cron のメッセージはシステム用の待合室に落ちます。そこで返信してもセッションは始まらず、「main chat is reserved for system commands」という案内が出ます。専用のフォーラムのトピック（たとえば `Cron`）を作り、次を設定してください。

```bash
TELEGRAM_CRON_THREAD_ID=<topic_thread_id>
```

`TELEGRAM_CRON_THREAD_ID` は、cron の配信に限って `TELEGRAM_HOME_CHANNEL_THREAD_ID` より優先されます。そのトピックでの返信は、トピックの既存のセッションの続きになります。

## 音声メッセージ {#voice-messages}

### 受信した音声（音声から文字へ） {#incoming-voice-speech-to-text}

Telegram で送った音声メッセージは、Hermes に設定された音声認識の提供元によって自動で文字起こしされ、テキストとして会話に差し込まれます。

- `local` は Hermes が動いている機械で `faster-whisper` を使います。API キーは要りません
- `groq` は Groq の Whisper を使い、`GROQ_API_KEY` が要ります
- `openai` は OpenAI の Whisper を使い、`VOICE_TOOLS_OPENAI_KEY` が要ります

#### 文字起こしをせず、音声ファイルのままエージェントに渡す {#skipping-stt-pass-the-raw-audio-file-to-the-agent}

話者の切り分けをしたい、独自の文字起こしのツールを使いたい、あるいは録音をそのまま残しておきたいなど、**エージェント自身**に音声を扱わせたい場合は、`~/.hermes/config.yaml` で `stt.enabled: false` にします。

```yaml
stt:
  enabled: false
```

音声認識を止めても、ゲートウェイは音声の添付を Hermes の音声の一時保存先へ落とします。ただし**文字起こしはしません**。エージェントには次のような印の付いたメッセージが届きます。

```
[The user sent a voice message: /home/<user>/.hermes/cache/audio/<hash>.ogg]
```

自分のツールやスキルから、そのパスを直接読めます（手元の話者切り分けの処理に渡す、より精度の高い文字起こしのモデルにかける、長期の保管先へ送る、といった具合です）。拡張子は Telegram が届けた元の形式のままです（音声メモは `.ogg`、音声の添付は `.mp3` や `.m4a` など）。

これは後述の[手元の Bot API サーバー](#large-files-20mb-via-local-bot-api-server)の節と相性がよく、そちらでは Telegram の getFile の 20MB の上限が 2GB まで上がります。数分を超える録音を扱いたいときに効いてきます。

### 送信する音声（文字から音声へ） {#outgoing-voice-text-to-speech}

エージェントが読み上げで音声を作ると、Telegram 本来の**音声メッセージの吹き出し**として届きます。丸い形で、その場で再生できるあれです。

- **OpenAI と ElevenLabs** はそのまま Opus を作るので、追加の準備は要りません
- **Edge TTS**（無料で使える既定の提供元）は MP3 を出すので、Opus に変換するために **ffmpeg** が要ります。

```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# macOS
brew install ffmpeg
```

ffmpeg が無い場合、Edge TTS の音声は普通の音声ファイルとして送られます（再生はできますが、音声メッセージの吹き出しではなく四角い再生欄になります）。

読み上げの提供元は `config.yaml` の `tts.provider` で指定します。

## 手元の Bot API サーバーで大きなファイル（20MB 超）を扱う {#large-files-20mb-via-local-bot-api-server}

Telegram の**公開**の Bot API は `getFile` によるダウンロードを **20 MB** までに制限しています。そのため、これを超える音声メモ・音声ファイル・動画・文書は、Hermes から「大きすぎます」と返されて終わります。公式に案内されている回避策は、**手元で** [telegram-bot-api](https://github.com/tdlib/telegram-bot-api) を動かすことです。Telegram が使っているのと同じサーバーのソフトウェアを、自分のネットワークで動かします。手元のサーバーならファイルの上限は **2 GB** になり、Hermes は独自の `base_url` が設定されているのを見つけると、自分の内部の上限も自動で引き上げます。

これで次のような使い方ができるようになります。

- 長い音声メモ（45 分の会議、ポッドキャスト）をボットに送る
- 大きな動画をアップロードして、画像認識のツールで処理する
- 話者の切り分け・音声の位置合わせ・学習データ作りなど、あとで回す処理のために音声をそのまま残す

### 手順 1: Telegram の API の資格情報を取る {#step-1-obtain-telegram-api-credentials}

手元のサーバーは、公開の Bot API ではなく Telegram の MTProto の層と直接やり取りします。そのため **MTProto の資格情報**が要ります。

1. [my.telegram.org/apps](https://my.telegram.org/apps) を開き、自分の Telegram のアカウントでログインします。
2. 新しいアプリケーションを作ります（名前と短い説明は何でも構いません）。
3. `api_id` と `api_hash` をコピーします。どちらも要ります。

### 手順 2: telegram-bot-api のサーバーを動かす {#step-2-run-the-telegram-bot-api-server}

有志が保守している [`aiogram/telegram-bot-api`](https://hub.docker.com/r/aiogram/telegram-bot-api) の Docker イメージがいちばん簡単です。最小限の `docker-compose.yaml` は次のようになります（上限を上げるには `--local` モードにします）。

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

:::warning 安全のために
手元の Bot API サーバーは、ボットのトークンを URL のパスに入れて受け取ります（たとえば `/bot<TOKEN>/getMe`）。**それ以外の認証はありません**。そのポートに届く人は誰でもボットを丸ごと操作でき、見えるメッセージをすべて読み、ボットとして発言できます。コンテナは `127.0.0.1` に結び付けるか、私設のネットワークでリバースプロキシの後ろに置いてください。**ポート 8081 を公開のインターネットへ出してはいけません。**
:::

### 手順 3: 公開 API からボットをログアウトさせる（一度だけ） {#step-3-log-the-bot-out-of-the-public-api-one-time}

ボットが同時に活動できる Bot API のサーバーは**ひとつ**だけです。すでに `api.telegram.org` に対して動いていたなら（ほぼ間違いなくそうです）、手元のサーバーが受け入れる前に、はっきりログアウトさせる必要があります。

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/logOut"
# expected response: {"ok":true,"result":true}
```

これは移行のときの一度きりの操作で、再起動のたびに繰り返す必要はありません。`logOut` のあとに届いたメッセージは、Telegram が新しいサーバーのほうへ渡してくれます。

手元のサーバーが、ボットの代理として Telegram と話せるか確かめます。

```bash
curl "http://127.0.0.1:8081/bot<YOUR_BOT_TOKEN>/getMe"
# expected response: {"ok":true,"result":{"id":...,"is_bot":true,...}}
```

### 手順 4: Hermes を手元のサーバーへ向ける {#step-4-point-hermes-at-the-local-server}

`~/.hermes/config.yaml` の `platforms.telegram.extra` に URL を足します。

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
いまのところ、プラットフォームの設定に深く混ぜ合わされるのは `platforms.<name>.extra` の形だけです。一番上の階層の `telegram.extra` の下に直接書いたキーは、黙って捨てられます。
:::

`base_url` を設定すると、Hermes は次のように動きます。

- python-telegram-bot のクライアントを手元のサーバー向けに組み立てます
- 内部で持っている文書と音声の上限を 20 MB から 2 GB へ自動で引き上げます
- 「大きすぎます」というエラーの文言に、いま効いている上限（`Maximum: 2048 MB.`）を出すので、どちらのモードで動いているか一目で分かります

ゲートウェイを再起動して、確認のログの行を探します。

```bash
hermes gateway restart
grep -E "Using custom Telegram base_url|Using Telegram local_mode" ~/.hermes/logs/gateway.log | tail
```

### 手順 5: `local_mode` — ディスク上のファイルに触る {#step-5-localmode-file-access-on-disk}

手元のサーバーがファイルを渡す方法は**ふたつ**あります。

1. **`--local` なし**（既定）: 公開の Bot API と同じく、ファイルは `/file/bot<TOKEN>/<path>` の HTTP で配られます。20MB の上限はそのままです。ネットワークの回避策としてだけ役に立ちます（たとえば `api.telegram.org` に届かないけれど自前で立てられる場合）。上限を上げたい目的には向きません。
2. **`--local` あり**（前述の `TELEGRAM_LOCAL=1` で設定します）: ファイルはサーバーのファイルシステムに書き出され、`getFile` の応答は HTTP の URL ではなく**絶対パス**を返します。20MB の上限は外れます。この場合、Hermes は HTTP ではなく**ディスクから**中身を読む必要があります。

ディスクから読む経路を働かせるには、上の設定で `local_mode: true` にし、**さらに** Hermes のプロセスがサーバーの返すパスを読めるようにします。場合分けは 2 つです。

- **同じ機械の場合** — telegram-bot-api と Hermes が同じホストで動いています。データの領域を Hermes が読めるディレクトリ（たとえば `/var/lib/telegram-bot-api`）にバインドマウントし、ファイルの所有者が合っているか確かめます。コンテナは内部の `telegram-bot-api` ユーザーへ権限を落とします（uid はイメージによって違います）。いちばん簡単なのは、compose のサービスに `user: "<UID>:<GID>"` を足して、Hermes が動いている uid の持ち物としてファイルが作られるようにすることです。
- **別の機械の場合** — ボットのサーバーが 1 台（NAS や別の仮想機械など）で、Hermes は別の 1 台で動いています。サーバーのデータのディレクトリを、サーバーが返すのと**同じ絶対パス**（たいていは `/var/lib/telegram-bot-api`）で Hermes 側の機械と共有する必要があります。NFS がよく合います。ファイルシステムの層で uid の食い違いに悩みたくなければ、`uid=` でマウント時に読み替えられる CIFS/SMB のほうが扱いやすいです。

`local_mode: true` にしているのに Hermes が返されたパスを `stat` できない場合（権限か、マウントの間違いです）、python-telegram-bot は黙って手元のサーバーへの HTTP の `getFile` に切り替えます。`--local` モードのサーバーは、これに `404 Not Found` を返します。`gateway.log` には次のように現れます。

```
[Telegram] Failed to cache voice: Not Found
telegram.error.InvalidToken: Not Found
```

これが出ているなら、上限の引き上げは効いていて、ファイルの共有ができていない状態です。Hermes 側のホストで、ゲートウェイを動かしているユーザーとして `ls -la /var/lib/telegram-bot-api/<TOKEN>/voice/` を実行し、ファイルを 1 つ `cat` してもエラーにならないことを確かめてください。

### 手順 6: 試す {#step-6-test-it}

20 MB より大きい音声メモか音声ファイルをボットに送ります。ゲートウェイのログを流し見します。

```bash
tail -f ~/.hermes/logs/gateway.log | grep -iE "telegram|cache"
```

`[Telegram] Cached user voice at /home/<user>/.hermes/cache/audio/...` の行が出て、「大きすぎます」の拒否が**出ない**はずです。前述の `stt.enabled: false` と組み合わせれば、元の音声ファイルのパスがエージェントへの受信メッセージに載り、そのあとの処理に回せます。

## グループのトークで使う {#group-chat-usage}

Hermes Agent は Telegram のグループのトークでも動きます。いくつか押さえておくことがあります。

- **プライバシーモード**が、ボットに見えるメッセージを決めます（[手順 3](#step-3-privacy-mode-critical-for-groups) を参照）
- `TELEGRAM_ALLOWED_USERS` はグループでも効きます。許可された利用者だけがボットを動かせます
- 普通のグループの雑談に反応させたくなければ `telegram.require_mention: true` を使います
- `telegram.require_mention: true` のとき、グループのメッセージが受け付けられるのは次の場合です。
  - ボットのメッセージへの返信
  - `@botusername` のメンション
  - `/command@botusername`（ボット名を含む、Telegram のボットのメニューのコマンドの形）
  - `telegram.mention_patterns` に設定した正規表現の呼びかけ語に一致した場合
- 同じグループに複数の Hermes のボットがいる場合、`telegram.exclusive_bot_mentions` が振り分けを迷いなく決めます。メッセージが Telegram のボットのユーザー名をはっきり挙げているときは、挙げられたボットだけが処理し、ほかの Hermes のボットは、返信や呼びかけ語による判定へ進む前に無視します。これは既定で有効です。
- BotFather でボットの `@username` を変えると、自動で反映されます。ゲートウェイを再起動しなくても、Hermes は新しい名前でメンションの振り分けを続けます。末尾が `bot` でない、収集品（Fragment）のユーザー名にも対応します。
- Telegram のフォーラムの特定のトピックで Hermes を黙らせたいときは `telegram.ignored_threads` を使います。そのグループが本来なら自由に応答する設定でも、メンションで呼ばれた場合でも黙ります
- `telegram.require_mention` を設定しないか false のままにすると、Hermes はこれまでどおり開かれたグループの振る舞いになり、見えている普通のグループのメッセージに応答します

### 同じグループに複数の Hermes のボットを置く {#multiple-hermes-bots-in-one-group}

同じ Telegram のグループで Hermes のプロファイルをいくつか動かす場合は、プロファイルごとに Telegram のボットのトークンを 1 つずつ作り、ゲートウェイもプロファイルごとに 1 つずつ起動します。同じボットのトークンを、動いている複数のゲートウェイで使い回してはいけません。Telegram は同じトークンでの同時のポーリングを拒否します。

グループでのおすすめの設定です。

```yaml
telegram:
  require_mention: true
  exclusive_bot_mentions: true
  mention_patterns: []
```

この設定なら、グループでの `@research_bot @ops_bot summarize this` のようなメッセージを処理するのは `research_bot` と `ops_bot` だけです。グループにいるほかの Hermes のボットは、そのメッセージが自分の以前のメッセージへの返信であっても、共通の呼びかけ語に一致していても黙っています。

互いの引用返信に答え合う 2 つの Hermes のボットは、`TELEGRAM_ALLOW_BOTS=all` のままだと永遠にやり取りを続けることがあります。ボットへの返信は必ず `require_mention` の関門を通ってしまうからです。`telegram.bots_require_mention: true`（環境変数は `TELEGRAM_BOTS_REQUIRE_MENTION`）を設定するとその経路が閉じます。ほかのボットからのメッセージは、このボットをはっきり `@mentions` したときだけ反応の対象になり、人からの返信はこれまでどおり動きます。

ボットどうしの往復を止める見張りも、ボットが書いたメッセージを受け付けるすべてのトーク（`TELEGRAM_ALLOW_BOTS` が `mentions` か `all` のとき）で数を数えています。1 つのトークに 5 分のうちにボットのメッセージが 20 件届くと、そのトークでのそれ以降のボットのメッセージは 10 分間捨てられ、警告が 1 回ログに残ります。人からのメッセージは数えられることも捨てられることもありません。設定は `config.yaml` にあります。

```yaml
gateway:
  bot_loop_guard:
    enabled: true        # false turns the guard off
    max_events: 20       # bot messages per chat per window
    window_seconds: 300
    cooldown_seconds: 600
```

正当な理由で 1 つのトークに 5 分で 20 件を超えて投稿するボットも、この見張りに引っかかります。そのゲートウェイでは `max_events` を引き上げてください。

グループでの会話の文とメディアの説明文は、メッセージがほかの参加者にも呼びかけている場合、すべてのメンションを残したまま届きます（`@research_bot , @ops_bot are you both listening?` は `research_bot` にそのままの形で届きます）。このボットだけが呼ばれている場合は、これまでどおり自分の名前だけが取り除かれるので、`@hermes_bot 2` のような短い返しも通ります。グループでのやり取りには、そのトークごとの文脈にボット自身の Telegram のユーザー名も添えられるので、残っているメンションのどれが自分宛てかをモデルが判断できます。スラッシュコマンドは、これまでどおりコマンドの呼び出しとしての整理が行われます。

`exclusive_bot_mentions: false` にするのは、はっきりしたメンションが返信や呼びかけ語による判定を上書きしてほしくない、以前からのグループの場合だけにしてください。

複数のプロファイルを動かすには、ゲートウェイのコマンドをプロファイルごとに実行します。たとえば次のようにします。

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

数が決まった小規模な構成なら、既定のプロファイルには `hermes gateway <action>`、名前付きのプロファイルにはそれぞれ `hermes -p <profile> gateway <action>` を呼ぶシェルのループかスクリプトを使うのが確実です。1 つのプロセス単位のコマンドが、どのサービス管理の仕組みでも名前付きのプロファイル全部を操作してくれる、と思い込むより頼りになります。

### うまくいかないとき: DM では動くのにグループでは動かない {#troubleshooting-works-in-dms-but-not-groups}

ボットが 1 対 1 のトークでは応答するのにグループでは黙っている場合は、次の関門を
順に確かめてください。

1. **Telegram が届けているか:** BotFather のプライバシーモードを無効にする、ボットを
   管理者にする、またはボットを直接メンションします。Telegram がボットへ届けなかった
   グループのメッセージには、Hermes は応答しようがありません。
2. **プライバシーを変えたら入れ直す:** BotFather のプライバシーの設定を変えたら、ボットを
   グループから外して入れ直します。Telegram は、すでにある参加状態については以前の
   届け方を保つことがあります。
3. **Hermes 側の許可:** 送信者が `TELEGRAM_ALLOWED_USERS` か
   `TELEGRAM_GROUP_ALLOWED_USERS` に入っているか、あるいはそのグループのトークが
   `TELEGRAM_GROUP_ALLOWED_CHATS` で許可されているかを確かめます。
4. **メンションの絞り込み:** `telegram.require_mention: true` を設定していると、普通の
   グループの雑談は無視されます。スラッシュコマンド、ボットへの返信、`@botusername` の
   メンション、設定した `mention_patterns` への一致のいずれかが要ります。
5. **複数のボットの振り分け:** グループに複数のボットがいる場合は、Hermes の
   プロファイルごとに別のボットのトークンを使い、以前からの共通の呼び出しの
   振る舞いを意図して残したいのでなければ `exclusive_bot_mentions` を有効なままにします。

Telegram のグループとスーパーグループでは、トークの ID が負の数なのが普通です。トークの単位で
許可する場合、それらの ID は送信者のユーザーの許可リストではなく
`TELEGRAM_GROUP_ALLOWED_CHATS` に入れてください。

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

この例では、いつもの直接の呼び出しに加えて、`@mention` を使っていなくても `chompy` で始まるメッセージに反応します。
Telegram のトピック `31` と `42` のメッセージは、メンションと自由応答の判定より前に、必ず無視されます。

### `mention_patterns` について {#notes-on-mentionpatterns}

- パターンには Python の正規表現を使います
- 大文字と小文字は区別しません
- テキストのメッセージにも、メディアの説明文にも当てはめます
- 正しくない正規表現は、ボットを落とさずに、ゲートウェイのログへ警告を出して無視されます
- メッセージの先頭でだけ一致させたい場合は `^` を付けます

## 1 対 1 のトークのトピック（Bot API 9.4） {#private-chat-topics-bot-api-94}

Telegram の Bot API 9.4（2026 年 2 月）で**1 対 1 のトークのトピック**が入りました。スーパーグループを用意しなくても、ボットが DM のトークの中にフォーラムのようなトピックのスレッドを直接作れます。これで、Hermes との既存の DM の中に、混ざらない作業場をいくつも持てます。

### 使いどころ {#use-case}

長く続くプロジェクトをいくつも抱えている場合、トピックがそれぞれの文脈を分けてくれます。

- **トピック「Website」** — 本番の Web サービスの作業
- **トピック「Research」** — 論文の下調べと読み込み
- **トピック「General」** — 雑多な作業とちょっとした質問

トピックごとに会話のセッション・履歴・文脈を持ち、ほかとは完全に分かれます。

### 設定 {#configuration}

:::caution 事前に必要なこと
設定にトピックを足す前に、利用者がボットとの DM のトークで**トピックモードを有効にする**必要があります。

1. Telegram で Hermes のボットとの 1 対 1 のトークを開きます
2. 上部のボットの名前を押して、トークの情報を開きます
3. **Topics** を有効にします（そのトークをフォーラムに切り替える設定です）

これをしないと、Hermes は起動時に `The chat is not a forum` とログに出して、トピックの作成を飛ばします。これは Telegram のクライアント側の設定で、ボットからは有効にできません。
:::

`~/.hermes/config.yaml` の `platforms.telegram.extra.dm_topics` にトピックを足します。

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
| `icon_custom_emoji_id` | いいえ | トピックのアイコンに使う独自の絵文字の ID |
| `skill` | いいえ | このトピックで新しいセッションが始まるとき、自動で読み込むスキル |
| `thread_id` | いいえ | トピックを作ったあと自動で書き込まれます。手で設定しないでください |

### 仕組み {#how-it-works}

1. ゲートウェイの起動時に、Hermes は `thread_id` がまだ無いトピックそれぞれについて `createForumTopic` を呼びます
2. `thread_id` は自動で `config.yaml` に書き戻されるので、次からの起動では API の呼び出しを飛ばします
3. トピックはそれぞれ別のセッションのキー `agent:main:telegram:dm:{chat_id}:{thread_id}` に対応します
4. トピックごとに、会話の履歴・記憶の書き出し・文脈の枠が分かれます

### 大元の DM の扱い {#root-dm-handling}

既定では、トピックの外にある大元の DM に送られたメッセージは、これまでどおり
処理されます。`ignore_root_dm: true` にすると、大元の DM は待合室になります。DM の
トピックを設定している利用者については普通のメッセージが黙って無視され、システムの
コマンド（`/start`、`/help`、`/status` など）はこれまでどおり使えます。

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

判定は**トークごと**です。影響を受けるのは、`dm_topics` に少なくとも 1 件の設定がある
利用者の大元の DM だけです。トピックを設定していない利用者には
影響しません。

### スキルの結び付け {#skill-binding}

`skill` の項目があるトピックでは、そのトピックで新しいセッションが始まるときに、そのスキルが自動で読み込まれます。会話のはじめに `/skill-name` と打つのとまったく同じで、スキルの内容が最初のメッセージに差し込まれ、そのあとのメッセージからは会話の履歴として見えます。

たとえば `skill: arxiv` のトピックでは、（`/new` や `/reset` を明示したあとなど）セッションが作り直されるたびに arxiv のスキルが先に読み込まれます。

:::tip
設定の外で作られたトピック（Telegram の API を手で呼んだ場合など）も、`forum_topic_created` の通知メッセージが届いたときに自動で見つけられます。ゲートウェイが動いている最中に設定へトピックを足すこともできます。次に一時保存を見に行った時点で拾われます。
:::

## DM の複数セッションモード（`/topic`） {#multi-session-dm-mode-topic}

ChatGPT のような、1 つのボットで並行して何本も会話を持てる DM です。上で説明した運用者が用意する `extra.dm_topics` と違い、こちらは**利用者が自分で操作する**方式です。設定も、あらかじめ決めたトピック名も要りません。利用者が `/topic` で有効にし、あとは Telegram の **+** ボタンで好きなだけトピックを作ります。そのひとつひとつが、完全に独立した Hermes のセッションになります。

### `/topic` の使い方 {#topic-subcommands}

| 形 | 場所 | はたらき |
|------|---------|--------|
| `/topic` | 大元の DM、まだ有効でない | BotFather の設定を確かめ、複数セッションモードを有効にし、ピン留めした System のトピックを作ります |
| `/topic` | 大元の DM、すでに有効 | 状態を表示します。復元できる、結び付いていないセッションの一覧が出ます |
| `/topic` | トピックの中 | 今のトピックがどのセッションに結び付いているかを表示します |
| `/topic help` | どこでも | その場で使い方を表示します |
| `/topic off` | 大元の DM | 複数セッションモードを無効にし、このトークのトピックの結び付けをすべて外します |
| `/topic <session-id>` | トピックの中 | 以前の Telegram のセッションを、今のトピックへ復元します |

`/topic` を使えるのは許可された利用者だけです（`TELEGRAM_ALLOWED_USERS` やプラットフォームの認証の設定による許可リスト）。許可されていない相手には、有効化ではなく断りが返ります。

### DM のトピックと DM の複数セッションモードの違い {#dm-topics-vs-multi-session-dm-mode}

| | `extra.dm_topics`（設定で決める） | `/topic`（利用者が決める） |
|---|---|---|
| 誰が有効にするか | 運用者が `config.yaml` で | 利用者が `/topic` を送って |
| トピックの一覧 | 設定に書いた決まった集合 | 利用者が自由に作ったり消したりします |
| トピックの名前 | 運用者が決めます | 利用者が決めます。Hermes のセッションの題名に合わせて自動で付け替えられます |
| 大元の DM の扱い | 普通のトーク（`ignore_root_dm: true` なら待合室） | システム用の待合室になります（コマンド以外のメッセージは断られます） |
| 主な使いどころ | 常設の作業場。必要ならスキルを結び付けられます | その場かぎりの並行したセッション |
| どこに残るか | 設定の `extra.dm_topics` | SQLite の `telegram_dm_topic_mode` と `telegram_dm_topic_bindings` の表 |

どちらも同じボットで併用できます。ある利用者の DM では `/topic` を使い、`extra.dm_topics` はほかのトークで運用者が決めたトピックを引き続き受け持つ、という形になります。

### 事前に必要なこと {#prerequisites}

**@BotFather** で対象のボットを開き、**Bot Settings → Threads Settings** と進みます。

1. **Threaded Mode** を有効にします（`has_topics_enabled` が立ちます）
2. 利用者がトピックを作れる設定は無効に**しない**でください（`allows_users_to_create_topics` を有効なままにします）

利用者が最初に `/topic` を実行すると、Hermes は `getMe` を呼んで両方の状態を確かめます。どちらかが無効なら、Hermes は BotFather の Threads Settings の画面のスクリーンショットを送り、どこを切り替えればよいかを説明します。条件がそろうまで有効化は起きません。

### 有効にする流れ {#activation-flow}

大元の DM から次を送ります。

```
/topic
```

Hermes は次のように動きます。

1. `getMe().has_topics_enabled` と `allows_users_to_create_topics` を確かめます
2. どちらも有効なら、この DM で複数セッションのトピックモードを有効にします
3. 状態表示とコマンド用に **System** のトピックを作ってピン留めします（できる範囲で）
4. 復元できる、以前の結び付いていない Telegram のセッションの一覧を返します

有効にしたあと、**大元の DM は待合室になります**。普通の問いかけは断られ、**All Messages** を使うよう案内が出ます。システムのコマンド（`/status`、`/sessions`、`/usage`、`/help` など）は大元でもこれまでどおり使えます。

### 新しいトピックを作る（利用者の操作） {#creating-a-new-topic-end-user-flow}

1. Telegram でボットとの DM を開きます
2. ボットの画面の上部にある **All Messages** を押し、何かメッセージを送ります
3. Telegram がそのメッセージのために新しいトピックを作ります
4. Hermes がそのトピックの中で応答します。これでそのトピックは独立したセッションです

トピックはそれぞれ、会話の履歴・モデルの状態・ツールの実行・セッション ID を持ちます。分かれ目のキーは `agent:main:telegram:dm:{chat_id}:{thread_id}` で、設定で決める DM のトピックの分け方とまったく同じです。

### トピックの名前が自動で付け替わる {#auto-renamed-topics}

Hermes が（最初のやり取りのあと、題名を自動で付ける処理で）そのトピックのセッションの題名を作ると、Telegram のトピック自体もそれに合わせて付け替えられます。たとえば「New Topic」が「Database migration plan」になります。付け替えはできる範囲での処理で、失敗してもログに残るだけでセッションは壊れません。

これを止めて、自分で付けたトピックの名前をそのままにしたい場合は、次を設定します。

```yaml
gateway:
  platforms:
    telegram:
      extra:
        disable_topic_auto_rename: true
```

この設定を有効にしても、Hermes は内部のセッションの題名（`hermes sessions` や TUI などで使われます）を作り続けますが、Telegram のトピックの名前には触れません。BotFather の Threaded Mode の下でトピックを手作業で整理していて、最初の返信のたびに題名が上書きされては困る場合に役立ちます。

### トピックの中での `/new` {#new-inside-a-topic}

今のトピックのセッションを作り直します（新しいセッション ID、まっさらな履歴）。ほかのトピックには触れません。Hermes は、並行して作業したいなら（**All Messages** から）別のトピックを作るほうがたいてい望みどおりだ、と添えて返します。

### 以前のセッションを復元する {#restoring-a-previous-session}

トピックの中で次を送ります。

```
/topic <session-id>
```

これで、まっさらから始める代わりに、今のトピックを既存の Hermes のセッションに結び付けます。トピックモードを有効にする前に始めた会話の続きをしたいときに役立ちます。制限は次のとおりです。

- 対象のセッションは、同じ Telegram の利用者のものである必要があります
- 対象のセッションが、すでに別のトピックに結び付いていてはいけません

Hermes はセッションの題名を添えて確認し、文脈のために最後のアシスタントのメッセージをもう一度出します。

セッション ID を調べるには、大元の DM で `/topic` を引数なしで送ります。その利用者の、結び付いていない Telegram のセッションの一覧が出ます。

### トピックの中での `/topic`（引数なし） {#topic-inside-a-topic-no-argument}

今のトピックの結び付きを表示します。セッションの題名、セッション ID、そして `/new` と別のトピックを作ることの使い分けの案内が出ます。

### 内側の仕組み {#under-the-hood}

- 有効にした状態は `state.db` の `telegram_dm_topic_mode(profile_name, chat_id, user_id, enabled, ...)` に残ります。主キーが `(profile_name, chat_id)` なので、1 つの `state.db` を共有する多重化・プロファイル振り分けのボットどうしが、同じ Telegram の利用者から複数のボットへ DM が来ても互いを壊しません（1 対 1 の `chat_id` は利用者の ID そのもので、どのボットでも同じ値になります）。
- トピックの結び付きは `telegram_dm_topic_bindings(profile_name, chat_id, thread_id, session_id, ...)` に残ります。主キーは `(profile_name, chat_id, thread_id)` で、`session_id` に `ON DELETE CASCADE` が付いているため、セッションを整理するとそのトピックの結び付きも自動で消えます
- トピックモードの SQLite の移行は**必要になったときだけ**走ります。最初に `/topic` が呼ばれたときであって、ゲートウェイの起動時ではありません。そのプロファイルで誰も `/topic` を使わないかぎり、`state.db` は変わりません。スキーマの v3 で `profile_name` が加わり、以前からの行は `default` の名前空間へだけ移されます
- 受信した DM のメッセージはそれぞれ、**振り分け先の**プロファイル（プロセス全体で有効なプロファイルではなく `source.profile`）を使って `(profile_name, chat_id, thread_id)` の結び付きを調べます。見つかれば `SessionStore.switch_session()` で結び付いたセッションへ回されるので、セッションのキーとセッション ID の対応がディスク上でも食い違いません
- トピックの中の `/new` は結び付きの行を書き換えて新しいセッション ID を指すようにするので、次のメッセージはそのまっさらなセッションで続きます
- `extra.dm_topics` に書いたトピックの名前は**自動では付け替えられません**。複数セッションモードが有効でも、運用者が決めた名前が保たれます
- `extra.disable_topic_auto_rename: true` にすると、そのトークの**すべての**トピック（Threaded Mode でその場で作ったトピックも含みます）で自動の付け替えが止まります
- フォーラムを有効にした DM の General（上にピン留めされた）トピックは、Telegram がそのメッセージを `message_thread_id=1` で届けるか、thread_id なしで届けるかにかかわらず、大元の待合室として扱われます
- 大元の待合室での案内は、**（プロファイル, トーク）**の組ごとに 30 秒に 1 通までに抑えられます。トピックモードが有効なのを忘れて大元に 10 回問いかけた人へ 10 回返すことはありませんし、同じトークの ID を共有する 2 つの多重化されたプロファイルが、互いの案内を打ち消すこともありません
- BotFather の設定のスクリーンショットは、**（プロファイル, トーク）**の組ごとに 5 分に 1 回までです。Threads Settings が無効なまま `/topic` を繰り返しても、同じ画像を何度も送りません
- トピックの中で始めた `/bg <prompt>` は、その結果を同じトピックへ返します。裏で動くセッションが、持ち主のトピックの名前を自動で付け替えることはありません
- `/topic` そのものも、ボットの利用者の許可の確認を通ります。許可されていない DM には、有効化ではなく断りが返ります

### 複数セッションモードを無効にする {#disabling-multi-session-mode}

大元の DM で `/topic off` を送ります。Hermes は**このプロファイルの**名前空間の行を無効にし、そのプロファイルがこのトークで持っていた `(thread_id → session_id)` の結び付きを外します。大元の DM は普通の Hermes のトークに戻ります。Telegram にあるトピックが消えることはなく、独立したセッションとしての扱いが止まるだけです。あとでもう一度 `/topic` を送れば戻せます。

手作業で片づけたい場合（たくさんのトークをまとめて戻す場合など）は、`profile_name` で行を絞ります（プロファイルが 1 つだけの構成では `default` です）。

```bash
sqlite3 ~/.hermes/state.db \
  "UPDATE telegram_dm_topic_mode SET enabled = 0
     WHERE profile_name = 'default' AND chat_id = '<your_chat_id>';
   DELETE FROM telegram_dm_topic_bindings
     WHERE profile_name = 'default' AND chat_id = '<your_chat_id>';"
```

### Hermes を古い版に戻す {#downgrading-hermes}

`/topic` が入る前の Hermes の版に戻すと、この機能はただ動かなくなります。`telegram_dm_topic_mode` と `telegram_dm_topic_bindings` の表は `state.db` に残りますが、古いコードからは見られません。DM は本来のスレッドごとの分け方に戻り（`message_thread_id` ごとに `build_session_key` で別のセッションになります）、既存の Telegram のトピックは並行したセッションとしてそのまま使えます。大元の DM はもう待合室ではなく、そこへのメッセージは以前と同じようにエージェントへ届きます。新しい版に上げ直せば、複数セッションモードは止めた場所からそのまま再開します。

## グループのフォーラムのトピックにスキルを結び付ける {#group-forum-topic-skill-binding}

**トピックモード**（「フォーラムのトピック」とも呼びます）を有効にしたスーパーグループでは、すでにトピックごとにセッションが分かれています。`thread_id` ごとに別の会話になります。ただ、DM のトピックへのスキルの結び付けと同じように、特定のグループのトピックにメッセージが来たとき**スキルを自動で読み込みたい**こともあります。

### 使いどころ {#use-case}

作業の流れごとにフォーラムのトピックを分けた、チームのスーパーグループです。

- **Engineering** のトピック → `software-development` のスキルを自動で読み込みます
- **Research** のトピック → `arxiv` のスキルを自動で読み込みます
- **General** のトピック → スキルなし。汎用のアシスタントとして動きます

### 設定 {#configuration}

`~/.hermes/config.yaml` の `platforms.telegram.extra.group_topics` にトピックの結び付けを足します。

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
| `name` | いいえ | そのトピックにつける、人が読むための名前（説明のためだけのものです） |
| `thread_id` | はい | Telegram のフォーラムのトピックの ID。`t.me/c/<group_id>/<thread_id>` のリンクで確認できます |
| `skill` | いいえ | このトピックで新しいセッションが始まるとき、自動で読み込むスキル |

### 仕組み {#how-it-works}

1. 対応づけたグループのトピックにメッセージが来ると、Hermes は `group_topics` の設定から `chat_id` と `thread_id` を探します
2. 見つかった設定に `skill` の項目があれば、そのスキルがそのセッション向けに自動で読み込まれます。DM のトピックへのスキルの結び付けとまったく同じです
3. `skill` のキーが無いトピックは、セッションが分かれるだけです（これまでどおりで、変わりません）
4. 対応づけていない `thread_id` や `chat_id` は黙って素通りします。エラーも出ませんし、スキルも読み込まれません

### DM のトピックとの違い {#differences-from-dm-topics}

| | DM のトピック | グループのトピック |
|---|---|---|
| 設定のキー | `extra.dm_topics` | `extra.group_topics` |
| トピックの作成 | `thread_id` が無ければ Hermes が API で作ります | 管理者が Telegram の画面で作ります |
| `thread_id` | 作成後に自動で書き込まれます | 手で設定する必要があります |
| `icon_color` / `icon_custom_emoji_id` | 使えます | 対象外です（見た目は管理者が決めます） |
| スキルの結び付け | ✓ | ✓ |
| セッションの分離 | ✓ | ✓（フォーラムのトピックでは元から備わっています） |

:::tip
トピックの `thread_id` を調べるには、Telegram の Web 版かデスクトップ版でそのトピックを開き、URL を見ます。`https://t.me/c/1234567890/5` の最後の数字（`5`）が `thread_id` です。スーパーグループの `chat_id` は、グループの ID の頭に `-100` を付けたものです（グループ `1234567890` なら `-1001234567890` になります）。
:::

## 最近の Bot API の機能 {#recent-bot-api-features}

- **Bot API 9.4（2026 年 2 月）:** 1 対 1 のトークのトピック。`createForumTopic` を使って、ボットが 1 対 1 の DM のトークにフォーラムのトピックを作れます。Hermes はこれを 2 つの機能に使っています。運用者が用意する[1 対 1 のトークのトピック](#private-chat-topics-bot-api-94)（設定で決める、決まったトピックの一覧）と、利用者が操作する[DM の複数セッションモード](#multi-session-dm-mode-topic)（`/topic` で有効にし、利用者がいくつでもトピックを作れます）です。
- **プライバシーポリシー:** Telegram はボットにプライバシーポリシーを求めるようになりました。BotFather の `/setprivacy_policy` で設定します。設定しないと Telegram が仮のものを自動で用意することがあります。誰でも使えるボットでは特に大切です。
- **Bot API 9.5（2026 年 3 月）: `sendMessageDraft` による本来のストリーミング。** Hermes は、1 対 1 のトークで使える送信方式として Telegram 本来の下書きストリーミングに対応しています（自分で選んで有効にします）。既定は従来の `editMessageText` の経路のままです。下書きのプレビューは、Telegram のクライアントによっては目に見えてたたまれ、描き直されることがあるためです。

### ストリーミングの送信方式（`gateway.streaming.transport`） {#streaming-transport-gatewaystreamingtransport}

ストリーミングを有効にすると（`gateway.streaming.enabled: true`）、Hermes は 4 つの送信方式のどれかを選びます。

| 値 | 動作 |
|---|---|
| `auto`（既定） | 対応しているトーク（今のところ Telegram の DM）では本来の下書きストリーミングを使い、それ以外では従来の編集による経路を使います。下書きの更新が失敗しても、そっと切り替わります。 |
| `draft` | 本来の下書きを必ず使います。トークが下書きに対応していない場合（グループやトピックなど）は、格下げをログに出して編集の経路に切り替えます。 |
| `edit` | どのトークでも、従来の `editMessageText` を繰り返す方式を使います。 |
| `off` | ストリーミングを完全に止めます（最終的な返信だけで、途中の更新はありません）。 |

`~/.hermes/config.yaml` では次のように書きます。

```yaml
gateway:
  streaming:
    enabled: true
    transport: auto    # auto | draft | edit | off
```

**DM で `edit`（既定）のときに見えるもの** — ゲートウェイは普通のプレビューのメッセージを送り、`editMessageText` で少しずつ書き換えます。Telegram の下書きプレビューがたたまれたり戻ったりする現象を避けられます。

**DM で `auto` または `draft` のときに見えるもの** — Telegram が、少しずつ文字が増えていく下書きのプレビューを動かして見せます。返信が終わると普通のメッセージとして届き、下書きのプレビューはクライアント側で自然に消えます。下書きにはメッセージの ID が無いので、トークの履歴に残るのは最終的な答えです。

**グループやスーパーグループ、フォーラムのトピックではどうなるか。** Telegram は `sendMessageDraft` を 1 対 1 のトークに限っています。それ以外では、ゲートウェイが黙って編集による経路に切り替えます。見え方はこれまでと同じです。

**下書きの更新が失敗したらどうなるか。** 一時的なネットワークのエラー、サーバー側の拒否、python-telegram-bot が古いなど、何であれ失敗すると、その応答は残りの間ずっと編集による経路に切り替わります。次の応答では、また下書きから試します。

## 表示: リッチメッセージ・表・リンクのプレビュー {#rendering-rich-messages-tables-and-link-previews}

**リッチメッセージ（Bot API 10.1）。** 従来の MarkdownV2 の経路では崩れてしまう書き方を含む最終的な返信、つまり表・チェックリスト・折りたためる `<details>`・別行の数式などは、エージェントの**生のマークダウン**のまま Telegram 本来の [`sendRichMessage`](https://core.telegram.org/bots/api#sendrichmessage) で送られます。クライアント側で平らにされることなく、そのまま表示されます。DM では、既定の `rich_drafts: false` によってストリーミング中のプレビューは素のままです（Telegram の一時的な下書きの送信方式と従来の表示を使うので、表などリッチでしか出せない書き方はプレビューでは生のマークダウンのまま残ります）。そのうえで、できあがった応答を `sendRichMessage` で残します。`rich_drafts: true` にすると、途中のプレビューも `sendRichMessageDraft` を使うようになります。編集によるストリーミングでは、`editMessageText` の `rich_message` の引数を使って、既存のプレビューをその場で仕上げられます。普通の返信（ただの文章、太字や斜体、簡単な箇条書き）は、クライアントをまたいで文字の太さや間隔をそろえるため、これまでどおり MarkdownV2 の経路を通ります。

リッチの経路は、内容が 32,768 文字というリッチテキストの上限を超えると自動で使われなくなります。また、Telegram から拒否された場合（古い `python-telegram-bot` でその API が無い、解析のエラー、大きすぎる塊や列など）は、**そっと** MarkdownV2 の経路へ切り替わります。メッセージが失われることはありません。一時的なエラーやネットワークのエラーで黙って送り直すことは*ありません*（最終的なメッセージが二重に届くことはありません）。

**MarkdownV2 への切り替え。** あるメッセージでリッチの経路が使えないとき、Hermes はマークダウンを MarkdownV2 に変換します。MarkdownV2 には表の書き方が無いので、縦棒で書かれた表は次のように整えられます。

- **小さい表**は、**行ごとの箇条書き**に開かれます。各行が、見出しの下に読める形の箇条書きになります。2〜4 列で、セルが短い表に向いています。
- **大きい表や横に広い表**は、列をそろえた**コードブロック**に切り替わり、崩れないようにします。

リッチメッセージは**自分で選んで有効にする**ものです。既定が従来の MarkdownV2 の経路のままなのは、いまの Telegram のクライアントでは Bot API のリッチメッセージをただの文字としてコピーしにくいことがあるためです。コマンドの断片や、スマートフォンから別の場所へ移したいときに特に困ります。表・チェックリスト・詳細・数式を本来の形で表示させたい場合は、次のようにします。

```yaml
gateway:
  platforms:
    telegram:
      extra:
        rich_messages: true
        rich_drafts: false
        allow_cjk_rich_messages: false
```

この設定は、クライアントでの表示とコピーのしやすさのためのものです。Telegram がリッチの API 呼び出しを拒否したときは、Hermes がすでに自動で切り替えます。`rich_drafts` は、DM のストリーミング中のプレビューをリッチで*表示する*か（`sendRichMessageDraft`）を決めるもので、既定は無効です。Telegram のデスクトップ版や macOS 版では、トークが描き直されるまでリッチな下書きが重なって見えることがあるためです。無効にしておけば、プレビューは素のまま流れ、最終的なものは本来のリッチメッセージとして届きます。

CJK の文字（中国語・日本語・韓国語と、まれな漢字の拡張）は、既定では従来の MarkdownV2 の経路のままです。影響を受ける Telegram のデスクトップ版や macOS 版のクライアントで、Bot API のリッチメッセージを表示すると CJK の文字が重なって崩れることがあったためです。影響のないクライアントを使っていて、CJK を含む内容でも表・チェックリスト・折りたたみ・数式を本来のリッチ表示にしたい場合は、`rich_messages: true` とあわせて `allow_cjk_rich_messages: true` を設定し、そのクライアント側の危険を承知のうえで有効にしてください。

リッチメッセージは有効にしたまま、表については以前の「常にコードブロック」の挙動だけを使いたい場合は、`config.yaml` で `telegram.pretty_tables: false` にして表の整えを止めます（既定は `true`）。

**リンクのプレビュー。** Telegram は、ボットのメッセージに含まれる URL のプレビューを自動で作ります。長い `/tools` の出力や、リンクを 10 個挙げるエージェントの返信など、それを出したくない場合は次のようにします。

```yaml
gateway:
  platforms:
    telegram:
      extra:
        disable_link_previews: true
```

有効にすると、Hermes は送信するすべてのメッセージに Telegram の `LinkPreviewOptions(is_disabled=True)` を付けます。`python-telegram-bot` が古い場合は、従来の `disable_web_page_preview` の引数に切り替えます。

**長い返信と送信制限。** Telegram の 4,096 文字という上限を超える返信は、番号を振った断片（`(1/3)`、`(2/3)`、…）に分けて送ります。1 つのチャットへの送信は返信ごとに 1 件ずつ順番に届くので、定時の報告と個別の返答が同時に発生しても断片が混ざることはなく、文章に添えるファイルが 2 つの断片のあいだに割り込むこともありません。Telegram の送信制限が途中の断片をはねた場合、Hermes は画面にすでに出ている断片を送り直すのではなく、制限が解けてからはねられた断片の続きを送ります。そのチャットが制限の時間帯にあると分かっているあいだは、以降の送信は手元で失敗させます（制限を長引かせる余計な要求を出さないためです）。ゲートウェイがその場で待てる上限を超える制限になった場合は配信の台帳へ引き継ぎ、「一部はすでに上に届いているかもしれません」という断りを添えて返信を送り直します。

## グループの許可リスト {#group-allowlisting}

Telegram のグループとフォーラムのトークには、別々に設定できる関門が 2 つあります。

- **送信者のユーザー ID**（`group_allow_from` / `TELEGRAM_GROUP_ALLOWED_USERS`） — グループやフォーラムのメッセージにだけ効く、送信者単位の許可リストです。特定の利用者にグループでボットを呼ばせたいけれど、`TELEGRAM_ALLOWED_USERS` に足す（DM も使えるようになります）のは避けたい、というときに使います。
- **トークの ID**（`group_allowed_chats` / `TELEGRAM_GROUP_ALLOWED_CHATS`） — トーク単位の許可リストです。これらのグループやフォーラムのメンバーなら誰でもボットとやり取りできます。グループにいること自体が資格になる、チームや問い合わせ対応のボットに向いています。

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

環境変数で書く場合は次のとおりです。

```bash
TELEGRAM_ALLOWED_USERS="123456789"
TELEGRAM_GROUP_ALLOWED_USERS="987654321"
TELEGRAM_GROUP_ALLOWED_CHATS="-1001234567890"
```

動作は次のとおりです。

- `TELEGRAM_ALLOWED_USERS` は、どの種類のトーク（DM・グループ・フォーラム）にも効きます。
- `TELEGRAM_GROUP_ALLOWED_USERS` は、挙げた送信者をグループとフォーラムでだけ許可します。`TELEGRAM_ALLOWED_USERS` に入っていないかぎり、DM は使えません。
- `TELEGRAM_GROUP_ALLOWED_CHATS` にあるトークでは、送信者が誰であれ、そのトークのメンバー全員が許可されます。
- どれにも `*` を書けば、送信者やトークを問わず許可できます。
- これは、これまでのメンションやパターンによる呼び出しの上に、そして `group_topics` と `ignored_threads` の上に重なって働きます。

### PR #17686 より前からの移行 {#migration-from-before-pr-17686}

この分け方が入る前は `TELEGRAM_GROUP_ALLOWED_USERS` だけがつまみで、利用者はそこへ**トークの ID** を入れていました。以前との互換のため、`TELEGRAM_GROUP_ALLOWED_USERS` の中の `-` で始まるトークの ID らしい値は、いまもトークの ID として扱われ、そのとき一度だけ廃止予定の警告がログに出ます。移行の仕方です。

```bash
# Old (still works, but deprecated)
TELEGRAM_GROUP_ALLOWED_USERS="-1001234567890"

# New
TELEGRAM_GROUP_ALLOWED_CHATS="-1001234567890"
```

### 客人としての @mention の抜け道（`guest_mode`） {#guest-mention-bypass-guestmode}

ふつうの設定では、`group_allowed_chats` は固い関門です。一覧に無いグループからのメッセージは、メンバーがはっきり @mention していても黙って捨てられます。問い合わせ対応やチームのボットなら、それが正しい既定です。

もっと気楽な使い方、たとえば友人どうしのグループで、ボットには**ふだん黙っていてほしい**けれど**名指しされたときだけ答えてほしい**場合は、`guest_mode` を有効にします。

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

`guest_mode: true` のとき、許可リストに無いグループからのメッセージは、ボットをはっきり @mention したときに**だけ**処理されます。メンションは毎回必要で、客人としてのやり取りに続きの記憶はありません。呼ばれていない友人どうしのやり取りに、ボットが勝手に入っていくことはありません。

DM と許可済みのグループの動きは、これまでとまったく同じです。

## スラッシュコマンドの権限 {#slash-command-access-control}

既定では、許可された利用者は誰でもすべてのスラッシュコマンドを使えます。許可リストを、**管理者**（すべてのスラッシュコマンドを使えます）と**一般の利用者**（明示的に許したコマンドだけ）に分けたい場合は、そのプラットフォームの `extra` の節に `allow_admin_from` と `user_allowed_commands` を足します。

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

**動作:**

- ある範囲（DM またはグループ）の `allow_admin_from` に挙げられた利用者は、登録されている**すべての**スラッシュコマンド（組み込みのものもプラグインが登録したものも）を、その場の一覧を通して使えます。
- `allow_from` にはいるが `allow_admin_from` には**いない**利用者は、`user_allowed_commands` に挙げたコマンドと、常に許される最低限の `/help` と `/whoami` だけを使えます。
- 普通の会話（スラッシュでないメッセージ）には影響しません。管理者でない利用者も、これまでどおりエージェントと話せます。任意のコマンドを呼べないだけです。
- **以前との互換:** ある範囲で `allow_admin_from` が設定されていなければ、その範囲ではスラッシュコマンドの制限は働きません。すでに動かしている構成は、何も変えずにそのまま使えます。
- DM での管理者は、グループでの管理者を意味しません。範囲ごとに別の管理者の一覧を持ちます。
- `group_allow_admin_from` だけを設定した場合、DM の範囲は制限なし（以前との互換）のままです。

いま自分がどの範囲にいるか、どの立場か（管理者 / 利用者 / 制限なし）、どのスラッシュコマンドを使えるかは `/whoami` で確認できます。

## モデルを選ぶ画面 {#interactive-model-picker}

Telegram のトークで `/model` を引数なしで送ると、Hermes はモデルを切り替えるための操作画面をその場に出します。

1. **提供元の選択** — 使える提供元とモデルの数がボタンで並びます（たとえば「OpenAI (15)」、いま使っている提供元には「✓ Anthropic (12)」のように印が付きます）。
2. **モデルの選択** — ページ送りできるモデルの一覧に、**Prev** と **Next** の移動、提供元の一覧に戻る **Back**、そして **Cancel** が付きます。

いま使っているモデルと提供元は上部に表示されます。移動はすべて同じメッセージをその場で書き換える形で行われるので、トークが散らかりません。

:::tip
モデルの名前が分かっているなら、`/model <name>` と直接打てばこの画面を飛ばせます。`/model <name> --global` と打つと、セッションをまたいでその設定が残ります。
:::

## DNS-over-HTTPS による予備の IP {#dns-over-https-fallback-ips}

制限のあるネットワークでは、`api.telegram.org` が届かない IP に解決されることがあります。Telegram のアダプターには**予備の IP** の仕組みがあり、正しい TLS のホスト名と SNI を保ったまま、別の IP へそっと接続し直します。

### 仕組み {#how-it-works}

1. `TELEGRAM_FALLBACK_IPS` が設定されていれば、その IP をそのまま使います。
2. 設定されていなければ、アダプターは **Google DNS** と **Cloudflare DNS** に DNS-over-HTTPS（DoH）で問い合わせ、`api.telegram.org` の別の IP を自動で探します。
3. 分かっている Telegram の API の IPv4 のアドレスを、デュアルスタックの `api.telegram.org` というホスト名より**先に**試します。行き止まりの IPv6 の経路は、エラーを返さないまま `connect()` に居座ることがあり、以前はそれがイベントループを押さえてしまって、30 秒の初期化の期限が働きませんでした。
4. DoH もふさがれているか時間切れになる場合は、埋め込みの IPv4 の初期値（`149.154.166.110`、`149.154.167.220`）をその IPv4 優先の一覧として使います。ホスト名は最後の手段のままです。
5. うまくいった経路が見つかると、それが「定着」します。以降の要求はその経路を直接使います。ホスト名は、IPv6 しか使えないネットワークのための最後の手段として残します。

### 設定 {#configuration}

```bash
# Explicit fallback IPs (comma-separated)
TELEGRAM_FALLBACK_IPS=149.154.167.220,149.154.167.221
```

`~/.hermes/config.yaml` に書く場合は次のとおりです。

```yaml
platforms:
  telegram:
    extra:
      fallback_ips:
        - "149.154.167.220"
```

:::tip
たいていの場合、これを手で設定する必要はありません。DoH による自動の探索で、制限のあるネットワークのほとんどはしのげます。`TELEGRAM_FALLBACK_IPS` が要るのは、DoH までふさがれているネットワークだけです。機械の IPv6 が壊れている場合は、`config.yaml` で `network.force_ipv4: true` を設定して、プロセス全体で AAAA の問い合わせを飛ばすこともできます。
:::

## プロキシへの対応 {#proxy-support}

インターネットに出るのに HTTP のプロキシが要るネットワーク（企業ではよくあります）では、Telegram のアダプターが標準のプロキシの環境変数を自動で読み、すべての接続をプロキシ経由にします。

### 使える変数 {#supported-variables}

アダプターは次の環境変数を順に見て、最初に設定されているものを使います。

1. `HTTPS_PROXY`
2. `HTTP_PROXY`
3. `ALL_PROXY`
4. `https_proxy` / `http_proxy` / `all_proxy`（小文字の書き方）

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

プロキシは、主な接続にも、予備の IP を使うすべての接続にも適用されます。Hermes 側で追加の設定は要りません。環境変数が設定されていれば、そのまま使われます。

:::note
ここで説明しているのは、Hermes が Telegram への接続に使う独自の予備の通信の層についてです。ほかの場所で使っている標準の `httpx` のクライアントは、もともとプロキシの環境変数をそのまま尊重します。
:::

## メッセージへのリアクション {#message-reactions}

処理の状況が目で分かるよう、ボットはメッセージに絵文字のリアクションを付けられます。

- 👀 ボットがメッセージの処理を始めたとき
- 👍 応答を無事に送れたとき
- 👎 処理の途中でエラーが起きたとき

リアクションは**既定で無効**です。`config.yaml` で有効にします。

```yaml
telegram:
  reactions: true
```

環境変数で書く場合は次のとおりです。

```bash
TELEGRAM_REACTIONS=true
```

:::note
リアクションが積み重なる Discord とは違い、Telegram の Bot API はボットのリアクションを 1 回の呼び出しで全部置き換えます。👀 から 👍 や 👎 への切り替わりはひとまとまりで起きるので、両方が同時に見えることはありません。
:::

:::tip
グループでリアクションを付ける権限がボットに無い場合、リアクションの呼び出しは黙って失敗し、メッセージの処理はそのまま続きます。
:::

## トークごとの指示文 {#per-channel-prompts}

Telegram の特定のグループやフォーラムのトピックに、その場かぎりのシステムの指示文を割り当てられます。指示文はやり取りのたびに実行時に差し込まれ、会話の記録には残らないので、変更はすぐに効きます。

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

キーはトークの ID（グループやスーパーグループ）か、フォーラムのトピックの ID です。フォーラムのグループでは、トピック単位の指示文がグループ単位の指示文より優先されます。

- グループ `-1001234567890` の中のトピック `42` のメッセージ → トピック `42` の指示文を使います
- トピック `99`（設定が無い）のメッセージ → グループ `-1001234567890` の指示文に戻ります
- 設定が無いグループのメッセージ → トークごとの指示文は使いません

YAML で数字として書かれたキーは、自動で文字列に直されます。

## うまくいかないとき {#troubleshooting}

| 症状 | 対処 |
|---------|----------|
| ボットがまったく応答しない | `TELEGRAM_BOT_TOKEN` が正しいか確かめます。`hermes gateway` のログにエラーが出ていないか見てください。 |
| ボットが「許可されていません」と返す | 自分のユーザー ID が `TELEGRAM_ALLOWED_USERS` に入っていません。@userinfobot でもう一度確かめてください。 |
| グループのメッセージを無視する | プライバシーモードが有効になっているはずです。無効にするか（手順 3）、ボットをグループの管理者にします。**プライバシーの設定を変えたら、ボットを外して入れ直すのを忘れずに。** |
| 音声メッセージが文字起こしされない | 音声認識が使える状態か確かめます。手元で文字起こしするなら `faster-whisper` を入れ、そうでなければ `~/.hermes/.env` に `GROQ_API_KEY` か `VOICE_TOOLS_OPENAI_KEY` を設定します。 |
| 音声の返信が吹き出しでなくファイルになる | `ffmpeg` を入れてください（Edge TTS の Opus への変換に要ります）。 |
| ボットのトークンが失効・不正 | BotFather で `/revoke` のあと `/newbot` か `/token` を使って新しいトークンを作ります。`.env` ファイルを書き換えてください。 |
| webhook に更新が届かない | `TELEGRAM_WEBHOOK_URL` に外から届くか確かめます（`curl` で試せます）。使っているサービスやリバースプロキシが、その URL のポートに来た HTTPS の通信を `TELEGRAM_WEBHOOK_PORT` で指定した手元の待ち受けポートへ渡しているか確かめてください（番号が同じである必要はありません）。SSL/TLS が有効かどうかも確かめます。Telegram は HTTPS の URL にしか送りません。ファイアウォールの設定も見てください。 |

## コマンド実行の承認 {#exec-approval}

エージェントが危険かもしれないコマンドを実行しようとすると、トークの中で承認を求めてきます。

> ⚠️ このコマンドは危険かもしれません（再帰的な削除）。承認するなら "yes" と返してください。

承認するなら "yes" か "y"、断るなら "no" か "n" と返します。

## 対話的な問いかけ（clarify） {#interactive-prompts-clarify}

エージェントが `clarify` のツールを呼ぶとき、つまりどちらの進め方がよいか尋ねる、作業のあとの感想を聞く、あるいは軽くない判断の前に確かめるとき、Telegram ではその質問が**画面のボタン**として表示されます。

> ❓ ダッシュボードにはどのフレームワークを使いましょうか？
>
> [1. Next.js] [2. Remix] [3. Astro]
> [✏️ その他（入力して答える）]

ボタンを押して答えるか、**その他**を押して自由に書いて答えます（次に送ったメッセージが答えになります）。選択肢を用意しない自由回答の `clarify` の呼び出しでは、ボタンは出ず、次のメッセージがそのまま答えとして受け取られます。

答えを待つ時間は `~/.hermes/config.yaml` の `agent.clarify_timeout` で設定します（既定は `3600` 秒）。その間に答えないと、エージェントは目印のメッセージで待つのをやめ、止まらずに進み方を変えます。

Telegram がボタンのカードを表示できないとき（Bot API に拒否された場合や、15 秒の受け付け時間を過ぎて送信に失敗した場合）は、Hermes が同じ問いかけをただの番号付きの一覧のメッセージとして送り直し、入力した返事（番号か選択肢の文言）を答えとして受け取ります。それすら届けられないときは、時間切れを待って沈黙を「答えなかった」と取り違えることなく、`[clarify prompt could not be delivered]` を添えてエージェントをすぐ先へ進めます。

## 通知の多さ {#push-notification-volume}

Telegram は、ボットが送るメッセージのたびに通知を鳴らします。エージェントの長いやり取りでは、ツールの進捗の吹き出し・ストリーミングの更新・状態の知らせが次々に出るので、あっという間にうるさくなります。Telegram のアダプターには通知の方式が 2 つあります。

| 方式 | 動作 |
|------|----------|
| `important`（既定） | 鳴るのは**最終的な応答**・**承認を求める問いかけ**・**スラッシュコマンドの確認**だけです。ツールの進捗、ストリーミングの断片、状態の知らせは `disable_notification=true` で送られます。 |
| `all` | 送信するすべてのメッセージで通知が鳴ります。以前の動きです。ツールの呼び出しをひとつ残らず知りたい場合に選んでください。 |

`~/.hermes/config.yaml` で設定します。

```yaml
display:
  platforms:
    telegram:
      notifications: important   # or "all"
```

環境変数での上書きもできます（ちょっと試すときに便利です）。

```bash
HERMES_TELEGRAM_NOTIFICATIONS=all
```

知らない値を書くと、警告をログに出して `important` として扱われます。

## 状態のメッセージはその場で書き換わる {#status-messages-edited-in-place}

Telegram のアダプターは、繰り返し出るエージェントの状態の知らせ（「文脈を圧縮しています…」「ツールを呼び出しています…」など）を `send_or_update_status()` に通します。この関数は `{(chat_id, status_key) → message_id}` の対応を覚えていて、2 回目からは新しい吹き出しを足すのではなく**既存の吹き出しを書き換えます**。`status_key` が違えばそれぞれ別のメッセージになり、別のトークどうしがぶつかることもありません。書き換えに失敗した場合（利用者がそのメッセージを消した、Telegram が編集を許す時間を過ぎたなど）は、覚えていた対応を捨て、次のときに新しいメッセージを送って ID を覚え直します。設定は要りません。これが Telegram での既定の動きです。`send_or_update_status` を持たないほかのアダプターは、これまでどおり素の `send()` に落ちます。

## やり取りの間、受け取ったメッセージをピン留めする {#pin-incoming-user-message-during-agent-turn}

利用者がエージェントを動かすメッセージを送ると、Telegram のアダプターはそのやり取りの間だけ受け取ったメッセージをピン留めし、応答が終わると外します。ボットが無視しているのではなく、いま取りかかっているのだと目で分かるようにするためです。ピン留めには `disable_notification=true` を使うので、余計な通知は鳴りません。設定は要りません。

## 安全のために {#security}

:::warning
誰がボットとやり取りできるかを絞るため、`TELEGRAM_ALLOWED_USERS` は必ず設定してください。設定していない場合、ゲートウェイは安全のため既定ですべての利用者を断ります。
:::

ボットのトークンを人前に出さないでください。漏れたときは、BotFather の `/revoke` ですぐに無効にします。

詳しくは[安全についての説明](/hermes/docs/user-guide/security/)を見てください。利用者の認証をもっと融通の利く形にしたい場合は、[DM ペアリング](/hermes/docs/user-guide/messaging/#dm-pairing-alternative-to-allowlists)も使えます。
