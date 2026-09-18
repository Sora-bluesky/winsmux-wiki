---
title: "MCP（Model Context Protocol）"
description: "MCP で Hermes Agent を外部の道具サーバーにつなぎ、Hermes が読み込む MCP の道具を細かく選びます"
upstream_path: user-guide/features/mcp.md
upstream_blob: 6cdca06b3ee85e4dee212eae2a2a0ecdbfe111b0
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp
---

# MCP（Model Context Protocol） {#mcp-model-context-protocol}

MCP を使うと、Hermes Agent を外部の道具サーバーにつなげます。GitHub、データベース、ファイルシステム、ブラウザ一式、社内 API など、Hermes の外にある道具をエージェントが使えるようになります。

すでにどこかにある道具を Hermes に使わせたいと思ったことがあるなら、たいていは MCP がいちばん素直なやり方です。

:::tip Claude Code から移ってきた方へ
`~/.claude.json` の `mcpServers` の部分は、Hermes の `config.yaml` では `mcp_servers` にあたります。`hermes import-agent claude-code` を実行すれば、スキルや指示文と一緒に自動で移せます。[他のエージェントから取り込む](/hermes/docs/user-guide/import-from-other-agents/)を見てください。
:::

## MCP でできること {#what-mcp-gives-you}

- Hermes 用の道具を自分で作らなくても、外部の道具の世界にそのまま手が届きます
- 手元で動く stdio のサーバーと、遠くにある HTTP の MCP サーバーを、同じ設定にまとめて書けます
- 起動時に道具を見つけて登録するところまで自動です
- サーバーが対応していれば、MCP のリソースやプロンプトを扱う補助の道具も付きます
- サーバーごとの絞り込みができるので、Hermes に見せたい MCP の道具だけを出せます

## すぐ使い始める {#quick-start}

1. MCP への対応は通常のインストールに含まれています。追加の手順は要りません。

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

4. MCP で増えた機能を Hermes に頼みます。

たとえば、こんなふうに書きます。

```text
List the files in /home/user/projects and summarize the repo structure.
```

Hermes は MCP サーバーの道具を見つけて、ほかの道具と同じように使います。

## カタログ: Nous が認めた MCP をワンクリックで入れる {#catalog-one-click-install-for-nous-approved-mcps}

Hermes には、Nous のスタッフが目を通して取り込んだ MCP サーバーの一覧が
付いています。最初はどれも無効なので、本当に使いたいものだけ入れてください。

デスクトップアプリなら、「Linear の MCP を追加して」と頼むこともできます。エージェントが
`mcp: true` を対象にして `manage_connections` を呼ぶと、チャットに承認のカードが表示され、
インストールを押すと CLI と同じ設定が書き込まれます。CLI やメッセージアプリでは、エージェントが
代わりに下のコマンドを案内します。

```bash
hermes mcp                # interactive picker (default)
hermes mcp catalog        # plain-text list, scriptable
hermes mcp install n8n    # install a catalog entry by name
```

選択画面には、それぞれの今の状態が並びます。

```
n8n          available              Manage and inspect n8n workflows from Hermes
linear       enabled                Linear issue/project management (remote OAuth)
github       installed (disabled)   GitHub repo + PR tools
```

行を選んで `Enter` を押すと、導入（必要な資格情報の入力も一緒に進みます）、
有効化、無効化、削除ができます。カタログの項目は hermes-agent のリポジトリの
`optional-mcps/` に置かれていて、そこにあること自体が Nous の承認を意味します。
利用者が投稿する枠はありません。項目は PR を取り込む形で追加されます。

カタログの項目が求めるものには、次のようなものがあります。

- **API キー** — 導入するときに Hermes が尋ねて、値を `~/.hermes/.env` に
  書き込みます。秘密でない値（ベース URL など）も同じファイルに入ります。
- **OAuth**（遠隔の MCP） — 設定に `auth: oauth` と書かれ、最初につなぐときに
  MCP のクライアントがブラウザを開きます。
- **OAuth**（Google や GitHub のような他社の窓口） — まだ認証していなければ、
  Hermes が `hermes auth <provider>` を案内します。

### 導入時に道具を選ぶ {#tool-selection-at-install-time}

資格情報を設定し終えると、Hermes は MCP サーバーに問い合わせて、そこにある道具を
すべて数え上げ、チェックリストとして見せます。

```
Select tools for 'linear' (SPACE toggle, ENTER confirm)
  [x] find_issues       Find issues matching a query
  [x] get_issue         Get a single issue
  [x] create_issue      Create a new issue
  [ ] delete_workspace  Delete a Linear workspace
  ...
```

あらかじめチェックが入っている行は、次のどれかで決まります。

1. **前に選んだ内容**。この項目を入れ直した場合は、そのときの選択がそのまま残ります
   （マニフェストの既定値が上書きすることはありません）
2. **マニフェストの `tools.default_enabled`**。項目がそれを書いている場合です
   （書き換え系や、めったに使わない道具をあらかじめ外しているカタログ項目があります）
3. どちらもなければ**すべて**

自動生成で道具が極端に多い項目（たとえば `cloudflare` は OpenAPI の窓口が
約 3,300 個あります）は、代わりに `tools.default_excluded` を書いています。
これは名前とパターンをまとめた、選び抜いた除外の一覧です。この種の項目を入れるときは
チェックリストを飛ばして `tools.exclude` が書き込まれます。当てはまらなかったものは
すべて有効なままで、サーバーがあとから足した道具も含まれます。まとめて有効に戻したいときは
config.yaml の `mcp_servers.<name>.tools.exclude` を編集してください。

チェックリストは ENTER で確定します。チェックを付けた道具だけが
`mcp_servers.<name>.tools.include` に入ります。全部を選んだ場合は絞り込みが
書かれません（設定がいちばんすっきりしますし、動きは同じです）。

**問い合わせに失敗したとき**（サーバーにつながらない、OAuth がまだ終わっていない、
土台のサービスが動いていない、など）でも導入自体は成功します。マニフェストに
`tools.default_enabled` があればそれをそのまま使い、なければ絞り込みは
書かれません。サーバーにつながるようになったら `hermes mcp configure <name>` を
実行して細かく直してください。

### 何をどこまで信じるか {#trust-model}

