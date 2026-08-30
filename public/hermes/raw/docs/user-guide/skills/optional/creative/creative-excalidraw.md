---
title: "Excalidraw — 手描き風の Excalidraw JSON で図を作る（構成図、フロー図、シーケンス図）"
description: "手描き風の Excalidraw JSON で図を作る（構成図、フロー図、シーケンス図）"
upstream_path: user-guide/skills/optional/creative/creative-excalidraw.md
upstream_blob: 15da2dbebc4ac31ecfc5c9bd6e45da5672f8d790
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/creative/creative-excalidraw
---

# Excalidraw {#excalidraw}

手描き風の Excalidraw JSON で図を作ります（構成図、フロー図、シーケンス図）。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加で入れるもの — `hermes skills install official/creative/excalidraw` で導入します |
| パス | `optional-skills/creative\excalidraw` |
| バージョン | `1.0.1` |
| 作者 | Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Excalidraw`, `Diagrams`, `Flowcharts`, `Architecture`, `Visualization`, `JSON` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Excalidraw Diagram Skill {#excalidraw-diagram-skill}

Excalidraw の標準的な要素 JSON を書き、`.excalidraw` ファイルとして保存することで図を作ります。できたファイルは [excalidraw.com](https://excalidraw.com) にドラッグ＆ドロップすれば、そのまま表示も編集もできます。アカウントも API キーも描画用のライブラリも要りません。あるのは JSON だけです。

## こんなときに使います {#when-to-use}

構成図、フロー図、シーケンス図、概念図などを `.excalidraw` ファイルとして作ります。ファイルは excalidraw.com で開けますし、アップロードすれば共有用のリンクにもできます。

## 進め方 {#workflow}

1. **この skill を読み込みます**（もう済んでいます）
2. **要素の JSON を書きます** — Excalidraw の要素オブジェクトを並べた配列です
3. **ファイルを保存します** — `write_file` で `.excalidraw` ファイルを作ります
4. **必要ならアップロードします** — `terminal` から `scripts/upload.py` を使うと共有用のリンクになります

### 図を保存する {#saving-a-diagram}

要素の配列を `.excalidraw` の標準的な外枠で包み、`write_file` で保存します。

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "hermes-agent",
  "elements": [ ...your elements array here... ],
  "appState": {
    "viewBackgroundColor": "#ffffff"
  }
}
```

保存先はどこでも構いません。たとえば `~/diagrams/my_diagram.excalidraw` です。

### 共有用のリンクを作る {#uploading-for-a-shareable-link}

この skill の `scripts/` ディレクトリにあるアップロード用スクリプトを、ターミナルから実行します。

```bash
python skills/creative/excalidraw/scripts/upload.py ~/diagrams/my_diagram.excalidraw
```

これで excalidraw.com にアップロードされ（アカウントは不要です）、共有用の URL が表示されます。pip の `cryptography` パッケージが必要です（`pip install cryptography`）。

---

## 要素の書き方一覧 {#element-format-reference}

### 必ず要る項目（すべての要素） {#required-fields-all-elements}
`type`、`id`（重複しない文字列）、`x`、`y`、`width`、`height`

### 初期値（書かなくて構いません。自動で付きます） {#defaults-skip-these----theyre-applied-automatically}
- `strokeColor`: `"#1e1e1e"`
- `backgroundColor`: `"transparent"`
- `fillStyle`: `"solid"`
- `strokeWidth`: `2`
- `roughness`: `1`（手描き風の見た目になります）
- `opacity`: `100`

キャンバスの背景は白です。

### 要素の種類 {#element-types}

**長方形**:
```json
{ "type": "rectangle", "id": "r1", "x": 100, "y": 100, "width": 200, "height": 100 }
```
- 角を丸くするなら `roundness: { "type": 3 }`
- 中を塗るなら `backgroundColor: "#a5d8ff"`、`fillStyle: "solid"`

**楕円**:
```json
{ "type": "ellipse", "id": "e1", "x": 100, "y": 100, "width": 150, "height": 150 }
```

**ひし形**:
```json
{ "type": "diamond", "id": "d1", "x": 100, "y": 100, "width": 150, "height": 150 }
```

**文字入りの図形（入れ物として結び付ける）** — 図形に結び付いたテキスト要素を作ります。

> **警告:** 図形に `"label": { "text": "..." }` を使ってはいけません。これは Excalidraw の正しい項目ではなく、黙って無視され、中身のない図形ができてしまいます。必ず下の、入れ物として結び付けるやり方を使ってください。

図形の側にはテキストを並べた `boundElements` が要り、テキストの側には図形を指す `containerId` が要ります。
```json
{ "type": "rectangle", "id": "r1", "x": 100, "y": 100, "width": 200, "height": 80,
  "roundness": { "type": 3 }, "backgroundColor": "#a5d8ff", "fillStyle": "solid",
  "boundElements": [{ "id": "t_r1", "type": "text" }] },
{ "type": "text", "id": "t_r1", "x": 105, "y": 110, "width": 190, "height": 25,
  "text": "Hello", "fontSize": 20, "fontFamily": 1, "strokeColor": "#1e1e1e",
  "textAlign": "center", "verticalAlign": "middle",
  "containerId": "r1", "originalText": "Hello", "autoResize": true }
```
- 長方形、楕円、ひし形で使えます
- `containerId` を付けると、Excalidraw が文字を自動で中央に寄せます
- テキストの `x` / `y` / `width` / `height` はおおよそで構いません。読み込み時に Excalidraw が計算し直します
- `originalText` は `text` と同じにします
- `fontFamily: 1` は必ず入れてください（Virgil という手描き風の書体です）

