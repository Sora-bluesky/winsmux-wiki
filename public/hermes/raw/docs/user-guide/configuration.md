---
title: "設定"
description: "Hermes Agent を設定する — config.yaml、プロバイダー、モデル、API キーなど"
upstream_path: user-guide/configuration.md
upstream_blob: 13430b9ad4bb97dc02bbf773e21216dfa94319e3
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/configuration
---

# 設定 {#configuration}

設定はすべて `~/.hermes/` ディレクトリにまとめて保存されるので、すぐに手が届きます。

:::tip 動く `config.yaml` にいちばん早くたどり着く方法
`hermes setup --portal` を実行してください。OAuth を一度通すだけで、モデルプロバイダーと Tool Gateway の 4 つのツールが揃い、YAML を手で書く必要がありません。Portal のサブスクリプション契約者は、トークン課金のプロバイダーが 10% 割引になります。[Nous Portal](https://hermes-agent.nousresearch.com/integrations/nous-portal) を参照してください。
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

## 設定を管理する {#managing-configuration}

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
`hermes config set` コマンドは、値を適切なファイルへ自動的に振り分けます。API キーは `.env` に、それ以外はすべて `config.yaml` に保存されます。
:::

## 設定の優先順位 {#configuration-precedence}

設定は次の順序で解決されます（優先度の高い順）。

1. **CLI 引数** — 例: `hermes chat --model anthropic/claude-sonnet-4`（その実行だけの上書き）
2. **`~/.hermes/config.yaml`** — 秘密情報以外のすべての設定を書く、中心となる設定ファイル
3. **`~/.hermes/.env`** — 環境変数のフォールバック。秘密情報（API キー、トークン、パスワード）には**必須**です
4. **組み込みのデフォルト値** — ほかに何も設定されていないときに使われる、ハードコードされた安全な既定値

:::info 目安
秘密情報（API キー、ボットのトークン、パスワード）は `.env` に入れます。それ以外（モデル、ターミナルのバックエンド、圧縮の設定、メモリの上限、ツールセット）は `config.yaml` に入れます。両方に設定がある場合、秘密情報以外の設定は `config.yaml` が優先されます。
:::

:::tip 組織での導入
管理者は、システムレベルの管理ディレクトリを使って、一般ユーザーが
上書きできない設定値や秘密情報の値を固定できます。
[Managed Scope](https://hermes-agent.nousresearch.com/user-guide/managed-scope) を参照してください。
:::

## ランタイムの上限 {#runtime-limits}

長時間動き続ける Hermes のサーバー面（ゲートウェイや
`hermes serve --isolated` を含みます）は、オペレーティングシステムが対応していれば、
起動時に設定された `RLIMIT_NOFILE` のソフトリミットを適用します。

```yaml
runtime:
  nofile_soft_limit: 4096
```

デフォルトは `4096` です。Hermes は目標値をオペレーティングシステムの
ハードリミットの範囲に収め、すでにそれより高いソフトリミットを持つ
プロセスの値を下げることはありません。この調整を
無効にするには、値を `0`、`false`、`null` のいずれかにします。Windows や、上限を変更できない
サンドボックスでは、
上限を変えないまま起動処理が続きます。

## 環境変数の展開 {#environment-variable-substitution}

`config.yaml` の中では、`${VAR_NAME}` という書き方で環境変数を参照できます。

```yaml
auxiliary:
  vision:
    api_key: ${GOOGLE_API_KEY}
    base_url: ${CUSTOM_VISION_URL}

delegation:
  api_key: ${DELEGATION_KEY}
```

1 つの値の中で複数回参照することもできます（`url: "${HOST}:${PORT}"`）。参照した変数が設定されていない場合、プレースホルダーはそのままの文字列として残り（`${UNDEFINED_VAR}` は書いたまま）、警告がログに記録されます。`$VAR` のような裸の書き方は展開されません。

Cursor 形式の SecretRef 記法も受け付けます。`${env:VAR_NAME}` は `${VAR_NAME}` とまったく同じように解決され（`env:` の接頭辞は取り除かれます）、Cursor や Claude の設定からコピーしてきた MCP やプロバイダーの断片が、`config.yaml` でも `mcp_servers` ブロックでもそのまま動きます。それ以外の SecretRef のソース（`${file:...}`、`${vault:...}`、`${bitwarden:...}`）はその場では解決され**ません**。外部の秘密情報バックエンドは、`secrets:` ブロックを通じて起動時に値を環境変数へ流し込むので、代わりに `${env:NAME}` の形で参照してください。知らない接頭辞は一度だけ警告を出し、そのままの文字列で残ります。

AI プロバイダーの設定（OpenRouter、Anthropic、Copilot、カスタムのエンドポイント、自前でホストする LLM、フォールバック用のモデルなど）については、[AI Providers](https://hermes-agent.nousresearch.com/integrations/providers) を参照してください。

### プロバイダーのタイムアウト {#provider-timeouts}

`providers.<id>.request_timeout_seconds` を設定すると、そのプロバイダー全体のリクエストのタイムアウトを決められます。さらに `providers.<id>.models.<model>.timeout_seconds` で、モデルごとに上書きできます。これはすべての通信方式（OpenAI 互換、ネイティブの Anthropic、Anthropic 互換）における主要な会話用クライアント、フォールバックの連鎖、認証情報のローテーション後の再構築、そして（OpenAI 互換の場合）リクエストごとのタイムアウト引数に適用されます。つまり、設定した値が従来の `HERMES_API_TIMEOUT` 環境変数より優先されます。

また、ストリーミングを使わない呼び出しの停滞を検出するために `providers.<id>.stale_timeout_seconds` を設定でき、`providers.<id>.models.<model>.stale_timeout_seconds` でモデルごとに上書きできます。こちらは従来の `HERMES_API_CALL_STALE_TIMEOUT` 環境変数より優先されます。

これらを未設定のままにすると、従来のデフォルト値（`HERMES_API_TIMEOUT=1800` 秒、`HERMES_API_CALL_STALE_TIMEOUT=90` 秒、ネイティブの Anthropic は 900 秒）が使われます。ストリーミングを使わない停滞検出は、明示的に設定しなければローカルのエンドポイントでは自動的に無効になり、非常に大きなコンテキストでは上向きに調整されることがあります。AWS Bedrock には現在つながっていません（`bedrock_converse` と AnthropicBedrock SDK のどちらの経路も boto3 を使い、boto3 自身のタイムアウト設定に従います）。[`cli-config.yaml.example`](https://github.com/NousResearch/hermes-agent/blob/main/cli-config.yaml.example) のコメント付きの例を参照してください。

## 更新時の動作 {#update-behavior}

`hermes update` の設定は、`config.yaml` の `updates` の下にあります。

```yaml
updates:
  pre_update_backup: quick       # quick (state snapshot, default) | full (snapshot + HERMES_HOME zip) | off
  backup_keep: 5                 # Keep this many full pre-update backup zips
  non_interactive_local_changes: stash  # stash | discard
  auto_switch_parked_branch: true       # auto-switch a clean, fully merged parked branch back to main
```

`pre_update_backup` は、更新前の安全策を切り替える唯一のつまみです。`quick`（デフォルト）は、重要な状態ファイル（ペアリングのデータ、cron のジョブ、設定、認証情報。1 GiB を超えるファイルは除外されます）を `state-snapshots/` へスナップショットします。`full` はそれに加えて `HERMES_HOME` 全体を `backups/` へ zip 圧縮するため、ホームが大きいと数分かかることがあります。`off` は両方を無効にします。従来の真偽値も受け付けます（`true` → `full`、`false` → `off`）。

git でインストールした場合、Hermes は更新用のブランチをチェックアウトしたり pull したりする前に、変更のある追跡済みファイルと未追跡ファイルを自動的に stash します。ターミナルでの対話的な更新では、その stash を戻す前に確認を求めます。対話的でない更新（デスクトップアプリやチャットアプリ、ゲートウェイ、`--yes` 指定）は `updates.non_interactive_local_changes` に従います。`stash` は pull が成功したあとにローカルのソース編集を復元し、`discard` は pull 成功後に更新処理が作った stash を捨てます。`discard` は、ローカルのソース編集を残すつもりがない管理されたインストールでのみ使ってください。

その stash の手順の前に、Hermes は npm の install や build による揺れで残った、追跡済みの `package-lock.json` の差分も元に戻します。意図してロックファイルを編集した場合は、更新の前にコミットするか自分で stash してください。

## ターミナルのバックエンド設定 {#terminal-backend-configuration}

Hermes は 7 種類のターミナルバックエンドに対応しています。どれを選ぶかで、エージェントのシェルコマンドが実際に走る場所が決まります。手元のマシン、Docker コンテナ、SSH 越しのリモートサーバー、Modal のクラウドサンドボックス（直接、または Nous が運用するゲートウェイ経由）、Daytona のワークスペース、Vercel Sandbox、Singularity/Apptainer のコンテナのいずれかです。

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

`terminal.font_family` は、Hermes Desktop に組み込まれたターミナルの表示を制御します。ローカルにインストール済みのフォントファミリー名を 1 つ（たとえば `MesloLGS NF`）指定するか、CSS のフォントスタックを書けます。Hermes は同梱の JetBrains Mono のスタックをフォールバックとして後ろに足すので、値を空にしておけばデフォルトのままです。同じ設定はプロファイル単位で **Settings → Appearance → Terminal Font** からも編集できます。Google Fonts のダウンロードやシステムフォントの権限は必要ありません。

Modal、Daytona、Vercel Sandbox のようなクラウドサンドボックスでは、`container_persistent: true` にすると、Hermes はサンドボックスを作り直してもファイルシステムの状態を保とうとします。ただし、同じサンドボックスの実体、PID 空間、バックグラウンドのプロセスが後からも生きていることを保証するものではありません。

### バックエンドの概要 {#backend-overview}

| バックエンド | コマンドが走る場所 | 隔離 | 向いている用途 |
|---------|-------------------|-----------|----------|
| **local** | 手元のマシンで直接 | なし | 開発、個人利用 |
| **docker** | 常駐する 1 つの Docker コンテナ（セッション、`/new`、サブエージェントで共有） | 完全（名前空間、cap-drop） | 安全なサンドボックス化、CI/CD |
| **ssh** | SSH 越しのリモートサーバー | ネットワーク境界 | リモート開発、高性能なハードウェア |
| **modal** | Modal のクラウドサンドボックス | 完全（クラウド VM） | 使い捨てのクラウド計算、評価 |
| **daytona** | Daytona のワークスペース | 完全（クラウドのコンテナ） | 運用まかせのクラウド開発環境 |
| **vercel_sandbox** | Vercel Sandbox | 完全（クラウドの microVM） | スナップショットでファイルシステムを保てるクラウド実行 |
| **singularity** | Singularity/Apptainer のコンテナ | 名前空間（--containall） | HPC クラスター、共用マシン |

### local バックエンド {#local-backend}

デフォルトです。コマンドは手元のマシンで直接、隔離なしに走ります。特別な準備は要りません。

```yaml
terminal:
  backend: local
```

デフォルトでは、ローカルのツールのサブプロセスは OS ユーザー本来の `HOME` をそのまま使います。
これにより、`git`、`ssh`、`gh`、`az`、`npm`、Claude Code、Codex といった外部の CLI が、
普段のシェルで使っている認証情報や設定をそのまま見つけられます。Hermes 自身の状態は
`HERMES_HOME` によってプロファイルごとに分かれたままです。設定、メモリ、セッション、スキルの
選択に `HOME` は関係しません。

Hermes はシステム全体の `HOME` も、シェルの起動ファイルも、オペレーティングシステムの
アカウントのホームディレクトリも**変更しません**。この設定が制御するのは、Hermes が
`terminal` ツールやバックグラウンドのターミナルプロセス、`execute_code`、ACP のヘルパープロセスを
通じて起動するサブプロセスに渡す環境だけです。

#### `terminal.home_mode` {#terminalhomemode}

| モード | ホストへのインストール | コンテナ | トレードオフ |
|---|---|---|---|
| `auto` | OS ユーザー本来の `HOME` を維持 | `{HERMES_HOME}/home` を使う | 推奨のデフォルト。ホストの CLI はそのまま動き、コンテナの状態も残ります。 |
| `real` | OS ユーザー本来の `HOME` を強制 | 見える場合は OS ユーザー本来の `HOME` を強制 | 親プロセスが誤って `HOME` をプロファイルのホームに向けたまま起動してしまった場合に役立ちます。 |
| `profile` | `{HERMES_HOME}/home` があればそれを使う | `{HERMES_HOME}/home` があればそれを使う | プロファイルごとに CLI の設定を厳密に分けられますが、通常の `~/.ssh`、`~/.gitconfig`、`~/.azure`、`~/.config/gh`、Claude や Codex の認証情報、npm の状態などは、プロファイルのホームの中で自分で用意するかリンクしない限り見えません。 |

デフォルトの弱点は、ホストのプロファイル同士が `~` の下にある同じユーザーレベルの
CLI の認証情報・設定を共有してしまうことです。git の身元、SSH の鍵、GitHub CLI の
ログイン、npm の設定、クラウド CLI のログインを分けたいプロファイルがあるなら、
`home_mode: profile` にしたうえで、そのプロファイルのホームの中でそれらのツールを
意識的に初期化してください。

プロファイルごとにツールの設定を厳密に分けたい場合は、次のように設定します。

```yaml
terminal:
  home_mode: profile
```

このモードでは、ツールのサブプロセスは `{HERMES_HOME}/home` を `HOME` として使います。Hermes は
`HERMES_REAL_HOME` も設定するので、スクリプト側で本当のユーザーホームが必要なときは
そちらから見つけられます。コンテナ系のバックエンドは `auto` モードでも `{HERMES_HOME}/home` を
使い続けます。このディレクトリが Hermes の永続データボリューム上にあるからです。

プロファイルの状態と本来のユーザーホームを区別したいスクリプトでは、Hermes のデータには
`HERMES_HOME` を、アカウントのホームには `HERMES_REAL_HOME` を使ってください。

```python
from pathlib import Path

hermes_home = Path(os.environ["HERMES_HOME"])
real_home = Path(os.environ.get("HERMES_REAL_HOME", os.environ["HOME"]))
```

:::warning
エージェントは、あなたのユーザーアカウントとまったく同じ範囲でファイルシステムに触れます。使わせたくないツールは `hermes tools` で無効にするか、サンドボックス化のために Docker に切り替えてください。
:::

### docker バックエンド {#docker-backend}

セキュリティを固めた Docker コンテナ（すべてのケーパビリティを落とし、権限昇格を禁止し、PID 数を制限）の中でコマンドを実行します。

**常駐する 1 つのコンテナを、複数の Hermes プロセスで共有します。** Hermes は最初に使われたときに長生きするコンテナを 1 つだけ起動し、以後は `docker exec` でそのコンテナに、すべてのターミナル・ファイル・`execute_code` の呼び出しを流します。これはセッションをまたいでも、`/new`、`/reset`、`delegate_task` のサブエージェントでも同じです。作業ディレクトリの移動、インストールしたパッケージ、`/workspace` の中のファイル、そして**バックグラウンドのプロセス**は、次のツール呼び出しへ、さらには次の Hermes プロセスへと引き継がれます。TUI のセッションを閉じても、`/quit` を実行しても、新しく `hermes` を起動しても、コンテナは動いたままで、次の Hermes プロセスはラベル検索でそれを再利用します。片付けの正確な条件は、後述の **コンテナのライフサイクル** を参照してください。

**セッションごとに隔離するモード（`container_persistent: false`）。** Docker バックエンドで `container_persistent: false` にすると、**セッションごとに** 1 つのコンテナを使う方式に切り替わります。チャット（デスクトップアプリのセッション、ゲートウェイの会話、TUI のセッション）ごとに真新しいサンドボックスが作られ、最初のターミナル／ファイル呼び出しのときに生成され、セッションが閉じるか `lifetime_seconds` を超えて放置されると削除されます。セッション間には何も引き継がれません。ファイルシステムの状態も、マウントも、バックグラウンドのプロセスもです。`docker_mount_cwd_to_workspace: true` の場合、`/workspace` にマウントされるのは**そのセッションに結びついた**ワークスペースだけで、ディレクトリが結びついていない新しいセッションは、前のセッションのマウントを引き継ぐのではなく空のワークスペースになります。`delegate_task` のサブエージェントは、これまでどおり親セッションのコンテナを共有します。会話と会話のあいだにサンドボックスという安全境界を置きたいときはこのモードを、上で説明した長生きの共有コンテナが欲しいときはデフォルトの `true` を使ってください。

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
  docker_orphan_reaper: true              # Sweep abandoned Exited containers at startup

  # Cross-backend lifecycle settings (apply to docker as well)
  timeout: 180                     # Per-command timeout in seconds
  lifetime_seconds: 300            # Idle-reaper window; also feeds 2× orphan-reaper threshold
```

**`docker_env`** と **`docker_forward_env`** の違いです。前者は設定に書いた `KEY=value` の組をそのまま注入します（値は `config.yaml` に書かれるか、`TERMINAL_DOCKER_ENV='{"DEBUG":"1"}'` のように JSON の辞書で渡されます）。後者はシェルや `~/.hermes/.env` から値を持ってくるので、実際の秘密情報が設定ファイルに現れません。トークンには `docker_forward_env` を、コンテナが必要とする固定の設定値には `docker_env` を使ってください。

**`terminal.docker_extra_args`**（`TERMINAL_DOCKER_EXTRA_ARGS='["--gpus=all"]'` でも上書きできます）を使うと、Hermes が専用のキーとして用意していない `docker run` のフラグを自由に渡せます。`--gpus`、`--network`、`--add-host`、`--security-opt` の別の指定などです。各要素は文字列でなければなりません。このリストは組み立てられた `docker run` の呼び出しの最後に足されるので、必要なら Hermes のデフォルトを上書きできます。使いすぎには注意してください。サンドボックスの固め方（ケーパビリティの削除、`--user`、ワークスペースのバインドマウント）とぶつかるフラグは、警告なく隔離を弱めます。

**`terminal.docker_network`**（デフォルト `true`、環境変数は `TERMINAL_DOCKER_NETWORK`）— `false` にすると、サンドボックスのコンテナを `--network=none` で起動し、エージェントのコマンドからの外向き通信をすべて断ちます。これは `terminal`、`execute_code`、ファイル系ツールが使う実行用コンテナに適用されます。コンテナは Hermes プロセスをまたいで残るため、ネットワークありの古いコンテナがある状態でこれを `false` に切り替えると、そのコンテナは削除され、外部から切り離された新しいコンテナが起動します（警告がログに記録されます）。その中で動いていたバックグラウンドのプロセスは失われます。`docker_extra_args` で `--network=none` を渡すより、このキーを使ってください。

**必要なもの:** Docker Desktop か Docker Engine がインストールされ、動いていること。Hermes は `$PATH` に加えて macOS のよくあるインストール先（`/usr/local/bin/docker`、`/opt/homebrew/bin/docker`、Docker Desktop のアプリバンドル）も探します。Podman もそのまま使えます。両方入っている場合に Podman を使わせたいときは、`HERMES_DOCKER_BINARY=podman`（またはフルパス）を設定してください。

#### コンテナのライフサイクル {#container-lifecycle}

Hermes が管理するコンテナには 3 つのラベルが付き、あとから起動するプロセス（および孤児コンテナの掃除役）がそれを見分けられるようになっています。

- `hermes-agent=1` — Hermes が管理していることを示す
- `hermes-task-id=<sanitized task_id>` — タスクごとの再利用の判定に使う
- `hermes-profile=<sanitized profile name>` — 再利用と掃除の範囲を、現在の Hermes プロファイルに限定する

起動時に Hermes は `docker ps --filter label=hermes-task-id=<id> --filter label=hermes-profile=<profile>` を実行し、見つかれば**既存のコンテナに接続します**。コンテナが `exited` の状態なら（Docker デーモンの再起動後など）、`docker start` して再利用します。ファイルシステムの状態やインストール済みのパッケージは残りますが、コンテナ内のバックグラウンドプロセスは残りません。

Hermes のプロセスが終了したとき（`/quit`、TUI セッションを閉じる、ゲートウェイの停止、SIGKILL であっても）、**デフォルトのモードでは片付け処理はコンテナに対して何もしません**。コンテナは動き続けます。次の Hermes プロセスは、ラベル検索によってミリ秒でそこに接続します。「セッションをまたいで共有される長生きのコンテナが 1 つ」という約束を守るには、この動作が必要です。バックグラウンドのプロセス（npm のウォッチャー、開発サーバー、長く走る pytest）がセッションをまたいで生き残る道は、これしかありません。

**コンテナが実際に片付けられる（停止して `docker rm -f` される）のは、次の場合だけです。**

| きっかけ | 発動する条件 |
|---|---|
| `docker_persist_across_processes: false` | プロセスごとに隔離すると明示した場合。`cleanup()` のたびに `stop` と `rm -f` を実行します。issue #20561 より前の動作と同じです。 |
| アイドル時の掃除（`lifetime_seconds`、デフォルト 300 秒） | 環境が `persist_across_processes=false` のときだけ動きます。永続モードの環境では何もせず、コンテナはアイドル掃除を生き延びます。 |
| 次回起動時の孤児コンテナ掃除 | `2 × lifetime_seconds`（デフォルト 600 秒 = 10 分）より古い、hermes のラベルが付いた **Exited** のコンテナを掃除します。対象は現在のプロファイルに限られます。**動作中のコンテナには決して手を出しません** — 同時に走る別プロセスを守るためです。無効にするには `docker_orphan_reaper: false` にします。 |
| ユーザーの直接操作 | `docker rm -f`、`docker system prune`、Docker Desktop の再起動。`--restart=always` は設定していないので、ホストを再起動するとコンテナは `Exited` のまま残ります（CoW レイヤーは残り、次回起動時に再利用されますが、バックグラウンドのプロセスは消えます）。 |

知っておくとよい境界的なケースです。

- **コンテナ内の PID 1 が OOM で kill される**と、コンテナは `Exited` になります。次に使うときは `docker start` されます。ファイルシステムの状態は残りますが、バックグラウンドのプロセスは残りません。
- **プロファイルを切り替える**と、コンテナ同士が隔離されます。`hermes-profile=work` のラベルが付いたコンテナは、`hermes-profile=research` で動く Hermes プロセスからは見えません。孤児コンテナの掃除もプロファイル単位なので、別プロファイルのコンテナが誤って掃除されることはありませんが、その代わり、元のプロファイルで Hermes を起動し直すまで自動的には片付きません。

`delegate_task(tasks=[...])` で並列に立ち上がったサブエージェントは、この 1 つのコンテナを共有します。同時に `cd` したり環境を書き換えたり、同じパスに書き込んだりするとぶつかります。サブエージェントに独立したサンドボックスが必要な場合は、`register_task_env_overrides()` でタスクごとのイメージの上書きを登録しなければなりません。RL やベンチマークの環境（TerminalBench2、HermesSweEnv など）は、タスクごとの Docker イメージのためにこれを自動で行っています。

**セキュリティの強化:**
- `--cap-drop ALL` のうえで、`DAC_OVERRIDE`、`CHOWN`、`FOWNER` だけを戻す
- `--security-opt no-new-privileges`
- `--pids-limit 256`
- `/tmp`（512MB）、`/var/tmp`（256MB）、`/run`（64MB）にサイズ制限付きの tmpfs

**認証情報の受け渡し:** `docker_forward_env` に並べた環境変数は、まずシェルの環境から、次に `~/.hermes/.env` から解決されます。スキル側で `required_environment_variables` を宣言することもでき、それらは自動的に統合されます。

#### 環境変数による上書き {#environment-variable-overrides}

`terminal:` の下にあるすべてのキーには、`TERMINAL_<KEY_UPPERCASE>` という形の環境変数による上書きが用意されています。Docker バックエンドでとくに役立つものを挙げます。

| 環境変数 | 対応するキー | 補足 |
|---|---|---|
| `TERMINAL_DOCKER_IMAGE` | `docker_image` | ベースイメージ |
| `TERMINAL_DOCKER_FORWARD_ENV` | `docker_forward_env` | JSON の配列: `'["GITHUB_TOKEN","OPENAI_API_KEY"]'` |
| `TERMINAL_DOCKER_ENV` | `docker_env` | JSON の辞書: `'{"DEBUG":"1"}'` |
| `TERMINAL_DOCKER_VOLUMES` | `docker_volumes` | `"host:container[:ro]"` 形式の文字列の JSON 配列 |
| `TERMINAL_DOCKER_EXTRA_ARGS` | `docker_extra_args` | JSON の配列 |
| `TERMINAL_DOCKER_MOUNT_CWD_TO_WORKSPACE` | `docker_mount_cwd_to_workspace` | `true` / `false` |
| `TERMINAL_DOCKER_RUN_AS_HOST_USER` | `docker_run_as_host_user` | `true` / `false` |
| `TERMINAL_DOCKER_NETWORK` | `docker_network` | `true` / `false` — デフォルトは `true`。`false` は `--network=none` |
| `TERMINAL_DOCKER_PERSIST_ACROSS_PROCESSES` | `docker_persist_across_processes` | `true` / `false` — デフォルトは `true` |
| `TERMINAL_DOCKER_ORPHAN_REAPER` | `docker_orphan_reaper` | `true` / `false` — デフォルトは `true` |
| `TERMINAL_CONTAINER_CPU` | `container_cpu` | CPU のコア数 |
| `TERMINAL_CONTAINER_MEMORY` | `container_memory` | MB |
| `TERMINAL_CONTAINER_DISK` | `container_disk` | MB |
| `TERMINAL_CONTAINER_PERSISTENT` | `container_persistent` | `true` / `false` — バインドマウントするワークスペースのディレクトリを制御します。`docker_persist_across_processes` とは別物です |
| `TERMINAL_LIFETIME_SECONDS` | `lifetime_seconds` | アイドル掃除までの時間 |
| `TERMINAL_TIMEOUT` | `timeout` | コマンドごとのタイムアウト |
| `HERMES_DOCKER_BINARY` | _なし_ | 使う docker/podman のバイナリのパスを固定する |

### ssh バックエンド {#ssh-backend}

SSH 越しにリモートサーバーでコマンドを実行します。接続の再利用に ControlMaster を使います（アイドル時の保持は 5 分）。常駐シェルはデフォルトで有効なので、状態（作業ディレクトリ、環境変数）がコマンドをまたいで残ります。

```yaml
terminal:
  backend: ssh
  persistent_shell: true           # Keep a long-lived bash session (default: true)
```

**必須の環境変数:**

```bash
TERMINAL_SSH_HOST=my-server.example.com
TERMINAL_SSH_USER=ubuntu
```

**任意:**

| 変数 | デフォルト | 説明 |
|----------|---------|-------------|
| `TERMINAL_SSH_PORT` | `22` | SSH のポート |
| `TERMINAL_SSH_KEY` | （システムのデフォルト） | SSH 秘密鍵のパス |
| `TERMINAL_SSH_PERSISTENT` | `true` | 常駐シェルを有効にする |

**仕組み:** 初期化のときに `BatchMode=yes` と `StrictHostKeyChecking=accept-new` を付けて接続します。常駐シェルは、リモートホスト上で `bash -l` のプロセスを 1 つだけ生かしておき、一時ファイル経由でやり取りします。`stdin_data` や `sudo` が必要なコマンドは、自動的に 1 回きりの実行方式に切り替わります。

### modal バックエンド {#modal-backend}

[Modal](https://modal.com) のクラウドサンドボックスでコマンドを実行します。タスクごとに独立した VM が与えられ、CPU・メモリ・ディスクを設定できます。ファイルシステムはセッションをまたいでスナップショットと復元ができます。

```yaml
terminal:
  backend: modal
  container_cpu: 1                 # CPU cores
  container_memory: 5120           # MB (5GB)
  container_disk: 51200            # MB (50GB)
  container_persistent: true       # Snapshot/restore filesystem
```

**必須:** `MODAL_TOKEN_ID` と `MODAL_TOKEN_SECRET` の環境変数、または `~/.modal.toml` の設定ファイル。

**永続化:** 有効にすると、片付けのときにサンドボックスのファイルシステムがスナップショットされ、次のセッションで復元されます。スナップショットは `~/.hermes/modal_snapshots.json` で管理されます。残るのはファイルシステムの状態だけで、動いていたプロセス、PID 空間、バックグラウンドのジョブは残りません。

**認証情報のファイル:** `~/.hermes/` から自動的にマウントされ（OAuth のトークンなど）、コマンドを実行する前に毎回同期されます。

### daytona バックエンド {#daytona-backend}

[Daytona](https://daytona.io) の管理されたワークスペースでコマンドを実行します。永続化のために停止と再開に対応しています。

```yaml
terminal:
  backend: daytona
  container_cpu: 1                 # CPU cores
  container_memory: 5120           # MB → converted to GiB
  container_disk: 10240            # MB → converted to GiB (max 10 GiB)
  container_persistent: true       # Stop/resume instead of delete
```

**必須:** `DAYTONA_API_KEY` の環境変数。

**永続化:** 有効にすると、片付けのときにサンドボックスは削除ではなく停止され、次のセッションで再開されます。サンドボックスの名前は `hermes-{task_id}` の形になります。

**ディスクの上限:** Daytona は最大 10 GiB という制限を課しています。これを超える指定は警告とともに切り詰められます。

### vercel_sandbox バックエンド {#vercel-sandbox-backend}

[Vercel Sandbox](https://vercel.com/docs/vercel-sandbox) のクラウド microVM でコマンドを実行します。Hermes は通常のターミナルとファイルのツールをそのまま使うので、Vercel 専用のモデル向けツールはありません。

```yaml
terminal:
  backend: vercel_sandbox
  vercel_runtime: node24          # node24 | node22 | python3.13
  cwd: /vercel/sandbox            # default workspace root
  container_persistent: true      # Snapshot/restore filesystem
  container_disk: 51200           # Shared default only; custom disk is unsupported
```

**必要なインストール:** 追加の SDK を入れます。

```bash
pip install 'hermes-agent[vercel]'
```

**必要な認証:** `VERCEL_TOKEN`、`VERCEL_PROJECT_ID`、`VERCEL_TEAM_ID` の 3 つすべてを使ったアクセストークン認証を設定してください。これが、Render、Railway、Docker などのホストでデプロイしたり、Hermes のプロセスを長く動かしたりするときの正式な構成です。

ローカルでの一度きりの開発向けに、Hermes は短命の Vercel OIDC トークンも受け付けます。

```bash
VERCEL_OIDC_TOKEN="$(vc project token <project-name>)" hermes chat
```

Vercel プロジェクトとリンク済みのディレクトリからなら、プロジェクト名を省略できます。

```bash
VERCEL_OIDC_TOKEN="$(vc project token)" hermes chat
```

OIDC のトークンは短命なので、デプロイの正式な手順として使うべきではありません。

**ランタイム:** `terminal.vercel_runtime` は `node24`、`node22`、`python3.13` に対応します。未設定なら、Hermes は `node24` を使います。

**永続化:** `container_persistent: true` のとき、Hermes は片付けの最中にサンドボックスのファイルシステムをスナップショットし、同じタスクで後から作られるサンドボックスをそのスナップショットから復元します。スナップショットの中身には、Hermes が同期した認証情報、スキル、キャッシュのファイルなど、サンドボックスへコピーされたものが含まれることがあります。残るのはファイルシステムの状態だけで、サンドボックスの同一性、PID 空間、シェルの状態、動いているバックグラウンドのプロセスは残りません。

**バックグラウンドのコマンド:** `terminal(background=true)` は、ローカル以外のバックエンド向けの汎用のバックグラウンド処理の流れを使います。サンドボックスが生きているあいだは、通常のプロセスのツールを使って、起動、状態確認、待機、ログの閲覧、終了ができます。片付けや再起動のあとに、Vercel 側の切り離されたプロセスを復旧する仕組みは Hermes にはありません。

**ディスクのサイズ指定:** Vercel Sandbox は今のところ Hermes の `container_disk` に対応していません。`container_disk` は未設定のままにするか、共通のデフォルトである `51200` にしてください。それ以外の値は黙って無視されるのではなく、診断とバックエンドの作成が失敗します。

### singularity/apptainer バックエンド {#singularityapptainer-backend}

[Singularity/Apptainer](https://apptainer.org) のコンテナでコマンドを実行します。Docker が使えない HPC クラスターや共用マシン向けに設計されています。

```yaml
terminal:
  backend: singularity
  singularity_image: "docker://nikolaik/python-nodejs:python3.11-nodejs20"
  container_cpu: 1                 # CPU cores
  container_memory: 5120           # MB
  container_persistent: true       # Writable overlay persists across sessions
```

**必要なもの:** `$PATH` に `apptainer` または `singularity` のバイナリがあること。

**イメージの扱い:** Docker の URL（`docker://...`）は自動的に SIF ファイルへ変換され、キャッシュされます。既存の `.sif` ファイルはそのまま使われます。

**作業用ディレクトリ:** 次の順で解決されます。`TERMINAL_SCRATCH_DIR` → `TERMINAL_SANDBOX_DIR/singularity` → `/scratch/$USER/hermes-agent`（HPC の慣習）→ `~/.hermes/sandboxes/singularity`。

**隔離:** `--containall --no-home` を使い、ホストのホームディレクトリをマウントせずに名前空間を完全に分けます。

### ターミナルのバックエンドでよくある問題 {#common-terminal-backend-issues}

ターミナルのコマンドがすぐに失敗する場合や、ターミナルのツールが無効だと表示される場合は、次を確認してください。

- **local** — 特別な準備は不要です。使い始めるときにいちばん安全な選択です。
- **Docker** — `docker version` を実行して Docker が動いているか確かめます。失敗するなら、Docker を直すか `hermes config set terminal.backend local` にします。
- **SSH** — `TERMINAL_SSH_HOST` と `TERMINAL_SSH_USER` の両方が必要です。どちらかが欠けていれば、Hermes がはっきりしたエラーをログに残します。
- **Modal** — `MODAL_TOKEN_ID` の環境変数か `~/.modal.toml` が必要です。`hermes doctor` を実行して確認できます。
- **Daytona** — `DAYTONA_API_KEY` が必要です。サーバーの URL の設定は Daytona の SDK が面倒を見ます。
- **Singularity** — `$PATH` に `apptainer` か `singularity` が必要です。HPC クラスターではよく入っています。

判断に迷ったら、`terminal.backend` を `local` に戻して、まずそこでコマンドが走ることを確かめてください。

### 片付け時のリモートからホストへの状態同期 {#remote-to-host-state-sync-on-teardown}

**SSH**、**Modal**、**Daytona** の各バックエンドでは、Hermes はセッション中に `~/.hermes/` の状態（認証情報のファイル、スキル、キャッシュ）をリモートのサンドボックスへ送り込み、片付けのときに**変更された状態のファイルをホスト側へ戻します**。最初に送ったものと内容が異なるファイル（内容のハッシュで比較します）は、その場で書き戻されます。同期対象のディレクトリの下に新しくできたリモートのファイル（たとえばエージェントがリモートで作ったスキル）は、対応するホスト側のパスへ写されます。送るだけの認証情報のファイルが、ホスト側で上書きされることはありません。

- 書き戻しは最大 3 回まで、間隔を空けて再試行します。また、2 GiB を超えるリモートのアーカイブは展開を拒否します。
- Docker と Singularity はバインドマウント（ホストのファイルシステムをそのまま見る方式）なので、この仕組みは要りません。
- 対象は Hermes の状態（`~/.hermes/`）であって、サンドボックスの中の任意の作業ツリーのファイルでは**ありません**。大事な成果物は、サンドボックスが壊される前にエージェントに明示的にコピーさせてください（`scp`、`modal volume put` など）。

### Docker のボリュームマウント {#docker-volume-mounts}

Docker バックエンドでは、`docker_volumes` でホストのディレクトリをコンテナと共有できます。各要素は Docker の `-v` と同じ書き方です。`host_path:container_path[:options]` の形になります。

```yaml
terminal:
  backend: docker
  docker_volumes:
    - "/home/user/projects:/workspace/projects"   # Read-write (default)
    - "/home/user/datasets:/data:ro"              # Read-only
    - "/home/user/.hermes/cache/documents:/output" # Gateway-visible exports
```

これは次のような場面で役立ちます。
- エージェントに**ファイルを渡す**（データセット、設定、参考にするコード）
- エージェントから**ファイルを受け取る**（生成されたコード、レポート、書き出したもの）
- あなたとエージェントが同じファイルを扱う**共有のワークスペース**

メッセージ用のゲートウェイを使っていて、生成したファイルを `MEDIA:/...` でエージェントに
送らせたい場合は、`/home/user/.hermes/cache/documents:/output` のような、ホストから見える
書き出し専用のマウントを用意するのが確実です。

- Docker の中では `/output/...` にファイルを書く
- `MEDIA:` には**ホスト側のパス**を出す。たとえば
  `MEDIA:/home/user/.hermes/cache/documents/report.txt`
- ホスト上のゲートウェイのプロセスから見てもまったく同じパスが存在する場合を除き、
  `/workspace/...` や `/output/...` を出しては**いけません**

:::warning
YAML では、同じキーが重複すると前のものが警告なく上書きされます。すでに
`docker_volumes:` のブロックがあるなら、あとからもう 1 つ `docker_volumes:` のキーを
足すのではなく、同じリストに新しいマウントをまとめてください。
:::

環境変数でも設定できます。`TERMINAL_DOCKER_VOLUMES='["/host:/container"]'`（JSON の配列）です。

### Docker への認証情報の受け渡し {#docker-credential-forwarding}

デフォルトでは、Docker のターミナルセッションがホストの認証情報を勝手に引き継ぐことはありません。特定のトークンをコンテナの中で使いたい場合は、`terminal.docker_forward_env` に追加してください。

```yaml
terminal:
  backend: docker
  docker_forward_env:
    - "GITHUB_TOKEN"
    - "NPM_TOKEN"
```

Hermes は、並べた変数をまず現在のシェルから解決し、なければ `~/.hermes/.env`（`hermes config set` で保存したもの）を見にいきます。

:::warning
`docker_forward_env` に並べたものは、コンテナの中で走るコマンドから見えるようになります。ターミナルのセッションに晒しても構わない認証情報だけを渡してください。
:::

### コンテナをホストのユーザーとして動かす {#running-the-container-as-your-host-user}

デフォルトでは、Docker のコンテナは `root`（UID 0）として動きます。そのため `/workspace` やほかのバインドマウントの中で作られたファイルは、ホスト側では root の所有物になり、セッションのあとにホストのエディターで編集するには `sudo chown` が必要になります。`terminal.docker_run_as_host_user` はこれを解決します。

```yaml
terminal:
  backend: docker
  docker_run_as_host_user: true   # default: false
```

有効にすると、Hermes は `docker run` のコマンドに `--user $(id -u):$(id -g)` を足すので、バインドマウントしたディレクトリ（`/workspace`、`/root`、`docker_volumes` に書いたもの）に書き込まれたファイルは、root ではなくホストのユーザーの所有になります。引き換えに、コンテナの中で `apt install` したり、`/root/.npm` のような root 所有のパスへ書き込んだりはできなくなります。両方が必要なら、`HOME` が root 以外のユーザー所有になっているベースイメージを使うか、必要なツールをイメージのビルド時に入れておいてください。

これまでどおりの動作でよければ、`false`（デフォルト）のままにしてください。作業の中心が「マウントしたホストのファイルを編集すること」で、`sudo chown -R` にうんざりしているなら、有効にする価値があります。

### 任意: 起動したディレクトリを `/workspace` にマウントする {#optional-mount-the-launch-directory-into-workspace}

Docker のサンドボックスは、デフォルトでは隔離されたままです。明示的に有効にしない限り、Hermes がホストの現在の作業ディレクトリをコンテナに渡すことは**ありません**。

`config.yaml` で有効にします。

```yaml
terminal:
  backend: docker
  docker_mount_cwd_to_workspace: true
```

有効にすると、次のようになります。
- `~/projects/my-app` から Hermes を起動した場合、そのホストのディレクトリが `/workspace` にバインドマウントされます
- Docker バックエンドは `/workspace` で始まります
- ファイル系のツールとターミナルのコマンドが、同じマウントされたプロジェクトを見ます

無効のままなら、`docker_volumes` で明示的に何かをマウントしない限り、`/workspace` はサンドボックスのものであり続けます。

セキュリティ上のトレードオフです。
- `false` はサンドボックスの境界を保ちます
- `true` は、Hermes を起動したディレクトリへの直接のアクセスをサンドボックスに与えます

コンテナにホストの生きたファイルを触らせたいと意図している場合にだけ、有効にしてください。

### 常駐シェル {#persistent-shell}

デフォルトでは、ターミナルのコマンドはそれぞれ別のサブプロセスで走るため、作業ディレクトリ、環境変数、シェル変数はコマンドごとにリセットされます。**常駐シェル**を有効にすると、長生きする bash のプロセスが 1 つ `execute()` の呼び出しをまたいで生かされ、状態がコマンド間で残ります。

これがいちばん役立つのは **SSH バックエンド**で、コマンドごとの接続のオーバーヘッドもなくなります。常駐シェルは **SSH ではデフォルトで有効**、local バックエンドでは無効です。

```yaml
terminal:
  persistent_shell: true   # default — enables persistent shell for SSH
```

無効にするには、次のようにします。

```bash
hermes config set terminal.persistent_shell false
```

**コマンドをまたいで残るもの:**
- 作業ディレクトリ（`cd /tmp` が次のコマンドにも効く）
- エクスポートした環境変数（`export FOO=bar`）
- シェル変数（`MY_VAR=hello`）

**優先順位:**

| 段階 | 変数 | デフォルト |
|-------|----------|---------|
| 設定ファイル | `terminal.persistent_shell` | `true` |
| SSH での上書き | `TERMINAL_SSH_PERSISTENT` | 設定ファイルに従う |
| local での上書き | `TERMINAL_LOCAL_PERSISTENT` | `false` |

バックエンドごとの環境変数がいちばん強く効きます。local バックエンドでも常駐シェルを使いたい場合は、次のようにします。

```bash
export TERMINAL_LOCAL_PERSISTENT=true
```

:::note
`stdin_data` や sudo が必要なコマンドは、自動的に 1 回きりの実行方式に切り替わります。常駐シェルの標準入力は、すでに内部の通信のために使われているからです。
:::

各バックエンドの詳細は、[Code Execution](/hermes/docs/user-guide/features/code-execution/) と [README のターミナルの節](/hermes/docs/user-guide/features/tools/) を参照してください。

## スキルの設定 {#skill-settings}

スキルは、SKILL.md のフロントマターで自分用の設定項目を宣言できます。これらは秘密ではない値（パス、好み、その分野に固有の設定）で、`config.yaml` の `skills.config` の名前空間の下に保存されます。

```yaml
skills:
  config:
    myplugin:
      path: ~/myplugin-data   # Example — each skill defines its own keys
```

**スキルの設定の仕組み:**

- `hermes config migrate` は有効なスキルをすべて調べ、まだ設定されていない項目を見つけて、入力を促してくれます
- `hermes config show` は、すべてのスキルの設定を「Skill Settings」の見出しの下に、どのスキルのものかとあわせて表示します
- スキルが読み込まれるとき、解決された設定値はスキルのコンテキストへ自動的に渡されます

**値を手で設定する:**

```bash
hermes config set skills.config.myplugin.path ~/myplugin-data
```

自分のスキルで設定項目を宣言する方法は、[Creating Skills — Config Settings](https://hermes-agent.nousresearch.com/developer-guide/creating-skills#config-settings-configyaml) を参照してください。

### エージェントが作ったスキルの書き込みに対する見張り {#guard-on-agent-created-skill-writes}

エージェントが `skill_manage` でスキルを作成・編集・パッチ適用・削除するとき、Hermes は新しい内容や更新後の内容に危険なキーワードのパターン（認証情報の収集、あからさまなプロンプトインジェクション、情報の持ち出しの指示）がないか調べることができます。この検査は**デフォルトでは無効**です。`~/.ssh/` に正当に触れたり `$OPENAI_API_KEY` に言及したりする普通のエージェントの作業が、この経験則に引っかかりすぎたためです。エージェントによるスキルの書き込みが反映される前に確認を挟みたい場合は、次のように有効に戻してください。

```yaml
skills:
  guard_agent_created: true   # default: false
```

有効にすると、引っかかった `skill_manage` の書き込みは、検査が判断した理由とともに承認を求めるプロンプトとして出てきます。承認すれば反映され、拒否すればエージェントには説明付きのエラーが返ります。

### スキルの書き込みの承認 {#write-approval-for-skill-writes}

上の内容検査とは別に、`skills.write_approval` は、エージェントによる**すべての**スキルの書き込み（作成／編集／パッチ／削除／付随ファイル）をあなたの明示的な承認の後ろに置きます。危険なコマンドと同じ承認・拒否の仕組みです。

```yaml
skills:
  write_approval: false   # false = write freely (default) | true = stage every write for review
```

有効にすると、スキルの書き込みは `~/.hermes/pending/skills/` に留め置かれ、`/skills pending`、`/skills diff <id>`、`/skills approve <id>`、`/skills reject <id>` で確認します。CLI からでも、どのメッセージ用のプラットフォームからでも操作できます。実行中に切り替えるには `/skills approval on|off` を使います。メモリにも同じ仕組みがあります（後述の `memory.write_approval`）。詳しい手順は [Gating agent skill writes](https://hermes-agent.nousresearch.com/user-guide/features/skills#gating-agent-skill-writes-skillswrite_approval) にあります。

## メモリの設定 {#memory-configuration}

```yaml
memory:
  memory_enabled: true
  user_profile_enabled: true
  memory_char_limit: 2200   # ~800 tokens
  user_char_limit: 1375     # ~500 tokens
  write_approval: false     # true = require approval before any memory write
```

`memory.write_approval: true` にすると、メモリへの書き込みは反映される前にあなたの承認が必要になります。CLI での対話的なやり取りではその場で確認が出ます。メッセージ用のセッションや、裏で走る自己改善のレビューでは、書き込みが留め置かれ、`/memory pending` → `/memory approve <id>` / `/memory reject <id>` で確認します。実行中に切り替えるには `/memory approval on|off` を使います。[Controlling memory writes](https://hermes-agent.nousresearch.com/user-guide/features/memory#controlling-memory-writes-write_approval) を参照してください。

## コンテキストファイルの切り詰め {#context-file-truncation}

自動で読み込まれるコンテキストファイルから、先頭と末尾を残す切り詰めをかける前に、どれだけの内容を Hermes が読み込むかを制御します。これは `SOUL.md`、`.hermes.md`、`AGENTS.md`、`CLAUDE.md`、`.cursorrules` のように、システムプロンプトへ差し込まれるファイルに効きます。`read_file` ツールには影響**しません**。

```yaml
context_file_max_chars: null  # default — dynamic cap scaled to the model's context window (floor 20K, ceiling 500K chars)
```

自動で変わる動作ではなく固定の上限にしたい場合は、正の整数を設定します。

```yaml
context_file_max_chars: 25000
```

## ファイル読み取りの安全装置 {#file-read-safety}

1 回の `read_file` の呼び出しが返せる内容の量を制御します。上限を超える読み取りは拒否され、`offset` と `limit` でもっと狭い範囲を読むよう促すエラーがエージェントに返ります。これにより、圧縮された JS のバンドルや大きなデータファイルを 1 回読んだだけでコンテキストウィンドウが埋まってしまう事態を防げます。

```yaml
file_read_max_chars: 100000  # default — ~25-35K tokens
```

コンテキストウィンドウの大きいモデルを使っていて、大きなファイルをよく読むなら上げてください。コンテキストの小さいモデルでは、読み取りを効率よく保つために下げてください。

```yaml
# Large context model (200K+)
file_read_max_chars: 200000

# Small local model (16K context)
file_read_max_chars: 30000
```

エージェントはファイルの読み取りを自動的に重複排除もします。同じファイルの同じ範囲を 2 回読み、その間にファイルが変わっていなければ、内容を送り直す代わりに軽い代替の表示が返ります。これはコンテキストの圧縮でリセットされるので、内容が要約されて消えたあとにエージェントがファイルを読み直せます。

## ツール出力の切り詰めの上限 {#tool-output-truncation-limits}

Hermes が切り詰めに入るまでに、ツールがどれだけの生の出力を返せるかを、関連する 3 つの上限が決めます。

```yaml
tool_output:
  max_bytes: 50000        # terminal output cap (chars)
  max_lines: 2000         # read_file pagination cap
  max_line_length: 2000   # per-line cap in read_file's line-numbered view
```

- **`max_bytes`** — `terminal` のコマンドが標準出力と標準エラー出力を合わせてこの文字数を超える出力を出したとき、Hermes は先頭 40% と末尾 60% を残し、そのあいだに `[OUTPUT TRUNCATED]` の断りを挟みます。デフォルトは `50000`（よくあるトークナイザーで 12〜15K トークン程度）です。
- **`max_lines`** — 1 回の `read_file` の呼び出しにおける `limit` の上限です。これを超える要求は切り詰められ、1 回の読み取りでコンテキストウィンドウが埋まらないようにします。デフォルトは `2000` です。
- **`max_line_length`** — `read_file` が行番号付きの表示を出すときの、1 行あたりの上限です。これより長い行はこの文字数で切られ、`... [truncated]` が続きます。デフォルトは `2000` です。

コンテキストウィンドウが大きく、呼び出しごとに多くの生の出力を扱えるモデルなら、上限を上げてください。コンテキストの小さいモデルでは、ツールの結果をコンパクトに保つために下げてください。

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

### ツールの結果のあふれ分の予算 {#tool-result-spillover-budget}

切り詰めとは別に、大きすぎるツールの*結果*は切り捨てるのではなくディスクへあふれさせます。出力の全文が `$HERMES_HOME/cache/spillover/` に保存され、コンテキストの中身はプレビューと保存先のファイルのパスに置き換わります（`read_file` の `offset`／`limit` で読めますし、`execute_code` で処理することもできます）。結果 1 件あたりの一般的なあふれの閾値は 100,000 文字で、コンテキストの小さいモデルでは自動的に下げられます。

MCP のツールの結果（`mcp_*` という名前のツール）は、より厳しい **50,000 文字** をデフォルトの閾値とします。MCP のサーバーは、ページ分割されていない大きなデータ（ツールの一覧のカタログ、まとめて実行した結果）をしばしば返し、そのままでは一般的な閾値を下回ったまま、以後のやり取りのたびにコンテキストを膨らませてしまうからです。失われるものはありません。結果の全文はディスクに残ります。閾値は次のように上書きできます。

```yaml
tool_budget:
  mcp_result_size_chars: 50000   # per-result spillover threshold for mcp_* tools
```

MCP 用の閾値は、（コンテキストに応じて調整されうる）一般的な結果 1 件あたりの閾値を上限として常に切り詰められるので、上げても今のモデルのウィンドウが許す範囲を超えることはありません。

Hermes は**プロバイダー側での省略**も知らせます。MCP や Web のツールの結果が、それ自身の切り詰めの印（`...N more items`、`"has_more": true`、「サンドボックスへ保存した」といった注記）を含んでいる場合、見えているデータは完全ではなく、列挙として扱う前にページをたどるか取得し直すべきだ、と警告する 1 行が結果の末尾に足されます。

## ツールセットの全体的な無効化 {#global-toolset-disable}

特定のツールセットを、CLI とすべてのゲートウェイのプラットフォームにわたって一か所で
止めたい場合は、その名前を `agent.disabled_toolsets` に並べます。

```yaml
agent:
  disabled_toolsets:
    - memory       # hide memory tools + MEMORY_GUIDANCE injection
    - web          # no web_search / web_extract anywhere
```

これはプラットフォームごとのツールの設定（`hermes tools` が書く
`platform_toolsets`）の**あとに**適用されるので、ここに並べたツールセットは
必ず取り除かれます。プラットフォーム側の保存された設定にまだ載っていてもです。
`hermes tools` の画面で 15 行以上あるプラットフォームを
編集して回るのではなく、「どこでも X を切る」という 1 つのスイッチが欲しいときに使ってください。

リストを空のままにするか、キーごと省略した場合は、何も起きません。

## git worktree による隔離 {#git-worktree-isolation}

同じリポジトリで複数のエージェントを並行して動かすために、隔離された git の worktree を有効にできます。

```yaml
worktree: true    # Always create a worktree (same as hermes -w)
# worktree: false # Default — only when -w flag is passed
```

有効にすると、CLI のセッションごとに `.worktrees/` の下へ新しい worktree が、それ専用のブランチとともに作られます。エージェントは互いに邪魔をせずに、ファイルを編集し、コミットし、push し、PR を作れます。きれいな worktree は終了時に削除され、変更が残っているものは手で復旧できるように残されます。

デフォルトでは、新しい worktree は**取得し直したリモートの先端**（現在のブランチの上流、なければリモートの既定のブランチ）から分岐します。ローカルのクローンの、古くなっているかもしれない `HEAD` からではなく、プロジェクトの最新の状態から始めるためです。こうすると、PR の差分がローカルのクローンの遅れを巻き込まず、実際の変更だけに収まります。ローカルの `HEAD` から分岐させたい場合は `worktree_sync: false` にします。オフラインのときや、クローンの今の状態をそのまま土台にしたいときに便利です。リモートに届かない場合は、自動的にローカルの `HEAD` へ切り替わります。

```yaml
worktree_sync: true    # Default — branch from the fetched remote tip
# worktree_sync: false # Branch from local HEAD (offline / pinned base)
```

リポジトリのルートに `.worktreeinclude` を置けば、gitignore されているファイルのうち worktree へコピーしたいものを並べられます。

```
# .worktreeinclude
.env
.venv/
node_modules/
```

## コンテキストの圧縮 {#context-compression}

Hermes は、モデルのコンテキストウィンドウに収まるように、長い会話を自動的に圧縮します。圧縮の要約役は別の LLM の呼び出しなので、どのプロバイダーやエンドポイントに向けることもできます。

圧縮の設定はすべて `config.yaml` にあります（環境変数はありません）。

### 設定の一覧 {#full-reference}

```yaml
compression:
  enabled: true                                     # Toggle compression on/off
  progress_notices: false                           # Opt-in: deliver routine compression progress notices to chat platforms — see below
  threshold: 0.50                                   # Compress at this % of context limit
  threshold_tokens: null                            # Absolute token cap (optional) — takes lower of ratio vs absolute
  target_ratio: 0.20                                # Fraction of threshold to preserve as recent tail
  tail_mode: legacy                                 # Tail retention: "legacy" (0.20×window verbatim tail) or "lean" (clamped 2.5% tail, 10K-25K, with digests + anchor index + session_search recovery pointers in the summary — ~3x fewer retained tokens after compaction)
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

:::info 古い設定の移行
`compression.summary_model`、`compression.summary_provider`、`compression.summary_base_url` を持つ古い設定は、最初に読み込まれたときに自動的に `auxiliary.compression.*` へ移されます（設定のバージョン 17）。手作業は要りません。
:::

`progress_notices`（デフォルト `false`）は、圧縮の**日常的な**進捗の知らせをチャットのプラットフォーム（Telegram、Discord、Slack など）に届けるかどうかを決めます。設計上、自動の圧縮はチャットの画面では静かに行われ、裏で走ってサーバー側にログを残すだけです。`progress_notices: true` にすると、日常的な流れがチャットのプラットフォームにも見えるようになります。「Compacting context…」という開始の知らせ、事前チェックや API 呼び出し前の圧縮のきっかけ、放置による圧縮、再試行の進捗（「Compressed 30 → 12 messages, retrying…」）、そして「Context compaction complete」の知らせです。この切り替えが効くのは圧縮に関する知らせだけで、関係のない運用上のざわつき（補助モデルの失敗、プロバイダーのレート制限や再試行のやり取り）は、どちらにしても抑えられたままです。圧縮の**失敗**の知らせと、手動の `/compress` への反応は、この設定に関係なく常に表示されます。動いているゲートウェイでこの値を書き換えると、次のメッセージから効きます。

`hygiene_hard_message_limit` は、ゲートウェイだけにある**圧縮前の安全弁**です。これは悪循環を断ち切るためにあります。大きくなりすぎたセッションで API の呼び出しが切れ続けると、ゲートウェイはトークン使用量のデータを受け取れないので、トークンを基準にした閾値が発動できず、そのため会話は伸び続け、切断はさらにひどくなります。この件数ベースの下限は、メッセージ数だけで発動し（API が失敗していても件数は必ず分かります）、圧縮を強制してセッションを立て直します。デフォルトは `5000` で、通常のセッションよりはるかに大きい値です。大きなコンテキスト（100 万トークン超）のモデルで短いやり取りを何千回もする場合でも、これより手前でトークンの閾値によって圧縮されます。変わったプラットフォームではさらに上げ、もっと積極的に圧縮させたいなら下げてください。動いているゲートウェイでこの値を書き換えると、次のメッセージから効きます（後述）。

`hygiene_timeout_seconds` は、エージェントに渡す前のこの圧縮処理に対する、ゲートウェイの**無反応の許容時間**であって、全体の経過時間の上限ではありません。圧縮の要約の呼び出しはモデルからストリーミングで届き、トークンが 1 つ届くたびに前進とみなされます。つまり、ゆっくりでも生成を続けている推論モデルは自分で締め切りを延ばしていくので、遅いだけで健全な要約モデルが生成の途中で打ち切られることはありません。要約モデルがこの秒数のあいだまったく**出力を出さない**とき（バックエンドの停止、固まった接続、無反応のプロバイダー）にだけ、ゲートウェイはユーザーに警告し、届いたメッセージを圧縮せずに処理し、固まったように見せる代わりにセッションごとの一時的な失敗のクールダウンを記録します。

`hygiene_total_ceiling_seconds`（デフォルト `600`）は、トークンがまだ流れていても待ち時間の合計に上限を設けます。ちょろちょろとしか流れないおかしなストリームが、いつまでも 1 つのやり取りを人質に取れないようにするためです。この値は少なくとも `hygiene_timeout_seconds` 以上に切り上げられます。

`hygiene_failure_cooldown_seconds` は、この圧縮がタイムアウトしたり中断したりしたあとの、セッションごとのクールダウンを決めます。クールダウンのあいだ、ゲートウェイは同じ大きすぎるセッションに対する圧縮の再挑戦を飛ばすので、届くメッセージのすべてが同じ壊れた補助バックエンドで止まることはありません。`/compress`、`/reset`、あるいは後の健全なやり取りで、セッションを立て直せます。

この値は固定の間隔ではなく、段階的に伸びるはしごの**最初の段**です。同じセッションで失敗が続くと、`1x`、`3x`、`9x` とこの値の倍数で待ち、上限は 1 時間です。要約モデルが完全に壊れているセッションは、固定の間隔で永遠に再挑戦するのではなく、間隔を広げていきます。実際に会話が縮んだ実行があれば、最初の段に戻ります。この段階の上がり下がりはセッションごとで、プロセスの中だけの話です。ゲートウェイを再起動すると最初の段に戻りますが、クールダウンの期限そのものは残ります。

`context_timeout_seconds`（デフォルト `120`）は、エージェントの中で走る `compress_context`（会話のループ、事前の圧縮、手動の `/compress`）に対する同じ**無反応の許容時間**で、固まった要約モデルがセッションをいつまでも止めないようにします。ストリーミングで届く要約のトークンは待ち時間を延ばし、まったく反応しないものだけが打ち切られます。タイムアウトすると Hermes は圧縮を飛ばし、今あるメッセージをそのまま保ち、ユーザーに警告します。`0` にすると無効になります。ゲートウェイのセッションの整理は独自の `hygiene_timeout_seconds` の経路を持っており、二重には包まれません。

`context_total_ceiling_seconds`（デフォルト `600`）は、トークンがまだ流れていても、エージェント内の**確定前**の待ち時間（要約・ストリーミングの段階）に上限を設けます。この値は少なくとも `context_timeout_seconds` 以上に切り上げられます。正確な保証はこうです。**要約の段階はこの上限で区切られ、確定の段階は上限を超えたらログに記録され、表に出されます。** 処理が圧縮の確定の関門に入り、SessionDB の書き換えが進行中になったら、その確定が途中で捨てられることはありません。会話の記録が食い違う恐れがあるからです。ただし、その待ちはもう黙ったままではありません。確定が上限を超えたら、Hermes は超過をログに残し（WARNING、繰り返せば ERROR に上げます）、ユーザーに見える警告の経路で一度だけ警告を送り、確定が終わるまで区切られた間隔で待ち続けます。

`protect_first_n` は、圧縮のたびに固定しておく**システム以外の**先頭のメッセージの数を決めます。デフォルトは `3` で、最初のユーザーとアシスタントのやり取りが毎回の要約を生き延び、当初の目的が見えたままになります。長く続いて何度も圧縮されるセッションで、最初のやり取りがもう関係なくなっているなら、`protect_first_n: 0` にして、システムプロンプトと要約と末尾だけを残してください。システムプロンプト自体は、この設定に関係なく常に保たれます。

`in_place`（デフォルト `true`）は、圧縮が起きたときにセッションの同一性がどうなるかを決めます。`true` のとき、圧縮はメッセージのリストを書き換えてシステムプロンプトを組み直しますが、**セッション ID は入れ替えません**。会話はその一生を通じて 1 つの安定した ID を持ち続けます（`parent_session_id` の連鎖も、セッション一覧での `name #2` / `#3` という番号の振り直しもありません）。圧縮は失われる操作ではありません。生きているコンテキストは縮みますが、圧縮前のやり取りは同じ ID の下にそっと保管され（非アクティブ／圧縮済みの印が付きます）、`session_search` で検索でき、取り戻せます。削除ではありません。フックは `session:compress` イベントの `in_place` フィールドでモードを知ることができます。`in_place: false` にすると、圧縮のたびに古いセッションと結び付いた新しいセッション ID へ移る、従来の動作に戻ります。

`threshold_tokens` は、圧縮のきっかけに対する任意の**絶対的なトークン数の上限**を設定します。設定すると、比率ベースの `threshold` とこの絶対値のうち、早いほうで圧縮が起きます。つまり、どのモデルが動いていても、あなたが望むトークン数より遅く圧縮が始まることはありません。これは、コンテキストウィンドウの異なるモデルを行き来する（たとえば 100 万 → 40 万）と、絶対的なきっかけの位置がずれてしまう問題を解決します。この上限はモデルのコンテキスト長の範囲に収められるので、モデルが対応する値より大きく設定しても安全です（その場合は比率ベースの閾値が使われます）。デフォルトは `null`（無効。比率ベースの閾値だけ）です。この上限は、モデルの切り替えやフォールバックの発動をまたいで残ります。

`idle_compact_after_seconds` は、サイズ基準の `threshold` を補う**任意の、時間ベースの**きっかけです。デフォルトは `0`（無効）です。0 より大きくすると、その秒数以上のあいだ動きがなかったセッションが再開したとき、最初の返信の前に、溜まった履歴をあらかじめ圧縮します。何時間か経ってから戻ってくる Telegram の会話のような、長く続くやり取りが、以後のたびに古いコンテキストを丸ごと読み直さずに済みます。コンテキストがすでに圧縮後の目標（`threshold × target_ratio`）以下なら発動しませんし、自動の圧縮と同じ失敗時のクールダウン、ばたつき防止、セッションごとのロックの守りに従います。例: `idle_compact_after_seconds: 1800` は、30 分放置されたあとに圧縮します。

`proactive_prune_tokens` は、古いツールの結果を、LLM を使わずに決まった手順で刈り込む処理を有効にします。これは `threshold` とは独立に動きます。ウィンドウの大きなモデルでは `threshold` による圧縮（ウィンドウの約 50%）がめったに起きないため、かさばるツールの出力（ターミナルの大量の出力、ファイルの読み取り、Web の抽出）が履歴に居座り、以後のやり取りのたびに送り直されます。送り直される履歴が `proactive_prune_tokens`（デフォルト `0` = 無効。有効にするなら `48000` あたりから）を超えると、この刈り込みは同一の結果を重複排除し、古くて大きなものを要約し、大きなツール呼び出しの引数を切り詰めます。直近の `protect_last_n` 件のメッセージは守られ、モデルは一切呼ばれません。出力の全文はセッションの保管場所から取り戻せます。`proactive_prune_min_result_chars`（デフォルト `8000`、200 以上に切り上げ）は、これより小さいツールの結果には手を付けない、という境目です。`proactive_prune_min_reclaim_tokens`（デフォルト `4096`）は、少なくともこの数のトークンを取り戻せない限り刈り込みを確定させません。確定した刈り込みは、すでに送った履歴を書き換え、プロバイダー側のプロンプトキャッシュの先頭部分を無効にしてしまうからです。この歯止めによって、キャッシュの切れ目はツールを呼ぶたびに起きるのではなく、意味のある切れ目（圧縮の境目のような）に集約されます。この処理は組み込みの `compressor` エンジンでのみ動き、ほかのコンテキストエンジンでは何もしません。

:::tip ゲートウェイでの圧縮とコンテキスト長の即時反映
最近のリリースからは、動いているゲートウェイで `config.yaml` の `model.context_length` や `compression.*` のキーを書き換えると、次のメッセージから効きます。ゲートウェイの再起動も、`/reset` も、セッションの入れ替えも要りません。キャッシュされたエージェントの識別情報にこれらのキーが含まれているので、変更を見つけるとゲートウェイが自動でエージェントを組み直します。API キーやツール／スキルの設定は、これまでどおりの再読み込みの手順が必要です。
:::

### よくある構成 {#common-setups}

**デフォルト（自動判別）— 設定は不要です:**
```yaml
compression:
  enabled: true
  threshold: 0.50
```
主要なプロバイダーと主要なモデルを使います。会話用のモデルより安いモデルで圧縮したい場合は、用途ごとに上書きしてください（たとえば `auxiliary.compression.provider: openrouter` と `model: google/gemini-2.5-flash`）。

**特定のプロバイダーを指定する**（OAuth でも API キーでも）:
```yaml
auxiliary:
  compression:
    provider: nous
    model: gemini-3-flash
```
`nous`、`openrouter`、`codex`、`anthropic`、`main` など、どのプロバイダーでも使えます。

**独自のエンドポイント**（自前でホスト、Ollama、zai、DeepSeek など）:
```yaml
auxiliary:
  compression:
    model: glm-4.7
    base_url: https://api.z.ai/api/coding/paas/v4
```
OpenAI 互換の独自エンドポイントに向けます。認証には `OPENAI_API_KEY` を使います。

### 3 つのつまみの関係 {#how-the-three-knobs-interact}

| `auxiliary.compression.provider` | `auxiliary.compression.base_url` | 結果 |
|---------------------|---------------------|--------|
| `auto`（デフォルト） | 未設定 | 使える中から最適なプロバイダーを自動で選ぶ |
| `nous` / `openrouter` など | 未設定 | そのプロバイダーを指定し、その認証を使う |
| 何でも | 設定あり | 指定したエンドポイントを直接使う（プロバイダーの指定は無視） |

:::warning 要約モデルのコンテキスト長の条件
要約に使うモデルは、主要なエージェントのモデルと同じかそれ以上のコンテキストウィンドウを持って**いなければなりません**。圧縮では、会話の中間部分を丸ごと要約モデルへ送ります。そのモデルのコンテキストウィンドウが主要なモデルより小さいと、要約の呼び出しはコンテキスト長のエラーで失敗します。そうなると中間のやり取りは**要約されないまま捨てられ**、会話の文脈が静かに失われます。モデルを上書きする場合は、そのコンテキスト長が主要なモデル以上であることを確かめてください。
:::

## ゲートウェイのターンのリースのタイムアウト {#gateway-turn-lease-timeout}

ゲートウェイは、解決されたセッション ID ごとにやり取りを直列化するので、2 つの
経路が同じ会話の記録を同時に読み書きすることはありません。リースを待つ最大の時間は、
通常のエージェントの無反応のタイムアウトとは別に設定できます。

```yaml
agent:
  gateway_turn_lease_timeout: 1800
```

この持ち時間が尽きたときにまだ別のやり取りがセッションのリースを握っていた場合、
Hermes は安全側に倒します。待っているメッセージのために会話の記録を読み込むことも、
モデルを走らせることもしません。ユーザーには受け付けなかったという知らせが届き、
送り直す必要があります。Hermes が自動で並べ直さないのは、順序の保証と冪等性のない再投入では、二重に処理されるおそれがあるからです。
0 以下の値を指定すると、デフォルトの 1800 秒が使われます。

## セッションの停滞の見張り {#session-stall-watchdog}

ゲートウェイは、知らせるだけの停滞の見張りを走らせます（`agent.session_stall_timeout`、デフォルト `300` 秒、`0` で無効）。処理中のセッションに**未処理の受信メッセージ**があり、エージェントの共有の活動時計がこの秒数以上動いていないとき、ゲートウェイは WARNING をログに残し、ユーザーへ一度だけ知らせを送ります。

```
⚠️ Agent session appears stalled (last activity N min ago). Try /new to reset.
```

意味は次のとおりです。

- **知らせるだけです。** この見張りがやり取りを止めることはありません。長く反応がないときに実行を打ち切る `agent.gateway_timeout` とは対照的です。停滞の知らせは、エージェントが詰まっているように見えると伝えるだけで、どうするか（`/new`、`/stop`、あるいは待ち続ける）はあなたが決めます。
- **停滞 1 回につき知らせは 1 度だけです。** 未処理の受信が捌けるか活動が再開すると掛け金が外れるので、いったん復帰してまた停滞すれば、あらためて知らせが届きます。
- 前進とみなされるのは、共有の活動の記録（ツールの呼び出し、API のストリームの進み、圧縮の心拍）だけです。未処理の受信は知らせるかどうかの条件であって、前進を測る時計ではありません。

```yaml
agent:
  session_stall_timeout: 300   # seconds; 0 disables the watchdog
```

## 再接続の注意喚起 {#reconnect-attention-escalation}

プラットフォームのアダプターが接続に失敗したとき（ネットワークの障害、失効したボットのトークン、壊れたサイドカー）、ゲートウェイは上限付きの指数バックオフで無期限に再試行します。再試行が止まらないので、一時的な障害は必ずひとりでに直り、運用者が手を出す必要はありません。困るのは、*恒久的な*失敗（失効した Telegram のトークン、足りない Discord の特権インテント）が、一瞬の不調とまったく同じに見えることです。どちらも「再試行中」のまま、いつまでも続きます。

恒久的な失敗を見えるようにする仕組みが 2 つあります。

- **恒久的だと分類する。** 例外の*型*から、決してひとりでには直らないと分かる失敗 — 拒否・失効したトークン（`telegram_auth_error`、`discord_auth_error`、`email_auth_error`）、足りない特権インテント（`discord_intents_required`）、依存関係をインストールできない（`SIDECAR_DEPS_MISSING`）または node のバイナリが見つからない（`SIDECAR_NODE_MISSING`）Photon のサイドカー — は、再試行の列に入れずに致命的と印を付けます。分類は型だけを見て厳密に行い、判断のつかないエラーは常に再試行を続けます。
- **注意が要るという知らせ。** `agent.reconnect_attention_after`（デフォルト `7200` 秒 = 2 時間、`0` で無効）を超えて再試行の列に居続けたプラットフォームには、ゲートウェイの状態（`hermes status`）で `needs_attention: true` と `retrying_since` のタイムスタンプが付き、WARNING がログに残ります。再試行はそのまま続きます。これは合図であって、遮断器ではありません。再接続に成功すると、この印は消えます。

```yaml
agent:
  reconnect_attention_after: 7200   # seconds; 0 disables the escalation flag
```

## ゲートウェイのエージェントのキャッシュ {#gateway-agent-cache}

ゲートウェイはセッションごとにエージェントを 1 つ保持するので、会話は毎回システムプロンプトを組み直す代わりに、キャッシュされたプロンプトの先頭部分を使い回せます。キャッシュされたエージェントは、そのセッションの会話の記録も丸ごと抱えています。ツールの出力も含むので、ツールを 100 回呼んだセッションでは数十メガバイトになります。そのため、忙しい複数プラットフォームのゲートウェイでは、このキャッシュがプロセスの中でいちばんメモリを食う存在になります。

```yaml
agent:
  agent_cache:
    max_size: 128            # LRU entry cap
    idle_ttl_secs: 3600      # evict an agent idle this long
    memory_high_mb: auto     # anon-RSS budget; number, "auto", or 0/off
    max_evictions_per_pass: 16
    protect_recent: 8
```

`max_size` と `idle_ttl_secs` は、キャッシュを件数と時間で区切ります。どちらも何バイト抱えているかは知らないので、`memory_high_mb` が 3 つ目の区切りを足します。ゲートウェイ自身の無名の常駐メモリが予算を超えると、いちばん長く使われていない会話の記録から捨てられ、次のやり取りのときに保存済みのセッションから読み直されます。ゲートウェイがほかのサービスとメモリを取り合っているなら下げてください。どの先頭部分も温かいまま保ちたいなら上げるか、`0` にしてこの処理そのものを切ってください。

`auto` は、ゲートウェイが実際に動いている環境のメモリの上限から予算を導きます。コンテナや systemd のユニットなら cgroup の上限、それ以外なら搭載メモリの総量です。こうすると、ユニットの `MemoryMax` / `MemoryHigh` が、もう 1 つ数値を合わせて管理しなくても尊重されます。

やり取りの最中のセッション、`protect_recent` で指定した直近のもの、そして会話の記録をディスクへ書き終えていないセッションは、決して捨てられません。捨てたときは、測定した RSS と外したセッションとともに WARNING がログに残ります。

```
Agent cache pressure: anon RSS 6802MB over budget 6656MB — evicting 5 LRU session(s): ...
```

## コンテキストエンジン {#context-engine}

コンテキストエンジンは、モデルのトークンの上限に近づいたときに会話をどう扱うかを決めます。組み込みの `compressor` エンジンは、内容を落としながらの要約を使います（[Context Compression](https://hermes-agent.nousresearch.com/developer-guide/context-compression-and-caching) を参照）。プラグインのエンジンで、別のやり方に差し替えることもできます。

```yaml
context:
  engine: "compressor"    # default — built-in lossy summarization
```

プラグインのエンジン（たとえば内容を落とさずに管理する LCM）を使うには、次のようにします。

```yaml
context:
  engine: "lcm"          # must match the plugin's name
```

プラグインのエンジンが**勝手に有効になることはありません**。`context.engine` にプラグインの名前を明示する必要があります。使えるエンジンは `hermes plugins` → Provider Plugins → Context Engine から見て選べます。

メモリのプラグインについても、同じように 1 つだけ選ぶ仕組みがあります。[Memory Providers](https://hermes-agent.nousresearch.com/user-guide/features/memory-providers) を参照してください。

## 繰り返しの上限 {#iteration-budget}

エージェントがツールを何度も呼ぶ複雑な仕事に取り組んでいると、繰り返しの持ち分（デフォルト: 500 回）を使い切ることがあります。Hermes は作業の途中で急かす警告を差し込むことは**ありません**。以前のビルドでは持ち分の 70%／90% でモデルに警告していましたが、それが原因でモデルが複雑な仕事を途中で投げ出してしまい、2026 年 4 月に取り除かれました。

代わりに、持ち分を実際に使い切ったとき（500/500）、Hermes はまとめに入るよう促すメッセージを 1 つ差し込み、最後の返答を出せるように **猶予の呼び出し** を 1 回だけ許します。その猶予の呼び出しでも文章が出てこなければ、何を成し遂げたかを要約するようエージェントに求めます。

```yaml
agent:
  max_turns: none              # Iterations per conversation turn (default: none = unlimited)
                               # Set a positive integer to cap; "none"/"null"/
                               # "unlimited"/"inf"/"infinity"/"infinite"/0/-1 = no limit
  api_max_retries: 3           # Retries per provider before fallback engages (default: 3)
```

`agent.max_turns` は**デフォルトで無制限**です。回数の上限は、解決する問題より生み出す問題（作業の途中で黙って打ち切られること）のほうが多かったので、初期状態の Hermes は 1 回のやり取りを最後まで走らせます。上限を設けたい場合は正の整数を指定します。「無制限」と明示したいときは、大文字小文字を問わず次のどれでも使えます。`"none"`、`"null"`、`"unlimited"`、`"infinite"`、`"infinity"`、`"inf"`、`0`、`-1`（内部では `sys.maxsize` の目印に解決されるので、回数でループが終わることはありません）。

`agent.api_max_retries` は、一時的なエラー（レート制限、接続の切断、5xx）が起きたときに、フォールバックのプロバイダーへの切り替えが始まる**前に**、Hermes がプロバイダーの API 呼び出しを何回やり直すかを決めます。デフォルトは `3` で、合計 4 回試します。[フォールバックのプロバイダー](https://hermes-agent.nousresearch.com/user-guide/features/fallback-providers) を設定していて、もっと早く切り替えたいなら `0` にしてください。主要なプロバイダーで最初の一時的なエラーが出た時点で、不安定なエンドポイントに再試行を重ねずに、すぐフォールバックへ渡します。

## 実時間の持ち時間 {#wall-clock-run-budget}

繰り返しの上限とは別に、1 回の会話の実行に**実時間**の持ち時間を任意で与えられます。これは、外から厳しい上限をかけられて動く一度きりの実行や、評価用の仕組み（たとえばタスクあたり 900 秒の制限）を想定しています。これがないと、作業が実質的に終わっているのに時間切れになりかねません。最後の答えを出す一歩手前だったり、固まったプロバイダーの呼び出し 1 つに引っかかっていたりする状態です。

```yaml
agent:
  run_budget_seconds: null     # Optional; unset/null = feature fully off (default)
```

実行ごとに CLI から指定することもできます。

```bash
hermes chat --run-budget 850 -q "..."
```

持ち時間を設定すると、2 つのことが起きます。

1. **80% でまとめに入る知らせ。** 持ち時間の 80% が過ぎたとき、Hermes は**一度だけ**の知らせを差し込み（キャッシュを壊さない形で、`/steer` のメッセージと同じく最新のツールの結果の末尾に付けます）、新しい調査や検証はやめて、いま手元にある情報から最終的な成果物を出すようモデルに伝えます。1 回の実行につき多くても 1 度しか出ず、既存の繰り返しの上限のまとめの仕組みと同じ形です。繰り返し急かす警告はありません。
2. **締め切りに合わせた停滞のタイムアウト。** 明示していない、ストリーミングを使わない場合の停滞のタイムアウト（デフォルトの 90 秒や、推論モデル向けの下限、たとえば DeepSeek の推論モデルの 600 秒）は `max(60, remaining_budget × 0.5)` に抑えられ、黙って固まったプロバイダーの呼び出し 1 つが残り時間を食い尽くせないようにします。この上限はタイムアウトを*短くする*方向にしか働かず、伸ばすことはありません。また、明示的に設定した `stale_timeout_seconds`（プロバイダーやモデルの設定、あるいは `HERMES_API_CALL_STALE_TIMEOUT`）は、常にそのまま優先されます。

この持ち時間は `run_conversation` のやり取りごとのもので（ユーザーのメッセージごとにリセットされます）、未設定のときは機能そのものが完全に眠っています。時計を読むことも、何かを差し込むことも、タイムアウトを変えることもありません。

## 停止前の検証（コーディングの確認） {#verify-on-stop-coding-verification}

有効にすると、エージェントがワークスペースのコードを編集したのに、新しい検証の証拠（テストが通った、ビルドできた、lint が通ったなど）を出していないやり取りでは、Hermes は最終的な答えを受け付けません。検証するか、できない理由を説明するよう求める追いかけのメッセージを差し込みます。ドキュメントや markdown、スキルだけの編集では発動しませんし、ループには上限があるのでエージェントが閉じ込められることはありません。

```yaml
agent:
  verify_on_stop: false        # true | false | "auto" (surface-aware: on for CLI/TUI/desktop, off for messaging)
  verify_guidance: true        # Append creative-UI / clean-diff guidance to the missing-evidence nudge
  max_verify_nudges: 3         # Cap on consecutive continue nudges per turn (built-in + pre_verify hooks)
  coding_instructions: ""      # Standing project-wide coding rules appended to the coding brief
```

`verify_on_stop` は `true`（どこでも有効）、`false`（無効。デフォルト）、`"auto"`（従来の、画面に応じた動作。CLI、TUI、デスクトップといった対話的なコーディングの画面とプログラムからの呼び出しでは有効、検証の説明がチャットの雑音に見えてしまう Telegram や Discord のようなメッセージの画面では無効）を受け付けます。どこでも無効がデフォルトです。新規にインストールすると `false` で始まり、設定の移行によって既存のインストールでも無効になったので、有効にするのは意識的な選択です。`HERMES_VERIFY_ON_STOP` の環境変数を設定すると、設定ファイルの値より優先されます。

同じ場所にユーザーやプラグインの判断を挟み、自前の検査でエージェントを走らせ続けたい場合は、[`pre_verify` フック](https://hermes-agent.nousresearch.com/user-guide/features/hooks#pre_verify) を参照してください。

## 継続する目標（`/goal`） {#standing-goals-goal}

継続する目標が有効なあいだ、Hermes はアシスタントの返答のたびに、それが目標を満たしているかを判定します。満たしていなければ、同じセッションへ続きを促すプロンプトを送り返し、目標が達成されるか、やり取りの持ち分が尽きるか、ユーザーが一時停止・解除するまで作業を続けます。実際の歯止めになるのはやり取りの持ち分です。判定に失敗したときは**続ける側**に倒れるので、判定が不安定でも前進が止まることはありません。

```yaml
goals:
  max_turns: 20   # Max continuation turns before Hermes auto-pauses the goal (default: 20)
```

`max_turns` は、Hermes が目標を自動で一時停止してユーザーに `/goal resume` を促すまでに、目標が何回の継続のやり取りを引っ張れるかを決めます。判定の見落とし（実際は達成しているのに続けろと言われる）や、曖昧で達成しようのない目標にモデルの費用が際限なく吸われることを防ぎます。機能の全体は [Goals](https://hermes-agent.nousresearch.com/user-guide/features/goals) を参照してください。

### API のタイムアウト {#api-timeouts}

Hermes には、ストリーミング向けの複数の層のタイムアウトと、ストリーミングを使わない呼び出し向けの停滞の検出があります。停滞の検出は、暗黙のデフォルトのままにしている場合にだけ、ローカルのプロバイダー向けに自動で調整されます。

| タイムアウト | デフォルト | ローカルのプロバイダー | 設定 / 環境変数 |
|---------|---------|----------------|--------------|
| ソケットの読み取りのタイムアウト | 120 秒 | 自動で 1800 秒へ引き上げ | `HERMES_STREAM_READ_TIMEOUT` |
| ストリームの停滞の検出 | 180 秒 | 900 秒を上限に引き上げ（`agent.local_stream_stale_timeout`） | `HERMES_STREAM_STALE_TIMEOUT` |
| ストリームなしの停滞の検出 | 90 秒 | 暗黙のままなら自動で無効 | `providers.<id>.stale_timeout_seconds` または `HERMES_API_CALL_STALE_TIMEOUT` |
| API の呼び出し（ストリーミングなし） | 1800 秒 | 変更なし | `providers.<id>.request_timeout_seconds` / `timeout_seconds` または `HERMES_API_TIMEOUT` |

**ソケットの読み取りのタイムアウト**は、プロバイダーから次のデータの塊が届くのを httpx がどれだけ待つかを決めます。ローカルの LLM は、大きなコンテキストの前処理に何分もかかってから最初のトークンを出すことがあるので、Hermes はローカルのエンドポイントを見つけると 30 分へ引き上げます。`HERMES_STREAM_READ_TIMEOUT` を明示的に設定した場合は、エンドポイントの判別に関わらずその値が使われます。

**ストリームの停滞の検出**は、SSE の生存確認の合図だけが届いて実際の内容が来ない接続を切ります。ローカルのプロバイダー（前処理のあいだ生存確認を送りません）では、基準の 180 秒ではなく 900 秒という有限の上限まで引き上げられます。`agent.local_stream_stale_timeout` か `HERMES_LOCAL_STREAM_STALE_TIMEOUT` の環境変数で調整できます。

**ストリームなしの停滞の検出**は、長いあいだ応答を返さないストリーミングなしの呼び出しを切ります。デフォルトでは、長い前処理のあいだの誤検出を避けるため、Hermes はローカルのエンドポイントではこれを無効にします。`providers.<id>.stale_timeout_seconds`、`providers.<id>.models.<model>.stale_timeout_seconds`、`HERMES_API_CALL_STALE_TIMEOUT` を明示的に設定した場合は、ローカルのエンドポイントでもその値が尊重されます。

この持ち時間は、ストリーミングを使わないすべての呼び出しに効きます。cron のジョブや、委任されたサブエージェントがその場で走らせるものも含みます。リクエストを受け付けたあと黙り込むプロバイダー（接続は開いたまま、1 バイトも来ず、エラーも出ない）は、停滞のタイムアウトで打ち切られて再試行されます。はるかに長いソケットの読み取りのタイムアウトまで（あるいは、誰も見ていない cron の実行なら、外から何かがプロセスを止めるまで）ぶら下がり続けることはありません。

## コンテキストの逼迫の警告 {#context-pressure-warnings}

繰り返しの持ち分とは別に、コンテキストの逼迫は、会話が**圧縮の閾値**（古いメッセージを要約する圧縮が始まる地点）にどれだけ近づいているかを追いかけます。会話が長くなってきたことを、あなたにもエージェントにも分かるようにするものです。

| 進み具合 | レベル | 起きること |
|----------|-------|-------------|
| 閾値まで **60% 以上** | 情報 | CLI に水色の進捗バーが出る。ゲートウェイはお知らせを送る |
| 閾値まで **85% 以上** | 警告 | CLI に太い黄色のバーが出る。ゲートウェイは圧縮が近いと警告する |

CLI では、コンテキストの逼迫はツールの出力の流れの中に進捗バーとして現れます。

```
  ◐ context ████████████░░░░░░░░ 62% to compaction  48k threshold (50%) · approaching compaction
```

メッセージ用のプラットフォームでは、文字だけの知らせが届きます。

```
◐ Context: ████████████░░░░░░░░ 62% to compaction (threshold: 50% of window).
```

自動の圧縮が無効になっている場合は、代わりにコンテキストが切り詰められるかもしれないと警告します。

コンテキストの逼迫は自動で、設定は要りません。あくまでユーザーに向けた知らせとして出るだけで、メッセージの流れを変えたり、モデルのコンテキストに何かを差し込んだりはしません。

## 認証情報のプールの選び方 {#credential-pool-strategies}

同じプロバイダーの API キーや OAuth のトークンを複数持っている場合、どう回すかを設定できます。

```yaml
credential_pool_strategies:
  openrouter: round_robin    # cycle through keys evenly
  anthropic: least_used      # always pick the least-used key
```

選べるのは `fill_first`（デフォルト）、`round_robin`、`least_used`、`random` です。詳しくは [Credential Pools](https://hermes-agent.nousresearch.com/user-guide/features/credential-pools) を参照してください。

## プロンプトのキャッシュ {#prompt-caching}

使っているプロバイダーが対応していれば、Hermes はセッションをまたぐプロンプトのキャッシュを自動的に有効にします。ユーザー側の設定は要りません。

**ネイティブの Anthropic**、**OpenRouter**、**Nous Portal** 経由の Claude では、Hermes はシステムプロンプトとスキルのブロックに、1 時間の有効期間（`ttl: "1h"`）を指定した `cache_control` の区切りを付けます。新しい 1 時間の中で最初に送るときは通常の入力料金がかかり、同じ 1 時間のうちなら、どのセッションから送っても割安なキャッシュ読み出しの料金で済みます。つまり、システムプロンプト、読み込んだスキルの内容、長いコンテキストの前のほうの部分が、最初の 1 時間は `hermes` のセッションをまたいで、また分岐したサブエージェントをまたいで再利用されます。

Qwen Cloud（Alibaba DashScope）の上流はキャッシュの有効期間を 5 分に制限しているので、そこでは Hermes も 5 分の区切りを使います。ほかのサードパーティ経由の Claude（AWS Bedrock、Azure Foundry）は、そのプロバイダー自身のキャッシュのデフォルトに従います。xAI の Grok は、セッションに紐づいた会話 ID という別の仕組みを使います。[xAI prompt caching](https://hermes-agent.nousresearch.com/integrations/providers#xai-grok--responses-api--prompt-caching) を参照してください。

これを無効にするつまみはありません。キャッシュは常に有効で、1 往復だけの会話でもお金の節約になります。システムプロンプトだけでも、入力のトークン数のうち無視できない割合を占めるからです。

唯一の明示的なつまみは、Anthropic 方式の区切りで Hermes が要求するキャッシュの有効期間の段階です。

```yaml
prompt_caching:
  cache_ttl: "5m"   # "5m" or "1h" (Anthropic-supported tiers); other values are ignored
```

`cache_ttl` は、ネイティブの Anthropic API、OpenRouter、Nous Portal 経由の Claude に対して Hermes が付ける区切りの有効期間を選びます。Anthropic が対応する 2 つの段階（`"5m"`、`"1h"`）だけが有効で、それ以外の値は無視されます。独自の上限を持つプロバイダー（最大 5 分の Qwen Cloud など）では、上流が許す範囲に切り詰められます。

## 補助モデル {#auxiliary-models}

Hermes は、画像の解析、Web ページの要約、ブラウザーのスクリーンショットの解析、セッションのタイトルの生成、コンテキストの圧縮といった脇の仕事に「補助」モデルを使います。デフォルト（`auxiliary.*.provider: "auto"`）では、Hermes はすべての補助的な仕事を**主要な会話用モデル**、つまり `hermes model` で選んだのと同じプロバイダーとモデルへ回します。使い始めるのに設定は要りませんが、高価な推論モデル（Opus、MiniMax M2.7 など）では、補助的な仕事が無視できない費用になることは頭に置いてください。主要なモデルが何であれ脇の仕事は安く速く済ませたい場合は、`auxiliary.<task>.provider` と `auxiliary.<task>.model` を明示してください（たとえば、画像処理や Web の抽出に OpenRouter 経由の Gemini Flash を指定します）。

:::note 「auto」が主要なモデルを使う理由
以前のビルドでは、集約サービス（OpenRouter、Nous Portal）の利用者だけを、そのサービス側の安いデフォルトに振り分けていました。これは意外性がありました。集約サービスに料金を払っているのに、補助的な通信だけ別のモデルが処理していたのです。今の `auto` は誰にとっても主要なモデルを使います。`config.yaml` での仕事ごとの上書きは、これまでどおり優先されます（後述の [補助モデルの設定の一覧](#full-auxiliary-config-reference) を参照）。
:::

### 補助モデルを対話的に設定する {#configuring-auxiliary-models-interactively}

YAML を手で書く代わりに、`hermes model` を実行してメニューから **「Configure auxiliary models」** を選んでください。仕事ごとに選べる画面が出ます。

```
$ hermes model
→ Configure auxiliary models

[ ] vision               currently: auto / main model
[ ] web_extract          currently: auto / main model
[ ] title_generation     currently: openrouter / google/gemini-3-flash-preview
[ ] tts_audio_tags       currently: auto / main model
[ ] compression          currently: auto / main model
[ ] approval             currently: auto / main model
[ ] triage_specifier     currently: auto / main model
[ ] kanban_decomposer    currently: auto / main model
[ ] profile_describer    currently: auto / main model
[ ] delegation           currently: auto / inherit main agent
```

仕事を選び、プロバイダーを選び（OAuth ならブラウザーが開き、API キーのプロバイダーなら入力を求められます）、モデルを選びます。変更は `config.yaml` の `auxiliary.<task>.*` に保存されます。主要なモデルを選ぶ画面と同じ仕組みなので、新しい書き方を覚える必要はありません。

**Delegation** の項目だけは特別です。これは `delegate_task` のサブエージェントが使うモデルを決め、`auxiliary.*` ではなく最上位の `delegation.*`（`delegation.provider` / `delegation.model`）に保存されます。サブエージェントは脇の LLM 呼び出しではなく、れっきとした子のエージェントだからです。ここでの `auto` は「親のエージェントのプロバイダー、モデル、認証情報を引き継ぐ」という意味です。

最初のやり取りのあとに Hermes がタイトルを自動生成しないようにしたい場合は、
`auxiliary.title_generation.enabled: false` にしてください。`/title` や
`hermes sessions rename` による手動のタイトル付けは、そのまま使えます。

### ストリーミング専用のエンドポイント {#stream-only-endpoints}

OpenAI 互換のエンドポイントの中には、ストリーミングを使わない会話のリクエストをきっぱり拒むものがあります（たとえば Tencent Copilot は HTTP 400 で `"Non-stream chat request is currently not supported"` を返します）。対話的な会話はもともとストリーミングですが、補助的な仕事（タイトルの生成、圧縮、Web の抽出）はストリーミングを使わない呼び出しなので、毎回失敗してしまいます。Hermes は `copilot.tencent.com` を常にストリーミング専用として扱います。ほかにそういうエンドポイントがあれば、URL の一部を `auxiliary.stream_only_base_urls` に並べてください。

```yaml
auxiliary:
  stream_only_base_urls:
    - "my-stream-only-proxy.example.com"
```

これに一致する補助的な呼び出しは `stream=True` で送られ、届いた断片（ツール呼び出しの差分も含みます）はクライアント側でまとめられます。ほかのエンドポイントの動作は変わりません。

### 動画のチュートリアル {#video-tutorial}

[YouTube: https://www.youtube.com/embed/NoF-YajElIM](https://www.youtube.com/embed/NoF-YajElIM)

### 共通の設定の型 {#the-universal-config-pattern}

Hermes のモデルの枠 — 補助的な仕事、圧縮、フォールバック — は、すべて同じ 3 つのつまみを使います。

| キー | 役割 | デフォルト |
|-----|-------------|---------|
| `provider` | 認証と経路に使うプロバイダー | `"auto"` |
| `model` | 要求するモデル | プロバイダーのデフォルト |
| `base_url` | OpenAI 互換の独自エンドポイント（プロバイダーの指定より優先） | 未設定 |

補助的な仕事のブロックは、さらに `reasoning_effort` のつまみを受け付けます。

| キー | 役割 | デフォルト |
|-----|-------------|---------|
| `reasoning_effort` | その仕事の LLM 呼び出しでの思考の深さ: `none`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max`、`ultra` | 未設定（プロバイダーのデフォルト） |

これは全体設定である `agent.reasoning_effort` の、仕事ごとの相棒です。主要なモデルが高価な推論モデルのとき、圧縮を `low` で、画像処理を `none` で走らせれば、会話そのものの振る舞いには触れずに脇の仕事の待ち時間と費用を削れます。すべての補助的な仕事のブロック（`vision`、`web_extract`、`compression`、`title_generation`、`curator`、`background_review` など）で、3 つの通信方式（chat completions、Codex Responses、Anthropic Messages）すべてに効きます。同じ仕事に `extra_body.reasoning` を明示した場合は、この簡易な書き方より優先されます。

MoA だけは例外です。Mixture-of-Agents の思考の深さは、`moa_reference` や `moa_aggregator` の補助のブロックではなく、MoA のプリセットの中で**枠ごとに**設定します（`moa.presets.<name>.reference_models[].reasoning_effort` / `aggregator.reasoning_effort`）。[Mixture of Agents](https://hermes-agent.nousresearch.com/user-guide/features/mixture-of-agents) を参照してください。

```yaml
auxiliary:
  compression:
    reasoning_effort: "low"    # summaries don't need deep thinking
  vision:
    reasoning_effort: "none"   # disable thinking for image description
```

`base_url` を設定すると、Hermes はプロバイダーの指定を無視してそのエンドポイントを直接呼びます（認証には `api_key` か `OPENAI_API_KEY` を使います）。`provider` だけを設定した場合は、そのプロバイダーに組み込まれた認証とベース URL を使います。

補助的な仕事で使えるプロバイダーは、`auto`、`main`、それに [プロバイダーの一覧](https://hermes-agent.nousresearch.com/reference/environment-variables) にあるものすべてです。`openrouter`、`nous`、`openai-codex`、`copilot`、`copilot-acp`、`anthropic`、`gemini`、`qwen-oauth`、`zai`、`kimi-coding`、`kimi-coding-cn`、`minimax`、`minimax-cn`、`minimax-oauth`、`deepseek`、`nvidia`、`xai`、`xai-oauth`、`ollama-cloud`、`alibaba`、`bedrock`、`huggingface`、`arcee`、`xiaomi`、`kilocode`、`opencode-zen`、`opencode-go`、`commandcode`、`commandcode-anthropic`、`ai-gateway`、`azure-foundry`、あるいは `providers:` の辞書に自分で名前を付けたもの（たとえば `provider: "beans"`）です。

:::tip MiniMax の OAuth
`minimax-oauth` は、ブラウザーでの OAuth によりログインします（API キーは要りません）。`hermes model` を実行して **MiniMax (OAuth)** を選ぶと認証できます。補助的な仕事には自動的に `MiniMax-M2.7-highspeed` が使われます。[MiniMax OAuth guide](/hermes/docs/guides/minimax-oauth/) を参照してください。
:::

:::tip xAI Grok の OAuth
`xai-oauth` は、SuperGrok や X Premium+ の契約者向けに、ブラウザーでの OAuth によりログインします（API キーは要りません）。`hermes model` を実行して **xAI Grok OAuth (SuperGrok / Premium+)** を選ぶと認証できます。同じ OAuth のトークンが、xAI へ直接つながるすべての場面（会話、補助的な仕事、TTS、画像生成、動画生成、文字起こし）で使い回されます。[xAI Grok OAuth guide](/hermes/docs/guides/xai-grok-oauth/) を参照してください。Hermes をリモートのホストで動かしている場合は、[OAuth over SSH / Remote Hosts](/hermes/docs/guides/oauth-over-ssh/) も参照してください。
:::

:::warning `"main"` は補助的な仕事専用です
`"main"` というプロバイダーの指定は「主要なエージェントが使っているプロバイダーをそのまま使う」という意味で、`auxiliary:`、`compression:`、そして主要なフォールバックの項目（`fallback_providers:` や従来の `fallback_model:`）の中でのみ有効です。最上位の `model.provider` の値としては**使えません**。OpenAI 互換の独自エンドポイントを使う場合は、`model:` の節で `provider: custom` にしてください。主要なモデルのプロバイダーの選択肢は [AI Providers](https://hermes-agent.nousresearch.com/integrations/providers) を参照してください。
:::

### 補助モデルの設定の一覧 {#full-auxiliary-config-reference}

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

  # Web page summarization + browser page text extraction
  web_extract:
    provider: "auto"
    model: ""                  # e.g. "google/gemini-2.5-flash"
    base_url: ""
    api_key: ""
    timeout: 360               # seconds (6min) — per-attempt LLM summarization

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
補助的な仕事にはそれぞれ設定可能な `timeout`（秒）があります。デフォルトは vision が 120 秒、web_extract が 360 秒、approval が 30 秒、compression が 120 秒です。補助的な仕事に遅いローカルのモデルを使うなら、これらを長くしてください。vision には、HTTP で画像をダウンロードするための `download_timeout`（デフォルト 30 秒）も別にあります。回線が遅い場合や、自前で立てた画像サーバーを使う場合は長くしてください。
:::

:::info
コンテキストの圧縮は、閾値のための独自の `compression:` ブロックと、モデルやプロバイダーの設定のための `auxiliary.compression:` ブロックを持ちます。前述の [コンテキストの圧縮](#context-compression) を参照してください。主要なフォールバックの連鎖には、最上位の `fallback_providers:` のリストを使います。[Fallback Providers](https://hermes-agent.nousresearch.com/integrations/providers#fallback-providers) を参照してください。3 つとも同じ provider / model / base_url の型に従います。
:::

### 補助的な仕事ごとのフォールバックの連鎖 {#per-task-fallback-chain-for-auxiliary-tasks}

補助的な仕事にはそれぞれ、任意で `fallback_chain` を定義できます。これは、主要な補助のプロバイダーがレート制限、接続の問題、支払いの制限で失敗したときに Hermes が順に試す、プロバイダーとモデルの組のリストです。

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

主要な補助のプロバイダー（`openrouter` / `openai/gpt-4o-mini`）がレート制限、接続のタイムアウト、支払いが必要というエラーを返すと、Hermes は `fallback_chain` を順にたどります。すでに失敗したプロバイダーと同じものは飛ばし、残りの項目を 1 つずつ、どれかが成功するか、連鎖を使い切るまで試します。すべてのフォールバックが失敗した場合は、最後の安全網として主要なエージェントのモデルに戻ります。

各項目は、補助的な仕事の設定と同じ 3 つのつまみに対応します。

| キー | 説明 |
|-----|-------------|
| `provider` | プロバイダー名（`nous`、`openrouter`、`anthropic`、`gemini`、`main` など） |
| `model` | そのプロバイダーでのモデル名 |
| `base_url` | （任意）OpenAI 互換の独自エンドポイント |

`fallback_chain` は、`compression`、`vision`、`web_extract`、`approval`、`skills_hub`、`mcp` など、どの補助的な仕事でも使えます。

### 補助的な仕事の同時実行を絞る {#limiting-auxiliary-concurrency}

`max_concurrency` は、`compression` や `title_generation` のような補助的な仕事について、プロセス全体で同時に走る LLM の呼び出しの数に上限を設けます。`auxiliary.vision.max_concurrency` は対象外です。こちらは LLM のリクエストではなく、画像の変換やサイズ調整という CPU を使う処理の並列数だけを制御しているからです。これがとくに役立つのは次の場合です。

- 多くのセッションが同時に裏の仕事を始めうるとき（Discord や Telegram のチャンネル、複数のターミナル）
- プロバイダーがレート制限中だったり障害中だったりして、再試行が一気に押し寄せると悪化するとき

デフォルトは無制限です。安全のための典型的な上限は `2` です。

```yaml
auxiliary:
  title_generation:
    max_concurrency: 2
  compression:
    max_concurrency: 2
```

この数の管理は再試行やフォールバックを含む呼び出し全体を包むので、1 回の遅い呼び出しが上限に対して二重に数えられることはありません。

### 補助的な仕事での OpenRouter の経路と Pareto Code {#openrouter-routing-pareto-code-for-auxiliary-tasks}

補助的な仕事が OpenRouter に解決されるとき（明示した場合でも、主要なエージェントが OpenRouter を使っていて `provider: "main"` になった場合でも）、主要なエージェントの `provider_routing` や `openrouter.min_coding_score` の設定は**引き継がれません**。設計上、補助的な仕事はそれぞれ独立しています。特定の補助的な仕事に OpenRouter のプロバイダーの好みを設定したり、[Pareto Code のルーター](https://hermes-agent.nousresearch.com/integrations/providers#openrouter-pareto-code-router) を使ったりするには、仕事ごとに `extra_body` で指定してください。

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

書き方は、OpenRouter が chat completions のリクエストの本文で受け付ける形をそのまま写したものです。Hermes は `extra_body` を丸ごとそのまま転送するので、[openrouter.ai/docs](https://openrouter.ai/docs) に載っているほかのリクエスト本文の項目も同じように使えます。

### 画像処理のモデルを変える {#changing-the-vision-model}

画像の解析に Gemini Flash ではなく GPT-4o を使うには、次のようにします。

```yaml
auxiliary:
  vision:
    model: "openai/gpt-4o"
```

環境変数でも指定できます（`~/.hermes/.env` に書きます）。

```bash
AUXILIARY_VISION_MODEL=openai/gpt-4o
```

### プロバイダーの選択肢 {#provider-options}

ここに挙げる選択肢は、**補助的な仕事の設定**（`auxiliary:`、`compression:`）と主要なフォールバックの項目（`fallback_providers:` や従来の `fallback_model:`）に効くもので、主要な `model.provider` の設定には使えません。

| プロバイダー | 説明 | 必要なもの |
|----------|-------------|-------------|
| `"auto"` | 使える中で最良のもの（デフォルト）。画像処理は OpenRouter → Nous → Codex の順に試します。 | — |
| `"openrouter"` | OpenRouter を指定します。どのモデル（Gemini、GPT-4o、Claude など）へも回せます | `OPENROUTER_API_KEY` |
| `"nous"` | Nous Portal を指定します | `hermes auth` |
| `"codex"` | Codex の OAuth（ChatGPT のアカウント）を指定します。画像処理に対応します（gpt-5.3-codex）。 | `hermes model` → ChatGPT または Codex Subscription |
| `"minimax-oauth"` | MiniMax の OAuth を指定します（ブラウザーでログイン、API キー不要）。補助的な仕事には MiniMax-M2.7-highspeed を使います。 | `hermes model` → MiniMax (OAuth) |
| `"xai-oauth"` | xAI Grok の OAuth を指定します（SuperGrok や X Premium+ の契約者向けにブラウザーでログイン、API キー不要）。同じ OAuth のトークンが会話、TTS、画像、動画、文字起こしをまかないます。 | `hermes model` → xAI Grok OAuth (SuperGrok / Premium+) |
| `"main"` | いま使っている独自・主要のエンドポイントを使います。`OPENAI_BASE_URL` と `OPENAI_API_KEY` から来ることも、`hermes model` や `config.yaml` に保存された独自エンドポイントから来ることもあります。OpenAI、ローカルのモデル、OpenAI 互換の API のいずれでも動きます。**補助的な仕事専用で、`model.provider` には使えません。** | 独自エンドポイントの認証情報とベース URL |

主要なプロバイダーの一覧にある、API キー方式の直接のプロバイダーもここで使えます。既定のルーターを迂回して脇の仕事をさせたいときに便利です。たとえば `GMI_API_KEY` を設定すれば `gmi` が、`FIREWORKS_API_KEY` を設定すれば `fireworks` が使えます。

```yaml
auxiliary:
  compression:
    provider: "gmi"
    model: "anthropic/claude-opus-4.6"
```

GMI を補助に使うときは、GMI の `/v1/models` エンドポイントが返す正確なモデル ID を指定してください。Fireworks のモデル ID は、`accounts/fireworks/models/glm-5p2` のように、そのプロバイダー本来のスラッシュ区切りの形を使います。

### よくある構成 {#common-setups}

**独自のエンドポイントを直接使う**（ローカルや自前でホストする API には `provider: "main"` より分かりやすい書き方です）:
```yaml
auxiliary:
  vision:
    base_url: "http://localhost:1234/v1"
    api_key: "local-key"
    model: "qwen2.5-vl"
```

`base_url` は `provider` より優先されるので、補助的な仕事を特定のエンドポイントへ向けるいちばん明確な方法です。エンドポイントを直接上書きした場合、Hermes は設定された `api_key` を使い、なければ `OPENAI_API_KEY` に頼ります。その独自エンドポイントに `OPENROUTER_API_KEY` を使い回すことはありません。

**画像処理に OpenAI の API キーを使う:**
```yaml
# In ~/.hermes/.env:
# OPENAI_BASE_URL=https://api.openai.com/v1
# OPENAI_API_KEY=sk-...

auxiliary:
  vision:
    provider: "main"
    model: "gpt-4o"       # or "gpt-4o-mini" for cheaper
```

**画像処理に OpenRouter を使う**（どのモデルへも回せます）:
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

**MiniMax の OAuth を使う**（ブラウザーでログイン、API キーは不要）:
```yaml
model:
  default: MiniMax-M2.7
  provider: minimax-oauth
  base_url: https://api.minimax.io/anthropic
```
`hermes model` を実行して **MiniMax (OAuth)** を選ぶと、ログインしてこの設定が自動で書かれます。中国リージョンの場合、ベース URL は `https://api.minimaxi.com/anthropic` になります。手順の全体は [MiniMax OAuth guide](/hermes/docs/guides/minimax-oauth/) を参照してください。

**ローカルや自前でホストするモデルを使う:**
```yaml
auxiliary:
  vision:
    provider: "main"      # uses your active custom endpoint
    model: "my-local-model"
```

`provider: "main"` は、Hermes が普段の会話で使っているプロバイダーをそのまま使います。自分で名前を付けた独自のプロバイダー（たとえば `beans`）でも、`openrouter` のような組み込みのプロバイダーでも、従来の `OPENAI_BASE_URL` のエンドポイントでも構いません。

:::tip
主要なモデルのプロバイダーとして Codex の OAuth を使っているなら、画像処理は自動的に動きます。追加の設定は要りません。Codex は画像処理の自動判別の連鎖に含まれています。
:::

:::warning
**画像処理にはマルチモーダルのモデルが必要です。** `provider: "main"` にする場合は、そのエンドポイントがマルチモーダル／画像に対応していることを確かめてください。そうでないと画像の解析は失敗します。
:::

### 環境変数（従来の方法） {#environment-variables-legacy}

補助モデルは環境変数でも設定できます。ただし `config.yaml` のほうが望ましい方法です。管理しやすく、`base_url` や `api_key` を含むすべての選択肢に対応しています。

| 設定 | 環境変数 |
|---------|---------------------|
| 画像処理のプロバイダー | `AUXILIARY_VISION_PROVIDER` |
| 画像処理のモデル | `AUXILIARY_VISION_MODEL` |
| 画像処理のエンドポイント | `AUXILIARY_VISION_BASE_URL` |
| 画像処理の API キー | `AUXILIARY_VISION_API_KEY` |
| Web の抽出のプロバイダー | `AUXILIARY_WEB_EXTRACT_PROVIDER` |
| Web の抽出のモデル | `AUXILIARY_WEB_EXTRACT_MODEL` |
| Web の抽出のエンドポイント | `AUXILIARY_WEB_EXTRACT_BASE_URL` |
| Web の抽出の API キー | `AUXILIARY_WEB_EXTRACT_API_KEY` |

圧縮とフォールバックのモデルの設定は、config.yaml でしか行えません。

:::tip
いまの補助モデルの設定を見るには `hermes config` を実行してください。上書きは、デフォルトと異なるときだけ表示されます。
:::

## 推論の深さ {#reasoning-effort}

モデルが返答する前にどれだけ「考える」かを調整します。

```yaml
agent:
  reasoning_effort: ""   # empty = medium. Options: none, minimal, low, medium, high, xhigh, max, ultra
```

未設定（デフォルト）の場合、推論の深さは "medium" になります。たいていの仕事にちょうどよい、釣り合いの取れた段階です。値を設定するとそれが優先されます。深くするほど複雑な仕事での結果は良くなりますが、トークンと待ち時間が増えます。

:::note OpenRouter 経由の適応型思考モデル（Claude 4.6 以降、Fable / Mythos 系）
これらのモデルは*適応型*の思考を使い、通常の `reasoning.effort` の項目を
受け付けません。OpenRouter はこれらのモデルに対してその項目を無視します。Hermes は
あなたが指定した `reasoning_effort` を、代わりに OpenRouter の `verbosity`
パラメーター（Anthropic の `output_config.effort` に対応します）へ黙って回すので、
選んだモデルが対応する段階の範囲で、同じつまみがそのまま働きます。`none`（または未設定）の
場合は、モデル自身の適応型のデフォルトに任せます。
ネイティブの Anthropic のプロバイダーは、もともと深さを直接制御しているので影響を受けません。
:::

:::note OpenRouter のモデルと対応する深さの段階
OpenRouter 経由のほかのモデルについて、Hermes は最新のモデルの一覧にある
推論のメタデータ（`supported_parameters` と、モデルごとの
`reasoning.supported_efforts`）を読み、推論の指定をそもそも送るかどうかを決め、
指定された深さを、その経路が実際に対応する最も近い段階へ丸めます（常に下方向です。
たとえば `high` までしかない経路では `ultra` は `high` になります。黙って上げることは
ありません）。推論に対応した新しいベンダーは、Hermes の更新を待たずに自動で使えます。
一覧に届かないときや、モデルが載っていないときは、Hermes は
組み込みのモデル系統のリストに頼り、
指定された深さをそのまま渡します。
:::

推論の深さは、`/reasoning` コマンドで実行中にも変えられます。

```
/reasoning                # Show current effort level and display state
/reasoning high           # Set reasoning effort to high (this session only)
/reasoning high --global  # Set effort and persist to config.yaml
/reasoning none           # Disable reasoning (this session only)
/reasoning show           # Show model thinking above each response
/reasoning hide           # Hide model thinking
```

深さの変更はデフォルトではそのセッションだけに効きます。`--global` を付けると、
新しい段階が `agent.reasoning_effort` のデフォルトとして保存されます。

#### モデルごとの推論の上書き {#per-model-reasoning-overrides}

モデルごとに違う推論の深さを設定できます。複雑なモデルには深い推論を、速いモデルには中くらいを、といった使い分けに便利です。

```yaml
agent:
  reasoning_effort: "medium"       # global default
  reasoning_overrides:
    "openrouter/anthropic/claude-opus-4.5": "xhigh"
    "openai/gpt-5": "low"
    "claude-sonnet-4.6": "high"    # bare model name also works
```

キーの照合は**表記の揺れに寛容**で、常識的な書き方ならどれでも一致します。
- `claude-opus-4.5`、`claude-opus-4-5`、`claude-opus.4.5`（ドットとハイフンは互換です）
- `anthropic/claude-opus-4.5`、`openrouter/anthropic/claude-opus-4.5`（プロバイダーの接頭辞は任意です）
- 完全に一致するものが、揺れたものより優先されます

:::note
`reasoning_overrides` のキーは `hermes config set` では設定できません。YAML のファイルを直接編集してください。モデル名にはドットが含まれることが多く（`claude-opus-4.5` など）、CLI のドット区切りのキーの書き方とぶつかるためです。
:::

**解決の優先順位:**

1. セッション単位の `/reasoning --session` による上書き（ゲートウェイのみ）
2. `agent.reasoning_overrides` によるモデルごとの上書き（表記の揺れに寛容）
3. 全体の `agent.reasoning_effort`
4. プロバイダーのデフォルト

この上書きはどこでも自動的に効きます。CLI の起動時、メッセージ用のゲートウェイ、デスクトップと TUI、cron のジョブ、セッションの途中での `/model` による切り替え、フォールバックのモデルの発動時です。

## ツールを使わせる仕組み {#tool-use-enforcement}

モデルによっては、ツールを呼ぶ代わりに、やろうとしていることを文章で書いてしまうことがあります（実際にターミナルを呼ぶ代わりに「テストを実行します……」と書く、といった具合です）。この仕組みは、実際にツールを呼ぶようモデルを引き戻す案内をシステムプロンプトに差し込みます。

```yaml
agent:
  tool_use_enforcement: "auto"   # "auto" | true | false | ["model-substring", ...]
```

| 値 | 動作 |
|-------|----------|
| `"auto"`（デフォルト） | 次に一致するモデルで有効になります: `gpt`、`codex`、`gemini`、`gemma`、`grok`、`glm`、`qwen`、`deepseek`。それ以外（Claude など）では無効です。 |
| `true` | モデルに関係なく常に有効です。いま使っているモデルが、動くのではなく動きを説明しているように感じるときに役立ちます。 |
| `false` | モデルに関係なく常に無効です。 |
| `["gpt", "codex", "qwen", "llama"]` | モデル名に、並べた文字列のどれかが含まれるときだけ有効になります（大文字小文字は区別しません）。 |

### 何が差し込まれるか {#what-it-injects}

有効なとき、2 つの層の案内がシステムプロンプトに足されることがあります。

1. **一般的なツール使用の徹底**（一致したすべてのモデル）— 意図を説明する代わりにすぐツールを呼ぶこと、仕事が終わるまで手を動かし続けること、これからやると約束してやり取りを終えないことを、モデルに指示します。

2. **Google 向けの運用の案内**（Gemini と Gemma のモデルのみ）— 簡潔さ、絶対パス、ツールの並列呼び出し、編集前に確かめる型についての案内です。

これらはユーザーからは見えず、システムプロンプトにだけ影響します。Claude のように、もともとツールを確実に使うモデルにはこの案内は要りません。だから `"auto"` はそれらを除いています。

### 有効にすべきとき {#when-to-turn-it-on}

デフォルトの自動判別のリストにないモデルを使っていて、実際にやる代わりに*やるつもりのこと*をしばしば書いてしまうと感じたら、`tool_use_enforcement: true` にするか、そのモデルの文字列をリストに足してください。

```yaml
agent:
  tool_use_enforcement: ["gpt", "codex", "gemini", "grok", "my-custom-model"]
```

## 実行の規律の案内 {#execution-discipline-guidance}

ツールを使わせる仕組みとは別に、Hermes は評価の記録から観察された、いくつかの共通のつまずき方を持つモデル系統に対して、**実行の規律**のブロックを差し込みます。つまずき方とは、計算をコードではなく文章で行う、外部へ書き込んだあとの読み戻しによる確認を飛ばす、形式の崩れた識別子を「直して」しまう、件数が合っていないのに揃っていると言い張る、受け入れ条件をすべて確かめないまま「完了」と宣言する、といったものです。

```yaml
agent:
  execution_guidance: "auto"   # "auto" | true | false | ["model-substring", ...]
```

| 値 | 動作 |
|-------|----------|
| `"auto"`（デフォルト） | 次に一致するモデルで有効になります: `gpt`、`codex`、`grok`、`deepseek`、`kimi`、`qwen`、`glm`、`minimax`、`mimo`、`mistral`。 |
| `true` | モデルに関係なく常に有効です。 |
| `false` | モデルに関係なく常に無効です。 |
| `["deepseek", "my-custom-model"]` | モデル名に、並べた文字列のどれかが含まれるときだけ有効になります（大文字小文字は区別しません）。 |

差し込まれるブロックは、次のことを扱います。

- **ツールを使い続けること** — 仕事が終わり、*かつ*確かめ終わるまでツールを呼び続けること。検索の結果が空、部分的、あるいは妙に狭いときは、結論を出す前に、もっと広いか別の問い方で試し直すこと。
- **ツールを必ず使うこと** — 計算、ハッシュ、日付、システムの状態、ファイルに関する事実は、頭の中の計算ではなく必ずツールから得ること。
- **外部への書き込みの読み戻し** — 外部のシステムの状態を変える書き込みのあとは、成功したと言う前に対象そのものを読み戻すこと（ツールがすでに確認した内部のファイルの編集は、もう一度確かめません）。
- **件数の照合** — 申告された合計（`total`、`reply_count`、`has_more`）は動かせない主張として扱うこと。食い違ったら、取り直すかプログラムで解析し直すこと。
- **文字どおり残すこと** — 決められた形式に合わない識別子を、正規化したり「直したり」しないこと。検索が成功したからといって、崩れた元の文字列が正しいことにはなりません。
- **確認を通した完了** — 「完了」とは、名前の挙がった受け入れ条件をすべて確かめたという意味であって、もっともらしい一部ではありません。

この切り替えは `tool_use_enforcement` とは独立しており、片方だけを有効にできます。案内はセッションの開始時にモデル名をもとに一度だけ選ばれるので、システムプロンプトは会話のあいだ 1 バイトも変わらず（プロンプトのキャッシュにも優しく）保たれます。Gemini と Gemma は、より具体的な Google 向けの運用の案内を受け取るので自動判別のリストから外れています。Claude は、これらのつまずき方を見せないので外れています。どのモデルでも、`true` か文字列のリストで対象に加えられます。

## ツールのループの歯止め {#tool-loop-guardrails}

Hermes は、エージェントが実りのないツール呼び出しのループにはまったことを検出します。同じ呼び出しが繰り返し失敗する、同じツールが何度も失敗する、同じ結果しか返さない冪等な呼び出しが前進なしに続く、といった状況です。デフォルトでは、モデルが自分で立て直せるようにツールの結果へ**警告**を差し込むだけで、強制的には止めません。CLI や TUI を見ている人が割って入れるからです。

誰も見ていないゲートウェイやサーバーでの運用では、はまったエージェントが繰り返しの持ち分を食い潰す代わりに遮断されるよう、強制停止を有効にしてください。

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

`hard_stop_enabled` のデフォルトが `false` なのは、対話的なセッションには人が付いているからです。誰も見ていない運用（ゲートウェイ、cron、かんばんの作業役）では `true` にして、繰り返す失敗を警告だけで済ませずに止めてください。[Docker / 無人での運用](/hermes/docs/user-guide/docker/) も参照してください。

### やり取りごとの暴走の上限 {#per-turn-runaway-loop-caps}

上の失敗を基準にした閾値とは別に、`loop_caps` は、1 回のエージェントのループ（やり取り）で許す `web_search` の呼び出しとサブエージェントの起動の数に、厳しい上限を設けます。カウンターはやり取りのたびにリセットされるので、正当な長いセッションが痩せることはありません。ただし、際限のない検索や委任のループへ落ち込んだ 1 回のやり取りは止まります。これは常に有効で、`hard_stop_enabled` に関係なく働きます。1 回のやり取りで何十回も Web を検索したり、何十ものサブエージェントを立てたりするのはすでに異常なので、デフォルトは低めです。上限に達すると、問題の呼び出しは説明付きで止められ、残りの持ち分を燃やす代わりにやり取りがきれいに終わります。どちらの値も `0` にすれば、その上限を完全に無効にできます。

1 回の `delegate_task` のまとめ実行では、タスクの 1 つ 1 つが `max_subagents` に数えられます（3 件のまとめなら 3 消費します）。つまりこの上限は、`delegate_task` を呼んだ回数ではなく、実際に立ったサブエージェントの数を追いかけます。

これは Claude Code のセッションごとの WebSearch とサブエージェントの上限（v2.1.212）と同じ考え方です。あちらもデフォルトは 200 で、`/clear` でリセットされます。

### 実行中の停滞を防ぐ守り {#runtime-anti-stall-guards}

上の失敗を基準にした歯止めを補うものとして、`agent.stall_guards`（デフォルト `true`）は、無駄なやり取りを防ぐ 2 つの控えめな守りを有効にします。1 つ目は**同一の呼び出しのループを断つ守り**です。同じツールが同じ引数で 3 回以上続けて呼ばれ、*かつ*まったく同じ結果を返したとき、その結果の末尾に短い 1 行の注意が足され、同じ呼び出しを繰り返さないようモデルに伝えます。呼び出しそのものを止めることはなく、正当に繰り返す性質の状態確認（`process`、`*_get_result`、`*_poll`）は対象外です。2 つ目は**続けようとする意図の回収**です。モデルがツールを呼ばずにやり取りを終えたのに、短い返答が「では、ファイルを更新します……」のように動きを予告して途切れている場合、Hermes は、意図の取りこぼしの回収に使うのと同じ、回数の限られた継続の仕組みで動くよう促し直します（1 回のやり取りにつき最大 2 回）。どちらもキャッシュを壊しません（注意は結果を組み立てるときに足され、あとから遡って書き換えることはありません）。まとめて無効にできます。

```yaml
agent:
  stall_guards: false
```

同じ切り替えは、**結果の参照による置き換え**も有効にします。同じツールの呼び出しをやり直して、1 バイトも違わない新しい結果が返ってきたとき、重複する内容は全文をもう一度載せる代わりに、先の結果を指す短い参照（ツール名、`tool_call_id`、引数の要約、そして最初の結果がディスクに保存されていればそのあふれ先のパス）としてコンテキストに入ります。ツールは毎回きちんと実行されるので、状態確認の意味は保たれます。結果が変わっていれば、いつでも丸ごと流れてきます。512 文字未満の結果、エラーの結果、マルチモーダルの結果が置き換えられることはありません。一方、状態確認は置き換えの対象*です*（変化のない確認こそ、重複する内容が何の情報も持たない場面だからです）。

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

これは `text_to_speech` のツールと、音声モード（CLI やメッセージ用のゲートウェイでの `/voice tts`）での読み上げの両方を制御します。

**速度の優先順位:** プロバイダーごとの速度（`tts.edge.speed` など）→ 全体の `tts.speed` → デフォルトの `1.0`。全体の `tts.speed` を設定すると、すべてのプロバイダーに同じ速度が効きます。細かく調整したい場合は、プロバイダーごとに上書きしてください。

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

### やり取りごとの要約と、スピナーに流れるトークン数 {#per-turn-summary-and-spinner-token-flow}

`display.turn_summary`（デフォルト `true`）は、**対話的な CLI** のやり取りのあとに、そのやり取りが実際に何をしたかをまとめた薄い色の 1 行を表示します。

```
⋯ 12.4s · edited 2 files +18 -3 · read 4 files · ran 3 commands
```

集計は、CLI がもともと受け取っているツールの進捗の流れから読み取っているので、追加の費用はかかりません。細かい点は次のとおりです。

- 経過時間はそのやり取りの実際の長さです（1 分を超えると `2m05s` のようになります）。
- ツールの呼び出しは動詞（`edited`、`read`、`ran`、`searched` など）ごとにまとめられ、単数と複数も正しく書き分けられます。決まった動詞のないプラグインや MCP のツールは `called N tools` にまとまります。
- `+X -Y` の行数の増減は、ツールの結果がもともと差分を報告している場合（今のところ `patch`）にだけ出ます。Hermes がこれを計算するために git を呼ぶことはないので、`write_file` による編集は増減なしで数えられます。
- **失敗したツールの呼び出しは数えません。** 拒否された書き込みが、成功した編集として表示されることはありません（対になる警告は [ファイルの変更の検証](#file-mutation-verifier) を参照してください）。
- 長いやり取りでは動詞の区切りは 4 つまでで、あとは `+N more` と付くので、行が折り返すことはありません。
- ツールを 1 つも呼ばなかった短いやり取りでは、何も表示されません。

`display.spinner_token_flow`（デフォルト `true`）は、CLI のスピナーの経過時間の表示に、そのやり取りで積み上がった出力のトークン数を足します。

```
  ⚡ Reading cli.py  (  2.3s · ↓ 1.2k tok)
```

数はやり取りごとで（セッションの合計はやり取りの開始時点を基準に引き直されます）、そのやり取りの中の API 呼び出しが使用量を報告するたびに更新されます。最初の使用量の報告が届くまでは何も表示されないので、`↓ 0 tok` のような紛らわしい表示は出ません。

どちらのキーも表示だけの、CLI だけの設定です。静かなモード、`display.tool_progress` が `off` のとき、単発の問い合わせや `-Q` のまとめ実行、ゲートウェイやメッセージの画面では抑えられます（そちらは代わりに `display.runtime_footer` を使います）。どちらも `false` にすれば止められます。

### ファイルの変更の検証 {#file-mutation-verifier}

`display.file_mutation_verifier` が `true`（デフォルト）のとき、そのやり取りで `write_file` や `patch` の呼び出しが失敗し、同じパスへの書き込みが後から成功していない場合、Hermes はアシスタントの最終的な返答に注意の 1 行を足します。これによって、「並列のパッチをまとめて出し、半分が黙って失敗し、モデルは成功したと要約する」といった言いすぎを、編集のたびに手で `git status` を叩かなくても捕まえられます。

添えられる文の例です。

```
⚠️ File-mutation verifier: 3 file(s) were NOT modified this turn despite any wording above that may suggest otherwise. Run `git status` or `read_file` to confirm.
  • concepts/automatic-organization.md — [patch] Could not find match for old_string
  • concepts/lora.md — [patch] Could not find match for old_string
  • concepts/rag-pipeline.md — [patch] Could not find match for old_string
```

この行を出さないようにするには、`file_mutation_verifier: false`（または `HERMES_FILE_MUTATION_VERIFIER=0`）にします。この検証は、やり取りの終わりに本当の失敗が残っているときにだけ働きます。失敗したパッチを同じやり取りの中でやり直して成功した場合、そのファイルについては何も出ません。

**モデルの要約より、この検証を信じてください。** この行が出たということは、アシスタントの締めくくりが「終わりました」と言っていても、挙がっているファイルはディスク上で**変わっていない**ということです。よくある原因は次のとおりです。

- **書き込みの拒否** — パスが認証情報の禁止リストにあるか、`HERMES_WRITE_SAFE_ROOT` の外にある（[ファイル書き込みの安全装置](/hermes/docs/user-guide/security/#file-write-safety) を参照）
- **パッチの不一致** — `old_string` がディスク上のファイルと一致しなかった
- **構文の関門** — 書き込みの前に、内容が JSON / YAML / TOML の検証に落ちた

書き込みが止められたときの例です。

```
⚠️ File-mutation verifier: 2 file(s) were NOT modified this turn despite any wording above that may suggest otherwise. Run `git status` or `read_file` to confirm.
  • ~/.hermes/cron/jobs.json — [patch] Write denied: '…' is outside HERMES_WRITE_SAFE_ROOT (/path/to/project)
  • ~/.hermes/scripts/monitor.py — [write_file] Write denied: '…' is outside HERMES_WRITE_SAFE_ROOT (/path/to/project)
```

Hermes の状態（cron のジョブ、スキル、`~/.hermes/` の下のスクリプト）への書き込みが失敗しているなら、環境に `HERMES_WRITE_SAFE_ROOT` が設定されていないか確かめてください。cron の変更には、`jobs.json` に直接パッチを当てるのではなく、`cronjob` ツールか `hermes cron edit` を使ってください。

### 定型のメッセージの表示言語 {#ui-language-for-static-messages}

`display.language` の設定は、ユーザーに見える定型のメッセージのうち、ごく一部を翻訳します。CLI の承認のプロンプトと、いくつかのゲートウェイのスラッシュコマンドの返答（再起動の待機の知らせ、「approval expired」、「goal cleared」など）です。エージェントの返答、ログの行、ツールの出力、エラーのトレースバック、スラッシュコマンドの説明は翻訳され**ません**。それらは英語のままです。エージェント自身に別の言語で返してほしい場合は、プロンプトやシステムメッセージでそう伝えるだけで済みます。

指定できる値は、`en`（デフォルト）、`zh`（簡体字中国語）、`zh-hant`（繁体字中国語）、`ja`（日本語）、`de`（ドイツ語）、`es`（スペイン語）、`fr`（フランス語）、`tr`（トルコ語）、`uk`（ウクライナ語）、`af`（アフリカーンス語）、`ko`（韓国語）、`it`（イタリア語）、`ga`（アイルランド語）、`pt`（ポルトガル語）、`ru`（ロシア語）、`hu`（ハンガリー語）です。知らない値は英語に戻ります。

`HERMES_LANGUAGE` の環境変数でセッションごとに指定することもでき、こちらが設定ファイルの値より優先されます。

```yaml
display:
  language: zh   # CLI approval prompts appear in Chinese
```

| モード | 見えるもの |
|------|-------------|
| `off` | 何も出ません。最終的な返答だけです |
| `new` | ツールが切り替わったときだけ、ツールの表示が出ます |
| `all` | すべてのツールの呼び出しと短いプレビューが出ます（デフォルト） |
| `verbose` | 引数と結果の全体、デバッグのログまで出ます |

CLI では、`/verbose` でこれらのモードを順に切り替えられます。メッセージ用のプラットフォーム（Telegram、Discord、Slack など）で `/verbose` を使うには、上の `display` の節で `tool_progress_command: true` にしてください。すると、このコマンドがモードを切り替えて設定に保存します。

ツールの進捗の表示には、進捗の更新を安全に見せられるゲートウェイのアダプターが必要です。メッセージの編集に対応していないプラットフォーム（Signal を含みます）では、`/verbose` で `off` 以外のモードを保存しても、進捗の吹き出しは出ません。

### フォーカス表示（`/focus`、CLI と TUI） {#focus-view-focus-cli-tui}

`display.focus_view: true` は**フォーカス表示**を有効にします。実況ではなく答えだけが欲しいときのための、出力を絞った表示モードです。別の抑制の経路ではなく、同じ `tool_progress` の仕組みの上に薄くかぶせたものです。

- 有効にすると `tool_progress` は `off` に固定され、それまでのモードは `display.focus_saved_tool_progress` に控えられます
- `/focus off` はそのモードをそのまま戻すので、`/verbose verbose` の設定は往復しても失われません
- やり取りが終わるたびに、薄い色の復帰の案内が出ます — `⋯ 7 tool lines hidden · /focus off to show` — 数え方は*フォーカスに入る前*のモードを基準にするので、もともと切っていた行まで隠したと言うことはありません
- ステータスバーには `◉ focus` の印が出続けるので（prompt_toolkit の CLI でも Ink の TUI でも）、絞られたモードが見えなくなることはありません
- フォーカス中に `/verbose` で切り替えると、モードの主導権が `/verbose` に戻り、印は消えます

フォーカス表示は**画面上だけのもの**です。会話の履歴、システムプロンプト、ツールの定義、リクエストの中身に手を入れることはありません。隠された詳細は画面で抑えられるだけで、捨てられてはいませんし、プロンプトのキャッシュにもまったく影響しません。

### 実行時の情報の添え書き（ゲートウェイのみ） {#runtime-metadata-footer-gateway-only}

`display.runtime_footer.enabled: true` にすると、Hermes はゲートウェイのやり取りの**最後の**メッセージに、実行時の情報を小さく添えます。今のところ、モデル、コンテキストウィンドウの使用率、現在の作業ディレクトリを出せます。デフォルトでは無効です。すべての返答に出どころを添えたいチームは、ゲートウェイごとに有効にしてください。

```yaml
display:
  runtime_footer:
    enabled: true
    fields: ["model", "context_pct", "cwd"]   # order shown; drop any to hide
```

指定できる項目です。

| 項目 | 表示されるもの | 例 |
| --- | --- | --- |
| `model` | ベンダーの接頭辞を落とした、モデル ID だけ | `gpt-5.4` |
| `context_pct` | 直近の呼び出しでのコンテキストの占有率 | `5%` |
| `latency` | そのやり取りの実際の所要時間 | `22s`、`1m05s` |
| `cwd` | ホームからの相対で表した作業ディレクトリ | `~` |

デフォルトの項目は `["model", "context_pct", "cwd"]` です。`latency` は任意で、使うには `fields` に足します。データが得られない項目は、空欄を出す代わりに黙って飛ばされます。

`/footer` のスラッシュコマンドで、どのセッションでも実行中に切り替えられます。

Telegram / Discord / Slack への返答に添えられる例です。

```
— claude-opus-4.7 · 12 tool calls · 2m 14s · $0.042
```

添えられるのはやり取りの**最後の**メッセージだけで、途中の更新はそのままです。

### プラットフォームごとの進捗の上書き {#per-platform-progress-overrides}

プラットフォームごとに、ちょうどよい詳しさは違います。`display.platforms` でプラットフォームごとのモードを設定できます。

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

上書きのないプラットフォームは、全体の `tool_progress` の値に従います。指定できるプラットフォームのキーは、`telegram`、`discord`、`slack`、`signal`、`whatsapp`、`matrix`、`mattermost`、`email`、`sms`、`homeassistant`、`dingtalk`、`feishu`、`wecom`、`weixin`、`bluebubbles`、`qqbot` です。従来の `display.tool_progress_overrides` のキーも、後方互換のためにまだ読み込まれますが、非推奨で、最初の読み込みのときに `display.platforms` へ移されます。

Signal が有効なキーとして挙がっているのは、プラットフォームごとに設定を保存できるからですが、今の Signal のアダプターは送ったメッセージを編集できず、進捗の吹き出しを描けません。Signal の `tool_progress` は `off` のままにしてください。ツールの呼び出しを 1 つずつその場で見たいなら、CLI か、編集のできるメッセージのプラットフォームを使ってください。

`interim_assistant_messages` はゲートウェイだけの設定です。有効にすると、Hermes はやり取りの途中でまとまったアシスタントの更新を、別のチャットのメッセージとして送ります。これは `tool_progress` とは独立していて、ゲートウェイのストリーミングも必要ありません。

`show_commentary`（デフォルト `true`）は、Codex Responses のモデルの解説のチャンネル、つまりこれらのモデルが内部の推論とは別に生み出す、整えられた進行の語りを制御します。有効にすると、まとまった解説のメッセージが、やり取りの途中の見える更新として届きます（ゲートウェイでは `interim_assistant_messages` も必要です）。この語りが煩わしければ `false` にしてください。すると解説は推論のチャンネルに回り、`show_reasoning` が有効なときにだけ表示されます。

## プライバシー {#privacy}

```yaml
privacy:
  redact_pii: false  # Strip PII from LLM context (gateway only)
```

`redact_pii` を `true` にすると、対応しているプラットフォームでは、ゲートウェイが LLM へ送る前にシステムプロンプトから個人を特定できる情報を伏せます。

| 項目 | 扱い |
|-------|-----------|
| 電話番号（WhatsApp / Signal でのユーザー ID） | `user_<12-char-sha256>` にハッシュ化 |
| ユーザー ID | `user_<12-char-sha256>` にハッシュ化 |
| チャット ID | 数字の部分をハッシュ化し、プラットフォームの接頭辞は残す（`telegram:<hash>`） |
| ホームチャンネルの ID | 数字の部分をハッシュ化 |
| ユーザー名・表示名 | **影響を受けません**（本人が選んだもので、公開されています） |

**対応プラットフォーム:** 伏せ字は WhatsApp、Signal、Telegram に適用されます。Discord と Slack は対象外です。メンションの仕組み（`<@user_id>`）が LLM のコンテキストに本物の ID を必要とするからです。

ハッシュは決まった値になるので、同じユーザーは常に同じハッシュになり、グループチャットでもモデルはユーザーを区別できます。経路の振り分けと配信には、内部で元の値が使われます。

## 音声の文字起こし（STT） {#speech-to-text-stt}

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

言語の決まり方は、**どの** STT のプロバイダー（local、groq、openai、mistral、xai、elevenlabs、deepinfra、コマンド型のプロバイダー、プラグイン）でも同じです。`stt.<provider>.language` → `stt.language` → `HERMES_LOCAL_STT_LANGUAGE` の環境変数 → プロバイダーによる自動判別、の順です。**デフォルトは `stt.language: "en"`** です。Whisper の自動判別は、短い音声や訛りのある音声をしばしば取り違え、それが「音声メモが違う言語で文字起こしされる」という形で現れます。英語以外を話す人は、`stt.language` に自分の言語コードを一度設定してください（`"es"`、`"zh"`、`"uk"` など）。多言語で使うために自動判別へ戻したいときは `""` にします。

ゲートウェイに音声メモをエージェント向けに文字起こしさせつつ、生の文字起こしをチャットへ投稿させたくない場合（たとえば顧客向けの WhatsApp のボット）は、`stt.echo_transcripts: false` にしてください。

プロバイダーごとの動作です。

- `local` は、手元のマシンで動く `faster-whisper` を使います。`pip install faster-whisper` で別途インストールしてください。無音から幻の言葉が生まれるのを防ぐ仕組みは、デフォルトで有効です。Silero の VAD フィルターが無音や雑音を Whisper へ届かないようにし、窓をまたいだ条件付けを無効にし、モデル自身が「たぶん音声ではない」と判断し*かつ*確信度の低い区間を捨てます。音声以外（音楽や環境音）を素の動作で文字起こししたい場合は `stt.local.vad: false` にしてください。モデルは音声メッセージのあいだメモリに載ったままで、待ち時間の短い文字起こしができます。`stt.local.unload_after_idle_seconds`（たとえば 5 分なら `300`）を設定すると、使われていないときに自動でモデルを解放します。CUDA のホストでは GPU のメモリが空くので（ローカルの LLM が同じ GPU を使っている場合の大きな利点です）、CPU ではプロセスがそのメモリを再利用できるようになりますが、OS から見える使用量は、プロセスが別の用途でその領域を必要とするまで縮まないことがあります。次の音声メッセージが来ると、モデルは何ごともなく読み込み直されます。
- `groq` は Groq の Whisper 互換のエンドポイントを使い、`GROQ_API_KEY` を読みます。`stt.groq.language`（またはグローバルな `HERMES_LOCAL_STT_LANGUAGE` の環境変数）を渡すと、自動判別を飛ばして待ち時間を減らせます。
- `openai` は OpenAI の音声 API を使い、`VOICE_TOOLS_OPENAI_KEY` を読みます。

クラウドのプロバイダー（groq、openai、mistral、xai、elevenlabs、deepinfra）では、`ffmpeg` が入っていればデフォルトで**アップロード前の無音の切り詰め**が働きます。音声メモの長い間は、ファイルを送る前に手元でまとめられ、それぞれの間から `cloud_trim_keep_ms` の分だけ残るので、自然な間合いは保たれます。音声が短くなれば、アップロードは速くなり、音声の分単位の課金は安くなり、遠くのモデルが無音から幻の言葉を作る回数も減ります。12 秒未満の音声は切り詰めをまるごと飛ばします（そこでは節約の意味がありませんし、いくつかのプロバイダーはどのみちリクエストごとの最低額を課金します）。この切り詰めは最善を尽くすだけのもので、ffmpeg がない、切り詰めに失敗した、音声がほとんど無音だった、切り詰めても 10% ほどしか減らない、といった場合は元のファイルがそのまま送られます。常に元のファイルを送りたいときは `stt.cloud_trim_silence: false` にしてください（クラウドのプロバイダーで音楽や環境音を文字起こしする場合など）。コマンド型のプロバイダーとプラグインのプロバイダーには、切り詰めた音声が渡ることはありません。

`stt.provider` を明示した場合、それは厳密に守られます。使えない場合は、プロバイダーを勝手に切り替えるのではなく、`hermes tools` を実行するよう案内するエラーになります。一度もプロバイダーを選んでいない場合にだけ、Hermes は `local` → `groq` → `openai` の順で自動判別します。

Groq と OpenAI のモデルの上書きは、環境変数で行います。

```bash
STT_GROQ_MODEL=whisper-large-v3-turbo
STT_OPENAI_MODEL=whisper-1
GROQ_BASE_URL=https://api.groq.com/openai/v1
STT_OPENAI_BASE_URL=https://api.openai.com/v1
```

### 文字起こしのプロンプト（語彙のヒント） {#transcription-prompt-vocabulary-hints}

`stt.prompt` は、プロンプトを受け付ける STT のバックエンドへ渡す、任意の固定のヒントです。Whisper 系のモデルが聞き違えやすい固有名詞、製品名、専門用語に使ってください。

```yaml
stt:
  provider: "local"
  prompt: "Hermes, Teknium, Nous Research, kanban, Ollama"
```

**組み立て方。** 設定した値が土台になります。[`pre_transcription`](https://hermes-agent.nousresearch.com/user-guide/features/hooks#pre_transcription) のフックを登録したプラグインは、その上に手を加えます。同じ項目については、最後に書いたものが残ります。複数のプラグインのヒントは決まった順で組み合わされます。プラグインの読み込みはプラグイン ID の順に行われ、各プラグインのコールバックはそのプラグイン内での登録順に走るので、同じプラグインの組み合わせなら、いつでも同じ最終的なプロンプトになります。フックが `prompt` に空の文字列を返すと、そのリクエストでは設定のプロンプトが消えます。フックは `language` と `model` も上書きできます。`file_path` は読み取り専用で、変えようとするとログに記録されて捨てられます。フックを登録せず `stt.prompt` も設定していなければ、送られるリクエストは以前のリリースとまったく同じです。

**プロバイダーの対応状況。**

| プロバイダー | プロンプトのパラメーター | 動作 |
|----------|-----------------|----------|
| `local`（faster-whisper） | `initial_prompt` | そのままローカルのモデルへ渡されます |
| `openai` | `prompt` | 文字起こしのリクエストにそのまま入ります |
| `groq` | `prompt` | 文字起こしのリクエストにそのまま入ります |
| `mistral` | `prompt` | 文字起こしのリクエストにそのまま入ります |
| `deepinfra` | `prompt` | OpenAI 互換の経路で、そのまま渡されます |
| `xai` | 非対応 | DEBUG のログに残り、プロンプトなしでリクエストが進みます |
| `elevenlabs` | 非対応 | DEBUG のログに残り、プロンプトなしでリクエストが進みます |
| `local_command` | 非対応 | DEBUG のログに残り、プロンプトなしでリクエストが進みます |
| `type: command` を指定した `stt.providers.<name>` | 非対応 | DEBUG のログに残り、プロンプトなしでリクエストが進みます |
| プラグインが登録したプロバイダー | `transcribe(**extra)` の引数の `prompt` | プロンプトが設定されているときだけ送られるので、このキーより前からあるプロバイダーの呼び出しは変わりません |

**長さ。** Whisper 系のモデルは、プロンプトの最後の 224 トークンほどしか手がかりにしません。Whisper 系のバックエンド（`local`、`openai`、`groq`、`deepinfra`）では、Hermes がこの上限を手元で守ります。長すぎる最終的なプロンプトは末尾だけに切り詰められ、警告がログに残ります。プロンプトの長さでリクエストがエラーになることはありません。ほかのバックエンド（`mistral`、プラグインのプロバイダー）にはそのまま渡され、検証はそちらに任されます。いずれにしても、ヒントは短く具体的に保ってください。

:::warning プロンプトは音声と一緒にアップロードされます
最終的なプロンプトは、音声ファイルとあわせて、設定した STT のプロバイダーへ送られます。秘密情報やセッションから得た文脈を、`stt.prompt` にも、`pre_transcription` のフックが返すものにも入れないでください。ローカルの `faster-whisper` ではなく、外部の API を使っている場合はとくに気をつけてください。
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

CLI で `/voice on` と入力するとマイクのモードが有効になり、`record_key` で録音を開始・停止でき、`/voice tts` で読み上げの返答を切り替えられます。最初から最後までの手順とプラットフォームごとの動作は、[Voice Mode](https://hermes-agent.nousresearch.com/user-guide/features/voice-mode) を参照してください。

## ストリーミング {#streaming}

返答が出そろうのを待たずに、届いたトークンからターミナルやメッセージのプラットフォームへ流します。

### CLI のストリーミング {#cli-streaming}

```yaml
display:
  streaming: true         # Stream tokens to terminal in real-time
  show_reasoning: true    # Also stream reasoning/thinking tokens (optional)
```

有効にすると、返答は専用の枠の中に 1 トークンずつ現れます。ツールの呼び出しは、これまでどおり静かに記録されます。プロバイダーがストリーミングに対応していない場合は、自動的に通常の表示に戻ります。

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

有効にすると、ボットは最初のトークンが出た時点でメッセージを送り、トークンが届くたびにそれを少しずつ編集していきます。メッセージの編集に対応していないプラットフォーム（Signal、メール、Home Assistant）は最初の試みで自動的に見分けられ、そのセッションではメッセージがあふれることなく、ストリーミングが穏やかに無効になります。

トークン単位の編集をせずに、やり取りの途中の自然なアシスタントの更新を別のメッセージとして送りたい場合は、`display.interim_assistant_messages: true` にしてください。

**あふれたときの扱い:** 流れる文章がプラットフォームのメッセージの長さの上限（4096 文字ほど）を超えると、今のメッセージはそこで確定し、自動的に新しいメッセージが始まります。

**新しいメッセージで締める（Telegram）:** Telegram の `editMessageText` は元のメッセージの時刻を保つので、長く流れ続けた返答は、完了後も最初のトークンの時刻のままになってしまいます。`fresh_final_after_seconds > 0` にすると、古くなった下書きを新しいメッセージとして届け、下書きのほうはできる範囲で削除します。デフォルトは `0` で、常にその場で確定させ、両方の操作が見えるクライアントで一瞬だけ「重複して消える」ような動きになるのを避けます。

:::note プラットフォームごとのストリーミングの初期値
大もとの `streaming.enabled` のスイッチは、デフォルトで `false` です。これを入れるまでは何も流れません。有効にしたあとは、ストリーミングは**プラットフォームごとに**決まります。Telegram は `display.platforms.telegram.streaming: true`（流す）、Discord は `display.platforms.discord.streaming: false`（流さない）で出荷されます。つまり、ストリーミングを有効にすると Telegram はそのまま流れ始め、Discord は切り替えるまでメッセージ全体での返答のままです。これらのプラットフォームごとのスイッチは、ダッシュボードの **Channels** の切り替えからでも、`~/.hermes/config.yaml` を直接編集してでも変えられます。
:::

## グループチャットでのセッションの分離 {#group-chat-session-isolation}

CLI、TUI やダッシュボード、メッセージ用のゲートウェイをまたいで、同時に
動かせるチャットのセッションの数を制限します。

```yaml
max_concurrent_sessions: null  # null/0 = unlimited; positive integer = active session cap
```

枠が埋まるのは、チャットの画面を開いたときではなく、セッションが**最初のやり取り**を
実行したときです。チャットを開いたり、再開したり、つなぎ直したりするだけでは、
メッセージを送るまで何も消費しません。ですから、開いたままのデスクトップのタブ（や、
不安定なウェブソケットが裏で引き起こす再開）が、同じ上限を分け合うゲートウェイを飢えさせることはありません。

上限に達すると、Hermes はどの画面が枠を握っているかを名指しした、はっきりした
知らせを返します。すでに動いているセッションの動作は変わりません。
`hermes status` を実行すると、今の枠の使用状況と、握っている相手がすべて見えます。

正式なキーは最上位の `max_concurrent_sessions` です。Hermes は
`gateway.max_concurrent_sessions` もフォールバックとして受け付けますが、両方が
設定されている場合は最上位のキーが優先されます。

この上限は、ローカルの実行時のリースファイルで守られており、最善を尽くす程度のものです。
一覧が読めなかったり、ロックできなかったりしたときは、ユーザーが立ち往生しないように
Hermes は通す側に倒れます。想定しているのは 1 台のホスト・1 つのプロファイルでの実行であって、
複数のマシンから共有マウントされた `$HERMES_HOME` ではありません。

共有のチャットで、会話を部屋ごとに 1 つにするか、参加者ごとに 1 つにするかを決められます。

```yaml
group_sessions_per_user: true  # true = per-user isolation in groups/channels, false = one shared session per chat
```

- `true` がデフォルトで、おすすめの設定です。Discord のチャンネル、Telegram のグループ、Slack のチャンネルなど共有の場では、プラットフォームがユーザー ID を提供していれば、送信者ごとに別のセッションになります。
- `false` は、部屋を共有する昔の動作に戻します。チャンネルを 1 つの共同作業の会話として扱わせたいときには役立ちますが、その分ユーザー同士が文脈も、トークンの費用も、割り込みの状態も共有することになります。
- ダイレクトメッセージは影響を受けません。Hermes はこれまでどおり、チャットや DM の ID で振り分けます。
- スレッドは、どちらの設定でも親のチャンネルから分かれたままです。`true` の場合は、スレッドの中でも参加者ごとに別のセッションになります。

動作の詳細と例は、[Sessions](https://hermes-agent.nousresearch.com/user-guide/sessions) と [Discord のガイド](https://hermes-agent.nousresearch.com/user-guide/messaging/discord) を参照してください。

## 許可のない DM への動作 {#unauthorized-dm-behavior}

知らないユーザーからダイレクトメッセージが届いたときの動きを決めます。

```yaml
unauthorized_dm_behavior: pair

whatsapp:
  unauthorized_dm_behavior: ignore
```

- `pair` は、チャット型の DM のプラットフォームでのデフォルトです。Hermes はアクセスを断ったうえで、DM で一度きりのペアリングのコードを返します。
- `ignore` は、許可のない DM を黙って捨てます。
- メールは、`platforms.email.unauthorized_dm_behavior: pair` を設定しない限り `ignore` がデフォルトです。受信箱には無関係な未読のメールが入っていることがあるからです。
- プラットフォームごとの設定は全体のデフォルトを上書きするので、広くはペアリングを有効にしたまま、あるプラットフォームだけ静かにする、といったことができます。

## クイックコマンド {#quick-commands}

LLM を呼ばずにシェルのコマンドを走らせる、あるいはあるスラッシュコマンドを別のものの別名にする、独自のコマンドを定義できます。exec のクイックコマンドはトークンを使わないので、メッセージのプラットフォーム（Telegram、Discord など）からサーバーの様子をさっと見たり、ちょっとしたスクリプトを走らせたりするのに便利です。

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

使い方は、CLI でも、どのメッセージのプラットフォームでも、`/status`、`/disk`、`/update`、`/gpu`、`/restart` と入力するだけです。`exec` のコマンドはホスト上でそのまま走り、出力を直接返します。LLM の呼び出しはなく、トークンも消費しません。`alias` のコマンドは、設定したスラッシュコマンドへ書き換えられます。

- **30 秒のタイムアウト** — 長く走るコマンドは、エラーメッセージとともに止められます
- **優先順位** — クイックコマンドはスキルのコマンドより先に照合されるので、スキルの名前を上書きできます
- **補完** — クイックコマンドは呼び出しの時点で解決されるため、組み込みのスラッシュコマンドの補完の一覧には出ません
- **種類** — 使えるのは `exec` と `alias` です。ほかの種類はエラーになります
- **どこでも使えます** — CLI、Telegram、Discord、Slack、WhatsApp、Signal、メール、Home Assistant

文字列だけのプロンプトの近道は、クイックコマンドとしては使えません。繰り返し使うプロンプトの流れは、スキルを作るか、既存のスラッシュコマンドの別名にしてください。

## 人間らしい間 {#human-delay}

メッセージのプラットフォームで、人間らしい返答の間合いを真似ます。

```yaml
human_delay:
  mode: "off"                  # off | natural | custom
  min_ms: 800                  # Minimum delay (custom mode)
  max_ms: 2500                 # Maximum delay (custom mode)
```

## コードの実行 {#code-execution}

`execute_code` ツールを設定します。

```yaml
code_execution:
  mode: project                # project (default) | strict
  timeout: 300                 # Max execution time in seconds
  max_tool_calls: 50           # Max tool calls within code execution
```

**`mode`** は、スクリプトの作業ディレクトリと Python の実行環境を決めます。

- **`project`**（デフォルト）— スクリプトはセッションの作業ディレクトリで、有効になっている仮想環境や conda 環境の python で走ります。プロジェクトの依存（`pandas`、`torch`、プロジェクトのパッケージ）や相対パス（`.env`、`./data.csv`）が自然に解決され、`terminal()` から見える世界と一致します。
- **`strict`** — スクリプトは一時的な作業ディレクトリで、`sys.executable`（Hermes 自身の python）で走ります。再現性は最大になりますが、プロジェクトの依存や相対パスは解決されません。

環境変数の掃除（`*_API_KEY`、`*_TOKEN`、`*_SECRET`、`*_PASSWORD`、`*_CREDENTIAL`、`*_PASSWD`、`*_AUTH` を取り除きます）とツールの許可リストは、どちらのモードでもまったく同じように働きます。モードを変えても、安全性の構えは変わりません。

## Web 検索のバックエンド {#web-search-backends}

`web_search` と `web_extract` のツールは、5 つのバックエンドのプロバイダーに対応しています。バックエンドは `config.yaml` か `hermes tools` で設定します。

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
| **Firecrawl**（デフォルト） | `FIRECRAWL_API_KEY` | ✔ | ✔ |
| **SearXNG** | `SEARXNG_URL` | ✔ | — |
| **Parallel** | `PARALLEL_API_KEY`（任意 — キーなしの無料枠あり） | ✔ | ✔ |
| **Tavily** | `TAVILY_API_KEY`（任意 — 選べばキーなしでも使えます） | ✔ | ✔ |
| **Exa** | `EXA_API_KEY`（任意 — キーなしの無料枠あり） | ✔ | ✔ |

**バックエンドの選ばれ方:** 実行時には、保存された `web.backend` の選択が常に使われます（`hermes tools` で設定します。`nous` は運用済みの Tool Gateway を経由します）。Web のバックエンドを一度も選んでいない場合にだけ、使える API キーから自動で判別されます。`SEARXNG_URL` だけが設定されていれば SearXNG、`EXA_API_KEY` だけなら Exa、`TAVILY_API_KEY` だけなら Tavily、`PARALLEL_API_KEY` だけなら Parallel、`KEENABLE_API_KEY` だけなら Keenable です。**選択も認証情報もまったくない**場合、リクエストはキーなしの無料枠の輪（Exa / Parallel / Tavily / Firecrawl / Keenable）を順に回り、レート制限に当たれば自動で次へ移ります。詳しくは [Web Search のガイド](https://hermes-agent.nousresearch.com/user-guide/features/web-search) を参照してください。いったん選択が保存されると、`.env` にキーを足しても経路は変わりません。`hermes tools` で Tavily、Firecrawl、Keenable を選ぶ場合は、キーがなくても使えます。

**SearXNG** は、無料で、自分でホストでき、プライバシーを尊重するメタ検索エンジンで、70 を超える検索エンジンに問い合わせます。API キーは不要で、`SEARXNG_URL` に自分のインスタンス（`http://localhost:8080` など）を設定するだけです。SearXNG は検索専用なので、`web_extract` には別の抽出のプロバイダーが必要です（`web.extract_backend` を設定してください）。Docker での構築の手順は [Web Search のセットアップガイド](https://hermes-agent.nousresearch.com/user-guide/features/web-search) を参照してください。

**自前でホストする Firecrawl:** `FIRECRAWL_API_URL` を自分のインスタンスに向けてください。独自の URL を設定すると、API キーは任意になります（サーバー側で認証を切るには `USE_DB_AUTHENTICATION=*** を設定します）。

**Parallel の検索モード:** `PARALLEL_SEARCH_MODE` で検索の動きを決めます。`fast`、`one-shot`、`agentic` のいずれかです（デフォルト: `agentic`）。

**Exa:** `~/.hermes/.env` に `EXA_API_KEY` を設定してください。`category` による分類の絞り込み（`company`、`research paper`、`news`、`people`、`personal site`、`pdf`）と、ドメインや日付による絞り込みに対応しています。

## ブラウザー {#browser}

ブラウザーの自動操作の動きを設定します。

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

- `must_respond`（デフォルト）— ダイアログを受け止め、`browser_snapshot.pending_dialogs` に出し、エージェントが `browser_dialog(action=...)` を呼ぶのを待ちます。`dialog_timeout_s` 秒のあいだ返事がないと、ページの JS のスレッドがいつまでも止まらないよう、自動的に閉じられます。
- `auto_dismiss` — 受け止めて、すぐ閉じます。エージェントは後から `browser_snapshot.recent_dialogs` で、`closed_by="auto_policy"` としてその記録を見られます。
- `auto_accept` — 受け止めて、すぐ承諾します。`beforeunload` の確認をしつこく出すページに便利です。

ダイアログの扱いの全体の流れは、[ブラウザーの機能のページ](/hermes/docs/user-guide/features/browser/#browser_dialog) を参照してください。

ブラウザーのツールセットは複数のプロバイダーに対応しています。Browserbase、Browser Use、ローカルの Chromium 系ブラウザーへの CDP 接続の詳細は、[Browser の機能のページ](https://hermes-agent.nousresearch.com/user-guide/features/browser) を参照してください。

## タイムゾーン {#timezone}

サーバーのローカルのタイムゾーンを、IANA のタイムゾーン名で上書きします。ログのタイムスタンプ、cron のスケジュール、システムプロンプトへの時刻の差し込みに影響します。

```yaml
timezone: "America/New_York"   # IANA timezone (default: "" = server-local time)
```

指定できるのは、IANA のタイムゾーン識別子です（`America/New_York`、`Europe/London`、`Asia/Kolkata`、`UTC` など）。空のままにするか、キーを省くとサーバーのローカル時刻になります。

## Discord {#discord}

メッセージ用のゲートウェイでの、Discord 固有の動きを設定します。

```yaml
discord:
  require_mention: true          # Require @mention to respond in server channels
  free_response_channels: ""     # Comma-separated channel IDs where bot responds without @mention
  auto_thread: true              # Auto-create threads on @mention in channels
```

- `require_mention` — `true`（デフォルト）のとき、ボットはサーバーのチャンネルでは `@BotName` と呼ばれたときにだけ返します。DM は呼びかけなしでも常に動きます。
- `free_response_channels` — カンマ区切りのチャンネル ID の一覧で、ここに挙げたチャンネルでは、呼びかけなしでもすべてのメッセージに返します。
- `auto_thread` — `true`（デフォルト）のとき、チャンネルでの呼びかけは自動的に会話用のスレッドを作り、チャンネルをすっきり保ちます（Slack のスレッドと似た考え方です）。

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

- `redact_secrets` — `true` のとき、ツールの出力が会話のコンテキストやログに入る前に、API キー、トークン、パスワードらしき並びを見つけて伏せます。**デフォルトで有効**です。デバッグや伏せ字の仕組みそのものの開発で、認証情報らしい生の文字列が必要なときにだけ `false` にしてください。
- `tirith_enabled` — `true` のとき、ターミナルのコマンドは実行前に [Tirith](https://github.com/sheeki03/tirith) で検査され、危険かもしれない操作が見つけられます。
- `tirith_path` — tirith のバイナリのパスです。標準でない場所に入れている場合に設定します。
- `tirith_timeout` — tirith の検査を待つ最大の秒数です。検査がタイムアウトしても、コマンドはそのまま進みます。
- `tirith_fail_open` — `true`（デフォルト）のとき、tirith が使えなかったり失敗したりしても、コマンドの実行は許されます。tirith が確かめられないときにコマンドを止めたい場合は `false` にしてください。

## サイトの遮断リスト {#website-blocklist}

エージェントの Web やブラウザーのツールから、特定のドメインへのアクセスを止めます。

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

有効にすると、遮断するドメインの形に一致した URL は、Web やブラウザーのツールが動く前にはねられます。これは `web_search`、`web_extract`、`browser_navigate`、そして URL にアクセスするすべてのツールに効きます。

ドメインの書き方は次のとおりです。
- 完全なドメイン: `admin.example.com`
- ワイルドカードのサブドメイン: `*.internal.company.com`（すべてのサブドメインを遮断します）
- トップレベルのワイルドカード: `*.local`

共有のファイルには、1 行に 1 つずつドメインの規則を書きます（空行と `#` のコメントは無視されます）。ファイルがなかったり読めなかったりすると警告がログに残りますが、ほかの Web のツールが止まることはありません。

この方針は 30 秒ごとにキャッシュされるので、設定の変更は再起動なしにすぐ効きます。

## 賢い承認 {#smart-approvals}

危険かもしれないコマンドを Hermes がどう扱うかを決めます。

```yaml
approvals:
  mode: smart   # smart | manual | off
```

| モード | 動作 |
|------|----------|
| `smart`（デフォルト） | 補助の LLM を使って、引っかかったコマンドが本当に危険かどうかを判断します。危険度の低いコマンドは、そのコマンドに限って自動的に承認されます。本当に危ないものは拒否され、判断がつかないものはユーザーへ回されます。 |
| `manual` | 引っかかったコマンドを実行する前に、必ずユーザーに確認します。CLI では対話的な承認の画面が出ます。メッセージのプラットフォームでは、承認の待ち行列に入ります。 |
| `off` | 承認の検査をすべて飛ばします。`HERMES_YOLO_MODE=true` と同じです。**注意して使ってください。** |

賢いモードは、承認疲れを減らすのにとくに役立ちます。安全な操作についてはエージェントがより自律的に動けるようにしつつ、本当に壊しかねないコマンドは捕まえます。

:::warning
`approvals.mode: off` にすると、ターミナルのコマンドに対する安全の検査がすべて無効になります。信頼できる、隔離された環境でだけ使ってください。
:::

### 拒否が続いたときの遮断 {#denial-circuit-breaker}

`approvals.denial_breaker_threshold`（デフォルト `3`）は、賢い承認の審査役が拒み続けているコマンドを、エージェントが少しずつ形を変えて試し続けるのを防ぎます。試すたびに、見張り役の LLM の呼び出しが 1 回消えていくからです。1 つのセッションでこの回数だけ拒否が続くと、拒否のメッセージは強い停止の指示に変わり、作業をやめ、止められた操作を報告し、手で実行するか `/approve` するようあなたに頼め、とエージェントに伝えます。1 度でも承認されれば数はリセットされます。`0` にすると無効になります。

```yaml
approvals:
  denial_breaker_threshold: 3   # 0 disables the breaker
```

### 拒否の規則 {#deny-rules}

`approvals.deny` は、一致したターミナルのコマンドを無条件に止める、glob のパターンの一覧です。`--yolo`、`/yolo`、`mode: off` のときでも止まります。組み込みの厳格な遮断リストの、ユーザーが編集できる相棒です。

```yaml
approvals:
  deny:
    - "git push --force*"
    - "*curl*|*sh*"
```

パターンは大文字小文字を区別しない fnmatch の glob で、YAML では引用符で囲む必要があります（先頭の裸の `*` は構文エラーになります）。詳しくは [Security — User-Defined Deny Rules](https://hermes-agent.nousresearch.com/user-guide/security#user-defined-deny-rules-approvalsdeny) を参照してください。

### 賢い承認の独自の方針 {#custom-smart-approval-policy}

`approvals.smart_policy` を使うと、賢い承認の審査役への指示に自分の規則を足せます。設定すると、そのテキストは見張り役の LLM のシステムプロンプト（信頼できる側の経路で、信頼できないコマンドの文字列と並ぶことはありません）に加わるので、コードを書き換えずに、自分の環境に合わせて判断を厳しくも緩くもできます。

```yaml
approvals:
  smart_policy: |
    Always ESCALATE commands that modify anything under /etc.
    APPROVE docker compose restarts in ~/deploys — they are routine here.
```

## チェックポイント {#checkpoints}

ファイルを壊しかねない操作の前に、ファイルシステムを自動でスナップショットします。詳しくは [Checkpoints & Rollback](https://hermes-agent.nousresearch.com/user-guide/checkpoints-and-rollback) を参照してください。

```yaml
checkpoints:
  enabled: false                 # Enable automatic checkpoints (also: hermes chat --checkpoints). Default: false (opt-in).
  max_snapshots: 20              # Max checkpoints to keep per directory (default: 20)
```

## 委任 {#delegation}

委任のツールにおける、サブエージェントの動きを設定します。

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

**サブエージェントのプロバイダーとモデルの上書き:** デフォルトでは、サブエージェントは親のエージェントのプロバイダーとモデルを引き継ぎます。`delegation.provider` と `delegation.model` を設定すると、サブエージェントを別のプロバイダーとモデルの組へ回せます。たとえば、主要なエージェントは高価な推論モデルで動かしつつ、範囲の狭い作業には安くて速いモデルを使う、といった具合です。

**エンドポイントの直接指定:** 独自のエンドポイントを素直に指定したい場合は、`delegation.base_url`、`delegation.api_key`、`delegation.model` を設定してください。サブエージェントはその OpenAI 互換のエンドポイントへ直接送られ、`delegation.provider` より優先されます。`delegation.api_key` を省いた場合、Hermes は `OPENAI_API_KEY` だけに頼ります。

**通信方式（`api_mode`）:** Hermes は `delegation.base_url` から通信方式を自動で判別します（たとえば `/anthropic` で終わるパスは `anthropic_messages`。Codex、ネイティブの Anthropic、Kimi-coding のホスト名は、これまでどおりの判別が働きます）。判別しきれないエンドポイント、たとえば Azure AI Foundry、MiniMax、Zhipu GLM、Anthropic 形式のバックエンドを前に置いた LiteLLM のプロキシなどでは、`delegation.api_mode` に `chat_completions`、`codex_responses`、`anthropic_messages` のいずれかを明示してください。空のまま（デフォルト）にすれば、自動判別が続きます。

委任のプロバイダーは、CLI やゲートウェイの起動時とまったく同じ方法で認証情報を解決します。設定済みのプロバイダーはすべて使えます。`openrouter`、`nous`、`copilot`、`zai`、`kimi-coding`、`minimax`、`minimax-cn` です。プロバイダーを指定すると、正しいベース URL、API キー、通信方式が自動的に解決されるので、認証情報を手で配線する必要はありません。

**優先順位:** 設定の `delegation.base_url` → 設定の `delegation.provider` → 親のプロバイダー（引き継ぎ）。モデルは、設定の `delegation.model` → 親のモデル（引き継ぎ）です。`provider` を指定せず `model` だけを設定すると、親の認証情報を保ったままモデル名だけが変わります（OpenRouter のように、同じプロバイダーの中でモデルを切り替えるのに便利です）。

**幅と深さ:** `max_concurrent_children` は、1 回のまとめ実行で並行して動くサブエージェントの数の上限です（デフォルト `3`、下限は 1、上限はありません）。`DELEGATION_MAX_CONCURRENT_CHILDREN` の環境変数でも設定できます。モデルが上限より長い `tasks` の配列を出した場合、`delegate_task` は黙って切り詰めるのではなく、制限を説明するツールのエラーを返します。`max_spawn_depth` は委任の木の深さを決めます（1 から 3 に収められます）。デフォルトの `1` では委任は平らで、子は孫を生めず、`role="orchestrator"` を渡しても黙って `leaf` に落ちます。`2` にすると、まとめ役の子が末端の孫を生めます。`3` なら 3 段の木になります。エージェントは呼び出しごとに `role="orchestrator"` でまとめ役を選びます。`orchestrator_enabled: false` にすると、それに関係なくすべての子が末端に戻されます。費用は掛け算で増えます。`max_spawn_depth: 3` と `max_concurrent_children: 3` なら、木は 3×3×3 = 27 の末端のエージェントが同時に動くところまで広がりえます。使い方は [Subagent Delegation → Depth Limit and Nested Orchestration](/hermes/docs/user-guide/features/delegation/#depth-limit-and-nested-orchestration) を参照してください。

## 聞き返し {#clarify}

聞き返しへの返事を、ゲートウェイがどれだけ待つかを設定します。正式なキーは `agent.clarify_timeout`（デフォルト `3600` 秒）です。従来の最上位の `clarify.timeout` も、明示的に設定されていれば尊重されます。

```yaml
agent:
  clarify_timeout: 3600        # Seconds to wait for user clarification response (0 or less = unlimited)
```

## コンテキストファイル（SOUL.md、AGENTS.md） {#context-files-soulmd-agentsmd}

Hermes は 2 種類のコンテキストの範囲を使います。

| ファイル | 目的 | 範囲 |
|------|---------|-------|
| `SOUL.md` | **エージェントの中心となる人格** — エージェントが何者かを決めます（システムプロンプトの 1 番目の枠） | `~/.hermes/SOUL.md` または `$HERMES_HOME/SOUL.md` |
| `.hermes.md` / `HERMES.md` | プロジェクト固有の指示（最優先） | git のルートまでさかのぼります |
| `AGENTS.md` | プロジェクト固有の指示、コーディングの約束ごと | ディレクトリを再帰的にたどります |
| `CLAUDE.md` | Claude Code のコンテキストファイル（これも読まれます） | 作業ディレクトリのみ |
| `.cursorrules` | Cursor IDE の規則（これも読まれます） | 作業ディレクトリのみ |
| `.cursor/rules/*.mdc` | Cursor の規則のファイル（これも読まれます） | 作業ディレクトリのみ |

- **SOUL.md** はエージェントの中心となる人格です。システムプロンプトの 1 番目の枠を占め、組み込みの既定の人格をまるごと置き換えます。エージェントが何者かを、自由に作り込むために編集してください。
- SOUL.md がない、空、あるいは読み込めない場合、Hermes は組み込みの既定の人格に戻ります。
- **プロジェクトのコンテキストファイルには優先順位があり**、読み込まれるのは 1 種類だけです（最初に見つかったものが勝ちます）。`.hermes.md` → `AGENTS.md` → `CLAUDE.md` → `.cursorrules` の順です。SOUL.md は、いつでもこれとは別に読み込まれます。
- **AGENTS.md** は階層的です。サブディレクトリにも AGENTS.md があれば、すべてが組み合わされます。
- Hermes は、`SOUL.md` がまだなければ既定のものを自動的に置きます。
- 読み込まれたコンテキストファイルは、すべて `context_file_max_chars` の文字数（デフォルト 20,000）を上限に、賢く切り詰められます。

あわせて参照してください。
- [Personality & SOUL.md](https://hermes-agent.nousresearch.com/user-guide/features/personality)
- [Context Files](https://hermes-agent.nousresearch.com/user-guide/features/context-files)

## 作業ディレクトリ {#working-directory}

| 場面 | デフォルト |
|---------|---------|
| **CLI（`hermes`）** | コマンドを実行した、そのディレクトリ |
| **メッセージ用のゲートウェイ** | `~/.hermes/config.yaml` の `terminal.cwd`。未設定ならホームディレクトリの `~` |
| **Docker / Singularity / Modal / SSH** | コンテナやリモートのマシンの中の、ユーザーのホームディレクトリ |

作業ディレクトリを上書きするには、次のようにします。
```yaml
# In ~/.hermes/config.yaml:
terminal:
  cwd: /home/myuser/projects
```

`~/.hermes/.env` に書く `MESSAGING_CWD` や `TERMINAL_CWD` は、従来との互換のためのフォールバックです。新しく設定するなら `terminal.cwd` を使ってください。

## ネットワーク {#network}

外向きの HTTP のための、接続の回避策です。

```yaml
network:
  force_ipv4: false   # Force IPv4 for outbound connections (default: false)
```

`force_ipv4` — IPv6 が壊れている、あるいは届かないサーバーでは、Python が先に AAAA レコードを引き、IPv4 に戻るまで TCP のタイムアウトいっぱい固まることがあります。`true` にすると IPv6 を完全に飛ばし、IPv4 で直接つなぎます。

## 導入時の案内 {#onboarding}

初回の案内と、プロフィールを組み立てる申し出についての設定です。

```yaml
onboarding:
  profile_build: "ask"   # "ask" (default) | "off"
  seen: {}               # internal latch — leave empty
```

- `profile_build` — ゲートウェイでの一番最初のメッセージのときに出す、プロフィール作りの申し出を制御します。`"ask"`（デフォルト）はプロフィールを作りましょうかと尋ねます。この申し出は**同意を前提とした任意のもの**で、エージェントは調べる前に必ず尋ね、つながっているアカウントを黙って読むことはありません。`"off"` にすると、素っ気ない紹介だけになります。申し出が出るのは多くても 1 度きりです。
- `seen` — 内部の状態です。Hermes は一度見せた案内をここに控えて、二度と出さないようにします。プロフィール作りの申し出も、出した時点でここに記録されます。手で編集しないでください。すべての案内をもう一度見たい場合は、`onboarding` の節ごと消してください。

## ダッシュボード {#dashboard}

[Web のダッシュボード](https://hermes-agent.nousresearch.com/user-guide/features/web-dashboard) の設定です。見た目のテーマ、公開の URL、認証の方式を扱います。認証の方式（OAuth、ベーシック認証、drain）は Web ダッシュボードのページで詳しく説明しています。ここでは `config.yaml` の書き方を示します。

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
```

- `theme` — ダッシュボードの見た目のテーマです。
- `show_token_analytics` — デフォルトでは無効です。Analytics のページとトークンや費用の数字は、**手元での控えめな見積もり**にすぎず（補助の呼び出し、再試行、フォールバック、キャッシュへの書き込みを含みません）、プロバイダーの請求よりずっと低く出ることがあります。請求額ではないと理解したうえでだけ `true` にしてください。
- `public_url` — 設定すると、OAuth の `redirect_uri` はこの値（スキーム + ホスト + 任意のパスの接頭辞）をそのまま土台に組み立てられます。`X-Forwarded-*` のヘッダーを確実に転送しないリバースプロキシの後ろに置く場合に設定してください。空のままにすると、プロキシのヘッダーから組み立て直します。
- `oauth` / `basic_auth` / `drain_auth` — 同梱のダッシュボードの認証プラグインが読む設定です。drain の秘密の値そのものはここには書きません。`HERMES_DASHBOARD_DRAIN_SECRET` の環境変数で渡します。認証の設定の全体は [Web Dashboard](https://hermes-agent.nousresearch.com/user-guide/features/web-dashboard) を参照してください。

