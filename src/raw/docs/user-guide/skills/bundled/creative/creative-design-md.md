---
title: "Design Md — Google の DESIGN.md トークン仕様ファイルを書く・検査する・書き出す"
description: "Google の DESIGN.md トークン仕様ファイルを書く・検査する・書き出す"
upstream_path: user-guide/skills/bundled/creative/creative-design-md.md
upstream_blob: 2e83398a2c311e8f2cb639f0c7596c05f48dfb3e
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/creative/creative-design-md
---

# Design Md {#design-md}

Google の DESIGN.md トークン仕様ファイルを書く・検査する・書き出すための skill です。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/creative/design-md` |
| バージョン | `1.1.0` |
| 作者 | Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `design`, `design-system`, `tokens`, `ui`, `accessibility`, `wcag`, `tailwind`, `dtcg`, `google` |
| 関連 skill | [`popular-web-designs`](/hermes/docs/user-guide/skills/bundled/creative/creative-popular-web-designs/), [`claude-design`](/hermes/docs/user-guide/skills/bundled/creative/creative-claude-design/), [`excalidraw`](/hermes/docs/user-guide/skills/bundled/creative/creative-excalidraw/), [`architecture-diagram`](/hermes/docs/user-guide/skills/bundled/creative/creative-architecture-diagram/) |

## 参照: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として見ています。
:::

# DESIGN.md skill {#designmd-skill}

DESIGN.md は、見た目の方向性をコーディングエージェントに伝えるための Google の公開仕様
（Apache-2.0、`google-labs-code/design.md`）です。1 つのファイルに次の 2 つが同居します。

- **YAML のフロントマター** — 機械が読むデザイントークン（正式な値）
- **Markdown の本文** — 人が読むための理由づけ。決められた節の並びで書きます

トークンは正確な値を示します。文章のほうは、その値がなぜそうなのか、どう当てはめるのかを
エージェントに伝えます。CLI（`npx @google/design.md`）は構造と WCAG のコントラストを検査し、
版どうしを比べて後退がないか見て、Tailwind や W3C DTCG の JSON に書き出します。

## この skill を使うとき {#when-to-use-this-skill}

- DESIGN.md ファイル、デザイントークン、デザインシステムの仕様がほしいと言われたとき
- 複数のプロジェクトやツールで UI やブランドの見た目を揃えたいとき
- 既存の DESIGN.md を貼られて、検査・比較・書き出し・追記を頼まれたとき
- スタイルガイドを、エージェントが読める形に移し替えたいと言われたとき
- 配色について、コントラストや WCAG の観点で確認したいと言われたとき

見た目の着想やレイアウトの実例だけがほしい場合は、代わりに `popular-web-designs` を
使ってください。使い捨ての HTML 成果物（試作、スライド、ランディングページ、コンポーネントの実験場）を
ゼロから作るときの *進め方と美意識* には `claude-design` を使います。この skill が扱うのは、
*仕様ファイルそのもの* です。

## ファイルの構成 {#file-anatomy}

```md
---
version: alpha
name: Heritage
description: Architectural minimalism meets journalistic gravitas.
colors:
  primary: "#1A1C1E"
  secondary: "#6C7278"
  tertiary: "#B8422E"
  neutral: "#F7F5F2"
typography:
  h1:
    fontFamily: Public Sans
    fontSize: 3rem
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  body-md:
    fontFamily: Public Sans
    fontSize: 1rem
rounded:
  sm: 4px
  md: 8px
  lg: 16px
spacing:
  sm: 8px
  md: 16px
  lg: 24px
components:
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.sm}"
    padding: 12px
  button-primary-hover:
    backgroundColor: "{colors.primary}"
---

## Overview

Architectural Minimalism meets Journalistic Gravitas...

## Colors

