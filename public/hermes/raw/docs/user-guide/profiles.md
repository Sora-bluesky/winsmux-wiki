---
title: "プロファイル: 複数のエージェントを動かす"
description: ""
upstream_path: user-guide/profiles.md
upstream_blob: 06688de2f36946b2ac493d38e82737493f47f515
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/profiles
---

# プロファイル: 複数のエージェントを動かす {#profiles-running-multiple-agents}

同じ端末の上で、独立した Hermes エージェントを何体でも動かせます。設定も API キーも記憶もセッションもスキルもゲートウェイの状態も、エージェントごとに別々に持ちます。

## プロファイルとは {#what-are-profiles}

プロファイルとは、独立した Hermes ホームディレクトリのことです。プロファイルごとに専用のディレクトリが用意され、その中に `config.yaml`、`.env`、`SOUL.md`、記憶、セッション、スキル、cron ジョブ、状態データベースが収まります。Hermes が `~/.hermes/profiles/` の下のディレクトリをプロファイルとみなすのは、いま挙げた目印のファイル（`config.yaml`、`.env`、`SOUL.md`、`profile.yaml`、`auth.json`、`state.db`）のどれかを持っているときだけです。ログ出力や cron が置いていっただけの空のディレクトリは、`profile list` からもゲートウェイからも `-p` からも無視されます。プロファイルを使えば、コーディング補助・個人向けボット・調査エージェントというように目的の違うエージェントを、Hermes の状態を混ぜることなく別々に運用できます。

:::caution エージェントごとに専用のプロファイルを与えてください
2 つのエージェントプロセスを同じプロファイル（同じ Hermes ホーム）に向けてはいけません。どちらも記憶を自動で書き込み、セッション開始時に相手の書き込みを自分のシステムプロンプトへ読み込みます。1 つのホームに書き手が 2 人いると互いの状態が積み重なり、やがて設定したはずの姿から離れていきます。プロファイルはまさにこれを防ぐための仕組みです。記憶を共有したいエージェントには、代わりに[外部の記憶プロバイダ](/hermes/docs/user-guide/features/memory-providers/)を使ってください。
:::

プロファイルを作ると、それ自体が 1 つのコマンドになります。`coder` という名前で作れば、その場から `coder chat`、`coder setup`、`coder gateway start` などが使えます。

### プロファイル・エージェント・ボット {#profiles-agents-and-bots}

これらの言葉は、Hermes の別々の部分を指します。

- **プロファイル**は、ひとりのアシスタントの設定とデータを置いておく住まいです。
  会話をまたいでも、起動し直しても、同じ状態が残ります。

- **エージェント**は、その設定と状態を使って実際に動いている Hermes のアシスタントです。
  「Hermes Agent」は製品そのものの名前でもあります。

- **Bot Mode のボット**は、デスクトップの [Bot Mode](/hermes/docs/user-guide/bot-mode/) の一覧に、
  アイコン付きの名前と消えない Bot Chat を持つ形で並んだプロファイルです。
  同じプロファイルには CLI からも変わらず入れます。ボットはすべてプロファイルですが、
  プロファイルがすべてボットになるわけではありません。Bot Mode が一覧での見せ方
  （名前、アイコン、区分、隠すかどうか）をそのプロファイルの付随情報に保存し、
  正規の Bot Chat を固定した時点で、そのプロファイルはボットになります。CLI や Docker、
  ゲートウェイからだけ動かし、一覧に加えないプロファイルは、ただのプロファイルのままです。

