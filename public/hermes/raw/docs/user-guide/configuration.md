---
title: "Hermes Agent の設定"
description: "Hermes Agent を設定する — config.yaml、プロバイダ、モデル、API キーなど"
upstream_path: user-guide/configuration.md
upstream_blob: fc70c52a3d8018feed0847d79a421a62b8346528
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/configuration
---

# Hermes Agent の設定 {#hermes-agent-configuration}

設定はすべて `~/.hermes/` ディレクトリにまとまっていて、すぐに開けます。

:::tip 動く `config.yaml` にたどり着く一番かんたんな道
`hermes setup --portal` を実行します。OAuth を 1 回通すだけで、モデルのプロバイダと Tool Gateway の 4 つのツールが、YAML を手で書かずにそろいます。Portal の購読者は、トークン課金のプロバイダが 10% 割引にもなります。[Nous Portal](/hermes/docs/integrations/nous-portal/) をご覧ください。
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
`hermes config set` コマンドは、値を書き込むファイルを自動で振り分けます。API キーは `.env` へ、それ以外は `config.yaml` へ保存されます。
:::

## 設定の優先順位 {#configuration-precedence}

設定は次の順で解決されます（上ほど優先されます）。

1. **CLI の引数** — 例: `hermes chat --model anthropic/claude-sonnet-4`（その 1 回の実行だけ上書きします）
2. **`~/.hermes/config.yaml`** — 秘密でない設定すべての主役となる設定ファイル
3. **`~/.hermes/.env`** — 環境変数のフォールバック。秘密の値（API キー、トークン、パスワード）には**必須**です
4. **組み込みの既定値** — 何も設定されていないときに使われる、安全側に倒したハードコード値

:::info 目安
秘密の値（API キー、ボットトークン、パスワード）は `.env` へ。それ以外（モデル、ターミナルのバックエンド、圧縮の設定、メモリの上限、ツールセット）は `config.yaml` へ入れます。両方に書かれているときは、秘密でない設定については `config.yaml` が勝ちます。
:::

:::tip 組織での導入
管理者は、システム階層の管理ディレクトリを使って、一般ユーザーが上書きできない設定値と秘密の値を固定できます。
[管理スコープ](/hermes/docs/user-guide/managed-scope/) をご覧ください。
:::

## ランタイムの上限 {#runtime-limits}

長時間動き続ける Hermes のサーバー面（ゲートウェイや
`hermes serve --isolated` を含みます）は、OS が対応していれば、起動時に設定された
`RLIMIT_NOFILE` のソフト上限を適用します。

```yaml
runtime:
  nofile_soft_limit: 4096
```

既定値は `4096` です。Hermes は目標値を OS のハード上限に丸め込み、すでにより高いソフト上限を持つ
プロセスを下げることはありません。値を `0`、`false`、`null` にすると、この調整を無効にできます。Windows や、
上限を変更できないサンドボックスでは、
上限を変えないまま起動を続けます。

## データベースの設定 {#database-settings}

`database:` セクションは、Hermes が SQLite の状態データベース
（`state.db`。セッション・メッセージ・ゲートウェイのルーティングを保存します）をどう開くかを制御します。

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

既存のデータベースのディスク上のジャーナルモードが、開くときに黙って WAL へ切り替わった場合にも、Hermes は
（プロセスごと・データベースごとに 1 回）警告します。たとえば運用担当者が手動で `delete` に変換したデータベースが
これに当たります。そのとき、選択を固定する設定として `database.journal_mode` の名前を示します。

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

1 つの値の中に複数の参照を書くこともできます: `url: "${HOST}:${PORT}"`。参照された変数が設定されていない場合、プレースホルダはそのままの文字列として残り（`${UNDEFINED_VAR}` はそのまま）、警告がログに記録されます。裸の `$VAR` は展開されません。

