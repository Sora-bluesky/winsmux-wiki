---
title: "Hermes Agent の設定"
description: "Hermes Agent を設定する — config.yaml、プロバイダー、モデル、API キーなど"
upstream_path: user-guide/configuration.md
upstream_blob: 95668e8f15423ff6e32420a27526b476bba95374
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/configuration
---

# Hermes Agent の設定 {#hermes-agent-configuration}

設定はすべて、すぐ手が届くように `~/.hermes/` ディレクトリに置かれます。

:::tip 動く `config.yaml` にいちばん早く辿り着く道
`hermes setup --portal` を実行してください。OAuth を 1 回済ませるだけで、モデルのプロバイダーと Tool Gateway の 4 つのツールがすべて揃い、YAML を手で書く必要はありません。Portal の購読者は、トークン課金のプロバイダーが 10% 引きになります。[Nous Portal](/hermes/docs/integrations/nous-portal/) をご覧ください。
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
`hermes config set` は、値を正しいファイルへ自動で振り分けます。API キーは `.env` に、それ以外は `config.yaml` に保存されます。
:::

## 設定の優先順位 {#configuration-precedence}

設定は次の順で決まります（上ほど優先されます）。

1. **CLI の引数** — たとえば `hermes chat --model anthropic/claude-sonnet-4`（その実行だけの上書き）
2. **`~/.hermes/config.yaml`** — 秘密情報以外のすべての設定を書く、主となる設定ファイル
3. **`~/.hermes/.env`** — 環境変数の受け皿。秘密情報（API キー、トークン、パスワード）には **必須** です
4. **組み込みの既定値** — ほかに何も設定されていないときに使われる、安全側の固定値

:::info 目安
秘密情報（API キー、ボットのトークン、パスワード）は `.env` へ。それ以外（モデル、ターミナルのバックエンド、圧縮の設定、記憶の上限、ツールセット）は `config.yaml` へ入れます。両方に設定がある場合、秘密情報以外は `config.yaml` が優先されます。
:::

:::tip 組織での導入
管理者は、システム側の管理用ディレクトリを使って、一般の利用者が上書きできない
設定値や秘密情報を固定できます。
[管理された範囲](/hermes/docs/user-guide/managed-scope/) をご覧ください。
:::

## 実行時の上限 {#runtime-limits}

長く動き続ける Hermes のサーバー（ゲートウェイや
`hermes serve --isolated` を含みます）は、OS が対応していれば、起動時に
設定された `RLIMIT_NOFILE` のソフト上限を適用します。

```yaml
runtime:
  nofile_soft_limit: 4096
```

既定は `4096` です。Hermes は目標値を OS のハード上限までに抑え、すでに
それより高いソフト上限を持つプロセスを下げることはありません。この調整をやめたい場合は、
値を `0`、`false`、`null` のいずれかにしてください。Windows や、上限を変えられない
サンドボックス
では、上限を変えないまま起動を続けます。

## データベースの設定 {#database-settings}

`database:` の節は、Hermes が SQLite の状態データベース（`state.db`）をどう開くかを
決めます。ここにはセッション、メッセージ、ゲートウェイの振り分けが保存されます。

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

既存のデータベースのディスク上のジャーナルモードが、開くときに黙って WAL へ
切り替わった場合（たとえば運用者が手作業で `delete` に変換していたデータベース）にも、
Hermes は（プロセスごと・データベースごとに 1 回）警告を出し、この選択を保つ設定として
`database.journal_mode` の名前を伝えます。

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

1 つの値の中で複数回参照することもできます（`url: "${HOST}:${PORT}"`）。参照した変数が設定されていない場合、その記述はそのまま残り（`${UNDEFINED_VAR}` は書いたままになります）、警告がログに出ます。裸の `$VAR` は展開されません。

[複数プロファイルを束ねたゲートウェイ](/hermes/docs/user-guide/multi-profile-gateways/) の下では、プロファイルの `config.yaml` にある参照は **そのプロファイルの** `.env`（その秘密情報の範囲）に対して解決され、プロセス全体の環境ではありません。プロファイル B の `${MATRIX_ACCESS_TOKEN}` は、B 自身がその変数を定義していない限り未解決のままです。プロファイルが 1 つだけの場合の動きは変わりません。

Cursor 風の SecretRef の書き方も受け付けます。`${env:VAR_NAME}` は `${VAR_NAME}` とまったく同じように解決されます（`env:` の接頭辞は取り除かれます）。そのため、Cursor や Claude の設定からコピーしてきた MCP やプロバイダーの断片が、`config.yaml` でも `mcp_servers` のブロックでもそのまま動きます。ほかの SecretRef の取得元（`${file:...}`、`${vault:...}`、`${bitwarden:...}`）はその場では解決 **されません**。外部の秘密情報の保管先は、`secrets:` のブロックを通して起動時に値を環境へ入れるので、`${env:NAME}` の形で参照してください。知らない接頭辞は一度だけ警告を出し、書いたまま残ります。

AI のプロバイダーの設定（OpenRouter、Anthropic、Copilot、独自のエンドポイント、自前で動かす LLM、代替モデルなど）については、[AI プロバイダー](/hermes/docs/integrations/providers/) をご覧ください。

### プロバイダーのタイムアウト {#provider-timeouts}

プロバイダー全体のリクエストのタイムアウトは `providers.<id>.request_timeout_seconds` で、モデルごとの上書きは `providers.<id>.models.<model>.timeout_seconds` で設定できます。これは、あらゆる通信方式（OpenAI 形式、Anthropic のネイティブ、Anthropic 互換）での主たるやり取りのクライアント、代替の連鎖、認証情報を入れ替えたあとの再構築、そして（OpenAI 形式では）リクエストごとのタイムアウト引数に適用されます。つまり、設定した値が従来の `HERMES_API_TIMEOUT` 環境変数より優先されます。

逐次通信でない場合の「応答が止まった」検出には、`providers.<id>.stale_timeout_seconds` と、モデルごとの上書き `providers.<id>.models.<model>.stale_timeout_seconds` を設定できます。これは従来の `HERMES_API_CALL_STALE_TIMEOUT` 環境変数より優先されます。

