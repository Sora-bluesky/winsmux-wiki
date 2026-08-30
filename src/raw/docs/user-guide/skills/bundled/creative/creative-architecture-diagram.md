---
title: "Architecture Diagram — 暗い配色の SVG で構成図・クラウド図・インフラ図を HTML として作る"
description: "暗い配色の SVG で構成図・クラウド図・インフラ図を HTML として作る"
upstream_path: user-guide/skills/bundled/creative/creative-architecture-diagram.md
upstream_blob: a4bf8cfc18299d05c8e3d6930bd59b3541c3629a
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/creative/creative-architecture-diagram
---

# Architecture Diagram {#architecture-diagram}

暗い配色の SVG で、構成図・クラウド図・インフラ図を HTML として作ります。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/creative\architecture-diagram` |
| バージョン | `1.0.0` |
| 作者 | Cocoon AI (hello@cocoon-ai.com), ported by Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `architecture`, `diagrams`, `SVG`, `HTML`, `visualization`, `infrastructure`, `cloud` |
| 関連 skill | [`concept-diagrams`](/hermes/docs/user-guide/skills/optional/creative/creative-concept-diagrams/), [`excalidraw`](/hermes/docs/user-guide/skills/optional/creative/creative-excalidraw/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこの内容を指示として見ています。
:::

# Architecture Diagram の skill {#architecture-diagram-skill}

技術系の構成図を、暗い配色で見栄えよく、SVG を埋め込んだ単体の HTML ファイルとして作ります。外部ツールも API キーも描画ライブラリも要りません。HTML ファイルを書いて、ブラウザで開くだけです。

## 扱う範囲 {#scope}

**向いているもの:**
- ソフトウェアの構成（フロントエンド / バックエンド / データベースの各層）
- クラウドのインフラ（VPC、リージョン、サブネット、マネージドサービス）
- マイクロサービスやサービスメッシュの構成
- データベースと API の対応図、配置の図
- 技術インフラを題材にした、暗くグリッドを敷いた見た目に合うもの全般

**先にほかを探したほうがよいもの:**
- 物理、化学、数学、生物など、科学の題材
- 実体のあるもの（乗り物、機器、人体、断面図）
- 間取り図、物語の流れ、教材・教科書のような図
- 手描き風のホワイトボードのスケッチ（`excalidraw` を検討してください）
- 動きのある解説（アニメーション系の skill を検討してください）

その題材により合った skill があるなら、そちらを優先してください。当てはまるものがなければ、この skill を汎用の SVG 作図の受け皿として使うこともできます。その場合、出来上がりは下で説明する暗い技術系の見た目になります。

[Cocoon AI の architecture-diagram-generator](https://github.com/Cocoon-AI/architecture-diagram-generator)（MIT）をもとにしています。

## 進め方 {#workflow}

1. 利用者が構成（要素、つながり、使っている技術）を説明する
2. 下の設計ルールに沿って HTML ファイルを組み立てる
3. `write_file` で `.html` ファイルとして保存する（例: `~/architecture-diagram.html`）
4. 利用者が好きなブラウザで開く。オフラインで動き、依存するものはない

### 保存する場所 {#output-location}

利用者が指定した場所に保存します。指定がなければ、現在の作業ディレクトリに置きます。
```
./[project-name]-architecture.html
```

### 表示して確かめる {#preview}

保存したら、開き方を利用者に案内します。
```bash
# macOS
open ./my-architecture.html
# Linux
xdg-open ./my-architecture.html
```

## 設計ルールと見た目の決まり {#design-system-visual-language}

### 配色（意味との対応） {#color-palette-semantic-mapping}

塗りは `rgba`、線は 16 進数の色で指定し、要素の種類を色で区別します。

| 要素の種類 | 塗り（rgba） | 線（16 進数） |
| :--- | :--- | :--- |
| **フロントエンド** | `rgba(8, 51, 68, 0.4)` | `#22d3ee` (cyan-400) |
| **バックエンド** | `rgba(6, 78, 59, 0.4)` | `#34d399` (emerald-400) |
| **データベース** | `rgba(76, 29, 149, 0.4)` | `#a78bfa` (violet-400) |
| **AWS / クラウド** | `rgba(120, 53, 15, 0.3)` | `#fbbf24` (amber-400) |
| **セキュリティ** | `rgba(136, 19, 55, 0.4)` | `#fb7185` (rose-400) |
| **メッセージバス** | `rgba(251, 146, 60, 0.3)` | `#fb923c` (orange-400) |
| **外部** | `rgba(30, 41, 59, 0.5)` | `#94a3b8` (slate-400) |

