---
title: "Telegram"
description: "Hermes Agent を Telegram のボットとして設定する"
upstream_path: user-guide/messaging/telegram.md
upstream_blob: 4b4b58feeffe7a12b6cbb557783ad925e906f7ae
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/telegram
---

# Telegram の設定 {#telegram-setup}

Hermes Agent は、機能を一通りそろえた会話ボットとして Telegram に組み込めます。つないでしまえば、どの端末からでもエージェントと会話でき、送ったボイスメモは自動で文字起こしされ、定期タスクの実行結果を受け取り、グループチャットの中でもエージェントを使えます。この連携は [python-telegram-bot](https://python-telegram-bot.org/) の上に作られていて、テキスト・音声・画像・添付ファイルに対応しています。

## ステップ 1: BotFather でボットを作る {#step-1-create-a-bot-via-botfather}

Telegram のボットには必ず、Telegram 公式のボット管理ツールである [@BotFather](https://t.me/BotFather) が発行する API トークンが要ります。

1. Telegram を開いて **@BotFather** を検索するか、[t.me/BotFather](https://t.me/BotFather) を開きます
2. `/newbot` を送ります
3. **表示名**を決めます（例: "Hermes Agent"）— ここは何でもかまいません
4. **ユーザー名**を決めます — こちらは他と重複しない名前で、末尾が `bot` である必要があります（例: `my_hermes_bot`）
5. BotFather が **API トークン**を返してきます。次のような文字列です:

```
123456789:ABCdefGHIjklMNOpqrSTUvwxYZ
```

:::warning
ボットのトークンは他人に見せないでください。このトークンを持っている人は誰でもボットを操作できます。もし漏れてしまったら、BotFather で `/revoke` を送ってすぐに無効化してください。
:::

## ステップ 2: ボットの見た目を整える（任意） {#step-2-customize-your-bot-optional}

次の BotFather コマンドを使うと、使い勝手がよくなります。@BotFather に送ってください。

| コマンド | 用途 |
|---------|---------|
| `/setdescription` | 利用者が会話を始める前に表示される「このボットは何ができるの?」の文章 |
| `/setabouttext` | ボットのプロフィールページに出る短い紹介文 |
| `/setuserpic` | ボットのアイコン画像をアップロードする |
| `/setcommands` | コマンドメニュー（チャット画面の `/` ボタン）を定義する |
| `/setprivacy` | ボットがグループの全メッセージを見られるかどうかを切り替える（ステップ 3 を参照） |

:::tip
`/setcommands` に登録する最初の一式としては、次のあたりが便利です:

```
help - Show help information
new - Start a new conversation
sethome - Set this chat as the home channel
```
:::

### オンライン/オフラインの表示（任意） {#onlineoffline-status-indicator-optional}

Telegram のボットには、本当の意味でのオンライン/オフラインの状態表示はありません。あの緑色の点は
*ユーザーアカウント*の機能で、Bot API がボット向けに公開しているものではありません。いちばん近い
表示場所は、ボットの**短い説明文**（プロフィールで名前の下に出る 1 行）です。

`status_indicator` を有効にすると、Hermes はゲートウェイの接続時にその短い説明文を **Online** に、
正常に停止したときに **Offline** に書き換えます:

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

注意点:

- 短い説明文はボット**全体**のもの（全利用者から見える）で、チャットごとに分かれてはいません。
  利用者はボットのプロフィールページで見ることになり、開いているチャットの中にリアルタイムの
  バッジとして出るわけではありません。
- "Offline" が書き込まれるのは、ゲートウェイが**正常に**停止したとき（`/stop`、`disconnect`）だけです。
  強制終了した場合は最後の状態が残ります。プロフィールの文言で状態を表す方式そのものの限界です。
- ボットの全体プロフィールを書き換えるため、既定では無効です。

### コマンドメニューの優先順位と上限（任意） {#command-menu-priority-and-cap-optional}

Hermes は Telegram ゲートウェイの起動時に、コマンドメニューを自動で登録します。メニューは中央のスラッシュコマンド登録簿と、条件を満たすプラグイン/スキルのコマンドから組み立てられ、Telegram が確実に受け取れるように件数の上限がかかります。既定の上限は 60 件で、組み込みコマンド全部とよく使うスキルコマンドが収まる程度です。

ローカルのコマンドやプラグインのコマンドを Telegram の `/` 一覧に必ず出したい場合は、`~/.hermes/config.yaml` で優先順位を指定します:

```yaml
platforms:
  telegram:
    extra:
      command_menu:
        max_commands: 60
        priority_mode: prepend  # prepend | append | replace
        priority:
          - my_plugin_command
```

`priority_mode` は、指定した一覧を Hermes 組み込みの優先一覧とどう組み合わせるかを決めます:

- `prepend`: 指定したコマンドを先に並べ、その後ろに Hermes の既定を置く
- `append`: Hermes の既定を先に並べ、その後ろに指定したコマンドを置く
- `replace`: 優先順位の並びに指定した一覧だけを使う

Telegram は BotCommands を最大 100 件まで受け付けますが、コマンドの本文が大きくなると失敗することがあります。Hermes は確実さを優先して既定を 60 件とし、設定値は `1..100` の範囲に丸めます。コマンドの全一覧は `/commands` で確認できます。

## ステップ 3: プライバシーモード（グループでは重要） {#step-3-privacy-mode-critical-for-groups}

Telegram のボットには**プライバシーモード**があり、**既定で有効**になっています。グループでボットを使うときに、いちばんよく混乱の元になるのがこれです。

**プライバシーモードが ON のとき**、ボットが見られるのは次のものだけです:
- `/` で始まるコマンドのメッセージ
- ボット自身のメッセージへの直接の返信
- サービスメッセージ（メンバーの参加・退出、ピン留めなど）
- ボットが管理者になっているチャンネルのメッセージ

**プライバシーモードが OFF のとき**、ボットはグループ内のすべてのメッセージを受け取ります。

### プライバシーモードを切る手順 {#how-to-disable-privacy-mode}

1. **@BotFather** にメッセージを送ります
2. `/mybots` を送ります
3. 自分のボットを選びます
4. **Bot Settings → Group Privacy → Turn off** と進みます

:::warning
プライバシー設定を変えたら、**そのボットをいったんグループから外して、もう一度追加してください**。Telegram はボットがグループに参加した時点のプライバシー状態をキャッシュしていて、外して入れ直すまで更新されません。
:::

:::tip
プライバシーモードを切る代わりに、ボットを**グループの管理者**に昇格させる手もあります。管理者のボットはプライバシー設定に関係なく常に全メッセージを受け取るので、全体のプライバシーモードを切り替えずに済みます。
:::

### 自動で返信させずにグループの会話を見せる {#observe-group-chatter-without-auto-replying}

OpenClaw や元宝のようなグループでの振る舞いにしたいときは、ボットが普通のグループメッセージを**見る**ことはできるが、直接呼ばれたときだけ**返事をする**ように Telegram を設定します:

```yaml
telegram:
  allowed_chats:
    - "-1001234567890"
  group_allowed_chats:
    - "-1001234567890"
  require_mention: true
  observe_unmentioned_group_messages: true
```

このモードを有効にすると、明示的に許可した chat/topic の、メンションのないグループメッセージが、共有の chat/topic セッションの記録に「観測した文脈」として追記されます。ただしエージェントは起動しません。`allowed_chats` はボットが返事をする場所を制限し、`group_allowed_chats` は観測した文脈を保持する共有グループセッションを許可するので、このモードでは同じ chat ID を両方に書いてください。その後、同じ許可済みの chat/topic 内で `@botname` のメンション、ボットへの返信、設定したメンションのパターンのいずれかが来たとき、その観測した文脈を利用できます。呼び出しに使われたメッセージには `[nickname|user_id]` のタグが付き、そのターンだけの安全指示が添えられるので、モデルは先に観測した行を「文脈」として扱い、ボットへの指示とは解釈しません。

対応する環境変数:

```bash
TELEGRAM_ALLOWED_CHATS=-1001234567890
TELEGRAM_GROUP_ALLOWED_CHATS=-1001234567890
TELEGRAM_OBSERVE_UNMENTIONED_GROUP_MESSAGES=true
```

これには Telegram が普通のグループメッセージをゲートウェイまで届けてくれる必要があるので、上で説明したとおり BotFather のプライバシーモードを切るか、ボットをグループの管理者にしてください。

## ステップ 4: 自分のユーザー ID を調べる {#step-4-find-your-user-id}

Hermes Agent は、アクセスを制限するのに Telegram の数値のユーザー ID を使います。このユーザー ID はユーザー名では**なく**、`123456789` のような数字です。

**方法 1（おすすめ）:** [@userinfobot](https://t.me/userinfobot) にメッセージを送ると、その場でユーザー ID を返してくれます。

**方法 2:** [@get_id_bot](https://t.me/get_id_bot) にメッセージを送ります。こちらも確実です。

この数字は次のステップで使うので、控えておいてください。

## ステップ 5: Hermes 側を設定する {#step-5-configure-hermes}

### 方法 A: 対話形式の設定（おすすめ） {#option-a-interactive-setup-recommended}

```bash
hermes gateway setup
```

プロンプトが出たら **Telegram** を選びます。ウィザードがボットのトークンと許可するユーザー ID を尋ね、設定ファイルまで書いてくれます。

### 方法 B: 手で設定する {#option-b-manual-configuration}

`~/.hermes/.env` に次を書き足します:

```bash
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUvwxYZ
TELEGRAM_ALLOWED_USERS=123456789    # Comma-separated for multiple users
```

### ゲートウェイを起動する {#start-the-gateway}

```bash
hermes gateway
```

数秒でボットがオンラインになるはずです。Telegram からメッセージを送って動作を確かめてください。

## Docker を使う端末から生成ファイルを送る {#sending-generated-files-from-docker-backed-terminals}

端末のバックエンドが `docker` の場合、Telegram への添付を送っているのはコンテナの中ではなく
**ゲートウェイのプロセス**だという点に注意してください。つまり最終的な `MEDIA:/...` のパスは、
ゲートウェイが動いているホスト側から読める必要があります。

よくある落とし穴:

- エージェントが Docker の中で `/workspace/report.txt` にファイルを書く
- モデルが `MEDIA:/workspace/report.txt` を出力する
- `/workspace/report.txt` はコンテナの中にしか存在せずホストにはないので、Telegram への送信が失敗する

おすすめの形:

```yaml
terminal:
  backend: docker
  docker_volumes:
    - "/home/user/.hermes/cache/documents:/output"
```

そのうえで:

- Docker の中では `/output/...` にファイルを書く
- `MEDIA:` には**ホストから見える**パスを出力する。たとえば:
  `MEDIA:/home/user/.hermes/cache/documents/report.txt`

すでに `docker_volumes:` の節がある場合は、その同じ一覧に新しいマウントを足してください。
YAML でキーが重複すると、先に書いたほうが黙って上書きされます。

### `MEDIA:` が対応するファイル拡張子 {#supported-media-file-extensions}

ゲートウェイはエージェントの返信から `MEDIA:/path/to/file` のタグを取り出し、指定されたファイルをそのプラットフォームらしい添付として送ります。ゲートウェイの全プラットフォームで対応している拡張子は次のとおりです:

| 分類 | 拡張子 |
|---|---|
| 画像 | `png`, `jpg`, `jpeg`, `gif`, `webp`, `bmp`, `tiff`, `svg` |
| 音声 | `mp3`, `wav`, `ogg`, `m4a`, `opus`, `flac`, `aac` |
| 動画 | `mp4`, `mov`, `webm`, `mkv`, `avi` |
| **文書** | `pdf`, `txt`, `md`, `csv`, `json`, `xml`, `html`, `yaml`, `yml`, `log` |
| **オフィス文書** | `docx`, `xlsx`, `pptx`, `odt`, `ods`, `odp` |
| **書庫** | `zip`, `rar`, `7z`, `tar`, `gz`, `bz2` |
| **電子書籍 / パッケージ** | `epub`, `apk`, `ipa` |

この一覧にあるものは、対応しているプラットフォーム（Telegram、Discord、Signal、Slack、WhatsApp、Feishu、Matrix など）ではそのまま添付として届きます。添付に対応していないプラットフォームでは、リンクかテキストでの案内に置き換わります。**太字**の分類はここ数回のリリースで追加されたものです。これまでモデルに `here is the file: /path/to/report.docx` のように言わせていた場合は、`MEDIA:/path/to/report.docx` に切り替えると添付として届くようになります。

## Webhook モード {#webhook-mode}

既定では、Hermes は**ロングポーリング**で Telegram につなぎます。ゲートウェイのほうから Telegram のサーバーに新しい更新を取りに行く方式です。手元の環境や、ずっと動かしっぱなしの構成にはこれで十分です。

**クラウドに置く場合**（Fly.io、Railway、Render など）は、**webhook モード**のほうが費用を抑えられます。この種のプラットフォームは、外から入ってくる HTTP 通信で停止中のマシンを自動的に起こせますが、外へ出ていく通信では起こせません。ポーリングは外へ出ていく通信なので、ポーリングのままだとボットは眠れません。webhook モードは向きを逆にして、Telegram のほうからボットの HTTPS の URL に更新を送り込むので、待機中はマシンを眠らせられます。

| | ポーリング（既定） | Webhook |
|---|---|---|
| 通信の向き | ゲートウェイ → Telegram（外向き） | Telegram → ゲートウェイ（内向き） |
| 向いている場面 | 手元の環境、常時稼働のサーバー | 自動起動があるクラウド |
| 設定 | 追加の設定は不要 | `TELEGRAM_WEBHOOK_URL` を設定する |
| 待機中の費用 | マシンを動かし続ける必要がある | メッセージの合間はマシンを眠らせられる |

### 設定 {#configuration}

`~/.hermes/.env` に次を書き足します:

```bash
TELEGRAM_WEBHOOK_URL=https://my-app.fly.dev/telegram
TELEGRAM_WEBHOOK_SECRET="$(openssl rand -hex 32)"  # required
# TELEGRAM_WEBHOOK_PORT=8443        # optional, default 8443
```

| 変数 | 必須 | 説明 |
|----------|----------|-------------|
| `TELEGRAM_WEBHOOK_URL` | はい | Telegram が更新を送ってくる、公開された HTTPS の URL。URL のパス部分は自動で取り出されます（上の例なら `/telegram`）。 |
| `TELEGRAM_WEBHOOK_SECRET` | **はい**（`TELEGRAM_WEBHOOK_URL` を設定した場合） | Telegram が毎回の webhook リクエストに載せて返す確認用の秘密トークン。これがないとゲートウェイは起動を拒否します。[GHSA-3vpc-7q5r-276h](https://github.com/NousResearch/hermes-agent/security/advisories/GHSA-3vpc-7q5r-276h) を参照してください。`openssl rand -hex 32` で生成します。 |
| `TELEGRAM_WEBHOOK_PORT` | いいえ | webhook のサーバーが待ち受けるローカルのポート（既定: `8443`）。 |

`TELEGRAM_WEBHOOK_URL` を設定すると、ゲートウェイはポーリングの代わりに HTTP の webhook サーバーを起動します。設定していなければポーリングのままで、以前のバージョンから挙動は変わりません。

### クラウドへの配置例（Fly.io） {#cloud-deployment-example-flyio}

1. 環境変数を Fly.io アプリのシークレットに登録します:

```bash
fly secrets set TELEGRAM_WEBHOOK_URL=https://my-app.fly.dev/telegram
fly secrets set TELEGRAM_WEBHOOK_SECRET=$(openssl rand -hex 32)
```

2. `fly.toml` で webhook のポートを公開します:

```toml
[[services]]
  internal_port = 8443
  protocol = "tcp"

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443
```

3. デプロイします:

```bash
fly deploy
```

ゲートウェイのログに `[telegram] Connected to Telegram (webhook mode)` と出れば成功です。

## プロキシへの対応 {#proxy-support}

Telegram の API が遮断されている場合や、通信をプロキシ経由にしたい場合は、Telegram 専用のプロキシ URL を設定します。この設定は、汎用の `HTTPS_PROXY` / `HTTP_PROXY` 環境変数より優先されます。

**方法 1: config.yaml（おすすめ）**

```yaml
telegram:
  proxy_url: "socks5://127.0.0.1:1080"
```

**方法 2: 環境変数**

```bash
TELEGRAM_PROXY=socks5://127.0.0.1:1080
```

対応しているスキームは `http://`、`https://`、`socks5://` です。

プロキシは Telegram への主接続と、代替 IP を使う接続の両方に適用されます。Telegram 専用のプロキシを設定していない場合は、`HTTPS_PROXY` / `HTTP_PROXY` / `ALL_PROXY`（または macOS のシステムプロキシ自動検出）にさかのぼって使われます。

代替 IP を探す経路がその端末でうまく動かない場合は、`HERMES_TELEGRAM_DISABLE_FALLBACK_IPS=true` を設定して、素の `api.telegram.org` への接続だけで最初のつなぎ込みを行うようにできます。DNS-over-HTTPS での代替探索に時間の上限を設けたいときは、`HERMES_TELEGRAM_FALLBACK_DISCOVERY_TIMEOUT` に秒数を指定します。既定は `5` です。

## ホームチャンネル {#home-channel}

Telegram のどのチャット（個人チャットでもグループでも）でも `/sethome` コマンドを送ると、そのチャットが**ホームチャンネル**になります。定期タスク（cron ジョブ）の実行結果はこのチャンネルに届きます。

`~/.hermes/.env` で直接指定することもできます:

```bash
TELEGRAM_HOME_CHANNEL=-1001234567890
TELEGRAM_HOME_CHANNEL_NAME="My Notes"
```

:::tip
グループのチャット ID はマイナスの数値です（例: `-1001234567890`）。自分との個人チャットのチャット ID は、自分のユーザー ID と同じです。
:::

### トピックモードでの cron 配信 {#cron-deliveries-in-topic-mode}

ボットとの個人チャットでトピックモードを有効にしている場合、ルートのチャットに届いた cron のメッセージはシステム専用のロビーに落ちてしまいます。そこで返信してもセッションは始まらず、"main chat is reserved for system commands" という案内が出ます。専用のフォーラムトピック（たとえば `Cron`）を作って、次を設定してください:

```bash
TELEGRAM_CRON_THREAD_ID=<topic_thread_id>
```

`TELEGRAM_CRON_THREAD_ID` は、cron の配信に限って `TELEGRAM_HOME_CHANNEL_THREAD_ID` を上書きします。そのトピック内での返信は、トピックが持っている既存のセッションの続きになります。

## ボイスメッセージ {#voice-messages}

### 受信した音声（音声認識） {#incoming-voice-speech-to-text}

Telegram で送ったボイスメッセージは、Hermes に設定された音声認識のプロバイダーが自動で文字起こしし、テキストとして会話に差し込まれます。

- `local` は Hermes を動かしている端末上で `faster-whisper` を使います。API キーは不要です
- `groq` は Groq Whisper を使い、`GROQ_API_KEY` が必要です
- `openai` は OpenAI Whisper を使い、`VOICE_TOOLS_OPENAI_KEY` が必要です

#### 音声認識を飛ばして、音声ファイルをそのままエージェントに渡す {#skipping-stt-pass-the-raw-audio-file-to-the-agent}

話者の分離、独自の文字起こしツール、あるいは録音をそのまま保管したいなど、音声を**エージェント自身**に処理させたい場合は、`~/.hermes/config.yaml` で `stt.enabled: false` を設定します:

```yaml
stt:
  enabled: false
```

音声認識を切ると、ゲートウェイはボイス/音声の添付を Hermes の音声キャッシュにダウンロードするところまでは行いますが、**文字起こしはしません**。エージェントには次のような目印付きのメッセージが渡ります:

```
[The user sent a voice message: /home/<user>/.hermes/cache/audio/<hash>.ogg]
```

自作のツールやスキルは、このパスを直接読めます（手元の話者分離パイプラインに渡す、より精度の高い文字起こしモデルにかける、長期保管先にアップロードする、など）。拡張子は Telegram が届けた元の形式を反映します（ボイスメモなら `.ogg`、音声の添付なら `.mp3` や `.m4a` など）。

これは後述の[ローカル Bot API サーバー](#large-files-20mb-via-local-bot-api-server)の節と相性がよく、Telegram の getFile の 20MB という上限を 2GB まで引き上げられます。数分を超える録音を処理したいときに役立ちます。

### 送信する音声（音声合成） {#outgoing-voice-text-to-speech}

エージェントが音声合成で音声を作った場合は、Telegram らしい**ボイスバブル**（丸くて、その場で再生できるあの形式）として届きます。

- **OpenAI と ElevenLabs** はそのまま Opus を出力するので、追加の準備は要りません
- **Edge TTS**（既定の無料プロバイダー）は MP3 を出力するので、Opus に変換するために **ffmpeg** が必要です:

```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# macOS
brew install ffmpeg
```

ffmpeg がないと、Edge TTS の音声は通常の音声ファイルとして送られます（再生はできますが、ボイスバブルではなく四角いプレーヤーになります）。

音声合成のプロバイダーは、`config.yaml` の `tts.provider` キーで設定します。

## ローカル Bot API サーバーで大きなファイル（20MB 超）を扱う {#large-files-20mb-via-local-bot-api-server}

Telegram の**公開**の Bot API は `getFile` のダウンロードを **20 MB** で頭打ちにしているため、それより大きいボイスメモ・音声ファイル・動画・文書は Hermes から "too large" という返事とともに黙って弾かれます。これを回避する正式な方法は、**ローカル**の [telegram-bot-api](https://github.com/tdlib/telegram-bot-api) デーモンを動かすことです。Telegram 自身が使っているのと同じサーバーソフトを、自分のネットワークで動かします。ローカルのサーバーならファイルの上限が **2 GB** に上がり、Hermes は独自の `base_url` が設定されているのを見つけると自分の内部上限も自動で引き上げます。

これによって、こんな使い方ができるようになります:

- 長いボイスメモ（45 分の会議、ポッドキャストなど）をボットに送る
- 画像認識ツールに処理させる大きな動画をアップロードする
- 話者分離・アラインメント・学習データ作成といったオフライン処理のために、元の音声を保管する

### ステップ 1: Telegram の API 認証情報を取得する {#step-1-obtain-telegram-api-credentials}

ローカルのサーバーは公開の Bot API ではなく Telegram の MTProto 層と直接やり取りするので、**MTProto の認証情報**が必要です:

1. [my.telegram.org/apps](https://my.telegram.org/apps) にアクセスし、Telegram のアカウントでサインインします。
2. 新しいアプリケーションを作ります（名前と短い説明は何でもかまいません）。
3. `api_id` と `api_hash` を控えます。どちらも必要です。

### ステップ 2: telegram-bot-api サーバーを動かす {#step-2-run-the-telegram-bot-api-server}

いちばん手軽なのは、コミュニティが保守している [`aiogram/telegram-bot-api`](https://hub.docker.com/r/aiogram/telegram-bot-api) の Docker イメージです。最小限の `docker-compose.yaml` は次のとおりです（上限を引き上げるには `--local` モードを使います）:

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

起動します:

```bash
docker compose up -d tg-bot-api
docker logs --tail 20 tg-bot-api
```

:::warning セキュリティ
ローカルの Bot API サーバーは、ボットのトークンを URL のパスに含めて受け取ります（例: `/bot<TOKEN>/getMe`）。それ以外の**認証はありません**。このポートに届く人は誰でも、ボットを完全に操作できてしまいます。ボットが見られるメッセージをすべて読むことも、ボットとしてメッセージを送ることもできます。コンテナは `127.0.0.1` にだけ結び付けるか、プライベートなネットワークのリバースプロキシの後ろに置いてください。**ポート 8081 をインターネットに公開してはいけません。**
:::

### ステップ 3: ボットを公開 API からログアウトさせる（一度だけ） {#step-3-log-the-bot-out-of-the-public-api-one-time}

ボットが同時に接続できる Bot API サーバーは**ひとつだけ**です。すでに `api.telegram.org` に対して動かしていた場合（ほとんどの場合そうです）、ローカルのサーバーに受け入れてもらう前に、あちら側で明示的にログアウトさせる必要があります:

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/logOut"
# expected response: {"ok":true,"result":true}
```

これは移行のときに一度だけ行う作業で、再起動のたびに繰り返す必要はありません。`logOut` 以降に届いたメッセージは、Telegram が新しいサーバーのほうへ配送します。

ローカルのサーバーがボットの代わりに Telegram と通信できているか確認します:

```bash
curl "http://127.0.0.1:8081/bot<YOUR_BOT_TOKEN>/getMe"
# expected response: {"ok":true,"result":{"id":...,"is_bot":true,...}}
```

### ステップ 4: Hermes をローカルのサーバーに向ける {#step-4-point-hermes-at-the-local-server}

`~/.hermes/config.yaml` の `platforms.telegram.extra` の下に URL を書きます:

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
現時点では、プラットフォームの設定に深くマージされるのは `platforms.<name>.extra` の形だけです。トップレベルの `telegram.extra` ブロックの下に直接置いたキーは、黙って捨てられます。
:::

`base_url` を設定すると、Hermes は次のように動きます:

- python-telegram-bot のクライアントをローカルのサーバー向けに組み立てる
- 内部の文書/音声のサイズ上限を 20 MB から 2 GB へ自動で引き上げる
- "too large" のエラーメッセージに現在の上限を出す（`Maximum: 2048 MB.`）ので、どちらのモードで動いているかがひと目でわかる

ゲートウェイを再起動して、確認のログ行が出ているか見てください:

```bash
hermes gateway restart
grep -E "Using custom Telegram base_url|Using Telegram local_mode" ~/.hermes/logs/gateway.log | tail
```

### ステップ 5: `local_mode` — ディスク上のファイルへのアクセス {#step-5-localmode-file-access-on-disk}

ローカルのサーバーがファイルを渡す方法には**ふたつ**あります:

1. **`--local` なし**（既定）: ファイルは公開の Bot API と同じく `/file/bot<TOKEN>/<path>` から HTTP で配信されます。20MB の上限はそのままです。ネットワークの問題を回避するだけの用途（`api.telegram.org` に届かないが自前で立てられる場合など）には使えますが、サイズの上限を上げたいなら目的に合いません。
2. **`--local` あり**（上の `TELEGRAM_LOCAL=1` で設定）: ファイルはサーバーのファイルシステムに書き出され、`getFile` の応答は HTTP の URL ではなく**絶対パス**を返します。20MB の上限は外れます。この場合、Hermes は HTTP 経由ではなく**ディスクから**中身を読む必要があります。

ディスクから読む経路を成立させるには、上の設定で `local_mode: true` を指定し、**なおかつ** Hermes のプロセスがサーバーの返すパスを読めるようにします。状況はふたつあります:

- **同じマシンの場合** — telegram-bot-api と Hermes が同じホストで動いているケース。データのボリュームを Hermes が読めるディレクトリ（たとえば `/var/lib/telegram-bot-api`）にバインドマウントし、ファイルの所有者が合っているか確かめます。コンテナは内部の `telegram-bot-api` ユーザーに権限を落とします（uid はイメージによって異なります）。いちばん簡単な解決策は、compose のサービスに `user: "<UID>:<GID>"` を足して、Hermes が動いている uid でファイルが所有されるようにすることです。
- **別々のマシンの場合** — ボットのサーバーが一方のホスト（NAS や別の VM など）にあり、Hermes が別のホストにあるケース。サーバーのデータディレクトリを、サーバーが報告するのと**同じ絶対パス**（ふつうは `/var/lib/telegram-bot-api`）で Hermes 側のマシンと共有する必要があります。これには NFS が向いています。ファイルシステムの層で uid の食い違いを扱いたくなければ、`uid=` でマウント時に読み替えられる CIFS/SMB のほうが楽です。

`local_mode: true` を設定していても、Hermes が返ってきたファイルのパスを `stat` できない場合（権限の問題やマウント先の誤り）、python-telegram-bot は黙ってローカルのサーバーに対する HTTP の `getFile` へ戻ります。ところが `--local` モードのサーバーはこれに `404 Not Found` を返します。`gateway.log` には次のような症状として出ます:

```
[Telegram] Failed to cache voice: Not Found
telegram.error.InvalidToken: Not Found
```

これが出たら、上限の引き上げは効いているがファイル共有ができていない状態です。Hermes 側のホストで、ゲートウェイを動かしているユーザーとして `ls -la /var/lib/telegram-bot-api/<TOKEN>/voice/` を実行し、ファイルをひとつ `cat` して権限エラーが出ないことを確かめてください。

### ステップ 6: 動作を確かめる {#step-6-test-it}

20 MB より大きいボイスメモか音声ファイルをボットに送ります。ゲートウェイのログを追いかけてください:

```bash
tail -f ~/.hermes/logs/gateway.log | grep -iE "telegram|cache"
```

`[Telegram] Cached user voice at /home/<user>/.hermes/cache/audio/...` の行が出て、"too large" の拒否が出**ない**はずです。前述の `stt.enabled: false` と組み合わせれば、元の音声ファイルのパスがエージェントの受信メッセージに載り、その後の処理に回せます。

## グループチャットでの使い方 {#group-chat-usage}

Hermes Agent は Telegram のグループチャットでも動きますが、いくつか押さえておく点があります:

- **プライバシーモード**が、ボットの見られるメッセージを決めます（[ステップ 3](#step-3-privacy-mode-critical-for-groups) を参照）
- `TELEGRAM_ALLOWED_USERS` はグループでも有効です。グループの中でも、許可されたユーザーだけがボットを動かせます
- `telegram.require_mention: true` を使うと、グループの普通の雑談にはボットが反応しなくなります
- `telegram.require_mention: true` のとき、グループのメッセージが受け付けられるのは次の場合です:
  - ボットのメッセージへの返信
  - `@botusername` のメンション
  - `/command@botusername`（ボット名を含む、Telegram のボットメニュー用のコマンド形式）
  - `telegram.mention_patterns` に設定した正規表現の呼び出し語に一致したとき
- 複数の Hermes ボットがいるグループでは、`telegram.exclusive_bot_mentions` が振り分けを一意に保ちます。メッセージが Telegram のボットのユーザー名を明示的にメンションしている場合、メンションされたボットのプロファイルだけがそれを処理し、他の Hermes ボットは返信や呼び出し語による予備の判定が走る前に無視します。これは既定で有効です。
- BotFather でボットの `@username` を変えた場合は自動的に反映されます。Hermes はゲートウェイを再起動しなくても新しいハンドルに追従してメンションを振り分けます。末尾が `bot` でないコレクティブル（Fragment）のユーザー名にも対応しています。
- `telegram.ignored_threads` を使うと、そのグループが自由な応答やメンションでの応答を許していても、指定した Telegram のフォーラムトピックでは Hermes を黙らせておけます
- `telegram.require_mention` を設定していないか false の場合、Hermes は従来どおりのオープンなグループの振る舞いのまま、見えている普通のグループメッセージに応答します

### ひとつのグループで複数の Hermes ボットを動かす {#multiple-hermes-bots-in-one-group}

同じ Telegram のグループで複数の Hermes プロファイルを動かす場合は、プロファイルごとに Telegram のボットトークンを作り、プロファイルごとにゲートウェイを起動してください。同じボットトークンを複数の起動中のゲートウェイで使い回してはいけません。Telegram は同じトークンでの同時ポーリングを拒否します。

グループ向けのおすすめ設定:

```yaml
telegram:
  require_mention: true
  exclusive_bot_mentions: true
  mention_patterns: []
```

この設定なら、`@research_bot @ops_bot summarize this` のようなグループのメッセージを処理するのは `research_bot` と `ops_bot` だけです。グループにいる他の Hermes ボットは、たとえそのメッセージが自分の以前のメッセージへの返信であっても、共通の呼び出し語に一致していても、黙っています。

`exclusive_bot_mentions: false` にするのは、明示的なメンションが返信や呼び出し語による起動を上書きしてほしくない、従来からのグループの場合だけにしてください。

複数のプロファイルを運用するには、ゲートウェイのコマンドをプロファイルごとに実行します。たとえば:

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

台数の決まった小規模な構成なら、既定のプロファイルには `hermes gateway <action>` を、名前付きのプロファイルそれぞれには `hermes -p <profile> gateway <action>` を呼ぶシェルのループやスクリプトを用意してください。ひとつのプロセス単位のコマンドが、どのサービス管理の仕組みでも名前付きプロファイル全部を制御してくれる、と決め込むよりも確実です。

### うまくいかないとき: 個人チャットでは動くのにグループでは動かない {#troubleshooting-works-in-dms-but-not-groups}

個人チャットでは応答するのにグループでは黙っている場合は、次の関門を順に確かめてください:

1. **Telegram からの配送:** BotFather のプライバシーモードを切るか、ボットを管理者に昇格させるか、
   ボットを直接メンションします。Telegram がボットに届けてくれないグループのメッセージには、
   Hermes は応答できません。
2. **プライバシー変更後の入り直し:** BotFather のプライバシー設定を変えたら、ボットをグループから
   外してもう一度追加してください。Telegram は既存の参加については古い配送の挙動を保つことが
   あります。
3. **Hermes 側の許可:** 送信者が `TELEGRAM_ALLOWED_USERS` か `TELEGRAM_GROUP_ALLOWED_USERS` に
   入っているか、あるいは `TELEGRAM_GROUP_ALLOWED_CHATS` でそのグループのチャットを許可して
   いるか確かめます。
4. **メンションの絞り込み:** `telegram.require_mention: true` を設定していると、普通のグループの
   雑談は無視されます。スラッシュコマンド、ボットへの返信、`@botusername` のメンション、
   設定した `mention_patterns` への一致のいずれかが必要です。
5. **複数ボットの振り分け:** グループに複数のボットがいる場合は、Hermes のプロファイルごとに
   ボットトークンが別々であることを確かめ、従来の共通トリガーの挙動をあえて使いたいのでなければ
   `exclusive_bot_mentions` は有効のままにしてください。

Telegram のグループやスーパーグループでは、チャット ID がマイナスの数値になるのが普通です。チャット単位の許可を使うなら、その ID は送信者ユーザーの許可一覧ではなく `TELEGRAM_GROUP_ALLOWED_CHATS` に書いてください。

### グループの起動条件の設定例 {#example-group-trigger-configuration}

`~/.hermes/config.yaml` に次を書き足します:

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

この例では、いつもの直接的な起動方法に加えて、`@mention` を使っていなくても `chompy` で始まるメッセージが受け付けられます。
Telegram のトピック `31` と `42` のメッセージは、メンションの判定や自由な応答の判定が走る前に、常に無視されます。

### `mention_patterns` についての注意 {#notes-on-mentionpatterns}

- パターンには Python の正規表現を使います
- 大文字と小文字は区別されません
- パターンはテキストのメッセージと、メディアのキャプションの両方に対して照合されます
- 正しくない正規表現はボットを落とすことはなく、ゲートウェイのログに警告を残して無視されます
- メッセージの先頭でだけ一致させたい場合は、`^` を付けてください

## 個人チャットのトピック（Bot API 9.4） {#private-chat-topics-bot-api-94}

Telegram Bot API 9.4（2026 年 2 月）で**個人チャットのトピック**が導入されました。ボットが 1 対 1 の個人チャットの中に、フォーラムのようなトピックのスレッドを直接作れる機能で、スーパーグループは要りません。これを使うと、Hermes との既存の個人チャットの中に、互いに独立した作業場をいくつも作れます。

### 使いどころ {#use-case}

長く続くプロジェクトをいくつも抱えている場合、トピックが文脈を分けてくれます:

- **トピック "Website"** — 本番の Web サービスの作業
- **トピック "Research"** — 文献調査と論文の探索
- **トピック "General"** — こまごました作業とちょっとした質問

トピックごとに会話のセッション・履歴・文脈が用意され、他のトピックとは完全に分かれます。

### 設定 {#configuration}

:::caution 前提条件
設定にトピックを書き足す前に、ボットとの個人チャットで利用者が**トピックモードを有効にする**必要があります:

1. Telegram で Hermes のボットとの個人チャットを開きます
2. 上部のボット名をタップしてチャット情報を開きます
3. **Topics**（チャットをフォーラムに変える切り替え）を有効にします

これをしていないと、Hermes は起動時に `The chat is not a forum` とログに出して、トピックの作成を飛ばします。これは Telegram のクライアント側の設定で、ボットがプログラムから有効にすることはできません。
:::

`~/.hermes/config.yaml` の `platforms.telegram.extra.dm_topics` の下にトピックを書き足します:

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
| `skill` | いいえ | このトピックの新しいセッションで自動的に読み込むスキル |
| `thread_id` | いいえ | トピックの作成後に自動で埋まります。自分で書かないでください |

### 仕組み {#how-it-works}

1. ゲートウェイの起動時に、Hermes はまだ `thread_id` を持たないトピックそれぞれについて `createForumTopic` を呼びます
2. `thread_id` は `config.yaml` に自動で書き戻されるので、以降の再起動では API 呼び出しが省かれます
3. トピックはそれぞれ、独立したセッションのキー `agent:main:telegram:dm:{chat_id}:{thread_id}` に対応します
4. トピックごとのメッセージは、それぞれ専用の会話履歴・記憶の書き出し・文脈の窓を持ちます

### ルートの個人チャットの扱い {#root-dm-handling}

既定では、ルートの個人チャット（どのトピックにも属さない場所）に送ったメッセージも
普通に処理されます。`ignore_root_dm: true` を設定すると、ルートの個人チャットはロビーになります。
個人チャットのトピックを設定しているユーザーについては普通のメッセージが黙って無視され、
システムコマンド（`/start`、`/help`、`/status` など）は今までどおり使えます。

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

この判定は**チャットごと**です。`dm_topics` に少なくともひとつ登録のあるユーザーだけが、
ルートの個人チャットの扱いが変わります。トピックを設定していないユーザーには
影響しません。

### スキルの割り当て {#skill-binding}

`skill` 項目を持つトピックでは、そのトピックで新しいセッションが始まったときに、そのスキルが自動で読み込まれます。会話の最初に `/skill-name` と打つのとまったく同じ動きで、スキルの内容が最初のメッセージに差し込まれ、以降のメッセージからは会話履歴の中に見えます。

たとえば `skill: arxiv` を指定したトピックでは、（待機時間切れ、日次のリセット、手動の `/reset` などで）セッションが初期化されるたびに arxiv スキルがあらかじめ読み込まれます。

:::tip
設定の外で作られたトピック（Telegram の API を手で呼んだ場合など）は、`forum_topic_created` のサービスメッセージが届いた時点で自動的に見つけられます。また、ゲートウェイが動いている最中に設定へトピックを足すこともできます。次にキャッシュが外れたときに拾われます。
:::

## 個人チャットの複数セッションモード（`/topic`） {#multi-session-dm-mode-topic}

ChatGPT のような、個人チャットでの複数セッション。ボットはひとつのまま、並行する会話をいくつも持てます。上で説明した運用側が用意する `extra.dm_topics` と違って、こちらは**利用者が主導**します。設定も、あらかじめ決めたトピック名も要りません。利用者が `/topic` で有効にし、あとは Telegram の **+** ボタンから好きなだけトピックを作れて、そのひとつひとつが完全に独立した Hermes のセッションになります。

### `/topic` のサブコマンド {#topic-subcommands}

| 形式 | 使う場所 | 効果 |
|------|---------|--------|
| `/topic` | ルートの個人チャット、まだ有効でないとき | BotFather 側の対応状況を確認し、複数セッションモードを有効にして、ピン留めした System トピックを作る |
| `/topic` | ルートの個人チャット、すでに有効のとき | 状態を表示する: 復元できる、未割り当てのセッション一覧 |
| `/topic` | トピックの中 | いま開いているトピックに割り当てられたセッションを表示する |
| `/topic help` | どこでも | その場で使い方を表示する |
| `/topic off` | ルートの個人チャット | 複数セッションモードを無効にし、このチャットのトピックの割り当てをすべて消す |
| `/topic <session-id>` | トピックの中 | 以前の Telegram のセッションを、いま開いているトピックに復元する |

`/topic` を実行できるのは、許可されたユーザー（`TELEGRAM_ALLOWED_USERS` やプラットフォームの認証設定による許可一覧）だけです。許可されていない送信者には、有効化ではなく拒否の返事が返ります。

### 個人チャットのトピックと複数セッションモードの違い {#dm-topics-vs-multi-session-dm-mode}

| | `extra.dm_topics`（設定で決める） | `/topic`（利用者が決める） |
|---|---|---|
| 有効にする人 | 運用者が `config.yaml` で | 利用者が `/topic` を送って |
| トピックの一覧 | 設定に書いた固定の一式 | 利用者が自由に作ったり消したりする |
| トピック名 | 運用者が決める | 利用者が決める。Hermes のセッション名に合わせて自動で改名される |
| ルートの個人チャットの扱い | 普通のチャット（`ignore_root_dm: true` ならロビー） | ロビーになる（コマンド以外のメッセージは拒否される） |
| おもな使いどころ | スキルの割り当ても選べる、常設の作業場 | その場かぎりの並行セッション |
| 保存先 | 設定の `extra.dm_topics` | `telegram_dm_topic_mode` と `telegram_dm_topic_bindings` の SQLite テーブル |

このふたつは同じボットの上で共存できます。あるユーザーの個人チャットからは `/topic` を使い、他のチャットについては `extra.dm_topics` が運用者の決めたトピックを管理し続ける、という形です。

### 前提条件 {#prerequisites}

**@BotFather** で自分のボットを開き、**Bot Settings → Threads Settings** へ進みます:

1. **Threaded Mode** を有効にします（`has_topics_enabled` が立ちます）
2. 利用者によるトピックの作成を**無効にしない**でください（`allows_users_to_create_topics` を有効のままにします）

利用者が初めて `/topic` を実行したとき、Hermes は `getMe` を呼んでこのふたつのフラグを確認します。どちらかが無効なら、Hermes は BotFather の Threads Settings 画面のスクリーンショットを送り、何を切り替えればよいかを説明します。前提条件が満たされるまで有効化は行われません。

### 有効にするまでの流れ {#activation-flow}

ルートの個人チャットから、次を送ります:

```
/topic
```

Hermes は次のように動きます:

1. `getMe().has_topics_enabled` と `allows_users_to_create_topics` を確認する
2. どちらも有効なら、この個人チャットで複数セッションのトピックモードを有効にする
3. 状態表示やコマンド用に **System** トピックを作ってピン留めする（できる範囲で）
4. 復元できる、未割り当ての以前の Telegram セッションの一覧を返す

有効にすると、**ルートの個人チャットはロビーになります**。普通の依頼は拒否され、**All Messages** を使うよう案内されます。システムコマンド（`/status`、`/sessions`、`/usage`、`/help` など）はルートでも今までどおり使えます。

### 新しいトピックを作る（利用者側の操作） {#creating-a-new-topic-end-user-flow}

1. Telegram でボットとの個人チャットを開きます
2. ボットの画面上部にある **All Messages** をタップして、何かメッセージを送ります
3. Telegram がそのメッセージ用に新しいトピックを作ります
4. Hermes がそのトピックの中で応答します。これでそのトピックは独立したセッションになりました

トピックはそれぞれ、専用の会話履歴・モデルの状態・ツールの実行・セッション ID を持ちます。分離のキーは `agent:main:telegram:dm:{chat_id}:{thread_id}` で、設定で決める個人チャットのトピックの分離と同じ形です。

### トピック名の自動変更 {#auto-renamed-topics}

Hermes が（最初のやり取りのあと、自動命名の処理で）トピックのセッション名を作ると、Telegram のトピック名もそれに合わせて変わります。たとえば "New Topic" が "Database migration plan" になります。この改名はできる範囲での処理で、失敗してもログに残るだけでセッションは壊れません。

これを止めて、自分で付けたトピック名をそのまま残したい場合は、次を設定します:

```yaml
gateway:
  platforms:
    telegram:
      extra:
        disable_topic_auto_rename: true
```

このフラグを立てても、Hermes は内部的なセッション名を作り続けます（`hermes sessions` や TUI などで使われます）が、Telegram のトピック名は書き換えません。BotFather の Threaded Mode の下でトピックを自分で整理していて、最初の返信のたびに名前を上書きされたくない場合に便利です。

### トピックの中での `/new` {#new-inside-a-topic}

いま開いているトピックのセッションをリセットします（新しいセッション ID、まっさらな履歴）。他のトピックには影響しません。Hermes は、並行して作業したいなら（**All Messages** から）別のトピックを作るほうがたいてい目的に合う、という案内を添えて返信します。

### 以前のセッションを復元する {#restoring-a-previous-session}

トピックの中で、次を送ります:

```
/topic <session-id>
```

これで、新しく始める代わりに、いま開いているトピックを既存の Hermes のセッションに割り当てます。トピックモードを有効にする前に始めた会話を続けたいときに便利です。制限は次のとおりです:

- 対象のセッションは、同じ Telegram ユーザーのものである必要があります
- 対象のセッションが、別のトピックにすでに割り当てられていないことが必要です

Hermes はセッション名を添えて確認を返し、文脈のために直前のアシスタントのメッセージを再表示します。

セッション ID を調べるには、ルートの個人チャットで（引数なしの）`/topic` を送ってください。そのユーザーの未割り当ての Telegram セッションを Hermes が一覧します。

### トピックの中での（引数なしの）`/topic` {#topic-inside-a-topic-no-argument}

いま開いているトピックの割り当てを表示します。セッション名、セッション ID、そして `/new` と別のトピックを作るのとの使い分けについての案内が出ます。

### 内部の動き {#under-the-hood}

- 有効化の状態は `state.db` の `telegram_dm_topic_mode(chat_id, user_id, enabled, ...)` に保存されます
- トピックの割り当ては `telegram_dm_topic_bindings(chat_id, thread_id, session_id, ...)` に保存され、`session_id` に `ON DELETE CASCADE` が付いています。セッションを間引くと、そのトピックの割り当ても自動で消えます
- トピックモード用の SQLite のマイグレーションは**必要になってから走ります**。最初の `/topic` の呼び出し時に実行され、ゲートウェイの起動時には走りません。そのプロファイルで誰かが `/topic` を使うまで、`state.db` は変わりません
- 受信した個人チャットのメッセージはそれぞれ、自分の `(chat_id, thread_id)` の割り当てを調べます。割り当てがあれば、`SessionStore.switch_session()` を通じて対応するセッションへ振り分けられ、セッションキーとセッション ID の対応がディスク上でも食い違わないようにします
- トピックの中での `/new` は割り当ての行を新しいセッション ID に書き換えるので、次のメッセージからは新しいセッションのまま進みます
- `extra.dm_topics` に書いたトピックは**自動で改名されません**。複数セッションモードが有効でも、運用者が付けた名前がそのまま残ります
- `extra.disable_topic_auto_rename: true` を設定すると、そのチャットの**すべての**トピック（Threaded Mode で作ったその場かぎりのトピックも含む）で自動改名が止まります
- フォーラム化した個人チャットの General（先頭にピン留めされる）トピックは、Telegram がそのメッセージを `message_thread_id=1` で届けても thread_id なしで届けても、ルートのロビーとして扱われます
- ルートのロビーでの案内は、チャットごとに 30 秒に 1 通までに制限されます。トピックモードが有効なのを忘れてルートに 10 回入力しても、返事が 10 回来ることはありません
- BotFather の設定手順のスクリーンショットは、チャットごとに 5 分に 1 通までに制限されます。Threads Settings が無効のまま `/topic` を何度も試しても、同じ画像が繰り返し送られることはありません
- トピックの中で始めた `/background <prompt>` は、その結果を同じトピックに返します。バックグラウンドのセッションは、そのトピックの自動改名を引き起こしません
- `/topic` 自体もボットのユーザー認証の判定を通ります。許可されていない個人チャットからは、有効化ではなく拒否が返ります

### 複数セッションモードを無効にする {#disabling-multi-session-mode}

ルートの個人チャットで `/topic off` を送ります。Hermes は該当の行を無効にし、そのチャットの `(thread_id → session_id)` の割り当てを消して、ルートの個人チャットは普通の Hermes のチャットに戻ります。Telegram 側の既存のトピックが消えるわけではなく、独立したセッションとして扱われなくなるだけです。あとから `/topic` をもう一度実行すれば、また有効にできます。

手作業で片付けたい場合（たとえば多数のチャットをまとめて初期化したいとき）は、行を直接消してください:

```bash
sqlite3 ~/.hermes/state.db \
  "UPDATE telegram_dm_topic_mode SET enabled = 0 WHERE chat_id = '<your_chat_id>'; \
   DELETE FROM telegram_dm_topic_bindings WHERE chat_id = '<your_chat_id>';"
```

### Hermes を古い版に戻す場合 {#downgrading-hermes}

`/topic` より前の Hermes に戻すと、この機能は単に動かなくなります。`telegram_dm_topic_mode` と `telegram_dm_topic_bindings` のテーブルは `state.db` に残りますが、古いコードからは無視されます。個人チャットはスレッド単位の元々の分離に戻り（`build_session_key` によって `message_thread_id` ごとにセッションが分かれます）、既存の Telegram のトピックは並行セッションとして今までどおり使えます。ルートの個人チャットはロビーではなくなり、そこでのメッセージは以前のようにエージェントへ渡ります。もう一度新しい版に上げれば、複数セッションモードは元の状態のまま再び有効になります。

## グループのフォーラムトピックへのスキル割り当て {#group-forum-topic-skill-binding}

**トピックモード**（フォーラムトピックとも呼ばれます）を有効にしたスーパーグループでは、すでにトピック単位でセッションが分かれています。`thread_id` ごとに専用の会話になります。ただし、個人チャットのトピックでのスキル割り当てと同じように、特定のグループのトピックにメッセージが来たときに**スキルを自動で読み込みたい**こともあるでしょう。

### 使いどころ {#use-case}

作業の流れごとにフォーラムトピックを分けている、チームのスーパーグループ:

- **Engineering** のトピック → `software-development` スキルを自動で読み込む
- **Research** のトピック → `arxiv` スキルを自動で読み込む
- **General** のトピック → スキルなし、汎用のアシスタントとして使う

### 設定 {#configuration}

`~/.hermes/config.yaml` の `platforms.telegram.extra.group_topics` の下にトピックの割り当てを書き足します:

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
| `chat_id` | はい | スーパーグループの数値の ID（`-100` で始まるマイナスの数値） |
| `name` | いいえ | トピックにつける人が読むためのラベル（表示上の意味しかありません） |
| `thread_id` | はい | Telegram のフォーラムトピックの ID。`t.me/c/<group_id>/<thread_id>` のリンクで確認できます |
| `skill` | いいえ | このトピックの新しいセッションで自動的に読み込むスキル |

### 仕組み {#how-it-works}

1. 割り当て済みのグループのトピックにメッセージが届くと、Hermes は `group_topics` の設定から `chat_id` と `thread_id` を探します
2. 一致した項目に `skill` があれば、そのスキルがセッション用に自動で読み込まれます。個人チャットのトピックへのスキル割り当てと同じ動きです
3. `skill` を持たないトピックはセッションの分離だけが働きます（従来どおりで、変わりません）
4. 割り当てのない `thread_id` や `chat_id` は黙って素通りします。エラーも出ず、スキルも読み込まれません

### 個人チャットのトピックとの違い {#differences-from-dm-topics}

| | 個人チャットのトピック | グループのトピック |
|---|---|---|
| 設定のキー | `extra.dm_topics` | `extra.group_topics` |
| トピックの作成 | `thread_id` がなければ Hermes が API で作る | 管理者が Telegram の画面で作る |
| `thread_id` | 作成後に自動で埋まる | 自分で設定する必要がある |
| `icon_color` / `icon_custom_emoji_id` | 対応している | 対象外（見た目は管理者が決める） |
| スキルの割り当て | ✓ | ✓ |
| セッションの分離 | ✓ | ✓（フォーラムトピックには元から備わっている） |

:::tip
トピックの `thread_id` を調べるには、Telegram の Web 版かデスクトップ版でそのトピックを開き、URL を見てください。`https://t.me/c/1234567890/5` の最後の数字（`5`）が `thread_id` です。スーパーグループの `chat_id` は、グループの ID の頭に `-100` を付けたものです（グループ `1234567890` なら `-1001234567890`）。
:::

## 最近の Bot API の機能 {#recent-bot-api-features}

- **Bot API 9.4（2026 年 2 月）:** 個人チャットのトピック。ボットが `createForumTopic` で 1 対 1 の個人チャットにフォーラムトピックを作れます。Hermes はこれをふたつの別々の機能に使っています。運用者が用意する[個人チャットのトピック](#private-chat-topics-bot-api-94)（設定で決める、固定のトピック一覧）と、利用者が主導する[個人チャットの複数セッションモード](#multi-session-dm-mode-topic)（`/topic` で有効化、利用者が好きなだけトピックを作れる）です。
- **プライバシーポリシー:** Telegram はボットにプライバシーポリシーを持つことを求めるようになりました。BotFather の `/setprivacy_policy` で設定してください。設定しない場合、Telegram が仮のものを自動生成することがあります。不特定多数に公開するボットではとくに大事です。
- **Bot API 9.5（2026 年 3 月）: `sendMessageDraft` によるネイティブのストリーミング。** Hermes は Telegram のネイティブなドラフトによるストリーミング API を、個人チャット向けの選べる通信方式として実装しています。既定は従来の `editMessageText` の経路のままです。ドラフトのプレビューは、一部の Telegram クライアントで一度たたまれてから描き直されるように見えることがあるためです。

### ストリーミングの通信方式（`gateway.streaming.transport`） {#streaming-transport-gatewaystreamingtransport}

ストリーミングを有効にすると（`gateway.streaming.enabled: true`）、Hermes は 4 つの通信方式からひとつを選びます:

| 値 | 動作 |
|---|---|
| `auto`（既定） | 対応しているチャット（いまのところ Telegram の個人チャット）ではネイティブのドラフトによるストリーミング、それ以外では従来の編集による経路。ドラフトのフレームが失敗しても、うまく従来の経路へ切り替わります。 |
| `draft` | ネイティブのドラフトを強制します。チャットがドラフトに対応していない場合（グループやトピックなど）は、格下げをログに残して編集による経路へ切り替えます。 |
| `edit` | すべての種類のチャットで、従来の `editMessageText` を繰り返す方式を使います。 |
| `off` | ストリーミングを完全に無効にします（最終的な返信だけで、途中経過の更新はありません）。 |

`~/.hermes/config.yaml` では:

```yaml
gateway:
  streaming:
    enabled: true
    transport: auto    # auto | draft | edit | off
```

**個人チャットで `edit`（既定）にしたときの見え方** — ゲートウェイが普通のプレビュー用メッセージを送り、それを `editMessageText` で少しずつ更新していきます。Telegram のドラフトプレビューがたたまれて戻るような見え方を避けられます。

**個人チャットで `auto` か `draft` にしたときの見え方** — Telegram が、トークンごとに更新されるアニメーション付きのドラフトプレビューを表示します。返信が終わると通常のメッセージとして届き、ドラフトのプレビューはクライアント側で自然に消えます。ドラフトにはメッセージ ID がないので、チャット履歴に残るのは最終的な回答です。

**グループ、スーパーグループ、フォーラムトピックはどうなる?** Telegram は `sendMessageDraft` を個人チャットに限定しています。それ以外については、ゲートウェイが何も意識させずに編集による経路へ切り替えます。使い勝手は以前と同じです。

**ドラフトのフレームが失敗したら?** どんな失敗でも（一時的なネットワークのエラー、サーバー側の拒否、古い python-telegram-bot の導入など）、その応答はそれ以降のストリーミングを編集による経路に切り替えます。次の応答であらためて試されます。

## 表示: リッチメッセージ、表、リンクのプレビュー {#rendering-rich-messages-tables-and-link-previews}

**リッチメッセージ（Bot API 10.1）。** 従来の MarkdownV2 の経路では表現が落ちてしまうもの、つまり表・チェックリスト・折りたためる `<details>`・ブロックの数式を含む最終的な返信は、エージェントの**生の markdown** のまま Telegram のネイティブな [`sendRichMessage`](https://core.telegram.org/bots/api#sendrichmessage) で送られます。クライアント側で平たくつぶされることなく、そのまま表示されます。個人チャットでは既定の `rich_drafts: false` により、アニメーションするプレビューは編集可能な従来のドラフトの経路のままにして、クライアントとの相性を保ちます。そのうえで、履歴に残る最終的なメッセージを `sendRichMessage` で送ります。`rich_drafts: true` にすると、その場で更新されるプレビューにも `sendRichMessageDraft` が使われます。編集によるストリーミングでは、`editMessageText` の `rich_message` パラメータを使って、既存のプレビューをその場で確定させることもできます。普通の返信（素の文章、太字/斜体、単純な箇条書き）は、クライアント間で文字の太さや間隔をそろえるために MarkdownV2 の経路のままです。

内容が 32,768 文字というリッチテキストの上限を超えると、リッチの経路は自動的に飛ばされます。また Telegram からの拒否（古い `python-telegram-bot` で使えないエンドポイント、解析のエラー、大きすぎるブロックや列数）があった場合も、**何も意識させずに** MarkdownV2 の経路へ切り替わるので、メッセージが失われることはありません。一時的なエラーやネットワークのエラーでは黙って送り直すことは*しません*（最終メッセージが二重に届かないようにするためです）。

**MarkdownV2 での代替表示。** あるメッセージでリッチの経路が使えない場合、Hermes は markdown を MarkdownV2 に変換します。MarkdownV2 には表の記法がないので、パイプ記法の表は次のように整えられます:

- **小さい表**は**行ごとの箇条書き**に開かれます。各行が、列の見出しの下に読みやすい箇条書きとして並びます。2〜4 列で、セルが短い表に向いています。
- **大きい表や横に広い表**は、列をそろえた**コードブロック**として表示され、崩れないようにします。

リッチメッセージは**明示的に有効にする**方式です。既定が従来の MarkdownV2 の経路のままなのは、いまの Telegram のクライアントでは Bot API のリッチメッセージをプレーンテキストとしてコピーしづらいことがあり、コマンドの断片やスマートフォンから別の端末へ渡すときにとくに困るからです。表・チェックリスト・details・数式をそのまま表示させたい場合は、次を設定します:

```yaml
gateway:
  platforms:
    telegram:
      extra:
        rich_messages: true
        rich_drafts: false
```

この設定は、クライアント側の表示やコピーのしやすさのためのものです。Telegram がリッチな API 呼び出しを拒否した場合には、Hermes がすでに自動で従来の経路へ切り替えます。`rich_drafts` は、Telegram の個人チャットでストリーミング中に使う、試験的なリッチのドラフトプレビューの経路を制御します。既定で無効なのは、Telegram のデスクトップ版や macOS 版では、チャットが描き直されるまでリッチなドラフトのフレームが重なって見えることがあるためです。リッチメッセージは有効にしたまま、表については従来の「常にコードブロック」の挙動だけを使いたい場合は、`config.yaml` で `telegram.pretty_tables: false` を設定して表の整形を切ってください（既定は `true`）。

**リンクのプレビュー。** Telegram はボットのメッセージに含まれる URL のプレビューを自動で作ります。これを抑えたい場合は（長い `/tools` の出力、リンクを 10 個並べたエージェントの返信など）:

```yaml
gateway:
  platforms:
    telegram:
      extra:
        disable_link_previews: true
```

有効にすると、Hermes は送信するすべてのメッセージに Telegram の `LinkPreviewOptions(is_disabled=True)` を付け、古い `python-telegram-bot` では従来の `disable_web_page_preview` パラメータに切り替えます。

## グループの許可一覧 {#group-allowlisting}

Telegram のグループとフォーラムのチャットには、互いに独立したふたつの関門を設定できます:

- **送信者のユーザー ID**（`group_allow_from` / `TELEGRAM_GROUP_ALLOWED_USERS`）— グループやフォーラムのメッセージにだけ効く、送信者単位の許可一覧です。特定のユーザーにグループの中でボットを呼び出させたいけれど、`TELEGRAM_ALLOWED_USERS`（こちらに入れると個人チャットでも使えるようになります）には入れたくない、というときに使います。
- **チャット ID**（`group_allowed_chats` / `TELEGRAM_GROUP_ALLOWED_CHATS`）— チャット単位の許可一覧です。ここに書いたグループやフォーラムのメンバーなら誰でもボットとやり取りできます。グループに入っていること自体をアクセスの条件にする、チームやサポート向けのボットに向いています。

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

対応する環境変数:

```bash
TELEGRAM_ALLOWED_USERS="123456789"
TELEGRAM_GROUP_ALLOWED_USERS="987654321"
TELEGRAM_GROUP_ALLOWED_CHATS="-1001234567890"
```

動作:

- `TELEGRAM_ALLOWED_USERS` はすべての種類のチャット（個人チャット、グループ、フォーラム）に効きます。
- `TELEGRAM_GROUP_ALLOWED_USERS` は、書いた送信者をグループやフォーラムでだけ許可します。`TELEGRAM_ALLOWED_USERS` に入っていなければ、ボットに個人チャットを送ることはできません。
- `TELEGRAM_GROUP_ALLOWED_CHATS` に書いたチャットでは、送信者が誰であってもそのチャットの全メンバーが許可されます。
- どの項目でも `*` を使うと、任意の送信者やチャットを許可できます。
- これらは、既存のメンションやパターンによる起動条件、そして `group_topics` と `ignored_threads` の上に重なって働きます。

### PR #17686 より前からの移行 {#migration-from-before-pr-17686}

この分割より前は `TELEGRAM_GROUP_ALLOWED_USERS` しかつまみがなく、利用者はそこに**チャット ID** を書いていました。互換性のため、`TELEGRAM_GROUP_ALLOWED_USERS` に入っている（`-` で始まる）チャット ID の形をした値は今もチャット ID として扱われ、非推奨の警告が一度だけログに出ます。移行の方法は次のとおりです:

```bash
# Old (still works, but deprecated)
TELEGRAM_GROUP_ALLOWED_USERS="-1001234567890"

# New
TELEGRAM_GROUP_ALLOWED_CHATS="-1001234567890"
```

### ゲストの @メンションによる例外（`guest_mode`） {#guest-mention-bypass-guestmode}

通常の設定では、`group_allowed_chats` は厳しい関門です。一覧にないグループからのメッセージは、メンバーがボットを明示的に @メンションしても黙って捨てられます。サポートやチーム向けのボットには、これが正しい既定です。

もっと気楽な使い方、たとえば友人同士のグループチャットで、ボットには**基本的に黙っていてほしい**が**名指しで呼ばれたときだけ応じてほしい**という場合は、`guest_mode` を有効にします:

```yaml
gateway:
  platforms:
    telegram:
      extra:
        group_allowed_chats:
          - "-1001234567890"   # your main allowlisted group
        guest_mode: true       # non-allowlisted groups: allow on @mention only
```

対応する環境変数:

```bash
TELEGRAM_GUEST_MODE=true
```

既定は `false` です。

`guest_mode: true` にすると、許可一覧にないグループからのメッセージは、ボットを明示的に @メンションしている場合に**限って**処理されます。メンションは毎回必要で、ゲストとしてのやり取りに会話の粘りはありません。ボットが呼ばれてもいない友人グループのスレッドに、勝手に混ざり続けることはないということです。

個人チャットと許可一覧に入っているグループの動きは、これまでとまったく同じです。

## スラッシュコマンドのアクセス制御 {#slash-command-access-control}

既定では、許可されたユーザーは全員がすべてのスラッシュコマンドを実行できます。許可一覧を**管理者**（すべてのスラッシュコマンドを使える）と**一般ユーザー**（明示的に許可したコマンドだけを使える）に分けるには、プラットフォームの `extra` ブロックに `allow_admin_from` と `user_allowed_commands` を足します:

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

- ある範囲（個人チャットまたはグループ）で `allow_admin_from` に載っているユーザーは、その場で登録されているスラッシュコマンドを**すべて**実行できます。組み込みのコマンドも、プラグインが登録したコマンドも含みます。
- `allow_from` には載っているが `allow_admin_from` には**載っていない**ユーザーは、`user_allowed_commands` に書かれたコマンドと、常に許可される最低限の `/help` と `/whoami` だけを実行できます。
- 普通の会話（スラッシュコマンド以外のメッセージ）には影響しません。管理者でないユーザーも、これまでどおりエージェントと会話できます。任意のコマンドを実行できないだけです。
- **以前との互換性:** ある範囲について `allow_admin_from` を設定していなければ、その範囲ではスラッシュコマンドの制限は働きません。すでに動いている環境は、何も変えずにそのまま使えます。
- 個人チャットで管理者だからといって、グループでも管理者になるわけではありません。範囲ごとに管理者の一覧は別々です。
- `group_allow_admin_from` だけを設定した場合、個人チャットの範囲は制限なし（以前との互換）のままです。

`/whoami` を使うと、いまの範囲、自分の区分（管理者 / 一般ユーザー / 制限なし）、そして実行できるスラッシュコマンドを確認できます。

## 対話式のモデル選択 {#interactive-model-picker}

Telegram のチャットで引数なしの `/model` を送ると、Hermes はモデルを切り替えるためのインラインキーボードを表示します:

1. **プロバイダーの選択** — 利用できるプロバイダーとモデル数がボタンで並びます（例: "OpenAI (15)"、いま使っているプロバイダーなら "✓ Anthropic (12)"）。
2. **モデルの選択** — ページ分けされたモデルの一覧に、**Prev**/**Next** の移動、プロバイダーの選択に戻る **Back**、そして **Cancel** が付きます。

現在のモデルとプロバイダーは上部に表示されます。移動はすべて同じメッセージをその場で書き換える形で行われるので、チャットが散らかりません。

:::tip
モデル名がわかっているなら、`/model <name>` と直接打てば選択画面を飛ばせます。`/model <name> --global` と打つと、変更をセッションをまたいで保持できます。
:::

## DNS-over-HTTPS による代替 IP {#dns-over-https-fallback-ips}

一部の制限のあるネットワークでは、`api.telegram.org` が届かない IP に解決されることがあります。Telegram のアダプターには、TLS のホスト名と SNI を正しく保ったまま別の IP へ接続を試し直す、**代替 IP** の仕組みが入っています。

### 仕組み {#how-it-works}

1. `TELEGRAM_FALLBACK_IPS` が設定されていれば、その IP をそのまま使います。
2. 設定されていなければ、アダプターは **Google DNS** と **Cloudflare DNS** に DNS-over-HTTPS（DoH）で問い合わせ、`api.telegram.org` の別の IP を自動で調べます。
3. 既知の Telegram API の IPv4 アドレスを、デュアルスタックの `api.telegram.org` というホスト名より**先に**試します。IPv6 の経路が黙って捨てられていると `connect()` がエラーも返さずに止まり続けることがあり、以前はそれがイベントループを占有して 30 秒の初期化の期限が発火しなくなっていました。
4. DoH も遮断されているか時間切れになった場合は、ハードコードされた IPv4 の初期一覧（`149.154.166.110`、`149.154.167.220`）が、その IPv4 優先の一覧として使われます。ホスト名は最後の手段のままです。
5. どれかの経路が成功すると、それが「そのまま使われる」ようになり、以降のリクエストは直接その経路を通ります。ホスト名は IPv6 しかないネットワークのための最後の手段として残ります。

### 設定 {#configuration}

```bash
# Explicit fallback IPs (comma-separated)
TELEGRAM_FALLBACK_IPS=149.154.167.220,149.154.167.221
```

あるいは `~/.hermes/config.yaml` で:

```yaml
platforms:
  telegram:
    extra:
      fallback_ips:
        - "149.154.167.220"
```

:::tip
ふつうは手で設定する必要はありません。DoH による自動探索が、制限のあるネットワークのたいていの場面をさばいてくれます。`TELEGRAM_FALLBACK_IPS` が要るのは、そのネットワークで DoH まで遮断されている場合だけです。端末側で IPv6 が壊れている場合は、`config.yaml` に `network.force_ipv4: true` を設定して、プロセス全体で AAAA の問い合わせを飛ばすこともできます。
:::

## プロキシへの対応 {#proxy-support}

インターネットに出るのに HTTP のプロキシが必要なネットワーク（企業ではよくあります）では、Telegram のアダプターが標準的なプロキシの環境変数を自動で読み、すべての接続をプロキシ経由にします。

### 対応している変数 {#supported-variables}

アダプターは次の環境変数を順に見て、最初に設定されているものを使います:

1. `HTTPS_PROXY`
2. `HTTP_PROXY`
3. `ALL_PROXY`
4. `https_proxy` / `http_proxy` / `all_proxy`（小文字の変種）

### 設定 {#configuration}

ゲートウェイを起動する前に、環境にプロキシを設定します:

```bash
export HTTPS_PROXY=http://proxy.example.com:8080
hermes gateway
```

あるいは `~/.hermes/.env` に書き足します:

```bash
HTTPS_PROXY=http://proxy.example.com:8080
```

プロキシは主となる通信にも、代替 IP を使うすべての通信にも適用されます。Hermes 側で追加の設定は要りません。環境変数が設定されていれば、自動的に使われます。

:::note
ここで説明しているのは、Hermes が Telegram への接続に使う独自の代替通信の層です。他の場所で使われている標準の `httpx` のクライアントは、もともとプロキシの環境変数に従います。
:::

## メッセージへのリアクション {#message-reactions}

ボットは処理の状況を目で見てわかるように、メッセージに絵文字のリアクションを付けられます:

- 👀 ボットがメッセージの処理を始めたとき
- ✅ 応答を無事に届けられたとき
- ❌ 処理中にエラーが起きたとき

リアクションは**既定で無効**です。`config.yaml` で有効にします:

```yaml
telegram:
  reactions: true
```

環境変数でも設定できます:

```bash
TELEGRAM_REACTIONS=true
```

:::note
Discord ではリアクションが積み重なりますが、Telegram の Bot API は 1 回の呼び出しでボットのリアクションをすべて置き換えます。👀 から ✅ や ❌ への切り替わりは一気に起きるので、両方が同時に見えることはありません。
:::

:::tip
グループでボットにリアクションを付ける権限がない場合、リアクションの呼び出しは黙って失敗し、メッセージの処理はそのまま続きます。
:::

## チャンネルごとの指示文 {#per-channel-prompts}

特定の Telegram のグループやフォーラムトピックに、その場かぎりのシステム指示文を割り当てられます。指示文は毎ターン実行時に差し込まれ、会話の記録には残らないので、変更はすぐに反映されます。

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

キーはチャット ID（グループやスーパーグループ）か、フォーラムトピックの ID です。フォーラムのグループでは、トピック単位の指示文がグループ単位の指示文を上書きします:

- グループ `-1001234567890` のトピック `42` のメッセージ → トピック `42` の指示文を使う
- トピック `99`（個別の設定なし）のメッセージ → グループ `-1001234567890` の指示文にさかのぼる
- 設定のないグループのメッセージ → チャンネルの指示文は適用されない

YAML の数値のキーは、自動的に文字列に直されます。

## うまくいかないとき {#troubleshooting}

| 症状 | 対処 |
|---------|----------|
| ボットがまったく応答しない | `TELEGRAM_BOT_TOKEN` が正しいか確かめます。`hermes gateway` のログにエラーが出ていないか見てください。 |
| ボットが "unauthorized" と返す | 自分のユーザー ID が `TELEGRAM_ALLOWED_USERS` に入っていません。@userinfobot で確かめ直してください。 |
| ボットがグループのメッセージを無視する | プライバシーモードが有効になっている可能性が高いです。無効にするか（ステップ 3）、ボットをグループの管理者にしてください。**プライバシー設定を変えたら、ボットを外して追加し直すのを忘れずに。** |
| ボイスメッセージが文字起こしされない | 音声認識が使える状態か確かめます。手元で文字起こしするなら `faster-whisper` を導入し、そうでなければ `~/.hermes/.env` に `GROQ_API_KEY` か `VOICE_TOOLS_OPENAI_KEY` を設定してください。 |
| 音声の返信がボイスバブルではなくファイルで届く | `ffmpeg` を導入してください（Edge TTS の Opus 変換に必要です）。 |
| ボットのトークンが無効化された、または正しくない | BotFather で `/revoke` のあと `/newbot`、あるいは `/token` で新しいトークンを発行します。`.env` ファイルを更新してください。 |
| webhook に更新が届かない | `TELEGRAM_WEBHOOK_URL` が外から届くか確かめます（`curl` で試せます）。プラットフォームやリバースプロキシが、URL のポートに来た HTTPS の通信を `TELEGRAM_WEBHOOK_PORT` で指定したローカルの待ち受けポートへ渡すようにしてください（両者の番号が同じである必要はありません）。SSL/TLS が有効になっていることも確かめます。Telegram は HTTPS の URL にしか送りません。ファイアウォールの設定も見てください。 |

## コマンド実行の承認 {#exec-approval}

エージェントが危険かもしれないコマンドを実行しようとすると、チャットで承認を求めてきます:

> ⚠️ This command is potentially dangerous (recursive delete). Reply "yes" to approve.

"yes"/"y" と返せば承認、"no"/"n" と返せば拒否になります。

## 対話的な問いかけ（clarify） {#interactive-prompts-clarify}

エージェントが `clarify` ツールを呼んだとき（どの進め方がよいかを尋ねる、作業後の感想を聞く、判断の前に確認する、など）、Telegram ではその質問が**インラインキーボードのボタン**として表示されます:

> ❓ Which framework should I use for the dashboard?
>
> [1. Next.js] [2. Remix] [3. Astro]
> [✏️ Other (type answer)]

ボタンをタップして答えるか、**Other** をタップして自由に入力します（次に送ったメッセージが回答になります）。選択肢のない自由回答の `clarify` ではボタンは出ず、次のメッセージがそのまま回答として使われます。

回答の待ち時間は `~/.hermes/config.yaml` の `agent.clarify_timeout` で設定します（既定は `600` 秒）。時間内に返事がないと、エージェントは決まった目印のメッセージで待機を解き、止まったままにならずに進め方を変えます。

## プッシュ通知の量 {#push-notification-volume}

Telegram は、ボットが送るメッセージのたびにプッシュ通知を出します。エージェントの長いターンでツールの進捗の吹き出し、ストリーミングの更新、状態の知らせが飛ぶと、あっという間にうるさくなります。Telegram のアダプターには通知の方式がふたつあります:

| 方式 | 動作 |
|------|----------|
| `important`（既定） | **最終的な応答**、**承認の問い合わせ**、**スラッシュコマンドの確認**だけが通知されます。ツールの進捗、ストリーミングの断片、状態のメッセージは `disable_notification=true` で送られます。 |
| `all` | 送信するすべてのメッセージがプッシュ通知を出します。以前の挙動で、ツールの呼び出しをひとつ残らず知りたい場合に選んでください。 |

`~/.hermes/config.yaml` で設定します:

```yaml
display:
  platforms:
    telegram:
      notifications: important   # or "all"
```

環境変数での上書き（ちょっと試すのに便利です）:

```bash
HERMES_TELEGRAM_NOTIFICATIONS=all
```

知らない値を指定すると警告がログに出て、`important` に戻ります。

## 状態メッセージはその場で書き換わる {#status-messages-edited-in-place}

Telegram のアダプターは、繰り返し出るエージェントの状態の知らせ（「Compressing context…」「Calling tool…」など）を `send_or_update_status()` に通します。この関数は `{(chat_id, status_key) → message_id}` のキャッシュを持っていて、2 回目以降は新しい吹き出しを増やす代わりに**既存の吹き出しを書き換えます**。`status_key` が違えばそれぞれ別のメッセージになり、チャットが違えばぶつかることもありません。書き換えに失敗した場合（利用者がそのメッセージを消した、Telegram が編集を認める時間を過ぎた、など）はキャッシュの項目が捨てられ、次の知らせで新しいメッセージを投稿してその ID を覚え直します。設定は要りません。これが Telegram での既定の動作です。`send_or_update_status` を実装していない他のアダプターは、これまでどおり素の `send()` に落ちます。

## エージェントのターン中は受信したメッセージをピン留めする {#pin-incoming-user-message-during-agent-turn}

利用者がエージェントのターンを起こすメッセージを送ると、Telegram のアダプターはそのターンのあいだ、その受信メッセージをピン留めし、応答が終わるとピンを外します。ボットがメッセージを無視しているのではなく、いま取り組んでいることを軽く目で示すための工夫です。ピン留めは `disable_notification=true` で行われるので、余計な通知は出ません。設定は要りません。

## セキュリティ {#security}

:::warning
ボットとやり取りできる相手を制限するため、`TELEGRAM_ALLOWED_USERS` は必ず設定してください。設定しない場合、ゲートウェイは安全のために既定ですべての利用者を拒否します。
:::

ボットのトークンを人目に触れる場所に置かないでください。漏れてしまったら、BotFather の `/revoke` コマンドですぐに無効化します。

詳しくは[セキュリティの解説](/hermes/docs/user-guide/security/)を参照してください。利用者の認可をもっと柔軟に扱いたい場合は、[個人チャットでのペアリング](/hermes/docs/user-guide/messaging/#dm-pairing-alternative-to-allowlists)も使えます。
