---
title: "MCP 設定の早見表"
description: "Hermes Agent の MCP 設定キー、絞り込みの動き、ユーティリティツールの方針をまとめた早見表です。"
upstream_path: reference/mcp-config-reference.md
upstream_blob: 35bb31e64dc4758777fab04f94599349186df767
sources:
  - https://hermes-agent.nousresearch.com/docs/reference/mcp-config-reference
---

# MCP 設定の早見表 {#mcp-config-reference}

このページは、MCP の本編ドキュメントに対応する簡潔な早見表です。

考え方から知りたいときは、こちらをご覧ください。

- [MCP (Model Context Protocol)](/hermes/docs/user-guide/features/mcp/)
- [Hermes で MCP を使う](/hermes/docs/guides/use-mcp-with-hermes/)

## 設定全体のかたち {#root-config-shape}

```yaml
mcp_servers:
  <server_name>:
    command: "..."      # stdio servers
    args: []
    env: {}

    # OR
    url: "..."          # HTTP servers
    headers: {}

    # Optional HTTP/SSE TLS settings:
    ssl_verify: true                # bool or path to a CA bundle (PEM)
    client_cert: "/path/to/cert.pem"  # mTLS client certificate (see below)
    # client_key: "/path/to/key.pem"  # optional, when key lives in a separate file

    enabled: true
    timeout: 120
    connect_timeout: 60
    supports_parallel_tool_calls: false
    tools:
      include: []
      exclude: []
      resources: true
      prompts: true
```

## サーバーごとのキー {#server-keys}

| キー | 型 | 対象 | 意味 |
|---|---|---|---|
| `command` | 文字列 | stdio | 起動する実行ファイルです |
| `args` | リスト | stdio | 子プロセスに渡す引数です |
| `env` | マッピング | stdio | 子プロセスに渡す環境変数です |
| `url` | 文字列 | HTTP | 接続先の MCP エンドポイントです |
| `headers` | マッピング | HTTP | 遠隔サーバーへのリクエストに付けるヘッダーです |
| `ssl_verify` | 真偽値または文字列 | HTTP | TLS の検証方法です。`true`（既定）はシステムの CA を使い、`false` は検証をやめ（安全ではありません）、文字列を書くと独自の CA バンドル（PEM）のパスとして扱います |
| `client_cert` | 文字列またはリスト | HTTP | mTLS のクライアント証明書です。文字列なら証明書と鍵をまとめた PEM ファイルのパス、リスト `[cert, key]` なら別々のファイル、リスト `[cert, key, password]` なら暗号化された鍵を指します |
| `client_key` | 文字列 | HTTP | `client_cert` が文字列で、鍵が別のファイルにあるときのクライアント秘密鍵のパスです |
| `enabled` | 真偽値 | 両方 | false にすると、そのサーバーをまるごと飛ばします |
| `timeout` | 数値 | 両方 | ツール呼び出しの制限時間を秒で指定します（既定は `300`） |
| `connect_timeout` | 数値 | 両方 | 最初に接続するときの制限時間を秒で指定します（既定は `60`） |
| `protocol` | 文字列 | 両方 | どの世代のプロトコルで話すかの決め方です。`auto`（既定。まず従来の `initialize` のやりとりを試し、サーバーが新しい方式しか受け付けないと断ってきたら 2026-07-28 の `server/discover` によるステートレスな問い合わせに切り替えます）、`stateless`（先に `server/discover` を試し、従来方式は一度だけ再試行します）、`legacy`（従来のやりとりだけを使い、切り替えません）が選べます |
| `supports_parallel_tool_calls` | 真偽値 | 両方 | このサーバーのツールを同時に走らせてよいかどうかです |
| `skip_preflight` | 真偽値 | HTTP | HEAD/GET に MCP 以外の content type を返してくる、けれども Streamable HTTP としては正しいエンドポイント向けに、事前確認で即座に打ち切る動きを回避します（既定は `false`） |
| `transport` | 文字列 | HTTP | `sse` にすると、Streamable HTTP ではなく SSE で通信します |
| `keepalive_interval` | 数値 | 両方 | 生存確認の ping を送る間隔を秒で指定します（既定は `180`、下限は 5 秒）。使っていないセッションをすぐ片付けるサーバーでは、そのセッション有効期間より短くしてください |
| `idle_timeout_seconds` | 数値 | stdio | 一定時間使われなかった stdio サーバーを入れ替えるまでの秒数です（`0` で無効）。`lifecycle:` のマッピングの下に置くこともできます |
| `max_lifetime_seconds` | 数値 | stdio | 起動からの経過時間で stdio サーバーを入れ替えるまでの秒数です（`0` で無効）。`lifecycle:` のマッピングの下に置くこともできます |
| `tools` | マッピング | 両方 | 絞り込みと、ユーティリティツールの扱いを決めます |
| `auth` | 文字列 | HTTP | 認証の方法です。`oauth` にすると PKCE 付きの OAuth 2.1 を使います |
| `sampling` | マッピング | 両方 | サーバー側から LLM を呼びたいと言ってきたときの扱いです（MCP のガイドをご覧ください） |
| `elicitation` | マッピング | 両方 | サーバー側から利用者に入力を求めてきたときの扱いです。`enabled`（既定は `true`）と、秒で指定する `timeout`（既定は `300`）があります。フォーム形式の要求は承認の画面を通り、URL 形式は断ります（MCP のガイドをご覧ください） |
| `trust` | 文字列 | 両方 | 信頼の度合いです。`full`（既定）か `untrusted` を指定します。`untrusted` のサーバーでは、書き込みのできるツール呼び出し（`readOnlyHint: true` の注記が付いていないツールすべて）が、実行前に通常の承認画面で利用者の承認を求めます。`readOnlyHint` はサーバーが申告する*目安*にすぎません。嘘をつくサーバーにできるのは、読み取り専用だと偽ったツールの承認を省かせることまでで、それ以上の権限は得られません。自分で完全に管理していないサーバーは `untrusted` にしておいてください。知らない値が書かれていた場合は `untrusted` として扱います（安全側に倒します） |

