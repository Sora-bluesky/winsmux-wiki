---
title: "ダッシュボードを広げる"
description: "Hermes の Web ダッシュボード向けにテーマとプラグインを作ります — 配色、書体、レイアウト、独自のタブ、外枠のスロット、ページごとのスロット、そして裏側の API ルート"
upstream_path: user-guide/features/extending-the-dashboard.md
upstream_blob: 50f4958b12bf26d6f2b217570c51517c3314beca
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/extending-the-dashboard
---

# ダッシュボードを広げる {#extending-the-dashboard}

Hermes の Web ダッシュボード（`hermes dashboard`）は、コードを分岐させなくても見た目を変えたり機能を足したりできるように作られています。開かれている層は3つです。

1. **テーマ** — ダッシュボードの配色、書体、レイアウト、部品ごとの装飾を塗り替える YAML ファイルです。`~/.hermes/dashboard-themes/` にファイルを置くと、テーマの切り替え一覧に現れます。
2. **UI プラグイン** — `manifest.json` と JavaScript のバンドルを収めたディレクトリです。タブを1つ足したり、組み込みのページを差し替えたり、ページごとのスロットで補ったり、名前の付いた外枠のスロットに部品を差し込んだりします。
3. **裏側のプラグイン** — そのプラグインのディレクトリに置く Python ファイルで、FastAPI の `router` を公開します。ルートは `/api/plugins/<name>/` の下に載り、プラグインの UI から呼び出せます。

3つとも**動かしたまま置くだけ**で効きます。リポジトリを複製する必要も、`npm run build` を走らせる必要も、ダッシュボードの元のコードに手を入れる必要もありません。このページが3つすべての拠り所になります。

ダッシュボードをただ使いたいだけなら [Web ダッシュボード](/hermes/docs/user-guide/features/web-dashboard/)をご覧ください。端末の CLI の見た目を変えたい（Web ダッシュボードではない）場合は[スキンとテーマ](/hermes/docs/user-guide/features/skins/)へどうぞ — CLI のスキンの仕組みは、ダッシュボードのテーマとは別物です。

:::note デスクトップアプリの話ではありません
このページが扱うのは、**Web ダッシュボード**（`hermes dashboard`）のプラグインの仕組みです — `window.__HERMES_PLUGIN_SDK__` と `manifest.json`、そして組み立て済みの JS バンドルを使います。**デスクトップアプリ**（`hermes desktop`）にはこれとは無関係の別の SDK があり — `@hermes/plugin-sdk` という ESM ファイル1つで、組み立ての手順は要りません — [デスクトップのプラグイン SDK](/hermes/docs/developer-guide/desktop-plugin-sdk/)で説明しています。両者で共通なのは、裏側の `plugin_api.py` の名前空間（`/api/plugins/<name>`）だけです。
:::

