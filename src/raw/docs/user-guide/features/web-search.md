---
title: "Web 検索と本文抽出"
description: "複数のバックエンドプロバイダで Web を検索し、ページ本文を抽出します。無料で自前運用できる SearXNG にも対応しています。"
upstream_path: user-guide/features/web-search.md
upstream_blob: bcd6b34255a488fc5b07d7028c7f0df1d0416222
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/web-search
---

# Web 検索と本文抽出 {#web-search-extract}

Hermes Agent には、複数のプロバイダを背後に持つ、モデルから呼び出せる Web ツールが 2 つあります。

- **`web_search`** — Web を検索して、順位付けされた結果を返します
- **`web_extract`** — 1 つ以上の URL を取得して、読める形の本文を抜き出します

どちらも 1 つのバックエンド選択でまとめて設定します。プロバイダは `hermes tools` で選ぶか、`config.yaml` に直接書きます。

## バックエンド {#backends}

| プロバイダ | 環境変数 | 検索 | 抽出 | 無料枠 |
|----------|---------|--------|---------|-----------|
| **Firecrawl**（既定） | `FIRECRAWL_API_KEY`（任意 — 選択すればキーなしでも動きます） | ✔ | ✔ | 月 500 クレジット · 選択時はキーなしのクラウド利用 |
| **SearXNG** | `SEARXNG_URL` | ✔ | — | ✔ 無料（自前運用） |
| **Brave Search（無料枠）** | `BRAVE_SEARCH_API_KEY` | ✔ | — | 月 2 000 クエリ |
| **DDGS（DuckDuckGo）** | —（キー不要） | ✔ | — | ✔ 無料 |
| **Exa** | `EXA_API_KEY`（任意） | ✔ | ✔ | ✔ キーなしリングの参加先 · キーありで月 1 000 検索 |
| **Parallel** | `PARALLEL_API_KEY`（任意） | ✔ | ✔ | ✔ キーなしリングの参加先 · キーありは有料 |
| **Tavily** | `TAVILY_API_KEY`（任意） | ✔ | ✔ | ✔ 選択時はオプトインでキーなし利用可 |
| **Perplexity** | `PERPLEXITY_API_KEY` | ✔ | ✔（クエリに関わる抜粋） | 有料（Search API のリクエスト従量） |
| **Keenable** | `KEENABLE_API_KEY`（任意） | ✔ | ✔ | ✔ キーなしリングの参加先 · キーありは有料 |
| **xAI（Grok）** | `XAI_API_KEY` または `hermes auth add xai-oauth` | ✔ | — | 有料（SuperGrok またはトークン従量） |

