---
title: 初めての方へ
description: Hermes を知ったばかりの方へ、入れる・話す・スマホから・任せるの4段階だけを順に示します。
sources:
  - https://hermes-agent.nousresearch.com/docs/getting-started/quickstart
  - https://hermes-agent.nousresearch.com/docs/getting-started/installation
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/telegram
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/line
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/cron
  - https://hermes-agent.nousresearch.com/docs/guides/work-with-skills
hermes_version: "0.20.6"
confidence: high
raw: /hermes/raw/first.md
---

# 初めての方へ

Hermes Agent は、自分のコンピュータで動くエージェントです。このページは4段階だけを示します。各段階に、やることの短い要約と、次に開くページを置きます。手順そのものは書きません。リンク先の日本語版ページにあります。

公式 Quickstart の目安は、普通の会話が1往復できるようになるまで機能を足さないことです。上から順に進めてください。

## 1. 入れる

入れ方は OS で分かれます。

1. macOS と Windows では、デスクトップ版とコマンドライン版がまとまったインストーラーが推奨です
2. コマンドライン版だけを入れる場合、Linux・macOS・WSL2・Android（Termux）はスクリプト1行、Windows ネイティブは PowerShell の1行です
3. インストーラーが依存関係（Python、Node.js、ripgrep、ffmpeg）まで入れ、どこからでも呼べる `hermes` コマンドを通します
4. シェルを読み込み直し、使うモデルのプロバイダーを選びます

次の一歩:

- [インストール](/hermes/docs/getting-started/installation/) — OS ごとの入れ方と、何がどこに置かれるか
- [Hermes Agentをインストールする](/hermes/docs/getting-started/quickstart/) — プロバイダー選びから最初の会話まで

## 2. 話す

端末で `hermes` と打つと会話が立ち上がります。最初のひとことは、結果を自分で確かめられるものを選びます。公式が挙げている例です。

- このリポジトリを5行で要約して、主な入口がどこかを教えて
- 今いるディレクトリを見て、中心になっているプロジェクトファイルを教えて
- ディスクの使用量を調べて、大きいディレクトリを上位5件出して

うまくいっているときは、起動時のバナーに自分が選んだモデルが出て、エラーなく返事が返り、そのまま会話が続きます。ここまで動けば、いちばん難しいところは越えています。

次の一歩:

- [CLI](/hermes/docs/user-guide/cli/) — 端末での操作とキーの割り当て
- [スラッシュコマンド](/hermes/docs/reference/slash-commands/) — 会話の中で打つコマンド

## 3. スマホから

端末での会話が通ったら、メッセージアプリにつなぎます。窓口ごとに必要なものが違います。

1. 手軽さでは Telegram です。BotFather でボットを作ってトークンをもらいます
2. Telegram は既定の long polling で動くので、公開 URL は要りません
3. LINE は公開 URL が前提です。LINE Developers コンソールでチャネルを作り、チャネルシークレットとアクセストークンを取ります
4. どちらも `hermes gateway setup` から対話形式で設定できます

次の一歩:

- [Telegram でつなぐ](/hermes/docs/user-guide/messaging/telegram/) — いちばん手軽です
- [LINE でつなぐ](/hermes/docs/user-guide/messaging/line/) — 常時起動と公開 URL が要ります

窓口は他にもあります。全体像は [その他の窓口の一覧](/hermes/docs/user-guide/messaging/) です。

## 4. 任せる

自分で打たなくても動く形にします。

1. 決まった時刻に動かすなら cron です。普通の言葉で「毎朝7時に」と頼めば、Hermes 自身が予約を作ります
2. 一度きりでも繰り返しでも予約でき、結果は依頼元のチャットや手元のファイルに届きます
3. 手順を覚えさせるなら skill です。必要なときだけ読み込まれる知識の文書で、会話の中で `/skills` と打つと一覧が出ます
4. 何をどこまで許すかは、動かす前に決めておきます

次の一歩:

- [Cron](/hermes/docs/user-guide/features/cron/) — 定時実行の作り方
- [skill 一覧](/hermes/guide/skills/) — 同梱されている skill を探す
- [どこまで任せるか](/hermes/trust/) — コマンド実行の許可をどうするか

## 困ったら

つながらない、鍵が通らない、ジョブが動かない。症状から原因と対処を引ける表が [トラブル](/hermes/trouble/) にあります。探している言葉がはっきりしているときは [検索](/hermes/search/) が速いです。日本語のページ全体は [Hermes Agentの使い方](/hermes/guide/) から見渡せます。
