---
title: "Excel Author — openpyxl でヘッドレスに監査できる財務ワークブックを作る"
description: "openpyxl でヘッドレスに監査できる財務ワークブックを作る"
upstream_path: user-guide/skills/optional/finance/finance-excel-author.md
upstream_blob: 732080ee06dd39cb5216279acfef204cda6b7ab5
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/finance/finance-excel-author
---

# Excel Author {#excel-author}

openpyxl でヘッドレスに、監査できる財務ワークブックを作ります。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール型 — `hermes skills install official/finance/excel-author` で入れます |
| パス | `optional-skills/finance/excel-author` |
| バージョン | `1.0.0` |
| 作者 | Anthropic（Nous Research が移植） |
| ライセンス | Apache-2.0 |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `excel`, `openpyxl`, `finance`, `spreadsheet`, `modeling` |
| 関連 skill | [`xlsx`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-xlsx/), [`pptx-author`](/hermes/docs/user-guide/skills/optional/finance/finance-pptx-author/), [`dcf-model`](/hermes/docs/user-guide/skills/optional/finance/finance-dcf-model/), [`comps-analysis`](/hermes/docs/user-guide/skills/optional/finance/finance-comps-analysis/), [`lbo-model`](/hermes/docs/user-guide/skills/optional/finance/finance-lbo-model/), [`3-statement-model`](/hermes/docs/user-guide/skills/optional/finance/finance-3-statement-model/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# excel-author {#excel-author}

`openpyxl` を使って .xlsx ファイルをディスク上に作ります。以下の投資銀行水準の作法に従うと、作った本人以外でも中身を追え、前提を差し替えられ、レビューできるモデルになります。

[anthropics/financial-services](https://github.com/anthropics/financial-services) リポジトリにある Anthropic の `xlsx-author` と `audit-xls` の skill を移植したものです。元の skill にあった MCP / Office-JS / Cowork 向けの分岐は落としてあり、この skill はヘッドレスの Python だけを前提にしています。

## 出力の約束ごと {#output-contract}

- 書き出し先は `./out/<name>.xlsx` です。`./out/` が無ければ作ります。
- 後続のツールが拾えるように、最後のメッセージで相対パスを返します。
- 1 ファイルにつきモデルは 1 つです。明示的に頼まれない限り、既存のワークブックに追記しません。

## 準備 {#setup}

```bash
pip install "openpyxl>=3.0"
```

## 中心となる作法（ここは譲れません） {#core-conventions-non-negotiable}

### 青 / 黒 / 緑でセルを塗り分ける {#blue-black-green-cell-color}
- **青**（`Font(color="0000FF")`）— 人が手で入れた値です。売上のドライバー、WACC の入力、永久成長率、市場データなど。
- **黒**（既定）— 数式です。計算で求まるセルはすべて生きた Excel 数式にします。
- **緑**（`Font(color="006100")`）— 別シートや外部ファイルへの参照です。

こうしておくと、レビューする人はシートを眺めるだけで、どれが前提でどれが計算結果かをすぐ見分けられます。

### 決め打ちの数値ではなく数式で書く {#formulas-over-hardcodes}
計算するセルは必ず数式の文字列にします。Python 側で計算した数値を値として貼ってはいけません。

```python
# WRONG — silent bug waiting to happen
ws["D20"] = revenue_prior_year * (1 + growth)

# CORRECT — flexes when the user changes the assumption
ws["D20"] = "=D19*(1+$B$8)"
```

決め打ちの数値が許されるのは、次の 3 つだけです。

1. 実績としての入力値（実際の売上高、報告された EBITDA など）
2. 使う人が動かすことを想定した前提のドライバー（成長率、WACC の入力、永久成長率）
3. 足元の市場データ（株価、有利子負債残高）— 出典と日付をセルのコメントに残します

Python で値を計算して書き込もうとしている自分に気づいたら、そこで手を止めてください。

### シートをまたぐ参照には名前付き範囲を使う {#named-ranges-for-cross-sheet-references}
別シート・スライド・メモから参照する数値には、名前付き範囲を使います。

```python
from openpyxl.workbook.defined_name import DefinedName
wb.defined_names["WACC"] = DefinedName("WACC", attr_text="Inputs!$C$8")
# then elsewhere:
calc["D30"] = "=D29/WACC"
```

### 整合チェック用のタブ {#balance-checks-tab}
全体のつじつまを確かめて TRUE/FALSE で見せる `Checks` タブを用意します。

- 貸借対照表が均衡しているか（資産 = 負債 + 純資産）
- キャッシュフローが、貸借対照表上の現金の期中増減と一致するか
- 事業別の合計が、連結の合計と一致するか
- 計算範囲の中に紛れ込んだ決め打ちの数値がないか

例:
```python
checks = wb.create_sheet("Checks")
checks["A2"] = "BS balances"
checks["B2"] = "=IS!D20-IS!D21-IS!D22"
checks["C2"] = "=ABS(B2)<0.01"  # TRUE/FALSE
```

### 決め打ちの入力すべてにセルのコメントを付ける {#cell-comments-on-every-hardcoded-input}
コメントは後回しにせず、そのセルを作るのと同時に付けます。

```python
from openpyxl.comments import Comment
ws["C2"] = 1_250_000_000
ws["C2"].font = Font(color="0000FF")
ws["C2"].comment = Comment("Source: 10-K FY2024, p.47, revenue line", "analyst")
```

書式は `Source: [System/Document], [Date], [Reference], [URL if applicable]` です。

出典を後回しにしないでください。`TODO: add source` と書くのも禁止です。

## 骨組み: よくある財務モデル {#skeleton-typical-financial-model}

```python
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.comments import Comment
from openpyxl.utils import get_column_letter
from pathlib import Path

BLUE = Font(color="0000FF")
BLACK = Font(color="000000")
GREEN = Font(color="006100")
BOLD = Font(bold=True)
HEADER_FILL = PatternFill("solid", fgColor="1F4E79")
HEADER_FONT = Font(color="FFFFFF", bold=True)

wb = Workbook()

# --- Inputs tab ---
inp = wb.active
inp.title = "Inputs"
inp["A1"] = "MARKET DATA & KEY INPUTS"
inp["A1"].font = HEADER_FONT
inp["A1"].fill = HEADER_FILL
inp.merge_cells("A1:C1")

inp["B3"] = "Revenue FY2024"
inp["C3"] = 1_250_000_000
inp["C3"].font = BLUE
inp["C3"].comment = Comment("Source: 10-K FY2024 p.47", "model")

inp["B4"] = "Growth Rate"
inp["C4"] = 0.12
inp["C4"].font = BLUE

# --- Calc tab ---
calc = wb.create_sheet("DCF")
calc["B2"] = "Projected Revenue"
calc["C2"] = "=Inputs!C3*(1+Inputs!C4)"   # formula, black

# --- Checks tab ---
chk = wb.create_sheet("Checks")
chk["A2"] = "BS balances"
chk["B2"] = "=ABS(BS!D20-BS!D21-BS!D22)<0.01"

Path("./out").mkdir(exist_ok=True)
wb.save("./out/model.xlsx")
```

## セルを結合した見出し行 {#section-headers-with-merged-cells}

openpyxl には癖があります。セルを結合するときは、値は左上のセルに入れ、書式は範囲全体に別途あてます。

```python
ws["A7"] = "CASH FLOW PROJECTION"
ws["A7"].font = HEADER_FONT
ws.merge_cells("A7:H7")
for col in range(1, 9):  # A..H
    ws.cell(row=7, column=col).fill = HEADER_FILL
```

## 感応度分析の表 {#sensitivity-tables}

セルごとに数式を手書きせず、ループで作ります。決まりごとは次のとおりです。

- **行数・列数は奇数にします**（5×5 か 7×7）— 中心のセルが必ず 1 つ決まります。
- **中心のセルがベースケースです。** 真ん中の行見出しと列見出しは、モデルが実際に使っている WACC と永久成長率に一致させます。そうすれば中心セルの結果がベースケースの理論株価と一致し、これが表が正しく組めているかの検算になります。
- **中心のセルを目立たせます。** 中間の青（`"BDD7EE"`）で塗り、太字にします。
- どのセルも、その組み合わせで全体を計算し直す数式で埋めます。近似で済ませてはいけません。

```python
# 5x5 WACC (rows) x terminal growth (cols) sensitivity
wacc_axis = [0.08, 0.085, 0.09, 0.095, 0.10]        # center row = base 9.0%
term_axis = [0.02, 0.025, 0.03, 0.035, 0.04]        # center col = base 3.0%

start_row = 40
ws.cell(row=start_row, column=1).value = "Implied Share Price ($)"
ws.cell(row=start_row, column=1).font = BOLD

for j, g in enumerate(term_axis):
    ws.cell(row=start_row+1, column=2+j).value = g
    ws.cell(row=start_row+1, column=2+j).font = BLUE

for i, w in enumerate(wacc_axis):
    r = start_row + 2 + i
    ws.cell(row=r, column=1).value = w
    ws.cell(row=r, column=1).font = BLUE
    for j, g in enumerate(term_axis):
        c = 2 + j
        # Full DCF recalc formula (simplified for illustration).
        # In a real model this references the full projection block.
        ws.cell(row=r, column=c).value = (
            f"=SUMPRODUCT(FCF_range,1/(1+{w})^year_offset) + "
            f"FCF_terminal*(1+{g})/({w}-{g})/(1+{w})^terminal_year"
        )

# Highlight center cell (base case)
center = ws.cell(row=start_row+2+len(wacc_axis)//2,
                 column=2+len(term_axis)//2)
center.fill = PatternFill("solid", fgColor="BDD7EE")
center.font = BOLD
```

## 渡す前に再計算する {#recalculating-before-delivery}

openpyxl は数式を文字列として書き込むだけで、計算まではしません。Excel は開いたときに計算し直しますが、受け取る側のツール（自動チェックのスクリプトや CI）には計算済みの値が要ります。

渡す前に LibreOffice か専用の再計算処理を通してください。

```bash
# LibreOffice headless recalc
libreoffice --headless --calc --convert-to xlsx ./out/model.xlsx --outdir ./out/
```

Python の再計算用ヘルパー（この skill の `scripts/recalc.py`）を使う手もあります。

## レイアウトを先に決める {#model-layout-planning}

数式を書き始める前に、次の順で進めます。

1. すべてのセクションの行位置を決めます
2. 見出しとラベルをすべて書きます
3. セクションの区切りと空行をすべて置きます
4. そのうえで、確定した行位置を使って数式を書きます

こうしておくと、数式を書いたあとで見出し行を挿入して下流の参照がすべてずれる、という連鎖的な崩れを防げます。

## 使う人と一段ずつ確かめる {#verify-step-by-step-with-the-user}

大きなモデル（DCF、3 表連動、LBO）では、途中の成果物をその都度見せて確認を取ってから先へ進みます。感応度分析の表まで作り込む前に、利益率の前提の誤りに気づければ 1 時間は浮きます。

確認のはさみ方は次のとおりです。

- 入力ブロックを作ったら → 生の入力値を見せ、予測に入る前に確認します
- 売上の予測を作ったら → トップラインと成長率を確認します
- FCF を組んだら → スケジュール全体を確認します
- WACC を出したら → 入力値を確認します
- 評価額を出したら → 株主価値への橋渡しを確認します
- そのあとで感応度分析の表を作ります

## この skill を使わないほうがよい場面 {#when-not-to-use-this-skill}

- Excel を開いて作業中で、Office MCP が使える場合 — その生きたワークブックを直接操作するほうが早いです。
- 数式のない、ただの表データの書き出し — `csv` か `pandas.to_excel` のほうが簡単です。
- 操作の多いダッシュボードやグラフ — 本格的な BI ツールを使ってください。

## 出典 {#attribution}

各種の作法（青 / 黒 / 緑、決め打ちより数式、名前付き範囲、感応度分析の決まりごと）は、Anthropic の Claude for Financial Services プラグイン群（Apache-2.0）から取り入れたものです。元となったもの: https://github.com/anthropics/financial-services/tree/main/plugins/vertical-plugins/financial-analysis/skills/xlsx-author
