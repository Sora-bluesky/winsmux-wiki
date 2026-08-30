---
title: "Har Derived Api Client — サイトの XHR を HAR に記録し、そこから HTTP クライアントを起こす"
description: "サイトの XHR を HAR に記録し、そこから HTTP クライアントを起こす"
upstream_path: user-guide/skills/optional/web-development/web-development-har-derived-api-client.md
upstream_blob: 01024b762ec0fcda410dbb129a90f1ef32a4eb40
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/web-development/web-development-har-derived-api-client
---

# Har Derived Api Client {#har-derived-api-client}

サイトの XHR を HAR に記録して、そこから HTTP クライアントを起こします。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/web-development/har-derived-api-client` で導入します |
| パス | `optional-skills/web-development\har-derived-api-client` |
| バージョン | `0.1.0` |
| 作者 | Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Browser`, `HAR`, `API`, `Reverse-Engineering`, `Playwright` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# HAR-Derived API Client {#har-derived-api-client}

本物のブラウザーでサイトを一度だけ操作し、そのあいだの通信を HAR ファイルに
記録します。その HAR から、サイトが内部で使っている JSON の API を割り出せば、
あとはふつうの HTTP で直接呼べます。毎回ブラウザーを動かすより、ずっと安く速く
済みます。出どころは Jared Longster が編み出した手で、Dax（thdxr）が広めました。
これは記録して再現するだけの手法です。認証を回避したり、CAPTCHA を解いたり、
ボット判定を突破したりはしません。ログインが要るサイトなら、そのヘッダーや
Cookie をそのまま持ち越すのであって、偽造するのではありません。

スクリプトは標準ライブラリーと Playwright だけで動きます。記録には Playwright が
要りますが、割り出しは標準ライブラリーだけで、再現には `requests` か `httpx`
（あるいは `curl`）があれば足ります。

**Hermes のブラウザーの経路すべて**に対応します。既定のローカルの
`browser_navigate` はもちろん、クラウドやリモートの各種（Browserbase、
Browser-Use、Firecrawl）、そして `/browser connect` でつなぐ CDP の窓口も含みます。
記録用のスクリプトが 2 本あるのは、自分で起動したブラウザーと、CDP でつないだ
ブラウザーとで HAR の取り方が違うからです（「実行のしかた」を参照）。

## こんなときに使います {#when-to-use}

- 「&lt;website> 用の CLI やクライアントを作って」— クリックを自動化するのではなく、API を割り出します。
- 「このサイトに公開 API はないけれど、ページは明らかに JSON を取ってきている」
- 同じ問い合わせで `browser_navigate` を何度も回そうとしているとき。手を止めて、窓口を一度だけ割り出してください。
- 入力補完・検索・フィード・購入手続きの XHR を読み解きたいとき。
- クラウド（Browserbase / Browser-Use / Firecrawl）や `/browser connect` でセッションを記録済みで、ブラウザーを借り直さずに API がほしいとき。

## 事前に必要なもの {#prerequisites}

- Playwright とブラウザー本体（記録のときだけ）:
  - `pip install playwright` のあと `playwright install chromium`
  - （システムの Playwright が `~/.cache/ms-playwright` にブラウザーを持っているなら、それを使い回してください。）
- 再現には `requests` か `httpx`（標準ライブラリーの `urllib` でも動きます）。
- API キーは要りません。クライアントに必要なキーやトークンは、HAR に記録されたものです。
- CDP を使う場合（`har_capture_cdp.py`）は、到達できる CDP の窓口が要ります。Hermes では
  `/browser connect` を実行すると今の窓口が表示されます。設定の `BROWSER_CDP_URL`
  や `browser.cdp_url` を読んでも構いません。クラウド側は `cdpUrl` や `connectUrl` で公開しています。

## 実行のしかた {#how-to-run}

スクリプトはこの skill の `scripts/` にあり、`terminal` ツールから呼び出します。
**経路に合わせて記録用のスクリプトを選んでください。** ここでつまずきがちです:

| ブラウザーの経路 | Hermes からの届き方 | 記録に使うもの |
|---|---|---|
| ローカルの `browser_navigate`（既定。agent-browser/Playwright） | ローカルで起動する | `har_capture.py` |
| Camofox（`CAMOFOX_URL` を設定） | ローカルの REST/CDP | CDP を公開していれば `har_capture_cdp.py`、なければ自分で操作します |
| Browserbase / Browser-Use / Firecrawl（クラウド） | **CDP**（`cdpUrl`） | `har_capture_cdp.py` |
| `/browser connect <url>` / `BROWSER_CDP_URL` | **CDP** | `har_capture_cdp.py` |

