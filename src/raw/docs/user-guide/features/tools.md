---
title: "ツールとツールセット"
description: "Hermes Agent のツールの全体像 — 何が使えるか、ツールセットの仕組み、ターミナルの実行先"
upstream_path: user-guide/features/tools.md
upstream_blob: 849e13783482ca936109915643291c42630e8a99
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/tools
---

# ツールとツールセット {#tools-toolsets}

ツールはエージェントの能力を広げる関数です。用途ごとの**ツールセット**にまとめられていて、プラットフォームごとに有効・無効を切り替えられます。

## 使えるツール {#available-tools}

Hermes には幅広い組み込みツールが最初から登録されています。ウェブ検索、ブラウザの自動操作、ターミナルの実行、ファイル編集、記憶、委任、定時タスク、Home Assistant などです。

:::note
**Honcho のセッションをまたぐ記憶**は、組み込みのツールセットではなく記憶の提供元プラグイン（`plugins/memory/honcho/`）として提供されています。導入手順は[プラグイン](/hermes/docs/user-guide/features/plugins/)をご覧ください。
:::

大まかな分類は次のとおりです。

| 分類 | 例 | 説明 |
|----------|----------|-------------|
| **ウェブ** | `web_search`、`web_extract` | ウェブを検索し、ページの中身を取り出します。 |
| **X 検索** | `x_search` | xAI の組み込み Responses ツール `x_search` を使って X（Twitter）の投稿やスレッドを検索します。xAI の認証情報（SuperGrok の OAuth または `XAI_API_KEY`）が必要で、既定では無効です。`hermes tools` → 🐦 X (Twitter) Search から有効にしてください。 |
| **ターミナルとファイル** | `terminal`、`process`、`read_file`、`patch` | コマンドを実行し、ファイルを操作します。 |
| **ブラウザ** | `browser_navigate`、`browser_snapshot`、`browser_vision` | 文字と画像の両方に対応した、対話的なブラウザ自動操作です。 |
| **メディア** | `vision_analyze`、`image_generate`、`text_to_speech` | 複数の形式にまたがる解析と生成です。 |
| **エージェントの段取り** | `todo`、`clarify`、`execute_code`、`delegate_task` | 計画づくり、確認、コードの実行、サブエージェントへの委任です。 |
| **記憶と呼び出し** | `memory`、`session_search` | セッションをまたぐ記憶と、過去のセッションの検索です。 |
| **自動化** | `cronjob` | 定時タスクの作成・一覧・更新・一時停止・再開・実行・削除ができます。外部への配信は cron 自身の配信機能、`hermes send` コマンド、ゲートウェイの通知が担っていて、エージェントが呼べるツールはありません。 |
| **外部連携** | `ha_*`、MCP サーバーのツール | Home Assistant、MCP、その他の連携です。 |

コードから自動生成した確かな一覧は、[組み込みツール一覧](/hermes/docs/reference/tools-reference/)と[ツールセット一覧](/hermes/docs/reference/toolsets-reference/)にあります。

