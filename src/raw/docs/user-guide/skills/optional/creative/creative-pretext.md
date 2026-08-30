---
title: "Pretext — DOM を使わない文字組みで、ブラウザで動く作品を作る"
description: "DOM を使わない文字組みで、ブラウザで動く作品を作る"
upstream_path: user-guide/skills/optional/creative/creative-pretext.md
upstream_blob: 7688aadcbc6c83a7178f79ba8d5b421920f1d8b2
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/creative/creative-pretext
---

# Pretext {#pretext}

DOM を使わない文字組みで、ブラウザで動く作品を作ります。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加で入れるもの — `hermes skills install official/creative/pretext` で導入します |
| パス | `optional-skills/creative\pretext` |
| バージョン | `1.0.0` |
| 作者 | Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `creative-coding`, `typography`, `pretext`, `ascii-art`, `canvas`, `generative`, `text-layout`, `kinetic-typography` |
| 関連 skill | [`p5js`](/hermes/docs/user-guide/skills/bundled/creative/creative-p5js/), [`claude-design`](/hermes/docs/user-guide/skills/bundled/creative/creative-claude-design/), [`excalidraw`](/hermes/docs/user-guide/skills/optional/creative/creative-excalidraw/), [`architecture-diagram`](/hermes/docs/user-guide/skills/bundled/creative/creative-architecture-diagram/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Pretext で作る作品 {#pretext-creative-demos}

## 概要 {#overview}

[`@chenglou/pretext`](https://github.com/chenglou/pretext) は、Cheng Lou 氏（React コア、ReasonML、Midjourney）が作った 15KB・依存ゼロの TypeScript ライブラリで、**DOM を使わずに複数行のテキストを測って組む**ためのものです。やることは 1 つだけです。`(text, font, width)` を渡すと、改行位置、行ごとの幅、書記素ごとの座標、全体の高さを返します。すべて canvas での計測で行い、レイアウトの再計算は起きません。

裏方の仕組みに聞こえますが、そうではありません。速くて座標を扱えるので、これは**作品づくりの部品**になります。動き回るスプライトのまわりに段落を 60fps で回り込ませる、本物の単語で地形を組んだゲームを作る、文章で ASCII のロゴを描く、書記素ごとの正確な開始位置を使って文字を粒子に砕く、`getBoundingClientRect` を何度も呼ばずに複数行の UI をぴったりの幅に収める、といったことができます。

この skill は、Hermes がそれを使って**人に見せたくなる作品**を作るためにあります。X に投稿されるようなものです。みんなが作った作品は `pretext.cool` と `chenglou.me/pretext` にまとまっています。

## 使いどころ {#when-to-use}

次のような依頼があったときに使います。

- 「pretext のデモ」「pretext で面白いもの」「文字で〇〇を作る」
- 動く図形のまわりを流れるテキスト（ヒーロー領域、雑誌風の紙面、動きのある長文ページ）
- 等幅の点描ではなく、**本物の単語や文章**を使った ASCII アート風の表現
- 遊び場や障害物、ブロックが文字でできたゲーム（文字で作るテトリス、文章で作るブロック崩し）
- 文字ごとに物理を効かせた動く文字組み（砕く、散らす、群れさせる、流す）
- 文字を使った生成アート。とくに欧文以外の文字や、複数の文字体系が混ざるもの
- 複数行を「ぴったり包む」UI（テキストが収まる最小の幅）
- 描画する*前に*改行位置を知る必要があるもの

次の用途には使いません。

- CSS でレイアウトが済む静的な SVG / HTML のページ。CSS だけで書いてください
- リッチテキストエディタや、汎用のインライン整形エンジン（pretext はあえて用途を絞っています）
- 画像からテキストへの変換（`ascii-art` / `ascii-video` の skill を使ってください）
- テキストが出てこない純粋な canvas の生成アート。`p5js` を使ってください

## 作品としての水準 {#creative-standard}

これはブラウザで描く視覚作品です。pretext が返すのは数値で、実際に描くのは**あなた自身**です。

- **「hello world」で終わらせないでください。** `hello-orb-flow.html` のひな形は*出発点*です。仕上げる作品には必ず、意図のある色、動き、構図と、頼まれてはいないけれど喜ばれる視覚的な工夫を 1 つ加えてください。
- **暗い背景、暖かい中心、練った配色。** 黒地に琥珀色（CRT やターミナル風）は王道ですが、炭色に冷たい白（雑誌風）や、彩度を落としたパステル（リソグラフ風）も合います。1 つ選んで、そこに徹してください。
- **プロポーショナルフォントこそが要です。** pretext の持ち味は「等幅ではない」ところにあります。そこを活かしてください。Iowan Old Style、Inter、JetBrains Mono、Helvetica Neue、あるいは可変フォントを使います。既定のサンセリフのままにはしないでください。
- **本物の文章やソースコードを使い、ダミー文を使わないでください。** 並べる文章には意味がほしいところです。短い宣言文、詩、実際のソースコード、拾ってきた文章、ライブラリ自身の README などを使い、`lorem ipsum` は避けます。
- **開いた瞬間に完成して見えること。** 読み込み中の表示も、真っ白な一瞬もなしにします。開いたその場で人に見せられる状態にしてください。

## 使うもの {#stack}

デモ 1 つにつき、それだけで完結する HTML ファイル 1 枚です。ビルドは要りません。

| 層 | ツール | 役割 |
|-------|------|---------|
| 中心 | `esm.sh` の CDN から読む `@chenglou/pretext` | テキストの計測と行の組み立て |
| 描画 | HTML5 Canvas 2D | 文字の描画、フレームごとの構成 |
| 文字の区切り | `Intl.Segmenter`（ブラウザ内蔵） | 絵文字・CJK・結合文字のための書記素分割 |
| 操作 | 素の DOM イベント | マウス・タッチ・ホイール。フレームワークなし |

```html
<script type="module">

  prepare, layout,                   // use-case 1: simple height
  prepareWithSegments, layoutWithLines,  // use-case 2a: fixed-width lines
  layoutNextLineRange, materializeLineRange, // use-case 2b: streaming / variable width
  measureLineStats, walkLineRanges,  // stats without string allocation
} from "https://esm.sh/@chenglou/pretext@0.0.6";
</script>
```

バージョンは固定してください。執筆時点では `@0.0.6` です。デモの動きがおかしいときは [npm](https://www.npmjs.com/package/@chenglou/pretext) で最新版を確認してください。

## 2 つの使い方 {#the-two-use-cases}

ほとんどの場合、次の 2 つの形のどちらかに収まります。両方とも覚えてください。

### 使い方 1 — 測って、描画は CSS / DOM に任せる {#use-case-1-measure-then-render-with-cssdom}

```js
const prepared = prepare(text, "16px Inter");
const { height, lineCount } = layout(prepared, 320, 20);
```

文字を描くのはブラウザのままです。pretext は、ある幅にしたときの箱の高さを、DOM を読まずに教えてくれるだけです。次のような場面で使います。

- 折り返すテキストが入る行を持つ、仮想スクロールの一覧
- カードの高さを正確に出したいタイル状の配置
- 「このラベルは収まるか」を開発中に確かめるとき
- 遠くから取ってきたテキストが届いたときの、表示のずれを防ぐため

**`font` と `letterSpacing` は CSS とぴったり合わせてください。** canvas の `ctx.font` の書き方（たとえば `"16px Inter"`、`"500 17px 'JetBrains Mono'"`）が実際の CSS と一致していないと、計測結果がずれていきます。

### 使い方 2 — 測って、描画も自分でやる {#use-case-2-measure-and-render-yourself}

```js
const prepared = prepareWithSegments(text, FONT);
const { lines } = layoutWithLines(prepared, 320, 26);
for (let i = 0; i < lines.length; i++) {
  ctx.fillText(lines[i].text, 0, i * 26);
}
```

作品づくりはこちらの側にあります。描画を自分で持つので、次のことができます。

- canvas、SVG、WebGL、その他どんな座標系にも描ける
- 文字ごとに変形をかけられる（回転、ゆらぎ、拡大縮小、不透明度）
- 行の情報（幅、書記素の位置）を図形の情報として使える

**行ごとに幅が変わる**流し込み（図形のまわりを回るテキスト、ドーナツ状の帯に沿うテキスト、長方形でない段組み）は次のようにします。

```js
let cursor = { segmentIndex: 0, graphemeIndex: 0 };
let y = 0;
while (true) {
  const lineWidth = widthAtY(y);  // your function: how wide is the corridor at this y?
  const range = layoutNextLineRange(prepared, cursor, lineWidth);
  if (!range) break;
  const line = materializeLineRange(prepared, range);
  ctx.fillText(line.text, leftEdgeAtY(y), y);
  cursor = range.end;
  y += lineHeight;
}
```

これがこのライブラリで一番大事な形です。X で広まった「ドラッグしたスプライトのまわりをテキストが流れる」デモは、これで作られています。

### 覚えておきたい補助関数 {#helpers-worth-knowing}

- `measureLineStats(prepared, maxWidth)` → `{ lineCount, maxLineWidth }`。一番長い行の幅、つまり複数行をぴったり包むときの幅です。
- `walkLineRanges(prepared, maxWidth, callback)`。文字列を作らずに行をたどります。文字そのものが要らず、書記素の統計や物理計算だけをしたいときに使います。
- `@chenglou/pretext/rich-inline`。同じ仕組みを、フォントやチップ、メンションが混ざる段落向けにしたものです。サブパスから読み込みます。

## 作り方の型 {#demo-recipe-patterns}

みんなが作った作品（`references/patterns.md` を参照）は、いくつかの強い型に分かれます。1 つ選んで手を加えてください。頼まれない限り、新しい型を考え出す必要はありません。

| 型 | 中心となる API | 例 |
|---|---|---|
| **障害物のまわりを回り込ませる** | `layoutNextLineRange` と、行ごとに幅を返す関数 | ドラッグしたカーソルのスプライトを避ける、雑誌風の段落 |
| **文字を地形にしたゲーム** | `layoutWithLines` と、行ごとの当たり判定の矩形 | ブロック 1 つ 1 つが実測された単語のブロック崩し |
| **砕く・粒子にする** | `walkLineRanges` → 書記素ごとの (x,y) → 物理計算 | クリックすると文字に弾け飛ぶ 1 文 |
| **ASCII の障害物で組む文字** | `layoutNextLineRange` と、実測した行ごとの障害物の区間 | ビットマップの ASCII ロゴ、形の変化、ドラッグできるワイヤーの立体。その実際の形に沿ってテキストが開きます |
| **雑誌風の多段組み** | 段ごとの `layoutNextLineRange` と共通のカーソル | 引用を抜き出した、動きのある雑誌の見開き |
| **動く文字組み** | `layoutWithLines` と、行ごとの時間変化する変形 | スター・ウォーズ風の流れ、波、跳ね、グリッチ |
| **複数行をぴったり包む** | `measureLineStats` | 一番小さく収まる大きさに自動で合う引用カード |

そのまま動く 1 枚もののひな形として、`templates/donut-orbit.html` と `templates/hello-orb-flow.html` を見てください。

## 作業の流れ {#workflow}

1. 依頼の内容に合わせて、上の表から**型を選びます**。
2. **ひな形から始めます**。
   - `templates/hello-orb-flow.html` — 動く球のまわりを回り込むテキスト（障害物を避ける型）
   - `templates/donut-orbit.html` — 発展的な例。実測した ASCII ロゴの障害物、ドラッグできるワイヤーの球と立方体、形が移り変わる場、選択できる DOM テキスト、開発時だけの操作パネル
   - `write_file` で `/tmp/` かユーザーの作業場所に新しい `.html` を作ります。
3. 依頼に合った文章に**差し替えます**。本物の文章を 10〜100 文ほど。ダミー文は使いません。
4. **見た目を詰めます**。フォント、配色、構図、操作。ここが本番なので、飛ばさないでください。
5. **手元で確認します**。
   ```sh
   cd <dir-with-html> && python -m http.server 8765
   # then open http://localhost:8765/<file>.html
   ```
6. **コンソールを見ます**。`prepareWithSegments` に不正なフォント指定を渡すと pretext は例外を投げます。`Intl.Segmenter` は最近のブラウザならどれでも使えます。
7. コードだけでなく、**ファイルの場所も伝えてください**。開いてみたいはずです。

## 速さについて {#performance-notes}

- 重いのは `prepare()` / `prepareWithSegments()` です。テキストとフォントの組み合わせごとに**一度だけ**呼び、返り値を取っておいてください。
- 大きさが変わったときは `layout()` / `layoutWithLines()` だけをやり直します。準備からやり直してはいけません。
- テキストは変わらず形だけが動くアニメーションなら、`layoutNextLineRange` をループで回しても十分に軽く、ふつうの長さの段落なら毎フレーム 60fps で回せます。
- 毎フレーム ASCII のマスクを描くときは、セルの並びを（`Uint8Array` などの型付き配列で）保持し、そこから、あるいは投影した形から行ごとの障害物の区間を実測して求め、区間をつないでから `layoutNextLineRange` に渡し、そのあとで文字を描きます。
- 見た目の動きと組み直しの動きは連動させてください。球が立方体に変わるなら、描画するセルの並びと障害物の区間を同じ値で動かします。そうしないと、実際に回り込んでいるのではなく、上から絵を貼ったように見えます。
- 淡く消すときは、文字の濃さや障害物の大きさを変えるのではなく、レイヤーの不透明度を使ってください。一時的な ASCII のスプライトは専用の canvas に置き、CSS か GSAP の不透明度で消すと、形が縮んで見えずに済みます。
- canvas の `ctx.font` の設定は思いのほか遅いので、フォントが変わらないなら `fillText` ごとではなく 1 フレームに**一度だけ**設定してください。

## つまずきやすいところ {#common-pitfalls}

1. **CSS と canvas でフォント指定がずれる。** `ctx.font = "16px Inter"` で測ったのに、CSS には `font-family: Inter, sans-serif; font-size: 16px` と書いてある、という場合です。Inter が読み込めていれば問題ありません。Inter が 404 になると CSS は sans-serif に落ち、計測が 5〜20% ずれます。フォントは必ず `preload` するか、どの環境にもある書体を使ってください。

2. **アニメーションのループの中で準備をやり直している。** 軽いのは `layout*` だけです。毎フレーム `prepare` を呼び直すと速度が落ちます。準備した返り値はモジュールの外側に持っておいてください。

3. **書記素の分割で `Intl.Segmenter` を忘れる。** 絵文字、結合文字、CJK があるとき、`"é".split("")` は 2 文字になってしまいます。見える文字を 1 つずつ取り出すときは `new Intl.Segmenter(undefined, { granularity: "grapheme" })` を使ってください。

4. **`extraWidth` なしの `break: 'never'` のチップ。** `rich-inline` で、分割したくないチップやメンションに `break: 'never'` を使うときは、丸い枠の余白ぶんの `extraWidth` も渡してください。渡さないと枠が容器からはみ出します。

5. **TypeScript のままの入口を `unpkg` から `@chenglou/pretext` として読む。** `esm.sh` を使ってください。TS の書き出しをブラウザで動く ESM に変換してくれます。`unpkg` は 404 になるか、TS をそのまま返します。

6. **等幅への落ち込みで、持ち味が消える。** 等幅に見える出力になっているときは、CSS の `font-family` が `monospace` まで落ちていることが多いです。実際に使われている書体を DevTools で確かめてください。

7. **図形のまわりを流すとき、行を飛ばすか幅を詰めるか。** その行の通り道が狭くて 1 行分も入らないなら、`layoutNextLineRange` に極端に小さな maxWidth を渡すのではなく、*その行を飛ばして*ください（`y += lineHeight; continue;`）。渡してしまうと、1 文字ずつの壊れた行が返ってきます。

8. **冷たいままの作品を出す。** 手を入れない初期状態は、チュートリアルの域を出ません。周辺を暗く落とす処理、うっすらした走査線、放っておいても動く仕掛け、よく考えた操作への反応（ドラッグ、ホバー、スクロール、クリック）のどれかを足してください。これがないと、「面白い pretext のデモ」ではなく「README を写しただけ」に見えます。

## 確認する項目 {#verification-checklist}

- [ ] デモが 1 枚で完結する `.html` になっていて、ダブルクリックか `python -m http.server` で開ける
- [ ] `@chenglou/pretext` を `esm.sh` からバージョン固定で読み込んでいる
- [ ] 並べる文章がダミー文ではなく本物で、デモの主題に合っている
- [ ] `prepare` に渡すフォント指定が CSS のフォントと完全に一致している
- [ ] `prepare()` / `prepareWithSegments()` を毎フレームではなく一度だけ呼んでいる
- [ ] 背景が暗く、配色を練ってある。canvas の既定の白のままではない
- [ ] 操作への反応（ドラッグ・ホバー・スクロール・クリック）か、放っておいても動く仕掛けが 1 つ以上ある
- [ ] `python -m http.server` で手元で動かし、コンソールにエラーが出ないことを確かめた
- [ ] そこそこの性能のノートパソコンで 60fps 出る（出ないなら、どう見た目を落とすかを書いてある）
- [ ] 頼まれていないけれど一歩踏み込んだ工夫が 1 つある

## 参考: みんなが作った作品 {#reference-community-demos}

着想や型の参考に、次のものを取ってきて見てください（どれも MIT に準じるもので、[pretext.cool](https://www.pretext.cool/) からたどれます）。

- **Pretext Breaker** — 単語をブロックにしたブロック崩し — `github.com/rinesh/pretext-breaker`
- **Tetris × Pretext** — `github.com/shinichimochizuki/tetris-pretext`
- **ドラゴンのアニメーション** — `github.com/qtakmalay/PreTextExperiments`
- **Somnai の雑誌風エンジン** — `github.com/somnai-dreams/pretext-demos`
- **Bad Apple!! の ASCII 版** — `github.com/frmlinn/bad-apple-pretext`
- **ドラッグするスプライトの回り込み** — `github.com/dokobot/pretext-demo`
- **Alarmy の雑誌風の時計** — `github.com/SmisLee/alarmy-pretext-demo`

公式の遊び場: [chenglou.me/pretext](https://chenglou.me/pretext/) — アコーディオン、バブル、動的レイアウト、雑誌風エンジン、両端揃えの比較、タイル状の配置、markdown のチャット、リッチなメモ。
