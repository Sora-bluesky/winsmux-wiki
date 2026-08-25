---
title: "Web 検索と抽出"
description: "複数のバックエンドを使って Web を検索し、ページの中身を取り出します。無料で自前運用できる SearXNG にも対応しています。"
upstream_path: user-guide/features/web-search.md
upstream_blob: ddacf7f4a86097718360dcb36783a4adb34c1dca
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/web-search
---

# Web 検索と抽出 {#web-search-extract}

Hermes Agent には、モデルから呼べる Web 用のツールが 2 つあり、いずれも複数のプロバイダーで動きます。

- **`web_search`** — Web を検索して、順位付きの結果を返します
- **`web_extract`** — 1 つ以上の URL を取得して、読める形の中身を取り出します

どちらもバックエンドを 1 か所選ぶだけで設定できます。プロバイダーは `hermes tools` で選ぶか、`config.yaml` に直接書きます。

## バックエンド {#backends}

| プロバイダー | 環境変数 | 検索 | 抽出 | 無料枠 |
|----------|---------|--------|---------|-----------|
| **Firecrawl**（既定） | `FIRECRAWL_API_KEY`（任意 — 選ぶだけならキーなしでも動きます） | ✔ | ✔ | 月 500 クレジット · 選択時はキーなしのクラウド |
| **SearXNG** | `SEARXNG_URL` | ✔ | — | ✔ 無料（自前運用） |
| **Brave Search（無料枠）** | `BRAVE_SEARCH_API_KEY` | ✔ | — | 月 2 000 クエリ |
| **DDGS（DuckDuckGo）** | —（キー不要） | ✔ | — | ✔ 無料 |
| **Tavily** | `TAVILY_API_KEY`（任意） | ✔ | ✔ | ✔ キーなしの持ち回りに参加 · 無料キーありで月 1 000 検索 |
| **Exa** | `EXA_API_KEY`（任意） | ✔ | ✔ | ✔ キーなしの持ち回りに参加 · キーありで月 1 000 検索 |
| **Parallel** | `PARALLEL_API_KEY`（任意） | ✔ | ✔ | ✔ キーなしの持ち回りに参加 · キーありは有料 |
| **Keenable** | `KEENABLE_API_KEY`（任意） | ✔ | ✔ | ✔ キーなしの持ち回りに参加 · キーありは有料 |
| **xAI (Grok)** | `XAI_API_KEY` または `hermes auth add xai-oauth` | ✔ | — | 有料（SuperGrok かトークン従量） |

