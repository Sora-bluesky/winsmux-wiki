---
title: "MCP (Model Context Protocol)"
description: "MCP で Hermes Agent を外部のツールサーバーにつなぎ、読み込む MCP ツールを細かく選ぶ"
upstream_path: user-guide/features/mcp.md
upstream_blob: a3fe5f0802bba5bad55dc222257ae891d9ce6664
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp
---

# MCP (Model Context Protocol) {#mcp-model-context-protocol}

MCP を使うと、Hermes Agent を外部のツールサーバーにつないで、Hermes の外にあるツールを使わせられます。GitHub、データベース、ファイルシステム、ブラウザ環境、社内の API など、対象はさまざまです。

すでにどこかにあるツールを Hermes に使わせたいと思ったことがあるなら、たいていは MCP がいちばん素直な方法です。

:::tip Claude Code から移ってきた場合
`~/.claude.json` の `mcpServers` は、Hermes の `config.yaml` では `mcp_servers` にあたります。`hermes import-agent claude-code` を実行すれば、スキルや指示ファイルもろとも自動で移してくれます。[他のエージェントから取り込む](/hermes/docs/user-guide/import-from-other-agents/)を参照してください。
:::

## MCP でできること {#what-mcp-gives-you}

- Hermes 用のツールを自分で書かなくても、外部のツール群をそのまま使えます
- ローカルの stdio サーバーとリモートの HTTP MCP サーバーを、同じ設定ファイルにまとめて書けます
- 起動時にツールを自動で見つけて登録します
- サーバーが対応していれば、MCP のリソースやプロンプトを包んだ補助ツールも用意されます
- サーバーごとに絞り込めるので、Hermes に見せたい MCP ツールだけを出せます

## すぐに使い始める {#quick-start}

1. MCP は標準の導入手順に含まれています。追加の作業は要りません。

2. `~/.hermes/config.yaml` に MCP サーバーを書き足します。

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

4. その MCP でできることを Hermes に頼みます。

たとえばこう伝えます。

```text
List the files in /home/user/projects and summarize the repo structure.
```

Hermes は MCP サーバーのツールを見つけ、他のツールと同じように使います。

## カタログ：Nous が承認した MCP をワンクリックで入れる {#catalog-one-click-install-for-nous-approved-mcps}

Hermes には、Nous のスタッフが確認して取り込んだ MCP サーバーのカタログが同梱されています。既定ではどれも無効なので、自分が使いたいものだけを入れてください。

```bash
hermes mcp                # interactive picker (default)
hermes mcp catalog        # plain-text list, scriptable
hermes mcp install n8n    # install a catalog entry by name
```

一覧では、各項目が現在の状態とともに表示されます。

```
n8n          available              Manage and inspect n8n workflows from Hermes
linear       enabled                Linear issue/project management (remote OAuth)
github       installed (disabled)   GitHub repo + PR tools
```

行の上で `Enter` を押すと、導入（必要な認証情報の入力も含む）、有効化、無効化、削除ができます。カタログの項目は hermes-agent リポジトリの `optional-mcps/` 以下に置かれており、そこに入っていること自体が Nous の承認を意味します。コミュニティ投稿枠のようなものはなく、項目の追加は PR のマージによって行われます。

カタログの項目が求めるものは次のとおりです。

- **API キー** — 導入時に Hermes が入力を促し、値を `~/.hermes/.env` に書き込みます。秘密でない値（ベース URL など）も同じファイルに入ります。
- **OAuth**（リモートの MCP） — 設定には `auth: oauth` と書かれ、MCP クライアントが最初の接続時にブラウザを開きます。
- **OAuth**（Google や GitHub などの外部サービス） — まだ認証していなければ、Hermes が `hermes auth <provider>` を案内します。

### 導入時にツールを選ぶ {#tool-selection-at-install-time}

認証情報の設定が済むと、Hermes は MCP サーバーに問い合わせて公開されているツールを列挙し、チェックリストを出します。

```
Select tools for 'linear' (SPACE toggle, ENTER confirm)
  [x] find_issues       Find issues matching a query
  [x] get_issue         Get a single issue
  [x] create_issue      Create a new issue
  [ ] delete_workspace  Delete a Linear workspace
  ...
```

あらかじめチェックが入る行は、次の順で決まります。

1. **前回の選択** — この項目を以前に入れたことがあれば、その内容が引き継がれます（入れ直しても、マニフェストの既定値で上書きされることはありません）
2. **マニフェストの `tools.default_enabled`** — 項目が宣言していればそれに従います（カタログの中には、状態を書き換えるツールや出番の少ないツールをあらかじめ外してあるものもあります）
3. **すべて** — 上のどちらにも当てはまらない場合

自動生成されたツールが極端に多い項目（たとえば `cloudflare` は OpenAPI のエンドポイントが約 3,300 個）では、代わりに `tools.default_excluded` を宣言しています。これは名前とグロブパターンをまとめた除外リストです。こうした項目を入れるときはチェックリストが省かれ、`tools.exclude` が書き込まれます。パターンに当たらないものはすべて有効のままで、あとからサーバーが増やしたツールも含まれます。まとめて元に戻したいときは、config.yaml の `mcp_servers.<name>.tools.exclude` を編集してください。

チェックリストは ENTER で確定します。チェックの入ったツールだけが `mcp_servers.<name>.tools.include` に入ります。すべて選んだ場合は絞り込みが書かれません（設定がいちばんすっきりし、動きは同じです）。

