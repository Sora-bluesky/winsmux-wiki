---
title: "Baoyu Article Illustrator — 記事の挿絵。型 × 画風 × 配色をそろえて作る"
description: "記事の挿絵。型 × 画風 × 配色をそろえて作る"
upstream_path: user-guide/skills/optional/creative/creative-baoyu-article-illustrator.md
upstream_blob: 2fbe498b784c20e8cd678742051d6fa730d83b21
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/creative/creative-baoyu-article-illustrator
---

# Baoyu Article Illustrator {#baoyu-article-illustrator}

記事の挿絵です。型 × 画風 × 配色をそろえて作ります。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加で入れるもの — `hermes skills install official/creative/baoyu-article-illustrator` で導入します |
| パス | `optional-skills/creative/baoyu-article-illustrator` |
| バージョン | `1.57.0` |
| 作者 | 宝玉 (JimLiu) |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `article-illustration`, `creative`, `image-generation` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Article Illustrator {#article-illustrator}

[baoyu-article-illustrator](https://github.com/JimLiu/baoyu-skills) を、Hermes Agent の道具立てに合わせて作り直したものです。

記事を読み解き、挿絵を入れる位置を決め、**型 × 画風 × 配色**をそろえて画像を作ります。

## こんなときに使います {#when-to-use}

記事に挿絵を入れたい、記事に画像を足したい、内容に合う図を作りたい、あるいは「为文章配图」「illustrate article」「add images」といった言い方をされたときに、この skill を呼び出します。利用者は記事（ファイルの場所、または貼り付けた本文）を渡し、必要に応じて型・画風・配色・枚数の目安を指定します。

## 三つの軸 {#three-dimensions}

| 軸 | 決まるもの | 例 |
|-----------|----------|----------|
| **型** | 情報の組み立て方 | infographic, scene, flowchart, comparison, framework, timeline |
| **画風** | 描き方 | notion, warm, minimal, blueprint, watercolor, elegant |
| **配色** | 色の組み合わせ（任意） | macaron, warm, neon — 画風が持つ既定の色より優先されます |

自由に組み合わせられます: `type=infographic, style=vector-illustration, palette=macaron`。

まとめ指定もできます。`edu-visual` のように、型・画風・配色を一度に決められます。[style-presets.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative/baoyu-article-illustrator/references/style-presets.md) を見てください。

## 型 {#types}

| 型 | 向いている内容 |
|------|----------|
| `infographic` | データ、数値、技術的な話 |
| `scene` | 物語、感情に寄った話 |
| `flowchart` | 手順、作業の流れ |
| `comparison` | 並べて比べる、選択肢を示す |
| `framework` | 考え方の枠組み、構成 |
| `timeline` | 歴史、移り変わり |

## 画風 {#styles}

主な画風、全体の見本、型 × 画風の相性は [references/styles.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative/baoyu-article-illustrator/references/styles.md) にあります。

## 出力の構成 {#output-structure}

<!-- ascii-guard-ignore -->
```
{output-dir}/
├── source-{slug}.{ext}    # Only for pasted content
├── outline.md
├── prompts/
│   └── NN-{type}-{slug}.md
└── NN-{type}-{slug}.png
```
<!-- ascii-guard-ignore-end -->

**既定の出力先**:

| 入力 | 出力先 | Markdown に書く画像の場所 |
|-------|------------------|----------------------|
| 記事ファイルの場所 | `{article-dir}/imgs/` | `imgs/NN-{type}-{slug}.png` |
| 貼り付けた本文 | `illustrations/{topic-slug}/`（作業中のフォルダ） | `illustrations/{topic-slug}/NN-{type}-{slug}.png` |

別の置き方（記事と同じ場所に画像を並べる、`illustrations/` の下にまとめる、など）を頼まれたら、それに従います。

**スラッグ**: 2〜4 語、ハイフンつなぎ。**同じ名前があるとき**: `-YYYYMMDD-HHMMSS` を後ろに足します。

## 大事にすること {#core-principles}

- **比喩ではなく、中身を絵にする** — 記事に比喩（たとえば「电锯切西瓜」）が出てきても、その言葉のとおりに描くのではなく、言おうとしている中身を絵にします。
- **文字は記事の数字をそのまま使う** — ありものの例ではなく、記事に出てくる実際の数字、用語、引用を入れます。
- **プロンプトのファイルは、あとから同じものを作るための記録** — どの挿絵についても、画像を作る前に `prompts/` の下にプロンプトを保存しておきます。
- **秘密の情報を落とす** — 何かを書き出す前に、元の内容に API キーやトークン、認証情報が混じっていないか確かめます。

## 進め方 {#workflow}

```
- [ ] Step 1: Detect reference images (if provided)
- [ ] Step 2: Analyze content
- [ ] Step 3: Confirm settings (clarify tool, one question at a time)
- [ ] Step 4: Generate outline
- [ ] Step 5: Generate prompts
- [ ] Step 6: Generate images (image_generate)
- [ ] Step 7: Finalize
```

### 手順 1: 参考画像を見つける {#step-1-detect-reference-images}

利用者が参考画像を渡してきたとき（会話に貼られた場所、添付、URL）は、こうします。

1. それぞれについて `vision_analyze` を呼び、場所か URL と、画風・配色・構図・題材をたずねる質問を渡します。返ってきた説明を `write_file` で `{output-dir}/references/NN-ref-{slug}.md` に残します。
2. `write_file` や `read_file` で画像そのものを写そうとしては**いけません**。これらは文字しか扱えません。手元に控えを置きたいときは `terminal` を使います（`cp "$src" "{output-dir}/references/NN-ref-{slug}.{ext}"`）。この skill 自体は画像そのものを読む必要がなく、見て書き起こした説明だけで動きます。
3. `image_generate` は画像を入力として受け取らないので、手順 5 でプロンプトに埋め込まれるのは、この書き起こした説明です。

詳しい手順: [references/workflow.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative/baoyu-article-illustrator/references/workflow.md#step-1-detect-reference-images)。

### 手順 2: 読み解く {#step-2-analyze}

| 見るところ | 出すもの |
|----------|--------|
| 内容の種類 | 技術 / 手引き / 方法論 / 物語 |
| ねらい | 情報を伝える / 図で見せる / 想像をふくらませる |
| 主な主張 | 要点 2〜5 個 |
| 位置 | 挿絵があると助かる場所 |

元の内容を読み（ファイルの場所なら `read_file`、貼り付けた本文ならそのまま）、読み解いた結果を `write_file` で `{output-dir}/analysis.md` に書きます。

詳しい手順: [references/workflow.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative/baoyu-article-illustrator/references/workflow.md#step-2-analyze)。

### 手順 3: 設定を確かめる {#step-3-confirm-settings}

`clarify` ツールを使います。`clarify` は一度にひとつしか質問できないので、いちばん大事なことから聞きます。すでに利用者の依頼に書かれている項目は飛ばします。

| 順番 | 質問 | 選択肢 |
|-------|----------|---------|
| Q1 | **まとめ指定か型か** | [おすすめのまとめ指定]、[別のまとめ指定]、または個別に: infographic, scene, flowchart, comparison, framework, timeline, mixed |
| Q2 | **枚数の目安** | minimal（1〜2 枚）、balanced（3〜5 枚）、per-section（おすすめ）、rich（6 枚以上） |
| Q3 | **画風** *(Q1 でまとめ指定を選んだなら飛ばす)* | [おすすめ], minimal-flat, sci-fi, hand-drawn, editorial, scene, poster |
| Q4 | **配色** *(任意)* | 既定（画風の色）, macaron, warm, neon |
| Q5 | **言語** *(記事の言語がはっきりしないときだけ)* | 記事の言語 / 利用者の言語 |

`clarify` の質問を続けざまに 2〜3 個より多く出さないでください。依頼にすでに書かれているなら、まるごと飛ばします。

詳しい手順: [references/workflow.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative/baoyu-article-illustrator/references/workflow.md#step-3-confirm-settings)。

### 手順 4: 構成を作る → `outline.md` {#step-4-generate-outline-outlinemd}

`write_file` で `{output-dir}/outline.md` を保存します。先頭に設定（type、density、style、palette、image_count）を置き、挿絵ごとに一項目ずつ書きます。

```yaml
## Illustration 1
**Position**: [section/paragraph]
**Purpose**: [why]
**Visual Content**: [what to show]
**Filename**: 01-infographic-concept-name.png
```

ひな型の全文: [references/workflow.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative/baoyu-article-illustrator/references/workflow.md#step-4-generate-outline)。

### 手順 5: プロンプトを作る {#step-5-generate-prompts}

**ここは飛ばせません**: 画像を作る前に、どの挿絵についてもプロンプトのファイルを保存しておきます。これが、あとから同じものを作るための記録になります。

挿絵ごとに、こうします。

1. [references/prompt-construction.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative/baoyu-article-illustrator/references/prompt-construction.md) に沿ってプロンプトのファイルを作ります。
2. `write_file` で `{output-dir}/prompts/NN-{type}-{slug}.md` に、先頭を YAML にして保存します。
3. プロンプトは型ごとのひな型を必ず使い、節（ZONES / LABELS / COLORS / STYLE / ASPECT）に分けて書きます。
4. LABELS には記事そのものの内容を必ず入れます。実際の数字、用語、指標、引用です。
5. 参考画像の扱い（`direct` / `style` / `palette`）は、プロンプト先頭の指定に従います。`direct` の場合は、参考画像を言葉で書き起こしたものをプロンプトに埋め込みます（`image_generate` は参考画像そのものを受け取れないためです）。

### 手順 6: 画像を作る {#step-6-generate-images}

プロンプトのファイルごとに、こうします。

1. `image_generate(prompt=..., aspect_ratio=...)` を呼びます。`image_generate` が返すのは画像の URL を含む JSON です。ファイルとして保存はしませんし、保存先を指定することもできません。
2. プロンプトの `ASPECT` を `image_generate` の値に読み替えます。`16:9` → `landscape`、`9:16` → `portrait`、`1:1` → `square`。それ以外の比率は、いちばん近いものにします。
3. 返ってきた URL から `terminal` で `{output-dir}/NN-{type}-{slug}.png` に落とします（たとえば `curl -sSL -o "{output-dir}/NN-{type}-{slug}.png" "{url}"`）。
4. 生成に失敗したら、自動で一度だけやり直します。

補足: 画像を実際に作るしくみは利用者の設定によります（既定は FAL FLUX 2 Klein 9B）。`image_generate` からエージェントが選ぶことはできません。振り分けてもらえると思ってプロンプトにモデル名を書かないでください。

### 手順 7: 仕上げる {#step-7-finalize}

対応する段落のうしろに `![description](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative/baoyu-article-illustrator/{relative-path}/NN-{type}-{slug}.png)` を差し込みます。代替テキストは、記事と同じ言語で短く書きます。

報告はこうします。

```
Article Illustration Complete!
Article: [path] | Type: [type] | Density: [level] | Style: [style] | Palette: [palette or default]
Images: X/N generated
```

## 直したいとき {#modification}

| やること | 手順 |
|--------|-------|
| 差し替え | プロンプトを直す → 作り直す → 記事側の記述を直す |
| 追加 | 位置を決める → プロンプト → 生成 → 構成を更新 → 差し込む |
| 削除 | ファイルを消す → 記事側の記述を消す → 構成を更新 |

## 参考資料 {#references}

| ファイル | 中身 |
|------|---------|
| [references/workflow.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative/baoyu-article-illustrator/references/workflow.md) | 詳しい手順 |
| [references/usage.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative/baoyu-article-illustrator/references/usage.md) | 呼び出し方の例 |
| [references/styles.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative/baoyu-article-illustrator/references/styles.md) | 画風の見本と配色の見本 |
| [references/style-presets.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative/baoyu-article-illustrator/references/style-presets.md) | まとめ指定（型 + 画風 + 配色） |
| [references/prompt-construction.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative/baoyu-article-illustrator/references/prompt-construction.md) | プロンプトのひな型 |

## つまずきやすいところ {#pitfalls}

1. **数字をそのまま扱うことが何より大事** — 元の統計をまとめ直したり、言い換えたり、変えたりしてはいけません。「73% increase」は「73% increase」のままにします。
2. **秘密の情報を落とす** — 何かのファイルに入れる前に、元の内容に API キーやトークン、認証情報が混じっていないか確かめます。
3. **比喩をそのまま描かない** — 言おうとしている中身を絵にします。
4. **プロンプトのファイルは必ず作る** — 保存されたプロンプトなしに画像を作ってはいけません。このファイルがあるから、あとで作り直したり、別のしくみに乗り換えたりできます。
5. **`image_generate` の縦横比** — 使えるのは `landscape`、`portrait`、`square` です。それ以外の比率は、いちばん近いものに読み替えます。
6. **`image_generate` が返すのは URL で、ファイルではありません** — 記事に手元の画像の場所を書く前に、必ず `terminal`（`curl`）で落としてください。
7. **どのしくみで作るかはエージェントからは選べません** — `image_generate` は利用者が設定したモデルを使います（既定は FAL FLUX 2 Klein 9B）。振り分けてもらえると思って `"use <model> to generate this"` などとプロンプトに書かないでください。