## 環境変数の参照 {#environment-variable-references}

サーバーの設定に出てくる文字列は、どこであっても（`env`、`headers`、`args`、`url` など）`${VAR}` または Cursor 風の SecretRef 形式 `${env:VAR}` で環境変数を参照できます。どちらも同じ変数に解決されるので、Cursor や Claude の設定からコピーしてきた MCP の断片がそのまま動きます。

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "${env:GITHUB_TOKEN}"   # same as "${GITHUB_TOKEN}"
```

値は、いま使っているプロファイルの秘密情報の範囲から解決されます（見つからなければプロセスの環境変数を見ます）。ですので、秘密の値は `~/.hermes/.env` に置いてください。設定されていない変数は、書いたままの文字列として残ります。

### コンテキスト変数 {#context-variables}

環境変数だけでなく、Cursor 風のコンテキスト変数も差し込まれます（名前は大文字と小文字を区別します）。

| 変数 | 解決される先 |
|---|---|
| `${userHome}` | いまの利用者のホームディレクトリ |
| `${workspaceFolder}` | セッションの作業場所の起点（分かるならセッションの端末の作業ディレクトリ、分からなければプロセスの作業ディレクトリ） |
| `${workspaceFolderBasename}` | `${workspaceFolder}` の末尾の名前 |
| `${pathSeparator}` / `${/}` | OS のパス区切り文字（`os.sep`） |

```yaml
mcp_servers:
  filesystem:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "${workspaceFolder}"]
    env:
      CACHE_DIR: "${userHome}${/}.cache${/}mcp"
```

これ以外の `${...}` は、上で説明した環境変数の探索に回されます。

## `tools` の方針キー {#tools-policy-keys}

| キー | 型 | 意味 |
|---|---|---|
| `include` | 文字列またはリスト | サーバーが元から持つ MCP ツールを、ここに挙げたものだけ許可します。正確な名前のほか、fnmatch 形式のワイルドカード（`*_radar_*`、`get_zones_*`）も書けます |
| `exclude` | 文字列またはリスト | サーバーが元から持つ MCP ツールのうち、ここに挙げたものを外します。正確な名前とワイルドカードの扱いは `include` と同じです |
| `resources` | 真偽値相当 | `list_resources` と `read_resource` を使えるようにするかどうかです |
| `prompts` | 真偽値相当 | `list_prompts` と `get_prompt` を使えるようにするかどうかです |

## 絞り込みの動き {#filtering-semantics}

### `include` {#include}

`include` を書くと、サーバーが元から持つ MCP ツールのうち、そこに挙げたものだけが登録されます。

```yaml
tools:
  include: [create_issue, list_issues]
