---
title: "Slime — Megatron と SGLang による LLM の強化学習後処理"
description: "Megatron と SGLang による LLM の強化学習後処理"
upstream_path: user-guide/skills/optional/mlops/mlops-slime.md
upstream_blob: 27df63be800f3dc69a8d7e1b2384775127e0f937
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/mlops/mlops-slime
---

# Slime {#slime}

Megatron と SGLang を使って、LLM を強化学習で仕上げます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/mlops/slime` で導入します |
| パス | `optional-skills/mlops/slime` |
| バージョン | `1.0.0` |
| 作者 | Orchestra Research |
| ライセンス | MIT |
| 依存関係 | `sglang-router>=0.2.3`, `ray`, `torch>=2.0.0`, `transformers>=4.40.0` |
| 対応プラットフォーム | linux, macos |
| タグ | `Reinforcement Learning`, `Megatron-LM`, `SGLang`, `GRPO`, `Post-Training`, `GLM` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# slime: LLM Post-Training Framework for RL Scaling {#slime-llm-post-training-framework-for-rl-scaling}

slime は清華大学の THUDM チームが作った LLM の後処理向けの枠組みで、GLM-4.5、GLM-4.6、GLM-4.7 を支えています。学習には Megatron-LM を、応答をたくさん作るロールアウトには SGLang をつないで使います。

## slime が向いているとき {#when-to-use-slime}

**次のようなときに slime を選びます:**
- Megatron-LM でそのまま学習し、推論には SGLang を使いたい
- 柔軟なデータバッファで、自前のデータ生成の流れを組みたい
- GLM、Qwen3、DeepSeek V3、Llama 3 を学習させたい
- 研究向けでありながら、実運用（Z.ai）の裏づけがある枠組みがほしい

**他を選んだほうがよいとき:**
- 企業向けの安定性がほしい → **miles** を使います
- 裏側の仕組みを差し替えたい → **verl** を使います
- PyTorch そのままの書き味がほしい → **torchforge** を使います

## 主な特長 {#key-features}

- **学習**: Megatron-LM の並列化（TP、PP、DP、SP）をひととおり使えます
- **ロールアウト**: SGLang とルーターで、応答を高い処理量で作ります
- **データバッファ**: プロンプトの管理と、生成したサンプルの保存を柔軟に行えます
- **モデル**: GLM-4.x、Qwen3、DeepSeek V3/R1、Llama 3

## 全体の構成 {#architecture-overview}

<!-- ascii-guard-ignore -->
```
┌─────────────────────────────────────────────────────────┐
│                    Data Buffer                          │
│ - Prompt initialization and management                  │
│ - Custom data generation and filtering                  │
│ - Rollout sample storage                                │
└─────────────┬───────────────────────────┬───────────────┘
              │                           │
┌─────────────▼───────────┐ ┌─────────────▼───────────────┐
│ Training (Megatron-LM)  │ │ Rollout (SGLang + Router)   │
│ - Actor model training  │ │ - Response generation       │
│ - Critic (optional)     │ │ - Reward/verifier output    │
│ - Weight sync to rollout│ │ - Multi-turn support        │
└─────────────────────────┘ └─────────────────────────────┘
```
<!-- ascii-guard-ignore-end -->

## 導入 {#installation}

```bash
# Recommended: Docker
docker pull slimerl/slime:latest
docker run --rm --gpus all --ipc=host --shm-size=16g \
  -it slimerl/slime:latest /bin/bash

# Inside container
cd /root/slime && pip install -e . --no-deps
```

### ソースから入れる {#from-source}

```bash
git clone https://github.com/THUDM/slime.git
cd slime
pip install -r requirements.txt
pip install -e .
```

## すぐ試す: GRPO で学習する {#quick-start-grpo-training}

```bash
# Source model configuration
source scripts/models/qwen3-4B.sh

# Launch training
python train.py \
    --actor-num-nodes 1 \
    --actor-num-gpus-per-node 4 \
    --rollout-num-gpus 4 \
    --advantage-estimator grpo \
    --use-kl-loss --kl-loss-coef 0.001 \
    --rollout-batch-size 32 \
    --n-samples-per-prompt 8 \
    --global-batch-size 256 \
    --num-rollout 3000 \
    --prompt-data /path/to/data.jsonl \
    ${MODEL_ARGS[@]} ${CKPT_ARGS[@]}
