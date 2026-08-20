---
title: "Mcp Oauth Remote Gateway — 画面のないゲートウェイで、リモートの MCP サーバーの OAuth を手作業で通す"
description: "画面のないゲートウェイで、リモートの MCP サーバーの OAuth を手作業で通す"
upstream_path: user-guide/skills/optional/mcp/mcp-mcp-oauth-remote-gateway.md
upstream_blob: 935382b96fc70858a3e54ac203efc4dfee307950
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/mcp/mcp-mcp-oauth-remote-gateway
---

# Mcp Oauth Remote Gateway {#mcp-oauth-remote-gateway}

画面のないゲートウェイで、リモートの MCP サーバーの OAuth を手作業で通します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/mcp/mcp-oauth-remote-gateway` で入れます |
| パス | `optional-skills/mcp/mcp-oauth-remote-gateway` |
| バージョン | `1.0.0` |
| 作者 | Ben Barclay (benbarclay), Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos |
| タグ | `MCP`, `OAuth`, `PKCE`, `Remote-Deployment` |
| 関連 skill | [`hermes-agent`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-hermes-agent/), [`mcporter`](/hermes/docs/user-guide/skills/optional/mcp/mcp-mcporter/), [`fastmcp`](/hermes/docs/user-guide/skills/optional/mcp/mcp-fastmcp/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# MCP OAuth on a Remote Hermes Gateway {#mcp-oauth-on-a-remote-hermes-gateway}

## 概要 {#overview}

Hermes に組み込まれている MCP の OAuth クライアントは、Hermes のプロセスの中で
`127.0.0.1:<port>` に一度きりの HTTP の受け口を立て、そのループバックアドレスを OAuth の
`redirect_uri` として登録します。手元の端末で CLI として動かすぶんには、これで何の問題も
ありません。ところが Hermes をリモートのゲートウェイ（コンテナ、VPS、チャットのボット）として
動かすと、まったく機能しなくなります。利用者のブラウザから見た `127.0.0.1` は、リモートの
コンテナではなく自分のノートパソコンを指すので、認可コードが Hermes まで届かないのです。

この skill では OAuth のやりとりを手作業でこなし、得られたトークンを Hermes のトークン保存先が
期待するとおりのファイルに書き込みます。こうしておけば、あとで `/reload-mcp` を実行したときに
保存済みのトークンが見つかり、ブラウザを使う手順をまるごと飛ばせます。

## いつ使うか {#when-to-use}

次が**すべて**当てはまるときに、この skill を使います。

1. OAuth を必要とする（固定の Bearer トークンではない）リモートの HTTP MCP サーバーを足したい。
2. Hermes が**リモートのゲートウェイ**（コンテナ、VPS、Docker、マネージドサービス）として動いている。手元のノートパソコンで CLI として動かしているのではない。
3. そのサーバーが PKCE 付きの OAuth 2.1 と、RFC 7591 の動的クライアント登録（DCR）に対応している。最近の MCP サーバーはたいてい対応しています（Better Stack、Linear、Cloudflare、Datadog など）。DCR に対応していない場合（有名な例外は GitHub です）この skill は使えません。あらかじめ登録した OAuth アプリか、パーソナルアクセストークンを使ってください。

次の場合には使わないでください。

- **手元の CLI で動かしている Hermes** — `mcp_servers.<name>` に `auth: oauth` を書いて `/reload-mcp` するだけです。組み込みの流れがブラウザを開き、localhost でコールバックを受け取ります。何の問題もなく動きます。
- **固定の Bearer トークン（API キー）を受け付けるサーバー** — 利用者が構わないなら、いつでも `headers.Authorization: "Bearer <token>"` を選んでください。単純で、更新のやりとりも要りません。
- **GitHub Copilot MCP**（`api.githubcopilot.com/mcp/`） — GitHub は DCR を公開していません。PAT か、あらかじめ登録した OAuth アプリを使ってください（つまずきやすいところの 12 番を参照）。

## リモートのゲートウェイで組み込みの OAuth がうまくいかない理由 {#why-the-built-in-oauth-flow-fails-on-a-remote-gateway}

Hermes に組み込まれている MCP の OAuth クライアント（`tools/mcp_oauth.py`）はこう動きます。

1. 空いているローカルのポート `P` を選びます。
2. 認可サーバーに動的な OAuth クライアントを登録し、`redirect_uri = http://127.0.0.1:P/callback` を送ります。
3. **Hermes のプロセスの中で** `127.0.0.1:P` に HTTP サーバーを立てます。
4. 認可用の URL を表示し、自分のエンドポイントにコードが届くのを待ちます。

