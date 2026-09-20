---
title: "Creative Ideation — 創作の現場で名前の付いた手法を使ってアイデアを出す"
description: "創作の現場で名前の付いた手法を使ってアイデアを出す"
upstream_path: user-guide/skills/optional/creative/creative-creative-ideation.md
upstream_blob: 698b105eaab0e39278d04b33ff3d18d53f73646d
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/creative/creative-creative-ideation
---

# Creative Ideation {#creative-ideation}

創作の現場で名前の付いた手法を使ってアイデアを出します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール型 — `hermes skills install official/creative/creative-ideation` で入れます |
| パス | `optional-skills/creative/creative-ideation` |
| バージョン | `2.1.0` |
| 作者 | SHL0MS |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Creative`, `Ideation`, `Brainstorming`, `Methods`, `Inspiration` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として見ています。
:::

# Creative Ideation {#creative-ideation}

分野を問わず使えるアイデア出しの手法集です。相手の状況を読み取り、合う手法へ振り分け、それを当てはめて、具体的でありきたりでない答えを出します。手法は道具です。状況に合うものを選び、全部を並べて見せることはしません。

## こんなときに使います {#when-to-use}

答えの決まっていない、何かを生み出す・選ぶ問いすべてです。「何か作りたい／書きたい／始めたい」「行き詰まった」「刺激がほしい」「もっと変にして」「どれを選べばいい」「○○を発明したい」「研究テーマがほしい」など。

## 進め方の決まり {#operating-rules}

1. **制約と方向づけがそろって、はじめて創造になります。** 制約がなければ取っかかりがなく、方向づけがなければ形になりません。手法はその両方を与えます。
2. **最初の 3 案は捨てます。** ありきたりです。出して、捨てて、また出します。`references/anti-slop.md` を参照してください。
3. **求められない限り、1 回の返答で使う手法は 1 つだけです。** 積み重ねません。
4. **抽象よりも具体を。** 実在する固有名詞、実在する材料、実際の仕組みを挙げます。「○○のためのアプリ」はありきたりです。「Z のときに Y を表示する 200 行の CLI ツール」なら方向づけになります。技術スタックの名前を挙げるのは具体ではありません。仕組みを挙げてください。
5. **変であることと、良いことは両立させます。** 枠を壊すのが狙いですが、実際の場面も仕組みも存在する理由もない奇抜さは、それ自体が失敗です。どのアイデア群にも、**いま実際に作れる／進められる**ものを最低 1 つ入れてください。ありきたりではないけれど地に足がついていて、最初の一歩がはっきりしているものです。驚きのために使えなさを全部引き受けてはいけません。
6. **使った手法の名前と、それを考えた人の名前を挙げます。** 出典を示すことで、その分野の考え方が働きます。
7. **相手が 1 つ選んだら、それを作ります。** 選ばれた後もアイデアを出し続けないでください。

## 振り分け — 4 段階の手順 {#routing-4-step-procedure}

何かを出力する*前に*行います。振り分けを誤るとありきたりな答えになります。

そのほうがすっきりするなら、振り分けの過程をいちいち説明しなくてもかまいません。ただし**アイデア 1 つずつの深さを削ってまで短くしてはいけません**。具体的な仕組み、状況との結びつき、正直に見た弱点。この 3 つがあるから答えが良くなるのであって（これは実測されています）、飾りではありません。削らないでください。

### 段階 1 — 相手の言葉から 3 つの手がかりを取り出す {#step-1-extract-three-signals-from-the-prompt}

**PHASE** — 相手はどの段階にいますか？

| Phase | Cues |
|---|---|
| **GENERATING** | 「アイデアをちょうだい」「何を作ればいい」「刺激がほしい」— まだ案がない |
| **EXPANDING** | 「ほかには」「もっとこういうのを」「別案がほしい」— もとになる案がある |
| **SELECTING** | 「どれを選ぶか手伝って」「どれをやるべき」「候補がこれだけある」 |
| **UNBLOCKING** | 「行き詰まった」「止まっている」「堂々巡り」「新鮮味がない」— 素材はある |
| **SUBVERTING** | 「もっと変にして」「ありきたりでなく」「これは無難すぎる」 |
| **REFINING** | 「悪くはないけど何か足りない」「粗い感じがする」 |
| **SYNTHESIZING** | 「メモや取材記録や観察がたくさんある」 |

**DOMAIN** — 相手は何を作ろう・しようとしていますか？

| Domain | Cues |
|---|---|
| **TEXT** | 小説、エッセイ、詩、歌詞、脚本、コピー |
| **OBJECT** | 美術、音楽、音、パフォーマンス、インスタレーション、彫刻 |
| **ARTIFACT** | ソフトウェア、ハードウェア、機構、装置 |
| **SYSTEM** | 組織、行政、制度、生態、コミュニティ |
| **SELF** | 人生の選択、仕事、個人の習慣 |
| **RESEARCH** | 論文、学位論文、学術的な問い |
| **PRODUCT** | 事業、市場、サービス |

**SPECIFICITY** — 相手の言葉にどれだけ制約が含まれていますか？

| Level | Cues |
|---|---|
| **NONE** | 「退屈だ」「刺激がほしい」— 分野も対象もない |
| **DOMAIN** | 「何か書きたい」— 分野は決まっているが対象がない |
| **PROJECT** | 「この特定の○○に取り組んでいる」 |
| **PROBLEM** | 「○○の中でこの特定の引っかかりがある」 |

### 段階 2 — 例外規則を先に当てる（最優先） {#step-2-apply-overrides-highest-priority-fire-first}

次の規則は振り分け表より優先します:

- **雰囲気の合図** — 相手が「変」「奇妙」「意外」「ありきたりでない」「もっと面白く」と言ったら、分野に関係なく `references/methods/lateral-provocations.md` か `references/methods/pataphysics.md` を使います。
- **相手が手法を指定した** — それを使います。
- **相手が手法のおすすめを聞いた**（「どの手法がいい」）→ 候補を 2〜3 個、1 行ずつ添えて示し、どれを使うか尋ねます。黙って既定のものを使わないでください。
- **ありきたりになりやすい題材** — 「AI のアイデア」「スタートアップのアイデア」「習慣記録アプリ」「生産性／健康／フィットネス／料理／旅行のアプリ」→ 素直な手法ではなく `references/methods/lateral-provocations.md` か `references/methods/pataphysics.md` を必ず使います。捨てる案は 3 つではなく **5 つ**です。

### 段階 3 — まず段階（phase）で、次に分野（domain）で振り分ける {#step-3-route-by-phase-first-then-domain}

**段階で振り分ける（分野に関係なく当てはまります）:**

| Phase | Default route |
|---|---|
| GENERATING + SPECIFICITY=NONE | `references/full-prompt-library.md` の **General** の節（制約を投げる） |
| GENERATING + DOMAIN known | 分野で振り分けます（次の表） |
| EXPANDING | `references/methods/scamper.md` |
| SELECTING | `references/methods/premortem-and-inversion.md`（良い面から見るなら `references/methods/compression-progress.md`） |
| UNBLOCKING | `references/methods/oblique-strategies.md` |
| SUBVERTING | `references/methods/lateral-provocations.md`（代わりに `references/methods/pataphysics.md`） |
| REFINING (text) | `references/methods/defamiliarization.md` |
| REFINING (other) | `references/methods/creative-discipline.md`（Tharp の背骨） |
| SYNTHESIZING | `references/methods/affinity-diagrams.md` |
| とにかく数が要るとき | `references/methods/volume-generation.md` |

**分野で振り分ける（GENERATING で分野が分かっているとき）:**

| Domain | Default route |
|---|---|
| TEXT — 定型詩・詩 | `references/methods/oulipo.md` |
| TEXT — 物語 | `references/methods/story-skeletons.md` |
| TEXT — 元になる素材があって組み替えたい | `references/methods/chance-and-remix.md` |
| OBJECT（音楽、美術、パフォーマンス） | `references/methods/oblique-strategies.md` |
| OBJECT — 手を動かして作る人／出発点になる制約がほしい | `references/full-prompt-library.md` の **Physical / object** の節 |
| ARTIFACT — 出発点になる制約がほしい | `references/full-prompt-library.md` の **Software / artifact** の節 |
| ARTIFACT — 性能どうしがぶつかる工学的な発明 | `references/methods/triz-principles.md` |
| ARTIFACT — ソフトウェアの設計 | `references/methods/pattern-languages.md` |
| ARTIFACT — 自然界に似たものがある | `references/methods/biomimicry.md` |
| ARTIFACT — 積み重なった前提を問い直したい | `references/methods/first-principles.md` |
| SYSTEM（行政、組織、制度） | `references/methods/leverage-points.md` |
| SYSTEM — みんなで作る／参加型 | `references/full-prompt-library.md` の **Social / collective** の節 |
| SELF（人生、仕事、何を学ぶか） | `references/methods/derive-and-mapping.md` |
| RESEARCH — 問いを選ぶ | `references/methods/compression-progress.md` |
| RESEARCH — 分かっている問題に取り組む | `references/methods/polya.md` |
| PRODUCT（事業、サービス） | `references/methods/jobs-to-be-done.md` |
| 枠を壊したい／似たものを探したい | `references/methods/analogy-and-blending.md` |

### 段階 4 — あいまいさや食い違いへの対処 {#step-4-handle-ambiguity-and-contradiction}

- **複数の道筋がありえる** → 相手の実際の言い回しにいちばん近いものを選びます。高度に見せたくて面白そうな手法を選ばないでください。
- **本当にあいまい** → 確認の質問を 1 つだけします。黙って推測しないでください。例: *「アイデアを出したいのですか、それとも手元の案から選びたいのですか」*／*「これは小説ですか、エッセイですか、それとも別の何かですか」*
- **手がかりが食い違う**（たとえば「変わったスタートアップのアイデア」→ 分野は product で雰囲気は変）→ **2 つの手法をはっきり重ねます**。何をしているかを言葉にしてください。例: *「事業としての形を作るのに `jobs-to-be-done` を、ありきたりな形を壊すのに `lateral-provocations` を使います」*
- **どれにも当てはまらない** → 制約を投げる方法（`references/full-prompt-library.md`）が無難な逃げ道です。
- **同じ問いをもう一度された** → 手法を変えます。手法が変われば、出てくるアイデアの散らばり方も変わります。

### ありきたりでないかの確認（出力する前に行います） {#anti-default-check-run-before-generating}

- 「アイデアを 5 つ挙げます:」と書き出そうとしていたり、ただの番号付きの並びになっていませんか → 止めてください。まず手法を選びます。
- ありきたりな LLM ふうのブレインストーミングになっていませんか → 止めてください。上のどれかの道筋を選びます。
- 振り分けをしていない LLM が出しそうな答えに見えませんか → 振り分けに失敗しています。やり直してください。

LLM が既定で出す答えこそ、この skill が置き換えようとしているものです。振り分けずに出力したら、この skill を使った意味がありません。

さらに細かい場合分け（雰囲気の合図、手法の重ね方、避けるべき型）は `references/heuristics.md` を参照してください。

## 出力の形 {#output-format}

制約を投げる既定の道筋では次のようにします:

```
## Constraint: [Name] — from [Source]
> [The constraint, one sentence]

