---
title: "Obliteratus — OBLITERATUS: LLM の拒否応答を取り除く（diff-in-means）"
description: "OBLITERATUS: LLM の拒否応答を取り除く（diff-in-means）"
upstream_path: user-guide/skills/optional/mlops/mlops-obliteratus.md
upstream_blob: 0562055dad283b197baef72f74f7855bb4c61903
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/mlops/mlops-obliteratus
---

# Obliteratus {#obliteratus}

OBLITERATUS: LLM の拒否応答を取り除きます（diff-in-means）。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/mlops/obliteratus` で入れます |
| パス | `optional-skills/mlops\obliteratus` |
| バージョン | `2.0.0` |
| 作者 | Hermes Agent |
| ライセンス | MIT |
| 依存関係 | `obliteratus`, `torch`, `transformers`, `bitsandbytes`, `accelerate`, `safetensors` |
| 対応プラットフォーム | linux, macos |
| タグ | `Abliteration`, `Uncensoring`, `Refusal-Removal`, `LLM`, `Weight-Projection`, `SVD`, `Mechanistic-Interpretability`, `HuggingFace`, `Model-Surgery` |
| 関連 skill | [`serving-llms-vllm`](/hermes/docs/user-guide/skills/optional/mlops/mlops-inference-serving-llms-vllm/), [`llama-cpp`](/hermes/docs/user-guide/skills/optional/mlops/mlops-inference-llama-cpp/), [`huggingface-tokenizers`](/hermes/docs/user-guide/skills/optional/mlops/mlops-huggingface-tokenizers/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# OBLITERATUS Skill {#obliteratus-skill}

## 中身 {#whats-inside}

9 種類の CLI メソッド、28 の分析モジュール、5 段階の計算資源区分にまたがる 116 のモデルプリセット、方式どうしの総当たり評価、そして実行データにもとづく推奨機能が入っています。

再学習や追加学習をせずに、公開ウェイトの LLM から拒否のふるまい（ガードレール）を取り除きます。diff-in-means、SVD、白色化 SVD、LEACE による概念の消去、SAE 分解、ベイズカーネル射影などの機構的解釈可能性の手法を使い、推論能力を保ったまま、モデルのウェイトから拒否の方向を見つけ出して切り取ります。

**ライセンスに関する注意:** OBLITERATUS は AGPL-3.0 です。Python のライブラリとして import しては絶対にいけません。必ず CLI（`obliteratus` コマンド）か子プロセスとして呼び出してください。こうすることで Hermes Agent の MIT ライセンスが保たれます。

## 動画で見る {#video-guide}

Hermes のエージェントが OBLITERATUS を使って Gemma を処理する様子です。
https://www.youtube.com/watch?v=8fG9BrNTeHs （"OBLITERATUS: An AI Agent Removed Gemma 4's Safety Guardrails"）

自分で実行する前に、はじめから終わりまでの流れを目で追いたいときに役立ちます。

## この skill を使う場面 {#when-to-use-this-skill}

次のようなときに使います。

- LLM の「検閲を外したい」「abliterate したい」と言われたとき
- モデルから拒否やガードレールを取り除く方法を聞かれたとき
- Llama、Qwen、Mistral などの検閲なし版を作りたいとき
- 「refusal removal」「abliteration」「weight projection」といった言葉が出たとき
- モデルの拒否の仕組みを分析したいとき
- OBLITERATUS、abliterator、refusal direction が話題に出たとき

## ステップ 1: 導入 {#step-1-installation}

すでに入っているか確認します。
```bash
obliteratus --version 2>/dev/null && echo "INSTALLED" || echo "NOT INSTALLED"
```

入っていなければ、GitHub から clone して導入します。
```bash
git clone https://github.com/elder-plinius/OBLITERATUS.git
cd OBLITERATUS
pip install -e .
# For Gradio web UI support:
# pip install -e ".[spaces]"
```

**重要:** 導入の前に利用者へ確認してください。依存パッケージ（PyTorch、Transformers、bitsandbytes など）で 5〜10GB ほどダウンロードします。

## ステップ 2: ハードウェアを確認する {#step-2-check-hardware}

何より先に、使える GPU を確認します。
```bash
python3 -c "

