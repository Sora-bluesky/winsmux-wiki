---
title: "対応プラットフォーム"
description: "Hermes Agent が対応している OS、配布方法、機能の一覧"
upstream_path: getting-started/platform-support.md
upstream_blob: 895fbc29430b65d6547fd4581406199f96749882
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
| **macOS**（Apple Silicon）                                                     | [Hermes Desktop](https://hermes-agent.nousresearch.com/), [`install.sh`](/hermes/docs/getting-started/installation/) |
| [**Windows 10 / 11**](/hermes/docs/user-guide/windows-native/)（x86_64, aarch64） | [`install.ps1`](/hermes/docs/getting-started/installation/), [MSIX 版デスクトップアプリ](/hermes/docs/user-guide/windows-native/) | MSIX パッケージには Windows 11 22H2 以降が必要です。任意の依存関係には[アーキテクチャごとの制限](/hermes/docs/user-guide/windows-native/)があります。 |
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
| **Android / [Termux](/hermes/docs/getting-started/termux/)**（aarch64） | [署名付きの APT リポジトリ](/hermes/docs/getting-started/termux/)を追加してから `pkg install hermes-agent` | Python、Node、TUI を含むプレリリース版のパッケージです。ゲートウェイは Termux のセッションの中で動かしてください。Android はバックグラウンドのプロセスを終了させることがあります。 |

### ビルド対象とサポートの優先度 {#build-targets-and-support-priority}

ネイティブのバンドルを作るパイプラインには、Apple Silicon に加えて Intel の macOS（`x64`）も含まれています。
署名付きパッケージの更新の受け入れ確認も、両方のアーキテクチャについて定めています。
ただし、それによって Apple Silicon に割り当てた Tier 1 の優先度が変わるわけではありません。
Linux のデスクトップ版のパッケージ作成はリリースのワークフローで無効にしています。ただし、ローカルでの
AppImage のビルドと、Linux ネイティブのパッケージマネージャー向けバンドルの確認は用意されています。

## 非対応 {#unsupported}

以下のプラットフォームと配布方法には対応して**いません**。
対応している配布方法やプラットフォームへの移行をおすすめします。
現時点ですでに動かないかもしれませんし、今後さらに動かなくなるかもしれません。
これらを直す PR は受け付け_ません_。また、互換性を保つためのコードはいつ削除されてもおかしくありません。

- aarch64 以外の端末での Android / Termux（aarch64 は APT パッケージで[対応しています](/hermes/docs/getting-started/termux/)）
- AUR からの導入（役に立つならパッチを本体に取り込むかもしれません &lt;3）
- 32 ビット x86 の macOS。Intel の x86_64 にはネイティブのバンドルのビルドとパッケージ更新の受け入れ確認の工程がありますが、Apple Silicon の Tier 1 の優先度は変わりません。
- `pypi` からの導入（例: `uv tool install hermes-agent`、`pip install hermes-agent` など）
- `brew` からの導入（`brew install hermes-agent`）

対応していない配布方法を使っている場合は、[導入ガイド](/hermes/docs/getting-started/installation/)を読んで、対応している方法へ切り替えてください。
