---
title: "P5Js — p5.js のスケッチ。ジェネラティブアート、シェーダー、インタラクティブ、3D"
description: "p5.js のスケッチ。ジェネラティブアート、シェーダー、インタラクティブ、3D"
upstream_path: user-guide/skills/bundled/creative/creative-p5js.md
upstream_blob: 46ecfa9299f33589725a8bd1b6e33529ec705cc4
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/creative/creative-p5js
---

# P5Js {#p5js}

p5.js のスケッチ。ジェネラティブアート、シェーダー、インタラクティブ、3D。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/creative/p5js` |
| バージョン | `1.0.0` |
| 作者 | SHL0MS, Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `creative-coding`, `generative-art`, `p5js`, `canvas`, `interactive`, `visualization`, `webgl`, `shaders`, `animation` |
| 関連 skill | [`ascii-video`](/hermes/docs/user-guide/skills/bundled/creative/creative-ascii-video/), [`manim-video`](/hermes/docs/user-guide/skills/bundled/creative/creative-manim-video/), [`excalidraw`](/hermes/docs/user-guide/skills/bundled/creative/creative-excalidraw/) |

## 早見表: SKILL.md の全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として見ています。
:::

# p5.js の制作パイプライン {#p5js-production-pipeline}

## 使いどころ {#when-to-use}

次のような依頼を受けたときに使います。p5.js のスケッチ、クリエイティブコーディング、ジェネラティブアート、インタラクティブな可視化、キャンバスアニメーション、ブラウザーで動くビジュアルアート、データ可視化、シェーダー効果、その他 p5.js を使うプロジェクト全般です。

## 中身 {#whats-inside}

p5.js を使って、インタラクティブな作品やジェネラティブな視覚表現をつくるための制作パイプラインです。ブラウザーで動くスケッチ、ジェネラティブアート、データ可視化、インタラクティブな体験、3D シーン、音に反応するビジュアル、モーショングラフィックスを作り、HTML・PNG・GIF・MP4・SVG として書き出します。扱う範囲は、2D／3D のレンダリング、ノイズとパーティクルシステム、フローフィールド、シェーダー（GLSL）、ピクセル操作、キネティックタイポグラフィ、WebGL のシーン、音声解析、マウスやキーボードの操作、そしてヘッドレスでの高解像度書き出しです。

## 制作の基準 {#creative-standard}

これはブラウザーの中で描かれるビジュアルアートです。キャンバスが画材であり、アルゴリズムが筆です。

**コードを一行でも書く前に**、作品のコンセプトを言葉にしてください。この作品は何を伝えるのか。見る人がスクロールの手を止めるのはなぜか。コードのチュートリアル例と何が違うのか。利用者のプロンプトはあくまで出発点であり、そこから野心的に解釈します。

**最初の描画から良いものであることは譲れません。** 開いた瞬間に目を引くものでなければいけません。p5.js の練習課題や、既定の設定のまま、あるいは「AI が作ったクリエイティブコーディング」に見えるなら、それは間違いです。出す前に考え直してください。

**参照資料の語彙を超えていきましょう。** 参照資料に載っているノイズ関数、パーティクルシステム、カラーパレット、シェーダー効果は、あくまで出発点の語彙です。プロジェクトごとに、組み合わせ、重ね、発明してください。カタログは絵の具のパレットであり、絵を描くのはあなたです。

**先回りして創造的であること。** 「パーティクルシステムが欲しい」と言われたら、群れとして振る舞う創発的な動き、尾を引く残像、奥行きに応じて色が移る霧、そして呼吸するように揺れる背景のノイズフィールドまで含めて返します。頼まれていないけれど喜ばれる視覚的なディテールを、最低ひとつは入れてください。

**濃く、層があり、考え抜かれていること。** どのフレームも、見ることに応えるものであってください。真っ白な背景は使いません。必ず構図に階層をつけ、色は意図して選び、近くで見て初めて気づく細部を必ず入れます。

**機能の数より、まとまりのある美意識。** すべての要素が、ひとつの視覚言語に奉仕していなければいけません。色温度をそろえ、線の太さの使い分けに一貫性を持たせ、動きの速度を調和させます。無関係な効果が十個あるスケッチは、互いに響き合う三つのスケッチより劣ります。

## モード {#modes}

| モード | 入力 | 出力 | 参照資料 |
|------|-------|--------|-----------|
| **ジェネラティブアート** | シード／パラメーター | 手続き的に生成した視覚構成（静止または動画） | `references/visual-effects.md` |
| **データ可視化** | データセット／API | インタラクティブなチャート、グラフ、独自のデータ表示 | `references/interaction.md` |
| **インタラクティブな体験** | なし（利用者が動かす） | マウス・キーボード・タッチで動くスケッチ | `references/interaction.md` |
| **アニメーション／モーショングラフィックス** | タイムライン／絵コンテ | 時間軸のあるシーケンス、キネティックタイポグラフィ、トランジション | `references/animation.md` |
| **3D シーン** | コンセプトの説明 | WebGL のジオメトリ、ライティング、カメラ、マテリアル | `references/webgl-and-3d.md` |
| **画像処理** | 画像ファイル | ピクセル操作、フィルター、モザイク、点描 | `references/visual-effects.md` § Pixel Manipulation |
| **音に反応する表現** | 音声ファイル／マイク | 音に駆動されるジェネラティブなビジュアル | `references/interaction.md` § Audio Input |

## 構成技術 {#stack}

プロジェクトごとに、単体で完結する HTML ファイルを 1 つ作ります。ビルド手順は要りません。

| 層 | ツール | 役割 |
|-------|------|---------|
| コア | p5.js 1.11.3（CDN） | キャンバス描画、数学、座標変換、イベント処理 |
| 3D | p5.js の WebGL モード | 3D ジオメトリ、カメラ、ライティング、GLSL シェーダー |
| 音声 | p5.sound.js（CDN） | FFT 解析、振幅、マイク入力、オシレーター |
| 書き出し | 標準の `saveCanvas()` / `saveGif()` / `saveFrames()` | PNG、GIF、連番フレームの出力 |
| キャプチャ | CCapture.js（任意） | フレームレートを固定した動画キャプチャ（WebM、GIF） |
| ヘッドレス | Puppeteer + Node.js（任意） | 高解像度レンダリングの自動化、ffmpeg 経由の MP4 |
| SVG | p5.js-svg 1.6.0（任意） | 印刷向けのベクター出力。p5.js 1.x が必要 |
| 自然な画材 | p5.brush（任意） | 水彩、木炭、ペン。p5.js 2.x + WEBGL が必要 |
| 質感 | p5.grain（任意） | フィルムグレイン、テクスチャの重ね |
| フォント | Google Fonts / `loadFont()` | OTF・TTF・WOFF2 による独自のタイポグラフィ |

### バージョンについて {#version-note}

**p5.js 1.x**（1.11.3）が既定です。安定していて、資料が揃っていて、対応ライブラリがいちばん広く使えます。2.x の機能が必要な場合を除いて、こちらを使ってください。

**p5.js 2.x**（2.2 以降）で加わったのは、`preload()` に代わる `async setup()`、OKLCH／OKLAB のカラーモード、`splineVertex()`、シェーダーの `.modify()` API、可変フォント、`textToContours()`、ポインターイベントです。p5.brush を使うには 2.x が必要です。`references/core-api.md` の § p5.js 2.0 を参照してください。

## パイプライン {#pipeline}

どのプロジェクトも、同じ 6 段階をたどります。

```
CONCEPT → DESIGN → CODE → PREVIEW → EXPORT → VERIFY
```

1. **CONCEPT** — 作品の狙いを言葉にします。雰囲気、色の世界、動きの語彙、この作品ならではの点
2. **DESIGN** — モード、キャンバスの大きさ、操作のしかた、色の体系、書き出し形式を決めます。コンセプトを技術的な判断に落とし込みます
3. **CODE** — p5.js をインラインで書いた HTML ファイルを 1 つ書きます。並びは、グローバル変数 → `preload()` → `setup()` → `draw()` → 補助関数 → クラス → イベントハンドラー
4. **PREVIEW** — ブラウザーで開き、見た目の質を確かめます。目標の解像度で試し、動作の速さも見ます
5. **EXPORT** — 出力を取り出します。PNG なら `saveCanvas()`、GIF なら `saveGif()`、MP4 なら `saveFrames()` と ffmpeg、まとめてヘッドレスで処理するなら Puppeteer
6. **VERIFY** — 出力はコンセプトどおりか。想定する表示サイズで目を引くか。額に入れて飾りたいか

## 方向づけ {#creative-direction}

### 美意識の軸 {#aesthetic-dimensions}

| 軸 | 選択肢 | 参照資料 |
|-----------|---------|-----------|
| **色の体系** | HSB/HSL、RGB、名前付きパレット、手続き的な調和、グラデーション補間 | `references/color-systems.md` |
| **ノイズの語彙** | パーリンノイズ、シンプレックス、フラクタル（オクターブ重ね）、ドメインワープ、カールノイズ | `references/visual-effects.md` § Noise |
| **パーティクルシステム** | 物理ベース、群れ、軌跡を描くもの、アトラクター駆動、フローフィールド追従 | `references/visual-effects.md` § Particles |
| **形の言語** | 幾何プリミティブ、独自の頂点、ベジエ曲線、SVG パス | `references/shapes-and-geometry.md` |
| **動きの質** | イージング、ばね、ノイズ駆動、物理シミュレーション、線形補間、段階的 | `references/animation.md` |
| **タイポグラフィ** | システムフォント、読み込んだ OTF、`textToPoints()` による粒子文字、キネティック | `references/typography.md` |
| **シェーダー効果** | GLSL のフラグメント／頂点、フィルターシェーダー、後処理、フィードバックループ | `references/webgl-and-3d.md` § Shaders |
| **構図** | グリッド、放射、黄金比、三分割、有機的な散らし、タイル | `references/core-api.md` § Composition |
| **操作のしかた** | マウス追従、クリックで生成、ドラッグ、キーボードの状態、スクロール駆動、マイク入力 | `references/interaction.md` |
| **ブレンドモード** | `BLEND`, `ADD`, `MULTIPLY`, `SCREEN`, `DIFFERENCE`, `EXCLUSION`, `OVERLAY` | `references/color-systems.md` § Blend Modes |
| **レイヤー** | `createGraphics()` による画面外バッファ、アルファ合成、マスク | `references/core-api.md` § Offscreen Buffers |
| **質感** | パーリンによる面、点描、ハッチング、網点、ピクセルソート | `references/visual-effects.md` § Texture Generation |

### プロジェクトごとに変える決まり {#per-project-variation-rules}

既定の設定のまま使ってはいけません。どのプロジェクトでも次を守ります。

- **独自のカラーパレット** — 生の `fill(255, 0, 0)` は使いません。3〜7 色を設計したパレットを必ず用意します
- **独自の線の太さの使い分け** — 細いアクセント（0.5）、中くらいの骨格（1〜2）、太い強調（3〜5）
- **背景の作り込み** — ただの `background(0)` や `background(255)` は使いません。必ず質感、グラデーション、あるいは層を持たせます
- **動きの幅** — 要素ごとに速さを変えます。主役は 1 倍、脇役は 0.3 倍、環境の要素は 0.1 倍
- **発明した要素を最低ひとつ** — 独自のパーティクルの挙動、ノイズの新しい使い方、独自の反応のしかたなど

### プロジェクトごとの発明 {#project-specific-invention}

どのプロジェクトでも、次のうち最低ひとつは発明してください。

- 雰囲気に合う独自のカラーパレット（既製品ではないもの）
- ノイズフィールドの新しい組み合わせ（たとえばカールノイズ + ドメインワープ + フィードバック）
- 独自のパーティクルの挙動（独自の力、独自の軌跡、独自の発生のしかた）
- 頼まれていないけれど作品を引き上げる操作のしくみ
- 視覚的な階層を生む構図の工夫

### パラメーター設計の考え方 {#parameter-design-philosophy}

パラメーターは、汎用のメニューからではなく、アルゴリズムそのものから立ち上がってくるべきです。「*この*システムのどの性質が調整に値するのか」と問いかけてください。

**良いパラメーター**は、アルゴリズムの性格を露わにします。

- **数量** — パーティクル、枝、セルをいくつにするか（密度を決めます）
- **尺度** — ノイズの周波数、要素の大きさ、間隔（質感を決めます）
- **速さ** — 速度、成長率、減衰（エネルギーを決めます）
- **しきい値** — 振る舞いが変わるのはどこか（劇的さを決めます）
- **比率** — 割合、力どうしのバランス（調和を決めます）

**悪いパラメーター**は、アルゴリズムと関係のない汎用のつまみです。

- 「color1」「color2」「size」— 文脈がなければ意味を持ちません
- 無関係な効果を切り替えるだけのスイッチ
- 見た目だけを変え、振る舞いを変えないパラメーター

どのパラメーターも、アルゴリズムの*見え方*だけでなく*考え方*を変えるものであってください。ノイズのオクターブ数を変える「乱流」パラメーターは良いものです。`ellipse()` の半径を変えるだけの「粒子の大きさ」スライダーは浅いものです。

## 進め方 {#workflow}

### ステップ 1: 作品の狙いを決める {#step-1-creative-vision}

コードを書く前に、次を言葉にします。

- **雰囲気**: 見る人に何を感じてほしいのか。静けさか。高揚か。落ち着かなさか。遊び心か
- **視覚の物語**: 時間とともに（あるいは操作によって）何が起きるのか。積み上がるのか。崩れるのか。変わるのか。揺れるのか
- **色の世界**: 暖色か寒色か。モノクロームか。補色か。主となる色相は何か。差し色は何か
- **形の言語**: 有機的な曲線か。鋭い幾何か。点か。線か。混ぜるのか
- **動きの語彙**: ゆっくり漂うのか。弾けるのか。呼吸のような脈動か。機械的な正確さか
- **この作品ならではの点**: このスケッチを唯一のものにしている、たったひとつの要素は何か

利用者のプロンプトを、美意識の選択に写しとってください。「くつろげるジェネラティブな背景」と「グリッチのあるデータ可視化」では、何もかもが変わります。

### ステップ 2: 技術的な設計 {#step-2-technical-design}

- **モード** — 上の表にある 7 つのモードのどれか
- **キャンバスの大きさ** — 横長 1920x1080、縦長 1080x1920、正方形 1080x1080、あるいは可変の `windowWidth/windowHeight`
- **レンダラー** — `P2D`（既定）か `WEBGL`（3D、シェーダー、高度なブレンドモード向け）
- **フレームレート** — 60fps（操作あり）、30fps（環境的なアニメーション）、あるいは `noLoop()`（静止したジェネラティブ作品）
- **書き出し先** — ブラウザー表示、PNG 静止画、GIF ループ、MP4 動画、SVG ベクター
- **操作のしかた** — 受け身（入力なし）、マウス駆動、キーボード駆動、音に反応、スクロール駆動
- **閲覧用の UI** — インタラクティブなジェネラティブアートでは `templates/viewer.html` から始めます。シードの切り替え、パラメーターのスライダー、ダウンロードが備わっています。単純なスケッチや動画書き出しなら、素の HTML で構いません

### ステップ 3: スケッチを書く {#step-3-code-the-sketch}

**インタラクティブなジェネラティブアート**（シードを探る、パラメーターを調整する）では、`templates/viewer.html` から始めます。まずテンプレートを読み、固定部分（シードの操作、アクション）はそのまま残し、アルゴリズムとパラメーターの操作部分を差し替えます。これで、シードの前後移動・ランダム・番号指定、値がその場で反映されるスライダー、PNG のダウンロードが、配線済みで利用者の手に渡ります。

**アニメーション、動画書き出し、あるいは単純なスケッチ**では、素の HTML を使います。

HTML ファイル 1 つです。並びは次のとおりです。

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Project Name</title>
  <script>p5.disableFriendlyErrors = true;</script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.11.3/p5.min.js"></script>
  <!-- <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.11.3/addons/p5.sound.min.js"></script> -->
  <!-- <script src="https://unpkg.com/p5.js-svg@1.6.0"></script> -->  <!-- SVG export -->
  <!-- <script src="https://cdn.jsdelivr.net/npm/ccapture.js-npmfixed/build/CCapture.all.min.js"></script> -->  <!-- video capture -->
  <style>
    html, body { margin: 0; padding: 0; overflow: hidden; }
    canvas { display: block; }
  </style>
</head>
<body>
<script>
// === Configuration ===
const CONFIG = {
  seed: 42,
  // ... project-specific params
};

// === Color Palette ===
const PALETTE = {
  bg: '#0a0a0f',
  primary: '#e8d5b7',
  // ...
};

// === Global State ===
let particles = [];

// === Preload (fonts, images, data) ===
function preload() {
  // font = loadFont('...');
}

// === Setup ===
function setup() {
  createCanvas(1920, 1080);
  randomSeed(CONFIG.seed);
  noiseSeed(CONFIG.seed);
  colorMode(HSB, 360, 100, 100, 100);
  // Initialize state...
}

// === Draw Loop ===
function draw() {
  // Render frame...
}

// === Helper Functions ===
// ...

// === Classes ===
class Particle {
  // ...
}

// === Event Handlers ===
function mousePressed() { /* ... */ }
function keyPressed() { /* ... */ }
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
</script>
</body>
</html>
```

