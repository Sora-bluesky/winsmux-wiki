---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "Windows（ネイティブ）ガイド"
description: "Windows 10 / 11 で Hermes Agent をそのまま動かすためのガイド。インストール、機能の対応表、UTF-8 コンソール、Git Bash、タスクスケジューラでのゲートウェイ常駐、エディタの扱い、PATH、アンインストール、よくあるつまずきをまとめます"
upstream_path: user-guide/windows-native.md
upstream_blob: 89aa1fbdcc7198d19ee07d29667f6e52b26c3138
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/windows-native
---

# Windows（ネイティブ）ガイド {#windows-native-guide}

Hermes は Windows 10 と Windows 11 でそのまま動きます。WSL も Cygwin も Docker も要りません。このページはその詳細です。何がそのまま動き、何が WSL でしか動かないのか、インストーラが実際に何をしているのか、そして Windows ならではの調整項目を扱います。

まずインストールしたいだけであれば、[トップページ](/hermes/docs/index/) や [インストールのページ](/hermes/docs/getting-started/installation/#windows-native) にある 1 行のコマンドで足ります。何か想定と違うことが起きたときに、このページへ戻ってきてください。

:::tip WSL のほうがよい場合は
`fork` の挙動や Linux 流のファイル監視のために POSIX 環境を使いたい場合は、**[Windows（WSL2）ガイド](/hermes/docs/user-guide/windows-wsl-quickstart/)** を参照してください。両者はきれいに共存します。ネイティブのデータは `%LOCALAPPDATA%\hermes` の下に、WSL のデータは `~/.hermes` の下に置かれます。
:::

## 手早くインストールする {#quick-install}

**PowerShell**（または Windows Terminal）を開いて、次を実行します。

```powershell
iex (irm https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.ps1)
```

管理者権限は要りません。インストーラは `%LOCALAPPDATA%\hermes\` に導入し、**ユーザーの PATH** に `hermes` を追加します。終わったら新しい端末を開いてください。

**インストーラのオプション**を渡すには、スクリプトブロックの形を使います。

```powershell
& ([scriptblock]::Create((irm https://hermes-agent.nousresearch.com/install.ps1))) -NonInteractive -Branch main
```

| 引数 | 用途 |
|---|---|
| `-Branch NAME` | 取得するブランチを選びます。既定は `main` です。 |
| `-Commit SHA` | ブランチを取得したあと、特定のコミットを選びます。 |
| `-HermesHome PATH` | データディレクトリを選びます。 |
| `-InstallDir PATH` | ソースのチェックアウトを置くディレクトリを選びます。 |
| `-NonInteractive` | 入力が必要な設定とゲートウェイの段階を省きます。 |
| `-IncludeDesktop` | デスクトップアプリをビルドし、ショートカットを作ります。 |
| `-ShowResolvedPaths` | インストールはせず、決まったパスを JSON で表示します。 |
| `-Verbose` | 手順ごとに 1 行の状況表示ではなく、子コマンドの出力をすべて流します。 |
| `-Manifest` / `-ProtocolVersion` | 画面付きの準備用インストーラが使う段階のやり取りの取り決めを確認します。 |
| `-Stage NAME -Json` | 1 つの段階だけを実行し、その結果を出力します。 |

現在のスクリプトは `-NoVenv`、`-SkipSetup`、`-Tag` を受け付けません。
Windows のパスが思いがけず短い形になる原因を調べるときは、まず `-ShowResolvedPaths` を使ってください。

### MSIX / アプリ インストーラーと Microsoft Store {#msix-app-installer-and-microsoft-store}

同梱版のデスクトップアプリは、ソースから入れるスクリプトとは別物です。その MSIX パッケージは
**Windows 11 22H2 以降**が必要です。ソースのスクリプトが Windows 10 に対応しているからといって、
MSIX パッケージが Windows 10 に対応しているわけではありません。

ダウンロードした `.appinstaller` ファイルを Windows のアプリ インストーラーで開きます。署名付きの
ユニバーサル バンドルがインストールされ、更新の取得元が記録されます。パッケージには
Python、Node、対応する依存関係、ビルド済みの画面が含まれます。初回起動時にチェックアウトを
クローンしたり、基本の実行環境をビルドしたりはしません。

MSIX の実行エイリアスとして、`hermes`、`hermes-agent`、`hermes-acp` が使えます。
別のインストールがエイリアスを覆い隠している場合は、`Get-Command hermes -All` で確認してください。
エイリアスは、Windows の設定 → アプリ → アプリの詳細設定 → アプリ実行エイリアス で
切り替えられます。

サイドロード版の更新は、アプリの「更新」操作と Windows のアプリ インストーラーで行います。
Hermes は終了処理の前に更新情報のファイルを手元にダウンロードし、自動で起動し直すよう登録します。
`ms-appinstaller:` の URL プロトコルは必要ありません。更新の確認結果が不明なときは、
パッケージが最新だという意味ではありません。

Microsoft Store 版は、Partner Center で登録したパッケージ ID と Store の更新を使います。
サイドロード版の配信元は使いません。どちらの同梱版の実行環境でも、`hermes update` が
パッケージのファイルに対して Git を実行することはありません。

`Hermes-Setup.exe` はこれとは別の、準備用のインストーラです。スクリプトを通してソースの
チェックアウトを用意します。自己完結型の MSIX パッケージと混同しないでください。
[更新とアンインストール](/hermes/docs/getting-started/updating/) を参照してください。

### 依存関係の準備 {#dependency-bootstrap}

管理対象のツールは PM が受け持ちます。機能側のコードは、インストーラを実行し直すのではなく、
必要なパッケージを PM に求めます（`pm.ensure("<package>")`。たとえば Computer Use なら `cua-driver`）。
すでに入っているツールは PM が記録した状態から再利用され、足りない任意のツールは、
[`security.allow_lazy_installs`](/hermes/docs/reference/package-management/#lazy-install-policy)
が許可している場合にだけ、必要になった時点で取得されます。`install.ps1` に `-Ensure` の動作はありません。

```powershell
hermes pm doctor
hermes pm install
```

## ソースのインストーラが行うこと {#what-the-source-installer-does}

1. Git を探し、無ければ検証済みの版に固定した Git for Windows を用意します。
2. 選んだブランチでリポジトリをクローンし、指定があればコミットに固定します。
3. uv を準備し、最初の Python 環境を作ります。
4. PM を実行して、Python 3.14、必要なツール、Python の `all` 追加機能を用意します。
5. データの置き場所にある `bin` ディレクトリに CLI の起動用ファイルを作り、そこをユーザーの PATH に追加します。
6. 設定を用意し、省く指定がなければ、対話的な初期設定とゲートウェイの段階を呼び出します。
7. 求められていれば、デスクトップアプリをビルドし、スタートメニューとデスクトップのショートカットを作ります。
8. 準備が終わったことを示す印を書き込みます。

実行時の起動用ファイルは、PM が管理する Python を実行し、読み込みの前に依存関係の
環境を選びます。PM は、動いているプロセスがすでに読み込んだライブラリを置き換えずに、
書き込み可能な新しい環境を公開できます。段階的に pip へ切り替えて、入る機能を
黙って減らすような仕組みはありません。

:::tip Windows でのプロバイダ探しを省く
Windows では、ツールごとの API キーの設定（Firecrawl、FAL、Browser Use、OpenAI TTS）が、使えるエージェントを整えるうえで最も手間のかかるところです。[Nous Portal](/hermes/docs/user-guide/features/tool-gateway/) を契約すると、モデル**と**それらのツールがすべて 1 回の OAuth ログインでまかなえます。インストーラが終わったら `hermes setup --portal` を実行して、まとめて設定してください。
:::

## 機能の対応表 {#feature-matrix}

Windows での対応は、機能と CPU の種類ごとに異なります。基本の画面や操作はそのまま動きますが、
一部の任意の SDK は特定の環境で除外されています。

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
| ダッシュボードの `/chat` に埋め込まれた端末のペイン | `pywinpty` を通した ConPTY | POSIX の PTY |
| ログイン時の自動起動 | ✓（schtasks） | ✓（systemd） |

ダッシュボードは、Windows では `pywinpty`/ConPTY の橋渡しを、POSIX では `ptyprocess`
を使います。ネイティブの依存関係が無かったり壊れていたりすると、端末が使えなくなることがあります。
WSL は代わりの手段の 1 つであって、現在の設計で必須というわけではありません。

### 任意の依存関係の制限 {#optional-dependency-limits}

- Matrix のネイティブの暗号化対応アダプタは Linux 専用です。Windows では、対応している
  プロキシ経由の方法か、Linux の実行先を使ってください。
- Windows ネイティブの ARM64 では、`mem0` と `google-chat` の SDK の追加機能、および
  openWakeWord のエンジンが除外されます。Sherpa は Windows ネイティブの ARM64 に対応しており、
  その環境では呼びかけ語の検出に自動で使われる既定のエンジンです。
- 手元で動かす Faster-Whisper の音声認識は、Windows ネイティブの ARM64 では除外されます。
  クラウドかコマンド方式の音声認識のプロバイダを使ってください。呼びかけ語のエンジンとしては Porcupine も引き続き選べます。

`pyproject.toml` のプラットフォーム指定が、パッケージに含まれる依存関係の組み合わせを決めます。
ゲートウェイや音声機能についての一般的な説明が、その指定より優先されることはありません。

## Hermes が Windows でシェルのコマンドを実行する仕組み {#how-hermes-runs-shell-commands-on-windows}

Hermes の端末ツールは、**Git Bash** を通してコマンドを実行します。Claude Code と同じやり方です。これにより、すべてのツールを書き直すことなく、POSIX と Windows の隔たりを回避できます。

Bash を探すのは `pm.shell()` の役目です。まず PM の記録にある Git のパッケージを確認し、
次に用意された `PATH` を確認します。PATH 上の候補が WindowsApps の
パッケージに属している場合は、通常の Git for Windows のインストールがあればそちらを優先します。

パッケージに含まれるツールは、汎用に使える端末上のインストールではありません。外部の Python の
プロセスが WindowsApps のパッケージ内の実行ファイルを起動しようとすると、`WinError 5` で失敗することがあります。
パッケージ自身の起動用ファイルを使うか、ソースのチェックアウトでは通常のツールを使ってください。
この境界を回避するために、Windows のセキュリティ機能を無効にしないでください。

現在のインストーラは `HERMES_GIT_BASH_PATH` を設定しません。MinGit は、Bash を含む
Git for Windows の代わりにはなりません。

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

1. `schtasks /Create /SC ONLOGON /RL LIMITED /TN Hermes_Gateway` — ログイン時に、昇格していない通常の権限で動くタスクを登録します。UAC の確認は出ません。
2. グループポリシーで schtasks が禁じられている場合は、小さな `Hermes_Gateway.vbs` という起動用のファイル（`wscript.exe` で画面に出さずに実行されます）を `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup` に書き出す方式に切り替えます。効果は同じで、作りが少し素朴なだけです。`cmd.exe` のショートカットではなく VBScript を使うのは、ログイン時に割り当てられたコンソールが閉じる合図を受け取ると、ゲートウェイが起動し終わる前に落ちてしまうことがあるからです。
3. ゲートウェイは `python.exe` ではなく **`pythonw.exe` で切り離して起動します**。`pythonw.exe` にはコンソールが結び付かないため、同じ立場のプロセスから飛んでくる `CTRL_C_EVENT` の影響を受けません（同じプロセスグループで何かを Ctrl+C したときにゲートウェイが落ちる、という実際に起きていた問題への対策です）。

起動時に使うフラグは `DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP | CREATE_NO_WINDOW | CREATE_BREAKAWAY_FROM_JOB` です。

### 管理 {#manage}

```powershell
hermes gateway status      # Merged view: schtasks + Startup folder + running PID
hermes gateway start       # Starts the gateway in the background (asks about login auto-start only on a TTY when nothing is installed)
hermes gateway stop        # Writes the planned-stop marker, waits for the gateway to drain (≤ agent.restart_drain_timeout, capped at 30 s), then force-kills only if it is still alive
hermes gateway restart     # Same drain-first stop, then a fresh start
hermes gateway uninstall   # Removes schtasks entry, Startup shortcut, pid file
```

`hermes gateway status` は何度実行しても同じ結果になります。千回続けて呼んでも、うっかりゲートウェイを止めてしまうことはありません。（PR #21561 より前は、C の層で `os.kill(pid, 0)` が `CTRL_C_EVENT` とぶつかり、実際に止めてしまっていました。経緯が気になる場合は後述の「プロセス管理の内部事情」を参照してください。）

ログイン時の自動起動が登録されるのは、はっきり求めたときだけです。つまり `hermes gateway install` を実行したとき、実際の端末で `Y` と答えたとき、または `HERMES_GATEWAY_INSTALL_START_ON_LOGIN=1` を設定したときです。スクリプトやパイプから `hermes gateway start` を実行した場合（TTY が無い、または `HERMES_NONINTERACTIVE=1`）は、タスクスケジューラにもスタートアップフォルダにも触れずにゲートウェイを起動します。端末でもこの確認を省きたい場合は、`HERMES_GATEWAY_INSTALL_START_ON_LOGIN=0` を設定してください。

### なぜ Windows サービスにしないのか {#why-not-a-windows-service}

サービスはインストールに管理者権限が要り、ゲートウェイの生存期間がユーザーのログインではなく端末の起動に結び付いてしまいます。Hermes を使う人がふつうに望むのは「ログインすればゲートウェイが使える、ログアウトすれば消える」という形です。タスクスケジューラは、昇格なしでちょうどそれを実現します。どうしてもサービスにしたい場合は `nssm` や `sc create` を手作業で使えますが、おそらくその必要はありません。それでも作るなら、名前を `Hermes*` にするか、実行ファイルのパスを Hermes を入れた場所の中（`venv\Scripts\hermes.exe`、チェックアウトしたディレクトリ、`gateway-service\` のいずれか）に向けてください。`hermes update` は、サービス制御マネージャーを通して Hermes のものだと確かに言い切れるサービスだけを止めて動かし直し、タスクスケジューラから起動したゲートウェイは PID を見て一時停止します（タスクスケジューラそのものには手を触れません）。

## データの配置 {#data-layout}

| パス | 中身 |
|---|---|
| `%LOCALAPPDATA%\hermes\hermes-agent\` | スクリプトで入れた場合のソースのチェックアウト。MSIX だけで入れた場合はありません。 |
| `%LOCALAPPDATA%\hermes\tools\` | 書き込み可能な、管理対象ツールの置き場所。MSIX の基本ツールはパッケージの中に残ります。 |
| `%LOCALAPPDATA%\hermes\installs\` | インストールごとの実行環境の選択、記録、Python の世代。 |
| `%LOCALAPPDATA%\hermes\bin\` | ソースから入れた場合の CLI の起動用ファイル。MSIX では代わりに実行エイリアスが使われます。 |
| `%LOCALAPPDATA%\hermes\` | 利用者の設定、認証情報、セッション、プラグイン、スキル、ログ。 |

これらは既定のパスです。`HERMES_HOME` やインストーラのパスの引数で変えられます。
`%LOCALAPPDATA%\hermes` を丸ごと削除すると、利用者のデータも消え、同じ場所を共有している
ほかのインストールにも影響することがあります。アプリを直す目的でその最上位を削除せず、
アンインストールのコマンドか Windows のパッケージの削除を使ってください。

## ブラウザツール {#browser-tool}

ブラウザの準備は、選んだ実行方式によって異なります。組み込みの方式では、PM が版を固定した
`agent-browser` と Chromium のパッケージを用意します。Browser Use は
`hermes tools` を通して、管理された独自の CLI をインストールします。自己完結型の
MSIX には、対応するブラウザツールが中身に含まれています。

Windows の ARM64 では、版を固定した Chromium と `agent-browser` の実行ファイルが
Windows の x64 エミュレーションで動くことがあります。これは ARM64 ネイティブの Python の実行環境とは異なります。
実行方式の選び方は [ブラウザの自動操作](/hermes/docs/user-guide/features/browser/) を参照してください。

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
| `HERMES_DISABLE_WINDOWS_UTF8` | `1` を設定すると UTF-8 の標準入出力の調整を無効にし、ロケールのコードページに戻します。文字コードの不具合を切り分けるときに役立ちます。 |
| `EDITOR` / `VISUAL` | `/edit` と `Ctrl-X Ctrl-E` で使うエディタです。どちらも未設定なら、Hermes は `notepad` を既定にします。 |

## アンインストール {#uninstall}

PowerShell から次を実行します。

```powershell
hermes uninstall
```

ソースから入れた場合、アンインストーラは Hermes が作った起動用ファイル、サービスの登録、
アプリのファイルを取り除きます。削除の前に `hermes uninstall --dry-run` で内容を確認してください。
`--full` はデータも削除し、`--data` はパッケージのコードを残したままデータだけを削除します。
MSIX や Store から入れた場合は、Windows の設定 →
アプリ → インストールされているアプリ から削除してください。CLI はパッケージが持つコードの削除を拒否します。

:::caution 利用者のデータの削除
データを削除する前に、選んだ `HERMES_HOME` を使っている Hermes のプロセスをすべて止め、バックアップを取ってください。
データを削除する方式を選ぶ前に、`hermes uninstall --dry-run` で内容を確認してください。
1 つのアプリやプロファイルを直すために、既定のデータの最上位を丸ごと削除しないでください。
独自の `HERMES_HOME` は別の場所にあることがあり、パッケージを削除してもそのデータは消えません。
:::

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
`hermes gateway status` を確認してください。schtasks の登録、（使っていれば）スタートアップフォルダのショートカット、稼働中の PID をまとめて表示します。schtasks が登録されているのに動いていない場合、グループポリシーが `ONLOGON` の起動条件を禁じている可能性があります。`schtasks /Query /TN Hermes_Gateway /V /FO LIST`（プロファイルに名前を付けている場合は `Hermes_Gateway_<profile>`）を実行すると、タスクが失敗した理由が分かります。スタートアップフォルダを使う方式に切り替わるのは、`schtasks` そのものがタスクの登録に失敗したときだけです。これを強制するための環境変数や指定はありません。

**`$env:EDITOR` を設定しても `/edit` が何もしない。**
いま動いているプロセスにだけ設定した状態です。シェルを閉じて開き直すか、システムのプロパティ → 環境変数でユーザーの範囲に設定してください。新しい PowerShell のウィンドウで `echo $env:EDITOR` を実行すると確認できます。

**ブラウザツールは起動するが、ツールの処理が時間切れになる。**
`hermes doctor` と `hermes pm doctor` を実行してください。選ばれているブラウザの実行方式は `hermes tools` で
確認できます。署名付きのアプリの中身に、無関係な版の Playwright を
インストールしないでください。

**`agent-browser` が Node のバージョンに関するエラーを出す。**
`hermes pm doctor` を実行し、どの Hermes の起動用ファイルがそのプロセスを起動したかを確認してください。
管理された Node の版は PM が用意します。Hermes を直すために、無関係なシステムの Node の
インストールを削除しないでください。

**CLI で中国語・日本語・アラビア語の文字が `?` になる。**
UTF-8 の標準入出力の調整が働いていません。`HERMES_DISABLE_WINDOWS_UTF8` が設定されていないことを確認してください（`Get-ChildItem env:HERMES_DISABLE_WINDOWS_UTF8`）。空なのに `?` のままなら、コンソール（とても古い `cmd.exe`）が UTF-8 にまったく対応していない可能性があります。Windows Terminal に切り替えてください。

**ゲートウェイが Telegram に写真を送れず「`BadRequest: payload contains invalid characters`」と出る。**
これは Windows とは関係ありませんが、Windows で先に表面化することがあります。たいていは、JSON の本文に含まれるファイルパスの円記号がエスケープされていないことが原因です。Telegram が受け取るべきなのは Hermes が整えたパスであって、Windows の生のパスではありません。独自のプラグインの中でこれが起きているなら、利用者の入力から作った `str(Path(...))` ではなく、Hermes が渡してくるパスを使っているか確かめてください。

**`git pull` のあと「別の端末では動くのに」という文字コードの不可解な動き。**
Windows で UTF-8 以外のエディタ（古い Windows のメモ帳や一部の中国語 IME）を使って Hermes の設定やスキルを編集した場合、ファイルが BOM 付きで保存されているかもしれません。Hermes は多くの設定の読み込みで `utf-8-sig` を許容しますが、折りたたんだ YAML の値（`description: >`）の中に BOM があると、YAML の解析が静かに壊れます。BOM なしの素の UTF-8 として保存し直してください。

## 次に読むもの {#where-to-go-next}

- **[インストール](/hermes/docs/getting-started/installation/)** — Linux / macOS / WSL2 を含む、インストールのページ全体です。
- **[Windows（WSL2）ガイド](/hermes/docs/user-guide/windows-wsl-quickstart/)** — POSIX の挙動や、ダッシュボードの端末ペインが必要な場合はこちらです。
- **[CLI コマンド一覧](/hermes/docs/reference/cli-commands/)** — `hermes` のすべてのサブコマンドです。
- **[FAQ](/hermes/docs/reference/faq/)** — Windows に限らない、よくある質問です。
- **[メッセージングのゲートウェイ](/hermes/docs/user-guide/messaging/)** — Windows で Telegram / Discord / Slack を動かす方法です。