Hermes がリモートで動いていると、`redirect_uri` の `127.0.0.1` はリモートのコンテナのループバックを
指していて、利用者の端末ではありません。認可を終えると利用者のブラウザは
`http://127.0.0.1:P/callback?code=...` へ 302 で飛ばされますが、これは自分のノートパソコンを指すので
つながりません。コールバックが Hermes のプロセスに届かないまま時間切れになり、`/reload-mcp` は
理由を示さないまま「No MCP tools available」と返します。

見分けるための兆候はこうです。hermes ユーザーの下に `[xdg-open] <defunct>` のプロセスが残る、
トークンのディレクトリ（`$HERMES_HOME/mcp-tokens/`）が空か存在しない、そしてリロードの
`change_detail` に「Added/Reconnected: X」の行がまったく出ない。

## まず試したい安上がりな手: 組み込みの流れが用意している逃げ道 {#cheap-first-fallbacks-the-built-in-flows-own-escape-hatches}

トークンのファイルを手で書き換える前に、組み込みの流れが用意している逃げ道でこの環境を
まかなえないか確かめてください。Hermes はリモートのセッションだと判断すると、認可用の URL と
一緒に 2 つの選択肢を表示します（`tools/mcp_oauth.py`）。

1. **URL を貼り戻す** — 対話的な TTY があれば、標準入力からの読み取りが HTTP の受け口と並んで
   走ります。利用者が認可すると、ブラウザは `127.0.0.1:<port>` につながらずに失敗するので、
   アドレスバーの URL 全体（`?code=...&state=...` を含みます）をプロンプトに貼り戻してもらいます。
   SSH でログインした CLI のセッションならこれで足ります。
2. **SSH のポート転送** — `ssh -N -L <port>:127.0.0.1:<port> <user>@<host>` としておけば、
   リダイレクト先がそのままリモートの受け口に届きます。

どちらも Hermes が動いているホストへの対話的な端末が要ります。この skill の残りは、対話的な
TTY が**まったくない**場合のためのものです。つまり Hermes がチャットのゲートウェイやボットとして
だけ動いていて、`/reload-mcp` を叩いても誰もプロンプトの前にいない、という状況です。

## まず開けたい正面玄関: Hermes のダッシュボード（トークンを手で書く前にこちらを試してください） {#preferred-front-door-the-hermes-dashboard-try-this-before-manual-token-surgery}

リモートの Hermes ゲートウェイでは、**ダッシュボード**の Web UI が別のプロセスとして一緒に
動いていることがよくあります（たとえば `hermes dashboard --host 0.0.0.0 --port <port>`。
`ps aux | grep 'hermes dashboard'` で確かめられます）。ここにはコネクタ / MCP の管理画面があり、
`/api/mcp/servers`、`/api/mcp/status`、`/connectors` といったエンドポイントが用意されています
（どれもログインが必要です。cookie なしの curl が 401 や 302 を返せば、存在している証拠になります）。

**ダッシュボードが根っこの問題を解決してくれる理由:** 利用者が*自分のブラウザから*ダッシュボード
経由で OAuth を進めると、リダイレクト先がダッシュボードの受け取れる場所に着地します。CLI や
手作業の流れを壊していた `127.0.0.1` へのコールバックの問題を回避できるわけです。ですから
「リモートのゲートウェイで OAuth の MCP サーバーを足す、または認証をやり直す」ときの順番は
こうなります。

