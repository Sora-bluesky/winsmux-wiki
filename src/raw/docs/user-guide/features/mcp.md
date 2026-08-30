---
title: "MCP（Model Context Protocol）"
description: "MCP を通して Hermes Agent を外部のツールサーバーにつなぎ、どの MCP ツールを読み込むかを細かく決めます"
upstream_path: user-guide/features/mcp.md
upstream_blob: 3d2e82a85f328b7ec8b99db1db33d5ea1734be3c
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp
---

# MCP（Model Context Protocol） {#mcp-model-context-protocol}

MCP を使うと、Hermes Agent は外部のツールサーバーにつながり、Hermes の外にあるツールを使えるようになります。GitHub、データベース、ファイルシステム、ブラウザの仕組み、社内の API など、いろいろなものが対象です。

すでにどこかにあるツールを Hermes に使わせたい、と思ったことがあるなら、たいていは MCP が一番きれいな方法です。

:::tip Claude Code から来た方へ
`~/.claude.json` の `mcpServers` の部分は、Hermes の `config.yaml` では `mcp_servers` にあたります。`hermes import-agent claude-code` を実行すれば、スキルや指示ごと自動で移せます。[他のエージェントからの取り込み](/hermes/docs/user-guide/import-from-other-agents/) を参照してください。
:::

## MCP で得られるもの {#what-mcp-gives-you}

- Hermes 独自のツールを先に書かなくても、外部のツール群を使えます
- ローカルの stdio サーバーと、リモートの HTTP MCP サーバーを同じ設定にまとめられます
- 起動時にツールを自動で見つけて登録します
- サーバーが対応していれば、MCP のリソースとプロンプトを包む補助ツールも用意します
- サーバーごとの絞り込みができるので、本当に Hermes に見せたい MCP のツールだけを出せます

## 手早く始める {#quick-start}

1. MCP の対応は標準のインストールに含まれています。追加の手順は要りません。

2. `~/.hermes/config.yaml` に MCP サーバーを足します。

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

4. MCP に支えられた機能を Hermes に頼みます。

たとえば次のように頼みます。

```text
List the files in /home/user/projects and summarize the repo structure.
```

Hermes は MCP サーバーのツールを見つけ、他のツールと同じように使います。

## カタログ: Nous が確認した MCP をワンクリックで入れる {#catalog-one-click-install-for-nous-approved-mcps}

Hermes には、Nous のスタッフが確認して取り込んだ MCP サーバーのカタログが
付いています。既定ではどれも無効なので、本当に使いたいものだけを入れてください。

```bash
hermes mcp                # interactive picker (default)
hermes mcp catalog        # plain-text list, scriptable
hermes mcp install n8n    # install a catalog entry by name
```

選択画面では、それぞれの項目がいまの状態とともに並びます。

```
n8n          available              Manage and inspect n8n workflows from Hermes
linear       enabled                Linear issue/project management (remote OAuth)
github       installed (disabled)   GitHub repo + PR tools
```

行の上で `Enter` を押すと、インストール（必要な認証情報の入力も含めて進みます）、
有効化、無効化、削除ができます。カタログの項目は hermes-agent のリポジトリの
`optional-mcps/` の下にあり、そのディレクトリに入っていること自体が Nous の
承認を意味します。コミュニティからの投稿枠はなく、項目は PR を取り込む形で追加されます。

カタログの項目が求めるものは、次のいずれかです。

- **API キー** — Hermes がインストール時に尋ね、その値を `~/.hermes/.env` に
  書きます。秘密でない値（ベースの URL など）も同じファイルに入ります。
- **OAuth**（リモートの MCP） — 設定には `auth: oauth` として書かれ、MCP の
  クライアントが最初の接続でブラウザを開きます。
- **OAuth**（Google や GitHub などの第三者のサービス） — まだ認証していなければ、
  Hermes が `hermes auth <provider>` を案内します。

### インストール時のツールの選択 {#tool-selection-at-install-time}

認証情報の設定が済むと、Hermes は MCP サーバーに問い合わせて、そこにあるツールを
すべて並べたチェック欄を出します。

```
Select tools for 'linear' (SPACE toggle, ENTER confirm)
  [x] find_issues       Find issues matching a query
  [x] get_issue         Get a single issue
  [x] create_issue      Create a new issue
  [ ] delete_workspace  Delete a Linear workspace
  ...
```

あらかじめチェックが入っている行は、次の順で決まります。

1. **前回のあなたの選択**。この項目を以前に入れたことがある場合です（入れ直しても
   前の選択が残り、マニフェストの既定に上書きされません）
2. **マニフェストの `tools.default_enabled`**。項目がそれを宣言している場合です
   （カタログの項目によっては、状態を変えるツールやめったに使わないツールを
   あらかじめ外してあります）
3. どちらにも当てはまらなければ **すべて**

自動生成でツールが非常に多い項目（たとえば `cloudflare` は OpenAPI の
エンドポイントのツールがおよそ 3,300 個あります）は、代わりに `tools.default_excluded`
を宣言します。名前とグロブの型を選んで並べた拒否の一覧です。こうした項目を
インストールするときはチェック欄が出ず、`tools.exclude` が書かれます。当てはまらな
かったものはすべて有効なままで、サーバーがあとから足したツールも含まれます。
まとめて有効に戻したいときは、config.yaml の
`mcp_servers.<name>.tools.exclude` を編集してください。

チェック欄は ENTER で確定します。チェックしたツールだけが
`mcp_servers.<name>.tools.include` に入ります。すべてを選んだ場合は絞り込みが
書かれません（設定が一番すっきりし、動きは同じです）。