```

### `exclude` {#exclude}

`exclude` だけを書いて `include` を書かないと、そこに挙げた名前を除く、サーバーが元から持つ MCP ツールがすべて登録されます。

```yaml
tools:
  exclude: [delete_customer]
```

### どちらが優先されるか {#precedence}

両方を書いた場合は `include` が勝ちます。

```yaml
tools:
  include: [create_issue]
  exclude: [create_issue, delete_issue]
```

結果はこうなります。

- `create_issue` はそのまま使えます
- `delete_issue` は、`include` が優先されるので無視されます

## ユーティリティツールの方針 {#utility-tool-policy}

Hermes は、MCP サーバーごとに次のユーティリティの包みを登録することがあります。

リソース関連:

- `list_resources`
- `read_resource`

プロンプト関連:

- `list_prompts`
- `get_prompt`

### リソースを使わない {#disable-resources}

```yaml
tools:
  resources: false
```

### プロンプトを使わない {#disable-prompts}

```yaml
tools:
  prompts: false
```

### 能力に応じた登録 {#capability-aware-registration}

`resources: true` や `prompts: true` にしていても、Hermes がそのユーティリティツールを登録するのは、MCP のセッションが対応する能力を実際に備えているときだけです。

ですから、次のようなことは正常な動きです。

- プロンプトを使う設定にした
- でもプロンプト関連のツールが出てこない
- サーバーがプロンプトに対応していないから

## `enabled: false` {#enabled-false}

```yaml
mcp_servers:
  legacy:
    url: "https://mcp.legacy.internal"
    enabled: false
```

このときの動きです。

- 接続を試みません
- ツールの探索もしません
- ツールの登録もしません
- 設定はそのまま残るので、あとでまた使えます

## 結果が空になったとき {#empty-result-behavior}

絞り込みでサーバー本来のツールが一つも残らず、ユーティリティツールも登録されない場合、Hermes はそのサーバーのために空の MCP ツール群を作ることはしません。

## 設定の例 {#example-configs}

### GitHub を安全に許可する {#safe-github-allowlist}

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "***"
    tools:
      include: [list_issues, create_issue, update_issue, search_code]
      resources: false
      prompts: false
```

### Stripe で一部を外す {#stripe-blacklist}

```yaml
mcp_servers:
  stripe:
    url: "https://mcp.stripe.com"
    headers:
      Authorization: "Bearer ***"
    tools:
      exclude: [delete_customer, refund_payment]
```

### リソースだけのドキュメントサーバー {#resource-only-docs-server}

```yaml
mcp_servers:
  docs:
    url: "https://mcp.docs.example.com"
    tools:
      include: []
      resources: true
      prompts: false
```

### TLS のクライアント証明書（mTLS） {#tls-client-certificate-mtls}

クライアント証明書を求めてくる HTTP/SSE のサーバーには、`client_cert` を（必要なら `client_key` も）指定します。

```yaml
mcp_servers:
  # Combined cert + key in a single PEM file
  internal_api:
    url: "https://mcp.internal.example.com/mcp"
    client_cert: "~/secrets/mcp-client.pem"

  # Separate cert and key files
  partner_api:
    url: "https://mcp.partner.example.com/mcp"
    client_cert: "~/secrets/client.crt"
    client_key: "~/secrets/client.key"

  # Encrypted key with a passphrase (3-element list form)
  bank_api:
    url: "https://mcp.bank.example.com/mcp"
    client_cert: ["~/secrets/client.crt", "~/secrets/client.key", "my-passphrase"]

  # Custom CA bundle (private CA / self-signed server)
  lab_api:
    url: "https://mcp.lab.local/mcp"
    ssl_verify: "~/secrets/lab-ca.pem"
    client_cert: "~/secrets/lab-client.pem"
```

補足です。

- パスの `~` は展開されます。ファイルが見つからないときは、接続しようとした時点で、そのサーバーの名前を添えたエラーですぐ止まります。
- `ssl_verify: false` にすると、サーバー証明書の検証をまったくしなくなります。本番のサービスに対しては使わないでください。
- Streamable HTTP と SSE のどちらでも使えます。

## 設定を読み直す {#reloading-config}

MCP の設定を変えたあとは、次のコマンドでサーバーを読み直します。

```text
/reload-mcp
```

## ツールの名前の付き方 {#tool-naming}

サーバーが元から持つ MCP ツールは、次の名前になります。

