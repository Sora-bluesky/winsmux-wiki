---
title: "Pretext — DOM を使わない文字組みで、ブラウザーの作品デモを作る"
description: "DOM を使わない文字組みで、ブラウザーの作品デモを作る"
upstream_path: user-guide/skills/bundled/creative/creative-pretext.md
upstream_blob: 59cdfc8773469c36dfde187bc5ba9c82ee14958c
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/creative/creative-pretext
---

# Pretext {#pretext}

DOM を使わない文字組みで、ブラウザーの作品デモを作ります。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/creative/pretext` |
| バージョン | `1.0.0` |
| 作者 | Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `creative-coding`, `typography`, `pretext`, `ascii-art`, `canvas`, `generative`, `text-layout`, `kinetic-typography` |
| 関連 skill | [`p5js`](/hermes/docs/user-guide/skills/bundled/creative/creative-p5js/), [`claude-design`](/hermes/docs/user-guide/skills/bundled/creative/creative-claude-design/), [`excalidraw`](/hermes/docs/user-guide/skills/bundled/creative/creative-excalidraw/), [`architecture-diagram`](/hermes/docs/user-guide/skills/bundled/creative/creative-architecture-diagram/) |

## 早見表: SKILL.md の全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として見ています。
:::

# Pretext の作品デモ {#pretext-creative-demos}

## 概要 {#overview}

[`@chenglou/pretext`](https://github.com/chenglou/pretext) は、Cheng Lou 氏（React コア、ReasonML、Midjourney）による 15KB・依存関係なしの TypeScript ライブラリで、**DOM を使わない複数行テキストの計測とレイアウト**を担います。やることはひとつだけです。`(text, font, width)` を渡すと、改行位置、行ごとの幅、書記素ごとの位置、全体の高さを返します。すべてキャンバスでの計測によるもので、再レイアウトは起きません。

これは配管仕事に聞こえますが、そうではありません。速くて幾何学的だからこそ、**創作の素材**になります。動くスプライトの周りで段落を 60fps で回り込ませたり、面の形が実在する単語でできたゲームを作ったり、散文で ASCII のロゴを描いたり、書記素ごとの正確な開始位置を使って文字を粒子に砕いたり、`getBoundingClientRect` を連打せずに複数行の UI をぴったり包み込んだりできます。

この skill があるのは、Hermes がそれで **かっこいいデモ** を作れるようにするためです。X に投稿されるような類のものです。コミュニティのデモ集は `pretext.cool` と `chenglou.me/pretext` にあります。

## 使いどころ {#when-to-use}

次のような依頼を受けたときに使います。

- 「pretext のデモ」「かっこいい pretext のやつ」「テキストで◯◯を作る」
- 動く図形の周りをテキストが流れるもの（ヒーロー領域、編集的なレイアウト、動きのある長文ページ）
- 等幅のドット絵ではなく、**実在する単語や文章**を使った ASCII アート風の表現
- 遊び場・障害物・ブロックがテキストでできたゲーム（文字で作るテトリス、散文で作るブロック崩し）
- 字ごとの物理演算を伴うキネティックタイポグラフィ（砕く、散らす、群れる、流れる）
- 文字によるジェネラティブアート。とくに非ラテン文字や、複数の文字体系を混ぜる場合
- 複数行を「ぴったり包む」UI（そのテキストが収まる最小の幅）
- 描画する*前*に改行位置を知る必要があるもの全般

次の場合には使いません。

- CSS だけでレイアウトが解決する静的な SVG／HTML ページ。CSS を使ってください
- リッチテキストエディターや、汎用のインライン書式エンジン（pretext はあえて用途を絞っています）
- 画像からテキストへの変換（`ascii-art` / `ascii-video` の skill を使います）
- テキストが関わらない純粋なキャンバスのジェネラティブアート。`p5js` を使ってください

## 制作の基準 {#creative-standard}

これはブラウザーの中で描かれるビジュアルアートです。pretext が返すのは数値であり、描くのは**あなた**です。

- **「hello world」なデモを出さないこと。** `hello-orb-flow.html` のテンプレートは*出発点*です。納品するデモには必ず、意図した色・動き・構図と、頼まれていないけれど喜ばれる視覚的なディテールをひとつ加えてください。
- **暗い背景、あたたかい中心、考え抜かれた配色。** 定番の黒地に琥珀色（CRT・ターミナル）も効きますが、チャコールに冷たい白（編集的）や、彩度を落としたパステル（リソグラフ）も同じく効きます。どれかを選び、そこに徹してください。
- **プロポーショナルフォントこそが要点です。** pretext の持ち味は「等幅ではない」ことにあります。そこを活かしてください。Iowan Old Style、Inter、JetBrains Mono、Helvetica Neue、あるいは可変フォントを使います。既定のサンセリフのままにはしません。
- **ロレムイプサムではなく、本物の文章やコードを。** 素材そのものに意味があるべきです。短い宣言文、詩、実在するソースコード、拾ってきた文章、ライブラリ自身の README など。`lorem ipsum` は決して使いません。
- **最初の描画から良いものであること。** 読み込み中の表示も、空白のフレームもなしです。開いた瞬間に、そのまま出せる状態に見えなければいけません。

## 構成技術 {#stack}

デモごとに、単体で完結する HTML ファイルを 1 つ作ります。ビルド手順は要りません。

| 層 | ツール | 役割 |
|-------|------|---------|
| コア | `esm.sh` CDN 経由の `@chenglou/pretext` | テキストの計測と行のレイアウト |
| 描画 | HTML5 Canvas 2D | 字の描画、フレームごとの構成 |
| 分割 | `Intl.Segmenter`（標準搭載） | 絵文字・CJK・結合文字のための書記素分割 |
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

バージョンは固定してください。執筆時点では `@0.0.6` です。デモの挙動がおかしいときは [npm](https://www.npmjs.com/package/@chenglou/pretext) で最新版を確かめてください。

## 2 つの使い方 {#the-two-use-cases}

ほとんどすべてが、この 2 つのどちらかに落ち着きます。両方とも身につけてください。

### 使い方 1 — 計測だけして、描画は CSS/DOM に任せる {#use-case-1-measure-then-render-with-cssdom}

```js
const prepared = prepare(text, "16px Inter");
const { height, lineCount } = layout(prepared, 320, 20);
```

テキストを描くのはブラウザーのままです。pretext は、ある幅にしたときの箱の高さを、DOM を読まずに教えてくれるだけです。次のような場面で使います。

- 折り返しのあるテキストを含む行を並べる、仮想スクロールのリスト
- カードの高さを正確に出したい石積みレイアウト
- 「このラベルは収まるか」の開発時チェック
- 遠隔から読み込んだテキストで表示がずれるのを防ぐ

**`font` と `letterSpacing` は、CSS と完全に一致させてください。** キャンバスの `ctx.font` の書き方（たとえば `"16px Inter"`、`"500 17px 'JetBrains Mono'"`）が実際の CSS と食い違うと、計測結果がずれていきます。

### 使い方 2 — 計測*も*描画も自分でやる {#use-case-2-measure-and-render-yourself}

```js
const prepared = prepareWithSegments(text, FONT);
const { lines } = layoutWithLines(prepared, 320, 26);
for (let i = 0; i < lines.length; i++) {
  ctx.fillText(lines[i].text, 0, i * 26);
}
```

創作の仕事はここにあります。描画を自分で握っているので、次のことができます。

- キャンバス、SVG、WebGL、あるいは任意の座標系へ描く
- 字ごとに変形を差し込む（回転、揺らぎ、拡大縮小、不透明度）
- 行のメタデータ（幅、書記素の位置）を、そのまま形として使う

**行ごとに幅が変わる**流し込み（図形の周りを回る、ドーナツ状の帯に沿う、長方形でない段に流す）は次のようにします。

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

これがライブラリ全体で最も重要な型です。X で話題になったあのデモ、「ドラッグしたスプライトの周りをテキストが流れる」を可能にしているのが、まさにこれです。

### 覚えておきたい補助関数 {#helpers-worth-knowing}

- `measureLineStats(prepared, maxWidth)` → `{ lineCount, maxLineWidth }` — いちばん長い行、つまり複数行をぴったり包む幅がわかります。
- `walkLineRanges(prepared, maxWidth, callback)` — 文字列を作らずに行をたどります。文字そのものが要らず、書記素の統計や物理演算だけしたいときに使います。
- `@chenglou/pretext/rich-inline` — 同じしくみを、フォントやチップ、メンションが混ざる段落向けにしたものです。サブパスから読み込みます。

## デモの型 {#demo-recipe-patterns}

コミュニティの作例（`references/patterns.md` を参照）は、いくつかの強い型に集まります。どれかを選んで応用してください。頼まれない限り、新しい分類を作ろうとしないことです。

| 型 | 主な API | 例 |
|---|---|---|
| **障害物の回り込み** | `layoutNextLineRange` + 行ごとの幅を返す関数 | ドラッグするカーソルのスプライトを避けて割れる、編集的な段落 |
| **テキストが形になるゲーム** | `layoutWithLines` + 行ごとの当たり判定の矩形 | ブロックのひとつひとつが計測された単語であるブロック崩し |
| **砕く／粒子** | `walkLineRanges` → 書記素ごとの (x,y) → 物理演算 | クリックすると文字に弾け散る一文 |
| **ASCII を障害物にした文字組み** | `layoutNextLineRange` + 行ごとに計測した障害物の区間 | ドット絵の ASCII ロゴ、形が変わっていく図形、そして実際の形に沿ってテキストを開かせる、ドラッグできるワイヤーの物体 |
| **編集的な多段組み** | 段ごとの `layoutNextLineRange` + 共有するカーソル | 引用の抜き出しがある、動く雑誌の見開き |
| **キネティックタイポグラフィ** | `layoutWithLines` + 行ごとに時間で変わる変形 | スター・ウォーズ風のクロール、波、跳ね、グリッチ |
| **複数行をぴったり包む** | `measureLineStats` | いちばん狭い枠に自動で収まる引用カード |

動く単体ファイルの出発点として、`templates/donut-orbit.html` と `templates/hello-orb-flow.html` を参照してください。

## 進め方 {#workflow}

1. **型を選ぶ** — 依頼の内容をもとに、上の表から選びます。
2. **テンプレートから始める**:
   - `templates/hello-orb-flow.html` — 動く球体の周りをテキストが回り込むもの（障害物の回り込みの型）
   - `templates/donut-orbit.html` — 発展的な例。計測した ASCII ロゴの障害物、ドラッグできるワイヤーの球と立方体、形が移り変わる場、選択できる DOM テキスト、開発時だけの操作パネルが入っています
   - `write_file` で、`/tmp/` か利用者の作業場所に新しい `.html` を書きます。
3. **素材の文章を差し替える** — 依頼の狙いに沿った、意図のあるものにします。本物の文章を 10〜100 文、ロレムイプサムは使いません。
4. **見た目を詰める** — フォント、配色、構図、操作感。ここが仕事の本体です。飛ばさないでください。
5. **手元で確かめる**:
   ```sh
   cd <dir-with-html> && python3 -m http.server 8765
   # then open http://localhost:8765/<file>.html
   ```
6. **コンソールを見る** — `prepareWithSegments` に不正なフォント指定を渡すと pretext は例外を投げます。`Intl.Segmenter` は現代のブラウザーならどれでも使えます。
7. **コードだけでなくファイルのパスを利用者に伝える** — 自分で開きたいはずです。

## 性能についての注意 {#performance-notes}

- 重いのは `prepare()` と `prepareWithSegments()` です。テキストとフォントの組み合わせごとに **1 回だけ** 呼び、返ってきたハンドルを取っておきます。
- リサイズ時は `layout()` や `layoutWithLines()` だけを呼び直します。準備からやり直してはいけません。
- テキストは変わらず形だけが変わるフレームごとのアニメーションなら、`layoutNextLineRange` をきつめのループで毎フレーム回しても、普通の長さの段落なら 60fps を保てる程度には軽いです。
- フレームごとに ASCII のマスクを描くときは、セルのバッファ（`Uint8Array` などの型付き配列）を保持し、そこから、あるいは投影した形から、行ごとの障害物の区間を計測して求め、区間をまとめてから `layoutNextLineRange` に渡し、そのあとテキストを描きます。
- 見た目のアニメーションとレイアウトのアニメーションは連動させてください。球が立方体に変わるなら、描画するセルのバッファと障害物の区間を同じ値で一緒に動かします。そうしないと、物理的に回り込んでいるのではなく、描き込んだだけに見えます。
- フェードには、字の濃さや障害物の大きさを変えるのではなく、層ごとの不透明度を使ってください。一時的に出す ASCII のスプライトは専用のキャンバスに置き、CSS か GSAP の不透明度でそのキャンバスごとフェードさせます。形が縮んで見えるのを防げます。
- キャンバスの `ctx.font` の設定は意外なほど遅い処理です。フォントが変わらないなら、`fillText` のたびではなくフレームごとに **1 回だけ** 設定してください。

## よくある落とし穴 {#common-pitfalls}

1. **CSS とキャンバスのフォント指定がずれる。** `ctx.font = "16px Inter"` で計測したのに、CSS には `font-family: Inter, sans-serif; font-size: 16px` と書いてある。Inter が読み込まれていれば問題ありません。Inter が 404 になると CSS は sans-serif に落ち、計測が 5〜20% ずれます。フォントは必ず `preload` するか、環境に必ずある書体を使ってください。

2. **アニメーションのループの中で準備をやり直す。** 軽いのは `layout*` だけです。毎フレーム `prepare` を呼び直すと性能が崩れます。準備済みのハンドルはモジュールのスコープに置いておきます。

3. **書記素の分割に `Intl.Segmenter` を使い忘れる。** 絵文字、結合文字、CJK では、`"é".split("")` は 2 文字を返します。見た目としての 1 文字を取り出すときは `new Intl.Segmenter(undefined, { granularity: "grapheme" })` を使ってください。

4. **`extraWidth` なしの `break: 'never'` なチップ。** `rich-inline` で、まとまりとして扱うチップやメンションに `break: 'never'` を指定するなら、丸い枠の余白ぶんの `extraWidth` も必ず渡してください。渡さないと、枠が容器からはみ出します。

5. **TypeScript のままのエントリーを `unpkg` から `@chenglou/pretext` として読む。** `esm.sh` を使ってください。TS のエクスポートを、ブラウザーで動く ESM に自動で変換してくれます。`unpkg` は 404 になるか、生の TS を返します。

6. **等幅フォントへの落下が、この skill の要点をまるごと消してしまう。** 出力が等幅に見えると言われる場合、たいていは CSS の `font-family` が `monospace` まで落ちています。実際に描画されている書体を DevTools で確かめてください。

7. **図形を回り込むときに、行を飛ばすか幅を詰めるか。** その行の通り道が狭すぎて 1 行分が収まらないなら、`layoutNextLineRange` に極端に小さい maxWidth を渡すのではなく、*その行を飛ばして*ください（`y += lineHeight; continue;`）。渡してしまうと、pretext は 1 書記素だけの行を返し、壊れて見えます。

8. **温度の低いデモを出してしまう。** 何もしない状態の最初の描画は、チュートリアル程度に見えます。周辺減光、控えめな走査線、放っておいても動き続ける動き、そして丁寧に選んだ操作への反応（ドラッグ、ホバー、スクロール、クリック）をひとつ加えてください。これがないと、「かっこいい pretext のデモ」は「インターンが README を再現したもの」として受け取られます。

## 確認リスト {#verification-checklist}

- [ ] デモが単体で完結する `.html` ファイル 1 つになっている。ダブルクリックか `python3 -m http.server` で開ける
- [ ] `@chenglou/pretext` を `esm.sh` からバージョン固定で読み込んでいる
- [ ] 素材がロレムイプサムではない本物の文章で、デモの狙いに合っている
- [ ] `prepare` に渡すフォント指定が、CSS のフォントと完全に一致している
- [ ] `prepare()` と `prepareWithSegments()` を、毎フレームではなく 1 回だけ呼んでいる
- [ ] 暗い背景と考え抜かれた配色になっている。既定の白いキャンバスのままではない
- [ ] 操作への反応（ドラッグ・ホバー・スクロール・クリック）か、放っておいても動く動きが最低ひとつある
- [ ] `python3 -m http.server` で手元で試し、コンソールにエラーが出ないことを確かめた
- [ ] 中位のノートパソコンで 60fps 出る（あるいは、どう質を落とすかを書いてある）
- [ ] 頼まれていない「もうひと押し」のディテールがひとつある

## 早見表: コミュニティのデモ {#reference-community-demos}

発想や型の参考にクローンしてください（どれもおおむね MIT 系で、[pretext.cool](https://www.pretext.cool/) からリンクされています）。

- **Pretext Breaker** — 単語がブロックになったブロック崩し — `github.com/rinesh/pretext-breaker`
- **Tetris × Pretext** — `github.com/shinichimochizuki/tetris-pretext`
- **ドラゴンのアニメーション** — `github.com/qtakmalay/PreTextExperiments`
- **Somnai の編集エンジン** — `github.com/somnai-dreams/pretext-demos`
- **Bad Apple!! の ASCII 版** — `github.com/frmlinn/bad-apple-pretext`
- **ドラッグするスプライトの回り込み** — `github.com/dokobot/pretext-demo`
- **Alarmy の編集的な時計** — `github.com/SmisLee/alarmy-pretext-demo`

公式のプレイグラウンド: [chenglou.me/pretext](https://chenglou.me/pretext/) — アコーディオン、バブル、動的レイアウト、編集エンジン、両端揃えの比較、石積み、markdown チャット、リッチノート。
