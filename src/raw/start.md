---
title: Hermes Agentをインストールする
description: 公式 Quickstart / Installation / Messaging の順で、Hermes Agent を入れて一度会話するまで。
sources:
  - https://hermes-agent.nousresearch.com/docs/getting-started/quickstart
  - https://hermes-agent.nousresearch.com/docs/getting-started/installation
  - https://hermes-agent.nousresearch.com/docs/integrations/nous-portal
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/
hermes_version: "0.20.4"
confidence: high
raw: /hermes/raw/start.md
---

# Hermes Agentをインストールする

このページは、公式の Quickstart、Installation、Messaging の順を日本語にしたものです。手順は公式と同じです。

## 案内

まだ Hermes Agent を入れていない人向けです。すでに入れている人は、案内を読まずに [すでにインストールしている](/hermes/live/) へ進んでください。

Hermes Agent は、自分のコンピュータで動くエージェントです。会話すると、ファイルを読んだり、コマンドを実行したりできます。正本は [公式 docs](https://hermes-agent.nousresearch.com/docs/) です。

## どこに入れるか

入れる場所は公式 Installation のとおりです。

| 環境 | 入れるもの |
| --- | --- |
| Windows または Mac | Hermes Desktop。公式サイトからインストーラをダウンロードして実行します。 |
| Linux | `install.sh` |
| Windows でコマンドだけ | PowerShell の `install.ps1` |

Desktop の入手先: [https://hermes-agent.nousresearch.com/](https://hermes-agent.nousresearch.com/)

Linux / macOS / WSL2 / Android (Termux) でコマンドから入れる場合:

```
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
```

Windows でコマンドだけ入れる場合（PowerShell）:

```
iex (irm https://hermes-agent.nousresearch.com/install.ps1)
```

コマンドだけで入れたあと Desktop も使いたいときは、`hermes desktop` を実行します。

## 入れる

インストーラが必要なものをそろえます。終わると、端末で `hermes` と打てるようになります。

シェルを読み直します。

```
source ~/.bashrc
```

zsh を使っているときは `source ~/.zshrc` です。

`hermes: command not found` と出たら、まずシェルの読み直しを確認します。状態を見るには `hermes doctor` です。

## hermes setup --portal

モデルと、検索などの道具を、一度のログインで使えるようにします。

```
hermes setup --portal
```

ブラウザが開いて Nous Portal にログインします。終わると、モデルが選ばれ、Tool Gateway（検索、画像、音声、ブラウザ）が入ります。そのあとすぐ会話できます。

まだ契約していない人は、先に [Nous Portal の申し込み](https://portal.nousresearch.com/manage-subscription) を済ませてから、同じコマンドを実行します。

別の会社のモデルを使うときは `hermes model` です。公式 Quickstart は、普通の会話が通るまでほかの機能を足さない、としています。

## 一度会話して確認

会話画面を開きます。

```
hermes
```

新しい画面がよければ `hermes --tui` です。

返事が返れば、入れたことは確認できています。試し方の例:

```
今いるフォルダを見て、いちばん大事そうなファイルを教えて
```

返事が来ないときは、機能を足す前に `hermes doctor` と `hermes model` を直します。

## LINE または Telegram

電話や別のアプリから、自分の Hermes に話したいときです。ボットは第三者のものではなく、あなた自身の Hermes です。届いたかどうかは、1通送って返事が返ることです。

- [LINE](/hermes/start/line/)
- [Telegram](/hermes/start/telegram/)

LINE は、Hermes が常に動いていることと、インターネットから届く公開 URL が要ります。ノート PC を閉じると切れます。Telegram も同じ丁寧さで手順を書いてあります。
