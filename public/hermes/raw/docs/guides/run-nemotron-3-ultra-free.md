---
title: "Hermes Agent で Nemotron 3 Ultra を無料で動かす"
description: "Nous Portal の NVIDIA Nemotron 3 Ultra を試す。6 月 4 日〜18 日は無料、Hermes Agent は初日から対応"
upstream_path: guides/run-nemotron-3-ultra-free.md
upstream_blob: db613e79e99106b52a2519fd246a23e0e93e63a1
sources:
  - https://hermes-agent.nousresearch.com/docs/guides/run-nemotron-3-ultra-free
---

# Hermes Agent で Nemotron 3 Ultra を無料で動かす {#run-nemotron-3-ultra-free-in-hermes-agent}

Nous Research は、**NVIDIA** とともに開かれた最前線の基盤モデルを進めていく主要な AI 研究機関の集まり、**Nemotron Coalition** に加わりました。これを記念して **Nebius** と協力し、**Nemotron 3 Ultra** を [Nous Portal](https://portal.nousresearch.com) 上で 2 週間（**6 月 4 日〜6 月 18 日**）無料で提供します。下の手順に沿って、今日から手元の Hermes Agent でこのモデルを試してみてください。

:::info 期間限定の提供です
`nvidia/nemotron-3-ultra:free` の無料枠は **6 月 4 日から 6 月 18 日まで** です。無料のまま使うための目印が `:free` というタグなので、その表記のものを選んでください。
:::

自分に合うほうの導入方法を選んでください。いちばん簡単なのは **デスクトップアプリ** で、ターミナルはいりません。ふだんターミナルで作業している人は、そのすぐ下の **コマンドライン** での導入が向いています。

## 方法 A — デスクトップアプリ（おすすめ） {#option-a-desktop-app-recommended}

いちばん手軽な道です。インストーラーをひとつ実行すれば、あとは画面の案内に沿ってクリックしていくだけで設定が終わります。ターミナルは不要です。

### 1. ダウンロードしてインストールする {#1-download-and-install}

macOS 版か Windows 版の [Hermes Desktop のインストーラーをダウンロード](https://hermes-agent.nousresearch.com/) して開きます。最初に起動したときに残りの準備が自動で進みます（たいてい 1 分もかかりません）。

### 2. Nous Portal につなぐ {#2-connect-nous-portal}

アプリが開くと「Let's get you set up」という画面が出ます。**Recommended** と書かれた **Nous Portal** をクリックしてください。ブラウザーが開くので、[Nous Portal](https://portal.nousresearch.com) のアカウントを作る（またはサインインする）、**Free** プランを選ぶ、Hermes を承認する、の順に進みます。あとはアプリが自動でつながります。

### 3. 無料の Nemotron 3 Ultra を選ぶ {#3-pick-the-free-nemotron-3-ultra-model}

つながると、アプリに **Default model** のカードが出ます。**Change** をクリックして **nemotron 3 ultra** を検索し、**Free tier** のタグが付いているほうを選びます。

```
nvidia/nemotron-3-ultra:free
```

無料のまま使うための目印が `:free` タグです。その表記のものを選んでください。

### 4. 話しかけてみる {#4-start-chatting}

**Start chatting** をクリックします。これで終わりです。無料の Nemotron 3 Ultra と話せています。

## 方法 B — コマンドライン {#option-b-command-line}

ターミナルのほうがいい人はこちらです。

### 1. Hermes Agent をインストールする {#1-install-hermes-agent}

macOS / Linux / WSL2 / Android では、次を実行します。

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
```

Windows では、次を実行します。

```powershell
iex (irm https://hermes-agent.nousresearch.com/install.ps1)
```

中身を先に確かめたいですか。[`install.sh`](https://hermes-agent.nousresearch.com/install.sh) をダウンロードして目を通してから実行してください。

終わったら、シェルを読み込み直します。

```bash
source ~/.bashrc   # or source ~/.zshrc
```

### 2. クイックセットアップを走らせる {#2-run-quick-setup}

```bash
hermes setup
```

**Quick Setup** を選びます。Hermes がブラウザーのタブを開き、次の手順が終わるのを待ちます。

### 3. Nous Portal のアカウントを作る {#3-create-a-nous-portal-account}

ブラウザーで [Nous Portal](https://portal.nousresearch.com) のアカウントを作り（またはサインインし）、**Free** プランを選びます。

### 4. アカウントをつなぐ {#4-connect-your-account}

アカウントを Hermes Agent につなぐか聞かれたら、**Connect** をクリックします。つながると確認の表示が出ます。

### 5. 無料の Nemotron 3 Ultra を選ぶ {#5-select-the-free-nemotron-3-ultra-model}

ターミナルに戻ります。モデルの一覧から次を選びます。

```
nvidia/nemotron-3-ultra:free
```

無料のまま使うための目印が `:free` タグなので、その表記のものを選んでください。

### 6. 話しかけてみる {#6-start-chatting}

クイックセットアップの残りの質問に答えたら、次を実行します。

```bash
hermes
```

これで終わりです。無料の Nemotron 3 Ultra と話せています。

## あとから切り替える {#switching-to-it-later}

すでに別のモデルで設定してしまった場合はこうします。

- **デスクトップアプリ:** モデルの選択画面を開き、**nemotron 3 ultra** を検索して **Free tier** のほうを選びます。
- **CLI / TUI:** セッションの中からいつでも `/model nvidia/nemotron-3-ultra:free` で切り替えられます。`/model` だけ打てば選択画面が開くので、一覧から選ぶこともできます。

## 困ったときは {#troubleshooting}

- **一覧にモデルが出てこない場合** Nous Portal との接続が最後まで終わっているか、そして **Free** プランになっているかを確かめてください。CLI では `hermes portal info` を実行すると、ログインできているか、Nous を経由しているかが分かります。
- **違うほうを選んでしまった場合** `nvidia/nemotron-3-ultra:free` を選び直してください。無料のまま使うには末尾の `:free` が必要です。
- **ブラウザーが開かない、あるいはリモートのホストで作業している場合（CLI）** ポート転送での回避方法を [SSH 越し・リモートホストでの OAuth](/hermes/docs/guides/oauth-over-ssh/) にまとめています。

## 関連ページ {#see-also}

- **[デスクトップアプリ](/hermes/docs/user-guide/desktop/)** — ワンクリックで入る専用アプリ（macOS、Windows、Linux）
- **[Nous Portal で Hermes Agent を動かす](/hermes/docs/guides/run-hermes-with-nous-portal/)** — モデル、Tool Gateway、動作確認まで含めた Portal の全手順
- **[Nous Portal 連携](/hermes/docs/integrations/nous-portal/)** — 契約に何が含まれるか
- **[クイックスタート](/hermes/docs/getting-started/quickstart/)** — インストールから会話まで 5 分以内
