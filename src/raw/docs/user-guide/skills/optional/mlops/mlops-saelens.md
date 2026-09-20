---
title: "Saelens — スパースオートエンコーダを学習させてモデルの特徴を読み解く"
description: "スパースオートエンコーダを学習させてモデルの特徴を読み解く"
upstream_path: user-guide/skills/optional/mlops/mlops-saelens.md
upstream_blob: ce0def00c52e55e1ca265901b61f39d15f8b6cb2
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/mlops/mlops-saelens
---

# Saelens {#saelens}

スパースオートエンコーダを学習させて、モデルの特徴を読み解きます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/mlops/saelens` で導入します |
| パス | `optional-skills/mlops/saelens` |
| バージョン | `1.0.1` |
| 作者 | Orchestra Research |
| ライセンス | MIT |
| 依存関係 | `sae-lens>=6.0.0`, `transformer-lens>=2.0.0`, `torch>=2.0.0` |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Sparse Autoencoders`, `SAE`, `Mechanistic Interpretability`, `Feature Discovery`, `Superposition` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# SAELens: Sparse Autoencoders for Mechanistic Interpretability {#saelens-sparse-autoencoders-for-mechanistic-interpretability}

SAELens は、スパースオートエンコーダ（SAE）を学習・分析するための代表的なライブラリです。SAE は、いくつもの意味が混ざったニューラルネットワークの活性を、まばらで読み解ける特徴へと分解する手法です。単義性（monosemanticity）に関する Anthropic の先駆的な研究がもとになっています。

