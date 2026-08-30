---
title: "Sketch — 使い捨ての HTML モックアップ。見比べるための案を 2〜3 通り作る"
description: "使い捨ての HTML モックアップ。見比べるための案を 2〜3 通り作る"
upstream_path: user-guide/skills/optional/creative/creative-sketch.md
upstream_blob: 88f2fcfacd0a5295e67695e3b9f7147607de100f
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/creative/creative-sketch
---

# Sketch {#sketch}

使い捨ての HTML モックアップを作ります。見比べるための案を 2〜3 通り出します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/creative/sketch` で導入します |
| パス | `optional-skills/creative\sketch` |
| バージョン | `1.0.1` |
| 作者 | Hermes Agent (adapted from gsd-build/get-shit-done) |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `sketch`, `mockup`, `design`, `ui`, `prototype`, `html`, `variants`, `exploration`, `wireframe`, `comparison` |
| 関連 skill | [`spike`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-spike/), [`claude-design`](/hermes/docs/user-guide/skills/bundled/creative/creative-claude-design/), [`popular-web-designs`](/hermes/docs/user-guide/skills/bundled/creative/creative-popular-web-designs/), [`excalidraw`](/hermes/docs/user-guide/skills/optional/creative/creative-excalidraw/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Sketch {#sketch}

この skill は、**ひとつに決める前にデザインの方向性を見ておきたい**ときに使います。UI や UX のアイデアを、捨てる前提の HTML モックアップとして形にします。狙いは、動く案を 2〜3 通り並べて見比べられるようにすることであって、そのまま出せるコードを作ることではありません。

「この画面をスケッチして」「X はどんな見た目になりそう?」「レイアウト A と B を比べて」「この UI の案を 2〜3 通り」「いくつか案を見せて」「作る前にモックを見たい」といった依頼が来たら、この skill を読み込んでください。

## 使わない場面 {#when-not-to-use-this}

- 本番で使う部品がほしいとき — `claude-design` を使うか、きちんと作ってください
- 作り込んだ単発の HTML（ランディングページ、資料）がほしいとき — `claude-design` です
- 図がほしいとき — `excalidraw` や `architecture-diagram` です
- デザインがもう固まっているとき — そのまま作ってください

## GSD 一式を入れている場合 {#if-the-user-has-the-full-gsd-system-installed}

`gsd-sketch` が隣に並んでいるなら（`npx get-shit-done-cc --hermes` で入ります）、もっと本格的な進め方として **`gsd-sketch`** が使えます。MANIFEST 付きの `.planning/sketches/` を残し、次に何を描くかの分析、過去のスケッチとの一貫性の点検、GSD のほかの部分との連携まで面倒を見てくれます。こちらの skill は単体で動く軽い版で、状態を持たずにその場限りのスケッチを描くためのものです。

> **補足:** 元になった GSD プロジェクト（[gsd-build/get-shit-done](https://github.com/gsd-build/get-shit-done)）は、GitHub 上で**アーカイブ済み、つまりもう手入れされていません**。npm のパッケージ（`get-shit-done-cc`）は今もインストールできますが、アーカイブされたコミュニティー製のものとして扱ってください。手入れが続いているのは、単体で動くこちらの `sketch` skill のほうで、追加で必要なものはありません。

## 基本の進め方 {#core-method}

```
intake  →  variants  →  head-to-head  →  pick winner (or iterate)
```

### 1. 聞き取り（十分に伝えられていれば飛ばします） {#1-intake-skip-if-the-user-already-gave-you-enough}

案を作る前に、3 つのことを聞き出します。まとめて聞かず、1 つずつ尋ねてください:

1. **雰囲気。**「どんな感じにしたいですか。形容詞でも、気持ちでも、雰囲気でも」— *「落ち着いた、読み物っぽい、Linear みたいな」*のほうが、*「ミニマル」*よりずっと手がかりになります。
2. **参考。**「思い描いている感じに近いアプリ、サイト、製品はありますか」— 実際の参考は、抽象的な説明よりも強いです。
3. **いちばん大事な操作。**「この画面で利用者がいちばんよくやることは何ですか」— どの案もそこをうまく支えるべきで、そうでなければただの飾りです。

次の質問に移る前に、答えを短く言い返して確かめます。3 つとも最初に伝えられていたなら、そのまま案づくりに進んでください。

### 2. 案は 2〜3 通り（1 通りにはしない。4 通り以上はまれ） {#2-variants-2-3-never-1-rarely-4}

**2〜3 通り**をまとめて作ります。1 案がそれぞれ、単体で完結した HTML ファイルです。案は説明せず、作ってください。並べて比べることが狙いです。

それぞれの案は、数値をいじった違いではなく、**デザインの立ち位置**を変えたものにします。軸の取り方の例:

- **密度:** 詰まっている / ゆったり / 極端に詰まっている（対照的な両端から 2 つ選びます）
- **何を前に出すか:** 内容が主役 / 操作が主役 / 道具立てが主役
- **見た目の性格:** 読み物っぽい / 実務的 / 遊びのある
- **レイアウト:** 1 段組み / サイドバー付き / 左右分割
- **土台:** カード中心 / 素の内容 / 文書ふう

軸を 1 つ選び、そこから引き離します。差し色だけが違う 2 案は、労力の無駄です。利用者には見分けがつきません。

**案の名前:** 番号ではなく、立ち位置を表す言葉にします。

<!-- ascii-guard-ignore -->
```
sketches/
├── 001-calm-editorial/
│   ├── index.html
│   └── README.md
├── 001-utilitarian-dense/
│   ├── index.html
│   └── README.md
└── 001-playful-split/
    ├── index.html
    └── README.md