1. **利用者のブラウザからダッシュボードを開く** — これが本来の正面玄関です。サーバーの追加も、OAuth も、リロードも、利用者としてログインした状態でひととおりできます。コールバックの URL を貼り戻す手間も、トークンのファイルを手で書く手間も要りません。
2. **トークンを手で書く（この skill の残り）** — ダッシュボードをブラウザで開けない場合（チャットだけ、あるいは画面のない環境）の代わりの手です。

**ダッシュボードの外から見える URL を調べる。** ダッシュボードは内部的には `0.0.0.0:<port>` を
使いますが、利用者に必要なのは外からつながる URL です。たいていの実行環境はそれを環境変数に
入れてくれているので、利用者に探させずにこちらで拾います。

```bash
env | grep -iE "HERMES_DASHBOARD_PUBLIC_URL|RAILWAY_PUBLIC_DOMAIN|RAILWAY_STATIC_URL|RAILWAY_SERVICE_.*_URL|PUBLIC_URL|BASE_URL|DOMAIN" \
  | sed -E 's/(TOKEN|SECRET|KEY|PASSWORD)=.*/\1=***REDACTED***/I'
```

`HERMES_DASHBOARD_PUBLIC_URL` があれば、それがいちばん確かです。Railway なら
`RAILWAY_PUBLIC_DOMAIN` / `RAILWAY_STATIC_URL`（`*.up.railway.app` のホスト名）と、
独自ドメインが入っていることもある `RAILWAY_SERVICE_*_URL` も見てください。
`https://` から始まる URL 全体を利用者に渡し、Connectors / MCP の画面を案内します。
この環境変数の並びには `*_TOKEN` や `*_SECRET` も混ざっているので、上の `sed` による伏せ字を
必ず通してください。

**ダッシュボードでも解決しないもの（ホスト側やシェルの作業が残ります）:** シェル側の認証情報が
必要な stdio のサーバー（CLI の `login` コマンドを使うもので、再起動をまたいで認証情報が残るとは
かぎりません）と、`$HERMES_HOME/.env` から認証情報を読むもの。これらはダッシュボードの
守備範囲の外です。

## 回避のしかた {#the-workaround}

OAuth のやりとりを手作業でこなし、得られたトークンを Hermes の `HermesTokenStorage` が
書いたはずのファイルにそのまま書き込みます。そうすれば `/reload-mcp` のときに保存済みの
トークンが見つかり、ブラウザを使う手順をまるごと飛ばせます。

以下のシェルのコマンドはゲートウェイのホスト上で `terminal` ツールから実行し、Python の手順
（PKCE の生成、トークンの交換、ファイルの書き込み）は `execute_code` か `terminal` からの
python3 の呼び出しで行ってください。ファイルの書き込みは、トークンの交換と**同じコードブロックの中**で
やる必要があります（つまずきやすいところの 16 番を参照）。

### 1. リモートのゲートウェイかどうかを確かめる {#1-confirm-its-a-remote-gateway}

```bash
env | grep -iE "HERMES|RAILWAY|CONTAINER"
echo "$DISPLAY $WAYLAND_DISPLAY $SSH_CLIENT"
```

ディスプレイがなく、リモートを示す手がかりがあれば、リモートのゲートウェイです。
`tools/mcp_oauth.py::_can_open_browser()` も同じ環境変数を見ているので、Hermes 自身の判定が
「画面なし」と言うなら、組み込みの流れは動きません。

### 2. HERMES_HOME と設定ファイルの場所を調べる {#2-find-hermeshome-and-the-config-path}

```bash
HERMES_HOME=$(python3 -c 'from hermes_constants import get_hermes_home; print(get_hermes_home())')
echo "config: $HERMES_HOME/config.yaml"
echo "tokens: $HERMES_HOME/mcp-tokens/"
```

