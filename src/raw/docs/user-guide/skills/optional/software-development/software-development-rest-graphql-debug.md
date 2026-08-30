---
title: "Rest Graphql Debug — REST/GraphQL API を調べる: ステータスコード、認証、スキーマ、再現手順"
description: "REST/GraphQL API を調べる: ステータスコード、認証、スキーマ、再現手順"
upstream_path: user-guide/skills/optional/software-development/software-development-rest-graphql-debug.md
upstream_blob: 616274754c6df575b91f145827c488b258ec7f39
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/software-development/software-development-rest-graphql-debug
---

# Rest Graphql Debug {#rest-graphql-debug}

REST/GraphQL API を調べます。ステータスコード、認証、スキーマ、再現手順を扱います。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/software-development/rest-graphql-debug` で入れます |
| パス | `optional-skills/software-development\rest-graphql-debug` |
| バージョン | `1.2.0` |
| 作者 | eren-karakus0 |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `api`, `rest`, `graphql`, `http`, `debugging`, `testing`, `curl`, `integration` |
| 関連 skill | [`systematic-debugging`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-systematic-debugging/), [`test-driven-development`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-test-driven-development/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# API のテストとデバッグ {#api-testing-debugging}

REST と GraphQL の調査は Hermes のツールで進めます。`curl` を打つなら `terminal`、Python の `requests` を動かすなら `execute_code`、提供元のドキュメントを読むなら `web_extract` です。修正を当てずっぽうで始める前に、どの層で失敗しているかを切り分けます。

## こんなときに使います {#when-to-use}

- API が思っていないステータスや本文を返す
- 認証が通らない（トークン更新後の 401/403、OAuth、API キー）
- Postman では動くのにコードからだと失敗する
- Webhook / コールバック連携の調査
- API 連携のテストを書く、あるいは見直す
- レート制限やページングでつまずいている

画面表示の不具合、DB クエリのチューニング、DNS やファイアウォールといったインフラ側は対象外です（担当へ引き継いでください）。

## 基本の考え方 {#core-principle}

**層を切り分けてから直します。** 200 OK でも中身のデータが壊れていることはありますし、500 の原因が認証情報の一文字違いということもあります。次の順に一段ずつ辿り、途中を飛ばさないでください。

```
1. Connectivity   → can we reach the host at all?
1.5 Timeouts      → connect-slow vs read-slow?
2. TLS/SSL        → cert valid and trusted?
3. Auth           → credentials correct and unexpired?
4. Request format → payload shape match server expectations?
5. Response parse → does our code accept what came back?
6. Semantics      → does the data mean what we assume?
```

## 5 分で始める {#5-minute-quickstart}

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
terminal('curl -s https://api.example.com/users | python -m json.tool')
```

### terminal から GraphQL を叩く {#graphql-via-terminal}

```python
terminal("""curl -X POST https://api.example.com/graphql \\
  -H 'Content-Type: application/json' \\
  -H "Authorization: Bearer $TOKEN" \\
  -d '{"query":"{ user(id: 1) { name email } }"}'""")
```

**GraphQL の落とし穴:** クエリが失敗していてもサーバーが HTTP 200 を返すことがよくあります。ステータスコードにかかわらず、必ず `errors` フィールドを確認してください。

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

### execute_code から Python（requests）を動かす {#python-requests-via-executecode}

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

## 層をたどる調査の流れ {#layered-debug-flow}

### ステップ 1 — 到達できるか {#step-1-connectivity}

```python
terminal('nslookup api.example.com')
terminal('curl -v --connect-timeout 5 https://api.example.com/health')
```

よくある原因: DNS が引けない、ファイアウォール、VPN が必要、プロキシ未設定。

### ステップ 1.5 — タイムアウト {#step-15-timeouts}

*届かない* のか *届くが遅い* のかを見分けます。

```python
terminal('''curl -w "dns:%{time_namelookup}s connect:%{time_connect}s tls:%{time_appconnect}s ttfb:%{time_starttransfer}s total:%{time_total}s\\n" \\
  -o /dev/null -s https://api.example.com/endpoint''')
```

Python では必ずタプルでタイムアウトを渡してください。`requests` には既定値がなく、いつまでも待ち続けます。

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

