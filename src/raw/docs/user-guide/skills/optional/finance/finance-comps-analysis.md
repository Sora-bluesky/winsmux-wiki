---
title: "Comps Analysis — Excel で類似企業比較の評価ブックを作る"
description: "Excel で類似企業比較の評価ブックを作る"
upstream_path: user-guide/skills/optional/finance/finance-comps-analysis.md
upstream_blob: 192f0f98e5e3e56c37041a209a247a1e5a7c6cec
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/finance/finance-comps-analysis
---

# Comps Analysis {#comps-analysis}

Excel で類似企業比較の評価ブックを作ります。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール型 — `hermes skills install official/finance/comps-analysis` で入れます |
| パス | `optional-skills/finance/comps-analysis` |
| バージョン | `1.0.0` |
| 作者 | Anthropic（Nous Research が移植） |
| ライセンス | Apache-2.0 |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `finance`, `valuation`, `comps`, `excel`, `openpyxl`, `modeling`, `investment-banking` |
| 関連 skill | [`excel-author`](/hermes/docs/user-guide/skills/optional/finance/finance-excel-author/), [`pptx-author`](/hermes/docs/user-guide/skills/optional/finance/finance-pptx-author/), [`dcf-model`](/hermes/docs/user-guide/skills/optional/finance/finance-dcf-model/), [`lbo-model`](/hermes/docs/user-guide/skills/optional/finance/finance-lbo-model/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が起動したときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として見ています。
:::

## 動作環境 {#environment}

この skill は **ヘッドレスの openpyxl** を前提にしています。つまり、ディスク上に .xlsx ファイルを書き出す形です。
セルの色づけ、数式、名前付き範囲、感度分析テーブルの書き方は `excel-author` skill の流儀に合わせてください。
納品前に再計算します: `python /path/to/excel-author/scripts/recalc.py ./out/model.xlsx`。

# 類似企業比較分析 {#comparable-company-analysis}

## ⚠️ 重要: データの取得先の優先順位（最初に読んでください） {#critical-data-source-priority-read-first}

**必ず次の順でデータの取得先を選んでください。**

1. **まず MCP のデータソースがあるか確認する** - S&P Kensho MCP、FactSet MCP、Daloopa MCP が使えるなら、財務情報と株価情報はそれらだけから取ります
2. 上記の MCP が使えるなら **Web 検索は使いません**
3. **MCP がどれも使えないときに限り**、Bloomberg ターミナル、SEC EDGAR の提出書類、その他の機関投資家向けの情報源を使います
4. **Web 検索を主たる情報源にしてはいけません** - 機関投資家水準の分析に必要な正確さ、来歴の追跡、信頼性が足りません

**なぜ大事か:** MCP の情報源は、出典表示付きで検証済みの機関投資家水準のデータを返します。Web 検索の結果は古かったり、不正確だったり、財務分析には頼りにならないことがあります。

---

## 概要 {#overview}
この skill は、事業の指標、評価倍率、統計的なベンチマークを組み合わせた、機関投資家水準の類似企業比較分析の作り方をエージェントに教えます。成果物は構造化された Excel／スプレッドシートで、同業他社との比較を通じて投資判断を助けます。

**参考資料と文脈づけ:**

類似企業比較分析の例は `examples/comps_example.xlsx` にあります。この skill ディレクトリにあるこうした例を使うときは、次のように賢く使ってください。

**例を使ってよい場面:**
- 構造の階層をつかむ（区画がどう流れているか）
- 求められる厳密さの水準をつかむ（統計の深さ、記録の丁寧さ）
- 原則を学ぶ（見出しの明快さ、数式の透明性、来歴の追跡）

**例を使ってはいけない場面:**
- 書式や指標をそのまま複製する
- 文脈を考えずにレイアウトを写す
- 読み手が誰であれ同じ見た目を当てはめる

**必ず先に自分に問いかけてください:**
1. **「決まった書式はありますか。それともテンプレートの形に寄せましょうか」**
2. **「読み手は誰ですか」**（投資委員会、取締役会向けの資料、手早く見る早見表、詳細なメモ）
3. **「中心にある問いは何ですか」**（バリュエーション、成長分析、競争上の立ち位置、効率）
4. **「どういう文脈ですか」**（M&A の検討、投資判断、業界のベンチマーク、実績のレビュー）

**個別の事情に合わせて調整する:**
- **業界の文脈**: 大型テック企業と新興 SaaS スタートアップでは、見るべき指標が違います
- **業界固有の要件**: 関係する指標は早めに足します（テックならクラウドの ARR、法人顧客数、開発者エコシステムなど）
- **その企業がどれだけ知られているか**: 有名企業なら背景説明は減らし、差分の分析に重心を置けます
- **判断の種類**: M&A と継続的なポートフォリオ監視では力点が違います

**中心にある考え方:** テンプレートの原則（明快な構造、統計的な厳密さ、透明な数式）は使いつつ、実行のしかたは文脈に応じて変えます。目指すのは機関投資家水準の分析であって、機関投資家っぽく見えるテンプレートではありません。

利用者が示した例や明示した好みは、常に既定より優先されます。

## 中心にある考え方 {#core-philosophy}
**「まず正しい構造を作る。物語はそのあとデータが語ってくれる」**

何が大事かを戦略的に考えざるを得ない見出しから始め、きれいなデータを入れ、透明な数式を組めば、統計は自然と立ち上がってきます。良い比較表は、作っていない人が開いた瞬間に読めるものです。

---

## ⚠️ 重要: べた書きではなく数式で + 一段階ずつの確認 {#critical-formulas-over-hardcodes-step-by-step-verification}

**べた書きではなく数式で:**
- 計算で出る値（マージン、倍率、統計量）は、入力セルを参照する Excel の数式にします。計算済みの数値を貼り付けてはいけません
- Python/openpyxl でシートを組むときは `cell.value = "=E7/C7"`（数式の文字列）と書きます。`cell.value = 0.687`（計算結果）ではありません
- べた書きしてよいのは生の入力データ（売上高、EBITDA、株価など）だけで、そのひとつひとつに出所を書いたセルのコメントを付けます
- 理由: 入力が変わればモデルは自動で更新されなければなりません。べた書きのマージンは、いつ牙をむくかわからないバグです

**利用者と一緒に、一段階ずつ確かめる:**
- 構造を組んだら → データを入れる前に、見出しのレイアウトを見せます
- 生の入力を入れたら → 入力のブロックを見せ、出所と期間を確認してから数式に進みます
- 事業指標の数式を組んだら → 計算されたマージンを見せ、妥当かどうか一緒に確かめてからバリュエーションに移ります
- 評価倍率を組んだら → 倍率を見せ、無理のない値か確認してから統計を足します
- シートを最後まで一気に組んで見せるのはやめてください。区画ごとに確認して、誤りを早く拾います

---

## セクション1: 資料の構造と初期設定 {#section-1-document-structure-setup}

### ヘッダーのブロック（1〜3行目） {#header-block-rows-1-3}
```
Row 1: [ANALYSIS TITLE] - COMPARABLE COMPANY ANALYSIS
Row 2: [List of Companies with Tickers] • [Company 1 (TICK1)] • [Company 2 (TICK2)] • [Company 3 (TICK3)]
Row 3: As of [Period] | All figures in [USD Millions/Billions] except per-share amounts and ratios
```

**なぜ大事か:** 開いた瞬間に文脈が伝わります。何を見ているのか、いつ作られたのか、数字をどう読めばいいのかが誰にでもわかります。

### 見た目の決めごと（任意 — 利用者の好みや持ち込みのテンプレートが常に優先します） {#visual-convention-standards-optional---user-preferences-and-uploaded-templates-always-override}

**重要: これらはあくまで既定の提案です。常に次の順で優先してください。**
1. 利用者が明示した書式の好み
2. 持ち込まれたテンプレートファイルの書式
3. 会社・チームのスタイルガイド
4. ここに書いた既定（他に手がかりがない場合だけ）

**フォントと文字組みの提案:**
- **フォント**: Times New Roman（読みやすく、業界で広く使われています）
- **文字サイズ**: データセルは 11pt、見出しは 12pt
- **太字**: 区画見出し、企業名、統計量のラベル

**既定の色と網掛け — 青とグレーの落ち着いた配色（少ないほど良い）:**
- **抑えること** — 青とグレーだけにします。緑・オレンジ・赤や複数のアクセント色は入れません。整った比較表は全部で3〜4色です
- **区画見出し**（「OPERATING STATISTICS & FINANCIAL METRICS」など）:
  - 濃い青の背景（`#1F4E79` または `#17365D` のネイビー）
  - 白の太字
  - 全列にわたって行ごと塗ります
- **列見出し**（「Company」「Revenue」「Margin」など）:
  - 淡い青の背景（`#D9E1F2` かそれに近い薄い青）
  - 黒の太字
  - 中央そろえ
- **データ行**:
  - 企業データの背景は白
  - 数式は黒の文字、べた書きの入力は青の文字
- **統計の行**（Maximum、75th Percentile など）:
  - 淡いグレーの背景（`#F2F2F2`）
  - 黒の文字、ラベルは左そろえ
- **配色はこれで全部です**: 濃い青 + 淡い青 + 淡いグレー + 白。利用者のテンプレートに別の指定がなければ、他の色は使いません

**書式の決めごとの提案:**
- **小数点の桁数**:
  - パーセント: 小数1桁（12.3%）
  - 倍率: 小数1桁（13.5x）
  - 金額: 小数なし、桁区切りあり（69,632）
  - パーセント表示のマージン: 小数1桁（68.7%）
- **罫線**: なし（すっきりした見た目にします）
- **そろえ方**: 指標はすべて中央そろえにして、見た目を統一します
- **セルの寸法**: 列幅はすべて同じに、行の高さもそろえます（整った見た目のグリッドになります）

**補足:** 利用者がテンプレートファイルを渡してきた場合や、別の書式を指定した場合は、そちらに従ってください。

---

## セクション2: 事業指標と財務指標 {#section-2-operating-statistics-financial-metrics}

### 中心となる列（まずはここから） {#core-columns-start-with-these}
1. **Company** - 表記をそろえた企業名
2. **Revenue** - 規模の指標（文脈に応じて LTM でも四半期でも通期でもかまいません）
3. **Revenue Growth** - 前年同期比の変化率
4. **Gross Profit** - 売上高から売上原価を引いたもの
5. **Gross Margin** - 売上総利益 / 売上高（収益性の土台）
6. **EBITDA** - 利払い前・税引前・減価償却前の利益
7. **EBITDA Margin** - EBITDA / 売上高（本業の効率）

### 追加してもよい列（業界や目的に応じて選びます） {#optional-additions-choose-based-on-industrypurpose}
- **Quarterly vs LTM** - 季節性が効くなら両方入れます
- **Free Cash Flow** - 設備投資の重い事業や SaaS 向け
- **FCF Margin** - フリーキャッシュフロー / 売上高（現金を生む効率）
- **Net Income** - 成熟して利益の出ている企業向け
- **Operating Income** - D&A のばらつきが大きい事業向け
- **CapEx metrics** - 資産の重い業界向け
- **Rule of 40** - SaaS 専用（成長率 % + マージン %）
- **FCF Conversion** - 利益の質を見る分析向け（上級）

### 数式の例（7行目を例にしています） {#formula-examples-using-row-7-as-example}
```excel
// Core ratios - these are always calculated
Gross Margin (F7): =E7/C7
EBITDA Margin (H7): =G7/C7

// Optional ratios - include if relevant
FCF Margin: =[FCF]/[Revenue]
Net Margin: =[Net Income]/[Revenue]
Rule of 40: =[Growth %]+[FCF Margin %]
```

**鉄則:** どの比率も [なにか] / [売上高] か [なにか] / [このシート上のなにか] の形にします。単純に保ってください。

### 統計のブロック（企業データの下） {#statistics-block-after-company-data}

**重要: 比較できる指標（比率、マージン、成長率、倍率）にはすべて統計の数式を足してください。**

```
[Leave one blank row for visual separation]
- Maximum: =MAX(B7:B9)
- 75th Percentile: =QUARTILE(B7:B9,3)
- Median: =MEDIAN(B7:B9)
- 25th Percentile: =QUARTILE(B7:B9,1)
- Minimum: =MIN(B7:B9)
```

**統計が必要な列（比較できる指標）:**
- 売上高成長率 %、売上総利益率 %、EBITDA マージン %、EPS
- EV/Revenue、EV/EBITDA、P/E、配当利回り %、ベータ

**統計が要らない列（規模の指標）:**
- 売上高、EBITDA、純利益（実額は企業の規模でばらつきます）
- 時価総額、企業価値（規模の違う企業のあいだでは比べられません）

**補足:** 企業データと統計の行のあいだには、空行を1行だけ入れて視覚的に区切ります。「SECTOR STATISTICS」や「VALUATION STATISTICS」といった見出し行は足さないでください。

**四分位が効く理由:** 平均だけでなく分布が見えます。75パーセンタイルの倍率は、「プレミアムが乗った」企業がどのあたりで取引されているかを教えてくれます。

---

## セクション3: 評価倍率と投資指標 {#section-3-valuation-multiples-investment-metrics}

### 中心となる評価の列（まずはここから） {#core-valuation-columns-start-with-these}
1. **Company** - 事業指標の区画と同じ並び順
2. **Market Cap** - 現在の時価総額
3. **Enterprise Value** - 時価総額 ± 純有利子負債／純現金
4. **EV/Revenue** - 売上1ドルあたり市場がいくら払っているか
5. **EV/EBITDA** - 利益1ドルあたり市場がいくら払っているか
6. **P/E Ratio** - 純利益に対する株価の水準

### 追加してもよい評価指標（文脈に応じて選びます） {#optional-valuation-metrics-choose-based-on-context}
- **FCF Yield** - フリーキャッシュフロー / 時価総額（現金に着目する分析向け）
- **PEG Ratio** - PER / 成長率（成長企業向け）
- **Price/Book** - 時価と簿価の比較（資産の重い事業向け）
- **ROE/ROA** - リターンの指標（収益性の比較向け）
- **Revenue/EBITDA CAGR** - 過去の成長率（トレンド分析向け）
- **Asset Turnover** - 売上高 / 総資産（事業効率向け）
- **Debt/Equity** - レバレッジ（資本構成の分析向け）

**大事な原則:** その業界で意味のある中心的な倍率を3〜5個入れます。出せるからといって、あらゆる指標を並べないでください。

### 数式の例 {#formula-examples}
```excel
// Core multiples - always include these
EV/Revenue: =[Enterprise Value]/[LTM Revenue]
EV/EBITDA: =[Enterprise Value]/[LTM EBITDA]
P/E Ratio: =[Market Cap]/[Net Income]

// Optional multiples - include if data available
FCF Yield: =[LTM FCF]/[Market Cap]
PEG Ratio: =[P/E]/[Growth Rate %]
```

### 相互参照のルール {#cross-reference-rule}
**重要:** 評価倍率は必ず事業指標の区画を参照します。同じ生データを二度入力してはいけません。売上高が C7 にあるなら、EV/Revenue の数式は C7 を参照します。

### 統計のブロック {#statistics-block}
事業指標の区画と同じ構成です。すべての指標について Max、75th、Median、25th、Min を置きます。企業データと統計の行のあいだには空行を1行入れて区切ります。「VALUATION STATISTICS」という見出し行は足さないでください。

---

## セクション4: 注記と手法の記録 {#section-4-notes-methodology-documentation}

### 必ず入れる要素 {#required-components}

**データの出所と品質:**
- データはどこから来たか（S&P Kensho MCP、FactSet MCP、Daloopa MCP、Bloomberg、SEC 提出書類）
- どの期間を対象にしているか（2024年第4四半期、監査済みの数値）
- どう検証したか（10-K/10-Q と突き合わせた）
- 補足: 精度と来歴の追跡のため、使えるなら MCP のデータソース（S&P Kensho、FactSet、Daloopa）を優先します

**用語の定義:**
- EBITDA の計算方法（売上総利益 + D&A か、営業利益 + D&A か）
- フリーキャッシュフローの式（営業CF - 設備投資）
- 特殊な指標の説明（Rule of 40、FCF Conversion）
- 期間の定義（LTM、CAGR の計算期間）

**バリュエーションの手法:**
- 企業価値をどう計算したか（時価総額 + 純有利子負債）
- どの成長率を使ったか（過去の CAGR、将来の見込み）
- 何か調整したか（一時的な項目の除外、マージンの正常化）

**分析の枠組み:**
- 投資の仮説は何か（クラウド／SaaS の効率）
- いちばん重要な指標はどれか（現金の創出、資本効率）
- 統計をどう読めばいいか（四分位が文脈を与えます）

---

## セクション5: 指標の選び方（判断の枠組み） {#section-5-choosing-the-right-metrics-decision-framework}

### まず「自分はどの問いに答えようとしているのか」から始めます {#start-with-what-question-am-i-answering}

**「どの企業が割安か」**
→ 重視する: EV/Revenue、EV/EBITDA、P/E、時価総額
→ 省く: 細かい事業指標、成長の指標

**「どの企業がいちばん効率的か」**
→ 重視する: 売上総利益率、EBITDA マージン、FCF マージン、総資産回転率
→ 省く: 規模の指標、実額

**「どの企業がいちばん速く伸びているか」**
→ 重視する: 売上高成長率 %、EBITDA の CAGR、ユーザー／顧客数の伸び
→ 省く: マージンの指標、レバレッジの比率

**「いちばん現金を生んでいるのはどこか」**
→ 重視する: フリーキャッシュフロー、FCF マージン、FCF Conversion、設備投資の重さ
→ 省く: EBITDA、PER

### 業界ごとの指標の選び方 {#industry-specific-metric-selection}

**ソフトウェア/SaaS:**
必須: 売上高成長率、売上総利益率、Rule of 40
任意: ARR、ネットレベニューリテンション、CAC 回収期間
省く: 総資産回転率、棚卸資産の指標

**製造業/資本財:**
必須: EBITDA マージン、総資産回転率、設備投資 / 売上高
任意: ROA、棚卸資産回転率、受注残
省く: Rule of 40、SaaS 向けの指標

**金融:**
必須: ROE、ROA、経費率、P/E
任意: 純金利マージン、貸倒引当金
省く: 売上総利益率、EBITDA（銀行では意味を持ちません）

**小売/EC:**
必須: 売上高成長率、売上総利益率、棚卸資産回転率
任意: 既存店売上高、顧客獲得コスト
省く: 研究開発や設備投資の重い指標

### 「5-10 の目安」 {#the-5-10-rule}

**事業指標を5つ** - 売上高、成長率、マージンや効率の指標を2〜3個
**評価指標を5つ** - 時価総額、企業価値、倍率を3個
**= 合計10列** - 話を伝えるには十分で、筋を見失うほど多くはありません

指標が15個を超えているなら、たぶん雑音が混じっています。容赦なく削ってください。

---

## セクション6: 良い進め方と品質チェック {#section-6-best-practices-quality-checks}

### 始める前に {#before-you-start}
1. **比較対象を決める** - 本当に比較できる企業だけを選びます（事業モデル、規模、地域が近いこと）
2. **期間を選ぶ** - LTM は季節性をならし、四半期は流れを見せます
3. **単位を先に決める** - 百万か十億かで、その後すべてが変わります
4. **データの出所を整理する** - どの数字がどこから来たかを把握します

### 組み立てながら {#as-you-build}
1. **まず生データを全部入れる** - 数式を書く前に、青い文字の部分を埋め切ります
2. **べた書きした入力セルには必ずコメントを付ける** - セルを右クリック → コメントの挿入 で、出所か前提を記録します

   **出所のあるデータは、どこから来たかを正確に書きます:**
   - 例: 「Bloomberg Terminal - MSFT Equity DES、2024-10-02 取得」
   - 例: 「2024年第4四半期 10-K、42ページ、項目 'Total Revenue'」
   - 例: 「FactSet コンセンサス予想、2024-10-02 時点」
   - **可能ならリンクも付けます**: セルを右クリック → リンク で、SEC 提出書類やデータ提供元、レポートの URL を貼ります

   **前提の場合は、その理由を書きます:**
   - 例: 「同業他社の中央値をもとに EBITDA マージンを 15% と仮定。会社は開示していない」
   - 例: 「企業価値を 時価総額 + 純有利子負債 5,000万ドル と推定（第3四半期の貸借対照表より。第4四半期は未公表）」
   - 例: 「予想 PER は市場コンセンサスの EPS 3.45ドル（アナリスト12名の平均）に基づく」

   **なぜ大事か**: 来歴をたどれるようにし、データを検証でき、前提が見え、あとから更新しやすくなります
3. **数式は1行ずつ組む** - 次に進む前に、各計算を確かめます
4. **見出しには絶対参照を使う** - $C$6 で見出し行を固定します
5. **書式をそろえる** - パーセントは小数ではなくパーセントとして表示します
6. **条件付き書式を足す** - 外れ値が自動で目立つようにします

### 妥当性のチェック {#sanity-checks}
- **マージンの検算**: 売上総利益率 > EBITDA マージン > 純利益率（定義上、常にこうなります）
- **倍率が無理のない水準か**: 
  - EV/Revenue: おおむね 0.5〜20x（業界によって大きく振れます）
  - EV/EBITDA: おおむね 8〜25x（業界をまたいでも比較的そろいます）
  - P/E: おおむね 10〜50x（成長率によります）
- **成長率と倍率の関係**: 成長が速いほど倍率も高いのがふつうです
- **規模と効率の関係**: 規模の大きい企業ほどマージンが良い傾向があります（規模の経済）

### やりがちな失敗 {#common-mistakes-to-avoid}
❌ 数式のなかで時価総額と企業価値を混ぜる
❌ 分子と分母で期間が違う（LTM と四半期の混在）
❌ セル参照ではなく数値を数式にべた書きする
❌ **べた書きの入力に、出所を示すか前提を説明するセルのコメントが付いていない**
❌ SEC 提出書類やデータ元へのリンクを付けられるのに付けていない
❌ 目的のはっきりしない指標を詰め込みすぎる
❌ 比較にならない企業（事業モデルが違う）を混ぜる
❌ 古いデータを、古いと断らずに使う
❌ パーセントの平均を誤った方法で出す（中央値を使うべきです）

---

## セクション6: 進んだ使い方 {#section-6-advanced-features}

### 中身がわかる見出し {#dynamic-headers}
計算値を載せる列では、単位がわかるラベルを付けます。
```
Revenue Growth (YoY) % | EBITDA Margin | FCF Margin | Rule of 40
```

### 四分位分析の利点 {#quartile-analysis-benefits}
平均や中央値だけでなく、四分位を見るとこうしたことがわかります。
- **75パーセンタイル** = 「プレミアム」企業がここで取引されている
- **中央値** = 市場のふつうの評価
- **25パーセンタイル** = 「ディスカウント」の領域

これで「対象企業は同業他社に比べて割高か割安か」に答えられます。

### 業界ごとの調整 {#industry-specific-modifications}

**ソフトウェア/SaaS:**
- 足す: ARR、ネットレベニューリテンション、CAC 回収期間
- 重視する: Rule of 40、FCF マージン、70% を超える売上総利益率

**ヘルスケア:**
- 足す: 研究開発費 / 売上高、パイプラインの価値、規制の状況
- 重視する: EBITDA マージン、成長率、償還のリスク

**資本財:**
- 足す: 受注残、受注の動向、地域構成
- 重視する: ROIC、総資産回転率、景気循環の調整

**消費財:**
- 足す: 既存店売上高、顧客獲得コスト、ブランド価値
- 重視する: 売上高成長率、売上総利益率、棚卸資産回転率

---

## セクション7: 進め方と実務のコツ {#section-7-workflow-practical-tips}

### 手順 {#step-by-step-process}
1. **構造を組む**（30分）
   - 見出しをすべて作ります
   - セルの書式を整えます（入力は青、数式は黒）
   - 単位と日付の基準を固定します

2. **データを集める**（60〜90分）
   - 一次情報から取ります（使えるなら S&P Kensho MCP、FactSet MCP、Daloopa MCP。なければ Bloomberg、SEC）
   - 生の数値をすべて青い文字で入れます
   - 出所を注記の区画に記録します

3. **数式を組む**（30分）
   - 単純な比率（マージン）から始めます
   - 倍率（EV/Revenue）へ進みます
   - 検算を足します（マージンは筋が通っているか）

4. **統計を足す**（15分）
   - 数式の形をすべての列にコピーします
   - 範囲が正しいか確かめます（B7:B10 ではなく B7:B9）
   - 四分位のロジックを確認します

5. **品質管理**（30分）
   - 妥当性のチェックを走らせます
   - 数式の参照を確かめます
   - #DIV/0! や #REF! のエラーがないか確認します
   - 既知のベンチマークと突き合わせます

6. **記録**（15分）
   - 注記の区画を仕上げます
   - データの出所を書きます
   - 手法を定義します
   - 分析の日付を入れます

### 実務のコツ {#pro-tips}
- **テンプレートを残す**: 一度作れば、あとはずっと使えます
- **外れ値を色分けする**: 標準偏差2つ分を超える値に条件付き書式を当てます
- **元のファイルにリンクする**: Bloomberg のスクリーンショットや SEC 提出書類へリンクを張ります
- **版を管理する**: 「Comps_v1_2024-12-15」のように日付を入れて保存します
- **他の人に見てもらう**: 数式は誰かにチェックしてもらいます

### Excel の書式チェックリスト（任意 — 利用者の好みに合わせて調整します） {#excel-formatting-checklist-optional---adapt-to-user-preferences}
- [ ] フォントを利用者の好みに設定した（既定: Times New Roman、データ 11pt、見出し 12pt）
- [ ] 区画見出しを利用者のテンプレートに合わせた（既定: 濃い青 #17365D に白の太字）
- [ ] 列見出しを利用者のテンプレートに合わせた（既定: 淡い青／グレー #D9E2F3 に黒の太字）
- [ ] 統計の行を利用者のテンプレートに合わせた（既定: 淡いグレー #F2F2F2）
- [ ] 罫線を使っていない（すっきりした見た目）
- [ ] **列幅をすべて同じにした**（整った見た目になります）
- [ ] **行の高さをそろえた**（データ行はおおむね 20〜25pt）
- [ ] 数値の小数桁と桁区切りを正しく設定した
- [ ] **指標をすべて中央そろえにした**
- [ ] **企業データと統計の行のあいだに空行を1行入れた**
- [ ] **「SECTOR STATISTICS」「VALUATION STATISTICS」の見出し行を別に作っていない**
- [ ] **べた書きの入力セルすべてに、(1) 正確な出所か (2) 前提の説明のどちらかのコメントを付けた**
- [ ] **該当するセルにリンクを付けた**（SEC EDGAR の提出書類、データ提供元のページ、レポート）

---

## セクション8: テンプレートのレイアウト例 {#section-8-example-template-layout}

**シンプルな版（まずはここから）:**
<!-- ascii-guard-ignore -->
```
┌─────────────────────────────────────────────────────────────┐
│ TECHNOLOGY - COMPARABLE COMPANY ANALYSIS                    │
│ Microsoft • Alphabet • Amazon                               │
│ As of Q4 2024 | All figures in USD Millions                │
├─────────────────────────────────────────────────────────────┤
│ OPERATING METRICS                                           │
├──────────┬─────────┬─────────┬──────────┬──────────────────┤
│ Company  │ Revenue │ Growth  │ Gross    │ EBITDA  │ EBITDA │
│          │ (LTM)   │ (YoY)   │ Margin   │ (LTM)   │ Margin │
├──────────┼─────────┼─────────┼──────────┼─────────┼────────┤
│ MSFT     │ 261,400 │ 12.3%   │ 68.7%    │ 205,100 │ 78.4%  │
│ GOOGL    │ 349,800 │ 11.8%   │ 57.9%    │ 239,300 │ 68.4%  │
│ AMZN     │ 638,100 │ 10.5%   │ 47.3%    │ 152,600 │ 23.9%  │
│          │         │         │          │         │        │ [blank row]
│ Median   │ =MEDIAN │ =MEDIAN │ =MEDIAN  │ =MEDIAN │=MEDIAN │
│ 75th %   │ =QUART  │ =QUART  │ =QUART   │ =QUART  │=QUART  │
│ 25th %   │ =QUART  │ =QUART  │ =QUART   │ =QUART  │=QUART  │
├─────────────────────────────────────────────────────────────┤
│ VALUATION MULTIPLES                                         │
├──────────┬──────────┬──────────┬──────────┬────────────────┤
│ Company  │ Mkt Cap  │ EV       │ EV/Rev   │ EV/EBITDA │ P/E│
├──────────┼──────────┼──────────┼──────────┼───────────┼────┤
│ MSFT     │3,550,000 │3,530,000 │ 13.5x    │ 17.2x     │36.0│
│ GOOGL    │2,030,000 │1,960,000 │  5.6x    │  8.2x     │24.5│
│ AMZN     │2,226,000 │2,320,000 │  3.6x    │ 15.2x     │58.3│
│          │          │          │          │           │    │ [blank row]
│ Median   │ =MEDIAN  │ =MEDIAN  │ =MEDIAN  │ =MEDIAN   │=MED│
│ 75th %   │ =QUART   │ =QUART   │ =QUART   │ =QUART    │=QRT│
│ 25th %   │ =QUART   │ =QUART   │ =QUART   │ =QUART    │=QRT│
└──────────┴──────────┴──────────┴──────────┴───────────┴────┘
```
<!-- ascii-guard-ignore-end -->

**複雑にするのは必要になってからです:**
- 季節性が効くなら四半期と LTM の両方を入れます
- 現金の創出が話の中心なら FCF の指標を足します
- 業界固有の指標を入れます（SaaS の Rule of 40 など）
- 対象企業が5社を超えるなら統計の行を増やします

---

## セクション9: 業界ごとの追加項目（任意） {#section-9-industry-specific-additions-optional}

分析にどうしても必要なときだけ足してください。たいていの比較表は中心的な指標だけで十分に成立します。

**ソフトウェア/SaaS:**
関係があれば足す: ARR、ネットレベニューリテンション、Rule of 40

**金融:**
関係があれば足す: ROE、純金利マージン、経費率

**EC:**
関係があれば足す: 流通総額、テイクレート、購入者数

**ヘルスケア:**
関係があれば足す: 研究開発費 / 売上高、パイプラインの価値、特許の期限

**製造業:**
関係があれば足す: 総資産回転率、棚卸資産回転率、受注残

---

## セクション10: 危険信号 {#section-10-red-flags-warning-signs}

### データの品質の問題 {#data-quality-issues}
🚩 期間がそろっていない（四半期と通期の混在）  
🚩 説明のないデータの欠落  
🚩 情報源によって数字が大きく違う（10% 超のずれ）

### バリュエーションの危険信号 {#valuation-red-flags}
🚩 EBITDA が赤字の企業を EBITDA 倍率で評価している（売上高倍率を使ってください）  
🚩 超高成長の裏づけがないのに PER が 100x を超えている  
🚩 その業界としては筋の通らないマージン

### 比較可能性の問題 {#comparability-issues}
🚩 決算期がばらばら（時期のずれが問題になります）  
🚩ixing pure-play and conglomerates  
🚩 事業モデルが大きく違うのに「比較対象」と呼んでいる

**迷ったらその企業は外してください。** 怪しい比較対象6社より、確かな3社のほうが良い結果になります。

---

## セクション11: 数式の早見表 {#section-11-formulas-reference-guide}

### よく使う Excel の関数 {#essential-excel-formulas}
```excel
// Statistical Functions
=AVERAGE(range)          // Simple mean
=MEDIAN(range)           // Middle value
=QUARTILE(range, 1)      // 25th percentile
=QUARTILE(range, 3)      // 75th percentile
=MAX(range)              // Maximum value
=MIN(range)              // Minimum value
=STDEV.P(range)          // Standard deviation

// Financial Calculations
=B7/C7                   // Simple ratio (Margin)
=SUM(B7:B9)/3            // Average of multiple companies
=IF(B7>0, C7/B7, "N/A")  // Conditional calculation
=IFERROR(C7/D7, 0)       // Handle divide by zero

// Cross-Sheet References
='Sheet1'!B7             // Reference another sheet
=VLOOKUP(A7, Table1, 2)  // Lookup from data table
=INDEX(MATCH())          // Advanced lookup

// Formatting
=TEXT(B7, "0.0%")        // Format as percentage
=TEXT(C7, "#,##0")       // Thousands separator
```

### よく使う比率の式 {#common-ratio-formulas}
```excel
Gross Margin = Gross Profit / Revenue
EBITDA Margin = EBITDA / Revenue
FCF Margin = Free Cash Flow / Revenue
FCF Conversion = FCF / Operating Cash Flow
ROE = Net Income / Shareholders' Equity
ROA = Net Income / Total Assets
Asset Turnover = Revenue / Total Assets
Debt/Equity = Total Debt / Shareholders' Equity
```

---

## 大事な原則のまとめ {#key-principles-summary}

1. **構造が洞察を生む** - 正しい見出しが正しい思考を導きます
2. **少ないほど良い** - 意味のある指標5〜10個は、意味のない20個に勝ります
3. **問いに合わせて指標を選ぶ** - バリュエーションの分析と効率の分析は別ものです
4. **統計はパターンを見せる** - 中央値と四分位は平均より多くを語ります
5. **複雑さより透明さ** - 誰にでもわかる単純な数式にします
6. **比較可能性がすべて** - 無理に比較対象にするくらいなら外します
7. **選んだ理由を残す** - どの指標をなぜ選んだかを注記の区画に書きます

---

## 仕上げのチェックリスト {#output-checklist}

比較分析を渡す前に、次を確認します。
- [ ] すべての企業が本当に比較できる相手である
- [ ] データの期間がそろっている
- [ ] 単位がはっきり書かれている（百万／十億）
- [ ] 数式がセルを参照していて、数値のべた書きがない
- [ ] **べた書きの入力セルすべてに、(1) 出典付きの正確な出所か (2) 説明付きの明確な前提のどちらかのコメントがある**
- [ ] **該当箇所にリンクを付けた**（SEC EDGAR の提出書類、Bloomberg のページ、調査レポート）
- [ ] 統計が5つの指標を含んでいる（Max、75th、Med、25th、Min）
- [ ] 注記の区画に出所と手法が書かれている
- [ ] 見た目が決めごとに沿っている（青 = 入力、黒 = 数式）
- [ ] 妥当性のチェックが通っている（マージンが筋の通った並び、倍率が無理のない水準）
- [ ] 日付が最新である（「As of [Date]」）
- [ ] 数式の監査でエラーが出ていない（#DIV/0!、#REF!、#N/A）

---

## 次に活かす {#continuous-improvement}

比較分析を終えたら、次を振り返ってください。
1. 統計から思いがけない発見はあったか
2. 分析を狭めてしまうデータの欠落はなかったか
3. 入れていない指標を関係者から求められなかったか
4. 実際にかかった時間と、本来かかるべき時間はどうだったか
5. 次はどうすればもっと役に立つものになるか

良い比較分析は、回を重ねるごとに育ちます。テンプレートを残し、もらった意見から学び、意思決定者が実際に使うものに合わせて構造を磨いてください。

## データの取得先 — まず MCP、なければ Web {#data-sources-mcp-first-web-fallback}

以下の記述には「S&P Kensho MCP / Daloopa MCP / FactSet MCP を使う」という箇所が多く出てきます。これらは元の Cowork プラグインの文脈にあった商用の金融データ MCP です。Hermes では次のように扱ってください。

- **構造化された金融データの MCP を設定してあるなら**（Hermes は MCP に対応しています。`native-mcp` skill を参照）、時点比較、過去の取引事例、提出書類の取得にはそちらを優先します。
- **そうでなければ**、次の順で代替します。
  - 米国の提出書類は `web_search` / `web_extract` で SEC EDGAR（`https://www.sec.gov/cgi-bin/browse-edgar`）を当たります
  - プレスリリースや決算資料は企業の IR ページを見ます
  - 対話型のデータポータルには `browser_navigate` を使います
  - 利用者から提供されたデータを使います（文脈にない場合は、はっきり尋ねてください）
- **決して作り話をしないでください**。倍率、過去事例、提出書類の数値の出所を示せないときは、そのセルを `[UNSOURCED]` と印を付けて利用者に伝えます。

## 出典 {#attribution}

この skill は Anthropic の Claude for Financial Services プラグイン群（Apache-2.0）を移植したものです。Office-JS / Cowork の Excel 直接操作の経路は取り除いてあり、この版は `excel-author` skill の流儀に沿ってヘッドレスの openpyxl を対象にしています。元の実装: https://github.com/anthropics/financial-services