目安はこうです。**Hermes が自分でブラウザーを*起動した*なら `har_capture.py`、
CDP で*つないだ*なら `har_capture_cdp.py`。** `har_capture.py` は Playwright の
`record_har_path` を使いますが、これは自分の持ち物のコンテキストでしか働きません。
`har_capture_cdp.py` は `connect_over_cdp()` でつなぎ、
`page.on("request"/"response")` のイベントから HAR を組み立てます。つないだ
ブラウザーでは `record_har_path` が使えないからです。

どちらの経路でも、そのあとは共通です:

- `har_to_client.py` — HAR を XHR/fetch/JSON に絞り込み、窓口ごとにまとめて、パラメーター・ヘッダー・本文と、再現のための手がかり（User-Agent / Cookie / 認証）を表示します。

パスはこの skill のディレクトリーを基準に組み立ててください。基本の流れはこうです:

```bash
# 1a. Capture, LOCAL browser (Hermes launched it)
python3 scripts/har_capture.py "https://SITE/" out.har \
  --action "fill:input[name=search]:my query" --action "sleep:3" --wait 2

# 1b. Capture, CDP browser (cloud backend or /browser connect)
#     get the endpoint from /browser connect or BROWSER_CDP_URL
python3 scripts/har_capture_cdp.py "ws://HOST/devtools/browser/..." out.har \
  --goto "https://SITE/" --action "fill:input[name=search]:my query" \
  --action "sleep:3" --wait 2

# 2. Derive — read the endpoints out of the HAR
python3 scripts/har_to_client.py out.har --host SITE --max-body 400

# 3. Replay — write a tiny client from the printed endpoint (see Procedure)
```

## 早見表 {#quick-reference}

```
har_capture.py <url> <out.har> [--wait S] [--headed] [--action SPEC ...]
  action SPEC:  fill:SELECTOR:TEXT | press:SELECTOR:KEY | click:SELECTOR
                goto:URL | sleep:SECONDS      (run in order after page load)
  use when Hermes LAUNCHED the browser (local browser_navigate default)

har_capture_cdp.py <cdp_url> <out.har> [--goto URL] [--wait S] [--action SPEC ...]
  same action SPEC; attaches to an existing CDP browser and does NOT close it
  use for cloud backends (Browserbase/Browser-Use/Firecrawl) & /browser connect

har_to_client.py <in.har> [--host SUBSTR] [--include-static] [--max-body N]
  default: keeps only XHR/fetch/JSON; --host narrows to one domain
  prints per endpoint: query params, non-boring req headers, req body sample,
                       response status/content-type + body sample
  prints "### Replay hints": the browser User-Agent, cookie/auth presence
```

## 手順 {#procedure}

0. **経路に合わせて記録用のスクリプトを選びます**（「実行のしかた」の表を参照）。ローカルで起動したなら `har_capture.py`、CDP で届いているなら `har_capture_cdp.py` です。Hermes では、クラウドやリモートを使っているときに `/browser connect` が CDP の窓口を教えてくれます。
1. **操作を見つけます。** `browser_navigate`（または `--headed` を付けた記録）でサイトを開き、どのセレクターに入力・クリックすればよいかを確かめ、開発者ツールのネットワークで JSON の XHR が飛ぶことを確認します。
2. **HAR を記録します。** `terminal` ツールから実行してください。目当ての通信に届くよう `--action` を並べます。入力欄を `fill` してから、遅らせて飛ぶ XHR に間に合うだけ `sleep` し、最後には必ず `--wait` を置いて、遅れて返ってくる応答も書き出させます。どちらの記録用スクリプトも応答の本文を埋め込むので、割り出したクライアントは本物のデータの形を見られます。
3. **割り出します。** `har_to_client.py --host <domain>` を実行し、メソッド、URL とパスの型（数字や UUID の区間は `{id}` にまとめられます）、クエリーのパラメーター、リクエスト本文の JSON、そして `### Replay hints` の欄を読み取ります。
4. **クライアントを書きます。** 同じメソッド・パス・クエリー・本文で、リクエストをそっくり再現します。サイトが実際に必要とするヘッダーを送ってください。少なくとも、再現の手がかりにある **User-Agent** はそのまま写します。Cookie や認証・トークンのヘッダーが挙がっていれば、それも一緒に送ります。
5. **ブラウザーなしで試します。** `terminal` ツールからクライアントを実行し、ブラウザーで見えたのと同じデータが返ることを確かめます。ここが狙いどおりの成果です。もうブラウザーは要りません。
6. **（任意）CLI に仕立てます。** 割り出した呼び出しを小さな `argparse` のスクリプトで包みます。たとえば `search.py "frank herbert"` のように。

