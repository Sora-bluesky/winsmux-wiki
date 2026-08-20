---
title: "プロファイル: 複数のエージェントを動かす"
description: ""
upstream_path: user-guide/profiles.md
upstream_blob: ae4ad7055f308f8434b30566fe3c0cda984f9de7
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/profiles
---

# プロファイル: 複数のエージェントを動かす {#profiles-running-multiple-agents}

同じマシンの上で、独立した Hermes のエージェントをいくつも動かせます。設定、API キー、記憶、セッション、スキル、ゲートウェイの状態は、それぞれ別々に持ちます。

## プロファイルとは {#what-are-profiles}

プロファイルとは、Hermes のホームディレクトリを分けたものです。それぞれのプロファイルが自分のディレクトリを持ち、その中に `config.yaml`、`.env`、`SOUL.md`、記憶、セッション、スキル、cron ジョブ、状態のデータベースを持ちます。プロファイルを使えば、コーディングの相棒、個人用のボット、調べもの用のエージェントというように、目的の違うエージェントを Hermes の状態を混ぜずに動かせます。

:::caution エージェントごとに 1 つのプロファイルを
2 つのエージェントのプロセスを同じプロファイル（同じ Hermes のホーム）に向けてはいけません。どちらも自動的に記憶を書き込み、しかもセッションの開始時にお互いの書き込みをシステムプロンプトへ読み込みます。1 つのホームに書き手が 2 人いると、状態が互いに積み重なっていき、やがて自分で設定したものとは別物になります。プロファイルはまさにこれを防ぐためにあります。記憶を共有したいエージェントには、代わりに [外部のメモリープロバイダー](/hermes/docs/user-guide/features/memory-providers/) を使ってください。
:::

プロファイルを作ると、そのプロファイルは自動的に 1 つのコマンドになります。`coder` という名前のプロファイルを作れば、その時点で `coder chat`、`coder setup`、`coder gateway start` などが使えるようになります。

## すぐ使い始める {#quick-start}

```bash
hermes profile create coder       # creates profile + "coder" command alias
coder setup                       # configure API keys and model
coder chat                        # start chatting
```

これだけです。`coder` は、自分の設定・記憶・状態を持つ 1 つの Hermes のプロファイルになりました。

## プロファイルを作る {#creating-a-profile}

:::tip
いちばん手早いのは、新しいプロファイルの中で `hermes setup --portal` を実行することです。モデルとツールをまとめて設定できます。[Nous Portal](/hermes/docs/integrations/nous-portal/) をご覧ください。
:::

### 空のプロファイル {#blank-profile}

```bash
hermes profile create mybot
```

同梱のスキルだけを入れた、まっさらなプロファイルを作ります。`mybot setup` を実行して、API キー、モデル、ゲートウェイのトークンを設定してください。

このプロファイルをカンバンのワーカーとして使う予定があるなら（あるいはカンバンの取りまとめ役に仕事を振らせたいなら）、作るときに `--description "<role>"` を渡して、何が得意なのかを取りまとめ役に伝えておきます。

```bash
hermes profile create researcher --description "Reads source code and external docs, writes findings."
```