読み方: `time_connect` が大きければネットワークかファイアウォール、`time_connect` は小さいのに `time_starttransfer` が大きければサーバーが遅いということです。

### ステップ 2 — TLS/SSL {#step-2-tlsssl}

```python
terminal('curl -vI https://api.example.com 2>&1 | grep -E "SSL|subject|expire|issuer"')
```

よくある原因: 証明書の期限切れ、自己署名、ホスト名の不一致、CA バンドルの不足。`-k` はその場の確認だけに使い、コードには残さないでください。

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
- 認証方式は合っているか。Bearer か Basic か Token か `X-Api-Key` か
- 環境は合っているか。検証用のキーを本番に使うのはよくある間違いです
- API キーはヘッダーで渡すのか、クエリパラメータ（`?api_key=…`）なのか

### ステップ 4 — リクエストの形式 {#step-4-request-format}

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

よくあるのは、フォームエンコードと JSON の取り違え、必須項目の欠落、HTTP メソッドの間違い、エンコードされていないクエリパラメータです。

### ステップ 5 — レスポンスの解釈 {#step-5-response-parsing}

`.json()` を呼ぶ前に、必ず content-type を確認します。

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

よくある原因: JSON のつもりが HTML のエラーページ、本文が空、文字コードの違い。

### ステップ 6 — 中身の妥当性 {#step-6-semantic-validation}

きれいに解釈できたとして、そのデータは *正しい* でしょうか。

- `"status": "active"` はコードが想定している意味と同じですか
- レスポンスの ID は、要求した ID と一致していますか
- 時刻は想定したタイムゾーンですか
- ページングの結果は全件ですか、1 ページ目だけですか

## HTTP ステータス別の対応 {#http-status-playbook}

### 401 Unauthorized — 認証情報が無いか正しくない {#401-unauthorized-credentials-missing-or-invalid}

1. `Authorization` ヘッダーは実際に送られていますか（`curl -v` で確かめます）
2. トークンは正しく、期限内ですか
3. 認証方式は合っていますか（`Bearer` / `Basic` / `Token`）
4. ヘッダーではなくクエリパラメータ（`?api_key=…`）を使う API もあります。

### 403 Forbidden — 認証は通ったが権限がない {#403-forbidden-authenticated-but-not-authorized}

1. トークンに必要なスコープや権限はありますか
2. そのリソースは別のアカウントのものではありませんか
3. IP の許可リストで弾かれていませんか
4. ブラウザからなら CORS ではありませんか（`Access-Control-Allow-Origin` を確認します）

### 404 Not Found — リソースが無いか URL が違う {#404-not-found-resource-doesnt-exist-or-url-is-wrong}

1. パスは正しいですか（末尾のスラッシュ、打ち間違い、バージョンの接頭辞）
2. そのリソース ID は存在しますか
3. API のバージョンは合っていますか（`/v1/` と `/v2/`）
4. ベース URL は合っていますか（検証環境と本番）

### 409 Conflict — 状態がぶつかっている {#409-conflict-state-collision}

1. すでに同じリソースがありませんか（作成の重複）
2. `ETag` / `If-Match` が古くありませんか
3. 別の処理が同時に更新していませんか

### 422 Unprocessable Entity — JSON は正しいがデータが不正 {#422-unprocessable-entity-valid-json-invalid-data}

エラー本文にたいてい問題の項目名が書いてあります。確認する点:
- 項目の型（文字列か整数か、日付の書式）
- 必須か任意か
- 列挙値が許された範囲に入っているか

### 429 Too Many Requests — レート制限 {#429-too-many-requests-rate-limited}

`Retry-After` と `X-RateLimit-*` のヘッダーを確認します。待ち時間を伸ばしながら再試行する例です。

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

### 5xx — サーバー側の問題で、たいていはこちらの責任ではない {#5xx-server-side-usually-not-your-fault}

- **500** — サーバーの不具合。相関 ID を控えて提供元に報告します。
- **502** — 上流が落ちています。待ってから再試行します。
- **503** — 過負荷またはメンテナンス。稼働状況のページを確認します。
- **504** — 上流のタイムアウト。送るデータを減らすか、タイムアウトを延ばします。