実装の要点は次のとおりです。

- **シードを固定した乱数**: 同じ結果を再現できるよう、必ず `randomSeed()` と `noiseSeed()` を呼びます
- **カラーモード**: 色を直感的に扱うために `colorMode(HSB, 360, 100, 100, 100)` を使います
- **状態の分離**: パラメーターは CONFIG、色は PALETTE、変化する状態はグローバル変数へ
- **クラスで実体を表す**: パーティクル、エージェント、図形は `update()` と `display()` を持つクラスにします
- **画面外バッファ**: 層を重ねた構成、軌跡、マスクには `createGraphics()` を使います

### ステップ 4: 確認して手を入れる {#step-4-preview-iterate}

- HTML ファイルをブラウザーで直接開きます。単純なスケッチならサーバーは要りません
- ローカルのファイルを `loadImage()` や `loadFont()` で読むときは、`scripts/serve.sh` か `python3 -m http.server` を使います
- Chrome DevTools の Performance タブで 60fps 出ているか確かめます
- ウィンドウの大きさではなく、書き出す解像度で確認します
- ステップ 1 のコンセプトどおりの見え方になるまで、パラメーターを調整します

### ステップ 5: 書き出す {#step-5-export}

| 形式 | 方法 | コマンド |
|--------|--------|---------|
| **PNG** | `keyPressed()` の中で `saveCanvas('output', 'png')` | 's' キーで保存 |
| **高解像度 PNG** | Puppeteer によるヘッドレスキャプチャ | `node scripts/export-frames.js sketch.html --width 3840 --height 2160 --frames 1` |
| **GIF** | `saveGif('output', 5)` — N 秒ぶんを取り込みます | 'g' キーで保存 |
| **連番フレーム** | `saveFrames('frame', 'png', 10, 30)` — 30fps で 10 秒 | そのあと `ffmpeg -i frame-%04d.png -c:v libx264 output.mp4` |
| **MP4** | Puppeteer によるフレーム取り込み + ffmpeg | `bash scripts/render.sh sketch.html output.mp4 --duration 30 --fps 30` |
| **SVG** | p5.js-svg を入れて `createCanvas(w, h, SVG)` | `save('output.svg')` |

