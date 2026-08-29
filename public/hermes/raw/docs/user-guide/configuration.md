---
title: "Hermes Agent の設定"
description: "Hermes Agent を設定する — config.yaml、プロバイダー、モデル、API キーなど"
upstream_path: user-guide/configuration.md
upstream_blob: d5226ce2d6592524db9b3ac2e32f3a46f54d233b
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/configuration
---

# Hermes Agent の設定 {#hermes-agent-configuration}

設定はすべて `~/.hermes/` ディレクトリに置かれ、すぐに開けるようになっています。

:::tip 動く `config.yaml` にいちばん早く着く道
`hermes setup --portal` を実行してください。OAuth を 1 回済ませるだけで、モデルのプロバイダーと Tool Gateway の 4 つのツールが、YAML を手で書かずに揃います。Portal の契約者は、トークン課金のプロバイダーが 10% 引きにもなります。[Nous Portal](/hermes/docs/integrations/nous-portal/)を参照してください。
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

## 設定の管理 {#managing-configuration}

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
`hermes config set` は値を適切なファイルへ自動的に振り分けます。API キーは `.env` へ、それ以外は `config.yaml` へ保存されます。
:::

## 設定の優先順位 {#configuration-precedence}

設定は次の順に解決されます（優先度の高いものから）。

1. **CLI の引数** — たとえば `hermes chat --model anthropic/claude-sonnet-4`（その 1 回だけの上書き）
2. **`~/.hermes/config.yaml`** — 秘密でない設定すべての主たる設定ファイル
3. **`~/.hermes/.env`** — 環境変数の受け皿。秘密（API キー、トークン、パスワード）には**こちらが必須**です
4. **組み込みの既定値** — ほかに何も設定されていないときに使われる、ハードコードされた安全な値

:::info 目安
秘密（API キー、ボットのトークン、パスワード）は `.env` に置きます。それ以外（モデル、端末のバックエンド、圧縮の設定、メモリの上限、ツール群）は `config.yaml` に置きます。両方に書かれている場合、秘密でない設定は `config.yaml` が優先されます。
:::

:::tip 組織での配備
管理者は、システム全体の管理用ディレクトリを使って、一般の利用者が上書きできない設定値や秘密の値を固定できます。
[管理下のスコープ](/hermes/docs/user-guide/managed-scope/)を参照してください。
:::

## 実行時の上限 {#runtime-limits}

長時間動く Hermes のサーバー側の入口（ゲートウェイや
`hermes serve --isolated` を含みます）は、OS が対応していれば、起動時に設定された
`RLIMIT_NOFILE` のソフト上限を適用します。

```yaml
runtime:
  nofile_soft_limit: 4096
```

既定値は `4096` です。Hermes は目標値を OS のハード上限に丸め、すでにより高いソフト上限を持つプロセスを下げることはありません。この調整をやめたいときは、値を
`0`、`false`、`null` のいずれかにしてください。Windows や、上限を変更できないサンドボックスでは、上限を変えずに起動を続けます。

## データベースの設定 {#database-settings}

`database:` のセクションは、Hermes が自分の SQLite の状態データベース
（`state.db`。セッション、メッセージ、ゲートウェイの振り分けを保持します）をどう開くかを制御します。

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

既存のデータベースのディスク上のジャーナルモードが、開くときに黙って WAL へ切り替わったとき（たとえば運用担当者が手で `delete` へ変換していたデータベースなど）にも、Hermes は警告します（プロセスごと・データベースごとに 1 回）。そのとき、選択を固定する設定として
`database.journal_mode` の名前も示します。

## 環境変数の展開 {#environment-variable-substitution}

`config.yaml` の中では、`${VAR_NAME}` の書き方で環境変数を参照できます。

```yaml
auxiliary:
  vision:
    api_key: ${GOOGLE_API_KEY}
    base_url: ${CUSTOM_VISION_URL}

delegation:
  api_key: ${DELEGATION_KEY}
```

1 つの値の中で複数を参照することもできます: `url: "${HOST}:${PORT}"`。参照した変数が設定されていない場合、その記述はそのまま残り（`${UNDEFINED_VAR}` は文字どおり残ります）、警告が記録されます。`$VAR` のような素の書き方は展開されません。

Cursor 方式の SecretRef の書き方も受け付けます。`${env:VAR_NAME}` は `${VAR_NAME}` とまったく同じように解決されるので（`env:` の接頭辞は取り除かれます）、Cursor や Claude の設定から写した MCP やプロバイダーの断片が、`config.yaml` でも `mcp_servers` のブロックでもそのまま動きます。それ以外の SecretRef の情報源（`${file:...}`、`${vault:...}`、`${bitwarden:...}`）はその場では解決され**ません**。外部の秘密管理は起動時に `secrets:` のブロックを通じて値を環境変数へ注入するので、`${env:NAME}` として参照してください。知らない接頭辞は一度だけ警告を出し、文字どおり残ります。

AI プロバイダーの設定（OpenRouter、Anthropic、Copilot、独自エンドポイント、自前で立てた LLM、フォールバックのモデルなど）については、[AI プロバイダー](/hermes/docs/integrations/providers/)を参照してください。

### プロバイダーのタイムアウト {#provider-timeouts}

プロバイダー全体のリクエストのタイムアウトは `providers.<id>.request_timeout_seconds` で、モデルごとの上書きは `providers.<id>.models.<model>.timeout_seconds` で設定できます。これはすべてのトランスポート（OpenAI 方式、Anthropic ネイティブ、Anthropic 互換）のメインのターンのクライアント、フォールバックの連鎖、認証情報の入れ替え後の作り直し、そして（OpenAI 方式では）リクエストごとのタイムアウト引数に適用されます。つまり、設定した値が古い `HERMES_API_TIMEOUT` の環境変数より優先されます。

ストリーミングを使わない呼び出しの停滞検出には `providers.<id>.stale_timeout_seconds` を、モデルごとの上書きには `providers.<id>.models.<model>.stale_timeout_seconds` を設定できます。こちらは古い `HERMES_API_CALL_STALE_TIMEOUT` の環境変数より優先されます。