5xx はいずれも、待ち時間をばらつかせて再試行し、続くようなら通知を上げます。

## ページングと冪等性 {#pagination-idempotency}

**ページング。** *全件* 取れているかを確かめます。`next_cursor`、`next_page`、`total_count` を探してください。方式は 2 つあります。
- オフセット方式（`?limit=100&offset=200`）— 単純ですが、データが動くと取りこぼすことがあります。
- カーソル方式（`?cursor=abc123`）— 更新が多いデータや大量データではこちらが向いています。

**冪等性。** 冪等でない操作（POST）には `Idempotency-Key: <uuid>` を付け、再試行で二重に課金・二重に作成されないようにします。決済や注文では必須です。

## スキーマの検証 {#contract-validation}

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

API の更新後、新しい外部サービスをつなぐとき、あるいは CI の簡易チェックとして実行します。

## 相関 ID {#correlation-ids}

提供元のリクエスト ID は必ず控えます。サポートに問い合わせるときの最短経路です。

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

これを `tests/` に置き、`terminal('pytest tests/test_api_smoke.py -v')` で実行します。

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

## セキュリティ {#security}

### トークンの扱い {#token-handling}
- トークンを丸ごとログに出さないでください。`Bearer <REDACTED>` のように伏せます。
- スクリプトにトークンを直書きしないでください。環境変数（`os.environ["API_TOKEN"]`）か `${HERMES_HOME:-~/.hermes}/.env` から読みます。
- ログ、エラーメッセージ、git の履歴にトークンが出てしまったら、すぐに入れ替えます。

### 安全なログ出力 {#safe-logging}

```python
def redact_auth(headers: dict) -> dict:
    sensitive = {"authorization", "x-api-key", "cookie", "set-cookie"}
    return {k: ("<REDACTED>" if k.lower() in sensitive else v) for k, v in headers.items()}
```

### 情報漏れの確認項目 {#leak-checklist}

- [ ] **URL に認証情報が入っていないか。** クエリ文字列の API キーは、サーバーのログ、ブラウザの履歴、リファラーに残ります。ヘッダーを使ってください。
- [ ] **エラー応答に個人情報が入っていないか。** `404 on /users/123` から、そのユーザーの有無が読み取れてはいけません（存在の探り出し）。
- [ ] **本番でスタックトレースを返していないか。** 500 でファイルパスやフレームワークのバージョンを漏らさないようにします。
- [ ] **内部のホスト名や IP が出ていないか。** エラー本文の `10.x.x.x` や `internal-api.corp.local` などです。
- [ ] **トークンがそのまま返ってきていないか。** エラーの詳細に認証トークンを含める API もあります。含まれていないか確かめます。
- [ ] **`Server` / `X-Powered-By` が詳しすぎないか。** 構成情報が漏れます。セキュリティ確認の項目に入れておきます。

## Hermes のツールの使い分け {#hermes-tool-patterns}

### terminal — curl、dig、openssl を使う {#terminal-for-curl-dig-openssl}

```python
terminal('curl -sI https://api.example.com')
terminal('openssl s_client -connect api.example.com:443 -servername api.example.com </dev/null 2>/dev/null | openssl x509 -noout -dates')
```

### execute_code — 複数手順の Python 処理に {#executecode-for-multi-step-python-flows}

認証 → 取得 → ページング → 検証と手順が続く調査では `execute_code` を使います。変数はスクリプト内で保持され、結果は標準出力に出るので、トークンが会話の履歴を埋めてしまう心配もありません。

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

### web_extract — 提供元の API ドキュメントを読む {#webextract-for-vendor-api-docs}

推測で進めず、調べているエンドポイントの仕様をそのまま取ってきます。

```python
web_extract(urls=["https://docs.example.com/api/v1/users"])
```

### delegate_task — CRUD をひととおり試す {#delegatetask-for-full-crud-test-sweeps}

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

調べた結果を伝えるときの形です。

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

- `systematic-debugging` — 失敗している層が絞れたら、自分のコードの根本原因を追います
- `test-driven-development` — 修正を出す前に、再発防止のテストを書きます
