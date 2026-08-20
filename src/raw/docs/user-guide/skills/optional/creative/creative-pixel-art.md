---
title: "Pixel Art — 時代ごとの色数でドット絵を作る（NES、Game Boy、PICO-8）"
description: "時代ごとの色数でドット絵を作る（NES、Game Boy、PICO-8）"
upstream_path: user-guide/skills/optional/creative/creative-pixel-art.md
upstream_blob: c2f3d20b24e9eff466b3691d981b9a38fed2f439
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/creative/creative-pixel-art
---

# Pixel Art {#pixel-art}

時代ごとの色数でドット絵を作ります（NES、Game Boy、PICO-8）。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール型 — `hermes skills install official/creative/pixel-art` で入れます |
| パス | `optional-skills/creative/pixel-art` |
| バージョン | `2.0.0` |
| 作者 | dodo-reach |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `creative`, `pixel-art`, `arcade`, `snes`, `nes`, `gameboy`, `retro`, `image`, `video` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として見ています。
:::

# Pixel Art {#pixel-art}

どんな画像でも懐かしい雰囲気のドット絵に変え、さらに時代に合った演出（雨、蛍、雪、火の粉）を
付けた短い MP4 や GIF に動かすこともできます。

この skill には 2 つのスクリプトが付いています。

- `scripts/pixel_art.py` — 写真からドット絵の PNG へ（Floyd-Steinberg のディザリング）
- `scripts/pixel_art_video.py` — ドット絵の PNG から動く MP4 へ（GIF も任意で出せます）

どちらも読み込んで使うことも、そのまま実行することもできます。時代どおりの色を出したいときは
用意された設定がハードウェアの色数（NES、Game Boy、PICO-8 など）に合わせてくれますし、
アーケードや SNES 風にしたいときは中身に合わせた N 色への減色も使えます。

## こんなときに使います {#when-to-use}

- 元画像から懐かしいドット絵にしたいとき
- NES／Game Boy／PICO-8／C64／アーケード／SNES 風にしてほしいと言われたとき
- 短くループする動き（雨の場面、夜空、雪など）がほしいとき
- ポスター、アルバムのジャケット、SNS 投稿、スプライト、キャラクター、アイコン画像

## 進め方 {#workflow}

作る前に、どの作風にするかを相手に確かめてください。設定が違えば出来上がりも大きく変わり、
作り直しは手間がかかります。

### ステップ 1 — 作風を提示する {#step-1-offer-a-style}

代表的な設定を 4 つ挙げて `clarify` を呼びます。相手の言葉に合わせて選んでください —
14 個すべてを並べてはいけません。

相手の意図がはっきりしないときの既定の一覧です。

```python
clarify(
    question="Which pixel-art style do you want?",
    choices=[
        "arcade — bold, chunky 80s cabinet feel (16 colors, 8px)",
        "nes — Nintendo 8-bit hardware palette (54 colors, 8px)",
        "gameboy — 4-shade green Game Boy DMG",
        "snes — cleaner 16-bit look (32 colors, 4px)",
    ],
)
```

相手がすでに時代を口にしているとき（例:「80 年代のアーケード」「ゲームボーイ」）は
`clarify` を飛ばして、そのまま合う設定を使ってください。

### ステップ 2 — 動きを提示する（任意） {#step-2-offer-animation-optional}

相手が動画や GIF を求めているとき、あるいは動きが付いたほうが良さそうなときは、
どの場面にするかを尋ねます。

```python
clarify(
    question="Want to animate it? Pick a scene or skip.",
    choices=[
        "night — stars + fireflies + leaves",
        "urban — rain + neon pulse",
        "snow — falling snowflakes",
        "skip — just the image",
    ],
)
```

`clarify` を続けて 3 回以上呼んではいけません。作風で 1 回、動きを付けるなら場面で 1 回までです。
相手が最初のメッセージで作風も場面もはっきり指定しているなら、`clarify` はまったく使いません。

### ステップ 3 — 生成する {#step-3-generate}

まず `pixel_art()` を実行し、動きを求められていれば、その結果に続けて
`pixel_art_video()` を呼びます。

## 用意された設定の一覧 {#preset-catalog}

| 設定 | 時代 | 色数 | ブロック | 向いている用途 |
|--------|-----|---------|-------|----------|
| `arcade` | 80 年代アーケード | 中身に合わせて 16 色 | 8px | 目を引くポスター、主役の絵 |
| `snes` | 16 ビット | 中身に合わせて 32 色 | 4px | キャラクター、描き込んだ場面 |
| `nes` | 8 ビット | NES（54 色） | 8px | 本物の NES らしい見た目 |
| `gameboy` | DMG 携帯機 | 緑の 4 階調 | 8px | 単色のゲームボーイ |
| `gameboy_pocket` | ポケット携帯機 | 灰色の 4 階調 | 8px | 単色の GB ポケット |
| `pico8` | PICO-8 | 固定 16 色 | 6px | 空想のゲーム機らしい見た目 |
| `c64` | Commodore 64 | 固定 16 色 | 8px | 8 ビットの家庭用コンピュータ |
| `apple2` | Apple II の高解像度 | 固定 6 色 | 10px | とことん懐かしい、6 色だけ |
| `teletext` | BBC Teletext | 純色 8 色 | 10px | 粗い原色 |
| `mspaint` | Windows のペイント | 固定 24 色 | 8px | 懐かしいデスクトップ |
| `mono_green` | CRT の蛍光体 | 緑 2 色 | 6px | 端末・CRT の雰囲気 |
| `mono_amber` | CRT の琥珀色 | 琥珀 2 色 | 6px | 琥珀色モニターの見た目 |
| `neon` | サイバーパンク | ネオン 10 色 | 6px | ヴェイパーウェイヴ／サイバー |
| `pastel` | やわらかいパステル | パステル 10 色 | 6px | かわいい／穏やか |

