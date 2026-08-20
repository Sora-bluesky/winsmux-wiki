---
title: "Windows（ネイティブ）ガイド"
description: "Windows 10 / 11 で Hermes Agent をそのまま動かす方法。インストール、機能の対応表、UTF-8 コンソール、Git Bash、タスク スケジューラでのゲートウェイ常駐、エディタの扱い、PATH、アンインストール、よくあるつまずき"
upstream_path: user-guide/windows-native.md
upstream_blob: 4e0a48c0b060995b37f6763bc6ac7d64869e9e57
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/windows-native
---

# Windows（ネイティブ）ガイド {#windows-native-guide}

Hermes は Windows 10 と Windows 11 でそのまま動きます。WSL も Cygwin も Docker も要りません。このページはその詳細です。何がそのまま動き、何が WSL でしか動かないのか、インストーラが実際に何をしているのか、そして触ることになるかもしれない Windows 特有の設定をまとめます。

とにかくインストールしたいだけなら、[トップページ](https://hermes-agent.nousresearch.com/)か[インストールのページ](/hermes/docs/getting-started/installation/#windows-native)にある 1 行のコマンドだけで足ります。何か想定外のことが起きたときに、ここへ戻ってきてください。

:::tip WSL のほうがいい場合は
本物の POSIX 環境が欲しい場合（ダッシュボードに埋め込まれたターミナル、`fork` の挙動、Linux 流のファイル監視などのため）は、**[Windows（WSL2）ガイド](/hermes/docs/user-guide/windows-wsl-quickstart/)**を参照してください。両方をきれいに共存させられます。ネイティブ側のデータは `%LOCALAPPDATA%\hermes` に、WSL 側のデータは `~/.hermes` に置かれます。
:::

## 手早くインストールする {#quick-install}

**PowerShell**（または Windows ターミナル）を開いて、次を実行します。

```powershell
iex (irm https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.ps1)
```

管理者権限は要りません。インストール先は `%LOCALAPPDATA%\hermes\` で、**ユーザーの PATH** に `hermes` が追加されます。終わったら新しいターミナルを開いてください。

**インストーラのオプション**（引数を渡すにはスクリプトブロックの書き方が要ります）:

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.ps1))) -NoVenv -SkipSetup -Branch main
```

| パラメータ | 既定値 | 用途 |
|---|---|---|
| `-Branch` | `main` | 特定のブランチをクローンする（PR の動作確認に便利） |
| `-Commit` | 未設定 | 特定のコミット SHA に固定する（`-Branch` より優先） |
| `-Tag` | 未設定 | 特定の git タグに固定する（例: `v0.14.0`） |
| `-NoVenv` | 無効 | venv の作成を省く（上級者向け。Python は自分で管理する） |
| `-SkipSetup` | 無効 | インストール後の `hermes setup` ウィザードを省く |
| `-HermesHome` | `%LOCALAPPDATA%\hermes` | データ置き場を変更する |
| `-InstallDir` | `%LOCALAPPDATA%\hermes\hermes-agent` | コードの置き場所を変更する |

インストーラは、git の取得が不安定なときは自動でやり直し、ダウンロードした `install.ps1` の中身から BOM を取り除きます。そのため、HTTP でのやり取りの途中で UTF-8 の BOM が付いても、`[scriptblock]::Create((irm ...))` の書き方が壊れることはもうありません。

### デスクトップ版インストーラ（別の方法） {#desktop-installer-alternative}

薄い GUI のインストーラもあります。PowerShell を開くよりも `.exe` をダブルクリックしたい場合に便利です。Hermes Desktop をダウンロードしてインストーラを実行すると、初回起動時に GUI が裏で `install.ps1` を呼び、Python（`uv` 経由）、Node、PortableGit、それに以下で説明する依存関係一式を用意します。初回の実行のあとは、デスクトップアプリと PowerShell で入れた `hermes` の CLI が、同じ `%LOCALAPPDATA%\hermes\hermes-agent` のインストール先と `%LOCALAPPDATA%\hermes` のデータ置き場を共有します。GUI と CLI を自由に行き来できます。

Windows らしいインストール体験がほしいときや、開発者ではない人に Hermes を渡すときはデスクトップ版インストーラを、すでにターミナルを開いているなら PowerShell の 1 行を使ってください。

### 依存関係の自動用意（`dep_ensure`） {#dependency-bootstrap-depensure}

初回の起動時（および足りないツールが見つかったとき）に、Hermes は `hermes_cli/dep_ensure.py` という小さな Python のブートストラップを実行し、Python 以外に必要なものを確認して、必要になった時点で入れます。Windows で関わってくるのは次のものです。

| 依存関係 | Hermes が必要とする理由 |
|---|---|
| **PortableGit** | ターミナルツール用の `bash.exe` と、セッション中のクローン用の `git` を提供します。`dep_ensure` ではなくインストール時に用意されます。 |
| **Node.js 26** | ブラウザツール（`agent-browser`）、TUI の Web ブリッジ、WhatsApp ブリッジに必要です。 |
| **ffmpeg** | TTS や音声メッセージのための音声形式の変換に使います。 |
| **ripgrep** | 高速なファイル検索に使います。無ければ `grep` に切り替わります。 |
| **npm パッケージ** | `agent-browser`、Playwright の Chromium、ツールセットごとの Node の依存関係は、ブラウザツールを初めて使うときに一度だけ入ります。 |

依存関係ごとに `shutil.which(...)` 相当の確認があり、バイナリが無くて対話的に実行している場合は、`dep_ensure` がインストールするか尋ねます（実際のインストール処理は `scripts\install.ps1 -ensure <dep>` に任せます）。対話しない実行（ゲートウェイ、cron、画面なしのデスクトップ起動）では確認を飛ばし、代わりに `this feature needs <dep>` という分かりやすいエラーを出します。

## インストーラが実際にしていること {#what-the-installer-actually-does}

上から順に、次のとおりです。

1. **`uv` を用意します** — Astral の高速な Python 管理ツールです。`%USERPROFILE%\.local\bin` に入ります。
2. **`uv` を使って Python 3.11 を入れます**。既存の Python は要りません。
3. **Node.js 26 を入れます**（winget があればそれを使い、無ければ可搬版の Node のアーカイブを `%LOCALAPPDATA%\hermes\node` に展開します）。ブラウザツールと WhatsApp ブリッジで使います。
4. **可搬版の Git を入れます** — `git` がすでに PATH にあればそれを使い、無ければ削ぎ落とした自己完結型の **PortableGit**（約 45 MB、公式の `git-for-windows` のリリースから）を `%LOCALAPPDATA%\hermes\git` にダウンロードします。管理者権限も、Windows のインストーラ用のレジストリ登録も要らず、他のものに干渉しません。
5. **リポジトリをクローンします** — `%LOCALAPPDATA%\hermes\hermes-agent` に置き、その中に仮想環境を作ります。
6. **段階的な `uv pip install`** — まず `.[all]` を試し、`git+https` の依存関係がレート制限中の GitHub でつまずいた場合は、より小さい組み合わせ（`[messaging,dashboard,ext]` → `[messaging]` → `.`）へ順に下げていきます。1 回のつまずきで最小構成まで落ちてしまう状態を防ぎます。
7. **メッセージング用 SDK を `.env` に合わせて自動で入れます** — `TELEGRAM_BOT_TOKEN` / `DISCORD_BOT_TOKEN` / `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` / `WHATSAPP_ENABLED` があれば、`python -m ensurepip --upgrade` と、それぞれに向けた `pip install` を実行して、各プラットフォームの SDK が実際に読み込める状態にします。
8. **`HERMES_GIT_BASH_PATH` を設定します** — 見つけた `bash.exe` を指すようにして、新しいシェルでも Hermes が確実に見つけられるようにします。
9. **`%LOCALAPPDATA%\hermes\hermes-agent\bin` をユーザーの PATH に追加し、`HERMES_HOME=%LOCALAPPDATA%\hermes` を設定します** — 新しいターミナルを開けば `hermes` コマンドが使えるようになり（そしてデータ置き場を指すようになり）ます。この `bin` にコピーされるのは `hermes.exe` と `hermes-acp.exe` の起動用ファイルだけです。`venv\Scripts` 全体はあえて PATH に入れません。Hermes があなたの `python` コマンドを覆い隠さないようにするためです。
10. **`hermes setup` を実行します** — 通常の初回セットアップのウィザード（モデル、プロバイダ、ツールセット）です。`-SkipSetup` で省けます。

:::tip Windows ではプロバイダ探しを省く
Windows では、ツールごとの API キー設定（Firecrawl、FAL、Browser Use、OpenAI TTS）が、役に立つエージェントを用意するうえで一番の手間になります。[Nous Portal](/hermes/docs/user-guide/features/tool-gateway/) を契約すると、モデル**と**それらのツールが、1 回の OAuth ログインでまとめて使えます。インストーラが終わったら `hermes setup --portal` を実行して、まとめて設定してください。
:::

## 機能の対応表 {#feature-matrix}

ダッシュボードに埋め込まれたターミナルのペイン以外は、すべて Windows でそのまま動きます。

| 機能 | ネイティブの Windows | WSL2 |
|---|---|---|
| CLI（`hermes chat`, `hermes setup`, `hermes gateway`, …） | ✓ | ✓ |
| 対話的な TUI（`hermes --tui`） | ✓ | ✓ |
| メッセージングのゲートウェイ（Telegram、Discord、Slack、WhatsApp ほか 15 以上） | ✓ | ✓ |
| cron のスケジューラ | ✓ | ✓ |
| ブラウザツール（Node 経由の Chromium） | ✓ | ✓ |
| MCP サーバ（stdio と HTTP） | ✓ | ✓ |
| 手元の Ollama / LM Studio / llama-server | ✓ | ✓（WSL のネットワーク越し） |
| Web ダッシュボード（セッション、ジョブ、メトリクス、設定） | ✓ | ✓ |
| ダッシュボードの `/chat` に埋め込まれたターミナルのペイン | ✗（POSIX の PTY が要る） | ✓ |
| ログイン時の自動起動 | ✓（schtasks） | ✓（systemd） |

ダッシュボードの `/chat` タブは、POSIX の PTY（`ptyprocess`）で本物のターミナルを埋め込んでいます。ネイティブの Windows には同じ仕組みがありません。Python の `pywinpty` や Windows の ConPTY を使えば動きますが、まったく別の実装になるので、これからの課題という位置づけです。**ダッシュボードの残りの部分はそのまま動きます。** そのタブだけが「これは WSL2 で使ってください」という案内を表示します。

## Windows でシェルのコマンドをどう実行しているか {#how-hermes-runs-shell-commands-on-windows}

Hermes のターミナルツールは、コマンドを **Git Bash** 経由で実行します。Claude Code と同じやり方です。これで、すべてのツールを書き直さずに POSIX と Windows の差を回避しています。

`bash.exe` を探す順番は次のとおりです。

1. 環境変数 `HERMES_GIT_BASH_PATH` が設定されていれば、それ。
2. `%LOCALAPPDATA%\hermes\git\usr\bin\bash.exe`（インストーラが用意した PortableGit）。
3. `%LOCALAPPDATA%\hermes\git\bin\bash.exe`（古い Git for Windows の配置）。
4. システムにインストールされた Git for Windows（`%ProgramFiles%\Git\bin\bash.exe` など）。
5. 最後の手段として、MSYS2、Cygwin、あるいは PATH 上のどれかの `bash.exe`。

インストーラは `HERMES_GIT_BASH_PATH` を明示的に設定するので、新しい PowerShell を開くたびに探し直す必要がありません。特定の bash を使わせたいときは上書きしてください。たとえばシステム側の Git Bash や、シンボリックリンク経由の WSL の bash などです。

**つまずきどころ:** MinGit の配置は、Git for Windows の通常のインストーラとは違います。bash があるのは `bin\bash.exe` ではなく `usr\bin\bash.exe` です。Hermes は両方を確認します。MinGit の zip を手で展開する場合は、**busybox でないほう**（`MinGit-*-busybox*.zip` ではなく `MinGit-*-64-bit.zip`）を選んでください。busybox 版には `bash` ではなく `ash` が入っていて、coreutils の多くが足りません。

## Windows での UTF-8 コンソール {#utf-8-console-on-windows}

Windows の Python は、既定ではコンソールの現在のコードページ（たいてい cp1252 か cp437）で入出力します。Hermes のバナー、スラッシュコマンドの一覧、ツールの実行表示、Rich のパネル、スキルの説明文には、どれも Unicode が含まれます。何もしないと、そのどれかが `UnicodeEncodeError: 'charmap' codec can't encode character…` で落ちます。

これに対処しているのが `hermes_cli/stdio.py::configure_windows_stdio()` で、すべての入口（`cli.py::main`、`hermes_cli/main.py::main`、`gateway/run.py::main`）の早い段階で呼ばれます。やっていることは次のとおりです。

1. `kernel32.SetConsoleCP` と `SetConsoleOutputCP` を使って、コンソールのコードページを CP_UTF8（65001）に切り替えます。
2. `sys.stdout` / `sys.stderr` / `sys.stdin` を、`errors='replace'` 付きの UTF-8 に設定し直します。
3. `PYTHONIOENCODING=utf-8` と `PYTHONUTF8=1` を設定して（`setdefault` を使うので、明示的に指定した値のほうが優先されます）、子プロセスの Python にも UTF-8 が引き継がれるようにします。
4. `EDITOR` も `VISUAL` も設定されていなければ `EDITOR=notepad` を設定します（後述のエディタの節を参照）。

何度実行しても結果は同じで、Windows 以外では何もしません。

**無効にする:** 環境変数に `HERMES_DISABLE_WINDOWS_UTF8=1` を設定すると、従来の cp1252 の入出力に戻ります。文字化けの原因を切り分けるときには役立ちますが、普段の運用で正しい設定になることはまずありません。

## エディタ（`Ctrl-X Ctrl-E`, `/edit`） {#the-editor-ctrl-x-ctrl-e-edit}

#21561 より前は、Windows で `Ctrl-X Ctrl-E` を押したり `/edit` と打ったりしても、何も起きずに終わっていました。prompt_toolkit は POSIX の絶対パスを直書きした候補（`/usr/bin/nano`、`/usr/bin/pico`、`/usr/bin/vi` など）を持っていて、Windows ではそのどれも見つからないためです。Git for Windows を完全にインストールしていても同じです。

いまは Hermes の Windows 用の入出力の下ごしらえが、既定として `EDITOR=notepad` を設定します。メモ帳はどの Windows にも入っていて、終了を待つエディタとして機能します。`subprocess.call(["notepad", file])` はウィンドウが閉じるまで待ちます。

**自分で設定した値のほうが優先されます**（setdefault より先に確認されるためです）。

| エディタ | PowerShell のコマンド |
|---|---|
| VS Code | `$env:EDITOR = "code --wait"` |
| Notepad++ | `$env:EDITOR = "'C:\Program Files\Notepad++\notepad++.exe' -multiInst -nosession"` |
| Neovim | `$env:EDITOR = "nvim"` |
| Helix | `$env:EDITOR = "hx"` |

VS Code の `--wait` は欠かせません。これが無いとエディタがすぐ戻ってしまい、Hermes は空の内容を受け取ります。

PowerShell のプロファイルに書いておけば、設定が残ります。

```powershell
# In $PROFILE
$env:EDITOR = "code --wait"
```

あるいは、システム設定でユーザーの環境変数として設定すれば、新しいシェルのすべてに反映されます。

## CLI で改行を入れる `Ctrl+Enter` {#ctrlenter-for-newline-in-the-cli}

Windows ターミナルは `Ctrl+Enter` を専用のキー列としてそのまま渡します。Hermes はこれを「改行を入れる」に割り当てているので、`Esc` のあとに `Enter` を押すやり方に頼らずに、CLI で複数行のプロンプトを書けます。Windows ターミナル、VS Code に組み込まれたターミナル、それに VT のエスケープシーケンスを理解する最近の Windows のコンソールで動きます。

昔ながらの `cmd.exe` のコンソールでは `Ctrl+Enter` がただの `Enter` になってしまいます。その場合は `Esc Enter` を使うか、Windows ターミナルに乗り換えてください（無料で、Windows 11 には最初から入っています）。

## Windows のログイン時にゲートウェイを動かす {#running-the-gateway-at-windows-login}

Windows では `hermes gateway install` が**タスク スケジューラ**を使い、うまくいかない場合はスタートアップフォルダに切り替えます。管理者権限は要りません。

### インストール {#install}

```powershell
hermes gateway install
```

裏側で起きていることは次のとおりです。

1. `schtasks /Create /SC ONLOGON /RL LIMITED /TN HermesGateway` — ログイン時に、昇格していない通常の権限で動くタスクを登録します。UAC の確認は出ません。
2. グループポリシーで schtasks が禁止されている場合は、`start /min cmd.exe /d /c <wrapper>` のショートカットを `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup` に書く方法に切り替えます。効果は同じで、少し荒っぽいやり方です。
3. ゲートウェイを **`pythonw.exe` で切り離して起動します**。`python.exe` ではありません。`pythonw.exe` にはコンソールが付かないので、同じプロセスグループの別のプロセスから飛んでくる `CTRL_C_EVENT` の影響を受けません（同じグループで何かを Ctrl+C したときにゲートウェイが落ちる、という実際の問題がありました）。

起動時に使うフラグは `DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP | CREATE_NO_WINDOW | CREATE_BREAKAWAY_FROM_JOB` です。

### 管理 {#manage}

```powershell
hermes gateway status      # Merged view: schtasks + Startup folder + running PID
hermes gateway start       # Starts the scheduled task now
hermes gateway stop        # Graceful SIGTERM equivalent (TerminateProcess via psutil)
hermes gateway restart
hermes gateway uninstall   # Removes schtasks entry, Startup shortcut, pid file
```

`hermes gateway status` は何度実行しても結果が変わりません。千回続けて実行しても、うっかりゲートウェイを止めてしまうことはありません。（PR #21561 より前は、`os.kill(pid, 0)` が C のレベルで `CTRL_C_EVENT` とぶつかるせいで、黙って止めてしまっていました。経緯が気になる方は、後述の「プロセス管理の内側」を参照してください。）

### Windows サービスにしない理由 {#why-not-a-windows-service}

サービスの登録には管理者権限が要るうえ、ゲートウェイの寿命がユーザーのログインではなくマシンの起動に結び付いてしまいます。Hermes を使う人がふつう望むのは、ログインすればゲートウェイが使えて、ログアウトすれば消える、という形です。タスク スケジューラなら、昇格なしでちょうどそれができます。どうしてもサービスにしたいなら `nssm` か `sc create` を手で使ってください。とはいえ、たぶんその必要はありません。

## データの置かれ方 {#data-layout}

| パス | 中身 |
|---|---|
| `%LOCALAPPDATA%\hermes\hermes-agent\` | git のチェックアウトと venv。ユーザーの PATH に追加されるコマンドは、`venv\Scripts\hermes.exe` からコピーされた `bin\hermes.exe` です。`Remove-Item -Recurse` して入れ直しても問題ありません。 |
| `%LOCALAPPDATA%\hermes\git\` | PortableGit（インストーラが用意した場合のみ）。 |
| `%LOCALAPPDATA%\hermes\node\` | 可搬版の Node.js（インストーラが用意した場合のみ）。 |
| `%LOCALAPPDATA%\hermes\bin\` | Hermes が管理する `uv.exe`（更新に使う Python 管理ツール）。 |
| `%LOCALAPPDATA%\hermes\`（直下） | 設定、認証情報、スキル、セッション、ログ（`config.yaml`、`.env`、`skills\`、`sessions\`、`logs\` など）。**入れ直しても残ります。** |

ネイティブの Windows では、インストーラが `HERMES_HOME=%LOCALAPPDATA%\hermes` を設定するので、データと、消してもよいインストール先が**同じ** `%LOCALAPPDATA%\hermes` の下に同居します。インストールと実行に使うのが `hermes-agent\`、`git\`、`node\`、`bin\` の各サブディレクトリで、あなたのデータのファイルは `%LOCALAPPDATA%\hermes` の直下に置かれます。入れ直しで置き換わるのは `hermes-agent\` のチェックアウトだけなので、データは残ります。ただし同じ場所を共有しているので、データを残したいなら `Remove-Item -Recurse %LOCALAPPDATA%\hermes` としては**いけません**。消すなら `hermes-agent\` のサブディレクトリのほうです。データ置き場の構造は Linux の `~/.hermes` とまったく同じなので、端末の間でそのまま写して使えます。

**`HERMES_HOME` の上書き:** 環境変数を別のデータ置き場（Linux や WSL の配置に合わせるなら `%USERPROFILE%\.hermes` など）に向けます。Linux と同じように動きます。

## ブラウザツール {#browser-tool}

ブラウザツールは `agent-browser`（Node のヘルパー）を使って Chromium を操作します。Windows では次のようになります。

- インストーラが npm 経由で `agent-browser` を PATH に置きます。
- `shutil.which("agent-browser", path=...)` は `.cmd` のラッパーを自動で拾います。`CreateProcessW` は拡張子の無いシェバングのスクリプトを実行できないので、Hermes は常に `.CMD` のラッパーを使います。シェバングのスクリプトを直接呼ばず、必ず `.cmd` を通してください。
- Playwright の Chromium は初回の実行時に自動で入ります（`npx playwright install chromium`）。うまくいかなかった場合は、`hermes doctor` がその事実と直し方のヒントを表示します。

## Windows で Hermes を動かすときの実用的なメモ {#running-hermes-on-windows-practical-notes}

### インストール後の PATH {#path-after-install}

インストーラは `[Environment]::SetEnvironmentVariable` を使って `%LOCALAPPDATA%\hermes\hermes-agent\bin` を**ユーザーの PATH** に追加します。すでに開いているターミナルはこれを拾わないので、インストール後に新しい PowerShell のウィンドウ（または Windows ターミナルのタブ）を開いてください。よく分かっている場合を除いて、手で `$env:PATH += …` とせずに、閉じて開き直すのがおすすめです。

確認します。

```powershell
Get-Command hermes        # should print C:\Users\<you>\AppData\Local\hermes\hermes-agent\bin\hermes.exe
hermes --version
```

### 環境変数 {#environment-variables}

Hermes は `$env:X`（そのプロセスだけ）とユーザーの環境変数（システムのプロパティ → 環境変数で設定する、永続的なもの）の両方を見ます。API キーは `%LOCALAPPDATA%\hermes\.env`（`HERMES_HOME` の場所）に置くのが通常のやり方で、Linux と同じです。

```
OPENROUTER_API_KEY=sk-or-...
TELEGRAM_BOT_TOKEN=...
```

秘密の値をユーザーの環境変数に置くのは、Windows のすべてのプロセスから見えてよいと分かっている場合だけにしてください（たいていはそうではないはずです）。

### Windows 特有の環境変数 {#windows-specific-env-vars}

次の変数は、ネイティブの Windows でのインストールにだけ効きます。

| 変数 | 効果 |
|---|---|
| `HERMES_GIT_BASH_PATH` | bash.exe の探索を上書きします。Git for Windows の完全版、シンボリックリンク経由の WSL の bash、MSYS2、Cygwin など、どの bash でも指定できます。インストーラが自動で設定します。 |
| `HERMES_DISABLE_WINDOWS_UTF8` | `1` にすると UTF-8 の入出力の下ごしらえを止め、ロケールのコードページに戻します。文字化けの原因を切り分けるときに役立ちます。 |
| `EDITOR` / `VISUAL` | `/edit` と `Ctrl-X Ctrl-E` で使うエディタです。どちらも未設定なら Hermes は `notepad` を使います。 |

## アンインストール {#uninstall}

PowerShell から実行します。

```powershell
hermes uninstall
```

これがきれいな手順です。schtasks の登録、スタートアップフォルダのショートカット、`hermes.cmd` のラッパーを消し、`%LOCALAPPDATA%\hermes\hermes-agent\` を削除して、ユーザーの PATH を整理します。`%LOCALAPPDATA%\hermes\` の残り（設定、認証情報、スキル、セッション、ログ）は、入れ直すときのためにそのまま残します。

すべて消したい場合は次のようにします。

```powershell
hermes uninstall
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\hermes"
# Also remove a legacy CLI/WSL data dir if you ever used one:
Remove-Item -Recurse -Force "$env:USERPROFILE\.hermes"
```

`hermes uninstall` のサブコマンドは、schtasks の登録が別のタスク名になっている場合（古いインストール）にも対応します。タスク名を決め打ちせず、インストール先のパスで探します。

## プロセス管理の内側 {#process-management-internals}

ここは背景の説明です。「勝手に自分を止めてしまう」ような奇妙な挙動を追いかけていないなら、読み飛ばしてかまいません。

Linux と macOS では、POSIX の常套句である `os.kill(pid, 0)` は「この PID は生きていて、シグナルを送れるか」を確かめるだけで、何もしません。ところが Windows では、Python の `os.kill` は `sig=0` を `CTRL_C_EVENT` に対応させ（どちらも整数の 0 でぶつかります）、`GenerateConsoleCtrlEvent(0, pid)` を通します。これは対象の PID を含む**コンソールのプロセスグループ全体**に Ctrl+C を送ってしまいます。これが [bpo-14484](https://bugs.python.org/issue14484) で、2012 年から開いたままです。いまの挙動に頼っているスクリプトを壊してしまうため、修正される見込みはありません。

その結果、Windows で「この PID が生きているか確かめる」を `os.kill(pid, 0)` でやっていた箇所は、どれも黙って対象を止めていました。Hermes はそうした箇所（11 ファイルにまたがる 14 か所）をすべて `gateway.status._pid_exists()` に置き換えました。これは `psutil.pid_exists()` を使い、その内部では Windows で `OpenProcess + GetExitCodeProcess` を使います。シグナルは一切使いません。プラグインやパッチを書くときは、`psutil.pid_exists()` か `gateway.status._pid_exists()` を直接使い、`os.kill(pid, 0)` は絶対に使わないでください。

これは `scripts/check-windows-footguns.py` が CI で強制しています。新しく `os.kill(pid, 0)` の呼び出しが増えると、その行に `# windows-footgun: ok — <reason>` の印が無いかぎり、`Windows footguns (blocking)` のチェックが失敗します。

## よくあるつまずき {#common-pitfalls}

**インストール直後に `hermes: command not found` になる。**
新しい PowerShell のウィンドウを開いてください。インストーラは `%LOCALAPPDATA%\hermes\hermes-agent\bin` をユーザーの PATH に追加していますが、すでに開いているシェルはそれを拾うために開き直す必要があります。それまでの間は `& "$env:LOCALAPPDATA\hermes\hermes-agent\bin\hermes.exe"` で実行できます。

**ツールの実行時に `WinError 193: %1 is not a valid Win32 application` が出る。**
`.cmd` のラッパーを通らずに、シェバングのスクリプトを直接呼んでしまっています。Hermes は `shutil.which(cmd, path=local_bin)` でコマンドを解決するので PATHEXT が `.CMD` を拾いますが、パスを直書きして呼んでいる場合は `.cmd` のほうに切り替えてください（`npx` ではなく `npx.cmd` など）。

**`[scriptblock]::Create(...)` が `The assignment expression is not valid` で失敗する。**
ダウンロードした `install.ps1` に UTF-8 の BOM が付いています。`irm | iex` の形なら BOM は自動で取り除かれますが、`[scriptblock]::Create((irm ...))` では取り除かれません。単純な `irm | iex` の形でやり直すか、スクリプトを手でダウンロードして `[IO.File]::WriteAllText($path, $text, (New-Object Text.UTF8Encoding $false))` で BOM 無しで保存してください。

**再起動するとゲートウェイが動き続けてくれない。**
`hermes gateway status` を確認してください。schtasks の登録、（使っていれば）スタートアップフォルダのショートカット、動いている PID をまとめて表示します。schtasks には登録されているのに動いていない場合、グループポリシーが `ONLOGON` の起動条件を止めている可能性があります。`schtasks /Query /TN HermesGateway /V /FO LIST` を実行してタスクが失敗した理由を確認するか、いったんアンインストールして `HERMES_GATEWAY_FORCE_STARTUP=1` を付けて入れ直し、スタートアップフォルダの方式に切り替えてください。

**`$env:EDITOR` を設定したのに `/edit` が何もしない。**
いまのプロセスにだけ設定しています。シェルを閉じて開き直すか、システムのプロパティ → 環境変数でユーザー単位に設定してください。新しい PowerShell のウィンドウで `echo $env:EDITOR` を実行して確認します。

**ブラウザツールは起動するのに、ツールがタイムアウトする。**
Chromium は初回の実行時に自動で入ります。その導入に失敗していた場合（GitHub のレート制限、Playwright の CDN の不調など）は `hermes doctor` を実行してください。Chromium が足りていないことを示し、直すための `npx playwright install chromium` のコマンドをそのまま表示します。

**`agent-browser` が Node のバージョンについて妙なエラーを出す。**
インストーラは `%LOCALAPPDATA%\hermes\node` に Node 26 を用意しますが、PATH の先頭に古いシステム側の Node 18 があるのかもしれません。Hermes の node のディレクトリを PATH の前のほうに移すか、Node を他で使っていないならシステム側のインストールを消してください。

**中国語・日本語・アラビア語の文字が CLI で `?` になる。**
UTF-8 の入出力の下ごしらえが働いていません。`HERMES_DISABLE_WINDOWS_UTF8` が設定されて**いない**ことを確認してください（`Get-ChildItem env:HERMES_DISABLE_WINDOWS_UTF8`）。空なのにまだ `?` が出る場合は、コンソール（かなり古い `cmd.exe`）が UTF-8 にまったく対応していない可能性があります。Windows ターミナルに切り替えてください。

**ゲートウェイが Telegram に写真を送れず「`BadRequest: payload contains invalid characters`」と出る。**
これは Windows とは関係ありませんが、まず Windows で表面化することがあります。たいていは、ファイルパスの中のバックスラッシュがエスケープされないまま JSON の本文に入っています。Telegram が受け取るべきなのは Hermes が正規化したパスであって、Windows の生のパスではありません。自作のプラグインでこれが出ているなら、ユーザーの入力から作った `str(Path(...))` ではなく、Hermes が渡してくるパスを使っているか確認してください。

**`git pull` のあとに「別の端末では動くのに」という文字化けが起きる。**
Windows で UTF-8 ではないエディタ（古い Windows のメモ帳、一部の中国語 IME など）を使って Hermes の設定やスキルを編集した場合、そのファイルは BOM 付きで保存されているかもしれません。Hermes はたいていの設定の読み込みで `utf-8-sig` を許容しますが、折りたたみ表記の YAML のスカラー（`description: >`）の中に BOM があると、YAML の解析が静かに壊れます。BOM 無しのふつうの UTF-8 で保存し直してください。

## 次に読むもの {#where-to-go-next}

- **[インストール](/hermes/docs/getting-started/installation/)** — Linux / macOS / WSL2 / Termux も含む、インストールの全体ページ。
- **[Windows（WSL2）ガイド](/hermes/docs/user-guide/windows-wsl-quickstart/)** — POSIX の挙動や、ダッシュボードのターミナルのペインが必要な場合。
- **[CLI 早見表](/hermes/docs/reference/cli-commands/)** — `hermes` のすべてのサブコマンド。
- **[よくある質問](/hermes/docs/reference/faq/)** — Windows に限らない、よく出る質問。
- **[メッセージングのゲートウェイ](/hermes/docs/user-guide/messaging/)** — Windows で Telegram / Discord / Slack を動かす方法。
