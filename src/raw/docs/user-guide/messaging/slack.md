---
title: "Slack"
description: "ソケットモードを使って Hermes Agent を Slack のボットとして設定する"
upstream_path: user-guide/messaging/slack.md
upstream_blob: 6a0a39657129c555bf63656d7c7a30903f1bbb07
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/slack
---

# Slack の設定 {#slack-setup}

ソケットモードを使って、Hermes Agent を Slack のボットとしてつなぎます。ソケットモードは
公開の HTTP の受け口ではなく WebSocket を使うので、Hermes を外から見える場所に置く必要はありません。
ファイアウォールの内側でも、手元のノート PC でも、社内のサーバーでも動きます。

:::warning 旧来の Slack アプリは廃止されました
RTM API を使う旧来の Slack アプリは **2025 年 3 月に完全に廃止されました**。Hermes は
いまどきの Bolt SDK をソケットモードで使います。古いアプリを持っている場合は、
以下の手順で新しく作り直してください。
:::

## 全体像 {#overview}

| 項目 | 内容 |
|-----------|-------|
| **ライブラリ** | Python 向けの `slack-bolt` / `slack_sdk`（ソケットモード） |
| **接続のしかた** | WebSocket。公開 URL は要りません |
| **必要なトークン** | ボットトークン（`xoxb-`）とアプリレベルトークン（`xapp-`） |
| **利用者の見分け方** | Slack のメンバー ID（例: `U01ABC2DEF3`） |

---

## 手順 1: Slack アプリを作る {#step-1-create-a-slack-app}

いちばん早いのは、Hermes が作ってくれるマニフェストを貼り付ける方法です。組み込みの
スラッシュコマンド（`/btw`、`/stop`、`/model` など）、必要な OAuth の権限、
受け取るイベントをすべて書き出したうえで、ソケットモードも有効にしてくれます。
これが一度に済みます。

### 方法 A: Hermes が作るマニフェストから（おすすめ） {#option-a-from-a-hermes-generated-manifest-recommended}

1. マニフェストを作ります。新しく作る Slack アプリでは Agent 表示を使う必要があります。
   ```bash
   hermes slack manifest --agent-view --write
   ```
   これで `~/.hermes/slack-manifest.json` が書き出され、貼り付けの手順が表示されます。
   Slack の旧来の Assistant 表示を使い続けている既存のアプリは、移行の準備ができるまで
   `--agent-view` を省いて構いません。

   Slack の長い説明文を、手元の UTF-8 のテキストや Markdown のファイルから入れたいときは
   `--long-description-file` を足します。

   ```bash
   hermes slack manifest --agent-view \
     --long-description-file AGENTS.md --write
   ```

   ファイルの中身は、Slack が定める 175〜4,000 文字の範囲でそのまま使われます。
   その場で文章を書くなら `--long-description "..."` を使います。この二つは同時に使えず、
   `--slashes-only` と組み合わせることもできません。
