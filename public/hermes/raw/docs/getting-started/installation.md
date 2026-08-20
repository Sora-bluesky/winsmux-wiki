---
title: "インストール"
description: "Linux、macOS、WSL2、Windows ネイティブ、Android（Termux）に Hermes Agent を導入する手順"
upstream_path: getting-started/installation.md
upstream_blob: 3689db72ac1b2c3faa07164e509200d8f64abdad
sources:
  - https://hermes-agent.nousresearch.com/docs/getting-started/installation
---

# インストール {#installation}

Hermes Agent は 2 分もかからずに動く状態になります。

:::tip 対応プラットフォーム
対応 OS・配布方法・プラットフォームごとに制限のある機能をまとめた一覧は、**[対応プラットフォーム](/hermes/docs/getting-started/platform-support/)** をご覧ください。
:::

## 手早く導入する {#quick-install}
### macOS / Windows で Hermes Desktop インストーラーを使う（推奨） {#with-the-hermes-desktop-installer-on-macos-or-windows-recommended}
コマンドライン版とデスクトップ版をまとめて手軽に入れたい場合は、公式サイトから [Hermes Desktop インストーラーをダウンロード](https://hermes-agent.nousresearch.com/) して実行してください。

### Hermes Desktop を使わない場合 {#without-hermes-desktop}
Hermes Desktop なしでコマンドライン版だけを入れるときは、次を実行します。

#### Linux / macOS / WSL2 / Android（Termux） {#linux-macos-wsl2-android-termux}
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

### インストーラーが行うこと {#what-the-installer-does}

インストーラーはすべてを自動で処理します。依存関係（Python、Node.js、ripgrep、ffmpeg）の導入、リポジトリのクローン、仮想環境の作成、どこからでも呼べる `hermes` コマンドの設定、LLM プロバイダーの設定まで一通り済ませます。終わったころには、すぐ会話を始められる状態になっています。

#### インストール先の構成 {#install-layout}

インストーラーが何をどこへ置くかは、通常のユーザーとして入れるか root として入れるかで変わります。

| インストーラー                          | コードの場所                   | `hermes` バイナリ                       | データディレクトリ                   |
| -------------------------------------- | ------------------------------ | --------------------------------------- | ------------------------------------ |
| ユーザーごと（git インストーラー）      | `~/.hermes/hermes-agent/`      | `~/.local/bin/hermes`（シンボリックリンク） | `~/.hermes/`                         |
| root モード（`sudo curl … \| sudo bash`） | `/usr/local/lib/hermes-agent/` | `/usr/local/bin/hermes`                 | `/root/.hermes/`（または `$HERMES_HOME`） |

root モードの **FHS 配置**（`/usr/local/lib/…`、`/usr/local/bin/hermes`）は、Linux で他のシステム全体向け開発ツールが置かれる場所に合わせたものです。1 つのシステムへのインストールで全ユーザーに使わせたい、共有マシンでの運用に向いています。ユーザーごとの設定（認証情報、スキル、セッション）は、各ユーザーの `~/.hermes/` か、明示的に指定した `HERMES_HOME` の下に置かれたままになります。

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
1 つのサブスクリプションで 300 以上のモデルに加えて [Tool Gateway](https://hermes-agent.nousresearch.com/user-guide/features/tool-gateway)（ウェブ検索、画像生成、TTS、クラウドブラウザ）まで使えます。ツールごとに API キーをやりくりする手間はいりません。

```bash
hermes setup --portal
```

このコマンド 1 つで、ログイン、プロバイダーを Nous に設定、Tool Gateway の有効化まで済みます。
:::

:::tip すでに別のマシンで Hermes を動かしていますか？
設定を一から作り直す必要はありません。`hermes import` でバックアップを丸ごと復元する（[Exporting Hermes to another machine](https://hermes-agent.nousresearch.com/reference/faq#exporting-hermes-to-another-machine) を参照）か、`hermes profile import` でエージェントを 1 つだけ移す（[Moving a single profile to another machine](https://hermes-agent.nousresearch.com/reference/faq#moving-a-single-profile-to-another-machine) を参照）ことができます。なお、プロファイルのエクスポートは設計上、認証情報を含みません。つまりエクスポートだけでは完全なバックアップになりません。どちらを使うべきかは [`hermes backup` vs `hermes profile export`](https://hermes-agent.nousresearch.com/reference/faq#hermes-backup-vs-hermes-profile-export) で説明されています。
:::

---

## 前提条件 {#prerequisites}

**インストーラー:** Windows 以外のプラットフォームでは、前提となるのは **Git** だけです。Linux では加えて `curl` と `xz-utils` が使えるようにしておいてください（インストーラーは Node.js を `.tar.xz` 形式のアーカイブとしてダウンロードします）。デスクトップアプリを使う場合は、ネイティブモジュールをコンパイルするために `g++`（Debian / Ubuntu では `build-essential`）も必要です。それ以外はインストーラーが自動でそろえます。

- **uv**（高速な Python パッケージマネージャー）
- **Python 3.11**（uv 経由で導入。sudo は不要）
- **Node.js v22**（ブラウザ自動化と WhatsApp ブリッジ用）
- **ripgrep**（高速なファイル検索）
- **ffmpeg**（TTS 用の音声フォーマット変換）

:::info
Python、Node.js、ripgrep、ffmpeg を自分で入れる必要は **ありません**。インストーラーが足りないものを検出して導入します。`git` が使えることだけ確認しておいてください（`git --version`）。Linux では `curl` と `xz-utils` が入っているか確認します（Debian / Ubuntu なら `sudo apt install curl xz-utils`）。デスクトップアプリを使う場合は `build-essential` も入れてください（`sudo apt install build-essential`）。
:::

:::tip Nix を使っている方へ
Nix は **明示的にサポートされるインストール経路ではなくなりました**（ベストエフォートでの対応のみです）。すでに Nix を使っている場合（NixOS、macOS、Linux のいずれでも）、Nix flake、宣言的な NixOS モジュール、任意で使えるコンテナモードを備えた専用のセットアップ経路があります。**[Nix & NixOS のセットアップ](/hermes/docs/getting-started/nix-setup/)** ガイドをご覧ください。
:::

---

## 手動インストール / 開発者向けインストール {#manual-developer-installation}

リポジトリをクローンしてソースから入れたい場合 — 開発に参加する、特定のブランチから動かす、仮想環境を細かく制御したい、といった目的 — は、コントリビューションガイドの [開発環境のセットアップ](/hermes/docs/developer-guide/contributing/#development-setup) の節をご覧ください。

---

## sudo なしの環境 / システムサービス用ユーザーでのインストール {#non-sudo-system-service-user-installs}

Hermes を専用の非特権ユーザー（たとえば `hermes` という systemd のサービスアカウントや、`sudo` を使えない任意のユーザー）で動かす構成もサポートしています。インストール手順のうち本当に root が必要なのは Playwright の `--with-deps` ステップだけで、ここでは Chromium が使う共有ライブラリ（`libnss3`、`libxkbcommon` など）を `apt` で入れます。インストーラーは sudo が使えるかどうかを検出し、使えない場合はうまく機能を落として動作します。具体的には Chromium のバイナリをそのサービスユーザー自身の Playwright キャッシュへ入れ、管理者が別途実行すべきコマンドをそのまま表示します。

**推奨する役割分担（Debian / Ubuntu）:**

1. **最初に一度だけ、sudo を使える管理ユーザーで** Chromium が必要とするシステムライブラリを入れます。
   ```bash
   sudo npx playwright install-deps chromium
   ```
   （どのディレクトリから実行してもかまいません。`npx` がその場で Playwright を取得します。）

2. **非特権のサービスユーザーで** 通常のインストーラーを実行します。sudo がないことを検出して `--with-deps` を飛ばし、Chromium をそのユーザーのローカル Playwright キャッシュへ入れます。
   ```bash
   curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
   ```

   Playwright のステップそのものを飛ばしたい場合 — たとえばヘッドレスで動かしていてブラウザ自動化が要らない場合 — は `--skip-browser` を渡します。
   ```bash
   curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash -s -- --skip-browser
   ```

   インストーラーは [`cua-driver`](/hermes/docs/user-guide/features/computer-use/) もあらかじめ入れておくので、Computer Use のツール群は有効にした瞬間から使えます。不要なら `--skip-computer-use` を渡して見送れます（その場合はツールを有効にしたときに必要に応じて導入されます）。

3. **サービスユーザーのシェルから `hermes` を呼べるようにします。** インストーラーは起動用のスクリプトを `~/.local/bin/hermes` に書き出します。システムのサービスアカウントは PATH が最小限で、`~/.local/bin` を含まないことがよくあります。そのユーザーの環境に追加するか、起動用スクリプトをシステム側の場所へシンボリックリンクしてください。
   ```bash
   # Option A — add to the service user's profile
   echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc

   # Option B — symlink system-wide (run as an admin)
   sudo ln -s /home/hermes/.hermes/hermes-agent/venv/bin/hermes /usr/local/bin/hermes
   ```

4. **確認:** ここまでで `hermes doctor` がエラーなく動くはずです。`ModuleNotFoundError: No module named 'dotenv'` が出る場合は、venv の起動用スクリプト（`~/.hermes/hermes-agent/venv/bin/hermes`）ではなく、リポジトリのソースにある `hermes` ファイル（`~/.hermes/hermes-agent/hermes`）をシステムの Python で呼んでいます。手順 3 を見直してください。

5. **このアカウントでメッセージングゲートウェイを動かしますか？** ユーザーレベルのサービスはログアウトで停止し、そのサービスユーザーの lingering を有効にするまで起動時にも立ち上がりません。

   ```bash
   sudo loginctl enable-linger <service-user>
   ```

   サービスそのもののセットアップは [メッセージングゲートウェイ](https://hermes-agent.nousresearch.com/user-guide/messaging/) をご覧ください。

同じやり方は Arch（インストーラーは同じ sudo 検出ロジックで pacman を使います）、Fedora / RHEL、openSUSE でも通用します。これらのディストリビューションは `--with-deps` に対応していないため、システムライブラリは必ず管理者が別途入れることになります。該当する `dnf` / `zypper` のコマンドはインストーラーが表示します。

---

## 困ったときは {#troubleshooting}

| 症状 | 対処 |
|---------|----------|
| `hermes: command not found` | シェルを読み込み直す（`source ~/.bashrc`）か、PATH を確認する |
| `API key not set` | `hermes model` を実行してプロバイダーを設定するか、`hermes config set OPENROUTER_API_KEY your_key` を実行する |
| 更新後に設定が失われた | `hermes config check` を実行してから `hermes config migrate` を実行する |

さらに詳しく調べたいときは `hermes doctor` を実行してください。何が足りないのか、どう直せばよいのかを具体的に教えてくれます。

## インストール方法の自動判別 {#install-method-auto-detection}

Hermes は自分が git インストーラー・Docker・NixOS のどれで入れられたかを自動で判別し、`hermes update` はその経路に合った更新コマンドを表示します。設定すべき環境変数はありません。判別はインストール先の構成（`~/.hermes/hermes-agent/` のチェックアウト、Docker イメージのスタンプ、Nix ストアのパス）にもとづいて行われます。判別結果は `hermes doctor` の環境サマリーにも表示されます。
