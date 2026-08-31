---
title: "Hermes Agent の設定"
description: "Hermes Agent を設定する — config.yaml、プロバイダ、モデル、API キーなど"
upstream_path: user-guide/configuration.md
upstream_blob: 7e087add374bf11a956a3227b9fc188e9101b9b9
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/configuration
---

# Hermes Agent の設定 {#hermes-agent-configuration}

設定はすべて `~/.hermes/` ディレクトリにまとまっていて、すぐに開けます。

:::tip 動く `config.yaml` に最短でたどり着く方法
`hermes setup --portal` を実行してください。OAuth を一度通すだけで、モデルのプロバイダと Tool Gateway の 4 つのツールが、YAML を手で書かずに揃います。Portal の購読者はトークン課金のプロバイダが 10% 割引にもなります。[Nous Portal](/hermes/docs/integrations/nous-portal/) を参照してください。
:::

## ディレクトリ構成 {#directory-structure}

```text
~/.hermes/
├── config.yaml     # Settings (model, terminal, TTS, compression, etc.)
├── .env            # API keys and secrets
├── auth.json       # OAuth provider credentials (Nous Portal, etc.)
├── SOUL.md         # Primary agent identity (slot #1 in system prompt)
├── memories/       # Persistent memory (MEMORY.md, USER.md)
├── skills/         # Agent-created skills (managed via skill_manage tool)
├── cron/           # Scheduled jobs
├── sessions/       # Gateway sessions
└── logs/           # Logs (errors.log, gateway.log — secrets auto-redacted)
```

## 設定を操作する {#managing-configuration}

```bash
hermes config              # View current configuration
hermes config edit         # Open config.yaml in your editor
hermes config get KEY      # Print a resolved value
hermes config set KEY VAL  # Set a specific value
hermes config unset KEY    # Remove a user-set value
hermes config check        # Check for missing options (after updates)
hermes config migrate      # Interactively add missing options

# Examples:
hermes config get model
hermes config set model anthropic/claude-opus-4
hermes config set terminal.backend docker
hermes config unset terminal.backend
hermes config set OPENROUTER_API_KEY sk-or-...  # Saves to .env
```

:::tip
`hermes config set` は値の行き先を自動で振り分けます。API キーは `.env` へ、それ以外は `config.yaml` へ保存されます。
:::

## 設定の優先順位 {#configuration-precedence}

設定は次の順に解決されます（上ほど優先されます）。

1. **CLI の引数** — 例: `hermes chat --model anthropic/claude-sonnet-4`（その実行のときだけ上書きします）
2. **`~/.hermes/config.yaml`** — 秘密情報以外のすべてを書く、中心となる設定ファイル
3. **`~/.hermes/.env`** — 環境変数の代わりとして使われます。秘密情報（API キー、トークン、パスワード）は**ここが必須**です
4. **組み込みの既定値** — ほかに何も設定がないときに使われる、安全側に寄せた値

:::info 目安
秘密情報（API キー、ボットのトークン、パスワード）は `.env` へ。それ以外（モデル、ターミナルのバックエンド、圧縮の設定、メモリの上限、ツールセット）は `config.yaml` へ書きます。両方に書いた場合、秘密情報以外は `config.yaml` が勝ちます。
:::

:::tip 組織での導入
管理者は、システム階層の管理ディレクトリを使って、一般の利用者が上書きできない設定値・秘密情報を固定できます。
[Managed Scope](/hermes/docs/user-guide/managed-scope/) を参照してください。
:::

## 実行時の上限 {#runtime-limits}

長時間動き続ける Hermes のサーバー面（gateway や
`hermes serve --isolated` を含みます）は、OS が対応していれば起動時に
設定された `RLIMIT_NOFILE` のソフト上限を適用します。

```yaml
runtime:
  nofile_soft_limit: 4096
```

既定値は `4096` です。Hermes は目標値を OS のハード上限に丸め、すでにそれより高い
ソフト上限を持つプロセスを下げることはありません。値を `0`、`false`、`null` にすると
この調整を無効にできます。Windows や、上限を変えられない
サンドボックスでは、
上限を変えないまま起動を続けます。

## データベースの設定 {#database-settings}

`database:` の節は、セッション・メッセージ・gateway のルーティングを保存する
SQLite の状態データベース（`state.db`）を Hermes がどう開くかを決めます。

```yaml
database:
  # Journal mode for state.db: wal (default) or delete.
  # Use delete on filesystems where WAL is unsafe (network mounts, some
  # virtiofs setups). Note: an existing on-disk WAL database is never
  # live-downgraded — Hermes keeps WAL and logs an error telling you the
  # configured delete did not apply. To convert an existing database, stop
  # every process using it and run a one-time offline
  # `PRAGMA journal_mode=DELETE` on the file.
  journal_mode: wal

  # Durability level for every state.db connection: OFF, NORMAL, FULL,
  # EXTRA (or 0-3). Unset leaves SQLite's compile-time default, which
  # differs between interpreter builds. On macOS this is a floor, not a
  # pin: values below FULL are refused to protect against Darwin fsync
  # reordering; EXTRA is honored.
  # synchronous: FULL

  # Optional WAL sizing pragmas (integers). Unset = SQLite defaults.
  # wal_autocheckpoint: 1000     # pages between automatic checkpoints
  # journal_size_limit: 67108864 # cap the WAL/journal size in bytes
```

既存のデータベースを開いたときに、ディスク上の journal mode が黙って WAL に
切り替わった場合（たとえば運用者が手で `delete` に変換していたデータベース）にも、
Hermes は警告を出します（プロセスごと・データベースごとに 1 回）。あわせて、
その選択を確実に効かせる設定として `database.journal_mode` を案内します。

## 環境変数の展開 {#environment-variable-substitution}

`config.yaml` の中では `${VAR_NAME}` の書き方で環境変数を参照できます。

```yaml
auxiliary:
  vision:
    api_key: ${GOOGLE_API_KEY}
    base_url: ${CUSTOM_VISION_URL}

delegation:
  api_key: ${DELEGATION_KEY}
```

1 つの値の中で複数回参照することもできます: `url: "${HOST}:${PORT}"`。参照した変数が設定されていない場合は、書いたそのままの形が残り（`${UNDEFINED_VAR}` はそのまま）、警告がログに出ます。`$VAR` のような裸の書き方は展開されません。

Cursor 形式の SecretRef も受け付けます。`${env:VAR_NAME}` は `${VAR_NAME}` とまったく同じに解決されるので（`env:` の接頭辞が取り除かれます）、Cursor や Claude の設定からコピーしてきた MCP・プロバイダの断片は、`config.yaml` でも `mcp_servers` ブロックでもそのまま動きます。ほかの SecretRef の参照元（`${file:...}`、`${vault:...}`、`${bitwarden:...}`）はその場では解決され**ません**。外部の秘密情報バックエンドは `secrets:` ブロック経由で起動時に値を環境へ注入するので、`${env:NAME}` の形で参照してください。知らない接頭辞は 1 度だけ警告を出し、書いたまま残ります。

AI プロバイダの設定（OpenRouter、Anthropic、Copilot、独自エンドポイント、自前ホストの LLM、フォールバックのモデルなど）は [AI Providers](/hermes/docs/integrations/providers/) を参照してください。

### プロバイダのタイムアウト {#provider-timeouts}

プロバイダ全体のリクエストのタイムアウトは `providers.<id>.request_timeout_seconds` で設定でき、モデル単位の上書きは `providers.<id>.models.<model>.timeout_seconds` で行えます。これはすべての通信方式（OpenAI 形式、ネイティブ Anthropic、Anthropic 互換）の主要な会話クライアント、フォールバックの連鎖、認証情報のローテーション後の再構築、そして（OpenAI 形式では）リクエストごとのタイムアウトの引数に適用されます。つまり、設定した値が従来の `HERMES_API_TIMEOUT` 環境変数より優先されます。

非ストリーミング呼び出しの停滞検出には `providers.<id>.stale_timeout_seconds` を設定でき、モデル単位の上書きは `providers.<id>.models.<model>.stale_timeout_seconds` です。こちらは従来の `HERMES_API_CALL_STALE_TIMEOUT` 環境変数より優先されます。

