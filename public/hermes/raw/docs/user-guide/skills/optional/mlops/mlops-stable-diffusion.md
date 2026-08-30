---
title: "Stable Diffusion — 文章からの画像生成、部分の描き直し、画像からの画像生成"
description: "文章からの画像生成、部分の描き直し、画像からの画像生成"
upstream_path: user-guide/skills/optional/mlops/mlops-stable-diffusion.md
upstream_blob: 3a91f19f2a0f1d0370f56db11ddd7fdca3d0e88d
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/mlops/mlops-stable-diffusion
---

# Stable Diffusion {#stable-diffusion}

文章からの画像生成、部分の描き直し、画像からの画像生成を行います。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/mlops/stable-diffusion` で導入します |
| パス | `optional-skills/mlops\stable-diffusion` |
| バージョン | `1.0.0` |
| 作者 | Orchestra Research |
| ライセンス | MIT |
| 依存関係 | `diffusers>=0.30.0`, `transformers>=4.41.0`, `accelerate>=0.31.0`, `torch>=2.0.0` |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Image Generation`, `Stable Diffusion`, `Diffusers`, `Text-to-Image`, `Multimodal`, `Computer Vision` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Stable Diffusion Image Generation {#stable-diffusion-image-generation}

HuggingFace の Diffusers ライブラリを使い、Stable Diffusion で画像を作るための案内です。

## Stable Diffusion が向いているとき {#when-to-use-stable-diffusion}

**次のようなときに使います:**
- 文章の説明から画像を作りたい
- 画像を別の画像に変えたい（画風の変換、画質の改善）
- 部分の描き直し（マスクした領域を埋める）をしたい
- 画像の外側へ描き足したい
- 手元の画像から別のバリエーションを作りたい
- 自前の画像生成の流れを組みたい

**主な機能:**
- **文章から画像**: 普通の言葉のプロンプトから画像を作ります
- **画像から画像**: 文章で導きながら、手元の画像を変えます
- **部分の描き直し**: マスクした領域を、周りに合う内容で埋めます
- **ControlNet**: 輪郭、姿勢、奥行きなど、位置の手がかりを与えます
- **LoRA 対応**: 少ない負担で微調整や画風の切り替えができます
- **複数のモデル**: SD 1.5、SDXL、SD 3.0、Flux に対応しています

**別のものを使ったほうがよいとき:**
- **DALL-E 3**: GPU なしで API から作りたいとき
- **Midjourney**: 芸術的で、様式化された絵がほしいとき
- **Imagen**: Google Cloud と組み合わせたいとき
- **Leonardo.ai**: ブラウザ上で制作を進めたいとき

## すぐ試す {#quick-start}

### 導入 {#installation}

```bash
pip install diffusers transformers accelerate torch
pip install xformers  # Optional: memory-efficient attention
```

### まずは文章から画像を作る {#basic-text-to-image}

```python
from diffusers import DiffusionPipeline

# Load pipeline (auto-detects model type)
pipe = DiffusionPipeline.from_pretrained(
    "stable-diffusion-v1-5/stable-diffusion-v1-5",
    torch_dtype=torch.float16
)
pipe.to("cuda")

# Generate image
image = pipe(
    "A serene mountain landscape at sunset, highly detailed",
    num_inference_steps=50,
    guidance_scale=7.5
).images[0]

image.save("output.png")
```

### SDXL を使う（より高い画質） {#using-sdxl-higher-quality}

```python
from diffusers import AutoPipelineForText2Image

pipe = AutoPipelineForText2Image.from_pretrained(
    "stabilityai/stable-diffusion-xl-base-1.0",
    torch_dtype=torch.float16,
    variant="fp16"
)
pipe.to("cuda")

# Enable memory optimization
pipe.enable_model_cpu_offload()

image = pipe(
    prompt="A futuristic city with flying cars, cinematic lighting",
    height=1024,
    width=1024,
    num_inference_steps=30
).images[0]
```

## 全体の構成 {#architecture-overview}

### 3 つの柱 {#three-pillar-design}

Diffusers は 3 つの部品を中心に組み立てられています。

<!-- ascii-guard-ignore -->
```
Pipeline (orchestration)
├── Model (neural networks)
│   ├── UNet / Transformer (noise prediction)
│   ├── VAE (latent encoding/decoding)
│   └── Text Encoder (CLIP/T5)
└── Scheduler (denoising algorithm)
```
<!-- ascii-guard-ignore-end -->

### パイプラインの流れ {#pipeline-inference-flow}

```
Text Prompt → Text Encoder → Text Embeddings
                                    ↓
Random Noise → [Denoising Loop] ← Scheduler
                      ↓
               Predicted Noise
                      ↓
              VAE Decoder → Final Image
```

## 基本の考え方 {#core-concepts}

### パイプライン {#pipelines}

パイプラインは、ひとまとまりの処理をまとめて動かします。

| パイプライン | 役割 |
|----------|---------|
| `StableDiffusionPipeline` | 文章から画像（SD 1.x / 2.x） |
| `StableDiffusionXLPipeline` | 文章から画像（SDXL） |
| `StableDiffusion3Pipeline` | 文章から画像（SD 3.0） |
| `FluxPipeline` | 文章から画像（Flux 系） |
| `StableDiffusionImg2ImgPipeline` | 画像から画像 |
| `StableDiffusionInpaintPipeline` | 部分の描き直し |

### スケジューラ {#schedulers}

スケジューラは、ノイズを取り除く進め方を決めます。

| スケジューラ | ステップ数 | 画質 | 向いている場面 |
|-----------|-------|---------|----------|
| `EulerDiscreteScheduler` | 20〜50 | 良い | まずはこれ |
| `EulerAncestralDiscreteScheduler` | 20〜50 | 良い | 変化に富んだ絵がほしいとき |
| `DPMSolverMultistepScheduler` | 15〜25 | とても良い | 速くて画質も高い |
| `DDIMScheduler` | 50〜100 | 良い | 毎回同じ結果にしたいとき |
| `LCMScheduler` | 4〜8 | 良い | とにかく速く |
| `UniPCMultistepScheduler` | 15〜25 | とても良い | 早く収束します |

### スケジューラを差し替える {#swapping-schedulers}

```python
from diffusers import DPMSolverMultistepScheduler

# Swap for faster generation
pipe.scheduler = DPMSolverMultistepScheduler.from_config(
    pipe.scheduler.config
)

# Now generate with fewer steps
image = pipe(prompt, num_inference_steps=20).images[0]
```

## 生成時の指定 {#generation-parameters}

### 主な指定 {#key-parameters}

| 項目 | 既定値 | 説明 |
|-----------|---------|-------------|
| `prompt` | 必須 | どんな画像にしたいかを書いた文章 |
| `negative_prompt` | None | 画像に入れたくないもの |
| `num_inference_steps` | 50 | ノイズを取る回数（多いほど画質が上がります） |
| `guidance_scale` | 7.5 | プロンプトへの忠実さ（7〜12 がふつうです） |
| `height`, `width` | 512/1024 | 出力の大きさ（8 の倍数にします） |
| `generator` | None | 同じ結果を再現するための Torch の乱数生成器 |
| `num_images_per_prompt` | 1 | 一度に作る枚数 |

### 同じ結果を再現する {#reproducible-generation}

```python

generator = torch.Generator(device="cuda").manual_seed(42)

image = pipe(
    prompt="A cat wearing a top hat",
    generator=generator,
    num_inference_steps=50
).images[0]
```

### 入れたくないものを指定する {#negative-prompts}

```python
image = pipe(
    prompt="Professional photo of a dog in a garden",
    negative_prompt="blurry, low quality, distorted, ugly, bad anatomy",
    guidance_scale=7.5
).images[0]
```

## 画像から画像 {#image-to-image}

文章で導きながら、手元の画像を変えます。

```python
from diffusers import AutoPipelineForImage2Image
from PIL import Image

pipe = AutoPipelineForImage2Image.from_pretrained(
    "stable-diffusion-v1-5/stable-diffusion-v1-5",
    torch_dtype=torch.float16
).to("cuda")

init_image = Image.open("input.jpg").resize((512, 512))

image = pipe(
    prompt="A watercolor painting of the scene",
    image=init_image,
    strength=0.75,  # How much to transform (0-1)
    num_inference_steps=50
).images[0]
```

## 部分の描き直し {#inpainting}

マスクした領域を埋めます。

```python
from diffusers import AutoPipelineForInpainting
from PIL import Image

pipe = AutoPipelineForInpainting.from_pretrained(
    "runwayml/stable-diffusion-inpainting",
    torch_dtype=torch.float16
).to("cuda")

image = Image.open("photo.jpg")
mask = Image.open("mask.png")  # White = inpaint region

result = pipe(
    prompt="A red car parked on the street",
    image=image,
    mask_image=mask,
    num_inference_steps=50
).images[0]
```

## ControlNet {#controlnet}

位置の手がかりを与えて、思いどおりに近づけます。

```python
from diffusers import StableDiffusionControlNetPipeline, ControlNetModel

# Load ControlNet for edge conditioning
controlnet = ControlNetModel.from_pretrained(
    "lllyasviel/control_v11p_sd15_canny",
    torch_dtype=torch.float16
)

pipe = StableDiffusionControlNetPipeline.from_pretrained(
    "stable-diffusion-v1-5/stable-diffusion-v1-5",
    controlnet=controlnet,
    torch_dtype=torch.float16
).to("cuda")

# Use Canny edge image as control
control_image = get_canny_image(input_image)

image = pipe(
    prompt="A beautiful house in the style of Van Gogh",
    image=control_image,
    num_inference_steps=30
).images[0]
```

### 使える ControlNet {#available-controlnets}

| ControlNet | 入力 | 向いている場面 |
|------------|------------|----------|
| `canny` | 輪郭の画像 | 形を保ちたいとき |
| `openpose` | 姿勢の骨格 | 人の姿勢を決めたいとき |
| `depth` | 奥行きの画像 | 立体感を持たせたいとき |
| `normal` | 法線の画像 | 表面の細かさを出したいとき |
| `mlsd` | 直線の情報 | 建築物の線を扱うとき |
| `scribble` | ざっくりした落書き | 下書きから絵にしたいとき |

## LoRA アダプタ {#lora-adapters}

微調整済みの画風アダプタを読み込みます。

```python
from diffusers import DiffusionPipeline

pipe = DiffusionPipeline.from_pretrained(
    "stable-diffusion-v1-5/stable-diffusion-v1-5",
    torch_dtype=torch.float16
).to("cuda")

# Load LoRA weights
pipe.load_lora_weights("path/to/lora", weight_name="style.safetensors")

# Generate with LoRA style
image = pipe("A portrait in the trained style").images[0]

# Adjust LoRA strength
pipe.fuse_lora(lora_scale=0.8)

# Unload LoRA
pipe.unload_lora_weights()
```

### 複数の LoRA を使う {#multiple-loras}

```python
# Load multiple LoRAs
pipe.load_lora_weights("lora1", adapter_name="style")
pipe.load_lora_weights("lora2", adapter_name="character")

# Set weights for each
pipe.set_adapters(["style", "character"], adapter_weights=[0.7, 0.5])

image = pipe("A portrait").images[0]
```

## メモリの節約 {#memory-optimization}

### CPU への退避を有効にする {#enable-cpu-offloading}

```python
# Model CPU offload - moves models to CPU when not in use
pipe.enable_model_cpu_offload()

# Sequential CPU offload - more aggressive, slower
pipe.enable_sequential_cpu_offload()
```

### アテンションの分割 {#attention-slicing}

```python
# Reduce memory by computing attention in chunks
pipe.enable_attention_slicing()

# Or specific chunk size
pipe.enable_attention_slicing("max")
```

### xFormers のメモリに優しいアテンション {#xformers-memory-efficient-attention}

```python
# Requires xformers package
pipe.enable_xformers_memory_efficient_attention()
```

### 大きな画像のための VAE 分割 {#vae-slicing-for-large-images}

```python
# Decode latents in tiles for large images
pipe.enable_vae_slicing()
pipe.enable_vae_tiling()
```

## モデルの種類 {#model-variants}

### 精度を選んで読み込む {#loading-different-precisions}

```python
# FP16 (recommended for GPU)
pipe = DiffusionPipeline.from_pretrained(
    "model-id",
    torch_dtype=torch.float16,
    variant="fp16"
)

# BF16 (better precision, requires Ampere+ GPU)
pipe = DiffusionPipeline.from_pretrained(
    "model-id",
    torch_dtype=torch.bfloat16
)
```

### 部品を個別に読み込む {#loading-specific-components}

```python
from diffusers import UNet2DConditionModel, AutoencoderKL

# Load custom VAE
vae = AutoencoderKL.from_pretrained("stabilityai/sd-vae-ft-mse")

# Use with pipeline
pipe = DiffusionPipeline.from_pretrained(
    "stable-diffusion-v1-5/stable-diffusion-v1-5",
    vae=vae,
    torch_dtype=torch.float16
)
```

## まとめて生成する {#batch-generation}

複数の画像を効率よく作ります。

```python
# Multiple prompts
prompts = [
    "A cat playing piano",
    "A dog reading a book",
    "A bird painting a picture"
]

images = pipe(prompts, num_inference_steps=30).images

# Multiple images per prompt
images = pipe(
    "A beautiful sunset",
    num_images_per_prompt=4,
    num_inference_steps=30
).images
```

## よくある使い方 {#common-workflows}

### ワークフロー 1: 画質を優先して作る {#workflow-1-high-quality-generation}

```python
from diffusers import StableDiffusionXLPipeline, DPMSolverMultistepScheduler

# 1. Load SDXL with optimizations
pipe = StableDiffusionXLPipeline.from_pretrained(
    "stabilityai/stable-diffusion-xl-base-1.0",
    torch_dtype=torch.float16,
    variant="fp16"
)
pipe.to("cuda")
pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config)
pipe.enable_model_cpu_offload()

# 2. Generate with quality settings
image = pipe(
    prompt="A majestic lion in the savanna, golden hour lighting, 8k, detailed fur",
    negative_prompt="blurry, low quality, cartoon, anime, sketch",
    num_inference_steps=30,
    guidance_scale=7.5,
    height=1024,
    width=1024
).images[0]
```

### ワークフロー 2: 素早く試作する {#workflow-2-fast-prototyping}

```python
from diffusers import AutoPipelineForText2Image, LCMScheduler

# Use LCM for 4-8 step generation
pipe = AutoPipelineForText2Image.from_pretrained(
    "stabilityai/stable-diffusion-xl-base-1.0",
    torch_dtype=torch.float16
).to("cuda")

# Load LCM LoRA for fast generation
pipe.load_lora_weights("latent-consistency/lcm-lora-sdxl")
pipe.scheduler = LCMScheduler.from_config(pipe.scheduler.config)
pipe.fuse_lora()

# Generate in ~1 second
image = pipe(
    "A beautiful landscape",
    num_inference_steps=4,
    guidance_scale=1.0
).images[0]
```

## よくある問題 {#common-issues}

**CUDA のメモリが足りない:**
```python
# Enable memory optimizations
pipe.enable_model_cpu_offload()
pipe.enable_attention_slicing()
pipe.enable_vae_slicing()

# Or use lower precision
pipe = DiffusionPipeline.from_pretrained(model_id, torch_dtype=torch.float16)
```

**真っ黒な画像やノイズだけの画像になる:**
```python
# Check VAE configuration
# Use safety checker bypass if needed
pipe.safety_checker = None

# Ensure proper dtype consistency
pipe = pipe.to(dtype=torch.float16)
```

**生成が遅い:**
```python
# Use faster scheduler
from diffusers import DPMSolverMultistepScheduler
pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config)

# Reduce steps
image = pipe(prompt, num_inference_steps=20).images[0]
```

## 参考ドキュメント {#references}

- **[Advanced Usage](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops\stable-diffusion/references/advanced-usage.md)** - 自前のパイプライン、微調整、公開まで
- **[Troubleshooting](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops\stable-diffusion/references/troubleshooting.md)** - よくある問題と対処

## 参考情報 {#resources}

- **ドキュメント**: https://huggingface.co/docs/diffusers
- **リポジトリ**: https://github.com/huggingface/diffusers
- **Model Hub**: https://huggingface.co/models?library=diffusers
- **Discord**: https://discord.gg/diffusers
