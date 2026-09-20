---
title: "Pinggy Tunnel — Pinggy を使い、SSH 経由でインストール不要の localhost トンネルを張る"
description: "Pinggy を使い、SSH 経由でインストール不要の localhost トンネルを張ります"
upstream_path: user-guide/skills/optional/devops/devops-pinggy-tunnel.md
upstream_blob: 3d92fb49e690cbf584b286ed9c516279f3efdb88
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/devops/devops-pinggy-tunnel
---

# Pinggy Tunnel {#pinggy-tunnel}

Pinggy を使い、SSH 経由でインストール不要の localhost トンネルを張ります。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/devops/pinggy-tunnel` で導入します |
| パス | `optional-skills/devops/pinggy-tunnel` |
| バージョン | `0.1.0` |
| 作者 | Teknium (teknium1), Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Pinggy`, `Tunnel`, `Networking`, `SSH`, `Webhook`, `Localhost` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として見ています。
:::

# Pinggy Tunnel Skill {#pinggy-tunnel-skill}

ローカルで動いているサービス（開発用サーバー、Webhook の受け口、MCP のエンドポイント、デモ）を、Pinggy の SSH リバーストンネルでインターネットに公開します。常駐プログラムを入れる必要はありません。標準の SSH クライアントで `a.pinggy.io:443` につなぐと、Pinggy が公開用の HTTP/HTTPS URL を返します。

無料枠はトンネルが60分、サブドメインはランダム、登録も不要です。Pro 枠（月3ドル）はトークンを使って自分で切り替えるものです。

## 使いどころ {#when-to-use}

- 利用者から「これを外に出して」「開発サーバーを共有したい」「この URL を公開して」「ポート N をトンネルして」「Webhook 用の公開 URL がほしい」と頼まれたとき
- ローカルでの作業中に Webhook のコールバックを受けたいとき（Stripe、GitHub、Discord、AgentMail）
- HTTP のデモ（MCP サーバー、Ollama/vLLM のエンドポイント、ダッシュボード）を離れた相手に1回だけ見せたいとき
- そのマシンに SSH はあるが `cloudflared` / `ngrok` のバイナリがなく、わざわざ入れるほどではないとき

すでに `cloudflared` が設定済みのマシンなら、`cloudflared-quick-tunnel` skill のほうが向いています。Cloudflare のクイックトンネルは60分で切れません。

## 前提 {#prerequisites}

- PATH に `ssh` があること（`ssh -V` で確認）。Linux、macOS、Windows 10 以降には標準で入っています。ほかに入れるものはありません。
- トンネルを張る前に、ローカルのサービスが `127.0.0.1:<port>` で待ち受けていること。Pinggy は URL を返しますが、ローカル側が動いていなければ 502 になります。

任意:

- Pro の機能（固定サブドメイン、独自ドメイン、複数トンネル、60分制限なし）を使うための `PINGGY_TOKEN` 環境変数。無料枠に認証情報は要りません。

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

## 手順 — トンネルを張って URL を得る {#procedure-start-a-tunnel-and-get-the-url}

モデルは `terminal` ツールを使うべきです。共有しているあいだトンネルは生きている必要があるので、バックグラウンドのプロセスとして動かし、公開 URL は標準出力から読み取ります。

### 1. ローカル側が動いていることを確かめる {#1-confirm-a-local-origin-is-up}

```bash
curl -sI http://127.0.0.1:8000/ | head -1
# expect HTTP/1.x 200 (or any non-connection-refused response)
```

まだ何も待ち受けていなければ、先に起動します（たとえば `python -m http.server 8000 --bind 127.0.0.1`）。Pinggy は中身がなくても平気で URL を返すので、ローカル側が立ち上がるまで利用者には 502 が見えます。

### 2. トンネルをバックグラウンドで起動する {#2-launch-the-tunnel-as-a-background-process}

`terminal(background=True)` を使い、出力をログファイルに残します（Pinggy は標準出力に URL を出したあと、接続を張ったままにします）。

```bash
LOG=~/.hermes/cache/scratch/pinggy-8000.log
nohup ssh -p 443 \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    -o ServerAliveInterval=30 \
    -o ServerAliveCountMax=3 \
    -R0:localhost:8000 free@a.pinggy.io \
    > "$LOG" 2>&1 &
echo $! > ~/.hermes/cache/scratch/pinggy-8000.pid
```