### ステップ 6: 品質を確かめる {#step-6-quality-verification}

- **狙いどおりか**: 出力を最初のコンセプトと見比べます。ありきたりに見えるなら、ステップ 1 に戻ります
- **解像度の確認**: 想定する表示サイズで鮮明ですか。ぎざつきは出ていませんか
- **性能の確認**: ブラウザーで 60fps を保てますか（アニメーションなら最低 30fps）
- **色の確認**: 色どうしが噛み合っていますか。明るいモニターと暗いモニターの両方で確かめます
- **端の場合**: キャンバスの縁ではどうなりますか。リサイズしたときは。10 分動かし続けたあとは

## 実装上の重要な注意 {#critical-implementation-notes}

### 性能 — まず FES を切る {#performance-disable-fes-first}

Friendly Error System（FES）は最大で 10 倍の負荷を足します。本番のスケッチでは必ず切ってください。

```javascript
p5.disableFriendlyErrors = true;  // BEFORE setup()

function setup() {
  pixelDensity(1);  // prevent 2x-4x overdraw on retina
  createCanvas(1920, 1080);
}
```

繰り返しの多い処理（パーティクル、ピクセル操作）では、p5 のラッパーではなく `Math.*` を使ってください。測れるほど速くなります。

```javascript
// In draw() or update() hot paths:
let a = Math.sin(t);          // not sin(t)
let r = Math.sqrt(dx*dx+dy*dy); // not dist() — or better: skip sqrt, compare magSq
let v = Math.random();        // not random() — when seed not needed
let m = Math.min(a, b);       // not min(a, b)
```