### 3. MCP サーバーから OAuth の情報を調べる {#3-discover-oauth-metadata-from-the-mcp-server}

MCP サーバーは RFC 9728（OAuth 2.0 Protected Resource Metadata）で OAuth の設定を公開しています。
401 のときに返る `WWW-Authenticate` ヘッダーに、どこを見ればよいかが書いてあります。

```bash
curl -sI https://mcp.example.com | grep -i www-authenticate
# → Bearer realm="mcp", resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource"
```

**`WWW-Authenticate` を返さないサーバーもあります。** 認証の手がかりが何もない
`{"errors":["Unauthorized"]}` だけの 401 が返ることもあります。そのときは、よく使われるパスを
直接叩いてみてください。

```bash
for p in \
  /.well-known/oauth-protected-resource \
  /.well-known/oauth-authorization-server \
  /.well-known/openid-configuration ; do
  echo "=== $p ==="
  curl -s -A "python-httpx/0.27" "https://mcp.example.com$p" | head -c 400; echo
done
```

リソースの情報を取って `authorization_servers` を調べ、続いて認可サーバーの
`/.well-known/oauth-authorization-server` を取って `authorization_endpoint`、
`token_endpoint`、`registration_endpoint` を手に入れます。

つまずきやすいところ: 多くのサーバーは Cloudflare の後ろにいて、素の `urllib` のユーザーエージェントを
403 で弾きます。この流れで送るリクエストには必ず `User-Agent: python-httpx/0.27`（か、それに似たもの）を
付けてください。

### 4. 動的クライアント登録（RFC 7591） {#4-dynamic-client-registration-rfc-7591}

`registration_endpoint` に、次の内容を POST します。

```json
{
  "client_name": "Hermes Agent (manual OAuth)",
  "redirect_uris": ["http://127.0.0.1:8765/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none",
  "scope": "<scopes_from_resource_metadata>"
}
```

認可サーバーの `scopes_supported` が空なら、`scope` はまるごと省いてください（手順 5 の
注意を参照）。ポートは `8765` でも何番でも構いません。どうせ誰も待ち受けません。
`token_endpoint_auth_method: none` は、これが PKCE を使う公開クライアントだという指定です。
返ってきた `client_id` は控えておきます。

### 5. PKCE 付きの認可用 URL を組み立てる {#5-build-the-authorize-url-with-pkce}

次の値を作ります。

- `code_verifier`: `secrets.token_urlsafe(64)[:128]`
- `code_challenge`: `base64url(sha256(code_verifier))`（パディングなし）
- `state`: `secrets.token_urlsafe(24)`

クエリの引数は `response_type=code`、`client_id`、`redirect_uri`、`code_challenge`、
`code_challenge_method=S256`、`state`、それに `resource=<mcp_server_url>`（RFC 8707。
トークンを特定の MCP リソースに結びつけるため、これを必須にしているサーバーが多くあります）です。
`scope=<space-separated>` を入れるのは、認可サーバーの `scopes_supported` が空でない配列の場合か、
リソースの情報が具体的なスコープを示している場合**だけ**にしてください。`scopes_supported: []` なら
`scope` の引数は省きます。サーバーが自分の既定のスコープ一式を渡してくれます。空の
`scopes_supported` に対してスコープ名をでっち上げると、認可サーバーによっては `invalid_scope` の
エラーになります。

**`code_verifier` と `state` はディスクに残しておいてください**（たとえば `/tmp/.mcp-oauth-work/<server>.json`、
パーミッションは 0600）。手順 7 で必要になりますし、やりとりが何回かにまたがることもあります。

### 6. 認可用の URL を利用者に渡す {#6-give-the-user-the-authorize-url}

```
Open this URL in your browser:
<authorize_url>

After approving, your browser will try to load http://127.0.0.1:8765/callback
and fail to connect — THAT'S EXPECTED. Just copy the entire URL from the
address bar (it will contain ?code=...&state=...) and paste it back here.
```

### 7. コードをトークンに交換する {#7-exchange-the-code-for-tokens}

