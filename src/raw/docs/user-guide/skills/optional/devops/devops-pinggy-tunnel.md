---
title: "Pinggy Tunnel — Pinggy 経由の SSH で、何も入れずに手元のサーバーを外へ公開する"
description: "Pinggy 経由の SSH で、何も入れずに手元のサーバーを外へ公開する"
upstream_path: user-guide/skills/optional/devops/devops-pinggy-tunnel.md
upstream_blob: de59598e06c27f96f9c7d5e0baae059c580d383a
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/devops/devops-pinggy-tunnel
---

# Pinggy Tunnel {#pinggy-tunnel}

Pinggy 経由の SSH で、何も入れずに手元のサーバーを外へ公開します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加 skill — `hermes skills install official/devops/pinggy-tunnel` で入れます |
| パス | `optional-skills/devops\pinggy-tunnel` |
| バージョン | `0.1.0` |
| 作者 | Teknium (teknium1), Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Pinggy`, `Tunnel`, `Networking`, `SSH`, `Webhook`, `Localhost` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Pinggy Tunnel Skill {#pinggy-tunnel-skill}

手元で動かしているサービス（開発用サーバー、Webhook の受け口、MCP のエンドポイント、デモなど）を、Pinggy の SSH リバーストンネルでインターネットに公開します。常駐プログラムを入れる必要はありません。標準で入っている SSH クライアントで `a.pinggy.io:443` につなぐと、Pinggy が公開用の HTTP / HTTPS の URL を返してくれます。

無料枠は、トンネルの寿命が 60 分、サブドメインはランダム、登録も不要です。Pro 枠（月 3 ドル）を使いたいときは、トークンを設定して有効にします。

## 使う場面 {#when-to-use}

- 「これを外から見られるようにして」「開発用サーバーを共有したい」「この URL を公開して」「ポート N をトンネルして」「Webhook 用の公開 URL がほしい」と頼まれたとき
- 手元での作業中に Webhook のコールバックを受け取りたいとき（Stripe、GitHub、Discord、AgentMail）
- HTTP のデモ（MCP サーバー、Ollama / vLLM のエンドポイント、ダッシュボード）を、その場限りで遠くの相手に見せたいとき
- SSH はあるが `cloudflared` や `ngrok` のバイナリがなく、そのために入れるのは大げさなとき

`cloudflared` がすでに設定済みの環境なら、`cloudflared-quick-tunnel` の skill のほうが向いています。Cloudflare のクイックトンネルは 60 分で切れません。

## 事前に必要なもの {#prerequisites}

- PATH に `ssh` があること（`ssh -V` で確認）。Linux、macOS、Windows 10 以降なら標準で入っています。ほかに入れるものはありません。
- トンネルを張る前に、`127.0.0.1:<port>` で手元のサービスが待ち受けていること。Pinggy は URL を返してくれますが、手元のサービスが上がるまでは 502 になります。

任意:

- 有料の Pro 機能（固定サブドメイン、独自ドメイン、複数トンネル、60 分の上限なし）を使うための `PINGGY_TOKEN` 環境変数。無料枠では認証情報は要りません。

## 早見表 {#quick-reference}

```bash
# Plain HTTP/HTTPS tunnel for port 8000 (free tier)
ssh -p 443 -o StrictHostKeyChecking=no -o ServerAliveInterval=30 \
    -R0:localhost:8000 free@a.pinggy.io

# TCP tunnel (databases, raw SSH, etc.)
ssh -p 443 -o StrictHostKeyChecking=no -R0:localhost:5432 tcp@a.pinggy.io

# TLS tunnel (Pinggy can't decrypt — bring your own certs at origin)
ssh -p 443 -o StrictHostKeyChecking=no -R0:localhost:443 tls@a.pinggy.io

# Basic auth gate (b:user:pass)
ssh -p 443 -o StrictHostKeyChecking=no -R0:localhost:8000 \
    "b:admin:secret+free@a.pinggy.io"

# Bearer token gate (k:token)
ssh -p 443 -o StrictHostKeyChecking=no -R0:localhost:8000 \
    "k:mysecrettoken+free@a.pinggy.io"

# IP whitelist (w:CIDR)
ssh -p 443 -o StrictHostKeyChecking=no -R0:localhost:8000 \
    "w:203.0.113.0/24+free@a.pinggy.io"

# Enable CORS + force HTTPS redirect
ssh -p 443 -o StrictHostKeyChecking=no -R0:localhost:8000 \
    "co+x:https+free@a.pinggy.io"