:::note それぞれがどう噛み合うか
テーマとプラグインは独立していますが、組み合わせると力を発揮します。テーマはそれ単体で成り立ちます（YAML ファイル1つ）。プラグインもそれ単体で成り立ちます（タブ1つ）。両方そろえば、独自の計器盤を備えた見た目まるごとの塗り替えが作れます — 例として挙げる `strike-freedom-cockpit` のデモ（`hermes-example-plugins` という別リポジトリに置いてあります。導入の手順は[テーマとプラグインを組み合わせたデモ](#combined-theme--plugin-demo)をご覧ください）がまさにそれです。
:::

---

## 目次 {#table-of-contents}

- [テーマ](#themes)
  - [手早く試す — 最初のテーマ](#quick-start--your-first-theme)
  - [配色、書体、レイアウト](#palette-typography-layout)
  - [レイアウトの型](#layout-variants)
  - [テーマの素材（画像を CSS 変数として渡す）](#theme-assets-images-as-css-vars)
  - [部品の装飾の上書き](#component-chrome-overrides)
  - [色の上書き](#color-overrides)
  - [生の `customCSS`](#raw-customcss)
  - [組み込みのテーマ](#built-in-themes)
  - [テーマ YAML の全項目](#full-theme-yaml-reference)
- [プラグイン](#plugins)
  - [手早く試す — 最初のプラグイン](#quick-start--your-first-plugin)
  - [ディレクトリの構成](#directory-layout)
  - [マニフェストの全項目](#manifest-reference)
  - [プラグイン SDK](#the-plugin-sdk)
  - [外枠のスロット](#shell-slots)
  - [組み込みページの差し替え（`tab.override`）](#replacing-built-in-pages-taboverride)
  - [組み込みページへの追加（ページごとのスロット）](#augmenting-built-in-pages-page-scoped-slots)
  - [スロットだけのプラグイン（`tab.hidden`）](#slot-only-plugins-tabhidden)
  - [裏側の API ルート](#backend-api-routes)
  - [プラグインごとの独自 CSS](#custom-css-per-plugin)
  - [プラグインの見つけ方と読み直し](#plugin-discovery--reload)
- [テーマとプラグインを組み合わせたデモ](#combined-theme--plugin-demo)
- [API の一覧](#api-reference)
- [困ったときは](#troubleshooting)

---

## テーマ {#themes}

テーマは `~/.hermes/dashboard-themes/` に置く YAML ファイルです。ファイル名は何でもかまいませんが（システムが見ているのはテーマの `name:` の値です）、慣例としては `<name>.yaml` にします。どの項目も省略できて、書かれていないものは組み込みの `default` テーマの値になります。ですから、色1つだけのテーマでも成り立ちます。

### 手早く試す — 最初のテーマ {#quick-start-your-first-theme}

```bash
mkdir -p ~/.hermes/dashboard-themes
```

```yaml
# ~/.hermes/dashboard-themes/neon.yaml
name: neon
label: Neon
description: Pure magenta on black

palette:
  background: "#000000"
  midground: "#ff00ff"
```

ダッシュボードを読み直します。ヘッダーのパレットのアイコンを押して **Neon** を選びます。背景が黒くなり、文字と差し色がマゼンタになり、そこから導かれる色（カード、枠線、控えめな色、リングなど）はすべて、その2色の組から CSS の `color-mix()` で計算し直されます。

導入はこれで全部です。ファイル1つ、色2つ。ここから先はすべて、必要なら足せる仕上げの話です。

### 配色、書体、レイアウト {#palette-typography-layout}

この3つのまとまりがテーマの中心です。それぞれ独立しているので、1つだけ上書きして残りは触らない、という書き方ができます。

#### 配色（3層） {#palette-3-layer}

配色は、色の層3つに加えて、温かみのある周辺のぼかしの色と、粒子の粗さの倍率で構成されます。ダッシュボードのデザインシステムは、shadcn と互換のあるトークン（カード、ポップオーバー、控えめな色、枠線、主色、破壊的な操作の色、リングなど）をすべて、この3色から CSS の `color-mix()` で導きます。3色を上書きすれば、UI 全体に効きます。

| キー | 説明 |
|-----|-------------|
| `palette.background` | いちばん奥の下地の色。ふつうは黒に近い色です。ページの背景とカードの塗りを決めます。 |
| `palette.midground` | 主な文字色と差し色。UI の装飾の多くはこれを読みます（本文の文字、ボタンの輪郭、焦点のリング）。 |
| `palette.foreground` | 最前面の強調色。既定のテーマではこれを白の透明度0（見えない状態）にしています。上に明るい差し色を載せたいテーマは、透明度を上げてください。 |
| `palette.warmGlow` | `<Backdrop />` が周辺のぼかしの色として使う `rgba(...)` の文字列です。 |
| `palette.noiseOpacity` | 粒子の重ね合わせにかける0〜1.2の倍率。小さいほど柔らかく、大きいほどざらつきます。 |

どの層も `{hex: "#RRGGBB", alpha: 0.0–1.0}` の形か、16進数の文字列だけ（透明度は1.0になります）のどちらでも書けます。

```yaml
palette:
  background:
    hex: "#05091a"
    alpha: 1.0
  midground: "#d8f0ff"          # bare hex, alpha = 1.0
  foreground:
    hex: "#ffffff"
    alpha: 0                    # invisible top layer
  warmGlow: "rgba(255, 199, 55, 0.24)"
  noiseOpacity: 0.7
```

#### 書体 {#typography}

| キー | 型 | 説明 |
|-----|------|-------------|
| `fontSans` | 文字列 | 本文用の CSS の font-family の並び（`html` と `body` に当たります）。 |
| `fontMono` | 文字列 | コードのかたまり、`<code>`、`.font-mono` に当たる font-family の並び。 |
| `fontDisplay` | 文字列 | 見出し・表示用の並び（任意）。指定がなければ `fontSans` になります。 |
| `fontUrl` | 文字列 | 外部のスタイルシートの URL（任意）。テーマを切り替えたときに `<head>` へ `<link rel="stylesheet">` として差し込まれます。同じ URL が二度差し込まれることはありません。Google Fonts、Bunny Fonts、自前で置いた `@font-face` のシートなど、リンクできるものなら何でも使えます。 |
| `baseSize` | 文字列 | 基準の文字の大きさ — rem の尺度を決めます。`"14px"`、`"16px"` のように書きます。 |
| `lineHeight` | 文字列 | 既定の行の高さ。`"1.5"`、`"1.65"` のように書きます。 |
| `letterSpacing` | 文字列 | 既定の字間。`"0"`、`"0.01em"`、`"-0.01em"` のように書きます。 |

```yaml
typography:
  fontSans: '"Orbitron", "Eurostile", "Impact", sans-serif'
  fontMono: '"Share Tech Mono", ui-monospace, monospace'
  fontDisplay: '"Orbitron", "Eurostile", sans-serif'
  fontUrl: "https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&family=Share+Tech+Mono&display=swap"
  baseSize: "14px"
  lineHeight: "1.5"
  letterSpacing: "0.04em"
```

##### 画面から書体を変える（YAML なし）

ダッシュボードのヘッダーにあるテーマの選択画面には、テーマの一覧の下に
**Font** の欄があります。そこで書体を選ぶと、いま有効なテーマが何であっても
その本文の書体を上書きします — この選択はテーマとは切り離されていて、
テーマを切り替えても残ります（`config.yaml` の `dashboard.font` に保存されます）。
**Theme default** を選べば上書きが消えて、いま有効なテーマ自身の `fontSans` に戻ります。

選択画面が示すのは、選び抜いた一覧です（システムの並びに加えて、sans / serif / mono
それぞれの Google Fonts の書体をいくつか）。書体の URL を自由に打ち込むことは、
あえて**できないようにしています** — 書体のスタイルシートは `<link>` として
差し込まれるので、一覧に絞ることで差し込み元を固定しています。まったく独自の書体を
使いたいときは、上で示したようにテーマの YAML で `fontSans` と `fontUrl` を指定してください。
テーマの `fontMono`（コードのかたまり、端末）は、画面からの上書きでは常にそのまま残ります。

#### レイアウト {#layout}

| キー | 値 | 説明 |
|-----|--------|-------------|
| `radius` | CSS の長さなら何でも（`"0"`、`"0.25rem"`、`"0.5rem"`、`"1rem"` など） | 角の丸みのトークン。`--radius` に対応し、`--radius-sm/md/lg/xl` にも波及するので、丸みのある要素が一斉に変わります。 |
| `density` | `compact` \| `comfortable` \| `spacious` | `--spacing-mul` という CSS 変数として当たる余白の倍率。`compact = 0.85×`、`comfortable = 1.0×`（既定）、`spacious = 1.2×` です。Tailwind の基準の余白を伸び縮みさせるので、内側の余白も要素の間隔も一緒に変わります。 |

```yaml
layout:
  radius: "0"
  density: compact
```

### レイアウトの型 {#layout-variants}

`layoutVariant` は外枠全体のレイアウトを選びます。書かなければ `"standard"` になります。

| 型 | 見え方 |
|---------|-----------|
| `standard` | 1列、最大幅1600px（既定）。 |
| `cockpit` | 左側の細長い枠（260px）と本文。プラグインが `sidebar` スロットから中身を入れます — [外枠のスロット](#shell-slots)をご覧ください。プラグインがなければ、その枠には仮の表示が出ます。 |
| `tiled` | 最大幅の制限を外すので、ページが画面の幅いっぱいを使えます。 |

```yaml
layoutVariant: cockpit
```

いま選ばれている型は `document.documentElement.dataset.layoutVariant` として取り出せるので、`customCSS` に書いた生の CSS から `:root[data-layout-variant="cockpit"] ...` のように狙い撃ちできます。

### テーマの素材（画像を CSS 変数として渡す） {#theme-assets-images-as-css-vars}

テーマに絵の URL を同梱できます。名前を付けた枠はそれぞれ CSS 変数（`--theme-asset-<name>`）になり、組み込みの外枠からも、どのプラグインからも読めます。`bg` の枠は自動で背景に配線され、それ以外の枠はプラグインが使う想定です。

```yaml
assets:
  bg: "https://example.com/hero-bg.jpg"           # auto-wired into <Backdrop />
  hero: "/my-images/strike-freedom.png"           # for plugin sidebars
  crest: "/my-images/crest.svg"                   # for header-left plugins
  logo: "/my-images/logo.png"
  sidebar: "/my-images/rail.png"
  header: "/my-images/header-art.png"
  custom:
    scanLines: "/my-images/scanlines.png"         # → --theme-asset-custom-scanLines
```

値として受け付けるのは次のとおりです。

- URL そのまま — 自動で `url(...)` に包まれます。
- 最初から包んである `url(...)`、`linear-gradient(...)`、`radial-gradient(...)` の式 — そのまま使われます。
- `"none"` — はっきり使わないと示すとき。

どの素材も `--theme-asset-<name>-raw`（包まれていない URL）としても出されます。プラグインが `background-image` ではなく `<img src>` に渡したいときのためです。

プラグインからは、そのままの CSS か JS で読めます。

```javascript
// In a plugin slot
const hero = getComputedStyle(document.documentElement)
  .getPropertyValue("--theme-asset-hero").trim();
```

### 部品の装飾の上書き {#component-chrome-overrides}

`componentStyles` を使うと、CSS のセレクタを書かずに外枠の部品ごとの見た目を変えられます。まとまりの中の各項目は CSS 変数（`--component-<bucket>-<kebab-property>`）になり、外枠の共通の部品がそれを読みます。ですから `card:` はすべての `<Card>` に、`header:` は上部のバーに効きます。

```yaml
componentStyles:
  card:
    clipPath: "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)"
    background: "linear-gradient(180deg, rgba(10, 22, 52, 0.85), rgba(5, 9, 26, 0.92))"
    boxShadow: "inset 0 0 0 1px rgba(64, 200, 255, 0.28)"
  header:
    background: "linear-gradient(180deg, rgba(16, 32, 72, 0.95), rgba(5, 9, 26, 0.9))"
  tab:
    clipPath: "polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)"
  sidebar: {}
  backdrop: {}
  footer: {}
  progress: {}
  badge: {}
  page: {}
```

使えるまとまりは `card`、`header`、`footer`、`sidebar`、`tab`、`progress`、`badge`、`backdrop`、`page` です。

項目名は camelCase で書き（`clipPath`）、kebab（`clip-path`）として出されます。値はただの CSS の文字列で、CSS が受け付けるものなら何でも書けます（`clip-path`、`border-image`、`background`、`box-shadow`、`animation` など）。

### 色の上書き {#color-overrides}

ほとんどのテーマではこれは要りません — 3層の配色から shadcn のトークンはすべて導かれます。`colorOverrides` を使うのは、その導き方では出てこない特定の差し色がほしいときです（淡い色調のテーマに合う柔らかめの警告の赤、ブランド固有の成功の緑など）。

```yaml
colorOverrides:
  primary: "#ffce3a"
  primaryForeground: "#05091a"
  accent: "#3fd3ff"
  ring: "#3fd3ff"
  destructive: "#ff3a5e"
  border: "rgba(64, 200, 255, 0.28)"
```

使えるキーは `card`、`cardForeground`、`popover`、`popoverForeground`、`primary`、`primaryForeground`、`secondary`、`secondaryForeground`、`muted`、`mutedForeground`、`accent`、`accentForeground`、`destructive`、`destructiveForeground`、`success`、`warning`、`border`、`input`、`ring` です。

どのキーも `--color-<kebab>` の CSS 変数と1対1で対応します（たとえば `primaryForeground` は `--color-primary-foreground`）。ここで指定したキーは、いま有効なテーマに限って配色からの導出より優先されます — 別のテーマに切り替えると、その上書きは消えます。

### 生の `customCSS` {#raw-customcss}

`componentStyles` では書き表せないセレクタ単位の装飾 — 擬似要素、アニメーション、メディアクエリ、テーマに限った上書き — は、`customCSS` に生の CSS を書いてください。

```yaml
customCSS: |
  /* Scanline overlay — only visible when cockpit variant is active. */
  :root[data-layout-variant="cockpit"] body::before {
    content: "";
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 100;
    background: repeating-linear-gradient(to bottom,
      transparent 0px, transparent 2px,
      rgba(64, 200, 255, 0.035) 3px, rgba(64, 200, 255, 0.035) 4px);
    mix-blend-mode: screen;
  }
```

この CSS は、テーマを当てるときに `<style data-hermes-theme-css>` という1つのタグにまとめて差し込まれ、テーマを切り替えるときに片づけられます。**1つのテーマにつき32 KiB までです。**

### 組み込みのテーマ {#built-in-themes}

組み込みのテーマはそれぞれ、独自の配色・書体・レイアウトを持っています。切り替えると、色以外のところも目に見えて変わります。

| テーマ | 配色 | 書体 | レイアウト |
|-------|---------|------------|--------|
| **Hermes Teal**（`default`） | 濃い青緑とクリーム | システムの並び、15px | 角の丸み0.5rem、comfortable |
| **Hermes Teal (Large)**（`default-large`） | default と同じ | システムの並び、18px、行の高さ1.65 | 角の丸み0.5rem、spacious |
| **Midnight**（`midnight`） | 深い青紫 | Inter と JetBrains Mono、14px | 角の丸み0.75rem、comfortable |
| **Ember**（`ember`） | 温かみのある深紅と青銅 | Spectral（明朝系）と IBM Plex Mono、15px | 角の丸み0.25rem、comfortable |
| **Mono**（`mono`） | 白黒の濃淡 | IBM Plex Sans と IBM Plex Mono、13px | 角の丸み0、compact |
| **Cyberpunk**（`cyberpunk`） | 黒地に蛍光の緑 | 全体に Share Tech Mono、14px | 角の丸み0、compact |
| **Rosé**（`rose`） | ピンクと象牙色 | Fraunces（明朝系）と DM Mono、16px | 角の丸み1rem、spacious |

Google Fonts を使うテーマ（Hermes Teal 以外すべて）は、必要になったときにスタイルシートを読み込みます — 初めてそのテーマに切り替えたとき、`<head>` に `<link>` のタグが差し込まれます。

### テーマ YAML の全項目 {#full-theme-yaml-reference}

つまみを1つのファイルにすべて並べました — 写して、要らないところを削ってください。

```yaml
# ~/.hermes/dashboard-themes/ocean.yaml
name: ocean
label: Ocean Deep
description: Deep sea blues with coral accents

# 3-layer palette (accepts {hex, alpha} or bare hex)
palette:
  background:
    hex: "#0a1628"
    alpha: 1.0
  midground:
    hex: "#a8d0ff"
    alpha: 1.0
  foreground:
    hex: "#ffffff"
    alpha: 0.0
  warmGlow: "rgba(255, 107, 107, 0.35)"
  noiseOpacity: 0.7

typography:
  fontSans: "Poppins, system-ui, sans-serif"
  fontMono: "Fira Code, ui-monospace, monospace"
  fontDisplay: "Poppins, system-ui, sans-serif"   # optional
  fontUrl: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&family=Fira+Code:wght@400;500&display=swap"
  baseSize: "15px"
  lineHeight: "1.6"
  letterSpacing: "-0.003em"

layout:
  radius: "0.75rem"
  density: comfortable

layoutVariant: standard        # standard | cockpit | tiled

assets:
  bg: "https://example.com/ocean-bg.jpg"
  hero: "/my-images/kraken.png"
  crest: "/my-images/anchor.svg"
  logo: "/my-images/logo.png"
  custom:
    pattern: "/my-images/waves.svg"

componentStyles:
  card:
    boxShadow: "inset 0 0 0 1px rgba(168, 208, 255, 0.18)"
  header:
    background: "linear-gradient(180deg, rgba(10, 22, 40, 0.95), rgba(5, 9, 26, 0.9))"

colorOverrides:
  destructive: "#ff6b6b"
  ring: "#ff6b6b"

customCSS: |
  /* Any additional selector-level tweaks */
```

ファイルを作ったらダッシュボードを読み直します。テーマは上部のバーからその場で切り替えられます — パレットのアイコンを押してください。選んだ内容は `config.yaml` の `dashboard.theme` に保存され、読み直したときに元に戻ります。

---

## プラグイン {#plugins}

ダッシュボードのプラグインは、`manifest.json` と組み立て済みの JS バンドル、そして必要なら CSS ファイルと FastAPI のルートを書いた Python ファイルを収めたディレクトリです。プラグインは他の Hermes のプラグインと並んで `~/.hermes/plugins/<name>/` に置きます — ダッシュボード向けの部分は、そのプラグインのディレクトリの中の `dashboard/` という下位のフォルダなので、1つのプラグインを入れるだけで CLI やゲートウェイとダッシュボードの両方を広げられます。

プラグインは React や UI の部品を同梱しません。`window.__HERMES_PLUGIN_SDK__` に出ている **プラグイン SDK** を使います。おかげでプラグインのバンドルはとても小さく（ふつうは数 KB）、版の食い違いも起きません。

### 手早く試す — 最初のプラグイン {#quick-start-your-first-plugin}

ディレクトリの骨組みを作ります。

```bash
mkdir -p ~/.hermes/plugins/my-plugin/dashboard/dist
```

マニフェストを書きます。

```json
// ~/.hermes/plugins/my-plugin/dashboard/manifest.json
{
  "name": "my-plugin",
  "label": "My Plugin",
  "icon": "Sparkles",
  "version": "1.0.0",
  "tab": {
    "path": "/my-plugin",
    "position": "after:skills"
  },
  "entry": "dist/index.js"
}
```

JS のバンドルを書きます（ただの IIFE で、組み立ての手順は要りません）。

```javascript
// ~/.hermes/plugins/my-plugin/dashboard/dist/index.js
(function () {
  "use strict";

  const SDK = window.__HERMES_PLUGIN_SDK__;
  const { React } = SDK;
  const { Card, CardHeader, CardTitle, CardContent } = SDK.components;

  function MyPage() {
    return React.createElement(Card, null,
      React.createElement(CardHeader, null,
        React.createElement(CardTitle, null, "My Plugin"),
      ),
      React.createElement(CardContent, null,
        React.createElement("p", { className: "text-sm text-muted-foreground" },
          "Hello from my custom dashboard tab.",
        ),
      ),
    );
  }

  window.__HERMES_PLUGINS__.register("my-plugin", MyPage);
})();
```

ダッシュボードを読み直すと、**Skills** の後ろに自分のタブが並びます。

:::tip React.createElement を書かずに済ませる
JSX のほうが好みなら、React を外部依存にして IIFE 形式で出力できるバンドラー（esbuild、Vite、rollup など）を使ってください。外せない条件は、最終的な成果物が `<script>` で読み込める1つの JS ファイルであることだけです。React は決して同梱されず、`SDK.React` から渡されます。
:::

### ディレクトリの構成 {#directory-layout}

```
~/.hermes/plugins/my-plugin/
├── plugin.yaml              # optional — existing CLI/gateway plugin manifest
├── __init__.py              # optional — existing CLI/gateway hooks
└── dashboard/               # dashboard extension
    ├── manifest.json        # required — tab config, icon, entry point
    ├── dist/
    │   ├── index.js         # required — pre-built JS bundle (IIFE)
    │   └── style.css        # optional — custom CSS
    └── plugin_api.py        # optional — backend API routes (FastAPI)
```

1つのプラグインのディレクトリは、互いに独立した3つの広げ方を同時に持てます。

- `plugin.yaml` と `__init__.py` — CLI やゲートウェイ向けのプラグイン（[プラグインのページ](/hermes/docs/user-guide/features/plugins/)をご覧ください）。
- `dashboard/manifest.json` と `dashboard/dist/index.js` — ダッシュボードの UI プラグイン。
- `dashboard/plugin_api.py` — ダッシュボードの裏側のルート。

どれも必須ではありません。必要な層だけ入れてください。

### マニフェストの全項目 {#manifest-reference}

```json
{
  "name": "my-plugin",
  "label": "My Plugin",
  "description": "What this plugin does",
  "icon": "Sparkles",
  "version": "1.0.0",
  "tab": {
    "path": "/my-plugin",
    "position": "after:skills",
    "override": "/",
    "hidden": false
  },
  "slots": ["sidebar", "header-left"],
  "entry": "dist/index.js",
  "css": "dist/style.css",
  "api": "plugin_api.py"
}
```

| 項目 | 必須 | 説明 |
|-------|----------|-------------|
| `name` | はい | プラグインを見分ける名前。小文字で、ハイフンも使えます。URL と登録に使われます。 |
| `label` | はい | ナビゲーションのタブに出る表示名。 |
| `description` | いいえ | 短い説明（ダッシュボードの管理画面に出ます）。 |
| `icon` | いいえ | Lucide のアイコン名。既定は `Puzzle` です。知らない名前は `Puzzle` になります。 |
| `version` | いいえ | Semver の文字列。既定は `0.0.0` です。 |
| `tab.path` | はい | そのタブの URL のパス（たとえば `/my-plugin`）。 |
| `tab.position` | いいえ | タブを差し込む位置。`"end"`（既定）、`"after:<path>"`、`"before:<path>"` のいずれかで、コロンの後ろの値は相手のタブの**パスの一部分**です（先頭のスラッシュは書きません）。例: `"after:skills"`、`"before:config"`。 |
| `tab.override` | いいえ | 組み込みの経路のパス（`"/"`、`"/sessions"`、`"/config"` など）を指定すると、新しいタブを足すのではなくそのページを**差し替え**ます。[組み込みページの差し替え](#replacing-built-in-pages-taboverride)をご覧ください。 |
| `tab.hidden` | いいえ | true にすると、ナビゲーションにタブを足さずに、部品とスロットだけを登録します。スロットだけのプラグインで使います。[スロットだけのプラグイン](#slot-only-plugins-tabhidden)をご覧ください。 |
| `slots` | いいえ | このプラグインが中身を入れる、名前の付いた外枠のスロット。**書いておくのは説明のためだけ**で、実際の登録は JS のバンドルから `registerSlot()` で行います。ここに並べておくと、一覧の画面がわかりやすくなります。 |
| `entry` | はい | `dashboard/` から見た JS バンドルの場所。既定は `dist/index.js` です。 |
| `css` | いいえ | `<link>` タグとして差し込む CSS ファイルの場所。 |
| `api` | いいえ | FastAPI のルートを書いた Python ファイルの場所。`/api/plugins/<name>/` の下に載ります。 |

#### 使えるアイコン {#available-icons}

プラグインは Lucide のアイコン名を使います。ダッシュボードは名前で対応づけていて、知らない名前は黙って `Puzzle` になります。

いま対応づけてあるのは `Activity`、`BarChart3`、`Clock`、`Code`、`Database`、`Eye`、`FileText`、`Globe`、`Heart`、`KeyRound`、`MessageSquare`、`Package`、`Puzzle`、`Settings`、`Shield`、`Sparkles`、`Star`、`Terminal`、`Wrench`、`Zap` です。

別のアイコンがほしいときは、`web/src/App.tsx` の `ICON_MAP` に足す PR を出してください — 足すだけの変更です。

### プラグイン SDK {#the-plugin-sdk}

プラグインに必要なものはすべて `window.__HERMES_PLUGIN_SDK__` にあります。プラグインが React を直接読み込むことは決してありません。

```javascript
const SDK = window.__HERMES_PLUGIN_SDK__;

// React + hooks
SDK.React                    // the React instance
SDK.hooks.useState
SDK.hooks.useEffect
SDK.hooks.useCallback
SDK.hooks.useMemo
SDK.hooks.useRef
SDK.hooks.useContext
SDK.hooks.createContext

// UI components (shadcn/ui primitives)
SDK.components.Card
SDK.components.CardHeader
SDK.components.CardTitle
SDK.components.CardContent
SDK.components.Badge
SDK.components.Button
SDK.components.Input
SDK.components.Label
SDK.components.Select
SDK.components.SelectOption
SDK.components.Separator
SDK.components.Tabs
SDK.components.TabsList
SDK.components.TabsTrigger
SDK.components.PluginSlot    // render a named slot (useful for nested plugin UIs)

// Hermes API client + raw fetcher
SDK.api                      // typed client — getStatus, getSessions, getConfig, ...
SDK.fetchJSON                // raw fetch for custom endpoints (plugin-registered routes)

// Utilities
SDK.utils.cn                 // Tailwind class merger (clsx + twMerge)
SDK.utils.timeAgo            // "5m ago" from unix timestamp
SDK.utils.isoTimeAgo         // "5m ago" from ISO string

// Hooks
SDK.useI18n                  // i18n hook for multi-language plugins
```

#### 自分のプラグインの裏側を呼ぶ {#calling-your-plugins-backend}

```javascript
SDK.fetchJSON("/api/plugins/my-plugin/data")
  .then((data) => console.log(data))
  .catch((err) => console.error("API call failed:", err));
```

`fetchJSON` はセッションの認証トークンを添え、失敗は例外として投げ、JSON も自動で読み解きます。

#### Hermes の組み込みのエンドポイントを呼ぶ {#calling-built-in-hermes-endpoints}

```javascript
// Agent status
SDK.api.getStatus().then((s) => console.log("Version:", s.version));

// Recent sessions
SDK.api.getSessions(10).then((resp) => console.log(resp.sessions.length));
```

すべての一覧は [Web ダッシュボード → REST API](/hermes/docs/user-guide/features/web-dashboard/#rest-api) をご覧ください。

### 外枠のスロット {#shell-slots}

スロットを使うと、プラグインはタブを丸ごと持たなくても、アプリの外枠の決まった場所 — コックピットの脇の枠、ヘッダー、フッター、いちばん上に重なる層 — に部品を差し込めます。同じスロットに複数のプラグインが入ることもでき、その場合は登録した順に積み上がって表示されます。

プラグインのバンドルの中から登録します。

```javascript
window.__HERMES_PLUGINS__.registerSlot("my-plugin", "sidebar", MySidebar);
window.__HERMES_PLUGINS__.registerSlot("my-plugin", "header-left", MyCrest);
```

#### スロットの一覧 {#slot-catalogue}

**外枠全体のスロット**（アプリの枠のどこにでも出るもの）:

| スロット | 場所 |
|------|----------|
| `backdrop` | `<Backdrop />` の重なりの中、粒子の層の上。 |
| `header-left` | 上部のバーの、Hermes のブランド表示の手前。 |
| `header-right` | 上部のバーの、テーマ・言語の切り替えの手前。 |
| `header-banner` | ナビゲーションの下の、幅いっぱいの帯。 |
| `sidebar` | コックピットの脇の細長い枠 — **`layoutVariant === "cockpit"` のときだけ表示されます**。 |
| `pre-main` | 経路ごとの中身の上（`<main>` の中）。 |
| `post-main` | 経路ごとの中身の下（`<main>` の中）。 |
| `footer-left` | フッターの升目の中身（既定を置き換えます）。 |
| `footer-right` | フッターの升目の中身（既定を置き換えます）。 |
| `overlay` | すべての上に重なる、位置を固定した層。`customCSS` だけでは作れない装飾（走査線、周辺のぼかしなど）に向いています。 |

**ページごとのスロット**（名前で指定した組み込みのページにだけ出るもの — 経路まるごとを差し替えずに、既にあるページへ小さな表示や升目、道具の並びを差し込みたいときに使います）:

| スロット | 出る場所 |
|------|------------------|
| `sessions:top` / `sessions:bottom` | `/sessions` のページの上／下。 |
| `analytics:top` / `analytics:bottom` | `/analytics` のページの上／下。 |
| `logs:top` / `logs:bottom` | `/logs` の上（絞り込みの並びの上）／下（記録の表示の下）。 |
| `cron:top` / `cron:bottom` | `/cron` のページの上／下。 |
| `skills:top` / `skills:bottom` | `/skills` のページの上／下。 |
| `config:top` / `config:bottom` | `/config` のページの上／下。 |
| `env:top` / `env:bottom` | `/env`（Keys）のページの上／下。 |
| `docs:top` / `docs:bottom` | `/docs` の上（埋め込み枠の上）／下。 |
| `chat:top` / `chat:bottom` | `/chat` の上／下（埋め込みの会話が有効なときだけ働きます）。 |

例 — Sessions のページのいちばん上に、お知らせの升目を足す場合:

```javascript
function PinnedSessionsBanner() {
  return React.createElement(Card, null,
    React.createElement(CardContent, { className: "py-2 text-xs" },
      "Pinned note injected by my-plugin"),
  );
}

window.__HERMES_PLUGINS__.registerSlot("my-plugin", "sessions:top", PinnedSessionsBanner);
```

既にあるページを補うだけで、自分専用のタブが要らないプラグインなら、ページごとのスロットと `tab.hidden: true` を組み合わせてください。

外枠が `<PluginSlot name="..." />` を描くのは、上に挙げたスロットだけです。それ以外の名前も登録の仕組み自体は受け付けるので、プラグインの中に入れ子の UI を作りたいときは `SDK.components.PluginSlot` で自前のスロットを出せます。

#### 登録し直しと HMR {#re-registration-and-hmr}

同じ `(plugin, slot)` の組が二度登録された場合は、後の呼び出しが前のものを置き換えます — React の HMR がプラグインの再表示に期待する動きに合わせてあります。

### 組み込みページの差し替え（`tab.override`） {#replacing-built-in-pages-taboverride}

`tab.override` に組み込みの経路のパスを指定すると、そのプラグインの部品が、新しいタブを足すのではなくそのページを置き換えます。テーマに合わせた独自のトップページ（`/`）にしたいけれど、ダッシュボードの残りはそのままにしておきたい、といったときに便利です。

```json
{
  "name": "my-home",
  "label": "Home",
  "tab": {
    "path": "/my-home",
    "override": "/",
    "position": "end"
  },
  "entry": "dist/index.js"
}
```

`override` を指定すると、次のようになります。

- `/` にあった元のページの部品は経路から外れます。
- 代わりに、あなたのプラグインが `/` に出ます。
- `tab.path` 向けのタブは足されません（差し替えることが目的なので当然です）。

1つのパスを差し替えられるのは1つのプラグインだけです。2つのプラグインが同じ差し替えを主張した場合は先勝ちで、後のほうは開発時の警告とともに無視されます。

既にあるページに升目や道具の並びを足したいだけなら、[ページごとのスロット](#augmenting-built-in-pages-page-scoped-slots)を使ってください。

### 組み込みページへの追加（ページごとのスロット） {#augmenting-built-in-pages-page-scoped-slots}

`tab.override` による丸ごとの差し替えは重い手段です — そのページは、こちらが今後手を入れる分も含めて、あなたのプラグインが持つことになります。たいていの場合、やりたいのは既にあるページにお知らせや升目、道具の並びを足すことでしょう。そのためにあるのが**ページごとのスロット**です。

組み込みのページはどれも、中身の上と下に `<page>:top` と `<page>:bottom` のスロットを出しています。プラグインは `registerSlot()` を呼んでそこに中身を入れます — 組み込みのページはそのまま動き続け、あなたの部品はその横に並びます。

使えるスロットは `sessions:*`、`analytics:*`、`logs:*`、`cron:*`、`skills:*`、`config:*`、`env:*`、`docs:*`、`chat:*` です（それぞれに `:top` と `:bottom` があります）。全部の一覧は[外枠のスロット → スロットの一覧](#slot-catalogue)にあります。

いちばん短い例 — Sessions のページのいちばん上にお知らせを留めます。

```json
// ~/.hermes/plugins/session-notes/dashboard/manifest.json
{
  "name": "session-notes",
  "label": "Session Notes",
  "tab": { "path": "/session-notes", "hidden": true },
  "slots": ["sessions:top"],
  "entry": "dist/index.js"
}
```

```javascript
// ~/.hermes/plugins/session-notes/dashboard/dist/index.js
(function () {
  const SDK = window.__HERMES_PLUGIN_SDK__;
  const { React } = SDK;
  const { Card, CardContent } = SDK.components;

  function Banner() {
    return React.createElement(Card, null,
      React.createElement(CardContent, { className: "py-2 text-xs" },
        "Remember to label important sessions before archiving."),
    );
  }

  // Placeholder for the hidden tab.
  window.__HERMES_PLUGINS__.register("session-notes", function () { return null; });

  // The real work.
  window.__HERMES_PLUGINS__.registerSlot("session-notes", "sessions:top", Banner);
})();
```

要点はこうです。

- `tab.hidden: true` にすると、そのプラグインは脇の並びに出ません — 単独のページを持たないからです。
- マニフェストの `slots` の項目は説明のためだけのものです。実際に結びつけているのは、JS のバンドルの `registerSlot()` です。
- 同じページごとのスロットを複数のプラグインが使うこともでき、その場合は登録した順に積み上がります。
- どのプラグインも登録していなければ、まったく影響はありません。組み込みのページはこれまでどおりに出ます。

手本になるプラグイン（[`hermes-example-plugins`](https://github.com/NousResearch/hermes-example-plugins/tree/main/example-dashboard) の `example-dashboard`）には、`sessions:top` にお知らせを差し込む実際に動くデモが入っています。入れてみると、この作りが端から端まで見て取れます。

### スロットだけのプラグイン（`tab.hidden`） {#slot-only-plugins-tabhidden}

`tab.hidden: true` のとき、プラグインは（URL を直接開いたときのために）部品とスロットを登録しますが、ナビゲーションにタブは足しません。スロットへ差し込むためだけに存在するプラグイン — ヘッダーの紋章、脇の計器盤、上に重なる層 — が使います。

```json
{
  "name": "header-crest",
  "label": "Header Crest",
  "tab": {
    "path": "/header-crest",
    "position": "end",
    "hidden": true
  },
  "slots": ["header-left"],
  "entry": "dist/index.js"
}
```

この場合もバンドルは仮の部品で `register()` を呼び（誰かが URL を直接開いたときのために、そうしておくのが良い作法です）、そのうえで `registerSlot()` を呼んで本来の仕事をします。

### 裏側の API ルート {#backend-api-routes}

マニフェストで `api` を指定すると、プラグインは FastAPI のルートを登録できます。ファイルを作って `router` を公開してください。

```python
# ~/.hermes/plugins/my-plugin/dashboard/plugin_api.py
from fastapi import APIRouter

router = APIRouter()

@router.get("/data")
async def get_data():
    return {"items": ["one", "two", "three"]}

@router.post("/action")
async def do_action(body: dict):
    return {"ok": True, "received": body}
```

ルートは `/api/plugins/<name>/` の下に載るので、上の例はこうなります。

- `GET  /api/plugins/my-plugin/data`
- `POST /api/plugins/my-plugin/action`

プラグインの API のルートは、ダッシュボードのふだんの認証の関門の後ろにあります — 認証していない要求はプラグインのルートに届く前に `401` になり、止めてあるプラグインのルートへの要求はその場で断られます。とはいえ、**信用できないプラグインを動かしているなら `--host 0.0.0.0` で外に向けてダッシュボードを開かないでください** — 認証を通ったセッションからは、そのルートにも手が届いてしまいます。

#### Hermes の内側に触れる {#accessing-hermes-internals}

裏側のルートはダッシュボードの処理の中で動くので、hermes-agent のコードから直接読み込めます。

```python
from fastapi import APIRouter
from hermes_state import SessionDB
from hermes_cli.config import load_config

router = APIRouter()

@router.get("/session-count")
async def session_count():
    db = SessionDB()
    try:
        count = len(db.list_sessions(limit=9999))
        return {"count": count}
    finally:
        db.close()

@router.get("/config-snapshot")
async def config_snapshot():
    cfg = load_config()
    return {"model": cfg.get("model", {})}
```

### プラグインごとの独自 CSS {#custom-css-per-plugin}

Tailwind のクラスや `style=` の直書きでは足りない見た目が必要なら、CSS ファイルを足してマニフェストから指し示してください。

```json
{
  "css": "dist/style.css"
}
```

このファイルは、プラグインを読み込むときに `<link>` タグとして差し込まれます。ダッシュボード側のスタイルとぶつからないように、はっきりしたクラス名を使ってください。また、ダッシュボードの CSS 変数を参照しておくと、テーマに追従します。

```css
/* dist/style.css */
.my-plugin-chart {
  border: 1px solid var(--color-border);
  background: var(--color-card);
  color: var(--color-card-foreground);
  padding: 1rem;
}
.my-plugin-chart:hover {
  border-color: var(--color-ring);
}
```

ダッシュボードは shadcn のトークンをすべて `--color-*` として出しているほか、テーマ由来のもの（`--theme-asset-*`、`--component-<bucket>-*`、`--radius`、`--spacing-mul`）も出しています。これらを参照しておけば、プラグインの見た目はいま有効なテーマに合わせて自動で変わります。

### プラグインの見つけ方と読み直し {#plugin-discovery-reload}

ダッシュボードは、`dashboard/manifest.json` を探して3つのディレクトリを見ます。

| 優先度 | ディレクトリ | 種別の表示 |
|----------|-----------|--------------|
| 1（ぶつかったら勝ち） | `~/.hermes/plugins/<name>/dashboard/` | `user` |
| 2 | `<repo>/plugins/memory/<name>/dashboard/` | `bundled` |
| 2 | `<repo>/plugins/<name>/dashboard/` | `bundled` |
| 3 | `./.hermes/plugins/<name>/dashboard/` | `project` — `HERMES_ENABLE_PROJECT_PLUGINS` が設定されているときだけ |

見つけた結果は、ダッシュボードの処理ごとに覚えておかれます。新しいプラグインを足したら、次のどちらかをしてください。

```bash
# Force a rescan without restart
curl http://127.0.0.1:9119/api/dashboard/plugins/rescan
```

…あるいは `hermes dashboard` を起動し直します。

#### プラグインが読み込まれるまでの流れ {#plugin-load-lifecycle}

1. ダッシュボードが読み込まれます。`main.tsx` が SDK を `window.__HERMES_PLUGIN_SDK__` に、登録の仕組みを `window.__HERMES_PLUGINS__` に出します。
2. `App.tsx` が `usePlugins()` を呼び、`GET /api/dashboard/plugins` を取りに行きます。
3. マニフェストごとに、（指定があれば）CSS の `<link>` を差し込み、続いて `<script>` タグで JS のバンドルを読み込みます。
4. プラグインの IIFE が動いて `window.__HERMES_PLUGINS__.register(name, Component)` を呼び、スロットごとに必要なら `.registerSlot(name, slot, Component)` も呼びます。
5. ダッシュボードは登録された部品をマニフェストと突き合わせ、（`hidden` でなければ）ナビゲーションにタブを足し、その部品を経路として表示します。

プラグインが `register()` を呼ぶまでに与えられる時間は、スクリプトが読み込まれてから**2秒**です。それを過ぎるとダッシュボードは待つのをやめて、最初の表示を終えます。後から登録された場合でもちゃんと出てきます — ナビゲーションは変化に追従します。

プラグインのスクリプトが読み込めなかったとき（404、文法の誤り、IIFE の途中での例外）は、ダッシュボードがブラウザのコンソールに警告を出し、そのプラグインなしで進みます。

---

## テーマとプラグインを組み合わせたデモ {#combined-theme-plugin-demo}

[`strike-freedom-cockpit`](https://github.com/NousResearch/hermes-example-plugins/tree/main/strike-freedom-cockpit) というプラグイン（別リポジトリ `hermes-example-plugins`）は、見た目の塗り替えをひととおり見せるデモです。テーマの YAML とスロットだけのプラグインを組み合わせて、ダッシュボードを分岐させずにコックピット風の計器盤を作っています。

**見どころ:**

- 配色、書体、`fontUrl`、`layoutVariant: cockpit`、`assets`、`componentStyles`（角を切り落とした升目、階調のある背景）、`colorOverrides`、`customCSS`（走査線の重なり）をすべて使ったテーマ。
- 3つのスロットに登録する、スロットだけのプラグイン（`tab.hidden: true`）:
  - `sidebar` — `SDK.api.getStatus()` から取った値で動く計測の棒が並ぶ MS-STATUS の枠。
  - `header-left` — いま有効なテーマの `--theme-asset-crest` を読む陣営の紋章。
  - `footer-right` — 既定の組織名の行を置き換える独自の一文。
- このプラグインはテーマ側の絵を CSS 変数として読むので、テーマを替えればプラグインのコードに触らずに主画像や紋章が変わります。

**入れ方:**

```bash
git clone https://github.com/NousResearch/hermes-example-plugins.git

# Theme
cp hermes-example-plugins/strike-freedom-cockpit/theme/strike-freedom.yaml \
   ~/.hermes/dashboard-themes/

# Plugin
cp -r hermes-example-plugins/strike-freedom-cockpit ~/.hermes/plugins/
```

ダッシュボードを開いて、テーマの切り替えから **Strike Freedom** を選びます。コックピットの脇の枠が現れ、ヘッダーに紋章が出て、フッターの一文が置き換わります。**Hermes Teal** に戻すと、プラグインは入ったままですが見えなくなります（`sidebar` のスロットは `cockpit` のレイアウトのときだけ表示されるからです）。

このプラグインの元のコード（別リポジトリの `strike-freedom-cockpit/dashboard/dist/index.js`）を読むと、CSS 変数の読み方、スロットに対応していない古いダッシュボードへの備え方、1つのバンドルから3つのスロットを登録するやり方がわかります。

---

## API の一覧 {#api-reference}

### テーマのエンドポイント {#theme-endpoints}

| エンドポイント | メソッド | 説明 |
|----------|--------|-------------|
| `/api/dashboard/themes` | GET | 使えるテーマの一覧といま有効な名前を返します。組み込みは `{name, label, description}` を返し、自分で作ったテーマにはさらに、整えられたテーマの中身が入った `definition` の項目が付きます。 |
| `/api/dashboard/theme` | PUT | 有効なテーマを設定します。本文は `{"name": "midnight"}`。`config.yaml` の `dashboard.theme` に保存されます。 |

### プラグインのエンドポイント {#plugin-endpoints}

| エンドポイント | メソッド | 説明 |
|----------|--------|-------------|
| `/api/dashboard/plugins` | GET | 見つかったプラグインの一覧（マニフェスト付き。内部向けの項目は除きます）。 |
| `/api/dashboard/plugins/rescan` | GET | 起動し直さずに、プラグインのディレクトリを探し直します。 |
| `/dashboard-plugins/<name>/<path>` | GET | プラグインの `dashboard/` ディレクトリから静的なファイルを配ります。上の階層へのさかのぼりは止められています。 |
| `/api/plugins/<name>/*` | * | プラグインが登録した、裏側のルート。 |

### `window` の上の SDK {#sdk-on-window}

| グローバル | 型 | 提供元 |
|--------|------|----------|
| `window.__HERMES_PLUGIN_SDK__` | オブジェクト | `registry.ts` — React、hooks、UI の部品、API のクライアント、道具立て。 |
| `window.__HERMES_PLUGINS__.register(name, Component)` | 関数 | プラグインの主となる部品を登録します。 |
| `window.__HERMES_PLUGINS__.registerSlot(name, slot, Component)` | 関数 | 名前の付いた外枠のスロットに登録します。 |

---

## 困ったときは {#troubleshooting}

**テーマが選択画面に出てきません。**
ファイルが `~/.hermes/dashboard-themes/` にあり、`.yaml` か `.yml` で終わっているか確かめてください。ページを読み直します。`curl http://127.0.0.1:9119/api/dashboard/themes` を実行すると、その返事の中に自分のテーマが入っているはずです。YAML の読み取りに失敗している場合は、ダッシュボードが `~/.hermes/logs/` の `errors.log` に書き出します。

**プラグインのタブが出てきません。**
1. マニフェストが `~/.hermes/plugins/<name>/dashboard/manifest.json` にあるか確かめます（`dashboard/` という下位のディレクトリに注意）。
2. `curl http://127.0.0.1:9119/api/dashboard/plugins/rescan` を実行して、探し直させます。
3. ブラウザの開発者ツールの Network を開き、`manifest.json`、`index.js`、そして CSS があればそれも404にならずに読み込まれているか確かめます。
4. ブラウザの開発者ツールの Console を開き、IIFE の途中での誤りや `window.__HERMES_PLUGINS__ is undefined`（SDK が立ち上がらなかった印で、たいていはそれより前に React の表示が壊れています）が出ていないか見ます。
5. 自分のバンドルが `window.__HERMES_PLUGINS__.register(...)` を、`manifest.json:name` と**同じ名前**で呼んでいるか確かめます。

**スロットに登録した部品が出てきません。**
`sidebar` のスロットは、いま有効なテーマが `layoutVariant: cockpit` のときだけ表示されます。それ以外のスロットは常に表示されます。登録しているのに何も出ないときは、`registerSlot` の中に `console.log` を入れて、そもそもプラグインのバンドルが動いているか確かめてください。

**プラグインの裏側のルートが404になります。**
1. マニフェストに `"api": "plugin_api.py"` があり、それが `dashboard/` の中の実在するファイルを指しているか確かめます。
2. `hermes dashboard` を起動し直します — プラグインの API のルートが載るのは起動時の一度だけで、探し直したときでは**ありません**。
3. `plugin_api.py` が、モジュールの階層で `router = APIRouter()` を公開しているか確かめます。他の名前では拾われません。
4. `~/.hermes/logs/errors.log` を追いかけて `Failed to load plugin <name> API routes` を探します。読み込みの失敗はそこに記録されます。

**テーマを変えたら色の上書きが消えました。**
`colorOverrides` はいま有効なテーマにだけ効き、テーマを切り替えると消えます — そういう作りです。ずっと残る上書きがほしいときは、その場の切り替えではなく、自分のテーマの YAML に書いてください。

**テーマの customCSS が途中で切れます。**
`customCSS` のかたまりは1つのテーマにつき32 KiB までです。大きなスタイルシートは複数のテーマに分けるか、`css` の項目でスタイルシートを丸ごと差し込むプラグインに切り替えてください（そちらに大きさの上限はありません）。

**プラグインを PyPI で配りたいのですが。**
ダッシュボードのプラグインは、pip の入り口ではなくディレクトリの置き方で入ります。いま考えられるいちばんすっきりした配り方は、利用者に `~/.hermes/plugins/` へ複製してもらう git リポジトリです。ダッシュボードのプラグイン向けの pip での導入の仕組みは、今のところ用意していません。
