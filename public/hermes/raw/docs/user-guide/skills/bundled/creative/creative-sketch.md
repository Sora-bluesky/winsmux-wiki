---
title: "Sketch — 使い捨ての HTML モックアップ: 見比べるための 2〜3 案"
description: "使い捨ての HTML モックアップ: 見比べるための 2〜3 案"
upstream_path: user-guide/skills/bundled/creative/creative-sketch.md
upstream_blob: b4f54f54170bafda83578d0367abe7452b3fe1af
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/creative/creative-sketch
---

# Sketch {#sketch}

使い捨ての HTML モックアップを作ります。見比べるためのデザイン案を 2〜3 個用意します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/creative/sketch` |
| バージョン | `1.0.1` |
| 作者 | Hermes Agent（gsd-build/get-shit-done を元にしています） |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `sketch`, `mockup`, `design`, `ui`, `prototype`, `html`, `variants`, `exploration`, `wireframe`, `comparison` |
| 関連 skill | [`spike`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-spike/), [`claude-design`](/hermes/docs/user-guide/skills/bundled/creative/creative-claude-design/), [`popular-web-designs`](/hermes/docs/user-guide/skills/bundled/creative/creative-popular-web-designs/), [`excalidraw`](/hermes/docs/user-guide/skills/bundled/creative/creative-excalidraw/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Sketch {#sketch}

この skill は、ユーザーがひとつに決めてしまう前に**デザインの方向性を目で見て確かめたい**ときに使います。UI/UX のアイデアを、使い捨ての HTML モックアップとして試す作業です。目的は、出荷できるコードを書くことではなく、見た目の方向性を並べて比べられるように、操作できる案を 2〜3 個作ることです。

「この画面をスケッチして」「X がどんな見た目になりうるか見せて」「レイアウト A と B を比べて」「この UI の案を 2〜3 個出して」「バリエーションを見せて」「作る前にモックアップして」といった言い方が出たら、この skill を読み込んでください。

## こういうときには使いません {#when-not-to-use-this}

- 本番用のコンポーネントがほしいとき — `claude-design` を使うか、きちんと作ってください
- 作り込んだ単発の HTML 成果物（ランディングページ、スライド）がほしいとき — `claude-design` の出番です
- 図がほしいとき — `excalidraw`、`architecture-diagram` を使ってください
- デザインがすでに固まっているとき — そのまま作ってください

## GSD 一式を導入している場合 {#if-the-user-has-the-full-gsd-system-installed}

`gsd-sketch` が兄弟 skill として見えている場合（`npx get-shit-done-cc --hermes` で導入した場合）は、より本格的な進め方として **`gsd-sketch`** を使えます。こちらは MANIFEST 付きの `.planning/sketches/` を残し、フロンティアモードでの分析、過去のスケッチをまたいだ一貫性の監査、GSD の他の機能との連携までそろっています。この skill は、状態を持ち回さない軽量な単体版です。単発でスケッチしたいときはこちらを使ってください。

> **補足:** 上流の GSD プロジェクト（[gsd-build/get-shit-done](https://github.com/gsd-build/get-shit-done)）は GitHub 上で**アーカイブ済み／メンテナンス終了**です。npm パッケージ（`get-shit-done-cc`）は今もインストールできますが、アーカイブされたコミュニティプロジェクトとして扱ってください。この単体版の `sketch` skill が手入れの続いている方で、追加で必要なものはありません。

## 基本の進め方 {#core-method}

```
intake  →  variants  →  head-to-head  →  pick winner (or iterate)
```

### 1. 聞き取り（十分な情報をもうもらっているなら飛ばします） {#1-intake-skip-if-the-user-already-gave-you-enough}

案を作り始める前に、次の 3 つを聞き出します。まとめて聞かず、1 問ずつ尋ねてください。

1. **雰囲気。**「どんな感じにしたいですか。形容詞でも、感情でも、雰囲気でもかまいません」 — *「落ち着いた、読み物っぽい、Linear のような」* のほうが *「ミニマル」* よりずっと多くを伝えます。
2. **参考。**「思い描いている雰囲気に近いアプリ・サイト・製品はありますか」 — 抽象的な説明より、実物の参考のほうが役に立ちます。
3. **中心となる操作。**「この画面でユーザーがいちばん大事にする操作は何ですか」 — どの案もこれをうまく支えるべきで、支えていなければただの飾りです。

答えをもらうたびに短く受け止めてから次の質問へ進みます。3 つとも最初にもらえているなら、そのまま案の作成に進んでください。

### 2. 案は 2〜3 個（1 個は不可、4 個以上はまれ） {#2-variants-2-3-never-1-rarely-4}

**2〜3 個の案**をまとめて作ります。1 案につき 1 つの、単体で完結した HTML ファイルです。案を文章で説明せず、実際に作ってください。比べられることに意味があります。

それぞれの案は、ピクセル単位の違いではなく、**デザインとしての立場**を変えます。うまく分かれる軸を挙げます。

- **密度:** 詰まっている / ゆったり / 極端に詰まっている（対照的な両端を 2 つ選びます）
- **強調:** コンテンツ優先 / アクション優先 / 道具優先
- **見た目:** 読み物風 / 実用一辺倒 / 遊び心
- **レイアウト:** 1 カラム / サイドバー / 分割ペイン
- **土台:** カード中心 / 素のコンテンツ / 文書風

軸を 1 つ選び、そこから引き離していきます。アクセントカラーしか違わない 2 案は労力の無駄で、ユーザーには違いが分かりません。

**案の名前:** 番号ではなく、立場を表す名前にします。

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

### 3. ちゃんと動く HTML にする {#3-make-them-real-html}

どの案も、**単体で完結した 1 枚の HTML ファイル**にします。

- `<style>` を直書きします — ビルド手順も外部 CSS もなしです
- システムフォントか、`<link>` で読み込む Google Font を 1 つだけ使います
- CDN 経由の Tailwind（`<script src="https://cdn.tailwindcss.com"></script>`）でもかまいません
- 中身は現実味のあるダミーにします — 「Lorem ipsum」ではなく、実際の文章、実際の名前を入れます
- **操作できること**: リンクは押せて、ホバーは効いて、状態の変化が最低 1 つある（開閉、絞り込み、切り替えなど）こと。動かない静止画は、少々雑でも動くものより出来の悪い試作です。

ブラウザーで開いてください。崩れて見えるなら、ユーザーに見せる前に直します。

**案は目で見て確かめます。Hermes のブラウザーツールを使ってください。** HTML を書いて描画されることを祈るのではなく、1 案ずつ読み込んで実際に見ます。

```
browser_navigate(url="file:///absolute/path/to/sketches/001-calm-editorial/index.html")
browser_vision(question="Does this layout look clean and readable? Any visible bugs (overlapping text, unstyled elements, broken images)?")
```

`browser_vision` は、ページに実際に写っているものの AI による説明と、スクリーンショットの保存先を返します。ソースを読むだけでは見つからないレイアウトの不具合（読み込みに静かに失敗したフォント、つぶれた flex コンテナーなど）もこれで拾えます。直しては読み込み直し、どの案もきちんと見えるまで繰り返してください。

すぐ書き始めるための**既定の CSS リセットとシステムフォント指定**です。

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

各案の `README.md` には、次の内容を書きます。

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

### 5. 突き合わせ {#5-head-to-head}

案がそろったら、比較の形で見せます。並べるだけでなく、**自分の意見を言ってください**。

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

ユーザーに 1 案を選んでもらうか、2 案を組み合わせて折衷案にするか、もう一巡してもらいます。

## テーマ設定（プロジェクトに見た目の決まりがある場合） {#theming-when-the-project-has-a-visual-identity}

ユーザーが既存のテーマ（色、フォント、トークン）を持っているなら、共通のトークンを `sketches/themes/tokens.css` に置き、各案から `@import` します。トークンは最小限にとどめてください。

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

使い捨てのスケッチにトークンを作り込みすぎないでください。色 3 つとフォント 1 つあれば、たいてい足ります。

## どこまで動けば十分か {#interactivity-bar}

スケッチとして十分に動くのは、ユーザーが次のことをできる状態です。

1. **主要な操作を押す**と、目に見える何かが起きる（状態の変化、モーダル、通知、画面遷移のふり）
2. **意味のある状態変化を 1 つ見られる**（一覧の絞り込み、モードの切り替え、パネルの開閉）
3. **押せそうな部品にホバーできる**（ボタン、行、タブ）

これ以上は、使い捨てに手をかけすぎです。これ未満なら、ただのスクリーンショットです。

## フロンティアモード（次に何をスケッチするか決める） {#frontier-mode-picking-what-to-sketch-next}

すでにスケッチがあり、ユーザーが「次は何をスケッチすればいい?」と言ってきたら、次の観点で探します。

- **一貫性の穴** — 別々のスケッチで勝ち残った 2 案が、それぞれ独立に選んだ判断をまだ組み合わせていない
- **未着手の画面** — 話には出ているが、まだ一度も試していない
- **状態の網羅** — うまくいく流れは描いたが、空・読み込み中・エラー・1000 件のときが描かれていない
- **画面幅の穴** — ある画面幅では確認したが、モバイルや横長でも成り立つか
- **操作のパターン** — 静的なレイアウトはあるが、遷移・ドラッグ・スクロールの挙動がない

名前を付けた候補を 2〜4 個示し、ユーザーに選んでもらいます。

## 成果物 {#output}

- リポジトリのルートに `sketches/` を作ります（GSD の流儀に合わせているなら `.planning/sketches/`）
- 案ごとに 1 つのサブディレクトリー: `NNN-stance-name/index.html` と `README.md`
- 開き方を伝えます: macOS なら `open sketches/001-calm-editorial/index.html`、Linux なら `xdg-open`、Windows なら `start` です
- 案は使い捨てのままにしておきます。残しておきたくなったスケッチは、資産として管理するのではなく、本物のプロジェクトコードへ引き上げてください

**1 案あたりの典型的なツールの流れ:**

```
terminal("mkdir -p sketches/001-calm-editorial")
write_file("sketches/001-calm-editorial/index.html", "<!doctype html>...")
write_file("sketches/001-calm-editorial/README.md", "## Variant: Calm editorial\n...")
browser_navigate(url="file://$(pwd)/sketches/001-calm-editorial/index.html")
browser_vision(question="How does this look? Any obvious layout issues?")
```

これを案ごとに繰り返し、最後に比較表を示します。

## 出典 {#attribution}

GSD（Get Shit Done）プロジェクトの `/gsd-sketch` ワークフローを元にしています — MIT © 2025 Lex Christopherson（[gsd-build/get-shit-done](https://github.com/gsd-build/get-shit-done)）。上流の GSD リポジトリは GitHub 上で**アーカイブ済み／メンテナンス終了**です。`get-shit-done-cc` の npm パッケージは今もインストールでき（`npx get-shit-done-cc --hermes --global`）、スケッチの状態を残す仕組み、テーマ／案のパターン集、一貫性を監査する進め方まで入っていますが、アーカイブされたコミュニティプロジェクトとして扱ってください。