# Pro tier (persistent URL, no 60-min cap)
ssh -p 443 -o StrictHostKeyChecking=no -R0:localhost:8000 "$PINGGY_TOKEN+a.pinggy.io"
```

## 手順 — トンネルを張って URL を受け取る {#procedure-start-a-tunnel-and-get-the-url}

モデルは `terminal` ツールを使ってください。共有しているあいだトンネルを保つ必要があるので、バックグラウンドのプロセスとして動かし、標準出力から公開 URL を読み取ります。

### 1. 手元のサービスが上がっているか確かめる {#1-confirm-a-local-origin-is-up}

```bash
curl -sI http://127.0.0.1:8000/ | head -1
# expect HTTP/1.x 200 (or any non-connection-refused response)
```

まだ何も待ち受けていなければ、先に起動します（たとえば `python -m http.server 8000 --bind 127.0.0.1`）。Pinggy は中身がなくても平気で URL を返すので、手元のサービスが上がるまで見に来た人には 502 が見えます。

### 2. トンネルをバックグラウンドで起動する {#2-launch-the-tunnel-as-a-background-process}

`terminal(background=True)` を使い、出力をログファイルに取ります（Pinggy は標準出力に URL を出したあと、接続を張ったままにします）。

```bash
LOG=/tmp/pinggy-8000.log
nohup ssh -p 443 \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    -o ServerAliveInterval=30 \
    -o ServerAliveCountMax=3 \
    -R0:localhost:8000 free@a.pinggy.io \
    > "$LOG" 2>&1 &
echo $! > /tmp/pinggy-8000.pid
```

`StrictHostKeyChecking=no` と `UserKnownHostsFile=/dev/null` を付けると、初回のホスト鍵の確認を飛ばせます。`ServerAliveInterval=30` は、無通信の NAT に SSH のセッションを切られないようにするためのものです。

### 3. ログから URL を取り出す {#3-parse-the-url-out-of-the-log}

```bash
sleep 4
grep -oE 'https://[a-z0-9-]+\.[a-z]+\.pinggy\.link' /tmp/pinggy-8000.log | head -1
```

出力はこんな形になります。

```
You are not authenticated.
Your tunnel will expire in 60 minutes.
http://yqycl-98-162-69-48.a.free.pinggy.link
https://yqycl-98-162-69-48.a.free.pinggy.link
```

`https://...pinggy.link` のほうの URL をユーザーに渡してください。

### 4. 動くか確かめる {#4-verify}

```bash
curl -sI https://<the-url>/ | head -3
# expect 200/302/whatever the local origin actually returns
```

`502 Bad Gateway` が返るなら、SSH のセッションは張れているのに手元のサービスが待ち受けていません。まず手順 1 を直してください。

### 5. 片付ける {#5-teardown}

```bash
kill "$(cat /tmp/pinggy-8000.pid)"
# or, if the pid file got lost:
pkill -f 'ssh -p 443 .* free@a\.pinggy\.io'
```

`terminal(background=True)` の session_id が手元にあるなら、`process(action='kill', session_id=...)` のほうが確実です。

## ユーザー名に書くアクセス制御 {#access-control-via-username-keywords}

Pinggy は、制御用のフラグを `+` でつないで SSH のユーザー名に埋め込みます。`+` を含むときは、`user@host` の引数全体を必ず引用符でくくってください。

| キーワード | はたらき |
|---------|--------|
| `b:user:pass` | HTTP Basic 認証をかける |
| `k:token` | Bearer トークンのヘッダーで認証する（`Authorization: Bearer <token>`） |
| `w:CIDR` | IP を許可制にする（単一 IP でも CIDR でも、複数指定も可） |
| `co` | `Access-Control-Allow-Origin: *` を足す（CORS） |
| `x:https` | HTTPS を強制する — HTTP を自動で HTTPS に飛ばす |
| `a:Name:Value` | リクエストヘッダーを足す |
| `u:Name:Value` | リクエストヘッダーを書き換える |
| `r:Name` | リクエストヘッダーを消す |
| `qr` | URL の QR コードを標準出力に出す（スマホに渡すときに便利） |

自由に組み合わせられます。`"b:admin:secret+co+x:https+free@a.pinggy.io"` のように書きます。

## Web デバッガー（任意） {#web-debugger-optional}

Pinggy は、入ってきた通信を `localhost:4300` に流して中身を見られるようにできます。SSH のコマンドにローカルフォワードを足してください。

```bash
ssh -p 443 -L4300:localhost:4300 -R0:localhost:8000 free@a.pinggy.io
```

そのあとブラウザで `http://localhost:4300` を開くと、リクエストとレスポンスの組をその場で確認できます。

## つまずきやすいところ {#pitfalls}