- **メッセージングのボット**は、Telegram、Discord、Slack といったサービス側のアカウントで、
  ゲートウェイを通して Hermes とつながっています。
  [ボットトークン](#different-bot-tokens)が、そのサービス上のアカウントを指し示します。

- **サブエージェント**は、[`delegate_task`](/hermes/docs/user-guide/features/delegation/) が
  仕事ごとに立ち上げる子のアシスタントで、会話は新しく始まります。
  会話が別であることと、プロファイルが別であることは、同じではありません。

## クイックスタート {#quick-start}

```bash
hermes profile create coder       # creates profile + "coder" command alias
coder setup                       # configure API keys and model
coder chat                        # start chatting
```

これだけです。`coder` は独自の設定・記憶・状態を持つ、独立した Hermes プロファイルになりました。

## プロファイルを作る {#creating-a-profile}

:::tip
いちばん手早いのは、新しいプロファイルの中で `hermes setup --portal` を実行することです。モデルとツールをまとめて設定できます。[Nous Portal](/hermes/docs/integrations/nous-portal/) を参照してください。
:::

### まっさらなプロファイル {#blank-profile}

```bash
hermes profile create mybot
```

同梱スキルを入れた新しいプロファイルができます。`mybot setup` を実行すると、API キー・モデル・ゲートウェイのトークンを設定できます。

このプロファイルをカンバンのワーカーとして使うつもりなら（あるいはカンバンのオーケストレーターから仕事を割り振ってほしいなら）、作成時に `--description "<role>"` を付けて、何が得意なのかをオーケストレーターに伝えておきます。

```bash
hermes profile create researcher --description "Reads source code and external docs, writes findings."
```

説明はあとから `hermes profile describe` で設定することも、自動生成させることもできます。割り振りの仕組み全体は[カンバンのガイド](/hermes/docs/user-guide/features/kanban/#auto-vs-manual-orchestration)を参照してください。

### 設定だけを複製する（`--clone`） {#clone-config-only---clone}

```bash
hermes profile create work --clone
```

いま使っているプロファイルの `config.yaml`、`.env`、`SOUL.md`、スキル、そして整理された記憶のファイル `memories/MEMORY.md` と `memories/USER.md` を新しいプロファイルへコピーします。記憶は `SOUL.md` と同じく、エージェントの人となりの一部として扱われます。`config.yaml` で外部の記憶プロバイダー（`memory.provider`）を選んでいる場合は、そのプロバイダー自身の設定も一緒にコピーされます。プロファイルのホームの下にある `<provider>/` ディレクトリか `<provider>.json`（たとえば `hindsight/config.json`）のことで、これにより複製先でも記憶が知らないうちに無効になることなく使えます。ただし、`local_embedded` の hindsight 設定を複製した場合は、複製先に専用の hindsight の `profile`/`bank_id` を与えるまで、複製元の組み込みデーモンと記憶のバンクを共有したままです（[#81815](https://github.com/NousResearch/hermes-agent/issues/81815)）。セッション、`state.db`、cron ジョブをはじめ、ほかのものはすべて空から始まります。記憶も白紙にしたいときは、`--clone` を付けずにプロファイルを作るか、あとからこの 2 つのファイルを削除してください。ファイルがなくても、エージェントが別のプロファイルの記憶を代わりに読むことはありません。API キーを変えたいときは `~/.hermes/profiles/work/.env` を、人格を変えたいときは `~/.hermes/profiles/work/SOUL.md` を編集してください。

#### 複製先でも、取り込んだエージェントの設定を同期し続ける（`--sync-imports`） {#keep-a-clones-imported-agent-setups-synced---sync-imports}

複製元のプロファイルで [`hermes import-agent`](/hermes/docs/user-guide/import-from-other-agents/) を実行していた場合、その `import-sync.json` に、どの Claude Code / Codex の外部ディレクトリを取り込んだかが記録されています。`--clone` はこの記録を複製しないので、複製先はそのスキルと記憶を一度コピーしただけで終わります。記録ごと引き継ぐには `--sync-imports` を付けます。

```bash
hermes profile create work --clone --sync-imports
hermes -p work import-agent --sync        # pulls changes from the same ~/.claude / ~/.codex
```

これは明示的に指定したときだけ働く一方向の仕組みで、複製先を**外部エージェントのディレクトリだけ**に結び付けます。複製元のプロファイルとは結び付きません。2 つのプロファイルは独立したままで、あとから複製元の `config.yaml`、`SOUL.md`、スキルを編集しても複製先には届きません。`--clone-all` は、まるごとのコピーの一部としてこの記録もコピーします。

### まるごと複製する（`--clone-all`） {#clone-everything---clone-all}

```bash
hermes profile create backup --clone-all
```

設定・API キー・人格・すべての記憶・スキル・プラグインまで、**まるごと**コピーします。動く状態のスナップショットです。プロファイルごとの履歴（セッション履歴、`state.db`、`backups/`、`state-snapshots/`、`checkpoints/`）は対象外です。これらは元のプロファイルに属するもので、数十 GB に達することもあります。既定のプロファイルから複製するときは、ローカルモデル用の実行環境のディレクトリ（`models/`、`runtimes/`、`node/`。ダウンロードした重みと管理下のバイナリで、必要になれば取り直されます）も、`hermes backup` と同じく対象外になります。**cron ジョブも複製されません**。cron ジョブは元のプロファイルとその配信チャンネルに結びついた予定作業なので、複製先がそれを引き継ぐと同じジョブが二重に走ってしまいます（ゲートウェイが 2 つ、ジョブ ID は同じ）。新しいプロファイルの `cron/` は空の状態から始まります。履歴と cron ジョブまで含めた完全なバックアップが必要なら、`hermes profile export` か `hermes backup` を使ってください。

:::note OAuth ログインはコピーせず共有します
Anthropic（Claude Pro/Max）、OpenAI Codex、xAI の OAuth ログインは**使い捨てのリフレッシュトークン**を使います。コピーしても 2 つ目の資格情報にはならず、1 つの資格情報を 2 人で持っている状態になり、どちらかが先に更新した時点で他方のコピーは失効します。そのため `--clone-all`（およびダッシュボードによる資格情報のミラーリング）は、複製先から OAuth の行を落とします。新しいプロファイルは、ルートの `~/.hermes/auth.json` からログイン情報を読み続けます。どのプロファイルの中でトークンを更新しても、その結果はルートに書き戻されるので、すべてのプロファイルがログインしたままになります。静的な API キーは従来どおりコピーされます。あるプロファイルに独自の OAuth ログインを持たせたいときは、そのプロファイルで `hermes -p <name> auth add <provider>` を実行してください。
:::

### 特定のプロファイルから複製する {#clone-from-a-specific-profile}

```bash
hermes profile create work --clone-from coder
```

`--clone-from <source>` は複製元のプロファイルを直接指定するもので、設定・スキル・SOUL の複製を含みます。その複製元をまるごとコピーしたいときは `--clone-all` と組み合わせます。

```bash
hermes profile create work-backup --clone-from coder --clone-all
```

### メッセージのチャンネルは複製されません（含めたいときは `--clone-channels`） {#messaging-channels-are-never-cloned---clone-channels-to-opt-in}

どの複製も（`--clone`、`--clone-from`、`--clone-all`、それにダッシュボード / Desktop / TUI の
「プロファイルから複製」も）、元のプロファイルを**メッセージのチャンネル抜きで**写します。抜けるのは、
ボットのトークンと許可リスト（`TELEGRAM_BOT_TOKEN`、`DISCORD_ALLOWED_USERS`、`WHATSAPP_ENABLED`、
`API_SERVER_KEY`、`WEBHOOK_SECRET` など）、`config.yaml` の `platforms:` / `telegram:` / `discord:` の節、
`gateway.multiplex_profiles` / `profile_routes`、そして（`--clone-all` のときは）ペアリングの記録、
WhatsApp のセッション、そのほかボットごとの状態です。プロバイダやツールの API キー、モデルの設定、
メモリの設定、スキル、`SOUL.md` はこれまでどおり写されます。どのプラットフォームを置いてきたかは、
コマンドが表示します。

こうしているのは、ひとつのボットはひとつのプロファイルにしか属せないからです。同じトークンを持つ
独立したゲートウェイが 2 つあると、ロングポーリングを取り合います。[多重化したゲートウェイ](/hermes/docs/user-guide/multi-profile-gateways/)
では重複したアダプターが待機に回されます（`hermes gateway migrate --multiplex` も、プラットフォームごとに
「認証情報の重複」を理由に止まります）。新しいプロファイル専用のボットは、
`hermes -p <name> setup` かダッシュボードの Messaging ページで設定してください。

```bash
hermes profile create twin --clone --clone-channels   # keep the source's bots anyway
```

元のプロファイルを、動いている多重化ゲートウェイがすでに受け持っている場合、`--clone-channels` は
拒否されます（写しはすぐに待機へ回されてしまうからです）。CLI でも、ダッシュボードでも、TUI でも同じです。
それ以外の場合は、元のプロファイルと共有することになったプラットフォームを挙げて警告を出します。
複製のフラグなしで使うとエラーになります。`hermes profile list` も、ボットの認証情報が既定のプロファイルと
バイト単位で同じプロファイルに同じ警告を出すので、以前に作った複製が問題を起こす前に見つかります。

**何がチャンネルの設定に当たるか** — 一覧は「どのアダプターの持ち物か」で決まり、*元の*プロファイルの
プラグインの範囲（そのプロファイル専用の `plugins/` のアダプターも含む）で判定します。

- アダプターが宣言しているすべてのキー（トークン、アプリ / クライアントの ID、許可リスト、全員許可の
  切り替え、ホームチャンネル）と、その `<PLATFORM>_` の接頭辞が付くすべてのキー。昔の別名
  （`WECOM_*`、`SMS_*`/`TWILIO_*`、`QQ_*`、`HASS_*`、`EMAIL_*`）も含みます。
- ゲートウェイ全体のチャンネルの方針 `GATEWAY_ALLOW_ALL_USERS` / `GATEWAY_ALLOWED_USERS` と、
  中継の登録に使う身元 `GATEWAY_RELAY_ID` / `GATEWAY_RELAY_SECRET` / `GATEWAY_RELAY_DELIVERY_KEY`。
- `--clone-all` のときは、ボットごとの状態のファイル**とディレクトリ**（`platforms/`、ペアリングの台帳、
  `google_chat_user_tokens/`、`<platform>_*`）。

メッセージのアダプターが、チャンネル以外の機能と共有している認証情報もあります。`HASS_TOKEN`/`HASS_URL`
（Home Assistant のツールも使う）、`TWILIO_*`（電話のスキルも使う）、`EMAIL_*`（メール送信の
スクリプトも使う）です。これらを取り除くのは、**元のプロファイルのゲートウェイがそのアダプターを動かす場合だけ**
です（`config.yaml` でそのプラットフォームが有効になっているか、認証情報がそろっていて明示的に無効に
されていない場合）。`platforms.homeassistant.enabled: false` の元プロファイルは `HASS_TOKEN`
をツールのキーとして使っているので、複製にも残ります。これらの接頭辞の下にある許可リストやポートは、
つねにチャンネル専用なので、つねに取り除かれます。

複製は `profiles/` の隣にある隠れた準備用ディレクトリで組み立て、取り除きが済んでから名前の変更 1 回で
公開します。そのため、動いている多重化の仕組み（作成時に `profiles/` を読み直します）が、写しかけの
ツリーでアダプターを立ち上げてしまうことはありません。元の `.env`/`config.yaml` がシンボリックリンクなら、
まず専用の写しとして実体化します。複製が元のファイルへ書き込んでしまうことはありません。

:::tip Honcho の記憶とプロファイル
Honcho を有効にしていると、複製の操作にあわせて新しいプロファイル専用の AI ピアが自動で作られ、ユーザーのワークスペースは共有されます。プロファイルごとに独自の観察と人物像が育っていきます。詳しくは [Honcho -- Multi-agent / Profiles](/hermes/docs/user-guide/features/memory-providers/#honcho) を参照してください。
:::

## プロファイルを使う {#using-profiles}

### コマンドの別名 {#command-aliases}

どのプロファイルにも `~/.local/bin/<name>` に自動でコマンドの別名が作られます。

```bash
coder chat                    # chat with the coder agent
coder setup                   # configure coder's settings
coder gateway start           # start coder's gateway
coder doctor                  # check coder's health
coder skills list             # list coder's skills
coder config set model.default anthropic/claude-sonnet-4
```

この別名は hermes のどのサブコマンドでも使えます。中身は `hermes -p <name>` そのものです。

### `-p` フラグ {#the--p-flag}

どのコマンドでも、対象のプロファイルを明示的に指定できます。

```bash
hermes -p coder chat
hermes --profile=coder doctor
hermes chat -p coder -q "hello"    # works in any position
```

### 既定として固定する（`hermes profile use`） {#sticky-default-hermes-profile-use}

```bash
hermes profile use coder
hermes chat                   # now targets coder
hermes tools                  # configures coder's tools
hermes profile use default    # switch back
```

既定を設定すると、`hermes` とだけ打ったコマンドがそのプロファイルを対象にします。`kubectl config use-context` と同じ感覚です。

### いまどのプロファイルにいるか {#knowing-where-you-are}

CLI は、有効なプロファイルを常に表示します。

- **プロンプト**: `❯` ではなく `coder ❯` になります
- **バナー**: 起動時に `Profile: coder` と表示されます
- **`hermes profile`**: 現在のプロファイル名、パス、モデル、ゲートウェイの状態を表示します

## プロファイル・ワークスペース・サンドボックスの違い {#profiles-vs-workspaces-vs-sandboxing}

プロファイルはワークスペースやサンドボックスと混同されがちですが、別のものです。

- **プロファイル**は Hermes に専用の状態ディレクトリを与えます。`config.yaml`、`.env`、`SOUL.md`、セッション、記憶、ログ、cron ジョブ、ゲートウェイの状態が入ります。
- **ワークスペース**（作業ディレクトリ）は、ターミナルのコマンドが始まる場所です。こちらは `terminal.cwd` で別に決まります。
- **サンドボックス**はファイルシステムへのアクセスを制限する仕組みです。プロファイルはエージェントを**サンドボックスに閉じ込めません**。

既定の `local` ターミナルバックエンドでは、エージェントはあなたのユーザーアカウントと同じ範囲のファイルにアクセスできます。プロファイルのディレクトリの外にあるフォルダへのアクセスを、プロファイルが止めてくれるわけではありません。

あるプロファイルを特定のプロジェクトフォルダで始めたいときは、そのプロファイルの `config.yaml` に絶対パスの `terminal.cwd` を明示します。

```yaml
terminal:
  backend: local
  cwd: /absolute/path/to/project
```

local バックエンドで `cwd: "."` と書いた場合は「Hermes を起動したディレクトリ」を意味し、「プロファイルのディレクトリ」ではありません。

あわせて次の点にも注意してください。

- `SOUL.md` はモデルの振る舞いを導けますが、ワークスペースの境界を強制するものではありません。
- `SOUL.md` の変更は、新しいセッションできれいに反映されます。動いているセッションは古いプロンプトの状態のままかもしれません。
- モデルに「いまどのディレクトリにいますか」と尋ねても、隔離できているかの確かめにはなりません。ツールの開始位置を確実に決めたいなら、`terminal.cwd` を明示してください。

## ゲートウェイを動かす {#running-gateways}

プロファイルはそれぞれ、自分のボットトークンを持つ別プロセスとしてゲートウェイを動かします。

```bash
coder gateway start           # starts coder's gateway
assistant gateway start       # starts assistant's gateway (separate process)
```

### ボットトークンを分ける {#different-bot-tokens}

プロファイルごとに `.env` ファイルがあります。Telegram / Discord / Slack のボットトークンを、それぞれに別々に設定してください。

```bash
# Edit coder's tokens
nano ~/.hermes/profiles/coder/.env

# Edit assistant's tokens
nano ~/.hermes/profiles/assistant/.env
```

### 安全装置: トークンのロック {#safety-token-locks}

2 つのプロファイルがうっかり同じボットトークンを使った場合、2 つ目のゲートウェイは起動を止められ、衝突している相手のプロファイル名を含むエラーが出ます。Telegram、Discord、Slack、WhatsApp、Signal に対応しています。

### 常駐サービスにする {#persistent-services}

```bash
coder gateway install         # creates hermes-gateway-coder systemd/launchd service
assistant gateway install     # creates hermes-gateway-assistant service
```

プロファイルごとに別のサービス名が付き、互いに独立して動きます。

:::note 公式 Docker イメージの中では
プロファイルごとのゲートウェイは [s6-overlay](https://github.com/just-containers/s6-overlay)（コンテナ内の PID 1）が管理します。そのため `hermes profile create <name>` を実行すると、`/run/service/gateway-<name>/` に s6 のサービス枠が自動で登録されます。`hermes -p <name> gateway start/stop/restart` は素のプロセスを起動する代わりに `s6-svc` へ渡されるので、落ちても自動で再起動し、`docker restart` しても直前に動いていたゲートウェイの組み合わせが保たれます。詳しくは[プロファイルごとのゲートウェイ管理](/hermes/docs/user-guide/docker/#per-profile-gateway-supervision)を参照してください。
:::

## プロファイルを設定する {#configuring-profiles}

プロファイルはそれぞれ次を持ちます。

- **`config.yaml`** — モデル、プロバイダ、ツールセット、すべての設定
- **`.env`** — API キー、ボットトークン
- **`SOUL.md`** — 人格と指示

```bash
coder config set model.default anthropic/claude-sonnet-4
echo "You are a focused coding assistant." > ~/.hermes/profiles/coder/SOUL.md
```

このプロファイルを既定で特定のプロジェクトで働かせたいなら、専用の `terminal.cwd` も設定します。

```bash
coder config set terminal.cwd /absolute/path/to/project
```

### ダッシュボードから {#from-the-dashboard}

[Web ダッシュボード](/hermes/docs/user-guide/features/web-dashboard/#managing-multiple-profiles)
は端末全体を見る画面で、サイドバーのプロファイル切り替えから**どの**プロファイルの設定・API
キー・スキル・MCP・モデルでも扱えます。プロファイルごとにダッシュボードを立てる必要はありません。`coder dashboard` は端末のダッシュボードを開き、`coder` プロファイルをあらかじめ選んだ状態にします。ダッシュボードの Chat タブも切り替えに従い、選んだプロファイルのホームで会話を始めます。

補足: ダッシュボードの Profiles ページにある「Set as active」は、**これから動かす CLI やゲートウェイ**の既定を決めるもので（`hermes profile use` と同じです）、ダッシュボードからプロファイルを編集したいときは切り替えのほうを使ってください。

## 更新する {#updating}

`hermes update` はコードを一度だけ（共有で）取得し、新しい同梱スキルを**すべての**プロファイルへ自動で反映します。

```bash
hermes update
# → Code updated (12 commits)
# → Skills synced: default (up to date), coder (+2 new), assistant (+2 new)
```

自分で書き換えたスキルが上書きされることはありません。

依存の準備では、すべてのプロファイルの `config.yaml` を読み、共有の環境に入れておくべき
プラグインの組み合わせを割り出します。`config.yaml` を解析できないプロファイル（または `plugins` / `memory` の節の形が
正しくないプロファイル）が 1 つでもあると、インストール全体でこの手順が失敗します。詳しくは
[依存の準備と保持](/hermes/docs/user-guide/features/plugins/#dependency-preparation-and-preservation)をご覧ください。

## プロファイルを管理する {#managing-profiles}

```bash
hermes profile list           # show all profiles with status
hermes profile show coder     # detailed info for one profile
hermes profile rename coder dev-bot   # rename (updates alias + service)
hermes profile migrate-identity coder dev-bot   # retry a rename's identity migration
hermes profile purge-identity dev-bot   # retry a delete's identity purge
hermes profile export coder   # pack into coder.tar.gz (shareable; keys stripped)
hermes profile import coder.tar.gz   # install an archive as a new profile
```

チャットの中では同じ 2 つが `/export` と `/import` として使えます。デスクトップアプリでは **⌘K → Export/Import profile…** です。[プロファイルを渡す](#sharing-a-profile)を参照してください。

### 既定プロファイルに名前を付ける {#naming-the-default-profile}

既定プロファイルの内部 ID は常に `default` です。`~/.hermes`
がインストール先の根っこなので、本当の意味では改名できません。改名すると代わりに**表示名**が設定され、画面上では素の ID の代わりにこちらが出ます。

```bash
hermes profile rename default Harumesu   # Unicode fine: 小助手
```

表示名は `hermes profile list` と `show`、チャットの `/profile`
コマンド、ダッシュボード、デスクトップアプリ（Bot Mode
の一覧を含む）に出ます。あくまで見た目だけの話で、`-p default`、サービス名、cron
ジョブなど他のすべての参照は正式な `default` ID を使い続けます。表示名は `~/.hermes/profile.yaml` の `display_name` に保存されるので、その行を消せば元に戻ります。名前付きのプロファイルも `display_name` を持てますが（本当の改名をしても残ります）、そちらの `rename` はプロファイル自体の改名になります。

## プロファイルを削除する {#deleting-a-profile}

```bash
hermes profile delete coder
```

ゲートウェイを止め、systemd / launchd のサービスを外し、コマンドの別名を消し、プロファイルのデータをすべて削除します。確認のためにプロファイル名の入力を求められます。

確認を省くには `--yes` を付けます: `hermes profile delete coder --yes`

:::note
既定プロファイル（`~/.hermes`）は削除できません。すべて消したいときは `hermes uninstall` を使ってください。
:::

## タブ補完 {#tab-completion}

```bash
# Bash
eval "$(hermes completion bash)"

# Zsh
eval "$(hermes completion zsh)"
```

補完をずっと効かせたいときは、この行を `~/.bashrc` か `~/.zshrc` に書き加えます。`-p` のあとのプロファイル名、profile のサブコマンド、トップレベルのコマンドを補完します。

## 仕組み {#how-it-works}

プロファイルは `HERMES_HOME` 環境変数で動いています。`coder chat` を実行すると、ラッパースクリプトが hermes を起動する前に `HERMES_HOME=~/.hermes/profiles/coder` を設定します。コードベースの 119 以上のファイルが `get_hermes_home()` を通してパスを解決しているので、設定・セッション・記憶・スキル・状態データベース・ゲートウェイの PID・ログ・cron ジョブといった Hermes の状態が、自動的にそのプロファイルのディレクトリに閉じます。

これはターミナルの作業ディレクトリとは別の話です。ツールの実行は `terminal.cwd`（local バックエンドで `cwd: "."` のときは起動したディレクトリ）から始まり、`HERMES_HOME` から始まるわけではありません。

ホストへ直接入れた場合、ツールのサブプロセスは既定であなたの実際の OS
ユーザーの `HOME` を保ちます。`~` の下にある既存の CLI の資格情報が、どのプロファイルでもそのまま使えるようにするためです。プロファイルのデータは
`HOME` を変えることではなく `HERMES_HOME` によって隔てられています。コンテナのバックエンドでは今も
`{HERMES_HOME}/home` をツールの永続状態に使い、ホストで使っていてプロファイルごとにツール設定を厳密に分けたい人は `terminal.home_mode: profile` を選べます。

ここには取り違えやすい 2 つの事柄があります。

- `HERMES_HOME` はプロファイルの境界です。Hermes の設定、`.env`、記憶、セッション、スキル、ログ、cron
  ジョブ、ゲートウェイの状態など、Hermes
  のデータを受け持ちます。
- `HOME` は外部の CLI が期待する OS 上のユーザーホームです。ホストへ入れた場合、Hermes
  は既定でこれを実際のユーザーホームのままにするので、`git`、`ssh`、`gh`、`az`、`npm`、Claude Code、Codex
  といったツールが、普段のシェルで使っているのと同じ資格情報を見つけられます。

引き換えに、ホスト上のプロファイルは既定で通常のユーザー階層の CLI の状態を共有します。プロファイルごとに CLI
の身元を分けたいときは、そのプロファイルの `config.yaml` に `terminal.home_mode:
profile` を設定してください。このモードでは Hermes はツールの
サブプロセスを `HOME={HERMES_HOME}/home` で起動するので、そのプロファイルのホームの中に `~/.ssh`、`~/.gitconfig`、`~/.config/gh`、クラウド CLI の認証、
Claude / Codex の認証、npm の状態などを自分で用意するか、リンクを張る必要があります。

Hermes はサブプロセスに `HERMES_REAL_HOME` も渡すので、`home_mode: profile` が有効なときでも、スクリプトから実際のアカウントのホームを見つけられます。

既定プロファイルは `~/.hermes` そのものです。移行の作業は要りません。すでに入っている環境はこれまでどおり動きます。

## プロファイルを渡す {#sharing-a-profile}

ある端末で育てたプロファイルは、別の場所へ持っていけます。自分のもう 1 台の作業機でも、同僚のノート PC でも、コミュニティへでも。方法は 2 つあります。

**ファイルで渡す。** `/export` はプロファイルを 1 つの `.tar.gz` にまとめます。スキル、記憶、人格、cron、プラグイン、設定、そしてデスクトップからならテーマとレイアウトも入ります。API キーは取り除かれます。受け取った側は `/import` を実行します。

端末ごとの PM の状態は持ち運べません。エクスポート、インポート、配布用のインストールでは、
プロファイルの直下にある `installs/`、`tools/`、`cache/` を対象から外します。
バックアップと復元でも、既定のホームと名前付きのプロファイルに同じ決まりが当てはまります。
古いアーカイブで、受け取る側の端末の PM の選択やツールを置き換えることはできません。
`plugins/example/facts.json` や `skills/example/tools/helper.py` のようなファイルは
ユーザーのデータとして扱われ、そのまま残ります。受け取る側の依存は、環境をコピーするのではなく
[PM](/hermes/docs/reference/package-management/) を通して入れてください。

```bash
# In chat, run /export, hand over the file, and they run /import on it
hermes profile export coder
hermes profile import ./coder.tar.gz --name coder
```

**配布物として公開する。** プロファイルを **git リポジトリ**として仕立てると、受け取る側はコマンド 1 つで導入でき、あとから版を追って更新できます。SOUL、設定、スキル、cron ジョブ、MCP の接続が入り、資格情報・記憶・セッションは端末ごとのままになります。

```bash
# Install a whole agent from a git repo
hermes profile install github.com/you/research-bot --alias

# Update later when the author ships a new version (keeps your memories + .env)
hermes profile update research-bot
```

一度きりの受け渡しや引っ越しにはエクスポートしたファイルを、これからも配り続けるエージェントには配布物を使ってください。どちらについても、比較表・作り方・公開の手順・更新の意味・セキュリティの考え方を **[Profile Distributions: Share a Whole Agent](/hermes/docs/user-guide/profile-distributions/)** にまとめています。
