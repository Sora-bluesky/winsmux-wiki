---
title: "Hermes Agent の設定"
description: "Hermes Agent を設定する — config.yaml、プロバイダ、モデル、API キーなど"
upstream_path: user-guide/configuration.md
upstream_blob: baef49f5223cf47be2d143ed279d88555c1774ed
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/configuration
---

# Hermes Agent の設定 {#hermes-agent-configuration}

設定はすべて `~/.hermes/` ディレクトリにまとまっていて、すぐに開けます。

:::tip 動く `config.yaml` にたどり着く一番かんたんな道
`hermes setup --portal` を実行します。OAuth を1回通すだけで、モデルのプロバイダと Tool Gateway の4つのツールが、YAML を手で書かずにそろいます。Portal の購読者は、トークン課金のプロバイダが10%割引にもなります。[Nous Portal](/hermes/docs/integrations/nous-portal/) をご覧ください。
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
`hermes config set` コマンドは、値を自動で正しいファイルに振り分けます。`UPPER_SNAKE` 形式の名前（`OPENROUTER_API_KEY`、`DISCORD_HOME_CHANNEL`、`TELEGRAM_GROUP_ALLOWED_USERS`、`HERMES_TIMEZONE` など）はすべて環境変数として扱われ、`config.yaml` には書かれず必ず `.env` に保存されます。ドット区切りの設定は `config.yaml` に入ります。それ以外の `UPPER_SNAKE` 形式の名前も、そのまま `.env` に保存されます（プラグインやスキル向けにプロセスの環境へエクスポートされます）。env ライターの denylist（`HERMES_YOLO_MODE`、`PATH` など）に載っている名前は拒否されます。既知のキーを間違ったプレフィックスの下に書いた場合（`gateway.discord.foo` で、`discord.foo` 自体が既知のキーであるようなケース）は、何も書き込まれる前に「もしかして」の候補付きで拒否されます。それでも書き込みたい場合は `--force` を渡してください。既知のセクション配下にある、それ以外の未知のパス（`agent.max_turnz` のような typo や、初期値のシードがないランタイム読み取り専用のキー）は、「もしかして」の通知とともに書き込まれます。スキーマだけでは両者を区別できないためです。そうしたパスに対して `hermes config get` を実行すると、ファイルに入っている値と一緒に、Hermes がそれを読み込まない可能性があるという stderr 通知が表示されるので、使われていないキーが黙って有効な設定のように見えることはありません。
:::

## 設定の優先順位 {#configuration-precedence}

設定は次の順序で解決されます（優先度が高いものから）。

1. **CLI 引数** — 例: `hermes chat --model anthropic/claude-sonnet-4`（呼び出しごとの上書き）
2. **`~/.hermes/config.yaml`** — シークレット以外のすべての設定に使う主要な設定ファイル
3. **`~/.hermes/.env`** — 環境変数のフォールバック先。シークレット（API キー、トークン、パスワード）には**必須**
4. **組み込みの既定値** — 他に何も設定されていないときのハードコードされた安全な既定値

:::info 目安
シークレット（API キー、ボットトークン、パスワード）は `.env` に置きます。それ以外のすべて（モデル、ターミナルのバックエンド、圧縮設定、メモリ上限、ツールセット）は `config.yaml` に置きます。両方に設定がある場合、シークレット以外の設定については `config.yaml` が優先されます。
:::

:::tip 組織でのデプロイ
管理者はシステムレベルの管理用ディレクトリを使って、標準ユーザーが上書きできない特定の設定値やシークレット値を固定できます。詳しくは
[Managed Scope](/hermes/docs/user-guide/managed-scope/) を参照してください。
:::

## 実行時制限 {#runtime-limits}

長時間動作する Hermes のサーバー面（gateway や
`hermes serve --isolated` を含む）は、OS がサポートしていれば起動時に設定済みの
`RLIMIT_NOFILE` ソフトリミットを適用します。

```yaml
runtime:
  nofile_soft_limit: 4096
```

既定値は `4096` です。Hermes は対象値を OS のハードリミットに合わせてクランプし、既にそれより高いソフトリミットを持つプロセスを下げることはありません。この調整を無効にするには、値を `0`、`false`、または `null` に設定します。Windows や、リミットを変更できないサンドボックスでは、リミットを変更せずに起動を続けます。

## データベース設定 {#database-settings}

`database:` セクションは、Hermes が SQLite の状態データベース
（`state.db`。セッション・メッセージ・gateway のルーティングを保存）を
どう開くかを制御します。

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

また、既存のデータベースのディスク上のジャーナルモードが、開いたときに黙って
WAL に切り替えられた場合（たとえば運用者が手動で `delete` に変換していたデータベースなど）、
Hermes はプロセスごとにデータベースごとで1回だけ警告を出し、その選択を維持する設定が
`database.journal_mode` であることを示します。逆方向は自動では起こりません。
つまり、すでに WAL モードのデータベースは `journal_mode: delete` を設定しても
稼働中にダウングレードされません（開いている接続の下でのダウングレードは
破損を招く可能性があるためです）。`hermes doctor` は、そのプロファイルの
すべての Hermes プロセスを停止して `hermes sessions set-journal-mode delete` を
実行するまで、`<db> is in WAL mode despite database.journal_mode=delete` という
警告を出し続けます（何かがまだファイルを保持している間は拒否され、変換後の
ヘッダーも検証されます）。この警告の下には、いま何がデータベースを保持しているか
（`<db> is held by PID <n> (<command>)`）も表示されるので、何を止めればよいかが分かります。
保持プロセスの走査が部分的にしかできない、またはできない場合は、問題なしとは言わずに
`cannot prove the database is quiet` と表示します。

## 環境変数の展開 {#environment-variable-substitution}

`config.yaml` の中では `${VAR_NAME}` という書き方で環境変数を参照できます。

```yaml
auxiliary:
  vision:
    api_key: ${GOOGLE_API_KEY}
    base_url: ${CUSTOM_VISION_URL}

delegation:
  api_key: ${DELEGATION_KEY}
```

1つの値の中に複数の参照を書くこともできます: `url: "${HOST}:${PORT}"`。参照先の変数が設定されていない場合、プレースホルダーはそのまま残り（`${UNDEFINED_VAR}` はそのままの形で残ります）、警告がログに出ます。裸の `$VAR` は展開されません。