- **無料枠は 60 分で必ず切れます。** 60 分でその SSH のセッションが終わり、URL は死にます。もっと長く共有したいなら、`PINGGY_TOKEN`（Pro）を使うか、シェルのループで自動的に張り直してください（無料枠では張り直すたびに URL が変わる点に注意）。
- **無料枠の URL はランダムで、張り直すと変わります。** ブックマークにも設定ファイルにも書かないでください。毎回ログから読み直します。
- **無料枠で同時に張れるトンネルは、送信元 IP ごとに 1 本だけです。** 同じマシンから 2 本目を張ると、たいてい 1 本目が切れます。Pro 枠ならこの制限はありません。
- **ユーザー名の `+` は引用符でくくること。** `ssh ... b:admin:secret+free@a.pinggy.io` と裸で書いても bash では通りますが、`+` を特別扱いするシェルや、プログラムで組み立てた場合に壊れます。必ずダブルクォートで囲んでください。
- **アクセス制御なしで機密を通さないこと。** 素の HTTP トンネルは、URL を知っていれば誰でも届きます。公開したくないサービスには `b:`、`k:`、`w:` を使ってください。
- **`process(action='log')` は SSH のバナー出力を取りこぼすことがあります。** Pinggy は URL を出したあと、SSH のセッションが対話モードに入ります。必ずログファイルにリダイレクトして、ファイルを直接 `grep` してください。`cloudflared-quick-tunnel` と同じやり方です。
- **初回はホスト鍵の確認を求められます。** OpenSSH は既定で Pinggy のホスト鍵を受け入れるか尋ねてきます。無人で動かすときは必ず `-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null` を付けてください。
- **TCP と TLS のトンネルは https の URL ではなく、`<subdomain>.a.pinggy.online:<port>` の組を返します。** 別の正規表現（`tcp://` とポート番号）で読み取ってください。Pinggy のトンネルがいつも HTTP だと決めつけないこと。
- **Pro 枠では、トークンはフラグではなくユーザー名として渡します。** `"$PINGGY_TOKEN+a.pinggy.io"` と書きます（`free@` は付けません）。トークンがあれば `:persistent` を足してサブドメインを固定することもできます — `pinggy.io/docs/` を見てください。

## 組み合わせ例 {#recipes}

手元のサービスと Pinggy のトンネルを組み合わせた型です。どれも単体で完結していて、手元のサービスを起動し、トンネルを張り、URL を読み取ってユーザーに渡すところまで含んでいます。

### 例 1 — Webhook のコールバックを受け取る {#recipe-1-receive-a-webhook-callback}

手元での作業中に、外部のサービス（Stripe、GitHub、Discord、AgentMail など）から公開 URL へ POST してもらう必要があるときに使います。

```bash
# 1. Tiny capturing server: every request gets appended to /tmp/webhook-hits.log
cat >/tmp/webhook-server.py <<'PY'

LOG = pathlib.Path("/tmp/webhook-hits.log")
class H(http.server.BaseHTTPRequestHandler):
    def _capture(self):
        n = int(self.headers.get("content-length") or 0)
        body = self.rfile.read(n).decode("utf-8", "replace") if n else ""
        rec = {"t": datetime.datetime.utcnow().isoformat(), "path": self.path,
               "method": self.command, "headers": dict(self.headers), "body": body}
        with LOG.open("a") as f: f.write(json.dumps(rec) + "\n")
        self.send_response(200); self.send_header("content-type","application/json")
        self.end_headers(); self.wfile.write(b'{"ok":true}\n')
    def do_GET(self): self._capture()
    def do_POST(self): self._capture()
    def log_message(self,*a,**k): pass
http.server.HTTPServer(("127.0.0.1", 18080), H).serve_forever()
PY
nohup python /tmp/webhook-server.py >/tmp/webhook-server.log 2>&1 &
echo $! >/tmp/webhook-server.pid

# 2. Tunnel — bearer-token-gate so randos can't pollute the capture log
nohup ssh -p 443 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    -o ServerAliveInterval=30 \
    -R0:localhost:18080 "k:$(openssl rand -hex 12)+free@a.pinggy.io" \
    >/tmp/webhook-pinggy.log 2>&1 &
echo $! >/tmp/webhook-pinggy.pid
sleep 5
URL=$(grep -oE 'https://[a-z0-9-]+\.[a-z]+\.pinggy\.link' /tmp/webhook-pinggy.log | head -1)
echo "Webhook URL: $URL"

# 3. While the agent works, watch hits land
tail -f /tmp/webhook-hits.log
```

`$URL` を、呼び出してくる側のサービスに渡してください。片付けは `kill $(cat /tmp/webhook-server.pid) $(cat /tmp/webhook-pinggy.pid)` です。

### 例 2 — MCP サーバーを HTTP / SSE で公開する {#recipe-2-expose-an-mcp-server-over-httpsse}

遠くにある MCP クライアント（別のマシンの Claude Desktop、同僚のエディタなど）から、手元で動いている MCP サーバーに届かせたいときに使います。HTTP でやり取りする MCP サーバーだけが対象で、stdio モードのサーバーはトンネルできません。