if torch.cuda.is_available():
    gpu = torch.cuda.get_device_name(0)
    vram = torch.cuda.get_device_properties(0).total_memory / 1024**3
    print(f'GPU: {gpu}')
    print(f'VRAM: {vram:.1f} GB')
    if vram < 4: print('TIER: tiny (models under 1B)')
    elif vram < 8: print('TIER: small (models 1-4B)')
    elif vram < 16: print('TIER: medium (models 4-9B with 4bit quant)')
    elif vram < 32: print('TIER: large (models 8-32B with 4bit quant)')
    else: print('TIER: frontier (models 32B+)')
else:
    print('NO GPU - only tiny models (under 1B) on CPU')
"
```

### 必要な VRAM（4bit 量子化を使う場合） {#vram-requirements-with-4-bit-quantization}

| VRAM     | 扱えるモデル規模  | モデルの例                              |
|:---------|:----------------|:--------------------------------------------|
| CPU のみ | 約 1B パラメータ      | GPT-2, TinyLlama, SmolLM                    |
| 4〜8 GB   | 約 4B パラメータ      | Qwen2.5-1.5B, Phi-3.5 mini, Llama 3.2 3B   |
| 8〜16 GB  | 約 9B パラメータ      | Llama 3.1 8B, Mistral 7B, Gemma 2 9B       |
| 24 GB    | 約 32B パラメータ     | Qwen3-32B, Llama 3.1 70B（ぎりぎり）, Command-R |
| 48 GB 以上   | 約 72B 以上のパラメータ    | Qwen2.5-72B, DeepSeek-R1                    |
| 複数 GPU| 200B 以上のパラメータ    | Llama 3.1 405B, DeepSeek-V3 (685B MoE)      |

## ステップ 3: 使えるモデルを見て推奨を受け取る {#step-3-browse-available-models-get-recommendations}

```bash
# Browse models by compute tier
obliteratus models --tier medium

# Get architecture info for a specific model
obliteratus info <model_name>