Brave Search、DDGS、xAI は **検索専用** です。`web_extract` も使いたい場合は、Firecrawl / Tavily / Exa / Parallel のどれかと組み合わせてください。DDGS は内部で [`ddgs` Python パッケージ](https://pypi.org/project/ddgs/) を使います。未インストールなら `pip install ddgs` を実行してください（初回利用時に Hermes が自動で入れることもできます）。xAI は Responses API 上で Grok のサーバー側 `web_search` ツールを動かします。結果は索引に基づくものではなく LLM が生成したものなので、タイトルも説明も URL の選択もすべてモデルの出力です（下の [信頼モデルの注意](#xai-grok) を参照）。

**機能ごとの使い分け:** 検索と抽出で別々のプロバイダーを使えます。たとえば検索は SearXNG（無料）、抽出は Firecrawl という組み合わせです。下の [機能ごとの設定](#per-capability-configuration) を参照してください。

:::info そのままでも動きます — キー不要の無料枠の持ち回り
入れたばかりで **Web 系の認証情報がまったくない** 状態でも、`web_search` と `web_extract` はそのまま動きます。リクエストは 5 社の公開無料枠 — **Exa、Parallel、Tavily、Firecrawl、Keenable** — を順番に回して負荷を分散し、レート制限に当たったリクエストは持ち回りの次の事業者で自動的にやり直します（どこかが応じるか、全部が制限されるまで何段でも移ります）。登録もキーも要りません。この枠はあくまで最後の手段で、設定済みのバックエンドや存在する API キーがつねに優先されます。リクエストには利用者を特定する情報を載せません（プロセスごとのランダムなセッション ID だけで、再起動のたびに変わります）。制限のない確実なサービスが必要なら、キーを設定したプロバイダーを用意してください。この枠を完全に止めるには `web.keyless_fallback: false` を設定します。
:::

**無料と有料を自分で選ぶ:** `hermes tools` では、Exa、Parallel、Keenable がそれぞれ 2 行ずつ — **Free (keyless)** と **Paid (API key)** — で並びます。Free を選ぶとその事業者の匿名エンドポイントに固定され（あとからキーを足しても変わりません）、Paid を選ぶとキーを使う経路に固定されます（キーがないと、黙って無料枠に落ちるのではなくエラーになります）。選択内容は `web.provider_tier.<name>: free|paid` として保存されます。未設定のままにすると自動判定です（キーがあれば有料、なければキーなしの持ち回り）。

:::tip Nous の契約者へ
[Nous Portal](https://portal.nousresearch.com) の有料契約があれば、Web の検索と抽出は **[ツールゲートウェイ](/hermes/docs/user-guide/features/tool-gateway/)** 経由の Firecrawl（運用込み）で使えます。API キーは要りません。新規に入れた場合は `hermes setup --portal` でログインすれば、ゲートウェイのツールをまとめて有効にできます。すでに使っている場合は、`hermes tools` から Web だけ切り替えられます。
:::

---

## `web_extract` が長いページをどう扱うか {#how-webextract-handles-long-pages}

バックエンドはページのマークダウンをそのまま返すので、掲示板のスレッド、ドキュメントサイト、コメント付きのニュース記事などでは膨大な量になります。コンテキストウィンドウを使える状態に保つため、`web_extract` は **決まった文字数の予算** を当てはめます。LLM による要約は一切挟みません。

| ページの大きさ（文字数） | 何が起きるか |
|------------------------|--------------|
| 予算以下（既定は 15 000） | まるごと返します。マークダウン全体がエージェントに届きます |
| 予算を超える | 先頭と末尾の窓（先頭 約 75% / 末尾 約 25%、マークダウンの行の切れ目で切ります）に、`[TRUNCATED]` の注記を付けます。整形済みの全文はディスクに保存され、注記にはそのファイルのパスと、省かれた中ほどを読み進めるための `read_file` の呼び出し方が書かれます |
| 2 000 000 を超える | 保存するテキストは 2 MB で頭打ちになります |

1 ページあたりの予算は `config.yaml` の `web.extract_char_limit` で変えられます（既定は `15000`、2 000〜500 000 の範囲に収められます）。エージェント側も、ツールの `char_limit` 引数で呼び出しごとに引き上げられます。

### 切り詰めが邪魔になるとき {#when-truncation-gets-in-the-way}

取り出したマークダウンではなく、生きた DOM そのものが必要なとき — たとえば JavaScript 中心のページで、抽出してもほとんど中身が返ってこない場合 — は、代わりに `browser_navigate` と `browser_snapshot` を使ってください。ブラウザーのツールは生きたアクセシビリティツリーを返します（巨大なページでは、こちらにも独自の上限があります）。

---

## 結果のキャッシュ {#result-caching}

短い時間のうちに同じ Web 呼び出しが起きた場合は、有料のバックエンドではなくキャッシュから返します。これでクレジットと待ち時間を節約できます。重複が起きやすいのは 2 つの場面です。サブエージェントを一斉に走らせたとき（複数の委任先が同じ話題を調べる）と、エージェントが数分前に読んだページを見直すときです。

| 呼び出し | キャッシュ | 有効範囲 |
|------|-------|-------|
| `web_search` — 同じ検索語（大文字小文字と空白は無視）、同じプロバイダー | メモリー上のメモ | プロセスごと |
| `web_extract` — 同じ URL、同じ形式、同じプロバイダー | 全文を `~/.hermes/cache/web/` に保存 | CLI、ゲートウェイ、定期実行、サブエージェントの各プロセスで共有 |

同じ検索が同時に走った場合（サブエージェントを並列に走らせて同じ検索語が一斉に飛ぶ場合）は、**バックエンドへの 1 回のリクエストにまとめられます**。最初の呼び出し元が費用を負担し、残りは同じ応答を共有します。検索の件数指定は 10 / 20 / 50 / 100 に丸められるので、ほとんど同じリクエスト（`limit=5` と `limit=8`）が 1 つのキャッシュを共有しつつ、各呼び出し元は要求した件数を受け取ります。

キャッシュされるのは成功した応答だけです。失敗した場合はつねにバックエンドへやり直しますし、キーなしの緊急回避で処理された応答はキャッシュされません（次の呼び出しでは、また選んだバックエンドを試します）。`security.website_blocklist` に当たる URL も、キャッシュからは返しません。キャッシュ済みの抽出結果は通常の切り詰め処理をあらためて通るので、2 回目に別の `char_limit` を渡すと、同じ保存済みの取得結果からその長さで返ります。

**ローカル開発の URL はキャッシュしません。** `localhost`、`127.0.0.1`、`*.local`、ドットを含まない LAN のホスト名、プライベートやリンクローカルの IP 範囲（`192.168.*`、`10.*`、`172.16-31.*`）は、抽出のキャッシュを完全に素通りします。開発サーバー、ホットリロードのビルド、チャット GUI の成果物プレビューは保存のたびに変わるので、キャッシュがあると古いビルドを見せてしまうからです。ローカルのページは毎回その場で取得します。（そもそもこれらの URL に届くのは、`security.allow_private_urls` を有効にしている場合だけです。）

**公開インターネット越しに動作確認したい場合は?** ステージング環境やトンネルの URL は公開 DNS なので、ローカル開発の規則では拾えません。`web.cache_exempt_hosts` に並べておけば、これらもつねにその場で取得します。項目は完全一致、`*.` のワイルドカード、ドメインの後方一致のいずれかで判定されます（`mysite.dev` と書くと `preview.mysite.dev` も含みます）。

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

スコアや価格、速報のような本当に動きのあるデータを調べていて、毎回新しく取りたい場合は、TTL を短くするか `web.cache_enabled: false` を設定してください。

---

## 設定 {#setup}

### `hermes tools` でさっと設定する {#quick-setup-via-hermes-tools}

`hermes tools` を実行し、**Web Search & Extract** へ進んでプロバイダーを選びます。必要な URL や API キーは対話形式で聞かれ、設定に書き込まれます。

```bash
hermes tools
```

---

### Firecrawl（既定） {#firecrawl-default}

検索も抽出もひととおりそろっています。多くの人にはこれをおすすめします。

```bash
# ~/.hermes/.env
FIRECRAWL_API_KEY=fc-your-key-here
```

キーは [firecrawl.dev](https://firecrawl.dev) で取得します。無料枠は月 500 クレジットです。

**Firecrawl を自前で動かす場合:** クラウドの API ではなく、自分のインスタンスを指します。

```bash
# ~/.hermes/.env
FIRECRAWL_API_URL=http://localhost:3002
```

`FIRECRAWL_API_URL` を設定した場合、API キーは任意です（サーバー側の認証は `USE_DB_AUTHENTICATION=false` で切れます）。

---

### SearXNG（無料・自前運用） {#searxng-free-self-hosted}

SearXNG はプライバシーに配慮したオープンソースのメタ検索エンジンで、70 以上の検索エンジンの結果をまとめます。**API キーは不要** で、動いている SearXNG のインスタンスを Hermes に教えるだけです。

SearXNG は **検索専用** です。`web_extract` には別の抽出プロバイダーが要ります。

#### 方法 A — Docker で自前運用する（おすすめ） {#option-a-self-host-with-docker-recommended}

自分専用のインスタンスが手に入り、レート制限もありません。

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

**3. コンテナーを起動します:**

```bash
docker compose up -d
```

**4. JSON API の形式を有効にします:**

SearXNG は既定で JSON 出力が無効になっています。生成された設定をコピーして有効にします。

```bash
# Copy the auto-generated config out of the container
docker cp searxng:/etc/searxng/settings.yml ~/searxng/searxng/settings.yml
```

`~/searxng/searxng/settings.yml` を開きます。
`use_default_settings: true` があれば、そのファイルには上書きしたい設定だけが入っています。ほかの設定は組み込みの既定値を引き継ぎます。
Hermes 向けに JSON の応答を有効にするには、次の上書きを足します。

```yaml
search:
  formats:
    - html
    - json
```

`settings.yml` はおおむね次のようになります。

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

**6. 動作を確認します:**

```bash
curl -s "http://localhost:8888/search?q=test&format=json" | python3 -c \
  "import sys,json; d=json.load(sys.stdin); print(f'{len(d[\"results\"])} results')"
```

`10 results` のような表示が出れば成功です。`403 Forbidden` が返る場合は JSON の形式がまだ無効なので、手順 4 を見直してください。

**7. Hermes を設定します:**

```bash
# ~/.hermes/.env
SEARXNG_URL=http://localhost:8888
```

そのうえで、`~/.hermes/config.yaml` で検索のバックエンドに SearXNG を選びます。

```yaml
web:
  search_backend: "searxng"
```

`hermes tools` → Web Search & Extract → SearXNG からでも設定できます。

---

#### 方法 B — 公開インスタンスを使う {#option-b-use-a-public-instance}

公開されている SearXNG のインスタンスは [searx.space](https://searx.space/) に一覧があります。**JSON 形式が有効** なもの（表に表示されます）で絞り込んでください。

```bash
# ~/.hermes/.env
SEARXNG_URL=https://searx.example.com
```

:::caution 公開インスタンスについて
公開インスタンスにはレート制限があり、稼働状況も一定せず、JSON 形式がいつ無効になるか分かりません。本番で使うなら自前運用を強くおすすめします。
:::

---

#### SearXNG と抽出プロバイダーを組み合わせる {#pair-searxng-with-an-extract-provider}

SearXNG は検索を担当するので、`web_extract` には別のプロバイダーが要ります。機能ごとのキーを使ってください。

```yaml
# ~/.hermes/config.yaml
web:
  search_backend: "searxng"
  extract_backend: "firecrawl"   # or tavily, exa, parallel
```

この設定では、Hermes は検索をすべて SearXNG で行い、URL の抽出は Firecrawl で行います。無料の検索と質の高い抽出を組み合わせられます。

---

### Tavily {#tavily}

AI 向けに最適化された検索と抽出です。`hermes tools` で Tavily を選ぶ（または `web.backend: tavily` を設定する）と、アカウントなしの **キーなし** で使えます（レート制限あり）。上限を上げたいときは API キーを設定します。

```bash
# optional — skip this for keyless access after selecting Tavily
# ~/.hermes/.env
TAVILY_API_KEY=tvly-your-key-here
```

キーは [app.tavily.com](https://app.tavily.com/home) で取得します。[Tavily のキーなし利用](https://docs.tavily.com/documentation/keyless) も参照してください。

何も設定していない環境では、名前の付いた既定は Firecrawl のままです。キーなしの Tavily が自動で選ばれることはありません。

---

### Exa {#exa}

意味を踏まえたニューラル検索です。調べ物や、概念的に近い内容を見つけたいときに向きます。

```bash
# ~/.hermes/.env
EXA_API_KEY=your-exa-key-here
```

キーは [exa.ai](https://exa.ai) で取得します。無料枠は月 1 000 検索です。

---

### Parallel {#parallel}

AI を前提に作られた検索と抽出で、踏み込んだ調査もこなします。

```bash
# ~/.hermes/.env
PARALLEL_API_KEY=your-parallel-key-here
```

利用申し込みは [parallel.ai](https://parallel.ai) から行います。

---

### xAI (Grok) {#xai-grok}

`web_search` を、Responses API 上にある Grok のサーバー側 [web_search ツール](https://docs.x.ai/developers/tools/web-search) に流します。実際の検索は Grok が行い、上位の結果を構造化された JSON で返します。

どちらの認証方法でも使えます。新しい環境変数も、新しい設定ウィザードも要りません。

```bash
# ~/.hermes/.env (env-var path)
XAI_API_KEY=sk-xai-your-key-here
```

SuperGrok の契約者は次のようにします。

```bash
hermes auth add xai-oauth
```

そのうえで、検索のバックエンドに xAI を選びます。

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

**検索専用** です。`web_extract` も使うなら Firecrawl / Tavily / Exa / Parallel と組み合わせてください。401 が返った場合、このプロバイダーは OAuth トークンの再取得を 1 回だけ強制して再試行します（有効期間の途中で失効した場合や、事前の期限チェックでは中身を読めない不透明なトークンに対応するためです）。環境変数の認証情報ではこの再試行は行いません。

:::caution 信頼モデルについて
索引に基づくプロバイダー（Brave、Tavily、Exa）が検索エンジンの結果をそのまま返すのに対し、xAI ではどの URL を出すかを LLM が選び、タイトルと説明も自分で書きます。検索語の *中身* が出力に影響するので、悪意を持って作られた検索語（たとえばエージェントが拾ってきた信用できない入力から紛れ込んだもの）が、攻撃者の狙った URL を Grok に出させる余地が原理的にあります。返ってきた URL は、モデルが生成したリンク全般と同じように扱ってください。とくに検索語が信用できない入力から来ている場合は、取得する前に確かめましょう。
:::

---

## 設定 {#configuration}

### 単一のバックエンド {#single-backend}

Web の機能すべてに 1 つのプロバイダーを設定します。

```yaml
# ~/.hermes/config.yaml
web:
  backend: "searxng"   # firecrawl | searxng | brave-free | ddgs | tavily | exa | parallel | xai
```

### 機能ごとの設定 {#per-capability-configuration}

検索と抽出で別々のプロバイダーを使います。無料の検索（SearXNG）と有料の抽出プロバイダー、あるいはその逆を組み合わせられます。

```yaml
# ~/.hermes/config.yaml
web:
  search_backend: "searxng"     # used by web_search
  extract_backend: "firecrawl"  # used by web_extract
```

機能ごとのキーが空のときは、どちらも `web.backend` に落ちます。Web の選択が一度も書き込まれていない場合にかぎり、存在する API キーや URL からバックエンドが自動判定されます。いったん選択がある状態になれば、実行時はつねにそれを使い、`.env` にキーを足しても Web の通信先は変わりません。

**優先順位（機能ごと）:**
1. `web.search_backend` / `web.extract_backend`（機能ごとの明示指定）
2. `web.backend`（共通の受け皿。`nous` は運用込みのツールゲートウェイ）
3. 環境変数からの自動判定（一度も設定していない場合のみ）

### 自動判定 {#auto-detection}

バックエンドが **一度も** 選ばれていない場合（`web.backend` や機能ごとのキーを、自分でも `hermes tools` でも書いていない場合）、Hermes は設定済みの認証情報を見て、使えるものを上から順に選びます。

| ある認証情報 | 自動で選ばれるバックエンド |
|--------------------|-----------------------|
| `TAVILY_API_KEY` | tavily |
| `EXA_API_KEY` | exa |
| `PARALLEL_API_KEY` | parallel |
| `FIRECRAWL_API_KEY` または `FIRECRAWL_API_URL`（あるいは Nous のツールゲートウェイが使える状態） | firecrawl |
| `SEARXNG_URL` | searxng |
| `BRAVE_SEARCH_API_KEY` | brave-free |
| `ddgs` パッケージを読み込める | ddgs |
| *(何も設定されていない)* | キーなしの持ち回り: exa / parallel / tavily / firecrawl / keenable（順番に回します） |

**キー不要の無料枠の持ち回り:** 上の認証情報が *ひとつも* ない場合、リクエストは 5 社の公開無料枠（Exa、Parallel、Tavily、Firecrawl、Keenable）を順に回るので、入れたばかりで何も設定していなくても Web のツールが動きます。レート制限に当たったリクエストは、持ち回りの次の事業者へ自動で移ります。`hermes tools` で 1 社に固定すれば持ち回りは止まります（そのあとは、制限に当たったときの引き継ぎ先としてだけ使われます）。どの無料枠も、短時間に集中すると事業者側の制限に当たります。ふだんの使い方であれば問題ありません。この枠を止めるには `web.keyless_fallback: false` を設定します。止めたうえで認証情報もない場合、プロバイダーを設定するまで Web のツールは使えません。

**キーありのバックエンド向けの、1 回かぎりの緊急回避:** 選んだキーありのバックエンドが呼び出しに失敗したとき（キーの誤り、障害、上流の 5xx）、その 1 回だけはエラーにせず、キー不要の無料枠の持ち回りで自動的にやり直します。結果には、どの事業者が処理したか、そしてその理由が記されます（`rescued_from` / `backend_error`）。この切り替えは残りません。次の `web_search` / `web_extract` の呼び出しでは、また選んだバックエンドを試します。止めるには `web.keyless_rescue: false` を設定します（`keyless_fallback` を切っている場合も同時に無効です）。

xAI の Web 検索は自動判定の対象に **入っていません**。`XAI_API_KEY` を設定していても（xAI Grok の OAuth でログインしていても）、Web の通信が自動で xAI に向くことはありません。これらの認証情報は推論や音声合成、画像生成にも使われるもので、Web には別のバックエンドを使いたい人もいるからです。使いたい場合は `web.backend: "xai"` で明示的に指定してください。

---

## 設定を確認する {#verify-your-setup}

`hermes setup` を実行すると、どの Web バックエンドが検出されているか分かります。

```
✅ Web Search & Extract (searxng)
```

CLI から確かめることもできます。

```bash
# Activate the venv and run the web tools module directly
source ~/.hermes/hermes-agent/.venv/bin/activate
python -m tools.web_tools
```

現在のバックエンドとその状態が表示されます。

```
✅ Web backend: searxng
   Using SearXNG (search only): http://localhost:8888
```

---

## 困ったときは {#troubleshooting}

### `web_search` が `{"success": false}` を返す {#websearch-returns-success-false}

- `SEARXNG_URL` に届くか確かめます: `curl -s "http://localhost:8888/search?q=test&format=json"`
- HTTP 403 が返る場合は JSON 形式が無効です。`settings.yml` の `formats` の一覧に `json` を足して再起動してください
- 接続エラーが返る場合、コンテナーが動いていない可能性があります: `docker ps | grep searxng`

### `web_extract` が「search-only backend」と言う {#webextract-says-search-only-backend}

SearXNG は URL の中身を取り出せません。`web.extract_backend` に、抽出できるプロバイダーを設定してください。

```yaml
web:
  search_backend: "searxng"
  extract_backend: "firecrawl"  # or tavily / exa / parallel
```

### SearXNG の結果が 0 件になる {#searxng-returns-0-results}

公開インスタンスによっては、特定の検索エンジンやカテゴリーを無効にしています。次を試してください。
- 別の検索語にする
- [searx.space](https://searx.space/) から別の公開インスタンスを選ぶ
- 安定した結果のために自分のインスタンスを立てる

### 公開インスタンスでレート制限に当たる {#rate-limited-on-a-public-instance}

自前運用のインスタンスに切り替えてください（上の [方法 A](#option-a--self-host-with-docker-recommended) を参照）。Docker で立てた自分のインスタンスにはレート制限がありません。

### `web_extract` が `[TRUNCATED]` の注記付きで途中までしか返さない {#webextract-returns-truncated-content-with-a-truncated-footer}

文字数の予算を超えたページでは、これが正常な動作です。注記には、整形済みの全文が入ったディスク上のファイル名と、省かれた中ほどを読み進めるための `read_file` の呼び出し方が書かれています。その場でもっと見たい場合は、`config.yaml` の `web.extract_char_limit` を引き上げるか、呼び出し時に大きめの `char_limit` を渡してください。

---

## 追加スキル: `searxng-search` {#optional-skill-searxng-search}

Web のツール群が使えないときの逃げ道など、SearXNG を `curl` で直接使わせたい場合は、追加スキルの `searxng-search` を入れます。

```bash
hermes skills install official/research/searxng-search
```

このスキルは、エージェントに次のやり方を教えます。
- SearXNG の JSON API を `curl` か Python から呼ぶ
- カテゴリー（`general`、`news`、`science` など）で絞り込む
- ページ送りとエラーの場合に対応する
- SearXNG に届かないときは無理をせず引き下がる
