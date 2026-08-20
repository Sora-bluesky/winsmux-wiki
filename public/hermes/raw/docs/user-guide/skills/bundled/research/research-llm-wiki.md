---
title: "Llm Wiki — Karpathy の LLM Wiki: 相互にリンクした markdown のナレッジベースを作り、問い合わせる"
description: "Karpathy の LLM Wiki: 相互にリンクした markdown のナレッジベースを作り、問い合わせる"
upstream_path: user-guide/skills/bundled/research/research-llm-wiki.md
upstream_blob: 566c7378b9e859ff1767e73511041c86737bb7f8
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/research/research-llm-wiki
---

# Llm Wiki {#llm-wiki}

Karpathy の LLM Wiki です。相互にリンクした markdown のナレッジベースを作り、問い合わせます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/research/llm-wiki` |
| バージョン | `2.1.0` |
| 作者 | Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `wiki`, `knowledge-base`, `research`, `notes`, `markdown`, `rag-alternative` |
| 関連 skill | [`obsidian`](/hermes/docs/user-guide/skills/bundled/note-taking/note-taking-obsidian/), [`arxiv`](/hermes/docs/user-guide/skills/bundled/research/research-arxiv/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Karpathy の LLM Wiki {#karpathys-llm-wiki}

相互にリンクした markdown ファイルとして、積み上がっていくナレッジベースを作り、育てていきます。
[Andrej Karpathy の LLM Wiki パターン](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)にもとづいています。

問い合わせのたびに知識をゼロから探し直す従来の RAG とは違い、ここでは知識を一度まとめ上げ、
そのまま最新に保ちます。相互の参照はすでに張られています。矛盾はすでに印が付いています。
まとめ上げた内容には、取り込んだものがすべて反映されています。

**役割分担:** 人が情報源を選び、分析の方向を決めます。エージェントは要約し、相互に参照を張り、
しかるべき場所に置き、全体の整合を保ちます。

## この skill が動くとき {#when-this-skill-activates}

次のようなときに使います。

- ナレッジベースを作りたい、始めたいと言われたとき
- 情報源を取り込みたい、追加したい、処理したいと言われたとき
- 質問されたときに、設定された場所にすでにナレッジベースがあるとき
- 点検、監査、健康診断をしてほしいと言われたとき
- 調査の文脈で、自分のナレッジベースや「メモ」に言及されたとき

## ナレッジベースの置き場所 {#wiki-location}

**置き場所:** 環境変数 `WIKI_PATH` で指定します（たとえば `${HERMES_HOME:-~/.hermes}/.env` の中で）。

指定がなければ `~/wiki` になります。

```bash
WIKI="${WIKI_PATH:-$HOME/wiki}"
```

中身は markdown ファイルが入ったただのディレクトリなので、Obsidian でも VS Code でも
好きなエディタで開けます。データベースも特別な道具もいりません。

## 構成: 3 つの層 {#architecture-three-layers}

<!-- ascii-guard-ignore -->
```
wiki/
├── SCHEMA.md           # Conventions, structure rules, domain config
├── index.md            # Sectioned content catalog with one-line summaries
├── log.md              # Chronological action log (append-only, rotated yearly)
├── raw/                # Layer 1: Immutable source material
│   ├── articles/       # Web articles, clippings
│   ├── papers/         # PDFs, arxiv papers
│   ├── transcripts/    # Meeting notes, interviews
│   └── assets/         # Images, diagrams referenced by sources
├── entities/           # Layer 2: Entity pages (people, orgs, products, models)
├── concepts/           # Layer 2: Concept/topic pages
├── comparisons/        # Layer 2: Side-by-side analyses
└── queries/            # Layer 2: Filed query results worth keeping
```
<!-- ascii-guard-ignore-end -->

**第 1 層——生の情報源:** 書き換えません。エージェントは読むだけで、決して手を入れません。
**第 2 層——ナレッジベース本体:** エージェントが持ち主の markdown ファイルです。作成、更新、
相互参照はエージェントが行います。
**第 3 層——スキーマ:** `SCHEMA.md` が構造、決めごと、タグの分類を定めます。

## 既存のナレッジベースを再開する（重要——セッションのたびに必ず） {#resuming-an-existing-wiki-critical-do-this-every-session}

すでにナレッジベースがある場合は、**何かをする前に必ず現在地を確かめてください**。

① **`SCHEMA.md` を読む**——扱う領域、決めごと、タグの分類を把握します。
② **`index.md` を読む**——どんなページがあり、それぞれ何を書いているかを知ります。
③ **最近の `log.md` を眺める**——直近の 20〜30 件を読んで、最近の動きをつかみます。

```bash
WIKI="${WIKI_PATH:-$HOME/wiki}"
# Orientation reads at session start
read_file "$WIKI/SCHEMA.md"
read_file "$WIKI/index.md"
read_file "$WIKI/log.md" offset=<last 30 lines>
```

取り込み、問い合わせ、点検はそのあとです。これで次のことを防げます。

- すでにあるものについて、同じページを二重に作ってしまう
- すでにある内容への相互参照を張り忘れる
- スキーマの決めごとに反する
- すでに記録済みの作業をやり直す

ページが 100 を超える規模では、新しく何かを作る前に、その話題で `search_files` をさっと
かけておいてください。

## 新しいナレッジベースを用意する {#initializing-a-new-wiki}

作りたい、始めたいと言われたときの流れです。

1. 置き場所を決めます（環境変数 `$WIKI_PATH` から、なければ利用者に聞きます。既定は `~/wiki`）
2. 上に示したディレクトリ構成を作ります
3. どんな領域を扱うのかを利用者に聞きます。具体的に聞いてください
4. その領域に合わせた `SCHEMA.md` を書きます（ひな形は下記）
5. 節ごとの見出しを入れた最初の `index.md` を書きます
6. 作成の記録を入れた最初の `log.md` を書きます
7. 準備ができたことを伝え、最初に取り込む情報源を提案します

### SCHEMA.md のひな形 {#schemamd-template}

利用者の領域に合わせて直してください。スキーマはエージェントの動きを縛り、整合を保ちます。

```markdown
# Wiki Schema