説明はあとから `hermes profile describe` で設定したり、自動生成したりもできます。振り分けの仕組み全体は [カンバンの手引き](/hermes/docs/user-guide/features/kanban/#auto-vs-manual-orchestration) をご覧ください。

### 設定だけ複製する（`--clone`） {#clone-config-only---clone}

```bash
hermes profile create work --clone
```

今のプロファイルの `config.yaml`、`.env`、`SOUL.md`、スキルを新しいプロファイルへコピーします。API キーもモデルもできることも同じで、セッションと記憶だけが新しくなります。API キーを変えたいときは `~/.hermes/profiles/work/.env` を、人格を変えたいときは `~/.hermes/profiles/work/SOUL.md` を編集してください。

### まるごと複製する（`--clone-all`） {#clone-everything---clone-all}

```bash
hermes profile create backup --clone-all
```

設定、API キー、人格、すべての記憶、スキル、cron ジョブ、プラグインまで**すべて**コピーします。動く状態がまるごと 1 つ手に入るということです。ただしプロファイルごとの履歴は除きます（セッションの履歴、`state.db`、`backups/`、`state-snapshots/`、`checkpoints/`）。これらは元のプロファイルのもので、数十 GB になることもあるからです。履歴まで含めた完全な控えが欲しいときは、代わりに `hermes profile export` か `hermes backup` を使ってください。

### 指定したプロファイルから複製する {#clone-from-a-specific-profile}

```bash
hermes profile create work --clone-from coder
```

`--clone-from <source>` は複製元のプロファイルを直接指定するもので、設定・スキル・SOUL の複製を含みます。その複製元をまるごとコピーしたいときは `--clone-all` と組み合わせます。

```bash
hermes profile create work-backup --clone-from coder --clone-all
```

:::tip Honcho の記憶とプロファイル
Honcho を有効にしていると、複製の操作のたびに、新しいプロファイル専用の AI ピアが自動で作られ、ユーザーのワークスペースは共有されます。プロファイルごとに、自分だけの観察と人物像が積み上がっていきます。詳しくは [Honcho -- 複数エージェント / プロファイル](/hermes/docs/user-guide/features/memory-providers/#honcho) をご覧ください。
:::

## プロファイルを使う {#using-profiles}

### コマンドの別名 {#command-aliases}

どのプロファイルにも、`~/.local/bin/<name>` に自動でコマンドの別名が作られます。

```bash
coder chat                    # chat with the coder agent
coder setup                   # configure coder's settings
coder gateway start           # start coder's gateway
coder doctor                  # check coder's health
coder skills list             # list coder's skills
coder config set model.default anthropic/claude-sonnet-4
```

この別名は hermes のすべてのサブコマンドで使えます。中身は `hermes -p <name>` そのものだからです。

### `-p` フラグ {#the--p-flag}

どのコマンドでも、対象のプロファイルを明示的に指定できます。

```bash
hermes -p coder chat
hermes --profile=coder doctor
hermes chat -p coder -q "hello"    # works in any position
```

### 既定を固定する（`hermes profile use`） {#sticky-default-hermes-profile-use}

```bash
hermes profile use coder
hermes chat                   # now targets coder
hermes tools                  # configures coder's tools
hermes profile use default    # switch back
```

既定を設定して、素の `hermes` コマンドがそのプロファイルを対象にするようにします。`kubectl config use-context` と同じ感覚です。

### 今どこにいるかを知る {#knowing-where-you-are}

CLI は、どのプロファイルが有効かを常に表示します。

- **プロンプト**: `❯` ではなく `coder ❯` になります
- **バナー**: 起動時に `Profile: coder` と表示します
- **`hermes profile`**: 今のプロファイル名、パス、モデル、ゲートウェイの状態を表示します

## プロファイルとワークスペースとサンドボックスの違い {#profiles-vs-workspaces-vs-sandboxing}

プロファイルはワークスペースやサンドボックスと混同されがちですが、別のものです。

- **プロファイル**は、Hermes に専用の状態ディレクトリを与えます。`config.yaml`、`.env`、`SOUL.md`、セッション、記憶、ログ、cron ジョブ、ゲートウェイの状態が入ります。
- **ワークスペース**、つまり作業ディレクトリは、ターミナルのコマンドが始まる場所です。これは `terminal.cwd` で別に決めます。
- **サンドボックス**は、ファイルへのアクセスを制限する仕組みです。プロファイルはエージェントを**閉じ込めません**。

既定の `local` ターミナルバックエンドでは、エージェントはあなたのユーザーアカウントと同じだけファイルにアクセスできます。プロファイルのディレクトリの外にあるフォルダを触るのを、プロファイルが止めてくれるわけではありません。

あるプロファイルを特定のプロジェクトのフォルダから始めたいなら、そのプロファイルの `config.yaml` に `terminal.cwd` を絶対パスで明示してください。

```yaml
terminal:
  backend: local
  cwd: /absolute/path/to/project
```

local バックエンドで `cwd: "."` と書いた場合、それは「Hermes を起動したディレクトリ」であって「プロファイルのディレクトリ」ではありません。

あわせて次の点にも注意してください。

- `SOUL.md` はモデルへの指針にはなりますが、作業範囲の境界を強制するものではありません。
- `SOUL.md` の変更は、新しいセッションからきれいに効きます。すでに動いているセッションは、古いプロンプトのままのことがあります。
- モデルに「今どのディレクトリにいますか」と尋ねても、隔離の確認にはなりません。ツールの開始位置を確実に決めたいなら、`terminal.cwd` を明示してください。

## ゲートウェイを動かす {#running-gateways}

プロファイルはそれぞれ、自分のボットトークンを持つ別プロセスとして、自分のゲートウェイを動かします。

```bash
coder gateway start           # starts coder's gateway
assistant gateway start       # starts assistant's gateway (separate process)
```

### ボットトークンを分ける {#different-bot-tokens}

プロファイルごとに `.env` ファイルがあります。Telegram / Discord / Slack のボットトークンを、それぞれ別に設定してください。

```bash
# Edit coder's tokens
nano ~/.hermes/profiles/coder/.env

# Edit assistant's tokens
nano ~/.hermes/profiles/assistant/.env
```

### 安全対策: トークンのロック {#safety-token-locks}

2 つのプロファイルがうっかり同じボットトークンを使った場合、2 つ目のゲートウェイは起動を止められ、どのプロファイルとぶつかっているかが分かるエラーが出ます。Telegram、Discord、Slack、WhatsApp、Signal で対応しています。

### 常駐サービスにする {#persistent-services}

```bash
coder gateway install         # creates hermes-gateway-coder systemd/launchd service
assistant gateway install     # creates hermes-gateway-assistant service
```

プロファイルごとに別のサービス名が付き、それぞれ独立して動きます。

:::note 公式 Docker イメージの中では
プロファイルごとのゲートウェイは [s6-overlay](https://github.com/just-containers/s6-overlay)（コンテナ内の PID 1）が面倒を見ます。そのため `hermes profile create <name>` を実行すると、`/run/service/gateway-<name>/` に s6 のサービス枠が自動で登録されます。`hermes -p <name> gateway start/stop/restart` は素のプロセスを起こす代わりに `s6-svc` へ回されるので、落ちても自動で立ち上がり直しますし、`docker restart` をしても、それまで動いていたゲートウェイの組み合わせがそのまま復元されます。詳しくは [プロファイルごとのゲートウェイ管理](/hermes/docs/user-guide/docker/#per-profile-gateway-supervision) をご覧ください。
:::

## プロファイルを設定する {#configuring-profiles}

プロファイルはそれぞれ次のものを持ちます。

- **`config.yaml`** — モデル、プロバイダー、ツールセット、その他すべての設定
- **`.env`** — API キー、ボットのトークン
- **`SOUL.md`** — 人格と指示

```bash
coder config set model.default anthropic/claude-sonnet-4
echo "You are a focused coding assistant." > ~/.hermes/profiles/coder/SOUL.md
```

このプロファイルを既定で特定のプロジェクトで働かせたいなら、そのプロファイルの `terminal.cwd` も設定してください。

```bash
coder config set terminal.cwd /absolute/path/to/project
```

### ダッシュボードから設定する {#from-the-dashboard}

[Web ダッシュボード](/hermes/docs/user-guide/features/web-dashboard/#managing-multiple-profiles)
はマシン全体を見る画面で、サイドバーのプロファイル切り替えから**どの**プロファイルの
設定、API キー、スキル、MCP、モデルでも扱えます。プロファイルごとに
ダッシュボードを立てる必要はありません。`coder dashboard` を実行すると、
`coder` プロファイルを選んだ状態でマシン全体のダッシュボードが開きます。
ダッシュボードの Chat タブもこの切り替えに従い、選んでいるプロファイルの
ホームの下で会話を始めます。

なお、ダッシュボードの Profiles ページにある「Set as active」は、**これから動かす
CLI やゲートウェイ**の既定を固定するものです（`hermes profile use` と同じです）。
ダッシュボードからプロファイルを編集したいときは、切り替えのほうを使ってください。

## 更新する {#updating}

`hermes update` はコードを 1 回だけ取得し（共有です）、同梱スキルの追加分を**すべての**プロファイルへ自動で反映します。

```bash
hermes update
# → Code updated (12 commits)
# → Skills synced: default (up to date), coder (+2 new), assistant (+2 new)
```

自分で手を入れたスキルが上書きされることはありません。

## プロファイルを管理する {#managing-profiles}

```bash
hermes profile list           # show all profiles with status
hermes profile show coder     # detailed info for one profile
hermes profile rename coder dev-bot   # rename (updates alias + service)
hermes profile export coder   # pack into coder.tar.gz (shareable; keys stripped)
hermes profile import coder.tar.gz   # install an archive as a new profile
```

チャットの中では、この 2 つは `/export` と `/import` として使えます。デスクトップアプリなら **⌘K → Export/Import profile…** です。[プロファイルを渡す](#sharing-a-profile) をご覧ください。

### 既定のプロファイルに名前を付ける {#naming-the-default-profile}

既定のプロファイルの内部 ID は常に `default` です。`~/.hermes` が
インストールの土台そのものなので、本当の意味では改名できません。
改名すると代わりに**表示名**が設定され、画面上ではむき出しの ID の代わりに
そちらが出ます。

```bash
hermes profile rename default Harumesu   # Unicode fine: 小助手
```

表示名が出るのは、`hermes profile list` / `show`、チャットの `/profile`
コマンド、ダッシュボード、デスクトップアプリ（Bot モードの一覧を含む）です。
これは見た目だけの話で、`-p default`、サービス名、cron ジョブなど、
それ以外の参照はすべて正規の `default` という ID を使い続けます。表示名は
`~/.hermes/profile.yaml` に `display_name` として保存されるので、
元に戻したいときはその行を消してください。名前付きのプロファイルにも
`display_name` を持たせられますが（本当の改名をしても残ります）、そちらの
`rename` はプロファイル自体の名前を変えます。

## プロファイルを削除する {#deleting-a-profile}

```bash
hermes profile delete coder
```

ゲートウェイを止め、systemd / launchd のサービスを消し、コマンドの別名を消し、プロファイルのデータをすべて削除します。確認のため、プロファイル名の入力を求められます。

確認を飛ばしたいときは `--yes` を使います: `hermes profile delete coder --yes`

:::note
既定のプロファイル（`~/.hermes`）は削除できません。すべて消したいときは `hermes uninstall` を使ってください。
:::

## タブ補完 {#tab-completion}

```bash
# Bash
eval "$(hermes completion bash)"

# Zsh
eval "$(hermes completion zsh)"
```

この行を `~/.bashrc` か `~/.zshrc` に足しておけば、補完がずっと効きます。`-p` のあとのプロファイル名、profile のサブコマンド、最上位のコマンドが補完されます。

## 仕組み {#how-it-works}

プロファイルは `HERMES_HOME` という環境変数を使っています。`coder chat` を実行すると、ラッパースクリプトが hermes を起動する前に `HERMES_HOME=~/.hermes/profiles/coder` を設定します。コードベースの 119 以上のファイルが `get_hermes_home()` を通してパスを解決しているので、Hermes の状態は自動的にそのプロファイルのディレクトリに収まります。設定、セッション、記憶、スキル、状態のデータベース、ゲートウェイの PID、ログ、cron ジョブがそうです。

これは、ターミナルの作業ディレクトリとは別の話です。ツールの実行は `terminal.cwd`（local バックエンドで `cwd: "."` の場合は起動したディレクトリ）から始まるのであって、自動的に `HERMES_HOME` から始まるわけではありません。

ホストに直接入れた場合、ツールのサブプロセスは既定であなたの本来の OS ユーザーの
`HOME` を保ちます。`~` の下にある既存の CLI の認証情報が、プロファイルをまたいでも
そのまま使えるようにするためです。プロファイルのデータは `HERMES_HOME` で
分けられているのであって、`HOME` を変えて分けているのではありません。コンテナ側の
バックエンドは、ツールの状態を残すのに引き続き `{HERMES_HOME}/home` を使います。
ホストでもプロファイルごとに厳密にツールの設定を分けたい人は、
`terminal.home_mode: profile` で切り替えられます。

ここには、混同しやすい 2 つの話が含まれています。

- `HERMES_HOME` はプロファイルの境界です。Hermes の設定、`.env`、
  記憶、セッション、スキル、ログ、cron ジョブ、ゲートウェイの状態など、Hermes の
  データを決めます。
- `HOME` は、外部の CLI が期待する OS 上のユーザーのホームです。ホストに
  直接入れた場合、Hermes は既定でこれを本来のユーザーのホームのままにするので、
  `git`、`ssh`、`gh`、`az`、`npm`、Claude Code、Codex といったツールが、普段の
  シェルと同じ認証情報を見つけられます。

その代わり、ホストのプロファイルは既定でユーザー単位の CLI の状態を共有します。
プロファイルごとに CLI の身元を分けたいなら、そのプロファイルの `config.yaml` に `terminal.home_mode:
profile` を設定してください。このモードでは、Hermes はツールのサブプロセスを
`HOME={HERMES_HOME}/home` で起動します。そのプロファイルのホームの中に、
`~/.ssh`、`~/.gitconfig`、`~/.config/gh`、クラウド CLI の認証、Claude や Codex の認証、
npm の状態などを、自分で用意するかリンクする必要があります。

Hermes は `HERMES_REAL_HOME` もサブプロセスへ渡すので、`home_mode: profile` が
効いているときでも、スクリプトから本当のアカウントのホームを見つけられます。

既定のプロファイルとは、`~/.hermes` そのもののことです。移行作業は要りません。すでに入っている環境は、これまでどおりに動きます。

## プロファイルを渡す {#sharing-a-profile}

1 台のマシンで育てたプロファイルは、別の場所へ持っていけます。自分のもう 1 台の作業機でも、同僚のノート PC でも、コミュニティでも構いません。方法は 2 つあります。

**ファイルを送る。** `/export` は、スキル、記憶、人格、cron、プラグイン、設定、そしてデスクトップからならテーマとレイアウトまで、プロファイルを 1 つの `.tar.gz` にまとめます。API キーは取り除かれます。受け取った側は `/import` を実行します。

```bash
# In chat, run /export, hand over the file, and they run /import on it
hermes profile export coder
hermes profile import ./coder.tar.gz --name coder
```

**配布物として公開する。** プロファイルを **git リポジトリ**として仕立てれば、受け取る側はコマンド 1 つで入れられ、あとから版を追って更新もできます。SOUL、設定、スキル、cron ジョブ、MCP の接続を運びます。認証情報、記憶、セッションはマシンごとのままです。

```bash
# Install a whole agent from a git repo
hermes profile install github.com/you/research-bot --alias

# Update later when the author ships a new version (keeps your memories + .env)
hermes profile update research-bot
```

1 回きりの受け渡しや引っ越しには書き出したファイルを、これからも更新を届けていくエージェントには配布物を使ってください。どちらについても、比較の表、作り方、公開の仕方、更新の考え方、安全性の考え方までを **[プロファイルの配布: エージェントをまるごと渡す](/hermes/docs/user-guide/profile-distributions/)** にまとめてあります。
