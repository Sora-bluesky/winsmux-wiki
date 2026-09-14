---
title: "Scrollcraft — スクロールがタイムラインになる、上質なランディングページ"
description: "スクロールがタイムラインになる、上質なランディングページ"
upstream_path: user-guide/skills/optional/web-development/web-development-scrollcraft.md
upstream_blob: e5771e8fc805d35c729b72c13504d24a64e89585
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/web-development/web-development-scrollcraft
---

# Scrollcraft {#scrollcraft}

スクロールで動く上質なランディングページを作ります。スクロールがそのままタイムラインになります。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加で入れるもの — `hermes skills install official/web-development/scrollcraft` で導入します |
| パス | `optional-skills/web-development/scrollcraft` |
| バージョン | `1.0.0` |
| 作者 | nateherkai（上流の scroll-craft）、Hermes Agent が移植 |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `web-development`, `landing-page`, `scrollytelling`, `animation`, `design`, `frontend` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# scrollcraft {#scrollcraft}

スクロールは、訪れる人の誰もがすでに知っている唯一の操作です。この skill はそれを
タイムラインとして扱います。ホイールは再生位置のつまみで、ページは本物のテキストが上に乗った映像作品です。
セクションごとに十分に違う動きをさせて、訪れた人が先へ進み続けるようにします。

**作るもの:** ヒアリングのまとめ、ページの文法、カスタマージャーニーの
マップ、狙って作った山場を 1 つ持つ感情の曲線、スクロールの譜面、決め手となる動き 1 つ、
素材、トークンで組んだデザインの土台の上に載る本物の HTML ページ 1 枚、そしてどのスクロール位置でも
崩れないことを示すスクリーンショットの一覧です。

使う場面: 「scrollytelling」「スクロールアニメーションのサイト」「スクロールすると
動画が再生されるサイト」「Apple 風のランディングページ」「3D のスクロール空間」「ブランドを
スクロール体験にしたい」「テンプレートっぽく見える」など、文書ではなく体験のように感じてほしい
サイトの依頼すべてです。

## これは何ではないか {#what-this-is-not}

「フライスルー映像を生成してテキストを載せる」ことではありません。それでは 1 つの手法を
ページ全体に当てただけになり、ひと目でそれとわかります。背骨となるルールは 4 つです。

1. **変化こそが成果物です。** 手法の系統を少なくとも 4 つ使い、同じ手法を
   2 回続けません。[references/devices.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/web-development/scrollcraft/references/devices.md) を読んでください。
2. **世界は写真調にします。** ブランドが本当にイラストのブランドである場合を除きます。
   粘土やローポリのジオラマを既定にするのは禁止です。[references/worlds.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/web-development/scrollcraft/references/worlds.md) を読んでください。
3. **切れ目のない連続にはしません。** ただし依頼が文字どおり「ひと続きの
   旅」なら別です（その場合は [references/worldflight.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/web-development/scrollcraft/references/worldflight.md) を見てください）。
4. **世界が違っても、ページが違うことにはなりません。** 構造は別の軸です。
   意図して決めてください。[references/uniqueness.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/web-development/scrollcraft/references/uniqueness.md) を読んでください。

## Step 0: ヒアリング {#step-0-the-interview}

**何かを作る前に、必ずチャットでユーザーに質問します。** 本物の質問を会話の中で
尋ねて答えてもらい、書き留めます。ブランド名から推測したまとめではいけません。
次の 8 問を一度に聞きます。

1. **雰囲気を 3〜5 語で**。加えて、どんな媒体からでもよいので参考を 3 つまで
   （映画、アルバムのジャケット、お店、雑誌、ゲームなど。「好きなサイト」ではありません）。
2. **スクロールの流れを、セクションごとに、本人の言葉で。**
3. **エネルギーの曲線** — どこを落ち着かせ、どこを激しくするか。
4. **スクロールしながら段階ごとにどう感じてほしいか、そして覚えていてほしい
   ただ 1 つの瞬間は何か。** これが感情の曲線と山場になります。
   [references/feel.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/web-development/scrollcraft/references/feel.md) を見てください。
5. **これまで見たどのサイトもしていない、このサイトならではのこと 1 つ** — 
   決め手となる動きの種です。