`StrictHostKeyChecking=no` と `UserKnownHostsFile=/dev/null` を付けると、初回のホスト鍵の確認が出ません。`ServerAliveInterval=30` は、通信のない NAT に SSH の接続を切られないようにするためのものです。

### 3. ログから URL を取り出す {#3-parse-the-url-out-of-the-log}

```bash
sleep 4
grep -oE 'https://[a-z0-9-]+\.[a-z]+\.pinggy\.link' ~/.hermes/cache/scratch/pinggy-8000.log | head -1
```

出力はこのような形になります。

```
You are not authenticated.
Your tunnel will expire in 60 minutes.
http://yqycl-98-162-69-48.a.free.pinggy.link
https://yqycl-98-162-69-48.a.free.pinggy.link
```

`https://...pinggy.link` の URL を利用者に渡します。

### 4. 動作を確かめる {#4-verify}

```bash
curl -sI https://<the-url>/ | head -3
# expect 200/302/whatever the local origin actually returns
```

`502 Bad Gateway` が返る場合、SSH の接続はできているのにローカル側が待ち受けていません。まず手順1を直してください。

### 5. 後片付け {#5-teardown}

```bash
kill "$(cat ~/.hermes/cache/scratch/pinggy-8000.pid)"
# or, if the pid file got lost:
pkill -f 'ssh -p 443 .* free@a\.pinggy\.io'
```

`terminal(background=True)` の session_id が手元にあるなら、`process(action='kill', session_id=...)` のほうが確実です。

## ユーザー名のキーワードによるアクセス制御 {#access-control-via-username-keywords}

Pinggy は制御用のフラグを、`+` で区切って SSH のユーザー名に重ねます。`+` を含む場合は、`user@host` の引数全体を必ず引用符で囲んでください。

| キーワード | 効果 |
|---------|--------|
| `b:user:pass` | HTTP Basic 認証をかける |
| `k:token` | Bearer トークンのヘッダーで認証する（`Authorization: Bearer <token>`） |
| `w:CIDR` | IP の許可リスト（単独の IP か CIDR、複数指定可） |
| `co` | `Access-Control-Allow-Origin: *` を付ける（CORS） |
| `x:https` | HTTPS を強制し、HTTP を自動で転送する |
| `a:Name:Value` | リクエストヘッダーを追加する |
| `u:Name:Value` | リクエストヘッダーを書き換える |
| `r:Name` | リクエストヘッダーを削除する |
| `qr` | URL の QR コードを標準出力に表示する（スマートフォンへの共有に便利） |

自由に組み合わせられます: `"b:admin:secret+co+x:https+free@a.pinggy.io"`。

## Web デバッガー（任意） {#web-debugger-optional}

Pinggy は、届いた通信を `localhost:4300` に写して確認できるようにしてくれます。SSH のコマンドにローカル転送を足します。

```bash
ssh -p 443 -L4300:localhost:4300 -R0:localhost:8000 free@a.pinggy.io
```

あとはブラウザで `http://localhost:4300` を開けば、リクエストとレスポンスの組をその場で見られます。

## つまずきやすいところ {#pitfalls}