`draw()` の中で `console.log()` を呼んではいけません。`draw()` の中で DOM を触ってもいけません。`references/troubleshooting.md` の § Performance を参照してください。

### シードを固定した乱数 — 必ず {#seeded-randomness-always}

ジェネラティブなスケッチは、いつでも同じ結果を再現できなければいけません。同じシードなら、同じ出力です。

```javascript
function setup() {
  randomSeed(CONFIG.seed);
  noiseSeed(CONFIG.seed);
  // All random() and noise() calls now deterministic
}
```

生成される内容に `Math.random()` を使ってはいけません。使ってよいのは、見た目に関わらない性能重視の処理だけです。見えるものには必ず `random()` を使います。ランダムなシードが要るときは `CONFIG.seed = floor(random(99999))` とします。

### ジェネラティブアートのプラットフォーム対応（fxhash / Art Blocks） {#generative-art-platform-support-fxhash-art-blocks}

ジェネラティブアートのプラットフォームでは、p5 の擬似乱数をプラットフォーム側の決定的な乱数に置き換えます。

```javascript
// fxhash convention
const SEED = $fx.hash;              // unique per mint
const rng = $fx.rand;               // deterministic PRNG
$fx.features({ palette: 'warm', complexity: 'high' });

// In setup():
randomSeed(SEED);   // for p5's noise()
noiseSeed(SEED);

// Replace random() with rng() for platform determinism
let x = rng() * width;  // instead of random(width)
```