6. **プレミアムなミニマルからどれだけ離れるか。** 選択肢の幅は
   [references/uniqueness.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/web-development/scrollcraft/references/uniqueness.md) の §5 にあります。ブルータリスト、
   マキシマリスト、遊び心、レトロ、高密度、エディトリアル、プレミアムなミニマル。
7. **切れ目のない 1 つの世界か、別々のシーンか。** 構造上いちばん大きな分かれ道で、
   決めるのはユーザーです。
8. **すでに持っている素材は何か。** 映像、写真、製品写真、ブランドの
   素材一式。「何もない」でもかまいません。その場合は世界をすべて生成します。

幕の計画に入る前に、答えをそのまま `<workspace>/builds/<name>/BRIEF.md` に書き込みます（write_file を
使います）。BRIEF.md には、8 問の答え、
感情の曲線（幕ごとに 1 行で、感情とその原因）、山場（訪れた人が友達に言うであろう
一文として）、「It's the site where
___」の文を埋めたもの、そして意図して置く静けさがあればそれを入れます。完全に自律で動いていて
本当にユーザーに連絡がつかない場合は、BRIEF.md を自分で書き、
`Self-authored, not interviewed` と記し、そのことをレポートでも伝えます。

## 下準備 {#bootstrap}

手で確認するのではなく、事前チェックを実行します（フィルターが欠けた ffmpeg が
足りないフィルターを構文エラーとして報告する状態も見つけられます）。

```bash
node <skill>/scripts/doctor.mjs
node <skill>/scripts/workspace.mjs --ensure   # prints workspace, seeds registry
```

作業場所は次の順で決まります。環境変数 `SCROLLCRAFT_HOME`、cwd から上にたどって最も近い
`.scrollcraft.json`（`{ "workspace": "..." }`）、
`<project root>/scrollcraft`。ビルドは `<workspace>/builds/<name>/` に置かれ、
指紋の登録簿は `<workspace>/FINGERPRINTS.md` です（
[templates/FINGERPRINTS.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/web-development/scrollcraft/templates/FINGERPRINTS.md) から作られ、最初は空です。この関門は
*自分自身*の繰り返しを止めるためのものです）。

`engine/scrollcraft.js` と `engine/scrollcraft.css` をビルドフォルダーにコピーします。
**プロジェクトごとにエンジンを編集してはいけません。** 見た目はトークンで変え、マークアップは
自分で書きます。独自の振る舞いはページ内の独自の JS で書き、`--sc-p`
と自分で決めた `data-sc-*` 属性をもとに動かします。

## Step 1: まとめは流れから {#step-1-the-brief-journey-first}

題材については、ふつうの文章で自由に答えてもらいます。そのうえで、Step 0 で聞いていないことだけを尋ねます。
これは何で誰のためか、ページが心に残す一文、次に取ってほしい
行動 1 つ（ラベルは 1 つで、どこでも同じものを使う）、すでに持っているもの、
[references/worlds.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/web-development/scrollcraft/references/worlds.md) に沿ったアートディレクション。そのあと
**流れ**を書きます。4〜7 個の拍で、それぞれが、訪れた人の知っていることや感じていることの変化です。
拍が背骨です。どの拍にも役立たないセクションは削ります。素材を生成する前に、ユーザーと
流れを確認してください。費用がかかるのは素材です。

## Step 2: 文法、関門、そして譜面 {#step-2-grammar-gate-then-score}

詳しくは [references/uniqueness.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/web-development/scrollcraft/references/uniqueness.md) にあります。

- **文法を 1 つ選びます。** 文法は 8 つあり、互いに排他です。映画的なワンショットを選ぶなら、
  ほかの 7 つがなぜ選ばれなかったかをレポートに書きます。ナビ、ヒーロー、締めは
  文法から決まります。
- **決め手となる動きを考え出します。** キットの手法のパラメーターを変えるのではなく、
  ページにコードで書く独自のインタラクション 1 つです。ヒアリングの 5 問目がその種です。
- **指紋の関門を通します。** 計画中のビルドは、
  `<workspace>/FINGERPRINTS.md` のどの行とも、6 つの観点のうち少なくとも 4 つで違っていなければなりません。
  観点は、文法、ナビの扱い、ヒーローの手法、幕の並びの形、締めのパターン、決め手の動きです。
  通らなければ、記録ではなく計画を変えます。
