---
title: "Excalidraw — 手描き風の Excalidraw JSON 図（構成図・フロー図・シーケンス図）"
description: "手描き風の Excalidraw JSON 図（構成図・フロー図・シーケンス図）"
upstream_path: user-guide/skills/bundled/creative/creative-excalidraw.md
upstream_blob: 682c75d2cf186e48c2907e11a96a3341bbbdc1ed
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/creative/creative-excalidraw
---

# Excalidraw {#excalidraw}

手描き風の Excalidraw JSON 図（構成図・フロー図・シーケンス図）を作ります。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/creative/excalidraw` |
| バージョン | `1.0.1` |
| 作者 | Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Excalidraw`, `Diagrams`, `Flowcharts`, `Architecture`, `Visualization`, `JSON` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として見ています。
:::

# Excalidraw の作図 skill {#excalidraw-diagram-skill}

Excalidraw の標準的な要素 JSON を書き、`.excalidraw` ファイルとして保存することで図を作ります。できあがったファイルは [excalidraw.com](https://excalidraw.com) にドラッグ&ドロップすれば、そのまま表示・編集できます。アカウントも API キーも描画ライブラリも要りません。JSON だけです。

## こんなときに使います {#when-to-use}

構成図、フロー図、シーケンス図、概念図などを `.excalidraw` ファイルとして作ります。excalidraw.com で開けるほか、アップロードすれば共有用のリンクにもできます。

## 手順 {#workflow}

1. **この skill を読み込む**（もう済んでいます）
2. **要素の JSON を書く** — Excalidraw の要素オブジェクトを並べた配列です
3. **ファイルを保存する** — `write_file` で `.excalidraw` ファイルを作ります
4. **必要ならアップロードする** — 共有リンクがほしいときは `terminal` から `scripts/upload.py` を実行します

### 図を保存する {#saving-a-diagram}

要素の配列を、`.excalidraw` の標準的な入れ物で包んで `write_file` で保存します。

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

### 共有リンクのためにアップロードする {#uploading-for-a-shareable-link}

この skill の `scripts/` ディレクトリにあるアップロード用スクリプトを、ターミナルから実行します。

```bash
python skills/creative/excalidraw/scripts/upload.py ~/diagrams/my_diagram.excalidraw
```

excalidraw.com にアップロードして（アカウントは不要です）、共有用の URL を表示します。pip の `cryptography` パッケージが必要です（`pip install cryptography`）。

---

## 要素の書き方一覧 {#element-format-reference}

### 必須の項目（すべての要素に共通） {#required-fields-all-elements}
`type`、`id`（重複しない文字列）、`x`、`y`、`width`、`height`

### 既定値（自動で入るので書かなくて構いません） {#defaults-skip-these----theyre-applied-automatically}
- `strokeColor`: `"#1e1e1e"`
- `backgroundColor`: `"transparent"`
- `fillStyle`: `"solid"`
- `strokeWidth`: `2`
- `roughness`: `1`（手描き風になります）
- `opacity`: `100`

キャンバスの背景は白です。

### 要素の種類 {#element-types}

**四角形**:
```json
{ "type": "rectangle", "id": "r1", "x": 100, "y": 100, "width": 200, "height": 100 }
```
- 角を丸めるなら `roundness: { "type": 3 }`
- 塗るなら `backgroundColor: "#a5d8ff"`、`fillStyle: "solid"`

**楕円**:
```json
{ "type": "ellipse", "id": "e1", "x": 100, "y": 100, "width": 150, "height": 150 }
```

**ひし形**:
```json
{ "type": "diamond", "id": "d1", "x": 100, "y": 100, "width": 150, "height": 150 }
```

**文字を載せた図形（コンテナへの結び付け）** — 図形に結び付いたテキスト要素を作ります。

> **注意:** 図形に `"label": { "text": "..." }` を書いてはいけません。これは Excalidraw の
> 正しいプロパティではないので黙って無視され、中身のない図形ができあがります。必ず下の
> コンテナ結び付けの書き方を使ってください。

図形側には `boundElements` でテキストを挙げ、テキスト側には `containerId` で図形を指し返します。
```json
{ "type": "rectangle", "id": "r1", "x": 100, "y": 100, "width": 200, "height": 80,
  "roundness": { "type": 3 }, "backgroundColor": "#a5d8ff", "fillStyle": "solid",
  "boundElements": [{ "id": "t_r1", "type": "text" }] },
{ "type": "text", "id": "t_r1", "x": 105, "y": 110, "width": 190, "height": 25,
  "text": "Hello", "fontSize": 20, "fontFamily": 1, "strokeColor": "#1e1e1e",
  "textAlign": "center", "verticalAlign": "middle",
  "containerId": "r1", "originalText": "Hello", "autoResize": true }
```
- 四角形・楕円・ひし形で使えます
- `containerId` が設定されていれば、Excalidraw が文字を自動で中央に置きます
- テキストの `x`/`y`/`width`/`height` はおおよその値で構いません。読み込み時に Excalidraw が計算し直します
- `originalText` は `text` と同じ内容にします
- `fontFamily: 1`（Virgil という手描き風のフォント）は必ず入れてください

**文字を載せた矢印** — 同じくコンテナに結び付けます。
```json
{ "type": "arrow", "id": "a1", "x": 300, "y": 150, "width": 200, "height": 0,
  "points": [[0,0],[200,0]], "endArrowhead": "arrow",
  "boundElements": [{ "id": "t_a1", "type": "text" }] },
{ "type": "text", "id": "t_a1", "x": 370, "y": 130, "width": 60, "height": 20,
  "text": "connects", "fontSize": 16, "fontFamily": 1, "strokeColor": "#1e1e1e",
  "textAlign": "center", "verticalAlign": "middle",
  "containerId": "a1", "originalText": "connects", "autoResize": true }
```

**単独のテキスト**（タイトルと注記だけに使います。コンテナには結び付けません）:
```json
{ "type": "text", "id": "t1", "x": 150, "y": 138, "text": "Hello", "fontSize": 20,
  "fontFamily": 1, "strokeColor": "#1e1e1e", "originalText": "Hello", "autoResize": true }
```
- `x` は左端の位置です。`cx` の位置に中央を合わせたいなら `x = cx - (text.length * fontSize * 0.5) / 2` で求めます
- 位置合わせに `textAlign` や `width` を当てにしないでください

**矢印**:
```json
{ "type": "arrow", "id": "a1", "x": 300, "y": 150, "width": 200, "height": 0,
  "points": [[0,0],[200,0]], "endArrowhead": "arrow" }
```
- `points`: 要素の `x`, `y` からの `[dx, dy]` のずれです
- `endArrowhead`: `null` | `"arrow"` | `"bar"` | `"dot"` | `"triangle"`
- `strokeStyle`: `"solid"`（既定）| `"dashed"` | `"dotted"`

### 矢印の結び付け（矢印を図形につなぐ） {#arrow-bindings-connect-arrows-to-shapes}

```json
{
  "type": "arrow", "id": "a1", "x": 300, "y": 150, "width": 150, "height": 0,
  "points": [[0,0],[150,0]], "endArrowhead": "arrow",
  "startBinding": { "elementId": "r1", "fixedPoint": [1, 0.5] },
  "endBinding": { "elementId": "r2", "fixedPoint": [0, 0.5] }
}
```

`fixedPoint` の座標は 上=`top=[0.5,0]`、下=`bottom=[0.5,1]`、左=`left=[0,0.5]`、右=`right=[1,0.5]` です

### 描く順番（重なり） {#drawing-order-z-order}
- 配列の順がそのまま重なり順です（先頭が奥、末尾が手前）
- 少しずつ書き出します。背景の区画 → 図形 → その図形に結び付いた文字 → その図形から出る矢印 → 次の図形
- よくない例: 四角形を全部、次に文字を全部、次に矢印を全部
- よい例: bg_zone → shape1 → text_for_shape1 → arrow1 → arrow_label_text → shape2 → text_for_shape2 → ...
- 結び付いた文字は、必ずコンテナの図形のすぐ後ろに置いてください

### 大きさの目安 {#sizing-guidelines}

**文字の大きさ:**
- 本文・ラベル・説明の `fontSize` は最低 **16**
- タイトルと見出しの `fontSize` は最低 **20**
- 補助的な注記の `fontSize` は最低 **14**（控えめに使ってください）
- `fontSize` を 14 未満にしてはいけません

**要素の大きさ:**
- 文字入りの四角形・楕円は最低 120x60
- 要素どうしは最低でも 20〜30px 空けてください
- 小さいものをたくさん並べるより、少なく大きくまとめるほうが読みやすくなります

### 配色 {#color-palette}

色の全一覧は `references/colors.md` にあります。早見表は次のとおりです。

| 用途 | 塗りの色 | 16 進数 |
|-----|-----------|-----|
| 主役 / 入力 | 薄い青 | `#a5d8ff` |
| 成功 / 出力 | 薄い緑 | `#b2f2bb` |
| 注意 / 外部 | 薄いオレンジ | `#ffd8a8` |
| 処理中 / 特別扱い | 薄い紫 | `#d0bfff` |
| エラー / 重大 | 薄い赤 | `#ffc9c9` |
| メモ / 判断 | 薄い黄 | `#fff3bf` |
| 保存先 / データ | 薄い青緑 | `#c3fae8` |

### ちょっとしたコツ {#tips}
- 配色は図の全体で揃えて使ってください
- **文字のコントラストが何より大事です** — 白い背景に薄い灰色は絶対に避けます。白地に載せる文字の色は `#757575` が下限です
- 文字に絵文字を使ってはいけません。Excalidraw のフォントでは表示されません
- ダークモードの図については `references/dark-mode.md` を見てください
- もっと大きな例は `references/examples.md` にあります