`references/export-pipeline.md` の § Platform Export を参照してください。

### カラーモード — HSB を使う {#color-mode-use-hsb}

ジェネラティブアートでは、HSB（色相・彩度・明度）のほうが RGB より圧倒的に扱いやすくなります。

```javascript
colorMode(HSB, 360, 100, 100, 100);
// Now: fill(hue, sat, bri, alpha)
// Rotate hue: fill((baseHue + offset) % 360, 80, 90)
// Desaturate: fill(hue, sat * 0.3, bri)
// Darken: fill(hue, sat, bri * 0.5)
```

生の RGB 値を直接書かないでください。パレットのオブジェクトを定義し、そこから手続き的に派生させます。`references/color-systems.md` を参照してください。

### ノイズ — 生のままではなく多オクターブで {#noise-multi-octave-not-raw}

生の `noise(x, y)` は、なめらかな塊のように見えます。自然な質感にするには、オクターブを重ねます。

```javascript
function fbm(x, y, octaves = 4) {
  let val = 0, amp = 1, freq = 1, sum = 0;
  for (let i = 0; i < octaves; i++) {
    val += noise(x * freq, y * freq) * amp;
    sum += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return val / sum;
}
```

流れるような有機的な形には、**ドメインワープ**を使います。ノイズの出力を、ノイズの入力座標として戻してやる手法です。`references/visual-effects.md` を参照してください。