利用者がコールバックの URL を貼ってくれたら、こうします。

1. クエリ文字列から `code` と `state` を取り出します。
2. **`state` が控えておいた値と一致するか確かめます**（CSRF の確認です。省かないでください）。
3. `token_endpoint` に `application/x-www-form-urlencoded` で POST します。
   - `grant_type=authorization_code`
   - `code=<from callback>`
   - `redirect_uri=<same as step 4>`
   - `client_id=<from step 4>`
   - `code_verifier=<stashed>`
   - `resource=<mcp_server_url>`（手順 5 で認可サーバーが要求していたなら、ここにも入れます）
4. 返答には `access_token`、`refresh_token`、`token_type`、`expires_in`、`scope` が入っています。

### 8. Hermes が期待する形でトークンを書き込む {#8-write-tokens-in-hermes-exact-schema}

`tools/mcp_oauth.py::HermesTokenStorage` は `$HERMES_HOME/mcp-tokens/` の下に 2 つのファイルが
あることを前提にしています（ディレクトリは `0o700`、ファイルは `0o600` で作ります）。

**`<server_name>.json`** — `OAuthToken` の pydantic モデルです。
```json
{
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 7200,
  "refresh_token": "...",
  "scope": "read write"
}
```

**`<server_name>.client.json`** — `OAuthClientInformationFull` のモデルです。
```json
{
  "client_id": "...",
  "redirect_uris": ["http://127.0.0.1:8765/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none",
  "scope": "read write",
  "client_name": "..."
}
```

どちらのファイルも `json.dumps(..., indent=2)` で書きます。ファイル名は
`re.sub(r'[^\w\-]', '_', server_name)[:128]` で整えてください。これは Hermes のトークン保存側の
`_safe_filename()` と同じ処理です。

### 9. config.yaml にサーバーを足す {#9-add-the-server-to-configyaml}

```yaml
mcp_servers:
  <name>:
    url: "https://mcp.example.com"
    auth: oauth
    timeout: 180
    connect_timeout: 60
```

### 10. リロードを頼む前に、トークンが通るか試す {#10-smoke-test-the-token-before-asking-the-user-to-reload}

MCP の `initialize` リクエストを手で POST して、トークンが端から端まで通ることを確かめます。
こうしておけば、スコープの設定ミス、`resource` の値の間違い、Cloudflare による遮断を、
利用者がまた「No MCP tools available」に戸惑う前に見つけられます。

```python
body = json.dumps({
    "jsonrpc": "2.0", "id": 1, "method": "initialize",
    "params": {
        "protocolVersion": "2025-06-18",
        "capabilities": {},
        "clientInfo": {"name": "hermes-debug", "version": "1.0"},
    },
}).encode()
# POST to the MCP URL with:
#   Authorization: Bearer <access_token>
#   Accept: application/json, text/event-stream
#   Content-Type: application/json
#   MCP-Protocol-Version: 2025-06-18
#   User-Agent: python-httpx/0.27
```

HTTP 200 が返り、`Content-Type: text/event-stream` で、`serverInfo` と `capabilities` を含む
JSON-RPC の結果が来るはずです。**`urllib` を既定のユーザーエージェントのまま使わないでください**。
Hermes は httpx を使うので通るのに、こちらだけ Cloudflare に 403 で弾かれます。
`scripts/diagnose-oauth-mcp.py` がこの確認を自動でやってくれます。

### 11. 利用者に `/reload-mcp` を実行してもらう {#11-tell-the-user-to-run-reload-mcp}

リロードすると Hermes は `auth: oauth` を見て `HermesTokenStorage.get_tokens()` を呼び、
書き込んでおいたトークンを見つけ、ブラウザを使う手順を飛ばして `mcp_<name>_*` のツールを
登録します。更新は `expires_in` が切れる前に自動で行われます。

## つまずきやすいところと学んだこと {#pitfalls-lessons-learned}

