---
title: "チュートリアル: チームで使う Telegram アシスタント"
description: "コードの相談、調べもの、サーバー管理などをチーム全員で頼める Telegram ボットの作り方を、順を追って説明します"
upstream_path: guides/team-telegram-assistant.md
upstream_blob: 3b168eb4caf49527624672fadb5f3b716345f9f5
sources:
  - https://hermes-agent.nousresearch.com/docs/guides/team-telegram-assistant
---

# チームで使う Telegram アシスタントを立ち上げる {#set-up-a-team-telegram-assistant}

このチュートリアルでは、Hermes Agent を動力にした Telegram ボットを、チームの複数のメンバーが使える形で立ち上げます。作り終えるころには、コード、調べもの、サーバー管理、その他なんでも相談できる共用の AI アシスタントが、利用者ごとの認可付きでチームの手元にあります。

## 何を作るか {#what-were-building}

こんな Telegram ボットです。

- **許可されたメンバーなら誰でも** DM で相談できます。コードレビュー、調べもの、シェルのコマンド、デバッグ
- **自分のサーバーで動き**、ツールを一通り使えます。ターミナル、ファイル編集、Web 検索、コード実行
- **利用者ごとのセッション** — それぞれが自分の会話の文脈を持ちます
- **標準で安全** — やり取りできるのは承認済みの利用者だけで、認可の方法は 2 通りあります
- **予約実行** — 日々の進捗共有、状態確認、リマインドをチームのチャンネルへ届けます

---

## 前提 {#prerequisites}

始める前に、次が揃っていることを確かめてください。

- **Hermes Agent をサーバーか VPS にインストール済みであること**（手元のノート PC ではなく。ボットは動き続ける必要があります）。まだなら [installation guide](/hermes/docs/getting-started/installation/) に従ってください。
- **自分用の Telegram アカウント**（ボットの持ち主として）
- **LLM プロバイダの設定** — 最低限、OpenAI、Anthropic、あるいは対応する他のプロバイダの API キーを `~/.hermes/.env` に置いてください

:::tip
ゲートウェイを動かすだけなら、月 5 ドルの VPS で十分です。Hermes 自体は軽く、お金がかかるのは LLM の API 呼び出しのほうで、それは遠隔で行われます。
:::

---

## ステップ 1: Telegram のボットを作る {#step-1-create-a-telegram-bot}

Telegram のボットづくりは、いつも **@BotFather** から始まります。ボットを作るための、Telegram 公式のボットです。

