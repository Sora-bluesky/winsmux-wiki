---
title: "Merger Model — M&A の EPS 増加・希薄化ワークブックを Excel で作る"
description: "M&A の EPS 増加・希薄化ワークブックを Excel で作る"
upstream_path: user-guide/skills/optional/finance/finance-merger-model.md
upstream_blob: 89c34a2cf1da4f4a2d6408f109dbb692bebc17b5
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/finance/finance-merger-model
---

# Merger Model {#merger-model}

M&A の EPS 増加・希薄化（アクリーション / ダイリューション）ワークブックを Excel で作ります。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加 skill — `hermes skills install official/finance/merger-model` で入れます |
| パス | `optional-skills/finance\merger-model` |
| バージョン | `1.0.0` |
| 作者 | Anthropic（Nous Research が改変） |
| ライセンス | Apache-2.0 |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `finance`, `m-and-a`, `merger`, `accretion-dilution`, `excel`, `openpyxl`, `modeling`, `investment-banking` |
| 関連 skill | [`excel-author`](/hermes/docs/user-guide/skills/optional/finance/finance-excel-author/), [`pptx-author`](/hermes/docs/user-guide/skills/optional/finance/finance-pptx-author/), [`dcf-model`](/hermes/docs/user-guide/skills/optional/finance/finance-dcf-model/), [`3-statement-model`](/hermes/docs/user-guide/skills/optional/finance/finance-3-statement-model/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

## 動かす環境 {#environment}

この skill は **ヘッドレスの openpyxl** を前提にしています。つまり、ディスク上に .xlsx ファイルを作ることが目的です。
セルの色付け、数式、名前付き範囲、感応度表については `excel-author` skill の作法にそろえてください。
納品の前に再計算します: `python /path/to/excel-author/scripts/recalc.py ./out/model.xlsx`。

# Merger Model {#merger-model}

M&A 取引の EPS 増加・希薄化分析を作ります。プロフォーマの EPS への影響、シナジーの感応度、取得価格の配分をモデル化します。買収候補を検討するとき、提案資料向けに統合効果の分析をまとめるとき、取引条件について助言するときに使います。

## 進め方 {#workflow}

### ステップ 1: 入力値を集める {#step-1-gather-inputs}

**買い手:**
- 会社名、現在の株価、発行済株式数
- LTM と NTM の EPS（GAAP ベースと調整後）
- PER
- 税引前の負債コスト、税率
- 手元現金、既存の負債

**対象会社:**
- 会社名、現在の株価、発行済株式数（上場している場合）
- LTM と NTM の EPS、または純利益
- 企業価値または株式価値

**取引条件:**
- 1 株あたりの買収提示価格（または現在価格に対するプレミアム）
- 対価の構成: 現金の割合と株式の割合
- 現金部分の資金調達のために新たに調達する負債
- 見込まれるシナジー（売上・コスト）と、その立ち上がりの時間軸
- 取引関連費用と資金調達費用
- 想定するクロージング日

### ステップ 2: 取得価格の分析 {#step-2-purchase-price-analysis}

| 項目 | 金額 |
|------|-------|
| 1 株あたりの買収提示価格 | |
| 現在価格に対するプレミアム | |
| 株式価値 | |
| 加算: 引き受ける純有利子負債 | |
| 企業価値 | |
| 含意される EV / EBITDA | |
| 含意される PER | |

### ステップ 3: Sources & Uses {#step-3-sources-uses}

| Sources | $ | Uses | $ |
|---------|---|------|---|
| 新規調達の負債 | | 株式の取得価格 | |
| 手元現金 | | 対象会社の負債の借り換え | |
| 新規発行の株式 | | 取引関連費用 | |
| | | 資金調達費用 | |
| **合計** | | **合計** | |

### ステップ 4: プロフォーマ EPS（増加 / 希薄化） {#step-4-pro-forma-eps-accretion-dilution}

1 年目から 3 年目まで、年ごとに計算します。

| | 単独ベース | プロフォーマ | 増加 /（希薄化） |
|---|-----------|-----------|---------------------|
| 買い手の純利益 | | | |
| 対象会社の純利益 | | | |
| シナジー（税引後） | | | |
| 支出した現金の逸失利息（税引後） | | | |
| 新規負債の支払利息（税引後） | | | |
| 無形資産の償却（税引後） | | | |
| プロフォーマ純利益 | | | |
| プロフォーマ株式数 | | | |
| **プロフォーマ EPS** | | | |
| **増加 /（希薄化）率** | | | |

### ステップ 5: 感応度分析 {#step-5-sensitivity-analysis}

**シナジーと買収プレミアムに対する EPS 増加 / 希薄化:**

| | シナジー $0M | シナジー $25M | シナジー $50M | シナジー $75M | シナジー $100M |
|---|---------|----------|----------|----------|-----------|
| プレミアム 15% | | | | | |
| プレミアム 20% | | | | | |
| プレミアム 25% | | | | | |
| プレミアム 30% | | | | | |

**現金と株式の構成比に対する EPS 増加 / 希薄化:**

| | 現金 100% | 75/25 | 50/50 | 25/75 | 株式 100% |
|---|-----------|-------|-------|-------|------------|
| 1 年目 | | | | | |
| 2 年目 | | | | | |

### ステップ 6: 損益分岐となるシナジー {#step-6-breakeven-synergies}

1 年目の EPS が増減しないために最低限必要なシナジーの額を計算します。

### ステップ 7: 成果物 {#step-7-output}

- 次の内容を含む Excel ワークブック:
  - 前提条件のシート
  - Sources & Uses
  - プロフォーマ損益計算書
  - EPS 増加・希薄化のまとめ
  - 感応度表
  - 損益分岐の分析
- 提案資料に入れる、統合効果の 1 ページまとめ

## 気をつけること {#important-notes}

- 関係するところでは、GAAP ベースと調整後（キャッシュ）EPS の両方を必ず示します
- 株式対価の取引では、交換比率に買い手の現在の株価を使い、新株発行による希薄化を明記します
- 取得価格の配分を織り込みます。のれんと無形資産の償却は GAAP ベースの EPS に効いてきます
- シナジーの立ち上がりは重要です。1 年目は年間換算のシナジーの 25〜50% 程度にとどまることがよくあります
- 支出した現金の逸失利息と、調達した負債の支払利息を忘れないでください
- シナジーや利息の調整にかける税率は、買い手の限界税率に合わせます

## データの取得元 — まず MCP、なければ Web {#data-sources-mcp-first-web-fallback}

以下の箇所には「S&P Kensho MCP / Daloopa MCP / FactSet MCP を使う」と書かれています。これらは元になった Cowork プラグインが前提としていた、商用の金融データ MCP です。Hermes では次のようにします。

- **構造化された金融データの MCP を設定している場合**（Hermes は MCP に対応しています。`native-mcp` skill を参照）、時点を揃えた類似企業比較、過去の取引事例、開示資料にはそちらを優先します。
- **設定していない場合**は、次で代替します:
  - 米国の開示資料は `web_search` / `web_extract` で SEC EDGAR（`https://www.sec.gov/cgi-bin/browse-edgar`）を参照します
  - プレスリリースや決算資料は企業の IR ページを参照します
  - 対話型のデータポータルには `browser_navigate` を使います
  - ユーザーから提供されたデータ（文脈に見当たらないときは、はっきり尋ねます）
- **数字を作ってはいけません。** 倍率、取引事例、開示上の数値の出どころを確かめられない場合は、そのセルを `[UNSOURCED]` と印を付けてユーザーに伝えます。

## 出典 {#attribution}

この skill は Anthropic の Claude for Financial Services プラグイン群（Apache-2.0）をもとにしています。Office-JS / Cowork のライブ Excel 経路は取り除き、`excel-author` skill の作法に沿ってヘッドレスの openpyxl を対象にしています。原典: https://github.com/anthropics/financial-services
