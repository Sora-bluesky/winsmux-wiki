---
title: "Web 検索と本文の取り出し"
description: "複数の提供元を切り替えながらウェブを検索し、ページの中身を取り出す。無料で自前に立てられる SearXNG も使える"
upstream_path: user-guide/features/web-search.md
upstream_blob: 32959102b77e9913c5b568c9d79ef108e083806d
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/web-search
---

# Web 検索と本文の取り出し {#web-search-extract}

Hermes Agent には、複数の提供元に支えられた、モデルから呼び出せるウェブ向けの道具が2つ入っています。

- **`web_search`** — ウェブを検索して、順位付きの結果を返します
- **`web_extract`** — ひとつ以上の URL を取りに行き、読める形の本文を取り出します

どちらも、ひとつの提供元の選択でまとめて設定します。提供元は `hermes tools` で選ぶか、`config.yaml` に直接書きます。

## 提供元 {#backends}

| 提供元 | 環境変数 | 検索 | 取り出し | 無料枠 |
|----------|---------|--------|---------|-----------|
| **Firecrawl**（既定） | `FIRECRAWL_API_KEY`（任意 — 選んだ時点で鍵なしでも使えます） | ✔ | ✔ | 月 500 クレジット・選べば鍵なしでクラウド利用 |
| **SearXNG** | `SEARXNG_URL` | ✔ | — | ✔ 無料（自前で立てる） |
| **Brave Search（無料枠）** | `BRAVE_SEARCH_API_KEY` | ✔ | — | 月 2 000 件 |
| **DDGS（DuckDuckGo）** | —（鍵は不要） | ✔ | — | ✔ 無料 |
| **Tavily** | `TAVILY_API_KEY`（任意） | ✔ | ✔ | ✔ 鍵なしの持ち回りに参加・無料の鍵があれば月 1 000 回の検索 |
| **Exa** | `EXA_API_KEY`（任意） | ✔ | ✔ | ✔ 鍵なしの持ち回りに参加・鍵があれば月 1 000 回の検索 |
| **Parallel** | `PARALLEL_API_KEY`（任意） | ✔ | ✔ | ✔ 鍵なしの持ち回りに参加・鍵を使うと有料 |
| **Keenable** | `KEENABLE_API_KEY`（任意） | ✔ | ✔ | ✔ 鍵なしの持ち回りに参加・鍵を使うと有料 |
| **xAI（Grok）** | `XAI_API_KEY` または `hermes auth add xai-oauth` | ✔ | — | 有料（SuperGrok またはトークン従量） |

