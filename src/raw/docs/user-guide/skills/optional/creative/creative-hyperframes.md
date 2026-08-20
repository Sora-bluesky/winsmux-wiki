---
title: "Hyperframes — HTML の composition から MP4/WebM の動画を書き出す"
description: "HTML の composition から MP4/WebM の動画を書き出す"
upstream_path: user-guide/skills/optional/creative/creative-hyperframes.md
upstream_blob: 3f453acd8db8989ff97889785e40d00f670b6098
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/creative/creative-hyperframes
---

# Hyperframes {#hyperframes}

HTML の composition から MP4/WebM の動画を書き出します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール型 — `hermes skills install official/creative/hyperframes` で入れます |
| パス | `optional-skills/creative/hyperframes` |
| バージョン | `1.0.0` |
| 作者 | heygen-com |
| ライセンス | Apache-2.0 |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `creative`, `video`, `animation`, `html`, `gsap`, `motion-graphics` |
| 関連 skill | [`manim-video`](/hermes/docs/user-guide/skills/bundled/creative/creative-manim-video/), [`meme-generation`](/hermes/docs/user-guide/skills/optional/creative/creative-meme-generation/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として見ています。
:::

# HyperFrames {#hyperframes}

動画のもとになるのは HTML です。composition は、時間の指定を `data-*` 属性で書き、動きを GSAP のタイムラインで書き、見た目を CSS で書いた HTML ファイルです。HyperFrames のエンジンがそのページを 1 コマずつ取り込み、FFmpeg で MP4/WebM に変換します。

**`manim-video` との使い分け:** 数学や図形の解説（数式、3Blue1Brown ふう）には `manim-video` を使います。モーショングラフィックス、字幕付きの人物動画、製品紹介、SNS 向けの重ね表示、シェーダーによる場面転換、そして実際の映像や音声を扱うものには `hyperframes` を使います。

## こんなときに使います {#when-to-use}

- 文章、台本、Web サイトから動画を書き出したいと言われたとき
- 動きのあるタイトル画面、下部のテロップ、文字だけのオープニング
- ナレーション付きの字幕動画（音声合成と字幕を波形に合わせる）
- 音に反応する映像（拍に合わせる、スペクトラムの棒、光の明滅）
- 場面から場面への転換（クロスフェード、ワイプ、シェーダーによる歪み、白へのフラッシュ）
- SNS 向けの重ね表示（Instagram／TikTok／YouTube ふう）
- Web サイトから動画へ（URL を取り込んで紹介動画を作る）
- 毎回まったく同じ結果で動画ファイルにしたい HTML/CSS/JS のアニメーション全般

次の用途には**使わない**でください:
- 数式だけのアニメーション（→ `manim-video`）
- 画像やミームの生成（→ `meme-generation`、画像モデル）
- ビデオ会議や配信

## 早見表 {#quick-reference}

```bash
npx hyperframes init my-video               # scaffold a project
cd my-video
npx hyperframes lint                        # validate before preview/render
npx hyperframes preview                     # live-reload browser preview (port 3002)
npx hyperframes render --output final.mp4   # render to MP4
npx hyperframes doctor                      # diagnose environment issues
```

書き出しのフラグ: `--quality draft|standard|high` · `--fps 24|30|60` · `--format mp4|webm` · `--docker`（毎回同じ結果になります）· `--strict`。

CLI の全体は [references/cli.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative/hyperframes/references/cli.md) を参照してください。

## 準備（最初の 1 回だけ） {#setup-one-time}

```bash
bash "$(dirname "$(find ~/.hermes/skills -path '*/hyperframes/SKILL.md' 2>/dev/null | head -1)")/scripts/setup.sh"
```

このスクリプトは次のことをします:
1. Node.js 22 以上と FFmpeg が入っているか確かめます（入っていなければ対処方法を表示します）。
2. `hyperframes` の CLI を全体にインストールします（`npm install -g hyperframes@>=0.4.2`）。
3. Puppeteer 経由で `chrome-headless-shell` をあらかじめ用意します。Chrome の `HeadlessExperimental.beginFrame` を使ういちばん品質のよい取り込み方法には、これが**必要**です。
4. `npx hyperframes doctor` を実行して結果を表示します。

準備がうまくいかない場合は [references/troubleshooting.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative/hyperframes/references/troubleshooting.md) を参照してください。

## 手順 {#procedure}

### 1. HTML を書く前に組み立てを考える {#1-plan-before-writing-html}

コードに触れる前に、大まかに次のことを言葉にしてください:
- **何を** — 話の流れ、要になる場面、感情の起伏
- **構成** — composition、トラック（映像／音声／重ね表示）、それぞれの長さ
- **見た目の方向性** — 色、書体、動きの性格（激しい／映画的／流れるような／技術的）
- **主役のコマ** — 各場面で、いちばん多くの要素が同時に見えている瞬間です。まずこの静止した配置を作ります。

**見た目の方向性を決める関門（必須）。** composition の HTML を書き始める前に、見た目の方向性を決めておかなければなりません。既定のまま、あるいはありきたりな色（`#333`、`#3b82f6`、`Roboto` はこの手順を飛ばした印です）で composition を書かないでください。次の順に確かめます:

1. **プロジェクトの直下に `DESIGN.md` があるか。** → そこに書かれた色、書体、動きの決まり、「してはいけないこと」をそのとおりに使います。
2. **利用者がスタイルを挙げたか**（たとえば「Swiss Pulse」「暗くて技術的な感じ」「高級ブランドふう」）。→ 最小限の `DESIGN.md` を作ります。`## Style Prompt`、`## Colors`（役割付きの 16 進の色を 3〜5 個）、`## Typography`（書体 1〜2 種）、`## What NOT to Do`（避けたい型を 3〜5 個）を書きます。
3. **どちらでもないか。** → HTML を書く前に 3 つ質問します:
   - 雰囲気は？（激しい／映画的／流れるような／技術的／混沌／あたたかい）
   - 背景は明るいほうか、暗いほうか？
   - ブランドの色、書体、参考にしたい見た目はあるか？

   その答えから `DESIGN.md` を作ります。どの composition も、色と書体のよりどころを `DESIGN.md` か利用者のはっきりした指示までたどれるようにしてください。

### 2. ひな形を作る {#2-scaffold}

```bash
npx hyperframes init my-video --non-interactive
```

用意されているひな形: `blank`、`warm-grain`、`play-mode`、`swiss-grid`、`vignelli`、`decision-tree`、`kinetic-type`、`product-promo`、`nyt-graph`。`--example <name>` で選び、`--video clip.mp4` や `--audio track.mp3` で素材を入れた状態から始められます。

### 3. 動きより先に配置を {#3-layout-before-animation}

まず**主役のコマ**の静止した HTML と CSS を書きます。GSAP はまだ書きません。`.scene-content` の入れ物は場面いっぱいに広げ（`width:100%; height:100%; padding:Npx`）、`display:flex` と `gap` を使います。中身を内側に寄せるには padding を使ってください。中身の入れ物に `position: absolute; top: Npx` を使ってはいけません（残りの高さより中身が高いとはみ出します）。

主役のコマの見た目が整ってから、`gsap.from()` で登場（CSS で決めた位置**へ**動かします）と `gsap.to()` で退場（その位置**から**動かします）を足します。

data 属性の一覧と composition の決まりは [references/composition.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative/hyperframes/references/composition.md) を参照してください。

### 4. GSAP で動かす {#4-animate-with-gsap}

どの composition でも次を守ってください:
- タイムラインを登録する: `window.__timelines["<composition-id>"] = tl`
- 停止した状態で始める: `gsap.timeline({ paused: true })`。再生はプレイヤーが操ります
- `repeat` には有限の値を使う（`repeat: -1` は取り込みのしくみを壊します）。次のように計算します: `repeat: Math.ceil(duration / cycleDuration) - 1`
- 毎回同じ結果になるようにする。`Math.random()`、`Date.now()`、時計に頼る処理は使いません。ばらつきが要る場合は、種を固定した疑似乱数を使ってください
- 同期的に組み立てる。タイムラインを作るところに `async`／`await`、`setTimeout`、Promise を使ってはいけません

GSAP の中心的な使い方（tween、イージング、stagger、タイムライン）は [references/gsap.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative/hyperframes/references/gsap.md) を参照してください。

### 5. 場面のあいだの転換 {#5-transitions-between-scenes}

場面が複数ある composition には転換が要ります。決まりは次のとおりです:
1. **場面のあいだには必ず転換を入れます。** 唐突に切り替えてはいけません。
2. **どの場面のどの要素にも必ず登場の動きを付けます**（`gsap.from(...)`）。
3. **退場の動きは、最後の場面を除いて使いません。** 転換そのものが退場だからです。
4. 最後の場面はフェードアウトしてもかまいません。

シェーダーによる転換を入れるには `npx hyperframes add <transition-name>` を使います（`flash-through-white`、`liquid-wipe` など）。一覧は `npx hyperframes add --list` で見られます。

### 6. 音声、字幕、音声合成、音への反応、強調 {#6-audio-captions-tts-audio-reactive-highlighting}

- **音声:** 必ず別の `<audio>` 要素にします（映像のほうは `muted playsinline` です）。
- **音声合成:** `npx hyperframes tts "Script text" --voice af_nova --output narration.wav`。声の一覧は `--list` で見られます。声の ID の最初の文字が言語を表します（`a`／`b`=英語、`e`=スペイン語、`f`=フランス語、`j`=日本語、`z`=中国語など）。CLI が発音処理の言語を自動で判断するので、`--lang` は上書きしたいときだけ渡してください。英語以外の発音処理には `espeak-ng` が端末全体に入っている必要があります。
- **字幕:** `npx hyperframes transcribe narration.wav` で、単語ごとの書き起こしが得られます。書き起こしの調子から見せ方を選んでください（勢い重視／堅め／解説／物語／SNS。`references/features.md` の表を参照）。**言語についての注意:** 英語だと確認できている音声でなければ `.en` の whisper モデルを使ってはいけません。`.en` は英語以外の音声を書き起こすのではなく翻訳してしまいます。字幕のかたまりには、退場の tween のあとに必ず `tl.set(el, { opacity: 0, visibility: "hidden" }, group.end)` を入れて確実に消してください。入れないと、あとのかたまりに前のものが見えたまま残ります。
- **音に反応する映像:** あらかじめ音の帯域（低音／中音／高音）を取り出しておき、タイムラインの中で `tl.call(draw, [], f / fps)` を `for` で並べてコマごとに参照します。長い tween を 1 つ置いても音には反応しません。低音は `scale`（脈打つ動き）、高音は `textShadow` や `boxShadow`（光り方）、全体の音量は `opacity`／`y`／`backgroundColor` に割り当てます。イコライザーの棒のようなありきたりな表現は避けてください。見せ方は中身から決め、音はその動き方を決めるものとして使います。
- **マーカーふうの強調:** 文字を目立たせる強調、丸囲み、はじけ、なぐり書き、スケッチ風の効果は、CSS と GSAP だけで毎回同じ結果になります。`references/features.md#marker-highlighting` を参照してください。どの時点にも移動でき、アニメーションする SVG フィルターは使いません。
- **場面の転換:** 場面が複数ある composition では必ず転換を使ってください（唐突な切り替えは禁止です）。CSS でできるもの（押し出すスライド、ぼかしたクロスフェード、ズームで通り抜ける、ずらして動く四角）か、`npx hyperframes add` で入れるシェーダーの転換（`flash-through-white`、`liquid-wipe`、`cross-warp-morph`、`chromatic-split` など）から選びます。雰囲気と勢いの対応表は `references/features.md#transitions` にあります。同じ composition の中で CSS の転換とシェーダーの転換を混ぜないでください。

### 7. 検査、確認、点検、プレビュー、書き出し {#7-lint-validate-inspect-preview-render}

```bash
npx hyperframes lint              # catches missing data-composition-id, overlapping tracks, unregistered timelines
npx hyperframes validate          # WCAG contrast audit at 5 timestamps
npx hyperframes inspect           # visual layout audit — overflow, off-frame elements, occluded text
npx hyperframes preview           # live browser preview
npx hyperframes render --quality draft --output draft.mp4    # fast iteration
npx hyperframes render --quality high --output final.mp4     # final delivery
```

`hyperframes validate` は、文字の要素の背後にある背景の色を拾い、コントラスト比が 4.5:1（大きな文字なら 3:1）を下回ると警告します。`hyperframes inspect` はその配置版で、複数の時点でページを動かし、静的な検査では見つからない問題を知らせます（4.5 秒の時点でだけ安全な範囲からはみ出す字幕、いちばん長い見出しのときだけあふれるカード、転換のシェーダーの裏に隠れてしまう要素など）。吹き出し、カード、字幕、詰まった文字組みのある composition では、とくに `inspect` を実行してください。

### 8. Web サイトから動画へ（URL をもらった場合） {#8-website-to-video-if-the-user-gives-a-url}

[references/website-to-video.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative/hyperframes/references/website-to-video.md) にある、取り込みから動画までの 7 段階の手順を使ってください。取り込み → DESIGN.md → SCRIPT.md → 絵コンテ → composition → 書き出し → 受け渡し、の順です。

## つまずきやすいところ {#pitfalls}

- **`HeadlessExperimental.beginFrame' wasn't found`** — Chromium 147 以降でこの仕組みがなくなりました。`hyperframes@>=0.4.2` を使っていることを確かめてください（自動で判断して、スクリーンショット方式に切り替わります）。逃げ道は `export PRODUCER_FORCE_SCREENSHOT=true` です。[hyperframes#294](https://github.com/heygen-com/hyperframes/issues/294) と [references/troubleshooting.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative/hyperframes/references/troubleshooting.md) を参照してください。
- **端末の Chrome を使ってしまう（`chrome-headless-shell` ではなく）** — 書き出しが 120 秒止まったあと時間切れになります。`npx puppeteer browsers install chrome-headless-shell` を実行してください（setup.sh がこれをします）。どちらが使われるかは `hyperframes doctor` が教えてくれます。
- **どこかに `repeat: -1` がある** — 取り込みのしくみが壊れます。必ず有限の繰り返し回数を計算してください。
- **あとから登場する clip の要素への `gsap.set()`** — ページの読み込み時点ではその要素がありません。代わりにタイムラインの中で `tl.set(selector, vars, timePosition)` を、その clip の `data-start` 以降の位置に置いてください。
- **本文の文字の中の `<br>`** — 強制的な改行は、実際に表示される文字の幅を知らないので、自然な折り返しと `<br>` で二重に改行されます。`max-width` を使って折り返させてください。例外は、1 語ずつ意図的に行を分ける短い見出しです。
- **`visibility` や `display` を動かす** — GSAP はこれらを tween できません。`autoAlpha` を使ってください（表示状態と不透明度の両方を扱います）。
- **`video.play()` や `audio.play()` を呼ぶ** — 再生は framework が受け持ちます。自分で呼んではいけません。
- **タイムラインを非同期に組み立てる** — 取り込みのしくみは、ページの読み込み後に `window.__timelines` を同期的に読みます。タイムラインの組み立てを `async`、`setTimeout`、Promise で包まないでください。
- **単体の `index.html` を `<template>` で包む** — 中身がブラウザからまったく見えなくなります。`<template>` を使うのは、`data-composition-src` で読み込む**下位の composition** だけです。
- **映像で音を出す** — 必ず音を消した `<video>` と、別の `<audio>` にしてください。

## 確認 {#verification}

書き出しの前後で次を行います:

1. **lint と validate と inspect を通す:** `npx hyperframes lint --strict && npx hyperframes validate && npx hyperframes inspect`（lint は構造の問題、validate はコントラスト、inspect は見た目の配置やはみ出しを見ます。警告が出たら troubleshooting.md を参照してください）。
2. **動きの組み立て** — 新しい composition や、動きを大きく変えたときは、動きの一覧を出してください。`npx hyperframes init` が skill のスクリプトをプロジェクトに複製するので、パスはプロジェクトの中にあります:
   ```bash
   node skills/hyperframes/scripts/animation-map.mjs <composition-dir> \
     --out <composition-dir>/.hyperframes/anim-map
   ```
   `animation-map.json` が 1 つ出力され、tween ごとの要約、文字で描いたガントチャート、ずらし方の検出、動きのない区間（1 秒以上）、要素ごとの出入り、そして印（`offscreen`、`collision`、`invisible`、`paced-fast` は &lt;0.2s、`paced-slow` は 2 秒超）が含まれます。要約と印にひととおり目を通し、直すか、そのままでよい理由をはっきりさせてください。小さな変更のときは省いてかまいません。
3. **ファイルがあり、中身が空でないこと:** `ls -lh final.mp4`。
4. **長さが `data-duration` と合っていること:** `ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 final.mp4`。
5. **見た目の確認:** 途中のコマを 1 枚取り出します: `ffmpeg -i final.mp4 -ss 00:00:05 -vframes 1 preview.png`。
6. **音があるはずなら入っていること:** `ffprobe -v error -show_streams -select_streams a -of default=nw=1:nk=1 final.mp4 | head -1`。

`hyperframes render` が失敗した場合は `npx hyperframes doctor` を実行し、その出力を添えて報告してください。

## 参考資料 {#references}

- [composition.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative/hyperframes/references/composition.md) — data 属性、タイムラインの約束ごと、動かせない決まり、文字と素材の決まり
- [cli.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative/hyperframes/references/cli.md) — すべての CLI コマンド（init、capture、lint、validate、inspect、preview、render、transcribe、tts、doctor、browser、info、upgrade、benchmark）
- [gsap.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative/hyperframes/references/gsap.md) — HyperFrames のための GSAP の基本（tween、イージング、stagger、タイムライン、matchMedia）
- [features.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative/hyperframes/references/features.md) — 字幕、音声合成、音への反応、マーカーふうの強調、転換（必要なときに読み込みます）
- [website-to-video.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative/hyperframes/references/website-to-video.md) — 取り込みから動画までの 7 段階の手順
- [troubleshooting.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative/hyperframes/references/troubleshooting.md) — OpenClaw の対処、環境変数、よくある書き出しエラー
