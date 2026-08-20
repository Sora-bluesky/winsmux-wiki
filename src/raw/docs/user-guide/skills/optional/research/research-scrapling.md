---
title: "Scrapling — 目立たないブラウザ操作と Cloudflare 回避でサイトを収集する"
description: "目立たないブラウザ操作と Cloudflare 回避でサイトを収集する"
upstream_path: user-guide/skills/optional/research/research-scrapling.md
upstream_blob: 7d916178d962b8d1cae7c196857ebb7f407e7680
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/research/research-scrapling
---

# Scrapling {#scrapling}

目立たないブラウザ操作と Cloudflare 回避でサイトを収集します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加の skill です。`hermes skills install official/research/scrapling` で入れられます |
| パス | `optional-skills/research/scrapling` |
| バージョン | `1.0.0` |
| 作者 | FEUAZUR |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Web Scraping`, `Browser`, `Cloudflare`, `Stealth`, `Crawling`, `Spider` |
| 関連 skill | [`duckduckgo-search`](/hermes/docs/user-guide/skills/optional/research/research-duckduckgo-search/), [`domain-intel`](/hermes/docs/user-guide/skills/optional/research/research-domain-intel/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が動き出したときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Scrapling {#scrapling}

[Scrapling](https://github.com/D4Vinci/Scrapling) は、ボット判定の回避、目立たないブラウザ操作、複数ページの巡回をまとめて扱えるウェブ収集の枠組みです。取得のやり方を 3 通り（HTTP、JavaScript を動かすもの、Cloudflare 向けに目立たないもの）そろえ、CLI も一式そなえています。

**この skill は学習と調査のためのものです。** 使う人は、地域や国際的なデータ収集の法律を守り、サイトの利用規約を尊重してください。

## こんなときに使います {#when-to-use}

- 変化のない HTML のページを取得するとき（ブラウザを使うツールより速く済みます）
- JavaScript で描かれるページを、本物のブラウザで取得したいとき
- Cloudflare Turnstile やボット判定を通り抜けたいとき
- 複数のページをたどって巡回したいとき
- 最初から使える `web_extract` では、ほしいデータが返ってこないとき

## 導入 {#installation}

```bash
pip install "scrapling[all]"
scrapling install
```

最小構成（HTTP のみ。ブラウザなし）:
```bash
pip install scrapling
```

ブラウザ操作だけを足す場合:
```bash
pip install "scrapling[fetchers]"
scrapling install
```

## 早見表 {#quick-reference}

| やり方 | クラス | 向いている場面 |
|----------|-------|----------|
| HTTP | `Fetcher` / `FetcherSession` | 変化のないページ、API、たくさんの取得を速く |
| 動的 | `DynamicFetcher` / `DynamicSession` | JavaScript で描かれる内容、SPA |
| 目立たない取得 | `StealthyFetcher` / `StealthySession` | Cloudflare、ボット判定のあるサイト |
| 巡回 | `Spider` | リンクをたどる複数ページの巡回 |

## CLI の使い方 {#cli-usage}

### 変化のないページを取り出す {#extract-static-page}

```bash
scrapling extract get 'https://example.com' output.md
```

CSS セレクタとブラウザのなりすましを付ける場合:

```bash
scrapling extract get 'https://example.com' output.md \
  --css-selector '.content' \
  --impersonate 'chrome'
```

### JavaScript で描かれるページを取り出す {#extract-js-rendered-page}

```bash
scrapling extract fetch 'https://example.com' output.md \
  --css-selector '.dynamic-content' \
  --disable-resources \
  --network-idle
```

### Cloudflare のあるページを取り出す {#extract-cloudflare-protected-page}

```bash
scrapling extract stealthy-fetch 'https://protected-site.com' output.html \
  --solve-cloudflare \
  --block-webrtc \
  --hide-canvas
```

### POST リクエスト {#post-request}

```bash
scrapling extract post 'https://example.com/api' output.json \
  --json '{"query": "search term"}'
```

### 出力の形式 {#output-formats}

出力の形式はファイルの拡張子で決まります:
- `.html` -- そのままの HTML
- `.md` -- Markdown に変換
- `.txt` -- ただのテキスト
- `.json` / `.jsonl` -- JSON

## Python: HTTP での取得 {#python-http-scraping}

### 一度きりのリクエスト {#single-request}

```python
from scrapling.fetchers import Fetcher

page = Fetcher.get('https://quotes.toscrape.com/')
quotes = page.css('.quote .text::text').getall()
for q in quotes:
    print(q)
```

### セッション（Cookie を保つ） {#session-persistent-cookies}

```python
from scrapling.fetchers import FetcherSession

with FetcherSession(impersonate='chrome') as session:
    page = session.get('https://example.com/', stealthy_headers=True)
    links = page.css('a::attr(href)').getall()
    for link in links[:5]:
        sub = session.get(link)
        print(sub.css('h1::text').get())
```

### POST / PUT / DELETE {#post-put-delete}

```python
page = Fetcher.post('https://api.example.com/data', json={"key": "value"})
page = Fetcher.put('https://api.example.com/item/1', data={"name": "updated"})
page = Fetcher.delete('https://api.example.com/item/1')
```

### プロキシを使う {#with-proxy}

```python
page = Fetcher.get('https://example.com', proxy='http://user:pass@proxy:8080')
```

## Python: 動的なページ（JavaScript で描かれるもの） {#python-dynamic-pages-js-rendered}

JavaScript の実行が必要なページ（SPA、あとから読み込む内容）にはこちらを使います:

```python
from scrapling.fetchers import DynamicFetcher