**文字入りの矢印** — 入れ物として結び付けるやり方は同じです。
```json
{ "type": "arrow", "id": "a1", "x": 300, "y": 150, "width": 200, "height": 0,
  "points": [[0,0],[200,0]], "endArrowhead": "arrow",
  "boundElements": [{ "id": "t_a1", "type": "text" }] },
{ "type": "text", "id": "t_a1", "x": 370, "y": 130, "width": 60, "height": 20,
  "text": "connects", "fontSize": 16, "fontFamily": 1, "strokeColor": "#1e1e1e",
  "textAlign": "center", "verticalAlign": "middle",
  "containerId": "a1", "originalText": "connects", "autoResize": true }
```

**単独のテキスト**（見出しや注記だけに使います。入れ物には結び付けません）:
```json
{ "type": "text", "id": "t1", "x": 150, "y": 138, "text": "Hello", "fontSize": 20,
  "fontFamily": 1, "strokeColor": "#1e1e1e", "originalText": "Hello", "autoResize": true }
```
- `x` は左端です。位置 `cx` を中心にしたいときは `x = cx - (text.length * fontSize * 0.5) / 2` とします
- 位置決めを `textAlign` や `width` に任せてはいけません

**矢印**:
```json
{ "type": "arrow", "id": "a1", "x": 300, "y": 150, "width": 200, "height": 0,
  "points": [[0,0],[200,0]], "endArrowhead": "arrow" }
```
- `points`: 要素の `x`、`y` からのずれを `[dx, dy]` で書きます
- `endArrowhead`: `null` | `"arrow"` | `"bar"` | `"dot"` | `"triangle"`
- `strokeStyle`: `"solid"`（初期値） | `"dashed"` | `"dotted"`

### 矢印の結び付け（矢印を図形につなぐ） {#arrow-bindings-connect-arrows-to-shapes}

```json
{
  "type": "arrow", "id": "a1", "x": 300, "y": 150, "width": 150, "height": 0,
  "points": [[0,0],[150,0]], "endArrowhead": "arrow",
  "startBinding": { "elementId": "r1", "fixedPoint": [1, 0.5] },
  "endBinding": { "elementId": "r2", "fixedPoint": [0, 0.5] }
}
```

`fixedPoint` の座標は、上が `top=[0.5,0]`、下が `bottom=[0.5,1]`、左が `left=[0,0.5]`、右が `right=[1,0.5]` です。

### 描く順番（重なりの順番） {#drawing-order-z-order}
- 配列の順番がそのまま重なりの順番になります（先頭が奥、末尾が手前）
- 少しずつ書き出します。背景の区画 → 図形 → その図形に結び付いたテキスト → その図形から出る矢印 → 次の図形、という順です
- 悪い例: 長方形をすべて書き、次にテキストをすべて書き、最後に矢印をすべて書く
- 良い例: bg_zone → shape1 → text_for_shape1 → arrow1 → arrow_label_text → shape2 → text_for_shape2 → ...
- 結び付いたテキスト要素は、必ず入れ物になる図形のすぐ後ろに置きます

### 大きさの目安 {#sizing-guidelines}

**文字の大きさ:**
- 本文、ラベル、説明の `fontSize` は **16** 以上にします
- 見出しの `fontSize` は **20** 以上にします
- 補助的な注記に限り `fontSize` **14** まで下げられます（多用しないでください）
- `fontSize` を 14 より小さくしてはいけません

**要素の大きさ:**
- 文字入りの長方形や楕円は、最低でも 120x60 にします
- 要素どうしは最低 20〜30px 空けます
- 小さい要素をたくさん置くより、少なく大きく置くほうがよいです

### 配色 {#color-palette}

色の一覧は `references/colors.md` にあります。早見表は次のとおりです。

| 用途 | 塗りの色 | 16 進表記 |
|-----|-----------|-----|
| 主役 / 入力 | 薄い青 | `#a5d8ff` |
| 成功 / 出力 | 薄い緑 | `#b2f2bb` |
| 注意 / 外部 | 薄いオレンジ | `#ffd8a8` |
| 処理 / 特別扱い | 薄い紫 | `#d0bfff` |
| エラー / 重大 | 薄い赤 | `#ffc9c9` |
| メモ / 判断 | 薄い黄 | `#fff3bf` |
| 保管 / データ | 薄い青緑 | `#c3fae8` |

### コツ {#tips}
- 図全体で配色をそろえます
- **文字の見やすさがいちばん大事です** — 白い背景に薄い灰色は絶対に使わないでください。白地に置く文字の色は `#757575` までにします
- 文中に絵文字を使ってはいけません。Excalidraw の書体では表示されません
- 暗い配色の図については `references/dark-mode.md` を見てください
- もっと大きな例は `references/examples.md` にあります