実際にやってみた例（Wikipedia の search-title を割り出して、そのまま呼んだもの）:

```python

r = requests.get(
    "https://en.wikipedia.org/w/rest.php/v1/search/title",
    params={"q": "frank herbert", "limit": 5},
    headers={"accept": "application/json",
             "User-Agent": "Mozilla/5.0 ... Chrome/131 Safari/537.36"},  # from HAR
    timeout=15,
)
for p in r.json()["pages"]:
    print(p["title"], "-", p.get("description"))
```

## つまずきどころ {#pitfalls}

- **ライブラリー既定の User-Agent は 403 になります。** 多くのサイト（Wikipedia、Cloudflare 越しの API など）は `python-requests/x.y` を弾きます。再現の手がかりにあるブラウザーの UA を必ず送ってください。ブラウザーでは成功したのにクライアントが失敗する原因の第 1 位がこれです。
- **`--action` が 1 つ失敗すると、HAR が書き出される前に止まります。** ファイルは残りません。セレクターでエラーになったなら、その回は何も生んでいないので、セレクターを直して（`--headed` で目視すると早いです）やり直してください。存在しない HAR を調べても仕方ありません。
- **サーバー側で組み立てるページには、割り出せる XHR がありません。** `har_to_client.py` は「No API-looking entries」と表示します。データは HTML に入って届いているので、そこから取り出すか、JSON を取りに行く操作を探してください。
- **入力補完のような遅らせて飛ぶ XHR には、実際の待ちが要ります。** `fill` のあとに `--action "sleep:3"` を足してください。入力しただけでは、HAR を閉じる時点でまだリクエストが飛んでいません。
- **認証やセッションの窓口**には、記録された `Cookie` や `Authorization` のヘッダーが要りますし、それらは期限切れになります。割り出したクライアントの寿命は、その資格情報の寿命どまりです。401 が返るようになったら記録し直してください。HAR には生の秘密が入っています。`out.har` は機密として扱い、割り出しが済んだら消してください。
- **`record_har_content="embed"` は HAR を大きくします。** 表示する量は `--max-body` で抑えてください。ファイル自体も、画像や動画の多いページでは大きくなります。
- **窓口は移り変わります。** サイトは内部の API を予告なく変えます。クライアントが動かなくなったら、URL を手で直すのではなく、記録から割り出しまでの流れをもう一度回してください。
- **記録用のスクリプトを間違えると、HAR が空になるか、そもそもできません。** クラウドや CDP の経路で `har_capture.py` を使っても何も記録されません（意図したものではなく、自分でローカルにブラウザーを立ち上げてしまうためです）。`har_capture_cdp.py` には窓口が要ります。Hermes では `/browser connect` か `BROWSER_CDP_URL` から取ってください。経路と記録用のスクリプトを合わせましょう（「実行のしかた」の表）。
- **ヘッドレス Chrome の UA は目立ちます。** ローカルや agent-browser での記録では `HeadlessChrome/...` という User-Agent になり、この「Headless」の文字を見ているサイトがあります。クラウド（Browserbase / Browser-Use）は本物のデスクトップ版 Chrome の UA を送るので、そこから割り出したクライアントのほうが素直に動きます。ブラウザーでは通ったのにヘッドレス由来のクライアントが 403 になるなら、窓口が変わったと決めつける前に、「Headless」入りの UA をふつうの Chrome の UA に差し替えてみてください。
- **CDP での記録はブラウザーを閉じません。** `har_capture_cdp.py` は自分の持ち物でないブラウザーにつなぎ、そのまま動かし続けます。Hermes が面倒を見ているクラウドやリモートのセッションでは、これが正しい振る舞いです。閉じる処理を足さず、持ち主側に片づけさせてください。

## 検証 {#verification}

API キーなしで、実際のサイト相手に端から端まで確かめます:

```bash
python3 scripts/har_capture.py "https://en.wikipedia.org/wiki/Main_Page" /tmp/wiki.har \
  --action "fill:input[name=search]:dune messiah" --action "sleep:3" --wait 2
python3 scripts/har_to_client.py /tmp/wiki.har --host wikipedia.org --max-body 200
```

割り出しの結果として `GET https://en.wikipedia.org/w/rest.php/v1/search/title` が、
`q` と `limit` のパラメーター、そして JSON の `pages` を返す応答とともに表示される
はずです。そうしたら「手順」の例で呼び出して、ふつうの HTTP でも同じ題名が返って
くることを確かめてください。
