---
title: "Windows（ネイティブ）ガイド"
description: "Windows 10 / 11 で Hermes Agent をそのまま動かすためのガイド。インストール、機能の対応表、UTF-8 コンソール、Git Bash、タスクスケジューラでのゲートウェイ常駐、エディタの扱い、PATH、アンインストール、よくあるつまずきをまとめます"
upstream_path: user-guide/windows-native.md
upstream_blob: f703dfe286a24df5816c5e302fb5d16c4544fd10
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/windows-native
---

# Windows（ネイティブ）ガイド {#windows-native-guide}

Hermes は Windows 10 と Windows 11 でそのまま動きます。WSL も Cygwin も Docker も要りません。このページはその詳細です。何がそのまま動き、何が WSL でしか動かないのか、インストーラが実際に何をしているのか、そして Windows ならではの調整項目を扱います。

まずインストールしたいだけであれば、[トップページ](https://hermes-agent.nousresearch.com/) や [インストールのページ](/hermes/docs/getting-started/installation/#windows-native) にある 1 行のコマンドで足ります。何か想定と違うことが起きたときに、このページへ戻ってきてください。

:::tip WSL のほうがよい場合は
本物の POSIX 環境が欲しい場合（ダッシュボードに埋め込まれた端末、`fork` の挙動、Linux 流のファイル監視などが目的なら）、**[Windows（WSL2）ガイド](/hermes/docs/user-guide/windows-wsl-quickstart/)** を参照してください。両者はきれいに共存します。ネイティブのデータは `%LOCALAPPDATA%\hermes` の下に、WSL のデータは `~/.hermes` の下に置かれます。
:::

## 手早くインストールする {#quick-install}

**PowerShell**（または Windows Terminal）を開いて、次を実行します。

```powershell
iex (irm https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.ps1)
```

管理者権限は要りません。インストーラは `%LOCALAPPDATA%\hermes\` に導入し、**ユーザーの PATH** に `hermes` を追加します。終わったら新しい端末を開いてください。

**インストーラのオプション**（引数を渡すにはスクリプトブロックの形が必要です）:

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.ps1))) -NoVenv -SkipSetup -Branch main
```

| 引数 | 既定値 | 用途 |
|---|---|---|
| `-Branch` | `main` | 指定したブランチをクローンします（PR の検証に便利です） |
| `-Commit` | 未設定 | 特定のコミット SHA に固定します（`-Branch` より優先されます） |
| `-Tag` | 未設定 | 特定の git タグに固定します（例: `v0.14.0`） |
| `-NoVenv` | 無効 | venv の作成を省きます（上級者向け。Python の管理は自分で行います） |
| `-SkipSetup` | 無効 | インストール後の `hermes setup` ウィザードを省きます |
| `-HermesHome` | `%LOCALAPPDATA%\hermes` | データディレクトリを変更します |
| `-InstallDir` | `%LOCALAPPDATA%\hermes\hermes-agent` | コードの置き場所を変更します |

インストーラは git の取得が不安定なときに自動で再試行し、ダウンロードした `install.ps1` の内容から BOM を取り除きます。そのため、HTTP でのやり取りの途中で UTF-8 の BOM が混ざっても、`[scriptblock]::Create((irm ...))` の形が壊れることはなくなりました。

### デスクトップ版インストーラ（別の方法） {#desktop-installer-alternative}

画面付きの簡単なインストーラもあります。PowerShell を開くよりも `.exe` をダブルクリックしたい場合に便利です。Hermes Desktop をダウンロードしてインストーラを実行すると、初回起動時に画面の裏側で `install.ps1` が呼ばれ、（`uv` による）Python、Node、PortableGit、そのほか後述する依存関係の準備が進みます。初回のあとは、デスクトップアプリと PowerShell で入れた `hermes` の CLI が同じ `%LOCALAPPDATA%\hermes\hermes-agent` のインストールと `%LOCALAPPDATA%\hermes` のデータディレクトリを共有するので、画面と端末を自由に行き来できます。

Windows でおなじみのインストール体験が欲しいとき、あるいは開発者ではない人に Hermes を渡すときは、デスクトップ版インストーラを使ってください。すでに端末を開いているなら、PowerShell の 1 行のコマンドが早道です。

### 依存関係の自動準備（`dep_ensure`） {#dependency-bootstrap-depensure}

初回の起動時（および足りないツールが見つかったとき随時）、Hermes は `hermes_cli/dep_ensure.py` という小さな準備用のスクリプトを実行し、Python 以外で必要になるものを確認して、そのとき必要な分だけインストールします。Windows で関係するのは次のものです。

| 依存関係 | Hermes がそれを必要とする理由 |
|---|---|
| **PortableGit** | 端末ツール用の `bash.exe` と、セッション内でクローンするための `git` を提供します。インストール時に用意され、`dep_ensure` が入れるわけではありません。 |
| **Node.js 26** | ブラウザツール（`agent-browser`）、TUI の Web ブリッジ、WhatsApp のブリッジに必要です。 |
| **ffmpeg** | 読み上げや音声メッセージのための音声形式の変換に使います。 |
| **ripgrep** | 高速なファイル検索に使います。無ければ `grep` に切り替わります。 |
| **npm のパッケージ** | `agent-browser`、Playwright の Chromium、ツールセットごとの Node 依存は、ブラウザツールを最初に使うときに一度だけインストールされます。 |

依存関係ごとに `shutil.which(...)` に相当する確認があり、実行ファイルが見つからず、かつ対話的に実行されている場合、`dep_ensure` はインストールするかどうかを尋ねます（実際のインストール処理は `scripts\install.ps1 -ensure <dep>` に任せます）。ゲートウェイ、cron、画面なしでのデスクトップ起動といった対話できない実行では確認を省き、代わりに `this feature needs <dep>` という分かりやすいエラーを表示します。

## インストーラが実際に行うこと {#what-the-installer-actually-does}

上から順に、次のとおりです。

1. **`uv` を準備します** — Astral 製の高速な Python 管理ツールです。`%USERPROFILE%\.local\bin` に入ります。
2. **`uv` で Python 3.11 をインストールします。** 既存の Python は必要ありません。
3. **Node.js 26 をインストールします**（winget があればそれを使い、無ければ持ち運び可能な Node の書庫を `%LOCALAPPDATA%\hermes\node` の下に展開します）。ブラウザツールと WhatsApp のブリッジで使います。
4. **持ち運び可能な Git を用意します** — `git` がすでに PATH にあればそれを使い、無ければ切り詰めた自己完結型の **PortableGit**（約 45 MB、公式の `git-for-windows` リリースから）を `%LOCALAPPDATA%\hermes\git` へダウンロードします。管理者権限も、Windows のインストーラの登録情報も不要で、端末上のほかのものに干渉しません。
5. **リポジトリをクローンします** — `%LOCALAPPDATA%\hermes\hermes-agent` に取得し、その中に仮想環境を作ります。
6. **段階的な `uv pip install`** — まず `.[all]` を試し、GitHub の回数制限などで `git+https` の依存が失敗した場合は、より小さな組み合わせ（`[messaging,dashboard,ext]` → `[messaging]` → `.`）へ順に切り替えます。一度の失敗で最小構成まで落ちてしまう事態を防ぎます。
7. **メッセージング用 SDK を `.env` に応じて自動でインストールします** — `TELEGRAM_BOT_TOKEN` / `DISCORD_BOT_TOKEN` / `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` / `WHATSAPP_ENABLED` があれば、`python -m ensurepip --upgrade` と必要な `pip install` を実行し、各プラットフォームの SDK を実際に読み込める状態にします。
8. **`HERMES_GIT_BASH_PATH` を設定します** — 見つかった `bash.exe` を指すようにし、新しいシェルでも Hermes が確実に見つけられるようにします。
9. **`%LOCALAPPDATA%\hermes\bin` をユーザーの PATH に追加し、`HERMES_HOME=%LOCALAPPDATA%\hermes` を設定します** — 新しい端末を開いたあと、`hermes` コマンドが使えるようになり（データディレクトリもそこを指します）。この `bin` ディレクトリに複製されるのは `hermes.exe` と `hermes-acp.exe` の起動用ファイルだけです。`venv\Scripts` 全体は意図的に PATH に置かないので、Hermes が自分の `python` コマンドを覆い隠すことはありません。
10. **`hermes setup` を実行します** — 通常の初回設定ウィザード（モデル、プロバイダ、ツールセット）です。`-SkipSetup` で省けます。

:::tip Windows でのプロバイダ探しを省く
Windows では、ツールごとの API キーの設定（Firecrawl、FAL、Browser Use、OpenAI TTS）が、使えるエージェントを整えるうえで最も手間のかかるところです。[Nous Portal](/hermes/docs/user-guide/features/tool-gateway/) を契約すると、モデル**と**それらのツールがすべて 1 回の OAuth ログインでまかなえます。インストーラが終わったら `hermes setup --portal` を実行して、まとめて設定してください。
:::

## 機能の対応表 {#feature-matrix}

ダッシュボードに埋め込まれた端末のペインを除けば、すべて Windows でそのまま動きます。

| 機能 | Windows ネイティブ | WSL2 |
|---|---|---|
| CLI（`hermes chat`、`hermes setup`、`hermes gateway` など） | ✓ | ✓ |
| 対話的な TUI（`hermes --tui`） | ✓ | ✓ |
| メッセージングのゲートウェイ（Telegram、Discord、Slack、WhatsApp ほか 15 以上） | ✓ | ✓ |
| cron のスケジューラ | ✓ | ✓ |
| ブラウザツール（Node 経由の Chromium） | ✓ | ✓ |
| MCP サーバー（stdio と HTTP） | ✓ | ✓ |
| 手元の Ollama / LM Studio / llama-server | ✓ | ✓（WSL のネットワーク経由） |
| Web のダッシュボード（セッション、ジョブ、指標、設定） | ✓ | ✓ |
| ダッシュボードの `/chat` に埋め込まれた端末のペイン | ✗（POSIX の PTY が必要） | ✓ |
| ログイン時の自動起動 | ✓（schtasks） | ✓（systemd） |

ダッシュボードの `/chat` タブは、POSIX の PTY（`ptyprocess`）で本物の端末を埋め込んでいます。Windows ネイティブには同じ仕組みがありません。Python の `pywinpty` や Windows の ConPTY なら実現できますが、それは別の実装になるため、今後の課題としています。**ダッシュボードのそれ以外の部分はそのまま動きます。** 「ここは WSL2 を使ってください」という案内が出るのは、そのタブだけです。

## Hermes が Windows でシェルのコマンドを実行する仕組み {#how-hermes-runs-shell-commands-on-windows}

Hermes の端末ツールは、**Git Bash** を通してコマンドを実行します。Claude Code と同じやり方です。これにより、すべてのツールを書き直すことなく、POSIX と Windows の隔たりを回避できます。

`bash.exe` を探す順序は次のとおりです。

1. 環境変数 `HERMES_GIT_BASH_PATH`（設定されている場合）。
2. `%LOCALAPPDATA%\hermes\git\usr\bin\bash.exe`（インストーラが管理する PortableGit）。
3. `%LOCALAPPDATA%\hermes\git\bin\bash.exe`（古い Git for Windows の構成）。
4. システムに入れた Git for Windows（`%ProgramFiles%\Git\bin\bash.exe` など）。
5. 最後の手段として、MSYS2、Cygwin、あるいは PATH 上のいずれかの `bash.exe`。

インストーラは `HERMES_GIT_BASH_PATH` を明示的に設定するので、新しい PowerShell のセッションで探し直す必要がありません。特定の bash を使わせたい場合は上書きしてください。たとえば、システムに入れた Git Bash や、シンボリックリンク経由の WSL 上の bash などです。

**つまずきどころ:** MinGit の構成は、Git for Windows の通常のインストーラとは異なります。bash があるのは `bin\bash.exe` ではなく `usr\bin\bash.exe` です。Hermes は両方を確認します。MinGit の zip を手作業で展開する場合は、**busybox でない**版（`MinGit-*-busybox*.zip` ではなく `MinGit-*-64-bit.zip`）を選んでください。busybox 版には `bash` ではなく `ash` が入っていて、coreutils の多くも欠けています。

## Windows での UTF-8 コンソール {#utf-8-console-on-windows}

Windows における Python の既定の標準入出力は、コンソールで有効なコードページ（たいていは cp1252 か cp437）を使います。Hermes の起動時の表示、スラッシュコマンドの一覧、ツールの実行状況、Rich のパネル、スキルの説明には、いずれも Unicode が含まれます。何も手を打たないと、それらは `UnicodeEncodeError: 'charmap' codec can't encode character…` で落ちてしまいます。

その対策が `hermes_cli/stdio.py::configure_windows_stdio()` で、すべての入口（`cli.py::main`、`hermes_cli/main.py::main`、`gateway/run.py::main`）の早い段階で呼ばれます。行うのは次のことです。

1. `kernel32.SetConsoleCP` と `SetConsoleOutputCP` を使って、コンソールのコードページを CP_UTF8（65001）に切り替えます。
2. `sys.stdout` / `sys.stderr` / `sys.stdin` を `errors='replace'` 付きの UTF-8 に設定し直します。
3. `PYTHONIOENCODING=utf-8` と `PYTHONUTF8=1` を設定し（`setdefault` を使うので、利用者が明示した値のほうが優先されます）、子プロセスの Python にも UTF-8 が引き継がれるようにします。
4. `EDITOR` と `VISUAL` のどちらも設定されていない場合は、`EDITOR=notepad` を設定します（後述のエディタの節を参照）。

何度呼んでも結果は同じです。Windows 以外では何もしません。

**やめたい場合:** 環境変数に `HERMES_DISABLE_WINDOWS_UTF8=1` を設定すると、従来の cp1252 の標準入出力に戻ります。文字コードの不具合を切り分けるときには役立ちますが、ふだんの運用で正しい設定になることはまずありません。

## エディタ（`Ctrl-X Ctrl-E`、`/edit`） {#the-editor-ctrl-x-ctrl-e-edit}

#21561 より前は、Windows で `Ctrl-X Ctrl-E` を押しても `/edit` と打っても、何も起きませんでした。prompt_toolkit には POSIX の絶対パスを並べた予備の一覧（`/usr/bin/nano`、`/usr/bin/pico`、`/usr/bin/vi` など）が書き込まれていて、Windows ではどれも見つかりません。Git for Windows を丸ごと入れていても同じです。

現在、Hermes の Windows 向け標準入出力の調整は、既定として `EDITOR=notepad` を設定します。メモ帳はどの Windows にも入っていて、処理を待たせるエディタとして機能します。`subprocess.call(["notepad", file])` は、そのウィンドウが閉じるまで待ちます。

**利用者の設定は変わらず優先されます**（既定を入れる前に確認されます）。

| エディタ | PowerShell でのコマンド |
|---|---|
| VS Code | `$env:EDITOR = "code --wait"` |
| Notepad++ | `$env:EDITOR = "'C:\Program Files\Notepad++\notepad++.exe' -multiInst -nosession"` |
| Neovim | `$env:EDITOR = "nvim"` |
| Helix | `$env:EDITOR = "hx"` |

VS Code の `--wait` は欠かせません。これが無いとエディタはすぐに終了してしまい、Hermes には空の内容が返ってきます。

PowerShell のプロファイルに書けば、設定を残せます。

```powershell
# In $PROFILE
$env:EDITOR = "code --wait"
```

システム設定でユーザーの環境変数として設定しておけば、新しいシェルすべてに反映されます。

## CLI で改行を入れる `Ctrl+Enter` {#ctrlenter-for-newline-in-the-cli}

Windows Terminal は `Ctrl+Enter` を専用のキー列としてそのまま渡します。Hermes はこれを「改行を挿入する」動作に割り当てているので、`Esc` のあとに `Enter` を押す代わりに、CLI でそのまま複数行の指示を書けます。Windows Terminal、VS Code に組み込まれた端末、VT のエスケープ列を扱える最近の Windows のコンソールで動きます。

従来の `cmd.exe` のコンソールでは、`Ctrl+Enter` はただの `Enter` になってしまいます。その場合は `Esc Enter` を使うか、Windows Terminal に切り替えてください（無料で、Windows 11 には既定で入っています）。

## Windows のログイン時にゲートウェイを動かす {#running-the-gateway-at-windows-login}

Windows での `hermes gateway install` は、**タスクスケジューラ**を使い、うまくいかない場合はスタートアップフォルダに切り替えます。管理者権限は要りません。

### インストール {#install}

```powershell
hermes gateway install
```

裏側では次のことが起きます。

1. `schtasks /Create /SC ONLOGON /RL LIMITED /TN HermesGateway` — ログイン時に、昇格していない通常の権限で動くタスクを登録します。UAC の確認は出ません。
2. グループポリシーで schtasks が禁じられている場合は、`start /min cmd.exe /d /c <wrapper>` のショートカットを `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup` に書き出す方式に切り替えます。効果は同じで、作りが少し素朴なだけです。
3. ゲートウェイは `python.exe` ではなく **`pythonw.exe` で切り離して起動します**。`pythonw.exe` にはコンソールが結び付かないため、同じ立場のプロセスから飛んでくる `CTRL_C_EVENT` の影響を受けません（同じプロセスグループで何かを Ctrl+C したときにゲートウェイが落ちる、という実際に起きていた問題への対策です）。

起動時に使うフラグは `DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP | CREATE_NO_WINDOW | CREATE_BREAKAWAY_FROM_JOB` です。

### 管理 {#manage}

```powershell
hermes gateway status      # Merged view: schtasks + Startup folder + running PID
hermes gateway start       # Starts the scheduled task now
hermes gateway stop        # Graceful SIGTERM equivalent (TerminateProcess via psutil)
hermes gateway restart
hermes gateway uninstall   # Removes schtasks entry, Startup shortcut, pid file
```

`hermes gateway status` は何度実行しても同じ結果になります。千回続けて呼んでも、うっかりゲートウェイを止めてしまうことはありません。（PR #21561 より前は、C の層で `os.kill(pid, 0)` が `CTRL_C_EVENT` とぶつかり、実際に止めてしまっていました。経緯が気になる場合は後述の「プロセス管理の内部事情」を参照してください。）

### なぜ Windows サービスにしないのか {#why-not-a-windows-service}

サービスはインストールに管理者権限が要り、ゲートウェイの生存期間がユーザーのログインではなく端末の起動に結び付いてしまいます。Hermes を使う人がふつうに望むのは「ログインすればゲートウェイが使える、ログアウトすれば消える」という形です。タスクスケジューラは、昇格なしでちょうどそれを実現します。どうしてもサービスにしたい場合は `nssm` や `sc create` を手作業で使えますが、おそらくその必要はありません。

## データの配置 {#data-layout}

| パス | 中身 |
|---|---|
| `%LOCALAPPDATA%\hermes\hermes-agent\` | git のチェックアウトと venv。`Remove-Item -Recurse` して入れ直しても問題ありません。 |
| `%LOCALAPPDATA%\hermes\git\` | PortableGit（インストーラが用意した場合のみ）。 |
| `%LOCALAPPDATA%\hermes\node\` | 持ち運び可能な Node.js（インストーラが用意した場合のみ）。 |
| `%LOCALAPPDATA%\hermes\bin\` | `hermes` と `hermes-acp` の起動用ファイル、および Hermes が管理する `uv.exe`（更新に使う Python 管理ツール）。 |
| `%LOCALAPPDATA%\hermes\`（直下） | 設定、認証情報、スキル、セッション、ログ（`config.yaml`、`.env`、`skills\`、`sessions\`、`logs\` など）。**入れ直しても残ります。** |

Windows ネイティブでは、インストーラが `HERMES_HOME=%LOCALAPPDATA%\hermes` を設定するため、データと、消してよいインストールの中身が**同じ** `%LOCALAPPDATA%\hermes` の下に同居します。インストールと実行環境は `hermes-agent\`、`git\`、`node\`、`bin\` の各サブディレクトリで、データのファイルは `%LOCALAPPDATA%\hermes` の直下に置かれます。入れ直しで置き換わるのは `hermes-agent\` のチェックアウトだけなので、データは残ります。ただし同じ場所を共有しているため、データを残したいなら `Remove-Item -Recurse %LOCALAPPDATA%\hermes` を実行しては**いけません**。消すのは `hermes-agent\` のサブディレクトリのほうです。データディレクトリの構成は Linux の `~/.hermes` とまったく同じなので、端末の間で同じ形のまま持ち回せます。

**`HERMES_HOME` の変更:** 環境変数で別のデータディレクトリを指すようにできます（たとえば Linux や WSL の配置に合わせるなら `%USERPROFILE%\.hermes`）。動作は Linux と同じです。

## ブラウザツール {#browser-tool}

ブラウザツールは、Node の補助プログラムである `agent-browser` を使って Chromium を操作します。Windows では次のようになります。

- インストーラが npm 経由で `agent-browser` を PATH に置きます。
- `shutil.which("agent-browser", path=...)` が `.cmd` のラッパーを自動で拾います。`CreateProcessW` は拡張子のないシェバングのスクリプトを実行できないため、Hermes は常に `.CMD` のラッパーを使います。シェバングのスクリプトを直接呼ばず、必ず `.cmd` を通してください。
- Playwright の Chromium は初回の実行時に自動でインストールされます（`npx playwright install chromium`）。失敗した場合は `hermes doctor` がそれを示し、直し方の手がかりも表示します。

## Windows で Hermes を動かすときの実務的なメモ {#running-hermes-on-windows-practical-notes}

### インストール後の PATH {#path-after-install}

インストーラは `[Environment]::SetEnvironmentVariable` を使って、**ユーザーの PATH** に `%LOCALAPPDATA%\hermes\bin` を追加します。すでに開いている端末には反映されないので、インストール後に新しい PowerShell のウィンドウ（または Windows Terminal のタブ）を開いてください。よく分かっている場合を除き、手作業で `$env:PATH += …` とせず、いったん閉じて開き直すのが確実です。

確認方法は次のとおりです。

```powershell
Get-Command hermes        # should print C:\Users\<you>\AppData\Local\hermes\bin\hermes.exe
hermes --version
```

### 環境変数 {#environment-variables}

Hermes は `$env:X`（そのプロセスの範囲）と、ユーザーの環境変数（恒久的な設定。システムのプロパティ → 環境変数で設定）の両方を尊重します。API キーは `%LOCALAPPDATA%\hermes\.env`（つまり `HERMES_HOME`）に置くのがふつうのやり方で、Linux と同じです。

```
OPENROUTER_API_KEY=sk-or-...
TELEGRAM_BOT_TOKEN=...
```

秘密の値をユーザーの環境変数に置くのは、Windows のすべてのプロセスから見えてよいと考えている場合だけにしてください（ふつうは望むところではありません）。

### Windows 固有の環境変数 {#windows-specific-env-vars}

次の変数は、Windows ネイティブのインストールにだけ効きます。

| 変数 | 効果 |
|---|---|
| `HERMES_GIT_BASH_PATH` | bash.exe の探索先を上書きします。Git for Windows の完全版、シンボリックリンク経由の WSL の bash、MSYS2、Cygwin など、どの bash でも指定できます。インストーラが自動で設定します。 |
| `HERMES_DISABLE_WINDOWS_UTF8` | `1` を設定すると UTF-8 の標準入出力の調整を無効にし、ロケールのコードページに戻します。文字コードの不具合を切り分けるときに役立ちます。 |
| `EDITOR` / `VISUAL` | `/edit` と `Ctrl-X Ctrl-E` で使うエディタです。どちらも未設定なら、Hermes は `notepad` を既定にします。 |

## アンインストール {#uninstall}

PowerShell から次を実行します。

```powershell
hermes uninstall
```

これがきれいなやり方です。schtasks の登録、スタートアップフォルダのショートカット、`hermes.cmd` のラッパーを取り除き、`%LOCALAPPDATA%\hermes\hermes-agent\` を削除し、ユーザーの PATH を整えます。入れ直す場合に備えて、`%LOCALAPPDATA%\hermes\` のそれ以外（設定、認証情報、スキル、セッション、ログ）はそのまま残します。

すべて消したい場合は次のようにします。

```powershell
hermes uninstall
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\hermes"
# Also remove a legacy CLI/WSL data dir if you ever used one:
Remove-Item -Recurse -Force "$env:USERPROFILE\.hermes"
```

CLI の `hermes uninstall` は、schtasks の登録が別のタスク名で行われている場合（古いインストール）にも対応します。タスク名を決め打ちにせず、インストール先のパスから探すためです。

## プロセス管理の内部事情 {#process-management-internals}

ここは背景の説明です。「勝手に自分を止めてしまう」ような不可解な動きを調べているのでなければ、読み飛ばして構いません。

Linux と macOS では、POSIX の慣用句である `os.kill(pid, 0)` は何もしない権限確認です。「この PID は生きていて、自分はシグナルを送れるか」を尋ねるだけです。ところが Windows では、Python の `os.kill` が `sig=0` を `CTRL_C_EVENT` に対応付けてしまいます（どちらも整数の 0 でぶつかります）。そして `GenerateConsoleCtrlEvent(0, pid)` を経由するため、対象の PID を含む**コンソールのプロセスグループ全体**に Ctrl+C が送られます。これが [bpo-14484](https://bugs.python.org/issue14484) で、2012 年から未解決のままです。現在の挙動に頼っているスクリプトが壊れてしまうため、修正されることはありません。

その結果、Windows で「この PID が生きているか確認する」ために `os.kill(pid, 0)` を使っていた処理は、気づかないうちに対象を止めていました。Hermes は該当する箇所すべて（11 ファイルにまたがる 14 か所）を `gateway.status._pid_exists()` に移しました。こちらは `psutil.pid_exists()` を使い、その中では Windows で `OpenProcess + GetExitCodeProcess` を呼ぶだけで、シグナルは使いません。プラグインや修正を書く場合は、`psutil.pid_exists()` を直接使うか `gateway.status._pid_exists()` を使ってください。`os.kill(pid, 0)` は決して使わないでください。

これは `scripts/check-windows-footguns.py` が CI で強制しています。新しく `os.kill(pid, 0)` の呼び出しを書くと、その行に `# windows-footgun: ok — <reason>` の印が付いていない限り、`Windows footguns (blocking)` の検査に失敗します。

## よくあるつまずき {#common-pitfalls}

**インストールした直後に `hermes: command not found` と出る。**
新しい PowerShell のウィンドウを開いてください。インストーラはユーザーの PATH に `%LOCALAPPDATA%\hermes\bin` を追加しましたが、すでに開いているシェルは開き直さないと反映されません。それまでの間は `& "$env:LOCALAPPDATA\hermes\bin\hermes.exe"` で実行できます。

**ツールの実行時に `WinError 193: %1 is not a valid Win32 application` と出る。**
`.cmd` のラッパーを通さずにシェバングのスクリプトを呼んでしまっています。Hermes は `shutil.which(cmd, path=local_bin)` でコマンドを解決し、PATHEXT によって `.CMD` が拾われるようにしています。決め打ちのパスでツールを呼んでいる場合は、`.cmd` の側に切り替えてください（たとえば `npx` ではなく `npx.cmd`）。

**`[scriptblock]::Create(...)` が `The assignment expression is not valid` で失敗する。**
ダウンロードした `install.ps1` に UTF-8 の BOM が混ざっています。`irm | iex` の形は BOM を自動で取り除きますが、`[scriptblock]::Create((irm ...))` は取り除きません。単純な `irm | iex` の形で実行し直すか、スクリプトを手作業でダウンロードし、`[IO.File]::WriteAllText($path, $text, (New-Object Text.UTF8Encoding $false))` で BOM なしとして保存してください。

**再起動後にゲートウェイが動き続けてくれない。**
`hermes gateway status` を確認してください。schtasks の登録、（使っていれば）スタートアップフォルダのショートカット、稼働中の PID をまとめて表示します。schtasks が登録されているのに動いていない場合、グループポリシーが `ONLOGON` の起動条件を禁じている可能性があります。`schtasks /Query /TN HermesGateway /V /FO LIST` を実行するとタスクが失敗した理由が分かります。あるいは、いったんアンインストールし、`HERMES_GATEWAY_FORCE_STARTUP=1` を付けて入れ直すことで、スタートアップフォルダの方式に切り替えられます。

**`$env:EDITOR` を設定しても `/edit` が何もしない。**
いま動いているプロセスにだけ設定した状態です。シェルを閉じて開き直すか、システムのプロパティ → 環境変数でユーザーの範囲に設定してください。新しい PowerShell のウィンドウで `echo $env:EDITOR` を実行すると確認できます。

**ブラウザツールは起動するが、ツールの処理が時間切れになる。**
Chromium は初回の実行時に自動でインストールされます。（GitHub の回数制限や Playwright の配信元の不調で）インストールに失敗していた場合は `hermes doctor` を実行してください。Chromium が足りないことを示し、それを直すための `npx playwright install chromium` コマンドをそのまま表示します。

**`agent-browser` が Node のバージョンに関する妙なエラーで失敗する。**
インストーラは `%LOCALAPPDATA%\hermes\node` に Node 26 を用意しますが、PATH の先頭にシステムの古い Node 18 が来ているのかもしれません。Hermes の node のディレクトリを PATH の前のほうへ移すか、ほかで Node を使っていないならシステム側のインストールを削除してください。

**CLI で中国語・日本語・アラビア語の文字が `?` になる。**
UTF-8 の標準入出力の調整が働いていません。`HERMES_DISABLE_WINDOWS_UTF8` が設定されていないことを確認してください（`Get-ChildItem env:HERMES_DISABLE_WINDOWS_UTF8`）。空なのに `?` のままなら、コンソール（とても古い `cmd.exe`）が UTF-8 にまったく対応していない可能性があります。Windows Terminal に切り替えてください。

**ゲートウェイが Telegram に写真を送れず「`BadRequest: payload contains invalid characters`」と出る。**
これは Windows とは関係ありませんが、Windows で先に表面化することがあります。たいていは、JSON の本文に含まれるファイルパスの円記号がエスケープされていないことが原因です。Telegram が受け取るべきなのは Hermes が整えたパスであって、Windows の生のパスではありません。独自のプラグインの中でこれが起きているなら、利用者の入力から作った `str(Path(...))` ではなく、Hermes が渡してくるパスを使っているか確かめてください。

**`git pull` のあと「別の端末では動くのに」という文字コードの不可解な動き。**
Windows で UTF-8 以外のエディタ（古い Windows のメモ帳や一部の中国語 IME）を使って Hermes の設定やスキルを編集した場合、ファイルが BOM 付きで保存されているかもしれません。Hermes は多くの設定の読み込みで `utf-8-sig` を許容しますが、折りたたんだ YAML の値（`description: >`）の中に BOM があると、YAML の解析が静かに壊れます。BOM なしの素の UTF-8 として保存し直してください。

## 次に読むもの {#where-to-go-next}

- **[インストール](/hermes/docs/getting-started/installation/)** — Linux / macOS / WSL2 / Termux を含む、インストールのページ全体です。
- **[Windows（WSL2）ガイド](/hermes/docs/user-guide/windows-wsl-quickstart/)** — POSIX の挙動や、ダッシュボードの端末ペインが必要な場合はこちらです。
- **[CLI コマンド一覧](/hermes/docs/reference/cli-commands/)** — `hermes` のすべてのサブコマンドです。
- **[FAQ](/hermes/docs/reference/faq/)** — Windows に限らない、よくある質問です。
- **[メッセージングのゲートウェイ](/hermes/docs/user-guide/messaging/)** — Windows で Telegram / Discord / Slack を動かす方法です。
