---
title: "Obliteratus — OBLITERATUS: LLM の拒否応答を取り除く（diff-in-means）"
description: "OBLITERATUS: LLM の拒否応答を取り除く（diff-in-means）"
upstream_path: user-guide/skills/optional/mlops/mlops-obliteratus.md
upstream_blob: 48cb3ce976fd0864bdc3c62a3becaa2ccd5ec6c7
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/mlops/mlops-obliteratus
---

# Obliteratus {#obliteratus}

OBLITERATUS は、LLM の拒否応答を取り除きます（diff-in-means）。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/mlops/obliteratus` で導入します |
| パス | `optional-skills/mlops/obliteratus` |
| バージョン | `2.0.0` |
| 作者 | Hermes Agent |
| ライセンス | MIT |
| 依存関係 | `obliteratus`, `torch`, `transformers`, `bitsandbytes`, `accelerate`, `safetensors` |
| 対応プラットフォーム | linux, macos |
| タグ | `Abliteration`, `Uncensoring`, `Refusal-Removal`, `LLM`, `Weight-Projection`, `SVD`, `Mechanistic-Interpretability`, `HuggingFace`, `Model-Surgery` |
| 関連 skill | [`serving-llms-vllm`](/hermes/docs/user-guide/skills/bundled/mlops/mlops-inference-serving-llms-vllm/)、[`llama-cpp`](/hermes/docs/user-guide/skills/bundled/mlops/mlops-inference-llama-cpp/)、[`huggingface-tokenizers`](/hermes/docs/user-guide/skills/optional/mlops/mlops-huggingface-tokenizers/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# OBLITERATUS skill {#obliteratus-skill}

## 入っているもの {#whats-inside}

CLI の手法が 9 種類、解析モジュールが 28 種類、5 段階の計算資源ごとに用意されたモデルのプリセットが 116 件、手法どうしを競わせる評価、そして利用データにもとづく推奨機能があります。

再学習やファインチューニングをせずに、オープンウェイトの LLM から拒否のふるまい（ガードレール）を取り除きます。diff-in-means、SVD、白色化 SVD、LEACE による概念の消去、SAE 分解、ベイズカーネル射影などの機構的解釈可能性の手法で拒否の方向を見つけ出し、推論能力を保ったままモデルの重みから取り除きます。

**ライセンスの注意:** OBLITERATUS は AGPL-3.0 です。Python のライブラリとして import してはいけません。かならず CLI（`obliteratus` コマンド）かサブプロセス経由で呼び出してください。これで Hermes Agent の MIT ライセンスを保てます。

## 動画での解説 {#video-guide}

Hermes のエージェントが OBLITERATUS を使って Gemma を abliterate する一通りの流れです。
https://www.youtube.com/watch?v=8fG9BrNTeHs ("OBLITERATUS: An AI Agent Removed Gemma 4's Safety Guardrails")

自分で動かす前に、全体の流れを目で見て把握したいときに役立ちます。

## この skill を使う場面 {#when-to-use-this-skill}

次のようなときに呼び出します。
- LLM を「uncensor」または「abliterate」したい
- モデルから拒否／ガードレールを取り除く方法を尋ねられた
- Llama、Qwen、Mistral などの検閲なし版を作りたい
- 「refusal removal」「abliteration」「weight projection」といった話題が出た
- モデルの拒否のしくみを解析したい
- OBLITERATUS、abliterator、拒否の方向（refusal directions）に言及された

## 手順 1: 導入 {#step-1-installation}

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

**重要:** 導入の前にユーザーへ確認してください。PyTorch、Transformers、bitsandbytes などで 5〜10GB ほどの依存関係が入ります。

## 手順 2: ハードウェアの確認 {#step-2-check-hardware}

まず、どの GPU が使えるかを確認します。
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

### 必要な VRAM（4bit 量子化を使った場合） {#vram-requirements-with-4-bit-quantization}

| VRAM     | 扱えるモデルの上限  | モデルの例                              |
|:---------|:----------------|:--------------------------------------------|
| CPU のみ | 約 1B パラメータ      | GPT-2, TinyLlama, SmolLM                    |
| 4-8 GB   | 約 4B パラメータ      | Qwen2.5-1.5B, Phi-3.5 mini, Llama 3.2 3B   |
| 8-16 GB  | 約 9B パラメータ      | Llama 3.1 8B, Mistral 7B, Gemma 2 9B       |
| 24 GB    | 約 32B パラメータ     | Qwen3-32B, Llama 3.1 70B（ぎりぎり）, Command-R |
| 48 GB 以上 | 約 72B 以上のパラメータ    | Qwen2.5-72B, DeepSeek-R1                    |
| 複数 GPU | 200B 以上のパラメータ    | Llama 3.1 405B, DeepSeek-V3 (685B MoE)      |

## 手順 3: 使えるモデルを見て、おすすめを受け取る {#step-3-browse-available-models-get-recommendations}

```bash
# Browse models by compute tier
obliteratus models --tier medium