**問い合わせに失敗したとき**（サーバーに届かない、OAuth がまだ済んでいない、裏のサービスが動いていない、など）も導入自体は成功します。マニフェストに `tools.default_enabled` があればそれをそのまま適用し、なければ絞り込みを書きません。サーバーに届くようになってから `hermes mcp configure <name>` をやり直して調整してください。

### 信頼のしくみ {#trust-model}

カタログの項目を入れると、マニフェストに書かれたことがそのまま実行されます。`git clone`、その項目の `bootstrap` コマンド（`pip install`、`npm install` など）、そして最終的には MCP サーバー自身のコードです。マニフェストは hermes-agent リポジトリへの PR レビューを経ているので、公開前に Nous が各項目を確認しています。**それでも、入れる前にマニフェストには目を通してください**。とくに `source:` に書かれたリポジトリ、`install.bootstrap:` のコマンド、`transport.command:` で何が起動されるかを見てください。

マニフェストは GitHub の [`optional-mcps/<name>/manifest.yaml`](https://github.com/NousResearch/hermes-agent/tree/main/optional-mcps) にあります。導入時には一覧画面がマニフェストの `source:` の URL も表示するので、上流のリポジトリをその場で確かめられます。Web ダッシュボードの MCP ページでも、カタログの項目ごとに同じ内容を確認できます。通信方式、認証の種類、エンドポイントの URL（HTTP の場合）またはコマンドと引数（stdio の場合）、git の取得元と参照、bootstrap のコマンド、設定の補足まで並び、`source:` はリンクとして表示されます。Install を押す前に、その項目が何につなぎ何を実行するのかを正確に確かめられます。

### マニフェストのバージョン互換性 {#manifest-version-compatibility}

マニフェストには `manifest_version` が固定で書かれています。カタログは新しい版に対して前向きに作られており、手元の Hermes が理解できるより新しい `manifest_version` の項目が PR で追加された場合、その項目は黙って隠されるのではなく警告（`⚠ '<name>' requires a newer Hermes`）が表示されます。これが出たら `hermes update` で最新の Hermes を入れてください。

### 実行時の `${ENV_VAR}` 置き換え {#runtime-envvar-substitution}

項目の `transport.command`、`transport.args`、`transport.url`、`headers` の中では、`${VAR}` という書き方が接続時に環境変数（`~/.hermes/.env` の内容も含みます）から解決されます。カタログの項目が、別の場所で設定した値を参照したいときに便利です。たとえば `${HOME}/foo` や `${MY_PROVIDER_TOKEN}` のように書けます。

Cursor 風の文脈変数も置き換えられます（大文字と小文字は区別されます）。`${userHome}`（ホームディレクトリ）、`${workspaceFolder}`（セッションの作業ディレクトリの起点）、`${workspaceFolderBasename}`、`${pathSeparator}` / `${/}`（OS のパス区切り文字）です。詳しくは [MCP 設定の早見表](/hermes/docs/reference/mcp-config-reference/)を参照してください。

これはカタログのマニフェストに出てくる `${INSTALL_DIR}` とは別物である点に注意してください。あちらは導入時に、その項目のリポジトリを取得した先のパスへ置き換えられます。

### あとからツールの選択を変える {#updating-tool-selection-later}

```bash
hermes mcp configure linear
```

同じチェックリストが、今の選択にチェックが入った状態で開きます。使えるツールを増やしたいときや、サーバーが追加した新しいツールを取り込みたいときに使ってください。

### カタログのマニフェストを更新する {#updating-the-catalog-manifest}

MCP が自動で更新されることはありません。Hermes を更新したあとにマニフェストの版が変わっていたら、`hermes mcp install <name>` をやり直して反映してください。

カタログに MCP を追加したい場合は、[`optional-mcps/`](https://github.com/NousResearch/hermes-agent/tree/main/optional-mcps) に対して PR を出してください。

### 提案用の情報（`suggest:`） {#suggestion-metadata-suggest}

マニフェストには、`keywords:` や `hosts:` のリストを持つ `suggest:` ブロックを任意で書けます。画面側（今のところデスクトップアプリの入力欄）はこれを使い、書きかけの文にキーワードが単語として含まれていたり、貼り付けたリンクのホスト名が指定の末尾に一致したりしたときに、ワンクリックの「Add &lt;server&gt;」ボタンを出します。これはあくまで案内で、実際の導入は同じ検証済みのカタログと設定の経路を通ります。ホスト型のリモート項目（Atlassian、Sentry、Notion、Stripe、Vercel、Supabase など）の多くがこれを宣言しています。

GitHub は意図的にカタログへ入れていません。ホスト型の MCP がクライアントごとに自前の OAuth アプリを要求し（一般的な動的クライアント登録は拒否されます）、また `gh` CLI を動かす Hermes 同梱の `github/*` スキルのほうが機能面で優れているためです。デスクトップでは、GitHub に触れると代わりに `github-auth` スキルが提案されます（`gh` にまだサインインしていない場合）。

## MCP サーバーの 2 つの種類 {#two-kinds-of-mcp-servers}

### stdio サーバー {#stdio-servers}

stdio サーバーは手元の子プロセスとして動き、標準入出力でやり取りします。

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "***"
```

stdio サーバーが向いているのは次の場合です。
- サーバーを手元に入れてある
- 手元のリソースへ遅延を抑えて触りたい
- 参照している MCP サーバーの説明が `command`、`args`、`env` の形で書かれている

### HTTP サーバー {#http-servers}

HTTP の MCP サーバーは、Hermes が直接つなぎにいくリモートのエンドポイントです。

```yaml
mcp_servers:
  remote_api:
    url: "https://mcp.example.com/mcp"
    headers:
      Authorization: "Bearer ***"
```

HTTP サーバーが向いているのは次の場合です。
- MCP サーバーが別の場所で動いている
- 組織が社内向けの MCP エンドポイントを公開している
- その連携のために Hermes に子プロセスを立ち上げさせたくない

### OAuth で認証する HTTP サーバー {#oauth-authenticated-http-servers}

ホスト型の MCP サーバー（Cloudflare、Linear、Sentry、Atlassian、Asana、Figma、Stripe など）の多くは、固定のベアラートークンではなく OAuth 2.1 を求めます。`auth: oauth` と書いておけば、探索、クライアントの識別、PKCE、トークンの交換と更新、追加認証まで、Hermes が MCP の Python SDK を通して面倒を見ます。

Hermes は、対応しているサーバーに対しては [Client ID Metadata Document](/hermes/docs/reference/mcp-config-reference/#client-identification-cimd-and-dcr) で自分を名乗り、対応していないサーバーには動的クライアント登録で切り替えます。どちらも自動なので、設定することはありません。

:::tip Figma のリモート MCP
Figma のホスト型エンドポイント（`https://mcp.figma.com/mcp`）は、動的クライアント登録を **`client_name` の完全一致**で許可しています。素の `"Hermes Agent"` は 403 になり、`"Claude Code"` や `"Codex"` は通ります。Hermes は `mcp.figma.com` に対して `oauth.client_name: "Claude Code"` を自動で設定するので、小細工なしに導入とログインができます。

```yaml
mcp_servers:
  figma:
    url: "https://mcp.figma.com/mcp"
    auth: oauth
```

あるいは `hermes mcp install figma` を実行してから `hermes mcp login figma` としてください。
:::

```yaml
mcp_servers:
  linear:
    url: "https://mcp.linear.app/mcp"
    auth: oauth
```

最初につなぐとき、Hermes は認可用の URL を表示し、可能ならブラウザを開いて、ローカルのループバックポートで OAuth のコールバックを待ちます。トークンは `~/.hermes/mcp-tokens/<server>.json` に 0o600 の権限で保存され、更新に失敗するまでは次回以降も黙って再利用されます。

**リモートや画面のないホストの場合。** Hermes がブラウザとは別の端末で動いていると、ループバックのコールバックは手元のパソコンに届きません。手立ては次のとおりです。

- **Hermes Desktop（自動）：** デスクトップアプリの MCP 設定画面からリモートのバックエンドに対して OAuth のサインインを行うと、デスクトップ側が*手元の*端末でコールバックを待ち受け、認可の結果を自動でゲートウェイへ渡します。トンネルも貼り付けもプロキシも要りません。デスクトップアプリとバックエンドの両方が最新である必要があります。
- **貼り付けで戻す（準備不要）：** 対話できる端末では、Hermes が認可用の URL と一緒に「Or paste the redirect URL here…」と表示します。その URL をブラウザで開いて承認し、最後に表示された URL を丸ごとコピーして（リダイレクト先は接続エラーになりますが、それで正常です）、プロンプトに貼り付けてください。`?code=…&state=…` のクエリ文字列だけでも通ります。
- **SSH のポート転送：** 別の端末で `ssh -N -L <port>:127.0.0.1:<port> user@host` を実行しておき、あとは普通にリダイレクトさせます。
- **プロキシ経由のコールバック（`redirect_uri`）：** 公開された HTTPS のエンドポイントがホストへ転送してくれる場合（Tailscale Funnel やコールバックのポートに向けたリバースプロキシなど）、`oauth.redirect_uri` を設定すればブラウザのリダイレクトがそのまま Hermes に届きます。トンネルも貼り付けも要りません。

```yaml
mcp_servers:
  myserver:
    url: "https://mcp.example.com/mcp"
    auth: oauth
    oauth:
      redirect_port: 8765                                # fixed port for the proxy to target
      redirect_uri: "https://oauth.example.ts.net/callback"
```

対話できる端末がまったくない、完全に無人のゲートウェイ（メッセージングのボットなど）については、任意で入れられる [`mcp-oauth-remote-gateway` スキル](/hermes/docs/user-guide/skills/optional/mcp/mcp-mcp-oauth-remote-gateway/)が、手作業で認証を終わらせてトークンを所定の場所に書くところまでエージェントを導いてくれます。

**落とし穴 — WAF が `127.0.0.1` のリダイレクト先を弾く。** 認可サーバーの前段に置いた WAF が、クエリ文字列に `127.0.0.1` という文字列を含む認可リクエストを一律 403 にする提供元がいくつかあります（Reclaim.ai の AWS API Gateway が知られた例で、OAuth アプリまで届く前にすべて `{"message":"Forbidden"}` が返ります）。`oauth.redirect_host: localhost` を設定して `http://localhost:<port>/callback` を使ってください。どちらにしても、コールバックの待ち受け自体は `127.0.0.1` に結びつけられます。

動的クライアント登録に対応しないサーバー（Slack など）、あらかじめ登録済みの `client_id` / `client_secret`、スコープの調整、`hermes mcp login <server>` による再認証まで含めた手順は、[SSH 越しの OAuth / リモートホスト](/hermes/docs/guides/oauth-over-ssh/#mcp-servers)にすべて載っています。

**落とし穴 — 自動登録に対応しない提供元（Google ドライブ、Atlassian）。** サーバーによっては、素の `auth: oauth` が前提にしている動的クライアント登録（RFC 7591）を拒否します。Google 公式のドライブ用サーバー（`https://drivemcp.googleapis.com/mcp/v1`）は `400 Bad Request` を返すので、OAuth クライアントが作られず、トークンも手に入りません。この症状は分かりにくいところがあります。こうしたサーバーは認証*なしでも* `tools/list` に応じるため、`hermes mcp login` がツールを列挙できてしまい、うまくいったように見えるのです。実際にツールを呼ぶ段になって、ことごとくタイムアウトします。現在の `hermes mcp login` はこれを検出し（トークンが本当にディスクに書かれたかを確かめます）、自分の OAuth クライアントを用意するよう案内します。提供元のコンソールで作成し、設定に書き足してください。

```yaml
mcp_servers:
  googledrive:
    url: "https://drivemcp.googleapis.com/mcp/v1"
    auth: oauth
    oauth:
      client_id: "<your-oauth-client-id>"
      client_secret: "<your-oauth-client-secret>"
```

そのうえで `hermes mcp login googledrive` を実行します。登録済みのクライアントがあれば、Hermes は登録の手順を飛ばして通常のブラウザ認可へ進みます。

**落とし穴 — 設定の自動再読み込みとの競合。** Hermes のセッションを動かしたまま `~/.hermes/config.yaml` を編集すると、CLI は 30 秒の制限つきで MCP の接続を自動的に張り直します。対話的な OAuth にはこれでは足りません。項目を書き足したら、別の端末から `hermes mcp login <server>` を実行してください。こちらは認証が終わるまで 5 分まるまる待ちます。

## mTLS とクライアント証明書 {#mtls-client-certificates}

相互 TLS（クライアント証明書による認証）を求めるリモートの HTTP MCP サーバーには、`client_cert` / `client_key` で対応できます。Hermes は解決した証明書を、TLS のやり取りのために下層の HTTP クライアントへ渡します。

`client_cert` は 3 通りの書き方を受け付けます。

- **1 つにまとめた PEM のパス** — 証明書と秘密鍵を 1 ファイルに収めたもの。

```yaml
mcp_servers:
  internal_api:
    url: "https://mcp.internal.example.com/mcp"
    client_cert: "~/.certs/mcp-client.pem"
```

- **`[cert, key]` の 2 要素** — 証明書と鍵を別ファイルに分けたもの（`client_cert` と `client_key` を両方書くのと同じです）。

```yaml
mcp_servers:
  internal_api:
    url: "https://mcp.internal.example.com/mcp"
    client_cert: ["~/.certs/mcp-client.crt", "~/.certs/mcp-client.key"]
```

- **`[cert, key, password]` の 3 要素** — 秘密鍵が暗号化されている場合、3 つ目が鍵のパスフレーズになります。

```yaml
mcp_servers:
  internal_api:
    url: "https://mcp.internal.example.com/mcp"
    client_cert: ["~/.certs/mcp-client.crt", "~/.certs/mcp-client.key", "${MCP_KEY_PASSWORD}"]
```

`client_cert`（まとめた PEM）と明示的な `client_key` を組み合わせて、証明書と鍵を完全に分けておくこともできます。パスでは `~` が展開されます。ファイルが見つからない場合は、意味の分からない TLS のエラーではなく、どのサーバーの話かが分かるはっきりしたエラーになります。

## 利用者ごとの識別ヘッダー {#per-user-identity-header}

呼び出し元の識別に応じて動きを変えるリモートの HTTP / SSE MCP サーバー（利用者ごとのレート制限、監査記録、テナントごとの振り分けなど）には、`identity_header` で毎回のリクエストに識別用のヘッダーを付けられます。

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
- `value_from: profile` は現在の Hermes プロファイル名を送ります。接続時に一度だけ解決されるので、1 台の端末にある複数のプロファイルが同じサーバーに接続し、サーバー側で区別する必要があるときに役立ちます。

サーバーの `headers` に同じ名前（大文字小文字は問いません）が書かれている場合は、そちらが必ず優先されます。識別ヘッダーが自分で書いたヘッダー設定を上書きすることはありません。`identity_header` の書き方が正しくない場合は警告のうえ無視され、接続そのものが止まることはありません。stdio サーバーでは警告とともに無視されます（stdio の通信方式にヘッダーの概念がないためです）。

## 基本の設定早見表 {#basic-configuration-reference}

Hermes は MCP の設定を `~/.hermes/config.yaml` の `mcp_servers` の下から読みます。

### よく使うキー {#common-keys}

| キー | 型 | 意味 |
|---|---|---|
| `command` | string | stdio の MCP サーバーを起動する実行ファイル |
| `args` | list | stdio サーバーに渡す引数 |
| `env` | mapping | stdio サーバーに渡す環境変数 |
| `url` | string | HTTP の MCP エンドポイント |
| `headers` | mapping | リモートのサーバーに送る HTTP ヘッダー |
| `client_cert` | string \| list | mTLS 用のクライアント証明書。まとめた PEM のパス、または `[cert, key]` / `[cert, key, password]` |
| `client_key` | string | クライアントの秘密鍵 PEM のパス（`client_cert` と分けている場合） |
| `identity_header` | mapping | HTTP / SSE サーバー向けの、利用者ごとの識別ヘッダー（任意）。`{name, value_from: static\|profile, value}` |
| `timeout` | number | ツール呼び出しの制限時間 |
| `connect_timeout` | number | 最初の接続の制限時間（MCP の `initialize` のやり取りにも効きます） |
| `idle_timeout_seconds` | number | ツール呼び出しがないまま この秒数が過ぎたら stdio サーバーを作り直します（`0` は作り直さない。既定値）。次にツールが呼ばれた時点で、意識せずに再起動されます。 |
| `max_lifetime_seconds` | number | 起動からこの秒数が過ぎたら stdio サーバーを作り直します（`0` は作り直さない。既定値）。次に使うときに、意識せずに再起動されます。 |
| `enabled` | bool | `false` なら、そのサーバーをまるごと飛ばします |
| `supports_parallel_tool_calls` | bool | `true` なら、このサーバーのツールを同時に動かすことがあります |
| `tools` | mapping | サーバーごとのツールの絞り込みと、補助ツールの扱い |

### 最小の stdio 設定 {#minimal-stdio-example}

```yaml
mcp_servers:
  filesystem:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
```

### メモリを食う stdio サーバーを作り直す {#recycling-memory-heavy-stdio-servers}

ブラウザを使う MCP サーバー（`@playwright/mcp` など）は、最初にツールを呼んだあと Chromium を丸ごと常駐させ続けます。数百 MB が解放されないままです。自動での作り直しを有効にすると、待機時間や寿命の上限を超えたところでサーバーが片付けられ、次にそのツールが呼ばれたときに意識せず再起動されます（その間もツールは登録されたままです）。

```yaml
mcp_servers:
  playwright:
    command: "npx"
    args: ["-y", "@playwright/mcp@latest", "--headless"]
    idle_timeout_seconds: 900     # recycle after 15 min without a tool call
    max_lifetime_seconds: 86400   # and at least once a day regardless
```

### 最小の HTTP 設定 {#minimal-http-example}

```yaml
mcp_servers:
  company_api:
    url: "https://mcp.internal.example.com"
    headers:
      Authorization: "Bearer ***"
```

## 組み込みのプリセット {#built-in-presets}

よく知られた MCP サーバーについては、`hermes mcp add` に `--preset` を付けると通信方式の詳細が埋まるので、コマンドや引数を調べなくて済みます。プリセットが与えるのは既定値だけなので、同じコマンドラインで指定したもの（環境変数、ヘッダー、絞り込みなど）はそちらが優先されます。

| プリセット | 何が設定されるか |
|---|---|
| `codex` | Codex CLI の MCP サーバー（stdio で `codex mcp-server` を起動）。PATH に `codex` CLI が必要です。 |

```bash
# Add Codex CLI as an MCP server in one line
hermes mcp add codex --preset codex
```

これは次と同じ内容を書き込みます。

```yaml
mcp_servers:
  codex:
    command: "codex"
    args: ["mcp-server"]
```

手元での名前は自由に決められます（`hermes mcp add my-codex --preset codex` でも構いません）。プリセットが与えるのは `command` と `args` の既定値だけです。

## Hermes が MCP ツールを登録するしくみ {#how-hermes-registers-mcp-tools}

組み込みのツール名とぶつからないよう、Hermes は MCP のツール名に接頭辞を付けます。

```text
mcp_<server_name>_<tool_name>
```

例を挙げます。

| サーバー | MCP のツール | 登録される名前 |
|---|---|---|
| `filesystem` | `read_file` | `mcp_filesystem_read_file` |
| `github` | `create-issue` | `mcp_github_create_issue` |
| `my-api` | `query.data` | `mcp_my_api_query_data` |

実際のところ、接頭辞付きの名前を自分で呼ぶ必要はほとんどありません。Hermes はそのツールを認識し、普通に考えたうえで選びます。

### ツールの結果の無害化と `_meta` {#tool-result-sanitization-and-meta}

モデルが目にする前に、すべての MCP ツールの結果に対して 2 つの処理が行われます。

- **見えない Unicode のタグ文字を取り除きます。** U+E0000〜U+E007F の範囲の文字は、端末やチャットの画面では何も表示されないのに、モデルからは完全に読めてしまいます。悪意のあるサーバーや乗っ取られたサーバーが指示を紛れ込ませる、よく知られた経路です。Hermes はこれをツールの結果、リソースの内容、ツールの説明から取り除きます。絵文字として正当なタグの並び（🏴󠁧󠁢󠁳󠁣󠁴󠁿 のような地域旗）は残します。
- **提供元独自の `_meta` は渡し、プロトコルが予約したキーは渡しません。** サーバーがツールの結果に `_meta` を付けてきた場合（`com.example/handoff` のような独自の名前空間）、Hermes はそれを結果の中身と一緒にモデルへ渡します。プロトコルが予約している接頭辞の下にあるキー、つまり `modelcontextprotocol` または `mcp` というラベルにもう 1 つラベルが続くもの（`modelcontextprotocol.io/...` や `tools.mcp.com/...` など）は、MCP 仕様のキー名の規則に従って落とされます。モデルに渡すものが何も残らなければ、`_meta` の項目そのものが省かれます。

## MCP の補助ツール {#mcp-utility-tools}

サーバーが対応している場合、Hermes は MCP のリソースとプロンプトを扱う補助ツールも登録します。

- `list_resources`
- `read_resource`
- `list_prompts`
- `get_prompt`

これらもサーバーごとに、同じ接頭辞の付け方で登録されます。たとえば次のようになります。

- `mcp_github_list_resources`
- `mcp_github_get_prompt`

### 大事な点 {#important}

これらの補助ツールは、サーバーの対応状況を見て登録されるようになりました。
- MCP のセッションが実際にリソース操作に対応しているときだけ、リソース関連の補助ツールを登録します
- MCP のセッションが実際にプロンプト操作に対応しているときだけ、プロンプト関連の補助ツールを登録します

そのため、呼び出せるツールはあってもリソースやプロンプトを持たないサーバーには、これらの補助ツールは付きません。

## サーバーごとの絞り込み {#per-server-filtering}

各 MCP サーバーが Hermes に渡すツールを選べます。ツール名の空間を細かく管理できます。

### サーバーをまるごと止める {#disable-a-server-entirely}

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

挙げた MCP サーバーのツールだけが登録されます。

`include` と `exclude` の項目にはグロブパターン（`*`、`?`、`[...]`。大文字と小文字は区別されます）も書けます。`include: ["*_dns_*"]` と書けば、名前に `_dns_` を含むツールがすべて登録されます。特殊文字を含まない項目は、これまでどおり完全一致です。自動生成されたエンドポイントのツールを何千個も公開するサーバーを、製品の系統ごとに絞り込むにはグロブが実用的です。

### 使わないツールを挙げる {#blacklist-server-tools}

```yaml
mcp_servers:
  stripe:
    url: "https://mcp.stripe.com"
    tools:
      exclude: [delete_customer]
```

挙げたもの以外、サーバーのツールがすべて登録されます。

### グロブパターン {#glob-patterns}

どちらのリストも、正確な名前と並べて fnmatch 形式のグロブを受け付けます。Cloudflare の API MCP（`?codemode=false` で約 3,300 個のツール）のように平坦で巨大な面を相手にするとき、製品の領域をエンドポイント 1 つずつ除いていくのは現実的ではないので、これが要になります。

```yaml
mcp_servers:
  cloudflare:
    url: "https://mcp.cloudflare.com/mcp?codemode=false"
    auth: oauth
    tools:
      exclude: ["*_radar_*", "*_accounts_dlp_*", "*_zones_web3_*"]
```

グロブの特殊文字（`*`、`?`、`[`）を含まない項目は完全一致です。`docs` と書けば `docs` という名前のツールだけが除かれ、`docs_search` は除かれません。

### どちらが優先されるか {#precedence-rule}

両方が書かれている場合は次のようになります。

```yaml
tools:
  include: [create_issue]
  exclude: [create_issue, delete_issue]
```

`include` が勝ちます。

### 補助ツールも絞り込む {#filter-utility-tools-too}

Hermes が足す補助ツールだけを、個別に止めることもできます。

```yaml
mcp_servers:
  docs:
    url: "https://mcp.docs.example.com"
    tools:
      prompts: false
      resources: false
```

意味はこうです。
- `tools.resources: false` は `list_resources` と `read_resource` を止めます
- `tools.prompts: false` は `list_prompts` と `get_prompt` を止めます

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

## すべて絞り込みで消えたらどうなる？ {#what-happens-if-everything-is-filtered-out}

呼び出せるツールがすべて絞り込みで消え、対応している補助ツールもすべて止めるか書かないままにした場合、Hermes はそのサーバーのために空のツール群を実行時に作ることはしません。

ツールの一覧がすっきり保たれます。

## 実行時の動き {#runtime-behavior}

### いつ見つけるか {#discovery-time}

Hermes は起動時に MCP サーバーを見つけ、そのツールを通常のツール登録簿へ登録します。

### 実行中のツール変更の検出 {#dynamic-tool-discovery}

MCP サーバーは、使えるツールが実行中に変わったことを `notifications/tools/list_changed` という通知で Hermes に知らせられます。この通知を受け取ると、Hermes はそのサーバーのツール一覧を自動で取り直し、登録簿を更新します。`/reload-mcp` を手で叩く必要はありません。

これは、できることが動的に変わる MCP サーバーで役に立ちます。たとえば新しいデータベーススキーマを読み込んだときにツールが増えるサーバーや、サービスが落ちたときにツールが減るサーバーです。

取り直しはロックで守られているので、同じサーバーから通知が立て続けに来ても処理が重なりません。プロンプトとリソースの変更通知（`prompts/list_changed`、`resources/list_changed`）は受け取りますが、今のところ動作には反映していません。

### 読み込み直す {#reloading}

MCP の設定を変えたときは、次を使います。

```text
/reload-mcp
```

これで設定から MCP サーバーを読み込み直し、使えるツールの一覧を更新します。また、利用できるかどうかで出し分けられるツール（Docker、`HASS_TOKEN`、OAuth など）を調べ直す明示的な手段でもあります。セッションのツール構成はそれ以外では固定されるので、途中で用意された認証情報やデーモンは `/reload-mcp`、`/new`、または文脈の圧縮のタイミングでしか拾われません。サーバー側から通知される実行中の変更については、上の[実行中のツール変更の検出](#dynamic-tool-discovery)を参照してください。

### ツール群 {#toolsets}

設定した MCP サーバーは、登録されたツールを 1 つ以上持つ場合、実行時のツール群も作ります。

```text
mcp-<server>
```

これにより、MCP サーバーをツール群の単位で捉えやすくなります。

## セキュリティのしくみ {#security-model}

### stdio の環境変数の絞り込み {#stdio-env-filtering}

stdio サーバーに対して、Hermes はシェルの環境変数をそのまま丸ごと渡すことはしません。

明示的に設定した `env` と、安全な最低限のものだけが渡されます。うっかり秘密情報が漏れる余地を減らすためです。

### 設定による公開範囲の制御 {#config-level-exposure-control}

新しくなった絞り込みは、セキュリティ上の制御でもあります。
- モデルに見せたくない危険なツールを止められます
- 機微なサーバーについては、最小限の許可リストだけを見せられます
- リソースやプロンプトの面を出したくないときは、その補助ツールを止められます

## 使い方の例 {#example-use-cases}

### イシュー管理だけに絞った GitHub サーバー {#github-server-with-a-minimal-issue-management-surface}

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

こう使います。

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

こう使います。

```text
Look up the last 10 failed payments and summarize common failure reasons.
```

### プロジェクト 1 つに絞ったファイルシステムサーバー {#filesystem-server-for-a-single-project-root}

```yaml
mcp_servers:
  project_fs:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/my-project"]
```

こう使います。

```text
Inspect the project root and explain the directory layout.
```

## 困ったときは {#troubleshooting}

### MCP サーバーにつながらない {#mcp-server-not-connecting}

次を確認します。

```bash
# Verify MCP deps are installed (already included in standard install)
cd ~/.hermes/hermes-agent && uv pip install -e ".[mcp]"

node --version
npx --version
```

そのうえで設定を見直し、Hermes を起動し直してください。

### ツールが出てこない {#tools-not-appearing}

考えられる原因は次のとおりです。
- サーバーへの接続に失敗した
- ツールの検出に失敗した
- 設定の絞り込みでそのツールが外れている
- そのサーバーに補助ツールの元になる機能がない
- サーバーが `enabled: false` で止められている

意図して絞り込んでいるなら、これは想定どおりの動きです。

### リソースやプロンプトの補助ツールが出ないのはなぜ？ {#why-didnt-resource-or-prompt-utilities-appear}

現在の Hermes は、次の 2 つがどちらも成り立つときだけ、それらの補助ツールを登録するからです。
1. 設定がそれを許している
2. サーバーのセッションが実際にその機能に対応している

これは意図した動きで、ツールの一覧を実態に合ったものに保ちます。

## ツールの同時呼び出し {#parallel-tool-calls}

既定では、MCP のツールは 1 つずつ順番に実行されます。同時に動かしても安全なツール（読み取り専用の問い合わせ、互いに独立した API 呼び出しなど）を MCP サーバーが公開しているなら、同時実行を選べます。

```yaml
mcp_servers:
  docs:
    command: "docs-server"
    supports_parallel_tool_calls: true
```

`supports_parallel_tool_calls` が `true` のとき、Hermes は 1 回のツール呼び出しのまとまりの中で、そのサーバーの複数のツールを同時に実行することがあります。組み込みの読み取り専用ツール（web_search、read_file など）と同じ扱いです。

:::caution
同時に動かしても安全なツールを持つ MCP サーバーにだけ、この設定を入れてください。ツールが共有の状態、ファイル、データベース、外部のリソースを読み書きする場合は、有効にする前に読み書きの競合を確かめてください。
:::

## MCP のサンプリング対応 {#mcp-sampling-support}

MCP サーバーは `sampling/createMessage` というプロトコルを通じて、Hermes に LLM の推論を頼めます。つまり MCP サーバーが Hermes に代理で文章を作らせられるということで、LLM の力は必要だが自前のモデルを持たないサーバーに向いています。

サンプリングは、すべての MCP サーバーで**既定で有効**です（MCP の SDK が対応している場合）。設定はサーバーごとに `sampling` キーの下で行います。

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

サンプリングの処理には、時間窓をずらしながら数えるレート制限、リクエストごとの制限時間、ツール呼び出しの入れ子の深さの上限が組み込まれており、使いすぎに歯止めがかかります。指標（リクエスト数、エラー、使ったトークン数）はサーバーの実体ごとに記録されます。

特定のサーバーでサンプリングを止めるにはこう書きます。

```yaml
mcp_servers:
  untrusted_server:
    url: "https://mcp.example.com"
    sampling:
      enabled: false
```

## MCP の追加入力（elicitation）対応 {#mcp-elicitation-support}

MCP サーバーは `elicitation/create` というプロトコルを通じて、ツールの実行中に決まった形式の入力を利用者へ求められます（mcp の Python SDK 1.11.0 以上）。Hermes は**フォーム形式**の要求を既存の承認画面へ流します。CLI や TUI では対話的なプロンプト、Telegram や Slack などのゲートウェイでは承認ボタンとして出るので、セッションがどこにあっても要求が届きます。**URL 形式**の要求（外部の URL に誘導するもの）は、未対応として断ります。

追加入力はサーバーごとに**既定で有効**です。設定は `elicitation` キーの下で行います。

```yaml
mcp_servers:
  my_server:
    command: "my-mcp-server"
    elicitation:
      enabled: true    # default: true
      timeout: 300     # seconds to wait for your answer (default: 300)
```

既定の 5 分という制限時間は、ゲートウェイの承認の既定値に合わせたものです。すぐに反応できない場所にいても、サーバーがあきらめる前に答える余裕があります。サーバーごとの指標（要求、承認、拒否、エラー）も記録されます。

## Hermes を MCP サーバーとして動かす {#running-hermes-as-an-mcp-server}

Hermes は MCP サーバーへ**つなぐ**だけでなく、自分が MCP サーバーに**なる**こともできます。これにより、MCP に対応した他のエージェント（Claude Code、Cursor、Codex、その他の MCP クライアント）が Hermes のメッセージ機能を使えます。会話の一覧、履歴の読み取り、つないである全サービスへの送信です。

### こんなときに使う {#when-to-use-this}

- Claude Code や Cursor などのコーディングエージェントから、Hermes 経由で Telegram / Discord / Slack のメッセージを読み書きしたい
- Hermes につないだメッセージングサービス全部への橋渡しを、MCP サーバー 1 つで済ませたい
- すでにサービスをつないだ Hermes のゲートウェイを動かしている

### すぐに使い始める {#quick-start}

```bash
hermes mcp serve
```

これで stdio の MCP サーバーが立ち上がります。プロセスの管理は利用者ではなく MCP クライアント側が行います。

### MCP クライアント側の設定 {#mcp-client-configuration}

MCP クライアントの設定に Hermes を書き足します。たとえば Claude Code の `~/.claude/claude_desktop_config.json` ではこうなります。

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

特定の場所に Hermes を入れている場合はこうします。

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

この MCP サーバーは 10 個のツールを公開します。OpenClaw のチャンネルブリッジと同じ内容に、Hermes 独自のチャンネル閲覧を加えたものです。

| ツール | 説明 |
|------|-------------|
| `conversations_list` | 動いている会話を一覧します。サービスで絞ったり、名前で検索したりできます。 |
| `conversation_get` | セッションキーを指定して、1 つの会話の詳しい情報を取ります。 |
| `messages_read` | ある会話の最近のメッセージ履歴を読みます。 |
| `attachments_fetch` | 特定のメッセージから、文字以外の添付（画像、動画など）を取り出します。 |
| `events_poll` | ある位置以降に起きた会話の出来事を取りにいきます。 |
| `events_wait` | 次の出来事が来るまで待ちます（ほぼリアルタイム）。 |
| `messages_send` | サービスを指定してメッセージを送ります（`telegram:123456`、`discord:#general` など）。 |
| `channels_list` | 全サービスにまたがる送信先の候補を一覧します。 |
| `permissions_list_open` | この橋渡しのセッション中に見つかった、未処理の承認要求を一覧します。 |
| `permissions_respond` | 未処理の承認要求を許可するか拒否します。 |

### 出来事のしくみ {#event-system}

この MCP サーバーには、Hermes のセッションのデータベースを見て新しいメッセージを拾う、生きた橋渡しが組み込まれています。これにより MCP クライアントは、届いた会話をほぼリアルタイムに把握できます。

```
# Poll for new events (non-blocking)
events_poll(after_cursor=0)

# Wait for next event (blocks up to timeout)
events_wait(after_cursor=42, timeout_ms=30000)
```

出来事の種類は `message`、`approval_requested`、`approval_resolved` です。

出来事の待ち行列はメモリ上にあり、橋渡しがつながった時点から始まります。それより前のメッセージは `messages_read` から読めます。

### オプション {#options}

```bash
hermes mcp serve              # Normal mode
hermes mcp serve --verbose    # Debug logging on stderr
```

### どう動いているか {#how-it-works}

この MCP サーバーは、会話のデータを Hermes のセッション保管場所から直接読みます。主な取得元は `~/.hermes/state.db` で、`sessions.json` は旧来の予備として残っているだけです。裏で動くスレッドがデータベースを見て新しいメッセージを拾い、メモリ上の待ち行列を保ちます。送信には、定時配信や `hermes send` コマンドを支えているのと同じ内部の送信エンジン（`tools/send_message_tool.py`）を使います。

読み取りの操作（会話の一覧、履歴の読み取り、出来事の取得）にゲートウェイは要りません。送信の操作には要ります。各サービスへの接続が生きている必要があるためです。

### 現在の制限 {#current-limits}

- 組み込みの `hermes mcp serve` が公開するのは、今のところ **stdio だけ**の MCP サーバーです。HTTP の MCP サーバーが必要なら、別に中継を立ててください。もっとよくある形としては、Hermes の MCP **クライアント**側を使う手があります。こちらは stdio と HTTP の両方を話せます（`mcp_servers.yaml` / `config.yaml` の `url` と `headers`。上の [HTTP サーバー](#http-servers)を参照してください）。
- 出来事の取得は約 200ms 間隔で、更新時刻を見て無駄を省いたデータベースの走査によります（変わっていなければ何もしません）
- `claude/channel` のプッシュ通知プロトコルにはまだ対応していません
- 送信は文字だけです（`messages_send` で画像や添付は送れません）

## 関連ドキュメント {#related-docs}

- [Hermes で MCP を使う](/hermes/docs/guides/use-mcp-with-hermes/)
- [CLI コマンド](/hermes/docs/reference/cli-commands/)
- [スラッシュコマンド](/hermes/docs/reference/slash-commands/)
- [よくある質問](/hermes/docs/reference/faq/)