# Get telemetry-driven recommendation for best method & params
obliteratus recommend <model_name>
obliteratus recommend <model_name> --insights  # global cross-architecture rankings
```

## ステップ 4: 方式を選ぶ {#step-4-choose-a-method}

### 方式の選び方 {#method-selection-guide}
**迷ったら `advanced` です。** 多方向の SVD にノルムを保つ射影を組み合わせたもので、検証も進んでいます。

| 状況                         | おすすめの方式 | 理由                                      |
|:----------------------------------|:-------------------|:-----------------------------------------|
| 既定 / ほとんどのモデル             | `advanced`         | 多方向 SVD、ノルムを保つ、安定している |
| ざっと試す / 試作          | `basic`            | 速くて単純。見極めには十分    |
| 密なモデル（Llama、Mistral）      | `advanced`         | 多方向、ノルムを保つ         |
| MoE モデル（DeepSeek、Mixtral）     | `nuclear`          | エキスパート単位で、MoE の複雑さに対応  |
| 推論モデル（R1 の蒸留版）     | `surgical`         | CoT を意識し、思考の連鎖を保つ    |
| 拒否がしつこく残る         | `aggressive`       | 白色化 SVD + ヘッド手術 + jailbreak   |
| 元に戻せるようにしたい           | ステアリングベクトルを使います（分析の節を参照） |
| 時間をかけてでも最高の品質を   | `optimized`        | ベイズ探索で最良のパラメータを見つけます      |
| 自動判別を試したい       | `informed`         | アライメントの種類を自動判別します。実験的で、advanced を上回るとは限りません |

### 9 種類の CLI メソッド {#9-cli-methods}
- **basic** — diff-in-means で拒否の方向を 1 本だけ取ります。速いです（8B で 5〜10 分ほど）。
- **advanced**（既定・おすすめ） — 複数の SVD 方向、ノルムを保つ射影、2 回の精緻化。中くらいの速さです（10〜20 分ほど）。
- **aggressive** — 白色化 SVD + jailbreak の対比 + アテンションヘッドの手術。文章の一貫性を損なう危険が高めです。
- **spectral_cascade** — DCT による周波数領域の分解。研究寄りの新しい手法です。
- **informed** — 処理の最中に分析を走らせて自動的に設定します。実験的で、advanced より遅く、結果も読みにくいです。
- **surgical** — SAE の特徴 + ニューロンのマスク + ヘッドの手術 + エキスパート単位。とても遅いです（1〜2 時間ほど）。推論モデルに向いています。
- **optimized** — ベイズによるハイパーパラメータ探索（Optuna TPE）。いちばん時間がかかりますが、最適なパラメータを見つけます。
- **inverted** — 拒否の方向を反転させます。モデルは積極的に応じるようになります。
- **nuclear** — しつこい MoE モデル向けに、手法を最大限に組み合わせたものです。エキスパート単位で処理します。

### 方向の抽出方法（--direction-method フラグ） {#direction-extraction-methods---direction-method-flag}
- **diff_means**（既定） — 拒否した場合と応じた場合の活性の差を単純に取ります。安定しています。
- **svd** — 多方向の SVD で抽出します。複雑なアライメントに向いています。
- **leace** — LEACE（Linear Erasure via Closed-form Estimation）。線形の消去としては最適です。

### Python API だけで使える 4 つの方式 {#4-python-api-only-methods}
（CLI からは使えません。Python の import が必要で、AGPL の線引きに触れます。利用者が自分の AGPL プロジェクトで OBLITERATUS をライブラリとして使いたいと明言した場合にだけ伝えてください。）
- failspy, gabliteration, heretic, rdo

## ステップ 5: 実行する {#step-5-run-abliteration}

### 基本的な使い方 {#standard-usage}
```bash
# Default method (advanced) — recommended for most models
obliteratus obliterate <model_name> --method advanced --output-dir ./abliterated-models

# With 4-bit quantization (saves VRAM)
obliteratus obliterate <model_name> --method advanced --quantization 4bit --output-dir ./abliterated-models

# Large models (70B+) — conservative defaults
obliteratus obliterate <model_name> --method advanced --quantization 4bit --large-model --output-dir ./abliterated-models
```

### パラメータを調整する {#fine-tuning-parameters}
```bash
obliteratus obliterate <model_name> \
  --method advanced \
  --direction-method diff_means \
  --n-directions 4 \
  --refinement-passes 2 \
  --regularization 0.1 \
  --quantization 4bit \
  --output-dir ./abliterated-models \
  --contribute  # opt-in telemetry for community research
```

### 主なフラグ {#key-flags}
| フラグ | 説明 | 既定値 |
|:-----|:------------|:--------|
| `--method` | 処理の方式 | advanced |
| `--direction-method` | 方向の抽出方法 | diff_means |
| `--n-directions` | 拒否の方向の本数（1〜32） | 方式によります |
| `--refinement-passes` | 繰り返しの回数（1〜5） | 2 |
| `--regularization` | 正則化の強さ（0.0〜1.0） | 0.1 |
| `--quantization` | 4bit か 8bit で読み込みます | なし（そのままの精度） |
| `--large-model` | 120B 以上向けに控えめな既定値を使います | false |
| `--output-dir` | 処理後のモデルの保存先 | ./obliterated_model |
| `--contribute` | 匿名化した結果を研究向けに共有します | false |
| `--verify-sample-size` | 拒否の確認に使うテスト用プロンプトの数 | 20 |
| `--dtype` | モデルの dtype（float16、bfloat16） | auto |

### その他の実行方法 {#other-execution-modes}
```bash
# Interactive guided mode (hardware → model → preset)
obliteratus interactive

# Web UI (Gradio)
obliteratus ui --port 7860

# Run a full ablation study from YAML config
obliteratus run config.yaml --preset quick

