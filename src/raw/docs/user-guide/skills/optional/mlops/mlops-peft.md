---
title: "Peft — 限られた GPU メモリで大きな LLM を LoRA でファインチューニングする"
description: "限られた GPU メモリで大きな LLM を LoRA でファインチューニングする"
upstream_path: user-guide/skills/optional/mlops/mlops-peft.md
upstream_blob: f5ed6889a9865843e5ad62b512db43c8eb889b80
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/mlops/mlops-peft
---

# Peft {#peft}

限られた GPU メモリで、大きな LLM を LoRA でファインチューニングします。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/mlops/peft` で導入します |
| パス | `optional-skills/mlops/peft` |
| バージョン | `1.0.0` |
| 作者 | Orchestra Research |
| ライセンス | MIT |
| 依存関係 | `peft>=0.13.0`, `transformers>=4.45.0`, `torch>=2.0.0`, `bitsandbytes>=0.43.0` |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Fine-Tuning`, `PEFT`, `LoRA`, `QLoRA`, `Parameter-Efficient`, `Adapters`, `Low-Rank`, `Memory Optimization`, `Multi-Adapter` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# PEFT（パラメータ効率のよいファインチューニング） {#peft-parameter-efficient-fine-tuning}

LoRA、QLoRA をはじめ 25 種類以上のアダプタ手法を使い、パラメータの &lt;1% だけを学習して LLM を調整します。

## PEFT を使う場面 {#when-to-use-peft}

**次のようなときに PEFT/LoRA を使います:**
- 7B〜70B のモデルを、手に入りやすい GPU（RTX 4090、A100）で調整したい
- 学習するパラメータを &lt;1% に抑えたい（14GB のモデル全体に対しアダプタは 6MB）
- タスクごとのアダプタをいくつも作り、素早く試したい
- 1 つのベースモデルから、調整済みの派生をいくつも動かしたい

**次のようなときに QLoRA（PEFT + 量子化）を使います:**
- 70B のモデルを 24GB の GPU 1 枚で調整したい
- メモリが最大の制約になっている
- 全体を調整する場合に比べ、品質が 5% ほど落ちても許容できる

**次の場合は全体のファインチューニングを選びます:**
- 小さいモデル（&lt;1B パラメータ）を学習するとき
- 品質を最優先でき、計算資源にも余裕があるとき
- 分野が大きく変わり、すべての重みを更新する必要があるとき

## すぐ試す {#quick-start}

### 導入 {#installation}

```bash
# Basic installation
pip install peft

# With quantization support (recommended)
pip install peft bitsandbytes

# Full stack
pip install peft transformers accelerate bitsandbytes datasets
```

### LoRA でのファインチューニング（標準） {#lora-fine-tuning-standard}

```python
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments, Trainer
from peft import get_peft_model, LoraConfig, TaskType
from datasets import load_dataset

# Load base model
model_name = "meta-llama/Llama-3.1-8B"
model = AutoModelForCausalLM.from_pretrained(model_name, torch_dtype="auto", device_map="auto")
tokenizer = AutoTokenizer.from_pretrained(model_name)
tokenizer.pad_token = tokenizer.eos_token

# LoRA configuration
lora_config = LoraConfig(
    task_type=TaskType.CAUSAL_LM,
    r=16,                          # Rank (8-64, higher = more capacity)
    lora_alpha=32,                 # Scaling factor (typically 2*r)
    lora_dropout=0.05,             # Dropout for regularization
    target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],  # Attention layers
    bias="none"                    # Don't train biases
)

# Apply LoRA
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()
# Output: trainable params: 13,631,488 || all params: 8,043,307,008 || trainable%: 0.17%

# Prepare dataset
dataset = load_dataset("databricks/databricks-dolly-15k", split="train")

def tokenize(example):
    text = f"### Instruction:\n{example['instruction']}\n\n### Response:\n{example['response']}"
    return tokenizer(text, truncation=True, max_length=512, padding="max_length")

tokenized = dataset.map(tokenize, remove_columns=dataset.column_names)

# Training
training_args = TrainingArguments(
    output_dir="./lora-llama",
    num_train_epochs=3,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,
    learning_rate=2e-4,
    fp16=True,
    logging_steps=10,
    save_strategy="epoch"
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized,
    data_collator=lambda data: {"input_ids": torch.stack([f["input_ids"] for f in data]),
                                 "attention_mask": torch.stack([f["attention_mask"] for f in data]),
                                 "labels": torch.stack([f["input_ids"] for f in data])}
)

trainer.train()

# Save adapter only (6MB vs 16GB)
model.save_pretrained("./lora-llama-adapter")
```