2. [https://api.slack.com/apps](https://api.slack.com/apps) を開き、
   **Create New App** → **From an app manifest** と進みます
3. ワークスペースを選び、JSON の中身を貼り、内容を確かめて **Next**
   → **Create** を押します
4. **手順 6: アプリをワークスペースに導入する**まで飛ばして構いません。権限もイベントも
   スラッシュコマンドも、マニフェストが済ませています。

### 方法 B: ゼロから作る（手作業） {#option-b-from-scratch-manual}

1. [https://api.slack.com/apps](https://api.slack.com/apps) を開きます
2. **Create New App** を押します
3. **From scratch** を選びます
4. アプリ名（例: 「Hermes Agent」）を入れ、ワークスペースを選びます
5. **Create App** を押します

アプリの **Basic Information** のページに移ります。以下の手順 2〜6 に進んでください。

---

## 手順 2: ボットトークンの権限を設定する {#step-2-configure-bot-token-scopes}

左のメニューから **Features → OAuth & Permissions** を開きます。**Scopes → Bot Token Scopes** まで下がり、次を足します。

| 権限 | 用途 |
|-------|---------|
| `chat:write` | ボットとしてメッセージを送る |
| `app_mentions:read` | チャンネルで @ で呼ばれたことに気づく |
| `channels:history` | ボットが入っている公開チャンネルのメッセージを読む |
| `channels:read` | 公開チャンネルの一覧と情報を取る |
| `groups:history` | 招かれた非公開チャンネルのメッセージを読む |
| `im:history` | ダイレクトメッセージの履歴を読む |
| `im:read` | DM の基本的な情報を見る |
| `im:write` | DM を開いて扱う |
| `mpim:history` | 複数人の DM（グループ DM）の履歴を読む |
| `mpim:read` | グループ DM の基本的な情報を見る |
| `users:read` | 利用者の情報を調べる |
| `files:read` | 添付ファイル（音声メモを含む）を読んで取ってくる |
| `files:write` | ファイル（画像・音声・書類）を送る |

:::caution 権限が足りないと、その分の機能が動きません
`channels:history` と `groups:history` がないと、ボットは**チャンネルのメッセージを受け取れず**、
DM でしか動きません。`files:read` がないと、会話はできても**利用者が上げたファイルを確実には読めません**。
この二つが、いちばん忘れられがちな権限です。
:::

**任意の権限:**

| 権限 | 用途 |
|-------|---------|
| `groups:read` | 非公開チャンネルの一覧と情報を取る |
| `assistant:write` | メッセージを処理している間、ボット名の横に作業中の状態（「is thinking…」）を出します。この権限がないと `assistant.threads.setStatus` の呼び出しが黙って失敗し、Slack が用意した文言（「Finding answers…」「Reviewing findings…」など）が代わりに出ます。Hermes 側から文言を決めることはできません。`typing_status_text` を効かせるには必須です。 |

---

## 手順 3: ソケットモードを有効にする {#step-3-enable-socket-mode}

ソケットモードを使うと、公開 URL を用意しなくても WebSocket でつなげます。

1. 左のメニューから **Settings → Socket Mode** を開きます
2. **Enable Socket Mode** をオンにします
3. **アプリレベルトークン**を作るよう促されます:
   - 名前は `hermes-socket` のような分かりやすいもので構いません（何でも動きます）
   - **`connections:write`** の権限を足します
   - **Generate** を押します
4. **表示されたトークンを控えます**。`xapp-` で始まるもので、これが `SLACK_APP_TOKEN` です

:::tip
アプリレベルトークンは、あとからでも **Settings → Basic Information → App-Level Tokens** で確かめたり作り直したりできます。
:::

---

## 手順 4: 受け取るイベントを選ぶ {#step-4-subscribe-to-events}

ここが要です。ボットがどのメッセージを見られるかが、この設定で決まります。

1. 左のメニューから **Features → Event Subscriptions** を開きます
2. **Enable Events** をオンにします
3. **Subscribe to bot events** を開いて、次を足します

| イベント | 必須か | 用途 |
|-------|-----------|---------|
| `message.im` | **はい** | ダイレクトメッセージを受け取る |
| `message.mpim` | **はい** | 招かれた**グループ DM**（複数人の DM）のメッセージを受け取る |
| `message.channels` | **はい** | 招かれた**公開**チャンネルのメッセージを受け取る |
| `message.groups` | **おすすめ** | 招かれた**非公開**チャンネルのメッセージを受け取る |
| `app_mention` | **はい** | @ で呼ばれたときに Bolt SDK がエラーを出すのを防ぐ |

4. ページの下にある **Save Changes** を押します

:::danger イベントの設定漏れが、いちばん多いつまずきです
DM では動くのに**チャンネルでは動かない**なら、まず `message.channels`（公開チャンネル用）や
`message.groups`（非公開チャンネル用）の足し忘れを疑ってください。
これがないと、Slack はチャンネルのメッセージをボットに届けません。
:::

---

## 手順 5: メッセージタブを有効にする {#step-5-enable-the-messages-tab}

これでボットに DM を送れるようになります。設定しないと、DM を送ろうとした人に **「Sending messages to this app has been turned off」** と表示されます。

1. 左のメニューから **Features → App Home** を開きます
2. **Show Tabs** まで下がります
3. **Messages Tab** をオンにします
4. **「Allow users to send Slash commands and messages from the messages tab」** にチェックを入れます

:::danger これをしないと DM は完全に塞がれます
権限もイベントもすべて正しく設定しても、メッセージタブが有効でなければ Slack は DM を通しません。これは Slack 側の決まりで、Hermes の設定の問題ではありません。
:::

---

## 手順 6: アプリをワークスペースに導入する {#step-6-install-app-to-workspace}

1. 左のメニューから **Settings → Install App** を開きます
2. **Install to Workspace** を押します
3. 権限の内容を確かめて **Allow** を押します
4. 許可すると、`xoxb-` で始まる **Bot User OAuth Token** が表示されます
5. **このトークンを控えます**。これが `SLACK_BOT_TOKEN` です

:::tip
あとから権限やイベントの設定を変えたときは、**アプリを入れ直さないと**反映されません。
Install App のページに、そのことを知らせる帯が出ます。
:::

---

## 手順 7: 許可リストに載せるメンバー ID を調べる {#step-7-find-user-ids-for-the-allowlist}

Hermes の許可リストは、ユーザー名や表示名ではなく Slack の**メンバー ID** で指定します。

メンバー ID の調べ方:

1. Slack で相手の名前かアイコンを押します
2. **View full profile** を押します
3. **⋮**（その他）のボタンを押します
4. **Copy member ID** を選びます

メンバー ID は `U01ABC2DEF3` のような形です。最低でも自分のメンバー ID が要ります。

---

## 手順 8: Hermes を設定する {#step-8-configure-hermes}

`~/.hermes/.env` に次を足します。

```bash
# Required
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_APP_TOKEN=xapp-your-app-token-here
SLACK_ALLOWED_USERS=U01ABC2DEF3              # Comma-separated Member IDs

# Optional
SLACK_HOME_CHANNEL=C01234567890              # Default channel for cron/scheduled messages
SLACK_HOME_CHANNEL_NAME=general              # Human-readable name for the home channel (optional)
```

対話形式で設定することもできます。

```bash
hermes gateway setup    # Select Slack when prompted
```

そのうえでゲートウェイを起動します。

```bash
hermes gateway              # Foreground
hermes gateway install      # Install as a user service
sudo hermes gateway install --system   # Linux only: boot-time system service
```

:::tip Codex の推論の強さについて
Codex を使う Slack のエージェント同士のチャンネルでは、`agent.reasoning_effort: high` かそれ以下をおすすめします。`xhigh` だと
考えている時間だけで一巡が終わり、目に見える返答が出ないことがあります。Hermes はこの
「途中で終わった一巡」の警告をスレッドには出さず、ゲートウェイのログに残すようになりました。
:::

---

## 手順 9: ボットをチャンネルに招く {#step-9-invite-the-bot-to-channels}

ゲートウェイを起動したら、応じてほしいチャンネルごとに**ボットを招く**必要があります。

```
/invite @Hermes Agent
```

ボットが自分からチャンネルに入ることは**ありません**。一つずつ招いてください。

---

## スラッシュコマンド {#slash-commands}

Hermes のコマンド（`/btw`、`/stop`、`/new`、`/model`、`/help` など）は、
すべて Slack 本来のスラッシュコマンドとして使えます。Telegram や Discord での
使い勝手とまったく同じです。Slack で `/` と打てば、Hermes のコマンドが説明つきで
候補に並びます。

裏側では、Hermes に同梱のマニフェスト（手順 1 の方法 A）が
[`COMMAND_REGISTRY`](https://github.com/NousResearch/hermes-agent/blob/main/hermes_cli/commands.py)
にあるコマンドをすべてスラッシュコマンドとして宣言しています。ソケットモードでは、
マニフェストの `url` の項目に関係なく、Slack が WebSocket 越しにコマンドのイベントを届けます。

### Agent としてのやりとり {#agent-messaging-experience}

新しい Slack アプリは Slack の **Agent** としてのやりとりを使います。すでにある
Assistant 版の Hermes アプリは、`--agent-view` を付けてマニフェストを作り直せば移行できます。

```bash
hermes slack manifest --agent-view --write
```

**Features → App Manifest** でマニフェストを更新し、Slack から求められたらアプリを入れ直します。
Agent 表示から Assistant 表示へ戻すことはできません。切り替えたあと、利用者は Slack を
強制的に読み込み直す必要があるかもしれません。作られる Agent 版のマニフェストは
`message.im`、`app_home_opened`、`app_context_changed` を受け取るので、Hermes は
メッセージタブでの DM を見分けられ、そのときに利用者が Slack で開いている場所も一巡ごとに受け取れます。
Hermes はそれを目印として渡すだけで、開いているチャンネルの履歴までは読みません。

### 更新後にスラッシュコマンドを入れ直す {#refreshing-slash-commands-after-updates}

Hermes に新しいコマンドが入ったとき（`hermes update` のあとなど）は、
マニフェストを作り直して Slack アプリを更新します。

```bash
hermes slack manifest --write
```

そのうえで Slack 側で次を行います。
1. [https://api.slack.com/apps](https://api.slack.com/apps) を開いて
   Hermes のアプリを選びます
2. **Features → App Manifest → Edit** と進みます
3. 新しい `~/.hermes/slack-manifest.json` の中身を貼ります
4. **Save** を押します。権限やスラッシュコマンドが変わっていれば、アプリを入れ直すよう
   Slack から促されます。

### 昔ながらの `/hermes <subcommand>` も使えます {#legacy-hermes-subcommand-still-works}

古いマニフェストとの互換のため、いまでも
`/hermes bg run the tests` と打てます。Hermes はこれを `/bg
run the tests` と同じように扱います。自由な質問も通ります。`/hermes what's the
weather?` はふつうのメッセージとして扱われます。

### スレッドの中でコマンドを使う（`!cmd` の書き方） {#using-commands-inside-threads-the-cmd-prefix}

Slack はスレッドの返信の中では本来のスラッシュコマンドを受け付けません。スレッドで
`/queue` と打つと、Slack が *「/queue is not supported
in threads. Sorry!」* と返します。これを有効に戻すアプリ側の設定はなく、
Slack が Hermes まで届けてくれません。

その代わりに、Hermes は先頭の `!` を別のコマンドの目印として認めます。これはスレッドの中でも
（それ以外の場所でも）使えます。ふつうのスレッドの返信として
`!queue`、`!stop`、`!model gpt-5.4` などと打つだけです。Hermes はスラッシュの形と
まったく同じに扱い、同じスレッドに返します。

コマンドかどうかを見るのは先頭の語だけなので、`!nice work` のような気軽な文はそのまま
エージェントへ渡ります。この書き方はメンションのうしろ（`@Hermes !stop`）でも、
先頭に空白があっても通ります。どちらもスレッドの中でコマンドとして扱われます。

危ない操作や `execute_code` の確認は、ふだんは押せるボタンとして出ます。
ボタンを出せずに Hermes が文字での確認に切り替えたときは、
`!approve` / `!deny` で答えるよう案内されます。スレッドの中で通る書き方だからです。

### スラッシュコマンドへの返事は自分にだけ見えます {#slash-replies-are-ephemeral}

本来のスラッシュコマンド（`/status`、`/help` など）への返事は、
**自分にだけ見える形**（「あなただけに表示されています」）で届きます。コマンドの出力で
チャンネルが埋まることはありません。「Running /cmd…」の仮表示は本当の返事に置き換わり、
長い返事は続きの見えないメッセージに分けられます。Slack 側の都合で 1 回のやりとりは 5 通までなので、
極端に長い出力は黙って切られるのではなく、切ったことをはっきり知らせて終わります。
最初の経路がうまくいかないときは、Hermes は別の「自分にだけ見える」経路で送り直します。
チャンネルに公開で投稿することは決してありません。（ふつうのメッセージとして打ったコマンド、
つまりスレッドでの `!cmd` や `@Hermes /cmd` には、いつもどおり全員に見える形で返します。）

### 聞き返しを一押しのボタンで {#clarify-prompts-one-tap-buttons}

エージェントが選択肢つきの質問をする必要があるとき（`clarify` の道具）、Slack では
**Block Kit のボタン**として表示されます。選択肢ごとに一押しで答えられ、
「✏️ Other…」のボタンを押すと自由記入に切り替わります（次に打ったメッセージが答えになります）。
押したあと、そのメッセージは誰が何を選んだかを示す形に書き換わります。同じ質問を
もう一度押しても無視されます。ボタンを押せるのはメッセージと同じ許可を持つ人だけで、
期限切れの質問（ゲートウェイの再起動や時間切れ）には、押しても黙って飲み込まずに
聞き直すよう案内が出ます。選択肢のない自由回答の聞き返しは、ふつうの質問として表示され、
次に打った返事を受け取ります。設定は要りません。`rich_blocks` の設定に関係なく動きます。

### 応用: スラッシュコマンドの配列だけを出す {#advanced-emit-only-the-slash-commands-array}

Slack のマニフェストを手で管理していて、スラッシュコマンドの一覧だけが欲しいときは
こうします。

```bash
hermes slack manifest --slashes-only > /tmp/slashes.json
```

出てきた配列を、いま使っているマニフェストの `features.slash_commands` の項目に貼ります。

---

## ボットはどう応じるか {#how-the-bot-responds}

場面ごとの Hermes のふるまいはこうなっています。

| 場面 | ふるまい |
|---------|----------|
| **DM** | すべてのメッセージに応じます。@ で呼ぶ必要はありません |
| **チャンネル** | **@ で呼ばれたときだけ**応じます（例: `@Hermes Agent what time is it?`）。チャンネルでは、そのメッセージにぶら下がるスレッドの中で返します。 |
| **スレッド** | すでにあるスレッドの中で @ で呼ぶと、同じスレッドの中で返します。ボットがそのスレッドで動いている間は、**続く返信で @ を付ける必要はありません**。会話の流れをそのまま追いかけます。 |

:::tip
チャンネルでは、まず @ で呼んで会話を始めてください。ボットがスレッドで動き出したあとは、そのスレッドの中では @ なしで返せます。スレッドの外では、@ のないメッセージは無視されます。人の多いチャンネルで騒がしくならないようにするためです。
:::

---

## 設定できること {#configuration-options}

手順 8 で入れた必須の環境変数のほかに、`~/.hermes/config.yaml` で Slack ボットのふるまいを細かく決められます。

### スレッドと返信のしかた {#thread-reply-behavior}

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

| 項目 | 既定値 | 説明 |
|-----|---------|-------------|
| `platforms.slack.reply_to_mode` | `"first"` | 分割されたメッセージのスレッドの付け方: `"off"`、`"first"`、`"all"` のいずれか |
| `platforms.slack.extra.reply_in_thread` | `true` | `false` にすると、チャンネルのメッセージにはスレッドではなくその場で返します。すでにあるスレッドの中では、これまでどおりスレッド内で返します。 |
| `platforms.slack.extra.reply_broadcast` | `false` | `true` にすると、スレッドの返信をチャンネル本体にも流します。流れるのは最初の一つ分だけです。 |
| `platforms.slack.extra.unfurl_links` | Slack の既定 | `false` にすると、押せるリンクは残したまま、リンク先の自動プレビューを止めます。どちらかの unfurl の項目を設定すると、メディアの説明文はファイルとは別のメッセージとして*先に*投稿され（Slack の送信 API がプレビューの指定を運べないためです）、下書きを流し込む送り方は書き換え方式に切り替わります。 |
| `platforms.slack.extra.unfurl_media` | Slack の既定 | `false` にすると、押せるリンクは残したまま、メディアの自動プレビューを止めます。説明文の順序と送り方についての注意は `unfurl_links` と同じです。 |
| `platforms.slack.extra.rich_blocks` | `false` | `true` にすると、エージェントのメッセージが [Block Kit](https://docs.slack.dev/block-kit/) の部品（見出し、区切り線、本物の入れ子の箇条書き、Slack 本来の表）として表示されます。通知や読み上げのために、文字だけの代替もいつも一緒に送られます。Slack の上限を超える表は、桁の揃った等幅の文字に戻ります。アプリを入れ直す必要はありません。送る側だけの変更です。 |
| `platforms.slack.extra.feedback_buttons` | `false` | `rich_blocks` と一緒に `true` にすると、最後の返信に Slack 本来の評価ボタンが付きます。 |
| `platforms.slack.extra.native_task_cards` | `false` | `true` にすると、進行中の道具の呼び出しが Slack 本来の計画・作業カードとして表示されます。これは Slack の既定である `tool_progress: off` とは別に、進み具合を出すことを自分で選ぶ設定です。Slack 側の呼び出しが失敗したときは、書き換え続ける文字のメッセージ一つに切り替わります。 |
| `platforms.slack.extra.suggested_prompts` | `[]` | Agent / Assistant の DM の入口に出す `{title, message}` を最大 4 つまで。配列でも `{title, prompts}` でも書けます。 |
| `platforms.slack.extra.assistant_thread_titles` | `true` | `true` にすると、Agent / Assistant の DM のスレッド名を最初の発言から付けます。 |
| `platforms.slack.extra.allow_bots` | `"none"` | ほかの Slack ボットからのメッセージの扱い: `"none"` は無視、`"mentions"` は**そのメッセージ自身**が Hermes を @ で呼んでいるときだけ受け付け、`"all"` はすべて受け付けます。ボット同士で組むなら `"mentions"` がいちばん安全です。[ほかのボットからのメッセージを受け付ける](#accepting-messages-from-other-bots-allow_bots) を参照してください。 |
| `platforms.slack.extra.api_human_users` | `[]` | **Web API（利用者トークン）からの投稿を人によるものとして扱う** Slack の利用者 ID。この種の投稿には投稿元の `app_id` が付き `client_msg_id` が付かないため、既定ではアプリからの通信として落とされます。`allow_bots: all` にする代わりに、自作の入口を使う人をここに並べてください。[自作アプリの利用者トークンによる投稿を人として扱う](#treating-your-own-apps-user-token-posts-as-human-api_human_users) を参照してください。 |
| `platforms.slack.extra.cron_continuable_surface` | `"thread"` | [続きを話せる cron ジョブ](/hermes/docs/user-guide/features/cron/#flat-in-channel-continuation-slack) の届け先。`"thread"` は届けるたびに専用のスレッドを開きます（既定）。`"in_channel"` はチャンネルの流れにそのまま届けます。`in_channel` を使うときは `reply_in_thread: false`（と `require_mention: false`）を組み合わせると、ふつうの返信で仕事を続けられます。 |

環境変数では `SLACK_ALLOW_BOTS=none|mentions|all` が同じ働きをします。
両方を設定した場合は `platforms.slack.extra.allow_bots` が優先されます。相手のボットが
はっきり呼ばれなくても答えてしまう場合、`all` は避けてください。相手側の返信の決まりしだいで
堂々巡りが起きます。

### 作業中の状態表示 {#working-state-status-line}

エージェントがメッセージを処理している間、Slack はスレッドのボット名の横に状態を出します。
Hermes は既定で `is thinking...` にしています。`typing_status_text` で変えられます。
たとえば Ada という名前の子猫のアシスタントならこうです。

```yaml
platforms:
  slack:
    # Custom working-state status line (default: "is thinking...").
    typing_status_text: "is pouncing… 🐾"
```

| 項目 | 既定値 | 説明 |
|-----|---------|-------------|
| `platforms.slack.typing_status_text` | `"is thinking..."` | エージェントがメッセージを処理している間に出る、作業中の状態の文言です。`assistant:write` の権限が要ります。これがないと状態の設定が黙って失敗し、ここに何を書いても Slack が用意した文言が出ます。状態表示そのものをやめたいときは `typing_indicator: false` にします。 |

:::note どこに表示されるか
自分で決めた文言が出るのは、**返信の入力欄の下**（「*BotName* is thinking…」）です。メッセージの並びの中ではありません。AI のアプリが動いている間にメッセージの領域に出る「Generating response…」「Finding answers…」といった行は、**Slack が自分で入れ替えて出している表示**です。`assistant.threads.setStatus` からは操作できず、両方が同時に出ることもあります。
:::

同じ項目で、Google Chat の作業中の目印のメッセージも変えられます
（`platforms.google_chat.typing_status_text`、既定は `"Hermes is thinking…"`）。
ただし Google Chat では、これは実際に投稿されて返答に書き換えられるメッセージで、
一時的な状態表示ではありません。

### 進み具合のこまかい表示（道具ごと） {#live-status-per-tool}

既定では、状態の行は**エージェントの作業に合わせて動きます**。ずっと `is thinking...` と
出したままにせず、いま何をしているかを見せます。`is
running pytest tests/…`、`is reading docs/api.md…`、`is searching the web for
slack api limits…` といった具合です。道具と道具の間では、決まった文言に戻ります。
もともとの状態更新の間隔に乗っているだけなので、Slack への呼び出しは増えません。
`tool_progress: off`（Slack の既定）でも動きます。進み具合の吹き出しとは違い、
状態の行は一時的なもので、チャンネルには何も残しません。

`display.live_status`（全体でも、プラットフォームごとでも）で決められます。

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

| 項目 | 既定値 | 説明 |
|-----|---------|-------------|
| `display.live_status` | `"full"` | 道具ごとの状態表示です。`full` は動作とその中身まで出し、`verb` は動作だけを出します（ファイルのパスやコマンドを共有の場に出しません）。`off` は決まった文言に戻します。決まった文言の場合と同じく `assistant:write` の権限が要ります。 |

### Slack 本来の流し込み（打っているように見える返信） {#native-streaming-live-typing-replies}

Slack の [Agents & AI Apps](https://docs.slack.dev/ai/) には、返答をその場で打っているように
見せる仕組み（`chat.startStream` / `chat.appendStream` /
`chat.stopStream`）があります。書き換えを重ねるやり方より、ずっと滑らかです。
`streaming.enabled` が有効（transport が `auto` か `draft`）なら、Hermes は使える場面で
自動的にこの仕組みを使います。

- 最初の一片で流し始め、あとは差分だけを足していきます（この API は足すことしかできません）。
  流し込まれたメッセージが**そのまま**最終のメッセージになります。Hermes は `chat.stopStream` で
  それを締めるだけで、同じ内容をもう一度投稿することはありません。
- Slack アプリ側で AI の機能が有効になっていない（または `assistant:write` の権限がない）ときは、
  最初の失敗を覚えておき、書き換え方式に切り替えます。直し方を書いたログが一度だけ出ます。
- 自分で選んだ Block Kit（`rich_blocks: true`）は、締めたメッセージにも適用されます。
  書き換え方式で仕上げるときと同じです。

流し込みを有効にすること以外に、設定は要りません。

```yaml
streaming:
  enabled: true       # transport auto/draft lights up Slack native streaming
```

### Slack 本来の作業カード（道具の進み具合） {#native-task-cards-live-tool-progress}

`platforms.slack.extra.native_task_cards: true` にすると、進行中の道具の呼び出しが
文字の吹き出しではなく Slack 本来の**計画・作業カード**（Slack 自身の AI 機能と同じ見た目）として
表示されます。一巡につきカード一つ、道具の呼び出しごとに行が一つ並び、
実行中・完了・エラーの状態がその場で書き換わります。

```yaml
platforms:
  slack:
    extra:
      native_task_cards: true
```

- これは進み具合を出すことを自分で選ぶ設定です。Slack の既定が `tool_progress: off` でも動きます
  （文字の吹き出しはチャンネルを埋めますが、このカードは埋めません）。
- 同じ道具を同時に呼んだときも、本物の呼び出し ID で結び付けられます。並行して走る
  `web_search` は、それぞれが自分の行と正しい状態を持ちます。
- 流し込みを始められない、または更新できないときは、書き換え続ける文字のメッセージ一つに
  切り替わるので、その一巡の間も進み具合は見え続けます。
- カードの流し込みは、一巡が終わるときにちょうど一度だけ止まります。途中で止めたときや
  接続が切れたときも同じで、動いたままの表示が残ることはありません。

### セッションの切り分け {#session-isolation}

```yaml
# Global setting — applies to Slack and all other platforms
group_sessions_per_user: true
```

`true`（既定）のときは、共有のチャンネルでも利用者ごとに別々の会話になります。`#general` で二人が Hermes に話しかけても、履歴も文脈も別々です。

チャンネル全体で一つの会話を共有したいときは `false` にします。その場合、文脈の伸びもトークンの費用も皆で分け合うことになり、誰か一人の `/reset` で全員のセッションが消えます。

### 呼びかけと反応のしかた {#mention-trigger-behavior}

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
人の多いワークスペースで、Slack の既定である「ボットがこのスレッドを覚えている」ふるまいが驚かれるときは `true` にしてください。たとえば、長く続いた技術サポートのスレッドで、最初のうちボットが手伝ったあとは、もう一度はっきり呼ばれるまで黙っていてほしい、という場面です。DM と、いま動いているやりとりには影響しません。
:::

:::tip `ignore_other_user_mentions` を使う場面
ボットが人の多いスレッドを追いかけていて（スレッドの自動参加や `free_response_channels` によって）、人どうしのやりとりに割り込んでしまうときは `true` にしてください。`strict_mention` より狭い道具です。参加しているスレッドでのふつうの続きには、これまでどおり答えます。飛ばされるのは、ほかの人を @ で呼んで始まるメッセージだけです。**1 対 1 の DM には影響しません**。グループ DM（MPIM）とチャンネルにはどちらも適用され、下に書いた共有の場としての扱いに合わせてあります。`@here` や `@channel` のような全体への呼びかけやチャンネルの参照は、人ではなく場に向けたものなので、飛ばされることはありません。
:::

:::info
Slack ではどちらのやり方も使えます。既定では会話を始めるのに `@mention` が要りますが、`SLACK_FREE_RESPONSE_CHANNELS`（チャンネル ID をカンマ区切りで）か `config.yaml` の `slack.free_response_channels` で、特定のチャンネルだけ外せます。ボットがスレッドで動き出したあとは、続く返信に呼びかけは要りません。**1 対 1 の DM** では、呼びかけなしでいつも応じます。
:::

:::caution グループ DM（MPIM）は共有の場であり、1 対 1 の DM ではありません
**1 対 1 のダイレクトメッセージ**は相手が一人の私的な会話なので、呼びかけは免除されます。**グループ DM（MPIM・複数人の DM）**は*共有の場*です。複数の人がボットを見られ、動かせるので、チャンネルと同じ設定に従います。`require_mention`、`strict_mention`、`free_response_channels`、`allowed_channels` はすべて効きますし、`:eyes:` や `:white_check_mark:` の反応を付けるのも実際に `@mentioned` されたときだけです。特定のグループ DM で自由に応じさせたいときは、そのチャンネル ID（`G` で始まります）を `free_response_channels` に足してください。
:::

#### どの呼びかけの設定を選ぶか {#which-mention-option-do-i-want}

これらの設定は組み合わせて使えます。それぞれが別の問いに答えます。

| 設定 | 答える問い | 既定値 | 効く範囲 |
|--------|--------------------|---------|-------|
| `require_mention` | **チャンネルの通常のメッセージ**に @ が要るか | `true` | すべてのチャンネル |
| `free_response_channels` | どのチャンネルを `require_mention` から外すか | なし | 挙げたチャンネル |
| `require_mention_channels` | `require_mention` が `false` でも、自由応答のチャンネルでも、どこは必ず @ を要るようにするか。両方に優先します。 | なし | 挙げたチャンネル |
| `thread_require_mention` | 通常のメッセージには要らなくても、**スレッドの返信**には @ を要るようにするか。呼ばれたスレッドを覚えません。 | `false` | スレッドだけ |
| `strict_mention` | **すべての**チャンネルのメッセージ（通常もスレッドも）に、その都度 @ を要るようにするか。自動で追いかける動きをすべて止めます。呼ばれたスレッドの記憶、ボットの発言への続き、動いているセッションの再開、いずれもです。 | `false` | すべてのチャンネルとスレッド |
| `ignore_other_user_mentions` | **ほかの人を @ で呼んで始まる**メッセージ（`@rasha can you take this?`）を飛ばすか。自由応答とスレッドの自動追跡に優先します。文の途中での言及はこれまでどおり届きます。 | `false` | チャンネルとグループ DM |

目安はこうです。`strict_mention` がいちばん大きな手当てで、`thread_require_mention` は通常のメッセージの扱いを変えずに賑やかなスレッドだけを静かにします。`require_mention_channels` は、ふだんは自由に応じるボットの中で特定のチャンネルだけ引き締めます。`ignore_other_user_mentions` が飛ばすのは、ほかの人にはっきり向けられたメッセージだけです。1 対 1 の DM はいつも応じ、これらの設定の影響を受けません。

### ほかのボットからのメッセージを受け付ける（`allow_bots`） {#accepting-messages-from-other-bots-allowbots}

既定では、Hermes はほかの Slack ボットやアプリが書いたメッセージをすべて無視します（Workflow Builder の投稿も含みます）。エージェントが何体もいるワークスペース、たとえば複数の Hermes や相手のボットが一つのチャンネルで組む場合は、`allow_bots` で受け付けるようにします。

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

環境変数では `SLACK_ALLOW_BOTS=none|mentions|all` です（両方あるときは設定ファイルが勝ちます）。知らない値は `none` として扱われます。

`mentions` はこう働きます。

- 相手のボットのメッセージを受け付けるのは、**そのメッセージ自身が、いまこのボットを `@mention` しているときだけ**です。本文でも Block Kit の部品の中でも構いません。スレッドの履歴は数に入りません。そのスレッドで前に呼ばれていたこと、ボット自身の発言への返信、動いているスレッドのセッション、いずれも、あとから来た呼びかけのないボットのメッセージを通す理由には**なりません**。これは意図した設計で、エージェント同士が確認と状態報告を延々と繰り返すのを断ち切るためです。
- 人のメッセージには影響しません。そちらはふつうの呼びかけの決まりに従います。
- Hermes はどの設定でも自分の発言を必ず無視します。自分の声を拾って回り続けないためです。

ボット同士で組むなら `mentions` がおすすめです。一巡ごとに、相手をはっきり呼ぶ必要があるからです。相手のボットの返信の決まりが堂々巡りを起こさないと分かっているとき以外、`all` は避けてください。何にでも答える二体は、永遠に答え合い続けます。見分けの対象は、印の付いたボットのメッセージ（`bot_id`、`subtype: bot_message`）、アプリから来たイベント、印のないボットの*利用者*（`users.info` で確かめます）まで及ぶので、相手が Hermes でもワークスペースをまたいで同じように扱われます。

複数のボットを厳しく運用するなら、`require_mention: true` と `strict_mention: true` を組み合わせてください。下の点検用の設定を参照してください。

### 自作アプリの利用者トークンによる投稿を人として扱う（`api_human_users`） {#treating-your-own-apps-user-token-posts-as-human-apihumanusers}

**利用者トークン**（`xoxp-`）を使って Web API から投稿されたメッセージは、
実際には人が書いたものですが、投稿元の `app_id` が付き `client_msg_id` が付きません。
これは Hermes がアプリからの投稿を見分けるときの印と同じなので、ボットの通信として落とされます。
そのせいで、よくある使い方が塞がれます。自作の入口（社内のダッシュボード、モバイルの外側、
受付端末など）から、ログインしている本人*として* Hermes にメッセージを送る、という形です。

`allow_bots: all` にすればこれらは通りますが、そのチャンネルにいるすべてのボットにも道を開き、
堂々巡りへの備えが弱くなります。代わりに、自作の入口を使う人だけを並べてください。

```yaml
platforms:
  slack:
    extra:
      api_human_users: ["U0AAAAAAA", "U0BBBBBBB"]
```

環境変数では `SLACK_API_HUMAN_USERS` が同じ働きをします（カンマ区切りです）。

効く範囲と安全について:

- 並べられるのは**利用者だけ**です。アプリ ID を並べる書き方は、あえて用意していません。
  いまどきのボットトークン（`xoxb-`）も同じ `user` と `app_id` の形で投稿するので、
  アプリを信頼するとそのボット自身の投稿まで通ってしまい、堂々巡りへの備えが崩れます。
- `bot_id` や `subtype: bot_message` を持つイベント、`user` がまったくないイベントは、
  この一覧に関係なくいつもボットの投稿として扱われます。
- そのあとの流れは変わりません。呼びかけの決まり、`allowed_channels`、
  `SLACK_ALLOWED_USERS` は、（人として扱われるようになった）差出人にもそのまま効きます。

### 絵文字の反応で動かす（`reaction_triggers`） {#reaction-triggers-reactiontriggers}

既定では、絵文字の反応は受け取ったうえで捨てられます。ボットのメッセージに 👍 を付けても
何も起きません。反応をエージェントへ渡したいときは `slack.reaction_triggers` を設定します
（`reactions:read` の権限と、Slack アプリのマニフェストでの
`reaction_added` / `reaction_removed` の受け取り設定が要ります。`hermes slack manifest` で
作り直してください）。

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

環境変数では `SLACK_REACTION_TRIGGERS`（`true` / `all` かカンマ区切りの一覧）と
`SLACK_REACTION_TRIGGER_TARGET` が同じ働きをします。

どう動くか:

- 反応は、`reaction:added:👍` / `reaction:removed:👍` という本文のふつうの一巡として届きます
  （よく使われる Slack の名前は絵文字に置き換えられ、知らない名前はそのまま渡ります。
  たとえば `reaction:added:custom-emoji` です）。反応が付いたメッセージの下に
  ぶら下がるので、エージェントは何に対する反応かが分かり、返信と同じセッションに収まります。
- 反応した人がそのメッセージの発言者として扱われるので、**利用者の許可と
  `allowed_channels` の絞り込みが、打ったメッセージとまったく同じように効きます**。
  たまたま見かけた人の反応で、その人が発言できない場所のエージェントが動くことはありません。
- `reaction_triggers: true` のときに渡されるのは、ボット**自身**のメッセージへの反応だけです
  （承認や確認の流れ向けです）。絵文字を並べて指定したときは、その絵文字ならどのメッセージからでも渡されます。
- ボット自身が付ける動作の反応（`:eyes:` など）が返ってくることはありません。
- この設定とは別に、人が付けた反応はすべて
  `reaction:added` / `reaction:removed` の [ゲートウェイのフック](/hermes/docs/user-guide/features/hooks/#available-events)
  を呼びます。エージェントを動かさずに見ているだけの用途に使えます。

### エージェント同士の点検 {#peer-agent-smoke-check}

一巡ごとの呼びかけを厳しくして複数のボットを動かす場合は、次の設定をそのまま使ってください。

```yaml
slack:
  require_mention: true
  strict_mention: true
  allow_bots: mentions
  allowed_channels: ""
```

ゲートウェイの設定変更・配備・再起動のあとは、この点検を実行します。

```bash
uv run --frozen pytest -q tests/gateway/test_slack_peer_agent_smoke.py -o addopts=''
```

この点検は、その場で作った疑似的な Slack のイベントだけを使います。実際に Slack へメッセージを送ることはなく、既定では本物のボットトークンも要りません。

失敗したときの読み方:

- `config:` — `test_peer_agent_smoke_preflight_contract` が設定の食い違い（`require_mention`、`strict_mention`、`allow_bots`、`allowed_channels`）を見つけました。
- `platform_connectivity:` — アダプターやクライアントが立ち上がっておらず、振り分けの点検結果はまだ当てになりません。
- `bot_identity:` — アダプターがボット自身の利用者 ID を解決できておらず、いまのメッセージに対する呼びかけの判定ができません。
- `routing_logic:` — Slack のアダプターが、エージェント同士の前提のどれかを壊しました（人からの呼びかけの振り分け、相手のボットの無視、はっきり呼ばれた相手のボットの受け入れ、受け身の確認・状態・エラーの抑制）。

これが通るのに実際のワークスペースでメッセージの行き先がおかしいなら、振り分けの仕組みそのものではなく、Slack のトークンやワークスペースへの接続、配備の状態を調べてください。

### チャンネルの許可リスト（`allowed_channels`） {#channel-allowlist-allowedchannels}

ボットが応じるチャンネルを決まった範囲に絞ります。たくさんのチャンネルに招かれているけれど、応じてほしいのは一部だけ、という場合に役立ちます。設定すると、この一覧にないチャンネルからのメッセージは、たとえ `@mentioned` されていても**黙って無視されます**。

**1 対 1 の DM はこの絞り込みの対象外**なので、許可された人はいつでも DM でボットに話しかけられます。**グループ DM（MPIM）は対象外ではありません**。チャンネルと同じく、その ID（`G` で始まります）が一覧になければメッセージは落とされます。

```yaml
slack:
  allowed_channels:
    - "C0123456789"   # #ops
    - "C0987654321"   # #incident-response
```

環境変数でも書けます（カンマ区切りです）。

```bash
SLACK_ALLOWED_CHANNELS="C0123456789,C0987654321"
```

どう動くか:

- 空か未設定 → 絞り込みなし（これまでどおりに動きます）。
- 中身がある → チャンネル ID が一覧になければ、ほかのどの判定（呼びかけの要否、`free_response_channels` など）よりも先に落とされます。
- Slack のチャンネル ID は `C`（公開）、`G`（非公開）、`D`（DM）で始まります。Slack の画面で「チャンネル詳細を開く」→「概要」から、または API から調べられます。

あわせて読む: [管理者と利用者のスラッシュコマンドの分け方](/hermes/docs/reference/slash-commands/#permissions-and-adminuser-split)。

### 許可していない人への応じ方 {#unauthorized-user-handling}

```yaml
slack:
  # What happens when an unauthorized user (not in SLACK_ALLOWED_USERS) DMs the bot
  # "pair"   — prompt them for a pairing code (default)
  # "ignore" — silently drop the message
  unauthorized_dm_behavior: "pair"
```

すべてのプラットフォームに対してまとめて決めることもできます。

```yaml
unauthorized_dm_behavior: "pair"
```

`slack:` の下に書いた個別の設定は、全体の設定より優先されます。

### 音声の文字起こし {#voice-transcription}

```yaml
# Global setting — enable/disable automatic transcription of incoming voice messages
stt_enabled: true
```

`true`（既定）のときは、届いた音声のメッセージが、エージェントに渡される前に設定済みの文字起こしの提供元で自動的に文字になります。

### 設定のひととおりの例 {#full-example}

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

`SLACK_HOME_CHANNEL` にチャンネル ID を設定すると、Hermes は予定していたメッセージ、
cron ジョブの結果、そのほか自分から出す知らせをそこへ届けます。チャンネル ID の調べ方:

1. Slack でチャンネル名を右クリックします
2. **View channel details** を押します
3. いちばん下まで下がると、チャンネル ID が書かれています

```bash
SLACK_HOME_CHANNEL=C01234567890
```

そのチャンネルに**ボットを招いてある**か確かめてください（`/invite @Hermes Agent`）。

### cron の届け先を決める {#cron-delivery-targeting}

cron ジョブ（[cron の案内](/hermes/docs/user-guide/features/cron/#delivery-options) を参照）は、Slack への届け方を三つから選べます。

| `deliver:` の値 | 届く先 |
|------------------|----------------|
| `slack` | ホームチャンネル（`SLACK_HOME_CHANNEL`） |
| `slack:C0123456789` | ID で指定したチャンネル |
| `slack:U0123456789` | その人の **DM**。利用者 ID だけを書けば、自動で DM の会話に解決されます（`im:write` の権限が要ります） |

cron の処理がゲートウェイと同じ場所で動いていなくても届きます。Hermes は `SLACK_BOT_TOKEN` を使う単独の Web API の送り手に切り替えます。cron の出力に `MEDIA:` の添付があれば、同じ届け先に Slack 本来のファイルとして上がります。

### メッセージとファイルを送る（`send_message`） {#sending-messages-and-media-sendmessage}

エージェントの `send_message` という道具も、同じ形の届け先を受け付けます。チャンネル ID（`C…` / `G…`）、DM の会話（`D…`）、利用者 ID だけ（`U…` / `W…`）のいずれかです。最後のものは、文字・ファイル・確認の問いかけのどの送り方でも、その人の DM に解決されます。`MEDIA:<path>` の添付（画像・PDF・書類）は Slack 本来のファイルとして上がります。添付が一つで、短い文が添えられているときは、別のメッセージにせずファイルの説明文として一緒に届きます。見つからないファイルは、送信全体を失敗させずに、そのファイルごとの注意として知らされます。

---

## 複数のワークスペースに対応する {#multi-workspace-support}

Hermes は、一つのゲートウェイから**複数の Slack ワークスペース**に同時につなげます。ワークスペースごとに別々のボット利用者 ID で認証されます。

### 設定 {#configuration}

`SLACK_BOT_TOKEN` に複数のボットトークンを**カンマ区切り**で並べます。

```bash
# Multiple bot tokens — one per workspace
SLACK_BOT_TOKEN=xoxb-workspace1-token,xoxb-workspace2-token,xoxb-workspace3-token

# A single app-level token is still used for Socket Mode
SLACK_APP_TOKEN=xapp-your-app-token
```

`~/.hermes/config.yaml` でも書けます。

```yaml
platforms:
  slack:
    token: "xoxb-workspace1-token,xoxb-workspace2-token"
```

### OAuth のトークンファイル {#oauth-token-file}

環境変数や設定ファイルのトークンに加えて、Hermes は次の場所にある **OAuth のトークンファイル**からもトークンを読みます。

```
~/.hermes/slack_tokens.json
```

このファイルは、チーム ID とトークンの情報を結び付けた JSON です。

```json
{
  "T01ABC2DEF3": {
    "token": "xoxb-workspace-token-here",
    "team_name": "My Workspace"
  }
}
```

ここのトークンは `SLACK_BOT_TOKEN` で指定したものと合わせて使われます。重なったトークンは自動的にまとめられます。

### どう動くか {#how-it-works}

- 並べたうちの**最初のトークン**が主のトークンで、ソケットモードの接続（AsyncApp）に使われます。
- 起動時に、それぞれのトークンが `auth.test` で認証されます。ゲートウェイは `team_id` ごとに専用の `WebClient` と `bot_user_id` を持ちます。
- メッセージが届くと、Hermes はそのワークスペースに合ったクライアントを使って返します。
- 主の `bot_user_id`（最初のトークンのもの）は、ボットが一つであることを前提にした機能との互換のために使われます。

---

## 音声のメッセージ {#voice-messages}

Hermes は Slack でも音声を扱えます。

- **受け取り:** 音声のメッセージは、設定済みの文字起こしの提供元で自動的に文字になります。手元で動く `faster-whisper`、Groq の Whisper（`GROQ_API_KEY`）、OpenAI の Whisper（`VOICE_TOOLS_OPENAI_KEY`）のいずれかです
- **送り出し:** 読み上げの返答は、音声ファイルの添付として送られます

---

## チャンネルごとの指示 {#per-channel-prompts}

特定の Slack チャンネルに、その場限りのシステムの指示を割り当てられます。指示は一巡ごとに実行時に差し込まれ、会話の記録には残りません。書き換えればすぐに効きます。

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

見出しに書くのは Slack のチャンネル ID です（チャンネル詳細 →「概要」の下の方で調べられます）。そのチャンネルのすべてのメッセージに、その場限りのシステムの指示として差し込まれます。

## チャンネルごとのスキルの割り当て {#per-channel-skill-bindings}

特定のチャンネルや DM で新しいセッションが始まるたびに、スキルを自動で読み込ませられます。一巡ごとに差し込まれるチャンネルごとの指示とは違い、こちらはスキルの中身を**セッションの始まり**に利用者の発言として差し込みます。会話の履歴の一部になるので、次の一巡から読み直す必要はありません。

用途がはっきりした DM やチャンネル（単語カード、特定分野の質問応答、問い合わせの振り分けなど）で、短い返信のたびにモデル自身にスキルを読むかどうか決めさせたくないときに向いています。

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

覚えておくこと:
- 割り当てはチャンネル ID で決まります。割り当てのあるチャンネルのスレッドは、親のチャンネルの割り当てを引き継ぎます。
- スキルが読まれるのはセッションの始まりだけです（新しいセッション、または自動でやり直したあと）。割り当てを変えたときは、`/new` を実行するか、セッションが自動でやり直されるのを待つと効きます。
- `channel_prompts` と組み合わせると、スキルの指示の上にチャンネルごとの口調や制約を重ねられます。

## うまくいかないとき {#troubleshooting}

| 症状 | 対処 |
|---------|----------|
| DM に応じない | 受け取るイベントに `message.im` が入っているか、アプリを入れ直したかを確かめます |
| DM では動くのにチャンネルで動かない | **いちばん多いつまずきです。** 受け取るイベントに `message.channels` と `message.groups` を足し、アプリを入れ直したうえで、`/invite @Hermes Agent` でチャンネルに招きます |
| チャンネルで @ で呼んでも応じない | 1) `message.channels` のイベントを受け取る設定になっているか。2) ボットがそのチャンネルに招かれているか。3) `channels:history` の権限があるか。4) 権限やイベントを変えたあとにアプリを入れ直したか |
| 非公開チャンネルのメッセージを無視する | `message.groups` のイベントと `groups:history` の権限を両方足し、アプリを入れ直して `/invite` で招きます |
| グループ DM（複数人の DM）で応じない | `message.mpim` のイベントと `mpim:history` の権限（それに `mpim:read`）を足し、アプリを**入れ直します**。`message.mpim` がないと、1 対 1 の DM が動いていても、Slack はグループ DM のメッセージをボットに届けません。 |
| DM で「Sending messages to this app has been turned off」と出る | App Home の設定で**メッセージタブ**を有効にします（手順 5） |
| 「not_authed」や「invalid_auth」のエラーが出る | ボットトークンとアプリトークンを作り直し、`.env` を更新します |
| 応じるのにチャンネルへ投稿できない | `/invite @Hermes Agent` でボットをチャンネルに招きます |
| 会話はできるのに上げた画像やファイルを読めない | `files:read` を足して、アプリを**入れ直します**。Slack が権限や認証の失敗を返したときは、添付を読めない理由がチャットの中に出るようになりました。 |
| `missing_scope` のエラーが出る | OAuth & Permissions で足りない権限を足し、アプリを**入れ直します** |
| ソケットがよく切れる | ネットワークを確かめてください。Bolt は自動でつなぎ直しますが、不安定な回線では遅れが出ます |
| 権限やイベントを変えたのに何も変わらない | 権限やイベントの設定を変えたら、ワークスペースにアプリを**入れ直す必要があります** |

### 手早い確認 {#quick-checklist}

チャンネルでボットが動かないときは、次を**すべて**確かめてください。

1. ✅ `message.channels` のイベントを受け取る設定になっている（公開チャンネル用）
2. ✅ `message.groups` のイベントを受け取る設定になっている（非公開チャンネル用）
3. ✅ `app_mention` のイベントを受け取る設定になっている
4. ✅ `channels:history` の権限を足してある（公開チャンネル用）
5. ✅ `groups:history` の権限を足してある（非公開チャンネル用）
6. ✅ 権限やイベントを足したあとにアプリを**入れ直した**
7. ✅ ボットをチャンネルに**招いた**（`/invite @Hermes Agent`）
8. ✅ メッセージの中でボットを **@ で呼んでいる**

---

## 安全に使うために {#security}

:::warning
**`SLACK_ALLOWED_USERS` は必ず設定してください。**許可する人のメンバー ID を並べます。設定しないと、
安全のためにゲートウェイは**すべてのメッセージを拒みます**。ボットのトークンは決して人に渡さないでください。
パスワードと同じ扱いです。
:::

- トークンは `~/.hermes/.env` に保存します（ファイルの権限は `600`）
- Slack アプリの設定から、ときどきトークンを作り直します
- Hermes の設定ディレクトリに誰が触れるかを見直します
- ソケットモードなら公開の受け口を持たずに済みます。狙われる面が一つ減ります