```
<!-- ascii-guard-ignore-end -->

### 3. 本物の HTML にする {#3-make-them-real-html}

どの案も、**それだけで完結した 1 つの HTML ファイル**にします:

- `<style>` は直接書きます — ビルドも外部の CSS も要りません
- フォントはシステムのもの、または `<link>` で Google Fonts を 1 つだけ
- CDN からの Tailwind（`<script src="https://cdn.tailwindcss.com"></script>`）で構いません
- 中身はそれらしい仮の文章にします — 実際の文と名前を書き、「Lorem ipsum」は使いません
- **操作できること**: リンクは押せて、ホバーも効き、状態が変わる動きが少なくとも 1 つあること。固まった静止画は、多少ぎこちなく動くものより出来の悪い試作です。

ブラウザーで開いてください。崩れていたら、見せる前に直します。

**案は目で確かめます。Hermes のブラウザーのツールを使ってください。** HTML を書いて描画を祈るのではなく、1 案ずつ読み込んで実際に見ます:

```
browser_navigate(url="file:///absolute/path/to/sketches/001-calm-editorial/index.html")
browser_vision(question="Does this layout look clean and readable? Any visible bugs (overlapping text, unstyled elements, broken images)?")
```

`browser_vision` は、ページに実際に出ているものの説明と、スクリーンショットの場所を返します。ソースを読むだけでは見つからない崩れ（フォントの読み込みが黙って失敗している、flex の入れ物がつぶれている、など）を拾えます。直しては読み込み直し、どの案もきちんと見えるようにします。

素早く始めるための、**CSS のリセットとシステムフォントの既定の指定**:

```html
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
                 "Helvetica Neue", Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    color: #1a1a1a;
    background: #fafafa;
    line-height: 1.5;
  }
</style>
```

### 4. 案ごとの README {#4-variant-readme}

それぞれの案の `README.md` には、次のことを書きます:

```markdown
## Variant: {stance name}

### Design stance
One sentence on the principle driving this variant.

### Key choices
- Layout: ...
- Typography: ...
- Color: ...
- Interaction: ...

### Trade-offs
- Strong at: ...
- Weak at: ...

### Best for
- The kind of user or use case this variant actually serves
```

### 5. 並べて比べる {#5-head-to-head}

全部の案ができたら、比較として差し出します。並べるだけでなく、**意見を言ってください**:

```markdown
## Three takes on the home screen

| Dimension | Calm editorial | Utilitarian dense | Playful split |
|-----------|----------------|-------------------|---------------|
| Density   | Low            | High              | Medium        |
| Primary action visibility | Low | High | Medium |
| Scan-ability | High | Medium | Low |
| Feel | Calm, trusted | Sharp, tool-like | Inviting, energetic |