- **Primary (#1A1C1E):** Deep ink for headlines and core text.
- **Tertiary (#B8422E):** "Boston Clay" — the sole driver for interaction.

## Typography

Public Sans for everything except small all-caps labels...

## Components

`button-primary` is the only high-emphasis action on a page...
```

## トークンの種類 {#token-types}

| 種類 | 書き方 | 例 |
|------|--------|---------|
| 色 | CSS の色ならどれでも（16 進数、`rgb()`、`oklch()`、色名） | `"#1A1C1E"`, `"oklch(62% 0.18 250)"` |
| 寸法 | 数値 + 単位（`px`、`em`、`rem`） | `48px`, `-0.02em` |
| トークン参照 | `{path.to.token}` | `{colors.primary}` |
| 文字組み | `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`, `fontFeature`, `fontVariation` を持つオブジェクト | 上の例を参照 |

コンポーネントで使えるプロパティは `backgroundColor`、`textColor`、`typography`、
`rounded`、`padding`、`size`、`height`、`width` に限られます。状態違い（hover、active、
pressed）は入れ子にせず、**別々のコンポーネント項目** として、名前を関連づけて書きます
（`button-primary-hover` のように）。

## 節の正式な並び順 {#canonical-section-order}

節はどれも任意ですが、書くのであればこの順に並べてください。並びが崩れていると
linter が指摘します（`section-order`、警告）。見出しの重複も同様です。仕様上、
読み手側は重複を受け付けないので、どちらもファイルを返す前に直してください。

1. Overview（別名: Brand & Style）
2. Colors
3. Typography
4. Layout（別名: Layout & Spacing）
5. Elevation & Depth（別名: Elevation）
6. Shapes
7. Components
8. Do's and Don'ts

一覧にない節はエラーにはならず、そのまま残ります。一覧にないトークン名も、値の種類が正しければ
受け付けられます。一覧にないコンポーネントのプロパティは警告になります。

## 手順: DESIGN.md を新しく書く {#workflow-authoring-a-new-designmd}

1. **利用者に聞く**（あるいは読み取る）— ブランドの雰囲気、アクセントの色、文字組みの
   方向性です。サイトや画像、雰囲気を渡されたら、それを上のトークンの形に置き換えます。
2. **`DESIGN.md` を書く** — `write_file` でプロジェクトの直下に置きます。`name:` と
   `colors:` は必ず入れてください。ほかの節は任意ですが、あると助かります。
3. **トークン参照を使う** — `components:` の節では 16 進数を書き直さず、
   `{colors.primary}` のように書きます。配色の出どころが 1 か所にまとまります。
4. **検査する**（下記参照）。参照の切れや WCAG の不合格は、ファイルを返す前に直します。
5. **既存のプロジェクトがあるなら**、Tailwind や DTCG への書き出しも隣に置いておきます
   （`tailwind.theme.json`、`tokens.json`）。

## 手順: 検査・比較・書き出し {#workflow-lint-diff-export}

CLI は `@google/design.md`（Node 製）です。`npx` を使えば global に入れる必要はありません。

```bash
# Validate structure + token references + WCAG contrast
npx -y @google/design.md lint DESIGN.md

# Compare two versions, fail on regression (exit 1 = regression)
npx -y @google/design.md diff DESIGN.md DESIGN-v2.md

# Export to Tailwind v3 theme JSON (`tailwind` is a back-compat alias)
npx -y @google/design.md export --format json-tailwind DESIGN.md > tailwind.theme.json

# Export to a Tailwind v4 CSS @theme block (--color-*, --text-*, --radius-*, ...)
npx -y @google/design.md export --format css-tailwind DESIGN.md > theme.css

# Export to W3C DTCG (Design Tokens Format Module) JSON
npx -y @google/design.md export --format dtcg DESIGN.md > tokens.json

# Print the spec itself — useful when injecting into an agent prompt
npx -y @google/design.md spec --rules-only --format json
```

どのコマンドも `-` を渡せば標準入力から読みます。`lint` はエラーがあると終了コード 1 を返します
（警告だけなら 0 です）。`export` は元のファイルに検査上の問題があっても、書き出しに成功すれば 0 で
終わります。そこで止めたいなら `lint` を別に実行してください。出力は既定で JSON なので、
結果を構造的に伝えたいときはそのまま解析できます。

Windows では、`design.md` という実行ファイル名が `.md` の関連付けとぶつかることがあります
（何も起きない、あるいはファイルがエディタで開く）。ドットなしの別名を使ってください:
`npx -y -p @google/design.md designmd lint DESIGN.md`。

### lint ルール一覧（CLI 0.3.0 時点の 9 個） {#lint-rule-reference-the-9-rules-as-of-cli-030}

- `broken-ref`（エラー）— `{colors.missing}` が存在しないトークンを指している
- `contrast-ratio`（警告）— コンポーネントの `textColor` と `backgroundColor` の比が
  WCAG AA（4.5:1）を下回っている
- `missing-primary`（警告）— 色は定義されているのに `primary` トークンがない
- `missing-typography`（警告）— 色は定義されているのに文字組みのトークンがない
- `orphaned-tokens`（警告）— どのコンポーネントからも参照されていない色トークンがある
- `section-order`（警告）— 節が正式な並び順から外れている
- `unknown-key`（警告）— 最上位の YAML キーが、スキーマ上のキーの打ち間違いに見える
  （`colours:` → `colors:`）。独自に足した拡張用のキーには何も言いません
- `token-summary`、`missing-sections`（情報）— 個数と、書かれていない任意の節

アクセシビリティを気にしている相手なら、まとめのなかでそこを明示的に伝えてください。
WCAG の指摘こそが、この CLI を使う最大の理由です。

## つまずきやすいところ {#pitfalls}

- **コンポーネントの状態違いを入れ子にしないでください。** `button-primary.hover` は誤りで、
  兄弟のキーとして `button-primary-hover` と書くのが正解です。
- **16 進数の色は引用符で囲んだ文字列にします。** そうしないと YAML が `#` でつまずいたり、
  `#1A1C1E` のような値がおかしな形で切れたりします。
- **負の寸法も引用符が要ります。** `letterSpacing: -0.02em` は YAML のフロー扱いになってしまうので、
  `letterSpacing: "-0.02em"` と書いてください。
- **節の並び順は、linter が警告どまりでも守る意味があります。** 文章がばらばらの順で渡されたら、
  保存する前に正式な並びに直してください。仕様に沿った読み手はその順を期待しています。
- **文字組みの下位プロパティの打ち間違いは、黙って捨てられます。** CLI 0.3.0 の時点では
  `fontwight:` のような打ち間違いは何も報告されず、値が書き出しから消えます。下位プロパティの名前は
  スキーマと突き合わせて確かめてください
  （`fontFamily`、`fontSize`、`fontWeight`、`lineHeight`、`letterSpacing`、
  `fontFeature`、`fontVariation`）。
- **`version: alpha` が現在の仕様版です**（2026 年 7 月時点、CLI
  0.3.0）。仕様は alpha と明記されているので、互換性のない変更に注意してください。
- **トークン参照はドット区切りのパスで解決されます。** `{colors.primary}` は通りますが、
  `{primary}` は通りません。

## 仕様の出どころ {#spec-source-of-truth}

- リポジトリ: https://github.com/google-labs-code/design.md （Apache-2.0）
- CLI: npm の `@google/design.md`
- 生成される DESIGN.md ファイルのライセンス: 利用者のプロジェクトに合わせてください。
  仕様そのものは Apache-2.0 です。