page = DynamicFetcher.fetch('https://example.com', headless=True)
data = page.css('.js-loaded-content::text').getall()
```

### 特定の要素が出るまで待つ {#wait-for-specific-element}

```python
page = DynamicFetcher.fetch(
    'https://example.com',
    wait_selector=('.results', 'visible'),
    network_idle=True,
)
```

### 読み込むものを減らして速くする {#disable-resources-for-speed}

フォント、画像、動画・音声、スタイルシートを止めます（25% ほど速くなります）:

```python
from scrapling.fetchers import DynamicSession

with DynamicSession(headless=True, disable_resources=True, network_idle=True) as session:
    page = session.fetch('https://example.com')
    items = page.css('.item::text').getall()
```

### ページ操作を自分で書く {#custom-page-automation}

```python
from playwright.sync_api import Page
from scrapling.fetchers import DynamicFetcher

def scroll_and_click(page: Page):
    page.mouse.wheel(0, 3000)
    page.wait_for_timeout(1000)
    page.click('button.load-more')
    page.wait_for_selector('.extra-results')

page = DynamicFetcher.fetch('https://example.com', page_action=scroll_and_click)
results = page.css('.extra-results .item::text').getall()
```

## Python: 目立たない取得（ボット判定の回避） {#python-stealth-mode-anti-bot-bypass}

Cloudflare のあるサイトや、指紋を細かく見ているサイトにはこちらを使います:

```python
from scrapling.fetchers import StealthyFetcher

page = StealthyFetcher.fetch(
    'https://protected-site.com',
    headless=True,
    solve_cloudflare=True,
    block_webrtc=True,
    hide_canvas=True,
)
content = page.css('.protected-content::text').getall()
```

### 目立たないセッション {#stealth-session}

```python
from scrapling.fetchers import StealthySession

with StealthySession(headless=True, solve_cloudflare=True) as session:
    page1 = session.fetch('https://protected-site.com/page1')
    page2 = session.fetch('https://protected-site.com/page2')
```

## 要素の選び方 {#element-selection}

どの取得方法でも `Selector` のオブジェクトが返り、次のメソッドが使えます:

### CSS セレクタ {#css-selectors}

```python
page.css('h1::text').get()              # First h1 text
page.css('a::attr(href)').getall()      # All link hrefs
page.css('.quote .text::text').getall() # Nested selection
```

### XPath {#xpath}

```python
page.xpath('//div[@class="content"]/text()').getall()
page.xpath('//a/@href').getall()
```

### 探すためのメソッド {#find-methods}

```python
page.find_all('div', class_='quote')       # By tag + attribute
page.find_by_text('Read more', tag='a')    # By text content
page.find_by_regex(r'\$\d+\.\d{2}')       # By regex pattern
```

### 似た形の要素 {#similar-elements}

同じような組み立ての要素をまとめて見つけます（商品の一覧などで役に立ちます）:

```python
first_product = page.css('.product')[0]
all_similar = first_product.find_similar()
```

### 前後をたどる {#navigation}

```python
el = page.css('.target')[0]
el.parent                # Parent element
el.children              # Child elements
el.next_sibling          # Next sibling
el.prev_sibling          # Previous sibling
```

## Python: 巡回の仕組み {#python-spider-framework}

リンクをたどって複数のページを巡回するときに使います:

```python
from scrapling.spiders import Spider, Request, Response

class QuotesSpider(Spider):
    name = "quotes"
    start_urls = ["https://quotes.toscrape.com/"]
    concurrent_requests = 10
    download_delay = 1

    async def parse(self, response: Response):
        for quote in response.css('.quote'):
            yield {
                "text": quote.css('.text::text').get(),
                "author": quote.css('.author::text').get(),
                "tags": quote.css('.tag::text').getall(),
            }

        next_page = response.css('.next a::attr(href)').get()
        if next_page:
            yield response.follow(next_page)

result = QuotesSpider().start()
print(f"Scraped {len(result.items)} quotes")
result.items.to_json("quotes.json")
```

### 取得方法を使い分ける巡回 {#multi-session-spider}

リクエストごとに取得のやり方を振り分けます:

```python
from scrapling.fetchers import FetcherSession, AsyncStealthySession

class SmartSpider(Spider):
    name = "smart"
    start_urls = ["https://example.com/"]

    def configure_sessions(self, manager):
        manager.add("fast", FetcherSession(impersonate="chrome"))
        manager.add("stealth", AsyncStealthySession(headless=True), lazy=True)

    async def parse(self, response: Response):
        for link in response.css('a::attr(href)').getall():
            if "protected" in link:
                yield Request(link, sid="stealth")
            else:
                yield Request(link, sid="fast", callback=self.parse)
```

### 巡回を止めて再開する {#pauseresume-crawling}

```python
spider = QuotesSpider(crawldir="./crawl_checkpoint")
spider.start()  # Ctrl+C to pause, re-run to resume from checkpoint
```

## つまずきやすいところ {#pitfalls}

- **ブラウザの導入が必要**: pip で入れたあと `scrapling install` を実行してください。これをしないと `DynamicFetcher` と `StealthyFetcher` は失敗します
- **待ち時間の単位**: DynamicFetcher / StealthyFetcher の待ち時間は **ミリ秒** です（既定は 30000）。Fetcher の待ち時間は **秒** です
- **Cloudflare の回避**: `solve_cloudflare=True` を付けると取得に 5〜15 秒ほど増えます。必要なときだけ有効にしてください
- **資源の使い方**: StealthyFetcher は本物のブラウザを動かします。同時に走らせる数は抑えてください
- **法律**: 収集の前に、必ず robots.txt とサイトの利用規約を確認してください。このライブラリは学習と調査のためのものです
- **Python の版**: Python 3.10 以上が必要です
