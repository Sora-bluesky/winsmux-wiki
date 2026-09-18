---
title: "ツールとツールセット"
description: "Hermes Agent のツールの全体像 — 何が使えるか、ツールセットの仕組み、ターミナルの実行先"
upstream_path: user-guide/features/tools.md
upstream_blob: bd3d989b0f5a0a64862d7df060c7587430b12844
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/tools
---

# ツールとツールセット {#tools-toolsets}

ツールは、エージェントにできることを広げる関数です。意味のまとまりごとに**ツールセット**へ整理されていて、サービスごとに使う・使わないを切り替えられます。

## 使えるツール {#available-tools}

Hermes には、Web の検索、ブラウザの自動操作、ターミナルでの実行、ファイルの編集、記憶、委任、予定した作業、Home Assistant など、幅広い組み込みのツールの登録簿が付いています。

:::note
**Honcho によるセッションをまたいだ記憶**は、組み込みのツールセットではなく、記憶プロバイダのプラグイン（`plugins/memory/honcho/`）として使えます。入れ方は[プラグイン](/hermes/docs/user-guide/features/plugins/)を参照してください。
:::

大きな分け方はこうです。

| 分類 | 例 | 説明 |
|----------|----------|-------------|
| **Web** | `web_search`、`web_extract` | Web を検索し、ページの中身を取り出します。 |
| **X の検索** | `x_search` | xAI の組み込みの `x_search` という Responses のツールを通して、X（Twitter）の投稿とスレッドを検索します — xAI の資格情報（SuperGrok の OAuth か `XAI_API_KEY`）が要ります。既定では切れていて、`hermes tools` → 🐦 X (Twitter) Search から入れます。 |
| **ターミナルとファイル** | `terminal`、`process`、`read_file`、`patch` | コマンドを実行し、ファイルを扱います。 |
| **ブラウザ** | `browser_navigate`、`browser_snapshot`、`browser_vision` | 文字と視覚の両方に対応した、対話的なブラウザの自動操作です。 |
| **メディア** | `vision_analyze`、`image_generate`、`text_to_speech` | 複数の形式にまたがる分析と生成です。 |
| **エージェントの采配** | `todo`、`clarify`、`execute_code`、`delegate_task` | 計画立て、確認、コードの実行、子エージェントへの委任です。 |
| **記憶と思い出し** | `memory`、`session_search` | ずっと残る記憶と、セッションの検索です。 |
| **自動化** | `cronjob` | 予定した作業です。作成 / 一覧 / 更新 / 一時停止 / 再開 / 実行 / 削除の操作があります。外へ送り出す部分は cron 自身の配送、`hermes send` の CLI、ゲートウェイの通知役が担っていて、エージェントが呼べるツールではありません。 |
| **連携** | `ha_*`、MCP サーバーのツール | Home Assistant、MCP、その他の連携です。 |

コードから起こした正本の登録簿は、[組み込みツール一覧](/hermes/docs/reference/tools-reference/)と[ツールセット一覧](/hermes/docs/reference/toolsets-reference/)を参照してください。

