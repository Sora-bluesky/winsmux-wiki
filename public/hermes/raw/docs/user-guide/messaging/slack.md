---
title: "Slack"
description: "Socket Mode を使って Hermes Agent を Slack のボットとして設定する"
upstream_path: user-guide/messaging/slack.md
upstream_blob: 544ed727e9142f90e85fe2cb703c3966b0396872
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/slack
---

# Slack の設定 {#slack-setup}

Socket Mode を使って、Hermes Agent をボットとして Slack につなぎます。Socket Mode は公開された HTTP
の受け口ではなく WebSocket を使うので、Hermes を動かしている環境をインターネットに公開する必要が
ありません。ファイアウォールの内側でも、手元のノートパソコンでも、非公開のサーバーでも動きます。

:::warning クラシック Slack アプリは廃止されました
（RTM API を使う）クラシック Slack アプリは **2025 年 3 月に完全に廃止されました**。Hermes は現行の
Bolt SDK と Socket Mode を使います。古いクラシックアプリをお持ちの場合は、以下の手順で新しいアプリを
作り直してください。
:::

## 全体像 {#overview}

| 構成要素 | 内容 |
|-----------|-------|
| **ライブラリ** | Python 向けの `slack-bolt` / `slack_sdk`（Socket Mode） |
| **接続方式** | WebSocket — 公開 URL は不要 |
| **必要な認証トークン** | ボットトークン（`xoxb-`）とアプリレベルトークン（`xapp-`） |
| **ユーザーの識別** | Slack のメンバー ID（例: `U01ABC2DEF3`） |

---

## ステップ 1: Slack アプリを作る {#step-1-create-a-slack-app}

いちばん早いのは、Hermes が生成してくれるマニフェストを貼り付ける方法です。組み込みのスラッシュ
コマンド（`/btw`、`/stop`、`/model` など）、必要な OAuth スコープ、イベントの購読設定がすべて宣言
され、Socket Mode も有効になります。これらが一度に片付きます。

### 方法 A: Hermes が生成したマニフェストから作る（おすすめ） {#option-a-from-a-hermes-generated-manifest-recommended}

1. マニフェストを生成します。新しく作る Slack アプリでは Agent view を使う必要があります。
   ```bash
   hermes slack manifest --agent-view --write
   ```
   これで `~/.hermes/slack-manifest.json` が書き出され、貼り付け手順が表示されます。Slack の従来の
   Assistant view をまだ使っている既存アプリは、移行の準備ができるまで `--agent-view` を省略しても
   かまいません。

   Slack のアプリ長文説明を、既存の UTF-8 テキストや Markdown ファイルから埋めたいときは
   `--long-description-file` を付けます。

   ```bash
   hermes slack manifest --agent-view \
     --long-description-file AGENTS.md --write
   ```

   ファイルの中身は、Slack が定める 175〜4,000 文字の範囲内でそのまま保たれます。文章を直接
   書きたいときは `--long-description "..."` を使ってください。この 2 つは同時には指定できず、
   どちらも `--slashes-only` とは併用できません。
