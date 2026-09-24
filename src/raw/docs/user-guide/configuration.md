---
title: "Hermes Agent の設定"
description: "config.yaml、プロバイダー、モデル、API キーなど、Hermes Agent の設定方法"
upstream_path: user-guide/configuration.md
upstream_blob: cf74aaa66f0182543d548d465124db1db45adc5f
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/configuration
---

# Hermes Agent の設定 {#hermes-agent-configuration}

設定はすべて `~/.hermes/` ディレクトリにまとまっているので、すぐに開けます。

:::tip 動く `config.yaml` をいちばん手早く用意する方法
`hermes setup --portal` を実行します。OAuth を1回通すだけで、モデルのプロバイダーと Tool Gateway の4つのツールがそろい、YAML を手で書く必要はありません。Portal の購読者は、トークン単位で課金されるプロバイダーの料金も10%引きになります。詳しくは [Nous Portal](/hermes/docs/integrations/nous-portal/) を参照してください。
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
`hermes config set` コマンドは、値を適切なファイルへ自動で振り分けます。`UPPER_SNAKE` 形式の名前（`OPENROUTER_API_KEY`、`DISCORD_HOME_CHANNEL`、`TELEGRAM_GROUP_ALLOWED_USERS`、`HERMES_TIMEZONE` など）はどれも環境変数として扱われ、`.env` に保存されます。`config.yaml` に保存されることはありません。ドット区切りの設定は `config.yaml` に入ります。それ以外の `UPPER_SNAKE` 形式の名前も、そのまま `.env` に保存されます（プラグインやスキルが使えるよう、プロセスの環境変数として渡されます）。環境変数の書き込み処理が持つ拒否リストに載っている名前（`HERMES_YOLO_MODE`、`PATH` など）は拒否されます。既知のキーを誤ったプレフィックスの下に書いた場合（`discord.foo` 自体が既知のキーであるときの `gateway.discord.foo` など）は、何も書き込まれないうちに「もしかして」の候補を添えて拒否されます。それでも書き込むには `--force` を付けてください。既知のセクションの下にある、それ以外の未知のパス（`agent.max_turnz` のような打ち間違いや、実行時に読まれるものの既定値が登録されていないキー）は、「もしかして」の通知を添えたうえで書き込まれます。スキーマだけでは、この2つを見分けられないためです。そうしたパスに `hermes config get` を実行すると、ファイルに書かれた値とあわせて、Hermes がその値を読まない可能性があるという通知を stderr に出します。そのため、消し忘れたキーが、実際に効いている設定のように気づかれないまま紛れ込むことはありません。
:::

## 設定の優先順位 {#configuration-precedence}

設定は次の順で解決されます（上ほど優先されます）。

1. **CLI 引数** — たとえば `hermes chat --model anthropic/claude-sonnet-4`（その呼び出しだけの上書き）
2. **`~/.hermes/config.yaml`** — シークレット以外のすべての設定を書く、メインの設定ファイル
3. **`~/.hermes/.env`** — 環境変数のフォールバック先。シークレット（API キー、トークン、パスワード）には**必須**
4. **組み込みの既定値** — ほかに何も設定されていないときに使う、コードに組み込まれた安全な既定値

:::info 目安
シークレット（API キー、ボットトークン、パスワード）は `.env` に書きます。それ以外のすべて（モデル、ターミナルバックエンド、圧縮の設定、記憶の上限、ツールセット）は `config.yaml` に書きます。両方に設定がある場合、シークレット以外の設定では `config.yaml` が優先されます。
:::

:::tip 組織での運用
管理者は、システムレベルの管理用ディレクトリを使って、一般ユーザーが
上書きできない設定値やシークレットの値を固定できます。詳しくは
[管理者による適用範囲](/hermes/docs/user-guide/managed-scope/) を参照してください。
:::

## 実行時の制限 {#runtime-limits}

長時間動き続ける Hermes のサーバー系のプロセス（ゲートウェイや
`hermes serve --isolated` を含む）は、OS が対応していれば、設定された `RLIMIT_NOFILE` のソフトリミットを
起動時に適用します。

```yaml
runtime:
  nofile_soft_limit: 4096
```

既定値は `4096` です。Hermes は目標値を OS のハードリミット以下に収め、
すでにそれより高いソフトリミットを持つプロセスの値を下げることはありません。この調整を無効にするには、
値を `0`、`false`、`null` のいずれかにします。Windows や、
リミットを変更できないサンドボックスでは、
リミットを変えずにそのまま起動を続けます。

## データベースの設定 {#database-settings}

`database:` セクションでは、Hermes が SQLite の状態データベース
（`state.db`）をどう開くかを設定します。このデータベースには、セッション、メッセージ、ゲートウェイの経路情報が保存されます。

```yaml
database:
  # Journal mode for state.db: wal (default) or delete.
  # Use delete on filesystems where WAL is unsafe (network mounts). On
  # virtiofs/9p bind mounts (Docker Desktop, Podman on macOS, OrbStack)
  # Hermes detects the mount and creates fresh databases in delete mode
  # automatically. Note: an existing on-disk WAL database is never
  # live-downgraded — Hermes keeps WAL and logs an error telling you the
  # configured delete did not apply (or that the WAL database sits on a
  # cross-VM mount). To convert an existing database, stop
  # every process using it and run
  # `hermes sessions set-journal-mode delete` (see Sessions).
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

既存のデータベースのディスク上のジャーナルモードが、開いた時点で知らないうちに WAL へ
切り替わった場合（たとえば運用者が手作業で `delete` に変換していたデータベース）も、
Hermes は警告を出し（プロセスごと、データベースごとに1回）、その選択を固定する設定として
`database.journal_mode` を示します。逆方向の切り替えが自動で起きることはありません。
すでに WAL モードになっているデータベースは、`journal_mode: delete` を設定しても稼働中に
ダウングレードされません（接続が開いたままダウングレードすると、データベースが壊れるおそれがあるためです）。
そのプロファイルの Hermes プロセスをすべて止めて
`hermes sessions set-journal-mode delete` を実行するまで、`hermes doctor` は
`<db> is in WAL mode despite database.journal_mode=delete` という警告を出し続けます
（このコマンドは、まだ何かがファイルを開いている間は実行を拒み、変換後のヘッダーを検証します）。
その警告の下には、いまデータベースを開いているプロセス（`<db> is held by PID <n> (<command>)`）も
表示されるので、何を止めればよいかがわかります。開いているプロセスの走査が一部しかできないときや
走査できないときは、問題なしとは表示せず、`cannot prove the database is quiet` と表示します。

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

1つの値に複数の参照を書くこともできます（例: `url: "${HOST}:${PORT}"`）。参照した変数が設定されていない場合、プレースホルダーは書いたとおりに残り（`${UNDEFINED_VAR}` はそのままになります）、警告がログに記録されます。波括弧のない `$VAR` は展開されません。

[複数のプロファイルを多重化したゲートウェイ](/hermes/docs/user-guide/multi-profile-gateways/) では、プロファイルの `config.yaml` にある参照は、共有のプロセス環境ではなく**そのプロファイル自身の** `.env`（そのプロファイルのシークレットの範囲）をもとに解決されます。たとえばプロファイル B にある `${MATRIX_ACCESS_TOKEN}` は、B 自身がその変数を定義していない限り未解決のまま残ります（書いたとおりに残り、警告がログに記録されます）。これは、マルチプレクサーの中で B の設定が読み込まれるすべての場面に当てはまります。ゲートウェイで振り分けられたターン、B のアダプターの起動、B の cron ジョブのどれでも同じです。単一プロファイルでの実行は変わりません。全項目は [プロファイルごとに切り離されるもの](/hermes/docs/user-guide/multi-profile-gateways/#what-is-isolated-per-profile) を参照してください。

Cursor 形式の SecretRef の書き方も使えます。`${env:VAR_NAME}` は `${VAR_NAME}` とまったく同じように解決されます（`env:` というプレフィックスは取り除かれます）。そのため、Cursor や Claude の設定からコピーした MCP やプロバイダーの設定例は、`config.yaml` でも `mcp_servers` ブロックでも、書き換えずにそのまま使えます。それ以外の SecretRef の参照元（`${file:...}`、`${vault:...}`、`${bitwarden:...}`）は、その場では解決**されません**。外部のシークレット用バックエンドは、起動時に `secrets:` ブロックを通じて値を環境変数に注入するので、代わりに `${env:NAME}` の形で参照してください。未知のプレフィックスは1回だけ警告を出し、書いたとおりに残ります。

AI プロバイダーの設定（OpenRouter、Anthropic、Copilot、カスタムエンドポイント、セルフホストの LLM、フォールバックモデルなど）については、[AI プロバイダー](/hermes/docs/integrations/providers/) を参照してください。

### プロバイダーのタイムアウト {#provider-timeouts}

プロバイダー全体のリクエストタイムアウトは `providers.<id>.request_timeout_seconds` で設定でき、モデルごとに上書きするには `providers.<id>.models.<model>.timeout_seconds` を使います。この値は、すべての通信方式（OpenAI 形式、ネイティブの Anthropic、Anthropic 互換）でターンを処理するメインのクライアント、フォールバックチェーン（失敗したときの切り替え先）、認証情報のローテーション後に作り直されるクライアント、そして（OpenAI 形式の場合は）リクエストごとのタイムアウト引数に適用されます。そのため、設定した値は旧来の環境変数 `HERMES_API_TIMEOUT` より優先されます。

非ストリーミングでの停滞した呼び出しの検知には `providers.<id>.stale_timeout_seconds` を設定でき、モデルごとに上書きするには `providers.<id>.models.<model>.stale_timeout_seconds` を使います。こちらは旧来の環境変数 `HERMES_API_CALL_STALE_TIMEOUT` より優先されます。同じキーは、ストリーミングでの停滞ストリームの期限としても使われます。明示的に設定した値はそのまま使われます。コンテキストの大きさに応じた暗黙のティア（50kトークン超で240秒、100k超で300秒）と推論モデル向けの下限は、既定の180秒にだけ適用されます。そのため、明示的な値を設定すると、応答の止まったストリームを待つ時間を短くできます。

これらを設定しなければ、旧来の既定値（`HERMES_API_TIMEOUT=1800` 秒、`HERMES_API_CALL_STALE_TIMEOUT=90` 秒、ネイティブの Anthropic は900秒）のままです。非ストリーミングでの停滞の検知は、暗黙の設定のままならローカルのエンドポイントでは自動で無効になり、コンテキストが非常に大きいときは期限が長く伸びることがあります。AWS Bedrock には現在適用されません（`bedrock_converse` と AnthropicBedrock SDK のどちらの経路も、独自のタイムアウト設定を持つ boto3 を使うためです）。コメント付きの設定例は [`cli-config.yaml.example`](https://github.com/NousResearch/hermes-agent/blob/main/cli-config.yaml.example) を参照してください。

## 更新の挙動 {#update-behavior}

### バックグラウンドでの確認 {#background-checks}

自動で行われる更新確認（CLI のバナー、TUI のバッジ、ダッシュボード、デスクトップアプリ）は、
GitHub REST API に `main` の最新コミットを問い合わせ、手元のチェックアウトと違っていれば、
compare エンドポイントで新しいコミットの正確な数と変更履歴を取得します。`git fetch` は
一度も実行せず（部分クローン（`--filter=blob:none`）では、足りないオブジェクトを promisor リモートから
ダウンロードすることもありません。Git 2.44 以降）、問い合わせはどのインストールでも**24時間に1回まで**です（確認に失敗したときは
1時間後に再試行します）。更新を適用する操作（`hermes update`、またはデスクトップアプリの
Update ボタン）では、必ず最新の状態を取得し直し、キャッシュした結果を破棄します。明示的な
確認（`hermes update --check`、デスクトップアプリの「Check for Updates…」メニュー項目、
Settings → About →「Check now」）はキャッシュを使いません。

### SSH 認証 {#ssh-authentication}

起動時の更新確認は、ネットワーク通信に使うのと同じ、隔離された Git
設定で origin の URL を読み込みます。そのため、グローバルな `url.*.insteadOf` による書き換えがあっても、
公式の SSH リモートを公開 HTTPS の経路から見えなくすることはできません。

Hermes が内部で実行する隔離された Git コマンドは、既定で `ssh -o BatchMode=yes` を使います。
未知のホストキー、パスワード、パスフレーズが必要な暗号化された鍵は、
ターミナルで入力を求める代わりに失敗します。使える鍵か
SSH エージェントがある信頼済みのホストでは、これまでどおり認証できます。この設定は、ディスク上の Git や SSH の
設定も、ターミナルツールで実行するコマンドも変えません。

この内部の既定値は、リポジトリの `core.sshCommand` 設定を上書きします。一方、
明示的に設定した環境変数 `GIT_SSH_COMMAND` はそれよりも優先されるので、
独自の鍵（identity）や接続方式を指定するコマンドはそこに残しておけます。対話なしで動かし続ける必要があるなら、
その上書きに `-o BatchMode=yes` を含めてください。
入力の要求を許す上書きは、バックグラウンドでの確認を中断させることがあります。

`hermes update` の設定は、`config.yaml` の `updates` の下にあります。

```yaml
updates:
  pre_update_backup: quick       # quick (state snapshot, default) | full (snapshot + HERMES_HOME zip) | off
  backup_keep: 5                 # Keep this many full pre-update backup zips
  non_interactive_local_changes: stash  # stash | discard
  auto_switch_parked_branch: true       # auto-switch a clean, fully merged parked branch back to main
```

更新前の安全策を決める設定項目は `pre_update_backup` の1つだけです。`quick`（既定）は、重要な状態ファイル（ペアリング情報、cron ジョブ、設定、認証情報。1 GiB を超えるファイルは対象外）のスナップショットを `state-snapshots/` に保存します。`full` はそれに加えて `HERMES_HOME` 全体を zip にまとめて `backups/` に保存するので、Hermes のホームディレクトリが大きいと数分余計にかかることがあります。`off` はどちらも無効にします。旧来の真偽値も使えます（`true` → `full`、`false` → `off`）。

`config.yaml` 自体のその時点のコピー（`hermes setup` が書き換える前、`hermes migrate` が編集する前、ファイルの読み込みに成功するたび、読み込みに失敗したときに取られます）は `backups/config/config.yaml.<reason>.<timestamp>` に保存されます。同じ内容の繰り返しは保存されず、理由ごとに最新の5つだけが残るので、`config.yaml` の横にコピーがたまり続けることはありません。`config.yaml` が壊れている場合、Hermes は組み込みの既定値ではなく最新の `good` コピーを使って動作し、YAML が直るまで起動のたびに警告を出します。壊れたファイルそのものには一切手を加えません。

git でインストールした場合、Hermes は更新用のブランチをチェックアウトしたり pull したりする前に、変更のある追跡対象ファイルと未追跡ファイルを自動で stash します。ターミナルで対話的に更新するときは、その stash を戻す前に確認を求めます。対話なしの更新（デスクトップアプリやチャットアプリ、ゲートウェイ、`--yes`）では `updates.non_interactive_local_changes` の設定に従います。`stash` は pull が成功したあとにソースへの手元の変更を戻し、`discard` は pull が成功したあとに更新処理が作った stash を捨てます。`discard` は、ソースへの手元の変更を残す想定がない管理下のインストールでだけ使ってください。

その stash の前に、Hermes は npm の install や build で生じた、追跡対象の `package-lock.json` の差分も元に戻します。意図してロックファイルを編集した場合は、更新する前にコミットするか、手動で stash してください。

## ターミナルバックエンドの設定 {#terminal-backend-configuration}

Hermes は7種類のターミナルバックエンドに対応しています。どれを選ぶかで、エージェントのシェルコマンドが実際にどこで実行されるかが決まります。手元のマシン、Docker コンテナ、SSH 経由のリモートサーバー、Modal のクラウドのサンドボックス（直接、または Nous が管理するゲートウェイ経由）、Daytona のワークスペース、Vercel Sandbox、Singularity/Apptainer のコンテナのいずれかです。

```yaml
terminal:
  backend: local    # local | docker | ssh | modal | daytona | vercel_sandbox | singularity
  cwd: "."          # Gateway/cron working directory (CLI always uses launch dir)
  temp_dir: ""      # Session temp root; empty = TMPDIR, else ~/.hermes/cache/terminal
  font_family: ""   # Desktop terminal font; e.g. "MesloLGS NF"
  timeout: 180      # Per-command timeout in seconds
  home_mode: auto   # auto | real | profile — subprocess HOME policy
  env_passthrough: []  # Env var names to forward to sandboxed execution (terminal + execute_code)
  sync_back_max_bytes: 2147483648  # Remote backends: refuse to extract a state archive larger than this (bytes)
  singularity_image: "docker://nikolaik/python-nodejs:python3.11-nodejs20"  # Container image for Singularity backend
  modal_image: "nikolaik/python-nodejs:python3.11-nodejs20"                 # Container image for Modal backend
  daytona_image: "nikolaik/python-nodejs:python3.11-nodejs20"               # Container image for Daytona backend
```

`terminal.temp_dir` は、ローカルバックエンドで Hermes がセッションの一時ファイル
（バックグラウンドプロセスのログ、pid、終了ステータスのファイル、コード実行用の
サンドボックス、ディスクに退避したツールの結果）を置く場所を決めます。空のとき（既定）は、
環境変数で明示された `TMPDIR`/`TMP`/`TEMP` があればそれに従い、なければ
`/tmp` ではなく、実際のストレージ上にある管理用ディレクトリ `~/.hermes/cache/terminal`
を使います。多くのディストリビューション（とくに Arch 系の環境）では `/tmp` <!-- no-tmp: ok — explains why /tmp is avoided -->
が RAM 上の小さな tmpfs で、負荷がかかると Hermes のセッションの一時ファイルで
いっぱいになることがあるためです。この管理用ディレクトリは自動で整理されます。24時間アイドル状態の（内部のどこにも書き込みがない）
一時ファイルは、ゲートウェイの定期処理で1時間ごとに、CLI だけのインストールではプロセスごとに1回
削除されます。セッションの一時ファイルを別の場所に置くには、`temp_dir` に既存の絶対パスを
設定してください。ユーザーが設定したパスが自動で整理されることはありません。

`terminal.temp_dir` とは関係なく、すべての Hermes プロセス（CLI、TUI、ゲートウェイ、Desktop の
バックエンド、cron）と、それが起動するすべての子プロセスでは、起動時に `TMPDIR`、`TMP`、`TEMP` が
**`~/.hermes/cache/scratch`**（プロファイルごと）に向けられます。そのため `tempfile.mkdtemp()`、
`mktemp`、ブラウザーのプロファイル、調査用のスクリプトはどれも、RAM 上のシステムの一時ディレクトリではなく
実際のストレージに書き込まれます。システムプロンプトでは、このディレクトリを作業用の一時
ディレクトリとして示しています。Hermes がこれらを設定するのは、まだ設定されていないときだけです。
ユーザーや OS がエクスポートした `TMPDIR`（macOS の `/var/folders`、Windows の `%TEMP%`）はそのまま残ります。中の項目は、
**24時間アイドル状態**になると、起動時に（1時間に最大1回）削除されます。内部のどこかで
直近1日以内に書き込みがあれば残り、最後の書き込みから1日たつと消えます。
アイドル状態の項目を削除する前に、Hermes は、その項目の中（または、もう存在しない作業用の一時パスの中）を
作業ディレクトリにしたまま動いているプロセス（テスト実行のあとに残されたヘッドレスブラウザーなど）を止め、
そこを指している `git worktree` の登録も取り除きます。`hermes doctor` はこのディレクトリとそのサイズを表示し、
`cache/` の下のほかの場所にある、どの自動削除処理の対象にもなっていない 1 GB 超のディレクトリについて警告します。

`desktop.font_family` は、チャットと、それ以外の Hermes Desktop の画面のフォントを設定します（ターミナルのペインには、前述の専用のキーがあります）。インストール済みのフォントファミリー名を1つ（例: `OpenDyslexic`、`Atkinson Hyperlegible`）か、CSS のフォントスタックを指定します。Hermes はその後ろに現在のテーマのフォントスタックを残すので、CJK の文字や絵文字も引き続き表示できます。空にするとテーマのフォントが使われます。**Settings → Appearance → Chat Font** で変更できます。

`terminal.font_family` は、Hermes Desktop に組み込まれたターミナルのフォントを設定します。手元にインストール済みのフォントファミリー名を1つ（例: `MesloLGS NF`）か、CSS のフォントスタックを指定できます。Hermes は同梱の JetBrains Mono のスタックをフォールバックとして後ろに付け足し、空にすると既定のフォントのままになります。このプロファイル単位の設定は **Settings → Appearance → Terminal Font** でも変更できます。Google Fonts のダウンロードや、システムフォントへのアクセス許可は必要ありません。

Modal、Daytona、Vercel Sandbox のようなクラウドのサンドボックスでは、`container_persistent: true` を設定すると、サンドボックスを作り直してもファイルシステムの状態が残るよう Hermes が試みます。稼働中の同じサンドボックス、PID 空間、バックグラウンドプロセスが、あとでも動き続けていることまでは保証しません。

### バックエンドの概要 {#backend-overview}

| バックエンド | コマンドの実行場所 | 分離 | 向いている用途 |
|---------|-------------------|-----------|----------|
| **local** | 手元のマシンで直接 | なし | 開発、個人利用 |
| **docker** | 使い続ける1つの Docker コンテナ（セッション、`/new`、サブエージェントで共有） | 完全（名前空間、cap-drop） | 安全なサンドボックス化、CI/CD |
| **ssh** | SSH 経由のリモートサーバー | ネットワーク境界 | リモート開発、高性能なハードウェア |
| **modal** | Modal のクラウドのサンドボックス | 完全（クラウドの VM） | 使い捨てのクラウド計算資源、評価（evals） |
| **daytona** | Daytona のワークスペース | 完全（クラウドのコンテナ） | マネージドなクラウド開発環境 |
| **vercel_sandbox** | Vercel Sandbox | 完全（クラウドの microVM） | スナップショットでファイルシステムを保持するクラウド実行 |
| **singularity** | Singularity/Apptainer のコンテナ | 名前空間（--containall） | HPC クラスター、共有マシン |

### ローカルバックエンド {#local-backend}

既定のバックエンドです。コマンドは分離されず、手元のマシンで直接実行されます。特別な準備は必要ありません。

```yaml
terminal:
  backend: local
```

既定では、ローカルで動くツールのサブプロセスは、実際の OS ユーザーの `HOME` をそのまま使います。そのため
`git`、`ssh`、`gh`、`az`、`npm`、Claude Code、Codex などの外部 CLI は、
普段のシェルで使っている認証情報や設定をそのまま見つけられます。それでも Hermes の
状態は `HERMES_HOME` によってプロファイル単位に分かれています。プロファイルが設定、記憶、セッション、
スキルを選ぶ仕組みは `HOME` ではありません。

Hermes は、システム全体の `HOME`、シェルの起動ファイル、
OS のアカウントのホームディレクトリを**変更しません**。この設定が左右するのは、
`terminal`、バックグラウンドのターミナルプロセス、`execute_code`、ACP のヘルパープロセスといったツールを通じて
Hermes が起動するサブプロセスに渡す環境だけです。

#### `terminal.home_mode` {#terminalhomemode}

| モード | ホストへのインストール | コンテナ | トレードオフ |
|---|---|---|---|
| `auto` | 実際の OS ユーザーの `HOME` をそのまま使います | `{HERMES_HOME}/home` を使います | 推奨の既定値。ホストの CLI はそのまま動き、コンテナの状態も残ります。 |
| `real` | 実際の OS ユーザーの `HOME` を必ず使います | 見えていれば、実際の OS ユーザーの `HOME` を必ず使います | 親プロセスが誤って `HOME` をプロファイルのホームに向けたまま起動した場合に役立ちます。 |
| `profile` | 存在すれば `{HERMES_HOME}/home` を使います | 存在すれば `{HERMES_HOME}/home` を使います | CLI の設定をプロファイルごとに厳密に分けられます。ただし、通常の `~/.ssh`、`~/.gitconfig`、`~/.azure`、`~/.config/gh`、Claude や Codex の認証、npm の状態などは、プロファイルのホームの中で初期化するかリンクしない限り見えません。 |

既定の欠点は、ホスト上のプロファイルが、`~` の下にある通常のユーザー単位の
CLI の認証情報や設定を共有してしまうことです。git のユーザー情報、SSH 鍵、GitHub CLI のログイン、
npm の設定、クラウドの CLI のログインを別にしたプロファイルが必要なら、`home_mode: profile` を使い、
そのプロファイルのホームの中で、それらのツールを意図して初期化してください。

ツールの設定をプロファイルごとに厳密に分けたい場合は、あえて次のように設定します。

```yaml
terminal:
  home_mode: profile
```

このモードでは、ツールのサブプロセスは `{HERMES_HOME}/home` を `HOME` として使います。Hermes は
`HERMES_REAL_HOME` も設定するので、スクリプトは必要なときに実際のユーザーのホームディレクトリを見つけられます。
コンテナ系のバックエンドは、`auto` モードでも `{HERMES_HOME}/home` を使い続けます。
このディレクトリは、Hermes のデータを残し続けるボリューム上にあるためです。

プロファイルの状態と実際のユーザーのホームディレクトリを区別する必要があるスクリプトでは、
Hermes のデータには `HERMES_HOME` を、アカウントのホームディレクトリには `HERMES_REAL_HOME` を使うのがおすすめです。

```python
from pathlib import Path