:::tip Nous Tool Gateway
[Nous Portal](https://portal.nousresearch.com) の有料の契約者は、Web の検索、画像の生成、TTS、ブラウザの自動操作を **[Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/)** 経由で使えます — 別に API キーを用意する必要はありません。有効にするには `hermes model` を実行するか、`hermes tools` で個々のツールを設定してください。
:::

## ツールセットを使う {#using-toolsets}

```bash
# Use specific toolsets
hermes chat --toolsets "web,terminal"

# See all available tools
hermes tools

# Configure tools per platform (interactive)
hermes tools
```

よく使うツールセットには、`web`、`search`、`terminal`、`file`、`browser`、`vision`、`image_gen`、`skills`、`tts`、`todo`、`memory`、`session_search`、`cronjob`、`code_execution`、`delegation`、`clarify`、`homeassistant`、`messaging`、`spotify`、`discord`、`discord_admin`、`debugging`、`safe` があります。

`hermes-cli` や `hermes-telegram` といったサービス別のひとまとまりや、`mcp-<server>` のような動的な MCP のツールセットも含めた全体は、[ツールセット一覧](/hermes/docs/reference/toolsets-reference/)を参照してください。

## ツールの結果に付く注記 {#tool-result-annotations}

エージェントのやり取りの記録を読むとき、知っておくと役に立つツールのふるまいがいくつかあります。

- **シグナルによる終了には説明が付きます。** ターミナルのコマンドがシグナルで殺されたとき、結果には裸の数字ではなく人の読める注記が付きます — たとえば終了コード `-9`／`137` は「シグナル 9 で終了: SIGKILL — メモリを使い切ったときのカーネルの OOM killer か、明示的な kill -9 であることが多い」となります。segfault、abort、SIGTERM、パイプの切断、CPU やファイルサイズの上限も同じように名前が付きます。負の値（子プロセスの流儀）は言い切りで書かれ、シェルの `128+signum` の慣習のほうは「たいてい」と含みを持たせています。アプリケーションがその値でまっとうに終了することもあるからです。
- **UTF-16 のテキストファイルは、はねずに変換します。** `read_file` は UTF-16 を見分け（BOM か、バイトの並びからの推し量りで、どちらのバイト順にも対応。Windows のメモ帳のファイルや PowerShell の `>` によるリダイレクトでよくある形です）、バイナリだと印を付ける代わりに、表示のために UTF-8 へ変換します。結果には変換したことを伝える手がかりが含まれ、`patch`／`write_file` による編集は UTF-8 で書き戻されます。10 MB を超えるファイルと、本当にバイナリのファイルは、これまでどおりバイナリとしてはねられます。

## ターミナルの実行先 {#terminal-backends}

ターミナルのツールは、いろいろな環境でコマンドを実行できます。

| 実行先 | 説明 | 使いどころ |
|---------|-------------|----------|
| `local` | 手元の機械で実行（既定） | 開発、信用できる作業 |
| `docker` | 切り離されたコンテナ | 安全性、再現性 |
| `ssh` | 離れたサーバー | 隔離、エージェントを自分のコードから遠ざける |
| `singularity` | HPC 向けのコンテナ | クラスタでの計算、root なし |
| `modal` | クラウドでの実行 | サーバーレス、規模を伸ばす |
| `daytona` | クラウドの砂場としての作業場 | 消えずに残る、離れた開発環境 |
| `vercel_sandbox` | Vercel Sandbox のクラウド上の microVM | スナップショットに支えられたファイルシステムが残るクラウドでの実行 |

### 設定 {#configuration}

```yaml
# In ~/.hermes/config.yaml
terminal:
  backend: local    # or: docker, ssh, singularity, modal, daytona, vercel_sandbox
  cwd: "."          # Working directory
  timeout: 180      # Command timeout in seconds
```

### シェルの起動ファイルと、対話なしのコマンド {#shell-startup-files-and-non-interactive-commands}

エージェントのターミナルの呼び出しは、シェルを**対話なし**で走らせます — TTY もなければ、プロンプトの前に人もいません。普段のターミナルでは気にも留めない、重い初期化や対話を前提とした初期化が、エージェントの実行するすべてのコマンドを壊したり、ひどく遅くしたりすることがあります。

- **遅い初期化（`nvm`、バージョン管理の道具、ネットワークに触れるプロンプト）:** よくある `nvm.sh` の読み込みは、*どの*シェルの起動にも目に見える待ち時間を足します。しかもエージェントはたくさんのシェルを起動します。数秒かかる rc ファイルは、ちょっとした `git status` を打ち切りの危険にさらします。
- **TTY を当てにするかたまり:** `.bashrc`／`.zshrc` の中で、入力を求めたり、`tmux`／`screen` に繋ぎ直したり、`read` を呼んだり、選択肢を並べたりするものは、対話なしのシェルを固まらせます — コマンドは永遠に動いているように見えて、そのうち打ち切られます。
- **無条件の出力:** rc ファイルが `echo` で飾りを出すと、エージェントが読み解くべきすべてのコマンドの出力が汚れます。

直し方は、多くのディストリビューションが `.bashrc` の先頭にすでに入れている、標準の守りです — シェルが対話なしのときは早めに引き返し、重いものや対話するものはその下に置きます。

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

Zsh を使っている場合は、ログインのときだけの用意を `.zprofile` に、対話のときだけの用意を `.zshrc` に置いてください。`.zshenv` は最小限に保ちます。対話なしのものも含めて、すべてのシェルで走るからです。rc ファイルでしか `PATH` に乗らない道具が、エージェントにもどうしても要るなら、`PATH` の変更を守りの*上*で export する（パスの export は軽いものです）か、その実行ファイルを `~/.local/bin` へシンボリックリンクしてください。

自分のターミナルでは動いていたのに、エージェントのターミナルのコマンドが固まったりすぐ打ち切られたりするなら、まず疑うのはシェルの初期化です。

### Docker を使う {#docker-backend}

```yaml
terminal:
  backend: docker
  docker_image: python:3.11-slim
```

**プロセス全体で共有する、ひとつの居続けるコンテナ。** Hermes は最初に使うときに、長生きするコンテナを1つだけ立ち上げ（`docker run -d ... sleep infinity`）、ターミナル、ファイル、`execute_code` のすべての呼び出しを `docker exec` でその同じコンテナへ通します。作業ディレクトリの移動、入れたパッケージ、環境の手直し、`/workspace` へ書いたファイルは、どれもツールの呼び出しから次の呼び出しへ引き継がれます。`/new`、`/reset`、`delegate_task` の子エージェントをまたいでも、Hermes のプロセスが生きているあいだはそのままです。コンテナは終了時に止められ、取り除かれます。

つまり Docker の実行先は、コマンドごとに新しいコンテナを作るのではなく、居続ける砂場の仮想機械のようにふるまいます。一度 `pip install foo` すれば、そのセッションのあいだずっと入ったままです。`cd /workspace/project` すれば、そのあとの `ls` はそのディレクトリを見ます。生き死にの詳しい話と、`/workspace` と `/root` が Hermes の再起動をまたいで残るかどうかを決める `container_persistent` の設定は、[設定 → Docker Backend](/hermes/docs/user-guide/configuration/#docker-backend) を参照してください。

### SSH を使う {#ssh-backend}

安全のために勧められる形です — エージェントが自分のコードを書き換えられません。

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

### Singularity / Apptainer {#singularityapptainer}

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

`VERCEL_TOKEN`、`VERCEL_PROJECT_ID`、`VERCEL_TEAM_ID` の3つすべてで認証します。このアクセストークンによる形が、Render、Railway、Docker などのホストで、配置や長く動かす普通の Hermes のプロセスに対して支えられている道筋です。使える実行環境は `node24`、`node22`、`python3.13` で、離れた側の作業場の根として Hermes は `/vercel/sandbox` を既定にします。

その場かぎりの手元での開発のために、Hermes は寿命の短い Vercel の OIDC トークンも受け付けます。

```bash
VERCEL_OIDC_TOKEN="$(vc project token <project-name>)" hermes chat
```

Vercel のプロジェクトに紐づいたディレクトリからなら、こうです。

```bash
VERCEL_OIDC_TOKEN="$(vc project token)" hermes chat
```

`container_persistent: true` のとき、Hermes は Vercel のスナップショットを使い、同じ作業のために砂場が作り直されてもファイルシステムの状態を保ちます。ここには、Hermes が同期した資格情報、skill、砂場の中のキャッシュのファイルが含まれることがあります。スナップショットは、動いているプロセス、PID の空間、砂場としての同一性までは保ちません。

裏で走らせるターミナルのコマンドは、Hermes の汎用の、手元ではないプロセスの流れを使います。砂場が生きているあいだは、起動、確認、待ち、記録、停止が普通のプロセスのツールを通して動きます。ただし、片付けや再起動のあとに Vercel の切り離されたプロセスを取り戻す独自の仕組みは、Hermes にはありません。

`container_disk` は設定しないままにするか、共通の既定である `51200` のままにしてください。Vercel Sandbox ではディスクの大きさを自分で決めることが支えられておらず、診断や実行先の作成が失敗します。

### コンテナの資源 {#container-resources}

すべてのコンテナ系の実行先について、CPU、メモリ、ディスク、残るかどうかを設定できます。

```yaml
terminal:
  backend: docker  # or singularity, modal, daytona, vercel_sandbox
  container_cpu: 1              # CPU cores (default: 1)
  container_memory: 5120        # Memory in MB (default: 5GB)
  container_disk: 51200         # Disk in MB (default: 50GB)
  container_persistent: true    # Persist filesystem across sessions (default: true)
```

`container_persistent: true` のときは、入れたパッケージ、ファイル、設定がセッションをまたいで残ります。

### コンテナの安全 {#container-security}

コンテナ系の実行先はすべて、安全を固めたうえで動きます。

- 読み取り専用の root ファイルシステム（Docker）
- Linux のケーパビリティをすべて外す
- 権限の昇格なし
- PID の上限（256 プロセス）
- 名前空間を完全に切り離す
- 作業場は書き込みできる root の層ではなく、ボリュームで残す

Docker には `terminal.docker_forward_env` で環境変数の受け渡しをはっきり許すこともできますが、渡した変数はコンテナの中のコマンドから見えるので、そのセッションに対しては露出しているものとして扱ってください。

## 裏で走るプロセスの管理 {#background-process-management}

プロセスを裏で走らせ、面倒を見ます。

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

PTY のモード（`pty=true`）を使うと、Codex や Claude Code のような対話的な CLI の道具が動きます。

裏で走らせて終わったコマンドは、その終了状態と拾った出力を、いま使っているプロファイルの中に持ち続けます。そのコマンドを始めた会話（または、それが圧縮されて続いたもの）に戻ったうえで、元の `session_id` を使い、出力は `process(action="log")` で、終了状態は `process(action="poll")` で読んでください。関係のない会話や、持ち主となるセッションが結びついていない要求からは、たとえプロセスの手がかりがぴたりと分かっていても、残された控えは読めません。`process(action="list")` は、いまの作業や会話について残っている結果も一緒に並べます。

Hermes は新しいほうから **64 件の終わった結果**を、**終わってから最大7日間**、そのプロファイルの Hermes ホームの `logs/process-results/` の下に置いておきます。ひとつの控えに入るのは、これまでどおり巻き取られた **20万文字までの出力の末尾**です。ターミナルの秘密を伏せる決まりはつねに効きます。動いている最中の出力の伏せ字を切っているときでも、です。控えは、そのあと結果を読んだり書いたりしたときに期限切れになります。取り戻す仕組みは、コマンドを走らせ直したり、完了の知らせを流し直したりはしません。これは親が生きているあいだに終わった仕事を残すためのもので、打ち切りや異常終了のあとに、終わっていない子を生かし続けるものではありません。

## sudo への対応 {#sudo-support}

対話のできる親のセッションでは、対応している sudo のコマンドは伏せ字のパスワード入力を使います（そのセッションのあいだ覚えておかれます）。ここには、そのまま書いた絶対パスや引用符で囲んだ実行ファイルのパス、それに普通のオプションや代入を伴う `env` の前置き — たとえば `env -u UNUSED /usr/bin/sudo id` — も含まれます。パスワードの要らない sudo なら、入力を求められません。エージェントの動く機械の、プロファイルの `.env` ファイルに `SUDO_PASSWORD` を設定しておくこともできます。

`bash -c 'sudo id'` のようなシェルへの受け渡し、`env -S` で分かれる文字列、動的に決まる実行ファイルのパス、見覚えのない `env` のオプションは、パスワードを差し込む書き換えの対象にはなりません。対話の入力が必要なときは、sudo を直接呼んでください。この扱いは、承認の決まりや、エージェントが渡してきた sudo のパスワードに対する守りを変えるものではありません。

委任された子エージェントは、パスワードの入力を開けません。同時に走る仕事には、順番の決まった人間向けのパスワードの通り道がないからです。代わりに親のセッションでそのコマンドを走らせるか、手元に `SUDO_PASSWORD` を用意してください。メッセージ系や、人が見ていないセッションには、パスワードを安全に返す通り道がありません。チャットにパスワードを送らないでください。

:::warning
メッセージ系のサービスでは、sudo が失敗したときの出力に、`~/.hermes/.env` へ `SUDO_PASSWORD` を足すよう促す助言が付きます。
:::