これらを設定しないままにすると、従来の既定値が使われます（`HERMES_API_TIMEOUT=1800` 秒、`HERMES_API_CALL_STALE_TIMEOUT=90` 秒、Anthropic ネイティブは 900 秒）。ストリーミングなしの停滞検出は、明示していなければローカルのエンドポイントでは自動的に無効になり、とても大きなコンテキストでは上向きに伸びることもあります。AWS Bedrock にはまだつながっていません（`bedrock_converse` と AnthropicBedrock SDK のどちらの経路も boto3 を使い、独自のタイムアウト設定を持つためです）。[`cli-config.yaml.example`](https://github.com/NousResearch/hermes-agent/blob/main/cli-config.yaml.example) のコメント付きの例も参照してください。

## 更新の挙動 {#update-behavior}

`hermes update` の設定は、`config.yaml` の `updates` の下にあります。

```yaml
updates:
  pre_update_backup: quick       # quick (state snapshot, default) | full (snapshot + HERMES_HOME zip) | off
  backup_keep: 5                 # Keep this many full pre-update backup zips
  non_interactive_local_changes: stash  # stash | discard
  auto_switch_parked_branch: true       # auto-switch a clean, fully merged parked branch back to main
```

`pre_update_backup` は、更新前の安全策をまとめた 1 つのつまみです。`quick`（既定）は重要な状態ファイル（ペアリングのデータ、cron のジョブ、設定、認証情報。1 GiB を超えるファイルは飛ばされます）を `state-snapshots/` へ書き出します。`full` はさらに `HERMES_HOME` 全体を `backups/` へ zip でまとめますが、ホームが大きいと数分かかることがあります。`off` は両方を無効にします。従来の真偽値も尊重されます（`true` → `full`、`false` → `off`）。

git でインストールしている場合、Hermes は更新用のブランチをチェックアウトしたり pull したりする前に、変更済みの追跡ファイルと未追跡のファイルを自動で stash します。端末での対話的な更新では、その stash を戻す前に確認を求めます。対話によらない更新（デスクトップ / チャットアプリ、ゲートウェイ、`--yes`）では `updates.non_interactive_local_changes` に従います。`stash` は pull の成功後にローカルのソース編集を戻し、`discard` は pull の成功後に更新が作った stash を捨てます。`discard` は、ローカルのソース編集を残す必要がまったくない管理下のインストールでだけ使ってください。

その stash の手前で、Hermes は npm のインストールやビルドで生じた追跡済みの `package-lock.json` の差分も元に戻します。ロックファイルを意図して編集した場合は、更新の前にコミットするか手動で stash してください。

## 端末バックエンドの設定 {#terminal-backend-configuration}

Hermes は 7 つの端末バックエンドに対応します。どれを選ぶかで、エージェントのシェルコマンドが実際にどこで動くかが決まります。手元の機材、Docker のコンテナ、SSH 越しのリモートサーバー、Modal のクラウドサンドボックス（直接、または Nous が運用するゲートウェイ経由）、Daytona のワークスペース、Vercel Sandbox、Singularity/Apptainer のコンテナのいずれかです。

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

`terminal.temp_dir` は、ローカルのバックエンドで Hermes がセッションの一時的な生成物をどこに置くかを決めます。
背景プロセスのログ・pid・終了状態のファイル、コードを動かすサンドボックス、あふれたツールの結果などです。空のとき（既定）、Hermes は環境に明示された
`TMPDIR`/`TMP`/`TEMP` を尊重し、そうでなければ `/tmp` ではなく実ストレージ上の管理下のディレクトリ
`~/.hermes/cache/terminal` を使います。多くのディストリビューション（とくに Arch 系）では `/tmp`
が小さな RAM 上の tmpfs で、負荷がかかると Hermes のセッションの生成物で埋まってしまうためです。管理下のディレクトリは自動で掃除されます。72 時間より古い生成物は、ゲートウェイの日常処理によって毎時、CLI だけのインストールではプロセスごとに 1 回、掃かれます。
`temp_dir` に既存の絶対パスを設定すれば、セッションの一時領域をどこへでも移せます。利用者が設定したパスが自動で掃除されることはありません。

`terminal.font_family` は Hermes Desktop に埋め込まれた端末の見た目を決めます。ローカルにインストール済みのフォント名を 1 つ（たとえば `MesloLGS NF`）指定するか、CSS のフォントスタックを書けます。Hermes は同梱の JetBrains Mono のスタックを控えとして後ろに足し、空の値なら既定のままにします。同じ設定はプロファイル単位で **設定 → 外観 → 端末のフォント** からも編集できます。Google Fonts のダウンロードも、システムフォントの許可も不要です。

Modal、Daytona、Vercel Sandbox のようなクラウドのサンドボックスでは、`container_persistent: true` は「サンドボックスを作り直しても、Hermes がファイルシステムの状態を保とうとする」という意味です。同じ生きたサンドボックスや PID 空間、背景プロセスが後々まで動き続けることを約束するものではありません。

### バックエンドの一覧 {#backend-overview}

| バックエンド | コマンドが動く場所 | 隔離 | 向いている用途 |
|---------|-------------------|-----------|----------|
| **local** | 自分の機材で直接 | なし | 開発、個人での利用 |
| **docker** | 1 つの長生きする Docker コンテナ（セッション・`/new`・サブエージェントで共有） | 完全（名前空間、権限の削除） | 安全なサンドボックス、CI/CD |
| **ssh** | SSH 越しのリモートサーバー | ネットワークの境界 | リモートでの開発、強力な機材 |
| **modal** | Modal のクラウドサンドボックス | 完全（クラウドの VM） | 使い捨てのクラウド計算、評価 |
| **daytona** | Daytona のワークスペース | 完全（クラウドのコンテナ） | 運用込みのクラウド開発環境 |
| **vercel_sandbox** | Vercel Sandbox | 完全（クラウドの microVM） | スナップショットでファイルシステムを保つクラウド実行 |
| **singularity** | Singularity/Apptainer のコンテナ | 名前空間（--containall） | HPC クラスター、共用の機材 |

### local バックエンド {#local-backend}

既定です。コマンドは隔離なしで、自分の機材の上で直接動きます。特別な準備は要りません。

```yaml
terminal:
  backend: local
```

既定では、ローカルのツールの子プロセスは OS の実際のユーザーの `HOME` をそのまま使います。こうすることで、`git`、`ssh`、`gh`、`az`、`npm`、Claude Code、Codex といった外部の CLI が、普段のシェルで使っているのと同じ認証情報や設定を見つけられます。Hermes の状態は `HERMES_HOME` によってプロファイル単位に保たれます。設定・メモリ・セッション・スキルをプロファイルが選ぶ仕組みは `HOME` ではありません。

Hermes がシステム全体の `HOME` や、シェルの起動ファイル、OS アカウントのホームを書き換えることは**ありません**。この設定が決めるのは、`terminal`、背景の端末プロセス、`execute_code`、ACP の補助プロセスといったツールを通じて Hermes が起動する子プロセスに渡す環境だけです。

#### `terminal.home_mode` {#terminalhomemode}

| モード | ホストへのインストール | コンテナ | 引き換えになるもの |
|---|---|---|---|
| `auto` | OS の実ユーザーの `HOME` を保つ | `{HERMES_HOME}/home` を使う | 推奨の既定。ホストの CLI は動き続け、コンテナの状態は残ります。 |
| `real` | OS の実ユーザーの `HOME` を強制する | 見えるなら OS の実ユーザーの `HOME` を強制する | 親プロセスが誤ってプロファイルのホームを指す `HOME` で起動してしまった場合に役立ちます。 |
| `profile` | `{HERMES_HOME}/home` があればそれを使う | `{HERMES_HOME}/home` があればそれを使う | CLI の設定をプロファイルごとに厳密に隔離できますが、通常の `~/.ssh`、`~/.gitconfig`、`~/.azure`、`~/.config/gh`、Claude/Codex の認証情報、npm の状態などは、そのプロファイルのホームの中で用意するかリンクしない限り見えません。 |

既定の難点は、ホストのプロファイルどうしが `~` の下にある同じユーザーレベルの CLI の認証情報や設定を共有してしまうことです。git の名義、SSH の鍵、GitHub CLI のログイン、npm の設定、クラウド CLI のログインをプロファイルごとに分けたいなら、`home_mode: profile` にして、そのプロファイルのホームの中でこれらのツールを意識的に用意してください。

ツールの設定をプロファイルごとに厳密に隔離したいときは、次のように設定します。

```yaml
terminal:
  home_mode: profile
```

このモードでは、ツールの子プロセスは `{HERMES_HOME}/home` を `HOME` として使います。Hermes は
`HERMES_REAL_HOME` も設定するので、スクリプトは必要なときに実際のユーザーのホームを見つけられます。コンテナのバックエンドは `auto` モードでも `{HERMES_HOME}/home` を使い続けます。そのディレクトリが、消えない Hermes のデータ領域にあるからです。

プロファイルの状態と実際のユーザーのホームを区別する必要があるスクリプトでは、Hermes のデータには `HERMES_HOME` を、アカウントのホームには `HERMES_REAL_HOME` を使ってください。

```python
from pathlib import Path

hermes_home = Path(os.environ["HERMES_HOME"])
real_home = Path(os.environ.get("HERMES_REAL_HOME", os.environ["HOME"]))
```

:::warning
エージェントは、自分のユーザーアカウントと同じファイルシステムへのアクセス権を持ちます。使いたくないツールは `hermes tools` で無効にするか、サンドボックスが必要なら Docker に切り替えてください。
:::

### docker バックエンド {#docker-backend}

セキュリティを固めた Docker コンテナの中でコマンドを動かします（すべての権限を落とし、権限昇格を禁止し、PID 数を制限します）。

**1 つの長生きするコンテナを、Hermes のプロセス間で共有します。** Hermes は最初の利用時に長生きするコンテナを 1 つだけ起動し、端末・ファイル・`execute_code` のすべての呼び出しを `docker exec` でその同じコンテナへ通します。セッションをまたいでも、`/new`、`/reset`、`delegate_task` のサブエージェントでも同じです。作業ディレクトリの変更、インストールしたパッケージ、`/workspace` のファイル、そして**背景プロセス**が、ツール呼び出しの間でも、Hermes のプロセスの間でも引き継がれます。TUI のセッションを閉じても、`/quit` を実行しても、新しく `hermes` を起動しても、コンテナは動き続け、次の Hermes のプロセスがラベルによる検索で再利用します。取り壊しの正確な決まりは、下の **コンテナのライフサイクル** を参照してください。

**セッションごとに隔離するモード（`container_persistent: false`）。** Docker のバックエンドで `container_persistent: false` にすると、**セッションごとに** 1 つのコンテナを使う方式に切り替わります。チャット（デスクトップアプリのセッション、ゲートウェイの会話、TUI のセッション）はそれぞれ新しいサンドボックスを持ち、最初の端末 / ファイルの呼び出しで作られ、セッションが閉じるか `lifetime_seconds` を超えて放置されると削除されます。セッションの間で引き継がれるものは何もありません。ファイルシステムの状態も、マウントも、背景プロセスもです。`docker_mount_cwd_to_workspace: true` の場合、`/workspace` にマウントされるのは**そのセッションに紐づいた**ワークスペースだけで、ディレクトリの紐づけがない新しいセッションは、前のセッションのマウントを引き継がず空のワークスペースになります。`delegate_task` のサブエージェントは、それでも親セッションのコンテナを共有します。会話どうしの間でサンドボックスをセキュリティの境界として使いたいときはこのモードを、上に書いた長生きする共有コンテナが欲しいときは既定の `true` を使ってください。

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

**`docker_env`** と **`docker_forward_env`** の違い: 前者は設定に書いた `KEY=value` をそのまま注入します（値は `config.yaml` に置かれるか、`TERMINAL_DOCKER_ENV='{"DEBUG":"1"}'` のように JSON の辞書で渡されます）。後者はシェルや `~/.hermes/.env` から値を転送するので、実際の秘密が設定ファイルに現れません。トークンには `docker_forward_env` を、コンテナが必要とする固定のつまみには `docker_env` を使ってください。

**`terminal.docker_extra_args`**（`TERMINAL_DOCKER_EXTRA_ARGS='["--gpus=all"]'` でも上書きできます）は、Hermes が専用のキーとして用意していない `docker run` のフラグを自由に渡すためのものです。`--gpus`、`--network`、`--add-host`、`--security-opt` の別の指定などが該当します。各項目は文字列でなければなりません。この一覧は組み立てた `docker run` の最後に足されるので、必要なら Hermes の既定を上書きできます。使いすぎは禁物です。サンドボックスの防御（権限の削除、`--user`、ワークスペースのバインドマウント）と衝突するフラグは、黙って隔離を弱めます。

**`terminal.docker_network`**（既定は `true`。環境変数: `TERMINAL_DOCKER_NETWORK`） — `false` にすると、サンドボックスのコンテナを `--network=none` で動かし、エージェントのコマンドからのネットワーク送信をすべて断ちます。これは `terminal`、`execute_code`、ファイル系のツールが使う実行用コンテナに適用されます。コンテナは Hermes のプロセスをまたいで残るため、ネットワークありの古いコンテナがあるときにこれを `false` へ切り替えると、そのコンテナは削除され、通信を断った新しいコンテナが起動します（警告が記録されます）。中で動いていた背景プロセスは失われます。`docker_extra_args` で `--network=none` を渡すより、こちらのキーを使ってください。

**必要なもの:** Docker Desktop か Docker Engine がインストールされ、動いていること。Hermes は `$PATH` に加えて macOS のよくあるインストール先（`/usr/local/bin/docker`、`/opt/homebrew/bin/docker`、Docker Desktop のアプリバンドル）も探します。Podman はそのまま使えます。両方が入っているときに Podman を使わせるには、`HERMES_DOCKER_BINARY=podman`（またはフルパス）を設定してください。

#### コンテナのライフサイクル {#container-lifecycle}

Hermes が管理するコンテナにはラベルが 3 つ付き、あとから起動したプロセス（と孤児の掃除係）がそれを見分けられるようになっています。

- `hermes-agent=1` — Hermes が管理していることを示します
- `hermes-task-id=<sanitized task_id>` — タスクごとの再利用の判定に使う鍵です
- `hermes-profile=<sanitized profile name>` — 既定では、再利用と掃除の範囲を現在の Hermes のプロファイルに限ります。`docker_shared_container_key` が設定されている場合は、その正規化された値が代わりに使われます

起動時、Hermes は `docker ps --filter label=hermes-task-id=<id> --filter label=hermes-profile=<identity>` を実行し、見つかれば**既存のコンテナに接続します**。ここでの同一性は現在のプロファイルですが、`docker_shared_container_key` を明示すれば、信頼できるプロファイルどうしを共通の値へ寄せられます。コンテナが `exited` の状態なら（たとえば Docker のデーモンを再起動したあと）、`docker start` して再利用します。ファイルシステムの状態やインストール済みのパッケージは残りますが、コンテナ内の背景プロセスは残りません。

Hermes のプロセスが終わるとき — `/quit`、TUI のセッションを閉じる、ゲートウェイの停止、SIGKILL まで含めて — 既定のモードでは、後片づけの経路は**コンテナに対しては何もしません**。コンテナは動き続けます。次の Hermes のプロセスは、ラベルの照会でミリ秒のうちに接続します。「1 つの長生きするコンテナをセッション間で共有する」という約束には、この振る舞いが必要です。背景プロセス（npm の watcher、開発サーバー、長く走る pytest）がセッションをまたいで生き残る道は、これしかないからです。

**コンテナが停止・`docker rm -f` されるのは、次の場合だけです。**

| きっかけ | 発動する条件 |
|---|---|
| `docker_persist_across_processes: false` | プロセスごとに隔離することを明示した場合。`cleanup()` のたびに `stop` と `rm -f` を行います。issue #20561 より前の振る舞いと同じです。 |
| 放置の掃除係（`lifetime_seconds`、既定 300 秒） | 環境が `persist_across_processes=false` のときだけです。持続モードの環境では何もせず、コンテナは放置の掃除を生き延びます。 |
| 次回起動時の孤児の掃除係 | `2 × lifetime_seconds`（既定 600 秒 = 10 分）より古い、hermes のラベルが付いた **Exited** のコンテナを掃きます。範囲は現在のプロファイルです。**動いているコンテナには決して触れません** — 並走するプロセスを守るためです。無効にするには `docker_orphan_reaper: false` にします。 |
| 利用者自身の操作 | `docker rm -f`、`docker system prune`、Docker Desktop の再起動。`--restart=always` は設定していないので、ホストを再起動するとコンテナは `Exited` のまま残ります（その CoW レイヤーは残り、次回起動時に再利用されますが、背景プロセスは消えています）。 |

知っておくとよい端の場合:

- **コンテナ内の PID 1 が OOM で殺される**と、コンテナは `Exited` になります。次の再利用では `docker start` され、ファイルシステムの状態は残りますが、背景プロセスは残りません。
- **プロファイルの切り替え**はコンテナどうしを隔離します。`hermes-profile=work` のラベルが付いたコンテナは、`hermes-profile=research` で動く Hermes のプロセスからは見えません。孤児の掃除係もプロファイル単位なので、別プロファイルのコンテナが誤って掃かれることはありません。ただし、そのプロファイルで Hermes をもう一度起動するまで、自動では片づきません。
- **プロファイルをまたぐ共有を明示する** — 1 つの信頼できるワークスペースで意図して協働するプロファイルには、`terminal:` の下に同じ空でない `docker_shared_container_key` を設定します。これが置き換えるのはコンテナの同一性のラベルだけで、タスク・外部通信・ネットワークの適合性の検査は変わらず行われます。鍵を持たないプロファイルは隔離されたままです。同一性のラベルは鍵から短いダイジェストを付けて作られるので、似た鍵（`team/workspace` と `team_workspace`）が同じコンテナに衝突することはありません。**大事な点: 共有のコンテナは、最初に起動したプロファイルによって一度だけ作られます。** そのプロファイルの `docker_image`、ボリューム、shm のサイズなど、あとから変えられない Docker の設定が採用され、後から来たプロファイルはそのまま接続します。設定が違っていても、コンテナが削除されて作り直されるまでは無視されます。鍵を共有するプロファイルどうしは、イメージとマウントについて合意しておくべきです。

`delegate_task(tasks=[...])` で並列に立ち上がったサブエージェントは、この 1 つのコンテナを共有します。同時の `cd`、環境の書き換え、同じパスへの書き込みは衝突します。サブエージェントに隔離されたサンドボックスが必要なら、`register_task_env_overrides()` でタスクごとのイメージの上書きを登録する必要があります。強化学習やベンチマークの環境（TerminalBench2、HermesSweEnv など）は、タスクごとの Docker イメージのためにこれを自動で行っています。

**セキュリティの固め方:**
- `--cap-drop ALL` に対して `DAC_OVERRIDE`、`CHOWN`、`FOWNER` だけを戻します
- `--security-opt no-new-privileges`
- `--pids-limit 256`
- `/tmp`（512MB）、`/var/tmp`（256MB）、`/run`（64MB）に容量を限った tmpfs

**認証情報の転送:** `docker_forward_env` に挙げた環境変数は、まずシェルの環境から、次に `~/.hermes/.env` から解決されます。スキルは `required_environment_variables` を宣言でき、それらは自動で統合されます。

#### 環境変数による上書き {#environment-variable-overrides}

`terminal:` の下のすべてのキーには、`TERMINAL_<KEY_UPPERCASE>` という形の環境変数による上書きがあります。Docker のバックエンドでとくに役立つものは次のとおりです。

| 環境変数 | 対応するキー | 備考 |
|---|---|---|
| `TERMINAL_DOCKER_IMAGE` | `docker_image` | もとになるイメージ |
| `TERMINAL_DOCKER_FORWARD_ENV` | `docker_forward_env` | JSON の配列: `'["GITHUB_TOKEN","OPENAI_API_KEY"]'` |
| `TERMINAL_DOCKER_ENV` | `docker_env` | JSON の辞書: `'{"DEBUG":"1"}'` |
| `TERMINAL_DOCKER_VOLUMES` | `docker_volumes` | `"host:container[:ro]"` の文字列の JSON 配列 |
| `TERMINAL_DOCKER_EXTRA_ARGS` | `docker_extra_args` | JSON の配列 |
| `TERMINAL_DOCKER_MOUNT_CWD_TO_WORKSPACE` | `docker_mount_cwd_to_workspace` | `true` / `false` |
| `TERMINAL_DOCKER_RUN_AS_HOST_USER` | `docker_run_as_host_user` | `true` / `false` |
| `TERMINAL_DOCKER_NETWORK` | `docker_network` | `true` / `false` — 既定は `true`。`false` は `--network=none` |
| `TERMINAL_DOCKER_PERSIST_ACROSS_PROCESSES` | `docker_persist_across_processes` | `true` / `false` — 既定は `true` |
| `TERMINAL_DOCKER_SHARED_CONTAINER_KEY` | `docker_shared_container_key` | 信頼できるプロファイル用の共有の同一性。既定は空 |
| `TERMINAL_DOCKER_ORPHAN_REAPER` | `docker_orphan_reaper` | `true` / `false` — 既定は `true` |
| `TERMINAL_CONTAINER_CPU` | `container_cpu` | CPU のコア数 |
| `TERMINAL_CONTAINER_MEMORY` | `container_memory` | MB |
| `TERMINAL_CONTAINER_DISK` | `container_disk` | MB |
| `TERMINAL_CONTAINER_PERSISTENT` | `container_persistent` | `true` / `false` — バインドマウントするワークスペースのディレクトリを制御します。`docker_persist_across_processes` とは別物です |
| `TERMINAL_LIFETIME_SECONDS` | `lifetime_seconds` | 放置の掃除係の待ち時間 |
| `TERMINAL_TEMP_DIR` | `temp_dir` | セッションの一時領域の根（local バックエンド） |
| `TERMINAL_TIMEOUT` | `timeout` | コマンドごとのタイムアウト |
| `HERMES_DOCKER_BINARY` | _none_ | 使う docker/podman の実行ファイルのパスを固定します |

### ssh バックエンド {#ssh-backend}

SSH 越しに、リモートのサーバーでコマンドを動かします。接続の再利用に ControlMaster を使います（5 分の待機で接続を保ちます）。持続シェルは既定で有効なので、状態（作業ディレクトリ、環境変数）がコマンドをまたいで残ります。

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

| 変数 | 既定 | 説明 |
|----------|---------|-------------|
| `TERMINAL_SSH_PORT` | `22` | SSH のポート |
| `TERMINAL_SSH_KEY` | （システムの既定） | SSH の秘密鍵のパス |
| `TERMINAL_SSH_PERSISTENT` | `true` | 持続シェルを有効にします |

**仕組み:** 初期化のときに `BatchMode=yes` と `StrictHostKeyChecking=accept-new` で接続します。持続シェルはリモートのホストで `bash -l` のプロセスを 1 つ生かし続け、一時ファイルを介してやり取りします。`stdin_data` や `sudo` が必要なコマンドは、自動的に単発モードへ切り替わります。

### modal バックエンド {#modal-backend}

[Modal](https://modal.com) のクラウドサンドボックスでコマンドを動かします。タスクごとに、CPU・メモリ・ディスクを設定できる隔離された VM が割り当てられます。ファイルシステムはセッションをまたいでスナップショットと復元ができます。

```yaml
terminal:
  backend: modal
  container_cpu: 1                 # CPU cores
  container_memory: 5120           # MB (5GB)
  container_disk: 51200            # MB (50GB)
  container_persistent: true       # Snapshot/restore filesystem
```

**必要なもの:** `MODAL_TOKEN_ID` と `MODAL_TOKEN_SECRET` の環境変数、または `~/.modal.toml` の設定ファイル。

**持続性:** 有効にすると、後片づけのときにサンドボックスのファイルシステムがスナップショットされ、次のセッションで復元されます。スナップショットは `~/.hermes/modal_snapshots.json` で管理されます。残るのはファイルシステムの状態だけで、生きたプロセス、PID 空間、背景のジョブは残りません。

**認証情報のファイル:** `~/.hermes/` から自動でマウントされ（OAuth のトークンなど）、コマンドのたびに同期されます。

### daytona バックエンド {#daytona-backend}

[Daytona](https://daytona.io) の運用込みワークスペースでコマンドを動かします。停止と再開で状態を保てます。

```yaml
terminal:
  backend: daytona
  container_cpu: 1                 # CPU cores
  container_memory: 5120           # MB → converted to GiB
  container_disk: 10240            # MB → converted to GiB (max 10 GiB)
  container_persistent: true       # Stop/resume instead of delete
```

**必要なもの:** `DAYTONA_API_KEY` の環境変数。

**持続性:** 有効にすると、後片づけのときにサンドボックスは削除ではなく停止され、次のセッションで再開されます。サンドボックスの名前は `hermes-{task_id}` の形になります。

**ディスクの上限:** Daytona は最大 10 GiB を強制します。これを超える要求は、警告とともに上限まで下げられます。

### Vercel Sandbox バックエンド {#vercel-sandbox-backend}

[Vercel Sandbox](https://vercel.com/docs/vercel-sandbox) のクラウド microVM でコマンドを動かします。Hermes は通常の端末とファイルのツールをそのまま使い、Vercel 専用のモデル向けツールはありません。

```yaml
terminal:
  backend: vercel_sandbox
  vercel_runtime: node24          # node24 | node22 | python3.13
  cwd: /vercel/sandbox            # default workspace root
  container_persistent: true      # Snapshot/restore filesystem
  container_disk: 51200           # Shared default only; custom disk is unsupported
```

**必要なインストール:** 任意の SDK の追加分を入れます。

```bash
pip install 'hermes-agent[vercel]'
```

**必要な認証:** `VERCEL_TOKEN`、`VERCEL_PROJECT_ID`、`VERCEL_TEAM_ID` の 3 つすべてを揃えて、アクセストークンによる認証を設定します。これが、Render、Railway、Docker などのホストで配備したり、Hermes を長時間動かしたりするときの想定された構成です。

一度きりのローカルでの開発用に、Hermes は短命の Vercel OIDC トークンも受け付けます。

```bash
VERCEL_OIDC_TOKEN="$(vc project token <project-name>)" hermes chat
```

Vercel のプロジェクトに紐づいたディレクトリからなら、プロジェクト名を省けます。

```bash
VERCEL_OIDC_TOKEN="$(vc project token)" hermes chat
```

OIDC のトークンは短命なので、配備の手順として使うべきではありません。

**ランタイム:** `terminal.vercel_runtime` は `node24`、`node22`、`python3.13` に対応します。設定しない場合、Hermes は `node24` を既定にします。

**持続性:** `container_persistent: true` のとき、Hermes は後片づけのあいだにサンドボックスのファイルシステムをスナップショットし、同じタスクの次のサンドボックスをそこから復元します。スナップショットには、サンドボックスへ写された Hermes の認証情報、スキル、キャッシュのファイルが含まれることがあります。残るのはファイルシステムの状態だけで、生きたサンドボックスの同一性、PID 空間、シェルの状態、動いている背景プロセスは残りません。

**背景でのコマンド:** `terminal(background=true)` は、Hermes の汎用の（ローカル以外向けの）背景プロセスの流れを使います。サンドボックスが生きている間は、通常のプロセスのツールで起動・状態確認・待機・ログの閲覧・終了ができます。後片づけや再起動のあとに、Vercel 側の切り離されたプロセスを Hermes が拾い直す仕組みはありません。

**ディスクの大きさ:** Vercel Sandbox はいまのところ Hermes の `container_disk` のつまみに対応していません。`container_disk` は未設定のままにするか、共通の既定値 `51200` にしてください。それ以外の値は黙って無視されるのではなく、診断とバックエンドの作成が失敗します。

### Singularity/Apptainer バックエンド {#singularityapptainer-backend}

[Singularity/Apptainer](https://apptainer.org) のコンテナでコマンドを動かします。Docker が使えない HPC のクラスターや共用の機材のために設計されています。

```yaml
terminal:
  backend: singularity
  singularity_image: "docker://nikolaik/python-nodejs:python3.11-nodejs20"
  container_cpu: 1                 # CPU cores
  container_memory: 5120           # MB
  container_persistent: true       # Writable overlay persists across sessions
```

**必要なもの:** `$PATH` に `apptainer` か `singularity` の実行ファイルがあること。

**イメージの扱い:** Docker の URL（`docker://...`）は自動で SIF ファイルへ変換され、記憶されます。既存の `.sif` ファイルはそのまま使われます。

**作業用ディレクトリ:** 次の順で決まります。`TERMINAL_SCRATCH_DIR` → `TERMINAL_SANDBOX_DIR/singularity` → `/scratch/$USER/hermes-agent`（HPC の慣習） → `~/.hermes/sandboxes/singularity`。

**隔離:** `--containall --no-home` を使い、ホストのホームディレクトリをマウントせずに名前空間を完全に隔離します。

### 端末バックエンドでよくある問題 {#common-terminal-backend-issues}

端末のコマンドがすぐ失敗する、または端末のツールが無効と表示される場合は、次を確かめてください。

- **local** — 特別な条件はありません。使い始めにいちばん安全な既定です。
- **Docker** — `docker version` を実行して Docker が動いているか確かめます。失敗するなら Docker を直すか、`hermes config set terminal.backend local` にしてください。
- **SSH** — `TERMINAL_SSH_HOST` と `TERMINAL_SSH_USER` の両方が必要です。どちらかが欠けていれば Hermes がはっきりしたエラーを記録します。
- **Modal** — `MODAL_TOKEN_ID` の環境変数か `~/.modal.toml` が必要です。`hermes doctor` で確認できます。
- **Daytona** — `DAYTONA_API_KEY` が必要です。サーバーの URL の設定は Daytona の SDK が面倒を見ます。
- **Singularity** — `$PATH` に `apptainer` か `singularity` が必要です。HPC のクラスターではよくあります。

迷ったら `terminal.backend` を `local` に戻し、まずそこでコマンドが動くことを確かめてください。

### 取り壊し時のリモートからホストへの状態の同期 {#remote-to-host-state-sync-on-teardown}

**SSH**、**Modal**、**Daytona** のバックエンドでは、Hermes はセッションのあいだ `~/.hermes/` の状態（認証情報のファイル、スキル、キャッシュ）をリモートのサンドボックスへ送り込み、取り壊しのときに**変わった状態のファイルを元の場所へ書き戻します**。最初に送ったものと内容のハッシュが違うファイルはそのまま適用され、同期対象のディレクトリの下にできた新しいリモートのファイル（たとえばエージェントがリモートで作ったスキル）は、対応するホストのパスへ写されます。送るだけの認証情報のファイルが、ホスト側で上書きされることはありません。

- 書き戻しは待ち時間を置いて 3 回まで再試行し、2 GiB を超えるリモートの書庫は展開を拒みます。
- Docker と Singularity はバインドマウント（ホストのファイルシステムをそのまま見る方式）なので、これは不要です。
- 対象は Hermes の状態（`~/.hermes/`）であって、サンドボックスの中の作業ツリーのファイル全般では**ありません**。大事な成果物は、サンドボックスが壊される前にエージェントに明示的に持ち出させてください（`scp`、`modal volume put` など）。

### Docker のボリュームマウント {#docker-volume-mounts}

Docker のバックエンドを使うとき、`docker_volumes` でホストのディレクトリをコンテナと共有できます。各項目は Docker の `-v` と同じ書き方です: `host_path:container_path[:options]`。

```yaml
terminal:
  backend: docker
  docker_volumes:
    - "/home/user/projects:/workspace/projects"   # Read-write (default)
    - "/home/user/datasets:/data:ro"              # Read-only
    - "/home/user/.hermes/cache/documents:/output" # Gateway-visible exports
```

これは次のようなときに役立ちます。
- エージェントに**ファイルを渡す**（データセット、設定、参考のコード）
- エージェントから**ファイルを受け取る**（生成したコード、レポート、書き出し）
- 自分とエージェントが同じファイルを触る**共有の作業場**

メッセージングゲートウェイを使っていて、生成したファイルをエージェントに
`MEDIA:/...` で送らせたいときは、
`/home/user/.hermes/cache/documents:/output` のように、ホストから見える専用の書き出し用マウントを用意するのが確実です。

- Docker の中では `/output/...` にファイルを書きます
- `MEDIA:` には**ホスト側のパス**を出します。たとえば次のようにします:
  `MEDIA:/home/user/.hermes/cache/documents/report.txt`
- ホスト側のゲートウェイのプロセスにも同じパスが存在しない限り、`/workspace/...` や `/output/...` を
  出しては**いけません**

:::warning
YAML では重複したキーが、先に書いたものを黙って上書きします。すでに
`docker_volumes:` のブロックがあるなら、あとからもう 1 つ `docker_volumes:` のキーを足すのではなく、
同じ一覧に新しいマウントを足してください。
:::

環境変数でも設定できます: `TERMINAL_DOCKER_VOLUMES='["/host:/container"]'`（JSON の配列）。

### Docker への認証情報の転送 {#docker-credential-forwarding}

既定では、Docker の端末セッションがホストの認証情報を無差別に引き継ぐことはありません。特定のトークンをコンテナの中で使いたいときは、`terminal.docker_forward_env` に追加します。

```yaml
terminal:
  backend: docker
  docker_forward_env:
    - "GITHUB_TOKEN"
    - "NPM_TOKEN"
```

Hermes は挙げられた変数をまず現在のシェルから解決し、`hermes config set` で保存されていれば `~/.hermes/.env` へ落ちます。

:::warning
`docker_forward_env` に挙げたものは、コンテナの中で動くコマンドから見えるようになります。その端末セッションに見せてもかまわない認証情報だけを転送してください。
:::

### コンテナをホストのユーザーとして動かす {#running-the-container-as-your-host-user}

既定では、Docker のコンテナは `root`（UID 0）として動きます。`/workspace` やほかのバインドマウントの中で作られたファイルは、ホスト側では root の持ち物になるので、セッションのあとにホストのエディターで編集するには `sudo chown` が要ります。`terminal.docker_run_as_host_user` のフラグは、これを解決します。

```yaml
terminal:
  backend: docker
  docker_run_as_host_user: true   # default: false
```

有効にすると、Hermes は `docker run` に `--user $(id -u):$(id -g)` を足すので、バインドマウントしたディレクトリ（`/workspace`、`/root`、`docker_volumes` に挙げたもの）へ書かれたファイルは root ではなく自分のユーザーの持ち物になります。引き換えに、コンテナは `apt install` ができなくなり、`/root/.npm` のような root の持ち物のパスにも書けなくなります。両方が必要なら、`HOME` が root 以外の持ち物になっているイメージを使うか、必要な道具をイメージのビルド時に入れておいてください。

これまでどおりの振る舞いが良ければ `false`（既定）のままにしてください。作業の中心が「マウントしたホストのファイルを編集すること」で、`sudo chown -R` に疲れたなら有効にしましょう。

### 任意: 起動したディレクトリを `/workspace` にマウントする {#optional-mount-the-launch-directory-into-workspace}

Docker のサンドボックスは、既定では隔離されたままです。明示的に選ばない限り、Hermes がホスト側の現在の作業ディレクトリをコンテナへ渡すことは**ありません**。

`config.yaml` で有効にします。

```yaml
terminal:
  backend: docker
  docker_mount_cwd_to_workspace: true
```

有効にすると、次のようになります。
- `~/projects/my-app` から Hermes を起動した場合、そのホストのディレクトリが `/workspace` にバインドマウントされます
- Docker のバックエンドは `/workspace` から始まります
- ファイルのツールも端末のコマンドも、同じマウントされたプロジェクトを見ます

無効のときは、`docker_volumes` で明示的に何かをマウントしない限り、`/workspace` はサンドボックスの持ち物のままです。

セキュリティ上の引き換え:
- `false` はサンドボックスの境界を保ちます
- `true` は Hermes を起動したディレクトリへ、サンドボックスから直接アクセスできるようにします

コンテナにホストの生きたファイルを触らせたいと本当に思うときだけ、これを選んでください。

### 持続シェル {#persistent-shell}

既定では、端末のコマンドはそれぞれ別の子プロセスで動きます。作業ディレクトリ、環境変数、シェルの変数はコマンドごとに戻ります。**持続シェル**を有効にすると、長生きする 1 つの bash のプロセスが `execute()` の呼び出しをまたいで生き続け、状態がコマンドの間で残ります。

これがいちばん役立つのは **SSH のバックエンド**で、コマンドごとの接続の手間もなくなります。持続シェルは **SSH では既定で有効**、ローカルのバックエンドでは無効です。

```yaml
terminal:
  persistent_shell: true   # default — enables persistent shell for SSH
```

無効にするには、次のようにします。

```bash
hermes config set terminal.persistent_shell false
```

**コマンドをまたいで残るもの:**
- 作業ディレクトリ（`cd /tmp` が次のコマンドでも効いています）
- export した環境変数（`export FOO=bar`）
- シェルの変数（`MY_VAR=hello`）

**優先順位:**

| 層 | 変数 | 既定 |
|-------|----------|---------|
| 設定 | `terminal.persistent_shell` | `true` |
| SSH の上書き | `TERMINAL_SSH_PERSISTENT` | 設定に従う |
| ローカルの上書き | `TERMINAL_LOCAL_PERSISTENT` | `false` |

バックエンドごとの環境変数がいちばん強く効きます。ローカルのバックエンドでも持続シェルを使いたいなら、次のようにします。

```bash
export TERMINAL_LOCAL_PERSISTENT=true
```

:::note
`stdin_data` や sudo が必要なコマンドは、自動的に単発モードへ切り替わります。持続シェルの標準入力は、すでにプロセス間のやり取りに使われているからです。
:::

各バックエンドの詳しい話は、[コードの実行](/hermes/docs/user-guide/features/code-execution/)と [README の端末の節](/hermes/docs/user-guide/features/tools/)を参照してください。

## スキルの設定 {#skill-settings}

スキルは SKILL.md の frontmatter で、自分の設定項目を宣言できます。これらは秘密ではない値（パス、好み、分野ごとの設定）で、`config.yaml` の `skills.config` の名前空間の下に保存されます。

```yaml
skills:
  config:
    myplugin:
      path: ~/myplugin-data   # Example — each skill defines its own keys
```

**スキルの設定の仕組み:**

- `hermes config migrate` は有効なスキルをすべて調べ、未設定の項目を見つけて入力を促します
- `hermes config show` はすべてのスキルの設定を「Skill Settings」の下に、どのスキルのものかとあわせて表示します
- スキルが読み込まれると、解決された設定値がスキルの文脈へ自動的に渡されます

**値を手で設定する:**

```bash
hermes config set skills.config.myplugin.path ~/myplugin-data
```

自作のスキルで設定項目を宣言する方法は、[スキルを作る — 設定項目](/hermes/docs/developer-guide/creating-skills/#config-settings-configyaml)を参照してください。

### エージェントが作るスキルの書き込みへの見張り {#guard-on-agent-created-skill-writes}

エージェントが `skill_manage` でスキルを作成・編集・修正・削除するとき、Hermes は新しい内容や更新後の内容に危険なキーワードの型（認証情報の収集、あからさまなプロンプトインジェクション、情報の持ち出しの指示）がないか調べることができます。この検査は**既定では切ってあります**。`~/.ssh/` に正当に触れたり `$OPENAI_API_KEY` に言及したりする実際の作業で、この推測が頻繁に引っかかってしまったためです。エージェントのスキルの書き込みが着地する前に確認を求めてほしいなら、戻してください。

```yaml
skills:
  guard_agent_created: true   # default: false
```

有効にすると、引っかかった `skill_manage` の書き込みは、検査の理由を添えた承認の確認として表示されます。承認されたものは書き込まれ、拒否されたものは説明つきのエラーとしてエージェントへ返ります。

### スキルの書き込みへの承認 {#write-approval-for-skill-writes}

上の内容の検査とは別に、`skills.write_approval` はエージェントによる**すべての**スキルの書き込み（作成 / 編集 / 修正 / 削除 / 付随するファイル）を、明示的な承認の後ろに置きます。危険なコマンドと同じ承認・拒否の仕組みです。

```yaml
skills:
  write_approval: false   # false = write freely (default) | true = stage every write for review
```

有効にすると、スキルの書き込みは `~/.hermes/pending/skills/` に置かれ、`/skills pending`、`/skills diff <id>`、`/skills approve <id>`、`/skills reject <id>` で確認します。CLI からでも、どのメッセージングのプラットフォームからでもかまいません。実行中は `/skills approval on|off` で切り替えられます。メモリにも同じ仕組みがあります（下の `memory.write_approval`）。ひととおりの手順は[エージェントのスキルの書き込みを止める](/hermes/docs/user-guide/features/skills/#gating-agent-skill-writes-skillswrite_approval)にあります。

## メモリの設定 {#memory-configuration}

```yaml
memory:
  memory_enabled: true
  user_profile_enabled: true
  memory_char_limit: 2200   # ~800 tokens
  user_char_limit: 1375     # ~500 tokens
  write_approval: false     # true = require approval before any memory write
```

`memory.write_approval: true` にすると、メモリへの書き込みは着地する前に承認が要ります。対話的な CLI のターンではその場で確認され、メッセージングのセッションと背景での自己改善の見直しでは、書き込みが `/memory pending` → `/memory approve <id>` / `/memory reject <id>` の確認へ回されます。実行中は `/memory approval on|off` で切り替えられます。[メモリへの書き込みを制御する](/hermes/docs/user-guide/features/memory/#controlling-memory-writes-write_approval)を参照してください。

## 文脈ファイルの切り詰め {#context-file-truncation}

Hermes が自動で読み込む文脈ファイルから、頭と末尾を残す切り詰めを行う前に、どれだけの内容を読むかを制御します。これは `SOUL.md`、`.hermes.md`、`AGENTS.md`、`CLAUDE.md`、`.cursorrules` のように、システムプロンプトへ差し込まれるファイルに適用されます。`read_file` のツールには影響し**ません**。

```yaml
context_file_max_chars: null  # default — dynamic cap scaled to the model's context window (floor 20K, ceiling 500K chars)
```

動的な挙動をやめて固定の上限にするには、正の整数を設定します。

```yaml
context_file_max_chars: 25000
```

## ファイル読み取りの安全策 {#file-read-safety}

1 回の `read_file` の呼び出しが返せる内容の量を制御します。上限を超える読み取りは拒否され、`offset` と `limit` で範囲を狭めるようエージェントに伝えるエラーが返ります。これで、圧縮された JS の塊や大きなデータファイルを 1 回読んだだけでコンテキストがあふれるのを防げます。

```yaml
file_read_max_chars: 100000  # default — ~25-35K tokens
```

コンテキストの大きなモデルを使っていて、大きなファイルをよく読むなら上げてください。コンテキストの小さなモデルでは、読み取りを軽く保つために下げます。

```yaml
# Large context model (200K+)
file_read_max_chars: 200000

# Small local model (16K context)
file_read_max_chars: 30000
```

エージェントはファイルの読み取りの重複も自動で省きます。同じファイルの同じ範囲を 2 回読んで、その間にファイルが変わっていなければ、内容を送り直す代わりに軽い代替の印が返ります。これはコンテキストの圧縮のときにリセットされるので、内容が要約で消えたあとに読み直せます。

## ツール出力の切り詰めの上限 {#tool-output-truncation-limits}

ツールが返せる生の出力の量には、関係し合う 3 つの上限があります。

```yaml
tool_output:
  max_bytes: 50000        # terminal output cap (chars)
  max_lines: 2000         # read_file pagination cap
  max_line_length: 2000   # per-line cap in read_file's line-numbered view
```

- **`max_bytes`** — `terminal` のコマンドが標準出力と標準エラーを合わせてこれより多い文字数を出したとき、Hermes は先頭 40% と末尾 60% を残し、その間に `[OUTPUT TRUNCATED]` の断りを挟みます。既定は `50000`（よくあるトークナイザーでおよそ 12〜15K トークン）。
- **`max_lines`** — 1 回の `read_file` の `limit` の上限です。これを超える要求は丸められ、1 回の読み取りでコンテキストがあふれないようにします。既定は `2000`。
- **`max_line_length`** — `read_file` が行番号つきの表示を出すときの、1 行あたりの上限です。これより長い行はこの文字数まで切られ、`... [truncated]` が続きます。既定は `2000`。

コンテキストの大きなモデルで、呼び出しごとにもっと生の出力を受け止められるなら上げてください。コンテキストの小さなモデルでは、ツールの結果を小さく保つために下げます。

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

### ツールの結果のあふれ出しの予算 {#tool-result-spillover-budget}

切り詰めとは別に、大きすぎるツールの*結果*は切られるのではなくディスクへあふれ出します。出力の全体は `$HERMES_HOME/cache/spillover/` の下に保存され、コンテキストに入る内容は、抜粋と保存先のパス（`read_file` に `offset`/`limit` を付けて読めますし、`execute_code` で処理もできます）に置き換わります。汎用の結果ごとのあふれ出しのしきい値は 100,000 文字で、コンテキストの小さなモデルでは自動的に小さくなります。

MCP のツールの結果（`mcp_*` という名前のツール）は、より厳しい **50,000 文字**を既定にしています。MCP のサーバーは、ページ分けされていない大きな内容（ツールの一覧、まとめて実行した結果）を返しがちで、そのままだと汎用のしきい値の下に収まって、以後のターンごとにコンテキストを膨らませてしまうからです。失われるものはありません。結果の全体はディスクに残ります。しきい値は次で上書きできます。

```yaml
tool_budget:
  mcp_result_size_chars: 50000   # per-result spillover threshold for mcp_* tools
```

MCP のしきい値は、（コンテキストに応じて縮んでいるかもしれない）汎用の結果ごとのしきい値で常に頭打ちになるので、上げても、いま使っているモデルのコンテキストが許す以上にはなりません。

Hermes は**プロバイダー側での省略**も知らせます。MCP や Web のツールの結果が、それ自身の切り詰めの印（`...N more items`、`"has_more": true`、「サンドボックスへ保存しました」といった注記）を含んでいるとき、結果の末尾に 1 行の断りが足され、見えているデータが不完全なので、数え上げを完了したものとして扱う前に続きを取りに行くべきだと警告します。

## ツール群の全体的な無効化 {#global-toolset-disable}

特定のツール群を、CLI とすべてのゲートウェイのプラットフォームで一括して抑えたい場合は、
その名前を `agent.disabled_toolsets` の下に並べます。

```yaml
agent:
  disabled_toolsets:
    - memory       # hide memory tools + MEMORY_GUIDANCE injection
    - web          # no web_search / web_extract anywhere
```

これはプラットフォームごとのツールの設定（`hermes tools` が書く `platform_toolsets`）の**あとに**適用されるので、ここに挙げたツール群は必ず取り除かれます。プラットフォームの保存済みの設定にまだ載っていてもです。`hermes tools` の画面で 15 以上のプラットフォームの行を編集するのではなく、「どこでも X を切る」という 1 つのスイッチが欲しいときに使ってください。

一覧を空のままにするか、キーごと省いた場合は、何も起きません。

## git worktree による隔離 {#git-worktree-isolation}

同じリポジトリで複数のエージェントを並行して動かすために、隔離された git の worktree を有効にします。

```yaml
worktree: true    # Always create a worktree (same as hermes -w)
# worktree: false # Default — only when -w flag is passed
```

有効にすると、CLI のセッションごとに `.worktrees/` の下へ、自分のブランチを持つ新しい worktree が作られます。エージェントはファイルを編集し、コミットし、push し、PR を作っても互いに干渉しません。きれいな worktree は終了時に削除され、変更が残っているものは手で回収できるように残されます。

既定では、新しい worktree は**取得したてのリモートの先端**（現在のブランチの追跡先、なければリモートの既定のブランチ）から分岐します。ローカルのクローンの、古いかもしれない `HEAD` からではなく、プロジェクトの現在に追いついた状態から始めるためです。こうすると PR の差分が実際の変更だけになり、ローカルのクローンの遅れを巻き込みません。ローカルの `HEAD` から分岐させたいときは `worktree_sync: false` にします。オフラインのときや、クローンの現在の状態そのものを土台にしたいときに便利です。リモートに届かない場合は、自動でローカルの `HEAD` に落ちます。

```yaml
worktree_sync: true    # Default — branch from the fetched remote tip
# worktree_sync: false # Branch from local HEAD (offline / pinned base)
```

git が無視しているファイルのうち worktree へ写したいものは、リポジトリの直下に `.worktreeinclude` を置いて並べられます。

```
# .worktreeinclude
.env
.venv/
node_modules/
```

## コンテキストの圧縮 {#context-compression}

Hermes は、モデルのコンテキストに収まるように、長い会話を自動で圧縮します。圧縮の要約役は別の LLM の呼び出しなので、どのプロバイダーやエンドポイントにも向けられます。

圧縮の設定はすべて `config.yaml` にあります（環境変数はありません）。

### 全項目 {#full-reference}

```yaml
compression:
  enabled: true                                     # Toggle compression on/off
  progress_notices: false                           # Opt-in: deliver routine compression progress notices to chat platforms — see below
  threshold: 0.50                                   # Compress at this % of context limit
  threshold_tokens: null                            # Absolute token cap (optional) — takes lower of ratio vs absolute
  target_ratio: 0.20                                # Fraction of threshold to preserve as recent tail
  tail_mode: lean                                   # Tail retention: "lean" (default — clamped 2.5% tail, 10K-25K, with digests + anchor index + session_search recovery pointers in the summary; ~3x fewer retained tokens after compaction) or "legacy" (0.20×threshold verbatim tail)
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
`compression.summary_model`、`compression.summary_provider`、`compression.summary_base_url` を使っている古い設定は、最初の読み込み時に `auxiliary.compression.*` へ自動で移行されます（設定バージョン 17）。手作業は要りません。
:::

`progress_notices`（既定 `false`）は、**日常的な**圧縮の進み具合をチャットのプラットフォーム（Telegram、Discord、Slack など）へ届けるかどうかを決めます。設計として、自動の圧縮はチャットの画面では静かに進みます。背景で走り、記録はサーバー側だけです。`progress_notices: true` にすると、日常の流れがチャットにも出るようになります。「コンテキストをまとめています…」という開始の知らせ、事前検査や API 呼び出し前の圧縮のきっかけ、放置による圧縮、再試行の様子（「30 → 12 メッセージに圧縮し、やり直しています…」）、そして「コンテキストのまとめが終わりました」という知らせです。この扉は圧縮の状態だけに効きます。関係のない運用上の雑音（補助モデルの失敗、プロバイダーのレート制限や再試行のやり取り）は、どちらにしても抑えられたままです。圧縮の**失敗**の知らせと、手動の `/compress` の反応は、この設定にかかわらず常に見えます。動いているゲートウェイでこの値を編集すると、次のメッセージから効きます。

`hygiene_hard_message_limit` は、ゲートウェイ専用の**圧縮前の安全弁**です。これは悪循環を断つためにあります。大きくなりすぎたセッションで API の呼び出しが切れ続けると、ゲートウェイはトークンの使用量を受け取れず、トークンに基づくしきい値が働かず、記録は伸び続け、切断はさらに悪くなります。この件数に基づく下限は、メッセージの数だけで（API が失敗していても常に分かる情報です）働き、圧縮を強制してセッションを立て直します。既定は `5000` で、通常のセッションよりはるかに上です。コンテキストの大きな（100 万トークン超の）モデルで短いやり取りを何千回続けても、ここに届くずっと前にトークンのしきい値で圧縮されます。変わったプラットフォームではさらに上げ、もっと積極的に圧縮したいなら下げてください。動いているゲートウェイでこの値を編集すると、次のメッセージから効きます（下記参照）。

`hygiene_timeout_seconds` は、このエージェント前の圧縮の工程に対するゲートウェイの**無音の許容時間**であって、全体の時計の上限ではありません。圧縮の要約の呼び出しはモデルからストリームで返り、届いたトークンはどれも前進とみなされます。時間のかかる推論モデルでも、生成が続いている限り自分の期限を延ばし続けるので、遅いだけで健全な要約モデルが途中で切られることはありません。要約モデルがこの秒数のあいだ**まったく出力しない**とき（バックエンドの停止、固まった接続、黙り込んだプロバイダー）にだけ、ゲートウェイは利用者に警告し、届いたメッセージを圧縮せずに続け、詰まっているように見せる代わりに、セッションごとの一時的な失敗のクールダウンを記録します。

`hygiene_total_ceiling_seconds`（既定 `600`）は、トークンがまだ動いていても全体の待ち時間を区切ります。ひどく細い流れがターンを人質にし続けられないようにするためです。この値は最低でも `hygiene_timeout_seconds` まで引き上げられます。

`hygiene_max_turn_hold_seconds`（既定 `10`）は、ゲートウェイの**ターン保留の予算**です。届いたメッセージが、圧縮の完了を待って保留されうる最大の実時間で、これを過ぎるとゲートウェイは待つのをやめ、圧縮していない記録のまま先へ進みます。これがあるのは、`hygiene_total_ceiling_seconds` だけでは、チャットの通信路の待機のタイムアウトよりずっと長く回線を沈黙させかねないからです。要約モデルがトークンを出し続けると無音の枠が更新され続けるので、ターン保留の予算がないと、利用者へ 1 バイトも届かないまま待ち時間が上限へ伸びていきます。Telegram（や似た通信路）はそこで接続を切り、ターンは固まったように見えます。ターンの待ち時間をこの予算（よくある約 30 秒の通信路の待機のタイムアウトよりずっと短い値）で区切れば、メッセージには必ず素早く答えが返ります。圧縮の作業は切り離されたまま走り続け、その書き込みには柵が設けられているので（`CompressionCommitFence`）、待つのをやめたあとに足されたやり取りを、あとから終わった圧縮が上書きすることはありません。要約モデルがいつも長くかかり、通信路がそれを許すなら上げてください。とても遅いバックエンドで素早く立ち直りたいなら下げてください。

`hygiene_failure_cooldown_seconds` は、圧縮のタイムアウトや中断のあとの、セッションごとのクールダウンを決めます。クールダウンのあいだ、ゲートウェイは同じ大きすぎるセッションについて圧縮のやり直しを飛ばすので、届くメッセージのたびに同じ壊れた補助バックエンドで止まることがなくなります。`/compress`、`/reset`、あるいは後の健全なターンで、セッションは立ち直れます。

この値は固定の間隔ではなく、段々と伸びるはしごの**最初の段**です。同じセッションで失敗が続くと、`1x`、`3x`、`9x` と待ち、最大 1 時間で頭打ちになります。要約モデルが完全に壊れているセッションは、固定の間隔で永遠に再試行するのではなく身を引きます。実際に記録が縮んだ実行があれば、最初の段に戻ります。段の進み方はセッションごと・プロセス内でのみ保たれるので、ゲートウェイを再起動すると最初の段に戻りますが、クールダウンの期限そのものは残ります。

`context_timeout_seconds`（既定 `120`）は、エージェント内の `compress_context` — 会話のループ、事前のまとめ、手動の `/compress` — に対する同じ**無音の許容時間**で、固まった要約モデルがセッションを永遠に止められないようにします。ストリームで届く要約のトークンは待ち時間を延ばし、黙り込んだ処理だけが打ち切られます。タイムアウトすると、Hermes は `auxiliary.compression.fallback_chain` の最初の項目に対して要約を 1 回だけやり直します（その項目が `timeout` を宣言していればそれを使います）。止まった経路は例外を投げないので、補助クライアント自身のフォールバックの処理からは見えないからです。その試みも失敗するか、フォールバックの連鎖が設定されていない場合にだけ、Hermes はまとめを飛ばし、既存のメッセージを残して利用者に警告します。`0` にすると無効になります。ゲートウェイのセッションの手当ては独自の `hygiene_timeout_seconds` の経路を持ち、二重に包まれることはありません。

`context_total_ceiling_seconds`（既定 `600`）は、トークンがまだ動いていても、エージェント内の**書き込み前**の待ち時間（要約 / ストリームの段階）を区切ります。この値は最低でも `context_timeout_seconds` まで引き上げられます。約束は正確にはこうです。**要約の段階はこの上限で区切られ、書き込みの段階は上限を超えたら記録され、利用者にも知らされます。** 処理が圧縮の書き込みの柵に入り、SessionDB の書き換えが進行中になったら、その書き込みが途中で打ち切られることはありません。記録が食い違う恐れがあるからです。ただし待ち時間は無音ではなくなります。書き込みが上限を超えたら、Hermes は超過を記録し（WARNING、繰り返せば ERROR へ上がります）、利用者に見える警告の経路で一度だけ知らせ、書き込みが終わるまで区切りながら待ち続けます。

`protect_first_n` は、まとめのたびに何件の**システム以外の**先頭のメッセージを固定するかを決めます。既定は `3` で、最初のユーザーとアシスタントのやり取りは要約のたびに生き残るので、当初の目的が見えたままになります。長く回り続けるまとめのセッションで、最初のやり取りがもう関係ないなら、`protect_first_n: 0` にして、システムプロンプトと要約と末尾以外は固定しないようにできます。システムプロンプト自体は、この設定にかかわらず常に残ります。

`in_place`（既定 `true`）は、まとめが働いたときにセッションの同一性がどうなるかを決めます。`true` のとき、まとめはメッセージの一覧を書き換え、システムプロンプトを組み直しますが、**セッションの id を入れ替えません**。会話は一生を通じて 1 つの id を保ちます（`parent_session_id` の連なりも、セッションの一覧での `name #2` / `#3` という番号の振り直しもありません）。まとめは破壊的ではありません。生きた文脈はまとめられますが、まとめる前のやり取りは同じ id の下に静かに保管され（非アクティブ / まとめ済みとして印が付きます）、`session_search` で今なお探せますし、取り戻せます。消えてはいません。フックは `session:compress` のイベントの `in_place` の項目でモードを知れます。`in_place: false` にすると、まとめのたびに新しいセッション id へ移り、それが古いものへつながる、従来の振る舞いに戻ります。

`threshold_tokens` は、圧縮のきっかけに対する任意の**絶対的なトークンの上限**を決めます。設定すると、割合による `threshold` とこの絶対値の、早いほうで圧縮が働きます。どのモデルを使っていても、圧縮が自分の望むトークン数より遅れて働くことはありません。これは、コンテキストの大きさが違うモデルを行き来する（たとえば 100 万 → 40 万）と、絶対的なきっかけの位置がずれてしまう問題を解きます。この上限はモデルのコンテキスト長で丸められるので、モデルが対応する以上に高く設定しても安全です（そのときは割合によるしきい値が使われます）。既定は `null`（無効。割合によるしきい値だけ）。この上限は、モデルの切り替えやフォールバックの発動をまたいで残ります。

`idle_compact_after_seconds` は、大きさに基づく `threshold` を補う、**任意で使う時間に基づく**きっかけです。既定は `0`（無効）。0 より大きくすると、その秒数以上放置されたあとに再開したセッションは、最初の返事の前に、たまった履歴を先にまとめます。長く続くスレッド（たとえば何時間かぶりに戻ってきた Telegram の会話）が、以後のターンごとに古い文脈を丸ごと読み直さずに済みます。文脈がすでに圧縮後の目標（`threshold × target_ratio`）以下ならこれは働きませんし、自動のまとめと同じ失敗のクールダウン・往復の防止・セッションごとの錠前の見張りにも従います。例: `idle_compact_after_seconds: 1800` なら、30 分放置されたあとにまとめます。

`proactive_prune_tokens` は、`threshold` とは独立に走る、LLM を使わない決定的な古いツールの結果の刈り込みを有効にします。コンテキストの大きなモデルでは `threshold` によるまとめ（コンテキストのおよそ 50%）はめったに働かないので、かさばるツールの出力（端末の吐き出し、ファイルの読み取り、Web の抽出）が履歴に乗ったまま、以後のターンのたびに送り直されます。送り直される履歴が `proactive_prune_tokens`（既定 `0` = 無効。試すなら `48000`）を超えると、刈り込みは同じ結果の重複を省き、古くて大きなものを要約し、大きなツールの引数を切り詰めます。直近の `protect_last_n` のメッセージは守られ、モデルは一切呼ばれません。出力の全体はセッションの保管庫から取り戻せます。`proactive_prune_min_result_chars`（既定 `8000`、200 以上に丸められます）は、これより小さいツールの結果には触れないという境目です。`proactive_prune_min_reclaim_tokens`（既定 `4096`）は、これだけのトークンを取り戻せない限り刈り込みを確定させません。確定した刈り込みは、すでに送った履歴を書き換え、プロバイダーのプロンプトキャッシュの前半を無効にするので、この関門があることで、キャッシュの切れ目が（圧縮の境目のように）ときどき起きる、割に合うものに保たれ、ツールを呼ぶたびに起きることがなくなります。これは組み込みの `compressor` のエンジンでのみ働き、ほかのコンテキストのエンジンでは何もしません。

:::tip 圧縮とコンテキスト長のゲートウェイでの即時反映
最近のリリースからは、動いているゲートウェイで `config.yaml` の `model.context_length` や `compression.*` のキーを編集すると、次のメッセージから効きます。ゲートウェイの再起動も、`/reset` も、セッションの入れ替えも要りません。キャッシュされたエージェントの識別にこれらのキーが含まれているので、変更を見つけるとゲートウェイが黙ってエージェントを組み直します。API キーやツール / スキルの設定は、これまでどおりの再読み込みの手順が要ります。
:::

### よくある構成 {#common-setups}

**既定（自動判定） — 設定は要りません:**
```yaml
compression:
  enabled: true
  threshold: 0.50
```
メインのプロバイダーとメインのモデルを使います。メインのチャットモデルより安いモデルで圧縮したいなら、タスクごとに上書きしてください（たとえば `auxiliary.compression.provider: openrouter` と `model: google/gemini-2.5-flash`）。

**特定のプロバイダーを強制する**（OAuth でも API キーでも）:
```yaml
auxiliary:
  compression:
    provider: nous
    model: gemini-3-flash
```
どのプロバイダーでも使えます: `nous`、`openrouter`、`codex`、`anthropic`、`main` など。

**独自エンドポイント**（自前で立てたもの、Ollama、zai、DeepSeek など）:
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
| `auto`（既定） | 未設定 | 使えるいちばん良いプロバイダーを自動で選びます |
| `nous` / `openrouter` など | 未設定 | そのプロバイダーを強制し、その認証を使います |
| どれでも | 設定あり | 独自エンドポイントを直接使います（プロバイダーは無視されます） |

:::warning 要約モデルのコンテキスト長の条件
要約のモデルは、メインのエージェントのモデルと**同じかそれ以上**のコンテキストを持っている必要があります。圧縮では、会話の中ほど全体を要約のモデルへ送ります。そのモデルのコンテキストがメインより小さいと、要約の呼び出しはコンテキスト長のエラーで失敗します。そうなると中ほどのやり取りは**要約されないまま捨てられ**、会話の文脈が黙って失われます。モデルを上書きするときは、そのコンテキスト長がメインのモデル以上かを確かめてください。
:::

## ゲートウェイのターンの占有のタイムアウト {#gateway-turn-lease-timeout}

ゲートウェイは、2 つの経路が同じ記録を同時に読み書きしないように、解決されたセッション ID
でターンを順番に並べます。この占有の待ち時間の上限は、通常のエージェントの無音のタイムアウトとは別に設定できます。

```yaml
agent:
  gateway_turn_lease_timeout: 1800
```

この予算が尽きた時点でまだ別のターンがセッションの占有を握っていた場合、Hermes は
安全側に倒します。待っているメッセージのために記録を読み込むことも、モデルを走らせることもしません。利用者には拒否の知らせが届き、送り直しが必要になります。Hermes がメッセージを自動で並べ直さないのは、確かな順序と冪等性がないままそうすると、二重に処理されかねないからです。0 以下の値は 1800 秒の既定になります。

## セッションの停滞の見張り {#session-stall-watchdog}

ゲートウェイは、知らせるだけの停滞の見張り（`agent.session_stall_timeout`、既定 `300` 秒、`0` は無効）を動かしています。取り込み中のセッションに**未処理の受信の続き**があり、エージェントの共有の活動の時計がこの時間だけ動いていないとき、ゲートウェイは WARNING を記録し、利用者に一度だけ知らせます。

```
⚠️ Agent session appears stalled (last activity N min ago). Try /new to reset.
```

意味は次のとおりです。

- **知らせるだけです。** この見張りがターンを止めることはありません。長い無音のあとに実行を打ち切る `agent.gateway_timeout` とは対照的です。停滞の知らせは、エージェントが詰まって見えることを伝えるだけで、どうするか（`/new`、`/stop`、待ち続ける）は利用者が決めます。
- **停滞の一区切りにつき 1 回だけ知らせます。** 未処理の受信がはけるか活動が戻ると掛け金が外れるので、いったん立ち直ってまた停滞すれば、また知らせます。
- 前進の判断は、共有の活動の記録（ツールの呼び出し、API のストリームの進み、圧縮の鼓動）だけから行います。未処理の受信は知らせるための条件であって、前進を測る時計ではありません。

```yaml
agent:
  session_stall_timeout: 300   # seconds; 0 disables the watchdog
```

## 再接続の注意喚起 {#reconnect-attention-escalation}

プラットフォームのアダプターが接続に失敗すると（ネットワークの障害、失効したボットのトークン、壊れた補助プロセス）、ゲートウェイは上限つきの指数的な待ち時間で無期限に再試行します。再試行が止まることはないので、一時的な障害は担当者が動かなくても必ず自力で戻ります。難点は、*恒久的な*失敗（失効した Telegram のトークン、足りない Discord の特権インテント）が、一時的なつまずきと見分けがつかないことです。どちらも「再試行中」が永遠に続きます。

恒久的な失敗を見えるようにする仕組みが 2 つあります。

- **決定的な分類。** 例外の*型*から自力では戻れないと分かる失敗 — 拒否・失効したトークン（`telegram_auth_error`、`discord_auth_error`、`email_auth_error`）、足りない特権インテント（`discord_intents_required`）、依存関係を入れられない Photon の補助プロセス（`SIDECAR_DEPS_MISSING`）や node の実行ファイルがない場合（`SIDECAR_NODE_MISSING`） — は、再試行の列に入れず致命的として印を付けます。分類は厳密に型に基づくもので、曖昧なエラーは常に再試行を続けます。
- **要注意への引き上げ。** `agent.reconnect_attention_after`（既定 `7200` 秒 = 2 時間、`0` で無効）を超えて再試行の列に居続けたプラットフォームには、ゲートウェイの実行時の状態（`hermes status`）で `needs_attention: true` と `retrying_since` の時刻が付き、WARNING も記録されます。再試行はそのまま続きます。これは合図であって、遮断器ではありません。再接続に成功すると印は消えます。

```yaml
agent:
  reconnect_attention_after: 7200   # seconds; 0 disables the escalation flag
```

## ゲートウェイのエージェントのキャッシュ {#gateway-agent-cache}

ゲートウェイはセッションごとにエージェントを 1 つ抱えておき、会話が毎ターン、システムプロンプトを組み直す代わりにキャッシュされた前半を使い回せるようにしています。そのキャッシュされたエージェントは、セッションの記録の全体も抱えます。ツールの出力も含むので、ツールを 100 回呼んだセッションでは数十メガバイトになります。したがって、複数のプラットフォームを抱える忙しいゲートウェイでは、このキャッシュがプロセスの中でメモリをいちばん使う存在になります。

```yaml
agent:
  agent_cache:
    max_size: 128            # LRU entry cap
    idle_ttl_secs: 3600      # evict an agent idle this long
    memory_high_mb: auto     # anon-RSS budget; number, "auto", or 0/off
    max_evictions_per_pass: 16
    protect_recent: 8
```

`max_size` と `idle_ttl_secs` は、件数と時間でキャッシュを区切ります。どちらも何バイト抱えているかは知らないので、`memory_high_mb` が 3 つめの区切りを足します。ゲートウェイ自身の無名の常駐メモリが予算を超えると、いちばん長く使われていない記録から手放し、それらは次のターンで保存済みのセッションから読み直されます。ゲートウェイが他のサービスとメモリを取り合っているなら下げ、どの前半も温かいまま保ちたいなら上げてください（`0` にすればこの処理を切れます）。

`auto` は、ゲートウェイが実際に動いている環境のメモリの上限 — コンテナや systemd のユニットなら cgroup の上限、そうでなければ全体の RAM — から予算を導きます。ユニットの `MemoryMax`/`MemoryHigh` が、もう 1 つ数字を同期させなくても尊重されます。

ターンの途中のセッション、`protect_recent` で指定した直近のもの、記録をディスクへ書き終えていないセッションは、決して手放されません。手放しは、測った RSS と落としたセッションとともに WARNING で記録されます。

```
Agent cache pressure: anon RSS 6802MB over budget 6656MB — evicting 5 LRU session(s): ...
```

## コンテキストのエンジン {#context-engine}

コンテキストのエンジンは、モデルのトークンの上限に近づいたときに会話をどう扱うかを決めます。組み込みの `compressor` のエンジンは、内容の一部を捨てる要約を使います（[コンテキストの圧縮](/hermes/docs/developer-guide/context-compression-and-caching/)を参照）。プラグインのエンジンは、これを別の方式に置き換えられます。

```yaml
context:
  engine: "compressor"    # default — built-in lossy summarization
```

プラグインのエンジン（たとえば内容を捨てないコンテキスト管理の LCM）を使うには、次のようにします。

```yaml
context:
  engine: "lcm"          # must match the plugin's name
```

プラグインのエンジンが**自動で有効になることはありません**。`context.engine` にプラグインの名前を明示する必要があります。使えるエンジンは `hermes plugins` → Provider Plugins → Context Engine で見て選べます。

メモリのプラグイン向けの、これと同じ「1 つだけ選ぶ」仕組みについては[メモリのプロバイダー](/hermes/docs/user-guide/features/memory-providers/)を参照してください。

## 反復の予算 {#iteration-budget}

ツールを何度も呼ぶ込み入った作業をしていると、エージェントは反復の予算（既定 500 ターン）を使い切ることがあります。Hermes が作業の途中で圧力をかける警告を差し込むことは**ありません**。以前のビルドは予算の 70% / 90% でモデルに警告していましたが、そのせいでモデルが込み入った作業を早々に投げ出してしまうので、2026 年 4 月に取り除かれました。

代わりに、予算が本当に尽きたとき（500/500）、Hermes はまとめに入るよう求めるメッセージを 1 回だけ差し込み、最後の返答を出せるように**猶予の呼び出し**を 1 回だけ許します。その猶予の呼び出しでも文章が出てこない場合は、何を成し遂げたかをまとめるよう求めます。

```yaml
agent:
  max_turns: none              # Iterations per conversation turn (default: none = unlimited)
                               # Set a positive integer to cap; "none"/"null"/
                               # "unlimited"/"inf"/"infinity"/"infinite"/0/-1 = no limit
  api_max_retries: 3           # Retries per provider before fallback engages (default: 3)
```

`agent.max_turns` は**既定で無制限**です。ターン数の上限は解決するより多くの問題を生んだので（作業の途中で黙って打ち切られる）、そのままの Hermes は会話のターンを最後まで走らせます。上限を設けたいなら正の整数を指定してください。「制限なし」を明示したいときは、大文字小文字を問わず次のどれでも使えます: `"none"`、`"null"`、`"unlimited"`、`"infinite"`、`"infinity"`、`"inf"`、`0`、`-1`（これらは `sys.maxsize` の目印に解決されるので、ターン数でループが終わることはありません）。

`agent.api_max_retries` は、一時的なエラー（レート制限、接続断、5xx）のときに、フォールバックのプロバイダーへ切り替える**前に**、Hermes がプロバイダーの API 呼び出しを何回やり直すかを決めます。既定は `3` で、合わせて 4 回試します。[フォールバックプロバイダー](/hermes/docs/user-guide/features/fallback-providers/)を設定していて、もっと速く切り替えたいなら `0` にしてください。メインで最初の一時的なエラーが出た時点で、不安定なエンドポイントへ再試行を重ねずに控えへ渡します。

## 実時間の実行の予算 {#wall-clock-run-budget}

反復の予算とは別に、会話の実行ごとに任意の**実時間**の予算を与えられます。これは、外から厳しい上限がかかる 1 回きりの呼び出しや評価の枠組み（たとえばタスクあたり 900 秒の制限）のために作られたものです。これがないと、実質的に作業が終わっているのにタイムアウトすることがあります。最後の答えを出す 1 回の生成が足りなかったり、固まったプロバイダーの呼び出し 1 つで止まったりするからです。

```yaml
agent:
  run_budget_seconds: null     # Optional; unset/null = feature fully off (default)
```

呼び出しごとに CLI から指定することもできます。

```bash
hermes chat --run-budget 850 -q "..."
```

予算を設定すると、2 つのことが起こります。

1. **80% でのまとめの知らせ。** 予算の 80% が過ぎた時点で、Hermes は**一度だけ**知らせを差し込み（`/steer` のメッセージと同じく、いちばん新しいツールの結果に足す、キャッシュに優しいやり方で届きます）、新しい調査や検証をやめて、いま持っている状態から最終的な成果を出すようモデルに伝えます。実行ごとに最大 1 回しか働かず、既存の反復の予算のまとめの仕組みと同じ形で、繰り返し圧力をかけることはありません。
2. **期限に合わせた停滞のタイムアウト。** 暗黙のストリームなしの停滞のタイムアウト（既定の 90 秒や、推論モデルの下限、たとえば DeepSeek の推論モデルでは 600 秒）は `max(60, remaining_budget × 0.5)` で頭打ちになるので、黙って固まったプロバイダーの呼び出し 1 つが残りの実行を食い尽くすことはありません。この頭打ちはタイムアウトを*縮める*方向にしか働かず、伸ばすことはありません。明示的に設定した `stale_timeout_seconds`（プロバイダー / モデルの設定や `HERMES_API_CALL_STALE_TIMEOUT`）は常にそのまま優先されます。

この予算は `run_conversation` のターンごとです（ユーザーのメッセージごとにリセットされます）。設定しなければ機能は完全に眠ったままで、時計を読むことも、差し込むことも、タイムアウトを変えることもありません。

## 停止時の検証（コーディングの確認） {#verify-on-stop-coding-verification}

有効にすると、エージェントが作業場のコードを編集したのに新しい検証の証拠（テストの成功、ビルド、リンターなど）を出していないターンでは、Hermes は最終的な答えを受け付けず、検証するか、できない理由を述べるよう求める続きのメッセージを差し込みます。ドキュメントやマークダウン、スキルだけの編集では決して働きませんし、繰り返しには上限があるのでエージェントを閉じ込めることはありません。

```yaml
agent:
  verify_on_stop: false        # true | false | "auto" (surface-aware: on for CLI/TUI/desktop, off for messaging)
  verify_guidance: true        # Append creative-UI / clean-diff guidance to the missing-evidence nudge
  max_verify_nudges: 3         # Cap on consecutive continue nudges per turn (built-in + pre_verify hooks)
  coding_instructions: ""      # Standing project-wide coding rules appended to the coding brief
```

`verify_on_stop` は `true`（どこでも有効）、`false`（無効。既定）、`"auto"`（従来の、画面に応じた振る舞い。CLI・TUI・デスクトップといった対話的なコーディングの画面やプログラムからの呼び出しでは有効、Telegram や Discord のようなメッセージングでは、検証の語りがチャットの雑音に見えるので無効）を受け付けます。どこでも既定は無効です。新規のインストールは `false` で出荷され、設定の移行も既存のインストールでこれを切ったので、有効にするのは明示的な選択になります。`HERMES_VERIFY_ON_STOP` の環境変数を設定すると、設定の値より優先されます。

同じ場所に利用者やプラグインの方針の関門を置き、自前の検査でエージェントを進ませ続けたい場合は、[`pre_verify` フック](/hermes/docs/user-guide/features/hooks/#pre_verify)を参照してください。

## 常設の目標（`/goal`） {#standing-goals-goal}

常設の目標が有効なとき、Hermes はアシスタントの返答のたびに、それが目標を満たしているかを判定します。満たしていなければ、同じセッションへ続きの指示を戻し、目標が達成されるか、ターンの予算が尽きるか、利用者が一時停止するか消すまで作業を続けます。実際の歯止めになるのはターンの予算です。判定が失敗したときは**続ける側に倒れる**ので、不安定な判定が進行を止めることはありません。

```yaml
goals:
  max_turns: 20   # Max continuation turns before Hermes auto-pauses the goal (default: 20)
```

`max_turns` は、Hermes が目標を自動で一時停止して `/goal resume` を求めるまでに、目標が何ターン続けられるかを決めます。判定の見落とし（本当は達成しているのに続けろと言われる）や、曖昧・達成不能な目標での際限のない出費を防ぎます。機能の全体は[目標](/hermes/docs/user-guide/features/goals/)を参照してください。

### API のタイムアウト {#api-timeouts}

Hermes はストリーミング向けに複数のタイムアウトの層を持ち、加えてストリーミングを使わない呼び出しのための停滞の検出器を持ちます。停滞の検出器は、暗黙の既定のままにしている場合にだけ、ローカルのプロバイダーに合わせて自動で調整されます。

| タイムアウト | 既定 | ローカルのプロバイダー | 設定 / 環境変数 |
|---------|---------|----------------|--------------|
| ソケットの読み取りのタイムアウト | 120 秒 | 自動で 1800 秒へ | `HERMES_STREAM_READ_TIMEOUT` |
| ストリームの停滞の検出 | 180 秒 | 900 秒の上限まで引き上げ（`agent.local_stream_stale_timeout`） | `HERMES_STREAM_STALE_TIMEOUT` |
| ストリームなしの停滞の検出 | 90 秒 | 明示していなければ自動で無効 | `providers.<id>.stale_timeout_seconds` または `HERMES_API_CALL_STALE_TIMEOUT` |
| API 呼び出し（ストリームなし） | 1800 秒 | 変わりません | `providers.<id>.request_timeout_seconds` / `timeout_seconds` または `HERMES_API_TIMEOUT` |

**ソケットの読み取りのタイムアウト**は、httpx がプロバイダーからの次のデータの塊をどれだけ待つかを決めます。ローカルの LLM は、大きなコンテキストの下ごしらえに最初のトークンまで数分かかることがあるので、Hermes はローカルのエンドポイントを見つけるとこれを 30 分へ引き上げます。`HERMES_STREAM_READ_TIMEOUT` を明示した場合は、エンドポイントの判定にかかわらずその値が使われます。

**ストリームの停滞の検出**は、SSE の生存確認だけが届いて中身が来ない接続を切ります。ローカルのプロバイダー（下ごしらえの間は生存確認を送りません）では、既定は 180 秒ではなく有限の 900 秒の上限へ引き上げられます。`agent.local_stream_stale_timeout` か `HERMES_LOCAL_STREAM_STALE_TIMEOUT` の環境変数で調整できます。

**ストリームなしの停滞の検出**は、長いあいだ何も返さないストリームなしの呼び出しを切ります。既定では、Hermes は長い下ごしらえでの誤検出を避けるため、ローカルのエンドポイントではこれを無効にします。`providers.<id>.stale_timeout_seconds`、`providers.<id>.models.<model>.stale_timeout_seconds`、`HERMES_API_CALL_STALE_TIMEOUT` を明示した場合は、ローカルのエンドポイントでもその値が尊重されます。

この予算は、cron のジョブや委任されたサブエージェントがその場で走らせるものも含め、ストリームなしのすべての呼び出しを区切ります。リクエストを受け取ったあと黙り込むプロバイダー — 接続は開いたまま、バイトもエラーも来ない — は、停滞のタイムアウトで打ち切られて再試行されます。ずっと長いソケットの読み取りのタイムアウトまで（あるいは無人の cron の実行なら、外の何かがプロセスを殺すまで）ぶら下がることはありません。

## コンテキストの圧力の警告 {#context-pressure-warnings}

反復の予算の圧力とは別に、コンテキストの圧力は、会話が**まとめのしきい値** — 古いメッセージを要約する圧縮が働く地点 — にどれだけ近づいたかを追いかけます。会話が長くなってきたことを、利用者にもエージェントにも伝えます。

| 進み具合 | 段階 | 何が起きるか |
|----------|-------|-------------|
| しきい値まで **60% 以上** | 情報 | CLI は水色の進み具合のバーを表示し、ゲートウェイは案内の知らせを送ります |
| しきい値まで **85% 以上** | 警告 | CLI は太い黄色のバーを表示し、ゲートウェイはまとめが近いと警告します |

CLI では、コンテキストの圧力はツールの出力の流れの中に進み具合のバーとして現れます。

```
  ◐ context ████████████░░░░░░░░ 62% to compaction  48k threshold (50%) · approaching compaction
```

メッセージングのプラットフォームでは、素のテキストの知らせが送られます。

```
◐ Context: ████████████░░░░░░░░ 62% to compaction (threshold: 50% of window).
```

自動の圧縮を無効にしている場合、警告は代わりにコンテキストが切り詰められるかもしれないと伝えます。

コンテキストの圧力は自動で働き、設定は要りません。これは利用者に向けた知らせとしてだけ働き、メッセージの流れを変えたり、モデルのコンテキストに何かを差し込んだりはしません。

## 認証情報プールの方式 {#credential-pool-strategies}

同じプロバイダーの API キーや OAuth のトークンを複数持っているときは、持ち回りの方式を設定します。

```yaml
credential_pool_strategies:
  openrouter: round_robin    # cycle through keys evenly
  anthropic: least_used      # always pick the least-used key
```

選択肢: `fill_first`（既定）、`round_robin`、`least_used`、`random`。詳しくは[認証情報プール](/hermes/docs/user-guide/features/credential-pools/)を参照してください。

## プロンプトキャッシュ {#prompt-caching}

いま使っているプロバイダーが対応していれば、Hermes はセッションをまたぐプロンプトキャッシュを自動で有効にします。設定は要りません。

**Anthropic ネイティブ**、**OpenRouter**、**Nous Portal** 経由の Claude では、Hermes はシステムプロンプトとスキルのブロックに、1 時間の有効期限（`ttl: "1h"`）を持つ `cache_control` の区切りを付けます。新しい 1 時間のうち最初の送信は入力の正規料金ですが、同じ 1 時間のうちなら、どのセッションからの以後の送信もキャッシュから読み出す割安な料金になります。つまりシステムプロンプト、読み込んだスキルの内容、長いコンテキストの前半部分が、`hermes` のセッションをまたいでも、分かれたサブエージェントの間でも、最初の 1 時間は使い回されます。

Qwen Cloud（Alibaba DashScope）の上流はキャッシュの有効期限を 5 分で頭打ちにするので、Hermes はそこでは 5 分の区切りを使います。第三者経由の Claude のほかの経路（AWS Bedrock、Azure Foundry）は、そのプロバイダー自身のキャッシュの既定に従います。xAI Grok は、セッションに紐づく会話 ID という別の仕組みを使います。[xAI のプロンプトキャッシュ](/hermes/docs/integrations/providers/#xai-grok--responses-api--prompt-caching)を参照してください。

これを無効にするつまみはありません。キャッシュは常に有効で、1 往復だけの会話でも費用を節約します。システムプロンプトだけでも、入力のトークン数のかなりの部分を占めるからです。

明示できる唯一のつまみは、Anthropic 方式の区切りで Hermes が要求するキャッシュの有効期限の段です。

```yaml
prompt_caching:
  cache_ttl: "5m"   # "5m" or "1h" (Anthropic-supported tiers); other values are ignored
```

`cache_ttl` は、Anthropic のネイティブ API、OpenRouter、Nous Portal 経由の Claude に対して Hermes が付ける区切りの有効期限を選びます。Anthropic が対応する 2 つの段（`"5m"`、`"1h"`）だけが有効で、それ以外の値は無視されます。独自の上限を持つプロバイダー（たとえば最大 5 分の Qwen Cloud）は、上流が許す範囲へ丸められます。

## 補助モデル {#auxiliary-models}

Hermes は、画像の解析、ブラウザーのスクリーンショットの解析、セッションのタイトルの生成、コンテキストの圧縮といった脇のタスクに「補助」モデルを使います。既定（`auxiliary.*.provider: "auto"`）では、Hermes はすべての補助タスクを**メインのチャットモデル** — `hermes model` で選んだのと同じプロバイダーとモデル — に回します。使い始めに何かを設定する必要はありませんが、高価な推論モデル（Opus、MiniMax M2.7 など）では補助タスクの費用も無視できない点は覚えておいてください。メインのモデルが何であれ、脇のタスクは安く速くしたいなら、`auxiliary.<task>.provider` と `auxiliary.<task>.model` を明示してください（たとえば画像認識に OpenRouter の Gemini Flash）。（Web の抽出は補助タスクではありません。`web_extract` とブラウザーのスナップショットは長い内容を決まったやり方で切り詰め、全文を `read_file` でページ送りできるように保存します。LLM は関わりません。）

:::note なぜ "auto" がメインのモデルを使うのか
以前のビルドは、集約サービス（OpenRouter、Nous Portal）の利用者だけを、プロバイダー側の安い既定へ振り分けていました。これは意外な挙動でした。集約サービスの契約に払っている人が、補助の通信だけ別のモデルに処理されていたからです。いまは `auto` が誰にとってもメインのモデルを使い、`config.yaml` のタスクごとの上書きは変わらず優先されます（下の[補助設定の全項目](#full-auxiliary-config-reference)を参照）。
:::

### 補助モデルを対話的に設定する {#configuring-auxiliary-models-interactively}

YAML を手で書く代わりに、`hermes model` を実行してメニューから **"Configure auxiliary models"** を選んでください。タスクごとの対話的な選択画面が出ます。

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

タスクを選び、プロバイダーを選び（OAuth ならブラウザーが開き、API キー方式なら入力を求められます）、モデルを選びます。変更は `config.yaml` の `auxiliary.<task>.*` に保存されます。メインのモデルの選択画面と同じ仕組みで、新しい書き方を覚える必要はありません。

**Delegation** の項目だけは特別です。これは `delegate_task` のサブエージェントが使うモデルを決め、`auxiliary.*` ではなくトップレベルの `delegation.*` のセクション（`delegation.provider` / `delegation.model`）に保存されます。サブエージェントは脇の LLM 呼び出しではなく、まるごと 1 つの子エージェントだからです。ここでの `auto` は「親のエージェントのプロバイダー、モデル、認証情報を引き継ぐ」という意味です。

最初のやり取りのあとに Hermes がタイトルを自動生成しないようにするには、
`auxiliary.title_generation.enabled: false` を設定します。手動のタイトルは
`/title` と `hermes sessions rename` で今までどおり付けられます。

### ストリーミング専用のエンドポイント {#stream-only-endpoints}

OpenAI 互換のエンドポイントの中には、ストリーミングを使わないチャットのリクエストをはっきり拒むものがあります（たとえば Tencent Copilot は HTTP 400 と `"Non-stream chat request is currently not supported"` を返します）。対話的なチャットはもともとストリーミングですが、補助タスク（タイトル生成、圧縮、画像認識）はストリーミングなしの呼び出しを使うので、毎回失敗してしまいます。Hermes は `copilot.tencent.com` を常にストリーミング専用として扱います。ほかにそういうエンドポイントがある場合は、URL の一部を `auxiliary.stream_only_base_urls` に並べてください。

```yaml
auxiliary:
  stream_only_base_urls:
    - "my-stream-only-proxy.example.com"
```

一致した補助の呼び出しは `stream=True` で送られ、届いた塊（ツール呼び出しの差分も含みます）はクライアント側でまとめられます。ほかのエンドポイントの振る舞いは変わりません。

### 動画のチュートリアル {#video-tutorial}

[YouTube: https://www.youtube.com/embed/NoF-YajElIM](https://www.youtube.com/embed/NoF-YajElIM)

### どこでも共通の設定の型 {#the-universal-config-pattern}

Hermes のモデルの枠 — 補助タスク、圧縮、フォールバック — は、どれも同じ 3 つのつまみを使います。

| キー | 何をするか | 既定 |
|-----|-------------|---------|
| `provider` | 認証と振り分けにどのプロバイダーを使うか | `"auto"` |
| `model` | どのモデルを要求するか | プロバイダーの既定 |
| `base_url` | OpenAI 互換の独自エンドポイント（プロバイダーの指定を上書きします） | 未設定 |

補助タスクのブロックは、加えて `reasoning_effort` のつまみも受け付けます。

| キー | 何をするか | 既定 |
|-----|-------------|---------|
| `reasoning_effort` | そのタスクの LLM 呼び出しでの思考の深さ: `none`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max`、`ultra` | 未設定（プロバイダーの既定） |

これは全体設定の `agent.reasoning_effort` の、タスクごとの対応物です。メインのモデルが高価な推論モデルでも、メインのチャットの振る舞いに触れずに、圧縮を `low` で、画像認識を `none` で走らせて脇のタスクの待ち時間と費用を削れます。すべての補助タスクのブロック（`vision`、`compression`、`title_generation`、`curator`、`background_review`、…）で、3 つの補助の通信形式（chat completions、Codex Responses、Anthropic Messages）すべてにわたって働きます。同じタスクに `extra_body.reasoning` を明示した場合は、そちらがこの略記より優先されます。

例外は MoA です。Mixture-of-Agents の推論の深さは、`moa_reference`/`moa_aggregator` の補助のブロックではなく、MoA のプリセットの中で**枠ごとに**設定します（`moa.presets.<name>.reference_models[].reasoning_effort` / `aggregator.reasoning_effort`）。[Mixture of Agents](/hermes/docs/user-guide/features/mixture-of-agents/)を参照してください。

```yaml
auxiliary:
  compression:
    reasoning_effort: "low"    # summaries don't need deep thinking
  vision:
    reasoning_effort: "none"   # disable thinking for image description
```

`base_url` を設定すると、Hermes はプロバイダーを無視してそのエンドポイントを直接呼びます（認証には `api_key` か `OPENAI_API_KEY` を使います）。`provider` だけを設定した場合は、そのプロバイダーの組み込みの認証とベース URL を使います。

補助タスクで使えるプロバイダー: `auto`、`main`、それに[プロバイダーの登録簿](/hermes/docs/reference/environment-variables/)にあるもの — `openrouter`、`nous`、`openai-codex`、`copilot`、`copilot-acp`、`anthropic`、`gemini`、`qwen-oauth`、`zai`、`kimi-coding`、`kimi-coding-cn`、`minimax`、`minimax-cn`、`minimax-oauth`、`deepseek`、`nvidia`、`xai`、`xai-oauth`、`ollama-cloud`、`alibaba`、`bedrock`、`huggingface`、`arcee`、`xiaomi`、`kilocode`、`opencode-zen`、`opencode-go`、`opencode-free`、`commandcode`、`commandcode-anthropic`、`ai-gateway`、`azure-foundry` — あるいは自分の `providers:` の辞書にある名前付きの独自プロバイダー（たとえば `provider: "beans"`）。

:::tip MiniMax の OAuth
`minimax-oauth` はブラウザーでの OAuth でログインします（API キーは不要です）。`hermes model` を実行して **MiniMax (OAuth)** を選び、認証してください。補助タスクは自動的に `MiniMax-M2.7-highspeed` を使います。[MiniMax OAuth ガイド](/hermes/docs/guides/minimax-oauth/)を参照してください。
:::

:::tip xAI Grok の OAuth
`xai-oauth` は、SuperGrok と X Premium+ の契約者向けに、ブラウザーでの OAuth でログインします（API キーは不要です）。`hermes model` を実行して **xAI Grok OAuth (SuperGrok / Premium+)** を選び、認証してください。同じ OAuth のトークンは、xAI へ直接つながるすべての場面（チャット、補助タスク、TTS、画像生成、動画生成、文字起こし）で使い回されます。[xAI Grok OAuth ガイド](/hermes/docs/guides/xai-grok-oauth/)を、Hermes がリモートのホストにある場合は [SSH 越しの OAuth / リモートホスト](/hermes/docs/guides/oauth-over-ssh/)もあわせて参照してください。
:::

:::warning `"main"` は補助タスク専用です
`"main"` というプロバイダーの選択肢は「メインのエージェントが使っているプロバイダーをそのまま使う」という意味で、有効なのは `auxiliary:`、`compression:`、そしてメインのフォールバックの項目（`fallback_providers:` または旧来の `fallback_model:`）の中だけです。トップレベルの `model.provider` の値としては**使えません**。OpenAI 互換の独自エンドポイントを使うなら、`model:` のセクションで `provider: custom` を指定してください。メインのモデルのプロバイダーの選択肢は [AI プロバイダー](/hermes/docs/integrations/providers/)にすべて載っています。
:::

### 補助設定の全項目 {#full-auxiliary-config-reference}

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
補助タスクにはそれぞれ設定できる `timeout`（秒）があります。既定は画像認識 120 秒、承認 30 秒、圧縮 120 秒です。補助タスクに遅いローカルのモデルを使うなら、これらを増やしてください。画像認識には、HTTP での画像のダウンロード用に別の `download_timeout`（既定 30 秒）もあります。回線が遅い場合や、自前で立てた画像サーバーを使う場合は増やしてください。
:::

:::info
コンテキストの圧縮は、しきい値のための独自の `compression:` のブロックと、モデル / プロバイダーの設定のための `auxiliary.compression:` のブロックを持ちます。上の[コンテキストの圧縮](#context-compression)を参照してください。メインのフォールバックの連鎖は、トップレベルの `fallback_providers:` のリストを使います。[フォールバックプロバイダー](/hermes/docs/integrations/providers/#fallback-providers)を参照してください。3 つとも同じ provider/model/base_url の型に従います。
:::

### 補助タスクのタスクごとのフォールバック連鎖 {#per-task-fallback-chain-for-auxiliary-tasks}

補助タスクはそれぞれ、任意で `fallback_chain` を定義できます。これは、主たる補助のプロバイダーがレート制限、接続の問題、支払いの制限で失敗したときに Hermes が試す、プロバイダーとモデルの組み合わせの一覧です。

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

主たる補助のプロバイダー（`openrouter` / `openai/gpt-4o-mini`）がレート制限、接続のタイムアウト、支払いが必要というエラーを返すと、Hermes は `fallback_chain` を順にたどります。すでに失敗したプロバイダーと同じ項目は飛ばし、残りを 1 つずつ試して、成功するか連鎖が尽きるまで進みます。すべての控えが失敗した場合は、最後の安全網としてメインのエージェントのモデルに落ちます。

各項目は、補助タスクの設定と同じ 3 つのつまみを受け付けます。

| キー | 説明 |
|-----|-------------|
| `provider` | プロバイダー名（`nous`、`openrouter`、`anthropic`、`gemini`、`main` など） |
| `model` | そのプロバイダーでのモデル名 |
| `base_url` | （任意）OpenAI 互換の独自エンドポイント |

`fallback_chain` はどの補助タスクでも使えます — `compression`、`vision`、`approval`、`skills_hub`、`mcp` などです。

### 補助タスクの同時実行を抑える {#limiting-auxiliary-concurrency}

`max_concurrency` は、`compression` や `title_generation` といった補助タスクについて、プロセス全体で同時に走る LLM の呼び出しの数を抑えます。`auxiliary.vision.max_concurrency` は対象外です。あちらは LLM のリクエストではなく、画像の変換・縮小という CPU を使う処理の並列度だけを決めるものだからです。とくに役立つのは次のような場面です。

- 多くのセッションが同時に背景の作業を立ち上げうる（Discord / Telegram のチャンネル、複数の端末）
- プロバイダーがレート制限中か障害中で、再試行が一気に増えると事態を悪化させる

既定は無制限です。よくある安全策は `2` です。

```yaml
auxiliary:
  title_generation:
    max_concurrency: 2
  compression:
    max_concurrency: 2
```

この数の管理は、再試行やフォールバックも含めた呼び出し全体を包むので、遅い呼び出し 1 つが上限に数えられるのは 1 回だけです。

### 補助タスクでの OpenRouter の振り分けと Pareto Code {#openrouter-routing-pareto-code-for-auxiliary-tasks}

補助タスクが OpenRouter に解決されたとき（明示した場合でも、メインのエージェントが OpenRouter にいるところへ `provider: "main"` を使った場合でも）、メインのエージェントの `provider_routing` と `openrouter.min_coding_score` の設定は**引き継がれません**。設計として、補助タスクはそれぞれ独立しているからです。特定の補助タスクで OpenRouter の振り分けの好みを指定したり [Pareto Code ルーター](/hermes/docs/integrations/providers/#openrouter-pareto-code-router)を使ったりするには、タスクごとに `extra_body` で設定します。

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

この形は、OpenRouter が chat completions のリクエストの本体で受け付けるものをそのまま写したものです。Hermes は `extra_body` 全体をそのまま転送するので、[openrouter.ai/docs](https://openrouter.ai/docs) に載っているほかのリクエスト本体の項目も同じように使えます。

### 画像認識のモデルを変える {#changing-the-vision-model}

画像の解析に Gemini Flash ではなく GPT-4o を使うには、次のようにします。

```yaml
auxiliary:
  vision:
    model: "openai/gpt-4o"
```

環境変数（`~/.hermes/.env` の中）でも設定できます。

```bash
AUXILIARY_VISION_MODEL=openai/gpt-4o
```

### プロバイダーの選択肢 {#provider-options}

ここに挙げる選択肢は、**補助タスクの設定**（`auxiliary:`、`compression:`）とメインのフォールバックの項目（`fallback_providers:` または旧来の `fallback_model:`）に適用されるもので、メインの `model.provider` の設定には適用されません。

| プロバイダー | 説明 | 必要なもの |
|----------|-------------|-------------|
| `"auto"` | 使えるいちばん良いもの（既定）。画像認識は OpenRouter → Nous → Codex の順に試します。 | — |
| `"openrouter"` | OpenRouter を強制します — どのモデル（Gemini、GPT-4o、Claude など）へも振り分けられます | `OPENROUTER_API_KEY` |
| `"nous"` | Nous Portal を強制します | `hermes auth` |
| `"codex"` | Codex OAuth（ChatGPT のアカウント）を強制します。画像認識に対応します（gpt-5.3-codex）。 | `hermes model` → ChatGPT or Codex Subscription |
| `"minimax-oauth"` | MiniMax の OAuth を強制します（ブラウザーでログイン、API キー不要）。補助タスクには MiniMax-M2.7-highspeed を使います。 | `hermes model` → MiniMax (OAuth) |
| `"xai-oauth"` | xAI Grok の OAuth を強制します（SuperGrok または X Premium+ の契約者向けのブラウザーでのログイン、API キー不要）。同じ OAuth のトークンが、チャット、TTS、画像、動画、文字起こしのすべてをまかないます。 | `hermes model` → xAI Grok OAuth (SuperGrok / Premium+) |
| `"main"` | いま使っている独自 / メインのエンドポイントを使います。これは `OPENAI_BASE_URL` と `OPENAI_API_KEY` から来ることも、`hermes model` / `config.yaml` で保存した独自エンドポイントから来ることもあります。OpenAI、ローカルのモデル、OpenAI 互換の API のどれでも動きます。**補助タスク専用で、`model.provider` には使えません。** | 独自エンドポイントの認証情報とベース URL |

メインのプロバイダーの一覧にある、API キーを直接使うプロバイダーも、脇のタスクを既定のルーターから外したいときにはここで使えます。たとえば `GMI_API_KEY` を設定してあれば `gmi` が、`FIREWORKS_API_KEY` を設定してあれば `fireworks` が使えます。

```yaml
auxiliary:
  compression:
    provider: "gmi"
    model: "anthropic/claude-opus-4.6"
```

GMI へ補助タスクを回すときは、GMI の `/v1/models` エンドポイントが返すモデル ID をそのまま使ってください。Fireworks のモデル ID は、`accounts/fireworks/models/glm-5p2` のようにスラッシュ区切りの独自の形です。

### よくある構成 {#common-setups}

**独自エンドポイントを直接使う**（ローカル / 自前の API では `provider: "main"` よりはっきりします）:
```yaml
auxiliary:
  vision:
    base_url: "http://localhost:1234/v1"
    api_key: "local-key"
    model: "qwen2.5-vl"
```

`base_url` は `provider` より優先されるので、補助タスクを特定のエンドポイントへ回すいちばん明確な方法です。エンドポイントを直接指定した場合、Hermes は設定した `api_key` を使い、なければ `OPENAI_API_KEY` に落ちます。その独自エンドポイントに `OPENROUTER_API_KEY` を流用することはありません。

**画像認識に OpenAI の API キーを使う:**
```yaml
# In ~/.hermes/.env:
# OPENAI_BASE_URL=https://api.openai.com/v1
# OPENAI_API_KEY=sk-...

auxiliary:
  vision:
    provider: "main"
    model: "gpt-4o"       # or "gpt-4o-mini" for cheaper
```

**画像認識に OpenRouter を使う**（どのモデルへも振り分けられます）:
```yaml
auxiliary:
  vision:
    provider: "openrouter"
    model: "openai/gpt-4o"      # or "google/gemini-2.5-flash", etc.
```

**Codex の OAuth を使う**（ChatGPT の Pro / Plus のアカウント。API キーは不要）:
```yaml
auxiliary:
  vision:
    provider: "codex"     # uses your ChatGPT OAuth token
    # model defaults to gpt-5.3-codex (supports vision)
```

**MiniMax の OAuth を使う**（ブラウザーでログイン、API キー不要）:
```yaml
model:
  default: MiniMax-M2.7
  provider: minimax-oauth
  base_url: https://api.minimax.io/anthropic
```
`hermes model` を実行して **MiniMax (OAuth)** を選ぶと、ログインとこの設定が自動で済みます。中国のリージョンでは、ベース URL が `https://api.minimaxi.com/anthropic` になります。手順の全体は [MiniMax OAuth ガイド](/hermes/docs/guides/minimax-oauth/)を参照してください。

**ローカル / 自前のモデルを使う:**
```yaml
auxiliary:
  vision:
    provider: "main"      # uses your active custom endpoint
    model: "my-local-model"
```

`provider: "main"` は、Hermes が通常のチャットで使っているプロバイダーをそのまま使います。名前付きの独自プロバイダー（たとえば `beans`）でも、`openrouter` のような組み込みのプロバイダーでも、旧来の `OPENAI_BASE_URL` のエンドポイントでもかまいません。

:::tip
Codex の OAuth をメインのモデルのプロバイダーにしているなら、画像認識は自動で動きます。追加の設定は要りません。Codex は画像認識の自動判定の連鎖に含まれています。
:::

:::warning
**画像認識にはマルチモーダルのモデルが必要です。** `provider: "main"` を設定する場合は、そのエンドポイントがマルチモーダル / 画像に対応しているか確かめてください。そうでないと画像の解析は失敗します。
:::

### 環境変数（旧来の方法） {#environment-variables-legacy}

補助モデルは環境変数でも設定できます。ただし `config.yaml` のほうが望ましい方法です。管理しやすく、`base_url` や `api_key` を含むすべての選択肢に対応しているからです。

| 設定 | 環境変数 |
|---------|---------------------|
| 画像認識のプロバイダー | `AUXILIARY_VISION_PROVIDER` |
| 画像認識のモデル | `AUXILIARY_VISION_MODEL` |
| 画像認識のエンドポイント | `AUXILIARY_VISION_BASE_URL` |
| 画像認識の API キー | `AUXILIARY_VISION_API_KEY` |

圧縮とフォールバックのモデルの設定は config.yaml だけです。（`AUXILIARY_WEB_EXTRACT_*` の変数は使われなくなりました。Web の抽出はもう補助の LLM を使いません。）

:::tip
いまの補助モデルの設定は `hermes config` で見られます。上書きは、既定と違うときだけ表示されます。
:::

## 推論の深さ {#reasoning-effort}

答える前にモデルがどれだけ「考える」かを制御します。

```yaml
agent:
  reasoning_effort: ""   # empty = medium. Options: none, minimal, low, medium, high, xhigh, max, ultra
```

未設定のとき（既定）、推論の深さは "medium" になります。ほとんどの作業でうまく働く、つり合いの取れた水準です。値を設定すればそれが優先されます。深くするほど込み入った作業での結果は良くなりますが、トークンと待ち時間が増えます。

:::note OpenRouter 経由の、思考を自分で調整するモデル（Claude 4.6 以降、Fable/Mythos 系）
これらのモデルは*自分で調整する*思考を使い、いつもの `reasoning.effort`
の項目を受け付けません。OpenRouter もそれらには無視します。Hermes は
`reasoning_effort` を OpenRouter の `verbosity` のパラメーター（Anthropic の
`output_config.effort` に対応します）へ透過的に回すので、選んだモデルが対応する水準の範囲で、同じつまみが使えます。`none`（または未設定）にすると、モデルは自分の既定の調整に任されます。
Anthropic のネイティブのプロバイダーはもともと深さを直接制御しており、影響を受けません。
:::

:::note OpenRouter のモデルと対応する深さ
OpenRouter を通るほかのモデルについては、Hermes が最新のモデルの一覧の推論のメタデータ
（`supported_parameters` とモデルごとの
`reasoning.supported_efforts`）を読み、推論の指定を送るかどうかを決め、要求された深さをその経路が実際に対応するいちばん近い水準へ丸めます（常に下向きです。たとえば `high` までしかない経路では `ultra` は `high` になり、黙って上がることはありません）。推論に対応した新しい提供元も、Hermes の更新を待たずに自動で使えます。一覧に届かないときや、モデルが載っていないときは、Hermes は組み込みのモデルの系統の一覧に落ち、指定した深さをそのまま渡します。
:::

推論の深さは、`/reasoning` のコマンドで実行中に変えることもできます。

```
/reasoning                # Show current effort level and display state
/reasoning high           # Set reasoning effort to high (this session only)
/reasoning high --global  # Set effort and persist to config.yaml
/reasoning none           # Disable reasoning (this session only)
/reasoning show           # Show model thinking above each response
/reasoning hide           # Hide model thinking
```

深さの変更は、既定ではそのセッションだけに効きます。新しい水準を
`agent.reasoning_effort` の既定として保存するには `--global` を付けてください。

#### モデルごとの推論の上書き {#per-model-reasoning-overrides}

モデルごとに別々の推論の深さを設定できます。込み入ったモデルでは深く考えさせ、速いモデルでは中くらいにしたいときに便利です。

```yaml
agent:
  reasoning_effort: "medium"       # global default
  reasoning_overrides:
    "openrouter/anthropic/claude-opus-4.5": "xhigh"
    "openai/gpt-5": "low"
    "claude-sonnet-4.6": "high"    # bare model name also works
```

キーの照合は**表記の揺れに寛容**で、まっとうな書き方ならどれでも一致します。
- `claude-opus-4.5`、`claude-opus-4-5`、`claude-opus.4.5`（ドットとダッシュは互換です）
- `anthropic/claude-opus-4.5`、`openrouter/anthropic/claude-opus-4.5`（プロバイダーの接頭辞は任意です）
- 完全一致が変種より優先されます

:::note
`reasoning_overrides` のキーは `hermes config set` に対応していません。YAML のファイルを直接編集してください。モデル名にはドットが入ることが多く（たとえば `claude-opus-4.5`）、CLI のドット区切りのキーの書き方と衝突するためです。
:::

**解決の優先順位:**

1. セッション単位の `/reasoning --session` の上書き（ゲートウェイのみ）
2. `agent.reasoning_overrides` のモデルごとの上書き（表記の揺れに寛容）
3. 全体の `agent.reasoning_effort`
4. プロバイダーの既定

この上書きはどこでも自動で効きます。CLI の起動、メッセージングのゲートウェイ、デスクトップ / TUI、cron のジョブ、`/model` によるセッション途中の切り替え、フォールバックのモデルの発動のいずれでもです。

## ツール利用の強制 {#tool-use-enforcement}

モデルによっては、ツールを呼ぶ代わりに、やろうとしている行動を文章で述べてしまうことがあります（実際に端末を呼ばずに「テストを実行します…」と書くなど）。ツール利用の強制は、実際にツールを呼ぶ方へモデルを引き戻す案内をシステムプロンプトへ差し込みます。

```yaml
agent:
  tool_use_enforcement: "auto"   # "auto" | true | false | ["model-substring", ...]
```

| 値 | 振る舞い |
|-------|----------|
| `"auto"`（既定） | 次に当てはまるモデルで有効: `gpt`、`codex`、`gemini`、`gemma`、`grok`、`glm`、`qwen`、`deepseek`。それ以外（たとえば Claude）では無効です。 |
| `true` | モデルにかかわらず常に有効。いま使っているモデルが、行動する代わりに述べてばかりだと気づいたときに役立ちます。 |
| `false` | モデルにかかわらず常に無効。 |
| `["gpt", "codex", "qwen", "llama"]` | モデル名に、挙げた文字列のどれかが含まれるときだけ有効（大文字小文字は問いません）。 |

### 何が差し込まれるのか {#what-it-injects}

有効なとき、システムプロンプトに 2 つの層の案内が足されることがあります。

1. **一般的なツール利用の強制**（当てはまるすべてのモデル） — 意図を述べる代わりにすぐツールを呼ぶこと、作業が終わるまで続けること、将来の行動の約束でターンを終えないことを指示します。

2. **Google 向けの運用の案内**（Gemini と Gemma のモデルのみ） — 簡潔さ、絶対パス、並列のツール呼び出し、編集の前に確認する型についてです。

これらは利用者からは見えず、システムプロンプトにだけ影響します。すでに確実にツールを使うモデル（Claude など）にはこの案内が要らないので、`"auto"` はそれらを外しています。

### いつ有効にするか {#when-to-turn-it-on}

既定の自動の一覧にないモデルを使っていて、*やろうとしている*ことばかり述べて実行しないと感じたら、`tool_use_enforcement: true` にするか、モデル名の一部を一覧に足してください。

```yaml
agent:
  tool_use_enforcement: ["gpt", "codex", "gemini", "grok", "my-custom-model"]
```

## 実行の規律の案内 {#execution-discipline-guidance}

ツール利用の強制とは別に、Hermes は評価の記録で見られた一連のエージェントの失敗の型を共有するモデルの系統に向けて、**実行の規律**のブロックを差し込みます。コードではなく文章の中で計算する、外部への書き込みのあとに読み返して確かめない、形の崩れた識別子を「直して」しまう、件数が合わないのに揃っていると言い張る、受け入れ条件をすべて確かめずに「完了」と宣言する、といった型です。

```yaml
agent:
  execution_guidance: "auto"   # "auto" | true | false | ["model-substring", ...]
```

| 値 | 振る舞い |
|-------|----------|
| `"auto"`（既定） | 次に当てはまるモデルで有効: `gpt`、`codex`、`grok`、`deepseek`、`kimi`、`qwen`、`glm`、`minimax`、`mimo`、`mistral`。 |
| `true` | モデルにかかわらず常に有効。 |
| `false` | モデルにかかわらず常に無効。 |
| `["deepseek", "my-custom-model"]` | モデル名に、挙げた文字列のどれかが含まれるときだけ有効（大文字小文字は問いません）。 |

差し込まれるブロックが扱うのは次の内容です。

- **ツールを使い続けること** — 作業が終わり、*しかも*確かめられるまでツールを呼び続けること。空の結果、部分的な結果、妙に狭い検索の結果は、結論を出す前に広い、あるいは別の問い方でやり直すこと。
- **ツールを必ず使うこと** — 計算、ハッシュ、日付、システムの状態、ファイルの事実は、頭の中ではなく必ずツールから得ること。
- **外部への書き込みの読み返し** — 外部のシステムの状態を変える書き込みのあとは、成功と言う前に対象そのものを読み返すこと（ツールがすでに確認した内部のファイルの編集は、改めて確かめません）。
- **件数の突き合わせ** — 宣言された合計（`total`、`reply_count`、`has_more`）は強い主張です。食い違ったら取り直すか、プログラムで解析し直すこと。
- **そのまま保つこと** — 定められた形式に合わない識別子を、正規化したり「直したり」しないこと。検索が成功したからといって、崩れた元の文字列が正しかったことにはなりません。
- **確認を経た完了** — 「完了」とは、名前の挙がった受け入れ条件をすべて確かめたということであって、もっともらしい一部ではありません。

この関門は `tool_use_enforcement` とは独立していて、どちらか一方だけを有効にできます。案内はセッションの開始時にモデル名から一度だけ決まるので、会話の一生を通じてシステムプロンプトはバイト単位で変わりません（プロンプトキャッシュにも優しい形です）。Gemini / Gemma が自動の一覧から外れているのは、より具体的な Google 向けの運用の案内を受け取るからです。Claude が外れているのは、これらの失敗の型を示さないからです。どのモデルも `true` か文字列の一覧で加えられます。

## ツールのループへの歯止め {#tool-loop-guardrails}

Hermes は、エージェントが実りのないツール呼び出しのループに陥ったことを見つけます。同じ呼び出しが繰り返し失敗する、同じツールが何度も失敗する、何度呼んでも同じ結果で前に進まない、といった状況です。既定では、モデルが自分で立ち直れるようにツールの結果へ**警告**を差し込むだけで、強制的には止めません。CLI / TUI を見ている人が手を出せるからです。

無人のゲートウェイ / サーバーでの運用では、反復の予算を燃やす代わりに、詰まったエージェントを遮断できるように強制停止を有効にしてください。

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

`hard_stop_enabled` が `false` を既定にしているのは、対話的なセッションには人が付いているからです。無人での運用（ゲートウェイ、cron、かんばんの作業役）では `true` にして、繰り返す失敗を警告だけでなく遮断してください。[Docker / 無人での運用](/hermes/docs/user-guide/docker/)もあわせて参照してください。

### ターンごとの暴走への上限 {#per-turn-runaway-loop-caps}

上の失敗に基づくしきい値とは別に、`loop_caps` は 1 回のエージェントのループ（ターン）で許す `web_search` の呼び出しとサブエージェントの起動の数に、はっきりした上限を設けます。数え上げはターンのはじめにリセットされるので、まっとうな複数ターンのセッションが痩せることはありません。しかし、際限のない検索や委任のループに落ちた 1 つのターンは止まります。これは常に有効で、`hard_stop_enabled` にかかわらず働きます。1 つのターンで数十回の Web 検索をしたり、数十のサブエージェントを起動したりするのはすでに異常なので、既定は低くしてあります。上限に達すると、その呼び出しは説明つきで遮断され、残りの予算を燃やさずにターンがきれいに終わります。どちらの値も `0` にすれば、その上限を完全に無効にできます。

1 回の `delegate_task` のまとまりは、その中のタスクをそれぞれ `max_subagents` に数えます（3 つのまとまりは 3 を使います）。上限は `delegate_task` の呼び出し回数ではなく、実際に起動したサブエージェントの数を追いかけます。

これは Claude Code のセッションごとの WebSearch とサブエージェントの上限（v2.1.212）を写したもので、あちらも既定は 200 で、`/clear` でリセットされます。

### 実行時の停滞防止の見張り {#runtime-anti-stall-guards}

上の失敗に基づく歯止めを補うものとして、`agent.stall_guards`（既定 `true`）は、無駄なターンを防ぐ控えめな実行時の見張りを 2 つ有効にします。1 つめは**同じ呼び出しのループの遮断**です。同じツールがまったく同じ引数で 3 回以上続けて呼ばれ、*しかも*まったく同じ結果を返したとき、そのツールの結果に短い 1 行が足され、同じ呼び出しを繰り返さないようモデルに伝えます。呼び出し自体を遮ることはありませんし、繰り返すのが当たり前の状態確認（`process`、`*_get_result`、`*_poll`）は対象外です。2 つめは**続ける意図からの立て直し**です。モデルがツールを呼ばずにターンを終え、しかも短い返事が行動を予告して途切れているとき（「では、ファイルを更新します…」）、Hermes は意図の確認からの立て直しに使うのと同じ、上限つきの続きの仕組みで、実行するよう促し直します（ターンあたり最大 2 回）。どちらもキャッシュに優しく（断りは結果を組み立てるときに足され、あとから遡って書き換えることはありません）、まとめて無効にできます。

```yaml
agent:
  stall_guards: false
```

同じ関門は**結果の参照による差し替え**も有効にします。まったく同じツール呼び出しをやり直して、バイト単位で同じ新しい結果が返ってきたとき、重複した内容は全文を繰り返す代わりに、先の結果を指す短い参照（ツール名、`tool_call_id`、引数の要約、そして最初の結果がディスクへ保存されていればそのあふれ出しのパス）としてコンテキストに入ります。ツールは毎回きちんと実行されるので、状態確認の意味は保たれます。結果が変わったときは、いつでも全文が流れます。512 文字未満の結果、エラーの結果、マルチモーダルの結果が差し替えられることはありません。状態確認は差し替えの*対象になります*（変わらない状態確認こそ、重複した内容が何の情報も運ばない場面だからです）。

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

これは `text_to_speech` のツールと、音声モード（CLI やメッセージングゲートウェイの `/voice tts`）での読み上げの両方を制御します。

**速さの決まり方:** プロバイダーごとの速さ（たとえば `tts.edge.speed`） → 全体の `tts.speed` → 既定の `1.0`。すべてのプロバイダーで同じ速さにしたいなら全体の `tts.speed` を設定し、細かく調整したいならプロバイダーごとに上書きしてください。

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
  file_mutation_verifier: true    # Append an advisory footer when write_file/patch calls failed this turn
  credits_notices: true   # Nous credits status-bar notices (usage bands, grant-spent, depleted). false = silence them; /usage still works
  cli_rebuild_scrollback_on_redraw: false  # Classic CLI: also wipe terminal scrollback (CSI 3J) on /redraw / Ctrl+L / width-change resize recovery. Enable when a terminal/tmux stack stamps stale prompt chrome into scrollback on maximize/restore.
  language: en            # UI language for static messages (approval prompts, some gateway replies). en | zh | zh-hant | ja | de | es | fr | tr | uk | af | ko | it | ga | pt | ru | hu
```

### ターンごとのまとめとスピナーのトークンの流れ {#per-turn-summary-and-spinner-token-flow}

`display.turn_summary`（既定 `true`）は、**対話的な CLI** のターンごとに、そのターンが実際に何をしたかをまとめた薄い 1 行を表示します。

```
⋯ 12.4s · edited 2 files +18 -3 · read 4 files · ran 3 commands
```

集計は、CLI がもともと受け取っているツールの進み具合の流れから読み取るので、余分な費用はかかりません。細かい点は次のとおりです。

- 時間はそのターンの実際の長さです（1 分を超えると `2m05s` のようになります）。
- ツールの呼び出しは動詞（`edited`、`read`、`ran`、`searched`、…）でまとめられ、複数形も正しく付きます。ふさわしい動詞のないプラグインや MCP のツールは `called N tools` にまとまります。
- `+X -Y` の行数の差は、ツールの結果がすでに差分を報告している場合（いまは `patch`）にだけ出ます。Hermes がそれを求めて git を呼ぶことはないので、`write_file` の編集は差分なしで数えられます。
- **失敗したツールの呼び出しは数えません。** 拒否された書き込みが、成功した編集として表示されることはありません（補い合う警告については[ファイル変更の検証](#file-mutation-verifier)を参照）。
- 長いターンは動詞 4 つと `+N more` の末尾で打ち切られるので、行が折り返すことはありません。
- ツールを呼ばなかった短いターンでは、何も表示されません。

`display.spinner_token_flow`（既定 `true`）は、CLI のスピナーの時計に、そのターンの累計の出力トークンを添えます。

```
  ⚡ Reading cli.py  (  2.3s · ↓ 1.2k tok)
```

数はターンごとです（セッションの合計はターンのはじめを基準に引き直されます）。ターンの中の API 呼び出しが使用量を報告するたびに更新されます。最初の使用量の報告が届くまでは何も表示されないので、紛らわしい `↓ 0 tok` を見ることはありません。

どちらのキーも表示だけのもので、CLI 専用です。静かなモード、`display.tool_progress` が `off` のとき、1 回きりの問い合わせや `-Q` のまとめ実行、ゲートウェイやメッセージングの画面では抑えられます（そちらは代わりに `display.runtime_footer` を使います）。どちらも `false` にすれば切れます。

### ファイル変更の検証 {#file-mutation-verifier}

`display.file_mutation_verifier` が `true`（既定）のとき、そのターンで `write_file` や `patch` の呼び出しが失敗し、同じパスへの書き込みの成功でそれが上書きされなかった場合、Hermes はアシスタントの最終的な返答に 1 行の注意を足します。「並列の修正をまとめて出し、半分が黙って失敗し、モデルは成功したとまとめる」という種類の言い過ぎを、編集のたびに手で `git status` を打たなくても捕まえられます。

末尾に付く例:

```
⚠️ File-mutation verifier: 3 file(s) were NOT modified this turn despite any wording above that may suggest otherwise. Run `git status` or `read_file` to confirm.
  • concepts/automatic-organization.md — [patch] Could not find match for old_string
  • concepts/lora.md — [patch] Could not find match for old_string
  • concepts/rag-pipeline.md — [patch] Could not find match for old_string
```

この行を抑えるには `file_mutation_verifier: false`（または `HERMES_FILE_MUTATION_VERIFIER=0`）にします。この検証は、ターンの終わりに本当に失敗が残っているときだけ働きます。失敗した修正を同じターンの中でやり直して成功したモデルは、そのファイルについて引っかかりません。

**モデルのまとめよりこの検証を信じてください。** この行が出たということは、たとえアシスタントの締めの言葉が完了したと言っていても、挙げられたファイルはディスク上で**変わっていない**ということです。よくある原因は次のとおりです。

- **書き込みの拒否** — パスが認証情報の禁止一覧にあるか、`HERMES_WRITE_SAFE_ROOT` の外です（[ファイル書き込みの安全策](/hermes/docs/user-guide/security/#file-write-safety)を参照）
- **修正の不一致** — `old_string` がディスク上のファイルと一致しませんでした
- **構文の関門** — 書き込みの前に、候補の内容が JSON/YAML/TOML の検査に落ちました

書き込みが遮られたときに付く例:

```
⚠️ File-mutation verifier: 2 file(s) were NOT modified this turn despite any wording above that may suggest otherwise. Run `git status` or `read_file` to confirm.
  • ~/.hermes/cron/jobs.json — [patch] Write denied: '…' is outside HERMES_WRITE_SAFE_ROOT (/path/to/project)
  • ~/.hermes/scripts/monitor.py — [write_file] Write denied: '…' is outside HERMES_WRITE_SAFE_ROOT (/path/to/project)
```

Hermes の状態（cron のジョブ、スキル、`~/.hermes/` の下のスクリプト）への書き込みが失敗しているなら、環境で `HERMES_WRITE_SAFE_ROOT` が設定されていないか確かめてください。cron の変更には、`jobs.json` を直接いじるのではなく `cronjob` のツールか `hermes cron edit` を使ってください。

### 定型メッセージの表示言語 {#ui-language-for-static-messages}

`display.language` の設定は、利用者に見える定型のメッセージのごく一部 — CLI の承認の確認、ゲートウェイのスラッシュコマンドのいくつかの返答（停止の予告、「承認の期限が切れました」、「目標を消しました」など） — を翻訳します。エージェントの返答、ログの行、ツールの出力、エラーの記録、スラッシュコマンドの説明を訳すことは**ありません**。それらは英語のままです。エージェント自身に別の言語で答えてほしいなら、指示やシステムメッセージでそう伝えてください。

使える値: `en`（既定）、`zh`（簡体字中国語）、`zh-hant`（繁体字中国語）、`ja`（日本語）、`de`（ドイツ語）、`es`（スペイン語）、`fr`（フランス語）、`tr`（トルコ語）、`uk`（ウクライナ語）、`af`（アフリカーンス語）、`ko`（韓国語）、`it`（イタリア語）、`ga`（アイルランド語）、`pt`（ポルトガル語）、`ru`（ロシア語）、`hu`（ハンガリー語）。知らない値は英語になります。

`HERMES_LANGUAGE` の環境変数でセッションごとに指定することもでき、こちらが設定の値より優先されます。

```yaml
display:
  language: zh   # CLI approval prompts appear in Chinese
```

| モード | 見えるもの |
|------|-------------|
| `off` | 静か — 最終的な返答だけ |
| `new` | ツールが変わったときだけ、その印を出します |
| `all` | すべてのツールの呼び出しを短い抜粋つきで（既定） |
| `verbose` | 引数、結果、デバッグのログをすべて |

CLI では、`/verbose` でこれらのモードを順に切り替えられます。メッセージングのプラットフォーム（Telegram、Discord、Slack など）で `/verbose` を使うには、上の `display` のセクションで `tool_progress_command: true` を設定してください。すると、そのコマンドがモードを切り替えて設定に保存します。

ツールの進み具合の表示には、それを安全に出せるゲートウェイのアダプターが要ります。Signal をはじめ、メッセージの編集に対応しないプラットフォームでは、`/verbose` が `off` 以外のモードを保存しても、進み具合の吹き出しは抑えられます。

### 集中表示（`/focus`、CLI と TUI） {#focus-view-focus-cli-tui}

`display.focus_view: true` は**集中表示**を有効にします。実況ではなく答えだけが欲しいときのための、出力を抑えた表示のモードです。これは 2 つめの抑制の経路ではなく、同じ `tool_progress` の仕組みの上の薄い層です。

- 有効にすると `tool_progress` が `off` に固定され、それまでのモードは `display.focus_saved_tool_progress` に控えられます
- `/focus off` はそのモードをそのまま戻すので、`/verbose verbose` の状態も往復して生き残ります
- 終わったターンごとに、薄い立て直しの行 — `⋯ 7 tool lines hidden · /focus off to show` — が出ます。数えるのは*集中表示に入る前の*モードを基準にしているので、もともと切ってあった行を隠したと言い張ることはありません
- 状態の欄には `◉ focus` の印がずっと出ます（prompt_toolkit の CLI でも Ink の TUI でも）。抑えたモードが見えないままにならないようにするためです
- 集中表示のあいだに `/verbose` を切り替えると、モードは `/verbose` に戻り、印は消えます

集中表示は**表示だけ**のものです。会話の履歴、システムプロンプト、ツールのスキーマ、リクエストの中身を書き換えることはありません。隠れた細部は画面で抑えられるだけで、捨てられてはいませんし、プロンプトキャッシュにもまったく影響しません。

### 実行時のメタデータの脚注（ゲートウェイのみ） {#runtime-metadata-footer-gateway-only}

`display.runtime_footer.enabled: true` のとき、Hermes はゲートウェイのターンごとに、**最後の**メッセージへ小さな実行時の脚注を足します。いまのところ、モデル、コンテキストの使用率、現在の作業ディレクトリを出せます。既定は無効です。すべての返答にこの出どころを載せたいチームは、ゲートウェイごとに有効にしてください。

```yaml
display:
  runtime_footer:
    enabled: true
    fields: ["model", "context_pct", "cwd"]   # order shown; drop any to hide
```

使える項目:

| 項目 | 表示されるもの | 例 |
| --- | --- | --- |
| `model` | 提供元の接頭辞を落とした素のモデル id | `gpt-5.4` |
| `context_pct` | 直近の呼び出しでのコンテキストの占有率 | `5%` |
| `latency` | そのターンの実時間 | `22s`、`1m05s` |
| `cwd` | ホームからの相対の作業ディレクトリ | `~` |

既定の項目は `["model", "context_pct", "cwd"]` です。`latency` は自分で選ぶもので、使うには `fields` に足してください。データが取れない項目は、空の枠を出さずに黙って飛ばされます。

`/footer` のスラッシュコマンドで、どのセッションでも実行中に切り替えられます。

Telegram / Discord / Slack の返答に付く脚注の例:

```
— claude-opus-4.7 · 12 tool calls · 2m 14s · $0.042
```

脚注が付くのはターンの**最後の**メッセージだけで、途中の更新はきれいなままです。

### プラットフォームごとの進み具合の上書き {#per-platform-progress-overrides}

プラットフォームによって、必要な詳しさは違います。`display.platforms` でプラットフォームごとのモードを設定してください。

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

上書きのないプラットフォームは、全体の `tool_progress` の値になります。使えるプラットフォームのキーは `telegram`、`discord`、`slack`、`signal`、`whatsapp`、`matrix`、`mattermost`、`email`、`sms`、`homeassistant`、`dingtalk`、`feishu`、`wecom`、`weixin`、`bluebubbles`、`qqbot` です。旧来の `display.tool_progress_overrides` のキーも後方互換のために読み込まれますが、非推奨で、最初の読み込み時に `display.platforms` へ移されます。

Signal が使えるキーとして挙がっているのは、プラットフォームごとに設定を保存できるからですが、いまの Signal のアダプターは送ったメッセージを編集できず、進み具合の吹き出しも出しません。Signal の `tool_progress` は `off` のままにして、ツールの呼び出しを逐一見たいなら CLI か、編集のできるメッセージングのプラットフォームを使ってください。

`interim_assistant_messages` はゲートウェイ専用です。有効にすると、Hermes はターンの途中で仕上がったアシスタントの更新を、別のチャットのメッセージとして送ります。これは `tool_progress` とは独立していて、ゲートウェイのストリーミングも要りません。

`show_commentary`（既定 `true`）は、Codex Responses のモデルの解説の経路 — これらのモデルが自分の内なる推論と並べて作る、整った進み具合の語り — を制御します。有効なとき、仕上がった解説はターンの途中の見える更新として届きます（ゲートウェイでは `interim_assistant_messages` も必要です）。余分な語りが煩わしいなら `false` にしてください。解説は推論の経路へ戻り、`show_reasoning` が有効なときだけ表示されます。

## プライバシー {#privacy}

```yaml
privacy:
  redact_pii: false  # Strip PII from LLM context (gateway only)
```

`redact_pii` が `true` のとき、ゲートウェイは対応するプラットフォームで、LLM へ送る前にシステムプロンプトから個人を特定できる情報を伏せます。

| 項目 | 扱い |
|-------|-------|
| 電話番号（WhatsApp / Signal の利用者 ID） | `user_<12-char-sha256>` にハッシュ化 |
| 利用者の ID | `user_<12-char-sha256>` にハッシュ化 |
| チャットの ID | 数字の部分をハッシュ化し、プラットフォームの接頭辞は残します（`telegram:<hash>`） |
| ホームのチャンネルの ID | 数字の部分をハッシュ化 |
| 利用者の名前 / ユーザー名 | **影響しません**（本人が選んだもので、公に見えています） |

**対応するプラットフォーム:** 伏せる処理が働くのは WhatsApp、Signal、Telegram です。Discord と Slack は対象外です。メンションの仕組み（`<@user_id>`）が、LLM のコンテキストに本物の ID を必要とするからです。

ハッシュは決まった値になるので、同じ利用者は常に同じハッシュになり、グループのチャットでもモデルは利用者を区別できます。振り分けと配信には、内部で元の値が使われます。

### OpenAI Codex のリクエストの名乗り {#openai-codex-request-identity}

OpenAI は、第三者の Codex の実行環境に自分の名乗りを求めています。
公式の Codex のエンドポイントへの、ChatGPT で認証したリクエストは自動的に
`originator: hermes-agent` と `User-Agent: HermesAgent/<version>` を送ります。
既存の ChatGPT のアカウントのヘッダーはそのまま残ります。プロンプトの内容や計測のためのリクエストが余分に送られることはありません。
OpenAI の API を直接使う場合と、独自のプロキシのエンドポイントは変わりません。

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

言語の決まり方は**すべての** STT のプロバイダー（local、groq、openai、mistral、xai、elevenlabs、deepinfra、コマンド型のプロバイダー、プラグイン）で同じです: `stt.<provider>.language` → `stt.language` → `HERMES_LOCAL_STT_LANGUAGE` の環境変数 → プロバイダーの自動判定。**既定は `stt.language: "en"` です。** Whisper の自動判定は短い音声や訛りのある音声をよく取り違え、それが「音声メモが違う言語で書き起こされる」という形で現れるからです。英語以外を話す人は、`stt.language` に自分の言語のコードを一度設定してください（たとえば `"es"`、`"zh"`、`"uk"`）。多言語で使いたいときは `""` にすると自動判定に戻ります。

音声メモをエージェントのために書き起こしても、生の書き起こしをチャットへ返してはいけない場合（たとえば顧客と話す WhatsApp のボット）は、`stt.echo_transcripts: false` を設定してください。

プロバイダーごとの振る舞い:

- `local` は自分の機材で動く `faster-whisper` を使います。`pip install faster-whisper` で別に入れてください。無音からの作り話への備えは既定で有効です。Silero の VAD の絞り込みが、無音や雑音を Whisper へ届かせず、窓をまたぐ条件付けは無効にされ、モデル自身が「たぶん発話ではない」と印を付け、*しかも*自信の低い区間は捨てられます。発話以外の音（音楽、環境音）をそのまま書き起こしたいときは `stt.local.vad: false` にしてください。モデルは音声メッセージの間もメモリに載ったままで、待ち時間を短くします。放置されたときにモデルを解放したいなら `stt.local.unload_after_idle_seconds`（たとえば 5 分なら `300`）を設定してください。CUDA のホストでは GPU のメモリが空きます（ローカルの LLM が同じ GPU を使っているときの主な利点です）。CPU では、そのメモリはプロセスから再び使えるようになりますが、OS から見た使用量は、プロセスが別の用途でその領域を必要とするまで縮まないことがあります。次の音声メッセージでモデルは自動で読み込み直されます。
- `groq` は Groq の Whisper 互換のエンドポイントを使い、`GROQ_API_KEY` を読みます。自動判定を飛ばして待ち時間を減らすには、`stt.groq.language`（または全体の `HERMES_LOCAL_STT_LANGUAGE` の環境変数）を渡してください。
- `openai` は OpenAI の音声の API を使い、`VOICE_TOOLS_OPENAI_KEY` を読みます。

クラウドのプロバイダー（groq、openai、mistral、xai、elevenlabs、deepinfra）では、`ffmpeg` が入っていれば既定で**送信前に無音を切り詰め**ます。音声メモの長い間は、ファイルを送る前にこちら側で詰められ、自然な間合いが残るように各所で `cloud_trim_keep_ms` だけは残されます。音声が短くなれば、送信は速く、1 分あたりの課金は軽く、遠くのモデルが無音から作り話をすることも減ります。12 秒未満の音声は切り詰めをまるごと飛ばします（節約の意味がありませんし、リクエストごとの最低料金を取るプロバイダーもあります）。この切り詰めはできる範囲で行うもので、ffmpeg がない、切り詰めに失敗した、音声のほとんどが無音、あるいは切り詰めても 10% ほどしか減らない場合は、元のファイルがそのまま送られます。常に元のまま送りたいときは（たとえばクラウドのプロバイダーで音楽や環境音を書き起こすとき）、`stt.cloud_trim_silence: false` にしてください。コマンド型やプラグインのプロバイダーへ、切り詰めた音声が渡ることはありません。

明示的に選んだ `stt.provider` は厳密に守られます。使えない場合、プロバイダーを勝手に切り替えるのではなく、`hermes tools` を実行するよう案内するエラーになります。プロバイダーを一度も選んでいない場合にだけ、Hermes は `local` → `groq` → `openai` の順で自動判定します。

Groq と OpenAI のモデルの上書きは環境変数で行います。

```bash
STT_GROQ_MODEL=whisper-large-v3-turbo
STT_OPENAI_MODEL=whisper-1
GROQ_BASE_URL=https://api.groq.com/openai/v1
STT_OPENAI_BASE_URL=https://api.openai.com/v1
```

### 書き起こしのヒント（語彙の手がかり） {#transcription-prompt-vocabulary-hints}

`stt.prompt` は、ヒントを受け取れる STT のバックエンドへ渡す、任意の固定の手がかりです。Whisper 系のモデルが聞き違えがちな固有名詞、製品名、専門用語に使ってください。

```yaml
stt:
  provider: "local"
  prompt: "Hermes, Teknium, Nous Research, kanban, Ollama"
```

**組み立て方。** 設定の値が土台になります。[`pre_transcription`](/hermes/docs/user-guide/features/hooks/#pre_transcription) のフックを登録したプラグインは、その上を項目ごとに後勝ちで書き換えます。複数のプラグインの手がかりは決まった順に重なります。プラグインの読み込みはプラグインの id の順で行われ、各プラグインのコールバックはその登録の順で走るので、同じプラグインの組み合わせなら最終的な手がかりも常に同じになります。`prompt` に空の文字列を返すフックは、そのリクエストについて設定の手がかりを消します。フックは `language` と `model` も上書きできます。`file_path` は読み取り専用で、変えようとすると記録のうえで無視されます。フックを登録せず `stt.prompt` も設定していなければ、送られるリクエストは以前のリリースとまったく同じです。

**プロバイダーの対応。**

| プロバイダー | 手がかりのパラメーター | 振る舞い |
|----------|-----------------|----------|
| `local`（faster-whisper） | `initial_prompt` | そのままローカルのモデルへ渡されます |
| `openai` | `prompt` | 書き起こしのリクエストにそのまま渡されます |
| `groq` | `prompt` | 書き起こしのリクエストにそのまま渡されます |
| `mistral` | `prompt` | 書き起こしのリクエストにそのまま渡されます |
| `deepinfra` | `prompt` | OpenAI 互換の経路。そのまま渡されます |
| `xai` | 非対応 | DEBUG で記録され、手がかりなしでリクエストが進みます |
| `elevenlabs` | 非対応 | DEBUG で記録され、手がかりなしでリクエストが進みます |
| `local_command` | 非対応 | DEBUG で記録され、手がかりなしでリクエストが進みます |
| `type: command` の `stt.providers.<name>` | 非対応 | DEBUG で記録され、手がかりなしでリクエストが進みます |
| プラグインが登録したプロバイダー | `transcribe(**extra)` の引数の `prompt` | 手がかりが設定されているときだけ送られるので、このキーより前からあるプロバイダーの呼び出しは変わりません |

**長さ。** Whisper 系のモデルは、手がかりの最後のおよそ 224 トークンにしか反応しません。whisper 系のバックエンド（`local`、`openai`、`groq`、`deepinfra`）については、Hermes がこの上限をこちら側で守ります。長すぎる最終的な手がかりは末尾を残して切られ、警告が記録されます。手がかりの長さでリクエストがエラーになることはありません。ほかのバックエンド（`mistral`、プラグインのプロバイダー）は手がかりをそのまま受け取り、検査は自分で行います。どちらにしても、手がかりは短く具体的に保ってください。

:::warning 手がかりは音声とともに送られます
最終的な手がかりは、音声のファイルとあわせて、設定した STT のプロバイダーへ送られます。とくにプロバイダーがローカルの `faster-whisper` ではなく外部の API のときは、`stt.prompt` にも、`pre_transcription` のフックが返すものにも、秘密やセッション由来の情報を入れないでください。
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

CLI では `/voice on` でマイクのモードを有効にし、`record_key` で録音を始めたり止めたりし、`/voice tts` で読み上げを切り替えます。ひととおりの準備とプラットフォームごとの振る舞いは[音声モード](/hermes/docs/user-guide/features/voice-mode/)を参照してください。

## ストリーミング {#streaming}

返答の全体を待たずに、トークンが届いた端から端末やメッセージングのプラットフォームへ流します。

### CLI のストリーミング {#cli-streaming}

```yaml
display:
  streaming: true         # Stream tokens to terminal in real-time
  show_reasoning: true    # Also stream reasoning/thinking tokens (optional)
```

有効にすると、返答は流れる枠の中に 1 トークンずつ現れます。ツールの呼び出しは静かに記録されたままです。プロバイダーがストリーミングに対応していない場合は、自動で通常の表示に戻ります。

### ゲートウェイのストリーミング（Telegram、Discord、Slack） {#gateway-streaming-telegram-discord-slack}

```yaml
streaming:
  enabled: true           # Enable progressive message editing (default: false)
  transport: auto         # "auto" (default) | "edit" (progressive message editing) | "off"
  edit_interval: 0.8      # Seconds between message edits (default: 0.8)
  buffer_threshold: 24    # Characters before forcing an edit flush (default: 24)
  cursor: " ▉"            # Cursor shown during streaming
  fresh_final_after_seconds: 0    # Opt in to fresh final (Telegram) when preview is this old
```

有効にすると、ボットは最初のトークンでメッセージを送り、トークンが届くたびにそれを少しずつ編集していきます。メッセージの編集に対応しないプラットフォーム（Signal、メール、Home Assistant）は最初の試みで自動的に見分けられ、そのセッションではメッセージがあふれることなく、ストリーミングが静かに無効になります。

トークン単位の編集を伴わずに、ターンの途中の自然なアシスタントの更新を別々に送りたいときは、`display.interim_assistant_messages: true` を設定してください。

**あふれたときの扱い:** 流している文章がプラットフォームのメッセージの長さの上限（およそ 4096 文字）を超えると、いまのメッセージを確定して、新しいメッセージが自動で始まります。

**新しい最終メッセージ（Telegram）:** Telegram の `editMessageText` は元のメッセージの時刻を保つので、長く流れた返答は完成後も最初のトークンの時刻を持ち続けます。`fresh_final_after_seconds > 0` にすると、古くなった下書きを新しい最終メッセージとして届け、下書きのほうはできる範囲で消すやり方を選べます。既定は `0` で、常に流したところで確定させ、両方の操作が見えるクライアントで一瞬メッセージが重複して消える動きを避けます。

:::note プラットフォームごとのストリーミングの既定
大元の `streaming.enabled` のスイッチは既定で `false` です。切り替えるまで、何も流れません。有効にしたあとは、**プラットフォームごとに**決まります。Telegram は `display.platforms.telegram.streaming: true`（流します）、Discord は `display.platforms.discord.streaming: false`（流しません）で出荷されます。つまりストリーミングを有効にすると、Telegram はそのまま流れ、Discord は切り替えるまでメッセージまるごとの返答のままです。プラットフォームごとのスイッチは、ダッシュボードの **Channels** の切り替えか、`~/.hermes/config.yaml` で直接調整できます。
:::

## グループチャットのセッションの隔離 {#group-chat-session-isolation}

CLI、TUI / ダッシュボード、メッセージングゲートウェイをまたいで、同時に開けるチャットのセッションの数を制限します。

```yaml
max_concurrent_sessions: null  # null/0 = unlimited; positive integer = active session cap
```

枠が埋まるのは、セッションが**最初のターン**を走らせたときで、チャットの窓を開いたときではありません。チャットを開いたり、再開したり、つなぎ直したりするだけでは、メッセージを送るまで何も消費しないので、放置されたデスクトップのタブ（や、不安定な websocket が引き起こす背景での再開）が、この上限を共有するメッセージングゲートウェイを飢えさせることはありません。

上限に達すると、Hermes はどの画面が枠を握っているかを名指しした、はっきりした上限の知らせを返します。すでに動いているセッションは、これまでどおりに動きます。いまの枠の使われ方と、その持ち主は `hermes status` で見られます。

正典のキーはトップレベルの `max_concurrent_sessions` です。Hermes は
`gateway.max_concurrent_sessions` も受け皿として受け付けますが、両方が設定されている場合はトップレベルのキーが勝ちます。

この上限は、ローカルの実行時の占有ファイルで守られ、できる範囲での仕組みです。登録簿を読めなかったり錠を取れなかったりしたときは、利用者が立ち往生しないように許す側に倒れます。想定しているのは 1 台のホスト / プロファイルでの運用で、複数の機材へマウントした共有の `$HERMES_HOME` ではありません。

共有のチャットで、部屋ごとに 1 つの会話にするか、参加者ごとに 1 つの会話にするかを決めます。

```yaml
group_sessions_per_user: true  # true = per-user isolation in groups/channels, false = one shared session per chat
```

- `true` が既定で、こちらを勧めます。Discord のチャンネル、Telegram のグループ、Slack のチャンネルなどの共有の場では、プラットフォームが利用者 ID を返す限り、送り手ごとに自分のセッションを持ちます。
- `false` は、部屋を共有する昔の振る舞いに戻します。チャンネルを 1 つの共同の会話として扱わせたいときには役立ちますが、利用者どうしが文脈もトークンの費用も割り込みの状態も共有することになります。
- ダイレクトメッセージは影響を受けません。Hermes はこれまでどおり、チャット / DM の ID で分けます。
- スレッドは、どちらにしても親のチャンネルから隔離されます。`true` のときは、スレッドの中でも参加者ごとに自分のセッションを持ちます。

振る舞いの詳しい話と例は、[セッション](/hermes/docs/user-guide/sessions/)と [Discord のガイド](/hermes/docs/user-guide/messaging/discord/)を参照してください。

## 許可されていない DM への振る舞い {#unauthorized-dm-behavior}

知らない相手からダイレクトメッセージが届いたときに Hermes がどうするかを決めます。

```yaml
unauthorized_dm_behavior: pair

whatsapp:
  unauthorized_dm_behavior: ignore
```

- `pair` は、チャット型の DM のプラットフォームでの既定です。Hermes はアクセスを断りますが、DM で一度きりのペアリングのコードを返します。
- `ignore` は、許可されていない DM を黙って捨てます。
- メールは、`platforms.email.unauthorized_dm_behavior: pair` を設定しない限り `ignore` が既定です。受信箱には関係のない未読が入っていることがあるからです。
- プラットフォームのセクションは全体の既定を上書きするので、広くはペアリングを有効にしたまま、1 つのプラットフォームだけ静かにできます。

## クイックコマンド {#quick-commands}

LLM を呼ばずにシェルのコマンドを走らせるか、あるスラッシュコマンドを別のものの別名にする、独自のコマンドを定義します。exec のクイックコマンドはトークンを使わないので、メッセージングのプラットフォーム（Telegram、Discord など）からサーバーを手早く確かめたり、補助のスクリプトを走らせたりするのに便利です。

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

使い方: CLI でも、どのメッセージングのプラットフォームでも `/status`、`/disk`、`/update`、`/gpu`、`/restart` と打ちます。`exec` のコマンドはホストのその場で動き、出力をそのまま返します。LLM の呼び出しもトークンの消費もありません。`alias` のコマンドは、設定したスラッシュコマンドへ書き換えられます。

- **30 秒のタイムアウト** — 長く走るコマンドは、エラーのメッセージとともに止められます
- **優先順位** — クイックコマンドはスキルのコマンドより先に照合されるので、スキルの名前を上書きできます
- **入力の補完** — クイックコマンドは実行のときに解決されるもので、組み込みのスラッシュコマンドの補完の一覧には出ません
- **種類** — 使えるのは `exec` と `alias` です。それ以外はエラーになります
- **どこでも使えます** — CLI、Telegram、Discord、Slack、WhatsApp、Signal、メール、Home Assistant

文字列だけの指示の近道は、クイックコマンドとしては使えません。使い回せる指示の流れが欲しいときは、スキルを作るか、既存のスラッシュコマンドの別名にしてください。

## 人間らしい間 {#human-delay}

メッセージングのプラットフォームで、人間らしい返答の間合いを真似ます。

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

**`mode`** は、スクリプトの作業ディレクトリと Python の実行環境を決めます。

- **`project`**（既定） — スクリプトはセッションの作業ディレクトリで、有効な仮想環境 / conda 環境の python で動きます。プロジェクトの依存（`pandas`、`torch`、プロジェクトのパッケージ）と相対のパス（`.env`、`./data.csv`）が自然に解決され、`terminal()` から見えるものと揃います。
- **`strict`** — スクリプトは一時の作業用ディレクトリで、`sys.executable`（Hermes 自身の python）で動きます。再現性は最大ですが、プロジェクトの依存や相対のパスは解決されません。

環境の掃除（`*_API_KEY`、`*_TOKEN`、`*_SECRET`、`*_PASSWORD`、`*_CREDENTIAL`、`*_PASSWD`、`*_AUTH` を取り除きます）とツールの許可一覧は、どちらのモードでも同じように働きます。モードを変えても、セキュリティの姿勢は変わりません。

## Web 検索のバックエンド {#web-search-backends}

`web_search` と `web_extract` のツールは、5 つのバックエンドのプロバイダーに対応します。バックエンドは `config.yaml` か `hermes tools` で設定します。

```yaml
web:
  backend: firecrawl    # firecrawl | searxng | parallel | tavily | exa

  # Or use per-capability keys to mix providers (e.g. free search + paid extract):
  search_backend: "searxng"
  extract_backend: "firecrawl"

  # Keyless free-tier fallback (default: true). With no backend configured
  # and no API keys present, web tools rotate across the Exa/Parallel/
  # Tavily/Firecrawl/Keenable free tiers. Set false to disable.
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
| **Tavily** | `TAVILY_API_KEY`（任意 — 選べばキーなしでも使えます） | ✔ | ✔ |
| **Exa** | `EXA_API_KEY`（任意 — キーなしの無料枠あり） | ✔ | ✔ |

**バックエンドの選び方:** 実行時には、常に保存された `web.backend` の選択が使われます（`hermes tools` で設定します。`nous` は運用込みの Tool Gateway を通ります）。Web のバックエンドを一度も選んでいない場合にだけ、使える API キーから自動で判定されます。`SEARXNG_URL` だけが設定されていれば SearXNG、`EXA_API_KEY` だけなら Exa、`TAVILY_API_KEY` だけなら Tavily、`PARALLEL_API_KEY` だけなら Parallel、`KEENABLE_API_KEY` だけなら Keenable です。**選択も認証情報もまったくない**場合、リクエストはキーなしの無料枠の輪（Exa / Parallel / Tavily / Firecrawl / Keenable）を順に回り、レート制限にあたると自動で次へ移ります。詳しくは [Web 検索のガイド](/hermes/docs/user-guide/features/web-search/)を参照してください。いったん選択があると、`.env` にキーを足しても経路は変わりません。`hermes tools` で Tavily、Firecrawl、Keenable を選ぶのは、キーがなくても動きます。

**SearXNG** は、70 以上の検索エンジンに問い合わせる、無料で自前で立てられる、プライバシーを守るメタ検索エンジンです。API キーは要らず、`SEARXNG_URL` を自分のインスタンス（たとえば `http://localhost:8080`）に向けるだけです。SearXNG は検索専用なので、`web_extract` には別の抽出のプロバイダーが必要です（`web.extract_backend` を設定してください）。Docker での準備の手順は [Web 検索の設定ガイド](/hermes/docs/user-guide/features/web-search/)を参照してください。

**自前で立てた Firecrawl:** `FIRECRAWL_API_URL` を自分のインスタンスに向けてください。独自の URL を設定すると、API キーは任意になります（サーバー側で `USE_DB_AUTHENTICATION=*** にすれば認証を切れます）。

**Parallel の検索モード:** 検索の振る舞いは `PARALLEL_SEARCH_MODE` で決めます。`fast`、`one-shot`、`agentic` のいずれかです（既定: `agentic`）。

**Exa:** `~/.hermes/.env` に `EXA_API_KEY` を設定します。`category` による絞り込み（`company`、`research paper`、`news`、`people`、`personal site`、`pdf`）と、ドメイン / 日付の絞り込みに対応します。

## ブラウザー {#browser}

ブラウザーの自動操作の振る舞いを設定します。

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

**ダイアログの扱い方:**

- `must_respond`（既定） — ダイアログを受け止め、`browser_snapshot.pending_dialogs` に出し、エージェントが `browser_dialog(action=...)` を呼ぶのを待ちます。`dialog_timeout_s` 秒たっても返事がない場合は、ページの JS が永遠に止まらないよう、ダイアログは自動で閉じられます。
- `auto_dismiss` — 受け止めて、すぐ閉じます。エージェントはあとから `browser_snapshot.recent_dialogs` で `closed_by="auto_policy"` の記録として見られます。
- `auto_accept` — 受け止めて、すぐ承諾します。しつこい `beforeunload` の確認が出るページに便利です。

ダイアログのひととおりの流れは、[ブラウザーの機能のページ](/hermes/docs/user-guide/features/browser/#browser_dialog)を参照してください。

ブラウザーのツール群は複数のプロバイダーに対応します。Browserbase、Browser Use、ローカルの Chromium 系の CDP の準備については、[ブラウザーの機能のページ](/hermes/docs/user-guide/features/browser/)を参照してください。

## タイムゾーン {#timezone}

サーバーのローカルのタイムゾーンを、IANA のタイムゾーンの文字列で上書きします。ログの時刻、cron の予定、システムプロンプトへの時刻の差し込みに影響します。

```yaml
timezone: "America/New_York"   # IANA timezone (default: "" = server-local time)
```

使える値: IANA のタイムゾーン識別子ならどれでも（たとえば `America/New_York`、`Europe/London`、`Asia/Kolkata`、`UTC`）。サーバーのローカルの時刻にするには、空のままにするか省いてください。

## Discord {#discord}

メッセージングゲートウェイでの、Discord 固有の振る舞いを設定します。

```yaml
discord:
  require_mention: true          # Require @mention to respond in server channels
  free_response_channels: ""     # Comma-separated channel IDs where bot responds without @mention
  auto_thread: true              # Auto-create threads on @mention in channels
```

- `require_mention` — `true`（既定）のとき、ボットはサーバーのチャンネルでは `@BotName` とメンションされたときだけ答えます。DM はメンションなしでも常に動きます。
- `free_response_channels` — メンションなしでもすべてのメッセージに答えるチャンネルの ID を、カンマ区切りで並べます。
- `auto_thread` — `true`（既定）のとき、チャンネルでのメンションは自動で会話用のスレッドを作り、チャンネルをきれいに保ちます（Slack のスレッドに似た動きです）。

## セキュリティ {#security}

実行前のセキュリティの検査と、秘密の伏せ字です。

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

- `redact_secrets` — `true` のとき、ツールの出力が会話の文脈やログに入る前に、API キー・トークン・パスワードらしい形を見つけて伏せます。**既定で有効**です。デバッグや伏せ字の仕組みの開発で生の文字列が要るときにだけ、明示的に `false` にしてください。
- `tirith_enabled` — `true` のとき、端末のコマンドは実行の前に [Tirith](https://github.com/sheeki03/tirith) で調べられ、危ないかもしれない操作が見つけられます。
- `tirith_path` — tirith の実行ファイルのパスです。標準的でない場所に入れているときに設定してください。
- `tirith_timeout` — tirith の検査を待つ最大の秒数です。検査がタイムアウトしても、コマンドは進みます。
- `tirith_fail_open` — `true`（既定）のとき、tirith が使えなかったり失敗したりしてもコマンドの実行は許されます。tirith が確かめられないときにコマンドを遮りたいなら `false` にしてください。

## サイトの禁止一覧 {#website-blocklist}

エージェントの Web とブラウザーのツールから、特定のドメインへのアクセスを遮ります。

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

有効にすると、遮るドメインの型に合う URL は、Web やブラウザーのツールが動く前に拒まれます。これは `web_search`、`web_extract`、`browser_navigate` をはじめ、URL にアクセスするすべてのツールに適用されます。

ドメインの規則が対応するもの:
- ドメインそのもの: `admin.example.com`
- サブドメインのワイルドカード: `*.internal.company.com`（すべてのサブドメインを遮ります）
- TLD のワイルドカード: `*.local`

共有のファイルは、1 行に 1 つドメインの規則を書きます（空行と `#` のコメントは無視されます）。ファイルがない、あるいは読めない場合は警告が記録されますが、ほかの Web のツールが無効になることはありません。

方針は 30 秒だけ記憶されるので、設定の変更は再起動なしですぐ効きます。

## 賢い承認 {#smart-approvals}

危険かもしれないコマンドを Hermes がどう扱うかを決めます。

```yaml
approvals:
  mode: smart   # smart | manual | off
```

| モード | 振る舞い |
|------|----------|
| `smart`（既定） | 補助の LLM を使って、印の付いたコマンドが本当に危険かを判断します。危険の少ないコマンドは、そのコマンドに限って自動で承認されます。本当に危ないものは拒まれ、判断のつかないものは利用者へ回されます。 |
| `manual` | 印の付いたコマンドを実行する前に、必ず利用者に確認します。CLI では対話的な承認の画面が出ます。メッセージングでは、承認待ちとして並べられます。 |
| `off` | 承認の検査をすべて飛ばします。`HERMES_YOLO_MODE=true` と同じです。**注意して使ってください。** |

smart のモードは、承認疲れを減らすのにとくに役立ちます。安全な操作ではエージェントをより自律的に働かせながら、本当に破壊的なコマンドは捕まえられます。

:::warning
`approvals.mode: off` にすると、端末のコマンドの安全の検査がすべて無効になります。信頼できる、隔離された環境でだけ使ってください。
:::

### 拒否の遮断器 {#denial-circuit-breaker}

`approvals.denial_breaker_threshold`（既定 `3`）は、賢い承認の判定役が拒み続けているコマンドの変種を、エージェントが試し続けるのを防ぎます。やり直すたびに、見張り役の LLM の呼び出しが 1 回増えるからです。1 つのセッションでその回数だけ続けて拒まれると、拒否のメッセージは強制停止の指示へ変わり、作業をやめて、遮られた操作を報告し、手で実行するか `/approve` してもらうようエージェントに伝えます。承認が 1 回でもあれば数はリセットされます。`0` にすると無効になります。

```yaml
approvals:
  denial_breaker_threshold: 3   # 0 disables the breaker
```

### 拒否の規則 {#deny-rules}

`approvals.deny` は、当てはまる端末のコマンドを無条件に遮る glob の型の一覧です。`--yolo`、`/yolo`、`mode: off` の下でも遮ります。組み込みの強い禁止一覧に対応する、利用者が編集できるものです。

```yaml
approvals:
  deny:
    - "git push --force*"
    - "*curl*|*sh*"
```

型は大文字小文字を問わない fnmatch の glob で、YAML では必ず引用符で囲む必要があります（先頭が素の `*` だと解析のエラーになります）。詳しくは[セキュリティ — 利用者が定める拒否の規則](/hermes/docs/user-guide/security/#user-defined-deny-rules-approvalsdeny)を参照してください。

### 賢い承認の独自の方針 {#custom-smart-approval-policy}

`approvals.smart_policy` を使うと、賢い承認の判定役への指示に自分の規則を足せます。設定した文章は見張り役の LLM のシステムプロンプト（信頼できる経路。信頼できないコマンドの文字列と並べられることはありません）に足されるので、コードを書き換えずに、自分の環境に合わせて判断を厳しくも緩くもできます。

```yaml
approvals:
  smart_policy: |
    Always ESCALATE commands that modify anything under /etc.
    APPROVE docker compose restarts in ~/deploys — they are routine here.
```

## チェックポイント {#checkpoints}

破壊的なファイルの操作の前に、ファイルシステムを自動で写し取ります。詳しくは[チェックポイントと巻き戻し](/hermes/docs/user-guide/checkpoints-and-rollback/)を参照してください。

```yaml
checkpoints:
  enabled: false                 # Enable automatic checkpoints (also: hermes chat --checkpoints). Default: false (opt-in).
  max_snapshots: 20              # Max checkpoints to keep per directory (default: 20)
```

## 委任 {#delegation}

委任のツールでのサブエージェントの振る舞いを設定します。

```yaml
delegation:
  # model: "google/gemini-3-flash-preview"  # Override model (empty = inherit parent)
  # provider: "openrouter"                  # Override provider (empty = inherit parent)
  # base_url: "http://localhost:1234/v1"    # Direct OpenAI-compatible endpoint (takes precedence over provider)
  # api_key: "local-key"                    # API key for base_url (falls back to OPENAI_API_KEY)
  # api_mode: ""                            # Wire protocol for base_url: "chat_completions", "codex_responses", or "anthropic_messages". Empty = auto-detect from URL (e.g. /anthropic suffix → anthropic_messages). Set explicitly for non-standard endpoints the heuristic can't detect.
  max_concurrent_children: 3                # Parallel children per batch (floor 1, no ceiling). Also via DELEGATION_MAX_CONCURRENT_CHILDREN env var.
  worktree_isolation: false                 # Give each child its own git worktree branched from HEAD (local backend + git repos only; inspired by Muse Code). See Subagent Delegation → Worktree Isolation.
  max_spawn_depth: 1                        # Delegation tree depth cap (1-3, clamped). 1 = flat (default): parent spawns leaves that cannot delegate. 2 = orchestrator children can spawn leaf grandchildren. 3 = three levels.
  orchestrator_enabled: true                # Global kill switch. When false, role="orchestrator" is ignored and every child is forced to leaf regardless of max_spawn_depth.
```

**サブエージェントの provider:model の上書き:** 既定では、サブエージェントは親のエージェントのプロバイダーとモデルを引き継ぎます。`delegation.provider` と `delegation.model` を設定すると、サブエージェントを別の provider:model の組み合わせへ回せます。たとえば、メインのエージェントは高価な推論モデルで動かしつつ、範囲の狭い作業には安くて速いモデルを使う、といった具合です。

**エンドポイントの直接指定:** 独自エンドポイントを素直に使いたいなら、`delegation.base_url`、`delegation.api_key`、`delegation.model` を設定してください。サブエージェントはその OpenAI 互換のエンドポイントへ直接向かい、これは `delegation.provider` より優先されます。`delegation.api_key` を省いた場合、Hermes は `OPENAI_API_KEY` にだけ落ちます。

**通信の形式（`api_mode`）:** Hermes は `delegation.base_url` から通信の形式を自動で判定します（たとえば `/anthropic` で終わるパスは `anthropic_messages`。Codex、Anthropic ネイティブ、Kimi-coding のホスト名も、これまでどおりの判定が働きます）。この推測で分類できないエンドポイント — たとえば Azure AI Foundry、MiniMax、Zhipu GLM、Anthropic 形式のバックエンドの前に立つ LiteLLM のプロキシなど — では、`delegation.api_mode` に `chat_completions`、`codex_responses`、`anthropic_messages` のいずれかを明示してください。自動の判定に任せるなら、空のまま（既定）にします。

委任のプロバイダーは、CLI やゲートウェイの起動と同じやり方で認証情報を解決します。設定済みのプロバイダーはすべて使えます: `openrouter`、`nous`、`copilot`、`zai`、`kimi-coding`、`minimax`、`minimax-cn`。プロバイダーを設定すれば、正しいベース URL、API キー、API のモードが自動で解決されるので、認証情報を手でつなぐ必要はありません。

**優先順位:** 設定の `delegation.base_url` → 設定の `delegation.provider` → 親のプロバイダー（引き継ぎ）。`delegation.model` → 親のモデル（引き継ぎ）。`provider` なしで `model` だけを設定すると、親の認証情報を保ったままモデル名だけが変わります（OpenRouter のように、同じプロバイダーの中でモデルを変えたいときに便利です）。

**幅と深さ:** `max_concurrent_children` は、1 つのまとまりの中で並行して動くサブエージェントの数を抑えます（既定 `3`、下限 1、上限なし）。`DELEGATION_MAX_CONCURRENT_CHILDREN` の環境変数でも設定できます。モデルが上限より長い `tasks` の配列を出した場合、`delegate_task` は黙って切り詰めるのではなく、制限を説明するツールのエラーを返します。`max_spawn_depth` は委任の木の深さを決めます（1〜3 に丸められます）。既定の `1` では委任は平らで、子は孫を生めず、`role="orchestrator"` を渡しても黙って `leaf` に落ちます。`2` にすれば取りまとめ役の子が葉の孫を生めるようになり、`3` なら 3 段の木になります。エージェントは呼び出しごとに `role="orchestrator"` で取りまとめを選びます。`orchestrator_enabled: false` にすると、どの子も強制的に葉へ戻ります。費用は掛け算で増えます。`max_spawn_depth: 3` と `max_concurrent_children: 3` では、木は 3×3×3 = 27 の葉のエージェントが同時に動きうる規模になります。使い方の型は[サブエージェントへの委任 → 深さの上限と入れ子の取りまとめ](/hermes/docs/user-guide/features/delegation/#depth-limit-and-nested-orchestration)を参照してください。

**子のプロセスの知らせ:** サブエージェントが始めた背景プロセスは、完了や監視の知らせを親の会話へ回しますが、そこでは既定で**抑えられます**。子がまとめた結果こそが成果だからです。`delegation.surface_child_process_notifications: true` にすると、どのサブエージェントのものかを添えて届きます。委任の結果そのものが抑えられることはありません。[サブエージェントへの委任 → 子の背景プロセスの知らせ](/hermes/docs/user-guide/features/delegation/#child-background-process-notifications)を参照してください。

## 確認の問い返し {#clarify}

ゲートウェイが、確認の問い返しへの返事をどれだけ待つかを設定します。正典のキーは `agent.clarify_timeout`（既定 `3600` 秒）で、旧来のトップレベルの `clarify.timeout` も、明示されていれば今なお尊重されます。

```yaml
agent:
  clarify_timeout: 3600        # Seconds to wait for user clarification response (0 or less = unlimited)
```

## 文脈のファイル（SOUL.md、AGENTS.md） {#context-files-soulmd-agentsmd}

Hermes は 2 つの異なる文脈の範囲を使います。

| ファイル | 役割 | 範囲 |
|------|---------|-------|
| `SOUL.md` | **エージェントの主たる人格** — エージェントが何者かを定めます（システムプロンプトの 1 番目の枠） | `~/.hermes/SOUL.md` または `$HERMES_HOME/SOUL.md` |
| `.hermes.md` / `HERMES.md` | プロジェクト固有の指示（最優先） | git のルートまでたどります |
| `AGENTS.md` | プロジェクト固有の指示、コーディングの決まり | ディレクトリを再帰的にたどります |
| `CLAUDE.md` | Claude Code の文脈ファイル（これも見ます） | 作業ディレクトリのみ |
| `.cursorrules` | Cursor IDE の規則（これも見ます） | 作業ディレクトリのみ |
| `.cursor/rules/*.mdc` | Cursor の規則のファイル（これも見ます） | 作業ディレクトリのみ |

- **SOUL.md** はエージェントの主たる人格です。システムプロンプトの 1 番目の枠を占め、組み込みの既定の人格をまるごと置き換えます。エージェントが何者かを、思いどおりに書き換えてください。
- SOUL.md がない、空、あるいは読めない場合、Hermes は組み込みの既定の人格に落ちます。
- **プロジェクトの文脈ファイルには優先順位があり**、読み込まれるのは 1 種類だけです（最初に見つかったものが勝ちます）: `.hermes.md` → `AGENTS.md` → `CLAUDE.md` → `.cursorrules`。SOUL.md は常に独立して読み込まれます。
- **AGENTS.md** は階層になっています。下のディレクトリにも AGENTS.md があれば、すべてがまとめられます。
- `SOUL.md` がまだない場合、Hermes は既定のものを自動で置きます。
- 読み込まれた文脈ファイルはすべて `context_file_max_chars` 文字（既定 20,000）で頭打ちになり、賢く切り詰められます。

あわせて参照:
- [人格と SOUL.md](/hermes/docs/user-guide/features/personality/)
- [文脈のファイル](/hermes/docs/user-guide/features/context-files/)

## 作業ディレクトリ {#working-directory}

| 場面 | 既定 |
|---------|---------|
| **CLI（`hermes`）** | コマンドを実行した、そのディレクトリ |
| **メッセージングゲートウェイ** | `~/.hermes/config.yaml` の `terminal.cwd`。未設定ならホームディレクトリ `~` |
| **Docker / Singularity / Modal / SSH** | コンテナやリモートの機材の中の、利用者のホームディレクトリ |

作業ディレクトリを上書きするには、次のようにします。
```yaml
# In ~/.hermes/config.yaml:
terminal:
  cwd: /home/myuser/projects
```

`~/.hermes/.env` にある `MESSAGING_CWD` と、直接書いた `TERMINAL_CWD` は、旧来の互換のための受け皿です。新しい設定では `terminal.cwd` を使ってください。

## ネットワーク {#network}

外向きの HTTP のための、接続まわりの回避策です。

```yaml
network:
  force_ipv4: false   # Force IPv4 for outbound connections (default: false)
```

`force_ipv4` — IPv6 が壊れている、または届かないサーバーでは、Python は AAAA のレコードを先に引くので、IPv4 へ落ちるまで TCP のタイムアウトいっぱい止まることがあります。`true` にすると IPv6 をまるごと飛ばし、IPv4 で直接つなぎます。

## 導入の案内 {#onboarding}

最初に触れたときの案内と、構造化されたプロフィール作りの提案です。

```yaml
onboarding:
  profile_build: "ask"   # "ask" (default) | "off"
  seen: {}               # internal latch — leave empty
```

- `profile_build` — ゲートウェイでいちばん最初のメッセージのときに提示される、プロフィール作りの道筋を決めます。`"ask"`（既定）は利用者のプロフィールを作ることを提案します。この提案は**自分で選ぶもので、同意が前提**です。エージェントは何かを調べる前に必ず尋ね、つながったアカウントを黙って読むことはありません。`"off"` は素の案内だけを出します。提案が出るのは最大 1 回です。
- `seen` — 内部の状態です。Hermes は表示した案内をここで掛け金留めして、二度と出ないようにします。プロフィール作りの提案も、一度出したらここに記録されます。手で編集しないでください。すべての案内をもう一度見たいなら、`onboarding` のセクションをまるごと消してください。

## ダッシュボード {#dashboard}

[Web のダッシュボード](/hermes/docs/user-guide/features/web-dashboard/)の設定です。見た目のテーマ、公開の URL、認証のプロバイダーを扱います。認証のプロバイダー（OAuth、基本のパスワード、停止の制御）は Web ダッシュボードのページに詳しく書かれています。ここでは `config.yaml` での書き方を示します。

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
- `show_token_analytics` — 既定では無効です。Analytics のページとトークン / 費用の数字は**ローカルでの下限の見積もり**で（補助の呼び出し、再試行、フォールバック、キャッシュへの書き込みを含みません）、プロバイダーの請求よりずっと低く見えることがあります。請求額ではないと理解したうえでのみ `true` にしてください。
- `public_url` — 設定すると、OAuth の `redirect_uri` を組み立てる元になる完全な情報（スキーム + ホスト + 任意のパスの接頭辞）になります。`X-Forwarded-*` のヘッダーを確実には転送しないリバースプロキシの後ろに置くときに設定してください。空にすると、プロキシのヘッダーからの組み立てが使われます。
- `trusted_proxies` — `X-Forwarded-Proto` と `X-Forwarded-For` を渡してよい IP アドレス、または範囲の限られた CIDR のネットワークです。ループバックは自動で信頼されたままです。TLS のリバースプロキシが別のコンテナやホストから接続してくる場合に設定してください。プロキシの正確な IP が望ましく、アドレスが変わる場合にだけ小さな専用のネットワークを使ってください。ワイルドカードと `/0` のネットワークは拒まれます。
- `oauth` / `basic_auth` / `drain_auth` — 同梱のダッシュボードの認証プラグインが読む設定です。停止の制御の秘密だけはここに書きません。`HERMES_DASHBOARD_DRAIN_SECRET` の環境変数で渡します。認証のひととおりの準備は [Web ダッシュボード](/hermes/docs/user-guide/features/web-dashboard/)を参照してください。
- `ws_ping_interval` / `ws_ping_timeout` — ループバック以外での待ち受けにおける WebSocket の生存確認の調整です（ループバックの接続では生存確認をしません）。遅延の大きい回線（Tailscale、遠くの SSH のトンネル）では、20 秒の既定が偽の 1006 の切断を作りかねないので、上げてください。
- `ws_orphan_reap_grace_s` — WebSocket が切れたセッションが、孤児の掃除係に回収されるまでの待ち時間です。クライアントのつなぎ直しが遅いなら、上の生存確認の値とあわせて上げてください。（`HERMES_TUI_WS_ORPHAN_REAP_GRACE_S` は内部の上書きとして残っています。）
- `startup_orphan_sweep`（既定 `true`） — 上の WebSocket の孤児の回収の時計はプロセスの中にあるので、それが働く前にゲートウェイが再起動すると（更新、異常終了、systemd）、セッションの行が永遠に開いたまま残ります。`/resume` やダッシュボードに、幻の「作業中」が現れるわけです。ゲートウェイが起動するたびに — 標準入出力の TUI（`entry.main`）でも、デスクトップ / ダッシュボードの WebSocket の補助プロセス（`handle_ws`）でも — 種別が `tui` / `desktop` / `subagent` の行のうち、開始の時刻と最新のメッセージの**どちらも**セッションの有効期限（`HERMES_TUI_SESSION_TTL_S`、既定 6 時間）より古いものは、`end_reason: startup_orphan_reap` として閉じられます。メッセージングのプラットフォームのセッション（Telegram、Discord、…）には決して触れませんし、生きている（すでにクライアントが再開した）セッションも対象外です。掃かれたセッションも、また再開できます。
