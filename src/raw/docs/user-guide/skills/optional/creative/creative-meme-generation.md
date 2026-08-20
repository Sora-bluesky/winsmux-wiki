---
title: "Meme Generation — 定型画像に Pillow で文字を重ねてミーム画像を作る"
description: "定型画像に Pillow で文字を重ねてミーム画像を作る"
upstream_path: user-guide/skills/optional/creative/creative-meme-generation.md
upstream_blob: 605fe7ddc0b5abe672a244854ec1c972c0a4b04c
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/creative/creative-meme-generation
---

# Meme Generation {#meme-generation}

定型画像に Pillow で文字を重ねて、ミームの PNG を作ります。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール型 — `hermes skills install official/creative/meme-generation` で入れます |
| パス | `optional-skills/creative/meme-generation` |
| バージョン | `2.0.0` |
| 作者 | adanaleycio |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `creative`, `memes`, `humor`, `images` |
| 関連 skill | [`ascii-art`](/hermes/docs/user-guide/skills/bundled/creative/creative-ascii-art/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として見ています。
:::

# Meme Generation {#meme-generation}

お題から実物のミーム画像を作ります。定型画像を選び、決め文句を書き、文字を重ねた本物の .png ファイルとして書き出します。

## こんなときに使います {#when-to-use}

- ミームを作ってほしい、と頼まれたとき
- 特定のお題・状況・不満についてのミームがほしいと言われたとき
- 「これミームにして」などと言われたとき

## 使える定型画像 {#available-templates}

このスクリプトは、**imgflip でよく使われる約 100 種類の定型画像**を名前か ID で扱えます。加えて、文字の位置を手で調整した 10 種類の厳選版があります。

### 厳選した定型画像（文字の位置を独自に調整） {#curated-templates-custom-text-placement}

| ID | 名前 | 差し込み口 | 向いているお題 |
|----|------|--------|----------|
| `this-is-fine` | This is Fine | top, bottom | 混乱、現実逃避 |
| `drake` | Drake Hotline Bling | reject, approve | 拒む／好む |
| `distracted-boyfriend` | Distracted Boyfriend | distraction, current, person | 誘惑、優先順位の移り変わり |
| `two-buttons` | Two Buttons | left, right, person | 選べない二択 |
| `expanding-brain` | Expanding Brain | 4 levels | だんだん増していく皮肉 |
| `change-my-mind` | Change My Mind | statement | 挑発的な持論 |
| `woman-yelling-at-cat` | Woman Yelling at Cat | woman, cat | 言い争い |
| `one-does-not-simply` | One Does Not Simply | top, bottom | 見た目より難しいこと |
| `grus-plan` | Gru's Plan | step1-3, realization | 裏目に出た計画 |
| `batman-slapping-robin` | Batman Slapping Robin | robin, batman | だめな案を止める |

### 動的に取ってくる定型画像（imgflip API から） {#dynamic-templates-from-imgflip-api}

厳選版に無い定型画像も、名前か imgflip の ID を指定すれば使えます。文字の位置は自動で決まります（差し込み口が 2 つなら上下、3 つ以上なら等間隔）。次のように探せます。
```bash
python "$SKILL_DIR/scripts/generate_meme.py" --search "disaster"
```

## 手順 {#procedure}

### やり方 1: 定型画像を使う（既定） {#mode-1-classic-template-default}

1. お題を読み、その核にある動き（混乱、板挟み、好み、皮肉など）を見きわめます
2. いちばん合う定型画像を選びます。「向いているお題」の列を見るか、`--search` で探してください。
3. 差し込み口ごとに短い決め文句を書きます（1 つあたり 8〜12 語まで。短いほど良い）。
4. この skill のスクリプトがあるディレクトリを探します。
   ```
   SKILL_DIR=$(dirname "$(find ~/.hermes/skills -path '*/meme-generation/SKILL.md' 2>/dev/null | head -1)")
   ```
5. 生成スクリプトを実行します。
   ```bash
   python "$SKILL_DIR/scripts/generate_meme.py" <template_id> /tmp/meme.png "caption 1" "caption 2" ...
   ```
6. `MEDIA:/tmp/meme.png` の形で画像を返します

### やり方 2: AI で作った独自画像を使う（image_generate が使えるとき） {#mode-2-custom-ai-image-when-imagegenerate-is-available}

合う定型画像が無いとき、あるいは相手が独自のものを望むときに使います。

1. まず決め文句を書きます。
2. `image_generate` で、ミームの発想に合う場面を作ります。画像用の指示文には文字をいっさい入れないでください — 文字はスクリプトが載せます。描くのは見た目の場面だけです。
3. image_generate の結果の URL から、生成された画像の場所を調べます。必要ならローカルに落としてください。
4. `--image` を付けてスクリプトを実行し、文字を重ねます。載せ方は 2 通りあります。
   - **重ね書き**（画像に直接、白抜き文字に黒い縁取り）:
     ```bash
     python "$SKILL_DIR/scripts/generate_meme.py" --image /path/to/scene.png /tmp/meme.png "top text" "bottom text"
     ```
   - **帯**（上下に黒い帯を敷いて白文字を置く。すっきりして必ず読める）:
     ```bash
     python "$SKILL_DIR/scripts/generate_meme.py" --image /path/to/scene.png --bars /tmp/meme.png "top text" "bottom text"
     ```
   画像が込み入っていて、上に載せると文字が読みにくいときは `--bars` を使ってください。
5. **見た目で確かめます**（`vision_analyze` が使えるとき）。仕上がりが良いか確認します。
   ```
   vision_analyze(image_url="/tmp/meme.png", question="Is the text legible and well-positioned? Does the meme work visually?")
   ```
   画像を読むモデルが問題を指摘したら（文字が読みにくい、位置が悪いなど）、もう一方の載せ方に切り替える（重ね書きと帯を入れ替える）か、場面を作り直してください。
6. `MEDIA:/tmp/meme.png` の形で画像を返します

## 例 {#examples}

**「午前 2 時に本番環境をデバッグ」:**
```bash
python generate_meme.py this-is-fine /tmp/meme.png "SERVERS ARE ON FIRE" "This is fine"
```

**「寝るか、もう 1 話見るか」:**
```bash
python generate_meme.py drake /tmp/meme.png "Getting 8 hours of sleep" "One more episode at 3 AM"
```

**「月曜の朝の段階」:**
```bash
python generate_meme.py expanding-brain /tmp/meme.png "Setting an alarm" "Setting 5 alarms" "Sleeping through all alarms" "Working from bed"
```

## 定型画像を一覧する {#listing-templates}

使えるものをすべて見るには、次を実行します。
```bash
python generate_meme.py --list
```

## つまずきやすいところ {#pitfalls}

- 決め文句は短くしてください。文字が長いミームは見た目がひどくなります。
- 文字の引数の数を、その定型画像の差し込み口の数に合わせてください。
- お題だけでなく、笑いの組み立てに合う定型画像を選んでください。
- 憎悪をあおるもの、人を傷つけるもの、個人を狙ったものは作らないでください。
- スクリプトは、最初に取ってきた定型画像を `scripts/.cache/` に取り置きします。

## 確かめ方 {#verification}

次がそろっていれば正しく作れています。

- 指定した場所に .png ファイルができている
- 定型画像の上で文字が読める（白抜きに黒い縁取り）
- 笑いが成り立っている — 決め文句が、その定型画像の想定する組み立てに合っている
- MEDIA: のパスで渡せる
