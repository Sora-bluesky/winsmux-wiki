---
title: "Searxng Search — 70 以上の検索エンジンをまとめて引く、鍵の要らない無料の検索"
description: "70 以上の検索エンジンをまとめて引く、鍵の要らない無料の検索"
upstream_path: user-guide/skills/optional/research/research-searxng-search.md
upstream_blob: 29dbe8f80b8281aeaf65f4bdcd74cfeeffd9b6de
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/research/research-searxng-search
---

# Searxng Search {#searxng-search}

70 以上の検索エンジンをまとめて引く、鍵の要らない無料の検索です。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加の skill です。`hermes skills install official/research/searxng-search` で入れられます |
| パス | `optional-skills/research\searxng-search` |
| バージョン | `1.0.1` |
| 作者 | hermes-agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos |
| タグ | `search`, `searxng`, `meta-search`, `self-hosted`, `free`, `fallback` |
| 関連 skill | [`duckduckgo-search`](/hermes/docs/user-guide/skills/optional/research/research-duckduckgo-search/), [`domain-intel`](/hermes/docs/user-guide/skills/optional/research/research-domain-intel/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が動き出したときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# SearXNG Search {#searxng-search}

[SearXNG](https://searxng.org/) を使った無料のまとめ検索です。プライバシーを守る作りで、自分で立てて動かすこともでき、70 以上の検索エンジンへ同時に問い合わせます。

公開されている実体を使うなら **API キーは要りません**。すべてを自分の管理下に置きたいなら、自分で立てることもできます。ウェブ検索の主なツール一式（`FIRECRAWL_API_KEY`）が設定されていないときは、代わりの選択肢として自動的に現れます。

## 設定 {#configuration}

SearXNG を使うには、自分の SearXNG の実体を指す `SEARXNG_URL` の環境変数が必要です:

```bash
# Public instances (no setup required)
SEARXNG_URL=https://searxng.example.com

# Self-hosted SearXNG
SEARXNG_URL=http://localhost:8888
```

実体が設定されていない場合、この skill は使えず、エージェントはほかの検索手段に切り替えます。

## 使えるかどうかの確かめ方 {#detection-flow}

やり方を決める前に、実際に何が使えるのかを確かめてください:

```bash
# Check if SEARXNG_URL is set and the instance is reachable
curl -s --max-time 5 "${SEARXNG_URL}/search?q=test&format=json" | head -c 200
```

判断の流れ:
1. `SEARXNG_URL` が設定されていて実体が応答するなら、SearXNG を使います
2. `SEARXNG_URL` が未設定か、実体につながらないなら、ほかに使える検索ツールへ切り替えます
3. 利用者が SearXNG そのものを求めているなら、実体を立てる手伝いをするか、公開されているものを探します

## 方法 1: curl を使う（おすすめ） {#method-1-cli-via-curl-preferred}

`terminal` から `curl` を使って、SearXNG の JSON API を呼びます。こうすれば、特定の Python パッケージが入っている前提を置かずに済みます。

```bash
# Text search (JSON output)
curl -s --max-time 10 \
  "${SEARXNG_URL}/search?q=python+async+programming&format=json&engines=google,bing&limit=10"

# With Safesearch off
curl -s --max-time 10 \
  "${SEARXNG_URL}/search?q=example&format=json&safesearch=0"

# Specific categories (general, news, science, etc.)
curl -s --max-time 10 \
  "${SEARXNG_URL}/search?q=AI+news&format=json&categories=news"
```

### よく使うフラグ {#common-cli-flags}

| フラグ | 説明 | 例 |
|------|-------------|---------|
| `q` | 検索語（URL エンコードします） | `q=python+async` |
| `format` | 出力の形式: `json`, `csv`, `rss` | `format=json` |
| `engines` | 検索エンジン名をカンマ区切りで | `engines=google,bing,ddg` |
| `limit` | 各エンジンあたりの最大件数（既定は 10） | `limit=5` |
| `categories` | 分野で絞る | `categories=news,science` |
| `safesearch` | 0=なし、1=ほどほど、2=厳しめ | `safesearch=0` |
| `time_range` | 期間で絞る: `day`, `week`, `month`, `year` | `time_range=week` |

### JSON の結果を読み取る {#parsing-json-results}

```bash
# Extract titles and URLs from JSON
curl -s --max-time 10 "${SEARXNG_URL}/search?q=fastapi&format=json&limit=5" \
  | python3 -c "

data = json.load(sys.stdin)
for r in data.get('results', []):
    print(r.get('title',''))
    print(r.get('url',''))
    print(r.get('content','')[:200])
    print()
"
```

1 件ごとに次が返ります: `title`、`url`、`content`（抜粋）、`engine`、`parsed_url`、`img_src`、`thumbnail`、`author`、`published_date`

## 方法 2: `requests` を使った Python からの呼び出し {#method-2-python-api-via-requests}

`requests` ライブラリを使って、Python から SearXNG の REST API を直接呼びます:

```python

base_url = os.environ.get("SEARXNG_URL", "")
if not base_url:
    raise RuntimeError("SEARXNG_URL is not set")

query = "fastapi deployment guide"
params = {
    "q": query,
    "format": "json",
    "limit": 5,
    "engines": "google,bing",
}

resp = requests.get(f"{base_url}/search", params=params, timeout=10)
resp.raise_for_status()
data = resp.json()

for r in data.get("results", []):
    print(r["title"])
    print(r["url"])
    print(r.get("content", "")[:200])
    print()
```

## SearXNG を自分で立てる {#self-hosting-searxng}

自分の SearXNG を動かすには:

```bash
# Using Docker
docker run -d -p 8888:8080 \
  -v $(pwd)/searxng:/etc/searxng \
  searxng/searxng:latest

# Then set
SEARXNG_URL=http://localhost:8888
```

pip で入れることもできます:
```bash
pip install searxng
# Edit /etc/searxng/settings.yml
searxng-run
```

公開されている SearXNG の実体はこちらです:
- `https://searxng.example.com`（公開されているものに置き換えてください）

## 進め方: 検索してから本文を取り出す {#workflow-search-then-extract}

SearXNG が返すのは見出し・URL・抜粋であって、ページの全文ではありません。全文がほしいときは、まず検索し、いちばん関係のある URL を `web_extract`、ブラウザのツール、`curl` のいずれかで取り出してください。

```bash
# Search for relevant pages
curl -s "${SEARXNG_URL}/search?q=fastapi+deployment&format=json&limit=3"
# Output: list of results with titles and URLs

# Then extract the best URL with web_extract
```

## できないこと {#limitations}

- **実体が使えるかどうか**: SearXNG の実体が落ちていたりつながらなかったりすると、検索は失敗します。`SEARXNG_URL` が設定されていて、実体につながることを必ず確かめてください。
- **本文は取れません**: SearXNG が返すのは抜粋であって、ページの全文ではありません。記事の全文には `web_extract`、ブラウザのツール、`curl` を使ってください。
- **回数の制限**: 公開されている実体には回数制限があることがあります。自分で立てればこれを避けられます。
- **使えるエンジンの範囲**: どのエンジンを使えるかは、その SearXNG の設定次第です。無効にされているエンジンもあります。
- **結果の新しさ**: まとめ検索は外部のエンジンを束ねているので、結果の新しさはそれらのエンジン次第です。

## 困ったとき {#troubleshooting}

| 症状 | 考えられる原因 | どうするか |
|---------|--------------|------------|
| `SEARXNG_URL` が未設定 | 実体が設定されていません | 公開されている SearXNG を使うか、自分で立ててください |
| 接続を拒まれる | 実体が動いていないか、URL が違います | URL が正しいか、実体が動いているかを確かめてください |
| 結果が空 | 実体がその検索語をはじいています | 別の実体を試すか、自分で立ててください |
| 応答が遅い | 公開されている実体が混んでいます | 自分で立てるか、混んでいない実体を使ってください |
| `json` 形式が使えない | SearXNG の版が古いです | `format=rss` を試すか、SearXNG を更新してください |

## つまずきやすいところ {#pitfalls}

- **`SEARXNG_URL` を必ず設定する**: これがないと、この skill は動きません。
- **検索語を URL エンコードする**: curl では空白や記号を URL エンコードするか、Python なら `urllib.parse.quote()` を使ってください。
- **`format=json` を使う**: 既定の形式は機械で読めないことがあります。JSON をはっきり指定してください。
- **待ち時間を決める**: つながらない実体で止まったままにならないよう、必ず `--max-time` か `timeout=` を使ってください。
- **自分で立てるのがいちばん**: 公開されている実体は落ちたり、回数を制限したり、はじいたりします。自分で立てた実体なら安定します。

## 実体の見つけ方 {#instance-discovery}

`SEARXNG_URL` が未設定のまま SearXNG について尋ねられたら、次のどちらかを手伝ってください:
1. 公開されている SearXNG の実体を見つける（「public searxng instance」で検索します）
2. Docker か pip で自分のものを用意する

公開されている実体の一覧はこちらにあります: https://searxng.org/