2. [https://api.slack.com/apps](https://api.slack.com/apps) を開き、**Create New App** →
   **From an app manifest** の順に進みます
3. ワークスペースを選び、JSON の内容を貼り付けて確認したら、**Next** → **Create** を
   クリックします
4. **ステップ 6: アプリをワークスペースにインストールする** まで飛ばしてかまいません。スコープ、
   イベント、スラッシュコマンドはマニフェストが片付けてくれています。

### 方法 B: ゼロから作る（手動） {#option-b-from-scratch-manual}

1. [https://api.slack.com/apps](https://api.slack.com/apps) を開きます
2. **Create New App** をクリックします
3. **From scratch** を選びます
4. アプリ名（例: 「Hermes Agent」）を入力し、ワークスペースを選びます
5. **Create App** をクリックします

アプリの **Basic Information** ページが開きます。以下のステップ 2〜6 に進んでください。

---

## ステップ 2: ボットトークンのスコープを設定する {#step-2-configure-bot-token-scopes}

サイドバーの **Features → OAuth & Permissions** を開きます。**Scopes → Bot Token Scopes** まで下にたどり、次のスコープを追加します。

| スコープ | 役割 |
|-------|---------|
| `chat:write` | ボットとしてメッセージを送る |
| `app_mentions:read` | チャンネルで @メンションされたことを検知する |
| `channels:history` | ボットが参加しているパブリックチャンネルのメッセージを読む |
| `channels:read` | パブリックチャンネルの一覧と情報を取得する |
| `groups:history` | ボットが招待されたプライベートチャンネルのメッセージを読む |
| `im:history` | ダイレクトメッセージの履歴を読む |
| `im:read` | DM の基本情報を見る |
| `im:write` | DM を開いて扱う |
| `mpim:history` | グループ DM（複数人の DM）の履歴を読む |
| `mpim:read` | グループ DM の基本情報を見る |
| `users:read` | ユーザー情報を調べる |
| `files:read` | 添付ファイル（ボイスメモや音声を含む）を読み取ってダウンロードする |
| `files:write` | ファイル（画像・音声・書類）をアップロードする |

:::caution スコープが足りないと機能も足りなくなります
`channels:history` と `groups:history` がないと、ボットは**チャンネルのメッセージを受け取れません**。
DM でしか動かなくなります。`files:read` がないと、Hermes は会話はできても**ユーザーがアップロードした
添付ファイルを安定して読めません**。この 2 つがいちばん見落とされやすいスコープです。
:::

**任意のスコープ:**

| スコープ | 役割 |
|-------|---------|
| `groups:read` | プライベートチャンネルの一覧と情報を取得する |
| `assistant:write` | メッセージの処理中に、ボット名の横に作業中の状態を示す行（「is thinking…」）を表示します。このスコープがないと `assistant.threads.setStatus` の呼び出しが黙って失敗し、代わりに Slack が用意した文言（「Finding answers…」「Reviewing findings…」など）が入れ替わりで表示されます。この文言を Hermes 側で決めることはできません。`typing_status_text` を画面に反映させたい場合は必須です。 |

---

## ステップ 3: Socket Mode を有効にする {#step-3-enable-socket-mode}

Socket Mode を使うと、公開 URL を用意しなくても WebSocket でボットを接続できます。

1. サイドバーの **Settings → Socket Mode** を開きます
2. **Enable Socket Mode** をオンにします
3. **App-Level Token** の作成を求められます
   - 名前は `hermes-socket` のような分かりやすいものにします（名前は何でもかまいません）
   - **`connections:write`** スコープを追加します
   - **Generate** をクリックします
4. **トークンをコピーします** — `xapp-` で始まる文字列です。これが `SLACK_APP_TOKEN` になります

:::tip
アプリレベルトークンは、**Settings → Basic Information → App-Level Tokens** からいつでも確認・再生成できます。
:::

---

## ステップ 4: イベントを購読する {#step-4-subscribe-to-events}

ここは重要なステップです。ボットがどのメッセージを見られるかが、この設定で決まります。

1. サイドバーの **Features → Event Subscriptions** を開きます
2. **Enable Events** をオンにします
3. **Subscribe to bot events** を開いて、次のイベントを追加します

| イベント | 必須か | 役割 |
|-------|-----------|---------|
| `message.im` | **必須** | ボットがダイレクトメッセージを受け取る |
| `message.mpim` | **必須** | ボットが追加された**グループ DM**（複数人の DM）のメッセージを受け取る |
| `message.channels` | **必須** | ボットが追加された**パブリック**チャンネルのメッセージを受け取る |
| `message.groups` | **推奨** | ボットが招待された**プライベート**チャンネルのメッセージを受け取る |
| `app_mention` | **必須** | ボットが @メンションされたときに Bolt SDK のエラーが出るのを防ぐ |

4. ページ下部の **Save Changes** をクリックします

:::danger イベント購読の漏れが、設定でいちばん多いつまずきです
DM では動くのに**チャンネルでは動かない**なら、ほぼ確実に `message.channels`（パブリックチャンネル用）
か `message.groups`（プライベートチャンネル用）の追加を忘れています。これらのイベントがないと、Slack は
チャンネルのメッセージをボットに届けてくれません。
:::

---

## ステップ 5: メッセージタブを有効にする {#step-5-enable-the-messages-tab}

このステップで、ボットへのダイレクトメッセージが使えるようになります。設定しないと、DM を送ろうとしたユーザーに **「Sending messages to this app has been turned off」** と表示されます。

1. サイドバーの **Features → App Home** を開きます
2. **Show Tabs** までたどります
3. **Messages Tab** をオンにします
4. **「Allow users to send Slash commands and messages from the messages tab」** にチェックを入れます

:::danger この設定がないと DM は完全に塞がれます
スコープとイベント購読が正しく揃っていても、メッセージタブが有効でない限り Slack はボットへのダイレクトメッセージを許しません。これは Slack というプラットフォーム側の決まりで、Hermes の設定の問題ではありません。
:::

---

## ステップ 6: アプリをワークスペースにインストールする {#step-6-install-app-to-workspace}

1. サイドバーの **Settings → Install App** を開きます
2. **Install to Workspace** をクリックします
3. 権限を確認して **Allow** をクリックします
4. 認可が終わると、`xoxb-` で始まる **Bot User OAuth Token** が表示されます
5. **このトークンをコピーします** — これが `SLACK_BOT_TOKEN` になります

:::tip
あとからスコープやイベント購読を変えたときは、**アプリを再インストールしないと**変更が反映されません。
Install App のページに、再インストールを促す帯が表示されます。
:::

---

## ステップ 7: 許可リスト用のユーザー ID を調べる {#step-7-find-user-ids-for-the-allowlist}

Hermes は許可リストに Slack の**メンバー ID** を使います（ユーザー名や表示名ではありません）。

メンバー ID の調べ方:

1. Slack でユーザーの名前かアイコンをクリックします
2. **View full profile** をクリックします
3. **⋮**（その他）ボタンをクリックします
4. **Copy member ID** を選びます

メンバー ID は `U01ABC2DEF3` のような形です。少なくとも自分自身のメンバー ID は必要になります。

---

## ステップ 8: Hermes を設定する {#step-8-configure-hermes}

`~/.hermes/.env` ファイルに次の内容を追記します。

```bash
# Required
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_APP_TOKEN=xapp-your-app-token-here
SLACK_ALLOWED_USERS=U01ABC2DEF3              # Comma-separated Member IDs

# Optional
SLACK_HOME_CHANNEL=C01234567890              # Default channel for cron/scheduled messages
SLACK_HOME_CHANNEL_NAME=general              # Human-readable name for the home channel (optional)
```

対話形式のセットアップを使ってもかまいません。次のコマンドを実行し、プロンプトで Slack を選びます。

```bash
hermes gateway setup    # Select Slack when prompted
```

続いてゲートウェイを起動します。前面で動かす、ユーザーのサービスとして入れる、Linux で起動時に立ち上がるシステムサービスとして入れる、の 3 通りがあります。

```bash
hermes gateway              # Foreground
hermes gateway install      # Install as a user service
sudo hermes gateway install --system   # Linux only: boot-time system service
```

:::tip Codex の推論の強さについての注意
Codex を使う Slack のピアエージェント用チャンネルでは、`agent.reasoning_effort: high` かそれ以下を
おすすめします。`xhigh` にすると、ターンのすべてを隠れた推論に費やして、見える返答をまったく出さない
ことがあります。この場合、Hermes は未完了ターンの警告をスレッドに出さず、診断情報はゲートウェイの
ログに残します。
:::

---

## ステップ 9: ボットをチャンネルに招待する {#step-9-invite-the-bot-to-channels}

ゲートウェイを起動したら、ボットに応答してほしいチャンネルそれぞれに**ボットを招待**する必要があります。

```
/invite @Hermes Agent
```

ボットが自分からチャンネルに参加することは**ありません**。チャンネルごとに招待してください。

---

## スラッシュコマンド {#slash-commands}

Hermes のコマンド（`/btw`、`/stop`、`/new`、`/model`、`/help` など）は
すべて Slack ネイティブのスラッシュコマンドです。Telegram や Discord での
動き方とまったく同じです。Slack で `/` を打つと、補完候補に Hermes の
コマンドが説明付きで並びます。

仕組みはこうです。Hermes には Slack アプリのマニフェスト生成機能があり（ステップ 1 の
方法 A を参照）、
[`COMMAND_REGISTRY`](https://github.com/NousResearch/hermes-agent/blob/main/hermes_cli/commands.py)
にあるコマンドをすべてスラッシュコマンドとして宣言します。Socket Mode では、
マニフェストの `url` の値にかかわらず、Slack がコマンドのイベントを
WebSocket 経由で届けます。

### Agent のメッセージ体験 {#agent-messaging-experience}

新しく作る Slack アプリは、Slack の **Agent** メッセージ体験を使います。既存の Hermes
Assistant アプリは、`--agent-view` を付けてマニフェストを作り直せば移行できます。

```bash
hermes slack manifest --agent-view --write
```

**Features → App Manifest** でマニフェストを更新し、Slack から求められたらアプリを再インストール
します。Agent view から Assistant view へ戻すことはできません。切り替え後、ユーザーは Slack の
再読み込み（キャッシュを無視した読み込み）が必要になることがあります。生成される Agent 用マニフェストは
`message.im`、`app_home_opened`、`app_context_changed` を購読するので、Hermes はメッセージタブでの DM を
見分けられ、ユーザーが今開いている Slack の文脈をターンと一緒に受け取れます。Hermes はその文脈を
ラベルとして受け取るだけで、見ているチャンネルの履歴を読むことはありません。

### 更新後にスラッシュコマンドを取り込み直す {#refreshing-slash-commands-after-updates}

Hermes に新しいコマンドが増えたとき（`hermes update` のあとなど）は、マニフェストを
作り直して Slack アプリを更新します。

```bash
hermes slack manifest --write
```

そのあと Slack 側で次の操作をします。
1. [https://api.slack.com/apps](https://api.slack.com/apps) を開き、
   自分の Hermes アプリを選びます
2. **Features → App Manifest → Edit** を開きます
3. `~/.hermes/slack-manifest.json` の新しい内容を貼り付けます
4. **Save** します。スコープやスラッシュコマンドが変わっていれば、Slack が
   アプリの再インストールを促します。

### 従来の `/hermes <subcommand>` も使えます {#legacy-hermes-subcommand-still-works}

古いマニフェストとの互換のため、`/hermes btw run the tests` という
書き方も引き続き使えます。Hermes は `/btw run the tests` と同じように
扱います。自由な文の質問も通ります。`/hermes what's the
weather?` は普通のメッセージとして扱われます。

### スレッドの中でコマンドを使う（`!cmd` という前置き） {#using-commands-inside-threads-the-cmd-prefix}

Slack はスレッドの返信の中でネイティブのスラッシュコマンドを使えないように
しています。スレッドで `/queue` を打つと、Slack は *「/queue is not supported
in threads. Sorry!」* と返します。これを有効にするアプリ側の設定はなく、
Slack が Hermes にコマンドを届けることもありません。

そこで Hermes は、代わりの前置きとして先頭の `!` を認識します。これは
スレッドの中でも（それ以外の場所でも）使えます。`!queue`、`!stop`、
`!model gpt-5.4` などを普通のスレッド返信として打てば、Hermes は
スラッシュ形式とまったく同じように扱い、同じスレッドに返します。

コマンドかどうかを判定するのは最初の 1 語だけなので、`!nice work` のような
何気ないメッセージはそのままエージェントに渡ります。この感嘆符の形は、
メンションのうしろ（`@Hermes !stop`）でも、先頭に空白があっても使えます。
どちらもスレッド内でコマンドとして実行されます。

承認を求めるやりとり（危険なコマンドや `execute_code` の承認）は、
通常は押せるボタンとして表示されます。ボタンを届けられず Hermes が
文字での確認に切り替えたときは、`!approve` / `!deny` で返すよう案内されます。
これがスレッドの中でも通る書き方です。

### スラッシュコマンドの返信は自分だけに見えます {#slash-replies-are-ephemeral}

ネイティブのスラッシュコマンド（`/status`、`/help` など）への返信は
**その場かぎりの表示**で届きます。「Only visible to you」と付くもので、
コマンドの出力がチャンネルを埋めることはありません。「Running /cmd…」という仮の表示は
実際の返信に置き換わります。長い返信は、続きの自分だけに見えるメッセージに分けて送られます。
Slack はこの返信の流れを 5 通までに制限しているので、極端に長い出力は黙って消えるのではなく、
打ち切りを知らせる文言で締めくくられます。最初の経路がうまくいかないときは、Hermes が
2 つ目の同種の API 経路で送り直します。代わりにチャンネルへ公開で投稿することはありません。
（普通のメッセージとして打ったコマンド — スレッドでの `!cmd` や `@Hermes /cmd` — は、
通常どおり全員に見える返信になります。）

### 確認のやりとり（ワンタップのボタン） {#clarify-prompts-one-tap-buttons}

エージェントが選択肢つきの質問をする必要があるとき（`clarify` ツール）、
Slack では **Block Kit のボタン**として表示されます。選択肢ごとに 1 タップで答えられ、
「✏️ Other…」ボタンを押すと自由入力に切り替わります（次に打ったメッセージが答えになります）。
タップするとメッセージがその場で書き換わり、誰が何を選んだかが分かります。同じ質問への
その後のクリックは無視されます。ボタンの操作にもメッセージと同じユーザー認可がかかり、
期限切れの質問（ゲートウェイの再起動やタイムアウト）は、黙ってクリックを飲み込むのではなく、
聞き直すよう知らせます。選択肢のない質問はそのまま文として表示され、次に打った返信を答えとして
受け取ります。設定は不要で、`rich_blocks` の設定にかかわらず動きます。

### 応用: スラッシュコマンドの配列だけを出力する {#advanced-emit-only-the-slash-commands-array}

Slack のマニフェストを自分で管理していて、スラッシュコマンドの一覧だけが
欲しいときは、次のコマンドで書き出せます。

```bash
hermes slack manifest --slashes-only > /tmp/slashes.json
```

出力された配列を、手元のマニフェストの `features.slash_commands` の値として
貼り付けてください。

---

## ボットの応答のしかた {#how-the-bot-responds}

場面ごとに Hermes がどう振る舞うかを整理します。

| 場面 | 振る舞い |
|---------|----------|
| **DM** | すべてのメッセージに応答します。@メンションは不要です |
| **チャンネル** | **@メンションされたときだけ**応答します（例: `@Hermes Agent what time is it?`）。チャンネルでは、そのメッセージにぶら下がるスレッドで返します。 |
| **スレッド** | 既存のスレッドの中で Hermes を @メンションすると、同じスレッドで返します。ボットがそのスレッドでセッションを持っている間は、**続く返信に @メンションは要りません**。会話の流れをそのまま追いかけます。 |

:::tip
チャンネルで会話を始めるときは、必ずボットを @メンションしてください。ボットがスレッドで動き出したあとは、メンションなしでそのスレッドに返信できます。スレッドの外では、メンションのないメッセージは無視されます。人の多いチャンネルで騒がしくならないようにするためです。
:::

---

## 設定できること {#configuration-options}

ステップ 8 で設定した必須の環境変数のほかに、`~/.hermes/config.yaml` から Slack ボットの振る舞いを細かく変えられます。

### スレッドと返信の振る舞い {#thread-reply-behavior}

```yaml
platforms:
  slack:
    # Controls how multi-part responses are threaded
    # "off"   — never thread replies to the original message
    # "first" — first chunk threads to user's message (default)
    # "all"   — all chunks thread to user's message
    reply_to_mode: "first"

    extra:
      # Whether to reply in a thread (default: true).
      # When false, channel messages get direct channel replies instead
      # of threads. Messages inside existing threads still reply in-thread.
      reply_in_thread: true

      # Also post thread replies to the main channel
      # (Slack's "Also send to channel" feature).
      # Only the first chunk of the first reply is broadcast.
      reply_broadcast: false

      # Render agent messages as Slack Block Kit blocks (default: false).
      # When true, the final agent message is sent with structured blocks —
      # section headers, dividers, true nested lists (via rich_text), and
      # native Block Kit tables — instead of flat mrkdwn text. A plain-text
      # fallback is always sent alongside for notifications/accessibility.
      # Tables exceeding Slack's limits (100 rows / 20 cols / 10k chars)
      # gracefully fall back to aligned monospace.
      rich_blocks: false

      # Append Slack-native feedback controls to final Block Kit replies.
      # Requires rich_blocks: true. Default: false.
      feedback_buttons: false

      # Render live tool calls as Slack-native plan/task cards. This explicit
      # opt-in activates native progress even when text tool_progress is off.
      # If Slack rejects the native stream, Hermes keeps one editable text
      # fallback current for the rest of the turn.
      native_task_cards: false

      # Suggested prompts pinned at the top of Agent view's Messages tab.
      # Either a list of {title, message} rows, or a titled object:
      # {title: "Start here", prompts: [{title: "Plan", message: "..."}]}
      suggested_prompts: []

      # Title Agent/Assistant DM threads from the first user message.
      # Default: true. Set false to leave Slack's default thread titles.
      assistant_thread_titles: true

      # Accept messages posted by other Slack bots (default: "none").
      # "none" ignores bots, "mentions" accepts a bot message only when
      # that message itself @mentions Hermes, and "all" accepts every
      # other bot. Hermes always ignores its own bot user to prevent
      # self-echoes.
      allow_bots: "none"

      # Continuable-cron delivery surface (default: "thread").
      # "in_channel" delivers a continuable cron job FLAT into the channel
      # (no dedicated thread); pair with reply_in_thread: false (and
      # require_mention: false) so a plain reply continues the job.
      # See the cron guide → "Flat, in-channel continuation".
      cron_continuable_surface: thread
```

| キー | 既定値 | 説明 |
|-----|---------|-------------|
| `platforms.slack.reply_to_mode` | `"first"` | 複数に分かれたメッセージをスレッドにする方式: `"off"`、`"first"`、`"all"` |
| `platforms.slack.extra.reply_in_thread` | `true` | `false` にすると、チャンネルのメッセージにはスレッドではなく直接返します。既存スレッド内のメッセージには、これまでどおりスレッドで返します。 |
| `platforms.slack.extra.reply_broadcast` | `false` | `true` にすると、スレッドの返信を元のチャンネルにも投稿します。流れるのは最初のひとかたまりだけです。 |
| `platforms.slack.extra.rich_blocks` | `false` | `true` にすると、エージェントのメッセージを [Block Kit](https://docs.slack.dev/block-kit/) のブロック（見出し、区切り線、本物の入れ子リスト、ネイティブの表）として表示します。プレーンテキストの控えも必ず同時に送られます。Slack の上限を超える表は、桁を揃えた等幅表示に切り替わります。アプリの再インストールは不要です。送る側だけの変更だからです。 |
| `platforms.slack.extra.feedback_buttons` | `false` | `rich_blocks` と併せて `true` にすると、最後の返信に Slack ネイティブのフィードバック操作を付け足します。 |
| `platforms.slack.extra.native_task_cards` | `false` | `true` にすると、実行中のツール呼び出しを Slack ネイティブのプラン／タスクカードとして表示します。これは Slack の既定である `tool_progress: off` とは別に、進捗表示を明示的に選ぶ設定です。ネイティブ API が失敗したときは、ひとつのメッセージを編集し続ける方式に切り替わります。 |
| `platforms.slack.extra.suggested_prompts` | `[]` | Agent／Assistant の DM 入口に出す `{title, message}` を最大 4 件まで。配列でも `{title, prompts}` の形でも指定できます。 |
| `platforms.slack.extra.assistant_thread_titles` | `true` | `true` にすると、Agent／Assistant の DM スレッドの名前を最初のユーザーメッセージから付けます。 |
| `platforms.slack.extra.allow_bots` | `"none"` | 他の Slack ボットからのメッセージの扱い: `"none"` は無視、`"mentions"` は**そのメッセージ自体**が Hermes を @メンションしている場合だけ受け取る、`"all"` はすべて受け取る。ボット同士の連携をいちばん安全にやるなら `"mentions"` です。[他のボットからのメッセージを受け取る](#accepting-messages-from-other-bots-allow_bots)を参照してください。 |
| `platforms.slack.extra.cron_continuable_surface` | `"thread"` | [続けて会話できる cron ジョブ](/hermes/docs/user-guide/features/cron/#flat-in-channel-continuation-slack)の届け先。`"thread"` は配信ごとに専用スレッドを開きます（既定）。`"in_channel"` はチャンネルの流れにそのまま届けます。`in_channel` を使うときは `reply_in_thread: false`（と `require_mention: false`）を組み合わせると、普通のチャンネル返信でジョブを続けられます。 |

これに対応する環境変数は `SLACK_ALLOW_BOTS=none|mentions|all` です。
両方を設定した場合は `platforms.slack.extra.allow_bots` が優先されます。相手のボットが
明示的なメンションなしに返事できる場面では `all` を避けてください。相手側の返信方針しだいで
やりとりが延々と続いてしまうことがあります。

### 作業中を示す行 {#working-state-status-line}

エージェントがメッセージを処理している間、Slack はスレッド内のボット名の横に状態を示す行を
表示します。既定では Hermes が `is thinking...` と設定します。これは `typing_status_text` で
変えられます。たとえば Ada という名前の子猫アシスタントならこうです。

```yaml
platforms:
  slack:
    # Custom working-state status line (default: "is thinking...").
    typing_status_text: "is pouncing… 🐾"
```

| キー | 既定値 | 説明 |
|-----|---------|-------------|
| `platforms.slack.typing_status_text` | `"is thinking..."` | エージェントがメッセージを処理している間に表示される、作業中を示す行の文言。`assistant:write` スコープが必要です。これがないと状態の設定は黙って失敗し、ここに何を書いていても Slack が用意した一般的な文言が表示されます。行そのものを消したいときは `typing_indicator: false` にしてください。 |

:::note どこに表示されるか
この文言が出るのは、**返信入力欄の下にある帯**（「*BotName* is thinking…」）で、メッセージ一覧の中ではありません。AI アプリが動いている間にメッセージ領域に出る「Generating response…」「Finding answers…」といった行は、**Slack が独自に切り替えて出しているもの**です。`assistant.threads.setStatus` はそれを操作できず、両方が同時に出ることもあります。
:::

同じキーで、Google Chat 側の作業中を示すメッセージも変えられます
（`platforms.google_chat.typing_status_text`、既定は `"Hermes is thinking…"`）。
ただし Google Chat では、これはその場かぎりの表示ではなく実際に投稿されるメッセージで、
あとから返信の内容に差し替えられます。

### ツールごとの実況表示 {#live-status-per-tool}

既定では、この状態の行は**エージェントの作業に合わせて刻々と変わります**。固定の
`is thinking...` ではなく、いま何をしているのかが出ます。`is
running pytest tests/…`、`is reading docs/api.md…`、`is searching the web for
slack api limits…` といった具合です。ツールの呼び出しと呼び出しの間は、固定の文言に戻ります。
これは既存の更新の間隔に乗るだけなので、Slack の API を余分に呼ぶことはありません。
`tool_progress: off`（Slack の既定）でも動きます。進捗の吹き出しと違って、
この行はその場かぎりの表示で、チャンネルには何も残しません。

制御には `display.live_status` を使います（全体でも、プラットフォームごとでも指定できます）。

```yaml
display:
  platforms:
    slack:
      # full = verb + argument ("is running pytest…")   [default]
      # verb = verb only ("is running…") — hides commands/paths,
      #        useful in shared or customer-facing channels
      # off  = static text (typing_status_text or "is thinking...")
      live_status: full
```

| キー | 既定値 | 説明 |
|-----|---------|-------------|
| `display.live_status` | `"full"` | ツールごとの実況表示。`full` は動作とその対象まで表示します。`verb` は動作だけを表示し、ファイルのパスやコマンドを共有チャンネルに出しません。`off` は固定の文言に戻します。固定の行と同じく `assistant:write` スコープが必要です。 |

### ネイティブのストリーミング（打ち込むように出る返信） {#native-streaming-live-typing-replies}

Slack の [Agents & AI Apps](https://docs.slack.dev/ai/) には、返信をその場で打ち込むように
表示するネイティブの仕組み（`chat.startStream` / `chat.appendStream` /
`chat.stopStream`）があります。従来の編集による段階的な更新より、ずっと滑らかです。
`streaming.enabled` がオン（transport が `auto` か `draft`）なら、Hermes は使える場面で
自動的にこの仕組みを使います。

- 最初のかたまりでストリームを開始し、以降は差分だけを追加します（この API は追加しかできません）。
  流れてきたメッセージ**そのもの**が最終的なメッセージです。Hermes は `chat.stopStream` で
  それを締めくくり、同じ内容をもう一度投稿することはありません。
- Slack アプリ側で AI 機能が有効になっていない場合（または `assistant:write` スコープが
  ない場合）、最初の失敗を覚えておき、編集方式のストリーミングに切り替えます。このとき
  対処法を示す警告がログに 1 回だけ出ます。
- 任意で有効にする Block Kit（`rich_blocks: true`）は、締めくくられたメッセージにも
  適用されます。編集方式で仕上げる場合と同じです。

ストリーミングを有効にする以外に、追加の設定は要りません。

```yaml
streaming:
  enabled: true       # transport auto/draft lights up Slack native streaming
```

### ネイティブのタスクカード（ツールの進捗表示） {#native-task-cards-live-tool-progress}

`platforms.slack.extra.native_task_cards: true` にすると、実行中のツール呼び出しが
文字の進捗の吹き出しではなく、Slack ネイティブの**プラン／タスクカード**（Slack 自身の
AI 機能と同じ見た目）で表示されます。1 ターンにつきカードが 1 枚、ツール呼び出しごとに
1 行が並び、実行中・完了・エラーの状態がその場で書き換わります。

```yaml
platforms:
  slack:
    extra:
      native_task_cards: true
```

- これは進捗表示を明示的に選ぶ設定です。Slack の既定が `tool_progress: off` でも動きます
  （文字の吹き出しはチャンネルを埋めますが、ネイティブのカードは埋めません）。
- 同じツールを同時に呼んだ場合も、実際のツール呼び出し ID でひも付けられます。並行して走る
  `web_search` は、それぞれが自分の行と状態を持ちます。
- ネイティブの表示を開始・更新できないときは、ひとつのメッセージを編集し続ける方式に切り替わり、
  そのターンの進捗は変わらず見えます。
- カードの表示は、ターンが終わるときにちょうど一度だけ止まります。中断や切断のときも同じなので、
  実行中の表示が取り残されることはありません。

### セッションの分離 {#session-isolation}

```yaml
# Global setting — applies to Slack and all other platforms
group_sessions_per_user: true
```

`true`（既定）のときは、共有チャンネルにいるユーザーそれぞれが自分だけの会話セッションを持ちます。`#general` で 2 人が Hermes に話しかけても、履歴と文脈は別々になります。

チャンネル全体でひとつの会話セッションを共有する協働モードにしたいときは `false` にします。ただし、文脈の増え方もトークンの費用も全員で分け合うことになり、誰かが `/reset` するとセッション全体が消える点には注意してください。

### メンションと反応のしかた {#mention-trigger-behavior}

```yaml
slack:
  # Require @mention in channels (this is the default behavior;
  # the Slack adapter enforces @mention gating in channels regardless,
  # but you can set this explicitly for consistency with other platforms)
  require_mention: true

  # Prevent thread auto-engagement: only reply to channel messages that
  # contain an explicit @mention. With this OFF (default), Slack can
  # "auto-engage" — remembering past mentions in a thread and following
  # up on bot-message replies, and resuming active sessions without a
  # fresh mention. With strict_mention ON, every new channel message
  # must @mention the bot before Hermes will respond.
  strict_mention: false

  # Ignore messages addressed to another user: when a channel or thread
  # message *opens* by @mentioning someone other than the bot (e.g.
  # "@rasha can you take this?"), stay silent unless the bot is also
  # mentioned. Only a *leading* mention counts as "addressed to" — a
  # message that references someone mid-sentence ("loop in @rasha")
  # still reaches the bot. Overrides free_response_channels and thread
  # auto-engagement. Opt-in; default off. Env: SLACK_IGNORE_OTHER_USER_MENTIONS.
  ignore_other_user_mentions: false

  # Require an explicit @mention for THREAD replies, while leaving
  # top-level channel messages governed by require_mention /
  # free_response_channels. Narrower than strict_mention: use it when a
  # free-response bot should not join every follow-up in busy threads.
  # Opt-in; default off. Env: SLACK_THREAD_REQUIRE_MENTION.
  thread_require_mention: false

  # Per-channel force-mention override — the opposite direction of
  # free_response_channels. Channels listed here ALWAYS require an
  # explicit @mention, even when require_mention is false globally.
  # Ongoing conversations still auto-follow (mentioned threads, active
  # sessions, bot-authored threads). Comma-separated IDs or a list.
  # Env: SLACK_REQUIRE_MENTION_CHANNELS.
  require_mention_channels: ""

  # Custom mention patterns that trigger the bot
  # (in addition to the default @mention detection)
  mention_patterns:
    - "hey hermes"
    - "hermes,"

  # Text prepended to every outgoing message
  reply_prefix: ""
```

:::tip `strict_mention` を使うとき
人の多いワークスペースで、「ボットがこのスレッドを覚えている」という Slack の既定の振る舞いがユーザーを驚かせる場合に `true` にします。たとえば、序盤でボットが手伝った長い技術サポートのスレッドで、あらためて呼ばれない限り黙っていてほしいときです。DM と実行中の対話セッションには影響しません。
:::

:::tip `ignore_other_user_mentions` を使うとき
（スレッドの自動追従や `free_response_channels` によって）ボットが人の多いスレッドを追いかけていて、人同士のやりとりに割り込んでしまうときに `true` にします。`strict_mention` より狭い手段です。追いかけているスレッドでの普通の続きには変わらず答え、他の人を @メンションして始まったメッセージだけを見送ります。**1 対 1 の DM には影響しません**。グループ DM（MPIM）とチャンネルには適用され、下に書いた共有の場での方針と揃います。`@here` や `@channel` といった一斉呼びかけやチャンネルへの言及は、特定の人ではなく場そのものに向けたものなので、見送りの対象にはなりません。
:::

:::info
Slack はどちらのやり方にも対応できます。既定では会話を始めるのに `@mention` が要りますが、`SLACK_FREE_RESPONSE_CHANNELS`（チャンネル ID をカンマ区切り）か `config.yaml` の `slack.free_response_channels` で、特定のチャンネルだけ対象外にできます。ボットがスレッドでセッションを持ったあとは、続くスレッド返信にメンションは要りません。**1 対 1 の DM** では、ボットはメンションなしで必ず応答します。
:::

:::caution グループ DM（MPIM）は共有の場であって、1 対 1 の DM ではありません
**1 対 1 のダイレクトメッセージ**は相手が 1 人だけの私的な会話なので、メンションは免除されます。**グループ DM（MPIM／複数人の DM）**は*共有の場*です。複数の人が見られますし、ボットを動かせます。そのためチャンネルと同じ管理設定が効きます。`require_mention`、`strict_mention`、`free_response_channels`、`allowed_channels` がすべて適用され、ボットが `:eyes:` や `:white_check_mark:` のリアクションを付けるのも、実際に `@mentioned` されたときだけです。特定のグループ DM で自由に応答させたいときは、そのチャンネル ID（`G` で始まります）を `free_response_channels` に加えてください。
:::

#### どのメンション設定を選べばいい？ {#which-mention-option-do-i-want}

これらの設定は組み合わせて使えます。それぞれが答える問いが違うからです。

| 設定 | 答える問い | 既定値 | 効く範囲 |
|--------|--------------------|---------|-------|
| `require_mention` | **チャンネルの通常メッセージ**に @メンションは必要か？ | `true` | すべてのチャンネル |
| `free_response_channels` | どのチャンネルを `require_mention` の対象外にするか？ | なし | 指定したチャンネル |
| `require_mention_channels` | `require_mention` が `false` でも、あるいは自由応答のチャンネルでも、@メンションを必ず必要にするのはどれか？ 両方より優先されます。 | なし | 指定したチャンネル |
| `thread_require_mention` | 通常メッセージには要らなくても、**スレッドの返信**には @メンションが必要か？ メンションされたスレッドは記憶されません。 | `false` | スレッドのみ |
| `strict_mention` | **すべての**チャンネルメッセージ（通常もスレッドも）に、その都度 @メンションが必要か？ 自動追従をすべて止めます。メンションされたスレッドの記憶、ボットの返信への続き、実行中セッションの再開のいずれもなくなります。 | `false` | すべてのチャンネルとスレッド |
| `ignore_other_user_mentions` | **他の人を @メンションして始まった**メッセージ（`@rasha can you take this?`）を見送るか？ 自由応答とスレッドの自動追従より優先されます。文の途中での言及はこれまでどおりボットに届きます。 | `false` | チャンネルとグループ DM |

目安としては、`strict_mention` がいちばん大きな手段です。`thread_require_mention` は通常メッセージの扱いを変えずに、人の多いスレッドだけを静かにします。`require_mention_channels` は、普段は自由に応答するボットのうち特定のチャンネルだけを引き締めます。`ignore_other_user_mentions` は、はっきり他の人に宛てたメッセージだけを見送ります。1 対 1 の DM は必ず応答し、これらのどれにも影響されません。

### 他のボットからのメッセージを受け取る（`allow_bots`） {#accepting-messages-from-other-bots-allowbots}

既定では、Hermes は他の Slack ボットやアプリが書いたメッセージをすべて無視します（Workflow Builder の投稿も含みます）。複数のエージェントが集まるワークスペース — 複数の Hermes や、他のボットがひとつのチャンネルで協働する場合 — では `allow_bots` で受け取るように設定します。

```yaml
platforms:
  slack:
    extra:
      # "none" (default) — ignore all bot/app-authored messages
      # "mentions"       — accept a bot message only when THAT message
      #                    @mentions this bot
      # "all"            — accept every bot message (except the bot's own)
      allow_bots: mentions
```

環境変数では `SLACK_ALLOW_BOTS=none|mentions|all` です（両方を設定した場合は設定ファイル側が優先されます）。知らない値は `none` として扱われます。

`mentions` のときの判定はこうなります。

- 他のボットのメッセージを受け取るのは、**そのメッセージ自体に、このボットへの `@mention` が今まさに含まれているとき**だけです。本文でも Block Kit のブロックでもかまいません。スレッドの履歴は数えません。そのスレッドで前にメンションされていたこと、ボット自身のメッセージへの返信であること、スレッドのセッションが動いていることは、どれも後続のメンションなしのボットメッセージを通す理由にはなりません。これは意図的な設計です。エージェント同士が了解や状況の報告を延々とやりとりする輪を、ここで断ち切ります。
- 人間のメッセージには影響しません。通常のメンションの判定がそのまま効きます。
- Hermes は、どのモードでも自分のメッセージを必ず無視します。自分の発言に反応し続けるのを防ぐためです。

ボット同士の協働には `mentions` をおすすめします。それぞれのエージェントが、ターンごとに相手をはっきり呼ぶ形になるからです。相手のボットの返信方針がすべて安全だと分かっている場合を除き、`all` は避けてください。何にでも答える 2 台のボットは、永遠に答え合い続けます。ボットの判定は、印の付いたボットメッセージ（`bot_id`、`subtype: bot_message`）、アプリ由来のイベント、印のないボットの*ユーザー*（`users.info` で調べます）まで見るので、相手が Hermes であってもワークスペースをまたいで同じように選り分けられます。

複数のボットを厳しく運用するなら、`require_mention: true` と `strict_mention: true` を組み合わせてください。下の動作確認用の設定も参照してください。

### リアクションで動かす（`reaction_triggers`） {#reaction-triggers-reactiontriggers}

既定では、絵文字のリアクションは受け取ったうえで捨てられます。ボットのメッセージに
👍 を付けても何も起きません。リアクションをエージェントの処理に流したいときは
`slack.reaction_triggers` を設定します（`reactions:read` スコープと、Slack アプリの
マニフェストでの `reaction_added`／`reaction_removed` ボットイベントの購読が必要です。
`hermes slack manifest` で作り直してください）。

```yaml
slack:
  # Opt-in. false/absent (default) = reactions are acked and dropped.
  # true = any reaction ON THE BOT'S OWN MESSAGES routes to the agent.
  reaction_triggers: true
  # Or an explicit emoji allowlist — only these names route, and they may
  # target ANY message (emoji-handoff workflows, e.g. :task: to capture):
  # reaction_triggers: [white_check_mark, thumbsup, task]
  # Optional handoff target: respond in this channel (top-level) or thread
  # (C123:<thread_ts>) instead of the reacted-to message's thread.
  # reaction_trigger_target: C0123456789
```

環境変数では `SLACK_REACTION_TRIGGERS`（`true`／`all`、またはカンマ区切りの
一覧）と `SLACK_REACTION_TRIGGER_TARGET` です。

振る舞い:

- リアクションは、`reaction:added:👍` / `reaction:removed:👍` という本文を持つ
  普通のエージェントのターンとして届きます（よくある Slack の名前は Unicode に
  置き換えられ、知らない名前はそのまま渡ります。例: `reaction:added:custom-emoji`）。
  リアクションが付いたメッセージのスレッドにぶら下がるので、エージェントは何に対する
  リアクションかが分かり、返信したときと同じセッションで処理されます。
- リアクションを付けた人がそのメッセージのユーザーになります。そのため、**ユーザーの認可と
  `allowed_channels` の判定は、打ち込まれたメッセージとまったく同じように効きます**。
  無関係なユーザーのリアクションが、そのユーザーのメッセージでは届かない場所で
  エージェントを動かすことはありません。
- `reaction_triggers: true` のときに流れるのは、ボット**自身**のメッセージに付いた
  リアクションだけです（承認や了解のやりとり向けです）。絵文字を明示的に列挙した
  場合は、どのメッセージからでもその絵文字が流れます。
- ボット自身が付ける動作上のリアクション（`:eyes:` など）が戻ってくることはありません。
- この設定とは別に、人が付けたリアクションはすべて
  `reaction:added`／`reaction:removed` の[ゲートウェイフック](/hermes/docs/user-guide/features/hooks/#available-events)を発火します。
  エージェントのターンまでは要らない、見ているだけの用途のためです。

### ピアエージェントの動作確認 {#peer-agent-smoke-check}

ターンごとの厳密なメンションに頼る複数ボット構成では、次の設定を保ってください。

```yaml
slack:
  require_mention: true
  strict_mention: true
  allow_bots: mentions
  allowed_channels: ""
```

ゲートウェイの設定変更、デプロイ、再起動のあとには、次の動作確認を実行します。

```bash
uv run --frozen pytest -q tests/gateway/test_slack_peer_agent_smoke.py -o addopts=''
```

この確認はプロセス内で作った疑似的な Slack のイベントだけを使います。実際に Slack へメッセージを送ることはなく、既定では本物のボットトークンも要りません。

失敗の分類:

- `config:` `test_peer_agent_smoke_preflight_contract` が設定の食い違いを見つけました（`require_mention`、`strict_mention`、`allow_bots`、`allowed_channels` のいずれか）。
- `platform_connectivity:` アダプターやクライアントが初期化されていないので、振り分けの確認結果はまだ信用できません。
- `bot_identity:` アダプターが自分のボットユーザー ID を解決できていないので、今のメッセージに対するメンションの判定が働きません。
- `routing_logic:` Slack アダプターが、ピアエージェント運用で守るべき前提のどれかを壊しています（人のメンションの振り分け、他ボットの無視、明示的にメンションされた他ボットの受け入れ、受け身の了解・状況報告・エラーの抑制）。

この確認が通るのに実際のワークスペースで振り分けがおかしいときは、振り分けの処理そのものではなく、Slack のトークンやワークスペースへの接続、実行環境の状態を調べてください。

### チャンネルの許可リスト（`allowed_channels`） {#channel-allowlist-allowedchannels}

ボットが応答する Slack チャンネルを決まった範囲に絞ります。たくさんのチャンネルに招待されているけれど、応答してほしいのは一部だけ、というときに便利です。設定すると、この一覧にないチャンネルからのメッセージは、`@mentioned` されていても**黙って無視されます**。

**1 対 1 の DM はこの絞り込みの対象外**なので、許可されたユーザーはいつでも DM でボットに届きます。**グループ DM（MPIM）は対象外ではありません**。チャンネルと同じく、MPIM も許可リストに載せる必要があり（ID は `G` で始まります）、そうでなければメッセージは捨てられます。

```yaml
slack:
  allowed_channels:
    - "C0123456789"   # #ops
    - "C0987654321"   # #incident-response
```

環境変数でも指定できます（カンマ区切り）。

```bash
SLACK_ALLOWED_CHANNELS="C0123456789,C0987654321"
```

振る舞い:

- 空、または未設定 → 制限なし（これまでどおり動きます）。
- 何か設定されている → チャンネル ID が一覧にあることが必要で、なければ他の判定（メンションの要否や `free_response_channels` など）より前にメッセージが捨てられます。
- Slack のチャンネル ID は `C`（パブリック）、`G`（プライベート）、`D`（DM）で始まります。Slack の画面で「Open channel details」→「About」を開くか、API で調べられます。

あわせて参照: [管理者用とユーザー用のスラッシュコマンドの分け方](/hermes/docs/reference/slash-commands/#permissions-and-adminuser-split)。

### 許可されていないユーザーへの対応 {#unauthorized-user-handling}

```yaml
slack:
  # What happens when an unauthorized user (not in SLACK_ALLOWED_USERS) DMs the bot
  # "pair"   — prompt them for a pairing code (default)
  # "ignore" — silently drop the message
  unauthorized_dm_behavior: "pair"
```

すべてのプラットフォームに共通の設定として書くこともできます。

```yaml
unauthorized_dm_behavior: "pair"
```

`slack:` の下に書いたプラットフォーム個別の設定が、共通の設定より優先されます。

### 音声の文字起こし {#voice-transcription}

```yaml
# Global setting — enable/disable automatic transcription of incoming voice messages
stt_enabled: true
```

`true`（既定）のときは、届いた音声メッセージが、設定された STT プロバイダーで自動的に文字起こしされてからエージェントに渡されます。

### 設定の全体例 {#full-example}

```yaml
# Global gateway settings
group_sessions_per_user: true
unauthorized_dm_behavior: "pair"
stt_enabled: true

# Slack-specific settings
slack:
  require_mention: true
  unauthorized_dm_behavior: "pair"

# Platform config
platforms:
  slack:
    reply_to_mode: "first"
    extra:
      reply_in_thread: true
      reply_broadcast: false
```

---

## ホームチャンネル {#home-channel}

`SLACK_HOME_CHANNEL` にチャンネル ID を設定すると、予約したメッセージ、cron ジョブの結果、
その他 Hermes から自発的に送る通知の届け先になります。チャンネル ID の調べ方:

1. Slack でチャンネル名を右クリックします
2. **View channel details** をクリックします
3. いちばん下までたどると、Channel ID が書かれています

```bash
SLACK_HOME_CHANNEL=C01234567890
```

そのチャンネルに**ボットを招待済み**であることを確認してください（`/invite @Hermes Agent`）。

### cron の届け先の指定 {#cron-delivery-targeting}

cron ジョブ（[cron ガイド](/hermes/docs/user-guide/features/cron/#delivery-options)を参照）は、3 通りの方法で Slack を届け先にできます。

| `deliver:` の値 | 届く先 |
|------------------|----------------|
| `slack` | ホームチャンネル（`SLACK_HOME_CHANNEL`） |
| `slack:C0123456789` | ID で指定したチャンネル |
| `slack:U0123456789` | そのユーザーの **DM**。ユーザー ID だけを書けば、自動的に DM の会話に解決されます（`im:write` スコープが必要です） |

cron の処理がゲートウェイと同じ場所で動いていなくても届きます。その場合、Hermes は `SLACK_BOT_TOKEN` を使う単独の Web API 送信に切り替えます。cron の出力にある `MEDIA:` の添付は、同じ届け先へ Slack のファイル共有としてアップロードされます。

### メッセージとファイルを送る（`send_message`） {#sending-messages-and-media-sendmessage}

エージェントの `send_message` ツールも同じ形の届け先を受け付けます。チャンネル ID（`C…`／`G…`）、DM の会話（`D…`）、ユーザー ID だけ（`U…`／`W…`）のいずれかです。ユーザー ID は、文章でも、ファイルでも、対話的なやりとりでも、送るたびにそのユーザーの DM に解決されます。`MEDIA:<path>` の添付（画像、PDF、書類）は Slack のファイル共有としてアップロードされます。短い文章と添付ファイル 1 つを一緒に送る場合は、別のメッセージにせずファイルの説明文として付きます。見つからないファイルはファイルごとに警告として知らされ、送信全体が失敗することはありません。

---

## 複数ワークスペースへの対応 {#multi-workspace-support}

Hermes はひとつのゲートウェイで、**複数の Slack ワークスペース**に同時につなげます。ワークスペースごとに独立して認証され、それぞれのボットユーザー ID を持ちます。

### 設定 {#configuration}

`SLACK_BOT_TOKEN` に、複数のボットトークンを**カンマ区切り**で並べます。

```bash
# Multiple bot tokens — one per workspace
SLACK_BOT_TOKEN=xoxb-workspace1-token,xoxb-workspace2-token,xoxb-workspace3-token

# A single app-level token is still used for Socket Mode
SLACK_APP_TOKEN=xapp-your-app-token
```

`~/.hermes/config.yaml` に書いてもかまいません。

```yaml
platforms:
  slack:
    token: "xoxb-workspace1-token,xoxb-workspace2-token"
```

### OAuth トークンファイル {#oauth-token-file}

環境変数や設定ファイルのトークンに加えて、Hermes は次の場所にある **OAuth トークンファイル**からもトークンを読み込みます。

```
~/.hermes/slack_tokens.json
```

このファイルは、チーム ID とトークンの情報を対応づけた JSON です。

```json
{
  "T01ABC2DEF3": {
    "token": "xoxb-workspace-token-here",
    "team_name": "My Workspace"
  }
}
```

このファイルのトークンは、`SLACK_BOT_TOKEN` で指定したトークンと統合されます。重複するトークンは自動的にまとめられます。

### 仕組み {#how-it-works}

- 並べたトークンの**先頭**が主トークンで、Socket Mode の接続（AsyncApp）に使われます。
- 起動時に、各トークンが `auth.test` で認証されます。ゲートウェイは `team_id` ごとに専用の `WebClient` と `bot_user_id` を持ちます。
- メッセージが届くと、Hermes はそのワークスペース用のクライアントを使って返します。
- 主となる `bot_user_id`（先頭のトークンのもの）は、ボットの identity をひとつだけ前提にしている機能との互換のために使われます。

---

## 音声メッセージ {#voice-messages}

Hermes は Slack でも音声に対応しています。

- **受信:** 音声メッセージは、設定された STT プロバイダーで自動的に文字起こしされます。ローカルの `faster-whisper`、Groq Whisper（`GROQ_API_KEY`）、OpenAI Whisper（`VOICE_TOOLS_OPENAI_KEY`）が使えます
- **送信:** TTS の応答は音声ファイルの添付として送られます

---

## チャンネルごとのプロンプト {#per-channel-prompts}

特定の Slack チャンネルに、その場かぎりのシステムプロンプトを割り当てられます。プロンプトはターンごとに実行時に差し込まれ、会話の記録には残らないので、変更はすぐに反映されます。

```yaml
slack:
  channel_prompts:
    "C01RESEARCH": |
      You are a research assistant. Focus on academic sources,
      citations, and concise synthesis.
    "C02ENGINEERING": |
      Code review mode. Be precise about edge cases and
      performance implications.
```

キーは Slack のチャンネル ID です（チャンネル詳細 →「About」を開き、いちばん下までたどると分かります）。そのチャンネルのすべてのメッセージに、その場かぎりのシステム指示としてプロンプトが差し込まれます。

## チャンネルごとのスキルの割り当て {#per-channel-skill-bindings}

特定のチャンネルや DM で新しいセッションが始まるたびに、スキルを自動で読み込ませられます。ターンごとに差し込まれるチャンネルごとのプロンプトとは違い、スキルの割り当ては**セッションの開始時**にスキルの内容をユーザーのメッセージとして差し込みます。それが会話の記録の一部になるので、以降のターンで読み込み直す必要はありません。

用途がはっきり決まっている DM やチャンネル（単語カード、特定分野の質問応答、サポートの一次受けなど）で、短い返信のたびに読み込むかどうかをモデル自身の判断に委ねたくない場合にぴったりです。

```yaml
slack:
  channel_skill_bindings:
    # DM channel — always runs in "german-flashcards" mode
    - id: "D0ATH9TQ0G6"
      skills:
        - german-flashcards
    # Research channel — preload multiple skills in order
    - id: "C01RESEARCH"
      skills:
        - arxiv
        - writing-plans
    # Short form: single skill as a string
    - id: "C02SUPPORT"
      skill: hubspot-on-demand
```

補足:
- 割り当てはチャンネル ID で判定します。割り当てのあるチャンネル内のスレッドは、親チャンネルの割り当てを引き継ぎます。
- スキルが読み込まれるのはセッションの開始時だけです（新しいセッション、または自動リセットのあと）。割り当てを変えたときは、`/new` を実行するか、セッションが自動でリセットされるのを待つと反映されます。
- スキルの指示に加えて、チャンネルごとの口調や制約を足したいときは `channel_prompts` と組み合わせてください。

## 困ったときは {#troubleshooting}

| 症状 | 対処 |
|---------|----------|
| DM に応答しない | イベント購読に `message.im` があるか確認し、アプリを再インストールしてください |
| DM では動くのにチャンネルでは動かない | **いちばん多いつまずきです。** イベント購読に `message.channels` と `message.groups` を追加し、アプリを再インストールしてから、`/invite @Hermes Agent` でボットをチャンネルに招待してください |
| チャンネルで @メンションしても応答しない | 1) `message.channels` イベントを購読しているか確認します。2) ボットがそのチャンネルに招待されている必要があります。3) `channels:history` スコープが追加されているか確認します。4) スコープやイベントを変えたらアプリを再インストールします |
| プライベートチャンネルでメッセージを無視する | `message.groups` イベントの購読と `groups:history` スコープの両方を追加し、アプリを再インストールしてボットを `/invite` してください |
| グループ DM（複数人の DM）で応答しない | `message.mpim` イベントの購読と `mpim:history` スコープ（および `mpim:read`）を追加し、アプリを**再インストール**してください。`message.mpim` がないと、1 対 1 の DM が動いていても、Slack はグループ DM のメッセージをボットに届けません。 |
| DM で「Sending messages to this app has been turned off」と出る | App Home の設定で**メッセージタブ**を有効にしてください（ステップ 5 を参照） |
| 「not_authed」や「invalid_auth」のエラーが出る | ボットトークンとアプリトークンを再生成し、`.env` を更新してください |
| 応答はするのにチャンネルに投稿できない | `/invite @Hermes Agent` でボットをチャンネルに招待してください |
| 会話はできるのにアップロードした画像やファイルを読めない | `files:read` を追加してから、アプリを**再インストール**してください。Slack がスコープ・認証・権限のエラーを返した場合、Hermes はその診断情報をチャットに表示します。 |
| `missing_scope` のエラーが出る | OAuth & Permissions で必要なスコープを追加し、アプリを**再インストール**してください |
| ソケットの切断が頻繁に起きる | ネットワークを確認してください。Bolt は自動で再接続しますが、不安定な回線では遅れが出ます |
| スコープやイベントを変えたのに何も変わらない | スコープやイベント購読を変えたら、アプリをワークスペースに**再インストールする必要があります** |

### 確認の早見表 {#quick-checklist}

チャンネルでボットが動かないときは、次の**すべて**を確認してください。

1. ✅ `message.channels` イベントを購読している（パブリックチャンネル用）
2. ✅ `message.groups` イベントを購読している（プライベートチャンネル用）
3. ✅ `app_mention` イベントを購読している
4. ✅ `channels:history` スコープを追加している（パブリックチャンネル用）
5. ✅ `groups:history` スコープを追加している（プライベートチャンネル用）
6. ✅ スコープやイベントを追加したあとにアプリを**再インストール**した
7. ✅ ボットをチャンネルに**招待**した（`/invite @Hermes Agent`）
8. ✅ メッセージでボットを**@メンションしている**

---

## セキュリティ {#security}

:::warning
**`SLACK_ALLOWED_USERS` は必ず設定してください**。許可するユーザーのメンバー ID を書きます。設定しないと、
ゲートウェイは安全のために**すべてのメッセージを拒否します**。ボットトークンは決して共有しないでください。
パスワードと同じ扱いにします。
:::

- トークンは `~/.hermes/.env` に置きます（ファイルの権限は `600`）
- Slack アプリの設定から、トークンを定期的に入れ替えます
- Hermes の設定ディレクトリに誰がアクセスできるかを点検します
- Socket Mode なら公開の受け口がないので、攻撃される面がひとつ減ります