## Domain
[What this wiki covers — e.g., "AI/ML research", "personal health", "startup intelligence"]

## Conventions
- File names: lowercase, hyphens, no spaces (e.g., `transformer-architecture.md`)
- Every wiki page starts with YAML frontmatter (see below)
- Use `[[wikilinks]]` to link between pages (minimum 2 outbound links per page)
- When updating a page, always bump the `updated` date
- Every new page must be added to `index.md` under the correct section
- Every action must be appended to `log.md`
- **Provenance markers:** On pages that synthesize 3+ sources, append `^[raw/articles/source-file.md]`
  at the end of paragraphs whose claims come from a specific source. This lets a reader trace each
  claim back without re-reading the whole raw file. Optional on single-source pages where the
  `sources:` frontmatter is enough.

## Frontmatter
  ```yaml
  ---
  title: Page Title
  created: YYYY-MM-DD
  updated: YYYY-MM-DD
  type: entity | concept | comparison | query | summary
  tags: [from taxonomy below]
  sources: [raw/articles/source-name.md]
  # Optional quality signals:
  confidence: high | medium | low        # how well-supported the claims are
  contested: true                        # set when the page has unresolved contradictions
  contradictions: [other-page-slug]      # pages this one conflicts with
  ---
  ```

`confidence` と `contested` は必須ではありませんが、意見の分かれる話題や動きの速い話題では
付けておくことをすすめます。点検では `contested: true` や `confidence: low` のページを
拾い出して見直しに回すので、根拠の弱い主張が黙って定説として固まってしまうことを防げます。

### raw/ の frontmatter {#raw-frontmatter}

生の情報源にも小さな frontmatter を付けます。取り込み直したときに変化を見つけるためです。

```yaml
---
source_url: https://example.com/article   # original URL, if applicable
ingested: YYYY-MM-DD
sha256: &lt;hex digest of the raw content below the frontmatter>
---
```