hermes_home = Path(os.environ["HERMES_HOME"])
real_home = Path(os.environ.get("HERMES_REAL_HOME", os.environ["HOME"]))
```

:::warning
エージェントは、ユーザーアカウントと同じファイルシステムへのアクセス権を持ちます。不要なツールは `hermes tools` で無効にするか、サンドボックスで隔離したい場合は Docker に切り替えてください。
:::

### Docker バックエンド {#docker-backend}

セキュリティを強化した Docker コンテナの中でコマンドを実行します（すべての capability を外し、権限昇格を禁止し、PID 数に上限を設けます）。

**1つの永続的なコンテナを、Hermes の各プロセスで共有します。** Hermes は初回の利用時に長時間動き続けるコンテナを1つだけ起動し、ターミナル、ファイル、`execute_code` の呼び出しをすべて `docker exec` でその同じコンテナへ振り分けます。これはセッション、`/new`、`/reset`、`delegate_task` のサブエージェントをまたいでも変わりません。作業ディレクトリの移動、インストールしたパッケージ、`/workspace` 内のファイル、そして**バックグラウンドプロセス**は、あるツール呼び出しから次の呼び出しへ、ある Hermes プロセスから次のプロセスへとすべて引き継がれます。TUI セッションを閉じたときも、`/quit` を実行したときも、新しく `hermes` を起動したときも、コンテナは動き続け、次の Hermes プロセスがラベルによる検索でそのコンテナを見つけて再利用します。破棄される正確な条件は、下の**コンテナのライフサイクル**を参照してください。

**セッションごとの分離モード（`container_persistent: false`）。** Docker バックエンドで `container_persistent: false` を設定すると、**セッションごと**に1つのコンテナを使う方式に切り替わります。チャット（デスクトップアプリのセッション、ゲートウェイの会話、TUI セッション）はそれぞれ専用のまっさらなサンドボックスを持ちます。サンドボックスは最初のターミナル／ファイルの呼び出しで作られ、セッションが閉じたとき、または `lifetime_seconds` を超えてアイドル状態が続いたときに削除されます。セッション間では何も引き継がれません。ファイルシステムの状態も、マウントも、バックグラウンドプロセスも残りません。`docker_mount_cwd_to_workspace: true` の場合、`/workspace` にマウントされるのは**そのセッションに紐付いた**ワークスペースだけです。ディレクトリが紐付いていない新しいセッションは、前のセッションのマウントを引き継がず、空のワークスペースになります。`delegate_task` のサブエージェントは、このモードでも親セッションのコンテナを共有します。会話と会話の間をサンドボックスでセキュリティ上区切りたいときはこのモードを使い、上で説明した長時間動き続ける共有コンテナを使いたいときは既定の `true` のままにしてください。

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

**`docker_env`** と **`docker_forward_env`** の違い: 前者は、設定に書いた `KEY=value` の組をそのまま注入します（値は `config.yaml` に書くか、`TERMINAL_DOCKER_ENV='{"DEBUG":"1"}'` のように JSON オブジェクトとして渡します）。後者はシェルや `~/.hermes/.env` から値を転送するので、実際のシークレットが設定ファイルに書かれることはありません。トークンには `docker_forward_env` を、コンテナが必要とする固定の設定項目には `docker_env` を使ってください。

**`terminal.docker_extra_args`**（`TERMINAL_DOCKER_EXTRA_ARGS='["--gpus=all"]'` でも上書きできます）を使うと、Hermes が専用のキーとして用意していない任意の `docker run` のフラグを渡せます。`--gpus`、`--network`、`--add-host`、`--security-opt` による別の上書きなどです。各項目は文字列にしてください。このリストは組み立てた `docker run` コマンドの最後に追加されるので、必要なら Hermes の既定値を上書きできます。多用は避けてください。サンドボックスの強化設定（capability の削除、`--user`、ワークスペースのバインドマウント）と衝突するフラグを渡すと、何の警告もなく分離が弱まります。

**`terminal.docker_network`**（既定は `true`。環境変数: `TERMINAL_DOCKER_NETWORK`）: `false` にすると、サンドボックスのコンテナを `--network=none` で実行し、エージェントが実行するコマンドから外部へのネットワーク通信をすべて遮断します。対象は、`terminal`、`execute_code`、ファイルツールが使う実行用のコンテナです。コンテナは Hermes のプロセスをまたいで残るため、ネットワークにつながった古いコンテナがある状態でこの値を `false` に切り替えると、そのコンテナは削除され、ネットワークから切り離された新しいコンテナが起動します（警告がログに出ます）。古いコンテナの中で動いていたバックグラウンドプロセスは失われます。`docker_extra_args` で `--network=none` を渡すより、このキーを使ってください。

**必要なもの:** Docker Desktop または Docker Engine がインストールされ、動いていること。Hermes は `$PATH` に加えて、macOS でよく使われるインストール先（`/usr/local/bin/docker`、`/opt/homebrew/bin/docker`、Docker Desktop のアプリバンドル）を探します。Podman も追加の設定なしで使えます。両方がインストールされていて Podman を使わせたいときは、`HERMES_DOCKER_BINARY=podman`（またはフルパス）を設定してください。

#### コンテナのライフサイクル {#container-lifecycle}

Hermes が管理するコンテナにはすべて3つのラベルが付き、あとから起動するプロセス（と孤立コンテナの回収処理）がそのコンテナを識別できるようになっています。

- `hermes-agent=1` — Hermes が管理するコンテナであることを示します
- `hermes-task-id=<sanitized task_id>` — タスクごとの再利用を照合するときのキーになります
- `hermes-profile=<sanitized profile name>` — 既定では、再利用と回収の対象を現在の Hermes プロファイルに限定します。`docker_shared_container_key` を設定した場合は、その値をラベル用に整えたものが代わりに使われます

起動時、Hermes は `docker ps --filter label=hermes-task-id=<id> --filter label=hermes-profile=<identity>` を実行し、既存のコンテナが見つかれば**そのコンテナに接続します**。このコマンドの identity の部分には、`docker_shared_container_key` で信頼できるプロファイルを明示的に共通の値へまとめていない限り、現在のプロファイルが入ります。コンテナが `exited` の状態なら（例: Docker デーモンの再起動後）、`docker start` で起動し直して再利用します。ファイルシステムの状態とインストールしたパッケージは残りますが、コンテナ内のバックグラウンドプロセスは残りません。

Hermes のプロセスが終了しても（`/quit`、TUI セッションを閉じる、ゲートウェイの停止、SIGKILL でさえも）、後片付けの処理は**既定のモードではコンテナに対して何もしません**。コンテナは動き続けます。次の Hermes プロセスは、ラベルの照合によってミリ秒単位でそのコンテナに接続します。これは「セッションをまたいで長時間動き続けるコンテナを1つ共有する」という約束が求める動作です。バックグラウンドプロセス（npm のファイル監視、開発サーバー、長時間かかる pytest）をセッションをまたいで生かし続ける方法は、これしかありません。

**コンテナが破棄される（停止して `docker rm -f` で削除される）のは、次の場合だけです。**

| きっかけ | 発動する条件 |
|---|---|
| `docker_persist_across_processes: false` | プロセスごとに明示的に分離します。`cleanup()` のたびに `stop` と `rm -f` を行います。issue #20561 より前の動作と同じです。 |
| アイドル時の回収処理（`lifetime_seconds`、既定は300秒） | 実行環境が `persist_across_processes=false` のときだけ動きます。永続モードの実行環境では何もしないので、コンテナはアイドル時の掃除でも残ります。 |
| 次回起動時の孤立コンテナの回収処理 | Hermes のラベルが付いた **Exited** 状態のコンテナのうち、`2 × lifetime_seconds`（既定は600秒 = 10分）より古いものを、現在のプロファイルの範囲で削除します。**実行中のコンテナには一切触れません**（同時に動いている別のプロセスを守るためです）。無効にするには `docker_orphan_reaper: false` を設定します。 |
| ユーザーによる直接の操作 | `docker rm -f`、`docker system prune`、Docker Desktop の再起動。Hermes は `--restart=always` を設定しないので、ホストを再起動するとコンテナは `Exited` のままになります（CoW レイヤーは残って次回起動時に再利用されますが、バックグラウンドプロセスは消えます）。 |

知っておきたい例外的なケース:

- **コンテナ内の PID 1 が OOM で強制終了される**と、コンテナは `Exited` になります。次に再利用するときは `docker start` で起動し直します。ファイルシステムの状態は残りますが、バックグラウンドプロセスは残りません。
- **プロファイルを切り替える**と、コンテナは互いに分離されます。`hermes-profile=work` のラベルが付いたコンテナは、`hermes-profile=research` で動く Hermes プロセスからは見えません。孤立コンテナの回収処理もプロファイル単位なので、別のプロファイルのコンテナが誤って回収されることはありません。ただし、元のプロファイルで Hermes をもう一度起動するまでは、自動で後片付けされることもありません。
- **プロファイルをまたいだ明示的な共有** — 1つの信頼できるワークスペースで意図して協働させるプロファイルには、`terminal:` の下に同じ空でない `docker_shared_container_key` を設定します。これで置き換わるのはコンテナの識別ラベルだけで、タスク、外向きの通信、ネットワークの互換性のチェックは引き続き行われます。このキーを持たないプロファイルは分離されたままです。識別ラベルはキーに短いダイジェストの接尾辞を付けて作られるので、見た目の似たキー（`team/workspace` と `team_workspace`）が1つのコンテナにまとまってしまうことはありません。**重要: 共有コンテナは、最初に起動したプロファイルによって一度だけ作られます**。そのプロファイルの `docker_image`、ボリューム、shm のサイズなど、あとから変えられない Docker の設定が使われ、あとから来たプロファイルはそのままの状態のコンテナに接続します。それらのプロファイルの設定が違っていても、コンテナを削除して作り直すまでは無視されます。キーを共有するプロファイル同士では、イメージとマウントをそろえてください。

`delegate_task(tasks=[...])` で並列に起動したサブエージェントは、この1つのコンテナを共有します。そのため、同時に行う `cd`、環境変数の変更、同じパスへの書き込みはぶつかります。サブエージェントに分離したサンドボックスが必要なら、`register_task_env_overrides()` でタスクごとのイメージの上書きを登録する必要があります。RL やベンチマークの環境（TerminalBench2、HermesSweEnv など）は、タスクごとの Docker イメージに対してこれを自動で行います。

**セキュリティの強化:**
- `--cap-drop ALL` ですべての capability を外し、`DAC_OVERRIDE`、`CHOWN`、`FOWNER` だけを戻します
- `--security-opt no-new-privileges`
- `--pids-limit 256`
- サイズに上限のある tmpfs: `/tmp`（512MB）、`/var/tmp`（256MB）、`/run`（64MB） <!-- no-tmp: ok — documents the sandbox's own tmpfs -->

**認証情報の受け渡し:** `docker_forward_env` に並べた環境変数は、まずシェルの環境から、次に `~/.hermes/.env` から値を探します。スキルも `required_environment_variables` を宣言でき、それらも自動で転送対象に加わります。

#### 環境変数による上書き {#environment-variable-overrides}

`terminal:` の下のキーはすべて、`TERMINAL_<KEY_UPPERCASE>` という形の環境変数で上書きできます。Docker バックエンドでとくに役立つものは次のとおりです。

| 環境変数 | 対応するキー | 補足 |
|---|---|---|
| `TERMINAL_DOCKER_IMAGE` | `docker_image` | ベースイメージ |
| `TERMINAL_DOCKER_FORWARD_ENV` | `docker_forward_env` | JSON 配列: `'["GITHUB_TOKEN","OPENAI_API_KEY"]'` |
| `TERMINAL_DOCKER_ENV` | `docker_env` | JSON オブジェクト: `'{"DEBUG":"1"}'` |
| `TERMINAL_DOCKER_VOLUMES` | `docker_volumes` | `"host:container[:ro]"` 形式の文字列の JSON 配列 |
| `TERMINAL_DOCKER_EXTRA_ARGS` | `docker_extra_args` | JSON 配列 |
| `TERMINAL_DOCKER_MOUNT_CWD_TO_WORKSPACE` | `docker_mount_cwd_to_workspace` | `true` / `false` |
| `TERMINAL_DOCKER_RUN_AS_HOST_USER` | `docker_run_as_host_user` | `true` / `false` |
| `TERMINAL_DOCKER_SNAP_COMPAT` | `docker_snap_compat` | `true` / `false`（既定は `false`） |
| `TERMINAL_DOCKER_NETWORK` | `docker_network` | `true` / `false`（既定は `true`）。`false` で `--network=none` になります |
| `TERMINAL_DOCKER_PERSIST_ACROSS_PROCESSES` | `docker_persist_across_processes` | `true` / `false`（既定は `true`） |
| `TERMINAL_DOCKER_SHARED_CONTAINER_KEY` | `docker_shared_container_key` | 信頼できるプロファイル用の明示的な共有識別子。既定は空 |
| `TERMINAL_DOCKER_ORPHAN_REAPER` | `docker_orphan_reaper` | `true` / `false`（既定は `true`） |
| `TERMINAL_CONTAINER_CPU` | `container_cpu` | CPU のコア数 |
| `TERMINAL_CONTAINER_MEMORY` | `container_memory` | MB |
| `TERMINAL_CONTAINER_DISK` | `container_disk` | MB |
| `TERMINAL_CONTAINER_PERSISTENT` | `container_persistent` | `true` / `false`。バインドマウントするワークスペースのディレクトリを制御します（`docker_persist_across_processes` とは別の設定です） |
| `TERMINAL_LIFETIME_SECONDS` | `lifetime_seconds` | アイドル時の回収処理までの時間 |
| `TERMINAL_TEMP_DIR` | `temp_dir` | セッションの一時ファイルを置くルート（ローカルバックエンド） |
| `TERMINAL_TIMEOUT` | `timeout` | コマンドごとのタイムアウト |
| `HERMES_DOCKER_BINARY` | _なし_ | 使う docker / podman のバイナリのパスを指定します |

### SSH バックエンド {#ssh-backend}

SSH でつないだリモートサーバー上でコマンドを実行します。接続の再利用には ControlMaster を使います（アイドル時のキープアライブは5分）。永続シェルは既定で有効で、状態（作業ディレクトリ、環境変数）がコマンドをまたいで残ります。

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

| 変数 | 既定値 | 説明 |
|----------|---------|-------------|
| `TERMINAL_SSH_PORT` | `22` | SSH のポート |
| `TERMINAL_SSH_KEY` | （システムの既定） | SSH の秘密鍵のパス |
| `TERMINAL_SSH_PERSISTENT` | `true` | 永続シェルを有効にする |

**仕組み:** 初期化の時点で、`BatchMode=yes` と `StrictHostKeyChecking=accept-new` を付けて接続します。永続シェルは、リモートホスト上で `bash -l` のプロセスを1つ動かし続け、一時ファイルを介してやり取りします。`stdin_data` や `sudo` が必要なコマンドは、自動的に単発モードに切り替わります。

**スキルや設定からの環境変数の受け渡し:** スキルが `required_environment_variables` で宣言した変数や、`terminal.env_passthrough` に並べた変数は、OpenSSH の `SendEnv` で転送されます。変数名は `ssh` のコマンドラインに載り、値はクライアントの環境変数として運ばれるので、リモートで実行するコマンドの文字列に値が含まれることはありません。リモートの `sshd` がこれらを受け入れる設定になっている必要があります。サーバーの `/etc/ssh/sshd_config` に次の行を追加し、sshd を再読み込みしてください。

```
AcceptEnv NEXTCLOUD_URL NEXTCLOUD_*      # or the names your skills need
```

対応する `AcceptEnv` がないと、サーバーは何も知らせずに変数を捨て、リモートのシェルからは未設定に見えます。Hermes のプロバイダーの認証情報（`OPENAI_API_KEY` など）は、リストに入れても転送されません。詳しくは [環境変数の受け渡し](/hermes/docs/user-guide/security/#environment-variable-passthrough) を参照してください。

### Modal バックエンド {#modal-backend}

[Modal](https://modal.com) のクラウドのサンドボックスでコマンドを実行します。タスクごとに分離された VM が割り当てられ、CPU、メモリ、ディスクを設定できます。ファイルシステムはスナップショットに保存して、セッションをまたいで復元できます。

```yaml
terminal:
  backend: modal
  container_cpu: 1                 # CPU cores
  container_memory: 5120           # MB (5GB)
  container_disk: 51200            # MB (50GB)
  container_persistent: true       # Snapshot/restore filesystem
```

**必須:** 環境変数 `MODAL_TOKEN_ID` と `MODAL_TOKEN_SECRET` の組、または `~/.modal.toml` 設定ファイルのどちらかが必要です。

**永続化:** 有効にすると、後片付けのときにサンドボックスのファイルシステムのスナップショットを取り、次のセッションで復元します。スナップショットは `~/.hermes/modal_snapshots.json` で管理されます。保存されるのはファイルシステムの状態で、動作中のプロセス、PID 空間、バックグラウンドのジョブは保存されません。

**認証情報のファイル:** `~/.hermes/` から自動でマウントされ（OAuth トークンなど）、コマンドを実行するたびにその前に同期されます。

### Daytona バックエンド {#daytona-backend}

[Daytona](https://daytona.io) が管理するワークスペースでコマンドを実行します。永続化のために、停止と再開に対応しています。

```yaml
terminal:
  backend: daytona
  container_cpu: 1                 # CPU cores
  container_memory: 5120           # MB → converted to GiB
  container_disk: 10240            # MB → converted to GiB (max 10 GiB)
  container_persistent: true       # Stop/resume instead of delete
```

**必須:** 環境変数 `DAYTONA_API_KEY` が必要です。

**永続化:** 有効にすると、後片付けのときにサンドボックスを削除せずに停止し、次のセッションで再開します。サンドボックス名は `hermes-{task_id}` の形式になります。

**ディスクの上限:** Daytona のディスクは最大10 GiB です。これを超える指定は、警告を出したうえで上限に切り詰められます。

### Vercel Sandbox バックエンド {#vercel-sandbox-backend}

[Vercel Sandbox](https://vercel.com/docs/vercel-sandbox) のクラウドの microVM でコマンドを実行します。Hermes は通常のターミナルツールとファイルツールをそのまま使います。モデルから使う Vercel 専用のツールはありません。

```yaml
terminal:
  backend: vercel_sandbox
  vercel_runtime: node24          # node24 | node22 | python3.13
  cwd: /vercel/sandbox            # default workspace root
  container_persistent: true      # Snapshot/restore filesystem
  container_disk: 51200           # Shared default only; custom disk is unsupported
```

**必要なインストール:** 追加の SDK（extra）をインストールします。

```bash
pip install 'hermes-agent[vercel]'
```

**必要な認証:** アクセストークンによる認証を、`VERCEL_TOKEN`、`VERCEL_PROJECT_ID`、`VERCEL_TEAM_ID` の3つすべてを使って設定します。デプロイや、Render、Railway、Docker などのホストで長時間動かす通常の Hermes プロセスでサポートされているのは、この構成です。

ローカルで一時的に開発するだけなら、有効期限の短い Vercel の OIDC トークンも使えます。

```bash
VERCEL_OIDC_TOKEN="$(vc project token <project-name>)" hermes chat
```

Vercel プロジェクトにリンク済みのディレクトリからなら、プロジェクト名を省略できます。

```bash
VERCEL_OIDC_TOKEN="$(vc project token)" hermes chat
```

OIDC トークンは有効期限が短いため、正式なデプロイ方法としては使わないでください。

**ランタイム:** `terminal.vercel_runtime` は `node24`、`node22`、`python3.13` に対応しています。未設定の場合、Hermes は既定で `node24` を使います。

**永続化:** `container_persistent: true` のとき、Hermes は後片付けの際にサンドボックスのファイルシステムのスナップショットを取り、同じタスクであとから作るサンドボックスをそのスナップショットから復元します。スナップショットには、Hermes が同期してサンドボックスにコピーした認証情報、スキル、キャッシュファイルが含まれることがあります。保存されるのはファイルシステムの状態だけで、動作中のサンドボックスそのもの、PID 空間、シェルの状態、実行中のバックグラウンドプロセスは保存されません。

**バックグラウンドのコマンド:** `terminal(background=true)` は、Hermes の汎用的な、ローカル以外のバックエンド向けのバックグラウンドプロセスの仕組みを使います。サンドボックスが動いている間は、通常の process ツールでプロセスの起動、状態の確認、待機、ログの表示、終了ができます。後片付けや再起動のあとで、Vercel の切り離されたプロセスをネイティブに復旧する機能は Hermes にはありません。

**ディスクのサイズ:** Vercel Sandbox は現在、Hermes の `container_disk` というリソースの設定項目に対応していません。`container_disk` は未設定にするか、共有の既定値 `51200` のままにしてください。既定以外の値を指定すると、黙って無視されるのではなく、診断とバックエンドの作成が失敗します。

### Singularity/Apptainer バックエンド {#singularityapptainer-backend}

[Singularity/Apptainer](https://apptainer.org) のコンテナでコマンドを実行します。Docker を使えない HPC クラスターや共有マシン向けに作られています。

```yaml
terminal:
  backend: singularity
  singularity_image: "docker://nikolaik/python-nodejs:python3.11-nodejs20"
  container_cpu: 1                 # CPU cores
  container_memory: 5120           # MB
  container_persistent: true       # Writable overlay persists across sessions
```

**必要なもの:** `$PATH` に `apptainer` または `singularity` のバイナリがあること。

**イメージの扱い:** Docker の URL（`docker://...`）は自動で SIF ファイルに変換され、キャッシュされます。既存の `.sif` ファイルはそのまま使われます。

**作業用の一時ディレクトリ:** 次の順で決まります: `TERMINAL_SCRATCH_DIR` → `TERMINAL_SANDBOX_DIR/singularity` → `/scratch/$USER/hermes-agent`（HPC の慣例）→ `~/.hermes/sandboxes/singularity`。

**分離:** `--containall --no-home` を使い、ホストのホームディレクトリをマウントせずに名前空間を完全に分離します。

### ターミナルバックエンドのよくある問題 {#common-terminal-backend-issues}

ターミナルのコマンドがすぐに失敗する場合や、ターミナルツールが無効と表示される場合は、次を確認してください。

- **Local** — 特別な要件はありません。使い始めるときに最も安全な既定の選択肢です。
- **Docker** — `docker version` を実行して、Docker が動いているか確かめます。失敗する場合は Docker を直すか、`hermes config set terminal.backend local` で切り替えます。
- **SSH** — `TERMINAL_SSH_HOST` と `TERMINAL_SSH_USER` の両方を設定する必要があります。どちらかが欠けていると、Hermes はわかりやすいエラーをログに出します。
- **Modal** — 環境変数 `MODAL_TOKEN_ID` か `~/.modal.toml` が必要です。確認するには `hermes doctor` を実行します。
- **Daytona** — `DAYTONA_API_KEY` が必要です。サーバー URL の設定は Daytona SDK が行います。
- **Singularity** — `$PATH` に `apptainer` か `singularity` が必要です。HPC クラスターではよく入っています。

迷ったときは、`terminal.backend` を `local` に戻し、まずそこでコマンドが動くことを確かめてください。

### 破棄時のリモートからホストへの状態の書き戻し {#remote-to-host-state-sync-on-teardown}

**SSH**、**Modal**、**Daytona** の各バックエンドでは、Hermes はセッション中に `~/.hermes/` の状態（認証情報のファイル、スキル、キャッシュ）をリモートのサンドボックスへ送り込み、破棄するときに**変更された状態ファイルをホストの元の場所へ書き戻します**。最初に送ったものと内容が違うファイル（内容のハッシュで比較します）は、元の場所にそのまま反映されます。同期対象のディレクトリの下にリモートで新しく作られたファイル（例: エージェントがリモートで作ったスキル）は、対応するホストのパスに書き戻されます。アップロード専用の認証情報のファイルが、ホスト側で上書きされることはありません。

- 書き戻しは、バックオフを挟みながら最大3回まで再試行します。2 GiB を超えるリモートのアーカイブは展開しません。状態のツリーがそれより大きい場合は、`config.yaml` で `terminal.sync_back_max_bytes`（バイト単位）を設定して上限を引き上げてください。リモートの `~/.hermes/` の下にある使用中のソケット（例: `gateway.sock`）は、転送を失敗させずにスキップします。
- ダウンロードしたアーカイブは、システムの一時ディレクトリの下（`hermes-sync-back-<pid>-*`）にいったん置かれます。強制終了されたプロセスが残したものは、次の書き戻しのときに回収されます。
- Docker と Singularity はバインドマウント（ホストのファイルシステムをそのまま見せる方式）を使うので、この仕組みは必要ありません。
- 対象になるのは Hermes の状態（`~/.hermes/`）で、サンドボックス内の任意の作業ファイルは**対象外**です。大事な成果物は、サンドボックスが破棄される前にエージェントに明示的に外へコピーさせてください（例: `scp`、`modal volume put`）。

### Docker のボリュームマウント {#docker-volume-mounts}

Docker バックエンドを使うときは、`docker_volumes` でホストのディレクトリをコンテナと共有できます。各項目は Docker 標準の `-v` の書式 `host_path:container_path[:options]` で書きます。

```yaml
terminal:
  backend: docker
  docker_volumes:
    - "/home/user/projects:/workspace/projects"   # Read-write (default)
    - "/home/user/datasets:/data:ro"              # Read-only
    - "/home/user/.hermes/cache/documents:/output" # Gateway-visible exports
```

次のような用途に便利です。
- エージェントに**ファイルを渡す**（データセット、設定ファイル、参考にするコード）
- エージェントから**ファイルを受け取る**（生成されたコード、レポート、書き出したファイル）
- ユーザーとエージェントが同じファイルを扱う**共有のワークスペース**

メッセージングゲートウェイを使っていて、生成したファイルをエージェントに
`MEDIA:/...` で送らせたい場合は、ホストからも見える書き出し専用のマウント
（例: `/home/user/.hermes/cache/documents:/output`）を用意するのがおすすめです。

- Docker の中ではファイルを `/output/...` に書き込みます
- `MEDIA:` には**ホストのパス**を書きます。例:
  `MEDIA:/home/user/.hermes/cache/documents/report.txt`
- ホスト上のゲートウェイのプロセスからもまったく同じパスが見える場合を除き、
  `/workspace/...` や `/output/...` は書き**ません**

:::warning
YAML ではキーが重複すると、あとに書いたキーが前のキーを何の警告もなく上書きします。すでに
`docker_volumes:` のブロックがあるなら、ファイルの後ろのほうにもう1つ
`docker_volumes:` キーを足すのではなく、新しいマウントを同じリストにまとめてください。
:::

環境変数でも設定できます: `TERMINAL_DOCKER_VOLUMES='["/host:/container"]'`（JSON 配列）。

### Docker の認証情報の受け渡し {#docker-credential-forwarding}

既定では、Docker のターミナルセッションがホストの認証情報を無差別に引き継ぐことはありません。コンテナ内で特定のトークンが必要な場合は、`terminal.docker_forward_env` に追加してください。

```yaml
terminal:
  backend: docker
  docker_forward_env:
    - "GITHUB_TOKEN"
    - "NPM_TOKEN"
```

Hermes は、並べた変数をそれぞれまず現在のシェルから探します。見つからない場合は、`hermes config set` で保存してあれば `~/.hermes/.env` の値を使います。

:::warning
`docker_forward_env` に並べたものは、コンテナ内で実行されるコマンドから見えるようになります。ターミナルセッションに見せてもかまわない認証情報だけを渡してください。
:::

### ホストのユーザーでのコンテナ実行 {#running-the-container-as-your-host-user}

既定では、Docker コンテナは `root`（UID 0）として動きます。`/workspace` やほかのバインドマウント内で作られたファイルはホスト上で root の所有になるため、セッションのあとホストのエディターで編集するには、先に `sudo chown` で所有者を変えなければなりません。`terminal.docker_run_as_host_user` フラグでこれを解消できます。

```yaml
terminal:
  backend: docker
  docker_run_as_host_user: true   # default: false
```

有効にすると、Hermes は `docker run` コマンドに `--user $(id -u):$(id -g)` を付け足します。これで、バインドマウントしたディレクトリ（`/workspace`、`/root`、`docker_volumes` に書いたもの）に書き込まれるファイルは、root ではなくホストのユーザーの所有になります。引き換えに、コンテナ内では `apt install` も、`/root/.npm` のような root 所有のパスへの書き込みもできなくなります。両方が必要なら、`HOME` を root 以外のユーザーが所有しているベースイメージを使ってください（または、必要なツールをイメージのビルド時に入れておいてください）。

従来どおりの動作にしたい場合は `false`（既定値）のままにしておきます。作業の大半が「マウントしたホストのファイルを編集する」ことで、`sudo chown -R` にうんざりしているなら有効にしてください。

### snap パッケージの Docker（AppArmor） {#snap-packaged-docker-apparmor}

Docker を snap でインストールしたホスト（Ubuntu のクラウドイメージによくある構成です。例: Azure の VM）では、snap の AppArmor による閉じ込めがサンドボックスの強化フラグのうち2つを拒否し、コンテナが起動時に落ちます。

```
exec /sbin/docker-init: operation not permitted     # --init
exec /usr/bin/sleep: operation not permitted        # --security-opt no-new-privileges
```