### 層のための createGraphics() — 省略できません {#creategraphics-for-layers-not-optional}

一度きりの平坦な描画は、平坦に見えます。構成には画面外バッファを使ってください。

```javascript
let bgLayer, fgLayer, trailLayer;
function setup() {
  createCanvas(1920, 1080);
  bgLayer = createGraphics(width, height);
  fgLayer = createGraphics(width, height);
  trailLayer = createGraphics(width, height);
}
function draw() {
  renderBackground(bgLayer);
  renderTrails(trailLayer);   // persistent, fading
  renderForeground(fgLayer);  // cleared each frame
  image(bgLayer, 0, 0);
  image(trailLayer, 0, 0);
  image(fgLayer, 0, 0);
}
```

### 性能 — まとめて描けるところはまとめる {#performance-vectorize-where-possible}

p5.js の描画呼び出しは高くつきます。パーティクルが数千個ある場合は次のようにします。

```javascript
// SLOW: individual shapes
for (let p of particles) {
  ellipse(p.x, p.y, p.size);
}

// FAST: single shape with beginShape()
beginShape(POINTS);
for (let p of particles) {
  vertex(p.x, p.y);
}
endShape();

// FASTEST: pixel buffer for massive counts
loadPixels();
for (let p of particles) {
  let idx = 4 * (floor(p.y) * width + floor(p.x));
  pixels[idx] = r; pixels[idx+1] = g; pixels[idx+2] = b; pixels[idx+3] = 255;
}
updatePixels();
```

`references/troubleshooting.md` の § Performance を参照してください。

### 複数のスケッチを載せるならインスタンスモード {#instance-mode-for-multiple-sketches}

グローバルモードは `window` を汚します。本番ではインスタンスモードを使ってください。

```javascript
const sketch = (p) => {
  p.setup = function() {
    p.createCanvas(800, 800);
  };
  p.draw = function() {
    p.background(0);
    p.ellipse(p.mouseX, p.mouseY, 50);
  };
};
new p5(sketch, 'canvas-container');
```

1 つのページに複数のスケッチを埋め込むときや、フレームワークと組み合わせるときには必須です。

### WebGL モードの落とし穴 {#webgl-mode-gotchas}

- `createCanvas(w, h, WEBGL)` — 原点は左上ではなく中央です
- Y 軸が反転します（WEBGL では Y の正が上、P2D では下）
- P2D と同じ座標にしたいときは `translate(-width/2, -height/2)` を使います
- 座標変換のたびに `push()` と `pop()` で挟みます。行列スタックは何も言わずにあふれます
- `texture()` は `rect()` や `plane()` の**前**に呼びます。あとではありません
- 独自シェーダーは `createShader(vert, frag)` で作ります。複数のブラウザーで試してください

