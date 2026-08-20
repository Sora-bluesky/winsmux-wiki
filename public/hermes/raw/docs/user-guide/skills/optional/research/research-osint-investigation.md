---
title: "Osint Investigation — 公開記録と制裁データから資金の流れを追う"
description: "公開記録と制裁データから資金の流れを追う"
upstream_path: user-guide/skills/optional/research/research-osint-investigation.md
upstream_blob: b118a2468e4c3c83c273c2e7361c00fbbf0b3275
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/research/research-osint-investigation
---

# Osint Investigation {#osint-investigation}

公開記録と制裁データから、資金の流れを追います。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | オプション — `hermes skills install official/research/osint-investigation` で導入します |
| パス | `optional-skills/research/osint-investigation` |
| バージョン | `0.1.0` |
| 作者 | Hermes Agent (adapted from ShinMegamiBoson/OpenPlanter, MIT) |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `osint`, `investigation`, `public-records`, `sec`, `sanctions`, `corporate-registry`, `property`, `courts`, `due-diligence`, `journalism` |
| 関連 skill | [`domain-intel`](/hermes/docs/user-guide/skills/optional/research/research-domain-intel/), [`arxiv`](/hermes/docs/user-guide/skills/bundled/research/research-arxiv/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこの内容を指示として見ています。
:::

# OSINT 調査 — 公開記録の突き合わせ {#osint-investigation-public-records-cross-reference}

公開記録を使った OSINT のための調査の型です。政府調達、企業の届出、ロビイング、
制裁、オフショア文書の流出、不動産登記、裁判記録、Web アーカイブ、知識ベース、
世界のニュースを扱います。性質の異なる情報源をまたいで実体を同定し、確からしさを
明示しながら関連づけ、統計的なタイミング検定を回して、構造化した証拠の連なりを
作ります。

**Python の標準ライブラリだけを使います。** 導入作業は不要です。Linux・macOS・
Windows で動きます。ほとんどの情報源は API キーなしで使えます（OpenCorporates は
任意の無料トークンがあり、これを使うとレート制限が緩みます）。

MIT ライセンスの ShinMegamiBoson/OpenPlanter を下敷きにしつつ、元のプロジェクトが
扱っていなかった身元・不動産・訴訟・アーカイブ・ニュースの情報源まで広げています。

## この skill を使うとき {#when-to-use-this-skill}

利用者から次のような依頼があったときに使います。

- 「資金の流れを追いたい」 — 政府調達、ロビイングから立法へのつながり、制裁
- 企業のデューデリジェンス — X 社を支配しているのは誰か、どこで法人登記されているか、
  取締役は誰か、どんな届出を出しているか
- 制裁のスクリーニング — X が OFAC の SDN や ICIJ のオフショア文書に載っていないか
- 便宜供与の調査 — オフショアとつながりのある受注業者、案件を勝ち取っている
  ロビイングの依頼主
- 不動産の所有関係 — 名義や住所から登記された権利証や抵当を探す
  （ニューヨーク市が対象。他の郡については該当する登記所を案内してください）
- 訴訟の履歴 — 連邦・州の判決文と PACER のドケットを探す
- 表記がばらつく（LLC の接尾辞、略称）情報源をまたいだ実体の同定
- 確からしさを明示した証拠の連なりの構築
- 「X について何が語られてきたか」 — 各国のニュース（GDELT）と Wikipedia の記述、
  そして消えた URL を Wayback Machine から拾い直す

次の用途にはこの skill を使わ**ない**でください。

- 一般的な Web 調査 → `web_search` / `web_extract`
- ドメインやインフラの OSINT → `domain-intel` skill
- 学術文献 → `arxiv` skill
- SNS のプロフィール探索 → `sherlock` skill（オプション）
- 米国の**連邦**選挙資金 — FEC はあえて対象外にしています
  （無料の DEMO_KEY では、寄付者名でその場その場に問い合わせる用途に API が
  安定しないためです）。連邦への献金については
  https://www.fec.gov/data/ を直接案内してください。

## 進め方 {#workflow}

エージェントは `terminal` ツールからスクリプトを実行します。`SKILL_DIR` は、
この SKILL.md が置かれているディレクトリです。

### 1. どの情報源が使えるかを見極める {#1-identify-which-sources-apply}

調査を組み立てる前に、データソースの解説ページに目を通します。

```
ls SKILL_DIR/references/sources/

# Federal financial / regulatory
cat SKILL_DIR/references/sources/sec-edgar.md       # corporate filings
cat SKILL_DIR/references/sources/usaspending.md     # federal contracts
cat SKILL_DIR/references/sources/senate-ld.md       # lobbying
cat SKILL_DIR/references/sources/ofac-sdn.md        # sanctions
cat SKILL_DIR/references/sources/icij-offshore.md   # offshore leaks

# Identity / property / litigation / archives / news
cat SKILL_DIR/references/sources/nyc-acris.md       # NYC property records
cat SKILL_DIR/references/sources/opencorporates.md  # global corporate registry
cat SKILL_DIR/references/sources/courtlistener.md   # court records (federal + state)
cat SKILL_DIR/references/sources/wayback.md         # Wayback Machine archives
cat SKILL_DIR/references/sources/wikipedia.md       # Wikipedia + Wikidata
cat SKILL_DIR/references/sources/gdelt.md           # global news monitoring
```

どのページも 9 つの節からなる同じ形式です。概要・アクセス方法・スキーマ・収録範囲・
突き合わせの鍵・データの品質・取得方法・法的な扱い・参考情報。

**cross-reference potential** の節には、情報源どうしをつなぐ結合キーが載っています。
どの組み合わせを使うかを決めるため、まずここを読んでください。

### 2. データを取得する {#2-acquire-data}

情報源ごとに、標準ライブラリだけで書かれた取得スクリプトが `SKILL_DIR/scripts/` にあります。

**連邦の財務・規制**

```bash
# SEC EDGAR filings (corporate disclosures)
python3 SKILL_DIR/scripts/fetch_sec_edgar.py --cik 0000320193 \
    --types 10-K,10-Q --out data/edgar_filings.csv

# USAspending federal contracts
python3 SKILL_DIR/scripts/fetch_usaspending.py --recipient "EXAMPLE CORP" \
    --fy 2024 --out data/contracts.csv

# Senate LD-1 / LD-2 lobbying disclosures
python3 SKILL_DIR/scripts/fetch_senate_ld.py --client "EXAMPLE CORP" \
    --year 2024 --out data/lobbying.csv

# OFAC SDN sanctions list (full snapshot)
python3 SKILL_DIR/scripts/fetch_ofac_sdn.py --out data/ofac_sdn.csv

# ICIJ Offshore Leaks — downloads ~70 MB bulk CSV on first use,
# then searches it locally. Cached for 30 days under
# $HERMES_OSINT_CACHE/icij/ (default: ~/.cache/hermes-osint/icij/).
python3 SKILL_DIR/scripts/fetch_icij_offshore.py --entity "EXAMPLE CORP" \
    --out data/icij.csv
```

**身元・不動産・訴訟・アーカイブ・ニュース**

```bash
# NYC property records (deeds, mortgages, liens) — ACRIS via Socrata
python3 SKILL_DIR/scripts/fetch_nyc_acris.py --name "SMITH, JOHN" \
    --out data/acris.csv
python3 SKILL_DIR/scripts/fetch_nyc_acris.py --address "571 HUDSON" \
    --out data/acris_addr.csv

# OpenCorporates — 130+ jurisdiction corporate registry
# (free token required; set OPENCORPORATES_API_TOKEN or pass --token)
python3 SKILL_DIR/scripts/fetch_opencorporates.py --query "Example Corp" \
    --jurisdiction us_ny --out data/opencorporates.csv

# CourtListener — federal + state court opinions, PACER dockets
python3 SKILL_DIR/scripts/fetch_courtlistener.py --query "Smith v. Example Corp" \
    --type opinions --out data/courts.csv

# Wayback Machine — historical web captures
python3 SKILL_DIR/scripts/fetch_wayback.py --url "example.com" \
    --match host --collapse digest --out data/wayback.csv

# Wikipedia + Wikidata — narrative bio + structured facts
# Set HERMES_OSINT_UA=your-app/1.0 (your@email) to identify yourself
python3 SKILL_DIR/scripts/fetch_wikipedia.py --query "Bill Gates" \
    --out data/wp.csv

# GDELT — global news in 100+ languages, ~2015→present
python3 SKILL_DIR/scripts/fetch_gdelt.py --query '"Example Corp"' \
    --timespan 1y --out data/gdelt.csv
```

出力はすべて、ヘッダー行のある正規化済みの CSV です。スクリプトは何度実行しても同じ結果になります。

その情報源にそもそも載らない個人（非上場企業の関係者を SEC EDGAR で探す、連邦の受注業者では
ない人を USAspending で探す、ロビイングの依頼主でない人を Senate LDA で探す、など）の場合、
スクリプトは空の CSV を黙って書くのではなく、はっきりした警告とともに 0 行を返します。EDGAR に
ついては、企業名の解決処理が法人の登録者ではなく個人の Form 3/4/5 提出者に当たったときに、
その旨を知らせます。

レート制限についての注意は、情報源ごとの解説ページに書かれています。既定の取得処理は、
ページをまたぐリクエストのあいだに礼儀としてしばらく待ちます。対応している情報源では
**API キーを使うとレート制限が緩みます**（`SEC_USER_AGENT`、`SENATE_LDA_TOKEN`、
`OPENCORPORATES_API_TOKEN`、`COURTLISTENER_TOKEN`）。どのスクリプトも 429 が返ったら
上流の割り当てメッセージをすぐに表示するので、速度を落とすかキーを用意すべきだと分かります。

### 3. 情報源をまたいで実体を同定する {#3-resolve-entities-across-sources}

名前を正規化し、2 つの CSV ファイルのあいだで一致するものを探します。

```bash
# Match lobbying clients (Senate LDA) against contract recipients (USAspending)
python3 SKILL_DIR/scripts/entity_resolution.py \
    --left  data/lobbying.csv   --left-name-col  client_name \
    --right data/contracts.csv  --right-name-col recipient_name \
    --out data/cross_links.csv
```

一致の度合いは 3 段階で、確からしさを明示します。

| 段階 | やり方 | 確からしさ |
|------|--------|------------|
| `exact` | 接尾辞と記号を落として正規化した文字列が一致 | 高 |
| `fuzzy` | 語を並べ替えて一致（語の集合としての一致） | 中 |
| `token_overlap` | 語の重なりが 60% 以上、共通語が 2 語以上、語は 4 文字以上 | 低 |

出力される `cross_links.csv` の列は `match_type, confidence, left_name,
right_name, left_normalized, right_normalized, left_row, right_row` です。

### 4. タイミングの統計的な相関（任意） {#4-statistical-timing-correlation-optional}

2 つの時系列が不自然なほど近くに固まっていないか（たとえばロビイングの届出が調達の
決定の直前後に集まっていないか）を、並べ替え検定で調べます。

```bash
python3 SKILL_DIR/scripts/timing_analysis.py \
    --donations data/lobbying.csv --donation-date-col filing_date \
        --donation-amount-col income --donation-donor-col client_name \
        --donation-recipient-col registrant_name \
    --contracts data/contracts.csv --contract-date-col award_date \
        --contract-vendor-col recipient_name \
    --cross-links data/cross_links.csv \
    --permutations 1000 \
    --out data/timing.json
```

このスクリプトの列指定フラグは、あえて汎用的な名前にしてあります。元のツールは献金と
調達の対比のために書かれたものですが、突き合わせでつながる（イベント, 受け手）の時系列
であれば何にでも使えます。帰無仮説は「イベントの発生時期は調達の決定日と無関係である」です。
片側 p 値は、並べ替えのうち「最も近い調達までの平均距離が観測値以下」になった割合です。
検定するには、（支払う側, 業者）の組ごとに少なくとも 3 件のイベントが必要です。

### 5. findings の JSON（証拠の連なり）を作る {#5-build-the-findings-json-evidence-chain}

```bash
python3 SKILL_DIR/scripts/build_findings.py \
    --cross-links data/cross_links.csv \
    --timing data/timing.json \
    --out data/findings.json
```

どの finding にも `id, title, severity, confidence, summary, evidence[], sources[]` が付きます。
evidence の各項目は、出典 CSV の特定の行を指し示します。利用者（あるいは後続のエージェント）は、
どの主張についても出典に当たって確かめられます。

## 確からしさと証拠の扱い {#confidence-and-evidence-discipline}

ここがこの skill の要です。利用者には次のように伝えてください。

- どの主張も、必ず記録までたどれること。裏づけのない断定はしません。
- 確からしさの段階は主張とセットで持ち回ります。`match_type=fuzzy` は「たぶんそうだ」であって、
  「確認済み」ではありません。
- 実体の同定が出すのは候補であって、結論ではありません。「ACME LLC」と「Acme Holdings Group」の
  `fuzzy` 一致は手がかりであって、事実ではありません。
- 統計的に有意であることは不正の証明ではありません。p &lt; 0.05 は、帰無仮説のもとでは
  そのタイミングの偏りが起きにくい、という意味にすぎません。汚職を立証するものではありません。
- ここで扱うデータはすべて公開記録です。それでも、誤りや古い情報、伏せ字（GDPR、非公開の記録）が
  含まれていることがあります。

## 新しい情報源を追加する {#adding-a-new-data-source}

テンプレートを使います。

```bash
cp SKILL_DIR/templates/source-template.md \
    SKILL_DIR/references/sources/<your-source>.md
```

9 つの節をすべて埋めてください。標準ライブラリだけを使い、正規化した CSV を書き出す
`fetch_<source>.py` を `scripts/` に置きます。そして上の「この skill を使うとき」の節にある
情報源の一覧を更新します。

## ツールとその限界 {#tools-and-their-limits}

- `entity_resolution.py` は外部のあいまい一致ライブラリを使いません（rapidfuzz も
  jellyfish も使いません）。語の集合による一致がここでの上限です。レーベンシュタイン距離、
  文字の翻字、音による一致が必要なら、別途 pip で入れてください。
- `timing_analysis.py` は並べ替えに Python の `random` を使います。結果を再現したいときは
  `--seed N` を渡してください。
- `fetch_*.py` は `urllib.request` を使い、`Retry-After` に従います。それでも大量に取得すると
  利用規約に触れることがあります。まず各情報源の法的な節を読んでください。

## 法的な注意 {#legal-note}

フェーズ 1 の情報源はすべて公開記録です。まとめて取得することは、それぞれのアクセス条件
（FOIA、公文書公開法、ICIJ による明示的な公表、OFAC の公開データ）のもとで認められています。
ただし、次の点に注意してください。

- 情報源によってはレート制限が厳しいです。返ってくるヘッダーに従ってください。
- 登録者情報を伏せている情報源もあります（WHOIS における GDPR、非公開の届出）。
- 公開記録どうしを突き合わせて個人を特定する行為には、倫理的な問題がつきまといます。
  この skill が作るのは証拠の連なりであって、告発ではありません。