# Get architecture info for a specific model
obliteratus info <model_name>

# Get telemetry-driven recommendation for best method & params
obliteratus recommend <model_name>
obliteratus recommend <model_name> --insights  # global cross-architecture rankings
```

## 手順 4: 手法を選ぶ {#step-4-choose-a-method}

### 手法の選び方 {#method-selection-guide}
**多くの場合の既定・おすすめは `advanced` です。** ノルムを保つ射影と多方向 SVD を組み合わせたもので、十分に検証されています。

| 状況                         | おすすめの手法 | 理由                                      |
|:----------------------------------|:-------------------|:-----------------------------------------|
| 既定・多くのモデル             | `advanced`         | 多方向 SVD、ノルムを保つ、安定している |
| 手早く試す・試作          | `basic`            | 速くて単純、様子を見るには十分    |
| 密なモデル（Llama、Mistral）      | `advanced`         | 多方向、ノルムを保つ         |
| MoE モデル（DeepSeek、Mixtral）     | `nuclear`          | expert 単位で扱い、MoE の複雑さに対応  |
| 推論モデル（R1 蒸留版）     | `surgical`         | CoT を意識し、思考の連なりを保つ    |
| 拒否がしぶとく残る         | `aggressive`       | 白色化 SVD + head への手術 + jailbreak   |
| 変更を元に戻せるようにしたい           | ステアリングベクトルを使います（解析の節を参照） |
| 時間をかけてでも最高品質にしたい   | `optimized`        | ベイズ探索で最適なパラメータを見つける      |
| 自動判定を試したい       | `informed`         | アライメントの種類を自動判定します。実験的で、advanced を上回るとは限りません |

### CLI の 9 種類の手法 {#9-cli-methods}
- **basic** — diff-in-means で拒否の方向を 1 本だけ求めます。速い（8B で 5〜10 分ほど）。
- **advanced**（既定・おすすめ） — 複数の SVD 方向、ノルムを保つ射影、2 回の追い込み。速度は中くらい（10〜20 分ほど）。
- **aggressive** — 白色化 SVD + jailbreak の対比 + attention head への手術。文章の一貫性を損なう危険が高めです。
- **spectral_cascade** — DCT による周波数領域での分解。研究寄りの新しい手法です。
- **informed** — abliteration の最中に解析を走らせて自動設定します。実験的で、advanced より遅く結果も読みにくいです。
- **surgical** — SAE 特徴 + ニューロンのマスク + head への手術 + expert 単位。とても遅い（1〜2 時間ほど）。推論モデル向きです。
- **optimized** — ベイズによるハイパーパラメータ探索（Optuna TPE）。最も時間がかかりますが、最適なパラメータを見つけます。
- **inverted** — 拒否の方向を反転させます。モデルは進んで応じるようになります。
- **nuclear** — しぶとい MoE モデル向けに手法を全力で組み合わせます。expert 単位で扱います。

### 方向の抽出手法（--direction-method フラグ） {#direction-extraction-methods---direction-method-flag}
- **diff_means**（既定） — 拒否した場合と応じた場合の活性の差を単純に取ります。安定しています。
- **svd** — 多方向の SVD による抽出。複雑なアライメントに向きます。
- **leace** — LEACE（閉形式推定による線形消去）。線形の消去としては最適です。

### Python API でのみ使える 4 手法 {#4-python-api-only-methods}
（CLI からは使えません。Python の import が必要で、AGPL の境界を越えてしまうためです。ユーザーが自分の AGPL プロジェクトで OBLITERATUS をライブラリとして使いたいと明言した場合にだけ紹介してください。）
- failspy, gabliteration, heretic, rdo

## 手順 5: abliteration を実行する {#step-5-run-abliteration}

### 基本の使い方 {#standard-usage}
```bash
# Default method (advanced) — recommended for most models
obliteratus obliterate <model_name> --method advanced --output-dir ./abliterated-models