[多重化されたマルチプロファイル gateway](/hermes/docs/user-guide/multi-profile-gateways/) の下では、プロファイルの `config.yaml` 内の参照は共有のプロセス環境ではなく**そのプロファイル自身**の `.env`（そのプロファイルのシークレットの範囲）に対して解決されます。つまりプロファイル B の中の `${MATRIX_ACCESS_TOKEN}` は、B 自身がその変数を定義していない限り未解決のまま（そのままの形で残り、警告がログに出ます）です。これは、B の設定がマルチプレクサ内のどこで読み込まれる場合にも当てはまります。ルーティングされた gateway のターン、B のアダプター起動時、B の cron ジョブでも同様です。単一プロファイルでの実行はこれまでと変わりません。全リストは [What is isolated per profile](/hermes/docs/user-guide/multi-profile-gateways/#what-is-isolated-per-profile) を参照してください。

Cursor 形式の SecretRef の書き方も受け付けます: `${env:VAR_NAME}` は `${VAR_NAME}` とまったく同じように解決されます（`env:` というプレフィックスは取り除かれます）。そのため、Cursor / Claude の設定からコピーした MCP やプロバイダのスニペットは、`config.yaml` と `mcp_servers` ブロックのどちらでも書き換えずに使えます。それ以外の SecretRef のソース（`${file:...}`、`${vault:...}`、`${bitwarden:...}`）はインラインでは解決**されません**。外部のシークレットバックエンドは起動時に `secrets:` ブロック経由でその値を環境に注入するので、代わりに `${env:NAME}` として参照してください。未知のプレフィックスは1回だけ警告を出し、そのまま残ります。

AI プロバイダの設定（OpenRouter、Anthropic、Copilot、カスタムエンドポイント、セルフホストの LLM、フォールバックモデルなど）については、[AI Providers](/hermes/docs/integrations/providers/) を参照してください。

### プロバイダのタイムアウト {#provider-timeouts}

プロバイダ全体のリクエストタイムアウトには `providers.<id>.request_timeout_seconds` を設定でき、モデル単位で上書きするには `providers.<id>.models.<model>.timeout_seconds` を使います。これは、すべてのトランスポート（OpenAI-wire、ネイティブ Anthropic、Anthropic 互換）でのメインのターンクライアント、フォールバックチェーン、資格情報のローテーション後の再構築、そして（OpenAI-wire の場合は）リクエストごとのタイムアウト kwarg に適用されます。つまり、設定した値がレガシーな `HERMES_API_TIMEOUT` 環境変数より優先されます。

ノンストリーミングの stale コール検出には `providers.<id>.stale_timeout_seconds` を設定でき、モデル単位で上書きするには `providers.<id>.models.<model>.stale_timeout_seconds` を使います。これはレガシーな `HERMES_API_CALL_STALE_TIMEOUT` 環境変数より優先されます。同じキーはストリーミングの stale ストリームの期限にもなります。明示的に値を設定した場合はそのまま使われます。暗黙のコンテキストサイズ段階（5万トークン超で240秒、10万トークン超で300秒）や推論モデルの下限は、180秒の既定値にだけ適用されるので、明示的な値を設定すると、ハングしたストリームを許容する時間を短くできます。

これらを未設定にしておくと、レガシーな既定値が使われます（`HERMES_API_TIMEOUT=1800` 秒、`HERMES_API_CALL_STALE_TIMEOUT=90` 秒、ネイティブ Anthropic は900秒）。ノンストリーミングの stale 検出器は、暗黙のままにしておくとローカルのエンドポイントでは自動的に無効化され、非常に大きいコンテキストでは上方向にスケールできます。AWS Bedrock（`bedrock_converse` と AnthropicBedrock SDK のどちらの経路も、独自のタイムアウト設定を持つ boto3 を使っています）にはまだ配線されていません。[`cli-config.yaml.example`](https://github.com/NousResearch/hermes-agent/blob/main/cli-config.yaml.example) のコメント付きの例も参照してください。

## 更新の挙動 {#update-behavior}

### バックグラウンドでの確認 {#background-checks}

パッシブな更新確認（CLI のバナー、TUI のバッジ、ダッシュボード、デスクトップアプリ）は、
GitHub REST API に `main` の最新コミットを問い合わせ、あなたのチェックアウトと異なる場合は
compare エンドポイントで正確な件数と changelog を取得します。`git fetch` は一度も実行せず、
インストールごとに**24時間に最大1回**しか問い合わせません（失敗した確認は1時間後に再試行します）。
更新を適用する（`hermes update`、またはデスクトップの Update ボタン）と、常に新しく取得し直し、
キャッシュされた回答を無効化します。明示的な確認 — `hermes update --check`、デスクトップの
「Check for Updates…」メニュー項目、Settings → About → 「Check now」 — はキャッシュを回避します。

### SSH 認証 {#ssh-authentication}

起動時の更新確認は、ネットワーク呼び出しに使うのと同じ隔離された Git 設定で origin の URL を
読み込みます。そのため、グローバルな `url.*.insteadOf` の書き換えでは、公開 HTTPS のパスから
正規の SSH remote を隠すことはできません。

Hermes の隔離された内部 Git コマンドは既定で `ssh -o BatchMode=yes` を使います。
未知のホストキー、パスワード、パスフレーズが必要な暗号化された鍵は、
ターミナルのプロンプトを開く代わりに失敗します。信頼済みのホストで使用可能な鍵や
SSH エージェントがある場合は、そのまま認証が続きます。これはディスク上のあなたの
Git や SSH の設定、ターミナルツールで実行するコマンドを変更するものではありません。

この内部の既定値はリポジトリの `core.sshCommand` 設定を上書きします。明示的な
`GIT_SSH_COMMAND` 環境変数はそれでも優先されるので、カスタムの ID やトランスポートの
コマンドはそちらに残しておけます。非対話的な状態を保つ必要がある場合は、そうした
上書きに `-o BatchMode=yes` を含めてください。プロンプトを許可する上書きは、
バックグラウンドでの確認を中断させる可能性があります。

`hermes update` の設定は `config.yaml` の `updates` の下にあります。

```yaml
updates:
  pre_update_backup: quick       # quick (state snapshot, default) | full (snapshot + HERMES_HOME zip) | off
  backup_keep: 5                 # Keep this many full pre-update backup zips
  non_interactive_local_changes: stash  # stash | discard
  auto_switch_parked_branch: true       # auto-switch a clean, fully merged parked branch back to main
```

`pre_update_backup` は更新前の安全策をまとめて切り替える唯一のつまみです。`quick`（既定）は
重要な状態ファイル（ペアリングデータ、cron ジョブ、設定、認証情報。1 GiB を超えるファイルは
スキップされます）を `state-snapshots/` にスナップショットします。`full` はさらに
`HERMES_HOME` 全体を `backups/` に zip 圧縮し、ホームディレクトリが大きい場合は数分かかることもあります。
`off` はどちらも無効にします。レガシーな真偽値も引き続き使えます（`true` → `full`、`false` → `off`）。

`config.yaml` 自体の時点ごとのコピー（`hermes setup` が書き換える前、`hermes migrate` が
編集する前、ファイルの解析が成功するたび、そして解析が失敗したときに取得されます）は
`backups/config/config.yaml.<reason>.<timestamp>` に保存されます。同一内容の重複はスキップされ、
理由ごとに最新5件だけが保持されるので、`config.yaml` の隣に無限に積み上がることはありません。
`config.yaml` が壊れている場合、Hermes は組み込みの既定値ではなく最新の `good` コピーを
使って動作し、YAML が修正されるまで起動ごとに警告を出します。壊れたファイル自体は
変更されません。

git でのインストールでは、Hermes は更新用ブランチをチェックアウトしたり pull したりする前に、
汚れた（変更のある）追跡ファイルと未追跡ファイルを自動で stash します。対話的なターミナルでの
更新は、その stash を復元する前に確認を求めます。非対話的な更新（デスクトップ／チャットアプリ、
gateway、または `--yes`）は `updates.non_interactive_local_changes` を使います。`stash` は
pull が成功した後にローカルのソース編集を復元し、`discard` は pull が成功した後に更新で
作られた stash を捨てます。`discard` は、ローカルのソース編集を残す想定がない管理対象の
インストールでのみ使ってください。

その stash の手順の前に、Hermes は npm install / build のノイズで残った、追跡対象の
`package-lock.json` の差分も復元します。意図したロックファイルの編集は、更新前に
コミットするか手動で stash してください。

## ターミナルのバックエンド設定 {#terminal-backend-configuration}

Hermes は7種類のターミナルバックエンドをサポートします。それぞれが、エージェントの
シェルコマンドが実際にどこで実行されるかを決めます — ローカルマシン、Docker コンテナ、
SSH 経由のリモートサーバー、Modal のクラウドサンドボックス（直接、または Nous 管理の
gateway 経由）、Daytona ワークスペース、Vercel Sandbox、または Singularity/Apptainer
コンテナです。

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

`terminal.temp_dir` は、Hermes がローカルバックエンドでセッションの一時的な成果物
（バックグラウンドプロセスのログ／pid／終了コードファイル、コード実行のサンドボックス、
あふれたツール結果）をどこに置くかを制御します。空のまま（既定）にしておくと、
Hermes は環境に明示された `TMPDIR`/`TMP`/`TEMP` があればそれを使い、なければ `/tmp` の
代わりに実ストレージ上の管理用ディレクトリ `~/.hermes/cache/terminal` を使います。
多くのディストリビューション（特に Arch 系のセットアップ）では `/tmp` <!-- no-tmp: ok — explains why /tmp is avoided -->
が RAM 上に構築された小さな tmpfs であり、負荷がかかると Hermes のセッションの
成果物で埋まってしまうことがあるためです。この管理用ディレクトリは自動で刈り込まれます。
24時間アイドル状態（内部のどこにも書き込みがない）だった成果物は、gateway の
ハウスキーピングによって1時間おきに、CLI のみのインストールではプロセスごとに1回
掃除されます。セッションの一時ファイルを別の場所へ振り向けるには、`temp_dir` に
既存の絶対パスを設定してください。ユーザーが設定したパスは自動で刈り込まれません。

`terminal.temp_dir` とは別に、すべての Hermes プロセス（CLI、TUI、gateway、デスクトップの
バックエンド、cron）と、それが起動するすべての子プロセスは、`TMPDIR`、`TMP`、`TEMP` が
起動時に**`~/.hermes/cache/scratch`**（プロファイルごと）を指すように設定されます。
これにより `tempfile.mkdtemp()`、`mktemp`、ブラウザプロファイル、プローブスクリプトはすべて、
RAM 上の system temp ディレクトリではなく実ストレージに置かれます。システムプロンプトは
このディレクトリを scratch ディレクトリと呼んでいます。Hermes はこれらの環境変数が
まだ設定されていない場合にだけ設定します — あなたや OS がエクスポートした `TMPDIR`
（macOS の `/var/folders`、Windows の `%TEMP%`）はそのままにされます。エントリは
**24時間アイドル状態**になった時点で、起動時に（最大でも1時間に1回）刈り込まれます。
内部のどこかに直近1日以内で書き込みがある限りエントリは残り、最後の書き込みから
1日経つと削除対象になります。アイドルなエントリを削除する前に、Hermes はその
エントリ内に作業ディレクトリを持つまま動いているプロセス（テスト実行の後に
残されたヘッドレスブラウザのような、もう存在しない scratch パス内のものも含みます）を
停止し、そこを指していた `git worktree` の登録も削除します。`hermes doctor` は
このディレクトリとそのサイズを報告し、`cache/` の下にある、どの刈り込み処理にも
カバーされていない1GB超のディレクトリについて警告します。

`desktop.font_family` は、チャットと Hermes Desktop インターフェースの残りの部分の
フォントを設定します（ターミナルパネルには上で述べた専用のキーがあります）。
インストール済みの1つのフォントファミリー名（例: `OpenDyslexic` や
`Atkinson Hyperlegible`）または CSS のフォントスタックを指定します。Hermes は
その後ろに現在のテーマ自身のスタックを保持するので、CJK や絵文字のグリフは
そのまま解決されます。空の値にすると、テーマのフォントが使われます。
**Settings → Appearance → Chat Font** で編集できます。

`terminal.font_family` は Hermes Desktop に組み込まれたターミナルを制御します。
ローカルにインストールされた1つのフォントファミリー名（例: `MesloLGS NF`）か、
CSS のフォントスタックのどちらかを指定できます。Hermes はフォールバックとして
バンドルされている JetBrains Mono スタックを後ろに追加し、空の値にすると既定値が
そのまま使われます。同じプロファイル単位の設定は **Settings → Appearance →
Terminal Font** で編集できます。Google Fonts のダウンロードやシステムフォントの
許可は不要です。

Modal、Daytona、Vercel Sandbox のようなクラウドサンドボックスでは、
`container_persistent: true` は、Hermes がサンドボックスの再作成をまたいで
ファイルシステムの状態を保持しようとすることを意味します。同じ稼働中の
サンドボックス、PID 空間、バックグラウンドプロセスが後になっても動き続けている
ことを保証するものではありません。

### バックエンドの概要 {#backend-overview}

| Backend | コマンドの実行場所 | 分離 | 向いている用途 |
|---------|-------------------|-----------|----------|
| **local** | あなたのマシン上で直接 | なし | 開発、個人利用 |
| **docker** | 1つの永続的な Docker コンテナ（セッション・`/new`・サブエージェント間で共有） | 完全（namespace、cap-drop） | 安全なサンドボックス化、CI/CD |
| **ssh** | SSH 経由のリモートサーバー | ネットワーク境界 | リモート開発、強力なハードウェア |
| **modal** | Modal のクラウドサンドボックス | 完全（クラウド VM） | 一時的なクラウドコンピュート、評価 |
| **daytona** | Daytona ワークスペース | 完全（クラウドコンテナ） | 管理されたクラウド開発環境 |
| **vercel_sandbox** | Vercel Sandbox | 完全（クラウド microVM） | スナップショットでファイルシステムを永続化するクラウド実行 |
| **singularity** | Singularity/Apptainer コンテナ | Namespace（--containall） | HPC クラスタ、共有マシン |

### local バックエンド {#local-backend}

既定のバックエンドです。コマンドは分離なしであなたのマシン上で直接実行されます。
特別な設定は不要です。

```yaml
terminal:
  backend: local
```

既定では、ローカルのツールのサブプロセスはあなたの実際の OS ユーザーの `HOME` を
そのまま使います。これにより `git`、`ssh`、`gh`、`az`、`npm`、Claude Code、Codex
のような外部 CLI が、通常のシェルで既に使っている資格情報や設定を見つけられます。
Hermes の状態はそれでも `HERMES_HOME` を通じてプロファイルごとに区切られています。
`HOME` はプロファイルが設定・メモリ・セッション・スキルを選ぶ方法ではありません。

Hermes は、システム全体の `HOME`、シェルの起動ファイル、OS のアカウントホームを
**変更しません**。この設定が制御するのは、`terminal`、バックグラウンドのターミナル
プロセス、`execute_code`、ACP のヘルパープロセスといったツールを通じて Hermes が
起動するサブプロセスに渡される環境だけです。

#### `terminal.home_mode` {#terminalhomemode}

| モード | ホストへのインストール | コンテナ | トレードオフ |
|---|---|---|---|
| `auto` | 実際の OS ユーザーの `HOME` を保持する | `{HERMES_HOME}/home` を使う | 推奨される既定値。ホストの CLI は動き続け、コンテナの状態は永続化されます。 |
| `real` | 実際の OS ユーザーの `HOME` を強制する | 見える場合は実際の OS ユーザーの `HOME` を強制する | 親プロセスが誤って `HOME` をプロファイルのホームに向けたまま起動してしまった場合に有用です。 |
| `profile` | 存在する場合は `{HERMES_HOME}/home` を使う | 存在する場合は `{HERMES_HOME}/home` を使う | プロファイルごとに厳密な CLI 設定の分離ができますが、`~/.ssh`、`~/.gitconfig`、`~/.azure`、`~/.config/gh`、Claude/Codex の認証、npm の状態などは、プロファイルのホーム内で初期化するかリンクしない限り見えません。 |

既定値の欠点は、ホスト側のプロファイルが `~` の下にある通常のユーザーレベルの
CLI 資格情報／設定を共有してしまうことです。別々の git アイデンティティ、SSH
キー、GitHub CLI のログイン、npm の設定、クラウド CLI のログインを持つプロファイルが
必要な場合は、`home_mode: profile` を使い、そのプロファイルのホーム内でそれらの
ツールを意図的に初期化してください。

意図的にツールごとの設定を厳密にプロファイル単位で分離したい場合は、次のように
設定します。

```yaml
terminal:
  home_mode: profile
```

このモードでは、ツールのサブプロセスは `{HERMES_HOME}/home` を `HOME` として使います。
Hermes は `HERMES_REAL_HOME` も設定するので、スクリプトが必要なときには実際の
ユーザーホームを見つけられます。コンテナのバックエンドは、そのディレクトリが
Hermes の永続的なデータボリューム上にあるため、`auto` モードでも
`{HERMES_HOME}/home` を使い続けます。

プロファイルの状態と実際のユーザーホームを区別する必要があるスクリプトは、
Hermes のデータには `HERMES_HOME` を、アカウントのホームには `HERMES_REAL_HOME`
を優先して使うべきです。

```python
from pathlib import Path

hermes_home = Path(os.environ["HERMES_HOME"])
real_home = Path(os.environ.get("HERMES_REAL_HOME", os.environ["HOME"]))
```

:::warning
エージェントはあなたのユーザーアカウントと同じファイルシステムアクセス権を持ちます。
不要なツールを無効化するには `hermes tools` を使ってください。サンドボックス化したい
場合は Docker に切り替えてください。
:::

### Docker バックエンド {#docker-backend}

セキュリティを強化した状態（すべての capability を落とし、権限昇格なし、PID 数の
上限あり）で、Docker コンテナ内でコマンドを実行します。

**1つの永続的なコンテナを Hermes の各プロセス間で共有します。** Hermes は初回使用時に
長期稼働する1つのコンテナを起動し、以降のすべてのターミナル・ファイル・`execute_code`
の呼び出しを、その同じコンテナへの `docker exec` として、セッション・`/new`・`/reset`・
`delegate_task` のサブエージェントをまたいでルーティングします。作業ディレクトリの
変更、インストール済みのパッケージ、`/workspace` 内のファイル、そして**バックグラウンド
プロセス**は、あるツール呼び出しから次の呼び出しへ、そしてある Hermes プロセスから
次のプロセスへと引き継がれます。TUI セッションを閉じたとき、`/quit` を実行したとき、
新しい `hermes` の起動をしたときも、コンテナは動き続け、次の Hermes プロセスはラベルに
基づく検索を通じてそれを再利用します。正確な破棄のルールは下の**コンテナのライフサイクル**
を参照してください。

**セッションごとの分離モード（`container_persistent: false`）。** Docker バックエンドで
`container_persistent: false` を設定すると、**セッションごと**に1つのコンテナを使う
モードに切り替わります。各チャット（デスクトップアプリのセッション、gateway の会話、
TUI セッション）は、最初のターミナル／ファイル呼び出し時に作られる専用のまっさらな
サンドボックスを持ち、セッションが閉じるか `lifetime_seconds` を超えてアイドルに
なると削除されます。セッション間で何も引き継がれません — ファイルシステムの状態も、
マウントも、バックグラウンドプロセスもありません。`docker_mount_cwd_to_workspace: true`
の場合、**そのセッションに紐付けられた**ワークスペースだけが `/workspace` に
マウントされます。紐付けられたディレクトリのない新しいセッションは、前のセッションの
マウントを引き継ぐのではなく、空のワークスペースを得ます。`delegate_task` の
サブエージェントは、それでも親セッションのコンテナを共有します。会話間でサンドボックスを
セキュリティ境界として使いたいときはこのモードを使い、上で説明した長期稼働の共有コンテナが
欲しいときは既定の `true` のままにしてください。

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

**`docker_env`** と **`docker_forward_env`** の違いは次のとおりです。前者は、
設定内で指定したそのままの `KEY=value` の組を注入します（値は `config.yaml` に
そのまま書かれるか、`TERMINAL_DOCKER_ENV='{"DEBUG":"1"}'` のように JSON の dict
として渡されます）。後者は、あなたのシェルや `~/.hermes/.env` から値を転送するので、
実際のシークレットが設定ファイルに現れることはありません。トークンには
`docker_forward_env` を、コンテナが必要とする静的なつまみには `docker_env` を
使ってください。

**`terminal.docker_extra_args`**（`TERMINAL_DOCKER_EXTRA_ARGS='["--gpus=all"]'` でも
上書き可能）を使うと、Hermes が一級のキーとして表に出していない任意の `docker run`
フラグ — `--gpus`、`--network`、`--add-host`、代替の `--security-opt` の上書きなど —
を渡せます。各エントリは文字列である必要があります。このリストは組み立てられた
`docker run` 呼び出しの末尾に追加されるので、必要なら Hermes の既定値を上書きできます。
使いすぎには注意してください — サンドボックスの強化（capability の削除、`--user`、
ワークスペースの bind mount）と衝突するフラグは、黙って分離を弱めてしまいます。

**`terminal.docker_network`**（既定 `true`。環境変数: `TERMINAL_DOCKER_NETWORK`） —
`false` に設定すると、サンドボックスコンテナを `--network=none` で実行し、エージェントの
コマンドからのネットワーク発信をすべて遮断します。これは `terminal`、`execute_code`、
ファイルツールが使う実行用コンテナに適用されます。コンテナは Hermes のプロセスをまたいで
永続化されるため、既にネットワークに接続された古いコンテナが存在する状態でこれを
`false` に切り替えると、そのコンテナは削除され、新しい air-gap されたコンテナが
起動します（警告がログに出ます）。その中で動いていたバックグラウンドプロセスは
失われます。`docker_extra_args` 経由で `--network=none` を渡すより、このキーを
使うことを優先してください。

**必要条件:** Docker Desktop または Docker Engine がインストールされ、動いている
必要があります。Hermes は `$PATH` に加えて、一般的な macOS のインストール場所
（`/usr/local/bin/docker`、`/opt/homebrew/bin/docker`、Docker Desktop のアプリバンドル）
を調べます。Podman もそのまま使えます。両方インストールされている場合に Podman を
強制するには `HERMES_DOCKER_BINARY=podman`（またはフルパス）を設定してください。

#### コンテナのライフサイクル {#container-lifecycle}

Hermes が管理するすべてのコンテナには、後続のプロセス（と orphan reaper）が
識別できるよう3つのラベルが付けられます。

- `hermes-agent=1` — Hermes が管理していることを示すマーク
- `hermes-task-id=<sanitized task_id>` — タスクごとの再利用プローブのキー
- `hermes-profile=<sanitized profile name>` — 既定では再利用と reaping の対象を
  アクティブな Hermes プロファイルに限定します。`docker_shared_container_key` が
  設定されている場合は、そのサニタイズされた値が代わりに使われます

起動時、Hermes は `docker ps --filter label=hermes-task-id=<id> --filter
label=hermes-profile=<identity>` を実行し、既存のコンテナが見つかれば**それに
アタッチします**。この identity は、`docker_shared_container_key` が明示的に
信頼済みのプロファイルを共通の値に加入させていない限り、アクティブなプロファイルです。
コンテナが `exited`（例えば Docker デーモンの再起動後など）の場合は `docker start`
され、再利用されます — ファイルシステムの状態とインストール済みのパッケージは
残りますが、コンテナ内のバックグラウンドプロセスは残りません。

Hermes のプロセスが終了するとき — `/quit`、TUI セッションを閉じる、gateway の
シャットダウン、SIGKILL であっても — そのクリーンアップ処理は**既定モードでは
コンテナに対して何もしません（no-op）**。コンテナは動き続けます。次の Hermes
プロセスは、ラベルによるプローブを通じてミリ秒単位でそれにアタッチします。これが
「セッション間で共有される1つの長期稼働コンテナ」という契約が求める挙動です。
バックグラウンドプロセス（npm のウォッチャー、開発サーバー、長時間動く pytest）が
セッションをまたいで生き残る唯一の方法です。

**コンテナが破棄される（停止して `docker rm -f` される）のは、次の場合だけです。**

| トリガー | 発生するタイミング |
|---|---|
| `docker_persist_across_processes: false` | プロセスごとの明示的な分離。すべての `cleanup()` が `stop` + `rm -f` を行います。issue #20561 以前の挙動と同じです。 |
| アイドル reaper（`lifetime_seconds`、既定300秒） | env が `persist_across_processes=false` のときだけ発生します。persist モードの env は no-op になり、コンテナはアイドルスイープを乗り切ります。 |
| 次回起動時の orphan reaper | 現在のプロファイルに限定して、`2 × lifetime_seconds`（既定600秒 = 10分）より古い、**Exited** 状態の hermes ラベル付きコンテナを掃除します。**稼働中のコンテナには一切触れません** — 兄弟プロセスの安全のためです。無効にするには `docker_orphan_reaper: false` を設定してください。 |
| ユーザーによる直接の操作 | `docker rm -f`、`docker system prune`、Docker Desktop の再起動。`--restart=always` は設定していないので、ホストの再起動後もコンテナは `Exited` のままです（CoW レイヤーは残り、次回起動時に再利用されますが、バックグラウンドプロセスは失われます）。 |

知っておくべきエッジケース:

- **コンテナ内 PID 1 の OOM kill** はコンテナを `Exited` に遷移させます。次に再利用
  されるときに `docker start` され、ファイルシステムの状態は残りますが、バックグラウンド
  プロセスは残りません。
- **プロファイルの切り替え**はコンテナ同士を互いに分離します — `hermes-profile=work`
  のラベルが付いたコンテナは、`hermes-profile=research` で動いている Hermes プロセスからは
  見えません。orphan reaper もプロファイル単位なので、プロファイルをまたいだコンテナが
  誤って reap されることはありませんが、そのプロファイルで Hermes を再度起動するまで
  自動的にクリーンアップされることもありません。
- **明示的なプロファイル間共有** — 意図的に1つの信頼できるワークスペースで協働する
  プロファイルには、`terminal:` の下に同じ空でない `docker_shared_container_key` を
  設定してください。これはそれらのコンテナ identity のラベルだけを置き換えます。
  タスク、egress、ネットワークの互換性チェックはそのまま適用されます。キーを持たない
  プロファイルは分離されたままです。identity ラベルはキーから短いダイジェストの
  サフィックスを付けて生成されるので、似ているだけのキー（`team/workspace` と
  `team_workspace`）が1つのコンテナに衝突することはありません。**重要: 共有コンテナは、
  最初に起動したプロファイルによって一度だけ作られます** — そのプロファイルの
  `docker_image`、ボリューム、shm サイズなどの不変な Docker 設定が採用され、後から
  来るプロファイルはそのままそれにアタッチします。それらの設定内の異なる値は、
  コンテナが削除されて再作成されるまで無視されます。キーを共有するプロファイルは、
  イメージとマウントについて合意しておくべきです。

`delegate_task(tasks=[...])` 経由で生成された並列のサブエージェントは、この1つの
コンテナを共有します — 同じパスへの同時の `cd`、環境変数の変更、書き込みは衝突します。
サブエージェントが分離されたサンドボックスを必要とする場合は、
`register_task_env_overrides()` を通じてタスクごとのイメージの上書きを登録する
必要があります。RL やベンチマークの環境（TerminalBench2、HermesSweEnv など）は、
それぞれのタスクごとの Docker イメージについてこれを自動的に行っています。

**セキュリティの強化:**
- `--cap-drop ALL` に加えて `DAC_OVERRIDE`、`CHOWN`、`FOWNER` だけを戻す
- `--security-opt no-new-privileges`
- `--pids-limit 256`
- `/tmp`（512MB）、`/var/tmp`（256MB）、`/run`（64MB）にサイズ制限付きの tmpfs <!-- no-tmp: ok — documents the sandbox's own tmpfs -->

**資格情報の転送:** `docker_forward_env` に列挙された環境変数は、まずあなたのシェル
環境から、次に `~/.hermes/.env` から解決されます。スキルも `required_environment_variables`
を宣言でき、それらは自動的にマージされます。

#### 環境変数による上書き {#environment-variable-overrides}

`terminal:` の下にあるすべてのキーには、`TERMINAL_<KEY_UPPERCASE>` という形式の
環境変数による上書きがあります。Docker バックエンドで特に便利なものは次のとおりです。

| 環境変数 | 対応するキー | 補足 |
|---|---|---|
| `TERMINAL_DOCKER_IMAGE` | `docker_image` | ベースイメージ |
| `TERMINAL_DOCKER_FORWARD_ENV` | `docker_forward_env` | JSON 配列: `'["GITHUB_TOKEN","OPENAI_API_KEY"]'` |
| `TERMINAL_DOCKER_ENV` | `docker_env` | JSON dict: `'{"DEBUG":"1"}'` |
| `TERMINAL_DOCKER_VOLUMES` | `docker_volumes` | `"host:container[:ro]"` 形式の文字列の JSON 配列 |
| `TERMINAL_DOCKER_EXTRA_ARGS` | `docker_extra_args` | JSON 配列 |
| `TERMINAL_DOCKER_MOUNT_CWD_TO_WORKSPACE` | `docker_mount_cwd_to_workspace` | `true` / `false` |
| `TERMINAL_DOCKER_RUN_AS_HOST_USER` | `docker_run_as_host_user` | `true` / `false` |
| `TERMINAL_DOCKER_SNAP_COMPAT` | `docker_snap_compat` | `true` / `false` — 既定 `false` |
| `TERMINAL_DOCKER_NETWORK` | `docker_network` | `true` / `false` — 既定 `true`。`false` = `--network=none` |
| `TERMINAL_DOCKER_PERSIST_ACROSS_PROCESSES` | `docker_persist_across_processes` | `true` / `false` — 既定 `true` |
| `TERMINAL_DOCKER_SHARED_CONTAINER_KEY` | `docker_shared_container_key` | 信頼済みプロファイル向けの明示的な共有 identity。既定は空 |
| `TERMINAL_DOCKER_ORPHAN_REAPER` | `docker_orphan_reaper` | `true` / `false` — 既定 `true` |
| `TERMINAL_CONTAINER_CPU` | `container_cpu` | CPU コア数 |
| `TERMINAL_CONTAINER_MEMORY` | `container_memory` | MB |
| `TERMINAL_CONTAINER_DISK` | `container_disk` | MB |
| `TERMINAL_CONTAINER_PERSISTENT` | `container_persistent` | `true` / `false` — bind mount するワークスペースディレクトリを制御する。`docker_persist_across_processes` とは別物 |
| `TERMINAL_LIFETIME_SECONDS` | `lifetime_seconds` | アイドル reaper のウィンドウ |
| `TERMINAL_TEMP_DIR` | `temp_dir` | セッションの一時ファイルのルート（local バックエンド） |
| `TERMINAL_TIMEOUT` | `timeout` | コマンドごとのタイムアウト |
| `HERMES_DOCKER_BINARY` | _なし_ | 特定の docker/podman バイナリのパスを強制する |

### SSH バックエンド {#ssh-backend}

SSH 経由でリモートサーバー上にコマンドを実行します。接続の再利用には ControlMaster
を使います（5分のアイドル keepalive）。永続シェルは既定で有効になっており、状態
（cwd、環境変数）はコマンドをまたいで保たれます。

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
| `TERMINAL_SSH_PORT` | `22` | SSH ポート |
| `TERMINAL_SSH_KEY` | （システムの既定値） | SSH 秘密鍵へのパス |
| `TERMINAL_SSH_PERSISTENT` | `true` | 永続シェルを有効にする |

**仕組み:** 初期化時に `BatchMode=yes` と `StrictHostKeyChecking=accept-new` で
接続します。永続シェルは、一時ファイルを介して通信しながら、リモートホスト上で
1つの `bash -l` プロセスを生かし続けます。`stdin_data` や `sudo` が必要なコマンドは
自動的にワンショットモードにフォールバックします。

**スキル／設定の環境変数転送:** スキルが `required_environment_variables` で宣言する
変数、または `terminal.env_passthrough` の下に列挙した変数は、OpenSSH の `SendEnv`
で転送されます — 名前は `ssh` コマンドライン上に載り、値はクライアントの環境の中を
通っていくので、リモートのコマンドのテキストには決して現れません。リモートの `sshd`
側でそれらを受け付けるよう設定する必要があります。サーバー上の `/etc/ssh/sshd_config`
に追加し、sshd を再読み込みしてください。

```
AcceptEnv NEXTCLOUD_URL NEXTCLOUD_*      # or the names your skills need
```

対応する `AcceptEnv` がないと、サーバーはその変数を黙って落とし、リモートシェルは
それらが未設定のまま見ることになります。Hermes のプロバイダの資格情報
（`OPENAI_API_KEY` など）は、列挙されていても決して転送されません。
[Env Var Passthrough](/hermes/docs/user-guide/security/#environment-variable-passthrough)
を参照してください。

### Modal バックエンド {#modal-backend}

[Modal](https://modal.com) のクラウドサンドボックスでコマンドを実行します。各タスクは、
CPU・メモリ・ディスクを設定できる分離された VM を得ます。ファイルシステムはセッションを
またいでスナップショット／復元できます。

```yaml
terminal:
  backend: modal
  container_cpu: 1                 # CPU cores
  container_memory: 5120           # MB (5GB)
  container_disk: 51200            # MB (50GB)
  container_persistent: true       # Snapshot/restore filesystem
```

**必須:** `MODAL_TOKEN_ID` + `MODAL_TOKEN_SECRET` の環境変数、または `~/.modal.toml`
設定ファイルのどちらかです。

**永続化:** 有効にすると、サンドボックスのファイルシステムはクリーンアップ時に
スナップショットされ、次のセッションで復元されます。スナップショットは
`~/.hermes/modal_snapshots.json` で管理されます。これが保持するのはファイルシステムの
状態だけで、稼働中のプロセス、PID 空間、バックグラウンドジョブは保持されません。

**資格情報ファイル:** `~/.hermes/`（OAuth トークンなど）から自動的にマウントされ、
各コマンドの前に同期されます。

### Daytona バックエンド {#daytona-backend}

[Daytona](https://daytona.io) が管理するワークスペースでコマンドを実行します。
永続化のための stop/resume をサポートします。

```yaml
terminal:
  backend: daytona
  container_cpu: 1                 # CPU cores
  container_memory: 5120           # MB → converted to GiB
  container_disk: 10240            # MB → converted to GiB (max 10 GiB)
  container_persistent: true       # Stop/resume instead of delete
```

**必須:** `DAYTONA_API_KEY` 環境変数。

**永続化:** 有効にすると、サンドボックスはクリーンアップ時に（削除ではなく）停止され、
次のセッションで再開されます。サンドボックス名は `hermes-{task_id}` というパターンに
従います。

**ディスクの上限:** Daytona は最大10 GiB を強制します。これを超えるリクエストは
警告を出しつつ上限に切り詰められます。

### Vercel Sandbox バックエンド {#vercel-sandbox-backend}

[Vercel Sandbox](https://vercel.com/docs/vercel-sandbox) のクラウド microVM で
コマンドを実行します。Hermes は通常のターミナルとファイルツールの面をそのまま使います。
Vercel 専用のモデル向けツールはありません。

```yaml
terminal:
  backend: vercel_sandbox
  vercel_runtime: node24          # node24 | node22 | python3.13
  cwd: /vercel/sandbox            # default workspace root
  container_persistent: true      # Snapshot/restore filesystem
  container_disk: 51200           # Shared default only; custom disk is unsupported
```

**必要なインストール:** オプションの SDK extra をインストールします。

```bash
pip install 'hermes-agent[vercel]'
```

**必要な認証:** `VERCEL_TOKEN`、`VERCEL_PROJECT_ID`、`VERCEL_TEAM_ID` の3つすべてを
使ってアクセストークン認証を設定してください。これが、Render、Railway、Docker などの
ホスト上での本番デプロイと通常の長時間稼働する Hermes プロセスでサポートされている
セットアップです。

一度きりのローカル開発では、Hermes は短命な Vercel OIDC トークンも受け付けます。

```bash
VERCEL_OIDC_TOKEN="$(vc project token <project-name>)" hermes chat
```

リンクされた Vercel プロジェクトのディレクトリからは、プロジェクト名を省略できます。

```bash
VERCEL_OIDC_TOKEN="$(vc project token)" hermes chat
```

OIDC トークンは短命なので、正式なデプロイの経路として使うべきではありません。

**ランタイム:** `terminal.vercel_runtime` は `node24`、`node22`、`python3.13` を
サポートします。未設定の場合、Hermes は既定で `node24` を使います。

**永続化:** `container_persistent: true` のとき、Hermes はクリーンアップ中に
サンドボックスのファイルシステムをスナップショットし、同じタスクの後続のサンドボックスを
そのスナップショットから復元します。スナップショットの内容には、サンドボックスに
コピーされた、Hermes が同期した資格情報・スキル・キャッシュファイルが含まれることが
あります。これが保持するのはファイルシステムの状態だけで、稼働中のサンドボックスの
identity、PID 空間、シェルの状態、動いているバックグラウンドプロセスは保持されません。

**バックグラウンドコマンド:** `terminal(background=true)` は、Hermes の汎用的な
非ローカルのバックグラウンドプロセスの流れを使います。サンドボックスが動いている
間は、通常のプロセスツールを通じて起動・ポーリング・待機・ログ表示・kill ができます。
Hermes は、クリーンアップや再起動後に Vercel のデタッチされたプロセスをネイティブに
回復する機能は提供していません。

**ディスクのサイズ設定:** Vercel Sandbox は現時点で Hermes の `container_disk`
リソースつまみをサポートしていません。`container_disk` は未設定のまま、または
共有の既定値 `51200` のままにしてください。既定値以外の値は、黙って無視されるのではなく、
診断とバックエンドの作成が失敗します。

### Singularity/Apptainer バックエンド {#singularityapptainer-backend}

[Singularity/Apptainer](https://apptainer.org) コンテナでコマンドを実行します。
Docker が使えない HPC クラスタや共有マシン向けに設計されています。

```yaml
terminal:
  backend: singularity
  singularity_image: "docker://nikolaik/python-nodejs:python3.11-nodejs20"
  container_cpu: 1                 # CPU cores
  container_memory: 5120           # MB
  container_persistent: true       # Writable overlay persists across sessions
```

**必要条件:** `$PATH` に `apptainer` または `singularity` のバイナリがあること。

**イメージの扱い:** Docker の URL（`docker://...`）は自動的に SIF ファイルに変換され、
キャッシュされます。既存の `.sif` ファイルはそのまま使われます。

**Scratch ディレクトリ:** 次の順序で解決されます: `TERMINAL_SCRATCH_DIR` →
`TERMINAL_SANDBOX_DIR/singularity` → `/scratch/$USER/hermes-agent`（HPC の慣習） →
`~/.hermes/sandboxes/singularity`。

**分離:** ホストのホームディレクトリをマウントせずに完全な namespace 分離を行うため、
`--containall --no-home` を使います。

### ターミナルバックエンドの共通の問題 {#common-terminal-backend-issues}

ターミナルコマンドが即座に失敗する、またはターミナルツールが無効だと報告される場合:

- **Local** — 特別な要件はありません。使い始めるときの最も安全な既定値です。
- **Docker** — `docker version` を実行して Docker が動いていることを確認してください。
  失敗する場合は Docker を修正するか、`hermes config set terminal.backend local` を
  実行してください。
- **SSH** — `TERMINAL_SSH_HOST` と `TERMINAL_SSH_USER` の両方が設定されている必要が
  あります。どちらかが欠けている場合、Hermes は分かりやすいエラーをログに出します。
- **Modal** — `MODAL_TOKEN_ID` の環境変数か `~/.modal.toml` が必要です。
  `hermes doctor` で確認してください。
- **Daytona** — `DAYTONA_API_KEY` が必要です。サーバー URL の設定は Daytona SDK が
  処理します。
- **Singularity** — `$PATH` に `apptainer` または `singularity` が必要です。HPC
  クラスタではよくあります。

迷ったときは、`terminal.backend` を `local` に戻し、まずそこでコマンドが動くことを
確認してください。

### 破棄時のリモート→ホスト状態同期 {#remote-to-host-state-sync-on-teardown}

**SSH**、**Modal**、**Daytona** バックエンドでは、Hermes はセッション中に
あなたの `~/.hermes/` の状態（資格情報ファイル、スキル、キャッシュ）をリモートの
サンドボックスに push し、破棄時に**変更された状態ファイルをホスト側に同期して
戻します**。（コンテンツのハッシュで比較して）最初に push されたものと異なる
ファイルは、そのままの場所に反映されます。同期対象のディレクトリの下にある新しい
リモートファイル（例: エージェントがリモートで作成したスキル）は、対応するホストの
パスにマッピングされます。アップロード専用の資格情報ファイルは、ホスト側で決して
上書きされません。

- 同期の書き戻しはバックオフ付きで最大3回まで再試行し、2 GiB より大きいリモートの
  アーカイブの展開は拒否します。より大きな状態のツリーで上限を上げるには、
  `config.yaml` に `terminal.sync_back_max_bytes`（バイト単位）を設定してください。
  リモートの `~/.hermes/` の下にあるライブなソケット（`gateway.sock` など）は、転送を
  失敗させるのではなくスキップされます。
- ダウンロードされたアーカイブは、システムの一時ディレクトリの下
  （`hermes-sync-back-<pid>-*`）にステージングされます。強制終了されたプロセスの
  残骸は、次回の同期の書き戻しで回収されます。
- Docker と Singularity は bind mount（ホストのファイルシステムをそのまま見せる方式）
  を使うので、これは不要です。
- これがカバーするのは Hermes の状態（`~/.hermes/`）だけで、サンドボックス内の
  任意の作業ツリーのファイルは**対象外**です — サンドボックスが破棄される前に、
  重要な成果物は明示的にエージェントにコピーさせてください（例: `scp`、
  `modal volume put`）。

### Docker のボリュームマウント {#docker-volume-mounts}

Docker バックエンドを使う場合、`docker_volumes` でホストのディレクトリをコンテナと
共有できます。各エントリは標準の Docker `-v` の書き方を使います:
`host_path:container_path[:options]`。

```yaml
terminal:
  backend: docker
  docker_volumes:
    - "/home/user/projects:/workspace/projects"   # Read-write (default)
    - "/home/user/datasets:/data:ro"              # Read-only
    - "/home/user/.hermes/cache/documents:/output" # Gateway-visible exports
```

これは次のような場合に便利です。
- エージェントに**ファイルを渡す**（データセット、設定、参照コード）
- エージェントから**ファイルを受け取る**（生成されたコード、レポート、エクスポート）
- あなたとエージェントの両方が同じファイルにアクセスする**共有ワークスペース**

メッセージング gateway を使っていて、エージェントに `MEDIA:/...` 経由で生成した
ファイルを送らせたい場合は、`/home/user/.hermes/cache/documents:/output` のような
専用のホストから見えるエクスポート用マウントを使ってください。

- Docker 内では `/output/...` にファイルを書き込む
- `MEDIA:` には**ホスト側のパス**を出す。例:
  `MEDIA:/home/user/.hermes/cache/documents/report.txt`
- その正確なパスがホスト上の gateway プロセスにも存在しない限り、
  `/workspace/...` や `/output/...` を出力**しない**

:::warning
YAML の重複キーは、後のものが前のものを黙って上書きします。既に
`docker_volumes:` ブロックがある場合は、ファイル内で後からもう1つ
`docker_volumes:` キーを追加するのではなく、新しいマウントを同じリストに
統合してください。
:::

環境変数でも設定できます: `TERMINAL_DOCKER_VOLUMES='["/host:/container"]'`（JSON 配列）。

### Docker の資格情報転送 {#docker-credential-forwarding}

既定では、Docker のターミナルセッションは任意のホストの資格情報を継承しません。
コンテナ内で特定のトークンが必要な場合は、`terminal.docker_forward_env` に
追加してください。

```yaml
terminal:
  backend: docker
  docker_forward_env:
    - "GITHUB_TOKEN"
    - "NPM_TOKEN"
```

Hermes は、列挙された各変数をまず現在のシェルから解決し、`hermes config set` で
保存されていれば `~/.hermes/.env` にフォールバックします。

:::warning
`docker_forward_env` に列挙したものは、コンテナ内で実行されるコマンドから見える
ようになります。ターミナルセッションに公開しても構わないと思える資格情報だけを
転送してください。
:::

### コンテナをホストユーザーとして実行する {#running-the-container-as-your-host-user}

既定では Docker コンテナは `root`（UID 0）として動きます。`/workspace` や
その他の bind-mount 内で作られたファイルはホスト上で root 所有になってしまうので、
セッションの後にホストのエディタから編集する前に `sudo chown` する必要があります。
`terminal.docker_run_as_host_user` フラグはこれを解決します。

```yaml
terminal:
  backend: docker
  docker_run_as_host_user: true   # default: false
```

有効にすると、Hermes は `docker run` コマンドに `--user $(id -u):$(id -g)` を追加するので、
bind mount されたディレクトリ（`/workspace`、`/root`、`docker_volumes` にあるもの）に
書き込まれるファイルは root ではなくあなたのホストユーザーの所有になります。
トレードオフとして、コンテナはもう `apt install` したり `/root/.npm` のような
root 所有のパスに書き込んだりできなくなります。両方が必要な場合は、`HOME` を
非 root ユーザーが所有しているベースイメージを使うか（あるいは必要なツールを
イメージのビルド時に追加してください）。

これを `false`（既定値）のままにしておくと、後方互換の挙動になります。ワークフローの
大半が「マウントされたホストのファイルを編集する」ことで、`sudo chown -R` に
うんざりしているなら有効にしてください。

### snap パッケージの Docker（AppArmor） {#snap-packaged-docker-apparmor}

Docker が snap としてインストールされたホスト（Ubuntu のクラウドイメージ、例えば
Azure VM でよくあります）では、snap の AppArmor の閉じ込めがサンドボックス強化の
フラグのうち2つを拒否し、コンテナが起動時に落ちます。

```
exec /sbin/docker-init: operation not permitted     # --init
exec /usr/bin/sleep: operation not permitted        # --security-opt no-new-privileges
```

これは snapd の制約であって（[LP#1908448](https://bugs.launchpad.net/snapd/+bug/1908448)）、
Hermes が回避策を探れるものではありません。snap の代わりに Docker の apt リポジトリから
Docker をインストールするか（推奨 — 強化はすべて維持されます）、または以下で
オプトインしてください。

```yaml
terminal:
  docker_snap_compat: true   # drops --init and no-new-privileges; cap-drop, tmpfs, PID limits stay
```

これを有効にすると、サンドボックス内のゾンビプロセスは init によって回収されず、
コンテナ内の setuid バイナリが権限を取り戻せるようになります。コンテナ起動時に
警告がログに出ます。

### 任意設定: 起動ディレクトリを `/workspace` にマウントする {#optional-mount-the-launch-directory-into-workspace}

Docker サンドボックスは既定で分離されたままです。明示的にオプトインしない限り、
Hermes はあなたの現在のホストの作業ディレクトリをコンテナに渡し**ません**。

`config.yaml` で有効にします。

```yaml
terminal:
  backend: docker
  docker_mount_cwd_to_workspace: true
```

有効にすると:
- `~/projects/my-app` から Hermes を起動した場合、そのホストのディレクトリが
  `/workspace` に bind mount されます
- Docker バックエンドは `/workspace` から起動します
- ファイルツールとターミナルコマンドの両方が、同じマウントされたプロジェクトを見ます

無効にすると、`docker_volumes` で明示的に何かをマウントしない限り、`/workspace` は
サンドボックス専有のままです。

セキュリティ上のトレードオフ:
- `false` はサンドボックスの境界を保ちます
- `true` は、Hermes を起動したディレクトリへのアクセスをサンドボックスに直接与えます

このオプトインは、コンテナに実際のホストのファイルを操作させたいと意図している
場合にだけ使ってください。

`terminal.cwd` 内のホストパス（例えば Windows の `C:\Users\me\project`、または
デスクトップ／TUI セッションのワークスペース）は、決してコンテナの作業ディレクトリには
なりません。それが `/workspace` にマウントされているディレクトリである場合、
ファイルツールとターミナルコマンドは `/workspace` を使います。それ以外の場合、
コンテナは自身の作業ディレクトリを保ちます。ファイルツールがそれでも作業ディレクトリに
入れない場合、エラーはシェルの生の `cd:` 行ではなく、アクティブなバックエンドの
無効な `terminal.cwd` を名指しします。

### 永続シェル {#persistent-shell}

既定では、各ターミナルコマンドは独自のサブプロセスで実行され、作業ディレクトリ・
環境変数・シェル変数はコマンドの間でリセットされます。**永続シェル**を有効にすると、
`execute()` の呼び出しをまたいで1つの長期稼働の bash プロセスが生かされたままになり、
状態がコマンド間で保たれます。

これは**SSH バックエンド**で最も役立ちます。そこではコマンドごとの接続オーバーヘッドも
なくなります。永続シェルは**SSH では既定で有効**で、local バックエンドでは無効です。

```yaml
terminal:
  persistent_shell: true   # default — enables persistent shell for SSH
```

無効にするには:

```bash
hermes config set terminal.persistent_shell false
```

**コマンド間で保たれるもの:**
- 作業ディレクトリ（`cd ~/project` は次のコマンドにも引き継がれます）
- エクスポートされた環境変数（`export FOO=bar`）
- シェル変数（`MY_VAR=hello`）

**優先順位:**

| レベル | 変数 | 既定値 |
|-------|----------|---------|
| Config | `terminal.persistent_shell` | `true` |
| SSH の上書き | `TERMINAL_SSH_PERSISTENT` | config に従う |
| local の上書き | `TERMINAL_LOCAL_PERSISTENT` | `false` |

バックエンドごとの環境変数が最も優先されます。local バックエンドでも永続シェルを
使いたい場合は:

```bash
export TERMINAL_LOCAL_PERSISTENT=true
```

:::note
`stdin_data` や sudo を必要とするコマンドは、永続シェルの stdin が既に IPC
プロトコルで占有されているため、自動的にワンショットモードにフォールバックします。
:::

各バックエンドの詳細については [Code Execution](/hermes/docs/user-guide/features/code-execution/) と
[README のターミナルの節](/hermes/docs/user-guide/features/tools/) を参照してください。

## スキルの設定 {#skill-settings}

スキルは、自身の SKILL.md のフロントマターを通じて独自の設定項目を宣言できます。
これらはシークレットではない値（パス、好み、ドメイン固有の設定）で、`config.yaml`
の `skills.config` 名前空間の下に保存されます。

```yaml
skills:
  config:
    myplugin:
      path: ~/myplugin-data   # Example — each skill defines its own keys
```

**スキルの設定の仕組み:**

- `hermes config migrate` は有効になっているすべてのスキルを走査し、設定されていない
  項目を見つけて、あなたに入力を促すことを提案します
- `hermes config show` は「Skill Settings」の下に、それがどのスキルに属するかと共に
  すべてのスキル設定を表示します
- スキルが読み込まれるとき、解決済みの設定値は自動的にスキルのコンテキストに
  注入されます

**値を手動で設定する:**

```bash
hermes config set skills.config.myplugin.path ~/myplugin-data
```

自分のスキルで設定項目を宣言する方法の詳細は、
[Creating Skills — Config Settings](/hermes/docs/developer-guide/creating-skills/#config-settings-configyaml)
を参照してください。

### セッションごとにスキルを自動読み込みする {#auto-loading-skills-every-session}

新しいセッションの開始時、どの面でも常にフルで読み込まれるようスキルを固定します。

```yaml
skills:
  auto_load:
    - my-workflow
    - github-pr-workflow
```

システムプロンプトが最初に組み立てられるときにセッションごとに1回だけ解決されます
（そのためプロンプトはキャッシュ上安定した状態を保ち、編集は次のセッションから
適用されます）。見つからない、または無効化されているスキルは警告を出しつつ
スキップされます。`--ignore-rules` / `HERMES_IGNORE_RULES=1` はこのリストを抑制します。
プロファイル単位です。[CLI — persistent auto-load](/hermes/docs/user-guide/cli/#persistent-auto-load-via-config)
を参照してください。

### エージェントが作成したスキルの書き込みへのガード {#guard-on-agent-created-skill-writes}

エージェントが `skill_manage` を使ってスキルを作成・編集・パッチ・削除するとき、
Hermes は新規／更新されたコンテンツを危険なキーワードのパターン（資格情報の収集、
明らかなプロンプトインジェクション、持ち出しの指示）についてオプションで走査できます。
このスキャナーは**既定で無効**です — `~/.ssh/` に正当に触れたり `$OPENAI_API_KEY`
に言及したりする本物のエージェントのワークフローが、このヒューリスティックに
あまりに頻繁に引っかかっていたためです。エージェントのスキルの書き込みが反映される前に
スキャナーに確認を求めさせたい場合は、これを再度有効にしてください。

```yaml
skills:
  guard_agent_created: true   # default: false
```

有効にすると、フラグが立った `skill_manage` の書き込みは、スキャナーの判断理由と共に
承認の確認として表示されます。承認された書き込みは反映され、拒否された書き込みは
エージェントに説明付きのエラーを返します。

### スキルの書き込みの承認 {#write-approval-for-skill-writes}

上記のコンテンツスキャナーとは独立して、`skills.write_approval` は**すべての**
エージェントのスキル書き込み（作成／編集／パッチ／削除／付随ファイル）を、
危険なコマンドと同じ承認／拒否の仕組みの背後に置きます。

```yaml
skills:
  write_approval: false   # false = write freely (default) | true = stage every write for review
```

有効にすると、スキルの書き込みは `~/.hermes/pending/skills/` の下にステージングされ、
`/skills pending`、`/skills diff <id>`、`/skills approve <id>`、`/skills reject <id>`
で確認できます — CLI からでも、任意のメッセージングプラットフォームからでも同じです。
実行時に `/skills approval on|off` で切り替えられます。メモリにも同じゲートがあります
（後述の `memory.write_approval`）。詳しい手順は
[Gating agent skill writes](/hermes/docs/user-guide/features/skills/#gating-agent-skill-writes-skillswrite_approval)
を参照してください。

## メモリの設定 {#memory-configuration}

```yaml
memory:
  memory_enabled: true
  user_profile_enabled: true
  memory_char_limit: 2200   # ~800 tokens
  user_char_limit: 1375     # ~500 tokens
  write_approval: false     # true = require approval before any memory write
```

`memory.write_approval: true` にすると、メモリの書き込みが反映される前にあなたの
承認が必要になります。対話的な CLI のターンではインラインで確認を求められ、
メッセージングのセッションとバックグラウンドの自己改善レビューでは、`/memory pending`
→ `/memory approve <id>` / `/memory reject <id>` での確認のために書き込みが
ステージングされます。実行時に `/memory approval on|off` で切り替えられます。
[Controlling memory writes](/hermes/docs/user-guide/features/memory/#controlling-memory-writes-write_approval)
を参照してください。

## コンテキストファイルの切り詰め {#context-file-truncation}

head/tail の切り詰めを適用する前に、Hermes が各自動コンテキストファイルから
どれだけの内容を読み込むかを制御します。これは `SOUL.md`、`.hermes.md`、
`AGENTS.md`、`CLAUDE.md`、`.cursorrules` のようにシステムプロンプトに注入される
ファイルに適用されます。`read_file` ツールには影響**しません**。

```yaml
context_file_max_chars: null  # default — dynamic cap scaled to the model's context window (floor 20K, ceiling 500K chars)
```

動的な挙動の代わりに固定の上限を決める場合は、正の整数を設定してください。

```yaml
context_file_max_chars: 25000
```

各コンテキストファイルの読み込みは `context_file_read_timeout`（秒。既定 `5.0`）
によっても制限されます。読み込みにそれより時間がかかるファイル — 典型的には
iCloud Drive、OneDrive、NFS のようなネットワークバックのファイルシステム上の
ファイル — は警告付きでスキップされ、システムプロンプトの残りの部分は読み込まれます。

```yaml
context_file_read_timeout: 5.0
```

## ファイル読み込みの安全性 {#file-read-safety}

1回の `read_file` 呼び出しが返せる内容の量を制御します。この上限を超える読み込みは、
より小さい範囲のために `offset` と `limit` を使うようエージェントに伝えるエラーで
拒否されます。これにより、圧縮された JS バンドルや大きなデータファイルの1回の読み込みで
コンテキストウィンドウが溢れることを防ぎます。

```yaml
file_read_max_chars: 100000  # default — ~25-35K tokens
```

大きなコンテキストウィンドウを持つモデルを使い、大きなファイルを頻繁に読む場合は
上げてください。小さいコンテキストのモデルでは、読み込みを効率的に保つために
下げてください。

```yaml
# Large context model (200K+)
file_read_max_chars: 200000

# Small local model (16K context)
file_read_max_chars: 30000
```

エージェントはファイルの読み込みも自動的に重複排除します — 同じファイルの範囲が
2回読まれ、ファイルが変わっていない場合、内容を再送する代わりに軽量なスタブが
返されます。これはコンテキストの圧縮でリセットされるので、内容が要約されて
消えた後でもエージェントはファイルを再度読めます。

## ツール出力の切り詰めの上限 {#tool-output-truncation-limits}

ツールが返せる生の出力の量を、Hermes が切り詰める前に制御する、関連する3つの
上限があります。

```yaml
tool_output:
  max_bytes: 50000        # terminal output cap (chars)
  max_lines: 2000         # read_file pagination cap
  max_line_length: 2000   # per-line cap in read_file's line-numbered view
```

- **`max_bytes`** — `terminal` コマンドの stdout/stderr を合わせた文字数がこれを
  超えると、Hermes は最初の40%と最後の60%を残し、その間に `[OUTPUT TRUNCATED]`
  という通知を挿入します。既定 `50000`（一般的なトークナイザーでおおよそ12〜15Kトークン）。
- **`max_lines`** — 1回の `read_file` 呼び出しの `limit` パラメータの上限です。
  これを超えるリクエストはクランプされるので、1回の読み込みでコンテキストウィンドウが
  溢れることはありません。既定 `2000`。
- **`max_line_length`** — `read_file` が行番号付きのビューを出力するときに適用される
  行ごとの上限です。これより長い行は、この文字数まで切り詰められ `... [truncated]`
  が付きます。既定 `2000`。

1回の呼び出しでより多くの生の出力を許容できる、大きなコンテキストウィンドウを
持つモデルでは上限を上げてください。小さいコンテキストのモデルでは、ツールの
結果をコンパクトに保つために下げてください。

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

### ツール結果のあふれ予算 {#tool-result-spillover-budget}

切り詰めとは別に、大きすぎるツール*結果*は切り捨てられるのではなくディスクに
あふれ出されます。全体の出力は `$HERMES_HOME/cache/spillover/` の下に保存され、
コンテキスト内の内容はプレビューと保存されたファイルのパス（`offset`/`limit` を
使った `read_file` で読めるほか、`execute_code` で処理もできます）に置き換わります。
汎用的な1結果あたりのあふれ閾値は100,000文字で、小さいコンテキストのモデルでは
自動的に縮小されます。

MCP ツールの結果（`mcp_*` という名前のツール）は、より厳しい既定値
**50,000文字**であふれます。MCP サーバーは、そうしないと汎用の閾値の下に
収まってしまい後続のすべてのターンでコンテキストを肥大させる、ページ分割
されていない大きなペイロード（ツール発見のカタログ、まとめられた実行結果）を
日常的に返します。何も失われません — 全体の結果はディスク上に保持されます。
この閾値は次で上書きできます。

```yaml
tool_budget:
  mcp_result_size_chars: 50000   # per-result spillover threshold for mcp_* tools
```

MCP の閾値は、常に（コンテキストに応じて調整されている場合もある）汎用の
1結果あたりの閾値でクランプされるので、上げてもアクティブなモデルのウィンドウが
許す量を超えることはできません。

Hermes は**プロバイダ側の省略**も検知します。MCP や web ツールの結果が独自の
切り詰めマーカー（`...N more items`、`"has_more": true`、「saved to sandbox」という
注記など）を含んでいる場合、結果に1行の通知が追加され、見えているデータが不完全であり、
どんな列挙も完全だと扱う前にページングまたは再取得すべきだと警告します。

## グローバルなツールセットの無効化 {#global-toolset-disable}

CLI とすべての gateway プラットフォームをまたいで特定のツールセットを一箇所で
抑制するには、`agent.disabled_toolsets` の下にその名前を列挙します。

```yaml
agent:
  disabled_toolsets:
    - memory       # hide memory tools + MEMORY_GUIDANCE injection
    - web          # no web_search / web_extract anywhere
```

これはプラットフォームごとのツール設定（`hermes tools` が書き込む
`platform_toolsets`）の**後に**適用されるので、ここに列挙されたツールセットは、
あるプラットフォームの保存済みの設定にまだそれが載っていても、常に取り除かれます。
`hermes tools` の UI で15以上あるプラットフォームの行を編集するのではなく、
「Xをどこでも無効にする」ための単一のスイッチが欲しいときに使ってください。

リストを空にする、またはこのキー自体を省略するのは no-op です。

## Git Worktree による分離 {#git-worktree-isolation}

同じリポで複数のエージェントを並列に動かすための、分離された git worktree を
有効にします。

```yaml
worktree: true    # Always create a worktree (same as hermes -w)
# worktree: false # Default — only when -w flag is passed
```

有効にすると、各 CLI セッションは `.worktrees/` の下に、自分専用のブランチを持つ
新しい worktree を作ります。エージェントはお互いに干渉せずにファイルを編集し、
コミットし、push し、PR を作れます。クリーンな worktree は終了時に削除され、
変更が残っている worktree は手動回収のために残されます。

既定では、新しい worktree は**取得し直した直後のリモートの最新点**（現在の
ブランチの upstream、なければリモートのデフォルトブランチ）からブランチを切ります。
ローカルのクローンがどれだけ遅れているかに関わらず古いままの可能性がある
ローカルの `HEAD` からではなく、プロジェクトの最新状態から始まるということです。
これにより、PR の diff が実際の変更だけに絞られ、ローカルのクローンが遅れていた
分をそのまま引き継ぐことがなくなります。代わりにローカルの `HEAD` からブランチを
切るには `worktree_sync: false` を設定してください。オフラインのとき、または
クローンの現在の状態そのものをベースにしたいときに便利です。リモートに到達できない
場合は、自動的にローカルの `HEAD` にフォールバックします。

```yaml
worktree_sync: true    # Default — branch from the fetched remote tip
# worktree_sync: false # Branch from local HEAD (offline / pinned base)
```

リポのルートに `.worktreeinclude` を置くことで、worktree にコピーする
gitignore 対象のファイルを列挙することもできます。

```
# .worktreeinclude
.env
.venv/
node_modules/
```

## コンテキストの圧縮 {#context-compression}

Hermes は、あなたのモデルのコンテキストウィンドウ内に収まるように、長い会話を
自動的に圧縮します。圧縮の要約器は別の LLM 呼び出しで、任意のプロバイダや
エンドポイントを指定できます。

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

:::info レガシー設定の移行
`compression.summary_model`、`compression.summary_provider`、
`compression.summary_base_url` を持つ古い設定は、初回読み込み時
（設定バージョン17）に自動的に `auxiliary.compression.*` へ移行されます。
手動の操作は不要です。
:::

`progress_notices`（既定 `false`）は、**通常の**圧縮の進行状況がチャットプラットフォーム
（Telegram、Discord、Slack など）に届くかどうかを制御します。設計上、自動的な圧縮は
チャットの面では無音です — サーバー側のログだけを伴ってバックグラウンドで動きます。
`progress_notices: true` を設定すると、チャットプラットフォーム上で通常のライフサイクルを
見られるようになります。「Compacting context…」の開始通知、preflight／API 前の
圧縮のトリガー、アイドル圧縮、再試行の進行状況（「Compressed 30 → 12 messages,
retrying…」）、「Context compaction complete」の通知です。このゲートは圧縮の
ステータスだけに範囲を絞っており、関係のない運用上の雑音（補助モデルの失敗、
プロバイダのレート制限／再試行のノイズ）は、この設定に関わらず抑制され続けます。
圧縮の**失敗**通知と手動の `/compress` のフィードバックは、この設定に関わらず常に
表示されます。動いている gateway でこの値を編集すると、次のメッセージから
反映されます。

`hygiene_hard_message_limit` は gateway 専用の**圧縮前の安全弁**です。これは
死のスパイラルを断ち切るために存在します。肥大化したセッションで API 呼び出しが
切断され続けると、gateway はトークン使用量のデータを受け取れず、そのため
トークンベースの閾値が発火せず、そのため transcript は増え続け、切断はさらに
悪化します。この件数ベースの下限は、（API の失敗に関わらず常に分かる）メッセージ数
だけで発火し、圧縮を強制してセッションを復旧させます。既定 `5000` — 通常の
セッションよりはるかに大きく、これより先にトークンの閾値で圧縮される、大きな
コンテキスト（100万トークン超）のモデルで何千もの短いターンをこなす場合も
含みます。特殊なプラットフォームではさらに上げ、より積極的な圧縮を強制するなら
下げてください。動いている gateway でこの値を編集すると、次のメッセージから
反映されます（下記参照）。

同じ上限は、ターンが始まる時点までに hygiene（衛生）圧縮が終わっていない場合
（ターン保留の予算が切れた、要約がタイムアウトまたは失敗した、失敗クールダウンが
発生中、別の圧縮がまだ進行中、または圧縮が無効化されている）に、**モデルに送る
内容の fail-closed の上限**にもなります。その場合、gateway は先頭のシステム／
セットアップの行と最新のメッセージを、合計で最大 `hygiene_hard_message_limit` まで
保持し、保持したテール部分を孤立したツール結果から始めることは決してありません。
クリップされるのはその1回のターンのペイロードだけです — ディスク上の transcript
は触れられず、何も削除されず、後で到着した要約はそのまま採用されます。これが、
圧縮のパスが何度も失敗し続けても、1週間分の DM が丸ごと非圧縮のままモデルに
送られることを防ぐ仕組みです。

`hygiene_timeout_seconds` は、このエージェント実行前の圧縮パスに対する
gateway の**無活動予算**です — 総経過時間の上限ではありません。圧縮の要約
呼び出しはモデルからストリーミングされ、届いた各トークンは前進として数えられます。
まだ生成中の遅い推論モデルは自分自身の期限を延ばし続けるので、遅いが健全な
要約モデルが生成の途中で切られることはありません。要約モデルがこの秒数の間
**何も出力しない**場合にだけ、gateway はユーザーに警告し、圧縮なしで受信メッセージを
続行し、詰まって見える代わりにセッションごとの一時的な失敗クールダウンを
記録します。

`hygiene_total_ceiling_seconds`（既定 `600`）は、トークンがまだ動いている間でも
総待機時間を制限するので、退化したトリクルストリームがターンを無期限に
人質にすることはできません。少なくとも `hygiene_timeout_seconds` にクランプされます。

`hygiene_max_turn_hold_seconds`（既定 `10`）は、gateway の**ターン保留予算**です
— gateway が待つのをやめて非圧縮の transcript のまま進める前に、受信メッセージが
hygiene 圧縮を待って保留される最大の経過時間です。これが存在する理由は、
`hygiene_total_ceiling_seconds` だけでは、チャットのトランスポートのアイドル
タイムアウトよりはるかに長い間、通信路が無音になり得るためです。トークンを
ストリーミングし続ける要約モデルは無活動の区間をリセットし続けるので、ターン
保留予算がなければ、ユーザーに1バイトも届かないまま待機が上限に向かって伸びる
可能性があります — その後 Telegram（や似たトランスポート）は接続を切ってしまい、
ターンが凍りついたように見えます。ターンの待機をこの予算（一般的な約30秒の
トランスポートのアイドルタイムアウトよりかなり短い値）で上限にすることで、
メッセージが速やかに応答されることを保証します。**予算が切れても圧縮は失われません**
— ワーカーはデタッチされたまま動き続け、そのコミットがウォーターマークで
フェンスされている場合（セッション DB がある通常のケース）は、コミットの受理権を
保ち続けるので、完成した要約は次の安全な境界で採用され、待機が放棄された後に
追加されたターンはそのまま並行するテールとして残ります。これは特に、推論の
フェーズだけで予算を超えることがある**思考／推論系の要約モデル**（DeepSeek、QwQ
など）にとって重要です。要約は消えてしまうのではなく、1ターン遅れて届くだけに
なります。コミットを安全にフェンスできない場合、遅れた結果は破棄され
（`CompressionCommitFence`）、それより新しいターンを上書きすることはできません。
同じターンの中で圧縮を反映させたく、あなたのトランスポートがその待機を許容できる
なら予算を上げ、非常に遅いバックエンドでもっと機敏に復旧させたいなら下げてください。

`hygiene_failure_cooldown_seconds` は、hygiene 圧縮のタイムアウトまたは中断の後の
セッションごとのクールダウンを制御します。クールダウン中、gateway は同じ肥大化した
セッションに対する hygiene の試行を繰り返さないようにするので、すべての受信
メッセージが同じ壊れた補助バックエンドでブロックされることはありません。
`/compress`、`/reset`、または後で健全に動いたターンは、それでもセッションを
復旧させられます。

この値は固定の間隔ではなく、段階的に上がっていくはしごの**最初の段**です。
同じセッションでの連続した失敗は、この値の `1x`、`3x`、そして `9x` の時間だけ
待ちます（上限は1時間）。そのため、要約モデルが恒久的に壊れているセッションは、
固定間隔で永遠に再試行するのではなくバックオフします。実際に transcript を
縮められた実行があれば、最初の段にリセットされます。エスカレーションはセッション
ごと・プロセスローカルです — gateway を再起動すると最初の段にリセットされますが、
クールダウンの期限自体は残ります。

`context_timeout_seconds`（既定 `120`）は、エージェント内の `compress_context`
（会話ループ、preflight の圧縮、手動の `/compress`）に対する同じ**無活動予算**です。
これにより、ハングした要約モデルがセッションを無期限に停止させることはありません。
ストリーミングされる要約のトークンは待機を延ばします — 無音のワーカーだけが
切られます。この予算は、補助圧縮リクエスト自身のタイムアウト
（`auxiliary.compression.timeout`、最小300秒）で下限が決まります。そのため、
ホストが無音の要約器を、リクエスト自体があきらめるより先にあきらめることは
ありません — 最初のトークンの前に考え込む推論系の要約器や、ストリーミングできない
経路も、プロバイダ呼び出しと同じ予算を得ます。タイムアウトすると、Hermes は
`auxiliary.compression.fallback_chain` の最初のエントリに対して要約を1回だけ
再試行します（そのエントリが自身の `timeout` を宣言している場合はそれを使います）
— 詰まった経路は例外を出さないので、補助クライアント自身のフォールバック処理は
それを見ることができません。その試行も失敗した場合、またはフォールバックの
チェーンが設定されていない場合、次に何が起こるかは、リクエストがまだそのモデルの
コンテキストウィンドウに収まるかどうかで決まります。収まるリクエストはこのターンで
非圧縮のまま送られます（要約失敗のクールダウンにより、毎ターン再試行が繰り返されるのを
止めます）。ウィンドウを超えるリクエストはそもそも送れないので、Hermes はターンを
終わらせる代わりに、決定的なフォールバック要約（古いツール結果は刈り取られ、
要約された中間部分の代わりに静的な引き継ぎ内容を置く）をコミットします —
「compression timed out」という復旧結果でターンを終える（そしてメッセージング
gateway の場合は自動的なセッションのリセット）のは最後の手段で、決定的なパスでも
transcript を縮められない場合にだけ到達します。`0` に設定すると無効になります。
ウィンドウを超えたリクエストで何も回収できなかった preflight のパスは、モデルが
受け付けられないリクエストを送る代わりに、新しいセッション（`/new`）を始めるよう
案内してすぐにターンを終えます。gateway のセッション hygiene は自身の
`hygiene_timeout_seconds` の経路を保ち、二重にラップされることはありません。

`context_total_ceiling_seconds`（既定 `600`）は、トークンがまだ動いている間でも、
エージェント内の**コミット前**の待機（要約／ストリームのフェーズ）を制限します。
少なくとも `context_timeout_seconds` にクランプされます。モデルのコンテキスト
ウィンドウをすでに超えているリクエストについては、コミット前の待機はこの上限では
なく1回分の `context_timeout_seconds` の予算で制限されます — そうしたリクエストは
どのみち非圧縮では送れず、何も回収せずにストリーミングを続ける要約は、そうしないと
毎ターン、セッション（と Desktop の UI）を上限までまるごと止めてしまうからです —
その場合、決定的なフォールバック要約が圧縮を担います。要約器が正当により長い時間を
必要とするなら `context_timeout_seconds` を上げてください。正確な保証は次のとおりです:
**要約フェーズはこの上限で制限され、コミットフェーズはそれを超えた場合にログに
出され表面化します。** ワーカーが圧縮コミットのフェンスに入り、SessionDB の変更が
進行中になった後は、コミットが途中で放棄されることは決してありません（それは
transcript の分岐のリスクを冒します）— しかし待機はもはや無音ではありません。
コミットが上限を超えて動いている場合、Hermes はその超過をログに出し（WARNING、
繰り返すと ERROR に上がります）、ユーザーに見える警告チャンネルを通じて1回きりの
警告を送り、コミットが完了するまで一定の間隔で待ち続けます。要約フェーズの間に
上限が切れた場合、要約モデルのストリームは、すべての補助的な通信経路
（chat.completions、Codex Responses、Anthropic Messages）でその瞬間に閉じられます
— 誰も待っていない接続の上で、放棄された要約が完了まで課金され続けることはなく、
そのセッションのリースは次の試行のために解放されます。

`protect_first_n` は、あらゆる圧縮をまたいで固定される**システム以外の**先頭
メッセージの数を制御します。既定は `3` — 最初のユーザー／アシスタントの
やり取りはあらゆる要約パスを乗り切って残るので、元のゴールが見え続けます。
最初のターンがもはや関係ない、長時間動く rolling-compaction のセッションでは、
`protect_first_n: 0` に設定し、システムプロンプト＋要約＋テールだけを固定して
ください。システムプロンプト自体は、この設定に関わらず常に保持されます。

`in_place`（既定 `true`）は、圧縮が発火したときにセッションの identity に何が
起こるかを制御します。`true` の場合、圧縮はメッセージ一覧を書き換え、
**セッション ID を回転させずに**システムプロンプトを再構築します — 会話は
その生涯を通じて1つの永続的な ID を持ち続けます（`parent_session_id` の連鎖も、
セッション一覧での `name #2` / `#3` のような番号振り直しもありません）。圧縮は
破壊的ではありません。ライブなコンテキストは圧縮されますが、圧縮前のターンは
同じ ID の下でソフトアーカイブされます（非アクティブ／圧縮済みとマークされます）
— 削除されるのではなく、`session_search` で検索でき、復旧もできます。Hooks は
`session:compress` イベントの `in_place` フィールドでこのモードを見ることができます。
各圧縮が古いセッションにリンクされた新しいセッション ID に回転する、以前の挙動に
戻すには `in_place: false` を設定してください。

`threshold_tokens` は、圧縮のトリガーに**絶対的なトークンの上限**を設定します。
圧縮は、比率ベースの `threshold` とこの絶対的な件数のどちらか低い方で発火するので、
大きなウィンドウを持つモデルが、圧縮を何十万トークンも先延ばしにしてしまうことは
ありません。既定は `256000` です。これは、100万トークンモデルの既定50%トリガーを
256Kで縁取りしつつ、より低い比率のトリガー（272Kの Codex ウィンドウを含む）が
あればそちらが優先されます。この上限はモデルの切り替えやフォールバックの
アクティベーションをまたいで残り、モデルのコンテキスト長でクランプされます。
比率だけの挙動に戻すには `null` に設定し、あなたのワークロードに合わせて別の
正の値を選んでも構いません。

`idle_compact_after_seconds` は、サイズベースの `threshold` を補う、**オプトイン
かつ時間ベース**のトリガーです。既定 `0`（無効）。0より大きく設定すると、少なくとも
その秒数だけ無活動だった後に再開したセッションは、最初の返信の前に、蓄積された
履歴を先に圧縮します — そのため長期間続くスレッド（例えば数時間後に戻ってくる
Telegram の会話）が、以降のすべてのターンで丸ごと古いコンテキストを再読み込みする
ことはありません。コンテキストが圧縮後の目標（`threshold × target_ratio`）以下に
すでになっている場合は決して発火せず、あらゆる自動圧縮と同じ失敗クールダウン・
アンチスラッシュ・セッションごとのロックのガードを守ります。例: `idle_compact_after_seconds: 1800`
は30分アイドルの後に圧縮します。

`proactive_prune_tokens` は、`threshold` とは独立して動く、決定的で LLM を使わない
古いツール結果ペイロードの刈り取りを有効にします。大きなウィンドウのモデルでは
`threshold` による圧縮（ウィンドウの約50%）はほとんど発火しないので、かさばる
ツールの出力（ターミナルのダンプ、ファイルの読み込み、web からの抜き出し）が
履歴に乗ったまま、以降のすべてのターンで再送されてしまいます。再送される履歴が
`proactive_prune_tokens`（既定 `0` = 無効。有効にするには `48000` を試してください）
を超えると、この刈り取りは同一の結果を重複排除し、古くて大きすぎるものを要約し、
大きなツール呼び出しの引数を切り詰めます — 最新の `protect_last_n` 件のメッセージは
保護され、モデルを呼び出すことは決してありません。その保護は絶対的ではありません
— どの圧縮でも、テール部分だけでその1.5倍のトークン予算を超えている場合には、
保護されたテールの**内側**でツール結果を格下げし、ツール呼び出しの引数を切り詰める
*圧力*パスが実行されます（これは `proactive_prune_tokens` に条件付けられていません）。
どちらのパスも、モデルが再読み込みする履歴のコピーだけを書き換えます — ツール呼び出しは
プロバイダの生の応答から実行され、履歴からは決して実行されないので、すでに発行された
呼び出しの引数がどちらかのパスで変更されることはありません。完全な出力は
セッションストアから回収可能なままです。`proactive_prune_min_result_chars`
（既定 `8000`、200以上にクランプ）は、ツール結果が手を付けられずに残るサイズの
下限を設定します。`proactive_prune_min_reclaim_tokens`（既定 `4096`）は、刈り取りが
少なくともそれだけのトークンを回収しない限りコミットされないようにします —
コミットされた刈り取りは、すでに送信済みの履歴を書き換え、プロバイダの
プロンプトキャッシュの prefix を無効化するので、このゲートはそうしたキャッシュの
断絶を（圧縮の境界のような）意味のある1回きりの断絶にとどめ、償却された形にします。
ツールのイテレーションごとに毎回発火することはありません。これは組み込みの
`compressor` エンジンの下でのみ動作し、他のコンテキストエンジンは no-op を
継承します。

:::tip 圧縮とコンテキスト長の gateway ホットリロード
最近のリリースでは、動いている gateway 上の `config.yaml` の `model.context_length`
や任意の `compression.*` キーを編集すると、次のメッセージから反映されます —
gateway の再起動も、`/reset` も、セッションの回転も不要です。キャッシュされた
エージェントの署名にこれらのキーが含まれるので、gateway は変更を検知すると
透過的にエージェントを再構築します。API キーやツール／スキルの設定は、それでも
通常のリロード経路が必要です。
:::

### よくある構成 {#common-setups}

**既定（自動検出） — 設定不要:**
```yaml
compression:
  enabled: true
  threshold: 0.50
```
あなたのメインのプロバイダとメインのモデルを使います。メインのチャットモデルより
安いモデルで圧縮したい場合は、タスクごとに上書きしてください（例:
`auxiliary.compression.provider: openrouter` + `model: google/gemini-2.5-flash`）。

**特定のプロバイダを強制する**（OAuth または API キーベース）:
```yaml
auxiliary:
  compression:
    provider: nous
    model: gemini-3-flash
```
どのプロバイダでも動作します: `nous`、`openrouter`、`codex`、`anthropic`、`main` など。

**カスタムエンドポイント**（セルフホスト、Ollama、zai、DeepSeek など）:
```yaml
auxiliary:
  compression:
    model: glm-4.7
    base_url: https://api.z.ai/api/coding/paas/v4
```
カスタムの OpenAI 互換エンドポイントを指定します。認証には `OPENAI_API_KEY` を
使います。

### 3つのつまみの相互作用 {#how-the-three-knobs-interact}

| `auxiliary.compression.provider` | `auxiliary.compression.base_url` | 結果 |
|---------------------|---------------------|--------|
| `auto`（既定） | 未設定 | 利用可能な最良のプロバイダを自動検出 |
| `nous` / `openrouter` など | 未設定 | そのプロバイダを強制し、その認証を使う |
| 何でも | 設定済み | カスタムエンドポイントを直接使う（プロバイダは無視される） |

### ストリームの進行状況タイムアウト（Responses ルート） {#stream-progress-timeout-responses-routes}

要約が Responses ストリーム（`openai-codex` プロバイダ、または補助クライアントが
Responses API を通じて動かす任意のルート）上で動くとき、2つの独立したタイムアウトが
適用されます。

- `auxiliary.compression.timeout` — リクエスト全体の予算（既定120秒）。
- `auxiliary.compression.no_progress_timeout` — 試行が
  `Codex auxiliary Responses stream stalled: no new output for Ns` で中断される
  までに、**実質的な**イベント（テキスト／推論のデルタ、または完了した出力
  アイテム）なしでストリームが許容される時間です。未設定時の既定は**60秒**です。
  keepalive やライフサイクルのフレーム（`response.in_progress`、ping）は進行として
  数えられません。実質的なイベントはすべてこのウィンドウを再武装するので、遅くても
  進行している要約は、これによって切られることはありません。

`timeout` だけを上げても、進行状況のウィンドウは広がり**ません** — 600秒に
設定されたリクエストでも、60秒のギャップの後に中断されます。そのギャップを
変えるには `no_progress_timeout` を設定してください。有効なウィンドウは
`timeout` で上限が決まり、ホストのハードな期限／キャンセルはそれでも優先されます。
ここでのより外側の上限はホスト自身の無活動予算です。エージェント内の圧縮は、
無音の要約器に対して `compression.context_timeout_seconds`（既定120秒。有効な
`auxiliary.compression.timeout`（それ自体が最小300秒）で下限が決まります）の後で
あきらめ、gateway の hygiene は `compression.hygiene_timeout_seconds`（既定30秒）の
後であきらめます。そのため、当てはまるホストの予算より大きい `no_progress_timeout`
は、それによって黙って短く切られます。このキーはタスクごと
（`auxiliary.<task>.no_progress_timeout`）なので、圧縮のために広げても他の補助タスクは
変わりません。正の数でない値は、ログに警告を出しつつ無視され、60秒の既定値が
適用されます。

```yaml
auxiliary:
  compression:
    provider: openai-codex
    timeout: 600
    no_progress_timeout: 180   # tolerate a 3-minute silent gap on a long reasoning summary
```

:::warning 要約モデルのコンテキスト長の要件
要約モデルは、あなたのメインのエージェントモデルと少なくとも同じ大きさの
コンテキストウィンドウを**持っていなければなりません**。圧縮器は会話の中間部分
全体を要約モデルに送ります — そのモデルのコンテキストウィンドウがメインのモデルより
小さい場合、要約の呼び出しはコンテキスト長のエラーで失敗します。これが起きると、
中間のターンは**要約なしで捨てられ**、会話のコンテキストが黙って失われます。
モデルを上書きする場合は、そのコンテキスト長がメインのモデルと同じかそれ以上で
あることを確認してください。
:::

## Gateway のターンリース タイムアウト {#gateway-turn-lease-timeout}

gateway は、解決済みのセッション ID でターンを直列化するので、2つのルーティングキーが
同じ transcript を同時に読み込んで書き込むことはありません。通常のエージェントの
無活動タイムアウトとは別に、リースの最大待機時間を設定できます。

```yaml
agent:
  gateway_turn_lease_timeout: 5
```

この予算が切れた時点でまだ別のターンがセッションのリースを保持している場合、
Hermes は fail closed します。待っているメッセージのために transcript を読み込んだり
モデルを実行したりしません。ユーザーは拒否の通知を受け取り、再送する必要があります。
Hermes はメッセージを自動的に再キューしません。永続的な順序保証と冪等性なしにそれを
行うと、2回処理してしまう可能性があるためです。0以下の値は既定の5秒として扱われます。

## セッション停滞ウォッチドッグ {#session-stall-watchdog}

gateway は通知専用の停滞ウォッチドッグ（`agent.session_stall_timeout`、既定 `300`
秒、`0` = 無効）を実行します。処理中のセッションに**保留中の受信フォローアップ**が
あり、エージェントの共有アクティビティクロックが少なくともこの秒数だけアイドルに
なっている場合、gateway は WARNING をログに出し、ユーザーに1回きりの通知を
送ります。

```
⚠️ Agent session appears stalled (last activity N min ago). Try /new to reset.
```

セマンティクス:

- **通知専用です。** このウォッチドッグは決してターンを kill しません — 長時間の
  無活動の後に実行を中断する `agent.gateway_timeout` とは対照的です。停滞の通知は、
  単にエージェントが詰まって見えることを伝え、あなたが判断できるようにするだけです
  （`/new`、`/stop`、あるいは待ち続ける）。
- **停滞エピソードごとに1回の通知です。** 保留中の受信がなくなるか、アクティビティが
  再開すると、このラッチはクリアされます。そのため一度復旧してまた停滞したセッションは
  再び通知します。
- 進行状況は共有のアクティビティスナップショット（ツール呼び出し、API のストリーム
  進行状況、圧縮のハートビート）からしか得られません。保留中の受信は進行のクロックでは
  なく通知のゲートです。

```yaml
agent:
  session_stall_timeout: 300   # seconds; 0 disables the watchdog
```

## 再接続の注意喚起エスカレーション {#reconnect-attention-escalation}

プラットフォームのアダプターが接続に失敗する（ネットワーク障害、失効したボット
トークン、壊れたサイドカー）と、gateway は上限付きの指数バックオフで無期限に
再試行します — 再試行が止まることはないので、一時的な障害は運用者の操作なしに
常に自己回復します。欠点は、*恒久的な*失敗（失効した Telegram トークン、欠けている
Discord の privileged intent）が、一時的な不調と見分けがつかず「retrying」を永遠に
表示し続けることです。

恒久的な失敗を見えるようにする仕組みが2つあります。

- **終端の分類。** 例外の*型*から自己回復し得ないと分かる失敗 — 拒否／失効した
  トークン（`telegram_auth_error`、`discord_auth_error`、`email_auth_error`）、
  欠けている privileged intent（`discord_intents_required`）、依存関係を
  インストールできない Photon サイドカー（`SIDECAR_DEPS_MISSING`）、または node
  バイナリが見つからないサイドカー（`SIDECAR_NODE_MISSING`）— は、再試行のキューに
  入る代わりに fatal とマークされます。分類は厳密に型ベースであり、あいまいな
  エラーは常に再試行を続けます。
- **注意喚起エスカレーション。** `agent.reconnect_attention_after`（既定 `7200`秒
  = 2時間。`0` で無効）を超えて再試行キューに継続的に残っているプラットフォームは、
  gateway のランタイムステータス（`hermes status`）で `needs_attention: true` と
  `retrying_since` のタイムスタンプを得て、WARNING ログも出ます。再試行はそのまま
  変わらず続きます — これはサーキットブレーカーではなく信号です。このフラグは
  再接続に成功するとクリアされます。

```yaml
agent:
  reconnect_attention_after: 7200   # seconds; 0 disables the escalation flag
```

## Gateway のエージェントキャッシュ {#gateway-agent-cache}

gateway はセッションごとに1つのエージェントを保持するので、会話はターンごとに
システムプロンプトを再構築するのではなく、キャッシュされたプロンプトの prefix を
再利用します。そのキャッシュされたエージェントは、セッションの完全な transcript
も保持しています — ツールの出力も含まれるので、100回のツール呼び出しがある
セッションでは数十メガバイトになります。多忙なマルチプラットフォームの gateway
では、このキャッシュがプロセス内で単一最大のメモリ消費者になります。

```yaml
agent:
  agent_cache:
    max_size: 128            # LRU entry cap
    idle_ttl_secs: 3600      # evict an agent idle this long
    memory_high_mb: auto     # anon-RSS budget; number, "auto", or 0/off
    max_evictions_per_pass: 16
    protect_recent: 8
```

`max_size` と `idle_ttl_secs` は、キャッシュを件数と時間で制限します。どちらも
自分が何バイト保持しているかを知らないので、`memory_high_mb` が3つ目の制限を
加えます。匿名メモリがその予算を超えると、最も使われていない transcript から
捨てられ、次のターンで保存済みのセッションから再読み込みされます。gateway が他の
サービスとメモリを奪い合っている場合は下げてください。すべての prefix を温かい
ままにしておきたい場合は上げて（あるいは `0` にしてこのパスをオフにして）ください。

`auto` は、gateway が実際に動いているメモリの上限（コンテナや systemd unit の
cgroup の上限、それがなければ総 RAM）からその予算を導きます。そのため、
unit の `MemoryMax`/`MemoryHigh` は、同期させておくべき2つ目の数値なしに
尊重されます。そうした上限の下では、計測も同じ範囲で行われます。cgroup 自身の
匿名分の使用量（`memory.stat` の `anon`）で、これには `execute_code` のカーネルや
ターミナルコマンドのような、unit の上限に対して数えられる子プロセスも含まれます。
上限がない場合は、gateway 自身の匿名 RSS が計測されます。

処理中のセッション、`protect_recent` 個の最近使われたセッション、そして
transcript のディスクへの書き込みがまだ完了していないセッションは、決して
捨てられません。退避は、計測された RSS と落とされたセッションと共に WARNING
としてログに出ます。

```
Agent cache pressure: anon RSS 6802MB over budget 6656MB — evicting 5 LRU session(s): ...
```

## コンテキストエンジン {#context-engine}

コンテキストエンジンは、モデルのトークン上限に近づいたときに会話がどう管理されるかを
制御します。組み込みの `compressor` エンジンは非可逆な要約を使います
（[Context Compression](/hermes/docs/developer-guide/context-compression-and-caching/)
を参照）。プラグインのエンジンは、これを別の戦略に置き換えられます。

```yaml
context:
  engine: "compressor"    # default — built-in lossy summarization
```

プラグインのエンジン（例えば非可逆でないコンテキスト管理のための LCM）を使うには:

```yaml
context:
  engine: "lcm"          # must match the plugin's name
```

プラグインのエンジンは**決して自動的には有効化されません** — `context.engine` に
プラグインの名前を明示的に設定する必要があります。利用可能なエンジンは
`hermes plugins` → Provider Plugins → Context Engine で閲覧・選択できます。

メモリのプラグイン向けの同様の単一選択の仕組みについては
[Memory Providers](/hermes/docs/user-guide/features/memory-providers/) を
参照してください。

## イテレーション予算 {#iteration-budget}

エージェントが多数のツール呼び出しを伴う複雑なタスクに取り組んでいるとき、
イテレーションの予算（既定: 500ターン）を使い切ってしまうことがあります。Hermes
は作業途中の予算圧力の警告を注入し**ません** — 以前のビルドは予算の70%／90%で
モデルに警告していましたが、これはモデルに複雑なタスクを早々に投げ出させる
原因になり、2026年4月に取り除かれました。

代わりに、実際に予算が尽きたとき（500/500）、Hermes はモデルに切り上げを求める
メッセージを1つ注入し、最終的な返信を出せるよう1回だけの**猶予呼び出し**を
許可します。その猶予呼び出しでもテキストを生成できなかった場合、エージェントは
達成したことを要約するよう求められます。

```yaml
agent:
  max_turns: none              # Iterations per conversation turn (default: none = unlimited)
                               # Set a positive integer to cap; "none"/"null"/
                               # "unlimited"/"inf"/"infinity"/"infinite"/0/-1 = no limit
  budget_warning_ratio: null   # Optional one-time checkpoint warning, e.g. 0.75
  api_max_retries: 3           # Retries per provider before fallback engages (default: 3)
  auto_recovery_cycles: 5      # Wait-and-retry cycles after retries + fallback are spent on an outage (0 = off)
```

`agent.max_turns` は**既定で無制限**です — ターン数の上限は、解決した以上の問題
（作業途中での黙った打ち切り）を起こしていたので、初期状態の Hermes は会話の
ターンを完了まで実行します。上限を課すには正の整数を設定してください。「無制限」を
明示するには、大文字小文字を区別しない次のいずれかの書き方が使えます:
`"none"`、`"null"`、`"unlimited"`、`"infinite"`、`"infinity"`、`"inf"`、`0`、`-1`
（これらは `sys.maxsize` の番兵に解決されるので、ループがターン数だけで終了する
ことはありません）。

`agent.budget_warning_ratio` は、通常の会話と委任された会話の両方で既定では
オフです。有限の `max_turns` と共に `0` と `1` の間の値に厳密に設定すると、
Hermes はその閾値に達した後、最新のツール結果に1つのモデルに見える形の
チェックポイント通知を追加します。この通知は会話のターンごとに再武装し、
それぞれのエージェント自身のイテレーション予算を使います。これは現在のツール結果の
テールにだけ追加され、より古いターンには追加せず、合成的なユーザー／システム
メッセージを追加したり、既存の枯渇時の猶予呼び出しを変えたりすることもありません。
Dispatcher が所有する Kanban のワーカーは、既定で90%のところで完了確認の
チェックポイントを受け取ります（明示的な比率でこの閾値を変えられます）。その間も
それらのツールは使えます。このチェックポイントは、検証済みの完了か、確かな
進行状況のコメントを求めますが、早すぎる成功を求めるものではありません。

`agent.api_max_retries` は、Hermes がフォールバックプロバイダへの切り替えが
発動する**前に**、一時的なエラー（レート制限、接続の切断、5xx）でプロバイダの
API 呼び出しを何回再試行するかを制御します。既定は `3` — 合計4回の試行です。
[フォールバックプロバイダ](/hermes/docs/user-guide/features/fallback-providers/)
を設定していて、もっと速くフェイルオーバーしたい場合は、これを `0` に下げてください。
そうすればプライマリでの最初の一時的なエラーが、不安定なエンドポイントに対して
再試行を繰り返す代わりに、すぐにフォールバックへ引き渡されます。

`agent.auto_recovery_cycles` は、再試行とフォールバックチェーンの両方を使い切った
*後*の安全網です。失敗が一時的な障害（HTTP 5xx、`overloaded`/529 応答、接続または
読み取りのタイムアウト）で、まだ回答のテキストが1つも届いていない場合、Hermes は
「API failed after N retries」でターンを終わらせず、待って再試行します。最大でこの
回数（既定 `5`）まで、ジッターの付いた15/30/60/60/60秒のスケジュールで行われます。
プロバイダの `Retry-After` ヘッダーは、そのスケジュールより優先されます
（最大120秒まで尊重されます）。待っている間、どの面でも同じ行が表示されます —
CLI/TUI/Desktop では `⏳ Provider temporarily unavailable — retrying automatically
in 30s (cycle 2/5); press Esc to stop`、メッセージングプラットフォームでは
ステータスバブル（`send /stop to cancel`）、API サーバーでは `hermes.status` の
SSE イベント、cron ジョブではログの行です。Esc（または `/stop`）を押すと待機は
即座にキャンセルされます。フォールバックはそれでも最初に来ます。フォールバック
チェーンが設定されている場合、枯渇すると以前と同様に次のプロバイダへ移り、
このはしごはチェーンに何も残っていない場合にだけ発動します。認証、課金、
リクエストフォーマット、権限、コンテンツポリシーのエラーは、このはしごに
決して入りません。無効にするには `0` を設定してください。

## 経過時間による実行予算 {#wall-clock-run-budget}

イテレーション予算とは別に、各会話の実行に任意の**経過時間**の予算を与えられます。
これは、厳しい外部の上限（例えばタスクごとの900秒の制限）の下で動く、ワンショットと
評価ハーネスの呼び出しのために設計されています。これがないと、実質的には作業が
終わっている状態で実行がタイムアウトすることがあります — 最終的な回答を出す
一歩手前だったり、1回のハングしたプロバイダ呼び出しで詰まっていたりする場合です。

```yaml
agent:
  run_budget_seconds: null     # Optional; unset/null = feature fully off (default)
```

または CLI で呼び出しごとに:

```bash
hermes chat --run-budget 850 -q "..."
```

予算が設定されている場合、2つのことが起こります。

1. **80%で切り上げの通知。** 予算の80%が経過すると、Hermes は**1回だけの**通知
   （`/steer` のメッセージのように最新のツール結果に追加され、キャッシュ安全な形で
   届けられます）を注入し、新しい発見／検証の作業を止め、すでに持っている状態から
   最終的な成果物を作るようモデルに伝えます。これは実行ごとに最大1回だけ発火し、
   既存のイテレーション予算の切り上げの仕組みを反映しています — 繰り返しの
   圧力警告はありません。
2. **期限に応じてスケールする stale タイムアウト。** 暗黙のノンストリーミングの
   stale タイムアウト（既定の90秒と、推論モデルの下限。例えば DeepSeek の推論
   モデルでは600秒）は `max(60, remaining_budget × 0.5)` で上限が決まるので、
   1回の黙ってハングしたプロバイダ呼び出しが実行の残りをすべて消費することは
   決してありません。この上限はタイムアウトを*締める*方向にだけ働きます —
   決して緩めることはなく、明示的に設定された `stale_timeout_seconds`
   （プロバイダ／モデルの設定、または `HERMES_API_CALL_STALE_TIMEOUT`）は
   手を付けられずに常に優先されます。

この予算は `run_conversation` のターンごとです（ユーザーのメッセージごとに
リセットされます）。未設定のときはこの機能は完全に休止したままです — クロックの
読み取りも、注入も、タイムアウトの変更もありません。

## 停止時の検証（コーディングの検証） {#verify-on-stop-coding-verification}

有効にすると、エージェントがワークスペース内でコードを編集したのに、新しい検証の
証拠（成功したテスト実行、ビルド、lint など）を何も出さなかったターンでは、
Hermes は最終的な回答を受け入れません — 検証するか、できない理由を説明するよう
求める合成的なフォローアップを注入します。ドキュメント／markdown／スキルのみの
編集はこれを発火させず、このループには上限があるのでエージェントを決して閉じ込め
ません。

```yaml
agent:
  verify_on_stop: false        # true | false | "auto" (surface-aware: on for CLI/TUI/desktop, off for messaging)
  verify_guidance: true        # Append creative-UI / clean-diff guidance to the missing-evidence nudge
  max_verify_nudges: 3         # Cap on consecutive continue nudges per turn (built-in + pre_verify hooks)
  coding_instructions: ""      # Standing project-wide coding rules appended to the coding brief
```

`verify_on_stop` は、`true`（どこでも有効）、`false`（無効 — 既定）、`"auto"`
（従来の面を意識した挙動: CLI・TUI・デスクトップのような対話的なコーディングの面と
プログラムからの呼び出し元では有効、検証の説明がチャットの雑音として読める
Telegram/Discord のようなメッセージングの面では無効）を受け付けます。既定では
どこでも無効です — 新規インストールは `false` の状態で出荷され、設定の移行は
既存のインストールでもこれを無効にしたので、有効化は明示的なオプトインです。
`HERMES_VERIFY_ON_STOP` 環境変数は、設定されていれば設定ファイルの値を上書きします。

このガードに供される証拠（どのテスト／lint／ビルドのコマンドが実行されたか、
どのファイルがそれ以降に編集されたか）は `~/.hermes/verification_evidence.db`
にあります。この台帳は、このガードが有効な間だけ書き込まれ、または作成され、
`verify_on_stop: false` の場合は何も記録されず、既存のファイルは自由に削除できます。

同じ地点でのユーザー／プラグインのポリシーゲート — 自分自身のチェックでエージェントを
続けさせる — については [`pre_verify` hook](/hermes/docs/user-guide/features/hooks/#pre_verify)
を参照してください。

## 常設ゴール（`/goal`） {#standing-goals-goal}

常設ゴールが有効なとき、Hermes は各アシスタントの応答がそれを満たしているかどうかを
判定します。満たしていない場合、続行を求めるプロンプトを同じセッションに返し、
ゴールが完了するか、ターンの予算が尽きるか、ユーザーがそれを一時停止／クリアする
まで作業を続けます。ターンの予算が実質的な最後の砦です — 判定の失敗は**開いた
方向**へ失敗します（続行します）。そのため、不安定な判定器が進行を詰まらせることは
決してありません。

```yaml
goals:
  max_turns: 20   # Max continuation turns before Hermes auto-pauses the goal (default: 20)
```

`max_turns` は、Hermes がゴールを自動的に一時停止しユーザーに `/goal resume` を
求める前に、ゴールが駆動できる続行ターンの数を制限します。これは、判定器の
偽陰性（ゴールは実際には完了しているのに判定器が続行と言う）と、あいまいな、
または達成不可能なゴールへの無制限なモデルの消費に対する防御です。全機能については
[Goals](/hermes/docs/user-guide/features/goals/) を参照してください。

### API タイムアウト {#api-timeouts}

Hermes には、ストリーミング用の別々のタイムアウトの層に加えて、ノンストリーミング
呼び出し用の stale 検出器があります。stale 検出器は、暗黙の既定値のままにしている
場合にだけローカルのプロバイダ向けに自動調整されます。

| タイムアウト | 既定値 | ローカルのプロバイダ | 設定／環境変数 |
|---------|---------|----------------|--------------|
| ソケット読み取りタイムアウト | 120秒 | 1800秒に自動で上げる | `HERMES_STREAM_READ_TIMEOUT` |
| stale ストリーム検出 | 180秒 | 900秒の上限まで上げる（`agent.local_stream_stale_timeout`） | `HERMES_STREAM_STALE_TIMEOUT` |
| stale ノンストリーム検出 | 90秒 | 暗黙のままなら自動で無効化される | `providers.<id>.stale_timeout_seconds` または `HERMES_API_CALL_STALE_TIMEOUT` |
| Responses の最初のイベントのウォッチドッグ | 120秒 | 900秒の上限まで上げる（`agent.local_stream_stale_timeout`） | `HERMES_CODEX_TTFB_TIMEOUT_SECONDS` |
| API 呼び出し（ノンストリーミング） | 1800秒 | 変更なし | `providers.<id>.request_timeout_seconds` / `timeout_seconds` または `HERMES_API_TIMEOUT` |
| 終端後のストリームの排出（Codex/Responses） | 2秒 | 変更なし | `agent.stream_drain_timeout` |

**ソケット読み取りタイムアウト**は、プロバイダから次のデータのかたまりを待つ時間を
httpx がどれだけ待つかを制御します。ローカルの LLM は、大きなコンテキストで最初の
トークンを生成する前の prefill に数分かかることがあるので、Hermes はローカルの
エンドポイントを検知するとこれを30分に上げます。`HERMES_STREAM_READ_TIMEOUT` を
明示的に設定した場合、エンドポイントの検知に関わらずその値が常に使われます。

**stale ストリーム検出**は、SSE の keep-alive の ping を受け取るが実際のコンテンツが
届かない接続を kill します。ローカルのプロバイダ（prefill 中に keep-alive の ping
を送らない）では、既定は180秒のベースの代わりに、有限の900秒の上限に上げられます
— `agent.local_stream_stale_timeout` または `HERMES_LOCAL_STREAM_STALE_TIMEOUT`
環境変数で設定できます。

**Responses の最初のイベントのウォッチドッグ**（Codex / `codex_responses` の
トランスポート。Responses トランスポートで宣言されたカスタムのプロバイダを含む）は、
接続を受け付けたのに120秒以内にストリームのイベントを何も出さないリクエストを
中断して再接続します。大きなコンテキストを prefill しているローカルサーバーは
正当にそれより長く無音のままになることがあるので、ローカルのエンドポイントでは
暗黙の既定値は stale ストリーム検出器と同じ上限（`agent.local_stream_stale_timeout`
/ `HERMES_LOCAL_STREAM_STALE_TIMEOUT`、900秒）に上げられます。明示的な
`HERMES_CODEX_TTFB_TIMEOUT_SECONDS` は常にそのまま使われます（`0` はウォッチドッグを
無効にします）。

**stale ノンストリーム検出**は、長すぎる間何も応答を出さないノンストリーミングの
呼び出しを kill します。既定では、Hermes は長い prefill の間の偽陽性を避けるために
ローカルのエンドポイントでこれを無効にします。`providers.<id>.stale_timeout_seconds`、
`providers.<id>.models.<model>.stale_timeout_seconds`、または
`HERMES_API_CALL_STALE_TIMEOUT` を明示的に設定した場合、その明示的な値は
ローカルのエンドポイントでも尊重されます。

**終端後のストリームの排出**は、Codex/Responses のストリームが終端の
`response.completed` フレームの後、どれだけ長く読み込みを続けるかを制限します
（リレーの finalizer が動けるようにするための礼儀です）。一部のリレーは終端の
フレームの後も SSE のソケットを決して閉じません。制限がなければ、ターンは
stale ストリームのウォッチドッグが発火して、すでに課金済みの応答を捨て、
それから再試行するまで詰まってしまいます。`agent.stream_drain_timeout` 秒の後、
ストリームは閉じられ、完了した応答が返されます。正常に接続を閉じるエンドポイントは
排出をすぐに終えるので、この長さを待つことは決してありません。排出を完全に
スキップするには `0` を設定してください。

この予算はすべてのノンストリーミング呼び出しを制限します。リクエストを受け付けた
後に無音になるプロバイダ — 接続は開いたまま、バイトもエラーも来ない — は、
stale タイムアウトで中断されて再試行されます。ずっと長いソケット読み取り
タイムアウトまで（あるいは、無人の cron 実行の場合、何か外部のものがプロセスを
kill するまで）ハングし続けるのではありません。

定期的なプロバイダ待機の通知は、少なくとも**60秒の無音**の後にだけ表示されます。
Codex Responses の**待機ステータス**は、無音であることを表すもので、総生成時間を
表すものではありません。アクティブなストリームのイベント（推論を含む）はそれを
静かにし続けます。イベントが止まると、応答が何も来ていないと主張するのではなく、
ストリームイベントなしで経過した時間を報告します。イベントが再開すると、この通知は
消えます。再接続が新しい最初のイベントのウォッチドッグのフェーズを開始すると、
待機ステータスはそのフェーズに従います。この表示の挙動は、別建ての経過時間ベースの
stale コール予算を延長したり、ウォッチドッグのタイムアウトを変えたりすることは
ありません。このステータスは無音ごとに1回（60秒後に）、待機のフェーズ
（`waiting for the first provider event` か `provider stream active; Ns without
stream events`）と、発火するまでの残り秒数と共に再接続するウォッチドッグ
（`TTFB`、`stream idle`、または `wall-clock stale`）を名指しした中立的な言い回しで
表示され、フェーズが変わったときかその期限が近いときにだけ書き直され、30秒ごとの
生存確認のハートビートごとに書き直されることはありません。チャット補完のストリームも
同じルールに従います（`waiting for the first stream chunk` / `stream open; Ns
without stream output`、`stream stale` ウォッチドッグ）。同様に、チャンクが再開すると
その無音の通知を速やかに消し、ローカルモデルの読み込みステータスを上書きすることは
ありません。

cron ジョブと委任されたサブエージェントもストリーミングします。それらは自分の
スレッド上でリクエストをインラインで実行します（他のセッションが使う interrupt
worker は gateway のネストされたスレッドプールの中で詰まります）が、通信上の
リクエストはそれでも `stream: true` なので、上記の**stale ストリーム検出**の
予算がそれらを支配します — すべてのトークンが生存確認として数えられるので、
何分も考える推論モデルがハングしたプロバイダと誤認されることはなく、無音の
接続を kill するエッジプロキシもバイトを見続けます。

### API ストリーミングの無効化 {#disabling-api-streaming}

`model.streaming: false` は、親とサブエージェントの両方について、セッション全体で
ノンストリーミングのリクエストを強制します。これは、*ストリーミング*のツール呼び出しの
経路が壊れているセルフホストの OpenAI 互換サーバー向けの逃げ道です（例えば
`--tool-call-parser qwen3_xml` と推論パーサーを組み合わせた vLLM は、ツール
呼び出しのマークアップを平文に漏らして `tool_calls` を0件返すことがあり、委任された
タスクが黙って no-op になります）。既定は `true` です。上記の生存確認の特性を
非ストリーミングの呼び出しは失うので、その種のバグに遭遇しない限りそのままにして
ください。これは `display.streaming` とは別物です。それはターミナル
でのトークンのレンダリングだけを制御します。

Hermes は、ストリーミングが進行できないときは自身でセッションをノンストリーミングに
切り替えることもあります。プロバイダがストリーミングをサポートしていないと報告する
場合、または OpenAI 互換の gateway がストリーミングのリクエストに、内容のない
SSE フレーム（ペイロードのない裸の `data:` / `event: ping` の keepalive。劣化した
リレーにありがちです）で答える場合です。そのターンはストリーミングなしで再試行され、
警告が表示され、そのセッションの残りの間はストリーミングが無効のままになります。

```yaml
model:
  streaming: false
```

## コンテキスト圧力の警告 {#context-pressure-warnings}

イテレーション予算の圧力とは別に、コンテキストの圧力は、会話が**圧縮の閾値**
— 古いメッセージを要約するためにコンテキストの圧縮が発火する地点 — にどれだけ
近いかを追跡します。これは、会話が長くなってきていることを、あなたとエージェントの
両方が理解するのに役立ちます。

| 進行度 | レベル | 起こること |
|----------|-------|-------------|
| 閾値まで **60%以上** | Info | CLI はシアンの進捗バーを表示し、gateway は情報通知を送ります |
| 閾値まで **85%以上** | Warning | CLI は太字の黄色いバーを表示し、gateway は圧縮が間近だと警告します |

CLI では、コンテキストの圧力はツール出力のフィード内に進捗バーとして表示されます。

```
  ◐ context ████████████░░░░░░░░ 62% to compaction  48k threshold (50%) · approaching compaction
```

メッセージングプラットフォームでは、プレーンテキストの通知が送られます。

```
◐ Context: ████████████░░░░░░░░ 62% to compaction (threshold: 50% of window).
```

自動圧縮が無効になっている場合、この警告は代わりにコンテキストが切り詰められる
可能性があることを伝えます。

コンテキストの圧力は自動です — 設定は不要です。これは純粋にユーザー向けの通知として
発火するだけで、メッセージのストリームを変更したり、モデルのコンテキストに何かを
注入したりすることはありません。

## 資格情報プールの戦略 {#credential-pool-strategies}

同じプロバイダに対して複数の API キーや OAuth トークンを持っている場合、
ローテーションの戦略を設定できます。

```yaml
credential_pool_strategies:
  openrouter: round_robin    # cycle through keys evenly
  anthropic: least_used      # always pick the least-used key
```

選択肢: `fill_first`（既定）、`round_robin`、`least_used`、`random`。全文書は
[Credential Pools](/hermes/docs/user-guide/features/credential-pools/) を
参照してください。

## プロンプトキャッシュ {#prompt-caching}

アクティブなプロバイダがサポートしている場合、Hermes はセッションをまたいだ
プロンプトキャッシュを自動的に有効にします — ユーザーの設定は不要です。

**ネイティブ Anthropic**、**OpenRouter**、**Nous Portal** 上の Claude では、
Hermes は1時間の TTL（`ttl: "1h"`）を持つ `cache_control` のブレークポイントを
システムプロンプトとスキルのブロックに付けます。新しい1時間の中で最初に送信すると
フルの入力レートが課金され、同じ1時間内の以降のあらゆるセッションをまたいだ送信は
割引されたキャッシュ読み取りのレートでキャッシュから引かれます。つまり、
システムプロンプト、読み込まれたスキルのコンテンツ、長いコンテキストの include の
早い部分は、最初の1時間の間、`hermes` のセッションをまたいで、そしてフォークされた
サブエージェントをまたいで再利用されます。

Qwen Cloud（Alibaba DashScope）の upstream はキャッシュの TTL を5分に制限するので、
Hermes はそこでは代わりに5分のブレークポイント TTL を使います。他の第三者経由の
Claude の経路（AWS Bedrock、Azure Foundry）は、プロバイダ自身のキャッシュの既定値に
フォールバックします。xAI Grok は別のセッションに固定された conversation-id の
仕組みを使います — [xAI prompt caching](/hermes/docs/integrations/providers/#xai-grok--responses-api--prompt-caching)
を参照してください。

これを無効にするつまみはありません — キャッシュは常に有効で、単発のターンの会話でも
お金を節約します。システムプロンプトだけでも入力トークン数の意味のある割合を
占めるからです。

明示的なつまみが1つあります。それは、Anthropic 形式のブレークポイントで Hermes が
リクエストするキャッシュ TTL のティアです。

```yaml
prompt_caching:
  cache_ttl: "5m"   # "5m", "1h" (Anthropic-supported tiers) or "auto"; other values are ignored
```

`cache_ttl` は、ネイティブ Anthropic API、OpenRouter、Nous Portal 経由の Claude に
Hermes が付けるブレークポイントの TTL を選びます。2つの Anthropic のティア
（`"5m"`、`"1h"`）はそのまま送られます。それ以外の値は無視されます。独自の上限を持つ
プロバイダ（例えば最大5分の Qwen Cloud）は、それでも upstream が許すものに
クランプされます。

1時間のティアは基本入力価格の2倍で書き込まれます（5分のティアは1.25倍）。これが
割に合うのは、あなたのターンが5分以上離れているときだけです — そうでなければ、
誰も使わない保持のために、あらゆるツール結果がより高いレートで書き込まれてしまいます。
`"auto"` は、誰がそのペースを決めているかに応じて、セッションごとにティアを選びます。
人がタイプするセッション（CLI、TUI、Desktop、Telegram/Discord/Slack と他の
メッセージングプラットフォーム）には `1h`、機械のペースのセッション（サブエージェント、
cron、`hermes -q` のワンショット、webhook、Kanban のワーカー、API サーバー、
ツールから呼び出されるものやバッチ実行）には `5m` です。対話的なセッションが
一日を通して park と resume を繰り返すインストールでは、`auto` は fan-out する
サブエージェントの支出には手を付けずに、対話的なキャッシュ書き込みの費用を
およそ40%削減しました。委任されたサブエージェントは、設定に関わらず常に `5m`
にクランプされます。

## 補助モデル {#auxiliary-models}

Hermes は、画像分析、ブラウザのスクリーンショット分析、セッションのタイトル生成、
コンテキストの圧縮のような副次的なタスクに「補助」モデルを使います。既定
（`auxiliary.*.provider: "auto"`）では、Hermes はすべての補助タスクをあなたの
**メインのチャットモデル**（`hermes model` で選んだのと同じプロバイダ／モデル）に
ルーティングします。始めるために何も設定する必要はありませんが、高価な推論モデル
（Opus、MiniMax M2.7 など）では補助タスクが意味のあるコストを追加することに注意して
ください。メインのモデルに関わらず安くて速い副次タスクが欲しい場合は、
`auxiliary.<task>.provider` と `auxiliary.<task>.model` を明示的に設定してください
（例えば vision に OpenRouter 上の Gemini Flash）。（web の抜き出しは補助タスクでは
ありません。`web_extract` とブラウザのスナップショットは、長いコンテンツを決定的に
切り詰め、`read_file` によるページングのために全文を保存します — LLM は関わりません。）

:::note なぜ「auto」がメインのモデルを使うのか
以前のビルドは、アグリゲーターのユーザー（OpenRouter、Nous Portal）を、安価な
プロバイダ側の既定値に振り分けていました。これは意外なものでした — アグリゲーターの
サブスクリプションにお金を払っているユーザーが、自分の補助トラフィックを処理する
別のモデルを目にすることになったからです。`auto` は今ではすべてのユーザーに
メインのモデルを使い、`config.yaml` でのタスクごとの上書きはそれでも優先されます
（下の[補助設定の全項目一覧](#full-auxiliary-config-reference)を参照してください）。
:::

### 対話的に補助モデルを設定する {#configuring-auxiliary-models-interactively}

YAML を手で編集する代わりに、`hermes model` を実行し、メニューから
**「Configure auxiliary models」**を選んでください。タスクごとの対話的な
ピッカーが得られます。

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

タスクを選び、プロバイダを選び（OAuth のフローはブラウザを開き、API キーの
プロバイダは入力を求めます）、モデルを選びます。この変更は `config.yaml` の
`auxiliary.<task>.*` に永続化されます。メインモデルのピッカーと同じ仕組みで、
覚えるべき特別な文法はありません。

**Delegation** の項目は特別です。これは `delegate_task` のサブエージェントが使う
モデルをルーティングし、`auxiliary.*` ではなくトップレベルの `delegation.*`
セクション（`delegation.provider` / `delegation.model`）に永続化されます。
サブエージェントは副次的な LLM 呼び出しではなく、完全な子エージェントだからです。
ここでの `auto` は「親エージェントのプロバイダ・モデル・資格情報を継承する」ことを
意味します。

最初のやり取りの後に Hermes がタイトルを自動生成しないようにしたい場合は、
`auxiliary.title_generation.enabled: false` を設定してください。手動でのタイトル付けは
`/title` と `hermes sessions rename` でそれでも動きます。

即時に導かれるタイトル（最初のメッセージの最初の行）は保ちたいが、それを
アップグレードするためにモデルの呼び出しを使いたくない場合は、
`auxiliary.title_generation.model_upgrade_enabled: false` を設定してください。
バックグラウンドの `auto-title` スレッドは起動せず、自動的なタイトルモデルへの
リクエストも送られません。明示的な修復コマンド `hermes sessions retitle-skills`
は、それでもモデルを呼び出します。`enabled: false` は、両方の段階を無効にします。

`custom` のメインプロバイダ（llama.cpp、Ollama、vLLM、LM Studio、その他のセルフ
ホストの OpenAI 互換サーバー）では、`auxiliary.title_generation` が別のプロバイダや
`base_url` に固定されていない限り、タイトルモデルの呼び出しは、ターンの返信と
同時ではなく、それが届いた**後に**送られます。応答をデコード中に `json_schema`
のタイトルリクエストを受け取るシングルスロットのローカルサーバーは、そうしないと
その返信を `{"title": ...}` で答えてしまうことがあり、それがアシスタントのターンと
して保存され、再生されてしまいます。

Hermes Desktop では、3,000文字を超えるプレーンテキストの貼り付けは生成された
`.txt` の添付ファイルになります。その貼り付けの最初のおよそ1,000文字は、タイトル
専用のヒントとしてタイトルの段階に渡されます（エージェントのターンはそれでも
添付ファイルの参照しか見ません）。そのため「これを要約して」と大きな貼り付けの
組み合わせは、貼り付けられた話題にちなんで名付けられます。あなた自身が添付する
ファイルは、タイトル付けのために読まれることはありません。

### ストリーム専用のエンドポイント {#stream-only-endpoints}

一部の OpenAI 互換のエンドポイントは、ノンストリーミングのチャットリクエストを
そのまま拒否します（例えば Tencent Copilot は HTTP 400
`"Non-stream chat request is currently not supported"` を返します）。対話的な
チャットはすでにストリーミングしていますが、補助タスク（タイトル生成、圧縮、
vision）はノンストリーミングの呼び出しを使い、そのままではすべての試行で失敗します。
Hermes は常に `copilot.tencent.com` をストリーム専用として扱います。他にそういう
エンドポイントがある場合は、`auxiliary.stream_only_base_urls` の下に URL の
部分文字列を列挙してください。

```yaml
auxiliary:
  stream_only_base_urls:
    - "my-stream-only-proxy.example.com"
```

一致した補助の呼び出しは `stream=True` で送られ、チャンク（ツール呼び出しの
デルタを含む）はクライアント側で集約されます — 他のどのエンドポイントも挙動は
変わりません。

### 動画チュートリアル {#video-tutorial}

[YouTube: https://www.youtube.com/embed/NoF-YajElIM](https://www.youtube.com/embed/NoF-YajElIM)

### 汎用的な設定パターン {#the-universal-config-pattern}

Hermes のあらゆるモデルのスロット — 補助タスク、圧縮、フォールバック — は、
同じ3つのつまみを使います。

| キー | 何をするか | 既定値 |
|-----|-------------|---------|
| `provider` | 認証とルーティングにどのプロバイダを使うか | `"auto"` |
| `model` | どのモデルにリクエストするか | プロバイダの既定値 |
| `base_url` | カスタムの OpenAI 互換エンドポイント（プロバイダを上書きする） | 未設定 |

補助タスクのブロックには、さらに `reasoning_effort` というつまみもあります。

| キー | 何をするか | 既定値 |
|-----|-------------|---------|
| `reasoning_effort` | そのタスクの LLM 呼び出しの思考レベル: `none`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max`、`ultra` | 未設定（プロバイダの既定値） |

これはグローバルな `agent.reasoning_effort` のタスクごとの対応版です。あなたの
メインのモデルが高価な推論モデルであっても、メインのチャットの挙動には触れずに、
圧縮を `low` で動かしたり vision を `none` で動かしたりして、副次タスクのレイテンシと
コストを削れます。これは `vision`、`compression`、`title_generation`、`curator`
のような補助クライアントのタスクに適用され、3種類の補助の通信形式（chat completions、
Codex Responses、Anthropic Messages）すべてに及びます。同じタスクに明示的な
`extra_body.reasoning` があれば、この省略形より優先されます。自分の呼び出しの
思考をオフにする呼び出し元（タイトル生成はそうします — 64トークンのタイトルには
推論の余地がありません）は、両方より優先されます。タスクレベルの effort は、
プロバイダの思考オフのフィールドと一緒に送られるのではなく、そのリクエストでは
削除されます。

エンドポイントが推論のフィールドをそのまま拒否する場合（OpenAI 互換のリレーの
後ろにあるチャット専用のモデルが `400 Unrecognized request argument supplied:
reasoning_effort` と答える、あるいは逆の言い方で `400 reasoning_effort 'none'
unsupported; use minimal|low|medium|high|xhigh` と答える場合）、補助の呼び出しは
すべての推論フィールドを省いて1回だけ再試行されるので、そのタスク（例えば
セッションのタイトル）はエンドポイントの既定の挙動でそれでも完了します。メインの
会話も同じ回復処理を適用します。あるルートが、思考のみで途中で切れた続きのために
Hermes が送る推論オフのリクエストを拒否すると、その無効化はそのセッションの残りで
取り除かれ、リクエストはそのルートの既定値で再試行されます。

**バックグラウンドレビューは異なります。** 同じモデルでのレビューのフォークは常に
親の推論 effort を継承します。`auxiliary.background_review.reasoning_effort` は
そのパスでは無視されます。親のプロバイダ／モデルが明示的に選ばれている場合も
同様です。これは、バイト単位で同一の推論設定、システムプロンプト、完全な会話の
スナップショット、ツールの定義を、プロンプトキャッシュの一致のために保ちます。
同じモデルでのレビューには独立した effort の切り替えはありません。
[background review reasoning](/hermes/docs/user-guide/features/memory/#same-model-review-reasoning)
を参照してください。レビューが別のプロバイダ／モデルにルーティングされる場合、
`reasoning_effort` はそのルーティングされたフォークに適用されます（未設定 =
ルーティングされたプロバイダの既定値）。このキーが設定されているのにレビューが
メインのモデルで動く場合、Hermes は1回だけ警告を出します。

**MoA も異なる設定を使います。** Mixture-of-Agents の推論の深さは、
`moa_reference`/`moa_aggregator` の補助ブロックではなく、MoA のプリセット内で
**スロットごとに**設定されます（`moa.presets.<name>.reference_models[].reasoning_effort`
/ `aggregator.reasoning_effort`）— [Mixture of Agents](/hermes/docs/user-guide/features/mixture-of-agents/)
を参照してください。

```yaml
auxiliary:
  compression:
    reasoning_effort: "low"    # summaries don't need deep thinking
  vision:
    reasoning_effort: "none"   # disable thinking for image description
```

`base_url` が設定されている場合、Hermes はプロバイダを無視してそのエンドポイントを
直接呼び出します（認証には `api_key` または `OPENAI_API_KEY` を使います）。
`provider` だけが設定されている場合、Hermes はそのプロバイダの組み込みの認証と
base URL を使います。

補助タスクで使えるプロバイダ: `auto`、`main`、それに加えて
[provider registry](/hermes/docs/reference/environment-variables/) にある任意の
プロバイダ — `openrouter`、`nous`、`openai-codex`、`copilot`、`copilot-acp`、
`anthropic`、`gemini`、`qwen-oauth`、`zai`、`kimi-coding`、`kimi-coding-cn`、
`minimax`、`minimax-cn`、`minimax-oauth`、`deepseek`、`nvidia`、`xai`、
`xai-oauth`、`ollama-cloud`、`alibaba`、`bedrock`、`huggingface`、`arcee`、
`xiaomi`、`kilocode`、`opencode-zen`、`opencode-go`、`commandcode`、
`commandcode-anthropic`、`ai-gateway`、`azure-foundry` — または、あなたの
`providers:` の dict にある任意の名前付きカスタムプロバイダ（例えば
`provider: "beans"`）。

ローカルの OpenAI 互換サーバーも、それぞれ自身の名前で動作します。
`provider: ollama`（`vllm`、`llamacpp`、`llama.cpp` も同様）と、
`http://127.0.0.1:11434` のような `base_url`、空の `api_key` の組み合わせは、
プレースホルダーのキーでカスタムエンドポイント経由にルーティングされ、
裸の `host:port` の base_url には自動で `/v1` サフィックスが付きます。

`provider: openai` は直接 API のエイリアスです。ブロックの `base_url`、
なければ `OPENAI_BASE_URL`、それもなければ `https://api.openai.com/v1` の
カスタムエンドポイントを経由してルーティングし、`api_key` または
`OPENAI_API_KEY` で認証します。すべての補助タスクはこれを同じ方法で解決します
— `compression`/`vision`/`title_generation` に加えて `background_review`、
`curator`、MoA のスロットも同様です。そのため `provider: openai` を保ったまま
`base_url` を取り除くと、そのタスクは公開の OpenAI エンドポイントに移動します。
あなたの `providers:` の dict にある `providers.openai` のエントリはそれより
優先され、自身のエンドポイントとキーを保ちます。

ルーティングされた `auxiliary.<task>` のブロックが解決できない場合（未知の
プロバイダ、欠けているエンドポイントや資格情報）、そのタスクはメインのモデルで
動作し、Hermes はそれを伝えます。`background_review` は、プロバイダと理由を
名指しした1回きりのユーザーに見える警告を出します（加えてレビューごとに
`agent.log` に `WARNING` の行）。`hermes doctor` は、ルーティングされた
すべての `auxiliary.<task>` のブロックを同じリゾルバーで解決し、失敗するものを
報告します。

:::tip MiniMax OAuth
`minimax-oauth` はブラウザの OAuth でログインします（API キーは不要です）。
`hermes model` を実行し、**MiniMax (OAuth)** を選んで認証してください。補助タスクは
自動的に `MiniMax-M2.7-highspeed` を使います。[MiniMax OAuth guide](/hermes/docs/guides/minimax-oauth/)
を参照してください。
:::

:::tip xAI Grok OAuth
`xai-oauth` は SuperGrok と X Premium+ の購読者向けにブラウザの OAuth でログイン
します（API キーは不要です）。`hermes model` を実行し、**xAI Grok OAuth
(SuperGrok / Premium+)** を選んで認証してください。同じ OAuth トークンは、
xAI に直接つながるすべての面（チャット、補助タスク、TTS、画像生成、動画生成、
文字起こし）で再利用されます。[xAI Grok OAuth guide](/hermes/docs/guides/xai-grok-oauth/)
を参照してください。Hermes がリモートホスト上にある場合は
[OAuth over SSH / Remote Hosts](/hermes/docs/guides/oauth-over-ssh/) も参照して
ください。
:::

:::warning `"main"` は補助タスク専用です
`"main"` プロバイダの選択肢は「メインのエージェントが使っているプロバイダを
そのまま使う」ことを意味します — これは `auxiliary:`、`compression:`、そして
プライマリのフォールバックのエントリ（`fallback_providers:` またはレガシーな
`fallback_model:`）の中でだけ有効です。あなたのトップレベルの `model.provider`
の設定に対する有効な値では**ありません**。カスタムの OpenAI 互換エンドポイントを
使う場合は、`model:` セクションで `provider: custom` を設定してください。
メインのモデルのプロバイダの選択肢すべてについては
[AI Providers](/hermes/docs/integrations/providers/) を参照してください。
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
各補助タスクには設定可能な `timeout`（秒単位）があります。既定値: vision 120秒、
approval 30秒、compression 120秒、title generation 30秒、その他すべてのタスクは
30秒です。補助タスクに遅いローカルモデルを使う場合はこれらを増やしてください
— 答えを出す前に思考ブロックを出す推論モデルは、タイトル1つに30秒以上を
日常的に必要とし、期限に達したリクエストは、Hermes がフォールバックチェーンを
試す前に `Auxiliary <task>: request to <base_url> timed out after <N>s (raise
auxiliary.<task>.timeout …)` としてログに出ます。タイトル生成、圧縮、vision は、
1回のタイムアウトのウィンドウを丸ごと使った後、プライマリのルートをあきらめます
（同じプロバイダでの再試行はありません）。そのため遅いモデルが待ち時間を何倍にも
することはありません。vision には HTTP の画像ダウンロードのための別の
`download_timeout`（既定30秒）もあります — 遅い接続やセルフホストの画像サーバーでは
これを増やしてください。
:::

:::info
コンテキストの圧縮には、閾値のための独自の `compression:` ブロックと、
モデル／プロバイダの設定のための `auxiliary.compression:` ブロックがあります
— 上の [Context Compression](#context-compression) を参照してください。
プライマリのフォールバックチェーンは、トップレベルの `fallback_providers:`
リストを使います — [Fallback Providers](/hermes/docs/integrations/providers/#fallback-providers)
を参照してください。3つとも同じ provider/model/base_url のパターンに従います。
:::

### 補助タスクごとのフォールバックチェーン {#per-task-fallback-chain-for-auxiliary-tasks}

各補助タスクは、任意で `fallback_chain` — プライマリの補助プロバイダがレート
制限、接続の問題、支払いの制約で失敗したときに Hermes が試す provider/model の
エントリのリスト — を定義できます。

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

プライマリの補助プロバイダ（`openrouter` / `openai/gpt-4o-mini`）がレート制限、
接続タイムアウト、支払いが必要というエラーを返すと、Hermes は `fallback_chain`
を順に進みます。すでに失敗したプロバイダに一致するエントリはスキップし、
残りの各エントリを、どれかが成功するかチェーンを使い切るまで試します。すべての
フォールバックが失敗した場合、Hermes は最後の安全網としてメインのエージェント
モデルにフォールバックします。

各エントリは、どの補助タスクの設定とも同じ3つのつまみをサポートします。

| キー | 説明 |
|-----|-------------|
| `provider` | プロバイダ名（`nous`、`openrouter`、`anthropic`、`gemini`、`main` など） |
| `model` | そのプロバイダのモデル名 |
| `base_url` | （任意）カスタムの OpenAI 互換エンドポイント |

`fallback_chain` は、`compression`、`vision`、`approval`、`skills_hub`、`mcp`
など、任意の補助タスクで使えます。

### ネイティブな vision の埋め込み予算（トップレベルの `vision:`） {#native-vision-embed-budgets-top-level-vision}

（describer モデルを選ぶ）`auxiliary.vision` とは別に、*メイン*のモデルが
vision に対応している場合、`vision_analyze` とブラウザのスクリーンショットは、
以降のすべてのターンで再送されるツール結果に実際のピクセルを埋め込みます。
`vision.embed_target_bytes`（既定 `262144`、64 KiB〜4 MiB にクランプ）は
1回の埋め込みのサイズを決め、`vision.max_calls_per_image` は同じ画像がセッション
あたり何回埋め込まれてよいかを制限します（未設定 = 委任されたサブエージェント内では
3回、メインエージェントでは無制限。`0` = 無制限）。
[Vision → Native embeds ride the session](/hermes/docs/user-guide/features/vision/#native-embeds-ride-the-session-visionembed_target_bytes-and-visionmax_calls_per_image)
を参照してください。

### 補助タスクの並行性を制限する {#limiting-auxiliary-concurrency}

`max_concurrency` は、`compression` や `title_generation` のような補助タスクの
実行中の LLM 呼び出しを、プロセス全体で制限します。`auxiliary.vision.max_concurrency`
は対象外です。それはすでに vision の CPU バウンドな画像エンコード／リサイズの
ワーカーだけを制御し、LLM のリクエストは制御しないからです。これは次のような
場合に特に役立ちます。

- 多くのセッションが同時にバックグラウンドの作業を発生させられる場合
  （Discord/Telegram のチャンネル、複数のターミナル）
- あなたのプロバイダがレート制限されている、または障害対応中で、再試行が
  バーストを増幅してしまう場合

既定は無制限です。典型的な安全な上限は `2` です。

```yaml
auxiliary:
  title_generation:
    max_concurrency: 2
  compression:
    max_concurrency: 2
```

このセマフォは、再試行とフォールバックを含む呼び出し全体を包むので、1回の
遅い呼び出しはこの上限に対して1回しか数えられません。

### 補助タスクの OpenRouter ルーティングと Pareto Code {#openrouter-routing-pareto-code-for-auxiliary-tasks}

補助タスクが OpenRouter に解決される場合（明示的に、または、あなたのメインの
エージェントが OpenRouter 上にある間の `provider: "main"` によって）、メインの
エージェントの `provider_routing` と `openrouter.min_coding_score` の設定は
**伝播しません** — 設計上、各補助タスクは独立しています。特定の補助タスクに
OpenRouter のプロバイダの好みを設定したり、
[Pareto Code router](/hermes/docs/integrations/providers/#openrouter-pareto-code-router)
を使いたい場合は、`extra_body` でタスクごとに設定してください。

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

この形は、OpenRouter が chat completions のリクエストボディで受け付けるものを
そのまま反映しています。Hermes は `extra_body` 全体をそのまま転送するので、
[openrouter.ai/docs](https://openrouter.ai/docs) に文書化されている他の
OpenRouter のリクエストボディのフィールドも同じように機能します。

### Vision モデルの変更 {#changing-the-vision-model}

画像分析に Gemini Flash の代わりに GPT-4o を使うには:

```yaml
auxiliary:
  vision:
    model: "openai/gpt-4o"
```

または環境変数経由で（`~/.hermes/.env` の中で）:

```bash
AUXILIARY_VISION_MODEL=openai/gpt-4o
```

### プロバイダの選択肢 {#provider-options}

これらの選択肢は、あなたのメインの `model.provider` の設定ではなく、
**補助タスクの設定**（`auxiliary:`、`compression:`）とプライマリのフォールバック
のエントリ（`fallback_providers:` またはレガシーな `fallback_model:`）に
適用されます。

| プロバイダ | 説明 | 必要なもの |
|----------|-------------|-------------|
| `"auto"` | 利用可能な最良のもの（既定）。vision は OpenRouter → Nous → Codex の順に試します。 | — |
| `"openrouter"` | OpenRouter を強制する — 任意のモデル（Gemini、GPT-4o、Claude など）にルーティング | `OPENROUTER_API_KEY` |
| `"nous"` | Nous Portal を強制する | `hermes auth` |
| `"codex"` | Codex OAuth（ChatGPT アカウント）を強制する。`model` を明示的に設定してください（例えば `gpt-5.4`）。 | `hermes model` → ChatGPT または Codex Subscription |
| `"minimax-oauth"` | MiniMax OAuth（ブラウザログイン、API キー不要）を強制する。補助タスクには MiniMax-M2.7-highspeed を使います。 | `hermes model` → MiniMax (OAuth) |
| `"xai-oauth"` | xAI Grok OAuth（SuperGrok または X Premium+ の購読者向けのブラウザログイン、API キー不要）を強制する。同じ OAuth トークンがチャット、TTS、画像、動画、文字起こしをカバーします。 | `hermes model` → xAI Grok OAuth (SuperGrok / Premium+) |
| `"main"` | アクティブなカスタム／メインのエンドポイントを使う。これは `OPENAI_BASE_URL` + `OPENAI_API_KEY` から、または `hermes model` / `config.yaml` で保存されたカスタムエンドポイントから来ます。OpenAI、ローカルモデル、任意の OpenAI 互換 API で動作します。**補助タスク専用 — `model.provider` には無効です。** | カスタムエンドポイントの資格情報 + base URL |

メインのプロバイダのカタログにある直接 API キーのプロバイダも、副次タスクに
既定のルーターを迂回させたい場合にここで使えます。例えば `gmi` は
`GMI_API_KEY` が設定されていれば有効で、`fireworks` は `FIREWORKS_API_KEY` が
設定されていれば有効です。

```yaml
auxiliary:
  compression:
    provider: "gmi"
    model: "anthropic/claude-opus-4.6"
```

GMI の補助ルーティングには、GMI の `/v1/models` エンドポイントが返す正確な
モデル ID を使ってください。Fireworks のモデル ID は、プロバイダ独自のスラッシュ
形式を使います。例えば `accounts/fireworks/models/glm-5p2` です。

### よくある構成 {#common-setups}

**直接カスタムエンドポイントを使う**（ローカル／セルフホストの API には
`provider: "main"` より明確です）:
```yaml
auxiliary:
  vision:
    base_url: "http://localhost:1234/v1"
    api_key: "local-key"
    model: "qwen2.5-vl"
```

`base_url` は `provider` より優先されるので、これは補助タスクを特定の
エンドポイントにルーティングする最も明確な方法です。直接エンドポイントの
上書きでは、Hermes は設定された `api_key` を使うか、`OPENAI_API_KEY` に
フォールバックします。そのカスタムエンドポイントに `OPENROUTER_API_KEY` を
再利用することはありません。

**vision に OpenAI の API キーを使う:**
```yaml
# In ~/.hermes/.env:
# OPENAI_BASE_URL=https://api.openai.com/v1
# OPENAI_API_KEY=sk-...

auxiliary:
  vision:
    provider: "main"
    model: "gpt-4o"       # or "gpt-4o-mini" for cheaper
```

**vision に OpenRouter を使う**（任意のモデルにルーティング）:
```yaml
auxiliary:
  vision:
    provider: "openrouter"
    model: "openai/gpt-4o"      # or "google/gemini-2.5-flash", etc.
```

**Codex OAuth を使う**（ChatGPT Pro/Plus アカウント — API キー不要）:
```yaml
auxiliary:
  vision:
    provider: "codex"     # uses your ChatGPT OAuth token
    model: "gpt-5.4"      # no implicit default on the Codex route
```

**MiniMax OAuth を使う**（ブラウザログイン、API キー不要）:
```yaml
model:
  default: MiniMax-M2.7
  provider: minimax-oauth
  base_url: https://api.minimax.io/anthropic
```
`hermes model` を実行し、**MiniMax (OAuth)** を選んでログインすると、これが
自動的に設定されます。中国リージョンでは、base URL は
`https://api.minimaxi.com/anthropic` になります。全体の手順は
[MiniMax OAuth guide](/hermes/docs/guides/minimax-oauth/) を参照してください。

**ローカル／セルフホストのモデルを使う:**
```yaml
auxiliary:
  vision:
    provider: "main"      # uses your active custom endpoint
    model: "my-local-model"
```

`provider: "main"` は、Hermes が通常のチャットで使っているのと同じプロバイダを
使います — それが名前付きのカスタムプロバイダ（例えば `beans`）であっても、
`openrouter` のような組み込みのプロバイダであっても、レガシーな
`OPENAI_BASE_URL` エンドポイントであっても同じです。

:::tip
メインのモデルのプロバイダとして Codex OAuth を使っている場合、vision は
自動的に動作します — 追加の設定は不要です。Codex は vision の自動検出の
チェーンに含まれています。
:::

:::warning
**Vision にはマルチモーダルのモデルが必要です。** `provider: "main"` を設定する
場合は、あなたのエンドポイントがマルチモーダル／vision をサポートしていることを
確認してください — サポートしていないと、画像分析は失敗します。
:::

### 環境変数（レガシー） {#environment-variables-legacy}

補助モデルは環境変数経由でも設定できます。しかし `config.yaml` が推奨される
方法です — 管理が簡単で、`base_url` や `api_key` を含むすべての選択肢に
対応しています。

| 設定 | 環境変数 |
|---------|---------------------|
| Vision プロバイダ | `AUXILIARY_VISION_PROVIDER` |
| Vision モデル | `AUXILIARY_VISION_MODEL` |
| Vision エンドポイント | `AUXILIARY_VISION_BASE_URL` |
| Vision API キー | `AUXILIARY_VISION_API_KEY` |

圧縮とフォールバックのモデルの設定は config.yaml のみです。
（`AUXILIARY_WEB_EXTRACT_*` の変数は廃止されました — web の抜き出しはもう
補助 LLM を使いません。）

:::tip
現在の補助モデルの設定を見るには `hermes config` を実行してください。上書きは
既定値と異なる場合にだけ表示されます。
:::

## 推論の Effort {#reasoning-effort}

応答する前にモデルがどれだけ「思考」するかを制御します。

```yaml
agent:
  reasoning_effort: ""   # empty = medium. Options: none, minimal, low, medium, high, xhigh, max, ultra
```

未設定（既定）の場合、推論の effort は既定で「medium」になります —
ほとんどのタスクでうまく機能するバランスの取れたレベルです。値を設定すると
それを上書きします — より高い推論の effort は、複雑なタスクでより良い結果を
もたらしますが、より多くのトークンとレイテンシを消費します。

### 回答の長さ（`text_verbosity`） {#answer-length-textverbosity}

Responses-API のモデル（OpenAI GPT-5系以降、直接 OpenAI、ChatGPT Codex、Azure の
ルート）は、推論の深さとは独立して、最終的な自然言語の回答がどれだけ長いかの
別のつまみも受け付けます。

```yaml
agent:
  text_verbosity: ""   # empty = not sent (provider default). Options: low, medium, high
```

Hermes はこれを Responses 系のルートでだけ、トップレベルの Responses の
`text: {verbosity: ...}` フィールドとして送ります。`chat_completions`、
Anthropic、xAI のリクエストには決して送られず、空または未知の値は何も送りません。
`request_overrides` を通じて設定された structured-output（`text.format`）は、
変更されずにそのまま渡されます。

:::note 適応的思考モデル（Claude 4.6+、Fable/Mythos 系）を OpenRouter で使う場合
これらのモデルは*適応的*な思考を使い、通常の `reasoning.effort` フィールドを
受け付けません — OpenRouter はそれらに対してこれを無視します。Hermes は
あなたの `reasoning_effort` を、代わりに OpenRouter の `verbosity` パラメータに
透過的にルーティングします（これは Anthropic の `output_config.effort` に
マッピングされます）。そのため、選ばれたモデルがサポートするレベルで、同じ
effort のつまみが機能し続けます。`none`（または未設定）は、モデルを自身の
適応的な既定値のままにします。ネイティブの Anthropic プロバイダは、すでに
effort を直接制御しているので影響を受けません。
:::

:::note OpenRouter のモデルとサポートされる effort のレベル
OpenRouter 経由でルーティングされる他のモデルについては、Hermes はライブの
モデルカタログの推論メタデータ（`supported_parameters` + モデルごとの
`reasoning.supported_efforts`）を読み、推論の制御をそもそも送るべきかを判断し、
あなたのリクエストした effort を、そのルートが実際にサポートする最も近い
レベルにクランプします（常に下方向です — 例えば `ultra` は `high` で止まる
ルートでは `high` になります。決して黙ってエスカレーションすることはありません）。
新しい推論対応のベンダーは、Hermes の更新を待たずに自動的に機能します。
カタログに到達できない、またはモデルが載っていない場合、Hermes は組み込みの
モデルファミリーのリストにフォールバックし、あなたの effort をそのまま渡します。
:::

:::note `ultra` は、そのルートが受け付ける最も強いレベルにクランプされる
`ultra` は Hermes 内部のはしごの1段です。どのプロバイダの通信もこれを受け付
けないので、すべてのルートがこれを自身の最も強いレベル（GPT-5.6 Codex と
OpenAI 互換のルートでは `max`、古い Codex のモデルでは `xhigh`）にクランプ
します。effort のピッカーと `/reasoning` のステータスはこれを
`ultra (sends max on this route)` として表示するので、見えているレベルが
実際に送られるレベルです。
:::

`/reasoning` コマンドでも実行時に推論の effort を変更できます。

```
/reasoning                # Show current effort level and display state
/reasoning high           # Set reasoning effort to high (this session only)
/reasoning high --global  # Set effort and persist to config.yaml
/reasoning none           # Disable reasoning (this session only)
/reasoning show           # Show model thinking above each response
/reasoning hide           # Hide model thinking
```

effort の変更は既定ではセッション単位です。新しいレベルを `agent.reasoning_effort`
の既定値として保存するには `--global` を追加してください。

#### モデルごとの推論の上書き {#per-model-reasoning-overrides}

異なるモデルに異なる推論の effort のレベルを設定できます。これは、複雑な
モデルには高い推論を、速いモデルには中程度を、というように使い分けたいときに
便利です。

```yaml
agent:
  reasoning_effort: "medium"       # global default
  reasoning_overrides:
    "openrouter/anthropic/claude-opus-4.5": "xhigh"
    "openai/gpt-5": "low"
    "claude-sonnet-4.6": "high"    # bare model name also works
```

キーの一致は**表記のゆらぎに寛容**です — 妥当な表記であれば一致します。
- `claude-opus-4.5`、`claude-opus-4-5`、`claude-opus.4.5`（ドットとダッシュは
  互換です）
- `anthropic/claude-opus-4.5`、`openrouter/anthropic/claude-opus-4.5`
  （プロバイダのプレフィックスは省略可）
- 名前付きのカスタムプロバイダのプレフィックスが付いたキー
  （`ollama-local/qwen3.6:27b-q4_k_m`）は、リクエストが裸のモデル ID
  （`qwen3.6:27b-q4_k_m`）だけを持つ場合にも適用されます。これはフォールバックの
  エントリと `providers:` のルートが送るものです
- 完全一致は、表記のゆらぎより優先されます

#### カスタムの推論ティア名 {#custom-reasoning-tier-names}

一部の OpenAI 互換のエンドポイントは、標準のはしごの外にある思考のティアを
公開しています（`low`…`max` の代わりに `fast`/`thinking` を提供するリレーなど）。
はしごの外にある裸の文字列は `Unknown reasoning_effort '<value>', using default
(medium)` として拒否されるので、typo が通信に届くことは決してありません。
プロバイダ独自のティア名をリクエストするには、明示的な dict 形式を使ってください
— `effort` の値は、トップレベルの `reasoning_effort` フィールドとしてそのまま
送られます。

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

dict 形式での `enabled: false` は、`reasoning_effort: none` と同じように
思考をオフにします。

dict 形式は `config.yaml` を直接編集して設定します。`/reasoning` のメニュー、
`hermes model`、ダッシュボードの補助モデルのピッカーは標準のはしごしか
提供しません（TUI のステータスとセットアップウィザードは、設定済みになると
それでもカスタムのティア名を表示します）。

:::note
モデル ID にはドットが含まれます（`claude-opus-4.5`、`qwen3.6:27b`）。
`hermes config set` はこれをネストの区切りとして扱います。リテラルのキーを
書くにはバックスラッシュでエスケープしてください — `hermes config set
'agent.reasoning_overrides.ollama-local/qwen3\.6:27b-q4_k_m' low` — または
YAML を直接編集してください。
[Dots inside key names](/hermes/docs/reference/cli-commands/#dots-inside-key-names)
を参照してください。
:::

:::note OpenAI Responses（`openai-api`、`openai-codex`）
`reasoning_effort: none` は、それを受け付けるモデル（GPT-5.x）では明示的に
`reasoning.effort: "none"` として送られます。フィールドを省略すると、
モデルの既定の effort がオンのまま残ってしまいます（GPT-5.6 は既定で
`medium` です）。未設定の effort だけがこのフィールドを省略する状態です。
`api.openai.com` 上のチャット時代のモデル（`gpt-4o`、`gpt-4.1`、それらの
`-mini` バリアントとファインチューン）は、いかなる `reasoning` パラメータも
拒否するので、Hermes は設定された effort に関わらずそれらには何も送りません。
そうしないと `400 Unsupported parameter: 'reasoning.effort'` で失敗します。
モデルが `none` を拒否する場合、Hermes は警告を出し、そのセッションでの
無効化を取り除き、モデルの既定値で再試行します。
:::

:::note ローカルの OpenAI 互換エンドポイント
カスタムの `base_url`（`http://localhost:11434/v1`、vLLM、SGLang、ルーター
エンドポイント）は、解決された effort — `agent.reasoning_effort` または
一致するモデルごとの上書き — を、標準のトップレベルの `reasoning_effort`
リクエストフィールドとして受け取ります。OpenAI 互換の通信が受け付ける値
（`none`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max`）にクランプ
されます。未設定の effort は、ここでも `medium` として送られます。これは
Nous Portal と OpenRouter のルートが適用するのと同じ既定値です — フィールドを
外すと、選択をエンドポイントに委ねることになり、ホストされた推論モデル自身の
既定値が上限になり得ます（kimi-k3 は既定で `max` です。`medium` の約3倍の
推論トークンとレイテンシです）。カタログや `model_overrides` が
`supports_reasoning: false` とマークするモデル、`thinking` 機能なしで pull
された ローカルの Ollama モデル、そしてエンドポイントがそのフィールドに
`400` を返した後のセッションの残りでは、このフィールドはオフのままです。
入れ子の `reasoning` オブジェクトは、それを受け付けると分かっているエンドポイント
（Nous Portal、OpenRouter の推論対応モデル、GitHub Models）専用です。任意の
サーバーは未知のフィールドを HTTP 400 で拒否するからです。あなたのサーバーが
思考の予算を別のフィールド（Ollama の `think`、vLLM の
`chat_template_kwargs`、ルーター固有のキー）から読む場合は、カスタムプロバイダの
[`extra_body`](/hermes/docs/integrations/providers/#named-custom-providers) の
下に設定してください。これは、そこにルーティングされるすべてのリクエストに
マージされます。
:::

**解決の優先順位:**

1. セッション単位の `/reasoning --session` の上書き（gateway のみ）
2. `agent.reasoning_overrides` からのモデルごとの上書き（表記のゆらぎに寛容）
3. グローバルな `agent.reasoning_effort`
4. プロバイダの既定値

この上書きは、あらゆる場所で自動的に適用されます。CLI の起動、`hermes -p`
のワンショット、メッセージング gateway、Desktop/TUI、ACP のセッション、cron
ジョブ、セッション中の `/model` の切り替え（最初のメッセージの前に発行された
切り替えも含みます）、セッションの再開（`--resume`、`/resume`）、`/new`、
そしてフォールバックモデルのアクティベーションです。

## Fast モード {#fast-mode}

Fast モードは、割高な価格でより速い出力をプロバイダにリクエストします。
OpenAI の [Priority Processing](https://openai.com/api-priority-processing/)
（`service_tier: priority`）、Grok 4.6 上の xAI Priority Processing、Anthropic の
[Fast Mode](https://platform.claude.com/docs/en/build-with-claude/fast-mode)
（`speed: fast`、Opus 4.8 / Opus 5 のみ）です。**既定でオフ**です。

```yaml
agent:
  service_tier: ""          # "" / normal | fast | auto | cold
  fast_auto_seconds: 60     # window for auto / cold
```

| モード | fast のパラメータが送られるタイミング | 使う場面 |
|------|---------------------------|------------|
| `normal`（既定、`""`） | 決して送られない | 最も安く、標準的なレイテンシ |
| `fast` | すべてのリクエスト | 常に速さが欲しい、長い対話的セッション |
| `auto` | **すべての**ターンの最初の `fast_auto_seconds` 秒間のリクエスト | 最初の返信を機敏にし、長いツールのループは標準価格にフォールバックする |
| `cold` | 同じウィンドウだが、セッションの**最初のターン**（事前の履歴なし）だけ | 導入時の返信を速くし、その後は標準価格にする |

`/fast normal|fast|auto|cold` はセッションのモードを切り替えます。
`config.yaml` に永続化するには `--global` を追加してください。`/fast` だけを
実行すると現在のモードが表示されます。

**コストに関する注意:** 両方のプロバイダは、fast なリクエストに標準レートへの
乗数を課します（Anthropic: Opus 4.8 と Opus 5 で入出力1メガトークンあたり
$10 / $50）。これはプロンプトキャッシュの価格と重なります。`auto`/`cold` は
その割高な部分をそのウィンドウだけに限定します。fast のパラメータは、それを
サポートする一次プロバイダのエンドポイント（`api.openai.com` / Codex の
サブスクリプション、`api.anthropic.com`、`api.x.ai`）にだけ送られます。
OpenRouter、Nous Portal、Copilot、Azure、Bedrock、カスタムの `base_url` の
ルートは、どのモードでもこれらを受け取ることはありません。リクエストごとに
変わるのはこのパラメータだけです — システムプロンプト、ツール、メッセージは
バイト単位で同一のままなので、プロンプトキャッシュはウィンドウの境界を
乗り越えて残ります。

### gateway やプロキシの背後にある Fast のティア {#fast-tiers-behind-a-gateway-or-proxy}

一次プロバイダ限定というこのルールは意図的なものです。fast なティアの
パラメータは課金の指示であり、Hermes はその価格表を知っているエンドポイントに
だけそれを送ります。あなたが独自の優先ティア（独自の `service_tier` の値、
または別の名前のフィールド）を公開する OpenAI 互換の gateway、ルーター、
プロキシを動かしている場合は、`agent.service_tier` の代わりに、そのプロバイダの
`extra_body` を通じてリクエストしてください。
[名前付きのカスタムプロバイダ](/hermes/docs/integrations/providers/#named-custom-providers)
の `extra_body` は、そのエンドポイントにルーティングされる**すべての**
chat-completions のリクエストにマージされ、gateway のターンや `/fast` の変更を
乗り越えて残り、そのプロバイダから `/model` で離れると再び取り除かれます。

```yaml
providers:
  my-gateway:
    api: https://gateway.example.com/v1
    key_env: MY_GATEWAY_KEY
    default_model: fast-lane-model
    extra_body:
      service_tier: priority     # whatever tier value your gateway documents
```

`agent.service_tier` との違い: そのプロバイダではこのティアが常にオンです
（`auto`/`cold` のウィンドウはありません）。`/fast` はこれを切り替えません。
そして Hermes は値の検証を行いません — その gateway が何を受け付け、何を課金
するかを決めます。

## ツール使用の強制 {#tool-use-enforcement}

一部のモデルは、時々意図した動作を、実際にツール呼び出しを行う代わりに
テキストとして記述します（「テストを実行します…」と言いながら実際には
ターミナルを呼び出さない、など）。ツール使用の強制は、モデルを実際にツールを
呼び出す方向へ導く、システムプロンプトのガイダンスを注入します。

```yaml
agent:
  tool_use_enforcement: "auto"   # "auto" | true | false | ["model-substring", ...]
```

| 値 | 挙動 |
|-------|----------|
| `"auto"`（既定） | 次に一致するモデルで有効: `gpt`、`codex`、`gemini`、`gemma`、`grok`、`glm`、`qwen`、`deepseek`、`muse`。他のすべて（例えば Claude）では無効。 |
| `true` | モデルに関わらず常に有効。現在のモデルが動作を実行せずに説明していると気づいた場合に便利です。 |
| `false` | モデルに関わらず常に無効。 |
| `["gpt", "codex", "qwen", "llama"]` | モデル名が列挙された部分文字列のどれか1つを含む場合にだけ有効（大文字小文字を区別しない）。 |

### 何が注入されるか {#what-it-injects}

有効にすると、システムプロンプトに2つの層のガイダンスが追加されることがあります。

1. **汎用のツール使用強制**（一致したすべてのモデル） — 意図を説明する代わりに
   即座にツール呼び出しを行い、タスクが完了するまで作業を続け、将来の行動の
   約束でターンを終えないようにモデルに指示します。

2. **Google の運用ガイダンス**（Gemini と Gemma のモデルのみ） — 簡潔さ、
   絶対パス、並列のツール呼び出し、編集前の検証パターンです。

これらはユーザーには透過的で、システムプロンプトにだけ影響します。すでに
信頼性を持ってツールを使うモデル（Claude のような）にはこのガイダンスは
不要です。だからこそ `"auto"` はそれらを除外しています。

### いつ有効にすべきか {#when-to-turn-it-on}

既定の自動リストにないモデルを使っていて、それが*するつもりだ*という説明を、
実際に行う代わりに頻繁にしているのを見かけたら、`tool_use_enforcement: true`
を設定するか、そのモデルの部分文字列をリストに追加してください。

```yaml
agent:
  tool_use_enforcement: ["gpt", "codex", "gemini", "grok", "my-custom-model"]
```

## 実行の規律のガイダンス {#execution-discipline-guidance}

ツール使用の強制とは別に、Hermes は、評価のトレースで観測された一連の
エージェント的な失敗モードを共有するモデルファミリー向けに**実行規律**のブロックを
注入します。それは、コードではなく文章で算術を行う、外部への書き込みの後で
読み返しによる検証をスキップする、不正な形式の識別子を「修復」する、件数の
不一致にも関わらず完全性を主張する、すべての受け入れ条件を検証せずに
「完了」と宣言する、といった振る舞いです。

```yaml
agent:
  execution_guidance: "auto"   # "auto" | true | false | ["model-substring", ...]
```

| 値 | 挙動 |
|-------|----------|
| `"auto"`（既定） | 次に一致するモデルで有効: `gpt`、`codex`、`grok`、`deepseek`、`kimi`、`qwen`、`glm`、`minimax`、`mimo`、`mistral`、`muse`。 |
| `true` | モデルに関わらず常に有効。 |
| `false` | モデルに関わらず常に無効。 |
| `["deepseek", "my-custom-model"]` | モデル名が列挙された部分文字列のどれか1つを含む場合にだけ有効（大文字小文字を区別しない）。 |

注入されるブロックが扱う内容:

- **ツールの持続性** — タスクが完了し*かつ*検証されるまでツールの呼び出しを
  続ける。空、部分的、または不自然に狭い検索結果は、結論を出す前に、より広い、
  または異なるクエリで再試行する。
- **ツール使用の必須化** — 算術、ハッシュ、日付、システムの状態、ファイルの
  事実は常にツールから得るもので、頭の中の計算からは決して得ない。
- **外部への書き込みの読み返し** — 外部システムへの状態を変える書き込みの後は、
  成功を主張する前に、正確な対象を読み返す（ツールがすでに確認した内部の
  ファイル編集は再検証されません）。
- **件数の照合** — 宣言された合計（`total`、`reply_count`、`has_more`）は
  確固たる断定であり、不一致があれば、プログラムで再取得または再解析する。
- **リテラルの保持** — 宣言された形式に合わない識別子を正規化・「修復」しない。
  検索が成功したことは、不正な形式の元のトークンを正当化しない。
- **検証を条件とした完了** — 「完了」とは、名指しされたすべての受け入れ条件が
  検証されていることを意味し、それらしいだけの部分集合では決してない。

このゲートは `tool_use_enforcement` とは独立しています — どちらかだけが
オンでも構いません。このガイダンスはセッションの開始時にモデル名をキーとして
一度だけ選ばれるので、システムプロンプトは会話の生涯を通じてバイト単位で
安定したまま（プロンプトキャッシュにも優しいまま）です。Gemini/Gemma は、
より具体的な Google の運用ガイダンスを受け取るため自動リストから除外されて
います。Claude は、これらの失敗モードを示さないため除外されています —
`true` や部分文字列のリストで任意のモデルをオプトインできます。

## ツールループのガードレール {#tool-loop-guardrails}

Hermes は、エージェントが非生産的なツール呼び出しのループに詰まっているとき
— 同じツール呼び出しが繰り返し失敗している、同じツールが何度も失敗している、
または冪等な呼び出しが進行なしで同じ結果を返している — を検知します。既定では、
モデルが自己修正できるよう、ツール結果に**警告**を注入します。対話的な CLI、
TUI、Desktop、ACP のセッションは、人が介入できるので警告専用のままです。
無人の gateway と cron のセッションは、既定でハードストップを有効にします。

このプラットフォームを意識した既定値は、無人のデプロイでは無効にできますし、
どのプラットフォームでもハードストップを明示的に有効にすることもできます。

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

`hard_stop_enabled` は、どのプラットフォームでも明示的にハードストップを
有効にします。これが `false` のままの場合でも、`non_interactive_hard_stop_enabled`
は、無人の gateway/cron 系のプラットフォームではそれらを有効にしたまま、
CLI、TUI、Desktop、ACP、サブエージェント、`api_server` の実行（生きている親や
クライアントを持つ、監督された作業ループ）では警告専用の挙動を保ちます。無人の
デプロイをオプトアウトするには `non_interactive_hard_stop_enabled: false` を
設定してください。[Docker / 無人デプロイ](/hermes/docs/user-guide/docker/)も
参照してください。

ハードストップは**再現**を捉えるように設計されています — 同じ呼び出しが、
変わらないまま、その間に何も起きずに繰り返されることです — 正当な繰り返しは
対象ではありません。

- **編集して再実行することは、決してループではありません。** 成功した何かを
  変更する呼び出し（`write_file`、`patch`、成功した `terminal`/`execute_code`、
  ブラウザの操作、ジョブ／メッセージ／cron の変更）は、まだ数えられている
  すべての失敗した呼び出しについて進行があったとマークします。次の同一の
  再試行（修正後に赤いテストを再実行する、クリック後に再度スナップショットを
  取る）は、ブロックに向かって積み上がるのではなく、新しい連続の開始になります。
- **異なる赤いコマンドは診断であり、ループではありません。** ゼロでない
  終了コードが通常の出力であるツール（`terminal`、`execute_code`、プロセスの
  ポーラー、`browser_navigate`、`web_extract`）については、`same_tool_failure`
  の閾値は警告だけを行い、決して停止させません。正確に同じ引数の再現で、
  間に変更が挟まらない場合、または同一の結果が続く場合にだけ、それらは
  停止できます。
- **停止はターンを終えるだけで、セッションを終えるわけではありません。**
  エージェントは、どのガードレールが発火し、なぜかを返信します。「continue」
  と返信すると、新しいターンごとのカウンターで再開します。

### ターンごとの暴走ループの上限 {#per-turn-runaway-loop-caps}

上記の失敗ベースの閾値とは別に、`loop_caps` は、1回のエージェントのループ
（ターン）が行える `web_search` の呼び出しとサブエージェントの生成の数に
ハードな上限を設定します。カウンターはターンの開始ごとにリセットされるので、
正当な複数ターンのセッションが飢えることはありません — しかし、1つのターンが
無制限の検索や委任のループに陥る場合は止められます。これらは常に有効で、
`hard_stop_enabled` に関わらず発火します。1つのターンで何十もの web 検索を
発行したり、何十ものサブエージェントを生成したりすることは、すでに病理的な
状態なので、既定値は低く設定されています。上限に達すると、問題のあるツール
呼び出しは説明メッセージ付きでブロックされ、残りの予算を使い切るのではなく
ターンはきれいに停止します。どちらかの値を `0` に設定すると、その上限を
完全に無効にできます。

1回の `delegate_task` のバッチは、各タスクを `max_subagents` に数えます
（3つのタスクのバッチは3つ消費します）。そのため、この上限は
`delegate_task` の呼び出し回数ではなく、実際に生成されたサブエージェントの
数を追跡します。

これは Claude Code のセッションごとの WebSearch とサブエージェントの上限
（v2.1.212）を反映したものです。それも既定は200で、`/clear` でリセットされます。

### 実行時の停滞防止ガード {#runtime-anti-stall-guards}

上記の失敗ベースのガードレールを補うものとして、`agent.stall_guards`
（既定 `true`）は、無駄なターンに対する2つの慎重な実行時のガードを有効にします。
まず、**同一呼び出しのループブレーカー**です。同じツールが同一の引数で
連続して3回以上呼び出され*かつ*同一の結果を返す場合、その呼び出しを
繰り返さないようモデルに伝える短い1行の通知がそのツール結果に追加されます
— 警告専用のセッションではこれが呼び出しをブロックすることは決してなく、
正当に繰り返し可能なポーラー（`process_manage`、`*_get_result`、`*_poll`）は
免除されます。ハードストップが有効な場合（明示的な `hard_stop_enabled`、
または無人の gateway/cron のプラットフォーム）、同じ連続は、それが
`hard_stop_after.idempotent_no_progress` 回連続の同一呼び出しに達すると
ハードストップにもなります — `idempotent_no_progress` のガードレールが追跡する
読み取り専用のツールだけでなく、**どの**ツールでもです。そのため、成功した
同じ `terminal` や `skill_view` の呼び出しを再現するモデルは、イテレーション
予算を使い切るのではなく停止されます（`identical_call_streak_halt`）。次に、
**continue の意図の回復**です。モデルがツール呼び出しなしでターンを終え、
その短い返信が動作を予告して終わっている場合（「では、ファイルを更新します…」）、
Hermes は intent-ack の回復に使われるのと同じ制限付きの続行の仕組み
（ターンごと最大2回の再プロンプト）でモデルに行動を再度促します。どちらも
キャッシュ安全です（通知は結果の構築時に追加され、遡って追加されることは
ありません）。両方まとめて無効にできます。

```yaml
agent:
  stall_guards: false
```

同じゲートは**結果参照のスタブ化**も有効にします。再発行された同一のツール
呼び出しが、バイト単位で同一の新しい結果を返す場合、重複したペイロードは、
全体の出力を繰り返す代わりに、それより前の結果を指す短い参照スタブ（ツール名、
`tool_call_id`、引数の要約、そして最初の結果がディスクに永続化されていれば
そのあふれ先のパス）としてコンテキストに入ります。ツールはそれでも毎回
実行されるので、ポーリングのセマンティクスは保たれます。変化した結果は
常に全体を通じて流れます。512文字未満の結果、エラーの結果、マルチモーダルの
結果は決してスタブ化されず、ポーラーはスタブ化*されます*（変化のないポーリングは、
まさに重複したペイロードが何の情報も持たないケースです）。

### ターン生存確認ウォッチドッグ {#turn-liveness-watchdog}

`agent.turn_liveness` は、Hermes が強制的に回復させる前に、会話のターンが
**観測可能な進行なしで**動いてよい時間を制限します。このウォッチドッグは
アクティビティクロック（API の待機、ストリームのトークン、ツールの
ハートビートに刻まれるのと同じ信号 — リースの更新は決して数えられません）に
基づくので、途中で黙って詰まったターン（issue #95548 で観測: ツールの実行も
API の呼び出しもエラーもないが、セッションは無期限に「busy」のままになる）は、
大きく表面化され、中断されて再試行可能な中断されたターンとして巻き戻り、
中断がその詰まりを巻き戻せない場合は、その永続的なターンのリースの更新が
止まるので、プロセスが kill されるまでハングし続けるのではなく、stale-turn の
クリーンアップがそのセッションを回収できます。

```yaml
agent:
  turn_liveness:
    timeout_s: 600.0   # idle bound; <= 0 disables the watchdog
    poll_s: 15.0        # sampling interval (seconds)
```

正当に遅い作業は罰せられません。ストリーミングの応答、ツールのハートビート
（ツールが動いている間30秒ごと）、承認の待機はすべてクロックに触れ続けるので、
その全期間にわたって*ゼロ*の進行しかしていないターンだけがこのウォッチドッグを
発火させます。無効な値（typo、`NaN`、`Inf`、非正の `poll_s`）は警告をログに出し、
既定値にフォールバックします — 起動をクラッシュさせたり、ウォッチドッグを黙って
無効化したりすることは決してありません。発火した中断は、回復を始めた時点で
その停滞を報告し、確定的な中断／リース停止という結果は、その中断が実際に
コミットされた時点でだけ公表します。

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

これは、`text_to_speech` ツールと、音声モード（CLI またはメッセージング
gateway での `/voice tts`）での話される返信の両方を制御します。

**速度のフォールバックの階層:** プロバイダ固有の速度（例えば `tts.edge.speed`）
→ グローバルな `tts.speed` → 既定値 `1.0`。すべてのプロバイダに一律の速度を
適用するには、グローバルな `tts.speed` を設定してください。細かい制御には
プロバイダごとに上書きしてください。

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

### ターンごとの要約とスピナーのトークンフロー {#per-turn-summary-and-spinner-token-flow}

`display.turn_summary`（既定 `true`）は、**対話的な CLI** の各ターンの後に、
そのターンが実際に何をしたかを要約する薄い色の1行の集計を出力します。

```
⋯ 12.4s · edited 2 files +18 -3 · read 4 files · ran 3 commands
```

この集計は、CLI がすでに受け取っているツール進行状況のフィードから観測される
ので、追加のコストはかかりません。詳細:

- 経過時間は、そのターンの実際の所要時間です（1分を超えると `2m05s`）。
- ツールの呼び出しは動詞（`edited`、`read`、`ran`、`searched` など）で
  グループ化され、正しく複数形になります。整えられた動詞を持たないプラグイン／
  MCP のツールは `called N tools` にまとめられます。
- `+X -Y` の行の差分は、ツール結果がすでに差分を報告している場合（現在は
  `patch`）にだけ表示されます。Hermes はそれを計算するために git を呼び出す
  ことは決してないので、`write_file` の編集は差分なしで数えられます。
- **失敗したツール呼び出しは数えられません** — 拒否された書き込みは決して
  成功した編集として表示されません（補完的な警告については
  [file-mutation verifier](#file-mutation-verifier) を参照してください）。
- 長いターンは、動詞のセグメント4つと `+N more` の末尾に上限が決まっているので、
  行が折り返されることは決してありません。
- ツール呼び出しのない速いターンは、何も出力しません。

`display.spinner_token_flow`（既定 `true`）は、実行中のターンの累積出力
トークンを CLI のスピナーの生存タイマーに追加します。

```
  ⚡ Reading cli.py  (  2.3s · ↓ 1.2k tok)
```

この件数はターンごとです（セッションの合計はターンの開始時点で基準化されます）。
ターン内の各 API 呼び出しが使用量を報告するたびに更新されます。最初の使用量の
報告が届く前は何も表示されないので、誤解を招く `↓ 0 tok` を目にすることは
決してありません。

どちらのキーも表示専用で CLI 専用です。静音モード、`display.tool_progress`
が `off` のとき、単発クエリ／`-Q` のバッチ実行、gateway／メッセージングの面
（それらは代わりに `display.runtime_footer` を使います）では抑制されます。
どちらかのキーを `false` に設定するとオフにできます。

### file-mutation verifier {#file-mutation-verifier}

`display.file_mutation_verifier` が `true`（既定）のとき、Hermes は、
`write_file` または `patch` の呼び出しがターン中に失敗し、対象のファイルが
その後（パスのどんな表記でも）正常に書き込まれることもなく、ターンが終わる
までにディスク上で他の方法で変更されることもなかった場合、アシスタントの
最終的な応答に1行の助言を追加します。これは、「並列パッチのバッチで半分が
黙って失敗し、モデルが成功を要約する」というたぐいの過大な主張を、
編集のたびに手動で `git status` を実行しなくても捉えます。

フッターの例:

```
⚠️ File-mutation verifier: 3 file edit(s) FAILED this turn despite any wording above that may suggest otherwise. Run `git status` or `read_file` to confirm what actually landed.
  • concepts/automatic-organization.md — [patch] Could not find match for old_string
  • concepts/lora.md — [patch] Could not find match for old_string
  • concepts/rag-pipeline.md — [patch] Could not find match for old_string
```

フッターを抑制するには `file_mutation_verifier: false`（または
`HERMES_FILE_MUTATION_VERIFIER=0`）を設定してください。この verifier は、
ターン終了時に実際の失敗が残っている場合にだけ発火します — 失敗したパッチを
同じターン内で再試行して成功したモデルは、そのファイルについてはこれを
発火させません。

**モデルの要約より verifier を信頼してください。** このフッターは、
アシスタントの最後のメッセージがタスクは完了したと言っていても、列挙された
編集の呼び出しが**失敗し**、Hermes がそれらのファイルへのその後の変更を
何も見なかったことを意味します。これは `write_file`/`patch` の受領と、
ターン終了時の変更時刻のチェックだけを追跡するので、実際に何が反映されたかを
確認するには `git status` や `read_file` を実行してください。よくある原因:

- **書き込みの拒否** — パスが資格情報の denylist に載っている、または
  `HERMES_WRITE_SAFE_ROOT` の外にある
  （[File write safety](/hermes/docs/user-guide/security/#file-write-safety)
  を参照）
- **パッチの不一致** — `old_string` がディスク上のファイルと一致しなかった
- **構文ゲート** — 書き込み候補の内容が、書き込みの前に JSON/YAML/TOML の
  検証に失敗した

書き込みがブロックされたときのフッターの例:

```
⚠️ File-mutation verifier: 2 file edit(s) FAILED this turn despite any wording above that may suggest otherwise. Run `git status` or `read_file` to confirm what actually landed.
  • ~/.hermes/cron/jobs.json — [patch] Write denied: '…' is outside HERMES_WRITE_SAFE_ROOT (/path/to/project)
  • ~/.hermes/scripts/monitor.py — [write_file] Write denied: '…' is outside HERMES_WRITE_SAFE_ROOT (/path/to/project)
```

Hermes の状態（`~/.hermes/` の下の cron ジョブ、スキル、スクリプト）への
書き込みが失敗している場合は、環境で `HERMES_WRITE_SAFE_ROOT` が設定されて
いないか確認してください。cron の変更には、`jobs.json` を直接パッチするのでは
なく、`cronjob_manage` ツールか `hermes cron edit` を使ってください。

### 静的なメッセージの UI 言語 {#ui-language-for-static-messages}

`display.language` の設定は、静的なユーザー向けメッセージの小さな集合
— CLI の承認プロンプト、gateway のスラッシュコマンドへの返信のうちいくつか
（再起動の排出通知、「approval expired」、「goal cleared」など）— を翻訳します。
エージェントの応答、ログの行、ツールの出力、エラーのトレースバック、
スラッシュコマンドの説明は翻訳**しません** — それらは英語のままです。
エージェント自身に別の言語で答えさせたい場合は、プロンプトやシステム
メッセージでそう伝えてください。

サポートされる値: `en`（既定）、`zh`（簡体字中国語）、`zh-hant`（繁体字
中国語）、`ja`（日本語）、`de`（ドイツ語）、`es`（スペイン語）、`fr`
（フランス語）、`tr`（トルコ語）、`uk`（ウクライナ語）、`af`（アフリカーンス語）、
`ko`（韓国語）、`it`（イタリア語）、`ga`（アイルランド語）、`pt`
（ポルトガル語）、`ru`（ロシア語）、`hu`（ハンガリー語）。未知の値は英語に
フォールバックします。

`HERMES_LANGUAGE` 環境変数でセッションごとにこれを設定することもでき、
設定ファイルの値を上書きします。

```yaml
display:
  language: zh   # CLI approval prompts appear in Chinese
```

| モード | 見えるもの |
|------|-------------|
| `off` | 無音 — 最終的な応答だけ |
| `new` | ツールが変わったときだけツールのインジケーターを表示 |
| `all` | 短いプレビュー付きですべてのツール呼び出しを表示（既定） |
| `verbose` | 完全な引数、結果、デバッグログ |

CLI では、`/verbose` でこれらのモードを切り替えます。メッセージング
プラットフォーム（Telegram、Discord、Slack など）で `/verbose` を使うには、
上記の `display` セクションで `tool_progress_command: true` を設定して
ください。そうすると、このコマンドがモードを切り替えて設定ファイルに保存する
ようになります。

ツールの進行状況の表示には、進行状況の更新を安全に表示できる gateway の
アダプターが必要です。Signal を含む、メッセージの編集をサポートしていない
プラットフォームは、`/verbose` が `off` 以外のモードを保存していても、
ツール進行状況のバブルを抑制します。

`off` は、ツール呼び出しの*装飾*だけを隠します。Desktop アプリと TUI で
独自の表示面を持つアプリケーションの状態 — タスクリスト（`todo_list`）、
サブエージェントの進行状況、確認の質問、MCP の同意カード — は、この設定に
関わらず流れ続けます。

### フォーカスビュー（`/focus`、CLI + TUI） {#focus-view-focus-cli-tui}

`display.focus_view: true` は**フォーカスビュー**を有効にします — 詳細な
実況ではなく答えが欲しいときのための、出力を減らした表示モードです。これは
別の抑制の経路ではなく、同じ `tool_progress` の仕組みの上に乗った薄い層です。

- これを有効にすると `tool_progress` を `off` に固定し、それまでのモードを
  `display.focus_saved_tool_progress` に保管します。
- `/focus off` はそのモードを正確に復元するので、`/verbose verbose` の設定は
  往復を乗り越えて残ります。
- 完了した各ターンは薄い色の回復の行で終わります — `⋯ 7 tool lines hidden · /focus off to show` — これは*フォーカス前*のモードに対して数えられるので、
  すでにオフにしていた行を隠したと主張することは決してありません。
- 永続的な `◉ focus` のバッジがステータスバー（prompt_toolkit の CLI と Ink の
  TUI の両方）に表示されるので、この出力を減らしたモードが見えなくなることは
  決してありません。
- フォーカスがオンの間に `/verbose` を切り替えると、モードは `/verbose` に
  戻り、バッジは消えます。

フォーカスビューは**表示専用**です。会話の履歴、システムプロンプト、ツールの
スキーマ、どのリクエストのペイロードも決して編集しません — 隠された詳細は
画面上で抑制されるだけで、決して捨てられず、プロンプトキャッシュには全く
影響しません。

### ステータスバーのフィールド選択（CLI/TUI） {#status-bar-field-selection-clitui}

CLI/TUI の下部にある対話的なステータスバーは、モデル、コンテキストの使用量、
圧縮の回数、バックグラウンドのアクティビティのカウンター、タイマー、モードの
バッジを表示します。`display.status_bar.fields` は、それらのうちどれを
表示するかを選びます — 最小限のバー（モデルと所要時間だけ）にしたいときや、
オプトインのセッショントークン合計を表面化したいときに便利です。

```yaml
display:
  status_bar:
    fields: ["model", "duration", "total_tokens"]   # visibility only; built-in order is preserved
```

サポートされるフィールド: `model`、`context_detail`（使用済み／合計トークン）、
`context_pct`（パーセント＋メーター）、`cache_hit`（プロンプトキャッシュの
ヒット率 — モデルの切り替えと圧縮でリセットされます）、`latency`（直近10回の
呼び出しの移動平均 API レイテンシ）、`tps`（直近10回の呼び出しの移動平均の
出力トークン／秒）、`compressions`、`bg_tasks`、`bg_processes`、
`bg_subagents`、`goal`、`git_branch`（⎇ 作業ディレクトリの現在の git ブランチ
— オプトインのみで既定では決して表示されません。detached HEAD では短縮された
コミットが表示されます）、`duration`、`prompt_elapsed`、`idle_since`、
`focus`、`yolo`、`stash`、`battery`、`title`（右寄せのセッションバッジ）、
そして `total_tokens`（セッションの合計 Σ — オプトインのみで既定では
決して表示されません）。

補足:

- 空のリスト（既定）は標準の集合を保ちます — `total_tokens` と `git_branch`
  以外のすべてです。
- この設定は**表示・非表示だけを制御し、順序は制御しません** — フィールドは
  組み込みの位置でレンダリングされます。
- 狭いターミナルは、設定に関わらず、幅の広いモード専用のフィールド
  （`context_detail`、`cache_hit`、`latency`、`tps`、`prompt_elapsed`、
  `idle_since`）を落とします（`cache_hit` は52列以上の中間ティアでも
  表示されます）。
- `latency`/`tps` は、API 呼び出しが記録されるまで隠れたままです（例えば
  Codex の app-server バックエンドはレイテンシを報告しません）。
- `battery` と `title` の表示・非表示は、ここでも自身のトグル（`/battery`、
  `/title`）と組み合わさります — このセグメントを表示するには両方がオンで
  ある必要があります。
- 同じキーは **Ink TUI** のステータスルール（`hermes tui`）もフィルタします。
  そこでは `cache_hit`、`latency`、`tps` は、それぞれ96/104/110列以上の
  ターミナルで、幅の予算に応じた末尾のセグメント（◎ / ◷ / ↑）としてレンダリング
  されます。
- 表示専用です。プロンプトキャッシュやリクエストのペイロードには影響しません。
  変更は次のセッション開始時に反映されます。

### ランタイムメタデータのフッター（gateway のみ） {#runtime-metadata-footer-gateway-only}

`display.runtime_footer.enabled: true` のとき、Hermes は各 gateway のターンの
**最後の**メッセージに、小さなランタイムコンテキストのフッターを追加します。
現在のフッターは、モデル、コンテキストウィンドウの占有率、現在の作業
ディレクトリを表示できます。既定ではオフです。チームがすべての返信にこの
由来情報を含めたい場合は、gateway ごとにオプトインしてください。

```yaml
display:
  runtime_footer:
    enabled: true
    fields: ["model", "context_pct", "cwd"]   # order shown; drop any to hide
```

サポートされるフィールド:

| フィールド | 表示されるもの | 例 |
| --- | --- | --- |
| `model` | ベンダーのプレフィックスを除いた素のモデル ID | `gpt-5.4` |
| `context_pct` | 直前の呼び出しのコンテキストの占有率をパーセントで | `5%` |
| `latency` | そのターンの経過時間 | `22s`、`1m05s` |
| `served_model` | 実際に答えたモデルが、設定したものと異なる場合それを示す — ルーティングプロキシが `x-litellm-model-id`（または `x-litellm-model-api-base`）応答ヘッダーで報告したデプロイ、またはそのターンで Hermes が切り替えたフォールバックモデル | `hermes-router → gpt-4o-2024-11-20` |
| `cwd` | ホームからの相対的な作業ディレクトリ | `~` |

既定のフィールドの集合は `["model", "context_pct", "cwd"]` です。`latency`
と `served_model` はオプトインです — 使うには `fields` に追加してください。
`served_model` は、実際に答えたモデルが設定されたものと同じ場合（または
プロキシがそのようなヘッダーを送らない場合）は何もレンダリングしないので、
ルーティングプロキシの背後やアクティブなフォールバックの状況では、この
フィールドが切り替わりを見えるようにします。データが利用できないフィールドは、
空のスロットをレンダリングするのではなく、黙ってスキップされます。

`/footer` スラッシュコマンドは、任意のセッションで実行時にこれを切り替えます。

Telegram/Discord/Slack の返信に追加されるフッターの例:

```
— claude-opus-4.7 · 12 tool calls · 2m 14s · $0.042
```

ターンの**最後**のメッセージだけがこのフッターを得ます。途中の更新はきれいな
ままです。

### プラットフォームごとの進行状況の上書き {#per-platform-progress-overrides}

プラットフォームが異なれば、詳細度の必要性も異なります。プラットフォームごとの
モードを設定するには `display.platforms` を使ってください。

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

CLI からは、正規のパスを使ってください — `hermes config set
display.platforms.telegram.streaming false`。省略形の `hermes config set
platforms.telegram.streaming false` も受け付けられます。プラットフォームごとの
*表示*設定（`streaming`、`show_reasoning`、`tool_progress` など）は常に
`display.platforms` からしか読まれないため、`config set`/`get`/`unset` は
その省略形を正規のキーへリダイレクトし、注記を表示します。トップレベルの
`platforms.<name>` ブロックの下にある接続用のキー（`token`、`enabled`、
`reply_to_mode`、`extra`）はリダイレクトされません。それらを入れ子の
プレフィックスの下に書く（`hermes config set gateway.platforms.telegram.enabled
true`）と、トップレベルの `platforms.telegram.enabled` へ注記付きでリダイレクト
されます。gateway は両方のブロックを読みますが、共有されるキーではトップ
レベルのものが優先されるので、入れ子の書き込みは既存のトップレベルの値に
黙って隠されてしまうことになります。

上書きのないプラットフォームは、グローバルな `tool_progress` の値に
フォールバックします。有効なプラットフォームのキー: `telegram`、`discord`、
`slack`、`signal`、`whatsapp`、`matrix`、`mattermost`、`email`、`sms`、
`homeassistant`、`dingtalk`、`feishu`、`wecom`、`weixin`、`bluebubbles`、
`qqbot`。レガシーな `display.tool_progress_overrides` のキーは後方互換性の
ために読み込まれますが、非推奨で、初回読み込み時に `display.platforms` へ
移行されます。

Signal は、設定がプラットフォームごとに保存できるため有効なプラットフォームの
キーとして列挙されていますが、現在の Signal のアダプターは送信済みメッセージを
編集できず、ツール進行状況のバブルをレンダリングしません。Signal の
`tool_progress` は `off` のままにしておき、各ツール呼び出しをライブで見たい
場合は CLI や編集機能のあるメッセージングプラットフォームを使ってください。

`interim_assistant_messages` は gateway 専用です。有効にすると、Hermes は
完了した途中のアシスタントの更新を、別のチャットメッセージとして送ります。
これは `tool_progress` とは独立していて、gateway のストリーミングを必要とし
ません。

`show_commentary`（既定 `true`）は、Codex Responses のモデルの commentary
チャンネル — これらのモデルが非公開の推論と一緒に生成する、整えられた進行状況の
実況 — を制御します。有効にすると、完了した各 commentary のメッセージは、
見える形の途中の更新として届けられます（gateway ではこれには
`interim_assistant_messages` も必要です）。この余分な実況が邪魔なら
`false` に設定してください。その場合、commentary は推論チャンネルにフォール
バックし、`show_reasoning` が有効な場合にだけ表示されます。

## プライバシー {#privacy}

```yaml
privacy:
  redact_pii: false  # Strip PII from LLM context (gateway only)
```

`redact_pii` が `true` のとき、gateway は、サポートされるプラットフォームでは
LLM に送る前に、システムプロンプトから個人を特定できる情報を取り除きます。

| フィールド | 処理 |
|-------|-----------|
| 電話番号（WhatsApp/Signal のユーザー ID） | `user_<12-char-sha256>` にハッシュ化 |
| ユーザー ID | `user_<12-char-sha256>` にハッシュ化 |
| チャット ID | 数値部分がハッシュ化され、プラットフォームのプレフィックスは保持（`telegram:<hash>`） |
| ホームチャンネル ID | 数値部分がハッシュ化 |
| ユーザー名／ユーザーID表示名 | **影響を受けません**（ユーザーが選んだ、公開されている情報） |

**プラットフォームの対応:** 匿名化は WhatsApp、Signal、Telegram に適用されます。
Discord と Slack は、そのメンションの仕組み（`<@user_id>`）が LLM のコンテキストに
実際の ID を必要とするため除外されています。

ハッシュは決定的です — 同じユーザーは常に同じハッシュに対応するので、モデルは
グループチャットの中でもユーザーを区別できます。ルーティングと配送は、内部では
元の値を使います。

### OpenAI Codex のリクエスト identity {#openai-codex-request-identity}

OpenAI は、サードパーティの Codex ハーネスに自己を識別するよう要求しています。
公式の Codex エンドポイントへの ChatGPT 認証済みのリクエストは、自動的に
`originator: hermes-agent` と `User-Agent: HermesAgent/<version>` を送ります。
既存の ChatGPT アカウントのヘッダーは保たれます。追加のプロンプトの内容や
テレメトリのリクエストは送られません。直接の OpenAI API のリクエストと
カスタムのプロキシのエンドポイントは変わりません。

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

言語の解決は、**すべての** STT プロバイダ（local、groq、openai、mistral、
xai、elevenlabs、deepinfra、command 型のプロバイダ、プラグイン）で同じです:
`stt.<provider>.language` → `stt.language` → `HERMES_LOCAL_STT_LANGUAGE`
環境変数 → プロバイダの自動検出。**既定は `stt.language: "en"`** です —
Whisper の自動検出は、短い、またはアクセントのあるクリップをよく誤認識し、
それは間違った言語で文字起こしされたボイスノートとして現れます。英語以外の
話者は、一度 `stt.language` を自分の言語コードに設定してください（例えば
`"es"`、`"zh"`、`"uk"`）。多言語での利用のために自動検出を復元するには `""`
に設定してください。

`stt.openai.timeout` と `stt.openai.max_retries` は、`openai`、`groq`、
`deepinfra` の各プロバイダが共有する OpenAI-SDK の文字起こしクライアントを
形作ります（今のところプロバイダごとの兄弟キーはなく、SDK はこれらのために
環境変数を読みません）。既定値は、以前の固定された30秒／再試行なしではなく
`60` / `1` です。セルフホストの OpenAI 互換エンドポイントは、最初のリクエストで
モデルを読み込むのに30秒より長くかかることがあり、以前はそれによって
ボイスメッセージが丸ごと失われていたためです。トレードオフとして、到達
できないバックエンドは、Hermes があきらめるまでに、最大でタイムアウトの
2倍の時間、ボイスメッセージを保持することになります。以前の形に戻すには
`timeout: 30` と `max_retries: 0` を設定してください。

gateway がエージェントのためにボイスノートを文字起こしすべきだが、生の
文字起こしをチャットに投稿してはならない場合（例えば顧客向けの WhatsApp
ボットなど）は `stt.echo_transcripts: false` を設定してください。

プロバイダの挙動:

- `local` は、あなたのマシン上で動く `faster-whisper` を使います。
  `pip install faster-whisper` で別途インストールしてください。無音の
  幻覚に対する強化は既定でオンです。Silero VAD フィルタが無音／雑音を
  Whisper に決して届けないようにし、ウィンドウをまたいだ条件付けは無効に
  され、モデル自身がおそらく発話ではない*かつ*低信頼度だとフラグを立てた
  セグメントは捨てられます。生の挙動で非発話の音声（音楽、環境音）を
  文字起こしするには `stt.local.vad: false` を設定してください。モデルは
  低レイテンシの文字起こしのためにボイスメッセージの間もメモリに読み込まれた
  ままです。アイドル時にモデルを自動的に解放するには `stt.local.unload_after_idle_seconds`
  （例えば5分なら `300`）を設定してください。これは CUDA のホストで GPU
  メモリを解放します（ローカルの LLM が GPU を共有している場合の主な
  メリットです）。CPU 上では、そのメモリはプロセスによって再利用可能に
  なりますが、プロセスが何か他のことのためにその空間を必要とするまで、
  OS に見えるフットプリントは縮まらないかもしれません。次のボイス
  メッセージは、モデルを透過的に再読み込みします。
- `groq` は Groq の Whisper 互換エンドポイントを使い、`GROQ_API_KEY` を
  読みます。自動検出をスキップしてレイテンシを減らすには `stt.groq.language`
  （またはグローバルな `HERMES_LOCAL_STT_LANGUAGE` 環境変数）を渡してください。
- `openai` は OpenAI の speech API を使い、`VOICE_TOOLS_OPENAI_KEY` を読みます。

クラウドのプロバイダ（groq、openai、mistral、xai、elevenlabs、deepinfra）は、
`ffmpeg` がインストールされている場合、既定で**アップロード前の無音の
切り詰め**を得ます。ボイスノート内の長い休止はクライアント側でファイルの
アップロード前に折りたたまれ、自然なペース感が残るよう各休止の
`cloud_trim_keep_ms` は保たれます。音声が短くなることで、アップロードが速く、
音声1分あたりの課金が低く、リモートのモデルによる無音の幻覚も減ります。
12秒未満のクリップはこの切り詰めを完全にスキップします（そこでは節約の意味が
なく、いくつかのプロバイダはどのみちリクエストごとの最低課金があります）。
この切り詰めはベストエフォートです — ffmpeg が見つからない、切り詰めが失敗する、
クリップの大部分が無音である、または切り詰めても約10%未満しか節約できない
場合、元のファイルはそのままアップロードされます。クラウドプロバイダ経由で
音楽や環境音を文字起こしするときなど、常に元のファイルをアップロードするには
`stt.cloud_trim_silence: false` を設定してください。command 型とプラグインの
プロバイダは、切り詰められた音声を決して得ません。

明示的に選ばれた `stt.provider` は厳密に尊重されます — それが利用できない
場合、文字起こしはエラーになり、プロバイダを切り替えるのではなく
`hermes tools` を実行するよう案内します。プロバイダが一度も選ばれていない
場合にだけ、Hermes は次の順序で自動検出します: `local` → `groq` → `openai`。

Groq と OpenAI のモデルの上書きは環境変数で行います。

```bash
STT_GROQ_MODEL=whisper-large-v3-turbo
STT_OPENAI_MODEL=whisper-1
GROQ_BASE_URL=https://api.groq.com/openai/v1
STT_OPENAI_BASE_URL=https://api.openai.com/v1
```

### 文字起こしのプロンプト（語彙のヒント） {#transcription-prompt-vocabulary-hints}

`stt.prompt` は、プロンプトに対応する STT のバックエンドに渡される任意の
静的なヒントです。固有名詞、製品名、Whisper 系のモデルがそうしないと聞き
誤る専門用語に使ってください。

```yaml
stt:
  provider: "local"
  prompt: "Hermes, Teknium, Nous Research, kanban, Ollama"
```

**合成。** 設定の値がベースです。[`pre_transcription`](/hermes/docs/user-guide/features/hooks/#pre_transcription)
の hook を登録するプラグインは、その上に変更を加えます。フィールドごとに
最後の書き手が勝ちます。複数のプラグインのヒントは決定的に合成されます。
プラグインの発見は、プラグイン ID でソートされた順序でプラグインを
読み込み、各プラグインのコールバックはそれ自身の登録順で実行されるので、
同じ組み合わせのプラグインは常に同じ最終的なプロンプトを生成します。
`prompt` に対して空の文字列を返す hook は、そのリクエストの設定のプロンプトを
クリアします。hook は `language` と `model` も上書きできます。`file_path`
は読み取り専用で、それを変更しようとする試みはログに出て捨てられます。
hook が何も登録されておらず、`stt.prompt` も設定されていない場合、
送信されるリクエストは以前のリリースと同一です。

**プロバイダの対応。**

| プロバイダ | プロンプトのパラメータ | 挙動 |
|----------|-----------------|----------|
| `local`（faster-whisper） | `initial_prompt` | 変更されずにローカルモデルへ転送される |
| `openai` | `prompt` | 文字起こしのリクエストで変更されずに転送される |
| `groq` | `prompt` | 文字起こしのリクエストで変更されずに転送される |
| `mistral` | `prompt` | 文字起こしのリクエストで変更されずに転送される |
| `deepinfra` | `prompt` | OpenAI 互換の経路で、変更されずに転送される |
| `xai` | サポートされない | DEBUG レベルでログに出て、プロンプトなしでリクエストが進む |
| `elevenlabs` | サポートされない | DEBUG レベルでログに出て、プロンプトなしでリクエストが進む |
| `local_command` | サポートされない | DEBUG レベルでログに出て、プロンプトなしでリクエストが進む |
| `type: command` の `stt.providers.<name>` | サポートされない | DEBUG レベルでログに出て、プロンプトなしでリクエストが進む |
| プラグインで登録されたプロバイダ | `transcribe(**extra)` の kwargs 内の `prompt` | プロンプトが設定されているときだけ送られるので、このキーより前に作られたプロバイダは呼び出しが変わらない |

**長さ。** Whisper 系のモデルは、最後のおよそ224プロンプトトークンにしか
条件付けされません。Whisper 系のバックエンド（`local`、`openai`、`groq`、
`deepinfra`）については、Hermes はこの上限をクライアント側で強制します —
長すぎる最終的なプロンプトは、警告をログに出しつつ末尾に切り詰められます
— プロンプトの長さが原因でリクエストがエラーになることは決してありません。
他のバックエンド（`mistral`、プラグインのプロバイダ）は、プロンプトを
変更されないまま受け取り、自身の検証を持ちます。どちらにしても、ヒントは
短く具体的に保ってください。

:::warning プロンプトは音声と一緒にアップロードされます
最終的なプロンプトは、音声ファイルと一緒に設定された STT プロバイダに送られます。
特にプロバイダがローカルの `faster-whisper` ではなくホストされた API である
場合は、シークレットやセッション由来のコンテキストを `stt.prompt` や
`pre_transcription` の hook が返すものに入れないでください。
:::

## ボイスモード（CLI） {#voice-mode-cli}

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

CLI でマイクモードを有効にするには `/voice on` を、録音の開始／停止には
`record_key` を、話される返信を切り替えるには `/voice tts` を使ってください。
一気通貫の設定とプラットフォームごとの挙動については
[Voice Mode](/hermes/docs/user-guide/features/voice-mode/) を参照してください。

## ストリーミング {#streaming}

完全な応答を待つのではなく、届いた順にターミナルやメッセージング
プラットフォームにトークンをストリーミングします。

### CLI のストリーミング {#cli-streaming}

```yaml
display:
  streaming: true         # Stream tokens to terminal in real-time
  show_reasoning: true    # Also stream reasoning/thinking tokens (optional)
```

有効にすると、応答はストリーミングのボックス内にトークンごとに表示されます。
ツールの呼び出しはそれでも静かに捕捉されます。プロバイダがストリーミングを
サポートしていない場合、自動的に通常の表示にフォールバックします。

### Gateway のストリーミング（Telegram、Discord、Slack） {#gateway-streaming-telegram-discord-slack}

```yaml
streaming:
  enabled: true           # Enable progressive message editing (default: false)
  transport: auto         # "auto" (default) | "edit" (progressive message editing) | "off"
  edit_interval: 0.8      # Seconds between message edits (default: 0.8)
  buffer_threshold: 24    # Characters before forcing an edit flush (default: 24)
  cursor: " ▉"            # Cursor shown during streaming
  fresh_final_after_seconds: 0    # Opt in to fresh final (Telegram) when preview is this old
```

有効にすると、ボットは最初のトークンでメッセージを送り、その後、より多くの
トークンが届くにつれて段階的にそれを編集します。メッセージの編集をサポート
していないプラットフォーム（Signal、Email、Home Assistant）は、最初の試行時に
自動検出されます — そのセッションではストリーミングが優雅に無効になり、
メッセージが溢れることはありません。

段階的なトークンの編集なしで、別建ての自然な途中のアシスタントの更新を
得るには、`display.interim_assistant_messages: true` を設定してください。

**オーバーフローの処理:** ストリーミングされたテキストがプラットフォームの
メッセージ長の上限（約4096文字）を超えた場合、現在のメッセージは確定され、
新しいメッセージが自動的に始まります。

**新しい最終メッセージ（Telegram）:** Telegram の `editMessageText` は元の
メッセージのタイムスタンプを保持するので、長く続くストリーミングされた返信は、
完了してもなお最初のトークンのタイムスタンプを保ち続けます。古いプレビューを、
プレビューの削除をベストエフォートで行いつつ、まったく新しい最終メッセージ
として配信することにオプトインするには、`fresh_final_after_seconds > 0`
を設定してください。既定は `0` で、これは常にストリーミングされた返信を
その場で確定し、両方の操作を表示するクライアントでの一時的な重複メッセージ／
削除の連続を避けます。

:::note プラットフォームごとのストリーミングの既定値
マスターの `streaming.enabled` の切り替えは既定で `false` です — あなたが
それを切り替えるまで何もストリーミングしません。有効にすると、ストリーミングは
**プラットフォームごとに**決まります。Telegram は
`display.platforms.telegram.streaming: true`（ストリーミングする）で出荷され、
Discord は `display.platforms.discord.streaming: false`（しない）で出荷
されます。そのため、ストリーミングを有効にした後、Telegram は最初から
ストリーミングし、Discord はそのトグルを変更するまで全体メッセージの返信の
ままです。これらのプラットフォームごとの切り替えは、ダッシュボードの
**Channels** のトグルから、または `~/.hermes/config.yaml` を直接編集して
調整できます。
:::

## グループチャットのセッション分離 {#group-chat-session-isolation}

CLI、TUI/ダッシュボード、メッセージング gateway をまたいで、アクティブに開ける
チャットセッションの数を制限します。

```yaml
max_concurrent_sessions: null  # null/0 = unlimited; positive integer = active session cap
```

チャットのウィンドウが開かれたときではなく、セッションが**最初のターン**を
実行するときにスロットが消費されます。チャットを開く、再開する、再接続する
ことには、メッセージを送るまで何のコストもかからないので、アイドル状態の
デスクトップのタブ（と、不安定な websocket が引き起こすバックグラウンドの
再開）は、このキャップを共有するメッセージング gateway を飢えさせることは
できません。

上限に達すると、Hermes はどの面がスロットを保持しているかを名指しした直接的な
上限のメッセージを返します。既存のアクティブなセッションは、通常の挙動を
保ちます。現在のスロットの使用状況とすべての保持者を見るには
`hermes status` を実行してください。

正規のキーはトップレベルの `max_concurrent_sessions` です。Hermes は
フォールバックとして `gateway.max_concurrent_sessions` も受け付けますが、
両方が設定されている場合はトップレベルのキーが優先されます。

この上限は、ローカルのランタイムのリースファイルで強制され、ベストエフォートです。
Hermes は、レジストリを読み込めない、またはロックできない場合、ユーザーが
取り残されないよう fail open します。これは、複数のマシンにマウントされた
共有の `$HERMES_HOME` ではなく、単一のホスト／プロファイルのランタイムを
対象としています。所有プロセスは存在するが生存を証明できないリース（例えば
`hermes update` がバックエンドを再起動した後の、コンテナ内の読み取れない
`/proc` のエントリ）は、それでも上限に対して数えられ、自身のセッション ID を
フェンスしますが、別のセッションの確保や解放をブロックすることはなくなります。

共有チャットが、ルームごとに1つの会話を保つか、参加者ごとに1つの会話を
保つかを制御します。

```yaml
group_sessions_per_user: true  # true = per-user isolation in groups/channels, false = one shared session per chat
```

- `true` が既定で推奨される設定です。Discord のチャンネル、Telegram の
  グループ、Slack のチャンネル、その他似た共有の場では、プラットフォームが
  ユーザー ID を提供する場合、各送信者は自分自身のセッションを得ます。
- `false` は、以前の共有ルームの挙動に戻します。あるチャンネルを1つの
  共同作業の会話として Hermes に扱わせたいと明示的に思う場合に便利ですが、
  それはユーザーがコンテキスト、トークンのコスト、中断の状態を共有することも
  意味します。
- ダイレクトメッセージは影響を受けません。Hermes は、これまでと同様に
  DM をチャット／DM の ID でキー付けし続けます。
- スレッドは、どちらの場合でも親のチャンネルから分離されたままです。
  `true` の場合、各参加者はスレッド内でも自身のセッションを得ます。

挙動の詳細と例については、[Sessions](/hermes/docs/user-guide/sessions/) と
[Discord guide](/hermes/docs/user-guide/messaging/discord/) を参照してください。

## 未承認 DM の挙動 {#unauthorized-dm-behavior}

未知のユーザーがダイレクトメッセージを送ったときに Hermes が何をするかを
制御します。

```yaml
unauthorized_dm_behavior: pair

whatsapp:
  unauthorized_dm_behavior: ignore
```

- `pair` は、チャット形式の DM プラットフォームの既定値です。Hermes はアクセスを
  拒否しますが、DM で1回だけ使えるペアリングコードを返信します。
- `ignore` は、未承認の DM を黙って捨てます。
- `decline` は、ペアリングコードの代わりに1回だけ短く丁寧な拒否を送り、
  その後24時間、その送信者に対して静かなままになります。既定のテキストを
  上書きするには:

  ```yaml
  unauthorized_dm_behavior: decline
  unauthorized_dm_decline_message: "Sorry, this assistant is private."
  ```

  `hermes gateway setup` は、allowlist を空のままにしたとき、これを
  「Politely decline unknown senders」として提案します。これは
  `platforms.<platform>.unauthorized_dm_behavior: decline` を書き込みます。

- Email は、`platforms.email.unauthorized_dm_behavior: pair` が設定されて
  いない限り既定で `ignore` になります。受信箱には関係のない未読メールが
  含まれることがあるためです。
- プラットフォームのセクションはグローバルな既定値を上書きするので、
  広くペアリングを有効にしたままで、1つのプラットフォームだけを静かにする
  ことができます。

## クイックコマンド {#quick-commands}

LLM を呼び出さずにシェルコマンドを実行するか、あるスラッシュコマンドを別の
ものにエイリアスする、カスタムコマンドを定義します。exec 型のクイック
コマンドはトークンを消費せず、簡単なサーバーの確認やユーティリティ
スクリプトのために、メッセージングプラットフォーム（Telegram、Discord など）
から使うと便利です。

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

使い方: CLI や任意のメッセージングプラットフォームで `/status`、`/disk`、
`/update`、`/gpu`、`/restart` と入力します。`exec` コマンドはホスト上で
ローカルに実行され、出力を直接返します — LLM の呼び出しはなく、トークンも
消費しません。`alias` コマンドは、設定されたスラッシュコマンドのターゲットに
書き換えます。

- **30秒のタイムアウト** — 長時間実行されるコマンドはエラーメッセージ付きで
  kill されます
- **優先順位** — クイックコマンドはスキルコマンドより先にチェックされるので、
  スキル名を上書きできます
- **自動補完** — クイックコマンドはディスパッチ時に解決され、組み込みの
  スラッシュコマンドの自動補完のテーブルには表示されません
- **型** — サポートされる型は `exec` と `alias` です。他の型はエラーを
  表示します
- **どこでも動作します** — CLI、Telegram、Discord、Slack、WhatsApp、Signal、
  Email、Home Assistant

文字列だけのプロンプトのショートカットは、有効なクイックコマンドではありません。
再利用可能なプロンプトのワークフローには、スキルを作るか、既存のスラッシュ
コマンドへのエイリアスを作ってください。

## 人間らしい遅延 {#human-delay}

メッセージングプラットフォームで、人間らしい応答のペース感をシミュレートします。

```yaml
human_delay:
  mode: "off"                  # off | natural | custom
  min_ms: 800                  # Minimum delay (custom mode)
  max_ms: 2500                 # Maximum delay (custom mode)
```

各プロファイル自身の `config.yaml` が読まれるので、多重化されたプロファイルは
独立したペース感を保ちます。プロセスの環境変数による上書きはありません。
`custom` モードでは、整数でない、負の、または逆転した `min_ms`/`max_ms` の
組は、そのキーを名指しした警告付きで拒否され、代わりに `natural` の範囲
（800〜2500ms）が使われます。

## コード実行 {#code-execution}

`execute_code` ツールを設定します。

```yaml
code_execution:
  mode: project                # project (default) | strict
  timeout: 300                 # Max execution time in seconds
  max_tool_calls: 50           # Max tool calls within code execution
```

**`mode`** は、スクリプトの作業ディレクトリと Python のインタープリタを
制御します。

- **`project`**（既定） — スクリプトはセッションの作業ディレクトリで、
  アクティブな virtualenv/conda 環境の python を使って実行されます。
  プロジェクトの依存関係（`pandas`、`torch`、プロジェクトのパッケージ）と
  相対パス（`.env`、`./data.csv`）は自然に解決され、`terminal()` が見るものと
  一致します。
- **`strict`** — スクリプトは一時的なステージングディレクトリで、
  `sys.executable`（Hermes 自身の python）を使って実行されます。最大限の
  再現性がありますが、プロジェクトの依存関係と相対パスは解決されません。

環境の除去（`*_API_KEY`、`*_TOKEN`、`*_SECRET`、`*_PASSWORD`、
`*_CREDENTIAL`、`*_PASSWD`、`*_AUTH` を取り除きます）とツールのホワイト
リストは、どちらのモードでも同じように適用されます — モードを切り替えても
セキュリティの姿勢は変わりません。

## Web 検索のバックエンド {#web-search-backends}

`web_search` と `web_extract` のツールは5種類のバックエンドプロバイダを
サポートします。`config.yaml` または `hermes tools` でバックエンドを
設定してください。

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

| バックエンド | 環境変数 | 検索 | 抜き出し |
|---------|---------|--------|---------|
| **Firecrawl**（既定） | `FIRECRAWL_API_KEY` | ✔ | ✔ |
| **SearXNG** | `SEARXNG_URL` | ✔ | — |
| **Parallel** | `PARALLEL_API_KEY`（任意 — キーなしの無料ティア） | ✔ | ✔ |
| **Tavily** | `TAVILY_API_KEY`（任意 — 選ばれるとキーなしになる） | ✔ | ✔ |
| **Perplexity** | `PERPLEXITY_API_KEY` | ✔ | ✔（クエリに関連するスニペット） |
| **Exa** | `EXA_API_KEY`（任意 — キーなしの無料ティア） | ✔ | ✔ |

**バックエンドの選択:** ランタイムは常に保存済みの `web.backend` の選択
（`hermes tools` で設定します。`nous` は管理された Tool Gateway を経由します）
を使います。web のバックエンドが一度も選ばれていない場合にだけ、利用可能な
API キーから自動検出されます。`SEARXNG_URL` だけが設定されていれば
SearXNG が、`EXA_API_KEY` だけなら Exa が、`TAVILY_API_KEY` だけなら
Tavily が、`PERPLEXITY_API_KEY` だけなら Perplexity が、`PARALLEL_API_KEY`
だけなら Parallel が、`KEENABLE_API_KEY` だけなら Keenable が使われます。
**選択も資格情報も全くない**場合、リクエストはキーなしの無料ティアの
リング（Exa / Parallel / Firecrawl / Keenable）をラウンドロビンで回り、
レート制限に対して自動的に次の順番へフェイルオーバーします — 詳細は
[Web Search guide](/hermes/docs/user-guide/features/web-search/) を
参照してください。選択が一度なされると、`.env` にキーを追加してもルートは
変わりません。`hermes tools` で Tavily、Firecrawl、Keenable を選ぶことは、
キーがなくても機能します。

**SearXNG** は、70以上の検索エンジンに問い合わせる、無料でセルフホストの、
プライバシーを尊重するメタ検索エンジンです。API キーは不要です — あなたの
インスタンス（例えば `http://localhost:8080`）に `SEARXNG_URL` を設定する
だけです。SearXNG は検索専用です。`web_extract` には別の抜き出し用の
プロバイダが必要です（`web.extract_backend` を設定してください）。Docker
のセットアップ手順は [Web Search setup guide](/hermes/docs/user-guide/features/web-search/)
を参照してください。

**セルフホストの Firecrawl:** あなた自身のインスタンスを指すよう
`FIRECRAWL_API_URL` を設定してください。カスタムの URL が設定されている場合、
API キーは任意になります（サーバー上で認証を無効にするには
`USE_DB_AUTHENTICATION=*** を設定してください）。

**Parallel の検索モード:** 検索の挙動を制御するには `PARALLEL_SEARCH_MODE`
を設定してください — `fast`、`one-shot`、または `agentic`（既定:
`agentic`）です。

**Exa:** `~/.hermes/.env` に `EXA_API_KEY` を設定してください。`category`
によるフィルタリング（`company`、`research paper`、`news`、`people`、
`personal site`、`pdf`）とドメイン／日付のフィルタをサポートします。

## ブラウザ {#browser}

ブラウザの自動化の挙動を設定します。

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

- `must_respond`（既定） — ダイアログを捕捉し、`browser_snapshot.pending_dialogs`
  に表面化し、エージェントが `browser_dialog(action=...)` を呼ぶまで待ちます。
  `dialog_timeout_s` 秒応答がないと、ページの JS スレッドが永久に停止するのを
  防ぐため、そのダイアログは自動的に閉じられます。
- `auto_dismiss` — 捕捉し、即座に閉じます。エージェントは、事後的に
  `closed_by="auto_policy"` を伴うダイアログの記録を
  `browser_snapshot.recent_dialogs` で見ることができます。
- `auto_accept` — 捕捉し、即座に受け入れます。積極的な `beforeunload`
  プロンプトを持つページに便利です。

ダイアログの全ワークフローについては [browser feature page](/hermes/docs/user-guide/features/browser/#browser_dialog)
を参照してください。

ブラウザのツールセットは複数のプロバイダをサポートします。Browserbase、
Browser Use、ローカルの Chromium 系の CDP のセットアップの詳細については
[Browser feature page](/hermes/docs/user-guide/features/browser/) を参照して
ください。

## タイムゾーン {#timezone}

IANA のタイムゾーン文字列で、サーバーローカルのタイムゾーンを上書きします。
ログのタイムスタンプ、cron のスケジューリング、システムプロンプトへの時刻の
注入に影響します。

```yaml
timezone: "America/New_York"   # IANA timezone (default: "" = server-local time)
```

サポートされる値: 任意の IANA タイムゾーンの識別子（例えば
`America/New_York`、`Europe/London`、`Asia/Kolkata`、`UTC`）。サーバー
ローカルの時刻を使うには空のままか省略してください。

`hermes doctor`（と起動時の設定チェック）は、ランタイムが読み込めない値を
報告します — `Asia/Tokio` のような typo は、そうしないとエージェントの
クロックとすべての cron スケジュールを黙ってサーバーローカルの時刻にして
しまいます。設定されている場合、`HERMES_TIMEZONE` はこのキーを上書きします。

エージェントのクロック、cron のスケジュール、時刻を意識するツールは、どの
OS でもこのゾーンに従います。`execute_code` を通じて実行されるコードも、
Linux と macOS ではこれを `TZ` として継承します。Windows では、それらの
子プロセスは代わりに OS で設定されたゾーンを保ちます（Windows の C
ランタイムは POSIX 形式の `TZ` 文字列しか解析せず、そこに IANA の名前を
置くと間違った UTC のオフセットが生じます）。そのため、子スクリプトが
このゾーンでローカルの時刻をレンダリングする必要がある場合は、Windows の
ゾーン自体を設定してください。

## Discord {#discord}

メッセージング gateway 向けの Discord 固有の挙動を設定します。

```yaml
discord:
  require_mention: true          # Require @mention to respond in server channels
  free_response_channels: ""     # Comma-separated channel IDs where bot responds without @mention
  auto_thread: true              # Auto-create threads on @mention in channels
  free_response_auto_thread: false  # Free-response channels also auto-thread (default: reply inline)
```

- `require_mention` — `true`（既定）のとき、ボットはサーバーのチャンネルでは
  `@BotName` でメンションされたときにだけ応答します。DM は常にメンションなしで
  機能します。
- `free_response_channels` — ボットがメンションを要求せずにすべての
  メッセージに応答するチャンネル ID のカンマ区切りのリストです。
- `auto_thread` — `true`（既定）のとき、チャンネル内のメンションは自動的に
  その会話のスレッドを作成し、チャンネルをきれいに保ちます（Slack のスレッド
  化と似ています）。
- `free_response_auto_thread` — `true` のとき、`free_response_channels` の
  チャンネルも、トップレベルのメッセージごとに自動でスレッドを作成します。
  既定は `false` です。free-response のチャンネルはインラインで返信します。
  `auto_thread: true` が必要です。

## セキュリティ {#security}

実行前のセキュリティスキャンとシークレットの匿名化:

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

- `redact_secrets` — `true` のとき、API キー、トークン、パスワードのように
  見えるパターンを、それが会話のコンテキストとログに入る前に自動的に検出し
  匿名化します。**既定でオンです。** デバッグやリダクタの開発のために生の
  資格情報らしき文字列が必要な場合にだけ、明示的に `false` に設定してください。
  シークレットを含むファイル（`.env` 形式のファイル、シェルの rc/profile
  ファイル、`HERMES_HOME` 下の Hermes の `config.yaml` とその
  `backups/config/` のコピー）を `read_file`、`search_files`、またはターミナルの
  `cat`/`grep` で読むことも、値がどう見えるかに関わらず、資格情報らしき
  代入（`SOME_API_TOKEN: …`）を再利用不可能な `«redacted-secret»` の
  マーカーで隠します。通常のソースやプロジェクトの設定ファイルは、ベンダーの
  プレフィックスのパターンだけを保つので、`MAX_TOKENS: 100` のような
  フィクスチャは決して壊されません。
- `tirith_enabled` — `true` のとき、ターミナルコマンドは実行前に
  [Tirith](https://github.com/sheeki03/tirith) でスキャンされ、潜在的に
  危険な操作を検出します。
- `tirith_path` — tirith バイナリへのパスです。tirith が標準的でない場所に
  インストールされている場合に設定してください。
- `tirith_timeout` — tirith のスキャンを待つ最大秒数です。スキャンが
  タイムアウトすると、コマンドはそのまま進みます。
- `tirith_fail_open` — `true`（既定）のとき、tirith が利用できない、または
  失敗した場合でもコマンドの実行は許可されます。tirith がコマンドを検証
  できないときにブロックするには `false` に設定してください。

## Website Blocklist {#website-blocklist}

エージェントの web とブラウザのツールが特定のドメインにアクセスすることを
ブロックします。

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

有効にすると、ブロックされたドメインのパターンに一致する URL は、web や
ブラウザのツールが実行される前に拒否されます。これは `web_search`、
`web_extract`、`browser_navigate`、そして URL にアクセスするあらゆる
ツールに適用されます。

ドメインのルールがサポートするもの:
- 完全一致のドメイン: `admin.example.com`
- ワイルドカードのサブドメイン: `*.internal.company.com`（すべての
  サブドメインをブロック）
- TLD のワイルドカード: `*.local`

Shared files には、1行に1つのドメインルールを書きます（空行と `#` の
コメントは無視されます）。見つからない、または読み込めないファイルは
警告をログに出しますが、他の web ツールを無効化しません。

このポリシーは30秒間キャッシュされるので、設定の変更は再起動なしで速やかに
反映されます。

## スマート承認 {#smart-approvals}

Hermes が潜在的に危険なコマンドをどう扱うかを制御します。

```yaml
approvals:
  mode: smart   # smart | manual | off
```

| モード | 挙動 |
|------|----------|
| `smart`（既定） | 補助 LLM を使って、フラグの立ったコマンドが実際に危険かどうかを評価します。低リスクのコマンドは、そのコマンドだけについて自動承認されます。本当に危険なコマンドは拒否されます。不確かな判断はユーザーにエスカレーションされます。 |
| `manual` | フラグの立ったコマンドを実行する前にユーザーに確認します。CLI では対話的な承認のダイアログを表示します。メッセージングでは、保留中の承認リクエストをキューに入れます。 |
| `off` | すべての承認チェックをスキップします。`HERMES_YOLO_MODE=true` と同等です。**注意して使ってください。** |

スマートモードは、承認疲れを減らすのに特に役立ちます — 安全な操作については
エージェントをより自律的に動かしつつ、本当に破壊的なコマンドはそれでも
捉えます。

:::warning
`approvals.mode: off` を設定すると、ターミナルコマンドに対するすべての安全性
チェックが無効になります。信頼できるサンドボックス化された環境でだけ
使ってください。
:::

### 拒否のサーキットブレーカー {#denial-circuit-breaker}

`approvals.denial_breaker_threshold`(既定 `3`)は、スマート承認のレビュアーが
拒否し続けているコマンドの変種を、エージェントが再試行し続けることを防ぎます
— 再試行のたびに、もう1回のガーディアン LLM の呼び出しを消費します。1つの
セッションでこの回数だけ連続して拒否された後、拒否のメッセージはハード
ストップの指示にエスカレーションし、エージェントに停止し、ブロックされた
操作を報告し、あなたに手動で実行するか `/approve` するよう求めさせます。
どれかが承認されると回数はリセットされます。無効にするには `0` を設定して
ください。

```yaml
approvals:
  denial_breaker_threshold: 3   # 0 disables the breaker
```

### 拒否ルール {#deny-rules}

`approvals.deny` は、一致するターミナルコマンドを無条件にブロックする
(`--yolo`、`/yolo`、`mode: off` の下でも)glob パターンのリストです。
組み込みのハードラインの blocklist に対応する、ユーザーが編集できるものです。

```yaml
approvals:
  deny:
    - "git push --force*"
    - "*curl*|*sh*"
```

パターンは大文字小文字を区別しない fnmatch の glob で、YAML 内では引用符で
囲む必要があります(先頭が裸の `*` だと解析エラーになります)。詳細は
[Security — User-Defined Deny Rules](/hermes/docs/user-guide/security/#user-defined-deny-rules-approvalsdeny)
を参照してください。

### カスタムのスマート承認ポリシー {#custom-smart-approval-policy}

`approvals.smart_policy` を使うと、スマート承認のレビュアーの指示に自分自身の
ルールを追加できます。設定すると、そのテキストはガーディアン LLM の
システムプロンプトに追加されます(信頼済みのチャンネルです — 信頼されない
コマンドのテキストと一緒には決して置かれません)。そのため、コードを編集せずに
あなたの環境に合わせて判断を厳しく、または緩くできます。

```yaml
approvals:
  smart_policy: |
    Always ESCALATE commands that modify anything under /etc.
    APPROVE docker compose restarts in ~/deploys — they are routine here.
```

## チェックポイント {#checkpoints}

破壊的なファイル操作の前の自動的なファイルシステムのスナップショットです。
詳細は [Checkpoints & Rollback](/hermes/docs/user-guide/checkpoints-and-rollback/)
を参照してください。

```yaml
checkpoints:
  enabled: false                 # Enable automatic checkpoints (also: hermes chat --checkpoints). Default: false (opt-in).
  max_snapshots: 20              # Max checkpoints to keep per directory (default: 20)
```

## 委任 {#delegation}

delegate ツールのサブエージェントの挙動を設定します。

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

**サブエージェントの provider:model の上書き:** 既定では、サブエージェントは
親エージェントのプロバイダとモデルを継承します。`delegation.provider` と
`delegation.model` を設定すると、サブエージェントを別の provider:model の
組にルーティングできます — 例えば、あなたのプライマリのエージェントが高価な
推論モデルを動かしている間、狭く絞られたサブタスクには安くて速いモデルを
使う、といった使い方です。

**サブエージェントのフォールバックチェーン:** `delegation.fallback_providers`
を設定すると、ワーカーに独自のチェーン(トップレベルのリストと同じエントリの
形)を与えられます。明示的に固定された子(プロバイダ、エンドポイント、
モデルによって)は、それが宣言されている場合にだけそのチェーンを使います
— そうでなければ、親エージェントのルートを借りるのではなく、大きな声で
失敗します。固定されていない子については、設定がない、または `null` の
場合、親のチェーンの継承が保たれます。子のフォールバックを完全に無効にするには
`delegation:` の下で `fallback_providers: []` を使ってください。

**直接エンドポイントの上書き:** 明確なカスタムエンドポイントの経路が欲しい
場合は、`delegation.base_url`、`delegation.api_key`、`delegation.model` を
設定してください。これは、サブエージェントをその OpenAI 互換のエンドポイントに
直接送り、`delegation.provider` より優先されます。`delegation.api_key` が
省略されている場合、Hermes は `OPENAI_API_KEY` にだけフォールバックします。
`delegation.provider` が `delegation.base_url` と一緒に設定されている場合、
明示的なエンドポイントとキーはそれでも優先されますが、そのプロバイダの
リクエストの設定(`custom_providers` のエントリからの `extra_body` の
上書きと最大出力トークン)はサブエージェントに引き継がれます。

**子ごとのリクエスト設定(`request_overrides`):** `delegation.request_overrides`
は、すべてのサブエージェントの API 呼び出しに送られるリクエスト設定の
dict です。トップレベルのキーは API の kwargs です(例えば
`service_tier`)。`extra_body` のサブ dict は、そのリクエストの `extra_body`
にマージされます。これは**3つすべての**解決の分岐 — 直接の `base_url`、
名前付きの `provider`、そして純粋な継承 — で尊重されるので、このキーは常に
効果を発揮します。優先順位: 明示的な `request_overrides` の値は、ランタイムや
親から導かれた上書きの**上に**マージされます — トップレベルの明示的なキーが
優先され、`extra_body` は1段だけ深くマージされるので、あなたのキーがそれを
再定義しない限り、ランタイムの `extra_body` のキー(例えばあるプロバイダの
`thinking: {type: disabled}` という個性)は残ります。正準的な使い方は、
委任の子に対する OpenRouter のルーティングのヒントです。

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
**通信プロトコル(`api_mode`):** Hermes は、`delegation.base_url` から通信
プロトコルを自動検出します(例えば `/anthropic` で終わるパスは
`anthropic_messages` になります。Codex/ネイティブ Anthropic/Kimi-coding の
ホスト名は既存の検出をそのまま保ちます)。ヒューリスティックが分類できない
エンドポイント — 例えば Azure AI Foundry、MiniMax、Zhipu GLM、または
Anthropic 形式のバックエンドの前段にある LiteLLM のプロキシ — については、
`delegation.api_mode` を `chat_completions`、`codex_responses`、
`anthropic_messages` のどれかに明示的に設定してください。空のまま
(既定)にすると自動検出が保たれます。

委任のプロバイダは、CLI/gateway の起動と同じ資格情報の解決を使います。
設定済みのすべてのプロバイダがサポートされています: `openrouter`、`nous`、
`copilot`、`zai`、`kimi-coding`、`minimax`、`minimax-cn`。プロバイダが
設定されると、システムは正しい base URL、API キー、API モードを自動的に
解決します — 手動での資格情報の配線は不要です。

**優先順位:** 設定内の `delegation.base_url` → 設定内の `delegation.provider`
→ 親のプロバイダ(継承)。設定内の `delegation.model` → 親のモデル(継承)。
`provider` なしで `model` だけを設定すると、親の資格情報を保ったままモデル名
だけが変わります(OpenRouter のような同じプロバイダの中でモデルを切り替える
のに便利です)。

**ワンショットの実行:** 有限の `hermes chat -q` / `--oneshot` のセッションには、
委任された結果を消費する後のターンも、そこから学習する後のセッションもない
ので、より小さなフットプリントで動作します。`skill_manage` は提供されません
(スキルはそれでも一覧表示され `skill_view` で読み込めます)。スキルの
プロンプトは、プロセスのスキルではなくドメインのスキルだけを求め、
`oneshot_max_children` は、その実行が生成できるサブエージェントの合計数を
制限します(既定 `2`、`0` = 無制限)。上限を超えると `delegate_task` は、
エージェントにインラインで完了するよう伝えるツールエラーを返します。

**幅と深さ:** `max_concurrent_children` は、バッチごとに並列で動くサブ
エージェントの数を制限します(既定 `3`、下限は1、上限なし)。
`DELEGATION_MAX_CONCURRENT_CHILDREN` 環境変数でも設定できます。モデルが
この上限より長い `tasks` の配列を送ると、`delegate_task` は黙って切り詰める
のではなく、その制限を説明するツールエラーを返します。`max_spawn_depth` は
委任のツリーの深さを制御します(1〜3にクランプされます)。既定の `1` では、
委任は平坦です。子は孫を生成できず、`role="orchestrator"` を渡しても黙って
`leaf` に格下げされます。オーケストレーターの子が leaf の孫を生成できるように
するには `2` に上げてください。3段のツリーには `3` を使います。エージェントは、
呼び出しごとに `role="orchestrator"` でオーケストレーションにオプトインします。
`orchestrator_enabled: false` は、これに関わらずすべての子を leaf に強制的に
戻します。コストは乗算的にスケールします — `max_spawn_depth: 3` と
`max_concurrent_children: 3` では、ツリーは3×3×3 = 27の並列な leaf エージェント
に達することがあります。使い方のパターンについては
[Subagent Delegation → Depth Limit and Nested Orchestration](/hermes/docs/user-guide/features/delegation/#depth-limit-and-nested-orchestration)
を参照してください。

**子プロセスの通知:** サブエージェントが起動したバックグラウンドプロセスは、
完了/監視の通知を親の会話にルーティングしますが、既定ではそこで
**抑制されます** — 子の統合された結果が成果物だからです。それらを届けるには
(サブエージェントの帰属付きで)`delegation.surface_child_process_notifications:
true` を設定してください。委任の結果自体は決して抑制されません。
[Subagent Delegation → Child background-process notifications](/hermes/docs/user-guide/features/delegation/#child-background-process-notifications)
を参照してください。

## 確認(Clarify) {#clarify}

Hermes が確認の質問への応答をどれだけ待つかを設定します。1つの値がすべての
面をカバーします — 従来の CLI のモーダル、TUI/Desktop のカード、
メッセージング gateway です。正規のキーは `agent.clarify_timeout`(既定
`3600`秒。`0` 以下 = 無制限)です。レガシーなトップレベルの
`clarify.timeout` も、明示的に設定されている場合はそれでも尊重されます。

```yaml
agent:
  clarify_timeout: 3600        # Seconds to wait for user clarification response (0 or less = unlimited)
```

タイムアウトが切れると、エージェントは「ユーザーが応答しなかった」という
番兵付きでブロックを解除し、自分自身で続行します。確認のプロンプトは、
汎用のツールごとの期限(`timeouts.tools.sequential_call`)で切られることは
決してありません。待機を制限するのは `agent.clarify_timeout` だけです。

## コンテキストファイル(SOUL.md、AGENTS.md) {#context-files-soulmd-agentsmd}

Hermes は2つの異なるコンテキストの範囲を使います。

| ファイル | 目的 | 範囲 |
|------|---------|-------|
| `SOUL.md` | **プライマリなエージェントの identity** — エージェントが何者かを定義する(システムプロンプトのスロット#1) | `~/.hermes/SOUL.md` または `$HERMES_HOME/SOUL.md` |
| `.hermes.md` / `HERMES.md` | プロジェクト固有の指示(最優先) | git のルートまで遡って探す |
| `AGENTS.md` | プロジェクト固有の指示、コーディングの慣習 | 再帰的なディレクトリの探索 |
| `CLAUDE.md` | Claude Code のコンテキストファイル(これも検出される) | 作業ディレクトリのみ |
| `.cursorrules` | Cursor IDE のルール(これも検出される) | 作業ディレクトリのみ |
| `.cursor/rules/*.mdc` | Cursor のルールファイル(これも検出される) | 作業ディレクトリのみ |

- **SOUL.md** は、エージェントのプライマリな identity です。システム
  プロンプトのスロット#1を占め、組み込みの既定の identity を完全に
  置き換えます。エージェントが何者かを完全にカスタマイズするには、これを
  編集してください。
- SOUL.md が見つからない、空である、または読み込めない場合、Hermes は
  組み込みの既定の identity にフォールバックします。
- **プロジェクトのコンテキストファイルは優先順位の仕組みを使います** —
  1種類だけが読み込まれます(最初に一致したものが優先されます):
  `.hermes.md` → `AGENTS.md` → `CLAUDE.md` → `.cursorrules`。SOUL.md は
  常に独立して読み込まれます。
- **AGENTS.md** は階層的です。サブディレクトリにも AGENTS.md がある場合、
  すべてが組み合わされます。
- Hermes は、まだ存在しない場合に既定の `SOUL.md` を自動的に作ります。
- 読み込まれたすべてのコンテキストファイルは、賢い切り詰めと共に
  `context_file_max_chars` 文字(既定20,000)に制限されます。

以下も参照してください:
- [Personality & SOUL.md](/hermes/docs/user-guide/features/personality/)
- [Context Files](/hermes/docs/user-guide/features/context-files/)

## 作業ディレクトリ {#working-directory}

| コンテキスト | 既定値 |
|---------|---------|
| **CLI(`hermes`)** | コマンドを実行する現在のディレクトリ |
| **メッセージング gateway** | `~/.hermes/config.yaml` の `terminal.cwd`。未設定ならホームディレクトリ `~` |
| **Docker / Singularity / Modal / SSH** | コンテナまたはリモートマシン内のユーザーのホームディレクトリ |

作業ディレクトリを上書きする:
```yaml
# In ~/.hermes/config.yaml:
terminal:
  cwd: /home/myuser/projects
```

`~/.hermes/.env` の中の `MESSAGING_CWD` と直接の `TERMINAL_CWD` のエントリは、
レガシーな互換性のためのフォールバックです。新しい設定では `terminal.cwd`
を使うべきです。

## ネットワーク {#network}

送信 HTTP のための接続性の回避策:

```yaml
network:
  force_ipv4: false   # Force IPv4 for outbound connections (default: false)
```

`force_ipv4` — IPv6 が壊れている、または到達できないサーバーでは、Python は
最初に AAAA レコードを解決し、IPv4 にフォールバックする前に TCP タイムアウトの
全期間ハングすることがあります。Hermes は、送信する接続ごとに、すでに
IPv6 と IPv4 を競走させています(Happy Eyeballs、RFC 8305: IPv4 の試行は
IPv6 の250ms後に始まり、先に接続できた方が勝ちます)。そのため、公告されて
いるがブラックホール化している IPv6 のルートは、完全なタイムアウトの代わりに
接続ごとにおよそ4分の1秒のコストで済みます。これは gateway の WebSocket の
ダイヤル(リレーのコネクタ、プラットフォームのアダプター)にも、HTTP にも
及びます。これを `true` に設定するのは、IPv6 を完全にスキップして直接 IPv4
で接続したい場合にだけにしてください。`hermes doctor` は `IPv6 route` の
チェックを実行し、死んだ IPv6 のパスを検出してこの設定を指し示します。

## オンボーディング {#onboarding}

初回接触のオンボーディングのヒントと、構造化されたプロファイル構築の提案です。

```yaml
onboarding:
  profile_build: "ask"   # "ask" (default) | "off"
  seen: {}               # internal latch — leave empty
```

- `profile_build` — 記念すべき最初の gateway のメッセージで提案される
  プロファイル構築の経路を制御します。`"ask"`(既定)はユーザープロファイルの
  構築を提案します。この提案は**オプトインで同意を必要とします** —
  エージェントは、いかなる検索の前にも尋ね、接続されたアカウントを黙って
  読むことは決してありません。`"off"` は素の導入だけを表示します。この提案は
  最大で1回だけ発火します。
- `seen` — 内部の状態です。Hermes は、それぞれ表示したヒントをここに記録
  するので、二度と発火しません。プロファイル構築の提案も、表示されると
  ここに記録されます。手で編集しないでください — すべてのヒントを再表示
  したい場合は、`onboarding` セクション全体を消してください。

## ダッシュボード {#dashboard}

[web dashboard](/hermes/docs/user-guide/features/web-dashboard/) の設定です
— 見た目のテーマ、公開 URL、認証のプロバイダです。認証のプロバイダ
(OAuth、basic パスワード、drain)は web-dashboard のページで詳しく文書化
されています。これはその `config.yaml` の形です。

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
- `show_token_analytics` — 既定でオフです。Analytics のページとトークン/
  コストの数字は**ローカルの下限の推定値**です(補助の呼び出し、再試行、
  フォールバック、キャッシュへの書き込みを除外します)。そのため、
  プロバイダの請求額よりはるかに低く見えることがあります。それが課金額では
  ないと理解している場合にだけ `true` に設定してください。
- `public_url` — 設定すると、これは OAuth の `redirect_uri` が組み立てられる
  完全な authority(scheme + host + 任意のパスの prefix)になります。
  `X-Forwarded-*` ヘッダーを確実に転送しないリバースプロキシの背後への
  デプロイでは設定してください。プロキシのヘッダーからの再構築を使う場合は
  空のままにしてください。
- `trusted_proxies` — `X-Forwarded-Proto` と `X-Forwarded-For` を供給できる
  IP アドレス、または境界のある CIDR ネットワークです。loopback は自動的に
  信頼され続けます。TLS のリバースプロキシが別のコンテナやホストから接続する
  場合はこれを設定してください。プロキシの正確な IP を優先し、そのアドレスが
  動的な場合にだけ、小さな専用のネットワークを使ってください。ワイルドカード
  と `/0` のネットワークは拒否されます。
- `oauth` / `basic_auth` / `drain_auth` — 同梱の dashboard-auth プラグインが
  読む認証プロバイダの設定です。drain のシークレット自体はここでは設定
  **されません** — `HERMES_DASHBOARD_DRAIN_SECRET` 環境変数経由で提供
  されます。全体の認証のセットアップについては
  [Web Dashboard](/hermes/docs/user-guide/features/web-dashboard/) を参照して
  ください。
- `ws_ping_interval` / `ws_ping_timeout` — 非 loopback のバインドに対する
  WebSocket の keepalive の調整です(loopback の接続は決して ping しません)。
  20秒の既定値が偽の1006の切断を生み出しうる高レイテンシのリンク
  (Tailscale、遠隔の SSH トンネル)では、これらを上げてください。
- `ssh_isolated_idle_grace_s`(既定 `900`) — SSH 経由で到達する Desktop 所有の
  `hermes serve --isolated` バックエンドは、意図的に SSH セッションから
  切り離されているので、接続の途中でスリープするラップトップがそれを
  破棄することはできません。以前は、暗転からの復帰の再接続ごとに、別の
  バックエンドが `state.db` を保持したまま残っていました。このバックエンドは
  今では、この長さの間クライアントの WebSocket が1つも接続されておらず、
  エージェントのターンも動いていない場合に自身を引退させます(ターンが
  動いていればそれは生き続け、読み取れないターンの状態もそれを生かし
  続けます)。ラップトップがスリープした後も切り離されたバックエンドが
  長い作業を終えることに依存している場合は、高く設定してください。そうした
  バックエンドは、半開きのトンネルに気づけるよう、遅い WebSocket の ping
  (60秒、10分のタイムアウト)も送ります。
- `ws_orphan_reap_grace_s` — WS から切り離されたセッションが、orphan reaper に
  回収されるまで待つ時間です。クライアントの再接続が遅い場合は、keepalive の
  値と一緒に上げてください。定期的なセッションのメンテナンスも、閉じた
  ソケットのクリーンアップを完了させ、見当たらない orphan のタイマーを
  再武装するので、切り離されたチャットが、最初のクリーンアップやタイマーが
  失われたことだけを理由に、その所有権のリースを保ち続けることはありません。
  再接続するとそのタイマーはキャンセルされます。アクティブな委任の作業と
  健全に動いているターンは、通常の orphan-reaper のチェックによって保護され
  続けます。(`HERMES_TUI_WS_ORPHAN_REAP_GRACE_S` は、内部的な上書きとして
  残っています。)
- `ws_orphan_activity_stale_s`(既定 `600`) — 切り離された**動いている**
  ターンのアクティビティクロック(`agent.turn_liveness` のウォッチドッグが
  サンプリングするのと同じクロックです。API の待機、ストリームのトークン、
  ツールのハートビート)が、orphan reaper がそれを中断するまでにアイドルで
  なければならない時間です。クライアントがいないターンでも、まだ活発に
  何かを生成している場合は、切り離されたまま完了まで動き続けます —
  ラップトップを閉じる、モバイルアプリをバックグラウンドに回す、デスクトップの
  更新は、もはや健全な長いターンをキャンセルしません。本当に詰まったターン
  だけが中断されます。アクティビティに関わらず grace のウィンドウで中断
  するには `0` を設定してください(以前の挙動)。
- `startup_orphan_sweep`(既定 `true`) — 上記の WS-orphan の回収タイマーは
  プロセス内のものなので、それが発火する前の gateway の再起動(更新、
  クラッシュ、systemd)は、セッションの行を永久に開いたままにしてしまいます
  — `/resume` やダッシュボードに残る幻の「アクティブな」作業です。gateway
  が起動するたびに — stdio の TUI(`entry.main`)と desktop/dashboard の
  WebSocket のサイドカー(`handle_ws`)の両方で — ソースが `tui` / `desktop`
  / `subagent` / `unknown`(トークン集計のガードが自分自身で作らざるを
  得なかった行)で、開始時刻**と**最新のメッセージの両方がセッションの
  TTL(`HERMES_TUI_SESSION_TTL_S`、既定6時間)より古い行は、
  `end_reason: startup_orphan_reap` で閉じられます。メッセージング
  プラットフォームのセッション(Telegram、Discord など)は決して触れられず、
  生きているメモリ上のセッション(すでに resume したクライアント)は除外され、
  掃除されたセッションは resume 可能なままです。