:::tip Nous Tool Gateway
有料の [Nous Portal](https://portal.nousresearch.com) を契約していれば、ウェブ検索、画像生成、TTS、ブラウザの自動操作を **[Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/)** 経由で使えます。個別の API キーは要りません。`hermes model` を実行して有効にするか、`hermes tools` でツールごとに設定してください。
:::

## ツールセットの使い方 {#using-toolsets}

```bash
# Use specific toolsets
hermes chat --toolsets "web,terminal"

# See all available tools
hermes tools

# Configure tools per platform (interactive)
hermes tools
```

よく使うツールセットには `web`、`search`、`terminal`、`file`、`browser`、`vision`、`image_gen`、`skills`、`tts`、`todo`、`memory`、`session_search`、`cronjob`、`code_execution`、`delegation`、`clarify`、`homeassistant`、`messaging`、`spotify`、`discord`、`discord_admin`、`debugging`、`safe` があります。

すべてのツールセットは[ツールセット一覧](/hermes/docs/reference/toolsets-reference/)にまとまっています。`hermes-cli`、`hermes-telegram` といったプラットフォーム別の組み合わせや、`mcp-<server>` のように動的に作られる MCP のツールセットも載っています。

## ツールの実行結果に付く注記 {#tool-result-annotations}

エージェントのやり取りを読むときに知っておくと役立つ振る舞いがいくつかあります。

- **シグナルによる終了は言葉で説明されます。** ターミナルのコマンドがシグナルで止められたとき、結果には数字だけでなく人が読める注記が付きます。たとえば終了コード `-9`／`137` は「terminated by signal 9: SIGKILL — often the kernel OOM killer on memory exhaustion, or an explicit kill -9」と説明され、セグメンテーション違反、異常終了、SIGTERM、パイプの切断、CPU やファイルサイズの上限超過も同じように名前が付きます。負の数（サブプロセスの流儀）は断定的に書かれますが、シェルの `128+signum` の慣習はアプリが正当にその値で終了することもあるため「usually」と留保付きです。
- **UTF-16 のテキストファイルは拒否されず、変換されます。** `read_file` は UTF-16 を検出し（BOM またはバイト並びからの推測で、どちらのエンディアンでも。Windows のメモ帳や PowerShell の `>` によるリダイレクトでよく生じます）、バイナリ扱いにせず UTF-8 に直して表示します。結果には変換したことを知らせる但し書きが入り、`patch`／`write_file` による編集は UTF-8 で書き戻されます。10 MB を超えるファイルと、本当にバイナリのファイルは、これまでどおりバイナリとして読み込みを断ります。

## ターミナルの実行先 {#terminal-backends}

ターミナルのツールは、いくつかの環境でコマンドを実行できます。

| 実行先 | 説明 | 向いている場面 |
|---------|-------------|----------|
| `local` | 手元の端末で実行します（既定） | 開発、信頼できる作業 |
| `docker` | 隔離されたコンテナ | 安全性、再現性 |
| `ssh` | 離れたサーバー | 隔離、エージェントを自分のコードから遠ざける |
| `singularity` | HPC 向けコンテナ | クラスタ計算、root 権限なし |
| `modal` | クラウドでの実行 | サーバーレス、規模の拡大 |
| `daytona` | クラウドのサンドボックス環境 | 消えずに残る遠隔の開発環境 |
| `vercel_sandbox` | Vercel Sandbox のクラウド microVM | スナップショットでファイルが残るクラウド実行 |

### 設定 {#configuration}

```yaml
# In ~/.hermes/config.yaml
terminal:
  backend: local    # or: docker, ssh, singularity, modal, daytona, vercel_sandbox
  cwd: "."          # Working directory
  timeout: 180      # Command timeout in seconds
```

### シェルの起動ファイルと、対話なしのコマンド {#shell-startup-files-and-non-interactive-commands}

エージェントがターミナルを呼ぶとき、シェルは**対話なし**で動きます。TTY はなく、プロンプトの前に人もいません。普段の端末では気づかないような重い初期化や対話を前提とした初期化があると、エージェントが実行するすべてのコマンドが壊れたり、ひどく遅くなったりします。

- **重い初期化（`nvm`、各種バージョン管理、ネットワークに触れるプロンプト）:** よくある `nvm.sh` の読み込みは*すべての*シェル起動に目に見える遅れを足しますし、エージェントは何度もシェルを起動します。数秒かかる rc ファイルは、ちょっとした `git status` すらタイムアウトの危険にさらします。
- **TTY を前提とした処理:** `.bashrc` や `.zshrc` の中で入力を求めたり、`tmux`／`screen` に接続したり、`read` を呼んだり、メニューを表示したりするものは、対話なしのシェルを止めてしまいます。コマンドが延々と終わらないように見えて、最後にタイムアウトします。
- **無条件の出力:** rc ファイルが `echo` でバナーを出すと、エージェントが解析しなければならないコマンドの出力すべてが汚れます。

対処は、多くのディストリビューションが `.bashrc` の先頭にすでに入れている標準的な番人です。対話なしのシェルなら早めに抜け、重いものや対話が要るものはその下に置きます。

```bash
# ~/.bashrc — keep this guard near the top
case $- in
  *i*) ;;      # interactive: continue
  *) return;;  # non-interactive: stop here
esac

# heavy/interactive init goes BELOW the guard
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

zsh を使っている場合は、ログイン時だけの設定を `.zprofile` に、対話時だけの設定を `.zshrc` に置いてください。`.zshenv` は対話なしを含むすべてのシェルで読まれるので、中身は最小限に保ちます。rc ファイルでしか `PATH` に入らないツールがどうしても必要なら、`PATH` の設定だけを番人より*上*に書くか（パスの設定は軽いものです）、実行ファイルを `~/.local/bin` にシンボリックリンクしてください。

自分の端末では動くのに、エージェントのターミナルのコマンドだけが止まったりすぐタイムアウトしたりするなら、まず疑うべきはシェルの初期化です。

### Docker を使う場合 {#docker-backend}

```yaml
terminal:
  backend: docker
  docker_image: python:3.11-slim
```

**長く生きるコンテナがひとつ、プロセス全体で共有されます。** Hermes は最初に使うときに長寿命のコンテナをひとつ起動し（`docker run -d ... sleep infinity`）、ターミナル、ファイル、`execute_code` のすべての呼び出しを `docker exec` でその同じコンテナに通します。作業ディレクトリの移動、入れたパッケージ、環境変数の変更、`/workspace` に書いたファイルは、ツールを呼ぶたびに引き継がれます。`/new`、`/reset`、`delegate_task` のサブエージェントをまたいでも、Hermes のプロセスが生きているあいだは保たれます。コンテナは終了時に停止・削除されます。

つまり Docker を使う場合、コマンドごとに新しいコンテナが立つのではなく、消えずに残るサンドボックスの仮想マシンのように振る舞います。一度 `pip install foo` すれば、そのセッションのあいだはずっと使えます。`cd /workspace/project` すれば、以後の `ls` はそのディレクトリを見ます。動作の詳しい流れと、Hermes を再起動しても `/workspace` と `/root` を残すかどうかを決める `container_persistent` の設定については、[設定 → Docker Backend](/hermes/docs/user-guide/configuration/#docker-backend) をご覧ください。

### SSH を使う場合 {#ssh-backend}

安全性の面でおすすめです。エージェントが自分のコードを書き換えられなくなります。

```yaml
terminal:
  backend: ssh
```
```bash
# Set credentials in ~/.hermes/.env
TERMINAL_SSH_HOST=my-server.example.com
TERMINAL_SSH_USER=myuser
TERMINAL_SSH_KEY=~/.ssh/id_rsa
```

### Singularity／Apptainer {#singularityapptainer}

```bash
# Pre-build SIF for parallel workers
apptainer build ~/python.sif docker://python:3.11-slim

# Configure
hermes config set terminal.backend singularity
hermes config set terminal.singularity_image ~/python.sif
```

### Modal（サーバーレスのクラウド） {#modal-serverless-cloud}

```bash
uv pip install modal
modal setup
hermes config set terminal.backend modal
```

### Vercel Sandbox {#vercel-sandbox}

```bash
pip install 'hermes-agent[vercel]'
hermes config set terminal.backend vercel_sandbox
hermes config set terminal.vercel_runtime node24
```

認証には `VERCEL_TOKEN`、`VERCEL_PROJECT_ID`、`VERCEL_TEAM_ID` の3つすべてが必要です。このアクセストークンによる設定が、Render、Railway、Docker などのホストで Hermes を配備し長く動かし続けるための正式な道です。使えるランタイムは `node24`、`node22`、`python3.13` で、遠隔側の作業場所の起点は既定で `/vercel/sandbox` です。

手元での一度きりの開発なら、Hermes は短命な Vercel の OIDC トークンも受け付けます。

```bash
VERCEL_OIDC_TOKEN="$(vc project token <project-name>)" hermes chat
```

Vercel のプロジェクトと紐づいたディレクトリからなら、次のように書けます。

```bash
VERCEL_OIDC_TOKEN="$(vc project token)" hermes chat
```

`container_persistent: true` にすると、同じタスクのあいだはサンドボックスが作り直されてもファイルの状態が Vercel のスナップショットで引き継がれます。ここには Hermes が同期した認証情報、スキル、キャッシュのファイルも含まれることがあります。ただしスナップショットは、動いているプロセス、PID の空間、同じサンドボックスとしての同一性までは保ちません。

背後で走らせるターミナルのコマンドは、Hermes が手元以外の環境で使う共通の流れに従います。サンドボックスが生きているあいだは、起動・状態確認・待機・ログ・停止が通常のプロセスのツールで動きますが、片づけや再起動のあとに切り離されたプロセスを Vercel から復帰させる仕組みは用意していません。

`container_disk` は未設定のままにするか、共通の既定値 `51200` にしてください。Vercel Sandbox でディスク容量を独自に指定することは対応しておらず、診断や環境の作成に失敗します。

### コンテナに割り当てる資源 {#container-resources}

コンテナを使うすべての実行先について、CPU、メモリ、ディスク、状態を残すかどうかを設定できます。

```yaml
terminal:
  backend: docker  # or singularity, modal, daytona, vercel_sandbox
  container_cpu: 1              # CPU cores (default: 1)
  container_memory: 5120        # Memory in MB (default: 5GB)
  container_disk: 51200         # Disk in MB (default: 50GB)
  container_persistent: true    # Persist filesystem across sessions (default: true)
```

`container_persistent: true` のときは、入れたパッケージ、ファイル、設定がセッションをまたいで残ります。

### コンテナの安全対策 {#container-security}

コンテナを使う実行先はすべて、次の締め付けを効かせた状態で動きます。

- ルートのファイルシステムは読み取り専用（Docker）
- Linux のケーパビリティはすべて剥奪
- 権限の昇格を禁止
- PID の上限（256 プロセス）
- 名前空間の完全な分離
- 作業場所は書き込み可能なルート層ではなくボリュームで保持

Docker については `terminal.docker_forward_env` で環境変数の受け渡しを明示的に許可できますが、渡した変数はコンテナ内のコマンドから見えるので、そのセッションに対しては公開されたものとして扱ってください。

## 背後で走るプロセスの管理 {#background-process-management}

プロセスを背後で起動し、あとから操作できます。

```python
terminal(command="pytest -v tests/", background=true)
# Returns: {"session_id": "proc_abc123", "pid": 12345}

# Then manage with the process tool:
process(action="list")       # Show all running processes
process(action="poll", session_id="proc_abc123")   # Check status
process(action="wait", session_id="proc_abc123")   # Block until done
process(action="log", session_id="proc_abc123")    # Full output
process(action="kill", session_id="proc_abc123")   # Terminate
process(action="write", session_id="proc_abc123", data="y")  # Send input
```

PTY モード（`pty=true`）にすると、Codex や Claude Code のような対話的な CLI ツールも動かせます。

## sudo への対応 {#sudo-support}

sudo が必要なコマンドでは、パスワードの入力を求められます（そのセッションのあいだは保持されます）。`~/.hermes/.env` に `SUDO_PASSWORD` を設定しておくこともできます。

:::warning
メッセージングのプラットフォームで sudo に失敗した場合は、`~/.hermes/.env` に `SUDO_PASSWORD` を足すよう促す案内が出力に含まれます。
:::
