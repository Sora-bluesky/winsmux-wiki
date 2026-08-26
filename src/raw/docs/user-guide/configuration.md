---
title: "Hermes Agent の設定"
description: "Hermes Agent を設定する — config.yaml、プロバイダー、モデル、API キーなど"
upstream_path: user-guide/configuration.md
upstream_blob: 50c84b1ac78bae569d67ea497eaaa97b8f9312fb
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/configuration
---

# Hermes Agent の設定 {#hermes-agent-configuration}

設定はすべて、すぐ手が届くように `~/.hermes/` のディレクトリに置かれています。

:::tip 動く `config.yaml` にいちばん早くたどり着く道
`hermes setup --portal` を実行してください。OAuth を1回通すだけで、モデルのプロバイダーと4つのツールのゲートウェイのツールが、YAML を手で書かずにそろいます。Portal を契約していると、トークン課金のプロバイダーが10%引きにもなります。[Nous Portal](/hermes/docs/integrations/nous-portal/) を参照してください。
:::

## ディレクトリの構成 {#directory-structure}

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

## 設定を扱う {#managing-configuration}

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
`hermes config set` のコマンドは、値を正しいファイルへ自動で振り分けます。API キーは `.env` に、それ以外は `config.yaml` に保存されます。
:::

## 設定の優先順位 {#configuration-precedence}

設定は次の順で決まります（上にあるものほど優先されます）。

1. **CLI の引数** — たとえば `hermes chat --model anthropic/claude-sonnet-4`（その実行だけの上書き）
2. **`~/.hermes/config.yaml`** — 秘密ではない設定すべてにとっての主となるファイル
3. **`~/.hermes/.env`** — 環境変数の受け皿。秘密の情報（API キー、トークン、パスワード）には**必須**です
4. **組み込みの初期値** — ほかに何も設定されていないときに使う、安全な既定の値

:::info 目安
秘密の情報（API キー、ボットのトークン、パスワード）は `.env` に置きます。それ以外（モデル、ターミナルのバックエンド、圧縮の設定、記憶の上限、ツールセット）は `config.yaml` に置きます。両方に書かれているとき、秘密ではない設定は `config.yaml` が勝ちます。
:::

:::tip 組織での導入
管理者は、システム全体の管理用ディレクトリを使って、ふつうの利用者が上書きできない設定や秘密の値を固定できます。
[管理された適用範囲](/hermes/docs/user-guide/managed-scope/)を参照してください。
:::

## 実行時の上限 {#runtime-limits}

長く動き続ける Hermes のサーバー（ゲートウェイや
`hermes serve --isolated` を含みます）は、OS が対応していれば、起動時に設定された
`RLIMIT_NOFILE` のソフトの上限を適用します。

```yaml
runtime:
  nofile_soft_limit: 4096
```

初期値は `4096` です。Hermes はこの値を OS のハードの上限に収め、すでにそれより高い
ソフトの上限を持つプロセスの値を下げることはありません。この調整を止めるには、値を
`0`、`false`、`null` のいずれかにしてください。Windows や、上限を変えられない
サンドボックスでは、
上限を変えないまま起動が
続きます。

## 環境変数の差し込み {#environment-variable-substitution}

`config.yaml` の中では、`${VAR_NAME}` の書き方で環境変数を参照できます。

```yaml
auxiliary:
  vision:
    api_key: ${GOOGLE_API_KEY}
    base_url: ${CUSTOM_VISION_URL}

delegation:
  api_key: ${DELEGATION_KEY}
```

1つの値の中で複数を参照することもできます: `url: "${HOST}:${PORT}"`。参照した変数が設定されていない場合、書いたものがそのまま残り（`${UNDEFINED_VAR}` は手つかずのままです）、警告が記録されます。`$VAR` のように括弧のない形は展開されません。

Cursor 風の SecretRef の書き方も受け付けます。`${env:VAR_NAME}` は `${VAR_NAME}` とまったく同じように解決されます（`env:` の接頭辞は取り除かれます）。ですから Cursor や Claude の設定からコピーしてきた MCP やプロバイダーの断片が、`config.yaml` でも `mcp_servers` のまとまりでもそのまま動きます。SecretRef のほかの取得元（`${file:...}`、`${vault:...}`、`${bitwarden:...}`）はその場では解決**されません**。外部の秘密情報の仕組みは、`secrets:` のまとまりを通して起動時に値を環境へ入れるので、`${env:NAME}` の形で参照してください。知らない接頭辞は一度だけ警告を出し、そのまま残ります。

AI のプロバイダーの設定（OpenRouter、Anthropic、Copilot、独自の接続先、自分で立てた LLM、予備のモデルなど）については、[AI のプロバイダー](/hermes/docs/integrations/providers/)を参照してください。

### プロバイダーの待ち時間 {#provider-timeouts}

プロバイダー全体のリクエストの待ち時間の上限は `providers.<id>.request_timeout_seconds` で、モデルごとの上書きは `providers.<id>.models.<model>.timeout_seconds` で設定できます。これは、どの通信の形（OpenAI 形式、Anthropic 本来の形、Anthropic 互換）でも主となるやり取りのクライアントに効き、予備の連なりにも、認証情報を入れ替えたあとの作り直しにも、（OpenAI 形式では）リクエストごとの待ち時間の指定にも効きます。ですから、設定した値が従来の `HERMES_API_TIMEOUT` の環境変数より優先されます。

応答を少しずつ受け取らない呼び出しについて、止まったと判断するまでの時間は `providers.<id>.stale_timeout_seconds` で、モデルごとの上書きは `providers.<id>.models.<model>.stale_timeout_seconds` で設定できます。こちらは従来の `HERMES_API_CALL_STALE_TIMEOUT` の環境変数より優先されます。