```text
mcp__<server>__<tool>
```

例です。

- `mcp__github__create_issue`
- `mcp__filesystem__read_file`
- `mcp__my_api__query_data`

ユーティリティツールにも、同じ形で接頭辞が付きます。

- `mcp__<server>__list_resources`
- `mcp__<server>__read_resource`
- `mcp__<server>__list_prompts`
- `mcp__<server>__get_prompt`

アンダースコア 2 つの区切り（`mcp__…__…`）は Claude Code、Codex、OpenCode と同じ書き方で、サーバー名やツール名にアンダースコアが含まれていても、どこが境目なのかが分かるようにしています。

### 名前の整え方 {#name-sanitization}

サーバー名とツール名のどちらでも、英数字とアンダースコア以外の文字（ハイフン、ドット、空白など）は、登録の前にアンダースコアへ置き換えられます。こうしておくと、LLM の関数呼び出し API で使える名前になります。

たとえば `my-api` という名前のサーバーが `list-items.v2` というツールを公開している場合は、こうなります。

```text
mcp__my_api__list_items_v2
```

`include` や `exclude` を書くときは、この点にご注意ください。置き換えたあとの名前ではなく、**元の** MCP ツール名（ハイフンやドットの付いたもの）を書きます。

## OAuth 2.1 の認証 {#oauth-21-authentication}

OAuth を必要とする HTTP サーバーには、そのサーバーの設定に `auth: oauth` を書きます。

```yaml
mcp_servers:
  protected_api:
    url: "https://mcp.example.com/mcp"
    auth: oauth
```

このときの動きです。

- Hermes は MCP SDK の OAuth 2.1 PKCE の流れ（メタデータの探索、クライアントの識別、トークンの取得、更新）を使います
- 最初に接続するとき、承認のためにブラウザーの画面が開きます
- トークンは `~/.hermes/mcp-tokens/<server>.json` に保存され、次のセッションでも使い回されます
- トークンの更新は自動です。更新に失敗したときだけ、もう一度承認を求めます
- HTTP/StreamableHTTP でつなぐサーバー（`url` を書いたもの）だけが対象です

### クライアントの識別: CIMD と DCR {#client-identification-cimd-and-dcr}

Hermes は自分が何者かを認可サーバーに伝えるのに、**Client ID Metadata Document**（CIMD）を使います。これは MCP の `2026-07-28` 版の仕様が、動的クライアント登録（DCR）に代えて採り入れた仕組みです。この文書は
`https://nousresearch.github.io/hermes-agent/docs/oauth/client-metadata.json` に置かれていて、この URL 自体が `client_id` になります。認可サーバーはこれを取得して、Hermes の名前、ロゴ、許可されたリダイレクト先を知ります。インストールごとに何かを登録することはありませんし、利用者ごとの情報も含みません。

最後に決めるのは認可サーバーです。SDK がこの文書の URL を `client_id` として送るのは、サーバーがメタデータで `client_id_metadata_document_supported: true` を掲げているときだけで、そうでなければ従来どおり DCR で登録します。DCR は MCP の仕様では非推奨になりましたが、いま動いているサーバーのほとんどは今も DCR を使っています。

#### コールバックのポート {#callback-ports}

この文書には、ループバックのリダイレクト先が決まった組み合わせで書かれています。仕様では、認可のリクエストに載せるリダイレクト先がそのどれかと*文字列として完全に一致*していなければならないので、CIMD の流れでは Hermes がふだん選ぶ、その場限りの大きい番号のポートは使えません。そこで Hermes は、コールバックを `27890`〜`27894` のどれかに固定します。

この固定は、サーバーが何に対応しているか分かる前に決めなければなりません。リダイレクト先は流れの最初に決まるのに、サーバーのメタデータが届くのは途中だからです。ですので Hermes は、CIMD を使う*可能性のある*流れではポートを固定し、それ以外ではその場限りのポートに戻します。

- 一度つないだことがあり、保存されたメタデータに CIMD が書かれていないサーバーは、これまでどおりその場限りのポートを使います。
- Hermes が一度もつないだことのないサーバーは、その初回ログインで固定のポートを使います。当てにいくしか CIMD を使う道がないからです。
- コールバックの場所が変わる要素があると、その場限りのポートに戻ります。あらかじめ登録した `oauth.client_id`、`oauth.client_secret`、独自の `oauth.client_name` や `oauth.token_endpoint_auth_method`、`oauth.redirect_uri` や `oauth.redirect_port` の上書き、ダッシュボードやデスクトップからのログイン、ディスクに残っているクライアント登録、そして 5 つのポートすべてが他のプロセスに使われている場合です。

