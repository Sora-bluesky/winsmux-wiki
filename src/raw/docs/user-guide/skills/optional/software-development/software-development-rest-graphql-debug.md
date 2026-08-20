---
title: "Rest Graphql Debug — REST/GraphQL API を調べる: ステータスコード・認証・スキーマ・再現手順"
description: "REST/GraphQL API を調べる: ステータスコード・認証・スキーマ・再現手順"
upstream_path: user-guide/skills/optional/software-development/software-development-rest-graphql-debug.md
upstream_blob: 367149a4a43ae5136c8362cbe909c6c6c9639786
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/software-development/software-development-rest-graphql-debug
---

# Rest Graphql Debug {#rest-graphql-debug}

REST/GraphQL API を調べます。ステータスコード、認証、スキーマ、再現手順まで見ていきます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加で入れるもの — `hermes skills install official/software-development/rest-graphql-debug` で導入します |
| パス | `optional-skills/software-development/rest-graphql-debug` |
| バージョン | `1.2.0` |
| 作者 | eren-karakus0 |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `api`, `rest`, `graphql`, `http`, `debugging`, `testing`, `curl`, `integration` |
| 関連 skill | [`systematic-debugging`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-systematic-debugging/), [`test-driven-development`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-test-driven-development/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# API のテストと調査 {#api-testing-debugging}

REST と GraphQL の調査は Hermes の道具で進めます。`curl` を叩くなら `terminal`、Python の `requests` を使うなら `execute_code`、提供元のドキュメントを読むなら `web_extract` です。直し方を当てにいく前に、どの層で失敗しているのかを切り分けます。

## こんなときに使います {#when-to-use}

- API が想定と違うステータスや本文を返す
- 認証が通らない（トークンを更新したあとの 401/403、OAuth、API キー）
- Postman では動くのにコードからは失敗する
- Webhook やコールバック連携の調査
- API 連携のテストを書く、あるいは見直す
- レート制限やページングでつまずいている

画面の描画、DB クエリのチューニング、DNS やファイアウォールといったインフラの問題には使いません（担当へ引き継いでください）。

## 基本の考え方 {#core-principle}

**層を切り分けてから直します。** 200 OK でも中身のデータが壊れていることはありますし、500 の裏が認証まわりの一文字のタイプミスということもあります。次の順に上から辿ってください。飛ばさないことが大事です。

```
1. Connectivity   → can we reach the host at all?
1.5 Timeouts      → connect-slow vs read-slow?
2. TLS/SSL        → cert valid and trusted?
3. Auth           → credentials correct and unexpired?
4. Request format → payload shape match server expectations?
5. Response parse → does our code accept what came back?
6. Semantics      → does the data mean what we assume?
```

## 5 分でできる出だし {#5-minute-quickstart}

### terminal から REST を叩く {#rest-via-terminal}

```python
# Verbose request/response exchange
terminal('curl -v https://api.example.com/users/1')

# POST with JSON
terminal("""curl -X POST https://api.example.com/users \\
  -H 'Content-Type: application/json' \\
  -H "Authorization: Bearer $TOKEN" \\
  -d '{"name":"test","email":"test@example.com"}'""")

# Headers only
terminal('curl -sI https://api.example.com/health')

# Pretty-print JSON
terminal('curl -s https://api.example.com/users | python3 -m json.tool')
```

### terminal から GraphQL を叩く {#graphql-via-terminal}

```python
terminal("""curl -X POST https://api.example.com/graphql \\
  -H 'Content-Type: application/json' \\
  -H "Authorization: Bearer $TOKEN" \\
  -d '{"query":"{ user(id: 1) { name email } }"}'""")
```

**GraphQL の落とし穴:** クエリが失敗していても、サーバーが HTTP 200 を返してくることがよくあります。ステータスコードがどうであれ、`errors` フィールドは必ず確認してください。

```python
execute_code('''

resp = requests.post(
    "https://api.example.com/graphql",
    json={"query": "{ user(id: 1) { name email } }"},
    headers={"Authorization": f"Bearer {os.environ['TOKEN']}"},
    timeout=10,
)
data = resp.json()
if data.get("errors"):
    for err in data["errors"]:
        print(f"GraphQL error: {err['message']} (path: {err.get('path')})")
print(data.get("data"))
''')
```

### execute_code から Python（requests）を使う {#python-requests-via-executecode}

```python
execute_code('''

resp = requests.get(
    "https://api.example.com/users/1",
    headers={"Authorization": "Bearer <TOKEN>"},
    timeout=(3.05, 30),  # (connect, read)
)
print(resp.status_code, dict(resp.headers))
print(resp.text[:500])
''')
```

## 層をたどって調べる流れ {#layered-debug-flow}

### ステップ 1 — つながるか {#step-1-connectivity}

```python
terminal('nslookup api.example.com')
terminal('curl -v --connect-timeout 5 https://api.example.com/health')
```

うまくいかない原因は、DNS が引けていない、ファイアウォール、VPN が必要、プロキシの設定漏れ、あたりです。

### ステップ 1.5 — タイムアウト {#step-15-timeouts}

*届かない* のか *届いてはいるが遅い* のかを分けます。

```python
terminal('''curl -w "dns:%{time_namelookup}s connect:%{time_connect}s tls:%{time_appconnect}s ttfb:%{time_starttransfer}s total:%{time_total}s\\n" \\
  -o /dev/null -s https://api.example.com/endpoint''')
```

Python では必ずタプル形式のタイムアウトを渡してください。`requests` には既定値がなく、指定しないと永遠に待ち続けます。

```python
execute_code('''

from requests.exceptions import ConnectTimeout, ReadTimeout
try:
    requests.get(url, timeout=(3.05, 30))
except ConnectTimeout:
    print("Cannot reach host — DNS, firewall, VPN")
except ReadTimeout:
    print("Connected but server is slow")
''')
```

見分け方はこうです。`time_connect` が大きければネットワークかファイアウォール、`time_connect` は小さいのに `time_starttransfer` が大きければサーバー側が遅い、ということになります。

### ステップ 2 — TLS/SSL {#step-2-tlsssl}

```python
terminal('curl -vI https://api.example.com 2>&1 | grep -E "SSL|subject|expire|issuer"')
```

よくあるのは、証明書の期限切れ、自己署名、ホスト名の不一致、CA バンドルが入っていない、といったものです。`-k` はその場の調査だけにとどめ、コードに書き込まないでください。

### ステップ 3 — 認証 {#step-3-authentication}

```python
# Token validity check
terminal('curl -s -o /dev/null -w "%{http_code}\\n" -H "Authorization: Bearer $TOKEN" https://api.example.com/me')

# Decode JWT exp claim — handles base64url padding correctly
execute_code('''

tok = os.environ["TOKEN"]
payload = tok.split(".")[1]
payload += "=" * (-len(payload) % 4)
print(json.dumps(json.loads(base64.urlsafe_b64decode(payload)), indent=2))
''')
```

確認する点:
- トークンの期限が切れていないか（JWT の `exp` クレーム）
- 方式は合っているか。Bearer か Basic か Token か `X-Api-Key` か
- 環境は合っているか。検証用のキーを本番に使ってしまうのは定番です
- API キーはヘッダーで渡すのか、クエリパラメータ（`?api_key=…`）なのか

### ステップ 4 — リクエストの形 {#step-4-request-format}

```python
terminal("""curl -v -X POST https://api.example.com/endpoint \\
  -H 'Content-Type: application/json' \\
  -d '{"key":"value"}' 2>&1""")
```

**Content-Type と本文の食い違い — 静かに 415/400 を招きます:**

```python
# WRONG — data= sends form-encoded, header lies
requests.post(url, data='{"k":"v"}', headers={"Content-Type": "application/json"})

# RIGHT — json= auto-sets header AND serializes
requests.post(url, json={"k": "v"})

# WRONG — Accept says XML, code calls .json()
requests.get(url, headers={"Accept": "text/xml"})

# RIGHT — let requests build multipart with boundary
requests.post(url, files={"file": open("doc.pdf", "rb")})
```

よくあるのは、フォーム形式と JSON の取り違え、必須項目の抜け、HTTP メソッドの間違い、クエリパラメータのエンコード漏れです。

### ステップ 5 — レスポンスの読み取り {#step-5-response-parsing}

`.json()` を呼ぶ前に、必ず content-type を見てください。

```python
execute_code('''

resp = requests.post(url, json=payload, timeout=10)
print(f"status={resp.status_code}")
print(f"headers={dict(resp.headers)}")
ct = resp.headers.get("Content-Type", "")
if "application/json" in ct:
    print(resp.json())
else:
    print(f"unexpected content-type {ct!r}, body={resp.text[:500]!r}")
''')
```

JSON のはずが HTML のエラーページだった、本文が空だった、文字コードが違った、といった失敗を拾えます。

### ステップ 6 — 意味が合っているか {#step-6-semantic-validation}

読み取り自体はうまくいった。では、そのデータは *正しい* でしょうか。

- `"status": "active"` は、コードが思っている意味と同じですか
- レスポンスの ID は、要求したものと一致していますか
- 時刻は想定したタイムゾーンですか
- ページングは全件を返していますか。1 ページ目だけではありませんか

## HTTP ステータス別の対処 {#http-status-playbook}

### 401 Unauthorized — 資格情報が無いか正しくない {#401-unauthorized-credentials-missing-or-invalid}

1. `Authorization` ヘッダーは本当に付いていますか（`curl -v` で確かめます）
2. トークンは正しく、期限内ですか
3. 認証方式は合っていますか（`Bearer` か `Basic` か `Token` か）
4. ヘッダーではなくクエリパラメータ（`?api_key=…`）を使う API もあります

### 403 Forbidden — 認証は通ったが権限がない {#403-forbidden-authenticated-but-not-authorized}

1. トークンに必要なスコープや権限はありますか
2. その資源は別のアカウントのものではありませんか
3. IP の許可リストで弾かれていませんか
4. ブラウザからなら CORS ではありませんか（`Access-Control-Allow-Origin` を確認）

### 404 Not Found — 資源が無いか URL が違う {#404-not-found-resource-doesnt-exist-or-url-is-wrong}

1. パスは合っていますか（末尾のスラッシュ、打ち間違い、バージョンの接頭辞）
2. その ID の資源は存在しますか
3. API のバージョンは合っていますか（`/v1/` と `/v2/`）
4. ベース URL は合っていますか（検証環境と本番）

### 409 Conflict — 状態のぶつかり {#409-conflict-state-collision}

1. すでに同じものが作られていませんか（作成の重複）
2. `ETag` / `If-Match` が古くなっていませんか
3. 別の処理が同時に書き換えていませんか

### 422 Unprocessable Entity — JSON は正しいがデータが不正 {#422-unprocessable-entity-valid-json-invalid-data}

たいていはエラー本文が問題の項目を教えてくれます。次を確認します。
- 項目の型（文字列か整数か、日付の書式）
- 必須か任意か
- 列挙値が許された範囲に入っているか

### 429 Too Many Requests — レート制限 {#429-too-many-requests-rate-limited}

`Retry-After` と `X-RateLimit-*` のヘッダーを確認します。待ち時間を倍にしながら再試行するなら次のようにします。

```python
execute_code('''

def with_backoff(method, url, **kwargs):
    for attempt in range(5):
        resp = requests.request(method, url, **kwargs)
        if resp.status_code != 429:
            return resp
        wait = int(resp.headers.get("Retry-After", 2 ** attempt))
        time.sleep(wait)
    return resp
''')
```

### 5xx — サーバー側の問題で、たいていこちらの責任ではない {#5xx-server-side-usually-not-your-fault}

- **500** — サーバーの不具合です。相関 ID を控えて提供元へ報告します。
- **502** — 上流が落ちています。待ってから再試行します。
- **503** — 過負荷かメンテナンス中です。稼働状況のページを確認します。
- **504** — 上流でタイムアウトしています。送る量を減らすか、待ち時間を延ばします。

5xx はいずれも、待ち時間にゆらぎを持たせて再試行し、続くようなら通知を出します。

## ページングと冪等性 {#pagination-idempotency}

**ページング。** *全件* 取れているかを確かめます。`next_cursor`、`next_page`、`total_count` あたりを探してください。方式は 2 つあります。
- オフセット方式（`?limit=100&offset=200`）— 単純ですが、途中でデータが動くと取りこぼします。
- カーソル方式（`?cursor=abc123`）— 更新の多いデータや大きなデータではこちらが向いています。

**冪等性。** 冪等でない操作（POST）には `Idempotency-Key: <uuid>` を付けて、再試行で二重に課金・二重に作成されないようにします。決済や注文では必須です。

## 契約の検証 {#contract-validation}

スキーマのずれを、本番に出る前に捕まえます。

```python
execute_code('''

def validate_user(data: dict) -> list[str]:
    errors = []
    required = {"id": int, "email": str, "created_at": str}
    for field, expected in required.items():
        if field not in data:
            errors.append(f"missing field: {field}")
        elif not isinstance(data[field], expected):
            errors.append(f"{field}: want {expected.__name__}, got {type(data[field]).__name__}")
    return errors

resp = requests.get(f"{BASE}/users/1", headers=HEADERS, timeout=10)
issues = validate_user(resp.json())
if issues:
    print(f"contract violations: {issues}")
''')
```

API を更新したあと、新しい外部サービスをつなぐとき、あるいは CI の簡易チェックとして走らせます。

## 相関 ID {#correlation-ids}

提供元のリクエスト ID は必ず控えておきます。問い合わせの近道になります。

```python
execute_code('''

resp = requests.post(url, json=payload, headers=headers, timeout=10)
request_id = (
    resp.headers.get("X-Request-Id")
    or resp.headers.get("X-Trace-Id")
    or resp.headers.get("CF-Ray")  # Cloudflare
)
if resp.status_code >= 400:
    print(f"failed status={resp.status_code} req_id={request_id} ts={resp.headers.get('Date')}")
''')
```

**提供元への不具合報告のひな形:**

```
Endpoint:    POST /api/v1/orders
Request ID:  req_abc123xyz
Timestamp:   2026-03-17T14:30:00Z
Status:      500
Expected:    201 with order object
Actual:      500 {"error":"internal server error"}
Repro:       curl -X POST … (auth: <REDACTED>)
```

## 再発防止テストのひな形 {#regression-test-template}

これを `tests/` に置いて、`terminal('pytest tests/test_api_smoke.py -v')` で走らせます。

```python

BASE_URL = os.environ.get("API_BASE_URL", "https://api.example.com")
TOKEN    = os.environ.get("API_TOKEN", "")
HEADERS  = {"Authorization": f"Bearer {TOKEN}"}

class TestAPISmoke:
    def test_health(self):
        resp = requests.get(f"{BASE_URL}/health", timeout=5)
        assert resp.status_code == 200

    def test_list_users_returns_array(self):
        resp = requests.get(f"{BASE_URL}/users", headers=HEADERS, timeout=10)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data.get("data", data), list)

    def test_get_user_required_fields(self):
        resp = requests.get(f"{BASE_URL}/users/1", headers=HEADERS, timeout=10)
        assert resp.status_code in (200, 404)
        if resp.status_code == 200:
            user = resp.json()
            assert "id" in user and "email" in user

    def test_invalid_auth_returns_401(self):
        resp = requests.get(
            f"{BASE_URL}/users",
            headers={"Authorization": "Bearer invalid-token"},
            timeout=10,
        )
        assert resp.status_code == 401
```

## 安全のために {#security}

### トークンの扱い {#token-handling}
- トークンをそのままログに出さないでください。`Bearer <REDACTED>` のように伏せます。
- スクリプトにトークンを直接書かないでください。環境変数（`os.environ["API_TOKEN"]`）か `${HERMES_HOME:-~/.hermes}/.env` から読みます。
- ログやエラーメッセージ、git の履歴にトークンが出てしまったら、すぐに入れ替えます。

### 安全なログの取り方 {#safe-logging}

```python
def redact_auth(headers: dict) -> dict:
    sensitive = {"authorization", "x-api-key", "cookie", "set-cookie"}
    return {k: ("<REDACTED>" if k.lower() in sensitive else v) for k, v in headers.items()}
```

### 漏れていないかの確認 {#leak-checklist}

- [ ] **URL に資格情報が入っていないか。** クエリ文字列の API キーは、サーバーのログやブラウザの履歴、リファラーに残ります。ヘッダーで渡してください。
- [ ] **エラーの応答に個人情報が入っていないか。** `404 on /users/123` が、そのユーザーの有無を漏らしてはいけません（総当たりの手がかりになります）。
- [ ] **本番でスタックトレースが出ていないか。** 500 でファイルのパスやフレームワークの版が漏れないようにします。
- [ ] **内部のホスト名や IP が出ていないか。** `10.x.x.x` や `internal-api.corp.local` がエラー本文に混じっていないか見ます。
- [ ] **トークンがそのまま返ってきていないか。** エラーの詳細に認証トークンを含める API もあります。含まれていないか確かめます。
- [ ] **`Server` や `X-Powered-By` が饒舌でないか。** 使っている技術が漏れます。安全面の見直しのときに控えておきます。

## Hermes の道具の使い分け {#hermes-tool-patterns}

### terminal — curl、dig、openssl 向け {#terminal-for-curl-dig-openssl}

```python
terminal('curl -sI https://api.example.com')
terminal('openssl s_client -connect api.example.com:443 -servername api.example.com </dev/null 2>/dev/null | openssl x509 -noout -dates')
```

### execute_code — 複数手順の Python 処理向け {#executecode-for-multi-step-python-flows}

認証 → 取得 → ページング → 検証、と処理がまたがるときは `execute_code` を使います。スクリプトの中では変数がそのまま引き継がれ、結果は標準出力に出るので、大量のトークンで文脈が埋まる心配もありません。

```python
execute_code('''

token = os.environ["API_TOKEN"]
base  = "https://api.example.com"
H     = {"Authorization": f"Bearer {token}"}

# 1. auth
me = requests.get(f"{base}/me", headers=H, timeout=10)
print(f"auth {me.status_code}")

# 2. paginate
all_users, cursor = [], None
while True:
    params = {"cursor": cursor} if cursor else {}
    r = requests.get(f"{base}/users", headers=H, params=params, timeout=10)
    body = r.json()
    all_users.extend(body["data"])
    cursor = body.get("next_cursor")
    if not cursor:
        break
print(f"users={len(all_users)}")
''')
```

### web_extract — 提供元の API ドキュメント向け {#webextract-for-vendor-api-docs}

当て推量で進めず、調べている端点の仕様をそのまま取ってきます。

```python
web_extract(urls=["https://docs.example.com/api/v1/users"])
```

### delegate_task — CRUD をひととおり試すとき {#delegatetask-for-full-crud-test-sweeps}

```python
delegate_task(
    goal="Test all CRUD endpoints for /api/v1/users",
    context="""
Follow the rest-graphql-debug skill (optional-skills/software-development/rest-graphql-debug).
Base URL: https://api.example.com
Auth: Bearer token from API_TOKEN env var.

For each verb (POST, GET, PATCH, DELETE):
  - happy path: assert status + response schema
  - error cases: 400, 404, 422
  - log a repro curl for any failure (redact tokens)

Output: pass/fail per endpoint + correlation IDs for failures.
""",
    toolsets=["terminal", "file"],
)
```

## 報告の書き方 {#output-format}

分かったことを伝えるときは、次の形にします。

```
## Finding
Endpoint: POST /api/v1/users
Status:   422 Unprocessable Entity
Req ID:   req_abc123xyz

## Repro
curl -X POST https://api.example.com/api/v1/users \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <REDACTED>' \
  -d '{"name":"test"}'

## Root Cause
Missing required field `email`. Server validation rejects before processing.

## Fix
-d '{"name":"test","email":"test@example.com"}'
```

## 関連 {#related}

- `systematic-debugging` — 失敗している層を切り分けたら、こちらでコードの根本原因を追います
- `test-driven-development` — 直したものを出す前に、再発防止のテストを書きます
