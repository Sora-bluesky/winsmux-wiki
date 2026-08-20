---
title: "Pptx Author — python-pptx でヘッドレスに PowerPoint 資料を作る"
description: "python-pptx でヘッドレスに PowerPoint 資料を作る"
upstream_path: user-guide/skills/optional/finance/finance-pptx-author.md
upstream_blob: ae7d711c39674b95de4ed2300102c0f0d966f1a4
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/finance/finance-pptx-author
---

# Pptx Author {#pptx-author}

python-pptx を使い、ヘッドレスで PowerPoint 資料を作ります。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加 skill — `hermes skills install official/finance/pptx-author` で入れます |
| パス | `optional-skills/finance/pptx-author` |
| バージョン | `1.0.0` |
| 作者 | Anthropic（Nous Research が改変） |
| ライセンス | Apache-2.0 |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `powerpoint`, `pptx`, `python-pptx`, `presentation`, `finance` |
| 関連 skill | [`excel-author`](/hermes/docs/user-guide/skills/optional/finance/finance-excel-author/), [`powerpoint`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-powerpoint/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# pptx-author {#pptx-author}

`python-pptx` を使って、ディスク上に .pptx ファイルを作ります。PowerPoint を開いて操作するのではなく、資料をファイルとして納品したいときに使います。

[anthropics/financial-services](https://github.com/anthropics/financial-services) にある Anthropic の `pptx-author` と `pitch-deck` skill をもとにしています。原典の MCP / Office-JS を使う分岐は落としてあり、ここではヘッドレスの Python を前提にします。

スライド、発表者ノート、埋め込み、メディアまで扱う本格的な PowerPoint 作成なら、標準で入っている `powerpoint` skill を使ってください。この skill は、モデルの数値に裏付けられた資料（提案資料、投資委員会向けメモ、決算メモ）のように、どの数字も元のワークブックまでたどれることが求められる場面向けの、より軽い作り方です。

## 成果物の決まり {#output-contract}

- `./out/<name>.pptx` に書き出します。`./out/` がなければ作ります。
- 最後のメッセージで、相対パスを返します。

## 準備 {#setup}

```bash
pip install "python-pptx>=0.6"
```

## 基本の作法 {#core-conventions}

### 1 枚に 1 つの主張 {#one-idea-per-slide}
タイトルで言いたいことを言い切り、本文でそれを支えます。「Q3 の売上」というタイトルは弱く、「3Q に売上成長が前年比 14% へ加速」なら強いタイトルです。

### すべての数字がモデルまでたどれること {#every-number-traces-to-the-model}
スライド上の数値が `./out/model.xlsx` から来ているなら、シート名とセルを脚注に書きます。

```
Revenue: $1,250M  (Source: model.xlsx, Inputs!C3)
```

記憶や要約から数字を書き写してはいけません。ワークブックを開いて名前付き範囲を読み、可能なかぎりプログラムから資料の値に結び付けます。

### 会社のテンプレートがあるときはそれを使う {#use-the-firm-template-when-one-is-mounted}
`./templates/firm-template.pptx` があれば読み込みます。そうすると、資料が会社の色、フォント、スライドマスターを引き継ぎます。

```python
from pptx import Presentation
from pathlib import Path

template = Path("./templates/firm-template.pptx")
prs = Presentation(str(template)) if template.exists() else Presentation()
```

### グラフは pptx の標準機能より、モデルから作った PNG が有利 {#charts-png-from-model-beats-native-pptx-charts}
見た目を厳密に合わせたいとき（モデル側のグラフの体裁を資料とぴったり一致させたいとき）は、元のワークブックからグラフを PNG に書き出し、その画像を貼り込みます。`pptx.chart` の標準グラフは壊れやすく、会社の体裁に合わないことがよくあります。

```python
from pptx.util import Inches
slide.shapes.add_picture("./out/charts/football_field.png",
                         Inches(1), Inches(2),
                         width=Inches(8))
```

### 外部へは送らない {#no-external-sends}
この skill はファイルを書くだけです。メール送信、アップロード、投稿はしません。届ける処理は上位の仕組みが受け持ちます。

## ひな形 {#skeleton}

```python
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pathlib import Path

template = Path("./templates/firm-template.pptx")
prs = Presentation(str(template)) if template.exists() else Presentation()

# Title slide
slide = prs.slides.add_slide(prs.slide_layouts[0])
slide.shapes.title.text = "Project Aurora — Strategic Alternatives"
slide.placeholders[1].text = "Preliminary Discussion Materials"

# Valuation summary slide (title-only layout)
slide = prs.slides.add_slide(prs.slide_layouts[5])
slide.shapes.title.text = "Valuation implies $38–$52 per share across methodologies"

# Add a table bound to model outputs
rows, cols = 5, 4
tbl_shape = slide.shapes.add_table(rows, cols,
                                   Inches(0.5), Inches(1.5),
                                   Inches(9), Inches(3))
tbl = tbl_shape.table
headers = ["Methodology", "Low ($)", "Mid ($)", "High ($)"]
for c, h in enumerate(headers):
    tbl.cell(0, c).text = h

# In a real deck, read these from the model workbook with openpyxl
data = [
    ("Trading comps",     "35", "41", "48"),
    ("Precedent M&A",     "39", "45", "52"),
    ("DCF (base)",        "36", "43", "51"),
    ("LBO (10% IRR)",     "33", "38", "44"),
]
for r, row in enumerate(data, start=1):
    for c, val in enumerate(row):
        tbl.cell(r, c).text = val

# Embed a chart rendered from the model
slide = prs.slides.add_slide(prs.slide_layouts[5])
slide.shapes.title.text = "Football field — current price $42"
slide.shapes.add_picture("./out/charts/football_field.png",
                         Inches(1), Inches(1.8), width=Inches(8))

Path("./out").mkdir(exist_ok=True)
prs.save("./out/pitch-aurora.pptx")
```

## 資料の数字を元のワークブックに結び付ける {#binding-deck-numbers-to-the-source-workbook}

Excel モデルから名前付き範囲や特定のセルを読み込めば、資料の数字がずれることはなくなります。

```python
from openpyxl import load_workbook

wb = load_workbook("./out/model.xlsx", data_only=True)
def nr(name):
    """Resolve a named range to its current computed value."""
    rng = wb.defined_names[name]
    sheet, coord = next(rng.destinations)
    return wb[sheet][coord].value

revenue_fy24 = nr("RevenueFY24")
implied_mid  = nr("ImpliedSharePriceBase")
```

読み込んだ値を使って、資料の中身を組み立てます:
```python
slide.shapes.title.text = f"Implied share price of ${implied_mid:.2f} (base case)"
```

ワークブックを読む前に再計算しておくのを忘れないでください。openpyxl は、どこかで計算済みのシートでなければ値を読み取れません。先に `excel-author` skill の再計算ヘルパーを実行するか、実際の Excel で開いて保存し直します。

## 提案資料のスライド構成チェックリスト {#slide-type-checklist-for-pitch-decks}

投資銀行の提案資料は、だいたい次の並びになります。決まりではありませんが、出発点のひな形として役に立ちます。

1. 表紙・タイトル
2. 免責事項
3. 目次
4. 状況の整理
5. 会社の概要（対象会社）
6. 市場・業界の状況
7. バリュエーションのまとめ（フットボールフィールド） — 資料の山場です
8. 類似企業比較の詳細
9. 過去の取引事例の詳細
10. DCF のまとめ
11. LBO / スポンサーケースの試算
12. プロセス上の論点
13. 補足資料

## この skill を使わないほうがよい場面 {#when-not-to-use-this-skill}

- PowerPoint を開いた状態で作業していて、Office の MCP が使える場合 — 開いているファイルを直接操作するほうが向いています。
- 金融以外の資料（全社会議、マーケティング資料など） — 汎用の `powerpoint` skill を使ってください。
- アニメーション、画面切り替え、発表者ノートを多用する資料 — 汎用の `powerpoint` skill を使ってください。

## 出典 {#attribution}

作法は Anthropic の Claude for Financial Services プラグイン群（Apache-2.0 ライセンス）をもとにしています。原典: https://github.com/anthropics/financial-services/tree/main/plugins/agent-plugins/pitch-agent/skills/pptx-author