1. **Telegram を開いて** `@BotFather` を検索するか、[t.me/BotFather](https://t.me/BotFather) を開きます

2. **`/newbot` を送ります** — BotFather が 2 つのことを聞いてきます:
   - **表示名** — 利用者に見える名前です（例: `Team Hermes Assistant`）
   - **ユーザー名** — 末尾が `bot` である必要があります（例: `myteam_hermes_bot`）

3. **ボットのトークンを控えます** — BotFather がこんな返事をよこします:
   ```
   Use this token to access the HTTP API:
   7123456789:AAH1bGciOiJSUzI1NiIsInR5cCI6Ikp...
   ```
   このトークンは次のステップで使うので、保存しておいてください。

4. **説明文を設定します**（任意ですが、しておくと親切です）:
   ```
   /setdescription
   ```
   自分のボットを選び、こんな文言を入れます:
   ```
   Team AI assistant powered by Hermes Agent. DM me for help with code, research, debugging, and more.
   ```

5. **コマンドを登録します**（任意 — 利用者にコマンドのメニューが出ます）:
   ```
   /setcommands
   ```
   自分のボットを選び、これを貼り付けます:
   ```
   new - Start a fresh conversation
   model - Show or change the AI model
   status - Show session info
   help - Show available commands
   stop - Stop the current task
   ```

:::warning
ボットのトークンは他人に見せないでください。トークンを持つ人は誰でもボットを操作できます。漏れてしまったら、BotFather で `/revoke` を実行して新しいものを発行します。
:::

---

## ステップ 2: ゲートウェイを設定する {#step-2-configure-the-gateway}

方法は 2 つあります。対話式の設定ウィザード（おすすめ）か、手作業での設定です。

### 選択肢 A: 対話式の設定（おすすめ） {#option-a-interactive-setup-recommended}

```bash
hermes gateway setup
```

矢印キーで選びながら、必要なことを一通り済ませられます。**Telegram** を選び、ボットのトークンを貼り、聞かれたら自分のユーザー ID を入れてください。

### 選択肢 B: 手作業での設定 {#option-b-manual-configuration}

`~/.hermes/.env` に次の行を足します。

```bash
# Telegram bot token from BotFather
TELEGRAM_BOT_TOKEN=7123456789:AAH1bGciOiJSUzI1NiIsInR5cCI6Ikp...

# Your Telegram user ID (numeric)
TELEGRAM_ALLOWED_USERS=123456789
```

### 自分のユーザー ID を調べる {#finding-your-user-id}

Telegram のユーザー ID は数値です（ユーザー名ではありません）。調べ方はこうです。

1. Telegram で [@userinfobot](https://t.me/userinfobot) にメッセージを送ります
2. すぐに、数値のユーザー ID が返ってきます
3. その数字を `TELEGRAM_ALLOWED_USERS` に書き写します

:::info
Telegram のユーザー ID は `123456789` のような変わらない数値です。あとから変えられる `@username` とは別のものです。許可リストには必ず数値の ID を使ってください。
:::

---

## ステップ 3: ゲートウェイを起動する {#step-3-start-the-gateway}

### まずは試し打ち {#quick-test}

まずはゲートウェイをフォアグラウンドで動かし、一通り動くことを確かめます。

```bash
hermes gateway
```

こんな出力が見えるはずです。

```
[Gateway] Starting Hermes Gateway...
[Gateway] Telegram adapter connected
[Gateway] Cron scheduler started (tick every 60s)
```

Telegram を開いて自分のボットを探し、メッセージを送ってみてください。返事があれば成功です。`Ctrl+C` で止められます。

### 本番運用: サービスとして入れる {#production-install-as-a-service}

再起動しても動き続ける形にするには、次のようにします。

```bash
hermes gateway install
sudo hermes gateway install --system   # Linux only: boot-time system service
```

これでバックグラウンドのサービスができます。Linux では標準でユーザー単位の **systemd** サービス、macOS では **launchd** のサービス、`--system` を付けた場合は Linux の起動時に立ち上がるシステムサービスになります。

```bash
# Linux — manage the default user service
hermes gateway start
hermes gateway stop
hermes gateway status

# View live logs
journalctl --user -u hermes-gateway -f

# Keep running after SSH logout
sudo loginctl enable-linger $USER

# Linux servers — explicit system-service commands
sudo hermes gateway start --system
sudo hermes gateway status --system
journalctl -u hermes-gateway -f
```

```bash
# macOS — manage the service
hermes gateway start
hermes gateway stop
tail -f ~/.hermes/logs/gateway.log
```

:::tip macOS の PATH
launchd の plist は、インストール時のシェルの PATH を取り込みます。ゲートウェイの子プロセスが Node.js や ffmpeg といったツールを見つけられるようにするためです。あとから新しいツールを入れたときは、`hermes gateway install` を実行し直して plist を更新してください。
:::

### 動いていることを確かめる {#verify-its-running}

```bash
hermes gateway status
```

そのうえで、Telegram のボットにテストのメッセージを送ってみてください。数秒のうちに返事が来るはずです。

---

## ステップ 4: チームからの利用を許可する {#step-4-set-up-team-access}

では、同僚が使えるようにしましょう。やり方は 2 通りあります。

### やり方 A: 固定の許可リスト {#approach-a-static-allowlist}

メンバーそれぞれの Telegram のユーザー ID を集め（[@userinfobot](https://t.me/userinfobot) にメッセージを送ってもらいます）、カンマ区切りで並べます。

```bash
# In ~/.hermes/.env
TELEGRAM_ALLOWED_USERS=123456789,987654321,555555555
```

変更したらゲートウェイを再起動します。

```bash
hermes gateway stop && hermes gateway start
```

### やり方 B: DM ペアリング（チームにはこちらがおすすめ） {#approach-b-dm-pairing-recommended-for-teams}

DM ペアリングのほうが融通が利きます。ユーザー ID を前もって集める必要がありません。仕組みはこうです。

1. **同僚がボットに DM を送る** — 許可リストに載っていないので、ボットは使い捨てのペアリングコードを返します:
   ```
   🔐 Pairing code: XKGH5N7P
   Send this code to the bot owner for approval.
   ```

2. **同僚がそのコードをあなたに渡します**（Slack、メール、直接など、どんな手段でも構いません）

3. **あなたがサーバー上で承認します**:
   ```bash
   hermes pairing approve telegram XKGH5N7P
   ```

4. **これで使えるようになります** — ボットはその人のメッセージにすぐ応じ始めます

**ペアリング済みの利用者を管理する:**

```bash
# See all pending and approved users
hermes pairing list

# Revoke someone's access
hermes pairing revoke telegram 987654321

# Clear expired pending codes
hermes pairing clear-pending
```

:::tip
DM ペアリングはチーム向きです。利用者を増やすたびにゲートウェイを再起動しなくて済み、承認はその場で効きます。
:::

### セキュリティで気をつけること {#security-considerations}

- ターミナルを使えるボットで **`GATEWAY_ALLOW_ALL_USERS=true` を設定してはいけません**。ボットを見つけた人が誰でも、あなたのサーバーでコマンドを実行できてしまいます
- ペアリングコードは **1 時間**で期限切れになり、暗号論的な乱数から作られます
- 総当たり攻撃を防ぐため、回数の制限があります。利用者ひとりにつき 10 分に 1 回、プラットフォームごとに未処理のコードは最大 3 件まで
- 承認に 5 回失敗すると、そのプラットフォームは 1 時間ロックされます
- ペアリングのデータはすべて `chmod 0600` の権限で保存されます

---

## ステップ 5: ボットを設定する {#step-5-configure-the-bot}

### ホームチャンネルを決める {#set-a-home-channel}

**ホームチャンネル**は、ボットが cron ジョブの結果や、自分から送るメッセージを届ける先です。これがないと、予約した作業の出力を送る場所がありません。

**方法 1:** ボットが参加している Telegram のグループやチャットで `/sethome` コマンドを実行します。

**方法 2:** `~/.hermes/.env` に手で設定します。

```bash
TELEGRAM_HOME_CHANNEL=-1001234567890
TELEGRAM_HOME_CHANNEL_NAME="Team Updates"
```

チャンネルの ID を調べるには、グループに [@userinfobot](https://t.me/userinfobot) を追加してください。そのグループのチャット ID を教えてくれます。

### ツールの進行状況の表示を決める {#configure-tool-progress-display}

ボットがツールを使うときに、どこまで細かく見せるかを決めます。`~/.hermes/config.yaml` で設定します。

```yaml
display:
  tool_progress: new    # off | new | all | verbose
```

| モード | 見えるもの |
|------|-------------|
| `off` | 応答だけ。ツールの動きは出ません |
| `new` | 新しいツール呼び出しごとに短い状態表示（メッセージ連携ではこれがおすすめ） |
| `all` | すべてのツール呼び出しを詳しく |
| `verbose` | コマンドの実行結果を含む、ツールの出力すべて |

利用者はチャットで `/verbose` コマンドを使い、セッションごとに変えることもできます。

### SOUL.md で人格を作る {#set-up-a-personality-with-soulmd}

ボットの話し方を作り込むには、`~/.hermes/SOUL.md` を編集します。

一通りの案内は [Use SOUL.md with Hermes](/hermes/docs/guides/use-soul-with-hermes/) をご覧ください。

```markdown
# Soul
You are a helpful team assistant. Be concise and technical.
Use code blocks for any code. Skip pleasantries — the team
values directness. When debugging, always ask for error logs
before guessing at solutions.
```

### プロジェクトの前提を渡す {#add-project-context}

チームで特定のプロジェクトに取り組んでいるなら、コンテキストファイルを作って、使っている技術構成をボットに知らせておきましょう。

```markdown
<!-- ~/.hermes/AGENTS.md -->
# Team Context
- We use Python 3.12 with FastAPI and SQLAlchemy
- Frontend is React with TypeScript
- CI/CD runs on GitHub Actions
- Production deploys to AWS ECS
- Always suggest writing tests for new code
```

:::info
コンテキストファイルは、セッションごとにシステムプロンプトへ差し込まれます。短く保ってください。1 文字ごとにトークン予算を使います。
:::

---

## ステップ 6: 予約実行を設定する {#step-6-set-up-scheduled-tasks}

ゲートウェイが動いていれば、繰り返しの作業を予約して、結果をチームのチャンネルへ届けられます。

### 日々の進捗まとめ {#daily-standup-summary}

Telegram でボットにこう送ります。

```
Every weekday at 9am, check the GitHub repository at
github.com/myorg/myproject for:
1. Pull requests opened/merged in the last 24 hours
2. Issues created or closed
3. Any CI/CD failures on the main branch
Format as a brief standup-style summary.
```

エージェントが自動で cron ジョブを作り、頼んだチャット（あるいはホームチャンネル）へ結果を届けます。

### サーバーの状態チェック {#server-health-check}

```
Every 6 hours, check disk usage with 'df -h', memory with 'free -h',
and Docker container status with 'docker ps'. Report anything unusual —
partitions above 80%, containers that have restarted, or high memory usage.
```

### 予約した作業を管理する {#managing-scheduled-tasks}

```bash
# From the CLI
hermes cron list          # View all scheduled jobs
hermes cron status        # Check if scheduler is running

# From Telegram chat
/cron list                # View jobs
/cron remove <job_id>     # Remove a job
```

:::warning
cron ジョブのプロンプトは、それまでの会話の記憶を持たないまっさらなセッションで動きます。ファイルのパス、URL、サーバーのアドレス、はっきりした指示など、エージェントに必要な前提を**すべて**プロンプトに入れてください。
:::

---

## 本番運用のコツ {#production-tips}

### 安全のために Docker を使う {#use-docker-for-safety}

チームで共用するボットでは、ターミナルのバックエンドに Docker を使い、エージェントのコマンドをホストではなくコンテナの中で動かしましょう。

```bash
# In ~/.hermes/.env
TERMINAL_ENV=docker
TERMINAL_DOCKER_IMAGE=nikolaik/python-nodejs:python3.11-nodejs20
```

`~/.hermes/config.yaml` に書くこともできます。

```yaml
terminal:
  backend: docker
  container_cpu: 1
  container_memory: 5120
  container_persistent: true
```

こうしておけば、誰かがボットに危ないことを頼んでしまっても、ホスト側は守られます。

### ゲートウェイを見張る {#monitor-the-gateway}

```bash
# Check if the gateway is running
hermes gateway status

# Watch live logs (Linux)
journalctl --user -u hermes-gateway -f

# Watch live logs (macOS)
tail -f ~/.hermes/logs/gateway.log
```

### Hermes を最新に保つ {#keep-hermes-updated}

Telegram からボットに `/update` を送ると、最新版を取得して再起動します。サーバー側からやる場合はこうです。

```bash
hermes update
hermes gateway stop && hermes gateway start
```

### ログの置き場所 {#log-locations}

| 中身 | 場所 |
|------|----------|
| ゲートウェイのログ | `journalctl --user -u hermes-gateway`（Linux）または `~/.hermes/logs/gateway.log`（macOS） |
| cron ジョブの出力 | `~/.hermes/cron/output/{job_id}/{timestamp}.md` |
| cron ジョブの定義 | `~/.hermes/cron/jobs.json` |
| ペアリングのデータ | `~/.hermes/pairing/` |
| セッションの履歴 | `~/.hermes/sessions/` |

---

## この先へ {#going-further}

これで、チームで使える Telegram アシスタントが動くようになりました。次に進む先をいくつか挙げます。

- **[Security Guide](/hermes/docs/user-guide/security/)** — 認可、コンテナによる隔離、コマンド承認を詳しく
- **[Messaging Gateway](/hermes/docs/user-guide/messaging/)** — ゲートウェイの構造、セッション管理、チャットのコマンドを網羅した一覧
- **[Telegram Setup](/hermes/docs/user-guide/messaging/telegram/)** — 音声メッセージや音声合成を含む、Telegram 固有の話
- **[Scheduled Tasks](/hermes/docs/user-guide/features/cron/)** — 配信先の指定や cron 式を使った、踏み込んだ予約実行
- **[Context Files](/hermes/docs/user-guide/features/context-files/)** — プロジェクトの知識を渡す AGENTS.md、SOUL.md、.cursorrules
- **[Personality](/hermes/docs/user-guide/features/personality/)** — 組み込みの人格プリセットと、自分で決める人物像
- **プラットフォームを増やす** — 同じゲートウェイで [Discord](/hermes/docs/user-guide/messaging/discord/)、[Slack](/hermes/docs/user-guide/messaging/slack/)、[WhatsApp](/hermes/docs/user-guide/messaging/whatsapp/) を同時に動かせます

---

*質問や不具合がありますか。GitHub で issue を開いてください。寄稿を歓迎します。*
