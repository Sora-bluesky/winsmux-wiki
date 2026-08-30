---
title: "Darwinian Evolver — Imbue の進化ループでプロンプト・正規表現・SQL・コードを進化させる"
description: "Imbue の進化ループでプロンプト・正規表現・SQL・コードを進化させる"
upstream_path: user-guide/skills/optional/research/research-darwinian-evolver.md
upstream_blob: edaa29f447eac41329d812e190aaef7ce0f27408
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/research/research-darwinian-evolver
---

# Darwinian Evolver {#darwinian-evolver}

Imbue の進化ループで、プロンプト・正規表現・SQL・コードを進化させます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | オプション — `hermes skills install official/research/darwinian-evolver` で導入します |
| パス | `optional-skills/research\darwinian-evolver` |
| バージョン | `0.1.0` |
| 作者 | Bihruze (Asahi0x), Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos |
| タグ | `evolution`, `optimization`, `prompt-engineering`, `research` |
| 関連 skill | [`arxiv`](/hermes/docs/user-guide/skills/bundled/research/research-arxiv/), [`jupyter-notebook`](/hermes/docs/user-guide/skills/optional/data-science/data-science-jupyter-notebook/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこの内容を指示として見ています。
:::

# Darwinian Evolver {#darwinian-evolver}

Imbue の [darwinian_evolver](https://github.com/imbue-ai/darwinian_evolver)（LLM が
駆動する進化的探索のループ）を動かして、**プロンプト・正規表現・SQL クエリ・小さな
コード片**を評価関数に対して最適化します。

現状は上流ツールの薄いラッパーです。この skill は上流ツールを導入し、`Problem` の
定義（organism・evaluator・mutator）の書き方をエージェントに案内したうえで、上流の
CLI か小さな自作 Python ドライバでループを回します。

**ライセンス:** 上流ツールは **AGPL-3.0** です。この skill は上流の CLI か
`subprocess`/`uv run` 呼び出し経由でしか起動しません（単なる集約にとどめるため）。
次のことはしないでください

## 使いどころ {#when-to-use}

- 「このプロンプトを最適化して」「X 用の正規表現を進化させて」「このコード/SQL を
  自動で改善して」「もっと良い指示文を探して」と言われたとき。
- 採点する仕組み（完全一致・正規表現の合格率・単体テスト・LLM による判定・実行時の
  指標）と、出発点になる候補（organism）が両方あるとき。採点の仕組みがないなら、まず
  それを決めるところから始めてください。そこがいちばん難しい部分です。
- コストが許容できるとき。ひととおり回すと LLM 呼び出しは 50〜500 回ほどです。
  gpt-4o-mini なら数円程度、Claude Sonnet なら数ドルかかることもあります。

次の場合は使わ**ない**でください。

- 最適化の対象が微分可能なとき（勾配降下法や DSPy を使ってください）。
- 試したい候補が 2〜3 個しかないとき。手で書いたほうが早いです。
- 評価が完全に主観的で、測れる基準がないとき。

## 前提条件 {#prerequisites}

- Python 3.11 以上
- `git`、`uv`（または `pip`）
- `OPENROUTER_API_KEY`、`ANTHROPIC_API_KEY`、`OPENAI_API_KEY` のいずれか

この skill には小さな `parrot_openrouter.py` ドライバが付属しています。OpenAI SDK 経由で
`OPENROUTER_API_KEY` を使うので、OpenRouter にあるモデルならどれでも動きます。上流の
CLI 自体は Anthropic 決め打ちで、`ANTHROPIC_API_KEY` が必要です。

## 導入（初回のみ） {#install-one-time}

`terminal` ツールから実行します。

```bash
mkdir -p ~/.hermes/cache/darwinian-evolver && cd ~/.hermes/cache/darwinian-evolver
[ -d darwinian_evolver ] || git clone --depth 1 https://github.com/imbue-ai/darwinian_evolver.git
cd darwinian_evolver && uv sync
```

導入できたか、次のコマンドでヘルプが出るか確かめます。

```bash
cd ~/.hermes/cache/darwinian-evolver/darwinian_evolver \
  && uv run darwinian_evolver --help | head -5
```

## クイックスタート — 付属の parrot 例 {#quick-start-the-built-in-parrot-example}

ごく小さな動作確認です（`ANTHROPIC_API_KEY` が必要です）。

```bash
cd ~/.hermes/cache/darwinian-evolver/darwinian_evolver
uv run darwinian_evolver parrot \
  --num_iterations 2 \
  --num_parents_per_iteration 2 \
  --mutator_concurrency 2 --evaluator_concurrency 2 \
  --output_dir /tmp/parrot_demo
```

出力されるもの:
- `/tmp/parrot_demo/snapshots/iteration_N.pkl` — 反復ごとの集団を pickle にしたもの
- `/tmp/parrot_demo/<jsonl>` — 反復ごとの JSON ログ（パスは最後に表示されます）

`~/.hermes/cache/darwinian-evolver/darwinian_evolver/darwinian_evolver/lineage_visualizer.html`
をブラウザで開き、JSON ログを読み込ませると進化の系統樹が見られます。

## クイックスタート — OpenRouter ドライバ（Anthropic のキーなし） {#quick-start-openrouter-driver-no-anthropic-key}

この skill には `scripts/parrot_openrouter.py` が付属します。parrot と同じ問題ですが、
LLM 呼び出しが OpenRouter を通るので、どのプロバイダでも動きます。

```bash
# From wherever the skill is installed:
SKILL_DIR=~/.hermes/skills/research/darwinian-evolver
DE_DIR=~/.hermes/cache/darwinian-evolver/darwinian_evolver

cd "$DE_DIR" && \
  EVOLVER_MODEL='openai/gpt-4o-mini' \
  uv run --with openai python "$SKILL_DIR/scripts/parrot_openrouter.py" \
    --num_iterations 3 --num_parents_per_iteration 2 \
    --output_dir /tmp/parrot_or
```

結果は `scripts/show_snapshot.py` で確認します。

```bash
uv run --with openai python "$SKILL_DIR/scripts/show_snapshot.py" \
  /tmp/parrot_or/snapshots/iteration_3.pkl
```

期待される出力は、スコア順に並んだ 7 個の進化後プロンプトテンプレートです。上位は
0.6〜0.8 あたりに落ち着きます（出発点の `Say {{ phrase }}` は 0.000 でした）。

## 独自の Problem を定義する {#defining-a-custom-problem}

この skill には `templates/custom_problem_template.py` が付属します。コピーして書き換え、
実行してください。定義が必要なものは 3 つです。

1. **`Organism`** — 進化させる対象を保持する Pydantic の `BaseModel` サブクラスです
   （`prompt_template: str`、`regex_pattern: str`、`sql_query: str`、`code_block: str` など）。
   それを実際に動かす `run(*args)` メソッドを追加します。

2. **`Evaluator`** — `.evaluate(organism) -> EvaluationResult(score=..., trainable_failure_cases=[...], holdout_failure_cases=[...], is_viable=True)` です。
   - **`score`** は `[0, 1]` の範囲で、大きいほど良い評価です。
   - **`trainable_failure_cases`** — mutator が見る失敗例です。LLM が原因を診断できる
     だけの情報（入力・期待値・実際の値）を入れてください。
   - **`holdout_failure_cases`** — mutator には見せない失敗例です。過学習の検出に使います。
   - **`is_viable=True`** — organism が完全に壊れている場合（例外を出す、None を返すなど）
     を除いて真にします。スコアが 0 でも成立している organism なら問題ありません。
     親の選択で重みが下がるだけです。

3. **`Mutator`** — `.mutate(organism, failure_cases, learning_log_entries) -> list[Organism]` です。
   典型的には、現在の organism と失敗例、そして修正案を求める依頼を含む LLM プロンプトを
   組み立て、返ってきた内容を解析して新しい `Organism` を返します。解析に失敗したときは
   `[]` を返してください。あとはループ側が処理します。

そのうえで、`Problem(initial_organism, evaluator, [mutators])` を `EvolveProblemLoop` に
つなぎ、`loop.run(num_iterations=N)` を反復するドライバスクリプトを書きます。付属の
`scripts/parrot_openrouter.py` が参考になります。

## 実際に効くハイパーパラメータ {#hyperparameters-that-actually-matter}

| フラグ | 既定値 | 変えどき |
|---|---|---|
| `--num_iterations` | 5 | evaluator を信用できるようになったら 10〜20 へ上げる |
| `--num_parents_per_iteration` | 4 | 安く探索したいときは 2 へ下げる |
| `--mutator_concurrency` | 10 | レート制限を避けたいときは 2〜4 へ下げる |
| `--evaluator_concurrency` | 10 | 同上。evaluator も LLM を呼ぶ |
| `--batch_size` | 1 | mutator が複数の失敗を扱えるようになったら 3〜5 へ上げる |
| `--verify_mutations` | オフ | mutator が無駄打ちするようになったらオンにする（Imbue によれば以降の実行でコストが 10 分の 1 以下になる） |
| `--midpoint_score` | `p75` | スコアが固まってしまう場合以外はそのまま |
| `--sharpness` | 10 | そのまま |

## つまずきやすい点 {#pitfalls}

1. **`Initial organism must be viable`** — 出発点のスコアが 0 でも、`EvaluationResult` で
   `is_viable=True` にしてください。成立していない organism は進化の起点にならないため、
   ループが受け付けません。
2. **プロバイダのコンテンツフィルタで実行が止まります。** Azure 経由の OpenRouter
   モデルは "ignore previous instructions" のような表現を HTTP 400 で弾きます。LLM
   呼び出しを `try/except` で包み、`f"<LLM_ERROR: {e}>"` を返してください。その organism は
   スコア 0 になるだけで、進化は先へ進みます。
3. **`loop.run()` はジェネレータです。** 呼んだだけでは何も動かず、反復して初めて動きます。
   `for snap in loop.run(num_iterations=N):` の形で使ってください。
4. **スナップショットは pickle の入れ子です。** `iteration_N.pkl` の中身は辞書で、その
   `population_snapshot` がさらに pickle されたバイト列です。読み戻すには、pickle されたときと
   同じドット区切りのパスで `Organism` クラスを import できる状態にしておく必要があります。
5. **並列数の既定値は強気です。** 10/10 はたいていのプロバイダでレート制限に当たります。
   2/2 から始めてください。
6. **CLI は Anthropic 決め打ちです。** `uv run darwinian_evolver <problem>` は
   `ANTHROPIC_API_KEY` を探し、Claude Sonnet を使います。ほかのプロバイダを使うなら、
   `parrot_openrouter.py` のようなドライバを書いてください。
7. **AGPL です。** Hermes 本体の中で `from darwinian_evolver import ...` は絶対にしないでください。
   `~/.hermes/skills/...` 以下の自作ドライバスクリプトは利用者側のものなので問題ありません。
8. **PyPI にパッケージはありません。** `pip install darwinian-evolver` は別物を取ってきます。
   必ず GitHub のリポジトリから導入してください。

## 動作確認 {#verification}

導入して parrot を一度動かしたあと、次のコマンドが終了コード 0 で終われば十分です。

```bash
DE_DIR=~/.hermes/cache/darwinian-evolver/darwinian_evolver
ls "$DE_DIR/darwinian_evolver/lineage_visualizer.html" >/dev/null && \
cd "$DE_DIR" && uv run darwinian_evolver --help >/dev/null && \
echo "darwinian-evolver: OK"
```

## 参考資料 {#references}

- [Imbue の研究記事](https://imbue.com/research/2026-02-27-darwinian-evolver/)
- [ARC-AGI-2 の結果](https://imbue.com/research/2026-02-27-arc-agi-2-evolution/)
- [imbue-ai/darwinian_evolver](https://github.com/imbue-ai/darwinian_evolver)（AGPL-3.0）
- [Darwin Gödel Machines](https://arxiv.org/abs/2505.22954)
- [PromptBreeder](https://arxiv.org/abs/2309.16797)
