---
title: "Android / Termux"
description: "署名付きの Termux APT リポジトリから Android に Hermes Agent を導入する"
upstream_path: getting-started/termux.md
upstream_blob: cd6ccc8c246bf60cabe8120c5a525703d9795d82
sources:
  - https://hermes-agent.nousresearch.com/docs/getting-started/termux
---

# Termux で Android 上の Hermes を動かす {#hermes-on-android-with-termux}

:::danger Termux 版は現在動作しません
Termux のパッケージはいま動かない状態です。修正を進めており、まもなく
公開します。それまでは、以下の手順が失敗したり、動かないパッケージが
導入されたりすることがあります。
:::

Termux のパッケージは、**aarch64（arm64-v8a）** の Android 端末で Hermes を動かします。
APT のチャンネルは 2 つあり、
`https://hermes-assets.nousresearch.com/releases/termux/<channel>` で公開しています。

| チャンネル | APT スイート | 中身 |
| --- | --- | --- |
| `stable` | `hermes-stable` | 安定版のリリース判定を通過した、`vMAJOR.MINOR.PATCH` のタグ付きリリース |
| `canary` | `hermes-canary` | canary タグから作るプレリリース版。バージョンに `~canary.<timestamp>` が付きます |

以下の手順では `stable` を使います。プレリリース版を追いかける場合は、手順 2 と 4 で
`stable` を `canary` に、`hermes-stable` を `hermes-canary` に置き換えてください。
どちらのチャンネルも同じ鍵で署名しています。

パッケージには Python、Node.js、npm、uv、ripgrep、ffmpeg と、それらの実行に必要なライブラリが入っています。
ネイティブの Python wheel と TUI は、パッケージを作る前に CI でビルドします。
そのため導入時に、端末側で中核の依存関係をコンパイルしたり、土台となる Python
環境を組み立てたりすることはありません。パッケージは bionic 向けに固定したインタープリターの
Python 3.14 を使います。デスクトップの CPython と同じパッチバージョンである必要はありません。
同梱する wheel は中核部分と `acp` だけで、デスクトップ版の追加機能がすべて入っているわけではありません。

## 導入 {#install}