- **無料枠は60分で必ず切れます。** 60分の時点で SSH の接続が終わり、URL は死にます。長く共有したいなら、`PINGGY_TOKEN`（Pro）を使うか、シェルのループで張り直します（無料枠では張り直すたびに URL が変わる点に注意してください）。
- **無料枠の URL はランダムで、張り直すと変わります。** ブックマークしたり設定ファイルに書いたりしないでください。毎回ログから読み直します。
- **無料枠の同時トンネルは、送信元 IP ごとに1本までです。** 同じマシンから2本目を張ると、たいてい1本目が切れます。Pro 枠ならこの制限はありません。
- **ユーザー名の `+` は引用符で囲む必要があります。** 裸の `ssh ... b:admin:secret+free@a.pinggy.io` は bash では動きますが、`+` を特別に扱うシェルや、プログラムで組み立てた場合に壊れます。必ずダブルクォートで囲んでください。
- **アクセス制御のフラグなしで、機微なものをトンネルしないでください。** 素の HTTP トンネルは、URL を知っている人なら誰でも触れます。公開しないサービスには `b:`、`k:`、`w:` を使います。
- **`process(action='log')` では SSH の表示を取りこぼすことがあります。** Pinggy は URL を出したあと、SSH の接続が対話モードに入ります。必ずログファイルへ書き出し、そのファイルを直接 `grep` してください。`cloudflared-quick-tunnel` と同じやり方です。
- **初回はホスト鍵の確認が出ます。** OpenSSH の既定の設定では、Pinggy のホスト鍵を受け入れるかどうか利用者に尋ねます。人の手を介さずに動かすなら、必ず `-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null` を付けてください。
- **TCP と TLS のトンネルは https の URL ではなく、`<subdomain>.a.pinggy.online:<port>` の組を返します。** 別の正規表現で読み取ってください（`tcp://` とポート番号）。Pinggy のトンネルが必ず HTTP だと思い込まないことです。
- **Pro モードでは、トークンはフラグではなくユーザー名として渡します。** `"$PINGGY_TOKEN+a.pinggy.io"` の形です（`free@` は付けません）。トークンがあれば `:persistent` を足して固定のサブドメインも使えます。詳しくは `pinggy.io/docs/` を参照してください。

## 実例 {#recipes}

ローカルのサービスと Pinggy のトンネルを組み合わせた型です。どれも単体で完結しています。ローカル側を起動し、トンネルを張り、URL を読み取って、利用者に渡します。

### 実例1 — Webhook のコールバックを受ける {#recipe-1-receive-a-webhook-callback}

ローカルでの作業中に、外部のサービス（Stripe、GitHub、Discord、AgentMail など）から公開 URL へ POST してもらう必要があるときに使います。

```bash
# 1. Tiny capturing server: every request gets appended to ~/.hermes/cache/scratch/webhook-hits.log
cat >~/.hermes/cache/scratch/webhook-server.py <<'PY'

LOG = pathlib.Path("~/.hermes/cache/scratch/webhook-hits.log").expanduser()
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
nohup python ~/.hermes/cache/scratch/webhook-server.py >~/.hermes/cache/scratch/webhook-server.log 2>&1 &
echo $! >~/.hermes/cache/scratch/webhook-server.pid

# 2. Tunnel — bearer-token-gate so randos can't pollute the capture log
nohup ssh -p 443 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    -o ServerAliveInterval=30 \
    -R0:localhost:18080 "k:$(openssl rand -hex 12)+free@a.pinggy.io" \
    >~/.hermes/cache/scratch/webhook-pinggy.log 2>&1 &
echo $! >~/.hermes/cache/scratch/webhook-pinggy.pid
sleep 5
URL=$(grep -oE 'https://[a-z0-9-]+\.[a-z]+\.pinggy\.link' ~/.hermes/cache/scratch/webhook-pinggy.log | head -1)
echo "Webhook URL: $URL"

# 3. While the agent works, watch hits land
tail -f ~/.hermes/cache/scratch/webhook-hits.log
```

`$URL` を、呼び出してくる側のサービスに渡します。後片付けは `kill $(cat ~/.hermes/cache/scratch/webhook-server.pid) $(cat ~/.hermes/cache/scratch/webhook-pinggy.pid)` です。

### 実例2 — MCP サーバーを HTTP/SSE で公開する {#recipe-2-expose-an-mcp-server-over-httpsse}

離れた場所の MCP クライアント（別のマシンの Claude Desktop、同僚のエディタなど）から、手元で動く MCP サーバーへつなぎたいときに使います。使えるのは HTTP で話す MCP サーバーだけで、stdio モードのサーバーはトンネルできません。

```bash
# 1. Start the MCP server in HTTP mode (example: a FastMCP server on port 8765)
nohup python my_mcp_server.py --transport http --port 8765 \
    >~/.hermes/cache/scratch/mcp-server.log 2>&1 &
echo $! >~/.hermes/cache/scratch/mcp-server.pid

# 2. Tunnel with a bearer token — MCP traffic should not be open to the internet
TOKEN=$(openssl rand -hex 16)
nohup ssh -p 443 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    -o ServerAliveInterval=30 \
    -R0:localhost:8765 "k:$TOKEN+free@a.pinggy.io" \
    >~/.hermes/cache/scratch/mcp-pinggy.log 2>&1 &
echo $! >~/.hermes/cache/scratch/mcp-pinggy.pid
sleep 5
URL=$(grep -oE 'https://[a-z0-9-]+\.[a-z]+\.pinggy\.link' ~/.hermes/cache/scratch/mcp-pinggy.log | head -1)
echo "MCP URL: $URL"
echo "Bearer token: $TOKEN"
```