- **譜面の表より先に感情の曲線を書きます**（方法:
  [references/feel.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/web-development/scrollcraft/references/feel.md)）。そのあと各拍に手法を割り当て、
  表として書き出します（拍 / 手法 / 理由）。

作る前の確認: 文法ごとの禁止事項を守っている。手法の系統が 4 つ以上。同じ手法を
2 回続けていない。`scrub` の幕は 2 つまで。隣り合う幕が同じ
感情になっていない。山場は 1 つで、いちばん長い区間を持つ。ページ全体の長さは画面の高さ 8〜14
個分。

## Step 3: 素材 {#step-3-assets}

パイプライン全体、プロンプトのひな形、モデルごとの注意は [references/assets.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/web-development/scrollcraft/references/assets.md) にあります。

**まず Hermes の標準の方法から:**

- **ユーザーが用意した映像と写真** — キーも費用も要らない、正式な方法です。
  色を整えてエンコードします。
- **`image_generate` ツール**で静止画を作ります。すべてのプロンプトで同じスタイルの前置きを
  一字一句そのまま使い回すことで、6 枚の画像が 1 回の撮影のように揃います。使う前に素材を
  1 枚ずつ確認します（vision_analyze）。悪いコマを出すより作り直すほうがましです。

**任意の上流の方法 — kie.ai**（
[scripts/kie.mjs](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/web-development/scrollcraft/scripts/kie.mjs) としてそのまま同梱）: 写真のようにリアルな静止画と、カメラが動くクリップを作ります。
環境変数 `KIE_AI_API_KEY` が必要です（シェルで export してください。
この移植版には env ファイルは同梱されていません）。残高は
`node <skill>/scripts/kie.mjs probe` で確認します。静止画は数セント、5 秒のクリップはそれ以上かかります。

```bash
node <skill>/scripts/kie.mjs still "<style preamble>\n\n<scene>" out/01-hero.png --ar 16:9
node <skill>/scripts/kie.mjs shot  "<camera move>" out/01-hero.png out/01.mp4 --dur 5
bash  <skill>/scripts/encode.sh out/01.mp4 assets/01.mp4
bash  <skill>/scripts/encode.sh out/01.mp4 assets/01-m.mp4 mobile
```

**再生用ではなく、スクラブ用にエンコードします。** シークは直前のキーフレームからたどるので、
`encode.sh` は GOP を細かく設定します。ふつうの Web 向けエンコードでは、スクラブが泥のように重くなります。
音声も取り除きます。

## Step 4: ページを作る {#step-4-build-the-page}

本物の HTML を書きます。本物の `<h1>`、本物の `<p>`、本物の読み順です。エンジンは
マークアップから `data-sc-*` 属性を読み取って動かすだけで、DOM を生成することはありません。
[references/template.html](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/web-development/scrollcraft/references/template.html) から始めてください。手法の
パターンは [references/devices.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/web-development/scrollcraft/references/devices.md) にあります。余白、文字組み、奥行き、
色は [references/taste.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/web-development/scrollcraft/references/taste.md) にあり、マークアップを書く前に
読んでください。見た目は、6 つの値と 2 つのフォントのトークンを上書きして変えます。

```css
:root {
  --sc-canvas: #0A0806;  --sc-surface: #16110E;
  --sc-ink:    #F5EBDD;  --sc-ink-soft: #A2968A;
  --sc-accent: #FF5A3D;  --sc-accent-ink: #15110F;
  --sc-font-display: "Archivo", system-ui, sans-serif;
  --sc-font-text:    "Geist", system-ui, sans-serif;
}
```

## Step 5: スクロールして確かめる {#step-5-verify-by-scrolling-it}

省略はできません。スクロール位置ごとに別のコマになり、不具合は見た 2 つの位置の
あいだに潜んでいます。手順の全体は [references/verify.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/web-development/scrollcraft/references/verify.md) にあります。