### QLoRA でのファインチューニング（メモリを節約） {#qlora-fine-tuning-memory-efficient}

```python
from transformers import AutoModelForCausalLM, BitsAndBytesConfig
from peft import get_peft_model, LoraConfig, prepare_model_for_kbit_training

# 4-bit quantization config
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",           # NormalFloat4 (best for LLMs)
    bnb_4bit_compute_dtype="bfloat16",   # Compute in bf16
    bnb_4bit_use_double_quant=True       # Nested quantization
)

# Load quantized model
model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Llama-3.1-70B",
    quantization_config=bnb_config,
    device_map="auto"
)

# Prepare for training (enables gradient checkpointing)
model = prepare_model_for_kbit_training(model)

# LoRA config for QLoRA
lora_config = LoraConfig(
    r=64,                              # Higher rank for 70B
    lora_alpha=128,
    lora_dropout=0.1,
    target_modules=["q_proj", "v_proj", "k_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    bias="none",
    task_type="CAUSAL_LM"
)

model = get_peft_model(model, lora_config)
# 70B model now fits on single 24GB GPU!
```

## LoRA のパラメータの決め方 {#lora-parameter-selection}

### ランク（r） — 表現力と効率のバランス {#rank-r---capacity-vs-efficiency}

| ランク | 学習するパラメータ | メモリ | 品質 | 使いどころ |
|------|-----------------|--------|---------|----------|
| 4 | 約 300 万 | ごくわずか | 低め | 単純なタスク、試作 |
| **8** | 約 700 万 | 少ない | 良好 | **最初に試す値** |
| **16** | 約 1,400 万 | 中くらい | より良い | **一般的なファインチューニング** |
| 32 | 約 2,700 万 | 多め | 高い | 複雑なタスク |
| 64 | 約 5,400 万 | 多い | 最も高い | 分野への適応、70B のモデル |

### アルファ（lora_alpha） — 倍率 {#alpha-loraalpha---scaling-factor}

```python
# Rule of thumb: alpha = 2 * rank
LoraConfig(r=16, lora_alpha=32)  # Standard
LoraConfig(r=16, lora_alpha=16)  # Conservative (lower learning rate effect)
LoraConfig(r=16, lora_alpha=64)  # Aggressive (higher learning rate effect)
```

### アーキテクチャ別の対象モジュール {#target-modules-by-architecture}

```python
# Llama / Mistral / Qwen
target_modules = ["q_proj", "v_proj", "k_proj", "o_proj", "gate_proj", "up_proj", "down_proj"]

# GPT-2 / GPT-Neo
target_modules = ["c_attn", "c_proj", "c_fc"]

# Falcon
target_modules = ["query_key_value", "dense", "dense_h_to_4h", "dense_4h_to_h"]

# BLOOM
target_modules = ["query_key_value", "dense", "dense_h_to_4h", "dense_4h_to_h"]

# Auto-detect all linear layers
target_modules = "all-linear"  # PEFT 0.6.0+
```

## アダプタの読み込みと統合 {#loading-and-merging-adapters}

### 学習したアダプタを読み込む {#load-trained-adapter}