### Ideas

1. **[One-line pitch]**
   [2-3 sentences — what specifically is made, why it's interesting]
   ⏱ [weekend/week/month]  •  🔧 [stack/medium/materials]

2. ...
3. ...
```

ほかの手法では、その手法が定める形を使ってください（TRIZ なら矛盾の分析、OuLiPo なら制約を課した文章、Oblique Strategies なら 1 枚のカードを当てはめた結果として次の一手）。どの手法も制約のひな形に押し込めないでください。

**手法にかかわらず、どのアイデア群にも必ず入れるもの:**
- 使った手法の名前。ありきたりになりやすい題材では、捨てた素直な案も挙げます。
- 1 つずつに、具体的な仕組みと、正直に見た弱点／引き換えになるもの／誰のためのものかを添えます。この深さがあるからアイデアが刺さるのであって、飾りではありません（実測されています）。
- 少なくとも 1 つに、**地に足がついた案**という印を付けます。いま実際に作れる／進められて、ありきたりではないけれど最初の一歩がはっきりしているものです。ほかはもっと奇妙な方向へ振ってかまいませんが、これだけは本当に実行できるものにしてください。全部が変だけど使えない案になるのを避けます。

## ファイルの見取り図 {#file-map}

- `references/full-prompt-library.md` — 制約の集まり。分野ごとに節が分かれています（General、Software、Physical、Social、Lists）。SPECIFICITY=NONE のときの既定の道筋です。
- `references/method-catalog.md` — 手法ごとの 1 行の要約と、使いどころ
- `references/heuristics.md` — 細かい場合分けのための判断の木
- `references/anti-slop.md` — ありきたりを避ける決まり。すべての出力に当てはめます
- `references/exercises.md` — 時間を区切った練習（5 分／30 分／1 時間／1 日／1 週間）
- `references/methods/` — 名前の付いた手法 22 個。1 手法 1 ファイルで、使うものだけ読み込みます

## 出典 {#attribution}

制約を投げる中核部分は [wttdotm.com/prompts.html](https://wttdotm.com/prompts.html) をもとにしています。各手法の出典は、それぞれの手法のファイルに記載されています。
