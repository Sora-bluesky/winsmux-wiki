---
title: "Blocked Page Recovery — ブロックされたページ、有料記事、WAF に阻まれたページを、アーカイブの保存版や読み取りサービス経由で取り戻す"
description: "ブロックされたページ、有料記事、WAF に阻まれたページを、アーカイブの保存版や読み取りサービス経由で取り戻す"
upstream_path: user-guide/skills/bundled/research/research-blocked-page-recovery.md
upstream_blob: 60ab28f809b451027bfd928fa82dabd92abbe9e2
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/research/research-blocked-page-recovery
---

# Blocked Page Recovery {#blocked-page-recovery}

ブロックされたページ、有料記事、WAF に阻まれたページを、アーカイブの保存版や読み取りサービス経由で取り戻します。web_extract やブラウザが 403 / 429 やチャレンジ画面、有料記事の壁、ボット判定の中間ページに当たったときに使ってください。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/research/blocked-page-recovery` |
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

ページが取得できないとき——403 / 429、Cloudflare の "Just a moment..."、有料記事の壁、
ボット判定の中間ページ——であきらめたり、同じ URL を何度も叩き続けたりしないでください。
外部のサービスがそのページの**写し**を持っていることがよくあります。
安上がりなものから順に、次のはしごを下りていきます。

## はしごの順番 {#the-ladder}

```
1. Wayback Machine  — archive.org "available" API  (snapshot + timestamp)
2. archive.today    — domain rotation: archive.ph → .md → .li → .is
3. Jina Reader      — only if JINA_API_KEY is set  (live server-side render)
4. API-first pivot  — look for /api/, /graphql, .json, or RSS on the same host
5. Real browser     — browser tool as the last, most expensive resort
```

同梱のスクリプトを使えば、この流れを一度に走らせられます。

```bash
python3 scripts/recover_page.py "https://example.com/blocked-article" --json
```

このスクリプトは各経路を順に試し、取得した中身をすべて検証したうえで
（後述の「見せかけの成功」を参照）、最初に本物だと確認できたものを、
どこから来たかの情報とあわせて表示します。

## 出どころの扱い（ここは譲れません） {#provenance-discipline-non-negotiable}

取り戻した写しには必ず出どころが付いていて、引用するときはそれを残さなければなりません。

| 経路 | 出どころ | 引用のしかた |
|-------|-----------|-------------|
| Wayback / archive.today | `snapshot` | 保存された日付を添えて引用します。「2026-08-06 時点の保存版」のように書きます。保存版を今のページとして示してはいけません。内容が古くなっている可能性があります。 |
| Jina Reader | `live` | 今のページをサーバー側で描画し直したものです。ふつうに引用できます。 |
| そのまま取得 / ブラウザ | `live` | ふつうに引用できます。 |

利用者が*今この時点*の情報（価格、在庫、速報）を必要としている場合、保存版は答えではなく
背景にすぎません。その旨と、いつ時点のものかをはっきり伝えてください。

## 手作業でたどる経路 {#manual-routes}

### 1. Wayback Machine（出どころが最も確かなので最初に試す） {#1-wayback-machine-best-provenance-try-first}

```bash
# Discovery: returns closest snapshot URL + timestamp as JSON
curl -sL "https://archive.org/wayback/available?url={URL}"
# Then fetch archived_snapshots.closest.url
```

保存版をたくさん並べたいとき（あるいは削除されたページを取り戻したいとき）は、CDX 索引を使います。

```bash
curl -sL "https://web.archive.org/cdx/search/cdx?url={URL}&output=json&limit=10"
```

CDX は混み合うと 503 を返すことがあります。その場合は `available` の API に切り替えてください。
何度も叩き直してはいけません。

使えるのは、公開されていて巡回済みの URL です。robots で拒否しているサイト、
一度も巡回されていない URL、JavaScript だけで描画する SPA（保存版では中身が出ません）には使えません。

### 2. archive.today（有料記事、削除された内容） {#2-archivetoday-paywalls-deleted-content}

利用者が自分で保存したアーカイブなので、Wayback にない有料記事が見つかることがよくあります。
回数制限が厳しく（429 が返ります）、ドメインも入れ替わるので、順に試します。

```bash
for d in archive.ph archive.md archive.li archive.is; do
  curl -sL --max-time 20 "https://$d/newest/{URL}" -o /tmp/page.html \
    -w "%{http_code}" && break
done
```

**ステータスコードではなく中身を確認してください**。429 のときも数 KB の制限案内 HTML が返るので、
大きさだけを見ていると成功したように見えてしまいます。

### 3. Jina Reader（JINA_API_KEY が必要） {#3-jina-reader-requires-jinaapikey}

`r.jina.ai` は今のページをサーバー側の本物のブラウザで描画し直し、markdown で返します。
鍵なしでの利用はもう通りません（401 になり Turnstile に飛ばされます）。鍵が必要です。

```bash
curl -s -H "Authorization: Bearer $JINA_API_KEY" "https://r.jina.ai/{URL}"
```

アーカイブでは歯が立たない JavaScript の SPA も扱えます。環境変数が設定されていないときは、
この経路はまるごと飛ばしてください。

### 4. API を先に探す {#4-api-first-pivot}

WAF は、その裏にあるデータの出口よりも HTML の側をずっと厳しく守っています。
同じサイトで 2〜3 回ブロックされたら、HTML と格闘するのをやめて、次を探します。

- ページ URL の `/api/...`、`/graphql`、`.json` にあたるもの
- RSS / Atom のフィード（`/feed`、`/rss`、取り戻せた写しの中にある `<link rel="alternate">`）
- サイトマップ（`/sitemap.xml`）。そこから、まだ制限されていない正式な URL が見つかることがあります

## 見せかけの成功——嘘をつく経路 {#fake-successes-routes-that-lie}

次の経路は、HTTP 200 と、それらしいが本物ではない中身を返してきます。
スクリプトは自動でこれらをはじきます。手作業のときも同じようにはじいてください。

- **Google のキャッシュはもうありません**（2024 年なかば以降）。`webcache.googleusercontent.com`
  は 200 と数十 KB を返しますが、中身は JavaScript で転送する Google 検索の中間ページで、
  キャッシュではありません。使ってはいけません。
- **AMP のキャッシュ**（`*.cdn.ampproject.org`）は、たいてい 300 バイトほどの
  `<title>Redirecting</title>` という meta refresh の断片を返すだけで、
  行き先は元の（ブロックされている）URL です。これを成功とみなすと取得の堂々巡りになります。
- **回数制限の応答**: archive.today の 429 ページは数 KB の HTML です。大きさだけでなく、
  目的のページに実際にあるはずの中身（表題の語句、想定される文字列）を確認してください。

スクリプトが使っている見分け方は次のとおりです。経路ごとに決めた最小バイト数を下回っていないか。
meta refresh や JavaScript による転送の断片で、行き先が元のホストになっていないか。
中間ページ特有の表題（"Just a moment"、"Redirecting"、"Google Search"、"Attention Required"）が付いていないか。

## 中継プロキシは使わない {#proxy-relays-dont}

いわゆる「web プロキシ」の中継は、仕組みのうえで通信の間に割り込むものです。
cookie や Authorization ヘッダーを通してはいけませんし、利用者が頼りにする用途にも使わないでください。
出どころを確かめようがありません。少なくとも写しに日時が残るアーカイブのほうを選びます。