どれも設定しなければ、従来の初期値（`HERMES_API_TIMEOUT=1800` 秒、`HERMES_API_CALL_STALE_TIMEOUT=90` 秒、Anthropic 本来の形なら900秒）のままです。止まったかどうかの判断は、明示しなければ手元の接続先では自動的に無効になり、とても大きな文脈では長くなることもあります。いまのところ AWS Bedrock ではつながっていません（`bedrock_converse` と AnthropicBedrock の SDK のどちらの経路も、独自の待ち時間の設定を持つ boto3 を使います）。[`cli-config.yaml.example`](https://github.com/NousResearch/hermes-agent/blob/main/cli-config.yaml.example) にコメントで書かれた例を参照してください。

## 更新時の動き {#update-behavior}

`hermes update` の設定は、`config.yaml` の `updates` の下にあります。

```yaml
updates:
  pre_update_backup: quick       # quick (state snapshot, default) | full (snapshot + HERMES_HOME zip) | off
  backup_keep: 5                 # Keep this many full pre-update backup zips
  non_interactive_local_changes: stash  # stash | discard
  auto_switch_parked_branch: true       # auto-switch a clean, fully merged parked branch back to main
```

`pre_update_backup` は、更新前の備えを決める唯一の設定です。`quick`（初期値）は大事な状態のファイル（ペアリングの情報、cron のジョブ、設定、認証。1 GiB を越えるファイルは飛ばします）を `state-snapshots/` に控えます。`full` はそれに加えて `HERMES_HOME` のすべてを `backups/` に圧縮して保存するので、中身が大きいと数分かかることがあります。`off` は両方とも行いません。従来の真偽値も受け付けます（`true` → `full`、`false` → `off`）。

git で入れている場合、Hermes は更新用のブランチに切り替えたり取り込んだりする前に、変更されている追跡中のファイルと追跡外のファイルを自動で退避します。端末での対話的な更新では、その退避を戻す前に確認が出ます。対話のない更新（デスクトップやチャットのアプリ、ゲートウェイ、`--yes`）では `updates.non_interactive_local_changes` に従います。`stash` なら取り込みに成功したあとで手元のソースの変更を戻し、`discard` なら成功したあとで更新のために作った退避を捨てます。`discard` は、手元のソースの変更を残すつもりがまったくない、管理された導入でだけ使ってください。

その退避の前に、Hermes は npm の導入やビルドで生じた、追跡中の `package-lock.json` の差分も元に戻します。ロックファイルを意図して直したのなら、更新の前にコミットするか自分で退避しておいてください。

## ターミナルのバックエンドの設定 {#terminal-backend-configuration}

Hermes は7つのターミナルのバックエンドに対応しています。どれを選ぶかで、エージェントのシェルのコマンドが実際に動く場所が決まります — 手元のマシン、Docker のコンテナ、SSH でつなぐリモートのサーバー、Modal のクラウドのサンドボックス（直接つなぐか、Nous が運用するゲートウェイ経由か）、Daytona の作業場所、Vercel Sandbox、Singularity / Apptainer のコンテナです。

```yaml
terminal:
  backend: local    # local | docker | ssh | modal | daytona | vercel_sandbox | singularity
  cwd: "."          # Gateway/cron working directory (CLI always uses launch dir)
  font_family: ""   # Desktop terminal font; e.g. "MesloLGS NF"
  timeout: 180      # Per-command timeout in seconds
  home_mode: auto   # auto | real | profile — subprocess HOME policy
  env_passthrough: []  # Env var names to forward to sandboxed execution (terminal + execute_code)
  singularity_image: "docker://nikolaik/python-nodejs:python3.11-nodejs20"  # Container image for Singularity backend
  modal_image: "nikolaik/python-nodejs:python3.11-nodejs20"                 # Container image for Modal backend
  daytona_image: "nikolaik/python-nodejs:python3.11-nodejs20"               # Container image for Daytona backend
```

`terminal.font_family` は、Hermes Desktop に組み込まれたターミナルの表示を決めます。手元に入っているフォントの名前を1つ（たとえば `MesloLGS NF`）書くか、CSS のフォントの並びを書けます。Hermes は同梱の JetBrains Mono の並びを後ろに足します。空にしておけば既定のままです。同じ設定は **Settings → Appearance → Terminal Font** からプロファイル単位で変えられます。Google Fonts の取得も、システムのフォントへの許可も要りません。

Modal、Daytona、Vercel Sandbox のようなクラウドのサンドボックスでは、`container_persistent: true` は、サンドボックスが作り直されてもファイルシステムの状態を保とうとする、という意味です。同じサンドボックスや PID の空間、裏で動いているプロセスがそのまま残る、という約束ではありません。

### バックエンドの一覧 {#backend-overview}

| バックエンド | コマンドが動く場所 | 隔たり | 向いている用途 |
|---------|-------------------|-----------|----------|
| **local** | 手元のマシンで直接 | なし | 開発、個人での利用 |
| **docker** | 長く生きる1つの Docker のコンテナ（セッション、`/new`、サブエージェントで共有） | 完全（名前空間、権限の削除） | 安全な隔離、CI/CD |
| **ssh** | SSH でつなぐリモートのサーバー | ネットワークの境界 | 離れた場所での開発、高性能なマシン |
| **modal** | Modal のクラウドのサンドボックス | 完全（クラウドの仮想マシン） | 使い捨てのクラウドの計算、評価 |
| **daytona** | Daytona の作業場所 | 完全（クラウドのコンテナ） | 運用込みのクラウドの開発環境 |
| **vercel_sandbox** | Vercel Sandbox | 完全（クラウドのマイクロ VM） | ファイルシステムを控えで残せるクラウドでの実行 |
| **singularity** | Singularity / Apptainer のコンテナ | 名前空間（--containall） | HPC のクラスタ、共有のマシン |

### local のバックエンド {#local-backend}

初期状態のバックエンドです。コマンドは手元のマシンで、何にも隔てられずに直接動きます。特別な準備は要りません。

```yaml
terminal:
  backend: local
```

初期状態では、手元のツールの子プロセスは、実際の OS のユーザーの `HOME` をそのまま使います。
そのため、`git`、`ssh`、`gh`、`az`、`npm`、Claude Code、Codex といった外部の CLI が、
ふだんのシェルで使っている認証情報や設定をそのまま見つけられます。Hermes の
状態は `HERMES_HOME` によってプロファイルごとに分かれたままです。プロファイルが設定、記憶、
セッション、スキルを選ぶ仕組みは `HOME` ではありません。

Hermes はシステム全体の `HOME` も、シェルの起動時のファイルも、
OS のアカウントのホームも**変えません**。この設定が決めるのは、`terminal` などのツール、
裏で動くターミナルのプロセス、`execute_code`、ACP の補助のプロセスを通して
Hermes が起動する子プロセスに渡される環境だけです。

#### `terminal.home_mode` {#terminalhomemode}

| 設定 | ホストに入れた場合 | コンテナの場合 | 兼ね合い |
|---|---|---|---|
| `auto` | 実際の OS のユーザーの `HOME` を使います | `{HERMES_HOME}/home` を使います | おすすめの初期値です。ホストの CLI はそのまま動き、コンテナの状態は残ります。 |
| `real` | 実際の OS のユーザーの `HOME` を強制します | 見えていれば、実際の OS のユーザーの `HOME` を強制します | 親のプロセスが誤って `HOME` をプロファイルのホームに向けたまま起動した場合に役立ちます。 |
| `profile` | `{HERMES_HOME}/home` があればそれを使います | `{HERMES_HOME}/home` があればそれを使います | プロファイルごとに CLI の設定をきっちり分けられますが、ふつうの `~/.ssh`、`~/.gitconfig`、`~/.azure`、`~/.config/gh`、Claude や Codex の認証、npm の状態などは、プロファイルのホームの中で自分で用意するかリンクしない限り見えません。 |

初期値の弱点は、ホストのプロファイルどうしが `~` の下にある、ふつうの
ユーザー単位の CLI の認証情報や設定を共有してしまうことです。git の身元、SSH の鍵、
GitHub CLI のログイン、npm の設定、クラウドの CLI のログインを分けたプロファイルが
必要なら、`home_mode: profile` にして、そのプロファイルのホームの中で
それらの道具を意識して用意してください。

プロファイルごとに道具の設定をきっちり分けたいなら、こう設定します。

```yaml
terminal:
  home_mode: profile
```

この設定では、ツールの子プロセスは `{HERMES_HOME}/home` を `HOME` として使います。Hermes は
`HERMES_REAL_HOME` も設定するので、必要になったときにスクリプトから本当のユーザーのホームを
たどれます。コンテナのバックエンドは `auto` でも `{HERMES_HOME}/home` を使い続けます。
そのディレクトリが、残り続ける Hermes のデータのボリュームの上にあるからです。

プロファイルの状態と本当のユーザーのホームを見分けたいスクリプトは、Hermes のデータには
`HERMES_HOME` を、アカウントのホームには `HERMES_REAL_HOME` を使ってください。

```python
from pathlib import Path

hermes_home = Path(os.environ["HERMES_HOME"])
real_home = Path(os.environ.get("HERMES_REAL_HOME", os.environ["HOME"]))
```

:::warning
エージェントは、あなたのユーザーのアカウントと同じだけファイルシステムに触れます。使わせたくないツールは `hermes tools` で止めるか、隔離のために Docker に切り替えてください。
:::

### docker のバックエンド {#docker-backend}

安全のための備え（すべての権限を落とし、権限の昇格を禁じ、プロセス数に上限を設けます）をした Docker のコンテナの中でコマンドを動かします。

**長く生きる1つのコンテナを、Hermes のプロセスをまたいで共有します。** Hermes は最初に使うときに長く生きるコンテナを1つだけ起動し、ターミナル、ファイル、`execute_code` のすべての呼び出しを `docker exec` でその同じコンテナへ回します。セッションをまたいでも、`/new` や `/reset` をしても、`delegate_task` のサブエージェントでも同じです。作業ディレクトリの移動、入れたパッケージ、`/workspace` のファイル、そして**裏で動いているプロセス**が、次のツールの呼び出しへ、そして次の Hermes のプロセスへと引き継がれます。TUI のセッションを閉じても、`/quit` を実行しても、新しく `hermes` を起動しても、コンテナは動き続け、次の Hermes のプロセスはラベルを頼りにそれを見つけて使い回します。片付けの正確な決まりは、下の **コンテナの一生** を参照してください。

**セッションごとに隔てる形（`container_persistent: false`）。** docker のバックエンドで `container_persistent: false` にすると、**セッションごとに**1つのコンテナを使う形に変わります。チャット（デスクトップアプリのセッション、ゲートウェイの会話、TUI のセッション）はそれぞれ自分専用の新しいサンドボックスを持ち、最初のターミナルやファイルの呼び出しで作られ、セッションが閉じるか `lifetime_seconds` を越えて放置されると取り除かれます。セッションのあいだで引き継がれるものは何もありません — ファイルシステムの状態も、マウントも、裏で動くプロセスもです。`docker_mount_cwd_to_workspace: true` のときは、**そのセッションに結び付いた**作業場所だけが `/workspace` にマウントされます。結び付いたディレクトリを持たない新しいセッションは、前のセッションのマウントを引き継ぐのではなく、空の作業場所を得ます。`delegate_task` のサブエージェントは、これまでどおり親のセッションのコンテナを共有します。会話と会話のあいだにサンドボックスという安全の境界を置きたいときは、この形を使ってください。上で説明した長く生きる共有のコンテナがほしいなら、初期値の `true` のままにします。

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

**`docker_env`** と **`docker_forward_env`** の違い: 前者は設定に書いた `KEY=value` の組をそのまま入れます（値は `config.yaml` に置くか、`TERMINAL_DOCKER_ENV='{"DEBUG":"1"}'` のように JSON の辞書で渡します）。後者はシェルや `~/.hermes/.env` から値を持ってくるので、本当の秘密の値が設定ファイルに現れません。トークンには `docker_forward_env` を、コンテナが必要とする固定の設定には `docker_env` を使ってください。

**`terminal.docker_extra_args`**（`TERMINAL_DOCKER_EXTRA_ARGS='["--gpus=all"]'` でも上書きできます）を使うと、Hermes が独立した項目として用意していない `docker run` のフラグを自由に渡せます — `--gpus`、`--network`、`--add-host`、別の `--security-opt` の指定などです。それぞれの要素は文字列でなければなりません。この並びは組み立てた `docker run` のいちばん後ろに足されるので、必要なら Hermes の既定を上書きできます。使いすぎないでください — サンドボックスの備え（権限の削除、`--user`、作業場所のマウント）とぶつかるフラグは、黙って隔離を弱めます。

**`terminal.docker_network`**（初期値は `true`。環境変数は `TERMINAL_DOCKER_NETWORK`） — `false` にすると、サンドボックスのコンテナを `--network=none` で動かし、エージェントのコマンドからの外向きの通信をすべて断ちます。これは `terminal`、`execute_code`、ファイルのツールが使う実行用のコンテナに効きます。コンテナは Hermes のプロセスをまたいで残るので、ネットワークにつながった古いコンテナがあるときにこれを `false` にすると、そのコンテナは取り除かれ、通信を断った新しいコンテナが作られます（警告が記録されます）。その中で裏で動いていたプロセスは失われます。`docker_extra_args` で `--network=none` を渡すより、この項目を使ってください。

**必要なもの:** Docker Desktop か Docker Engine が入っていて、動いていることです。Hermes は `$PATH` に加えて、macOS でよくある導入先（`/usr/local/bin/docker`、`/opt/homebrew/bin/docker`、Docker Desktop のアプリの中）も探します。Podman もそのまま使えます。両方入っている状態で Podman を使わせたいときは、`HERMES_DOCKER_BINARY=podman`（またはフルパス）を設定してください。

#### コンテナの一生 {#container-lifecycle}

Hermes が管理するコンテナには、あとから起動したプロセス（と、取り残されたコンテナを片付ける仕組み）が見分けられるよう、3つのラベルが付きます。

- `hermes-agent=1` — Hermes が管理していることを表します
- `hermes-task-id=<sanitized task_id>` — 作業ごとの使い回しの判定に使います
- `hermes-profile=<sanitized profile name>` — 初期状態では、使い回しと片付けを動いている Hermes のプロファイルの中に限ります。`docker_shared_container_key` が設定されているときは、その整えられた値が代わりに使われます

Hermes は起動時に `docker ps --filter label=hermes-task-id=<id> --filter label=hermes-profile=<identity>` を実行し、見つかれば**すでにあるコンテナにつなぎます**。ここでいう身元は、`docker_shared_container_key` で信頼するプロファイルどうしを共通の値にまとめていない限り、動いているプロファイルです。コンテナが `exited` の状態なら（Docker のデーモンを再起動したあとなど）、`docker start` して使い回します。ファイルシステムの状態と入れたパッケージは残りますが、コンテナの中で裏で動いていたプロセスは残りません。

Hermes のプロセスが終わるとき — `/quit`、TUI のセッションを閉じる、ゲートウェイの停止、SIGKILL でさえ — 初期状態では、片付けの処理は**コンテナに対して何もしません**。コンテナは動き続けます。次の Hermes のプロセスは、ラベルを調べてミリ秒でつなぎ直します。「セッションをまたいで長く生きる1つのコンテナを共有する」という約束には、これが必要です。裏で動いているプロセス（npm の見張り、開発用のサーバー、長く走る pytest）がセッションをまたいで生き残る道は、これしかありません。

**コンテナが片付けられる（停止して `docker rm -f` される）のは、次の場合だけです。**

| きっかけ | いつ起きるか |
|---|---|
| `docker_persist_across_processes: false` | プロセスごとに明示的に隔てる設定です。`cleanup()` のたびに `stop` と `rm -f` を行います。issue #20561 より前の動きと同じです。 |
| 放置を片付ける仕組み（`lifetime_seconds`、初期値300秒） | 環境が `persist_across_processes=false` のときだけです。残す設定の環境では何もせず、コンテナは片付けをすり抜けます。 |
| 次の起動時の、取り残されたコンテナの片付け | `2 × lifetime_seconds`（初期値は600秒 = 10分）より古い、hermes のラベルが付いた **Exited** のコンテナを片付けます。対象はいまのプロファイルの中だけです。**動いているコンテナには決して触れません** — 隣のプロセスを壊さないためです。止めるには `docker_orphan_reaper: false` にします。 |
| 利用者が自分で行う操作 | `docker rm -f`、`docker system prune`、Docker Desktop の再起動です。`--restart=always` は付けていないので、ホストを再起動するとコンテナは `Exited` のまま残ります（その書き込み層は残り、次の起動で使い回されますが、裏で動いていたプロセスは消えています）。 |

知っておきたい、きわどい場合もあります。

- **コンテナの中の PID 1 がメモリ不足で落とされる**と、コンテナは `Exited` になります。次に使うときは `docker start` されます。ファイルシステムの状態は残りますが、裏で動いていたプロセスは残りません。
- **プロファイルを切り替える**と、コンテナどうしは互いに見えなくなります — `hermes-profile=work` のラベルが付いたコンテナは、`hermes-profile=research` で動いている Hermes のプロセスからは見えません。取り残されたコンテナの片付けもプロファイルの中だけなので、別のプロファイルのコンテナが誤って片付けられることはありません。ただしその代わり、もとのプロファイルで Hermes をもう一度動かすまで、自動では片付きません。
- **プロファイルをまたいで意図的に共有する** — 1つの信頼できる作業場所で一緒に作業させたいプロファイルには、`terminal:` の下に同じ空でない `docker_shared_container_key` を設定してください。これが置き換えるのは、コンテナの身元のラベルだけです。作業、外向き通信、ネットワークの食い違いの確認は今までどおり行われます。この項目を持たないプロファイルは隔てられたままです。身元のラベルは、その値から短い要約を付けて作られるので、似た値（`team/workspace` と `team_workspace`）が1つのコンテナにまとまってしまうことはありません。**大事な点として、共有のコンテナは最初に起動したプロファイルによって一度だけ作られます** — そのプロファイルの `docker_image`、ボリューム、共有メモリの大きさ、そのほか後から変えられない Docker の設定が採用され、あとから来たプロファイルはそのままつなぎます。設定が違っていても、コンテナが取り除かれて作り直されるまでは無視されます。同じ値を共有するプロファイルどうしは、イメージとマウントについて合意しておくべきです。

`delegate_task(tasks=[...])` で並行に起動したサブエージェントは、この1つのコンテナを共有します — 同時に `cd` したり、環境を変えたり、同じ場所へ書き込んだりすればぶつかります。サブエージェントに隔てられたサンドボックスが必要なら、`register_task_env_overrides()` を使って作業ごとのイメージの上書きを登録しなければなりません。強化学習やベンチマークの環境（TerminalBench2、HermesSweEnv など）は、作業ごとの Docker のイメージのためにこれを自動で行っています。

**安全のための備え:**
- `--cap-drop ALL` にしたうえで、`DAC_OVERRIDE`、`CHOWN`、`FOWNER` だけを戻します
- `--security-opt no-new-privileges`
- `--pids-limit 256`
- `/tmp`（512MB）、`/var/tmp`（256MB）、`/run`（64MB）に大きさを限った tmpfs

**認証情報の受け渡し:** `docker_forward_env` に並べた環境変数は、まずシェルの環境から、次に `~/.hermes/.env` から探されます。スキルが `required_environment_variables` を宣言していれば、それらも自動で合わせて渡されます。

#### 環境変数による上書き {#environment-variable-overrides}

`terminal:` の下にあるすべての項目には、`TERMINAL_<KEY_UPPERCASE>` という形の環境変数による上書きがあります。docker のバックエンドでよく使うものを挙げます。

| 環境変数 | 対応する項目 | 補足 |
|---|---|---|
| `TERMINAL_DOCKER_IMAGE` | `docker_image` | 土台のイメージ |
| `TERMINAL_DOCKER_FORWARD_ENV` | `docker_forward_env` | JSON の配列: `'["GITHUB_TOKEN","OPENAI_API_KEY"]'` |
| `TERMINAL_DOCKER_ENV` | `docker_env` | JSON の辞書: `'{"DEBUG":"1"}'` |
| `TERMINAL_DOCKER_VOLUMES` | `docker_volumes` | `"host:container[:ro]"` の文字列を並べた JSON の配列 |
| `TERMINAL_DOCKER_EXTRA_ARGS` | `docker_extra_args` | JSON の配列 |
| `TERMINAL_DOCKER_MOUNT_CWD_TO_WORKSPACE` | `docker_mount_cwd_to_workspace` | `true` / `false` |
| `TERMINAL_DOCKER_RUN_AS_HOST_USER` | `docker_run_as_host_user` | `true` / `false` |
| `TERMINAL_DOCKER_NETWORK` | `docker_network` | `true` / `false` — 初期値は `true`。`false` は `--network=none` です |
| `TERMINAL_DOCKER_PERSIST_ACROSS_PROCESSES` | `docker_persist_across_processes` | `true` / `false` — 初期値は `true` |
| `TERMINAL_DOCKER_SHARED_CONTAINER_KEY` | `docker_shared_container_key` | 信頼するプロファイルどうしで共有する身元をはっきり指定します。初期状態では空です |
| `TERMINAL_DOCKER_ORPHAN_REAPER` | `docker_orphan_reaper` | `true` / `false` — 初期値は `true` |
| `TERMINAL_CONTAINER_CPU` | `container_cpu` | CPU のコア数 |
| `TERMINAL_CONTAINER_MEMORY` | `container_memory` | MB |
| `TERMINAL_CONTAINER_DISK` | `container_disk` | MB |
| `TERMINAL_CONTAINER_PERSISTENT` | `container_persistent` | `true` / `false` — バインドマウントする作業場所のディレクトリを決めます。`docker_persist_across_processes` とは別のものです |
| `TERMINAL_LIFETIME_SECONDS` | `lifetime_seconds` | 放置を片付けるまでの時間の窓 |
| `TERMINAL_TIMEOUT` | `timeout` | コマンドごとの待ち時間の上限 |
| `HERMES_DOCKER_BINARY` | _なし_ | 使う docker / podman のバイナリの場所を指定します |

### ssh のバックエンド {#ssh-backend}

SSH 越しに、リモートのサーバーでコマンドを動かします。接続を使い回すために ControlMaster を使います（5分間は放置しても保たれます）。シェルを残す設定は初期状態で有効なので、状態（作業ディレクトリ、環境変数）はコマンドをまたいで残ります。

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

| 変数 | 初期値 | 説明 |
|----------|---------|-------------|
| `TERMINAL_SSH_PORT` | `22` | SSH のポート |
| `TERMINAL_SSH_KEY` | （システムの既定） | SSH の秘密鍵の場所 |
| `TERMINAL_SSH_PERSISTENT` | `true` | シェルを残す設定を有効にします |

**仕組み:** 最初に `BatchMode=yes` と `StrictHostKeyChecking=accept-new` を付けてつなぎます。シェルを残す設定では、リモートのホストで `bash -l` のプロセスを1つ生かしたまま、一時的なファイルを介してやり取りします。`stdin_data` や `sudo` が必要なコマンドは、自動的に1回かぎりの実行に切り替わります。

### modal のバックエンド {#modal-backend}

[Modal](https://modal.com) のクラウドのサンドボックスでコマンドを動かします。作業ごとに、CPU・メモリ・ディスクを指定できる隔てられた仮想マシンが用意されます。ファイルシステムはセッションをまたいで控えを取り、戻せます。

```yaml
terminal:
  backend: modal
  container_cpu: 1                 # CPU cores
  container_memory: 5120           # MB (5GB)
  container_disk: 51200            # MB (50GB)
  container_persistent: true       # Snapshot/restore filesystem
```

**必要なもの:** `MODAL_TOKEN_ID` と `MODAL_TOKEN_SECRET` の環境変数、または `~/.modal.toml` の設定ファイルのどちらかです。

**残し方:** 有効にすると、片付けのときにサンドボックスのファイルシステムの控えを取り、次のセッションで戻します。控えは `~/.hermes/modal_snapshots.json` で管理されます。残るのはファイルシステムの状態だけで、動いているプロセスや PID の空間、裏で動いていたジョブは残りません。

**認証情報のファイル:** `~/.hermes/` から自動でマウントされ（OAuth のトークンなど）、コマンドのたびにそろえられます。

### daytona のバックエンド {#daytona-backend}

[Daytona](https://daytona.io) の運用込みの作業場所でコマンドを動かします。停止と再開によって状態を残せます。

```yaml
terminal:
  backend: daytona
  container_cpu: 1                 # CPU cores
  container_memory: 5120           # MB → converted to GiB
  container_disk: 10240            # MB → converted to GiB (max 10 GiB)
  container_persistent: true       # Stop/resume instead of delete
```

**必要なもの:** `DAYTONA_API_KEY` の環境変数です。

**残し方:** 有効にすると、片付けのときにサンドボックスは削除ではなく停止され、次のセッションで再開されます。サンドボックスの名前は `hermes-{task_id}` の形になります。

**ディスクの上限:** Daytona は 10 GiB を上限としています。それを越える指定は、警告とともにそこまで抑えられます。

### vercel_sandbox のバックエンド {#vercel-sandbox-backend}

[Vercel Sandbox](https://vercel.com/docs/vercel-sandbox) のクラウドのマイクロ VM でコマンドを動かします。Hermes はふだんどおりのターミナルとファイルのツールを使います。Vercel 専用のツールをモデルに見せることはありません。

```yaml
terminal:
  backend: vercel_sandbox
  vercel_runtime: node24          # node24 | node22 | python3.13
  cwd: /vercel/sandbox            # default workspace root
  container_persistent: true      # Snapshot/restore filesystem
  container_disk: 51200           # Shared default only; custom disk is unsupported
```

**必要な導入:** 任意の SDK を追加で入れてください。

```bash
pip install 'hermes-agent[vercel]'
```

**必要な認証:** `VERCEL_TOKEN`、`VERCEL_PROJECT_ID`、`VERCEL_TEAM_ID` の3つをそろえて、アクセストークンによる認証を設定します。Render、Railway、Docker などのホストで長く動かす Hermes や、実際の運用ではこの形が正式なやり方です。

手元での使い捨ての開発なら、Hermes は短命な Vercel の OIDC のトークンも受け付けます。

```bash
VERCEL_OIDC_TOKEN="$(vc project token <project-name>)" hermes chat
```

Vercel のプロジェクトに結び付いたディレクトリからなら、プロジェクト名を省けます。

```bash
VERCEL_OIDC_TOKEN="$(vc project token)" hermes chat
```

OIDC のトークンは短命なので、正式な運用の道として使うべきではありません。

**実行環境:** `terminal.vercel_runtime` は `node24`、`node22`、`python3.13` に対応します。設定しなければ、Hermes は `node24` を使います。

**残し方:** `container_persistent: true` のとき、Hermes は片付けのあいだにサンドボックスのファイルシステムの控えを取り、同じ作業のためにあとから作るサンドボックスをその控えから戻します。控えの中には、Hermes がサンドボックスへ写した認証情報、スキル、キャッシュのファイルが含まれることがあります。残るのはファイルシステムの状態だけです。サンドボックスそのものの身元、PID の空間、シェルの状態、裏で動いていたプロセスは残りません。

**裏で動かすコマンド:** `terminal(background=true)` は、手元以外で裏の処理を動かすための Hermes 共通の仕組みを使います。サンドボックスが生きているあいだは、ふだんのプロセスのツールで起動・確認・待機・ログの表示・停止ができます。片付けや再起動のあと、Vercel の切り離されたプロセスを取り戻す仕組みは Hermes にはありません。

**ディスクの大きさ:** Vercel Sandbox は、いまのところ Hermes の `container_disk` の設定に対応していません。`container_disk` は設定しないままにするか、共通の初期値の `51200` にしてください。それ以外の値は黙って無視されるのではなく、点検とバックエンドの用意が失敗します。

### singularity / apptainer のバックエンド {#singularityapptainer-backend}

[Singularity / Apptainer](https://apptainer.org) のコンテナでコマンドを動かします。Docker が使えない HPC のクラスタや共有のマシン向けの仕組みです。

```yaml
terminal:
  backend: singularity
  singularity_image: "docker://nikolaik/python-nodejs:python3.11-nodejs20"
  container_cpu: 1                 # CPU cores
  container_memory: 5120           # MB
  container_persistent: true       # Writable overlay persists across sessions
```

**必要なもの:** `$PATH` に `apptainer` か `singularity` のバイナリがあることです。

**イメージの扱い:** Docker の URL（`docker://...`）は自動で SIF のファイルに変換され、キャッシュされます。すでにある `.sif` のファイルはそのまま使われます。

**一時作業のディレクトリ:** 次の順で決まります。`TERMINAL_SCRATCH_DIR` → `TERMINAL_SANDBOX_DIR/singularity` → `/scratch/$USER/hermes-agent`（HPC の慣習）→ `~/.hermes/sandboxes/singularity`。

**隔たり:** `--containall --no-home` を使い、ホストのホームのディレクトリをマウントせずに名前空間を完全に隔てます。

### ターミナルのバックエンドでよくある困りごと {#common-terminal-backend-issues}

ターミナルのコマンドがすぐ失敗する場合や、ターミナルのツールが無効と表示される場合は、次を確かめてください。

- **local** — 特別に必要なものはありません。使い始めのときにいちばん安全な選択です。
- **docker** — `docker version` を実行して、Docker が動いていることを確かめます。だめなら Docker を直すか、`hermes config set terminal.backend local` にします。
- **ssh** — `TERMINAL_SSH_HOST` と `TERMINAL_SSH_USER` の両方が必要です。どちらかが足りなければ、Hermes がはっきりしたエラーを記録します。
- **modal** — `MODAL_TOKEN_ID` の環境変数か `~/.modal.toml` が必要です。`hermes doctor` で確かめられます。
- **daytona** — `DAYTONA_API_KEY` が必要です。サーバーの URL の設定は Daytona の SDK が受け持ちます。
- **singularity** — `$PATH` に `apptainer` か `singularity` が必要です。HPC のクラスタではよく入っています。

迷ったら、`terminal.backend` を `local` に戻して、まずそこでコマンドが動くことを確かめてください。

### 片付けのときにリモートからホストへ状態を戻す {#remote-to-host-state-sync-on-teardown}

**ssh**、**modal**、**daytona** のバックエンドでは、Hermes はセッションのあいだ `~/.hermes/` の状態（認証情報のファイル、スキル、キャッシュ）をリモートのサンドボックスへ送り込み、片付けのときに**変わった状態のファイルをもとの場所へ戻します**。最初に送ったものと違うファイル（中身のハッシュで比べます）は、その場に書き戻されます。そろえたディレクトリの下に新しくできたリモートのファイル（たとえばエージェントがリモートで作ったスキル）は、対応するホストの場所へ写されます。送るだけの認証情報のファイルが、ホスト側で上書きされることはありません。

- 書き戻しは待ち時間を置きながら最大3回まで試み、2 GiB を越えるリモートの書庫は展開しません。
- docker と singularity はバインドマウント（ホストのファイルシステムをそのまま見る形）なので、この仕組みは要りません。
- 対象になるのは Hermes の状態（`~/.hermes/`）で、サンドボックスの中の作業中のファイル全般では**ありません** — 大事な成果物は、サンドボックスが消される前にエージェントへはっきり運び出させてください（`scp`、`modal volume put` など）。

### Docker のボリュームのマウント {#docker-volume-mounts}

docker のバックエンドを使うとき、`docker_volumes` でホストのディレクトリをコンテナと共有できます。各項目は Docker の `-v` と同じ書き方です: `host_path:container_path[:options]`。

```yaml
terminal:
  backend: docker
  docker_volumes:
    - "/home/user/projects:/workspace/projects"   # Read-write (default)
    - "/home/user/datasets:/data:ro"              # Read-only
    - "/home/user/.hermes/cache/documents:/output" # Gateway-visible exports
```

これは次のようなときに役立ちます。
- エージェントに**ファイルを渡す**（データ、設定、参考にするコード）
- エージェントから**ファイルを受け取る**（生成されたコード、報告書、書き出したもの）
- 自分とエージェントが同じファイルを触る、**共有の作業場所**

メッセージのゲートウェイを使っていて、生成したファイルを
`MEDIA:/...` でエージェントに送らせたいなら、
`/home/user/.hermes/cache/documents:/output` のような、ホストから見える専用の書き出し先を用意してください。

- Docker の中では `/output/...` にファイルを書きます
- `MEDIA:` には**ホスト側の場所**を書きます。たとえば
  `MEDIA:/home/user/.hermes/cache/documents/report.txt` のようにします
- ホスト側のゲートウェイのプロセスから見ても同じ場所が存在するのでない限り、
  `/workspace/...` や `/output/...` を**書かないでください**

:::warning
YAML では、同じ項目名が2度出てくると、あとのものが黙って前を上書きします。すでに
`docker_volumes:` のまとまりがあるなら、あとから別の `docker_volumes:` を足すのではなく、
同じ並びに新しいマウントを書き足してください。
:::

環境変数でも設定できます: `TERMINAL_DOCKER_VOLUMES='["/host:/container"]'`（JSON の配列）。

### Docker への認証情報の受け渡し {#docker-credential-forwarding}

初期状態では、Docker のターミナルのセッションがホストの認証情報を勝手に受け継ぐことはありません。特定のトークンをコンテナの中で使いたいなら、`terminal.docker_forward_env` に足してください。

```yaml
terminal:
  backend: docker
  docker_forward_env:
    - "GITHUB_TOKEN"
    - "NPM_TOKEN"
```

Hermes は並べた変数を、まずいまのシェルから探し、なければ `hermes config set` で保存された `~/.hermes/.env` を見ます。

:::warning
`docker_forward_env` に並べたものは、コンテナの中で動くコマンドから見えるようになります。ターミナルのセッションにさらしても構わない認証情報だけを渡してください。
:::

### コンテナをホストのユーザーとして動かす {#running-the-container-as-your-host-user}

初期状態では、Docker のコンテナは `root`（UID 0）として動きます。`/workspace` やほかのバインドマウントの中で作られたファイルは、ホスト側では root の持ち物になるので、セッションのあとで `sudo chown` しないと、ホストのエディタから直せません。`terminal.docker_run_as_host_user` はこれを解決します。

```yaml
terminal:
  backend: docker
  docker_run_as_host_user: true   # default: false
```

有効にすると、Hermes は `docker run` のコマンドに `--user $(id -u):$(id -g)` を足すので、バインドマウントしたディレクトリ（`/workspace`、`/root`、`docker_volumes` に書いたもの）へ書かれたファイルは root ではなく、自分のホストのユーザーの持ち物になります。引き換えに、コンテナはもう `apt install` したり、`/root/.npm` のような root が持つ場所へ書いたりできなくなります。両方が必要なら、`HOME` を root 以外のユーザーが持つ土台のイメージを使うか、必要な道具をイメージを作るときに入れておいてください。

互換のために、初期値の `false` のままにしておいて構いません。作業のほとんどが「マウントしたホストのファイルを直すこと」で、`sudo chown -R` にうんざりしているなら有効にしてください。

### 任意: 起動したディレクトリを `/workspace` にマウントする {#optional-mount-the-launch-directory-into-workspace}

Docker のサンドボックスは初期状態では隔てられたままです。はっきり有効にしない限り、Hermes がいまのホストの作業ディレクトリをコンテナへ渡すことは**ありません**。

`config.yaml` で有効にします。

```yaml
terminal:
  backend: docker
  docker_mount_cwd_to_workspace: true
```

有効にすると、次のようになります。
- `~/projects/my-app` から Hermes を起動すると、そのホストのディレクトリが `/workspace` にバインドマウントされます
- docker のバックエンドは `/workspace` から始まります
- ファイルのツールもターミナルのコマンドも、同じマウントされたプロジェクトを見ます

無効のままなら、`docker_volumes` ではっきり何かをマウントしない限り、`/workspace` はサンドボックスのものであり続けます。

安全との兼ね合いは次のとおりです。
- `false` はサンドボックスの境界を保ちます
- `true` は、Hermes を起動したディレクトリにサンドボックスから直接触れるようにします

コンテナにホストのファイルをそのまま触らせたいと意識して思ったときにだけ、有効にしてください。

### 残り続けるシェル {#persistent-shell}

初期状態では、ターミナルのコマンドはそれぞれ自分の子プロセスで動きます — 作業ディレクトリ、環境変数、シェルの変数はコマンドごとに元に戻ります。**シェルを残す設定**を有効にすると、`execute()` の呼び出しをまたいで1つの長く生きる bash のプロセスが保たれるので、状態がコマンドのあいだで残ります。

いちばん役に立つのは **ssh のバックエンド** で、コマンドごとの接続の手間もなくなります。シェルを残す設定は **ssh では初期状態で有効**で、local のバックエンドでは無効です。

```yaml
terminal:
  persistent_shell: true   # default — enables persistent shell for SSH
```

止めるには次のようにします。

```bash
hermes config set terminal.persistent_shell false
```

**コマンドをまたいで残るもの:**
- 作業ディレクトリ（`cd /tmp` は次のコマンドでも効いています）
- 書き出した環境変数（`export FOO=bar`）
- シェルの変数（`MY_VAR=hello`）

**優先順位:**

| 段階 | 変数 | 初期値 |
|-------|----------|---------|
| 設定 | `terminal.persistent_shell` | `true` |
| ssh での上書き | `TERMINAL_SSH_PERSISTENT` | 設定に従います |
| local での上書き | `TERMINAL_LOCAL_PERSISTENT` | `false` |

バックエンドごとの環境変数がいちばん優先されます。local のバックエンドでもシェルを残したいなら、次のようにします。

```bash
export TERMINAL_LOCAL_PERSISTENT=true
```

:::note
`stdin_data` や sudo が必要なコマンドは、自動的に1回かぎりの実行に切り替わります。残したシェルの標準入力は、すでにやり取りの仕組みが使っているからです。
:::

それぞれのバックエンドの詳しい説明は、[コードの実行](/hermes/docs/user-guide/features/code-execution/)と [README のターミナルの節](/hermes/docs/user-guide/features/tools/)を参照してください。

## スキルの設定 {#skill-settings}

スキルは、自分の SKILL.md の frontmatter で独自の設定の項目を宣言できます。これらは秘密ではない値（場所、好み、その分野の設定）で、`config.yaml` の `skills.config` の下に保存されます。

```yaml
skills:
  config:
    myplugin:
      path: ~/myplugin-data   # Example — each skill defines its own keys
```

**スキルの設定の仕組み:**

- `hermes config migrate` は有効なスキルをすべて調べ、まだ設定されていない項目を見つけて、入力を促します
- `hermes config show` はスキルの設定を「Skill Settings」の下に、どのスキルのものかとあわせて表示します
- スキルが読み込まれると、解決された設定の値がスキルの文脈へ自動的に差し込まれます

**値を手で設定する:**

```bash
hermes config set skills.config.myplugin.path ~/myplugin-data
```

自分のスキルで設定の項目を宣言する方法については、[スキルを作る — 設定の項目](/hermes/docs/developer-guide/creating-skills/#config-settings-configyaml)を参照してください。

### エージェントが作るスキルの書き込みへの見張り {#guard-on-agent-created-skill-writes}

エージェントが `skill_manage` でスキルを作ったり、編集したり、直したり、消したりするとき、Hermes はその新しい内容に危険な言葉の並び（認証情報の収集、あからさまなプロンプトの注入、情報の持ち出しの指示）がないかを調べられます。この検査は**初期状態では止まっています** — `~/.ssh/` にきちんとした理由で触れたり、`$OPENAI_API_KEY` に言及したりする本物の作業が、あまりに頻繁に引っかかったためです。エージェントのスキルの書き込みが反映される前に確認を出してほしいなら、有効に戻してください。

```yaml
skills:
  guard_agent_created: true   # default: false
```

有効にすると、引っかかった `skill_manage` の書き込みは、検査がそう判断した理由とともに承認の確認として出てきます。承認すれば反映され、断ればエージェントに理由を添えたエラーが返ります。

### スキルの書き込みへの承認 {#write-approval-for-skill-writes}

上の内容の検査とは別に、`skills.write_approval` はエージェントによる**すべての**スキルの書き込み（作成 / 編集 / 修正 / 削除 / 付属ファイル）を、自分の承認の後ろに置きます。危険なコマンドと同じ、承認と拒否の仕組みです。

```yaml
skills:
  write_approval: false   # false = write freely (default) | true = stage every write for review
```

有効にすると、スキルの書き込みは `~/.hermes/pending/skills/` に控えられ、`/skills pending`、`/skills diff <id>`、`/skills approve <id>`、`/skills reject <id>` で確認します。CLI からでも、どのメッセージのプラットフォームからでも使えます。動かしたまま `/skills approval on|off` で切り替えられます。記憶にも同じ仕組みがあります（下の `memory.write_approval`）。詳しい流れは [エージェントのスキルの書き込みを関門にかける](/hermes/docs/user-guide/features/skills/#gating-agent-skill-writes-skillswrite_approval)を参照してください。

## 記憶の設定 {#memory-configuration}

```yaml
memory:
  memory_enabled: true
  user_profile_enabled: true
  memory_char_limit: 2200   # ~800 tokens
  user_char_limit: 1375     # ~500 tokens
  write_approval: false     # true = require approval before any memory write
```

`memory.write_approval: true` にすると、記憶への書き込みは反映される前に承認が必要になります。対話的な CLI のやり取りではその場で確認が出ます。メッセージのセッションや、裏で動く自己改善の見直しでは、書き込みが控えられ、`/memory pending` → `/memory approve <id>` / `/memory reject <id>` で確認します。動かしたまま `/memory approval on|off` で切り替えられます。[記憶への書き込みを制御する](/hermes/docs/user-guide/features/memory/#controlling-memory-writes-write_approval)を参照してください。

## 文脈のファイルの切り詰め {#context-file-truncation}

自動で読み込む文脈のファイルについて、先頭と末尾を残す切り詰めをかける前に、Hermes がどれだけの中身を読むかを決めます。これはシステムのプロンプトへ差し込まれるファイル、たとえば `SOUL.md`、`.hermes.md`、`AGENTS.md`、`CLAUDE.md`、`.cursorrules` に効きます。`read_file` のツールには**効きません**。

```yaml
context_file_max_chars: null  # default — dynamic cap scaled to the model's context window (floor 20K, ceiling 500K chars)
```

自動で決めさせるかわりに固定の上限にしたいなら、正の整数を書きます。

```yaml
context_file_max_chars: 25000
```

## ファイルの読み込みの安全 {#file-read-safety}

`read_file` の1回の呼び出しが返せる中身の量を決めます。上限を越える読み込みは断られ、`offset` と `limit` で範囲を狭めるようエージェントに伝えるエラーが返ります。これによって、小さくまとめられた JS の一式や大きなデータのファイルを一度読んだだけで、文脈の窓があふれるのを防げます。

```yaml
file_read_max_chars: 100000  # default — ~25-35K tokens
```

文脈の窓が大きいモデルを使っていて、大きなファイルをよく読むなら上げてください。文脈の小さいモデルでは、読み込みを効率よく保つために下げてください。

```yaml
# Large context model (200K+)
file_read_max_chars: 200000

# Small local model (16K context)
file_read_max_chars: 30000
```

エージェントは、ファイルの読み込みの重複も自動で省きます。同じファイルの同じ範囲を2度読み、そのあいだにファイルが変わっていなければ、中身を送り直すかわりに軽い目印だけが返ります。文脈の圧縮が起きると、この記録はいったん消えるので、中身が要約されて消えたあとでも、エージェントはファイルを読み直せます。

## ツールの出力の切り詰めの上限 {#tool-output-truncation-limits}

Hermes が切り詰める前に、ツールがそのまま返せる量を、3つの関連する上限で決めます。

```yaml
tool_output:
  max_bytes: 50000        # terminal output cap (chars)
  max_lines: 2000         # read_file pagination cap
  max_line_length: 2000   # per-line cap in read_file's line-numbered view
```

- **`max_bytes`** — `terminal` のコマンドの標準出力と標準エラー出力を合わせた文字数がこれを越えると、Hermes は最初の40%と最後の60%を残し、そのあいだに `[OUTPUT TRUNCATED]` の知らせを挟みます。初期値は `50000` です（よくある数え方でおよそ1万2千〜1万5千トークンにあたります）。
- **`max_lines`** — `read_file` の1回の呼び出しの `limit` の上限です。これを越える指定は抑えられるので、一度の読み込みで文脈の窓があふれることはありません。初期値は `2000` です。
- **`max_line_length`** — `read_file` が行番号付きで表示するときの、1行あたりの上限です。これより長い行はこの文字数で切られ、後ろに `... [truncated]` が付きます。初期値は `2000` です。

文脈の窓が大きく、1回あたりの出力に余裕のあるモデルでは上げてください。文脈の小さいモデルでは、ツールの結果を小さく保つために下げてください。

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

### ツールの結果のあふれ分の扱い {#tool-result-spillover-budget}

切り詰めとは別に、大きすぎるツールの *結果* は切られるのではなくディスクへ逃がされます。全文が `$HERMES_HOME/cache/spillover/` に保存され、文脈に載る中身は、さわりの部分と保存先の場所に置き換わります（`offset` と `limit` を付けた `read_file` で読めますし、`execute_code` で処理することもできます）。結果1件あたりの一般的なしきい値は10万文字で、文脈の小さいモデルでは自動的に下がります。

MCP のツールの結果（名前が `mcp_*` のもの）は、より厳しい**5万文字**を初期値としています。MCP のサーバーは、ページに分かれていない大きな中身（ツールの一覧、まとめて実行した結果）をよく返すので、一般的なしきい値のままだと、以降のやり取りのたびに文脈を膨らませてしまうからです。失われるものはありません — 全文はディスクに残ります。しきい値は次のように上書きできます。

```yaml
tool_budget:
  mcp_result_size_chars: 50000   # per-result spillover threshold for mcp_* tools
```

MCP のしきい値は、（文脈に合わせて下がることもある）一般的なしきい値を越えないように必ず抑えられるので、上げてもいま使っているモデルの窓が許す以上にはなりません。

Hermes は、**送り手の側で省略されたこと**も知らせます。MCP やウェブのツールの結果に、それ自身の省略の目印（`...N more items`、`"has_more": true`、サンドボックスに保存した旨の注記）が含まれているとき、見えているデータが不完全であり、すべて出そろったと考える前にページをめくるか取り直すべきだという1行の注意が、結果の末尾に足されます。

## ツールセットの全体的な停止 {#global-toolset-disable}

CLI とすべてのゲートウェイのプラットフォームにまたがって、特定のツールセットを1か所で
止めたいときは、その名前を `agent.disabled_toolsets` の下に並べます。

```yaml
agent:
  disabled_toolsets:
    - memory       # hide memory tools + MEMORY_GUIDANCE injection
    - web          # no web_search / web_extract anywhere
```

これはプラットフォームごとのツールの設定（`hermes tools` が書く
`platform_toolsets`）の**あと**に効くので、ここに並べたツールセットは必ず取り除かれます。
プラットフォームの保存された設定にまだ載っていても同じです。`hermes tools` の画面で15行以上の
プラットフォームを直していくかわりに、「これをどこでも止める」という1つの
スイッチがほしいときに使ってください。

並びを空にしたり、この項目を書かなかったりした場合は、何も起こりません。

## git の worktree による隔離 {#git-worktree-isolation}

同じリポジトリで複数のエージェントを並行して動かすために、隔てられた git の worktree を有効にします。

```yaml
worktree: true    # Always create a worktree (same as hermes -w)
# worktree: false # Default — only when -w flag is passed
```

有効にすると、CLI のセッションごとに `.worktrees/` の下へ、自分のブランチを持つ新しい worktree が作られます。エージェントどうしは互いを邪魔せずに、ファイルを直し、コミットし、push し、PR を作れます。きれいな worktree は終了時に取り除かれ、変更が残っているものは手で直せるように残されます。

初期状態では、新しい worktree は**取ってきたばかりのリモートの先端**（いまのブランチの上流、なければリモートの既定のブランチ）から枝分かれします。手元のクローンの、古いかもしれない `HEAD` からではなく、プロジェクトの現状から始めるためです。こうすると PR の差分が、手元のクローンが遅れていた分を巻き込まずに、実際の変更だけに収まります。手元の `HEAD` から枝分かれさせたいなら `worktree_sync: false` にしてください — オフラインのときや、クローンのいまの状態をそのまま土台にしたいときに役立ちます。リモートに届かない場合は、自動で手元の `HEAD` に切り替わります。

```yaml
worktree_sync: true    # Default — branch from the fetched remote tip
# worktree_sync: false # Branch from local HEAD (offline / pinned base)
```

リポジトリの根元に `.worktreeinclude` を置けば、git で無視しているファイルのうち worktree へ写したいものを並べられます。

```
# .worktreeinclude
.env
.venv/
node_modules/
```

## 文脈の圧縮 {#context-compression}

Hermes は、モデルの文脈の窓に収まるよう、長い会話を自動で圧縮します。圧縮の要約は別の LLM の呼び出しなので、どのプロバイダーや接続先にでも向けられます。

圧縮の設定はすべて `config.yaml` にあります（環境変数はありません）。

### すべての項目 {#full-reference}

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

:::info 従来の設定からの移行
`compression.summary_model`、`compression.summary_provider`、`compression.summary_base_url` を使っていた古い設定は、最初に読み込むときに自動で `auxiliary.compression.*` へ移されます（設定のバージョン17）。手で行うことはありません。
:::

`progress_notices`（初期値は `false`）は、**ふだんの**圧縮の進み具合が、チャットのプラットフォーム（Telegram、Discord、Slack など）に届くかどうかを決めます。設計として、自動の圧縮はチャットの画面では静かに行われます — 裏で走り、記録はサーバー側にだけ残ります。`progress_notices: true` にすると、ふだんの流れをチャットのプラットフォームで見られるようになります。「Compacting context…」の開始の知らせ、事前確認や API を呼ぶ前の圧縮のきっかけ、放置後の圧縮、やり直しの進み具合（「Compressed 30 → 12 messages, retrying…」）、そして「Context compaction complete」の知らせです。この関門は圧縮の状態だけに効きます — 関係のない運用上の雑音（補助のモデルの失敗、プロバイダーの回数制限ややり直しのやり取り）は、どちらにしても出ません。圧縮の**失敗**の知らせと、手で実行した `/compress` の反応は、この設定にかかわらず必ず表示されます。動いているゲートウェイでこの値を変えると、次のメッセージから効きます。

`hygiene_hard_message_limit` は、ゲートウェイだけにある**圧縮前の安全弁**です。悪循環を断つためにあります。大きくなりすぎたセッションで API の呼び出しが切れ続けると、ゲートウェイはトークンの使用量を受け取れず、トークンを基準にしたしきい値が働かず、記録はさらに伸びて、切断はもっとひどくなります。この件数を基準にした下限は、（API が失敗しても必ず分かる）メッセージの数だけで働き、圧縮を強いてセッションを立て直します。初期値は `5000` で、ふつうのセッションよりはるかに大きく、文脈が大きい（100万以上の）モデルで短いやり取りを何千回もする場合でも、これよりずっと前にトークンのしきい値で圧縮されます。変わったプラットフォームではもっと上げ、もっと積極的に圧縮させたいなら下げてください。動いているゲートウェイでこの値を変えると、次のメッセージから効きます（下を参照してください）。

`hygiene_timeout_seconds` は、この、エージェントの前で行う圧縮についてのゲートウェイの**何もしていない時間の上限**です。全体の経過時間の上限ではありません。圧縮の要約の呼び出しはモデルから少しずつ届き、届いたトークン1つ1つが前進とみなされます。ですから、じっくり考えて生成を続けている遅いモデルは自分で締め切りを延ばしていくので、遅くても健全な要約のモデルが生成の途中で打ち切られることはありません。要約のモデルがこの秒数のあいだ**何も出さなかった**とき（裏側が落ちている、接続が固まっている、送り手が黙っている）にだけ、ゲートウェイは利用者に警告し、圧縮せずに届いたメッセージの処理を続け、そのセッションについて一時的な失敗の待ち時間を記録します。固まったように見えることはありません。

`hygiene_total_ceiling_seconds`（初期値は `600`）は、トークンがまだ動いていても全体の待ち時間を区切ります。ちょろちょろとしか届かない応答が、やり取りをいつまでも押さえ込むことがないようにするためです。この値は少なくとも `hygiene_timeout_seconds` 以上に収められます。

`hygiene_failure_cooldown_seconds` は、この圧縮が時間切れになったり中断したりしたあとの、セッションごとの待ち時間を決めます。待っているあいだ、ゲートウェイは同じ大きすぎるセッションについて繰り返しの試みを飛ばすので、届いたメッセージのすべてが同じ壊れた補助の裏側で止まることはありません。`/compress`、`/reset`、あるいはあとで健全なやり取りができれば、セッションは立て直せます。

この値は決まった間隔ではなく、伸びていく段の**最初の1段**です。同じセッションで失敗が続くと、`1x`、`3x`、`9x` と待ち、上限は1時間です。要約のモデルが完全に壊れているセッションは、決まった間隔で永遠に試み続けるのではなく、少しずつ間を空けていきます。記録が実際に短くなれば、最初の段に戻ります。この段の上がり方はセッションごとで、プロセスの中だけの話です — ゲートウェイを再起動すると最初の段に戻りますが、待ち時間の期限そのものは残ります。

`context_timeout_seconds`（初期値は `120`）は、エージェントの中の `compress_context` — 会話のやり取り、事前の圧縮、手で実行する `/compress` — についての、同じ**何もしていない時間の上限**です。固まった要約のモデルが、セッションをいつまでも止めてしまわないようにします。届いた要約のトークンが待ち時間を延ばし、黙っているときだけ打ち切られます。時間切れになると Hermes は圧縮を飛ばし、いまのメッセージをそのまま保ち、利用者に警告します。`0` にすると止まります。ゲートウェイのセッションの手入れは自分の `hygiene_timeout_seconds` の経路を持っていて、二重に包まれることはありません。

`context_total_ceiling_seconds`（初期値は `600`）は、トークンがまだ動いていても、エージェントの中の**確定前の**待ち時間（要約と受け取りの段）を区切ります。この値は少なくとも `context_timeout_seconds` 以上に収められます。正確に言うと、**要約の段はこの上限で区切られ、確定の段は上限を越えたら記録され知らされます。** いったん圧縮の確定の区切りに入って SessionDB への書き込みが始まったら、その確定が途中で捨てられることはありません — 記録が食い違うおそれがあるからです。ただし、待つあいだが黙ったままになることもありません。確定が上限を越えたら、Hermes はその超過を記録し（WARNING で、繰り返せば ERROR に上がります）、利用者に見える警告の経路で一度だけ知らせ、確定が終わるまで区切りながら待ち続けます。

`protect_first_n` は、圧縮のたびに固定しておく**システム以外の**先頭のメッセージの数を決めます。初期値は `3` で、最初の利用者とアシスタントのやり取りが要約のたびに残るので、もともとの目的が見えたままになります。転がるように圧縮が続く長いセッションで、最初のやり取りがもう関係ないなら、`protect_first_n: 0` にして、システムのプロンプトと要約と末尾のほかは何も固定しないようにできます。システムのプロンプト自体は、この設定にかかわらず必ず残ります。

`in_place`（初期値は `true`）は、圧縮が起きたときにセッションの身元がどうなるかを決めます。`true` のとき、圧縮はメッセージの並びを書き換えてシステムのプロンプトを組み直しますが、**セッションの id は入れ替えません** — その会話は一生を通して1つの変わらない id を持ちます（`parent_session_id` のつながりも、セッションの一覧での `name #2` や `#3` の番号付けもありません）。圧縮は失われるものがありません。いま使っている文脈は縮みますが、圧縮する前のやり取りは同じ id の下にそっと控えられ（動いていない・圧縮済みという印が付きます）、`session_search` で今も探せますし、取り戻せます。消されるわけではありません。フックは `session:compress` のできごとの `in_place` の項目でこの動きを知れます。`in_place: false` にすると、圧縮のたびに古いものと結び付いた新しいセッションの id へ移る、従来の動きに戻ります。

`threshold_tokens` は、圧縮のきっかけについて、任意の**絶対的なトークンの上限**を決めます。設定すると、割合で決まる `threshold` とこの絶対値のうち、早いほうで圧縮が起きます。ですから、どのモデルを使っていても、自分が決めたトークン数より遅く圧縮が起きることはありません。これは、文脈の窓の大きさが違うモデルを行き来する（たとえば100万から40万へ）と、実際のきっかけの位置がずれてしまう問題を解決します。この上限はモデルの文脈の長さに収められるので、モデルが対応する以上の値を書いても安全です — そのときは割合で決まるしきい値が使われます。初期値は `null`（無効。割合で決まるしきい値だけ）です。この上限は、モデルを切り替えても予備のモデルに移っても残ります。

`idle_compact_after_seconds` は、大きさで決まる `threshold` を補う、**任意で有効にする時間の**きっかけです。初期値は `0`（無効）です。0 より大きくすると、その秒数以上何もされずに置かれたあと再開したセッションは、最初の返事の前にそれまでの履歴をまとめて縮めます。ですから長く続くやり取り（たとえば何時間かぶりに戻ってきた Telegram の会話）が、以降のやり取りのたびに古い文脈を丸ごと読み直すことはありません。文脈がすでに圧縮後の目標（`threshold × target_ratio`）以下なら決して働きませんし、失敗後の待ち時間、暴れ防止、セッションごとの錠といった、自動の圧縮と同じ守りに従います。例: `idle_compact_after_seconds: 1800` にすると、30分放置したあとに縮めます。

`proactive_prune_tokens` は、`threshold` とは別に働く、LLM を使わない決まりきった古いツールの結果の刈り込みを有効にします。窓の大きいモデルでは `threshold` による圧縮（窓のおよそ50%）がめったに起きないので、かさばるツールの出力（ターミナルの吐き出し、ファイルの読み込み、ウェブの抽出）が履歴に居座り、以降のやり取りのたびに送り直されます。送り直される履歴が `proactive_prune_tokens`（初期値は `0` = 止まっています。有効にするなら `48000` あたりを試してください）を越えると、刈り込みは同じ結果の重複を省き、古くて大きなものを要約し、大きなツールの引数を切り詰めます。直近の `protect_last_n` のメッセージは守られ、モデルは呼ばれません。全文はセッションの保存先から取り戻せます。`proactive_prune_min_result_chars`（初期値は `8000`、200以上に収められます）は、これより小さいツールの結果には手を触れない、という大きさを決めます。`proactive_prune_min_reclaim_tokens`（初期値は `4096`）は、これだけのトークンを取り戻せないなら刈り込みを確定させません — 確定した刈り込みはすでに送った履歴を書き換え、送り手のプロンプトのキャッシュの前半を無効にします。この関門があることで、キャッシュが崩れるのはツールを呼ぶたびではなく、（圧縮の切れ目のような）意味のある1回だけに抑えられます。これは組み込みの `compressor` の仕組みでだけ動き、ほかの文脈の仕組みでは何も起こりません。

:::tip 圧縮と文脈の長さのゲートウェイでの読み直し
最近の版では、動いているゲートウェイの `config.yaml` で `model.context_length` や `compression.*` のどの項目を変えても、次のメッセージから効きます — ゲートウェイの再起動も、`/reset` も、セッションの入れ替えも要りません。キャッシュしているエージェントの見分けにこれらの項目が含まれているので、変化に気づくとゲートウェイが黙ってエージェントを組み直します。API キーやツール・スキルの設定は、これまでどおりの読み直しの手順が必要です。
:::

### よくある構成 {#common-setups}

**初期値（自動で判断） — 設定は要りません:**
```yaml
compression:
  enabled: true
  threshold: 0.50
```
主のプロバイダーと主のモデルを使います。ふだんのチャットのモデルより安いモデルで圧縮したいなら、作業ごとに上書きしてください（たとえば `auxiliary.compression.provider: openrouter` と `model: google/gemini-2.5-flash`）。

**特定のプロバイダーを指定する**（OAuth でも API キーでも）:
```yaml
auxiliary:
  compression:
    provider: nous
    model: gemini-3-flash
```
どのプロバイダーでも使えます: `nous`、`openrouter`、`codex`、`anthropic`、`main` など。

**独自の接続先**（自分で立てたもの、Ollama、zai、DeepSeek など）:
```yaml
auxiliary:
  compression:
    model: glm-4.7
    base_url: https://api.z.ai/api/coding/paas/v4
```
独自の OpenAI 互換の接続先を指します。認証には `OPENAI_API_KEY` を使います。

### 3つの設定の組み合わせ {#how-the-three-knobs-interact}

| `auxiliary.compression.provider` | `auxiliary.compression.base_url` | 結果 |
|---------------------|---------------------|--------|
| `auto`（初期値） | 未設定 | 使えるいちばん良いプロバイダーを自動で選びます |
| `nous` / `openrouter` など | 未設定 | そのプロバイダーを使い、その認証を使います |
| どれでも | 設定あり | その接続先を直接使います（プロバイダーの指定は無視されます） |

:::warning 要約のモデルに必要な文脈の長さ
要約のモデルは、主のエージェントのモデルと同じか、それ以上の文脈の窓を**必ず**持っていなければなりません。圧縮の仕組みは、会話の真ん中の部分を丸ごと要約のモデルへ送ります。そのモデルの文脈の窓が主のモデルより小さいと、要約の呼び出しは文脈の長さのエラーで失敗します。そうなると真ん中のやり取りは**要約されないまま落とされ**、会話の文脈が気づかないうちに失われます。モデルを上書きするなら、その文脈の長さが主のモデル以上であることを確かめてください。
:::

## ゲートウェイのやり取りの占有の待ち時間 {#gateway-turn-lease-timeout}

ゲートウェイは、2つの経路が同じ記録を同時に読み書きしないよう、やり取りを
解決されたセッション ID ごとに順番に並べます。占有を待つ最長の時間は、ふつうの
エージェントの何もしていない時間の上限とは別に設定できます。

```yaml
agent:
  gateway_turn_lease_timeout: 1800
```

この時間が尽きてもまだ別のやり取りがそのセッションを占有していると、Hermes は
安全側に倒れて止まります。待っているメッセージについて、記録を読むことも、モデルを
動かすこともしません。利用者には断りの知らせが届き、送り直す必要があります。Hermes が
自動で並べ直さないのは、順番と重複しない仕組みがないままそうすると、二重に処理される
おそれがあるからです。0 以下の値では、初期値の1800秒が使われます。

## セッションの停滞の見張り {#session-stall-watchdog}

ゲートウェイは、知らせるだけの停滞の見張りを動かしています（`agent.session_stall_timeout`、初期値は `300` 秒、`0` で無効）。取り込み中のセッションに**まだ処理していない続きの入力**があり、エージェントが共有している活動の時計がこの時間以上動いていないとき、ゲートウェイは WARNING を記録し、利用者に一度だけ知らせます。

```
⚠️ Agent session appears stalled (last activity N min ago). Try /new to reset.
```

意味は次のとおりです。

- **知らせるだけです。** この見張りがやり取りを止めることはありません — 長く動きがないときに実行を取り消す `agent.gateway_timeout` とは違います。停滞の知らせは、エージェントが固まっているように見えると伝えるだけで、どうするか（`/new`、`/stop`、待ち続ける）は自分で決められます。
- **1回の停滞につき1回だけ知らせます。** 待っていた入力がさばけるか、活動が戻ると印が消えるので、いったん立ち直ってまた停滞すれば、もう一度知らせます。
- 前進とみなされるのは、共有している活動の記録（ツールの呼び出し、API の応答の進み、圧縮の鼓動）だけです。待っている入力は知らせるための条件であって、前進を測る時計ではありません。

```yaml
agent:
  session_stall_timeout: 300   # seconds; 0 disables the watchdog
```

## つなぎ直しの注意の引き上げ {#reconnect-attention-escalation}

プラットフォームとの連携がつながらないとき（ネットワークの障害、取り消されたボットのトークン、壊れた補助のプロセス）、ゲートウェイは待ち時間を少しずつ延ばしながら、いつまでも試し続けます — 試みが止まることはないので、一時的な障害なら手を出さなくても自然に直ります。困るのは、*恒久的な* 失敗（取り消された Telegram のトークン、足りない Discord の特権的な権限）が、一時的な不調とまったく同じに見えることです。ずっと「試しています」のままになります。

恒久的な失敗を見えるようにする仕組みが2つあります。

- **決して直らないものの見分け。** 例外の *種類* から自然に直らないと分かる失敗 — 拒否されたり取り消されたりしたトークン（`telegram_auth_error`、`discord_auth_error`、`email_auth_error`）、足りない特権的な権限（`discord_intents_required`）、依存を入れられない Photon の補助のプロセス（`SIDECAR_DEPS_MISSING`）や node のバイナリがないもの（`SIDECAR_NODE_MISSING`） — は、やり直しの列に入らず、致命的として印が付きます。この見分けは種類だけで行われ、はっきりしないエラーは今までどおり試し続けます。
- **注意が必要という引き上げ。** `agent.reconnect_attention_after`（初期値は `7200` 秒 = 2時間、`0` で無効）を越えてやり直しの列に居続けたプラットフォームには、ゲートウェイの状態（`hermes status`）に `needs_attention: true` と `retrying_since` の時刻が付き、WARNING も記録されます。やり直し自体はそのまま続きます — これは合図であって、遮断する仕組みではありません。つなぎ直しに成功すると、この印は消えます。

```yaml
agent:
  reconnect_attention_after: 7200   # seconds; 0 disables the escalation flag
```

## ゲートウェイのエージェントのキャッシュ {#gateway-agent-cache}

ゲートウェイはセッションごとにエージェントを1つ持ち続けるので、会話はやり取りのたびにシステムのプロンプトを組み直すのではなく、キャッシュされた前半を使い回せます。ただしそのキャッシュされたエージェントは、セッションの記録も丸ごと抱えています — ツールの出力も含むので、ツールを百回呼んだセッションでは数十メガバイトになります。ですから、たくさんのプラットフォームを抱えた忙しいゲートウェイでは、このキャッシュがプロセスの中でいちばんメモリを食う存在になります。

```yaml
agent:
  agent_cache:
    max_size: 128            # LRU entry cap
    idle_ttl_secs: 3600      # evict an agent idle this long
    memory_high_mb: auto     # anon-RSS budget; number, "auto", or 0/off
    max_evictions_per_pass: 16
    protect_recent: 8
```

`max_size` と `idle_ttl_secs` は、キャッシュを件数と時間で区切ります。どちらも何バイト抱えているかは知らないので、`memory_high_mb` が3つめの区切りを足します。ゲートウェイ自身が使っているメモリがこの目安を越えると、いちばん長く使われていない記録から手放していきます。手放した記録は、次のやり取りのときに保存されたセッションから読み直されます。ゲートウェイがほかのサービスとメモリを取り合っているなら下げてください。前半をすべて温めたままにしたいなら上げるか、`0` にしてこの処理を止めてください。

`auto` は、ゲートウェイが実際に動いているメモリの上限から目安を導きます — コンテナや systemd のユニットなら cgroup の上限、そうでなければ全体の RAM です。ですからユニットの `MemoryMax` や `MemoryHigh` が、別の数字を同期させることなく尊重されます。

やり取りの途中のセッション、`protect_recent` で決めた直近のもの、そして記録をまだディスクへ書き終えていないセッションは、決して手放されません。手放したときは、測ったメモリの量と落としたセッションが WARNING で記録されます。

```
Agent cache pressure: anon RSS 6802MB over budget 6656MB — evicting 5 LRU session(s): ...
```

## 文脈の仕組み {#context-engine}

文脈の仕組みは、モデルのトークンの上限に近づいたときに会話をどう扱うかを決めます。組み込みの `compressor` は、要約によって一部を落とす形です（[文脈の圧縮](/hermes/docs/developer-guide/context-compression-and-caching/)を参照してください）。プラグインの仕組みに差し替えて、別のやり方にすることもできます。

```yaml
context:
  engine: "compressor"    # default — built-in lossy summarization
```

プラグインの仕組み（たとえば、何も失わずに文脈を扱う LCM）を使うには、次のようにします。

```yaml
context:
  engine: "lcm"          # must match the plugin's name
```

プラグインの仕組みが**自動で有効になることはありません** — `context.engine` にそのプラグインの名前をはっきり書く必要があります。使える仕組みは `hermes plugins` → Provider Plugins → Context Engine から見て選べます。

記憶のプラグインについての、同じように1つだけ選ぶ仕組みは [記憶のプロバイダー](/hermes/docs/user-guide/features/memory-providers/)を参照してください。

## 繰り返しの上限 {#iteration-budget}

エージェントがツールを何度も呼ぶ込み入った作業をしていると、繰り返しの上限（初期値は500回）を使い切ることがあります。Hermes は作業の途中で急かす警告を差し込むことは**ありません** — 以前の版では70%と90%の時点でモデルに警告していましたが、それが原因でモデルが込み入った作業を早々に投げ出すことがあったため、2026年4月に取り除かれました。

そのかわり、上限を本当に使い切ったとき（500/500）、Hermes はまとめに入るよう促すメッセージを1つ差し込み、最後の返事を出せるように**猶予の1回**を許します。その猶予の1回でも文章が出てこなければ、何を成し遂げたかをまとめるよう求めます。

```yaml
agent:
  max_turns: none              # Iterations per conversation turn (default: none = unlimited)
                               # Set a positive integer to cap; "none"/"null"/
                               # "unlimited"/"inf"/"infinity"/"infinite"/0/-1 = no limit
  api_max_retries: 3           # Retries per provider before fallback engages (default: 3)
```

`agent.max_turns` は**初期状態では上限なし**です — 回数の上限は、解決する問題より生む問題のほうが多かったので（作業の途中で黙って打ち切られていました）、そのままの Hermes は会話のやり取りを最後までやりきります。上限を設けたいなら、正の整数を書いてください。「上限なし」をはっきり書きたいなら、大文字と小文字を問わず次のどれでも使えます: `"none"`、`"null"`、`"unlimited"`、`"infinite"`、`"infinity"`、`"inf"`、`0`、`-1`（これらは `sys.maxsize` の目印になるので、回数でやり取りが終わることはありません）。

`agent.api_max_retries` は、一時的なエラー（回数の制限、接続の切断、5xx）のときに、予備のプロバイダーへ切り替える**前に** Hermes が何回やり直すかを決めます。初期値は `3` で、合わせて4回試みます。[予備のプロバイダー](/hermes/docs/user-guide/features/fallback-providers/)を設定していて、もっと早く切り替えたいなら `0` にしてください。主のプロバイダーで最初の一時的なエラーが出た時点で、不安定な接続先にやり直しを重ねずに、すぐ予備へ渡します。

## 実時間での実行の上限 {#wall-clock-run-budget}

繰り返しの上限とは別に、会話の1回の実行に**実時間**の上限を持たせることもできます。これは、外から厳しい制限がかかる1回かぎりの実行や評価の仕組み（たとえば作業ごとに900秒という制限）のためのものです。これがないと、作業がほぼ終わっているのに時間切れになることがあります — 最後の答えを出す一歩手前だったり、送り手の1回の呼び出しが固まったままだったりします。

```yaml
agent:
  run_budget_seconds: null     # Optional; unset/null = feature fully off (default)
```

CLI から、その実行だけに指定することもできます。

```bash
hermes chat --run-budget 850 -q "..."
```

上限を決めると、2つのことが起こります。

1. **80%の時点でのまとめの知らせ。** 上限の80%が過ぎると、Hermes は**一度だけ**知らせを差し込み（キャッシュを壊さない形で、`/steer` のメッセージのようにいちばん新しいツールの結果に添えられます）、新しい調べものや確認をやめて、いま持っている情報から最終的な成果を出すようモデルに伝えます。1回の実行につき多くても1度しか出ず、すでにある繰り返しの上限のまとめの仕組みと同じ形です — 繰り返し急かすことはありません。
2. **締め切りに合わせて縮む、止まったかどうかの判断の時間。** 明示していないときの、応答を少しずつ受け取らない呼び出しの判断の時間（初期値の90秒や、じっくり考えるモデルの下限、たとえば DeepSeek の推論モデルの600秒）は `max(60, remaining_budget × 0.5)` に抑えられるので、黙って固まった1回の呼び出しが実行の残りを食い尽くすことはありません。この抑えは待ち時間を*短くする*だけで、伸ばすことはありません。はっきり設定した `stale_timeout_seconds`（プロバイダーやモデルの設定、あるいは `HERMES_API_CALL_STALE_TIMEOUT`）は、いつでもそのまま優先されます。

この上限は `run_conversation` のやり取りごとのもので（利用者のメッセージのたびに数え直します）、設定しなければこの仕組みは完全に眠っています — 時計も読まず、何も差し込まず、待ち時間も変えません。

## 終わる前の確認（コードの検証） {#verify-on-stop-coding-verification}

有効にすると Hermes は、エージェントが作業場所のコードを直したのに、新しい検証の証拠（テストが通った、ビルドできた、lint が通ったなど）を出していないやり取りで、最後の答えを受け入れません — 検証するか、できない理由を説明するよう求める続きのメッセージを差し込みます。文書やマークダウン、スキルだけの変更では決して働きませんし、繰り返しには上限があるのでエージェントが閉じ込められることはありません。

```yaml
agent:
  verify_on_stop: false        # true | false | "auto" (surface-aware: on for CLI/TUI/desktop, off for messaging)
  verify_guidance: true        # Append creative-UI / clean-diff guidance to the missing-evidence nudge
  max_verify_nudges: 3         # Cap on consecutive continue nudges per turn (built-in + pre_verify hooks)
  coding_instructions: ""      # Standing project-wide coding rules appended to the coding brief
```

`verify_on_stop` は `true`（どこでも有効）、`false`（無効 — 初期値）、`"auto"`（従来の、画面に応じた動き: CLI、TUI、デスクトップといった対話的にコードを書く場面とプログラムからの呼び出しでは有効、検証の説明がチャットの雑音に見える Telegram や Discord のようなメッセージの画面では無効）のいずれかです。どこでも無効が初期値です。新しく入れると `false` で配られますし、設定の移行もすでに入っているものを無効にしたので、有効にするのははっきりした意思表示になります。`HERMES_VERIFY_ON_STOP` の環境変数を設定すると、設定の値より優先されます。

同じ場面で自分の検査を挟み、エージェントを続けさせたいなら、利用者やプラグイン向けの [`pre_verify` のフック](/hermes/docs/user-guide/features/hooks/#pre_verify)を参照してください。

## 立てておく目標（`/goal`） {#standing-goals-goal}

目標を立てているあいだ、Hermes はアシスタントの返事のたびに、それが目標を満たしているかを判定します。満たしていなければ、同じセッションに続きの指示を戻し、目標が達成されるか、やり取りの上限が尽きるか、利用者が止めるか消すまで作業を続けます。本当の歯止めになるのはやり取りの上限です — 判定に失敗したときは**続ける側**に倒れるので、判定が不安定でも作業が止まることはありません。

```yaml
goals:
  max_turns: 20   # Max continuation turns before Hermes auto-pauses the goal (default: 20)
```

`max_turns` は、Hermes が自動で目標を一時停止して `/goal resume` を求めるまでに、目標が何回の続きのやり取りを引っ張れるかを決めます。判定の見落とし（本当は達成しているのに続けろと言われる）や、あいまいで達成できない目標にモデルを際限なく使うことを防ぎます。この機能の全体は [目標](/hermes/docs/user-guide/features/goals/)を参照してください。

### API の待ち時間 {#api-timeouts}

Hermes は、応答を少しずつ受け取るときの待ち時間を層に分けて持っていて、それとは別に、少しずつ受け取らない呼び出しが止まったかどうかを見る仕組みがあります。止まったかどうかの判断は、明示せず初期値のままにしているときだけ、手元のプロバイダーに合わせて自動で調整されます。

| 待ち時間 | 初期値 | 手元のプロバイダー | 設定 / 環境変数 |
|---------|---------|----------------|--------------|
| ソケットの読み取りの上限 | 120秒 | 1800秒まで自動で上がります | `HERMES_STREAM_READ_TIMEOUT` |
| 応答が止まったかの判断 | 180秒 | 900秒の上限まで上がります（`agent.local_stream_stale_timeout`） | `HERMES_STREAM_STALE_TIMEOUT` |
| 少しずつ受け取らない呼び出しが止まったかの判断 | 90秒 | 明示しなければ自動で無効になります | `providers.<id>.stale_timeout_seconds` または `HERMES_API_CALL_STALE_TIMEOUT` |
| API の呼び出し（少しずつ受け取らない場合） | 1800秒 | 変わりません | `providers.<id>.request_timeout_seconds` / `timeout_seconds` または `HERMES_API_TIMEOUT` |

**ソケットの読み取りの上限**は、送り手からの次のかたまりを httpx がどれだけ待つかを決めます。手元の LLM は、大きな文脈の下ごしらえに何分もかかってから最初のトークンを出すことがあるので、手元の接続先だと分かると Hermes はこれを30分まで上げます。`HERMES_STREAM_READ_TIMEOUT` をはっきり設定していれば、接続先の判定にかかわらずその値が使われます。

**応答が止まったかの判断**は、SSE の生存確認だけが届いて中身が来ない接続を切ります。（下ごしらえのあいだ生存確認を送らない）手元のプロバイダーでは、基本の180秒ではなく900秒という有限の上限まで上がります。これは `agent.local_stream_stale_timeout` か `HERMES_LOCAL_STREAM_STALE_TIMEOUT` の環境変数で設定できます。

**少しずつ受け取らない呼び出しが止まったかの判断**は、長く応答がない呼び出しを切ります。初期状態では、長い下ごしらえのあいだに誤って切らないよう、手元の接続先ではこれを無効にします。`providers.<id>.stale_timeout_seconds`、`providers.<id>.models.<model>.stale_timeout_seconds`、`HERMES_API_CALL_STALE_TIMEOUT` のどれかをはっきり設定していれば、手元の接続先でもその値が守られます。

この上限は、cron のジョブや任せたサブエージェントがその場で走らせるものも含めて、少しずつ受け取らないすべての呼び出しに効きます。リクエストを受け取っておきながら黙り込む送り手 — 接続は開いたまま、1バイトも来ず、エラーも出ない — は、この時間で打ち切られてやり直されます。はるかに長いソケットの読み取りの上限まで（あるいは、人が見ていない cron の実行なら、外から何かがプロセスを止めるまで）ぶら下がったままにはなりません。

## 文脈の逼迫の知らせ {#context-pressure-warnings}

繰り返しの上限とは別に、文脈の逼迫は、会話が**圧縮のしきい値**にどれだけ近づいたかを追いかけます。しきい値とは、古いメッセージを要約するために文脈の圧縮が働く点のことです。これによって、会話が長くなってきたことが自分にもエージェントにも分かります。

| 進み具合 | 段階 | 何が起きるか |
|----------|-------|-------------|
| しきい値まで **60%以上** | お知らせ | CLI に水色の進み具合の帯が出ます。ゲートウェイはお知らせを送ります |
| しきい値まで **85%以上** | 警告 | CLI に太い黄色の帯が出ます。ゲートウェイは圧縮が近いと警告します |

CLI では、文脈の逼迫はツールの出力の流れの中に進み具合の帯として現れます。

```
  ◐ context ████████████░░░░░░░░ 62% to compaction  48k threshold (50%) · approaching compaction
```

メッセージのプラットフォームでは、素のテキストの知らせが送られます。

```
◐ Context: ████████████░░░░░░░░ 62% to compaction (threshold: 50% of window).
```

自動の圧縮を止めているときは、代わりに文脈が切り詰められるかもしれない、という警告になります。

文脈の逼迫の知らせは自動で働きます — 設定は要りません。これは利用者に見せる知らせとしてだけ働き、メッセージの流れを変えたり、モデルの文脈に何かを差し込んだりはしません。

## 認証情報のまとまりの使い方 {#credential-pool-strategies}

同じプロバイダーの API キーや OAuth のトークンを複数持っているとき、どう順に使うかを設定できます。

```yaml
credential_pool_strategies:
  openrouter: round_robin    # cycle through keys evenly
  anthropic: least_used      # always pick the least-used key
```

選べるのは `fill_first`（初期値）、`round_robin`、`least_used`、`random` です。詳しい説明は [認証情報のまとまり](/hermes/docs/user-guide/features/credential-pools/)を参照してください。

## プロンプトのキャッシュ {#prompt-caching}

使っているプロバイダーが対応していれば、Hermes はセッションをまたいだプロンプトのキャッシュを自動で有効にします — 設定は要りません。

**Anthropic 本来の API**、**OpenRouter**、**Nous Portal** で Claude を使う場合、Hermes はシステムのプロンプトとスキルのまとまりに、1時間有効（`ttl: "1h"`）の `cache_control` の区切りを付けます。新しい1時間の中で最初に送るときは入力の通常の料金がかかり、同じ1時間の中であれば、どのセッションからの以降の送信もキャッシュからの安い料金で読み出されます。つまり、システムのプロンプト、読み込んだスキルの中身、長い文脈の前半の部分が、`hermes` のセッションをまたいでも、枝分かれしたサブエージェントのあいだでも、最初の1時間は使い回されます。

Qwen Cloud（Alibaba DashScope）の上流はキャッシュの有効期間を5分までとしているので、Hermes はそこでは5分の区切りを使います。第三者を経由するそのほかの Claude の経路（AWS Bedrock、Azure Foundry）は、それぞれのプロバイダーのキャッシュの既定に従います。xAI の Grok は、セッションに結び付けた会話の id という別の仕組みを使います — [xAI のプロンプトのキャッシュ](/hermes/docs/integrations/providers/#xai-grok--responses-api--prompt-caching)を参照してください。

これを止める設定はありません — キャッシュは常に働きますし、システムのプロンプトだけでも入力のトークン数のうち無視できない割合を占めるので、1回きりの会話でもお金の節約になります。

はっきり触れる設定は1つだけで、Anthropic 形式の区切りで Hermes が求めるキャッシュの有効期間の段階です。

```yaml
prompt_caching:
  cache_ttl: "5m"   # "5m" or "1h" (Anthropic-supported tiers); other values are ignored
```

`cache_ttl` は、Anthropic 本来の API、OpenRouter、Nous Portal 経由の Claude について、Hermes が付ける区切りの有効期間を選びます。Anthropic が対応している2つの段階（`"5m"`、`"1h"`）だけが有効で、それ以外の値は無視されます。独自の上限を持つプロバイダー（たとえば最長5分の Qwen Cloud）では、上流が許す範囲まで抑えられます。

## 補助のモデル {#auxiliary-models}

Hermes は、画像の読み取り、ブラウザの画面の読み取り、セッションの表題の生成、文脈の圧縮といった脇の作業に「補助の」モデルを使います。初期状態（`auxiliary.*.provider: "auto"`）では、Hermes はすべての補助の作業を**主のチャットのモデル** — `hermes model` で選んだのと同じプロバイダーとモデル — へ回します。使い始めるのに設定は要りませんが、高価な推論のモデル（Opus、MiniMax M2.7 など）では、補助の作業が無視できない費用になることは知っておいてください。主のモデルが何であれ、脇の作業は安く速く済ませたいなら、`auxiliary.<task>.provider` と `auxiliary.<task>.model` をはっきり設定してください（たとえば画像には OpenRouter の Gemini Flash など）。（ウェブの抽出は補助の作業ではありません。`web_extract` とブラウザの画面の取り込みは、長い中身を決まった規則で切り詰め、全文は `read_file` でめくれるように保存します — LLM は関わりません。）

:::note 「auto」が主のモデルを使う理由
以前の版では、まとめ役のサービス（OpenRouter、Nous Portal）の利用者だけを、送り手側の安いモデルへ振り分けていました。これは意外に感じられるものでした — まとめ役のサービスにお金を払っている人が、補助のやり取りだけ別のモデルに処理されるのを目にすることになるからです。いまは `auto` は誰にとっても主のモデルを使います。`config.yaml` での作業ごとの上書きは、これまでどおり優先されます（下の [補助の設定の一覧](#full-auxiliary-config-reference) を参照してください）。
:::

### 補助のモデルを対話的に設定する {#configuring-auxiliary-models-interactively}

YAML を手で書く代わりに、`hermes model` を実行してメニューから **「Configure auxiliary models」** を選んでください。作業ごとに対話的に選べます。

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

作業を選び、プロバイダーを選び（OAuth ならブラウザが開き、API キーのプロバイダーなら入力を求められます）、モデルを選びます。変更は `config.yaml` の `auxiliary.<task>.*` に保存されます。主のモデルを選ぶのと同じ仕組みなので、新しく覚える書き方はありません。

**Delegation** の項目だけは特別です。これは `delegate_task` のサブエージェントが使うモデルを決め、`auxiliary.*` ではなく、いちばん上の階層の `delegation.*`（`delegation.provider` / `delegation.model`）に保存されます。サブエージェントは脇の LLM の呼び出しではなく、一人前の子のエージェントだからです。ここでの `auto` は「親のエージェントのプロバイダー、モデル、認証情報を受け継ぐ」という意味です。

最初のやり取りのあとで Hermes に表題を自動で付けさせたくないなら、
`auxiliary.title_generation.enabled: false` にしてください。`/title` や
`hermes sessions rename` で手で付けることは、これまでどおりできます。

### 少しずつ受け取ることしかできない接続先 {#stream-only-endpoints}

OpenAI 互換の接続先の中には、まとめて返すやり取りをはっきり断るものがあります（たとえば Tencent Copilot は HTTP 400 で `"Non-stream chat request is currently not supported"` を返します）。対話的なチャットはもともと少しずつ受け取りますが、補助の作業（表題の生成、圧縮、画像の読み取り）はまとめて返すやり取りを使うので、毎回失敗してしまいます。Hermes は `copilot.tencent.com` を必ずこの種の接続先として扱います。ほかにそういう接続先があるなら、`auxiliary.stream_only_base_urls` の下に URL の一部を並べてください。

```yaml
auxiliary:
  stream_only_base_urls:
    - "my-stream-only-proxy.example.com"
```

当てはまる補助の呼び出しは `stream=True` で送られ、届いたかたまり（ツールの呼び出しの差分も含みます）は手元で組み立て直されます。ほかの接続先での動きは何も変わりません。

### 動画での説明 {#video-tutorial}

[YouTube: https://www.youtube.com/embed/NoF-YajElIM](https://www.youtube.com/embed/NoF-YajElIM)

### すべてに共通する設定の形 {#the-universal-config-pattern}

Hermes のモデルの枠は — 補助の作業も、圧縮も、予備も — すべて同じ3つの項目を使います。

| 項目 | 何を決めるか | 初期値 |
|-----|-------------|---------|
| `provider` | 認証と振り分けにどのプロバイダーを使うか | `"auto"` |
| `model` | どのモデルを求めるか | そのプロバイダーの既定 |
| `base_url` | 独自の OpenAI 互換の接続先（プロバイダーの指定より優先されます） | 未設定 |

補助の作業のまとまりでは、さらに `reasoning_effort` の項目も使えます。

| 項目 | 何を決めるか | 初期値 |
|-----|-------------|---------|
| `reasoning_effort` | その作業の LLM の呼び出しで、どこまで考えさせるか: `none`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max`、`ultra` | 未設定（プロバイダーの既定） |

これは全体に効く `agent.reasoning_effort` の、作業ごとの対になるものです。主のモデルが高価な推論のモデルのとき、圧縮を `low` で、画像の読み取りを `none` で走らせれば、ふだんのチャットの動きを変えずに、脇の作業の待ち時間と費用を減らせます。これはどの補助の作業のまとまり（`vision`、`compression`、`title_generation`、`curator`、`background_review` など）でも、3つある補助の通信の形すべて（chat completions、Codex Responses、Anthropic Messages）で効きます。同じ作業に `extra_body.reasoning` をはっきり書いた場合は、そちらが勝ちます。

MoA だけは例外です。Mixture-of-Agents でどこまで考えさせるかは、`moa_reference` や `moa_aggregator` の補助のまとまりではなく、MoA の設定の**枠ごと**に決めます（`moa.presets.<name>.reference_models[].reasoning_effort` / `aggregator.reasoning_effort`） — [Mixture of Agents](/hermes/docs/user-guide/features/mixture-of-agents/)を参照してください。

```yaml
auxiliary:
  compression:
    reasoning_effort: "low"    # summaries don't need deep thinking
  vision:
    reasoning_effort: "none"   # disable thinking for image description
```

`base_url` を設定すると、Hermes はプロバイダーの指定を無視して、その接続先を直接呼びます（認証には `api_key` か `OPENAI_API_KEY` を使います）。`provider` だけを設定した場合は、そのプロバイダーに組み込まれた認証とベース URL を使います。

補助の作業で使えるプロバイダーは、`auto`、`main` に加えて、[プロバイダーの一覧](/hermes/docs/reference/environment-variables/)にあるすべてです — `openrouter`、`nous`、`openai-codex`、`copilot`、`copilot-acp`、`anthropic`、`gemini`、`qwen-oauth`、`zai`、`kimi-coding`、`kimi-coding-cn`、`minimax`、`minimax-cn`、`minimax-oauth`、`deepseek`、`nvidia`、`xai`、`xai-oauth`、`ollama-cloud`、`alibaba`、`bedrock`、`huggingface`、`arcee`、`xiaomi`、`kilocode`、`opencode-zen`、`opencode-go`、`opencode-free`、`commandcode`、`commandcode-anthropic`、`ai-gateway`、`azure-foundry` — そして自分の `providers:` の辞書に名前を付けて書いたものも使えます（たとえば `provider: "beans"`）。

:::tip MiniMax の OAuth
`minimax-oauth` は、ブラウザでの OAuth によってログインします（API キーは要りません）。`hermes model` を実行して **MiniMax (OAuth)** を選んで認証してください。補助の作業では自動的に `MiniMax-M2.7-highspeed` が使われます。[MiniMax の OAuth の案内](/hermes/docs/guides/minimax-oauth/)を参照してください。
:::

:::tip xAI Grok の OAuth
`xai-oauth` は、SuperGrok と X Premium+ の契約者向けに、ブラウザでの OAuth によってログインします（API キーは要りません）。`hermes model` を実行して **xAI Grok OAuth (SuperGrok / Premium+)** を選んで認証してください。同じ OAuth のトークンが、xAI へ直接つなぐすべての場面（チャット、補助の作業、読み上げ、画像の生成、動画の生成、文字起こし）で使い回されます。[xAI Grok の OAuth の案内](/hermes/docs/guides/xai-grok-oauth/)を参照してください。Hermes がリモートのホストにあるなら [SSH やリモートのホスト越しの OAuth](/hermes/docs/guides/oauth-over-ssh/)も参照してください。
:::

:::warning `"main"` は補助の作業だけのものです
`"main"` というプロバイダーの指定は「主のエージェントが使っているものをそのまま使う」という意味で、`auxiliary:` と `compression:` の中、そして主の予備の項目（`fallback_providers:` や従来の `fallback_model:`）でだけ使えます。いちばん上の階層の `model.provider` の値としては**使えません**。独自の OpenAI 互換の接続先を使うなら、`model:` の節に `provider: custom` と書いてください。主のモデルのプロバイダーの選択肢は [AI のプロバイダー](/hermes/docs/integrations/providers/)を参照してください。
:::

### 補助の設定の一覧 {#full-auxiliary-config-reference}

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
補助の作業にはそれぞれ `timeout`（秒）を設定できます。初期値は、画像の読み取りが120秒、承認の判定が30秒、圧縮が120秒です。補助の作業に遅い手元のモデルを使うなら、これらを増やしてください。画像の読み取りには、HTTP で画像を取ってくるための `download_timeout`（初期値は30秒）も別にあります。回線が遅いときや、自分で立てた画像のサーバーを使うときは、こちらを増やしてください。
:::

:::info
文脈の圧縮には、しきい値のための `compression:` のまとまりと、モデルやプロバイダーの設定のための `auxiliary.compression:` のまとまりがあります — 上の [文脈の圧縮](#context-compression)を参照してください。主の予備の連なりは、いちばん上の階層の `fallback_providers:` の並びを使います — [予備のプロバイダー](/hermes/docs/integrations/providers/#fallback-providers)を参照してください。3つとも、provider / model / base_url という同じ形に従います。
:::

### 補助の作業ごとの予備の連なり {#per-task-fallback-chain-for-auxiliary-tasks}

補助の作業にはそれぞれ、`fallback_chain` を書けます。主の補助のプロバイダーが、回数の制限、つながらない、支払いの制限といった理由で失敗したときに、Hermes が試すプロバイダーとモデルの並びです。

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

主の補助のプロバイダー（`openrouter` の `openai/gpt-4o-mini`）が、回数の制限、接続の時間切れ、支払いが必要というエラーを返すと、Hermes は `fallback_chain` を順にたどります。すでに失敗したプロバイダーと同じものは飛ばし、残りを1つずつ試して、どれかが成功するか、並びを使い切るまで続けます。すべての予備が失敗した場合、Hermes は最後の受け皿として主のエージェントのモデルに戻ります。

各項目は、補助の作業の設定と同じ3つの項目を使えます。

| 項目 | 説明 |
|-----|-------------|
| `provider` | プロバイダーの名前（`nous`、`openrouter`、`anthropic`、`gemini`、`main` など） |
| `model` | そのプロバイダーでのモデル名 |
| `base_url` | （任意）独自の OpenAI 互換の接続先 |

`fallback_chain` は、どの補助の作業でも使えます — `compression`、`vision`、`approval`、`skills_hub`、`mcp` などです。

### 補助の作業の同時実行を抑える {#limiting-auxiliary-concurrency}

`max_concurrency` は、`compression` や `title_generation` といった補助の作業について、プロセス全体で同時に走る LLM の呼び出しの数を抑えます。`auxiliary.vision.max_concurrency` は例外です。あちらはすでに、LLM への要求ではなく、画像の変換や縮小という CPU を使う処理の数だけを決めているからです。これが役に立つのは次のような場合です。

- 多くのセッションが同時に裏の作業を始めうるとき（Discord や Telegram のチャンネル、複数のターミナル）
- プロバイダーが回数を制限していたり障害中だったりして、やり直しが状況を悪くしそうなとき

初期値は上限なしです。安全のための値としては `2` あたりがよくあります。

```yaml
auxiliary:
  title_generation:
    max_concurrency: 2
  compression:
    max_concurrency: 2
```

この仕組みは、やり直しや予備への切り替えを含めた呼び出し全体を包むので、1回の遅い呼び出しが上限に対して二重に数えられることはありません。

### 補助の作業での OpenRouter の振り分けと Pareto Code {#openrouter-routing-pareto-code-for-auxiliary-tasks}

補助の作業が OpenRouter に行き着くとき（はっきり指定した場合でも、主のエージェントが OpenRouter で `provider: "main"` を使っている場合でも）、主のエージェントの `provider_routing` と `openrouter.min_coding_score` の設定は**引き継がれません** — 補助の作業はそれぞれ独立している、という設計です。特定の補助の作業について OpenRouter のプロバイダーの好みを決めたり、[Pareto Code の振り分け](/hermes/docs/integrations/providers/#openrouter-pareto-code-router)を使ったりするには、作業ごとに `extra_body` で設定してください。

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

この形は、OpenRouter が chat completions のリクエストの本体で受け付けるものと同じです。Hermes は `extra_body` の全体をそのまま渡すので、[openrouter.ai/docs](https://openrouter.ai/docs) に書かれているほかのリクエストの項目も、同じように使えます。

### 画像の読み取りのモデルを変える {#changing-the-vision-model}

画像の読み取りに Gemini Flash ではなく GPT-4o を使うには、次のようにします。

```yaml
auxiliary:
  vision:
    model: "openai/gpt-4o"
```

環境変数（`~/.hermes/.env` の中）でも指定できます。

```bash
AUXILIARY_VISION_MODEL=openai/gpt-4o
```

### プロバイダーの選択肢 {#provider-options}

ここに挙げる選択肢は、**補助の作業の設定**（`auxiliary:`、`compression:`）と、主の予備の項目（`fallback_providers:` や従来の `fallback_model:`）に効きます。主の `model.provider` の設定には効きません。

| プロバイダー | 説明 | 必要なもの |
|----------|-------------|-------------|
| `"auto"` | 使えるいちばん良いもの（初期値）。画像の読み取りは OpenRouter → Nous → Codex の順に試します。 | — |
| `"openrouter"` | OpenRouter を使います — どのモデルへも振り分けられます（Gemini、GPT-4o、Claude など） | `OPENROUTER_API_KEY` |
| `"nous"` | Nous Portal を使います | `hermes auth` |
| `"codex"` | Codex の OAuth（ChatGPT のアカウント）を使います。画像の読み取りにも対応します（gpt-5.3-codex）。 | `hermes model` → ChatGPT または Codex の契約 |
| `"minimax-oauth"` | MiniMax の OAuth を使います（ブラウザでログイン、API キー不要）。補助の作業には MiniMax-M2.7-highspeed を使います。 | `hermes model` → MiniMax (OAuth) |
| `"xai-oauth"` | xAI Grok の OAuth を使います（SuperGrok や X Premium+ の契約者向けのブラウザでのログイン、API キー不要）。同じ OAuth のトークンが、チャット、読み上げ、画像、動画、文字起こしをまかないます。 | `hermes model` → xAI Grok OAuth (SuperGrok / Premium+) |
| `"main"` | いま使っている独自の接続先や主の接続先を使います。これは `OPENAI_BASE_URL` と `OPENAI_API_KEY` から来ることも、`hermes model` や `config.yaml` に保存した独自の接続先から来ることもあります。OpenAI でも、手元のモデルでも、OpenAI 互換の API なら何でも使えます。**補助の作業だけのもので、`model.provider` には使えません。** | 独自の接続先の認証情報とベース URL |

主のプロバイダーの一覧にある、API キーを直接使うプロバイダーもここで使えます。脇の作業をふだんの振り分けの外へ出したいときに便利です。たとえば `GMI_API_KEY` を設定していれば `gmi` が使えますし、`FIREWORKS_API_KEY` を設定していれば `fireworks` が使えます。

```yaml
auxiliary:
  compression:
    provider: "gmi"
    model: "anthropic/claude-opus-4.6"
```

GMI で補助の作業を振り分けるときは、GMI の `/v1/models` の接続先が返すモデル ID をそのまま使ってください。Fireworks のモデル ID は、そのサービス本来のスラッシュ区切りの形です。たとえば `accounts/fireworks/models/glm-5p2` のようになります。

### よくある構成 {#common-setups}

**独自の接続先を直接使う**（手元や自分で立てた API なら、`provider: "main"` よりこちらのほうが分かりやすいです）:
```yaml
auxiliary:
  vision:
    base_url: "http://localhost:1234/v1"
    api_key: "local-key"
    model: "qwen2.5-vl"
```

`base_url` は `provider` より優先されるので、補助の作業を特定の接続先へ向けるいちばんはっきりしたやり方です。接続先を直接上書きするとき、Hermes は設定された `api_key` を使い、なければ `OPENAI_API_KEY` に落ちます。その独自の接続先に `OPENROUTER_API_KEY` を使い回すことはありません。

**画像の読み取りに OpenAI の API キーを使う:**
```yaml
# In ~/.hermes/.env:
# OPENAI_BASE_URL=https://api.openai.com/v1
# OPENAI_API_KEY=sk-...

auxiliary:
  vision:
    provider: "main"
    model: "gpt-4o"       # or "gpt-4o-mini" for cheaper
```

**画像の読み取りに OpenRouter を使う**（どのモデルへも振り分けられます）:
```yaml
auxiliary:
  vision:
    provider: "openrouter"
    model: "openai/gpt-4o"      # or "google/gemini-2.5-flash", etc.
```

**Codex の OAuth を使う**（ChatGPT の Pro / Plus のアカウント — API キーは要りません）:
```yaml
auxiliary:
  vision:
    provider: "codex"     # uses your ChatGPT OAuth token
    # model defaults to gpt-5.3-codex (supports vision)
```

**MiniMax の OAuth を使う**（ブラウザでログイン、API キーは要りません）:
```yaml
model:
  default: MiniMax-M2.7
  provider: minimax-oauth
  base_url: https://api.minimax.io/anthropic
```
`hermes model` を実行して **MiniMax (OAuth)** を選べば、ログインしてこれが自動で設定されます。中国のリージョンでは、ベース URL は `https://api.minimaxi.com/anthropic` になります。手順の全体は [MiniMax の OAuth の案内](/hermes/docs/guides/minimax-oauth/)を参照してください。

**手元や自分で立てたモデルを使う:**
```yaml
auxiliary:
  vision:
    provider: "main"      # uses your active custom endpoint
    model: "my-local-model"
```

`provider: "main"` は、Hermes がふだんのチャットで使っているプロバイダーをそのまま使います。名前を付けた独自のプロバイダー（たとえば `beans`）でも、`openrouter` のような組み込みのプロバイダーでも、従来の `OPENAI_BASE_URL` の接続先でも同じです。

:::tip
主のモデルのプロバイダーに Codex の OAuth を使っているなら、画像の読み取りは自動で動きます — 追加の設定は要りません。Codex は、画像の読み取りを自動で選ぶときの候補に入っています。
:::

:::warning
**画像の読み取りには、複数の形式を扱えるモデルが必要です。** `provider: "main"` にするなら、その接続先が画像を扱えることを確かめてください。そうでないと画像の読み取りは失敗します。
:::

### 環境変数（従来の方法） {#environment-variables-legacy}

補助のモデルは環境変数でも設定できます。ただし `config.yaml` のほうがおすすめです — 管理しやすく、`base_url` や `api_key` を含むすべての項目を扱えます。

| 設定 | 環境変数 |
|---------|---------------------|
| 画像の読み取りのプロバイダー | `AUXILIARY_VISION_PROVIDER` |
| 画像の読み取りのモデル | `AUXILIARY_VISION_MODEL` |
| 画像の読み取りの接続先 | `AUXILIARY_VISION_BASE_URL` |
| 画像の読み取りの API キー | `AUXILIARY_VISION_API_KEY` |

圧縮と予備のモデルの設定は config.yaml だけのものです。（`AUXILIARY_WEB_EXTRACT_*` の変数はもう使われません — ウェブの抽出は補助の LLM を使わなくなりました。）

:::tip
いまの補助のモデルの設定は `hermes config` で見られます。上書きは、初期値と違うときにだけ表示されます。
:::

## どこまで考えさせるか {#reasoning-effort}

答える前にモデルがどれだけ「考える」かを決めます。

```yaml
agent:
  reasoning_effort: ""   # empty = medium. Options: none, minimal, low, medium, high, xhigh, max, ultra
```

設定しないとき（初期状態）は「medium」になります。ほとんどの作業にちょうどよい、釣り合いの取れた段階です。値を書くとそれが優先されます — 深く考えさせるほど、込み入った作業での結果はよくなりますが、トークンと待ち時間が増えます。

:::note OpenRouter 経由の、自分で考える深さを決めるモデル（Claude 4.6 以降、Fable / Mythos の系統）
これらのモデルは*自分で*考える深さを決めるので、ふつうの `reasoning.effort` の
項目を受け付けません — OpenRouter もこれらのモデルについては無視します。Hermes は
`reasoning_effort` を、代わりに OpenRouter の `verbosity` の項目へ黙って回します（これは
Anthropic の `output_config.effort` に対応します）。ですから同じ設定が、選んだモデルが
対応する段階のまま使い続けられます。`none`（または未設定）にすると、そのモデル自身の
判断に任せます。
Anthropic 本来のプロバイダーは、もともと深さを直接決めているので影響を受けません。
:::

:::note OpenRouter のモデルと、対応している深さの段階
OpenRouter を通るほかのモデルについて、Hermes はモデルの一覧が持つ
考える深さの情報（`supported_parameters` と、モデルごとの
`reasoning.supported_efforts`）を読み、そもそも深さの指定を送るかどうかを決め、
求めた深さを、その経路が実際に対応するいちばん近い段階に収めます
（必ず下げる方向です — たとえば `high` までしか対応しない経路では `ultra` は
`high` になり、黙って上がることはありません）。考える深さに対応した新しい提供元も、
Hermes の更新を待たずに自動で使えます。一覧に届かないときや、そのモデルが載っていない
ときは、Hermes は組み込みのモデルの系統の表に落ち、指定した深さをそのまま渡します。
:::

考える深さは、`/reasoning` のコマンドで動かしたまま変えることもできます。

```
/reasoning                # Show current effort level and display state
/reasoning high           # Set reasoning effort to high (this session only)
/reasoning high --global  # Set effort and persist to config.yaml
/reasoning none           # Disable reasoning (this session only)
/reasoning show           # Show model thinking above each response
/reasoning hide           # Hide model thinking
```

深さの変更は、初期状態ではそのセッションの中だけのものです。`--global` を付けると、
その段階が `agent.reasoning_effort` の既定として保存されます。

#### モデルごとの深さの上書き {#per-model-reasoning-overrides}

モデルごとに違う深さを設定できます。込み入ったモデルには深く考えさせ、速いモデルは中くらいにしたいときに便利です。

```yaml
agent:
  reasoning_effort: "medium"       # global default
  reasoning_overrides:
    "openrouter/anthropic/claude-opus-4.5": "xhigh"
    "openai/gpt-5": "low"
    "claude-sonnet-4.6": "high"    # bare model name also works
```

書き方の**ゆれは吸収されます** — 無理のない書き方ならどれでも当てはまります。
- `claude-opus-4.5`、`claude-opus-4-5`、`claude-opus.4.5`（ドットとハイフンは同じものとして扱われます）
- `anthropic/claude-opus-4.5`、`openrouter/anthropic/claude-opus-4.5`（プロバイダーの接頭辞は省けます）
- ぴったり一致するものが、ゆれた書き方より優先されます

:::note
`reasoning_overrides` の項目に `hermes config set` は使えません — YAML のファイルを直接直してください。モデル名にはよくドットが含まれるので（たとえば `claude-opus-4.5`）、CLI のドット区切りの書き方とぶつかるためです。
:::

**決まる順番:**

1. セッションの中だけの `/reasoning --session` の上書き（ゲートウェイのみ）
2. `agent.reasoning_overrides` のモデルごとの上書き（書き方のゆれを吸収します）
3. 全体の `agent.reasoning_effort`
4. プロバイダーの既定

この上書きは、どこでも自動的に効きます。CLI の起動時、メッセージのゲートウェイ、デスクトップと TUI、cron のジョブ、`/model` によるセッション途中の切り替え、予備のモデルへの切り替えのいずれでもです。

## ツールを使わせる働きかけ {#tool-use-enforcement}

モデルによっては、ツールを呼ばずに、やろうとしていることを文章で書いてしまうことがあります（実際にターミナルを呼ばずに「テストを走らせます……」と言うなど）。ツールを使わせる働きかけは、実際にツールを呼ぶよう導く案内をシステムのプロンプトへ差し込みます。

```yaml
agent:
  tool_use_enforcement: "auto"   # "auto" | true | false | ["model-substring", ...]
```

| 値 | 動き |
|-------|----------|
| `"auto"`（初期値） | 名前に `gpt`、`codex`、`gemini`、`gemma`、`grok`、`glm`、`qwen`、`deepseek` を含むモデルで有効になります。それ以外（たとえば Claude）では無効です。 |
| `true` | モデルにかかわらず、常に有効です。いま使っているモデルが、実行せずに説明ばかりしていると感じたときに便利です。 |
| `false` | モデルにかかわらず、常に無効です。 |
| `["gpt", "codex", "qwen", "llama"]` | モデル名に、並べた文字列のどれかが含まれるときだけ有効になります（大文字と小文字は区別しません）。 |

### 何が差し込まれるか {#what-it-injects}

有効にすると、システムのプロンプトに2段階の案内が足されることがあります。

1. **ツールを使わせる一般的な案内**（当てはまるすべてのモデル） — やろうとしていることを述べるのではなく、すぐツールを呼ぶこと、作業が終わるまで続けること、これからやりますという約束でやり取りを終えないことを伝えます。

2. **Google 向けの運用の案内**（Gemini と Gemma のモデルのみ） — 簡潔に書くこと、絶対パスを使うこと、ツールを並行して呼ぶこと、直す前に確かめることを伝えます。

これらは利用者からは見えず、システムのプロンプトにだけ効きます。もともとツールを確実に使うモデル（Claude など）にこの案内は要らないので、`"auto"` はそれらを外しています。

### いつ有効にするか {#when-to-turn-it-on}

初期の自動の一覧に入っていないモデルを使っていて、実行するかわりに*やるつもり*を書いてばかりいると感じたら、`tool_use_enforcement: true` にするか、そのモデルの名前の一部を並びに足してください。

```yaml
agent:
  tool_use_enforcement: ["gpt", "codex", "gemini", "grok", "my-custom-model"]
```

## 実行の規律についての案内 {#execution-discipline-guidance}

ツールを使わせる働きかけとは別に、Hermes は**実行の規律**についてのまとまりを差し込みます。対象は、評価の記録の中で同じような失敗が見られたモデルの系統です。計算をコードではなく文章で行う、外部へ書き込んだあとに読み返して確かめない、形の崩れた識別子を「直して」しまう、数が合っていないのに全部そろったと言う、受け入れの条件をすべて確かめずに「終わった」と宣言する、といった失敗です。

```yaml
agent:
  execution_guidance: "auto"   # "auto" | true | false | ["model-substring", ...]
```

| 値 | 動き |
|-------|----------|
| `"auto"`（初期値） | 名前に `gpt`、`codex`、`grok`、`deepseek`、`kimi`、`qwen`、`glm`、`minimax`、`mimo`、`mistral` を含むモデルで有効になります。 |
| `true` | モデルにかかわらず、常に有効です。 |
| `false` | モデルにかかわらず、常に無効です。 |
| `["deepseek", "my-custom-model"]` | モデル名に、並べた文字列のどれかが含まれるときだけ有効になります（大文字と小文字は区別しません）。 |

差し込まれるまとまりは、次のことを扱います。

- **ツールを使い続けること** — 作業が終わり、*なおかつ*確かめられるまでツールを呼び続けること。空の結果、一部だけの結果、やけに狭い検索の結果は、結論を出す前に範囲を広げるか別の言葉で調べ直すこと。
- **ツールを必ず使うこと** — 計算、ハッシュ、日付、システムの状態、ファイルの事実は、頭の中で出さず、必ずツールから得ること。
- **外部へ書いたら読み返すこと** — 外部の仕組みの状態を変える書き込みをしたら、成功したと言う前に、その対象を読み返すこと（ツールがすでに確認した内部のファイルの編集は、確かめ直しません）。
- **数を突き合わせること** — 申告された総数（`total`、`reply_count`、`has_more`）は動かせない主張として扱い、食い違ったら取り直すか、プログラムで数え直すこと。
- **書かれたとおりを保つこと** — 決められた形に合わない識別子を、正規化したり「直したり」しないこと。検索がうまくいったからといって、形の崩れたもとの文字列が正しいことにはなりません。
- **確かめてから終えること** — 「終わった」とは、挙げられた受け入れの条件をすべて確かめたということであって、もっともらしい一部ではありません。

この関門は `tool_use_enforcement` とは独立していて、どちらか一方だけを有効にできます。案内はセッションの初めにモデル名をもとに一度だけ決まるので、システムのプロンプトはその会話のあいだ1バイトも変わりません（キャッシュにも都合がよいということです）。Gemini と Gemma が自動の一覧から外れているのは、より的を絞った Google 向けの運用の案内を受け取るからです。Claude が外れているのは、こうした失敗をしないからです — どのモデルも `true` か文字列の並びで加えられます。

## ツールのループへの備え {#tool-loop-guardrails}

Hermes は、エージェントが実りのないツールの呼び出しの繰り返しにはまったことを見つけます — 同じ呼び出しが何度も失敗する、同じツールが何度も失敗する、何度呼んでも同じ結果が返って前に進まない、といった状態です。初期状態では、モデルが自分で立て直せるように、ツールの結果に**警告**を差し込みます。強制的に止めることはしません。CLI や TUI を見ている人が手を出せるからです。

人が見ていないゲートウェイやサーバーでの運用では、強制的に止める設定を有効にして、繰り返しの上限を使い切る前にはまった状態を断ち切ってください。

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

`hard_stop_enabled` の初期値が `false` なのは、対話的なセッションには人がいるからです。人が見ていない構成（ゲートウェイ、cron、カンバンのワーカー）では `true` にして、繰り返しの失敗を警告だけで済ませず、止めるようにしてください。[Docker と、人が見ていない構成](/hermes/docs/user-guide/docker/)も参照してください。

### やり取りごとの暴走の上限 {#per-turn-runaway-loop-caps}

上の、失敗の回数を基準にしたしきい値とは別に、`loop_caps` は1回のエージェントのやり取りで `web_search` を何回呼べるか、サブエージェントを何体起動できるかに、はっきりした上限を設けます。数え直しはやり取りのたびに行われるので、何度もやり取りするまっとうなセッションが縛られることはありません。ただし、1回のやり取りが際限のない検索や委任の繰り返しに陥ったときは止まります。これは常に働き、`hard_stop_enabled` にかかわらず発動します。1回のやり取りでウェブ検索を何十回もしたり、サブエージェントを何十体も起動したりするのはすでに異常なので、初期値は低くしてあります。上限に達すると、その呼び出しは理由を添えて止められ、残りの余力を使い切ることなく、やり取りはきれいに終わります。どちらかの値を `0` にすると、その上限はなくなります。

1回の `delegate_task` のまとまりでは、それぞれの作業が `max_subagents` に数えられます（3件のまとまりなら3消費します）。ですからこの上限は、`delegate_task` を呼んだ回数ではなく、実際に起動したサブエージェントの数を追いかけます。

これは Claude Code のセッションごとの WebSearch とサブエージェントの上限（v2.1.212）と同じ考え方で、あちらも初期値は200で、`/clear` で数え直しになります。

### 実行時の停滞への備え {#runtime-anti-stall-guards}

上の、失敗を基準にした備えを補うものとして、`agent.stall_guards`（初期値は `true`）は、無駄なやり取りを防ぐ控えめな2つの備えを有効にします。1つめは**同じ呼び出しの繰り返しを断つ仕組み**です。同じツールが同じ引数で3回以上続けて呼ばれ、*なおかつ*同じ結果を返したとき、その結果に「同じ呼び出しを繰り返さないように」と伝える短い1行が添えられます。呼び出しを止めることは決してありませんし、繰り返し呼ぶのが当たり前のもの（`process`、`*_get_result`、`*_poll`）は対象外です。2つめは**やりかけの意思の立て直し**です。モデルがツールを呼ばずにやり取りを終えたのに、短い返事がこれから何かをすると言い残している場合（「ではファイルを直します……」など）、Hermes は、意思の確認の立て直しと同じ、回数を区切った仕組みで動くよう促し直します（1回のやり取りにつき最大2回）。どちらもキャッシュを壊しません（案内は結果を作るときに足され、あとから書き換えることはありません）。まとめて止めることもできます。

```yaml
agent:
  stall_guards: false
```

同じ設定は、**結果を参照で置き換える仕組み**も有効にします。同じツールの呼び出しをやり直して、1バイトも変わらない新しい結果が返ったとき、その重なった中身は全文を繰り返すのではなく、前の結果を指す短い参照（ツール名、`tool_call_id`、引数の要約、そして最初の結果がディスクへ逃がされていればその場所）として文脈に入ります。ツールは毎回きちんと実行されるので、繰り返し確かめる意味は保たれます。結果が変わっていれば、いつでもそのまま全文が流れます。512文字に満たない結果、エラーの結果、複数の形式を含む結果が置き換えられることはありません。繰り返し確かめるためのものは置き換え*られます*（変わらない確認こそ、重なった中身に何の情報もない場面だからです）。

## 読み上げの設定 {#tts-configuration}

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

これは `text_to_speech` のツールと、音声モードでの話し声による返事（CLI やメッセージのゲートウェイでの `/voice tts`）の両方を決めます。

**速さの決まる順番:** プロバイダーごとの速さ（たとえば `tts.edge.speed`）→ 全体の `tts.speed` → 初期値の `1.0`。すべてのプロバイダーで同じ速さにしたいなら全体の `tts.speed` を設定し、細かく決めたいならプロバイダーごとに上書きしてください。

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

### やり取りごとのまとめと、待機表示のトークンの流れ {#per-turn-summary-and-spinner-token-flow}

`display.turn_summary`（初期値は `true`）は、**対話的な CLI** のやり取りのあとに、そのやり取りが実際に何をしたかをまとめた、薄い色の1行を表示します。

```
⋯ 12.4s · edited 2 files +18 -3 · read 4 files · ran 3 commands
```

数え上げは、CLI がもともと受け取っているツールの進み具合の流れから読み取るので、余計な費用はかかりません。細かい点は次のとおりです。

- 時間は、そのやり取りの実際の長さです（1分を越えると `2m05s` のようになります）。
- ツールの呼び出しは動詞ごとにまとめられ（`edited`、`read`、`ran`、`searched` など）、単数と複数も正しく書き分けられます。決まった動詞のないプラグインや MCP のツールは `called N tools` にまとまります。
- `+X -Y` の行の増減は、ツールの結果がもともと差分を返すときにだけ出ます（いまのところ `patch` です）。Hermes がそれを計算するために git を呼ぶことはないので、`write_file` による編集は増減なしで数えられます。
- **失敗したツールの呼び出しは数えません** — 断られた書き込みが、成功した編集として表示されることはありません（合わせて働く警告は [ファイルの変更を確かめる仕組み](#file-mutation-verifier)を参照してください）。
- 長いやり取りでは、動詞のまとまりは4つまでで、そのあとに `+N more` が付くので、行が折り返すことはありません。
- ツールを呼ばなかった短いやり取りでは、何も表示されません。

`display.spinner_token_flow`（初期値は `true`）は、CLI の待機表示の時計に、そのやり取りで積み上がった出力のトークン数を添えます。

```
  ⚡ Reading cli.py  (  2.3s · ↓ 1.2k tok)
```

数はやり取りごとで（セッションの合計はやり取りの初めを基準に数え直します）、そのやり取りの中で API の呼び出しが使用量を報告するたびに更新されます。最初の報告が届くまでは何も出ないので、紛らわしい `↓ 0 tok` を目にすることはありません。

どちらの項目も表示だけのもので、CLI だけのものです。静かな動きのとき、`display.tool_progress` が `off` のとき、1回かぎりの問い合わせや `-Q` のまとめ実行のとき、そしてゲートウェイやメッセージの画面では出ません（そちらは `display.runtime_footer` を使います）。どちらも `false` にすれば止まります。

### ファイルの変更を確かめる仕組み {#file-mutation-verifier}

`display.file_mutation_verifier` が `true`（初期値）のとき、そのやり取りの中で `write_file` や `patch` の呼び出しが失敗し、同じ場所への書き込みがそのあと成功しなかった場合、Hermes はアシスタントの最後の返事に1行の注意を添えます。これによって「まとめて直そうとして半分が黙って失敗し、モデルは成功したとまとめる」という言い過ぎを、編集のたびに自分で `git status` を打たなくても捕まえられます。

添えられる文の例です。

```
⚠️ File-mutation verifier: 3 file(s) were NOT modified this turn despite any wording above that may suggest otherwise. Run `git status` or `read_file` to confirm.
  • concepts/automatic-organization.md — [patch] Could not find match for old_string
  • concepts/lora.md — [patch] Could not find match for old_string
  • concepts/rag-pipeline.md — [patch] Could not find match for old_string
```

`file_mutation_verifier: false`（または `HERMES_FILE_MUTATION_VERIFIER=0`）にすれば出なくなります。この仕組みが働くのは、やり取りの終わりに本当の失敗が残っているときだけです。失敗した修正を同じやり取りの中でやり直して成功していれば、そのファイルについては何も出ません。

**モデルのまとめより、この仕組みを信じてください。** この文が出たということは、挙げられたファイルがディスク上で**変わっていない**ということです。アシスタントの締めの言葉が終わったと言っていても同じです。よくある原因は次のとおりです。

- **書き込みを断られた** — その場所が認証情報の禁止一覧に入っているか、`HERMES_WRITE_SAFE_ROOT` の外です（[ファイルへの書き込みの安全](/hermes/docs/user-guide/security/#file-write-safety)を参照してください）
- **修正が合わなかった** — `old_string` がディスク上のファイルと一致しませんでした
- **書式の関門** — 書く前の JSON / YAML / TOML の確認に通りませんでした

書き込みが止められたときの例です。

```
⚠️ File-mutation verifier: 2 file(s) were NOT modified this turn despite any wording above that may suggest otherwise. Run `git status` or `read_file` to confirm.
  • ~/.hermes/cron/jobs.json — [patch] Write denied: '…' is outside HERMES_WRITE_SAFE_ROOT (/path/to/project)
  • ~/.hermes/scripts/monitor.py — [write_file] Write denied: '…' is outside HERMES_WRITE_SAFE_ROOT (/path/to/project)
```

Hermes の状態（cron のジョブ、スキル、`~/.hermes/` の下のスクリプト）への書き込みが失敗しているなら、環境に `HERMES_WRITE_SAFE_ROOT` が設定されていないか確かめてください。cron を直すときは、`jobs.json` を直接いじるのではなく、`cronjob` のツールか `hermes cron edit` を使ってください。

### 決まり文句の表示に使う言語 {#ui-language-for-static-messages}

`display.language` の設定は、利用者に見える決まり文句のうち、ごく一部を訳します — CLI の承認の確認と、ゲートウェイのいくつかのスラッシュコマンドの返事（再起動の待ちの知らせ、「approval expired」、「goal cleared」など）です。エージェントの返事、ログの行、ツールの出力、エラーの記録、スラッシュコマンドの説明は訳**しません** — それらは英語のままです。エージェント自身に別の言語で答えてほしいなら、プロンプトやシステムのメッセージでそう伝えてください。

使える値は、`en`（初期値）、`zh`（簡体字中国語）、`zh-hant`（繁体字中国語）、`ja`（日本語）、`de`（ドイツ語）、`es`（スペイン語）、`fr`（フランス語）、`tr`（トルコ語）、`uk`（ウクライナ語）、`af`（アフリカーンス語）、`ko`（韓国語）、`it`（イタリア語）、`ga`（アイルランド語）、`pt`（ポルトガル語）、`ru`（ロシア語）、`hu`（ハンガリー語）です。知らない値は英語に戻ります。

`HERMES_LANGUAGE` の環境変数を使えば、セッションごとに設定することもできます。こちらが設定の値より優先されます。

```yaml
display:
  language: zh   # CLI approval prompts appear in Chinese
```

| 設定 | 見えるもの |
|------|-------------|
| `off` | 何も出ません — 最後の返事だけです |
| `new` | ツールが変わったときだけ、その印が出ます |
| `all` | すべてのツールの呼び出しが、短いさわりとともに出ます（初期値） |
| `verbose` | 引数、結果、調査用のログがすべて出ます |

CLI では `/verbose` でこれらを順に切り替えられます。メッセージのプラットフォーム（Telegram、Discord、Slack など）で `/verbose` を使うには、上の `display` の節で `tool_progress_command: true` にしてください。そうすると、このコマンドが設定を順に切り替えて保存します。

ツールの進み具合の表示には、その更新を安全に表示できるゲートウェイの連携が必要です。メッセージの編集に対応していないプラットフォーム（Signal を含みます）では、`/verbose` で `off` 以外を保存しても、進み具合の吹き出しは出ません。

### 集中表示（`/focus`、CLI と TUI） {#focus-view-focus-cli-tui}

`display.focus_view: true` にすると**集中表示**が有効になります。実況ではなく答えだけがほしいときのための、出力を減らした表示です。もう1つの抑え込みの経路ではなく、同じ `tool_progress` の仕組みの上に薄く載っています。

- 有効にすると `tool_progress` が `off` に固定され、それまでの設定は `display.focus_saved_tool_progress` に控えられます
- `/focus off` はその設定をそのまま戻すので、`/verbose verbose` にしていた状態も往復して残ります
- やり取りが終わるたびに、薄い色の戻し方の1行が出ます — `⋯ 7 tool lines hidden · /focus off to show` — 数えるのは*集中表示に入る前*の設定に対してなので、もともと出していなかった行を隠したと言うことはありません
- 状態の欄には `◉ focus` の印がずっと出ているので（prompt_toolkit の CLI でも Ink の TUI でも）、出力が減っていることが見えなくなることはありません
- 集中表示のあいだに `/verbose` を切り替えると、設定は `/verbose` の側へ戻り、印は消えます

集中表示は**表示だけのもの**です。会話の履歴、システムのプロンプト、ツールの定義、リクエストの中身に手を触れることは決してありません — 隠された細かい情報は画面に出ないだけで、捨てられてはいませんし、プロンプトのキャッシュにも一切影響しません。

### 実行時の情報の添え書き（ゲートウェイのみ） {#runtime-metadata-footer-gateway-only}

`display.runtime_footer.enabled: true` のとき、Hermes はゲートウェイでのやり取りの**最後の**メッセージに、実行時の情報の短い添え書きを付けます。いまのところ、モデル、文脈の窓の使用率、いまの作業ディレクトリを出せます。初期状態では無効です。すべての返事にこの出どころを付けたいチームは、ゲートウェイごとに有効にしてください。

```yaml
display:
  runtime_footer:
    enabled: true
    fields: ["model", "context_pct", "cwd"]   # order shown; drop any to hide
```

使える項目は次のとおりです。

| 項目 | 表示されるもの | 例 |
| --- | --- | --- |
| `model` | モデルの id だけ。提供元の接頭辞は落とします | `gpt-5.4` |
| `context_pct` | 最後の呼び出しでの文脈の使用率 | `5%` |
| `latency` | そのやり取りにかかった実時間 | `22s`、`1m05s` |
| `cwd` | ホームからの相対の作業ディレクトリ | `~` |

初期の項目は `["model", "context_pct", "cwd"]` です。`latency` は自分で加えるものです — 使いたいなら `fields` に足してください。値が得られない項目は、空欄を出さずに静かに飛ばされます。

`/footer` のスラッシュコマンドで、どのセッションでも動かしたまま切り替えられます。

Telegram / Discord / Slack の返事に添えられた例です。

```
— claude-opus-4.7 · 12 tool calls · 2m 14s · $0.042
```

添え書きが付くのは、やり取りの**最後の**メッセージだけです。途中の更新はきれいなままです。

### プラットフォームごとの進み具合の上書き {#per-platform-progress-overrides}

プラットフォームによって、どれだけ細かく出すべきかは違います。`display.platforms` で、プラットフォームごとに設定してください。

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

上書きのないプラットフォームは、全体の `tool_progress` の値に従います。書けるプラットフォームの名前は `telegram`、`discord`、`slack`、`signal`、`whatsapp`、`matrix`、`mattermost`、`email`、`sms`、`homeassistant`、`dingtalk`、`feishu`、`wecom`、`weixin`、`bluebubbles`、`qqbot` です。従来の `display.tool_progress_overrides` の項目も互換のために今も読まれますが、非推奨で、最初に読み込むときに `display.platforms` へ移されます。

Signal が書けるプラットフォームとして挙がっているのは、設定をプラットフォームごとに保存できるからですが、いまの Signal の連携は送ったメッセージを編集できないので、進み具合の吹き出しは出ません。Signal の `tool_progress` は `off` のままにしてください。ツールの呼び出しをその場で見たいなら、CLI か、メッセージを編集できるプラットフォームを使ってください。

`interim_assistant_messages` はゲートウェイだけのものです。有効にすると Hermes は、やり取りの途中でできあがったアシスタントの更新を、別のメッセージとして送ります。これは `tool_progress` とは独立していて、ゲートウェイで少しずつ受け取る設定も要りません。

`show_commentary`（初期値は `true`）は、Codex Responses のモデルの実況の経路 — これらのモデルが、自分の中の考えとは別に出す、整った進み具合の語り — を制御します。有効にすると、できあがった実況のメッセージが、やり取りの途中の更新として見える形で届きます（ゲートウェイでは `interim_assistant_messages` も必要です）。この語りが煩わしいなら `false` にしてください。そうすると実況は考えの経路へ回り、`show_reasoning` が有効なときにだけ表示されます。

## プライバシー {#privacy}

```yaml
privacy:
  redact_pii: false  # Strip PII from LLM context (gateway only)
```

`redact_pii` が `true` のとき、ゲートウェイは対応しているプラットフォームについて、LLM へ送る前にシステムのプロンプトから個人を特定できる情報を伏せます。

| 項目 | 扱い |
|-------|-------------|
| 電話番号（WhatsApp と Signal でのユーザー ID） | `user_<12-char-sha256>` に置き換えます |
| ユーザー ID | `user_<12-char-sha256>` に置き換えます |
| チャット ID | 数字の部分を置き換え、プラットフォームの接頭辞は残します（`telegram:<hash>`） |
| ホームのチャンネルの ID | 数字の部分を置き換えます |
| 利用者の名前やユーザー名 | **手を触れません**（本人が決めたもので、誰にでも見えるものだからです） |

**対応しているプラットフォーム:** 伏せる処理が働くのは WhatsApp、Signal、Telegram です。Discord と Slack は対象外です。呼びかけの仕組み（`<@user_id>`）が、LLM の文脈に本物の ID を必要とするからです。

置き換えの結果は決まっているので、同じ利用者はいつも同じ値になります。ですからモデルは、グループのチャットでも利用者を見分けられます。振り分けと配信には、内部でもとの値が使われます。

### OpenAI Codex への名乗り {#openai-codex-request-identity}

OpenAI は、第三者の Codex の仕組みに名乗ることを求めています。
ChatGPT で認証した公式の Codex の接続先へのリクエストには、自動的に
`originator: hermes-agent` と `User-Agent: HermesAgent/<version>` が付きます。
もともとの ChatGPT のアカウントのヘッダーはそのまま残ります。プロンプトの中身が
足されたり、記録のためのリクエストが送られたりすることはありません。
OpenAI の API を直接呼ぶ場合と、独自のプロキシの接続先では何も変わりません。

## 文字起こし（STT） {#speech-to-text-stt}

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

言語の決まり方は、**どの**文字起こしのプロバイダーでも同じです（local、groq、openai、mistral、xai、elevenlabs、deepinfra、コマンド型のプロバイダー、プラグインのいずれも）。`stt.<provider>.language` → `stt.language` → `HERMES_LOCAL_STT_LANGUAGE` の環境変数 → プロバイダーの自動判定、の順です。**初期値は `stt.language: "en"` です** — Whisper の自動判定は、短い音声やなまりのある音声をよく取り違え、それが「音声メモが違う言語で文字起こしされる」という形で現れるからです。英語以外を話す人は、`stt.language` に自分の言語のコードを一度設定してください（たとえば `"es"`、`"zh"`、`"uk"`）。複数の言語を使うので自動判定に戻したいなら、`""` にしてください。

ゲートウェイに音声メモをエージェントのために文字起こしさせつつ、その文字起こしをチャットへ返させたくないときは（たとえば顧客と話す WhatsApp のボット）、`stt.echo_transcripts: false` にしてください。

プロバイダーごとの動きは次のとおりです。

- `local` は、手元のマシンで動く `faster-whisper` を使います。別途 `pip install faster-whisper` で入れてください。無音から言葉を作り出してしまうことへの備えは、初期状態で有効です。Silero の VAD の絞り込みが、無音や雑音を Whisper へ届かせません。窓をまたいだ条件付けは止めてあり、モデル自身が「たぶん言葉ではない」と判断し、*なおかつ*自信のない部分は落とされます。音楽や環境音のような言葉でない音を、そのまま文字起こししたいなら `stt.local.vad: false` にしてください。待ち時間を短くするため、モデルは音声メモのあいだメモリに残ります。使われていないときに自動で手放させたいなら、`stt.local.unload_after_idle_seconds` を設定してください（たとえば5分なら `300`）。CUDA のマシンでは GPU のメモリが空きます（手元の LLM が同じ GPU を使っている場合の大きな利点です）。CPU では、そのメモリはプロセスの中で再び使えるようになりますが、OS から見える使用量は、プロセスがほかのことに使うまで減らないことがあります。次の音声メモが来ると、モデルは意識せずとも読み直されます。
- `groq` は Groq の Whisper 互換の接続先を使い、`GROQ_API_KEY` を読みます。`stt.groq.language`（または全体に効く `HERMES_LOCAL_STT_LANGUAGE` の環境変数）を渡せば、自動判定を飛ばして待ち時間を減らせます。
- `openai` は OpenAI の音声の API を使い、`VOICE_TOOLS_OPENAI_KEY` を読みます。

クラウドのプロバイダー（groq、openai、mistral、xai、elevenlabs、deepinfra）では、`ffmpeg` が入っていれば初期状態で**送る前に無音を刈り込みます**。音声メモの中の長い間は、ファイルを送る前に手元でつぶされ、それぞれの間から `cloud_trim_keep_ms` の分だけ残るので、自然な間合いは保たれます。音声が短くなれば、送信は速くなり、分単位の課金は下がり、遠くのモデルが無音から言葉を作り出すことも減ります。12秒に満たない音声は刈り込みを飛ばします（そこで節約しても意味がありませんし、いくつかのプロバイダーは1回あたりの最低額を取るからです）。刈り込みは、できるときにするだけのものです — ffmpeg がない、刈り込みに失敗した、ほとんど無音だった、刈り込んでも1割ほども縮まない、といった場合には、もとのファイルがそのまま送られます。いつでももとのまま送りたいなら（クラウドのプロバイダーで音楽や環境音を文字起こしするときなど）、`stt.cloud_trim_silence: false` にしてください。コマンド型やプラグインのプロバイダーには、刈り込んだ音声は渡りません。

`stt.provider` をはっきり選んだ場合、それは厳密に守られます — 使えないときは、別のプロバイダーへ切り替えるのではなく、`hermes tools` を実行するよう促すエラーになります。一度もプロバイダーを選んでいないときにだけ、Hermes は `local` → `groq` → `openai` の順に自動で選びます。

Groq と OpenAI のモデルの上書きは、環境変数で行います。

```bash
STT_GROQ_MODEL=whisper-large-v3-turbo
STT_OPENAI_MODEL=whisper-1
GROQ_BASE_URL=https://api.groq.com/openai/v1
STT_OPENAI_BASE_URL=https://api.openai.com/v1
```

### 文字起こしへの前置き（語彙の手がかり） {#transcription-prompt-vocabulary-hints}

`stt.prompt` は、前置きを受け付ける文字起こしの裏側へ渡す、任意の決まった手がかりです。Whisper 系のモデルが聞き間違えやすい固有名詞、製品名、専門用語に使ってください。

```yaml
stt:
  provider: "local"
  prompt: "Hermes, Teknium, Nous Research, kanban, Ollama"
```

**組み立て方。** 設定の値が土台になります。[`pre_transcription`](/hermes/docs/user-guide/features/hooks/#pre_transcription) のフックを登録したプラグインが、その上に書き換えを重ねます。項目ごとに、最後に書いたものが残ります。複数のプラグインの手がかりは決まった順で重なります。プラグインは id の順に読み込まれ、それぞれのプラグインの処理は登録された順に走るので、同じプラグインの組み合わせなら、いつでも同じ最終的な前置きになります。フックが `prompt` に空の文字列を返すと、その回については設定の前置きが消えます。フックは `language` と `model` も上書きできます。`file_path` は読み取り専用で、変えようとしても記録されて捨てられます。フックが登録されておらず `stt.prompt` も設定されていなければ、送られるリクエストは以前の版とまったく同じです。

**プロバイダーの対応。**

| プロバイダー | 前置きの項目 | 動き |
|----------|-----------------|----------|
| `local`（faster-whisper） | `initial_prompt` | 手元のモデルへそのまま渡されます |
| `openai` | `prompt` | 文字起こしのリクエストにそのまま渡されます |
| `groq` | `prompt` | 文字起こしのリクエストにそのまま渡されます |
| `mistral` | `prompt` | 文字起こしのリクエストにそのまま渡されます |
| `deepinfra` | `prompt` | OpenAI 互換の経路で、そのまま渡されます |
| `xai` | 対応していません | DEBUG で記録され、前置きなしでリクエストが進みます |
| `elevenlabs` | 対応していません | DEBUG で記録され、前置きなしでリクエストが進みます |
| `local_command` | 対応していません | DEBUG で記録され、前置きなしでリクエストが進みます |
| `type: command` の `stt.providers.<name>` | 対応していません | DEBUG で記録され、前置きなしでリクエストが進みます |
| プラグインが登録したプロバイダー | `transcribe(**extra)` の引数の `prompt` | 前置きが設定されているときだけ送られるので、この項目より前からあるプロバイダーへの呼び出しは変わりません |

**長さ。** Whisper 系のモデルが手がかりとして見るのは、前置きの末尾およそ224トークンだけです。whisper 系の裏側（`local`、`openai`、`groq`、`deepinfra`）については、Hermes が手元でこの上限を守ります。長すぎる前置きは末尾を残して切られ、警告が記録されます — 前置きの長さでリクエストが失敗することはありません。ほかの裏側（`mistral`、プラグインのプロバイダー）は前置きをそのまま受け取り、確認は自分で行います。いずれにしても、手がかりは短く具体的に保ってください。

:::warning 前置きは音声と一緒に送られます
できあがった前置きは、音声のファイルと一緒に、設定した文字起こしのプロバイダーへ送られます。秘密の情報や、そのセッションから来た情報を `stt.prompt` にも、`pre_transcription` のフックが返すものにも入れないでください。とくに、プロバイダーが手元の `faster-whisper` ではなく、外部の API のときは気をつけてください。
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

CLI で `/voice on` と入力するとマイクが使えるようになり、`record_key` で録音の開始と停止をします。話し声での返事は `/voice tts` で切り替えます。ひととおりの準備とプラットフォームごとの動きは [音声モード](/hermes/docs/user-guide/features/voice-mode/)を参照してください。

## 少しずつ受け取る表示 {#streaming}

返事がそろうのを待たずに、届いたトークンから順にターミナルやメッセージのプラットフォームへ流します。

### CLI での表示 {#cli-streaming}

```yaml
display:
  streaming: true         # Stream tokens to terminal in real-time
  show_reasoning: true    # Also stream reasoning/thinking tokens (optional)
```

有効にすると、返事は枠の中に1トークンずつ現れます。ツールの呼び出しは、これまでどおり静かに記録されます。プロバイダーがこの形に対応していなければ、自動でふつうの表示に戻ります。

### ゲートウェイでの表示（Telegram、Discord、Slack） {#gateway-streaming-telegram-discord-slack}

```yaml
streaming:
  enabled: true           # Enable progressive message editing (default: false)
  transport: auto         # "auto" (default) | "edit" (progressive message editing) | "off"
  edit_interval: 0.8      # Seconds between message edits (default: 0.8)
  buffer_threshold: 24    # Characters before forcing an edit flush (default: 24)
  cursor: " ▉"            # Cursor shown during streaming
  fresh_final_after_seconds: 0    # Opt in to fresh final (Telegram) when preview is this old
```

有効にすると、ボットは最初のトークンでメッセージを送り、以降トークンが届くたびにそれを少しずつ編集していきます。メッセージの編集に対応していないプラットフォーム（Signal、メール、Home Assistant）は最初の試みで見分けられ、そのセッションではこの表示が静かに止まるので、メッセージがあふれることはありません。

少しずつ編集するのではなく、やり取りの途中でアシスタントの更新を自然な形で別々に送りたいなら、`display.interim_assistant_messages: true` にしてください。

**あふれたときの扱い:** 流している文章がプラットフォームのメッセージの長さの上限（およそ4096文字）を越えると、いまのメッセージはそこで確定し、新しいメッセージが自動で始まります。

**新しいメッセージとして確定する（Telegram）:** Telegram の `editMessageText` は、もとのメッセージの時刻をそのまま残します。ですから長く流し続けた返事は、できあがったあとも最初のトークンの時刻のままになります。`fresh_final_after_seconds > 0` にすると、古くなった下書きを、まったく新しい最終のメッセージとして届け、下書きのほうはできる範囲で消します。初期値は `0` で、その場で確定するので、両方の操作が見えるクライアントで一瞬メッセージが重複して消える動きを避けられます。

:::note プラットフォームごとの初期値
大もとの `streaming.enabled` は初期状態で `false` です — これを入れるまで何も流れません。有効にしたあとは、**プラットフォームごとに**決まります。Telegram は `display.platforms.telegram.streaming: true`（流します）、Discord は `display.platforms.discord.streaming: false`（流しません）で配られます。ですから有効にしたあと、Telegram はそのまま流れ、Discord は設定を変えるまでメッセージをまとめて返します。プラットフォームごとの切り替えは、ダッシュボードの **Channels** の切り替えからでも、`~/.hermes/config.yaml` から直接でも変えられます。
:::

## グループのチャットでのセッションの分け方 {#group-chat-session-isolation}

CLI、TUI とダッシュボード、メッセージのゲートウェイをまたいで、同時に開けるチャットの
セッションの数を制限します。

```yaml
max_concurrent_sessions: null  # null/0 = unlimited; positive integer = active session cap
```

枠が使われるのは、そのセッションが**最初のやり取り**を行ったときで、チャットの窓を
開いたときではありません。チャットを開いたり、再開したり、つなぎ直したりするだけでは
何も消費しないので、置きっぱなしのデスクトップのタブ（や、不安定な websocket が起こす
裏での再開）が、この上限を分け合っているメッセージのゲートウェイを枯らすことはありません。

上限に達すると Hermes は、どの画面が枠を持っているかを名指しした、はっきりした知らせを
返します。すでに動いているセッションの動きは変わりません。
いまの枠の使われ方と、それぞれの持ち主は `hermes status` で見られます。

正式な項目は、いちばん上の階層の `max_concurrent_sessions` です。Hermes は
`gateway.max_concurrent_sessions` も受け付けますが、両方に書かれているときは
いちばん上の階層のほうが勝ちます。

この上限は、手元の実行時の記録のファイルで守られ、できる範囲でのものです。その記録を
読めなかったり錠を掛けられなかったりしたときは、利用者が締め出されないよう、Hermes は
通す側に倒れます。想定しているのは1台のホストやプロファイルでの実行で、複数のマシンに
またがってマウントした `$HERMES_HOME` を共有する使い方ではありません。

共有のチャットで、会話を部屋ごとに1つにするか、参加者ごとに1つにするかを決めます。

```yaml
group_sessions_per_user: true  # true = per-user isolation in groups/channels, false = one shared session per chat
```

- `true` が初期値で、おすすめの設定です。Discord のチャンネル、Telegram のグループ、Slack のチャンネルのような共有の場では、プラットフォームがユーザー ID を渡してくれる限り、送信者ごとに自分のセッションを持ちます。
- `false` は、部屋を共有する昔の動きに戻します。チャンネルを1つの共同の会話として扱わせたいなら役に立ちますが、その分、利用者どうしが文脈もトークンの費用も割り込みの状態も共有することになります。
- 1対1のやり取りは変わりません。Hermes はこれまでどおり、チャットや DM の ID でそれらを分けます。
- スレッドは、どちらの設定でも親のチャンネルから分かれたままです。`true` のときは、スレッドの中でも参加者ごとに自分のセッションを持ちます。

動きの詳しい説明と例は、[セッション](/hermes/docs/user-guide/sessions/)と [Discord の案内](/hermes/docs/user-guide/messaging/discord/)を参照してください。

## 許可していない相手からの1対1のやり取り {#unauthorized-dm-behavior}

知らない相手が1対1でメッセージを送ってきたときの動きを決めます。

```yaml
unauthorized_dm_behavior: pair

whatsapp:
  unauthorized_dm_behavior: ignore
```

- `pair` は、チャット型の1対1のやり取りができるプラットフォームでの初期値です。Hermes は利用を断りますが、1対1のやり取りで一度きりのペアリングの符号を返します。
- `ignore` は、許可していない相手からのメッセージを静かに捨てます。
- メールは、`platforms.email.unauthorized_dm_behavior: pair` を設定しない限り `ignore` が初期値です。受信箱には関係のない未読のメールが入っていることがあるからです。
- プラットフォームごとの設定は全体の初期値を上書きするので、全体ではペアリングを有効にしたまま、1つのプラットフォームだけ静かにできます。

## 手早いコマンド {#quick-commands}

LLM を呼ばずにシェルのコマンドを走らせる、あるいは1つのスラッシュコマンドを別のものの別名にする、自分だけのコマンドを決められます。exec の手早いコマンドはトークンを消費しないので、メッセージのプラットフォーム（Telegram、Discord など）からサーバーの様子を見たり、ちょっとしたスクリプトを走らせたりするのに便利です。

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

使い方: CLI でも、どのメッセージのプラットフォームでも、`/status`、`/disk`、`/update`、`/gpu`、`/restart` と入力します。`exec` のコマンドはホストの上で動き、その出力をそのまま返します — LLM の呼び出しはなく、トークンも使いません。`alias` のコマンドは、指定したスラッシュコマンドに置き換わります。

- **30秒で打ち切ります** — 長く走るコマンドは、エラーの知らせとともに止められます
- **優先順位** — 手早いコマンドはスキルのコマンドより先に調べられるので、スキルの名前を上書きできます
- **入力の補完** — 手早いコマンドは実行のときに解決されるので、組み込みのスラッシュコマンドの補完の一覧には出ません
- **種類** — 使えるのは `exec` と `alias` です。ほかの種類はエラーになります
- **どこでも使えます** — CLI、Telegram、Discord、Slack、WhatsApp、Signal、メール、Home Assistant

文字列だけの、プロンプトの近道は手早いコマンドとして使えません。繰り返し使うプロンプトの流れには、スキルを作るか、すでにあるスラッシュコマンドの別名にしてください。

## 人らしい間 {#human-delay}

メッセージのプラットフォームで、人が返すような間合いをまねます。

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

**`mode`** は、スクリプトの作業ディレクトリと Python の実行ファイルを決めます。

- **`project`**（初期値） — スクリプトは、そのセッションの作業ディレクトリで、いま有効な virtualenv や conda の環境の python で動きます。プロジェクトの依存（`pandas`、`torch`、プロジェクトのパッケージ）や相対の場所（`.env`、`./data.csv`）が自然に解決され、`terminal()` から見えるものと合います。
- **`strict`** — スクリプトは一時的な置き場で `sys.executable`（Hermes 自身の python）で動きます。同じ結果を再現しやすい代わりに、プロジェクトの依存や相対の場所は解決されません。

環境の掃除（`*_API_KEY`、`*_TOKEN`、`*_SECRET`、`*_PASSWORD`、`*_CREDENTIAL`、`*_PASSWD`、`*_AUTH` を取り除きます）と、使えるツールの一覧は、どちらの設定でも同じように効きます — 設定を変えても安全の度合いは変わりません。

## ウェブ検索の裏側 {#web-search-backends}

`web_search` と `web_extract` のツールは、5つのプロバイダーに対応しています。`config.yaml` か `hermes tools` で設定してください。

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

| 裏側 | 環境変数 | 検索 | 本文の取得 |
|---------|---------|--------|---------|
| **Firecrawl**（初期値） | `FIRECRAWL_API_KEY` | ✔ | ✔ |
| **SearXNG** | `SEARXNG_URL` | ✔ | — |
| **Parallel** | `PARALLEL_API_KEY`（任意 — キーなしの無料の枠があります） | ✔ | ✔ |
| **Tavily** | `TAVILY_API_KEY`（任意 — 選べばキーなしでも使えます） | ✔ | ✔ |
| **Exa** | `EXA_API_KEY`（任意 — キーなしの無料の枠があります） | ✔ | ✔ |

**裏側の選び方:** 実行時には、必ず保存された `web.backend` の選択が使われます（`hermes tools` で設定します。`nous` は運用込みのツールのゲートウェイを通ります）。一度もウェブの裏側を選んでいないときにだけ、手持ちの API キーから自動で選ばれます。`SEARXNG_URL` だけなら SearXNG、`EXA_API_KEY` だけなら Exa、`TAVILY_API_KEY` だけなら Tavily、`PARALLEL_API_KEY` だけなら Parallel、`KEENABLE_API_KEY` だけなら Keenable です。**選択も認証情報もまったくない**ときは、キーなしの無料の枠の輪（Exa / Parallel / Tavily / Firecrawl / Keenable）を順に回り、回数の制限に当たったら自動で次へ移ります — 詳しくは [ウェブ検索の案内](/hermes/docs/user-guide/features/web-search/)を参照してください。いったん選択があると、`.env` にキーを足しても経路は変わりません。`hermes tools` で Tavily、Firecrawl、Keenable を選ぶのは、キーがなくてもできます。

**SearXNG** は、無料で自分で立てられる、プライバシーを守る横断検索の仕組みで、70以上の検索エンジンに問い合わせます。API キーは要りません — `SEARXNG_URL` に自分のインスタンスを設定するだけです（たとえば `http://localhost:8080`）。SearXNG は検索だけなので、`web_extract` には別の本文の取得のプロバイダーが必要です（`web.extract_backend` を設定してください）。Docker での立て方は [ウェブ検索の準備の案内](/hermes/docs/user-guide/features/web-search/)を参照してください。

**自分で立てた Firecrawl:** `FIRECRAWL_API_URL` に自分のインスタンスを指定してください。独自の URL を設定すると、API キーは任意になります（サーバー側で認証を止めるには `USE_DB_AUTHENTICATION=*** を設定します)。

**Parallel の検索の仕方:** `PARALLEL_SEARCH_MODE` で検索の動きを決めます — `fast`、`one-shot`、`agentic` のいずれかです（初期値は `agentic`）。

**Exa:** `~/.hermes/.env` に `EXA_API_KEY` を設定してください。`category` による絞り込み（`company`、`research paper`、`news`、`people`、`personal site`、`pdf`）と、ドメインや日付での絞り込みに対応します。

## ブラウザ {#browser}

ブラウザの自動操作の動きを設定します。

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

**ダイアログへの向き合い方:**

- `must_respond`（初期値） — ダイアログを受け止め、`browser_snapshot.pending_dialogs` に出して、エージェントが `browser_dialog(action=...)` を呼ぶのを待ちます。`dialog_timeout_s` 秒たっても返事がなければ、ページの JS がいつまでも止まらないよう、自動で閉じます。
- `auto_dismiss` — 受け止めて、すぐ閉じます。エージェントはあとから `browser_snapshot.recent_dialogs` に `closed_by="auto_policy"` として記録を見られます。
- `auto_accept` — 受け止めて、すぐ受け入れます。`beforeunload` の確認がしつこいページで役に立ちます。

ダイアログを扱う流れの全体は、[ブラウザの機能のページ](/hermes/docs/user-guide/features/browser/#browser_dialog)を参照してください。

ブラウザのツールセットは複数のプロバイダーに対応しています。Browserbase、Browser Use、手元の Chromium 系の CDP の準備については、[ブラウザの機能のページ](/hermes/docs/user-guide/features/browser/)を参照してください。

## タイムゾーン {#timezone}

サーバーのタイムゾーンを、IANA のタイムゾーンの文字列で上書きします。ログの時刻、cron の予定、システムのプロンプトに差し込まれる時刻に効きます。

```yaml
timezone: "America/New_York"   # IANA timezone (default: "" = server-local time)
```

使えるのは、IANA のタイムゾーンの識別子ならどれでもです（たとえば `America/New_York`、`Europe/London`、`Asia/Kolkata`、`UTC`）。空にするか書かなければ、サーバーの時刻になります。

## Discord {#discord}

メッセージのゲートウェイでの、Discord に固有の動きを設定します。

```yaml
discord:
  require_mention: true          # Require @mention to respond in server channels
  free_response_channels: ""     # Comma-separated channel IDs where bot responds without @mention
  auto_thread: true              # Auto-create threads on @mention in channels
```

- `require_mention` — `true`（初期値）のとき、ボットはサーバーのチャンネルでは `@BotName` と呼びかけられたときにだけ応答します。1対1のやり取りでは、呼びかけなしでも必ず応答します。
- `free_response_channels` — 呼びかけがなくてもすべてのメッセージに応答するチャンネルの ID を、カンマで区切って並べます。
- `auto_thread` — `true`（初期値）のとき、チャンネルでの呼びかけは自動的に会話のスレッドを作るので、チャンネルがすっきり保たれます（Slack のスレッドと似た考え方です）。

## セキュリティ {#security}

実行の前の安全の検査と、秘密の情報を伏せる設定です。

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

- `redact_secrets` — `true` のとき、ツールの出力の中で API キー、トークン、パスワードらしき並びを自動で見つけ、会話の文脈やログに入る前に伏せます。**初期状態で有効です。** 認証情報らしき文字列をそのまま見たいとき（不具合を調べるときや、伏せる仕組み自体を作るとき）にだけ、はっきり `false` にしてください。
- `tirith_enabled` — `true` のとき、ターミナルのコマンドは実行の前に [Tirith](https://github.com/sheeki03/tirith) で調べられ、危険かもしれない操作が見つけられます。
- `tirith_path` — tirith のバイナリの場所です。ふつうと違う場所に入れているなら設定してください。
- `tirith_timeout` — tirith の検査を待つ最長の秒数です。時間切れになったコマンドはそのまま進みます。
- `tirith_fail_open` — `true`（初期値）のとき、tirith が使えなかったり失敗したりしても、コマンドは実行されます。tirith が確かめられないコマンドを止めたいなら `false` にしてください。

## サイトの遮断の一覧 {#website-blocklist}

エージェントのウェブとブラウザのツールから、特定のドメインへ届かないようにします。

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

有効にすると、遮断するドメインの書き方に当てはまる URL は、ウェブやブラウザのツールが動く前に断られます。これは `web_search`、`web_extract`、`browser_navigate`、そのほか URL に触れるすべてのツールに効きます。

ドメインの書き方は次に対応します。
- そのままのドメイン: `admin.example.com`
- サブドメインをまとめて: `*.internal.company.com`（すべてのサブドメインを遮断します）
- トップレベルドメインをまとめて: `*.local`

共有のファイルには、1行に1つのドメインの決まりを書きます（空行と `#` で始まる注釈は無視されます）。ファイルがなかったり読めなかったりすると警告が記録されますが、ほかのウェブのツールが止まることはありません。

この決まりは30秒だけ覚えられるので、設定を変えても再起動なしで、すぐに効きます。

## 賢い承認 {#smart-approvals}

危険かもしれないコマンドの扱い方を決めます。

```yaml
approvals:
  mode: smart   # smart | manual | off
```

| 設定 | 動き |
|------|----------|
| `smart`（初期値） | 補助の LLM を使って、引っかかったコマンドが本当に危険かどうかを見極めます。危険の小さいコマンドは、そのコマンドについてだけ自動で承認されます。本当に危ないものは断られ、判断がつかないものは利用者に回されます。 |
| `manual` | 引っかかったコマンドを実行する前に、必ず利用者に確認します。CLI では対話的な承認の画面が出ます。メッセージでは、承認待ちとして並びます。 |
| `off` | 承認の確認をすべて飛ばします。`HERMES_YOLO_MODE=true` と同じです。**気をつけて使ってください。** |

smart の設定は、承認に疲れてしまうのを防ぐのにとくに役立ちます。安全な操作についてはエージェントがより自分で進められるようにしつつ、本当に壊してしまうコマンドは捕まえられます。

:::warning
`approvals.mode: off` にすると、ターミナルのコマンドに対する安全の検査がすべて止まります。信頼できる、隔てられた環境でだけ使ってください。
:::

### 断りが続いたときの遮断 {#denial-circuit-breaker}

`approvals.denial_breaker_threshold`（初期値は `3`）は、賢い承認の判定が断り続けているコマンドの言い換えを、エージェントが何度も試すのを防ぎます — 試すたびに見張り役の LLM の呼び出しが1回増えるからです。1つのセッションでこの回数だけ続けて断られると、断りの知らせは強い指示に変わり、やめて、止められた操作を報告し、自分で実行するか `/approve` するよう利用者に頼め、と伝えます。1回でも承認されれば数え直しになります。`0` にすると止まります。

```yaml
approvals:
  denial_breaker_threshold: 3   # 0 disables the breaker
```

### 断る決まり {#deny-rules}

`approvals.deny` は、当てはまるターミナルのコマンドを無条件に止める、書き方の並びです — `--yolo` でも、`/yolo` でも、`mode: off` でも止まります。組み込みの強い遮断の一覧に対する、利用者が書ける側の仕組みです。

```yaml
approvals:
  deny:
    - "git push --force*"
    - "*curl*|*sh*"
```

書き方は大文字と小文字を区別しない fnmatch の形で、YAML では引用符で囲む必要があります（先頭の `*` を裸で書くと読み込みに失敗します）。詳しくは [セキュリティ — 利用者が決める断る決まり](/hermes/docs/user-guide/security/#user-defined-deny-rules-approvalsdeny)を参照してください。

### 賢い承認の判断への追加の方針 {#custom-smart-approval-policy}

`approvals.smart_policy` を使うと、賢い承認の判定役への指示に、自分の決まりを書き足せます。設定すると、その文章は見張り役の LLM のシステムのプロンプト（信頼された経路であり、信頼できないコマンドの文章と並べられることは決してありません）に足されるので、コードを直さずに、自分の環境に合わせて判断を厳しくも緩くもできます。

```yaml
approvals:
  smart_policy: |
    Always ESCALATE commands that modify anything under /etc.
    APPROVE docker compose restarts in ~/deploys — they are routine here.
```

## 控え {#checkpoints}

ファイルを壊す操作の前に、自動でファイルシステムの控えを取ります。詳しくは [控えと巻き戻し](/hermes/docs/user-guide/checkpoints-and-rollback/)を参照してください。

```yaml
checkpoints:
  enabled: false                 # Enable automatic checkpoints (also: hermes chat --checkpoints). Default: false (opt-in).
  max_snapshots: 20              # Max checkpoints to keep per directory (default: 20)
```

## 委任 {#delegation}

委任のツールで動くサブエージェントの振る舞いを設定します。

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

**サブエージェントのプロバイダーとモデルの上書き:** 初期状態では、サブエージェントは親のエージェントのプロバイダーとモデルを受け継ぎます。`delegation.provider` と `delegation.model` を設定すると、別の組み合わせへ回せます — たとえば、主のエージェントには高価な推論のモデルを使いつつ、範囲の狭い作業には安くて速いモデルを使う、といったことができます。

**接続先を直接指定する:** 独自の接続先を分かりやすく使いたいなら、`delegation.base_url`、`delegation.api_key`、`delegation.model` を設定してください。サブエージェントはその OpenAI 互換の接続先へ直接送られ、この指定は `delegation.provider` より優先されます。`delegation.api_key` を書かなかった場合、Hermes は `OPENAI_API_KEY` だけに落ちます。

**通信の形（`api_mode`）:** Hermes は `delegation.base_url` から通信の形を自動で見分けます（たとえば `/anthropic` で終わる場所は `anthropic_messages` に、Codex や Anthropic 本来の形、Kimi-coding のホスト名はこれまでどおりの見分け方です）。この見分け方では判別できない接続先 — たとえば Azure AI Foundry、MiniMax、Zhipu GLM、Anthropic の形をした裏側の前に立つ LiteLLM のプロキシなど — では、`delegation.api_mode` に `chat_completions`、`codex_responses`、`anthropic_messages` のいずれかをはっきり書いてください。空のまま（初期値）にすれば自動の見分けが続きます。

委任のプロバイダーは、CLI やゲートウェイの起動時と同じやり方で認証情報を解決します。設定できるプロバイダーはすべて使えます: `openrouter`、`nous`、`copilot`、`zai`、`kimi-coding`、`minimax`、`minimax-cn`。プロバイダーを設定すると、正しいベース URL、API キー、通信の形が自動で決まるので、認証情報を手でつなぐ必要はありません。

**優先順位:** 設定の `delegation.base_url` → 設定の `delegation.provider` → 親のプロバイダー（受け継ぎ）。設定の `delegation.model` → 親のモデル（受け継ぎ）。`provider` を書かずに `model` だけを書くと、親の認証情報を保ったままモデル名だけが変わります（OpenRouter のように、同じプロバイダーの中でモデルを変えたいときに便利です）。

**幅と深さ:** `max_concurrent_children` は、1回のまとまりで並行して動くサブエージェントの数を抑えます（初期値は `3`、下限は1、上限なし）。`DELEGATION_MAX_CONCURRENT_CHILDREN` の環境変数でも設定できます。モデルが上限より長い `tasks` の並びを出したとき、`delegate_task` は黙って切り詰めるのではなく、上限を説明するツールのエラーを返します。`max_spawn_depth` は委任の木の深さを決めます（1〜3に収められます）。初期値の `1` では委任は平らで、子は孫を作れず、`role="orchestrator"` を渡しても静かに `leaf` に落ちます。`2` にすると、まとめ役の子が葉の孫を作れます。`3` にすると3段になります。エージェントは呼び出しごとに `role="orchestrator"` でまとめ役を選びます。`orchestrator_enabled: false` にすると、どの子も必ず葉になります。費用は掛け算で増えます — `max_spawn_depth: 3` と `max_concurrent_children: 3` では、木は 3×3×3 = 27 体の葉のエージェントが同時に動くところまで広がります。使い方は [サブエージェントへの委任 → 深さの上限と入れ子のまとめ役](/hermes/docs/user-guide/features/delegation/#depth-limit-and-nested-orchestration)を参照してください。

**子のプロセスからの通知:** サブエージェントが立ち上げたバックグラウンドのプロセスは、完了や監視の通知を親の会話へ送りますが、そこでは初期状態で**抑えられます**。受け取りたいのは、子がまとめ上げた結果のほうだからです。通知そのものを届けたい場合は `delegation.surface_child_process_notifications: true` を設定します（どのサブエージェントのものかが付きます）。委任の結果自体が抑えられることはありません。[サブエージェントへの委任 → 子のバックグラウンドプロセスからの通知](/hermes/docs/user-guide/features/delegation/#child-background-process-notifications)を参照してください。

## 確認の問い返し {#clarify}

ゲートウェイが、確認の問いへの返事をどれだけ待つかを決めます。正式な項目は `agent.clarify_timeout`（初期値は `3600` 秒）です。従来のいちばん上の階層の `clarify.timeout` も、はっきり設定されていれば今も守られます。

```yaml
agent:
  clarify_timeout: 3600        # Seconds to wait for user clarification response (0 or less = unlimited)
```

## 文脈のファイル（SOUL.md、AGENTS.md） {#context-files-soulmd-agentsmd}

Hermes は2つの異なる範囲の文脈を使います。

| ファイル | 役割 | 範囲 |
|------|---------|-------|
| `SOUL.md` | **エージェントの中心の人物像** — そのエージェントが何者かを決めます（システムのプロンプトの1番目） | `~/.hermes/SOUL.md` または `$HERMES_HOME/SOUL.md` |
| `.hermes.md` / `HERMES.md` | そのプロジェクト固有の指示（いちばん優先されます） | git の根元までたどります |
| `AGENTS.md` | そのプロジェクト固有の指示、コードの書き方の決まり | ディレクトリを再帰的にたどります |
| `CLAUDE.md` | Claude Code の文脈のファイル（これも見つけます） | 作業ディレクトリだけ |
| `.cursorrules` | Cursor IDE の決まり（これも見つけます） | 作業ディレクトリだけ |
| `.cursor/rules/*.mdc` | Cursor の決まりのファイル（これも見つけます） | 作業ディレクトリだけ |

- **SOUL.md** はエージェントの中心の人物像です。システムのプロンプトの1番目を占め、組み込みの既定の人物像を完全に置き換えます。エージェントが何者かを丸ごと作り込みたいなら、ここを直してください。
- SOUL.md がない、空、読めないときは、Hermes は組み込みの既定の人物像に戻ります。
- **プロジェクトの文脈のファイルには優先順位があります** — 読み込まれるのは1種類だけで、最初に見つかったものが使われます: `.hermes.md` → `AGENTS.md` → `CLAUDE.md` → `.cursorrules`。SOUL.md はいつでも別に読み込まれます。
- **AGENTS.md** は階層になっています。下のディレクトリにも AGENTS.md があれば、すべてが合わさります。
- `SOUL.md` がまだなければ、Hermes が既定のものを自動で用意します。
- 読み込まれた文脈のファイルは、どれも `context_file_max_chars` 文字（初期値は2万）を上限に、うまく切り詰められます。

あわせて次も参照してください。
- [人格と SOUL.md](/hermes/docs/user-guide/features/personality/)
- [文脈のファイル](/hermes/docs/user-guide/features/context-files/)

## 作業ディレクトリ {#working-directory}

| 場面 | 初期値 |
|---------|---------|
| **CLI（`hermes`）** | コマンドを実行したディレクトリ |
| **メッセージのゲートウェイ** | `~/.hermes/config.yaml` の `terminal.cwd`。設定がなければホームのディレクトリ `~` |
| **Docker / Singularity / Modal / SSH** | コンテナやリモートのマシンの中の、そのユーザーのホームのディレクトリ |

作業ディレクトリを上書きするには次のようにします。
```yaml
# In ~/.hermes/config.yaml:
terminal:
  cwd: /home/myuser/projects
```

`~/.hermes/.env` に書く `MESSAGING_CWD` や `TERMINAL_CWD` は、互換のために残された従来の受け皿です。新しく設定するなら `terminal.cwd` を使ってください。

## ネットワーク {#network}

外向きの HTTP がうまくいかないときの回避策です。

```yaml
network:
  force_ipv4: false   # Force IPv4 for outbound connections (default: false)
```

`force_ipv4` — IPv6 が壊れていたり届かなかったりするサーバーでは、Python が AAAA のレコードを先に引くので、IPv4 に落ちるまで TCP の待ち時間いっぱい固まることがあります。`true` にすると IPv6 を完全に飛ばして、IPv4 で直接つなぎます。

## 最初の案内 {#onboarding}

初めて触れたときの案内と、人物像を組み立てる申し出の設定です。

```yaml
onboarding:
  profile_build: "ask"   # "ask" (default) | "off"
  seen: {}               # internal latch — leave empty
```

- `profile_build` — ゲートウェイでいちばん最初のメッセージを受け取ったときに出す、人物像を組み立てる申し出を決めます。`"ask"`（初期値）は、利用者の人物像を作りましょうかと申し出ます。この申し出は**同意を得てから進むもの**で、エージェントは調べる前に必ず尋ねますし、つないだアカウントを黙って読むことは決してありません。`"off"` にすると、素の紹介だけが出ます。この申し出は多くても1度きりです。
- `seen` — 内部の状態です。Hermes は出した案内をここに記録して、二度と出さないようにします。人物像を組み立てる申し出も、一度出したらここに記録されます。手で直さないでください — すべての案内をもう一度見たいなら、`onboarding` の節ごと消してください。

## ダッシュボード {#dashboard}

[ウェブのダッシュボード](/hermes/docs/user-guide/features/web-dashboard/)の設定です — 見た目、公開の URL、認証のプロバイダーを決めます。認証のプロバイダー（OAuth、パスワード、drain）の詳しい説明はウェブのダッシュボードのページにあります。ここでは `config.yaml` での書き方を示します。

```yaml
dashboard:
  theme: "default"            # "default" | "midnight" | "ember" | "mono" | "cyberpunk" | "rose"
  show_token_analytics: false # Re-enable the (local-estimate-only) token/cost analytics surfaces
  public_url: ""              # Full public authority for OAuth redirect_uri (env: HERMES_DASHBOARD_PUBLIC_URL)
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

- `theme` — ダッシュボードの見た目です。
- `show_token_analytics` — 初期状態では無効です。Analytics のページとトークンや費用の数字は**手元での控えめな見積もり**で（補助の呼び出し、やり直し、予備への切り替え、キャッシュへの書き込みを含みません）、実際の請求よりかなり少なく出ることがあります。請求額ではないと分かったうえでだけ `true` にしてください。
- `public_url` — 設定すると、OAuth の `redirect_uri` を組み立てる元になる完全な情報（スキーム、ホスト、必要ならパスの先頭）になります。`X-Forwarded-*` のヘッダーを確実に渡さないリバースプロキシの後ろに置くときに設定してください。空にすると、プロキシのヘッダーから組み立てます。
- `oauth` / `basic_auth` / `drain_auth` — 同梱のダッシュボードの認証のプラグインが読む設定です。drain の秘密の値はここには**書きません**。`HERMES_DASHBOARD_DRAIN_SECRET` の環境変数で渡します。認証の準備の全体は [ウェブのダッシュボード](/hermes/docs/user-guide/features/web-dashboard/)を参照してください。
- `ws_ping_interval` / `ws_ping_timeout` — ループバック以外に割り当てたときの WebSocket の生存確認の調整です（ループバックの接続では確認しません）。遅延の大きい回線（Tailscale、遠くの SSH のトンネル）では、20秒の初期値が偽の 1006 の切断を作ってしまうことがあるので、値を上げてください。
- `ws_orphan_reap_grace_s` — WebSocket が外れたセッションが、取り残されたものとして片付けられるまでの待ち時間です。クライアントのつなぎ直しが遅いなら、上の生存確認の値と一緒に上げてください。（`HERMES_TUI_WS_ORPHAN_REAP_GRACE_S` は内部の上書きとして残っています。）
- `startup_orphan_sweep`（初期値は `true`） — 上の、取り残されたものを片付ける時計はプロセスの中にあるので、それが働く前にゲートウェイが再起動すると（更新、異常終了、systemd）、そのセッションの記録は永遠に開いたままになります — `/resume` やダッシュボードに、幻の「動いている」作業が残るということです。ゲートウェイが起動するたびに — 標準入出力の TUI（`entry.main`）でも、デスクトップやダッシュボードの WebSocket の補助（`handle_ws`）でも — 出どころが `tui` / `desktop` / `subagent` で、開始の時刻**と**いちばん新しいメッセージのどちらもがセッションの有効期間（`HERMES_TUI_SESSION_TTL_S`、初期値は6時間）より古い記録は、`end_reason: startup_orphan_reap` として閉じられます。メッセージのプラットフォームのセッション（Telegram、Discord など）には決して触れませんし、メモリの上で生きているセッション（すでにつなぎ直したクライアント）も対象外で、片付けられたセッションもあとから再開できます。