# With 4-bit quantization (saves VRAM)
obliteratus obliterate <model_name> --method advanced --quantization 4bit --output-dir ./abliterated-models

# Large models (70B+) — conservative defaults
obliteratus obliterate <model_name> --method advanced --quantization 4bit --large-model --output-dir ./abliterated-models
```

### パラメータの調整 {#fine-tuning-parameters}
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
| `--method` | abliteration の手法 | advanced |
| `--direction-method` | 方向の抽出手法 | diff_means |
| `--n-directions` | 拒否の方向の本数（1-32） | 手法によって変わります |
| `--refinement-passes` | 追い込みの回数（1-5） | 2 |
| `--regularization` | 正則化の強さ（0.0-1.0） | 0.1 |
| `--quantization` | 4bit または 8bit で読み込む | なし（フル精度） |
| `--large-model` | 120B 以上向けの控えめな既定値 | false |
| `--output-dir` | abliterate したモデルの保存先 | ./obliterated_model |
| `--contribute` | 匿名化した結果を研究用に共有する | false |
| `--verify-sample-size` | 拒否の確認に使うテスト用プロンプトの数 | 20 |
| `--dtype` | モデルの dtype（float16, bfloat16） | auto |

### そのほかの実行方法 {#other-execution-modes}
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

## 手順 6: 結果を確かめる {#step-6-verify-results}

abliteration のあと、出力された指標を確認します。

| 指標 | 良い値 | 注意が要る値 |
|:-------|:-----------|:--------|
| 拒否率 | &lt; 5%（できれば 0% 前後） | > 10% なら拒否が残っています |
| パープレキシティの変化 | &lt; 10% の増加 | > 15% なら一貫性が損なわれています |
| KL ダイバージェンス | &lt; 0.1 | > 0.5 なら分布が大きくずれています |
| 一貫性 | 高い／読んで問題ない | 応答が崩れる、同じ語を繰り返す |

### 拒否が残る場合（> 10%） {#if-refusals-persist-10}
1. `aggressive` を試します
2. `--n-directions` を増やします（8 や 16 など）
3. `--refinement-passes 3` を加えます
4. `--direction-method svd` を diff_means の代わりに試します

### 一貫性が損なわれた場合（パープレキシティが 15% 超の増加） {#if-coherence-is-damaged-perplexity-15-increase}
1. `--n-directions` を減らします（2 など）
2. `--regularization` を上げます（0.3 など）
3. `--refinement-passes` を 1 に下げます
4. より穏やかな `basic` を試します

## 手順 7: abliterate したモデルを使う {#step-7-use-the-abliterated-model}

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

## CLI コマンドの一覧 {#cli-command-reference}

| コマンド | 説明 |
|:--------|:------------|
| `obliteratus obliterate` | abliteration の中心となるコマンド |
| `obliteratus info <model>` | モデルの構造の詳細を表示します |
| `obliteratus models --tier <tier>` | 計算資源の段階ごとに選定済みのモデルを見ます |
| `obliteratus recommend <model>` | 利用データにもとづく手法・パラメータの提案 |
| `obliteratus interactive` | 対話形式のセットアップ |
| `obliteratus tourney <model>` | すべての手法を総当たりで比べます |
| `obliteratus run <config.yaml>` | YAML の設定から ablation の検証を実行します |
| `obliteratus strategies` | 登録済みの ablation 戦略をすべて並べます |
| `obliteratus report <results.json>` | レポートの図を作り直します |
| `obliteratus ui` | Gradio の Web 画面を立ち上げます |
| `obliteratus aggregate` | コミュニティから集まった利用データをまとめます |

## 解析モジュール {#analysis-modules}

OBLITERATUS には、機構的解釈可能性のための解析モジュールが 28 種類あります。
全体の説明は `skill_view(name="obliteratus", file_path="references/analysis-modules.md")` を参照してください。

### 手早く使える解析コマンド {#quick-analysis-commands}
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
重みを恒久的に書き換える代わりに、推論のときに方向づけする方法もあります。
```python
# Python API only — for user's own projects
from obliteratus.analysis.steering_vectors import SteeringVectorFactory, SteeringHookManager
```

## ablation の戦略 {#ablation-strategies}

方向にもとづく abliteration のほかに、構造そのものを削る戦略もあります。
- **Embedding Ablation** — 埋め込み層の一部を対象にします
- **FFN Ablation** — フィードフォワードのブロックを取り除きます
- **Head Pruning** — attention head を刈り込みます
- **Layer Removal** — 層をまるごと取り除きます

すべて並べるには `obliteratus strategies` を使います。

## 評価 {#evaluation}

OBLITERATUS には評価のしくみも入っています。
- 拒否率のベンチマーク
- パープレキシティの比較（前後）
- 学術ベンチマーク向けの LM Eval Harness 連携
- 競合手法との直接比較
- 基準となる性能の記録

## 対応プラットフォーム {#platform-support}

- **CUDA** — 完全対応（NVIDIA の GPU）
- **Apple Silicon（MLX）** — MLX バックエンドで対応
- **CPU** — ごく小さいモデル（&lt; 1B パラメータ）に対応

## YAML 設定のひな形 {#yaml-config-templates}

同じ結果を再現できるよう、`skill_view` でひな形を読み込めます。
- `templates/abliteration-config.yaml` — 単一モデル向けの標準設定
- `templates/analysis-study.yaml` — abliteration 前の解析用
- `templates/batch-abliteration.yaml` — 複数モデルの一括処理用

## 利用データの送信 {#telemetry}

OBLITERATUS は、匿名化した実行データを研究用の共有データセットへ送ることができます。
`--contribute` フラグで有効になります。個人に関する情報は集めません。集まるのはモデル名・手法・指標だけです。

## つまずきやすい点 {#common-pitfalls}

1. **`informed` を既定にしない** — 実験的で遅い手法です。確実な結果がほしいなら `advanced` を使います。
2. **1B 未満のモデルは abliteration との相性がよくない** — 拒否のふるまいが浅く散らばっていて、方向をきれいに取り出しにくいためです。20〜40% の拒否が残る程度の結果になります。3B 以上のモデルは拒否の方向がはっきりしていて、`advanced` で拒否率 0% になることも多いです。
3. **`aggressive` は悪化させることがある** — 小さいモデルでは一貫性を損ない、かえって拒否率を上げることがあります。3B 以上のモデルで `advanced` でも拒否が 10% を超えるときにだけ使ってください。
4. **パープレキシティは必ず確認する** — 15% を超えて跳ね上がったらモデルが傷んでいます。手法の強さを下げてください。
5. **MoE モデルは扱いが別** — Mixtral や DeepSeek-MoE などには `nuclear` を使います。
6. **量子化済みのモデルは再量子化できない** — フル精度のモデルを abliterate してから、その出力を量子化してください。
7. **VRAM の見積もりはおおよそ** — 4bit 量子化は助けになりますが、方向の抽出中に使用量が跳ね上がることがあります。
8. **推論モデルは繊細** — R1 の蒸留版には `surgical` を使い、思考の連なりを保ちます。
9. **`obliteratus recommend` を確認する** — 集まった利用データのほうが、既定値より良いパラメータを持っていることがあります。
10. **AGPL ライセンス** — MIT や Apache のプロジェクトで `import obliteratus` をしてはいけません。CLI からの呼び出しだけにしてください。
11. **大きいモデル（70B 以上）** — 控えめな既定値になる `--large-model` フラグをかならず付けます。
12. **スペクトル検定の RED はよく出る** — 実際の拒否率が 0% でも、スペクトルの検査は「不完全」と判定しがちです。この検定だけに頼らず、実際の拒否率を見てください。

## 組み合わせると便利な skill {#complementary-skills}

- **vllm** — abliterate したモデルを高いスループットで提供します
- **gguf** — abliterate したモデルを llama.cpp 向けの GGUF に変換します
- **huggingface-tokenizers** — モデルのトークナイザを扱います