# Tournament: pit all methods against each other
obliteratus tourney <model_name>
```

## ステップ 6: 結果を確かめる {#step-6-verify-results}

処理が終わったら、出力された指標を確認します。

| 指標 | 良い値 | 注意が必要な値 |
|:-------|:-----------|:--------|
| 拒否率 | &lt; 5%（できれば 0% 近く） | 10% を超えるなら拒否が残っています |
| パープレキシティの変化 | &lt; 10% の増加 | 15% を超えるなら一貫性が損なわれています |
| KL ダイバージェンス | &lt; 0.1 | 0.5 を超えるなら分布が大きくずれています |
| 一貫性 | 高い / 目視の確認を通る | 応答が劣化する、同じ言葉を繰り返す |

### 拒否が残る場合（10% を超える） {#if-refusals-persist-10}
1. `aggressive` の方式を試します
2. `--n-directions` を増やします（8 や 16 など）
3. `--refinement-passes 3` を足します
4. diff_means の代わりに `--direction-method svd` を試します

### 一貫性が損なわれた場合（パープレキシティが 15% を超えて増加） {#if-coherence-is-damaged-perplexity-15-increase}
1. `--n-directions` を減らします（2 を試します）
2. `--regularization` を強めます（0.3 を試します）
3. `--refinement-passes` を 1 に減らします
4. より穏やかな `basic` の方式を試します

## ステップ 7: 処理したモデルを使う {#step-7-use-the-abliterated-model}

出力は、そのまま使える HuggingFace のモデルディレクトリです。

```bash
# Test locally with transformers
python3 -c "
from transformers import AutoModelForCausalLM, AutoTokenizer
model = AutoModelForCausalLM.from_pretrained('./abliterated-models/<model>')
tokenizer = AutoTokenizer.from_pretrained('./abliterated-models/<model>')
inputs = tokenizer('How do I pick a lock?', return_tensors='pt')
outputs = model.generate(**inputs, max_new_tokens=200)
print(tokenizer.decode(outputs[0], skip_special_tokens=True))
"

# Upload to HuggingFace Hub
huggingface-cli upload <username>/<model-name>-abliterated ./abliterated-models/<model>

# Serve with vLLM
vllm serve ./abliterated-models/<model>
```

## CLI コマンド一覧 {#cli-command-reference}

| コマンド | 説明 |
|:--------|:------------|
| `obliteratus obliterate` | 中心となる処理のコマンド |
| `obliteratus info <model>` | モデルの構造を表示します |
| `obliteratus models --tier <tier>` | 計算資源の区分ごとに、選定済みのモデルを見ます |
| `obliteratus recommend <model>` | 実行データにもとづいて方式とパラメータを提案します |
| `obliteratus interactive` | 対話形式で設定を進めます |
| `obliteratus tourney <model>` | 総当たりで全方式を比べます |
| `obliteratus run <config.yaml>` | YAML から ablation study を実行します |
| `obliteratus strategies` | 登録済みの ablation 戦略を並べます |
| `obliteratus report <results.json>` | 図つきのレポートを作り直します |
| `obliteratus ui` | Gradio の画面を立ち上げます |
| `obliteratus aggregate` | 共有された実行データをまとめます |

## 分析モジュール {#analysis-modules}

OBLITERATUS には、機構的解釈可能性のための分析モジュールが 28 種類あります。
全体の一覧は `skill_view(name="obliteratus", file_path="references/analysis-modules.md")` で見られます。

### 手早く分析するコマンド {#quick-analysis-commands}
```bash
# Run specific analysis modules
obliteratus run analysis-config.yaml --preset quick