離れた場所のクライアントは、`Authorization: Bearer $TOKEN` を付けて `$URL` につなぎます。Hermes 自身の MCP クライアントの設定なら `{"transport": "http", "url": "<URL>", "headers": {"Authorization": "Bearer <TOKEN>"}}` です。

### 実例3 — ローカルの LLM エンドポイント（Ollama / vLLM / llama.cpp）を公開する {#recipe-3-expose-a-local-llm-endpoint-ollama-vllm-llamacpp}

手元のモデルを、離れた呼び出し元（別のエージェント、スマートフォン、同僚）と共有します。Ollama は `:11434`、vLLM と llama.cpp はたいてい `:8000` で待ち受けます。

```bash
# Pre-req: the model server is already running on 127.0.0.1:11434 (Ollama default)
TOKEN=$(openssl rand -hex 16)
nohup ssh -p 443 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    -o ServerAliveInterval=30 \
    -R0:localhost:11434 "k:$TOKEN+co+free@a.pinggy.io" \
    >~/.hermes/cache/scratch/llm-pinggy.log 2>&1 &
echo $! >~/.hermes/cache/scratch/llm-pinggy.pid
sleep 5
URL=$(grep -oE 'https://[a-z0-9-]+\.[a-z]+\.pinggy\.link' ~/.hermes/cache/scratch/llm-pinggy.log | head -1)
echo "Endpoint: $URL"
echo "Token:    $TOKEN"

# Verify
curl -s "$URL/api/tags" -H "Authorization: Bearer $TOKEN" | head
```

`co` は CORS を有効にして、ブラウザからも呼べるようにします。サーバー側からしか呼ばないなら `co` は外します。OpenAI 互換の vLLM / llama.cpp のエンドポイントなら、呼び出し側はベース URL `$URL/v1` に `Authorization: Bearer $TOKEN` を付けて使います。ただし Pinggy は本文を書き換えないので、モデルサーバー自身にも Pinggy 用のトークンが見えます。ローカルのサーバー側は認証を見ない設定にして（すでに `127.0.0.1` で動いています）、入口の制御は Pinggy に任せてください。

### 実例4 — 使い捨てのパスワード付きで開発サーバーを共有する {#recipe-4-share-a-dev-server-with-a-one-shot-password}

「動いているアプリを同僚に触ってもらう」いちばん速いやり方です。パスワードはランダムで、表示は一度きり、Ctrl-C で終わります。

```bash
PASS=$(openssl rand -base64 12 | tr -d '+/=' | head -c 12)
echo "Dev server password: $PASS"
ssh -p 443 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    -o ServerAliveInterval=30 \
    -R0:localhost:3000 "b:dev:$PASS+co+x:https+free@a.pinggy.io"
# URL prints to the terminal. Share URL + password. Ctrl-C to tear down.
```

`b:dev:$PASS` が HTTP Basic 認証で URL を守ります。`x:https` は TLS を強制します。`co` は SPA のフロントエンド向けに CORS を足します。

## 動作確認 {#verification}

```bash
# End-to-end: spin up a trivial origin, tunnel it, hit it, tear down
python -m http.server 18000 --bind 127.0.0.1 >~/.hermes/cache/scratch/origin.log 2>&1 &
ORIGIN_PID=$!

nohup ssh -p 443 \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    -R0:localhost:18000 free@a.pinggy.io >~/.hermes/cache/scratch/pinggy-verify.log 2>&1 &
SSH_PID=$!

sleep 5
URL=$(grep -oE 'https://[a-z0-9-]+\.[a-z]+\.pinggy\.link' ~/.hermes/cache/scratch/pinggy-verify.log | head -1)
echo "URL: $URL"
curl -sI "$URL/" | head -1

kill "$SSH_PID" "$ORIGIN_PID"
```

期待する結果は、`pinggy.link` の URL が得られ、curl のヘッダー取得で `HTTP/2 200` が返ることです。