Brave Search・DDGS・xAI は **検索専用** です。`web_extract` も使いたい場合は、これらのどれかと Firecrawl / Tavily / Perplexity / Keenable / Exa / Parallel を組み合わせてください。DDGS は内部で [`ddgs` Python パッケージ](https://pypi.org/project/ddgs/)を使います。未インストールなら `pip install ddgs` を実行するか、初回使用時に Hermes が遅延インストールするのに任せてください。xAI は Responses API 上で Grok のサーバー側 `web_search` ツールを動かします。結果は索引に基づくものではなく LLM が生成したもので、タイトル・説明・URL の選択がすべてモデルの出力になります（後述の[信頼モデルの注意](#xai-grok)を参照）。

**機能ごとの分割:** 検索と抽出で別々のプロバイダを使えます。たとえば検索は SearXNG（無料）、抽出は Firecrawl といった具合です。後述の[機能ごとの設定](#per-capability-configuration)を参照してください。

:::info そのまま動きます — キーなし無料枠のローテーション
Web 系の認証情報が **まったくない** まっさらな環境でも、`web_search` と `web_extract` はそのまま動きます。リクエストはリング参加ベンダー（**Exa・Parallel・Firecrawl・Keenable**）の公開無料枠をラウンドロビンで回り、負荷を均等に分散します。レート制限に当たったリクエストは、リングの次のベンダーで自動的に再試行します（どこかが応答するか全部が絞られるまで、多段で回ります）。登録もキーも不要です。この枠はあくまで最後の手段で、設定済みのバックエンドや存在する API キーが常に優先されます。またリクエストに利用者を識別する情報は乗りません（プロセスごとのランダムなセッション ID だけで、再起動のたびに変わります）。確実で絞られないサービスが必要なら、キーを設定したプロバイダを用意してください。キーなし枠を完全に止めるには `web.keyless_fallback: false` を指定します。
:::

**無料と有料を明示的に選ぶ:** `hermes tools` では、Exa・Parallel・Keenable がそれぞれ 2 行 — **Free（キーなし）** と **Paid（API キー）** — で表示されます。Free を選ぶとそのベンダーの匿名エンドポイントに固定されます（あとでキーを足しても変わりません）。Paid を選ぶとキーを使う経路に固定され、キーがなければ黙って無料枠に落ちるのではなくエラーになります。選択内容は `web.provider_tier.<name>: free|paid` として保存されます。未設定のままにすると自動判定（キーがあれば有料、なければキーなしリング）です。

:::tip Nous のサブスクリプション利用者へ
有料の [Nous Portal](https://portal.nousresearch.com) サブスクリプションがあれば、Web の検索と抽出はマネージドな Firecrawl 経由で **[Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/)** から使えます。API キーは不要です。新規インストールなら `hermes setup --portal` でログインして、ゲートウェイのツールをまとめて有効にできます。すでに使っている環境なら、`hermes tools` で Web だけ切り替えられます。
:::

---

## `web_extract` が長いページをどう扱うか {#how-webextract-handles-long-pages}

バックエンドはページの生の markdown を返しますが、これは非常に大きくなることがあります（掲示板のスレッド、ドキュメントサイト、コメント付きのニュース記事など）。コンテキストウィンドウを使える状態に保つため、`web_extract` は **決まった文字数の予算** を適用します。LLM による要約は一切行いません。

| ページの大きさ（文字数） | 起きること |
|------------------------|--------------|
| 予算以内（既定は 15 000） | まるごと返します — 完全な markdown がエージェントに届きます |
| 予算を超える場合 | 先頭と末尾の窓（およそ先頭 75% / 末尾 25%、markdown の行境界で切ります）に、明示的な `[TRUNCATED]` フッターが付きます。整形済みの全文はディスクに保存され、フッターにはそのファイルのパスと、省かれた中間部分を読み進めるための `read_file` の正確な呼び出し方が書かれます |
| 2 000 000 を超える場合 | 保存するテキストは 2 MB で頭打ちになります |

1 ページあたりの予算は `config.yaml` の `web.extract_char_limit` で変更できます（既定は `15000`、2 000〜500 000 の範囲に丸められます）。エージェントはツールの `char_limit` 引数で呼び出しごとに引き上げることもできます。

### 切り詰めが邪魔になるとき {#when-truncation-gets-in-the-way}

抽出後の markdown ではなく生きた DOM そのものが必要なとき — たとえば JS を多用したページで抽出結果がほとんど空になる場合 — は、代わりに `browser_navigate` と `browser_snapshot` を使ってください。ブラウザツールは生きたアクセシビリティツリーを返します（巨大なページには、こちらはこちらでスナップショットの上限があります）。

---

## 結果のキャッシュ {#result-caching}

短い時間内に繰り返された Web 呼び出しは、有料のバックエンドではなくキャッシュから返されます。これで重複が起きやすい 2 つの場面 — サブエージェントの並列展開（複数の委任先が同じ話題を調べる）と、数分前に読んだページをエージェントが読み直す場面 — でクレジットと待ち時間を節約できます。

| 呼び出し | キャッシュ | 有効範囲 |
|------|-------|-------|
| `web_search` — 同じクエリ（大文字小文字と空白は無視）、同じプロバイダ | メモリ上のメモ化 | プロセスごと |
| `web_extract` — 同じ URL、同じ形式、同じプロバイダ | 全文を `~/.hermes/cache/web/` に保存 | CLI・ゲートウェイ・cron・サブエージェントの各プロセスで共有 |

同時に走る同一の検索（並列のサブエージェント展開が同じクエリを一斉に投げる場合）は、**1 回のバックエンドリクエストにまとめられます**。最初の呼び出し元が費用を負担し、残りは同じ応答を共有します。検索件数の指定は 10 / 20 / 50 / 100 に切り上げてまとめられるので、ほぼ同じリクエスト（`limit=5` と `limit=8` など）が 1 つのエントリを共有し、それぞれの呼び出し元は要求した件数を受け取ります。

キャッシュされるのは成功した応答だけです。失敗すると必ずバックエンドに再試行しますし、一回限りのキーなし救済で返された応答はキャッシュされません（次の呼び出しでは選んだバックエンドを再び試します）。また `security.website_blocklist` に一致する URL がキャッシュから返されることはありません。キャッシュ済みの抽出結果も通常の切り詰め処理を通るので、2 回目の呼び出しで `char_limit` を変えれば、同じ保存済みデータから別の長さで取り出せます。

**ローカル開発用の URL は決してキャッシュされません。** `localhost`・`127.0.0.1`・`*.local`・ドット無しの LAN ホスト名・プライベート/リンクローカルの IP 範囲（`192.168.*`、`10.*`、`172.16-31.*`）はすべて抽出キャッシュを丸ごと迂回します。開発サーバーやホットリロードのビルド、チャット GUI の成果物プレビューは保存のたびに変わるので、キャッシュされた写しでは古いビルドを見ることになるからです。ローカルのページは毎回その場で取得します。（これらの URL はそもそも `security.allow_private_urls` が有効なときだけ到達できます。）

**公開インターネット越しに検証したい場合は?** ステージング環境やトンネルの URL は公開 DNS なので、ローカル開発向けの規則では拾えません。`web.cache_exempt_hosts` に列挙すれば、こちらも常にその場で取得されます。指定は完全一致・`*.` のワイルドカード・ドメインの後方一致（`mysite.dev` は `preview.mysite.dev` も含みます）のいずれでも書けます。

```yaml
# ~/.hermes/config.yaml
web:
  cache_exempt_hosts:
    - mysite.vercel.app
    - "*.ngrok-free.app"
```

```yaml
# ~/.hermes/config.yaml
web:
  cache_enabled: true      # default; set false to disable both caches
  cache_ttl_minutes: 20    # freshness window, clamped 1–1440
```

スコアや価格、速報のように本当に動き続けるデータを調べていて、毎回新しい結果が必要なら、TTL を短くするか `web.cache_enabled: false` にしてください。

---

## 設定 {#setup}

### `hermes tools` での手早い設定 {#quick-setup-via-hermes-tools}

`hermes tools` を実行し、**Web Search & Extract** を選んで、プロバイダを 1 つ選びます。ウィザードが必要な URL や API キーを尋ね、設定ファイルに書き込みます。

```bash
hermes tools
```

---

### Firecrawl（既定） {#firecrawl-default}

検索も抽出も一通りそろっています。ほとんどの方にはこれをおすすめします。

```bash
# ~/.hermes/.env
FIRECRAWL_API_KEY=fc-your-key-here
```

キーは [firecrawl.dev](https://firecrawl.dev) で取得します。無料枠は月 500 クレジットです。

**自前運用の Firecrawl:** クラウドの API ではなく、自分のインスタンスを指すこともできます。

```bash
# ~/.hermes/.env
FIRECRAWL_API_URL=http://localhost:3002
```

`FIRECRAWL_API_URL` を設定した場合、API キーは任意になります（サーバー側の認証は `USE_DB_AUTHENTICATION=false` で無効にできます）。

---

### SearXNG（無料・自前運用） {#searxng-free-self-hosted}

SearXNG はプライバシーに配慮したオープンソースのメタ検索エンジンで、70 を超える検索エンジンの結果をまとめます。**API キーは不要** で、動いている SearXNG のインスタンスを Hermes に指し示すだけです。

SearXNG は **検索専用** です。`web_extract` には別の抽出プロバイダが必要です。

#### 方法 A — Docker で自前運用する（おすすめ） {#option-a-self-host-with-docker-recommended}

こうすると、レート制限のない自分専用のインスタンスが手に入ります。

**1. 作業用のディレクトリを作ります:**

```bash
mkdir -p ~/searxng/searxng
cd ~/searxng
```

**2. `docker-compose.yml` を書きます:**

```yaml
# ~/searxng/docker-compose.yml
services:
  searxng:
    image: searxng/searxng:latest
    container_name: searxng
    ports:
      - "8888:8080"
    volumes:
      - ./searxng:/etc/searxng:rw
    environment:
      - SEARXNG_BASE_URL=http://localhost:8888/
    restart: unless-stopped
```

**3. コンテナを起動します:**

```bash
docker compose up -d
```

**4. JSON API 形式を有効にします:**

SearXNG は既定で JSON 出力が無効になっています。生成された設定ファイルを取り出して、有効にしてください。

```bash
# Copy the auto-generated config out of the container
docker cp searxng:/etc/searxng/settings.yml ~/searxng/searxng/settings.yml
```

`~/searxng/searxng/settings.yml` を開きます。
`use_default_settings: true` が書かれていれば、このファイルには上書き分だけが入っています。ほかの設定はすべて組み込みの既定値から引き継がれます。
Hermes 向けに JSON 応答を有効にするには、次の上書きを追加します。

```yaml
search:
  formats:
    - html
    - json
```

`settings.yml` はおおよそ次のような形になります。

```yaml
# Read the documentation before extending the defaults:
# https://docs.searxng.org/admin/settings/

use_default_settings: true

server:
  secret_key: "abcdef12345678"
  image_proxy: true

search:
  formats:
    - html
    - json
```

**5. 再起動して反映します:**

```bash
docker cp ~/searxng/searxng/settings.yml searxng:/etc/searxng/settings.yml
docker restart searxng
```

**6. 動作を確かめます:**

```bash
curl -s "http://localhost:8888/search?q=test&format=json" | python3 -c \
  "import sys,json; d=json.load(sys.stdin); print(f'{len(d[\"results\"])} results')"
```

`10 results` のような表示が出れば成功です。`403 Forbidden` が返る場合は JSON 形式がまだ無効なので、手順 4 を見直してください。

**7. Hermes を設定します:**

```bash
# ~/.hermes/.env
SEARXNG_URL=http://localhost:8888
```

そのうえで、`~/.hermes/config.yaml` で SearXNG を検索バックエンドとして選びます。

```yaml
web:
  search_backend: "searxng"
```

`hermes tools` → Web Search & Extract → SearXNG からでも設定できます。

---

#### 方法 B — 公開インスタンスを使う {#option-b-use-a-public-instance}

公開されている SearXNG のインスタンスは [searx.space](https://searx.space/) に一覧があります。**JSON 形式が有効** なインスタンス（表に表示されています）で絞り込んでください。

```bash
# ~/.hermes/.env
SEARXNG_URL=https://searx.example.com
```

:::caution 公開インスタンスについて
公開インスタンスにはレート制限があり、稼働状況も一定せず、JSON 形式がいつ無効になるか分かりません。本番用途には自前運用を強くおすすめします。
:::

---

#### SearXNG と抽出プロバイダを組み合わせる {#pair-searxng-with-an-extract-provider}

SearXNG が担当するのは検索だけなので、`web_extract` には別のプロバイダが必要です。機能ごとのキーを使います。

```yaml
# ~/.hermes/config.yaml
web:
  search_backend: "searxng"
  extract_backend: "firecrawl"   # or tavily, perplexity, keenable, exa, parallel
```

この設定なら、Hermes は検索クエリをすべて SearXNG に、URL の本文抽出を Firecrawl に投げます。無料の検索と質の高い抽出を組み合わせられます。

---

### Tavily {#tavily}

AI 向けに最適化された検索と抽出です。`hermes tools` で Tavily を選ぶ（または `web.backend: tavily` を設定する）と、アカウントなしの **キーなし**（レート制限あり）で使えます。上限を上げたい場合は API キーを設定してください。

```bash
# optional — skip this for keyless access after selecting Tavily
# ~/.hermes/.env
TAVILY_API_KEY=tvly-your-key-here
```

キーは [app.tavily.com](https://app.tavily.com/home) で取得します。[Tavily keyless](https://docs.tavily.com/documentation/keyless) も参照してください。

---

### Perplexity {#perplexity}

[Perplexity の Search API](https://docs.perplexity.ai/docs/search/quickstart) は、Perplexity 自身の索引から、順位付けされ日付の入った結果を返します（`web_search`）。`web_extract` では、公式の `pplx` CLI と同じ「クエリに関わる *抜粋*」の経路を使います。つまりページ全文をそのまま写し取るのではなく、そのページのうち意味のある一節だけが、省略箇所を `…` で示した形で返ります。ページ全体が必要なときは、`web.extract_backend` に Firecrawl / Exa / Parallel を選んでください。キーが必須で、匿名で使える枠はありません。

```bash
# ~/.hermes/.env
PERPLEXITY_API_KEY=pplx-your-key-here
```

キーは [perplexity.ai/account/api](https://www.perplexity.ai/account/api) で取得します。プロキシ経由にしたい場合は `PERPLEXITY_BASE_URL` を設定します。

---

### Exa {#exa}

意味を汲むニューラル検索です。調べ物や、概念的に関連する内容を探すのに向いています。

```bash
# ~/.hermes/.env
EXA_API_KEY=your-exa-key-here
```

キーは [exa.ai](https://exa.ai) で取得します。無料枠は月 1 000 検索です。

---

### Parallel {#parallel}

AI 前提で作られた検索と抽出で、深掘りの調査もこなします。

```bash
# ~/.hermes/.env
PARALLEL_API_KEY=your-parallel-key-here
```

利用申し込みは [parallel.ai](https://parallel.ai) から行います。

---

### xAI（Grok） {#xai-grok}

`web_search` を、Responses API 上の Grok のサーバー側 [web_search ツール](https://docs.x.ai/developers/tools/web-search)経由で処理します。実際の検索は Grok が行い、上位の結果を構造化された JSON で返します。

どちらの認証経路でも動きます。新しい環境変数も、新しい設定ウィザードも要りません。

```bash
# ~/.hermes/.env (env-var path)
XAI_API_KEY=sk-xai-your-key-here
```

SuperGrok の契約者であれば、次のようにします。

```bash
hermes auth add xai-oauth
```

そのうえで、xAI を検索バックエンドとして選びます。

```yaml
# ~/.hermes/config.yaml
web:
  backend: "xai"
```

**任意の調整項目:**

```yaml
web:
  backend: "xai"
  xai:
    model: grok-build-0.1        # reasoning model required by web_search (default)
    allowed_domains:             # optional, max 5 — mutex with excluded_domains
      - arxiv.org
    excluded_domains:            # optional, max 5
      - example-spam.com
    timeout: 90                  # seconds (default)
```

**検索専用** です。`web_extract` も必要なら Firecrawl / Tavily / Keenable / Exa / Parallel と組み合わせてください。401 が返ったときは、OAuth トークンの強制更新を 1 回だけ行って再試行します（有効期間の途中で失効した場合や、事前の期限チェックでは中身を読めない不透明なトークンに対応するためです）。環境変数による認証情報の場合、この再試行は行いません。

:::caution 信頼モデル
索引に基づくプロバイダ（Brave・Tavily・Exa）が検索エンジンの結果をそのまま返すのに対し、xAI では LLM がどの URL を出すかを選び、タイトルと説明も自分で書きます。クエリの *内容* が出力に影響するため、悪意をもって作られたクエリ（たとえばエージェントが拾った信用できない入力から注入されたもの）が、原理的には Grok を誘導して攻撃者の狙った URL を出させることがあり得ます。返ってきた URL は、モデルが生成したリンク全般と同じように扱ってください。とくにクエリが信用できない入力に由来する場合は、取得する前に検証してください。
:::

---

## 設定項目 {#configuration}

### 単一のバックエンド {#single-backend}

Web 系のすべての機能に、1 つのプロバイダを設定します。

```yaml
# ~/.hermes/config.yaml
web:
  backend: "searxng"   # firecrawl | searxng | brave-free | ddgs | tavily | perplexity | keenable | exa | parallel | xai
```

### 機能ごとの設定 {#per-capability-configuration}

検索と抽出で別のプロバイダを使います。無料の検索（SearXNG）と有料の抽出プロバイダ、あるいはその逆を組み合わせられます。

```yaml
# ~/.hermes/config.yaml
web:
  search_backend: "searxng"     # used by web_search
  extract_backend: "firecrawl"  # used by web_extract
```

機能ごとのキーが空のときは、どちらも `web.backend` に落ちます。Web の選択が一度も書き込まれていない場合にかぎり、存在する API キーや URL からバックエンドが自動判定されます。いったん選択が存在すれば、実行時は常にそれを使うので、`.env` にキーを足しても Web の通信先は変わりません。

**優先順位（機能ごと）:**
1. `web.search_backend` / `web.extract_backend`（機能ごとの明示指定）
2. `web.backend`（共通の受け皿。`nous` はマネージドな Tool Gateway）
3. 環境変数からの自動判定（一度も設定していない環境のみ）

### 自動判定 {#auto-detection}

バックエンドが **一度も** 選ばれていない場合（あなたも `hermes tools` も `web.backend` や機能ごとのキーを書いていない場合）、Hermes は設定済みの認証情報に応じて、最初に使えるものを選びます。

| 存在する認証情報 | 自動で選ばれるバックエンド |
|--------------------|-----------------------|
| `TAVILY_API_KEY` | tavily |
| `PERPLEXITY_API_KEY` | perplexity |
| `EXA_API_KEY` | exa |
| `PARALLEL_API_KEY` | parallel |
| `FIRECRAWL_API_KEY` または `FIRECRAWL_API_URL`（あるいは Nous Tool Gateway が使える状態） | firecrawl |
| `SEARXNG_URL` | searxng |
| `BRAVE_SEARCH_API_KEY` | brave-free |
| `ddgs` パッケージが import 可能 | ddgs |
| *(何も設定されていない)* | キーなしリング: exa / parallel / firecrawl / keenable（ラウンドロビン） |

**キーなし無料枠のリング:** 上のどの認証情報も *ない* とき、リクエストはリング参加ベンダー（Exa・Parallel・Firecrawl・Keenable）の公開無料枠を順に回るので、まっさらな環境でも設定ゼロで Web ツールが動きます。レート制限に当たったリクエストは、リングの次のベンダーへ自動的に切り替わります。ローテーションを止めたい場合は `hermes tools` でベンダーを 1 つ固定してください（その場合、リングは制限に当たったときの切り替え先としてだけ使われます）。無料枠はいずれもベンダー側でレート制限があり、短時間に集中させると引っかかりますが、通常の使い方を続ける分には問題ありません。この枠を切るには `web.keyless_fallback: false` を設定します。切ったうえで認証情報もない場合、プロバイダを設定するまで Web ツールは使えません。

**キー付きバックエンドへの一回限りのキーなし救済:** 選んだキー付きバックエンドが呼び出しに失敗したとき（キーの誤り、障害、上流の 5xx など）、その 1 回の呼び出しはエラーにせず、自動的にキーなし無料枠のリングで再試行します。結果には、どのベンダーが応じたかと理由が記録されます（`rescued_from` / `backend_error`）。この切り替えは尾を引きません。次の `web_search` / `web_extract` の呼び出しでは、また選んだバックエンドを試します。無効にするには `web.keyless_rescue: false` を指定します（`keyless_fallback` を切っている場合も同時に無効です）。

xAI の Web 検索は自動判定の連鎖に **含まれません**。`XAI_API_KEY` を設定していても（あるいは xAI Grok の OAuth でサインインしていても）、Web の通信が自動的に xAI へ回ることはありません。これらの認証情報は推論・音声合成・画像生成にも使われるもので、Web には別のバックエンドを使いたい場合があるからです。使うときは `web.backend: "xai"` と明示的に指定してください。

---

## 設定を確かめる {#verify-your-setup}

`hermes setup` を実行すると、どの Web バックエンドが認識されているか分かります。

```
✅ Web Search & Extract (searxng)
```

CLI から確かめることもできます。

```bash
# Activate the venv and run the web tools module directly
source ~/.hermes/hermes-agent/.venv/bin/activate
python -m tools.web_tools
```

有効なバックエンドとその状態が表示されます。

```
✅ Web backend: searxng
   Using SearXNG (search only): http://localhost:8888
```

---

## 困ったときは {#troubleshooting}

### `web_search` が `{"success": false}` を返す {#websearch-returns-success-false}

- `SEARXNG_URL` に到達できるか確かめます: `curl -s "http://localhost:8888/search?q=test&format=json"`
- HTTP 403 が返る場合は JSON 形式が無効です。`settings.yml` の `formats` の一覧に `json` を追加して再起動してください
- 接続エラーが返る場合はコンテナが動いていない可能性があります: `docker ps | grep searxng`

### `web_extract` が「search-only backend」と言う {#webextract-says-search-only-backend}

SearXNG は URL の本文を抽出できません。`web.extract_backend` に、抽出に対応したプロバイダを設定してください。

```yaml
web:
  search_backend: "searxng"
  extract_backend: "firecrawl"  # or tavily / perplexity / keenable / exa / parallel
```

### SearXNG の結果が 0 件になる {#searxng-returns-0-results}

公開インスタンスによっては、一部の検索エンジンやカテゴリを無効にしています。次を試してください。
- 別のクエリを使う
- [searx.space](https://searx.space/) から別の公開インスタンスを選ぶ
- 安定した結果を得たいなら自分でインスタンスを立てる

### 公開インスタンスでレート制限に当たる {#rate-limited-on-a-public-instance}

自前運用のインスタンスに切り替えてください（上の[方法 A](#option-a--self-host-with-docker-recommended)を参照）。Docker で立てた自分のインスタンスにはレート制限がありません。

### `web_extract` が `[TRUNCATED]` フッター付きの短い本文を返す {#webextract-returns-truncated-content-with-a-truncated-footer}

文字数の予算を超えたページでは、これが正常な動作です。フッターには、整形済みの全文が入ったディスク上のファイル名と、省かれた中間部分を読み進めるための `read_file` の正確な呼び出し方が書かれています。その場でもっと多く見たい場合は、`config.yaml` の `web.extract_char_limit` を引き上げるか、呼び出し時に大きめの `char_limit` を渡してください。

---

## 追加のスキル: `searxng-search` {#optional-skill-searxng-search}

`curl` で直接 SearXNG を使う必要があるエージェント向け（たとえば Web ツール一式が使えないときの代替手段として）には、追加スキルの `searxng-search` を入れてください。

```bash
hermes skills install official/research/searxng-search
```

これを入れると、エージェントは次のことを覚えます。
- `curl` や Python で SearXNG の JSON API を呼ぶ
- カテゴリ（`general`、`news`、`science` など）で絞り込む
- ページ送りとエラー時の処理をこなす
- SearXNG につながらないときに、うまく別の手に切り替える