**GitHub**: [jbloomAus/SAELens](https://github.com/jbloomAus/SAELens)（スター 1,100 以上）

## 問題: 多義性と重ね合わせ {#the-problem-polysemanticity-superposition}

ニューラルネットワークの個々のニューロンは**多義的**で、意味の異なる複数の文脈で反応します。これは、ニューロンの数より多くの特徴を表そうとしてモデルが**重ね合わせ**を使うために起こり、中身の読み解きを難しくします。

**SAE はこれを解決します**。密な活性を、まばらで単義的な特徴へと分解するからです。ある入力に対して反応する特徴はふつうごくわずかで、しかも一つひとつの特徴が読み解ける概念に対応します。

## SAELens が向いているとき {#when-to-use-saelens}

**次のようなときに SAELens を使います:**
- モデルの活性の中から、読み解ける特徴を見つけたい
- モデルがどんな概念を学んだのかを知りたい
- 重ね合わせや特徴の幾何を調べたい
- 特徴を使って出力を誘導したり、特徴を取り除いたりしたい
- 安全性にかかわる特徴（欺き、偏り、有害な内容）を分析したい

**他を選んだほうがよいとき:**
- 活性の基本的な分析で足りる → **TransformerLens** をそのまま使います
- 因果的な介入の実験をしたい → **pyvene** か **TransformerLens** を使います
- 本番環境で出力を誘導したい → 活性を直接操作する方法を検討します

## 導入 {#installation}

```bash
pip install sae-lens
```

必要なもの: Python 3.10 以上、transformer-lens>=2.0.0

## 基本の考え方 {#core-concepts}

### SAE が学ぶもの {#what-saes-learn}

SAE は、まばらなボトルネックを通してモデルの活性を復元するように学習します。

```
Input Activation → Encoder → Sparse Features → Decoder → Reconstructed Activation
    (d_model)       ↓        (d_sae >> d_model)    ↓         (d_model)
                 sparsity                      reconstruction
                 penalty                          loss
```

**損失関数**: `MSE(original, reconstructed) + L1_coefficient × L1(features)`

### 重要な検証（Anthropic の研究） {#key-validation-anthropic-research}

「Towards Monosemanticity」では、人手による評価で **SAE の特徴の 70% が本当に読み解ける**ものだったと報告されています。見つかった特徴には次のようなものがあります。
- DNA 配列、法律文書の言い回し、HTTP リクエスト
- ヘブライ語の文章、栄養表示、コードの構文
- 感情、固有名詞、文法構造

## ワークフロー 1: 学習済み SAE の読み込みと分析 {#workflow-1-loading-and-analyzing-pre-trained-saes}

### 手順 {#step-by-step}

```python
from transformer_lens import HookedTransformer
from sae_lens import SAE

# 1. Load model and pre-trained SAE
model = HookedTransformer.from_pretrained("gpt2-small", device="cuda")
# In sae-lens v6, SAE.from_pretrained() returns JUST the SAE (not a tuple).
sae = SAE.from_pretrained(
    release="gpt2-small-res-jb",
    sae_id="blocks.8.hook_resid_pre",
    device="cuda"
)
# If you also need the cfg dict and feature sparsity, use:
# sae, cfg_dict, sparsity = SAE.from_pretrained_with_cfg_and_sparsity(...)

# 2. Get model activations
tokens = model.to_tokens("The capital of France is Paris")
_, cache = model.run_with_cache(tokens)
activations = cache["resid_pre", 8]  # [batch, pos, d_model]

# 3. Encode to SAE features
sae_features = sae.encode(activations)  # [batch, pos, d_sae]
print(f"Active features: {(sae_features > 0).sum()}")

# 4. Find top features for each position
for pos in range(tokens.shape[1]):
    top_features = sae_features[0, pos].topk(5)
    token = model.to_str_tokens(tokens[0, pos:pos+1])[0]
    print(f"Token '{token}': features {top_features.indices.tolist()}")

# 5. Reconstruct activations
reconstructed = sae.decode(sae_features)
reconstruction_error = (activations - reconstructed).norm()
```

### 使える学習済み SAE {#available-pre-trained-saes}

| 配布 | モデル | 層 |
|---------|-------|--------|
| `gpt2-small-res-jb` | GPT-2 Small | 複数の残差ストリーム |
| `gemma-2b-res` | Gemma 2B | 残差ストリーム |
| HuggingFace 上の各種 | タグ `saelens` で検索します | さまざま |

### チェックリスト {#checklist}
- [ ] TransformerLens でモデルを読み込む
- [ ] 対象の層に合う SAE を読み込む
- [ ] 活性をまばらな特徴へ変換する
- [ ] トークンごとに、強く反応した特徴を特定する
- [ ] 復元の質を確かめる

## ワークフロー 2: 自前の SAE を学習させる {#workflow-2-training-a-custom-sae}

### 手順 {#step-by-step}

```python
from sae_lens import (
    LanguageModelSAETrainingRunner,
    LanguageModelSAERunnerConfig,
    StandardTrainingSAEConfig,
    LoggingConfig,
)

# 1. Configure training (v6 uses a NESTED config: SAE-specific options live in a
#    `sae=` sub-config, and logging options live in a `logger=` sub-config).
#    Note: `architecture`, `d_sae`, `l1_coefficient` etc. are now on the SAE sub-config,
#    and legacy flat options like `hook_layer`, `activation_fn`, `log_to_wandb` were removed.
cfg = LanguageModelSAERunnerConfig(
    # SAE architecture + sparsity (nested)
    sae=StandardTrainingSAEConfig(
        d_in=768,          # Model dimension
        d_sae=768 * 8,     # Expansion factor of 8
        l1_coefficient=8e-5,  # Sparsity penalty
        apply_b_dec_to_input=True,
        normalize_activations="expected_average_only_in",
    ),

    # Data-generating function (model + hook point)
    model_name="gpt2-small",
    hook_name="blocks.8.hook_resid_pre",  # layer is inferred from hook_name (no hook_layer)

    # Training
    lr=4e-4,
    l1_warm_up_steps=1000,
    train_batch_size_tokens=4096,
    training_tokens=100_000_000,

    # Data
    dataset_path="monology/pile-uncopyrighted",
    context_size=128,

    # Logging (nested)
    logger=LoggingConfig(
        log_to_wandb=True,
        wandb_project="sae-training",
    ),

    # Checkpointing
    checkpoint_path="checkpoints",
    n_checkpoints=5,
)

# 2. Train
trainer = LanguageModelSAETrainingRunner(cfg)  # SAETrainingRunner still works as an alias
sae = trainer.run()

# 3. Evaluate
print(f"L0 (avg active features): {trainer.metrics['l0']}")
print(f"CE Loss Recovered: {trainer.metrics['ce_loss_score']}")
```

> **v6 への移行メモ:** 他の種類の SAE を使うときは `sae=` の中身を差し替えます。
> `GatedTrainingSAEConfig`、`TopKTrainingSAEConfig`（`k` を直接指定します）、
> `JumpReLUTrainingSAEConfig`（`l0_coefficient` を使います）があります。以前の平らな指定
> （`architecture`、`expansion_factor`、`hook_layer`、`activation_fn`/`activation_fn_kwargs`、
> `use_ghost_grads`、ghost grads、b_dec やデコーダ初期化の各指定）は v6 で削除されました。

### 主なハイパーパラメータ {#key-hyperparameters}

| 項目 | よく使う値 | はたらき |
|-----------|---------------|--------|
| `d_sae` | d_model の 4〜16 倍 | 特徴が増え、表せる量が増えます |
| `l1_coefficient` | 5e-5〜1e-4 | 大きいほどまばらになり、精度は下がります |
| `lr` | 1e-4〜1e-3 | ふつうの学習率です |
| `l1_warm_up_steps` | 500〜2000 | 特徴が早々に死ぬのを防ぎます |

### 評価の指標 {#evaluation-metrics}

| 指標 | 目安 | 意味 |
|--------|--------|---------|
| **L0** | 50〜200 | 1 トークンあたり反応する特徴の平均数 |
| **CE Loss Score** | 80〜95% | 元のモデルに対して取り戻せた交差エントロピーの割合 |
| **Dead Features** | &lt;5% | まったく反応しない特徴 |
| **Explained Variance** | >90% | 復元の質 |

### チェックリスト {#checklist}
- [ ] 対象の層とフック地点を決める
- [ ] 拡張倍率を決める（d_sae = d_model の 4〜16 倍）
- [ ] 望むまばらさになるよう L1 係数を調整する
- [ ] L1 のウォームアップを有効にして、特徴が死ぬのを防ぐ
- [ ] 学習中の指標を見る（W&B）
- [ ] L0 と交差エントロピーの回復具合を確かめる
- [ ] 死んだ特徴の割合を確かめる

## ワークフロー 3: 特徴の分析と出力の誘導 {#workflow-3-feature-analysis-and-steering}

### 個々の特徴を調べる {#analyzing-individual-features}

```python
from transformer_lens import HookedTransformer
from sae_lens import SAE

model = HookedTransformer.from_pretrained("gpt2-small", device="cuda")
sae = SAE.from_pretrained(  # v6 returns just the SAE
    release="gpt2-small-res-jb",
    sae_id="blocks.8.hook_resid_pre",
    device="cuda"
)

# Find what activates a specific feature
feature_idx = 1234
test_texts = [
    "The scientist conducted an experiment",
    "I love chocolate cake",
    "The code compiles successfully",
    "Paris is beautiful in spring",
]

for text in test_texts:
    tokens = model.to_tokens(text)
    _, cache = model.run_with_cache(tokens)
    features = sae.encode(cache["resid_pre", 8])
    activation = features[0, :, feature_idx].max().item()
    print(f"{activation:.3f}: {text}")
```

### 特徴による誘導 {#feature-steering}

```python
def steer_with_feature(model, sae, prompt, feature_idx, strength=5.0):
    """Add SAE feature direction to residual stream."""
    tokens = model.to_tokens(prompt)

    # Get feature direction from decoder
    feature_direction = sae.W_dec[feature_idx]  # [d_model]

    def steering_hook(activation, hook):
        # Add scaled feature direction at all positions
        activation += strength * feature_direction
        return activation

    # Generate with steering
    output = model.generate(
        tokens,
        max_new_tokens=50,
        fwd_hooks=[("blocks.8.hook_resid_pre", steering_hook)]
    )
    return model.to_string(output[0])
```

### 特徴の寄与を測る {#feature-attribution}

```python
# Which features most affect a specific output?
tokens = model.to_tokens("The capital of France is")
_, cache = model.run_with_cache(tokens)

# Get features at final position
features = sae.encode(cache["resid_pre", 8])[0, -1]  # [d_sae]

# Get logit attribution per feature
# Feature contribution = feature_activation × decoder_weight × unembedding
W_dec = sae.W_dec  # [d_sae, d_model]
W_U = model.W_U    # [d_model, vocab]

# Contribution to "Paris" logit
paris_token = model.to_single_token(" Paris")
feature_contributions = features * (W_dec @ W_U[:, paris_token])

top_features = feature_contributions.topk(10)
print("Top features for 'Paris' prediction:")
for idx, val in zip(top_features.indices, top_features.values):
    print(f"  Feature {idx.item()}: {val.item():.3f}")
```

## よくある問題と対処 {#common-issues-solutions}

> 以下の例はすべて v6 の入れ子の設定を使っています。SAE 固有の指定は `sae=` の中
> （`StandardTrainingSAEConfig` や `TopKTrainingSAEConfig` など）へ、学習まわりのつまみは
> 上位の `LanguageModelSAERunnerConfig` に置きます。

### 問題: 死んだ特徴が多い {#issue-high-dead-feature-ratio}
```python
from sae_lens import LanguageModelSAERunnerConfig, StandardTrainingSAEConfig

# WRONG: no warm-up, features die early
cfg = LanguageModelSAERunnerConfig(
    sae=StandardTrainingSAEConfig(d_in=768, d_sae=768*8, l1_coefficient=1e-4),
    l1_warm_up_steps=0,  # Bad!
)

# RIGHT: warm up the L1 penalty (v6 removed ghost grads; warm-up is the lever now)
cfg = LanguageModelSAERunnerConfig(
    sae=StandardTrainingSAEConfig(d_in=768, d_sae=768*8, l1_coefficient=8e-5),
    l1_warm_up_steps=1000,  # Gradually increase
)
```

### 問題: 復元がうまくいかない（交差エントロピーの回復が低い） {#issue-poor-reconstruction-low-ce-recovery}
```python
# Reduce sparsity penalty and/or add capacity (both on the SAE sub-config)
cfg = LanguageModelSAERunnerConfig(
    sae=StandardTrainingSAEConfig(
        d_in=768,
        d_sae=768 * 16,       # More capacity
        l1_coefficient=5e-5,  # Lower = better reconstruction
    ),
)
```

### 問題: 特徴が読み解けない {#issue-features-not-interpretable}
```python
from sae_lens import LanguageModelSAERunnerConfig, StandardTrainingSAEConfig, TopKTrainingSAEConfig

# Increase sparsity (higher L1)
cfg = LanguageModelSAERunnerConfig(
    sae=StandardTrainingSAEConfig(d_in=768, d_sae=768*8, l1_coefficient=1e-4),
)
# Or use a TopK SAE (k is set directly in v6, not via activation_fn_kwargs)
cfg = LanguageModelSAERunnerConfig(
    sae=TopKTrainingSAEConfig(d_in=768, d_sae=768*8, k=50),  # Exactly 50 active features
)
```

### 問題: 学習中にメモリが足りない {#issue-memory-errors-during-training}
```python
cfg = LanguageModelSAERunnerConfig(
    sae=StandardTrainingSAEConfig(d_in=768, d_sae=768*8, l1_coefficient=8e-5),
    train_batch_size_tokens=2048,  # Reduce batch size
    store_batch_size_prompts=4,    # Fewer prompts in buffer
    n_batches_in_buffer=8,         # Smaller activation buffer
)
```

## Neuronpedia との連携 {#integration-with-neuronpedia}

学習済み SAE の特徴は [neuronpedia.org](https://neuronpedia.org) で見られます。

```python
# Features are indexed by SAE ID
# Example: gpt2-small layer 8 feature 1234
# → neuronpedia.org/gpt2-small/8-res-jb/1234
```

## 主なクラスの一覧 {#key-classes-reference}

| クラス | 役割 |
|-------|---------|
| `SAE` | スパースオートエンコーダ本体 |
| `LanguageModelSAERunnerConfig` | 学習全体の設定（`sae=` と `logger=` を内側に持ちます） |
| `StandardTrainingSAEConfig` / `TopKTrainingSAEConfig` / `GatedTrainingSAEConfig` / `JumpReLUTrainingSAEConfig` | SAE の種類ごとの設定（v6） |
| `LoggingConfig` | ログと W&B の設定（v6） |
| `LanguageModelSAETrainingRunner` | 学習ループの管理役（別名: `SAETrainingRunner`） |
| `ActivationsStore` | 活性の収集とまとめ |
| `HookedSAETransformer` | TransformerLens と SAE をつなぐ仕組み |

## 参考ドキュメント {#reference-documentation}

くわしい API の説明、チュートリアル、進んだ使い方は `references/` フォルダにあります。

| ファイル | 内容 |
|------|----------|
| [references/README.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops/saelens/references/README.md) | 全体像とすぐ試すための案内 |
| [references/api.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops/saelens/references/api.md) | SAE、TrainingSAE、各設定の API 全一覧 |
| [references/tutorials.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops/saelens/references/tutorials.md) | 学習・分析・誘導の手順つきチュートリアル |

## 外部の情報 {#external-resources}

### チュートリアル {#tutorials}
- [Basic Loading & Analysis](https://github.com/jbloomAus/SAELens/blob/main/tutorials/basic_loading_and_analysing.ipynb)
- [Training a Sparse Autoencoder](https://github.com/jbloomAus/SAELens/blob/main/tutorials/training_a_sparse_autoencoder.ipynb)
- [ARENA SAE Curriculum](https://www.lesswrong.com/posts/LnHowHgmrMbWtpkxx/intro-to-superposition-and-sparse-autoencoders-colab)

### 論文 {#papers}
- [Towards Monosemanticity](https://transformer-circuits.pub/2023/monosemantic-features) - Anthropic（2023 年）
- [Scaling Monosemanticity](https://transformer-circuits.pub/2024/scaling-monosemanticity/) - Anthropic（2024 年）
- [Sparse Autoencoders Find Highly Interpretable Features](https://arxiv.org/abs/2309.08600) - Cunningham ほか（ICLR 2024）

### 公式ドキュメント {#official-documentation}
- [SAELens Docs](https://jbloomaus.github.io/SAELens/)
- [Neuronpedia](https://neuronpedia.org) - 特徴を眺めるためのサイト

## SAE の構成 {#sae-architectures}

| 構成 | 説明 | 向いている場面 |
|--------------|-------------|----------|
| **Standard** | ReLU と L1 のペナルティ | 汎用 |
| **Gated** | ゲートの仕組みを学習します | まばらさを細かく調整したいとき |
| **TopK** | ちょうど K 個だけ反応します | まばらさを一定に保ちたいとき |

```python
from sae_lens import LanguageModelSAERunnerConfig, TopKTrainingSAEConfig

# TopK SAE (exactly 50 features active) — `k` is set on the SAE sub-config in v6
cfg = LanguageModelSAERunnerConfig(
    sae=TopKTrainingSAEConfig(d_in=768, d_sae=768*8, k=50),
)
```
