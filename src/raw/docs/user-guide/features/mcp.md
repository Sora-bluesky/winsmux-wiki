---
title: "MCP（Model Context Protocol）"
description: "MCP を通して Hermes Agent を外部のツールサーバーにつなぎ、読み込むツールを細かく選ぶ"
upstream_path: user-guide/features/mcp.md
upstream_blob: 755941407aa7aa8cd41e813e7ba1829a29d644ed
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp
---

# MCP（Model Context Protocol） {#mcp-model-context-protocol}

MCP を使うと、Hermes Agent を外部のツールサーバーにつなげます。GitHub、データベース、ファイルシステム、ブラウザ環境、社内 API など、Hermes の外にあるツールをエージェントが扱えるようになります。

すでにどこかにあるツールを Hermes に使わせたい。そう思ったときは、たいてい MCP がいちばん素直な方法です。

:::tip Claude Code から移ってきた場合
`~/.claude.json` の `mcpServers` の部分は、Hermes の `config.yaml` では `mcp_servers` にあたります。`hermes import-agent claude-code` を実行すれば、スキルや指示ファイルと一緒に自動で移せます。[他のエージェントから取り込む](/hermes/docs/user-guide/import-from-other-agents/)を参照してください。
:::

## MCP で何ができるか {#what-mcp-gives-you}

- Hermes 用のツールをわざわざ作らなくても、外部のツール群をそのまま使える
- 手元で動く stdio のサーバーと、遠隔の HTTP MCP サーバーを同じ設定に書ける
- 起動時にツールを自動で見つけて登録する
- サーバーが対応していれば、MCP のリソースやプロンプトを扱う補助ツールも用意される
- サーバーごとに絞り込めるので、Hermes に見せたい MCP ツールだけを出せる

## 使い始める {#quick-start}

1. MCP は標準のインストールに含まれています。追加の作業は要りません。

2. `~/.hermes/config.yaml` に MCP サーバーを追加します。

```yaml
mcp_servers:
  filesystem:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/projects"]
```

3. Hermes を起動します。

```bash
hermes chat
```

4. MCP 側の機能を使うように Hermes へ頼みます。

たとえば次のように頼みます。

```text
List the files in /home/user/projects and summarize the repo structure.
```

Hermes は MCP サーバーのツールを見つけ、他のツールと同じように使います。

## カタログ: Nous が確認した MCP をワンクリックで入れる {#catalog-one-click-install-for-nous-approved-mcps}

Hermes には、Nous のスタッフが内容を確認して取り込んだ MCP サーバーの一覧が
付いてきます。既定ではどれも無効なので、本当に使いたいものだけを入れてください。

```bash
hermes mcp                # interactive picker (default)
hermes mcp catalog        # plain-text list, scriptable
hermes mcp install n8n    # install a catalog entry by name
```

選択画面では、それぞれの項目が現在の状態とともに表示されます。

```
n8n          available              Manage and inspect n8n workflows from Hermes
linear       enabled                Linear issue/project management (remote OAuth)
github       installed (disabled)   GitHub repo + PR tools
```

行を選んで `Enter` を押すと、インストール（必要な認証情報の入力を順に案内します）、
有効化、無効化、削除ができます。カタログの各項目は hermes-agent リポジトリの
`optional-mcps/` 以下に置かれていて、ここにあること自体が Nous の確認済みという印です。
コミュニティが自由に登録できる枠はなく、項目の追加は PR のマージによって行われます。

カタログの項目には、次のものが必要になる場合があります。

- **API キー** — インストール時に Hermes が入力を求め、値を `~/.hermes/.env` に
  書き込みます。秘密でない値（ベース URL など）も同じファイルに入ります。
- **OAuth**（遠隔の MCP）— 設定には `auth: oauth` と書かれ、MCP クライアントが
  最初の接続時にブラウザを開きます。
- **OAuth**（Google や GitHub などの外部サービス）— まだ認証していなければ、
  Hermes が `hermes auth <provider>` を案内します。

### インストール時にツールを選ぶ {#tool-selection-at-install-time}

認証情報の設定が終わると、Hermes は MCP サーバーに問い合わせて公開されている
ツールをすべて調べ、チェックリストとして表示します。

```
Select tools for 'linear' (SPACE toggle, ENTER confirm)
  [x] find_issues       Find issues matching a query
  [x] get_issue         Get a single issue
  [x] create_issue      Create a new issue
  [ ] delete_workspace  Delete a Linear workspace
  ...
```

あらかじめチェックが入っている行は、次の順に決まります。

1. **前回の選択**。同じ項目を以前に入れたことがあれば、そのときの選択が保たれます
   （入れ直しても、定義ファイル側の既定が上書きすることはありません）
2. **定義ファイルの `tools.default_enabled`**。項目がこれを宣言している場合
   （カタログには、状態を変えるツールやめったに使わないツールをあらかじめ外してあるものがあります）
3. **すべて**。どちらにも当てはまらない場合

チェックリストは ENTER で確定します。チェックしたツールだけが
`mcp_servers.<name>.tools.include` に入ります。すべて選んだ場合は絞り込みが
書き込まれません（設定がいちばんすっきりした形になり、動きは同じです）。

**問い合わせに失敗したとき**（サーバーにつながらない、OAuth をまだ終えていない、
裏側のサービスが動いていない、など）でもインストール自体は成功します。定義ファイルの
`tools.default_enabled` がそのまま適用されるか（宣言があれば）、絞り込みが
書き込まれないか（宣言がなければ）のどちらかです。サーバーにつながるようになったら
`hermes mcp configure <name>` を実行し直して調整してください。

