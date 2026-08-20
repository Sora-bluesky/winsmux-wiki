---
title: "Baoyu Infographic — インフォグラフィック: 21 種類のレイアウト × 21 種類のスタイル (信息图, 可视化)"
description: "インフォグラフィック: 21 種類のレイアウト × 21 種類のスタイル (信息图, 可视化)"
upstream_path: user-guide/skills/bundled/creative/creative-baoyu-infographic.md
upstream_blob: e915f2ce63bd8ebd31e6bddd525a9fae8761ae0b
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/creative/creative-baoyu-infographic
---

# Baoyu Infographic {#baoyu-infographic}

インフォグラフィック: 21 種類のレイアウト × 21 種類のスタイル (信息图, 可视化)。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/creative/baoyu-infographic` |
| バージョン | `1.56.1` |
| 作者 | 宝玉 (JimLiu) |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `infographic`, `visual-summary`, `creative`, `image-generation` |

## 参照: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として見ています。
:::

# インフォグラフィック生成 {#infographic-generator}

[baoyu-infographic](https://github.com/JimLiu/baoyu-skills) を Hermes Agent のツール環境向けに移植したものです。

**レイアウト**（情報の構造）と**スタイル**（見た目の雰囲気）という 2 つの軸があります。どのレイアウトとどのスタイルも自由に組み合わせられます。

## 使いどころ {#when-to-use}

インフォグラフィック、視覚的なまとめ、情報グラフィックの作成を頼まれたとき、あるいは「信息图」「可视化」「高密度信息大图」といった言葉が出たときに、この skill を呼び出します。ユーザーは内容（テキスト、ファイルのパス、URL、テーマ）を渡し、必要に応じてレイアウト・スタイル・縦横比・言語を指定します。

## 指定できるもの {#options}

| 項目 | 値 |
|--------|--------|
| Layout | 21 種類（Layout Gallery を参照）、既定は bento-grid |
| Style | 21 種類（Style Gallery を参照）、既定は craft-handmade |
| Aspect | 名前付き: landscape (16:9)、portrait (9:16)、square (1:1)。任意指定: W:H の比なら何でも（例: 3:4、4:3、2.35:1） |
| Language | en、zh、ja など |

## レイアウト一覧 {#layout-gallery}

| Layout | 向いている用途 |
|--------|----------|
| `linear-progression` | 年表、工程、チュートリアル |
| `binary-comparison` | A 対 B、ビフォーアフター、長所と短所 |
| `comparison-matrix` | 複数の観点での比較 |
| `hierarchical-layers` | ピラミッド、優先度の段階 |
| `tree-branching` | 分類、体系 |
| `hub-spoke` | 中心となる概念と関連項目 |
| `structural-breakdown` | 分解図、断面図 |
| `bento-grid` | 複数のテーマ、全体像（既定） |
| `iceberg` | 表に出ている面と隠れている面 |
| `bridge` | 課題と解決策 |
| `funnel` | コンバージョン、絞り込み |
| `isometric-map` | 空間的な関係 |
| `dashboard` | 指標、KPI |
| `periodic-table` | 分類された集まり |
| `comic-strip` | 物語、場面の連なり |
| `story-mountain` | 筋書きの構造、緊張の起伏 |
| `jigsaw` | 相互につながる要素 |
| `venn-diagram` | 重なり合う概念 |
| `winding-roadmap` | 道のり、節目 |
| `circular-flow` | 循環、繰り返す工程 |
| `dense-modules` | 高密度のモジュール、情報量の多いガイド |

定義の全文は `references/layouts/<layout>.md` にあります。

## スタイル一覧 {#style-gallery}

| Style | 説明 |
|-------|-------------|
| `craft-handmade` | 手描き、紙工作風（既定） |
| `claymation` | 3D の粘土人形、ストップモーション |
| `kawaii` | 日本のかわいい系、パステル |
| `storybook-watercolor` | やわらかい水彩、絵本風 |
| `chalkboard` | 黒板にチョーク |
| `cyberpunk-neon` | ネオンの発光、近未来 |
| `bold-graphic` | アメコミ風、網点 |
| `aged-academia` | 古めかしい科学図版、セピア |
| `corporate-memphis` | フラットなベクター、鮮やかな色 |
| `technical-schematic` | 青焼き図面、設計図 |
| `origami` | 折り紙、幾何学的 |
| `pixel-art` | レトロな 8bit |
| `ui-wireframe` | グレースケールの画面モック |
| `subway-map` | 路線図 |
| `ikea-manual` | 最小限の線画 |
| `knolling` | 整然と並べた平置き撮影 |
| `lego-brick` | ブロック玩具の組み立て |
| `pop-laboratory` | 方眼の設計図、座標の目盛り、実験室のような精密さ |
| `morandi-journal` | 手描きの落書き、暖かみのあるモランディカラー |
| `retro-pop-grid` | 1970 年代のレトロポップ、スイスグリッド、太い輪郭線 |
| `hand-drawn-edu` | マカロン色のパステル、手描きの揺らぎ、棒人間 |

定義の全文は `references/styles/<style>.md` にあります。

## おすすめの組み合わせ {#recommended-combinations}

| 内容の種類 | Layout + Style |
|--------------|----------------|
| 年表・歴史 | `linear-progression` + `craft-handmade` |
| 手順の解説 | `linear-progression` + `ikea-manual` |
| A 対 B | `binary-comparison` + `corporate-memphis` |
| 階層 | `hierarchical-layers` + `craft-handmade` |
| 重なり | `venn-diagram` + `craft-handmade` |
| コンバージョン | `funnel` + `corporate-memphis` |
| 循環 | `circular-flow` + `craft-handmade` |
| 技術系 | `structural-breakdown` + `technical-schematic` |
| 指標 | `dashboard` + `corporate-memphis` |
| 教育向け | `bento-grid` + `chalkboard` |
| 道のり | `winding-roadmap` + `storybook-watercolor` |
| 分類 | `periodic-table` + `bold-graphic` |
| 製品ガイド | `dense-modules` + `morandi-journal` |
| 技術ガイド | `dense-modules` + `pop-laboratory` |
| 流行りのガイド | `dense-modules` + `retro-pop-grid` |
| 教育用の図解 | `hub-spoke` + `hand-drawn-edu` |
| 工程のチュートリアル | `linear-progression` + `hand-drawn-edu` |

既定は `bento-grid` + `craft-handmade` です。

## キーワードによる近道 {#keyword-shortcuts}

ユーザーの入力に次のキーワードが含まれていたら、対応するレイアウトを**自動的に選び**、対応するスタイルをステップ 3 で最有力候補として提示します。一致したキーワードについては、内容からレイアウトを推測する処理を省きます。

近道に **Prompt Notes** があるときは、その内容をステップ 5 で生成するプロンプトに、追加のスタイル指示として書き足します。

| ユーザーのキーワード | Layout | おすすめの Style | 既定の Aspect | Prompt Notes |
|--------------|--------|--------------------|----------------|--------------|
| 高密度信息大图 / high-density-info | `dense-modules` | `morandi-journal`, `pop-laboratory`, `retro-pop-grid` | portrait | — |
| 信息图 / infographic | `bento-grid` | `craft-handmade` | landscape | ミニマルに。すっきりした画面、余白をたっぷり、複雑な背景テクスチャなし。単純な漫画的要素とアイコンだけ。 |

## 出力の構成 {#output-structure}

<!-- ascii-guard-ignore -->
```
infographic/{topic-slug}/
├── source-{slug}.{ext}
├── analysis.md
├── structured-content.md
├── prompts/infographic.md
└── infographic.png
```
<!-- ascii-guard-ignore-end -->

slug はテーマから 2〜4 語をケバブケースにしたものです。重複したときは `-YYYYMMDD-HHMMSS` を末尾に足します。

## 基本の考え方 {#core-principles}

- 元データを忠実に残します。要約も言い換えもしません（ただし**認証情報・API キー・トークン・秘密の値は取り除いてから**出力に含めます）
- 内容を組み立てる前に、学習の目標を定めます
- 視覚的に伝わる形に構造化します（見出し、ラベル、図的要素）

## 進め方 {#workflow}

### ステップ 1: 内容を分析する {#step-1-analyze-content}

**参照ファイルの読み込み**: この skill の `references/analysis-framework.md` を読みます。

1. 元の内容を保存します（ファイルのパス、または貼り付けた文章を `write_file` で `source.md` に書き出します）
   - **バックアップの決まり**: `source.md` があるときは `source-backup-YYYYMMDD-HHMMSS.md` に改名します
2. 分析します: テーマ、データの種類、複雑さ、トーン、読み手
3. 元の言語とユーザーの言語を判定します
4. ユーザーの入力からデザイン上の指示を抜き出します
5. 分析結果を `analysis.md` に保存します
   - **バックアップの決まり**: `analysis.md` があるときは `analysis-backup-YYYYMMDD-HHMMSS.md` に改名します

書式の詳細は `references/analysis-framework.md` を参照してください。

### ステップ 2: 構造化した内容を作る → `structured-content.md` {#step-2-generate-structured-content-structured-contentmd}

内容をインフォグラフィックの構造に変換します。
1. タイトルと学習の目標
2. 各セクション（中心となる概念、内容（原文のまま）、図的要素、文字ラベル）
3. データの要点（統計や引用はすべて正確に写します）
4. ユーザーからのデザイン上の指示

**決まりごと**: Markdown のみ。新しい情報は加えません。データは忠実に保ちます。認証情報や秘密の値は出力から取り除きます。

書式の詳細は `references/structured-content-template.md` を参照してください。

### ステップ 3: 組み合わせを提案する {#step-3-recommend-combinations}

**3.1 まずキーワードの近道を確認します**: ユーザーの入力が **Keyword Shortcuts** の表のキーワードと一致したら、対応するレイアウトを自動で選び、対応するスタイルを最有力候補として提示します。内容からレイアウトを推測する処理は省きます。

**3.2 一致しなければ**、次をもとにレイアウト×スタイルの組み合わせを 3〜5 案挙げます。
- データの構造 → 合うレイアウト
- 内容のトーン → 合うスタイル
- 読み手の期待
- ユーザーからのデザイン上の指示

### ステップ 4: 選択肢を確認する {#step-4-confirm-options}

`clarify` ツールでユーザーに確認します。`clarify` は一度に 1 問しか扱えないので、いちばん重要なものから聞きます。

**Q1 — 組み合わせ**: レイアウト×スタイルの案を 3 つ以上、理由を添えて提示します。ひとつ選んでもらいます。

**Q2 — 縦横比**: 希望する縦横比を聞きます（landscape / portrait / square、または任意の W:H）。

**Q3 — 言語**（元の言語とユーザーの言語が違うときだけ）: 文字をどの言語にするか聞きます。

### ステップ 5: プロンプトを作る → `prompts/infographic.md` {#step-5-generate-prompt-promptsinfographicmd}

**バックアップの決まり**: `prompts/infographic.md` があるときは `prompts/infographic-backup-YYYYMMDD-HHMMSS.md` に改名します。

**参照ファイルの読み込み**: 選ばれたレイアウトを `references/layouts/<layout>.md` から、スタイルを `references/styles/<style>.md` から読みます。

次を組み合わせます。
1. `references/layouts/<layout>.md` のレイアウト定義
2. `references/styles/<style>.md` のスタイル定義
3. `references/base-prompt.md` の基本テンプレート
4. ステップ 2 で作った構造化済みの内容
5. 確認した言語で書いたすべての文字

`{{ASPECT_RATIO}}` に入れる**縦横比の決め方**は次のとおりです。
- 名前付きのプリセット → 比の文字列にします: landscape→`16:9`、portrait→`9:16`、square→`1:1`
- 任意の W:H の比 → そのまま使います（例: `3:4`、`4:3`、`2.35:1`）

組み上げたプロンプトを `write_file` で `prompts/infographic.md` に保存します。

### ステップ 6: 画像を生成する {#step-6-generate-image}

ステップ 5 で組み上げたプロンプトを使い、`image_generate` ツールを呼びます。

- 縦横比を image_generate の形式に対応づけます: `16:9` → `landscape`、`9:16` → `portrait`、`1:1` → `square`
- 任意の比のときは、いちばん近い名前付きの縦横比を選びます
- 失敗したら 1 回だけ自動で再試行します
- できあがった画像の URL やパスを、出力先のディレクトリに保存します

### ステップ 7: 結果をまとめる {#step-7-output-summary}

テーマ、レイアウト、スタイル、縦横比、言語、出力先のパス、作成したファイルを報告します。

## 参照ファイル {#references}

- `references/analysis-framework.md` — 分析の進め方
- `references/structured-content-template.md` — 内容の書式
- `references/base-prompt.md` — プロンプトのテンプレート
- `references/layouts/<layout>.md` — 21 種類のレイアウト定義
- `references/styles/<style>.md` — 21 種類のスタイル定義

## 落とし穴 {#pitfalls}

1. **データの正確さが何より大事** — 元の統計を要約したり言い換えたり変えたりしないでください。「73% 増加」は「大幅に増加」ではなく「73% 増加」のままにします。
2. **秘密の値を取り除く** — 出力ファイルに含める前に、元の内容に API キー・トークン・認証情報がないか必ず調べます。
3. **1 セクションに 1 メッセージ** — インフォグラフィックの各セクションは、はっきりした概念をひとつだけ伝えます。詰め込みすぎると読みにくくなります。
4. **スタイルの一貫性** — 参照ファイルのスタイル定義を、インフォグラフィック全体に一貫して当てはめます。複数のスタイルを混ぜないでください。
5. **image_generate の縦横比** — このツールが対応しているのは `landscape`、`portrait`、`square` だけです。`3:4` のような任意の比は、いちばん近いもの（この場合は portrait）に対応づけます。