```

---

## ワークフロー 1: ふつうの GRPO 学習 {#workflow-1-standard-grpo-training}

グループ内の相対的な優位さを使って、推論するモデルを学習させたいときの流れです。

### 事前に用意するもの {#prerequisites-checklist}
- [ ] Docker 環境、または Megatron-LM と SGLang を入れた環境
- [ ] モデルのチェックポイント（HuggingFace 形式か Megatron 形式）
- [ ] JSONL 形式の学習データ

### 手順 1: データを用意する {#step-1-prepare-data}

```python
# data.jsonl format
{"prompt": "What is 2 + 2?", "label": "4"}
{"prompt": "Solve: 3x = 12", "label": "x = 4"}
```

会話形式にすることもできます。
```python
{
    "prompt": [
        {"role": "system", "content": "You are a math tutor."},
        {"role": "user", "content": "What is 15 + 27?"}
    ],
    "label": "42"
}
```

### 手順 2: モデルを設定する {#step-2-configure-model}

用意されているモデル設定スクリプトから選びます。

```bash
# List available models
ls scripts/models/
# glm4-9B.sh, qwen3-4B.sh, qwen3-30B-A3B.sh, deepseek-v3.sh, llama3-8B.sh, ...

# Source your model
source scripts/models/qwen3-4B.sh
```

### 手順 3: 学習を始める {#step-3-launch-training}

```bash
python train.py \
    --actor-num-nodes 1 \
    --actor-num-gpus-per-node 8 \
    --rollout-num-gpus 8 \
    --advantage-estimator grpo \
    --use-kl-loss \
    --kl-loss-coef 0.001 \
    --prompt-data /path/to/train.jsonl \
    --input-key prompt \
    --label-key label \
    --apply-chat-template \
    --rollout-batch-size 32 \
    --n-samples-per-prompt 8 \
    --global-batch-size 256 \
    --num-rollout 3000 \
    --save-interval 100 \
    --eval-interval 50 \
    ${MODEL_ARGS[@]}
```

### 手順 4: 学習の様子を見る {#step-4-monitor-training}
- [ ] TensorBoard を開く: `tensorboard --logdir outputs/`
- [ ] 報酬の曲線が上がっているか確かめる
- [ ] 各ノードの GPU 使用率を見る

---

## ワークフロー 2: 非同期での学習 {#workflow-2-asynchronous-training}

ロールアウトと学習を重ねて進めることで、処理量を上げたいときは非同期モードを使います。

### 非同期が向いているとき {#when-to-use-async}
- 大きなモデルで、生成に時間がかかる
- 同期モードだと GPU の待ち時間が長い
- バッファに使えるメモリに余裕がある

### 非同期で学習を始める {#launch-async-training}

```bash
python train_async.py \
    --actor-num-nodes 1 \
    --actor-num-gpus-per-node 8 \
    --rollout-num-gpus 8 \
    --advantage-estimator grpo \
    --async-buffer-size 4 \
    --prompt-data /path/to/train.jsonl \
    ${MODEL_ARGS[@]}
```

### 非同期のときだけ使う指定 {#async-specific-parameters}

```bash
--async-buffer-size 4        # Number of rollouts to buffer
--update-weights-interval 2  # Sync weights every N rollouts
```

---

## ワークフロー 3: 複数ターンのエージェント学習 {#workflow-3-multi-turn-agentic-training}

道具を使ったり、何段階も考えたりするエージェントを学習させたいときの流れです。

### 事前に用意するもの {#prerequisites}
- [ ] 複数ターンの流れを書いた、自前の生成関数
- [ ] 道具や環境とのつなぎ込み

### 手順 1: 自前の生成関数を書く {#step-1-define-custom-generate-function}

```python
# custom_generate.py
async def custom_generate(args, samples, evaluation=False):
    """Multi-turn generation with tool calling."""
    for sample in samples:
        conversation = sample.prompt

        for turn in range(args.max_turns):
            # Generate response
            response = await generate_single(conversation)

            # Check for tool call
            tool_call = extract_tool_call(response)
            if tool_call:
                tool_result = execute_tool(tool_call)
                conversation.append({"role": "assistant", "content": response})
                conversation.append({"role": "tool", "content": tool_result})
            else:
                break

        sample.response = response
        sample.reward = compute_reward(sample)

    return samples
```

### 手順 2: 自前の関数を指定して実行する {#step-2-launch-with-custom-function}

```bash
python train.py \
    --custom-generate-function-path custom_generate.py \
    --max-turns 5 \
    --prompt-data /path/to/agent_data.jsonl \
    ${MODEL_ARGS[@]}
```

複数ターンの検索を扱った完全な例は `examples/search-r1/` にあります。

---

## 設定の早見表 {#configuration-reference}

### 3 種類の引数 {#three-argument-categories}

slime の引数は 3 種類に分かれます。

**1. Megatron の引数**（そのまま渡されます）:
```bash
--tensor-model-parallel-size 2
--pipeline-model-parallel-size 1
--num-layers 32
--hidden-size 4096
```

**2. SGLang の引数**（`--sglang-` を頭に付けます）:
```bash
--sglang-mem-fraction-static 0.8
--sglang-context-length 8192
--sglang-log-level INFO
```

**3. slime 自身の引数**:
```bash
# Resource allocation
--actor-num-nodes 1
--actor-num-gpus-per-node 8
--rollout-num-gpus 8
--colocate  # Share GPUs between training/inference

