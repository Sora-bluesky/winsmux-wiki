---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "公式ドメインとフィッシング対策"
description: "本物の Hermes Agent のリソースを使っているかどうかを確かめる方法と、なりすまし詐欺の見分け方を説明します。"
upstream_path: getting-started/official-domains.md
upstream_blob: 00225df28f35ace1730223abad40a34b52986719
sources:
  - https://hermes-agent.nousresearch.com/docs/getting-started/official-domains
---

# 公式ドメインとフィッシング対策 {#official-domains-phishing-safety}

Hermes Agent の人気に便乗したなりすましが出てきています。偽の「Hermes」サイト、短縮リンクを付けてコントリビューターに一斉にメンションする GitHub アカウント、よく似た名前の製品の「クレジット」を勧める見知らぬ相手からのメールなどです。このページでは公式の提供元をまとめています。Hermes Agent を名乗るものに出会ったら、ここで照らし合わせて確かめてください。

## 公式の提供元 {#official-sources}

Nous Research は `nousresearch.com` とそのサブドメインを運営しています。Hermes Agent が使っているのは次のとおりです。

| アドレス | 内容 |
|---|---|
| [hermes-agent.nousresearch.com](https://hermes-agent.nousresearch.com/) | ドキュメント、Desktop 版のダウンロード、インストーラーの `install.sh` / `install.ps1` |
| `hermes-assets.nousresearch.com` | リリース用のファイル置き場です。Desktop 版のパッケージと更新、Termux 用の APT リポジトリ、インストーラーのミラーがあります |
| [portal.nousresearch.com](https://portal.nousresearch.com/) | Nous Portal です。アカウントへのサインイン、サブスクリプション、支払いを扱います |
| `inference-api.nousresearch.com` | Nous プロバイダーを使うときに Hermes が呼び出す Nous の推論 API です（Web ページはありません） |
| [nousresearch.com](https://nousresearch.com/) | Nous Research の Web サイト |

`nousresearch.com` 以外の公式の場所は次のとおりです。

- **GitHub:** [NousResearch の組織アカウント](https://github.com/NousResearch)と、その中の [hermes-agent リポジトリ](https://github.com/NousResearch/hermes-agent)です（ソースコード、リリース、Nix flake）。このリポジトリのファイルをそのまま取得するときは `raw.githubusercontent.com/NousResearch/hermes-agent/...` から配信されますが、これは同じリポジトリで、別の提供元ではありません。これ以外のアカウントやリポジトリは私たちのものではありません。
- **Docker Hub:** [`nousresearch/hermes-agent`](https://hub.docker.com/r/nousresearch/hermes-agent) イメージです。リポジトリのリリース用ワークフローから公開されています（[Docker](/hermes/docs/user-guide/docker/) を参照してください）。公式なのは `nousresearch` の名前空間だけで、ほかの名前やレジストリにあるイメージは公式ではありません。
- **X (Twitter):** [@NousResearch](https://x.com/NousResearch)
- **Discord:** [discord.gg/NousResearch](https://discord.gg/NousResearch)

## 公式の提供元からインストールする {#installing-from-an-official-source}

スクリプト形式のインストーラーは `hermes-agent.nousresearch.com` から配信されています。

```bash
# Linux / macOS / WSL2
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
```

```powershell
# Windows (native)
iex (irm https://hermes-agent.nousresearch.com/install.ps1)
```

ほかのインストール方法も、すべて公式の提供元から取得します。Desktop 版のパッケージは [Hermes の Web サイト](https://hermes-agent.nousresearch.com/)からダウンロードします。Termux では上のスクリプトではなく、`hermes-assets.nousresearch.com` にある署名付きの APT リポジトリを使います（[Termux ガイド](/hermes/docs/getting-started/termux/)を参照してください）。Nix は GitHub リポジトリからビルドします（[Nix と NixOS](/hermes/docs/getting-started/nix-setup/) を参照してください）。Docker は Docker Hub から `nousresearch/hermes-agent` を取得します。ガイドによっては `install.ps1` をリポジトリの `raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.ps1` から直接取得していますが、中身は同じスクリプトです。

インストーラー、ダウンロード、イメージ、「ポータル」が、このページに挙げた提供元以外の場所に置かれていたら、信用しないでください。

## 公式ではないもの {#not-official}

- **`nousresearch.com` とそのサブドメイン以外のドメイン**（上に挙げたアカウントを除く）はすべて公式ではありません。「hermes」や「hermes-agent」を含んでいても（`.icu`、`.org`、`.ai` などの変種）、ロゴやデザインをまねていても、「公式ドキュメントへの案内」とうたっていても同じです。ホスト名は最後まで読んでください。`hermes-agent.nousresearch.com.example.net` は Nous Research のサブドメインではありません。
- **暗号資産のトークン。** **Hermes Agent や Nous Research のトークンは存在しません**。トークンを宣伝しているアカウントやサイトは詐欺です。
- **ユーザーに一斉にメンションする GitHub アカウント。** Discussions や Issue で「コミュニティからのお知らせ」といった投稿をし、URL 短縮サービスのリンク（`goo.su`、`bit.ly` など）を貼ってくるものです。本物のプロジェクトのお知らせが、短縮リンク付きの一斉 @メンションで届くことはありません。
- **頼んでいないのに届くメール。** クレジットの提供、ホスティング型の「マルチプレイヤー版 Hermes」製品、提携の話などを持ちかけ、信用させるためにプロジェクト名を持ち出してくるものです。

## 怪しいメッセージを受け取ったら {#if-you-receive-a-suspicious-message}

1. 短縮リンクや公式ドメイン以外へのリンクは**クリックしないでください**。認証情報を入力したり、ウォレットを接続したりもしないでください。
2. GitHub（プロフィールの `Report abuse`）や、該当するプラットフォームに**アカウントを通報してください**。
3. 上のルールに沿って**ホスト名を確認してください**。`nousresearch.com` でもそのサブドメインでもなく、ここに挙げたアカウントでもなければ、私たちのものではありません。
4. 必要に応じて [Nous Research の Discord](https://discord.gg/NousResearch) や Issue で知らせて、ほかの人にも気づいてもらうこともできます。ただし、なりすましはプロジェクトの外で起きている悪用なので、コードの修正ではなく、プラットフォームへの通報で対処することになります。

Hermes Agent は MIT ライセンスで、無料で自分の環境で動かせます。正当な相手が、オープンソースのエージェントそのものに料金を求めたり、「あなたのアカウントにクレジットが届いています」と言ってきたり、DM で別のダウンロードリンクを送ってきたりすることは決してありません。