カタログの項目を入れると、マニフェストに書かれたことがそのまま実行されます。`git clone`、
その項目の `bootstrap` のコマンド（`pip install`、`npm install` など）、そして最後には
MCP サーバー自身のコードです。マニフェストは hermes-agent のリポジトリへの PR レビューを
通っているので、公開前に Nous が目を通しています。
**とはいえ、入れる前にマニフェストを自分で読んでください**。とくに
`source:` に書かれたリポジトリ、`install.bootstrap:` のコマンド、
`transport.command:` で何が呼ばれるかを見てください。

マニフェストは GitHub の
[`optional-mcps/<name>/manifest.yaml`](https://github.com/NousResearch/hermes-agent/tree/main/optional-mcps)
にあります。選択画面でも導入時にマニフェストの `source:` の URL を表示するので、
もとのリポジトリをその場で確かめられます。ウェブのダッシュボードの MCP のページにも
カタログの項目ごとに同じ内容が出ます。通信の方式、認証の種類、接続先の URL（HTTP の場合）か
コマンドと引数（stdio の場合）、git の取得元と参照先、bootstrap のコマンド、
設定の補足です。`source:` は押せるリンクになっているので、Install を押す前に
その項目が何につながり何を動かすのかを、そのまま確かめられます。

### マニフェストの版の互換性 {#manifest-version-compatibility}

マニフェストには `manifest_version` が書かれています。カタログは将来の版にも耐えるようにできていて、
入れてある Hermes が理解できるより新しい `manifest_version` の項目が PR で追加された場合は、
黙って隠すのではなく、その項目に警告（`⚠ '<name>' requires a newer
Hermes`）を出します。それが出たら `hermes update` で最新の Hermes を入れてください。

### 実行時の `${ENV_VAR}` の置き換え {#runtime-envvar-substitution}

項目の `transport.command`、`transport.args`、`transport.url`、`headers` の中では、
`${VAR}` という書き方がサーバーにつなぐ時点で環境変数から置き換えられます
（`~/.hermes/.env` の中身もすべて含みます）。
カタログの項目が、利用者が別のところで設定した値を参照したいときに便利です。
たとえば `${HOME}/foo` や `${MY_PROVIDER_TOKEN}` です。

Cursor 風の文脈変数も置き換えられます（大文字と小文字は区別します）。
`${userHome}`（ホームディレクトリ）、`${workspaceFolder}`（セッションの作業場所の
起点）、`${workspaceFolderBasename}`、そして `${pathSeparator}` / `${/}`
（OS のパス区切り文字）です。詳しくは
[MCP 設定の早見表](/hermes/docs/reference/mcp-config-reference/)を見てください。

これはカタログのマニフェストにある `${INSTALL_DIR}` とは別のものです。あちらは導入時に、
その項目のリポジトリを取ってきた場所へ置き換えられます。

### 自分で用意した OAuth アプリが要る項目（DCR なし） {#entries-that-need-your-own-oauth-app-no-dcr}

提供元によっては、遠隔の MCP を OAuth の後ろに置きながら、動的クライアント登録
（Dynamic Client Registration）を用意して**いない**ことがあります。この場合、どのクライアントも
利用者が提供元の開発者コンソールであらかじめ登録したアプリでなければなりません。
最初から入っている例が Asana の V2 サーバー（`https://mcp.asana.com/v2/mcp`）です。
引退した V1 の `https://mcp.asana.com/sse` はどのクライアントでも受け付けましたが、V2 は受け付けません。

この種のマニフェストは、必要な認証情報を `auth.env` で宣言し、クライアントを `auth.oauth` で
固定します。そのため導入するとき（CLI の選択画面、ウェブのダッシュボード、Desktop のいずれでも）
Client ID と Client secret を尋ねられ、それらはプロファイルの `.env` に保存され、
`config.yaml` には `${VAR}` の参照だけが書かれます。

```yaml
mcp_servers:
  asana:
    url: https://mcp.asana.com/v2/mcp
    auth: oauth
    oauth:
      client_id: "${ASANA_CLIENT_ID}"
      client_secret: "${ASANA_CLIENT_SECRET}"
      redirect_host: localhost      # the vendor matches the redirect URL exactly
      redirect_port: 27890          # register http://localhost:27890/callback on the app
```

登録すべきアプリの種類と実際のリダイレクト URL は、その項目の `post_install` の説明に書いてあります。
読んだうえで `hermes mcp login <name>` を実行し、道具を使いたいセッションやゲートウェイを
再起動（または `/reload-mcp`）してください。ダッシュボードや Desktop の **Authorize** ボタンでも
できます。クライアントが `redirect_port` を固定した状態で登録済みなので、Hermes は
ダッシュボード自身のコールバック URL ではなく、登録されたループバックのコールバック
（`http://localhost:27890/callback`）を使い続けます。そのため、承認するブラウザーは
Hermes のプロセスと同じ端末で動いている必要があります。遠隔のホストの場合は、
SSH のポート転送ごしに `hermes mcp login` を使ってください。

### あとから道具の選択を変える {#updating-tool-selection-later}

```bash
hermes mcp configure linear
```

今の選択にチェックが入った状態で、同じチェックリストが開きます。使える道具を増やしたいときや、
サーバーが新しく足した道具を取り込みたいときに使ってください。

### カタログのマニフェストを更新する {#updating-the-catalog-manifest}

MCP が勝手に更新されることはありません。Hermes を更新したあとにマニフェストの版が変わっていたら、
`hermes mcp install <name>` をもう一度実行して入れ直してください。

カタログに MCP を追加したいときは、
[`optional-mcps/`](https://github.com/NousResearch/hermes-agent/tree/main/optional-mcps) に
PR を出してください。

### 提案のための情報（`suggest:`） {#suggestion-metadata-suggest}

マニフェストには、`keywords:` や `hosts:` の一覧を持つ `suggest:` という任意の欄を
書けます。画面まわり（今のところデスクトップアプリの入力欄）はこれを使って、
書きかけの文章にそのキーワードが単語として現れたときや、末尾がその host に一致する
リンクを貼ったときに、ワンクリックの「Add &lt;server&gt;」ボタンを出します。あくまで
案内でしかなく、導入はこれまでどおり検証済みのカタログと設定の道を通ります。遠隔で
提供されている項目の多く（Atlassian、Sentry、Notion、Stripe、Vercel、Supabase など）が
これを書いています。

GitHub をカタログに載せていないのは意図的です。GitHub が提供する MCP は、クライアントごとに
自前の OAuth アプリを用意することを求めます（一般的な動的クライアント登録は拒否されます）。
そして Hermes に同梱されている `github/*` のスキルが `gh` コマンドを動かす形の方が、
できることが多いのです。デスクトップでは、GitHub の話が出たときに `gh` がまだサインイン
されていなければ、代わりに `github-auth` のスキルを案内します。

## MCP サーバーの 2 つの形 {#two-kinds-of-mcp-servers}

### stdio のサーバー {#stdio-servers}

stdio のサーバーは手元で子プロセスとして動き、標準入力と標準出力でやりとりします。

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "***"
```

stdio のサーバーが向いているのは、こんなときです。
- サーバーが手元に入っている
- 手元のものへ待ち時間なく触りたい
- MCP サーバーの資料が `command`、`args`、`env` の形で書かれている

### HTTP のサーバー {#http-servers}

HTTP の MCP サーバーは、Hermes が直接つなぎに行く遠くの接続先です。

```yaml
mcp_servers:
  remote_api:
    url: "https://mcp.example.com/mcp"
    headers:
      Authorization: "Bearer ***"
```

HTTP のサーバーが向いているのは、こんなときです。
- MCP サーバーがよそで動いている
- 社内の MCP の接続先が用意されている
- そのつなぎ込みのために、Hermes に手元で子プロセスを立ててほしくない

HTTP と SSE のサーバーは、一般的なプロキシ設定に従います。まず `HTTPS_PROXY` / `HTTP_PROXY` / `ALL_PROXY`（`socks://` と書いた場合は `socks5://` に読み替えます）、次に OS のプロキシ設定（Windows ならレジストリ、macOS ならシステム設定）を見ます。`NO_PROXY` に書いたホストは、CIDR の範囲や `*.example.com` の形も含めて、プロキシを通さず直接つなぎます。

### OAuth で認証する HTTP サーバー {#oauth-authenticated-http-servers}

提供型の MCP サーバーの多く（Cloudflare、Linear、Sentry、Atlassian、Asana、Figma、Stripe など）は、固定のトークンではなく OAuth 2.1 を求めます。`auth: oauth` を指定すれば、あとは Hermes が MCP の Python SDK を通して、窓口の発見、クライアントの申告、PKCE、トークンの交換、更新、追加認証まで面倒を見ます。

Hermes は、対応しているサーバーに対しては [Client ID Metadata Document](/hermes/docs/reference/mcp-config-reference/#client-identification-cimd-and-dcr) で自分を名乗り、対応していないサーバーには動的クライアント登録で切り替えます。どちらも自動なので、設定することはありません。

:::tip Figma の遠隔 MCP
Figma の接続先（`https://mcp.figma.com/mcp`）は、動的クライアント登録を **`client_name` の完全一致**で許可しています。素の `"Hermes Agent"` では 403 になり、`"Claude Code"` と `"Codex"` なら通ります。Hermes は `mcp.figma.com` に対して `oauth.client_name: "Claude Code"` を自動で設定するので、小細工なしで導入とログインができます。

```yaml
mcp_servers:
  figma:
    url: "https://mcp.figma.com/mcp"
    auth: oauth
```

または `hermes mcp install figma` のあとに `hermes mcp login figma` を実行します。
:::

```yaml
mcp_servers:
  linear:
    url: "https://mcp.linear.app/mcp"
    auth: oauth
```

最初につなぐとき、Hermes は認可の URL を表示し、できればブラウザを開いて、手元のループバックのポートで OAuth の戻りを待ちます。トークンは `~/.hermes/mcp-tokens/<server>.json` に 0o600 の権限で保存され、更新に失敗するまでは次回以降そのまま静かに使い回されます。

更新トークンは、それを発行した認可サーバーにひも付けられます。Hermes はキャッシュしたトークンと一緒に、見つけた発行元（issuer）を記録します。サーバーが案内する認可サーバーが変わった場合（サーバーの移転、メタデータの書き換え、乗っ取りなど）、保存していた更新トークンは新しい発行元へ送らずに捨てます。いまのアクセストークンは期限が切れるまでそのまま使え、そのあと新しい発行元に対してふつうの認可をやり直します。

認可サーバーからの戻り（リダイレクト）は、RFC 9207 に照らして確かめます。サーバーのメタデータが `authorization_response_iss_parameter_supported` を案内している場合、一致する `iss` のない戻りははねられます。Figma の認可サーバー（`https://api.figma.com`）は、この対応を案内しているのに `iss` を付けてきません。そこで Hermes は、この発行元に限って、見つけた発行元の値で欠けている値を補い、警告をログに出します。これで `hermes mcp login figma` が最後まで通ります。`iss` が付いていて値が違う場合は引き続きはねられ、ほかのサーバーにはこの例外は適用されません。

**遠隔のホストや、画面のないホストの場合。** Hermes がブラウザとは別の端末で動いているときは、ループバックの戻り先が手元のパソコンに届きません。それでも認証を終える方法があります。

- **Hermes Desktop（自動）:** デスクトップアプリの MCP 設定画面から、遠くの裏側に対して OAuth のサインインを実行すると、*手元の*端末側でデスクトップが戻りを受け取り、その認可をゲートウェイまで自動で中継します。トンネルも貼り付けも代理サーバーも要りません。デスクトップアプリと裏側の両方が最新である必要があります。
- **貼り付けて返す（準備なし）:** 対話できる端末なら、Hermes が認可の URL と一緒に「Or paste the redirect URL here…」と表示します。その URL をブラウザで開いて承認し、たどり着いた URL をまるごとコピーして（接続エラーの画面が出ますが、それで問題ありません）、プロンプトに貼り付けます。`?code=…&state=…` の部分だけでも通ります。
- **デバイスコードでのログイン（戻りを使わない）:** サーバー側の認可サーバーがデバイス認可の窓口を公開していれば、Hermes が動いている端末で `hermes mcp login <server> --flow device` を実行します。確認用の URL と短いコードが表示されるので、手近な端末でその URL を開いてコードを入れると、Hermes が承認されるまで待ち続けます。ホスト側でブラウザは開きませんし、戻りを待ち受ける必要もありません。サーバーに `oauth.flow: device` を書いておけば、`login` と `reauth` が既定でこの方法を使います。詳しくは[デバイスコードでのログイン](/hermes/docs/reference/mcp-config-reference/#device-code-login-rfc-8628)を見てください。
- **SSH のポート転送:** 別の端末で `ssh -N -L <port>:127.0.0.1:<port> user@host` を動かしておき、あとは普通に戻りを流します。
- **代理を通した戻り（`redirect_uri`）:** 公開された HTTPS の接続先がホストへ転送してくれるとき（戻り用のポートに向けた Tailscale Funnel や逆プロキシなど）は、`oauth.redirect_uri` を設定すればブラウザの転送がそのまま Hermes に届きます。トンネルも貼り付けも要りません。

```yaml
mcp_servers:
  myserver:
    url: "https://mcp.example.com/mcp"
    auth: oauth
    oauth:
      redirect_port: 8765                                # fixed port for the proxy to target
      redirect_uri: "https://oauth.example.ts.net/callback"
```

対話できる端末がまったくない、完全に画面のないゲートウェイ（メッセージのボットなど）では、任意で入れられる [`mcp-oauth-remote-gateway` のスキル](/hermes/docs/user-guide/skills/optional/mcp/mcp-mcp-oauth-remote-gateway/)が、認証を手作業で終えてトークンを Hermes の期待する場所へ書くところまでエージェントを導いてくれます。

**つまずきどころ — WAF が `127.0.0.1` の戻り先をはねる。** 認可サーバーの前に WAF を置いていて、問い合わせの文字列に `127.0.0.1` がそのまま入っていると 403 を返す提供元がいくつかあります（Reclaim.ai の AWS API Gateway が知られた例で、OAuth のアプリに届く前にすべて `{"message":"Forbidden"}` が返ります）。`oauth.redirect_host: localhost` を設定して `http://localhost:<port>/callback` を使ってください。どちらにしても、待ち受け自体は `127.0.0.1` に結び付けられます。

DCR に対応していないサーバー（Slack など）、あらかじめ登録した `client_id` と `client_secret`、スコープの調整、`hermes mcp login <server>` での認証のやり直しまで含めた手順は、[SSH 越し・遠隔ホストでの OAuth](/hermes/docs/guides/oauth-over-ssh/#mcp-servers) を見てください。

**つまずきどころ — 自動登録に対応していない提供元（Google Drive、Atlassian）。** 素の `auth: oauth` が頼りにしている動的クライアント登録（RFC 7591）を拒むサーバーがあります。Google の公式 Drive サーバー（`https://drivemcp.googleapis.com/mcp/v1`）は `400 Bad Request` を返すので、OAuth のクライアントが作られず、トークンも手に入りません。厄介なのは症状の分かりにくさです。これらのサーバーは認証なしでも `tools/list` に答えるので、`hermes mcp login` が道具を並べてうまくいったように見えるのに、あとで実際に道具を呼ぶと必ず時間切れになります。今の `hermes mcp login` はこれを見分けて（トークンが本当にディスクに残ったかを確かめます）、自分の OAuth クライアントを用意するよう伝えます。提供元の管理画面で作って、設定に書き足してください。

```yaml
mcp_servers:
  googledrive:
    url: "https://drivemcp.googleapis.com/mcp/v1"
    auth: oauth
    oauth:
      client_id: "<your-oauth-client-id>"
      client_secret: "<your-oauth-client-secret>"
```

そのうえで `hermes mcp login googledrive` を実行します。登録済みのクライアントがあるので、Hermes は登録の手順を飛ばして、いつものブラウザでの認可に進みます。

**つまずきどころ — 設定の自動読み込みとの競合。** Hermes のセッションを動かしたまま `~/.hermes/config.yaml` を編集すると、CLI は 30 秒の制限時間で MCP の接続を読み込み直します。対話的な OAuth を終えるにはこれでは足りません。設定を書き足したら、新しい端末で `hermes mcp login <server>` を実行してください。こちらは認証を終えるまで 5 分たっぷり待ちます。

## mTLS / クライアント証明書 {#mtls-client-certificates}

相互 TLS（クライアント証明書による認証）を求める遠隔の HTTP MCP サーバーには、`client_cert` と `client_key` で対応できます。Hermes は解決した証明書を、TLS のやりとりのために裏側の HTTP クライアントへ渡します。

`client_cert` には 3 つの書き方があります。

- **1 つにまとめた PEM のパス** — 証明書と秘密鍵を 1 つのファイルに入れたものです。

```yaml
mcp_servers:
  internal_api:
    url: "https://mcp.internal.example.com/mcp"
    client_cert: "~/.certs/mcp-client.pem"
```

- **`[cert, key]` の 2 つ組** — 証明書と鍵を別々のファイルにしたものです（`client_cert` と `client_key` を両方書くのと同じ意味です）。

```yaml
mcp_servers:
  internal_api:
    url: "https://mcp.internal.example.com/mcp"
    client_cert: ["~/.certs/mcp-client.crt", "~/.certs/mcp-client.key"]
```

- **`[cert, key, password]` の 3 つ組** — 秘密鍵に暗号がかかっているとき、3 つめがその合い言葉になります。

```yaml
mcp_servers:
  internal_api:
    url: "https://mcp.internal.example.com/mcp"
    client_cert: ["~/.certs/mcp-client.crt", "~/.certs/mcp-client.key", "${MCP_KEY_PASSWORD}"]
```

`client_cert`（まとめた PEM）に加えて `client_key` を明示することで、証明書と鍵を完全に分けておくこともできます。パスでは `~` が展開されます。ファイルが見つからないときは、TLS のやりとりの分かりにくい失敗ではなく、どのサーバーの話かがはっきり分かるエラーになります。

## 利用者ごとの身元ヘッダー {#per-user-identity-header}

呼び出し側の身元で振る舞いを変える遠隔の HTTP / SSE の MCP サーバー（利用者ごとの回数制限、監査の記録、複数の顧客の振り分けなど）には、`identity_header` で毎回の要求に身元のヘッダーを付けられます。

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
- `value_from: profile` は、いま使っている Hermes のプロファイル名を、つなぐときに一度だけ調べて送ります。1 台の端末の複数のプロファイルが同じサーバーを使っていて、サーバー側が見分けたいときに役立ちます。

サーバーの `headers` に同じ名前（大文字と小文字は問いません）を自分で書いた場合は、そちらが必ず優先されます。身元のヘッダーが自分のヘッダー設定を上書きすることはありません。`identity_header` の書き方が正しくないときは警告を出して無視します。それでサーバーにつながらなくなることはありません。stdio のサーバーではこの項目は警告付きで無視されます（stdio の通信にヘッダーという仕組みがないためです）。

## 基本の設定の早見表 {#basic-configuration-reference}

Hermes は `~/.hermes/config.yaml` の `mcp_servers` から MCP の設定を読みます。

### よく使う項目 {#common-keys}

| 項目 | 型 | 意味 |
|---|---|---|
| `command` | 文字列 | stdio の MCP サーバーを動かす実行ファイル |
| `args` | リスト | stdio のサーバーに渡す引数 |
| `env` | 対応表 | stdio のサーバーに渡す環境変数 |
| `cwd` | 文字列 | stdio のサーバーのプロセスを動かす作業ディレクトリ。既定: セッションの作業場所が決まっているとき（ACP やゲートウェイのセッション、`terminal.cwd`）はそこ、決まっていなければ Hermes のプロセスのディレクトリ |
| `url` | 文字列 | HTTP の MCP の接続先 |
| `headers` | 対応表 | 遠隔のサーバーに付ける HTTP ヘッダー |
| `client_cert` | 文字列 \| リスト | mTLS 用のクライアント証明書。まとめた PEM のパスか、`[cert, key]` / `[cert, key, password]` |
| `client_key` | 文字列 | クライアントの秘密鍵の PEM のパス（`client_cert` と分けるとき） |
| `identity_header` | 対応表 | HTTP / SSE のサーバー向けの、利用者ごとの身元ヘッダー（任意）。`{name, value_from: static\|profile, value}` |
| `timeout` | 数値 | 道具を呼ぶときの制限時間 |
| `connect_timeout` | 数値 | 最初につなぐときの制限時間（MCP の `initialize` のやりとりもここに収まります） |
| `lazy` | 真偽値 | `true` にすると、起動時にはスキーマのキャッシュから道具だけを登録し、最初に道具が呼ばれたときに初めてサーバーを起動・接続します（既定は `false`）。キャッシュを作るため、事前に一度は実際に接続している必要があります。 |
| `idle_timeout_seconds` | 数値 | 道具が呼ばれないまま この秒数が過ぎたら stdio のサーバーを作り直します（`0` は作り直さない、これが既定）。次に道具が呼ばれたときに、気づかないうちに立ち上げ直されます。 |
| `max_lifetime_seconds` | 数値 | 起動からこの時間が経ったら stdio のサーバーを作り直します（`0` は作り直さない、これが既定）。次に使うときに、気づかないうちに立ち上げ直されます。 |
| `enabled` | 真偽値 | `false` なら、Hermes はそのサーバーをまるごと飛ばします |
| `supports_parallel_tool_calls` | 真偽値 | `true` なら、このサーバーの道具を同時に動かすことがあります |
| `tools` | 対応表 | サーバーごとの道具の絞り込みと、補助の道具の扱い |

### いちばん短い stdio の例 {#minimal-stdio-example}

```yaml
mcp_servers:
  filesystem:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
```

### メモリを食う stdio のサーバーを作り直す {#recycling-memory-heavy-stdio-servers}

ブラウザを使う MCP サーバー（`@playwright/mcp` など）は、最初に道具を呼んだあと
Chromium をまるごと抱えたままになります。数百 MB が返ってきません。
自動で作り直す設定を入れておけば、放置時間や起動からの時間の上限を超えたところで
いったん落とし、次にその道具が呼ばれたときに気づかないうちに立ち上げ直します
（その間も道具は登録されたままです）。

```yaml
mcp_servers:
  playwright:
    command: "npx"
    args: ["-y", "@playwright/mcp@latest", "--headless"]
    idle_timeout_seconds: 900     # recycle after 15 min without a tool call
    max_lifetime_seconds: 86400   # and at least once a day regardless
```

### いちばん短い HTTP の例 {#minimal-http-example}

```yaml
mcp_servers:
  company_api:
    url: "https://mcp.internal.example.com"
    headers:
      Authorization: "Bearer ***"
```

## 用意されている定型 {#built-in-presets}

よく知られた MCP サーバーについては、`hermes mcp add` に `--preset` を付けると通信まわりの設定が埋まるので、コマンドと引数を調べる手間が要りません。定型はあくまで既定値を渡すだけなので、同じコマンドで一緒に指定したもの（環境変数、ヘッダー、絞り込み）はそちらが優先されます。

| 定型 | つないでくれるもの |
|---|---|
| `codex` | Codex CLI の MCP サーバー（stdio 越しの `codex mcp-server`）。PATH に `codex` コマンドが必要です。 |

```bash
# Add Codex CLI as an MCP server in one line
hermes mcp add codex --preset codex
```

これは次のように書いたのと同じ意味になります。

```yaml
mcp_servers:
  codex:
    command: "codex"
    args: ["mcp-server"]
```

手元の名前は自由に付けられます（`hermes mcp add my-codex --preset codex` でも構いません）。定型が用意するのは `command` と `args` の既定値だけです。

## Hermes が MCP の道具を登録する仕組み {#how-hermes-registers-mcp-tools}

Hermes は、もとからある道具の名前とぶつからないように、MCP の道具に接頭辞を付けます。

```text
mcp_<server_name>_<tool_name>
```

例を挙げます。

| サーバー | MCP の道具 | 登録される名前 |
|---|---|---|
| `filesystem` | `read_file` | `mcp_filesystem_read_file` |
| `github` | `create-issue` | `mcp_github_create_issue` |
| `my-api` | `query.data` | `mcp_my_api_query_data` |

実際には、接頭辞の付いた名前を自分で呼ぶ必要はほとんどありません。Hermes はその道具を見つけて、ふだんの考えごとの中で選びます。

### 道具の結果の掃除と `_meta` {#tool-result-sanitization-and-meta}

モデルが目にする前に、MCP の道具の結果すべてに 2 つの処理が入ります。

- **目に見えない Unicode の TAG 文字を取り除きます。** U+E0000〜U+E007F の範囲の文字は、端末やチャットの画面では何も表示されないのに、モデルからは完全に見えています。悪意のあるサーバーや乗っ取られたサーバーが、プロンプトへの仕込みを紛れ込ませる古典的な抜け道です。Hermes は道具の結果、リソースの中身、道具の説明文からこれを取り除きます。正当な絵文字のタグの並び（🏴󠁧󠁢󠁳󠁣󠁴󠁿 のような地域の旗）はそのまま残します。
- **事業者独自の `_meta` は渡し、プロトコルが予約している項目は渡しません。** サーバーが道具の結果に `_meta` の対応表を付けてきたとき（`com.example/handoff` のような事業者ごとの名前空間）、Hermes はそれを結果の中身と一緒にモデルへ渡します。プロトコルが予約している接頭辞の下にある項目は落とします。`modelcontextprotocol` か `mcp` というラベルにもう 1 つラベルが続くもの、たとえば `modelcontextprotocol.io/...` や `tools.mcp.com/...` です。MCP の仕様にある名前の決まりに合わせています。モデルに見せるものが何も残らなければ、`_meta` の欄ごと省きます。

## MCP の補助の道具 {#mcp-utility-tools}

対応している場合、Hermes は MCP のリソースとプロンプトを扱う補助の道具も登録します。

- `list_resources`
- `read_resource`
- `list_prompts`
- `get_prompt`

これらもサーバーごとに同じ接頭辞の形で登録されます。たとえば、こうなります。

- `mcp_github_list_resources`
- `mcp_github_get_prompt`

### 大事なところ {#important}

これらの補助の道具は、今は相手の対応状況を見て登録されます。
- MCP のやりとりがリソースの操作に本当に対応しているときだけ、リソース用の道具を登録します
- MCP のやりとりがプロンプトの操作に本当に対応しているときだけ、プロンプト用の道具を登録します

つまり、呼び出せる道具は出すけれどリソースやプロンプトは持たないサーバーには、この追加の道具は付きません。

## サーバーごとの絞り込み {#per-server-filtering}

MCP サーバーごとに、どの道具を Hermes に持ち込ませるかを決められます。道具の名前の空間を細かく整えられます。

### サーバーをまるごと止める {#disable-a-server-entirely}

```yaml
mcp_servers:
  legacy:
    url: "https://mcp.legacy.internal"
    enabled: false
```

`enabled: false` なら、Hermes はそのサーバーを完全に飛ばし、つなぎに行くことすらしません。

### 使う道具だけを挙げる {#whitelist-server-tools}

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

挙げた MCP サーバーの道具だけが登録されます。

`include` と `exclude` には、パターン（`*`、`?`、`[...]`。大文字と小文字は区別します）も
書けます。`include: ["*_dns_*"]` なら、名前に `_dns_` を含む道具がすべて登録されます。
記号を含まない書き方は、これまでどおり完全一致です。
自動生成の窓口を何千個も出すサーバーを製品の系統ごとに絞るなら、
このパターンが現実的な手です。

### 使わない道具を挙げる {#blacklist-server-tools}

```yaml
mcp_servers:
  stripe:
    url: "https://mcp.stripe.com"
    tools:
      exclude: [delete_customer]
```

挙げたもの以外のサーバーの道具がすべて登録されます。

### パターンの書き方 {#glob-patterns}

どちらの一覧も、正確な名前と一緒に fnmatch 風のパターンを受け付けます。Cloudflare の
API MCP（`?codemode=false` で約 3,300 個の道具）のように平べったく巨大なもので、
製品の領域ごとに窓口を 1 つずつ外していられないときには欠かせません。

```yaml
mcp_servers:
  cloudflare:
    url: "https://mcp.cloudflare.com/mcp?codemode=false"
    auth: oauth
    tools:
      exclude: ["*_radar_*", "*_accounts_dlp_*", "*_zones_web3_*"]
```

パターンの記号（`*`、`?`、`[`）を含まない書き方は完全一致です。`docs` は
`docs` という名前の道具だけを外し、`docs_search` を巻き込むことはありません。

### どちらが優先されるか {#precedence-rule}

両方書いた場合は、こうなります。

```yaml
tools:
  include: [create_issue]
  exclude: [create_issue, delete_issue]
```

`include` が勝ちます。

### 補助の道具も絞り込む {#filter-utility-tools-too}

Hermes が足す補助の道具も、別々に止められます。

```yaml
mcp_servers:
  docs:
    url: "https://mcp.docs.example.com"
    tools:
      prompts: false
      resources: false
```

つまり、こういうことです。
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

## 全部を絞り落としたらどうなるか {#what-happens-if-everything-is-filtered-out}

呼び出せる道具をすべて外し、対応している補助の道具も止めるか書かないままにすると、Hermes はそのサーバーのために空の道具の束を作りません。

道具の一覧がすっきり保たれます。

## 動いているときの振る舞い {#runtime-behavior}

### いつ見つけるか {#discovery-time}

Hermes は起動時に MCP サーバーを見つけて、その道具をふだんの道具の台帳に登録します。

### 遅延起動 {#lazy-start}

`lazy: true` のサーバーは、代わりにディスク上のスキーマのキャッシュから登録されます。道具はすぐ台帳に載り、プロセスの起動（HTTP なら接続先への接続）は最初に道具が呼ばれたときに行われます。キャッシュは実際に接続するたびに書き込まれるので、新しいサーバーや設定を変えたサーバーの初回は、必ずその場で起動します。起動時の表示と TUI のセッションパネルでは、このサーバーが **lazy** として、キャッシュにある道具の数とともに表示されます（`3 tool(s) (lazy, starts on first use)`）。失敗したサーバーではなく、正常に使えるサーバーです。起動時の検出のまとめでは `N lazy, not spawned yet` として数えられます。

### 動いている最中に道具を見つける {#dynamic-tool-discovery}

MCP サーバーは、使える道具が動いている最中に変わったことを `notifications/tools/list_changed` という知らせで Hermes に伝えられます。この知らせを受け取ると、Hermes はそのサーバーの道具の一覧を取り直して台帳を更新します。`/reload-mcp` を手で実行する必要はありません。

できることが動的に変わる MCP サーバー（新しいデータベースの構成を読んだら道具が増えるサーバーや、サービスが落ちたら道具が減るサーバーなど）で役に立ちます。

取り直しには鍵がかかるので、同じサーバーから知らせが立て続けに来ても、取り直しが重なることはありません。プロンプトやリソースの変更の知らせ（`prompts/list_changed`、`resources/list_changed`）は受け取りますが、まだ何もしていません。

### 読み込み直す {#reloading}

MCP の設定を変えたら、次を使ってください。

```text
/reload-mcp
```

設定から MCP サーバーを読み込み直し、使える道具の一覧を作り直します。使える条件が揃ってから出てくる道具（Docker、`HASS_TOKEN`、OAuth など）を調べ直す、はっきりしたやり方でもあります。ふだんセッションの道具立ては固定なので、途中で資格情報や常駐プロセスが現れても、`/reload-mcp`、`/new`、文脈の圧縮のいずれかがないと拾われません。サーバー側から知らされる道具の変化については、上の[動いている最中に道具を見つける](#dynamic-tool-discovery)を見てください。

動いているメッセージングのゲートウェイ（`hermes gateway run`）は、`config.yaml` を自分でも見張っています。`mcp_servers` の項目を消すか `enabled: false` にすると、1 分ほどでそのサーバーとの接続が切られ、新しく足した項目は接続されます。最初の接続に失敗したサーバー（届かないホストや、まだトークンのない画面のない機械で動く OAuth のサーバーなど）は、原因を直しておけば、接続の待ち時間の決まり（30 秒から始まり、最大 10 分まで倍に伸びます）にしたがって自動でつなぎ直されます。編集を反映させるのに、再起動も `/reload-mcp` も要りません。

**裏で OAuth のトークンが期限切れになったとき。** ゲートウェイ、`/reload-mcp`、待機中のサーバーの定期的な自己確認は、ブラウザーを開きません。手続きを終わらせる人がその場にいないからです。更新トークンが使えなくなると、サーバーは `gateway.log` に警告を残して待機に入ります。`hermes mcp login <server>`（または Desktop やダッシュボードの *Authorize* ボタン）で一度だけ認可し直してください。待機中のサーバーは、次の確認で新しいトークンを拾います。

### 道具の束 {#toolsets}

設定した MCP サーバーは、登録される道具が 1 つ以上あれば、実行時に道具の束も作ります。

```text
mcp-<server>
```

そのおかげで、MCP サーバーを束の単位で考えやすくなります。

## 安全の考え方 {#security-model}

### stdio の環境変数の絞り込み {#stdio-env-filtering}

stdio のサーバーに対して、Hermes はシェルの環境をそのまま丸ごと渡したりはしません。

はっきり設定した `env` と、安全な最低限のものだけを通します。秘密がうっかり漏れることを減らせます。

### 設定で見せる範囲を決める {#config-level-exposure-control}

新しく入った絞り込みは、安全のための仕組みでもあります。
- モデルに見せたくない危ない道具を止める
- 気を使うサーバーには、最小限の一覧だけを見せる
- リソースやプロンプトの入口を見せたくないときは、その包みを止める

## 使い方の例 {#example-use-cases}

### 課題の管理だけに絞った GitHub のサーバー {#github-server-with-a-minimal-issue-management-surface}

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

たとえば、こう頼みます。

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

たとえば、こう頼みます。

```text
Look up the last 10 failed payments and summarize common failure reasons.
```

### プロジェクト 1 つ分に絞ったファイルシステムのサーバー {#filesystem-server-for-a-single-project-root}

```yaml
mcp_servers:
  project_fs:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/my-project"]
```

たとえば、こう頼みます。

```text
Inspect the project root and explain the directory layout.
```

## 困ったときは {#troubleshooting}

### MCP サーバーにつながらない {#mcp-server-not-connecting}

まず確かめます。

```bash
# Verify MCP deps are installed (already included in standard install)
cd ~/.hermes/hermes-agent && uv pip install -e ".[mcp]"

node --version
npx --version
```

そのうえで設定を見直し、Hermes を起動し直してください。

### 遠隔（HTTP）のサーバーにつながらない {#remote-http-server-rejects-the-connection}

`hermes mcp test <name>` は、サーバーが実際に返した内容をそのまま報告します。MCP の SDK が
`Server returned an error response`（本文が JSON-RPC のエラーではない 4xx・5xx）としか言えないときは、
Hermes が HTTP のステータス、要求した URL、応答の本文の先頭を付け足します。

```
Streamable HTTP: Server returned an error response (HTTP 400 from POST http://host:27200/mcp:
{"jsonrpc":"2.0","error":{"code":-32020,"message":"Unsupported MCP-Protocol-Version"}})
```

まずステータスと本文を読んでください。`initialize` の POST に対する `400` や `405` は、たいてい
その接続先が SSE しか話せない（`transport: sse` を設定します）か、手前にいるプロキシが要求を
はねているということです。`401` や `403` はトークンか OAuth の許可が違うということで、
本文が HTML なら URL が MCP の接続先ではなくウェブページを指しています。`hermes logs --level debug` を
使うと、つなぎにいくたびにどの接続先を使ったかまで出せます。

### 道具が出てこない {#tools-not-appearing}

考えられる原因です。
- サーバーにつながらなかった
- 道具を見つけられなかった
- 絞り込みの設定でその道具が外れていた
- そのサーバーにその補助の機能がない
- `enabled: false` でサーバーを止めている

わざと絞り込んでいるなら、それは想定どおりの動きです。

### リソースやプロンプトの補助の道具が出てこないのはなぜ？ {#why-didnt-resource-or-prompt-utilities-appear}

今の Hermes は、次の 2 つがどちらも成り立つときだけ、その包みを登録するからです。
1. 設定がそれを許している
2. サーバーとのやりとりが、その機能に本当に対応している

これは意図してそうしていて、道具の一覧に嘘がない状態を保ちます。

## 道具の同時呼び出し {#parallel-tool-calls}

既定では、MCP の道具は一度に 1 つずつ順番に動きます。同時に動かしても大丈夫な道具（読むだけの問い合わせや、互いに関係のない API 呼び出しなど）を出している MCP サーバーなら、同時に動かす設定を選べます。

```yaml
mcp_servers:
  docs:
    command: "docs-server"
    supports_parallel_tool_calls: true
```

`supports_parallel_tool_calls` が `true` のとき、Hermes は 1 回の呼び出しのまとまりの中で、そのサーバーの複数の道具を同時に動かすことがあります。もとから入っている読み取り専用の道具（web_search、read_file など）と同じ扱いです。

:::caution
同時に動かしても大丈夫だと分かっている MCP サーバーだけで有効にしてください。道具が共有の状態、ファイル、データベース、外部のものを読み書きするなら、有効にする前に読み書きのぶつかり方を確かめてください。
:::

## MCP のサンプリングへの対応 {#mcp-sampling-support}

MCP サーバーは `sampling/createMessage` という手順で、Hermes に大規模言語モデルの推論を頼めます。つまり MCP サーバーが、自分の代わりに文章を作ってほしいと Hermes に頼めるということです。モデルを自前で持っていないけれど言語モデルの力が要る、というサーバーに向いています。

サンプリングは、すべての MCP サーバーで**既定で有効**です（MCP の SDK が対応している場合）。サーバーごとに `sampling` の欄で設定します。

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

サンプリングを受け持つ部分には、直近の時間で数える回数制限、要求ごとの制限時間、道具を使う往復の深さの上限が入っていて、使いすぎが暴走しないようにしてあります。数字（要求の回数、エラー、使ったトークン）はサーバーごとに記録されます。

特定のサーバーでサンプリングを止めるには、こう書きます。

```yaml
mcp_servers:
  untrusted_server:
    url: "https://mcp.example.com"
    sampling:
      enabled: false
```

## MCP の問いかけへの対応 {#mcp-elicitation-support}

MCP サーバーは、道具を実行している途中で、決まった形の入力を利用者に尋ねられます（`elicitation/create` という手順。mcp の Python SDK 1.11.0 以降）。Hermes は**入力欄の形**の問いかけを、いつもの承認の画面に流します。CLI や TUI では対話的な問いかけとして、Telegram や Slack のようなゲートウェイでは承認のボタンとして出るので、セッションがどこにあってもあなたのところへ届きます。**URL の形**の問いかけ（サーバーが外部の URL に案内するもの）は、対応していないものとして断ります。

問いかけはサーバーごとに**既定で有効**です。`elicitation` の欄で設定します。

```yaml
mcp_servers:
  my_server:
    command: "my-mcp-server"
    elicitation:
      enabled: true    # default: true
      timeout: 300     # seconds to wait for your answer (default: 300)
```

既定の 5 分という制限時間は、ゲートウェイの承認の既定に合わせたものです。すぐには返事ができない場所にいる人でも、サーバーがあきらめる前に答えられます。サーバーごとの数字（要求、承諾、辞退、エラー）も記録されます。

## Hermes 自身を MCP サーバーとして動かす {#running-hermes-as-an-mcp-server}

MCP サーバーに**つなぐ**だけでなく、Hermes 自身が MCP サーバーに**なる**こともできます。ほかの MCP 対応のエージェント（Claude Code、Cursor、Codex、その他どの MCP クライアントでも）が、Hermes のメッセージ機能を使えるようになります。会話を並べる、やりとりの履歴を読む、つないであるサービス全部にメッセージを送る、といったことです。

### どんなときに使うか {#when-to-use-this}

- Claude Code や Cursor などのコーディングのエージェントに、Hermes 経由で Telegram / Discord / Slack のメッセージを読み書きさせたい
- Hermes につないだメッセージのサービス全部への橋渡しを、1 つの MCP サーバーで済ませたい
- すでに各サービスにつないだ Hermes のゲートウェイが動いている

### すぐ使い始める {#quick-start}

```bash
hermes mcp serve
```

これで stdio の MCP サーバーが立ち上がります。プロセスの面倒を見るのは、あなたではなく MCP のクライアントです。

### MCP クライアントの設定 {#mcp-client-configuration}

MCP クライアントの設定に Hermes を書き足します。たとえば Claude Code の `~/.claude/claude_desktop_config.json` なら、こうです。

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

Hermes を決まった場所に入れてある場合は、こう書きます。

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

### 使える道具 {#available-tools}

この MCP サーバーは 10 個の道具を出します。OpenClaw のチャンネル橋渡しと同じ顔ぶれに、Hermes ならではのチャンネル閲覧を足したものです。

| 道具 | 説明 |
|------|------|
| `conversations_list` | 動いているメッセージの会話を並べます。サービスで絞ったり、名前で探したりできます。 |
| `conversation_get` | セッションキーを指定して、1 つの会話の詳しい情報を取ります。 |
| `messages_read` | ある会話の最近のやりとりを読みます。 |
| `attachments_fetch` | 特定のメッセージから、文章以外の添付（画像やメディア）を取り出します。 |
| `events_poll` | ある位置から先の、新しい会話の出来事を取りに行きます。 |
| `events_wait` | 次の出来事が来るまで待ち続けます（ほぼその場で分かります）。 |
| `messages_send` | サービスを指定してメッセージを送ります（`telegram:123456`、`discord:#general` など）。 |
| `channels_list` | すべてのサービスにまたがって、送れる相手を並べます。 |
| `permissions_list_open` | この橋渡しのあいだに見えた、承認待ちの要求を並べます。 |
| `permissions_respond` | 承認待ちの要求を、許すか断るかします。 |

### 出来事の仕組み {#event-system}

この MCP サーバーには、Hermes のセッションのデータベースを見張って新しいメッセージを拾う橋渡しが入っています。MCP のクライアントは、入ってくる会話をほぼその場で知ることができます。

```
# Poll for new events (non-blocking)
events_poll(after_cursor=0)

# Wait for next event (blocks up to timeout)
events_wait(after_cursor=42, timeout_ms=30000)
```

出来事の種類は `message`、`approval_requested`、`approval_resolved` です。

出来事の待ち行列はメモリの中にあって、橋渡しがつながった時点から始まります。それより前のメッセージは `messages_read` で読めます。

### 指定できること {#options}

```bash
hermes mcp serve              # Normal mode
hermes mcp serve --verbose    # Debug logging on stderr
```

### どう動いているか {#how-it-works}

この MCP サーバーは、会話の情報を Hermes のセッションの保管場所から直接読みます。`~/.hermes/state.db` が本体で、`sessions.json` は古い形への備えとして残してあるだけです。裏で動くスレッドがデータベースを見張って新しいメッセージを拾い、メモリの中に出来事の待ち行列を保ちます。メッセージを送るときは、定時配信や `hermes send` コマンドを動かしているのと同じ内部の送信の仕組み（`tools/send_message_tool.py`）を使います。

読み取りの操作（会話を並べる、履歴を読む、出来事を拾う）には、ゲートウェイが動いている必要は**ありません**。送信の操作には**必要です**。各サービスのつなぎ役が、つながった状態でないといけないからです。

### 今のところの限界 {#current-limits}

- 組み込みの `hermes mcp serve` が出すのは、今のところ **stdio だけ**の MCP サーバーです。HTTP の MCP サーバーが要るなら別の仲立ちを動かすか、もっとよくあるやり方として、Hermes の MCP の**クライアント**側を使ってください。こちらはすでに stdio と HTTP の両方を話せます（`mcp_servers.yaml` や `config.yaml` の `url` と `headers`。上の [HTTP のサーバー](#http-servers)を見てください）。
- 出来事の見張りは約 200 ミリ秒ごとで、ファイルの更新時刻を見て無駄な読み込みを飛ばします
- `claude/channel` の通知の手順にはまだ対応していません
- 送れるのは文章だけです（`messages_send` でメディアや添付は送れません）

## 関連する資料 {#related-docs}

- [Hermes で MCP を使う](/hermes/docs/guides/use-mcp-with-hermes/)
- [CLI コマンド](/hermes/docs/reference/cli-commands/)
- [スラッシュコマンド](/hermes/docs/reference/slash-commands/)
- [よくある質問](/hermes/docs/reference/faq/)