Brave Search、DDGS、xAI は**検索だけ**に対応しています。`web_extract` も使いたいときは、これらのどれかと Firecrawl／Tavily／Exa／Parallel を組み合わせてください。DDGS は内部で [`ddgs` の Python パッケージ](https://pypi.org/project/ddgs/)を使います。まだ入っていなければ `pip install ddgs` を実行するか、初回利用時に Hermes がその場で入れるのに任せてください。xAI は Responses API 上で Grok のサーバー側 `web_search` ツールを走らせます。結果は索引に基づくものではなく大規模言語モデルが書いたものなので、題名も説明も URL の選び方もすべてモデルの出力です（後述の[信頼のしかたに関する注意](#xai-grok)を読んでください）。

**役割ごとの切り分け:** 検索と取り出しで別々の提供元を使えます。たとえば検索は SearXNG（無料）、取り出しは Firecrawl といった組み合わせです。後述の[役割ごとの設定](#per-capability-configuration)を見てください。

:::info そのままでも動きます — 鍵なしの無料枠を順番に使います
ウェブ向けの資格情報を**ひとつも持たない**入れたてのままでも、`web_search` と `web_extract` は動きます。要求は5社の公開された無料枠 — **Exa、Parallel、Tavily、Firecrawl、Keenable** — を順ぐりに回り、負荷を均等に散らします。回数制限に当たった要求は、次の会社へ自動で回されます（誰かが応えるか全社が制限に達するまで、何度でも渡り歩きます）。登録も鍵もいりません。この枠はあくまで最後の手段で、提供元の設定や API の鍵があればそちらが必ず優先されます。要求に利用者を特定できるものは含まれません（毎回の処理ごとに作られる乱数の識別子だけで、これも起動のたびに変わります）。確実に、制限なく使いたいときは鍵のある提供元を用意してください。鍵なしの枠をまるごと止めるには `web.keyless_fallback: false` を設定します。
:::

**無料と有料を自分で選ぶ:** `hermes tools` では、Exa、Parallel、Keenable がそれぞれ2行に分かれて出ます — **Free (keyless)** と **Paid (API key)** です。Free を選ぶとその会社の匿名の窓口に固定されます（あとから鍵を足しても変わりません）。Paid を選ぶと鍵を使う経路に固定され、鍵がないときは黙って無料枠に落ちるのではなくエラーになります。選んだ内容は `web.provider_tier.<name>: free|paid` として保存されます。何も設定しなければ自動判定です（鍵があれば有料、なければ鍵なしの持ち回り）。

:::tip Nous の契約者の方へ
有料の [Nous Portal](https://portal.nousresearch.com) を契約していれば、ウェブの検索と取り出しは **[Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/)** 経由で、Nous 側が用意した Firecrawl を通して使えます。API の鍵はいりません。新しく入れる場合は `hermes setup --portal` でログインすれば、Gateway の道具をまとめて有効にできます。すでに入れてある場合は `hermes tools` からウェブの分だけ切り替えられます。
:::

---

## `web_extract` が長いページをどう扱うか {#how-webextract-handles-long-pages}

提供元が返してくるのは、そのままのページの Markdown です。掲示板の書き込み、文書の一覧、コメント付きのニュース記事などでは、これがとても大きくなります。読み込める文字量を使い切らないよう、`web_extract` は**あらかじめ決まった文字数の枠**を当てはめます。大規模言語モデルによる要約は挟みません。

| ページの大きさ（文字数） | どうなるか |
|------------------------|--------------|
| 枠のうち（既定は 15 000） | まるごと返ります。Markdown の全文がエージェントに届きます |
| 枠を超えたとき | 前と後ろを切り出した窓（およそ前 75%／後ろ 25%、Markdown の行の切れ目で切ります）に、`[TRUNCATED]` と書かれた注記が付きます。整えた全文はディスクに保存され、注記がそのファイルの場所と、省かれた真ん中を読み進めるための `read_file` の呼び方をエージェントに伝えます |
| 2 000 000 を超えたとき | 保存する文字は 2 MB で頭打ちになります |

1ページあたりの枠は `config.yaml` の `web.extract_char_limit` で変えられます（既定は `15000`、2 000〜500 000 の範囲に収められます）。エージェントは道具の `char_limit` 引数で、その呼び出しだけ枠を広げることもできます。

### 切り詰めが邪魔になるとき {#when-truncation-gets-in-the-way}

取り出した Markdown ではなく、表示されている生の DOM がどうしても必要なとき — たとえば JavaScript を多用したページで、取り出してもほとんど中身が返ってこないとき — は、代わりに `browser_navigate` と `browser_snapshot` を使ってください。ブラウザの道具は、実際に表示されているアクセシビリティツリーを返します（こちらにも、巨大なページ向けに独自の上限があります）。

---

## 準備 {#setup}

### `hermes tools` を使った手早い準備 {#quick-setup-via-hermes-tools}

`hermes tools` を実行し、**Web Search & Extract** を開いて提供元を選びます。必要な URL や API の鍵はその場で聞かれ、設定に書き込まれます。

```bash
hermes tools
```

---

### Firecrawl（既定） {#firecrawl-default}

検索も取り出しもひととおり揃っています。多くの方にはこれをおすすめします。

```bash
# ~/.hermes/.env
FIRECRAWL_API_KEY=fc-your-key-here
```

鍵は [firecrawl.dev](https://firecrawl.dev) で取れます。無料枠には月 500 クレジットが含まれます。

**自前で立てた Firecrawl:** クラウドの API ではなく、自分の環境を指すようにできます。

```bash
# ~/.hermes/.env
FIRECRAWL_API_URL=http://localhost:3002
```

`FIRECRAWL_API_URL` を設定していれば、API の鍵は任意です（サーバー側の認証は `USE_DB_AUTHENTICATION=false` で切れます）。

---

### SearXNG（無料・自前で立てる） {#searxng-free-self-hosted}

SearXNG は、プライバシーに配慮した公開ソースの横断検索エンジンで、70 を超える検索エンジンの結果をまとめます。**API の鍵はいりません** — 動いている SearXNG を Hermes に指し示すだけです。

SearXNG は**検索だけ**に対応しています。`web_extract` には別の取り出し用の提供元が必要です。

#### 方法 A — Docker で自前に立てる（おすすめ） {#option-a-self-host-with-docker-recommended}

回数制限のない、自分だけの環境が手に入ります。

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

**4. JSON の形式を有効にします:**

SearXNG は、出荷時には JSON での出力を切ってあります。自動で作られた設定を取り出して、有効にしてください。

```bash
# Copy the auto-generated config out of the container
docker cp searxng:/etc/searxng/settings.yml ~/searxng/searxng/settings.yml
```

`~/searxng/searxng/settings.yml` を開きます。
`use_default_settings: true` が書かれていれば、そのファイルには上書きしたい分だけが入っています。それ以外の設定は、組み込みの既定から引き継がれます。
Hermes 向けに JSON での応答を有効にするには、次の上書きを足してください。

```yaml
search:
  formats:
    - html
    - json
```

`settings.yml` は、だいたい次のような姿になります。

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

**6. 動いているか確かめます:**

```bash
curl -s "http://localhost:8888/search?q=test&format=json" | python3 -c \
  "import sys,json; d=json.load(sys.stdin); print(f'{len(d[\"results\"])} results')"
```

`10 results` のような表示が出るはずです。`403 Forbidden` が返るなら JSON の形式がまだ切れています。手順4を見直してください。

**7. Hermes を設定します:**

```bash
# ~/.hermes/.env
SEARXNG_URL=http://localhost:8888
```

そのうえで、`~/.hermes/config.yaml` で検索の提供元として SearXNG を選びます。

```yaml
web:
  search_backend: "searxng"
```

`hermes tools` → Web Search & Extract → SearXNG から設定してもかまいません。

---

#### 方法 B — 公開されている環境を使う {#option-b-use-a-public-instance}

公開されている SearXNG の一覧は [searx.space](https://searx.space/) にあります。**JSON の形式が有効**なもの（表に書かれています）に絞り込んでください。

```bash
# ~/.hermes/.env
SEARXNG_URL=https://searx.example.com
```

:::caution 公開されている環境について
公開されている環境には回数制限があり、稼働も安定せず、JSON の形式がいつ切られてもおかしくありません。本番で使うなら、自前で立てることを強くおすすめします。
:::

---

#### SearXNG と取り出し用の提供元を組み合わせる {#pair-searxng-with-an-extract-provider}

SearXNG は検索を受け持ちます。`web_extract` には別の提供元が必要です。役割ごとの項目を使ってください。

```yaml
# ~/.hermes/config.yaml
web:
  search_backend: "searxng"
  extract_backend: "firecrawl"   # or tavily, exa, parallel
```

この設定なら、Hermes は検索をすべて SearXNG に、URL からの取り出しを Firecrawl に任せます。無料の検索と質の高い取り出しを両立できます。

---

### Tavily {#tavily}

AI 向けに最適化された検索と取り出しです。`hermes tools` で Tavily を選ぶ（または `web.backend: tavily` を設定する）と、アカウントなしの**鍵なし**で使えます（回数制限あり）。上限を上げたいときは API の鍵を設定してください。

```bash
# optional — skip this for keyless access after selecting Tavily
# ~/.hermes/.env
TAVILY_API_KEY=tvly-your-key-here
```

鍵は [app.tavily.com](https://app.tavily.com/home) で取れます。[Tavily の鍵なし利用](https://docs.tavily.com/documentation/keyless)も参照してください。

何も設定していない状態では、名前付きの既定は Firecrawl のままです。鍵なしの Tavily が自動で選ばれることはありません。

---

### Exa {#exa}

意味を汲み取るニューラル検索です。調べものや、考え方の近い内容を探すのに向いています。

```bash
# ~/.hermes/.env
EXA_API_KEY=your-exa-key-here
```

鍵は [exa.ai](https://exa.ai) で取れます。無料枠には月 1 000 回の検索が含まれます。

---

### Parallel {#parallel}

AI を前提に作られた検索と取り出しで、深く調べる力を備えています。

```bash
# ~/.hermes/.env
PARALLEL_API_KEY=your-parallel-key-here
```

利用の申し込みは [parallel.ai](https://parallel.ai) から行います。

---

### xAI（Grok） {#xai-grok}

`web_search` を、Responses API 上にある Grok のサーバー側の [web_search ツール](https://docs.x.ai/developers/tools/web-search)へ回します。実際に検索するのは Grok で、上位の結果が構造化された JSON として返ります。

どちらの資格情報でも動きます。新しい環境変数も、新しい設定の手順もいりません。

```bash
# ~/.hermes/.env (env-var path)
XAI_API_KEY=sk-xai-your-key-here
```

SuperGrok を契約している場合は次のようにします。

```bash
hermes auth add xai-oauth
```

そのうえで、検索の提供元として xAI を選びます。

```yaml
# ~/.hermes/config.yaml
web:
  backend: "xai"
```

**細かい調整:**

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

**検索だけ**に対応しています。`web_extract` も使うなら Firecrawl／Tavily／Exa／Parallel と組み合わせてください。401 が返った場合、この提供元は OAuth のトークンを一度だけ強制的に取り直して、やり直します（利用の途中で権限が取り消された場合や、期限を先読みできない不透明なトークンに備えるためです）。環境変数で渡した資格情報のときは、このやり直しは行いません。

:::caution 信頼のしかた
索引に基づく提供元（Brave、Tavily、Exa）が検索エンジンの結果をそのまま返すのに対し、xAI では大規模言語モデルがどの URL を見せるかを選び、題名も説明も自分で書いています。問い合わせの*中身*が出力を左右するので、悪意をもって作られた問い合わせ（たとえば、エージェントが拾ってきた信頼できない入力から紛れ込んだもの）が、攻撃者の狙った URL を Grok に出させることも理屈のうえでは起こりえます。返ってきた URL は、モデルが書いたリンク全般と同じように扱ってください。とくに問い合わせが信頼できない入力から来ている場合は、取りに行く前に確かめましょう。
:::

---

## 設定 {#configuration}

### 提供元をひとつにまとめる {#single-backend}

ウェブ向けのすべての働きに、ひとつの提供元を設定します。

```yaml
# ~/.hermes/config.yaml
web:
  backend: "searxng"   # firecrawl | searxng | brave-free | ddgs | tavily | exa | parallel | xai
```

### 役割ごとの設定 {#per-capability-configuration}

検索と取り出しで別々の提供元を使います。無料の検索（SearXNG）と有料の取り出しを組み合わせたり、その逆にしたりできます。

```yaml
# ~/.hermes/config.yaml
web:
  search_backend: "searxng"     # used by web_search
  extract_backend: "firecrawl"  # used by web_extract
```

役割ごとの項目が空のときは、どちらも `web.backend` に落ちます。環境変数にある API の鍵や URL から提供元が自動で選ばれるのは、ウェブ向けの選択が一度も書かれていないときだけです。いったん選択があれば、実行時には必ずそれが使われ、`.env` に鍵を足してもウェブの通信先は変わりません。

**優先される順（役割ごと）:**
1. `web.search_backend` / `web.extract_backend`（役割ごとの明示的な指定）
2. `web.backend`（共通の受け皿。`nous` は Nous 側が用意した Tool Gateway です）
3. 環境変数からの自動判定（一度も設定したことがない場合だけ）

### 自動判定 {#auto-detection}

提供元が**一度も**選ばれていないとき（`web.backend` も役割ごとの項目も、自分でも `hermes tools` でも書かれていないとき）、Hermes はどの資格情報が設定されているかを見て、最初に使えるものを選びます。

| 設定されている資格情報 | 自動で選ばれる提供元 |
|--------------------|-----------------------|
| `TAVILY_API_KEY` | tavily |
| `EXA_API_KEY` | exa |
| `PARALLEL_API_KEY` | parallel |
| `FIRECRAWL_API_KEY` または `FIRECRAWL_API_URL`（あるいは Nous Tool Gateway が使える状態） | firecrawl |
| `SEARXNG_URL` | searxng |
| `BRAVE_SEARCH_API_KEY` | brave-free |
| `ddgs` パッケージが読み込める | ddgs |
| *(何も設定されていない)* | 鍵なしの持ち回り: exa / parallel / tavily / firecrawl / keenable（順ぐりに回ります） |

**鍵なしの無料枠の持ち回り:** 上のどの資格情報も*ない*とき、要求は5社の公開された無料枠（Exa、Parallel、Tavily、Firecrawl、Keenable）を順ぐりに回ります。おかげで、入れたてで何も設定しなくてもウェブ向けの道具が動きます。回数制限に当たった要求は、持ち回りの次の会社へ自動で移ります。`hermes tools` で1社に固定すれば、この巡回は止まります（そのあとは、制限に当たったときの引き継ぎ先としてだけ持ち回りが使われます）。どの無料枠も、短い時間に集中して使うと会社側の回数制限に当たります。普段づかいの範囲であれば問題なく通ります。この枠を切るには `web.keyless_fallback: false` を設定します。切ったうえで資格情報もない場合、提供元を設定するまでウェブ向けの道具は使えません。

**鍵のある提供元のための、一度きりの助け舟:** 選んだ、鍵のある提供元が呼び出しに失敗したとき（鍵が違う、障害、上流の 5xx など）、その1回だけはエラーにせず、鍵なしの無料枠の持ち回りでやり直します。結果には、どの会社が応えたのかと理由が添えられます（`rescued_from` / `backend_error`）。この切り替えが居座ることはありません。次の `web_search`／`web_extract` の呼び出しでは、また選んだ提供元から試します。止めるには `web.keyless_rescue: false` を設定します（`keyless_fallback` を切っている場合も同じく働きません）。

xAI の Web Search は、自動判定の並びに**入っていません**。`XAI_API_KEY` を設定していても（あるいは xAI Grok の OAuth でログインしていても）、それだけでウェブの通信が xAI に回ることはありません。これらの資格情報は推論や読み上げ、画像生成にも使われるもので、ウェブには別の提供元を使いたい人もいるからです。使いたいときは `web.backend: "xai"` で明示的に選んでください。

---

## 設定を確かめる {#verify-your-setup}

`hermes setup` を実行すると、どのウェブの提供元が見つかっているか分かります。

```
✅ Web Search & Extract (searxng)
```

コマンドから確かめることもできます。

```bash
# Activate the venv and run the web tools module directly
source ~/.hermes/hermes-agent/.venv/bin/activate
python -m tools.web_tools
```

いま使われている提供元と、その状態が表示されます。

```
✅ Web backend: searxng
   Using SearXNG (search only): http://localhost:8888
```

---

## 困ったときは {#troubleshooting}

### `web_search` が `{"success": false}` を返す {#websearch-returns-success-false}

- `SEARXNG_URL` に届くか確かめます: `curl -s "http://localhost:8888/search?q=test&format=json"`
- HTTP 403 が返るなら JSON の形式が切れています。`settings.yml` の `formats` に `json` を足して再起動してください
- 接続のエラーが出るなら、コンテナが動いていないかもしれません: `docker ps | grep searxng`

### `web_extract` が「search-only backend」と言う {#webextract-says-search-only-backend}

SearXNG は URL の中身を取り出せません。取り出しに対応した提供元を `web.extract_backend` に設定してください。

```yaml
web:
  search_backend: "searxng"
  extract_backend: "firecrawl"  # or tavily / exa / parallel
```

### SearXNG が0件を返す {#searxng-returns-0-results}

公開されている環境の中には、一部の検索エンジンや分類を切っているものがあります。次を試してください。

- 別の問い合わせ
- [searx.space](https://searx.space/) にある別の公開環境
- 安定した結果がほしいなら、自分で立てる

### 公開されている環境で回数制限に当たった {#rate-limited-on-a-public-instance}

自前で立てた環境に切り替えてください（上の[方法 A](#option-a--self-host-with-docker-recommended)を参照）。Docker で立てた自分の環境なら回数制限はありません。

### `web_extract` が `[TRUNCATED]` の注記付きで途中までの内容を返す {#webextract-returns-truncated-content-with-a-truncated-footer}

文字数の枠を超えたページでは、そうなるのが普通です。注記には、整えた全文が入っているディスク上のファイルと、省かれた真ん中を読み進めるための `read_file` の呼び方が書かれています。その場でもっと読みたいときは、`config.yaml` の `web.extract_char_limit` を上げるか、呼び出しのときに大きめの `char_limit` を渡してください。

---

## 追加のスキル: `searxng-search` {#optional-skill-searxng-search}

エージェントが `curl` で SearXNG を直に使う必要があるとき（たとえば、ウェブ向けの道具が使えないときの逃げ道として）は、追加のスキル `searxng-search` を入れてください。

```bash
hermes skills install official/research/searxng-search
```

このスキルは、エージェントに次のやり方を教えます。

- `curl` や Python から SearXNG の JSON API を呼ぶ
- 分類（`general`、`news`、`science` など）で絞り込む
- ページ送りやエラーの場合に対処する
- SearXNG に届かないとき、無理なく別のやり方へ移る