1. **「画面がない = OAuth は無理」と決めつけないでください。** 手元の CLI なら組み込みの流れで問題なく動きます。問題になるのは、利用者のブラウザと Hermes のプロセスが別の端末にあるリモートの構成だけです。OAuth は使えないと言い切る前に、動いている環境を確かめてください。

2. **skill の説明だけでなく、ソースを読んでください。** `tools/mcp_oauth.py` と `website/docs/` にある MCP の設定資料が拠りどころです。「その機能はありません」と伝える前に、ソースツリーを grep してください。

3. **Cloudflare がユーザーエージェントで弾きます。** MCP や OAuth の提供元の多くは Cloudflare を前に置いていて、公開されているはずの情報用エンドポイントでも `python-urllib/*` のユーザーエージェントを 403 で弾きます。この流れのすべてのリクエストに `User-Agent: python-httpx/0.27`（かブラウザらしい文字列）を付けてください。Hermes 自体は httpx を使うので、実際の接続では問題になりません。

4. **`resource` は認可のときもトークン取得のときも入れてください。** RFC 8707 のリソース指定は、いまどきの MCP サーバーではほぼ必須です。発行されたトークンを、その MCP リソースの URL に結びつける役割があります。省いても通ることはありますが、あとで MCP サーバー側がスコープや対象の食い違いでそのトークンを拒むことがあります。

5. **末尾のスラッシュが効きます。** リソースを `https://mcp.example.com/` と末尾のスラッシュ付きで公開していて、スラッシュなしで発行されたトークンを拒むサーバーがあります。`resource` の値は `.well-known/oauth-protected-resource` の返答からそのまま写してください。

6. **`/reload-mcp` は失敗を教えてくれません。** リロードが `change_detail` の行なしに「No MCP tools available」と出たら、設定にはあるのに接続できなかったサーバーがあって、エラーが表に出ていない状態です。エラーログを追い、`initialize` を手で POST してトークンを直接試し、それでも問題がなさそうならプロセスをまるごと再起動してもらってください。

7. **サーキットブレーカーは `/reload-mcp` をまたいで残ることがあります。** `tools/mcp_tool.py` はモジュールの階層でエラーの回数を数えていて、しきい値は小さめです。いったん作動すると（たとえばトークンが切れて連続で失敗したあとなど）、サーバーを呼ぶ前にツールの処理が打ち切られるので、成功した呼び出しでカウンタが戻ることもありません。症状としては、リロードは「Reconnected: X」と言うのに、同じ会話の中で呼び出すと「server unreachable」で失敗し続けます。まずは `/reload-mcp` を試してください（安上がりで、チャットのプロセスも途切れません）。最近のビルドならこれでカウンタが消えます。リロード後に実際に呼び出してもまだ打ち切られるときにだけ、ゲートウェイのプロセスの再起動に進みます。いきなり「再起動が必要です」と言わないでください。

8. **access_token が切れていて、なおかつブレーカーが作動していると、身動きが取れなくなります。** 自動更新の処理は MCP の呼び出し経路の中にあり、ブレーカーが作動しているとその経路ごと打ち切られます。ディスク上のトークンを手で更新するだけでは足りません。手作業での更新と、`/reload-mcp` ではなくプロセスのまるごと再起動を組み合わせてください。

9. **手作業の更新で `invalid_grant` が返ったら、リフレッシュトークンは死んでいます。認証をやり直すしかないので、繰り返さないでください。** access_token が切れてから時間が経つと、refresh_token のほうもサーバー側で失効・破棄されていることがあります。その状態で `grant_type=refresh_token` を POST すると、HTTP 400 で `{"error":"invalid_grant",...}` が返ります（文言は「Grant not found」「Token expired」「refresh token is invalid」などまちまちです）。ゲートウェイ側でできることは何もありません。利用者に 2 つの選択肢を渡してください。(a) 手順 3〜10 の手作業の OAuth をやり直す、(b) その提供元が固定のパーソナル API キーを出しているなら、そちらに切り替える（更新や期限の周期がなくなるので、人の手が入らないリモートのゲートウェイには向いています）。早めに見つけるには、OAuth の MCP に対して作成や更新の操作をする前に `expires_at` を `time.time()` と比べ、すでに切れていれば先に更新を試み、`invalid_grant` ならその場で伝えてください。作業の途中で失敗するより親切です。