設定しないままにすると、従来の既定値が使われます（`HERMES_API_TIMEOUT=1800` 秒、`HERMES_API_CALL_STALE_TIMEOUT=90` 秒、ネイティブ Anthropic は 900 秒）。非ストリーミングの停滞検出は、明示指定がないときはローカルのエンドポイントに対して自動で無効になり、非常に大きなコンテキストでは上向きに伸びることがあります。AWS Bedrock にはまだつながっていません（`bedrock_converse` と AnthropicBedrock SDK のどちらの経路も boto3 を使い、boto3 側のタイムアウトの設定に従います）。[`cli-config.yaml.example`](https://github.com/NousResearch/hermes-agent/blob/main/cli-config.yaml.example) のコメント付きの例も参照してください。

## 更新のふるまい {#update-behavior}

`hermes update` の設定は `config.yaml` の `updates` の下にあります。

```yaml
updates:
  pre_update_backup: quick       # quick (state snapshot, default) | full (snapshot + HERMES_HOME zip) | off
  backup_keep: 5                 # Keep this many full pre-update backup zips
  non_interactive_local_changes: stash  # stash | discard
  auto_switch_parked_branch: true       # auto-switch a clean, fully merged parked branch back to main
```

`pre_update_backup` は更新前の安全策をまとめた 1 つのつまみです。`quick`（既定）は重要な状態ファイル（ペアリング情報、cron のジョブ、設定、認証。1 GiB を超えるファイルは対象外）を `state-snapshots/` にスナップショットします。`full` はさらに `HERMES_HOME` 全体を `backups/` に zip でまとめるので、ホームが大きいと数分かかることがあります。`off` は両方を止めます。以前の真偽値も解釈されます（`true` → `full`、`false` → `off`）。

git で導入している場合、Hermes は更新ブランチのチェックアウトや pull の前に、変更のある追跡ファイルと未追跡ファイルを自動で stash します。対話的な端末での更新は、その stash を戻す前に確認します。対話でない更新（デスクトップ／チャットアプリ、gateway、`--yes`）は `updates.non_interactive_local_changes` に従います。`stash` は pull が成功したあとにローカルのソースの変更を戻し、`discard` は pull が成功したあとに更新で作られた stash を捨てます。`discard` は、ローカルのソースの変更を残す想定がまったくない管理下の導入でだけ使ってください。

この stash の前に、Hermes は npm の install/build で生じた追跡済み `package-lock.json` の差分も元に戻します。意図してロックファイルを編集した場合は、更新の前にコミットするか自分で stash してください。

## ターミナルのバックエンドの設定 {#terminal-backend-configuration}

Hermes は 7 種類のターミナルのバックエンドに対応しています。どれを選ぶかで、エージェントのシェルコマンドが実際にどこで動くかが決まります。手元の端末、Docker のコンテナ、SSH 越しのリモートサーバー、Modal のクラウドサンドボックス（直接、または Nous が管理する gateway 経由）、Daytona のワークスペース、Vercel Sandbox、Singularity/Apptainer のコンテナのいずれかです。

```yaml
terminal:
  backend: local    # local | docker | ssh | modal | daytona | vercel_sandbox | singularity
  cwd: "."          # Gateway/cron working directory (CLI always uses launch dir)
  temp_dir: ""      # Session temp root; empty = TMPDIR, else ~/.hermes/cache/terminal
  font_family: ""   # Desktop terminal font; e.g. "MesloLGS NF"
  timeout: 180      # Per-command timeout in seconds
  home_mode: auto   # auto | real | profile — subprocess HOME policy
  env_passthrough: []  # Env var names to forward to sandboxed execution (terminal + execute_code)
  singularity_image: "docker://nikolaik/python-nodejs:python3.11-nodejs20"  # Container image for Singularity backend
  modal_image: "nikolaik/python-nodejs:python3.11-nodejs20"                 # Container image for Modal backend
  daytona_image: "nikolaik/python-nodejs:python3.11-nodejs20"               # Container image for Daytona backend
```

`terminal.temp_dir` は、local バックエンドでセッションの一時的な生成物（バックグラウンドの
プロセスのログ／pid／終了状態のファイル、コード実行のサンドボックス、あふれたツールの結果）を
どこに置くかを決めます。空（既定）のときは、環境に明示された
`TMPDIR`/`TMP`/`TEMP` があればそれに従い、なければ `/tmp` ではなく実ストレージ上の
管理ディレクトリ `~/.hermes/cache/terminal` を使います。多くのディストリビューション
（とくに Arch 系）では `/tmp` が小さな RAM 上の tmpfs で、負荷がかかると Hermes の
セッションの生成物で埋まってしまうからです。この管理ディレクトリは自動で掃除されます。
72 時間より古い生成物は、gateway の定期処理によって毎時、CLI だけの導入では
プロセスごとに 1 回、まとめて削除されます。ほかの場所へ向けたいときは、既存の絶対パスを
`temp_dir` に設定してください。利用者が指定したパスは自動削除の対象になりません。

`terminal.font_family` は Hermes Desktop に埋め込まれたターミナルの見た目を決めます。ローカルにインストール済みのフォントファミリー名 1 つ（たとえば `MesloLGS NF`）か、CSS のフォントスタックを指定できます。Hermes は同梱の JetBrains Mono のスタックをフォールバックとして後ろに足し、空の値なら既定のままです。同じ設定はプロファイル単位で **Settings → Appearance → Terminal Font** からも変えられます。Google Fonts のダウンロードやシステムフォントの許可は要りません。

Modal、Daytona、Vercel Sandbox といったクラウドのサンドボックスでは、`container_persistent: true` はサンドボックスが作り直されてもファイルシステムの状態を保とうとする、という意味です。同じサンドボックスの実体・PID 空間・バックグラウンドのプロセスがあとでも生きている、という約束ではありません。

### バックエンドの一覧 {#backend-overview}

| バックエンド | コマンドが動く場所 | 隔離 | 向いている用途 |
|---------|-------------------|-----------|----------|
| **local** | 手元の端末で直接 | なし | 開発、個人利用 |
| **docker** | 単一の常駐 Docker コンテナ（セッション・`/new`・サブエージェントで共有） | 完全（名前空間、ケーパビリティの剥奪） | 安全なサンドボックス、CI/CD |
| **ssh** | SSH 越しのリモートサーバー | ネットワークの境界 | リモート開発、強力なハードウェア |
| **modal** | Modal のクラウドサンドボックス | 完全（クラウドの VM） | 使い捨てのクラウド計算、評価 |
| **daytona** | Daytona のワークスペース | 完全（クラウドのコンテナ） | 管理されたクラウドの開発環境 |
| **vercel_sandbox** | Vercel Sandbox | 完全（クラウドの microVM） | スナップショットでファイルシステムを保つクラウド実行 |
| **singularity** | Singularity/Apptainer のコンテナ | 名前空間（--containall） | HPC クラスタ、共用の端末 |

### local バックエンド {#local-backend}

既定です。コマンドは手元の端末で、隔離なしにそのまま動きます。特別な準備は要りません。

```yaml
terminal:
  backend: local
```

既定では、ローカルのツールの子プロセスは OS ユーザーの本当の `HOME` をそのまま使います。
こうしておくと、`git`、`ssh`、`gh`、`az`、`npm`、Claude Code、Codex といった外部の CLI が、
普段のシェルで使っている認証情報と設定をそのまま見つけられます。Hermes 自身の状態は
`HERMES_HOME` によってプロファイル単位に分かれます。設定・メモリ・セッション・スキルの
選択に `HOME` は使われません。

Hermes はシステム全体の `HOME`、シェルの起動ファイル、OS アカウントのホームディレクトリを
変更**しません**。この設定が決めるのは、`terminal`、バックグラウンドのターミナルの
プロセス、`execute_code`、ACP の補助プロセスといったツールを通じて Hermes が起動する
子プロセスに渡す環境だけです。

#### `terminal.home_mode` {#terminalhomemode}

| モード | ホストへの導入 | コンテナ | 引き換えになるもの |
|---|---|---|---|
| `auto` | OS ユーザーの本当の `HOME` を使う | `{HERMES_HOME}/home` を使う | 推奨の既定。ホストの CLI はそのまま動き、コンテナの状態は残ります。 |
| `real` | OS ユーザーの本当の `HOME` を強制 | 見えていれば OS ユーザーの本当の `HOME` を強制 | 親プロセスが誤ってプロファイルのホームを `HOME` にした状態で起動してしまったときに役立ちます。 |
| `profile` | `{HERMES_HOME}/home` があればそれを使う | `{HERMES_HOME}/home` があればそれを使う | CLI の設定をプロファイルごとに厳密に分けられます。ただし通常の `~/.ssh`、`~/.gitconfig`、`~/.azure`、`~/.config/gh`、Claude/Codex の認証、npm の状態などは、プロファイルのホームの中で用意するかリンクしない限り見えません。 |

既定の弱点は、ホストのプロファイル同士が `~` の下にある同じ利用者レベルの CLI の
認証情報・設定を共有してしまう点です。git の別人格、SSH の鍵、GitHub CLI のログイン、
npm の設定、クラウド CLI のログインを分けたいプロファイルがあるなら、
`home_mode: profile` にして、そのプロファイルのホームの中でそれらを意図的に用意して
ください。

プロファイルごとにツールの設定を厳密に分けたいときは、次のように設定します。

```yaml
terminal:
  home_mode: profile
```

このモードでは、ツールの子プロセスは `{HERMES_HOME}/home` を `HOME` として使います。
Hermes は `HERMES_REAL_HOME` も設定するので、スクリプトは必要なときに実際の利用者の
ホームを見つけられます。コンテナのバックエンドは `auto` でも `{HERMES_HOME}/home` を
使い続けます。そのディレクトリが永続する Hermes のデータ領域にあるからです。

プロファイルの状態と本当の利用者のホームを区別したいスクリプトは、Hermes のデータには
`HERMES_HOME` を、アカウントのホームには `HERMES_REAL_HOME` を使ってください。

```python
from pathlib import Path

hermes_home = Path(os.environ["HERMES_HOME"])
real_home = Path(os.environ.get("HERMES_REAL_HOME", os.environ["HOME"]))
```

:::warning
エージェントは、あなたの利用者アカウントとまったく同じファイルシステムへのアクセス権を持ちます。使わせたくないツールは `hermes tools` で無効にするか、サンドボックス化のために Docker に切り替えてください。
:::

### docker バックエンド {#docker-backend}

セキュリティを固めた Docker のコンテナ（ケーパビリティをすべて剥奪、権限昇格の禁止、PID 数の上限）の中でコマンドを動かします。

**単一の常駐コンテナを、Hermes のプロセス間で共有します。** Hermes は最初の利用時に長く生きるコンテナを 1 つ起動し、その後は terminal・ファイル・`execute_code` のすべての呼び出しを `docker exec` で同じコンテナに通します。セッションをまたいでも、`/new`・`/reset` のあとでも、`delegate_task` のサブエージェントでも同じです。作業ディレクトリの変更、インストールしたパッケージ、`/workspace` のファイル、そして**バックグラウンドのプロセス**が、ツールの呼び出しの間でも、Hermes のプロセスの間でも引き継がれます。TUI のセッションを閉じても、`/quit` しても、新しく `hermes` を起動しても、コンテナは動き続け、次の Hermes のプロセスはラベルを手がかりに同じものを再利用します。取り壊しの正確な条件は下の **コンテナのライフサイクル** を参照してください。

**セッションごとに隔離するモード（`container_persistent: false`）。** docker バックエンドで `container_persistent: false` にすると、**セッションごとに 1 つ**のコンテナに切り替わります。どのチャット（デスクトップアプリのセッション、gateway の会話、TUI のセッション）も自分専用のまっさらなサンドボックスを持ち、最初のターミナル／ファイルの呼び出しで作られ、セッションが閉じるか `lifetime_seconds` を超えて放置されると削除されます。セッションの間には何も引き継がれません。ファイルシステムの状態も、マウントも、バックグラウンドのプロセスもです。`docker_mount_cwd_to_workspace: true` のときは、**そのセッションに結び付いた**ワークスペースだけが `/workspace` にマウントされます。ディレクトリが結び付いていない新しいセッションは、前のセッションのマウントを引き継がず、空のワークスペースになります。`delegate_task` のサブエージェントは、親のセッションのコンテナを引き続き共有します。会話と会話の間にセキュリティの境界を置きたいときはこのモードを、上に書いた長く生きる共有のコンテナがほしいときは既定の `true` を使ってください。

```yaml
terminal:
  backend: docker
  docker_image: "nikolaik/python-nodejs:python3.11-nodejs20"
  docker_mount_cwd_to_workspace: false  # Mount launch dir into /workspace
  docker_run_as_host_user: false   # See "Running container as host user" below
  docker_forward_env:              # Host env vars to forward into container
    - "GITHUB_TOKEN"
  docker_env:                      # Literal env vars to inject (KEY=value)
    DEBUG: "1"
    PYTHONUNBUFFERED: "1"
  docker_volumes:                  # Host directory mounts
    - "/home/user/projects:/workspace/projects"
    - "/home/user/data:/data:ro"   # :ro for read-only
  docker_extra_args:               # Extra flags appended verbatim to `docker run`
    - "--gpus=all"
    - "--network=host"
  docker_network: true             # false = air-gap the container (--network=none)

  # Resource limits
  container_cpu: 1                 # CPU cores (0 = unlimited)
  container_memory: 5120           # MB (0 = unlimited)
  container_disk: 51200            # MB (requires overlay2 on XFS+pquota)
  container_persistent: true       # true = persist /workspace + /root, shared container; false = fresh container per session (see below)

  # Cross-process container reuse (defaults match the "one long-lived
  # container shared across sessions" contract — see Container lifecycle).
  docker_persist_across_processes: true   # Reuse container across Hermes restarts
  docker_shared_container_key: ""         # Opt in trusted profiles to one identity
  docker_orphan_reaper: true              # Sweep abandoned Exited containers at startup

  # Cross-backend lifecycle settings (apply to docker as well)
  timeout: 180                     # Per-command timeout in seconds
  lifetime_seconds: 300            # Idle-reaper window; also feeds 2× orphan-reaper threshold
```

**`docker_env`** と **`docker_forward_env`** の違い: 前者は設定に書いた `KEY=value` をそのまま注入します（値は `config.yaml` に置くか、`TERMINAL_DOCKER_ENV='{"DEBUG":"1"}'` のように JSON の辞書で渡します）。後者はシェルや `~/.hermes/.env` から値を持ってくるので、本当の秘密情報が設定ファイルに現れません。トークンには `docker_forward_env` を、コンテナに必要な固定のつまみには `docker_env` を使ってください。

**`terminal.docker_extra_args`**（`TERMINAL_DOCKER_EXTRA_ARGS='["--gpus=all"]'` でも上書きできます）を使うと、Hermes が専用のキーとして用意していない `docker run` のフラグ（`--gpus`、`--network`、`--add-host`、別の `--security-opt` での上書きなど）を自由に渡せます。要素はすべて文字列でなければなりません。この一覧は組み立てた `docker run` の最後に足されるので、必要なら Hermes の既定を上書きできます。使いすぎには注意してください。サンドボックスの固め方（ケーパビリティの剥奪、`--user`、ワークスペースのバインドマウント）と衝突するフラグは、黙って隔離を弱めます。

**`terminal.docker_network`**（既定 `true`、環境変数は `TERMINAL_DOCKER_NETWORK`） — `false` にすると、サンドボックスのコンテナを `--network=none` で起動し、エージェントのコマンドからの外向きの通信をすべて断ちます。これは `terminal`、`execute_code`、ファイルのツールが使う実行用のコンテナに効きます。コンテナは Hermes のプロセスをまたいで残るため、ネットワークありの古いコンテナがあるときにこれを `false` へ切り替えると、そのコンテナは削除され、通信を遮断した新しいコンテナが起動します（警告がログに出ます）。中で動いていたバックグラウンドのプロセスは失われます。`docker_extra_args` に `--network=none` を書くより、このキーを使ってください。

**必要なもの:** Docker Desktop か Docker Engine が入っていて、動いていること。Hermes は `$PATH` に加えて macOS のよくある導入先（`/usr/local/bin/docker`、`/opt/homebrew/bin/docker`、Docker Desktop のアプリバンドル）も探します。Podman もそのまま使えます。両方入っているときは `HERMES_DOCKER_BINARY=podman`（またはフルパス）で強制してください。

#### コンテナのライフサイクル {#container-lifecycle}

Hermes が管理するコンテナには 3 つのラベルが付き、あとから起動したプロセス（と孤児の回収処理）がそれを見分けられるようになっています。

- `hermes-agent=1` — Hermes が管理していることを示します
- `hermes-task-id=<sanitized task_id>` — タスクごとの再利用の判定に使います
- `hermes-profile=<sanitized profile name>` — 既定では、再利用と回収の範囲を今のプロファイルに閉じます。`docker_shared_container_key` を設定した場合は、その正規化した値が代わりに使われます

起動時、Hermes は `docker ps --filter label=hermes-task-id=<id> --filter label=hermes-profile=<identity>` を実行し、見つかれば**既存のコンテナに接続します**。ここでいう identity は、`docker_shared_container_key` で信頼できるプロファイル同士を共通の値にそろえていない限り、今のプロファイルです。コンテナが `exited` の場合（Docker デーモンの再起動のあとなど）は `docker start` されて再利用されます。ファイルシステムの状態とインストール済みのパッケージは残りますが、コンテナの中のバックグラウンドのプロセスは残りません。

Hermes のプロセスが終了したとき（`/quit`、TUI のセッションを閉じる、gateway の停止、SIGKILL まで含めて）、既定のモードでは後始末は**コンテナに対して何もしません**。コンテナは動き続けます。次の Hermes のプロセスは、ラベルの検索を通じてミリ秒で接続します。これが「セッションをまたいで共有される、長く生きるコンテナが 1 つ」という約束に必要なふるまいです。バックグラウンドのプロセス（npm の watcher、開発サーバー、長く走る pytest）をセッションをまたいで残す方法はこれしかありません。

**コンテナが取り壊される（停止して `docker rm -f` される）のは、次の場合だけです。**

| きっかけ | 発動する条件 |
|---|---|
| `docker_persist_across_processes: false` | プロセスごとの隔離を明示した場合。`cleanup()` のたびに `stop` + `rm -f` します。issue #20561 より前のふるまいと同じです。 |
| 放置の回収（`lifetime_seconds`、既定 300 秒） | 環境が `persist_across_processes=false` のときだけ動きます。persist モードでは何もせず、コンテナは放置の一掃を生き延びます。 |
| 次の起動時の孤児の回収 | `2 × lifetime_seconds`（既定 600 秒 = 10 分）より古い、hermes のラベルが付いた **Exited** のコンテナを一掃します。範囲は今のプロファイルです。**動作中のコンテナには決して触れません** — 並行して動く別のプロセスを守るためです。`docker_orphan_reaper: false` で無効にできます。 |
| 利用者の直接の操作 | `docker rm -f`、`docker system prune`、Docker Desktop の再起動。`--restart=always` は付けていないので、ホストを再起動するとコンテナは `Exited` になります（CoW のレイヤーは残り次の起動で再利用されますが、バックグラウンドのプロセスは消えます）。 |

知っておくとよい境目のできごと:

- **コンテナの中の PID 1 が OOM で kill される**と、コンテナは `Exited` になります。次の再利用で `docker start` され、ファイルシステムの状態は残りますが、バックグラウンドのプロセスは残りません。
- **プロファイルの切り替え**はコンテナ同士を隔離します。`hermes-profile=work` のラベルが付いたコンテナは、`hermes-profile=research` で動いている Hermes のプロセスからは見えません。孤児の回収もプロファイル単位なので、別のプロファイルのコンテナが誤って回収されることはありませんが、そのプロファイルで Hermes をもう一度起動するまで自動では片づきません。
- **プロファイルをまたいで意図的に共有する** — 1 つの信頼できるワークスペースで協働させたいプロファイルには、`terminal:` の下に同じ空でない `docker_shared_container_key` を設定します。これはコンテナの identity のラベルだけを置き換えるもので、タスク・外向きの通信・ネットワークの整合性の確認は従来どおり働きます。キーを持たないプロファイルは隔離されたままです。identity のラベルはキーから短いダイジェストを付けて作られるので、似た見た目のキー（`team/workspace` と `team_workspace`）が同じコンテナに衝突することはありません。**重要: 共有のコンテナは、最初に起動したプロファイルによって一度だけ作られます。** そのプロファイルの `docker_image`、ボリューム、shm の大きさなど、あとから変えられない Docker の設定が採用され、あとから来たプロファイルはそのまま接続します。設定が違っていても、コンテナを削除して作り直すまでは無視されます。キーを共有するプロファイル同士は、イメージとマウントを合わせておいてください。

`delegate_task(tasks=[...])` で並列に起動したサブエージェントは、この 1 つのコンテナを共有します。同時の `cd`、環境変数の書き換え、同じパスへの書き込みはぶつかります。サブエージェントに独立したサンドボックスが必要なら、`register_task_env_overrides()` でタスクごとのイメージの上書きを登録しなければなりません。RL やベンチマークの環境（TerminalBench2、HermesSweEnv など）は、タスクごとの Docker のイメージのためにこれを自動で行っています。

**セキュリティの固め方:**
- `--cap-drop ALL` のうえで `DAC_OVERRIDE`、`CHOWN`、`FOWNER` だけを戻す
- `--security-opt no-new-privileges`
- `--pids-limit 256`
- `/tmp`（512MB）、`/var/tmp`（256MB）、`/run`（64MB）にサイズ上限付きの tmpfs

**認証情報の受け渡し:** `docker_forward_env` に並べた環境変数は、まずシェルの環境から、次に `~/.hermes/.env` から解決されます。スキルは `required_environment_variables` を宣言でき、それらは自動でまとめられます。

#### 環境変数による上書き {#environment-variable-overrides}

`terminal:` の下のすべてのキーには、`TERMINAL_<KEY_UPPERCASE>` という形の環境変数の上書きがあります。docker バックエンドでよく使うものは次のとおりです。

| 環境変数 | 対応するキー | 備考 |
|---|---|---|
| `TERMINAL_DOCKER_IMAGE` | `docker_image` | ベースのイメージ |
| `TERMINAL_DOCKER_FORWARD_ENV` | `docker_forward_env` | JSON の配列: `'["GITHUB_TOKEN","OPENAI_API_KEY"]'` |
| `TERMINAL_DOCKER_ENV` | `docker_env` | JSON の辞書: `'{"DEBUG":"1"}'` |
| `TERMINAL_DOCKER_VOLUMES` | `docker_volumes` | `"host:container[:ro]"` 形式の文字列の JSON の配列 |
| `TERMINAL_DOCKER_EXTRA_ARGS` | `docker_extra_args` | JSON の配列 |
| `TERMINAL_DOCKER_MOUNT_CWD_TO_WORKSPACE` | `docker_mount_cwd_to_workspace` | `true` / `false` |
| `TERMINAL_DOCKER_RUN_AS_HOST_USER` | `docker_run_as_host_user` | `true` / `false` |
| `TERMINAL_DOCKER_NETWORK` | `docker_network` | `true` / `false` — 既定は `true`。`false` は `--network=none` |
| `TERMINAL_DOCKER_PERSIST_ACROSS_PROCESSES` | `docker_persist_across_processes` | `true` / `false` — 既定は `true` |
| `TERMINAL_DOCKER_SHARED_CONTAINER_KEY` | `docker_shared_container_key` | 信頼できるプロファイル同士で共有する identity。既定は空 |
| `TERMINAL_DOCKER_ORPHAN_REAPER` | `docker_orphan_reaper` | `true` / `false` — 既定は `true` |
| `TERMINAL_CONTAINER_CPU` | `container_cpu` | CPU のコア数 |
| `TERMINAL_CONTAINER_MEMORY` | `container_memory` | MB |
| `TERMINAL_CONTAINER_DISK` | `container_disk` | MB |
| `TERMINAL_CONTAINER_PERSISTENT` | `container_persistent` | `true` / `false` — バインドマウントするワークスペースのディレクトリを決めます。`docker_persist_across_processes` とは別物です |
| `TERMINAL_LIFETIME_SECONDS` | `lifetime_seconds` | 放置の回収までの時間 |
| `TERMINAL_TEMP_DIR` | `temp_dir` | セッションの一時領域の起点（local バックエンド） |
| `TERMINAL_TIMEOUT` | `timeout` | コマンドごとのタイムアウト |
| `HERMES_DOCKER_BINARY` | _なし_ | 使う docker/podman のバイナリのパスを強制します |

### ssh バックエンド {#ssh-backend}

SSH 越しにリモートサーバーでコマンドを動かします。接続の再利用には ControlMaster を使います（アイドルの保持は 5 分）。常駐シェルは既定で有効なので、状態（作業ディレクトリ、環境変数）はコマンドをまたいで残ります。

```yaml
terminal:
  backend: ssh
  persistent_shell: true           # Keep a long-lived bash session (default: true)
```

**必要な環境変数:**

```bash
TERMINAL_SSH_HOST=my-server.example.com
TERMINAL_SSH_USER=ubuntu
```

**任意:**

| 変数 | 既定値 | 説明 |
|----------|---------|-------------|
| `TERMINAL_SSH_PORT` | `22` | SSH のポート |
| `TERMINAL_SSH_KEY` | （システムの既定） | SSH 秘密鍵のパス |
| `TERMINAL_SSH_PERSISTENT` | `true` | 常駐シェルを有効にする |

**仕組み:** 初期化時に `BatchMode=yes` と `StrictHostKeyChecking=accept-new` で接続します。常駐シェルはリモート側で `bash -l` のプロセスを 1 つ生かし続け、一時ファイル経由でやり取りします。`stdin_data` や `sudo` が必要なコマンドは、自動で 1 回きりのモードに切り替わります。

### modal バックエンド {#modal-backend}

[Modal](https://modal.com) のクラウドサンドボックスでコマンドを動かします。タスクごとに独立した VM が割り当てられ、CPU・メモリ・ディスクを設定できます。ファイルシステムはセッションをまたいでスナップショット／復元できます。

```yaml
terminal:
  backend: modal
  container_cpu: 1                 # CPU cores
  container_memory: 5120           # MB (5GB)
  container_disk: 51200            # MB (50GB)
  container_persistent: true       # Snapshot/restore filesystem
```

**必要なもの:** `MODAL_TOKEN_ID` と `MODAL_TOKEN_SECRET` の環境変数、または `~/.modal.toml` の設定ファイル。

**永続化:** 有効にすると、後始末のときにサンドボックスのファイルシステムがスナップショットされ、次のセッションで復元されます。スナップショットは `~/.hermes/modal_snapshots.json` で管理されます。残るのはファイルシステムの状態であって、動作中のプロセス・PID 空間・バックグラウンドのジョブではありません。

**認証情報のファイル:** `~/.hermes/` から自動でマウントされ（OAuth のトークンなど）、コマンドのたびに同期されます。

### daytona バックエンド {#daytona-backend}

[Daytona](https://daytona.io) の管理ワークスペースでコマンドを動かします。永続化のために停止／再開に対応しています。

```yaml
terminal:
  backend: daytona
  container_cpu: 1                 # CPU cores
  container_memory: 5120           # MB → converted to GiB
  container_disk: 10240            # MB → converted to GiB (max 10 GiB)
  container_persistent: true       # Stop/resume instead of delete
```

**必要なもの:** `DAYTONA_API_KEY` の環境変数。

**永続化:** 有効にすると、後始末のときにサンドボックスは削除されず停止され、次のセッションで再開されます。サンドボックスの名前は `hermes-{task_id}` の形になります。

**ディスクの上限:** Daytona は最大 10 GiB を強制します。これを超える要求は警告付きで丸められます。

### vercel_sandbox バックエンド {#vercel-sandbox-backend}

[Vercel Sandbox](https://vercel.com/docs/vercel-sandbox) のクラウド microVM でコマンドを動かします。Hermes は通常のターミナルとファイルのツールをそのまま使います。Vercel 専用のモデル向けツールはありません。

```yaml
terminal:
  backend: vercel_sandbox
  vercel_runtime: node24          # node24 | node22 | python3.13
  cwd: /vercel/sandbox            # default workspace root
  container_persistent: true      # Snapshot/restore filesystem
  container_disk: 51200           # Shared default only; custom disk is unsupported
```

**必要な導入:** 任意の SDK の追加分をインストールします。

```bash
pip install 'hermes-agent[vercel]'
```

**必要な認証:** `VERCEL_TOKEN`、`VERCEL_PROJECT_ID`、`VERCEL_TEAM_ID` の 3 つをすべて設定して、アクセストークンによる認証を構成します。Render、Railway、Docker などのホストでのデプロイや、通常の長時間動く Hermes のプロセスでは、これが正式な構成です。

ローカルでの一度きりの開発用に、短命の Vercel OIDC トークンも受け付けます。

```bash
VERCEL_OIDC_TOKEN="$(vc project token <project-name>)" hermes chat
```

Vercel のプロジェクトと結び付いたディレクトリからなら、プロジェクト名は省略できます。

```bash
VERCEL_OIDC_TOKEN="$(vc project token)" hermes chat
```

OIDC のトークンは短命なので、デプロイの正式な経路として使うべきではありません。

**ランタイム:** `terminal.vercel_runtime` は `node24`、`node22`、`python3.13` に対応します。未設定なら `node24` になります。

**永続化:** `container_persistent: true` のとき、Hermes は後始末の際にサンドボックスのファイルシステムをスナップショットし、同じタスクの次のサンドボックスをそこから復元します。スナップショットには、サンドボックスへコピーされた Hermes の認証情報・スキル・キャッシュのファイルが含まれることがあります。残るのはファイルシステムの状態だけで、サンドボックスの同一性・PID 空間・シェルの状態・動作中のバックグラウンドのプロセスは残りません。

**バックグラウンドのコマンド:** `terminal(background=true)` は、Hermes の汎用の（ローカル以外向けの）バックグラウンドプロセスの仕組みを使います。サンドボックスが生きている間は、通常のプロセスのツールから起動・状態確認・待機・ログ表示・終了ができます。後始末や再起動のあとに、Vercel 側の切り離されたプロセスを復旧する機能は Hermes にはありません。

**ディスクの大きさ:** Vercel Sandbox は今のところ Hermes の `container_disk` というつまみに対応していません。`container_disk` は未設定のままにするか、共通の既定値 `51200` にしてください。それ以外の値は黙って無視されるのではなく、診断とバックエンドの生成が失敗します。

### singularity/apptainer バックエンド {#singularityapptainer-backend}

[Singularity/Apptainer](https://apptainer.org) のコンテナでコマンドを動かします。Docker が使えない HPC クラスタや共用の端末向けです。

```yaml
terminal:
  backend: singularity
  singularity_image: "docker://nikolaik/python-nodejs:python3.11-nodejs20"
  container_cpu: 1                 # CPU cores
  container_memory: 5120           # MB
  container_persistent: true       # Writable overlay persists across sessions
```

**必要なもの:** `$PATH` に `apptainer` か `singularity` のバイナリがあること。

**イメージの扱い:** Docker の URL（`docker://...`）は自動で SIF ファイルに変換され、キャッシュされます。既存の `.sif` ファイルはそのまま使われます。

**作業用ディレクトリ:** 次の順で解決されます。`TERMINAL_SCRATCH_DIR` → `TERMINAL_SANDBOX_DIR/singularity` → `/scratch/$USER/hermes-agent`（HPC の慣習） → `~/.hermes/sandboxes/singularity`。

**隔離:** `--containall --no-home` を使い、ホストのホームディレクトリをマウントせずに名前空間を完全に分けます。

### ターミナルのバックエンドでよくある問題 {#common-terminal-backend-issues}

ターミナルのコマンドがすぐ失敗する、あるいはターミナルのツールが無効だと表示される場合は、次を確認してください。

- **local** — 特別な準備は要りません。使い始めるときに最も安全な既定です。
- **docker** — `docker version` を実行して Docker が動いているか確かめます。失敗するなら Docker を直すか、`hermes config set terminal.backend local` に切り替えてください。
- **ssh** — `TERMINAL_SSH_HOST` と `TERMINAL_SSH_USER` の両方が必要です。どちらかが欠けていれば Hermes がはっきりしたエラーをログに出します。
- **modal** — `MODAL_TOKEN_ID` の環境変数か `~/.modal.toml` が要ります。`hermes doctor` で確認してください。
- **daytona** — `DAYTONA_API_KEY` が要ります。サーバー URL の設定は Daytona の SDK が面倒を見ます。
- **singularity** — `$PATH` に `apptainer` か `singularity` が要ります。HPC クラスタではよく入っています。

迷ったら `terminal.backend` を `local` に戻し、まずそこでコマンドが動くことを確かめてください。

### 後始末時にリモートからホストへ状態を戻す {#remote-to-host-state-sync-on-teardown}

**ssh**、**modal**、**daytona** のバックエンドでは、Hermes はセッションの間、`~/.hermes/` の状態（認証情報のファイル、スキル、キャッシュ）をリモートのサンドボックスへ送り込み、後始末のときに**変更のあった状態ファイルを元の場所へ戻します**。最初に送ったものと内容が変わっているファイル（内容のハッシュで比較します）はその場に書き戻され、同期対象ディレクトリの下にリモートで新しくできたファイル（エージェントがリモートで作ったスキルなど）は、対応するホストのパスへ割り当てられます。送るだけの認証情報のファイルが、ホスト側で上書きされることはありません。

- 書き戻しは待ち時間を伸ばしながら最大 3 回まで再試行し、2 GiB を超えるリモートのアーカイブは展開しません。
- docker と singularity はバインドマウント（ホストのファイルシステムをそのまま見る形）なので、この処理は要りません。
- 対象は Hermes の状態（`~/.hermes/`）であって、サンドボックスの中の任意の作業ファイルでは**ありません**。大事な成果物は、サンドボックスが壊される前にエージェントに明示的に取り出させてください（`scp`、`modal volume put` など）。

### docker のボリュームのマウント {#docker-volume-mounts}

docker バックエンドでは、`docker_volumes` によってホストのディレクトリをコンテナと共有できます。各要素は Docker の `-v` と同じ書き方です: `host_path:container_path[:options]`。

```yaml
terminal:
  backend: docker
  docker_volumes:
    - "/home/user/projects:/workspace/projects"   # Read-write (default)
    - "/home/user/datasets:/data:ro"              # Read-only
    - "/home/user/.hermes/cache/documents:/output" # Gateway-visible exports
```

次のような場面で役に立ちます。

- エージェントに**ファイルを渡す**（データセット、設定、参考のコード）
- エージェントから**ファイルを受け取る**（生成されたコード、レポート、書き出し）
- あなたとエージェントが同じファイルを触る**共有の作業場**

メッセージングの gateway を使っていて、生成したファイルを
`MEDIA:/...` でエージェントに送らせたいなら、
`/home/user/.hermes/cache/documents:/output` のように、ホストから見える専用の書き出し用マウントを用意してください。

- Docker の中では `/output/...` にファイルを書く
- `MEDIA:` には**ホスト側のパス**を出す。例:
  `MEDIA:/home/user/.hermes/cache/documents/report.txt`
- ホスト側の gateway のプロセスからもそのパスがまったく同じ形で存在する場合を除き、
  `/workspace/...` や `/output/...` を出さ**ない**

:::warning
YAML は同じキーが重なると、あとのものが黙って前を上書きします。すでに
`docker_volumes:` のブロックがあるなら、あとからもう 1 つ `docker_volumes:` を
足すのではなく、同じ一覧に新しいマウントを書き足してください。
:::

環境変数でも設定できます: `TERMINAL_DOCKER_VOLUMES='["/host:/container"]'`（JSON の配列）。

### docker への認証情報の受け渡し {#docker-credential-forwarding}

既定では、docker のターミナルのセッションはホストの認証情報を無条件に引き継ぎません。特定のトークンをコンテナの中で使いたいときは、`terminal.docker_forward_env` に足してください。

```yaml
terminal:
  backend: docker
  docker_forward_env:
    - "GITHUB_TOKEN"
    - "NPM_TOKEN"
```

Hermes は並べた変数を、まず今のシェルから解決し、`hermes config set` で保存されていれば `~/.hermes/.env` にさかのぼって探します。

:::warning
`docker_forward_env` に並べたものは、コンテナの中で動くコマンドから見えるようになります。ターミナルのセッションに晒しても構わない認証情報だけを渡してください。
:::

### コンテナをホストの利用者として動かす {#running-the-container-as-your-host-user}

既定では、Docker のコンテナは `root`（UID 0）として動きます。`/workspace` やほかのバインドマウントの中で作られたファイルは、ホスト側では root の所有になるため、セッションのあとにホストのエディタで編集するには `sudo chown` が要ります。`terminal.docker_run_as_host_user` はこれを解決します。

```yaml
terminal:
  backend: docker
  docker_run_as_host_user: true   # default: false
```

有効にすると、Hermes は `docker run` に `--user $(id -u):$(id -g)` を足すので、バインドマウントしたディレクトリ（`/workspace`、`/root`、`docker_volumes` のすべて）に書かれたファイルは root ではなくホストのあなたの所有になります。引き換えに、コンテナは `apt install` ができなくなり、`/root/.npm` のような root 所有のパスにも書けなくなります。両方が必要なら、`HOME` が root 以外の利用者の所有になっているベースイメージを使うか、必要な道具をイメージのビルド時に入れておいてください。

これまでどおりのふるまいがよければ `false`（既定）のままにしてください。作業のほとんどが「マウントしたホストのファイルを編集すること」で、`sudo chown -R` にうんざりしているなら有効にしてください。

### 任意: 起動したディレクトリを `/workspace` にマウントする {#optional-mount-the-launch-directory-into-workspace}

Docker のサンドボックスは既定で隔離されたままです。Hermes は、明示的に有効にしない限り、今のホストの作業ディレクトリをコンテナに渡し**ません**。

`config.yaml` で有効にします。

```yaml
terminal:
  backend: docker
  docker_mount_cwd_to_workspace: true
```

有効にすると:
- `~/projects/my-app` で Hermes を起動した場合、そのホストのディレクトリが `/workspace` にバインドマウントされます
- docker バックエンドは `/workspace` から始まります
- ファイルのツールもターミナルのコマンドも、同じマウントされたプロジェクトを見ます

無効のときは、`docker_volumes` で明示的に何かをマウントしない限り、`/workspace` はサンドボックスのものです。

セキュリティ上の引き換え:
- `false` はサンドボックスの境界を保ちます
- `true` は Hermes を起動したディレクトリに、サンドボックスから直接アクセスできるようにします

コンテナに、生きたホストのファイルを触らせたいと意図したときだけ有効にしてください。

### 常駐シェル {#persistent-shell}

既定では、ターミナルのコマンドはそれぞれ独立した子プロセスで動くため、作業ディレクトリ・環境変数・シェル変数はコマンドごとにリセットされます。**常駐シェル**を有効にすると、`execute()` の呼び出しをまたいで 1 つの bash のプロセスが生き続け、状態がコマンドの間で残ります。

これがいちばん効くのは **ssh バックエンド**で、コマンドごとの接続の手間もなくなります。常駐シェルは **ssh では既定で有効**、local バックエンドでは無効です。

```yaml
terminal:
  persistent_shell: true   # default — enables persistent shell for SSH
```

無効にするには:

```bash
hermes config set terminal.persistent_shell false
```

**コマンドをまたいで残るもの:**
- 作業ディレクトリ（`cd /tmp` が次のコマンドにも効きます）
- エクスポートした環境変数（`export FOO=bar`）
- シェル変数（`MY_VAR=hello`）

**優先順位:**

| 層 | 変数 | 既定値 |
|-------|----------|---------|
| 設定 | `terminal.persistent_shell` | `true` |
| ssh の上書き | `TERMINAL_SSH_PERSISTENT` | 設定に従う |
| local の上書き | `TERMINAL_LOCAL_PERSISTENT` | `false` |

バックエンドごとの環境変数がいちばん強く効きます。local バックエンドでも常駐シェルを使いたいときは:

```bash
export TERMINAL_LOCAL_PERSISTENT=true
```

:::note
`stdin_data` や sudo が必要なコマンドは、自動で 1 回きりのモードに切り替わります。常駐シェルの標準入力は、すでに内部のやり取りの仕組みが使っているからです。
:::

各バックエンドの詳細は [Code Execution](/hermes/docs/user-guide/features/code-execution/) と [Terminal section of the README](/hermes/docs/user-guide/features/tools/) を参照してください。

## スキルの設定 {#skill-settings}

スキルは、自分の SKILL.md の frontmatter で独自の設定項目を宣言できます。これは秘密情報ではない値（パス、好み、分野ごとの設定）で、`config.yaml` の `skills.config` の名前空間に保存されます。

```yaml
skills:
  config:
    myplugin:
      path: ~/myplugin-data   # Example — each skill defines its own keys
```

**スキルの設定の仕組み:**

- `hermes config migrate` は有効なスキルをすべて調べ、未設定の項目を見つけて、その場で入力を促します
- `hermes config show` はすべてのスキルの設定を「Skill Settings」の見出しの下に、どのスキルのものかとあわせて表示します
- スキルが読み込まれるとき、解決された設定値はスキルの文脈へ自動で渡されます

**値を手で設定する:**

```bash
hermes config set skills.config.myplugin.path ~/myplugin-data
```

自作のスキルで設定項目を宣言する方法は [Creating Skills — Config Settings](/hermes/docs/developer-guide/creating-skills/#config-settings-configyaml) を参照してください。

### エージェントが作るスキルの書き込みを見張る {#guard-on-agent-created-skill-writes}

エージェントが `skill_manage` でスキルを作成・編集・パッチ・削除するとき、Hermes は新しい／更新された内容を危険なキーワードのパターン（認証情報の収集、あからさまなプロンプトインジェクション、情報の持ち出しの指示）で検査できます。この検査は**既定では無効**です。`~/.ssh/` を正当に触ったり `$OPENAI_API_KEY` に言及したりする本物の作業が、この経験則に引っかかりすぎたためです。エージェントのスキルの書き込みが着地する前に確認を求めたいなら、有効に戻してください。

```yaml
skills:
  guard_agent_created: true   # default: false
```

有効にすると、引っかかった `skill_manage` の書き込みは、検査の根拠付きの承認の確認として表示されます。承認された書き込みは着地し、拒否された書き込みはエージェントに理由付きのエラーを返します。

### スキルの書き込みの承認 {#write-approval-for-skill-writes}

上の内容の検査とは別に、`skills.write_approval` はエージェントによるスキルの書き込み**すべて**（作成／編集／パッチ／削除／付随ファイル）を、あなたの明示的な承認の後ろに置きます。危険なコマンドと同じ承認／拒否の仕組みです。

```yaml
skills:
  write_approval: false   # false = write freely (default) | true = stage every write for review
```

有効にすると、スキルの書き込みは `~/.hermes/pending/skills/` に置かれ、`/skills pending`、`/skills diff <id>`、`/skills approve <id>`、`/skills reject <id>` で確認します。CLI からでも、どのメッセージングのプラットフォームからでも操作できます。動作中の切り替えは `/skills approval on|off` です。メモリにも同じ関門があります（下の `memory.write_approval`）。全体の流れは [Gating agent skill writes](/hermes/docs/user-guide/features/skills/#gating-agent-skill-writes-skillswrite_approval) を参照してください。

## メモリの設定 {#memory-configuration}

```yaml
memory:
  memory_enabled: true
  user_profile_enabled: true
  memory_char_limit: 2200   # ~800 tokens
  user_char_limit: 1375     # ~500 tokens
  write_approval: false     # true = require approval before any memory write
```

`memory.write_approval: true` にすると、メモリへの書き込みは着地する前にあなたの承認が要ります。対話的な CLI のやり取りではその場で確認され、メッセージングのセッションと背後で走る自己改善の見直しは、書き込みを `/memory pending` → `/memory approve <id>` / `/memory reject <id>` の確認に回します。動作中の切り替えは `/memory approval on|off` です。[Controlling memory writes](/hermes/docs/user-guide/features/memory/#controlling-memory-writes-write_approval) を参照してください。

## 文脈ファイルの切り詰め {#context-file-truncation}

自動で読み込まれる文脈ファイルから、先頭／末尾の切り詰めを適用する前にどれだけ読み込むかを決めます。これは `SOUL.md`、`.hermes.md`、`AGENTS.md`、`CLAUDE.md`、`.cursorrules` のように、システムプロンプトへ差し込まれるファイルに効きます。`read_file` ツールには影響し**ません**。

```yaml
context_file_max_chars: null  # default — dynamic cap scaled to the model's context window (floor 20K, ceiling 500K chars)
```

動的なふるまいの代わりに固定の上限にしたいときは、正の整数を設定します。

```yaml
context_file_max_chars: 25000
```

## ファイル読み取りの安全策 {#file-read-safety}

`read_file` の 1 回の呼び出しが返せる量を決めます。上限を超える読み取りは拒否され、`offset` と `limit` で範囲を狭めるようエージェントに伝えるエラーが返ります。これによって、minify された JS の束や大きなデータファイルを一度読んだだけでコンテキストが埋まる事態を防ぎます。

```yaml
file_read_max_chars: 100000  # default — ~25-35K tokens
```

コンテキストが大きいモデルを使っていて大きなファイルをよく読むなら上げてください。コンテキストが小さいモデルでは、読み取りを効率よく保つために下げてください。

```yaml
# Large context model (200K+)
file_read_max_chars: 200000

# Small local model (16K context)
file_read_max_chars: 30000
```

エージェントはファイルの読み取りを自動で重複排除もします。同じファイルの同じ範囲を 2 回読み、その間にファイルが変わっていなければ、内容を送り直す代わりに軽い代替の印が返ります。これはコンテキストの圧縮でリセットされるので、内容が要約で消えたあとにエージェントは読み直せます。

## ツール出力の切り詰めの上限 {#tool-output-truncation-limits}

関連する 3 つの上限が、Hermes が切り詰める前にツールが返せる生の出力量を決めます。

```yaml
tool_output:
  max_bytes: 50000        # terminal output cap (chars)
  max_lines: 2000         # read_file pagination cap
  max_line_length: 2000   # per-line cap in read_file's line-numbered view
```

- **`max_bytes`** — `terminal` のコマンドが標準出力と標準エラーを合わせてこの文字数を超えると、Hermes は先頭 40% と末尾 60% を残し、その間に `[OUTPUT TRUNCATED]` の断りを挟みます。既定は `50000`（よくあるトークナイザで 12〜15K トークン程度）。
- **`max_lines`** — `read_file` 1 回あたりの `limit` の上限です。これを超える要求は丸められ、1 回の読み取りでコンテキストが埋まらないようにします。既定は `2000`。
- **`max_line_length`** — `read_file` が行番号付きの表示を出すときの、1 行あたりの上限です。これより長い行はこの文字数で切られ、`... [truncated]` が付きます。既定は `2000`。

コンテキストが大きく、呼び出しごとにより多くの生の出力を許せるモデルでは上げてください。コンテキストが小さいモデルでは、ツールの結果を小さく保つために下げてください。

```yaml
# Large context model (200K+)
tool_output:
  max_bytes: 150000
  max_lines: 5000

# Small local model (16K context)
tool_output:
  max_bytes: 20000
  max_lines: 500
```

### ツール結果のあふれ出しの予算 {#tool-result-spillover-budget}

切り詰めとは別に、大きすぎるツールの*結果*は切られるのではなくディスクへあふれ出します。全文は `$HERMES_HOME/cache/spillover/` の下に保存され、コンテキストの中身は要約の一部と保存先のパスに置き換わります（`read_file` の `offset`/`limit` で読めますし、`execute_code` で処理もできます）。結果 1 件あたりの一般のあふれ出しのしきい値は 100,000 文字で、コンテキストが小さいモデルでは自動的に下がります。

MCP のツールの結果（`mcp_*` という名前のツール）は、より厳しい **50,000 文字**が既定です。MCP のサーバーは、ページ分割されない大きな内容（ツール一覧のカタログ、まとめて実行した結果）をよく返します。それらは一般のしきい値の下に収まってしまい、以降のやり取りのたびにコンテキストを膨らませます。失われるものはありません。全文はディスクに残ります。しきい値の変更は次のとおりです。

```yaml
tool_budget:
  mcp_result_size_chars: 50000   # per-result spillover threshold for mcp_* tools
```

MCP のしきい値は、（コンテキストに応じて縮むこともある）一般の結果 1 件あたりのしきい値で必ず頭打ちになります。そのため、上げても今のモデルの窓が許す量を超えることはできません。

Hermes は**プロバイダ側での省略**にも印を付けます。MCP や web のツールの結果に、それ自体の切り詰めの目印（`...N more items`、`"has_more": true`、「サンドボックスに保存した」旨の注記）が含まれていると、見えているデータが不完全であり、列挙が全部そろっていると見なす前にページをたどるか取得し直すべきだ、という 1 行の注意が結果の末尾に足されます。

## ツールセットの一括の無効化 {#global-toolset-disable}

CLI とすべての gateway のプラットフォームで、特定のツールセットを一箇所で
まとめて止めたいときは、`agent.disabled_toolsets` に名前を並べます。

```yaml
agent:
  disabled_toolsets:
    - memory       # hide memory tools + MEMORY_GUIDANCE injection
    - web          # no web_search / web_extract anywhere
```

これはプラットフォームごとのツールの設定（`hermes tools` が書き込む
`platform_toolsets`）の**あと**に適用されるので、ここに並べたツールセットは
必ず外れます。プラットフォームの保存済み設定にまだ載っていてもです。
`hermes tools` の画面で 15 以上のプラットフォームの行を編集するのではなく、
「これをどこでも切る」という 1 つのスイッチがほしいときに使ってください。

一覧を空にする、あるいはキーごと書かない場合は何も起きません。

## git worktree による隔離 {#git-worktree-isolation}

同じリポジトリで複数のエージェントを並列に動かすために、独立した git の worktree を有効にします。

```yaml
worktree: true    # Always create a worktree (same as hermes -w)
# worktree: false # Default — only when -w flag is passed
```

有効にすると、CLI のセッションごとに `.worktrees/` の下へ新しい worktree が、専用のブランチとともに作られます。エージェントたちは互いに干渉せずにファイルを編集し、コミットし、push し、PR を作れます。きれいな worktree は終了時に削除され、変更が残っているものは手で回収できるように残されます。

既定では、新しい worktree は**取得し直したリモートの先端**（今のブランチの upstream、なければリモートの既定ブランチ）から分岐するので、ローカルのクローンの古いかもしれない `HEAD` ではなく、プロジェクトの最新から始まります。こうすると PR の差分は、ローカルのクローンが遅れていた分を巻き込まず、本当の変更だけに収まります。ローカルの `HEAD` から分岐したいときは `worktree_sync: false` にしてください。オフラインのときや、クローンの今の状態そのものを土台にしたいときに便利です。リモートに届かない場合は、自動でローカルの `HEAD` に切り替わります。

```yaml
worktree_sync: true    # Default — branch from the fetched remote tip
# worktree_sync: false # Branch from local HEAD (offline / pinned base)
```

リポジトリのルートに `.worktreeinclude` を置けば、gitignore されているファイルのうち worktree にコピーするものを並べられます。

```
# .worktreeinclude
.env
.venv/
node_modules/
```

## コンテキストの圧縮 {#context-compression}

Hermes は、モデルのコンテキストの窓に収まるよう、長い会話を自動で圧縮します。圧縮の要約は別の LLM 呼び出しなので、どのプロバイダやエンドポイントにも向けられます。

圧縮の設定はすべて `config.yaml` にあります（環境変数はありません）。

### 全項目の一覧 {#full-reference}

```yaml
compression:
  enabled: true                                     # Toggle compression on/off
  progress_notices: false                           # Opt-in: deliver routine compression progress notices to chat platforms — see below
  threshold: 0.50                                   # Compress at this % of context limit
  threshold_tokens: null                            # Absolute token cap (optional) — takes lower of ratio vs absolute
  target_ratio: 0.20                                # Fraction of threshold to preserve as recent tail
  tail_mode: lean                                   # Tail retention: "lean" (default — clamped 2.5% tail, 10K-25K, with a detailed session log + anchor index + session_search recovery pointers in the summary, all from ONE auxiliary summarizer call; ~3x fewer retained tokens after compaction) or "legacy" (0.20×threshold verbatim tail)
  protect_last_n: 20                                # Min recent messages to keep uncompressed
  protect_first_n: 3                                # Non-system head messages pinned across compactions (0 = pin nothing)
  in_place: true                                    # Compact on the same session id (no rotation) — see below
  idle_compact_after_seconds: 0                     # Opt-in idle compaction (0 = disabled) — see below
  hygiene_hard_message_limit: 5000                  # Gateway safety valve — see below
  hygiene_timeout_seconds: 30                       # Max seconds of NO summary-model output before hygiene compression is cut off
  hygiene_total_ceiling_seconds: 600                # Absolute cap on the hygiene wait even while tokens are still streaming
  hygiene_max_turn_hold_seconds: 10                 # Max wall-clock the incoming turn waits on hygiene compression before proceeding uncompressed — see below
  hygiene_failure_cooldown_seconds: 300             # First rung of the per-session hygiene-failure backoff (x1/x3/x9, capped at 1h)
  context_timeout_seconds: 120                      # Inactivity budget for in-agent compress_context (loop /compress / preflight) — see below
  context_total_ceiling_seconds: 600                # Absolute cap on the *pre-commit* in-agent compress_context wait even while tokens are still streaming (an already-started SessionDB commit is never abandoned; overruns are logged + surfaced)
  proactive_prune_tokens: 0                         # Opt-in tokens trigger for the no-LLM tool-result prune (0 = off; see below)
  proactive_prune_min_result_chars: 8000            # Prune's summarize pass only touches tool results larger than this (clamped >= 200)
  proactive_prune_min_reclaim_tokens: 4096          # Prune only commits when it reclaims at least this many tokens (0 = commit any)

# The summarization model/provider is configured under auxiliary:
auxiliary:
  compression:
    model: ""                                       # Empty = use main chat model. Override with e.g. "google/gemini-3-flash-preview" for cheaper/faster compression.
    provider: "auto"                                # Provider: "auto", "openrouter", "nous", "codex", "main", etc.
    base_url: null                                  # Custom OpenAI-compatible endpoint (overrides provider)
```

:::info 古い設定の移行
`compression.summary_model`、`compression.summary_provider`、`compression.summary_base_url` を使っている古い設定は、最初の読み込み時に自動で `auxiliary.compression.*` へ移行されます（設定のバージョン 17）。手で何かをする必要はありません。
:::

`progress_notices`（既定 `false`）は、**通常の**圧縮の進み具合をチャットのプラットフォーム（Telegram、Discord、Slack など）に届けるかどうかを決めます。設計としては、自動の圧縮はチャットの画面では静かに行われ、背後で動いてサーバー側のログにだけ記録されます。`progress_notices: true` にすると、通常の流れがチャットにも出るようになります。「Compacting context…」の開始の知らせ、事前確認や API 呼び出し前の圧縮のきっかけ、放置による圧縮、再試行の進み具合（「Compressed 30 → 12 messages, retrying…」）、「Context compaction complete」の知らせです。この関門は圧縮の状況だけに効きます。関係のない運用上の雑音（補助モデルの失敗、プロバイダの回数制限や再試行のやり取り）はどちらの設定でも出ません。圧縮の**失敗**の知らせと、手動の `/compress` への応答は、この設定に関わらず常に見えます。動作中の gateway でこの値を編集すると、次のメッセージから効きます。

`hygiene_hard_message_limit` は gateway だけの**圧縮前の安全弁**です。これは悪循環を断ち切るためにあります。大きくなりすぎたセッションで API 呼び出しが切れ続けると、gateway はトークンの使用量を受け取れず、トークンに基づくしきい値も発動できず、記録は伸び続け、切断はさらに悪化します。この件数に基づく下限は、（API が失敗しても必ず分かる）メッセージの数だけで発動して圧縮を強制し、セッションを立て直します。既定は `5000` で、通常のセッションよりはるかに上です。1M 以上のコンテキストのモデルで短いやり取りを何千回続けても、ここに届くずっと前にトークンのしきい値で圧縮されます。変わったプラットフォームではさらに上げ、より積極的に圧縮させたいなら下げてください。動作中の gateway でこの値を編集すると、次のメッセージから効きます（下記参照）。

`hygiene_timeout_seconds` は、この（エージェントの前で走る）圧縮の処理に対する gateway の**無反応の予算**であって、全体の実時間の上限ではありません。圧縮の要約の呼び出しはモデルからストリーミングで届き、届いたトークンはすべて前進とみなされます。遅い推論モデルでも、生成し続けている限り自分で期限を伸ばすので、遅いけれど健全な要約モデルが生成の途中で切られることはありません。要約モデルがこの秒数だけ**まったく出力しなかった**ときにだけ（バックエンドの停止、固まった接続、無言のプロバイダ）、gateway は利用者に警告し、圧縮せずに届いたメッセージの処理を続け、固まったように見える代わりにセッションごとの一時的な失敗の冷却期間を記録します。

`hygiene_total_ceiling_seconds`（既定 `600`）は、トークンがまだ動いていても全体の待ち時間を区切ります。ちょろちょろとしか流れない病的なストリームが、やり取りを人質に取り続けられないようにするためです。この値は少なくとも `hygiene_timeout_seconds` 以上に丸められます。

`hygiene_max_turn_hold_seconds`（既定 `10`）は gateway の**やり取りを保留する予算**です。届いたメッセージが、待つのをやめて圧縮していない記録のまま処理へ進むまでに、圧縮を待てる実時間の上限です。これがあるのは、`hygiene_total_ceiling_seconds` だけではチャットの通信路の無通信のタイムアウトよりずっと長く沈黙してしまいかねないからです。要約モデルがトークンを出し続けると無反応の区間が何度もリセットされるので、保留の予算がないと待ち時間は上限へ向かって伸び、その間 1 バイトも利用者に届きません。すると Telegram（や同種の通信路）は接続を切り、やり取りは固まったように見えます。やり取りの待ち時間をこの予算（通常の 30 秒ほどの無通信のタイムアウトよりかなり短く）で区切ることで、メッセージには速やかに返答できます。圧縮の処理は切り離されたまま動き続け、その反映には囲い（`CompressionCommitFence`）がかかるので、待つのをやめたあとに足されたやり取りを、あとから終わった圧縮が上書きすることはありません。要約モデルがいつも長くかかり、通信路が耐えられるなら上げてください。とても遅いバックエンドで素早く立て直したいなら下げてください。

`hygiene_failure_cooldown_seconds` は、圧縮のタイムアウトや中断のあとに置かれる、そのセッションの冷却期間を決めます。冷却の間、gateway は同じ大きすぎるセッションに対する圧縮の再挑戦を飛ばすので、届くメッセージのすべてが同じ壊れた補助バックエンドで止まることはありません。`/compress`、`/reset`、あるいはあとの健全なやり取りで、セッションは立て直せます。

この値は固定の間隔ではなく、伸びていく段の**最初の 1 段**です。同じセッションで失敗が続くと、待ちは `1x`、`3x`、`9x` と伸び、最大 1 時間で頭打ちになります。要約モデルが完全に壊れているセッションは、固定の間隔で永遠に再挑戦する代わりに間隔を空けていき、記録を実際に縮められた回があれば最初の段に戻ります。この段の上がり方はセッションごと・プロセスの中だけの話で、gateway を再起動すると最初の段に戻りますが、冷却の期限そのものは残ります。

`context_timeout_seconds`（既定 `120`）は、エージェントの内側で走る `compress_context`（会話のループ、事前の圧縮、手動の `/compress`）に対する同じ**無反応の予算**です。固まった要約モデルがセッションを永遠に止めないようにします。ストリーミングで届く要約のトークンは待ちを伸ばし、無言の処理だけが切られます。タイムアウトすると、Hermes は `auxiliary.compression.fallback_chain` の最初の項目に対して要約を 1 度だけやり直します（その項目が `timeout` を宣言していればそれを使います）。止まった経路は例外を投げないので、補助クライアント自身のフォールバックの仕組みからは見えないからです。その試みも失敗したとき、あるいはフォールバックの連鎖が設定されていないときにだけ、Hermes は圧縮を飛ばし、今のメッセージを保ったまま利用者に警告します。`0` にすると無効になります。gateway のセッションの手入れは独自の `hygiene_timeout_seconds` の経路を持ち、二重には包まれません。

`context_total_ceiling_seconds`（既定 `600`）は、エージェント内での**反映の前**の待ち（要約／ストリーミングの段階）を、トークンがまだ動いていても区切ります。値は少なくとも `context_timeout_seconds` 以上に丸められます。正確な保証はこうです。**要約の段階はこの上限で区切られる。反映の段階は、上限を超えたらログに出して知らせる。** 処理が圧縮の反映の囲いに入り、SessionDB の書き換えが進行中になったあとは、途中で反映を捨てることはありません（記録が食い違う危険があるからです）。ただし待ちは黙ったままにはなりません。反映が上限を過ぎたら、Hermes は超過をログに出し（WARNING、繰り返せば ERROR へ）、利用者に見える警告の経路で 1 度だけ知らせ、反映が終わるまで区切りながら待ち続けます。

`protect_first_n` は、圧縮のたびに固定しておく**システム以外の**先頭のメッセージの数です。既定は `3` で、最初の利用者とアシスタントのやり取りが要約のたびに生き残るので、当初の目的が見えたままになります。圧縮を繰り返す長寿命のセッションで、最初のやり取りがもう関係ないなら、`protect_first_n: 0` にすると、システムプロンプト＋要約＋末尾だけになります。システムプロンプト自体は、この設定に関わらず必ず残ります。

`in_place`（既定 `true`）は、圧縮が起きたときにセッションの同一性をどうするかを決めます。`true` のとき、圧縮はメッセージの一覧を書き換え、システムプロンプトを組み直しますが、**セッションの id は変わりません**。会話はその一生を通じて 1 つの id を保ちます（`parent_session_id` の連鎖も、セッションの一覧での `name #2` / `#3` の番号付けもありません）。圧縮は失われる操作ではありません。生きている文脈は縮みますが、圧縮前のやり取りは同じ id の下に控えとして残ります（非アクティブ／圧縮済みの印が付きます）。`session_search` で今も検索でき、取り戻せます。消えるわけではありません。フックからは `session:compress` イベントの `in_place` の項目でモードが分かります。`in_place: false` にすると、圧縮のたびに古い id に紐づく新しいセッション id へ切り替わる、従来のふるまいに戻ります。

`threshold_tokens` は、圧縮のきっかけに対する任意の**トークン数の絶対の上限**です。設定すると、割合による `threshold` とこの絶対値の低いほうで圧縮が始まります。つまり、どのモデルが動いていても、あなたが望むトークン数より遅く圧縮が始まることはありません。これは、コンテキストの窓が違うモデルを行き来する（たとえば 1M → 400K）と絶対のきっかけの位置がずれる、という問題を解きます。この上限はモデルのコンテキスト長に丸められるので、モデルが対応する量より大きく設定しても安全です（そのときは割合によるしきい値が使われます）。既定は `null`（無効、割合だけ）。この上限はモデルの切り替えやフォールバックの発動をまたいで保たれます。

`idle_compact_after_seconds` は、大きさに基づく `threshold` を補う、**任意で有効にする時間ベース**のきっかけです。既定は `0`（無効）。0 より大きくすると、その秒数以上放置されたあとに再開したセッションは、最初の返答の前に溜まった履歴を先に圧縮します。長く続くやり取り（何時間かあとに戻ってくる Telegram の会話など）が、以降のたびに古い文脈を丸ごと読み直さずに済みます。文脈がすでに圧縮後の目標（`threshold × target_ratio`）以下のときには発動しませんし、失敗の冷却・ばたつき防止・セッションごとの排他といった、ほかの自動圧縮と同じ守りにも従います。例: `idle_compact_after_seconds: 1800` は 30 分放置したあとに圧縮します。

`proactive_prune_tokens` は、`threshold` とは独立に動く、LLM を使わない決定的な古いツール結果の刈り込みを有効にします。窓の大きなモデルでは `threshold` による圧縮（窓のおよそ 50%）がめったに起きないので、かさばるツールの出力（ターミナルの吐き出し、ファイルの読み取り、web の抽出）が履歴に居座り、以降のやり取りのたびに送り直されます。送り直される履歴が `proactive_prune_tokens`（既定 `0` = 無効。有効にするなら `48000` あたりから）を超えると、刈り込みは同一の結果を重複排除し、古くて大きなものを要約し、大きなツール呼び出しの引数を切り詰めます。直近の `protect_last_n` 件は守られ、モデルは一切呼ばれません。完全な出力はセッションの保管場所から取り戻せます。`proactive_prune_min_result_chars`（既定 `8000`、200 以上に丸められます）は、これより小さいツールの結果には手を付けない、という下限です。`proactive_prune_min_reclaim_tokens`（既定 `4096`）は、これだけのトークンを取り戻せない限り刈り込みを反映しない、という条件です。反映された刈り込みは送信済みの履歴を書き換え、プロバイダのプロンプトのキャッシュの前半を無効にするので、この関門があることでキャッシュの切れ目は（圧縮の境目のように）意味のある 1 回にまとまり、ツールを呼ぶたびに起きることがなくなります。これは組み込みの `compressor` エンジンでだけ動きます。ほかのコンテキストのエンジンでは何もしません。

:::tip gateway での圧縮とコンテキスト長の即時反映
最近の版では、動作中の gateway で `model.context_length` や `compression.*` のキーを `config.yaml` で編集すると、次のメッセージから効きます。gateway の再起動も `/reset` もセッションの切り替えも要りません。キャッシュされたエージェントの識別にこれらのキーが含まれているので、変化を見つけると gateway が透過的にエージェントを組み直します。API キーとツール／スキルの設定は、これまでどおりの反映の手順が必要です。
:::

### よくある構成 {#common-setups}

**既定（自動判定）— 設定は要りません:**
```yaml
compression:
  enabled: true
  threshold: 0.50
```
主要なプロバイダと主要なモデルを使います。主要な会話のモデルより安いモデルで圧縮したいときは、用途ごとに上書きしてください（例: `auxiliary.compression.provider: openrouter` + `model: google/gemini-2.5-flash`）。

**プロバイダを固定する**（OAuth でも API キーでも）:
```yaml
auxiliary:
  compression:
    provider: nous
    model: gemini-3-flash
```
どのプロバイダでも動きます: `nous`、`openrouter`、`codex`、`anthropic`、`main` など。

**独自のエンドポイント**（自前ホスト、Ollama、zai、DeepSeek など）:
```yaml
auxiliary:
  compression:
    model: glm-4.7
    base_url: https://api.z.ai/api/coding/paas/v4
```
OpenAI 互換の独自エンドポイントを指します。認証には `OPENAI_API_KEY` を使います。

### 3 つのつまみの関係 {#how-the-three-knobs-interact}

| `auxiliary.compression.provider` | `auxiliary.compression.base_url` | 結果 |
|---------------------|---------------------|--------|
| `auto`（既定） | 未設定 | 使えるプロバイダの中から自動で選ぶ |
| `nous` / `openrouter` など | 未設定 | そのプロバイダを固定し、その認証を使う |
| どれでも | 設定あり | 独自のエンドポイントを直接使う（プロバイダは無視） |

:::warning 要約モデルのコンテキスト長の条件
要約モデルのコンテキストの窓は、主要なエージェントのモデル以上でなければ**なりません**。圧縮の処理は会話の中間部分を丸ごと要約モデルへ送るので、要約モデルの窓のほうが小さいと、要約の呼び出しはコンテキスト長のエラーで失敗します。そうなると中間のやり取りは**要約されないまま捨てられ**、会話の文脈が黙って失われます。モデルを上書きするなら、そのコンテキスト長が主要なモデル以上であることを確かめてください。
:::

## gateway のやり取りのリースのタイムアウト {#gateway-turn-lease-timeout}

gateway は、2 つのルーティングのキーが同じ記録を同時に読み書きしないよう、
解決したセッション ID ごとにやり取りを直列化します。リースを待つ最大時間は、
通常のエージェントの無反応のタイムアウトとは別に設定できます。

```yaml
agent:
  gateway_turn_lease_timeout: 5
```

この予算が切れてもまだ別のやり取りがセッションのリースを持っている場合、Hermes は
安全側で止まります。待っていたメッセージについて、記録を読み込むこともモデルを
動かすこともしません。利用者には拒否の知らせが届き、送り直しが必要です。
Hermes が自動で再投入しないのは、順序と冪等性が保証されないまま行うと
二重に処理しかねないからです。0 以下の値では既定の 5 秒が使われます。

## セッションの停滞の見張り {#session-stall-watchdog}

gateway は、知らせるだけの停滞の見張りを動かします（`agent.session_stall_timeout`、既定 `300` 秒、`0` で無効）。忙しいセッションに**未処理の後続の入力**があり、エージェントの共有の活動時計がこの時間以上動いていないとき、gateway は WARNING をログに出し、利用者に 1 度だけ知らせます。

```
⚠️ Agent session appears stalled (last activity N min ago). Try /new to reset.
```

意味は次のとおりです。

- **知らせるだけ。** この見張りがやり取りを止めることはありません。長い無反応のあとに実行を打ち切る `agent.gateway_timeout` とは対照的です。停滞の知らせは、エージェントが詰まって見えることを伝えるだけで、どうするか（`/new`、`/stop`、待ち続ける）はあなたが決めます。
- **停滞 1 回につき知らせは 1 度。** 未処理の入力がはけるか活動が再開すると掛け金が外れるので、立ち直ってからまた停滞すれば、また知らせます。
- 前進とみなされるのは共有の活動の記録だけです（ツールの呼び出し、API のストリーミングの進み、圧縮の生存の合図）。未処理の入力は知らせるための条件であって、前進を測る時計ではありません。

```yaml
agent:
  session_stall_timeout: 300   # seconds; 0 disables the watchdog
```

## 再接続の注意喚起 {#reconnect-attention-escalation}

プラットフォームのアダプタが接続に失敗すると（ネットワークの障害、無効になったボットのトークン、壊れたサイドカー）、gateway は上限付きの指数的な待ち時間で無限に再試行します。再試行は止まらないので、一時的な障害は運用者が何もしなくても必ず自然に直ります。困るのは、*恒久的な*失敗（無効化された Telegram のトークン、足りない Discord の特権インテント）が一時的な不調とまったく同じ「再試行中」に永遠に見えてしまう点です。

恒久的な失敗を見えるようにする仕組みが 2 つあります。

- **恒久的なものとしての分類。** 例外の*型*から絶対に自然回復しないと分かる失敗（拒否・無効化されたトークン: `telegram_auth_error`、`discord_auth_error`、`email_auth_error`、足りない特権インテント: `discord_intents_required`、依存関係を入れられない Photon のサイドカー: `SIDECAR_DEPS_MISSING`、node のバイナリがないサイドカー: `SIDECAR_NODE_MISSING`）は、再試行の列に入れず致命的として印を付けます。分類は厳密に型に基づくので、曖昧なエラーは必ず再試行を続けます。
- **注意が必要という合図。** `agent.reconnect_attention_after`（既定 `7200` 秒 = 2 時間、`0` で無効）を超えて再試行の列に居続けたプラットフォームは、gateway の実行状況（`hermes status`）で `needs_attention: true` と `retrying_since` の時刻が付き、WARNING のログも出ます。再試行はそのまま続きます。これは合図であって、遮断器ではありません。再接続に成功すると印は消えます。

```yaml
agent:
  reconnect_attention_after: 7200   # seconds; 0 disables the escalation flag
```

## gateway のエージェントのキャッシュ {#gateway-agent-cache}

gateway はセッションごとにエージェントを 1 つ持ち続けるので、会話は毎回システムプロンプトを組み直さず、キャッシュされたプロンプトの前半を再利用できます。そのキャッシュされたエージェントは、セッションの記録も丸ごと抱えています。ツールの出力も含むため、ツールを 100 回呼んだセッションでは数十メガバイトになります。忙しいマルチプラットフォームの gateway では、このキャッシュがプロセス内でいちばんメモリを食う存在になります。

```yaml
agent:
  agent_cache:
    max_size: 128            # LRU entry cap
    idle_ttl_secs: 3600      # evict an agent idle this long
    memory_high_mb: auto     # anon-RSS budget; number, "auto", or 0/off
    max_evictions_per_pass: 16
    protect_recent: 8
```

`max_size` と `idle_ttl_secs` は、件数と時間でキャッシュを区切ります。どちらも何バイト抱えているかは知らないので、`memory_high_mb` が 3 つ目の区切りを足します。gateway 自身の匿名の常駐メモリが予算を超えると、いちばん長く使われていない記録から手放します。手放した記録は次のやり取りで保存済みのセッションから読み直されます。gateway がほかのサービスとメモリを取り合っているなら下げてください。前半のキャッシュを温かく保ちたいなら上げるか、`0` にしてこの処理を切ってください。

`auto` は、gateway が実際に動いている環境のメモリ上限から予算を導きます（コンテナや systemd のユニットなら cgroup の上限、そうでなければ総 RAM）。ユニットの `MemoryMax`/`MemoryHigh` が、別に数字を管理しなくても尊重されます。

やり取りの最中のセッション、直近の `protect_recent` 件、記録のディスクへの書き込みが終わっていないセッションは、決して手放されません。手放しは WARNING で、実測の RSS と落としたセッションとともに記録されます。

```
Agent cache pressure: anon RSS 6802MB over budget 6656MB — evicting 5 LRU session(s): ...
```

## コンテキストのエンジン {#context-engine}

コンテキストのエンジンは、モデルのトークンの上限に近づいたときに会話をどう扱うかを決めます。組み込みの `compressor` エンジンは、内容が一部失われる要約を使います（[Context Compression](/hermes/docs/developer-guide/context-compression-and-caching/) を参照）。プラグインのエンジンは、これを別のやり方に置き換えられます。

```yaml
context:
  engine: "compressor"    # default — built-in lossy summarization
```

プラグインのエンジンを使うには（たとえば内容を失わない LCM）:

```yaml
context:
  engine: "lcm"          # must match the plugin's name
```

プラグインのエンジンが**自動で有効になることはありません**。`context.engine` にプラグインの名前を明示する必要があります。使えるエンジンは `hermes plugins` → Provider Plugins → Context Engine で一覧・選択できます。

メモリのプラグインについての同じ仕組み（1 つだけ選ぶ方式）は [Memory Providers](/hermes/docs/user-guide/features/memory-providers/) を参照してください。

## 繰り返しの予算 {#iteration-budget}

ツールを何度も呼ぶ複雑な仕事に取り組んでいると、エージェントは繰り返しの予算（既定 500 回）を使い切ることがあります。Hermes は途中で圧力をかける警告を出し**ません**。以前の版は予算の 70%／90% でモデルに警告していましたが、それが複雑な仕事を途中で投げ出させる原因になったため、2026 年 4 月に取り除かれました。

代わりに、予算を本当に使い切ったとき（500/500）、Hermes はまとめに入るよう頼むメッセージを 1 度だけ差し込み、最終的な返答を出せるように**猶予の呼び出し**を 1 回だけ許します。その猶予の呼び出しでも文章が出なければ、何を成し遂げたかを要約するよう求めます。

```yaml
agent:
  max_turns: none              # Iterations per conversation turn (default: none = unlimited)
                               # Set a positive integer to cap; "none"/"null"/
                               # "unlimited"/"inf"/"infinity"/"infinite"/0/-1 = no limit
  api_max_retries: 3           # Retries per provider before fallback engages (default: 3)
```

`agent.max_turns` は**既定で無制限**です。回数の上限は、解決する問題より生む問題のほうが多かったため（仕事の途中で黙って切られる）、そのままでは Hermes は 1 回のやり取りを最後まで走らせます。上限を置きたいときは正の整数を設定してください。「上限なし」を明示したいときは、大文字小文字を問わず次のどれでも使えます: `"none"`、`"null"`、`"unlimited"`、`"infinite"`、`"infinity"`、`"inf"`、`0`、`-1`（内部では `sys.maxsize` の目印になるので、回数でループが終わることはありません）。

`agent.api_max_retries` は、一時的なエラー（回数制限、接続の切断、5xx）のときに、フォールバックのプロバイダへ切り替える**前**にプロバイダの API 呼び出しを何回やり直すかを決めます。既定は `3` で、合計 4 回試みます。[フォールバックのプロバイダ](/hermes/docs/user-guide/features/fallback-providers/) を設定していて、もっと早く切り替えたいなら `0` にしてください。主要なプロバイダで最初の一時的なエラーが出た時点で、不安定なエンドポイントに再試行を重ねずフォールバックへ渡します。

## 実時間の実行の予算 {#wall-clock-run-budget}

繰り返しの予算とは別に、会話の実行ごとに任意の**実時間**の予算を与えられます。これは、外部から厳しい上限（たとえばタスクごとに 900 秒）をかけられる 1 回きりの実行や評価の枠組みのためのものです。これがないと、仕事がほぼ終わっているのに時間切れになりかねません。最終的な答えを出す 1 回の生成が足りなかったり、固まったプロバイダの呼び出し 1 つで止まっていたりする状態です。

```yaml
agent:
  run_budget_seconds: null     # Optional; unset/null = feature fully off (default)
```

CLI から実行ごとに指定することもできます。

```bash
hermes chat --run-budget 850 -q "..."
```

予算を設定すると、2 つのことが起きます。

1. **80% でまとめの知らせ。** 予算の 80% を使った時点で、Hermes は**1 度だけ**の知らせを差し込み（キャッシュを壊さない形で、`/steer` のメッセージと同じくいちばん新しいツールの結果に付け足されます）、新しい調査や検証をやめて、今ある材料で最終的な成果物を出すようモデルに伝えます。1 回の実行で最大 1 度しか出ませんし、既存の繰り返しの予算のまとめの仕組みと同じ形です。圧力をかける警告が繰り返されることはありません。
2. **期限に合わせた停滞のタイムアウト。** 明示されていない非ストリーミングの停滞のタイムアウト（既定の 90 秒や、DeepSeek の推論モデル向けの 600 秒などの下限）は `max(60, remaining_budget × 0.5)` で頭打ちになるので、黙って固まった 1 回のプロバイダの呼び出しが実行の残り時間を食い尽くすことはありません。この頭打ちはタイムアウトを*短くする*方向にしか働かず、伸ばすことはありません。明示的に設定した `stale_timeout_seconds`（プロバイダ／モデルの設定か `HERMES_API_CALL_STALE_TIMEOUT`）は常にそのまま優先されます。

この予算は `run_conversation` のやり取りごとです（利用者のメッセージのたびにリセットされます）。未設定のときは完全に眠っていて、時計も読まず、何も差し込まず、タイムアウトも変えません。

## 終了時の検証（コーディングの検証） {#verify-on-stop-coding-verification}

有効にすると、エージェントが作業場のコードを編集したのに新しい検証の証拠（テストの成功、ビルド、lint など）を出していないやり取りでは、Hermes は最終的な答えを受け付けません。検証するか、できない理由を述べるよう求める、作られた続きのメッセージを差し込みます。ドキュメント／マークダウン／スキルだけの編集では発動しませんし、ループには上限があるのでエージェントが閉じ込められることはありません。

```yaml
agent:
  verify_on_stop: false        # true | false | "auto" (surface-aware: on for CLI/TUI/desktop, off for messaging)
  verify_guidance: true        # Append creative-UI / clean-diff guidance to the missing-evidence nudge
  max_verify_nudges: 3         # Cap on consecutive continue nudges per turn (built-in + pre_verify hooks)
  coding_instructions: ""      # Standing project-wide coding rules appended to the coding brief
```

`verify_on_stop` は `true`（どこでも有効）、`false`（無効、既定）、`"auto"`（従来の画面に応じたふるまい。対話的にコードを書く画面 — CLI、TUI、デスクトップ — とプログラムからの呼び出しでは有効、Telegram や Discord のようなメッセージングの画面では、検証の語りがチャットの雑音に見えるので無効）を受け付けます。どこでも既定は無効です。新しく入れた場合は `false` で、既存の導入でも設定の移行で無効になったので、使いたいときは明示的に有効にしてください。`HERMES_VERIFY_ON_STOP` の環境変数は、設定されていれば設定ファイルの値より優先されます。

同じ位置で、利用者やプラグインが独自の方針の関門を置きたい場合（自前の検査でエージェントを走らせ続けたい場合）は、[`pre_verify` フック](/hermes/docs/user-guide/features/hooks/#pre_verify) を参照してください。

## 常設の目標（`/goal`） {#standing-goals-goal}

常設の目標が有効なとき、Hermes はアシスタントの返答がそれを満たしているかを判定します。満たしていなければ、同じセッションに続きの指示を戻し、目標が達成されるか、やり取りの予算が尽きるか、利用者が一時停止・解除するまで作業を続けます。本当の歯止めはやり取りの予算です。判定の失敗は**安全側に開く**（続行する）ので、判定が不安定でも前進が止まることはありません。

```yaml
goals:
  max_turns: 20   # Max continuation turns before Hermes auto-pauses the goal (default: 20)
```

`max_turns` は、Hermes が目標を自動で一時停止して `/goal resume` を促すまでに、目標が何回の続きのやり取りを引っ張れるかを決めます。判定の見落とし（本当は終わっているのに続けろと言われる場合）と、あいまいだったり達成できなかったりする目標での際限のない出費を防ぎます。機能の全体は [Goals](/hermes/docs/user-guide/features/goals/) を参照してください。

### API のタイムアウト {#api-timeouts}

Hermes はストリーミング用に複数のタイムアウトの層を持ち、加えて非ストリーミングの呼び出し向けに停滞の検出を持ちます。停滞の検出は、既定のままにしているときだけローカルのプロバイダに合わせて自動で調整されます。

| タイムアウト | 既定値 | ローカルのプロバイダ | 設定 / 環境変数 |
|---------|---------|----------------|--------------|
| ソケットの読み取りのタイムアウト | 120秒 | 自動で 1800 秒に引き上げ | `HERMES_STREAM_READ_TIMEOUT` |
| ストリーミングの停滞の検出 | 180秒 | 900 秒の上限まで引き上げ（`agent.local_stream_stale_timeout`） | `HERMES_STREAM_STALE_TIMEOUT` |
| 非ストリーミングの停滞の検出 | 90秒 | 明示していなければ自動で無効 | `providers.<id>.stale_timeout_seconds` または `HERMES_API_CALL_STALE_TIMEOUT` |
| API 呼び出し（非ストリーミング） | 1800秒 | そのまま | `providers.<id>.request_timeout_seconds` / `timeout_seconds` または `HERMES_API_TIMEOUT` |

**ソケットの読み取りのタイムアウト**は、httpx がプロバイダからの次のデータの塊をどれだけ待つかを決めます。ローカルの LLM は大きなコンテキストの読み込みに数分かかってから最初のトークンを出すことがあるので、ローカルのエンドポイントだと分かると Hermes はこれを 30 分に引き上げます。`HERMES_STREAM_READ_TIMEOUT` を明示した場合は、エンドポイントの判定に関わらずその値が使われます。

**ストリーミングの停滞の検出**は、SSE の生存確認だけが届いて中身が来ない接続を切ります。（読み込み中は生存確認を送らない）ローカルのプロバイダでは、既定の 180 秒ではなく有限の 900 秒の上限まで引き上げられます。`agent.local_stream_stale_timeout` か `HERMES_LOCAL_STREAM_STALE_TIMEOUT` の環境変数で設定できます。

**非ストリーミングの停滞の検出**は、長い間まったく応答のない非ストリーミングの呼び出しを切ります。既定では、長い読み込み中の誤検出を避けるため、Hermes はローカルのエンドポイントでこれを無効にします。`providers.<id>.stale_timeout_seconds`、`providers.<id>.models.<model>.stale_timeout_seconds`、`HERMES_API_CALL_STALE_TIMEOUT` を明示した場合は、ローカルのエンドポイントでもその値が尊重されます。

この予算は、cron のジョブや委任したサブエージェントがその場で走らせるものを含め、すべての非ストリーミングの呼び出しを区切ります。リクエストを受け取ったあと黙り込むプロバイダ（接続は開いたまま、1 バイトも来ず、エラーも出ない）は、停滞のタイムアウトで打ち切られて再試行されます。はるかに長いソケットの読み取りのタイムアウトまで（無人の cron の実行なら、外から何かがプロセスを殺すまで）ぶら下がることはありません。

## コンテキストの逼迫の警告 {#context-pressure-warnings}

繰り返しの予算の逼迫とは別に、コンテキストの逼迫は、会話が**圧縮のしきい値**（古いメッセージを要約する圧縮が始まる点）にどれだけ近いかを追います。これは、会話が長くなってきたことをあなたとエージェントの双方に伝えます。

| 進み具合 | 段階 | 起きること |
|----------|-------|-------------|
| しきい値まで **60% 以上** | 情報 | CLI に水色の進み具合の帯が出ます。gateway は知らせを送ります |
| しきい値まで **85% 以上** | 警告 | CLI に太い黄色の帯が出ます。gateway は圧縮が近いと警告します |

CLI では、コンテキストの逼迫はツールの出力の流れの中に進み具合の帯として現れます。

```
  ◐ context ████████████░░░░░░░░ 62% to compaction  48k threshold (50%) · approaching compaction
```

メッセージングのプラットフォームでは、文字だけの知らせが届きます。

```
◐ Context: ████████████░░░░░░░░ 62% to compaction (threshold: 50% of window).
```

自動の圧縮を無効にしている場合、警告は代わりにコンテキストが切り詰められるかもしれないと伝えます。

コンテキストの逼迫は自動です。設定は要りません。利用者に見せる知らせとしてだけ働き、メッセージの流れを変えたり、モデルのコンテキストに何かを差し込んだりはしません。

## 認証情報のプールの方式 {#credential-pool-strategies}

同じプロバイダに API キーや OAuth のトークンを複数持っているとき、切り替えの方式を設定します。

```yaml
credential_pool_strategies:
  openrouter: round_robin    # cycle through keys evenly
  anthropic: least_used      # always pick the least-used key
```

選べるのは `fill_first`（既定）、`round_robin`、`least_used`、`random` です。詳しくは [Credential Pools](/hermes/docs/user-guide/features/credential-pools/) を参照してください。

## プロンプトのキャッシュ {#prompt-caching}

今のプロバイダが対応していれば、Hermes はセッションをまたぐプロンプトのキャッシュを自動で有効にします。利用者側の設定は要りません。

**ネイティブ Anthropic**、**OpenRouter**、**Nous Portal** 経由の Claude では、Hermes はシステムプロンプトとスキルのブロックに 1 時間の有効期限（`ttl: "1h"`）付きの `cache_control` の区切りを付けます。新しい 1 時間の最初の送信は通常の入力の料金ですが、同じ 1 時間の中なら、どのセッションからの以降の送信も割安なキャッシュ読み取りの料金でキャッシュから取られます。つまり、システムプロンプト、読み込んだスキルの内容、長いコンテキストの前のほうは、最初の 1 時間、`hermes` のセッションをまたいでも、分岐したサブエージェントの間でも再利用されます。

Qwen Cloud（Alibaba DashScope）の上流はキャッシュの有効期限を 5 分に制限しているので、Hermes はそこでは 5 分の区切りを使います。ほかの第三者経由の Claude（AWS Bedrock、Azure Foundry）は、そのプロバイダ自身のキャッシュの既定に従います。xAI Grok は、セッションに固定した会話 ID という別の仕組みを使います。[xAI prompt caching](/hermes/docs/integrations/providers/#xai-grok--responses-api--prompt-caching) を参照してください。

これを無効にするつまみはありません。キャッシュは常に有効で、1 回きりの会話でも費用を抑えます。システムプロンプトだけでも入力のトークン数の無視できない割合を占めるからです。

明示的なつまみは 1 つだけ、Anthropic 形式の区切りに対して Hermes が要求するキャッシュの有効期限の段階です。

```yaml
prompt_caching:
  cache_ttl: "5m"   # "5m" or "1h" (Anthropic-supported tiers); other values are ignored
```

`cache_ttl` は、ネイティブ Anthropic API、OpenRouter、Nous Portal 経由の Claude に対して Hermes が付ける区切りの有効期限を選びます。Anthropic が対応する 2 段階（`"5m"`、`"1h"`）だけが有効で、それ以外の値は無視されます。独自の上限を持つプロバイダ（最大 5 分の Qwen Cloud など）では、上流が許す範囲に丸められます。

## 補助のモデル {#auxiliary-models}

Hermes は、画像の解析、ブラウザのスクリーンショットの解析、セッションのタイトルの生成、コンテキストの圧縮といった脇の仕事に「補助」のモデルを使います。既定（`auxiliary.*.provider: "auto"`）では、Hermes はすべての補助の仕事を**主要な会話のモデル**、つまり `hermes model` で選んだのと同じプロバイダ／モデルに回します。使い始めるのに何も設定は要りませんが、高価な推論モデル（Opus、MiniMax M2.7 など）では補助の仕事が無視できない費用になる点は知っておいてください。主要なモデルに関わらず脇の仕事を安く速くしたいなら、`auxiliary.<task>.provider` と `auxiliary.<task>.model` を明示してください（たとえば画像には OpenRouter の Gemini Flash）。（web の抽出は補助の仕事ではありません。`web_extract` とブラウザのスナップショットは長い内容を決まったやり方で切り詰め、`read_file` でページをたどれるように全文を保存します。LLM は関わりません。）

:::note なぜ「auto」が主要なモデルを使うのか
以前の版は、集約サービスの利用者（OpenRouter、Nous Portal）を、プロバイダ側の安い既定へ振り分けていました。これは意外なふるまいでした。集約サービスの購読料を払っている人が、補助の通信だけ別のモデルで処理されるのを目にすることになるからです。`auto` は今では誰にとっても主要なモデルを使い、`config.yaml` での用途ごとの上書きは従来どおり優先されます（下の [補助の設定の全項目](#full-auxiliary-config-reference) を参照）。
:::

### 補助のモデルを対話的に設定する {#configuring-auxiliary-models-interactively}

YAML を手で編集する代わりに、`hermes model` を実行してメニューから **"Configure auxiliary models"** を選んでください。用途ごとの対話的な選択画面が出ます。

```
$ hermes model
→ Configure auxiliary models

[ ] vision               currently: auto / main model
[ ] title_generation     currently: openrouter / google/gemini-3-flash-preview
[ ] tts_audio_tags       currently: auto / main model
[ ] compression          currently: auto / main model
[ ] approval             currently: auto / main model
[ ] triage_specifier     currently: auto / main model
[ ] kanban_decomposer    currently: auto / main model
[ ] profile_describer    currently: auto / main model
[ ] delegation           currently: auto / inherit main agent
```

用途を選び、プロバイダを選び（OAuth の流れではブラウザが開き、API キーのプロバイダでは入力を求められます）、モデルを選びます。変更は `config.yaml` の `auxiliary.<task>.*` に保存されます。主要なモデルの選択画面と同じ仕組みで、新しく覚える書き方はありません。

**Delegation** の項目だけは特別です。これは `delegate_task` のサブエージェントが使うモデルを決め、保存先は `auxiliary.*` ではなくトップレベルの `delegation.*`（`delegation.provider` / `delegation.model`）です。サブエージェントは脇の LLM 呼び出しではなく、一人前の子のエージェントだからです。ここでの `auto` は「親のエージェントのプロバイダ・モデル・認証情報を引き継ぐ」という意味です。

最初のやり取りのあとにタイトルを自動生成してほしくない場合は、
`auxiliary.title_generation.enabled: false` にしてください。手動のタイトルは
`/title` と `hermes sessions rename` で今までどおり使えます。

### ストリーミングしか受け付けないエンドポイント {#stream-only-endpoints}

OpenAI 互換のエンドポイントの中には、ストリーミングでないチャットのリクエストを丸ごと拒むものがあります（たとえば Tencent Copilot は HTTP 400 で `"Non-stream chat request is currently not supported"` を返します）。対話のチャットはもともとストリーミングですが、補助の仕事（タイトルの生成、圧縮、画像）は非ストリーミングの呼び出しを使うので、毎回失敗してしまいます。Hermes は `copilot.tencent.com` を常にストリーミング専用として扱います。ほかにそういうエンドポイントがあれば、URL の一部を `auxiliary.stream_only_base_urls` に並べてください。

```yaml
auxiliary:
  stream_only_base_urls:
    - "my-stream-only-proxy.example.com"
```

一致した補助の呼び出しは `stream=True` で送られ、断片（ツール呼び出しの差分も含めて）はクライアント側でまとめられます。ほかのエンドポイントのふるまいは変わりません。

### 動画の解説 {#video-tutorial}

[YouTube: https://www.youtube.com/embed/NoF-YajElIM](https://www.youtube.com/embed/NoF-YajElIM)

### 共通の設定のかたち {#the-universal-config-pattern}

Hermes のモデルの枠は、補助の仕事も、圧縮も、フォールバックも、すべて同じ 3 つのつまみを使います。

| キー | 役割 | 既定値 |
|-----|-------------|---------|
| `provider` | 認証とルーティングに使うプロバイダ | `"auto"` |
| `model` | 要求するモデル | プロバイダの既定 |
| `base_url` | OpenAI 互換の独自エンドポイント（プロバイダより優先） | 未設定 |

補助の仕事のブロックは、さらに `reasoning_effort` のつまみを受け付けます。

| キー | 役割 | 既定値 |
|-----|-------------|---------|
| `reasoning_effort` | その用途の LLM 呼び出しでの思考の深さ: `none`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max`、`ultra` | 未設定（プロバイダの既定） |

これは全体の `agent.reasoning_effort` の用途ごとの対応物です。主要なモデルが高価な推論モデルのときに、圧縮を `low`、画像を `none` で走らせれば、主要な会話のふるまいを変えずに脇の仕事の待ち時間と費用を削れます。すべての補助の仕事のブロック（`vision`、`compression`、`title_generation`、`curator`、`background_review`、…）で、3 つの通信形式（chat completions、Codex Responses、Anthropic Messages）すべてに効きます。同じ用途に明示的な `extra_body.reasoning` があれば、そちらがこの簡易な書き方より優先されます。

例外は MoA だけです。Mixture-of-Agents の思考の深さは、`moa_reference`/`moa_aggregator` の補助のブロックではなく、MoA のプリセットの**枠ごと**に設定します（`moa.presets.<name>.reference_models[].reasoning_effort` / `aggregator.reasoning_effort`）。[Mixture of Agents](/hermes/docs/user-guide/features/mixture-of-agents/) を参照してください。

```yaml
auxiliary:
  compression:
    reasoning_effort: "low"    # summaries don't need deep thinking
  vision:
    reasoning_effort: "none"   # disable thinking for image description
```

`base_url` を設定すると、Hermes はプロバイダを無視してそのエンドポイントを直接呼びます（認証には `api_key` か `OPENAI_API_KEY` を使います）。`provider` だけを設定した場合は、そのプロバイダの組み込みの認証と base URL を使います。

補助の仕事で使えるプロバイダ: `auto`、`main`、それに [プロバイダの一覧](/hermes/docs/reference/environment-variables/) にあるもの — `openrouter`、`nous`、`openai-codex`、`copilot`、`copilot-acp`、`anthropic`、`gemini`、`qwen-oauth`、`zai`、`kimi-coding`、`kimi-coding-cn`、`minimax`、`minimax-cn`、`minimax-oauth`、`deepseek`、`nvidia`、`xai`、`xai-oauth`、`ollama-cloud`、`alibaba`、`bedrock`、`huggingface`、`arcee`、`xiaomi`、`kilocode`、`opencode-zen`、`opencode-go`、`opencode-free`、`commandcode`、`commandcode-anthropic`、`ai-gateway`、`azure-foundry` — あるいは自分の `providers:` の辞書にある名前付きの独自プロバイダ（例: `provider: "beans"`）。

:::tip MiniMax OAuth
`minimax-oauth` はブラウザの OAuth でログインします（API キーは不要）。`hermes model` を実行して **MiniMax (OAuth)** を選び、認証してください。補助の仕事は自動的に `MiniMax-M2.7-highspeed` を使います。[MiniMax OAuth guide](/hermes/docs/guides/minimax-oauth/) を参照してください。
:::

:::tip xAI Grok OAuth
`xai-oauth` は、SuperGrok と X Premium+ の購読者向けにブラウザの OAuth でログインします（API キーは不要）。`hermes model` を実行して **xAI Grok OAuth (SuperGrok / Premium+)** を選び、認証してください。同じ OAuth のトークンは、xAI へ直接つながるすべての面（チャット、補助の仕事、TTS、画像生成、動画生成、書き起こし）で使い回されます。[xAI Grok OAuth guide](/hermes/docs/guides/xai-grok-oauth/) を、Hermes がリモートのホストにある場合は [OAuth over SSH / Remote Hosts](/hermes/docs/guides/oauth-over-ssh/) も参照してください。
:::

:::warning `"main"` は補助の仕事だけのもの
`"main"` というプロバイダの指定は「主要なエージェントが使っているプロバイダを使う」という意味で、`auxiliary:`、`compression:`、主要なフォールバックの項目（`fallback_providers:` か以前の `fallback_model:`）の中でだけ有効です。トップレベルの `model.provider` の値としては**使えません**。OpenAI 互換の独自エンドポイントを使うなら、`model:` の節に `provider: custom` を設定してください。主要なモデルのプロバイダの選択肢は [AI Providers](/hermes/docs/integrations/providers/) を参照してください。
:::

### 補助の設定の全項目 {#full-auxiliary-config-reference}

```yaml
auxiliary:
  # Image analysis (vision_analyze tool + browser screenshots)
  vision:
    provider: "auto"           # "auto", "openrouter", "nous", "codex", "main", etc.
    model: ""                  # e.g. "openai/gpt-4o", "google/gemini-2.5-flash"
    base_url: ""               # Custom OpenAI-compatible endpoint (overrides provider)
    api_key: ""                # API key for base_url (falls back to OPENAI_API_KEY)
    timeout: 120               # seconds — LLM API call timeout; vision payloads need generous timeout
    download_timeout: 30       # seconds — image HTTP download; increase for slow connections
    max_concurrency: 8         # max concurrent image encode/resize bursts across the process
                               # (default: host CPU core count, no ceiling) — bounds only the
                               # CPU-bound encode step so a video-frame fan-out can't saturate
                               # every core and starve the event loop; LLM calls stay fully
                               # concurrent. Minimum 1; values < 1 are ignored.

  # Dangerous command approval classifier
  approval:
    provider: "auto"
    model: ""
    base_url: ""
    api_key: ""
    timeout: 30                # seconds

  # Gemini 3.1 TTS hidden audio-tag insertion
  tts_audio_tags:
    provider: "auto"
    model: ""                  # empty = main chat model
    base_url: ""
    api_key: ""
    timeout: 30

  # Context compression timeout (separate from compression.* config)
  compression:
    timeout: 120               # seconds — compression summarizes long conversations, needs more time
    # fallback_chain:           # Optional — providers to try on rate-limit / connectivity failure
    #   - provider: nous
    #     model: deepseek/deepseek-chat
    #   - provider: openrouter
    #     model: google/gemini-2.5-flash
    #     base_url: ""
    #     api_key: ""
    # max_concurrency: 2       # Optional: cap simultaneous compression LLM calls so
                               # multiple sessions don't pile retries on a degraded provider

  # Auto-generated session titles. Empty language follows the conversation;
  # set e.g. "English" or "Japanese" to pin titles to one language.
  title_generation:
    enabled: true              # set false to disable auto-title generation
    provider: "auto"
    model: ""
    base_url: ""
    api_key: ""
    timeout: 30
    language: ""

  # Skills hub — skill matching and search
  skills_hub:
    provider: "auto"
    model: ""
    base_url: ""
    api_key: ""
    timeout: 30

  # MCP tool dispatch
  mcp:
    provider: "auto"
    model: ""
    base_url: ""
    api_key: ""
    timeout: 30

  # Auto-generated short session titles after the first exchange
  title_generation:
    provider: "auto"
    model: ""
    base_url: ""
    api_key: ""
    timeout: 30
    # max_concurrency: 2       # Optional: cap simultaneous title-generation calls

  # Kanban triage specifier — `hermes kanban specify <id>` (or the
  # dashboard's ✨ Specify button on Triage-column cards) uses this
  # slot to expand a one-liner into a concrete spec and promote the
  # task to `todo`. Cheap fast models work well here; spec expansion
  # is short and doesn't need reasoning depth.
  triage_specifier:
    provider: "auto"
    model: ""
    base_url: ""
    api_key: ""
    timeout: 120
```

:::tip
補助の仕事にはそれぞれ設定できる `timeout`（秒）があります。既定は画像 120 秒、承認 30 秒、圧縮 120 秒です。補助の仕事に遅いローカルのモデルを使うなら伸ばしてください。画像には HTTP のダウンロード用に別の `download_timeout`（既定 30 秒）もあります。回線が遅い場合や自前の画像サーバーを使う場合は、こちらを伸ばしてください。
:::

:::info
コンテキストの圧縮は、しきい値のための `compression:` ブロックと、モデル／プロバイダのための `auxiliary.compression:` ブロックを別々に持ちます — 上の [コンテキストの圧縮](#context-compression) を参照してください。主要なフォールバックの連鎖はトップレベルの `fallback_providers:` の一覧を使います — [Fallback Providers](/hermes/docs/integrations/providers/#fallback-providers) を参照してください。3 つとも同じ provider/model/base_url の形に従います。
:::

### 補助の仕事ごとのフォールバックの連鎖 {#per-task-fallback-chain-for-auxiliary-tasks}

補助の仕事はそれぞれ、任意で `fallback_chain` を定義できます。これは、主要な補助のプロバイダが回数制限・接続の問題・支払いの制約で失敗したときに Hermes が試す、プロバイダ／モデルの一覧です。

```yaml
auxiliary:
  compression:
    provider: openrouter
    model: openai/gpt-4o-mini
    fallback_chain:
      - provider: nous
        model: deepseek/deepseek-chat
      - provider: openrouter
        model: google/gemini-2.5-flash
```

主要な補助のプロバイダ（`openrouter` / `openai/gpt-4o-mini`）が回数制限、接続のタイムアウト、支払いが必要というエラーを返すと、Hermes は `fallback_chain` を順にたどります。すでに失敗したプロバイダと同じ項目は飛ばし、残りをひとつずつ試して、成功するか連鎖が尽きるまで続けます。すべてのフォールバックが失敗した場合は、最後の受け皿として主要なエージェントのモデルに戻ります。

各項目は、ほかの補助の仕事の設定と同じ 3 つのつまみに対応します。

| キー | 説明 |
|-----|-------------|
| `provider` | プロバイダ名（`nous`、`openrouter`、`anthropic`、`gemini`、`main` など） |
| `model` | そのプロバイダでのモデル名 |
| `base_url` | （任意）OpenAI 互換の独自エンドポイント |

`fallback_chain` は、どの補助の仕事でも使えます — `compression`、`vision`、`approval`、`skills_hub`、`mcp` など。

### 補助の同時実行を絞る {#limiting-auxiliary-concurrency}

`max_concurrency` は、`compression` や `title_generation` といった補助の仕事の、プロセス全体での同時進行中の LLM 呼び出し数を制限します。`auxiliary.vision.max_concurrency` だけは対象外です。これはすでに、LLM のリクエストではなく画像の符号化・縮小という CPU を使う処理の数だけを制御しているからです。次のような場面でとくに役立ちます。

- 多くのセッションが同時に裏の仕事を起こしうる（Discord/Telegram のチャンネル、複数のターミナル）
- プロバイダが回数制限中か障害中で、再試行が集中をさらに悪化させる

既定は無制限です。安全側の目安は `2` です。

```yaml
auxiliary:
  title_generation:
    max_concurrency: 2
  compression:
    max_concurrency: 2
```

この制限は再試行とフォールバックを含む呼び出し全体を包むので、遅い呼び出し 1 つは 1 つとしてだけ数えられます。

### 補助の仕事での OpenRouter のルーティングと Pareto Code {#openrouter-routing-pareto-code-for-auxiliary-tasks}

補助の仕事が OpenRouter に行き着くとき（明示した場合でも、主要なエージェントが OpenRouter にいて `provider: "main"` を使った場合でも）、主要なエージェントの `provider_routing` と `openrouter.min_coding_score` の設定は**引き継がれません**。設計として、補助の仕事はそれぞれ独立しているからです。特定の補助の仕事に対して OpenRouter のプロバイダの好みを設定したり、[Pareto Code のルーター](/hermes/docs/integrations/providers/#openrouter-pareto-code-router) を使ったりするには、`extra_body` で用途ごとに設定してください。

```yaml
auxiliary:
  compression:
    provider: openrouter
    model: openrouter/pareto-code         # use the Pareto Code router for this task
    extra_body:
      provider:                            # OpenRouter provider routing prefs
        order: [anthropic, google]         # try these providers in order
        sort: throughput                   # or "price" | "latency"
        # only: [anthropic]                # restrict to a specific provider
        # ignore: [deepinfra]              # exclude specific providers
      plugins:                             # OpenRouter Pareto Code router knob
        - id: pareto-router
          min_coding_score: 0.5            # 0.0–1.0; higher = stronger coders
```

この形は、OpenRouter が chat completions のリクエストの本体で受け付けるものをそのまま写したものです。Hermes は `extra_body` を丸ごとそのまま転送するので、[openrouter.ai/docs](https://openrouter.ai/docs) に載っているほかのリクエスト本体の項目も同じように使えます。

### 画像のモデルを変える {#changing-the-vision-model}

画像の解析に Gemini Flash ではなく GPT-4o を使うには:

```yaml
auxiliary:
  vision:
    model: "openai/gpt-4o"
```

環境変数（`~/.hermes/.env` の中）でも設定できます。

```bash
AUXILIARY_VISION_MODEL=openai/gpt-4o
```

### プロバイダの選択肢 {#provider-options}

ここに挙げる選択肢は、**補助の仕事の設定**（`auxiliary:`、`compression:`）と主要なフォールバックの項目（`fallback_providers:` か以前の `fallback_model:`）に効くもので、主要な `model.provider` の設定には効きません。

| プロバイダ | 説明 | 必要なもの |
|----------|-------------|-------------|
| `"auto"` | 使えるものの中から最良を選びます（既定）。画像は OpenRouter → Nous → Codex の順に試します。 | — |
| `"openrouter"` | OpenRouter を固定します — どのモデルにも回せます（Gemini、GPT-4o、Claude など） | `OPENROUTER_API_KEY` |
| `"nous"` | Nous Portal を固定します | `hermes auth` |
| `"codex"` | Codex の OAuth（ChatGPT アカウント）を固定します。画像に対応します（gpt-5.3-codex）。 | `hermes model` → ChatGPT または Codex Subscription |
| `"minimax-oauth"` | MiniMax の OAuth を固定します（ブラウザでログイン、API キー不要）。補助の仕事には MiniMax-M2.7-highspeed を使います。 | `hermes model` → MiniMax (OAuth) |
| `"xai-oauth"` | xAI Grok の OAuth を固定します（SuperGrok か X Premium+ の購読者向けにブラウザでログイン、API キー不要）。同じ OAuth のトークンで、チャット・TTS・画像・動画・書き起こしをまかないます。 | `hermes model` → xAI Grok OAuth (SuperGrok / Premium+) |
| `"main"` | 今使っている独自／主要のエンドポイントを使います。`OPENAI_BASE_URL` + `OPENAI_API_KEY` から来ることも、`hermes model` や `config.yaml` に保存した独自エンドポイントから来ることもあります。OpenAI でも、ローカルのモデルでも、OpenAI 互換の API なら何でも動きます。**補助の仕事だけのもので、`model.provider` には使えません。** | 独自エンドポイントの認証情報と base URL |

主要なプロバイダの一覧にある、API キーを直接使うプロバイダも、脇の仕事を既定のルーターから外したいときにここで使えます。たとえば `GMI_API_KEY` を設定すれば `gmi` が、`FIREWORKS_API_KEY` を設定すれば `fireworks` が使えます。

```yaml
auxiliary:
  compression:
    provider: "gmi"
    model: "anthropic/claude-opus-4.6"
```

GMI に補助の仕事を回す場合は、GMI の `/v1/models` エンドポイントが返すモデル ID をそのまま使ってください。Fireworks のモデル ID は、`accounts/fireworks/models/glm-5p2` のようにそのプロバイダ独自のスラッシュ形式です。

### よくある構成 {#common-setups}

**独自のエンドポイントを直接使う**（ローカルや自前ホストの API には `provider: "main"` より分かりやすい方法です）:
```yaml
auxiliary:
  vision:
    base_url: "http://localhost:1234/v1"
    api_key: "local-key"
    model: "qwen2.5-vl"
```

`base_url` は `provider` より優先されるので、補助の仕事を特定のエンドポイントへ回すいちばん明確な方法です。エンドポイントを直接上書きした場合、Hermes は設定した `api_key`、なければ `OPENAI_API_KEY` を使います。その独自エンドポイントに `OPENROUTER_API_KEY` を流用することはありません。

**画像に OpenAI の API キーを使う:**
```yaml
# In ~/.hermes/.env:
# OPENAI_BASE_URL=https://api.openai.com/v1
# OPENAI_API_KEY=sk-...

auxiliary:
  vision:
    provider: "main"
    model: "gpt-4o"       # or "gpt-4o-mini" for cheaper
```

**画像に OpenRouter を使う**（どのモデルにも回せます）:
```yaml
auxiliary:
  vision:
    provider: "openrouter"
    model: "openai/gpt-4o"      # or "google/gemini-2.5-flash", etc.
```

**Codex の OAuth を使う**（ChatGPT の Pro/Plus アカウント。API キーは不要）:
```yaml
auxiliary:
  vision:
    provider: "codex"     # uses your ChatGPT OAuth token
    # model defaults to gpt-5.3-codex (supports vision)
```

**MiniMax の OAuth を使う**（ブラウザでログイン、API キー不要）:
```yaml
model:
  default: MiniMax-M2.7
  provider: minimax-oauth
  base_url: https://api.minimax.io/anthropic
```
`hermes model` を実行して **MiniMax (OAuth)** を選ぶと、ログインしてこの設定が自動で入ります。中国リージョンでは base URL が `https://api.minimaxi.com/anthropic` になります。手順の全体は [MiniMax OAuth guide](/hermes/docs/guides/minimax-oauth/) を参照してください。

**ローカル／自前ホストのモデルを使う:**
```yaml
auxiliary:
  vision:
    provider: "main"      # uses your active custom endpoint
    model: "my-local-model"
```

`provider: "main"` は、Hermes が普段のチャットで使っているプロバイダをそのまま使います。名前付きの独自プロバイダ（たとえば `beans`）でも、`openrouter` のような組み込みのプロバイダでも、以前からの `OPENAI_BASE_URL` のエンドポイントでも同じです。

:::tip
主要なモデルのプロバイダに Codex の OAuth を使っているなら、画像は自動で動きます。追加の設定は要りません。Codex は画像の自動判定の並びに入っています。
:::

:::warning
**画像にはマルチモーダルのモデルが要ります。** `provider: "main"` を設定するときは、そのエンドポイントがマルチモーダル／画像に対応しているか確かめてください。対応していないと画像の解析は失敗します。
:::

### 環境変数（以前の方式） {#environment-variables-legacy}

補助のモデルは環境変数でも設定できます。ただし `config.yaml` のほうが望ましい方法です。管理しやすく、`base_url` と `api_key` を含むすべての項目に対応しているからです。

| 設定 | 環境変数 |
|---------|---------------------|
| 画像のプロバイダ | `AUXILIARY_VISION_PROVIDER` |
| 画像のモデル | `AUXILIARY_VISION_MODEL` |
| 画像のエンドポイント | `AUXILIARY_VISION_BASE_URL` |
| 画像の API キー | `AUXILIARY_VISION_API_KEY` |

圧縮とフォールバックのモデルの設定は config.yaml だけです。（`AUXILIARY_WEB_EXTRACT_*` の変数は使われなくなりました。web の抽出はもう補助の LLM を使いません。）

:::tip
今の補助のモデルの設定は `hermes config` で確認できます。上書きは、既定と違うときだけ表示されます。
:::

## 思考の深さ {#reasoning-effort}

答える前にモデルがどれだけ「考える」かを決めます。

```yaml
agent:
  reasoning_effort: ""   # empty = medium. Options: none, minimal, low, medium, high, xhigh, max, ultra
```

未設定（既定）のとき、思考の深さは "medium" になります。ほとんどの仕事にちょうどよい水準です。値を設定すると上書きされます。深くするほど複雑な仕事での結果はよくなりますが、その分トークンと待ち時間が増えます。

:::note OpenRouter 経由の適応的に考えるモデル（Claude 4.6 以降、Fable/Mythos 系）
これらのモデルは*適応的*に考えるので、通常の `reasoning.effort` の項目を受け付けません
（OpenRouter はそれらのモデルに対してこの項目を無視します）。Hermes はあなたの
`reasoning_effort` を、代わりに OpenRouter の `verbosity` の引数へ透過的に回します
（これは Anthropic の `output_config.effort` に対応します）。そのため、同じ深さのつまみが
選んだモデルの対応する段階のまま働き続けます。`none`（または未設定）は、モデル自身の
適応的な既定に任せます。
ネイティブの Anthropic のプロバイダはもともと深さを直接制御しているので、影響を受けません。
:::

:::note OpenRouter のモデルと対応する深さの段階
OpenRouter を経由するほかのモデルについて、Hermes は最新のモデルの
カタログの推論のメタデータ（`supported_parameters` とモデルごとの
`reasoning.supported_efforts`）を読み、そもそも推論の制御を送るかどうかを判断し、
要求された深さを実際にその経路が対応する最も近い段階へ丸めます（丸めは必ず
下向きです。たとえば `high` までしかない経路では `ultra` は `high` になり、
黙って引き上げられることはありません）。推論に対応した新しいベンダーは、
Hermes の更新を待たずに自動で使えるようになります。カタログに届かない場合や
モデルが載っていない場合、Hermes は組み込みのモデルの系統の一覧に頼り、
指定された深さをそのまま渡します。
:::

思考の深さは、`/reasoning` コマンドで動作中にも変えられます。

```
/reasoning                # Show current effort level and display state
/reasoning high           # Set reasoning effort to high (this session only)
/reasoning high --global  # Set effort and persist to config.yaml
/reasoning none           # Disable reasoning (this session only)
/reasoning show           # Show model thinking above each response
/reasoning hide           # Hide model thinking
```

深さの変更は既定でそのセッションだけに効きます。`--global` を付けると、新しい段階が
`agent.reasoning_effort` の既定として保存されます。

#### モデルごとの思考の深さの上書き {#per-model-reasoning-overrides}

モデルごとに違う思考の深さを設定できます。複雑なモデルには深く、速いモデルには中くらい、といった使い分けに便利です。

```yaml
agent:
  reasoning_effort: "medium"       # global default
  reasoning_overrides:
    "openrouter/anthropic/claude-opus-4.5": "xhigh"
    "openai/gpt-5": "low"
    "claude-sonnet-4.6": "high"    # bare model name also works
```

キーの照合は**表記のゆれに寛容**で、常識的な書き方ならどれでも一致します。
- `claude-opus-4.5`、`claude-opus-4-5`、`claude-opus.4.5`（ドットとハイフンは入れ替え可能）
- `anthropic/claude-opus-4.5`、`openrouter/anthropic/claude-opus-4.5`（プロバイダの接頭辞は任意）
- 完全一致が、ゆれた表記より優先されます

:::note
`reasoning_overrides` のキーには `hermes config set` が使えません。YAML のファイルを直接編集してください。モデル名にはドットが含まれることが多く（たとえば `claude-opus-4.5`）、CLI のドット区切りのキーの書き方とぶつかるからです。
:::

**解決の優先順位:**

1. セッション単位の `/reasoning --session` の上書き（gateway のみ）
2. `agent.reasoning_overrides` によるモデルごとの上書き（表記のゆれに寛容）
3. 全体の `agent.reasoning_effort`
4. プロバイダの既定

この上書きは、どこでも自動で効きます。CLI の起動時、メッセージングの gateway、デスクトップ／TUI、cron のジョブ、セッション途中の `/model` の切り替え、フォールバックのモデルの発動、すべてです。

## ツールを使わせる後押し {#tool-use-enforcement}

モデルによっては、ツールを呼ぶ代わりに、やろうとしている行動を文章で書いてしまうことがあります（実際にターミナルを呼ばずに「テストを走らせますね…」と書くようなものです）。ツールを使わせる後押しは、実際にツールを呼ぶ側へモデルを引き戻す案内をシステムプロンプトに差し込みます。

```yaml
agent:
  tool_use_enforcement: "auto"   # "auto" | true | false | ["model-substring", ...]
```

| 値 | ふるまい |
|-------|----------|
| `"auto"`（既定） | 次に当てはまるモデルで有効: `gpt`、`codex`、`gemini`、`gemma`、`grok`、`glm`、`qwen`、`deepseek`。それ以外（Claude など）では無効。 |
| `true` | モデルに関わらず常に有効。今のモデルが、行動する代わりに行動を書いていると気づいたときに便利です。 |
| `false` | モデルに関わらず常に無効。 |
| `["gpt", "codex", "qwen", "llama"]` | モデル名に、並べた文字列のどれかが含まれるときだけ有効（大文字小文字は区別しません）。 |

### 何が差し込まれるのか {#what-it-injects}

有効なとき、2 つの層の案内がシステムプロンプトに足されることがあります。

1. **ツールを使わせる一般の後押し**（当てはまるすべてのモデル） — 意図を書く代わりにすぐツールを呼ぶこと、仕事が終わるまで作業を続けること、これからやりますという約束でやり取りを終えないことを指示します。

2. **Google 向けの運用の案内**（Gemini と Gemma のモデルのみ） — 簡潔さ、絶対パス、ツールの並列呼び出し、編集前に確認するやり方についての案内です。

これらは利用者からは見えず、システムプロンプトにだけ効きます。すでに確実にツールを使うモデル（Claude など）にはこの案内は要らないので、`"auto"` はそれらを外しています。

### いつ有効にするか {#when-to-turn-it-on}

既定の自動の一覧に載っていないモデルを使っていて、実際にやる代わりに*やるつもり*をよく書いてくるなら、`tool_use_enforcement: true` にするか、モデル名の一部を一覧に足してください。

```yaml
agent:
  tool_use_enforcement: ["gpt", "codex", "gemini", "grok", "my-custom-model"]
```

## 実行の規律の案内 {#execution-discipline-guidance}

ツールを使わせる後押しとは別に、Hermes は評価の記録で見つかった一連の失敗の型を共有するモデルの系統に対して、**実行の規律**のブロックを差し込みます。その失敗の型とは、計算をコードでなく文章でやる、外部への書き込みのあとに読み返して確かめない、形の崩れた識別子を「直して」しまう、件数が合わないのに全部そろったと主張する、受け入れの条件をすべて確かめずに「完了」と宣言する、といったものです。

```yaml
agent:
  execution_guidance: "auto"   # "auto" | true | false | ["model-substring", ...]
```

| 値 | ふるまい |
|-------|----------|
| `"auto"`（既定） | 次に当てはまるモデルで有効: `gpt`、`codex`、`grok`、`deepseek`、`kimi`、`qwen`、`glm`、`minimax`、`mimo`、`mistral`。 |
| `true` | モデルに関わらず常に有効。 |
| `false` | モデルに関わらず常に無効。 |
| `["deepseek", "my-custom-model"]` | モデル名に、並べた文字列のどれかが含まれるときだけ有効（大文字小文字は区別しません）。 |

差し込まれるブロックが扱うのは次のことです。

- **ツールを使い続けること** — 仕事が終わり、*かつ*確かめられるまでツールを呼び続けること。空・不完全・不自然に狭い検索の結果は、結論を出す前に広い条件や別の条件で引き直すこと。
- **ツールの必須の利用** — 計算、ハッシュ、日付、システムの状態、ファイルの事実は、頭の中の計算ではなく必ずツールから得ること。
- **外部への書き込みの読み返し** — 外部のシステムの状態を変える書き込みのあとは、成功と言う前にその対象をそのまま読み返すこと（ツールがすでに確認した内部のファイルの編集は、改めて確かめません）。
- **件数の突き合わせ** — 宣言された合計（`total`、`reply_count`、`has_more`）は厳密な主張として扱い、食い違ったら取り直すか、プログラムで解析し直すこと。
- **そのままの保持** — 決められた形式に合わない識別子を、正規化したり「直したり」しないこと。検索に成功したことは、崩れた元の文字列を正当化しません。
- **確認を条件とする完了** — 「完了」とは、挙げられた受け入れの条件がすべて確かめられたことであって、それらしい一部ではありません。

この関門は `tool_use_enforcement` とは独立していて、片方だけを有効にできます。案内はモデル名を手がかりにセッションの開始時に一度だけ選ばれるので、システムプロンプトは会話の間バイト単位で変わりません（プロンプトのキャッシュにも都合がよくなります）。Gemini/Gemma は、より具体的な Google 向けの運用の案内を受け取るため自動の一覧から外れています。Claude は、これらの失敗の型を示さないため外れています。どのモデルでも `true` か文字列の一覧で有効にできます。

## ツールのループの歯止め {#tool-loop-guardrails}

Hermes は、エージェントが実りのないツール呼び出しのループにはまったことを検出します。同じ呼び出しが失敗し続ける、同じツールが何度も失敗する、同じ結果を返すだけで前に進まない、といった状態です。既定では、モデルが自分で立て直せるように**警告**をツールの結果に差し込みます。CLI/TUI を見ている人が割り込めるので、強制的には止めません。

無人の gateway／サーバーでの運用では、はまったエージェントが繰り返しの予算を燃やし尽くす代わりに遮断されるよう、強制停止を有効にしてください。

```yaml
tool_loop_guardrails:
  warnings_enabled: true       # inject warnings into tool results (default: true)
  hard_stop_enabled: false     # also BLOCK the call past the hard-stop threshold (default: false)
  warn_after:
    exact_failure: 2           # identical failing call repeated N times
    same_tool_failure: 3       # same tool failing N times (different args)
    idempotent_no_progress: 2  # same result, no progress, N times
  hard_stop_after:
    exact_failure: 5
    same_tool_failure: 8
    idempotent_no_progress: 5
  loop_caps:
    max_web_searches: 50       # max web_search calls per turn (0 = unlimited)
    max_subagents: 50          # max subagents spawned per turn (0 = unlimited)
```

`hard_stop_enabled` の既定が `false` なのは、対話のセッションには人が付いているからです。無人での運用（gateway、cron、かんばんの作業者）では `true` にして、繰り返す失敗を警告だけでなく遮断してください。[Docker / unattended deployments](/hermes/docs/user-guide/docker/) もあわせて参照してください。

### やり取りごとの暴走の上限 {#per-turn-runaway-loop-caps}

上の失敗に基づくしきい値とは別に、`loop_caps` は 1 回のエージェントのループ（やり取り）で許す `web_search` の呼び出し数とサブエージェントの起動数に、厳しい上限を置きます。数え直しは毎回のやり取りの始めに行われるので、正当な複数回のやり取りが痩せることはありません。1 回のやり取りが際限のない検索や委任のループに陥ったときだけ止まります。これは常に有効で、`hard_stop_enabled` に関わらず発動します。1 回のやり取りで web 検索を何十回も出したり、サブエージェントを何十個も起こしたりするのはすでに異常なので、既定は低めです。上限に達すると、その原因になったツールの呼び出しは説明付きで遮断され、残りの予算を燃やす代わりにやり取りがきれいに終わります。どちらの値も `0` にすれば、その上限だけを無効にできます。

`delegate_task` を 1 回まとめて呼んだ場合、その中の各タスクが `max_subagents` に数えられます（3 件のまとまりは 3 を消費します）。この上限は `delegate_task` の呼び出し回数ではなく、実際に起きたサブエージェントの数を追います。

これは Claude Code のセッションごとの WebSearch とサブエージェントの上限（v2.1.212）を写したものです。あちらも既定は 200 で、`/clear` でリセットされます。

### 実行中の停滞を防ぐ守り {#runtime-anti-stall-guards}

上の失敗に基づく歯止めを補うものとして、`agent.stall_guards`（既定 `true`）は、無駄なやり取りを防ぐ控えめな守りを 2 つ有効にします。1 つ目は**同一の呼び出しのループ断ち**です。同じツールがまったく同じ引数で 3 回以上続けて呼ばれ、*かつ*まったく同じ結果を返したとき、そのツールの結果に短い 1 行の注意が足され、同じ呼び出しを繰り返さないようモデルに伝えます。呼び出しを遮断することはなく、正当に繰り返す状態確認（`process`、`*_get_result`、`*_poll`）は対象外です。2 つ目は**続きの意図の立て直し**です。モデルがツールを呼ばずにやり取りを終え、しかも短い返答が行動の予告で途切れているとき（「では、ファイルを更新しますね…」）、Hermes は意図の確認からの立て直しと同じ、回数の限られた続きの仕組みで、実際に動くよう促し直します（1 回のやり取りにつき最大 2 回）。どちらもキャッシュを壊しません（注意は結果を作るときに足され、あとから遡って書き換えることはありません）。まとめて無効にできます。

```yaml
agent:
  stall_guards: false
```

同じ関門は、**結果の参照だけを残す置き換え**も有効にします。同一のツールの呼び出しをやり直した結果がバイト単位でまったく同じだった場合、重複した中身をそのまま繰り返す代わりに、先の結果を指す短い参照（ツール名、`tool_call_id`、引数の要約、そして最初の結果がディスクに保存されていればそのあふれ出し先のパス）がコンテキストに入ります。ツール自体は毎回実行されるので、状態確認の意味は保たれます。結果が変わったときは必ず全文が流れます。512 文字未満の結果、エラーの結果、マルチモーダルの結果は決して置き換えられません。状態確認は置き換えの対象*です*（変化のない確認こそ、重複した中身に情報がない場合そのものだからです）。

### やり取りの生存の見張り {#turn-liveness-watchdog}

`agent.turn_liveness` は、Hermes が強制的に立て直すまでに、1 回の会話のやり取りが**目に見える前進を何も出さない**でいられる時間を区切ります。この見張りは活動の時計（API の待ち、ストリームのトークン、ツールの生存の合図に印を付けるのと同じ信号。リースの更新は数えません）を手がかりにするので、途中で黙って詰まったやり取り（issue #95548 で観測されたもの。ツールの実行もなく、API の呼び出しもなく、エラーもないのに、セッションは「作業中」のまま）は、はっきり表に出され、やり直せる中断として巻き戻るよう割り込まれます。そして割り込みでも詰まりを解けないときは、そのやり取りの永続的なリースの更新を止め、プロセスを殺すまでぶら下がる代わりに、古いやり取りの後始末がセッションを回収できるようにします。

```yaml
agent:
  turn_liveness:
    timeout_s: 600.0   # idle bound; <= 0 disables the watchdog
    poll_s: 15.0        # sampling interval (seconds)
```

正当に時間のかかる作業が罰せられることはありません。ストリーミングの応答、（ツールの実行中に 30 秒ごとに出る）ツールの生存の合図、承認の待ちは、いずれも時計に触れ続けます。区切りいっぱい*まったく*前進しなかったやり取りだけが、この見張りを発動させます。おかしな値（打ち間違い、`NaN`、`Inf`、0 以下の `poll_s`）は警告を出して既定に戻ります。起動を落とすことも、黙って見張りを止めることもありません。発動した打ち切りは、立て直しを始めるときに停滞を報告し、割り込みが実際に確定してから、打ち切り／リース停止という最終的な結果を出します。

## TTS の設定 {#tts-configuration}

```yaml
tts:
  provider: "edge"              # "edge" | "elevenlabs" | "openai" | "minimax" | "mistral" | "gemini" | "xai" | "neutts" | "kittentts" | "piper" | "deepinfra"
  speed: 1.0                    # Global speed multiplier (fallback for all providers)
  edge:
    voice: "en-US-AriaNeural"   # 322 voices, 74 languages
    speed: 1.0                  # Speed multiplier (converted to rate percentage, e.g. 1.5 → +50%)
  elevenlabs:
    voice_id: "pNInz6obpgDQGcFmaJgB"
    model_id: "eleven_multilingual_v2"
  openai:
    model: "gpt-4o-mini-tts"
    voice: "alloy"              # alloy, echo, fable, onyx, nova, shimmer
    speed: 1.0                  # Speed multiplier (clamped to 0.25–4.0 by the API)
    base_url: "https://api.openai.com/v1"  # Override for OpenAI-compatible TTS endpoints
  minimax:
    speed: 1.0                  # Speech speed multiplier
    # base_url: ""              # Optional: override for OpenAI-compatible TTS endpoints
  mistral:
    model: "voxtral-mini-tts-2603"
    voice_id: "c69964a6-ab8b-4f8a-9465-ec0925096ec8"  # Paul - Neutral (default)
  gemini:
    model: "gemini-2.5-flash-preview-tts"   # or gemini-3.1-flash-tts-preview
    voice: "Kore"               # 30 prebuilt voices: Zephyr, Puck, Kore, Enceladus, etc.
    audio_tags: false           # Hidden Gemini 3.1 TTS audio-tag insertion
    persona_prompt_file: ""      # Optional Markdown/text file with Gemini voice direction
  xai:
    voice_id: "eve"             # xAI TTS voice
    language: "en"              # ISO 639-1
    sample_rate: 24000
    bit_rate: 128000            # MP3 bitrate
    # base_url: "https://api.x.ai/v1"
  neutts:
    ref_audio: ''
    ref_text: ''
    model: neuphonic/neutts-air-q4-gguf
    device: cpu
```

ここでの設定は、`text_to_speech` のツールと、音声モード（CLI やメッセージングの gateway での `/voice tts`）での読み上げの両方に効きます。

**速さの優先順位:** プロバイダごとの速さ（たとえば `tts.edge.speed`） → 全体の `tts.speed` → 既定の `1.0`。全プロバイダで同じ速さにしたいなら全体の `tts.speed` を、細かく分けたいならプロバイダごとに設定してください。

## 表示の設定 {#display-settings}

```yaml
display:
  tool_progress: all      # off | new | all | verbose
  tool_progress_command: false  # Enable /verbose slash command in messaging gateway
  focus_view: false       # CLI focus view (/focus) — reduced output, display-only
  platforms: {}           # Per-platform display overrides (see below)
  interim_assistant_messages: true  # Gateway: send natural mid-turn assistant updates as separate messages
  show_commentary: true   # Codex models: deliver commentary-channel progress narration as visible mid-turn updates
  skin: default           # Built-in or custom CLI skin (see user-guide/features/skins)
  personality: ""         # Legacy cosmetic field still surfaced in some summaries
  compact: false          # Compact output mode (less whitespace)
  cli_multiline_shortcuts: true  # CLI: Ctrl+J, \ + Enter, and supported Shift+Enter insert newlines (false = legacy c-j submit fallback)
  resume_display: full    # full (show previous messages on resume) | minimal (one-liner only)
  bell_on_complete: false # Play terminal bell when agent finishes (great for long tasks)
  show_reasoning: true    # Show model reasoning/thinking above each response (default: true; toggle with /reasoning show|hide)
  streaming: false        # Stream tokens to terminal as they arrive (real-time output)
  show_cost: false        # Show estimated $ cost in the CLI status bar
  timestamps: false       # When true, prefixes user and assistant labels with timestamps in the CLI / TUI transcript
  timestamp_format: "%H:%M"  # strftime format for those timestamps (e.g. "%b-%d %H:%M" for month-day)
  tool_preview_length: 0  # Max chars for tool call previews (0 = no limit, show full paths/commands)
  turn_summary: true      # CLI only: print a one-line post-turn accounting footer after each interactive turn
  spinner_token_flow: true # CLI only: append live cumulative turn tokens to the spinner timer
  runtime_footer:         # Gateway: append a runtime-context footer to final replies
    enabled: false
    fields: ["model", "context_pct", "cwd"]
  status_bar:             # CLI/TUI: choose which status-bar fields are visible
    fields: []            # empty = show the default set; see below
  file_mutation_verifier: true    # Append an advisory footer when write_file/patch calls failed this turn
  credits_notices: true   # Nous credits status-bar notices (usage bands, grant-spent, depleted). false = silence them; /usage still works
  cli_rebuild_scrollback_on_redraw: false  # Classic CLI: also wipe terminal scrollback (CSI 3J) on /redraw / Ctrl+L / width-change resize recovery. Enable when a terminal/tmux stack stamps stale prompt chrome into scrollback on maximize/restore.
  language: en            # UI language for static messages (approval prompts, some gateway replies). en | zh | zh-hant | ja | de | es | fr | tr | uk | af | ko | it | ga | pt | ru | hu
```

### やり取りごとの要約と、スピナーのトークンの流れ {#per-turn-summary-and-spinner-token-flow}

`display.turn_summary`（既定 `true`）は、**対話的な CLI** のやり取りのあとに、そのやり取りが実際に何をしたかをまとめた薄い色の 1 行を出します。

```
⋯ 12.4s · edited 2 files +18 -3 · read 4 files · ran 3 commands
```

集計は、CLI がもともと受け取っているツールの進み具合の流れから読み取っているので、追加の費用はかかりません。細かい点は次のとおりです。

- 時間はそのやり取りの実際の長さです（1 分を超えると `2m05s` の形になります）。
- ツールの呼び出しは動詞（`edited`、`read`、`ran`、`searched`、…）でまとめられ、単数・複数も正しくなります。決まった動詞のないプラグイン／MCP のツールは `called N tools` にまとまります。
- `+X -Y` の行数の増減は、ツールの結果がすでに差分を報告しているときだけ出ます（今のところ `patch`）。Hermes がこれを計算するために git を呼ぶことはないので、`write_file` の編集は増減なしで数えられます。
- **失敗したツールの呼び出しは数えません** — 拒否された書き込みが、成功した編集として表示されることはありません（補い合う警告として [ファイル変更の検証](#file-mutation-verifier) も参照してください）。
- 長いやり取りは、動詞の区切りを 4 つまでにして末尾に `+N more` を付けるので、行が折り返すことはありません。
- ツールを呼ばずに終わった短いやり取りでは、何も出ません。

`display.spinner_token_flow`（既定 `true`）は、CLI のスピナーの動く時計に、そのやり取りの累積の出力トークン数を足します。

```
  ⚡ Reading cli.py  (  2.3s · ↓ 1.2k tok)
```

数はやり取りごとです（セッションの合計はやり取りの始めを基準にします）。やり取りの中の API 呼び出しが使用量を報告するたびに更新されます。最初の使用量の報告が届くまでは何も出ないので、紛らわしい `↓ 0 tok` を見ることはありません。

どちらのキーも表示だけ、しかも CLI だけのものです。静かなモード、`display.tool_progress` が `off` のとき、1 問 1 答や `-Q` の一括実行、gateway／メッセージングの画面では出ません（そちらは `display.runtime_footer` を使います）。どちらのキーも `false` にすれば止められます。

### ファイル変更の検証 {#file-mutation-verifier}

`display.file_mutation_verifier` が `true`（既定）のとき、Hermes は、そのやり取りの中で `write_file` か `patch` の呼び出しが失敗し、同じパスへの成功した書き込みで打ち消されなかった場合に、アシスタントの最終的な返答へ 1 行の注意を足します。これは「並列のパッチをまとめて出し、半分が黙って失敗し、モデルは成功したかのようにまとめる」という種類の言い過ぎを、編集のたびに自分で `git status` を走らせなくても捕まえます。

出る注意の例:

```
⚠️ File-mutation verifier: 3 file(s) were NOT modified this turn despite any wording above that may suggest otherwise. Run `git status` or `read_file` to confirm.
  • concepts/automatic-organization.md — [patch] Could not find match for old_string
  • concepts/lora.md — [patch] Could not find match for old_string
  • concepts/rag-pipeline.md — [patch] Could not find match for old_string
```

この注意を止めるには `file_mutation_verifier: false`（または `HERMES_FILE_MUTATION_VERIFIER=0`）にしてください。この検証は、やり取りの終わりに本当の失敗が残っているときだけ発動します。失敗したパッチを同じやり取りの中でやり直して成功したモデルは、そのファイルについて発動させません。

**モデルのまとめより、この検証を信じてください。** この注意は、挙がったファイルがディスク上で変更されて**いない**ことを意味します。アシスタントの締めの文章が完了したと言っていてもです。よくある原因は次のとおりです。

- **書き込みの拒否** — パスが認証情報の禁止一覧にあるか、`HERMES_WRITE_SAFE_ROOT` の外にある（[File write safety](/hermes/docs/user-guide/security/#file-write-safety) を参照）
- **パッチの不一致** — `old_string` がディスク上のファイルと合わなかった
- **構文の関門** — 書き込む前の内容が JSON/YAML/TOML の検証に通らなかった

書き込みが遮断されたときの注意の例:

```
⚠️ File-mutation verifier: 2 file(s) were NOT modified this turn despite any wording above that may suggest otherwise. Run `git status` or `read_file` to confirm.
  • ~/.hermes/cron/jobs.json — [patch] Write denied: '…' is outside HERMES_WRITE_SAFE_ROOT (/path/to/project)
  • ~/.hermes/scripts/monitor.py — [write_file] Write denied: '…' is outside HERMES_WRITE_SAFE_ROOT (/path/to/project)
```

Hermes の状態（cron のジョブ、スキル、`~/.hermes/` の下のスクリプト）への書き込みが失敗しているなら、環境に `HERMES_WRITE_SAFE_ROOT` が設定されていないか確かめてください。cron の変更には、`jobs.json` を直接パッチする代わりに `cronjob` のツールか `hermes cron edit` を使ってください。

### 定型メッセージの表示の言語 {#ui-language-for-static-messages}

`display.language` の設定は、利用者に見える定型のメッセージのごく一部を翻訳します。CLI の承認の確認と、gateway のスラッシュコマンドのいくつかの返答（再起動の切り離しの知らせ、「approval expired」、「goal cleared」など）です。エージェントの返答、ログの行、ツールの出力、エラーのトレース、スラッシュコマンドの説明は翻訳され**ません**。それらは英語のままです。エージェント自身に別の言語で答えてほしいときは、プロンプトかシステムのメッセージでそう伝えてください。

使える値: `en`（既定）、`zh`（簡体字中国語）、`zh-hant`（繁体字中国語）、`ja`（日本語）、`de`（ドイツ語）、`es`（スペイン語）、`fr`（フランス語）、`tr`（トルコ語）、`uk`（ウクライナ語）、`af`（アフリカーンス語）、`ko`（韓国語）、`it`（イタリア語）、`ga`（アイルランド語）、`pt`（ポルトガル語）、`ru`（ロシア語）、`hu`（ハンガリー語）。知らない値は英語に戻ります。

セッションごとに `HERMES_LANGUAGE` の環境変数で設定することもでき、そちらが設定ファイルの値より優先されます。

```yaml
display:
  language: zh   # CLI approval prompts appear in Chinese
```

| モード | 見えるもの |
|------|-------------|
| `off` | 静か — 最終的な返答だけ |
| `new` | ツールが変わったときだけ、その表示 |
| `all` | すべてのツールの呼び出しを短い要約付きで（既定） |
| `verbose` | 引数・結果・デバッグのログをすべて |

CLI では `/verbose` でこれらのモードを順に切り替えられます。メッセージングのプラットフォーム（Telegram、Discord、Slack など）で `/verbose` を使いたいときは、上の `display` の節で `tool_progress_command: true` を設定してください。すると、このコマンドがモードを切り替えて設定に保存します。

ツールの進み具合の表示には、進捗の更新を安全に表示できる gateway のアダプタが要ります。メッセージの編集に対応していないプラットフォーム（Signal を含む）は、`/verbose` で `off` 以外のモードが保存されていても、進み具合の吹き出しを出しません。

### 集中表示（`/focus`、CLI + TUI） {#focus-view-focus-cli-tui}

`display.focus_view: true` は**集中表示**を有効にします。実況ではなく答えがほしいときのための、出力を減らした表示のモードです。これは 2 つ目の抑制の経路ではなく、同じ `tool_progress` の仕組みの上に乗る薄い層です。

- 有効にすると `tool_progress` は `off` に固定され、それまでのモードは `display.focus_saved_tool_progress` に控えられます。
- `/focus off` はそのモードをそのまま戻すので、`/verbose verbose` の設定は往復しても残ります。
- やり取りが終わるたびに、薄い色の復帰の案内 — `⋯ 7 tool lines hidden · /focus off to show` — が出ます。数は*集中表示に入る前*のモードを基準に数えられるので、もともと切ってあった行を隠したと主張することはありません。
- 状態の帯には `◉ focus` の印が出続けます（prompt_toolkit の CLI でも Ink の TUI でも）。出力を減らしたことが見えなくなることはありません。
- 集中表示の最中に `/verbose` を回すと、モードの主導権は `/verbose` に戻り、印は消えます。

集中表示は**表示だけ**のものです。会話の履歴、システムプロンプト、ツールのスキーマ、リクエストの中身に手を触れることはありません。隠された細部は画面で抑えられるだけで、捨てられることはなく、プロンプトのキャッシュにもまったく影響しません。

### 状態の帯の項目の選択（CLI/TUI） {#status-bar-field-selection-clitui}

CLI/TUI の下にある対話中の状態の帯は、モデル、コンテキストの使用量、圧縮の回数、裏の作業の数、時計、モードの印を表示します。`display.status_bar.fields` は、そのうちどれを出すかを選びます。最小限の帯（モデルと経過時間だけ）にしたり、既定では出ないセッションの合計トークン数を出したりするのに便利です。

```yaml
display:
  status_bar:
    fields: ["model", "duration", "total_tokens"]   # visibility only; built-in order is preserved
```

使える項目: `model`、`context_detail`（使用／合計のトークン）、`context_pct`（割合とメーター）、`cache_hit`（プロンプトのキャッシュの命中率。モデルの切り替えと圧縮でリセットされます）、`latency`（直近 10 回の API の平均の待ち時間）、`tps`（直近 10 回の出力トークン毎秒）、`compressions`、`bg_tasks`、`bg_processes`、`bg_subagents`、`goal`、`duration`、`prompt_elapsed`、`idle_since`、`focus`、`yolo`、`stash`、`battery`、`title`（右寄せのセッションの印）、`total_tokens`（セッションの合計。明示したときだけ出ます。既定では決して出ません）。

補足:

- 空の一覧（既定）では、標準の組み合わせ（`total_tokens` 以外のすべて）になります。
- この設定が決めるのは**表示するかどうかであって、並び順ではありません**。項目は組み込みの位置に出ます。
- 狭い端末では、設定に関わらず幅の広いモード専用の項目（`context_detail`、`cache_hit`、`latency`、`tps`、`prompt_elapsed`、`idle_since`）が落ちます（`cache_hit` は 52 桁以上の中くらいの段でも出ます）。
- `latency`/`tps` は、API の呼び出しが記録されるまで出ません（たとえば Codex の app-server のバックエンドは待ち時間を報告しません）。
- `battery` と `title` の表示は、それぞれの切り替え（`/battery`、`/title`）とも組み合わさります。両方が有効でないとその区画は出ません。
- 同じキーは **Ink の TUI**（`hermes tui`）の状態の行にも効きます。そこでは `cache_hit`、`latency`、`tps` が、それぞれ 96／104／110 桁以上の端末で、幅に合わせた末尾の区画（◎ / ◷ / ↑）として表示されます。
- 表示だけのものです。プロンプトのキャッシュやリクエストの中身には影響しません。変更は次のセッションの開始から効きます。

### 実行情報の脚注（gateway のみ） {#runtime-metadata-footer-gateway-only}

`display.runtime_footer.enabled: true` のとき、Hermes は gateway の各やり取りの**最後の**メッセージに、小さな実行情報の脚注を足します。今の脚注は、モデル、コンテキストの窓の割合、今の作業ディレクトリを出せます。既定では無効です。返答のすべてにこの出所を付けたいチームは、gateway ごとに有効にしてください。

```yaml
display:
  runtime_footer:
    enabled: true
    fields: ["model", "context_pct", "cwd"]   # order shown; drop any to hide
```

使える項目:

| 項目 | 表示されるもの | 例 |
| --- | --- | --- |
| `model` | モデル ID のみ（ベンダーの接頭辞は落とします） | `gpt-5.4` |
| `context_pct` | 直近の呼び出しのコンテキストの占有率 | `5%` |
| `latency` | そのやり取りの実時間 | `22s`、`1m05s` |
| `cwd` | ホームからの相対の作業ディレクトリ | `~` |

既定の項目は `["model", "context_pct", "cwd"]` です。`latency` は明示したときだけ使えます。使いたいときは `fields` に足してください。データが得られない項目は、空の枠を出さずに黙って飛ばされます。

`/footer` のスラッシュコマンドで、どのセッションでも動作中に切り替えられます。

Telegram/Discord/Slack の返答に付く脚注の例:

```
— claude-opus-4.7 · 12 tool calls · 2m 14s · $0.042
```

脚注が付くのはやり取りの**最後の**メッセージだけです。途中の更新はきれいなままです。

### プラットフォームごとの進み具合の上書き {#per-platform-progress-overrides}

プラットフォームごとに、ちょうどよい詳しさは違います。`display.platforms` でプラットフォームごとのモードを設定してください。

```yaml
display:
  tool_progress: all          # global default
  platforms:
    signal:
      tool_progress: 'off'    # Signal cannot currently display tool-progress bubbles
    telegram:
      tool_progress: verbose  # detailed progress on Telegram
    slack:
      tool_progress: 'off'    # quiet in shared Slack workspace
```

上書きのないプラットフォームは、全体の `tool_progress` の値に従います。使えるプラットフォームのキー: `telegram`、`discord`、`slack`、`signal`、`whatsapp`、`matrix`、`mattermost`、`email`、`sms`、`homeassistant`、`dingtalk`、`feishu`、`wecom`、`weixin`、`bluebubbles`、`qqbot`。以前の `display.tool_progress_overrides` のキーも互換のためまだ読み込まれますが、非推奨で、最初の読み込み時に `display.platforms` へ移行されます。

Signal が使えるキーとして挙がっているのは、プラットフォームごとに設定を保存できるからですが、今の Signal のアダプタは送ったメッセージを編集できず、進み具合の吹き出しを出しません。Signal の `tool_progress` は `off` のままにしてください。ツールの呼び出しを逐一見たいなら、CLI か、編集に対応したメッセージングのプラットフォームを使ってください。

`interim_assistant_messages` は gateway だけのものです。有効にすると、Hermes はやり取りの途中で出来上がったアシスタントの更新を、別のチャットのメッセージとして送ります。これは `tool_progress` とは独立していて、gateway のストリーミングも要りません。

`show_commentary`（既定 `true`）は、Codex Responses のモデルの解説の経路 — これらのモデルが内部の推論とは別に出す、整った進み具合の語り — を制御します。有効にすると、出来上がった解説のメッセージはやり取りの途中の更新として見える形で届きます（gateway ではあわせて `interim_assistant_messages` も要ります）。余計な語りが煩わしければ `false` にしてください。そのとき解説は推論の経路に落ち、`show_reasoning` が有効なときだけ表示されます。

## プライバシー {#privacy}

```yaml
privacy:
  redact_pii: false  # Strip PII from LLM context (gateway only)
```

`redact_pii` が `true` のとき、gateway は対応するプラットフォームで、LLM へ送る前にシステムプロンプトから個人を特定できる情報を伏せます。

| 項目 | 扱い |
|-------|-----------|
| 電話番号（WhatsApp/Signal の利用者 ID） | `user_<12-char-sha256>` にハッシュ化 |
| 利用者 ID | `user_<12-char-sha256>` にハッシュ化 |
| チャット ID | 数字の部分をハッシュ化し、プラットフォームの接頭辞は残す（`telegram:<hash>`） |
| ホームのチャンネル ID | 数字の部分をハッシュ化 |
| 利用者名・ユーザー名 | **対象外**（本人が選んだ、公に見える名前のため） |

**対応するプラットフォーム:** 伏せ字は WhatsApp、Signal、Telegram に適用されます。Discord と Slack は、メンションの仕組み（`<@user_id>`）が LLM のコンテキストに本物の ID を必要とするため対象外です。

ハッシュは決まった値になります。同じ利用者は常に同じハッシュになるので、グループのチャットでもモデルは利用者を見分けられます。配信とルーティングでは、内部で元の値が使われます。

### OpenAI Codex のリクエストの身元 {#openai-codex-request-identity}
OpenAI は、第三者が作る Codex の実行環境に対して身元を名乗ることを求めています。
公式の Codex のエンドポイントへの ChatGPT で認証したリクエストには、自動で
`originator: hermes-agent` と `User-Agent: HermesAgent/<version>` が付きます。
既存の ChatGPT アカウントのヘッダーはそのまま残ります。プロンプトの中身が
追加されることも、遠隔測定のリクエストが送られることもありません。
OpenAI の API を直接使うリクエストと、独自のプロキシのエンドポイントは変わりません。

## 音声認識（STT） {#speech-to-text-stt}

```yaml
stt:
  enabled: true                # Auto-transcribe inbound voice messages (default: true)
  echo_transcripts: true       # Post raw transcripts back to the chat as 🎙️ "..." (default: true)
  provider: "local"            # "local" | "groq" | "openai" | "mistral" | "xai" | "elevenlabs" | "deepinfra" | ...
  language: "en"               # GLOBAL language hint for every provider (per-provider language wins); set "" for auto-detect
  cloud_trim_silence: true     # trim long pauses with ffmpeg before uploading to a cloud provider (default: true)
  cloud_trim_threshold_db: -40 # audio quieter than this counts as silence
  cloud_trim_keep_ms: 300      # how much of each pause survives the trim (keeps natural pacing)
  # prompt: "Hermes, Teknium, Nous Research, kanban"   # Static vocabulary hint (see below)
  local:
    model: "base"              # tiny, base, small, medium, large-v3
    language: ""               # per-provider override of stt.language
    initial_prompt: ""         # optional whisper prompt to bias vocabulary/script (e.g. Simplified Chinese)
    vad: true                  # Silero VAD filter (default on) — silence never reaches whisper; false = raw behavior (music/ambient)
    vad_min_silence_ms: 500    # min silence (ms) that splits speech chunks when vad is on
    no_speech_prob_threshold: 0.6  # drop a segment only when no_speech_prob > this...
    logprob_threshold: -1.0        # ...AND avg_logprob < this (both must hit — quiet real speech survives)
    unload_after_idle_seconds: 0   # 0=never unload (default); e.g. 300 = release the model after 5min idle
  groq:
    language: ""               # per-provider override of stt.language
  openai:
    model: "whisper-1"         # whisper-1 | gpt-4o-mini-transcribe | gpt-4o-transcribe | gpt-transcribe
    language: ""               # per-provider override of stt.language
  # model: "whisper-1"         # Legacy fallback key still respected
```

言語の解決のしかたは、**すべての** STT のプロバイダ（local、groq、openai、mistral、xai、elevenlabs、deepinfra、コマンド型のプロバイダ、プラグイン）で同じです: `stt.<provider>.language` → `stt.language` → `HERMES_LOCAL_STT_LANGUAGE` の環境変数 → プロバイダの自動判定。**既定は `stt.language: "en"`** です。Whisper の自動判定は、短い音声やなまりのある音声をよく取り違え、それが音声メモを違う言語で書き起こす形で表に出ます。英語以外を話す人は、`stt.language` に自分の言語コードを一度だけ設定してください（たとえば `"es"`、`"zh"`、`"uk"`）。多言語で使いたいときは `""` にすると自動判定に戻ります。

gateway に音声メモを書き起こさせつつ、生の書き起こしをチャットに戻したくないときは（顧客と向き合う WhatsApp のボットなど）、`stt.echo_transcripts: false` にしてください。

プロバイダごとのふるまい:

- `local` は手元の端末で `faster-whisper` を動かします。`pip install faster-whisper` で別途インストールしてください。無音での幻覚への対策は既定で有効です。Silero の VAD の絞り込みが無音や雑音を Whisper に届かせず、窓をまたいだ条件付けは無効になり、モデル自身が「たぶん音声ではない」と判断し*かつ*確信度が低い区間は捨てられます。音声でない音（音楽や環境音）をそのまま書き起こしたいときは `stt.local.vad: false` にしてください。モデルは音声メッセージの間もメモリに残り、待ち時間を短く保ちます。`stt.local.unload_after_idle_seconds`（たとえば 5 分なら `300`）を設定すると、使われていないときに自動でモデルを解放します。CUDA のホストではこれで GPU のメモリが空き（ローカルの LLM が GPU を共有しているときの主な利点です）、CPU ではプロセスがそのメモリを再利用できるようになります（ただし OS から見える使用量は、プロセスが別の用途でその領域を必要とするまで減らないことがあります）。次の音声メッセージで、モデルは何ごともなく読み込み直されます。
- `groq` は Groq の Whisper 互換のエンドポイントを使い、`GROQ_API_KEY` を読みます。`stt.groq.language`（または全体の `HERMES_LOCAL_STT_LANGUAGE` の環境変数）を渡すと自動判定を省け、待ち時間が減ります。
- `openai` は OpenAI の音声 API を使い、`VOICE_TOOLS_OPENAI_KEY` を読みます。

クラウドのプロバイダ（groq、openai、mistral、xai、elevenlabs、deepinfra）では、`ffmpeg` が入っていれば既定で**アップロード前の無音の刈り取り**が行われます。音声メモの長い間はファイルを送る前にクライアント側で詰められ、各所の間を `cloud_trim_keep_ms` だけ残すので自然な間合いは保たれます。音声が短くなると、アップロードが速くなり、音声 1 分あたりの課金が減り、遠くのモデルによる無音での幻覚も減ります。12 秒より短い音声は刈り取りをまるごと飛ばします（そこでは節約の意味がなく、いくつかのプロバイダはどのみちリクエストごとの最低額を課すからです）。刈り取りはあくまで最善努力です。ffmpeg がない、刈り取りが失敗する、音声がほとんど無音、刈り取っても 10% 程度も減らない、といった場合は元のファイルがそのままアップロードされます。常に元のまま送りたいときは（クラウドのプロバイダで音楽や環境音を書き起こす場合など）`stt.cloud_trim_silence: false` にしてください。コマンド型とプラグインのプロバイダには、刈り取った音声は渡されません。

`stt.provider` を明示した場合は厳密に守られます。使えないときは、プロバイダを勝手に切り替えるのではなく、`hermes tools` を実行するよう案内するエラーになります。プロバイダを一度も選んでいないときにだけ、Hermes は `local` → `groq` → `openai` の順で自動判定します。

Groq と OpenAI のモデルの上書きは、環境変数で行います。

```bash
STT_GROQ_MODEL=whisper-large-v3-turbo
STT_OPENAI_MODEL=whisper-1
GROQ_BASE_URL=https://api.groq.com/openai/v1
STT_OPENAI_BASE_URL=https://api.openai.com/v1
```

### 書き起こしのプロンプト（語彙のヒント） {#transcription-prompt-vocabulary-hints}

`stt.prompt` は、プロンプトに対応した STT のバックエンドへ渡す、任意の固定のヒントです。Whisper 系のモデルが取り違えがちな固有名詞、製品名、専門用語に使ってください。

```yaml
stt:
  provider: "local"
  prompt: "Hermes, Teknium, Nous Research, kanban, Ollama"
```

**組み立て方。** 設定の値が土台になります。[`pre_transcription`](/hermes/docs/user-guide/features/hooks/#pre_transcription) のフックを登録したプラグインは、その上に手を加えます（項目ごとに、最後に書いたものが勝ちます）。複数のプラグインのヒントは決まった順で重なります。プラグインの読み込みはプラグイン id の昇順で行われ、各プラグインのコールバックは登録された順に走るので、同じ組み合わせのプラグインからは常に同じ最終のプロンプトができます。フックが `prompt` に空文字列を返すと、そのリクエストでは設定のプロンプトが消えます。フックは `language` と `model` も上書きできます。`file_path` は読み取り専用で、変えようとするとログに残して捨てられます。フックを登録せず `stt.prompt` も設定していない場合、送られるリクエストは以前の版とまったく同じです。

**プロバイダの対応。**

| プロバイダ | プロンプトの引数 | ふるまい |
|----------|-----------------|----------|
| `local`（faster-whisper） | `initial_prompt` | そのままローカルのモデルへ渡します |
| `openai` | `prompt` | 書き起こしのリクエストにそのまま渡します |
| `groq` | `prompt` | 書き起こしのリクエストにそのまま渡します |
| `mistral` | `prompt` | 書き起こしのリクエストにそのまま渡します |
| `deepinfra` | `prompt` | OpenAI 互換の経路で、そのまま渡します |
| `xai` | 非対応 | DEBUG に記録し、プロンプトなしでリクエストを進めます |
| `elevenlabs` | 非対応 | DEBUG に記録し、プロンプトなしでリクエストを進めます |
| `local_command` | 非対応 | DEBUG に記録し、プロンプトなしでリクエストを進めます |
| `type: command` を持つ `stt.providers.<name>` | 非対応 | DEBUG に記録し、プロンプトなしでリクエストを進めます |
| プラグインが登録したプロバイダ | `transcribe(**extra)` の引数の `prompt` | プロンプトが設定されているときだけ送るので、このキーより前からあるプロバイダは呼び出しが変わりません |

**長さ。** Whisper 系のモデルは、プロンプトの末尾およそ 224 トークン分にしか反応しません。whisper 系のバックエンド（`local`、`openai`、`groq`、`deepinfra`）では、Hermes がこの上限をクライアント側で守ります。長すぎる最終のプロンプトは末尾側に切り詰められ、警告がログに出ます。プロンプトの長さでリクエストがエラーになることはありません。ほかのバックエンド（`mistral`、プラグインのプロバイダ）はプロンプトをそのまま受け取り、検証は各自に任されます。いずれにせよ、ヒントは短く具体的にしてください。

:::warning プロンプトは音声と一緒にアップロードされます
最終的なプロンプトは、音声ファイルとともに設定した STT のプロバイダへ送られます。秘密情報やセッション由来の文脈は、`stt.prompt` にも、`pre_transcription` のフックが返すものにも入れないでください。とくにプロバイダがローカルの `faster-whisper` ではなく、外部のサービスの場合は注意してください。
:::

## 音声モード（CLI） {#voice-mode-cli}

```yaml
voice:
  record_key: "ctrl+b"         # Push-to-talk key inside the CLI
  max_recording_seconds: 120    # Hard stop for long recordings
  auto_tts: false               # Enable spoken replies automatically when /voice on
  beep_enabled: true            # Play record start/stop beeps in CLI voice mode
  beep_volume: 0.3              # Beep amplitude (0.0-1.0); raise it on quiet systems / headphones
  silence_threshold: 200        # RMS threshold for speech detection
  silence_duration: 3.0         # Seconds of silence before auto-stop
```

CLI で `/voice on` を実行するとマイクのモードになり、`record_key` で録音を開始・停止し、`/voice tts` で読み上げを切り替えます。準備の全体とプラットフォームごとのふるまいは [Voice Mode](/hermes/docs/user-guide/features/voice-mode/) を参照してください。

## ストリーミング {#streaming}

返答が出そろうのを待たずに、トークンが届くそばから端末やメッセージングのプラットフォームへ流します。

### CLI のストリーミング {#cli-streaming}

```yaml
display:
  streaming: true         # Stream tokens to terminal in real-time
  show_reasoning: true    # Also stream reasoning/thinking tokens (optional)
```

有効にすると、返答はストリーミングの枠の中に 1 トークンずつ現れます。ツールの呼び出しは今までどおり静かに記録されます。プロバイダがストリーミングに対応していない場合は、自動で通常の表示に戻ります。

### gateway のストリーミング（Telegram、Discord、Slack） {#gateway-streaming-telegram-discord-slack}

```yaml
streaming:
  enabled: true           # Enable progressive message editing (default: false)
  transport: auto         # "auto" (default) | "edit" (progressive message editing) | "off"
  edit_interval: 0.8      # Seconds between message edits (default: 0.8)
  buffer_threshold: 24    # Characters before forcing an edit flush (default: 24)
  cursor: " ▉"            # Cursor shown during streaming
  fresh_final_after_seconds: 0    # Opt in to fresh final (Telegram) when preview is this old
```

有効にすると、ボットは最初のトークンでメッセージを送り、トークンが届くたびにそれを少しずつ編集します。メッセージの編集に対応していないプラットフォーム（Signal、メール、Home Assistant）は最初の試みで自動的に見分けられ、そのセッションではストリーミングが穏やかに無効になります。メッセージがあふれることはありません。

進行中のトークンの編集なしに、やり取りの途中の自然なアシスタントの更新だけがほしいときは、`display.interim_assistant_messages: true` にしてください。

**あふれたときの扱い:** 流している文章がプラットフォームのメッセージの長さの上限（およそ 4096 文字）を超えると、今のメッセージを確定し、新しいメッセージが自動で始まります。

**新しい最終メッセージ（Telegram）:** Telegram の `editMessageText` は元のメッセージの時刻を残すので、長く流した返答は完了後も最初のトークンの時刻のままになります。`fresh_final_after_seconds > 0` にすると、古くなった途中経過を新しい最終メッセージとして届け、途中経過はできる限り削除します。既定は `0` で、流した返答をその場で確定し、両方の操作が見えてしまうクライアントで一瞬メッセージが重なって消える動きを避けます。

:::note プラットフォームごとのストリーミングの既定
大元の `streaming.enabled` は既定で `false` です。これを入れるまで何も流れません。有効にしたあとは、ストリーミングは**プラットフォームごとに**決まります。Telegram は `display.platforms.telegram.streaming: true`（流す）、Discord は `display.platforms.discord.streaming: false`（流さない）で出荷されます。つまりストリーミングを有効にすると、Telegram はそのまま流れ、Discord はこの切り替えを変えるまでメッセージ全体での返答のままです。プラットフォームごとの切り替えは、ダッシュボードの **Channels** の切り替えからでも、`~/.hermes/config.yaml` から直接でも調整できます。
:::

## グループのチャットのセッションの隔離 {#group-chat-session-isolation}

CLI、TUI／ダッシュボード、メッセージングの gateway をまたいで、同時に開けるチャットの
セッションの数を制限します。

```yaml
max_concurrent_sessions: null  # null/0 = unlimited; positive integer = active session cap
```

枠が埋まるのは、チャットの窓を開いたときではなく、セッションが**最初のやり取り**を
走らせたときです。チャットを開く・再開する・つなぎ直すこと自体には何もかからないので、
メッセージを送るまでは、放置されたデスクトップのタブ（や、不安定な websocket が起こす
裏側の再開）が、この上限を共有するメッセージングの gateway を締め出すことはありません。

上限に達すると、Hermes はどの画面が枠を握っているかを示す、はっきりした制限の
メッセージを返します。すでに動いているセッションは、通常どおりのふるまいを続けます。
今の枠の使用状況と、握っているものすべては `hermes status` で確認できます。

正しいキーはトップレベルの `max_concurrent_sessions` です。Hermes は
`gateway.max_concurrent_sessions` も予備として受け付けますが、両方が設定されている
ときはトップレベルのほうが勝ちます。

この上限は、ローカルの実行時のリースのファイルで守られる最善努力のものです。管理簿を
読めなかったり施錠できなかったりしたときは、利用者が締め出されないよう Hermes は
安全側に開きます。1 台のホスト／プロファイルでの運用を想定しており、複数の端末から
`$HERMES_HOME` を共有してマウントする使い方は想定していません。

共有のチャットで、部屋ごとに 1 つの会話にするか、参加者ごとに 1 つの会話にするかを決めます。

```yaml
group_sessions_per_user: true  # true = per-user isolation in groups/channels, false = one shared session per chat
```

- `true` が既定で、推奨の設定です。Discord のチャンネル、Telegram のグループ、Slack のチャンネルなど共有の場では、プラットフォームが利用者 ID を提供する限り、送信者ごとに自分のセッションを持ちます。
- `false` は、以前の部屋を共有するふるまいに戻します。チャンネルを 1 つの共同作業の会話として扱わせたいときには役立ちますが、利用者どうしが文脈・トークンの費用・割り込みの状態を共有することにもなります。
- ダイレクトメッセージは影響を受けません。Hermes は今までどおりチャット／DM の ID で分けます。
- スレッドはどちらの設定でも親のチャンネルから分かれたままです。`true` のときは、スレッドの中でも参加者ごとに自分のセッションを持ちます。

ふるまいの詳細と例は [Sessions](/hermes/docs/user-guide/sessions/) と [Discord guide](/hermes/docs/user-guide/messaging/discord/) を参照してください。

## 許可していない相手からの DM の扱い {#unauthorized-dm-behavior}

知らない利用者からダイレクトメッセージが届いたときに Hermes がどうするかを決めます。

```yaml
unauthorized_dm_behavior: pair

whatsapp:
  unauthorized_dm_behavior: ignore
```

- `pair` は、チャット型の DM のプラットフォームでの既定です。Hermes はアクセスを断りつつ、DM で 1 回限りのペアリングのコードを返します。
- `ignore` は、許可していない DM を黙って捨てます。
- メールは、`platforms.email.unauthorized_dm_behavior: pair` を設定しない限り `ignore` が既定です。受信箱には無関係の未読が入りうるからです。
- プラットフォームの節は全体の既定を上書きするので、広くはペアリングを有効にしたまま、1 つのプラットフォームだけ静かにできます。

## クイックコマンド {#quick-commands}

LLM を呼ばずにシェルのコマンドを実行するか、あるスラッシュコマンドを別のものの別名にする、独自のコマンドを定義します。exec のクイックコマンドはトークンを使わないので、メッセージングのプラットフォーム（Telegram、Discord など）からサーバーをさっと確認したり、補助のスクリプトを走らせたりするのに便利です。

```yaml
quick_commands:
  status:
    type: exec
    command: systemctl status hermes-agent
  disk:
    type: exec
    command: df -h /
  update:
    type: exec
    command: cd ~/.hermes/hermes-agent && git pull && uv pip install -e .
  gpu:
    type: exec
    command: nvidia-smi --query-gpu=name,utilization.gpu,memory.used,memory.total --format=csv,noheader
  restart:
    type: alias
    target: /gateway restart
```

使い方: CLI やどのメッセージングのプラットフォームでも `/status`、`/disk`、`/update`、`/gpu`、`/restart` と打つだけです。`exec` のコマンドはホスト上でそのまま動き、出力を直接返します。LLM の呼び出しはなく、トークンも消費しません。`alias` のコマンドは、設定したスラッシュコマンドの宛先へ書き換えられます。

- **30 秒のタイムアウト** — 長く走るコマンドはエラーメッセージとともに打ち切られます
- **優先順位** — クイックコマンドはスキルのコマンドより先に照合されるので、スキルの名前を上書きできます
- **補完** — クイックコマンドは実行の時点で解決されるため、組み込みのスラッシュコマンドの補完の表には出ません
- **種類** — 対応する種類は `exec` と `alias` です。それ以外はエラーになります
- **どこでも使えます** — CLI、Telegram、Discord、Slack、WhatsApp、Signal、メール、Home Assistant

文字列だけのプロンプトの近道は、クイックコマンドとしては使えません。繰り返し使うプロンプトの流れには、スキルを作るか、既存のスラッシュコマンドの別名にしてください。

## 人らしい間 {#human-delay}

メッセージングのプラットフォームで、人らしい返答の間合いを再現します。

```yaml
human_delay:
  mode: "off"                  # off | natural | custom
  min_ms: 800                  # Minimum delay (custom mode)
  max_ms: 2500                 # Maximum delay (custom mode)
```

## コードの実行 {#code-execution}

`execute_code` のツールを設定します。

```yaml
code_execution:
  mode: project                # project (default) | strict
  timeout: 300                 # Max execution time in seconds
  max_tool_calls: 50           # Max tool calls within code execution
```

**`mode`** は、スクリプトの作業ディレクトリと Python のインタプリタを決めます。

- **`project`**（既定） — スクリプトは、そのセッションの作業ディレクトリで、今の virtualenv/conda 環境の python によって動きます。プロジェクトの依存関係（`pandas`、`torch`、プロジェクトのパッケージ）や相対パス（`.env`、`./data.csv`）が自然に解決され、`terminal()` から見えるものと一致します。
- **`strict`** — スクリプトは一時的な作業ディレクトリで、`sys.executable`（Hermes 自身の python）によって動きます。再現性は最大ですが、プロジェクトの依存関係と相対パスは解決されません。

環境の掃除（`*_API_KEY`、`*_TOKEN`、`*_SECRET`、`*_PASSWORD`、`*_CREDENTIAL`、`*_PASSWD`、`*_AUTH` を取り除きます）とツールの許可の一覧は、どちらのモードでも同じように働きます。モードを変えてもセキュリティの構えは変わりません。

## web 検索のバックエンド {#web-search-backends}

`web_search` と `web_extract` のツールは、5 つのバックエンドのプロバイダに対応します。バックエンドは `config.yaml` か `hermes tools` で設定します。

```yaml
web:
  backend: firecrawl    # firecrawl | searxng | parallel | keenable | exa

  # Or use per-capability keys to mix providers (e.g. free search + paid extract):
  search_backend: "searxng"
  extract_backend: "firecrawl"

  # Keyless free-tier fallback (default: true). With no backend configured
  # and no API keys present, web tools rotate across the Exa/Parallel/
  # Firecrawl/Keenable free tiers. Set false to disable.
  keyless_fallback: true

  # One-shot keyless rescue (default: true). When the chosen/keyed backend
  # fails a call, that single call retries on the keyless ring; the next
  # call attempts the chosen backend again (never sticky).
  keyless_rescue: true

  # Pin Exa/Parallel to a tier (set by the hermes tools Free/Paid rows).
  # free = always the anonymous endpoint; paid = always the keyed SDK path;
  # unset = auto (key present -> paid, otherwise free).
  provider_tier:
    parallel: free
    exa: paid
```

| バックエンド | 環境変数 | 検索 | 抽出 |
|---------|---------|--------|---------|
| **Firecrawl**（既定） | `FIRECRAWL_API_KEY` | ✔ | ✔ |
| **SearXNG** | `SEARXNG_URL` | ✔ | — |
| **Parallel** | `PARALLEL_API_KEY`（任意 — キーなしの無料枠あり） | ✔ | ✔ |
| **Exa** | `EXA_API_KEY`（任意 — キーなしの無料枠あり） | ✔ | ✔ |

**バックエンドの選び方:** 実行時には、保存された `web.backend` の選択が必ず使われます（`hermes tools` で設定します。`nous` は管理された Tool Gateway を経由します）。web のバックエンドを一度も選んでいないときにだけ、手元の API キーから自動で決まります。`SEARXNG_URL` だけがあれば SearXNG、`EXA_API_KEY` だけなら Exa、`PARALLEL_API_KEY` だけなら Parallel、`KEENABLE_API_KEY` だけなら Keenable です。**選択も認証情報もまったくない**場合、リクエストはキーなしの無料枠の輪（Exa / Parallel / Firecrawl / Keenable）を順に回り、回数制限に当たると自動で次へ移ります。詳しくは [Web Search guide](/hermes/docs/user-guide/features/web-search/) を参照してください。いったん選択があると、`.env` にキーを足しても経路は変わりません。`hermes tools` で Firecrawl か Keenable を選ぶ場合は、キーがなくても動きます。

**SearXNG** は、70 以上の検索エンジンに問い合わせる、無料で自前ホストできる、プライバシーを尊重するメタ検索エンジンです。API キーは要らず、`SEARXNG_URL` に自分のインスタンス（たとえば `http://localhost:8080`）を設定するだけです。SearXNG は検索専用なので、`web_extract` には別の抽出のプロバイダが要ります（`web.extract_backend` を設定してください）。Docker での準備の手順は [Web Search setup guide](/hermes/docs/user-guide/features/web-search/) を参照してください。

**自前ホストの Firecrawl:** `FIRECRAWL_API_URL` を自分のインスタンスに向けてください。独自の URL を設定すると API キーは任意になります（サーバー側で `USE_DB_AUTHENTICATION=*** にすると認証を切れます）。

**Parallel の検索のモード:** `PARALLEL_SEARCH_MODE` で検索のふるまいを決めます — `fast`、`one-shot`、`agentic`（既定: `agentic`）。

**Exa:** `~/.hermes/.env` に `EXA_API_KEY` を設定します。`category` での絞り込み（`company`、`research paper`、`news`、`people`、`personal site`、`pdf`）と、ドメイン・日付の絞り込みに対応します。

## ブラウザ {#browser}

ブラウザの自動操作のふるまいを設定します。

```yaml
browser:
  inactivity_timeout: 120        # Seconds before auto-closing idle sessions
  command_timeout: 30             # Timeout in seconds for browser commands (screenshot, navigate, etc.)
  record_sessions: false         # Auto-record browser sessions as WebM videos to ~/.hermes/browser_recordings/
  # Optional CDP override — when set, Hermes attaches directly to your own
  # Chromium-family browser (via /browser connect) rather than starting a headless browser.
  cdp_url: ""
  # Dialog supervisor — controls how native JS dialogs (alert / confirm / prompt)
  # are handled when a CDP backend is attached (Browserbase, local Chromium-family
  # browser via /browser connect). Ignored on Camofox and default local agent-browser mode.
  dialog_policy: must_respond    # must_respond | auto_dismiss | auto_accept
  dialog_timeout_s: 300          # Safety auto-dismiss under must_respond (seconds)
  camofox:
    managed_persistence: false   # When true, Camofox sessions persist cookies/logins across restarts
    user_id: ""                  # Optional externally managed Camofox userId
    session_key: ""              # Optional session key sent when Hermes creates a tab
    adopt_existing_tab: false    # Reuse an existing tab for this identity before creating one
```

**ダイアログの方針:**

- `must_respond`（既定） — ダイアログを捉えて `browser_snapshot.pending_dialogs` に出し、エージェントが `browser_dialog(action=...)` を呼ぶのを待ちます。`dialog_timeout_s` 秒たっても応答がなければ、ページの JS が永遠に止まらないよう自動で閉じます。
- `auto_dismiss` — 捉えてすぐ閉じます。エージェントはあとから `browser_snapshot.recent_dialogs` に `closed_by="auto_policy"` として記録を見られます。
- `auto_accept` — 捉えてすぐ受け入れます。しつこい `beforeunload` の確認があるページに便利です。

ダイアログの扱いの全体は [browser feature page](/hermes/docs/user-guide/features/browser/#browser_dialog) を参照してください。

ブラウザのツールセットは複数のプロバイダに対応します。Browserbase、Browser Use、ローカルの Chromium 系の CDP の準備については [Browser feature page](/hermes/docs/user-guide/features/browser/) を参照してください。

## タイムゾーン {#timezone}

サーバーのローカルのタイムゾーンを、IANA のタイムゾーン文字列で上書きします。ログの時刻、cron の予定、システムプロンプトへの時刻の差し込みに効きます。

```yaml
timezone: "America/New_York"   # IANA timezone (default: "" = server-local time)
```

使える値: IANA のタイムゾーン識別子なら何でも（`America/New_York`、`Europe/London`、`Asia/Kolkata`、`UTC` など）。サーバーのローカルの時刻にしたいときは、空にするか書かないでください。

## Discord {#discord}

メッセージングの gateway での、Discord 固有のふるまいを設定します。

```yaml
discord:
  require_mention: true          # Require @mention to respond in server channels
  free_response_channels: ""     # Comma-separated channel IDs where bot responds without @mention
  auto_thread: true              # Auto-create threads on @mention in channels
```

- `require_mention` — `true`（既定）のとき、ボットはサーバーのチャンネルでは `@BotName` とメンションされたときだけ応答します。DM はメンションなしでも常に動きます。
- `free_response_channels` — メンションなしでもすべてのメッセージに応答するチャンネル ID を、カンマ区切りで並べます。
- `auto_thread` — `true`（既定）のとき、チャンネルでのメンションは会話用のスレッドを自動で作り、チャンネルをきれいに保ちます（Slack のスレッドに似た動きです）。

## セキュリティ {#security}

実行前のセキュリティの検査と、秘密情報の伏せ字です。

```yaml
security:
  redact_secrets: true           # Redact API key patterns in tool output and logs (on by default)
  tirith_enabled: true           # Enable Tirith security scanning for terminal commands
  tirith_path: "tirith"          # Path to tirith binary (default: "tirith" in $PATH)
  tirith_timeout: 5              # Seconds to wait for tirith scan before timing out
  tirith_fail_open: true         # Allow command execution if tirith is unavailable
  website_blocklist:             # See Website Blocklist section below
    enabled: false
    domains: []
    shared_files: []
```

- `redact_secrets` — `true` のとき、ツールの出力が会話の文脈とログに入る前に、API キー・トークン・パスワードらしいパターンを自動で見つけて伏せます。**既定で有効**です。認証情報のような生の文字列がデバッグや伏せ字処理の開発に必要なときだけ、明示的に `false` にしてください。
- `tirith_enabled` — `true` のとき、ターミナルのコマンドは実行前に [Tirith](https://github.com/sheeki03/tirith) で検査され、危険かもしれない操作が見つけられます。
- `tirith_path` — tirith のバイナリのパスです。標準的でない場所に入れている場合に設定してください。
- `tirith_timeout` — tirith の検査を待つ最大の秒数です。検査がタイムアウトした場合、コマンドはそのまま進みます。
- `tirith_fail_open` — `true`（既定）のとき、tirith が使えなかったり失敗したりしてもコマンドの実行を許します。tirith が確かめられないコマンドを止めたいときは `false` にしてください。

## サイトの遮断の一覧 {#website-blocklist}

エージェントの web とブラウザのツールから、特定のドメインへのアクセスを止めます。

```yaml
security:
  website_blocklist:
    enabled: false               # Enable URL blocking (default: false)
    domains:                     # List of blocked domain patterns
      - "*.internal.company.com"
      - "admin.example.com"
      - "*.local"
    shared_files:                # Load additional rules from external files
      - "/etc/hermes/blocked-sites.txt"
```

有効にすると、遮断のパターンに当てはまる URL は、web やブラウザのツールが動く前に拒否されます。これは `web_search`、`web_extract`、`browser_navigate`、そして URL にアクセスするすべてのツールに効きます。

ドメインの書き方は次に対応します。
- 厳密なドメイン: `admin.example.com`
- ワイルドカードのサブドメイン: `*.internal.company.com`（すべてのサブドメインを遮断）
- TLD のワイルドカード: `*.local`

共有のファイルには、1 行に 1 つずつドメインの規則を書きます（空行と `#` のコメントは無視されます）。ファイルが見つからない、読めない場合は警告が出ますが、ほかの web のツールが止まることはありません。

この方針は 30 秒間キャッシュされるので、設定の変更は再起動なしですぐ効きます。

## 賢い承認 {#smart-approvals}

危険かもしれないコマンドの扱い方を決めます。

```yaml
approvals:
  mode: smart   # smart | manual | off
```

| モード | ふるまい |
|------|----------|
| `smart`（既定） | 印の付いたコマンドが本当に危険かどうかを、補助の LLM に判断させます。危険の少ないコマンドは、そのコマンドに限って自動で承認されます。本当に危ないものは拒否され、判断のつかないものは利用者に回されます。 |
| `manual` | 印の付いたコマンドを実行する前に、必ず利用者に確認します。CLI では対話的な承認の画面が出ます。メッセージングでは、承認の要求が待ち行列に入ります。 |
| `off` | 承認の確認をすべて飛ばします。`HERMES_YOLO_MODE=true` と同じです。**慎重に使ってください。** |

smart のモードは、承認疲れを減らすのにとくに役立ちます。安全な操作ではエージェントがより自律的に動けるようにしつつ、本当に破壊的なコマンドは捕まえます。

:::warning
`approvals.mode: off` にすると、ターミナルのコマンドに対する安全の確認がすべて無効になります。信頼できる、隔離された環境でだけ使ってください。
:::
### 拒否の遮断器 {#denial-circuit-breaker}

`approvals.denial_breaker_threshold`（既定 `3`）は、賢い承認の判定者が拒否し続けているコマンドの変種を、エージェントが試し続けるのを防ぎます。再試行のたびに見張り役の LLM の呼び出しが 1 回増えるからです。1 つのセッションでこの回数だけ続けて拒否されると、拒否のメッセージは強い停止の指示に変わり、作業をやめ、遮断された操作を報告し、あなたに手で実行するか `/approve` するよう頼むことになります。承認が 1 度でもあれば回数はリセットされます。`0` で無効にできます。

```yaml
approvals:
  denial_breaker_threshold: 3   # 0 disables the breaker
```

### 拒否の規則 {#deny-rules}

`approvals.deny` は、当てはまるターミナルのコマンドを無条件に遮断する、glob のパターンの一覧です。`--yolo`、`/yolo`、`mode: off` の下でも遮断します。組み込みの強い遮断の一覧に対する、利用者が編集できる側です。

```yaml
approvals:
  deny:
    - "git push --force*"
    - "*curl*|*sh*"
```

パターンは大文字小文字を区別しない fnmatch の glob で、YAML では引用符で囲む必要があります（先頭の `*` を裸で書くと解析のエラーになります）。詳しくは [Security — User-Defined Deny Rules](/hermes/docs/user-guide/security/#user-defined-deny-rules-approvalsdeny) を参照してください。

### 賢い承認の独自の方針 {#custom-smart-approval-policy}

`approvals.smart_policy` を使うと、賢い承認の判定者への指示に自分の規則を足せます。設定すると、その文章は見張り役の LLM のシステムプロンプト（信頼できる経路で、信頼できないコマンドの文字列とは決して並べません）に加わるので、コードを触らずに自分の環境に合わせて判断を厳しくも緩くもできます。

```yaml
approvals:
  smart_policy: |
    Always ESCALATE commands that modify anything under /etc.
    APPROVE docker compose restarts in ~/deploys — they are routine here.
```

## チェックポイント {#checkpoints}

ファイルを壊しうる操作の前に、ファイルシステムのスナップショットを自動で取ります。詳しくは [Checkpoints & Rollback](/hermes/docs/user-guide/checkpoints-and-rollback/) を参照してください。

```yaml
checkpoints:
  enabled: false                 # Enable automatic checkpoints (also: hermes chat --checkpoints). Default: false (opt-in).
  max_snapshots: 20              # Max checkpoints to keep per directory (default: 20)
```

## 委任 {#delegation}

委任のツールが使うサブエージェントのふるまいを設定します。

```yaml
delegation:
  # model: "google/gemini-3-flash-preview"  # Override model (empty = inherit parent)
  # provider: "openrouter"                  # Override provider (empty = inherit parent)
  # base_url: "http://localhost:1234/v1"    # Direct OpenAI-compatible endpoint (takes precedence over provider)
  # api_key: "local-key"                    # API key for base_url (falls back to OPENAI_API_KEY)
  # api_mode: ""                            # Wire protocol for base_url: "chat_completions", "codex_responses", or "anthropic_messages". Empty = auto-detect from URL (e.g. /anthropic suffix → anthropic_messages). Set explicitly for non-standard endpoints the heuristic can't detect.
  # request_overrides:                      # Per-child request settings sent on every subagent API call (all resolution branches).
  #   extra_body:                           # Merged into the request's extra_body — e.g. OpenRouter routing hints:
  #     provider:
  #       sort: throughput
  max_concurrent_children: 3                # Parallel children per batch (floor 1, no ceiling). Also via DELEGATION_MAX_CONCURRENT_CHILDREN env var.
  worktree_isolation: false                 # Give each child its own git worktree branched from HEAD (local backend + git repos only; inspired by Muse Code). See Subagent Delegation → Worktree Isolation.
  max_spawn_depth: 1                        # Delegation tree depth cap (1-3, clamped). 1 = flat (default): parent spawns leaves that cannot delegate. 2 = orchestrator children can spawn leaf grandchildren. 3 = three levels.
  orchestrator_enabled: true                # Global kill switch. When false, role="orchestrator" is ignored and every child is forced to leaf regardless of max_spawn_depth.
```

**サブエージェントの provider:model の上書き:** 既定では、サブエージェントは親のエージェントのプロバイダとモデルを引き継ぎます。`delegation.provider` と `delegation.model` を設定すると、サブエージェントを別のプロバイダ:モデルの組に回せます。たとえば、主要なエージェントは高価な推論モデルで動かしつつ、範囲の狭い下請けの仕事には安くて速いモデルを使う、といった具合です。

**エンドポイントの直接の上書き:** 独自のエンドポイントへ分かりやすく向けたいときは、`delegation.base_url`、`delegation.api_key`、`delegation.model` を設定してください。サブエージェントはその OpenAI 互換のエンドポイントへ直接向かい、これは `delegation.provider` より優先されます。`delegation.api_key` を省いた場合、Hermes は `OPENAI_API_KEY` にだけさかのぼります。`delegation.base_url` と一緒に `delegation.provider` を設定した場合も、明示したエンドポイントとキーが勝ちますが、そのプロバイダのリクエストの設定（`custom_providers` の項目にある `extra_body` の上書きと最大の出力トークン数）はサブエージェントへ持ち込まれます。

**子ごとのリクエストの設定（`request_overrides`）:** `delegation.request_overrides` は、サブエージェントのすべての API 呼び出しに付くリクエストの設定の辞書です。トップレベルのキーは API の引数（たとえば `service_tier`）で、`extra_body` の子の辞書はリクエストの `extra_body` に統合されます。これは**3 つすべて**の解決の枝（`base_url` を直接指定、名前付きの `provider`、そのまま引き継ぎ）で尊重されるので、このキーは必ず効きます。優先順位は次のとおりです。明示した `request_overrides` の値は、実行時や親から来た上書きの**上に**統合されます。トップレベルの明示したキーが勝ち、`extra_body` は 1 段だけ深く統合されるので、実行時の `extra_body` のキー（たとえばプロバイダの `thinking: {type: disabled}` という性格付け）は、あなたのキーが同じものを上書きしない限り残ります。典型的な使いどころは、委任の子に対する OpenRouter のルーティングの指定です。

```yaml
delegation:
  model: "deepseek/deepseek-v4-flash-0731"
  base_url: "https://openrouter.ai/api/v1"
  api_key: "sk-or-..."
  request_overrides:
    extra_body:
      provider:
        sort: throughput   # route children to the fastest OpenRouter provider
```

**通信の方式（`api_mode`）:** Hermes は `delegation.base_url` から通信の方式を自動で判定します（たとえば `/anthropic` で終わるパスは `anthropic_messages`。Codex／ネイティブ Anthropic／Kimi-coding のホスト名は、これまでどおりの判定です）。この経験則で分類できないエンドポイント — たとえば Azure AI Foundry、MiniMax、Zhipu GLM、Anthropic 形式のバックエンドを前に置く LiteLLM のプロキシ — では、`delegation.api_mode` に `chat_completions`、`codex_responses`、`anthropic_messages` のいずれかを明示してください。空のまま（既定）にすると、自動の判定が続きます。

委任のプロバイダは、CLI や gateway の起動時と同じ認証情報の解決を使います。設定済みのプロバイダはすべて使えます: `openrouter`、`nous`、`copilot`、`zai`、`kimi-coding`、`minimax`、`minimax-cn`。プロバイダを設定すると、正しい base URL、API キー、API の方式が自動で解決されるので、認証情報を手で結び付ける必要はありません。

**優先順位:** 設定の `delegation.base_url` → 設定の `delegation.provider` → 親のプロバイダ（引き継ぎ）。設定の `delegation.model` → 親のモデル（引き継ぎ）。`provider` を設定せず `model` だけを設定すると、親の認証情報のままモデル名だけが変わります（OpenRouter のように、同じプロバイダの中でモデルを変えたいときに便利です）。

**幅と深さ:** `max_concurrent_children` は、1 回のまとまりで並列に動くサブエージェントの数を制限します（既定 `3`、下限 1、上限なし）。`DELEGATION_MAX_CONCURRENT_CHILDREN` の環境変数でも設定できます。モデルが上限より長い `tasks` の配列を出したときは、`delegate_task` は黙って切り詰めるのではなく、上限を説明するツールのエラーを返します。`max_spawn_depth` は委任の木の深さを決めます（1〜3 に丸められます）。既定の `1` では委任は平らです。子は孫を起こせず、`role="orchestrator"` を渡しても黙って `leaf` に落ちます。`2` に上げると、まとめ役の子が葉の孫を起こせます。`3` なら 3 段の木になります。エージェントは呼び出しごとに `role="orchestrator"` でまとめ役を選びます。`orchestrator_enabled: false` にすると、どの子も強制的に葉に戻ります。費用は掛け算で増えます。`max_spawn_depth: 3` と `max_concurrent_children: 3` では、木は 3×3×3 = 27 個の葉のエージェントが同時に動くところまで届きます。使い方の型は [Subagent Delegation → Depth Limit and Nested Orchestration](/hermes/docs/user-guide/features/delegation/#depth-limit-and-nested-orchestration) を参照してください。

**子のプロセスの知らせ:** サブエージェントが起こしたバックグラウンドのプロセスは、完了や監視の知らせを親の会話へ回しますが、既定ではそこで**抑えられます**。子のまとまった結果こそが成果物だからです。届けたいときは `delegation.surface_child_process_notifications: true` にしてください（サブエージェントの名前が付きます）。委任の結果そのものが抑えられることはありません。[Subagent Delegation → Child background-process notifications](/hermes/docs/user-guide/features/delegation/#child-background-process-notifications) を参照してください。

## 確認の問いかけ {#clarify}

確認の問いかけへの返事を gateway がどれだけ待つかを設定します。正しいキーは `agent.clarify_timeout`（既定 `3600` 秒）です。以前のトップレベルの `clarify.timeout` も、明示されていれば今も尊重されます。

```yaml
agent:
  clarify_timeout: 3600        # Seconds to wait for user clarification response (0 or less = unlimited)
```

## 文脈ファイル（SOUL.md、AGENTS.md） {#context-files-soulmd-agentsmd}

Hermes は 2 つの異なる文脈の範囲を使います。

| ファイル | 目的 | 範囲 |
|------|---------|-------|
| `SOUL.md` | **エージェントの中心となる人格** — エージェントが何者かを決めます（システムプロンプトの 1 番目の枠） | `~/.hermes/SOUL.md` または `$HERMES_HOME/SOUL.md` |
| `.hermes.md` / `HERMES.md` | プロジェクト固有の指示（最優先） | git のルートまでさかのぼります |
| `AGENTS.md` | プロジェクト固有の指示、コーディングの決まり | ディレクトリを再帰的にたどります |
| `CLAUDE.md` | Claude Code の文脈ファイル（これも検出します） | 作業ディレクトリのみ |
| `.cursorrules` | Cursor IDE の規則（これも検出します） | 作業ディレクトリのみ |
| `.cursor/rules/*.mdc` | Cursor の規則ファイル（これも検出します） | 作業ディレクトリのみ |

- **SOUL.md** はエージェントの中心となる人格です。システムプロンプトの 1 番目の枠を占め、組み込みの既定の人格を完全に置き換えます。編集すれば、エージェントが何者かを丸ごと作り込めます。
- SOUL.md がない、空、読み込めない場合、Hermes は組み込みの既定の人格に戻ります。
- **プロジェクトの文脈ファイルには優先順位があります** — 読み込まれるのは 1 種類だけで、最初に見つかったものが使われます: `.hermes.md` → `AGENTS.md` → `CLAUDE.md` → `.cursorrules`。SOUL.md は常に独立して読み込まれます。
- **AGENTS.md** は階層的です。下のディレクトリにも AGENTS.md があれば、すべてまとめられます。
- Hermes は、`SOUL.md` がまだなければ既定のものを自動で置きます。
- 読み込まれた文脈ファイルは、いずれも `context_file_max_chars` 文字（既定 20,000）で、賢く切り詰められます。

あわせて参照:
- [Personality & SOUL.md](/hermes/docs/user-guide/features/personality/)
- [Context Files](/hermes/docs/user-guide/features/context-files/)

## 作業ディレクトリ {#working-directory}

| 場面 | 既定 |
|---------|---------|
| **CLI（`hermes`）** | コマンドを実行した今のディレクトリ |
| **メッセージングの gateway** | `~/.hermes/config.yaml` の `terminal.cwd`。未設定ならホームディレクトリ `~` |
| **Docker / Singularity / Modal / SSH** | コンテナやリモートの端末の中の、利用者のホームディレクトリ |

作業ディレクトリを上書きするには:
```yaml
# In ~/.hermes/config.yaml:
terminal:
  cwd: /home/myuser/projects
```

`~/.hermes/.env` の `MESSAGING_CWD` と、直接書いた `TERMINAL_CWD` は、以前との互換のための予備です。新しい設定では `terminal.cwd` を使ってください。

## ネットワーク {#network}

外向きの HTTP に対する、接続の回避策です。

```yaml
network:
  force_ipv4: false   # Force IPv4 for outbound connections (default: false)
```

`force_ipv4` — IPv6 が壊れている、あるいは届かないサーバーでは、Python は AAAA レコードを先に解決するため、IPv4 に落ちるまで TCP のタイムアウトいっぱい固まることがあります。`true` にすると IPv6 を丸ごと飛ばし、IPv4 で直接つなぎます。

## 導入の案内 {#onboarding}

最初に触れたときの案内と、組み立て型のプロフィール作成の申し出です。

```yaml
onboarding:
  profile_build: "ask"   # "ask" (default) | "off"
  seen: {}               # internal latch — leave empty
```

- `profile_build` — 生涯で最初の gateway のメッセージで示される、プロフィール作成の道筋を決めます。`"ask"`（既定）は利用者のプロフィールを作りましょうかと申し出ます。この申し出は**同意を前提とした、任意のもの**で、エージェントは何かを調べる前に必ず尋ね、つながっているアカウントを黙って読むことはありません。`"off"` は簡単な案内だけを出します。申し出は多くても 1 回きりです。
- `seen` — 内部の状態です。Hermes は表示した案内をここに掛け金として記録し、二度と出さないようにします。プロフィール作成の申し出も、一度出したらここに記録されます。手で編集しないでください。すべての案内をもう一度見たいときは、`onboarding` の節ごと消してください。

## ダッシュボード {#dashboard}

[web ダッシュボード](/hermes/docs/user-guide/features/web-dashboard/) の設定です — 見た目のテーマ、公開の URL、認証のプロバイダ。認証のプロバイダ（OAuth、基本のパスワード、切り離し）の詳しい説明は web ダッシュボードのページにあります。ここに書くのは `config.yaml` での形です。

```yaml
dashboard:
  theme: "default"            # "default" | "midnight" | "ember" | "mono" | "cyberpunk" | "rose"
  show_token_analytics: false # Re-enable the (local-estimate-only) token/cost analytics surfaces
  public_url: ""              # Full public authority for OAuth redirect_uri (env: HERMES_DASHBOARD_PUBLIC_URL)
  trusted_proxies: []         # Proxy IPs/CIDRs allowed to supply X-Forwarded-* headers
  oauth:                      # Portal OAuth gate (engaged with --host and not --insecure)
    client_id: ""             # agent:{instance_id} — Portal provisions this
    portal_url: ""            # blank → plugin default (production Portal)
  basic_auth:                 # Self-hosted username/password gate (dashboard_auth/basic plugin)
    username: ""              # blank → plugin no-op
    password_hash: ""         # scrypt$... (preferred — no plaintext at rest)
    password: ""              # plaintext fallback (hashed in-memory at load)
    secret: ""                # token-signing key; blank → random per-process
    session_ttl_seconds: 0    # 0 → plugin default (12h)
  drain_auth:                 # Drain-control service-credential gate (dashboard_auth/drain plugin)
    scope: "drain"            # capability label on the verified principal
    min_secret_chars: 43      # entropy bar (url-safe-b64 chars; 43 ≈ 256 bits)
  ws_ping_interval: 20.0      # Non-loopback WebSocket keepalive ping interval (seconds)
  ws_ping_timeout: 20.0       # Non-loopback WebSocket keepalive pong timeout (seconds)
  ws_orphan_reap_grace_s: 20.0 # Grace before a WS-detached session is reaped (seconds)
  startup_orphan_sweep: true  # Close session rows orphaned by a dead gateway process at boot
```

- `theme` — ダッシュボードの見た目のテーマです。
- `show_token_analytics` — 既定では無効です。分析のページとトークン／費用の数字は**手元での控えめな見積もり**で（補助の呼び出し、再試行、フォールバック、キャッシュへの書き込みを含みません）、プロバイダの請求よりかなり低く出ることがあります。請求ではないと理解したうえでだけ `true` にしてください。
- `public_url` — 設定すると、これが OAuth の `redirect_uri` を組み立てる完全な権威（スキーム＋ホスト＋任意のパスの接頭辞）になります。`X-Forwarded-*` ヘッダーを確実に転送しないリバースプロキシの後ろに置く場合に設定してください。空にすると、プロキシのヘッダーからの復元が使われます。
- `trusted_proxies` — `X-Forwarded-Proto` と `X-Forwarded-For` を渡してよい IP アドレス、または範囲の限られた CIDR のネットワークです。ループバックは自動で信頼されたままです。TLS のリバースプロキシが別のコンテナやホストから接続する場合に設定してください。できればプロキシの厳密な IP を使い、アドレスが変わる場合にだけ小さな専用のネットワークを使ってください。ワイルドカードと `/0` のネットワークは拒否されます。
- `oauth` / `basic_auth` / `drain_auth` — 同梱のダッシュボードの認証のプラグインが読む、認証のプロバイダの設定です。切り離しのシークレットそのものはここには設定**しません**。`HERMES_DASHBOARD_DRAIN_SECRET` の環境変数で渡します。認証の準備の全体は [Web Dashboard](/hermes/docs/user-guide/features/web-dashboard/) を参照してください。
- `ws_ping_interval` / `ws_ping_timeout` — ループバック以外での待ち受けに対する、WebSocket の生存確認の調整です（ループバックの接続では確認を送りません）。20 秒の既定が誤った 1006 の切断を生んでしまう、遅延の大きい経路（Tailscale、遠くの SSH のトンネル）では上げてください。
- `ws_orphan_reap_grace_s` — WebSocket が外れたセッションを、孤児の回収が引き取るまでの待ち時間です。クライアントのつなぎ直しが遅い場合は、生存確認の値と一緒に上げてください。（`HERMES_TUI_WS_ORPHAN_REAP_GRACE_S` は内部の上書きとして残っています。）
- `startup_orphan_sweep`（既定 `true`） — 上の WebSocket の孤児の回収のタイマーはプロセスの中にあるので、発動する前に gateway が再起動すると（更新、異常終了、systemd）、セッションの行が永遠に開いたまま残ります。`/resume` やダッシュボードに、まぼろしの「作業中」が現れます。gateway が起動するたびに — 標準入出力の TUI（`entry.main`）でも、デスクトップ／ダッシュボードの WebSocket のサイドカー（`handle_ws`）でも — 出所が `tui` / `desktop` / `subagent` で、開始時刻**と**最新のメッセージのどちらもセッションの有効期限（`HERMES_TUI_SESSION_TTL_S`、既定 6 時間）より古い行は、`end_reason: startup_orphan_reap` を付けて閉じられます。メッセージングのプラットフォームのセッション（Telegram、Discord、…）には決して触れません。メモリ上で生きているセッション（すでに再開したクライアント）は対象外で、一掃されたセッションもあとから再開できます。