`sha256:` があると、同じ URL を次に取り込み直すときに、中身が変わっていなければ処理を飛ばし、
変わっていれば違いを知らせられます。計算するのは frontmatter を除いた本文（閉じの `---` より
後ろのすべて）だけです。

## タグの分類 {#tag-taxonomy}
[Define 10-20 top-level tags for the domain. Add new tags here BEFORE using them.]

AI / ML 領域の例:
- Models: model, architecture, benchmark, training
- People/Orgs: person, company, lab, open-source
- Techniques: optimization, fine-tuning, inference, alignment, data
- Meta: comparison, timeline, controversy, prediction

決まりごと: ページに付けるタグは、必ずこの分類に載っているものにします。新しいタグが必要なら、
まずここに書き足してから使ってください。これでタグが増えすぎるのを防げます。

## ページを作る基準 {#page-thresholds}
- **ページを作る**のは、ある対象や概念が 2 つ以上の情報源に出てきたとき、または 1 つの情報源の中心にあるとき
- **既存のページに書き足す**のは、情報源がすでに扱っている内容に触れているとき
- **ページを作らない**のは、ついでに触れられただけのもの、細かすぎるもの、扱う領域の外のもの
- **ページを分ける**のは、200 行あたりを超えたとき。小さな話題に割り、相互にリンクします
- **ページを保管に回す**のは、内容が完全に置き換わったとき。`_archive/` へ移し、索引から外します

## 対象のページ {#entity-pages}
目立った対象ごとに 1 ページ。次を入れます。
- 概要 / それが何であるか
- 主な事実と日付
- ほかの対象との関係（[[wikilinks]]）
- 情報源への参照

## 概念のページ {#concept-pages}
概念や話題ごとに 1 ページ。次を入れます。
- 定義 / 説明
- 今どこまで分かっているか
- 未解決の問いや論争
- 関連する概念（[[wikilinks]]）

## 比較のページ {#comparison-pages}
横並びの分析です。次を入れます。
- 何を、なぜ比べているのか
- 比べる観点（表の形が望ましい）
- 結論またはまとめ
- 情報源

## 更新の方針 {#update-policy}
新しい情報が既存の内容と食い違うとき。
1. 日付を確かめます。ふつうは新しい情報源が古いものに取って代わります
2. 本当に食い違っているなら、両方の立場を日付と情報源とともに書き留めます
3. frontmatter に矛盾を記します: `contradictions: [page-name]`
4. 点検の報告に載せて、利用者の判断を仰ぎます
```

### index.md Template

The index is sectioned by type. Each entry is one line: wikilink + summary.

```markdown
# Wiki Index

> Content catalog. Every wiki page listed under its type with a one-line summary.
> Read this first to find relevant pages for any query.
> Last updated: YYYY-MM-DD | Total pages: N

## Entities
<!-- Alphabetical within section -->

## Concepts

## Comparisons

## Queries
```

**規模が大きくなったら:** ある節の項目が 50 を超えたら、頭文字か小分野で小節に割ります。
索引全体で 200 項目を超えたら、ページを主題ごとにまとめた `_meta/topic-map.md` を作ると
たどりやすくなります。

### log.md のひな形 {#logmd-template}

```markdown
# Wiki Log

> Chronological record of all wiki actions. Append-only.
> Format: `## [YYYY-MM-DD] action | subject`
> Actions: ingest, update, query, lint, create, archive, delete
> When this file exceeds 500 entries, rotate: rename to log-YYYY.md, start fresh.