10. **更新に成功したのにトークンが拒まれるなら、サーバー側でセッションが破棄されています。認可コードの流れをやり直すしかありません。** 9 番とは別の話です。トークンのファイルは健全に見える（`expires_at` にまだ余裕があり、refresh_token もある）のに、`initialize` を実際に POST すると `401 invalid_token` が返り、JSON-RPC の本文が `{"error":{"code":-32002,"message":"Session expired. Please re-authenticate."}}` になっていることがあります。`grant_type=refresh_token` の POST は**成功する**（HTTP 200、新しい access_token が返る）のに、その新しいトークンでも同じ `-32002` が出ます。提供元が MCP の*セッション*そのものをサーバー側で破棄したので、OAuth の更新で資格情報を作り直せても、破棄されたセッションは戻せません。OAuth の MCP サーバーが「つながっていない」と言ってきたときの判断はこうします。(1) 保存してある access_token を、`initialize` を手で POST して試す。(2) `401 invalid_token` なら更新を試み、新しいトークンで同じ確認をする。(3a) 新しいトークンが通る → それを書き込み、再起動してブレーカーを消す。(3b) 新しいトークンでも `-32002` や「Session expired」が出る → ここで止めます。セッションの破棄なので、認可用の URL を渡して認証をやり直してもらいます。`scripts/diagnose-oauth-mcp.py` は (1) と (2) を自動でやり、いまどの枝にいるかを表示します。セッションが繰り返し破棄される、人の手が入らないゲートウェイなら、固定のパーソナル API キーのほうが向いています。毎週セッションを破棄する提供元の実例は `references/stripe-mcp-oauth-revocation.md` にまとめてあります。

11. **クライアント情報のファイルは省けません。** Hermes は更新のときに使う `client_id` を知るために `<server>.client.json` を必要とします。これを飛ばすと最初の更新で失敗し、利用者は認証をやり直すはめになります。2 つのファイルを両方書くことが、この skill のいちばんの目的です。

12. **利用者に開いてもらう URL を手で打たないでください。** 認可用の URL は `urllib.parse.urlencode()` でプログラムから組み立てます。スコープに含まれる空白や `state` の特殊文字が、文字列をつなげただけの URL を壊します。

13. **安全のために: 控えておいたファイルには `code_verifier` が入っています。** トークンの交換に成功したら、`/tmp/.mcp-oauth-work/<server>.json` はすぐ消してください。使い終わった本人確認の秘密を残しておく理由はありません。

14. **トークンのエンドポイントが実際に返した内容を書いてください。** 認可サーバーは、頼んだより狭い（あるいは広い）スコープを渡してくることがあります。`<server>.json` に書くのは、手順 5 で頼んだものではなく、トークン交換の返答にあった `scope` です。`scopes_supported: []` の場合、こちらが送るスコープの一覧が両方向で決め手になります。指定したとおりに渡すサーバーもあれば（必要最小限で通したいなら狭く、全部要るなら列挙します）、登録の時点では渡したスコープを返してこないサーバーもあります。頼りになるのはトークン交換の返答だけです。

15. **OAuth のトークンは、その提供元の公開 REST API に対する Bearer トークンとしても使えることがよくあります。** `<server>.json` の access_token は「MCP 専用」ではないことが多く、対応するリソースのスコープさえ通っていれば、提供元の REST API に `Authorization: Bearer <token>` を付けて叩けます。これは提供元ごとの癖ではなく、OAuth 2.0 の仕様どおりの動きです。MCP サーバーが読み取り専用なのに書き込みの操作が必要なときは、別の API キーをすすめる前に、その OAuth のトークンで REST API を直接叩けないか確かめてください。

