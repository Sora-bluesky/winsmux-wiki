---
title: "Dcf Model — Excel で DCF 法の企業価値評価ワークブックを作る"
description: "Excel で DCF 法の企業価値評価ワークブックを作る"
upstream_path: user-guide/skills/optional/finance/finance-dcf-model.md
upstream_blob: 689df50dd321847dba2d0956e60519e207a80663
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/finance/finance-dcf-model
---

# Dcf Model {#dcf-model}

Excel で DCF 法（割引キャッシュフロー法）の企業価値評価ワークブックを作ります。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール型 — `hermes skills install official/finance/dcf-model` で入れます |
| パス | `optional-skills/finance\dcf-model` |
| バージョン | `1.0.0` |
| 作者 | Anthropic（Nous Research が移植） |
| ライセンス | Apache-2.0 |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `finance`, `valuation`, `dcf`, `excel`, `openpyxl`, `modeling`, `investment-banking` |
| 関連 skill | [`excel-author`](/hermes/docs/user-guide/skills/optional/finance/finance-excel-author/), [`pptx-author`](/hermes/docs/user-guide/skills/optional/finance/finance-pptx-author/), [`comps-analysis`](/hermes/docs/user-guide/skills/optional/finance/finance-comps-analysis/), [`lbo-model`](/hermes/docs/user-guide/skills/optional/finance/finance-lbo-model/), [`3-statement-model`](/hermes/docs/user-guide/skills/optional/finance/finance-3-statement-model/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

## 動かす環境 {#environment}

この skill は **ヘッドレスの openpyxl** を前提にしています。つまり .xlsx ファイルをディスク上に作ります。
セルの色分け、数式、名前付き範囲、感応度分析の表については `excel-author` skill の作法に従ってください。
渡す前に再計算します: `python /path/to/excel-author/scripts/recalc.py ./out/model.xlsx`。

# DCF Model Builder {#dcf-model-builder}

## 概要 {#overview}

この skill は、投資銀行の実務水準に沿った株式価値評価用の DCF モデルを作ります。1 回の分析ごとに、詳細な Excel モデル（感応度分析は DCF シートの下部に含めます）を 1 つ作ります。

## ツール {#tools}

- データの取得には、使う人から渡された情報と、使える MCP サーバーをすべて使うのを既定とします。

## まず読む — 譲れない制約 {#critical-constraints---read-these-first}

ここに挙げる制約は、DCF モデルを作るあいだずっと効きます。始める前に目を通してください。

**決め打ちではなく数式で（絶対条件）:**
- 予測値、利益率、割引係数、現在価値、感応度分析のセルは、すべて生きた Excel 数式でなければなりません。Python 側で計算した数値を書き込むのは禁止です
- openpyxl であれば `ws["D20"] = "=D19*(1+$B$8)"` が正解で、`ws["D20"] = calculated_revenue` は誤りです
- 決め打ちの数値が許されるのは、(1) 実績の入力値、(2) 前提のドライバー（成長率、WACC の入力、永久成長率）、(3) 足元の市場データ（株価、有利子負債残高）だけです
- Python で計算した結果を書き込もうとしている自分に気づいたら、手を止めてください。使う人が前提を変えたら、モデルはそれに追随しなければなりません。

**使う人と一段ずつ確かめる（通しで作り切らない）:**
- データを取得したら → 生の入力ブロック（売上、利益率、株式数、純有利子負債）を見せ、予測に入る前に確認を取ります
- 売上を予測したら → 予測したトップラインと成長率を見せ、利益率の組み立てに入る前に確認を取ります
- FCF を組んだら → スケジュール全体を見せ、WACC の計算に入る前に考え方を確認します
- WACC を出したら → 計算と入力値を見せ、割引に入る前に確認を取ります
- 継続価値と現在価値を出したら → 株主価値への橋渡し（事業価値 → 株主価値 → 1 株あたり）を見せ、感応度分析の表に入る前に確認を取ります
- 各段階で誤りを拾ってください。利益率の前提の誤りに感応度分析の表を作ったあとで気づくと、下流をすべて作り直すことになります

**感応度分析の表:**
- **行数と列数は奇数にします**（標準は 5×5、ときに 7×7）。こうすると中心のセルが必ず 1 つ決まります
- **中心のセルがベースケースです。** 真ん中の行見出しと列見出しが、モデルが実際に使っている前提とぴったり一致するように軸の値を組みます（たとえばベースの WACC が 9.0% なら真ん中の行は 9.0%、永久成長率が 3.0% なら真ん中の列は 3.0%）。したがって中心セルの出力は、モデルが実際に算出した理論株価と一致するはずです。これが表を正しく組めているかの検算になります。
- **中心のセルを目立たせます。** 中間の青（`#BDD7EE`）で塗って太字にし、どれがベースケースか一目で分かるようにします。
- すべてのセル（通常は 3 表 × 25 セル = 75 セル）を、DCF を丸ごと計算し直す数式で埋めます
- openpyxl のループで数式をプログラムから書き込みます
- 仮置きの文言、線形近似、手作業の手順は一切なしです
- どのセルも、その前提の組み合わせで DCF を丸ごと計算し直さなければなりません

**セルのコメント:**
- 決め打ちの値を作るのと同時に、そのセルにコメントを付けます
- 書式は "Source: [System/Document], [Date], [Reference], [URL if applicable]" です
- 青い入力セルは、次のセクションに進む前に必ずコメントを持たせます
- 後回しにしたり、"TODO: add source" と書いたりしないでください

**レイアウトを先に決める:**
- 数式を書き始める前に、すべてのセクションの行位置を決めます
- 見出しとラベルをすべて先に書きます
- 次にセクションの区切りと空行をすべて置きます
- そのうえで、確定した行位置を使って数式を書きます
- 数式を書いたら、その場で動作を確かめます

**数式の再計算:**
- 渡す前に `python recalc.py model.xlsx 30` を実行します
- 状態が "success" になるまで、すべてのエラーを直します
- 数式エラー（#REF!、#DIV/0!、#VALUE! など）はゼロが必須です

**シナリオのブロック:**
- 弱気 / 標準 / 強気のケースごとに別々のブロックを作ります
- 各ブロックの中では、前提を予測年度の横方向に並べます
- IF の数式を使います: `=IF($B$6=1,[Bear cell],IF($B$6=2,[Base cell],[Bull cell]))`
- 数式が正しいシナリオブロックのセルを参照しているか確かめます

## DCF を組む流れ {#dcf-process-workflow}

### 手順 1: データの取得と検証 {#step-1-data-retrieval-and-validation}

MCP サーバー、使う人から渡されたデータ、そして Web からデータを集めます。

**データ源の優先順位:**
1. **MCP サーバー**（設定されていれば）- Daloopa などが提供する構造化された財務データ
2. **使う人から渡されたデータ** - 自分で調べた過去の財務数値
3. **Web の検索 / 取得** - 必要に応じて足元の株価、ベータ、有利子負債、現金

**検証のチェック項目:**
- 純有利子負債かネットキャッシュかを確かめます（評価額を左右します）
- 潜在株式調整後の株式数を確認します（直近の自社株買いや新株発行に注意）
- 過去の利益率がビジネスモデルと整合しているか確かめます
- 売上成長率を業界のベンチマークと突き合わせます
- 税率が妥当か確かめます（通常は 21〜28%）

### 手順 2: 過去の分析（3〜5 年） {#step-2-historical-analysis-3-5-years}

次の点を分析して記録します。

- **売上成長の推移**: CAGR を計算し、成長の要因を特定します
- **利益率の変化**: 売上総利益率、EBIT 率、FCF 率を追います
- **設備投資の重さ**: 減価償却費と設備投資の対売上比率
- **運転資本の効率**: 運転資本の増減の、売上増加額に対する比率
- **収益性の指標**: ROIC、ROE の推移

次のようなまとめの表を作ります。
```
Historical Metrics (LTM):
Revenue: $X million
Revenue growth: X% CAGR
Gross margin: X%
EBIT margin: X%
D&A % of revenue: X%
CapEx % of revenue: X%
FCF margin: X%
```

### 手順 3: 売上の予測を組む {#step-3-build-revenue-projections}

**進め方:**
1. 直近の実績売上（LTM か直近の会計年度）から始めます
2. 予測年度ごとに成長率をあてます
3. 金額と、計算された成長率の両方を見せます

**成長率の考え方:**
- 1〜2 年目: 近い将来は見通しが立つため高めの成長
- 3〜4 年目: 業界平均に向けて徐々に緩やかに
- 5 年目以降: 永久成長率に近づけていきます

**数式の形:**
- 売上(N 年目) = 売上(N-1 年目) × (1 + 成長率)
- 成長率(N 年目) = 売上(N 年目) / 売上(N-1 年目) - 1

**3 シナリオでの組み方:**
```
Bear Case: Conservative growth (e.g., 8-12%)
Base Case: Most likely scenario (e.g., 12-16%)
Bull Case: Optimistic growth (e.g., 16-20%)
```

### 手順 4: 販管費などのモデル化 {#step-4-operating-expense-modeling}

**固定費 / 変動費の切り分け:**

営業費用は、現実的な営業レバレッジが効くように組みます。

- **販売・マーケティング費**: ビジネスモデルにもよりますが、通常は売上の 15〜40%
- **研究開発費**: テクノロジー企業なら通常は 10〜30%
- **一般管理費**: 通常は売上の 8〜15% で、規模が大きくなるほどレバレッジが効きます

**押さえておく原則:**
- 比率はすべて売上総利益ではなく **売上** に対して取ります
- 営業レバレッジを織り込みます。売上が伸びるにつれて比率は下がるはずです
- 販売・マーケティング費、研究開発費、一般管理費は別々の行にします
- EBIT = 売上総利益 - 営業費用合計 で計算します

**利益率をどう伸ばすかの整理:**
```
Current State → Target State (Year 5)
Gross Margin: X% → Y% (justify based on scale, efficiency)
EBIT Margin: X% → Y% (result of revenue growth + opex leverage)
```

### 手順 5: フリーキャッシュフローの計算 {#step-5-free-cash-flow-calculation}

**FCF は次の順で組みます:**

```
EBIT
(-) Taxes (EBIT × Tax Rate)
= NOPAT (Net Operating Profit After Tax)
(+) D&A (non-cash expense, % of revenue)
(-) CapEx (% of revenue, typically 4-8%)
(-) Δ NWC (change in working capital)
= Unlevered Free Cash Flow
```

**運転資本の置き方:**
- 売上の増加額（前年差）に対する比率で計算します
- よくある範囲は売上増加額の -2% から +2% です
- マイナスなら現金の源泉（運転資本の取り崩し）です
- プラスなら現金の使い道（運転資本の積み増し）です

**維持のための設備投資と、成長のための設備投資:**
- 維持のための設備投資: いまの事業を回し続けるためのもの（売上の 2〜3% 程度）
- 成長のための設備投資: 事業拡大を支えるもの（さらに売上の 2〜5%）
- 設備投資の合計は、その会社の成長戦略と整合していなければなりません

### 手順 6: 資本コスト（WACC）を調べる {#step-6-cost-of-capital-wacc-research}

**株主資本コストは CAPM で求めます:**

```
Cost of Equity = Risk-Free Rate + Beta × Equity Risk Premium

Where:
- Risk-Free Rate = Current 10-Year Treasury Yield
- Beta = 5-year monthly stock beta vs market index
- Equity Risk Premium = 5.0-6.0% (market standard)
```

**負債コストの計算:**

```
After-Tax Cost of Debt = Pre-Tax Cost of Debt × (1 - Tax Rate)

Determine Pre-Tax Cost of Debt from:
- Credit rating (if available)
- Current yield on company bonds
- Interest expense / Total Debt from financials
```

**資本構成の重み:**

```
Market Value Equity = Current Stock Price × Shares Outstanding
Net Debt = Total Debt - Cash & Equivalents
Enterprise Value = Market Cap + Net Debt

Equity Weight = Market Cap / Enterprise Value
Debt Weight = Net Debt / Enterprise Value

WACC = (Cost of Equity × Equity Weight) + (After-Tax Cost of Debt × Debt Weight)
```

**特殊なケース:**
- **ネットキャッシュの場合**: 現金が有利子負債を上回るなら、純有利子負債はマイナスになります
  - 負債の重みがマイナスになることがあります
  - WACC の計算もそれに合わせて変わります
- **無借金の場合**: WACC = 株主資本コスト です

**WACC のおおよその水準:**
- 大型株・安定企業: 7〜9%
- 成長企業: 9〜12%
- 高成長 / 高リスク: 12〜15%

### 手順 7: 割引率をあてる（5〜10 年の予測期間） {#step-7-discount-rate-application-5-10-year-forecast}

**期央主義:**
- キャッシュフローは年の半ばに発生すると考えます
- 割引期間: 0.5、1.5、2.5、3.5、4.5、…
- 割引係数 = 1 / (1 + WACC)^期間

**現在価値の計算:**
```
For each projection year:
PV of FCF = Unlevered FCF × Discount Factor

Example (Year 1):
FCF = $1,000
WACC = 10%
Period = 0.5
Discount Factor = 1 / (1.10)^0.5 = 0.9535
PV = $1,000 × 0.9535 = $954
```

**予測期間の選び方:**
- **5 年**: たいていの分析での標準です
- **7〜10 年**: 成長余地が長く続く高成長企業向けです
- **3 年**: 成熟した安定企業向けです

### 手順 8: 継続価値の計算 {#step-8-terminal-value-calculation}

**永久成長法（こちらを優先します）:**

```
Terminal FCF = Final Year FCF × (1 + Terminal Growth Rate)
Terminal Value = Terminal FCF / (WACC - Terminal Growth Rate)

Critical Constraint: Terminal Growth < WACC (otherwise infinite value)
```

**永久成長率の選び方:**
- 保守的: 2.0〜2.5%（GDP 成長率）
- 中庸: 2.5〜3.5%
- 強気: 3.5〜5.0%（市場をリードする企業に限ります）

**これを超えてはいけません**: 無リスク金利、または長期の GDP 成長率

**出口倍率法（代わりの方法）:**
```
Terminal Value = Final Year EBITDA × Exit Multiple

Where Exit Multiple comes from:
- Industry comparable trading multiples
- Precedent transaction multiples
- Typical range: 8-15x EBITDA
```

**継続価値の現在価値:**
```
PV of Terminal Value = Terminal Value / (1 + WACC)^Final Period

Where Final Period accounts for timing:
5-year model with mid-year convention: Period = 4.5
```

**継続価値の妥当性チェック:**
- 事業価値の 50〜70% に収まるはずです
- 75% を超えるなら、継続価値の前提に寄りかかりすぎているかもしれません
- &lt;40% なら、継続価値の前提が保守的すぎないか確かめます

### 手順 9: 事業価値から株主価値への橋渡し {#step-9-enterprise-to-equity-value-bridge}

**評価まとめの組み立て:**

```
(+) Sum of PV of Projected FCFs = $X million
(+) PV of Terminal Value = $Y million
= Enterprise Value = $Z million

(-) Net Debt [or + Net Cash if negative] = $A million
= Equity Value = $B million

÷ Diluted Shares Outstanding = C million shares
= Implied Price per Share = $XX.XX

Current Stock Price = $YY.YY
Implied Return = (Implied Price / Current Price) - 1 = XX%
```

**大事な調整:**
- **純有利子負債 = 有利子負債合計 - 現金及び現金同等物**
  - プラスなら事業価値から差し引きます（株主価値が減ります）
  - マイナス（ネットキャッシュ）なら事業価値に足します（株主価値が増えます）
- **潜在株式調整後の株式数を使います**: ストックオプション、RSU、転換証券を含めます
- **その他の調整**（該当する場合）:
  - 非支配株主持分
  - 年金債務
  - オペレーティングリース債務

**評価結果の出力形式:**
```csv
Valuation Component,Amount ($M)
PV Explicit FCFs,X.X
PV Terminal Value,Y.Y
Enterprise Value,Z.Z
(-) Net Debt,A.A
Equity Value,B.B
,,
Shares Outstanding (M),C.C
Implied Price per Share,$XX.XX
Current Share Price,$YY.YY
Implied Upside/(Downside),+XX%
```

### 手順 10: 感応度分析 {#step-10-sensitivity-analysis}

DCF シートの下部に **感応度分析の表を 3 つ** 作り、前提が変わると評価額がどう動くかを見せます。

1. **WACC × 永久成長率** - 割引率と永久成長率に対する事業価値の感度を見ます
2. **売上成長率 × EBIT 率** - トップラインの成長と営業レバレッジの効き方を見ます
3. **ベータ × 無リスク金利** - 株主資本コストの構成要素に対する感度を見ます

**作り方**: これは Excel の「データテーブル」機能ではなく、各セルに数式を書いた単純な 2 次元の表です。どのセルも、その前提の組み合わせで DCF を丸ごと計算し直します。75 セルすべてを openpyxl でプログラムから埋める要件は、「まず読む — 譲れない制約」の節を見てください。

&lt;correct_patterns>

この節には、DCF モデルを組むときに従うべき正しいパターンをまとめてあります。

### シナリオブロックの選択パターン — この形にします {#scenario-block-selection-pattern---follow-this-approach}

**前提はシナリオごとに別々のブロックにまとめます:**

**重要な構造 — セクションの見出しごとに 3 行:**

```csv
BEAR CASE ASSUMPTIONS (section header, merge cells across)
Assumption,FY1,FY2,FY3,FY4,FY5
Revenue Growth (%),12%,10%,9%,8%,7%
EBIT Margin (%),45%,44%,43%,42%,41%

BASE CASE ASSUMPTIONS (section header, merge cells across)
Assumption,FY1,FY2,FY3,FY4,FY5
Revenue Growth (%),16%,14%,12%,10%,9%
EBIT Margin (%),48%,49%,50%,51%,52%

BULL CASE ASSUMPTIONS (section header, merge cells across)
Assumption,FY1,FY2,FY3,FY4,FY5
Revenue Growth (%),20%,18%,15%,13%,11%
EBIT Margin (%),50%,51%,52%,53%,54%
```

**シナリオのブロックには必ず列見出しの行を置き**、予測年度（FY2025E、FY2026E など）をセクションのタイトルのすぐ下に示します。これが無いと、どの前提の値がどの年度のものか分かりません。

**前提の参照のしかた — 集約列を作ります:**
1. ケース選択のセル（たとえば B6）に 1=弱気、2=標準、3=強気 を入れます
2. INDEX か OFFSET の数式で、選ばれたシナリオブロックから値を引いてくる集約列を作ります
3. 予測の数式はこの集約列を参照します（セル参照がすっきりします）
4. どのシナリオブロックにも、予測年度分の前提が一式そろっているようにします

**推奨する集約列のパターン（INDEX を使う）:**
`=INDEX(B10:D10, 1, $B$6)`

**これは避けます — あちこちに散らばった IF:**
`=IF($B$6=1,[Bear block cell],IF($B$6=2,[Base block cell],[Bull block cell]))`

集約列にすると処理が 1 か所に集まり、モデルを追いやすくなります。

### 正しい売上予測のパターン {#correct-revenue-projection-pattern}

**INDEX の数式で集約列を作り、予測ではその列を参照します:**

**手順 1 - FY1 の成長率の集約列:**
`=INDEX([Bear FY1 growth]:[Bull FY1 growth], 1, $B$6)`

**手順 2 - 売上の予測は集約列を参照します:**
`Revenue Year 1: =D29*(1+$E$10)`

ここで、

- D29 = 前年度の売上
- $E$10 = FY1 の成長率の集約列のセル（INDEX の数式が入っています）
- $B$6 = ケース選択のセル（1=弱気、2=標準、3=強気）

**このやり方は、予測の数式ひとつひとつに IF を埋め込むよりすっきりしていて**、どのシナリオの前提が使われているかもずっと追いやすくなります。

### 正しい FCF の数式パターン {#correct-fcf-formula-pattern}

**INDEX の数式で集約列を作り、FCF の計算ではその列を参照します:**

**集約列を使うやり方:**
```csv
Item,Formula,Reference
D&A,=E29*$E$21,$E$21 = consolidation column for D&A %
CapEx,=E29*$E$22,$E$22 = consolidation column for CapEx %
Δ NWC,=(E29-D29)*$E$23,$E$23 = consolidation column for NWC %
Unlevered FCF,=E57+E58-E60-E62,E57=NOPAT E58=D&A E60=CapEx E62=Δ NWC
```

**集約列のセルにはそれぞれ INDEX の数式が入り**、ケース選択に応じて該当するシナリオブロックから値を引いてきます。これで予測の数式はすっきりしたまま、内容も追いやすくなります。

数式を書き始める前に、シナリオブロックの行位置を確かめ、集約列を用意しておきます。

### 正しいセルコメントの書式 {#correct-cell-comment-format}

**決め打ちの値には、すべてこの書式でコメントを付けます:**

"Source: [System/Document], [Date], [Reference], [URL if applicable]"

**例:**
```csv
Item,Source Comment
Stock price,Source: Market data script 2025-10-12 Close price
Shares outstanding,Source: 10-K FY2024 Page 45 Note 12
Historical revenue,Source: 10-K FY2024 Page 32 Consolidated Statements
Beta,Source: Market data script 2025-10-12 5-year monthly beta
Consensus estimates,Source: Management guidance Q3 2024 earnings call
```

### 正しい前提テーブルの構造 {#correct-assumption-table-structure}

**重要: シナリオのブロックには 3 つの構成要素が必要です。**

1. **セクションの見出し行**（セルを結合）: たとえば "BEAR CASE ASSUMPTIONS"
2. **年度を示す列見出しの行** - これは必須です。省略しないでください
3. **前提の値が入るデータ行**

**構造:**
```csv
BEAR CASE ASSUMPTIONS (section header - merge across columns A:G)
Assumption,FY1,FY2,FY3,FY4,FY5
Revenue Growth (%),X%,X%,X%,X%,X%
EBIT Margin (%),X%,X%,X%,X%,X%
Terminal Growth,X%,,,,
WACC,X%,,,,

BASE CASE ASSUMPTIONS (section header - merge across columns A:G)
Assumption,FY1,FY2,FY3,FY4,FY5
Revenue Growth (%),X%,X%,X%,X%,X%
EBIT Margin (%),X%,X%,X%,X%,X%
Terminal Growth,X%,,,,
WACC,X%,,,,

BULL CASE ASSUMPTIONS (section header - merge across columns A:G)
Assumption,FY1,FY2,FY3,FY4,FY5
Revenue Growth (%),X%,X%,X%,X%,X%
EBIT Margin (%),X%,X%,X%,X%,X%
Terminal Growth,X%,,,,
WACC,X%,,,,
```

**予測年度（FY2025E、FY2026E など）を示す列見出しの行が無いと、どの前提の値がどの年度のものか分かりません。この行は必須です。**

**そのうえで集約列を作ります。**（ふつうは右隣の列です）ケース選択に応じて INDEX の数式で該当するシナリオブロックから値を引いてきます。予測の数式はこの集約列を参照します。

### 正しい行レイアウトの決め方 {#correct-row-planning-process}

**1. 見出しとラベルをすべて先に書きます:**
```csv
Row,Content
1,[Company Name] DCF Model
2,Ticker | Date | Year End
4,Case Selector
7,KEY ASSUMPTIONS
26,Assumption headers
27-31,Growth assumptions
...,...
```

**2. セクションの区切りと空行をすべて置きます**

**3. そのうえで、確定した行位置を使って数式を書きます**

**4. 数式を書いたら、その場で動作を確かめます**

**建物を建てるのと同じだと考えてください:**
- 良い例: 基礎を打ってから壁を建てる（構造が安定します）
- 悪い例: 壁を建ててから基礎を打つ（壁が倒れます）

**Excel に置き換えると:**
- 良い例: 見出しを置いてから数式を書く（数式が安定します）
- 悪い例: 数式を書いてから見出しを置く（数式が壊れます）

### 正しい感応度分析の作り方 {#correct-sensitivity-table-implementation}

**重要**: これは Excel の「データテーブル」機能ではありません。openpyxl でふつうの数式を書き込むだけの単純な表です。合計で 75 個ほど（3 表 × 各 25 セル）の数式になりますが、やること自体は素直で、これは必須です。

**プログラムから数式で埋める:**

感応度分析の表は、前提の組み合わせごとに理論株価を計算し直す数式で、すべて埋めなければなりません。**Excel のデータテーブル機能は使わないでください**（手作業が必要で、openpyxl から自動化できません）。

**作り方 — 具体例:**

**表の構造 — 5×5 の格子（奇数にして、ベースケースを中心に置きます）:**

モデルのベースの WACC が 9.0%、ベースの永久成長率が 3.0% なら、その値を中心に左右対称の軸を作ります。

```csv
WACC vs Terminal Growth,  2.0%,  2.5%,  3.0%,  3.5%,  4.0%
              8.0%,       [fml], [fml], [fml], [fml], [fml]
              8.5%,       [fml], [fml], [fml], [fml], [fml]
              9.0%,       [fml], [fml], [★  ], [fml], [fml]   ← middle row = base WACC
              9.5%,       [fml], [fml], [fml], [fml], [fml]
             10.0%,       [fml], [fml], [fml], [fml], [fml]
                                   ↑
                          middle col = base terminal g
```

**★ が中心のセルです。** ここの計算結果は、モデルが実際に算出した理論株価（評価まとめの値）と一致しなければなりません。このセルには中間の青（`#BDD7EE`）を塗って太字にし、ベースケースが目で追えるようにします。

**軸の値の決まりごと:** `axis_values = [base - 2*step, base - step, base, base + step, base + 2*step]` — ベースを中心に左右対称で、数が奇数なので中心が必ず決まります。

**数式のパターン - セル B88（WACC=8.0%、永久成長率=2.0%）:**

B88 の数式は、次の値を使って理論株価を計算し直します。

- 行見出しの WACC: `$A88`（8.0%）
- 列見出しの永久成長率: `B$87`（2.0%）

**おすすめのやり方:** DCF 本体の計算を参照しつつ、この 2 つの値だけを差し替えます。

**数式の形の例:**
`=([SUM of PV FCFs using $A88 as discount rate] + [Terminal Value using B$87 as growth rate and $A88 as WACC] - [Net Debt]) / [Shares]`

**重要 - 5x5 の格子のすべてのセルに数式を書きます（1 表 25 セル、合計 75 セル）。** openpyxl のループでプログラムから書き込んでください。この手順を飛ばしたり、仮置きの文言を残したりしないでください。

**Python での書き方:**
```python
# Pseudocode for populating sensitivity table
for row_idx, wacc_value in enumerate(wacc_range):
    for col_idx, term_growth_value in enumerate(term_growth_range):
        # Build formula that uses wacc_value and term_growth_value
        formula = f"=<DCF recalc using {wacc_value} and {term_growth_value}>"
        ws.cell(row=start_row+row_idx, column=start_col+col_idx).value = formula
```

**感応度分析の表は、モデルを開いた瞬間から動かなければなりません。使う人に手作業をさせてはいけません。**

&lt;/correct_patterns>

&lt;common_mistakes>

この節には、DCF モデルを組むときに避けるべき誤ったパターンをまとめてあります。

### 誤り: 感応度分析を近似で済ませる、仮置きの文言を残す {#wrong-simplified-sensitivity-table-approximations-or-placeholder-text}

**線形近似を使ってはいけません:**

```
// WRONG - Linear approximation
B97: =B88*(1+(0.096-0.116))    // Assumes linear relationship

// WRONG - Division shortcut
B105: =B88/(1+(E48-0.07))      // Doesn't recalculate full DCF
```

**仮置きの文言を残してはいけません:**
```
// WRONG - Placeholder note
"Note: Use Excel Data Table feature (Data → What-If Analysis → Data Table) to populate sensitivity tables."

// WRONG - Empty cells
[leaving cells blank because "this is complex"]
```

**言葉を取り違えないでください:**
- ❌ 「感応度分析には Excel のデータテーブル機能が必要だ」（違います。それは使えない特定の Excel 機能です）
- ✅ 「感応度分析は各セルに数式を書いた単純な表だ」（そのとおりで、これを作ります）

**近道が誤りである理由:**
- 線形近似の数式は DCF を計算し直しておらず、単純な算術で調整しているだけです
- 関係は線形ではないので、結果がずれます
- 仮置きの文言は、使う人に手作業を強います
- 渡した時点でそのまま使えません
- 実務水準とは言えず、顧客に出せません
- 空欄は、成果物が未完成だということです

**受け入れてはいけない言い訳:**
「75 個も数式を書くのは大変そうだから、あとは手作業でと注記しておこう」

**実際のところ:** Python と openpyxl のループを使えば、75 個の数式は素直に書けます。どの数式も同じ形で、行と列の値を差し替えるだけです。これは成果物に必ず含めるべきものです。

**代わりに:** 感応度分析のセルはすべて、その前提の組み合わせで DCF を丸ごと計算し直す数式で埋めます

### 誤り: セルのコメントが無い {#wrong-missing-cell-comments}

**やってはいけないこと:**
- 決め打ちの入力を、コメント無しで作る
- 「あとで付けよう」と考える
- "TODO: add source" と書く
- 青い入力セルに出典を残さない

**なぜ誤りか:**
- データの出どころを確かめられません
- xlsx skill の要件を満たしません
- 監査に耐えません
- あとで直す手間が増えます

**代わりに:** 決め打ちの値を作るのと同時に、そのセルにコメントを付けます

### 誤り: 数式の参照行がずれている {#wrong-formula-row-references-off}

**症状:**
FCF の節が、誤った前提の行を参照しています。
`D&A:  =E29*$E$34    // Should be $E$21, but referencing wrong row`
`CapEx: =E29*$E$41   // Should be $E$22, but row shifted`

**こうなる理由:**
1. 先に数式を書いた
2. あとから見出しを挿入した
3. 行の参照がすべてずれた
4. 数式が誤ったセルを指し、#REF! エラーになる

**代わりに:** 先に行のレイアウトを固定し、それから数式を書きます

### 誤り: 前提ごとに 1 行、シナリオを横に並べる {#wrong-single-row-for-each-assumption-across-scenarios}

**前提をこう並べてはいけません:**
```csv
Assumption,Bear,Base,Bull
Revenue Growth FY1,10%,13%,16%
Revenue Growth FY2,9%,12%,15%
```
この縦並びだと、各シナリオの中で前提が年度ごとにどう動くのかが見えにくくなります。

**なぜ誤りか:**
- 各シナリオの中で、前提が年度ごとにどう変わるかが見えません
- 予測期間全体でシナリオ同士を見比べにくくなります
- シナリオの筋道を確かめるのに向きません

**代わりに:**
- シナリオ（弱気、標準、強気）ごとに別々のブロックを作ります
- 各ブロックの中では、前提を予測年度の横方向に並べます
- こうすると、各シナリオの前提をひとまとまりとして見渡せます

### 誤り: 罫線が無い {#wrong-no-borders}

**罫線の無いモデルを渡してはいけません:**
- セクションの切れ目が分かりません
- セルが全部つながって見えます
- 読みにくく、実務水準に見えません

**なぜ誤りか:**
- 顧客に出せません
- どこを見ればいいか分かりません
- 素人くさく見えます

**代わりに:** 主要なセクションの周りに罫線を引きます

### 誤り: フォント色が違う、色分けしていない {#wrong-wrong-font-colors-or-no-font-color-distinction}

**やってはいけないこと:**
- 文字がすべて黒
- 塗りつぶしの色だけ使い、フォント色を変えない
- どのセルが青でどれが黒か取り違える

**なぜ誤りか:**
- 入力と数式を見分けられません
- 中身を追うことができなくなります
- xlsx skill の要件に反します

**代わりに:** 決め打ちの入力はすべて青文字、数式はすべて黒文字、別シートへの参照は緑にします

### 誤り: 営業費用を売上総利益基準で置く {#wrong-operating-expenses-based-on-gross-profit}

**やってはいけないこと:**
`S&M: =E33*0.15    // E33 = Gross Profit (WRONG)`

**なぜ誤りか:**
- 営業費用は売上総利益ではなく売上に連動します
- 利益率の推移が現実離れします
- 実際の事業の動き方と違います

**代わりに:**
`S&M: =E29*0.15    // E29 = Revenue (CORRECT)`

### よくある誤り 5 選 {#top-5-errors-summary}

1. **数式の参照行がずれている** → 数式を書く前に、すべての行位置を決めます
2. **セルのコメントが無い** → 最後にまとめず、セルを作るのと同時に付けます
3. **感応度分析を簡略化している** → 近似ではなく、DCF を丸ごと計算し直す数式ですべてのセルを埋めます
4. **シナリオブロックの参照が違う** → IF の数式が、正しい弱気 / 標準 / 強気のブロックを引いているか確かめます
5. **罫線が無い** → 顧客に出せる見た目にするため、セクションの罫線を引きます

さらに、次の誤りにも注意してください。

### WACC の計算での誤り {#wacc-calculation-errors}
- 資本構成で簿価と時価を混ぜてしまう
- 株式ベータとアンレバードベータの使い分けを誤る
- 負債コストへの税率のあて方を誤る
- 無リスク金利が違う（足元の 10 年国債利回りを使います）
- 純有利子負債とネットキャッシュの調整を忘れる

### 成長の前提の穴 {#growth-assumption-flaws}
- 永久成長率が WACC を超えている（価値が無限大になります）
- 予測の成長率が過去の実績と整合していない
- 業界としての成長の頭打ちを無視している
- 売上成長が単位あたりの経済性と噛み合っていない
- 利益率の改善に、事業上の裏づけがない

### 継続価値での誤り {#terminal-value-mistakes}
- 手法の選び方が違う（永久成長法か出口倍率法か）
- 継続価値が事業価値の 80% を超えている（寄りかかりすぎです）
- 継続期の利益率が、定常状態の前提と整合していない
- 継続価値の割引期間が違う

### キャッシュフロー予測での誤り {#cash-flow-projection-errors}
- 営業費用を売上ではなく売上総利益基準で置いている
- 減価償却費 / 設備投資の比率が、そのビジネスモデルに合っていない
- 運転資本の増減を正しく計算していない
- 年度ごとに税率が食い違っている
- NOPAT の計算を誤っている

**ここに挙げたものが最も多い誤りです。DCF を組み始める前に、この節を読み直してください。**

&lt;/common_mistakes>

## Excel ファイルの作成 {#excel-file-creation}

**この skill は、表計算の操作をすべて `xlsx` skill に任せます。** xlsx skill が用意しているのは次のものです。

- 数式の書き方の統一ルール
- 数値書式の作法
- `recalc.py` スクリプトによる数式の自動再計算
- ひととおりのエラーチェックと検証

この skill が作る Excel ファイルは、数式エラーがゼロであることと再計算を済ませることを含め、xlsx skill の要件をすべて満たさなければなりません。

## 品質の物差し {#quality-rubric}

DCF モデルは、次の点を最大限に満たすように作ります。

1. **売上と利益率の前提が現実的であること**（過去の実績にもとづきます）
2. **資本コストが適切に計算されていること**（CAPM を正しく使います）
3. **感応度分析が十分であること**（評価額の幅が見えます）
4. **継続価値の計算が明快であること**（根拠が添えてあります）
5. **モデルの構造が実務水準であること**（シナリオ分析ができます）
6. **主要な前提がすべて透明に記録されていること**

## 必要な入力 {#input-requirements}

### 最低限そろえるもの {#minimum-required-inputs}
1. **企業の識別子**: ティッカーか会社名
2. **成長の前提**: 予測期間の売上成長率（または「コンセンサスを使う」）
3. **任意の指定**:
   - 予測期間（既定は 5 年）
   - シナリオのケース（弱気 / 標準 / 強気の成長率と利益率の前提）
   - 永久成長率（既定は 2.5〜3.0%）
   - CAPM を使わない場合の WACC の入力値

## Excel モデルの構成 {#excel-model-structure}

### シートの構成 {#sheet-architecture}

**シートを 2 つ** 作ります。

1. **DCF** - 評価モデル本体で、下部に感応度分析を置きます
2. **WACC** - 資本コストの計算

**重要**: 感応度分析の表は、別シートではなく DCF シートの **下部** に置きます。こうすると評価に関する出力が 1 か所にまとまります。

### 数式の再計算（必須） {#formula-recalculation-mandatory}

Excel モデルを作ったり直したりしたら、`excel-author` skill の `recalc.py` スクリプトで **すべての数式を再計算** します。

```bash
python recalc.py [path_to_excel_file] [timeout_seconds]
```

例:
```bash
python recalc.py AAPL_DCF_Model_2025-10-12.xlsx 30
```

このスクリプトは次のことをします。

- LibreOffice を使って、全シートの数式を再計算します
- すべてのセルを走査して Excel のエラー（#REF!、#DIV/0!、#VALUE!、#NAME?、#NULL!、#NUM!、#N/A）を探します
- エラーの位置と件数を含む JSON を返します

**返ってくる形:**
```json
{
  "status": "success",           // or "errors_found"
  "total_errors": 0,              // Total error count
  "total_formulas": 42,           // Number of formulas in file
  "error_summary": {}             // Only present if errors found
}
```

**エラーが見つかった場合**は、詳細が付きます。
```json
{
  "status": "errors_found",
  "total_errors": 2,
  "total_formulas": 42,
  "error_summary": {
    "#REF!": {
      "count": 2,
      "locations": ["DCF!B25", "DCF!C25"]
    }
  }
}
```

モデルを渡す前に、**すべてのエラーを直して** 状態が "success" になるまで recalc.py を回します。

### 見た目の決まりごと {#formatting-standards}

**重要**: 数式の書き方と数値書式の作法は xlsx skill に従います。DCF の skill は、そこに見た目の決まりごとを足します。

**色の使い方 — 2 つの層**:

**層 1: フォント色（xlsx skill で必須）**
- **青文字（RGB: 0,0,255）**: 決め打ちの入力すべて（株価、株式数、過去の実績、前提）
- **黒文字（RGB: 0,0,0）**: 数式と計算結果すべて
- **緑文字（RGB: 0,128,0）**: 別シートへの参照（WACC シートの参照など）

**層 2: 塗りつぶし色 — 青とグレーを基調にします（指定が無ければこれを既定にします）**
- **控えめにします。** 塗りつぶしは青とグレーだけにします。緑・黄・オレンジや、複数のアクセント色を持ち込まないでください。色が多いモデルは素人くさく見えます。
- **既定の配色:**
  - **セクションの見出し**: 濃い青（RGB: 31,78,121 / `#1F4E79`）の背景に、白の太字
  - **小見出し・列見出し**: 淡い青（RGB: 217,225,242 / `#D9E1F2`）の背景に、黒の太字
  - **入力セル**: 薄いグレー（RGB: 242,242,242 / `#F2F2F2`）の背景に青文字。とことん簡素にしたいなら白背景に青文字でもかまいません
  - **計算セル**: 白背景に黒文字
  - **出力・まとめの行**（1 株あたりの価値、事業価値など）: 中間の青（RGB: 189,215,238 / `#BDD7EE`）の背景に、黒の太字
- **これだけです。青 3 種 + グレー 1 種 + 白。** 増やしたくなっても我慢してください。
- 使う人からテンプレートや色の指定があれば、そちらが常に優先します。

**2 つの層の組み合わせ方:**
- 入力セル: 青文字 + 薄いグレーの塗り = 「手で入れた値」
- 数式セル: 黒文字 + 白背景 = 「計算結果」
- 別シート参照: 緑文字 + 白背景 = 「他のシートから引いた値」
- 主要な出力: 黒の太字 + 中間の青の塗り = 「これが答え」

**フォント色は「それが何か」（入力 / 数式 / 参照）を、塗りつぶし色は「どこにいるか」（見出し / データ / 出力）を表します。**

### 罫線の決まりごと（実務水準の見た目には必須） {#border-standards-required-for-professional-appearance}

**太い罫線**（1.5pt）は主要なセクションの周りに引きます。

- 主要な入力のセクション
- 予測の前提のセクション
- 5 年間のキャッシュフロー予測のセクション
- 継続価値のセクション
- 評価まとめのセクション
- 感応度分析の各表

**中くらいの罫線**（1pt）は小さいセクションの境目に引きます。

- 企業情報と過去の実績のあいだ
- 成長の前提、EBIT 率、FCF のパラメータのあいだ

**細い罫線**（0.5pt）はデータの表の周りに引きます。

- シナリオの前提の表（弱気 | 標準 | 強気 | 選択中）
- 過去実績と予測を並べた財務数値の表

**罫線を引かないところ:** 表の中の個々のセル（すっきりさせ、目で追いやすくします）

**罫線は必須です。** 罫線の無いモデルは顧客に出せません。

**数値書式**（xlsx skill の基準に従います）:
- **年度**: 文字列として扱います（"2,024" ではなく "2024"）
- **パーセント**: `0.0%`（小数第 1 位まで）
- **金額**: 百万単位は `$#,##0`、1 株あたりは `$#,##0.00`。単位は必ず見出しに書きます（"Revenue ($mm)"）
- **ゼロ**: 数値書式でゼロを "-" と表示します（例: `$#,##0;($#,##0);-`）
- **大きな数**: `#,##0` で桁区切りを入れます
- **負の数**: マイナス記号ではなく `(#,##0)` のかっこで表します

**セルのコメント（決め打ちの入力すべてに必須）**:

xlsx skill のとおり、決め打ちの値には出典を記したセルのコメントが必要です。書式は "Source: [System/Document], [Date], [Reference], [URL if applicable]" です。

**重要**: コメントはセルを作るのと同時に付けます。最後にまとめてはいけません。

### DCF シートの詳しい構成 {#dcf-sheet-detailed-structure}

**セクション 1: ヘッダー**
```csv
Row,Content
1,[Company Name] DCF Model
2,Ticker: [XXX] | Date: [Date] | Year End: [FYE]
3,Blank
4,Case Selector Cell (1=Bear 2=Base 3=Bull)
5,Case Name Display (formula: =IF([Selector]=1"Bear"IF([Selector]=2"Base""Bull")))
```

**セクション 2: 市場データ（ケースによらない値）**
```csv
Item,Value
Current Stock Price,$XX.XX
Shares Outstanding (M),XX.X
Market Cap ($M),[Formula]
Net Debt ($M),XXX [or Net Cash if negative]
```

**セクション 3: DCF のシナリオ前提**

シナリオ（弱気、標準、強気）ごとに前提のブロックを作り、DCF 固有の前提（売上成長率、EBIT 率、税率、減価償却費の対売上比率、設備投資の対売上比率、運転資本増減の対売上増加額比率、永久成長率、WACC）を予測年度の横方向に並べます。どのブロックにも、セクションの見出し、予測年度（FY1、FY2 など）を示す列見出しの行、データ行が必要です。正確な並べ方は `<correct_patterns>` の「正しい前提テーブルの構造」を見てください。

**セクション 4: 過去実績と予測の財務数値**

**シナリオブロックから値を引いてくる集約列（「選択中のケース」など）を参照します。** 予測の行ごとに IF を散らさないでください。

```csv
Income Statement ($M),2020A,2021A,2022A,2023A,2024E,2025E,2026E
Revenue,XXX,XXX,XXX,XXX,[=E29*(1+$E$10)],[=F29*(1+$E$11)],[=G29*(1+$E$12)]
  % growth,XX%,XX%,XX%,XX%,[=E29/D29-1],[=F29/E29-1],[=G29/F29-1]
,,,,,,
Gross Profit,XXX,XXX,XXX,XXX,[=E29*E33],[=F29*F33],[=G29*G33]
  % margin,XX%,XX%,XX%,XX%,[=E33/E29],[=F33/F29],[=G33/G29]
,,,,,,
Operating Expenses:,,,,,,,
  S&M,XXX,XXX,XXX,XXX,[=E29*0.15],[=F29*0.14],[=G29*0.13]
  R&D,XXX,XXX,XXX,XXX,[=E29*0.12],[=F29*0.11],[=G29*0.10]
  G&A,XXX,XXX,XXX,XXX,[=E29*0.08],[=F29*0.07],[=G29*0.07]
  Total OpEx,XXX,XXX,XXX,XXX,[=E36+E37+E38],[=F36+F37+F38],[=G36+G37+G38]
,,,,,,
EBIT,XXX,XXX,XXX,XXX,[=E33-E39],[=F33-F39],[=G33-G39]
  % margin,XX%,XX%,XX%,XX%,[=E41/E29],[=F41/F29],[=G41/G29]
,,,,,,
Taxes,(XX),(XX),(XX),(XX),[=E41*$E$24],[=F41*$E$24],[=G41*$E$24]
  Tax rate,XX%,XX%,XX%,XX%,[=E43/E41],[=F43/F41],[=G43/G41]
,,,,,,
NOPAT,XXX,XXX,XXX,XXX,[=E41-E43],[=F41-F43],[=G41-G43]
```

**要となる数式の形**:
- 売上の成長: `=E29*(1+$E$10)`（$E$10 は 1 年目の成長率の集約列）
- こうはしません: `=E29*(1+IF($B$6=1,$B$10,IF($B$6=2,$C$10,$D$10)))`

このほうがすっきりしていて追いやすく、シナリオの処理が 1 か所に集まるので数式の誤りも防げます。

**セクション 5: FCF の組み立て**

**重要**: 参照している行が、正しい前提の行かどうか確かめます。数式を書いたら、その場で動作を確かめます。

```csv
Cash Flow ($M),2020A,2021A,2022A,2023A,2024E,2025E,2026E
NOPAT,XXX,XXX,XXX,XXX,[=E45],[=F45],[=G45]
(+) D&A,XXX,XXX,XXX,XXX,[=E29*$E$21],[=F29*$E$21],[=G29*$E$21]
    % of Rev,XX%,XX%,XX%,XX%,[=E58/E29],[=F58/F29],[=G58/G29]
(-) CapEx,(XX),(XX),(XX),(XX),[=E29*$E$22],[=F29*$E$22],[=G29*$E$22]
    % of Rev,XX%,XX%,XX%,XX%,[=E60/E29],[=F60/F29],[=G60/G29]
(-) Δ NWC,(XX),(XX),(XX),(XX),[=(E29-D29)*$E$23],[=(F29-E29)*$E$23],[=(G29-F29)*$E$23]
    % of Δ Rev,XX%,XX%,XX%,XX%,[=E62/(E29-D29)],[=F62/(F29-E29)],[=G62/(G29-F29)]
,,,,,,
Unlevered FCF,XXX,XXX,XXX,XXX,[=E57+E58-E60-E62],[=F57+F58-F60-F62],[=G57+G58-G60-G62]
```

**行の参照の例**（レイアウトを決めたあとの想定）:
- $E$21 = 減価償却費の比率の前提（集約列、21 行目）
- $E$22 = 設備投資の比率の前提（集約列、22 行目）
- $E$23 = 運転資本の比率の前提（集約列、23 行目）
- E29 = その年度の売上（29 行目）
- E45 = その年度の NOPAT（45 行目）

**数式を書く前に**: これらの行番号が実際のレイアウトと合っているか確かめます。まず 1 列で試してから、横にコピーします。

**セクション 6: 割引と評価**
```csv
DCF Valuation,2024E,2025E,2026E,2027E,2028E,Terminal
Unlevered FCF ($M),XXX,XXX,XXX,XXX,XXX,
Period,0.5,1.5,2.5,3.5,4.5,
Discount Factor,0.XX,0.XX,0.XX,0.XX,0.XX,
PV of FCF ($M),XXX,XXX,XXX,XXX,XXX,
,,,,,,
Terminal FCF ($M),,,,,,,XXX
Terminal Value ($M),,,,,,,XXX
PV Terminal Value ($M),,,,,,,XXX
,,,,,,
Valuation Summary ($M),,,,,,
Sum of PV FCFs,XXX,,,,,
PV Terminal Value,XXX,,,,,
Enterprise Value,XXX,,,,,
(-) Net Debt,(XX),,,,,
Equity Value,XXX,,,,,
,,,,,,
Shares Outstanding (M),XX.X,,,,,
IMPLIED PRICE PER SHARE,$XX.XX,,,,,
Current Stock Price,$XX.XX,,,,,
Implied Upside/(Downside),XX%,,,,,
```

### WACC シートの構成 {#wacc-sheet-structure}

```csv
COST OF EQUITY CALCULATION,,
Risk-Free Rate (10Y Treasury),X.XX%,[Yellow input]
Beta (5Y monthly),X.XX,[Yellow input]
Equity Risk Premium,X.XX%,[Yellow input]
Cost of Equity,X.XX%,[Calculated blue]
,,
COST OF DEBT CALCULATION,,
Credit Rating,AA-,[Yellow input]
Pre-Tax Cost of Debt,X.XX%,[Yellow input]
Tax Rate,XX.X%,[Link to DCF sheet]
After-Tax Cost of Debt,X.XX%,[Calculated blue]
,,
CAPITAL STRUCTURE,,
Current Stock Price,$XX.XX,[Link to DCF]
Shares Outstanding (M),XX.X,[Link to DCF]
Market Capitalization ($M),"X,XXX",[Calculated]
,,
Total Debt ($M),XXX,[Yellow input]
Cash & Equivalents ($M),XXX,[Yellow input]
Net Debt ($M),XXX,[Calculated]
,,
Enterprise Value ($M),"X,XXX",[Calculated]
,,
WACC CALCULATION,Weight,Cost,Contribution
Equity,XX.X%,X.X%,X.XX%
Debt,XX.X%,X.X%,X.XX%
,,
WEIGHTED AVERAGE COST OF CAPITAL,X.XX%,[Green output]
```

**WACC の主な計算式:**
```
Market Cap = Price × Shares
Net Debt = Total Debt - Cash
Enterprise Value = Market Cap + Net Debt
Equity Weight = Market Cap / EV
Debt Weight = Net Debt / EV
WACC = (Cost of Equity × Equity Weight) + (After-tax Cost of Debt × Debt Weight)
```

### 感応度分析（DCF シートの下部） {#sensitivity-analysis-bottom-of-dcf-sheet}

**言葉の確認**: ここでいう「感応度分析の表」は、行見出し・列見出しと、各データセルの数式からなる単純な 2 次元の表です。Excel の「データテーブル」機能（データ → What-If 分析 → データテーブル）ではありません。openpyxl でふつうの Excel の数式を各セルに書き込みます。

**置く場所**: DCF シートの 87 行目以降（別シートにはしません）

**感応度分析の表を 3 つ、縦に並べます:**

1. **WACC × 永久成長率**（87〜100 行目）- 5x5 の格子 = 数式の入った 25 セル
2. **売上成長率 × EBIT 率**（102〜115 行目）- 5x5 の格子 = 数式の入った 25 セル
3. **ベータ × 無リスク金利**（117〜130 行目）- 5x5 の格子 = 数式の入った 25 セル

**書く数式は合計 75 個です**（任意ではなく必須です）

**重要**: 感応度分析の表のセルは、openpyxl でプログラムから数式を書き込んで埋めます。線形近似の近道は使わないでください。仮置きの文言や、手作業を促す注記を残さないでください。「複雑だから」と言い訳して空欄のままにせず、Python のループで数式を作ってください。

**表の作り方:**
1. 行見出しと列見出し（試す前提の値）を置いて、表の骨組みを作ります
2. すべてのデータセルを、次のことをする数式で埋めます
   - 行見出しの値を使う（たとえば WACC = 9.0%）
   - 列見出しの値を使う（たとえば永久成長率 = 3.0%）
   - その前提で DCF を丸ごと計算し直す
   - その場合の理論株価を返す
3. 渡す時点で、すべてのセルに動く数式が入っている必要があります
4. 条件付き書式をあてます。値が高いほど緑寄り、低いほど赤寄りにします
5. ベースケースのセルを太字にします
6. 表と表のあいだは 1〜2 行あけます

**手作業は一切不要にします。** 使う人がファイルを開いた時点で、感応度分析の表がそのまま動かなければなりません。

## ケース選択の作り方 {#case-selector-implementation}

**3 つのケースで考えます:**

### 弱気ケース {#bear-case}
- 保守的な売上成長（過去の実績の下限あたり）
- 利益率は横ばいか悪化
- WACC は高め（リスクプレミアムの上乗せ）
- 永久成長率は低め
- 設備投資は多め

### 標準ケース {#base-case}
- コンセンサスか会社計画にもとづく売上成長
- 営業レバレッジによる緩やかな利益率の改善
- 足元の市場が織り込む WACC
- GDP に沿った永久成長率（2.5〜3.0%）
- 標準的な設備投資

### 強気ケース {#bull-case}
- 強気の売上成長（予測の上限あたり）
- 大幅な利益率の改善
- WACC は低め（リスクプレミアムの低下）
- 永久成長率は高め（3.5〜5.0%）
- 設備投資は軽め

**数式での実装:**

**入れ子の IF をあちこちに書かないでください。** 代わりに、INDEX か OFFSET の数式で該当するシナリオブロックから値を引いてくる集約列を作ります。

**推奨するパターン（INDEX を使う）:**
`=INDEX(B10:D10, 1, $B$6)` — `B10:D10` は弱気 / 標準 / 強気の値、`1` は行のオフセット、`$B$6` はケース選択のセル（1、2、3 のいずれか）です。

**そのうえで、すべての予測で集約列を参照します:**
`Revenue Year 1: =D29*(1+$E$10)` — $E$10 は 1 年目の成長率の集約列の値です。

こうするとシナリオの処理が 1 か所に集まり、モデルを追うのも直すのも楽になります。

## 成果物の構成 {#deliverables-structure}

**ファイル名**: `[Ticker]_DCF_Model_[Date].xlsx`

**シートは 2 つ**:
1. **DCF** - 弱気 / 標準 / 強気のケースを備えたモデル本体と、下部の 3 つの感応度分析の表（WACC × 永久成長率、売上成長率 × EBIT 率、ベータ × 無リスク金利）
2. **WACC** - 資本コストの計算

**主な要素**: ケース選択（1/2/3）、INDEX / OFFSET の数式による集約列、色分けしたセル、入力すべてに付いたセルのコメント、実務水準の罫線

## うまく進めるために {#best-practices}

### モデルの組み立て {#model-construction}
1. **少しずつ組み立てます**: 各セクションを仕上げてから次へ進みます
2. **組みながら確かめます**: 仮の数値を入れて数式を検証します
3. **形をそろえます**: 似た計算は似た書き方にします
4. **複雑な数式には注記を付けます**: 変わった計算には説明を残します
5. **チェックを組み込みます**: 必要な箇所に合計や整合のチェックを入れます

### 記録 {#documentation}
1. **前提をすべて記録します**: 主要な入力の根拠を説明します
2. **データの出典を書きます**: どの数値がどこから来たかを残します
3. **手法を説明します**: 標準的でないやり方は説明を添えます
4. **不確かなところに印を付けます**: 見通しの立ちにくい部分を明示します

### 品質の確認 {#quality-control}
1. **計算を突き合わせます**: 別のやり方でも計算して確かめます
2. **前提に負荷をかけます**: 感応度分析でモデルの頑健さを確かめます
3. **他の人に見てもらいます**: 数式を第三者にチェックしてもらいます
4. **版を残します**: 作業の進み具合に応じて別名保存します

## よくある応用 {#common-variations}

### 高成長のテクノロジー企業 {#high-growth-technology-companies}
- 予測期間を長めに（7〜10 年）
- 初期の成長率は高め（20〜30%）
- 時間をかけて利益率が大きく改善
- WACC は高め（12〜15%）
- 単位あたりの経済性（ユーザー数、ARPU など）を織り込みます

### 成熟・安定企業 {#maturestable-companies}
- 予測期間は短め（3〜5 年）
- 成長率は控えめ（GDP + 1〜3%）
- 利益率は安定
- WACC は低め（7〜9%）
- 現金の創出と資本配分に重きを置きます

### 景気に左右される企業 {#cyclical-companies}
- 景気の一巡を織り込んで組みます
- 利益率はサイクルの中位で正常化します
- 谷と山のシナリオも考えます
- 景気感応度に合わせてベータを調整します

### 複数事業を持つ企業 {#multi-segment-companies}
- 事業ごとに DCF を分けます
- 事業ごとに成長率と利益率を変えます
- 各事業の価値を足し合わせて評価します
- 相乗効果も考えます

## 困ったとき {#troubleshooting}

**エラーが出たり、結果がどうもおかしいときは、[TROUBLESHOOTING.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/finance\dcf-model/TROUBLESHOOTING.md) に詳しい切り分け方があります。**

## 作業の流れへの組み込み {#workflow-integration}

### DCF を組み始めるとき {#at-start-of-dcf-build}

1. **市場データを集めます**:
   - 足元の市場データを取れる MCP サーバーがあるか確かめます
   - 株価、ベータなどの市場データは Web の検索 / 取得で拾います
   - 特定のデータが要るなら、使う人に頼みます

2. **過去の財務数値を集めます**:
   - 使える MCP サーバー（Daloopa など）があるか確かめます
   - MCP で取れないなら、使う人に頼みます
   - 必要なら 10-K から手で拾います

3. **モデルを組み始めます**（この skill に書かれた DCF の進め方に従います）

### モデルを組んでいるあいだ {#during-model-construction}

1. **openpyxl で Excel モデルを組みます**（決め打ちの値ではなく数式で）
2. **数式の書き方と見た目は xlsx skill の作法に従います**
3. **塗りつぶしの色は、頼まれたときや、ブランドの指定があるときだけあてます**

### モデルを渡す前に（必須） {#before-delivering-model-mandatory}

1. **構成を確かめます**:
   - 弱気 / 標準 / 強気のシナリオブロックがあり、前提が予測年度に沿って並んでいる
   - ケース選択が動き、数式が正しいシナリオブロックを参照している
   - 感応度分析の表が DCF シートの下部にある（別シートではない）
   - フォント色: 入力は青、数式は黒、別シート参照は緑
   - 決め打ちの入力すべてにセルのコメントが付いている
   - 主要なセクションに実務水準の罫線が引かれている

2. **数式を再計算します**: `python recalc.py model.xlsx 30` を実行します

3. **出力を確かめます**:
   - `status` が `"success"` なら → 手順 4 へ進みます
   - `status` が `"errors_found"` なら → `error_summary` を見て、[TROUBLESHOOTING.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/finance\dcf-model/TROUBLESHOOTING.md) の切り分け方を読みます

4. **エラーを直して recalc.py を回し直します**（状態が "success" になるまで）

5. **数式を抜き取りで確かめます**:
   - FCF の数式を 1 つ試します。正しい前提の行を参照していますか
   - ケース選択を切り替えます。集約列がきちんと更新されますか
   - 売上の数式が、入れ子の IF ではなく集約列を参照しているか確かめます

6. **モデルを渡します**

### 使えるデータ源 {#available-data-sources}

- **MCP サーバー**: 設定されていれば（過去の財務数値なら Daloopa）
- **Web の検索 / 取得**: 足元の株価、ベータ、市場データ向け
- **使う人から渡されたデータ**: 過去の財務数値、コンセンサス予想
- **手作業での抽出**: 最後の手段として SEC EDGAR の開示資料

## 最終チェックリスト {#final-output-checklist}

DCF モデルを渡す前に確かめます。

**必須:**
- `python recalc.py model.xlsx 30` を、状態が "success"（数式エラーがゼロ）になるまで実行した
- シートは 2 つ: DCF（下部に感応度分析）、WACC
- フォント色: 青=入力、黒=数式、緑=別シート参照
- 決め打ちの入力すべてにセルのコメントが付いている
- 感応度分析の表が数式で埋まっている
- 主要なセクションに実務水準の罫線が引かれている

**検証:**
- 営業費用が売上基準になっている（売上総利益基準ではない）
- 継続価値が事業価値の 50〜70% に収まっている
- 永久成長率 &lt; WACC
- 税率が 21〜28%
- ファイル名が `[Ticker]_DCF_Model_[Date].xlsx` になっている

## データ源 — まず MCP、無ければ Web {#data-sources-mcp-first-web-fallback}

以下の記述の多くには「S&P Kensho MCP / Daloopa MCP / FactSet MCP を使う」とあります。これらは元になった Cowork プラグインの文脈にあった商用の財務データ MCP です。Hermes では次のようにします。

- **構造化された財務データの MCP が設定されているなら**（Hermes は MCP に対応しています。`native-mcp` skill を見てください）、ある時点の類似企業比較、過去の類似取引、開示資料はそちらを優先します。
- **無ければ**、次で代替します。
  - 米国の開示資料は SEC EDGAR（`https://www.sec.gov/cgi-bin/browse-edgar`）に対する `web_search` / `web_extract`
  - プレスリリースや決算資料は企業の IR ページ
  - 対話的なデータポータルには `browser_navigate`
  - 使う人から渡されたデータ（文脈に無いなら、はっきり尋ねます）
- **でっち上げは厳禁です。** 倍率、過去の取引、開示された数値の出どころを示せないなら、そのセルに `[UNSOURCED]` と印を付け、使う人に伝えてください。

## 出典 {#attribution}

この skill は、Anthropic の Claude for Financial Services プラグイン群（Apache-2.0）から移植したものです。Office-JS / Cowork による Excel の直接操作の経路は取り除いてあり、この版は `excel-author` skill の作法に沿ってヘッドレスの openpyxl を対象にしています。元となったもの: https://github.com/anthropics/financial-services