```python
from peft import PeftModel, AutoPeftModelForCausalLM
from transformers import AutoModelForCausalLM

# Option 1: Load with PeftModel
base_model = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-3.1-8B")
model = PeftModel.from_pretrained(base_model, "./lora-llama-adapter")

# Option 2: Load directly (recommended)
model = AutoPeftModelForCausalLM.from_pretrained(
    "./lora-llama-adapter",
    device_map="auto"
)
```

### アダプタをベースモデルに統合する {#merge-adapter-into-base-model}

```python
# Merge for deployment (no adapter overhead)
merged_model = model.merge_and_unload()

# Save merged model
merged_model.save_pretrained("./llama-merged")
tokenizer.save_pretrained("./llama-merged")

# Push to Hub
merged_model.push_to_hub("username/llama-finetuned")
```

### 複数アダプタでの提供 {#multi-adapter-serving}

```python
from peft import PeftModel

# Load base with first adapter
model = AutoPeftModelForCausalLM.from_pretrained("./adapter-task1")

# Load additional adapters
model.load_adapter("./adapter-task2", adapter_name="task2")
model.load_adapter("./adapter-task3", adapter_name="task3")

# Switch between adapters at runtime
model.set_adapter("task1")  # Use task1 adapter
output1 = model.generate(**inputs)

model.set_adapter("task2")  # Switch to task2
output2 = model.generate(**inputs)

# Disable adapters (use base model)
with model.disable_adapter():
    base_output = model.generate(**inputs)
```

## PEFT の手法の比較 {#peft-methods-comparison}

| 手法 | 学習する割合 | メモリ | 速度 | 向いている場面 |
|--------|------------|--------|-------|----------|
| **LoRA** | 0.1-1% | 少ない | 速い | 一般的なファインチューニング |
| **QLoRA** | 0.1-1% | とても少ない | 中くらい | メモリが厳しいとき |
| AdaLoRA | 0.1-1% | 少ない | 中くらい | ランクの自動選択 |
| IA3 | 0.01% | ごくわずか | 最も速い | 少数例での適応 |
| Prefix Tuning | 0.1% | 少ない | 中くらい | 生成のふるまいの制御 |
| Prompt Tuning | 0.001% | ごくわずか | 速い | 単純なタスクへの適応 |
| P-Tuning v2 | 0.1% | 少ない | 中くらい | 自然言語理解のタスク |

### IA3（パラメータを最小限に） {#ia3-minimal-parameters}

```python
from peft import IA3Config

ia3_config = IA3Config(
    target_modules=["q_proj", "v_proj", "k_proj", "down_proj"],
    feedforward_modules=["down_proj"]
)
model = get_peft_model(model, ia3_config)
# Trains only 0.01% of parameters!
```

### Prefix Tuning {#prefix-tuning}

```python
from peft import PrefixTuningConfig

prefix_config = PrefixTuningConfig(
    task_type="CAUSAL_LM",
    num_virtual_tokens=20,      # Prepended tokens
    prefix_projection=True       # Use MLP projection
)
model = get_peft_model(model, prefix_config)
```

## 他ツールとの組み合わせ {#integration-patterns}

### TRL（SFTTrainer）と組み合わせる {#with-trl-sfttrainer}

```python
from trl import SFTTrainer, SFTConfig
from peft import LoraConfig

lora_config = LoraConfig(r=16, lora_alpha=32, target_modules="all-linear")

trainer = SFTTrainer(
    model=model,
    args=SFTConfig(output_dir="./output", max_seq_length=512),
    train_dataset=dataset,
    peft_config=lora_config,  # Pass LoRA config directly
)
trainer.train()
```

### Axolotl（YAML 設定）と組み合わせる {#with-axolotl-yaml-config}

```yaml
# axolotl config.yaml
adapter: lora
lora_r: 16
lora_alpha: 32
lora_dropout: 0.05
lora_target_modules:
  - q_proj
  - v_proj
  - k_proj
  - o_proj
lora_target_linear: true  # Target all linear layers
```

