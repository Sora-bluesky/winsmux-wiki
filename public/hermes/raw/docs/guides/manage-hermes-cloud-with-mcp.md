---
title: "MCP で Hermes Cloud を管理する"
description: "Hermes Agent を Nous Portal の MCP サーバーにつなぎ、手元のエージェントとの会話だけで Hermes Cloud のインスタンスを一覧・起動・停止・管理できるようにする"
upstream_path: guides/manage-hermes-cloud-with-mcp.md
upstream_blob: e7906b19b5bfe2e72e328c190fc9c42d96039985
sources:
  - https://hermes-agent.nousresearch.com/docs/guides/manage-hermes-cloud-with-mcp
---

# MCP で Hermes Cloud を管理する {#manage-hermes-cloud-with-mcp}

[Hermes Cloud](https://portal.nousresearch.com/cloud) は、Hermes Agent のインスタンスを預かって動かしてくれるサービスです。ふだんは [Nous Portal](/hermes/docs/integrations/nous-portal/) の `/agents` のページから管理します。このガイドでは、手元の **ローカル** の Hermes Agent を Portal の MCP サーバーにつなぎ、「クラウドのエージェントを一覧して」「止まっているのを再起動して」「いくらかかってる？」と頼むだけで、端末から離れずにクラウドのインスタンスを管理できるようにします。

これは Nous Research が提供する普通の [MCP](/hermes/docs/user-guide/features/mcp/) サーバーで、Portal で使っているのと同じ OAuth のログインで守られています。つなぐと、Hermes は利用者の代わりに呼び出せるツールを 2 つ手に入れます。

## これで何ができるか {#what-you-can-do-with-it}

つないだあと、モデルは自分の Hermes Cloud の組織に対して次のような操作ができます。

| 頼むこと | 実際に動くもの |
|----------|----------------|
| 「クラウドのエージェントを一覧して」 | `agents`（一覧） |
| 「`<name>` の状態は？」 | `agents`（取得 / 状態） |
| 「このインスタンスはだいたいいくらかかっている？」 | `agents`（cost_estimate） |
| 「`<name>` を起動 / 停止 / 再起動して」 | `agent`（start / stop / restart） |
| 「`<name>` という名前で新しいインスタンスを立てて」 | `agent`（create） |
| 「`<name>` を削除して」 | `agent`（destroy） |
| 「`<name>` の環境変数 / イメージを更新して」 | `agent`（update_env / update_image） |

どの呼び出しも、Portal での本人確認を使って **自分の** 組織に対して実行され、所属は呼び出しのたびに確認し直されます。この接続で触れるのは、Web の画面からすでに操作できるインスタンスだけです。

## 事前に必要なもの {#prerequisites}

- [Nous Portal](/hermes/docs/integrations/nous-portal/) のアカウントがあり、[Hermes Cloud](https://portal.nousresearch.com/cloud) を使える状態であること（インスタンスが 1 つ以上あるか、作れること）。
- MCP のサポートが入っていること。標準のインストールスクリプトを使ったなら、すでに入っています。そうでなければ次を実行します。

  ```bash
  cd ~/.hermes/hermes-agent
  uv pip install -e ".[mcp]"
  ```

別途の API キーやクライアントシークレットは **要りません**。このサーバーは PKCE 付きの OAuth を使い、ログインはブラウザで一度往復するだけです。

## 手順 1: サーバーを追加する {#step-1-add-the-server}

```bash
hermes mcp add --url https://portal.nousresearch.com/mcp --auth oauth hermes-cloud
```

`--auth oauth` は、これが OAuth で保護された HTTP のサーバーであることを Hermes に伝えます。最初に接続するとき、Hermes は次のように動きます。

1. サーバーの OAuth のエンドポイントを自動で見つけます（RFC 9728 / 8414 のメタデータ）。
2. 自分自身をクライアントとして登録します（RFC 7591 の動的クライアント登録）。シークレットを写す作業はありません。
3. ブラウザで Portal を開き、サインインと許可を求めます。
4. 得られたトークンを `~/.hermes/mcp-tokens/` に保存し、以後はそれを使い回します（更新は自動です）。

### 組織を選ぶ {#choosing-an-organization}

Portal のアカウントが **複数の組織** に属している場合、許可の途中でブラウザに **組織の選択画面** が出ます。この接続で管理したい組織を選んでください。選ぶのはブラウザ上での一度だけで、コマンドラインで渡すものはありません。組織が 1 つだけのアカウントでは、この手順は飛ばされ、自動的に結び付きます。

別の組織に切り替えたくなったら、サーバーをいったん削除して追加し直し（`hermes mcp remove hermes-cloud` のあとに、もう一度 `add` のコマンド）、ブラウザで別の組織を選びます。

## 手順 2: つながったか確かめる {#step-2-verify-it-connected}

```bash
hermes mcp test hermes-cloud
```

続いてセッションを開始（または読み込み直し）します。

```bash
hermes chat
```

```text
/reload-mcp
```

読み取りだけの質問を投げて、ツールが生きていることを確かめます。

```text
List my Hermes Cloud agents and their current status.
```

Portal の `/agents` のページで見えるのと同じインスタンスが返ってくるはずです。

## 手順 3: 使ってみる {#step-3-use-it}

読み取りだけの質問はいつでも安全です。

```text
Which of my cloud agents is currently running, and roughly what is each one costing?
```

起動や停止といった操作も、普通の頼み方で伝わります。

```text
Restart the instance called research-bot.
```

```text
Create a new Hermes Cloud instance named scratch, then tell me when it's ready.
```

Hermes は、それぞれのツールが返した内容（インスタンスの一覧、新しい状態、作成されたインスタンスの詳細）を報告するので、操作がきちんと通ったかを確認できます。

## 設定 {#configuration}

`hermes mcp add` を実行すると、サーバーの設定は `~/.hermes/config.yaml` に入ります。

```yaml
mcp_servers:
  hermes-cloud:
    url: "https://portal.nousresearch.com/mcp"
    auth: oauth
```

認証情報は `config.yaml` には入りません。OAuth のトークンは `~/.hermes/mcp-tokens/` に別で保管されます。Portal の更新用トークンが設定ファイルの外に置かれるのと同じ考え方です。

### 使えるツールを絞る {#limiting-the-tool-surface}

このサーバーは、読み取りの `agents` と、状態を変える `agent` の両方のツールを公開します。この接続を **読み取り専用** にして、一覧や確認はできても起動・停止・作成・削除はさせたくない場合は、`agents` のツールだけに絞ります。

```yaml
mcp_servers:
  hermes-cloud:
    url: "https://portal.nousresearch.com/mcp"
    auth: oauth
    tools:
      include: [agents]
```

設定を変えたら `/reload-mcp` を実行してください。絞り込みの仕組み全体（`include` と `exclude`、`prompts`、`resources`）については [Hermes で MCP を使う](/hermes/docs/guides/use-mcp-with-hermes/) を参照してください。

## うまくいかないとき {#troubleshooting}

### ブラウザに組織の選択画面が出たが、どれを選べばよいか分からない {#the-browser-shows-an-org-picker-and-im-not-sure-which-to-choose}

Portal の組織に複数所属しています。この接続から管理したい Hermes Cloud のインスタンスを持っている組織を選んでください。迷ったら、Portal の `/agents` のページに見えているインスタンスの持ち主の組織です。あとからサーバーを削除して追加し直せば、選び直せます。

### 接続時に「invalid_client」や「unknown client」と出る {#invalidclient-or-unknown-client-on-connect}

保存されているクライアント登録が、サーバー側と合わなくなっています（たとえば以前に別の環境へつないだ場合など）。このサーバーの OAuth の状態を消してから、追加し直してください。

```bash
hermes mcp remove hermes-cloud
rm -f ~/.hermes/mcp-tokens/hermes-cloud.*
hermes mcp add --url https://portal.nousresearch.com/mcp --auth oauth hermes-cloud
```

### サーバーを追加したのにツールが出てこない {#the-tools-arent-showing-up-after-adding-the-server}

セッションの中で MCP を読み込み直して、もう一度確かめます。

```text
/reload-mcp
```

```text
Tell me which MCP-backed tools are available right now.
```

それでも出てこない場合は、`hermes mcp test hermes-cloud` を実行すると接続のエラーがそのまま見られます。

### 何度もログインを求められる {#it-asks-me-to-log-in-again}

OAuth のトークンは自動で更新されますが、Portal 側でセッションが無効になると（パスワードの変更、取り消し、期限切れなど）、次の呼び出しで許可のやり直しを求められます。`hermes mcp add` のコマンドをもう一度実行すれば、ブラウザでの手順を通してトークンが作り直されます。

### 画面のない環境・SSH・リモートのホスト {#headless-ssh-remote-host}

OAuth のブラウザからの戻りは、Hermes が動いている端末で受け取ります。リモートのホストでは、ほかの OAuth のログインと同じように、ループバックのポートを SSH で転送してください。[SSH 越しの OAuth / リモートのホスト](/hermes/docs/guides/oauth-over-ssh/) を参照してください。

## 関連する項目 {#see-also}

- **[Nous Portal](/hermes/docs/integrations/nous-portal/)** — 同じログインの先にある、サブスクリプション・モデル・Tool Gateway
- **[Hermes で MCP を使う](/hermes/docs/guides/use-mcp-with-hermes/)** — MCP サーバー全般のつなぎ方と絞り込み方
- **[MCP 機能の概要](/hermes/docs/user-guide/features/mcp/)** — MCP とは何か、Hermes がどう使っているか
- **[MCP 設定の一覧](/hermes/docs/reference/mcp-config-reference/)** — `auth: oauth` を含む `mcp_servers` のすべての項目
- **[SSH 越しの OAuth](/hermes/docs/guides/oauth-over-ssh/)** — リモート環境やブラウザしかない環境からログインする方法