標準の [Termux](https://termux.dev/) アプリを使ってください。
パッケージは Termux の標準プレフィックス `/data/data/com.termux/files/usr` を前提にしています。
ほかのアーキテクチャや、パッケージ名を変えた Termux アプリには対応していません。
wheel は Android API 24（`android_24_arm64_v8a`）向けです。
この環境では、デスクトップ・サーバー向けの `install.sh` や glibc の Linux 用アーカイブを使わないでください。

1. リポジトリの設定に使うツールを入れます。

   ```bash
   pkg install curl gnupg
   ```

2. 公開鍵をダウンロードします。

   ```bash
   mkdir -p "$PREFIX/etc/apt/keyrings"
   curl -fsSL \
     https://hermes-assets.nousresearch.com/releases/termux/stable/key.asc \
     -o "$PREFIX/etc/apt/keyrings/hermes-agent.asc"
   ```

3. 主鍵のフィンガープリントを確かめます。

   ```bash
   gpg --show-keys --with-fingerprint "$PREFIX/etc/apt/keyrings/hermes-agent.asc"
   ```

   リポジトリの鍵のフィンガープリントは次のとおりです。

   ```text
   C572 B5FD D1A2 9CCF A9A9 12B6 840B 0848 E139 156D
   ```

   フィンガープリントが違う場合は、そこで作業を止めてください。署名の検証を無効にしてはいけません。

4. リポジトリを追加します。

   ```bash
   printf '%s\n' \
     "deb [signed-by=$PREFIX/etc/apt/keyrings/hermes-agent.asc] https://hermes-assets.nousresearch.com/releases/termux/stable hermes-stable main" \
     > "$PREFIX/etc/apt/sources.list.d/hermes-agent.list"
   ```

5. Hermes を入れます。

   ```bash
   pkg update
   pkg install hermes-agent
   ```

6. プロバイダーを設定してから、TUI を起動します。

   ```bash
   hermes setup
   hermes --tui
   ```

`hermes`、`hermes-agent`、`hermes-acp` の各コマンドは、パッケージに同梱した実行環境を使います。
Termux の `python` や `nodejs` パッケージは必要ありません。

## ファイルの場所と更新 {#files-and-updates}

| 中身 | 場所 |
| --- | --- |
| パッケージのファイル | `$PREFIX/lib/hermes-agent/` |
| コマンドのシンボリックリンク | `$PREFIX/bin/hermes`, `$PREFIX/bin/hermes-agent`, `$PREFIX/bin/hermes-acp` |
| 設定とユーザーデータ | `~/.hermes/`、または指定した `HERMES_HOME` |

更新は APT で行います。

```bash
pkg update
pkg upgrade hermes-agent
```

`hermes update` は、APT が管理しているインストールを書き換えません。
代わりに、パッケージマネージャーで実行するコマンドを表示します。
canary 版のバージョンには `~canary.<timestamp>` が付き、対応する stable 版より前の版として
並びます。各スイートには自分のチャンネルのパッケージしか載っていません。チャンネルを
切り替えるときは、`hermes-agent.list` のチャンネルのパスとスイートを書き換えてから、
`pkg update && pkg upgrade hermes-agent` を実行してください。

## ゲートウェイ {#gateway}

この APT 版は、systemd、launchd、Windows のタスク スケジューラを使いません。
ゲートウェイは Termux のセッションの中で動かします。

```bash
hermes gateway run
```

バックグラウンドで動かす場合は次のようにします。

```bash
mkdir -p "${HERMES_HOME:-$HOME/.hermes}/logs"
nohup hermes gateway run >> "${HERMES_HOME:-$HOME/.hermes}/logs/gateway.log" 2>&1 &
```

:::warning Android のプロセス制限
Android は、バックグラウンドで動いている Termux のプロセスを一時停止したり終了させたりすることがあります。
電池の最適化の対象から外すことや `termux-wake-lock` は役に立ちますが、動き続けることを保証するものではありません。
:::

## 制限 {#limits}

パッケージには `nemo-relay` エクスポーターが入っていません。同梱しているビルド
ツールチェーンが、この環境に対応していないためです。

Electron、ローカルの Chromium、デスクトップの computer-use ツールも入っていません。
ローカルの Docker デーモンは Termux の環境にはありません。リモートの
サービスには、それぞれに必要な条件と接続上の制限があります。

スマートフォン本体の機能を使う Termux:API のマイクやクリップボードのアダプターは、
このパッケージでは提供していません。ビルド済みの CLI/TUI が動くからといって、端末上での音声入力や
ウェイクワードに対応しているわけではありません。任意の連携機能やサードパーティのプラグインは、
Android に対応していない依存関係を必要とすることがあります。

この環境の Python 3.14 では `sys.platform == "android"` になります。`linux` だけを
条件にしている依存関係や skill は、Android では自動的には使えません。

## アンインストール {#uninstall}

```bash
pkg uninstall hermes-agent
```

APT はパッケージとコマンドのシンボリックリンクを削除します。設定、セッション、skill、メモリは残ります。

## 困ったとき {#troubleshooting}

- **パッケージが見つからない:** リポジトリの設定行を確かめてから、`pkg update` を実行してください。
- **署名エラー:** 公開鍵のフィンガープリントを確かめてください。署名のないリポジトリを使ったり、エラーを回避したりしないでください。
- **コマンドが見つからない:** `$PREFIX/bin` が `PATH` に入っているかを確かめるか、パッケージを入れ直してください。
- **ライブラリや TUI のバンドルが足りない:** `hermes --version` の出力とエラーの全文を報告してください。中核のパッケージが端末上での再ビルドを必要とすることは、本来あってはならないことです。
- **画面を消すとゲートウェイが止まる:** Android の電池とバックグラウンドプロセスの制限を見直してください。

全般的な診断には `hermes doctor` を実行してください。