```bash
# 1. Start the MCP server in HTTP mode (example: a FastMCP server on port 8765)
nohup python my_mcp_server.py --transport http --port 8765 \
    >/tmp/mcp-server.log 2>&1 &
echo $! >/tmp/mcp-server.pid

# 2. Tunnel with a bearer token — MCP traffic should not be open to the internet
TOKEN=$(openssl rand -hex 16)
nohup ssh -p 443 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    -o ServerAliveInterval=30 \
    -R0:localhost:8765 "k:$TOKEN+free@a.pinggy.io" \
    >/tmp/mcp-pinggy.log 2>&1 &
echo $! >/tmp/mcp-pinggy.pid
sleep 5
URL=$(grep -oE 'https://[a-z0-9-]+\.[a-z]+\.pinggy\.link' /tmp/mcp-pinggy.log | head -1)
echo "MCP URL: $URL"
echo "Bearer token: $TOKEN"
```

向こう側のクライアントは `$URL` に `Authorization: Bearer $TOKEN` を付けてつなぎます。Hermes 自身の MCP クライアントの設定なら `{"transport": "http", "url": "<URL>", "headers": {"Authorization": "Bearer <TOKEN>"}}` です。

### 例 3 — 手元の LLM エンドポイントを公開する（Ollama / vLLM / llama.cpp） {#recipe-3-expose-a-local-llm-endpoint-ollama-vllm-llamacpp}

手元のモデルを、遠くの相手（別のエージェント、スマホ、同僚）と共有します。Ollama は `:11434`、vLLM と llama.cpp はたいてい `:8000` で待ち受けています。

```bash
# Pre-req: the model server is already running on 127.0.0.1:11434 (Ollama default)
TOKEN=$(openssl rand -hex 16)
nohup ssh -p 443 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    -o ServerAliveInterval=30 \
    -R0:localhost:11434 "k:$TOKEN+co+free@a.pinggy.io" \
    >/tmp/llm-pinggy.log 2>&1 &
echo $! >/tmp/llm-pinggy.pid
sleep 5
URL=$(grep -oE 'https://[a-z0-9-]+\.[a-z]+\.pinggy\.link' /tmp/llm-pinggy.log | head -1)
echo "Endpoint: $URL"
echo "Token:    $TOKEN"

# Verify
curl -s "$URL/api/tags" -H "Authorization: Bearer $TOKEN" | head
```

`co` を付けると CORS が有効になり、ブラウザからも呼べます。サーバー側からしか呼ばないなら `co` は外してください。OpenAI 互換の vLLM / llama.cpp のエンドポイントなら、呼び出す側はベース URL を `$URL/v1` にして `Authorization: Bearer $TOKEN` を付けます。ただし Pinggy は本文に手を加えないので、モデルのサーバーからは Pinggy のトークンがそのまま見えます。手元のサーバー側は認証を見ないように設定し（すでに `127.0.0.1` にいます）、入口の制御は Pinggy に任せてください。

### 例 4 — その場限りのパスワードで開発用サーバーを共有する {#recipe-4-share-a-dev-server-with-a-one-shot-password}

「動いているアプリを同僚にちょっと触ってもらう」の、いちばん手っ取り早い形です。パスワードはランダムで、一度だけ表示され、Ctrl-C で終わります。

```bash
PASS=$(openssl rand -base64 12 | tr -d '+/=' | head -c 12)
echo "Dev server password: $PASS"
ssh -p 443 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    -o ServerAliveInterval=30 \
    -R0:localhost:3000 "b:dev:$PASS+co+x:https+free@a.pinggy.io"
# URL prints to the terminal. Share URL + password. Ctrl-C to tear down.
```

`b:dev:$PASS` が URL に HTTP Basic 認証をかけます。`x:https` は TLS を強制します。`co` は SPA のフロントエンド向けに CORS を足します。

## 動作確認 {#verification}

```bash
# End-to-end: spin up a trivial origin, tunnel it, hit it, tear down
python -m http.server 18000 --bind 127.0.0.1 >/tmp/origin.log 2>&1 &
ORIGIN_PID=$!

nohup ssh -p 443 \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    -R0:localhost:18000 free@a.pinggy.io >/tmp/pinggy-verify.log 2>&1 &
SSH_PID=$!

sleep 5
URL=$(grep -oE 'https://[a-z0-9-]+\.[a-z]+\.pinggy\.link' /tmp/pinggy-verify.log | head -1)
echo "URL: $URL"
curl -sI "$URL/" | head -1

kill "$SSH_PID" "$ORIGIN_PID"
```

うまくいけば、`pinggy.link` の URL が出て、curl のヘッダーに `HTTP/2 200` が返ります。
