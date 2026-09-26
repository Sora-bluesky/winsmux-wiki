---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "インストール"
description: "デスクトップ版パッケージ、ソースからのインストーラー、Docker、Nix、Termux の APT パッケージで Hermes Agent を導入する"
upstream_path: getting-started/installation.md
upstream_blob: 29f41a40e632898449a1158604ff53a646d1f6ff
sources:
  - https://hermes-agent.nousresearch.com/docs/getting-started/installation
---

# インストール {#installation}

Hermes Agent は 2 分もかからずに動く状態になります。

:::tip 対応プラットフォーム
対応 OS・配布方法・プラットフォームごとに制限のある機能をまとめた一覧は、
**[対応プラットフォーム](/hermes/docs/getting-started/platform-support/)** をご覧ください。
:::

## 手早く導入する {#quick-install}
### macOS / Windows のデスクトップ版パッケージ {#desktop-packages-on-macos-or-windows}

お使いのプラットフォーム向けのパッケージを
[Hermes の公式サイト](https://hermes-agent.nousresearch.com/)からダウンロードします。

- **Windows:** ダウンロードした `.appinstaller` を Windows アプリ インストーラーで開きます。
  署名済みの MSIX バンドルがインストールされ、更新の取得元も記録されます。
  Microsoft Store 版のパッケージは Store 側の管理になり、これとは別です。
- **macOS:** DMG を開き、`Hermes.app` をアプリケーションフォルダーにコピーします。ZIP 版の
  配布物には、自動アップデーターが使う署名済みのアプリが入っています。

パッケージ版には、エージェント本体、Python、対応する依存パッケージ、ビルド済みの
画面一式が同梱されています。初回起動時にこの基本の実行環境をビルドすることはありません。ただし、プロバイダーへの接続や
任意で追加する連携機能には、引き続きネットワーク接続が必要な場合があります。

`Hermes-Setup` というブートストラップ用のインストーラーは別物です。こちらはソースを
ダウンロードしてインストールし、デスクトップアプリをビルドします。Light はリモート専用のビルド版で、
ローカルの実行環境を同梱したものではありません。[Hermes Desktop](/hermes/docs/user-guide/desktop/) をご覧ください。

:::note
macOS 版のインストーラーは **Apple Silicon 専用** です。x86（Intel）プロセッサーの macOS は [対応プラットフォームに含まれていません](/hermes/docs/getting-started/platform-support/#unsupported)。
:::

### Hermes Desktop を使わない場合 {#without-hermes-desktop}
Hermes Desktop なしでコマンドライン版だけを入れるときは、次を実行します。

#### Linux / macOS / WSL2 {#linux-macos-wsl2}
```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
```

#### Windows（ネイティブ） {#windows-native}

PowerShell で実行します。
```powershell
iex (irm https://hermes-agent.nousresearch.com/install.ps1) 
```

コマンドライン版だけを入れたあとで Hermes Desktop も導入して起動したくなったら、次を実行するだけです。
```bash
hermes desktop
```

### Android / Termux {#android-termux}

aarch64 の Android 端末では [Termux の APT パッケージ](/hermes/docs/getting-started/termux/)を使います。
`pkg install hermes-agent` を実行する前に、署名付きのリポジトリを設定してください。
デスクトップ / サーバー向けのスクリプトは、Termux でのインストール手段ではありません。

### ソースからのインストーラーが行うこと {#what-the-source-installer-does}

スクリプトはソースをクローンし、uv を用意したうえで、依存パッケージの準備を
PM に任せます。PM は、バージョンを固定した Python、Node.js、npm、ripgrep、FFmpeg を用意します。ソースからの
インストールでは Python の `all` extra が選ばれます。任意の extra がすべて入るわけではありません。
PM は既定でブラウザ用ツール（`agent-browser` と、バージョンを固定した Chromium）も入れます。
このダウンロードに失敗してもインストールそのものは最後まで進み、再試行用の
コマンドが表示されます。そのほかの任意ツールは、それぞれの機能ごとのインストール手順で
入れます。

ブラウザ用ツールを入れたくない場合は、POSIX では `--skip-browser`、Windows では `-SkipBrowser`
を渡します。Hermes はこの選択を覚えていて、あとのインストールや `hermes update` でも
ブラウザ用ツールを入れ直しません。入れたくなったら `hermes pm install agent-browser` を実行すると、ツールが入り、
この選択も取り消されます。

スクリプトは起動用のランチャーを作り、データディレクトリを用意します。対話モードで実行した場合は、
セットアップとゲートウェイの設定も続けて始まります。POSIX の `--non-interactive`、Windows の
`-NonInteractive` を付けると、入力が必要な段階を飛ばします。任意で付けられる
`--include-desktop` / `-IncludeDesktop` を指定すると、デスクトップ版をソースからビルドします。

ターミナルで実行すると、スクリプトは手順ごとに 1 行の進行状況を表示し、git・uv・各ビルドの
出力は Hermes のデータディレクトリ配下の `logs/install.log` に書き出します。
失敗した手順があると、その出力の最後の数行とログのパスが表示されます。CI（`CI` または
`GITHUB_ACTIONS` が設定されている環境）、出力をリダイレクトしている場合、`--verbose` / `-Verbose`、
`HERMES_INSTALL_VERBOSE=1` のいずれかでは、すべての出力をそのまま流します。

#### インストール先の構成 {#install-layout}

| 方法 | コードの場所 | CLI の起動口 | ユーザーデータの既定の場所 |
|---|---|---|---|
| POSIX 用のソーススクリプト | `~/.hermes/hermes-agent/` | `~/.local/bin/hermes` のラッパー | `~/.hermes/` |
| Windows 用のソーススクリプト | `%LOCALAPPDATA%\hermes\hermes-agent\` | `%LOCALAPPDATA%\hermes\bin\` | `%LOCALAPPDATA%\hermes\` |
| デスクトップ版パッケージ | インストールしたアプリのパッケージ内 | パッケージ同梱のランチャー、Windows ではアプリ実行エイリアス | プラットフォームごとの既定の Hermes データディレクトリ |
| Docker | `/opt/hermes/` | イメージのエントリーポイントと `hermes` のシム | マウントした `/opt/data/` |
| Termux APT | `$PREFIX/lib/hermes-agent/` | `$PREFIX/bin/` 内のシンボリックリンク | `~/.hermes/` |

ユーザーデータの場所は `HERMES_HOME` で決まります。POSIX 用スクリプトの `--dir` は、ソースの
チェックアウト先をそれとは別に指定します。Windows では `-HermesHome` と `-InstallDir` を使います。
POSIX 用スクリプトを root で実行しても、自動で FHS 配置になるわけではありません。
ソースの場所を明示しない限り、root のホームディレクトリが使われます。

PM のツール置き場と、インストールごとの Python の世代は、それぞれ別に管理され、残る期間も異なります。
置き場所は [パッケージ管理](/hermes/docs/reference/package-management/) をご覧ください。
アプリのインストールを直す目的で、データのルートディレクトリを削除しないでください。

### インストールしたあと {#after-installation}

シェルを読み込み直せば、そのまま会話を始められます。

```bash
source ~/.bashrc   # or: source ~/.zshrc
hermes             # Start chatting!
```

あとから個別の設定を変えたいときは、それぞれ専用のコマンドを使います。

```bash
hermes model          # Choose your LLM provider and model
hermes tools          # Configure which tools are enabled
hermes gateway setup  # Set up messaging platforms
hermes config set     # Set individual config values
hermes config get     # Inspect individual config values
hermes setup          # Or run the full setup wizard to configure everything at once
```

:::tip いちばん速い経路: Nous Portal
1 つのサブスクリプションで 300 以上のモデルに加えて [Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/)（ウェブ検索、画像生成、TTS、クラウドブラウザ）まで使えます。ツールごとに API キーをやりくりする手間はいりません。

```bash
hermes setup --portal
```

このコマンド 1 つで、ログイン、プロバイダーを Nous に設定、Tool Gateway の有効化まで済みます。
:::

:::tip すでに別のマシンで Hermes を動かしていますか？
設定を一から作り直す必要はありません。`hermes import` でバックアップを丸ごと復元する（[Exporting Hermes to another machine](/hermes/docs/reference/faq/#exporting-hermes-to-another-machine) を参照）か、`hermes profile import` でエージェントを 1 つだけ移す（[Moving a single profile to another machine](/hermes/docs/reference/faq/#moving-a-single-profile-to-another-machine) を参照）ことができます。なお、プロファイルのエクスポートは設計上、認証情報を含みません。つまりエクスポートだけでは完全なバックアップになりません。どちらを使うべきかは [`hermes backup` vs `hermes profile export`](/hermes/docs/reference/faq/#hermes-backup-vs-hermes-profile-export) で説明されています。
:::

---

## 前提条件 {#prerequisites}

POSIX 用のソーススクリプトを使うには、Git、curl、tar、SHA-256 のチェック用ツールを用意してください。
Windows では、Git が入っていなければ、バージョンを固定した Git for Windows のアーカイブを自動で用意できます。
uv がすでにあればそれを使って PM を準備します。なければ、スクリプトが検証済みの固定版をダウンロードします。

現在の公式のインストールは **Python 3.14** で動きます。`pyproject.toml` にある
`>=3.11,<3.15` という広めの範囲は、古い Python のインストールでもアップデーターを
動かせるようにして、PM が 3.14 へ切り替えるまでをつなぐためのものです。3.11〜3.13 で現在の
実行環境が動くことを約束するものではありません。PM が使うツールのバージョンは
`pm/lock.json` で決まります。システムに入っている任意のバージョンの Node を、
インストール先の実行環境として採用することはありません。

ソースからビルドする場合は、ネイティブのコンパイラーとプラットフォームの開発用ライブラリが必要になることがあります。
Electron をソースからビルドするなら、Node のネイティブモジュール用の要件も加わります。これらの
ビルド用の前提条件は、完成品のデスクトップ版パッケージを入れる場合には当てはまりません。
Linux の Chromium には、ディストリビューションが提供するシステムライブラリも必要です。

:::tip Nix を使っている方へ
Nix は **明示的にサポートされるインストール経路ではなくなりました**（ベストエフォートでの対応のみです）。すでに Nix を使っている場合（NixOS、macOS、Linux のいずれでも）、Nix flake、宣言的な NixOS モジュール、任意で使えるコンテナモードを備えた専用のセットアップ経路があります。**[Nix & NixOS のセットアップ](/hermes/docs/getting-started/nix-setup/)** ガイドをご覧ください。
:::

---

## 手動インストール / 開発者向けインストール {#manual-developer-installation}

ソースをチェックアウトして使う場合は、まず
[PM を使った開発の流れ](/hermes/docs/reference/package-management/#developer-workflow)をご覧ください。
環境の有効化、日々使うコマンド、依存パッケージの更新、現時点でのブートストラップの制限をまとめています。
テスト用の環境とチェックは、別ページの [開発環境のセットアップ](/hermes/docs/developer-guide/contributing/#development-setup) で扱っています。

---

## sudo なしの環境 / システムサービス用ユーザーでのインストール {#non-sudo-system-service-user-installs}

ソースからのインストーラーは、実際にサービスを動かすユーザーで実行してください。そのユーザーのホーム、ツール置き場、
設定、ランチャーは、すべてそのユーザーの持ち物である必要があります。

1. 管理者として、ソースからのビルドに必要な前提条件と、使うブラウザのバックエンドが必要とする
   Linux のライブラリを入れます。
2. サービス用ユーザーとして、通常のインストーラーを実行します。

   ```bash
   curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
   ```

3. 実際のランチャーがあるディレクトリを、サービス用ユーザーのシェル環境に追加します。

   ```bash
   export PATH="$HOME/.local/bin:$PATH"
   ```

4. そのアカウントで `hermes doctor` を実行します。インストールされたラッパーを使い、
   `venv/bin/hermes` のようなパスを直接書いて呼ばないでください。
5. ログアウトしても止まらない Linux のユーザーサービスにするには、管理者として lingering を有効にします。

   ```bash
   sudo loginctl enable-linger SERVICE_USER
   ```

現在のソースからのインストーラーは、Playwright の `--with-deps` ステップを実行しません。
パッケージマネージャーごとに sudo で代わりに入れる仕組みもありません。PM が管理するのはツールのバイナリで、
システムライブラリは管理者が用意します。
[ブラウザ自動化](/hermes/docs/user-guide/features/browser/) と
[メッセージングゲートウェイ](/hermes/docs/user-guide/messaging/) をご覧ください。

---

## 困ったときは {#troubleshooting}

| 症状 | 対処 |
|---------|----------|
| `hermes: command not found` | シェルを読み込み直す（`source ~/.bashrc`）か、PATH を確認する |
| `API key not set` | `hermes model` を実行してプロバイダーを設定するか、`hermes config set OPENROUTER_API_KEY your_key` を実行する |
| 更新後に設定が失われた | `hermes config check` を実行してから `hermes config migrate` を実行する |

さらに詳しく調べたいときは `hermes doctor` を実行してください。何が足りないのか、どう直せばよいのかを具体的に教えてくれます。

### シンボリックリンクにしたホームディレクトリと外部ストレージ {#symlinked-home-directories-and-external-storage}

Hermes は、`HERMES_HOME` 自体をシンボリックリンクにする使い方にも、ホーム直下のディレクトリをリンクにする使い方にも対応しています。
`hooks`・`skills`・`sessions`・`logs` も対象です。ホームの初期化では、
すでにあるディレクトリのリンクはそのまま残り、リンク先のディレクトリ
（および `logs/curator` のようなその配下）の権限は持ち主の設定に任せます。

リンク先が見つからない、アクセスできない、ディレクトリではない、のいずれかだった場合、初期化は止まり、
パスとリンク先を書いたストレージのエラーになります。Hermes はリンクを差し替えたり、足りないリンク先を
作ったりは**しません**。外付けや NAS のボリュームが外れているときにそれをやると、ローカルのディスクへ
データを書いてしまうからです。表示されたリンクを確かめ、マウントし直すかリンク先を直し、アクセス権を
確認してからやり直してください。意図してドットファイルの置き場を新しくするなら、目的のストレージが
使える状態だと確かめたうえで、自分で作ってください。

`hermes doctor` はこの失敗を、YAML の不備ではなくストレージの問題として報告します。
いまの `config.yaml` はそのまま残してください。ディレクトリが使えない状態は `hermes setup` では直りません。これは
ディレクトリが使えるかどうかの確認であって、マウントの監視ではありません。
ディレクトリが存在することは、目的のボリュームがマウントされている証拠にはならないからです。

## インストール方法の自動判別 {#install-method-auto-detection}

更新を誰が担うかは、データの置き場所だけでなく、実際に動いているインストールによって決まります。
ソースのチェックアウトは、Hermes が管理する Git 経由の更新を使います。デスクトップ版パッケージ、Docker、
Nix、Termux のパッケージは、それぞれのパッケージ側の更新の仕組みを使い続けます。
`hermes doctor` は、どの方法でインストールされたかを表示します。パッケージが管理するファイルを変更する前に、
[更新とアンインストール](/hermes/docs/getting-started/updating/) をご覧ください。