## [YYYY-MM-DD] create | Wiki initialized
- Domain: [domain]
- Structure created with SCHEMA.md, index.md, log.md
```

## 主な操作 {#core-operations}

### 1. 取り込む {#1-ingest}

利用者が情報源（URL、ファイル、貼り付けた文章）を渡してきたら、それをナレッジベースに組み込みます。

① **生の情報源をそのまま保存する:**
   - URL → `web_extract` で markdown にして `raw/articles/` に保存
   - PDF → `web_extract` を使い（PDF も扱えます）`raw/papers/` に保存
   - 貼り付けた文章 → `raw/` の適切な場所に保存
   - 中身が分かる名前を付けます: `raw/articles/karpathy-llm-wiki-2026.md`
   - **生の情報源用の frontmatter を付けます**（`source_url`、`ingested`、本文の `sha256`）。
     同じ URL を取り込み直すときは sha256 を計算し直し、保存してある値と比べます。
     同じなら飛ばし、違えば変化を知らせて更新します。毎回やっても負担にならない程度の処理で、
     情報源が黙って書き換わったことに気づけます。

② 何が面白いか、その領域にとって何が大事かを、利用者と**話し合います**。
   （自動実行や定期実行のときは飛ばして、そのまま進めてください。）

③ **すでにあるものを確かめます**——index.md を見て、`search_files` で、話に出てきた対象や
   概念のページがすでにないか探します。育っていくナレッジベースと、重複の山との分かれ目がここです。

④ **ページを書くか、更新します:**
   - **新しい対象や概念:** SCHEMA.md の「ページを作る基準」を満たすときだけ作ります
     （2 つ以上の情報源に出てくる、または 1 つの情報源の中心にある）
   - **既存のページ:** 新しい情報を足し、事実を更新し、`updated` の日付を進めます。
     新しい情報が既存の内容と食い違うときは、更新の方針に従います。
   - **相互参照:** 新しく作ったページも更新したページも、`[[wikilinks]]` でほかのページへ
     少なくとも 2 本のリンクを張ります。既存のページから戻るリンクがあるかも確かめます。
   - **タグ:** SCHEMA.md の分類にあるタグだけを使います
   - **出どころ:** 3 つ以上の情報源をまとめたページでは、特定の情報源に由来する段落の末尾に
     `^[raw/articles/source.md]` の印を付けます。
   - **確からしさ:** 意見の分かれる話題、動きの速い話題、情報源が 1 つだけの主張には、
     frontmatter に `confidence: medium` か `low` を入れます。複数の情報源でしっかり
     裏付けられていないかぎり `high` にしてはいけません。

⑤ **たどれるように直します:**
   - 新しいページを `index.md` の正しい節に、五十音順・アルファベット順で足します
   - 索引の見出しにある「Total pages」の数と「Last updated」の日付を直します
   - `log.md` に書き足します: `## [YYYY-MM-DD] ingest | Source Title`
   - 作ったファイルと更新したファイルを、その記録にすべて並べます

⑥ **何が変わったかを報告します**——作ったファイルと更新したファイルを利用者にすべて示します。

情報源 1 つで 5〜15 ページが更新されることがあります。それがふつうであり、望ましい姿です。
積み上がっていく効果とはそういうものです。

### 2. 問い合わせる {#2-query}

扱っている領域について質問されたとき。

① **`index.md` を読んで**、関係しそうなページを見つけます。
② **ページが 100 を超える規模なら**、すべての `.md` に対して主要な語で `search_files` も
   かけます。索引だけでは見落とすことがあります。
③ `read_file` で**関係するページを読みます**。
④ まとめ上がった知識から**答えを組み立てます**。もとにしたページを挙げてください。
   「[[page-a]] と [[page-b]] にもとづくと……」のように書きます。
⑤ **値打ちのある答えは残します**——まとまった比較、掘り下げ、新しいまとめであれば、
   `queries/` か `comparisons/` にページを作ります。ちょっとした調べものは残しません。
   もう一度たどり直すのが骨の折れる答えだけです。
⑥ 問い合わせの内容と、残したかどうかを **log.md に書き足します**。

### 3. 点検する {#3-lint}

点検、健康診断、監査を頼まれたとき。

① **孤立したページ:** ほかのページから `[[wikilinks]]` で入ってくるリンクがないページを探します。
```python
# Use execute_code for this — programmatic scan across all wiki pages

from collections import defaultdict
wiki = "<WIKI_PATH>"
# Scan all .md files in entities/, concepts/, comparisons/, queries/
# Extract all [[wikilinks]] — build inbound link map
# Pages with zero inbound links are orphans
```

② **切れた wikilink:** 存在しないページを指している `[[links]]` を探します。