固定したポートは、決まった時点ですぐ確保され、ブラウザーからのリダイレクトが届くまで押さえたままになります。ですので、同時に 2 つのログイン（別のプロファイルや、同じプロセス内の別のサーバー）が走っても、同じ待ち受け口に重なることはありません。

#### サーバーが文書を受け付けないとき {#when-a-server-rejects-the-document}

サーバーが文書を取得したうえで、*トークン*のエンドポイントで断ってきた場合（`invalid_client`）、Hermes はその拒否を記録に残し、`~/.hermes/mcp-tokens/<server>.cimd-off` に書き留めて、そのサーバーには以後 DCR を使います。

文書をそもそも取得できない、あるいは検証できないサーバーの場合は、リダイレクトが起きる前に*認可*のエンドポイントで止まります。そこには Hermes が観測できる手がかりがないので、ブラウザーには invalid-client のエラーが出て、ログインは 5 分で時間切れになります。時間切れのメッセージはその文書の名前を挙げ、`cimd: false` を指し示します。`hermes mcp login <server>` を実行すると記録した拒否が消えるので、文書を直せばもう一度試せます。

#### サーバーごとに書ける任意のキー {#optional-per-server-keys}

```yaml
mcp_servers:
  protected_api:
    url: "https://mcp.example.com/mcp"
    auth: oauth
    oauth:
      client_metadata_url: "https://example.com/my-cimd.json"  # self-hosted document
      cimd: false                                              # force DCR
      user_agent: "My-MCP-Client/1.0"                          # token-request User-Agent
```

`client_metadata_url` は、パスの付いた HTTPS の URL でなければなりません（オリジンだけ、フラグメント付き、ユーザー情報付き、`.` や `..` を含むものは使えません）。そのうえで **リダイレクトなしで** `200` と `Content-Type: application/json` を返す必要があります。認可サーバーは、この文書を取りにいくときにリダイレクトをたどることを禁じられているからです。Hermes はこの場合もコールバックを同じ `27890`〜`27894` の範囲に固定するので、自分で用意する文書には 10 個のループバック URL（各ポートについて `http://127.0.0.1:<port>/callback` と `http://localhost:<port>/callback`）をすべて書き、`client_id` にはその文書自身の URL を書いてください。

`user_agent` は、HTTP ライブラリが既定で送る `User-Agent` を **トークンのエンドポイントへのリクエストに限って**（認可コードの引き換えと更新）差し替えます。認可サーバーや WAF の中には、そこで既定の `python-httpx/...` という値を拒むものがあるためです。MCP の通信や OAuth の探索には使われませんし、トークンのリクエストで設定できるヘッダーは他にありません。空の値や null は無視されます。

## Add to Hermes のリンク {#add-to-hermes-link}

MCP を提供する側やそのドキュメントでは、Hermes のデスクトップアプリを開いてサーバーの設定をあらかじめ入れておく、ワンクリックの **「Add to Hermes」** ボタンを置けます。Cursor の `cursor://anysphere.cursor-deeplink/mcp/install` と同じ考え方です。

```text
hermes://mcp/install?name=NAME&config=BASE64
```

- `name` — サーバーの名前です。`^[A-Za-z0-9._-]{1,64}$` に合っている必要があります。
- `config` — サーバー設定のオブジェクトを **base64url で符号化した JSON** です（普通の base64 も受け付けます）。復号した JSON はオブジェクトで、文字列の `url`（`http://` か `https://` のみ）か文字列の `command` のどちらかを持っている必要があり、上で説明したサーバーのキーはどれでも書けます。32KB を超えるものは受け付けません。

例です（JavaScript）。

```js
const config = { url: 'https://mcp.example.com/mcp' }
const link = `hermes://mcp/install?name=example&config=${btoa(JSON.stringify(config))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`
```

リンクを開いただけで何かが入ることはありません。デスクトップアプリは、サーバーの名前と、整形した設定の全文を確認の画面に出し（`command` を使うサーバーは手元でプロセスを動かすので、追加の注意も添えます）、利用者がはっきり承認しないと進みません。すでにある名前が上書きされることもなく、名前を変えるか取りやめるかを尋ねます。
