---
title: "Slack"
description: "ソケットモードを使って Hermes Agent を Slack のボットとして動かす"
upstream_path: user-guide/messaging/slack.md
upstream_blob: 4bc66f5a30743fa92c0b8ca1ef921515091be756
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/slack
---

# Slack の設定 {#slack-setup}

ソケットモードを使って、Hermes Agent を Slack のボットとしてつなぎます。ソケットモードは公開された HTTP のエンドポイントではなく WebSocket を使うので、Hermes を動かしている機械が外から見える必要はありません。ファイアウォールの内側でも、手元のノートパソコンでも、非公開のサーバーでも動きます。

:::warning 旧来の Slack アプリは廃止されました
旧来の Slack アプリ（RTM API を使うもの）は **2025 年 3 月に完全に廃止されました**。Hermes は今の Bolt SDK をソケットモードで使います。古い形式のアプリを持っている場合は、下の手順にしたがって新しく作り直す必要があります。
:::

## 全体像 {#overview}

| 構成要素 | 内容 |
|-----------|-------|
| **ライブラリ** | Python 向けの `slack-bolt` / `slack_sdk`（ソケットモード） |
| **接続方式** | WebSocket — 公開の URL は不要 |
| **必要な認証トークン** | ボットトークン（`xoxb-`）とアプリレベルトークン（`xapp-`） |
| **利用者の識別** | Slack のメンバー ID（たとえば `U01ABC2DEF3`） |

---

## 手順 1: Slack アプリを作る {#step-1-create-a-slack-app}

いちばん早いのは、Hermes が作ってくれるマニフェストを貼り付ける方法です。このマニフェストには、組み込みのスラッシュコマンド（`/btw`、`/stop`、`/model` など）、必要な OAuth のスコープ、購読するイベントがすべて書かれており、ソケットモードも有効になります。これらが一度にそろいます。

### 方法 A: Hermes が作ったマニフェストから作る（おすすめ） {#option-a-from-a-hermes-generated-manifest-recommended}

1. マニフェストを作ります。新しい Slack アプリでは Agent ビューを使う必要があります。
   ```bash
   hermes slack manifest --agent-view --write
   ```
   これで `~/.hermes/slack-manifest.json` が書き出され、貼り付けの手順が表示されます。Slack の旧来の Assistant ビューをまだ使っている既存のアプリでは、移行の準備が整うまで `--agent-view` を省けます。

   Slack の長い説明文を、手元の UTF-8 のテキストや Markdown のファイルから埋めたいときは `--long-description-file` を足します。

   ```bash
   hermes slack manifest --agent-view \
     --long-description-file AGENTS.md --write
   ```

   ファイルの中身は、Slack の 175〜4,000 文字の範囲でそのまま使われます。文章を直に渡したいときは `--long-description "..."` を使います。直に渡す方法とファイルを渡す方法は同時に使えず、どちらも `--slashes-only` とは組み合わせられません。
