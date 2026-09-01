---
title: "Android / Termux"
description: "Termux を使って Android スマートフォン上で Hermes Agent を直接動かす"
upstream_path: getting-started/termux.md
upstream_blob: df94ba957089ea08cf12a17125ae29e31469e77c
sources:
  - https://hermes-agent.nousresearch.com/docs/getting-started/termux
---

# Termux で Android 上の Hermes を動かす {#hermes-on-android-with-termux}

:::warning ティア 2 のプラットフォーム
Termux（Android）は [ティア 2 のプラットフォーム](/hermes/docs/getting-started/platform-support/#tier-2) です。ここで説明するインストーラのスクリプトとドキュメントは、できる範囲での対応にとどまります。`main` へのコミットによって、これらのパッケージがいつ壊れてもおかしくありません。
:::

Hermes Agent は、[Termux](https://termux.dev/) を通じて Android スマートフォン上で直接動かせます。

これにより、スマートフォン上で動くローカルの CLI に加えて、現時点で Android にきれいにインストールできると分かっている中心的な追加機能が手に入ります。

## 検証済みの手順では何がサポートされるのか {#what-is-supported-in-the-tested-path}

検証済みの Termux 向けの一式では、次のものがインストールされます。

- Hermes の CLI
- cron のサポート
- PTY / バックグラウンドのターミナルのサポート
- Telegram ゲートウェイのサポート（手動 / できる範囲でのバックグラウンド実行）
- MCP のサポート
- Honcho メモリのサポート
- ACP のサポート

具体的には、次のコマンドに対応します。

```bash
python -m pip install -e '.[termux]' -c constraints-termux.txt
```

## 検証済みの手順にまだ含まれていないもの {#what-is-not-part-of-the-tested-path-yet}

いくつかの機能は、Android 向けに公開されていないデスクトップ / サーバー向けの依存関係を必要とするか、スマートフォン上でまだ検証されていません。

- `.[all]` は現時点の Android ではサポートされていません
- `voice` の追加機能は `faster-whisper -> ctranslate2` によって塞がれており、`ctranslate2` は Android 向けの wheel を公開していません
- ブラウザ / Playwright の自動セットアップは、Termux のインストーラではスキップされます
- Docker を用いたターミナルの隔離は、Termux の中では利用できません
- Android は Termux のバックグラウンドのジョブを一時停止することがあるため、ゲートウェイを常駐させ続けるのは、通常の管理下にあるサービスというよりも、できる範囲での動作になります

とはいえ、スマートフォンにネイティブな CLI エージェントとして Hermes がよく動くことに変わりはありません。推奨されるモバイル向けのインストールが、デスクトップ / サーバー向けよりも意図的に絞られている、というだけのことです。

---

## コミュニティが管理するネイティブな `pkg` 版 {#community-maintained-native-pkg-option}

:::caution コントリビューターが運用している配布
この APT リポジトリは **`@adybag14-cyber` がコミュニティとして管理しているもので、NousResearch の公式な配布ではありません**。NousResearch はこれらのパッケージのビルド・署名・ホスティング・監査のいずれも行っていません。このリポジトリを有効にすることは、コントリビューターが運用するリポジトリとその署名鍵を信頼することを意味します。Termux 自体も、引き続きティア 2 / できる範囲での対応のプラットフォームです。
:::

スマートフォン上で Python / Rust の依存関係をビルドするよりも、ネイティブなパッケージマネージャでインストールしたい場合のために、コミュニティが管理する APT リポジトリが用意されています。リポジトリの初期設定とパッケージングのソースは [`adybag14-cyber/termux-python`](https://github.com/adybag14-cyber/termux-python) で公開されており、Hermes のパッケージのビルドは [`adybag14-cyber/termux-hermes`](https://github.com/adybag14-cyber/termux-hermes) にあります。

リポジトリの鍵とソースを登録し、Hermes をインストールするには次のようにします。

```bash
curl -fsSL https://raw.githubusercontent.com/adybag14-cyber/termux-python/main/scripts/setup_apt_repo.sh | bash
pkg install hermes-agent
```

このコミュニティの配布が現時点で公開しているリポジトリの署名鍵のフィンガープリントは、次のとおりです。

```text
EAD24A2124EFA7393A78B7B14699F966313F7A6B
```

APT で管理された Hermes のインストールには、インストール方法として `apt` の印が付きます。そのため Hermes は、パッケージが所有するファイルに対して Git による自己更新を実行しません。代わりにパッケージマネージャを使ってください。

```bash
pkg update
pkg upgrade hermes-agent
```

この方法でのパッケージング / リポジトリ / 署名に関する問題は、上に挙げたコミュニティのパッケージングのリポジトリへ報告してください。Hermes の実行時のバグは引き続きここへ報告できますが、Android / Termux のサポートができる範囲のものである点は念頭に置いてください。

---

## 方法 1: ワンラインのインストーラ {#option-1-one-line-installer}

Hermes には、Termux を認識するインストールの経路が用意されています。

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
```

Termux 上では、インストーラが自動で次のことを行います。

- システムのパッケージには `pkg` を使う
- venv を `python -m venv` で作る
- まず広い範囲の `.[termux-all]` の追加機能を試し、だめならより小さい `.[termux]`（さらに基本のインストール）へ順に下がる — curl 版のインストーラも自動で同じ順序をたどります
- `hermes` を `$PREFIX/bin` にリンクし、Termux の PATH 上に残るようにする
- 未検証のブラウザ / WhatsApp の初期セットアップはスキップする

明示的なコマンドを知りたい場合や、失敗したインストールを調べたい場合は、以下の手動の手順を使ってください。

---

## 方法 2: 手動でのインストール（すべて明示的に） {#option-2-manual-install-fully-explicit}

### 1. Termux を更新し、システムのパッケージを入れる {#1-update-termux-and-install-system-packages}

```bash
pkg update
pkg install -y git python clang rust make pkg-config libffi openssl nodejs ripgrep ffmpeg
```

これらのパッケージが必要な理由は次のとおりです。

- `python` — 実行環境と venv のサポート

:::warning 対応している Python の範囲
Hermes が必要とするのは **Python >=3.11,&lt;3.14** です。いまの Termux が配布している `python`
は 3.14.x で、この範囲から外れています。インストーラはそれを見つけると、対応するバージョンを
[Termux ユーザーリポジトリ（TUR）](https://github.com/termux-user-repository/tur)
から入れようと自動で試みます。手作業で入れる場合は、自分で次のように用意してください。

```bash
pkg install tur-repo
pkg install python3.13
```

このあとのコマンドでは `python` の代わりに `python3.13` を使ってください
（例: `python3.13 -m venv venv`）。
:::

- `git` — リポジトリの clone / 更新
- `clang`、`rust`、`make`、`pkg-config`、`libffi`、`openssl` — Android 上でいくつかの Python の依存関係をビルドするために必要
- `nodejs` — 検証済みの中心的な手順を超えて試すための、任意の Node 実行環境
- `ripgrep` — 高速なファイル検索
- `ffmpeg` — メディア / TTS の変換

### 2. Hermes を clone する {#2-clone-hermes}

```bash
git clone https://github.com/NousResearch/hermes-agent.git
cd hermes-agent
```

### 3. 仮想環境を作る {#3-create-a-virtual-environment}

```bash
python -m venv venv
source venv/bin/activate
export ANDROID_API_LEVEL="$(getprop ro.build.version.sdk)"
python -m pip install --upgrade pip setuptools wheel
```

`ANDROID_API_LEVEL` は、`jiter` のような Rust / maturin を使うパッケージにとって重要です。

### 4. 検証済みの Termux 向けの一式をインストールする {#4-install-the-tested-termux-bundle}

```bash
python -m pip install -e '.[termux]' -c constraints-termux.txt
```

最小構成のエージェント本体だけでよければ、次でも動きます。

```bash
python -m pip install -e '.' -c constraints-termux.txt
```

### 5. `hermes` を Termux の PATH に置く {#5-put-hermes-on-your-termux-path}

```bash
ln -sf "$PWD/venv/bin/hermes" "$PREFIX/bin/hermes"
```

Termux では `$PREFIX/bin` がすでに PATH に入っているため、これで毎回 venv を有効化しなくても、新しいシェルで `hermes` コマンドを使い続けられます。

### 6. インストールを確認する {#6-verify-the-install}

```bash
hermes --version
hermes doctor
```

### 7. Hermes を起動する {#7-start-hermes}

```bash
hermes
```

---

## そのあとにおすすめの設定 {#recommended-follow-up-setup}

### モデルを設定する {#configure-a-model}

```bash
hermes model
```

あるいは、`~/.hermes/.env` に直接キーを書いても構いません。

### あとで対話的なセットアップウィザードをやり直す {#re-run-the-full-interactive-setup-wizard-later}

```bash
hermes setup
```

### 任意の Node の依存関係を手動でインストールする {#install-optional-node-dependencies-manually}

検証済みの Termux 向けの手順では、Node / ブラウザの初期セットアップを意図的にスキップしています。あとからブラウザ関連のツールを試したい場合、必要なものは使うバックエンドによって変わります。

- **クラウドのブラウザプロバイダ**（Browserbase、Browser Use、Firecrawl）は自前の Chromium をホストしているため、Node.js だけあれば十分です。`agent-browser` は最初に使うときに `npx agent-browser` で遅延解決されます。

  ```bash
  pkg install nodejs-lts
  ```

- **ローカルでのブラウザ自動操作**を Termux 上で行うには、`agent-browser` を実際にインストールする必要があります。npx だけで済ませるフォールバックは、ローカルモードでは「使える」と言うには脆すぎるとして、意図的に拒否されます。

  ```bash
  pkg install nodejs-lts
  npm install -g agent-browser && agent-browser install
  ```

ブラウザのツールは、PATH の探索先に Termux のディレクトリ（`/data/data/com.termux/files/usr/bin`）を自動で含めます。そのため、PATH を追加で設定しなくても `agent-browser` と `npx` が見つかります。

Android 上のブラウザ / WhatsApp 関連のツールは、別途そうでないと明記されるまでは実験的なものとして扱ってください。

---

## トラブルシューティング {#troubleshooting}

### `.[all]` のインストールで `No solution found` と出る {#no-solution-found-when-installing-all}

代わりに、検証済みの Termux 向けの一式を使ってください。

```bash
python -m pip install -e '.[termux]' -c constraints-termux.txt
```

現時点で妨げになっているのは `voice` の追加機能です。

- `voice` は `faster-whisper` を引き込む
- `faster-whisper` は `ctranslate2` に依存する
- `ctranslate2` は Android 向けの wheel を公開していない

### Android 上で `uv pip install` が失敗する {#uv-pip-install-fails-on-android}

代わりに、標準ライブラリの venv と `pip` を使う Termux 向けの手順を使ってください。

```bash
python -m venv venv
source venv/bin/activate
export ANDROID_API_LEVEL="$(getprop ro.build.version.sdk)"
python -m pip install --upgrade pip setuptools wheel
python -m pip install -e '.[termux]' -c constraints-termux.txt
```

### `jiter` / `maturin` が `ANDROID_API_LEVEL` について文句を言う {#jiter-maturin-complains-about-androidapilevel}

インストールの前に、API レベルを明示的に設定してください。

```bash
export ANDROID_API_LEVEL="$(getprop ro.build.version.sdk)"
python -m pip install -e '.[termux]' -c constraints-termux.txt
```

### `hermes doctor` が ripgrep や Node が無いと言う {#hermes-doctor-says-ripgrep-or-node-is-missing}

Termux のパッケージでインストールしてください。

```bash
pkg install ripgrep nodejs
```

### Python パッケージのインストール中にビルドが失敗する {#build-failures-while-installing-python-packages}

ビルド用のツールチェーンが入っているか確認してください。

```bash
pkg install clang rust make pkg-config libffi openssl
```

そのうえで、やり直します。

```bash
python -m pip install -e '.[termux]' -c constraints-termux.txt
```

---

## スマートフォン上での既知の制限 {#known-limitations-on-phones}

- Docker のバックエンドは利用できません
- 検証済みの手順では、`faster-whisper` によるローカルでの音声書き起こしは利用できません
- ブラウザ自動操作のセットアップは、インストーラが意図的にスキップします
- 一部の任意の追加機能は動くかもしれませんが、現時点で Android 向けの検証済みの一式として文書化されているのは `.[termux]` と `.[termux-all]` だけです

Android 固有の新しい問題に当たった場合は、次の情報を添えて GitHub の issue を作成してください。

- Android のバージョン
- `termux-info`
- `python --version`
- `hermes doctor`
- 実行したインストールのコマンドと、エラー出力の全文