### 書き出し — キー割り当ての決まり {#export-key-bindings-convention}

どのスケッチにも、`keyPressed()` に次を入れておきます。

```javascript
function keyPressed() {
  if (key === 's' || key === 'S') saveCanvas('output', 'png');
  if (key === 'g' || key === 'G') saveGif('output', 5);
  if (key === 'r' || key === 'R') { randomSeed(millis()); noiseSeed(millis()); }
  if (key === ' ') CONFIG.paused = !CONFIG.paused;
}
```

### ヘッドレスの動画書き出し — noLoop() を使う {#headless-video-export-use-noloop}

Puppeteer でヘッドレスに描画するとき、スケッチは setup の中で **必ず** `noLoop()` を呼ぶ必要があります。呼ばないと、スクリーンショットの取得が遅いあいだにも p5 の描画ループが走り続け、スケッチだけが先へ進んでしまい、フレームが飛んだり重複したりします。

```javascript
function setup() {
  createCanvas(1920, 1080);
  pixelDensity(1);
  noLoop();                    // capture script controls frame advance
  window._p5Ready = true;      // signal readiness to capture script
}
```

同梱の `scripts/export-frames.js` は `_p5Ready` を検出し、取り込み 1 回につき `redraw()` を 1 回呼ぶので、フレームがきっちり 1 対 1 で対応します。`references/export-pipeline.md` の § Deterministic Capture を参照してください。

複数シーンの動画では、クリップごとに分ける作り方をします。シーンごとに HTML を 1 つ用意し、別々に描画してから `ffmpeg -f concat` でつなぎます。`references/export-pipeline.md` の § Per-Clip Architecture を参照してください。

### エージェントの進め方 {#agent-workflow}

p5.js のスケッチを作るときの流れです。

1. **HTML ファイルを書く** — 単体で完結する 1 ファイルに、コードをすべてインラインで入れます
2. **ブラウザーで開く** — macOS なら `open sketch.html`、Linux なら `xdg-open sketch.html`
3. **ローカルの素材**（フォント、画像）にはサーバーが要ります。プロジェクトのディレクトリで `python3 -m http.server 8080` を実行し、`http://localhost:8080/sketch.html` を開きます
4. **PNG／GIF の書き出し** — 上のように `keyPressed()` のショートカットを入れ、どのキーを押せばよいか利用者に伝えます
5. **ヘッドレスの書き出し** — フレームを自動で取り込むには `node scripts/export-frames.js sketch.html --frames 300` を実行します（スケッチ側で `noLoop()` と `_p5Ready` が必要です）
6. **MP4 の描画** — `bash scripts/render.sh sketch.html output.mp4 --duration 30` を実行します
7. **繰り返し磨く** — HTML ファイルを編集し、利用者がブラウザーを再読み込みして変化を見ます
8. **参照資料は必要になったときに読む** — 実装中に必要な資料は `skill_view(name="p5js", file_path="references/...")` で読み込みます

## 性能の目標値 {#performance-targets}

| 指標 | 目標 |
|--------|--------|
| フレームレート（操作あり） | 60fps を維持 |
| フレームレート（書き出すアニメーション） | 最低 30fps |
| パーティクル数（P2D の図形） | 60fps で 5,000〜10,000 |
| パーティクル数（ピクセルバッファ） | 60fps で 50,000〜100,000 |
| キャンバスの解像度 | 書き出しは 3840x2160 まで、操作ありは 1920x1080 |
| ファイルの大きさ（HTML） | &lt; 100KB（CDN のライブラリを除く） |
| 読み込み時間 | 最初のフレームまで &lt; 2s |

## 参照資料 {#references}