```bash
cd <build project> && npm i playwright-core     # once
node <skill>/scripts/serve.mjs --root . --port 4500 &
node <skill>/scripts/shoot.mjs --url http://localhost:4500 --out lab/shots
node <skill>/scripts/shoot.mjs --url http://localhost:4500 --out lab/mobile --width 390 --height 844
node <skill>/scripts/shoot.mjs --url http://localhost:4500 --out lab/reduced --reduced-motion
```

このハーネスは各幕を 6 つの位置で順に見て、スクラブ動画が落ち着くのを待ち、
スクロールしても何も起きない区間、不透明度が最後まで上がりきらない表示、合成後の
コントラストを報告し、コンタクトシートを書き出します。そのあと `sheet.png` を自分で読みます
（vision_analyze）。ハーネスが証明するのはクリップが進むことであって、ページが何かを
伝えていることではありません。感触の確認（[references/feel.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/web-development/scrollcraft/references/feel.md) §6）も行います。
何も知らない状態でスクロールし、幕ごとに 1 語を挙げ、BRIEF.md と照らし合わせます。食い違ったら、
間違っているのはまとめではなくページです。

すべて通っても、実際のスマートフォン（動画デコーダー、自動再生のポリシー、低電力
モード）までは保証しません。モバイルで不具合の報告があれば、最初の対応で
[references/device-diag.html](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/web-development/scrollcraft/references/device-diag.html) をサイトの隣に
置き、端末自身に答えさせます。

## 厳守ルール（出荷を止めるもの） {#hard-rules-ship-blockers}

粘土のジオラマを既定にしない。「スクロールして見てね」の案内やマウスが動くアイコンを置かない。
`01 / 06` のようなセクション番号を置かない。小見出しは 3 セクションに 1 つまで。
目に見える em ダッシュを使わない。コピーの配置を変化させる。同じ手法を 2 回続けない。
ヒアリングの前に作らない。狙って作った山場は 1 つで、0 でも 3 でもない。締めはフッターへ
消えていくのではなく決着をつける。手法より先に曲線。決め手となる独自の動きを 1 つ。
すべての行に対して 6 観点中 4 つで指紋の関門を通す。エンジンを
編集しない。コントラストのために画面全体を暗くするオーバーレイを使わない（暗幕はテキストのある場所だけ）。
画像に文字を焼き込まない。統計をでっち上げない。`transition: all` を使ったり、
width/height/top/left をアニメーションさせたりしない（`transform`/`opacity` を使い、ワイプには `clip-path`）。
グラデーション文字やネオンの光彩を使わない。スクラブ用クリップに音を入れない。
Step 5 を経ずに出荷しない。

## 出力 {#output}

BRIEF.md を含むビルドフォルダーと、短いレポートです。レポートには、文法と、ほかの
7 つが選ばれなかった理由、決め手となる動き、行ごとの指紋の関門の結果、流れ、
感情の曲線と山場、感触の確認での食い違い、譜面の表、生成したもの、
スクリーンショットで確認したこと、確認できなかったことを書きます。そして
`<workspace>/FINGERPRINTS.md` にこのビルドの行を追記します。

## 落とし穴 {#pitfalls}

- `scripts/shoot.mjs` には Playwright が必要です（`npm install playwright` か、
  `playwright-core` と Chrome の導入）。Hermes の `browser_exec` ツールは、
  スクロールしながらスクリーンショットで確かめるための、より軽い代わりの方法です。ビルドを配信し、
  少しずつスクロールしてスクリーンショットを撮り、自分で見て確認します。
- `scripts/kie.mjs` には `KIE_AI_API_KEY` と有料のクレジットが必要です。予算がはっきりしないときは
  `image_generate` かユーザーの素材を優先します。
- `encode.sh` と `doctor.mjs` は、機能の揃った ffmpeg を前提にしています。ディストリビューションで機能を削った
  ffmpeg は、足りないフィルターをコマンドの構文エラーとして報告します。まず
  `scripts/doctor.mjs` を実行してください。
- 上に書いた上流スクリプトの呼び出し方は、上流のドキュメントから写したもので、
  この移植版では `node --check` による構文チェック以上の確認はしていません。ずれていたら
  `--help` やソースを信用してください。
- 上流のリポジトリには作例と変更履歴が含まれていますが、
  この移植版には同梱していません。必要なら上流のリポジトリを見てください。