2. [https://api.slack.com/apps](https://api.slack.com/apps) を開き、**Create New App** → **From an app manifest** と進みます
3. ワークスペースを選び、JSON の中身を貼り付けて内容を確認し、**Next** → **Create** をクリックします
4. **手順 6: アプリをワークスペースに入れる** まで飛ばして構いません。スコープ、イベント、スラッシュコマンドはマニフェストが済ませてくれています。

### 方法 B: 一から作る（手作業） {#option-b-from-scratch-manual}

1. [https://api.slack.com/apps](https://api.slack.com/apps) を開きます
2. **Create New App** をクリックします
3. **From scratch** を選びます
4. アプリの名前（たとえば「Hermes Agent」）を入れ、ワークスペースを選びます
5. **Create App** をクリックします

アプリの **Basic Information** のページに移ります。このあとの手順 2 〜 6 に進んでください。

---

## 手順 2: ボットトークンのスコープを設定する {#step-2-configure-bot-token-scopes}

サイドバーの **Features → OAuth & Permissions** を開きます。**Scopes → Bot Token Scopes** までスクロールして、次のスコープを足します。

| スコープ | 用途 |
|-------|---------|
| `chat:write` | ボットとしてメッセージを送る |
| `app_mentions:read` | チャンネルで @メンションされたことを検知する |
| `channels:history` | ボットが入っている公開チャンネルのメッセージを読む |
| `channels:read` | 公開チャンネルの一覧と情報を取得する |
| `groups:history` | ボットが招待された非公開チャンネルのメッセージを読む |
| `im:history` | ダイレクトメッセージの履歴を読む |
| `im:read` | ダイレクトメッセージの基本情報を見る |
| `im:write` | ダイレクトメッセージを開いて扱う |
| `mpim:history` | 複数人のダイレクトメッセージ（グループ DM）の履歴を読む |
| `mpim:read` | グループ DM の基本情報を見る |
| `users:read` | 利用者の情報を調べる |
| `files:read` | 添付されたファイル（ボイスメモや音声を含む）を読んでダウンロードする |
| `files:write` | ファイル（画像・音声・文書）をアップロードする |

:::caution スコープが足りないと機能も欠けます
`channels:history` と `groups:history` がないと、ボットは **チャンネルのメッセージを受け取れません**。ダイレクトメッセージでしか動かなくなります。`files:read` がないと、Hermes は会話はできても **利用者がアップロードした添付を確実に読むことができません**。この 2 つはとくに忘れられがちなスコープです。
:::

**任意のスコープ:**

| スコープ | 用途 |
|-------|---------|
| `groups:read` | 非公開チャンネルの一覧と情報を取得する |
| `assistant:write` | メッセージの処理中に、ボット名の横に作業中の状態表示（「is thinking…」）を出します。このスコープがないと `assistant.threads.setStatus` の呼び出しが黙って失敗し、Slack が自前の当たりさわりのない文言（「Finding answers…」「Reviewing findings…」など）を順に出します。この場合、文言は Hermes の管理下にありません。`typing_status_text` が目に見える形で効くには、このスコープが必要です。 |

---

## 手順 3: ソケットモードを有効にする {#step-3-enable-socket-mode}

ソケットモードを使うと、公開の URL を用意せずに WebSocket でつなげます。

1. サイドバーの **Settings → Socket Mode** を開きます
2. **Enable Socket Mode** をオンにします
3. **アプリレベルトークン** を作るよう促されます。
   - 名前は `hermes-socket` のように付けます（名前は何でも構いません）
   - **`connections:write`** のスコープを足します
   - **Generate** をクリックします
4. **トークンを控えます**。`xapp-` で始まる文字列で、これが `SLACK_APP_TOKEN` になります

:::tip
アプリレベルトークンは、**Settings → Basic Information → App-Level Tokens** からいつでも確認・再発行できます。
:::

---

## 手順 4: イベントを購読する {#step-4-subscribe-to-events}

ここは肝心なところです。ボットがどのメッセージを見られるかが、この設定で決まります。

1. サイドバーの **Features → Event Subscriptions** を開きます
2. **Enable Events** をオンにします
3. **Subscribe to bot events** を開いて、次を足します。

| イベント | 必須か | 用途 |
|-------|-----------|---------|
| `message.im` | **必須** | ダイレクトメッセージを受け取る |
| `message.mpim` | **必須** | 追加された **グループ DM**（複数人のダイレクトメッセージ）のメッセージを受け取る |
| `message.channels` | **必須** | 追加された **公開** チャンネルのメッセージを受け取る |
| `message.groups` | **推奨** | 招待された **非公開** チャンネルのメッセージを受け取る |
| `app_mention` | **必須** | @メンションされたときの Bolt SDK のエラーを防ぐ |

4. ページ下部の **Save Changes** をクリックします

:::danger イベントの購読漏れが、つまずきの第 1 位です
ダイレクトメッセージでは動くのに **チャンネルでは動かない** 場合、`message.channels`（公開チャンネル用）や `message.groups`（非公開チャンネル用）の追加を忘れているとみて、まず間違いありません。これらのイベントがないと、Slack はチャンネルのメッセージをそもそもボットに届けません。
:::

---

## 手順 5: メッセージタブを有効にする {#step-5-enable-the-messages-tab}

これはボットへのダイレクトメッセージを使えるようにする手順です。有効にしていないと、ボットに個人チャットを送ろうとした利用者に **「Sending messages to this app has been turned off」** と表示されます。

1. サイドバーの **Features → App Home** を開きます
2. **Show Tabs** までスクロールします
3. **Messages Tab** をオンにします
4. **「Allow users to send Slash commands and messages from the messages tab」** にチェックを入れます

:::danger この手順を飛ばすと、個人チャットは完全に塞がれます
スコープとイベントの購読をすべて正しく設定していても、メッセージタブを有効にしない限り、Slack は利用者からボットへのダイレクトメッセージを通しません。これは Slack 側の決まりであって、Hermes の設定の問題ではありません。
:::

---

## 手順 6: アプリをワークスペースに入れる {#step-6-install-app-to-workspace}

1. サイドバーの **Settings → Install App** を開きます
2. **Install to Workspace** をクリックします
3. 権限の内容を確認して **Allow** をクリックします
4. 承認が終わると、`xoxb-` で始まる **Bot User OAuth Token** が表示されます
5. **このトークンを控えます**。これが `SLACK_BOT_TOKEN` になります

:::tip
あとからスコープやイベントの購読を変えたときは、変更を反映させるために **アプリを入れ直す必要があります**。Install App のページに、その旨の案内が出ます。
:::

---

## 手順 7: 許可リストに載せる利用者 ID を調べる {#step-7-find-user-ids-for-the-allowlist}

Hermes は許可リストに Slack の **メンバー ID** を使います（ユーザー名や表示名ではありません）。

メンバー ID の調べ方は次のとおりです。

1. Slack でその人の名前かアイコンをクリックします
2. **View full profile** をクリックします
3. **⋮**（その他）のボタンをクリックします
4. **Copy member ID** を選びます

メンバー ID は `U01ABC2DEF3` のような形です。少なくとも自分のメンバー ID は必要です。

---

## 手順 8: Hermes を設定する {#step-8-configure-hermes}

`~/.hermes/.env` ファイルに次を書き足します。

```bash
# Required
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_APP_TOKEN=xapp-your-app-token-here
SLACK_ALLOWED_USERS=U01ABC2DEF3              # Comma-separated Member IDs

# Optional
SLACK_HOME_CHANNEL=C01234567890              # Default channel for cron/scheduled messages
SLACK_HOME_CHANNEL_NAME=general              # Human-readable name for the home channel (optional)
```

対話式の設定を使うこともできます。

```bash
hermes gateway setup    # Select Slack when prompted
```

続いてゲートウェイを起動します。

```bash
hermes gateway              # Foreground
hermes gateway install      # Install as a user service
sudo hermes gateway install --system   # Linux only: boot-time system service
```

:::tip Codex の推論の強さについて
Codex を使う Slack のエージェント同士のチャンネルでは、`agent.reasoning_effort: high` かそれ以下をおすすめします。`xhigh` では、やり取りの丸ごとが見えない推論に費やされて、目に見えるアシスタントの文章が出ないことがあります。Hermes は今、そうした「やり取りが完結しなかった」旨の警告をスレッドには出さず、ゲートウェイのログに残すようにしています。
:::

---

## 手順 9: ボットをチャンネルに招待する {#step-9-invite-the-bot-to-channels}

ゲートウェイを起動したら、ボットに返事をしてほしいチャンネルごとに **招待** する必要があります。

```
/invite @Hermes Agent
```

ボットが自分からチャンネルに参加することは **ありません**。チャンネルごとに招待してください。

---

## スラッシュコマンド {#slash-commands}

Hermes のコマンド（`/btw`、`/stop`、`/new`、`/model`、`/help` など）は、すべて Slack 本来のスラッシュコマンドとして使えます。Telegram や Discord での使い勝手とまったく同じです。Slack で `/` と打つと、入力補助の一覧に Hermes のコマンドが説明つきで並びます。

裏側では、Hermes が Slack アプリのマニフェストを生成し（手順 1 の方法 A を見てください）、[`COMMAND_REGISTRY`](https://github.com/NousResearch/hermes-agent/blob/main/hermes_cli/commands.py) にあるコマンドをすべてスラッシュコマンドとして宣言しています。ソケットモードでは、マニフェストの `url` の項目に関わらず、Slack はコマンドのイベントを WebSocket 経由で届けます。

### Agent のメッセージ体験 {#agent-messaging-experience}

新しい Slack アプリは、Slack の **Agent** のメッセージ体験を使います。すでに Assistant として作った Hermes のアプリは、`--agent-view` を付けてマニフェストを作り直せば移行できます。

```bash
hermes slack manifest --agent-view --write
```

**Features → App Manifest** でマニフェストを更新し、Slack から求められたらアプリを入れ直します。Agent ビューから Assistant ビューへ戻すことはできません。切り替えたあと、利用者は Slack の再読み込みが必要になることがあります。生成された Agent 向けのマニフェストは `message.im`、`app_home_opened`、`app_context_changed` を購読するので、Hermes はメッセージタブでの個人チャットを見分けられ、そのやり取りとあわせて利用者が今見ている Slack の文脈も受け取れます。Hermes がその文脈として扱うのは目印だけで、見ているチャンネルの履歴を読むことはありません。

### 更新後にスラッシュコマンドを取り込み直す {#refreshing-slash-commands-after-updates}

Hermes に新しいコマンドが増えたとき（`hermes update` のあとなど）は、マニフェストを作り直して Slack アプリを更新します。

```bash
hermes slack manifest --write
```

そのうえで Slack 側の操作です。
1. [https://api.slack.com/apps](https://api.slack.com/apps) を開き、Hermes のアプリを選びます
2. **Features → App Manifest → Edit** と進みます
3. `~/.hermes/slack-manifest.json` の新しい中身を貼り付けます
4. **Save** します。スコープやスラッシュコマンドが変わっていれば、Slack がアプリの入れ直しを求めてきます。

### 従来の `/hermes <subcommand>` も使えます {#legacy-hermes-subcommand-still-works}

古いマニフェストとの互換のため、`/hermes bg run the tests` のような書き方も残っています。Hermes はこれを `/bg run the tests` と同じように扱います。自由な質問文も使えて、`/hermes what's the weather?` はふつうのメッセージとして扱われます。

### スレッドのなかでコマンドを使う（`!cmd` の書き方） {#using-commands-inside-threads-the-cmd-prefix}

Slack 自身が、スレッドの返信のなかでは本来のスラッシュコマンドを受け付けません。スレッドで `/queue` と打つと、Slack が *「/queue is not supported in threads. Sorry!」* と返します。アプリ側の設定で使えるようにする方法はなく、Slack はそれを Hermes に届けません。

その代わりとして、Hermes は先頭の `!` をコマンドの別の書き方として認識します。これはスレッドでも、それ以外の場所でも使えます。ふつうのスレッドの返信として `!queue`、`!stop`、`!model gpt-5.4` などと打てば、Hermes はスラッシュの形とまったく同じに扱い、同じスレッドで返事をします。

コマンドかどうかを見るのは先頭の 1 語だけなので、`!nice work` のような何気ないメッセージはそのままエージェントに渡ります。この書き方はメンションのあと（`@Hermes !stop`）でも、先頭に空白があっても効き、どちらもスレッド内でコマンドとして動きます。

承認を求める表示（危険なコマンドや `execute_code` の承認）は、ふだんは押せるボタンとして出ます。ボタンを出せず、Hermes が文章での確認に切り替えたときは、その文面が `!approve` / `!deny` で返すよう案内します。これがスレッドのなかでも通じる書き方です。

### スラッシュコマンドへの返事は本人にだけ見えます {#slash-replies-are-ephemeral}

本来のスラッシュコマンド（`/status`、`/help` など）への返事は **本人にだけ見える形** で届きます（「Only visible to you」）。コマンドの出力でチャンネルが荒れることはありません。「Running /cmd…」という仮の表示は本当の返事に置き換わり、長い返事は続きのメッセージに分けて、やはり本人にだけ見える形で送られます。Slack はこの流れを 5 通までに制限しているので、極端に長い出力は黙って切られるのではなく、途中で打ち切った旨をはっきり添えて終わります。本人だけに見せる経路が失敗したときは、Hermes が別の同じ仕組みの API 経路で送り直します。代わりにチャンネルへ公開で投稿することはありません。（ふつうのメッセージとして打ったコマンド、つまりスレッドでの `!cmd` や `@Hermes /cmd` は、ふだんどおり全員に見えるメッセージで返します。）

### 確認の問いかけ（ワンタップのボタン） {#clarify-prompts-one-tap-buttons}

エージェントが選択式の質問をする必要があるとき（`clarify` のツール）、Slack では **Block Kit のボタン** として表示されます。選択肢ごとに 1 タップで答えられ、さらに「✏️ Other…」のボタンで自由入力に切り替えられます（次に打ったメッセージが答えになります）。タップすると、そのメッセージがその場で書き換わり、誰が何を選んだかが表示されます。同じ問いかけをもう一度押しても無視されます。ボタンの操作にも、メッセージと同じ利用者の権限の判定がかかります。期限切れの問いかけ（ゲートウェイの再起動や時間切れ）は、押した操作を黙って飲み込まずに、もう一度尋ねるよう案内します。答えの決まっていない問いかけは、ふつうの質問文として表示され、次に打った返事を受け取ります。設定は要りません。`rich_blocks` の設定に関わらず動きます。

### 上級者向け: スラッシュコマンドの配列だけを出力する {#advanced-emit-only-the-slash-commands-array}

Slack のマニフェストを自分で管理していて、スラッシュコマンドの一覧だけがほしい場合の書き方です。

```bash
hermes slack manifest --slashes-only > /tmp/slashes.json
```

出てきた配列を、今のマニフェストの `features.slash_commands` の項目に貼り付けます。

---

## ボットの返事の仕方 {#how-the-bot-responds}

場面ごとの Hermes の振る舞いをまとめます。

| 場面 | 振る舞い |
|---------|----------|
| **個人チャット** | すべてのメッセージに返事をします。@メンションは要りません |
| **チャンネル** | **@メンションされたときだけ返事をします**（たとえば `@Hermes Agent what time is it?`）。チャンネルでは、Hermes はそのメッセージにぶら下がるスレッドで返します。 |
| **スレッド** | すでにあるスレッドのなかで Hermes に @メンションすると、同じスレッドで返します。ボットがそのスレッドでやり取りを始めたあとは、**続く返信に @メンションは要りません**。会話の流れをそのまま追いかけます。 |

:::tip
チャンネルでは、会話を始めるときに必ずボットへ @メンションしてください。ボットがスレッドで動き始めたあとは、メンションなしでそのスレッドに返信できます。スレッドの外では、にぎやかなチャンネルが騒がしくならないよう、@メンションのないメッセージは無視されます。
:::

---

## 設定できる項目 {#configuration-options}

手順 8 で入れた必須の環境変数のほかに、`~/.hermes/config.yaml` で Slack のボットの振る舞いを細かく決められます。

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

      # Control Slack's automatic link-preview cards without changing or
      # removing clickable links from message text. Omit either key to keep
      # Slack's default behavior for that preview type.
      unfurl_links: false
      unfurl_media: false

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

| 項目 | 初期値 | 説明 |
|-----|---------|-------------|
| `platforms.slack.reply_to_mode` | `"first"` | 複数に分かれたメッセージのスレッドの付け方: `"off"`、`"first"`、`"all"` のいずれか |
| `platforms.slack.extra.reply_in_thread` | `true` | `false` にすると、チャンネルのメッセージにはスレッドではなくその場で返します。すでにあるスレッド内のメッセージには、これまでどおりスレッドで返します。 |
| `platforms.slack.extra.reply_broadcast` | `false` | `true` にすると、スレッドの返信をチャンネル本体にも流します。流れるのは最初のひとかたまりだけです。 |
| `platforms.slack.extra.unfurl_links` | Slack の初期値 | `false` にすると、リンクは押せるまま、リンク先のページの自動プレビューだけを止めます。どちらかの unfurl の項目を設定した場合、メディアの説明文はファイルの *前* に別のメッセージとして投稿され（Slack のアップロード API はプレビューの制御を運べないためです）、下書きを直接流す方式は編集による配信に切り替わります。 |
| `platforms.slack.extra.unfurl_media` | Slack の初期値 | `false` にすると、リンクは押せるまま、メディアの自動プレビューだけを止めます。説明文の順序と配信についての注意は `unfurl_links` と同じです。 |
| `platforms.slack.extra.rich_blocks` | `false` | `true` にすると、エージェントのメッセージが [Block Kit](https://docs.slack.dev/block-kit/) の部品（見出し、区切り線、本物の入れ子の箇条書き、Slack 本来の表）として表示されます。通知や読み上げのために、素のテキスト版もあわせて送られます。Slack の上限を超える表は、桁をそろえた等幅の表示に切り替わります。アプリの入れ直しは要りません。送る側だけの変更です。 |
| `platforms.slack.extra.feedback_buttons` | `false` | `rich_blocks` とあわせて `true` にすると、最後の返信に Slack 本来の評価のボタンが付きます。 |
| `platforms.slack.extra.native_task_cards` | `false` | `true` にすると、実行中のツールの呼び出しが Slack 本来の計画・作業のカードとして表示されます。これは Slack での初期値である `tool_progress: off` とは別に、進捗表示を自分で選んで有効にするものです。Slack 本来の仕組みが失敗したときは、編集され続ける 1 つのテキストの更新に切り替わります。 |
| `platforms.slack.extra.suggested_prompts` | `[]` | Agent / Assistant の個人チャットの入口に出す `{title, message}` の候補（最大 4 件）。一覧の形でも `{title, prompts}` の形でも書けます。 |
| `platforms.slack.extra.assistant_thread_titles` | `true` | `true` にすると、Agent / Assistant の個人チャットのスレッドに、最初の利用者のメッセージから名前を付けます。 |
| `platforms.slack.extra.allow_bots` | `"none"` | ほかの Slack のボットからのメッセージの扱い: `"none"` は無視、`"mentions"` は **そのメッセージ自体** が Hermes に @メンションしているときだけ受け取る、`"all"` はすべて受け取る。ボット同士の連携をいちばん安全に行うなら `"mentions"` を使います。[ほかのボットからのメッセージを受け取る](#accepting-messages-from-other-bots-allow_bots) も見てください。 |
| `platforms.slack.extra.cron_continuable_surface` | `"thread"` | [続きを話せる定期実行](/hermes/docs/user-guide/features/cron/#flat-in-channel-continuation-slack)の届け先。`"thread"` は届けるたびに専用のスレッドを開きます（初期値）。`"in_channel"` はチャンネルの流れに直接届けます。`in_channel` を使うときは `reply_in_thread: false`（と `require_mention: false`）を組み合わせて、ふつうのチャンネルの返信で続きを進められるようにします。 |

同じ設定は環境変数 `SLACK_ALLOW_BOTS=none|mentions|all` でも書けます。両方を設定した場合は `platforms.slack.extra.allow_bots` が優先されます。相手のボットが明示的なメンションなしでも答えてしまう場合、`all` は避けてください。相手側の返信の決まりしだいで堂々巡りになり得ます。

### 作業中の状態表示 {#working-state-status-line}

エージェントがメッセージを処理している間、Slack はスレッドのボット名の横に状態表示を出します。初期状態では Hermes が `is thinking...` と表示します。これは `typing_status_text` で変えられます。たとえば Ada という名前の子猫の助手なら次のようになります。

```yaml
platforms:
  slack:
    # Custom working-state status line (default: "is thinking...").
    typing_status_text: "is pouncing… 🐾"
```

| 項目 | 初期値 | 説明 |
|-----|---------|-------------|
| `platforms.slack.typing_status_text` | `"is thinking..."` | エージェントがメッセージを処理している間に出る、作業中の状態表示の文言。`assistant:write` のスコープが必要です。これがないと状態を伝える呼び出しが黙って失敗し、ここに何を書いても Slack が自前の当たりさわりのない文言を表示します。状態表示そのものをやめるには `typing_indicator: false` にします。 |

:::note 状態表示が出る場所
自分で決めた文言は、**返信の入力欄の下のところ**（「*BotName* is thinking…」）に出ます。メッセージの一覧のなかに出るわけではありません。AI のアプリが動いている間にメッセージ欄へ出る「Generating response…」「Finding answers…」といった行は **Slack が自前で順に出しているもの** です。`assistant.threads.setStatus` はそれらを操作できず、両方が同時に出ることもあります。
:::

同じ項目は、Google Chat で目に見える作業中の印のメッセージ（`platforms.google_chat.typing_status_text`、初期値は `"Hermes is thinking…"`）にも使えます。ただし Google Chat では、消えていく状態表示ではなく、実際に投稿されたメッセージが返信へ書き換わる形になります。

### 実行中の状態表示（ツールごと） {#live-status-per-tool}

初期状態では、状態表示は **エージェントの作業に合わせてその場で変わります**。固定の `is thinking...` ではなく、いま何をしているか、たとえば `is running pytest tests/…`、`is reading docs/api.md…`、`is searching the web for slack api limits…` のように出ます。ツールの呼び出しの合間には、固定の文言に戻ります。これは今までの状態更新の間隔に乗るだけなので、Slack の API を余分に呼びません。Slack の初期値である `tool_progress: off` のままでも動きます。進捗の吹き出しと違って、状態表示は消えるものなので、チャンネルには何も残りません。

これは `display.live_status` で決めます（全体でも、サービスごとでも設定できます）。

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

| 項目 | 初期値 | 説明 |
|-----|---------|-------------|
| `display.live_status` | `"full"` | ツールごとの実行中の状態表示。`full` は動作と対象の両方を出します。`verb` は動作だけを出します（ファイルのパスやコマンドを共有のチャンネルに出しません）。`off` は固定の文言に戻します。固定の状態表示と同じく、`assistant:write` のスコープが必要です。 |

### Slack 本来の逐次表示（打っているように見える返信） {#native-streaming-live-typing-replies}

Slack の [Agents & AI Apps](https://docs.slack.dev/ai/) の機能には、返信をその場で打っているように見せる仕組み（`chat.startStream` / `chat.appendStream` / `chat.stopStream`）があります。ほかの場合に使う、編集を重ねる更新よりもずっとなめらかです。`streaming.enabled` が有効なら（transport が `auto` か `draft`）、Hermes は使える場面で自動的にこの仕組みを使います。

- 最初のひとかたまりで送信を始め、以降は差分だけを足していきます（この API は追記しかできません）。流して送ったメッセージが **そのまま** 最後のメッセージになります。Hermes は `chat.stopStream` で締めくくり、同じ内容をもう一度投稿することはしません。
- Slack アプリで AI の機能が有効になっていない場合（または `assistant:write` のスコープがない場合）、最初の失敗を覚えておき、Hermes は編集を重ねる方式に切り替えます。そのとき、直し方を書いた警告をログに 1 行だけ出します。
- 自分で選んで有効にした Block Kit（`rich_blocks: true`）は、締めくくったメッセージにも適用されます。編集を重ねる方式で仕上げるときと同じです。

逐次表示を有効にする以外に、特別な設定は要りません。

```yaml
streaming:
  enabled: true       # transport auto/draft lights up Slack native streaming
```

### Slack 本来の作業カード（ツールの進捗をその場で表示） {#native-task-cards-live-tool-progress}

`platforms.slack.extra.native_task_cards: true` にすると、実行中のツールの呼び出しが、文字の進捗の吹き出しではなく Slack 本来の **計画・作業のカード**（Slack 自身の AI 機能が使っているのと同じ見た目）として表示されます。やり取りごとにカードが 1 枚、ツールの呼び出しごとに 1 行が並び、実行中・完了・エラーの状態がその場で更新されます。

```yaml
platforms:
  slack:
    extra:
      native_task_cards: true
```

- これは自分で選んで有効にする進捗表示です。Slack での初期値が `tool_progress: off` であっても動きます（文字の吹き出しはチャンネルを騒がせますが、Slack 本来のカードはそうなりません）。
- 同じツールを同時に呼んだ場合も、本物のツール呼び出しの ID で結び付けるので、並行する `web_search` の呼び出しはそれぞれ自分の行に正しい状態が出ます。
- Slack 本来の送信を始められない、または更新できないときは、Hermes は編集を重ねる 1 つのテキストのメッセージに切り替えて、そのやり取りの間じゅう進捗を出し続けます。
- カードの送信は、やり取りが終わるときにちょうど一度だけ止まります。中断や切断のときも同じなので、動いたままの表示が残ることはありません。

### セッションの分離 {#session-isolation}

```yaml
# Global setting — applies to Slack and all other platforms
group_sessions_per_user: true
```

`true`（初期値）のときは、共有のチャンネルにいる利用者それぞれが、自分だけの会話のセッションを持ちます。`#general` で 2 人が Hermes と話しても、履歴と文脈は別々になります。

チャンネル全体で 1 つの会話のセッションを共有する、共同作業の形にしたいときは `false` にします。この場合、文脈の膨らみとトークンの費用を全員で分け合うことになり、誰か 1 人の `/reset` が全員のセッションを消してしまう点にも注意してください。

### メンションときっかけの振る舞い {#mention-trigger-behavior}

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

:::tip `strict_mention` を使う場面
Slack の初期の振る舞い、つまり「ボットがこのスレッドを覚えている」動きが利用者を驚かせるような、にぎやかなワークスペースでは `true` にします。たとえば技術サポートの長いスレッドで、ボットが最初のほうだけ手伝ったあとは、あらためて呼ばれない限り黙っていてほしい場合です。個人チャットと、やり取りが続いているセッションには影響しません。
:::

:::tip `ignore_other_user_mentions` を使う場面
スレッドの自動追従や `free_response_channels` によってボットがにぎやかなスレッドを追いかけ、人どうしのやり取りに割り込んでしまうときに `true` にします。これは `strict_mention` より狭い範囲の手当てです。動いているスレッドでのふつうの続きの発言には引き続き答え、別の人への @メンションで始まるメッセージだけを見送ります。**1 対 1 の個人チャットには影響しません**。グループ DM（MPIM）とチャンネルには適用され、下にある共有の場についての方針と同じ扱いになります。`@here` や `@channel` のような全員向けの呼びかけやチャンネルへの言及は、人ではなく場に向けたものなので、見送りの対象にはなりません。
:::

:::info
Slack ではどちらの使い方もできます。初期状態では会話を始めるのに `@mention` が必要ですが、`SLACK_FREE_RESPONSE_CHANNELS`（カンマ区切りのチャンネル ID）か `config.yaml` の `slack.free_response_channels` で、特定のチャンネルだけ対象から外せます。ボットがスレッドでやり取りを始めたあとは、そのスレッドの続きの返信にメンションは要りません。**1 対 1 の個人チャット** では、ボットはメンションなしでいつでも返事をします。
:::

:::caution グループ DM（MPIM）は共有の場であり、1 対 1 の個人チャットではありません
**1 対 1 のダイレクトメッセージ** は 1 人だけとの内輪のやり取りなので、メンションは要りません。**グループ DM（MPIM、複数人のダイレクトメッセージ）** は *共有の場* です。複数の人が見て、ボットを動かせます。そのためチャンネルと同じ管理の設定にしたがいます。`require_mention`、`strict_mention`、`free_response_channels`、`allowed_channels` がいずれも効き、ボットが `:eyes:` や `:white_check_mark:` のリアクションを付けるのは、実際に `@mentioned` されたときだけです。特定のグループ DM でボットに自由に返事をさせたいときは、そのチャンネル ID（`G` で始まります）を `free_response_channels` に足します。
:::

#### どのメンションの設定を使えばいいか {#which-mention-option-do-i-want}

これらの関門は組み合わせて働き、それぞれ別の問いに答えます。

| 設定 | 答える問い | 初期値 | 効く範囲 |
|--------|--------------------|---------|-------|
| `require_mention` | **チャンネルの通常のメッセージ** に @メンションが要るか？ | `true` | すべてのチャンネル |
| `free_response_channels` | どのチャンネルを `require_mention` の対象から外すか？ | なし | 並べたチャンネル |
| `require_mention_channels` | `require_mention` が `false` でも、あるいはメンション不要のチャンネルでも、どのチャンネルで必ず @メンションを求めるか？ どちらよりも優先されます。 | なし | 並べたチャンネル |
| `thread_require_mention` | 通常のメッセージには要らなくても、**スレッドの返信** に @メンションが要るか？ メンションされたスレッドを覚えておくことはしません。 | `false` | スレッドのみ |
| `strict_mention` | 通常のメッセージもスレッドも含め、**すべての** チャンネルのメッセージに、そのつど @メンションが要るか？ 自動での追従（メンションされたスレッドの記憶、ボットの発言への続き、動いているセッションの再開）をすべて止めます。 | `false` | すべてのチャンネルとスレッド |
| `ignore_other_user_mentions` | **別の人への @メンションで始まる** メッセージ（`@rasha can you take this?`）を見送るか？ メンション不要の設定やスレッドの自動追従より優先されます。文の途中での言及は、これまでどおりボットに届きます。 | `false` | チャンネルとグループ DM |

目安としては、`strict_mention` がいちばん大づかみな手段です。`thread_require_mention` は通常のメッセージの扱いに触れずに、にぎやかなスレッドだけを静かにします。`require_mention_channels` は、ふだんメンション不要にしているボットで、特定のチャンネルだけ締め直します。`ignore_other_user_mentions` は、はっきり別の人に宛てたメッセージだけを見送ります。1 対 1 の個人チャットではいつでも返事をし、これらの設定の影響を受けません。

### ほかのボットからのメッセージを受け取る（`allow_bots`） {#accepting-messages-from-other-bots-allowbots}

初期状態では、Hermes はほかの Slack のボットやアプリが書いたメッセージ（Workflow Builder の投稿も含みます）をすべて無視します。複数のエージェントが並ぶワークスペース、つまり複数の Hermes や相手側のボットが 1 つのチャンネルで協力する場合は、`allow_bots` で受け取るようにします。

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

環境変数では `SLACK_ALLOW_BOTS=none|mentions|all` にあたります（両方を設定した場合は設定ファイル側が優先されます）。知らない値は `none` として扱われます。

`mentions` のときの判定は次のとおりです。

- 相手のボットのメッセージを受け取るのは、**そのメッセージ自体に、このボットへの今の `@mention` が入っているときだけ** です。本文でも Block Kit の部品のなかでも構いません。スレッドの履歴は判定に入りません。そのスレッドで前にメンションされていたこと、ボット自身の発言への返信、動いているスレッドのセッションのいずれも、あとから来るメンションなしの相手ボットのメッセージを通しません。これは意図してそうしています。エージェント同士が「了解」「状況」と返し合う堂々巡りは、これで止まります。
- 人のメッセージには影響しません。そちらにはふだんどおりメンションの判定がかかります。
- どの設定でも、Hermes は自分自身のメッセージを常に無視します。自分の声がこだまして回り続けるのを防ぐためです。

ボット同士の連携では `mentions` をおすすめします。エージェントはやり取りのたびに、相手をはっきり呼ぶ必要があります。相手のボットの返信の決まりが堂々巡りを起こさないと確かめられない限り、`all` は避けてください。何にでも答える 2 台のボットは、いつまでも返し合います。判定の対象には、ボット印の付いたメッセージ（`bot_id`、`subtype: bot_message`）、アプリから発生したイベント、印の付いていないボットの *利用者*（`users.info` で確かめます）が含まれるので、相手側の Hermes もワークスペースをまたいで同じように選り分けられます。

複数のボットを厳しく運用するなら、`require_mention: true` と `strict_mention: true` を組み合わせます。下の動作確認のひな形も見てください。

### リアクションをきっかけにする（`reaction_triggers`） {#reaction-triggers-reactiontriggers}

初期状態では、絵文字のリアクションは受け取ったことだけ確認して捨てられます。ボットのメッセージに 👍 を付けても何も起きません。リアクションをエージェントの処理に流したいときは `slack.reaction_triggers` を設定します（`reactions:read` のスコープと、Slack アプリのマニフェストでの `reaction_added` / `reaction_removed` のボットイベントの購読が必要です。`hermes slack manifest` で作り直してください）。

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

環境変数では `SLACK_REACTION_TRIGGERS`（`true` / `all` またはカンマ区切りの一覧）と `SLACK_REACTION_TRIGGER_TARGET` にあたります。

振る舞いは次のとおりです。

- リアクションは、`reaction:added:👍` / `reaction:removed:👍` という本文のふつうのやり取りとしてエージェントに届きます（よくある Slack の名前は絵文字に置き換えられ、知らない名前は `reaction:added:custom-emoji` のようにそのまま渡されます）。リアクションされたメッセージにぶら下げて届くので、エージェントは何に対するリアクションかを把握でき、そのやり取りは返信のときと同じセッションに入ります。
- リアクションを付けた人がそのメッセージの送り主として扱われるので、**利用者の権限の判定と `allowed_channels` の絞り込みが、打ったメッセージとまったく同じようにかかります**。無関係な人のリアクションが、その人のメッセージでは動かせない場所でエージェントを動かすことはできません。
- `reaction_triggers: true` のときに流れるのは、ボット **自身の** メッセージに付いたリアクションだけです（承認や確認の流れを想定しています）。絵文字を並べて指定した場合は、その絵文字がどのメッセージからでも流れます。
- ボット自身が付ける処理状況のリアクション（`:eyes:` など）が戻ってくることはありません。
- この設定とは別に、人が付けたリアクションはすべて `reaction:added` / `reaction:removed` の[ゲートウェイのフック](/hermes/docs/user-guide/features/hooks/#available-events)を呼びます。エージェントのやり取りを必要としない見張り役のための仕組みです。

### エージェント同士の動作確認 {#peer-agent-smoke-check}

やり取りごとの厳密なメンションを前提にした、複数ボットの Slack 環境では、次のひな形を保ってください。

```yaml
slack:
  require_mention: true
  strict_mention: true
  allow_bots: mentions
  allowed_channels: ""
```

ゲートウェイの設定変更、配備、再起動のあとには、次の合成イベントによる動作確認を走らせます。

```bash
uv run --frozen pytest -q tests/gateway/test_slack_peer_agent_smoke.py -o addopts=''
```

この確認はプロセス内で作った擬似的な Slack のイベントだけを使います。実際に Slack へメッセージを送ることはなく、初期状態では本物のボットトークンも要りません。

失敗の種類は次のとおりです。

- `config:` `test_peer_agent_smoke_preflight_contract` がひな形とのずれ（`require_mention`、`strict_mention`、`allow_bots`、`allowed_channels`）を見つけた場合。
- `platform_connectivity:` アダプターやクライアントが初期化されておらず、振り分けの確認結果をまだ信用できない場合。
- `bot_identity:` アダプターが自分のボットの利用者 ID を得られておらず、今のメッセージのメンションの判定ができない場合。
- `routing_logic:` Slack のアダプターが、エージェント同士のやり取りで守るべき決まりのどれか（人のメンションの振り分け、相手ボットの無視、はっきりメンションされた相手ボットの受け入れ、受け身の了解・状況・エラーの抑制）を壊してしまった場合。

この確認が通るのに実際のワークスペースでは振り分けがおかしいときは、振り分けの処理そのものではなく、Slack のトークンやワークスペースとの接続、動かしている環境の状態を調べてください。

### チャンネルの許可リスト（`allowed_channels`） {#channel-allowlist-allowedchannels}

ボットが動くチャンネルを、決められたものだけに絞れます。多くのチャンネルに招待されているけれど、返事をしてほしいのは一部だけ、というときに便利です。設定すると、一覧にないチャンネルのメッセージは、`@mentioned` されていても **黙って無視** されます。

**1 対 1 の個人チャットはこの絞り込みの対象外です**。許可された利用者はいつでもダイレクトメッセージでボットに届きます。**グループ DM（MPIM）は対象外ではありません**。チャンネルと同じで、MPIM も許可リストに載っていなければ（ID は `G` で始まります）、そのメッセージは捨てられます。

```yaml
slack:
  allowed_channels:
    - "C0123456789"   # #ops
    - "C0987654321"   # #incident-response
```

環境変数（カンマ区切り）で書くこともできます。

```bash
SLACK_ALLOWED_CHANNELS="C0123456789,C0987654321"
```

振る舞いは次のとおりです。

- 空、または未設定 → 制限なし（これまでの動きと完全に同じです）。
- 中身がある → チャンネル ID が一覧に載っている必要があります。載っていないメッセージは、ほかのどの関門（メンションの要否、`free_response_channels` など）よりも先に捨てられます。
- Slack のチャンネル ID は `C`（公開）、`G`（非公開）、`D`（個人チャット）で始まります。Slack の画面で「Open channel details」→「About」を開くか、API で調べられます。

あわせて読む: [管理者用と利用者用のスラッシュコマンドの分け方](/hermes/docs/reference/slash-commands/#permissions-and-adminuser-split)。

### 許可していない利用者への対応 {#unauthorized-user-handling}

```yaml
slack:
  # What happens when an unauthorized user (not in SLACK_ALLOWED_USERS) DMs the bot
  # "pair"   — prompt them for a pairing code (default)
  # "ignore" — silently drop the message
  unauthorized_dm_behavior: "pair"
```

すべてのサービスに共通の設定として書くこともできます。

```yaml
unauthorized_dm_behavior: "pair"
```

`slack:` の下にあるサービスごとの設定は、共通の設定より優先されます。

### 音声の書き起こし {#voice-transcription}

```yaml
# Global setting — enable/disable automatic transcription of incoming voice messages
stt_enabled: true
```

`true`（初期値）のときは、届いた音声のメッセージが、エージェントの処理に回る前に、設定した書き起こしのサービスで自動的に文字にされます。

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

`SLACK_HOME_CHANNEL` にチャンネル ID を設定すると、Hermes は予定されたメッセージ、定期実行の結果、そのほか自分から送る通知をそのチャンネルに届けます。チャンネル ID の調べ方は次のとおりです。

1. Slack でチャンネル名を右クリックします
2. **View channel details** をクリックします
3. いちばん下までスクロールすると、チャンネル ID が表示されています

```bash
SLACK_HOME_CHANNEL=C01234567890
```

そのチャンネルに **ボットを招待してある** ことを確かめてください（`/invite @Hermes Agent`）。

### 定期実行の届け先の指定 {#cron-delivery-targeting}

定期実行のジョブ（[定期実行の案内](/hermes/docs/user-guide/features/cron/#delivery-options)を見てください）では、Slack への届け先を 3 通りで指定できます。

| `deliver:` の値 | 届く先 |
|------------------|----------------|
| `slack` | ホームチャンネル（`SLACK_HOME_CHANNEL`） |
| `slack:C0123456789` | ID で指定した特定のチャンネル |
| `slack:U0123456789` | その利用者との **個人チャット**。利用者 ID だけを書くと、自動で個人チャットのやり取りに読み替えられます（`im:write` のスコープが必要です） |

定期実行の処理がゲートウェイと同じ場所で動いていなくても届きます。Hermes は `SLACK_BOT_TOKEN` を使う単独の Web API の送信に切り替えます。定期実行の出力にある `MEDIA:` の添付は、同じ届け先へ Slack 本来のファイル共有としてアップロードされます。

### メッセージとメディアを送る（`send_message`） {#sending-messages-and-media-sendmessage}

エージェントの `send_message` のツールも同じ形の届け先を受け取ります。チャンネル ID（`C…` / `G…`）、個人チャットのやり取り（`D…`）、利用者 ID だけ（`U…` / `W…`）のいずれでも構いません。利用者 ID は、テキストでもメディアでも問いかけでも、どの送信経路でもその人との個人チャットに読み替えられます。`MEDIA:<path>` の添付（画像・PDF・文書）は Slack 本来のファイル共有としてアップロードされ、添付が 1 つで短いメッセージが添えられている場合は、別のメッセージではなくファイルの説明文として付きます。見つからないファイルは、送信全体を失敗させるのではなく、ファイルごとの警告として報告されます。

---

## 複数のワークスペースへの対応 {#multi-workspace-support}

Hermes は、1 つのゲートウェイで **複数の Slack ワークスペース** に同時につなげます。ワークスペースごとに、それぞれのボットの利用者 ID で別々に認証します。

### 設定 {#configuration}

`SLACK_BOT_TOKEN` に、複数のボットトークンを **カンマ区切りの一覧** で渡します。

```bash
# Multiple bot tokens — one per workspace
SLACK_BOT_TOKEN=xoxb-workspace1-token,xoxb-workspace2-token,xoxb-workspace3-token

# A single app-level token is still used for Socket Mode
SLACK_APP_TOKEN=xapp-your-app-token
```

`~/.hermes/config.yaml` に書くこともできます。

```yaml
platforms:
  slack:
    token: "xoxb-workspace1-token,xoxb-workspace2-token"
```

### OAuth のトークンファイル {#oauth-token-file}

環境変数や設定ファイルのトークンに加えて、Hermes は次の場所にある **OAuth のトークンファイル** からもトークンを読み込みます。

```
~/.hermes/slack_tokens.json
```

このファイルは、チーム ID とトークンの情報を対応させた JSON のオブジェクトです。

```json
{
  "T01ABC2DEF3": {
    "token": "xoxb-workspace-token-here",
    "team_name": "My Workspace"
  }
}
```

このファイルのトークンは、`SLACK_BOT_TOKEN` で指定したトークンとまとめて扱われます。重複するトークンは自動で取り除かれます。

### しくみ {#how-it-works}

- 一覧の **最初のトークン** が主のトークンで、ソケットモードの接続（AsyncApp）に使われます。
- 起動時に、それぞれのトークンが `auth.test` で認証されます。ゲートウェイは `team_id` ごとに専用の `WebClient` と `bot_user_id` を対応させます。
- メッセージが届くと、Hermes はそのワークスペースに合ったクライアントを使って返事をします。
- 主の `bot_user_id`（最初のトークンのもの）は、ボットの身元が 1 つであることを前提にした機能との互換のために使われます。

---

## ボイスメッセージ {#voice-messages}

Hermes は Slack でも音声に対応しています。

- **受け取り:** 音声のメッセージは、設定した書き起こしのサービスで自動的に文字にされます。手元で動く `faster-whisper`、Groq の Whisper（`GROQ_API_KEY`）、OpenAI の Whisper（`VOICE_TOOLS_OPENAI_KEY`）が使えます
- **送り出し:** 読み上げの応答は、音声ファイルの添付として送られます

---

## チャンネルごとの指示 {#per-channel-prompts}

特定の Slack チャンネルに、その場限りのシステムの指示を割り当てられます。この指示はやり取りのたびに実行時に差し込まれ、会話の記録には残らないので、変更はすぐに効きます。

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

見出しにあたるのは Slack のチャンネル ID です（チャンネルの詳細 →「About」を開いて下までスクロールすると分かります）。そのチャンネルのすべてのメッセージに、この指示がその場限りのシステムの指示として差し込まれます。

## チャンネルごとのスキルの割り当て {#per-channel-skill-bindings}

特定のチャンネルや個人チャットで新しいセッションが始まるたびに、スキルを自動で読み込ませられます。やり取りのたびに差し込まれるチャンネルごとの指示とは違い、スキルの割り当てはスキルの内容を **セッションの開始時に** 利用者のメッセージとして差し込みます。それが会話の履歴の一部になるので、以降のやり取りで読み込み直す必要はありません。

用途がはっきり決まっている個人チャットやチャンネル（暗記カード、特定分野の質問応答、サポートの一次受けなど）で、短い返信のたびにモデル自身の判断で読み込むかどうかを決めさせたくない場合に向いています。

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

補足です。
- 割り当てはチャンネル ID で判定します。割り当てのあるチャンネルのスレッドのメッセージは、親のチャンネルの割り当てを引き継ぎます。
- スキルが読み込まれるのはセッションの開始時（新しいセッション、または自動でのリセットのあと）だけです。割り当てを変えたときは、`/new` を実行するか、セッションが自動でリセットされるのを待つと反映されます。
- スキルの指示に加えて、チャンネルごとの口調や制約を足したいときは `channel_prompts` と組み合わせてください。

## 困ったときは {#troubleshooting}

| 症状 | 対処 |
|---------|----------|
| 個人チャットに返事をしない | イベントの購読に `message.im` が入っているか、アプリを入れ直したかを確かめます |
| 個人チャットでは動くのにチャンネルでは動かない | **いちばん多い症状です。** イベントの購読に `message.channels` と `message.groups` を足し、アプリを入れ直し、`/invite @Hermes Agent` でボットをチャンネルに招待します |
| チャンネルでの @メンションに返事をしない | 1) `message.channels` のイベントを購読しているか確かめます。2) ボットをそのチャンネルに招待する必要があります。3) `channels:history` のスコープが入っているか確かめます。4) スコープやイベントを変えたらアプリを入れ直します |
| 非公開チャンネルのメッセージを無視する | `message.groups` のイベントの購読と `groups:history` のスコープの両方を足し、アプリを入れ直して `/invite` でボットを招待します |
| グループ DM（複数人のダイレクトメッセージ）で返事をしない | `message.mpim` のイベントの購読と `mpim:history` のスコープ（あわせて `mpim:read` も）を足し、アプリを **入れ直します**。`message.mpim` がないと、1 対 1 の個人チャットが動いていても、Slack はグループ DM のメッセージをボットに届けません。 |
| 個人チャットで「Sending messages to this app has been turned off」と出る | App Home の設定で **メッセージタブ** を有効にします（手順 5 を見てください） |
| 「not_authed」「invalid_auth」のエラーが出る | ボットトークンとアプリトークンを作り直し、`.env` を更新します |
| 返事はするのにチャンネルへ投稿できない | `/invite @Hermes Agent` でボットをそのチャンネルに招待します |
| 会話はできるのにアップロードされた画像やファイルを読めない | `files:read` を足して、アプリを **入れ直します**。Slack がスコープや認証、権限の失敗を返したときは、Hermes が添付の読み取りについての診断をチャット上に出すようになりました。 |
| `missing_scope` のエラーが出る | OAuth & Permissions で必要なスコープを足し、アプリを **入れ直します** |
| ソケットの接続がひんぱんに切れる | ネットワークを確かめます。Bolt は自動でつなぎ直しますが、接続が不安定だと反応が遅れます |
| スコープやイベントを変えたのに何も変わらない | スコープやイベントの購読を変えたら、アプリをワークスペースに **入れ直す必要があります** |

### チェックリスト {#quick-checklist}

チャンネルでボットが動かないときは、次の **すべて** を確かめてください。

1. ✅ `message.channels` のイベントを購読している（公開チャンネル用）
2. ✅ `message.groups` のイベントを購読している（非公開チャンネル用）
3. ✅ `app_mention` のイベントを購読している
4. ✅ `channels:history` のスコープを足している（公開チャンネル用）
5. ✅ `groups:history` のスコープを足している（非公開チャンネル用）
6. ✅ スコープやイベントを足したあとにアプリを **入れ直した**
7. ✅ ボットをチャンネルに **招待した**（`/invite @Hermes Agent`）
8. ✅ メッセージでボットに **@メンションしている**

---

## 安全に使うために {#security}

:::warning
**`SLACK_ALLOWED_USERS` は必ず設定してください**。許可する利用者のメンバー ID を書きます。この設定がないと、ゲートウェイは安全のため初期状態で **すべてのメッセージを拒否** します。ボットのトークンは決して人に渡さないでください。パスワードと同じ扱いをします。
:::

- トークンは `~/.hermes/.env`（ファイルの権限は `600`）に置きます
- Slack アプリの設定から、トークンを定期的に入れ替えます
- Hermes の設定ディレクトリに誰が触れるかを見直します
- ソケットモードでは公開のエンドポイントを出さずに済むので、攻撃されうる面がひとつ減ります
