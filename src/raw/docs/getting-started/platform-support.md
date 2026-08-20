---
title: "対応プラットフォーム"
description: "Hermes Agent が対応しているオペレーティングシステム・配布方法・機能をまとめます。"
upstream_path: getting-started/platform-support.md
upstream_blob: 1791716717c92e07f449eed99eace2fec2fe5a03
sources:
  - https://hermes-agent.nousresearch.com/docs/getting-started/platform-support
---

# 対応プラットフォーム {#platform-support}

Hermes Agent は数多くのプラットフォームと配布方法に対応していますが、考えられるすべてのインストール方法に対応することはできません。

---

## Tier 1 {#tier-1}

ここに挙げたものについては、インストールと更新を決して壊さないよう努めています。Tier 1 で起きた不具合や機能後退への対応は最優先で、他のプラットフォームより先に扱います。

| OS / アーキテクチャ                                                             | インストール方法                                                                                                           | 備考                                                                                                                                                     |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **macOS**（Apple Silicon）                                                     | [Hermes Desktop](https://hermes-agent.nousresearch.com/), [`install.sh`](/hermes/docs/getting-started/installation/#linux--macos--wsl2--android-termux) |
| [**Windows 10 / 11**](/hermes/docs/user-guide/windows-native/)（x86_64、aarch64）      | [Hermes Desktop](https://hermes-agent.nousresearch.com/), [`install.ps1`](/hermes/docs/getting-started/installation/#windows-native)                    | 一部の機能は[利用できません](/hermes/docs/user-guide/windows-native/#feature-matrix)。                                                                       |
| **Linux / [WSL2](/hermes/docs/user-guide/windows-wsl-quickstart/)**（x86_64、aarch64） | [`install.sh`](/hermes/docs/getting-started/installation/#linux--macos--wsl2--android-termux)                                                           | 検証は最新の Ubuntu と WSL2 で行っています。お使いのディストリビューションに glibc と systemd があり、Filesystem Hierarchy Standard に沿っていれば、おおむね問題なく動作するはずです。 |
| [**Docker コンテナ**](/hermes/docs/user-guide/docker/#quick-start)（x86_64、aarch64） | [`docker pull`](/hermes/docs/user-guide/docker/#quick-start)                                                                           | Docker で入れた場合、`hermes update` は使えません。更新は新しいイメージを実行して行います。                                                                  |

---

## Tier 2 {#tier-2}

これらのプラットフォームは、ベストエフォートでのみ本体側で維持しています。
リリースによって壊れることがあり、壊れたときにすぐ直せるとはお約束できません。

不具合を直す PR は受け付けますが、Tier 1 のプラットフォームの修正より優先順位は下がります。

| OS / アーキテクチャ              | インストール方法                                                 | 備考                                                                        |
| ------------------------------ | -------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Android (Termux)**（aarch64） | [`install.sh`](/hermes/docs/getting-started/installation/#linux--macos--wsl2--android-termux) | 一部の機能は[利用できません](/hermes/docs/getting-started/termux/#known-limitations-on-phones)。 |
| **Nix**（MacOS、Linux、NixOS）  | [`install.sh`](/hermes/docs/getting-started/nix-setup/)                                       | node.js のパッケージング事情でしょっちゅう壊れます。幸運を祈ります〜！ &lt;3             |

## 非対応 {#unsupported}

次のプラットフォームと配布方法には**対応していません**。
対応済みの配布方法かプラットフォームへ移ることをおすすめします。
現時点ですでに壊れているかもしれませんし、今後さらに壊れるかもしれません。
これらを直す PR は受け付け _ません_ し、互換性を保つためのコードはいつ削除されてもおかしくありません。

- AUR 経由のインストール（役に立ちそうならパッチを上流へ送ることはあります &lt;3）
- x86（Intel）プロセッサ上の macOS
- `pypi` 経由のインストール（例: `uv tool install hermes-agent`、`pip install hermes-agent` など）
- `brew` 経由のインストール（`brew install hermes-agent`）

非対応の配布方法をお使いの場合は、[インストールガイド](/hermes/docs/getting-started/installation/)を読んで、対応済みの方法へ切り替える手順をご確認ください。
