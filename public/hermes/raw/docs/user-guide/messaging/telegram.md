---
title: "Telegram"
description: "Hermes Agent を Telegram のボットとして設定する"
upstream_path: user-guide/messaging/telegram.md
upstream_blob: 2b8cebbe6b6313847656f93e526c18c399bd4c3d
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/telegram
---

# Telegram の設定 {#telegram-setup}

Hermes Agent は、機能をひととおり備えた会話ボットとして Telegram に組み込めます。つないでしまえば、どの端末からでもエージェントと話せますし、送ったボイスメモは自動で文字起こしされ、定期実行の結果も受け取れて、グループチャットでも使えます。この連携は [python-telegram-bot](https://python-telegram-bot.org/) の上に作られていて、テキスト、音声、画像、ファイルの添付に対応しています。

## すぐに設定する（ダッシュボードとデスクトップアプリ） {#quick-setup-dashboard-and-desktop-app}

[ダッシュボード](/hermes/docs/user-guide/features/web-dashboard/) と [デスクトップアプリ](/hermes/docs/user-guide/desktop/) の **Messaging → Telegram** のページには、**Create with QR** のボタンがあります。そのコードを Telegram で読み取る（またはリンクを開く）と、Hermes がボットを作り、あなたの Telegram のユーザー ID を検出し、`TELEGRAM_BOT_TOKEN` と `TELEGRAM_ALLOWED_USERS` をプロファイルの `.env` に書き込んで、ゲートウェイを再起動します。自分でボットを作りたい場合は、下の手作業の手順に従ってください。

## 手順 1: BotFather でボットを作る {#step-1-create-a-bot-via-botfather}

Telegram のボットにはどれも、Telegram 公式のボット管理ツールである [@BotFather](https://t.me/BotFather) が発行する API トークンが必要です。

1. Telegram を開いて **@BotFather** を検索するか、[t.me/BotFather](https://t.me/BotFather) を開きます
2. `/newbot` を送ります
3. **表示名**（例: "Hermes Agent"）を決めます — これは何でも構いません
4. **ユーザー名**を決めます — これは重複してはならず、`bot` で終わる必要があります（例: `my_hermes_bot`）
5. BotFather が **API トークン**を返します。こんな見た目です。

```
123456789:ABCdefGHIjklMNOpqrSTUvwxYZ
```

:::warning
ボットのトークンは人目に触れないようにしてください。これを持っている人はボットを操作できます。漏れたら、BotFather の `/revoke` ですぐ失効させてください。
:::

## 手順 2: ボットを整える（任意） {#step-2-customize-your-bot-optional}

次の BotFather のコマンドで使い勝手が良くなります。@BotFather に送って使ってください。

| コマンド | 用途 |
|---------|---------|
| `/setdescription` | 利用者が会話を始める前に表示される「このボットは何ができる?」の文章 |
| `/setabouttext` | ボットのプロフィールページに出る短い文章 |
| `/setuserpic` | ボットのアイコンをアップロードする |
| `/setcommands` | コマンドのメニューを定義する（チャットの `/` のボタン） |
| `/setprivacy` | ボットがグループのすべてのメッセージを見られるかを制御する（手順 3 を参照） |

:::tip
`/setcommands` の出発点としては、次のあたりが使いやすいです。

```
help - Show help information
new - Start a new conversation
sethome - Set this chat as the home channel
```
:::

### オンライン / オフラインの表示（任意） {#onlineoffline-status-indicator-optional}

Telegram のボットには、本当の意味でのオンライン / オフラインを示す点がありません。あの緑の点は
*利用者アカウント*の機能で、Bot API がボット向けに出しているものではありません。いちばん近いのは、
ボットの**短い説明**（プロフィールで名前の下に出る行）です。

`status_indicator` を有効にすると、Hermes はゲートウェイの接続時にその短い説明を **Online** に、
きれいに停止したときに **Offline** に書き換えます。

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

- 短い説明はボットの**全体**に対するもので（すべての利用者に見えます）、チャットごとではありません。
  利用者はボットのプロフィールページで目にするのであって、開いているチャットの中の生のバッジとして
  見るわけではありません。
- 「Offline」が書かれるのは、ゲートウェイが**きれいに**停止したとき（`/stop`、`disconnect`）だけです。
  ひどい落ち方をすると最後の状態が残ります。プロフィールの文章による表示に付きものの限界です。
- ボットの全体のプロフィールを書き換えるので、既定では無効です。

### 冷えた状態からの起動で溜まっていた更新（任意） {#cold-boot-pending-queue-optional}

既定では、アダプターは冷えた状態からの起動時にサーバー側に溜まっていた更新を捨てます
（最初の `start_polling` での `drop_pending_updates=True`）。これは常時動いているサーバーには
合っています。再起動は「片付け」であり、待ち行列は古びたものとして扱われます。一方、電源が
落ちるホスト（夜に切るデスクトップなど）には合いません。ゲートウェイが止まっている間に送られた
メッセージは Telegram の Bot API の待ち行列に残り、次の起動時に、Hermes が目にする前に捨てられて
しまいます。黙って、ログもなく、再試行もなしにです。

代わりに、起動時にその溜まった分を順番に受け取りたい場合は `drop_pending_on_cold_boot: false` を
設定します。

```yaml
platforms:
  telegram:
    extra:
      drop_pending_on_cold_boot: false
```

補足:

- 既定は `true` です。自分で選ばない限り、これまでの振る舞いは変わりません。
- 見張りによる再接続（プロセスは生きたままの短いネットワークの不調）では、この設定に関係なく
  待ち行列は必ず保たれます。
- 競合からの回復では、競合する `getUpdates` のセッションを終わらせるために、やはり溜まった更新を
  捨てます。その経路はこの項目とは関係ありません。
- 異常終了のあとは、保たれた待ち行列が、落ちたインスタンスが途中まで処理した更新を再び届けることが
  あります。ふつうは Telegram のオフセットがこれを防ぎますが、長い停止の間に送られた時間に敏感な
  コマンドは、起動時に実行されます。

### 同じ受信の更新が繰り返されたとき {#repeated-inbound-updates}

Hermes は、メッセージのまとめ、コマンド / メディアの処理、観測したグループ履歴の書き込み、
プラグインの観測役よりも前に、繰り返された Telegram の `update_id` を抑えます。
この検査の範囲は、受け取ったアダプターと数値のボット ID です。本文や `message_id` では
重複を判定しません。新しい更新の ID を持つ本物の編集は、これまでどおり処理されます。

これは範囲の限られた、**メモリ上の**保護であって、ちょうど 1 回の保証ではありません。

- アダプターは、直近 4096 件の受け入れ済みを、時間による失効なしで覚えています。処理中の更新は、
  振り分けと、その予定された PTB の処理が終わるまで確保されたままです。ブロックしないネイティブの
  プラグインや、登録されたエラーのコールバックも含みます。
- 同じアダプターに接続し直しても、その履歴は残ります。追い出し、アダプターの入れ替え、プロセスの
  再起動があると、古い更新が再び通ることがあります。ディスク上の再生の台帳には何も書かれません。
- 準備が失敗したり取り消されたりした場合、何も引き渡していなければ確保を解きます。更新がいったん
  まとめ / 保留の待ち行列、ゲートウェイの振り分け、観測役、ネイティブのプラグインに入ったあとは、
  あとでエラーが起きても再び開かれることはありません。ネイティブのプラグインは自分の途中までの
  影響を自分で持つので、その更新や登録されたエラーのコールバックに入ることは、安全側に倒して
  引き渡しとみなします。PTB 自身の例外の記録は引き渡しではありません。キャッシュされていない
  静止ステッカーの画像の解析も引き渡しです。待ちを取り消しても、すでに送った補助のモデルへの
  要求は取り消せないからです。引き渡しより前に捕まえられた準備のエラーは再試行できますが、
  意図的な拒否は終端です。
- 確保を解くのは、あとの配信を許すことであって、Telegram に配信を求めることではありません。
  受信の確認は、エージェントの完了とは独立です。この検査は、失敗した返信を再試行するものでも、
  下流の部品が独自に作業を重複させるのを防ぐものでもありません。

遅れて再生されたと思われる場合は、両方の発生について、ボット / プロファイル、チャット / トピック、
`update_id`、更新の種類、`message_id`、実際に受け取った時刻を見比べてください。編集は
`message_id` を使い回せますし、メッセージの送信時刻は受信時刻ではありません。

### コマンドメニューの優先度と上限（任意） {#command-menu-priority-and-cap-optional}

Hermes は、Telegram のゲートウェイの起動時にコマンドのメニューを自動で登録します。メニューは中央のスラッシュコマンドの登録簿と、条件を満たすプラグイン / スキルのコマンドから作られ、そのあと Telegram が確実に受け取れるよう上限がかけられます。既定の上限は 60 件で、組み込みのコマンドすべてに加えてよく使うスキルのコマンドが見える程度です。

Telegram の `/` の選択肢に残しておきたいスキル、プラグイン、組み込みのコマンドがある場合は、`~/.hermes/config.yaml` で優先度を付けてください。

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

`priority_mode` は、あなたの一覧が Hermes の組み込みの優先の一覧とどう組み合わさるかを決めます。

- `prepend`: あなたのコマンドを先に、そのあと Hermes の既定
- `append`: Hermes の既定を先に、そのあとあなたのコマンド
- `replace`: 優先の並びにあなたの一覧だけを使う

優先度は、上限をかける前の**まとまった**候補の一覧（中核のコマンド、プラグインのコマンド、スキルのコマンド）に対して適用されます。そのため、中核のコマンドだけでメニューが埋まる場合でも、優先されたスキルのコマンドには必ず枠が確保されます。以前はスキルが常に先にアルファベット順で削られていたので、`priority` にかかわらず名前が後ろのスキルは決して現れませんでした。

Telegram は BotCommands を 100 件まで許しますが、大きなコマンドの内容は失敗することがあります。Hermes は確実さのために既定を 60 にし、設定された値を `1..100` に収めます。すべてのコマンドの一覧には `/commands` を使ってください。

### インラインのコマンド選択: すべてのコマンドを検索する（上限なし） {#inline-command-picker-search-every-command-no-cap}

`/` のメニューには上限がありますが、Telegram の**インラインモード**にはありません。有効にすると、どのチャットでも `@yourbotname` に続けて検索語を入力するだけで、**すべて**の Hermes のコマンドと導入済みのスキルを対象にした、その場で絞り込める選択肢が出ます。結果は打鍵ごとに計算されてページ送りされるので、何かが削られることはありません。

```
@yourbotname plan            → tap the /plan result to send it
@yourbotname plan migrate auth to OIDC   → sends /plan migrate auth to OIDC
@yourbotname pdf             → finds skills matching "pdf" by name or description
```

最初の語が一覧を絞り込み、それより後ろはすべて、送られるコマンドの引数として運ばれます。結果をタップすると、そのコマンドはあなたからのふつうのメッセージとして送られるので、標準のコマンドの経路で処理されます（コマンドで始まるメッセージは、プライバシーモードが有効でもボットに届きます）。

**最初に一度だけの設定:** インラインモードは、どの Telegram のボットでも既定では無効です。[@BotFather](https://t.me/BotFather) で `/setinline` を使って有効にしてください（自分のボットを選び、案内の文章を何か設定します。たとえば `Search commands and skills...`）。それまで Telegram はインラインの問い合わせを届けないので、選択肢は動きません。

結果が出るのは、あなたのゲートウェイの許可一覧を通る利用者に対してだけです。許可されていない利用者には空の一覧が返るので、導入済みのスキルの一覧が見知らぬ人に見えることはありません（インラインの問い合わせは、ボットがいないチャットも含めどこからでも送れます）。

## 手順 3: プライバシーモード（グループでは重要） {#step-3-privacy-mode-critical-for-groups}

Telegram のボットには**プライバシーモード**があり、**既定で有効**です。グループでボットを使うときの混乱の原因として、これが最も多いものです。

**プライバシーモードが ON のとき**、ボットが見られるのは次だけです。
- `/` のコマンドで始まるメッセージ
- ボット自身のメッセージへの直接の返信
- 案内のメッセージ（メンバーの参加 / 退出、ピン留めなど）
- ボットが管理者になっているチャンネルのメッセージ

**プライバシーモードが OFF のとき**、ボットはグループのすべてのメッセージを受け取ります。

### プライバシーモードを無効にする方法 {#how-to-disable-privacy-mode}

1. **@BotFather** にメッセージを送ります
2. `/mybots` を送ります
3. 自分のボットを選びます
4. **Bot Settings → Group Privacy → Turn off** と進みます

:::warning
プライバシーの設定を変えたら、**ボットをいったんグループから外して入れ直す必要があります**。Telegram はボットがグループに参加した時点のプライバシーの状態をキャッシュしていて、外して入れ直すまで更新されません。
:::

:::tip
プライバシーモードを無効にする代わりの方法として、ボットを**グループの管理者**に昇格させる手もあります。管理者のボットはプライバシーの設定に関係なく常にすべてのメッセージを受け取るので、全体のプライバシーモードを切り替えずに済みます。
:::

### 自動で返さずにグループの会話を見る {#observe-group-chatter-without-auto-replying}

OpenClaw や Yuanbao のようなグループでの振る舞いにしたい場合は、ボットがふつうのグループのメッセージを**見られる**一方で、直接呼ばれたときだけ**応答する**ように Telegram を設定します。

```yaml
telegram:
  allowed_chats:
    - "-1001234567890"
  group_allowed_chats:
    - "-1001234567890"
  require_mention: true
  observe_unmentioned_group_messages: true
```

このモードを有効にすると、明示的に許可したチャット / トピックからの、メンションのないグループのメッセージが、観測した文脈として共有のチャット / トピックのセッションの記録に書き足されますが、エージェントは動きません。`allowed_chats` はボットが応答する場所を決め、`group_allowed_chats` は観測した文脈に使う共有のグループのセッションを認可するので、このモードでは同じチャット ID を使ってください。同じ許可済みのチャット / トピックで、あとから `@botname` のメンション、ボットへの返信、設定したメンションの型が来れば、その観測した文脈を使えます。きっかけになったメッセージには `[nickname|user_id]` の印が付き、やり取りごとの安全のためのプロンプトも付くので、モデルはそれまでの観測した行を、ボットに向けられた指示ではなく文脈として扱います。

同じ意味の環境変数:

```bash
TELEGRAM_ALLOWED_CHATS=-1001234567890
TELEGRAM_GROUP_ALLOWED_CHATS=-1001234567890
TELEGRAM_OBSERVE_UNMENTIONED_GROUP_MESSAGES=true
```

これには、Telegram がふつうのグループのメッセージをゲートウェイへ届ける必要があるので、上で説明したように BotFather のプライバシーモードを無効にするか、ボットをグループの管理者に昇格させてください。

## 手順 4: 自分のユーザー ID を調べる {#step-4-find-your-user-id}

Hermes Agent は、アクセスの制御に Telegram の数値のユーザー ID を使います。ユーザー ID はユーザー名では**ありません**。`123456789` のような数字です。

**方法 1（推奨）:** [@userinfobot](https://t.me/userinfobot) にメッセージを送ると、すぐにユーザー ID を返してくれます。

**方法 2:** [@get_id_bot](https://t.me/get_id_bot) にメッセージを送ります。こちらも確実です。

この数字は控えておいてください。次の手順で使います。

## 手順 5: Hermes を設定する {#step-5-configure-hermes}

### 方法 A: 対話形式の設定（推奨） {#option-a-interactive-setup-recommended}

```bash
hermes gateway setup
```

尋ねられたら **Telegram** を選びます。案内がボットのトークンと許可するユーザー ID を聞いてきて、設定を書き込んでくれます。

### 方法 B: 手作業での設定 {#option-b-manual-configuration}

`~/.hermes/.env` に次を追加します。

```bash
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUvwxYZ
TELEGRAM_ALLOWED_USERS=123456789    # Comma-separated for multiple users
```

### ゲートウェイを起動する {#start-the-gateway}

```bash
hermes gateway
```

数秒でボットがオンラインになります。Telegram でメッセージを送って確かめてください。

## Docker のターミナルで作ったファイルを送る {#sending-generated-files-from-docker-backed-terminals}

ターミナルのバックエンドが `docker` の場合、Telegram への添付はコンテナの中からではなく
**ゲートウェイのプロセス**が送る、という点に注意してください。つまり最後の `MEDIA:/...` の
パスは、ゲートウェイが動いているホスト側で読める必要があります。

よくある落とし穴:

- エージェントが Docker の中で `/workspace/report.txt` にファイルを書く
- モデルが `MEDIA:/workspace/report.txt` を出す
- `/workspace/report.txt` はコンテナの中にしかなくホストにはないので、Telegram への送信が失敗する

おすすめの形:

```yaml
terminal:
  backend: docker
  docker_volumes:
    - "/home/user/.hermes/cache/documents:/output"
```

そのうえで:

- Docker の中では `/output/...` にファイルを書く
- `MEDIA:` には**ホストから見える**パスを出す。たとえば
  `MEDIA:/home/user/.hermes/cache/documents/report.txt`

すでに `docker_volumes:` の節がある場合は、同じ一覧に新しいマウントを足してください。
YAML の重複したキーは、前のものを黙って上書きします。

### 対応している `MEDIA:` のファイル拡張子 {#supported-media-file-extensions}

ゲートウェイは、エージェントの返信から `MEDIA:/path/to/file` の印を取り出し、そのファイルをそのプラットフォームの添付として送ります。すべてのゲートウェイのプラットフォームで対応している拡張子は次のとおりです。

| 種別 | 拡張子 |
|---|---|
| 画像 | `png`、`jpg`、`jpeg`、`gif`、`webp`、`bmp`、`tiff`、`svg` |
| 音声 | `mp3`、`wav`、`ogg`、`m4a`、`opus`、`flac`、`aac` |
| 動画 | `mp4`、`mov`、`webm`、`mkv`、`avi` |
| **文書** | `pdf`、`txt`、`md`、`csv`、`json`、`xml`、`html`、`yaml`、`yml`、`log` |
| **オフィス文書** | `docx`、`xlsx`、`pptx`、`odt`、`ods`、`odp` |
| **書庫** | `zip`、`rar`、`7z`、`tar`、`gz`、`bz2` |
| **電子書籍 / パッケージ** | `epub`、`apk`、`ipa` |

この一覧にあるものは、対応しているプラットフォーム（Telegram、Discord、Signal、Slack、WhatsApp、Feishu、Matrix など）ではそのままの添付として届きます。対応していないプラットフォームでは、リンクか文字での案内になります。**太字**の種別は、ここ数回のリリースで加わったものです。モデルに `here is the file: /path/to/report.docx` と言わせて済ませていたなら、そのまま添付されるよう `MEDIA:/path/to/report.docx` に切り替えてください。

## Webhook モード {#webhook-mode}

既定では、Hermes は**ロングポーリング**で Telegram につなぎます。ゲートウェイが Telegram のサーバーへ外向きの要求を出して、新しい更新を取りに行く方式です。手元での利用や、常時動くサーバーではこれでうまくいきます。

**クラウドへの配置**（Fly.io、Railway、Render など）では、**Webhook モード**のほうが費用の面で有利です。これらのプラットフォームは、内向きの HTTP の通信で止まっている機械を起こせますが、外向きの接続では起こせません。ポーリングは外向きなので、ポーリングするボットは決して眠れません。Webhook モードは向きを逆にします。Telegram があなたのボットの HTTPS の URL へ更新を押し込むので、待っている間は眠る配置ができます。

| | ポーリング（既定） | Webhook |
|---|---|---|
| 向き | ゲートウェイ → Telegram（外向き） | Telegram → ゲートウェイ（内向き） |
| 向いている先 | 手元、常時動くサーバー | 自動で起きるクラウドのプラットフォーム |
| 設定 | 追加の設定は不要 | `TELEGRAM_WEBHOOK_URL` を設定 |
| 待機中の費用 | 機械を動かし続ける必要がある | メッセージの合間は機械を眠らせられる |

### 設定 {#configuration}

`~/.hermes/.env` に次を追加します。

```bash
TELEGRAM_WEBHOOK_URL=https://my-app.fly.dev/telegram
TELEGRAM_WEBHOOK_SECRET="$(openssl rand -hex 32)"  # required
# TELEGRAM_WEBHOOK_PORT=8443        # optional, default 8443
```

| 変数 | 必須か | 説明 |
|----------|----------|-------------|
| `TELEGRAM_WEBHOOK_URL` | はい | Telegram が更新を送る公開の HTTPS の URL。URL のパスは自動で取り出されます（上の例なら `/telegram`）。 |
| `TELEGRAM_WEBHOOK_SECRET` | **はい**（`TELEGRAM_WEBHOOK_URL` を設定した場合） | 確認のために Telegram がすべての webhook の要求で返してくる秘密のトークン。これがないとゲートウェイは起動を拒みます — [GHSA-3vpc-7q5r-276h](https://github.com/NousResearch/hermes-agent/security/advisories/GHSA-3vpc-7q5r-276h) を参照してください。`openssl rand -hex 32` で作れます。 |
| `TELEGRAM_WEBHOOK_PORT` | いいえ | webhook のサーバーが待ち受けるローカルのポート（既定: `8443`）。 |

`TELEGRAM_WEBHOOK_URL` が設定されていると、ゲートウェイはポーリングの代わりに HTTP の webhook のサーバーを起動します。設定されていなければポーリングのモードになり、以前の版から振る舞いは変わりません。

### クラウドへの配置の例（Fly.io） {#cloud-deployment-example-flyio}

1. Fly.io のアプリの secrets に環境変数を足します。

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

3. 配置します。

```bash
fly deploy
```

ゲートウェイのログに `[telegram] Connected to Telegram (webhook mode)` と出るはずです。

## プロキシへの対応 {#proxy-support}

Telegram の API が塞がれている場合や、通信をプロキシ経由にしたい場合は、Telegram 専用のプロキシの URL を設定します。これは汎用の `HTTPS_PROXY` / `HTTP_PROXY` の環境変数より優先されます。

**方法 1: config.yaml（推奨）**

```yaml
telegram:
  proxy_url: "socks5://127.0.0.1:1080"
```

**方法 2: 環境変数**

```bash
TELEGRAM_PROXY=socks5://127.0.0.1:1080
```

対応している形式: `http://`、`https://`、`socks5://`。

プロキシは、主の Telegram への接続にも、予備の IP への接続にも適用されます。Telegram 専用のプロキシが設定されていない場合、ゲートウェイは `HTTPS_PROXY` / `HTTP_PROXY` / `ALL_PROXY`（または macOS のシステムのプロキシの自動検出）に落ちます。

予備の IP を見つける経路がホストで不調な場合は、`HERMES_TELEGRAM_DISABLE_FALLBACK_IPS=true` を設定して、素の `api.telegram.org` の経路で初回の接続を行わせてください。DNS-over-HTTPS による予備の探索には `HERMES_TELEGRAM_FALLBACK_DISCOVERY_TIMEOUT` で秒数の上限も付けられます。既定は `5` です。

## ホームチャンネル {#home-channel}

任意の Telegram のチャット（DM でもグループでも）で `/sethome` のコマンドを使うと、そこを**ホームチャンネル**に指定できます。定期実行のタスク（cron のジョブ）は、結果をこのチャンネルへ届けます。

`~/.hermes/.env` で手作業で設定することもできます。

```bash
TELEGRAM_HOME_CHANNEL=-1001234567890
TELEGRAM_HOME_CHANNEL_NAME="My Notes"
```

:::tip
グループのチャット ID は負の数です（例: `-1001234567890`）。あなた個人の DM のチャット ID は、ユーザー ID と同じです。
:::

### トピックモードでの cron の配信 {#cron-deliveries-in-topic-mode}

ボットの DM でトピックモードを有効にしている場合、ルートのチャットへ届く cron のメッセージは、システム専用の待合いに入ります。そこで返信してもセッションは開かず、「main chat is reserved for system commands」という案内が出ます。専用のフォーラムのトピック（たとえば `Cron`）を作って、次を設定してください。

```bash
TELEGRAM_CRON_THREAD_ID=<topic_thread_id>
```

`TELEGRAM_CRON_THREAD_ID` は、cron の配信についてだけ `TELEGRAM_HOME_CHANNEL_THREAD_ID` を上書きします。そのトピックでの返信は、そのトピックの既存のセッションを続けます。

## ボイスメッセージ {#voice-messages}

### 受信した音声（音声認識） {#incoming-voice-speech-to-text}

Telegram で送ったボイスメッセージは、Hermes に設定された音声認識のプロバイダーが自動で文字起こしし、テキストとして会話に差し込まれます。

- `local` は Hermes が動いている機械の `faster-whisper` を使います — API キーは要りません
- `groq` は Groq Whisper を使い、`GROQ_API_KEY` が必要です
- `openai` は OpenAI Whisper を使い、`VOICE_TOOLS_OPENAI_KEY` が必要です

#### 音声認識を飛ばして、音声ファイルをそのままエージェントへ渡す {#skipping-stt-pass-the-raw-audio-file-to-the-agent}

話者の分離、独自の文字起こしのツール、あるいは録音の保管のために、音声を**エージェント自身**に扱わせたい場合は、`~/.hermes/config.yaml` で `stt.enabled: false` を設定します。

```yaml
stt:
  enabled: false
```

音声認識を無効にすると、ゲートウェイは音声 / 音のファイルを Hermes の音声のキャッシュへ取り込みはしますが、**文字起こしはしません**。エージェントは、次のような印の付いたメッセージを受け取ります。

```
[The user sent a voice message: /home/<user>/.hermes/cache/audio/<hash>.ogg]
```

あなたのツールやスキルは、そのパスを直接読めます（手元の話者分離の処理へ渡す、より高性能な文字起こしのモデルにかける、長期の保管場所へ送る、など）。拡張子は Telegram が届けた元の形式を表します（ボイスメモなら `.ogg`、音声の添付なら `.mp3`/`.m4a` など）。

これは、下の [ローカルの Bot API サーバー](#large-files-20mb-via-local-bot-api-server) の節と自然に組み合わさります。そちらは Telegram の getFile の 20MB の上限を 2GB まで引き上げるので、処理したい録音が数分を超えるときに役立ちます。

### 送信する音声（読み上げ） {#outgoing-voice-text-to-speech}

エージェントが読み上げで音声を作ると、Telegram のネイティブな**ボイスの吹き出し**として届きます。丸くて、その場で再生できるあれです。

- **OpenAI と ElevenLabs** は Opus をそのまま作るので、追加の準備は要りません
- **Edge TTS**（既定の無料のプロバイダー）は MP3 を出すので、Opus への変換に **ffmpeg** が必要です。

```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# macOS
brew install ffmpeg
```

ffmpeg がないと、Edge TTS の音声はふつうの音声ファイルとして送られます（再生はできますが、ボイスの吹き出しではなく四角い再生器になります）。

読み上げのプロバイダーは、`config.yaml` の `tts.provider` のキーで設定します。

## ローカルの Bot API サーバーによる大きなファイル（20MB 超） {#large-files-20mb-via-local-bot-api-server}

Telegram の**公開**の Bot API は `getFile` のダウンロードを **20 MB** で頭打ちにするので、それより大きいボイスメモ、音声ファイル、動画、文書は、Hermes が「too large」と返して黙って弾かれます。文書に書かれている回避策は、**ローカル**の [telegram-bot-api](https://github.com/tdlib/telegram-bot-api) の常駐プロセスを動かすことです。Telegram が使っているのと同じサーバーのソフトウェアを、自分のネットワークで動かします。ローカルのサーバーはファイルの上限を **2 GB** に引き上げ、Hermes は独自の `base_url` が設定されているのを見ると、自分の内部の上限も自動で引き上げます。

これで、こんな使い方ができるようになります。

- 長いボイスメモ（45 分の会議、ポッドキャスト）をボットへ送る
- 画像処理のツールにかける大きな動画をアップロードする
- 話者分離、音と文字の対応付け、学習データ作りといった、あとから動かす処理のために音声の原本を保管する

### 手順 1: Telegram の API の資格情報を用意する {#step-1-obtain-telegram-api-credentials}

ローカルのサーバーは（公開の Bot API ではなく）Telegram の MTProto の層と直接やり取りするので、**MTProto の資格情報**が要ります。

1. [my.telegram.org/apps](https://my.telegram.org/apps) を開き、Telegram のアカウントでサインインします。
2. 新しいアプリケーションを作ります（名前と短い説明は何でも構いません）。
3. `api_id` と `api_hash` を控えます。どちらも必要です。

### 手順 2: telegram-bot-api のサーバーを動かす {#step-2-run-the-telegram-bot-api-server}

有志が保守している [`aiogram/telegram-bot-api`](https://hub.docker.com/r/aiogram/telegram-bot-api) の Docker のイメージがいちばん簡単です。最小限の `docker-compose.yaml` は次のとおりです（上限を引き上げるには `--local` モードを使います）。

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
ローカルの Bot API のサーバーは、ボットのトークンを URL のパス（たとえば `/bot<TOKEN>/getMe`）で受け取り、**追加の認証はありません**。そのポートに届く人は誰でもボットを完全に操作できます。ボットが見られるすべてのメッセージを読めますし、ボットとしてメッセージも送れます。コンテナは `127.0.0.1` に結び付けるか、私的なネットワークで逆プロキシの後ろに置いてください。**ポート 8081 を公開のインターネットに出してはいけません。**
:::

### 手順 3: ボットを公開の API からログアウトさせる（一度だけ） {#step-3-log-the-bot-out-of-the-public-api-one-time}

1 つのボットが同時に動けるのは **1 つ**の Bot API のサーバーだけです。ボットがすでに `api.telegram.org` に対して動いていたなら（ほぼ確実にそうです）、ローカルのサーバーが受け付ける前に、そちらから明示的にログアウトさせる必要があります。

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/logOut"
# expected response: {"ok":true,"result":true}
```

これは一度きりの移行の手順で、再起動のたびに繰り返す必要はありません。`logOut` のあとに届いたメッセージは、Telegram が新しいサーバー経由で配信します。

ローカルのサーバーが、ボットの代わりに Telegram と話せることを確かめます。

```bash
curl "http://127.0.0.1:8081/bot<YOUR_BOT_TOKEN>/getMe"
# expected response: {"ok":true,"result":{"id":...,"is_bot":true,...}}
```

### 手順 4: Hermes をローカルのサーバーへ向ける {#step-4-point-hermes-at-the-local-server}

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
いまのところ、プラットフォームの設定に深くマージされるのは `platforms.<name>.extra` の形だけです。トップレベルの `telegram.extra` のブロックに直接置いたキーは、黙って捨てられます。
:::

`base_url` が設定されていると、Hermes は次のようにします。

- python-telegram-bot のクライアントをローカルのサーバー向けに作ります
- 内部の文書 / 音声のサイズの上限を 20 MB から 2 GB へ自動で引き上げます
- 「too large」のエラーの文言に有効な上限を出すので（`Maximum: 2048 MB.`）、どちらのモードなのかがすぐ分かります

ゲートウェイを再起動して、確認のログの行を探します。

```bash
hermes gateway restart
grep -E "Using custom Telegram base_url|Using Telegram local_mode" ~/.hermes/logs/gateway.log | tail
```

### 手順 5: `local_mode` — ディスク上のファイルへのアクセス {#step-5-localmode-file-access-on-disk}

ローカルのサーバーがファイルを渡す方法は**2 つ**あります。

1. **`--local` なし**（既定）: 公開の Bot API と同じく、`/file/bot<TOKEN>/<path>` で HTTP 経由で配られます。20MB の上限はそのままです。ネットワークの問題を解くためだけに有用です（`api.telegram.org` に届かないが自前で立てられる場合など）。サイズの引き上げが目的なら、これは違います。
2. **`--local` あり**（上の `TELEGRAM_LOCAL=1` で設定）: ファイルはサーバーのファイルシステムに書かれ、`getFile` の応答は HTTP の URL ではなく**絶対パス**を返します。20MB の上限は外れます。このとき Hermes は、HTTP 経由ではなく**ディスクから**中身を読む必要があります。

このディスクから読む経路を働かせるには、上の設定で `local_mode: true` を設定し、**かつ** Hermes のプロセスがサーバーの返すパスを読めるようにしてください。2 つの場合があります。

- **同じ機械** — telegram-bot-api と Hermes が同じホストで動いている場合。データのボリュームを Hermes が読めるディレクトリ（たとえば `/var/lib/telegram-bot-api`）へバインドマウントし、ファイルの所有者が合っていることを確かめます。コンテナは内部の `telegram-bot-api` という利用者へ権限を落とします（uid はイメージによって違います）。いちばん簡単なのは、compose のサービスに `user: "<UID>:<GID>"` を足して、Hermes がすでに動いている uid がファイルの所有者になるようにすることです。
- **別の機械** — ボットのサーバーが 1 台（NAS や別の VM など）、Hermes が別の 1 台で動いている場合。サーバーのデータのディレクトリを、サーバーが伝えてくるのと**同じ絶対パス**（ふつうは `/var/lib/telegram-bot-api`）で Hermes 側の機械と共有する必要があります。NFS がよく合いますし、ファイルシステムの段階で uid の食い違いを扱いたくないなら、`uid=` のマウントの読み替えを使う CIFS/SMB のほうが楽です。

`local_mode: true` を設定していても Hermes が返されたファイルのパスを `stat` できない場合（権限、あるいはマウントの間違い）、python-telegram-bot は黙ってローカルのサーバーへの HTTP の `getFile` に落ちます。`--local` モードでは、これは `404 Not Found` を返します。症状は `gateway.log` にこう出ます。

```
[Telegram] Failed to cache voice: Not Found
telegram.error.InvalidToken: Not Found
```

これが出た場合、上限の引き上げは効いていて、ファイルの共有のほうが効いていません。Hermes 側のホストから、ゲートウェイが動いている利用者として `ls -la /var/lib/telegram-bot-api/<TOKEN>/voice/` を確かめ、どれか 1 つのファイルが権限のエラーなしに `cat` できることを確認してください。

### 手順 6: 試す {#step-6-test-it}

20 MB より大きいボイスメモか音声ファイルをボットへ送ります。ゲートウェイのログを追いかけます。

```bash
tail -f ~/.hermes/logs/gateway.log | grep -iE "telegram|cache"
```

`[Telegram] Cached user voice at /home/<user>/.hermes/cache/audio/...` の行が出て、「too large」の拒否が**出ない**はずです。上の `stt.enabled: false` と組み合わせれば、元の音声ファイルのパスがエージェントの受信メッセージに載り、その先の処理へ渡せます。

## グループチャットでの利用 {#group-chat-usage}

Hermes Agent は Telegram のグループチャットでも動きますが、いくつか考えることがあります。

- **プライバシーモード**が、ボットの見られるメッセージを決めます（[手順 3](#step-3-privacy-mode-critical-for-groups) を参照）
- `TELEGRAM_ALLOWED_USERS` はグループでも効きます。認可された利用者だけがボットを動かせます
- `telegram.require_mention: true` にすると、ふつうのグループの会話には反応しなくなります
- `telegram.require_mention: true` のとき、グループのメッセージが受け付けられるのは次の場合です。
  - ボットのメッセージへの返信
  - `@botusername` のメンション
  - `/command@botusername`（ボット名を含む、Telegram のボットのメニューのコマンドの形）
  - `telegram.mention_patterns` に設定した正規表現の合図に一致するもの
- 複数の Hermes のボットがいるグループでは、`telegram.exclusive_bot_mentions` が振り分けを決まった形に保ちます。メッセージが 1 つ以上の Telegram のボットのユーザー名を明示的にメンションしている場合、メンションされたボットのプロファイルだけが処理し、他の Hermes のボットは、返信や合図の言葉による予備の判定より前に無視します。既定で有効です。
- BotFather でボットの `@username` を変えると自動で反映されます。ゲートウェイを再起動しなくても、Hermes はメンションの振り分けで新しい名前を追います。`bot` で終わらない収集品（Fragment）のユーザー名にも対応しています。
- 特定の Telegram のフォーラムのトピックで Hermes を黙らせたい場合は `telegram.ignored_threads` を使ってください。そのグループが本来なら自由に応答したり、メンションで応答したりする設定でも黙ります
- `telegram.require_mention` を設定しないか false にした場合、Hermes はこれまでどおりの開かれたグループの振る舞いになり、見られるふつうのグループのメッセージに応答します

### 1 つのグループに複数の Hermes のボットがいる場合 {#multiple-hermes-bots-in-one-group}

同じ Telegram のグループで複数の Hermes のプロファイルを動かす場合は、プロファイルごとに Telegram のボットのトークンを作り、プロファイルごとにゲートウェイを 1 つ起動してください。同じボットのトークンを、動いている複数のゲートウェイで使い回さないでください。Telegram は同じトークンでの同時のポーリングを拒否します。

グループでのおすすめの設定:

```yaml
telegram:
  require_mention: true
  exclusive_bot_mentions: true
  mention_patterns: []
```

この設定なら、`@research_bot @ops_bot summarize this` のようなグループのメッセージは `research_bot` と `ops_bot` だけが処理します。グループにいる他の Hermes のボットは、そのメッセージが自分の以前のメッセージへの返信であっても、共通の合図の言葉に一致しても、黙ったままです。

互いの引用返信に答え合う 2 つの Hermes のボットは、`TELEGRAM_ALLOW_BOTS=all` のままだと永遠にループすることがあります。ボットへの返信は、必ず `require_mention` の関門を通ってしまうからです。`telegram.bots_require_mention: true`（環境変数は `TELEGRAM_BOTS_REQUIRE_MENTION`）を設定すると、その経路が閉じます。他のボットからのメッセージは、このボットを明示的に `@mentions` したときだけ応答を起こし、人からの返信はこれまでどおり効きます。

ボット同士のループの見張りは、ボットが書いたメッセージを受け付けているすべてのチャット（`TELEGRAM_ALLOW_BOTS` が `mentions` か `all`）でも働きます。5 分以内に 1 つのチャットへボットのメッセージが 20 件入ると、そのチャットでのそれ以降のボットのメッセージは 10 分間破棄され、警告が 1 回記録されます。人のメッセージは数えられませんし、破棄もされません。設定は `config.yaml` にあります。

```yaml
gateway:
  bot_loop_guard:
    enabled: true        # false turns the guard off
    max_events: 20       # bot messages per chat per window
    window_seconds: 300
    cooldown_seconds: 600
```

正当な用途で流量の多いボットが、5 分で 1 つのチャットに 20 件を超えて投稿する場合も見張りに引っかかります。そのゲートウェイでは `max_events` を上げてください。

グループの会話の本文とメディアの説明文は、メッセージが他の参加者も名指ししているとき、すべてのメンションを残します（`@research_bot , @ops_bot are you both listening?` は `research_bot` にそのまま届きます）。このボットだけが呼ばれている場合は、これまでどおり自分の名前は取り除かれるので、`@hermes_bot 2` のような短い答えも効きます。グループでのやり取りには、チャンネルごとの文脈にボット自身の Telegram のユーザー名も載るので、残されたメンションのどれが自分宛てなのかをモデルが判断できます。スラッシュコマンドは、これまでどおり通常のコマンドの整理を通ります。

`exclusive_bot_mentions: false` にするのは、明示的なメンションが返信や合図の言葉による起動を上書きしてほしくない、以前からのグループの場合だけにしてください。

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

小規模で顔ぶれの決まった群なら、既定のプロファイルには `hermes gateway <action>` を、名前付きのプロファイルにはそれぞれ `hermes -p <profile> gateway <action>` を呼ぶシェルのループやスクリプトを使ってください。1 つのプロセスの単位のコマンドが、どのサービス管理でもすべての名前付きプロファイルを制御してくれると期待するより確実です。

### 困ったときは: DM では動くのにグループでは動かない {#troubleshooting-works-in-dms-but-not-groups}

ボットが個別のチャットでは応答するのにグループでは黙っている場合は、次の関門を順に
確かめてください。

1. **Telegram の配信:** BotFather のプライバシーモードを無効にするか、ボットを管理者へ
   昇格させるか、ボットを直接メンションします。Telegram がボットへ届けないグループの
   メッセージに、Hermes が応答することはできません。
2. **プライバシーを変えたら入れ直す:** BotFather のプライバシーの設定を変えたら、ボットを
   グループから外して入れ直してください。Telegram は既存の参加について、古い配信の
   振る舞いを保つことがあります。
3. **Hermes の認可:** 送り手が
   `TELEGRAM_ALLOWED_USERS` か `TELEGRAM_GROUP_ALLOWED_USERS` に入っていることを確かめるか、
   `TELEGRAM_GROUP_ALLOWED_CHATS` でそのグループのチャットを許可してください。
4. **メンションの絞り込み:** `telegram.require_mention: true` を設定している場合、
   ふつうのグループの会話は、スラッシュコマンド、ボットへの返信、`@botusername` の
   メンション、設定した `mention_patterns` への一致のいずれかでない限り無視されます。
5. **複数ボットの振り分け:** グループに複数のボットがいる場合、Hermes のプロファイルごとに
   固有のボットのトークンを使い、以前からの共通の起動の振る舞いを意図して残すのでない限り
   `exclusive_bot_mentions` は有効のままにしてください。

負のチャット ID は、Telegram のグループやスーパーグループではふつうのことです。チャット単位の
認可を使う場合、それらの ID は送り手の利用者の許可一覧ではなく
`TELEGRAM_GROUP_ALLOWED_CHATS` に入れてください。

### グループでの起動の設定の例 {#example-group-trigger-configuration}

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

この例では、ふつうの直接の起動に加えて、`@mention` を使わなくても `chompy` で始まるメッセージが通ります。
Telegram のトピック `31` と `42` のメッセージは、メンションと自由応答の判定より前に必ず無視されます。

### `mention_patterns` についての補足 {#notes-on-mentionpatterns}

- パターンには Python の正規表現を使います
- 大文字と小文字は区別しません
- パターンは、テキストのメッセージとメディアの説明文の両方に対して照合されます
- 不正な正規表現は、ボットを落とすのではなく、ゲートウェイのログに警告を残して無視されます
- メッセージの先頭でだけ一致させたい場合は `^` で固定してください

## 個別チャットのトピック（Bot API 9.4） {#private-chat-topics-bot-api-94}

Telegram の Bot API 9.4（2026 年 2 月）で **個別チャットのトピック**が入りました。ボットは、スーパーグループを用意しなくても、1 対 1 の DM のチャットにフォーラムのようなトピックのスレッドを直接作れます。これにより、Hermes との既存の DM の中に、切り分けられた作業場所をいくつも持てます。

### 使いどころ {#use-case}

長く続くプロジェクトをいくつも抱えているなら、トピックが文脈を分けてくれます。

- **トピック「Website」** — 本番の Web サービスの作業
- **トピック「Research」** — 文献の調査と論文の探索
- **トピック「General」** — 雑多な作業と短い質問

トピックはそれぞれ自分の会話のセッション、履歴、文脈を持ち、互いから完全に切り離されます。

### 設定 {#configuration}

:::caution 前提
設定にトピックを足す前に、ボットの持ち主が **@BotFather** でそのボットの **Threaded Mode** を有効にする必要があります。

1. BotFather の **Mini App** を開きます（Telegram で `botfather` を検索し、検索結果で **Open** をタップします。従来の `/mybots` の文字メニューにはこの設定が出てきません）
2. **My bots → 対象のボット → Bot Settings → Threads Settings** と進みます
3. **Threaded Mode** を有効にします

DM のチャット自体に「Topics」の切り替えはありません。ボットの DM はグループではないので、古い手引きに書かれているグループのフォーラムの切り替えはここには当てはまりません。Threaded Mode がないと、Hermes は起動時に `The chat is not a forum` と記録し、トピックの作成を見送ります。同じ手順をもう少し詳しく述べた [前提](#prerequisites) も参照してください。
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

| 項目 | 必須か | 説明 |
|-------|----------|-------------|
| `name` | はい | トピックの表示名 |
| `icon_color` | いいえ | Telegram のアイコンの色のコード（整数） |
| `icon_custom_emoji_id` | いいえ | トピックのアイコンに使うカスタム絵文字の ID |
| `skill` | いいえ | このトピックでの新しいセッションに自動で読み込むスキル |
| `thread_id` | いいえ | トピックの作成後に自動で入ります — 手で設定しないでください |

### 仕組み {#how-it-works}

1. ゲートウェイの起動時に、Hermes はまだ `thread_id` を持たないトピックごとに `createForumTopic` を呼びます
2. `thread_id` は自動で `config.yaml` へ書き戻されるので、次回以降の再起動では API の呼び出しを飛ばします
3. 各トピックは、切り分けられたセッションのキー `agent:main:telegram:dm:{chat_id}:{thread_id}` に対応します
4. 各トピックのメッセージは、それぞれ自分の会話の履歴、記憶の書き出し、文脈の窓を持ちます

### ルートの DM の扱い {#root-dm-handling}

既定では、（どのトピックにも属さない）ルートの DM へ送られたメッセージはふつうに処理されます。
`ignore_root_dm: true` を設定すると、ルートの DM を待合いに変えられます。DM のトピックを設定して
いる利用者について、ふつうのメッセージは黙って無視され、システムのコマンド（`/start`、`/help`、
`/status` など）は変わらず効きます。

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

この判定は**チャットごと**です。影響を受けるのは、`dm_topics` に項目が 1 つ以上ある利用者の
ルートの DM だけです。トピックを設定していない利用者には影響しません。

### スキルの結びつけ {#skill-binding}

`skill` の項目を持つトピックでは、そのトピックで新しいセッションが始まったときにそのスキルが自動で読み込まれます。これは会話の冒頭で `/skill-name` と入力するのとまったく同じ働きです。スキルの内容が最初のメッセージへ差し込まれ、以降のメッセージは会話の履歴の中でそれを見ます。

たとえば `skill: arxiv` のトピックでは、（明示的な `/new` や `/reset` のあとで）セッションが作り直されるたびに arxiv のスキルがあらかじめ読み込まれます。

:::tip
設定の外で作られたトピック（Telegram の API を手で呼んだ場合など）は、`forum_topic_created` の案内のメッセージが届いたときに自動で見つかります。ゲートウェイが動いている間に設定へトピックを足すこともできます。次にキャッシュに無いものが出たときに拾われます。
:::

## DM の複数セッションのモード（`/topic`） {#multi-session-dm-mode-topic}

ChatGPT のような、DM での複数セッションです。1 つのボットで、並行する会話をいくつも持てます。上の、運用者が用意する `extra.dm_topics` と違い、こちらは**利用者が動かす**モードです。設定も、あらかじめ決めたトピック名も要りません。利用者が `/topic` で有効にし、Telegram の **+** のボタンを押して好きなだけトピックを作ります。それぞれが完全に独立した Hermes のセッションです。

### `/topic` のサブコマンド {#topic-subcommands}

| 形 | 場面 | 効果 |
|------|---------|--------|
| `/topic` | ルートの DM、まだ有効でない | BotFather の能力を確かめ、複数セッションのモードを有効にし、ピン留めした System のトピックを作る |
| `/topic` | ルートの DM、すでに有効 | 状態を表示する: 復元できる、結びついていないセッション |
| `/topic` | トピックの中 | いまのトピックのセッションの結びつきを表示する |
| `/topic help` | どこでも | その場での使い方 |
| `/topic off` | ルートの DM | 複数セッションのモードを無効にし、このチャットのトピックの結びつきをすべて消す |
| `/topic <session-id>` | トピックの中 | 以前の Telegram のセッションをいまのトピックへ復元する |

`/topic` を実行できるのは、認可された利用者（`TELEGRAM_ALLOWED_USERS` やプラットフォームの認証の設定による許可一覧）だけです。認可されていない送り手には、有効化ではなく拒否が返ります。

### DM のトピックと DM の複数セッションのモードの違い {#dm-topics-vs-multi-session-dm-mode}

| | `extra.dm_topics`（設定で決める） | `/topic`（利用者が動かす） |
|---|---|---|
| 誰が有効にするか | 運用者が `config.yaml` で | 利用者が `/topic` を送って |
| トピックの一覧 | 設定で宣言した決まった組 | 利用者が自由に作ったり消したりする |
| トピック名 | 運用者が決める | 利用者が決める。Hermes のセッションの題名に合わせて自動で改名される |
| ルートの DM の振る舞い | ふつうのチャット（`ignore_root_dm: true` なら待合い） | システムの待合いになる（コマンド以外のメッセージは拒否される） |
| 主な使いどころ | 任意のスキルを結び付けた常設の作業場所 | その場限りの並行するセッション |
| 保存先 | 設定の `extra.dm_topics` | SQLite の `telegram_dm_topic_mode` と `telegram_dm_topic_bindings` の表 |

どちらの機能も同じボットで共存できます。利用者の DM で `/topic` を動かしつつ、`extra.dm_topics` が他のチャットについて運用者の宣言したトピックを引き続き管理します。

### 前提 {#prerequisites}

**@BotFather** で対象のボットを開き、**Bot Settings → Threads Settings** と進みます。

1. **Threaded Mode** を有効にします（`has_topics_enabled` が立ちます）
2. 利用者がトピックを作れる設定を無効に**しない**でください（`allows_users_to_create_topics` を有効のままにします）

利用者が初めて `/topic` を実行したとき、Hermes は `getMe` を呼んで両方の印を確かめます。どちらかが無効なら、Hermes は BotFather の Threads Settings の画面の画像を送り、何を切り替えればよいかを説明します。前提が満たされるまで、有効化は行われません。

### 有効にする流れ {#activation-flow}

ルートの DM から次を送ります。

```
/topic
```

Hermes は次のようにします。

1. `getMe().has_topics_enabled` と `allows_users_to_create_topics` を確かめる
2. どちらも true なら、この DM で複数セッションのトピックのモードを有効にする
3. 状態やコマンド用の **System** のトピックを作ってピン留めする（できる範囲で）
4. 利用者が復元できる、以前の結びついていない Telegram のセッションの一覧を返す

有効にしたあと、**ルートの DM は待合い**になります。ふつうの指示は拒否され、**All Messages** を指す案内が出ます。システムのコマンド（`/status`、`/sessions`、`/usage`、`/help` など）は、ルートでも変わらず効きます。

### 新しいトピックを作る（利用者側の流れ） {#creating-a-new-topic-end-user-flow}

1. Telegram でボットの DM を開きます
2. ボットの画面の上部にある **All Messages** をタップして、何かメッセージを送ります
3. Telegram がそのメッセージのために新しいトピックを作ります
4. Hermes がそのトピックの中で応答します。そのトピックは、これで独立したセッションです

トピックはそれぞれ自分の会話の履歴、モデルの状態、ツールの実行、セッション ID を持ちます。切り分けのキーは `agent:main:telegram:dm:{chat_id}:{thread_id}` で、設定で決める DM のトピックの切り分けと同じです。

### 自動で改名されるトピック {#auto-renamed-topics}

Hermes が（最初のやり取りのあと、自動の題名付けの処理で）トピックのセッションの題名を作ると、Telegram のトピック自体もそれに合わせて改名されます。たとえば「New Topic」が「Database migration plan」になります。改名はできる範囲で行われ、失敗しても記録に残るだけで、セッションは壊れません。

これを止めて、自分で付けたトピック名をそのままにしたい場合は次を設定します。

```yaml
gateway:
  platforms:
    telegram:
      extra:
        disable_topic_auto_rename: true
```

この項目が有効なとき、Hermes は内部のセッションの題名（`hermes sessions` や TUI などで使われます）は作りますが、Telegram のトピック名を書き換えることはありません。BotFather の Threaded Mode でトピックを自分の手で整理していて、最初の返信のたびに題名が上書きされるのが嫌なときに便利です。

### トピックの中での `/new` {#new-inside-a-topic}

いまのトピックのセッションだけを作り直します（新しいセッション ID、まっさらな履歴）。他のトピックには触れません。Hermes は、並行して作業したいなら（**All Messages** から）もう 1 つトピックを作るほうがふつうは望みに近い、という案内を添えて返します。

### 以前のセッションを復元する {#restoring-a-previous-session}

トピックの中で次を送ります。

```
/topic <session-id>
```

これは、まっさらから始める代わりに、いまのトピックを既存の Hermes のセッションへ結び付けます。トピックのモードを有効にする前に始めた会話を続けたいときに便利です。制限は次のとおりです。

- 対象のセッションは、同じ Telegram の利用者のものである必要があります
- 対象のセッションが、すでに別のトピックへ結び付いていないこと

Hermes はセッションの題名で確認し、文脈のために最後のアシスタントのメッセージを出し直します。

セッションの ID を調べるには、ルートの DM で（引数なしの）`/topic` を送ってください。Hermes が、その利用者の結びついていない Telegram のセッションを並べます。

### トピックの中での `/topic`（引数なし） {#topic-inside-a-topic-no-argument}

いまのトピックの結びつきを表示します。セッションの題名、セッション ID、そして `/new` と別のトピックを作ることの使い分けの案内です。

### 内部の作り {#under-the-hood}

- 有効化は `state.db` の `telegram_dm_topic_mode(profile_name, chat_id, user_id, enabled, ...)` に保存されます。主キーは `(profile_name, chat_id)` なので、1 つの `state.db` を共有する多重化 / 経路の固定されたボットどうしが、同じ Telegram の利用者が複数のボットに DM を送っても互いを潰すことはありません（個別チャットの `chat_id` は利用者の id で、どのボットでも同じです）。
- トピックごとの結びつきは、主キー `(profile_name, chat_id, thread_id)` と `session_id` への `ON DELETE CASCADE` を持つ `telegram_dm_topic_bindings(profile_name, chat_id, thread_id, session_id, ...)` に保存されます。セッションを刈り取ると、そのトピックの結びつきも自動で消えます
- トピックのモードの SQLite の移行は**必要になってから**行われます。ゲートウェイの起動時ではなく、最初の `/topic` の呼び出しで走ります。このプロファイルで誰かが `/topic` を実行するまで、`state.db` は変わりません。スキーマの v3 で `profile_name` が加わり、以前の行は `default` の名前空間へだけ移ります
- 受信した DM のメッセージはそれぞれ、**振り分けられた**プロファイル（プロセス全体で有効なプロファイルではなく `source.profile`）を使って `(profile_name, chat_id, thread_id)` の結びつきを引きます。あれば、`SessionStore.switch_session()` を通してそのメッセージを結び付いたセッションへ流すので、セッションのキーとセッション ID の対応がディスク上で一貫します
- トピックの中での `/new` は、結びつきの行を新しいセッション ID へ向け直すので、次のメッセージは新しいセッションのままです
- `extra.dm_topics` で宣言したトピックは**決して自動で改名されません**。複数セッションのモードが有効でも、運用者が決めた名前が保たれます
- `extra.disable_topic_auto_rename: true` を設定すると、そのチャットの**すべて**のトピック（Threaded Mode でその場で作られたトピックも含む）で自動の改名が止まります
- フォーラムを有効にした DM の General（上部にピン留めされた）トピックは、Telegram がそのメッセージを `message_thread_id=1` で届けても thread_id なしで届けても、ルートの待合いとして扱われます
- ルートの待合いの案内は、**（プロファイル, チャット）**ごとに 30 秒に 1 通までに絞られます。トピックのモードが有効なのを忘れてルートに 10 個の指示を書いた利用者に 10 通が返ることはありませんし、1 つのチャット id を共有する 2 つの多重化されたプロファイルが互いの案内を抑え合うこともありません
- BotFather の設定の画像は、**（プロファイル, チャット）**ごとに 5 分に 1 回までです。Threads Settings が無効なまま `/topic` を繰り返しても、同じ画像が再送されることはありません
- トピックの中で始めた `/bg <prompt>` は、結果を同じトピックへ返します。裏で動くセッションが、持ち主のトピックの自動の改名を起こすことはありません
- `/topic` 自体も、ボットの利用者の認可の判定を通ります。認可されていない DM には、有効化ではなく拒否が返ります

### 複数セッションのモードを無効にする {#disabling-multi-session-mode}

ルートの DM で `/topic off` を送ります。Hermes は**このプロファイルの**名前空間の行を無効にし、そのチャットについてそのプロファイルの `(thread_id → session_id)` の結びつきを消すので、ルートの DM はふつうの Hermes のチャットへ戻ります。Telegram にある既存のトピックが消えることはありません。独立したセッションとして扱われなくなるだけです。あとで `/topic` をもう一度実行すれば、また有効にできます。

手作業で片付ける必要がある場合（多数のチャットをまとめて初期化するなど）は、`profile_name` で行を絞り込んでください（プロファイルが 1 つだけの導入では `default` を使います）。

```bash
sqlite3 ~/.hermes/state.db \
  "UPDATE telegram_dm_topic_mode SET enabled = 0
     WHERE profile_name = 'default' AND chat_id = '<your_chat_id>';
   DELETE FROM telegram_dm_topic_bindings
     WHERE profile_name = 'default' AND chat_id = '<your_chat_id>';"
```

### Hermes を古い版へ戻す場合 {#downgrading-hermes}

`/topic` より前の版の Hermes へ戻すと、この機能は単に働かなくなります。`telegram_dm_topic_mode` と `telegram_dm_topic_bindings` の表は `state.db` に残りますが、古いコードは無視します。DM は、もともとのスレッドごとの切り分け（`build_session_key` により `message_thread_id` ごとにセッションが分かれる形）に戻るので、既存の Telegram のトピックは並行するセッションとしてそのまま使えます。ルートの DM はもう待合いではなく、そこへのメッセージは以前のようにエージェントへ届きます。もう一度新しい版にすれば、複数セッションのモードは中断したところからそのまま働きます。

## グループのフォーラムのトピックへのスキルの結びつけ {#group-forum-topic-skill-binding}

**Topics モード**（「フォーラムのトピック」とも呼ばれます）を有効にしたスーパーグループでは、すでにトピックごとにセッションが切り分けられています。`thread_id` ごとに別々の会話になります。とはいえ、DM のトピックでのスキルの結びつけと同じように、特定のグループのトピックにメッセージが来たら**スキルを自動で読み込みたい**こともあるでしょう。

### 使いどころ {#use-case}

作業の流れごとにフォーラムのトピックを分けている、チームのスーパーグループを考えます。

- **Engineering** のトピック → `software-development` のスキルを自動で読み込む
- **Research** のトピック → `arxiv` のスキルを自動で読み込む
- **General** のトピック → スキルなし、汎用の助手

### 設定 {#configuration}

`~/.hermes/config.yaml` の `platforms.telegram.extra.group_topics` の下にトピックの結びつきを足します。

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

| 項目 | 必須か | 説明 |
|-------|----------|-------------|
| `chat_id` | はい | スーパーグループの数値の ID（`-100` で始まる負の数） |
| `name` | いいえ | そのトピックの人が読むための名前（情報として持つだけです） |
| `thread_id` | はい | Telegram のフォーラムのトピックの ID — `t.me/c/<group_id>/<thread_id>` のリンクで見えます |
| `skill` | いいえ | このトピックでの新しいセッションに自動で読み込むスキル |

### 仕組み {#how-it-works}

1. 対応付けられたグループのトピックにメッセージが来ると、Hermes は `group_topics` の設定でその `chat_id` と `thread_id` を引きます
2. 一致した項目に `skill` があれば、そのスキルがそのセッションに自動で読み込まれます。DM のトピックでのスキルの結びつけと同じです
3. `skill` のキーがないトピックは、セッションの切り分けだけが効きます（従来どおりで、変わりません）
4. 対応付けのない `thread_id` や `chat_id` は、黙って素通りします。エラーも出ませんし、スキルも読み込まれません

### DM のトピックとの違い {#differences-from-dm-topics}

| | DM のトピック | グループのトピック |
|---|---|---|
| 設定のキー | `extra.dm_topics` | `extra.group_topics` |
| トピックの作成 | `thread_id` がなければ Hermes が API で作る | 管理者が Telegram の画面で作る |
| `thread_id` | 作成後に自動で入る | 手で設定する必要がある |
| `icon_color` / `icon_custom_emoji_id` | 対応 | 当てはまらない（見た目は管理者が決める） |
| スキルの結びつけ | ✓ | ✓ |
| セッションの切り分け | ✓ | ✓（フォーラムのトピックでは元から備わっている） |

:::tip
トピックの `thread_id` を調べるには、Telegram の Web 版かデスクトップ版でそのトピックを開いて URL を見てください。`https://t.me/c/1234567890/5` の最後の数字（`5`）が `thread_id` です。スーパーグループの `chat_id` は、グループの ID に `-100` を付けたものです（たとえばグループ `1234567890` は `-1001234567890` になります）。
:::

## 最近の Bot API の機能 {#recent-bot-api-features}

- **Bot API 9.4（2026 年 2 月）:** 個別チャットのトピック — ボットは `createForumTopic` で 1 対 1 の DM にフォーラムのトピックを作れます。Hermes はこれを 2 つの別の機能に使っています。運用者が用意する [個別チャットのトピック](#private-chat-topics-bot-api-94)（設定で決める、決まったトピックの一覧）と、利用者が動かす [DM の複数セッションのモード](#multi-session-dm-mode-topic)（`/topic` で有効にする、利用者が好きなだけ作れるトピック）です。
- **プライバシーポリシー:** Telegram は、ボットにプライバシーポリシーを持つことを求めるようになりました。BotFather の `/setprivacy_policy` で設定してください。設定しないと Telegram が仮のものを自動で作ることがあります。誰でも使えるボットでは特に大切です。
- **Bot API 9.5（2026 年 3 月）: `sendMessageDraft` によるネイティブな逐次表示。** Hermes は、Telegram のネイティブな下書きによる逐次表示の API を、個別チャット向けの選択できる伝送路として使えます。既定は従来の `editMessageText` の経路のままです。一部の Telegram のクライアントでは、下書きの表示がいったん畳まれて描き直されるのが目に見えてしまうためです。

### 逐次表示の伝送路（`gateway.streaming.transport`） {#streaming-transport-gatewaystreamingtransport}

逐次表示が有効なとき（`gateway.streaming.enabled: true`）、Hermes は 4 つの伝送路から 1 つを選びます。

| 値 | 振る舞い |
|---|---|
| `auto`（既定） | 対応しているチャット（いまのところ Telegram の DM）ではネイティブな下書きによる逐次表示、それ以外では従来の編集による経路。下書きのやり取りが失敗しても、きれいに従来の経路へ落ちます。 |
| `draft` | ネイティブな下書きを強制します。チャットが下書きに対応していない場合（グループ / トピックなど）、降格を記録して編集の経路へ落ちます。 |
| `edit` | どのチャットの種類でも、従来の `editMessageText` を少しずつ呼ぶ経路。 |
| `off` | 逐次表示を完全に無効にします（最後の返信だけで、途中の更新はありません）。 |

`~/.hermes/config.yaml` では次のようにします。

```yaml
gateway:
  streaming:
    enabled: true
    transport: auto    # auto | draft | edit | off
```

**`edit`（既定）での DM の見え方** — ゲートウェイはふつうの下書き表示のメッセージを送り、`editMessageText` で少しずつ更新します。Telegram の下書き表示が畳まれて戻る効果を避けられます。

**`auto` や `draft` での DM の見え方** — Telegram が、トークンごとに更新される動く下書きの表示を出します。返信が終わると、ふつうのメッセージとして届き、下書きの表示はクライアント側で自然に消えます。下書きにはメッセージの id がないので、チャットの履歴に残るのは最後の答えです。

**グループ、スーパーグループ、フォーラムのトピックでは?** Telegram は `sendMessageDraft` を個別チャット（DM）に限っています。ゲートウェイはそれ以外では黙って編集の経路へ落とすので、使い勝手はこれまでと同じです。

**下書きのやり取りが失敗したら?** どんな失敗でも（一時的なネットワークのエラー、サーバー側の拒否、古い python-telegram-bot の導入）、その応答の残りは編集の経路へ切り替わります。次の応答では、また新しく試されます。

## 表示: 表現の豊かなメッセージ、表、リンクのプレビュー {#rendering-rich-messages-tables-and-link-previews}

**表現の豊かなメッセージ（Bot API 10.1）。** 従来の MarkdownV2 の経路では崩れてしまう要素 — 表、チェックリスト、折りたためる `<details>`、ブロックの数式 — を含む最後の返信は、エージェントの**素の markdown** を使って Telegram のネイティブな [`sendRichMessage`](https://core.telegram.org/bots/api#sendrichmessage) で送られるので、クライアント側で平らにされることなくそのまま表示されます。DM では、既定の `rich_drafts: false` が逐次表示を素のままに保ち — Telegram の消える下書きの伝送路を従来の表示で使うので、表など豊かな表示でしか扱えない要素は下書きでは素の markdown のままです — そのうえで、できあがった応答を `sendRichMessage` で残します。`rich_drafts: true` にすると、実況の表示にも `sendRichMessageDraft` が使われます。編集による逐次表示では、`editMessageText` の `rich_message` の引数で、既存の表示をその場で仕上げられます。ふつうの返信（素の文章、太字 / 斜体、単純な箇条書き）は、クライアントをまたいで字の太さと間隔をそろえるために MarkdownV2 の経路のままです。

内容が 32,768 文字という表現の豊かなテキストの上限を超えると、豊かな経路は自動で見送られます。また Telegram からの拒否（古い `python-telegram-bot` で窓口が未対応、解析のエラー、大きすぎるブロックや列）があれば、**黙って** MarkdownV2 の経路へ落ちるので、メッセージが失われることはありません。一時的なエラーやネットワークのエラーでは、黙って送り直すことは*しません*（最後のメッセージが二重になりません）。

**MarkdownV2 での代替。** あるメッセージで豊かな経路が使えないとき、Hermes は markdown を MarkdownV2 に変換します。MarkdownV2 には表の書き方がないので、縦棒の表は形を整え直されます。

- **小さな表**は**行ごとのまとまりの箇条書き**へ平らにされます。各行が、列の見出しの下の読みやすい箇条書きになります。2〜4 列で、各セルが短いときに向いています。
- **大きい、あるいは横に広い表**は、列をそろえた**コードブロック**になるので、何も潰れません。

表現の豊かなメッセージは**使いたい人が選ぶ**ものです。既定は従来の MarkdownV2 の経路のままです。いまの Telegram のクライアントでは、Bot API の豊かなメッセージを素のテキストとしてコピーしにくいことがあり、コマンドの断片や携帯への受け渡しでは特に困るからです。表 / チェックリスト / details / 数式をそのまま表示させたい場合は、次のようにします。

```yaml
gateway:
  platforms:
    telegram:
      extra:
        rich_messages: true
        rich_drafts: false
        allow_cjk_rich_messages: false
```

この設定は、クライアントでの表示とコピーのしやすさのためのものです。Telegram が豊かな API の呼び出しを拒んだときは、Hermes がすでに自動で従来の経路へ落ちます。`rich_drafts` は、DM の逐次表示を豊かに*表示*するか（`sendRichMessageDraft`）を決めるもので、既定では無効です。Telegram のデスクトップ版 / macOS 版では、チャットが描き直されるまで豊かな下書きが重なって見えることがあるためです。無効なら、逐次表示は素のまま流れ、最後のものはネイティブな豊かなメッセージとして届きます。

CJK の文字（中国語、日本語、韓国語、それに稀な漢字の拡張）は、既定では従来の MarkdownV2 の経路のままです。影響を受ける Telegram のデスクトップ版 / macOS 版のクライアントで、Bot API の豊かなメッセージが CJK の字形を重ねて表示してしまうことがあったためです。影響のないクライアントを使っていて、CJK の内容でもネイティブな豊かな表 / チェックリスト / details / 数式のほうがよければ、`rich_messages: true` と併せて `allow_cjk_rich_messages: true` を設定して、そのクライアント側の危険を引き受けてください。

表現の豊かなメッセージを有効にしたまま、従来の「常にコードブロック」の表の振る舞いだけがほしい場合は、`config.yaml` で `telegram.pretty_tables: false` を設定して表の整え直しを無効にしてください（既定は `true`）。

**リンクのプレビュー。** Telegram は、ボットのメッセージにある URL のプレビューを自動で作ります。それを抑えたい場合は（長い `/tools` の出力、10 個のリンクに触れるエージェントの返信など）次のようにします。

```yaml
gateway:
  platforms:
    telegram:
      extra:
        disable_link_previews: true
```

有効にすると、Hermes はすべての送信メッセージに Telegram の `LinkPreviewOptions(is_disabled=True)` を付け、古い `python-telegram-bot` では従来の `disable_web_page_preview` の引数へ落ちます。

**長い返信と流量の制御。** Telegram の 4,096 文字の上限を超える返信は、番号を振った分割（`(1/3)`、`(2/3)` …）で送られます。1 つのチャットへの送信は一度に 1 通ずつ届くので、定期実行の報告と DM の返答が同時に来ても、分割が混ざることはありませんし、テキストの 2 つの分割の間にファイルの送信が割り込むこともありません。Telegram の流量の制御が途中の分割を拒んだ場合、Hermes はすでに画面に出た分を送り直すのではなく、罰則の期間が明けてから拒まれた分割から再開します。また、そのチャットが分かっている罰則の期間にある間は、それ以降の送信は手元で閉じる側に倒れます（罰則を長引かせる余計な要求を出しません）。ゲートウェイのその場での待ちの上限を超える罰則は配信の台帳へ渡され、「一部はすでに上に届いているかもしれません」という注記とともに返信を送り直します。

## グループの許可一覧 {#group-allowlisting}

Telegram のグループとフォーラムのチャットには、互いに独立した 2 つの関門を設定できます。

- **送り手のユーザー ID**（`group_allow_from` / `TELEGRAM_GROUP_ALLOWED_USERS`） — グループ / フォーラムのメッセージにだけ効く、送り手を絞る許可一覧です。特定の利用者に、（DM へのアクセスも与えてしまう）`TELEGRAM_ALLOWED_USERS` に追加せずにグループでボットを呼べるようにしたいときに使います。
- **チャット ID**（`group_allowed_chats` / `TELEGRAM_GROUP_ALLOWED_CHATS`） — チャットを絞る許可一覧です。これらのグループ / フォーラムのメンバーなら誰でもボットとやり取りできます。グループにいること自体がアクセスの合図になる、チームやサポートのボットに向いています。

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

同じ意味の環境変数:

```bash
TELEGRAM_ALLOWED_USERS="123456789"
TELEGRAM_GROUP_ALLOWED_USERS="987654321"
TELEGRAM_GROUP_ALLOWED_CHATS="-1001234567890"
```

振る舞い:

- `TELEGRAM_ALLOWED_USERS` は、すべてのチャットの種類（DM、グループ、フォーラム）を対象にします。
- `TELEGRAM_GROUP_ALLOWED_USERS` は、挙げた送り手をグループ / フォーラムでだけ認可します。`TELEGRAM_ALLOWED_USERS` に入っていない限り、ボットへ DM はできません。
- `TELEGRAM_GROUP_ALLOWED_CHATS` にあるチャットは、送り手にかかわらずそのチャットのすべてのメンバーを認可します。
- どれでも `*` を使うと、任意の送り手 / チャットを許可できます。
- これは既存のメンションや型による起動、そして `group_topics` + `ignored_threads` の上に重なって働きます。

### PR #17686 より前からの移行 {#migration-from-before-pr-17686}

この分離より前は `TELEGRAM_GROUP_ALLOWED_USERS` だけが項目で、利用者はそこに**チャット ID** を入れていました。互換のため、`TELEGRAM_GROUP_ALLOWED_USERS` にあるチャット ID の形をした値（`-` で始まるもの）はいまもチャット ID として扱われ、非推奨の警告が一度だけ記録されます。移行のしかたは次のとおりです。

```bash
# Old (still works, but deprecated)
TELEGRAM_GROUP_ALLOWED_USERS="-1001234567890"

# New
TELEGRAM_GROUP_ALLOWED_CHATS="-1001234567890"
```

### 客人の @mention による通し（`guest_mode`） {#guest-mention-bypass-guestmode}

ふつうの構成では、`group_allowed_chats` は固い関門です。一覧にないグループからのメッセージは、メンバーが明示的にボットを @mention しても黙って捨てられます。サポートやチームのボットには、それが正しい既定です。

もっと気軽な使い方 — ボットに**ふだんは黙っていて**ほしいが、**はっきり呼ばれたときは応じて**ほしい友人のグループチャットなど — では `guest_mode` を有効にします。

```yaml
gateway:
  platforms:
    telegram:
      extra:
        group_allowed_chats:
          - "-1001234567890"   # your main allowlisted group
        guest_mode: true       # non-allowlisted groups: allow on @mention only
```

同じ意味の環境変数:

```bash
TELEGRAM_GUEST_MODE=true
```

既定は `false` です。

`guest_mode: true` のとき、許可一覧にないグループからのメッセージは、ボットを明示的に @mention したときに**だけ**処理されます。メンションは毎回必要で、客人としてのやり取りにはセッションの粘りがありません。呼ばれていない友人のグループの会話に、ボットが勝手に加わることはありません。

DM と許可一覧にあるグループの振る舞いは、これまでとまったく同じです。

## スラッシュコマンドのアクセス制御 {#slash-command-access-control}

既定では、許可されたすべての利用者がすべてのスラッシュコマンドを実行できます。許可一覧を、すべてのスラッシュコマンドを使える**管理者**と、明示的に有効にしたコマンドだけを使える**一般利用者**に分けるには、プラットフォームの `extra` のブロックに `allow_admin_from` と `user_allowed_commands` を追加します。

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

**振る舞い:**

- ある範囲（DM またはグループ）の `allow_admin_from` に入っている利用者は、登録されている**すべて**のスラッシュコマンドを、組み込みのものもプラグインが登録したものも含めて、実行時の登録簿を通じて実行できます。
- `allow_from` にいるが `allow_admin_from` に**いない**利用者が実行できるのは、`user_allowed_commands` に挙げたコマンドと、常に許可されている最低限の `/help` と `/whoami` だけです。
- ふつうの会話（スラッシュでないメッセージ）は影響を受けません。管理者でない利用者もこれまでどおりエージェントと話せます。任意のコマンドを起動できないだけです。
- **以前との互換性:** ある範囲について `allow_admin_from` を設定していない場合、その範囲ではスラッシュコマンドの制御が無効になります。既存の環境は何も変えずに動き続けます。
- DM の管理者であることは、グループでの管理者であることを意味しません。範囲ごとに別の管理者一覧を持ちます。
- `group_allow_admin_from` だけを設定した場合、DM の範囲は制限なし（以前との互換）のままです。

`/whoami` を使うと、いまの範囲、自分の区分（管理者 / 利用者 / 制限なし）、実行できるスラッシュコマンドが分かります。

## 対話形式のモデル選択 {#interactive-model-picker}

Telegram のチャットで引数なしの `/model` を送ると、Hermes はモデルを切り替えるための対話的なインラインキーボードを出します。

1. **プロバイダーの選択** — 利用できるプロバイダーをモデル数付きで示すボタン（たとえば「OpenAI (15)」、いま使っているプロバイダーなら「✓ Anthropic (12)」）。
2. **モデルの選択** — ページ送りのモデルの一覧。**Prev**/**Next** の移動、プロバイダーの一覧へ戻る **Back**、そして **Cancel** が付きます。

いまのモデルとプロバイダーは上部に表示されます。移動はすべて同じメッセージをその場で編集して行われます（チャットが散らかりません）。

:::tip
正確なモデル名が分かっているなら、`/model <name>` と直接入力して選択を飛ばせます。`/model <name> --global` と入力すると、その変更をセッションをまたいで残せます。
:::

## DNS-over-HTTPS の予備の IP {#dns-over-https-fallback-ips}

一部の制限のあるネットワークでは、`api.telegram.org` が届かない IP に解決されることがあります。Telegram のアダプターには**予備の IP** の仕組みがあり、正しい TLS のホスト名と SNI を保ったまま、別の IP への接続を黙って試し直します。

### 仕組み {#how-it-works}

1. `TELEGRAM_FALLBACK_IPS` が設定されていれば、その IP がそのまま使われます。
2. そうでなければ、アダプターは **Google DNS** と **Cloudflare DNS** に DNS-over-HTTPS（DoH）で問い合わせて、`api.telegram.org` の別の IP を自動で探します。
3. 分かっている Telegram の API の IPv4 のアドレスは、デュアルスタックの `api.telegram.org` というホスト名**より先に**試されます。どこにも届かない IPv6 の経路は、エラーにならないまま `connect()` に留まることがあり、以前はそれがイベントループを縛って、30 秒の初期化の期限が発火しないことがありました。
4. DoH も塞がれているか時間切れになった場合は、埋め込みの IPv4 の種となる一覧（`149.154.166.110`、`149.154.167.220`）が、その IPv4 優先の一覧として使われます。ホスト名は最後の手段のままです。
5. いったん通った経路は「粘り」ます。以降の要求はそれを直接使います。ホスト名は、IPv6 しかないネットワークのための最後の手段として残されます。

### 設定 {#configuration}

```bash
# Explicit fallback IPs (comma-separated)
TELEGRAM_FALLBACK_IPS=149.154.167.220,149.154.167.221
```

あるいは `~/.hermes/config.yaml` で次のようにします。

```yaml
platforms:
  telegram:
    extra:
      fallback_ips:
        - "149.154.167.220"
```

:::tip
ふつうはこれを手で設定する必要はありません。DoH による自動の探索が、制限のあるネットワークのたいていの場合を扱います。`TELEGRAM_FALLBACK_IPS` の環境変数が要るのは、DoH までネットワークで塞がれている場合だけです。ホストで IPv6 が壊れている場合は、`config.yaml` で `network.force_ipv4: true` を設定して、プロセス全体で AAAA の問い合わせを飛ばすこともできます。
:::

## プロキシへの対応 {#proxy-support}

ネットワークがインターネットへ出るのに HTTP のプロキシを必要とする場合（企業ではよくあります）、Telegram のアダプターは標準のプロキシの環境変数を自動で読み、すべての接続をプロキシ経由にします。

### 対応している変数 {#supported-variables}

アダプターは、次の環境変数を順に確かめ、最初に設定されているものを使います。

1. `HTTPS_PROXY`
2. `HTTP_PROXY`
3. `ALL_PROXY`
4. `https_proxy` / `http_proxy` / `all_proxy`（小文字の版）

### 設定 {#configuration}

ゲートウェイを起動する前に、環境にプロキシを設定します。

```bash
export HTTPS_PROXY=http://proxy.example.com:8080
hermes gateway
```

あるいは `~/.hermes/.env` に足します。

```bash
HTTPS_PROXY=http://proxy.example.com:8080
```

プロキシは、主の接続にも、すべての予備の IP への接続にも適用されます。Hermes 側で追加の設定は要りません。環境変数が設定されていれば自動で使われます。

:::note
これは、Hermes が Telegram への接続に使う独自の予備の伝送の層についての説明です。他のところで使われている標準の `httpx` のクライアントは、もともとプロキシの環境変数をそのまま尊重します。
:::

## メッセージへのリアクション {#message-reactions}

ボットは、処理の様子を見せるためにメッセージへ絵文字のリアクションを付けられます。

- 👀 メッセージの処理を開始したとき
- 👍 応答を無事に送り終えたとき
- 👎 処理の途中でエラーが起きたとき

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
リアクションが積み重なる Discord と違い、Telegram の Bot API は 1 回の呼び出しでボットのリアクションをすべて置き換えます。👀 から 👍/👎 への変化は一度に起こるので、両方が同時に見えることはありません。
:::

:::tip
グループでリアクションを付ける権限がボットにない場合、リアクションの呼び出しは黙って失敗し、メッセージの処理はふつうに続きます。
:::

## チャンネルごとのプロンプト {#per-channel-prompts}

特定の Telegram のグループやフォーラムのトピックに、一時的なシステムプロンプトを割り当てられます。プロンプトはやり取りのたびに実行時に差し込まれ、記録として履歴に残らないので、変更はすぐ効きます。

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

キーはチャット ID（グループ / スーパーグループ）かフォーラムのトピックの ID です。フォーラムのグループでは、トピックの単位のプロンプトがグループの単位のプロンプトより優先されます。

- グループ `-1001234567890` の中のトピック `42` のメッセージ → トピック `42` のプロンプトを使う
- トピック `99`（項目なし）のメッセージ → グループ `-1001234567890` のプロンプトに落ちる
- 項目のないグループのメッセージ → チャンネルのプロンプトは適用されない

YAML の数値のキーは、自動で文字列に直されます。

## 困ったときは {#troubleshooting}

| 症状 | 対処 |
|---------|----------|
| ボットがまったく応答しない | `TELEGRAM_BOT_TOKEN` が正しいか確かめてください。`hermes gateway` のログにエラーがないか見てください。 |
| ボットが「unauthorized」と返す | 自分のユーザー ID が `TELEGRAM_ALLOWED_USERS` に入っていません。@userinfobot で確かめ直してください。 |
| ボットがグループのメッセージを無視する | プライバシーモードが有効なはずです。無効にする（手順 3）か、ボットをグループの管理者にしてください。**プライバシーを変えたら、ボットを外して入れ直すのを忘れずに。** |
| ボイスメッセージが文字起こしされない | 音声認識が使える状態か確かめてください。手元で文字起こしするなら `faster-whisper` を導入し、あるいは `~/.hermes/.env` に `GROQ_API_KEY` / `VOICE_TOOLS_OPENAI_KEY` を設定します。 |
| 音声の返信が吹き出しでなくファイルになる | `ffmpeg` を導入してください（Edge TTS の Opus への変換に必要です）。 |
| ボットのトークンが失効 / 無効 | BotFather で `/revoke` のあと `/newbot`、または `/token` で新しいトークンを作ってください。`.env` を更新します。 |
| webhook が更新を受け取らない | `TELEGRAM_WEBHOOK_URL` が外から届くか確かめてください（`curl` で試せます）。プラットフォームや逆プロキシが、その URL のポートに来た内向きの HTTPS の通信を、`TELEGRAM_WEBHOOK_PORT` で設定したローカルの待ち受けのポートへ流すようにしてください（同じ番号である必要はありません）。SSL/TLS が有効であることも確かめてください。Telegram は HTTPS の URL にしか送りません。ファイアウォールの設定も見てください。 |

## 実行の承認 {#exec-approval}

エージェントが危険かもしれないコマンドを実行しようとすると、チャットで承認を求めてきます。

> ⚠️ This command is potentially dangerous (recursive delete). Reply "yes" to approve.

承認するなら「yes」/「y」、拒否するなら「no」/「n」と返してください。

## 対話形式の問い合わせ（clarify） {#interactive-prompts-clarify}

エージェントが `clarify` ツールを呼んだとき — どの進め方がよいか尋ねる、作業後の感想を聞く、判断の前に確認する、といった場面で — Telegram では**インラインキーボードのボタン**として質問が表示されます。

> ❓ ダッシュボードにはどのフレームワークを使いましょうか？
>
> [1. Next.js] [2. Remix] [3. Astro]
> [✏️ その他（自由に入力）]

ボタンをタップして答えるか、**その他** をタップして自由に書いて答えます（次に送ったメッセージが答えになります）。選択肢のない自由形式の `clarify` では、ボタンは出ず、次のメッセージをそのまま受け取ります。

応答の制限時間は `~/.hermes/config.yaml` の `agent.clarify_timeout` で設定します（既定は `3600` 秒）。制限時間内に答えないと、エージェントは所定の合図とともに待機を解き、止まったままにならずに進みます。

Telegram がボタンのカードを表示できない場合（Bot API が拒む、15 秒の受領の時間内に送信が終わらない）、Hermes は同じ質問を番号付きの一覧の素のメッセージとして聞き直し、あなたが打った返事（番号か選択肢の文章）を答えとして受け取ります。それすら届けられないときは、制限時間を待って沈黙をあなたの無回答と取り違えるのではなく、`[clarify prompt could not be delivered]` とともにエージェントをすぐ解放します。

## 通知の量 {#push-notification-volume}

Telegram は、ボットが送るすべてのメッセージで通知を出します。ツールの進捗の吹き出し、逐次の更新、状態の知らせを出す長いやり取りでは、すぐにうるさくなります。Telegram のアダプターには通知の方式が 2 つあります。

| 方式 | 振る舞い |
|------|----------|
| `important`（既定） | 鳴るのは**最後の応答**、**承認の問い合わせ**、**スラッシュコマンドの確認**だけです。ツールの進捗、逐次の断片、状態のメッセージは `disable_notification=true` で届けられます。 |
| `all` | 送信するすべてのメッセージで通知が鳴ります。従来の振る舞いで、ツールの呼び出しを本当にすべて知りたい場合に選んでください。 |

`~/.hermes/config.yaml` で設定します。

```yaml
display:
  platforms:
    telegram:
      notifications: important   # or "all"
```

環境変数での上書き（手早く比べたいときに便利です）:

```bash
HERMES_TELEGRAM_NOTIFICATIONS=all
```

分からない値は警告を記録して `important` に落ちます。

## 状態のメッセージはその場で書き換えられる {#status-messages-edited-in-place}

Telegram のアダプターは、繰り返し来るエージェントの状態の知らせ（「Compressing context…」「Calling tool…」など）を `send_or_update_status()` に通します。これは `{(chat_id, status_key) → message_id}` のキャッシュを持ち、次からは新しい吹き出しを足す代わりに**既存の吹き出しを書き換えます**。`status_key` が違えばそれぞれ別のメッセージになりますし、違うチャットどうしがぶつかることもありません。書き換えに失敗した場合（利用者がメッセージを消した、Telegram が書き換えを許す期間より古い、など）、キャッシュの項目は捨てられ、次のときに新しいメッセージを出して ID を覚え直します。設定は要りません。これが Telegram での既定の振る舞いです。`send_or_update_status` を実装していない他のアダプターは、これまでどおり素の `send()` に落ちます。

## エージェントのやり取りの間、受信メッセージをピン留めする {#pin-incoming-user-message-during-agent-turn}

利用者がエージェントのやり取りを起こすメッセージを送ると、Telegram のアダプターはそのやり取りの間だけその受信メッセージをピン留めし、応答が終わると外します。ボットがそのメッセージを無視しているのではなく、いま取り組んでいることを示す、軽い目印です。ピン留めには `disable_notification=true` を使うので、余計な通知は出ません。設定は要りません。

## セキュリティ {#security}

:::warning
ボットとやり取りできる人を絞るために、`TELEGRAM_ALLOWED_USERS` を必ず設定してください。設定がない場合、ゲートウェイは安全側に倒してすべての利用者を拒否します。
:::

ボットのトークンを人目に触れる場所に出さないでください。漏れた場合は、BotFather の `/revoke` のコマンドですぐ失効させてください。

詳しくは [セキュリティの文書](/hermes/docs/user-guide/security/) を参照してください。利用者の認可をもっと柔らかく扱う方法として、[DM のペアリング](/hermes/docs/user-guide/messaging/#dm-pairing-alternative-to-allowlists) も使えます。
