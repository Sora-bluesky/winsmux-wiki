---
title: "Blocked Page Recovery — ページの取得に失敗したときに使います: 403/429、ペイウォール、WAF、ボット判定の壁"
description: "ページの取得に失敗したときに使います: 403/429、ペイウォール、WAF、ボット判定の壁"
upstream_path: user-guide/skills/bundled/web/web-blocked-page-recovery.md
upstream_blob: a32d2150444e9ff0543a8dd8b7d05f5c42cd7dbe
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/web/web-blocked-page-recovery
---

# Blocked Page Recovery {#blocked-page-recovery}

ページの取得に失敗したときに使います。403/429、ペイウォール、WAF、ボット判定の壁が対象です。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/web\blocked-page-recovery` |
| バージョン | `1.0.0` |
| 作者 | Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Research`, `Archives`, `Wayback`, `Paywall`, `WAF`, `Fallback` |
| 関連 skill | [`grounded-citations`](/hermes/docs/user-guide/skills/bundled/research/research-grounded-citations/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Blocked-Page Recovery {#blocked-page-recovery}

ページが取得できないとき（403 や 429、Cloudflare の「Just a moment...」、ペイウォール、
ボット判定の割り込み画面など）は、あきらめず、同じ URL を何度も叩き続けもしないでください。
外部のサービスがそのページの**写し**を持っていることがよくあります。安く済むものから順に、
次の段取りを下りていきます。

## 手を尽くす順番 {#the-ladder}

```
1. Wayback Machine  — archive.org "available" API  (snapshot + timestamp)
2. archive.today    — domain rotation: archive.ph → .md → .li → .is
3. Jina Reader      — only if JINA_API_KEY is set  (live server-side render)
4. API-first pivot  — look for /api/, /graphql, .json, or RSS on the same host
5. Real browser     — browser tool as the last, most expensive resort
```

同梱のスクリプトを使えば、この順番をまとめて一度に試せます。

```bash
python3 scripts/recover_page.py "https://example.com/blocked-article" --json
```

このスクリプトは経路を順に試し、返ってきた中身を毎回検証したうえで（後述の「成功に見せかけた
失敗」を参照）、本物と確認できた最初の結果を、その出どころとあわせて表示します。

## 出どころの扱い（ここは譲れません） {#provenance-discipline-non-negotiable}

取り戻した写しにはそれぞれ出どころが付いてきます。引用するときは必ず残してください。

| 経路 | 出どころ | 引用のしかた |
|-------|-----------|-------------|
| Wayback / archive.today | `snapshot` | 保存された日付を添えて引用します。「2026-08-06 時点の保存版」のように書きます。保存版を今のページとして示してはいけません。内容が古い可能性があります。 |
| Jina Reader | `live` | 今のページをサーバー側で描画し直したものです。通常どおり引用します。 |
| 直接取得 / ブラウザ | `live` | 通常どおり引用します。 |

利用者が求めているのが*今この時点*の情報（価格、在庫、速報など）なら、保存版は答えではなく
背景にすぎません。そのことをはっきり伝え、いつ時点のものかも書き添えてください。

## 手作業でたどる経路 {#manual-routes}

### 1. Wayback Machine（出どころが最も確かなので最初に試します） {#1-wayback-machine-best-provenance-try-first}

```bash
# Discovery: returns closest snapshot URL + timestamp as JSON
curl -sL "https://archive.org/wayback/available?url={URL}"
# Then fetch archived_snapshots.closest.url
```

保存版をまとめて洗い出したいとき（あるいは消えたページを取り戻したいとき）は、CDX の索引を使います。

```bash
curl -sL "https://web.archive.org/cdx/search/cdx?url={URL}&output=json&limit=10"
```

CDX は混み合うと 503 を返すことがあります。返ってきたら `available` API に切り替えてください。
再試行で叩き続けてはいけません。

使えるのは、公開されていてクロールされた URL です。robots で拒否しているサイト、
一度もクロールされていない URL、JavaScript だけで表示する SPA（保存版では描画されません）には
使えません。

### 2. archive.today（ペイウォール、消えた内容） {#2-archivetoday-paywalls-deleted-content}

利用者が投稿して作られる保存庫で、Wayback にないペイウォール記事が見つかることがよくあります。
回数制限が厳しく（429 が返ります）、ドメインも入れ替わるので、次のように順に試します。

```bash
for d in archive.ph archive.md archive.li archive.is; do
  curl -sL --max-time 20 "https://$d/newest/{URL}" -o /tmp/page.html \
    -w "%{http_code}" && break
done
```

**確かめるのはステータスコードではなく中身です。** 429 のときでも数 KB の回数制限用 HTML が
返ってくるので、大きさだけを見ていると成功したように見えてしまいます。

### 3. Jina Reader（JINA_API_KEY が必要です） {#3-jina-reader-requires-jinaapikey}

`r.jina.ai` は今のページをサーバー側の本物のブラウザで描画し直し、markdown で返します。
鍵なしでの利用はもう使えません（401 が返り Turnstile に回されます）。鍵が要ります。

```bash
curl -s -H "Authorization: Bearer $JINA_API_KEY" "https://r.jina.ai/{URL}"
```

保存庫では扱えない JavaScript の SPA にも対応できます。環境変数が設定されていないときは、
この経路はまるごと飛ばしてください。

### 4. API を先に探す {#4-api-first-pivot}

WAF が守っているのは主に HTML の側で、その裏にあるデータの取り出し口はずっと緩いことが多いです。
同じサイトで 2〜3 回はじかれたら、HTML と格闘するのをやめて次を探します。

- ページ URL の `/api/...`、`/graphql`、`.json` にあたるもの
- RSS や Atom の配信（`/feed`、`/rss`、取り戻せた写しの中にある `<link rel="alternate">`）
- サイトマップ（`/sitemap.xml`）。制限のかかっていない正式な URL が見つかることがあります

## 成功に見せかけた失敗 — 嘘をつく経路 {#fake-successes-routes-that-lie}

次の経路は、それらしい中身とともに HTTP 200 を返してきますが、中身は目当てのページではありません。
スクリプトは自動ではじきます。手作業のときも同じようにはじいてください。

- **Google のキャッシュはもう動いていません**（2024 年半ばから）。
  `webcache.googleusercontent.com` は 200 と数十 KB を返しますが、中身はキャッシュではなく、
  JavaScript で転送する Google 検索の割り込み画面です。使ってはいけません。
- **AMP のキャッシュ**（`*.cdn.ampproject.org`）は、たいてい 300 バイトほどの
  `<title>Redirecting</title>` という meta refresh の切れ端を返し、行き先は元の（はじかれた）
  URL です。これを成功と扱うと、取得が堂々巡りになります。
- **回数制限のページ**: archive.today の 429 は数 KB の HTML です。大きさだけでなく、
  目当ての中身（見出しの語句、あるはずの文字列）が入っているかを確かめてください。

スクリプトが使っている見分け方は次のとおりです。経路ごとに決めた最低バイト数を下回っていないか、
meta refresh や JavaScript による転送の切れ端で行き先が元のホストになっていないか、
割り込み画面らしい見出し（「Just a moment」「Redirecting」「Google Search」
「Attention Required」）が付いていないか。

## 中継プロキシは使いません {#proxy-relays-dont}

一般的な「web プロキシ」の中継は、しくみからして通信の途中に第三者が入る形になります。
cookie や Authorization ヘッダーをそこに通してはいけませんし、利用者が拠りどころにするものを
そこから取ってもいけません。出どころを確かめようがないからです。少なくとも写しに日時が
残る保存庫のほうを選んでください。