**My take:** Utilitarian dense for power users, calm editorial for content-forward audiences. Playful split is weakest — tries to do both and commits to neither.
```

利用者に 1 つ選んでもらうか、2 つを掛け合わせるか、もう一巡してもらいます。

## テーマ（見た目の決まりがあるプロジェクトの場合） {#theming-when-the-project-has-a-visual-identity}

すでにテーマ（色、フォント、トークン）があるなら、共通のトークンを `sketches/themes/tokens.css` に置いて、各案から `@import` してください。トークンは最小限にします:

```css
/* sketches/themes/tokens.css */
:root {
  --color-bg: #fafafa;
  --color-fg: #1a1a1a;
  --color-accent: #0066ff;
  --color-muted: #666;
  --radius: 8px;
  --font-display: "Inter", sans-serif;
  --font-body: -apple-system, BlinkMacSystemFont, sans-serif;
}
```

捨てるスケッチにトークンを作り込みすぎないでください。色 3 つとフォント 1 つで、たいてい足ります。

## 動きの合格ライン {#interactivity-bar}

次のことができれば、スケッチとして十分に動いています:

1. **主要な操作を押すと**、目に見える何かが起きる（状態の変化、モーダル、通知、画面が変わる素振り）
2. **意味のある状態の変化が 1 つ見える**（一覧の絞り込み、表示の切り替え、パネルの開閉）
3. **押せそうな場所にホバーが効く**（ボタン、行、タブ）

これ以上は、捨てるものへの作り込みすぎです。これ以下なら、ただのスクリーンショットです。

## 次に何を描くか決める {#frontier-mode-picking-what-to-sketch-next}

すでにスケッチがあって「次は何を描こうか」と聞かれたら:

- **ちぐはぐな点** — 別々のスケッチで勝ち残った案が、それぞれ独自の選択をしていて、まだ組み合わせられていない
- **まだ描いていない画面** — 話には出たのに、一度も試していない
- **状態の網羅** — うまくいく道筋は描いたが、空・読み込み中・エラー・1000 件のときは描いていない
- **画面幅** — ある幅では確かめたが、スマートフォンや横長の画面でも成り立つか
- **操作の型** — 静止したレイアウトはあるが、遷移・ドラッグ・スクロールの挙動がない

名前を付けた候補を 2〜4 個出して、選んでもらいます。

## 出力 {#output}

- リポジトリーの直下に `sketches/` を作ります（GSD の流儀に合わせているなら `.planning/sketches/`）
- 案ごとに 1 つのディレクトリー: `NNN-stance-name/index.html` と `README.md`
- 開き方も伝えます: macOS なら `open sketches/001-calm-editorial/index.html`、Linux なら `xdg-open`、Windows なら `start` です
- 案は捨てられる状態に保ちます。残しておきたくなったスケッチは、資産として飾るのではなく、本物のコードに昇格させてください

**1 案あたりの、だいたいのツールの並び:**

```
terminal("mkdir -p sketches/001-calm-editorial")
write_file("sketches/001-calm-editorial/index.html", "<!doctype html>...")
write_file("sketches/001-calm-editorial/README.md", "## Variant: Calm editorial\n...")
browser_navigate(url="file://$(pwd)/sketches/001-calm-editorial/index.html")
browser_vision(question="How does this look? Any obvious layout issues?")
```

これを案の数だけ繰り返し、最後に比較の表を出します。

## 出典 {#attribution}

GSD（Get Shit Done）プロジェクトの `/gsd-sketch` の進め方をもとにしています — MIT © 2025 Lex Christopherson（[gsd-build/get-shit-done](https://github.com/gsd-build/get-shit-done)）。元の GSD リポジトリーは、GitHub 上で**アーカイブ済み、つまりもう手入れされていません**。npm の `get-shit-done-cc` は今もインストールでき（`npx get-shit-done-cc --hermes --global`）、スケッチの状態の保存、テーマや案の型の参照、一貫性を点検する進め方まで入っていますが、アーカイブされたコミュニティー製のものとして扱ってください。