③ **索引の網羅:** すべてのページが `index.md` に載っているはずです。ファイルの一覧と
   索引の項目を突き合わせます。

④ **frontmatter の検査:** すべてのページに必要な項目（title、created、updated、type、tags、
   sources）がそろっているか。タグが分類にあるものか。

⑤ **古くなった内容:** 同じ対象に触れている最新の情報源より、`updated` の日付が 90 日以上
   古いページ。

⑥ **矛盾:** 同じ話題について食い違う主張をしているページ。タグや対象が重なるのに違う事実を
   書いているページを探します。`contested: true` や `contradictions:` が付いたページは
   すべて拾い出して、利用者の判断を仰ぎます。

⑦ **質の目印:** `confidence: low` のページと、情報源が 1 つだけなのに confidence の項目が
   ないページを並べます。裏付けを探すか、`confidence: medium` に下げるかの候補です。

⑧ **情報源の変化:** `raw/` の中で `sha256:` を持つファイルごとにハッシュを計算し直し、
   合わないものを知らせます。合わないのは、生のファイルが編集されたか（raw/ は書き換えない
   決まりなので、本来起きないはずです）、取り込み元の URL の中身が変わったということです。
   重大な誤りではありませんが、報告する値打ちはあります。

⑨ **ページの大きさ:** 200 行を超えたページを知らせます。分ける候補です。

⑩ **タグの点検:** 使われているタグをすべて並べ、SCHEMA.md の分類にないものを知らせます。

⑪ **記録の切り替え:** log.md が 500 件を超えていたら切り替えます。

⑫ **見つかったことを報告します。** ファイルの場所と、どうするとよいかを添え、
   深刻さの順にまとめます（切れたリンク > 孤立 > 情報源の変化 > 矛盾のあるページ > 古い内容 > 書き方の問題）。

⑬ **log.md に書き足します:** `## [YYYY-MM-DD] lint | N issues found`

## ナレッジベースを扱う {#working-with-the-wiki}

### 探す {#searching}

```bash
# Find pages by content
search_files "transformer" path="$WIKI" file_glob="*.md"

# Find pages by filename
search_files "*.md" target="files" path="$WIKI"

# Find pages by tag
search_files "tags:.*alignment" path="$WIKI" file_glob="*.md"

# Recent activity
read_file "$WIKI/log.md" offset=<last 20 lines>
```

### まとめて取り込む {#bulk-ingest}

情報源をいくつも一度に取り込むときは、更新をまとめます。
1. まず情報源をすべて読みます
2. すべての情報源を通して、出てくる対象と概念を洗い出します
3. それらのページがすでにあるかを、まとめて 1 回で調べます（1 件ずつではありません）
4. ページの作成と更新を 1 回で済ませます（同じページを何度も直さずに済みます）
5. index.md は最後に 1 回だけ直します
6. 記録はまとめて 1 件だけ書きます

### 保管に回す {#archiving}

内容が完全に置き換わったときや、扱う領域が変わったとき。
1. `_archive/` ディレクトリがなければ作ります
2. もとの階層のままページを `_archive/` へ移します（例: `_archive/entities/old-page.md`）
3. `index.md` から外します
4. そのページにリンクしていたページを直します。wikilink をただの文字と「（保管済み）」に置き換えます
5. 保管したことを記録します

### Obsidian との連携 {#obsidian-integration}

このディレクトリは、そのまま Obsidian の保管庫として使えます。
- `[[wikilinks]]` はクリックできるリンクとして表示されます
- グラフ表示で知識のつながりが見えます
- YAML の frontmatter が Dataview の問い合わせに使えます
- `raw/assets/` に置いた画像は `![[image.png]]` で参照できます

うまく使うために。
- Obsidian の添付ファイルの保存先を `raw/assets/` にします
- Obsidian の設定で "Wikilinks" を有効にします（ふつうは最初から有効です）
- Dataview プラグインを入れると `TABLE tags FROM "entities" WHERE contains(tags, "company")` のような問い合わせができます

Obsidian の skill も併せて使う場合は、`OBSIDIAN_VAULT_PATH` をナレッジベースと同じディレクトリに
設定してください。