[多重化されたマルチプロファイルのゲートウェイ](/hermes/docs/user-guide/multi-profile-gateways/) では、あるプロファイルの `config.yaml` に書かれた参照は、プロセス共通の環境ではなく **そのプロファイル自身の** `.env`（そのプロファイルの秘密のスコープ）に対して解決されます。プロファイル B の `${MATRIX_ACCESS_TOKEN}` は、B 自身がその変数を定義していない限り未解決のまま（書かれたそのままの文字列で残り、警告がログに出ます）です。これは多重化の中でプロファイル B の設定が読み込まれる場面すべてに当てはまります。振り分けられたゲートウェイのターン、B のアダプタの起動、B の cron ジョブのどれでも同じです。プロファイルが 1 つだけの実行では、動きは今までと変わりません。分かれるものの全体は [プロファイルごとに分かれるもの](/hermes/docs/user-guide/multi-profile-gateways/#what-is-isolated-per-profile) をご覧ください。

Cursor 形式の SecretRef 記法も受け付けます。`${env:VAR_NAME}` は `${VAR_NAME}` とまったく同じように解決されます（`env:` の接頭辞が取り除かれます）。そのため Cursor や Claude の設定からコピーしてきた MCP やプロバイダの断片が、`config.yaml` でも `mcp_servers` ブロックでも、そのまま動きます。他の SecretRef のソース（`${file:...}`、`${vault:...}`、`${bitwarden:...}`）は、その場では解決され**ません**。外部の秘密管理バックエンドは、`secrets:` ブロックを通じて起動時に値を環境へ注入するので、代わりに `${env:NAME}` として参照してください。知らない接頭辞は 1 回警告を出し、そのままの文字列で残ります。

AI プロバイダの設定（OpenRouter、Anthropic、Copilot、独自エンドポイント、自前ホストの LLM、フォールバックのモデルなど）については、[AI プロバイダ](/hermes/docs/integrations/providers/) をご覧ください。

### プロバイダのタイムアウト {#provider-timeouts}

プロバイダ全体のリクエストタイムアウトには `providers.<id>.request_timeout_seconds` を、モデルごとの上書きには `providers.<id>.models.<model>.timeout_seconds` を設定できます。これはすべての伝送方式（OpenAI ワイヤ、ネイティブ Anthropic、Anthropic 互換）における主役のターン用クライアント、フォールバックの連鎖、資格情報のローテーション後の再構築、そして（OpenAI ワイヤでは）リクエストごとのタイムアウト引数に適用されます。つまり、設定した値が従来の `HERMES_API_TIMEOUT` 環境変数より優先されます。

非ストリーミング呼び出しの停滞検出には `providers.<id>.stale_timeout_seconds` を、モデルごとの上書きには `providers.<id>.models.<model>.stale_timeout_seconds` を設定できます。これは従来の `HERMES_API_CALL_STALE_TIMEOUT` 環境変数より優先されます。

これらを設定しないままにすると、従来の既定値が使われます（`HERMES_API_TIMEOUT=1800` 秒、`HERMES_API_CALL_STALE_TIMEOUT=90` 秒、ネイティブ Anthropic は 900 秒）。非ストリーミングの停滞検出は、暗黙のままにしておくとローカルのエンドポイントでは自動的に無効になり、非常に大きなコンテキストでは上向きにスケールすることがあります。AWS Bedrock には現時点でつながっていません（`bedrock_converse` と AnthropicBedrock SDK のどちらの経路も、boto3 の独自のタイムアウト設定を使います）。[`cli-config.yaml.example`](https://github.com/NousResearch/hermes-agent/blob/main/cli-config.yaml.example) のコメント付きの例をご覧ください。

## 更新のふるまい {#update-behavior}

### バックグラウンドのチェック {#background-checks}

裏側で動く更新チェック（CLI のバナー、TUI のバッジ、ダッシュボード、デスクトップ
アプリ）は、GitHub の REST API に `main` の先端を尋ね、手元のチェックアウトと違って
いれば compare のエンドポイントで正確な件数と変更内容を取ります。`git fetch` は
一切実行せず、どのインストールでも尋ねるのは **24 時間に 1 回まで** です（チェックに
失敗した場合は 1 時間後に試し直します）。更新を実際に当てるとき（`hermes update`、
またはデスクトップの Update ボタン）は必ず取り直し、覚えていた答えを捨てます。
自分から行うチェック（`hermes update --check`、デスクトップの「Check for Updates…」
メニュー、Settings → About の「Check now」）は、覚えていた答えを使いません。

### SSH 認証 {#ssh-authentication}

起動時の更新チェックは、ネットワーク呼び出しに使うのと同じ隔離された Git 設定で
origin の URL を読みます。そのため、グローバルの `url.*.insteadOf` による書き換えで
公式の SSH リモートを公開 HTTPS の経路から隠すことはできません。

Hermes の隔離された内部 Git コマンドは、既定で `ssh -o BatchMode=yes` を使います。
未知のホスト鍵、パスワード、パスフレーズが必要な暗号化鍵は、
端末にプロンプトを出さずに失敗します。信頼済みのホストで使える鍵や
SSH エージェントがあれば、これまでどおり認証されます。ディスク上の Git や SSH の
設定、ターミナルツールで実行するコマンドが変わることはありません。

この内部の既定値は、リポジトリの `core.sshCommand` 設定を上書きします。明示的な
`GIT_SSH_COMMAND` 環境変数は依然として優先されるので、独自の identity や
transport のコマンドはそちらに残せます。非対話のままにしておく必要があるなら、
その上書きにも `-o BatchMode=yes` を含めてください。
プロンプトを許す上書きは、バックグラウンドのチェックを止めてしまうことがあります。

`hermes update` の設定は、`config.yaml` の `updates` の下にあります。

```yaml
updates:
  pre_update_backup: quick       # quick (state snapshot, default) | full (snapshot + HERMES_HOME zip) | off
  backup_keep: 5                 # Keep this many full pre-update backup zips
  non_interactive_local_changes: stash  # stash | discard
  auto_switch_parked_branch: true       # auto-switch a clean, fully merged parked branch back to main
```

`pre_update_backup` は、更新前の安全策を決める唯一のつまみです。`quick`（既定）は、重要な状態ファイル（ペアリングのデータ、cron ジョブ、設定、認証情報。1 GiB を超えるファイルは飛ばします）を `state-snapshots/` へスナップショットします。`full` はさらに `HERMES_HOME` 全体を `backups/` へ zip 化するので、ホームが大きいと数分かかることがあります。`off` は両方とも無効にします。従来の真偽値も受け付けます（`true` → `full`、`false` → `off`）。

`config.yaml` そのもののある時点のコピー（`hermes setup` が書き換える前、`hermes migrate` が編集する前、ファイルの解析に成功するたび、そして解析に失敗したとき）は `backups/config/config.yaml.<reason>.<timestamp>` へ入ります。同じ内容の繰り返しは飛ばされ、理由ごとに新しい 5 件だけが残るので、`config.yaml` の隣に積み上がることはありません。`config.yaml` が壊れている場合、Hermes は組み込みの既定値ではなく最も新しい `good` のコピーを使い、YAML が直るまで起動のたびに警告を出します。壊れたファイル自体には手を加えません。

git で入れた場合、Hermes は更新用ブランチをチェックアウトしたり pull したりする前に、変更のある追跡ファイルと未追跡ファイルを自動で stash します。対話的な端末での更新は、その stash を戻す前に確認します。非対話の更新（デスクトップ／チャットアプリ、ゲートウェイ、`--yes`）は `updates.non_interactive_local_changes` に従います。`stash` は pull が成功したあとにローカルのソース編集を戻し、`discard` は pull が成功したあとに更新で作られた stash を捨てます。`discard` を使うのは、ローカルのソース編集を残すつもりがまったくない管理下のインストールだけにしてください。

その stash の手順の前に、Hermes は npm の install / build のゆらぎで残った追跡済み `package-lock.json` の差分も元に戻します。意図してロックファイルを編集したときは、更新の前にコミットするか手動で stash してください。

## ターミナルのバックエンド設定 {#terminal-backend-configuration}

Hermes は 7 種類のターミナルバックエンドに対応しています。どれを選ぶかで、エージェントのシェルコマンドが実際にどこで走るかが決まります。手元のマシン、Docker コンテナ、SSH 越しのリモートサーバー、Modal のクラウドサンドボックス（直接、または Nous 管理のゲートウェイ経由）、Daytona のワークスペース、Vercel Sandbox、Singularity/Apptainer のコンテナのいずれかです。

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

`terminal.temp_dir` は、ローカルのバックエンドで Hermes がセッションの一時ファイルを
置く場所を決めます。バックグラウンドプロセスのログ・pid・終了ファイル、コード実行の
サンドボックス、あふれたツール結果などです。空のとき（既定）、Hermes は
環境に明示された `TMPDIR`/`TMP`/`TEMP` を尊重し、それも無ければ `/tmp` ではなく
実ストレージ上の管理ディレクトリ `~/.hermes/cache/terminal` を使います。多くの
ディストリビューション（とくに Arch 系）では `/tmp` が小さな RAM 上の tmpfs で、
負荷がかかると Hermes のセッション成果物で埋まってしまうためです。この管理ディレクトリは
自動で刈り込まれます。72 時間より古い成果物は、ゲートウェイの定期処理が 1 時間ごとに、
CLI だけの構成ではプロセスごとに 1 回、掃除します。`temp_dir` に既存の絶対パスを
設定すれば、セッションの一時ファイルを別の場所へ向けられます。ユーザーが設定した
パスが自動で刈り込まれることはありません。

`desktop.font_family` は、チャットを含む Hermes Desktop の画面全体のフォントを決めます（ターミナルの枠には上のとおり専用のキーがあります）。インストール済みのフォントファミリー名を 1 つ（たとえば `OpenDyslexic` や `Atkinson Hyperlegible`）か、CSS のフォントスタックを指定します。Hermes は使用中のテーマのフォントスタックを後ろに残すので、CJK の文字や絵文字もきちんと表示されます。空の値ならテーマのフォントを使います。**設定 → 外観 → チャットフォント** から編集できます。

`terminal.font_family` は、Hermes Desktop に埋め込まれたターミナルを制御します。ローカルにインストールされたフォントファミリー名を 1 つ（たとえば `MesloLGS NF`）か、CSS のフォントスタックを受け付けます。Hermes は同梱の JetBrains Mono スタックをフォールバックとして後ろに足し、空の値なら既定のままです。同じプロファイル単位の設定は **設定 → 外観 → ターミナルフォント** からも編集できます。Google Fonts のダウンロードやシステムフォントの許可は要りません。

Modal・Daytona・Vercel Sandbox のようなクラウドサンドボックスでは、`container_persistent: true` は「サンドボックスを作り直してもファイルシステムの状態を残そうとする」という意味です。同じサンドボックスの実体・PID 空間・バックグラウンドプロセスがあとで動き続けている、という約束ではありません。

### バックエンドの一覧 {#backend-overview}

| バックエンド | コマンドが走る場所 | 隔離 | 向いている用途 |
|---------|-------------------|-----------|----------|
| **local** | 手元のマシンで直接 | なし | 開発、個人利用 |
| **docker** | 常駐する 1 つの Docker コンテナ（セッション・`/new`・サブエージェントで共有） | 完全（名前空間、cap-drop） | 安全なサンドボックス、CI/CD |
| **ssh** | SSH 越しのリモートサーバー | ネットワーク境界 | リモート開発、強力なハードウェア |
| **modal** | Modal のクラウドサンドボックス | 完全（クラウド VM） | 使い捨てのクラウド計算、eval |
| **daytona** | Daytona のワークスペース | 完全（クラウドコンテナ） | 管理されたクラウド開発環境 |
| **vercel_sandbox** | Vercel Sandbox | 完全（クラウド microVM） | スナップショットでファイルシステムを残せるクラウド実行 |
| **singularity** | Singularity/Apptainer のコンテナ | 名前空間（--containall） | HPC クラスタ、共用マシン |

### local バックエンド {#local-backend}

既定です。コマンドは隔離なしで手元のマシンで直接走ります。特別な準備は要りません。

```yaml
terminal:
  backend: local
```

既定では、ローカルのツール用サブプロセスは OS ユーザーの本物の `HOME` を保ちます。
これにより、`git`・`ssh`・`gh`・`az`・`npm`・Claude Code・Codex といった外部の CLI が、
普段のシェルで使っている資格情報や設定を見つけられます。Hermes の状態は
`HERMES_HOME` を通じてプロファイル単位のままです。設定・メモリ・セッション・スキルを
プロファイルが選ぶ仕組みは `HOME` ではありません。

Hermes はシステム全体の `HOME`、シェルの起動ファイル、OS アカウントのホームを
変更**しません**。この設定が決めるのは、`terminal` などのツール、バックグラウンドの
ターミナルプロセス、`execute_code`、ACP のヘルパープロセスを通じて Hermes が起動する
サブプロセスに渡される環境だけです。

#### `terminal.home_mode` {#terminalhomemode}

| モード | ホストへのインストール | コンテナ | トレードオフ |
|---|---|---|---|
| `auto` | OS ユーザーの本物の `HOME` を保つ | `{HERMES_HOME}/home` を使う | おすすめの既定。ホストの CLI は動き続け、コンテナの状態も残ります。 |
| `real` | OS ユーザーの本物の `HOME` を強制する | 見えていれば OS ユーザーの本物の `HOME` を強制する | 親プロセスがうっかり `HOME` をプロファイルのホームに向けて起動したときに役立ちます。 |
| `profile` | `{HERMES_HOME}/home` があればそれを使う | `{HERMES_HOME}/home` があればそれを使う | プロファイルごとに CLI の設定を厳密に隔離できますが、通常の `~/.ssh`、`~/.gitconfig`、`~/.azure`、`~/.config/gh`、Claude/Codex の認証、npm の状態などは、プロファイルのホームの中で初期化するかリンクしない限り見えません。 |

既定のやり方の弱点は、ホストのプロファイルどうしが `~` の下にある同じ
ユーザー階層の CLI の資格情報・設定を共有してしまう点です。git の identity、
SSH 鍵、GitHub CLI のログイン、npm の設定、クラウド CLI のログインを分けたい
プロファイルがあるなら、`home_mode: profile` にして、そのプロファイルのホームの中で
それらのツールを意識的に初期化してください。

ツール設定をプロファイルごとに厳密に隔離したいときは、次のように設定します。

```yaml
terminal:
  home_mode: profile
```

このモードでは、ツールのサブプロセスは `{HERMES_HOME}/home` を `HOME` として使います。Hermes は
`HERMES_REAL_HOME` も設定するので、スクリプトが必要なときには本物のユーザーホームを見つけられます。
コンテナのバックエンドは `auto` モードでも `{HERMES_HOME}/home` を使い続けます。そのディレクトリが
永続する Hermes のデータボリューム上にあるからです。

プロファイルの状態と本物のユーザーホームを区別する必要があるスクリプトは、Hermes のデータには
`HERMES_HOME` を、アカウントのホームには `HERMES_REAL_HOME` を使うのが良いでしょう。

```python
from pathlib import Path

hermes_home = Path(os.environ["HERMES_HOME"])
real_home = Path(os.environ.get("HERMES_REAL_HOME", os.environ["HOME"]))
```

:::warning
エージェントは、あなたのユーザーアカウントと同じだけファイルシステムへ手が届きます。使わせたくないツールは `hermes tools` で無効にするか、サンドボックス化のために Docker へ切り替えてください。
:::

### docker バックエンド {#docker-backend}

セキュリティを固めた Docker コンテナの中でコマンドを走らせます（ケーパビリティは全部落とし、権限昇格なし、PID 数の上限あり）。

**常駐する 1 つのコンテナを、Hermes のプロセス間で共有します。** Hermes は最初に使うときに長生きするコンテナを 1 つだけ起動し、すべての terminal・ファイル・`execute_code` の呼び出しを `docker exec` でその同じコンテナへ通します。セッションをまたいでも、`/new`・`/reset`・`delegate_task` のサブエージェントでも同じです。作業ディレクトリの変更、インストールしたパッケージ、`/workspace` のファイル、そして**バックグラウンドプロセス**まで、ツール呼び出しの間でも、Hermes のプロセスの間でも引き継がれます。TUI のセッションを閉じても、`/quit` を実行しても、新しく `hermes` を起動しても、コンテナは走り続け、次の Hermes プロセスがラベルによる検索でそれを再利用します。片づけの正確な規則は後述の **コンテナのライフサイクル** をご覧ください。

**セッションごとに隔離するモード（`container_persistent: false`）。** Docker バックエンドで `container_persistent: false` にすると、**セッションごとに** 1 つのコンテナになります。チャット（デスクトップアプリのセッション、ゲートウェイの会話、TUI のセッション）ごとに新しいサンドボックスが用意され、最初の terminal／ファイル呼び出しで作られ、セッションが閉じるか `lifetime_seconds` を超えて放置されると消えます。セッションの間で引き継がれるものは何もありません。ファイルシステムの状態も、マウントも、バックグラウンドプロセスもです。`docker_mount_cwd_to_workspace: true` のときは、**そのセッションに紐づいた** ワークスペースだけが `/workspace` にマウントされます。紐づいたディレクトリのない新しいセッションは、前のセッションのマウントを引き継ぐのではなく、空のワークスペースになります。`delegate_task` のサブエージェントは、これまでどおり親セッションのコンテナを共有します。会話どうしの間でサンドボックスをセキュリティ境界にしたいときはこのモードを使い、上で説明した長生きの共有コンテナが欲しいときは既定の `true` のままにしてください。

```yaml
terminal:
  backend: docker
  docker_image: "nikolaik/python-nodejs:python3.11-nodejs20"
  docker_mount_cwd_to_workspace: false  # Mount launch dir into /workspace
  docker_run_as_host_user: false   # See "Running container as host user" below
  docker_snap_compat: false        # See "Snap-packaged Docker (AppArmor)" below
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

**`docker_env`** と **`docker_forward_env`** の違い: 前者は設定に書いた `KEY=value` のペアをそのまま注入します（値は `config.yaml` の中にあるか、`TERMINAL_DOCKER_ENV='{"DEBUG":"1"}'` のように JSON の辞書として渡されます）。後者はシェルや `~/.hermes/.env` から値を持ってくるので、本当の秘密が設定ファイルに現れません。トークンには `docker_forward_env` を、コンテナが必要とする固定のつまみには `docker_env` を使ってください。

**`terminal.docker_extra_args`**（`TERMINAL_DOCKER_EXTRA_ARGS='["--gpus=all"]'` でも上書きできます）は、Hermes が専用のキーとして出していない `docker run` のフラグ（`--gpus`、`--network`、`--add-host`、別の `--security-opt` の上書きなど）を自由に渡すためのものです。各要素は文字列でなければなりません。このリストは組み立てた `docker run` の呼び出しの最後に足されるので、必要なら Hermes の既定を上書きできます。使うのは控えめに。サンドボックスの防御（ケーパビリティの剥奪、`--user`、ワークスペースのバインドマウント）と衝突するフラグは、黙って隔離を弱めます。

**`terminal.docker_network`**（既定 `true`、環境変数: `TERMINAL_DOCKER_NETWORK`）— `false` にすると、サンドボックスのコンテナを `--network=none` で走らせ、エージェントのコマンドからの外向き通信をすべて断ちます。これは `terminal`・`execute_code`・ファイル系ツールが使う実行コンテナに適用されます。コンテナは Hermes のプロセスをまたいで残るので、ネットワークありの古いコンテナがある状態でこれを `false` にすると、そのコンテナは削除され、新しく通信を遮断したコンテナが起動します（警告がログに出ます）。その中で動いていたバックグラウンドプロセスは失われます。`docker_extra_args` で `--network=none` を渡すより、このキーを使うほうが良いでしょう。

**必要なもの:** Docker Desktop か Docker Engine がインストールされ、動いていること。Hermes は `$PATH` に加えて macOS のよくあるインストール先（`/usr/local/bin/docker`、`/opt/homebrew/bin/docker`、Docker Desktop のアプリバンドル）も探します。Podman は最初から使えます。両方が入っているときに Podman を強制するには `HERMES_DOCKER_BINARY=podman`（またはフルパス）を設定してください。

#### コンテナのライフサイクル {#container-lifecycle}

Hermes が管理するコンテナには 3 つのラベルが付き、あとのプロセス（と孤児の掃除役）がそれを見分けられます。

- `hermes-agent=1` — Hermes が管理していることを示します
- `hermes-task-id=<sanitized task_id>` — タスクごとの再利用の判定に使われます
- `hermes-profile=<sanitized profile name>` — 既定では、再利用と掃除の範囲を現在の Hermes のプロファイルに絞ります。`docker_shared_container_key` が設定されているときは、その値を整えたものが代わりに使われます

起動時、Hermes は `docker ps --filter label=hermes-task-id=<id> --filter label=hermes-profile=<identity>` を実行し、見つかれば **既存のコンテナに接続します**。ここでの identity は、`docker_shared_container_key` が信頼できるプロファイルを共通の値へ明示的に参加させていない限り、現在のプロファイルです。コンテナが `exited` になっていれば（Docker デーモンの再起動後など）、`docker start` されて再利用されます。ファイルシステムの状態やインストール済みのパッケージは残りますが、コンテナ内のバックグラウンドプロセスは残りません。

Hermes のプロセスが終わるとき（`/quit`、TUI セッションを閉じる、ゲートウェイの停止、SIGKILL さえも）、既定のモードでは片づけの経路は **コンテナに対して何もしません**。コンテナは動き続けます。次の Hermes プロセスは、ラベルの検索によってミリ秒でそこへ接続します。「セッションをまたいで共有される長生きのコンテナ 1 つ」という約束が求めるのがこの動きです。バックグラウンドプロセス（npm のウォッチャー、開発サーバー、長く走る pytest）がセッションをまたいで生き残る道は、これしかありません。

**コンテナが実際に片づけられる（停止して `docker rm -f` される）のは、次の場合だけです。**

| きっかけ | いつ起きるか |
|---|---|
| `docker_persist_across_processes: false` | プロセスごとに明示的に隔離します。`cleanup()` のたびに `stop` と `rm -f` を行います。issue #20561 より前の動きと同じです。 |
| アイドルの掃除役（`lifetime_seconds`、既定 300 秒） | 環境が `persist_across_processes=false` のときだけ働きます。persist モードの環境では何もしません。コンテナはアイドルの掃除を生き延びます。 |
| 次回起動時の孤児の掃除役 | `2 × lifetime_seconds`（既定 600 秒 = 10 分）より古い **Exited** の hermes ラベル付きコンテナを、現在のプロファイルの範囲で掃除します。**動いているコンテナには決して手を出しません** — 兄弟プロセスの安全のためです。`docker_orphan_reaper: false` で無効にできます。 |
| ユーザーの直接の操作 | `docker rm -f`、`docker system prune`、Docker Desktop の再起動。`--restart=always` は設定していないので、ホストを再起動するとコンテナは `Exited` のまま残ります（CoW レイヤーは残り、次の起動時に再利用されますが、バックグラウンドプロセスは消えています）。 |

知っておくと良い境界のケース:

- **コンテナ内の PID 1 が OOM で殺される** と、コンテナは `Exited` へ移ります。次に再利用するとき `docker start` されます。ファイルシステムの状態は残り、バックグラウンドプロセスは残りません。
- **プロファイルを切り替える** と、コンテナどうしが隔離されます。`hermes-profile=work` のラベルが付いたコンテナは、`hermes-profile=research` で動いている Hermes プロセスからは見えません。孤児の掃除役もプロファイル単位なので、別プロファイルのコンテナを誤って掃除することはありませんが、元のプロファイルで Hermes を起動し直すまで自動で片づけられることもありません。
- **プロファイルをまたいで明示的に共有する** — 1 つの信頼できるワークスペースで意図的に協働するプロファイルには、`terminal:` の下に同じ空でない `docker_shared_container_key` を設定します。これが置き換えるのはコンテナの identity ラベルだけで、タスク・外向き通信・ネットワークの互換性チェックは今までどおり働きます。キーを持たないプロファイルは隔離されたままです。identity のラベルはキーから短いダイジェストを付けて導かれるので、似て見えるキー（`team/workspace` と `team_workspace`）が同じコンテナへ衝突することはありません。**大事な点: 共有コンテナは、最初に起動したプロファイルによって 1 回だけ作られます。** そのプロファイルの `docker_image`、ボリューム、shm のサイズ、その他あとから変えられない Docker の設定が採用され、あとから来たプロファイルはそのまま接続します。設定が違っていても、コンテナが削除されて作り直されるまで無視されます。キーを共有するプロファイルどうしは、イメージとマウントについて合意しておいてください。

`delegate_task(tasks=[...])` で並列に生まれるサブエージェントは、この 1 つのコンテナを共有します。同時の `cd`、環境の書き換え、同じパスへの書き込みはぶつかります。隔離されたサンドボックスが必要なサブエージェントは、`register_task_env_overrides()` でタスクごとのイメージの上書きを登録しなければなりません。RL やベンチマークの環境（TerminalBench2、HermesSweEnv など）は、タスクごとの Docker イメージのためにこれを自動で行っています。

**セキュリティの固め方:**
- `--cap-drop ALL` に対し、`DAC_OVERRIDE`・`CHOWN`・`FOWNER` だけを戻す
- `--security-opt no-new-privileges`
- `--pids-limit 256`
- `/tmp`（512MB）・`/var/tmp`（256MB）・`/run`（64MB）にサイズ制限付きの tmpfs

**資格情報の受け渡し:** `docker_forward_env` に挙げた環境変数は、まずシェルの環境から、次に `~/.hermes/.env` から解決されます。スキルは `required_environment_variables` を宣言でき、それらは自動でまとめられます。

#### 環境変数による上書き {#environment-variable-overrides}

`terminal:` の下のキーはすべて、`TERMINAL_<KEY_UPPERCASE>` という形の環境変数で上書きできます。Docker バックエンドでとくに役立つものは次のとおりです。

| 環境変数 | 対応するキー | 備考 |
|---|---|---|
| `TERMINAL_DOCKER_IMAGE` | `docker_image` | ベースイメージ |
| `TERMINAL_DOCKER_FORWARD_ENV` | `docker_forward_env` | JSON の配列: `'["GITHUB_TOKEN","OPENAI_API_KEY"]'` |
| `TERMINAL_DOCKER_ENV` | `docker_env` | JSON の辞書: `'{"DEBUG":"1"}'` |
| `TERMINAL_DOCKER_VOLUMES` | `docker_volumes` | `"host:container[:ro]"` 形式の文字列の JSON 配列 |
| `TERMINAL_DOCKER_EXTRA_ARGS` | `docker_extra_args` | JSON の配列 |
| `TERMINAL_DOCKER_MOUNT_CWD_TO_WORKSPACE` | `docker_mount_cwd_to_workspace` | `true` / `false` |
| `TERMINAL_DOCKER_RUN_AS_HOST_USER` | `docker_run_as_host_user` | `true` / `false` |
| `TERMINAL_DOCKER_SNAP_COMPAT` | `docker_snap_compat` | `true` / `false` — 既定は `false` |
| `TERMINAL_DOCKER_NETWORK` | `docker_network` | `true` / `false` — 既定は `true`。`false` は `--network=none` |
| `TERMINAL_DOCKER_PERSIST_ACROSS_PROCESSES` | `docker_persist_across_processes` | `true` / `false` — 既定は `true` |
| `TERMINAL_DOCKER_SHARED_CONTAINER_KEY` | `docker_shared_container_key` | 信頼できるプロファイル用の明示的な共有 identity。既定は空 |
| `TERMINAL_DOCKER_ORPHAN_REAPER` | `docker_orphan_reaper` | `true` / `false` — 既定は `true` |
| `TERMINAL_CONTAINER_CPU` | `container_cpu` | CPU のコア数 |
| `TERMINAL_CONTAINER_MEMORY` | `container_memory` | MB |
| `TERMINAL_CONTAINER_DISK` | `container_disk` | MB |
| `TERMINAL_CONTAINER_PERSISTENT` | `container_persistent` | `true` / `false` — バインドマウントするワークスペースのディレクトリを制御します。`docker_persist_across_processes` とは別物です |
| `TERMINAL_LIFETIME_SECONDS` | `lifetime_seconds` | アイドルの掃除役の待ち時間 |
| `TERMINAL_TEMP_DIR` | `temp_dir` | セッションの一時ファイルの置き場（local バックエンド） |
| `TERMINAL_TIMEOUT` | `timeout` | コマンドごとのタイムアウト |
| `HERMES_DOCKER_BINARY` | _なし_ | 使う docker / podman のバイナリのパスを強制します |

### ssh バックエンド {#ssh-backend}

SSH 越しにリモートサーバーでコマンドを走らせます。ControlMaster で接続を再利用します（アイドル時のキープアライブは 5 分）。常駐シェルは既定で有効なので、状態（作業ディレクトリ、環境変数）はコマンドをまたいで残ります。

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
| `TERMINAL_SSH_KEY` | （システムの既定） | SSH 秘密鍵のパス |
| `TERMINAL_SSH_PERSISTENT` | `true` | 常駐シェルを有効にします |

**仕組み:** 初期化のときに `BatchMode=yes` と `StrictHostKeyChecking=accept-new` で接続します。常駐シェルは、リモートホスト上に `bash -l` のプロセスを 1 つ生かし続け、一時ファイル経由でやり取りします。`stdin_data` や `sudo` が必要なコマンドは、自動的に 1 回きりのモードへ落ちます。

**スキル／設定の環境変数の受け渡し:** スキルが `required_environment_variables` で宣言した変数や、`terminal.env_passthrough` に並べた変数は、OpenSSH の `SendEnv` で転送されます。名前は `ssh` のコマンドラインに載り、値はクライアントの環境を通って渡され、リモートのコマンド文字列には決して入りません。リモートの `sshd` がそれを受け入れる必要があります。サーバーの `/etc/ssh/sshd_config` へ追記して sshd を再読み込みしてください。

```
AcceptEnv NEXTCLOUD_URL NEXTCLOUD_*      # or the names your skills need
```

対応する `AcceptEnv` がないと、サーバーは黙って変数を捨て、リモートのシェルからは未設定に見えます。Hermes のプロバイダの資格情報（`OPENAI_API_KEY` など）は、並べてあっても決して転送されません。[環境変数の受け渡し](/hermes/docs/user-guide/security/#environment-variable-passthrough) をご覧ください。

### modal バックエンド {#modal-backend}

[Modal](https://modal.com) のクラウドサンドボックスでコマンドを走らせます。タスクごとに、CPU・メモリ・ディスクを設定できる隔離された VM が用意されます。ファイルシステムはセッションをまたいでスナップショット／復元できます。

```yaml
terminal:
  backend: modal
  container_cpu: 1                 # CPU cores
  container_memory: 5120           # MB (5GB)
  container_disk: 51200            # MB (50GB)
  container_persistent: true       # Snapshot/restore filesystem
```

**必要なもの:** `MODAL_TOKEN_ID` と `MODAL_TOKEN_SECRET` の環境変数、または `~/.modal.toml` の設定ファイル。

**永続化:** 有効にすると、片づけのときにサンドボックスのファイルシステムがスナップショットされ、次のセッションで復元されます。スナップショットは `~/.hermes/modal_snapshots.json` で管理されます。残るのはファイルシステムの状態であって、動いているプロセス・PID 空間・バックグラウンドのジョブではありません。

**資格情報のファイル:** `~/.hermes/` から自動でマウントされ（OAuth のトークンなど）、コマンドのたびに前もって同期されます。

### daytona バックエンド {#daytona-backend}

[Daytona](https://daytona.io) の管理ワークスペースでコマンドを走らせます。永続化のために停止／再開に対応しています。

```yaml
terminal:
  backend: daytona
  container_cpu: 1                 # CPU cores
  container_memory: 5120           # MB → converted to GiB
  container_disk: 10240            # MB → converted to GiB (max 10 GiB)
  container_persistent: true       # Stop/resume instead of delete
```

**必要なもの:** `DAYTONA_API_KEY` 環境変数。

**永続化:** 有効にすると、片づけのときにサンドボックスは削除ではなく停止され、次のセッションで再開されます。サンドボックスの名前は `hermes-{task_id}` の形になります。

**ディスクの上限:** Daytona は最大 10 GiB を強制します。それを超える要求は警告付きで丸められます。

### vercel_sandbox バックエンド {#vercel-sandbox-backend}

[Vercel Sandbox](https://vercel.com/docs/vercel-sandbox) のクラウド microVM でコマンドを走らせます。Hermes は通常のターミナルとファイルツールの面をそのまま使います。Vercel 専用のモデル向けツールはありません。

```yaml
terminal:
  backend: vercel_sandbox
  vercel_runtime: node24          # node24 | node22 | python3.13
  cwd: /vercel/sandbox            # default workspace root
  container_persistent: true      # Snapshot/restore filesystem
  container_disk: 51200           # Shared default only; custom disk is unsupported
```

**必要なインストール:** 任意の SDK の追加パッケージを入れます。

```bash
pip install 'hermes-agent[vercel]'
```

**必要な認証:** `VERCEL_TOKEN`・`VERCEL_PROJECT_ID`・`VERCEL_TEAM_ID` の 3 つすべてを使うアクセストークン認証を設定します。Render・Railway・Docker などのホストでのデプロイや、長く走り続ける通常の Hermes のプロセスでは、これが対応された構成です。

ローカルでの一度きりの開発向けに、Hermes は短命の Vercel OIDC トークンも受け付けます。

```bash
VERCEL_OIDC_TOKEN="$(vc project token <project-name>)" hermes chat
```

Vercel のプロジェクトへリンク済みのディレクトリからなら、プロジェクト名は省けます。

```bash
VERCEL_OIDC_TOKEN="$(vc project token)" hermes chat
```

OIDC のトークンは短命なので、デプロイの手順として案内する経路には向きません。

**ランタイム:** `terminal.vercel_runtime` は `node24`・`node22`・`python3.13` に対応しています。未設定なら、Hermes は `node24` を既定にします。

**永続化:** `container_persistent: true` のとき、Hermes は片づけの間にサンドボックスのファイルシステムをスナップショットし、同じタスクのあとのサンドボックスをそのスナップショットから復元します。スナップショットの中身には、Hermes が同期した資格情報・スキル・キャッシュのファイルがサンドボックスへコピーされたものが含まれることがあります。残るのはファイルシステムの状態だけで、サンドボックスの実体・PID 空間・シェルの状態・動いているバックグラウンドプロセスは残りません。

**バックグラウンドのコマンド:** `terminal(background=true)` は、Hermes の汎用の非ローカル向けバックグラウンドプロセスの流れを使います。サンドボックスが生きている間は、通常のプロセスツールでプロセスの起動・確認・待機・ログの閲覧・終了ができます。片づけや再起動のあとに Vercel 本来の切り離されたプロセスを復元する仕組みは、Hermes にはありません。

**ディスクのサイズ:** Vercel Sandbox は今のところ Hermes の `container_disk` というつまみに対応していません。`container_disk` は未設定にするか、共通の既定値 `51200` のままにしてください。それ以外の値は黙って無視されるのではなく、診断とバックエンドの作成に失敗します。

### singularity / Apptainer バックエンド {#singularityapptainer-backend}

[Singularity/Apptainer](https://apptainer.org) のコンテナでコマンドを走らせます。Docker が使えない HPC クラスタや共用マシン向けです。

```yaml
terminal:
  backend: singularity
  singularity_image: "docker://nikolaik/python-nodejs:python3.11-nodejs20"
  container_cpu: 1                 # CPU cores
  container_memory: 5120           # MB
  container_persistent: true       # Writable overlay persists across sessions
```

**必要なもの:** `$PATH` の中に `apptainer` か `singularity` のバイナリがあること。

**イメージの扱い:** Docker の URL（`docker://...`）は自動で SIF ファイルへ変換され、キャッシュされます。既存の `.sif` ファイルはそのまま使われます。

**スクラッチのディレクトリ:** 次の順で解決されます。`TERMINAL_SCRATCH_DIR` → `TERMINAL_SANDBOX_DIR/singularity` → `/scratch/$USER/hermes-agent`（HPC の慣習） → `~/.hermes/sandboxes/singularity`。

**隔離:** `--containall --no-home` を使い、ホストのホームディレクトリをマウントせずに名前空間を完全に分けます。

### ターミナルのバックエンドでよくある問題 {#common-terminal-backend-issues}

ターミナルのコマンドがすぐ失敗する、あるいはターミナルツールが無効だと報告される場合は、次を確かめてください。

- **local** — 特別な準備は要りません。使い始めるときに一番安全な既定です。
- **docker** — `docker version` を実行して Docker が動いているか確かめます。失敗するなら Docker を直すか、`hermes config set terminal.backend local` にします。
- **ssh** — `TERMINAL_SSH_HOST` と `TERMINAL_SSH_USER` の両方が必要です。どちらかが欠けていれば Hermes がはっきりエラーを記録します。
- **modal** — `MODAL_TOKEN_ID` 環境変数か `~/.modal.toml` が必要です。`hermes doctor` を実行して確認できます。
- **daytona** — `DAYTONA_API_KEY` が必要です。サーバー URL の設定は Daytona の SDK が面倒を見ます。
- **singularity** — `$PATH` に `apptainer` か `singularity` が必要です。HPC クラスタではよく入っています。

迷ったら `terminal.backend` を `local` に戻して、まずそこでコマンドが走ることを確かめてください。

### 片づけ時にリモートからホストへ状態を戻す {#remote-to-host-state-sync-on-teardown}

**ssh**・**modal**・**daytona** のバックエンドでは、Hermes はセッションの間、`~/.hermes/` の状態（資格情報のファイル、スキル、キャッシュ）をリモートのサンドボックスへ送り込み、片づけのときに **変更された状態ファイルを元の場所へ戻します**。最初に送ったものと内容が違うファイル（内容のハッシュで比べます）はその場に適用され、同期対象のディレクトリの下にできた新しいリモートのファイル（たとえばエージェントがリモートで作ったスキル）は、対応するホスト側のパスへ写されます。アップロード専用の資格情報ファイルが、ホスト側で上書きされることはありません。

- 戻しの同期は、間隔を空けて最大 3 回まで再試行し、2 GiB を超えるリモートのアーカイブは展開を拒みます。
- docker と singularity はバインドマウント（ホストのファイルシステムをそのまま見る形）なので、これは不要です。
- 対象になるのは Hermes の状態（`~/.hermes/`）であって、サンドボックスの中の任意の作業ツリーのファイルでは **ありません**。大事な成果物は、サンドボックスが壊される前にエージェントに明示的にコピーさせてください（たとえば `scp`、`modal volume put`）。

### Docker のボリュームマウント {#docker-volume-mounts}

Docker バックエンドを使うとき、`docker_volumes` でホストのディレクトリをコンテナと共有できます。各要素は Docker の `-v` の標準の書き方に従います: `host_path:container_path[:options]`。

```yaml
terminal:
  backend: docker
  docker_volumes:
    - "/home/user/projects:/workspace/projects"   # Read-write (default)
    - "/home/user/datasets:/data:ro"              # Read-only
    - "/home/user/.hermes/cache/documents:/output" # Gateway-visible exports
```

これは次のようなときに便利です。
- エージェントへ **ファイルを渡す**（データセット、設定、参考のコード）
- エージェントから **ファイルを受け取る**（生成したコード、レポート、書き出し）
- あなたとエージェントが同じファイルを触る **共有のワークスペース**

メッセージングのゲートウェイを使っていて、生成したファイルを
`MEDIA:/...` でエージェントに送らせたいときは、
`/home/user/.hermes/cache/documents:/output` のような、ホストから見える書き出し専用のマウントを用意するのが良いでしょう。

- Docker の中では `/output/...` へファイルを書きます
- `MEDIA:` には **ホスト側のパス** を出します。たとえば次のようにします:
  `MEDIA:/home/user/.hermes/cache/documents/report.txt`
- `/workspace/...` や `/output/...` は、そのパスがホスト側のゲートウェイのプロセスにも
  まったく同じ形で存在しているとき以外、出しては **いけません**

:::warning
YAML の重複したキーは、前のものを黙って上書きします。すでに
`docker_volumes:` のブロックがあるなら、ファイルのあとのほうに別の `docker_volumes:` キーを足すのではなく、
同じリストへ新しいマウントをまとめてください。
:::

環境変数で設定することもできます: `TERMINAL_DOCKER_VOLUMES='["/host:/container"]'`（JSON の配列）。

### Docker への資格情報の受け渡し {#docker-credential-forwarding}

既定では、Docker のターミナルセッションはホストの資格情報を勝手には引き継ぎません。コンテナの中で特定のトークンが必要なときは、`terminal.docker_forward_env` に追加します。

```yaml
terminal:
  backend: docker
  docker_forward_env:
    - "GITHUB_TOKEN"
    - "NPM_TOKEN"
```

Hermes は、並べた変数をまず今のシェルから解決し、`hermes config set` で保存されていれば `~/.hermes/.env` へ落ちます。

:::warning
`docker_forward_env` に並べたものは、コンテナの中で走るコマンドから見えるようになります。ターミナルのセッションへさらしても構わない資格情報だけを渡してください。
:::

### コンテナをホストのユーザーで走らせる {#running-the-container-as-your-host-user}

既定では、Docker のコンテナは `root`（UID 0）で走ります。`/workspace` やほかのバインドマウントの中で作られたファイルは、ホスト側で root の持ち物になるので、セッションのあとにホストのエディタで編集するには `sudo chown` が要ります。`terminal.docker_run_as_host_user` のフラグがこれを解決します。

```yaml
terminal:
  backend: docker
  docker_run_as_host_user: true   # default: false
```

有効にすると、Hermes は `docker run` のコマンドへ `--user $(id -u):$(id -g)` を足すので、バインドマウントしたディレクトリ（`/workspace`、`/root`、`docker_volumes` にあるもの）へ書き込まれたファイルは root ではなくホストのユーザーの持ち物になります。引き換えに、コンテナは `apt install` ができなくなり、`/root/.npm` のような root の持ち物のパスへも書けなくなります。両方が必要なら、`HOME` が root 以外のユーザーの持ち物になっているベースイメージを使う（またはイメージのビルド時に必要な道具を入れておく）のが良いでしょう。

これまでどおりの動きが良ければ `false`（既定）のままにしてください。「マウントしたホストのファイルを編集する」が作業の中心で、`sudo chown -R` にうんざりしているなら有効にしましょう。

### snap で入れた Docker（AppArmor） {#snap-packaged-docker-apparmor}

Docker が snap でインストールされているホスト（Ubuntu のクラウドイメージ、たとえば Azure の VM でよくあります）では、snap の AppArmor の閉じ込めがサンドボックスの防御フラグのうち 2 つを拒み、コンテナが起動時に死にます。

```
exec /sbin/docker-init: operation not permitted     # --init
exec /usr/bin/sleep: operation not permitted        # --security-opt no-new-privileges
```

これは snapd の制約（[LP#1908448](https://bugs.launchpad.net/snapd/+bug/1908448)）で、Hermes が探って回避できるものではありません。snap ではなく Docker の apt リポジトリから Docker を入れる（おすすめ。防御はすべて残ります）か、次のように受け入れるかのどちらかです。

```yaml
terminal:
  docker_snap_compat: true   # drops --init and no-new-privileges; cap-drop, tmpfs, PID limits stay
```

これを有効にすると、サンドボックスの中のゾンビプロセスは init に回収されなくなり、コンテナの中の setuid のバイナリが権限を取り戻せるようになります。コンテナの起動時に警告が記録されます。

### 任意: 起動したディレクトリを `/workspace` へマウントする {#optional-mount-the-launch-directory-into-workspace}

Docker のサンドボックスは、既定では隔離されたままです。明示的に有効にしない限り、Hermes は今のホストの作業ディレクトリをコンテナへ渡し **ません**。

`config.yaml` で有効にします。

```yaml
terminal:
  backend: docker
  docker_mount_cwd_to_workspace: true
```

有効にすると、
- `~/projects/my-app` から Hermes を起動した場合、そのホストのディレクトリが `/workspace` にバインドマウントされます
- Docker のバックエンドは `/workspace` から始まります
- ファイルツールもターミナルのコマンドも、同じマウントされたプロジェクトを見ます

無効のときは、`docker_volumes` で明示的に何かをマウントしない限り、`/workspace` はサンドボックスの持ち物のままです。

セキュリティ上のトレードオフ:
- `false` はサンドボックスの境界を保ちます
- `true` は Hermes を起動したディレクトリへ、サンドボックスから直接手が届くようにします

コンテナにホストの生きたファイルを触らせたい、と意図するときだけ有効にしてください。

### 常駐シェル {#persistent-shell}

既定では、ターミナルのコマンドはそれぞれ自分のサブプロセスで走り、作業ディレクトリ・環境変数・シェル変数はコマンドごとにリセットされます。**常駐シェル** を有効にすると、`execute()` の呼び出しをまたいで長生きの bash プロセスが 1 つ生かされ、コマンドの間で状態が残ります。

これがいちばん役立つのは **ssh バックエンド** で、コマンドごとの接続のオーバーヘッドもなくなります。常駐シェルは **ssh では既定で有効**、local バックエンドでは無効です。

```yaml
terminal:
  persistent_shell: true   # default — enables persistent shell for SSH
```

無効にするには次のようにします。

```bash
hermes config set terminal.persistent_shell false
```

**コマンドをまたいで残るもの:**
- 作業ディレクトリ（`cd /tmp` が次のコマンドにも効きます）
- エクスポートした環境変数（`export FOO=bar`）
- シェル変数（`MY_VAR=hello`）

**優先順位:**

| 階層 | 変数 | 既定 |
|-------|----------|---------|
| 設定 | `terminal.persistent_shell` | `true` |
| SSH の上書き | `TERMINAL_SSH_PERSISTENT` | 設定に従う |
| ローカルの上書き | `TERMINAL_LOCAL_PERSISTENT` | `false` |

バックエンドごとの環境変数がいちばん強く効きます。local バックエンドでも常駐シェルを使いたいときは、次のようにします。

```bash
export TERMINAL_LOCAL_PERSISTENT=true
```

:::note
`stdin_data` や sudo が必要なコマンドは、自動で 1 回きりのモードへ落ちます。常駐シェルの標準入力は、すでに IPC のプロトコルが使っているからです。
:::

各バックエンドの詳しい話は、[コード実行](/hermes/docs/user-guide/features/code-execution/) と [README のターミナルの節](/hermes/docs/user-guide/features/tools/) をご覧ください。

## スキルの設定 {#skill-settings}

スキルは、SKILL.md のフロントマターを通じて自分の設定項目を宣言できます。これは秘密でない値（パス、好み、その分野の設定）で、`config.yaml` の `skills.config` という名前空間の下に保存されます。

```yaml
skills:
  config:
    myplugin:
      path: ~/myplugin-data   # Example — each skill defines its own keys
```

**スキルの設定の仕組み:**

- `hermes config migrate` は有効なスキルをすべて調べ、まだ設定されていない項目を見つけて、入力を促してくれます
- `hermes config show` は、スキルの設定を「Skill Settings」の下に、どのスキルのものかとあわせて表示します
- スキルが読み込まれるとき、解決された設定値は自動でスキルのコンテキストへ差し込まれます

**手で値を設定する:**

```bash
hermes config set skills.config.myplugin.path ~/myplugin-data
```

自分のスキルで設定項目を宣言する方法は、[スキルを作る — 設定項目](/hermes/docs/developer-guide/creating-skills/#config-settings-configyaml) をご覧ください。

### エージェントが作るスキルの書き込みに対する見張り {#guard-on-agent-created-skill-writes}

エージェントが `skill_manage` でスキルを作成・編集・パッチ・削除するとき、Hermes は新しい／更新された内容を危険なキーワードのパターン（資格情報の収集、あからさまなプロンプトインジェクション、持ち出しの指示）で調べることもできます。この検査は **既定では無効** です。`~/.ssh/` に正当に触れたり `$OPENAI_API_KEY` に言及したりする本物のエージェントの作業が、この経験則に引っかかりすぎたためです。エージェントのスキル書き込みが着地する前に確認してほしいなら、また有効にしてください。

```yaml
skills:
  guard_agent_created: true   # default: false
```

有効なとき、印を付けられた `skill_manage` の書き込みは、検査の理由付きで承認のプロンプトとして出てきます。承認された書き込みは着地し、拒否された書き込みはエージェントへ説明付きのエラーを返します。

### スキル書き込みの承認 {#write-approval-for-skill-writes}

上の内容検査とは別に、`skills.write_approval` は、エージェントによるスキルの書き込み **すべて**（作成／編集／パッチ／削除／付随ファイル）を、あなたの明示的な承認の後ろに置きます。危険なコマンドと同じ承認／拒否の仕組みです。

```yaml
skills:
  write_approval: false   # false = write freely (default) | true = stage every write for review
```

有効なとき、スキルの書き込みは `~/.hermes/pending/skills/` の下へ置かれ、`/skills pending`・`/skills diff <id>`・`/skills approve <id>`・`/skills reject <id>` で確認します。CLI からでも、どのメッセージングのプラットフォームからでも使えます。実行中に切り替えるには `/skills approval on|off` を使います。メモリにも同じ関門があります（下の `memory.write_approval`）。詳しい手順は [エージェントのスキル書き込みに関門を置く](/hermes/docs/user-guide/features/skills/#gating-agent-skill-writes-skillswrite_approval) をご覧ください。

## メモリの設定 {#memory-configuration}

```yaml
memory:
  memory_enabled: true
  user_profile_enabled: true
  memory_char_limit: 2200   # ~800 tokens
  user_char_limit: 1375     # ~500 tokens
  write_approval: false     # true = require approval before any memory write
```

`memory.write_approval: true` にすると、メモリへの書き込みは着地する前にあなたの承認が要ります。対話的な CLI のターンではその場で確認され、メッセージングのセッションや背後で走る自己改善のレビューでは、`/memory pending` → `/memory approve <id>` / `/memory reject <id>` の確認のために書き込みが保留されます。実行中に切り替えるには `/memory approval on|off` を使います。[メモリへの書き込みを制御する](/hermes/docs/user-guide/features/memory/#controlling-memory-writes-write_approval) をご覧ください。

## コンテキストファイルの切り詰め {#context-file-truncation}

前後を切り詰める前に、Hermes が自動で読み込むコンテキストファイルからどれだけの内容を読むかを制御します。これは `SOUL.md`・`.hermes.md`・`AGENTS.md`・`CLAUDE.md`・`.cursorrules` のような、システムプロンプトへ差し込まれるファイルに効きます。`read_file` ツールには影響し **ません**。

```yaml
context_file_max_chars: null  # default — dynamic cap scaled to the model's context window (floor 20K, ceiling 500K chars)
```

動的なふるまいではなく固定の上限にしたいときは、正の整数を設定します。

```yaml
context_file_max_chars: 25000
```

コンテキストファイルの読み込みは、それぞれ `context_file_read_timeout`（秒。既定 `5.0`）でも縛られます。それより読み込みに時間のかかるファイル（典型的には iCloud Drive・OneDrive・NFS のようなネットワーク越しのファイルシステム）は、システムプロンプトの残りが読み込まれるように、警告付きで飛ばされます。

```yaml
context_file_read_timeout: 5.0
```

## ファイル読み込みの安全策 {#file-read-safety}

1 回の `read_file` の呼び出しが返せる内容の量を制御します。上限を超える読み込みは、`offset` と `limit` でもっと狭い範囲を読むようエージェントへ伝えるエラーで拒まれます。これで、圧縮された JS のバンドルや大きなデータファイルを 1 回読んだだけでコンテキストウィンドウが溢れる事態を防げます。

```yaml
file_read_max_chars: 100000  # default — ~25-35K tokens
```

コンテキストウィンドウの大きいモデルを使っていて、大きなファイルをよく読むなら上げてください。コンテキストの小さいモデルでは、読み込みを引き締めるために下げます。

```yaml
# Large context model (200K+)
file_read_max_chars: 200000

# Small local model (16K context)
file_read_max_chars: 30000
```

エージェントはファイルの読み込みを自動で重複排除もします。同じファイルの同じ範囲を 2 回読んでいて、ファイルが変わっていなければ、内容を送り直す代わりに軽い代替の印が返ります。これはコンテキストの圧縮でリセットされるので、内容が要約されて消えたあとでエージェントがファイルを読み直せます。

## ツール出力の切り詰めの上限 {#tool-output-truncation-limits}

Hermes が切り詰めるまでに、ツールがどれだけの生の出力を返せるかを、3 つの関連する上限が決めます。

```yaml
tool_output:
  max_bytes: 50000        # terminal output cap (chars)
  max_lines: 2000         # read_file pagination cap
  max_line_length: 2000   # per-line cap in read_file's line-numbered view
```

- **`max_bytes`** — `terminal` のコマンドが標準出力と標準エラーを合わせてこの文字数を超えて出したとき、Hermes は最初の 40% と最後の 60% を残し、その間に `[OUTPUT TRUNCATED]` の断り書きを入れます。既定は `50000`（よくあるトークナイザーでおよそ 12〜15K トークン）です。
- **`max_lines`** — 1 回の `read_file` の呼び出しの `limit` パラメータの上限です。これを超える要求は丸められ、1 回の読み込みでコンテキストウィンドウが溢れないようにします。既定は `2000` です。
- **`max_line_length`** — `read_file` が行番号付きの表示を出すときに、1 行ごとにかかる上限です。これより長い行はこの文字数で切られ、後ろに `... [truncated]` が付きます。既定は `2000` です。

呼び出しごとにもっと生の出力を許せる、コンテキストウィンドウの大きいモデルでは上限を上げてください。コンテキストの小さいモデルでは、ツールの結果を小さく保つために下げます。

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

### ツール結果のあふれ分の予算 {#tool-result-spillover-budget}

切り詰めとは別に、大きすぎるツールの *結果* は切られるのではなくディスクへあふれます。出力の全体は `$HERMES_HOME/cache/spillover/` の下に保存され、コンテキストの中身はプレビューと保存先のパスに置き換わります（`offset`／`limit` を付けた `read_file` で読めますし、`execute_code` で処理もできます）。結果ごとの汎用のあふれの閾値は 100,000 文字で、コンテキストの小さいモデルでは自動的に下げられます。

MCP のツールの結果（`mcp_*` という名前のツール）は、より厳しい **50,000 文字** が既定です。MCP のサーバーは、ページ分割されていない大きなデータ（ツール探索のカタログ、まとめて実行した結果）を日常的に返し、そのままだと汎用の閾値の下に収まって、以降のターンのたびにコンテキストを膨らませてしまうからです。失われるものはありません。結果の全体はディスクに残ります。閾値は次のように上書きできます。

```yaml
tool_budget:
  mcp_result_size_chars: 50000   # per-result spillover threshold for mcp_* tools
```

MCP の閾値は、結果ごとの汎用の閾値（コンテキストに応じて下げられていることもあります）を必ず上限とするので、上げても今のモデルのウィンドウが許す以上にはなりません。

Hermes は **プロバイダ側での省略** にも印を付けます。MCP や web のツールの結果が、それ自身の切り詰めの目印（`...N more items`、`"has_more": true`、「サンドボックスへ保存しました」といった注記）を含んでいるとき、結果の末尾に 1 行の断り書きが足され、見えているデータは不完全なので、列挙が完全だと考える前にページをたどるか取得し直すよう警告します。

## ツールセットをまとめて無効にする {#global-toolset-disable}

特定のツールセットを CLI とすべてのゲートウェイのプラットフォームで、1 か所で
抑えるには、その名前を `agent.disabled_toolsets` に並べます。

```yaml
agent:
  disabled_toolsets:
    - memory       # hide memory tools + MEMORY_GUIDANCE injection
    - web          # no web_search / web_extract anywhere
```

これはプラットフォームごとのツール設定（`hermes tools` が書く `platform_toolsets`）の
**あと** に効くので、ここに並べたツールセットは必ず取り除かれます。プラットフォームの
保存された設定にまだ載っていても同じです。`hermes tools` の画面で 15 以上のプラットフォームの行を
編集するのではなく、「どこでも X を切る」という 1 つのスイッチが欲しいときに使ってください。

リストを空にする、あるいはキーを書かないと、何も起きません。

## git の worktree による隔離 {#git-worktree-isolation}

同じリポジトリで複数のエージェントを並列に走らせるために、隔離された git の worktree を有効にします。

```yaml
worktree: true    # Always create a worktree (same as hermes -w)
# worktree: false # Default — only when -w flag is passed
```

有効にすると、CLI のセッションごとに `.worktrees/` の下へ、それ自身のブランチを持つ新しい worktree が作られます。エージェントは互いに邪魔せずにファイルを編集し、コミットし、push し、PR を作れます。きれいな worktree は終了時に消され、変更が残っているものは手で回収できるように残されます。

既定では、新しい worktree は **取り直したリモートの先端** から枝分かれします（今のブランチの upstream、無ければリモートの既定ブランチ）。これにより、ローカルのクローンの古くなっているかもしれない `HEAD` ではなく、プロジェクトの現在地から始められます。PR の差分が、ローカルのクローンが遅れていた分を巻き込まず、本当の変更だけに収まります。代わりにローカルの `HEAD` から枝分かれさせたいときは `worktree_sync: false` にしてください。オフラインのときや、クローンの今の状態をそのまま土台にしたいときに役立ちます。リモートに届かない場合は、自動でローカルの `HEAD` へ落ちます。

```yaml
worktree_sync: true    # Default — branch from the fetched remote tip
# worktree_sync: false # Branch from local HEAD (offline / pinned base)
```

リポジトリのルートに `.worktreeinclude` を置けば、gitignore されているファイルを worktree へコピーする指定もできます。

```
# .worktreeinclude
.env
.venv/
node_modules/
```

## コンテキストの圧縮 {#context-compression}

Hermes は、モデルのコンテキストウィンドウに収まるよう、長い会話を自動で圧縮します。圧縮の要約は別の LLM 呼び出しなので、どのプロバイダやエンドポイントにも向けられます。

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
`compression.summary_model`・`compression.summary_provider`・`compression.summary_base_url` を持つ古い設定は、最初の読み込みで自動的に `auxiliary.compression.*` へ移されます（設定バージョン 17）。手作業は要りません。
:::

`progress_notices`（既定 `false`）は、**通常の** 圧縮の進み具合をチャットのプラットフォーム（Telegram、Discord、Slack など）へ届けるかどうかを決めます。設計として、自動の圧縮はチャットの画面では静かに進みます。裏で走り、サーバー側にだけ記録が残ります。`progress_notices: true` にすると、チャットのプラットフォームでも通常の流れが見えるようになります。「コンテキストを圧縮しています…」という開始の知らせ、事前チェックや API 呼び出し前の圧縮のきっかけ、アイドル時の圧縮、再試行の進み具合（「30 → 12 メッセージに圧縮しました。再試行します…」）、そして「コンテキストの圧縮が完了しました」という知らせです。この関門がかかるのは圧縮の状態だけで、関係のない運用上の雑音（補助モデルの失敗、プロバイダのレート制限や再試行のやり取り）はどちらにしても抑えられたままです。圧縮の **失敗** の知らせと、手動の `/compress` への反応は、この設定にかかわらず常に見えます。動いているゲートウェイでこの値を編集すると、次のメッセージから効きます。

`hygiene_hard_message_limit` は、ゲートウェイ専用の **圧縮前の安全弁** です。これは負の連鎖を断つためにあります。大きすぎるセッションで API 呼び出しが切れ続けると、ゲートウェイはトークン使用量のデータを受け取れず、トークンを基準にした閾値が発火できず、そのため記録は伸び続けて切断はさらに悪化します。この件数を基準にした下限は、（API が失敗しても必ず分かる）メッセージ数だけで発火し、圧縮を強制してセッションを立て直します。既定は `5000` で、どんな普通のセッションよりずっと大きな値です。大きなコンテキスト（100 万トークン以上）のモデルで短いターンを何千回も重ねる場合でも、はるか手前でトークンの閾値によって圧縮されます。珍しいプラットフォームではさらに上げ、もっと積極的に圧縮させたいなら下げてください。動いているゲートウェイでこの値を編集すると、次のメッセージから効きます（後述）。

`hygiene_timeout_seconds` は、このエージェント実行前の圧縮の処理に対するゲートウェイの **無反応の予算** であって、全体の実時間の上限ではありません。圧縮の要約の呼び出しはモデルからストリーミングされ、届いたトークンはすべて前進とみなされます。まだ生成を続けている遅い推論モデルは自分の締め切りを伸ばし続けるので、遅いけれど健康な要約モデルが生成の途中で打ち切られることはありません。要約モデルがこの秒数のあいだ **まったく出力しない** ときだけ（バックエンドの停止、固まった接続、黙り込んだプロバイダ）、ゲートウェイはユーザーへ警告し、届いたメッセージを圧縮なしで進め、固まったように見せる代わりにセッションごとの一時的な失敗のクールダウンを記録します。

`hygiene_total_ceiling_seconds`（既定 `600`）は、トークンがまだ動いていても待ち時間の合計を縛るので、ぽつぽつとしか流れてこない壊れたストリームがターンを人質に取り続けることはありません。この値は少なくとも `hygiene_timeout_seconds` まで丸められます。

`hygiene_max_turn_hold_seconds`（既定 `10`）は、ゲートウェイの **ターンの保留の予算** です。届いたメッセージが、ゲートウェイが待つのをやめて圧縮前の記録のまま進むまでに、圧縮を待って保留される実時間の上限です。これがあるのは、`hygiene_total_ceiling_seconds` だけでは、チャットの伝送路のアイドルタイムアウトよりずっと長く回線が黙りかねないからです。トークンを流し続ける要約モデルは無反応の区切りをリセットし続けるので、ターンの保留の予算がなければ、ユーザーへ 1 バイトも届かないまま待ち時間が上限まで伸びかねません。Telegram（や似た伝送路）はそこで接続を切り、ターンは固まったように見えます。ターンの待ちをこの予算（伝送路の典型的な約 30 秒のアイドルタイムアウトより十分に短い値）で抑えることで、メッセージにすぐ返事が返ることを保証します。**予算が尽きても圧縮そのものは失われません。** ワーカーは切り離されたまま走り続け、そのコミットが基準点で囲われていれば（セッション DB があるときの通常の状態）コミットの権利を保ったままなので、出来上がった要約は次の安全な区切りで採用され、待つのをやめたあとに積まれたターンもそのまま並んで残ります。これがとくに効くのは、推論の段階だけで予算を超えかねない **思考／推論型の要約モデル**（DeepSeek、QwQ など）です。その要約は、まったく反映されないのではなく、1 ターン遅れて着地します。コミットを安全に囲えない場合、遅れて届いた結果は捨てられ（`CompressionCommitFence`）、新しいターンを上書きすることはありません。同じターンの中で圧縮を効かせたい、そして伝送路が待ちに耐えられるなら、この予算を上げてください。とても遅いバックエンドで素早く立て直したいなら下げてください。

`hygiene_failure_cooldown_seconds` は、圧縮のタイムアウトや中断のあとの、セッションごとのクールダウンを決めます。クールダウンの間、ゲートウェイは同じ大きすぎるセッションについて圧縮の再試行を飛ばすので、届くメッセージのすべてが同じ壊れた補助バックエンドで止まることはありません。`/compress`・`/reset`・あとの健康なターンで、セッションを立て直せます。

この値は固定の間隔ではなく、段階的に伸びるはしごの **最初の段** です。同じセッションで失敗が続くと、`1x`・`3x`・`9x` と待ち、最大 1 時間で頭打ちになります。要約モデルが恒久的に壊れているセッションは、固定の間隔で永遠に再試行するのではなく後退していき、実際に記録を縮められた実行があれば最初の段へ戻ります。この段階の上がり方はセッション単位でプロセスの中に閉じているので、ゲートウェイを再起動すると最初の段へ戻ります。ただしクールダウンの期限そのものは残ります。

`context_timeout_seconds`（既定 `120`）は、エージェントの中の `compress_context`（会話のループ、事前の圧縮、手動の `/compress`）に対する同じ **無反応の予算** で、固まった要約モデルがセッションを無期限に止められないようにします。ストリーミングされた要約のトークンは待ち時間を伸ばし、黙ったワーカーだけが打ち切られます。タイムアウトすると、Hermes は `auxiliary.compression.fallback_chain` の最初の項目に対して要約を 1 回だけやり直します（その項目が `timeout` を宣言していればその値を使います）。止まった経路は例外を上げないので、補助クライアント自身のフォールバックの処理からは見えないからです。その試みも失敗するか、フォールバックの連鎖が設定されていない場合にだけ、Hermes は圧縮を飛ばし、今のメッセージを保ち、ユーザーへ警告します。`0` にすると無効になります。ゲートウェイのセッションの衛生処理は自分の `hygiene_timeout_seconds` の経路を持っていて、二重に包まれることはありません。

`context_total_ceiling_seconds`（既定 `600`）は、トークンがまだ動いていても、エージェントの中の **コミット前** の待ち（要約／ストリーミングの段階）を縛ります。この値は少なくとも `context_timeout_seconds` まで丸められます。正確な保証はこうです。**要約の段階はこの上限で縛られ、コミットの段階は上限を超えたら記録され、表に出されます。** ワーカーが圧縮のコミットの囲いに入り、SessionDB の書き換えが進行中になったら、そのコミットが途中で捨てられることは決してありません。記録が食い違う危険があるからです。ただし待ち時間はもう静かではありません。コミットが上限を超えて走ったら、Hermes は超過を記録し（WARNING、繰り返せば ERROR へ上がります）、ユーザーに見える警告の経路で 1 回だけ警告を送り、コミットが終わるまで区切りを決めて待ち続けます。要約の段階で上限が尽きたときは、その瞬間に、どの補助の伝送方式（chat.completions、Codex Responses、Anthropic Messages）でも要約モデルのストリームが閉じられます。誰も待っていない接続の上で、捨てられる要約が最後まで課金されることはありませんし、そのセッションのリースは次の試みのために解放されます。

`protect_first_n` は、圧縮のたびに固定される **システム以外の** 先頭のメッセージの数を決めます。既定は `3` で、最初のユーザー／アシスタントのやり取りは要約のたびに生き残り、当初の目的が見えたままになります。長く続く回転式の圧縮のセッションで最初のターンがもう関係ないときは、`protect_first_n: 0` にして、システムプロンプトと要約と末尾だけを残すようにできます。システムプロンプトそのものは、この設定にかかわらず常に保たれます。

`in_place`（既定 `true`）は、圧縮が起きたときにセッションの身元がどうなるかを決めます。`true` のとき、圧縮はメッセージの一覧を書き換え、システムプロンプトを組み直しますが、**セッション ID を回しません**。会話は生涯にわたって 1 つの持続する ID を保ちます（`parent_session_id` の連鎖も、セッション一覧での `name #2` / `#3` という番号の振り直しもありません）。圧縮は破壊的ではありません。生きているコンテキストは圧縮されますが、圧縮前のターンは同じ ID の下でそっと保管され（非アクティブ／圧縮済みの印が付きます）、`session_search` で今も検索でき、取り戻せます。消えるわけではありません。フックは `session:compress` イベントの `in_place` フィールドでこのモードを知れます。`in_place: false` にすると、圧縮のたびに古いセッションへ紐づいた新しいセッション ID へ回る、従来の動きに戻ります。

`threshold_tokens` は、圧縮のきっかけに対する任意の **絶対的なトークンの上限** を設定します。設定すると、割合による `threshold` とこの絶対値の、低いほうで圧縮が起きます。つまり、どのモデルが動いていても、あなたの望むトークン数より遅れて圧縮が起きることはありません。これは、コンテキストウィンドウの違うモデルを行き来する（たとえば 100 万 → 40 万）と絶対的なきっかけの位置がずれる、という問題を解きます。この上限はモデルのコンテキスト長へ丸められるので、モデルが対応する以上の値を設定しても安全です（そのときは割合による閾値が使われます）。既定は `null`（無効。割合による閾値だけ）です。この上限は、モデルの切り替えやフォールバックの発動をまたいで残ります。

`idle_compact_after_seconds` は、大きさを基準にした `threshold` を補う、**任意で使う時間基準の** きっかけです。既定は `0`（無効）です。0 より大きくすると、その秒数以上放置されたあとに再開したセッションは、最初の返事の前にたまった履歴を先に圧縮します。長く続くスレッド（たとえば数時間後に戻ってくる Telegram の会話）が、以降のターンのたびに古いコンテキストを丸ごと読み直さずに済みます。コンテキストがすでに圧縮後の目標（`threshold × target_ratio`）以下のときは発火せず、失敗のクールダウン、行ったり来たりの防止、セッションごとのロックという、あらゆる自動の圧縮と同じ見張りに従います。例: `idle_compact_after_seconds: 1800` は、30 分放置したあとに圧縮します。

`proactive_prune_tokens` は、`threshold` とは独立に走る、LLM を使わない決定的な古いツール結果の刈り込みを有効にします。ウィンドウの大きいモデルでは `threshold` による圧縮（ウィンドウのおよそ 50%）がめったに起きないので、かさばるツールの出力（ターミナルの吐き出し、ファイルの読み込み、web の抽出）が履歴に乗ったまま、以降のターンのたびに送り直されます。送り直される履歴が `proactive_prune_tokens`（既定 `0` = 無効。`48000` あたりから試すと良いでしょう）を超えると、刈り込みは同一の結果をまとめ、古くて大きいものを要約し、大きなツール呼び出しの引数を切り詰めます。直近の `protect_last_n` 件のメッセージは守られ、モデルを呼ぶことはありません。出力の全体はセッションの保管庫から取り戻せます。`proactive_prune_min_result_chars`（既定 `8000`、200 以上へ丸められます）は、これより小さいツールの結果には手を付けない、という下限を決めます。`proactive_prune_min_reclaim_tokens`（既定 `4096`）は、これだけのトークンを取り戻せない限り刈り込みを確定させません。確定した刈り込みは送信済みの履歴を書き換え、プロバイダのプロンプトキャッシュの前置きを無効にしてしまうので、この関門があることで、キャッシュの断絶がツールの反復のたびに起きるのではなく、（圧縮の区切りのように）意味のある断絶 1 回にまとまって薄まります。これは組み込みの `compressor` エンジンの下でだけ動きます。ほかのコンテキストエンジンでは何もしません。

:::tip 圧縮とコンテキスト長のゲートウェイでの即時反映
最近のリリースからは、動いているゲートウェイの `config.yaml` で `model.context_length` や `compression.*` のキーを編集すると、次のメッセージから効きます。ゲートウェイの再起動も、`/reset` も、セッションの入れ替えも要りません。キャッシュされたエージェントの署名にこれらのキーが含まれているので、変更を見つけたゲートウェイが裏でエージェントを組み直します。API キーとツール／スキルの設定は、これまでどおりの再読み込みの手順が要ります。
:::

### よくある構成 {#common-setups}

**既定（自動検出）— 設定は要りません:**
```yaml
compression:
  enabled: true
  threshold: 0.50
```
主役のプロバイダと主役のモデルを使います。主役のチャットモデルより安いモデルで圧縮したいなら、タスクごとに上書きしてください（たとえば `auxiliary.compression.provider: openrouter` と `model: google/gemini-2.5-flash`）。

**特定のプロバイダを強制する**（OAuth でも API キーでも）:
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
独自の OpenAI 互換エンドポイントを指します。認証には `OPENAI_API_KEY` を使います。

### 3 つのつまみの関係 {#how-the-three-knobs-interact}

| `auxiliary.compression.provider` | `auxiliary.compression.base_url` | 結果 |
|---------------------|---------------------|--------|
| `auto`（既定） | 未設定 | 使える中で最良のプロバイダを自動検出します |
| `nous` / `openrouter` など | 未設定 | そのプロバイダを強制し、その認証を使います |
| 何でも | 設定あり | 独自のエンドポイントを直接使います（プロバイダは無視されます） |

:::warning 要約モデルのコンテキスト長の条件
要約モデルは、主役のエージェントのモデルと同じかそれ以上のコンテキストウィンドウを持っていなければ **なりません**。圧縮の仕組みは会話の中ほどの全体を要約モデルへ送るので、そのモデルのコンテキストウィンドウが主役のモデルより小さいと、要約の呼び出しはコンテキスト長のエラーで失敗します。そうなると、中ほどのターンは **要約されないまま捨てられ**、会話のコンテキストが静かに失われます。モデルを上書きするときは、そのコンテキスト長が主役のモデル以上であることを確かめてください。
:::

## ゲートウェイのターンのリースのタイムアウト {#gateway-turn-lease-timeout}

ゲートウェイは、2 つのルーティングキーが同じ記録を同時に読み書きしないよう、
解決されたセッション ID でターンを直列にします。リースを待つ最大時間は、
通常のエージェントの無反応のタイムアウトとは別に設定できます。

```yaml
agent:
  gateway_turn_lease_timeout: 5
```

この予算が尽きたときにまだ別のターンがセッションのリースを持っていると、Hermes は
安全側に倒して閉じます。待っているメッセージのために記録を読み込むことも、モデルを走らせることも
しません。ユーザーには拒否の知らせが届き、送り直しが必要になります。Hermes がメッセージを
自動で並べ直さないのは、持続的な順序と冪等性なしにそれをすると
二重に処理されかねないからです。0 以下の値は 5 秒の既定になります。

## セッションの停滞の見張り {#session-stall-watchdog}

ゲートウェイは、知らせるだけの停滞の見張り役を走らせます（`agent.session_stall_timeout`、既定 `300` 秒、`0` = 無効）。忙しいセッションに **未処理の受信の続き** があり、エージェントの共有の活動時計が少なくともこの時間ずっと止まっているとき、ゲートウェイは WARNING を記録し、ユーザーへ 1 回だけ知らせを送ります。

```
⚠️ Agent session appears stalled (last activity N min ago). Try /new to reset.
```

意味づけ:

- **知らせるだけです。** この見張り役がターンを終わらせることはありません。長い無反応のあとに実行を取り消す `agent.gateway_timeout` とは対照的です。停滞の知らせは、エージェントが引っかかって見えることを伝えるだけで、どうするか（`/new`、`/stop`、待ち続ける）はあなたが決めます。
- **1 回の停滞につき 1 回だけ知らせます。** 未処理の受信がはけるか活動が再開すると掛け金が外れるので、いったん立ち直ってまた停滞したセッションは、もう一度知らせます。
- 前進とみなされるのは共有の活動の記録（ツールの呼び出し、API のストリームの進み、圧縮の鼓動）だけです。未処理の受信は知らせるかどうかの関門であって、前進を測る時計ではありません。

```yaml
agent:
  session_stall_timeout: 300   # seconds; 0 disables the watchdog
```

## 再接続の注意喚起 {#reconnect-attention-escalation}

プラットフォームのアダプタが接続に失敗したとき（ネットワークの障害、失効したボットトークン、壊れたサイドカー）、ゲートウェイは上限付きの指数バックオフで無期限に再試行します。再試行が止まることはないので、一時的な障害は運用の手を借りずに必ず自力で治ります。困るのは、*恒久的な* 失敗（失効した Telegram のトークン、足りない Discord の特権インテント）が、一時的な不調とまったく同じに見えることです。ずっと「再試行中」のままになります。

恒久的な失敗を見えるようにする仕組みが 2 つあります。

- **終端としての分類。** 例外の *型* から自力では治らないと分かる失敗 — 拒否・失効したトークン（`telegram_auth_error`、`discord_auth_error`、`email_auth_error`）、足りない特権インテント（`discord_intents_required`）、依存関係を入れられない Photon のサイドカー（`SIDECAR_DEPS_MISSING`）や node のバイナリが無いもの（`SIDECAR_NODE_MISSING`）— は、再試行の列に入らず致命的として印が付きます。分類は厳密に型を基準にしていて、曖昧なエラーはいつまでも再試行されます。
- **要注意への引き上げ。** `agent.reconnect_attention_after`（既定 `7200` 秒 = 2 時間、`0` で無効）を超えて再試行の列に居続けるプラットフォームには、ゲートウェイの実行時の状態（`hermes status`）で `needs_attention: true` と `retrying_since` のタイムスタンプが付き、WARNING がログに出ます。再試行はそのまま続きます。これは合図であって、遮断機ではありません。この印は、再接続に成功すると消えます。

```yaml
agent:
  reconnect_attention_after: 7200   # seconds; 0 disables the escalation flag
```

## ゲートウェイのエージェントのキャッシュ {#gateway-agent-cache}

ゲートウェイはセッションごとにエージェントを 1 つ持ち続け、ターンのたびにシステムプロンプトを組み直すのではなく、キャッシュされたプロンプトの前置きを会話が再利用できるようにします。そのキャッシュされたエージェントは、セッションの記録の全体も抱えています。ツールの出力を含むので、ツールを 100 回呼んだセッションでは数十メガバイトになります。したがって、複数のプラットフォームを抱える忙しいゲートウェイでは、このキャッシュがプロセスの中で最大のメモリの使い手になります。

```yaml
agent:
  agent_cache:
    max_size: 128            # LRU entry cap
    idle_ttl_secs: 3600      # evict an agent idle this long
    memory_high_mb: auto     # anon-RSS budget; number, "auto", or 0/off
    max_evictions_per_pass: 16
    protect_recent: 8
```

`max_size` と `idle_ttl_secs` は、キャッシュを件数と時間で縛ります。どちらも何バイト抱えているかは知らないので、`memory_high_mb` が 3 つめの縛りを足します。ゲートウェイ自身の無名の常駐メモリが予算を超えると、最も長く使われていない記録を手放します。それらは次のターンで保存済みのセッションから読み直されます。ゲートウェイがほかのサービスとメモリを取り合っているなら下げ、前置きをすべて温めておきたいなら上げてください（`0` にするとこの処理そのものを止められます）。

`auto` は、ゲートウェイが実際に動いているメモリの上限から予算を導きます。コンテナや systemd のユニットなら cgroup の上限、そうでなければ全 RAM です。ユニットの `MemoryMax`/`MemoryHigh` が、二重に管理する数字なしで尊重されます。

ターンの途中のセッション、`protect_recent` 件の直近に使われたもの、そして記録をディスクへ書き終えていないセッションは、決して手放されません。追い出しは WARNING で、測った RSS と落としたセッションとともに記録されます。

```
Agent cache pressure: anon RSS 6802MB over budget 6656MB — evicting 5 LRU session(s): ...
```

## コンテキストエンジン {#context-engine}

コンテキストエンジンは、モデルのトークンの上限へ近づいたときに会話をどう扱うかを決めます。組み込みの `compressor` エンジンは、内容の一部が失われる要約を使います（[コンテキストの圧縮](/hermes/docs/developer-guide/context-compression-and-caching/) をご覧ください）。プラグインのエンジンは、それを別の戦略へ置き換えられます。

```yaml
context:
  engine: "compressor"    # default — built-in lossy summarization
```

プラグインのエンジン（たとえば内容を失わないコンテキスト管理の LCM）を使うには、次のようにします。

```yaml
context:
  engine: "lcm"          # must match the plugin's name
```

プラグインのエンジンが **自動で有効になることはありません**。`context.engine` にプラグインの名前を明示的に設定する必要があります。使えるエンジンは `hermes plugins` → Provider Plugins → Context Engine で見て選べます。

メモリのプラグインについての同じ仕組み（1 つだけ選ぶ形）は、[メモリのプロバイダ](/hermes/docs/user-guide/features/memory-providers/) をご覧ください。

## 反復の予算 {#iteration-budget}

エージェントがツールを何度も呼ぶ複雑な作業をしていると、反復の予算（既定は 500 ターン）を使い切ることがあります。Hermes は作業の途中で圧力をかける警告を注入 **しません**。以前のビルドは予算の 70%／90% でモデルへ警告していましたが、それがモデルに複雑な作業を早々と諦めさせていたので、2026 年 4 月に取り除かれました。

代わりに、予算が本当に尽きたとき（500/500）、Hermes は締めくくるよう頼むメッセージを 1 つ注入し、最後の応答を出せるように **猶予の呼び出し** を 1 回だけ許します。その猶予の呼び出しでも本文が出ないときは、何を成し遂げたかをまとめるよう頼みます。

```yaml
agent:
  max_turns: none              # Iterations per conversation turn (default: none = unlimited)
                               # Set a positive integer to cap; "none"/"null"/
                               # "unlimited"/"inf"/"infinity"/"infinite"/0/-1 = no limit
  budget_warning_ratio: null   # Optional one-time checkpoint warning, e.g. 0.75
  api_max_retries: 3           # Retries per provider before fallback engages (default: 3)
```

`agent.max_turns` は **既定で無制限** です。ターン数の上限は解決するより多くの問題（作業の途中での静かな打ち切り）を生んだので、そのままの状態では Hermes は会話のターンを最後まで走らせます。上限をかけるには正の整数を設定してください。「上限なし」を明示したいなら、大文字小文字を問わず次のどれでも使えます: `"none"`、`"null"`、`"unlimited"`、`"infinite"`、`"infinity"`、`"inf"`、`0`、`-1`（これらは `sys.maxsize` の番人の値になるので、ターン数でループが抜けることはありません）。

`agent.budget_warning_ratio` は、通常の会話でも委任された会話でも、既定では無効です。有限の `max_turns` とあわせて `0` より大きく `1` より小さい値を設定すると、閾値に達したあとで Hermes は最新のツールの結果へ、モデルから見える節目の知らせを 1 つ足します。この知らせは会話のターンごとに再装填され、それぞれのエージェント自身の反復の予算を使います。足されるのは今のツールの結果の末尾だけで、古いターンへ足すことはありませんし、作りものの user／system のメッセージを足したり、既存の予算切れの猶予の呼び出しを変えたりもしません。ディスパッチャが持つカンバンのワーカーは、既定で 90% の時点で完了の節目を受け取ります（明示的な比率を設定すればその閾値が変わります）。そのときもツールは使えたままです。この節目が求めるのは、検証済みの完了か、あとに残る進捗のコメントであって、早すぎる成功の宣言ではありません。

`agent.api_max_retries` は、一時的なエラー（レート制限、接続の切断、5xx）のときに、フォールバックのプロバイダへ切り替わる **前** に、Hermes がプロバイダの API 呼び出しを何回やり直すかを決めます。既定は `3` で、合わせて 4 回試します。[フォールバックのプロバイダ](/hermes/docs/user-guide/features/fallback-providers/) を設定していて、もっと早く切り替えたいなら `0` にしてください。主役のプロバイダで最初の一時的なエラーが出た瞬間に、不安定なエンドポイントへ再試行を重ねずフォールバックへ渡します。

## 実時間の実行の予算 {#wall-clock-run-budget}

反復の予算とは別に、会話の実行ごとに任意の **実時間** の予算を与えられます。これは、外側からの厳しい上限（たとえばタスクごとに 900 秒）の下で走る、一度きりの実行や eval のハーネス向けです。これがないと、作業がほぼ終わっているのに実行がタイムアウトしてしまうことがあります。最後の答えを出す 1 回の生成が足りなかった、あるいは固まったプロバイダの呼び出し 1 つに引っかかっていた、というふうにです。

```yaml
agent:
  run_budget_seconds: null     # Optional; unset/null = feature fully off (default)
```

CLI から実行ごとに指定することもできます。

```bash
hermes chat --run-budget 850 -q "..."
```

予算を設定すると、2 つのことが起きます。

1. **80% の時点で締めくくりの知らせ。** 予算の 80% が過ぎたとき、Hermes は **1 回だけ** 知らせを注入し（キャッシュを壊さない形で、`/steer` のメッセージのように最新のツールの結果へ足されます）、新しい調査や検証をやめて、すでに手にしている情報から最終成果物を作るようモデルへ伝えます。実行ごとに多くても 1 回しか起きず、既存の反復の予算の締めくくりの仕組みと同じつくりです。繰り返し圧力をかける警告はありません。
2. **締め切りに合わせた停滞のタイムアウト。** 暗黙の非ストリーミングの停滞のタイムアウト（既定の 90 秒や、推論モデルの下限。たとえば DeepSeek の推論モデルの 600 秒）は `max(60, remaining_budget × 0.5)` で頭打ちになるので、静かに固まったプロバイダの呼び出し 1 つが実行の残りを食い尽くすことはありません。この上限はタイムアウトを *短くする* だけで、伸ばすことはありませんし、明示的に設定された `stale_timeout_seconds`（プロバイダ／モデルの設定や `HERMES_API_CALL_STALE_TIMEOUT`）は常にそのまま優先されます。

この予算は `run_conversation` のターンごと（ユーザーのメッセージごとにリセットされます）で、未設定のときはこの機能は完全に眠っています。時計を読むことも、注入も、タイムアウトの変更もありません。

## 停止時の検証（コーディングの検証） {#verify-on-stop-coding-verification}

有効にすると、エージェントがワークスペースのコードを編集したのに新しい検証の証拠（通ったテストの実行、ビルド、lint など）を出さなかったターンでは、Hermes は最終回答を受け付けません。検証するか、なぜできないかを説明するよう頼む、作りものの続きの問いかけを注入します。ドキュメント／マークダウン／スキルだけの編集では発火せず、ループには上限があるのでエージェントを閉じ込めることはありません。

```yaml
agent:
  verify_on_stop: false        # true | false | "auto" (surface-aware: on for CLI/TUI/desktop, off for messaging)
  verify_guidance: true        # Append creative-UI / clean-diff guidance to the missing-evidence nudge
  max_verify_nudges: 3         # Cap on consecutive continue nudges per turn (built-in + pre_verify hooks)
  coding_instructions: ""      # Standing project-wide coding rules appended to the coding brief
```

`verify_on_stop` は `true`（どこでも有効）、`false`（無効。既定）、`"auto"`（従来の画面ごとの動き: CLI・TUI・デスクトップといった対話的なコーディングの画面とプログラムからの呼び出しでは有効、Telegram／Discord のようなメッセージングの画面では、検証の語りがチャットの雑音に読めるので無効）を受け付けます。どこでも既定は無効です。新しくインストールすると `false` で出荷され、設定の移行は既存のインストールでもこれを無効にしたので、有効にするのは明示的な選択になります。`HERMES_VERIFY_ON_STOP` 環境変数を設定すると、設定の値より優先されます。

この見張りの材料になる証拠（どのテスト／lint／ビルドのコマンドが走ったか、それ以降どのファイルが編集されたか）は `~/.hermes/verification_evidence.db` にあります。この台帳は、見張りが有効な間だけ書かれ、作られます。`verify_on_stop: false` なら何も記録されず、既存のファイルは自由に消せます。

同じ地点でユーザーやプラグインの方針の関門を置きたいとき（自分のチェックでエージェントを走らせ続けたいとき）は、[`pre_verify` フック](/hermes/docs/user-guide/features/hooks/#pre_verify) をご覧ください。

## 常設の目標（`/goal`） {#standing-goals-goal}

常設の目標が有効なとき、Hermes はアシスタントの応答がそれを満たしているかを判定します。満たしていなければ、同じセッションへ続きのプロンプトを戻し、目標が達成されるか、ターンの予算が尽きるか、ユーザーが一時停止・解除するまで働き続けます。本当の歯止めはターンの予算です。判定の失敗は **開く側**（続ける側）へ倒れるので、判定が不安定でも前進が止まることはありません。

```yaml
goals:
  max_turns: 20   # Max continuation turns before Hermes auto-pauses the goal (default: 20)
```

`max_turns` は、Hermes が自動で一時停止して `/goal resume` を求めるまでに、目標が何ターン続きを進められるかの上限です。これは判定の見落とし（目標は本当は達成済みなのに判定が「続けよ」と言う）と、曖昧だったり達成できなかったりする目標への際限ない支出から守ります。機能の全体は [目標](/hermes/docs/user-guide/features/goals/) をご覧ください。

### API のタイムアウト {#api-timeouts}

Hermes はストリーミング向けに別々のタイムアウトの層を持ち、加えて非ストリーミングの呼び出し向けに停滞の検出があります。停滞の検出は、暗黙の既定のままにしているときだけ、ローカルのプロバイダに合わせて自動で調整されます。

| タイムアウト | 既定 | ローカルのプロバイダ | 設定 / 環境変数 |
|---------|---------|----------------|--------------|
| ソケットの読み取りのタイムアウト | 120 秒 | 自動で 1800 秒へ引き上げ | `HERMES_STREAM_READ_TIMEOUT` |
| ストリームの停滞の検出 | 180 秒 | 900 秒の上限まで引き上げ（`agent.local_stream_stale_timeout`） | `HERMES_STREAM_STALE_TIMEOUT` |
| 非ストリーミングの停滞の検出 | 90 秒 | 暗黙のままなら自動で無効 | `providers.<id>.stale_timeout_seconds` または `HERMES_API_CALL_STALE_TIMEOUT` |
| API 呼び出し（非ストリーミング） | 1800 秒 | 変わりません | `providers.<id>.request_timeout_seconds` / `timeout_seconds` または `HERMES_API_TIMEOUT` |

**ソケットの読み取りのタイムアウト** は、httpx がプロバイダからの次のデータの塊をどれだけ待つかを決めます。ローカルの LLM は、大きなコンテキストでは最初のトークンを出すまでの前処理に数分かかることがあるので、ローカルのエンドポイントだと分かると Hermes はこれを 30 分へ引き上げます。`HERMES_STREAM_READ_TIMEOUT` を明示的に設定すると、エンドポイントの判定に関係なく常にその値が使われます。

**ストリームの停滞の検出** は、SSE のキープアライブの合図は届くのに本当の中身が来ない接続を切ります。ローカルのプロバイダは（前処理の間にキープアライブを送らないので）既定が 180 秒ではなく有限の 900 秒の上限へ引き上げられます。`agent.local_stream_stale_timeout` か `HERMES_LOCAL_STREAM_STALE_TIMEOUT` 環境変数で設定できます。

**非ストリーミングの停滞の検出** は、いつまでも応答を出さない非ストリーミングの呼び出しを切ります。既定では、長い前処理の間の誤検出を避けるため、Hermes はローカルのエンドポイントでこれを無効にします。`providers.<id>.stale_timeout_seconds`・`providers.<id>.models.<model>.stale_timeout_seconds`・`HERMES_API_CALL_STALE_TIMEOUT` を明示的に設定した場合は、ローカルのエンドポイントでもその明示の値が尊重されます。

この予算は、すべての非ストリーミングの呼び出しを縛ります。リクエストを受け取ったあと黙り込むプロバイダ — 接続は開いたまま、バイトも来ず、エラーも出ない — は、停滞のタイムアウトで中断されて再試行されます。ずっと長いソケットの読み取りのタイムアウトまで（無人の cron の実行なら、外から何かがプロセスを殺すまで）ぶら下がり続けることはありません。

プロバイダを待っている定期の知らせは、少なくとも **60 秒の沈黙** のあとにだけ出ます。Codex Responses の **待機の状態表示** は、生成にかかった合計時間ではなく沈黙を表します。動いているストリームのイベント（推論を含みます）があれば静かなままです。イベントが止まったときは、応答がまだ来ていないと言い張るのではなく、ストリームのイベントが無い時間を報告します。イベントが再開すればこの知らせは消えます。再接続が最初のイベントを待つ新しい段階を始めたときは、待機の状態表示もその段階に従います。この表示のふるまいが、別にある実時間の停滞した呼び出しの予算を伸ばしたり、見張りのタイムアウトを変えたりすることはありません。chat-completion のストリームも同じく、チャンクが再開すればすぐに沈黙の警告を消し、ローカルのモデルの読み込み中の表示を置き換えることもありません。

cron のジョブと委任されたサブエージェントもストリーミングします。これらはリクエストを自分のスレッドで直接走らせますが（ほかのセッションが使う割り込みのワーカーは、ゲートウェイの入れ子のスレッドプールの中で詰まります）、通信そのものは今も `stream: true` なので、上の **ストリームの停滞の検出** の予算が効きます。トークンはすべて生存の合図になるので、数分考える推論モデルが固まったプロバイダと取り違えられることはありませんし、黙った接続を切る中継のプロキシにもバイトが届き続けます。

### API のストリーミングを無効にする {#disabling-api-streaming}

`model.streaming: false` は、セッション全体（親もサブエージェントも）で非ストリーミングのリクエストを強制します。これは、*ストリーミング* のツール呼び出しの経路が壊れている、自前ホストの OpenAI 互換サーバー向けの逃げ道です（たとえば vLLM の `--tool-call-parser qwen3_xml` と推論のパーサーを組み合わせると、ツール呼び出しの記法が平文へ漏れて `tool_calls` が 0 件になり、委任されたタスクが静かに何もしなくなることがあります）。既定は `true` です。その種の不具合に当たらない限りそのままにしてください。非ストリーミングの呼び出しは、上で説明した生存の性質を失うからです。これは端末でのトークンの描画だけを決める `display.streaming` とは別物です。

```yaml
model:
  streaming: false
```

## コンテキストの圧力の警告 {#context-pressure-warnings}

反復の予算の圧力とは別に、コンテキストの圧力は、会話が **圧縮の閾値**（古いメッセージを要約するためにコンテキストの圧縮が起きる地点）へどれだけ近づいているかを追います。会話が長くなってきたことを、あなたにもエージェントにも伝えてくれます。

| 進み具合 | 段階 | 何が起きるか |
|----------|-------|-------------|
| 閾値まで **60% 以上** | 情報 | CLI はシアン色の進捗バーを出し、ゲートウェイは案内の知らせを送ります |
| 閾値まで **85% 以上** | 警告 | CLI は太字の黄色いバーを出し、ゲートウェイは圧縮が間近だと警告します |

CLI では、コンテキストの圧力はツールの出力の流れの中に進捗バーとして現れます。

```
  ◐ context ████████████░░░░░░░░ 62% to compaction  48k threshold (50%) · approaching compaction
```

メッセージングのプラットフォームでは、平文の知らせが送られます。

```
◐ Context: ████████████░░░░░░░░ 62% to compaction (threshold: 50% of window).
```

自動の圧縮が無効なときは、代わりにコンテキストが切り詰められるかもしれない、と警告します。

コンテキストの圧力は自動で働き、設定は要りません。これはユーザーへ向けた知らせとしてだけ出るもので、メッセージの流れを変えたり、モデルのコンテキストへ何かを注入したりはしません。

## 資格情報のプールの戦略 {#credential-pool-strategies}

同じプロバイダに対して API キーや OAuth のトークンを複数持っているときは、切り替えの戦略を設定します。

```yaml
credential_pool_strategies:
  openrouter: round_robin    # cycle through keys evenly
  anthropic: least_used      # always pick the least-used key
```

選べるのは `fill_first`（既定）・`round_robin`・`least_used`・`random` です。詳しい説明は [資格情報のプール](/hermes/docs/user-guide/features/credential-pools/) をご覧ください。

## プロンプトのキャッシュ {#prompt-caching}

いま使っているプロバイダが対応していれば、Hermes はセッションをまたいだプロンプトのキャッシュを自動で有効にします。ユーザーの設定は要りません。

**ネイティブ Anthropic**・**OpenRouter**・**Nous Portal** 上の Claude では、Hermes はシステムプロンプトとスキルのブロックへ、1 時間の TTL（`ttl: "1h"`）で `cache_control` の区切りを付けます。新しい 1 時間の中で最初に送るときは入力の全額を払い、同じ 1 時間の中でどのセッションから送っても、以降は割引されたキャッシュ読み出しの料金でキャッシュから引かれます。つまり、システムプロンプト、読み込まれたスキルの内容、長いコンテキストの取り込みの前半部分は、最初の 1 時間、`hermes` のセッションをまたいでも、分岐したサブエージェントをまたいでも再利用されます。

Qwen Cloud（Alibaba DashScope）の上流はキャッシュの TTL を 5 分で頭打ちにするので、Hermes はそこでは 5 分の区切りの TTL を使います。ほかの第三者経由の Claude の経路（AWS Bedrock、Azure Foundry）は、そのプロバイダ自身のキャッシュの既定に従います。xAI Grok は、セッションに固定された会話 ID という別の仕組みを使います。[xAI のプロンプトのキャッシュ](/hermes/docs/integrations/providers/#xai-grok--responses-api--prompt-caching) をご覧ください。

これを無効にするつまみはありません。キャッシュは常に有効で、システムプロンプトだけでも入力トークン数のかなりの割合を占めるので、1 往復の会話でも費用を抑えられます。

明示的なつまみが 1 つだけあります。Anthropic 方式の区切りに対して Hermes が要求するキャッシュの TTL の段階です。

```yaml
prompt_caching:
  cache_ttl: "5m"   # "5m" or "1h" (Anthropic-supported tiers); other values are ignored
```

`cache_ttl` は、ネイティブ Anthropic API・OpenRouter・Nous Portal 経由の Claude に対して Hermes が付ける区切りの TTL を選びます。Anthropic が対応する 2 つの段階（`"5m"`、`"1h"`）だけが有効で、それ以外の値は無視されます。独自の上限を持つプロバイダ（たとえば最大 5 分の Qwen Cloud）は、今も上流が許す範囲へ丸められます。

## 補助モデル {#auxiliary-models}

Hermes は、画像の解析、ブラウザのスクリーンショットの解析、セッションのタイトルの生成、コンテキストの圧縮といった脇の作業に「補助」モデルを使います。既定（`auxiliary.*.provider: "auto"`）では、Hermes はすべての補助の作業を **主役のチャットモデル** — `hermes model` で選んだのと同じプロバイダ／モデル — へ回します。使い始めるのに設定は要りませんが、高価な推論モデル（Opus、MiniMax M2.7 など）では補助の作業がそれなりの費用になることは知っておいてください。主役のモデルが何であれ脇の作業は安く速くしたいなら、`auxiliary.<task>.provider` と `auxiliary.<task>.model` を明示的に設定してください（たとえば画像なら OpenRouter 上の Gemini Flash）。（web の抽出は補助の作業ではありません。`web_extract` とブラウザのスナップショットは長い内容を決まった規則で切り詰め、`read_file` でページをたどれるように全文を保存します。LLM は関わりません。）

:::note なぜ「auto」が主役のモデルを使うのか
以前のビルドは、アグリゲータ（OpenRouter、Nous Portal）の利用者だけをプロバイダ側の安い既定へ振り分けていました。これは意外なふるまいでした。アグリゲータの購読料を払っている人が、補助の通信を別のモデルが担っているのを目にすることになるからです。今の `auto` はすべての人に対して主役のモデルを使い、`config.yaml` でのタスクごとの上書きは今までどおり優先されます（下の [補助設定の全項目](#full-auxiliary-config-reference) をご覧ください）。
:::

### 補助モデルを対話的に設定する {#configuring-auxiliary-models-interactively}

YAML を手で書く代わりに、`hermes model` を実行してメニューから **「Configure auxiliary models」** を選びます。タスクごとの対話的な選択画面が出ます。

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

タスクを選び、プロバイダを選び（OAuth ならブラウザが開き、API キー方式なら入力を促されます）、モデルを選びます。変更は `config.yaml` の `auxiliary.<task>.*` に残ります。主役のモデルの選択画面と同じ仕組みで、新しく覚える書き方はありません。

**Delegation** の項目だけは特別です。これは `delegate_task` のサブエージェントが使うモデルを振り分けるもので、`auxiliary.*` ではなく最上位の `delegation.*` セクション（`delegation.provider` / `delegation.model`）に保存されます。サブエージェントは脇の LLM 呼び出しではなく、一人前の子エージェントだからです。ここでの `auto` は「親のエージェントのプロバイダ・モデル・資格情報を引き継ぐ」という意味です。

最初のやり取りのあとに Hermes へタイトルを自動生成させたくないときは、
`auxiliary.title_generation.enabled: false` にしてください。手でタイトルを付ける方法は
`/title` と `hermes sessions rename` で今までどおり使えます。

### ストリーミング専用のエンドポイント {#stream-only-endpoints}

OpenAI 互換のエンドポイントの中には、非ストリーミングのチャットのリクエストをはっきり拒むものがあります（たとえば Tencent Copilot は HTTP 400 で `"Non-stream chat request is currently not supported"` を返します）。対話的なチャットはもともとストリーミングしますが、補助の作業（タイトルの生成、圧縮、画像）は非ストリーミングの呼び出しを使うので、毎回失敗してしまいます。Hermes は `copilot.tencent.com` を常にストリーミング専用として扱います。ほかにそういうエンドポイントがあれば、URL の一部を `auxiliary.stream_only_base_urls` に並べてください。

```yaml
auxiliary:
  stream_only_base_urls:
    - "my-stream-only-proxy.example.com"
```

一致した補助の呼び出しは `stream=True` で送られ、チャンク（ツール呼び出しの差分を含みます）はクライアント側でまとめられます。ほかのエンドポイントのふるまいは変わりません。

### 動画のチュートリアル {#video-tutorial}

[YouTube: https://www.youtube.com/embed/NoF-YajElIM](https://www.youtube.com/embed/NoF-YajElIM)

### 共通の設定の型 {#the-universal-config-pattern}

Hermes のモデルの枠は — 補助の作業も、圧縮も、フォールバックも — すべて同じ 3 つのつまみを使います。

| キー | 何をするか | 既定 |
|-----|-------------|---------|
| `provider` | 認証とルーティングにどのプロバイダを使うか | `"auto"` |
| `model` | どのモデルを要求するか | プロバイダの既定 |
| `base_url` | 独自の OpenAI 互換エンドポイント（プロバイダより優先） | 未設定 |

補助の作業のブロックは、さらに `reasoning_effort` のつまみも受け付けます。

| キー | 何をするか | 既定 |
|-----|-------------|---------|
| `reasoning_effort` | その作業の LLM 呼び出しの思考の深さ: `none`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max`、`ultra` | 未設定（プロバイダの既定） |

これは全体に効く `agent.reasoning_effort` の、作業ごとの相棒です。主役のモデルが高価な推論モデルのとき、主役のチャットのふるまいを変えずに、圧縮を `low` で、画像を `none` で走らせて脇の作業の待ち時間と費用を削れます。これは `vision`・`compression`・`title_generation`・`curator` のような補助クライアントの作業に、3 つの補助の伝送方式（chat completions、Codex Responses、Anthropic Messages）すべてで効きます。同じ作業に明示的な `extra_body.reasoning` があれば、この省略記法より優先されます。

**バックグラウンドのレビューは別です。** 同じモデルでのレビューの分岐は、常に親の推論の深さを引き継ぎます。`auxiliary.background_review.reasoning_effort` はその経路では無視されます。親のプロバイダ／モデルを明示的に選んでいるときも同じです。これは、プロンプトのキャッシュを揃えるために、推論の設定・システムプロンプト・会話の丸ごとの写し・ツールの定義をバイト単位で同一に保つためです。同じモデルでのレビューに、深さを独立に切り替えるスイッチはありません。[バックグラウンドのレビューの推論](/hermes/docs/user-guide/features/memory/#same-model-review-reasoning) をご覧ください。レビューを別のプロバイダ／モデルへ振り分けた場合は、`reasoning_effort` がその振り分け先の分岐に適用されます（未設定なら振り分け先のプロバイダの既定値）。このキーを設定しているのにレビューがメインのモデルで動いたときは、Hermes が一度だけ警告を表示します。

**MoA も別の設定を使います。** Mixture-of-Agents の推論の深さは、`moa_reference`／`moa_aggregator` の補助のブロックではなく、MoA のプリセットの中で **枠ごと** に設定します（`moa.presets.<name>.reference_models[].reasoning_effort` / `aggregator.reasoning_effort`）。[Mixture of Agents](/hermes/docs/user-guide/features/mixture-of-agents/) をご覧ください。

```yaml
auxiliary:
  compression:
    reasoning_effort: "low"    # summaries don't need deep thinking
  vision:
    reasoning_effort: "none"   # disable thinking for image description
```

`base_url` が設定されているとき、Hermes はプロバイダを無視してそのエンドポイントを直接呼びます（認証には `api_key` か `OPENAI_API_KEY` を使います）。`provider` だけが設定されているときは、そのプロバイダの組み込みの認証とベース URL を使います。

補助の作業に使えるプロバイダ: `auto`、`main`、そして [プロバイダの一覧](/hermes/docs/reference/environment-variables/) にあるもの — `openrouter`、`nous`、`openai-codex`、`copilot`、`copilot-acp`、`anthropic`、`gemini`、`qwen-oauth`、`zai`、`kimi-coding`、`kimi-coding-cn`、`minimax`、`minimax-cn`、`minimax-oauth`、`deepseek`、`nvidia`、`xai`、`xai-oauth`、`ollama-cloud`、`alibaba`、`bedrock`、`huggingface`、`arcee`、`xiaomi`、`kilocode`、`opencode-zen`、`opencode-go`、`opencode-free`、`commandcode`、`commandcode-anthropic`、`ai-gateway`、`azure-foundry` — あるいは自分の `providers:` の辞書にある名前付きの独自プロバイダ（たとえば `provider: "beans"`）。

:::tip MiniMax の OAuth
`minimax-oauth` はブラウザの OAuth でログインします（API キーは要りません）。`hermes model` を実行して **MiniMax (OAuth)** を選び、認証してください。補助の作業には自動で `MiniMax-M2.7-highspeed` が使われます。[MiniMax OAuth の案内](/hermes/docs/guides/minimax-oauth/) をご覧ください。
:::

:::tip xAI Grok の OAuth
`xai-oauth` は、SuperGrok と X Premium+ の購読者向けに、ブラウザの OAuth でログインします（API キーは要りません）。`hermes model` を実行して **xAI Grok OAuth (SuperGrok / Premium+)** を選び、認証してください。同じ OAuth のトークンが、xAI へ直接つながるすべての面（チャット、補助の作業、TTS、画像生成、動画生成、書き起こし）で再利用されます。[xAI Grok OAuth の案内](/hermes/docs/guides/xai-grok-oauth/) をご覧ください。Hermes がリモートのホストにある場合は [SSH／リモートホスト越しの OAuth](/hermes/docs/guides/oauth-over-ssh/) もご覧ください。
:::

:::warning `"main"` は補助の作業専用です
`"main"` というプロバイダの選択肢は「主役のエージェントが使っているプロバイダを使う」という意味です。これは `auxiliary:`・`compression:`・主役のフォールバックの項目（`fallback_providers:` や従来の `fallback_model:`）の中でだけ有効です。最上位の `model.provider` の設定には **使えません**。独自の OpenAI 互換エンドポイントを使うなら、`model:` のセクションで `provider: custom` にしてください。主役のモデルのプロバイダの選択肢はすべて [AI プロバイダ](/hermes/docs/integrations/providers/) にあります。
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
補助の作業にはそれぞれ設定できる `timeout`（秒）があります。既定は、画像 120 秒、承認 30 秒、圧縮 120 秒です。補助の作業に遅いローカルのモデルを使うなら増やしてください。画像には、HTTP での画像のダウンロード用に別の `download_timeout`（既定 30 秒）もあります。回線が遅いときや自前ホストの画像サーバーを使うときは、こちらを増やしてください。
:::

:::info
コンテキストの圧縮は、閾値のための自分の `compression:` ブロックと、モデル／プロバイダの設定のための `auxiliary.compression:` ブロックを持っています。上の [コンテキストの圧縮](#context-compression) をご覧ください。主役のフォールバックの連鎖は、最上位の `fallback_providers:` のリストを使います。[フォールバックのプロバイダ](/hermes/docs/integrations/providers/#fallback-providers) をご覧ください。3 つとも同じ provider/model/base_url の型に従います。
:::

### 補助の作業のタスクごとのフォールバックの連鎖 {#per-task-fallback-chain-for-auxiliary-tasks}

補助の作業はそれぞれ、任意で `fallback_chain` を定義できます。主役の補助のプロバイダがレート制限・接続の問題・支払いの制限で失敗したときに、Hermes が試すプロバイダ／モデルの並びです。

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

主役の補助のプロバイダ（`openrouter` / `openai/gpt-4o-mini`）がレート制限・接続のタイムアウト・支払いが必要というエラーを返すと、Hermes は `fallback_chain` を順にたどります。すでに失敗したプロバイダと同じ項目は飛ばし、残りをどれかが成功するか連鎖が尽きるまで試します。すべてのフォールバックが失敗したときは、最後の安全網として主役のエージェントのモデルへ落ちます。

各項目は、どの補助の作業の設定とも同じ 3 つのつまみに対応しています。

| キー | 説明 |
|-----|-------------|
| `provider` | プロバイダの名前（`nous`、`openrouter`、`anthropic`、`gemini`、`main` など） |
| `model` | そのプロバイダでのモデル名 |
| `base_url` | （任意）独自の OpenAI 互換エンドポイント |

`fallback_chain` は、どの補助の作業でも使えます — `compression`、`vision`、`approval`、`skills_hub`、`mcp` などです。

### 補助の同時実行数を抑える {#limiting-auxiliary-concurrency}

`max_concurrency` は、`compression` や `title_generation` のような補助の作業について、プロセス全体で進行中の LLM 呼び出しの数に上限をかけます。`auxiliary.vision.max_concurrency` は例外です。これは LLM のリクエストではなく、画像の符号化／サイズ変更という CPU を使うワーカーだけを制御しているからです。これがいちばん役立つのは次のようなときです。

- 多くのセッションが同時に裏の作業を始めうる（Discord／Telegram のチャンネル、複数の端末）
- プロバイダがレート制限にかかっているか障害中で、再試行が波を大きくしてしまう

既定は無制限です。安全のための典型的な上限は `2` です。

```yaml
auxiliary:
  title_generation:
    max_concurrency: 2
  compression:
    max_concurrency: 2
```

この数取りは、再試行やフォールバックを含む呼び出し全体を包むので、遅い呼び出し 1 つが上限に対して二重に数えられることはありません。

### 補助の作業での OpenRouter のルーティングと Pareto Code {#openrouter-routing-pareto-code-for-auxiliary-tasks}

補助の作業が OpenRouter に解決されるとき（明示的に指定した場合でも、主役のエージェントが OpenRouter にいて `provider: "main"` になった場合でも）、主役のエージェントの `provider_routing` と `openrouter.min_coding_score` の設定は **引き継がれません**。設計として、補助の作業はそれぞれ独立しています。特定の補助の作業に OpenRouter のプロバイダの好みを設定したり、[Pareto Code のルーター](/hermes/docs/integrations/providers/#openrouter-pareto-code-router) を使ったりするには、`extra_body` で作業ごとに設定してください。

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

この形は、OpenRouter が chat completions のリクエストの本文で受け付けるものをそのまま写しています。Hermes は `extra_body` の全体をそのまま転送するので、[openrouter.ai/docs](https://openrouter.ai/docs) に載っているほかの OpenRouter のリクエスト本文の項目も同じように使えます。

### 画像のモデルを変える {#changing-the-vision-model}

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

### プロバイダの選択肢 {#provider-options}

これらの選択肢は **補助の作業の設定**（`auxiliary:`、`compression:`）と、主役のフォールバックの項目（`fallback_providers:` や従来の `fallback_model:`）に効くもので、主役の `model.provider` の設定には効きません。

| プロバイダ | 説明 | 必要なもの |
|----------|-------------|-------------|
| `"auto"` | 使える中で最良のもの（既定）。画像は OpenRouter → Nous → Codex の順に試します。 | — |
| `"openrouter"` | OpenRouter を強制します — どのモデル（Gemini、GPT-4o、Claude など）へも振り分けられます | `OPENROUTER_API_KEY` |
| `"nous"` | Nous Portal を強制します | `hermes auth` |
| `"codex"` | Codex の OAuth（ChatGPT アカウント）を強制します。画像に対応しています（gpt-5.3-codex）。 | `hermes model` → ChatGPT または Codex の購読 |
| `"minimax-oauth"` | MiniMax の OAuth（ブラウザでログイン、API キー不要）を強制します。補助の作業には MiniMax-M2.7-highspeed を使います。 | `hermes model` → MiniMax (OAuth) |
| `"xai-oauth"` | xAI Grok の OAuth（SuperGrok か X Premium+ の購読者向けのブラウザログイン、API キー不要）を強制します。同じ OAuth のトークンで、チャット・TTS・画像・動画・書き起こしがまかなえます。 | `hermes model` → xAI Grok OAuth (SuperGrok / Premium+) |
| `"main"` | いま使っている独自／主役のエンドポイントを使います。これは `OPENAI_BASE_URL` + `OPENAI_API_KEY` から来ることも、`hermes model` や `config.yaml` で保存した独自のエンドポイントから来ることもあります。OpenAI でも、ローカルのモデルでも、OpenAI 互換の API なら何でも動きます。**補助の作業専用です — `model.provider` には使えません。** | 独自のエンドポイントの資格情報とベース URL |

主役のプロバイダの一覧にある、API キーを直接使うプロバイダも、脇の作業を既定のルーターから外したいときに使えます。たとえば `GMI_API_KEY` を設定すれば `gmi` が、`FIREWORKS_API_KEY` を設定すれば `fireworks` が使えます。

```yaml
auxiliary:
  compression:
    provider: "gmi"
    model: "anthropic/claude-opus-4.6"
```

GMI への補助の振り分けでは、GMI の `/v1/models` エンドポイントが返す正確なモデル ID を使ってください。Fireworks のモデル ID は、そのプロバイダ本来のスラッシュ区切りの形を使います。たとえば `accounts/fireworks/models/glm-5p2` です。

### よくある構成 {#common-setups}

**独自のエンドポイントを直接使う**（ローカル／自前ホストの API には `provider: "main"` よりはっきりします）:
```yaml
auxiliary:
  vision:
    base_url: "http://localhost:1234/v1"
    api_key: "local-key"
    model: "qwen2.5-vl"
```

`base_url` は `provider` より優先されるので、補助の作業を特定のエンドポイントへ向ける、いちばん明確なやり方です。エンドポイントを直接上書きする場合、Hermes は設定された `api_key` を使い、無ければ `OPENAI_API_KEY` へ落ちます。その独自のエンドポイントに `OPENROUTER_API_KEY` を使い回すことはありません。

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

**Codex の OAuth を使う**（ChatGPT の Pro/Plus アカウント。API キーは要りません）:
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
`hermes model` を実行して **MiniMax (OAuth)** を選ぶと、ログインしてこの設定が自動で入ります。中国リージョンでは、ベース URL は `https://api.minimaxi.com/anthropic` になります。手順の全体は [MiniMax OAuth の案内](/hermes/docs/guides/minimax-oauth/) をご覧ください。

**ローカル／自前ホストのモデルを使う:**
```yaml
auxiliary:
  vision:
    provider: "main"      # uses your active custom endpoint
    model: "my-local-model"
```

`provider: "main"` は、Hermes が普通のチャットで使っているプロバイダをそのまま使います。名前付きの独自プロバイダ（たとえば `beans`）でも、`openrouter` のような組み込みのプロバイダでも、従来の `OPENAI_BASE_URL` のエンドポイントでも同じです。

:::tip
主役のモデルのプロバイダに Codex の OAuth を使っているなら、画像は自動で動きます。追加の設定は要りません。Codex は画像の自動検出の連鎖に入っています。
:::

:::warning
**画像にはマルチモーダルのモデルが要ります。** `provider: "main"` にする場合は、そのエンドポイントがマルチモーダル／画像に対応しているか確かめてください。対応していないと画像の解析は失敗します。
:::

### 環境変数（従来のやり方） {#environment-variables-legacy}

補助モデルは環境変数でも設定できます。ただし `config.yaml` のほうがおすすめです。管理しやすく、`base_url` や `api_key` を含めたすべての項目に対応しています。

| 設定 | 環境変数 |
|---------|---------------------|
| 画像のプロバイダ | `AUXILIARY_VISION_PROVIDER` |
| 画像のモデル | `AUXILIARY_VISION_MODEL` |
| 画像のエンドポイント | `AUXILIARY_VISION_BASE_URL` |
| 画像の API キー | `AUXILIARY_VISION_API_KEY` |

圧縮とフォールバックのモデルの設定は config.yaml だけです。（`AUXILIARY_WEB_EXTRACT_*` の変数はもう使われません。web の抽出に補助の LLM は使わなくなりました。）

:::tip
`hermes config` を実行すると、いまの補助モデルの設定が見られます。上書きは、既定と違うときにだけ表示されます。
:::

## 推論の深さ {#reasoning-effort}

モデルが応答する前にどれだけ「考える」かを制御します。

```yaml
agent:
  reasoning_effort: ""   # empty = medium. Options: none, minimal, low, medium, high, xhigh, max, ultra
```

未設定のとき（既定）、推論の深さは「medium」になります。ほとんどの作業でうまく働く、釣り合いの取れた段階です。値を設定するとそれが優先されます。推論を深くするほど複雑な作業での結果は良くなりますが、トークンと待ち時間が増えます。

:::note OpenRouter 経由の適応的思考のモデル（Claude 4.6 以降、Fable/Mythos 系）
これらのモデルは *適応的な* 思考を使い、いつもの `reasoning.effort` の項目を
受け付けません。OpenRouter はそれらに対しては無視します。Hermes はあなたの
`reasoning_effort` を、代わりに OpenRouter の `verbosity` パラメータへ透過的に振り分けます
（これは Anthropic の `output_config.effort` に対応します）。そのため、選んだモデルが対応する
段階の範囲で、同じ深さのつまみが今までどおり働きます。`none`（または未設定）は、モデルを
それ自身の適応的な既定のままにします。
ネイティブの Anthropic のプロバイダは、もともと深さを直接制御していて、影響を受けません。
:::

:::note OpenRouter のモデルと対応する深さの段階
OpenRouter を通るほかのモデルについては、Hermes は生きているモデルの
カタログの推論のメタデータ（`supported_parameters` とモデルごとの
`reasoning.supported_efforts`）を読み、そもそも推論の制御を送るかどうかを決め、
あなたが求めた深さを、その経路が実際に対応するいちばん近い段階へ丸めます
（常に下向きです。たとえば `high` までしか対応しない経路では `ultra` は `high` になり、
黙って上がることはありません）。推論に対応した新しいベンダーは、Hermes の更新を待たずに
自動で使えます。カタログに届かないときや、モデルが載っていないときは、Hermes は
組み込みのモデル系統の一覧へ落ち、あなたの深さをそのまま通します。
:::

`/reasoning` コマンドで、実行中に推論の深さを変えることもできます。

```
/reasoning                # Show current effort level and display state
/reasoning high           # Set reasoning effort to high (this session only)
/reasoning high --global  # Set effort and persist to config.yaml
/reasoning none           # Disable reasoning (this session only)
/reasoning show           # Show model thinking above each response
/reasoning hide           # Hide model thinking
```

深さの変更は、既定ではそのセッションだけに効きます。`--global` を付けると、
新しい段階が `agent.reasoning_effort` の既定として保存されます。

#### モデルごとの推論の上書き {#per-model-reasoning-overrides}

モデルごとに違う推論の深さを設定できます。複雑なモデルには深い推論を、速いモデルには medium を、というときに便利です。

```yaml
agent:
  reasoning_effort: "medium"       # global default
  reasoning_overrides:
    "openrouter/anthropic/claude-opus-4.5": "xhigh"
    "openai/gpt-5": "low"
    "claude-sonnet-4.6": "high"    # bare model name also works
```

キーの照合は **表記のゆれに強い** ので、それなりの書き方ならどれでも一致します。
- `claude-opus-4.5`、`claude-opus-4-5`、`claude-opus.4.5`（ドットとダッシュは入れ替え可能です）
- `anthropic/claude-opus-4.5`、`openrouter/anthropic/claude-opus-4.5`（プロバイダの接頭辞は任意です）
- 完全一致が、ゆれた表記より優先されます

:::note
`reasoning_overrides` のキーには `hermes config set` は使えません。YAML のファイルを直接編集してください。モデル名にはドットが入ることが多く（たとえば `claude-opus-4.5`）、CLI のドット区切りのキーの書き方とぶつかるからです。
:::

**解決の優先順位:**

1. セッション単位の `/reasoning --session` による上書き（ゲートウェイのみ）
2. `agent.reasoning_overrides` によるモデルごとの上書き（表記のゆれに強い）
3. 全体の `agent.reasoning_effort`
4. プロバイダの既定

この上書きは、どこでも自動で効きます。CLI の起動、メッセージングのゲートウェイ、デスクトップ／TUI、cron のジョブ、セッションの途中での `/model` の切り替え、フォールバックのモデルの発動、どれでも同じです。

## fast モード {#fast-mode}

fast モードは、割増の料金と引き換えに、プロバイダへ速い出力を求めます。OpenAI の [Priority Processing](https://openai.com/api-priority-processing/)（`service_tier: priority`）、Grok 4.6 での xAI の Priority Processing、そして Anthropic の [Fast Mode](https://platform.claude.com/docs/en/build-with-claude/fast-mode)（`speed: fast`、Opus 4.8 / Opus 5 のみ）です。既定では **無効** です。

```yaml
agent:
  service_tier: ""          # "" / normal | fast | auto | cold
  fast_auto_seconds: 60     # window for auto / cold
```

| モード | 速さのパラメータを送るとき | 向いている使い方 |
|------|---------------------------|------------|
| `normal`（既定、`""`） | 送りません | いちばん安い。標準の待ち時間 |
| `fast` | すべてのリクエスト | いつでも速さが欲しい、長い対話のセッション |
| `auto` | **すべての** ターンの最初の `fast_auto_seconds` の間のリクエスト | 最初の返事はきびきび。長いツールのループは標準の料金へ戻ります |
| `cold` | 同じ時間の窓ですが、セッションの **最初のターン** だけ（前の履歴がないとき） | 出だしの返事は速く、その後は標準の料金 |

`/fast normal|fast|auto|cold` でそのセッションのモードを切り替えます。`--global` を付けると `config.yaml` に保存されます。`/fast` だけなら、いまのモードが表示されます。

**費用について:** どちらのプロバイダも、速いリクエストには標準料金に倍率をかけて課金し（Anthropic は Opus 4.8 と Opus 5 で入出力 100 万トークンあたり $10 / $50）、プロンプトのキャッシュの料金と積み重なります。`auto`／`cold` は、その割増を時間の窓の中だけに抑えます。速さのパラメータは、それに対応するファーストパーティのエンドポイント（`api.openai.com` / Codex の購読、`api.anthropic.com`、`api.x.ai`）にだけ送られます。OpenRouter・Nous Portal・Copilot・Azure・Bedrock・独自の `base_url` の経路は、どのモードでも受け取りません。リクエストの間で変わるのはリクエストごとのパラメータだけで、システムプロンプト・ツール・メッセージはバイト単位で同じままなので、プロンプトのキャッシュは窓の境目を越えても生き残ります。

## ツールを使わせる強制 {#tool-use-enforcement}

モデルによっては、ツールを呼ぶ代わりに、やろうとしたことを文章で説明してしまうことがあります（本当にターミナルを呼ばずに「テストを実行します…」と書く、など）。ツールを使わせる強制は、実際にツールを呼ぶ方向へモデルを戻すための案内を、システムプロンプトへ注入します。

```yaml
agent:
  tool_use_enforcement: "auto"   # "auto" | true | false | ["model-substring", ...]
```

| 値 | ふるまい |
|-------|----------|
| `"auto"`（既定） | 次に一致するモデルで有効: `gpt`、`codex`、`gemini`、`gemma`、`grok`、`glm`、`qwen`、`deepseek`、`muse`。それ以外（たとえば Claude）では無効です。 |
| `true` | モデルにかかわらず常に有効。いま使っているモデルが、実行せずに説明してばかりだと気づいたときに便利です。 |
| `false` | モデルにかかわらず常に無効。 |
| `["gpt", "codex", "qwen", "llama"]` | モデル名に、並べた文字列のどれかが含まれるときだけ有効（大文字小文字は区別しません）。 |

### 何が注入されるか {#what-it-injects}

有効なとき、システムプロンプトへ 2 つの層の案内が足されることがあります。

1. **一般的なツール使用の強制**（一致したすべてのモデル） — 意図を説明するのではなくすぐにツールを呼ぶこと、作業が終わるまで働き続けること、これからやることの約束でターンを終えないことを、モデルへ指示します。

2. **Google 向けの運用の案内**（Gemini と Gemma のモデルのみ） — 簡潔さ、絶対パス、並列のツール呼び出し、編集の前に確かめる型についての案内です。

これらはユーザーからは見えず、システムプロンプトにだけ効きます。すでにツールを確実に使うモデル（Claude など）にはこの案内は要らないので、`"auto"` はそれらを外しています。

### いつ有効にするか {#when-to-turn-it-on}

既定の auto の一覧に無いモデルを使っていて、やることを実行せずに *やるつもり* を説明してばかりだと気づいたら、`tool_use_enforcement: true` にするか、そのモデルの文字列を一覧へ足してください。

```yaml
agent:
  tool_use_enforcement: ["gpt", "codex", "gemini", "grok", "my-custom-model"]
```

## 実行の規律の案内 {#execution-discipline-guidance}

ツールを使わせる強制とは別に、Hermes は **実行の規律** のブロックを、eval の記録で見つかった一連の失敗の型を共有するモデル系統へ注入します。コードではなく文章の中で計算する、外部への書き込みのあとに読み返して確かめない、形の壊れた識別子を「直して」しまう、件数が合わないのに完全だと主張する、受け入れ条件をすべて確かめずに「完了」と宣言する、といった型です。

```yaml
agent:
  execution_guidance: "auto"   # "auto" | true | false | ["model-substring", ...]
```

| 値 | ふるまい |
|-------|----------|
| `"auto"`（既定） | 次に一致するモデルで有効: `gpt`、`codex`、`grok`、`deepseek`、`kimi`、`qwen`、`glm`、`minimax`、`mimo`、`mistral`、`muse`。 |
| `true` | モデルにかかわらず常に有効。 |
| `false` | モデルにかかわらず常に無効。 |
| `["deepseek", "my-custom-model"]` | モデル名に、並べた文字列のどれかが含まれるときだけ有効（大文字小文字は区別しません）。 |

注入されるブロックが扱うのは次の点です。

- **ツールをやりきること** — 作業が終わり、*かつ* 確かめられるまでツールを呼び続けます。空・部分的・怪しく狭い検索結果は、結論を出す前に、もっと広いか別の問い合わせでやり直します。
- **ツールを必ず使うこと** — 計算、ハッシュ、日付、システムの状態、ファイルの事実は、頭の中の計算ではなく必ずツールから得ます。
- **外部への書き込みの読み返し** — 外部のシステムの状態を変える書き込みのあとは、成功と言う前に対象そのものを読み返します（ツールがすでに確認している内部のファイルの編集は、改めて確かめ直しません）。
- **件数の突き合わせ** — 宣言された合計（`total`、`reply_count`、`has_more`）は強い主張として扱います。食い違ったら、取り直すかプログラムで解析します。
- **文字どおりに保つこと** — 決められた形式に合わない識別子を、正規化したり「直したり」しません。検索が成功したからといって、形の壊れた元の文字列が正しいことにはなりません。
- **確認を関門にした完了** — 「完了」とは、名前の挙がった受け入れ条件がすべて確かめられたことであって、もっともらしい一部ではありません。

この関門は `tool_use_enforcement` とは独立していて、片方だけを有効にできます。案内はセッションの開始時にモデル名を鍵として 1 回だけ選ばれるので、会話の間ずっとシステムプロンプトはバイト単位で安定します（プロンプトのキャッシュにも優しくなります）。Gemini/Gemma が auto の一覧から外れているのは、より具体的な Google 向けの運用の案内を受け取るからです。Claude が外れているのは、これらの失敗の型を示さないからです。どのモデルも `true` か文字列の一覧で参加させられます。

## ツールのループの安全策 {#tool-loop-guardrails}

Hermes は、エージェントが実りのないツール呼び出しのループにはまったこと — 同じ呼び出しが繰り返し失敗する、同じツールが何度も失敗する、冪等な呼び出しが同じ結果を返して前へ進まない — を検出します。既定では、モデルが自分で立て直せるように、ツールの結果へ **警告** を注入します。対話的な CLI・TUI・デスクトップ・ACP のセッションは、人が割り込めるので警告だけのままです。無人のゲートウェイと cron のセッションでは、既定で強制停止が有効になります。

このプラットフォームに応じた既定は、無人の運用向けに無効にすることも、すべてのプラットフォームで強制停止を明示的に有効にすることもできます。

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

`hard_stop_enabled` は、すべてのプラットフォームで強制停止を明示的に有効にします。これが `false` のままでも、`non_interactive_hard_stop_enabled` は無人のゲートウェイや cron 型のプラットフォームで強制停止を有効にしつつ、CLI・TUI・デスクトップ・ACP・サブエージェント・`api_server` の実行（親やクライアントが生きて見ている作業のループ）では警告だけの動きを保ちます。無人の運用をこの既定から外したいときは `non_interactive_hard_stop_enabled: false` にしてください。[Docker / 無人の運用](/hermes/docs/user-guide/docker/) もご覧ください。

強制停止は **やり直しの繰り返し** — 同じ呼び出しが、変わらないまま、間に何も起きずに繰り返されること — を捕まえるためのもので、正当な反復を止めるものではありません。

- **編集 → 再実行はループではありません。** 状態を変える呼び出しが成功すると（`write_file`、`patch`、緑になった `terminal`／`execute_code`、ブラウザの操作、ジョブ／メッセージ／cron の変更）、それまで数えられていた失敗の呼び出しすべてについて、前進の印が付きます。次に同じ呼び出しをやり直しても（直したあとに赤いテストを流し直す、クリックのあとに取り直す）、遮断へ向けて積み上がるのではなく、新しい連続として数え直されます。
- **別々の失敗するコマンドは診断であって、ループではありません。** 0 以外の終了が普通の出力であるツール（`terminal`、`execute_code`、プロセスの確認、`browser_navigate`、`web_extract`）では、`same_tool_failure` の閾値は警告するだけで、止めることはありません。まったく同じ引数のやり直しで間に何の変化も無いか、同じ結果が続いた場合だけ、止まります。
- **停止はセッションではなくターンを終えます。** エージェントは、どの安全策がなぜ働いたかを返します。「continue」と返せば、ターンごとの数え直しとともに再開します。

### ターンごとの暴走のループの上限 {#per-turn-runaway-loop-caps}

上の失敗を基準にした閾値とは別に、`loop_caps` は、1 回のエージェントのループ（ターン）が行える `web_search` の呼び出しとサブエージェントの起動の数に、固い上限を置きます。数え直しはターンの始まりごとに行われるので、正当な複数ターンのセッションが飢えることはありません。しかし、際限のない検索や委任のループへ落ちた 1 つのターンは止まります。これらは常に有効で、`hard_stop_enabled` に関係なく働きます。1 つのターンで何十回も web を検索したり、何十ものサブエージェントを起こしたりするのはすでに異常なので、既定は低めです。上限に達すると、問題の呼び出しは説明付きで遮断され、予算の残りを燃やす代わりにターンがきれいに止まります。どちらかの値を `0` にすると、その上限を完全に無効にできます。

`delegate_task` を 1 回まとめて呼ぶと、その中の各タスクが `max_subagents` に数えられます（3 件のまとまりは 3 を使います）。つまり、この上限は `delegate_task` を何回呼んだかではなく、実際に起こしたサブエージェントの数を追います。

これは Claude Code のセッションごとの WebSearch とサブエージェントの上限（v2.1.212）と同じ考え方です。あちらも既定は 200 で、`/clear` でリセットされます。

### 実行中の停滞よけの見張り {#runtime-anti-stall-guards}

上の失敗を基準にした安全策を補うものとして、`agent.stall_guards`（既定 `true`）は、無駄なターンを防ぐ控えめな 2 つの見張りを有効にします。1 つめは **同一呼び出しのループの遮断** です。同じツールがまったく同じ引数で 3 回以上続けて呼ばれ、*しかも* まったく同じ結果を返したとき、そのツールの結果へ「同じ呼び出しを繰り返さないように」と伝える短い 1 行が足されます。警告だけのセッションでは呼び出しを遮ることはなく、正当に繰り返す確認系（`process`、`*_get_result`、`*_poll`）は対象外です。強制停止が有効なとき（明示的な `hard_stop_enabled`、または無人のゲートウェイ／cron のプラットフォーム）、同じ連続が `hard_stop_after.idempotent_no_progress` 回に達すると強制停止にもなります。これは `idempotent_no_progress` の安全策が追う読み取り専用のツールだけでなく **どのツールにも** 効くので、成功した `terminal` や `skill_view` の呼び出しを繰り返すモデルは、反復の予算を使い切る代わりに止まります（`identical_call_streak_halt`）。2 つめは **続ける意図の回収** です。モデルがツールを呼ばずにターンを終え、しかも短い返事が何かをやると宣言して尻切れになっているとき（「では、ファイルを更新します…」）、Hermes は、意図の確認の回収に使うのと同じ上限付きの継続の仕組みで、行動するよう促し直します（ターンごとに最大 2 回）。どちらもキャッシュを壊さず（断り書きは結果を組み立てるときに足され、あとから遡って足すことはありません）、まとめて無効にできます。

```yaml
agent:
  stall_guards: false
```

同じ関門は **結果の参照の置き換え** も有効にします。同じツール呼び出しをやり直して、バイト単位で同じ新しい結果が返ったとき、重複する中身は、出力の全体を繰り返す代わりに、前の結果を指す短い参照の印（ツール名、`tool_call_id`、引数の要約、そして最初の結果がディスクへ保存されていればそのあふれ先のパス）としてコンテキストへ入ります。ツールそのものは毎回実行されるので、確認の意味合いは保たれます。結果が変われば、必ずそのまま丸ごと流れます。512 文字未満の結果、エラーの結果、マルチモーダルの結果は決して置き換えられません。確認系は置き換え *られます*（変化のない確認は、重複した中身が何の情報も持たない、まさにその場合だからです）。

### ターンの生存の見張り {#turn-liveness-watchdog}

`agent.turn_liveness` は、Hermes が強制的に回復させるまでに、会話のターンが **目に見える前進をしない** 時間の上限を決めます。この見張り役は活動の時計（API の待ち、ストリームのトークン、ツールの鼓動に印を付けるのと同じ合図。リースの更新は数えません）を鍵にしているので、実行の途中で静かに詰まったターン（issue #95548 として観測されました。ツールの実行も、API の呼び出しも、エラーも無いのに、セッションが無期限に「busy」のまま）は、はっきりと表に出され、再試行できる中断されたターンとしてほどけるように割り込まれます。そして、割り込みでもその詰まりをほどけないときは、持続するターンのリースの更新を止めるので、プロセスを殺すまでぶら下がるのではなく、古いターンの片づけがセッションを取り戻せます。

```yaml
agent:
  turn_liveness:
    timeout_s: 600.0   # idle bound; <= 0 disables the watchdog
    poll_s: 15.0        # sampling interval (seconds)
```

正当に時間のかかる作業が罰せられることはありません。ストリーミングの応答、ツールの鼓動（ツールが走っている間 30 秒ごと）、承認の待ちは、どれも時計に触れ続けるので、上限いっぱいのあいだ *まったく* 前進しなかったターンだけが見張り役を発火させます。おかしな値（打ち間違い、`NaN`、`Inf`、0 以下の `poll_s`）は警告を記録して既定へ落ちます。起動を落としたり、黙って見張りを無効にしたりはしません。中断が発火すると、回復を始めるところで停滞を報告し、割り込みが実際に確定してから初めて、中断／リース停止という決着を出します。

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

これは `text_to_speech` ツールと、音声モード（CLI やメッセージングのゲートウェイでの `/voice tts`）での読み上げの返事の、両方を制御します。

**速さのフォールバックの順序:** プロバイダごとの速さ（たとえば `tts.edge.speed`） → 全体の `tts.speed` → 既定の `1.0`。全体の `tts.speed` を設定すればすべてのプロバイダに同じ速さがかかり、プロバイダごとに上書きすれば細かく調整できます。

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
  vim_mode: false         # CLI only: vi/vim keybindings in the input composer (Esc → NORMAL, i → INSERT). The live NORMAL/INSERT/REPLACE mode shows at the right of the status bar. Config-only, read at startup.
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

### ターンごとのまとめと、スピナーのトークンの流れ {#per-turn-summary-and-spinner-token-flow}

`display.turn_summary`（既定 `true`）は、**対話的な CLI** のターンごとに、そのターンが実際に何をしたかを 1 行の薄い文字でまとめて出します。

```
⋯ 12.4s · edited 2 files +18 -3 · read 4 files · ran 3 commands
```

集計は、CLI がすでに受け取っているツールの進み具合の流れから読み取っているので、追加の費用はかかりません。詳しくは次のとおりです。

- 時間はそのターンの実際の長さです（1 分を超えると `2m05s` のようになります）。
- ツールの呼び出しは動詞（`edited`、`read`、`ran`、`searched`、…）でまとめられ、単数複数も正しく付きます。決まった動詞のないプラグイン／MCP のツールは `called N tools` にまとまります。
- `+X -Y` の行の増減は、ツールの結果がすでに差分を報告しているときだけ出ます（今のところ `patch`）。Hermes がそれを計算するために git を呼ぶことはないので、`write_file` の編集は増減なしで数えられます。
- **失敗したツールの呼び出しは数えません。** 拒否された書き込みが、成功した編集として描かれることはありません（補い合う警告については [ファイル変更の確認役](#file-mutation-verifier) をご覧ください）。
- 長いターンは動詞の区切り 4 つと `+N more` の末尾で止まるので、行が折り返すことはありません。
- ツールを呼ばずに終わった速いターンは、何も出しません。

`display.spinner_token_flow`（既定 `true`）は、CLI のスピナーの生きたタイマーへ、そのターンの累計の出力トークンを足します。

```
  ⚡ Reading cli.py  (  2.3s · ↓ 1.2k tok)
```

この数はターンごとで（セッションの合計はターンの開始時を基準に引かれます）、ターンの中の API 呼び出しが使用量を報告するたびに更新されます。最初の使用量の報告が届くまでは何も描かれないので、紛らわしい `↓ 0 tok` を目にすることはありません。

どちらのキーも表示だけ・CLI だけのものです。静かなモード、`display.tool_progress` が `off` のとき、単発の問い合わせ／`-Q` の一括実行、ゲートウェイ／メッセージングの画面では抑えられます（そちらは代わりに `display.runtime_footer` を使います）。どちらのキーも `false` にすれば無効にできます。

### ファイル変更の確認役 {#file-mutation-verifier}

`display.file_mutation_verifier` が `true`（既定）のとき、ターンの中で `write_file` や `patch` の呼び出しが失敗し、同じパスへの書き込みが成功で上書きされないままだったなら、Hermes はアシスタントの最終応答へ 1 行の注意書きを足します。これは「並列のパッチをまとめて出し、半分が黙って失敗し、モデルは成功したとまとめる」という種類の言いすぎを、編集のたびに手で `git status` を走らせなくても捕まえます。

末尾に出る例:

```
⚠️ File-mutation verifier: 3 file(s) were NOT modified this turn despite any wording above that may suggest otherwise. Run `git status` or `read_file` to confirm.
  • concepts/automatic-organization.md — [patch] Could not find match for old_string
  • concepts/lora.md — [patch] Could not find match for old_string
  • concepts/rag-pipeline.md — [patch] Could not find match for old_string
```

`file_mutation_verifier: false`（または `HERMES_FILE_MUTATION_VERIFIER=0`）にすると、この末尾の行を抑えられます。この確認役は、ターンの終わりに本当の失敗が残っているときだけ発火します。失敗したパッチを同じターンの中でやり直して成功したモデルは、そのファイルについては発火させません。

**モデルのまとめよりも、この確認役を信じてください。** この行が出たということは、アシスタントの締めの言葉が完了したと言っていても、挙がったファイルはディスク上で変わって **いない** ということです。よくある原因は次のとおりです。

- **書き込みが拒否された** — パスが資格情報の拒否リストに載っているか、`HERMES_WRITE_SAFE_ROOT` の外にあります（[ファイル書き込みの安全策](/hermes/docs/user-guide/security/#file-write-safety) をご覧ください）
- **パッチが合わない** — `old_string` がディスク上のファイルと一致しませんでした
- **構文の関門** — 書き込む前の JSON/YAML/TOML の検証に候補の内容が通りませんでした

書き込みが遮られたときに出る例:

```
⚠️ File-mutation verifier: 2 file(s) were NOT modified this turn despite any wording above that may suggest otherwise. Run `git status` or `read_file` to confirm.
  • ~/.hermes/cron/jobs.json — [patch] Write denied: '…' is outside HERMES_WRITE_SAFE_ROOT (/path/to/project)
  • ~/.hermes/scripts/monitor.py — [write_file] Write denied: '…' is outside HERMES_WRITE_SAFE_ROOT (/path/to/project)
```

Hermes の状態（cron のジョブ、スキル、`~/.hermes/` の下のスクリプト）への書き込みが失敗しているなら、環境に `HERMES_WRITE_SAFE_ROOT` が設定されていないか確かめてください。cron の変更には、`jobs.json` へ直接パッチを当てるのではなく `cronjob` ツールか `hermes cron edit` を使ってください。

### 定型メッセージの UI の言語 {#ui-language-for-static-messages}

`display.language` の設定は、ユーザーに見える定型のメッセージのごく一部 — CLI の承認のプロンプト、いくつかのゲートウェイのスラッシュコマンドの返事（再起動前の待避の知らせ、「approval expired」、「goal cleared」など）— を翻訳します。エージェントの応答、ログの行、ツールの出力、エラーのトレースバック、スラッシュコマンドの説明は翻訳し **ません**。それらは英語のままです。エージェント自身に別の言語で返してほしいなら、プロンプトやシステムメッセージでそう伝えるだけで済みます。

対応する値: `en`（既定）、`zh`（簡体字中国語）、`zh-hant`（繁体字中国語）、`ja`（日本語）、`de`（ドイツ語）、`es`（スペイン語）、`fr`（フランス語）、`tr`（トルコ語）、`uk`（ウクライナ語）、`af`（アフリカーンス語）、`ko`（韓国語）、`it`（イタリア語）、`ga`（アイルランド語）、`pt`（ポルトガル語）、`ru`（ロシア語）、`hu`（ハンガリー語）。知らない値は英語へ落ちます。

`HERMES_LANGUAGE` 環境変数でセッションごとに設定することもでき、そちらが設定の値より優先されます。

```yaml
display:
  language: zh   # CLI approval prompts appear in Chinese
```

| モード | 見えるもの |
|------|-------------|
| `off` | 静か — 最終の応答だけ |
| `new` | ツールが変わったときだけツールの表示が出ます |
| `all` | すべてのツールの呼び出しを短いプレビュー付きで（既定） |
| `verbose` | 引数・結果・デバッグのログの全体 |

CLI では、`/verbose` でこれらのモードを順に切り替えられます。メッセージングのプラットフォーム（Telegram、Discord、Slack など）で `/verbose` を使うには、上の `display` セクションで `tool_progress_command: true` にしてください。すると、このコマンドでモードを切り替えて設定へ保存できるようになります。

ツールの進み具合の表示には、進み具合の更新を安全に表示できるゲートウェイのアダプタが要ります。メッセージの編集に対応していないプラットフォーム（Signal を含みます）は、`/verbose` で `off` 以外のモードが保存されていても、ツールの進み具合の吹き出しを抑えます。

`off` が隠すのは、ツール呼び出しの *装飾* だけです。デスクトップアプリと TUI で独自の表示面を持つアプリケーションの状態 — タスクの一覧（`todo_list`）、サブエージェントの進み具合、確認の質問、MCP の同意カード — は、この設定にかかわらず流れ続けます。

### フォーカス表示（`/focus`、CLI + TUI） {#focus-view-focus-cli-tui}

`display.focus_view: true` は **フォーカス表示** を有効にします。実況ではなく答えが欲しいときのための、出力を減らした表示モードです。これは 2 つめの抑制の経路ではなく、同じ `tool_progress` の仕組みの上に薄くかぶせたものです。

- 有効にすると `tool_progress` が `off` に固定され、それまでのモードが `display.focus_saved_tool_progress` に取っておかれます
- `/focus off` はそのモードを正確に戻すので、`/verbose verbose` の設定は行って帰ってきても残ります
- 終わったターンごとに、薄い回復の 1 行が出ます — `⋯ 7 tool lines hidden · /focus off to show` — これは *フォーカス前の* モードを基準に数えるので、すでに切ってあった行を隠したとは決して言いません
- ステータスバーには `◉ focus` の常設のバッジが出るので（prompt_toolkit の CLI でも Ink の TUI でも）、出力を減らしたモードが見えなくなることはありません
- フォーカス中に `/verbose` を回すと、モードの主導権が `/verbose` へ戻り、バッジは消えます

フォーカス表示は **表示だけ** のものです。会話の履歴、システムプロンプト、ツールのスキーマ、リクエストの中身を書き換えることは決してありません。隠された細部は画面上で抑えられるだけで、捨てられることはなく、プロンプトのキャッシュにもまったく影響しません。

### ステータスバーの項目の選択（CLI/TUI） {#status-bar-field-selection-clitui}

CLI/TUI の下端にある対話的なステータスバーには、モデル、コンテキストの使用量、圧縮の回数、裏の作業の数、タイマー、モードのバッジが出ます。`display.status_bar.fields` は、そのうちどれを見せるかを選びます。最小限のバー（モデルと時間だけ）にしたいときや、任意で出せるセッションのトークンの合計を見せたいときに便利です。

```yaml
display:
  status_bar:
    fields: ["model", "duration", "total_tokens"]   # visibility only; built-in order is preserved
```

使える項目: `model`、`context_detail`（使用／全体のトークン）、`context_pct`（パーセントとメーター）、`cache_hit`（プロンプトのキャッシュのヒット率。モデルの切り替えと圧縮でリセットされます）、`latency`（直近 10 回の API の平均の待ち時間）、`tps`（直近 10 回の毎秒の出力トークン）、`compressions`、`bg_tasks`、`bg_processes`、`bg_subagents`、`goal`、`git_branch`（⎇ 作業ディレクトリの現在の git ブランチ。任意で出すもので、既定では決して出ません。detached HEAD のときは短縮したコミットを表示します）、`duration`、`prompt_elapsed`、`idle_since`、`focus`、`yolo`、`stash`、`battery`、`title`（右寄せのセッションのバッジ）、`total_tokens`（セッションの合計。任意で出すもので、既定では決して出ません）。

補足:

- 空のリスト（既定）は、標準の組み合わせ（`total_tokens` と `git_branch` 以外すべて）を保ちます。
- この設定が決めるのは **見せるかどうかであって、並び順ではありません**。項目は組み込みの位置に描かれます。
- 狭い端末では、設定にかかわらず幅の広いモード専用の項目（`context_detail`、`cache_hit`、`latency`、`tps`、`prompt_elapsed`、`idle_since`）が落ちます（`cache_hit` は 52 桁以上の中くらいの段でも出ます）。
- `latency`／`tps` は、API の呼び出しが記録されるまで隠れたままです（たとえば Codex の app-server のバックエンドは待ち時間を報告しません）。
- ここでの `battery` と `title` の表示は、それぞれの切り替え（`/battery`、`/title`）と組み合わさります。両方が有効でないと、その区画は出ません。
- 同じキーは **Ink の TUI**（`hermes tui`）のステータスの行にも効きます。そこでは `cache_hit`・`latency`・`tps` が、それぞれ 96／104／110 桁以上の端末で、幅の予算に応じた末尾の区画（◎ / ◷ / ↑）として描かれます。
- 表示だけのものです。プロンプトのキャッシュやリクエストの中身には影響しません。変更は次のセッションの開始から効きます。

### 実行時のメタデータの末尾行（ゲートウェイのみ） {#runtime-metadata-footer-gateway-only}

`display.runtime_footer.enabled: true` のとき、Hermes はゲートウェイの各ターンの **最終の** メッセージへ、小さな実行時の文脈の行を足します。今のところ、モデル、コンテキストウィンドウの割合、今の作業ディレクトリを出せます。既定では無効です。すべての返事にこの由来を載せたいチームは、ゲートウェイごとに有効にしてください。

```yaml
display:
  runtime_footer:
    enabled: true
    fields: ["model", "context_pct", "cwd"]   # order shown; drop any to hide
```

使える項目:

| 項目 | 描かれるもの | 例 |
| --- | --- | --- |
| `model` | ベンダーの接頭辞を落とした素のモデル ID | `gpt-5.4` |
| `context_pct` | 直近の呼び出しのコンテキストの占有率 | `5%` |
| `latency` | そのターンの実時間 | `22s`、`1m05s` |
| `cwd` | ホームからの相対の作業ディレクトリ | `~` |

既定の組み合わせは `["model", "context_pct", "cwd"]` です。`latency` は任意で、使うには `fields` へ足してください。データが無い項目は、空の枠を描くのではなく黙って飛ばされます。

`/footer` のスラッシュコマンドで、どのセッションでも実行中に切り替えられます。

Telegram／Discord／Slack の返事に足される例:

```
— claude-opus-4.7 · 12 tool calls · 2m 14s · $0.042
```

末尾の行が付くのはターンの **最終の** メッセージだけで、途中の更新はきれいなままです。

### プラットフォームごとの進み具合の上書き {#per-platform-progress-overrides}

プラットフォームによって、どれだけ詳しく出したいかは違います。`display.platforms` でプラットフォームごとのモードを設定できます。

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

CLI からは、正式なパスを使ってください — `hermes config set display.platforms.telegram.streaming false`。短い書き方の `hermes config set platforms.telegram.streaming false` も受け付けます。プラットフォームごとの *表示* の設定（`streaming`、`show_reasoning`、`tool_progress`、…）は `display.platforms` からしか読まれないので、`config set`／`get`／`unset` はその短い書き方を正式なキーへ振り向け、そのことを知らせます。最上位の `platforms.<name>` ブロックの下にある接続のキー（`token`、`enabled`、`reply_to_mode`、`extra`）は振り向けられません。

上書きの無いプラットフォームは、全体の `tool_progress` の値へ落ちます。使えるプラットフォームのキー: `telegram`、`discord`、`slack`、`signal`、`whatsapp`、`matrix`、`mattermost`、`email`、`sms`、`homeassistant`、`dingtalk`、`feishu`、`wecom`、`weixin`、`bluebubbles`、`qqbot`。従来の `display.tool_progress_overrides` のキーも後方互換のために今も読み込まれますが、非推奨で、最初の読み込みのときに `display.platforms` へ移されます。

Signal が使えるプラットフォームのキーとして挙がっているのは、設定をプラットフォームごとに保存できるからですが、今の Signal のアダプタは送ったメッセージを編集できず、ツールの進み具合の吹き出しを描きません。Signal の `tool_progress` は `off` のままにしてください。ツールの呼び出しを 1 つずつ見たいなら、CLI か、編集のできるメッセージングのプラットフォームを使ってください。

`interim_assistant_messages` はゲートウェイ専用です。有効にすると、Hermes はターンの途中で出来上がったアシスタントの更新を、別々のチャットのメッセージとして送ります。これは `tool_progress` とは独立していて、ゲートウェイのストリーミングも要りません。

`show_commentary`（既定 `true`）は、Codex Responses のモデルの解説のチャンネル — これらのモデルが自分の内心の推論と並んで作る、整えられた進み具合の語り — を制御します。有効なとき、出来上がった解説のメッセージはターンの途中の更新として見える形で届きます（ゲートウェイでは `interim_assistant_messages` も必要です）。その語りがうるさければ `false` にしてください。そのとき解説は推論のチャンネルへ落ち、`show_reasoning` が有効なときだけ表示されます。

## プライバシー {#privacy}

```yaml
privacy:
  redact_pii: false  # Strip PII from LLM context (gateway only)
```

`redact_pii` が `true` のとき、ゲートウェイは対応するプラットフォームで、LLM へ送る前にシステムプロンプトから個人を特定できる情報を伏せます。

| 項目 | 扱い |
|-------|-------|
| 電話番号（WhatsApp/Signal のユーザー ID） | `user_<12-char-sha256>` へハッシュ化 |
| ユーザー ID | `user_<12-char-sha256>` へハッシュ化 |
| チャット ID | 数字の部分をハッシュ化し、プラットフォームの接頭辞は残します（`telegram:<hash>`） |
| ホームのチャンネル ID | 数字の部分をハッシュ化 |
| ユーザー名・ハンドル | **影響しません**（本人が選んだもので、公に見えています） |

**対応するプラットフォーム:** 伏せる処理は WhatsApp・Signal・Telegram に効きます。Discord と Slack は、メンションの仕組み（`<@user_id>`）が LLM のコンテキストに本物の ID を必要とするため、対象外です。

ハッシュは決定的なので、同じユーザーは常に同じハッシュになり、グループのチャットでもモデルはユーザーを見分けられます。振り分けと配送には、内部で元の値を使います。

### OpenAI Codex のリクエストの身元 {#openai-codex-request-identity}

OpenAI は、第三者の Codex のハーネスに身元を名乗ることを求めています。
公式の Codex のエンドポイントへの ChatGPT で認証したリクエストは、自動で
`originator: hermes-agent` と `User-Agent: HermesAgent/<version>` を送ります。
既存の ChatGPT アカウントのヘッダはそのまま残ります。プロンプトの内容や
テレメトリのリクエストが追加で送られることはありません。
OpenAI の API を直接呼ぶリクエストと、独自のプロキシのエンドポイントは変わりません。

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

言語の解決は **すべての** STT のプロバイダ（local、groq、openai、mistral、xai、elevenlabs、deepinfra、コマンド型のプロバイダ、プラグイン）で同じです: `stt.<provider>.language` → `stt.language` → `HERMES_LOCAL_STT_LANGUAGE` 環境変数 → プロバイダの自動判定。**既定は `stt.language: "en"` です。** Whisper の自動判定は、短い音声や訛りのある音声をしばしば取り違え、ボイスメモが違う言語で書き起こされる形で現れるからです。英語以外を話す方は、`stt.language` に自分の言語コードを一度設定してください（たとえば `"es"`、`"zh"`、`"uk"`）。多言語で使うために自動判定へ戻すには `""` にします。

ゲートウェイにボイスメモをエージェントのために書き起こさせつつ、生の書き起こしをチャットへ戻してほしくないとき（たとえば顧客向けの WhatsApp のボット）は、`stt.echo_transcripts: false` にしてください。

プロバイダごとのふるまい:

- `local` は、手元のマシンで動く `faster-whisper` を使います。`pip install faster-whisper` で別途インストールしてください。無音での幻覚への対策は既定で有効です。Silero の VAD フィルタが無音や雑音を Whisper へ届かせず、窓をまたいだ条件付けは無効で、モデル自身が「たぶん音声ではない」と判定し *かつ* 確信の低い区間は落とされます。音声でない音（音楽、環境音）を元のふるまいで書き起こしたいときは `stt.local.vad: false` にしてください。モデルは、待ち時間を短くするためにボイスメッセージの間もメモリに載ったままです。`stt.local.unload_after_idle_seconds`（たとえば 5 分なら `300`）を設定すると、放置されたときに自動でモデルを解放します。これは CUDA のホストで GPU のメモリを空けます（ローカルの LLM が同じ GPU を使っているときの主な利点です）。CPU では、そのメモリはプロセスから再利用できるようになりますが、OS から見える使用量は、プロセスがその領域を別のことに必要とするまで縮まないことがあります。次のボイスメッセージで、モデルは意識せずに読み直されます。
- `groq` は Groq の Whisper 互換のエンドポイントを使い、`GROQ_API_KEY` を読みます。`stt.groq.language`（または全体の `HERMES_LOCAL_STT_LANGUAGE` 環境変数）を渡すと、自動判定を飛ばして待ち時間を減らせます。
- `openai` は OpenAI の音声 API を使い、`VOICE_TOOLS_OPENAI_KEY` を読みます。

クラウドのプロバイダ（groq、openai、mistral、xai、elevenlabs、deepinfra）では、`ffmpeg` が入っていれば **アップロード前の無音の切り詰め** が既定で働きます。ボイスメモの長い間はファイルを送る前にクライアント側で詰められ、自然な間合いが残るように各休止の `cloud_trim_keep_ms` 分は保たれます。音声が短くなれば、アップロードは速く、音声の分数あたりの課金は減り、遠くのモデルの無音での幻覚も減ります。12 秒より短い音声は切り詰めをまったく行いません（そこでは節約に意味がなく、いくつかのプロバイダはどのみちリクエストごとの最低額を課金します）。この切り詰めはできる範囲での処理です。ffmpeg が無い、切り詰めに失敗した、音声のほとんどが無音、あるいは切り詰めても 10% ほども減らないときは、元のファイルがそのまま送られます。常に元のファイルを送りたいときは `stt.cloud_trim_silence: false` にしてください（たとえばクラウドのプロバイダで音楽や環境音を書き起こすとき）。コマンド型とプラグインのプロバイダは、切り詰めた音声を受け取ることはありません。

明示的に選ばれた `stt.provider` は厳密に守られます。使えない場合、プロバイダを勝手に切り替えるのではなく、`hermes tools` を実行するよう案内するエラーで書き起こしが失敗します。プロバイダが一度も選ばれていないときだけ、Hermes は次の順で自動判定します: `local` → `groq` → `openai`。

Groq と OpenAI のモデルの上書きは、環境変数で行います。

```bash
STT_GROQ_MODEL=whisper-large-v3-turbo
STT_OPENAI_MODEL=whisper-1
GROQ_BASE_URL=https://api.groq.com/openai/v1
STT_OPENAI_BASE_URL=https://api.openai.com/v1
```

### 書き起こしのプロンプト（語彙のヒント） {#transcription-prompt-vocabulary-hints}

`stt.prompt` は、プロンプトに対応した STT のバックエンドへ渡す、任意の固定のヒントです。Whisper 系のモデルが取り違えがちな固有名詞・製品名・専門用語に使ってください。

```yaml
stt:
  provider: "local"
  prompt: "Hermes, Teknium, Nous Research, kanban, Ollama"
```

**組み立て方。** 設定の値が土台です。[`pre_transcription`](/hermes/docs/user-guide/features/hooks/#pre_transcription) のフックを登録したプラグインが、その上を項目ごとに最後の書き手が勝つ形で書き換えます。複数のプラグインのヒントは決まった順で組み合わさります。プラグインの探索はプラグイン ID の順にプラグインを読み込み、各プラグインのコールバックはその登録の順に走るので、同じプラグインの組み合わせなら必ず同じ最終のプロンプトになります。フックが `prompt` に空の文字列を返すと、そのリクエストでは設定のプロンプトが消えます。フックは `language` と `model` も上書きできます。`file_path` は読み取り専用で、変えようとすると記録されて捨てられます。フックが登録されておらず `stt.prompt` も設定されていないときは、送り出されるリクエストは以前のリリースとまったく同じです。

**プロバイダの対応。**

| プロバイダ | プロンプトのパラメータ | ふるまい |
|----------|-----------------|----------|
| `local`（faster-whisper） | `initial_prompt` | そのままローカルのモデルへ渡されます |
| `openai` | `prompt` | 書き起こしのリクエストにそのまま渡されます |
| `groq` | `prompt` | 書き起こしのリクエストにそのまま渡されます |
| `mistral` | `prompt` | 書き起こしのリクエストにそのまま渡されます |
| `deepinfra` | `prompt` | OpenAI 互換の経路。そのまま渡されます |
| `xai` | 未対応 | DEBUG で記録され、プロンプトなしでリクエストが進みます |
| `elevenlabs` | 未対応 | DEBUG で記録され、プロンプトなしでリクエストが進みます |
| `local_command` | 未対応 | DEBUG で記録され、プロンプトなしでリクエストが進みます |
| `type: command` を持つ `stt.providers.<name>` | 未対応 | DEBUG で記録され、プロンプトなしでリクエストが進みます |
| プラグインが登録したプロバイダ | `transcribe(**extra)` の引数の `prompt` | プロンプトが設定されているときだけ送られるので、このキーより前からあるプロバイダには今までどおりの呼び出しが届きます |

**長さ。** Whisper 系のモデルは、プロンプトの最後のおよそ 224 トークンにしか条件付けされません。whisper 系のバックエンド（`local`、`openai`、`groq`、`deepinfra`）では、Hermes がこの上限をクライアント側で守ります。長すぎる最終のプロンプトは、警告を記録したうえで末尾だけに切り詰められます。プロンプトの長さでリクエストがエラーになることはありません。ほかのバックエンド（`mistral`、プラグインのプロバイダ）はプロンプトをそのまま受け取り、自分で検証します。いずれにせよ、ヒントは短く具体的にしてください。

:::warning プロンプトは音声と一緒にアップロードされます
最終のプロンプトは、音声ファイルとあわせて、設定された STT のプロバイダへ送られます。とくにプロバイダがローカルの `faster-whisper` ではなくホスト型の API のときは、秘密の値やセッション由来の文脈を `stt.prompt` にも、`pre_transcription` のフックが返すものにも入れないでください。
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

CLI で `/voice on` を使うとマイクのモードが有効になり、`record_key` で録音を開始・停止し、`/voice tts` で読み上げの返事を切り替えます。最初から最後までの準備とプラットフォームごとのふるまいは、[音声モード](/hermes/docs/user-guide/features/voice-mode/) をご覧ください。

## ストリーミング {#streaming}

応答の全体を待つのではなく、届いたそばからトークンを端末やメッセージングのプラットフォームへ流します。

### CLI のストリーミング {#cli-streaming}

```yaml
display:
  streaming: true         # Stream tokens to terminal in real-time
  show_reasoning: true    # Also stream reasoning/thinking tokens (optional)
```

有効にすると、応答はストリーミングの枠の中にトークンごとに現れます。ツールの呼び出しは今までどおり静かに記録されます。プロバイダがストリーミングに対応していなければ、自動で通常の表示へ落ちます。

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

有効にすると、ボットは最初のトークンでメッセージを送り、トークンが届くたびにそれを少しずつ編集していきます。メッセージの編集に対応していないプラットフォーム（Signal、メール、Home Assistant）は最初の試みで自動的に判別され、そのセッションではメッセージが大量に流れることなく、ストリーミングが穏やかに無効になります。

トークンを少しずつ編集せずに、ターンの途中の自然なアシスタントの更新だけが欲しいときは、`display.interim_assistant_messages: true` にしてください。

**あふれたときの扱い:** 流したテキストがプラットフォームのメッセージ長の上限（およそ 4096 文字）を超えると、今のメッセージを確定して、新しいメッセージが自動で始まります。

**新しい最終メッセージ（Telegram）:** Telegram の `editMessageText` は元のメッセージの時刻を保つので、長く流れた返事は完了したあとも最初のトークンの時刻のままになります。`fresh_final_after_seconds > 0` にすると、古いプレビューを真新しい最終メッセージとして届け、プレビューはできる範囲で削除する動きを選べます。既定は `0` で、流した返事をその場で確定し、両方の操作が見えるクライアントで一瞬メッセージが重複して消える流れを避けます。

:::note プラットフォームごとのストリーミングの既定
親スイッチの `streaming.enabled` は既定で `false` です。これを入れるまで何も流れません。有効にしたあとは、ストリーミングは **プラットフォームごと** に決まります。Telegram は `display.platforms.telegram.streaming: true`（流します）、Discord は `display.platforms.discord.streaming: false`（流しません）で出荷されます。ですからストリーミングを有効にすると、Telegram はそのまま流し、Discord は切り替えを変えるまでメッセージ全体での返事のままです。これらのプラットフォームごとのスイッチは、ダッシュボードの **Channels** の切り替えからでも、`~/.hermes/config.yaml` から直接でも調整できます。
:::

## グループチャットのセッションの隔離 {#group-chat-session-isolation}

CLI・TUI／ダッシュボード・メッセージングのゲートウェイをまたいで、同時に
開いていられるチャットのセッションの数を制限します。

```yaml
max_concurrent_sessions: null  # null/0 = unlimited; positive integer = active session cap
```

枠が取られるのは、セッションが **最初のターン** を走らせたときで、チャットの窓を
開いたときではありません。開く・再開する・つなぎ直すのは、メッセージを送るまで
何も使いません。ですから、放置されたデスクトップのタブ（や、不安定な websocket が
起こす裏での再開）が、この上限を共有するメッセージングのゲートウェイを飢えさせることはありません。

上限に達すると、Hermes はどの画面が枠を持っているかを名指しした、はっきりした
上限の知らせを返します。すでに動いているセッションは、今までどおりのふるまいを保ちます。
今の枠の使用状況と持ち主の一覧は `hermes status` で見られます。

正式なキーは最上位の `max_concurrent_sessions` です。Hermes は
`gateway.max_concurrent_sessions` もフォールバックとして受け付けますが、両方が
設定されているときは最上位のキーが勝ちます。

この上限は、ローカルの実行時のリースのファイルで守られる、できる範囲のものです。
利用者が締め出されないよう、一覧が読めなかったりロックできなかったりしたときは
Hermes は開く側へ倒れます。1 台のホスト／プロファイルの実行を想定していて、
複数の端末からマウントされた共有の `$HERMES_HOME` は想定していません。

共有のチャットで、部屋ごとに 1 つの会話にするか、参加者ごとに 1 つの会話にするかを制御します。

```yaml
group_sessions_per_user: true  # true = per-user isolation in groups/channels, false = one shared session per chat
```

- `true` が既定で、おすすめの設定です。Discord のチャンネル、Telegram のグループ、Slack のチャンネルなどの共有の場では、プラットフォームがユーザー ID を出していれば、送信者ごとに自分のセッションが割り当てられます。
- `false` は、以前の部屋を共有するふるまいへ戻します。チャンネルを 1 つの共同の会話として Hermes に扱わせたいときには役立ちますが、利用者どうしがコンテキスト・トークンの費用・割り込みの状態を共有することにもなります。
- ダイレクトメッセージは影響を受けません。Hermes は今までどおり、DM をチャット／DM の ID で区別します。
- スレッドはどちらの設定でも親のチャンネルから隔離されます。`true` なら、スレッドの中でも参加者ごとに自分のセッションになります。

ふるまいの詳しい説明と例は、[セッション](/hermes/docs/user-guide/sessions/) と [Discord の案内](/hermes/docs/user-guide/messaging/discord/) をご覧ください。

## 許可されていない DM のふるまい {#unauthorized-dm-behavior}

知らない相手からダイレクトメッセージが届いたときに、Hermes が何をするかを制御します。

```yaml
unauthorized_dm_behavior: pair

whatsapp:
  unauthorized_dm_behavior: ignore
```

- `pair` は、チャット型の DM のプラットフォームでの既定です。Hermes はアクセスを断りますが、DM で一度きりのペアリングのコードを返します。
- `ignore` は、許可されていない DM を黙って捨てます。
- メールは、`platforms.email.unauthorized_dm_behavior: pair` が設定されていない限り `ignore` が既定です。受信箱には関係のない未読のメールが入っていることがあるからです。
- プラットフォームのセクションは全体の既定を上書きするので、ペアリングを広く有効にしたまま、1 つのプラットフォームだけを静かにできます。

## クイックコマンド {#quick-commands}

LLM を呼ばずにシェルのコマンドを走らせるか、あるスラッシュコマンドを別のものの別名にする、独自のコマンドを定義します。exec 型のクイックコマンドはトークンを使わないので、メッセージングのプラットフォーム（Telegram、Discord など）からサーバーの様子を素早く見たり、道具立てのスクリプトを走らせたりするのに便利です。

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

使い方: CLI かどのメッセージングのプラットフォームでも `/status`・`/disk`・`/update`・`/gpu`・`/restart` と打ちます。`exec` のコマンドはホスト上でローカルに走り、その出力をそのまま返します。LLM の呼び出しも、トークンの消費もありません。`alias` のコマンドは、設定したスラッシュコマンドの行き先へ書き換えます。

- **30 秒のタイムアウト** — 長く走るコマンドはエラーメッセージとともに止められます
- **優先順位** — クイックコマンドはスキルのコマンドより先に調べられるので、スキルの名前を上書きできます
- **補完** — クイックコマンドは呼び出しのときに解決されるもので、組み込みのスラッシュコマンドの補完の表には出ません
- **種類** — 対応する種類は `exec` と `alias` です。ほかの種類はエラーになります
- **どこでも使えます** — CLI、Telegram、Discord、Slack、WhatsApp、Signal、メール、Home Assistant

文字列だけのプロンプトの近道は、クイックコマンドとしては正しくありません。使い回せるプロンプトの流れが欲しいときは、スキルを作るか、既存のスラッシュコマンドの別名にしてください。

## 人らしい間 {#human-delay}

メッセージングのプラットフォームで、人のような返事の間合いをまねます。

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

**`mode`** は、スクリプトの作業ディレクトリと Python のインタープリタを決めます。

- **`project`**（既定） — スクリプトは、セッションの作業ディレクトリで、いま有効な virtualenv／conda の環境の python を使って走ります。プロジェクトの依存関係（`pandas`、`torch`、プロジェクトのパッケージ）や相対パス（`.env`、`./data.csv`）が自然に解決され、`terminal()` から見えるものと揃います。
- **`strict`** — スクリプトは一時の作業ディレクトリで、`sys.executable`（Hermes 自身の python）を使って走ります。再現性は最大ですが、プロジェクトの依存関係と相対パスは解決されません。

環境の掃除（`*_API_KEY`・`*_TOKEN`・`*_SECRET`・`*_PASSWORD`・`*_CREDENTIAL`・`*_PASSWD`・`*_AUTH` を取り除きます）とツールの許可リストは、どちらのモードでもまったく同じように働きます。モードを変えてもセキュリティの構えは変わりません。

## web 検索のバックエンド {#web-search-backends}

`web_search` と `web_extract` のツールは、5 つのバックエンドのプロバイダに対応しています。バックエンドは `config.yaml` か `hermes tools` で設定します。

```yaml
web:
  backend: firecrawl    # firecrawl | searxng | parallel | tavily | perplexity | keenable | exa

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
| **Parallel** | `PARALLEL_API_KEY`（任意 — キー無しの無料枠あり） | ✔ | ✔ |
| **Tavily** | `TAVILY_API_KEY`（任意 — 選んだときはキー無しでも可） | ✔ | ✔ |
| **Perplexity** | `PERPLEXITY_API_KEY` | ✔ | ✔（問い合わせに関係する抜粋） |
| **Exa** | `EXA_API_KEY`（任意 — キー無しの無料枠あり） | ✔ | ✔ |

**バックエンドの選び方:** 実行時には常に、保存された `web.backend` の選択が使われます（`hermes tools` で設定します。`nous` は管理された Tool Gateway を通ります）。web のバックエンドが一度も選ばれていないときだけ、使える API キーから自動で判定します。`SEARXNG_URL` だけが設定されていれば SearXNG、`EXA_API_KEY` だけなら Exa、`TAVILY_API_KEY` だけなら Tavily、`PERPLEXITY_API_KEY` だけなら Perplexity、`PARALLEL_API_KEY` だけなら Parallel、`KEENABLE_API_KEY` だけなら Keenable が使われます。**選択も資格情報もまったく無い** ときは、リクエストはキー無しの無料枠の輪（Exa / Parallel / Firecrawl / Keenable）を順番に回り、レート制限のときは自動で次へ切り替わります。詳しくは [web 検索の案内](/hermes/docs/user-guide/features/web-search/) をご覧ください。いったん選択があると、`.env` にキーを足しても経路は変わりません。`hermes tools` で Tavily・Firecrawl・Keenable を選ぶのは、キー無しでも動きます。

**SearXNG** は、無料・自前ホスト・プライバシーを尊重するメタ検索エンジンで、70 以上の検索エンジンへ問い合わせます。API キーは要りません。`SEARXNG_URL` に自分のインスタンス（たとえば `http://localhost:8080`）を設定するだけです。SearXNG は検索専用で、`web_extract` には別の抽出のプロバイダが要ります（`web.extract_backend` を設定してください）。Docker での準備の手順は [web 検索の準備の案内](/hermes/docs/user-guide/features/web-search/) をご覧ください。

**自前ホストの Firecrawl:** `FIRECRAWL_API_URL` を自分のインスタンスへ向けます。独自の URL を設定すると、API キーは任意になります（認証を切るには、サーバー側で `USE_DB_AUTHENTICATION=*** を設定してください）。

**Parallel の検索のモード:** `PARALLEL_SEARCH_MODE` で検索のふるまいを決めます — `fast`、`one-shot`、`agentic`（既定: `agentic`）。

**Exa:** `~/.hermes/.env` に `EXA_API_KEY` を設定します。`category` での絞り込み（`company`、`research paper`、`news`、`people`、`personal site`、`pdf`）と、ドメイン／日付での絞り込みに対応しています。

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

- `must_respond`（既定） — ダイアログを捕まえ、`browser_snapshot.pending_dialogs` に出し、エージェントが `browser_dialog(action=...)` を呼ぶのを待ちます。`dialog_timeout_s` 秒たっても応答が無ければ、ページの JS のスレッドが永遠に止まらないよう、ダイアログは自動で閉じられます。
- `auto_dismiss` — 捕まえて、すぐ閉じます。エージェントはあとから `browser_snapshot.recent_dialogs` の中に `closed_by="auto_policy"` としてダイアログの記録を見られます。
- `auto_accept` — 捕まえて、すぐ受け入れます。しつこい `beforeunload` のプロンプトを出すページに便利です。

ダイアログの流れの全体は、[ブラウザの機能のページ](/hermes/docs/user-guide/features/browser/#browser_dialog) をご覧ください。

ブラウザのツールセットは複数のプロバイダに対応しています。Browserbase・Browser Use・ローカルの Chromium 系の CDP の準備については、[ブラウザの機能のページ](/hermes/docs/user-guide/features/browser/) をご覧ください。

## タイムゾーン {#timezone}

サーバーのローカルのタイムゾーンを、IANA のタイムゾーンの文字列で上書きします。ログの時刻、cron の予定、システムプロンプトへの時刻の差し込みに効きます。

```yaml
timezone: "America/New_York"   # IANA timezone (default: "" = server-local time)
```

対応する値: IANA のタイムゾーンの識別子なら何でも（たとえば `America/New_York`、`Europe/London`、`Asia/Kolkata`、`UTC`）。サーバーのローカルの時刻にするには、空にするか省いてください。

## Discord {#discord}

メッセージングのゲートウェイでの Discord 固有のふるまいを設定します。

```yaml
discord:
  require_mention: true          # Require @mention to respond in server channels
  free_response_channels: ""     # Comma-separated channel IDs where bot responds without @mention
  auto_thread: true              # Auto-create threads on @mention in channels
```

- `require_mention` — `true`（既定）のとき、ボットはサーバーのチャンネルでは `@BotName` とメンションされたときだけ応答します。DM はメンション無しでも常に働きます。
- `free_response_channels` — メンション無しでもすべてのメッセージに応答する、チャンネル ID のカンマ区切りの一覧です。
- `auto_thread` — `true`（既定）のとき、チャンネルでのメンションは会話のためのスレッドを自動で作り、チャンネルをきれいに保ちます（Slack のスレッドに似ています）。

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

- `redact_secrets` — `true` のとき、ツールの出力の中で API キー・トークン・パスワードらしき並びを自動で見つけ、会話のコンテキストとログへ入る前に伏せます。**既定で有効** です。デバッグや伏せ字の仕組みの開発のために生の資格情報らしき文字列が必要なときだけ、明示的に `false` にしてください。
- `tirith_enabled` — `true` のとき、ターミナルのコマンドは実行の前に [Tirith](https://github.com/sheeki03/tirith) で検査され、危険かもしれない操作が見つけられます。
- `tirith_path` — tirith のバイナリのパスです。tirith を標準でない場所に入れているときに設定してください。
- `tirith_timeout` — tirith の検査を待つ最大の秒数です。検査がタイムアウトしても、コマンドは進みます。
- `tirith_fail_open` — `true`（既定）のとき、tirith が使えなかったり失敗したりしてもコマンドの実行を許します。tirith が確かめられないときにコマンドを止めたいなら `false` にしてください。

## サイトの遮断リスト {#website-blocklist}

エージェントの web とブラウザのツールから、特定のドメインへ届かないようにします。

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

有効にすると、遮断するドメインの並びに一致した URL は、web やブラウザのツールが動く前に拒まれます。これは `web_search`・`web_extract`・`browser_navigate`、そして URL へ届くあらゆるツールに効きます。

ドメインの規則で使えるもの:
- 完全なドメイン: `admin.example.com`
- ワイルドカードのサブドメイン: `*.internal.company.com`（すべてのサブドメインを遮断します）
- TLD のワイルドカード: `*.local`

共有のファイルには、1 行に 1 つのドメインの規則を書きます（空行と `#` のコメントは無視されます）。ファイルが無かったり読めなかったりすると警告が出ますが、ほかの web のツールが止まることはありません。

この方針は 30 秒キャッシュされるので、設定の変更は再起動なしで素早く効きます。

## 賢い承認 {#smart-approvals}

危険かもしれないコマンドを Hermes がどう扱うかを制御します。

```yaml
approvals:
  mode: smart   # smart | manual | off
```

| モード | ふるまい |
|------|----------|
| `smart`（既定） | 印の付いたコマンドが本当に危険かどうかを、補助の LLM に判断させます。危険の少ないコマンドは、そのコマンドに限って自動で承認されます。本当に危ないコマンドは拒まれ、判断がつかないものはユーザーへ回されます。 |
| `manual` | 印の付いたコマンドを実行する前に、必ずユーザーへ確認します。CLI では対話的な承認のダイアログが出ます。メッセージングでは、保留中の承認の要求として並びます。 |
| `off` | 承認の確認をすべて飛ばします。`HERMES_YOLO_MODE=true` と同じです。**気をつけて使ってください。** |

smart モードは、承認の疲れを減らすのにとくに役立ちます。安全な操作についてはエージェントがより自律的に働けるようにしつつ、本当に破壊的なコマンドは捕まえられます。

:::warning
`approvals.mode: off` にすると、ターミナルのコマンドに対する安全の確認がすべて無効になります。信頼できるサンドボックスの環境でだけ使ってください。
:::

### 拒否の遮断機 {#denial-circuit-breaker}

`approvals.denial_breaker_threshold`（既定 `3`）は、賢い承認の判定役が拒み続けているコマンドの変種を、エージェントが試し続けることを防ぎます。やり直しのたびに、番人の LLM の呼び出しが 1 回ずつ費やされるからです。1 つのセッションでこの回数だけ連続して拒まれると、拒否のメッセージは、やめて、遮られた操作を報告し、手で実行するか `/approve` するようあなたへ頼め、という強制停止の指示へ格上げされます。承認が 1 回あれば数え直され、`0` にすると無効になります。

```yaml
approvals:
  denial_breaker_threshold: 3   # 0 disables the breaker
```

### 拒否の規則 {#deny-rules}

`approvals.deny` は、一致したターミナルのコマンドを無条件に遮る glob のパターンの一覧です。`--yolo`・`/yolo`・`mode: off` の下でも遮ります。これは、組み込みの強硬な遮断リストの、ユーザーが編集できる相棒です。

```yaml
approvals:
  deny:
    - "git push --force*"
    - "*curl*|*sh*"
```

パターンは大文字小文字を区別しない fnmatch の glob で、YAML では引用符で囲む必要があります（先頭の裸の `*` は構文エラーになります）。詳しくは [セキュリティ — ユーザーが定める拒否の規則](/hermes/docs/user-guide/security/#user-defined-deny-rules-approvalsdeny) をご覧ください。

### 賢い承認の独自の方針 {#custom-smart-approval-policy}

`approvals.smart_policy` を使うと、賢い承認の判定役への指示へ自分の規則を足せます。設定すると、そのテキストは番人の LLM のシステムプロンプト（信頼された経路であり、信頼されていないコマンドの文字列の隣には決して置かれません）へ足されるので、コードを書き換えずに、自分の環境に合わせて判断を厳しくも緩くもできます。

```yaml
approvals:
  smart_policy: |
    Always ESCALATE commands that modify anything under /etc.
    APPROVE docker compose restarts in ~/deploys — they are routine here.
```

## チェックポイント {#checkpoints}

破壊的なファイルの操作の前に、ファイルシステムを自動でスナップショットします。詳しくは [チェックポイントと巻き戻し](/hermes/docs/user-guide/checkpoints-and-rollback/) をご覧ください。

```yaml
checkpoints:
  enabled: false                 # Enable automatic checkpoints (also: hermes chat --checkpoints). Default: false (opt-in).
  max_snapshots: 20              # Max checkpoints to keep per directory (default: 20)
```

## 委任 {#delegation}

delegate のツールのためのサブエージェントのふるまいを設定します。

```yaml
delegation:
  # model: "google/gemini-3-flash-preview"  # Override model (empty = inherit parent)
  # provider: "openrouter"                  # Override provider (empty = inherit parent)
  # base_url: "http://localhost:1234/v1"    # Direct OpenAI-compatible endpoint (takes precedence over provider)
  # api_key: "local-key"                    # API key for base_url (falls back to OPENAI_API_KEY)
  # api_mode: ""                            # Wire protocol for base_url: "chat_completions", "codex_responses", or "anthropic_messages". Empty = auto-detect from URL (e.g. /anthropic suffix → anthropic_messages). Set explicitly for non-standard endpoints the heuristic can't detect.
  compression_threshold_tokens: 0          # Optional absolute cap on a subagent's compaction trigger (>= 16000); 0 = off, children use the ratio threshold
  # request_overrides:                      # Per-child request settings sent on every subagent API call (all resolution branches).
  #   extra_body:                           # Merged into the request's extra_body — e.g. OpenRouter routing hints:
  #     provider:
  #       sort: throughput
  max_concurrent_children: 3                # Parallel children per batch (floor 1, no ceiling). Also via DELEGATION_MAX_CONCURRENT_CHILDREN env var.
  worktree_isolation: false                 # Give each child its own git worktree branched from HEAD (local backend + git repos only; inspired by Muse Code). See Subagent Delegation → Worktree Isolation.
  max_spawn_depth: 1                        # Delegation tree depth cap (1-3, clamped). 1 = flat (default): parent spawns leaves that cannot delegate. 2 = orchestrator children can spawn leaf grandchildren. 3 = three levels.
  orchestrator_enabled: true                # Global kill switch. When false, role="orchestrator" is ignored and every child is forced to leaf regardless of max_spawn_depth.
```

**サブエージェントの provider:model の上書き:** 既定では、サブエージェントは親のエージェントのプロバイダとモデルを引き継ぎます。`delegation.provider` と `delegation.model` を設定すると、サブエージェントを別のプロバイダ:モデルの組み合わせへ振り分けられます。たとえば、主役のエージェントが高価な推論モデルで動いているあいだ、範囲の狭い下請けの作業には安くて速いモデルを使う、といったことができます。

**サブエージェントのフォールバックの連鎖:** `delegation.fallback_providers` を設定すると、ワーカーに自分の連鎖を持たせられます（項目の形は最上位の一覧と同じです）。明示的に固定された子（プロバイダ・エンドポイント・モデルのいずれかで固定されたもの）は、その連鎖が宣言されているときだけそれを使います。宣言が無ければ、親のエージェントの経路を借りるのではなく、はっきり失敗します。固定されていない子については、設定が無いか `null` なら、親の連鎖の引き継ぎが保たれます。子のフォールバックを完全に無効にするには、`delegation:` の下で `fallback_providers: []` を使ってください。

**エンドポイントを直接上書きする:** 独自のエンドポイントを分かりやすく指定したいなら、`delegation.base_url`・`delegation.api_key`・`delegation.model` を設定してください。これでサブエージェントはその OpenAI 互換のエンドポイントへ直接向かい、`delegation.provider` より優先されます。`delegation.api_key` を省いた場合、Hermes は `OPENAI_API_KEY` へだけ落ちます。`delegation.base_url` と一緒に `delegation.provider` も設定されているときは、明示したエンドポイントとキーが今までどおり勝ちますが、そのプロバイダのリクエストの設定（`extra_body` の上書きと、`custom_providers` の項目にある最大出力トークン）はサブエージェントへ持ち込まれます。

**子ごとのリクエストの設定（`request_overrides`）:** `delegation.request_overrides` は、サブエージェントのすべての API 呼び出しで送られるリクエストの設定の辞書です。最上位のキーは API の引数（たとえば `service_tier`）で、`extra_body` の副辞書はリクエストの `extra_body` へまとめられます。これは **3 つすべて** の解決の経路 — 直接の `base_url`、名前付きの `provider`、そのままの引き継ぎ — で尊重されるので、このキーは必ず効きます。優先順位: 明示的な `request_overrides` の値は、実行時や親から来た上書きの **上に** 重なります。最上位の明示的なキーが勝ち、`extra_body` は 1 段だけ深くまとめられるので、実行時の `extra_body` のキー（たとえばプロバイダの `thinking: {type: disabled}` という個性）は、あなたのキーがそれを定義し直さない限り残ります。代表的な使い道は、委任の子に対する OpenRouter のルーティングの指定です。

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
**通信の方式（`api_mode`）:** Hermes は `delegation.base_url` から通信の方式を自動で判定します（たとえば `/anthropic` で終わるパスは `anthropic_messages` になり、Codex／ネイティブ Anthropic／Kimi-coding のホスト名は今までの判定を保ちます）。この経験則で分類できないエンドポイント — たとえば Azure AI Foundry、MiniMax、Zhipu GLM、あるいは Anthropic 形式のバックエンドの前に立つ LiteLLM のプロキシ — では、`delegation.api_mode` を `chat_completions`・`codex_responses`・`anthropic_messages` のいずれかへ明示的に設定してください。自動判定のままにするなら空にしておきます。

委任のプロバイダは、CLI／ゲートウェイの起動と同じ資格情報の解決を使います。設定されたプロバイダはすべて使えます: `openrouter`、`nous`、`copilot`、`zai`、`kimi-coding`、`minimax`、`minimax-cn`。プロバイダを設定すると、正しいベース URL・API キー・API の方式が自動で解決されるので、資格情報を手でつなぐ必要はありません。

**優先順位:** 設定の `delegation.base_url` → 設定の `delegation.provider` → 親のプロバイダ（引き継ぎ）。設定の `delegation.model` → 親のモデル（引き継ぎ）。`provider` なしで `model` だけを設定すると、親の資格情報を保ったままモデル名だけが変わります（OpenRouter のように、同じプロバイダの中でモデルを切り替えるときに便利です）。

**幅と深さ:** `max_concurrent_children` は、1 回のまとまりの中で並列に走るサブエージェントの数に上限をかけます（既定 `3`、下限は 1、上限なし）。`DELEGATION_MAX_CONCURRENT_CHILDREN` 環境変数でも設定できます。モデルが上限より長い `tasks` の配列を出したときは、`delegate_task` は黙って切り詰めるのではなく、上限を説明するツールのエラーを返します。`max_spawn_depth` は委任の木の深さを決めます（1〜3 に丸められます）。既定の `1` では委任は平らで、子が孫を起こすことはできず、`role="orchestrator"` を渡しても黙って `leaf` へ落ちます。`2` へ上げると、orchestrator の子が leaf の孫を起こせます。`3` なら 3 段の木になります。エージェントは呼び出しごとに `role="orchestrator"` で指揮役になることを選びます。`orchestrator_enabled: false` にすると、それにかかわらずすべての子が leaf へ戻されます。費用は掛け算で増えます。`max_spawn_depth: 3` と `max_concurrent_children: 3` なら、木は 3×3×3 = 27 の同時の leaf エージェントに達しえます。使い方の型は [サブエージェントへの委任 → 深さの上限と入れ子の指揮](/hermes/docs/user-guide/features/delegation/#depth-limit-and-nested-orchestration) をご覧ください。

**子のプロセスの知らせ:** サブエージェントが始めたバックグラウンドのプロセスは、完了／監視の知らせを親の会話へ回しますが、そこでは既定で **抑えられます**。子のまとまった結果こそが成果物だからです。それらを（サブエージェントの名前を添えて）届けたいときは `delegation.surface_child_process_notifications: true` にしてください。委任の結果そのものが抑えられることはありません。[サブエージェントへの委任 → 子のバックグラウンドプロセスの知らせ](/hermes/docs/user-guide/features/delegation/#child-background-process-notifications) をご覧ください。

## 確認の質問 {#clarify}

確認の質問への返事を、ゲートウェイがどれだけ待つかを設定します。正式なキーは `agent.clarify_timeout`（既定 `3600` 秒）で、従来の最上位の `clarify.timeout` も明示的に設定されていれば今も尊重されます。

```yaml
agent:
  clarify_timeout: 3600        # Seconds to wait for user clarification response (0 or less = unlimited)
```

## コンテキストのファイル（SOUL.md、AGENTS.md） {#context-files-soulmd-agentsmd}

Hermes は 2 つの異なるコンテキストの範囲を使います。

| ファイル | 目的 | 範囲 |
|------|---------|-------|
| `SOUL.md` | **エージェントの主たる人格** — エージェントが何者かを定めます（システムプロンプトの 1 番目の枠） | `~/.hermes/SOUL.md` または `$HERMES_HOME/SOUL.md` |
| `.hermes.md` / `HERMES.md` | プロジェクト固有の指示（最優先） | git のルートまでたどります |
| `AGENTS.md` | プロジェクト固有の指示、コーディングの決まり | ディレクトリを再帰的にたどります |
| `CLAUDE.md` | Claude Code のコンテキストのファイル（これも検出します） | 作業ディレクトリのみ |
| `.cursorrules` | Cursor IDE の規則（これも検出します） | 作業ディレクトリのみ |
| `.cursor/rules/*.mdc` | Cursor の規則のファイル（これも検出します） | 作業ディレクトリのみ |

- **SOUL.md** はエージェントの主たる人格です。システムプロンプトの 1 番目の枠を占め、組み込みの既定の人格を完全に置き換えます。編集すれば、エージェントが何者かを丸ごと自分好みにできます。
- SOUL.md が無い、空、あるいは読み込めないときは、Hermes は組み込みの既定の人格へ落ちます。
- **プロジェクトのコンテキストのファイルは優先順位の仕組みを使います** — 読み込まれるのは 1 種類だけです（最初に一致したものが勝ちます）: `.hermes.md` → `AGENTS.md` → `CLAUDE.md` → `.cursorrules`。SOUL.md は常に独立して読み込まれます。
- **AGENTS.md** は階層的です。下のディレクトリにも AGENTS.md があれば、すべてがまとめられます。
- Hermes は、まだ無ければ既定の `SOUL.md` を自動で用意します。
- 読み込まれたコンテキストのファイルはすべて `context_file_max_chars` 文字（既定 20,000）で上限がかかり、賢く切り詰められます。

あわせてご覧ください:
- [人格と SOUL.md](/hermes/docs/user-guide/features/personality/)
- [コンテキストのファイル](/hermes/docs/user-guide/features/context-files/)

## 作業ディレクトリ {#working-directory}

| 状況 | 既定 |
|---------|---------|
| **CLI（`hermes`）** | コマンドを実行した今のディレクトリ |
| **メッセージングのゲートウェイ** | `~/.hermes/config.yaml` の `terminal.cwd`。未設定ならホームディレクトリ `~` |
| **Docker / Singularity / Modal / SSH** | コンテナやリモートのマシンの中の、ユーザーのホームディレクトリ |

作業ディレクトリを上書きするには次のようにします。
```yaml
# In ~/.hermes/config.yaml:
terminal:
  cwd: /home/myuser/projects
```

`~/.hermes/.env` の `MESSAGING_CWD` と `TERMINAL_CWD` の項目は、従来との互換のためのフォールバックです。新しい設定では `terminal.cwd` を使ってください。

## ネットワーク {#network}

外向きの HTTP のための、つながりにくさへの対処です。

```yaml
network:
  force_ipv4: false   # Force IPv4 for outbound connections (default: false)
```

`force_ipv4` — IPv6 が壊れているか届かないサーバーでは、Python が先に AAAA のレコードを解決し、IPv4 へ落ちるまで TCP のタイムアウトいっぱいぶら下がることがあります。IPv6 を完全に飛ばして IPv4 で直接つなぐには、これを `true` にしてください。

## 導入の案内 {#onboarding}

初回だけの導入のヒントと、組み立て済みのプロフィール作成の申し出です。

```yaml
onboarding:
  profile_build: "ask"   # "ask" (default) | "off"
  seen: {}               # internal latch — leave empty
```

- `profile_build` — ゲートウェイでのいちばん最初のメッセージのときに出す、プロフィール作成の道筋を制御します。`"ask"`（既定）はユーザーのプロフィールを作ることを申し出ます。この申し出は **本人が選び、同意を関門にしたもの** で、エージェントはどんな調べ物の前にも尋ね、つながったアカウントを黙って読むことはありません。`"off"` は素っ気ない紹介だけを出します。この申し出は多くても 1 回しか出ません。
- `seen` — 内部の状態です。Hermes は見せたヒントをここに掛け金として記録し、二度と出ないようにします。プロフィール作成の申し出も、一度出したらここに記録されます。手で編集しないでください。すべてのヒントをもう一度見たいなら、`onboarding` のセクションを丸ごと消してください。

## ダッシュボード {#dashboard}

[web のダッシュボード](/hermes/docs/user-guide/features/web-dashboard/) の設定です。見た目のテーマ、公開の URL、認証のプロバイダを扱います。認証のプロバイダ（OAuth、基本のパスワード、drain）は web ダッシュボードのページで詳しく説明しています。ここでは `config.yaml` の形を示します。

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
  ssh_isolated_idle_grace_s: 900.0 # Desktop-over-SSH backend exits after this long with no client and no running turn
  ws_orphan_activity_stale_s: 600.0 # Activity idle bound before a detached RUNNING turn is interrupted (seconds)
  startup_orphan_sweep: true  # Close session rows orphaned by a dead gateway process at boot
```

- `theme` — ダッシュボードの見た目のテーマです。
- `show_token_analytics` — 既定では無効です。Analytics のページとトークン／費用の数字は **ローカルでの下限の見積もり** で（補助の呼び出し、再試行、フォールバック、キャッシュの書き込みを含みません）、プロバイダの請求よりずっと低く出ることがあります。請求ではないと理解したうえでだけ `true` にしてください。
- `public_url` — 設定すると、これが OAuth の `redirect_uri` を組み立てるときの完全な権威（スキーム + ホスト + 任意のパスの接頭辞）になります。`X-Forwarded-*` のヘッダを確実には転送しないリバースプロキシの後ろへ置くときに設定してください。空のままにすると、プロキシのヘッダから組み直します。
- `trusted_proxies` — `X-Forwarded-Proto` と `X-Forwarded-For` を出してよい IP アドレスか、範囲の限られた CIDR のネットワークです。ループバックは自動で信頼されたままです。TLS のリバースプロキシが別のコンテナやホストからつないでくるときに設定してください。プロキシの正確な IP を使うのが良く、そのアドレスが変わるときだけ小さな専用のネットワークを使ってください。ワイルドカードと `/0` のネットワークは拒まれます。
- `oauth` / `basic_auth` / `drain_auth` — 同梱のダッシュボードの認証プラグインが読む、認証のプロバイダの設定です。drain の秘密そのものはここでは設定 **しません**。`HERMES_DASHBOARD_DRAIN_SECRET` 環境変数で用意します。認証の準備の全体は [web ダッシュボード](/hermes/docs/user-guide/features/web-dashboard/) をご覧ください。
- `ws_ping_interval` / `ws_ping_timeout` — ループバック以外の待ち受けに対する WebSocket のキープアライブの調整です（ループバックの接続では ping を送りません）。待ち時間の大きい回線（Tailscale、遠くの SSH のトンネル）では、20 秒の既定が誤った 1006 の切断を生むことがあるので、これらを上げてください。
- `ssh_isolated_idle_grace_s`（既定 `900`） — SSH 越しに届く、デスクトップが持つ `hermes serve --isolated` のバックエンドは、意図して SSH のセッションから切り離されています。接続の途中でノートパソコンが眠っても落ちないようにするためです。そのため以前は、暗いところでの復帰のたびに、`state.db` を握ったバックエンドがもう 1 つ増えていました。今のバックエンドは、この時間ずっとクライアントの WebSocket がつながらず、エージェントのターンも走っていなければ、自分から退きます（ターンがあれば生き続けますし、ターンの状態が読めないときも生き続けます）。ノートパソコンが眠ったあとも、切り離されたバックエンドに長い作業を終わらせてほしいなら、高くしてください。そうしたバックエンドは、半開きのトンネルに気づけるように、ゆっくりした WebSocket の ping（60 秒間隔、10 分のタイムアウト）も送ります。
- `ws_orphan_reap_grace_s` — WebSocket から切り離されたセッションが、孤児の掃除役に回収されるまで待つ時間です。クライアントの再接続が遅いなら、キープアライブの値とあわせて上げてください。定期のセッションの手入れも、閉じたソケットの片づけをやり切り、失われた孤児のタイマーを掛け直すので、切り離されたチャットが、最初の片づけやタイマーを落としただけで所有のリースを握り続けることはありません。つなぎ直せばそのタイマーは取り消されます。動いている委任の作業と健康な実行中のターンは、通常の孤児の掃除役の確認によって守られたままです。（`HERMES_TUI_WS_ORPHAN_REAP_GRACE_S` は内部の上書きとして残っています。）
- `ws_orphan_activity_stale_s`（既定 `600`） — 切り離された **実行中の** ターンの活動の時計（`agent.turn_liveness` の見張り役が測るのと同じ時計。API の待ち、ストリームのトークン、ツールの鼓動）が、孤児の掃除役に割り込まれるまでにどれだけ止まっていられるかです。クライアントがいなくても、まだ活発に出力しているターンは切り離されたまま最後まで走ります。ノートパソコンを閉じる、モバイルのアプリを背面へ回す、デスクトップを更新する、といったことで健康な長いターンが取り消されることはもうありません。本当に詰まったターンだけが割り込まれます。活動にかかわらず猶予の時間で割り込ませたい（以前のふるまい）なら `0` にしてください。
- `startup_orphan_sweep`（既定 `true`） — 上の WebSocket の孤児の回収のタイマーはプロセスの中にあるので、それが発火する前にゲートウェイが再起動（更新、クラッシュ、systemd）すると、セッションの行が永遠に開いたままになります。`/resume` やダッシュボードに、幽霊の「実行中」の作業が残るのです。ゲートウェイが起動するたび — 標準入出力の TUI（`entry.main`）でも、デスクトップ／ダッシュボードの WebSocket のサイドカー（`handle_ws`）でも — ソースが `tui` / `desktop` / `subagent` で、開始の時刻 **と** 最新のメッセージの両方がセッションの TTL（`HERMES_TUI_SESSION_TTL_S`、既定 6 時間）より古い行は、`end_reason: startup_orphan_reap` として閉じられます。メッセージングのプラットフォームのセッション（Telegram、Discord、…）には決して手を出さず、メモリ上で生きているセッション（すでに再開したクライアント）は除かれ、掃除された行はあとから再開できます。