名前の付いた色の組は `scripts/palettes.py` にあります（全 28 種類の一覧は
`references/palettes.md` を参照してください）。どの設定も上書きできます。

```python
pixel_art("in.png", "out.png", preset="snes", palette="PICO_8", block=6)
```

## 場面の一覧（動画用） {#scene-catalog-for-video}

| 場面 | 演出 |
|-------|---------|
| `night` | またたく星＋蛍＋舞う葉 |
| `dusk` | 蛍＋きらめき |
| `tavern` | 舞う埃＋暖かいきらめき |
| `indoor` | 舞う埃 |
| `urban` | 雨＋ネオンの明滅 |
| `nature` | 葉＋蛍 |
| `magic` | きらめき＋蛍 |
| `storm` | 雨＋稲光 |
| `underwater` | 泡＋光のきらめき |
| `fire` | 火の粉＋きらめき |
| `snow` | 雪＋きらめき |
| `desert` | 陽炎＋砂埃 |

## 呼び出し方 {#invocation-patterns}

### Python（読み込んで使う） {#python-import}

```python

sys.path.insert(0, "/home/teknium/.hermes/skills/creative/pixel-art/scripts")
from pixel_art import pixel_art
from pixel_art_video import pixel_art_video

# 1. Convert to pixel art
pixel_art("/path/to/photo.jpg", "/tmp/pixel.png", preset="nes")

# 2. Animate (optional)
pixel_art_video(
    "/tmp/pixel.png",
    "/tmp/pixel.mp4",
    scene="night",
    duration=6,
    fps=15,
    seed=42,
    export_gif=True,
)
```

### CLI {#cli}

```bash
cd /home/teknium/.hermes/skills/creative/pixel-art/scripts

python pixel_art.py in.jpg out.png --preset gameboy
python pixel_art.py in.jpg out.png --preset snes --palette PICO_8 --block 6

python pixel_art_video.py out.png out.mp4 --scene night --duration 6 --gif
```

## この処理順にしている理由 {#pipeline-rationale}

**ドット絵への変換:**
1. コントラスト・彩度・シャープネスを持ち上げます（色数が少ないほど強めに）
2. 減色の前にポスタリゼーションをかけ、明暗の面を単純にします
3. `Image.NEAREST` で `block` の分だけ縮小します（境目のはっきりしたドット、補間なし）
4. Floyd-Steinberg のディザリングで減色します。相手は中身に合わせた N 色か、
   名前の付いたハードウェアの色の組のどちらかです
5. `Image.NEAREST` で元の大きさへ戻します

縮小の**あと**に減色することで、ディザリングが最終的なドットの升目とそろいます。先に減色すると、
どうせ消える細部に誤差拡散をむだ遣いすることになります。

**動画の重ね合わせ:**
- 1 コマごとに元の絵を写します（背景は動きません）
- コマごとに状態を持たない粒子の描画を重ねます（演出ごとに関数 1 つ）
- ffmpeg の `libx264 -pix_fmt yuv420p -crf 18` で書き出します
- GIF は任意で `palettegen` と `paletteuse` を使って出します

## 必要なもの {#dependencies}

- Python 3.9 以上
- Pillow（`pip install Pillow`）
- PATH の通った ffmpeg（動画のときだけ必要です — Hermes のインストール用パッケージがこれを入れます）

## つまずきやすいところ {#pitfalls}

- 色の組の名前は大文字と小文字を区別します（`"NES"`、`"PICO_8"`、`"GAMEBOY_ORIGINAL"`）。
- とても小さい元画像（横幅 &lt;100px）は、8〜10px のブロックだとつぶれます。小さすぎるときは
  先に元画像を拡大してください。
- `block` や `palette` に小数を渡すと減色が壊れます — 正の整数のままにしてください。
- 動きの粒子の数は 640x480 くらいの画面に合わせてあります。とても大きい画像では、
  種を変えてもう一度かけ、密度を上げたくなるかもしれません。
- `mono_green` と `mono_amber` は `color=0.0`（彩度を落とす）を強制します。ここを上書きして
  色みを残すと、2 色の組ではなめらかな面に縞が出ることがあります。
- `clarify` の繰り返し: 1 ターンにつき 2 回まで（作風、それから場面）。相手に選ばせ続けないでください。

## 確かめ方 {#verification}

- 指定した場所に PNG ができている
- その設定のブロックの大きさで、四角いドットの升目がはっきり見える
- 色数が設定どおりになっている（目で見るか、`Image.open(p).getcolors()` を実行して確かめます）
- 動画が正しい MP4 になっている（`ffprobe` で開けて、大きさが 0 でない）

## 出典 {#attribution}

名前の付いたハードウェアの色の組と、`pixel_art_video.py` にある手続き的な動きのループは
[pixel-art-studio](https://github.com/Synero/pixel-art-studio)（MIT）から移植したものです。
詳しくは、この skill のディレクトリにある `ATTRIBUTION.md` を参照してください。