### 何をどこまで信用するか {#trust-model}

カタログの項目を入れると、その定義ファイルに書かれた処理がそのまま実行されます。`git clone`、
項目の `bootstrap` に書かれたコマンド（`pip install`、`npm install` など）、そして最終的には
MCP サーバー自身のコードです。定義ファイルは hermes-agent リポジトリへの PR レビューを
通ってから公開されるので、Nous はどの項目にも一度目を通しています。
**それでも、入れる前に定義ファイルを自分で読んでください**。とくに `source:` に書かれた
リポジトリ、`install.bootstrap:` のコマンド、`transport.command:` の呼び出し内容を確認しましょう。

定義ファイルは GitHub 上の
[`optional-mcps/<name>/manifest.yaml`](https://github.com/NousResearch/hermes-agent/tree/main/optional-mcps)
にあります。選択画面でもインストール時に定義ファイルの `source:` の URL が表示されるので、
どのリポジトリのものかをその場で確かめられます。Web のダッシュボードの MCP のページにも
同じ情報が項目ごとに出ます。転送方式、認証の種類、接続先の URL（HTTP の場合）または
コマンドと引数（stdio の場合）、git の取得元とバージョン、bootstrap のコマンド、設定上の注意が
並び、`source:` はクリックできるリンクになっているので、Install を押す前にその項目が何につなぎ、
何を実行するのかを確かめられます。

### 定義ファイルのバージョン対応 {#manifest-version-compatibility}

定義ファイルには `manifest_version` が書かれています。カタログは将来のバージョンにも
対応していて、手元の Hermes が理解できるより新しい `manifest_version` の項目が PR で
追加された場合、その項目を黙って隠すのではなく、選択画面に警告（`⚠ '<name>' requires a newer
Hermes`）が表示されます。これが出たら `hermes update` を実行して最新の Hermes を入れてください。

### 実行時の `${ENV_VAR}` の置き換え {#runtime-envvar-substitution}

項目の `transport.command`、`transport.args`、`transport.url`、`headers` の中では、
`${VAR}` という書き方がサーバーへの接続時に環境変数から置き換えられます
（`~/.hermes/.env` の内容もすべて含まれます）。カタログの項目が、利用者が別の場所で
設定した値を参照したいときに便利です。たとえば `${HOME}/foo` や `${MY_PROVIDER_TOKEN}`
のように書けます。

Cursor 形式の文脈変数も置き換えられます（大文字と小文字は区別します）。
`${userHome}`（ホームディレクトリ）、`${workspaceFolder}`（セッションの作業場所の
起点）、`${workspaceFolderBasename}`、`${pathSeparator}` / `${/}`
（OS のパス区切り文字）です。詳しくは
[MCP 設定の一覧](/hermes/docs/reference/mcp-config-reference/)を参照してください。

これはカタログの定義ファイルにある `${INSTALL_DIR}` とは別物です。あちらは
インストール時に、カタログがその項目のリポジトリを取得した場所へ置き換えられます。

### あとからツールの選択を変える {#updating-tool-selection-later}

```bash
hermes mcp configure linear
```

今の選択にチェックが入った状態で、同じチェックリストがもう一度開きます。使えるツールを
増やしたいときや、サーバー側に増えた新しいツールを使いたいときに実行してください。

### カタログの定義ファイルを更新する {#updating-the-catalog-manifest}

MCP が自動で更新されることはありません。Hermes を更新したあと定義ファイルのバージョンが
変わっていたら、`hermes mcp install <name>` を実行し直して取り込んでください。

カタログに MCP を追加したい場合は、
[`optional-mcps/`](https://github.com/NousResearch/hermes-agent/tree/main/optional-mcps)
に対して PR を出してください。

### 提案用の情報（`suggest:`） {#suggestion-metadata-suggest}

定義ファイルには、`keywords:` や `hosts:` の一覧を持つ `suggest:` という任意の項目を
書けます。画面側（今のところ Desktop アプリの入力欄）はこれを使い、書きかけの文章に
キーワードが単語として含まれているときや、末尾がここに挙げたホスト名で終わるリンクが
貼られているときに、ワンクリックで追加できる「Add &lt;server&gt;」のボタンを出します。
あくまで案内であって、インストールはこれまでどおり検証済みのカタログや設定の経路を通ります。
遠隔で提供される項目のほとんど（Atlassian、Sentry、Notion、Stripe、Vercel、Supabase など）が
この情報を持っています。

GitHub はあえてカタログに入れていません。GitHub が提供する MCP はクライアントごとに
独自の OAuth アプリを用意する必要があり（一般的な自動登録は拒否されます）、しかも Hermes に
同梱の `github/*` スキルが `gh` コマンドを動かすほうが、できることが多いからです。Desktop では、
GitHub の話題が出たときに `gh` へのサインインがまだなら `github-auth` スキルを案内します。

## MCP サーバーには 2 種類ある {#two-kinds-of-mcp-servers}

### stdio のサーバー {#stdio-servers}

stdio のサーバーは手元で子プロセスとして動き、標準入出力でやり取りします。

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "***"
```

stdio のサーバーが向いているのは、次のような場合です。
- サーバーを手元に入れてある
- 手元のデータへ待ち時間なくアクセスしたい
- 参照している MCP サーバーの説明に `command`、`args`、`env` が出てくる

### HTTP のサーバー {#http-servers}

HTTP の MCP サーバーは、Hermes が直接つなぐ遠隔の接続先です。

```yaml
mcp_servers:
  remote_api:
    url: "https://mcp.example.com/mcp"
    headers:
      Authorization: "Bearer ***"
```

HTTP のサーバーが向いているのは、次のような場合です。
- MCP サーバーがよそで動いている
- 組織が社内向けの MCP の接続先を公開している
- その連携のために Hermes に子プロセスを起動させたくない

### OAuth で認証する HTTP サーバー {#oauth-authenticated-http-servers}

提供元がホストしている MCP サーバーの多く（Linear、Sentry、Atlassian、Asana、Figma、Stripe など）は、固定のトークンではなく OAuth 2.1 を求めます。`auth: oauth` と書いておけば、接続先の情報の取得、クライアントの識別、PKCE、トークンの交換と更新、追加認証まで、Hermes が MCP の Python SDK を通して処理します。

対応しているサーバーに対して、Hermes は [Client ID Metadata Document](/hermes/docs/reference/mcp-config-reference/#client-identification-cimd-and-dcr) で自分を名乗り、対応していないサーバーには動的クライアント登録で切り替えます。どちらも自動なので、設定することは何もありません。

:::tip Figma の遠隔 MCP
Figma の接続先（`https://mcp.figma.com/mcp`）は、動的クライアント登録を **`client_name` の完全一致**で許可しています。素の `"Hermes Agent"` は 403 になり、`"Claude Code"` や `"Codex"` は通ります。そこで Hermes は `mcp.figma.com` に対して `oauth.client_name: "Claude Code"` を自動で設定するので、特別な小細工なしにインストールとログインができます。

```yaml
mcp_servers:
  figma:
    url: "https://mcp.figma.com/mcp"
    auth: oauth
```

あるいは `hermes mcp install figma` を実行してから `hermes mcp login figma` を実行してください。
:::

```yaml
mcp_servers:
  linear:
    url: "https://mcp.linear.app/mcp"
    auth: oauth
```

初回の接続時、Hermes は認可用の URL を表示し、可能ならブラウザを開いて、手元の折り返し用ポートで OAuth の応答を待ちます。トークンは `~/.hermes/mcp-tokens/<server>.json` に 0o600 の権限で保存され、更新に失敗するまでは 2 回目以降そのまま使われます。

**遠隔のホストや画面のないホストの場合。** Hermes がブラウザとは別の端末で動いていると、折り返しの通信が手元のパソコンまで届きません。この流れを完了させる方法が 2 つあります。

- **URL を貼り戻す（準備不要）:** 対話できる端末なら、Hermes が認可用の URL と一緒に「Or paste the redirect URL here…」と表示します。その URL をブラウザで開いて許可し、最終的にブラウザが表示している URL をそのままコピーして（接続エラーの画面になりますが、それで正常です）、プロンプトに貼り付けてください。`?code=…&state=…` の部分だけでも通ります。
- **SSH のポート転送:** 別の端末で `ssh -N -L <port>:127.0.0.1:<port> user@host` を実行し、そのうえで通常どおり折り返させます。
- **中継した折り返し（`redirect_uri`）:** 公開された HTTPS の接続先がホストへ転送してくれる場合（Tailscale Funnel や、折り返し用ポートに向けたリバースプロキシなど）、`oauth.redirect_uri` を設定すればブラウザからの折り返しがそのまま Hermes に届きます。トンネルも貼り戻しも要りません。

```yaml
mcp_servers:
  myserver:
    url: "https://mcp.example.com/mcp"
    auth: oauth
    oauth:
      redirect_port: 8765                                # fixed port for the proxy to target
      redirect_uri: "https://oauth.example.ts.net/callback"
```

対話できる端末がまったくない完全な無人環境（メッセージ用のボットなど）では、任意で入れられる [`mcp-oauth-remote-gateway` スキル](/hermes/docs/user-guide/skills/optional/mcp/mcp-mcp-oauth-remote-gateway/)が、手作業で認証を終えてトークンを Hermes の想定する場所に書くところまでエージェントを案内します。

**つまずきどころ — WAF が `127.0.0.1` の折り返し先を弾く。** 一部の提供元は認可サーバーの前段に WAF を置いていて、問い合わせ文字列に `127.0.0.1` がそのまま入っている認可要求を 403 にします（Reclaim.ai の AWS API Gateway が知られた例で、OAuth アプリに届く前にすべて `{"message":"Forbidden"}` が返ります）。`oauth.redirect_host: localhost` を設定して `http://localhost:<port>/callback` を使ってください。どちらの設定でも、受け口自体は `127.0.0.1` で待ち受けます。

DCR に対応しないサーバー（Slack など）、あらかじめ登録した `client_id` / `client_secret`、スコープの指定、`hermes mcp login <server>` による再認証まで含めた詳しい手順は、[SSH 越し / 遠隔ホストでの OAuth](/hermes/docs/guides/oauth-over-ssh/#mcp-servers) を参照してください。

**つまずきどころ — 自動登録に対応しない提供元（Google Drive、Atlassian）。** 素の `auth: oauth` が前提にしている動的クライアント登録（RFC 7591）を拒否するサーバーがあります。Google 公式の Drive サーバー（`https://drivemcp.googleapis.com/mcp/v1`）は `400 Bad Request` を返すため、OAuth クライアントが作られず、トークンも取得できません。この症状は分かりにくく、こうしたサーバーは認証なしでも `tools/list` に応えるので、`hermes mcp login` がツール一覧を表示してうまくいったように見えます。ところが実際にツールを呼ぶと、あとからすべて時間切れになります。現在の `hermes mcp login` はこれを検出し（トークンが本当にディスクに書かれたかを確認します）、自分の OAuth クライアントを用意するよう案内します。提供元の管理画面でクライアントを作り、設定に追加してください。

```yaml
mcp_servers:
  googledrive:
    url: "https://drivemcp.googleapis.com/mcp/v1"
    auth: oauth
    oauth:
      client_id: "<your-oauth-client-id>"
      client_secret: "<your-oauth-client-secret>"
```

そのうえで `hermes mcp login googledrive` を実行します。登録済みのクライアントがあれば、Hermes は登録の手順を飛ばして通常のブラウザでの認可に進みます。

**つまずきどころ — 設定の自動再読み込みとの競合。** Hermes のセッションを動かしたまま `~/.hermes/config.yaml` を編集すると、CLI が 30 秒の制限付きで MCP の接続を読み込み直します。対話しながら進める OAuth にはこの時間では足りません。項目を追加したら、別の端末を開いて `hermes mcp login <server>` を実行してください。こちらは認証を終えるまで 5 分まで待ちます。

## mTLS / クライアント証明書 {#mtls-client-certificates}

相互 TLS（クライアント証明書による認証）を求める遠隔の HTTP MCP サーバーには、`client_cert` と `client_key` で対応できます。Hermes は解決した証明書を、TLS の接続処理のために内部の HTTP クライアントへ渡します。

`client_cert` には 3 通りの書き方があります。

- **1 つにまとめた PEM ファイルのパス** — 証明書と秘密鍵が同じファイルに入っている場合:

```yaml
mcp_servers:
  internal_api:
    url: "https://mcp.internal.example.com/mcp"
    client_cert: "~/.certs/mcp-client.pem"
```

- **`[cert, key]` の 2 要素** — 証明書と鍵が別ファイルの場合（`client_cert` と `client_key` を両方書くのと同じです）:

```yaml
mcp_servers:
  internal_api:
    url: "https://mcp.internal.example.com/mcp"
    client_cert: ["~/.certs/mcp-client.crt", "~/.certs/mcp-client.key"]
```

- **`[cert, key, password]` の 3 要素** — 秘密鍵が暗号化されている場合、3 つめがその鍵の合言葉になります:

```yaml
mcp_servers:
  internal_api:
    url: "https://mcp.internal.example.com/mcp"
    client_cert: ["~/.certs/mcp-client.crt", "~/.certs/mcp-client.key", "${MCP_KEY_PASSWORD}"]
```

`client_cert` に 1 つにまとめた PEM を書いたうえで `client_key` を明示し、証明書と鍵を完全に分けることもできます。パスでは `~` が展開されます。ファイルが見つからない場合は、分かりにくい TLS の失敗ではなく、どのサーバーの話かが分かるはっきりしたエラーになります。

## 利用者を示すヘッダー {#per-user-identity-header}

呼び出し元によって動きを変える遠隔の HTTP / SSE の MCP サーバー（利用者ごとの回数制限、監査記録、テナントごとの振り分けなど）には、`identity_header` を使ってすべての要求に利用者を示すヘッダーを付けられます。

```yaml
mcp_servers:
  team_api:
    url: "https://mcp.team.example.com/mcp"
    identity_header:
      name: "X-User-Id"
      value_from: "static"   # "static" (default) or "profile"
      value: "alice"         # required for static
```

- `value_from: static` は config.yaml に書いた `value` をそのまま送ります。
- `value_from: profile` は、接続時に一度だけ解決した Hermes のプロファイル名を送ります。1 台の端末にある複数のプロファイルが同じサーバーにつないでいて、サーバー側で区別したいときに便利です。

サーバーの `headers` に同じ名前（大文字小文字は問いません）を明示していれば、そちらが必ず優先されます。利用者を示すヘッダーが自分で書いたヘッダーを上書きすることはありません。`identity_header` の書き方が正しくない場合は、警告が出たうえで無視されます。それが原因でサーバーにつながらなくなることはありません。stdio のサーバーではこの項目は警告付きで無視されます（stdio の通信にヘッダーという仕組みが無いためです）。

## 基本的な設定項目 {#basic-configuration-reference}

Hermes は `~/.hermes/config.yaml` の `mcp_servers` から MCP の設定を読みます。

### よく使う項目 {#common-keys}

| 項目 | 型 | 意味 |
|---|---|---|
| `command` | 文字列 | stdio の MCP サーバーとして実行するファイル |
| `args` | リスト | stdio のサーバーに渡す引数 |
| `env` | 対応表 | stdio のサーバーに渡す環境変数 |
| `url` | 文字列 | HTTP の MCP の接続先 |
| `headers` | 対応表 | 遠隔サーバーに付ける HTTP ヘッダー |
| `client_cert` | 文字列 \| リスト | mTLS 用のクライアント証明書。1 つにまとめた PEM のパス、または `[cert, key]` / `[cert, key, password]` |
| `client_key` | 文字列 | クライアントの秘密鍵の PEM のパス（`client_cert` と分けている場合） |
| `identity_header` | 対応表 | HTTP / SSE のサーバー向けに、利用者を示すヘッダーを任意で付ける。`{name, value_from: static\|profile, value}` |
| `timeout` | 数値 | ツール呼び出しの制限時間 |
| `connect_timeout` | 数値 | 最初の接続の制限時間（MCP の `initialize` のやり取りにも適用されます） |
| `idle_timeout_seconds` | 数値 | ツールが呼ばれない状態がこの秒数続いたら stdio のサーバーを畳みます（`0` は畳まない。これが既定）。次にツールが呼ばれたときに自動で起動し直します。 |
| `max_lifetime_seconds` | 数値 | 起動からこの時間が経ったら stdio のサーバーを畳みます（`0` は畳まない。これが既定）。次に使うときに自動で起動し直します。 |
| `enabled` | 真偽値 | `false` なら Hermes はそのサーバーを完全に飛ばします |
| `supports_parallel_tool_calls` | 真偽値 | `true` なら、このサーバーのツールを同時に動かすことがあります |
| `tools` | 対応表 | サーバーごとのツールの絞り込みと補助ツールの扱い |

### stdio の最小の例 {#minimal-stdio-example}

```yaml
mcp_servers:
  filesystem:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
```

### メモリを多く使う stdio サーバーを畳む {#recycling-memory-heavy-stdio-servers}

ブラウザを使う MCP サーバー（`@playwright/mcp` など）は、最初にツールが呼ばれると
Chromium を丸ごと常駐させます。数百 MB が解放されないまま残るということです。自動で
畳む設定を有効にすると、待機時間や稼働時間の上限を超えたところでいったん終了し、次に
そのサーバーのツールが呼ばれたときに自動で起動し直します（その間もツールの登録は
残ったままです）。

```yaml
mcp_servers:
  playwright:
    command: "npx"
    args: ["-y", "@playwright/mcp@latest", "--headless"]
    idle_timeout_seconds: 900     # recycle after 15 min without a tool call
    max_lifetime_seconds: 86400   # and at least once a day regardless
```

### HTTP の最小の例 {#minimal-http-example}

```yaml
mcp_servers:
  company_api:
    url: "https://mcp.internal.example.com"
    headers:
      Authorization: "Bearer ***"
```

## 組み込みの雛形 {#built-in-presets}

よく知られた MCP サーバーについては、`hermes mcp add` に `--preset` を付けると接続方法を自動で埋めてくれるので、コマンドや引数を調べる手間が要りません。雛形が入れるのはあくまで既定値なので、同じコマンドラインで指定したもの（環境変数、ヘッダー、絞り込みなど）が優先されます。

| 雛形 | 設定される内容 |
|---|---|
| `codex` | Codex CLI の MCP サーバー（`codex mcp-server` を stdio で実行）。`codex` コマンドが PATH 上にある必要があります。 |

```bash
# Add Codex CLI as an MCP server in one line
hermes mcp add codex --preset codex
```

これは次の設定を書くのと同じです。

```yaml
mcp_servers:
  codex:
    command: "codex"
    args: ["mcp-server"]
```

手元での名前は自由に付けられます（`hermes mcp add my-codex --preset codex` でも問題ありません）。雛形が提供するのは `command` と `args` の既定値だけです。

## MCP のツールがどう登録されるか {#how-hermes-registers-mcp-tools}

Hermes は、組み込みのツール名とぶつからないよう MCP のツール名に接頭辞を付けます。

```text
mcp_<server_name>_<tool_name>
```

例:

| サーバー | MCP のツール名 | 登録される名前 |
|---|---|---|
| `filesystem` | `read_file` | `mcp_filesystem_read_file` |
| `github` | `create-issue` | `mcp_github_create_issue` |
| `my-api` | `query.data` | `mcp_my_api_query_data` |

実際のところ、この接頭辞付きの名前を自分で呼ぶ場面はほとんどありません。Hermes はツールを認識して、考えながら自分で選びます。

### ツールの結果の後処理と `_meta` {#tool-result-sanitization-and-meta}

MCP のツールの結果は、モデルに渡る前に必ず次の 2 つの処理を受けます。

- **見えない Unicode の TAG 文字を取り除きます。** U+E0000〜U+E007F の文字は端末やチャット画面には何も表示されませんが、モデルにははっきり見えます。悪意のあるサーバーや乗っ取られたサーバーが指示を忍び込ませる、古典的な抜け道です。Hermes はツールの結果、リソースの内容、ツールの説明文からこれらを取り除きます。絵文字として正当なタグの並び（🏴󠁧󠁢󠁳󠁣󠁴󠁿 のような地域旗）はそのまま残します。
- **提供元独自の `_meta` は渡し、プロトコルが予約している名前は渡しません。** サーバーがツールの結果に `_meta` を付けてきた場合（`com.example/handoff` のような提供元ごとの名前空間）、Hermes はそれを結果の本文と一緒にモデルへ渡します。プロトコルが予約している接頭辞の下にある名前は落とします。具体的には `modelcontextprotocol` または `mcp` というラベルの後にもう 1 つラベルが続くもの、たとえば `modelcontextprotocol.io/...` や `tools.mcp.com/...` です。MCP の仕様が定める名前の規則に合わせています。モデルに渡すものが何も残らなければ、`_meta` の項目自体を省きます。

## MCP の補助ツール {#mcp-utility-tools}

サーバーが対応している場合、Hermes は MCP のリソースやプロンプトを扱う補助ツールも登録します。

- `list_resources`
- `read_resource`
- `list_prompts`
- `get_prompt`

これらもサーバーごとに、同じ接頭辞の付いた形で登録されます。たとえば次のようになります。

- `mcp_github_list_resources`
- `mcp_github_get_prompt`

### 大事な点 {#important}

これらの補助ツールは、サーバーの対応状況を見て登録されます。
- リソースの操作に MCP のセッションが実際に対応している場合だけ、リソース用の補助ツールを登録します
- プロンプトの操作に実際に対応している場合だけ、プロンプト用の補助ツールを登録します

そのため、呼び出せるツールはあるがリソースやプロンプトを持たないサーバーには、この追加のツールは付きません。

## サーバーごとの絞り込み {#per-server-filtering}

MCP サーバーごとに、どのツールを Hermes に渡すかを決められます。ツール名の空間を細かく整理できます。

### サーバーを丸ごと無効にする {#disable-a-server-entirely}

```yaml
mcp_servers:
  legacy:
    url: "https://mcp.legacy.internal"
    enabled: false
```

`enabled: false` にすると、Hermes はそのサーバーを完全に飛ばし、接続すら試みません。

### 使うツールだけを挙げる {#whitelist-server-tools}

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "***"
    tools:
      include: [create_issue, list_issues]
```

ここに挙げた MCP サーバーのツールだけが登録されます。

### 使わないツールを挙げる {#blacklist-server-tools}

```yaml
mcp_servers:
  stripe:
    url: "https://mcp.stripe.com"
    tools:
      exclude: [delete_customer]
```

挙げたもの以外の、サーバーのツールすべてが登録されます。

### ワイルドカード {#glob-patterns}

どちらの一覧でも、正確な名前と並べて fnmatch 形式のワイルドカードを使えます。Cloudflare の
API MCP（`?codemode=false` で約 3,300 個のツール）のように、平らで巨大な一覧を相手にする
ときには欠かせません。製品分野ごとの除外を 1 つずつ書いていられないからです。

```yaml
mcp_servers:
  cloudflare:
    url: "https://mcp.cloudflare.com/mcp?codemode=false"
    auth: oauth
    tools:
      exclude: ["*_radar_*", "*_accounts_dlp_*", "*_zones_web3_*"]
```

ワイルドカードの記号（`*`、`?`、`[`）を含まない書き方は完全一致になります。`docs` は
`docs` という名前のツールだけを除外し、`docs_search` には影響しません。

### どちらが優先されるか {#precedence-rule}

両方書いた場合は次のようになります。

```yaml
tools:
  include: [create_issue]
  exclude: [create_issue, delete_issue]
```

`include` が優先されます。

### 補助ツールも絞り込む {#filter-utility-tools-too}

Hermes が追加する補助ツールだけを、個別に無効にすることもできます。

```yaml
mcp_servers:
  docs:
    url: "https://mcp.docs.example.com"
    tools:
      prompts: false
      resources: false
```

意味は次のとおりです。
- `tools.resources: false` は `list_resources` と `read_resource` を無効にします
- `tools.prompts: false` は `list_prompts` と `get_prompt` を無効にします

### まとめた例 {#full-example}

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "***"
    tools:
      include: [create_issue, list_issues, search_code]
      prompts: false

  stripe:
    url: "https://mcp.stripe.com"
    headers:
      Authorization: "Bearer ***"
    tools:
      exclude: [delete_customer]
      resources: false

  legacy:
    url: "https://mcp.legacy.internal"
    enabled: false
```

## すべて絞り込んで何も残らなかったら？ {#what-happens-if-everything-is-filtered-out}

呼び出せるツールをすべて除外し、対応している補助ツールもすべて無効にするか書かなかった場合、Hermes はそのサーバーのために空のツールセットを作りません。

ツールの一覧をすっきり保つためです。

## 実行中の動き {#runtime-behavior}

### いつ見つけるか {#discovery-time}

Hermes は起動時に MCP サーバーを見つけ、そのツールを通常のツール登録簿に加えます。

### 実行中のツールの変化を受け取る {#dynamic-tool-discovery}

MCP サーバーは、使えるツールが実行中に変わったことを `notifications/tools/list_changed` という通知で Hermes に伝えられます。この通知を受け取ると、Hermes はそのサーバーのツール一覧を自動で取り直して登録簿を更新します。`/reload-mcp` を手で実行する必要はありません。

できることが状況によって変わる MCP サーバーで役に立ちます。たとえば、新しいデータベースの構造を読み込んだらツールが増えるサーバーや、サービスが落ちたらツールが減るサーバーです。

取り直しの処理はロックで守られているので、同じサーバーから通知が立て続けに来ても処理が重なることはありません。プロンプトやリソースの変更通知（`prompts/list_changed`、`resources/list_changed`）は受け取りますが、まだ動作には反映していません。

### 読み込み直す {#reloading}

MCP の設定を変えたときは次を使います。

```text
/reload-mcp
```

これで MCP サーバーを設定から読み込み直し、使えるツールの一覧を更新します。サーバー側から通知される実行中の変化については、上の[実行中のツールの変化を受け取る](#dynamic-tool-discovery)を参照してください。

### ツールセット {#toolsets}

設定した MCP サーバーは、登録されたツールが 1 つ以上あれば、実行時のツールセットも作ります。

```text
mcp-<server>
```

こうしておくと、MCP サーバーをツールセットの単位でとらえやすくなります。

## 安全のための仕組み {#security-model}

### stdio の環境変数の絞り込み {#stdio-env-filtering}

stdio のサーバーに対して、Hermes はシェルの環境変数をそのまま全部は渡しません。

明示的に設定した `env` と、安全な最小限のものだけを渡します。これで秘密の値がうっかり漏れる可能性を減らせます。

### 設定で見せる範囲を決める {#config-level-exposure-control}

前述の絞り込みは、安全のための仕組みでもあります。
- モデルに見せたくない危険なツールを無効にする
- 慎重に扱いたいサーバーでは、最小限のツールだけを見せる
- リソースやプロンプトの窓口を見せたくないときは、その補助ツールを無効にする

## 使い方の例 {#example-use-cases}

### issue の管理だけに絞った GitHub サーバー {#github-server-with-a-minimal-issue-management-surface}

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "***"
    tools:
      include: [list_issues, create_issue, update_issue]
      prompts: false
      resources: false
```

たとえば次のように使います。

```text
Show me open issues labeled bug, then draft a new issue for the flaky MCP reconnection behavior.
```

### 危険な操作を外した Stripe サーバー {#stripe-server-with-dangerous-actions-removed}

```yaml
mcp_servers:
  stripe:
    url: "https://mcp.stripe.com"
    headers:
      Authorization: "Bearer ***"
    tools:
      exclude: [delete_customer, refund_payment]
```

たとえば次のように使います。

```text
Look up the last 10 failed payments and summarize common failure reasons.
```

### 1 つのプロジェクトだけを見るファイルサーバー {#filesystem-server-for-a-single-project-root}

```yaml
mcp_servers:
  project_fs:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/my-project"]
```

たとえば次のように使います。

```text
Inspect the project root and explain the directory layout.
```

## うまくいかないとき {#troubleshooting}

### MCP サーバーにつながらない {#mcp-server-not-connecting}

次を確認してください。

```bash
# Verify MCP deps are installed (already included in standard install)
cd ~/.hermes/hermes-agent && uv pip install -e ".[mcp]"

node --version
npx --version
```

そのうえで設定を見直し、Hermes を再起動してください。

### ツールが出てこない {#tools-not-appearing}

考えられる原因は次のとおりです。
- サーバーへの接続に失敗した
- ツールの検出に失敗した
- 設定の絞り込みでそのツールが除外されている
- そのサーバーに補助ツールに対応する機能が無い
- `enabled: false` でサーバーを無効にしている

意図して絞り込んでいるのであれば、これは想定どおりの動きです。

### リソースやプロンプトの補助ツールが出てこないのはなぜか {#why-didnt-resource-or-prompt-utilities-appear}

現在の Hermes は、次の 2 つがどちらも満たされたときにだけ、その補助ツールを登録するからです。
1. 設定が許可している
2. サーバーのセッションが実際にその機能に対応している

これは意図した動きで、ツールの一覧を実態どおりに保つためのものです。

## ツールの同時実行 {#parallel-tool-calls}

既定では、MCP のツールは一度に 1 つずつ順番に実行されます。同時に動かしても安全なツール（読み取りだけの問い合わせ、互いに独立した API 呼び出しなど）を公開している MCP サーバーであれば、同時実行を有効にできます。

```yaml
mcp_servers:
  docs:
    command: "docs-server"
    supports_parallel_tool_calls: true
```

`supports_parallel_tool_calls` を `true` にすると、Hermes は 1 回のツール呼び出しのまとまりの中で、そのサーバーの複数のツールを同時に実行することがあります。組み込みの読み取り専用ツール（web_search、read_file など）と同じ扱いです。

:::caution
同時実行を有効にするのは、そのサーバーのツールが同時に動いても安全な場合だけにしてください。ツールが共有の状態、ファイル、データベース、外部の資源を読み書きするなら、有効にする前に読み書きの競合を確認してください。
:::

## MCP のサンプリング対応 {#mcp-sampling-support}

MCP サーバーは `sampling/createMessage` という手順で、Hermes に LLM の推論を頼めます。つまり、MCP サーバーが自分の代わりに文章を生成してほしいと Hermes に依頼できるということです。LLM の力は必要だが自前のモデルは持っていない、というサーバーで役に立ちます。

サンプリングは、どの MCP サーバーでも**既定で有効**です（MCP の SDK が対応している場合）。サーバーごとに `sampling` の下で設定します。

```yaml
mcp_servers:
  my_server:
    command: "my-mcp-server"
    sampling:
      enabled: true            # Enable sampling (default: true)
      model: "openai/gpt-4o"  # Override model for sampling requests (optional)
      max_tokens_cap: 4096     # Max tokens per sampling response (default: 4096)
      timeout: 30              # Timeout in seconds per request (default: 30)
      max_rpm: 10              # Rate limit: max requests per minute (default: 10)
      max_tool_rounds: 5       # Max tool-use rounds in sampling loops (default: 5)
      allowed_models: []       # Allowlist of model names the server may request (empty = any)
      log_level: "info"        # Audit log level: debug, info, or warning (default: info)
```

サンプリングの処理には、直近の一定時間で回数を抑える仕組み、要求ごとの制限時間、ツールの呼び出しが何段まで続くかの上限が入っていて、使いすぎを防ぎます。要求の回数、エラー、使ったトークンといった数値は、サーバーの実行単位ごとに記録されます。

特定のサーバーでサンプリングを止めるには次のようにします。

```yaml
mcp_servers:
  untrusted_server:
    url: "https://mcp.example.com"
    sampling:
      enabled: false
```

## MCP の追加入力への対応 {#mcp-elicitation-support}

MCP サーバーは、ツールの実行中に `elicitation/create` という手順で、決まった形の入力を利用者に求められます（mcp の Python SDK 1.11.0 以降）。Hermes はこのうち**入力欄形式**のものを、いつもの承認の窓口へ流します。CLI や TUI では対話式の確認、Telegram や Slack といったメッセージ連携先では承認ボタンです。そのため、セッションがどこにあってもその要求が届きます。**URL 形式**のもの（外部の URL に誘導するもの）は、対応していないものとして断ります。

追加入力の受け付けは、サーバーごとに**既定で有効**です。`elicitation` の下で設定します。

```yaml
mcp_servers:
  my_server:
    command: "my-mcp-server"
    elicitation:
      enabled: true    # default: true
      timeout: 300     # seconds to wait for your answer (default: 300)
```

既定の 5 分という制限時間は、ゲートウェイの承認の既定に合わせたものです。すぐには返事ができない場所を使っている人も、サーバーがあきらめる前に答えられます。サーバーごとの数値（要求、承諾、拒否、エラーの件数）も記録されます。

## Hermes 自身を MCP サーバーとして動かす {#running-hermes-as-an-mcp-server}

Hermes は MCP サーバーに**つなぐ**だけでなく、自分が MCP サーバーに**なる**こともできます。これにより、MCP に対応した他のエージェント（Claude Code、Cursor、Codex、その他どの MCP クライアントでも）が、Hermes のメッセージ機能を使えます。会話の一覧を見る、履歴を読む、つながっているすべての連携先へメッセージを送る、といったことです。

### どんなときに使うか {#when-to-use-this}

- Claude Code や Cursor などのコーディングエージェントに、Hermes 経由で Telegram / Discord / Slack のメッセージを読み書きさせたい
- Hermes につながっているメッセージ連携先すべてに、1 つの MCP サーバーから橋渡ししたい
- すでに Hermes のゲートウェイを動かしていて、連携先もつながっている

### 使い始める {#quick-start}

```bash
hermes mcp serve
```

これで stdio の MCP サーバーが立ち上がります。プロセスの起動と終了は、利用者ではなく MCP クライアントが管理します。

### MCP クライアント側の設定 {#mcp-client-configuration}

MCP クライアントの設定に Hermes を追加します。たとえば Claude Code の `~/.claude/claude_desktop_config.json` なら次のようになります。

```json
{
  "mcpServers": {
    "hermes": {
      "command": "hermes",
      "args": ["mcp", "serve"]
    }
  }
}
```

Hermes を特定の場所に入れている場合は次のようにします。

```json
{
  "mcpServers": {
    "hermes": {
      "command": "/home/user/.hermes/hermes-agent/venv/bin/hermes",
      "args": ["mcp", "serve"]
    }
  }
}
```

### 使えるツール {#available-tools}

この MCP サーバーは 10 個のツールを公開します。OpenClaw のチャンネル橋渡しと同じ範囲に、Hermes 固有のチャンネル一覧を加えたものです。

| ツール | 説明 |
|------|------|
| `conversations_list` | 動いているメッセージの会話を一覧します。連携先で絞り込んだり、名前で検索したりできます。 |
| `conversation_get` | セッションキーを指定して、1 つの会話の詳しい情報を取ります。 |
| `messages_read` | ある会話の最近のメッセージ履歴を読みます。 |
| `attachments_fetch` | 指定したメッセージから、文章以外の添付（画像やメディア）を取り出します。 |
| `events_poll` | ある地点以降に起きた会話のイベントを取りに行きます。 |
| `events_wait` | 次のイベントが来るまで待ち続けます（ほぼその場で受け取れます）。 |
| `messages_send` | 連携先を指定してメッセージを送ります（例: `telegram:123456`、`discord:#general`）。 |
| `channels_list` | すべての連携先にわたって、送り先の候補を一覧します。 |
| `permissions_list_open` | この橋渡しのセッション中に観測した、未処理の承認要求を一覧します。 |
| `permissions_respond` | 未処理の承認要求を許可または拒否します。 |

### イベントの仕組み {#event-system}

この MCP サーバーには、Hermes のセッションのデータベースを見張って新しいメッセージを拾う仕組みが入っています。MCP クライアントは、届いた会話をほぼその場で知ることができます。

```
# Poll for new events (non-blocking)
events_poll(after_cursor=0)

# Wait for next event (blocks up to timeout)
events_wait(after_cursor=42, timeout_ms=30000)
```

イベントの種類は `message`、`approval_requested`、`approval_resolved` です。

イベントの待ち行列はメモリ上にあり、橋渡しがつながった時点から貯まり始めます。それより前のメッセージは `messages_read` で読めます。

### 起動時の指定 {#options}

```bash
hermes mcp serve              # Normal mode
hermes mcp serve --verbose    # Debug logging on stderr
```

### 仕組み {#how-it-works}

この MCP サーバーは、会話のデータを Hermes のセッションの保管場所から直接読みます。主となるのは `~/.hermes/state.db` で、`sessions.json` は古い形式への備えとしてだけ残っています。裏で動くスレッドがデータベースを見張って新しいメッセージを拾い、メモリ上のイベントの待ち行列を保ちます。メッセージの送信には、定期実行の配信や `hermes send` コマンドと同じ内部の送信処理（`tools/send_message_tool.py`）を使います。

読み取りの操作（会話の一覧、履歴の閲覧、イベントの取得）にゲートウェイは要りません。送信の操作には必要です。連携先とのつながりが生きている必要があるためです。

### いまの制限 {#current-limits}

- 組み込みの `hermes mcp serve` が公開するのは、今のところ **stdio だけ**の MCP サーバーです。HTTP の MCP サーバーが必要なら別に用意してください。もっとも、多くの場合は Hermes の MCP **クライアント**側で足ります。こちらは stdio と HTTP のどちらにも対応しています（`mcp_servers.yaml` や `config.yaml` の `url` と `headers`。上の [HTTP のサーバー](#http-servers)を参照）。
- イベントの取得はおよそ 200 ミリ秒ごとで、ファイルの更新時刻を見て変化が無ければ処理を飛ばします
- `claude/channel` の通知の仕組みにはまだ対応していません
- `messages_send` で送れるのは文章だけです（メディアや添付は送れません）

## 関連ページ {#related-docs}

- [Hermes で MCP を使う](/hermes/docs/guides/use-mcp-with-hermes/)
- [CLI コマンド一覧](/hermes/docs/reference/cli-commands/)
- [スラッシュコマンド一覧](/hermes/docs/reference/slash-commands/)
- [よくある質問](/hermes/docs/reference/faq/)