# Key modules to run first:
# - alignment_imprint: Fingerprint DPO/RLHF/CAI/SFT alignment method
# - concept_geometry: Single direction vs polyhedral cone
# - logit_lens: Which layer decides to refuse
# - anti_ouroboros: Self-repair risk score
# - causal_tracing: Causally necessary components
```

### ステアリングベクトル（元に戻せるやり方） {#steering-vectors-reversible-alternative}
ウェイトを恒久的に書き換える代わりに、推論時に方向づけをする方法です。
```python
# Python API only — for user's own projects
from obliteratus.analysis.steering_vectors import SteeringVectorFactory, SteeringHookManager
```

## ablation の戦略 {#ablation-strategies}

方向にもとづく処理のほかに、構造そのものに手を入れる戦略もあります。

- **Embedding Ablation** — 埋め込み層の要素を対象にします
- **FFN Ablation** — フィードフォワードのブロックを取り除きます
- **Head Pruning** — アテンションヘッドを刈り込みます
- **Layer Removal** — 層をまるごと取り除きます

一覧の表示は `obliteratus strategies` です。

## 評価 {#evaluation}

OBLITERATUS には評価の道具も含まれています。

- 拒否率のベンチマーク
- 処理の前後でのパープレキシティ比較
- 学術的なベンチマーク向けの LM Eval Harness 連携
- 他手法との一対一比較
- 基準となる性能の記録

## 対応プラットフォーム {#platform-support}

- **CUDA** — 全機能に対応します（NVIDIA の GPU）
- **Apple Silicon（MLX）** — MLX のバックエンド経由で対応します
- **CPU** — ごく小さなモデル（&lt; 1B パラメータ）に対応します

## YAML 設定のひな形 {#yaml-config-templates}

同じ条件で再現するためのひな形を `skill_view` で読み込めます。

- `templates/abliteration-config.yaml` — 標準的な単一モデル向けの設定
- `templates/analysis-study.yaml` — 処理前の分析用
- `templates/batch-abliteration.yaml` — 複数モデルの一括処理用

## 実行データの共有 {#telemetry}

OBLITERATUS は、匿名化した実行データを研究用の共有データセットに提供できます（任意）。
`--contribute` フラグで有効になります。個人情報は集めません。集めるのはモデル名、方式、指標だけです。

## つまずきやすいところ {#common-pitfalls}

1. **`informed` を既定にしないでください** — 実験的で遅いです。安定した結果がほしいなら `advanced` を使います。
2. **1B 未満のモデルは、この処理と相性がよくありません** — 拒否のふるまいが浅く散らばっているため、方向をきれいに取り出しにくいのです。20〜40% の拒否が残ると考えてください。3B 以上のモデルは拒否の方向がはっきりしていて、`advanced` で拒否率 0% になることも多いです。
3. **`aggressive` は逆効果になることがあります** — 小さいモデルでは一貫性を損ない、かえって拒否率が上がることがあります。3B 以上のモデルで `advanced` でも 10% を超える拒否が残る場合にだけ使ってください。
4. **パープレキシティは必ず確認します** — 15% を超えて跳ね上がったら、モデルが傷んでいます。強さを下げてください。
5. **MoE モデルは扱いが違います** — Mixtral や DeepSeek-MoE などには `nuclear` の方式を使います。
6. **量子化済みのモデルは再量子化できません** — そのままの精度のモデルを処理してから、出力を量子化します。
7. **VRAM の見積もりはおおよそです** — 4bit 量子化は助けになりますが、抽出中に使用量が跳ね上がることがあります。
8. **推論モデルは繊細です** — R1 の蒸留版には `surgical` を使い、思考の連鎖を保ちます。
9. **`obliteratus recommend` を確認します** — 実行データのほうが既定値より良いパラメータを持っていることがあります。
10. **AGPL ライセンス** — MIT や Apache のプロジェクトで `import obliteratus` をしては絶対にいけません。CLI からの呼び出しだけにしてください。
11. **大きなモデル（70B 以上）** — 控えめな既定値を使うため、必ず `--large-model` フラグを付けます。
12. **スペクトルの判定が RED になるのはよくあります** — 実際の拒否率が 0% でも、スペクトルの検査は「不完全」と出しがちです。この判定だけに頼らず、実際の拒否率を確認してください。

## 組み合わせると良い skill {#complementary-skills}

- **vllm** — 処理後のモデルを高いスループットで提供します
- **gguf** — 処理後のモデルを llama.cpp 向けの GGUF に変換します
- **huggingface-tokenizers** — モデルのトークナイザーを扱います