**問い合わせに失敗した場合**（サーバーに届かない、OAuth がまだ済んでいない、
裏側のサービスが動いていない）も、インストール自体は成功します。マニフェストの
`tools.default_enabled` がそのまま適用されるか（宣言されていれば）、絞り込みが
書かれません（宣言が無ければ）。サーバーに届くようになったら
`hermes mcp configure <name>` をもう一度実行して調整してください。

### 信頼の考え方 {#trust-model}

カタログの項目を入れると、マニフェストに書かれたものがそのまま実行されます。`git clone`、
その項目の `bootstrap` のコマンド（`pip install`、`npm install` など）、そして最終的には
MCP サーバー自身のコードです。マニフェストは hermes-agent リポジトリへの PR レビューを
通っているので、公開前に Nous が各項目を確認しています。とはいえ
**入れる前に自分でもマニフェストを読むべきです**。とくに
`source:` の項目にあるリポジトリ、`install.bootstrap:` のコマンド、そして
`transport.command:` の呼び出しです。

マニフェストは GitHub の
[`optional-mcps/<name>/manifest.yaml`](https://github.com/NousResearch/hermes-agent/tree/main/optional-mcps)
にあります。選択画面もインストール時にマニフェストの `source:` の URL を表示するので、
上流のリポジトリをすぐ確かめられます。Web のダッシュボードの MCP のページでも、
カタログの項目ごとに同じ内容が見られます。通信の方式、認証の種類、エンドポイントの
URL（HTTP の場合）またはコマンドと引数（stdio の場合）、git のインストール元と参照先、
bootstrap のコマンド、設定の注意点までが並び、`source:` はクリックできるリンクとして
表示されるので、Install を押す前に、その項目が何につなぎ何を実行するのかを正確に
確かめられます。

### マニフェストの版の互換性 {#manifest-version-compatibility}

マニフェストは `manifest_version` を固定しています。カタログは新しい版にも耐える
作りです。あなたの入れている Hermes が理解するより新しい `manifest_version` の項目が
PR で追加された場合、選択画面はその項目を黙って隠すのではなく、警告
（`⚠ '<name>' requires a newer Hermes`）を出します。これが見えたら `hermes update` で
最新の Hermes を入れてください。

### 実行時の `${ENV_VAR}` の置き換え {#runtime-envvar-substitution}

項目の `transport.command`、`transport.args`、`transport.url`、`headers` の中では、
`${VAR}` の書き方がサーバーへの接続時に環境変数から解決されます（`~/.hermes/.env` の
中身もすべて含みます）。これは、カタログの項目が、利用者が別のところで設定した値を
参照したいときに便利です。たとえば `${HOME}/foo` や `${MY_PROVIDER_TOKEN}` です。

Cursor 風の文脈の変数も置き換えられます（大文字と小文字を区別します）。
`${userHome}`（ホームディレクトリ）、`${workspaceFolder}`（セッションの作業場所の
起点）、`${workspaceFolderBasename}`、そして `${pathSeparator}` / `${/}`
（OS のパスの区切り文字）です。詳しくは
[MCP 設定の詳しい説明](/hermes/docs/reference/mcp-config-reference/) を参照してください。

これは、カタログのマニフェストで使う `${INSTALL_DIR}` とは別ものです。あちらは
インストール時に、カタログがその項目のリポジトリを複製した場所に置き換えられます。

### あとからツールの選択を変える {#updating-tool-selection-later}

```bash
hermes mcp configure linear
```

いまの選択にチェックが入った状態で、同じチェック欄がもう一度開きます。もっと多くの
ツールを有効にしたいときや、サーバーが新しいツールを足したので使いたいときに使います。

### カタログのマニフェストを更新する {#updating-the-catalog-manifest}

MCP が自動で更新されることはありません。Hermes を更新したあと、マニフェストの版が
変わっていたら、`hermes mcp install <name>` をもう一度実行して入れ直してください。

カタログに MCP を追加するには、
[`optional-mcps/`](https://github.com/NousResearch/hermes-agent/tree/main/optional-mcps) に PR を出してください。

### 提案の情報（`suggest:`） {#suggestion-metadata-suggest}

マニフェストには、`keywords:` や `hosts:` の並びを持つ任意の `suggest:` の部分を
書けます。画面の側（いまのところデスクトップアプリの入力欄）はこれを使って、
書きかけの文にその語が単語として現れたときや、貼り付けたリンクのホスト名が挙げられた
接尾辞で終わるときに、ワンクリックの「Add &lt;server&gt;」のボタンを出します。
これはあくまで助言で、インストールは同じ検証済みのカタログや設定の経路を通ります。
ホスト型のリモートの項目のほとんど（Atlassian、Sentry、Notion、Stripe、Vercel、
Supabase など）がこれを宣言しています。

GitHub はあえてカタログに入れて **いません**。ホスト型の MCP はクライアントごとに
自前の OAuth アプリを求め（一般的な動的クライアント登録は拒否されます）、しかも
Hermes に同梱されている `github/*` のスキルが `gh` CLI を動かすほうが、より多くのことを
できるからです。デスクトップでは、GitHub に言及すると、まだ `gh` にサインインして
いない場合に `github-auth` のスキルを勧めます。

## MCP サーバーの二つの形 {#two-kinds-of-mcp-servers}

### stdio サーバー {#stdio-servers}

stdio のサーバーは、手元の子プロセスとして動き、標準入出力でやり取りします。

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "***"
```

stdio のサーバーが向いているのは、次のときです。
- サーバーが手元にインストールされている
- 手元の資源に待ち時間少なく触りたい
- 参照している MCP サーバーの説明が `command`、`args`、`env` を示している

### HTTP サーバー {#http-servers}

HTTP の MCP サーバーは、Hermes が直接つなぎに行くリモートのエンドポイントです。

```yaml
mcp_servers:
  remote_api:
    url: "https://mcp.example.com/mcp"
    headers:
      Authorization: "Bearer ***"
```

HTTP のサーバーが向いているのは、次のときです。
- MCP サーバーが別の場所で動いている
- 組織が社内向けの MCP のエンドポイントを出している
- その連携のために Hermes に子プロセスを起動させたくない

### OAuth で認証する HTTP サーバー {#oauth-authenticated-http-servers}

ホスト型の MCP サーバーの多く（Cloudflare、Linear、Sentry、Atlassian、Asana、Figma、Stripe など）は、固定のトークンではなく OAuth 2.1 を求めます。`auth: oauth` を設定すれば、あとは Hermes が MCP の Python SDK を通して、情報の取得、クライアントの識別、PKCE、トークンの交換、更新、追加認証までを扱います。

Hermes は、対応しているサーバーには [Client ID Metadata Document](/hermes/docs/reference/mcp-config-reference/#client-identification-cimd-and-dcr) で自分を名乗り、対応していないサーバーでは動的クライアント登録に切り替えます。どちらも自動なので、設定することはありません。

:::tip Figma のリモート MCP
Figma のホスト型のエンドポイント（`https://mcp.figma.com/mcp`）は、動的クライアント登録を **`client_name` の完全一致** で許可します。素の `"Hermes Agent"` は 403 になり、`"Claude Code"` と `"Codex"` は通ります。Hermes は `mcp.figma.com` に対して `oauth.client_name: "Claude Code"` を自動で設定するので、特別な小細工なしにインストールとログインができます。

```yaml
mcp_servers:
  figma:
    url: "https://mcp.figma.com/mcp"
    auth: oauth
```

あるいは `hermes mcp install figma` のあと `hermes mcp login figma` です。
:::

```yaml
mcp_servers:
  linear:
    url: "https://mcp.linear.app/mcp"
    auth: oauth
```

最初につなぐとき、Hermes は認可の URL を表示し、可能ならブラウザを開き、手元のループバックのポートで OAuth の戻りを待ちます。トークンは `~/.hermes/mcp-tokens/<server>.json` に 0o600 の権限で保存され、次からは更新に失敗するまで黙って使い回されます。

**リモートや画面の無いホストの場合。** Hermes がブラウザとは別の機械で動いていると、ループバックの戻りはあなたのノートパソコンに届きません。手順を終える方法は次のとおりです。

- **Hermes Desktop（自動）:** Desktop アプリの MCP 設定画面から、リモートのバックエンドに対して OAuth のサインインを実行すると、Desktop が*あなたの*機械で戻りを待ち受け、認可の結果をゲートウェイまで自動で中継します。トンネルも貼り付けも代理も要りません。Desktop アプリとバックエンドの両方が最新である必要があります。
- **貼り戻し（準備不要）:** 対話できる端末なら、Hermes は認可の URL と一緒に「Or paste the redirect URL here…」と表示します。その URL をブラウザで開いて承認し、たどり着いた URL をまるごとコピーして（戻り先は接続エラーになりますが、それで正常です）、プロンプトに貼り付けてください。`?code=…&state=…` のクエリ文字列だけでも通ります。
- **SSH のポート転送:** 別の端末で `ssh -N -L <port>:127.0.0.1:<port> user@host` を実行し、あとは戻りをそのまま流します。
- **中継した戻り先（`redirect_uri`）:** 公開の HTTPS のエンドポイントがホストへ転送している場合（たとえば戻り先のポートに向けた Tailscale Funnel やリバースプロキシ）、`oauth.redirect_uri` を設定すれば、ブラウザの戻りがそのまま Hermes に届きます。トンネルも貼り付けも要りません。

```yaml
mcp_servers:
  myserver:
    url: "https://mcp.example.com/mcp"
    auth: oauth
    oauth:
      redirect_port: 8765                                # fixed port for the proxy to target
      redirect_uri: "https://oauth.example.ts.net/callback"
```

完全に画面の無いゲートウェイ（メッセージのボットで、対話できる端末がまったく無い場合）では、任意で入れられる [`mcp-oauth-remote-gateway` スキル](/hermes/docs/user-guide/skills/optional/mcp/mcp-mcp-oauth-remote-gateway/) が、手順を自分でこなしてトークンを Hermes の期待する場所に書くところまで、エージェントを導いてくれます。

**落とし穴 — WAF が `127.0.0.1` の戻り先を拒否する。** 認可サーバーの前に WAF を置いていて、クエリ文字列に `127.0.0.1` がそのまま含まれる認可の要求を 403 にしてしまう提供元がいくつかあります（Reclaim.ai の AWS API Gateway が知られた例で、OAuth アプリに届く前にすべて `{"message":"Forbidden"}` が返ります）。`oauth.redirect_host: localhost` を設定して `http://localhost:<port>/callback` を使ってください。どちらにしても、戻りを待ち受ける側は `127.0.0.1` に結びついたままです。

DCR に対応しないサーバー（Slack など）、あらかじめ登録した `client_id` と `client_secret`、権限の範囲の調整、`hermes mcp login <server>` での再認証まで含めた通しの手順は、[SSH 越し / リモートホストでの OAuth](/hermes/docs/guides/oauth-over-ssh/#mcp-servers) を参照してください。

**落とし穴 — 自動登録に対応しない提供元（Google Drive、Atlassian）。** 素の `auth: oauth` が頼っている動的クライアント登録の手順（RFC 7591）を拒否するサーバーがあります。Google 公式の Drive のサーバー（`https://drivemcp.googleapis.com/mcp/v1`）は `400 Bad Request` を返すので、OAuth のクライアントは作られず、トークンも手に入りません。症状は分かりにくく、こうしたサーバーは認証なしでも `tools/list` に応えるため、`hermes mcp login` がツールを並べてうまくいったように見えてしまいます。しかし、あとで実際にツールを呼ぶと必ず時間切れになります。いまの `hermes mcp login` はこれを検出し（トークンが本当にディスクに落ちたかを確かめます）、自分の OAuth クライアントを用意するよう伝えます。提供元の管理画面で作って、設定に足してください。

```yaml
mcp_servers:
  googledrive:
    url: "https://drivemcp.googleapis.com/mcp/v1"
    auth: oauth
    oauth:
      client_id: "<your-oauth-client-id>"
      client_secret: "<your-oauth-client-secret>"
```

そのうえで `hermes mcp login googledrive` を実行します。あらかじめ登録したクライアントがあるので、Hermes は登録の手順を飛ばし、通常のブラウザでの認可を進めます。

**落とし穴 — 設定の自動再読み込みとの競合。** Hermes のセッションを動かしたまま `~/.hermes/config.yaml` を編集すると、CLI は 30 秒の制限時間で MCP の接続を読み直します。対話式の OAuth の手順には、これでは足りません。項目を足したら、別の端末から `hermes mcp login <server>` を実行してください。こちらは認証を終えるのを 5 分まで待ちます。

## mTLS とクライアント証明書 {#mtls-client-certificates}

相互 TLS（クライアント証明書による認証）を求めるリモートの HTTP MCP サーバーには、`client_cert` と `client_key` で対応します。Hermes は解決した証明書を、TLS の握手のために下位の HTTP クライアントへ渡します。

`client_cert` は三つの形を受け付けます。

- **一つにまとめた PEM のパス** — 証明書と秘密鍵の両方を持つ一つのファイルです。

```yaml
mcp_servers:
  internal_api:
    url: "https://mcp.internal.example.com/mcp"
    client_cert: "~/.certs/mcp-client.pem"
```

- **`[cert, key]` の 2 要素** — 証明書と鍵が別のファイルにある場合です（`client_cert` と `client_key` を設定するのと同じです）。

```yaml
mcp_servers:
  internal_api:
    url: "https://mcp.internal.example.com/mcp"
    client_cert: ["~/.certs/mcp-client.crt", "~/.certs/mcp-client.key"]
```

- **`[cert, key, password]` の 3 要素** — 秘密鍵が暗号化されている場合で、三つめが鍵の合言葉です。

```yaml
mcp_servers:
  internal_api:
    url: "https://mcp.internal.example.com/mcp"
    client_cert: ["~/.certs/mcp-client.crt", "~/.certs/mcp-client.key", "${MCP_KEY_PASSWORD}"]
```

`client_cert`（まとめた PEM）と、明示的な `client_key` を使って、証明書と鍵を完全に分けたままにもできます。パスは `~` の展開に対応しています。ファイルが無い場合は、意味の分からない TLS の握手の失敗ではなく、どのサーバーの話かが分かるはっきりしたエラーになります。

## 利用者ごとの識別ヘッダー {#per-user-identity-header}

呼び出し元の識別によって振る舞いを変えるリモートの HTTP / SSE の MCP サーバー（利用者ごとの回数制限、監査の記録、複数の顧客の振り分けなど）には、`identity_header` を使って毎回の要求に識別のヘッダーを付けられます。

```yaml
mcp_servers:
  team_api:
    url: "https://mcp.team.example.com/mcp"
    identity_header:
      name: "X-User-Id"
      value_from: "static"   # "static" (default) or "profile"
      value: "alice"         # required for static
```

- `value_from: static` は、config.yaml に書いた `value` をそのまま送ります。
- `value_from: profile` は、いま動いている Hermes のプロファイル名を、接続時に一度だけ解決して送ります。一つの機械にある複数のプロファイルが同じサーバーと話していて、サーバー側で見分けたいときに便利です。

サーバーの `headers` に同じ名前（大文字と小文字は問いません）の項目が明示されていれば、常にそちらが勝ちます。識別のヘッダーが、あなたのヘッダーの設定を上書きすることはありません。`identity_header` の書き方が正しくない場合は、警告のうえ無視されます。それでサーバーへの接続が止まることはありません。stdio のサーバーでは、この項目は警告とともに無視されます（stdio にはヘッダーがありません）。

## 設定の基本項目 {#basic-configuration-reference}

Hermes は `~/.hermes/config.yaml` の `mcp_servers` の下から MCP の設定を読みます。

### よく使う項目 {#common-keys}

| 項目 | 型 | 意味 |
|---|---|---|
| `command` | 文字列 | stdio の MCP サーバーの実行ファイル |
| `args` | 配列 | stdio のサーバーに渡す引数 |
| `env` | 対応表 | stdio のサーバーに渡す環境変数 |
| `url` | 文字列 | HTTP の MCP のエンドポイント |
| `headers` | 対応表 | リモートのサーバーに送る HTTP のヘッダー |
| `client_cert` | 文字列 \| 配列 | mTLS 用のクライアント証明書。まとめた PEM のパス、または `[cert, key]` / `[cert, key, password]` |
| `client_key` | 文字列 | クライアントの秘密鍵の PEM のパス（`client_cert` と分ける場合） |
| `identity_header` | 対応表 | HTTP / SSE のサーバー向けの、任意の利用者ごとの識別ヘッダー。`{name, value_from: static\|profile, value}` |
| `timeout` | 数値 | ツール呼び出しの制限時間 |
| `connect_timeout` | 数値 | 最初の接続の制限時間（MCP の `initialize` の握手にも効きます） |
| `idle_timeout_seconds` | 数値 | ツールの呼び出しがこの秒数だけ無かったら、stdio のサーバーを作り直します（`0` は作り直さない。これが既定）。次にツールが呼ばれたとき、裏で自動的に立ち上がり直します。 |
| `max_lifetime_seconds` | 数値 | 通算でこの年齢を超えたら、stdio のサーバーを作り直します（`0` は作り直さない。これが既定）。次に使うとき、裏で立ち上がり直します。 |
| `enabled` | 真偽値 | `false` なら、Hermes はそのサーバーをまるごと飛ばします |
| `supports_parallel_tool_calls` | 真偽値 | `true` なら、このサーバーのツールを同時に走らせてよいことになります |
| `tools` | 対応表 | サーバーごとのツールの絞り込みと、補助ツールの扱い |

### stdio の最小の例 {#minimal-stdio-example}

```yaml
mcp_servers:
  filesystem:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
```

### メモリを多く使う stdio のサーバーを作り直す {#recycling-memory-heavy-stdio-servers}

ブラウザを使う MCP サーバー（たとえば `@playwright/mcp`）は、最初にツールを
呼んだあと Chromium をまるごと常駐させます。数百 MB が解放されないままです。
自動での作り直しを有効にすると、放置の時間や寿命の上限を過ぎたところでサーバーは
畳まれ、次にそのツールが呼ばれたときに裏で立ち上がり直します（その間もツールは
登録されたままです）。

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

## 内蔵の定型設定 {#built-in-presets}

よく知られた MCP サーバーについては、`hermes mcp add` に `--preset` を渡すと、通信の詳細が埋まるので、コマンドや引数を調べる必要がありません。定型設定が与えるのは既定値だけなので、同じコマンドラインで渡した他のもの（環境変数、ヘッダー、絞り込み）はそのまま優先されます。

| 定型設定 | つなぐもの |
|---|---|
| `codex` | Codex CLI の MCP サーバー（stdio 越しの `codex mcp-server`）。PATH に `codex` CLI が必要です。 |

```bash
# Add Codex CLI as an MCP server in one line
hermes mcp add codex --preset codex
```

これは、次と同じ内容を書き込みます。

```yaml
mcp_servers:
  codex:
    command: "codex"
    args: ["mcp-server"]
```

手元での名前は自由に付けられます（`hermes mcp add my-codex --preset codex` でも構いません）。定型設定が与えるのは `command` と `args` の既定値だけです。

## Hermes は MCP のツールをどう登録するか {#how-hermes-registers-mcp-tools}

Hermes は、内蔵のツール名とぶつからないように、MCP のツールに接頭辞を付けます。

```text
mcp_<server_name>_<tool_name>
```

例:

| サーバー | MCP のツール | 登録される名前 |
|---|---|---|
| `filesystem` | `read_file` | `mcp_filesystem_read_file` |
| `github` | `create-issue` | `mcp_github_create_issue` |
| `my-api` | `query.data` | `mcp_my_api_query_data` |

実際のところ、接頭辞の付いた名前を自分で呼ぶ必要はほとんどありません。Hermes はそのツールを認識し、普通に考えながら選びます。

### ツールの結果の掃除と `_meta` {#tool-result-sanitization-and-meta}

モデルが目にする前に、すべての MCP のツールの結果に対して二つのことが行われます。

- **見えない Unicode の TAG 文字が取り除かれます。** U+E0000〜U+E007F の範囲の文字は、端末やチャットの画面では何も表示されないのに、モデルには完全に見えています。悪意のある、あるいは乗っ取られたサーバーが、プロンプトインジェクションを忍び込ませる古典的な経路です。Hermes はこれを、ツールの結果、リソースの内容、ツールの説明から取り除きます。正当な絵文字のタグの並び（🏴󠁧󠁢󠁳󠁣󠁴󠁿 のような地域の旗）はそのまま残ります。
- **提供元の `_meta` は渡し、プロトコルが予約している鍵は渡しません。** サーバーがツールの結果に `_meta` の対応表を付けている場合（`com.example/handoff` のような提供元の名前空間）、Hermes はそれを結果の内容とともにモデルへ渡します。プロトコルが予約している接頭辞の下にある鍵、つまり `modelcontextprotocol` か `mcp` というラベルにさらにラベルが続くもの、たとえば `modelcontextprotocol.io/...` や `tools.mcp.com/...` は、MCP の仕様の鍵の名前の規則に従って落とされます。モデルに見せるものが何も残らなければ、`_meta` の項目自体が省かれます。

## MCP の補助ツール {#mcp-utility-tools}

サーバーが対応していれば、Hermes は MCP のリソースとプロンプトを扱う補助ツールも登録します。

- `list_resources`
- `read_resource`
- `list_prompts`
- `get_prompt`

これらはサーバーごとに、同じ接頭辞の形で登録されます。たとえば次のようになります。

- `mcp_github_list_resources`
- `mcp_github_get_prompt`

### 大切な点 {#important}

これらの補助ツールは、いまはサーバーの能力を見て登録されます。
- MCP のセッションが実際にリソースの操作に対応しているときだけ、リソース向けの補助ツールを登録します
- MCP のセッションが実際にプロンプトの操作に対応しているときだけ、プロンプト向けの補助ツールを登録します

そのため、呼べるツールはあってもリソースやプロンプトを持たないサーバーには、これらの包みは付きません。

## サーバーごとの絞り込み {#per-server-filtering}

それぞれの MCP サーバーが Hermes にどのツールを提供するかを決められるので、ツールの名前の空間を細かく管理できます。

### サーバーをまるごと無効にする {#disable-a-server-entirely}

```yaml
mcp_servers:
  legacy:
    url: "https://mcp.legacy.internal"
    enabled: false
```

`enabled: false` なら、Hermes はそのサーバーを完全に飛ばし、接続すら試みません。

### サーバーのツールを許可する形で選ぶ {#whitelist-server-tools}

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

その MCP サーバーのツールのうち、挙げたものだけが登録されます。

`include` と `exclude` の項目には、グロブの型（`*`、`?`、`[...]`。大文字と小文字は
区別します）も書けます。`include: ["*_dns_*"]` と書けば、名前に `_dns_` を含む
ツールがすべて登録されます。特殊な文字を含まない項目は、これまでどおり完全一致です。
自動生成のエンドポイントのツールを何千個も出すサーバーを、製品の系統ごとに絞り込むには、
グロブが現実的な手立てです。

### サーバーのツールを拒否する形で選ぶ {#blacklist-server-tools}

```yaml
mcp_servers:
  stripe:
    url: "https://mcp.stripe.com"
    tools:
      exclude: [delete_customer]
```

除いたもの以外、そのサーバーのツールはすべて登録されます。

### グロブの型 {#glob-patterns}

どちらの並びも、正確な名前に加えて fnmatch 風のグロブを受け付けます。Cloudflare の
API の MCP（`?codemode=false` でおよそ 3,300 個のツール）のように、平たく巨大な
ものでは、製品の領域をエンドポイント一つずつ除いていくのは現実的ではないので、
これが欠かせません。

```yaml
mcp_servers:
  cloudflare:
    url: "https://mcp.cloudflare.com/mcp?codemode=false"
    auth: oauth
    tools:
      exclude: ["*_radar_*", "*_accounts_dlp_*", "*_zones_web3_*"]
```

グロブの特殊な文字（`*`、`?`、`[`）を含まない項目は完全一致です。`docs` は
`docs` という名前のツールだけを除き、`docs_search` は決して除きません。

### 優先の規則 {#precedence-rule}

両方が書かれている場合は、次のようになります。

```yaml
tools:
  include: [create_issue]
  exclude: [create_issue, delete_issue]
```

`include` が勝ちます。

### 補助ツールも絞り込む {#filter-utility-tools-too}

Hermes が足す補助的な包みだけを、別に無効にすることもできます。

```yaml
mcp_servers:
  docs:
    url: "https://mcp.docs.example.com"
    tools:
      prompts: false
      resources: false
```

つまり、次のようになります。
- `tools.resources: false` は `list_resources` と `read_resource` を無効にします
- `tools.prompts: false` は `list_prompts` と `get_prompt` を無効にします

### すべてを盛り込んだ例 {#full-example}

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

## すべて絞り込まれてしまったらどうなるか {#what-happens-if-everything-is-filtered-out}

設定で呼べるツールがすべて除かれ、対応している補助ツールもすべて無効か省かれている場合、Hermes はそのサーバーのために空のツール群を作りません。

そのおかげで、ツールの一覧がすっきり保たれます。

## 実行時の動き {#runtime-behavior}

### いつ見つけるか {#discovery-time}

Hermes は起動時に MCP のサーバーを見つけ、そのツールを通常のツールの登録簿に加えます。

### ツールの動的な発見 {#dynamic-tool-discovery}

MCP のサーバーは、動作中に使えるツールが変わったとき、`notifications/tools/list_changed` の通知を送って Hermes に知らせられます。この通知を受け取ると、Hermes は自動でそのサーバーのツールの一覧を取り直し、登録簿を更新します。手作業の `/reload-mcp` は要りません。

これは、能力が動的に変わる MCP サーバーに便利です（たとえば、新しいデータベースの構造が読み込まれるとツールが増えるサーバーや、サービスが落ちるとツールが減るサーバーです）。

取り直しはロックで守られているので、同じサーバーから通知が立て続けに来ても、取り直しが重なることはありません。プロンプトとリソースの変更の通知（`prompts/list_changed`、`resources/list_changed`）は受け取りますが、まだ対応する動きはしていません。

### 読み直す {#reloading}

MCP の設定を変えたら、次を使ってください。

```text
/reload-mcp
```

これで設定から MCP のサーバーを読み直し、使えるツールの一覧が更新されます。サーバー自身が動作中にツールの変更を送ってくる場合については、上の [ツールの動的な発見](#dynamic-tool-discovery) を参照してください。

### ツール群 {#toolsets}

設定した MCP サーバーは、登録されたツールを一つ以上提供していれば、実行時のツール群も作ります。

```text
mcp-<server>
```

これで、MCP のサーバーをツール群の単位で考えやすくなります。

## セキュリティの考え方 {#security-model}

### stdio の環境変数の絞り込み {#stdio-env-filtering}

stdio のサーバーに対して、Hermes はあなたのシェルの環境をそのまま丸ごと渡したりはしません。

明示的に設定した `env` と、安全な最小限のものだけが渡されます。これで、秘密がうっかり漏れることを減らせます。

### 設定による見せ方の管理 {#config-level-exposure-control}

新しい絞り込みの仕組みは、セキュリティの手立てでもあります。
- モデルに見せたくない危ないツールを無効にする
- 機微なサーバーについては、最小限の許可の一覧だけを出す
- その面を見せたくないときは、リソースとプロンプトの包みを無効にする

## 使い方の例 {#example-use-cases}

### issue の管理だけに絞った GitHub のサーバー {#github-server-with-a-minimal-issue-management-surface}

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

こんなふうに使います。

```text
Show me open issues labeled bug, then draft a new issue for the flaky MCP reconnection behavior.
```

### 危ない操作を外した Stripe のサーバー {#stripe-server-with-dangerous-actions-removed}

```yaml
mcp_servers:
  stripe:
    url: "https://mcp.stripe.com"
    headers:
      Authorization: "Bearer ***"
    tools:
      exclude: [delete_customer, refund_payment]
```

こんなふうに使います。

```text
Look up the last 10 failed payments and summarize common failure reasons.
```

### プロジェクト一つに絞ったファイルシステムのサーバー {#filesystem-server-for-a-single-project-root}

```yaml
mcp_servers:
  project_fs:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/my-project"]
```

こんなふうに使います。

```text
Inspect the project root and explain the directory layout.
```

## 困ったときは {#troubleshooting}

### MCP のサーバーにつながらない {#mcp-server-not-connecting}

確かめること:

```bash
# Verify MCP deps are installed (already included in standard install)
cd ~/.hermes/hermes-agent && uv pip install -e ".[mcp]"

node --version
npx --version
```

そのうえで設定を見直し、Hermes を再起動してください。

### ツールが現れない {#tools-not-appearing}

考えられる原因は次のとおりです。
- サーバーへの接続に失敗した
- 発見に失敗した
- 絞り込みの設定でそのツールが除かれていた
- そのサーバーに、その補助的な能力が無い
- `enabled: false` でサーバーが無効になっている

意図して絞り込んでいるなら、それが正しい結果です。

### リソースやプロンプトの補助ツールが現れないのはなぜか {#why-didnt-resource-or-prompt-utilities-appear}

いまの Hermes は、次の二つがどちらも満たされたときにだけ、それらの包みを登録するからです。
1. 設定が許している
2. サーバーのセッションが実際にその能力に対応している

これは意図した動きで、ツールの一覧を正直に保つためのものです。

## ツールの並列呼び出し {#parallel-tool-calls}

既定では、MCP のツールは一つずつ順番に動きます。同時に動かしても安全なツールを MCP サーバーが出しているなら（たとえば読み取りだけの問い合わせや、互いに独立した API の呼び出し）、並列の実行を選べます。

```yaml
mcp_servers:
  docs:
    command: "docs-server"
    supports_parallel_tool_calls: true
```

`supports_parallel_tool_calls` が `true` のとき、Hermes はそのサーバーの複数のツールを、一回のツール呼び出しのまとまりの中で同時に実行することがあります。内蔵の読み取り専用のツール（web_search、read_file など）と同じ扱いです。

:::caution
並列の呼び出しを有効にするのは、ツールを同時に動かしても安全な MCP サーバーだけにしてください。ツールが共有の状態、ファイル、データベース、外部の資源を読み書きする場合は、この設定を入れる前に読み書きの競合を確かめてください。
:::

## MCP のサンプリング対応 {#mcp-sampling-support}

MCP のサーバーは、`sampling/createMessage` のプロトコルを通して、Hermes に LLM の推論を頼めます。これにより MCP のサーバーは、自分の代わりに文章を作ってほしいと Hermes に依頼できます。LLM の力は必要だけれど自前のモデルを持たないサーバーに便利です。

サンプリングは、すべての MCP サーバーで **既定で有効** です（MCP の SDK が対応している場合）。サーバーごとの設定は `sampling` の下に書きます。

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

サンプリングを受け持つ部分には、時間の窓をずらしながら数える回数制限、要求ごとの制限時間、ツールの繰り返しの深さの上限があり、使いすぎを防ぎます。件数・エラー・使ったトークンといった数値は、サーバーの実体ごとに記録されます。

特定のサーバーでサンプリングを止めるには、次のようにします。

```yaml
mcp_servers:
  untrusted_server:
    url: "https://mcp.example.com"
    sampling:
      enabled: false
```

## MCP の問い合わせ（elicitation）対応 {#mcp-elicitation-support}

MCP のサーバーは、`elicitation/create` のプロトコル（mcp の Python SDK 1.11.0 以降）を通して、ツールの実行の途中で、決まった形の入力を利用者に尋ねられます。Hermes は **フォーム形式** の問い合わせを、いまある承認の窓口へ流します。CLI や TUI では対話的な確認、Telegram や Slack などゲートウェイのプラットフォームでは承認のボタンです。だから、セッションがどこにあっても要求はあなたに届きます。**URL 形式** の問い合わせ（サーバーが外部の URL を示すもの）は、対応していないものとして断ります。

問い合わせは、サーバーごとに **既定で有効** です。設定は `elicitation` の下に書きます。

```yaml
mcp_servers:
  my_server:
    command: "my-mcp-server"
    elicitation:
      enabled: true    # default: true
      timeout: 300     # seconds to wait for your answer (default: 300)
```

既定の 5 分という制限時間は、ゲートウェイの承認の既定に合わせたものです。すぐには見られない場所にいる利用者でも、サーバーがあきらめる前に答えられます。サーバーごとの数値（要求、承認、拒否、エラー）は、受け持つ部分で記録されます。

## Hermes を MCP サーバーとして動かす {#running-hermes-as-an-mcp-server}

MCP サーバーに **つなぐ** だけでなく、Hermes 自身が MCP サーバーに **なる** こともできます。これにより、MCP を扱える他のエージェント（Claude Code、Cursor、Codex、その他どんな MCP のクライアントでも）が、Hermes のメッセージ機能を使えます。会話の一覧、履歴の読み取り、そしてつながっているすべてのプラットフォームへのメッセージ送信です。

### どんなときに使うか {#when-to-use-this}

- Claude Code、Cursor、その他のコーディングのエージェントに、Hermes を通して Telegram / Discord / Slack のメッセージを送り書きさせたい
- Hermes につながっているメッセージのプラットフォームすべてに、一つの MCP サーバーで橋を架けたい
- すでにプラットフォームがつながった Hermes のゲートウェイが動いている

### 手早く始める {#quick-start}

```bash
hermes mcp serve
```

これで stdio の MCP サーバーが立ち上がります。プロセスの面倒を見るのは、あなたではなく MCP のクライアントです。

### MCP のクライアント側の設定 {#mcp-client-configuration}

MCP のクライアントの設定に Hermes を足します。たとえば Claude Code の `~/.claude/claude_desktop_config.json` では次のようになります。

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

Hermes を特定の場所にインストールしている場合は、次のようになります。

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

この MCP サーバーは 10 個のツールを出します。OpenClaw のチャンネルの橋渡しと同じ範囲に、Hermes 独自のチャンネル閲覧を加えたものです。

| ツール | 説明 |
|------|-------------|
| `conversations_list` | 動いているメッセージの会話を並べます。プラットフォームで絞ったり、名前で探したりできます。 |
| `conversation_get` | セッションの鍵を指定して、一つの会話の詳しい情報を取ります。 |
| `messages_read` | 会話の最近のメッセージの履歴を読みます。 |
| `attachments_fetch` | 特定のメッセージから、文字以外の添付（画像や動画など）を取り出します。 |
| `events_poll` | ある位置以降に起きた、新しい会話のできごとを取りに行きます。 |
| `events_wait` | 次のできごとが来るまで待ちます（ほぼその場で分かります）。 |
| `messages_send` | プラットフォームを通してメッセージを送ります（たとえば `telegram:123456`、`discord:#general`）。 |
| `channels_list` | すべてのプラットフォームにわたって、送り先として使えるものを並べます。 |
| `permissions_list_open` | この橋渡しのセッション中に見えた、未処理の承認の要求を並べます。 |
| `permissions_respond` | 未処理の承認の要求を、許可または拒否します。 |

### できごとの仕組み {#event-system}

この MCP サーバーには、Hermes のセッションのデータベースを見て新しいメッセージを拾う、生きた橋渡しが入っています。これで MCP のクライアントは、届いた会話をほぼその場で知ることができます。

```
# Poll for new events (non-blocking)
events_poll(after_cursor=0)

# Wait for next event (blocks up to timeout)
events_wait(after_cursor=42, timeout_ms=30000)
```

できごとの種類は、`message`、`approval_requested`、`approval_resolved` です。

できごとの待ち行列はメモリの上にあり、橋渡しがつながった時点から始まります。それより前のメッセージは `messages_read` から取れます。

### 起動時の指定 {#options}

```bash
hermes mcp serve              # Normal mode
hermes mcp serve --verbose    # Debug logging on stderr
```

### 仕組み {#how-it-works}

この MCP サーバーは、会話のデータを Hermes のセッションの保管庫から直接読みます。主となるのは `~/.hermes/state.db` で、`sessions.json` は古い形式のための予備としてだけ残しています。背後のスレッドがデータベースを見て新しいメッセージを拾い、メモリ上のできごとの待ち行列を保ちます。メッセージの送信には、cron の配送や `hermes send` の CLI を支えているのと同じ内部の送信の仕組み（`tools/send_message_tool.py`）を使います。

読み取りの操作（会話の一覧、履歴の読み取り、できごとの取得）では、ゲートウェイが動いている必要はありません。送信の操作では動いている必要があります。プラットフォームのアダプターに生きた接続が要るからです。

### いまの制限 {#current-limits}

- 組み込みの `hermes mcp serve` が出すのは、いまのところ **stdio だけ** の MCP サーバーです。HTTP の MCP サーバーが必要なら、別に橋渡しを走らせるか、もっとよくある選択として、すでに stdio と HTTP の両方を話せる Hermes の MCP の **クライアント** 側を使ってください（`mcp_servers.yaml` や `config.yaml` の `url` と `headers`。上の [HTTP サーバー](#http-servers) を参照）。
- できごとの取得は、更新時刻を見て無駄を省いたデータベースの確認により、およそ 200 ミリ秒ごとに行われます（ファイルが変わっていなければ何もしません）
- `claude/channel` の通知を押し出すプロトコルには、まだ対応していません
- 送れるのは文字だけです（`messages_send` から動画や添付は送れません）

## 関連する文書 {#related-docs}

- [Hermes で MCP を使う](/hermes/docs/guides/use-mcp-with-hermes/)
- [CLI のコマンド一覧](/hermes/docs/reference/cli-commands/)
- [スラッシュコマンド一覧](/hermes/docs/reference/slash-commands/)
- [よくある質問](/hermes/docs/reference/faq/)
