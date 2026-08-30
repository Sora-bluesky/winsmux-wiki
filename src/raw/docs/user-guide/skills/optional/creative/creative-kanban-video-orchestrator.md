---
title: "Kanban Video Orchestrator — 複数エージェントによる動画制作の流れを設計して動かす"
description: "複数エージェントによる動画制作の流れを設計して動かす"
upstream_path: user-guide/skills/optional/creative/creative-kanban-video-orchestrator.md
upstream_blob: ecb36c41a9a50038bfb10d60dcb6c80c200f3ffc
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/creative/creative-kanban-video-orchestrator
---

# Kanban Video Orchestrator {#kanban-video-orchestrator}

複数エージェントによる動画制作の流れを設計して動かします。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール型 — `hermes skills install official/creative/kanban-video-orchestrator` で入れます |
| パス | `optional-skills/creative\kanban-video-orchestrator` |
| バージョン | `1.0.0` |
| 作者 | ['SHL0MS', 'alt-glitch'] |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `video`, `kanban`, `multi-agent`, `orchestration`, `production-pipeline` |
| 関連 skill | [`ascii-video`](/hermes/docs/user-guide/skills/bundled/creative/creative-ascii-video/), [`manim-video`](/hermes/docs/user-guide/skills/bundled/creative/creative-manim-video/), [`p5js`](/hermes/docs/user-guide/skills/bundled/creative/creative-p5js/), [`comfyui`](/hermes/docs/user-guide/skills/optional/creative/creative-comfyui/), [`touchdesigner-mcp`](/hermes/docs/user-guide/skills/optional/creative/creative-touchdesigner-mcp/), [`pixel-art`](/hermes/docs/user-guide/skills/optional/creative/creative-pixel-art/), [`ascii-art`](/hermes/docs/user-guide/skills/optional/creative/creative-ascii-art/), [`songwriting-and-ai-music`](/hermes/docs/user-guide/skills/bundled/creative/creative-songwriting-and-ai-music/), [`heartmula`](/hermes/docs/user-guide/skills/optional/creative/creative-heartmula/), [`songsee`](/hermes/docs/user-guide/skills/bundled/media/media-songsee/), [`youtube-content`](/hermes/docs/user-guide/skills/bundled/media/media-youtube-content/), [`claude-design`](/hermes/docs/user-guide/skills/bundled/creative/creative-claude-design/), [`excalidraw`](/hermes/docs/user-guide/skills/optional/creative/creative-excalidraw/), [`architecture-diagram`](/hermes/docs/user-guide/skills/bundled/creative/creative-architecture-diagram/), [`concept-diagrams`](/hermes/docs/user-guide/skills/optional/creative/creative-concept-diagrams/), [`baoyu-comic`](/hermes/docs/user-guide/skills/optional/creative/creative-baoyu-comic/), [`baoyu-infographic`](/hermes/docs/user-guide/skills/bundled/creative/creative-baoyu-infographic/), [`humanizer`](/hermes/docs/user-guide/skills/bundled/creative/creative-humanizer/), [`gif-search`](/hermes/docs/user-guide/skills/bundled/media/media-gif-search/), [`meme-generation`](/hermes/docs/user-guide/skills/optional/creative/creative-meme-generation/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として見ています。
:::

# Kanban Video Orchestrator {#kanban-video-orchestrator}

15 秒の商品ティザーから 5 分の物語作品、ミュージックビデオ、ASCII のループ映像まで、
どんな動画の依頼も Hermes の kanban の流れに載せて、
専門ごとのエージェント像へ作業を分けていきます。

この skill 自体は何も描画**しません**。次のことを行うメタ的な流れです。

1. 的を絞った聞き取りで依頼の**範囲を決めます**
2. 作風に応じて、ふさわしいチームを**設計します**（どの役割を置き、役割ごとにどの道具を持たせるか）
3. Hermes のプロファイル・作業場所・最初の kanban タスクを作る設定スクリプトを**生成します**
4. ディレクター役のプロファイルへ**引き渡し**、そこから kanban を通じて作業が分解されます
5. 実行を**見守り**、タスクが止まったり失敗したりしたときに手を入れます

実際の描画は、kanban が動き出したあとその中で行われます。場面ごとに合う既存の
skill と道具、たとえば `ascii-video`、`manim-video`、`p5js`、
`comfyui`、`touchdesigner-mcp`、`songwriting-and-ai-music`、
`heartmula`、外部 API、あるいは PIL と ffmpeg だけの素の Python が使われます。

## この skill を使わない場面 {#when-not-to-use-this-skill}

- 動画が一続きの手続き的な作品で、専門の担当を分ける必要がないとき。コードを直接書けば済みます。
- 一発変換のような手早い依頼のとき（例:「この mp4 を GIF にして」）— ffmpeg を直接使ってください。
- 出力が静止画・GIF・音声だけのとき — それぞれに合った skill（`ascii-art`、`gifs`、`meme-generation`、`songwriting-and-ai-music`）を使ってください。
- 既存の skill ひとつできれいに収まるとき（例: 純粋な ASCII 動画なら `ascii-video` だけで足ります）。

## 進め方 {#workflow}

```
DISCOVER  →  BRIEF  →  TEAM DESIGN  →  SETUP  →  EXECUTE  →  MONITOR
```

### ステップ 1 — 聞き取り（正しい質問をする） {#step-1-discover-ask-the-right-questions}

聞き取りは**相手に合わせて変えます**。本当に必要なことだけを尋ねてください。まずは
大まかな形をつかむため、次の 3 つから始めます。

- **どんな動画ですか？**（ひと言での説明）
- **長さは？**（5〜30 秒のティザー／30〜90 秒の短編／90 秒〜3 分の解説／3〜10 分の作品／それ以上）
- **画面比率と出す場所は？**（1:1／9:16／16:9。X、IG、YouTube、社内など）

その答えから作風の分類を決めます。作風によって、次に聞くべきことが変わります。
**すべてを一度に尋ねてはいけません。** 一度に 2〜4 つ尋ね、聞いてから先へ進みます。
相手の言い方から答えが読み取れるときは、その都度ふつうに推測して構いません。

聞き取りの型と作風ごとの質問集は
**[references/intake.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative\kanban-video-orchestrator/references/intake.md)** にまとまっています。

### ステップ 2 — 企画書 {#step-2-brief}

十分に分かった時点で、`assets/brief.md.tmpl` の雛形を使って構造のある `brief.md` を作ります。中身はこう並びます。

1. **コンセプト** — ひと言の売り文句と、気持ちの上での目指す先
2. **範囲** — 尺、画面比率、出す場所、締め切り
3. **作風** — 見た目の参考、ブランド上の制約、トーン
4. **場面** — 拍ごとの分解（尺、内容、使う道具）
5. **音** — ナレーション／音楽／効果音／無音（必要なら場面ごとに）
6. **納品物** — ファイル形式、解像度、必要なら別版（縦向き、GIF など）

チームを設計する前に、この企画書を相手に見せて確認を取ります。**企画書が取り決めそのものです** —
以降のタスクはすべてこれを参照します。

### ステップ 3 — チーム設計 {#step-3-team-design}

役割の型が集められたライブラリから、この動画に合うものを選びます。**組み合わせるのであって、
写し取るのではありません。** たいていの動画では 4〜7 のプロファイルが要ります。ディレクターは常に置き、
残りは企画書が実際に必要としているもので決めます。

役割のライブラリと作風ごとのチーム構成は
**[references/role-archetypes.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative\kanban-video-orchestrator/references/role-archetypes.md)** を参照してください。

役割から、それが読み込む Hermes の skill と道具一式への対応は
**[references/tool-matrix.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative\kanban-video-orchestrator/references/tool-matrix.md)** にあります。

### ステップ 4 — 設定 {#step-4-setup}

設定スクリプト（`setup.sh`）を生成して実行します。スクリプトは次のことを行います。

1. 作業場所（`~/projects/video-pipeline/<slug>/`）を作ります
2. 渡された素材を `taste/`、`audio/`、`assets/` へ写します
3. `hermes profile create --clone` で Hermes のプロファイルをそれぞれ作ります
4. プロファイルごとの `SOUL.md`（人物像と役割の定義）を書き出します
5. プロファイルの YAML（道具一式、always_load の skill、cwd）を設定します
6. `brief.md`、`TEAM.md`、`taste/` の中身を書き出します
7. ディレクターに割り当てた最初の `hermes kanban create` タスクを起こします

`scripts/bootstrap_pipeline.py` を使うと、企画書とチーム設計の JSON から setup.sh を生成できます。
設定スクリプトの構造、プロファイル設定の型、そして肝心の「作業場所を共有する」決まりについては
**[references/kanban-setup.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative\kanban-video-orchestrator/references/kanban-setup.md)**
を参照してください。

### ステップ 5 — 実行 {#step-5-execute}

`setup.sh` を実行します。そのうえで、様子を見るためのコマンドを相手に伝えます。

```bash
hermes kanban watch --tenant <project-tenant>     # live events
hermes kanban list  --tenant <project-tenant>     # board snapshot
hermes dashboard                                   # visual board UI
```

ここから先はディレクター役のプロファイルが引き取り、作業を分解して、kanban の道具一式を通じて
専門のプロファイルへタスクを振り分けます。

### ステップ 6 — 見守りと手入れ {#step-6-monitor-and-intervene}

離れずに見ていてください。kanban は自分で回りますが、止まったタスクや出来の悪い成果物には
人（あるいは AI）の判断が要ります。

見守り方としては、`kanban list` を定期的に確認し、想定より長く RUNNING のままのタスクを
`kanban show <id>` で覗き、heartbeat を確かめます。作業役の成果物が確認で落ちたときの、
標準的な手の入れ方は次の 3 つです。

1. 作業役のタスクに、具体的な指摘をコメントする（`kanban_comment`）
2. 元のタスクを親にして、やり直しのタスクを作る
3. 企画書の範囲を直し、ディレクターに分解し直させる

切り分けの型、手入れの具体策、「タスクが止まったとき」の手順書は
**[references/monitoring.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative\kanban-video-orchestrator/references/monitoring.md)** を参照してください。

## 参考: 実例 {#reference-worked-examples}

物語作品、商品／宣伝、ミュージックビデオ、数学やアルゴリズムの解説、ASCII 動画、リアルタイムの
インスタレーションという、まったく異なる 6 つの実例です。同じ進め方から、いかに違うチームと
タスクの並びが生まれるかが分かります。
**[references/examples.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative\kanban-video-orchestrator/references/examples.md)** を参照してください。

## 大事な決まり {#critical-rules}

1. **動く前に聞き取りを。** 最低限の 3 つの質問もしないまま、企画書やチームを作り始めては
   いけません。まずい企画書は、その後の全工程に響きます。

2. **チームは動画に合わせます。** どの仕事でも同じ 4 プロファイル構成を使い回さないでください。
   ミュージックビデオに拍の解析役がいなければ、ずれた出来になります。物語作品に脚本役が
   いなければ、筋の通らない場面ができます。`references/role-archetypes.md` を参照してください。

3. **プロジェクトごとに作業場所はひとつ。** ひとつの動画に関わるプロファイルは、すべて同じ
   `dir:` の作業場所を共有します。タスク間の受け渡しは、共有のファイルシステムと形の決まった
   引き継ぎで行います。`kanban_create` の呼び出しでは**必ず**
   `workspace_kind="dir"` と `workspace_path="<absolute project path>"` を渡します。

4. **プロジェクトごとに tenant を分けます。** プロジェクト専用の tenant
   （`--tenant <project-slug>`）を使ってください。ダッシュボードの範囲が絞られ、
   進行中の別の kanban と混ざるのを防げます。

5. **既存の skill を尊重します。** 場面が既存の skill に収まるときは、描画を担う役が
   タスクの `--skill <name>` か、プロファイルの `always_load` でその skill を読み込むべきです。
   skill がすでに持っているものを、わざわざ作り直さないでください。

6. **ディレクターは自分では実行しません。** `kanban + terminal +
   file` の道具一式をすべて持っていても、ディレクターの `SOUL.md` の決まりが自分で作業することを禁じています。
   分解して振り分けるだけです — 具体的なタスクはすべて、専門のプロファイルへの
   `hermes kanban create` の呼び出しになります。kanban の作業役すべてのシステムプロンプトへ
   自動で差し込まれる kanban 運用の指針にも、この点がさらに詳しく書かれています。

7. **分けすぎないでください。** 30 秒の商品動画に 20 個のタスクは要りません。うまく並行でき、
   人が確認すべき節目がきちんと表に出る範囲で、いちばん小さいタスクの並びを目指します。

8. **火を入れる前に API キーを確かめます。** 外部 API（TTS、画像生成、画像から動画）には
   `${HERMES_HOME:-~/.hermes}/.env` かユーザーの秘密情報の保管先にキーが要ります。
   キーが無いというエラーに当たった作業役は、タスクの枠をむだにします。設定スクリプトの
   `check_key` 補助は、必要なキーが欠けていればきれいに中断します。

## ファイルの構成 {#file-map}

```
SKILL.md                            ← this file (workflow + rules)
references/
  intake.md                         ← discovery question banks per style
  role-archetypes.md                ← role library (writer, designer, animator, …)
  tool-matrix.md                    ← skill + toolset mapping per role
  kanban-setup.md                   ← setup script structure & profile config
  monitoring.md                     ← watch + intervene patterns
  examples.md                       ← six worked pipelines
assets/
  brief.md.tmpl                     ← brief skeleton
  setup.sh.tmpl                     ← setup script skeleton
  soul.md.tmpl                      ← profile personality skeleton
scripts/
  bootstrap_pipeline.py             ← generate setup.sh from brief + team JSON
  monitor.py                        ← polling + intervention helpers
```