### 画面のない環境の Obsidian（サーバーなど） {#obsidian-headless-servers-and-headless-machines}

画面のない機器では、デスクトップ版の代わりに `obsidian-headless` を使います。
GUI なしで Obsidian Sync による同期ができるので、サーバー上のエージェントが書き込み、
別の端末の Obsidian デスクトップ版で読む、という使い方にぴったりです。

**準備:**
```bash
# Requires Node.js 22+
npm install -g obsidian-headless

# Login (requires Obsidian account with Sync subscription)
ob login --email <email> --password '<password>'

# Create a remote vault for the wiki
ob sync-create-remote --name "LLM Wiki"

# Connect the wiki directory to the vault
cd ~/wiki
ob sync-setup --vault "<vault-id>"

# Initial sync
ob sync

# Continuous sync (foreground — use systemd for background)
ob sync --continuous
```

**systemd で裏側でずっと同期する:**
```ini
# ~/.config/systemd/user/obsidian-wiki-sync.service
[Unit]
Description=Obsidian LLM Wiki Sync
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/path/to/ob sync --continuous
WorkingDirectory=%h/wiki
Restart=on-failure
RestartSec=10

[Install]
WantedBy=default.target
```

```bash
systemctl --user daemon-reload
systemctl --user enable --now obsidian-wiki-sync
# Enable linger so sync survives logout:
sudo loginctl enable-linger $USER
```

これで、エージェントがサーバー上の `~/wiki` に書き込むあいだ、同じ保管庫を手元のノートパソコンや
スマートフォンの Obsidian で見られます。変更は数秒で現れます。

## つまずきやすいところ {#pitfalls}

- **`raw/` の中のファイルには決して手を入れない**——情報源は書き換えません。訂正はページ側に書きます。
- **必ず現在地から確かめる**——新しいセッションで何かをする前に、SCHEMA と索引と最近の記録を読みます。
  これを飛ばすと、重複が生まれ、相互参照が抜けます。
- **index.md と log.md は必ず更新する**——これを飛ばすと全体が傷んでいきます。この 2 つが
  たどるための背骨です。
- **ついでに触れられただけのものにページを作らない**——SCHEMA.md の「ページを作る基準」に従います。
  脚注に一度出てきた名前に、対象のページは要りません。
- **相互参照のないページを作らない**——孤立したページは見えないのと同じです。どのページも
  ほかのページへ少なくとも 2 本のリンクを張ります。
- **frontmatter は必須**——検索、絞り込み、古さの検出がこれで成り立っています。
- **タグは分類から取る**——自由に付けたタグはやがて雑音になります。新しいタグはまず SCHEMA.md に
  足してから使ってください。
- **ざっと読めるページを保つ**——1 ページは 30 秒で読めるくらいがよいです。200 行を超えたら分けます。
  細かい分析は掘り下げ用のページへ移します。
- **まとめて直す前に聞く**——1 回の取り込みで既存の 10 ページ以上に手を入れることになるなら、
  先に範囲を利用者に確かめます。
- **記録を切り替える**——log.md が 500 件を超えたら `log-YYYY.md` に名前を変えて新しく始めます。
  エージェントは点検のときに記録の大きさを確かめてください。
- **矛盾ははっきり扱う**——黙って上書きしないでください。両方の主張を日付とともに書き留め、
  frontmatter に印を付け、利用者の判断を仰ぎます。

## 関連するツール {#related-tools}

[llm-wiki-compiler](https://github.com/atomicmemory/llm-wiki-compiler) は Node.js の CLI で、
同じ Karpathy の発想にもとづき、情報源をまとめて概念ごとのナレッジベースに組み上げます。
Obsidian と互換なので、定期実行や CLI 主体の組み上げの流れが欲しい人は、この skill が育てているのと
同じ保管庫に向けられます。ただし、ページの生成はそちらが担うので（どのページを作るかの判断は
エージェントの手を離れます）、また小さめの資料群に合わせて調整されています。
人が関わりながら育てたいならこの skill を、あるディレクトリの情報源をまとめて組み上げたいなら
llmwiki を使ってください。
