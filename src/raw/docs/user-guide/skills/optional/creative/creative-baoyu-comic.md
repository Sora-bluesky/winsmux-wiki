---
title: "Baoyu Comic — 知識まんが（知识漫画）。学習向け、伝記、手引き"
description: "知識まんが（知识漫画）。学習向け、伝記、手引き"
upstream_path: user-guide/skills/optional/creative/creative-baoyu-comic.md
upstream_blob: 88fdc93af6a3f9927cd5139319d1c79a0c24a9e8
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/creative/creative-baoyu-comic
---

# Baoyu Comic {#baoyu-comic}

知識まんが（知识漫画）です。学習向け、伝記、手引きに使えます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加で入れるもの — `hermes skills install official/creative/baoyu-comic` で導入します |
| パス | `optional-skills/creative/baoyu-comic` |
| バージョン | `1.56.1` |
| 作者 | 宝玉 (JimLiu) |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `comic`, `knowledge-comic`, `creative`, `image-generation` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Knowledge Comic Creator {#knowledge-comic-creator}

[baoyu-comic](https://github.com/JimLiu/baoyu-skills) を、Hermes Agent の道具立てに合わせて作り直したものです。

絵柄と雰囲気を自由に組み合わせて、知識まんがを一から作ります。

## こんなときに使います {#when-to-use}

知識まんが・学習まんが、伝記まんが、手引きのまんがを作ってほしいと頼まれたとき、あるいは「知识漫画」「教育漫画」「Logicomix-style」といった言い方をされたときに、この skill を呼び出します。利用者は元になる内容（文章、ファイルの場所、URL、または題材）を渡し、必要に応じて絵柄・雰囲気・コマ割り・縦横比・言語を指定します。

## 参考画像 {#reference-images}

Hermes の `image_generate` ツールは**文章だけを受け取ります**。プロンプトと縦横比を渡すと画像の URL が返るしくみで、参考画像は**受け取れません**。利用者が参考画像を渡してきたときは、そこから**特徴を言葉にして取り出し**、各ページのプロンプトすべてに埋め込みます。

**受け取り方**: 利用者がファイルの場所を渡してきたらそれを使います（会話に画像を貼ってきた場合も同じです）。
- ファイルの場所がある場合 → 出どころを残すため、まんがの出力先の隣にある `refs/NN-ref-{slug}.{ext}` に写します
- 場所のない貼り付け画像 → `clarify` で場所をたずねるか、絵柄の特徴を言葉にして書き留めることで代えます
- 参考画像がない場合 → この節は飛ばします

**使い分け**（参考画像ごとに指定します）:

| 指定 | はたらき |
|-------|--------|
| `style` | 絵柄の特徴（線の引き方、質感、雰囲気）を取り出し、全ページのプロンプト本文に足します |
| `palette` | 色の値を取り出し、全ページのプロンプト本文に足します |
| `scene` | 場面の構図や題材の覚え書きを取り出し、関係するページのプロンプトに足します |

参考画像があるときは、**各ページのプロンプトの先頭に書き残します**。

```yaml
references:
  - ref_id: 01
    filename: 01-ref-scene.png
    usage: style
    traits: "muted earth tones, soft-edged ink wash, low-contrast backgrounds"
```

登場人物の見た目をそろえるのは、手順 3 で書く `characters/characters.md` の**文章による説明**です。これを手順 5 で全ページのプロンプトに直接埋め込みます。手順 7.1 で作る登場人物の一覧画像（PNG）は、人が目で確かめるためのもので、`image_generate` に渡す材料ではありません。

## 指定できるもの {#options}

### 見た目に関するもの {#visual-dimensions}

| 項目 | 値 | 説明 |
|--------|--------|-------------|
| 絵柄 | ligne-claire（既定）, manga, realistic, ink-brush, chalk, minimalist | 絵の描き方 |
| 雰囲気 | neutral（既定）, warm, dramatic, romantic, energetic, vintage, action | 気分、空気感 |
| コマ割り | standard（既定）, cinematic, dense, splash, mixed, webtoon, four-panel | コマの並べ方 |
| 縦横比 | 3:4（既定、縦長）, 4:3（横長）, 16:9（横に広い） | ページの縦横比 |
| 言語 | auto（既定）, zh, en, ja など | 出力の言語 |
| 参考画像 | ファイルの場所 | 絵柄や配色の特徴を取り出すための参考画像（画像モデルには渡りません）。上の [参考画像](#reference-images) を見てください。 |

### 途中まででやめたいとき {#partial-workflow-options}

| 項目 | 説明 |
|--------|-------------|
| 絵コンテだけ | 絵コンテだけ作り、プロンプトと画像は作りません |
| プロンプトまで | 絵コンテとプロンプトを作り、画像は作りません |
| 画像だけ | すでにあるプロンプトのフォルダから画像を作ります |
| N ページ目を作り直す | 指定したページだけ作り直します（たとえば `3` や `2,5,8`） |

詳しくはこちら: [references/partial-workflows.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative/baoyu-comic/references/partial-workflows.md)

### 絵柄・雰囲気・まとめ指定の一覧 {#art-tone-preset-catalogue}

- **絵柄**（6 種類）: `ligne-claire`, `manga`, `realistic`, `ink-brush`, `chalk`, `minimalist`。詳しい定義は `references/art-styles/<style>.md` にあります。
- **雰囲気**（7 種類）: `neutral`, `warm`, `dramatic`, `romantic`, `energetic`, `vintage`, `action`。詳しい定義は `references/tones/<tone>.md` にあります。
- **まとめ指定**（5 種類）。絵柄と雰囲気を足しただけではない、独自の決まりを持ちます。

  | まとめ指定 | 中身 | 特徴 |
  |--------|-----------|------|
  | `ohmsha` | manga + neutral | 目に見える比喩、説明顔の連続を避ける、仕掛けの見せ場 |
  | `wuxia` | ink-brush + action | 気の表現、立ち回りの見せ方、情景づくり |
  | `shoujo` | manga + romantic | 飾りの要素、瞳の描き込み、恋の見せ場 |
  | `concept-story` | manga + warm | 象徴を使った表現、成長の筋立て、会話と動きの釣り合い |
  | `four-panel` | minimalist + neutral + four-panel layout | 起承转合の組み立て、白黒＋差し色、棒人間の登場人物 |

  詳しい決まりは `references/presets/<preset>.md` にあります。まとめ指定を選んだら、そのファイルを読み込んでください。

- **組み合わせの相性表**と、**内容から見たまとめ指定の選び方**は [references/auto-selection.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative/baoyu-comic/references/auto-selection.md) にあります。手順 2 で組み合わせをすすめる前に、ここを読んでください。

## ファイルの並び {#file-structure}

出力先: `comic/{topic-slug}/`
- スラッグ: 題材から取った 2〜4 語のハイフンつなぎ（たとえば `alan-turing-bio`）
- 同じ名前があるとき: 時刻を後ろに足します（たとえば `turing-story-20260118-143052`）

**中身**:
| ファイル | 説明 |
|------|-------------|
| `source-{slug}.md` | 保存した元の内容（ハイフンつなぎのスラッグは出力先と同じもの） |
| `analysis.md` | 内容の読み解き |
| `storyboard.md` | コマ割りまで落とした絵コンテ |
| `characters/characters.md` | 登場人物の設定 |
| `characters/characters.png` | 登場人物の一覧画像（`image_generate` から落としたもの） |
| `prompts/NN-{cover\|page}-[slug].md` | 生成に使うプロンプト |
| `NN-{cover\|page}-[slug].png` | できあがった画像（`image_generate` から落としたもの） |
| `refs/NN-ref-{slug}.{ext}` | 利用者が渡した参考画像（任意、出どころを残すため） |

## 言語の扱い {#language-handling}

**どう決めるか**:
1. 利用者がはっきり指定した言語
2. 会話で使われている言語
3. 元の内容の言語

**決まりごと**: やり取りはすべて利用者の言語で行います。
- 絵コンテの構成や場面の説明
- 画像生成のプロンプト
- 選択肢の提示と確認
- 途中経過、質問、エラー、まとめ

専門用語は英語のままにします。

## 進め方 {#workflow}

### 進み具合の確認表 {#progress-checklist}

```
Comic Progress:
- [ ] Step 1: Setup & Analyze
  - [ ] 1.1 Analyze content
  - [ ] 1.2 Check existing directory
- [ ] Step 2: Confirmation - Style & options ⚠️ REQUIRED
- [ ] Step 3: Generate storyboard + characters
- [ ] Step 4: Review outline (conditional)
- [ ] Step 5: Generate prompts
- [ ] Step 6: Review prompts (conditional)
- [ ] Step 7: Generate images
  - [ ] 7.1 Generate character sheet (if needed) → characters/characters.png
  - [ ] 7.2 Generate pages (with character descriptions embedded in prompt)
- [ ] Step 8: Completion report
```

### 全体の流れ {#flow}

```
Input → Analyze → [Check Existing?] → [Confirm: Style + Reviews] → Storyboard → [Review?] → Prompts → [Review?] → Images → Complete
```

### 手順のまとめ {#step-summary}

| 手順 | やること | 主にできるもの |
|------|--------|------------|
| 1.1 | 内容を読み解く | `analysis.md`, `source-{slug}.md` |
| 1.2 | 既にあるフォルダを確かめる | 名前のぶつかりに対処する |
| 2 | 絵柄、焦点、読み手、確認の要否を決める | 利用者の希望 |
| 3 | 絵コンテと登場人物を作る | `storyboard.md`, `characters/` |
| 4 | 構成を見てもらう（頼まれた場合） | 利用者の承諾 |
| 5 | プロンプトを作る | `prompts/*.md` |
| 6 | プロンプトを見てもらう（頼まれた場合） | 利用者の承諾 |
| 7.1 | 登場人物の一覧画像を作る（必要なら） | `characters/characters.png` |
| 7.2 | ページを作る | `*.png` のファイル |
| 8 | 仕上がりの報告 | まとめ |

### 利用者への質問 {#user-questions}

`clarify` ツールで希望を確かめます。`clarify` は一度にひとつしか質問できないので、いちばん大事なことから順に聞いていきます。手順 2 の質問一式は [references/workflow.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative/baoyu-comic/references/workflow.md) にあります。

**返事がないときの扱い（重要）**: `clarify` は `"The user did not provide a response within the time limit. Use your best judgement to make the choice and proceed."` を返すことがあります。これは、すべてを既定のまま進めてよいという承諾ではありません。

- その**一問についてだけ**既定を使ったと考えます。手順 2 の残りの質問は順に続けてください。質問はどれも、それぞれ独立した確認の場です。
- **既定にしたことは、次の発言ではっきり伝えます**。あとから直してもらえるようにするためです。たとえば `"Style: defaulted to ohmsha preset (clarify timed out). Say the word to switch."` のように書きます。伝えられていない既定は、そもそも聞かなかったのと区別がつきません。
- 一度返事がなかったからといって、手順 2 をまとめて「すべて既定で」で片づけては**いけません**。本当にその場を離れているなら、五つの質問すべてで同じことが起きるでしょう。それでも、目に見える形で既定を伝えておけば戻ってきたときに直せますし、伝えていなければ直しようがありません。

### 手順 7: 画像を作る {#step-7-image-generation}

画像は、すべて Hermes に元から入っている `image_generate` ツールで作ります。受け取れるのは `prompt` と `aspect_ratio`（`landscape` | `portrait` | `square`）だけで、返ってくるのは**ファイルではなく URL** です。作ったページも登場人物の一覧画像も、いったん出力先に落とす必要があります。

**プロンプトのファイルは必ず作ります**: `image_generate` を呼ぶ前に、その画像の最終的なプロンプトを `prompts/` の下に一枚のファイルとして書き出します（名前の付け方は `NN-{type}-[slug].md`）。これが、あとから同じものを作るための記録になります。

**縦横比の読み替え** — 絵コンテの `aspect_ratio` は、`image_generate` の値に次のように読み替えます。

| 絵コンテの比率 | `image_generate` の値 |
|------------------|-------------------------|
| `3:4`, `9:16`, `2:3` | `portrait` |
| `4:3`, `16:9`, `3:2` | `landscape` |
| `1:1` | `square` |

**落とす手順** — `image_generate` を呼んだら、毎回こうします。
1. 返ってきた結果から URL を読みます
2. 出力先を**絶対パス**で指定して、画像を取ってきます。たとえば
   `curl -fsSL "<url>" -o /abs/path/to/comic/<slug>/NN-page-<slug>.png`
3. 次のページに進む前に、そのパスにファイルができていて、中身が空でないことを確かめます

**`-o` の場所を、シェルの作業フォルダ任せにしてはいけません。** ターミナルの作業フォルダは、まとまりごとに変わることがあります（セッションの期限切れ、`TERMINAL_LIFETIME_SECONDS`、`cd` の失敗で違う場所に残るなど）。`curl -o relative/path.png` は静かに失敗する仕掛けです。作業フォルダがずれていると、エラーも出ないまま別の場所にファイルが落ちます。**`-o` には必ず完全な絶対パスを渡す**か、ターミナルのツールに `workdir=<abs path>` を渡してください。2026 年 4 月の実例: 全 10 ページのまんがのうち 06〜09 ページが、`comic/<slug>/` ではなくリポジトリの一番上に落ちました。3 つ目のまとまりが 2 つ目の古い作業フォルダを引き継いだ状態で `curl -o 06-page-skills.png` を実行したためです。そのあとエージェントは何ターンにもわたって、ありもしない場所にファイルがあると言い続けました。

**7.1 登場人物の一覧画像** — 同じ人物が繰り返し出てくる複数ページのまんがのときに作ります（`characters/characters.png` に、縦横比は `landscape`）。単純なまとめ指定（four-panel の minimalist など）や 1 ページのまんがでは作りません。`image_generate` を呼ぶ前に、`characters/characters.md` のプロンプトのファイルが用意されている必要があります。できあがった PNG は**人が目で確かめるためのもの**で（登場人物の見た目を利用者が確認できます）、あとで作り直したりプロンプトを手で直したりするときの手がかりにもなります。手順 7.2 を動かすものでは**ありません**。ページのプロンプトは、手順 5 の時点で `characters/characters.md` の**文章による説明**から書かれています。`image_generate` は画像を入力として受け取れないからです。

**7.2 ページ** — `image_generate` を呼ぶ前に、各ページのプロンプトが `prompts/NN-{cover|page}-[slug].md` に用意されている必要があります。`image_generate` は文章しか受け取らないので、登場人物の見た目は、**手順 5 で `characters/characters.md` の説明を全ページのプロンプトに直接埋め込むこと**でそろえます。7.1 で PNG を作ったかどうかにかかわらず、この埋め込みは同じように行います。PNG はあくまで、確認と作り直しのための助けです。

**古いものを残す決まり**: すでにある `prompts/…md` や `…png` は、作り直す前に `-backup-YYYYMMDD-HHMMSS` を後ろに付けた名前に変えておきます。

一手ずつの詳しい進め方（読み解き、絵コンテ、確認の関門、作り直しのやり方）はこちら: [references/workflow.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative/baoyu-comic/references/workflow.md)。

## 参考資料 {#references}

**基本のひな型**:
- [analysis-framework.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative/baoyu-comic/references/analysis-framework.md) - 内容を深く読み解く
- [character-template.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative/baoyu-comic/references/character-template.md) - 登場人物の書き方
- [storyboard-template.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative/baoyu-comic/references/storyboard-template.md) - 絵コンテの組み立て
- [ohmsha-guide.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative/baoyu-comic/references/ohmsha-guide.md) - オーム社まんがのつくり

**絵柄などの定義**:
- `references/art-styles/` - 絵柄（ligne-claire, manga, realistic, ink-brush, chalk, minimalist）
- `references/tones/` - 雰囲気（neutral, warm, dramatic, romantic, energetic, vintage, action）
- `references/presets/` - 独自の決まりを持つまとめ指定（ohmsha, wuxia, shoujo, concept-story, four-panel）
- `references/layouts/` - コマ割り（standard, cinematic, dense, splash, mixed, webtoon, four-panel）

**進め方**:
- [workflow.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative/baoyu-comic/references/workflow.md) - 進め方の詳細
- [auto-selection.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative/baoyu-comic/references/auto-selection.md) - 内容から手がかりを読み取る
- [partial-workflows.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative/baoyu-comic/references/partial-workflows.md) - 途中まででやめたいとき

## ページを直したいとき {#page-modification}

| やること | 手順 |
|--------|-------|
| **差し替え** | **まずプロンプトのファイルを直す** → 画像を作り直す → 新しい PNG を落とす |
| **追加** | その位置にプロンプトを作る → 登場人物の説明を埋め込んで生成 → 以降の番号を振り直す → 絵コンテを更新 |
| **削除** | ファイルを消す → 以降の番号を振り直す → 絵コンテを更新 |

**大事なこと**: ページを直すときは、作り直す前に必ずプロンプトのファイル（`prompts/NN-{cover|page}-[slug].md`）を先に直してください。そうしておけば、何を変えたかが残り、同じものをもう一度作れます。

## つまずきやすいところ {#pitfalls}

- 画像の生成は 1 ページあたり 10〜30 秒かかります。失敗したら自動で一度だけやり直します
- **必ず落とす** — `image_generate` が返した URL は、手元の PNG に落としてください。あとに続く道具も、利用者の確認も、その場かぎりの URL ではなく出力先のファイルを前提にしています
- **`curl -o` には絶対パスを使う** — まとまりをまたいでシェルの作業フォルダを当てにしてはいけません。静かに失敗する仕掛けです。ファイルが別の場所に落ち、目当ての場所を `ls` しても何も出てきません。手順 7 の「落とす手順」を見てください
- 実在の人物を扱うときは、絵柄を寄せた描き方にします
- **手順 2 の確認は必須です** — 飛ばさないでください
- **手順 4 と 6 は場合によります** — 手順 2 で利用者が頼んだときだけ行います
- **手順 7.1 の登場人物の一覧画像** — 複数ページのまんがではおすすめですが、単純なまとめ指定では省けます。PNG は確認と作り直しのための助けです。ページのプロンプト（手順 5 で書きます）が使うのは `characters/characters.md` の文章による説明であって、PNG ではありません。`image_generate` は画像を入力として受け取れません
- **秘密の情報を落とす** — 何かのファイルを書き出す前に、元の内容に API キーやトークン、認証情報が混じっていないか確かめます