これらを設定しないままにすると、従来の既定値（`HERMES_API_TIMEOUT=1800` 秒、`HERMES_API_CALL_STALE_TIMEOUT=90` 秒、Anthropic のネイティブは 900 秒）が使われます。逐次通信でない場合の停止検出は、明示していないときは手元のエンドポイントに対して自動で無効になり、とても大きな文脈に対しては上向きに伸びることがあります。AWS Bedrock にはまだ結線されていません（`bedrock_converse` と AnthropicBedrock SDK のどちらの経路も、独自のタイムアウト設定を持つ boto3 を使うためです）。コメント付きの例は [`cli-config.yaml.example`](https://github.com/NousResearch/hermes-agent/blob/main/cli-config.yaml.example) にあります。

## 更新時の動き {#update-behavior}

`hermes update` の設定は、`config.yaml` の `updates` の下にあります。

```yaml
updates:
  pre_update_backup: quick       # quick (state snapshot, default) | full (snapshot + HERMES_HOME zip) | off
  backup_keep: 5                 # Keep this many full pre-update backup zips
  non_interactive_local_changes: stash  # stash | discard
  auto_switch_parked_branch: true       # auto-switch a clean, fully merged parked branch back to main
```

`pre_update_backup` は、更新前の安全策をまとめた 1 つのつまみです。`quick`（既定）は、重要な状態ファイル（ペアリング情報、cron ジョブ、設定、認証。1 GiB を超えるファイルは飛ばします）を `state-snapshots/` へ保存します。`full` はそれに加えて `HERMES_HOME` 全体を `backups/` へ zip にまとめますが、ホームが大きいと数分かかることがあります。`off` は両方を行いません。従来の真偽値も有効です（`true` → `full`、`false` → `off`）。

git でインストールした環境では、Hermes は更新用のブランチへ切り替える前や取得の前に、変更のある追跡対象ファイルと未追跡のファイルを自動で stash します。端末での対話的な更新では、その stash を戻す前に確認します。対話できない更新（デスクトップやチャットのアプリ、ゲートウェイ、`--yes`）では `updates.non_interactive_local_changes` に従います。`stash` は取得が成功したあとにローカルのソース変更を戻し、`discard` は取得が成功したあとに更新が作った stash を捨てます。`discard` は、ローカルのソース変更を残すつもりがまったくない、管理された環境でだけ使ってください。

その stash の手前で、Hermes は npm の install やビルドで生じた、追跡対象の `package-lock.json` の差分も元に戻します。ロックファイルを意図して編集した場合は、更新の前にコミットするか自分で stash してください。

## ターミナルのバックエンドの設定 {#terminal-backend-configuration}

Hermes は 7 種類のターミナルのバックエンドに対応しています。どれを選ぶかで、エージェントのシェルコマンドが実際に走る場所が決まります。手元の端末、Docker のコンテナ、SSH 経由の離れたサーバー、Modal のクラウドサンドボックス（直接、または Nous が管理するゲートウェイ経由）、Daytona の作業環境、Vercel Sandbox、Singularity / Apptainer のコンテナのいずれかです。

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

`terminal.temp_dir` は、手元のバックエンドで Hermes がセッションの一時的な成果物を
どこへ置くかを決めます。裏で動くプロセスのログ・pid・終了状態のファイル、コードを実行する
サンドボックス、ディスクへ退避したツールの結果などです。空のまま（既定）にすると、Hermes は
環境に明示された `TMPDIR` / `TMP` / `TEMP` を尊重し、それがなければ `/tmp` ではなく
実ストレージ上の管理されたディレクトリ `~/.hermes/cache/terminal` を使います。多くの
ディストリビューション（とくに Arch 系）では `/tmp` が小さな RAM 上の tmpfs で、負荷が
かかると Hermes のセッションの成果物で埋まってしまうからです。管理されたディレクトリは
自動で掃除されます。72 時間より古い成果物は、ゲートウェイの定期処理によって 1 時間ごとに、
CLI だけの環境ではプロセスごとに 1 回、取り除かれます。セッションの一時領域をほかの場所へ
向けたい場合は、`temp_dir` に既存の絶対パスを設定してください。利用者が設定したパスが
自動で掃除されることはありません。

`terminal.font_family` は、Hermes Desktop に埋め込まれたターミナルの表示を決めます。手元に入っているフォントのファミリー名 1 つ（たとえば `MesloLGS NF`）か、CSS のフォント指定を受け付けます。Hermes は同梱の JetBrains Mono の指定を控えとして後ろに足し、空の値なら既定のままです。同じ設定はプロファイルごとに **Settings → Appearance → Terminal Font** からも編集できます。Google Fonts のダウンロードも、システムフォントへの許可も要りません。

Modal、Daytona、Vercel Sandbox のようなクラウドのサンドボックスでは、`container_persistent: true` は、サンドボックスを作り直すときに Hermes がファイルシステムの状態を保とうとする、という意味です。同じ生きたサンドボックスや PID 空間、裏で動いているプロセスが、あとでも動き続けることを約束するものではありません。

### バックエンドの一覧 {#backend-overview}

| バックエンド | コマンドが走る場所 | 隔離 | 向いている用途 |
|---------|-------------------|-----------|----------|
| **local** | あなたの端末で直接 | なし | 開発、個人利用 |
| **docker** | 1 つの長く動く Docker コンテナ（セッション、`/new`、サブエージェントで共有） | 完全（名前空間、権限の削除） | 安全な隔離、CI/CD |
| **ssh** | SSH 経由の離れたサーバー | ネットワークの境界 | 離れた場所での開発、強力なハードウェア |
| **modal** | Modal のクラウドサンドボックス | 完全（クラウドの VM） | 使い捨てのクラウド計算、評価 |
| **daytona** | Daytona の作業環境 | 完全（クラウドのコンテナ） | 管理されたクラウドの開発環境 |
| **vercel_sandbox** | Vercel Sandbox | 完全（クラウドの microVM） | スナップショットで保つファイルシステムを伴うクラウド実行 |
| **singularity** | Singularity / Apptainer のコンテナ | 名前空間（--containall） | HPC のクラスター、共有の端末 |

### local のバックエンド {#local-backend}

既定です。コマンドは隔離なしで、あなたの端末で直接走ります。特別な準備は要りません。

```yaml
terminal:
  backend: local
```

既定では、手元のツールの子プロセスは実際の OS 利用者の `HOME` をそのまま使います。これにより、
`git`、`ssh`、`gh`、`az`、`npm`、Claude Code、Codex のような外部の CLI が、
普段のシェルで使っている認証情報や設定を見つけられます。Hermes の状態は
`HERMES_HOME` を通してプロファイルごとに分かれたままです。プロファイルが設定・記憶・
セッション・スキルを選ぶ仕組みは、`HOME` ではありません。

Hermes がシステム全体の `HOME`、シェルの起動ファイル、OS アカウントのホームを
変えることは **ありません**。この設定が決めるのは、`terminal`、裏で動くターミナルのプロセス、
`execute_code`、ACP の補助プロセスといったツールを通して Hermes が起動する子プロセスに
渡される環境だけです。

#### `terminal.home_mode` {#terminalhomemode}

| モード | ホストへのインストール | コンテナ | 引き換えになるもの |
|---|---|---|---|
| `auto` | 実際の OS 利用者の `HOME` をそのまま使う | `{HERMES_HOME}/home` を使う | 推奨の既定値です。ホストの CLI は動き続け、コンテナの状態も残ります。 |
| `real` | 実際の OS 利用者の `HOME` を強制する | 見えていれば実際の OS 利用者の `HOME` を強制する | 親のプロセスがうっかり `HOME` をプロファイルのホームに向けた状態で始まってしまったときに役立ちます。 |
| `profile` | `{HERMES_HOME}/home` があればそれを使う | `{HERMES_HOME}/home` があればそれを使う | プロファイルごとに CLI の設定を厳密に分けられますが、通常の `~/.ssh`、`~/.gitconfig`、`~/.azure`、`~/.config/gh`、Claude や Codex の認証、npm の状態などは、プロファイルのホームの中で用意するかリンクしない限り見えません。 |

既定の弱点は、ホスト上のプロファイルが `~` の下にある通常の利用者レベルの CLI の
認証情報や設定を共有してしまうことです。git の名義、SSH の鍵、GitHub CLI のログイン、
npm の設定、クラウドの CLI のログインを分けたプロファイルが必要なら、
`home_mode: profile` にして、そのプロファイルのホームの中でそれらのツールを
意図して用意してください。

プロファイルごとにツールの設定を厳密に分けたい場合は、次のように設定します。

```yaml
terminal:
  home_mode: profile
```

このモードでは、ツールの子プロセスは `{HERMES_HOME}/home` を `HOME` として使います。Hermes は
`HERMES_REAL_HOME` も設定するので、スクリプトが必要なときに実際の利用者のホームを見つけられます。
コンテナのバックエンドは `auto` のときも `{HERMES_HOME}/home` を使い続けます。そのディレクトリが
Hermes の永続データの領域にあるからです。

プロファイルの状態と実際の利用者のホームを区別したいスクリプトでは、Hermes のデータには
`HERMES_HOME` を、アカウントのホームには `HERMES_REAL_HOME` を使ってください。

```python
from pathlib import Path

hermes_home = Path(os.environ["HERMES_HOME"])
real_home = Path(os.environ.get("HERMES_REAL_HOME", os.environ["HOME"]))
```

:::warning
エージェントは、あなたのユーザーアカウントと同じ範囲でファイルシステムに触れます。使わせたくないツールは `hermes tools` で無効にするか、隔離のために Docker へ切り替えてください。
:::

### docker のバックエンド {#docker-backend}

セキュリティを固めた Docker のコンテナの中でコマンドを走らせます（すべての権限を落とし、権限の昇格を禁じ、PID の数に上限を設けます）。

**1 つの長く動くコンテナを、Hermes のプロセス間で共有します。** Hermes は最初の利用時に長く生きるコンテナを 1 つだけ起動し、ターミナル、ファイル、`execute_code` のすべての呼び出しを `docker exec` でその同じコンテナへ通します。セッションをまたいでも、`/new` や `/reset` のあとでも、`delegate_task` のサブエージェントでも同じです。作業ディレクトリの移動、入れたパッケージ、`/workspace` のファイル、そして **裏で動くプロセス** は、ツールの呼び出しをまたいでも、Hermes のプロセスをまたいでも引き継がれます。TUI のセッションを閉じても、`/quit` しても、新しく `hermes` を起動しても、コンテナは動き続け、次の Hermes のプロセスがラベルによる検索でそれを再利用します。片付けの正確な条件は、下の **コンテナの一生** をご覧ください。

**セッションごとに隔離するモード（`container_persistent: false`）。** Docker のバックエンドで `container_persistent: false` にすると、**セッションごとに** 1 つのコンテナになります。どのチャット（デスクトップアプリのセッション、ゲートウェイの会話、TUI のセッション）も、最初のターミナルやファイルの呼び出しで自分専用の新しいサンドボックスを得て、セッションが閉じるか `lifetime_seconds` を超えて放置されると取り除かれます。セッション間で引き継がれるものはありません。ファイルシステムの状態も、マウントも、裏で動くプロセスもです。`docker_mount_cwd_to_workspace: true` の場合、`/workspace` にマウントされるのは **そのセッションに紐づいた** 作業場所だけです。何も紐づいていない新しいセッションは、前のセッションのマウントを引き継ぐのではなく、空の作業場所を得ます。`delegate_task` のサブエージェントは、それでも親のセッションのコンテナを共有します。会話と会話の間にセキュリティの境界を置きたいときはこのモードを使い、上で説明した長く生きる共有コンテナが欲しいときは既定の `true` のままにしてください。

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

**`docker_env`** と **`docker_forward_env`** の違いです。前者は設定に書いた `KEY=value` の組をそのまま注入します（値は `config.yaml` に置くか、`TERMINAL_DOCKER_ENV='{"DEBUG":"1"}'` のように JSON の辞書として渡します）。後者は、シェルや `~/.hermes/.env` にある値を転送するので、実際の秘密情報が設定ファイルに現れません。トークンには `docker_forward_env` を、コンテナが必要とする固定のつまみには `docker_env` を使ってください。

**`terminal.docker_extra_args`**（`TERMINAL_DOCKER_EXTRA_ARGS='["--gpus=all"]'` でも上書きできます）を使うと、Hermes が専用のキーとして用意していない `docker run` のフラグを自由に渡せます。`--gpus`、`--network`、`--add-host`、別の `--security-opt` による上書きなどです。各項目は文字列でなければなりません。この一覧は組み立てた `docker run` の呼び出しの最後に足されるので、必要なら Hermes の既定値を上書きできます。使いすぎには注意してください。サンドボックスを固める設定（権限の削除、`--user`、作業場所のバインドマウント）と衝突するフラグは、隔離を黙って弱めてしまいます。

**`terminal.docker_network`**（既定は `true`、環境変数は `TERMINAL_DOCKER_NETWORK`） — `false` にすると、サンドボックスのコンテナを `--network=none` で走らせ、エージェントのコマンドからの外向きの通信をすべて断ちます。これは `terminal`、`execute_code`、ファイル系のツールが使う実行用のコンテナに効きます。コンテナは Hermes のプロセスをまたいで残るため、ネットワークのある古いコンテナが存在する状態でこれを `false` にすると、そのコンテナは取り除かれ、通信を断った新しいコンテナが始まります（警告がログに出ます）。その中で動いていた裏のプロセスは失われます。`docker_extra_args` で `--network=none` を渡すより、このキーを使ってください。

**必要なもの:** Docker Desktop か Docker Engine が入っていて動いていること。Hermes は `$PATH` に加えて、macOS でよくあるインストール先（`/usr/local/bin/docker`、`/opt/homebrew/bin/docker`、Docker Desktop のアプリ本体）も探します。Podman もそのまま使えます。両方入っている場合に Podman を使わせたいときは、`HERMES_DOCKER_BINARY=podman`（またはフルパス）を設定してください。

#### コンテナの一生 {#container-lifecycle}

Hermes が管理するコンテナには 3 つのラベルが付き、あとから来たプロセス（そして置き去りを片付ける処理）がそれを見分けられます。

- `hermes-agent=1` — Hermes が管理していることを示します
- `hermes-task-id=<sanitized task_id>` — タスクごとの再利用の判定に使われます
- `hermes-profile=<sanitized profile name>` — 既定では、再利用と片付けを使用中の Hermes のプロファイルに限ります。`docker_shared_container_key` を設定した場合は、その正規化した値が代わりに使われます

起動時、Hermes は `docker ps --filter label=hermes-task-id=<id> --filter label=hermes-profile=<identity>` を実行し、見つかれば **既存のコンテナに取り付きます**。この識別子は、`docker_shared_container_key` が信頼できるプロファイルを共通の値に明示的に参加させていない限り、使用中のプロファイルです。コンテナが `exited` の場合（Docker のデーモンを再起動したあとなど）は `docker start` して再利用します。ファイルシステムの状態と入れたパッケージは残りますが、コンテナ内で裏に動いていたプロセスは残りません。

Hermes のプロセスが終了したとき — `/quit`、TUI のセッションを閉じる、ゲートウェイの停止、SIGKILL でさえ — **既定のモードでは、コンテナに対する片付けは何もしません**。コンテナは動き続けます。次の Hermes のプロセスは、ラベルの検索でミリ秒のうちに取り付きます。これは「セッションをまたいで共有される、長く生きるコンテナ 1 つ」という約束が求める動きです。裏で動くプロセス（npm の監視、開発用サーバー、長く走る pytest）がセッションをまたいで生き残る道は、これしかないからです。

**コンテナが実際に片付けられる（停止して `docker rm -f` される）のは、次の場合だけです。**

| きっかけ | 発動する条件 |
|---|---|
| `docker_persist_across_processes: false` | プロセスごとに隔離することを明示した場合です。`cleanup()` のたびに `stop` と `rm -f` を行います。issue #20561 より前の動きと同じです。 |
| 放置の片付け（`lifetime_seconds`、既定 300 秒） | 環境が `persist_across_processes=false` のときだけです。保持モードでは何もせず、コンテナは放置の掃除を生き延びます。 |
| 次回起動時の置き去りの片付け | `2 × lifetime_seconds`（既定は 600 秒 = 10 分）より古い、hermes のラベルが付いた **Exited** のコンテナを、いまのプロファイルの範囲で掃除します。**動作中のコンテナには決して触れません** — 兄弟のプロセスを守るためです。止めたい場合は `docker_orphan_reaper: false` にします。 |
| 利用者による直接の操作 | `docker rm -f`、`docker system prune`、Docker Desktop の再起動などです。`--restart=always` を付けていないので、ホストを再起動するとコンテナは `Exited` のまま残ります（その差分の層は残り、次の起動で再利用されますが、裏のプロセスは消えています）。 |

知っておくとよい細かい場合です。

- **コンテナ内の PID 1 が OOM で強制終了される** と、コンテナは `Exited` に移ります。次に再利用するときは `docker start` され、ファイルシステムの状態は残りますが、裏のプロセスは残りません。
- **プロファイルの切り替え** は、コンテナ同士を隔離します。`hermes-profile=work` のラベルが付いたコンテナは、`hermes-profile=research` で動いている Hermes のプロセスからは見えません。置き去りの片付けもプロファイル単位なので、別プロファイルのコンテナが誤って片付けられることはありませんが、そのプロファイルで Hermes を起動し直すまでは自動で片付けられもしません。
- **プロファイルをまたいだ明示的な共有** — 1 つの信頼できる作業場所で意図的に協働させたいプロファイルには、`terminal:` の下に同じ空でない `docker_shared_container_key` を設定します。これが置き換えるのはコンテナの識別ラベルだけで、タスク、外向き通信、ネットワークの適合性の確認は引き続き行われます。このキーを持たないプロファイルは隔離されたままです。識別ラベルはキーから短い要約を付けて作られるので、似たキー（`team/workspace` と `team_workspace`）が同じコンテナにまとまってしまうことはありません。**大事な点として、共有のコンテナは最初に起動したプロファイルによって一度だけ作られます**。そのプロファイルの `docker_image`、ボリューム、共有メモリの大きさなど、あとから変えられない Docker の設定が採用され、あとから来たプロファイルはそのまま取り付きます。設定が違っていても、コンテナを取り除いて作り直すまでは無視されます。キーを共有するプロファイルは、イメージとマウントについて合意しておくべきです。

`delegate_task(tasks=[...])` で並行して起動したサブエージェントは、この 1 つのコンテナを共有します。同時に `cd` したり、環境を書き換えたり、同じパスへ書き込んだりすれば衝突します。サブエージェントに隔離されたサンドボックスが必要な場合は、`register_task_env_overrides()` でタスクごとのイメージの上書きを登録しなければなりません。強化学習や評価の環境（TerminalBench2、HermesSweEnv など）は、タスクごとの Docker のイメージのためにこれを自動で行っています。

**セキュリティの固め方:**
- `--cap-drop ALL` のうえで、`DAC_OVERRIDE`、`CHOWN`、`FOWNER` だけを戻す
- `--security-opt no-new-privileges`
- `--pids-limit 256`
- `/tmp`（512MB）、`/var/tmp`（256MB）、`/run`（64MB）に大きさを限った tmpfs

**認証情報の転送:** `docker_forward_env` に並べた環境変数は、まずシェルの環境から、次に `~/.hermes/.env` から解決されます。スキルも `required_environment_variables` を宣言でき、それらは自動で合わせられます。

#### 環境変数による上書き {#environment-variable-overrides}

`terminal:` の下のすべてのキーには、`TERMINAL_<KEY_UPPERCASE>` の形の環境変数による上書きがあります。Docker のバックエンドでとくに役立つものを挙げます。

| 環境変数 | 対応するキー | 補足 |
|---|---|---|
| `TERMINAL_DOCKER_IMAGE` | `docker_image` | 元になるイメージ |
| `TERMINAL_DOCKER_FORWARD_ENV` | `docker_forward_env` | JSON の配列: `'["GITHUB_TOKEN","OPENAI_API_KEY"]'` |
| `TERMINAL_DOCKER_ENV` | `docker_env` | JSON の辞書: `'{"DEBUG":"1"}'` |
| `TERMINAL_DOCKER_VOLUMES` | `docker_volumes` | `"host:container[:ro]"` 形式の文字列の JSON 配列 |
| `TERMINAL_DOCKER_EXTRA_ARGS` | `docker_extra_args` | JSON の配列 |
| `TERMINAL_DOCKER_MOUNT_CWD_TO_WORKSPACE` | `docker_mount_cwd_to_workspace` | `true` / `false` |
| `TERMINAL_DOCKER_RUN_AS_HOST_USER` | `docker_run_as_host_user` | `true` / `false` |
| `TERMINAL_DOCKER_NETWORK` | `docker_network` | `true` / `false` — 既定は `true`。`false` は `--network=none` |
| `TERMINAL_DOCKER_PERSIST_ACROSS_PROCESSES` | `docker_persist_across_processes` | `true` / `false` — 既定は `true` |
| `TERMINAL_DOCKER_SHARED_CONTAINER_KEY` | `docker_shared_container_key` | 信頼できるプロファイル向けの共有の識別子。既定は空 |
| `TERMINAL_DOCKER_ORPHAN_REAPER` | `docker_orphan_reaper` | `true` / `false` — 既定は `true` |
| `TERMINAL_CONTAINER_CPU` | `container_cpu` | CPU のコア数 |
| `TERMINAL_CONTAINER_MEMORY` | `container_memory` | MB |
| `TERMINAL_CONTAINER_DISK` | `container_disk` | MB |
| `TERMINAL_CONTAINER_PERSISTENT` | `container_persistent` | `true` / `false` — バインドマウントする作業用ディレクトリを制御します。`docker_persist_across_processes` とは別物です |
| `TERMINAL_LIFETIME_SECONDS` | `lifetime_seconds` | 放置の片付けまでの時間 |
| `TERMINAL_TEMP_DIR` | `temp_dir` | セッションの一時領域の起点（local のバックエンド） |
| `TERMINAL_TIMEOUT` | `timeout` | コマンドごとのタイムアウト |
| `HERMES_DOCKER_BINARY` | _none_ | 使う docker / podman のパスを固定します |

### ssh のバックエンド {#ssh-backend}

SSH 経由で、離れたサーバー上でコマンドを走らせます。接続の使い回しには ControlMaster を使います（放置しても 5 分は保ちます）。持続シェルは既定で有効なので、状態（作業ディレクトリ、環境変数）はコマンドをまたいで残ります。

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

**仕組み:** 初期化のときに `BatchMode=yes` と `StrictHostKeyChecking=accept-new` で接続します。持続シェルは、離れたホスト上で `bash -l` のプロセスを 1 つ生かし続け、一時ファイルを介してやり取りします。`stdin_data` や `sudo` が必要なコマンドは、自動で 1 回きりの実行に切り替わります。

### modal のバックエンド {#modal-backend}

[Modal](https://modal.com) のクラウドサンドボックスでコマンドを走らせます。タスクごとに、CPU・メモリ・ディスクを指定できる隔離された VM が割り当てられます。ファイルシステムは、セッションをまたいでスナップショットと復元ができます。

```yaml
terminal:
  backend: modal
  container_cpu: 1                 # CPU cores
  container_memory: 5120           # MB (5GB)
  container_disk: 51200            # MB (50GB)
  container_persistent: true       # Snapshot/restore filesystem
```

**必要なもの:** `MODAL_TOKEN_ID` と `MODAL_TOKEN_SECRET` の環境変数、または `~/.modal.toml` の設定ファイルのどちらかです。

**保持について:** 有効にすると、片付けのときにサンドボックスのファイルシステムがスナップショットとして保存され、次のセッションで復元されます。スナップショットは `~/.hermes/modal_snapshots.json` で管理されます。残るのはファイルシステムの状態であって、動いているプロセスや PID 空間、裏のジョブではありません。

**認証情報のファイル:** `~/.hermes/` から自動でマウントされ（OAuth のトークンなど）、コマンドのたびに同期されます。

### daytona のバックエンド {#daytona-backend}

[Daytona](https://daytona.io) の管理された作業環境でコマンドを走らせます。状態を保つための停止と再開に対応しています。

```yaml
terminal:
  backend: daytona
  container_cpu: 1                 # CPU cores
  container_memory: 5120           # MB → converted to GiB
  container_disk: 10240            # MB → converted to GiB (max 10 GiB)
  container_persistent: true       # Stop/resume instead of delete
```

**必要なもの:** `DAYTONA_API_KEY` の環境変数。

**保持について:** 有効にすると、片付けのときにサンドボックスは削除ではなく停止され、次のセッションで再開されます。サンドボックスの名前は `hermes-{task_id}` の形になります。

**ディスクの上限:** Daytona は最大 10 GiB を強制します。それを超える指定は、警告とともに上限まで抑えられます。

### Vercel Sandbox のバックエンド {#vercel-sandbox-backend}

[Vercel Sandbox](https://vercel.com/docs/vercel-sandbox) のクラウド microVM でコマンドを走らせます。Hermes は通常のターミナルとファイルのツールをそのまま使い、Vercel 専用のモデル向けツールはありません。

```yaml
terminal:
  backend: vercel_sandbox
  vercel_runtime: node24          # node24 | node22 | python3.13
  cwd: /vercel/sandbox            # default workspace root
  container_persistent: true      # Snapshot/restore filesystem
  container_disk: 51200           # Shared default only; custom disk is unsupported
```

**必要なインストール:** 任意の SDK を追加で入れます。

```bash
pip install 'hermes-agent[vercel]'
```

**必要な認証:** `VERCEL_TOKEN`、`VERCEL_PROJECT_ID`、`VERCEL_TEAM_ID` の 3 つすべてを使うアクセストークンの認証を設定します。これが、Render、Railway、Docker などのホストで、配備や長く動く通常の Hermes のプロセスに対して支援されている構成です。

手元での 1 回きりの開発向けに、Hermes は短命な Vercel の OIDC トークンも受け付けます。

```bash
VERCEL_OIDC_TOKEN="$(vc project token <project-name>)" hermes chat
```

Vercel のプロジェクトに紐づいたディレクトリからなら、プロジェクト名は省けます。

```bash
VERCEL_OIDC_TOKEN="$(vc project token)" hermes chat
```

OIDC のトークンは短命なので、案内された配備の経路として使うべきではありません。

**実行環境:** `terminal.vercel_runtime` は `node24`、`node22`、`python3.13` に対応します。設定しなければ、Hermes は `node24` を既定にします。

**保持について:** `container_persistent: true` のとき、Hermes は片付けの間にサンドボックスのファイルシステムをスナップショットとして保存し、同じタスクの次のサンドボックスをそこから復元します。スナップショットには、サンドボックスへ複製された Hermes の認証情報、スキル、キャッシュのファイルが含まれることがあります。残るのはファイルシステムの状態だけで、生きたサンドボックスの識別子、PID 空間、シェルの状態、裏で動いているプロセスは残りません。

**裏で動かすコマンド:** `terminal(background=true)` は、Hermes の汎用の、手元以外での裏プロセスの仕組みを使います。サンドボックスが生きている間は、通常のプロセスのツールから、起動、状況確認、待機、ログの表示、終了ができます。片付けや再起動のあとに、Vercel の切り離されたプロセスを取り戻す仕組みは Hermes にはありません。

**ディスクの大きさ:** Vercel Sandbox は、いまのところ Hermes の `container_disk` のつまみに対応していません。`container_disk` は設定しないままにするか、共通の既定値 `51200` にしてください。既定以外の値は、黙って無視されるのではなく、診断とバックエンドの作成の段階で失敗します。

### Singularity / Apptainer のバックエンド {#singularityapptainer-backend}

[Singularity / Apptainer](https://apptainer.org) のコンテナでコマンドを走らせます。Docker が使えない HPC のクラスターや共有の端末のために用意されています。

```yaml
terminal:
  backend: singularity
  singularity_image: "docker://nikolaik/python-nodejs:python3.11-nodejs20"
  container_cpu: 1                 # CPU cores
  container_memory: 5120           # MB
  container_persistent: true       # Writable overlay persists across sessions
```

**必要なもの:** `$PATH` に `apptainer` か `singularity` の実行ファイルがあること。

**イメージの扱い:** Docker の URL（`docker://...`）は自動で SIF ファイルに変換され、キャッシュされます。既存の `.sif` ファイルはそのまま使われます。

**作業用のディレクトリ:** 次の順で決まります。`TERMINAL_SCRATCH_DIR` → `TERMINAL_SANDBOX_DIR/singularity` → `/scratch/$USER/hermes-agent`（HPC の慣習）→ `~/.hermes/sandboxes/singularity`。

**隔離:** `--containall --no-home` を使い、ホストのホームディレクトリをマウントせずに名前空間を完全に分けます。

### ターミナルのバックエンドでよくある問題 {#common-terminal-backend-issues}

ターミナルのコマンドがすぐ失敗する、あるいはターミナルのツールが無効だと報告される場合は、次を確かめてください。

- **local** — 特別な条件はありません。使い始めるときに、いちばん安全な既定です。
- **docker** — `docker version` を実行して Docker が動いているか確かめます。失敗するなら Docker を直すか、`hermes config set terminal.backend local` にします。
- **ssh** — `TERMINAL_SSH_HOST` と `TERMINAL_SSH_USER` の両方が設定されている必要があります。どちらかが欠けていれば、Hermes がはっきりしたエラーをログに出します。
- **modal** — `MODAL_TOKEN_ID` の環境変数か `~/.modal.toml` が必要です。`hermes doctor` で確認できます。
- **daytona** — `DAYTONA_API_KEY` が必要です。サーバーの URL の設定は Daytona の SDK が行います。
- **singularity** — `$PATH` に `apptainer` か `singularity` が必要です。HPC のクラスターではよくあります。

迷ったら `terminal.backend` を `local` に戻し、まずそこでコマンドが走ることを確かめてください。

### 片付けのときの、離れた場所からホストへの状態の同期 {#remote-to-host-state-sync-on-teardown}

**ssh**、**modal**、**daytona** のバックエンドでは、Hermes はセッションの間、あなたの `~/.hermes/` の状態（認証情報のファイル、スキル、キャッシュ）を離れたサンドボックスへ送り込み、片付けのときに **変わった状態のファイルを元へ戻します**。最初に送ったものと内容が違うファイル（内容のハッシュで比べます）は、その場に戻されます。同期対象のディレクトリの下に新しくできた、離れた側のファイル（たとえばエージェントが向こうで作ったスキル）は、対応するホスト側のパスへ写されます。送るだけの認証情報のファイルが、ホスト側で上書きされることはありません。

- 戻す処理は、間隔を空けながら最大 3 回まで再試行し、2 GiB を超える離れた側の書庫は展開を拒みます。
- docker と singularity はバインドマウント（ホストのファイルシステムをそのまま見る形）を使うので、これは要りません。
- 対象は Hermes の状態（`~/.hermes/`）であって、サンドボックスの中の作業ツリーのファイル一般では **ありません**。大事な成果物は、サンドボックスが壊される前にエージェントへ明示的に取り出させてください（たとえば `scp`、`modal volume put`）。

### Docker のボリュームのマウント {#docker-volume-mounts}

docker のバックエンドを使うとき、`docker_volumes` でホストのディレクトリをコンテナと共有できます。各項目は Docker の `-v` と同じ書き方です。`host_path:container_path[:options]` の形になります。

```yaml
terminal:
  backend: docker
  docker_volumes:
    - "/home/user/projects:/workspace/projects"   # Read-write (default)
    - "/home/user/datasets:/data:ro"              # Read-only
    - "/home/user/.hermes/cache/documents:/output" # Gateway-visible exports
```

これは次のような場面で役立ちます。
- エージェントへ **ファイルを渡す**（データセット、設定、参考にするコード）
- エージェントから **ファイルを受け取る**（生成されたコード、レポート、書き出したもの）
- あなたとエージェントが同じファイルに触れる **共有の作業場所**

メッセージングのゲートウェイを使っていて、生成したファイルを
`MEDIA:/...` でエージェントに送らせたい場合は、
`/home/user/.hermes/cache/documents:/output` のような、ホストからも見える専用の書き出し用マウントを用意してください。

- Docker の中では `/output/...` へファイルを書きます
- `MEDIA:` には **ホスト側のパス** を出します。たとえば次のようにします。
  `MEDIA:/home/user/.hermes/cache/documents/report.txt`
- `/workspace/...` や `/output/...` は出さないでください。ホスト側のゲートウェイのプロセスにとっても
  まったく同じパスが存在する場合を除きます

:::warning
YAML では、同じキーが重なると、あとのものが黙って前のものを打ち消します。すでに
`docker_volumes:` のブロックがあるなら、あとからもう 1 つ `docker_volumes:` のキーを足すのではなく、
同じ一覧に新しいマウントをまとめてください。
:::

環境変数でも設定できます。`TERMINAL_DOCKER_VOLUMES='["/host:/container"]'`（JSON の配列）です。

### Docker への認証情報の転送 {#docker-credential-forwarding}

既定では、docker のターミナルのセッションがホストの認証情報を勝手に受け継ぐことはありません。コンテナの中で特定のトークンが必要な場合は、`terminal.docker_forward_env` に足してください。

```yaml
terminal:
  backend: docker
  docker_forward_env:
    - "GITHUB_TOKEN"
    - "NPM_TOKEN"
```

Hermes は並べた変数を、まずいまのシェルから解決し、`hermes config set` で保存されていれば `~/.hermes/.env` を控えとして使います。

:::warning
`docker_forward_env` に並べたものは、コンテナの中で走るコマンドから見えるようになります。ターミナルのセッションに渡してよいと思える認証情報だけを転送してください。
:::

### コンテナをホストの利用者として走らせる {#running-the-container-as-your-host-user}

既定では、Docker のコンテナは `root`（UID 0）として走ります。`/workspace` やほかのバインドマウントの中で作られたファイルは、ホスト側では root の持ち物になるので、セッションのあと、ホストのエディターで編集するには `sudo chown` が要ります。`terminal.docker_run_as_host_user` のフラグがこれを解決します。

```yaml
terminal:
  backend: docker
  docker_run_as_host_user: true   # default: false
```

有効にすると、Hermes は `docker run` のコマンドに `--user $(id -u):$(id -g)` を足すので、バインドマウントしたディレクトリ（`/workspace`、`/root`、`docker_volumes` にあるもの）へ書かれたファイルは、root ではなくホストのあなたの持ち物になります。引き換えに、コンテナの中では `apt install` ができなくなり、`/root/.npm` のような root の持ち物のパスへ書けなくなります。両方が必要なら、`HOME` が root 以外の利用者の持ち物になっている元イメージを使うか、必要なツールをイメージのビルド時に入れておいてください。

従来どおりの動きが必要なら、`false`（既定）のままにします。作業のほとんどが「マウントしたホストのファイルを編集する」ことで、`sudo chown -R` にうんざりしているなら、有効にしてください。

### 任意: 起動したディレクトリを `/workspace` にマウントする {#optional-mount-the-launch-directory-into-workspace}

Docker のサンドボックスは、既定では隔離されたままです。あなたが明示的に選ばない限り、Hermes がいまのホストの作業ディレクトリをコンテナへ渡すことは **ありません**。

`config.yaml` で有効にします。

```yaml
terminal:
  backend: docker
  docker_mount_cwd_to_workspace: true
```

有効にすると、次のようになります。
- `~/projects/my-app` から Hermes を起動した場合、そのホストのディレクトリが `/workspace` にバインドマウントされます
- docker のバックエンドは `/workspace` から始まります
- ファイルのツールもターミナルのコマンドも、同じマウントされたプロジェクトを見ます

無効なときは、`docker_volumes` で明示的に何かをマウントしない限り、`/workspace` はサンドボックスの持ち物のままです。

セキュリティ上の引き換えです。
- `false` はサンドボックスの境界を保ちます
- `true` は、Hermes を起動したディレクトリへサンドボックスから直接触れられるようにします

コンテナにホストの生きたファイルを扱わせたいと意図しているときだけ、有効にしてください。

### 持続シェル {#persistent-shell}

既定では、ターミナルのコマンドはそれぞれ自分の子プロセスで走るので、作業ディレクトリ、環境変数、シェル変数はコマンドごとに戻ります。**持続シェル** を有効にすると、長く生きる bash のプロセスが 1 つ `execute()` の呼び出しをまたいで保たれ、状態がコマンド間で残ります。

これがいちばん効くのは **ssh のバックエンド** で、コマンドごとの接続の手間もなくなります。持続シェルは **ssh では既定で有効** で、local のバックエンドでは無効です。

```yaml
terminal:
  persistent_shell: true   # default — enables persistent shell for SSH
```

無効にするには、次のようにします。

```bash
hermes config set terminal.persistent_shell false
```

**コマンドをまたいで残るもの:**
- 作業ディレクトリ（`cd /tmp` は次のコマンドにも効きます）
- 書き出した環境変数（`export FOO=bar`）
- シェル変数（`MY_VAR=hello`）

**優先順位:**

| 段階 | 変数 | 既定 |
|-------|----------|---------|
| 設定 | `terminal.persistent_shell` | `true` |
| ssh の上書き | `TERMINAL_SSH_PERSISTENT` | 設定に従う |
| local の上書き | `TERMINAL_LOCAL_PERSISTENT` | `false` |

バックエンドごとの環境変数がいちばん優先されます。local のバックエンドでも持続シェルを使いたい場合は、次のようにします。

```bash
export TERMINAL_LOCAL_PERSISTENT=true
```

:::note
`stdin_data` や sudo が必要なコマンドは、自動で 1 回きりの実行に切り替わります。持続シェルの標準入力は、すでにやり取りの仕組みに使われているからです。
:::

各バックエンドの詳しい説明は、[コードの実行](/hermes/docs/user-guide/features/code-execution/) と [README のターミナルの節](/hermes/docs/user-guide/features/tools/) をご覧ください。

## スキルの設定 {#skill-settings}

スキルは、SKILL.md のフロントマターで自分用の設定項目を宣言できます。これらは秘密ではない値（パス、好み、その分野に固有の設定）で、`config.yaml` の `skills.config` の名前空間の下に保存されます。

```yaml
skills:
  config:
    myplugin:
      path: ~/myplugin-data   # Example — each skill defines its own keys
```

**スキルの設定はどう働くか:**

- `hermes config migrate` は有効なスキルをすべて調べ、未設定の項目を見つけて、値を尋ねるかどうかを案内します
- `hermes config show` は「Skill Settings」の下に、どのスキルのものかとともにすべてのスキルの設定を表示します
- スキルが読み込まれると、解決された設定値がスキルの文脈へ自動で渡されます

**値を手で設定する:**

```bash
hermes config set skills.config.myplugin.path ~/myplugin-data
```

自分のスキルで設定項目を宣言する方法は、[スキルを作る — 設定項目](/hermes/docs/developer-guide/creating-skills/#config-settings-configyaml) をご覧ください。

### エージェントが作るスキルの書き込みに対する見張り {#guard-on-agent-created-skill-writes}

エージェントが `skill_manage` でスキルを作成・編集・修正・削除するとき、Hermes は任意で、新しい内容や更新された内容に危険なキーワードの型（認証情報の収集、あからさまなプロンプトの差し込み、情報の持ち出しの指示）がないかを調べられます。この検査は **既定では無効** です。`~/.ssh/` に正当に触れたり `$OPENAI_API_KEY` に触れたりする実際のエージェントの作業が、この見立てに引っかかりすぎたためです。エージェントのスキルの書き込みが反映される前に確認したい場合は、有効に戻してください。

```yaml
skills:
  guard_agent_created: true   # default: false
```

有効にすると、引っかかった `skill_manage` の書き込みは、検査の理由とともに承認の確認として現れます。受け入れれば反映され、拒めばエージェントへ理由を添えたエラーが返ります。

### スキルの書き込みの承認 {#write-approval-for-skill-writes}

上の内容検査とは別に、`skills.write_approval` は、エージェントによる **すべての** スキルの書き込み（作成 / 編集 / 修正 / 削除 / 付随するファイル）を、あなたの明示的な承認の後ろに置きます。危険なコマンドと同じ、承認と拒否の仕組みです。

```yaml
skills:
  write_approval: false   # false = write freely (default) | true = stage every write for review
```

有効にすると、スキルの書き込みは `~/.hermes/pending/skills/` に控えられ、`/skills pending`、`/skills diff <id>`、`/skills approve <id>`、`/skills reject <id>` で確認します。CLI からでも、どのメッセージングの経路からでも行えます。実行中の切り替えは `/skills approval on|off` です。記憶にも同じ関門があります（後述の `memory.write_approval`）。詳しい流れは [エージェントのスキルの書き込みに関門を設ける](/hermes/docs/user-guide/features/skills/#gating-agent-skill-writes-skillswrite_approval) にあります。

## 記憶の設定 {#memory-configuration}

```yaml
memory:
  memory_enabled: true
  user_profile_enabled: true
  memory_char_limit: 2200   # ~800 tokens
  user_char_limit: 1375     # ~500 tokens
  write_approval: false     # true = require approval before any memory write
```

`memory.write_approval: true` にすると、記憶の書き込みは反映される前にあなたの承認を要します。対話的な CLI のやり取りではその場で確認が出ます。メッセージングのセッションと、裏で走る自己改善の見直しでは、書き込みが控えられ、`/memory pending` → `/memory approve <id>` / `/memory reject <id>` の流れで確認します。実行中の切り替えは `/memory approval on|off` です。[記憶の書き込みを制御する](/hermes/docs/user-guide/features/memory/#controlling-memory-writes-write_approval) をご覧ください。

## 文脈ファイルの切り詰め {#context-file-truncation}

先頭と末尾を残す切り詰めを行う前に、自動で読み込まれる各文脈ファイルから Hermes がどれだけ内容を読むかを決めます。これは `SOUL.md`、`.hermes.md`、`AGENTS.md`、`CLAUDE.md`、`.cursorrules` のような、システムプロンプトへ差し込まれるファイルに効きます。`read_file` のツールには影響 **しません**。

```yaml
context_file_max_chars: null  # default — dynamic cap scaled to the model's context window (floor 20K, ceiling 500K chars)
```

自動で決まる動きの代わりに固定の上限を置きたい場合は、正の整数を設定します。

```yaml
context_file_max_chars: 25000
```

文脈ファイルの読み込みには、`context_file_read_timeout`（秒。既定は `5.0`）という制限もかかります。それより時間のかかるファイル — 典型的には iCloud Drive、OneDrive、NFS のようなネットワーク越しのファイルシステム — は警告とともに飛ばされ、システムプロンプトの残りは読み込まれます。

```yaml
context_file_read_timeout: 5.0
```

## ファイル読み込みの安全策 {#file-read-safety}

1 回の `read_file` の呼び出しが返せる量を決めます。上限を超える読み込みは拒まれ、`offset` と `limit` でもっと狭い範囲を読むようエージェントへ伝えるエラーが返ります。これにより、圧縮された JS の塊や大きなデータファイルを 1 回読んだだけで文脈の窓があふれるのを防げます。

```yaml
file_read_max_chars: 100000  # default — ~25-35K tokens
```

文脈の窓が大きいモデルを使っていて、大きなファイルをよく読むなら上げてください。文脈の小さいモデルでは、読み込みを無駄なく保つために下げます。

```yaml
# Large context model (200K+)
file_read_max_chars: 200000

# Small local model (16K context)
file_read_max_chars: 30000
```

エージェントは、ファイルの読み込みを自動で重複除去もします。同じファイルの同じ範囲を 2 度読んで、その間にファイルが変わっていなければ、内容を送り直す代わりに軽い代替が返ります。これは文脈の圧縮でリセットされるので、内容が要約されて消えたあとにエージェントがファイルを読み直せます。

## ツール出力の切り詰めの上限 {#tool-output-truncation-limits}

Hermes が切り詰めるまでに、ツールがどれだけの生の出力を返せるかを、3 つの関連する上限が決めます。

```yaml
tool_output:
  max_bytes: 50000        # terminal output cap (chars)
  max_lines: 2000         # read_file pagination cap
  max_line_length: 2000   # per-line cap in read_file's line-numbered view
```

- **`max_bytes`** — `terminal` のコマンドが標準出力と標準エラーを合わせてこの文字数を超える出力を出した場合、Hermes は先頭の 40% と末尾の 60% を残し、その間に `[OUTPUT TRUNCATED]` の断り書きを挟みます。既定は `50000` です（よくあるトークン化の仕方で、おおよそ 12〜15K トークンです）。
- **`max_lines`** — 1 回の `read_file` の呼び出しの `limit` の上限です。これを超える指定は抑えられるので、1 回の読み込みで文脈の窓があふれることはありません。既定は `2000` です。
- **`max_line_length`** — `read_file` が行番号付きの表示を出すときの、1 行あたりの上限です。これより長い行はこの文字数で切られ、`... [truncated]` が続きます。既定は `2000` です。

1 回あたりの生の出力に余裕がある、文脈の窓が大きいモデルでは上げてください。文脈の小さいモデルでは、ツールの結果をこぢんまり保つために下げます。

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

### ツールの結果を退避させる余地 {#tool-result-spillover-budget}

切り詰めとは別に、大きすぎるツールの *結果* は切るのではなくディスクへ退避されます。出力の全体は `$HERMES_HOME/cache/spillover/` の下に保存され、文脈に載る内容は、その一部と保存先のファイルのパスに置き換わります（`offset` と `limit` を使った `read_file` で読めますし、`execute_code` で処理することもできます）。結果ごとの一般的な退避のしきい値は 100,000 文字で、文脈の小さいモデルでは自動的に下げられます。

MCP のツールの結果（`mcp_*` という名前のツール）は、もっと厳しい **50,000 文字** を既定にしています。MCP のサーバーは、区切られていない大きなかたまり（ツールの一覧、まとめて実行した結果）をよく返し、それが一般的なしきい値の下に収まってしまうと、以降のやり取りのたびに文脈をふくらませるからです。失われるものはありません。結果の全体はディスクに残ります。しきい値は次のように上書きできます。

```yaml
tool_budget:
  mcp_result_size_chars: 50000   # per-result spillover threshold for mcp_* tools
```

MCP のしきい値は、（文脈に応じて調整された）一般的な結果ごとのしきい値を常に上限とします。したがって、上げたとしても、使用中のモデルの窓が許す範囲を超えることはありません。

Hermes は **プロバイダー側での省略** にも印を付けます。MCP や Web のツールの結果が、自分自身の切り詰めの目印（`...N more items`、`"has_more": true`、「サンドボックスへ保存しました」といった記述）を含んでいる場合、見えているデータが不完全であり、列挙が完全だと考える前にページをたどるか取り直すべきだ、という 1 行の断り書きが結果に足されます。

## ツールセットを全体で無効にする {#global-toolset-disable}

CLI とすべてのゲートウェイの経路にまたがって、特定のツールセットを 1 か所で
止めたい場合は、その名前を `agent.disabled_toolsets` の下に並べます。

```yaml
agent:
  disabled_toolsets:
    - memory       # hide memory tools + MEMORY_GUIDANCE injection
    - web          # no web_search / web_extract anywhere
```

これは経路ごとのツールの設定（`hermes tools` が書く `platform_toolsets`）の
**あと** に適用されるので、ここに並べたツールセットは必ず取り除かれます。ある経路の
保存された設定にまだ載っていても同じです。`hermes tools` の画面で 15 以上の行を
編集するのではなく、「これをどこでも切る」という 1 つのスイッチが欲しいときに使ってください。

一覧を空にしても、キー自体を書かなくても、何も起きません。

## git の worktree による隔離 {#git-worktree-isolation}

同じリポジトリで複数のエージェントを並行して動かすために、隔離された git の worktree を有効にします。

```yaml
worktree: true    # Always create a worktree (same as hermes -w)
# worktree: false # Default — only when -w flag is passed
```

有効にすると、CLI のセッションごとに `.worktrees/` の下へ、自分のブランチを持つ新しい worktree が作られます。エージェントは互いに邪魔することなく、ファイルを編集し、コミットし、push し、PR を作れます。きれいな worktree は終了時に取り除かれ、変更が残っているものは手で回収できるように保たれます。

既定では、新しい worktree は **取得したての遠隔の先端** から枝分かれします（いまのブランチの上流、なければ遠隔の既定のブランチ）。これにより、手元の複製の古くなっているかもしれない `HEAD` からではなく、プロジェクトの最新の状態から始まります。おかげで PR の差分は実際の変更だけに絞られ、手元の複製が遅れていた分を引きずりません。手元の `HEAD` から枝分かれさせたい場合は `worktree_sync: false` にしてください。ネットワークのないところや、複製のいまの状態をそのまま土台にしたいときに役立ちます。遠隔に届かない場合は、自動的に手元の `HEAD` へ切り替わります。

```yaml
worktree_sync: true    # Default — branch from the fetched remote tip
# worktree_sync: false # Branch from local HEAD (offline / pinned base)
```

リポジトリの起点に `.worktreeinclude` を置けば、git が無視しているファイルのうち worktree へ複製したいものを並べられます。

```
# .worktreeinclude
.env
.venv/
node_modules/
```

## 文脈の圧縮 {#context-compression}

Hermes は、モデルの文脈の窓に収まるよう、長い会話を自動で圧縮します。圧縮の要約は別の LLM の呼び出しで行われるので、どのプロバイダーやエンドポイントにも向けられます。

圧縮の設定はすべて `config.yaml` にあります（環境変数はありません）。

### 設定の一覧 {#full-reference}

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

:::info 従来の設定からの移行
`compression.summary_model`、`compression.summary_provider`、`compression.summary_base_url` を持つ古い設定は、最初の読み込みのときに自動で `auxiliary.compression.*` へ移されます（設定のバージョン 17）。手作業は要りません。
:::

`progress_notices`（既定は `false`）は、**通常の** 圧縮の進み具合をチャットの経路（Telegram、Discord、Slack など）へ届けるかどうかを決めます。設計上、自動の圧縮はチャットの画面では静かに進みます。裏で走り、記録はサーバー側だけです。`progress_notices: true` にすると、チャットの経路でも通常の流れが見えるようになります。「Compacting context…」の開始の知らせ、事前確認や API 呼び出し前の圧縮のきっかけ、放置による圧縮、やり直しの進み具合（「Compressed 30 → 12 messages, retrying…」）、そして「Context compaction complete」の知らせです。この関門が効くのは圧縮に関する知らせだけで、関係のない運用上の雑音（補助モデルの失敗、プロバイダーの流量制限や再試行のやり取り）は、どちらの設定でも抑えられたままです。圧縮の **失敗** の知らせと、手動の `/compress` に対する反応は、この設定にかかわらず常に見えます。動作中のゲートウェイでこの値を書き換えると、次のメッセージから効きます。

`hygiene_hard_message_limit` は、ゲートウェイだけの **圧縮前の安全弁** です。これは悪循環を断ち切るためにあります。大きくなりすぎたセッションで API の呼び出しが切断され続けると、ゲートウェイはトークンの使用量を受け取れず、トークンに基づくしきい値が働かず、やり取りは伸び続け、切断はさらに悪化します。この件数に基づく下限は、（API の失敗にかかわらず必ず分かる）メッセージの数だけで働き、圧縮を強制してセッションを立て直します。既定は `5000` で、通常のセッションよりはるかに大きい値です。短いやり取りを何千回も重ねる、文脈の大きな（100 万以上の）モデルでも、これよりずっと前にトークンのしきい値で圧縮されます。変わった経路ではもっと上げ、より強く圧縮したいなら下げてください。動作中のゲートウェイでこの値を書き換えると、次のメッセージから効きます（後述）。

`hygiene_timeout_seconds` は、このエージェントの手前で行う圧縮に対する、ゲートウェイの **無反応の許容時間** です。全体の経過時間の上限ではありません。圧縮の要約の呼び出しはモデルから逐次届き、届いたトークンはどれも前進とみなされます。ゆっくり考えるモデルでも、生成を続けている限り自分で期限を延ばしていくので、遅くても健全な要約のモデルが生成の途中で切られることはありません。要約のモデルがこの秒数のあいだ **まったく出力しない** ときにだけ（バックエンドの停止、固まった接続、黙り込んだプロバイダー）、ゲートウェイは利用者に警告し、届いたメッセージを圧縮せずに処理し、固まったように見せる代わりに、そのセッションに一時的な失敗の待機時間を記録します。

`hygiene_total_ceiling_seconds`（既定は `600`）は、トークンがまだ動いている間でも待ち時間の総量に上限を設けるので、ちょろちょろとしか流れない異常な状態が、やり取りをいつまでも人質に取ることはありません。この値は、少なくとも `hygiene_timeout_seconds` 以上に抑えられます。

`hygiene_max_turn_hold_seconds`（既定は `10`）は、ゲートウェイの **やり取りを保留できる時間** です。届いたメッセージが圧縮を待って保留される最長の実時間で、これを過ぎるとゲートウェイは待つのをやめ、圧縮していないやり取りのまま先へ進みます。これがあるのは、`hygiene_total_ceiling_seconds` だけでは、チャットの通信路が放置とみなす時間よりはるかに長く回線が黙り込みうるからです。要約のモデルがトークンを流し続けると無反応の枠は何度もリセットされるので、この保留の上限がないと、利用者に 1 バイトも届かないまま待ち時間が上限へ向かって伸びてしまいます。すると Telegram（や似た通信路）が接続を切り、やり取りは固まったように見えます。やり取りの待ち時間をこの範囲（よくある約 30 秒の放置時間よりずっと短い値）に抑えることで、メッセージには速やかに返せます。**上限を過ぎても圧縮が失われることはありません。** 作業は切り離されたまま続き、その反映が水位で守られている場合（セッションの DB があれば通常はこちらです）は反映する権利を保つので、出来上がった要約は次の安全な区切りで取り込まれ、待つのをやめたあとに足されたやり取りは、あとから並んだ末尾としてそのまま残ります。これは、考える段階だけで上限を超えうる **推論型の要約モデル**（DeepSeek、QwQ など）でとくに効いてきます。要約が「まったく届かない」のではなく「1 回分遅れて届く」ようになるからです。反映を安全に守れない場合、遅れた結果は捨てられ（`CompressionCommitFence`）、新しいやり取りを上書きすることはありません。同じやり取りの中で圧縮を効かせたく、通信路がその待ち時間に耐えられるなら上げてください。とても遅いバックエンドで素早く立て直したいなら下げてください。

`hygiene_failure_cooldown_seconds` は、圧縮が時間切れになったり中断したりしたあとの、セッションごとの待機時間を決めます。この待機の間、ゲートウェイは同じ大きすぎるセッションに対する圧縮の再試行を飛ばすので、届くメッセージのたびに同じ壊れた補助バックエンドで止まることはありません。`/compress`、`/reset`、あるいはあとの健全なやり取りで、セッションは立て直せます。

この値は固定の間隔ではなく、段階的に伸びる階段の **最初の段** です。同じセッションで失敗が続くと、この値の `1x`、`3x`、`9x` と待ち、上限は 1 時間です。要約のモデルが完全に壊れているセッションは、固定の間隔で永遠に再試行するのではなく、間隔を広げていきます。実際にやり取りを縮められた実行があれば、最初の段に戻ります。この段階の上がり方はセッションごとで、プロセスの中だけの記録です。ゲートウェイを再起動すると最初の段に戻りますが、待機の期限そのものは残ります。

`context_timeout_seconds`（既定は `120`）は、エージェントの中で行う `compress_context` — 会話の繰り返し、事前の圧縮、手動の `/compress` — に対する同じ **無反応の許容時間** です。固まった要約のモデルが、セッションをいつまでも止めてしまわないようにします。逐次届く要約のトークンは待ち時間を延ばし、黙り込んだ作業だけが打ち切られます。時間切れになると、Hermes は `auxiliary.compression.fallback_chain` の最初の項目に対して要約を 1 回だけやり直します（その項目が自分の `timeout` を宣言していれば、それを使います）。止まった経路は例外を投げないので、補助のクライアント自身の切り替え処理からは見えないからです。その試みも失敗したとき、あるいは切り替え先が設定されていないときにだけ、Hermes は圧縮を諦め、いまのメッセージを保ち、利用者に警告します。無効にするには `0` を設定します。ゲートウェイのセッションの手入れは独自の `hygiene_timeout_seconds` の経路を持ち、二重に包まれることはありません。

`context_total_ceiling_seconds`（既定は `600`）は、トークンがまだ動いている間でも、エージェントの中での **反映前** の待ち時間（要約と逐次受信の段階）に上限を設けます。この値は、少なくとも `context_timeout_seconds` 以上に抑えられます。約束の内容は正確には、**要約の段階はこの上限に収まり、反映の段階は上限を超えたら記録して知らせる** というものです。作業が圧縮の反映の守りに入り、セッション DB の書き換えが進行中になったら、その反映が途中で捨てられることはありません。やり取りの内容が食い違う恐れがあるからです。ただし、その待ち時間はもう黙ってはいません。反映が上限を過ぎたら、Hermes は超過を記録し（WARNING、繰り返せば ERROR に上がります）、利用者に見える警告の経路から 1 回だけ知らせ、反映が終わるまで区切りながら待ち続けます。要約の段階で上限が切れた場合、要約のモデルからの受信は、どの補助の通信方式（chat.completions、Codex の Responses、Anthropic の Messages）でも同じ瞬間に閉じられます。誰も待っていない接続の上で、捨てられる要約が最後まで課金されることはなく、そのセッションの占有も次の試みのために解放されます。

`protect_first_n` は、圧縮のたびに固定される **システム以外の** 先頭のメッセージの数を決めます。既定は `3` で、最初の利用者とアシスタントのやり取りが毎回の要約を生き延びるので、当初の目的が見えたままになります。圧縮を延々と繰り返す長寿命のセッションで、最初のやり取りがもう関係ないなら、`protect_first_n: 0` にして、システムプロンプトと要約と末尾だけを残してください。システムプロンプト自体は、この設定にかかわらず常に保たれます。

`in_place`（既定は `true`）は、圧縮が起きたときにセッションの識別子がどうなるかを決めます。`true` のとき、圧縮はメッセージの一覧を書き換えてシステムプロンプトを組み直しますが、**セッションの識別子を切り替えません**。会話は一生を通じて 1 つの識別子を持ちます（`parent_session_id` の連なりも、セッション一覧での `name #2` / `#3` の番号付けもありません）。圧縮は破壊的ではありません。いま使う文脈は縮められますが、圧縮前のやり取りは同じ識別子の下に控えとして残り（無効・圧縮済みの印が付きます）、`session_search` で探せて取り戻せます。削除はされません。フックからは、`session:compress` のイベントの `in_place` の欄でこのモードが分かります。`in_place: false` にすると、圧縮のたびに新しいセッションの識別子へ切り替わり、古いものと結び付けられる従来の動きに戻ります。

`threshold_tokens` は、圧縮のきっかけに対する任意の **絶対的なトークンの上限** を設定します。設定すると、割合に基づく `threshold` とこの絶対値の、小さいほうで圧縮が始まります。つまり、どのモデルを使っていても、あなたが望むトークン数より遅く圧縮が始まることはありません。これは、文脈の窓が違うモデルを行き来する（たとえば 100 万から 40 万へ）と、実際の起点がずれてしまう問題を解きます。この上限はモデルの文脈の長さまでに抑えられるので、モデルが対応する以上の値を設定しても安全です。その場合は割合に基づくしきい値が使われます。既定は `null`（無効。割合に基づくしきい値だけ）です。この上限は、モデルの切り替えや代替への切り替えを越えて残ります。

`idle_compact_after_seconds` は、大きさに基づく `threshold` を補う、**任意で有効にする時間に基づく** きっかけです。既定は `0`（無効）です。0 より大きい値にすると、その秒数以上動きがなかったあとに再開したセッションは、最初の返答の前に、溜まった履歴をまず圧縮します。おかげで長く続くやり取り（たとえば数時間後に戻ってくる Telegram の会話）が、以降のやり取りのたびに古い文脈を丸ごと読み直すことはなくなります。文脈がすでに圧縮後の目標（`threshold × target_ratio`）以下のときは働かず、失敗後の待機、行き過ぎの防止、セッションごとの排他といった、すべての自動圧縮と同じ守りに従います。例として、`idle_compact_after_seconds: 1800` は 30 分放置したあとに圧縮します。

`proactive_prune_tokens` は、古いツールの結果を LLM を使わずに決まった手順で刈り込む処理を有効にします。これは `threshold` とは独立して働きます。窓の大きなモデルでは `threshold` による圧縮（窓のおよそ 50%）がめったに起きないので、かさばるツールの出力（ターミナルの吐き出し、ファイルの読み込み、Web の抽出）が履歴に乗ったまま、以降のやり取りのたびに送り直されます。送り直される履歴が `proactive_prune_tokens`（既定は `0` = 無効。有効にするなら `48000` を試してください）を超えると、この刈り込みは同一の結果をまとめ、古くて大きなものを要約し、大きなツールの呼び出しの引数を切り詰めます。直近の `protect_last_n` 件のメッセージは守られ、モデルを呼ぶことはありません。出力の全体は、セッションの保管先から取り戻せます。`proactive_prune_min_result_chars`（既定は `8000`、200 以上に抑えられます）は、これより小さいツールの結果には手を付けない、という下限です。`proactive_prune_min_reclaim_tokens`（既定は `4096`）は、その分だけトークンを取り戻せない限り刈り込みを反映させません。反映された刈り込みは、すでに送った履歴を書き換え、プロバイダーのプロンプトキャッシュの前半を無効にします。この関門があることで、そうしたキャッシュの切れ目は（圧縮の区切りのような）意味のある 1 回に留まり、ツールを使うたびに起きることはなくなります。これは組み込みの `compressor` の仕組みの下でだけ働き、ほかの文脈の仕組みでは何も起きません。

:::tip 圧縮と文脈の長さのゲートウェイでの即時反映
最近の版では、動作中のゲートウェイで `config.yaml` の `model.context_length` や `compression.*` のキーを書き換えると、次のメッセージから効きます。ゲートウェイの再起動も、`/reset` も、セッションの切り替えも要りません。キャッシュされたエージェントの見分けにこれらのキーが含まれているので、変化を見つけるとゲートウェイが裏でエージェントを組み直します。API キーやツール・スキルの設定は、これまでどおりの読み込み直しの手順が必要です。
:::

### よくある構成 {#common-setups}

**既定（自動判定） — 設定は要りません:**
```yaml
compression:
  enabled: true
  threshold: 0.50
```
主となるプロバイダーとモデルを使います。主に使うチャットのモデルより安いモデルで圧縮したい場合は、用途ごとに上書きしてください（たとえば `auxiliary.compression.provider: openrouter` と `model: google/gemini-2.5-flash`）。

**特定のプロバイダーを指定する**（OAuth でも API キーでも）:
```yaml
auxiliary:
  compression:
    provider: nous
    model: gemini-3-flash
```
どのプロバイダーでも使えます。`nous`、`openrouter`、`codex`、`anthropic`、`main` などです。

**独自のエンドポイント**（自前で動かすもの、Ollama、zai、DeepSeek など）:
```yaml
auxiliary:
  compression:
    model: glm-4.7
    base_url: https://api.z.ai/api/coding/paas/v4
```
OpenAI 互換の独自のエンドポイントを指します。認証には `OPENAI_API_KEY` を使います。

### 3 つのつまみの関係 {#how-the-three-knobs-interact}

| `auxiliary.compression.provider` | `auxiliary.compression.base_url` | 結果 |
|---------------------|---------------------|--------|
| `auto`（既定） | 未設定 | 使える中でいちばん良いプロバイダーを自動で選びます |
| `nous` / `openrouter` など | 未設定 | そのプロバイダーを使い、その認証を用います |
| 何でも | 設定あり | その独自のエンドポイントを直接使います（プロバイダーは無視されます） |

:::warning 要約のモデルの文脈の長さについて
要約のモデルの文脈の窓は、主に使うエージェントのモデルと同じか、それ以上でなければ **なりません**。圧縮の処理は、会話の中ほど全体を要約のモデルへ送ります。そのモデルの窓が主モデルより小さいと、要約の呼び出しは文脈の長さのエラーで失敗します。そうなると中ほどのやり取りは **要約されないまま落とされ**、会話の文脈が静かに失われます。モデルを上書きするときは、その文脈の長さが主モデル以上であることを確かめてください。
:::

## ゲートウェイのやり取りの占有の時間切れ {#gateway-turn-lease-timeout}

ゲートウェイは、解決されたセッション ID ごとにやり取りを順番に並べるので、2 つの振り分けの
キーが同じやり取りの記録を同時に読み書きすることはありません。この占有を待つ最大の時間は、
通常のエージェントの無反応の時間切れとは別に設定できます。

```yaml
agent:
  gateway_turn_lease_timeout: 5
```

この時間を過ぎてもほかのやり取りがそのセッションの占有を握っている場合、Hermes は
安全側に倒れます。待っているメッセージのために、やり取りの記録を読むことも、モデルを
動かすこともしません。利用者には拒否の知らせが届き、送り直しが必要です。Hermes が
自動で並べ直さないのは、確実な順序と重複防止のないままそうすると、2 回処理してしまう
恐れがあるからです。0 以下の値を設定すると、既定の 5 秒が使われます。

## セッションの停滞の見張り {#session-stall-watchdog}

ゲートウェイは、知らせるだけの停滞の見張りを動かしています（`agent.session_stall_timeout`、既定は `300` 秒、`0` で無効）。処理中のセッションに **届いたまま待っている続きのメッセージ** があり、エージェントの共有の活動時計がこの時間以上動いていない場合、ゲートウェイは WARNING を記録し、利用者へ一度だけ知らせを送ります。

```
⚠️ Agent session appears stalled (last activity N min ago). Try /new to reset.
```

意味するところは次のとおりです。

- **知らせるだけです。** この見張りがやり取りを止めることはありません。長く反応がないときに実行を打ち切る `agent.gateway_timeout` とは対照的です。停滞の知らせは、エージェントが詰まっているように見えることを伝えるだけなので、どうするか（`/new`、`/stop`、待ち続ける）はあなたが決められます。
- **1 回の停滞につき知らせは 1 度だけです。** 待っていたメッセージがはけるか、活動が戻ると留め金が外れるので、立ち直ったあとにまた停滞すれば、もう一度知らせが出ます。
- 前進とみなされるのは、共有の活動の記録（ツールの呼び出し、API の受信の進み、圧縮の生存信号）だけです。待っているメッセージは知らせを出す条件であって、前進を測る時計ではありません。

```yaml
agent:
  session_stall_timeout: 300   # seconds; 0 disables the watchdog
```

## 再接続の注意喚起 {#reconnect-attention-escalation}

経路のアダプターが接続に失敗すると（ネットワークの障害、取り消されたボットのトークン、壊れた補助プロセス）、ゲートウェイは間隔を広げながら無期限に再試行します。再試行が止まらないので、一時的な障害は運用の手を借りずに必ず自然に直ります。弱点は、*恒久的な* 失敗（取り消された Telegram のトークン、足りない Discord の特権インテント）が、一瞬の不調と見分けが付かないことです。どちらも「再試行中」のまま、いつまでも続きます。

恒久的な失敗を見えるようにする仕組みが 2 つあります。

- **終端としての分類。** 例外の *種類* から、決して自然には直らないと分かる失敗 — 拒否・取り消しされたトークン（`telegram_auth_error`、`discord_auth_error`、`email_auth_error`）、足りない特権インテント（`discord_intents_required`）、依存関係を入れられない Photon の補助プロセス（`SIDECAR_DEPS_MISSING`）やその node の実行ファイルがない場合（`SIDECAR_NODE_MISSING`） — は、再試行の列に入らず致命的として印を付けられます。分類は厳密に種類だけで行われ、判断の付かないエラーは常に再試行を続けます。
- **要対応への引き上げ。** `agent.reconnect_attention_after`（既定は `7200` 秒 = 2 時間、`0` で無効）を超えて再試行の列に居続けた経路は、ゲートウェイの実行時の状態（`hermes status`）で `needs_attention: true` と `retrying_since` の時刻を持ち、WARNING もログに出ます。再試行はそのまま続きます。これは合図であって、遮断の仕組みではありません。この印は、再接続に成功すると消えます。

```yaml
agent:
  reconnect_attention_after: 7200   # seconds; 0 disables the escalation flag
```

## ゲートウェイのエージェントのキャッシュ {#gateway-agent-cache}

ゲートウェイはセッションごとにエージェントを 1 つ保持するので、会話は毎回システムプロンプトを組み直すのではなく、キャッシュされたプロンプトの前半を再利用します。そのキャッシュされたエージェントは、セッションのやり取りの記録も丸ごと持っています。ツールの出力も含まれるので、ツールを百回呼んだセッションでは数十メガバイトになります。したがって、複数の経路をさばく忙しいゲートウェイでは、このキャッシュがプロセスの中でいちばんメモリーを使います。

```yaml
agent:
  agent_cache:
    max_size: 128            # LRU entry cap
    idle_ttl_secs: 3600      # evict an agent idle this long
    memory_high_mb: auto     # anon-RSS budget; number, "auto", or 0/off
    max_evictions_per_pass: 16
    protect_recent: 8
```

`max_size` と `idle_ttl_secs` は、キャッシュを件数と時間で抑えます。どちらも何バイト持っているかは知らないので、`memory_high_mb` が 3 つ目の抑えを足します。ゲートウェイ自身の無名の常駐メモリーがこの上限を超えると、いちばん長く使われていないやり取りの記録を手放し、それらは次のやり取りのときに保存済みのセッションから読み直されます。ゲートウェイがほかのサービスとメモリーを取り合っているなら下げ、どの前半も温かいまま保ちたいなら上げてください（`0` にするとこの処理自体が止まります）。

`auto` は、ゲートウェイが実際に動いている環境のメモリーの上限から値を導きます。コンテナや systemd のユニットなら cgroup の上限、そうでなければ RAM の総量です。おかげで、ユニットの `MemoryMax` / `MemoryHigh` が尊重され、同期して保つべき数値がもう 1 つ増えることはありません。

やり取りの途中のセッション、`protect_recent` の分だけ直近に使われたもの、そしてやり取りの記録をディスクへ書き終えていないセッションは、決して手放されません。手放しは、測った常駐メモリー量と、外したセッションとともに WARNING として記録されます。

```
Agent cache pressure: anon RSS 6802MB over budget 6656MB — evicting 5 LRU session(s): ...
```

## 文脈の仕組み {#context-engine}

文脈の仕組みは、モデルのトークンの上限に近づいたときに会話をどう扱うかを決めます。組み込みの `compressor` は、内容を落とす要約を使います（[文脈の圧縮](/hermes/docs/developer-guide/context-compression-and-caching/) をご覧ください）。プラグインの仕組みは、これを別のやり方に置き換えられます。

```yaml
context:
  engine: "compressor"    # default — built-in lossy summarization
```

プラグインの仕組みを使う場合は（たとえば内容を落とさない文脈管理の LCM）、次のようにします。

```yaml
context:
  engine: "lcm"          # must match the plugin's name
```

プラグインの仕組みが **自動で有効になることはありません**。`context.engine` にプラグインの名前を明示的に設定する必要があります。使える仕組みは `hermes plugins` → Provider Plugins → Context Engine から見て選べます。

記憶のプラグインについての、同じように 1 つだけ選ぶ仕組みは [記憶のプロバイダー](/hermes/docs/user-guide/features/memory-providers/) をご覧ください。

## 繰り返しの上限 {#iteration-budget}

エージェントがツールを何度も呼ぶ込み入った作業に取り組んでいると、繰り返しの上限（既定は 500 回）を使い切ることがあります。Hermes は作業の途中で急かす警告を差し込むことは **ありません**。以前の版は上限の 70% と 90% でモデルに警告していましたが、そのせいでモデルが込み入った作業を早々に投げ出すことがあり、2026 年 4 月に取り除かれました。

その代わり、上限を実際に使い切ったとき（500 / 500）には、まとめに入るよう頼むメッセージを 1 つ差し込み、最後の返答を出せるように **猶予の呼び出し** を 1 回だけ許します。その猶予の呼び出しでも文章が出てこない場合は、何を成し遂げたかをまとめるよう頼みます。

```yaml
agent:
  max_turns: none              # Iterations per conversation turn (default: none = unlimited)
                               # Set a positive integer to cap; "none"/"null"/
                               # "unlimited"/"inf"/"infinity"/"infinite"/0/-1 = no limit
  api_max_retries: 3           # Retries per provider before fallback engages (default: 3)
```

`agent.max_turns` は **既定で無制限** です。回数の上限は、解決するより多くの問題（作業の途中で黙って打ち切られること）を生んだので、そのままの Hermes は会話のやり取りを最後まで走らせます。上限を設けたい場合は正の整数を設定してください。「上限なし」を明示したい場合は、大文字小文字を問わず次のどの書き方でも通ります。`"none"`、`"null"`、`"unlimited"`、`"infinite"`、`"infinity"`、`"inf"`、`0`、`-1` です（これらは `sys.maxsize` の目印に解決されるので、回数で処理が終わることはありません）。

`agent.api_max_retries` は、一時的なエラー（流量制限、接続断、5xx）が起きたときに、代替プロバイダーへの切り替えが働く **前** に、Hermes がプロバイダーの API 呼び出しを何回やり直すかを決めます。既定は `3` で、合わせて 4 回試みます。[代替プロバイダー](/hermes/docs/user-guide/features/fallback-providers/) を設定していて、もっと早く切り替えたい場合は `0` にしてください。主のプロバイダーで最初に一時的なエラーが起きた時点で、不安定なエンドポイントに再試行を重ねずに、すぐ代替へ渡ります。

## 実時間での実行の上限 {#wall-clock-run-budget}

繰り返しの上限とは別に、会話の実行ごとに任意の **実時間** の上限を設けられます。これは、外側から厳しい上限を課された環境（たとえば作業ごとに 900 秒）で走る、1 回きりの呼び出しや評価用の枠組みのために用意されています。これがないと、作業は実質終わっているのに時間切れになることがあります。最後の答えを出す 1 回の生成が足りなかったり、固まったプロバイダーの呼び出し 1 つに引っかかっていたりするからです。

```yaml
agent:
  run_budget_seconds: null     # Optional; unset/null = feature fully off (default)
```

あるいは、CLI から実行ごとに指定します。

```bash
hermes chat --run-budget 850 -q "..."
```

上限を設定すると、2 つのことが起きます。

1. **80% でまとめに入る知らせ。** 上限の 80% が過ぎると、Hermes は **1 回だけ** の知らせを差し込み（キャッシュを壊さない形で、`/steer` のメッセージと同じくいちばん新しいツールの結果に足されます）、新しい調査や確認をやめて、いま持っている情報から最終的な成果を出すようモデルに伝えます。実行ごとに多くても 1 回で、既存の繰り返しの上限のまとめの仕組みと同じ形です。急かす警告が繰り返されることはありません。
2. **残り時間に合わせた停止検出。** 明示していない場合の逐次通信でない停止検出（既定の 90 秒や、推論型モデルの下限。たとえば DeepSeek の推論モデルなら 600 秒）は、`max(60, remaining_budget × 0.5)` に抑えられるので、黙って固まった 1 回のプロバイダーの呼び出しが、実行の残りを食い尽くすことはありません。この抑えは時間を *短く* するだけで、伸ばすことはありません。明示的に設定した `stale_timeout_seconds`（プロバイダーやモデルの設定、あるいは `HERMES_API_CALL_STALE_TIMEOUT`）は、常にそのまま優先されます。

この上限は `run_conversation` のやり取りごとで（利用者のメッセージのたびにリセットされます）、設定していなければこの機能は完全に眠っています。時計を読むことも、何かを差し込むことも、時間切れの扱いを変えることもありません。

## 終わる前の確認（コードの検証） {#verify-on-stop-coding-verification}

有効にすると、エージェントが作業場所のコードを編集したのに、新しい検証の証拠（テストが通った、ビルドできた、リントを通した、など）を出していないやり取りでは、Hermes は最終的な答えを受け入れません。検証するか、できない理由を説明するよう頼む続きのメッセージを差し込みます。文書やマークダウン、スキルだけの編集ではこれは働かず、繰り返しには上限があるので、エージェントが閉じ込められることもありません。

```yaml
agent:
  verify_on_stop: false        # true | false | "auto" (surface-aware: on for CLI/TUI/desktop, off for messaging)
  verify_guidance: true        # Append creative-UI / clean-diff guidance to the missing-evidence nudge
  max_verify_nudges: 3         # Cap on consecutive continue nudges per turn (built-in + pre_verify hooks)
  coding_instructions: ""      # Standing project-wide coding rules appended to the coding brief
```

`verify_on_stop` は `true`（どこでも有効）、`false`（無効。既定）、`"auto"`（従来の画面に応じた動き。対話的にコードを書く画面 — CLI、TUI、デスクトップ — とプログラムからの呼び出しでは有効、検証の説明が雑音に読める Telegram や Discord のようなメッセージングの画面では無効）を受け付けます。既定はどこでも無効です。新しくインストールした環境は `false` で、設定の移行は既存の環境でも無効にしたので、有効にするのは明示的な選択になります。`HERMES_VERIFY_ON_STOP` の環境変数を設定すると、設定の値より優先されます。

同じ地点で、利用者やプラグインの方針による関門を置きたい場合 — 自分の検査でエージェントを進ませ続けたい場合 — は、[`pre_verify` のフック](/hermes/docs/user-guide/features/hooks/#pre_verify) をご覧ください。

## 立てておく目標（`/goal`） {#standing-goals-goal}

目標を立てている間、Hermes はアシスタントの応答がそれを満たしているかを判定します。満たしていなければ、同じセッションへ続きの指示を戻し、目標が達成されるか、やり取りの上限を使い切るか、利用者が一時停止または解除するまで作業を続けます。実際の歯止めになるのはやり取りの上限です。判定の失敗は **通す側** に倒れる（続ける）ので、不安定な判定が前進を止めてしまうことはありません。

```yaml
goals:
  max_turns: 20   # Max continuation turns before Hermes auto-pauses the goal (default: 20)
```

`max_turns` は、Hermes が自動で一時停止して `/goal resume` を促すまでに、1 つの目標が何回まで続きのやり取りを引っ張れるかを決めます。判定の見落とし（実際は達成しているのに続けろと言う）と、あいまいだったり達成しようのない目標にモデルの費用が際限なくかかるのを防ぎます。この機能の全体は [目標](/hermes/docs/user-guide/features/goals/) をご覧ください。

### API の時間切れ {#api-timeouts}

Hermes は逐次通信に対して段階の違う時間切れをいくつか持ち、それとは別に、逐次通信でない呼び出しのための停止検出があります。停止検出が手元のプロバイダーに合わせて自動調整されるのは、明示せず既定のままにしている場合だけです。

| 時間切れ | 既定 | 手元のプロバイダー | 設定 / 環境変数 |
|---------|---------|----------------|--------------|
| ソケットの読み取りの時間切れ | 120 秒 | 自動で 1800 秒まで上がる | `HERMES_STREAM_READ_TIMEOUT` |
| 逐次通信の停止検出 | 180 秒 | 900 秒を上限として引き上げ（`agent.local_stream_stale_timeout`） | `HERMES_STREAM_STALE_TIMEOUT` |
| 逐次通信でない場合の停止検出 | 90 秒 | 明示しなければ自動で無効 | `providers.<id>.stale_timeout_seconds` または `HERMES_API_CALL_STALE_TIMEOUT` |
| API の呼び出し（逐次通信でない） | 1800 秒 | 変わらない | `providers.<id>.request_timeout_seconds` / `timeout_seconds` または `HERMES_API_TIMEOUT` |

**ソケットの読み取りの時間切れ** は、httpx がプロバイダーからの次のかたまりをどれだけ待つかを決めます。手元で動かす LLM は、大きな文脈では最初のトークンを出すまでの下準備に何分もかかることがあるので、Hermes は手元のエンドポイントだと分かると、これを 30 分に引き上げます。`HERMES_STREAM_READ_TIMEOUT` を明示的に設定した場合は、エンドポイントの判定にかかわらず必ずその値が使われます。

**逐次通信の停止検出** は、SSE の生存確認だけが届いて実際の中身が来ない接続を切ります。手元のプロバイダー（下準備の間は生存確認を送りません）では、既定の 180 秒ではなく、上限のある 900 秒に引き上げられます。これは `agent.local_stream_stale_timeout` か、環境変数 `HERMES_LOCAL_STREAM_STALE_TIMEOUT` で設定できます。

**逐次通信でない場合の停止検出** は、いつまでも応答を返さない、逐次通信でない呼び出しを切ります。既定では、長い下準備の間に誤って切らないよう、Hermes は手元のエンドポイントに対してこれを無効にします。`providers.<id>.stale_timeout_seconds`、`providers.<id>.models.<model>.stale_timeout_seconds`、`HERMES_API_CALL_STALE_TIMEOUT` を明示的に設定した場合は、手元のエンドポイントでもその値が使われます。

この上限は、逐次通信でないすべての呼び出しに効きます。リクエストを受け取ってから黙り込むプロバイダー — 接続は開いたまま、1 バイトも来ず、エラーも出ない — は、この停止検出の時点で打ち切られてやり直されます。ずっと長いソケットの読み取りの時間切れまで（あるいは、人の見ていない cron の実行では、外から何かがプロセスを止めるまで）ぶら下がり続けることはありません。

cron のジョブと委任したサブエージェントも逐次通信を使います。それらはリクエストを自分のスレッドの中で直接実行しますが（ほかのセッションが使う割り込み用の作業スレッドは、ゲートウェイの入れ子になったスレッドの束の中で詰まってしまいます）、通信そのものは `stream: true` のままなので、上の **逐次通信の停止検出** の上限が効きます。トークンが 1 つ届くたびに生きていると見なされるので、何分も考える推論型のモデルが固まったプロバイダーと間違われることはなく、黙った接続を切る中継装置にも、常にバイトが届き続けます。

### API の逐次通信を止める {#disabling-api-streaming}

`model.streaming: false` は、そのセッション全体 — 親もサブエージェントも — で逐次通信でないリクエストを強制します。これは、*逐次通信* でのツール呼び出しの経路が壊れている、自前の OpenAI 互換サーバーのための逃げ道です（たとえば `--tool-call-parser qwen3_xml` と推論の解析器を組み合わせた vLLM は、ツール呼び出しの記述をただの文章に漏らし、`tool_calls` を 1 つも返さないことがあり、委任した作業が黙って何もしなくなります）。既定は `true` です。この種の不具合に当たらない限り、そのままにしてください。逐次通信でない呼び出しは、上で説明した生きているかどうかの判定を失うからです。これは、端末でのトークンの表示だけを決める `display.streaming` とは別物です。

```yaml
model:
  streaming: false
```

## 文脈の逼迫の警告 {#context-pressure-warnings}

繰り返しの上限の逼迫とは別に、文脈の逼迫は、会話が **圧縮のしきい値** — 古いメッセージを要約するために圧縮が始まる地点 — にどれだけ近いかを追いかけます。これは、会話が長くなってきたことをあなたにもエージェントにも伝えます。

| 進み具合 | 段階 | 起きること |
|----------|-------|-------------|
| しきい値まで **60% 以上** | お知らせ | CLI は水色の進み具合の帯を表示し、ゲートウェイはお知らせを送ります |
| しきい値まで **85% 以上** | 警告 | CLI は太字の黄色い帯を表示し、ゲートウェイは圧縮が近いと警告します |

CLI では、文脈の逼迫はツールの出力の流れの中に進み具合の帯として現れます。

```
  ◐ context ████████████░░░░░░░░ 62% to compaction  48k threshold (50%) · approaching compaction
```

メッセージングの経路では、文字だけの知らせが送られます。

```
◐ Context: ████████████░░░░░░░░ 62% to compaction (threshold: 50% of window).
```

自動の圧縮を無効にしている場合、警告は、代わりに文脈が切り詰められるかもしれないと伝えます。

文脈の逼迫は自動で働きます。設定は要りません。これは利用者に向けた知らせとしてだけ出るもので、メッセージの流れを書き換えることも、モデルの文脈に何かを差し込むこともありません。

## 認証情報の使い回しの方針 {#credential-pool-strategies}

同じプロバイダーに対して API キーや OAuth のトークンを複数持っている場合、回し方を設定できます。

```yaml
credential_pool_strategies:
  openrouter: round_robin    # cycle through keys evenly
  anthropic: least_used      # always pick the least-used key
```

選べるのは `fill_first`（既定）、`round_robin`、`least_used`、`random` です。詳しくは [認証情報のまとまり](/hermes/docs/user-guide/features/credential-pools/) をご覧ください。

## プロンプトのキャッシュ {#prompt-caching}

使用中のプロバイダーが対応していれば、Hermes はセッションをまたぐプロンプトのキャッシュを自動で有効にします。利用者の設定は要りません。

**Anthropic のネイティブ**、**OpenRouter**、**Nous Portal** 経由の Claude では、Hermes はシステムプロンプトとスキルのかたまりに、1 時間の保持（`ttl: "1h"`）を持つ `cache_control` の区切りを付けます。新しい 1 時間の中で最初に送るときは入力の正規料金がかかり、その同じ 1 時間のうちに、どのセッションからでも次に送るときはキャッシュから読み出され、割安の料金になります。つまり、システムプロンプト、読み込んだスキルの内容、長い文脈の先頭部分は、最初の 1 時間、`hermes` のセッションをまたいでも、枝分かれしたサブエージェントをまたいでも再利用されます。

Qwen Cloud（Alibaba DashScope）の上流はキャッシュの保持を 5 分までに制限しているので、Hermes はそこでは 5 分の区切りを使います。ほかの第三者経由の Claude（AWS Bedrock、Azure Foundry）は、そのプロバイダー自身のキャッシュの既定に従います。xAI Grok は、セッションに紐づいた会話 ID による別の仕組みを使います。[xAI のプロンプトのキャッシュ](/hermes/docs/integrations/providers/#xai-grok--responses-api--prompt-caching) をご覧ください。

これを無効にするつまみはありません。キャッシュは常に有効で、システムプロンプトだけでも入力のトークン数のかなりの割合を占めるため、1 回きりの会話でも費用が抑えられます。

明示的に設定できるのは、Anthropic 形式の区切りに対して Hermes が求めるキャッシュの保持の段階だけです。

```yaml
prompt_caching:
  cache_ttl: "5m"   # "5m" or "1h" (Anthropic-supported tiers); other values are ignored
```

`cache_ttl` は、Anthropic のネイティブ API、OpenRouter、Nous Portal 経由の Claude に対して Hermes が付ける区切りの保持時間を選びます。Anthropic が対応する 2 つの段階（`"5m"`、`"1h"`）だけが有効で、それ以外の値は無視されます。独自の上限を持つプロバイダー（たとえば最大 5 分の Qwen Cloud）では、上流が許す範囲まで抑えられます。

## 補助のモデル {#auxiliary-models}

Hermes は、画像の解析、ブラウザーのスクリーンショットの解析、セッションの題名の生成、文脈の圧縮といった脇の作業に「補助」のモデルを使います。既定（`auxiliary.*.provider: "auto"`）では、Hermes はすべての補助の作業を **主に使うチャットのモデル** — `hermes model` で選んだのと同じプロバイダーとモデル — へ回します。使い始めるのに設定は要りませんが、費用のかかる推論型のモデル（Opus、MiniMax M2.7 など）では、補助の作業がそれなりの費用を足すことは頭に置いてください。主モデルが何であれ、脇の作業は安く速く済ませたい場合は、`auxiliary.<task>.provider` と `auxiliary.<task>.model` を明示的に設定してください（たとえば、画像には OpenRouter の Gemini Flash など）。（Web の抽出は補助の作業ではありません。`web_extract` とブラウザーの取得は、長い内容を決まった手順で切り詰め、`read_file` でたどれるように全文を保存します。LLM は関わりません。）

:::note なぜ "auto" が主モデルを使うのか
以前の版は、まとめ役のプロバイダー（OpenRouter、Nous Portal）の利用者を、そのプロバイダー側の安い既定へ振り分けていました。これは意外に映りました。まとめ役の購読に料金を払っている利用者が、自分の補助の通信を別のモデルが扱っているのを目にすることになるからです。いまは `auto` は誰に対しても主モデルを使い、`config.yaml` での作業ごとの上書きは引き続き優先されます（下の [補助の設定の一覧](#full-auxiliary-config-reference) をご覧ください）。
:::

### 対話形式で補助のモデルを設定する {#configuring-auxiliary-models-interactively}

YAML を手で書く代わりに、`hermes model` を実行してメニューから **「Configure auxiliary models」** を選んでください。作業ごとの選択画面が出ます。

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

作業を選び、プロバイダーを選び（OAuth のものはブラウザーが開き、API キーのものは入力を求められます）、モデルを選びます。変更は `config.yaml` の `auxiliary.<task>.*` に保存されます。主モデルの選択画面と同じ仕組みなので、新しく覚える書き方はありません。

**Delegation** の項目だけは特別です。これは `delegate_task` のサブエージェントが使うモデルを決め、`auxiliary.*` ではなく最上位の `delegation.*`（`delegation.provider` / `delegation.model`）に保存されます。サブエージェントは脇の LLM の呼び出しではなく、れっきとした子のエージェントだからです。ここでの `auto` は「親のエージェントのプロバイダー、モデル、認証情報を引き継ぐ」という意味です。

最初のやり取りのあとに Hermes が自動で題名を付けるのをやめたい場合は、
`auxiliary.title_generation.enabled: false` を設定してください。手動での題名付けは
`/title` と `hermes sessions rename` で引き続き使えます。

### 逐次通信しか受け付けないエンドポイント {#stream-only-endpoints}

OpenAI 互換のエンドポイントの中には、逐次通信でないチャットのリクエストをきっぱり拒むものがあります（たとえば Tencent Copilot は HTTP 400 で `"Non-stream chat request is currently not supported"` を返します）。対話的なチャットはもともと逐次通信ですが、補助の作業（題名の生成、圧縮、画像）は逐次通信でない呼び出しを使うので、毎回失敗してしまいます。Hermes は `copilot.tencent.com` を常に逐次通信専用として扱います。ほかにそうしたエンドポイントがあれば、URL の一部を `auxiliary.stream_only_base_urls` の下に並べてください。

```yaml
auxiliary:
  stream_only_base_urls:
    - "my-stream-only-proxy.example.com"
```

一致した補助の呼び出しは `stream=True` で送られ、届いたかたまり（ツール呼び出しの差分も含みます）はこちら側でまとめられます。ほかのエンドポイントの動きは変わりません。

### 動画での説明 {#video-tutorial}

[YouTube: https://www.youtube.com/embed/NoF-YajElIM](https://www.youtube.com/embed/NoF-YajElIM)

### 共通の設定の形 {#the-universal-config-pattern}

Hermes のモデルの枠 — 補助の作業、圧縮、代替 — は、どれも同じ 3 つのつまみを使います。

| キー | 何をするか | 既定 |
|-----|-------------|---------|
| `provider` | 認証と振り分けにどのプロバイダーを使うか | `"auto"` |
| `model` | どのモデルを求めるか | そのプロバイダーの既定 |
| `base_url` | OpenAI 互換の独自のエンドポイント（プロバイダーより優先されます） | 未設定 |

補助の作業のかたまりには、さらに `reasoning_effort` のつまみがあります。

| キー | 何をするか | 既定 |
|-----|-------------|---------|
| `reasoning_effort` | その作業の LLM の呼び出しでどれだけ考えさせるか: `none`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max`、`ultra` | 未設定（プロバイダーの既定） |

これは全体に効く `agent.reasoning_effort` の、作業ごとの相棒です。主モデルが費用のかかる推論型のモデルのとき、圧縮を `low` で、画像を `none` で走らせれば、主のチャットの動きに触れずに脇の作業の待ち時間と費用を減らせます。これはすべての補助の作業のかたまり（`vision`、`compression`、`title_generation`、`curator`、`background_review` など）で、3 つの補助の通信方式（chat completions、Codex の Responses、Anthropic の Messages）すべてに効きます。同じ作業に `extra_body.reasoning` を明示した場合は、そちらがこの短い書き方より優先されます。

MoA だけは例外です。Mixture-of-Agents の考える深さは、`moa_reference` や `moa_aggregator` の補助のかたまりではなく、MoA の設定の中で **枠ごと** に指定します（`moa.presets.<name>.reference_models[].reasoning_effort` / `aggregator.reasoning_effort`）。[Mixture of Agents](/hermes/docs/user-guide/features/mixture-of-agents/) をご覧ください。

```yaml
auxiliary:
  compression:
    reasoning_effort: "low"    # summaries don't need deep thinking
  vision:
    reasoning_effort: "none"   # disable thinking for image description
```

`base_url` を設定すると、Hermes はプロバイダーを無視してそのエンドポイントを直接呼びます（認証には `api_key` か `OPENAI_API_KEY` を使います）。`provider` だけを設定した場合は、そのプロバイダーに組み込まれた認証と基点の URL を使います。

補助の作業で使えるプロバイダーは、`auto`、`main` に加えて、[プロバイダーの登録簿](/hermes/docs/reference/environment-variables/) にあるすべて — `openrouter`、`nous`、`openai-codex`、`copilot`、`copilot-acp`、`anthropic`、`gemini`、`qwen-oauth`、`zai`、`kimi-coding`、`kimi-coding-cn`、`minimax`、`minimax-cn`、`minimax-oauth`、`deepseek`、`nvidia`、`xai`、`xai-oauth`、`ollama-cloud`、`alibaba`、`bedrock`、`huggingface`、`arcee`、`xiaomi`、`kilocode`、`opencode-zen`、`opencode-go`、`opencode-free`、`commandcode`、`commandcode-anthropic`、`ai-gateway`、`azure-foundry` — または、あなたの `providers:` の辞書にある名前付きの独自のプロバイダー（たとえば `provider: "beans"`）です。

:::tip MiniMax の OAuth
`minimax-oauth` は、ブラウザーでの OAuth でログインします（API キーは要りません）。`hermes model` を実行して **MiniMax (OAuth)** を選んで認証してください。補助の作業では `MiniMax-M2.7-highspeed` が自動で使われます。[MiniMax の OAuth の案内](/hermes/docs/guides/minimax-oauth/) をご覧ください。
:::

:::tip xAI Grok の OAuth
`xai-oauth` は、SuperGrok と X Premium+ の購読者向けに、ブラウザーでの OAuth でログインします（API キーは要りません）。`hermes model` を実行して **xAI Grok OAuth (SuperGrok / Premium+)** を選んで認証してください。同じ OAuth のトークンは、xAI へ直接つなぐすべての場面（チャット、補助の作業、TTS、画像の生成、動画の生成、書き起こし）で使い回されます。[xAI Grok の OAuth の案内](/hermes/docs/guides/xai-grok-oauth/) をご覧ください。Hermes が離れたホストにある場合は [SSH 越し・離れたホストでの OAuth](/hermes/docs/guides/oauth-over-ssh/) もご覧ください。
:::

:::warning `"main"` は補助の作業だけのものです
`"main"` というプロバイダーの指定は「主のエージェントが使っているプロバイダーをそのまま使う」という意味で、`auxiliary:`、`compression:`、そして主の代替の項目（`fallback_providers:` や従来の `fallback_model:`）の中でだけ有効です。最上位の `model.provider` の値としては **使えません**。OpenAI 互換の独自のエンドポイントを使う場合は、`model:` の節に `provider: custom` を設定してください。主モデルのプロバイダーの選択肢は [AI プロバイダー](/hermes/docs/integrations/providers/) をご覧ください。
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
補助の作業にはそれぞれ設定できる `timeout`（秒）があります。既定は、画像が 120 秒、承認が 30 秒、圧縮が 120 秒です。補助の作業に遅い手元のモデルを使うなら、これらを伸ばしてください。画像には、HTTP での画像のダウンロード用に別の `download_timeout`（既定は 30 秒）もあります。回線が遅い場合や、自前の画像サーバーを使う場合は、こちらを伸ばしてください。
:::

:::info
文脈の圧縮は、しきい値のための `compression:` のかたまりと、モデルやプロバイダーの設定のための `auxiliary.compression:` のかたまりを別々に持ちます。上の [文脈の圧縮](#context-compression) をご覧ください。主の代替の連鎖は、最上位の `fallback_providers:` の一覧を使います。[代替のプロバイダー](/hermes/docs/integrations/providers/#fallback-providers) をご覧ください。3 つとも、同じ provider / model / base_url の形に従います。
:::

### 補助の作業ごとの代替の連鎖 {#per-task-fallback-chain-for-auxiliary-tasks}

補助の作業はそれぞれ、任意で `fallback_chain` を定義できます。これは、主の補助のプロバイダーが流量制限、通信の不調、支払いの制限で失敗したときに Hermes が試す、プロバイダーとモデルの一覧です。

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

主の補助のプロバイダー（`openrouter` / `openai/gpt-4o-mini`）が流量制限、接続の時間切れ、支払いが必要というエラーを返すと、Hermes は `fallback_chain` を順にたどります。すでに失敗したプロバイダーと同じものは飛ばし、残りを 1 つずつ、成功するか一覧を使い切るまで試します。すべての代替が失敗した場合は、最後の砦として主のエージェントのモデルへ戻ります。

各項目は、ほかの補助の作業の設定と同じ 3 つのつまみに対応します。

| キー | 説明 |
|-----|-------------|
| `provider` | プロバイダーの名前（`nous`、`openrouter`、`anthropic`、`gemini`、`main` など） |
| `model` | そのプロバイダーでのモデル名 |
| `base_url` | （任意）OpenAI 互換の独自のエンドポイント |

`fallback_chain` は、どの補助の作業でも使えます。`compression`、`vision`、`approval`、`skills_hub`、`mcp` などです。

### 補助の同時実行を抑える {#limiting-auxiliary-concurrency}

`max_concurrency` は、`compression` や `title_generation` のような補助の作業について、プロセス全体で同時に走る LLM の呼び出しの数を抑えます。`auxiliary.vision.max_concurrency` は対象外です。あちらは、LLM のリクエストではなく、画像の変換や縮小を行う CPU 側の処理の数だけを決めているからです。これがとくに役立つのは、次のような場合です。

- 多くのセッションが同時に裏の処理を始めうるとき（Discord や Telegram のチャンネル、複数の端末）
- プロバイダーが流量制限中や障害中で、再試行が集中をさらに強めてしまうとき

既定は無制限です。よくある安全側の上限は `2` です。

```yaml
auxiliary:
  title_generation:
    max_concurrency: 2
  compression:
    max_concurrency: 2
```

この制限は再試行と代替も含めた呼び出しの全体を包むので、1 回の遅い呼び出しが上限に対して二重に数えられることはありません。

### 補助の作業での OpenRouter の振り分けと Pareto Code {#openrouter-routing-pareto-code-for-auxiliary-tasks}

補助の作業が OpenRouter に落ち着いたとき（明示した場合でも、主のエージェントが OpenRouter にいて `provider: "main"` になった場合でも）、主のエージェントの `provider_routing` と `openrouter.min_coding_score` の設定は **引き継がれません**。設計上、補助の作業はそれぞれ独立しているからです。特定の補助の作業に OpenRouter のプロバイダーの好みを設定したり、[Pareto Code の振り分け](/hermes/docs/integrations/providers/#openrouter-pareto-code-router) を使ったりするには、作業ごとに `extra_body` で指定します。

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

この形は、OpenRouter がチャットのリクエストの本体として受け付けるものをそのまま写しています。Hermes は `extra_body` の全体をそのまま渡すので、[openrouter.ai/docs](https://openrouter.ai/docs) に載っているほかのリクエスト本体の項目も、同じように使えます。

### 画像のモデルを変える {#changing-the-vision-model}

画像の解析に Gemini Flash ではなく GPT-4o を使うには、次のようにします。

```yaml
auxiliary:
  vision:
    model: "openai/gpt-4o"
```

環境変数でも指定できます（`~/.hermes/.env` の中）。

```bash
AUXILIARY_VISION_MODEL=openai/gpt-4o
```

### プロバイダーの選択肢 {#provider-options}

ここに挙げる選択肢は、**補助の作業の設定**（`auxiliary:`、`compression:`）と、主の代替の項目（`fallback_providers:` や従来の `fallback_model:`）に効くもので、最上位の `model.provider` の設定には効きません。

| プロバイダー | 説明 | 必要なもの |
|----------|-------------|-------------|
| `"auto"` | 使える中でいちばん良いもの（既定）。画像は OpenRouter → Nous → Codex の順に試します。 | — |
| `"openrouter"` | OpenRouter を指定します。どのモデルへも振り分けられます（Gemini、GPT-4o、Claude など） | `OPENROUTER_API_KEY` |
| `"nous"` | Nous Portal を指定します | `hermes auth` |
| `"codex"` | Codex の OAuth（ChatGPT のアカウント）を指定します。画像にも対応します（gpt-5.3-codex）。 | `hermes model` → ChatGPT または Codex の購読 |
| `"minimax-oauth"` | MiniMax の OAuth を指定します（ブラウザーでのログイン、API キー不要）。補助の作業には MiniMax-M2.7-highspeed を使います。 | `hermes model` → MiniMax (OAuth) |
| `"xai-oauth"` | xAI Grok の OAuth を指定します（SuperGrok や X Premium+ の購読者向けのブラウザーでのログイン、API キー不要）。同じ OAuth のトークンで、チャット、TTS、画像、動画、書き起こしをまかなえます。 | `hermes model` → xAI Grok OAuth (SuperGrok / Premium+) |
| `"main"` | いま使っている独自のエンドポイントや主のエンドポイントを使います。`OPENAI_BASE_URL` と `OPENAI_API_KEY` から来ることも、`hermes model` や `config.yaml` で保存した独自のエンドポイントから来ることもあります。OpenAI でも、手元のモデルでも、OpenAI 互換の API なら何でも動きます。**補助の作業だけです。`model.provider` には使えません。** | 独自のエンドポイントの認証情報と基点の URL |

脇の作業に既定の振り分けを通したくない場合は、主のプロバイダーの一覧にある API キー方式のプロバイダーもここで使えます。たとえば `GMI_API_KEY` を設定すれば `gmi` が使えますし、`FIREWORKS_API_KEY` を設定すれば `fireworks` が使えます。

```yaml
auxiliary:
  compression:
    provider: "gmi"
    model: "anthropic/claude-opus-4.6"
```

GMI へ補助の作業を振り分ける場合は、GMI の `/v1/models` のエンドポイントが返す正確なモデル ID を使ってください。Fireworks のモデル ID は、そのプロバイダー独自のスラッシュ形式です。たとえば `accounts/fireworks/models/glm-5p2` のようになります。

### よくある構成 {#common-setups}

**独自のエンドポイントを直接使う**（手元や自前の API では `provider: "main"` よりはっきりします）:
```yaml
auxiliary:
  vision:
    base_url: "http://localhost:1234/v1"
    api_key: "local-key"
    model: "qwen2.5-vl"
```

`base_url` は `provider` より優先されるので、補助の作業を特定のエンドポイントへ向ける、いちばんはっきりした方法です。エンドポイントを直接上書きする場合、Hermes は設定した `api_key` を使い、なければ `OPENAI_API_KEY` に頼ります。その独自のエンドポイントに `OPENROUTER_API_KEY` を使い回すことはありません。

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

**画像に OpenRouter を使う**（どのモデルへも振り分けられます）:
```yaml
auxiliary:
  vision:
    provider: "openrouter"
    model: "openai/gpt-4o"      # or "google/gemini-2.5-flash", etc.
```

**Codex の OAuth を使う**（ChatGPT の Pro / Plus のアカウント。API キーは要りません）:
```yaml
auxiliary:
  vision:
    provider: "codex"     # uses your ChatGPT OAuth token
    # model defaults to gpt-5.3-codex (supports vision)
```

**MiniMax の OAuth を使う**（ブラウザーでのログイン。API キーは要りません）:
```yaml
model:
  default: MiniMax-M2.7
  provider: minimax-oauth
  base_url: https://api.minimax.io/anthropic
```
`hermes model` を実行して **MiniMax (OAuth)** を選べば、ログインしてこの設定が自動で入ります。中国の地域では、基点の URL は `https://api.minimaxi.com/anthropic` になります。手順の全体は [MiniMax の OAuth の案内](/hermes/docs/guides/minimax-oauth/) をご覧ください。

**手元や自前のモデルを使う:**
```yaml
auxiliary:
  vision:
    provider: "main"      # uses your active custom endpoint
    model: "my-local-model"
```

`provider: "main"` は、Hermes が通常のチャットで使っているプロバイダーをそのまま使います。名前付きの独自のプロバイダー（たとえば `beans`）でも、`openrouter` のような組み込みのプロバイダーでも、従来の `OPENAI_BASE_URL` のエンドポイントでも同じです。

:::tip
主モデルのプロバイダーとして Codex の OAuth を使っている場合、画像は自動で動きます。追加の設定は要りません。Codex は、画像の自動判定の順番に含まれています。
:::

:::warning
**画像には多様な入力に対応したモデルが必要です。** `provider: "main"` を設定する場合は、そのエンドポイントが多様な入力や画像に対応していることを確かめてください。そうでないと画像の解析は失敗します。
:::

### 環境変数（従来の方法） {#environment-variables-legacy}

補助のモデルは環境変数でも設定できます。ただし、`config.yaml` のほうが望ましい方法です。管理しやすく、`base_url` や `api_key` を含むすべての項目に対応しているからです。

| 設定 | 環境変数 |
|---------|---------------------|
| 画像のプロバイダー | `AUXILIARY_VISION_PROVIDER` |
| 画像のモデル | `AUXILIARY_VISION_MODEL` |
| 画像のエンドポイント | `AUXILIARY_VISION_BASE_URL` |
| 画像の API キー | `AUXILIARY_VISION_API_KEY` |

圧縮と代替のモデルの設定は config.yaml だけです。（`AUXILIARY_WEB_EXTRACT_*` の変数はもう使われていません。Web の抽出に補助の LLM は関わらなくなりました。）

:::tip
いまの補助のモデルの設定は `hermes config` で見られます。上書きは、既定と違うときにだけ表示されます。
:::

## 考える強さ {#reasoning-effort}

答える前に、モデルにどれだけ「考えさせる」かを決めます。

```yaml
agent:
  reasoning_effort: ""   # empty = medium. Options: none, minimal, low, medium, high, xhigh, max, ultra
```

設定しない場合（既定）、考える強さは「medium」になります。ほとんどの作業にちょうどよい水準です。値を設定するとそれが優先されます。強くすると込み入った作業での結果は良くなりますが、トークンと待ち時間が増えます。

:::note OpenRouter 経由で適応的に考えるモデル（Claude 4.6 以降、Fable / Mythos の系統）
これらのモデルは *適応的* に考えるので、通常の `reasoning.effort` の項目を受け付けません。
OpenRouter はそれらに対してこの項目を無視します。Hermes は、あなたの
`reasoning_effort` を裏で OpenRouter の `verbosity` の引数へ回します（これは
Anthropic の `output_config.effort` に対応します）。おかげで、同じつまみが
選んだモデルの対応する段階のままで働き続けます。`none`（または未設定）にすると、
モデル自身の適応的な既定に任せます。
Anthropic のネイティブのプロバイダーはもともと直接この強さを扱っており、影響を受けません。
:::

:::note OpenRouter のモデルと、対応する強さの段階
OpenRouter 経由のほかのモデルについて、Hermes はモデルの一覧が持つ
推論の情報（`supported_parameters` と、モデルごとの
`reasoning.supported_efforts`）をその場で読み、推論の指定をそもそも送るかどうかを決め、
あなたが求めた強さを、その経路が実際に対応するいちばん近い段階へ抑えます
（必ず下向きです。たとえば `high` までしかない経路では `ultra` は `high` になり、
黙って上がることはありません）。推論に対応した新しい提供元は、
Hermes の更新を待たずに自動で使えるようになります。一覧に届かないときや、
モデルが載っていないときは、Hermes は組み込みのモデルの系統の一覧に頼り、
あなたの指定した強さをそのまま渡します。
:::

考える強さは `/reasoning` のコマンドで、実行中にも変えられます。

```
/reasoning                # Show current effort level and display state
/reasoning high           # Set reasoning effort to high (this session only)
/reasoning high --global  # Set effort and persist to config.yaml
/reasoning none           # Disable reasoning (this session only)
/reasoning show           # Show model thinking above each response
/reasoning hide           # Hide model thinking
```

強さの変更は、既定ではそのセッションの中だけです。`--global` を付けると、
新しい段階が `agent.reasoning_effort` の既定として保存されます。

#### モデルごとの強さの上書き {#per-model-reasoning-overrides}

モデルごとに違う強さを設定できます。込み入ったモデルには強く考えさせ、速いモデルには中くらいにしたい、というときに役立ちます。

```yaml
agent:
  reasoning_effort: "medium"       # global default
  reasoning_overrides:
    "openrouter/anthropic/claude-opus-4.5": "xhigh"
    "openai/gpt-5": "low"
    "claude-sonnet-4.6": "high"    # bare model name also works
```

キーの照合は **書き方の揺れに寛容** です。無理のない書き方ならどれでも一致します。
- `claude-opus-4.5`、`claude-opus-4-5`、`claude-opus.4.5`（ドットとハイフンは入れ替えても構いません）
- `anthropic/claude-opus-4.5`、`openrouter/anthropic/claude-opus-4.5`（プロバイダーの接頭辞は任意です）
- 完全に一致するものが、変種より優先されます

:::note
`reasoning_overrides` のキーは `hermes config set` に対応していません。YAML のファイルを直接編集してください。モデル名にはドットが含まれることが多く（たとえば `claude-opus-4.5`）、CLI のドット区切りのキーの書き方と衝突するからです。
:::

**決まる順番:**

1. セッションだけに効く `/reasoning --session` の上書き（ゲートウェイのみ）
2. `agent.reasoning_overrides` によるモデルごとの上書き（書き方の揺れに寛容）
3. 全体の `agent.reasoning_effort`
4. プロバイダーの既定

この上書きは、どこでも自動で効きます。CLI の起動時、メッセージングのゲートウェイ、デスクトップや TUI、cron のジョブ、セッションの途中での `/model` の切り替え、代替モデルへの切り替えのすべてです。

## 高速モード {#fast-mode}

高速モードは、割増の料金と引き換えに、プロバイダーへ速い出力を求めます。OpenAI の [Priority Processing](https://openai.com/api-priority-processing/)（`service_tier: priority`）、Grok 4.6 での xAI の Priority Processing、そして Anthropic の [Fast Mode](https://platform.claude.com/docs/en/build-with-claude/fast-mode)（`speed: fast`、Opus 4.8 と Opus 5 のみ）です。既定では **無効** です。

```yaml
agent:
  service_tier: ""          # "" / normal | fast | auto | cold
  fast_auto_seconds: 60     # window for auto / cold
```

| モード | 高速の指定を送るとき | 向いている場面 |
|------|---------------------------|------------|
| `normal`（既定、`""`） | 送りません | いちばん安く、標準の速さです |
| `fast` | すべてのリクエスト | いつでも速さが欲しい、長い対話のセッション |
| `auto` | **毎回の** やり取りの最初の `fast_auto_seconds` の間のリクエスト | 最初の返答が軽快になり、長いツールの繰り返しは標準の料金に戻ります |
| `cold` | 同じ時間の枠ですが、セッションの **最初のやり取り** だけ（それ以前の履歴がない場合） | 導入の返答は速く、そのあとは標準の料金にします |

`/fast normal|fast|auto|cold` でそのセッションのモードを切り替えます。`--global` を付けると `config.yaml` に保存されます。`/fast` だけを打つと、いまのモードが表示されます。

**費用について:** どちらのプロバイダーも、高速のリクエストには標準の料金に倍率を掛けて課金します（Anthropic は Opus 4.8 と Opus 5 で 100 万トークンあたり入力 10 ドル / 出力 50 ドル）。プロンプトのキャッシュの料金とも重なります。`auto` と `cold` は、その割増を時間の枠の中だけに抑えます。高速の指定は、それに対応する一次のエンドポイント（`api.openai.com` / Codex の購読、`api.anthropic.com`、`api.x.ai`）にだけ送られます。OpenRouter、Nous Portal、Copilot、Azure、Bedrock、そして独自の `base_url` の経路は、どのモードでもこれを受け取りません。リクエストごとに変わるのはこの引数だけで、システムプロンプト、ツール、メッセージは 1 バイトも変わらないので、時間の枠の境目でもプロンプトのキャッシュは生き残ります。

## ツールを使わせる働きかけ {#tool-use-enforcement}

モデルによっては、ツールを呼ぶ代わりに、やろうとしていることを文章で書いてしまうことがあります（実際にターミナルを呼ばずに「テストを走らせます…」と書く、など）。この働きかけは、実際にツールを呼ぶようモデルを引き戻す案内をシステムプロンプトへ差し込みます。

```yaml
agent:
  tool_use_enforcement: "auto"   # "auto" | true | false | ["model-substring", ...]
```

| 値 | 動き |
|-------|----------|
| `"auto"`（既定） | 次に一致するモデルで有効になります: `gpt`、`codex`、`gemini`、`gemma`、`grok`、`glm`、`qwen`、`deepseek`、`muse`。ほかは無効です（Claude など）。 |
| `true` | モデルにかかわらず常に有効です。いま使っているモデルが、実行せずに説明ばかりしていると気づいたときに役立ちます。 |
| `false` | モデルにかかわらず常に無効です。 |
| `["gpt", "codex", "qwen", "llama"]` | モデル名に、並べた文字列のどれかが含まれるときだけ有効です（大文字小文字は区別しません）。 |

### 何が差し込まれるか {#what-it-injects}

有効なとき、システムプロンプトには 2 段階の案内が足されることがあります。

1. **一般的なツール利用の働きかけ**（一致したすべてのモデル） — 意図を説明するのではなく、すぐにツールを呼ぶこと、作業が終わるまで続けること、そして将来の行動を約束してやり取りを終えないことを指示します。

2. **Google 向けの実務の案内**（Gemini と Gemma のモデルだけ） — 簡潔さ、絶対パス、ツールの並行呼び出し、編集前の確認といった型を伝えます。

これらは利用者からは見えず、システムプロンプトにだけ効きます。もともとツールを確実に使うモデル（Claude など）にこの案内は要らないので、`"auto"` はそれらを外しています。

### いつ有効にするか {#when-to-turn-it-on}

既定の自動の一覧に載っていないモデルを使っていて、実行せずに *やるつもり* を書くことが多いと感じたら、`tool_use_enforcement: true` にするか、そのモデルの文字列を一覧に足してください。

```yaml
agent:
  tool_use_enforcement: ["gpt", "codex", "gemini", "grok", "my-custom-model"]
```

## 遂行の規律の案内 {#execution-discipline-guidance}

ツールを使わせる働きかけとは別に、Hermes は **遂行の規律** のかたまりを差し込みます。対象は、評価の記録で見られる一連のつまずき方を共有するモデルの系統です。コードではなく文章の中で計算する、外部への書き込みのあとに読み返して確かめない、形の崩れた識別子を「直して」しまう、数が合わないのに揃っていると言い張る、受け入れの条件をすべて確かめずに「完了」と宣言する、といったものです。

```yaml
agent:
  execution_guidance: "auto"   # "auto" | true | false | ["model-substring", ...]
```

| 値 | 動き |
|-------|----------|
| `"auto"`（既定） | 次に一致するモデルで有効になります: `gpt`、`codex`、`grok`、`deepseek`、`kimi`、`qwen`、`glm`、`minimax`、`mimo`、`mistral`、`muse`。 |
| `true` | モデルにかかわらず常に有効です。 |
| `false` | モデルにかかわらず常に無効です。 |
| `["deepseek", "my-custom-model"]` | モデル名に、並べた文字列のどれかが含まれるときだけ有効です（大文字小文字は区別しません）。 |

差し込まれる内容は、次のとおりです。

- **ツールを使い続けること** — 作業が終わり、*かつ* 確かめられるまでツールを呼び続けます。空、部分的、あるいは妙に狭い検索の結果は、結論を出す前に、もっと広い、あるいは別の問い合わせでやり直します。
- **必ずツールを使うこと** — 計算、ハッシュ、日付、システムの状態、ファイルの事実は、頭の中の計算ではなく、必ずツールから得ます。
- **外部への書き込みの読み返し** — 外部のシステムの状態を変える書き込みのあとは、成功したと言う前に対象をそのまま読み返します（ツールがすでに確認した内部のファイルの編集は、改めて確かめません）。
- **数の突き合わせ** — 示された合計（`total`、`reply_count`、`has_more`）は厳密な主張として扱います。食い違ったら、取り直すかプログラムで読み取ります。
- **書かれたとおりを保つこと** — 示された形式に合わない識別子を、正規化したり「直したり」しません。検索が成功したからといって、形の崩れた元の文字列が正しいことにはなりません。
- **確認を経た完了** — 「完了」とは、名前の挙がった受け入れの条件がすべて確かめられたということであり、それらしい一部ではありません。

この関門は `tool_use_enforcement` とは独立しています。どちらか一方だけを有効にできます。案内はセッションの始めにモデル名から一度だけ選ばれるので、システムプロンプトは会話の一生を通じて 1 バイトも変わらず（プロンプトのキャッシュにも優しく）保たれます。Gemini と Gemma が自動の一覧から外れているのは、より具体的な Google 向けの案内を受け取るからです。Claude が外れているのは、こうしたつまずき方をしないからです。どのモデルでも、`true` か文字列の一覧で参加させられます。

## ツールの繰り返しに対する歯止め {#tool-loop-guardrails}

Hermes は、エージェントが実りのないツール呼び出しの繰り返しにはまったことを見つけます。同じ呼び出しが何度も失敗する、同じツールが何度も失敗する、同じ結果を返す呼び出しが前進なく続く、といった場合です。既定では、モデルが自分で立て直せるよう、ツールの結果に **警告** を差し込みます。対話的な CLI、TUI、デスクトップ、ACP のセッションは、人が割って入れるので警告だけに留まります。人の見ていないゲートウェイと cron のセッションでは、既定で強制的な停止が有効です。

この経路に応じた既定は、人の見ていない環境では無効にできますし、逆にすべての経路で強制的な停止を明示的に有効にもできます。

```yaml
tool_loop_guardrails:
  warnings_enabled: true       # inject warnings into tool results (default: true)
  hard_stop_enabled: false     # also BLOCK the call past the hard-stop threshold (default: false)
  non_interactive_hard_stop_enabled: true  # default hard stops for gateway/cron
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

`hard_stop_enabled` は、すべての経路で強制的な停止を明示的に有効にします。`false` のままでも、`non_interactive_hard_stop_enabled` が、人の見ていないゲートウェイや cron のような経路ではこれを有効にし、CLI、TUI、デスクトップ、ACP、サブエージェント、`api_server` の実行（親やクライアントが見ている、監督された作業）では警告だけに留めます。人の見ていない環境をここから外したい場合は、`non_interactive_hard_stop_enabled: false` にしてください。[Docker と人の見ていない環境](/hermes/docs/user-guide/docker/) もご覧ください。

強制的な停止は、正当な繰り返しではなく **同じことの再生** — まったく同じ呼び出しで、その間に何も起きていない状態 — を捕まえるように作られています。

- **編集してからやり直すのは、繰り返しではありません。** 状態を変える呼び出しが成功すると（`write_file`、`patch`、成功した `terminal` や `execute_code`、ブラウザーの操作、ジョブやメッセージや cron の変更）、数えられている途中のすべての失敗について前進があったと印が付きます。次にまったく同じ呼び出しをしても（修正後に落ちていたテストを走らせ直す、クリック後に画面を取り直す）、停止へ向けて積み上がるのではなく、数え直しから始まります。
- **違う失敗コマンドは、診断であって繰り返しではありません。** 0 以外の終了が普通の出力であるツール（`terminal`、`execute_code`、プロセスの状況確認、`browser_navigate`、`web_extract`）では、`same_tool_failure` のしきい値は警告を出すだけで、決して止めません。まったく同じ引数を、間に何の変化もなく再生した場合か、同じ結果が続いた場合だけが、それらを止められます。
- **停止が終わらせるのはやり取りであって、セッションではありません。** エージェントは、どの歯止めがなぜ働いたかを答えます。「続けて」と返せば、やり取りごとの数え直しとともに再開します。

### やり取りごとの暴走の上限 {#per-turn-runaway-loop-caps}

上の失敗に基づくしきい値とは別に、`loop_caps` は、1 回のエージェントの繰り返し（やり取り）でできる `web_search` の呼び出しとサブエージェントの起動に、確かな上限を設けます。数え直しはやり取りのたびに行われるので、正当な長いセッションが痩せ細ることはありません。それでいて、際限のない検索や委任の繰り返しに陥った 1 回のやり取りは止まります。これらは常に有効で、`hard_stop_enabled` にかかわらず働きます。1 回のやり取りで何十回も Web を検索したり、何十ものサブエージェントを起こしたりするのはすでに異常なので、既定は低めです。上限に達すると、問題のツールの呼び出しは説明とともに止められ、残りの余力を使い切る代わりに、やり取りがきれいに終わります。どちらの値も `0` にすれば、その上限を完全に外せます。

1 回の `delegate_task` のまとまりは、その中の作業をそれぞれ `max_subagents` に数えます（3 つのまとまりなら 3 を使います）。したがって、この上限は `delegate_task` を呼んだ回数ではなく、実際に起きたサブエージェントの数を追います。

これは Claude Code の、セッションごとの WebSearch とサブエージェントの上限（v2.1.212）と同じ考え方です。あちらも既定は 200 で、`/clear` でリセットされます。

### 実行中の停滞防止の守り {#runtime-anti-stall-guards}

上の失敗に基づく歯止めを補うものとして、`agent.stall_guards`（既定は `true`）は、無駄なやり取りに対する 2 つの控えめな守りを有効にします。1 つ目は **同じ呼び出しの繰り返しを断つ仕組み** です。同じツールが同じ引数で 3 回以上続けて呼ばれ、*しかも* 同じ結果を返した場合、そのツールの結果に短い 1 行の断りが足され、同じ呼び出しを繰り返さないようモデルへ伝えます。警告だけのセッションでは呼び出しを止めることはなく、正当に繰り返す状況確認（`process`、`*_get_result`、`*_poll`）は対象外です。強制的な停止が働いている場合（`hard_stop_enabled` を明示した場合や、人の見ていないゲートウェイや cron の経路）は、同じ続き方が `hard_stop_after.idempotent_no_progress` の回数に達した時点で強制的な停止にもなります。これは `idempotent_no_progress` の歯止めが追う読み取り専用のツールだけでなく、**すべての** ツールが対象なので、成功した `terminal` や `skill_view` の呼び出しを再生し続けるモデルは、繰り返しの余力を使い切る前に止められます（`identical_call_streak_halt`）。2 つ目は **続ける意図からの立て直し** です。モデルがツールを呼ばずにやり取りを終え、しかも短い返事が行動を予告して途切れている場合（「では、ファイルを更新します…」）、Hermes は、意図の確認からの立て直しに使うのと同じ、回数の限られた続きの仕組みで、実行するよう促し直します（1 回のやり取りにつき最大 2 回）。どちらもキャッシュを壊さず（断りは結果を組み立てるときに足され、あとから遡って書き換えることはありません）、まとめて無効にできます。

```yaml
agent:
  stall_guards: false
```

この同じ関門は、**結果への参照で置き換える仕組み** も有効にします。同じツールの呼び出しをやり直して、1 バイトも違わない新しい結果が返ったとき、重なった中身は、出力の全体を繰り返す代わりに、先の結果を指す短い参照（ツール名、`tool_call_id`、引数の要約、そして最初の結果がディスクへ保存されていればその退避先のパス）として文脈に入ります。ツール自体は毎回実行されるので、状況確認の意味は保たれます。結果が変わっていれば、常にそのまま丸ごと流れます。512 文字未満の結果、エラーの結果、多様な形式の結果は決して置き換えられません。状況確認は置き換え *られます*（変わらない確認は、まさに重なった中身が何の情報も運ばない場合だからです）。

### やり取りの生存の見張り {#turn-liveness-watchdog}

`agent.turn_liveness` は、Hermes が強制的に立て直すまでに、会話のやり取りが **目に見える前進をしないまま** どれだけ続けられるかを決めます。この見張りは活動の時計（API の待ち、逐次受信のトークン、ツールの生存信号に印を付けるのと同じ合図。占有の更新は数えません）を頼りにするので、途中で静かに詰まったやり取り（issue #95548 で見られた症状。ツールも動かず、API も呼ばれず、エラーも出ないのに、セッションは延々と「処理中」のまま）は、はっきりと表に出され、やり直せる中断として巻き戻るよう割り込まれます。割り込みでも詰まりを解けない場合は、その持続的な占有の更新が止まるので、プロセスを殺すまでぶら下がるのではなく、古いやり取りの片付けがセッションを取り戻せます。

```yaml
agent:
  turn_liveness:
    timeout_s: 600.0   # idle bound; <= 0 disables the watchdog
    poll_s: 15.0        # sampling interval (seconds)
```

正当に時間のかかる作業が損をすることはありません。逐次で届く応答、ツールの生存信号（ツールが走っている間は 30 秒ごと）、承認の待ちは、どれも時計に触れ続けます。したがって、この時間いっぱい前進が *まったく* ないやり取りだけが、この見張りを働かせます。おかしな値（打ち間違い、`NaN`、`Inf`、0 以下の `poll_s`）は警告を記録して既定に戻ります。起動を落とすことも、黙って見張りを無効にすることもありません。打ち切りが働くと、立て直しを始めるところで停滞を報告し、割り込みが実際に確定してから、中断や占有の停止という最終的な結果を知らせます。

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

これは `text_to_speech` のツールと、音声モードでの読み上げの返答（CLI やメッセージングのゲートウェイでの `/voice tts`）の両方を決めます。

**速さの決まる順番:** プロバイダーごとの速さ（たとえば `tts.edge.speed`）→ 全体の `tts.speed` → 既定の `1.0` です。すべてのプロバイダーで同じ速さにしたいなら全体の `tts.speed` を、細かく分けたいならプロバイダーごとに設定してください。

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
  bell_on_prompt: false   # Play terminal bell when a blocking prompt opens (clarify, approval, sudo password, secret capture) — works over SSH
  # Both bell flags also emit an OSC 9 desktop notification (Ghostty, iTerm2, Kitty, WezTerm raise an OS
  # notification; other terminals ignore it) and, inside Warp (TERM_PROGRAM=WarpTerminal with the CLI-agent
  # protocol advertised), a warp://cli-agent OSC 777 event (`stop` on completion, `permission_request` on
  # blocking prompts) so Warp's tab status and notification mailbox track Hermes. No extra keys needed.
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

### やり取りごとのまとめと、待機表示のトークンの流れ {#per-turn-summary-and-spinner-token-flow}

`display.turn_summary`（既定は `true`）は、**対話的な CLI** のやり取りのあとに、そのやり取りで実際に何をしたかをまとめた、控えめな 1 行を表示します。

```
⋯ 12.4s · edited 2 files +18 -3 · read 4 files · ran 3 commands
```

この集計は、CLI がもともと受け取っているツールの進み具合の流れから得ているので、追加の費用はかかりません。細かい点は次のとおりです。

- 時間は、そのやり取りの実際の長さです（1 分を超えると `2m05s` のようになります）。
- ツールの呼び出しは動詞（`edited`、`read`、`ran`、`searched` など）でまとめられ、単数と複数も正しく書き分けられます。決まった動詞のないプラグインや MCP のツールは、`called N tools` にまとまります。
- `+X -Y` の行数の増減は、ツールの結果がもともと差分を報告している場合（いまのところ `patch`）にだけ出ます。Hermes がそれを計算するために git を呼ぶことはないので、`write_file` による編集は増減なしで数えられます。
- **失敗したツールの呼び出しは数えません。** 拒まれた書き込みが、成功した編集として表示されることはありません（対になる警告については [ファイル変更の照合](#file-mutation-verifier) をご覧ください）。
- 長いやり取りでは動詞のまとまりは 4 つまでで、そのあとに `+N more` が付くので、この行が折り返すことはありません。
- ツールを呼ばずに終わった素早いやり取りでは、何も表示されません。

`display.spinner_token_flow`（既定は `true`）は、そのやり取りで積み上がった出力のトークン数を、CLI の待機表示の時計に足します。

```
  ⚡ Reading cli.py  (  2.3s · ↓ 1.2k tok)
```

この数はやり取りごとで（セッションの合計は、やり取りの始めを起点に引き直されます）、そのやり取りの中の API の呼び出しが使用量を報告するたびに更新されます。最初の使用量の報告が届くまでは何も表示されないので、誤解を招く `↓ 0 tok` を見ることはありません。

どちらのキーも表示だけのもので、CLI だけのものです。静かなモード、`display.tool_progress` が `off` のとき、1 回きりの問い合わせや `-Q` のまとめ実行、そしてゲートウェイやメッセージングの画面では出ません（そちらは代わりに `display.runtime_footer` を使います）。どちらかを `false` にすれば止まります。

### ファイル変更の照合 {#file-mutation-verifier}

`display.file_mutation_verifier` が `true`（既定）のとき、そのやり取りの中で `write_file` や `patch` の呼び出しが失敗し、同じパスへの書き込みがそのあと成功しなかった場合、Hermes はアシスタントの最終的な応答に 1 行の注意を足します。これにより、「並行してまとめて修正し、半分は黙って失敗し、モデルは成功したとまとめる」という言い過ぎを、編集のたびに手で `git status` を走らせなくても捕まえられます。

出るのはこんな行です。

```
⚠️ File-mutation verifier: 3 file(s) were NOT modified this turn despite any wording above that may suggest otherwise. Run `git status` or `read_file` to confirm.
  • concepts/automatic-organization.md — [patch] Could not find match for old_string
  • concepts/lora.md — [patch] Could not find match for old_string
  • concepts/rag-pipeline.md — [patch] Could not find match for old_string
```

この行を出したくない場合は `file_mutation_verifier: false`（または `HERMES_FILE_MUTATION_VERIFIER=0`）にしてください。この照合は、やり取りの終わりに実際の失敗が残っているときだけ働きます。失敗した修正を同じやり取りの中でやり直して成功したファイルについては、出ません。

**モデルのまとめより、この照合を信じてください。** この行が出ているということは、挙げられたファイルはディスク上で変更されて **いない** ということです。アシスタントの締めの文章が「終わりました」と言っていても同じです。よくある原因は次のとおりです。

- **書き込みが拒まれた** — そのパスが認証情報の除外一覧にあるか、`HERMES_WRITE_SAFE_ROOT` の外にあります（[ファイル書き込みの安全策](/hermes/docs/user-guide/security/#file-write-safety) をご覧ください）
- **修正の食い違い** — `old_string` が、ディスク上のファイルと一致しませんでした
- **構文の関門** — 書き込む前の内容が、JSON / YAML / TOML の確認に通りませんでした

書き込みが止められたときは、こんな行になります。

```
⚠️ File-mutation verifier: 2 file(s) were NOT modified this turn despite any wording above that may suggest otherwise. Run `git status` or `read_file` to confirm.
  • ~/.hermes/cron/jobs.json — [patch] Write denied: '…' is outside HERMES_WRITE_SAFE_ROOT (/path/to/project)
  • ~/.hermes/scripts/monitor.py — [write_file] Write denied: '…' is outside HERMES_WRITE_SAFE_ROOT (/path/to/project)
```

Hermes の状態（cron のジョブ、スキル、`~/.hermes/` の下のスクリプト）への書き込みが失敗しているなら、環境に `HERMES_WRITE_SAFE_ROOT` が設定されていないか確かめてください。cron の変更には、`jobs.json` を直接いじるのではなく、`cronjob` のツールか `hermes cron edit` を使ってください。

### 定型メッセージの表示言語 {#ui-language-for-static-messages}

`display.language` の設定は、利用者に見える定型のメッセージのごく一部を訳します。CLI の承認の確認と、いくつかのゲートウェイのコマンドの返答（再起動の準備の知らせ、「承認の期限切れ」「目標を解除しました」など）です。エージェントの応答、ログの行、ツールの出力、エラーの記録、コマンドの説明は訳され **ません**。それらは英語のままです。エージェント自身に別の言語で答えてほしい場合は、指示やシステムのメッセージでそう伝えてください。

指定できる値は `en`（既定）、`zh`（簡体字中国語）、`zh-hant`（繁体字中国語）、`ja`（日本語）、`de`（ドイツ語）、`es`（スペイン語）、`fr`（フランス語）、`tr`（トルコ語）、`uk`（ウクライナ語）、`af`（アフリカーンス語）、`ko`（韓国語）、`it`（イタリア語）、`ga`（アイルランド語）、`pt`（ポルトガル語）、`ru`（ロシア語）、`hu`（ハンガリー語）です。知らない値は英語に戻ります。

環境変数 `HERMES_LANGUAGE` を使えば、セッションごとに指定することもでき、そちらが設定の値より優先されます。

```yaml
display:
  language: zh   # CLI approval prompts appear in Chinese
```

| モード | 見えるもの |
|------|-------------|
| `off` | 静かです。最終的な応答だけが出ます |
| `new` | ツールが切り替わったときだけ、その印が出ます |
| `all` | すべてのツールの呼び出しが、短い抜粋とともに出ます（既定） |
| `verbose` | 引数、結果、詳細なログのすべてが出ます |

CLI では `/verbose` でこれらのモードを順に切り替えられます。メッセージングの経路（Telegram、Discord、Slack など）で `/verbose` を使うには、上の `display` の節で `tool_progress_command: true` を設定してください。すると、このコマンドがモードを切り替えて設定へ保存します。

ツールの進み具合の表示には、それを安全に出せるゲートウェイのアダプターが要ります。メッセージの編集に対応していない経路（Signal を含みます）は、`/verbose` が `off` 以外のモードを保存しても、進み具合の吹き出しを出しません。

### 集中表示（`/focus`、CLI と TUI） {#focus-view-focus-cli-tui}

`display.focus_view: true` は **集中表示** を有効にします。実況ではなく答えが欲しいときのための、出力を減らした表示のモードです。これは別の抑制の経路ではなく、同じ `tool_progress` の仕組みに薄く被せたものです。

- 有効にすると `tool_progress` は `off` に固定され、それまでのモードは `display.focus_saved_tool_progress` に控えられます。
- `/focus off` はそのモードをそのまま戻すので、`/verbose verbose` の設定は行って帰ってきても残ります。
- 終わったやり取りごとに、控えめな復帰の行 — `⋯ 7 tool lines hidden · /focus off to show` — が付きます。数えるのは *集中表示に入る前* のモードに対してなので、もともと切っていた行まで隠したとは言いません。
- ステータスバーには `◉ focus` の印が出続けるので（prompt_toolkit の CLI でも Ink の TUI でも）、減った表示が見えないままになることはありません。
- 集中表示の間に `/verbose` を回すと、モードの主導権が `/verbose` に戻り、この印は消えます。

集中表示は **表示だけ** のものです。会話の履歴、システムプロンプト、ツールの定義、リクエストの中身に手を入れることは決してありません。隠れた細部は画面から抑えられるだけで、捨てられることはなく、プロンプトのキャッシュにも一切影響しません。

### ステータスバーの項目の選択（CLI と TUI） {#status-bar-field-selection-clitui}

CLI や TUI の下端にある対話的なステータスバーには、モデル、文脈の使用量、圧縮の回数、裏の処理の数、時計、モードの印が並びます。`display.status_bar.fields` は、そのうちどれを表示するかを選びます。最小限のバー（モデルと時間だけ）にしたいときや、任意で出せるセッションのトークンの合計を出したいときに役立ちます。

```yaml
display:
  status_bar:
    fields: ["model", "duration", "total_tokens"]   # visibility only; built-in order is preserved
```

指定できる項目は、`model`、`context_detail`（使用中と全体のトークン）、`context_pct`（割合と目盛り）、`cache_hit`（プロンプトのキャッシュのヒット率。モデルの切り替えと圧縮でリセットされます）、`latency`（直近 10 回の API の平均の待ち時間）、`tps`（直近 10 回の出力のトークン毎秒）、`compressions`、`bg_tasks`、`bg_processes`、`bg_subagents`、`goal`、`duration`、`prompt_elapsed`、`idle_since`、`focus`、`yolo`、`stash`、`battery`、`title`（右端に寄るセッションの印）、そして `total_tokens`（セッションの合計。任意で出すもので、既定では決して表示されません）です。

補足です。

- 空の一覧（既定）にすると、標準の組み合わせ — `total_tokens` 以外のすべて — が使われます。
- この設定が決めるのは **表示するかどうかであって、並び順ではありません**。項目は、もともと決まっている位置に出ます。
- 幅の狭い端末では、設定にかかわらず幅の広いときだけの項目（`context_detail`、`cache_hit`、`latency`、`tps`、`prompt_elapsed`、`idle_since`）は落とされます（`cache_hit` は、52 桁以上の中くらいの幅でも表示されます）。
- `latency` と `tps` は、API の呼び出しが記録されるまで表示されません（たとえば Codex のアプリサーバーのバックエンドは待ち時間を報告しません）。
- ここでの `battery` と `title` の表示は、それぞれの切り替え（`/battery`、`/title`）と組み合わさります。その区画が出るには、両方が有効である必要があります。
- 同じキーは **Ink の TUI**（`hermes tui`）の状態の行にも効きます。そこでは `cache_hit`、`latency`、`tps` が、それぞれ 96 桁、104 桁、110 桁以上の端末で、幅に応じた末尾の区画（◎ / ◷ / ↑）として出ます。
- 表示だけのものです。プロンプトのキャッシュにもリクエストの中身にも影響しません。変更は次のセッションの開始から効きます。

### 実行時の情報の行（ゲートウェイのみ） {#runtime-metadata-footer-gateway-only}

`display.runtime_footer.enabled: true` にすると、Hermes はゲートウェイでのやり取りごとに、**最後の** メッセージへ実行時の情報の小さな行を足します。いまのところ、モデル、文脈の窓の割合、いまの作業ディレクトリを出せます。既定では無効です。すべての返答にこの出どころを付けたいチームは、ゲートウェイごとに有効にしてください。

```yaml
display:
  runtime_footer:
    enabled: true
    fields: ["model", "context_pct", "cwd"]   # order shown; drop any to hide
```

指定できる項目です。

| 項目 | 表示されるもの | 例 |
| --- | --- | --- |
| `model` | 提供元の接頭辞を外した、素のモデル ID | `gpt-5.4` |
| `context_pct` | 直前の呼び出しでの文脈の占有率 | `5%` |
| `latency` | そのやり取りの実際の長さ | `22s`、`1m05s` |
| `cwd` | ホームからの相対で見た作業ディレクトリ | `~` |

既定の組み合わせは `["model", "context_pct", "cwd"]` です。`latency` は任意なので、使いたいときは `fields` に足してください。データの得られない項目は、空の枠を出すのではなく、静かに飛ばされます。

`/footer` のコマンドで、どのセッションでも実行中に切り替えられます。

Telegram / Discord / Slack の返答に足される行の例です。

```
— claude-opus-4.7 · 12 tool calls · 2m 14s · $0.042
```

この行が付くのは、そのやり取りの **最後の** メッセージだけです。途中の更新はそのまま残ります。

### 経路ごとの進み具合の上書き {#per-platform-progress-overrides}

経路によって、どれだけ細かく見せたいかは違います。`display.platforms` で経路ごとのモードを設定してください。

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

CLI からは正式なキーを使ってください。`hermes config set display.platforms.telegram.streaming false` です。短い書き方の `hermes config set platforms.telegram.streaming false` も受け付けます。経路ごとの *表示* の設定（`streaming`、`show_reasoning`、`tool_progress` など）は `display.platforms` からしか読まれないので、`config set` / `get` / `unset` はこの短い書き方を正式なキーへ振り向け、その旨を表示します。最上位の `platforms.<name>` のかたまりにある接続のキー（`token`、`enabled`、`reply_to_mode`、`extra`）は振り向けられません。

上書きのない経路は、全体の `tool_progress` の値に従います。使える経路のキーは、`telegram`、`discord`、`slack`、`signal`、`whatsapp`、`matrix`、`mattermost`、`email`、`sms`、`homeassistant`、`dingtalk`、`feishu`、`wecom`、`weixin`、`bluebubbles`、`qqbot` です。従来の `display.tool_progress_overrides` のキーも、互換のために引き続き読み込まれますが、非推奨で、最初の読み込みのときに `display.platforms` へ移されます。

Signal が使える経路のキーとして挙がっているのは、この設定を経路ごとに保存できるからです。ただし、いまの Signal のアダプターは送ったメッセージを編集できないので、進み具合の吹き出しは出しません。Signal の `tool_progress` は `off` のままにしてください。ツールの呼び出しをその場で見たい場合は、CLI か、編集のできるメッセージングの経路を使ってください。

`interim_assistant_messages` はゲートウェイだけのものです。有効にすると、Hermes はやり取りの途中で出来上がったアシスタントの更新を、別々のチャットのメッセージとして送ります。これは `tool_progress` とは独立していて、ゲートウェイの逐次通信も要りません。

`show_commentary`（既定は `true`）は、Codex の Responses のモデルの解説の経路 — これらのモデルが、内部の推論とは別に生み出す、整った進み具合の語り — を制御します。有効にすると、出来上がった解説のメッセージが、やり取りの途中の見える更新として届きます（ゲートウェイでは、これに加えて `interim_assistant_messages` も必要です）。その語りが煩わしければ `false` にしてください。すると解説は推論の経路に戻り、`show_reasoning` が有効なときだけ表示されます。

## プライバシー {#privacy}

```yaml
privacy:
  redact_pii: false  # Strip PII from LLM context (gateway only)
```

`redact_pii` が `true` のとき、ゲートウェイは対応する経路について、システムプロンプトを LLM へ送る前に個人を特定できる情報を伏せます。

| 項目 | 扱い |
|-------|-----------|
| 電話番号（WhatsApp と Signal での利用者 ID） | `user_<12-char-sha256>` へハッシュ化 |
| 利用者 ID | `user_<12-char-sha256>` へハッシュ化 |
| チャットの ID | 数字の部分をハッシュ化し、経路の接頭辞は残します（`telegram:<hash>`） |
| ホームのチャンネル ID | 数字の部分をハッシュ化 |
| 利用者の名前やユーザー名 | **対象外**（本人が選んだもので、公に見えるため） |

**対応する経路:** 伏せる処理が効くのは WhatsApp、Signal、Telegram です。Discord と Slack が外れているのは、そこでの呼びかけの仕組み（`<@user_id>`）が、LLM の文脈に本物の ID を必要とするからです。

ハッシュは決まった手順で作られるので、同じ利用者は常に同じ値になります。したがってモデルは、グループのチャットでも利用者を区別できます。振り分けと配送には、内部で元の値が使われます。

### OpenAI Codex へのリクエストの名乗り {#openai-codex-request-identity}

OpenAI は、第三者の Codex の枠組みに対して名乗ることを求めています。
公式の Codex のエンドポイントへの、ChatGPT で認証したリクエストは、自動的に
`originator: hermes-agent` と `User-Agent: HermesAgent/<version>` を送ります。
既存の ChatGPT のアカウントのヘッダーはそのまま保たれます。プロンプトの中身が
追加で送られることも、記録の送信が行われることもありません。
OpenAI の API への直接のリクエストと、独自の中継のエンドポイントは変わりません。

## 音声からの文字起こし（STT） {#speech-to-text-stt}

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

言語の決まり方は、**どの** STT のプロバイダーでも同じです（local、groq、openai、mistral、xai、elevenlabs、deepinfra、コマンド型のプロバイダー、プラグイン）。`stt.<provider>.language` → `stt.language` → 環境変数 `HERMES_LOCAL_STT_LANGUAGE` → プロバイダーによる自動判定、の順です。**既定は `stt.language: "en"` です。** Whisper の自動判定は、短い音声やなまりのある音声をよく取り違え、音声メモが違う言語で書き起こされる形で現れるからです。英語以外を話す方は、`stt.language` に自分の言語コードを一度設定してください（たとえば `"es"`、`"zh"`、`"uk"`）。複数の言語を使う場合に自動判定へ戻すには、`""` にします。

ゲートウェイに、エージェントのために音声メモを書き起こさせつつ、その書き起こしをチャットへ戻したくない場合（たとえば顧客向けの WhatsApp のボット）は、`stt.echo_transcripts: false` にしてください。

プロバイダーごとの動きです。

- `local` は、あなたの端末で動く `faster-whisper` を使います。`pip install faster-whisper` で別途入れてください。無音からの作り話を防ぐ備えは既定で有効です。Silero の VAD が無音や雑音を Whisper へ届かせず、窓をまたいだ条件付けは無効で、モデル自身が音声ではなさそうだと判断し *かつ* 確信の低い区間は落とされます。音声でない音（音楽、環境音）をそのまま書き起こしたい場合は `stt.local.vad: false` にしてください。待ち時間を短くするため、モデルは音声メモの間もメモリーに載ったままです。`stt.local.unload_after_idle_seconds`（たとえば 5 分なら `300`）を設定すると、使われていないときに自動でモデルを解放します。CUDA のホストではこれで GPU のメモリーが空きます（手元の LLM が同じ GPU を使っているときの主な利点です）。CPU では、そのメモリーはプロセスが再び使えるようになりますが、OS から見た使用量は、そのプロセスが別の用途で必要とするまで縮まないことがあります。次の音声メモが来ると、モデルは裏で読み込み直されます。
- `groq` は Groq の Whisper 互換のエンドポイントを使い、`GROQ_API_KEY` を読みます。`stt.groq.language`（または全体の環境変数 `HERMES_LOCAL_STT_LANGUAGE`）を渡すと自動判定を飛ばせて、待ち時間が減ります。
- `openai` は OpenAI の音声の API を使い、`VOICE_TOOLS_OPENAI_KEY` を読みます。

クラウドのプロバイダー（groq、openai、mistral、xai、elevenlabs、deepinfra）では、`ffmpeg` が入っていれば既定で **送る前に無音を詰める** 処理が入ります。音声メモの長い間は、ファイルを送る前にこちら側で縮められ、それぞれの間から `cloud_trim_keep_ms` の分だけ残るので、自然な間合いは保たれます。音声が短くなると、送信は速くなり、音声の分単位の課金は減り、遠くのモデルが無音から作り話をすることも減ります。12 秒より短い音声では、この処理はまるごと飛ばされます（そこでは節約に意味がなく、いくつかのプロバイダーはどのみち 1 回あたりの最低額を課金します）。この処理は「できれば」のもので、ffmpeg がない、処理に失敗した、音声のほとんどが無音、あるいは縮めても 1 割ほどしか減らない場合は、元のファイルがそのまま送られます。常に元のファイルを送りたい場合（クラウドのプロバイダーで音楽や環境音を書き起こす場合など）は、`stt.cloud_trim_silence: false` にしてください。コマンド型とプラグインのプロバイダーへは、縮めた音声が渡ることはありません。

明示的に選んだ `stt.provider` は厳密に尊重されます。使えない場合、書き起こしはエラーになり、プロバイダーを勝手に切り替えるのではなく `hermes tools` を実行するよう案内します。プロバイダーを一度も選んでいない場合にだけ、Hermes は `local` → `groq` → `openai` の順で自動的に選びます。

Groq と OpenAI のモデルの上書きは、環境変数で行います。

```bash
STT_GROQ_MODEL=whisper-large-v3-turbo
STT_OPENAI_MODEL=whisper-1
GROQ_BASE_URL=https://api.groq.com/openai/v1
STT_OPENAI_BASE_URL=https://api.openai.com/v1
```

### 書き起こしのヒント（語彙の手がかり） {#transcription-prompt-vocabulary-hints}

`stt.prompt` は、ヒントを受け付ける STT のバックエンドへ渡される、任意の定型の手がかりです。Whisper 系のモデルが取り違えやすい固有名詞、製品名、専門用語に使ってください。

```yaml
stt:
  provider: "local"
  prompt: "Hermes, Teknium, Nous Research, kanban, Ollama"
```

**組み合わさり方。** 設定の値が土台になります。[`pre_transcription`](/hermes/docs/user-guide/features/hooks/#pre_transcription) のフックを登録したプラグインが、その上から項目ごとに書き換え、最後に書いたものが残ります。複数のプラグインの手がかりは、決まった手順で組み合わされます。プラグインの読み込みは ID の順に行われ、各プラグインの処理はそれぞれの登録順に走るので、同じプラグインの組み合わせなら、最終的な手がかりは必ず同じになります。フックが `prompt` に空の文字列を返すと、そのリクエストについては設定の手がかりが消えます。フックは `language` と `model` も上書きできます。`file_path` は読み取り専用で、変えようとしても記録されたうえで無視されます。フックを登録しておらず `stt.prompt` も設定していない場合、送られるリクエストは以前の版とまったく同じです。

**プロバイダーの対応。**

| プロバイダー | 手がかりの引数 | 動き |
|----------|-----------------|----------|
| `local`（faster-whisper） | `initial_prompt` | 手元のモデルへそのまま渡されます |
| `openai` | `prompt` | 書き起こしのリクエストにそのまま入ります |
| `groq` | `prompt` | 書き起こしのリクエストにそのまま入ります |
| `mistral` | `prompt` | 書き起こしのリクエストにそのまま入ります |
| `deepinfra` | `prompt` | OpenAI 互換の経路で、そのまま渡されます |
| `xai` | 非対応 | DEBUG に記録され、手がかりなしでリクエストが進みます |
| `elevenlabs` | 非対応 | DEBUG に記録され、手がかりなしでリクエストが進みます |
| `local_command` | 非対応 | DEBUG に記録され、手がかりなしでリクエストが進みます |
| `type: command` の `stt.providers.<name>` | 非対応 | DEBUG に記録され、手がかりなしでリクエストが進みます |
| プラグインが登録したプロバイダー | `transcribe(**extra)` の引数の `prompt` | 手がかりが設定されているときだけ送られるので、このキーより前からあるプロバイダーへの呼び出しは変わりません |

**長さ。** Whisper 系のモデルが参考にするのは、手がかりの末尾およそ 224 トークンだけです。Whisper 系のバックエンド（`local`、`openai`、`groq`、`deepinfra`）では、Hermes がこちら側でこの上限を守ります。長すぎる手がかりは末尾だけに切り詰められ、警告が記録されます。手がかりの長さが原因でリクエストがエラーになることはありません。ほかのバックエンド（`mistral`、プラグインのプロバイダー）は手がかりをそのまま受け取り、確認は自分で行います。いずれにせよ、手がかりは短く具体的に保ってください。

:::warning 手がかりは音声と一緒に送られます
最終的な手がかりは、音声のファイルと一緒に、設定した STT のプロバイダーへ送られます。秘密情報や、セッションから得た文脈は、`stt.prompt` にも、`pre_transcription` のフックが返すものにも入れないでください。プロバイダーが手元の `faster-whisper` ではなく、外部で動く API のときはとくに気を付けてください。
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

CLI で `/voice on` と打つとマイクのモードが有効になり、`record_key` で録音を開始・停止し、`/voice tts` で読み上げの返答を切り替えます。準備の手順と経路ごとの動きは [音声モード](/hermes/docs/user-guide/features/voice-mode/) をご覧ください。

## 逐次通信 {#streaming}

応答の全体を待つのではなく、届いたトークンを順に端末やメッセージングの経路へ流します。

### CLI での逐次通信 {#cli-streaming}

```yaml
display:
  streaming: true         # Stream tokens to terminal in real-time
  show_reasoning: true    # Also stream reasoning/thinking tokens (optional)
```

有効にすると、応答は逐次表示の枠の中に 1 トークンずつ現れます。ツールの呼び出しは、これまでどおり静かに記録されます。プロバイダーが逐次通信に対応していない場合は、自動的に通常の表示へ戻ります。

### ゲートウェイでの逐次通信（Telegram、Discord、Slack） {#gateway-streaming-telegram-discord-slack}

```yaml
streaming:
  enabled: true           # Enable progressive message editing (default: false)
  transport: auto         # "auto" (default) | "edit" (progressive message editing) | "off"
  edit_interval: 0.8      # Seconds between message edits (default: 0.8)
  buffer_threshold: 24    # Characters before forcing an edit flush (default: 24)
  cursor: " ▉"            # Cursor shown during streaming
  fresh_final_after_seconds: 0    # Opt in to fresh final (Telegram) when preview is this old
```

有効にすると、ボットは最初のトークンでメッセージを送り、トークンが届くたびにそれを少しずつ書き換えていきます。メッセージの編集に対応していない経路（Signal、メール、Home Assistant）は最初の試みで自動的に見分けられ、そのセッションでは逐次通信が穏やかに無効になり、メッセージがあふれることはありません。

トークン単位の書き換えなしで、やり取りの途中の自然な更新を別のメッセージとして送りたい場合は、`display.interim_assistant_messages: true` を設定してください。

**あふれたときの扱い:** 流している文章が経路のメッセージの長さの上限（およそ 4096 文字）を超えると、いまのメッセージを確定し、自動的に新しいメッセージが始まります。

**新しい確定メッセージ（Telegram）:** Telegram の `editMessageText` は元のメッセージの時刻を保つので、長く流れた返答は、終わったあとも最初のトークンの時刻のままになります。`fresh_final_after_seconds > 0` にすると、古くなった途中経過を、まったく新しい確定メッセージとして届け、途中経過はできる範囲で削除します。既定は `0` で、常にその場で確定するので、両方の操作が見えるクライアントで一瞬メッセージが重なって消える動きを避けられます。

:::note 経路ごとの逐次通信の既定
親となる `streaming.enabled` のスイッチは既定で `false` です。これを入れるまで、何も流れません。有効にしたあとは、流すかどうかは **経路ごと** に決まります。Telegram は `display.platforms.telegram.streaming: true`（流す）、Discord は `display.platforms.discord.streaming: false`（流さない）で出荷されています。つまり逐次通信を有効にすると、Telegram はそのまま流れ始め、Discord はこの切り替えを変えるまでメッセージ全体での返答のままです。これらの経路ごとのスイッチは、ダッシュボードの **Channels** の切り替えからでも、`~/.hermes/config.yaml` を直接編集しても変えられます。
:::

## グループチャットのセッションの分け方 {#group-chat-session-isolation}

CLI、TUI やダッシュボード、メッセージングのゲートウェイをまたいで、
同時に開けるチャットのセッションの数を制限します。

```yaml
max_concurrent_sessions: null  # null/0 = unlimited; positive integer = active session cap
```

枠を消費するのは、セッションが **最初のやり取り** を走らせたときであって、チャットの
ウィンドウを開いたときではありません。チャットを開いても、再開しても、つなぎ直しても、
メッセージを送るまでは何も消費しないので、放置されたデスクトップのタブ（や、不安定な
websocket が引き起こす裏での再開）が、この上限を共有するメッセージングのゲートウェイを
干上がらせることはありません。

上限に達すると、Hermes はどの画面が枠を握っているかを名指しした、はっきりした
メッセージを返します。すでに動いているセッションは、これまでどおりに動きます。
いまの枠の使用状況と、その持ち主のすべては `hermes status` で確認できます。

正式なキーは最上位の `max_concurrent_sessions` です。Hermes は
`gateway.max_concurrent_sessions` も控えとして受け付けますが、両方が設定されている
場合は最上位のキーが優先されます。

この上限は、手元の実行時の占有ファイルで守られる、できる範囲のものです。登録簿が
読めなかったり施錠できなかったりした場合、利用者が取り残されないよう Hermes は
通す側に倒れます。これは 1 台のホストと 1 つのプロファイルでの運用を想定しており、
複数の端末で共有された `$HERMES_HOME` を想定したものではありません。

共有のチャットで、部屋ごとに 1 つの会話にするか、参加者ごとに 1 つの会話にするかを決めます。

```yaml
group_sessions_per_user: true  # true = per-user isolation in groups/channels, false = one shared session per chat
```

- `true` が既定で、こちらをお勧めします。Discord のチャンネル、Telegram のグループ、Slack のチャンネルのような共有の場では、経路が利用者 ID を渡してくれる限り、送り手ごとに自分のセッションが割り当てられます。
- `false` にすると、従来の部屋を共有する動きに戻ります。チャンネルを 1 つの共同の会話として扱わせたいときには役立ちますが、利用者が文脈、トークンの費用、割り込みの状態を共有することにもなります。
- 個別のメッセージは影響を受けません。Hermes はこれまでどおり、チャットや個別メッセージの ID で分けます。
- スレッドは、どちらの設定でも元のチャンネルから分かれたままです。`true` の場合は、スレッドの中でも参加者ごとに自分のセッションが割り当てられます。

動きの詳しい説明と例は、[セッション](/hermes/docs/user-guide/sessions/) と [Discord の案内](/hermes/docs/user-guide/messaging/discord/) をご覧ください。

## 許可していない相手からの個別メッセージへの動き {#unauthorized-dm-behavior}

知らない相手から個別のメッセージが来たときに、Hermes がどうするかを決めます。

```yaml
unauthorized_dm_behavior: pair

whatsapp:
  unauthorized_dm_behavior: ignore
```

- `pair` は、チャット型で個別のやり取りをする経路での既定です。Hermes は利用を断りますが、個別のやり取りの中で 1 回限りのペアリングのコードを返します。
- `ignore` は、許可していない個別メッセージを黙って捨てます。
- メールは、`platforms.email.unauthorized_dm_behavior: pair` を設定しない限り `ignore` が既定です。受信箱には、関係のない未読のメールが入っていることがあるからです。
- 経路ごとの節は全体の既定を上書きするので、広くペアリングを有効にしたまま、ある経路だけを静かにできます。

## クイックコマンド {#quick-commands}

LLM を呼ばずにシェルのコマンドを走らせるか、あるコマンドを別のコマンドの別名にする、独自のコマンドを定義できます。Exec のクイックコマンドはトークンを一切使わないので、メッセージングの経路（Telegram、Discord など）からサーバーを手早く確かめたり、道具のスクリプトを動かしたりするのに便利です。

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

使い方は、CLI やどのメッセージングの経路でも `/status`、`/disk`、`/update`、`/gpu`、`/restart` と打つだけです。`exec` のコマンドはホスト上で直接走り、その出力をそのまま返します。LLM の呼び出しはなく、トークンも消費しません。`alias` のコマンドは、設定した先のコマンドへ置き換えられます。

- **30 秒で時間切れ** — 長く走るコマンドは、エラーのメッセージとともに止められます
- **優先順位** — クイックコマンドはスキルのコマンドより先に照合されるので、スキルの名前を上書きできます
- **補完** — クイックコマンドは呼び出しのときに解決され、組み込みのコマンドの補完の表には出ません
- **種類** — 使えるのは `exec` と `alias` です。ほかの種類はエラーになります
- **どこでも動きます** — CLI、Telegram、Discord、Slack、WhatsApp、Signal、メール、Home Assistant

文字列だけの指示の近道は、クイックコマンドとしては使えません。繰り返し使う指示の流れには、スキルを作るか、既存のコマンドの別名にしてください。

## 人らしい間 {#human-delay}

メッセージングの経路で、人が返すような間合いをまねます。

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

**`mode`** は、スクリプトの作業ディレクトリと Python の実行系を決めます。

- **`project`**（既定） — スクリプトは、そのセッションの作業ディレクトリで、いま有効な virtualenv や conda の python を使って走ります。プロジェクトの依存関係（`pandas`、`torch`、プロジェクトのパッケージ）と相対パス（`.env`、`./data.csv`）が自然に解決され、`terminal()` から見えるものと揃います。
- **`strict`** — スクリプトは一時的な作業ディレクトリで、`sys.executable`（Hermes 自身の python）を使って走ります。同じ結果を再現しやすい代わりに、プロジェクトの依存関係と相対パスは解決されません。

環境の掃除（`*_API_KEY`、`*_TOKEN`、`*_SECRET`、`*_PASSWORD`、`*_CREDENTIAL`、`*_PASSWD`、`*_AUTH` を取り除きます）と、使えるツールの限定は、どちらのモードでも同じように働きます。モードを変えても、安全性の構えは変わりません。

## Web 検索のバックエンド {#web-search-backends}

`web_search` と `web_extract` のツールは、5 つのバックエンドに対応しています。`config.yaml` か `hermes tools` で設定してください。

```yaml
web:
  backend: firecrawl    # firecrawl | searxng | parallel | tavily | keenable | exa

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
| **Parallel** | `PARALLEL_API_KEY`（任意 — 鍵なしの無料枠あり） | ✔ | ✔ |
| **Tavily** | `TAVILY_API_KEY`（任意 — 選んだ場合は鍵なしでも動きます） | ✔ | ✔ |
| **Exa** | `EXA_API_KEY`（任意 — 鍵なしの無料枠あり） | ✔ | ✔ |

**バックエンドの選ばれ方:** 実行時には、常に保存された `web.backend` の選択が使われます（`hermes tools` で設定します。`nous` は管理された Tool Gateway を通します）。Web のバックエンドを一度も選んでいない場合にだけ、使える API キーから自動で判定されます。`SEARXNG_URL` だけがあれば SearXNG、`EXA_API_KEY` だけなら Exa、`TAVILY_API_KEY` だけなら Tavily、`PARALLEL_API_KEY` だけなら Parallel、`KEENABLE_API_KEY` だけなら Keenable が使われます。**選択も認証情報もまったくない** 場合、リクエストは鍵なしの無料枠の輪（Exa / Parallel / Firecrawl / Keenable）を順に回り、流量制限に当たったら自動で次へ移ります。詳しくは [Web 検索の案内](/hermes/docs/user-guide/features/web-search/) をご覧ください。いったん選択があると、`.env` にキーを足しても経路は変わりません。`hermes tools` で Tavily、Firecrawl、Keenable を選ぶ場合は、キーがなくても動きます。

**SearXNG** は、70 以上の検索エンジンに問い合わせる、無料で自前に置けるプライバシー重視のまとめ検索です。API キーは要りません。`SEARXNG_URL` に自分の環境を指定するだけです（たとえば `http://localhost:8080`）。SearXNG は検索だけなので、`web_extract` には別の抽出のプロバイダーが要ります（`web.extract_backend` を設定してください）。Docker での準備の手順は [Web 検索の設定の案内](/hermes/docs/user-guide/features/web-search/) をご覧ください。

**自前で動かす Firecrawl:** `FIRECRAWL_API_URL` に自分の環境を指定します。独自の URL を設定すると、API キーは任意になります（サーバー側で認証を止めるには `USE_DB_AUTHENTICATION=*** を設定します）。

**Parallel の検索のモード:** `PARALLEL_SEARCH_MODE` で検索の動きを決めます。`fast`、`one-shot`、`agentic` のいずれかです（既定は `agentic`）。

**Exa:** `~/.hermes/.env` に `EXA_API_KEY` を設定します。`category` での絞り込み（`company`、`research paper`、`news`、`people`、`personal site`、`pdf`）と、ドメインや日付での絞り込みに対応しています。

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

- `must_respond`（既定） — ダイアログを受け止め、`browser_snapshot.pending_dialogs` に出し、エージェントが `browser_dialog(action=...)` を呼ぶのを待ちます。`dialog_timeout_s` 秒たっても応答がなければ、ページの JS が永遠に止まらないよう、自動で閉じます。
- `auto_dismiss` — 受け止めて、すぐ閉じます。エージェントはあとから、`browser_snapshot.recent_dialogs` に `closed_by="auto_policy"` として記録を見られます。
- `auto_accept` — 受け止めて、すぐ受け入れます。しつこい `beforeunload` の確認を出すページで役立ちます。

ダイアログの扱いの全体は、[ブラウザーの機能のページ](/hermes/docs/user-guide/features/browser/#browser_dialog) をご覧ください。

ブラウザーのツールは複数のプロバイダーに対応しています。Browserbase、Browser Use、手元の Chromium 系の CDP の設定については、[ブラウザーの機能のページ](/hermes/docs/user-guide/features/browser/) をご覧ください。

## タイムゾーン {#timezone}

サーバーのタイムゾーンを、IANA のタイムゾーンの文字列で上書きします。ログの時刻、cron の予定、システムプロンプトへ入る時刻に効きます。

```yaml
timezone: "America/New_York"   # IANA timezone (default: "" = server-local time)
```

指定できるのは、IANA のタイムゾーンの識別子ならどれでもです（たとえば `America/New_York`、`Europe/London`、`Asia/Kolkata`、`UTC`）。空にするか書かなければ、サーバーの時刻が使われます。

## Discord {#discord}

メッセージングのゲートウェイでの、Discord に固有の動きを設定します。

```yaml
discord:
  require_mention: true          # Require @mention to respond in server channels
  free_response_channels: ""     # Comma-separated channel IDs where bot responds without @mention
  auto_thread: true              # Auto-create threads on @mention in channels
```

- `require_mention` — `true`（既定）のとき、ボットはサーバーのチャンネルでは `@BotName` と呼ばれたときだけ応答します。個別のやり取りでは、呼びかけなしでも常に動きます。
- `free_response_channels` — 呼びかけなしでも、すべてのメッセージにボットが応答するチャンネルの ID を、コンマ区切りで並べます。
- `auto_thread` — `true`（既定）のとき、チャンネルでの呼びかけは会話のスレッドを自動で作り、チャンネルをすっきり保ちます（Slack のスレッドと似た動きです）。

## セキュリティ {#security}

実行前の検査と、秘密情報を伏せる処理です。

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

- `redact_secrets` — `true` のとき、ツールの出力が会話の文脈やログへ入る前に、API キー、トークン、パスワードらしく見える並びを自動で見つけて伏せます。**既定で有効** です。伏せる仕組みの開発や不具合の調査で、そのままの文字列が必要なときにだけ、明示的に `false` にしてください。
- `tirith_enabled` — `true` のとき、ターミナルのコマンドは実行の前に [Tirith](https://github.com/sheeki03/tirith) で調べられ、危ないかもしれない操作が見つけられます。
- `tirith_path` — tirith の実行ファイルのパスです。標準的でない場所に入れている場合に設定します。
- `tirith_timeout` — tirith の検査を待つ最大の秒数です。検査が時間切れになっても、コマンドは進みます。
- `tirith_fail_open` — `true`（既定）のとき、tirith が使えなかったり失敗したりしても、コマンドの実行は許されます。tirith が確かめられないときにコマンドを止めたい場合は `false` にしてください。

## サイトの遮断の一覧 {#website-blocklist}

エージェントの Web やブラウザーのツールから、特定のドメインへ届かないようにします。

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

有効にすると、遮断するドメインの型に一致する URL は、Web やブラウザーのツールが動く前に拒まれます。これは `web_search`、`web_extract`、`browser_navigate`、そして URL に触れるすべてのツールに効きます。

ドメインの書き方は、次に対応しています。
- ちょうどそのドメイン: `admin.example.com`
- 下位のドメインをまとめて: `*.internal.company.com`（すべての下位ドメインを遮断します）
- トップレベルをまとめて: `*.local`

共有のファイルには、1 行に 1 つずつドメインの規則を書きます（空の行と `#` で始まる注釈は無視されます）。ファイルがなかったり読めなかったりすると警告が出ますが、ほかの Web のツールが止まることはありません。

この方針は 30 秒だけ保持されるので、設定の変更は再起動なしですぐに効きます。

## 賢い承認 {#smart-approvals}

危ないかもしれないコマンドを Hermes がどう扱うかを決めます。

```yaml
approvals:
  mode: smart   # smart | manual | off
```

| モード | 動き |
|------|----------|
| `smart`（既定） | 補助の LLM を使って、印の付いたコマンドが本当に危ないかを見極めます。危険の低いコマンドは、そのコマンドに限って自動で承認されます。本当に危ないコマンドは拒まれ、判断の付かないものは利用者へ回されます。 |
| `manual` | 印の付いたコマンドを実行する前に、必ず利用者に尋ねます。CLI では対話的な承認の画面が出ます。メッセージングでは、承認待ちとして並べられます。 |
| `off` | 承認の確認をすべて飛ばします。`HERMES_YOLO_MODE=true` と同じです。**気を付けて使ってください。** |

賢い承認のモードは、承認に疲れないという点でとくに役立ちます。安全な操作についてはエージェントがもっと自分で進められるようにしながら、本当に破壊的なコマンドは捕まえられるからです。

:::warning
`approvals.mode: off` を設定すると、ターミナルのコマンドについての安全の確認がすべて止まります。信頼できる、隔離された環境でだけ使ってください。
:::

### 拒否が続いたときの遮断 {#denial-circuit-breaker}

`approvals.denial_breaker_threshold`（既定は `3`）は、賢い承認の判定が拒み続けているコマンドの言い換えを、エージェントが延々と試すのを防ぎます。やり直しのたびに、見張り役の LLM の呼び出しが 1 回増えてしまうからです。1 つのセッションでその回数だけ拒否が続くと、拒否のメッセージは、やめて、止められた操作を報告し、手で実行するか `/approve` するよう利用者に頼め、という強い指示に変わります。承認が 1 回あれば数え直しになります。止めたい場合は `0` にしてください。

```yaml
approvals:
  denial_breaker_threshold: 3   # 0 disables the breaker
```

### 拒否の規則 {#deny-rules}

`approvals.deny` は、一致したターミナルのコマンドを無条件で止める、記述の型の一覧です。`--yolo`、`/yolo`、`mode: off` の下でも止めます。組み込みの厳格な遮断一覧に対する、利用者が編集できる相棒です。

```yaml
approvals:
  deny:
    - "git push --force*"
    - "*curl*|*sh*"
```

型は大文字小文字を区別しない fnmatch の記法で、YAML では引用符で囲む必要があります（先頭が裸の `*` だと読み込みのエラーになります）。詳しくは [セキュリティ — 利用者が決める拒否の規則](/hermes/docs/user-guide/security/#user-defined-deny-rules-approvalsdeny) をご覧ください。

### 賢い承認の独自の方針 {#custom-smart-approval-policy}

`approvals.smart_policy` を使うと、賢い承認の判定役への指示に、自分の規則を足せます。設定すると、その文章は見張り役の LLM のシステムプロンプト（信頼できる経路で、信頼できないコマンドの文面と並べられることは決してありません）に足されるので、コードを書き換えずに、自分の環境に合わせて判断を厳しくも緩くもできます。

```yaml
approvals:
  smart_policy: |
    Always ESCALATE commands that modify anything under /etc.
    APPROVE docker compose restarts in ~/deploys — they are routine here.
```

## 復元点 {#checkpoints}

ファイルを壊す操作の前に、自動でファイルシステムのスナップショットを取ります。詳しくは [復元点と巻き戻し](/hermes/docs/user-guide/checkpoints-and-rollback/) をご覧ください。

```yaml
checkpoints:
  enabled: false                 # Enable automatic checkpoints (also: hermes chat --checkpoints). Default: false (opt-in).
  max_snapshots: 20              # Max checkpoints to keep per directory (default: 20)
```

## 委任 {#delegation}

委任のツールでのサブエージェントの動きを設定します。

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

**サブエージェントのプロバイダーとモデルの上書き:** 既定では、サブエージェントは親のエージェントのプロバイダーとモデルを引き継ぎます。`delegation.provider` と `delegation.model` を設定すると、別のプロバイダーとモデルの組み合わせへ振り分けられます。たとえば、主のエージェントが費用のかかる推論型のモデルで動いている間、狭い範囲の下請けの作業には安くて速いモデルを使う、といったことができます。

**エンドポイントの直接の上書き:** 独自のエンドポイントをはっきり指定したい場合は、`delegation.base_url`、`delegation.api_key`、`delegation.model` を設定します。これでサブエージェントはその OpenAI 互換のエンドポイントへ直接向かい、`delegation.provider` より優先されます。`delegation.api_key` を書かない場合、Hermes が頼るのは `OPENAI_API_KEY` だけです。`delegation.base_url` と一緒に `delegation.provider` も設定されている場合、明示したエンドポイントとキーが優先されますが、そのプロバイダーのリクエストの設定（`custom_providers` の項目にある `extra_body` の上書きと出力トークンの上限）はサブエージェントへ引き継がれます。

**子ごとのリクエストの設定（`request_overrides`）:** `delegation.request_overrides` は、サブエージェントの API の呼び出しごとに送られるリクエストの設定の辞書です。最上位のキーは API の引数（たとえば `service_tier`）で、`extra_body` の下位の辞書はリクエストの `extra_body` に合わせられます。これは **3 つすべて** の決まり方 — `base_url` の直接指定、名前付きの `provider`、まるごと引き継ぎ — で尊重されるので、このキーは必ず効きます。優先の順は、明示した `request_overrides` の値が、実行時や親から来た上書きの **上に** 重なります。最上位の明示したキーが勝ち、`extra_body` は 1 段階だけ深く合わせられるので、実行時の `extra_body` のキー（たとえばプロバイダーの `thinking: {type: disabled}` の性格付け）は、あなたのキーがそれを書き換えない限り残ります。典型的な使い道は、委任した子への OpenRouter の振り分けの指定です。

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

**通信の方式（`api_mode`）:** Hermes は `delegation.base_url` から通信の方式を自動で判定します（たとえば `/anthropic` で終わるパスは `anthropic_messages`。Codex、Anthropic のネイティブ、Kimi-coding のホスト名は、これまでの判定のままです）。この見立てで分類できないエンドポイント — たとえば Azure AI Foundry、MiniMax、Zhipu GLM、あるいは Anthropic 形式のバックエンドを前に立てた LiteLLM の中継 — では、`delegation.api_mode` に `chat_completions`、`codex_responses`、`anthropic_messages` のいずれかを明示してください。空のまま（既定）にすれば、自動の判定が続きます。

委任のプロバイダーは、CLI やゲートウェイの起動時と同じ方法で認証情報を解決します。設定できるプロバイダーはすべて使えます。`openrouter`、`nous`、`copilot`、`zai`、`kimi-coding`、`minimax`、`minimax-cn` です。プロバイダーを設定すると、基点の URL、API キー、通信の方式が自動で正しく解決されるので、認証情報を手で結ぶ必要はありません。

**優先の順:** 設定の `delegation.base_url` → 設定の `delegation.provider` → 親のプロバイダー（引き継ぎ）。モデルは、設定の `delegation.model` → 親のモデル（引き継ぎ）です。`provider` を設定せず `model` だけを設定すると、親の認証情報を保ったままモデル名だけが変わります（OpenRouter のように、同じプロバイダーの中でモデルを変えたいときに便利です）。

**横幅と深さ:** `max_concurrent_children` は、1 回のまとまりで並行して走るサブエージェントの数を抑えます（既定は `3`、下限は 1、上限はありません）。環境変数 `DELEGATION_MAX_CONCURRENT_CHILDREN` でも設定できます。モデルが上限より長い `tasks` の配列を出した場合、`delegate_task` は黙って切り詰めるのではなく、上限を説明するツールのエラーを返します。`max_spawn_depth` は委任の木の深さを決めます（1 から 3 に抑えられます）。既定の `1` では委任は平らで、子は孫を生めず、`role="orchestrator"` を渡しても黙って `leaf` に落ちます。`2` にすると、取りまとめ役の子が末端の孫を生めるようになり、`3` で 3 段になります。エージェントは呼び出しごとに `role="orchestrator"` で取りまとめを選びます。`orchestrator_enabled: false` にすると、どの子も強制的に末端に戻されます。費用は掛け算で増えます。`max_spawn_depth: 3` と `max_concurrent_children: 3` では、木は 3×3×3 = 27 の末端エージェントが同時に動くところまで届きます。使い方の型は [サブエージェントへの委任 → 深さの上限と入れ子の取りまとめ](/hermes/docs/user-guide/features/delegation/#depth-limit-and-nested-orchestration) をご覧ください。

**子のプロセスの知らせ:** サブエージェントが始めた裏のプロセスは、その完了や監視の知らせを親の会話へ回しますが、そこでは既定で **抑えられます**。子がまとめた結果こそが成果だからです。届けたい場合は `delegation.surface_child_process_notifications: true` を設定してください（どのサブエージェントからかも示されます）。委任の結果そのものが抑えられることはありません。[サブエージェントへの委任 → 子の裏のプロセスの知らせ](/hermes/docs/user-guide/features/delegation/#child-background-process-notifications) をご覧ください。

## 聞き返し {#clarify}

聞き返しへの返事を、ゲートウェイがどれだけ待つかを決めます。正式なキーは `agent.clarify_timeout`（既定は `3600` 秒）です。従来の最上位の `clarify.timeout` も、明示的に設定されていれば引き続き尊重されます。

```yaml
agent:
  clarify_timeout: 3600        # Seconds to wait for user clarification response (0 or less = unlimited)
```

## 文脈のファイル（SOUL.md、AGENTS.md） {#context-files-soulmd-agentsmd}

Hermes は 2 つの異なる文脈の範囲を使います。

| ファイル | 役割 | 範囲 |
|------|---------|-------|
| `SOUL.md` | **エージェントの主たる人格** — そのエージェントが何者かを決めます（システムプロンプトの 1 番目） | `~/.hermes/SOUL.md` または `$HERMES_HOME/SOUL.md` |
| `.hermes.md` / `HERMES.md` | プロジェクトごとの指示（いちばん優先されます） | git の起点までさかのぼります |
| `AGENTS.md` | プロジェクトごとの指示、コードの書き方の取り決め | ディレクトリをたどって探します |
| `CLAUDE.md` | Claude Code の文脈のファイル（これも見つけます） | 作業ディレクトリだけ |
| `.cursorrules` | Cursor IDE の規則（これも見つけます） | 作業ディレクトリだけ |
| `.cursor/rules/*.mdc` | Cursor の規則のファイル（これも見つけます） | 作業ディレクトリだけ |

- **SOUL.md** は、そのエージェントの主たる人格です。システムプロンプトの 1 番目を占め、組み込みの既定の人格をまるごと置き換えます。エージェントが何者かを自由に決めたいときは、これを編集してください。
- SOUL.md がない、空、あるいは読み込めない場合、Hermes は組み込みの既定の人格に戻ります。
- **プロジェクトの文脈のファイルには優先順位があります。** 読み込まれるのは 1 種類だけで、最初に見つかったものが使われます。`.hermes.md` → `AGENTS.md` → `CLAUDE.md` → `.cursorrules` の順です。SOUL.md は、それとは別に必ず読み込まれます。
- **AGENTS.md** は階層をなします。下位のディレクトリにも AGENTS.md があれば、すべてまとめられます。
- `SOUL.md` がまだない場合、Hermes は既定のものを自動で用意します。
- 読み込まれた文脈のファイルは、すべて `context_file_max_chars` の文字数（既定は 20,000）に抑えられ、うまい形で切り詰められます。

あわせてご覧ください。
- [人格と SOUL.md](/hermes/docs/user-guide/features/personality/)
- [文脈のファイル](/hermes/docs/user-guide/features/context-files/)

## 作業ディレクトリ {#working-directory}

| 場面 | 既定 |
|---------|---------|
| **CLI（`hermes`）** | コマンドを実行したディレクトリ |
| **メッセージングのゲートウェイ** | `~/.hermes/config.yaml` の `terminal.cwd`。未設定ならホームディレクトリの `~` |
| **Docker / Singularity / Modal / SSH** | コンテナや離れた端末の中の、その利用者のホームディレクトリ |

作業ディレクトリを上書きするには、次のようにします。
```yaml
# In ~/.hermes/config.yaml:
terminal:
  cwd: /home/myuser/projects
```

`~/.hermes/.env` にある `MESSAGING_CWD` と、直接書いた `TERMINAL_CWD` は、従来との互換のための控えです。新しく設定するなら `terminal.cwd` を使ってください。

## ネットワーク {#network}

外向きの HTTP の接続に関する回避策です。

```yaml
network:
  force_ipv4: false   # Force IPv4 for outbound connections (default: false)
```

`force_ipv4` — IPv6 が壊れている、あるいは届かないサーバーでは、Python が AAAA のレコードを先に引くため、IPv4 へ戻るまで TCP の時間切れいっぱい待ってしまうことがあります。`true` にすると IPv6 をまるごと飛ばし、IPv4 で直接つなぎます。

## 導入時の案内 {#onboarding}

初回の案内と、組み立て形式のプロフィール作成の提案です。

```yaml
onboarding:
  profile_build: "ask"   # "ask" (default) | "off"
  seen: {}               # internal latch — leave empty
```

- `profile_build` — ゲートウェイでいちばん最初のメッセージのときに提案される、プロフィール作成の流れを決めます。`"ask"`（既定）は利用者のプロフィールを作ることを提案します。この提案は **こちらから選ぶ形で、同意を前提** としています。エージェントは何かを調べる前に必ず尋ね、つないだアカウントを黙って読むことはありません。`"off"` は、そっけない案内だけを出します。この提案は多くても 1 回だけです。
- `seen` — 内部の状態です。Hermes は表示した案内をここに記録し、二度と出さないようにします。プロフィール作成の提案も、一度出したらここに記録されます。手で編集しないでください。すべての案内をもう一度見たい場合は、`onboarding` の節をまるごと消してください。

## ダッシュボード {#dashboard}

[Web ダッシュボード](/hermes/docs/user-guide/features/web-dashboard/) の設定です。見た目のテーマ、公開する URL、認証のプロバイダーを決めます。認証のプロバイダー（OAuth、パスワード、drain）については Web ダッシュボードのページに詳しくあります。ここに示すのは `config.yaml` での書き方です。

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
  ws_orphan_activity_stale_s: 600.0 # Activity idle bound before a detached RUNNING turn is interrupted (seconds)
  startup_orphan_sweep: true  # Close session rows orphaned by a dead gateway process at boot
```

- `theme` — ダッシュボードの見た目のテーマです。
- `show_token_analytics` — 既定では無効です。Analytics のページとトークンや費用の数字は、**手元で見積もった下限** です（補助の呼び出し、やり直し、代替、キャッシュへの書き込みを含みません）。したがって、プロバイダーからの請求よりかなり低く出ることがあります。それが請求額ではないと分かったうえでだけ、`true` にしてください。
- `public_url` — 設定すると、OAuth の `redirect_uri` を組み立てる元になる完全な情報（方式、ホスト、任意でパスの接頭辞）になります。`X-Forwarded-*` のヘッダーを確実には転送してくれないリバースプロキシの後ろに置く場合に設定してください。空にすると、プロキシのヘッダーから組み立て直します。
- `trusted_proxies` — `X-Forwarded-Proto` と `X-Forwarded-For` を渡してよい IP アドレスか、範囲を限った CIDR のネットワークです。ループバックは自動的に信頼されたままです。TLS のリバースプロキシが別のコンテナやホストからつないでくる場合に設定してください。プロキシの正確な IP が望ましく、そのアドレスが変わる場合にだけ、小さな専用のネットワークを使ってください。ワイルドカードと `/0` のネットワークは拒まれます。
- `oauth` / `basic_auth` / `drain_auth` — 同梱のダッシュボードの認証プラグインが読む、認証のプロバイダーの設定です。drain の秘密情報そのものは、ここでは設定 **しません**。環境変数 `HERMES_DASHBOARD_DRAIN_SECRET` で与えます。認証の設定の全体は [Web ダッシュボード](/hermes/docs/user-guide/features/web-dashboard/) をご覧ください。
- `ws_ping_interval` / `ws_ping_timeout` — ループバック以外への接続での、WebSocket の生存確認の調整です（ループバックの接続では確認しません）。既定の 20 秒では見せかけの 1006 の切断が起きてしまう、待ち時間の長い経路（Tailscale、遠くの SSH のトンネル）では上げてください。
- `ws_orphan_reap_grace_s` — WebSocket から切り離されたセッションが、置き去りの片付けに回収されるまでの猶予です。クライアントのつなぎ直しが遅いなら、生存確認の値と一緒に上げてください。（`HERMES_TUI_WS_ORPHAN_REAP_GRACE_S` は、内部の上書きとして残っています。）
- `ws_orphan_activity_stale_s`（既定は `600`） — 切り離された **実行中の** やり取りについて、その活動の時計（`agent.turn_liveness` の見張りが見るのと同じ時計。API の待ち、逐次受信のトークン、ツールの生存信号）がどれだけ止まったら、置き去りの片付けが割り込むかを決めます。クライアントがいなくても実際に進んでいるやり取りは、切り離されたまま最後まで走ります。ノート PC を閉じても、スマートフォンのアプリを裏へ回しても、デスクトップを更新しても、健全な長いやり取りが打ち切られることはもうありません。本当に詰まったやり取りだけが割り込まれます。活動にかかわらず猶予の時間で割り込ませたい場合（従来の動き）は `0` にしてください。
- `startup_orphan_sweep`（既定は `true`） — 上の置き去りの片付けの時計はプロセスの中にあるので、それが働く前にゲートウェイが再起動すると（更新、異常終了、systemd）、そのセッションの行は永遠に開いたまま残り、`/resume` やダッシュボードに幻の「実行中」の作業として現れます。ゲートウェイが起動するたびに — 標準入出力の TUI（`entry.main`）でも、デスクトップやダッシュボードの WebSocket の補助プロセス（`handle_ws`）でも — 元が `tui` / `desktop` / `subagent` の行のうち、開始の時刻 **と** 最新のメッセージの両方がセッションの保持期間（`HERMES_TUI_SESSION_TTL_S`、既定は 6 時間）より古いものは、`end_reason: startup_orphan_reap` として閉じられます。メッセージングの経路のセッション（Telegram、Discord など）には決して触れません。メモリー上で生きているセッション（すでに再開したクライアント）は対象外で、片付けられたセッションもあとから再開できます。