### 文字と背景 {#typography-background}
- **フォント:** JetBrains Mono（等幅）。Google Fonts から読み込みます
- **文字の大きさ:** 12px（名前）、9px（補助ラベル）、8px（注記）、7px（ごく小さいラベル）
- **背景:** slate-950（`#020617`）に、40px の控えめなグリッド模様

```svg
<!-- Background Grid Pattern -->
<pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" stroke-width="0.5"/>
</pattern>
```

## 実装の細かい点 {#technical-implementation-details}

### 要素の描き方 {#component-rendering}
要素は角を丸めた長方形（`rx="6"`）で、線の太さは 1.5px です。半透明の塗りの向こうに矢印が透けて見えないよう、**長方形を二重に重ねる**手法を使います。
1. 不透明な背景の長方形（`#0f172a`）を描く
2. その上に、半透明の色を付けた長方形を重ねる

### 線のつなぎ方 {#connection-rules}
- **重なりの順番:** 矢印は SVG の*早い*位置（グリッドの直後）に描き、要素の箱の背面に来るようにします
- **矢じり:** SVG のマーカーで定義します
- **セキュリティの流れ:** 破線を使い、色は rose（`#fb7185`）にします
- **囲い:**
  - *セキュリティグループ:* 破線（`4,4`）、rose 色
  - *リージョン:* 大きめの破線（`8,4`）、amber 色、`rx="12"`

### 間隔と配置の考え方 {#spacing-layout-logic}
- **標準の高さ:** 60px（サービス）、80〜120px（大きい要素）
- **縦の間隔:** 要素どうしは最低 40px あける
- **メッセージバス:** サービスに重ねず、サービスとサービスの*あいだ*に置くこと
- **凡例の位置:** **ここは特に大事です。** すべての囲いの外に置いてください。囲いの中でいちばん下の Y 座標を計算し、そこから最低 20px 下に凡例を置きます。

## 文書の組み立て {#document-structure}

できあがる HTML ファイルは、4 つの部分でできています。
1. **ヘッダー:** 点滅する丸印の付いたタイトルと副題
2. **本体の SVG:** 角を丸めた枠のカードの中に置いた図
3. **まとめのカード:** 図の下に、概要を書いた 3 枚のカードを並べる
4. **フッター:** 最小限の情報

### 情報カードの書き方 {#info-card-pattern}
```html
<div class="card">
  <div class="card-header">
    <div class="card-dot cyan"></div>
    <h3>Title</h3>
  </div>
  <ul>
    <li>• Item one</li>
    <li>• Item two</li>
  </ul>
</div>
```

## 出来上がりに求めること {#output-requirements}
- **ファイルは 1 つ:** それだけで完結する `.html` ファイル 1 本
- **外部に依存しない:** CSS も SVG もすべて埋め込む（Google Fonts だけは例外）
- **JavaScript を使わない:** 点滅する丸印などの動きは CSS だけで作る
- **互換性:** 最近のブラウザならどれでも正しく表示されること

## テンプレートの参照 {#template-reference}

正確な構成、CSS、SVG の要素の例は、テンプレートの HTML 全文を読み込んで確かめてください。

```
skill_view(name="architecture-diagram", file_path="templates/template.html")
```

テンプレートには、要素の種類（フロントエンド、バックエンド、データベース、クラウド、セキュリティ）、矢印の書き方（実線、破線、曲線）、セキュリティグループ、リージョンの囲い、凡例のそれぞれについて動く例が入っています。図を作るときの構成の見本にしてください。