16. **秘密の伏せ字がトークンを隠してしまうことがあります。** 伏せ字の機能が有効だと、トークンや長い不透明な文字列はツールの出力で `***` になるので、`print(response)` してもやりとりをまたいで access_token を持ち越せません。しかも authorization_code で渡される `code` は一度きりしか使えないので、トークン交換の返答を表示してしまうと、トークンを失ったうえにコードも消費し、認可用の URL を取り直して最初からやり直しになります。**access_token は、トークンの交換を行うのと同じコードブロックの中で、最終的な保存先のファイルに直接書き込んでください。** どうしても表示して確かめたいなら、`len(access_token)`、`token_type`、`scope`、`expires_in` だけにして、秘密そのものは絶対に出さないでください。

17. **GitHub MCP（`api.githubcopilot.com/mcp/`）は、DCR と PKCE の公開クライアントではなく、あらかじめ登録された秘密クライアントの OAuth アプリを使います。** クライアント情報には実際の `client_secret` が含まれ、`token_endpoint_auth_method: client_secret_post` になっています。`https://github.com/login/oauth/access_token` へのトークン交換の POST には、`client_id`、`code`、`code_verifier`、`redirect_uri` に加えて `client_secret` をフォームの項目として入れる必要があります（秘密を使ったうえで、PKCE もそのまま効きます）。リダイレクト先の URI は OAuth アプリの設定で**固定**されていて変えられないので、待ち受けポートを手で決める小技は使えません。利用者にはそのポートでブラウザがつながらないのを待ってもらい、アドレスバーの URL を貼り戻してもらいます。

## やってはいけないこと {#what-not-to-do}

- **`mcp-remote` を代わりに使わないでください。** これは npx のサブプロセスを立ち上げますが、その OAuth のコールバックを受けるサーバーも結局リモートのコンテナの localhost に立つので、同じ問題にぶつかります。`mcp-remote` が役に立つのは、MCP クライアントがリモートの HTTP をまったく扱えない場合だけです（Hermes は最初から扱えます）。
- **利用者が OAuth を望んでいるのに「API のトークンを貼ってくれればヘッダーに入れます」と押し付けないでください。** リモートの構成で組み込みの OAuth がうまくいかない理由を説明したうえで、固定トークンという近道を選択肢として出します。回転が要らず、範囲を絞れるアクセスのためにひと手間かける、という利用者の判断を尊重してください。
- **ソースを読まずに「Hermes はその機能に対応していません」と言わないでください。** できるかできないかを口にする前に、ソースツリーを grep してください。

## 早見表になるファイル {#quick-reference-files}

- `scripts/diagnose-oauth-mcp.py` — 何度でも実行でき、既定では読み取りだけの診断ツールです。サーバー名を渡すと、保存されている access_token を試し、更新を試み、新しいトークンを試し、いまどの復旧の枝にいるかを表示します（`TOKEN_OK` = ブレーカーなので再起動、`REFRESH_FIXED` = 保存して再起動、`SESSION_REVOKED` = 認証のやり直し、`REFRESH_DEAD` = 認証のやり直しか API キー）。`--write` を付けると、通った更新後のトークンを安全に書き込みます。秘密の値は決して表示しません。**OAuth の MCP サーバーが「つながっていない」と言ってきたら、まずこれを実行してください。** 7 番・9 番・10 番の判断がそのまま組み込まれています。
- `references/stripe-mcp-oauth-revocation.md` — OAuth のセッションを定期的に破棄する提供元（Stripe）の実例と、その根本的な対処（固定の制限付き API キーに切り替える）をまとめてあります。

## 関連 {#related}

- `native-mcp` — Hermes で MCP を設定するときの全体的な案内です。設定の詳しい仕様はそちらにあります。
- `mcporter` — 外部の CLI からつなぐ橋渡しです。Hermes の設定の外で MCP をその場で叩きたいときに使います。