### vLLM（推論）と組み合わせる {#with-vllm-inference}

```python
from vllm import LLM
from vllm.lora.request import LoRARequest

# Load base model with LoRA support
llm = LLM(model="meta-llama/Llama-3.1-8B", enable_lora=True)

# Serve with adapter
outputs = llm.generate(
    prompts,
    lora_request=LoRARequest("adapter1", 1, "./lora-adapter")
)
```

## 性能の実測値 {#performance-benchmarks}

### メモリ使用量（Llama 3.1 8B） {#memory-usage-llama-31-8b}

| 手法 | GPU メモリ | 学習するパラメータ |
|--------|-----------|------------------|
| 全体のファインチューニング | 60 GB 以上 | 8B（100%） |
| LoRA r=16 | 18 GB | 1,400 万（0.17%） |
| QLoRA r=16 | 6 GB | 1,400 万（0.17%） |
| IA3 | 16 GB | 80 万（0.01%） |

### 学習速度（A100 80GB） {#training-speed-a100-80gb}

| 手法 | 1 秒あたりのトークン数 | 全体調整との比 |
|--------|-----------|------------|
| 全体の調整 | 2,500 | 1x |
| LoRA | 3,200 | 1.3x |
| QLoRA | 2,100 | 0.84x |

### 品質（MMLU ベンチマーク） {#quality-mmlu-benchmark}

| モデル | 全体の調整 | LoRA | QLoRA |
|-------|---------|------|-------|
| Llama 2-7B | 45.3 | 44.8 | 44.1 |
| Llama 2-13B | 54.8 | 54.2 | 53.5 |

## よくある問題 {#common-issues}

### 学習中の CUDA メモリ不足 {#cuda-oom-during-training}

```python
# Solution 1: Enable gradient checkpointing
model.gradient_checkpointing_enable()

# Solution 2: Reduce batch size + increase accumulation
TrainingArguments(
    per_device_train_batch_size=1,
    gradient_accumulation_steps=16
)

# Solution 3: Use QLoRA
from transformers import BitsAndBytesConfig
bnb_config = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4")
```

### アダプタが効いていない {#adapter-not-applying}

```python
# Verify adapter is active
print(model.active_adapters)  # Should show adapter name

# Check trainable parameters
model.print_trainable_parameters()

# Ensure model in training mode
model.train()
```

### 品質が落ちる {#quality-degradation}

```python
# Increase rank
LoraConfig(r=32, lora_alpha=64)

# Target more modules
target_modules = "all-linear"

# Use more training data and epochs
TrainingArguments(num_train_epochs=5)

# Lower learning rate
TrainingArguments(learning_rate=1e-4)
```

## うまくやるこつ {#best-practices}

1. **まずは r=8〜16 から**始めて、品質が足りなければ上げます
2. 出発点として **alpha = ランク × 2** を使います
3. 品質と効率のバランスを取るなら、**attention 層と MLP 層を対象にします**
4. メモリを節約するため、**gradient checkpointing を有効にします**
5. **アダプタはこまめに保存します**（小さいファイルなので、戻すのも簡単です）
6. 統合する前に、**学習に使っていないデータで評価します**
7. 手元のハードウェアで 70B 以上を扱うなら、**QLoRA を使います**

## 参考資料 {#references}

- **[応用的な使い方](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops/peft/references/advanced-usage.md)** - DoRA、LoftQ、ランクの安定化、独自モジュール
- **[困ったとき](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops/peft/references/troubleshooting.md)** - よくあるエラー、原因の調べ方、改善

## 関連情報 {#resources}

- **GitHub**: https://github.com/huggingface/peft
- **ドキュメント**: https://huggingface.co/docs/peft
- **LoRA の論文**: arXiv:2106.09685
- **QLoRA の論文**: arXiv:2305.14314
- **モデル**: https://huggingface.co/models?library=peft
