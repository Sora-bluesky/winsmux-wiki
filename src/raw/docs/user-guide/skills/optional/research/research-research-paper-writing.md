---
title: "Research Paper Writing — NeurIPS / ICML / ICLR 向けの ML 論文を、設計から投稿まで書き上げる"
description: "NeurIPS / ICML / ICLR 向けの ML 論文を、設計から投稿まで書き上げる"
upstream_path: user-guide/skills/optional/research/research-research-paper-writing.md
upstream_blob: f6fd04e6badf3da84ca9925b1c5f17db3325ec45
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/research/research-research-paper-writing
---

# Research Paper Writing {#research-paper-writing}

NeurIPS / ICML / ICLR 向けの ML 論文を、設計から投稿まで書き上げるための skill です。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加で入れる skill です。`hermes skills install official/research/research-paper-writing` で導入します |
| パス | `optional-skills/research\research-paper-writing` |
| バージョン | `1.1.0` |
| 作者 | Orchestra Research |
| ライセンス | MIT |
| 依存関係 | `semanticscholar`, `arxiv`, `habanero`, `requests`, `scipy`, `numpy`, `matplotlib`, `SciencePlots` |
| 対応プラットフォーム | linux, macos |
| タグ | `Research`, `Paper Writing`, `Experiments`, `ML`, `AI`, `NeurIPS`, `ICML`, `ICLR`, `ACL`, `AAAI`, `COLM`, `LaTeX`, `Citations`, `Statistical Analysis` |
| 関連 skill | [`arxiv`](/hermes/docs/user-guide/skills/bundled/research/research-arxiv/), [`subagent-driven-development`](/hermes/docs/user-guide/skills/optional/software-development/software-development-subagent-driven-development/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# 研究論文の執筆パイプライン {#research-paper-writing-pipeline}

**NeurIPS、ICML、ICLR、ACL、AAAI、COLM** に投稿できる水準の ML / AI 研究論文を、最初から最後まで仕上げるためのパイプラインです。実験の設計、実行、監視、分析、論文執筆、査読、改訂、投稿という研究の全工程を扱います。

これは**一本道のパイプラインではありません**。繰り返しのループです。結果が出れば新しい実験が生まれ、査読が来れば新しい分析が必要になります。エージェントはこの折り返しを前提に動く必要があります。

<!-- ascii-guard-ignore -->
<!-- ascii-guard-ignore -->
```
┌─────────────────────────────────────────────────────────────┐
│                    RESEARCH PAPER PIPELINE                  │
│                                                             │
│  Phase 0: Project Setup ──► Phase 1: Literature Review      │
│       │                          │                          │
│       ▼                          ▼                          │
│  Phase 2: Experiment     Phase 5: Paper Drafting ◄──┐      │
│       Design                     │                   │      │
│       │                          ▼                   │      │
│       ▼                    Phase 6: Self-Review      │      │
│  Phase 3: Execution &           & Revision ──────────┘      │
│       Monitoring                 │                          │
│       │                          ▼                          │
│       ▼                    Phase 7: Submission               │
│  Phase 4: Analysis ─────► (feeds back to Phase 2 or 5)     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```
<!-- ascii-guard-ignore-end -->
<!-- ascii-guard-ignore-end -->

---

## この skill を使う場面 {#when-to-use-this-skill}

次のようなときに使ってください。

- 手元のコードやアイデアから **新しい論文を書き始める** とき
- 論文の主張を裏づけるために **実験を設計して回す** とき
- 論文のどこかの節を **書く、あるいは書き直す** とき
- 特定の会議やワークショップへの **投稿準備をする** とき
- 追加実験や改訂で **査読に応答する** とき
- 論文を別の会議のフォーマットへ **変換する** とき
- **実験以外の論文を書く** とき（理論、サーベイ、ベンチマーク、ポジションペーパー。[実験系 ML 以外の論文タイプ](#paper-types-beyond-empirical-ml) を参照）
- NLP、HCI、アラインメント研究のために **人手評価を設計する** とき
- ポスター、発表、コード公開といった **採択後の成果物を準備する** とき

## 基本的な考え方 {#core-philosophy}

1. **こちらから動く。** 質問ではなく、完成したドラフトを届けます。研究者は忙しいので、反応できる具体物を先に出し、そこから直していきます。
2. **引用を絶対に捏造しない。** AI が生成した引用は約 40% が誤りです。必ずプログラムから取得してください。裏づけの取れない引用は `[CITATION NEEDED]` と明記します。
3. **論文は実験の寄せ集めではなく、ひとつの物語。** どの論文にも、一文で言い切れる貢献がひとつ必要です。それが書けないなら、その論文はまだ書ける状態にありません。
4. **実験は主張に仕える。** すべての実験は、どの主張を支えるのかを明示しなければなりません。論文の筋書きにつながらない実験は回さないでください。
5. **早めに、こまめにコミットする。** 実験のひとまとまりが終わるたび、論文のドラフトを更新するたびに、内容の分かるメッセージでコミットします。git log がそのまま実験の記録になります。

### 主体性と共同作業 {#proactivity-and-collaboration}

**原則: こちらから動く。まず書き、書いたものを添えて尋ねる。**

| 確信の度合い | 行動 |
|-----------------|--------|
| **高い**（リポジトリが明快で、貢献も見えている） | 全体のドラフトを書いて渡し、反応をもらって直す |
| **中くらい**（あいまいさが残る） | 不確かな箇所に印を付けたドラフトを書き、そのまま進める |
| **低い**（大きな未知がある） | `clarify` で的を絞った質問を 1〜2 個してから書き始める |

| 節 | 自分で書き切るか | ドラフトに添える注記 |
|---------|-------------------|-----------------|
| Abstract | はい | 「貢献を X として枠づけました。必要なら調整してください」 |
| Introduction | はい | 「問題 Y を強調しました。違っていたら直してください」 |
| Methods | はい | 「詳細 A、B、C を入れました。抜けがあれば足してください」 |
| Experiments | はい | 「結果 1、2、3 を前に出しました。順序は変えて構いません」 |
| Related Work | はい | 「論文 X、Y、Z を引きました。漏れがあれば足してください」 |

**入力を待つのは次の場合だけ**: 投稿先が決まっていない、貢献の枠づけが複数あって互いに矛盾する、結果が明らかに足りていない、先にレビューしたいと明示的に頼まれた。

---

## Phase 0: プロジェクトの立ち上げ {#phase-0-project-setup}

**目標**: 作業場所を整え、すでにある成果を把握し、貢献を見きわめます。

### Step 0.1: リポジトリを調べる {#step-01-explore-the-repository}

```bash
# Understand project structure
ls -la
find . -name "*.py" | head -30
find . -name "*.md" -o -name "*.txt" | xargs grep -l -i "result\|conclusion\|finding"
```

はじめの一覧表示で全体を見渡し、検索コマンドで Python ファイルや、結果・結論・発見に触れている文書を拾い出します。探すのは次のものです。

- `README.md` — プロジェクトの概要と主張
- `results/`、`outputs/`、`experiments/` — すでに出ている結果
- `configs/` — 実験の設定
- `.bib` ファイル — すでにある引用
- 書きかけの文書やメモ

### Step 0.2: 作業場所を整える {#step-02-organize-the-workspace}

いつも同じ構成にしておきます。

```
workspace/
  paper/               # LaTeX source, figures, compiled PDFs
  experiments/         # Experiment runner scripts
  code/                # Core method implementation
  results/             # Raw experiment results (auto-generated)
  tasks/               # Task/benchmark definitions
  human_eval/          # Human evaluation materials (if needed)
```

### Step 0.3: バージョン管理を用意する {#step-03-set-up-version-control}

```bash
git init  # if not already
git remote add origin <repo-url>
git checkout -b paper-draft  # or main
```

まだリポジトリがなければ作り、リモートを登録して、論文用のブランチに切り替えます。

**git の作法**: 実験のひとまとまりが終わったら、内容の分かるメッセージでコミットします。例:
```
Add Monte Carlo constrained results (5 runs, Sonnet 4.6, policy memo task)
Add Haiku baseline comparison: autoreason vs refinement baselines at cheap model tier
```

### Step 0.4: 貢献を見きわめる {#step-04-identify-the-contribution}

何かを書き始める前に、次の三つを言葉にします。

- **何を（What）**: この論文が差し出すたったひとつのものは何か
- **なぜ（Why）**: それを支える証拠は何か
- **だから何（So What）**: 読者はなぜ気にするべきか

> 研究者にこう提案します。「理解した範囲では、主な貢献は [一文] です。主な結果は [Y] を示しています。この枠づけで合っていますか」

### Step 0.5: TODO リストを作る {#step-05-create-a-todo-list}

`todo` ツールで、構造のあるプロジェクト計画を作ります。

```
Research Paper TODO:
- [ ] Define one-sentence contribution
- [ ] Literature review (related work + baselines)
- [ ] Design core experiments
- [ ] Run experiments
- [ ] Analyze results
- [ ] Write first draft
- [ ] Self-review (simulate reviewers)
- [ ] Revise based on review
- [ ] Submission prep
```

これはプロジェクトの間ずっと更新し続けます。セッションをまたいで残る状態として働きます。

### Step 0.6: 計算コストを見積もる {#step-06-estimate-compute-budget}

実験を回す前に、費用と時間の総額を見積もります。

```
Compute Budget Checklist:
- [ ] API costs: (model price per token) × (estimated tokens per run) × (number of runs)
- [ ] GPU hours: (time per experiment) × (number of experiments) × (number of seeds)
- [ ] Human evaluation costs: (annotators) × (hours) × (hourly rate)
- [ ] Total budget ceiling and contingency (add 30-50% for reruns)
```

実験が進むあいだ、実際の支出も追いかけます。
```python
# Simple cost tracker pattern

from datetime import datetime

COST_LOG = "results/cost_log.jsonl"

def log_cost(experiment: str, model: str, input_tokens: int, output_tokens: int, cost_usd: float):
    entry = {
        "timestamp": datetime.now().isoformat(),
        "experiment": experiment,
        "model": model,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "cost_usd": cost_usd,
    }
    with open(COST_LOG, "a") as f:
        f.write(json.dumps(entry) + "\n")
```

**予算が厳しいとき**: 全体を回し切る前に、パイロット実験（シード 1〜2 本、タスクを絞る）を先に走らせます。パイプラインのデバッグは安いモデルで済ませ、最終的な実行だけ本命のモデルに切り替えます。

### Step 0.7: 複数著者での進め方 {#step-07-multi-author-coordination}

ほとんどの論文は著者が 3〜10 人います。進め方は早めに決めておきます。

| 進め方 | 道具 | 向いている場面 |
|----------|------|-------------|
| **Overleaf** | ブラウザ上で編集 | 複数の著者が同時に書く、git に慣れていない |
| **Git + LaTeX** | 補助ファイルを `.gitignore` に入れた `git` | 技術寄りのチーム、ブランチ単位のレビューが要る |
| **Overleaf + Git 連携** | Overleaf の有料プラン | 両取り。同時編集と履歴管理が両立する |

**節の担当を決める**: 各節に主担当をひとり割り当てます。ほかの人はコメントするだけで直接は書き換えません。競合と文体のばらつきを防げます。

```
Author Coordination Checklist:
- [ ] Agree on section ownership (who writes what)
- [ ] Set up shared workspace (Overleaf or git repo)
- [ ] Establish notation conventions (before anyone writes)
- [ ] Schedule internal review rounds (not just at the end)
- [ ] Designate one person for final formatting pass
- [ ] Agree on figure style (colors, fonts, sizes) before creating figures
```

**LaTeX まわりで早めに合意しておくこと**:
- 手法名を揃えるための `\method{}` マクロ
- 引用の書き方: `\citet{}` と `\citep{}` の使い分け
- 数式の記法: ベクトルは小文字太字、行列は大文字太字、など
- 英国式綴りか米国式綴りか

---

## Phase 1: 先行研究の調査 {#phase-1-literature-review}

**目標**: 関連研究を見つけ、ベースラインを定め、引用を集めます。

### Step 1.1: 起点になる論文を見つける {#step-11-identify-seed-papers}

コードベースですでに参照されている論文から始めます。

```bash
# Via terminal:
grep -r "arxiv\|doi\|cite" --include="*.md" --include="*.bib" --include="*.py"
find . -name "*.bib"
```

本文検索で arxiv・doi・cite への言及を洗い出し、ファイル検索で .bib ファイルの場所を確かめます。

### Step 1.2: 関連研究を探す {#step-12-search-for-related-work}

**`arxiv` skill を読み込みます**（`skill_view("arxiv")`）。arXiv の REST API 検索、Semantic Scholar の引用グラフ、著者プロフィール、BibTeX 生成が使えます。

広く探すときは `web_search`、特定の論文を取りに行くときは `web_extract` を使います。

```
# Via web_search:
web_search("[main technique] + [application domain] site:arxiv.org")
web_search("[baseline method] comparison ICML NeurIPS 2024")

# Via web_extract (for specific papers):
web_extract("https://arxiv.org/abs/2303.17651")
```

ほかに試したい検索語:

```
Search queries:
- "[main technique] + [application domain]"
- "[baseline method] comparison"
- "[problem name] state-of-the-art"
- Author names from existing citations
```

**おすすめ**: 学術検索をその場で行うために **Exa MCP** を入れておきます。
```bash
claude mcp add exa -- npx -y mcp-remote "https://mcp.exa.ai/mcp"
```

### Step 1.2b: 検索を深める（まず広く、それから深く） {#step-12b-deepen-the-search-breadth-first-then-depth}

一回きりの平坦な検索では、重要な関連研究をたいてい取りこぼします。深い調査のパイプラインにならって、**まず広く、それから深く** 掘る反復の型を使ってください。

```
Iterative Literature Search:

Round 1 (Breadth): 4-6 parallel queries covering different angles
  - "[method] + [domain]"
  - "[problem name] state-of-the-art 2024 2025"
  - "[baseline method] comparison"
  - "[alternative approach] vs [your approach]"
  → Collect papers, extract key concepts and terminology

Round 2 (Depth): Generate follow-up queries from Round 1 learnings
  - New terminology discovered in Round 1 papers
  - Papers cited by the most relevant Round 1 results
  - Contradictory findings that need investigation
  → Collect papers, identify remaining gaps

Round 3 (Targeted): Fill specific gaps
  - Missing baselines identified in Rounds 1-2
  - Concurrent work (last 6 months, same problem)
  - Key negative results or failed approaches
  → Stop when new queries return mostly papers you've already seen
```

**やめどき**: 一巡して返ってくる論文の 8 割超がすでに手元にあるなら、検索は飽和しています。ふつうは 2〜3 巡で足ります。サーベイ論文なら 4〜5 巡は見込んでください。

**エージェントで進める場合**: 各巡の検索を `delegate_task` で並列に投げます。結果を集めて重複を取り除き、まとめて得られた知見から次の巡の検索語を作ります。

### Step 1.3: すべての引用を検証する {#step-13-verify-every-citation}

**BibTeX を記憶から書いてはいけません。必ずプログラムから取得してください。**

引用ごとに、次の 5 段階を必ず踏みます。

```
Citation Verification (MANDATORY per citation):
1. SEARCH → Query Semantic Scholar or Exa MCP with specific keywords
2. VERIFY → Confirm paper exists in 2+ sources (Semantic Scholar + arXiv/CrossRef)
3. RETRIEVE → Get BibTeX via DOI content negotiation (programmatically, not from memory)
4. VALIDATE → Confirm the claim you're citing actually appears in the paper
5. ADD → Add verified BibTeX to bibliography
If ANY step fails → mark as [CITATION NEEDED], inform scientist
```

```python
# Fetch BibTeX via DOI

def doi_to_bibtex(doi: str) -> str:
    response = requests.get(
        f"https://doi.org/{doi}",
        headers={"Accept": "application/x-bibtex"}
    )
    response.raise_for_status()
    return response.text
```

引用を確かめられなかった場合は、こう書いておきます。

```latex
\cite{PLACEHOLDER_author2024_verify_this}  % TODO: Verify this citation exists
```

**必ず研究者に伝えること**: 「[X] 件の引用を、検証が必要な仮置きとして印を付けました」

API の詳しい説明と `CitationManager` クラスの全体は [references/citation-workflow.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/research\research-paper-writing/references/citation-workflow.md) にあります。

### Step 1.4: 関連研究を整理する {#step-14-organize-related-work}

論文を一本ずつ並べるのではなく、手法の系統でまとめます。

**良い例**: 「ある系統の研究は X の仮定を置いている [refs] が、我々は Y の仮定を採る。理由は……」
**悪い例**: 「Smith らは X を提案した。Jones らは Y を提案した。我々は両者を組み合わせる。」

---

## Phase 2: 実験の設計 {#phase-2-experiment-design}

**目標**: 論文の主張を直接支える実験を設計します。どの実験も、はっきりした問いに答えるものでなければなりません。

### Step 2.1: 主張と実験を対応づける {#step-21-map-claims-to-experiments}

対応表を明示的に作ります。

| 主張 | 実験 | 期待される証拠 |
|-------|-----------|-------------------|
| 「我々の手法はベースラインを上回る」 | 主要比較（Table 1） | 勝率、統計的有意性 |
| 「効果は弱いモデルほど大きい」 | モデル規模の研究 | 単調に伸びる改善曲線 |
| 「収束にはスコープの制約が要る」 | 制約あり対制約なし | 収束速度の比較 |

**規則**: 主張に対応しない実験は回さないでください。

### Step 2.2: ベースラインを設計する {#step-22-design-baselines}

採択される論文と落ちる論文を分けるのは、強いベースラインです。査読者は必ず「X とは比べたのか」と聞いてきます。

ベースラインの標準的な種類は次のとおりです。

- **素朴なベースライン**: 考えうるいちばん単純なやり方
- **強いベースライン**: 既存で最良と知られている手法
- **アブレーション用ベースライン**: 自分の手法から要素をひとつ抜いたもの
- **計算量を揃えたベースライン**: 同じ計算予算を別の使い方に配分したもの

### Step 2.3: 評価手順を決める {#step-23-define-evaluation-protocol}

何かを回す前に、次を決めておきます。

- **指標**: 何を測るのか、方向を示す記号（大きいほど良い / 小さいほど良い）
- **集約の仕方**: 実行やタスクをまたいで結果をどうまとめるか
- **統計的検定**: 有意性を何で確かめるか
- **標本サイズ**: 実行数、問題数、タスク数

### Step 2.4: 実験スクリプトを書く {#step-24-write-experiment-scripts}

うまくいっている研究パイプラインに共通する型を踏襲します。

**逐次保存** — 途中で落ちても復帰できるよう、各段階のあとに結果を保存します。
```python
# Save after each problem/task
result_path = f"results/{task}/{strategy}/result.json"
if os.path.exists(result_path):
    continue  # Skip already-completed work
# ... run experiment ...
with open(result_path, 'w') as f:
    json.dump(result, f, indent=2)
```

**中間生成物の保存** — 途中の出力をすべて残します。
```
results/<experiment>/
  <task>/
    <strategy>/
      final_output.md          # Final result
      history.json             # Full trajectory
      pass_01/                 # Per-iteration artifacts
        version_a.md
        version_b.md
        critic.md
```

**関心の分離** — 生成、評価、可視化を別々に保ちます。
```
run_experiment.py              # Core experiment runner
run_baselines.py               # Baseline comparison
run_comparison_judge.py        # Blind evaluation
analyze_results.py             # Statistical analysis
make_charts.py                 # Visualization
```

設計パターン、cron による監視、エラーからの復帰の全体は [references/experiment-patterns.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/research\research-paper-writing/references/experiment-patterns.md) にあります。

### Step 2.5: 人手評価を設計する（必要な場合） {#step-25-design-human-evaluation-if-applicable}

NLP、HCI、アラインメントの論文では、人手評価が主要な証拠、あるいはそれを補う証拠として求められることがよくあります。自動実験より先に設計してください。人手評価は、倫理審査の承認やアノテーターの募集などで、動き出すまでに時間がかかります。

**人手評価が必要になる場面:**
- 自動指標では、知りたいこと（流暢さ、有用さ、安全性）が測れない
- 貢献が人に向いた性質（読みやすさ、好み、信頼）に関わる
- ACL や EMNLP といった NLP の会議で、生成タスクなら期待される

**設計上の主な判断:**

| 判断 | 選択肢 | 指針 |
|----------|---------|----------|
| **アノテーターの種類** | 専門家、クラウドワーカー、実際の利用者 | 主張が要求する水準に合わせる |
| **尺度** | リッカート（1〜5）、一対比較、順位づけ | LLM の出力にはリッカートより一対比較のほうが安定する |
| **標本サイズ** | アノテーターあたりと全体 | 検定力分析を行うか、最低でも 100 項目・3 名以上 |
| **一致度の指標** | Cohen の κ、Krippendorff の α、ICC | 3 名以上なら Krippendorff の α。素の一致率も併記する |
| **プラットフォーム** | Prolific、MTurk、社内チーム | 品質なら Prolific、規模なら MTurk、専門性なら社内 |

**アノテーション手引きの確認項目:**
```
- [ ] Clear task description with examples (good AND bad)
- [ ] Decision criteria for ambiguous cases
- [ ] At least 2 worked examples per category
- [ ] Attention checks / gold standard items (10-15% of total)
- [ ] Qualification task or screening round
- [ ] Estimated time per item and fair compensation (>= local minimum wage)
- [ ] IRB/ethics review if required by your institution
```

**報告に必要なもの**（査読者は全部見ます）:
- アノテーターの人数とその適格性
- アノテーター間一致度（指標名と値を明記）
- 報酬の詳細（金額、時給換算の見込み）
- アノテーション画面の説明かスクリーンショット（付録）
- アノテーションにかかった総時間

人手評価データの統計的検定、クラウドソーシングの品質管理の型、倫理審査についての案内を含む完全な手引きは [references/human-evaluation.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/research\research-paper-writing/references/human-evaluation.md) にあります。

---

## Phase 3: 実験の実行と監視 {#phase-3-experiment-execution-monitoring}

**目標**: 実験を確実に回し、進み具合を見守り、失敗から立て直します。

### Step 3.1: 実験を起動する {#step-31-launch-experiments}

長時間かかる実験には `nohup` を使います。

```bash
nohup python run_experiment.py --config config.yaml > logs/experiment_01.log 2>&1 &
echo $!  # Record the PID
```

ログをファイルに落としながら裏で走らせ、表示された PID を控えておきます。

**並列実行**: 互いに独立した実験は同時に回せますが、API のレート制限には注意してください。同じ API に 4 本以上を同時にぶつけると、どれもが遅くなります。

### Step 3.2: 監視を用意する（cron の型） {#step-32-set-up-monitoring-cron-pattern}

長時間の実験には、定期的な状態確認を仕掛けます。cron に渡すプロンプトは次の型に沿わせます。

```
Monitor Prompt Template:
1. Check if process is still running: ps aux | grep <pattern>
2. Read last 30 lines of log: tail -30 <logfile>
3. Check for completed results: ls <result_dir>
4. If results exist, read and report: cat <result_file>
5. If all done, commit: git add -A && git commit -m "<descriptive message>" && git push
6. Report in structured format (tables with key metrics)
7. Answer the key analytical question for this experiment
```

**沈黙モード**: 前回の確認から何も変わっていなければ `[SILENT]` と返し、利用者への通知を止めます。知らせるのは、知らせるべきことがあるときだけです。

### Step 3.3: 失敗に対処する {#step-33-handle-failures}

よくある失敗と立て直し方は次のとおりです。

| 失敗 | 見分け方 | 立て直し方 |
|---------|-----------|----------|
| API のレート制限 / クレジット切れ | ログの 402 / 429 エラー | 待ってから再実行（スクリプトは完了分を飛ばす） |
| プロセスの異常終了 | PID が消え、結果が途中まで | 直近のチェックポイントから再実行 |
| 難問でのタイムアウト | プロセスが固まり、ログが進まない | 停止して飛ばし、結果に記録する |
| モデル ID の誤り | モデル名に触れるエラー | ID を直して再実行 |

**要点**: スクリプトは必ず既存の結果を確認し、終わっている分を飛ばすようにします。こうしておけば、再実行が安全で無駄になりません。

### Step 3.4: 終わった結果をコミットする {#step-34-commit-completed-results}

実験のひとまとまりが終わるたびに、次を実行します。

```bash
git add -A
git commit -m "Add <experiment name>: <key finding in 1 line>"
git push
```

変更をすべて追加し、主な発見を一行で添えてコミットし、リモートへ送ります。

### Step 3.5: 実験ジャーナルを残す {#step-35-maintain-an-experiment-journal}

git のコミットは「何が起きたか」を残しますが、**探索の枝分かれ** — 分かったことを踏まえて次に何を試すと決めたのか — は残りません。その枝分かれを記録する実験ジャーナルを付けてください。

```json
// experiment_journal.jsonl — append one entry per experiment attempt
{
  "id": "exp_003",
  "parent": "exp_001",
  "timestamp": "2025-05-10T14:30:00Z",
  "hypothesis": "Adding scope constraints will fix convergence failure from exp_001",
  "plan": "Re-run autoreason with max_tokens=2000 and fixed structure template",
  "config": {"model": "haiku", "strategy": "autoreason", "max_tokens": 2000},
  "status": "completed",
  "result_path": "results/exp_003/",
  "key_metrics": {"win_rate": 0.85, "convergence_rounds": 3},
  "analysis": "Scope constraints fixed convergence. Win rate jumped from 0.42 to 0.85.",
  "next_steps": ["Try same constraints on Sonnet", "Test without structure template"],
  "figures": ["figures/exp003_convergence.pdf"]
}
```

**なぜ git だけでなくジャーナルが要るのか。** git が追うのはファイルの変更です。ジャーナルが追うのは理由づけ — なぜ X を試したのか、何が分かったのか、それが次の実験に何を意味するのか — です。論文を書くとき、この枝分かれは Methods の節（「X が観測され、それが Y の動機になった」）と、失敗を正直に報告するうえでかけがえのない材料になります。

**最良の経路を選ぶ**: ジャーナルが枝分かれ（exp_001 → exp_002a、exp_002b、exp_003）を示しているとき、論文の主張をいちばん支える経路を見きわめます。行き止まりだった枝は、アブレーションや否定的結果として付録に記録します。

**実験ごとにコードを固定する**: 実行のたびにスクリプトを複製しておきます。
```bash
cp experiment.py results/exp_003/experiment_snapshot.py
```
こうしておくと、あとでコードを変えても当時の実行をそのまま再現できます。

---

## Phase 4: 結果の分析 {#phase-4-result-analysis}

**目標**: 発見を取り出し、統計量を求め、物語を見つけます。

### Step 4.1: 結果を集約する {#step-41-aggregate-results}

次のことをする分析スクリプトを書きます。

1. ひとまとまりの結果ファイルをすべて読み込む
2. タスク単位と全体の指標を計算する
3. 要約の表を作る

```python
# Standard analysis pattern

from pathlib import Path

results = {}
for result_file in Path("results/").rglob("result.json"):
    data = json.loads(result_file.read_text())
    strategy = result_file.parent.name
    task = result_file.parent.parent.name
    results.setdefault(strategy, {})[task] = data

# Compute aggregate metrics
for strategy, tasks in results.items():
    scores = [t["score"] for t in tasks.values()]
    print(f"{strategy}: mean={np.mean(scores):.1f}, std={np.std(scores):.1f}")
```

### Step 4.2: 統計的有意性 {#step-42-statistical-significance}

次は必ず計算します。

- **誤差棒**: 標準偏差か標準誤差か、どちらかを明記する
- **信頼区間**: 主要な結果には 95% 信頼区間を付ける
- **一対検定**: 二つの手法を比べるなら McNemar 検定
- **効果量**: 実質的な差を見るための Cohen の d や h

McNemar 検定、ブートストラップによる信頼区間、Cohen の h の実装は [references/experiment-patterns.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/research\research-paper-writing/references/experiment-patterns.md) にそろっています。

### Step 4.3: 物語を見つける {#step-43-identify-the-story}

分析のあと、次にはっきり答えます。

1. **いちばんの発見は何か。** 一文で言い切ってください。
2. **意外だったことは何か。** 予想外の結果からいちばん良い論文が生まれることはよくあります。
3. **何が失敗したか。** 失敗した実験がもっとも多くを語ることがあります。失敗を正直に書くと論文は強くなります。
4. **どんな追加実験が要るか。** 結果はたいてい新しい問いを連れてきます。

#### 否定的な結果・帰無の結果をどう扱うか {#handling-negative-or-null-results}

仮説が外れたり結論が出なかったりしたときは、三つの道があります。

| 状況 | 行動 | 向いている投稿先 |
|-----------|--------|-----------|
| 仮説は外れたが、**なぜ** 外れたかに意味がある | その理由の分析を軸に論文を組み立てる | NeurIPS、ICML（分析が厳密であれば） |
| ベースラインには勝てないが **新しい何かが見えた** | 貢献を理解・分析として枠づけ直す | ICLR（理解を重んじる）、ワークショップ論文 |
| 広く信じられている主張に対する明快な否定的結果 | そのまま書く。分野が知るべきこと | NeurIPS Datasets & Benchmarks トラック、TMLR、ワークショップ |
| 結論が出ず、物語もない | 方向を変える。別の実験を回すか、枠づけをやり直す | そこにない論文を無理に作らない |

**否定的結果の論文の書き方:**
- コミュニティが何を信じていて、それを検証することがなぜ重要かから始める
- 厳密な方法論を説明する（隙があってはいけません。査読はより厳しくなります）
- 帰無の結果を、統計的な裏づけとともにはっきり示す
- 期待された結果が **なぜ** 現れなかったのかを分析する
- 分野にとって何を意味するかを論じる

**否定的結果を明確に歓迎する投稿先**: NeurIPS（Datasets & Benchmarks トラック）、TMLR、ML Reproducibility Challenge、主要会議のワークショップ。否定的結果を名指しで募集しているワークショップもあります。

### Step 4.4: 図と表を作る {#step-44-create-figures-and-tables}

**図**:
- 図はすべてベクター形式（PDF）で保存します: `plt.savefig('fig.pdf')`
- 色覚に配慮した配色（Okabe-Ito か Paul Tol）を使います
- キャプションだけで意味が通るようにします。本文を読まなくても分かる状態が目標です
- 図の中にタイトルを入れません。その役目はキャプションが担います

**表**:
- `booktabs` パッケージを使います
- 指標ごとに最良の値を太字にします
- 方向を示す記号（大きいほど良い / 小さいほど良い）を入れます
- 小数点以下の桁数をそろえます

```latex
\usepackage{booktabs}
\begin{tabular}{lcc}
\toprule
Method & Accuracy $\uparrow$ & Latency $\downarrow$ \\
\midrule
Baseline & 85.2 & 45ms \\
\textbf{Ours} & \textbf{92.1} & 38ms \\
\bottomrule
\end{tabular}
```

### Step 4.5: 実験を続けるか、書き始めるか {#step-45-decide-more-experiments-or-write}

| 状況 | 行動 |
|-----------|--------|
| 中心の主張が支えられ、結果も有意 | Phase 5（執筆）へ進む |
| 結論が出ず、データが足りない | Phase 2（設計）へ戻る |
| 予想外の発見が新しい方向を示した | Phase 2（設計）へ戻る |
| 査読者が必ず聞くアブレーションがひとつ足りない | それを回してから Phase 5 へ |
| 実験はすべて終わったが、一部が失敗した | 失敗を記録して Phase 5 へ |

### Step 4.6: 実験ログを書く（執筆への橋渡し） {#step-46-write-the-experiment-log-bridge-to-writeup}

論文執筆に移る前に、結果と文章をつなぐ実験ログを作ります。これは実験と原稿のあいだでもっとも大事な結合組織で、これがないと執筆側のエージェントは生の結果ファイルから物語を組み立て直すはめになります。

**`experiment_log.md` を、次の構成で作ります。**

```markdown
# Experiment Log

## Contribution (one sentence)
[The paper's main claim]

## Experiments Run

### Experiment 1: [Name]
- **Claim tested**: [Which paper claim this supports]
- **Setup**: [Model, dataset, config, number of runs]
- **Key result**: [One sentence with the number]
- **Result files**: results/exp1/final_info.json
- **Figures generated**: figures/exp1_comparison.pdf
- **Surprising findings**: [Anything unexpected]

### Experiment 2: [Name]
...

## Figures
| Filename | Description | Which section it belongs in |
|----------|-------------|---------------------------|
| figures/main_comparison.pdf | Bar chart comparing all methods on benchmark X | Results, Figure 2 |
| figures/ablation.pdf | Ablation removing components A, B, C | Results, Figure 3 |
...

## Failed Experiments (document for honesty)
- [What was tried, why it failed, what it tells us]

## Open Questions
- [Anything the results raised that the paper should address]
```

**これが効く理由**: 執筆時に、エージェント（あるいは委任した下位エージェント）が `experiment_log.md` を LaTeX テンプレートと一緒に読み込めば、実際の結果に根ざした初稿を書けます。この橋渡しがないと、執筆側は生の JSON や CSV を解釈して物語を推測することになり、数値の捏造や誤記の温床になります。

**git の作法**: このログは、それが説明する結果と一緒にコミットします。

---

## 反復的な改良: 戦略の選び方 {#iterative-refinement-strategy-selection}

このパイプラインの出力はどれも — 論文のドラフト、実験スクリプト、分析 — 繰り返し磨けます。autoreason の研究は、どの改良戦略がいつ効き、いつ効かないかを実証的に示しています。この節を、やり方を選ぶときの手がかりにしてください。

### 早わかり判断表 {#quick-decision-table}

| あなたの状況 | 戦略 | 理由 |
|---------------|----------|-----|
| 中位モデル + 制約のあるタスク | **Autoreason** | 最適点。生成と評価の差がもっとも開く。ベースラインはむしろ弱いモデルの出力を壊す |
| 中位モデル + 開かれたタスク | スコープ制約を足した **Autoreason** | 固定の事実、構造、成果物の形を与えて、改良の余地を区切る |
| 最前線モデル + 制約のあるタスク | **Autoreason** | 最前線モデルでも制約タスク 3 件中 2 件で勝つ |
| 最前線モデル + 制約のないタスク | **批評して直す** か **一発生成** | Autoreason は最下位。モデルの自己評価だけで十分に足りる |
| 具体的な技術課題（システム設計） | **批評して直す** | 見つけて直すだけの直線的なループのほうが効率が良い |
| ひな形を埋めるタスク（正しい構造がひとつ） | **一発生成** か **保守的な方法** | 選択の余地が小さい。繰り返しても価値が増えない |
| テストケースのあるコード | **Autoreason（コード版）** | 直す前に、失敗した *理由* を構造的に分析する。復旧率は 43% に対して 62% |
| かなり弱いモデル（Llama 8B 級） | **一発生成** | 多様な候補を出せるほどの力がない。生成の質に投資する |

### 生成と評価の差 {#the-generation-evaluation-gap}

**核心**: Autoreason の価値は、モデルの生成能力と自己評価能力の差の大きさで決まります。

<!-- ascii-guard-ignore -->
```
Model Tier        │ Generation │ Self-Eval │ Gap    │ Autoreason Value
──────────────────┼────────────┼───────────┼────────┼─────────────────
Weak (Llama 8B)   │ Poor       │ Poor      │ Small  │ None — can't generate diverse candidates
Mid (Haiku 3.5)   │ Decent     │ Poor      │ LARGE  │ MAXIMUM — 42/42 perfect Borda
Mid (Gemini Flash)│ Decent     │ Moderate  │ Large  │ High — wins 2/3
Strong (Sonnet 4) │ Good       │ Decent    │ Medium │ Moderate — wins 3/5
Frontier (S4.6)   │ Excellent  │ Good      │ Small  │ Only with constraints
```
<!-- ascii-guard-ignore-end -->

この差は構造的なもので、一時的なものではありません。費用が下がれば、今日の最前線は明日の中位になります。最適点は移動しますが、消えることはありません。

### Autoreason のループ（要約） {#autoreason-loop-summary}

一巡ごとに、文脈を共有しない新しいエージェントから 3 つの候補が生まれます。

1. **批評役** → 現行案 A の問題点を挙げる（修正はしない）
2. **著者 B** → 批評をもとに A を書き直す
3. **統合役** → A と B を統合する（ラベルは無作為化）
4. **審査団** → 3 名の目隠し CoT 審査員が Borda 集計で A、B、AB を順位づけする
5. **収束** → A が k=2 回連続で勝てば終了

**主なパラメータ:**
- k=2 で収束と判定（k=1 は早すぎ、k=3 は費用がかさむだけで質は上がらない）
- 審査員は常に CoT（収束が 3 倍速い）
- 温度は著者 0.8、審査員 0.3
- 同点は保守的に処理する（引き分けなら現行案の勝ち）
- どの役も、文脈を共有しない新しいエージェント

### 論文のドラフトに当てはめる {#applying-to-paper-drafts}

autoreason で論文そのものを磨くときは、次に気をつけます。

- **批評役に正解データを渡す**: 実際の実験データ、結果の JSON、統計出力を渡します。これがないと、モデルは架空のアブレーション研究や偽の信頼区間を作り出します。
- **機能している審査員を最低 3 名そろえる**: 審査員のパーサーが壊れると、雑音が増えるのではなく、そもそも均衡に到達しなくなります。
- **書き直しの範囲を区切る**: 「論文を良くして」ではなく「この弱点に対処して」と指示します。

### うまくいかないとき {#failure-modes}

| 症状 | 見分け方 | 対処 |
|---------|-----------|-----|
| 収束しない（A が勝たない） | 20 巡以上で A の勝率が &lt;15% | タスクにスコープ制約を足す |
| 統合による膨張 | 語数が際限なく増える | 構造と成果物の形を縛る |
| 一発生成より悪化する | ベースラインのほうが高得点 | 一発生成に切り替える。モデルが弱すぎる可能性がある |
| 過適合（コード） | 公開テストは通るが非公開テストが落ちる | テストの結果だけでなく、構造的な分析を使う |
| 審査員の故障 | 解析失敗で審査団が 3 名を割る | 続ける前にパーサーを直す |

プロンプト全文、Borda 集計の詳細、モデル選びの案内、スコープ制約の設計パターン、計算予算の目安は [references/autoreason-methodology.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/research\research-paper-writing/references/autoreason-methodology.md) にあります。

---

## Phase 5: 論文の執筆 {#phase-5-paper-drafting}

執筆手順の全体（節を書く順序、LaTeX の骨組み、図表の作法、abstract と intro の型、related work での位置づけ）は
`references/phase5-paper-drafting.md` にあります。この段階に来たら `read_file` で読み込んでください。
文レベルの文体規則は `references/writing-guide.md` と併せて使います。

## Phase 6: 自己査読と改訂 {#phase-6-self-review-revision}

**目標**: 投稿前に査読の過程を模擬します。弱点を早めにつかまえます。

### Step 6.1: 査読を模擬する（アンサンブルの型） {#step-61-simulate-reviews-ensemble-pattern}

複数の視点から査読を生成します。自動研究パイプライン（とくに SakanaAI の AI-Scientist）から得られた要点は、**メタ査読者を置いたアンサンブル査読は、一度きりの査読よりはるかに較正の効いた指摘を出す** ということです。

**Step 1: 独立した査読を N 本作る**（N=3〜5）

異なるモデルか、異なる温度設定を使います。各査読者には論文だけを見せ、ほかの査読は見せません。**初期値として否定寄りにします** — LLM の評価には肯定側に寄る傾向がよく知られています。

```
You are an expert reviewer for [VENUE]. You are critical and thorough.
If a paper has weaknesses or you are unsure about a claim, flag it clearly
and reflect that in your scores. Do not give the benefit of the doubt.

Review this paper according to the official reviewer guidelines. Evaluate:

1. Soundness (are claims well-supported? are baselines fair and strong?)
2. Clarity (is the paper well-written? could an expert reproduce it?)
3. Significance (does this matter to the community?)
4. Originality (new insights, not just incremental combination?)

Provide your review as structured JSON:
{
  "summary": "2-3 sentence summary",
  "strengths": ["strength 1", "strength 2", ...],
  "weaknesses": ["weakness 1 (most critical)", "weakness 2", ...],
  "questions": ["question for authors 1", ...],
  "missing_references": ["paper that should be cited", ...],
  "soundness": 1-4,
  "presentation": 1-4,
  "contribution": 1-4,
  "overall": 1-10,
  "confidence": 1-5
}
```

**Step 2: メタ査読（エリアチェアによる集約）**

N 本の査読をすべてメタ査読者に渡します。

```
You are an Area Chair at [VENUE]. You have received [N] independent reviews
of a paper. Your job is to:

1. Identify consensus strengths and weaknesses across reviewers
2. Resolve disagreements by examining the paper directly
3. Produce a meta-review that represents the aggregate judgment
4. Use AVERAGED numerical scores across all reviews

Be conservative: if reviewers disagree on whether a weakness is serious,
treat it as serious until the authors address it.

Reviews:
[review_1]
[review_2]
...
```

**Step 3: 見直しのループ**（任意、2〜3 巡）

各査読者は、メタ査読を見たあとに自分の査読を練り直せます。早期打ち切りの合図を決めておきます。査読者が「I am done」（変更なし）と返したら、そこで繰り返しを止めます。

**査読に使うモデルの選び方**: 査読には、使える中でいちばん強いモデルを充てるのが良い方法です。論文自体を安いモデルで書いていても構いません。査読側のモデルは、執筆側とは独立に選んでください。

**少数事例での較正**: 手に入るなら、投稿先で実際に公開された査読を 1〜2 本、例として添えます。点数の較正が目に見えて良くなります。査読の例は [references/reviewer-guidelines.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/research\research-paper-writing/references/reviewer-guidelines.md) にあります。

### Step 6.1b: 見た目の査読（VLM） {#step-61b-visual-review-pass-vlm}

文章だけの査読では、ひとつの領域がまるごと抜け落ちます。図の質、レイアウトの問題、見た目の一貫性です。画像を見られるモデルが使えるなら、組版済みの PDF に対して **見た目の査読** を別に走らせてください。

```
You are reviewing the visual presentation of this research paper PDF.
Check for:
1. Figure quality: Are plots readable? Labels legible? Colors distinguishable?
2. Figure-caption alignment: Does each caption accurately describe its figure?
3. Layout issues: Orphaned section headers, awkward page breaks, figures far from their references
4. Table formatting: Aligned columns, consistent decimal precision, bold for best results
5. Visual consistency: Same color scheme across all figures, consistent font sizes
6. Grayscale readability: Would the figures be understandable if printed in B&W?

For each issue, specify the page number and exact location.
```

これで、文章の査読では拾えない問題が見つかります。軸ラベルが読めないグラフ、初出から 3 ページ離れて置かれた図、Figure 2 と Figure 5 で食い違う配色、明らかに段の幅をはみ出している表などです。

### Step 6.1c: 主張の検証 {#step-61c-claim-verification-pass}

模擬査読のあと、別立てで検証を回します。査読者が見落としがちな事実誤りをここでつかまえます。

```
Claim Verification Protocol:
1. Extract every factual claim from the paper (numbers, comparisons, trends)
2. For each claim, trace it to the specific experiment/result that supports it
3. Verify the number in the paper matches the actual result file
4. Flag any claim without a traceable source as [VERIFY]
```

エージェントで進める場合は、論文の本文と生の結果ファイルだけを渡した **新しい下位エージェント** に検証を委ねます。文脈が真新しいので、結果が「こうだったはず」という思い込みが働きません。

### Step 6.2: 指摘に優先順位を付ける {#step-62-prioritize-feedback}

査読が集まったら、次のように分類します。

| 優先度 | 行動 |
|----------|--------|
| **致命的**（技術的な欠陥、ベースラインの欠落） | 必ず直す。新しい実験が要るなら Phase 2 へ戻る |
| **高い**（分かりにくさ、アブレーションの不足） | この改訂で直す |
| **中くらい**（細かな文章の問題、追加実験） | 時間が許せば直す |
| **低い**（好みの問題、周辺的な提案） | 今後の課題として記録する |

### Step 6.3: 改訂の回し方 {#step-63-revision-cycle}

致命的・高い指摘のそれぞれについて、次を行います。

1. 影響する節を特定する
2. 修正案を書く
3. その修正がほかの主張を壊していないか確かめる
4. 論文を更新する
5. 査読者の懸念に照らして確認し直す

### Step 6.4: 反論文の書き方 {#step-64-rebuttal-writing}

実際の査読に応答するとき（投稿後）、反論文は改訂とは別の技能です。

**形式**: 一点ずつ答えます。査読者の懸念ごとに次のように書きます。
```
> R1-W1: "The paper lacks comparison with Method X."

We thank the reviewer for this suggestion. We have added a comparison with 
Method X in Table 3 (revised). Our method outperforms X by 3.2pp on [metric] 
(p<0.05). We note that X requires 2x our compute budget.
```

**規則**:
- すべての懸念に答えます。飛ばすと査読者は気づきます
- いちばん強い応答から先に出します
- 簡潔に、まっすぐ書きます。査読者は何本もの反論文を読んでいます
- 反論期間中に実験を回したなら、新しい結果を入れます
- 弱い批判に対しても、身構えたり切り捨てたりしません
- `latexdiff` で変更箇所を色分けした PDF を作ります（「LaTeX まわりの実務的な道具」の節を参照）
- 具体的で実行できる指摘には礼を述べます（当たり障りのない賛辞ではなく）

**やってはいけないこと**: 根拠なしの「謹んで反対します」。説明のない「これは範囲外です」。長所にだけ答えて弱点を無視すること。

### Step 6.5: 論文の変遷を残す {#step-65-paper-evolution-tracking}

節目ごとにスナップショットを保存します。
```
paper/
  paper.tex                    # Current working version
  paper_v1_first_draft.tex     # First complete draft
  paper_v2_post_review.tex     # After simulated review
  paper_v3_pre_submission.tex  # Final before submission
  paper_v4_camera_ready.tex    # Post-acceptance final
```

---

## Phase 7: 投稿の準備 {#phase-7-submission-preparation}

**目標**: 最終確認、体裁の調整、そして投稿です。

### Step 7.1: 会議のチェックリスト {#step-71-conference-checklist}

どの投稿先にも必須のチェックリストがあります。丁寧に埋めてください。未記入があると、査読に回る前に却下されることがあります。

次の内容は [references/checklists.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/research\research-paper-writing/references/checklists.md) にあります。

- NeurIPS の 16 項目チェックリスト
- ICML の broader impact と再現性
- ICLR の LLM 利用開示の方針
- ACL で必須の limitations の節
- 投稿前の共通チェックリスト

### Step 7.2: 匿名化のチェックリスト {#step-72-anonymization-checklist}

二重盲検の査読では、査読者に著者が分かってはいけません。次をすべて確認します。

```
Anonymization Checklist:
- [ ] No author names or affiliations anywhere in the PDF
- [ ] No acknowledgments section (add after acceptance)
- [ ] Self-citations written in third person: "Smith et al. [1] showed..." not "We previously showed [1]..."
- [ ] No GitHub/GitLab URLs pointing to your personal repos
- [ ] Use Anonymous GitHub (https://anonymous.4open.science/) for code links
- [ ] No institutional logos or identifiers in figures
- [ ] No file metadata containing author names (check PDF properties)
- [ ] No "our previous work" or "in our earlier paper" phrasing
- [ ] Dataset names don't reveal institution (rename if needed)
- [ ] Supplementary materials don't contain identifying information
```

**よくある失敗**: 補足資料のコードに残った git のコミットメッセージ、所属機関のツールが入れた透かし入りの図、前の稿から残った謝辞、匿名期間中に投稿した arXiv のプレプリント。

### Step 7.3: 体裁の確認 {#step-73-formatting-verification}

```
Pre-Submission Format Check:
- [ ] Page limit respected (excluding references and appendix)
- [ ] All figures are vector (PDF) or high-res raster (600 DPI PNG)
- [ ] All figures readable in grayscale
- [ ] All tables use booktabs
- [ ] References compile correctly (no "?" in citations)
- [ ] No overfull hboxes in critical areas
- [ ] Appendix clearly labeled and separated
- [ ] Required sections present (limitations, broader impact, etc.)
```

### Step 7.4: 組版前の検査 {#step-74-pre-compilation-validation}

`pdflatex` を走らせる **前に**、次の自動検査を回します。ここで誤りを見つけるほうが、コンパイラの出力を読み解くより速く済みます。

```bash
# 1. Lint with chktex (catches common LaTeX mistakes)
# Suppress noisy warnings: -n2 (sentence end), -n24 (parens), -n13 (intersentence), -n1 (command terminated)
chktex main.tex -q -n2 -n24 -n13 -n1

# 2. Verify all citations exist in .bib
# Extract \cite{...} from .tex, check each against .bib
python3 -c "

tex = open('main.tex').read()
bib = open('references.bib').read()
cites = set(re.findall(r'\\\\cite[tp]?{([^}]+)}', tex))
for cite_group in cites:
    for cite in cite_group.split(','):
        cite = cite.strip()
        if cite and cite not in bib:
            print(f'WARNING: \\\\cite{{{cite}}} not found in references.bib')
"

# 3. Verify all referenced figures exist on disk
python3 -c "

tex = open('main.tex').read()
figs = re.findall(r'\\\\includegraphics(?:\[.*?\])?{([^}]+)}', tex)
for fig in figs:
    if not os.path.exists(fig):
        print(f'WARNING: Figure file not found: {fig}')
"

# 4. Check for duplicate \label definitions
python3 -c "

from collections import Counter
tex = open('main.tex').read()
labels = re.findall(r'\\\\label{([^}]+)}', tex)
dupes = {k: v for k, v in Counter(labels).items() if v > 1}
for label, count in dupes.items():
    print(f'WARNING: Duplicate label: {label} (appears {count} times)')
"
```

この 4 つは順に、chktex による LaTeX の書式検査、参考文献ファイルに存在しない引用の洗い出し、参照されている図がディスク上にあるかの確認、ラベル定義の重複の検出です。警告はすべて片づけてから先へ進みます。エージェントで進める場合は、chktex の出力をエージェントに戻し、最小限の修正だけをさせます。

### Step 7.5: 最終の組版 {#step-75-final-compilation}

```bash
# Clean build
rm -f *.aux *.bbl *.blg *.log *.out *.pdf
latexmk -pdf main.tex

# Or manual (triple pdflatex + bibtex for cross-references)
pdflatex -interaction=nonstopmode main.tex
bibtex main
pdflatex -interaction=nonstopmode main.tex
pdflatex -interaction=nonstopmode main.tex

# Verify output exists and has content
ls -la main.pdf
```

中間ファイルを消してから latexmk で組みます。手作業でやる場合は、相互参照を解決するために組版を 3 回走らせ、あいだに文献処理を挟み、最後に PDF ができていて中身があることを確かめます。

**組版に失敗したら**: `.log` ファイルから最初のエラーを読みます。よくある原因は次のとおりです。

- 「Undefined control sequence」→ パッケージの読み込み漏れか、コマンド名の打ち間違い
- 「Missing $ inserted」→ 数式モードの外に数式記号がある
- 「File not found」→ 図のパスが違うか、.sty ファイルがない
- 「Citation undefined」→ .bib に項目がないか、bibtex を走らせていない

### Step 7.6: 投稿先ごとの要件 {#step-76-conference-specific-requirements}

| 投稿先 | 固有の要件 |
|-------|---------------------|
| **NeurIPS** | 付録にチェックリスト、採択時は一般向け要約 |
| **ICML** | Broader Impact Statement（結論のあと。ページ数には数えない） |
| **ICLR** | LLM 利用の開示が必須、相互査読への同意 |
| **ACL** | Limitations の節が必須、Responsible NLP チェックリスト |
| **AAAI** | スタイルファイルの改変は一切禁止 |
| **COLM** | 言語モデルのコミュニティ向けに貢献を枠づける |

### Step 7.7: 別の会議への再投稿とフォーマット変換 {#step-77-conference-resubmission-format-conversion}

投稿先を変えるとき、**LaTeX のプリアンブルをテンプレート間で写してはいけません**。

```bash
# 1. Start fresh with target template
cp -r templates/icml2026/ new_submission/

# 2. Copy ONLY content sections (not preamble)
#    - Abstract text, section content, figures, tables, bib entries

# 3. Adjust for page limits
# 4. Add venue-specific required sections
# 5. Update references
```

新しい投稿先のテンプレートを丸ごと複製したうえで、本文の中身だけを移し、ページ数を調整し、投稿先が求める節を足して、参考文献を更新します。

| 変換元 → 変換先 | ページ数の変化 | 主な調整 |
|-----------|-------------|-----------------|
| NeurIPS → ICML | 9 → 8 | 1 ページ削る、Broader Impact を足す |
| ICML → ICLR | 8 → 9 | 実験を厚くする、LLM 利用の開示を足す |
| NeurIPS → ACL | 9 → 8 | NLP の慣行に合わせて組み直し、Limitations を足す |
| ICLR → AAAI | 9 → 7 | 大幅に削る、スタイルを厳密に守る |
| いずれか → COLM | 変動 → 9 | 言語モデル寄りに枠づけ直す |

ページを削るときは、証明を付録へ移し、related work を圧縮し、表をまとめ、subfigure を使います。
ページを増やすときは、アブレーションを足し、limitations を厚くし、ベースラインを追加し、定性的な例を入れます。

**不採択のあと**: 新しい稿では査読者の懸念に対処しますが、「変更点」の節を設けたり以前の投稿に言及したりはしません（盲検査読のためです）。

### Step 7.8: カメラレディの準備（採択後） {#step-78-camera-ready-preparation-post-acceptance}

採択されたら、カメラレディ版を用意します。

```
Camera-Ready Checklist:
- [ ] De-anonymize: add author names, affiliations, email addresses
- [ ] Add Acknowledgments section (funding, compute grants, helpful reviewers)
- [ ] Add public code/data URL (real GitHub, not anonymous)
- [ ] Address any mandatory revisions from meta-reviewer
- [ ] Switch template to camera-ready mode (if applicable — e.g., AAAI \anon → \camera)
- [ ] Add copyright notice if required by venue
- [ ] Update any "anonymous" placeholders in text
- [ ] Verify final PDF compiles cleanly
- [ ] Check page limit for camera-ready (sometimes differs from submission)
- [ ] Upload supplementary materials (code, data, appendix) to venue portal
```

### Step 7.9: arXiv とプレプリントの戦略 {#step-79-arxiv-preprint-strategy}

ML では arXiv への投稿が当たり前になっていますが、時期と匿名性について考えるべきことがあります。

**時期の判断:**

| 状況 | 推奨 |
|-----------|---------------|
| 二重盲検の投稿先（NeurIPS、ICML、ACL）に出す | arXiv には締め切りの **あと** に投稿します。前に出すと匿名性の方針に触れうるためです（運用の厳しさは投稿先によります） |
| ICLR に出す | ICLR は投稿前の arXiv 公開を明示的に認めています。ただし投稿する原稿自体に著者名を入れてはいけません |
| すでに arXiv にある論文を、別の投稿先に出す | ほとんどの投稿先で問題ありません。ただし査読中に、査読へ言及する変更で arXiv の版を更新してはいけません |
| ワークショップ論文 | いつでも構いません。ワークショップはたいてい二重盲検ではありません |
| 先取権を確保したい | 先を越される懸念があるならすぐ公開します。ただし匿名性を犠牲にすることは受け入れてください |

**arXiv のカテゴリ選び**（ML / AI 論文の場合）:

| カテゴリ | コード | 向いている内容 |
|----------|------|----------|
| Machine Learning | `cs.LG` | 一般的な ML の手法 |
| Computation and Language | `cs.CL` | NLP、言語モデル |
| Artificial Intelligence | `cs.AI` | 推論、計画、エージェント |
| Computer Vision | `cs.CV` | 画像モデル |
| Information Retrieval | `cs.IR` | 検索、推薦 |

**主カテゴリ 1 つに、相互掲載を 1〜2 つ添えます。** カテゴリを増やすほど目に触れますが、本当に関係のあるところにだけ相互掲載してください。

**版の付け方:**
- **v1**: 最初の投稿（会議への投稿稿と同じ）
- **v2**: 採択後、カメラレディの修正を反映（abstract に「accepted at [Venue]」を加える）
- 査読期間中に、査読への応答だと明らかに分かる変更を入れた v2 を出さないでください

```bash
# Check if your paper's title is already taken on arXiv
# (before choosing a title)
pip install arxiv
python -c "

results = list(arxiv.Search(query='ti:\"Your Exact Title\"', max_results=5).results())
print(f'Found {len(results)} matches')
for r in results: print(f'  {r.title} ({r.published.year})')
"
```

タイトルを決める前に、arxiv パッケージを入れて同じ題名が使われていないかを確かめます。

### Step 7.10: 研究コードの公開準備 {#step-710-research-code-packaging}

そのまま動く整ったコードを公開すると、引用数と査読者の信頼が目に見えて上がります。カメラレディと一緒に用意してください。

**リポジトリの構成:**

```
your-method/
  README.md              # Setup, usage, reproduction instructions
  requirements.txt       # Or environment.yml for conda
  setup.py               # For pip-installable packages
  LICENSE                # MIT or Apache 2.0 recommended for research
  configs/               # Experiment configurations
  src/                   # Core method implementation
  scripts/               # Training, evaluation, analysis scripts
    train.py
    evaluate.py
    reproduce_table1.sh  # One script per main result
  data/                  # Small data or download scripts
    download_data.sh
  results/               # Expected outputs for verification
```

**研究コード向けの README のひな形:**

```markdown
# [Paper Title]

Official implementation of "[Paper Title]" (Venue Year).

## Setup
[Exact commands to set up environment]

## Reproduction
To reproduce Table 1: `bash scripts/reproduce_table1.sh`
To reproduce Figure 2: `python scripts/make_figure2.py`

## Citation
[BibTeX entry]
```

**公開前のチェックリスト:**
```
- [ ] Code runs from a clean clone (test on fresh machine or Docker)
- [ ] All dependencies pinned to specific versions
- [ ] No hardcoded absolute paths
- [ ] No API keys, credentials, or personal data in repo
- [ ] README covers setup, reproduction, and citation
- [ ] LICENSE file present (MIT or Apache 2.0 for max reuse)
- [ ] Results are reproducible within expected variance
- [ ] .gitignore excludes data files, checkpoints, logs
```

**投稿時の匿名コード**（採択前）:
```bash
# Use Anonymous GitHub for double-blind review
# https://anonymous.4open.science/
# Upload your repo → get an anonymous URL → put in paper
```

二重盲検の査読には Anonymous GitHub を使います。リポジトリを上げると匿名の URL が発行されるので、それを論文に載せます。

---

## Phase 8: 採択後の成果物 {#phase-8-post-acceptance-deliverables}

**目標**: 発表資料とコミュニティとの関わりを通じて、採択された論文の届く範囲を広げます。

### Step 8.1: 会議のポスター {#step-81-conference-poster}

多くの会議にはポスターセッションがあります。ポスター設計の原則は次のとおりです。

| 要素 | 指針 |
|---------|-----------|
| **大きさ** | 投稿先の規定を確認（多くは 24"x36" か A0 の縦 / 横） |
| **内容** | タイトル、著者、一文の貢献、手法の図、主要な結果 2〜3 点、結論 |
| **流れ** | 左上から右下へ（Z 字）、あるいは段組み |
| **文字** | タイトルは 3m、本文は 1m から読める大きさに。段落は書かず、箇条書きだけにする |
| **図** | 論文の図をより高い解像度で再利用する。主要な結果は大きく |

**道具**: LaTeX（`beamerposter` パッケージ）、PowerPoint / Keynote、Figma、Canva。

**印刷**: 会議の 2 週間以上前に発注します。布製ポスターは持ち運びが軽くて済みます。最近は仮想 / デジタルのポスターに対応する会議も増えています。

### Step 8.2: 口頭発表 / スポットライト {#step-82-conference-talk-spotlight}

口頭発表やスポットライトに選ばれた場合は次のとおりです。

| 発表の種類 | 時間 | 内容 |
|-----------|----------|---------|
| **スポットライト** | 5 分 | 問題、手法、主要な結果ひとつ。きっかり 5 分になるまで練習する |
| **口頭発表** | 15〜20 分 | 全体の物語。問題、手法、主要な結果、アブレーション、限界 |
| **ワークショップ発表** | 10〜15 分 | 聴衆に合わせて調整する。前提の説明を厚くする必要があるかもしれない |

**スライド設計の規則:**
- 1 枚に 1 つの考え
- 文字は最小限に。細部は話して伝え、映さない
- 主要な図は段階的に動かして理解を積み上げる
- 最後に「持ち帰り」のスライド（一文の貢献）を置く
- 想定される質問に備えて予備のスライドを用意する

### Step 8.3: ブログ記事 / SNS {#step-83-blog-post-social-media}

分かりやすい要約は、届く範囲を大きく広げます。

- **Twitter / X のスレッド**: 5〜8 投稿。手法ではなく結果から始めます。Figure 1 と主要な結果の図を入れます。
- **ブログ記事**: 800〜1500 語。査読者ではなく ML の実務者に向けて書きます。形式的な議論は省き、直感と実務上の意味を前に出します。
- **プロジェクトページ**: abstract、図、デモ、コードへのリンク、BibTeX を載せた HTML ページ。GitHub Pages を使います。

**時期**: 論文が予稿集か arXiv のカメラレディに現れてから 1〜2 日以内に出します。

---

## ワークショップ論文とショートペーパー {#workshop-short-papers}

ワークショップ論文やショートペーパー（ACL のショートペーパー、Findings など）も同じパイプラインをたどりますが、制約と期待されるものが違います。

### ワークショップ論文 {#workshop-papers}

| 性質 | ワークショップ | 本会議 |
|----------|----------|-----------------|
| **ページ数** | 4〜6 ページ（多くの場合） | 7〜9 ページ |
| **査読の基準** | 完成度の要求はゆるい | 完結していて、隅々まで詰まっていること |
| **査読の形** | 単盲検か、軽めの査読が多い | 二重盲検、厳密 |
| **重んじられるもの** | 面白い着想、途中経過、主張の提示 | 強いベースラインを伴う、完結した実験の物語 |
| **arXiv** | いつでも公開できる | 時期が問題になる（arXiv の戦略を参照） |
| **貢献の水準** | 新しい方向、興味深い否定的結果、進行中の研究 | 強い証拠を伴う、大きな前進 |

**ワークショップを狙う場面:**
- 本格的な論文にする前に反応がほしい、初期段階の着想
- 8 ページ以上を割くほどではない否定的結果
- 時宜を得た話題への主張や意見
- 追試や再現性の報告

### ACL のショートペーパーと Findings {#acl-short-papers-findings}

ACL 系の投稿先には、はっきり分かれた投稿区分があります。

| 区分 | ページ数 | 求められるもの |
|------|-------|-----------------|
| **ロングペーパー** | 8 | 完結した研究、強いベースライン、アブレーション |
| **ショートペーパー** | 4 | 的を絞った貢献。ひとつの明快な論点と、その証拠 |
| **Findings** | 8 | 本会議にわずかに届かなかった、しっかりした研究 |

**ショートペーパーの戦い方**: 主張をひとつだけ選び、それを徹底的に支えます。ロングペーパーを 4 ページに圧縮しようとせず、もっと的を絞った別の論文として書いてください。

---

## 実験系 ML 以外の論文タイプ {#paper-types-beyond-empirical-ml}

ここまでのパイプラインは実験系の ML 論文を想定しています。ほかの種類の論文は、構成も求められる証拠も違います。種類ごとの詳しい案内は [references/paper-types.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/research\research-paper-writing/references/paper-types.md) にあります。

### 理論論文 {#theory-papers}

**構成**: Introduction → Preliminaries（定義と記法）→ Main Results（定理）→ Proof Sketches → Discussion → Full Proofs（付録）

**実験系論文との違い:**
- 貢献は定理、限界、不可能性の結果であって、実験の数値ではありません
- Methods の節は「Preliminaries」と「Main Results」に置き換わります
- 証拠は証明であって実験ではありません（ただし理論を実験で裏づけると歓迎されます）
- 本文に証明の概略、付録に完全な証明、という形が標準です
- 実験の節は任意ですが、理論の予測を裏づけるなら論文は強くなります

**証明を書くときの原則:**
- 定理は、仮定をすべて明示したうえで形式的に述べます
- 形式的な証明の前に直感を与えます（「鍵になる着想は……」）
- 証明の概略は、主要な考えを 0.5〜1 ページで伝えます
- `\begin{proof}...\end{proof}` 環境を使います
- 仮定に番号を振り、定理から参照します。「Assumptions 1-3 のもとで……」

### サーベイ / チュートリアル論文 {#survey-tutorial-papers}

**構成**: Introduction → Taxonomy / Organization → Detailed Coverage → Open Problems → Conclusion

**違い:**
- 貢献は整理・統合と、未解決問題の提示であって、新しい手法ではありません
- 扱う範囲の中では網羅的でなければなりません（査読者は抜けている文献を探します）
- 明快な分類体系か、整理の枠組みが要ります
- 価値は、個々の論文では結ばれない、研究どうしのつながりから生まれます
- 主な投稿先: TMLR（survey トラック）、JMLR、Foundations and Trends in ML、ACM Computing Surveys

### ベンチマーク論文 {#benchmark-papers}

**構成**: Introduction → Task Definition → Dataset Construction → Baseline Evaluation → Analysis → Intended Use & Limitations

**違い:**
- 貢献はベンチマークそのものです。評価の空白を実際に埋めるものでなければなりません
- データセットの文書化は任意ではなく必須です（Datasheets、Step 5.11 を参照）
- そのベンチマークが難しいことを示す必要があります（ベースラインが天井に届かないこと）
- 主張どおりのものを測っていることを示す必要があります（構成概念妥当性）
- 主な投稿先: NeurIPS Datasets & Benchmarks トラック、ACL（resource paper）、LREC-COLING

### ポジションペーパー {#position-papers}

**構成**: Introduction → Background → Thesis / Argument → Supporting Evidence → Counterarguments → Implications

**違い:**
- 貢献は結果ではなく主張です
- 反論に真正面から向き合う必要があります
- 証拠は実証的でも、理論的でも、論理的な分析でも構いません
- 主な投稿先: ICML（position トラック）、ワークショップ、TMLR

---

## Hermes Agent との組み合わせ {#hermes-agent-integration}

この skill は Hermes エージェント向けに作られています。研究の全工程で、Hermes のツール、委任、スケジュール、記憶を使います。

### 関連 skill {#related-skills}

工程ごとに、ほかの Hermes skill と組み合わせて使います。

| skill | 使う場面 | 読み込み方 |
|-------|-------------|-------------|
| **arxiv** | Phase 1（先行研究の調査）: arXiv 検索、BibTeX 生成、Semantic Scholar で関連論文を探す | `skill_view("arxiv")` |
| **subagent-driven-development** | Phase 5（執筆）: 節ごとの並列執筆と、2 段階のレビュー（仕様への適合、次に質） | `skill_view("subagent-driven-development")` |
| **plan** | Phase 0（立ち上げ）: 実行前に構造のある計画を作る。`.hermes/plans/` に書き出す | `skill_view("plan")` |
| **qmd** | Phase 1（先行研究）: 手元の知識（メモ、書き起こし、文書）を BM25 とベクトルのハイブリッド検索で探す | 導入: `skill_manage("install", "qmd")` |
| **diagramming** | Phase 4〜5: Excalidraw を使った図やアーキテクチャ図を作る | `skill_view("diagramming")` |
| **data-science** | Phase 4（分析）: Jupyter の生きたカーネルで対話的に分析・可視化する | `skill_view("data-science")` |

**この skill は `ml-paper-writing` を置き換えます** — ml-paper-writing の内容をすべて含み、さらに実験・分析のパイプライン全体と autoreason の方法論を備えています。

### Hermes のツール一覧 {#hermes-tools-reference}

| ツール | このパイプラインでの使い道 |
|------|----------------------|
| **`terminal`** | LaTeX の組版（`latexmk -pdf`）、git 操作、実験の起動（`nohup python run.py &`）、プロセスの確認 |
| **`process`** | 裏で走る実験の管理: `process("start", ...)`、`process("poll", pid)`、`process("log", pid)`、`process("kill", pid)` |
| **`execute_code`** | 引用の検証、統計分析、データ集約のための Python 実行。RPC 経由でツールも使えます |
| **`read_file`** / **`write_file`** / **`patch`** | 論文の編集、実験スクリプト、結果ファイル。大きな .tex への部分的な編集には `patch` を使います |
| **`web_search`** | 文献の発見: `web_search("transformer attention mechanism 2024")` |
| **`web_extract`** | 論文の本文取得、引用の検証: `web_extract("https://arxiv.org/abs/2303.17651")` |
| **`delegate_task`** | **節ごとの並列執筆** — 節ごとに独立した下位エージェントを立てます。引用検証の並列実行にも使えます |
| **`todo`** | セッションをまたぐ主要な状態管理。工程が変わるたびに更新します |
| **`memory`** | セッションをまたいで残す判断: 貢献の枠づけ、投稿先の選択、査読への対応 |
| **`cronjob`** | 実験の監視、締め切りまでの日数、arXiv の自動確認をスケジュールします |
| **`clarify`** | 行き詰まったときに、的を絞った質問を利用者にします（投稿先の選択、貢献の枠づけ） |
| **cron の `deliver:`** | 実験が終わったときやドラフトができたときに、利用者がチャットにいなくても知らせます。確認を cron ジョブとして仕掛け、メッセージ配送先を `deliver:` で指定してください（エージェントに `send_message` ツールはもうありません。外向きの配送は cron と `hermes send` が担います） |

### ツールの使い方の型 {#tool-usage-patterns}

**実験の監視**（いちばんよく使います）:
```
terminal("ps aux | grep <pattern>")
→ terminal("tail -30 <logfile>")
→ terminal("ls results/")
→ execute_code("analyze results JSON, compute metrics")
→ terminal("git add -A && git commit -m '<descriptive message>' && git push")
→ (final response auto-delivers "Experiment complete: <summary>"; for unattended runs, schedule via cron with a deliver: target)
```

**節ごとの並列執筆**（委任を使います）:
```
delegate_task("Draft the Methods section based on these experiment scripts and configs. 
  Include: pseudocode, all hyperparameters, architectural details sufficient for 
  reproduction. Write in LaTeX using the neurips2025 template conventions.")

delegate_task("Draft the Related Work section. Use web_search and web_extract to 
  find papers. Verify every citation via Semantic Scholar. Group by methodology.")

delegate_task("Draft the Experiments section. Read all result files in results/. 
  State which claim each experiment supports. Include error bars and significance.")
```

委任されたものはそれぞれ、文脈を共有しない **新しい下位エージェント** として動きます。必要な情報はすべてプロンプトに書いてください。出力を集めて統合します。

**引用の検証**（execute_code を使います）:
```python
# In execute_code:
from semanticscholar import SemanticScholar

sch = SemanticScholar()
results = sch.search_paper("attention mechanism transformers", limit=5)
for paper in results:
    doi = paper.externalIds.get('DOI', 'N/A')
    if doi != 'N/A':
        bibtex = requests.get(f"https://doi.org/{doi}", 
                              headers={"Accept": "application/x-bibtex"}).text
        print(bibtex)
```

### `memory` と `todo` による状態管理 {#state-management-with-memory-and-todo}

**`memory` ツール** — 重要な判断を残します（上限あり。MEMORY.md はおよそ 2200 文字）:

```
memory("add", "Paper: autoreason. Venue: NeurIPS 2025 (9 pages). 
  Contribution: structured refinement works when generation-evaluation gap is wide.
  Key results: Haiku 42/42, Sonnet 3/5, S4.6 constrained 2/3.
  Status: Phase 5 — drafting Methods section.")
```

大きな判断や工程の切り替わりのあとに更新します。これはセッションをまたいで残ります。

**`todo` ツール** — 細かな進み具合を追います:

```
todo("add", "Design constrained task experiments for Sonnet 4.6")
todo("add", "Run Haiku baseline comparison")
todo("add", "Draft Methods section")
todo("update", id=3, status="in_progress")
todo("update", id=1, status="completed")
```

**セッション開始時の手順:**
```
1. todo("list")                           # Check current task list
2. memory("read")                         # Recall key decisions
3. terminal("git log --oneline -10")      # Check recent commits
4. terminal("ps aux | grep python")       # Check running experiments
5. terminal("ls results/ | tail -20")     # Check for new results
6. Report status to user, ask for direction
```

現在のタスク一覧を見て、重要な判断を思い出し、直近のコミット、走っている実験、新しい結果を確かめてから、状況を報告して方針を尋ねます。

### `cronjob` による監視 {#cron-monitoring-with-cronjob}

`cronjob` ツールで、実験の定期確認をスケジュールします。

```
cronjob("create", {
  "schedule": "*/30 * * * *",  # Every 30 minutes
  "prompt": "Check experiment status:
    1. ps aux | grep run_experiment
    2. tail -30 logs/experiment_haiku.log
    3. ls results/haiku_baselines/
    4. If complete: read results, compute Borda scores, 
       git add -A && git commit -m 'Add Haiku results' && git push
    5. Report: table of results, key finding, next step
    6. If nothing changed: respond with [SILENT]"
})
```

**[SILENT] の約束ごと**: 前回の確認から何も変わっていなければ、ちょうど `[SILENT]` とだけ返します。これで通知が止まります。報告するのは、知る価値のある変化が実際にあったときだけです。

**締め切りの管理**:
```
cronjob("create", {
  "schedule": "0 9 * * *",  # Daily at 9am
  "prompt": "NeurIPS 2025 deadline: May 22. Today is {date}. 
    Days remaining: {compute}. 
    Check todo list — are we on track? 
    If <7 days: warn user about remaining tasks."
})
```

### 知らせ方の型 {#communication-patterns}

**利用者に知らせる場面**（直接の応答や最終応答で。無人で走らせるときは cron の `deliver:` 先で）:
- 実験のひとまとまりが終わった（結果の表を添えて）
- 判断が必要な、予想外の発見や失敗があった
- 節のドラフトができて確認してほしい
- 締め切りが近いのに、まだ終わっていない作業がある

**知らせない場面:**
- 実験が走っているだけで、新しい結果がない → `[SILENT]`
- 変化のない定期確認 → `[SILENT]`
- 注意を向ける必要のない途中経過

**報告の形** — 必ず構造のあるデータを添えます:
```
## Experiment: <name>
Status: Complete / Running / Failed

| Task | Method A | Method B | Method C |
|------|---------|---------|---------|
| Task 1 | 85.2 | 82.1 | **89.4** |

Key finding: <one sentence>
Next step: <what happens next>
```

### 人の判断が要る分かれ道 {#decision-points-requiring-human-input}

本当に行き詰まったときは、`clarify` で的を絞って尋ねます。

| 判断 | 尋ねる時機 |
|----------|-------------|
| 投稿先 | 論文を書き始める前（ページ数と枠づけに影響します） |
| 貢献の枠づけ | 妥当な枠づけが複数あるとき |
| 実験の優先順位 | TODO の実験が、使える時間に収まらないとき |
| 投稿してよいか | 最終投稿の前 |

**尋ねてはいけないこと**（自分で決めて、そう決めたと添えてください）:
- 言葉づかい、節の順序
- どの結果を前に出すか
- 引用が足りているか（見つけた範囲で書き、抜けを記録します）

---

## 査読者の評価基準 {#reviewer-evaluation-criteria}

査読者が何を見ているかが分かると、力の入れどころが定まります。

| 基準 | 見られること |
|-----------|----------------|
| **質** | 技術的な健全さ、裏づけのある主張、公正で強いベースライン |
| **明快さ** | 分かりやすい文章、専門家なら再現できること、記法の一貫性 |
| **重要性** | コミュニティへの影響、理解を進めるか |
| **独自性** | 新しい洞察（新しい手法である必要はありません） |

**点数（NeurIPS の 6 段階）:**
- 6: Strong Accept — 画期的で、欠点がない
- 5: Accept — 技術的に堅実で、影響が大きい
- 4: Borderline Accept — 堅実だが、評価が限定的
- 3: Borderline Reject — 弱点のほうが上回る
- 2: Reject — 技術的な欠陥がある
- 1: Strong Reject — 既知の結果、あるいは倫理上の問題

詳しい指針、よくある懸念、反論の進め方は [references/reviewer-guidelines.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/research\research-paper-writing/references/reviewer-guidelines.md) にあります。

---

## よくある問題と対処 {#common-issues-and-solutions}

| 問題 | 対処 |
|-------|----------|
| Abstract が漠然としている | どの ML 論文の頭にも置けるような一文なら削ります。自分の具体的な貢献から始めます |
| Introduction が 1.5 ページを超える | 背景を Related Work に分けます。貢献の箇条書きを前に出します |
| 実験に対応する主張が書かれていない | 各実験の前に「この実験は [具体的な主張] を検証する」と足します |
| 査読者に読みにくいと言われる | 道しるべを増やし、用語を統一し、図のキャプションだけで意味が通るようにします |
| 統計的有意性がない | 誤差棒、実行回数、統計的検定、信頼区間を足します |
| 実験が広がりすぎている | すべての実験を特定の主張に対応させます。対応しないものは削ります |
| 不採択で、再投稿が必要 | Phase 7 の「別の会議への再投稿」を参照。査読に言及せずに懸念へ対処します |
| broader impact の節がない | Step 5.10 を参照。ほとんどの投稿先で必要です。「悪影響はありません」はまず通りません |
| 人手評価が弱いと批判された | Step 2.5 と [references/human-evaluation.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/research\research-paper-writing/references/human-evaluation.md) を参照。一致度の指標、アノテーターの情報、報酬を報告します |
| 再現性を問われた | コードを公開し（Step 7.9）、すべてのハイパーパラメータ、乱数シード、計算資源の詳細を書きます |
| 理論論文に直感が欠けている | 形式的な証明の前に、平易な言葉の説明を伴う証明の概略を足します。[references/paper-types.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/research\research-paper-writing/references/paper-types.md) を参照 |
| 結果が否定的 / 帰無だった | Phase 4.3 の否定的結果の扱いを参照。ワークショップ、TMLR、あるいは分析としての枠づけ直しを検討します |

---

## 参考資料 {#reference-documents}

| 資料 | 内容 |
|----------|----------|
| [references/writing-guide.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/research\research-paper-writing/references/writing-guide.md) | Gopen & Swan の 7 原則、Perez の細かなコツ、Lipton の語選び、Steinhardt の精密さ、図の設計 |
| [references/citation-workflow.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/research\research-paper-writing/references/citation-workflow.md) | 引用まわりの API、Python のコード、CitationManager クラス、BibTeX の管理 |
| [references/checklists.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/research\research-paper-writing/references/checklists.md) | NeurIPS の 16 項目、ICML、ICLR、ACL の要件、投稿前の共通チェックリスト |
| [references/reviewer-guidelines.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/research\research-paper-writing/references/reviewer-guidelines.md) | 評価基準、点数、よくある懸念、反論のひな形 |
| [references/sources.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/research\research-paper-writing/references/sources.md) | 執筆ガイド、会議の規定、API の完全な文献一覧 |
| [references/experiment-patterns.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/research\research-paper-writing/references/experiment-patterns.md) | 実験設計のパターン、評価手順、監視、エラーからの復帰 |
| [references/autoreason-methodology.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/research\research-paper-writing/references/autoreason-methodology.md) | Autoreason のループ、戦略の選び方、モデル選び、プロンプト、スコープ制約、Borda 集計 |
| [references/human-evaluation.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/research\research-paper-writing/references/human-evaluation.md) | 人手評価の設計、アノテーション手引き、一致度の指標、クラウドソーシングの品質管理、倫理審査の案内 |
| [references/paper-types.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/research\research-paper-writing/references/paper-types.md) | 理論論文（証明の書き方、定理の構成）、サーベイ論文、ベンチマーク論文、ポジションペーパー |

### LaTeX のテンプレート {#latex-templates}

`templates/` に、**NeurIPS 2025**、**ICML 2026**、**ICLR 2026**、**ACL**、**AAAI 2026**、**COLM 2025** 向けのテンプレートがあります。

組版の手順は [templates/README.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/research\research-paper-writing/templates/README.md) にあります。

### 主な外部出典 {#key-external-sources}

**執筆の考え方:**
- [Neel Nanda: How to Write ML Papers](https://www.alignmentforum.org/posts/eJGptPbbFPZGLpjsp/highly-opinionated-advice-on-how-to-write-ml-papers)
- [Sebastian Farquhar: How to Write ML Papers](https://sebastianfarquhar.com/on-research/2024/11/04/how_to_write_ml_papers/)
- [Gopen & Swan: Science of Scientific Writing](https://cseweb.ucsd.edu/~swanson/papers/science-of-writing.pdf)
- [Lipton: Heuristics for Scientific Writing](https://www.approximatelycorrect.com/2018/01/29/heuristics-technical-scientific-writing-machine-learning-perspective/)
- [Perez: Easy Paper Writing Tips](https://ethanperez.net/easy-paper-writing-tips/)

**API:** [Semantic Scholar](https://api.semanticscholar.org/api-docs/) | [CrossRef](https://www.crossref.org/documentation/retrieve-metadata/rest-api/) | [arXiv](https://info.arxiv.org/help/api/basics.html)

**投稿先:** [NeurIPS](https://neurips.cc/Conferences/2025/PaperInformation/StyleFiles) | [ICML](https://icml.cc/Conferences/2025/AuthorInstructions) | [ICLR](https://iclr.cc/Conferences/2026/AuthorGuide) | [ACL](https://github.com/acl-org/acl-style-files)
