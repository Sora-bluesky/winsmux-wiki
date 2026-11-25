---
title: "対応プラットフォーム"
description: "Hermes Agent が対応している OS、配布方法、機能の一覧"
upstream_path: getting-started/platform-support.md
upstream_blob: caaf456500b2bbe67972ec99454cf8ce7219b2ec
sources:
  - https://hermes-agent.nousresearch.com/docs/getting-started/platform-support
---

# 対応プラットフォーム {#platform-support}

Hermes Agent は多くのプラットフォームと配布方法に対応していますが、考えられるすべての導入方法に対応できるわけではありません。

---

## Tier 1 {#tier-1}

これらの環境では、導入と更新を壊さないことを目指しています。Tier 1 の不具合やデグレードは最優先で対応し、ほかのプラットフォームより先に扱います。

| OS / アーキテクチャ                                                             | 導入方法                                                                                                           | 補足                                                                                                                                                     |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **macOS**（Apple Silicon）                                                     | [Hermes Desktop](https://hermes-agent.nousresearch.com/), [`install.sh`](/hermes/docs/getting-started/installation/) | macOS のデスクトップ版のバンドル（`Hermes Agent.app`）には、Apple Silicon（`arm64`）の **macOS 13 Ventura 以降** が必要です。Intel の Mac と macOS 12 以前では [`install.sh`](/hermes/docs/getting-started/installation/#linux--macos--wsl2) を使います。 |
| [**Windows 10 / 11**](/hermes/docs/user-guide/windows-native/)（x86_64, aarch64） | [Microsoft Store / MSIX 版デスクトップアプリ](/hermes/docs/user-guide/windows-native/), [`install.ps1`](/hermes/docs/getting-started/installation/) | デスクトップ版のバンドル（Microsoft Store と `.appinstaller` の MSIX、x64 または ARM64）には **Windows 11 22H2 以降（`10.0.22621.0`）** が必要です。Windows 10 と 22H2 より前の Windows 11 では [`install.ps1`](/hermes/docs/getting-started/installation/#windows-native) か [WSL2](/hermes/docs/user-guide/windows-wsl-quickstart/) を使います。任意の依存関係には[アーキテクチャごとの制限](/hermes/docs/user-guide/windows-native/)があります。 |
| **Linux / [WSL2](/hermes/docs/user-guide/windows-wsl-quickstart/)**（x86_64, aarch64） | [`install.sh`](/hermes/docs/getting-started/installation/)                                                           | 最新の Ubuntu と WSL2 でテストしています。glibc と systemd があり、Filesystem Hierarchy Standard に沿ったディストリビューションなら、おおむね問題なく動くはずです。 |
| [**Docker コンテナ**](/hermes/docs/user-guide/docker/)（x86_64, aarch64） | [`docker pull`](/hermes/docs/user-guide/docker/)                                                                           | Docker で導入した場合は `hermes update` を使えません。更新するには新しいイメージを実行します。                                                                  |

---

## Tier 2 {#tier-2}

これらのプラットフォームは、本体のリポジトリ内で、できる範囲でだけ保守しています。
リリースによって動かなくなることがあり、動かなくなったときにすぐ直せるとは約束できません。

これらの不具合を直す PR は受け付けますが、Tier 1 のプラットフォームの不具合修正より後回しになります。

| OS / アーキテクチャ              | 導入方法                                                 | 補足                                                                        |
| ------------------------------ | -------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Nix**（macOS, Linux, NixOS） | [Nix flake とモジュール](/hermes/docs/getting-started/nix-setup/) | 実行環境の導入と更新は Nix が管理します。 |
| **Android / [Termux](/hermes/docs/getting-started/termux/)**（aarch64） | [署名付きの APT リポジトリ](/hermes/docs/getting-started/termux/)を追加してから `pkg install hermes-agent` | Python、Node、TUI を含むプレリリース版のパッケージです。既定ではビルドされません。`--with termux`（と `windows`、`macos-arm64`）を付けて作ったリリースだけが APT のチャンネルを更新します。ゲートウェイは Termux のセッションの中で動かしてください。Android はバックグラウンドのプロセスを終了させることがあります。 |

### ビルド対象とサポートの優先度 {#build-targets-and-support-priority}

リリースでは、macOS のデスクトップ版のバンドル（`Hermes Agent.app`）を **Apple Silicon（`arm64`）の macOS 13 Ventura 以降** 向けにだけビルドします
（`LSMinimumSystemVersion` は `13.0` で、Electron 44 が対応する OS の下限に合わせています）。
Intel の macOS（`x64`）向けのバンドルをビルドしたりテストしたりするリリースや CI のワークフローはありません。
macOS の更新フィードは arm64 向けだけなので、以前のデスクトップ版のバンドルから入れた Intel の Mac には
更新が届きません。Intel の Mac と macOS 12 Monterey 以前では、
[CLI / ソースからのインストーラー（`install.sh`）](/hermes/docs/getting-started/installation/#linux--macos--wsl2) を使ってください。

Windows のデスクトップ版のバンドル（Microsoft Store のパッケージと、署名済みの `.appinstaller` の MSIX バンドル。x64 と ARM64）には、
**Windows 11 22H2 以降（`10.0.22621.0`）**が必要です。Windows 10 と 22H2 より前の Windows 11 は、
[Windows 用のソースインストーラー（`install.ps1`）](/hermes/docs/getting-started/installation/#windows-native)
か [WSL2](/hermes/docs/user-guide/windows-wsl-quickstart/) で対応しています。

Termux の APT パッケージは**既定ではビルドされません**。
リリースに含まれるのは、`release.py release --with termux` を付けてリリースを作ったときだけです。
Termux を含まないリリースでは、Termux の APT チャンネルは前のリリースのままです。
以前からあるブートストラップ用のインストーラー `Hermes-Setup.dmg` は Apple Silicon 向けにしかビルドされていないため、
Intel の Mac では「この Mac には対応していません」と表示されます。
Linux のデスクトップ版の AppImage は、canary タグで診断用の成果物としてビルドされていますが、まだどのリリースでも配布していません。
ローカルでの AppImage のビルドと、Linux ネイティブのパッケージマネージャー向けバンドルの確認は用意されています。

## 非対応 {#unsupported}

以下のプラットフォームと配布方法には対応して**いません**。
対応している配布方法やプラットフォームへの移行をおすすめします。
現時点ですでに動かないかもしれませんし、今後さらに動かなくなるかもしれません。
これらを直す PR は受け付け_ません_。また、互換性を保つためのコードはいつ削除されてもおかしくありません。

- aarch64 以外の端末での Android / Termux（aarch64 は APT パッケージで[対応しています](/hermes/docs/getting-started/termux/)）
- AUR からの導入（役に立つならパッチを本体に取り込むかもしれません &lt;3）
- 32 ビット x86 の macOS、Intel の x86_64 向けの macOS デスクトップ版のバンドル（どちらもビルドしていません）、macOS 12 Monterey 以前でのデスクトップ版のバンドル（代わりに [`install.sh`](/hermes/docs/getting-started/installation/#linux--macos--wsl2) を使ってください）
- Windows 10 や 22H2 より前の Windows 11 でのデスクトップ版のバンドル（Microsoft Store または `.appinstaller` の MSIX）（代わりに [`install.ps1`](/hermes/docs/getting-started/installation/#windows-native) か [WSL2](/hermes/docs/user-guide/windows-wsl-quickstart/) を使ってください）
- `pypi` からの導入（例: `uv tool install hermes-agent`、`pip install hermes-agent` など）
- `brew` からの導入（`brew install hermes-agent`）

対応していない配布方法を使っている場合は、[導入ガイド](/hermes/docs/getting-started/installation/)を読んで、対応している方法へ切り替えてください。