# Data
--prompt-data /path/to/data.jsonl
--input-key prompt
--label-key label

# Training loop
--num-rollout 3000
--rollout-batch-size 32
--n-samples-per-prompt 8
--global-batch-size 256

# Algorithm
--advantage-estimator grpo  # or: gspo, ppo, reinforce_plus_plus
--use-kl-loss
--kl-loss-coef 0.001
```

### 守るべき関係 {#key-constraints}

```
rollout_batch_size × n_samples_per_prompt = global_batch_size × num_steps_per_rollout
```

例: 32 × 8 = 256 × 1

---

## データバッファの仕組み {#data-buffer-system}

slime のデータバッファを使うと、データの扱いを柔軟に組み立てられます。

### いちばん基本のデータ供給 {#basic-data-source}

```python
class RolloutDataSource:
    def get_samples(self, num_samples):
        """Fetch prompts from dataset."""
        return self.dataset.sample(num_samples)

    def add_samples(self, samples):
        """Called after generation (no-op by default)."""
        pass
```

### バッファ付きのデータ供給（オフポリシー） {#buffered-data-source-off-policy}

```python
class RolloutDataSourceWithBuffer(RolloutDataSource):
    def __init__(self):
        self.buffer = []

    def add_samples(self, samples):
        """Store generated samples for reuse."""
        self.buffer.extend(samples)

    def buffer_filter(self, args, buffer, num_samples):
        """Custom selection logic (prioritized, stratified, etc.)."""
        return select_best(buffer, num_samples)
```

---

## よくある問題と対処 {#common-issues-and-solutions}

### 問題: SGLang のエンジンが落ちる {#issue-sglang-engine-crash}

**症状**: 学習の途中で推論エンジンが停止します

**対処**:
```bash
# Enable fault tolerance
--use-fault-tolerance

# Increase memory allocation
--sglang-mem-fraction-static 0.85

# Reduce batch size
--rollout-batch-size 16
```

### 問題: 重みの同期がタイムアウトする {#issue-weight-sync-timeout}

**症状**: ロールアウトのあとで学習が止まったままになります

**対処**:
```bash
# Increase sync interval
--update-weights-interval 5

# Use colocated mode (no network transfer)
--colocate
```

### 問題: 学習中にメモリが足りない {#issue-oom-during-training}

**症状**: 逆伝播で CUDA のメモリ不足になります

**対処**:
```bash
# Enable gradient checkpointing
--recompute-activations

# Reduce micro-batch size
--micro-batch-size 1

# Enable sequence parallelism
--sequence-parallel
```

### 問題: データの読み込みが遅い {#issue-slow-data-loading}

**症状**: データ取得のあいだ GPU が待ち状態になります

**対処**:
```bash
# Increase data workers
--num-data-workers 4

# Use streaming dataset
--streaming-data
```

---

## 対応しているモデル {#supported-models}

| モデル系統 | 用意されている構成 |
|--------------|----------------|
| GLM | GLM-4.5, GLM-4.6, GLM-4.7, GLM-Z1-9B |
| Qwen | Qwen3 (4B, 8B, 30B-A3B), Qwen3-MoE, Qwen2.5 |
| DeepSeek | V3, V3.1, R1 |
| Llama | Llama 3 (8B, 70B) |
| その他 | Kimi K2, Moonlight-16B |

どのモデルにも、設定済みのスクリプトが `scripts/models/` にあります。

---

## 進んだ話題 {#advanced-topics}

### 同居モード {#co-location-mode}

学習と推論で GPU を分け合い、メモリの使用を抑えます。

```bash
python train.py \
    --colocate \
    --actor-num-gpus-per-node 8 \
    --sglang-mem-fraction-static 0.4 \
    ${MODEL_ARGS[@]}
```

### 自前の報酬モデル {#custom-reward-model}

```python
# custom_rm.py
class CustomRewardModel:
    def __init__(self, model_path):
        self.model = load_model(model_path)

    def compute_reward(self, prompts, responses):
        inputs = self.tokenize(prompts, responses)
        scores = self.model(inputs)
        return scores.tolist()
```

```bash
--custom-rm-path custom_rm.py
```

### 複数の課題で評価する {#evaluation-multi-task}

```bash
--eval-prompt-data aime /path/to/aime.jsonl \
--eval-prompt-data gsm8k /path/to/gsm8k.jsonl \
--n-samples-per-eval-prompt 16
```

---

## 参考情報 {#resources}

- **ドキュメント**: https://thudm.github.io/slime/
- **GitHub**: https://github.com/THUDM/slime
- **ブログ**: https://lmsys.org/blog/2025-07-09-slime/
- **例**: `examples/` ディレクトリに 14 以上の実例があります
