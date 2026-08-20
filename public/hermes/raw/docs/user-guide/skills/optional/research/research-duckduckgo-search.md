---
title: "Duckduckgo Search — ddgs でキー不要の無料 Web・ニュース・画像検索"
description: "ddgs でキー不要の無料 Web・ニュース・画像検索"
upstream_path: user-guide/skills/optional/research/research-duckduckgo-search.md
upstream_blob: 466b8cc9aa5997059ea4638cf9c9b1aa2bf3a96d
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/research/research-duckduckgo-search
---

# Duckduckgo Search {#duckduckgo-search}

ddgs を使って、キーなしで無料の Web・ニュース・画像検索ができます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | オプション — `hermes skills install official/research/duckduckgo-search` で導入します |
| パス | `optional-skills/research/duckduckgo-search` |
| バージョン | `1.3.0` |
| 作者 | gamedevCloudy |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `search`, `duckduckgo`, `web-search`, `free`, `fallback` |
| 関連 skill | [`arxiv`](/hermes/docs/user-guide/skills/bundled/research/research-arxiv/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこの内容を指示として見ています。
:::

# DuckDuckGo Search {#duckduckgo-search}

DuckDuckGo による無料の Web 検索です。**API キーは要りません。**

`web_search` が使えないときや向かないとき（たとえば `FIRECRAWL_API_KEY` が設定されていないとき）に選びます。DuckDuckGo の結果そのものが欲しいときに、単独の検索手段として使うこともできます。

## 検出の流れ {#detection-flow}

やり方を決める前に、いま実際に何が使えるのかを確かめます。

```bash
# Check CLI availability
command -v ddgs >/dev/null && echo "DDGS_CLI=installed" || echo "DDGS_CLI=missing"
```

判断の順序:
1. `ddgs` CLI が入っているなら、`terminal` + `ddgs` を選ぶ
2. `ddgs` CLI が無いとき、`execute_code` から `ddgs` を import できると決めつけない
3. 利用者が DuckDuckGo を名指しで求めているなら、その環境にまず `ddgs` を入れる
4. それ以外は、組み込みの Web/ブラウザ ツールに切り替える

実行環境についての大事な注意:
- ターミナルと `execute_code` は別々の実行環境です
- シェルでの導入が成功しても、`execute_code` が `ddgs` を import できるとは限りません
- サードパーティの Python パッケージが `execute_code` に最初から入っていると決めつけないでください

## 導入 {#installation}

`ddgs` を入れるのは、DuckDuckGo での検索がどうしても必要で、かつ実行環境にまだ入っていないときだけにします。

```bash
# Python package + CLI entrypoint
pip install ddgs

# Verify CLI
ddgs --help
```

Python からの import に頼る作業をするなら、`from ddgs import DDGS` を使う前に、その同じ実行環境で `ddgs` を import できるか確かめてください。

## 方法 1: CLI での検索（推奨） {#method-1-cli-search-preferred}

`ddgs` コマンドがあるなら、`terminal` から使います。`execute_code` のサンドボックスに `ddgs` の Python パッケージが入っていると決めつけずに済むので、こちらを推奨します。

```bash
# Text search
ddgs text -q "python async programming" -m 5

# News search
ddgs news -q "artificial intelligence" -m 5

# Image search
ddgs images -q "landscape photography" -m 10

# Video search
ddgs videos -q "python tutorial" -m 5

# With region filter
ddgs text -q "best restaurants" -m 5 -r us-en

# Recent results only (d=day, w=week, m=month, y=year)
ddgs text -q "latest AI news" -m 5 -t w

# JSON output for parsing
ddgs text -q "fastapi tutorial" -m 5 -o json
```

### CLI のフラグ {#cli-flags}

| フラグ | 説明 | 例 |
|------|-------------|---------|
| `-q` | 検索語 — **必須** | `-q "search terms"` |
| `-m` | 取得件数の上限 | `-m 5` |
| `-r` | 地域 | `-r us-en` |
| `-t` | 期間の絞り込み | `-t w`（1 週間） |
| `-s` | セーフサーチ | `-s off` |
| `-o` | 出力形式 | `-o json` |

## 方法 2: Python API（確認できてから） {#method-2-python-api-only-after-verification}

`execute_code` などの Python 実行環境で `DDGS` クラスを使うのは、そこに `ddgs` が入っていると確かめたあとだけにします。`execute_code` にサードパーティのパッケージが最初から入っているとは考えないでください。

安全な言い方:
- 「必要なら導入や確認をしたうえで、`execute_code` から `ddgs` を使う」

避けたい言い方:
- 「`execute_code` には `ddgs` が入っている」
- 「`execute_code` では DuckDuckGo の検索がそのまま動く」

**大事な点:** `max_results` は必ず**キーワード引数**で渡してください。位置引数で渡すと、どのメソッドでもエラーになります。

### テキスト検索 {#text-search}

向いているもの: 一般的な調査、企業、ドキュメント。

```python
from ddgs import DDGS

with DDGS() as ddgs:
    for r in ddgs.text("python async programming", max_results=5):
        print(r["title"])
        print(r["href"])
        print(r.get("body", "")[:200])
        print()
```

返ってくるもの: `title`、`href`、`body`

### ニュース検索 {#news-search}

向いているもの: 時事、速報、最新の動き。

```python
from ddgs import DDGS

with DDGS() as ddgs:
    for r in ddgs.news("AI regulation 2026", max_results=5):
        print(r["date"], "-", r["title"])
        print(r.get("source", ""), "|", r["url"])
        print(r.get("body", "")[:200])
        print()
```

返ってくるもの: `date`、`title`、`body`、`url`、`image`、`source`

### 画像検索 {#image-search}

向いているもの: 見た目の参考、製品画像、図。

```python
from ddgs import DDGS

with DDGS() as ddgs:
    for r in ddgs.images("semiconductor chip", max_results=5):
        print(r["title"])
        print(r["image"])
        print(r.get("thumbnail", ""))
        print(r.get("source", ""))
        print()
```

返ってくるもの: `title`、`image`、`thumbnail`、`url`、`height`、`width`、`source`

### 動画検索 {#video-search}

向いているもの: チュートリアル、デモ、解説。

```python
from ddgs import DDGS

with DDGS() as ddgs:
    for r in ddgs.videos("FastAPI tutorial", max_results=5):
        print(r["title"])
        print(r.get("content", ""))
        print(r.get("duration", ""))
        print(r.get("provider", ""))
        print(r.get("published", ""))
        print()
```

返ってくるもの: `title`、`content`、`description`、`duration`、`provider`、`published`、`statistics`、`uploader`

### 早見表 {#quick-reference}

| メソッド | 使うとき | 主なフィールド |
|--------|----------|------------|
| `text()` | 一般的な調査、企業 | title, href, body |
| `news()` | 時事、最新の動き | date, title, source, body, url |
| `images()` | 図版や画像 | title, image, thumbnail, url |
| `videos()` | チュートリアル、デモ | title, content, duration, provider |

## 手順: 検索してから本文を取る {#workflow-search-then-extract}

DuckDuckGo が返すのはタイトル・URL・抜粋だけで、ページ本文は含まれません。本文が要るときは、まず検索し、いちばん関係のありそうな URL を `web_extract`、ブラウザ ツール、curl のいずれかで取得します。

CLI の例:

```bash
ddgs text -q "fastapi deployment guide" -m 3 -o json
```

Python の例です。その実行環境に `ddgs` が入っていると確かめてから使ってください。

```python
from ddgs import DDGS

with DDGS() as ddgs:
    results = list(ddgs.text("fastapi deployment guide", max_results=3))
    for r in results:
        print(r["title"], "->", r["href"])
```

そのうえで、いちばん良さそうな URL を `web_extract` などの取得ツールで開きます。

## 制約 {#limitations}

- **レート制限**: 短時間に何度も投げると、DuckDuckGo 側で絞られることがあります。必要なら検索と検索のあいだに少し間を置いてください。
- **本文は取れない**: `ddgs` が返すのは抜粋で、ページ本文ではありません。記事やページ全体は `web_extract`、ブラウザ ツール、curl で取得してください。
- **結果の質**: おおむね良好ですが、Firecrawl の検索ほど細かく調整はできません。
- **使えないことがある**: DuckDuckGo は一部のクラウド IP からのリクエストを拒否することがあります。結果が空なら、語を変えるか数秒待ってください。
- **フィールドのばらつき**: 返ってくるフィールドは結果ごと、`ddgs` のバージョンごとに変わることがあります。任意のフィールドは `.get()` で読み、`KeyError` を避けてください。
- **実行環境は別物**: ターミナルで `ddgs` の導入に成功しても、`execute_code` から import できるとは限りません。

## 困ったとき {#troubleshooting}

| 症状 | 考えられる原因 | 対処 |
|---------|--------------|------------|
| `ddgs: command not found` | そのシェル環境に CLI が入っていない | `ddgs` を入れるか、組み込みの Web/ブラウザ ツールを使う |
| `ModuleNotFoundError: No module named 'ddgs'` | その Python 実行環境にパッケージが入っていない | 環境を整えるまで、そこでは Python 版の DDGS を使わない |
| 検索結果が空になる | 一時的なレート制限、または検索語がよくない | 数秒待って試すか、検索語を見直す |
| CLI は動くのに `execute_code` の import が失敗する | ターミナルと `execute_code` は別の実行環境 | CLI を使い続けるか、Python 側の環境を別途整える |

## つまずきやすい点 {#pitfalls}

- **`max_results` はキーワード引数専用**: `ddgs.text("query", 5)` はエラーになります。`ddgs.text("query", max_results=5)` と書いてください。
- **CLI があると決めつけない**: 使う前に `command -v ddgs` で確かめてください。
- **`execute_code` が `ddgs` を import できると決めつけない**: その環境を別途整えていない限り、`from ddgs import DDGS` は `ModuleNotFoundError` になることがあります。
- **パッケージ名**: パッケージは `ddgs` です（以前は `duckduckgo-search` でした）。`pip install ddgs` で入ります。
- **`-q` と `-m` を取り違えない**（CLI）: `-q` が検索語、`-m` が取得件数の上限です。
- **結果が空のとき**: `ddgs` が何も返さないなら、レート制限にかかっているかもしれません。数秒待ってから試してください。

## 検証した環境 {#validated-with}

ここに載せた例は `ddgs==9.11.2` の挙動で検証しています。CLI が使えるかどうかと、Python から import できるかどうかを別々の問題として扱うよう見直したので、書かれている手順は実際の動きと一致します。