これは snapd 側の制約（[LP#1908448](https://bugs.launchpad.net/snapd/+bug/1908448)）で、Hermes が検出して回避できるものではありません。snap ではなく Docker が提供する apt リポジトリから Docker をインストールする（推奨。強化はすべて有効なままです）か、次の設定を明示的に有効にしてください。

```yaml
terminal:
  docker_snap_compat: true   # drops --init and no-new-privileges; cap-drop, tmpfs, PID limits stay
```

有効にすると、サンドボックス内のゾンビプロセスは init に回収されなくなり、コンテナ内の setuid バイナリが権限を取り戻せるようになります。コンテナの起動時には警告がログに記録されます。

### 任意: 起動ディレクトリの `/workspace` へのマウント {#optional-mount-the-launch-directory-into-workspace}

Docker のサンドボックスは、既定では隔離されたままです。明示的に有効にしない限り、Hermes はホストの現在の作業ディレクトリをコンテナに渡し**ません**。

`config.yaml` で有効にします。

```yaml
terminal:
  backend: docker
  docker_mount_cwd_to_workspace: true
```

有効にした場合:
- `~/projects/my-app` から Hermes を起動すると、そのホストのディレクトリが `/workspace` にバインドマウントされます
- Docker バックエンドは `/workspace` を開始位置にして動きます
- ファイルツールとターミナルコマンドの両方が、同じマウント済みのプロジェクトを参照します

無効の場合、`docker_volumes` で明示的に何かをマウントしない限り、`/workspace` はサンドボックス専用の場所のままです。

セキュリティ上のトレードオフ:
- `false` はサンドボックスの境界を保ちます
- `true` にすると、Hermes を起動したディレクトリにサンドボックスが直接アクセスできます

この設定を有効にするのは、ホスト上の実際のファイルをコンテナに意図して操作させたいときだけにしてください。

`terminal.cwd` に入っているホストのパス（たとえば Windows の `C:\Users\me\project` や、デスクトップアプリや TUI のセッションのワークスペース）が、コンテナの作業ディレクトリになることはありません。そのパスが `/workspace` にマウントされたディレクトリであれば、ファイルツールとターミナルコマンドは `/workspace` を使います。そうでなければ、コンテナは自分の作業ディレクトリを使い続けます。それでもファイルツールが作業ディレクトリに入れない場合、エラーにはシェルが出す生の `cd:` 行ではなく、使用中のバックエンドにとって無効な `terminal.cwd` が示されます。

### 永続シェル {#persistent-shell}

既定では、ターミナルコマンドは1つずつ別のサブプロセスで実行されます。そのため作業ディレクトリ、環境変数、シェル変数はコマンドごとにリセットされます。**永続シェル**を有効にすると、長く動き続ける bash プロセスを1つ、`execute()` の呼び出しをまたいで生かしておくので、状態がコマンド間で引き継がれます。

いちばん役立つのは **SSH バックエンド**で、コマンドごとの接続のオーバーヘッドもなくなります。永続シェルは **SSH では既定で有効**で、ローカルバックエンドでは無効です。

```yaml
terminal:
  persistent_shell: true   # default — enables persistent shell for SSH
```

無効にするには、次のコマンドを実行します。

```bash
hermes config set terminal.persistent_shell false
```

**コマンドをまたいで保たれるもの:**
- 作業ディレクトリ（`cd ~/project` の結果が次のコマンドにも残ります）
- export した環境変数（`export FOO=bar`）
- シェル変数（`MY_VAR=hello`）

**優先順位:**

| レベル | 変数 | 既定値 |
|-------|----------|---------|
| 設定 | `terminal.persistent_shell` | `true` |
| SSH での上書き | `TERMINAL_SSH_PERSISTENT` | 設定に従う |
| ローカルでの上書き | `TERMINAL_LOCAL_PERSISTENT` | `false` |

バックエンドごとの環境変数が最も優先されます。ローカルバックエンドでも永続シェルを使いたい場合は、次のように設定します。

```bash
export TERMINAL_LOCAL_PERSISTENT=true
```

:::note
`stdin_data` や sudo を必要とするコマンドは、自動的に単発モードに切り替わります。永続シェルの stdin は、すでに IPC プロトコルが使っているためです。
:::

各バックエンドについて詳しくは、[コードの実行](/hermes/docs/user-guide/features/code-execution/) と [README のターミナルの節](/hermes/docs/user-guide/features/tools/) を参照してください。

## スキルの設定 {#skill-settings}

スキルは、SKILL.md のフロントマターで独自の設定項目を宣言できます。これらはシークレットではない値（パス、好みの設定、分野ごとの設定）で、`config.yaml` の `skills.config` 名前空間の下に保存されます。

```yaml
skills:
  config:
    myplugin:
      path: ~/myplugin-data   # Example — each skill defines its own keys
```

**スキルの設定の仕組み:**

- `hermes config migrate` は有効なスキルをすべて走査して未設定の項目を見つけ、その場で値を入力するかどうかを尋ねます
- `hermes config show` は、すべてのスキル設定を「Skill Settings」の下に、どのスキルのものかと一緒に表示します
- スキルが読み込まれると、解決済みの設定値が自動的にスキルのコンテキストに注入されます

**値を手動で設定する場合:**

```bash
hermes config set skills.config.myplugin.path ~/myplugin-data
```

自作のスキルで設定項目を宣言する方法について詳しくは、[スキルを作る — 設定項目](/hermes/docs/developer-guide/creating-skills/#config-settings-configyaml) を参照してください。

### 毎セッションでのスキルの自動読み込み {#auto-loading-skills-every-session}

スキルを固定しておくと、どの画面でも、新しいセッションを開始するたびにそのスキルの全体が読み込まれます。

```yaml
skills:
  auto_load:
    - my-workflow
    - github-pr-workflow
```

このリストは、セッションごとにシステムプロンプトを最初に組み立てるときに1回だけ解決されます（そのためプロンプトはキャッシュが効いたままになり、編集は次のセッションから反映されます）。見つからないスキルや無効にしたスキルは、警告を出して飛ばします。`--ignore-rules` / `HERMES_IGNORE_RULES=1` を指定すると、このリストは使われません。設定はプロファイル単位です。[CLI 画面 — 設定でいつも自動読み込みする](/hermes/docs/user-guide/cli/#persistent-auto-load-via-config) を参照してください。

### エージェントによるスキル書き込みの検査 {#guard-on-agent-created-skill-writes}

エージェントが `skill_manage` でスキルを作成、編集、パッチ適用、削除するとき、Hermes は必要に応じて、新しい内容や更新後の内容に危険なキーワードのパターン（認証情報の収集、明らかなプロンプトインジェクション、外部への持ち出しの指示）がないかを走査できます。このスキャナーは**既定で無効**です。正当な理由で `~/.ssh/` に触れたり `$OPENAI_API_KEY` に言及したりする実際のエージェントの作業が、この経験則による判定にあまりに頻繁に引っかかっていたためです。エージェントのスキル書き込みが反映される前にスキャナーから確認を求められるようにしたい場合は、再び有効にしてください。

```yaml
skills:
  guard_agent_created: true   # default: false
```

有効にすると、スキャナーに引っかかった `skill_manage` の書き込みは、スキャナーの判断理由を添えた承認の確認として表示されます。承認した書き込みは反映され、拒否した書き込みはエージェントに理由を説明するエラーを返します。

### スキル書き込みの承認 {#write-approval-for-skill-writes}

上の内容スキャナーとは別に、`skills.write_approval` を使うと、エージェントによるスキルの書き込み（作成／編集／パッチ適用／削除／付属ファイル）の**すべて**に明示的な承認を必須にできます。危険なコマンドと同じ、承認・拒否の仕組みです。

```yaml
skills:
  write_approval: false   # false = write freely (default) | true = stage every write for review
```

有効にすると、スキルの書き込みは `~/.hermes/pending/skills/` の下で保留になり、`/skills pending`、`/skills diff <id>`、`/skills approve <id>`、`/skills reject <id>` で確認します。CLI からでも、どのメッセージングプラットフォームからでも操作できます。実行中に `/skills approval on|off` で切り替えられます。記憶にも同じ関門があります（後述の `memory.write_approval`）。詳しい手順: [エージェントのスキルの書き込みに関門を置く](/hermes/docs/user-guide/features/skills/#gating-agent-skill-writes-skillswrite_approval)

## 記憶の設定 {#memory-configuration}

```yaml
memory:
  memory_enabled: true
  user_profile_enabled: true
  memory_char_limit: 2200   # ~800 tokens
  user_char_limit: 1375     # ~500 tokens
  write_approval: false     # true = require approval before any memory write
```

`memory.write_approval: true` にすると、記憶への書き込みは反映される前に承認が必要になります。対話中の CLI のターンでは、その場で確認を求めます。メッセージングのセッションと、バックグラウンドで動く自己改善のレビューでは、書き込みを保留にして `/memory pending` → `/memory approve <id>` / `/memory reject <id>` での確認を待ちます。実行中に `/memory approval on|off` で切り替えられます。[記憶への書き込みを制御する](/hermes/docs/user-guide/features/memory/#controlling-memory-writes-write_approval) を参照してください。

## コンテキストファイルの切り詰め {#context-file-truncation}

自動で読み込むコンテキストファイルごとに、先頭と末尾を残す切り詰めをかける前に Hermes が読み込む量を決めます。対象は `SOUL.md`、`.hermes.md`、`AGENTS.md`、`CLAUDE.md`、`.cursorrules` など、システムプロンプトに注入されるファイルです。`read_file` ツールには影響**しません**。

```yaml
context_file_max_chars: null  # default — dynamic cap scaled to the model's context window (floor 20K, ceiling 500K chars)
```

動的な上限ではなく固定の上限にしたい場合は、正の整数を指定します。

```yaml
context_file_max_chars: 25000
```

各コンテキストファイルの読み込みには、`context_file_read_timeout`（単位は秒、既定は `5.0`）による時間の上限もあります。これより読み込みに時間がかかるファイル（よくあるのは iCloud Drive、OneDrive、NFS のようなネットワーク上のファイルシステムにある場合）は警告を出して飛ばされ、システムプロンプトの残りはそのまま読み込まれます。

```yaml
context_file_read_timeout: 5.0
```

## ファイル読み込みの安全策 {#file-read-safety}

1回の `read_file` 呼び出しで返せる量を決めます。上限を超える読み込みはエラーで拒否され、そのエラーで `offset` と `limit` を使って範囲を狭めるようエージェントに伝えます。これにより、minify された JS バンドルや大きなデータファイルを1回読んだだけでコンテキストウィンドウがあふれるのを防ぎます。

```yaml
file_read_max_chars: 100000  # default — ~25-35K tokens
```

コンテキストウィンドウの大きいモデルを使っていて、大きなファイルをよく読むなら上げてください。コンテキストの小さいモデルでは、読み込みを効率よく保つために下げてください。

```yaml
# Large context model (200K+)
file_read_max_chars: 200000

# Small local model (16K context)
file_read_max_chars: 30000
```

エージェントは、ファイルの重複した読み込みも自動で省きます。ファイルの同じ範囲を2回読み、その間にファイルが変わっていなければ、内容を送り直す代わりに軽い代替の応答（スタブ）を返します。この記録はコンテキスト圧縮のときにリセットされるので、内容が要約されて消えたあとでも、エージェントはファイルを読み直せます。

## ツールの出力の切り詰め上限 {#tool-output-truncation-limits}

Hermes が切り詰める前にツールが返せる生の出力の量は、互いに関連する3つの上限で決まります。

```yaml
tool_output:
  max_bytes: 50000        # terminal output cap (chars)
  max_lines: 2000         # read_file pagination cap
  max_line_length: 2000   # per-line cap in read_file's line-numbered view
```

- **`max_bytes`** — `terminal` コマンドの stdout と stderr を合わせた出力がこの文字数を超えると、Hermes は先頭の40%と末尾の60%を残し、その間に `[OUTPUT TRUNCATED]` という通知を挟みます。既定値は `50000` です（一般的なトークナイザーで約12-15Kトークン）。
- **`max_lines`** — 1回の `read_file` 呼び出しで指定できる `limit` パラメーターの上限です。これを超える指定はこの値まで切り下げられるので、1回の読み込みでコンテキストウィンドウがあふれることはありません。既定値は `2000` です。
- **`max_line_length`** — `read_file` が行番号付きの表示を出すときに、1行ごとにかかる上限です。これより長い行はこの文字数で切り詰められ、後ろに `... [truncated]` が付きます。既定値は `2000` です。

コンテキストウィンドウが大きく、1回の呼び出しでより多くの生の出力を受け止められるモデルでは、上限を上げてください。コンテキストの小さいモデルでは、ツールの結果を小さく保つために下げてください。

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

### ツールの結果の退避上限 {#tool-result-spillover-budget}

切り詰めとは別に、大きすぎるツールの*結果*は、切り捨てずにディスクに退避されます。出力の全体は `$HERMES_HOME/cache/spillover/` の下に保存され、コンテキスト内の内容はプレビューと保存先ファイルのパスに置き換わります（そのファイルは `offset`/`limit` を指定した `read_file` で読めるほか、`execute_code` で処理することもできます）。結果1件あたりの汎用の退避のしきい値は100,000文字で、コンテキストの小さいモデルでは自動的に引き下げられます。

MCP ツールの結果（`mcp_*` という名前のツール）は、より厳しい既定値の **50,000文字** で退避されます。MCP サーバーは、ページ分割されていない大きなペイロード（ツール探索用のカタログ、まとめて実行した結果）を日常的に返します。この既定値がなければ、これらは汎用のしきい値を下回ったままコンテキストに残り、以降のターンのたびにコンテキストを膨らませてしまうためです。何も失われることはなく、結果の全体はディスクに保存されています。しきい値は次の設定で上書きできます。

```yaml
tool_budget:
  mcp_result_size_chars: 50000   # per-result spillover threshold for mcp_* tools
```

MCP のしきい値は、常に汎用の結果1件あたりのしきい値（コンテキストに合わせて引き下げられている場合があります）を上限とします。そのため値を上げても、使用中のモデルのウィンドウが許す量を超えることはありません。

Hermes は**プロバイダー側での省略**も知らせます。MCP や Web ツールの結果に、提供元自身による切り詰めの目印（`...N more items`、`"has_more": true`、「saved to sandbox」という注記）が含まれている場合、結果に1行の通知を付け足します。通知では、見えているデータが不完全なので、一覧を完全なものとして扱う前に、ページ送りや再取得で続きを取るべきだと警告します。

## ツールセットの一括無効化 {#global-toolset-disable}

CLI とゲートウェイのすべてのプラットフォームで特定のツールセットを1か所の設定で
止めるには、`agent.disabled_toolsets` の下にその名前を並べます。

```yaml
agent:
  disabled_toolsets:
    - memory       # hide memory tools + MEMORY_GUIDANCE injection
    - web          # no web_search / web_extract anywhere
```

この設定は、プラットフォームごとのツール設定（`hermes tools` が書き込む
`platform_toolsets`）の**あと**に適用されます。そのため、ここに並べたツールセットは、
あるプラットフォームの保存済みの設定にまだ載っていても、必ず取り除かれます。
`hermes tools` の UI で15以上のプラットフォームの行を編集する代わりに、
「X をどこでも無効にする」ためのスイッチを1つで済ませたいときに使ってください。

リストを空にするか、このキー自体を書かなければ、何も起きません。

## Git ワークツリーによる分離 {#git-worktree-isolation}

同じリポジトリで複数のエージェントを並行して動かすために、分離された git ワークツリーを有効にできます。

```yaml
worktree: true    # Always create a worktree (same as hermes -w)
# worktree: false # Default — only when -w flag is passed
```

有効にすると、CLI のセッションごとに、専用のブランチを持つ新しいワークツリーが `.worktrees/` の下に作られます。エージェントは互いに干渉せずに、ファイルの編集、コミット、push、PR の作成ができます。変更の残っていないワークツリーは終了時に削除され、変更が残っているものは手動で回収できるよう残されます。

既定では、新しいワークツリーは**直前に fetch したリモートの先端**（現在のブランチの upstream、なければリモートの既定ブランチ）から分岐します。そのため、古くなっているかもしれないローカルクローンの `HEAD` からではなく、プロジェクトの最新の状態から作業を始められます。これにより、PR の差分が実際の変更だけに収まり、ローカルクローンが遅れていた分まで引き継ぐことがありません。代わりにローカルの `HEAD` から分岐させたい場合は `worktree_sync: false` を設定します。オフラインのときや、クローンの現在の状態そのものを意図して起点にしたいときに便利です。リモートに接続できない場合は、自動的にローカルの `HEAD` に切り替えます。

```yaml
worktree_sync: true    # Default — branch from the fetched remote tip
# worktree_sync: false # Branch from local HEAD (offline / pinned base)
```

リポジトリのルートに `.worktreeinclude` を置くと、gitignore の対象になっているファイルのうち、ワークツリーにコピーしたいものを指定することもできます。

```
# .worktreeinclude
.env
.venv/
node_modules/
```

## コンテキスト圧縮 {#context-compression}

Hermes は、長い会話をモデルのコンテキストウィンドウに収めるため、自動で圧縮します。圧縮に使う要約モデルは別の LLM 呼び出しとして動くので、任意のプロバイダーやエンドポイントを指定できます。

圧縮の設定はすべて `config.yaml` にあります（環境変数はありません）。

### 全項目一覧 {#full-reference}

```yaml
compression:
  enabled: true                                     # Toggle compression on/off
  progress_notices: false                           # Opt-in: deliver routine compression progress notices to chat platforms — see below
  threshold: 0.50                                   # Compress at this % of context limit
  threshold_tokens: 256000                          # Absolute token cap — takes lower of ratio vs absolute
  target_ratio: 0.20                                # Fraction of threshold to preserve as recent tail
  tail_mode: lean                                   # Tail retention: "lean" (default — clamped 2.5% tail, 10K-25K, never above 20% of the window, with a detailed session log + anchor index + session_search recovery pointers in the summary, all from ONE auxiliary summarizer call; ~3x fewer retained tokens after compaction) or "legacy" (0.20×threshold verbatim tail)
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

:::info 旧来の設定の移行
`compression.summary_model`、`compression.summary_provider`、`compression.summary_base_url` を含む古い設定は、初回の読み込み時（設定バージョン17）に `auxiliary.compression.*` へ自動で移行されます。手作業は必要ありません。
:::

`progress_notices`（既定は `false`）は、**通常の**圧縮の進行状況をチャットプラットフォーム（Telegram、Discord、Slack など）に届けるかどうかを決めます。自動の圧縮は、チャットの画面には何も表示しない設計です。バックグラウンドで動き、記録はサーバー側のログにだけ残ります。チャットプラットフォームでも通常の進行の流れを見たい場合は、`progress_notices: true` にして明示的に有効にします。表示されるのは、開始を知らせる「Compacting context…」、送信前チェック（preflight）や API 呼び出しの直前に発動する圧縮、アイドル時の圧縮、再試行の進み具合（「Compressed 30 → 12 messages, retrying…」）、完了を知らせる「Context compaction complete」です。この切り替えの対象は圧縮の状況表示だけです。圧縮と関係のない運用上の通知（補助モデルの失敗、プロバイダーのレート制限や再試行に関するやり取り）は、どちらの設定でも表示されません。圧縮の**失敗**の通知と、手動の `/compress` への応答は、この設定に関係なく常に表示されます。稼働中のゲートウェイでこの値を変えると、次のメッセージから反映されます。

`hygiene_hard_message_limit` は、ゲートウェイだけで使う**圧縮前の安全弁**です。抜け出せない悪循環を断ち切るためにあります。大きくなりすぎたセッションで API 呼び出しの切断が続くと、ゲートウェイはトークン使用量のデータを受け取れません。そのためトークン数に基づくしきい値が発動せず、会話の記録は増え続け、切断はさらに悪化します。このメッセージ数による下限は、メッセージ数だけを見て発動します（メッセージ数は API が失敗していても常に分かります）。これで圧縮を強制し、セッションを立て直します。既定値は `5000` です。コンテキストの大きい（1M+）モデルで何千回も短いターンを重ねるセッションも含め、通常のセッションよりはるかに大きい値です。そうしたセッションは、この値に届くずっと前にトークンのしきい値で圧縮されます。特殊なプラットフォームではさらに上げ、より積極的に圧縮させたいときは下げてください。稼働中のゲートウェイでこの値を変えると、次のメッセージから反映されます（下記参照）。

同じ上限は、ターンの開始時点までに事前圧縮（hygiene）が終わっていないときに、**モデルに送る内容の上限**としても働きます。失敗時は止める（fail closed）考え方で、上限を超える分はモデルに送りません。事前圧縮が終わっていないのは、ターンの保留上限が切れた、要約がタイムアウトまたは失敗した、失敗後のクールダウン中である、別の圧縮がまだ進行中である、圧縮が無効になっている、といった場合です。そのときゲートウェイは、先頭にあるシステムやセットアップの行と最新のメッセージを、合計で最大 `hygiene_hard_message_limit` 件まで残します。残した末尾部分が、呼び出し元のない孤立したツールの結果から始まることはありません。削られるのは、そのターン1回分の送信内容だけです。ディスク上の会話の記録には手を付けず、何も削除しません。あとから届いた要約は、そのまま採用されます。この仕組みがあるので、圧縮が何度も間に合わなくても、1週間続いた DM の履歴全体が圧縮されないままモデルに送られることはありません。

`hygiene_timeout_seconds` は、エージェントを動かす前に行うこの圧縮に対する、ゲートウェイの**無応答の許容時間**です。合計の経過時間の上限ではありません。圧縮の要約はモデルからストリーミングで受け取り、トークンが1つ届くたびに処理が進んでいるとみなします。まだ生成を続けている遅い推論モデルは、そのたびに自分の期限を延ばすので、遅くても正常に動いている要約モデルが生成の途中で打ち切られることはありません。要約モデルがこの秒数のあいだ**何も出力しなかった**とき（バックエンドの停止、接続のハング、プロバイダーの無応答）だけ、ゲートウェイは止まったように見せる代わりに、ユーザーへ警告し、届いたメッセージを圧縮せずに処理し、セッションごとの一時的な失敗クールダウンを記録します。

`hygiene_total_ceiling_seconds`（既定は `600`）は、トークンがまだ届き続けていても、待ち時間の合計を制限します。そのため、ごく少しずつしか流れてこない異常なストリームが、ターンをいつまでも足止めすることはありません。この値は `hygiene_timeout_seconds` を下回らないよう調整されます。

`hygiene_max_turn_hold_seconds`（既定は `10`）は、ゲートウェイの**ターンの保留上限**です。届いたメッセージを事前圧縮の完了待ちで保留しておける最大の経過時間で、これを過ぎるとゲートウェイは待つのをやめ、圧縮前の会話の記録のまま処理を進めます。この設定があるのは、`hygiene_total_ceiling_seconds` だけでは、チャットのトランスポート（通信の仕組み）のアイドルタイムアウトよりはるかに長いあいだ、接続に何も流れない状態が続きうるからです。トークンを流し続ける要約モデルは無応答の計測区間をリセットし続けるので、ターンの保留上限がないと、ユーザーには1バイトも届かないまま、待ち時間が上限近くまで延びることがあります。すると Telegram（や同様のトランスポート）は接続を切り、ターンが固まったように見えます。ターンの待ち時間をこの上限（一般的なトランスポートのアイドルタイムアウトである約30秒より十分短い値）で打ち切るので、メッセージには必ずすばやく応答が返ります。**上限が切れても圧縮は失われません**。ワーカーは切り離されたまま動き続けます。そのコミットがウォーターマークで保護（フェンス）されている場合（セッション DB があれば通常はそうです）は、コミットの受け付けも維持されます。そのため、完成した要約は次の安全な区切りで採用され、待つのをやめたあとに追加されたターンは、並行して積み上がった末尾部分としてそのまま残ります。これがとくに効くのは、推論の段階だけで上限を超えることのある**思考・推論型の要約モデル**（DeepSeek、QwQ など）です。こうしたモデルの要約は、届かないままになるのではなく、1ターン遅れて届きます。コミットを安全に保護できない場合、遅れて届いた結果は破棄され（`CompressionCommitFence`）、それより新しいターンを上書きすることはありません。同じターンのうちに圧縮を反映させたく、使っているトランスポートがその待ち時間に耐えられるなら上限を上げてください。とても遅いバックエンドでもすばやく立ち直らせたいなら下げてください。

`hygiene_failure_cooldown_seconds` は、事前圧縮がタイムアウトまたは中断したあとの、このセッションごとのクールダウンを決めます。クールダウン中、ゲートウェイは大きくなりすぎた同じセッションに対して、事前圧縮を繰り返し試みません。これで、メッセージが届くたびに同じ壊れた補助バックエンドで足止めされることを防ぎます。それでも、`/compress`、`/reset`、またはあとで正常に終わったターンによって、セッションを立て直せます。

この値は固定の間隔ではなく、段階的に長くなるはしごの**最初の段**です。同じセッションで失敗が続くと、待ち時間はこの値の `1x`、`3x`、`9x` と延び、上限は1時間です。そのため、要約モデルが壊れたままのセッションは、決まった間隔で延々と再試行するのではなく、間隔を広げていきます。実際に会話の記録を縮められた実行があれば、最初の段に戻ります。段階の引き上げはセッションごとで、そのプロセスの中だけで管理されます。そのため、ゲートウェイを再起動すると最初の段に戻りますが、クールダウンの期限そのものは引き継がれます。

`context_timeout_seconds`（既定は `120`）は、エージェント内で行う `compress_context`（会話ループ中の圧縮、送信前チェックでの圧縮、手動の `/compress`）に対する、同じ種類の**無応答の許容時間**です。これにより、ハングした要約モデルがセッションをいつまでも止めることはありません。要約のトークンがストリーミングで届けば待ち時間は延び、打ち切られるのは何も返さないワーカーだけです。この許容時間は、補助タスクとしての圧縮リクエスト自体のタイムアウト（`auxiliary.compression.timeout`、最小300秒）を下回りません。そのため、リクエスト自体があきらめるより先に、ホストが無応答の要約モデルを見限ることはありません。最初のトークンを出す前に考え込む推論型の要約モデルや、ストリーミングできない経路にも、プロバイダー呼び出しと同じ時間が与えられます。タイムアウトすると、Hermes は `auxiliary.compression.fallback_chain` の最初のエントリーで要約を1回だけ再試行します（そのエントリーが独自の `timeout` を指定していれば、それを使います）。止まった経路は例外を出さないので、補助クライアント自身のフォールバック（失敗したときの切り替え先）処理ではこれを検知できないためです。その再試行も失敗した場合や、フォールバックチェーンを設定していない場合に何が起きるかは、リクエストがまだモデルのコンテキストウィンドウに収まるかどうかで決まります。収まるリクエストは、そのターンでは圧縮せずに送ります（要約失敗のクールダウンがあるので、再試行が毎ターン繰り返されることはありません）。ウィンドウを超えるリクエストはそもそも送れないので、Hermes はターンを終わらせる代わりに、決まった手順で作るフォールバックの要約（古いツールの結果を刈り込み、要約するはずだった中間部分を定型の引き継ぎ文に置き換えたもの）をコミットします。「compression timed out」という復旧用の結果でターンを終える（メッセージングゲートウェイではセッションも自動でリセットされる）のは最後の手段で、この決まった手順でも会話の記録を縮められないときにだけ行います。`0` にすると無効になります。ウィンドウを超えたままのリクエストに対して、送信前チェックでの圧縮が何も削れなかった場合は、モデルが受け付けられないリクエストを送る代わりに、新しいセッション（`/new`）を始めるよう案内して、すぐにターンを終えます。ゲートウェイでのセッションの事前圧縮は、独自の `hygiene_timeout_seconds` の経路を使い続け、二重に制限がかかることはありません。

`context_total_ceiling_seconds`（既定は `600`）は、トークンがまだ届き続けていても、エージェント内の**コミット前**の待ち時間（要約とストリーミングの段階）を制限します。この値は `context_timeout_seconds` を下回らないよう調整されます。すでにモデルのコンテキストウィンドウを超えているリクエストでは、コミット前の待ち時間はこの上限ではなく、`context_timeout_seconds` 1回分で打ち切られます。そうしたリクエストはどのみち圧縮せずには送れません。そのうえ、何も削れないままストリーミングを続ける要約があると、毎ターン、上限いっぱいまでセッション（と Desktop の UI）が止まってしまいます。この場合は、決まった手順で作るフォールバックの要約が圧縮を引き受けます。要約モデルにどうしても長い時間が必要なら、`context_timeout_seconds` を上げてください。厳密な保証は次のとおりです。**要約の段階はこの上限で打ち切られ、コミットの段階がこの上限を超えた場合はログに残して知らせます。** ワーカーが圧縮のコミットの保護区間（フェンス）に入り、SessionDB への書き込みが始まったあとは、コミットを途中で放棄することはありません。放棄すると会話の記録が食い違うおそれがあるからです。ただし、黙って待ち続けることはしません。コミットが上限を超えて続くと、Hermes は超過をログに記録し（WARNING。繰り返すと ERROR に引き上げ）、ユーザーに見える警告チャンネルで1回だけの警告を送り、コミットが終わるまで区切った時間ずつ待ち続けます。要約の段階で上限が切れると、要約モデルのストリームは、どの補助の送信形式（chat.completions、Codex Responses、Anthropic Messages）でもその瞬間に閉じられます。誰も待っていない接続で、放棄した要約が最後まで課金されることはなく、そのセッションのリース（占有権）は次の試行のために解放されます。

`protect_first_n` は、先頭にある**システム以外の**メッセージのうち、何件をすべての圧縮で固定して残すかを決めます。既定値は `3` です。最初のユーザーとアシスタントのやり取りがどの要約でも残るので、もともとの目的が見えたままになります。圧縮を何度も繰り返しながら長く続くセッションで、最初のターンがもう関係ない場合は、`protect_first_n: 0` にしてください。固定されるのは、システムプロンプト、要約、末尾部分だけになります。システムプロンプト自体は、この設定に関係なく常に残ります。

`in_place`（既定は `true`）は、圧縮が発動したときにセッションの識別をどう扱うかを決めます。`true` のとき、圧縮はメッセージの一覧を書き換え、**セッション ID を切り替えずに**システムプロンプトを作り直します。会話は最初から最後まで1つの ID を持ち続けます（`parent_session_id` の連鎖はなく、セッション一覧で `name #2` / `#3` と番号が振り直されることもありません）。圧縮で何かが消えるわけではありません。使用中のコンテキストは圧縮されますが、圧縮前のターンは同じ ID のままアーカイブ扱いになります（非アクティブ／圧縮済みの印が付きます）。削除はされず、`session_search` で検索でき、元に戻すこともできます。フックは、`session:compress` イベントの `in_place` フィールドでこのモードを確認できます。圧縮のたびに、古い ID にひも付いた新しいセッション ID へ切り替える旧来の動作に戻すには、`in_place: false` にしてください。

`threshold_tokens` は、圧縮が発動するトークン数に**絶対値の上限**を設けます。圧縮は、比率で決まる `threshold` と、この絶対値のうち低いほうで発動します。そのため、コンテキストウィンドウの大きいモデルで、知らないうちに圧縮が数十万トークンまで先送りされることはありません。既定値は `256000` です。1M のモデルでは既定の50%で発動する位置が256Kに抑えられ、比率で決まる位置がそれより低ければそちらが優先されます（ウィンドウが 272K の Codex もこの場合に当たります）。この上限はモデルの切り替えやフォールバックの発動後も維持され、モデルのコンテキスト長を超えないよう調整されます。比率だけで決める動作に戻すには `null` にします。作業の内容に合わせて、別の正の値を選んでもかまいません。

`idle_compact_after_seconds` は、サイズで決まる `threshold` を補う、**明示的に有効にしたときだけ働く、時間ベースの**発動条件です。既定値は `0`（無効）です。0より大きくすると、その秒数以上やり取りがなかったあとに再開したセッションは、最初の返信の前に、それまでにたまった履歴をまとめて圧縮します。そのため、長く続くスレッド（たとえば数時間後に戻ってきた Telegram の会話）で、古くなったコンテキスト全体を以降のターンのたびに読み直すことがなくなります。コンテキストがすでに圧縮後の目標（`threshold × target_ratio`）以下であれば発動しません。また、ほかの自動圧縮と同じく、失敗後のクールダウン、短い間隔での繰り返しの防止、セッションごとのロックという保護にも従います。例: `idle_compact_after_seconds: 1800` にすると、30分アイドルが続いたあとに圧縮します。

`proactive_prune_tokens` は、古いツールの結果の中身を刈り込む処理を有効にします。この処理は `threshold` とは独立して動き、LLM を使わず、毎回同じ規則で行われます。コンテキストウィンドウの大きいモデルでは、`threshold` による圧縮（ウィンドウの約50%）はめったに発動しません。そのため、かさばるツールの出力（ターミナルに出た大量の出力、読み込んだファイル、Web から抜き出した内容）が履歴に残ったまま、以降のターンのたびに送り直されます。送り直す履歴が `proactive_prune_tokens`（既定は `0` = 無効。有効にするなら `48000` から試してください）を超えると、この処理は同一の結果を1つにまとめ、古くて大きすぎる結果を要約し、大きなツール呼び出しの引数を切り詰めます。直近の `protect_last_n` 件のメッセージには手を付けず、モデルも呼び出しません。ただし、この保護は絶対ではありません。どの圧縮でも、保護された末尾部分だけで、末尾部分に割り当てたトークンの上限の1.5倍を超えている場合は、*圧迫*時の処理が走り、保護された末尾部分の**内側**でもツールの結果を簡略化し、ツール呼び出しの引数を切り詰めます（この処理は `proactive_prune_tokens` の設定に左右されません）。どちらの処理も、モデルが読み直す履歴の写しを書き換えるだけです。ツール呼び出しは、プロバイダーから届いたその場の応答をもとに実行され、履歴から実行されることはありません。そのため、すでに実行に回った呼び出しの引数が、どちらの処理でも変わることはありません。完全な出力はセッションの保存領域から取り出せます。`proactive_prune_min_result_chars`（既定は `8000`。200以上に制限）は、これより小さいツールの結果には手を付けない、というサイズを決めます。`proactive_prune_min_reclaim_tokens`（既定は `4096`）は、少なくともこのトークン数を削れない限り、刈り込みを確定させないための設定です。刈り込みを確定させると、送信済みの履歴が書き換わり、プロバイダーのプロンプトキャッシュの先頭部分（プレフィックス）が無効になります。この条件があるので、キャッシュが途切れるのはツールを使うたびではなく、ときどき起きるまとまった1回（圧縮の区切りのような、意味のある1回）に抑えられます。この処理は組み込みの `compressor` エンジンでだけ動きます。ほかのコンテキストエンジンでは何もしません。

:::tip ゲートウェイでの圧縮設定とコンテキスト長のホットリロード
最近のリリースでは、稼働中のゲートウェイで `config.yaml` の `model.context_length` や `compression.*` のキーを変えると、次のメッセージから反映されます。ゲートウェイの再起動も、`/reset` も、セッションの切り替えも要りません。キャッシュ済みのエージェントを見分ける署名にこれらのキーが含まれているので、ゲートウェイは変更を見つけると、利用者が意識しないうちにエージェントを作り直します。API キーやツール／スキルの設定は、これまでどおりの再読み込みの手順が必要です。
:::

### よくある構成 {#common-setups}

**既定（自動検出）— 設定不要:**
```yaml
compression:
  enabled: true
  threshold: 0.50
```
メインのプロバイダーとメインモデルを使います。メインのチャットモデルより安いモデルで圧縮したい場合は、タスクごとに上書きしてください（例: `auxiliary.compression.provider: openrouter` + `model: google/gemini-2.5-flash`）。

**特定のプロバイダーを指定する場合**（OAuth または API キーによる認証）:
```yaml
auxiliary:
  compression:
    provider: nous
    model: gemini-3-flash
```
`nous`、`openrouter`、`codex`、`anthropic`、`main` など、どのプロバイダーでも使えます。

**カスタムエンドポイント**（セルフホスト、Ollama、zai、DeepSeek など）:
```yaml
auxiliary:
  compression:
    model: glm-4.7
    base_url: https://api.z.ai/api/coding/paas/v4
```
OpenAI 互換のカスタムエンドポイントを指定します。認証には `OPENAI_API_KEY` を使います。

### 3つの設定項目の関係 {#how-the-three-knobs-interact}

| `auxiliary.compression.provider` | `auxiliary.compression.base_url` | 結果 |
|---------------------|---------------------|--------|
| `auto`（既定） | 未設定 | 利用できる最適なプロバイダーを自動で検出 |
| `nous` / `openrouter` など | 未設定 | そのプロバイダーを強制し、その認証を使う |
| 任意 | 設定あり | カスタムエンドポイントを直接使う（プロバイダーは無視） |

### ストリームの進行タイムアウト（Responses 系の経路） {#stream-progress-timeout-responses-routes}

要約を Responses のストリームで受け取る場合（`openai-codex` プロバイダーや、補助クライアントが Responses API を通して扱う経路）は、2つのタイムアウトが互いに独立してかかります。

- `auxiliary.compression.timeout` — リクエスト全体にかけられる時間の上限（既定は120秒）。
- `auxiliary.compression.no_progress_timeout` — **中身のある**イベント（テキストや推論の差分、または完了した出力項目）が届かない状態を、ストリームでどこまで許すかの時間です。これを超えると、その試行は `Codex auxiliary Responses stream stalled: no new output for Ns` で中断されます。未設定のときの既定値は**60秒**です。キープアライブやライフサイクルのフレーム（`response.in_progress`、ping）は進みとして数えません。中身のあるイベントが届くたびに計測はやり直されるので、遅くても進んでいる要約がこれで打ち切られることはありません。

`timeout` を上げるだけでは、進みを待つ時間は広がり**ません**。600秒に設定したリクエストでも、60秒間なにも届かなければ中断されます。この間隔を変えるには `no_progress_timeout` を設定してください。実際に使われる時間は `timeout` を超えず、ホスト側の強制期限やキャンセルがあればそちらが優先されます。ここで一番外側の上限になるのは、ホスト自身の無応答の許容時間です。エージェント内の圧縮は `compression.context_timeout_seconds`（既定は120秒。実際に使われる `auxiliary.compression.timeout` を下回らず、その値自体も最低300秒）が過ぎると無応答の要約モデルを見限り、ゲートウェイの事前圧縮は `compression.hygiene_timeout_seconds`（既定は30秒）が過ぎると見限ります。そのため、該当するホスト側の許容時間より大きい `no_progress_timeout` は、知らせもなくその時間で打ち切られます。このキーはタスクごとの設定（`auxiliary.<task>.no_progress_timeout`）なので、圧縮用に広げても、ほかの補助タスクには影響しません。正の数でない値はログに警告を出して無視され、既定の60秒が使われます。

```yaml
auxiliary:
  compression:
    provider: openai-codex
    timeout: 600
    no_progress_timeout: 180   # tolerate a 3-minute silent gap on a long reasoning summary
```

:::warning 要約モデルのコンテキスト長の要件
要約モデルのコンテキストウィンドウは、メインのエージェントが使うモデルと同じか、それ以上の大きさで**なければなりません**。圧縮の処理は、会話の中間部分をまるごと要約モデルに送ります。要約モデルのコンテキストウィンドウがメインモデルより小さいと、要約の呼び出しはコンテキスト長のエラーで失敗します。そうなると、中間のターンは**要約されないまま捨てられ**、会話の文脈が知らないうちに失われます。モデルを上書きする場合は、そのコンテキスト長がメインモデル以上であることを確かめてください。
:::

## ゲートウェイのターンリースのタイムアウト {#gateway-turn-lease-timeout}

ゲートウェイは、解決したセッション ID ごとにターンを1つずつ順番に処理します。
そのため、2つの振り分けキーが同じ会話の記録を同時に読み込んだり書き込んだりすることはありません。
リースを待つ最大時間は、通常のエージェントの無応答タイムアウトとは別に設定します。

```yaml
agent:
  gateway_turn_lease_timeout: 5
```

この上限が切れた時点でも別のターンがセッションのリースを持っている場合、Hermes は
失敗時は止める動作を取ります。待っているメッセージのために会話の記録を読み込むことも、
モデルを動かすこともしません。ユーザーには拒否の通知が届くので、送り直す必要があります。
Hermes はこのメッセージを自動で待ち行列に戻しません。順序と冪等性（何度実行しても結果が
同じになること）を確実に保証できないまま戻すと、同じメッセージを2回処理するおそれがあるからです。
0以下の値を指定した場合は、既定の5秒が使われます。

## セッション停滞の監視 {#session-stall-watchdog}

ゲートウェイは、通知だけを行う停滞の監視役を動かしています（`agent.session_stall_timeout`、既定は `300` 秒、`0` = 無効）。処理中のセッションに**まだ処理されていない追加のメッセージ**が届いていて、エージェント共通の活動の時計が少なくともこの時間止まっている場合、ゲートウェイは WARNING をログに出し、ユーザーに1回だけの通知を送ります。

```
⚠️ Agent session appears stalled (last activity N min ago). Try /new to reset.
```

動作の要点:

- **通知のみ。** 監視役がターンを強制終了することはありません。長く無応答が続くと実行を取り消す `agent.gateway_timeout` とは、ここが違います。停滞の通知は、エージェントが動けなくなっているようだと伝えるだけで、どうするか（`/new`、`/stop`、または待ち続ける）はユーザーが決めます。
- **停滞1回につき通知は1回。** 未処理のメッセージがなくなるか活動が再開すると、通知済みの印は解除されます。そのため、いったん回復してから再び停滞したセッションでは、もう一度通知されます。
- 進んでいるかどうかは、共通の活動状況の記録（ツール呼び出し、API のストリームの進み、圧縮のハートビート）だけで判断します。未処理のメッセージは通知を出すための条件であって、進みを測る時計ではありません。

```yaml
agent:
  session_stall_timeout: 300   # seconds; 0 disables the watchdog
```

## 再接続の要対応エスカレーション {#reconnect-attention-escalation}

プラットフォームアダプターが接続に失敗すると（ネットワークの障害、無効にされたボットトークン、壊れたサイドカー）、ゲートウェイは上限付きの指数バックオフで、いつまでも再試行を続けます。再試行が止まることはないので、一時的な障害なら運用者が何もしなくても必ず自然に復旧します。その反面、*恒久的な*失敗（無効にされた Telegram のトークン、Discord の privileged intents の不足）も、一瞬の不調と見分けがつかず、「retrying」のまま延々と続いて見えます。

恒久的な失敗を見えるようにする仕組みが2つあります。

- **回復不能な失敗の分類。** 例外の*種類*から、自然に復旧することがありえないと分かる失敗は、再試行の待ち行列に入れず、致命的（fatal）として扱います。拒否された、または無効にされたトークン（`telegram_auth_error`、`discord_auth_error`、`email_auth_error`）、privileged intents の不足（`discord_intents_required`）、依存パッケージをインストールできない Photon のサイドカー（`SIDECAR_DEPS_MISSING`）や、node のバイナリが見つからない Photon のサイドカー（`SIDECAR_NODE_MISSING`）がこれに当たります。分類は例外の種類だけで厳密に行い、判断のつかないエラーは常に再試行を続けます。
- **要対応への引き上げ。** `agent.reconnect_attention_after`（既定は `7200` 秒 = 2時間、`0` で無効）を過ぎても再試行の待ち行列に残り続けているプラットフォームには、ゲートウェイの稼働状況（`hermes status`）で `needs_attention: true` と `retrying_since` のタイムスタンプが付き、WARNING のログも出ます。再試行はそれまでどおり続きます。これは知らせるための印であって、サーキットブレーカーではありません。再接続に成功すると、この印は消えます。

```yaml
agent:
  reconnect_attention_after: 7200   # seconds; 0 disables the escalation flag
```

## ゲートウェイのエージェントキャッシュ {#gateway-agent-cache}

ゲートウェイはセッションごとに1つのエージェントを保持しています。これにより、会話はターンのたびにシステムプロンプトを作り直すのではなく、キャッシュ済みのプロンプトの先頭部分（プレフィックス）を使い回せます。このキャッシュされたエージェントは、セッションの会話の記録もすべて保持しています。ツールの出力も含むので、ツール呼び出しが100回あるセッションでは数十メガバイトになります。そのため、複数のプラットフォームをつないだ忙しいゲートウェイでは、プロセスの中でメモリを最も多く使うのがこのキャッシュです。

```yaml
agent:
  agent_cache:
    max_size: 128            # LRU entry cap
    idle_ttl_secs: 3600      # evict an agent idle this long
    memory_high_mb: auto     # anon-RSS budget; number, "auto", or 0/off
    max_evictions_per_pass: 16
    protect_recent: 8
```

`max_size` と `idle_ttl_secs` は、キャッシュを件数と時間で制限します。どちらもキャッシュが何バイトを抱えているかは分からないので、`memory_high_mb` が3つ目の制限を加えます。匿名メモリが上限を超えると、最も長く使われていない会話の記録から手放します。手放した記録は、次のターンで保存済みのセッションから読み込み直されます。ゲートウェイがほかのサービスとメモリを取り合っているなら下げてください。すべてのプレフィックスをすぐ使える状態で残しておきたいなら上げてください（`0` にするとこの処理自体を止められます）。

`auto` は、ゲートウェイが実際に動いている環境のメモリ上限から、この上限を決めます。コンテナや systemd の unit なら cgroup の上限、それ以外なら RAM の総量です。そのため、unit に `MemoryMax`/`MemoryHigh` を設定していれば、別の数値を合わせて管理しなくてもそれが守られます。こうした上限があるときは、計測の範囲も同じようにそろえます。計測するのは cgroup 自体に計上された匿名メモリ（`memory.stat` の `anon`）で、`execute_code` のカーネルやターミナルコマンドのように、unit の上限に数えられる子プロセスも含みます。上限がない場合は、ゲートウェイ自身の匿名 RSS を計測します。

ターンの途中にあるセッション、最近使われた `protect_recent` 件のセッション、会話の記録のディスクへの書き込みが終わっていないセッションは、決して手放しません。手放したときは、計測した RSS と外したセッションを添えて、WARNING としてログに出します。

```
Agent cache pressure: anon RSS 6802MB over budget 6656MB — evicting 5 LRU session(s): ...
```

## コンテキストエンジン {#context-engine}

コンテキストエンジンは、モデルのトークン数の上限に近づいたときに会話をどう扱うかを決めます。組み込みの `compressor` エンジンは、情報の一部が失われる要約を使います（[コンテキスト圧縮](/hermes/docs/developer-guide/context-compression-and-caching/) を参照）。プラグインのエンジンを使えば、別の方式に置き換えられます。

```yaml
context:
  engine: "compressor"    # default — built-in lossy summarization
```

プラグインのエンジン（例: 情報を失わずにコンテキストを管理する LCM）を使うには、次のように設定します。

```yaml
context:
  engine: "lcm"          # must match the plugin's name
```

プラグインのエンジンが**自動で有効になることはありません**。`context.engine` にプラグイン名を明示的に設定する必要があります。使えるエンジンは、`hermes plugins` → Provider Plugins → Context Engine から一覧を見て選べます。

記憶プラグインにも、1つだけを選ぶ同様の仕組みがあります。詳しくは [記憶プロバイダー](/hermes/docs/user-guide/features/memory-providers/) を参照してください。

## 反復回数の上限 {#iteration-budget}

エージェントがツール呼び出しの多い複雑なタスクに取り組んでいると、反復回数の上限（既定値: 500ターン）を使い切ることがあります。Hermes は、作業の途中で上限が迫っていると警告することは**しません**。以前のビルドでは上限の70%/90%でモデルに警告していましたが、そのせいでモデルが複雑なタスクを早々に投げ出してしまったため、2026年4月に廃止されました。

代わりに、上限を実際に使い切ったとき（500/500）、Hermes はまとめに入るよう求めるメッセージを1つ差し込み、最終的な回答を返せるように**猶予の呼び出し**を1回だけ認めます。その猶予の呼び出しでもテキストが出てこなければ、エージェントに、達成できたことを要約するよう求めます。

```yaml
agent:
  max_turns: none              # Iterations per conversation turn (default: none = unlimited)
                               # Set a positive integer to cap; "none"/"null"/
                               # "unlimited"/"inf"/"infinity"/"infinite"/0/-1 = no limit
  budget_warning_ratio: null   # Optional one-time checkpoint warning, e.g. 0.75
  api_max_retries: 3           # Retries per provider before fallback engages (default: 3)
  auto_recovery_cycles: 5      # Wait-and-retry cycles after retries + fallback are spent on an outage (0 = off)
```

`agent.max_turns` は**既定で無制限**です。回数の上限は、解決する問題より多くの問題（作業の途中で知らせもなく打ち切られる）を起こしていたので、Hermes は初期状態では会話のターンを最後まで実行します。上限を設けるには正の整数を設定してください。「無制限」であることを明示したいときは、次のどの書き方でも使えます（大文字と小文字は区別しません）: `"none"`、`"null"`、`"unlimited"`、`"infinite"`、`"infinity"`、`"inf"`、`0`、`-1`（これらは `sys.maxsize` という目印の値に変換されるので、ループが回数を理由に終わることはありません）。

`agent.budget_warning_ratio` は、通常の会話でも委任された会話でも、既定では無効です。有限の `max_turns` と一緒に、`0` より大きく `1` より小さい値を設定すると、Hermes はそのしきい値に達したあと、モデルから見えるチェックポイントの通知を1つ、最新のツールの結果に追記します。この通知は会話のターンごとに改めて有効になり、各エージェントがそれぞれ持つ反復回数の上限を基準にします。追記先は現在のツールの結果の末尾だけで、それより前のターンには追記しません。ユーザーやシステムのメッセージを新たに作って足すこともなく、上限に達したときの既存の猶予の呼び出しも変えません。ディスパッチャーが管理するかんばんのワーカーには、既定で90%の時点で、ツールがまだ使えるうちに、完了に向けたチェックポイントの通知が届きます（比率を明示すると、このしきい値が変わります）。この通知が求めるのは、検証済みの完了か、あとに残る進捗のコメントです。まだ終わっていないのに成功と報告させるものではありません。

`agent.api_max_retries` は、一時的なエラー（レート制限、接続の切断、5xx）が起きたとき、フォールバックプロバイダーへの切り替えが始まる**前に**、Hermes がプロバイダーの API 呼び出しを何回再試行するかを決めます。既定値は `3` で、合計4回試行します。[フォールバックプロバイダー](/hermes/docs/user-guide/features/fallback-providers/) を設定していて、より早く切り替えたい場合は、これを `0` に下げてください。そうすれば、メインのプロバイダーで最初に一時的なエラーが出た時点で、不安定なエンドポイントへの再試行を重ねずに、すぐフォールバックへ引き継ぎます。

`agent.auto_recovery_cycles` は、再試行とフォールバックチェーンの両方を使い切った*あと*の安全網です。失敗の原因が一時的な障害（HTTP 5xx、`overloaded`/529 の応答、接続または読み込みのタイムアウト）で、まだ回答のテキストが届いていない場合、Hermes は「API failed after N retries」でターンを終えず、待ってから再び試します。試すのは最大でこの回数（既定は `5`）までで、間隔は15/30/60/60/60秒に揺らぎを加えたものです。プロバイダーが `Retry-After` ヘッダーを返した場合は、この間隔より優先します（120秒まで従います）。待っているあいだは、どの画面にも同じ内容が表示されます。CLI/TUI/Desktop では `⏳ Provider temporarily unavailable — retrying automatically in 30s (cycle 2/5); press Esc to stop`、メッセージングプラットフォームではステータスの吹き出し（`send /stop to cancel`）、API サーバーでは `hermes.status` の SSE イベント、cron ジョブではログの1行です。Esc を押す（または `/stop` を送る）と、待機はすぐに取り消されます。それでもフォールバックが先です。フォールバックチェーンを設定していれば、使い切ったときはこれまでどおり次のプロバイダーへ移り、この段階的な待機はチェーンに残りがなくなって初めて始まります。認証、支払い、リクエストの形式、利用資格、コンテンツポリシー、アカウントのポリシーのエラーは、この段階的な待機の対象になりません。無効にするには `0` を設定してください。

## 経過時間による実行の上限 {#wall-clock-run-budget}

反復回数の上限とは別に、会話の実行ごとに**経過時間**の上限を任意で設けられます。これは、外部から厳しい時間制限がかかる単発実行や評価ハーネスからの呼び出し（例: タスクごとに900秒の制限）を想定した機能です。これがないと、作業はほぼ終わっているのに実行がタイムアウトすることがあります。最終回答を出すまであと1回の生成だった、あるいはハングした1回のプロバイダー呼び出しで止まっていた、という場合です。

```yaml
agent:
  run_budget_seconds: null     # Optional; unset/null = feature fully off (default)
```

CLI から呼び出しごとに指定することもできます。

```bash
hermes chat --run-budget 850 -q "..."
```

上限を設定すると、次の2つが起きます。

1. **80%でまとめの通知。** 上限の80%が経過すると、Hermes は**1回だけ**の通知を差し込み、新しい調査や検証の作業をやめて、手元にある状態から最終的な成果物を作るようモデルに伝えます（この通知は `/steer` のメッセージと同じく最新のツールの結果に追記され、キャッシュを壊さない形で届きます）。通知は1回の実行で最大1回だけで、既存の反復回数の上限でのまとめの仕組みと同じ考え方です。上限が迫っていることを繰り返し警告することはありません。
2. **期限に合わせた停滞タイムアウト。** 明示的に設定していない非ストリーミングの停滞タイムアウト（既定の90秒や、推論モデル向けの下限。例: DeepSeek の推論モデルでは600秒）は、`max(60, remaining_budget × 0.5)` を上限にします。そのため、知らせもなくハングした1回のプロバイダー呼び出しが、実行の残り時間をすべて使ってしまうことはありません。この上限はタイムアウトを*短くする*方向にだけ働き、長くすることはありません。また、`stale_timeout_seconds` を明示的に設定している場合（プロバイダーやモデルの設定、または `HERMES_API_CALL_STALE_TIMEOUT`）は、その値がそのまま常に優先されます。

この上限は `run_conversation` のターンごとに適用され（ユーザーのメッセージごとにリセットされます）、未設定のときはこの機能はまったく動きません。時刻の読み取りも、通知の差し込みも、タイムアウトの変更も行いません。

## 停止時の検証（コーディングの検証） {#verify-on-stop-coding-verification}

有効にすると、エージェントがワークスペースのコードを編集したのに、新しい検証の証拠（通ったテスト、ビルド、lint など）を出していないターンでは、Hermes は最終回答を受け付けません。代わりに、検証するか、検証できない理由を説明するよう求める追加のメッセージを差し込みます。ドキュメント、Markdown、スキルだけの編集ではこの動作は起きません。また、このやり取りの回数には上限があるので、エージェントが抜け出せなくなることはありません。

```yaml
agent:
  verify_on_stop: false        # true | false | "auto" (surface-aware: on for CLI/TUI/desktop, off for messaging)
  verify_guidance: true        # Append creative-UI / clean-diff guidance to the missing-evidence nudge
  max_verify_nudges: 3         # Cap on consecutive continue nudges per turn (built-in + pre_verify hooks)
  coding_instructions: ""      # Standing project-wide coding rules appended to the coding brief
```

`verify_on_stop` には、`true`（どこでも有効）、`false`（無効。既定値）、`"auto"`（画面に応じて切り替える旧来の動作。CLI、TUI、デスクトップのような対話的にコードを書く画面と、プログラムからの呼び出しでは有効、検証の説明がチャットの雑音になってしまう Telegram/Discord のようなメッセージングの画面では無効）を指定できます。既定ではどこでも無効です。新規インストールでは `false` になっており、既存のインストールでも設定の移行で無効にしてあるので、使うには明示的に有効にする必要があります。環境変数 `HERMES_VERIFY_ON_STOP` を設定すると、設定ファイルの値を上書きします。

このガードが使う証拠（どのテスト／lint／ビルドのコマンドを実行したか、そのあとどのファイルを編集したか）は `~/.hermes/verification_evidence.db` に保存されます。この記録ファイルは、ガードが有効なあいだだけ作成・書き込みされます。`verify_on_stop: false` のときは何も記録されないので、既存のファイルは削除してもかまいません。

同じタイミングで、ユーザーやプラグインが独自の判定を差し込み、自分で用意した確認でエージェントに作業を続けさせたい場合は、[`pre_verify` フック](/hermes/docs/user-guide/features/hooks/#pre_verify) を参照してください。

## 続く目標（`/goal`） {#standing-goals-goal}

続く目標が有効なあいだ、Hermes はアシスタントの応答ごとに、その目標を満たしているかを判定します。満たしていなければ、続きを促すプロンプトを同じセッションに戻し、目標が達成されるか、ターンの上限を使い切るか、ユーザーが一時停止または解除するまで作業を続けます。本当の歯止めになっているのはターンの上限です。判定役の失敗は「失敗時は**通す**（fail open）」として扱い、作業を続けるので、判定役が不安定でも進行が止まることはありません。

```yaml
goals:
  max_turns: 20   # Max continuation turns before Hermes auto-pauses the goal (default: 20)
```

`max_turns` は、1つの目標で続きのターンを何回まで回せるかの上限です。上限に達すると、Hermes は目標を自動で一時停止し、ユーザーに `/goal resume` を求めます。判定役の見誤り（実際には目標を達成しているのに、判定役が続行と判断する）や、あいまいな目標や達成できない目標でモデルの利用料が際限なくかさむことを防ぎます。機能の全体は [続く目標](/hermes/docs/user-guide/features/goals/) を参照してください。

### API のタイムアウト {#api-timeouts}

Hermes には、ストリーミング用に独立した複数のタイムアウトの層があり、それとは別に非ストリーミングの呼び出し向けの停滞検知もあります。停滞の検知がローカルのプロバイダー向けに自動で調整されるのは、暗黙の既定値のままにしている場合だけです。

| タイムアウト | 既定値 | ローカルのプロバイダー | 設定／環境変数 |
|---------|---------|----------------|--------------|
| ソケットの読み取りタイムアウト | 120秒 | 自動で1800秒に引き上げ | `HERMES_STREAM_READ_TIMEOUT` |
| 停滞ストリームの検知 | 180秒 | 上限の900秒まで引き上げ（`agent.local_stream_stale_timeout`） | `HERMES_STREAM_STALE_TIMEOUT` |
| 非ストリーミングの停滞検知 | 90秒 | 暗黙の既定値のままなら自動で無効 | `providers.<id>.stale_timeout_seconds` または `HERMES_API_CALL_STALE_TIMEOUT` |
| Responses の最初のイベントの監視 | 120秒 | 同じ上限の900秒まで引き上げ（`agent.local_stream_stale_timeout`） | `HERMES_CODEX_TTFB_TIMEOUT_SECONDS` |
| API 呼び出し（非ストリーミング） | 1800秒 | 変更なし | `providers.<id>.request_timeout_seconds` / `timeout_seconds` または `HERMES_API_TIMEOUT` |
| 終端後のストリームの読み切り（Codex/Responses） | 2秒 | 変更なし | `agent.stream_drain_timeout` |

**ソケットの読み取りタイムアウト**は、プロバイダーから次のデータのかたまりが届くまで httpx が待つ時間を決めます。ローカルの LLM は、コンテキストが大きいと、最初のトークンを出す前のプレフィル（入力の事前処理）に数分かかることがあります。そのため Hermes は、ローカルのエンドポイントを検知するとこの値を30分に引き上げます。`HERMES_STREAM_READ_TIMEOUT` を明示的に設定した場合は、エンドポイントの検知結果にかかわらず、常にその値が使われます。

**停滞ストリームの検知**は、SSE のキープアライブの ping は届くのに、実際の内容が届かない接続を切断します。ローカルのプロバイダー（プレフィル中にキープアライブの ping を送らない）では、既定値が基本の180秒ではなく、有限の上限である900秒に引き上げられます。この値は `agent.local_stream_stale_timeout` か環境変数 `HERMES_LOCAL_STREAM_STALE_TIMEOUT` で変更できます。

**Responses の最初のイベントの監視**（Codex / `codex_responses` のトランスポート。Responses のトランスポートで宣言したカスタムプロバイダーも含みます）は、接続を受け付けたのに120秒以内にストリームのイベントを1つも出さないリクエストを中断し、接続し直します。大きなコンテキストをプレフィルしているローカルサーバーは、正常に動いていてもそれより長く黙ったままになることがあります。そのためローカルのエンドポイントでは、暗黙の既定値が停滞ストリームの検知と同じ上限（`agent.local_stream_stale_timeout` / `HERMES_LOCAL_STREAM_STALE_TIMEOUT`、900秒）まで引き上げられます。`HERMES_CODEX_TTFB_TIMEOUT_SECONDS` を明示的に設定した場合は、常にその値がそのまま使われます（`0` にするとこの監視は無効になります）。

**非ストリーミングの停滞検知**は、応答のないまま長く待たされている非ストリーミングの呼び出しを打ち切ります。長いプレフィル中の誤検知を避けるため、Hermes は既定ではローカルのエンドポイントでこの検知を無効にしています。`providers.<id>.stale_timeout_seconds`、`providers.<id>.models.<model>.stale_timeout_seconds`、`HERMES_API_CALL_STALE_TIMEOUT` のいずれかを明示的に設定した場合は、ローカルのエンドポイントでもその値が守られます。

**終端後のストリームの読み切り**は、Codex/Responses のストリームが終端の `response.completed` フレームを受け取ったあと、どれだけ読み続けるかに上限を設けます（リレー側の終了処理が動けるようにするための配慮です）。リレーの中には、終端フレームのあとも SSE のソケットを閉じないものがあります。上限がなかったころは、停滞ストリームの監視役が発火するまでターンが止まったままになり、すでに課金された応答を捨てたうえで再試行していました。`agent.stream_drain_timeout` 秒が過ぎるとストリームを閉じ、完了した応答を返します。接続を正常に閉じるエンドポイントでは読み切りがすぐに終わるので、ここまで待つことはありません。読み切りをまるごと省くには `0` を設定します。

この上限は、すべての非ストリーミングの呼び出しにかかります。リクエストを受け付けたあとに黙り込んだプロバイダー（接続は開いたまま、1バイトも届かず、エラーも出ない）は、停滞タイムアウトで中断されて再試行されます。ずっと長いソケットの読み取りタイムアウトまで（無人の cron 実行なら、外から何かがプロセスを止めるまで）待たされ続けることはありません。

プロバイダーを待っていることを知らせる定期的な通知は、少なくとも**60秒間の無応答**が続いてから表示されます。Codex Responses の**待機ステータス**が表すのは無応答の時間で、生成にかかった合計時間ではありません。ストリームのイベント（推論を含む）が届いている間は表示されません。イベントが止まると、「応答がまだ届いていない」とは言わずに、ストリームのイベントが途絶えている時間を報告します。イベントが再開すると通知は消えます。再接続によって最初のイベントの監視が新しい段階に入ったときは、待機ステータスもその段階に合わせます。この表示の仕組みは、別に設けられている経過時間による停滞した呼び出しの上限を延ばしたり、監視役のタイムアウトを変えたりはしません。ステータスは無応答1回につき1回（60秒後）表示され、待機の段階（`waiting for the first provider event` か `provider stream active; Ns without stream events` か）と、再接続を行う監視役（`TTFB`、`stream idle`、`wall-clock stale` のいずれか）、それが発火するまでの残り秒数を中立的な言い回しで示します。書き換えられるのは段階が変わったときか期限が近づいたときだけで、30秒ごとの生存確認のハートビートのたびに書き換わることはありません。chat completions のストリームも同じ規則に従います（`waiting for the first stream chunk` / `stream open; Ns without stream output`、`stream stale` の監視役）。チャンクが再開すれば同じように無応答の通知をすぐに消し、ローカルモデルの読み込み中を示すステータスを置き換えることもありません。

cron ジョブと委任されたサブエージェントもストリーミングを使います。これらは自分のスレッドの中でリクエストを直接実行します（ほかのセッションが使う割り込み用のワーカーは、ゲートウェイの入れ子になったスレッドプールの中で詰まってしまうため）。それでも実際のリクエストは `stream: true` なので、上で説明した**停滞ストリームの検知**の上限が適用されます。トークンが1つ届くたびに生きている証拠として数えられるので、何分も考え続ける推論モデルが固まったプロバイダーと誤認されることはありません。無応答の接続を切るエッジのプロキシにも、バイトが届き続けます。

### API のストリーミングの無効化 {#disabling-api-streaming}

`model.streaming: false` を設定すると、親エージェントもサブエージェントも含め、セッション全体で非ストリーミングのリクエストを使います。これは、*ストリーミング*時のツール呼び出しの経路が壊れているセルフホストの OpenAI 互換サーバー向けの逃げ道です（たとえば vLLM で `--tool-call-parser qwen3_xml` と推論パーサーを組み合わせると、ツール呼び出しのマークアップが普通のテキストに漏れ出し、`tool_calls` が0件で返ることがあります。すると委任したタスクが何もしないまま黙って終わります）。既定値は `true` です。非ストリーミングの呼び出しでは上で説明した生存確認の性質が失われるので、この種のバグに当たらない限りは変えないでください。これは `display.streaming` とは別の設定で、こちらはターミナルでのトークンの表示だけを制御します。

ストリーミングでは先に進めないとき、Hermes が自分でセッションを非ストリーミングに切り替えることもあります。プロバイダーがストリーミング非対応だと返してきた場合や、OpenAI 互換のゲートウェイがストリーミングのリクエストに中身のない SSE フレーム（ペイロードのない `data:` / `event: ping` だけのキープアライブ。調子の悪いリレーによくあります）で応答した場合です。そのターンはストリーミングなしで再試行され、警告が表示され、そのセッションの残りの間はストリーミングがオフのままになります。

```yaml
model:
  streaming: false
```

## コンテキストの逼迫の警告 {#context-pressure-warnings}

反復回数の上限の逼迫とは別に、コンテキストの逼迫は、会話が**圧縮のしきい値**（コンテキスト圧縮が発動して古いメッセージを要約する地点）にどれだけ近づいているかを追跡します。会話が長くなってきたことを、ユーザーとエージェントの両方がつかめるようになります。

| 進み具合 | レベル | 起きること |
|----------|-------|-------------|
| しきい値の **60%以上** | Info | CLI はシアンの進捗バーを表示し、ゲートウェイはお知らせを送ります |
| しきい値の **85%以上** | Warning | CLI は太字の黄色いバーを表示し、ゲートウェイは圧縮が間近だと警告します |

CLI では、コンテキストの逼迫がツールの出力の流れの中に進捗バーとして表示されます。

```
  ◐ context ████████████░░░░░░░░ 62% to compaction  48k threshold (50%) · approaching compaction
```

メッセージングプラットフォームでは、プレーンテキストの通知が送られます。

```
◐ Context: ████████████░░░░░░░░ 62% to compaction (threshold: 50% of window).
```

自動圧縮を無効にしている場合は、代わりにコンテキストが切り詰められるおそれがあると警告します。

コンテキストの逼迫の警告は自動で動くので、設定は要りません。あくまでユーザー向けの通知として出るだけで、メッセージの流れを変えたり、モデルのコンテキストに何かを差し込んだりはしません。

## 認証情報プールのローテーション方式 {#credential-pool-strategies}

同じプロバイダーの API キーや OAuth トークンを複数持っている場合は、ローテーションの方式を設定します。

```yaml
credential_pool_strategies:
  openrouter: round_robin    # cycle through keys evenly
  anthropic: least_used      # always pick the least-used key
```

選べる値: `fill_first`（既定）、`round_robin`、`least_used`、`random`。詳しくは [認証情報プール](/hermes/docs/user-guide/features/credential-pools/) を参照してください。

## プロンプトキャッシュ {#prompt-caching}

使用中のプロバイダーが対応していれば、Hermes はセッションをまたいだプロンプトキャッシュを自動で有効にします。ユーザー側の設定は要りません。

**ネイティブの Anthropic**、**OpenRouter**、**Nous Portal** 経由の Claude では、Hermes はシステムプロンプトとスキルのブロックに、TTL が1時間（`ttl: "1h"`）の `cache_control` ブレークポイントを付けます。新しい1時間の中で最初に送ったときは通常の入力料金がかかり、同じ1時間のうちに送る2回目以降は、どのセッションからでもキャッシュから読み込まれて、割引されたキャッシュ読み取りの料金になります。つまり、システムプロンプト、読み込んだスキルの内容、長いコンテキストとして取り込んだものの先頭部分が、最初の1時間は `hermes` のセッション同士や、フォークしたサブエージェントの間で使い回されます。

Qwen Cloud（Alibaba DashScope）は提供元がキャッシュの TTL を5分までに制限しているため、Hermes はそこでは代わりに5分のブレークポイント TTL を使います。ほかのサードパーティ経由で Claude を使う経路（AWS Bedrock、Azure Foundry）では、そのプロバイダー自身のキャッシュの既定の動作に切り替わります。xAI Grok は、セッションに固定した conversation-id を使う別の仕組みです。詳しくは [xAI のプロンプトキャッシュ](/hermes/docs/integrations/providers/#xai-grok--responses-api--prompt-caching) を参照してください。

これを無効にする設定項目はありません。キャッシュは常に有効で、1ターンだけの会話でも料金の節約になります。システムプロンプトだけでも、入力トークン数のかなりの割合を占めるからです。

明示的に設定できる項目は1つだけで、Anthropic 形式のブレークポイントで Hermes が要求するキャッシュの TTL のティアです。

```yaml
prompt_caching:
  cache_ttl: "5m"   # "5m", "1h" (Anthropic-supported tiers) or "auto"; other values are ignored
```

`cache_ttl` は、ネイティブの Anthropic API、OpenRouter、Nous Portal 経由の Claude に Hermes が付けるブレークポイントの TTL を選びます。Anthropic の2つのティア（`"5m"`、`"1h"`）はそのまま送られ、それ以外の値は無視されます。独自の上限があるプロバイダー（例: 最大5分の Qwen Cloud）では、この設定にかかわらず提供元が許す範囲に収められます。

1時間のティアは書き込みに基本の入力料金の2倍がかかり（5分のティアは1.25倍）、元が取れるのはターンの間隔が5分より長いときだけです。そうでなければ、誰も使わない保持期間のために、ツールの結果をすべて割高な料金で書き込むことになります。`"auto"` は、そのセッションのペースを誰が決めているかで、セッションごとにティアを選びます。人が入力するセッション（CLI、TUI、Desktop、Telegram/Discord/Slack とそのほかのメッセージングプラットフォーム）には `1h`、機械のペースで進むセッション（サブエージェント、cron、`hermes -q` の単発実行、webhook、かんばんのワーカー、API サーバー、ツールから起動される実行やバッチ実行）には `5m` を使います。対話セッションを一日のうちに何度も中断しては再開する環境では、`auto` によって対話セッションのキャッシュ書き込みの費用がおよそ40%減り、並列に展開するサブエージェントの費用は変わりませんでした。委任されたサブエージェントは、設定にかかわらず常に `5m` に固定されます。

## 補助モデル {#auxiliary-models}

Hermes は、画像解析、ブラウザーのスクリーンショットの解析、セッションのタイトル生成、コンテキスト圧縮といった脇の処理に「補助」モデルを使います。既定（`auxiliary.*.provider: "auto"`）では、Hermes はすべての補助タスクを**メインのチャットモデル**、つまり `hermes model` で選んだのと同じプロバイダー／モデルに振り分けます。使い始めるのに設定は何も要りませんが、高価な推論モデル（Opus、MiniMax M2.7 など）を使っていると、補助タスクの分の費用が無視できない額になる点に注意してください。メインモデルが何であれ補助タスクは安く速く済ませたい場合は、`auxiliary.<task>.provider` と `auxiliary.<task>.model` を明示的に設定します（例: 画像認識には OpenRouter 上の Gemini Flash）。（Web ページの抽出は補助タスクではありません。`web_extract` とブラウザーのスナップショットは長い内容を決まった規則で切り詰め、`read_file` でページ単位に読めるように全文を保存します。LLM は使いません。）

:::note 「auto」がメインモデルを使う理由
以前のビルドでは、アグリゲーター（OpenRouter、Nous Portal）を使うユーザーだけ、そのプロバイダー上の安価な既定のモデルに振り分けていました。これは予想外の動きでした。アグリゲーターのサブスクリプションに料金を払っているユーザーから見ると、補助の処理を別のモデルが担当していたからです。現在の `auto` は全員にメインモデルを使い、`config.yaml` でのタスクごとの上書きは引き続きそれより優先されます（下の [補助設定の全項目一覧](#full-auxiliary-config-reference) を参照してください）。
:::

### 対話形式での補助モデルの設定 {#configuring-auxiliary-models-interactively}

YAML を手で編集する代わりに、`hermes model` を実行してメニューから **「Configure auxiliary models」** を選ぶこともできます。タスクごとに対話形式で選べる画面が開きます。

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

タスクを選び、プロバイダーを選び（OAuth のプロバイダーはブラウザーが開き、API キーのプロバイダーは入力を求められます）、モデルを選びます。変更は `config.yaml` の `auxiliary.<task>.*` に保存されます。メインモデルを選ぶ画面と同じ仕組みなので、新しく覚える書き方はありません。

**Delegation** の項目だけは扱いが違います。これは `delegate_task` のサブエージェントが使うモデルを決める項目で、保存先は `auxiliary.*` ではなくトップレベルの `delegation.*` セクション（`delegation.provider` / `delegation.model`）です。サブエージェントは脇の LLM 呼び出しではなく、れっきとした子エージェントだからです。この項目の `auto` は「親エージェントのプロバイダー、モデル、認証情報を引き継ぐ」という意味です。

最初のやり取りのあとに Hermes がタイトルを自動生成しないようにするには、
`auxiliary.title_generation.enabled: false` を設定します。手動でのタイトル付けは、その場合も
`/title` と `hermes sessions rename` で行えます。

すぐに自動で作られるタイトル（最初のメッセージの1行目）はそのまま使い、モデルを呼び出して
改善することはしない場合は、`auxiliary.title_generation.model_upgrade_enabled: false` を設定します。
バックグラウンドの `auto-title` スレッドは起動せず、タイトル用モデルへの自動のリクエストも送られません。ただし、
明示的に実行する修復コマンド `hermes sessions retitle-skills` は、この設定でもモデルを呼び出します。`enabled: false`
を設定すれば、これまでどおり両方の段階が無効になります。

メインのプロバイダーが `custom`（llama.cpp、Ollama、vLLM、LM Studio などのセルフホストの
OpenAI 互換サーバー）の場合、タイトル用モデルの呼び出しは、ターンの返答と同時ではなく、返答が
届いた**あと**に送られます。ただし、`auxiliary.title_generation` を別の
プロバイダーや `base_url` に固定している場合は除きます。こうしないと、同時に1件しか処理できないローカルサーバーが、返答のデコード中に `json_schema` のタイトル
リクエストを受け取り、返答の代わりに `{"title": ...}` を返してしまうことがあります。
その内容はアシスタントのターンとして保存され、以降のリクエストでも会話の履歴として送り直されてしまいます。

Hermes Desktop では、3,000文字を超えるプレーンテキストを貼り付けると、自動で作られた `.txt`
の添付ファイルになります。その貼り付けの先頭約1,000文字は、タイトル付けにだけ使うヒントとしてタイトル生成の各段階に
渡されます（エージェントのターンから見えるのは、これまでどおり添付ファイルへの参照だけです）。そのため「これを要約して」と
大量の貼り付けを一緒に送ると、貼り付けた内容の話題にちなんだタイトルが付きます。自分で添付したファイルが
タイトル付けのために読まれることはありません。

### ストリーミング専用のエンドポイント {#stream-only-endpoints}

OpenAI 互換のエンドポイントの中には、非ストリーミングのチャットリクエストを一切受け付けないものがあります（例: Tencent Copilot は HTTP 400 `"Non-stream chat request is currently not supported"` を返します）。対話中のチャットはもともとストリーミングですが、補助タスク（タイトル生成、圧縮、画像認識）は非ストリーミングの呼び出しを使うため、そのままでは毎回失敗します。Hermes は `copilot.tencent.com` を常にストリーミング専用として扱います。ほかに同じようなエンドポイントがある場合は、URL の一部を `auxiliary.stream_only_base_urls` の下に列挙します。

```yaml
auxiliary:
  stream_only_base_urls:
    - "my-stream-only-proxy.example.com"
```

一致した補助の呼び出しは `stream=True` で送られ、チャンク（ツール呼び出しの差分を含む）はクライアント側でまとめられます。ほかのエンドポイントの動作は変わりません。

### 解説動画 {#video-tutorial}

[YouTube: https://www.youtube.com/embed/NoF-YajElIM](https://www.youtube.com/embed/NoF-YajElIM)

### 共通の設定パターン {#the-universal-config-pattern}

Hermes でモデルを指定する場所は、補助タスクでも圧縮でもフォールバック（失敗したときの切り替え先）でも、どれも同じ3つの設定項目を使います。

| キー | 役割 | 既定値 |
|-----|-------------|---------|
| `provider` | 認証と振り分けに使うプロバイダー | `"auto"` |
| `model` | リクエストするモデル | プロバイダーの既定値 |
| `base_url` | カスタムの OpenAI 互換エンドポイント（プロバイダーより優先） | 未設定 |

補助タスクのブロックでは、さらに `reasoning_effort` という設定項目も使えます。

| キー | 役割 | 既定値 |
|-----|-------------|---------|
| `reasoning_effort` | そのタスクの LLM 呼び出しでの思考のレベル: `none`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max`、`ultra` | 未設定（プロバイダーの既定値） |

これは全体設定の `agent.reasoning_effort` を、タスクごとに指定するためのものです。メインモデルが高価な推論モデルのとき、圧縮を `low`、画像認識を `none` で動かせば、メインのチャットの動作には手を付けずに、補助タスクの待ち時間と費用を減らせます。対象は `vision`、`compression`、`title_generation`、`curator` などの補助クライアントのタスクで、補助タスクの3つの送信形式（chat completions、Codex Responses、Anthropic Messages）すべてで効きます。同じタスクに `extra_body.reasoning` を明示的に書いた場合は、この省略形の設定よりそちらが優先されます。呼び出し側が自分の呼び出しで思考をオフにする場合（タイトル生成がそうです。64トークンのタイトルに推論の入る余地はありません）は、その両方より優先されます。そのリクエストでは、タスク単位の推論の深さの指定はプロバイダーの思考オフのフィールドと並べて送られることなく、取り除かれます。

エンドポイントが推論のフィールドそのものを受け付けない場合（OpenAI 互換のリレーの裏にあるチャット専用モデルが `400 Unrecognized request argument supplied: reasoning_effort` と返す場合や、語順が逆の `400 reasoning_effort 'none' unsupported; use minimal|low|medium|high|xhigh` を返す場合）、補助の呼び出しは推論のフィールドをすべて外して1回だけ再試行されます。そのため、タスク（たとえばセッションのタイトル）はエンドポイントの既定の動作で最後まで完了します。メインの会話でも同じ立て直しを行います。思考だけで途中で切れた応答の続きを求めるとき、Hermes は推論をオフにしたリクエストを送りますが、その経路がこれを拒否した場合は、そのセッションの残りの間は無効化の指定を外し、経路の既定の設定でリクエストを再試行します。

モデルによっては、思考をまったくオフにできないものもあります（`400 Reasoning is mandatory for this endpoint and cannot be disabled`）。そうしたモデルでは、思考をオフにした補助の呼び出し（タイトル生成や、`reasoning_effort: none` を設定したタスク）は、無効化の指定の代わりに最も低い深さ（`low`）で送られます。経路のモデルカタログがそのモデルを必須と示している場合（OpenRouter と Nous Portal の `/v1/models`。`cache/reasoning_caps.json` にキャッシュされます）や、同じプロセスの中で、その経路が以前の無効化の指定にすでにそう答えている場合、Hermes は事前にそれを把握しています。そのため、拒否されるリクエストは送られません。カタログのキャッシュがまだない新規インストールでは、この 400 が1回だけ出ることがあります。問い合わせの処理が裏でカタログを取得し、以降の呼び出しではそれを使います。

**バックグラウンドレビューは扱いが異なります:** 同じモデルで行うレビューのフォークは、常に親の推論の深さを引き継ぎます。この経路では、親のプロバイダー／モデルを明示的に選んでいる場合も含め、`auxiliary.background_review.reasoning_effort` は無視されます。プロンプトキャッシュを親と同じ状態に保つために、推論の設定、システムプロンプト、会話全体のスナップショット、ツールの定義をバイト単位で同一に保つからです。同じモデルでのレビューだけ推論の深さを別にする切り替えはありません。[バックグラウンドレビューの推論](/hermes/docs/user-guide/features/memory/#same-model-review-reasoning) を参照してください。レビューを別のプロバイダー／モデルに振り分けた場合は、振り分け先のフォークに `reasoning_effort` が適用されます（未設定なら振り分け先プロバイダーの既定値）。このキーを設定しているのにレビューがメインモデルで動いた場合、Hermes は1回だけ警告を表示します。

**MoA も設定の仕方が異なります:** Mixture-of-Agents の推論の深さは、`moa_reference`/`moa_aggregator` の補助ブロックではなく、MoA のプリセットの中で**スロットごとに**設定します（`moa.presets.<name>.reference_models[].reasoning_effort` / `aggregator.reasoning_effort`）。詳しくは [Mixture of Agents](/hermes/docs/user-guide/features/mixture-of-agents/) を参照してください。

```yaml
auxiliary:
  compression:
    reasoning_effort: "low"    # summaries don't need deep thinking
  vision:
    reasoning_effort: "none"   # disable thinking for image description
```

`base_url` を設定すると、Hermes はプロバイダーの指定を無視して、そのエンドポイントを直接呼び出します（認証には `api_key` か `OPENAI_API_KEY` を使います）。`provider` だけを設定した場合は、そのプロバイダーに組み込まれた認証と base URL を使います。

補助タスクで使えるプロバイダー: `auto`、`main`、[プロバイダーのレジストリ](/hermes/docs/reference/environment-variables/) にある任意のプロバイダー（`openrouter`、`nous`、`openai-codex`、`copilot`、`copilot-acp`、`anthropic`、`gemini`、`qwen-oauth`、`zai`、`kimi-coding`、`kimi-coding-cn`、`minimax`、`minimax-cn`、`minimax-oauth`、`deepseek`、`nvidia`、`xai`、`xai-oauth`、`ollama-cloud`、`alibaba`、`bedrock`、`huggingface`、`arcee`、`xiaomi`、`kilocode`、`opencode-zen`、`opencode-go`、`commandcode`、`commandcode-anthropic`、`ai-gateway`、`azure-foundry`）、または `providers:` の辞書に名前を付けて登録したカスタムプロバイダー（例: `provider: "beans"`）。

ローカルの OpenAI 互換サーバーは、それぞれの名前でも指定できます。`provider: ollama`（`vllm`、`llamacpp`、`llama.cpp` も同様）に `http://127.0.0.1:11434` のような `base_url` と空の `api_key` を組み合わせると、仮のキーを使ってカスタムエンドポイント経由で振り分けられます。また、base_url が `host:port` だけの場合は、末尾に `/v1` が自動で付きます。

`provider: openai` は API を直接使うための別名です。ブロックの `base_url`、それがなければ `OPENAI_BASE_URL`、それもなければ `https://api.openai.com/v1` をカスタムエンドポイントとして経由し、`api_key` か `OPENAI_API_KEY` で認証します。どの補助タスクでも解決のしかたは同じです（`compression`/`vision`/`title_generation` のほか、`background_review`、`curator`、MoA のスロットも同じです）。そのため、`provider: openai` のまま `base_url` を消すと、そのタスクは公開の OpenAI エンドポイントに移ります。`providers:` の辞書に `providers.openai` のエントリーがあればそちらが優先され、そのエントリー自身のエンドポイントとキーが使われます。

振り分け先を指定した `auxiliary.<task>` のブロックを解決できない場合（未知のプロバイダー、エンドポイントや認証情報の不足）、そのタスクはメインモデルで動き、Hermes はそのことを知らせます。`background_review` はプロバイダー名と理由を示した警告をユーザーに1回だけ表示し（加えてレビューのたびに `agent.log` に `WARNING` の行を書きます）、`hermes doctor` は振り分け先を指定したすべての `auxiliary.<task>` のブロックを同じ解決処理にかけて、失敗するものを報告します。

:::tip MiniMax OAuth
`minimax-oauth` はブラウザーでの OAuth でログインします（API キーは不要です）。`hermes model` を実行して **MiniMax (OAuth)** を選ぶと認証できます。補助タスクには自動で `MiniMax-M2.7-highspeed` が使われます。[MiniMax OAuth のガイド](/hermes/docs/guides/minimax-oauth/) を参照してください。
:::

:::tip xAI Grok OAuth
`xai-oauth` は、SuperGrok と X Premium+ の加入者向けに、ブラウザーでの OAuth でログインします（API キーは不要です）。`hermes model` を実行して **xAI Grok OAuth (SuperGrok / Premium+)** を選ぶと認証できます。同じ OAuth トークンが、xAI に直接つなぐすべての用途（チャット、補助タスク、TTS、画像生成、動画生成、文字起こし）で使い回されます。[xAI Grok OAuth のガイド](/hermes/docs/guides/xai-grok-oauth/) を参照してください。Hermes がリモートホストで動いている場合は [SSH / リモートホスト越しの OAuth](/hermes/docs/guides/oauth-over-ssh/) も参照してください。
:::

:::warning `"main"` は補助タスク専用
プロバイダーの `"main"` という選択肢は「メインのエージェントが使っているプロバイダーをそのまま使う」という意味で、使えるのは `auxiliary:`、`compression:`、メインのフォールバックのエントリー（`fallback_providers:` または旧来の `fallback_model:`）の中だけです。トップレベルの `model.provider` の値としては**使えません**。カスタムの OpenAI 互換エンドポイントを使う場合は、`model:` セクションで `provider: custom` を設定してください。メインモデルで選べるプロバイダーの一覧は [AI プロバイダー](/hermes/docs/integrations/providers/) を参照してください。
:::

### 補助設定の全項目一覧 {#full-auxiliary-config-reference}

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
    # no_progress_timeout: 60   # Responses-stream routes (openai-codex) only: seconds a summary stream
    #                           # may go without a substantive event before the attempt fails fast
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
    model_upgrade_enabled: true  # set false to keep the instant derived title, never call a model
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
補助タスクにはそれぞれ `timeout`（秒単位）を設定できます。既定値: 画像認識は120秒、承認は30秒、圧縮は120秒、タイトル生成は30秒、そのほかのタスクはすべて30秒。補助タスクに遅いローカルモデルを使う場合は、これらの値を増やしてください。回答の前に思考のブロックを出す推論モデルは、タイトル1つに30秒以上かかるのが普通です。期限に達したリクエストは、Hermes がフォールバックチェーンを試す前に `Auxiliary <task>: request to <base_url> timed out after <N>s (raise auxiliary.<task>.timeout …)` としてログに記録されます。タイトル生成、圧縮、画像認識は、メインの経路でタイムアウトの時間を1回まるごと使い切るとその経路をあきらめます（同じプロバイダーでの再試行はしません）。遅いモデルのせいで待ち時間が何倍にも膨らむことはありません。画像認識には、HTTP での画像のダウンロード用に別の `download_timeout`（既定は30秒）もあります。回線が遅い場合や、画像サーバーをセルフホストしている場合は、この値を増やしてください。
:::

:::info
コンテキスト圧縮には、しきい値を決める専用の `compression:` ブロックと、モデル／プロバイダーを決める `auxiliary.compression:` ブロックがあります。上の [コンテキスト圧縮](#context-compression) を参照してください。メインのフォールバックチェーンには、トップレベルの `fallback_providers:` リストを使います。[フォールバックプロバイダー](/hermes/docs/integrations/providers/#fallback-providers) を参照してください。3つとも、同じ provider / model / base_url の形式に従います。
:::

### 補助タスクごとのフォールバックチェーン {#per-task-fallback-chain-for-auxiliary-tasks}

各補助タスクには、任意で `fallback_chain` を定義できます。これは、第一候補の補助プロバイダーがレート制限、接続の問題、支払いの制限で失敗したときに Hermes が試す、プロバイダーとモデルを指定したエントリーのリストです。

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

第一候補の補助プロバイダー（`openrouter` / `openai/gpt-4o-mini`）がレート制限、接続タイムアウト、支払いが必要（payment-required）のいずれかのエラーを返すと、Hermes は `fallback_chain` を先頭から順にたどります。すでに失敗したプロバイダーと同じプロバイダーのエントリーは飛ばし、残りのエントリーを、どれかが成功するかチェーンを使い切るまで1つずつ試します。フォールバック（失敗したときの切り替え先）がすべて失敗した場合は、最後の安全網としてメインのエージェントのモデルに切り替えます。

各エントリーでは、ほかの補助タスクの設定と同じ3つの設定項目を使えます。

| キー | 説明 |
|-----|-------------|
| `provider` | プロバイダー名（`nous`、`openrouter`、`anthropic`、`gemini`、`main` など） |
| `model` | そのプロバイダーでのモデル名 |
| `base_url` | （任意）OpenAI 互換のカスタムエンドポイント |

`fallback_chain` は、`compression`、`vision`、`approval`、`skills_hub`、`mcp` など、どの補助タスクでも使えます。

### 画像認識のネイティブ埋め込みの上限（トップレベルの `vision:`） {#native-vision-embed-budgets-top-level-vision}

これは（画像を説明するモデルを選ぶ）`auxiliary.vision` とは別の設定です。*メイン*のモデルが画像認識に対応している場合、`vision_analyze` とブラウザーのスクリーンショットは、画像の実際のピクセルをツールの結果に埋め込みます。このツールの結果は、以降のターンのたびに再送されます。`vision.embed_target_bytes`（既定は `262144`、64 KiB〜4 MiB の範囲に収められます）は1回の埋め込みのサイズを決めます。`vision.max_calls_per_image` は、同じ画像を1つのセッションで何回まで埋め込めるかの上限です（未設定なら、委任されたサブエージェントの中では3回、メインのエージェントでは無制限。`0` は無制限）。詳しくは [画像の貼り付けと視覚認識 → 埋め込んだ画像はセッションに残り続ける](/hermes/docs/user-guide/features/vision/#native-embeds-ride-the-session-visionembed_target_bytes-and-visionmax_calls_per_image) を参照してください。

### 補助タスクの同時実行数の制限 {#limiting-auxiliary-concurrency}

`max_concurrency` は、`compression` や `title_generation` などの補助タスクが同時に実行できる LLM 呼び出しの数を、プロセス全体で制限します。ただし `auxiliary.vision.max_concurrency` は対象外です。こちらはもともと、画像認識で CPU を使う画像のエンコードとリサイズを行うワーカーだけを制御していて、LLM へのリクエストは制御しないからです。この設定がとくに役立つのは、次のような場合です。

- 多くのセッションが同時にバックグラウンドの処理を始める可能性がある場合（Discord/Telegram のチャンネル、複数のターミナル）
- プロバイダーがレート制限を受けている、または障害の最中で、再試行によって集中したリクエストがさらに膨らんでしまう場合

既定値は無制限です。安全のための上限としては `2` がよく使われます。

```yaml
auxiliary:
  title_generation:
    max_concurrency: 2
  compression:
    max_concurrency: 2
```

この制限（セマフォ）は、再試行やフォールバックも含めた呼び出し全体にかかります。そのため、1回の遅い呼び出しは上限に対して1回としてだけ数えられます。

### 補助タスクでの OpenRouter のルーティングと Pareto Code {#openrouter-routing-pareto-code-for-auxiliary-tasks}

補助タスクの接続先が OpenRouter になる場合（明示的に指定したときと、メインのエージェントが OpenRouter を使っている状態で `provider: "main"` を指定したときの両方）、メインのエージェントの `provider_routing` と `openrouter.min_coding_score` の設定は**引き継がれません**。補助タスクはそれぞれ独立するように設計されているためです。特定の補助タスクで OpenRouter のプロバイダーの優先設定を指定したり、[Pareto Code ルーター](/hermes/docs/integrations/providers/#openrouter-pareto-code-router) を使ったりするには、`extra_body` でタスクごとに設定します。

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

この構造は、OpenRouter が chat completions のリクエストボディで受け付ける形と同じです。Hermes は `extra_body` 全体をそのまま転送するので、[openrouter.ai/docs](https://openrouter.ai/docs) に記載されているほかの OpenRouter のリクエストボディのフィールドも、同じように使えます。

### 画像認識モデルの変更 {#changing-the-vision-model}

画像解析に Gemini Flash ではなく GPT-4o を使うには、次のように設定します。

```yaml
auxiliary:
  vision:
    model: "openai/gpt-4o"
```

または、環境変数で指定することもできます（`~/.hermes/.env` に書きます）。

```bash
AUXILIARY_VISION_MODEL=openai/gpt-4o
```

### プロバイダーの選択肢 {#provider-options}

ここにある選択肢は、**補助タスクの設定**（`auxiliary:`、`compression:`）と、メインモデル用のフォールバックのエントリー（`fallback_providers:` または旧来の `fallback_model:`）に適用されます。メインの `model.provider` の設定には適用されません。

| プロバイダー | 説明 | 必要なもの |
|----------|-------------|-------------|
| `"auto"` | 利用できるもののうち最適なもの（既定）。画像認識では OpenRouter → Nous → Codex の順に試します。 | — |
| `"openrouter"` | 常に OpenRouter を使います。どのモデル（Gemini、GPT-4o、Claude など）にも振り分けられます | `OPENROUTER_API_KEY` |
| `"nous"` | 常に Nous Portal を使います | `hermes auth` |
| `"codex"` | 常に Codex OAuth（ChatGPT アカウント）を使います。`model` を明示的に設定してください（例: `gpt-5.4`）。 | `hermes model` → ChatGPT or Codex Subscription |
| `"minimax-oauth"` | 常に MiniMax OAuth（ブラウザーでログイン、API キー不要）を使います。補助タスクには MiniMax-M2.7-highspeed を使います。 | `hermes model` → MiniMax (OAuth) |
| `"xai-oauth"` | 常に xAI Grok OAuth（SuperGrok または X Premium+ の加入者向けのブラウザーログイン、API キー不要）を使います。同じ OAuth トークンで、チャット、TTS、画像、動画、文字起こしをまかなえます。 | `hermes model` → xAI Grok OAuth (SuperGrok / Premium+) |
| `"main"` | 現在有効なカスタムエンドポイントか、メインのエンドポイントを使います。これは `OPENAI_BASE_URL` + `OPENAI_API_KEY` で指定したものか、`hermes model` / `config.yaml` で保存したカスタムエンドポイントです。OpenAI、ローカルモデル、任意の OpenAI 互換 API で使えます。**補助タスク専用です。`model.provider` には指定できません。** | カスタムエンドポイントの認証情報 + base URL |

補助タスクで既定のルーターを通さないようにしたい場合は、メインのプロバイダー一覧にある、API キーで直接つなぐプロバイダーもここで指定できます。たとえば `gmi` は `GMI_API_KEY` を設定すれば使え、`fireworks` は `FIREWORKS_API_KEY` を設定すれば使えます。

```yaml
auxiliary:
  compression:
    provider: "gmi"
    model: "anthropic/claude-opus-4.6"
```

補助タスクを GMI に振り分けるときは、GMI の `/v1/models` エンドポイントが返すモデル ID をそのまま使ってください。Fireworks のモデル ID は、プロバイダー独自のスラッシュ区切りの形式で、たとえば `accounts/fireworks/models/glm-5p2` のようになります。

### よくある構成 {#common-setups}

**カスタムエンドポイントを直接指定する場合**（ローカルやセルフホストの API では、`provider: "main"` よりはっきりした方法です）:
```yaml
auxiliary:
  vision:
    base_url: "http://localhost:1234/v1"
    api_key: "local-key"
    model: "qwen2.5-vl"
```

`base_url` は `provider` より優先されるので、補助タスクを特定のエンドポイントに振り分けるには、これがいちばん明示的な方法です。エンドポイントを直接指定して上書きした場合、Hermes は設定された `api_key` を使い、それがなければ `OPENAI_API_KEY` に切り替えます。このカスタムエンドポイントに `OPENROUTER_API_KEY` を流用することはありません。

**画像認識に OpenAI の API キーを使う場合:**
```yaml
# In ~/.hermes/.env:
# OPENAI_BASE_URL=https://api.openai.com/v1
# OPENAI_API_KEY=sk-...

auxiliary:
  vision:
    provider: "main"
    model: "gpt-4o"       # or "gpt-4o-mini" for cheaper
```

**画像認識に OpenRouter を使う場合**（どのモデルにも振り分けられます）:
```yaml
auxiliary:
  vision:
    provider: "openrouter"
    model: "openai/gpt-4o"      # or "google/gemini-2.5-flash", etc.
```

**Codex OAuth を使う場合**（ChatGPT Pro/Plus アカウント。API キーは不要）:
```yaml
auxiliary:
  vision:
    provider: "codex"     # uses your ChatGPT OAuth token
    model: "gpt-5.4"      # no implicit default on the Codex route
```

**MiniMax OAuth を使う場合**（ブラウザーでログイン。API キーは不要）:
```yaml
model:
  default: MiniMax-M2.7
  provider: minimax-oauth
  base_url: https://api.minimax.io/anthropic
```
`hermes model` を実行して **MiniMax (OAuth)** を選ぶと、ログインしたうえでこの設定が自動で書き込まれます。中国リージョンの場合、base URL は `https://api.minimaxi.com/anthropic` になります。手順の全体は [MiniMax OAuth のガイド](/hermes/docs/guides/minimax-oauth/) を参照してください。

**ローカルモデルやセルフホストのモデルを使う場合:**
```yaml
auxiliary:
  vision:
    provider: "main"      # uses your active custom endpoint
    model: "my-local-model"
```

`provider: "main"` は、Hermes が普段のチャットで使っているプロバイダーをそのまま使います。名前付きのカスタムプロバイダー（例: `beans`）でも、`openrouter` のような組み込みのプロバイダーでも、旧来の `OPENAI_BASE_URL` のエンドポイントでも同じです。

:::tip
メインモデルのプロバイダーに Codex OAuth を使っている場合、画像認識は追加の設定なしで自動的に動きます。画像認識の自動検出で試す候補に、Codex が含まれているためです。
:::

:::warning
**画像認識にはマルチモーダルのモデルが必要です。** `provider: "main"` を設定する場合は、使っているエンドポイントがマルチモーダル（画像認識）に対応していることを確認してください。対応していないと、画像解析は失敗します。
:::

### 環境変数（旧方式） {#environment-variables-legacy}

補助モデルは環境変数でも設定できます。ただし、推奨は `config.yaml` です。管理しやすく、`base_url` や `api_key` を含むすべての設定項目に対応しています。

| 設定 | 環境変数 |
|---------|---------------------|
| 画像認識のプロバイダー | `AUXILIARY_VISION_PROVIDER` |
| 画像認識のモデル | `AUXILIARY_VISION_MODEL` |
| 画像認識のエンドポイント | `AUXILIARY_VISION_BASE_URL` |
| 画像認識の API キー | `AUXILIARY_VISION_API_KEY` |

圧縮とフォールバックのモデルの設定は、config.yaml でしかできません。（`AUXILIARY_WEB_EXTRACT_*` の変数は廃止されました。Web ページの抽出には、もう補助 LLM を使いません。）

:::tip
`hermes config` を実行すると、現在の補助モデルの設定を確認できます。上書きした設定は、既定値と異なる場合にだけ表示されます。
:::

## 推論の深さ {#reasoning-effort}

モデルが応答する前にどれだけ「思考」するかを調整します。

```yaml
agent:
  reasoning_effort: ""   # empty = medium. Options: none, minimal, low, medium, high, xhigh, max, ultra
```

未設定（既定）の場合、推論の深さは「medium」になります。ほとんどのタスクでうまく働く、バランスの取れたレベルです。値を設定すると、これを上書きします。推論を深くするほど複雑なタスクで良い結果が得られますが、そのぶんトークンの消費と待ち時間が増えます。

### 回答の長さ（`text_verbosity`） {#answer-length-textverbosity}

Responses API のモデル（OpenAI の GPT-5 系以降。OpenAI への直接接続、ChatGPT Codex、Azure の各経路）では、推論の深さとは別に、最終的な自然言語の回答をどのくらいの長さにするかを決める設定項目も使えます。

```yaml
agent:
  text_verbosity: ""   # empty = not sent (provider default). Options: low, medium, high
```

Hermes はこの値を、Responses 系の経路でだけ、Responses のトップレベルの `text: {verbosity: ...}` フィールドとして送ります。`chat_completions`、Anthropic、xAI へのリクエストでは送らず、空の値や未知の値のときは何も送りません。`request_overrides` で設定した構造化出力（`text.format`）は、変更されずにそのまま渡されます。

:::note OpenRouter 経由で使う適応型の思考のモデル（Claude 4.6+、Fable/Mythos クラス）
これらのモデルは*適応型*の思考を使うため、通常の `reasoning.effort`
フィールドを受け付けません。OpenRouter も、これらのモデルに対してはこのフィールドを無視します。そこで
Hermes は、`reasoning_effort` の値を代わりに OpenRouter の `verbosity` パラメーター（Anthropic の
`output_config.effort` に対応します）へ自動的に振り分けます。そのため、選んだモデルが対応するレベルの範囲で、同じ推論の深さの設定項目がそのまま使えます。`none`（または未設定）の場合は、モデル自身の適応型の既定の動作に任せます。ネイティブの
Anthropic プロバイダーは最初から推論の深さを直接制御しているので、この影響を受けません。
:::

:::note OpenRouter のモデルと対応する推論の深さのレベル
OpenRouter 経由で振り分けられるほかのモデルについては、Hermes は最新のモデルカタログにある推論のメタデータ（`supported_parameters` とモデルごとの
`reasoning.supported_efforts`）を読みます。そのうえで、推論の制御をそもそも送るかどうかを決め、指定された推論の深さを、その経路が実際に対応しているもっとも近いレベルに合わせます（合わせる方向は常に下向きです。たとえば
`high` までしかない経路では `ultra` は `high` になり、知らないうちに引き上げられることはありません）。推論に対応した新しいベンダーも、Hermes
の更新を待たずに自動で使えます。カタログに接続できない場合やモデルが載っていない場合、Hermes は組み込みのモデルファミリーの一覧に切り替え、指定された推論の深さを変えずにそのまま渡します。
:::

:::note `ultra` は経路が受け付ける最上位のレベルに変換
`ultra` は Hermes の内部だけにある段階です。どのプロバイダーも実際のリクエストでこの値を受け付けないため、どの経路でも、その経路で最上位のレベルに変換されます（GPT-5.6 Codex と OpenAI 互換の経路では `max`、それより古い Codex のモデルでは `xhigh`）。推論の深さを選ぶメニューと `/reasoning` の状態表示には、これが
`ultra (sends max on this route)` と表示されるので、画面に見えているレベルと実際に送られるレベルが一致します。
:::

`/reasoning` コマンドを使えば、実行中に推論の深さを変更することもできます。

```
/reasoning                # Show current effort level and display state
/reasoning high           # Set reasoning effort to high (this session only)
/reasoning high --global  # Set effort and persist to config.yaml
/reasoning none           # Disable reasoning (this session only)
/reasoning show           # Show model thinking above each response
/reasoning hide           # Hide model thinking
```

推論の深さの変更は、既定ではそのセッションだけに適用されます。`--global` を付けると、新しいレベルが
`agent.reasoning_effort` の既定値として保存されます。

#### モデルごとの推論の深さの上書き {#per-model-reasoning-overrides}

モデルごとに異なる推論の深さを設定できます。複雑なタスク向けのモデルでは推論を深く、速いモデルでは中程度に、と使い分けたいときに便利です。

```yaml
agent:
  reasoning_effort: "medium"       # global default
  reasoning_overrides:
    "openrouter/anthropic/claude-opus-4.5": "xhigh"
    "openai/gpt-5": "low"
    "claude-sonnet-4.6": "high"    # bare model name also works
```

キーの照合は**表記の違いに寛容**です。妥当な書き方であれば一致します。
- `claude-opus-4.5`、`claude-opus-4-5`、`claude-opus.4.5`（ドットとハイフンは区別されません）
- `anthropic/claude-opus-4.5`、`openrouter/anthropic/claude-opus-4.5`（プロバイダーの接頭辞は省略可能）
- 名前付きのカスタムプロバイダーを先頭に付けたキー（`ollama-local/qwen3.6:27b-q4_k_m`）は、リクエストにモデル ID だけ（`qwen3.6:27b-q4_k_m`）が入っている場合にも適用されます。フォールバックのエントリーや `providers:` の経路が送るのは、このモデル ID だけの形です
- 完全に一致するキーは、表記違いで一致するキーより優先されます

#### カスタムの推論ティア名 {#custom-reasoning-tier-names}

OpenAI 互換のエンドポイントの中には、標準の段階の外にある思考のティアを用意しているものがあります（`low`…`max` の代わりに `fast`/`thinking` を受け付ける中継サーバーなど）。段階の外にある文字列をそのまま書くと `Unknown reasoning_effort '<value>', using default (medium)` というメッセージとともに拒否されるので、打ち間違いが実際のリクエストに載ることはありません。プロバイダー独自のティア名を指定するには、明示的な辞書（dict）形式を使います。`effort` の値が、トップレベルの `reasoning_effort` フィールドとしてそのまま送られます。

```yaml
agent:
  reasoning_effort:
    enabled: true
    effort: thinking            # sent as-is
  reasoning_overrides:
    "my-relay/lumo-max":        # dict form works per model too
      enabled: true
      effort: fast
```

辞書形式で `enabled: false` にすると、`reasoning_effort: none` と同じく思考がオフになります。

辞書形式は `config.yaml` を直接編集して設定します。`/reasoning` のメニュー、`hermes model`、ダッシュボードの補助モデルの選択画面には、標準の段階しか表示されないためです（ただし、一度設定すれば、TUI の状態表示とセットアップウィザードにはカスタムのティア名が表示されます）。

:::note
モデル ID にはドットが含まれます（`claude-opus-4.5`、`qwen3.6:27b`）が、`hermes config set` はドットを階層の区切りとして扱います。キーを文字どおりに書き込むには、`hermes config set 'agent.reasoning_overrides.ollama-local/qwen3\.6:27b-q4_k_m' low` のようにドットをバックスラッシュでエスケープするか、YAML を直接編集してください。詳しくは [キー名の中のドット](/hermes/docs/reference/cli-commands/#dots-inside-key-names) を参照してください。
:::

:::note OpenAI Responses（`openai-api`、`openai-codex`）
`reasoning_effort: none` は、それを受け付けるモデル（GPT-5.x）では `reasoning.effort: "none"` として明示的に送られます。フィールドを省くと、モデルの既定の推論の深さが有効なままになるからです（GPT-5.6 の既定は `medium`）。フィールドを省くのは、推論の深さが未設定の場合だけです。`api.openai.com` のチャット世代のモデル（`gpt-4o`、`gpt-4.1`、それらの `-mini` 版やファインチューニング版）は `reasoning` パラメーターを一切受け付けないため、Hermes はこれらのモデルには、設定された推論の深さにかかわらず推論のパラメーターを送りません。こうして `400 Unsupported parameter: 'reasoning.effort'` で失敗するのを避けます。モデルが `none` を拒否した場合、Hermes は警告を出し、そのセッションでは推論の無効化をやめて、モデルの既定値で再試行します。
:::

:::note ローカルの OpenAI 互換エンドポイント
カスタムの `base_url`（`http://localhost:11434/v1`、vLLM、SGLang、ルーターのエンドポイント）には、最終的に決まった推論の深さ（`agent.reasoning_effort`、または一致したモデルごとの上書き）が、標準のトップレベルの `reasoning_effort` リクエストフィールドとして送られます。値は、OpenAI 互換の送信形式が受け付ける範囲（`none`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max`）に合わせられます。未設定の場合も、ここでは `medium` として送られます。Nous Portal や OpenRouter の経路で適用されるのと同じ既定値です。フィールドを省くと選択をエンドポイントに任せることになり、ホスティングされた推論モデル自身の既定値は、そのモデルの最高レベルになっていることがあるからです（kimi-k3 の既定は `max` で、推論トークンも待ち時間も `medium` の約3倍になります）。カタログか `model_overrides` で `supports_reasoning: false` とされているモデル、`thinking` の機能なしで取得したローカルの Ollama モデル、そしてエンドポイントがこのフィールドに `400` を返したあとのそのセッションの残りでは、このフィールドは送られません。入れ子の `reasoning` オブジェクトは、受け付けることがわかっているエンドポイント（Nous Portal、OpenRouter の推論対応モデル、GitHub Models）にだけ使います。それ以外のサーバーは、未知のフィールドを HTTP 400 で拒否するためです。サーバーが思考の上限を別のフィールド（Ollama の `think`、vLLM の `chat_template_kwargs`、ルーター固有のキー）から読む場合は、カスタムプロバイダーの [`extra_body`](/hermes/docs/integrations/providers/#named-custom-providers) に設定してください。そこに振り分けられるすべてのリクエストにマージされます。
:::

**決定の優先順位:**

1. `/reasoning --session` によるセッション単位の上書き（ゲートウェイのみ）
2. `agent.reasoning_overrides` によるモデルごとの上書き（表記の違いに寛容）
3. 全体設定の `agent.reasoning_effort`
4. プロバイダーの既定値

この上書きは、次のすべての場面で自動的に適用されます。CLI の起動時、`hermes -p` の単発実行、メッセージングゲートウェイ、Desktop/TUI、ACP のセッション、cron ジョブ、`/model` によるセッション途中の切り替え（最初のメッセージより前に行った切り替えも含む）、セッションの再開（`--resume`、`/resume`）、`/new`、フォールバックモデルが有効になったときです。

## Fast モード {#fast-mode}

Fast モードは、割増料金と引き換えに、プロバイダーへより速い出力を求める機能です。対象は OpenAI の [Priority Processing](https://openai.com/api-priority-processing/)（`service_tier: priority`）、Grok 4.6 での xAI の Priority Processing、Anthropic の [Fast Mode](https://platform.claude.com/docs/en/build-with-claude/fast-mode)（`speed: fast`、Opus 4.8 / Opus 5 / Opus 5.5 のみ）です。**既定ではオフ**です。

```yaml
agent:
  service_tier: ""          # "" / normal | fast | auto | cold
  fast_auto_seconds: 60     # window for auto / cold
```

| モード | fast のパラメーターを送るタイミング | 向いている使い方 |
|------|---------------------------|------------|
| `normal`（既定、`""`） | 送らない | 料金が最も安く、レイテンシは標準です |
| `fast` | すべてのリクエスト | 常に速さが欲しい、長い対話型のセッション |
| `auto` | **毎回の**ターンの最初の `fast_auto_seconds` 秒間のリクエスト | 最初の返信を素早く返したいとき。長いツールのループでは標準料金に切り替わります |
| `cold` | 同じ時間枠。ただし、セッションの**最初のターン**（それまでの履歴がない状態）だけ | 会話の最初の返信を速くし、その後は標準料金にしたいとき |

`/fast normal|fast|auto|cold` で、そのセッションのモードを切り替えます。`--global` を付けると `config.yaml` に保存され、次回以降も使われます。`/fast` だけを実行すると、現在のモードを表示します。

**料金の注意:** どちらのプロバイダーも、fast のリクエストには標準料金に倍率を掛けた額を請求します（Anthropic の場合、入力／出力それぞれ 100万トークン（MTok）あたり、Opus 5.5 で $8 / $40、Opus 5 と Opus 4.8 で $10 / $50）。この割増はプロンプトキャッシュの料金と重ねて適用されます。Hermes は Anthropic の応答ごとに、API が `usage.speed` で報告する速度をもとに料金を計算します。`auto`/`cold` を使うと、割増がかかるのは時間枠の中だけになります。fast のパラメーターは、それに対応した提供元直営のエンドポイント（`api.openai.com` / Codex のサブスクリプション、`api.anthropic.com`、`api.x.ai`）にだけ送られます。OpenRouter、Nous Portal、Copilot、Azure、Bedrock、カスタムの `base_url` の経路には、どのモードでも送られません。

**プロンプトキャッシュ:** リクエストごとに変わるのはリクエスト単位のこのパラメーターだけで、システムプロンプト、ツール、メッセージはバイト単位で同一のままです。ただし Anthropic は速度ごとに別々のプロンプトキャッシュを持つので、Anthropic では `auto`/`cold` の時間枠の境目のたびに、会話の先頭部分が新しい速度で書き直されます。Anthropic で長いセッションを続けるなら、`fast` か `normal` にしておくと、温まったキャッシュを1つに保てます。

Fast モードで速くなるのは1秒あたりの出力トークン数なので、長い回答ほど効果が大きくなります。

Anthropic の組織にそのモデルの Fast モードの枠がない場合（API が fast のリクエストに、Fast モードの上限が 0 だと答えた場合）、Hermes はそのセッションの残りの間、そのモデルを標準の速度に切り替えてリクエストを再試行します。

### ゲートウェイやプロキシ経由での Fast のティア {#fast-tiers-behind-a-gateway-or-proxy}

提供元直営のエンドポイントにだけ送るというルールは、意図してそうしています。Fast のティアを指定するパラメーターは課金の指示なので、Hermes は料金表を把握しているエンドポイントにだけ送ります。独自の優先ティア（独自の `service_tier` の値や、名前の違うフィールド）を用意している OpenAI 互換のゲートウェイ、ルーター、プロキシを運用している場合は、`agent.service_tier` ではなく、そのプロバイダーの `extra_body` で指定してください。[名前付きのカスタムプロバイダー](/hermes/docs/integrations/providers/#named-custom-providers) の `extra_body` は、そのエンドポイントに振り分けられる**すべての** chat-completions リクエストにマージされます。ゲートウェイのターンをまたいでも、`/fast` で切り替えても残り、`/model` でそのプロバイダーから別へ移ると外れます。

```yaml
providers:
  my-gateway:
    api: https://gateway.example.com/v1
    key_env: MY_GATEWAY_KEY
    default_model: fast-lane-model
    extra_body:
      service_tier: priority     # whatever tier value your gateway documents
```

`agent.service_tier` との違い: そのプロバイダーではこのティアが常に有効になります（`auto`/`cold` の時間枠はありません）。`/fast` では切り替わりません。また、Hermes は値を検証しません。何を受け付け、何を課金するかはゲートウェイが決めます。

## ツール使用の強制 {#tool-use-enforcement}

一部のモデルは、ツールを呼び出す代わりに、これから行う操作を文章で説明してしまうことがあります（実際にターミナルを呼び出さずに「テストを実行します...」と書くなど）。ツール使用の強制は、システムプロンプトに指示を注入し、モデルが実際にツールを呼び出すように引き戻します。

```yaml
agent:
  tool_use_enforcement: "auto"   # "auto" | true | false | ["model-substring", ...]
```

| 値 | 動作 |
|-------|----------|
| `"auto"`（既定） | 名前が次のいずれかに一致するモデルで有効になります: `gpt`、`codex`、`gemini`、`gemma`、`grok`、`glm`、`qwen`、`deepseek`、`muse`。それ以外のモデル（例: Claude）では無効です。 |
| `true` | モデルに関係なく常に有効です。今のモデルが操作を実行せずに説明ばかりしていると気づいたときに役立ちます。 |
| `false` | モデルに関係なく常に無効です。 |
| `["gpt", "codex", "qwen", "llama"]` | モデル名に、列挙した部分文字列のいずれかが含まれる場合だけ有効です（大文字と小文字は区別しません）。 |

### 注入される内容 {#what-it-injects}

有効にすると、システムプロンプトに2層の指示が追加されることがあります。

1. **一般的なツール使用の強制**（一致したすべてのモデル） — 意図を説明する代わりにすぐツールを呼び出すこと、タスクが完了するまで作業を続けること、これから行動するという約束でターンを終えないことをモデルに指示します。

2. **Google 向けの運用指示**（Gemini と Gemma のモデルのみ） — 簡潔さ、絶対パスの使用、ツールの並列呼び出し、編集前に確認するパターンです。

これらはユーザーの目には触れず、影響するのはシステムプロンプトだけです。もともと確実にツールを使うモデル（Claude など）にはこの指示は不要なので、`"auto"` ではそうしたモデルを対象から外しています。

### 有効にする場面 {#when-to-turn-it-on}

既定の自動リストにないモデルを使っていて、実際に操作する代わりに何を*するつもりか*をたびたび説明していると気づいたら、`tool_use_enforcement: true` を設定するか、そのモデル名の部分文字列をリストに追加してください。

```yaml
agent:
  tool_use_enforcement: ["gpt", "codex", "gemini", "grok", "my-custom-model"]
```

## 実行規律の指示 {#execution-discipline-guidance}

ツール使用の強制とは別に、Hermes は、評価のトレースで観察された一連のエージェント特有の失敗パターンを共通して持つモデルファミリーに向けて、**実行規律**のブロックを注入します。その失敗パターンとは、計算をコードではなく文章の中で行う、外部への書き込みのあとに読み返して確かめるのを省く、形式の崩れた識別子を「修復」してしまう、件数が合わないのに全部そろったと主張する、受け入れ条件をすべて確かめないまま「完了」と宣言する、というものです。

```yaml
agent:
  execution_guidance: "auto"   # "auto" | true | false | ["model-substring", ...]
```

| 値 | 動作 |
|-------|----------|
| `"auto"`（既定） | 名前が次のいずれかに一致するモデルで有効になります: `gpt`、`codex`、`grok`、`deepseek`、`kimi`、`qwen`、`glm`、`minimax`、`mimo`、`mistral`、`muse`。 |
| `true` | モデルに関係なく常に有効です。 |
| `false` | モデルに関係なく常に無効です。 |
| `["deepseek", "my-custom-model"]` | モデル名に、列挙した部分文字列のいずれかが含まれる場合だけ有効です（大文字と小文字は区別しません）。 |

注入されるブロックの内容:

- **ツールを使い続ける** — タスクが完了し、*かつ*検証が済むまでツールを呼び出し続けます。検索結果が空、一部だけ、または不自然に狭い場合は、結論を出す前に、範囲を広げたり別のクエリに変えたりして再試行します。
- **ツール使用の義務化** — 計算、ハッシュ、日付、システムの状態、ファイルに関する事実は、必ずツールから得ます。頭の中の計算に頼ることはありません。
- **外部への書き込みの読み返し** — 外部システムの状態を変える書き込みをしたら、成功を主張する前に、書き込んだ対象そのものを読み返します（ツールがすでに確認した内部ファイルの編集は再確認しません）。
- **件数の照合** — 示された合計値（`total`、`reply_count`、`has_more`）は厳密な前提として扱います。合わなければ、取得し直すか、プログラムで解析します。
- **リテラルの保持** — 指定された形式に合わない識別子を、正規化したり「修復」したりしません。検索が成功しても、形式の崩れた元のトークンが正しいことにはなりません。
- **検証を条件とした完了** — 「完了」とは、名前の挙がった受け入れ条件がすべて確認済みであることを指し、それらしい一部だけを満たした状態ではありません。

このゲートは `tool_use_enforcement` とは独立しています。どちらか一方だけを有効にしてもかまいません。指示はセッション開始時にモデル名をもとに一度だけ選ばれるので、システムプロンプトは会話が続くあいだバイト単位で変わらず、プロンプトキャッシュも効いたままです。Gemini/Gemma は、より具体的な Google 向けの運用指示を受け取るため、自動リストから外しています。Claude はこうした失敗パターンを示さないため外しています。どのモデルでも、`true` か部分文字列のリストを指定すれば明示的に有効にできます。

## ツールループのガードレール {#tool-loop-guardrails}

Hermes は、エージェントが成果の出ないツール呼び出しのループにはまった状態を検知します。同じツール呼び出しが繰り返し失敗する、同じツールが何度も失敗する、冪等な呼び出しが進展のないまま同じ結果を返す、といった状態です。既定では、モデルが自分で軌道修正できるよう、ツールの結果に**警告**を注入します。対話型の CLI、TUI、Desktop、ACP のセッションは、人が介入できるので警告だけにとどめます。無人で動くゲートウェイや cron のセッションでは、既定で強制停止が有効です。

プラットフォームに応じたこの既定の動作は、無人のデプロイでは無効にできます。逆に、すべてのプラットフォームで強制停止を明示的に有効にすることもできます。

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

`hard_stop_enabled` は、すべてのプラットフォームで強制停止を明示的に有効にします。これが `false` のままでも、`non_interactive_hard_stop_enabled` によって、無人のゲートウェイや cron のようなプラットフォームでは強制停止が有効になります。一方、CLI、TUI、Desktop、ACP、サブエージェント、`api_server` での実行（親やクライアントが生きていて見守られているタスクループ）では、警告だけの動作が保たれます。無人のデプロイでこれを無効にするには、`non_interactive_hard_stop_enabled: false` を設定してください。関連ページ: [Docker / 無人のデプロイ](/hermes/docs/user-guide/docker/)。

強制停止は**リプレイ**、つまり同じ呼び出しが何も変わらず、あいだに何も起きないまま繰り返されるケースを捕まえるためのものです。正当な試行の繰り返しは対象にしません。

- **編集してから再実行するのは、ループではありません。** 変更を伴う呼び出し（`write_file`、`patch`、成功した `terminal`/`execute_code`、ブラウザーの操作、ジョブ／メッセージ／cron の変更）が成功すると、まだ数えられている失敗中の呼び出しすべてに「進展あり」の印が付きます。その次の同一の再試行（修正後に失敗していたテストを再実行する、クリック後にスナップショットを取り直す）は、ブロックに向けて積み上がるのではなく、新しい連続として数え直されます。
- **中身の違う失敗コマンドは診断であって、ループではありません。** 0以外の終了コードが普通の出力であるツール（`terminal`、`execute_code`、プロセスのポーリング用ツール、`browser_navigate`、`web_extract`）では、`same_tool_failure` のしきい値は警告を出すだけで、停止はさせません。これらを止められるのは、あいだに変更がないまま引数まで完全に同じ呼び出しを繰り返した場合か、同一の結果が続いた場合だけです。
- **停止で終わるのはターンであって、セッションではありません。** エージェントは、どのガードレールがなぜ作動したかを返信します。「continue」と返信すると、ターンごとのカウンターを新しくして再開します。

### ターンごとの暴走ループの上限 {#per-turn-runaway-loop-caps}

上記の失敗にもとづくしきい値とは別に、`loop_caps` は、1回のエージェントループ（ターン）で実行できる `web_search` の呼び出し回数と、サブエージェントの起動数に絶対的な上限を設けます。カウンターは毎ターンの開始時にリセットされるので、複数ターンにわたる正当なセッションが足止めされることはありません。一方、1つのターンが際限のない検索や委任のループに陥った場合は止められます。これらは常に有効で、`hard_stop_enabled` に関係なく作動します。1つのターンで何十回も Web 検索をしたり、何十ものサブエージェントを起動したりするのは、それだけで明らかに異常なので、既定値は低めにしてあります。上限に達すると、原因となったツール呼び出しは理由を説明するメッセージ付きでブロックされ、ターンは反復回数の上限の残りを使い切ることなく、きれいに停止します。どちらかの値を `0` にすると、その上限を完全に無効にできます。

1回の `delegate_task` のバッチでは、各タスクがそれぞれ `max_subagents` に数えられます（3件のバッチなら3つ分を消費します）。そのため、この上限は `delegate_task` の呼び出し回数ではなく、実際に起動したサブエージェントの数を追跡します。

これは Claude Code のセッションごとの WebSearch とサブエージェントの上限（v2.1.212）にならったものです。こちらも既定値は200で、`/clear` でリセットされます。

### 実行時の停滞防止ガード {#runtime-anti-stall-guards}

上記の失敗にもとづくガードレールを補うものとして、`agent.stall_guards`（既定は `true`）は、無駄なターンを防ぐ控えめな実行時のガードを2つ有効にします。1つ目は**同一呼び出しのループブレーカー**です。同じツールが同じ引数で3回以上連続して呼び出され、*かつ*同じ結果を返した場合、その呼び出しを繰り返さないようモデルに伝える1行の短い通知を、そのツールの結果に追加します。警告だけのセッションでは呼び出しをブロックすることはなく、正当に繰り返してよいポーリング用ツール（`process_manage`、`*_get_result`、`*_poll`）は対象外です。強制停止が有効な場合（`hard_stop_enabled` を明示的に有効にしたとき、または無人のゲートウェイや cron のプラットフォーム）は、同一の呼び出しの連続が `hard_stop_after.idempotent_no_progress` 回に達した時点で強制停止にもなります。これは `idempotent_no_progress` のガードレールが追跡する読み取り専用のツールに限らず、**あらゆる**ツールが対象です。そのため、成功した同じ `terminal` や `skill_view` の呼び出しを繰り返すモデルは、反復回数の上限を使い切る前に停止されます（`identical_call_streak_halt`）。2つ目は**続行の意図からの回復**です。モデルがツールを呼び出さずにターンを終えたのに、短い返信が操作を予告したまま途切れている場合（「では、ファイルを更新します…」）、Hermes は intent-ack の回復と同じ回数制限付きの続行の仕組み（1ターンにつき再プロンプトは最大2回）で、モデルに実行を促し直します。どちらもキャッシュを崩しません（通知は結果を組み立てる時点で追加され、後からさかのぼって追加されることはありません）。両方まとめて無効にするには次のようにします。

```yaml
agent:
  stall_guards: false
```

同じゲートは**結果参照のスタブ化**も有効にします。同一のツール呼び出しを再度発行して、バイト単位で同一の新しい結果が返った場合、重複した内容は出力全体を繰り返す代わりに、前の結果を指す短い参照スタブ（ツール名、`tool_call_id`、引数の要約、そして最初の結果がディスクに保存されていればその退避先のパス）としてコンテキストに入ります。ツール自体は毎回実行されるので、ポーリングとしての意味は保たれます。結果が変わっていれば、必ず全体がそのまま渡ります。512文字未満の結果、エラーの結果、マルチモーダルの結果はスタブ化されません。一方、ポーリング用ツールの結果はスタブ化*されます*（変化のないポーリング結果こそ、重複した内容が何の情報も持たないケースだからです）。

### ターンの生存監視 {#turn-liveness-watchdog}

`agent.turn_liveness` は、会話のターンが**目に見える進展のない**状態をどれだけ続けてよいかに上限を設け、それを超えると Hermes が強制的に回復させます。この監視役は活動の時計（API の待機、ストリームのトークン、ツールのハートビートを記録するのと同じ信号で、リース（占有権）の更新は数えません）を基準にします。そのため、処理の途中で音もなく固まったターン（issue #95548 で観測されたもの: ツールの実行も API 呼び出しもエラーもないのに、セッションがいつまでも「busy」のまま）は、はっきりと表に出され、中断されて、再試行できる中断済みのターンとして巻き戻されます。中断しても固まった状態が解けない場合は、そのターンの永続的なリースの更新が止まります。これにより、プロセスが kill されるまで止まったままになるのではなく、停滞したターンの後片付けがそのセッションを回収できるようになります。

```yaml
agent:
  turn_liveness:
    timeout_s: 600.0   # idle bound; <= 0 disables the watchdog
    poll_s: 15.0        # sampling interval (seconds)
```

正当に時間のかかる作業が不利に扱われることはありません。ストリーミングの応答、ツールのハートビート（ツールの実行中は30秒ごと）、承認待ちは、いずれも時計を更新し続けるので、上限の時間いっぱい進展が*まったく*ないターンだけが監視役を作動させます。無効な値（打ち間違い、`NaN`、`Inf`、正でない `poll_s`）は警告をログに出して既定値に切り替わります。起動を失敗させたり、監視役を黙って無効にしたりすることはありません。作動した中断は、回復を始める時点で停滞を報告し、中断が実際に確定してから初めて、中断された／リースが止まったという最終的な結果を公表します。

## TTS の設定 {#tts-configuration}

```yaml
tts:
  provider: "edge"              # "edge" | "elevenlabs" | "openai" | "minimax" | "mistral" | "gemini" | "xai" | "neutts" | "kittentts" | "piper" | "deepinfra"
  speed: 1.0                    # Global speed multiplier (fallback for all providers)
  keep_warm_seconds: 60         # Keep a local engine loaded this long after the last speech toggle turns off (0 = unload at once)
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
    pcm_sample_rate: 24000      # Streaming PCM rate; overridden by the endpoint's X-Audio-Sample-Rate header
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

これは `text_to_speech` ツールと、音声モード（CLI またはメッセージングゲートウェイでの `/voice tts`）での音声による返信の両方を制御します。

**速度のフォールバックの順序:** プロバイダーごとの速度（例: `tts.edge.speed`）→ 全体の `tts.speed` → 既定値の `1.0`。すべてのプロバイダーで同じ速度にするには全体の `tts.speed` を設定し、細かく調整したいときはプロバイダーごとに上書きしてください。

## 表示設定 {#display-settings}

```yaml
display:
  tool_progress: all      # off | new | all | verbose
  tool_progress_command: false  # Enable /verbose slash command in messaging gateway
  focus_view: false       # CLI focus view (/focus) — reduced output, display-only
  platforms: {}           # Per-platform display overrides (see below)
  interim_assistant_messages: true  # Gateway: send natural mid-turn assistant updates as separate messages
  suppress_warning_notifications: false  # Opt-in: hide automatic warning/diagnostic notices (see messaging guide)
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

### ターンごとの要約とスピナーのトークン表示 {#per-turn-summary-and-spinner-token-flow}

`display.turn_summary`（既定は `true`）は、**対話型の CLI** の各ターンのあとに、そのターンで実際に何をしたかをまとめた集計を、薄い色の1行で表示します。

```
⋯ 12.4s · edited 2 files +18 -3 · read 4 files · ran 3 commands
```

この集計は、CLI がすでに受け取っているツールの進捗情報から数えるので、追加のコストはかかりません。詳細:

- 経過時間は、そのターンに実際にかかった時間です（1分を超えると `2m05s` の形になります）。
- ツール呼び出しは動詞（`edited`、`read`、`ran`、`searched` など）ごとにまとめられ、複数形も正しく付きます。専用の動詞が用意されていないプラグインや MCP のツールは、`called N tools` にまとめられます。
- 行の増減を示す `+X -Y` は、ツールの結果がすでに差分を報告している場合（現在は `patch`）だけ表示されます。Hermes はこれを計算するために git を呼び出すことはないので、`write_file` による編集は増減なしで数えられます。
- **失敗したツール呼び出しは数えません。** 拒否された書き込みが、成功した編集として表示されることはありません（これを補う警告については [ファイル変更の検証](#file-mutation-verifier) を参照してください）。
- 長いターンでは、動詞の区切りを4つまでに抑え、残りを `+N more` とまとめるので、行が折り返されることはありません。
- ツール呼び出しがなく、すぐに終わったターンでは、何も表示しません。

`display.spinner_token_flow`（既定は `true`）は、実行中のターンで累計した出力トークン数を、CLI のスピナーの経過時間表示に追加します。

```
  ⚡ Reading cli.py  (  2.3s · ↓ 1.2k tok)
```

この数はターンごとです（ターン開始時点のセッション合計を基準値にして、そこからの増分を数えます）。ターン内の各 API 呼び出しが使用量を報告するたびに更新されます。最初の使用量の報告が届くまでは何も表示されないので、誤解を招く `↓ 0 tok` が表示されることはありません。

どちらのキーも表示のためだけのもので、CLI 専用です。静音モード、`display.tool_progress` が `off` のとき、単発クエリや `-Q` のバッチ実行、ゲートウェイやメッセージングの画面では表示されません（これらの画面では代わりに `display.runtime_footer` を使います）。どちらかのキーを `false` にするとオフになります。

### ファイル変更の検証 {#file-mutation-verifier}

`display.file_mutation_verifier` が `true`（既定）のとき、ターン中に `write_file` または `patch` の呼び出しが失敗し、その後ターンが終わるまでに対象ファイルへの書き込みが（どのパス表記でも）成功せず、ディスク上でほかの方法で変更されてもいなかった場合、Hermes はアシスタントの最終回答に1行の注意書きを追加します。これにより、「並列のパッチをまとめて当てたら半分が黙って失敗し、モデルは成功したとまとめる」といった種類の過大な報告を、編集のたびに手作業で `git status` を実行しなくても見つけられます。

フッターの例:

```
⚠️ File-mutation verifier: 3 file edit(s) FAILED this turn despite any wording above that may suggest otherwise. Run `git status` or `read_file` to confirm what actually landed.
  • concepts/automatic-organization.md — [patch] Could not find match for old_string
  • concepts/lora.md — [patch] Could not find match for old_string
  • concepts/rag-pipeline.md — [patch] Could not find match for old_string
```

フッターを表示しないようにするには、`file_mutation_verifier: false`（または `HERMES_FILE_MUTATION_VERIFIER=0`）を設定します。この検証が作動するのは、ターンの終了時点で実際の失敗が残っている場合だけです。失敗したパッチをモデルが同じターン内で再試行して成功した場合、そのファイルについては作動しません。

**モデルの要約より、この検証の結果を信じてください。** このフッターは、アシスタントの締めくくりのメッセージがタスクは完了したと言っていても、一覧にある編集の呼び出しが**失敗**し、その後 Hermes がそれらのファイルへの変更を確認できなかったことを意味します。追跡しているのは `write_file`/`patch` の実行記録と、ターン終了時の更新日時の確認だけなので、実際に何が反映されたかは `git status` か `read_file` で確かめてください。よくある原因:

- **書き込みの拒否** — パスが認証情報の拒否リストに入っているか、`HERMES_WRITE_SAFE_ROOT` の外にあります（[ファイル書き込みの安全性](/hermes/docs/user-guide/security/#file-write-safety) を参照）
- **パッチの不一致** — `old_string` がディスク上のファイルと一致しませんでした
- **構文チェック** — 書き込む前の内容が JSON/YAML/TOML の検証で不合格になりました

書き込みがブロックされたときのフッターの例:

```
⚠️ File-mutation verifier: 2 file edit(s) FAILED this turn despite any wording above that may suggest otherwise. Run `git status` or `read_file` to confirm what actually landed.
  • ~/.hermes/cron/jobs.json — [patch] Write denied: '…' is outside HERMES_WRITE_SAFE_ROOT (/path/to/project)
  • ~/.hermes/scripts/monitor.py — [write_file] Write denied: '…' is outside HERMES_WRITE_SAFE_ROOT (/path/to/project)
```

Hermes の状態（cron のジョブ、スキル、`~/.hermes/` 以下のスクリプト）への書き込みが失敗している場合は、環境に `HERMES_WRITE_SAFE_ROOT` が設定されていないか確認してください。cron を変更するときは、`jobs.json` を直接パッチするのではなく、`cronjob_manage` ツールか `hermes cron edit` を使ってください。

### 静的なメッセージの UI 言語 {#ui-language-for-static-messages}

`display.language` は、ユーザーに表示される決まった文言のうち、ごく一部を翻訳する設定です。対象は CLI の承認の確認と、ゲートウェイのスラッシュコマンドへの返信のいくつか（例: 再起動前の処理待ち（drain）の通知、「approval expired」、「goal cleared」）です。エージェントの応答、ログの行、ツールの出力、エラーのトレースバック、スラッシュコマンドの説明は翻訳**しません**。これらは英語のままです。エージェント自身に別の言語で返答させたいときは、プロンプトかシステムメッセージでそう伝えてください。

対応している値: `en`（既定）、`zh`（簡体字中国語）、`zh-hant`（繁体字中国語）、`ja`（日本語）、`de`（ドイツ語）、`es`（スペイン語）、`fr`（フランス語）、`tr`（トルコ語）、`uk`（ウクライナ語）、`af`（アフリカーンス語）、`ko`（韓国語）、`it`（イタリア語）、`ga`（アイルランド語）、`pt`（ポルトガル語）、`ru`（ロシア語）、`hu`（ハンガリー語）。認識できない値を指定すると英語に切り替わります。

`HERMES_LANGUAGE` 環境変数を使えば、セッションごとに設定することもできます。この環境変数は設定ファイルの値を上書きします。

```yaml
display:
  language: zh   # CLI approval prompts appear in Chinese
```

| モード | 表示される内容 |
|------|-------------|
| `off` | 表示なし。最終的な応答だけ |
| `new` | ツールが変わったときだけツールの表示を出す |
| `all` | すべてのツール呼び出しを短いプレビュー付きで表示（既定） |
| `verbose` | 引数と結果の全文、デバッグログ |

CLI では、`/verbose` でこれらのモードを順に切り替えられます。メッセージングプラットフォーム（Telegram、Discord、Slack など）で `/verbose` を使うには、上の `display` セクションで `tool_progress_command: true` を設定してください。設定すると、このコマンドでモードが切り替わり、設定ファイルにも保存されます。

ツールの進行状況を表示するには、進行状況の更新を安全に表示できるゲートウェイのアダプターが必要です。Signal など、メッセージの編集に対応していないプラットフォームでは、`/verbose` で `off` 以外のモードを保存しても、ツールの進行状況の吹き出しは表示されません。

`off` で隠れるのは、ツール呼び出しの*装飾*だけです。Desktop アプリと TUI で独自の表示を持つアプリケーションの状態、つまりタスクリスト（`todo_list`）、サブエージェントの進行状況、確認の質問（clarify）、MCP の同意カードは、この設定に関係なく表示され続けます。

### フォーカスビュー（`/focus`、CLI + TUI） {#focus-view-focus-cli-tui}

`display.focus_view: true` で**フォーカスビュー**が有効になります。途中経過の実況ではなく答えだけが欲しいときのための、出力を絞った表示モードです。抑制のための別の経路を設けるのではなく、同じ `tool_progress` の仕組みの上にかぶせた薄い層として動きます。

- 有効にすると `tool_progress` が `off` に固定され、それまでのモードは `display.focus_saved_tool_progress` に保存されます。
- `/focus off` でそのモードがそのまま復元されるので、`/verbose verbose` の設定もオンとオフを往復したあとに残ります。
- 完了した各ターンの最後には、薄い色で復元の案内の行（`⋯ 7 tool lines hidden · /focus off to show`）が出ます。この行数は*フォーカス前*のモードを基準に数えるので、もともとオフにしていた行まで隠したことにはなりません。
- ステータスバー（prompt_toolkit の CLI と Ink の TUI の両方）には `◉ focus` のバッジが常に表示されるので、出力を絞ったモードになっていることが見えなくなることはありません。
- フォーカスがオンのときに `/verbose` でモードを切り替えると、モードの管理が `/verbose` に戻り、バッジは消えます。

フォーカスビューは**表示だけ**に作用します。会話の履歴、システムプロンプト、ツールのスキーマ、リクエストのペイロードは一切編集しません。隠れた詳細は画面に出ないだけで捨てられることはなく、プロンプトキャッシュにもまったく影響しません。

### ステータスバーのフィールド選択（CLI/TUI） {#status-bar-field-selection-clitui}

CLI/TUI の下部にある対話型のステータスバーには、モデル、コンテキストの使用量、圧縮の回数、バックグラウンドの処理のカウンター、タイマー、モードのバッジが表示されます。`display.status_bar.fields` で、このうちどれを表示するかを選べます。最小限のバー（モデルと経過時間だけ）にしたいときや、明示的に有効にしたときだけ出るセッションのトークン合計を表示したいときに便利です。

```yaml
display:
  status_bar:
    fields: ["model", "duration", "total_tokens"]   # visibility only; built-in order is preserved
```

対応しているフィールド: `model`、`context_detail`（使用済み／合計のトークン数）、`context_pct`（パーセントとメーター）、`cache_hit`（プロンプトキャッシュのヒット率。モデルの切り替えと圧縮でリセットされます）、`latency`（直近10回の呼び出しの API レイテンシの移動平均）、`tps`（直近10回の呼び出しの出力トークン数／秒の移動平均）、`compressions`、`bg_tasks`、`bg_processes`、`bg_subagents`、`goal`、`git_branch`（⎇ 作業ディレクトリの現在の git ブランチ。明示的に有効にしたときだけ表示され、既定では表示されません。detached HEAD の状態では短縮したコミットを表示します）、`duration`、`prompt_elapsed`、`idle_since`、`focus`、`yolo`、`stash`、`battery`、`title`（右寄せのセッションバッジ）、`total_tokens`（セッションの合計 Σ。明示的に有効にしたときだけ表示され、既定では表示されません）。

補足:

- 空のリスト（既定）のときは、標準の組み合わせが表示されます。`total_tokens` と `git_branch` 以外のすべてです。
- この設定で決まるのは**表示するかどうかで、順序ではありません**。フィールドは組み込みの位置に表示されます。
- 幅の狭いターミナルでは、設定に関係なく、幅の広いモード専用のフィールド（`context_detail`、`cache_hit`、`latency`、`tps`、`prompt_elapsed`、`idle_since`）は表示されません（`cache_hit` は52列以上の中間のティアでも表示されます）。
- `latency`/`tps` は、API 呼び出しが記録されるまで表示されません（たとえば Codex の app-server バックエンドはレイテンシを報告しません）。
- ここでの `battery` と `title` の表示は、それぞれ専用の切り替え（`/battery`、`/title`）と組み合わせて決まります。セグメントが表示されるのは両方がオンのときだけです。
- 同じキーは **Ink TUI**（`hermes tui`）のステータス行の絞り込みにも使われます。そこでは `cache_hit`、`latency`、`tps` が、幅の上限に収まる末尾のセグメント（◎ / ◷ / ↑）として表示されます。表示されるのは、ターミナルの幅がそれぞれ96/104/110列以上のときです。
- 表示だけに作用します。プロンプトキャッシュやリクエストのペイロードには影響しません。変更は次にセッションを開始したときに反映されます。

### 実行時メタデータのフッター（ゲートウェイのみ） {#runtime-metadata-footer-gateway-only}

`display.runtime_footer.enabled: true` にすると、Hermes はゲートウェイの各ターンの**最後の**メッセージに、実行時の状況を示す小さなフッターを付けます。現在のフッターに表示できるのは、モデル、コンテキストウィンドウの使用率、現在の作業ディレクトリです。既定ではオフです。すべての返信にこの出所の情報を含めたいチームは、ゲートウェイごとに明示的に有効にしてください。

```yaml
display:
  runtime_footer:
    enabled: true
    fields: ["model", "context_pct", "cwd"]   # order shown; drop any to hide
```

対応しているフィールド:

| フィールド | 表示内容 | 例 |
| --- | --- | --- |
| `model` | ベンダーのプレフィックスを除いたモデル ID だけ | `gpt-5.4` |
| `context_pct` | 直前の呼び出しでのコンテキストの使用率（パーセント） | `5%` |
| `latency` | そのターンにかかった経過時間 | `22s`、`1m05s` |
| `served_model` | 実際に応答したモデルが、設定したモデルと異なるときの、そのモデル。振り分け用のプロキシが `x-litellm-model-id`（または `x-litellm-model-api-base`）レスポンスヘッダーで報告したデプロイ先か、Hermes がそのターンで切り替えたフォールバックモデルです | `hermes-router → gpt-4o-2024-11-20` |
| `cwd` | ホームディレクトリからの相対パスで表した作業ディレクトリ | `~` |

既定のフィールドの組み合わせは `["model", "context_pct", "cwd"]` です。`latency` と `served_model` は明示的に有効にしたときだけ表示されます。使うときは `fields` に追加してください。`served_model` は、実際に応答したモデルが設定したモデルと同じとき（またはプロキシがそのヘッダーを送らないとき）は何も表示しません。そのため、振り分け用のプロキシの背後にあるときや、フォールバックが働いているときには、このフィールドで切り替わりがわかります。データを取得できないフィールドは、空欄を表示せずに黙って省かれます。

`/footer` スラッシュコマンドを使うと、どのセッションでも実行中にこの表示を切り替えられます。

Telegram/Discord/Slack の返信に付くフッターの例:

```
— claude-opus-4.7 · 12 tool calls · 2m 14s · $0.042
```

フッターが付くのはターンの**最後の**メッセージだけです。途中の更新にはフッターが付きません。

### プラットフォームごとの進行状況表示の上書き {#per-platform-progress-overrides}

どこまで詳しく表示したいかは、プラットフォームによって異なります。`display.platforms` を使うと、プラットフォームごとにモードを設定できます。

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

CLI からは、正式なパスを使ってください（`hermes config set display.platforms.telegram.streaming false`）。省略形の `hermes config set platforms.telegram.streaming false` も受け付けます。プラットフォームごとの*表示*設定（`streaming`、`show_reasoning`、`tool_progress` など）は `display.platforms` からしか読み込まれないので、`config set`/`get`/`unset` はこの省略形を正式なキーに置き換えて処理し、その旨の注記を表示します。トップレベルの `platforms.<name>` ブロックにある接続用のキー（`token`、`enabled`、`reply_to_mode`、`extra`）は、この置き換えの対象外です。これらを入れ子のプレフィックスの下に書き込もうとすると（`hermes config set gateway.platforms.telegram.enabled true`）、注記とともにトップレベルの `platforms.telegram.enabled` に置き換えられます。ゲートウェイは両方のブロックを読み込みますが、両方にあるキーではトップレベルの値が優先されるため、入れ子に書き込んでも既存のトップレベルの値に隠れてしまい、しかもそれに気づけないからです。

上書きを設定していないプラットフォームには、全体の `tool_progress` の値が使われます。有効なプラットフォームのキー: `telegram`、`discord`、`slack`、`signal`、`whatsapp`、`matrix`、`mattermost`、`email`、`sms`、`homeassistant`、`dingtalk`、`feishu`、`wecom`、`weixin`、`bluebubbles`、`qqbot`。旧来の `display.tool_progress_overrides` キーも後方互換のために読み込まれますが、非推奨で、初回の読み込み時に `display.platforms` へ移行されます。

Signal は、設定をプラットフォームごとに保存できるため有効なプラットフォームのキーに含まれていますが、現在の Signal のアダプターは送信済みのメッセージを編集できず、ツールの進行状況の吹き出しを表示しません。Signal の `tool_progress` は `off` のままにしてください。各ツール呼び出しをリアルタイムで見たいときは、CLI か、メッセージの編集に対応したメッセージングプラットフォームを使ってください。

`interim_assistant_messages` はゲートウェイ専用です。有効にすると、Hermes はターンの途中で完成したアシスタントの更新を、別々のチャットメッセージとして送ります。これは `tool_progress` とは独立していて、ゲートウェイのストリーミングも必要ありません。

`show_commentary`（既定は `true`）は、Codex Responses のモデルの commentary チャンネルを制御します。これは、こうしたモデルが非公開の推論と並行して出力する、整った文章での進行状況の実況です。有効にすると、完成した commentary のメッセージがそれぞれ、ターンの途中の更新として表示されます（ゲートウェイでは `interim_assistant_messages` も必要です）。この実況がわずらわしいときは `false` にしてください。その場合、commentary は推論のチャンネルに切り替わり、`show_reasoning` を有効にしているときだけ表示されます。

## プライバシー {#privacy}

```yaml
privacy:
  redact_pii: false  # Strip PII from LLM context (gateway only)
```

`redact_pii` が `true` のとき、ゲートウェイは対応しているプラットフォームで、システムプロンプトを LLM に送る前に、そこから個人を特定できる情報を伏せます。

| 項目 | 処理 |
|-------|-----------|
| 電話番号（WhatsApp/Signal でのユーザー ID） | `user_<12-char-sha256>` にハッシュ化 |
| ユーザー ID | `user_<12-char-sha256>` にハッシュ化 |
| チャット ID | 数字の部分をハッシュ化し、プラットフォームのプレフィックスは残す（`telegram:<hash>`） |
| ホームチャンネルの ID | 数字の部分をハッシュ化 |
| ユーザーの名前／ユーザー名 | **対象外**（ユーザー自身が選んだもので、公開されているため） |

**対応プラットフォーム:** 伏せる処理は WhatsApp、Signal、Telegram に適用されます。Discord と Slack は、メンションの仕組み（`<@user_id>`）で LLM のコンテキストに本物の ID が必要なため、対象外です。

ハッシュは決定的です。同じユーザーは常に同じハッシュになるので、グループチャットでもモデルはユーザーを区別できます。送り先の振り分けと配信には、内部で元の値が使われます。

### OpenAI Codex へのリクエストの識別情報 {#openai-codex-request-identity}

OpenAI は、サードパーティの Codex ハーネスに対して、自身を名乗ることを求めています。
公式の Codex エンドポイントに ChatGPT の認証で送るリクエストには、自動的に
`originator: hermes-agent` と `User-Agent: HermesAgent/<version>` が付きます。
既存の ChatGPT アカウントのヘッダーはそのまま残ります。プロンプトの内容を追加したり、
テレメトリのリクエストを送ったりすることはありません。
OpenAI API への直接のリクエストと、カスタムのプロキシのエンドポイントへのリクエストは変わりません。

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
    timeout: 60                # seconds per transcription request; raise for self-hosted model cold starts
    max_retries: 1             # SDK transport retries (connection errors, 408/409/429/5xx); 0 = single attempt
  # model: "whisper-1"         # Legacy fallback key still respected
```

言語は、**すべての** STT プロバイダー（local、groq、openai、mistral、xai、elevenlabs、deepinfra、コマンド型のプロバイダー、プラグイン）で同じ順序で決まります: `stt.<provider>.language` → `stt.language` → `HERMES_LOCAL_STT_LANGUAGE` 環境変数 → プロバイダーの自動判定。**既定値は `stt.language: "en"` です**。Whisper の自動判定は、短い音声やなまりのある音声で言語をよく取り違え、その結果、音声メッセージが別の言語で文字起こしされてしまいます。英語以外を話す場合は、`stt.language` に自分の言語コード（例: `"es"`、`"zh"`、`"uk"`）を一度設定してください。複数の言語で使う場合は `""` にすると、自動判定に戻ります。

`stt.openai.timeout` と `stt.openai.max_retries` は、`openai`、`groq`、`deepinfra` の各プロバイダーが共有する OpenAI SDK の文字起こしクライアントの動きを決めます（プロバイダーごとの同等の設定はまだなく、SDK もこれらの値を環境変数から読み込みません）。既定値が以前の固定値（30秒／再試行なし）ではなく `60` / `1` になっているのは、セルフホストの OpenAI 互換エンドポイントでは、最初のリクエストでモデルを読み込むのに30秒より長くかかることがあり、以前はその音声メッセージがそのまま失われていたためです。その代わり、到達できないバックエンドに対しては、Hermes があきらめるまで、音声メッセージを最大で「2回の試行 × タイムアウト」の時間だけ待たせることになります。以前の動きに戻すには `timeout: 30` と `max_retries: 0` を設定してください。

ゲートウェイで音声メッセージをエージェント向けに文字起こしはするものの、生の文字起こし結果をチャットに投稿してはいけない場合（たとえば顧客向けの WhatsApp ボット）は、`stt.echo_transcripts: false` を設定してください。

プロバイダーごとの動き:

- `local` は、手元のマシンで動く `faster-whisper` を使います。`pip install faster-whisper` で別途インストールしてください。無音時のハルシネーション（ありもしない文字起こし）への対策は既定で有効です。Silero VAD フィルターで無音や雑音が Whisper に届かないようにし、区間をまたいだ条件付けを無効にし、モデル自身が「おそらく発話ではない」*かつ*「信頼度が低い」と判定した区間を捨てます。発話以外の音声（音楽、環境音）を対策なしの元の動きで文字起こししたいときは、`stt.local.vad: false` を設定してください。低いレイテンシで文字起こしできるよう、モデルは音声メッセージの合間もメモリに読み込まれたままです。使われていないときにモデルを自動で解放するには、`stt.local.unload_after_idle_seconds`（例: 5分なら `300`）を設定してください。CUDA のホストでは GPU メモリが解放されます（ローカルの LLM と GPU を共有しているときに一番効果があります）。CPU の場合、そのメモリはプロセスが再利用できるようになりますが、プロセスが別の用途でその領域を必要とするまで、OS から見た使用量は減らないことがあります。次の音声メッセージが届くと、モデルは自動的に読み込み直されます。
- `groq` は Groq の Whisper 互換エンドポイントを使い、`GROQ_API_KEY` を読み込みます。`stt.groq.language`（または全体に効く `HERMES_LOCAL_STT_LANGUAGE` 環境変数）を指定すると、自動判定を省いてレイテンシを減らせます。
- `openai` は OpenAI の音声 API を使い、`VOICE_TOOLS_OPENAI_KEY` を読み込みます。

クラウドのプロバイダー（groq、openai、mistral、xai、elevenlabs、deepinfra）では、`ffmpeg` がインストールされていれば、既定で**アップロード前の無音の切り詰め**が行われます。音声メッセージ内の長い間を、ファイルをアップロードする前に手元で詰めます。自然な間合いが残るよう、各休止のうち `cloud_trim_keep_ms` の分は残します。音声が短くなれば、アップロードが速くなり、音声1分あたりの課金が下がり、リモートのモデルによる無音時のハルシネーションも減ります。12秒より短い音声はまったく切り詰めません（そこでは節約の効果に意味がなく、そもそもリクエストごとの最低料金を設けているプロバイダーもいくつかあります）。切り詰めはベストエフォートです。ffmpeg がない、切り詰めに失敗した、音声のほとんどが無音、または切り詰めても約10%未満しか減らない場合は、元のファイルをそのままアップロードします。常に元のファイルをアップロードしたいとき（たとえばクラウドのプロバイダーで音楽や環境音を文字起こしするとき）は、`stt.cloud_trim_silence: false` を設定してください。コマンド型とプラグインのプロバイダーには、切り詰めた音声は渡されません。

明示的に選んだ `stt.provider` は厳密に守られます。そのプロバイダーが使えない場合、別のプロバイダーに切り替えることはせず、文字起こしはエラーになり、`hermes tools` を実行するよう案内が表示されます。プロバイダーが一度も選ばれていない場合に限り、Hermes は次の順で自動判定します: `local` → `groq` → `openai`。

Groq と OpenAI のモデルの上書きは、環境変数で行います。

```bash
STT_GROQ_MODEL=whisper-large-v3-turbo
STT_OPENAI_MODEL=whisper-1
GROQ_BASE_URL=https://api.groq.com/openai/v1
STT_OPENAI_BASE_URL=https://api.openai.com/v1
```

### 文字起こしのプロンプト（語彙のヒント） {#transcription-prompt-vocabulary-hints}

`stt.prompt` は、プロンプトに対応した STT バックエンドに渡す、任意の固定のヒントです。Whisper 系のモデルが聞き間違えやすい固有名詞、製品名、専門用語に使ってください。

```yaml
stt:
  provider: "local"
  prompt: "Hermes, Teknium, Nous Research, kanban, Ollama"
```

**組み合わせ方。** 設定の値が土台になります。[`pre_transcription`](/hermes/docs/user-guide/features/hooks/#pre_transcription) フックを登録したプラグインは、その上に変更を加えます。項目ごとに、最後に書き込んだものが優先されます。複数のプラグインのヒントは、毎回同じ順序で組み合わされます。プラグインの検出ではプラグイン ID の順に並べて読み込み、各プラグインのコールバックはそのプラグインが登録した順に実行されるため、同じプラグインの組み合わせからは常に同じ最終プロンプトができます。フックが `prompt` に空の文字列を返すと、そのリクエストでは設定のプロンプトが消えます。フックは `language` と `model` も上書きできます。`file_path` は読み取り専用で、変更しようとしてもログに記録されて無視されます。フックが1つも登録されておらず、`stt.prompt` も設定されていなければ、送信されるリクエストは以前のリリースと同じです。

**プロバイダーの対応状況。**

| プロバイダー | プロンプトのパラメーター | 動作 |
|----------|-----------------|----------|
| `local`（faster-whisper） | `initial_prompt` | そのままローカルモデルに渡します |
| `openai` | `prompt` | 文字起こしのリクエストにそのまま含めて渡します |
| `groq` | `prompt` | 文字起こしのリクエストにそのまま含めて渡します |
| `mistral` | `prompt` | 文字起こしのリクエストにそのまま含めて渡します |
| `deepinfra` | `prompt` | OpenAI 互換の経路で、そのまま渡します |
| `xai` | 非対応 | DEBUG レベルでログに記録し、プロンプトなしでリクエストを続けます |
| `elevenlabs` | 非対応 | DEBUG レベルでログに記録し、プロンプトなしでリクエストを続けます |
| `local_command` | 非対応 | DEBUG レベルでログに記録し、プロンプトなしでリクエストを続けます |
| `type: command` の `stt.providers.<name>` | 非対応 | DEBUG レベルでログに記録し、プロンプトなしでリクエストを続けます |
| プラグインで登録したプロバイダー | `transcribe(**extra)` の kwargs に入る `prompt` | プロンプトが設定されているときだけ送るので、このキーより前からあるプロバイダーでは呼び出しが変わりません |

**長さ。** Whisper 系のモデルが条件付けに使うのは、プロンプトの最後の約224トークンだけです。Whisper 系のバックエンド（`local`、`openai`、`groq`、`deepinfra`）では、Hermes がこの上限を手元で適用します。長すぎる最終プロンプトは、警告をログに記録したうえで末尾の部分だけに切り詰めます。プロンプトの長さが原因でリクエストがエラーになることはありません。ほかのバックエンド（`mistral`、プラグインのプロバイダー）にはプロンプトがそのまま渡され、検証はそれぞれのバックエンドが行います。どちらの場合も、ヒントは短く具体的にしてください。

:::warning プロンプトは音声と一緒にアップロードされます
最終的なプロンプトは、音声ファイルと一緒に、設定した STT プロバイダーへ送られます。シークレットやセッション由来のコンテキストは、`stt.prompt` にも、`pre_transcription` フックの戻り値にも入れないでください。プロバイダーがローカルの `faster-whisper` ではなく、ホスト型の API の場合は特に注意してください。
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

CLI でマイクを使うモードを有効にするには `/voice on`、録音の開始と停止には `record_key` に設定したキー、音声での返答のオン／オフには `/voice tts` を使います。セットアップ全体の流れとプラットフォームごとの動作については、[音声モード](/hermes/docs/user-guide/features/voice-mode/) を参照してください。

## ストリーミング {#streaming}

応答全体を待たずに、届いたトークンから順にターミナルやメッセージングプラットフォームへ流して表示します。

### CLI のストリーミング {#cli-streaming}

```yaml
display:
  streaming: true         # Stream tokens to terminal in real-time
  show_reasoning: true    # Also stream reasoning/thinking tokens (optional)
```

有効にすると、応答はストリーミング用の枠の中にトークン単位で表示されます。ツール呼び出しは、これまでどおり表に出さずに記録されます。プロバイダーがストリーミングに対応していない場合は、自動的に通常の表示に切り替わります。

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

有効にすると、ボットは最初のトークンが届いた時点でメッセージを送り、その後トークンが届くたびにそのメッセージを少しずつ編集していきます。メッセージの編集に対応していないプラットフォーム（Signal、Email、Home Assistant）は最初の試行で自動的に検出され、そのセッションではストリーミングが支障なく無効になります。メッセージが大量に送られることもありません。

トークン単位の編集はせずに、ターンの途中のアシスタントの更新を自然な形で別々のメッセージとして送りたい場合は、`display.interim_assistant_messages: true` を設定してください。

**長さの超過への対応:** ストリーミングしたテキストがプラットフォームのメッセージ長の上限（約4096文字）を超えると、その時点のメッセージを確定し、自動的に新しいメッセージを開始します。

**新しい最終メッセージ（Telegram）:** Telegram の `editMessageText` は元のメッセージのタイムスタンプを保つため、時間のかかるストリーミングの返信は、完了したあとも最初のトークンの時刻のままになります。`fresh_final_after_seconds > 0` を設定して明示的に有効にすると、古くなったプレビューを、まったく新しい最終メッセージとして届けます（プレビューの削除はベストエフォートで行います）。既定値は `0` で、ストリーミングした返信は常にその場で確定します。これにより、両方の操作を表示するクライアントで、メッセージが一瞬重複してから削除される流れを避けられます。

:::note プラットフォームごとのストリーミングの既定値
全体の切り替えである `streaming.enabled` は、既定で `false` です。これをオンにするまで、何もストリーミングされません。有効にしたあとは、ストリーミングするかどうかが**プラットフォームごとに**決まります。Telegram は `display.platforms.telegram.streaming: true`（ストリーミングする）、Discord は `display.platforms.discord.streaming: false`（ストリーミングしない）が初期設定です。そのため、ストリーミングを有効にすると、Telegram はそのままストリーミングされ、Discord はその切り替えを変えるまで、メッセージ全体を一度に返信します。これらのプラットフォームごとの切り替えは、ダッシュボードの **Channels** の切り替えスイッチか、`~/.hermes/config.yaml` を直接編集して調整できます。
:::

## グループチャットのセッション分離 {#group-chat-session-isolation}

CLI、TUI/ダッシュボード、メッセージングゲートウェイ全体で、同時に使用中にできる
チャットセッションの数を制限します。

```yaml
max_concurrent_sessions: null  # null/0 = unlimited; positive integer = active session cap
```

スロットが使われるのは、セッションが**最初のターン**を実行したときで、チャットの画面を
開いたときではありません。チャットを開く、再開する、再接続するだけなら、メッセージを
送るまで何も消費しません。そのため、使われていないデスクトップのタブ（や、不安定な WebSocket が
引き起こすバックグラウンドでの再開）が、この上限を共有するメッセージングゲートウェイの枠を奪うことはありません。

上限に達すると、Hermes は、どの画面がスロットを使っているかを明記して、上限に達したことをはっきり伝えるメッセージを返します。
すでに使用中のセッションは、いつもどおりに動作します。
現在のスロットの使用状況と、スロットを使っているものをすべて確認するには、`hermes status` を実行してください。

正式なキーはトップレベルの `max_concurrent_sessions` です。Hermes は
`gateway.max_concurrent_sessions` もフォールバックとして受け付けますが、両方が設定されている場合は
トップレベルのキーが優先されます。

この上限はローカルの実行時のリース（占有権）ファイルで管理され、ベストエフォートで動きます。
レジストリを読み込めない、またはロックできないときは、ユーザーが足止めされないよう、Hermes は失敗時は通す（fail open）側に倒れます。
単一のホストやプロファイルでの実行を想定したもので、
複数の端末にマウントした共有の `$HERMES_HOME` での利用は想定していません。
所有するプロセスは存在するものの、生存を確認できないリース（たとえば `hermes update` がバックエンドを
再起動したあと、コンテナ内の `/proc` のエントリーが読み取れない場合）は、引き続き上限に数えられ、
自分のセッション ID もほかから使えないよう押さえたままにしますが、
別のセッションの確保や解放を妨げることはなくなります。

共有のチャットで、ルームごとに1つの会話にするか、参加者ごとに1つの会話にするかを設定します。

```yaml
group_sessions_per_user: true  # true = per-user isolation in groups/channels, false = one shared session per chat
```

- `true` が既定で、推奨の設定です。Discord のチャンネル、Telegram のグループ、Slack のチャンネルなどの共有の場では、プラットフォームがユーザー ID を提供していれば、送信者ごとに専用のセッションが作られます。
- `false` にすると、以前の共有ルームの動作に戻ります。チャンネルを1つの共同作業の会話として Hermes に扱わせたいと明確に考えている場合には便利ですが、ユーザー同士でコンテキスト、トークンのコスト、中断の状態を共有することにもなります。
- ダイレクトメッセージには影響しません。Hermes はこれまでどおり、DM をチャット／DM の ID で区別します。
- スレッドは、どちらの設定でも親チャンネルから分離されたままです。`true` の場合は、スレッドの中でも参加者ごとに専用のセッションが作られます。

動作の詳細と例については、[セッション](/hermes/docs/user-guide/sessions/) と [Discord ガイド](/hermes/docs/user-guide/messaging/discord/) を参照してください。

## 許可されていない DM への対応 {#unauthorized-dm-behavior}

知らないユーザーからダイレクトメッセージ（DM）が届いたときに、Hermes がどう動くかを設定します。

```yaml
unauthorized_dm_behavior: pair

whatsapp:
  unauthorized_dm_behavior: ignore
```

- `pair` は、チャット型の DM プラットフォームでの既定値です。Hermes はアクセスを拒否しますが、1回だけ使えるペアリングコードを DM で返信します。
- `ignore` は、許可されていない DM を何も返さずに破棄します。
- `decline` は、ペアリングコードの代わりに短く丁寧なお断りを1回だけ送り、その後24時間はその送信者に何も返しません。既定の文面を上書きするには、次のように書きます。

  ```yaml
  unauthorized_dm_behavior: decline
  unauthorized_dm_decline_message: "Sorry, this assistant is private."
  ```

  `hermes gateway setup` で許可リストを空のままにすると、この動作が「Politely decline unknown senders」という選択肢として表示されます。選ぶと `platforms.<platform>.unauthorized_dm_behavior: decline` が書き込まれます。

- Email は、`platforms.email.unauthorized_dm_behavior: pair` を設定しない限り、既定で `ignore` になります。受信箱には関係のない未読メールが入っていることがあるためです。
- プラットフォームごとのセクションは全体の既定値を上書きします。そのため、ペアリングは広く有効にしたまま、1つのプラットフォームだけを静かにできます。

## クイックコマンド {#quick-commands}

独自のコマンドを定義します。LLM を呼ばずにシェルコマンドを実行するものと、あるスラッシュコマンドを別のスラッシュコマンドの別名にするものの2種類があります。exec 型のクイックコマンドはトークンを一切消費しないので、メッセージングプラットフォーム（Telegram、Discord など）からサーバーの状態をさっと確かめたり、ちょっとしたスクリプトを動かしたりするのに便利です。

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

使い方: CLI やメッセージングプラットフォームで `/status`、`/disk`、`/update`、`/gpu`、`/restart` のいずれかを入力します。`exec` コマンドはホスト上でそのまま実行され、出力が直接返ってきます。LLM は呼ばれず、トークンも消費しません。`alias` コマンドは、設定した転送先のスラッシュコマンドに書き換えられます。

- **30秒のタイムアウト** — 時間のかかるコマンドは強制終了され、エラーメッセージが表示されます
- **優先順位** — クイックコマンドはスキルのコマンドより先に照合されるので、スキルと同じ名前を付ければスキルを上書きできます
- **補完** — クイックコマンドは実行時に解決され、組み込みのスラッシュコマンドの補完候補には表示されません
- **種類** — 使える種類は `exec` と `alias` です。それ以外を指定するとエラーが表示されます
- **どこでも使える** — CLI、Telegram、Discord、Slack、WhatsApp、Signal、Email、Home Assistant

文字列だけを登録したプロンプトのショートカットは、クイックコマンドとして使えません。決まったプロンプトの流れを繰り返し使いたい場合は、スキルを作るか、既存のスラッシュコマンドへの別名（alias）にしてください。

## 人間らしい応答の遅延 {#human-delay}

メッセージングプラットフォームで、人間が返信しているような間合いを再現します。

```yaml
human_delay:
  mode: "off"                  # off | natural | custom
  min_ms: 800                  # Minimum delay (custom mode)
  max_ms: 2500                 # Maximum delay (custom mode)
```

設定は各プロファイル自身の `config.yaml` から読まれるので、1つのプロセスで複数のプロファイルを動かしていても、間合いはプロファイルごとに独立します。プロセスの環境変数で上書きする方法はありません。`custom` モードで `min_ms`/`max_ms` の組が整数でない、負の値である、または大小が逆になっている場合は、該当するキーを示した警告を出してその組を使わず、代わりに `natural` の範囲（800〜2500ミリ秒）を使います。

## コード実行 {#code-execution}

`execute_code` ツールを設定します。

```yaml
code_execution:
  mode: project                # project (default) | strict
  timeout: 300                 # Max execution time in seconds
  max_tool_calls: 50           # Max tool calls within code execution
```

**`mode`** は、スクリプトを実行する作業ディレクトリと Python インタープリターを決めます。

- **`project`**（既定） — スクリプトはセッションの作業ディレクトリで、有効になっている virtualenv/conda 環境の python を使って実行されます。プロジェクトの依存パッケージ（`pandas`、`torch`、プロジェクト自身のパッケージ）や相対パス（`.env`、`./data.csv`）がそのまま解決され、`terminal()` から見える環境と一致します。
- **`strict`** — スクリプトは一時的なステージング用ディレクトリで、`sys.executable`（Hermes 自身の python）を使って実行されます。再現性は最も高くなりますが、プロジェクトの依存パッケージや相対パスは解決されません。

環境変数の除去（`*_API_KEY`、`*_TOKEN`、`*_SECRET`、`*_PASSWORD`、`*_CREDENTIAL`、`*_PASSWD`、`*_AUTH` を取り除きます）とツールの許可リストは、どちらのモードでも同じように適用されます。モードを切り替えても、セキュリティの水準は変わりません。

## Web 検索のバックエンド {#web-search-backends}

`web_search` と `web_extract` のツールは、5つのバックエンドプロバイダーに対応しています。バックエンドは `config.yaml` か `hermes tools` で設定します。

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

| バックエンド | 環境変数 | 検索 | 本文抽出 |
|---------|---------|--------|---------|
| **Firecrawl**（既定） | `FIRECRAWL_API_KEY` | ✔ | ✔ |
| **SearXNG** | `SEARXNG_URL` | ✔ | — |
| **Parallel** | `PARALLEL_API_KEY`（任意 — キーなしの無料ティアあり） | ✔ | ✔ |
| **Tavily** | `TAVILY_API_KEY`（任意 — 選択すればキーなしで利用可） | ✔ | ✔ |
| **Perplexity** | `PERPLEXITY_API_KEY` | ✔ | ✔（クエリに関連する抜粋） |
| **Exa** | `EXA_API_KEY`（任意 — キーなしの無料ティアあり） | ✔ | ✔ |

**バックエンドの選択:** 実行時には、保存されている `web.backend` の選択が常に使われます（`hermes tools` で設定します。`nous` を選ぶと、管理された Tool Gateway を経由します）。Web のバックエンドを一度も選んだことがない場合に限り、手元にある API キーから自動で判別します。`SEARXNG_URL` だけが設定されていれば SearXNG、`EXA_API_KEY` だけなら Exa、`TAVILY_API_KEY` だけなら Tavily、`PERPLEXITY_API_KEY` だけなら Perplexity、`PARALLEL_API_KEY` だけなら Parallel、`KEENABLE_API_KEY` だけなら Keenable が使われます。**選択もなく認証情報もまったくない**場合は、キーなしで使える無料ティアの輪（Exa / Parallel / Firecrawl / Keenable）をラウンドロビンで順に回り、レート制限に当たると自動で次の候補に切り替わります。詳しくは [Web 検索のガイド](/hermes/docs/user-guide/features/web-search/) を参照してください。一度選択すると、あとから `.env` にキーを追加しても経路は変わりません。`hermes tools` で Tavily、Firecrawl、Keenable を選んだ場合も、キーなしで動作します。

**SearXNG** は、70以上の検索エンジンにまとめて問い合わせる、無料でセルフホストできるプライバシー重視のメタ検索エンジンです。API キーは不要で、自分のインスタンスを `SEARXNG_URL` に設定するだけです（例: `http://localhost:8080`）。SearXNG は検索専用なので、`web_extract` を使うには本文抽出用のプロバイダーを別に用意する必要があります（`web.extract_backend` を設定します）。Docker でのセットアップ手順は [Web 検索のセットアップガイド](/hermes/docs/user-guide/features/web-search/) を参照してください。

**セルフホストの Firecrawl:** 自分のインスタンスを指すように `FIRECRAWL_API_URL` を設定します。独自の URL を設定した場合、API キーは任意になります（認証を無効にするには、サーバー側で `USE_DB_AUTHENTICATION=*** を設定します）。

**Parallel の検索モード:** 検索の動作は `PARALLEL_SEARCH_MODE` で切り替えます。値は `fast`、`one-shot`、`agentic` のいずれかです（既定は `agentic`）。

**Exa:** `~/.hermes/.env` に `EXA_API_KEY` を設定します。`category` による絞り込み（`company`、`research paper`、`news`、`people`、`personal site`、`pdf`）と、ドメインや日付による絞り込みに対応しています。

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

**ダイアログのポリシー:**

- `must_respond`（既定） — ダイアログを捕捉して `browser_snapshot.pending_dialogs` に載せ、エージェントが `browser_dialog(action=...)` を呼ぶのを待ちます。`dialog_timeout_s` 秒たっても応答がなければ、ページの JS スレッドがいつまでも止まったままにならないよう、ダイアログを自動で閉じます。
- `auto_dismiss` — 捕捉して、すぐに閉じます。それでもエージェントはあとから、`browser_snapshot.recent_dialogs` にある `closed_by="auto_policy"` 付きの記録でダイアログを確認できます。
- `auto_accept` — 捕捉して、すぐに承諾します。`beforeunload` の確認をしつこく出すページで役立ちます。

ダイアログを扱う流れの全体は、[ブラウザー機能のページ](/hermes/docs/user-guide/features/browser/#browser_dialog) を参照してください。

ブラウザーのツールセットは、複数のプロバイダーに対応しています。Browserbase と Browser Use の設定、およびローカルの Chromium 系ブラウザーを CDP でつなぐ設定の詳細は、[ブラウザー機能のページ](/hermes/docs/user-guide/features/browser/) を参照してください。

## タイムゾーン {#timezone}

サーバーのローカルタイムゾーンを、IANA のタイムゾーン文字列で上書きします。ログのタイムスタンプ、cron のスケジュール、システムプロンプトに差し込まれる時刻に影響します。

```yaml
timezone: "America/New_York"   # IANA timezone (default: "" = server-local time)
```

指定できる値: IANA のタイムゾーン識別子ならどれでも使えます（例: `America/New_York`、`Europe/London`、`Asia/Kolkata`、`UTC`）。サーバーのローカル時刻を使う場合は、空にするか項目ごと省略します。

`hermes doctor`（と起動時の設定チェック）は、実行時に読み込めない値を報告します。これがないと、`Asia/Tokio` のような打ち間違いがあっただけで、エージェントの時計とすべての cron スケジュールが知らないうちにサーバーのローカル時刻で動いてしまいます。`HERMES_TIMEZONE` が設定されている場合は、このキーを上書きします。

エージェントの時計、cron のスケジュール、時刻を扱うツールは、どの OS でもこのタイムゾーンに従います。`execute_code` で実行するコードも、Linux と macOS では `TZ` としてこの値を引き継ぎます。Windows では、こうした子プロセスは OS に設定されたタイムゾーンのままになります（Windows の C ランタイムは POSIX 形式の `TZ` 文字列しか解釈できず、IANA の名前を渡すと UTC との時差がずれるためです）。子スクリプトにこのタイムゾーンでローカル時刻を出させる必要がある場合は、Windows 自体のタイムゾーンを設定してください。

## Discord {#discord}

メッセージングゲートウェイでの Discord 固有の動作を設定します。

```yaml
discord:
  require_mention: true          # Require @mention to respond in server channels
  free_response_channels: ""     # Comma-separated channel IDs where bot responds without @mention
  auto_thread: true              # Auto-create threads on @mention in channels
  free_response_auto_thread: false  # Free-response channels also auto-thread (default: reply inline)
```

- `require_mention` — `true`（既定）のとき、ボットはサーバーのチャンネルでは `@BotName` でメンションされたときだけ応答します。DM ではメンションがなくても常に応答します。
- `free_response_channels` — メンションがなくてもボットがすべてのメッセージに応答するチャンネルの ID を、カンマ区切りで並べます。
- `auto_thread` — `true`（既定）のとき、チャンネルでメンションされると会話用のスレッドが自動で作られ、チャンネルが散らかりません（Slack のスレッドと同じような使い方です）。
- `free_response_auto_thread` — `true` のとき、`free_response_channels` のチャンネルでも、トップレベルのメッセージごとにスレッドを自動で作ります。既定値は `false` で、この場合メンション不要のチャンネルではその場に返信します。`auto_thread: true` が必要です。

## セキュリティ {#security}

実行前のセキュリティスキャンと、シークレットの伏せ字化を設定します。

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

- `redact_secrets` — `true` のとき、ツールの出力に含まれる API キー、トークン、パスワードらしきパターンを自動で検出し、会話のコンテキストやログに入る前に伏せ字にします。**既定でオンです**。デバッグや伏せ字処理の開発で、認証情報らしき文字列をそのまま見る必要がある場合に限り、明示的に `false` にしてください。シークレットを含むファイル（`.env` 形式のファイル、シェルの rc/profile ファイル、`HERMES_HOME` にある Hermes の `config.yaml` と、その `backups/config/` 内のコピー）を `read_file`、`search_files`、ターミナルの `cat`/`grep` で読んだ場合も、認証情報の形をした代入（`SOME_API_TOKEN: …`）は、値の見た目にかかわらず、再利用できない `«redacted-secret»` という印に置き換えられます。通常のソースコードやプロジェクトの設定ファイルでは、ベンダー固有の接頭辞のパターンだけが対象なので、`MAX_TOKENS: 100` のようなテスト用のデータが書き換えられることはありません。
- `tirith_enabled` — `true` のとき、ターミナルコマンドを実行前に [Tirith](https://github.com/sheeki03/tirith) でスキャンし、危険なおそれのある操作を検出します。
- `tirith_path` — tirith の実行ファイルのパスです。tirith を標準以外の場所にインストールした場合に設定します。
- `tirith_timeout` — tirith のスキャンを待つ最大秒数です。スキャンがタイムアウトした場合、コマンドはそのまま実行されます。
- `tirith_fail_open` — `true`（既定）のとき、tirith が使えない場合や失敗した場合でも、コマンドの実行を許可します。tirith が検証できないときにコマンドを止めたい場合は、`false` に設定します。

## Web サイトのブロックリスト {#website-blocklist}

エージェントの Web ツールとブラウザーツールが、特定のドメインにアクセスできないようにします。

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

有効にすると、ブロック対象のドメインのパターンに一致する URL は、Web ツールやブラウザーツールが動く前に拒否されます。これは `web_search`、`web_extract`、`browser_navigate` のほか、URL にアクセスするすべてのツールに適用されます。

ドメインのルールでは、次の形式を使えます。
- 完全一致のドメイン: `admin.example.com`
- サブドメインのワイルドカード: `*.internal.company.com`（すべてのサブドメインをブロックします）
- TLD のワイルドカード: `*.local`

共有ファイルには、1行に1つずつドメインのルールを書きます（空行と `#` で始まるコメントは無視されます）。ファイルが見つからない場合や読み込めない場合は警告がログに出ますが、ほかの Web ツールが使えなくなることはありません。

このポリシーは30秒間キャッシュされるので、設定を変えると再起動しなくてもすぐに反映されます。

## スマート承認 {#smart-approvals}

危険なおそれのあるコマンドを Hermes がどう扱うかを設定します。

```yaml
approvals:
  mode: smart   # smart | manual | off
```

| モード | 動作 |
|------|----------|
| `smart`（既定） | 補助の LLM を使い、フラグが立ったコマンドが本当に危険かどうかを判定します。リスクの低いコマンドは、そのコマンドに限って自動で承認されます。本当に危険なコマンドは拒否され、判断がつかないものはユーザーに確認を求めます。 |
| `manual` | フラグが立ったコマンドはすべて、実行前にユーザーに確認します。CLI では対話式の承認ダイアログを表示し、メッセージングでは承認待ちのリクエストとしてキューに入れます。 |
| `off` | 承認のチェックをすべて省略します。`HERMES_YOLO_MODE=true` と同じです。**慎重に使ってください。** |

スマートモードは、承認疲れを減らすのに特に役立ちます。安全な操作ではエージェントがより自律的に作業でき、それでいて本当に破壊的なコマンドはきちんと止められます。

:::warning
`approvals.mode: off` を設定すると、ターミナルコマンドに対する安全チェックがすべて無効になります。信頼できる、サンドボックス化された環境でだけ使ってください。
:::

### 拒否のサーキットブレーカー {#denial-circuit-breaker}

`approvals.denial_breaker_threshold`（既定は `3`）は、スマート承認の審査役が拒否し続けているコマンドを、エージェントが形を変えて再試行し続けるのを防ぎます。再試行のたびに、審査役の LLM の呼び出しがもう1回分消費されるからです。1つのセッションでこの回数だけ続けて拒否されると、拒否のメッセージは強制停止の指示に格上げされます。この指示は、作業を止めること、ブロックされた操作を報告すること、ユーザーに手動での実行か `/approve` を頼むことをエージェントに求めます。一度でも承認されると回数はリセットされます。`0` にすると無効になります。

```yaml
approvals:
  denial_breaker_threshold: 3   # 0 disables the breaker
```

### 拒否ルール {#deny-rules}

`approvals.deny` は glob パターンのリストで、一致したターミナルコマンドを無条件にブロックします。`--yolo`、`/yolo`、`mode: off` のもとでも例外はありません。組み込みの絶対禁止リストに対応する、ユーザーが自分で編集できるリストです。

```yaml
approvals:
  deny:
    - "git push --force*"
    - "*curl*|*sh*"
```

パターンは大文字と小文字を区別しない fnmatch の glob で、YAML では引用符で囲む必要があります（引用符なしで先頭に `*` を書くと解析エラーになります）。詳しくは [セキュリティ — 利用者が定義する拒否ルール](/hermes/docs/user-guide/security/#user-defined-deny-rules-approvalsdeny) を参照してください。

### 独自のスマート承認ポリシー {#custom-smart-approval-policy}

`approvals.smart_policy` を使うと、スマート承認の審査役への指示に独自のルールを付け加えられます。設定したテキストは審査役の LLM のシステムプロンプトに追加されます（信頼できる経路で渡され、信頼できないコマンドの文面と同じ場所に置かれることはありません）。そのため、コードを編集しなくても、自分の環境に合わせて判定を厳しくしたり緩めたりできます。

```yaml
approvals:
  smart_policy: |
    Always ESCALATE commands that modify anything under /etc.
    APPROVE docker compose restarts in ~/deploys — they are routine here.
```

## チェックポイント {#checkpoints}

破壊的なファイル操作の前に、ファイルシステムのスナップショットを自動で取ります。詳しくは [チェックポイントと /rollback](/hermes/docs/user-guide/checkpoints-and-rollback/) を参照してください。

```yaml
checkpoints:
  enabled: false                 # Enable automatic checkpoints (also: hermes chat --checkpoints). Default: false (opt-in).
  max_snapshots: 20              # Max checkpoints to keep per directory (default: 20)
```

## 委任 {#delegation}

delegate ツールで起動するサブエージェントの動きを設定します。

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
  oneshot_max_children: 2                   # Total subagents a one-shot run (hermes chat -q / --oneshot) may spawn; 0 = unlimited. Interactive and gateway sessions are never capped by this.
```

**サブエージェントの provider:model の上書き:** 既定では、サブエージェントは親エージェントのプロバイダーとモデルを引き継ぎます。`delegation.provider` と `delegation.model` を設定すると、サブエージェントを別の provider:model の組み合わせに振り分けられます。たとえば、メインのエージェントには高価な推論モデルを使わせつつ、範囲の狭いサブタスクには安くて速いモデルを使う、といった使い方ができます。

**サブエージェントのフォールバックチェーン:** `delegation.fallback_providers` を設定すると、ワーカーに専用のチェーンを持たせられます（項目の形はトップレベルのリストと同じです）。プロバイダー、エンドポイント、モデルのいずれかを明示的に固定した子は、このチェーンが宣言されているときだけそれを使います。宣言されていなければ、親エージェントの経路を借りずに、はっきりとエラーを出して失敗します。固定していない子では、この設定がないか `null` のとき、親のチェーンをそのまま引き継ぎます。子のフォールバック（失敗したときの切り替え先）を完全に無効にするには、`delegation:` の下に `fallback_providers: []` を書きます。

**エンドポイントを直接指定する上書き:** カスタムエンドポイントをいちばん素直な方法で使いたいときは、`delegation.base_url`、`delegation.api_key`、`delegation.model` を設定します。こうするとサブエージェントはその OpenAI 互換のエンドポイントへ直接送られ、`delegation.provider` よりこちらが優先されます。`delegation.api_key` を省いた場合、Hermes が切り替える先は `OPENAI_API_KEY` だけです。`delegation.base_url` と一緒に `delegation.provider` も設定した場合、優先されるのはやはり明示したエンドポイントとキーですが、そのプロバイダーのリクエスト設定（`custom_providers` の項目にある `extra_body` の上書きと最大出力トークン数）はサブエージェントに引き継がれます。

**子ごとのリクエスト設定（`request_overrides`）:** `delegation.request_overrides` は、サブエージェントが API を呼ぶたびに毎回送るリクエスト設定の dict です。トップレベルのキーは API の引数（kwargs）です（例: `service_tier`）。サブの dict として `extra_body` を書くと、リクエストの `extra_body` にマージされます。この設定は、接続先を決める**3つすべての**分岐（`base_url` の直接指定、名前で指定した `provider`、親からそのまま継承する場合）で使われるので、どの場合でも必ず効きます。優先順位: 明示した `request_overrides` の値は、実行時に決まった上書きや親から来た上書きの**上から**マージされます。トップレベルでは明示したキーが勝ち、`extra_body` は1階層だけ深くマージされます。そのため、実行時の `extra_body` のキー（たとえば、あるプロバイダーに設定された `thinking: {type: disabled}` という性格づけ）は、同じキーを定義し直さない限り残ります。代表的な使い方は、委任した子に OpenRouter のルーティングのヒントを渡すことです。

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
**送信形式（`api_mode`）:** Hermes は `delegation.base_url` から送信形式を自動で判別します（例: パスが `/anthropic` で終わるなら `anthropic_messages`。Codex、Anthropic のネイティブ API、Kimi-coding のホスト名は、これまでどおりの判別を使います）。この判別規則では分類できないエンドポイント（たとえば Azure AI Foundry、MiniMax、Zhipu GLM、Anthropic 形式のバックエンドの前に置いた LiteLLM のプロキシ）では、`delegation.api_mode` に `chat_completions`、`codex_responses`、`anthropic_messages` のいずれかを明示的に設定します。空のまま（既定）にしておくと、自動判別が使われます。

委任のプロバイダーは、CLI やゲートウェイの起動時と同じ方法で認証情報を解決します。設定済みのプロバイダーはすべて使えます（`openrouter`、`nous`、`copilot`、`zai`、`kimi-coding`、`minimax`、`minimax-cn`）。プロバイダーを設定すると、正しい base URL、API キー、API モードが自動で決まるので、認証情報を手作業でつなぎ込む必要はありません。

**優先順位:** 設定の `delegation.base_url` → 設定の `delegation.provider` → 親のプロバイダー（継承）。設定の `delegation.model` → 親のモデル（継承）。`provider` を書かずに `model` だけを設定すると、親の認証情報はそのままで、モデル名だけが変わります（OpenRouter のように、同じプロバイダーの中でモデルを切り替えたいときに便利です）。

**単発実行:** 1回で終わる `hermes chat -q` / `--oneshot` のセッションには、委任の結果を受け取るあとのターンも、学んだことを生かすあとのセッションもありません。そのため、使う機能を絞って動きます。`skill_manage` は提供されません（スキルは引き続き一覧に出ており、`skill_view` で読み込めます）。システムプロンプトのスキルの節は、作業の進め方に関するスキルではなく、分野の知識に関するスキルだけを読み込むよう求めます。さらに `oneshot_max_children` が、その実行で起動できるサブエージェントの合計数を制限します（既定は `2`、`0` なら無制限）。上限を超えると、`delegate_task` はツールのエラーを返し、エージェントに委任せず自分で作業を終えるよう伝えます。

**幅と深さ:** `max_concurrent_children` は、1回のバッチで並列に動かすサブエージェントの数の上限です（既定は `3`。最小は1で、最大はありません）。環境変数 `DELEGATION_MAX_CONCURRENT_CHILDREN` でも設定できます。モデルがこの上限より長い `tasks` 配列を渡すと、`delegate_task` は黙って切り詰めるのではなく、上限を説明するツールのエラーを返します。`max_spawn_depth` は委任のツリーの深さを決めます（1〜3の範囲に収められます）。既定の `1` では、委任は平らです。子は孫を起動できず、`role="orchestrator"` を渡しても、何も知らせずに `leaf` として扱われます。`2` に上げるとオーケストレーターの子が末端（leaf）の孫を起動でき、`3` にすると3階層のツリーになります。オーケストレーションを使うかどうかはエージェントが呼び出しごとに決め、使うときは `role="orchestrator"` を指定して明示的に有効にします。`orchestrator_enabled: false` にすると、それに関係なく、すべての子が末端に戻されます。費用は掛け算で増えます。`max_spawn_depth: 3` と `max_concurrent_children: 3` の組み合わせなら、ツリーは 3×3×3 = 27 の末端エージェントが同時に動くところまで広がります。使い方のパターンは [サブエージェントへの委任 → 深さの上限と入れ子の取りまとめ](/hermes/docs/user-guide/features/delegation/#depth-limit-and-nested-orchestration) を参照してください。

**子プロセスの通知:** サブエージェントが起動したバックグラウンドプロセスの完了通知と監視通知は、親の会話に送られますが、既定では親の側で**抑制されます**。成果物は、子がまとめた結果だからです。これらの通知も届けるには（どのサブエージェントからのものかを添えて届きます）、`delegation.surface_child_process_notifications: true` を設定します。委任の結果そのものが抑制されることはありません。[サブエージェントへの委任 → 子のバックグラウンドプロセスの通知](/hermes/docs/user-guide/features/delegation/#child-background-process-notifications) を参照してください。

## 確認の質問（clarify） {#clarify}

Hermes が確認の質問への返答をどれだけ待つかを設定します。1つの値ですべての画面に効きます（従来の CLI のモーダル、TUI や Desktop のカード、メッセージングゲートウェイ）。正式なキーは `agent.clarify_timeout` です（既定は `3600` 秒。`0` 以下なら無制限）。旧来のトップレベルの `clarify.timeout` も、明示的に設定されていれば今も使われます。

```yaml
agent:
  clarify_timeout: 3600        # Seconds to wait for user clarification response (0 or less = unlimited)
```

時間切れになると、エージェントは「user did not respond」という目印を受け取って待機を解き、自分の判断で作業を続けます。確認の質問が、ツール全般に共通する1回ごとの期限（`timeouts.tools.sequential_call`）で打ち切られることはありません。待ち時間を区切るのは `agent.clarify_timeout` だけです。

## コンテキストファイル（SOUL.md、AGENTS.md） {#context-files-soulmd-agentsmd}

Hermes は、範囲の異なる2種類のコンテキストを使います。

| ファイル | 役割 | 範囲 |
|------|---------|-------|
| `SOUL.md` | **エージェントの中心となる人格** — エージェントが何者かを定めます（システムプロンプトのスロット #1） | `~/.hermes/SOUL.md` または `$HERMES_HOME/SOUL.md` |
| `.hermes.md` / `HERMES.md` | プロジェクト固有の指示（最優先） | git のルートまでさかのぼって探す |
| `AGENTS.md` | プロジェクト固有の指示、コーディング規約 | ディレクトリを再帰的にたどる |
| `CLAUDE.md` | Claude Code のコンテキストファイル（これも検出） | 作業ディレクトリのみ |
| `.cursorrules` | Cursor IDE のルール（これも検出） | 作業ディレクトリのみ |
| `.cursor/rules/*.mdc` | Cursor のルールファイル（これも検出） | 作業ディレクトリのみ |

- **SOUL.md** は、エージェントの中心となる人格です。システムプロンプトのスロット #1 を占め、組み込みの既定の人格を完全に置き換えます。これを編集すれば、エージェントがどんな存在かを思いどおりに作り込めます。
- SOUL.md がない、空である、または読み込めない場合、Hermes は組み込みの既定の人格に切り替えます。
- **プロジェクトのコンテキストファイルには優先順位があります**。読み込まれるのは1種類だけで、最初に見つかったものが使われます。順番は `.hermes.md` → `AGENTS.md` → `CLAUDE.md` → `.cursorrules` です。SOUL.md はこれとは別に、常に読み込まれます。
- **AGENTS.md** は階層をなします。サブディレクトリにも AGENTS.md があれば、すべてがまとめて使われます。
- 既定の `SOUL.md` がまだなければ、Hermes が自動で用意します。
- 読み込まれるコンテキストファイルは、どれも `context_file_max_chars` 文字（既定は20,000）が上限で、超えた分は賢く切り詰められます。

関連ページ:
- [人格と SOUL.md](/hermes/docs/user-guide/features/personality/)
- [コンテキストファイル](/hermes/docs/user-guide/features/context-files/)

## 作業ディレクトリ {#working-directory}

| 状況 | 既定値 |
|---------|---------|
| **CLI（`hermes`）** | コマンドを実行した現在のディレクトリ |
| **メッセージングゲートウェイ** | `~/.hermes/config.yaml` の `terminal.cwd`。未設定ならホームディレクトリ `~` |
| **Docker / Singularity / Modal / SSH** | コンテナまたはリモートマシン内の、ユーザーのホームディレクトリ |

作業ディレクトリを上書きするには、次のように設定します。
```yaml
# In ~/.hermes/config.yaml:
terminal:
  cwd: /home/myuser/projects
```

`~/.hermes/.env` に `MESSAGING_CWD` や `TERMINAL_CWD` を直接書く方法は、互換性のために残された旧来のフォールバックです。新しく設定するときは `terminal.cwd` を使ってください。

## ネットワーク {#network}

外向きの HTTP 通信がうまくつながらないときの回避策です。

```yaml
network:
  force_ipv4: false   # Force IPv4 for outbound connections (default: false)
```

`force_ipv4` — IPv6 が壊れている、または IPv6 で外に届かないサーバーでは、Python が AAAA レコードを先に引き、IPv4 に切り替えるまで TCP のタイムアウトいっぱい止まってしまうことがあります。Hermes は、自分が張る外向きの接続すべてで、すでに IPv6 と IPv4 を競わせています（Happy Eyeballs、RFC 8305: IPv4 の接続試行は IPv6 の250ミリ秒後に始まり、先につながったほうが使われます）。そのため、経路は告知されているのに実際には通信が届かない IPv6 があっても、待たされるのはタイムアウト全体ではなく、1接続あたりおよそ4分の1秒で済みます。これは HTTP だけでなく、ゲートウェイの WebSocket 接続（リレーのコネクター、プラットフォームアダプター）にも当てはまります。これを `true` にするのは、IPv6 をまったく使わず、最初から IPv4 で接続したいときだけにしてください。`hermes doctor` は `IPv6 route` のチェックを実行し、使えない IPv6 の経路を見つけると、この設定を案内します。

## オンボーディング {#onboarding}

初めて使うときに出るオンボーディングのヒントと、手順に沿ってプロファイルを作る提案の設定です。

```yaml
onboarding:
  profile_build: "ask"   # "ask" (default) | "off"
  seen: {}               # internal latch — leave empty
```

- `profile_build` — ゲートウェイに届くいちばん最初のメッセージで示す、プロファイル作成の流れを決めます。`"ask"`（既定）は、ユーザープロファイルの作成を提案します。この提案は**ユーザーが明示的に受け入れたときだけ進み、同意が前提です**。エージェントは何かを調べる前に必ず尋ね、接続済みのアカウントを黙って読むことはありません。`"off"` は簡単な紹介だけを表示します。この提案が出るのは多くても1回です。
- `seen` — 内部の状態です。Hermes は表示したヒントを1つずつここに記録し、二度と出さないようにします。プロファイル作成の提案も、一度表示されるとここに記録されます。手で編集しないでください。すべてのヒントをもう一度見たいときは、`onboarding` セクションを丸ごと消します。

## ダッシュボード {#dashboard}

[Web ダッシュボード](/hermes/docs/user-guide/features/web-dashboard/) の設定です。見た目のテーマ、公開 URL、認証プロバイダーを設定します。認証プロバイダー（OAuth、パスワードによるベーシック認証、drain）の詳細は Web ダッシュボードのページで説明しています。ここでは `config.yaml` での書き方を示します。

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
- `show_token_analytics` — 既定ではオフです。Analytics ページや、トークン数・費用の数字は、**手元で見積もった下限の値**です（補助モデルの呼び出し、再試行、フォールバック、キャッシュへの書き込みは含みません）。そのため、プロバイダーの請求額よりずっと低く出ることがあります。請求額ではないと理解したうえでのみ `true` にしてください。
- `public_url` — 設定すると、OAuth の `redirect_uri` を組み立てるもとになる URL の先頭部分（スキーム + ホスト + 任意のパスのプレフィックス）として、この値がそのまま使われます。`X-Forwarded-*` ヘッダーを確実には転送しないリバースプロキシの後ろに置くときに設定します。空のままにすると、プロキシのヘッダーから組み立て直します。
- `trusted_proxies` — `X-Forwarded-Proto` と `X-Forwarded-For` を渡してよい IP アドレス、または範囲を限った CIDR ネットワークです。ループバックは設定しなくても信頼されます。TLS のリバースプロキシが別のコンテナやホストから接続してくる場合に設定します。できるだけプロキシの正確な IP を指定し、アドレスが変わる場合にだけ、小さな専用ネットワークを使ってください。ワイルドカードと `/0` のネットワークは受け付けません。
- `oauth` / `basic_auth` / `drain_auth` — 同梱の dashboard-auth プラグインが読む、認証プロバイダーの設定です。drain のシークレット自体はここでは**設定しません**。環境変数 `HERMES_DASHBOARD_DRAIN_SECRET` で渡します。認証の設定手順の全体は [Web ダッシュボード](/hermes/docs/user-guide/features/web-dashboard/) を参照してください。
- `ws_ping_interval` / `ws_ping_timeout` — ループバック以外のアドレスで待ち受けるときの、WebSocket のキープアライブの調整です（ループバックの接続では ping を送りません）。遅延の大きい回線（Tailscale、遠くへの SSH トンネル）では、20秒の既定値のせいで本来起きないはずの 1006 の切断が起きることがあるので、値を上げてください。
- `ssh_isolated_idle_grace_s`（既定は `900`）— SSH 経由でつなぐ、Desktop が管理する `hermes serve --isolated` のバックエンドは、わざと SSH セッションから切り離してあります。接続の途中でノートパソコンがスリープしても、バックエンドが止まらないようにするためです。以前は、スリープ中に画面を点けずに一時復帰（dark wake）して再接続するたびに、`state.db` を握ったままのバックエンドが1つずつ増えていました。現在は、クライアントの WebSocket がこの時間ずっと1つも接続されておらず、エージェントのターンも動いていなければ、バックエンドは自分で終了します（ターンが動いていれば生き続けます。ターンの状態が読み取れない場合も生き続けます）。ノートパソコンがスリープしたあとも、切り離されたバックエンドに長い作業を終わらせたい場合は、大きな値にしてください。こうしたバックエンドは、片側だけ切れたトンネルに気づけるように、間隔の長い WebSocket の ping（60秒ごと、タイムアウト10分）も送ります。
- `ws_orphan_reap_grace_s` — WebSocket から切り離されたセッションを、孤立セッションの回収処理が片づけるまでの猶予時間です。クライアントの再接続に時間がかかる場合は、キープアライブの値と一緒に上げてください。定期的なセッションの保守処理も、閉じたソケットの後片付けを最後まで済ませ、なくなった孤立タイマーを張り直します。そのため、最初の後片付けやタイマーが失われたというだけの理由で、切り離されたチャットが所有権のリース（占有権）を持ち続けることはありません。再接続すると、このタイマーは取り消されます。進行中の委任の作業と、正常に動いているターンは、これまでどおり孤立セッションの回収処理の通常のチェックで守られます。（`HERMES_TUI_WS_ORPHAN_REAP_GRACE_S` は、内部向けの上書きとして残っています。）
- `ws_orphan_activity_stale_s`（既定は `600`）— 切り離された**実行中**のターンについて、活動の時計がどれだけ止まっていたら孤立セッションの回収処理が中断するかを決めます。この時計は `agent.turn_liveness` の監視役が見ているものと同じで、API の待ち、ストリームのトークン、ツールのハートビートで進みます。クライアントがいなくても、まだ活発に出力を生み出しているターンは、切り離されたまま最後まで動き続けます。ノートパソコンを閉じても、モバイルアプリをバックグラウンドに回しても、Desktop を更新しても、正常に動いている長いターンが取り消されることはもうありません。中断されるのは、本当に固まってしまったターンだけです。活動の有無に関係なく、猶予時間が過ぎた時点で中断したい場合は `0` にします（以前の動き）。
- `startup_orphan_sweep`（既定は `true`）— 上の WebSocket の孤立タイマーはプロセスの中で動いているので、タイマーが発火する前にゲートウェイが再起動すると（更新、クラッシュ、systemd）、セッションの行が開いたまま永久に残ります。`/resume` やダッシュボードに、実体のない「実行中」の作業が出てしまいます。そこで、ゲートウェイが起動するたびに、stdio の TUI（`entry.main`）でも、Desktop やダッシュボード用の WebSocket サイドカー（`handle_ws`）でも、次の行を `end_reason: startup_orphan_reap` で閉じます。対象は、ソースが `tui` / `desktop` / `subagent` / `unknown`（トークン集計のガードが自分で作らざるをえなかった行）で、開始時刻**と**最新のメッセージの両方がセッションの TTL（`HERMES_TUI_SESSION_TTL_S`、既定は6時間）より古い行です。メッセージングプラットフォームのセッション（Telegram、Discord など）には一切触れません。メモリ上で動いているセッション（すでに再開したクライアントのもの）は対象外で、閉じられたセッションも引き続き再開できます。