| ファイル | 内容 |
|------|----------|
| `references/core-api.md` | キャンバスの用意、座標系、描画ループ、`push()`/`pop()`、画面外バッファ、構図のパターン、`pixelDensity()`、可変レイアウト |
| `references/shapes-and-geometry.md` | 2D プリミティブ、`beginShape()`/`endShape()`、ベジエ／Catmull-Rom 曲線、`vertex()` の使い方、独自の図形、`p5.Vector`、符号付き距離場、SVG パスの変換 |
| `references/visual-effects.md` | ノイズ（パーリン、フラクタル、ドメインワープ、カール）、フローフィールド、パーティクルシステム（物理、群れ、軌跡）、ピクセル操作、質感の生成（点描、ハッチング、網点）、フィードバックループ、反応拡散 |
| `references/animation.md` | フレーム単位のアニメーション、イージング関数、`lerp()`/`map()`、ばねの物理、状態機械、タイムラインの並べ方、`millis()` を使った時間制御、トランジションのパターン |
| `references/typography.md` | `text()`、`loadFont()`、`textToPoints()`、キネティックタイポグラフィ、文字のマスク、フォントの計量、可変な文字サイズ |
| `references/color-systems.md` | `colorMode()`、HSB/HSL/RGB、`lerpColor()`、`paletteLerp()`、手続き的なパレット、色の調和、`blendMode()`、グラデーションの描画、厳選したパレット集 |
| `references/webgl-and-3d.md` | WEBGL レンダラー、3D プリミティブ、カメラ、ライティング、マテリアル、独自ジオメトリ、GLSL シェーダー（`createShader()`、`createFilterShader()`）、フレームバッファ、後処理 |
| `references/interaction.md` | マウスイベント、キーボードの状態、タッチ入力、DOM 要素、`createSlider()`/`createButton()`、音声入力（p5.sound の FFT／振幅）、スクロール駆動のアニメーション、画面幅に応じたイベント |
| `references/export-pipeline.md` | `saveCanvas()`、`saveGif()`、`saveFrames()`、決定的なヘッドレスキャプチャ、ffmpeg でのフレームから動画への変換、CCapture.js、SVG の書き出し、クリップごとの構成、プラットフォーム向け書き出し（fxhash）、動画の落とし穴 |
| `references/troubleshooting.md` | 性能の計測、ピクセルあたりの予算、よくある間違い、ブラウザーの互換性、WebGL のデバッグ、フォント読み込みの問題、ピクセル密度の罠、メモリリーク、CORS |
| `templates/viewer.html` | 閲覧用テンプレート。シードの操作（前・次・ランダム・番号指定）、パラメーターのスライダー、PNG のダウンロード、画面幅に応じたキャンバス。探索できるジェネラティブアートは、ここから始めます |

---

## 発想を広げる（実験的・創造的・唯一無二の出力を求められたときだけ使います） {#creative-divergence-use-only-when-user-requests-experimentalcreativeunique-output}

創造的なもの、実験的なもの、意外なもの、型破りなものを求められたら、いちばん合う戦略を選び、コードを書く前にその手順を頭の中で通してください。

- **概念のブレンド** — 組み合わせたい 2 つのものが指定されたとき、あるいは混成の美意識を求められたとき
- **SCAMPER** — よく知られたジェネラティブアートのパターンに、ひねりを加えたいとき
- **距離のある連想** — ひとつの概念だけを与えられ、そこから探ってほしいとき（「時間についての何かを作って」など）

### 概念のブレンド {#conceptual-blending}

1. 異なる 2 つの視覚システムを挙げます（たとえばパーティクルの物理 + 手書き文字）
2. 対応づけをします（パーティクル = インクの滴、力 = ペンの筆圧、場 = 文字の形）
3. 選びながら混ぜます。面白い創発が生まれる対応づけだけを残します
4. 2 つのシステムを並べるのではなく、ひとつのシステムとして書きます

### SCAMPER による変換 {#scamper-transformation}

よく知られたジェネラティブなパターン（フローフィールド、パーティクルシステム、L システム、セルオートマトン）を取り上げ、体系的に変換します。

- **Substitute（置き換える）**: 円を文字に、線をグラデーションに置き換えます
- **Combine（組み合わせる）**: 2 つのパターンを混ぜます（フローフィールド + ボロノイ）
- **Adapt（応用する）**: 2D のパターンを 3D の投影に当てはめます
- **Modify（変える）**: 尺度を極端にしたり、座標空間をゆがめたりします
- **Purpose（目的を変える）**: 物理シミュレーションをタイポグラフィに、整列アルゴリズムを色に使います
- **Eliminate（取り除く）**: グリッドをなくす、色をなくす、対称性をなくす
- **Reverse（逆にする）**: シミュレーションを逆再生する、パラメーター空間を反転させる

### 距離のある連想 {#distance-association}

1. 利用者の概念を起点にします（たとえば「孤独」）
2. 距離を 3 段階に分けて連想を出します。
   - 近い（当たり前）: 空っぽの部屋、ひとりの人影、静けさ
   - 中くらい（面白い）: 群れの中で 1 匹だけ逆に泳ぐ魚、通知のない携帯電話、地下鉄の車両と車両のすきま
   - 遠い（抽象的）: 素数、漸近曲線、午前 3 時の色
3. 中くらいの距離の連想を育てます。絵にできるだけの具体性がありながら、意外性も残っているからです
