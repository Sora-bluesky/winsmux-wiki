---
title: "Ascii Art — アスキーアート: pyfiglet、cowsay、boxes、画像からの変換"
description: "アスキーアート: pyfiglet、cowsay、boxes、画像からの変換"
upstream_path: user-guide/skills/optional/creative/creative-ascii-art.md
upstream_blob: 7a04bb125d0b2e8c379414a54278eb040a04db14
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/creative/creative-ascii-art
---

# Ascii Art {#ascii-art}

アスキーアート: pyfiglet、cowsay、boxes、画像からの変換。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加で入れるもの — `hermes skills install official/creative/ascii-art` で導入します |
| パス | `optional-skills/creative\ascii-art` |
| バージョン | `4.0.0` |
| 作者 | 0xbyt4, Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `ASCII`, `Art`, `Banners`, `Creative`, `Unicode`, `Text-Art`, `pyfiglet`, `figlet`, `cowsay`, `boxes` |
| 関連 skill | [`excalidraw`](/hermes/docs/user-guide/skills/optional/creative/creative-excalidraw/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこの内容を指示として見ています。
:::

# ASCII Art の skill {#ascii-art-skill}

用途ごとに複数の道具を使い分けます。どれもローカルの CLI か無料の REST API なので、API キーは要りません。

## 道具 1: 文字のバナー（pyfiglet — ローカル） {#tool-1-text-banners-pyfiglet-local}

文字を大きなアスキーアートのバナーとして描きます。フォントは 571 種類が最初から入っています。

### 準備 {#setup}

```bash
pip install pyfiglet --break-system-packages -q
```

### 使い方 {#usage}

```bash
python -m pyfiglet "YOUR TEXT" -f slant
python -m pyfiglet "TEXT" -f doom -w 80    # Set width
python -m pyfiglet --list_fonts             # List all 571 fonts
```

### おすすめのフォント {#recommended-fonts}

| 雰囲気 | フォント | 向いている用途 |
|-------|------|----------|
| すっきり現代的 | `slant` | プロジェクト名、見出し |
| 太くて塊感がある | `doom` | タイトル、ロゴ |
| 大きくて読みやすい | `big` | バナー |
| 昔ながらのバナー | `banner3` | 横幅の広い画面 |
| 小さくまとまる | `small` | 副題 |
| サイバーパンク | `cyberlarge` | 技術系の題材 |
| 立体的に見える | `3-d` | 起動画面 |
| ゴシック | `gothic` | 劇的な文字 |

### こつ {#tips}

- 2〜3 種類のフォントを見せて、利用者に好きなものを選んでもらいます
- 短い文字（1〜8 文字）は `doom` や `block` のような描き込みの多いフォントが映えます
- 長い文字は `small` や `mini` のような小さくまとまるフォントのほうが読めます

## 道具 2: 文字のバナー（asciified API — 通信、導入不要） {#tool-2-text-banners-asciified-api-remote-no-install}

文字をアスキーアートに変換する無料の REST API です。FIGlet のフォントが 250 種類以上あります。ただの文字列がそのまま返るので、解析の手間もありません。pyfiglet が入っていないときや、手軽に済ませたいときに使ってください。

### 使い方（terminal から curl で） {#usage-via-terminal-curl}

```bash
# Basic text banner (default font)
curl -s "https://asciified.thelicato.io/api/v2/ascii?text=Hello+World"

# With a specific font
curl -s "https://asciified.thelicato.io/api/v2/ascii?text=Hello&font=Slant"
curl -s "https://asciified.thelicato.io/api/v2/ascii?text=Hello&font=Doom"
curl -s "https://asciified.thelicato.io/api/v2/ascii?text=Hello&font=Star+Wars"
curl -s "https://asciified.thelicato.io/api/v2/ascii?text=Hello&font=3-D"
curl -s "https://asciified.thelicato.io/api/v2/ascii?text=Hello&font=Banner3"

# List all available fonts (returns JSON array)
curl -s "https://asciified.thelicato.io/api/v2/fonts"
```

### こつ {#tips}

- text の値では、空白を `+` に置き換えます
- 応答は JSON に包まれていない、そのまま表示できるアスキーアートです
- フォント名は大文字と小文字を区別します。正確な名前はフォント一覧のエンドポイントで確かめてください
- curl があればどの端末からでも使えます。Python も pip も要りません

## 道具 3: cowsay（吹き出しのアート） {#tool-3-cowsay-message-art}

文字を吹き出しに入れて、アスキーアートのキャラクターに喋らせる昔ながらの道具です。

### 準備 {#setup}

```bash
sudo apt install cowsay -y    # Debian/Ubuntu
# brew install cowsay         # macOS
```

### 使い方 {#usage}

```bash
cowsay "Hello World"
cowsay -f tux "Linux rules"       # Tux the penguin
cowsay -f dragon "Rawr!"          # Dragon
cowsay -f stegosaurus "Roar!"     # Stegosaurus
cowthink "Hmm..."                  # Thought bubble
cowsay -l                          # List all characters
```

### 使えるキャラクター（50 種類以上） {#available-characters-50}

`beavis.zen`, `bong`, `bunny`, `cheese`, `daemon`, `default`, `dragon`,
`dragon-and-cow`, `elephant`, `eyes`, `flaming-skull`, `ghostbusters`,
`hellokitty`, `kiss`, `kitty`, `koala`, `luke-koala`, `mech-and-cow`,
`meow`, `moofasa`, `moose`, `ren`, `sheep`, `skeleton`, `small`,
`stegosaurus`, `stimpy`, `supermilker`, `surgery`, `three-eyes`,
`turkey`, `turtle`, `tux`, `udder`, `vader`, `vader-koala`, `www`

### 目と舌を変える {#eyetongue-modifiers}

```bash
cowsay -b "Borg"       # =_= eyes
cowsay -d "Dead"       # x_x eyes
cowsay -g "Greedy"     # $_$ eyes
cowsay -p "Paranoid"   # @_@ eyes
cowsay -s "Stoned"     # *_* eyes
cowsay -w "Wired"      # O_O eyes
cowsay -e "OO" "Msg"   # Custom eyes
cowsay -T "U " "Msg"   # Custom tongue
```

## 道具 4: boxes（飾り枠） {#tool-4-boxes-decorative-borders}

どんな文字でも、アスキーアートの飾り枠で囲みます。デザインは 70 種類以上が最初から入っています。

### 準備 {#setup}

```bash
sudo apt install boxes -y    # Debian/Ubuntu
# brew install boxes         # macOS
```

### 使い方 {#usage}

```bash
echo "Hello World" | boxes                    # Default box
echo "Hello World" | boxes -d stone           # Stone border
echo "Hello World" | boxes -d parchment       # Parchment scroll
echo "Hello World" | boxes -d cat             # Cat border
echo "Hello World" | boxes -d dog             # Dog border
echo "Hello World" | boxes -d unicornsay      # Unicorn
echo "Hello World" | boxes -d diamonds        # Diamond pattern
echo "Hello World" | boxes -d c-cmt           # C-style comment
echo "Hello World" | boxes -d html-cmt        # HTML comment
echo "Hello World" | boxes -a c               # Center text
boxes -l                                       # List all 70+ designs
```

### pyfiglet や asciified と組み合わせる {#combine-with-pyfiglet-or-asciified}

```bash
python -m pyfiglet "HERMES" -f slant | boxes -d stone
# Or without pyfiglet installed:
curl -s "https://asciified.thelicato.io/api/v2/ascii?text=HERMES&font=Slant" | boxes -d stone
```

## 道具 5: TOIlet（色付きの文字アート） {#tool-5-toilet-colored-text-art}

pyfiglet に似ていますが、ANSI の色や見た目のフィルタを付けられます。端末を彩るのに向いています。

### 準備 {#setup}

```bash
sudo apt install toilet toilet-fonts -y    # Debian/Ubuntu
# brew install toilet                      # macOS
```

### 使い方 {#usage}

```bash
toilet "Hello World"                    # Basic text art
toilet -f bigmono12 "Hello"            # Specific font
toilet --gay "Rainbow!"                 # Rainbow coloring
toilet --metal "Metal!"                 # Metallic effect
toilet -F border "Bordered"             # Add border
toilet -F border --gay "Fancy!"         # Combined effects
toilet -f pagga "Block"                 # Block-style font (unique to toilet)
toilet -F list                          # List available filters
```

### フィルタ {#filters}

`crop`, `gay` (rainbow), `metal`, `flip`, `flop`, `180`, `left`, `right`, `border`

**補足**: toilet は色を ANSI のエスケープコードで出力します。端末では色が付きますが、そうでない場所（ただのテキストファイル、一部のチャットなど）ではうまく表示されないことがあります。

## 道具 6: 画像をアスキーアートに変換する {#tool-6-image-to-ascii-art}

画像（PNG、JPEG、GIF、WEBP）をアスキーアートに変換します。

### 方法 A: ascii-image-converter（推奨、新しめ） {#option-a-ascii-image-converter-recommended-modern}

```bash
# Install
sudo snap install ascii-image-converter
# OR: go install github.com/TheZoraiz/ascii-image-converter@latest
```

```bash
ascii-image-converter image.png                  # Basic
ascii-image-converter image.png -C               # Color output
ascii-image-converter image.png -d 60,30         # Set dimensions
ascii-image-converter image.png -b               # Braille characters
ascii-image-converter image.png -n               # Negative/inverted
ascii-image-converter https://url/image.jpg      # Direct URL
ascii-image-converter image.png --save-txt out   # Save as text
```

### 方法 B: jp2a（軽量、JPEG のみ） {#option-b-jp2a-lightweight-jpeg-only}

```bash
sudo apt install jp2a -y
jp2a --width=80 image.jpg
jp2a --colors image.jpg              # Colorized
```

## 道具 7: できあいのアスキーアートを探す {#tool-7-search-pre-made-ascii-art}

Web で集められたアスキーアートを探します。`terminal` から `curl` を使ってください。

### 提供元 A: ascii.co.uk（できあいの作品ならここ） {#source-a-asciicouk-recommended-for-pre-made-art}

昔ながらのアスキーアートを題材ごとにまとめた大きな作品集です。作品は HTML の `<pre>` タグの中にあります。curl でページを取ってきて、短い Python で作品を取り出します。

**URL の形:** `https://ascii.co.uk/art/{subject}`

**手順 1 — ページを取ってくる:**

```bash
curl -s 'https://ascii.co.uk/art/cat' -o /tmp/ascii_art.html
```

**手順 2 — pre タグから作品を取り出す:**

```python

with open('/tmp/ascii_art.html') as f:
    text = f.read()
arts = re.findall(r'<pre[^>]*>(.*?)</pre>', text, re.DOTALL)
for art in arts:
    clean = re.sub(r'<[^>]+>', '', art)
    clean = html.unescape(clean).strip()
    if len(clean) > 30:
        print(clean)
        print('\n---\n')
```

**用意されている題材**（URL のパスに使います）:
- 動物: `cat`, `dog`, `horse`, `bird`, `fish`, `dragon`, `snake`, `rabbit`, `elephant`, `dolphin`, `butterfly`, `owl`, `wolf`, `bear`, `penguin`, `turtle`
- もの: `car`, `ship`, `airplane`, `rocket`, `guitar`, `computer`, `coffee`, `beer`, `cake`, `house`, `castle`, `sword`, `crown`, `key`
- 自然: `tree`, `flower`, `sun`, `moon`, `star`, `mountain`, `ocean`, `rainbow`
- 登場人物: `skull`, `robot`, `angel`, `wizard`, `pirate`, `ninja`, `alien`
- 行事: `christmas`, `halloween`, `valentine`

**こつ:**
- 作者の署名や頭文字は消さないでください。作法として大事なところです
- 1 ページに複数の作品があります。利用者に合うものを選んでください
- curl で確実に取れます。JavaScript は要りません

### 提供元 B: GitHub の Octocat API（お遊びの隠し要素） {#source-b-github-octocat-api-fun-easter-egg}

GitHub の Octocat と気の利いた一言をランダムに返します。認証は不要です。

```bash
curl -s https://api.github.com/octocat
```

## 道具 8: 楽しい小ネタ（curl から） {#tool-8-fun-ascii-utilities-via-curl}

これらの無料サービスは、アスキーアートをそのまま返します。ちょっとした遊びに向いています。

### QR コードをアスキーアートで {#qr-codes-as-ascii-art}

```bash
curl -s "qrenco.de/Hello+World"
curl -s "qrenco.de/https://example.com"
```

### 天気をアスキーアートで {#weather-as-ascii-art}

```bash
curl -s "wttr.in/London"          # Full weather report with ASCII graphics
curl -s "wttr.in/Moon"            # Moon phase in ASCII art
curl -s "v2.wttr.in/London"       # Detailed version
```

## 道具 9: LLM が自分で描く（最後の手段） {#tool-9-llm-generated-custom-art-fallback}

上のどの道具にも欲しいものがないときは、次の Unicode の文字を使って自分でアスキーアートを描きます。

### 使える文字 {#character-palette}

**罫線:** `╔ ╗ ╚ ╝ ║ ═ ╠ ╣ ╦ ╩ ╬ ┌ ┐ └ ┘ │ ─ ├ ┤ ┬ ┴ ┼ ╭ ╮ ╰ ╯`

**ブロック:** `░ ▒ ▓ █ ▄ ▀ ▌ ▐ ▖ ▗ ▘ ▝ ▚ ▞`

**図形と記号:** `◆ ◇ ◈ ● ○ ◉ ■ □ ▲ △ ▼ ▽ ★ ☆ ✦ ✧ ◀ ▶ ◁ ▷ ⬡ ⬢ ⌂`

### 決まりごと {#rules}

- 横幅は 1 行 60 文字まで（端末で崩れない範囲）
- 高さはバナーで 15 行、場面を描くなら 25 行まで
- 等幅であること。等幅フォントで正しく表示できる形にします

## どれを使うか {#decision-flow}

1. **文字をバナーにしたい** → pyfiglet があればそれを、なければ curl から asciified API を使う
2. **メッセージをキャラクターのアートに入れたい** → cowsay
3. **飾り枠を付けたい** → boxes（pyfiglet や asciified と組み合わせられます）
4. **特定のもののアートが欲しい**（猫、ロケット、竜など） → curl で ascii.co.uk から取って解析する
5. **画像をアスキーアートにしたい** → ascii-image-converter か jp2a
6. **QR コード** → curl で qrenco.de
7. **天気や月のアート** → curl で wttr.in
8. **もっと自由に作りたい** → Unicode の文字を使って LLM が描く
9. **必要な道具が入っていない** → 導入するか、次の選択肢に移る
