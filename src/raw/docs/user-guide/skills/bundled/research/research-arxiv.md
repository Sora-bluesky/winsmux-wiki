---
title: "Arxiv — arXiv の論文をキーワード・著者・分野・ID で探す"
description: "arXiv の論文をキーワード・著者・分野・ID で探す"
upstream_path: user-guide/skills/bundled/research/research-arxiv.md
upstream_blob: 4425858d7472f473e8f76ce322becb077684247b
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/research/research-arxiv
---

# Arxiv {#arxiv}

arXiv の論文をキーワード・著者・分野・ID で探します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/research/arxiv` |
| バージョン | `1.0.0` |
| 作者 | Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Research`, `Arxiv`, `Papers`, `Academic`, `Science`, `API` |
| 関連 skill | [`ocr-and-documents`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-ocr-and-documents/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# arXiv Research {#arxiv-research}

arXiv の無料の REST API から、学術論文を探して取ってきます。API キーも追加の部品も要りません。curl だけで済みます。

## 早見表 {#quick-reference}

| やりたいこと | コマンド |
|--------|---------|
| 論文を探す | `curl "https://export.arxiv.org/api/query?search_query=all:QUERY&max_results=5"` |
| 特定の論文を取る | `curl "https://export.arxiv.org/api/query?id_list=2402.03300"` |
| 要旨を読む（ウェブ） | `web_extract(urls=["https://arxiv.org/abs/2402.03300"])` |
| 論文の全文を読む（PDF） | `web_extract(urls=["https://arxiv.org/pdf/2402.03300"])` |

## 論文を探す {#searching-papers}

API は Atom 形式の XML を返します。`grep`/`sed` で処理するか、`python3` に流し込んで読みやすい形にしてください。

### 基本の検索 {#basic-search}

```bash
curl -s "https://export.arxiv.org/api/query?search_query=all:GRPO+reinforcement+learning&max_results=5"
```

### 読みやすい形にする（XML を整えて表示する） {#clean-output-parse-xml-to-readable-format}

```bash
curl -s "https://export.arxiv.org/api/query?search_query=all:GRPO+reinforcement+learning&max_results=5&sortBy=submittedDate&sortOrder=descending" | python3 -c "

ns = {'a': 'http://www.w3.org/2005/Atom'}
root = ET.parse(sys.stdin).getroot()
for i, entry in enumerate(root.findall('a:entry', ns)):
    title = entry.find('a:title', ns).text.strip().replace('\n', ' ')
    arxiv_id = entry.find('a:id', ns).text.strip().split('/abs/')[-1]
    published = entry.find('a:published', ns).text[:10]
    authors = ', '.join(a.find('a:name', ns).text for a in entry.findall('a:author', ns))
    summary = entry.find('a:summary', ns).text.strip()[:200]
    cats = ', '.join(c.get('term') for c in entry.findall('a:category', ns))
    print(f'{i+1}. [{arxiv_id}] {title}')
    print(f'   Authors: {authors}')
    print(f'   Published: {published} | Categories: {cats}')
    print(f'   Abstract: {summary}...')
    print(f'   PDF: https://arxiv.org/pdf/{arxiv_id}')
    print()
"
```

## 検索条件の書き方 {#search-query-syntax}

| 接頭辞 | 探す範囲 | 例 |
|--------|----------|---------|
| `all:` | すべての項目 | `all:transformer+attention` |
| `ti:` | 題名 | `ti:large+language+models` |
| `au:` | 著者 | `au:vaswani` |
| `abs:` | 要旨 | `abs:reinforcement+learning` |
| `cat:` | 分野 | `cat:cs.AI` |
| `co:` | コメント | `co:accepted+NeurIPS` |

### かつ・または・除く {#boolean-operators}

```
# AND (default when using +)
search_query=all:transformer+attention

# OR
search_query=all:GPT+OR+all:BERT

# AND NOT
search_query=all:language+model+ANDNOT+all:vision

# Exact phrase
search_query=ti:"chain+of+thought"

# Combined
search_query=au:hinton+AND+cat:cs.LG
```

## 並べ替えとページ送り {#sort-and-pagination}

| 指定するもの | 選べる値 |
|-----------|---------|
| `sortBy` | `relevance`, `lastUpdatedDate`, `submittedDate` |
| `sortOrder` | `ascending`, `descending` |
| `start` | 何件目から返すか（0 から数えます） |
| `max_results` | 返す件数（既定は 10、最大 30000） |

```bash
# Latest 10 papers in cs.AI
curl -s "https://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=submittedDate&sortOrder=descending&max_results=10"
```

## 特定の論文を取ってくる {#fetching-specific-papers}

```bash
# By arXiv ID
curl -s "https://export.arxiv.org/api/query?id_list=2402.03300"

# Multiple papers
curl -s "https://export.arxiv.org/api/query?id_list=2402.03300,2401.12345,2403.00001"
```

## BibTeX を作る {#bibtex-generation}

論文の情報を取ってきたら、BibTeX の項目を作れます:

&#123;% raw %&#125;
```bash
curl -s "https://export.arxiv.org/api/query?id_list=1706.03762" | python3 -c "

ns = {'a': 'http://www.w3.org/2005/Atom', 'arxiv': 'http://arxiv.org/schemas/atom'}
root = ET.parse(sys.stdin).getroot()
entry = root.find('a:entry', ns)
if entry is None: sys.exit('Paper not found')
title = entry.find('a:title', ns).text.strip().replace('\n', ' ')
authors = ' and '.join(a.find('a:name', ns).text for a in entry.findall('a:author', ns))
year = entry.find('a:published', ns).text[:4]
raw_id = entry.find('a:id', ns).text.strip().split('/abs/')[-1]
cat = entry.find('arxiv:primary_category', ns)
primary = cat.get('term') if cat is not None else 'cs.LG'
last_name = entry.find('a:author', ns).find('a:name', ns).text.split()[-1]
print(f'@article{{{last_name}{year}_{raw_id.replace(\".\", \"\")},')
print(f'  title     = {{{title}}},')
print(f'  author    = {{{authors}}},')
print(f'  year      = {{{year}}},')
print(f'  eprint    = {{{raw_id}}},')
print(f'  archivePrefix = {{arXiv}},')
print(f'  primaryClass  = {{{primary}}},')
print(f'  url       = {{https://arxiv.org/abs/{raw_id}}}')
print('}')
"
```
&#123;% endraw %&#125;

## 論文の中身を読む {#reading-paper-content}

論文が見つかったら、次のように読みます:

```
# Abstract page (fast, metadata + abstract)
web_extract(urls=["https://arxiv.org/abs/2402.03300"])

# Full paper (PDF → markdown via Firecrawl)
web_extract(urls=["https://arxiv.org/pdf/2402.03300"])
```

手元にある PDF を処理したいときは、`ocr-and-documents` skill を見てください。

## よく使う分野 {#common-categories}

| 分野 | 内容 |
|----------|-------|
| `cs.AI` | 人工知能 |
| `cs.CL` | 計算言語学（自然言語処理） |
| `cs.CV` | コンピュータービジョン |
| `cs.LG` | 機械学習 |
| `cs.CR` | 暗号とセキュリティー |
| `stat.ML` | 機械学習（統計） |
| `math.OC` | 最適化と制御 |
| `physics.comp-ph` | 計算物理学 |

全体の一覧: https://arxiv.org/category_taxonomy

## 補助スクリプト {#helper-script}

`scripts/search_arxiv.py` は XML の処理をまかなえて、読みやすい形で表示します:

```bash
python scripts/search_arxiv.py "GRPO reinforcement learning"
python scripts/search_arxiv.py "transformer attention" --max 10 --sort date
python scripts/search_arxiv.py --author "Yann LeCun" --max 5
python scripts/search_arxiv.py --category cs.AI --sort date
python scripts/search_arxiv.py --id 2402.03300
python scripts/search_arxiv.py --id 2402.03300,2401.12345
```

追加の部品は要りません。Python の標準ライブラリーだけで動きます。

---

## Semantic Scholar（引用、関連論文、著者の情報） {#semantic-scholar-citations-related-papers-author-profiles}

arXiv は引用のデータやおすすめを出してくれません。そこは **Semantic Scholar の API** を使ってください。無料で、ふつうに使う分にはキーも要らず（1 秒に 1 回まで）、JSON を返します。

### 論文の情報と引用数を取る {#get-paper-details-citations}

```bash
# By arXiv ID
curl -s "https://api.semanticscholar.org/graph/v1/paper/arXiv:2402.03300?fields=title,authors,citationCount,referenceCount,influentialCitationCount,year,abstract" | python3 -m json.tool

# By Semantic Scholar paper ID or DOI
curl -s "https://api.semanticscholar.org/graph/v1/paper/DOI:10.1234/example?fields=title,citationCount"
```

### その論文を引用している論文を取る {#get-citations-of-a-paper-who-cited-it}

```bash
curl -s "https://api.semanticscholar.org/graph/v1/paper/arXiv:2402.03300/citations?fields=title,authors,year,citationCount&limit=10" | python3 -m json.tool
```

### その論文が引用している論文を取る {#get-references-from-a-paper-what-it-cites}

```bash
curl -s "https://api.semanticscholar.org/graph/v1/paper/arXiv:2402.03300/references?fields=title,authors,year,citationCount&limit=10" | python3 -m json.tool
```

### 論文を探す（arXiv 検索の代わり。JSON が返ります） {#search-papers-alternative-to-arxiv-search-returns-json}

```bash
curl -s "https://api.semanticscholar.org/graph/v1/paper/search?query=GRPO+reinforcement+learning&limit=5&fields=title,authors,year,citationCount,externalIds" | python3 -m json.tool
```

### おすすめの論文を取る {#get-paper-recommendations}

```bash
curl -s -X POST "https://api.semanticscholar.org/recommendations/v1/papers/" \
  -H "Content-Type: application/json" \
  -d '{"positivePaperIds": ["arXiv:2402.03300"], "negativePaperIds": []}' | python3 -m json.tool
```

### 著者の情報 {#author-profile}

```bash
curl -s "https://api.semanticscholar.org/graph/v1/author/search?query=Yann+LeCun&fields=name,hIndex,citationCount,paperCount" | python3 -m json.tool
```

### Semantic Scholar でよく使う項目 {#useful-semantic-scholar-fields}

`title`, `authors`, `year`, `abstract`, `citationCount`, `referenceCount`, `influentialCitationCount`, `isOpenAccess`, `openAccessPdf`, `fieldsOfStudy`, `publicationVenue`, `externalIds`（arXiv の ID や DOI などが入っています）

---

## 調べものの流れ、ひととおり {#complete-research-workflow}

1. **見つける**: `python scripts/search_arxiv.py "your topic" --sort date --max 10`
2. **影響の大きさを見る**: `curl -s "https://api.semanticscholar.org/graph/v1/paper/arXiv:ID?fields=citationCount,influentialCitationCount"`
3. **要旨を読む**: `web_extract(urls=["https://arxiv.org/abs/ID"])`
4. **全文を読む**: `web_extract(urls=["https://arxiv.org/pdf/ID"])`
5. **関連する研究を探す**: `curl -s "https://api.semanticscholar.org/graph/v1/paper/arXiv:ID/references?fields=title,citationCount&limit=20"`
6. **おすすめを取る**: Semantic Scholar のおすすめの窓口に POST します
7. **著者を追いかける**: `curl -s "https://api.semanticscholar.org/graph/v1/author/search?query=NAME"`

## アクセスの制限 {#rate-limits}

| API | 頻度 | 認証 |
|-----|------|------|
| arXiv | 3 秒に 1 回ほど | 要りません |
| Semantic Scholar | 1 秒に 1 回 | 要りません（API キーがあれば 1 秒に 100 回） |

## 補足 {#notes}

- arXiv は Atom 形式の XML を返します。読みやすくするには補助スクリプトか、上の処理の書き方を使ってください
- Semantic Scholar は JSON を返します。`python3 -m json.tool` に流すと読みやすくなります
- arXiv の ID には、古い形式（`hep-th/0601001`）と新しい形式（`2402.03300`）があります
- PDF は `https://arxiv.org/pdf/{id}`、要旨は `https://arxiv.org/abs/{id}` です
- HTML があるときは `https://arxiv.org/html/{id}` です
- 手元にある PDF を処理したいときは、`ocr-and-documents` skill を見てください

## ID の版 {#id-versioning}

- `arxiv.org/abs/1706.03762` は必ず**最新の**版を指します
- `arxiv.org/abs/1706.03762v1` は**特定の**、変わることのない版を指します
- 引用を作るときは、実際に読んだ版の番号をそのまま残してください。そうしないと引用がずれます（あとの版で中身が大きく変わることがあります）
- API の `<id>` の項目は、版の番号が付いた URL を返します（例: `http://arxiv.org/abs/1706.03762v7`）

## 取り下げられた論文 {#withdrawn-papers}

論文は投稿のあとに取り下げられることがあります。そのときは:
- `<summary>` の項目に取り下げの知らせが入ります（"withdrawn" や "retracted" を探してください）
- 付随する情報が欠けていることがあります
- 結果を有効な論文として扱う前に、必ず要旨を確かめてください
