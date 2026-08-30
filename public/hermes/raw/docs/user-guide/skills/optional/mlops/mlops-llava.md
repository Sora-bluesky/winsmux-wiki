---
title: "Llava — 画像について話せるモデル: 質問応答、説明文づくり、対話"
description: "画像について話せるモデル: 質問応答、説明文づくり、対話"
upstream_path: user-guide/skills/optional/mlops/mlops-llava.md
upstream_blob: e70a25f4a4a06f93d4d2db6f9064ef88c1b2572a
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/mlops/mlops-llava
---

# Llava {#llava}

画像について話せるモデルです。質問応答、説明文づくり、画像を見ながらの対話に使えます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/mlops/llava` で導入します |
| パス | `optional-skills/mlops\llava` |
| バージョン | `1.0.0` |
| 作者 | Orchestra Research |
| ライセンス | MIT |
| 依存関係 | `transformers`, `torch`, `pillow` |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `LLaVA`, `Vision-Language`, `Multimodal`, `Visual Question Answering`, `Image Chat`, `CLIP`, `Vicuna`, `Conversational AI`, `Instruction Tuning`, `VQA` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# LLaVA - 言語と視覚をあわせたアシスタント {#llava---large-language-and-vision-assistant}

画像について会話しながら理解を進められる、オープンソースの視覚言語モデルです。

## LLaVA を使う場面 {#when-to-use-llava}

**次のようなときに向いています:**
- 画像について話せるチャットボットを作る
- 画像への質問応答（VQA）
- 画像の説明文づくり
- 画像を見ながら何度もやり取りする
- 画像を踏まえた指示に従わせる
- 画像を含む文書を読み取らせる

**数字で見ると**:
- **GitHub のスターが 23,000 以上**
- GPT-4V に並ぶ性能を目標としています
- Apache 2.0 ライセンス
- モデルの大きさは複数（7B〜34B パラメータ）

**こちらのほうが向いている場合**:
- **GPT-4V**: 品質は最も高く、API から使います
- **CLIP**: 学習なしの単純な分類
- **BLIP-2**: 説明文づくりだけならこちら
- **Flamingo**: 研究向けで、オープンソースではありません

## すぐ試す {#quick-start}

### 導入 {#installation}

```bash
# Clone repository
git clone https://github.com/haotian-liu/LLaVA
cd LLaVA

# Install
pip install -e .
```

### 基本の使い方 {#basic-usage}

```python
from llava.model.builder import load_pretrained_model
from llava.mm_utils import get_model_name_from_path, process_images, tokenizer_image_token
from llava.constants import IMAGE_TOKEN_INDEX, DEFAULT_IMAGE_TOKEN
from llava.conversation import conv_templates
from PIL import Image

# Load model
model_path = "liuhaotian/llava-v1.5-7b"
tokenizer, model, image_processor, context_len = load_pretrained_model(
    model_path=model_path,
    model_base=None,
    model_name=get_model_name_from_path(model_path)
)

# Load image
image = Image.open("image.jpg")
image_tensor = process_images([image], image_processor, model.config)
image_tensor = image_tensor.to(model.device, dtype=torch.float16)

# Create conversation
conv = conv_templates["llava_v1"].copy()
conv.append_message(conv.roles[0], DEFAULT_IMAGE_TOKEN + "\nWhat is in this image?")
conv.append_message(conv.roles[1], None)
prompt = conv.get_prompt()

# Generate response
input_ids = tokenizer_image_token(prompt, tokenizer, IMAGE_TOKEN_INDEX, return_tensors='pt').unsqueeze(0).to(model.device)

with torch.inference_mode():
    output_ids = model.generate(
        input_ids,
        images=image_tensor,
        do_sample=True,
        temperature=0.2,
        max_new_tokens=512
    )

response = tokenizer.decode(output_ids[0], skip_special_tokens=True).strip()
print(response)
```

## 使えるモデル {#available-models}

| モデル | パラメータ数 | VRAM | 品質 |
|-------|------------|------|---------|
| LLaVA-v1.5-7B | 7B | 約 14 GB | よい |
| LLaVA-v1.5-13B | 13B | 約 28 GB | もっとよい |
| LLaVA-v1.6-34B | 34B | 約 70 GB | いちばんよい |

```python
# Load different models
model_7b = "liuhaotian/llava-v1.5-7b"
model_13b = "liuhaotian/llava-v1.5-13b"
model_34b = "liuhaotian/llava-v1.6-34b"

# 4-bit quantization for lower VRAM
load_4bit = True  # Reduces VRAM by ~4×
```

## コマンドから使う {#cli-usage}

```bash
# Single image query
python -m llava.serve.cli \
    --model-path liuhaotian/llava-v1.5-7b \
    --image-file image.jpg \
    --query "What is in this image?"

# Multi-turn conversation
python -m llava.serve.cli \
    --model-path liuhaotian/llava-v1.5-7b \
    --image-file image.jpg
# Then type questions interactively
```

## ブラウザの画面（Gradio） {#web-ui-gradio}

```bash
# Launch Gradio interface
python -m llava.serve.gradio_web_server \
    --model-path liuhaotian/llava-v1.5-7b \
    --load-4bit  # Optional: reduce VRAM

# Access at http://localhost:7860
```

## 何度もやり取りする {#multi-turn-conversations}

```python
# Initialize conversation
conv = conv_templates["llava_v1"].copy()

# Turn 1
conv.append_message(conv.roles[0], DEFAULT_IMAGE_TOKEN + "\nWhat is in this image?")
conv.append_message(conv.roles[1], None)
response1 = generate(conv, model, image)  # "A dog playing in a park"

# Turn 2
conv.messages[-1][1] = response1  # Add previous response
conv.append_message(conv.roles[0], "What breed is the dog?")
conv.append_message(conv.roles[1], None)
response2 = generate(conv, model, image)  # "Golden Retriever"

# Turn 3
conv.messages[-1][1] = response2
conv.append_message(conv.roles[0], "What time of day is it?")
conv.append_message(conv.roles[1], None)
response3 = generate(conv, model, image)
```

## よくある用途 {#common-tasks}

### 画像の説明文づくり {#image-captioning}

```python
question = "Describe this image in detail."
response = ask(model, image, question)
```

### 画像への質問応答 {#visual-question-answering}

```python
question = "How many people are in the image?"
response = ask(model, image, question)
```

### 写っているものの列挙（文章で） {#object-detection-textual}

```python
question = "List all the objects you can see in this image."
response = ask(model, image, question)
```

### 場面の読み取り {#scene-understanding}

```python
question = "What is happening in this scene?"
response = ask(model, image, question)
```

### 文書の読み取り {#document-understanding}

```python
question = "What is the main topic of this document?"
response = ask(model, document_image, question)
```

## 自分でモデルを学習させる {#training-custom-model}

```bash
# Stage 1: Feature alignment (558K image-caption pairs)
bash scripts/v1_5/pretrain.sh

# Stage 2: Visual instruction tuning (150K instruction data)
bash scripts/v1_5/finetune.sh
```

## 量子化して VRAM を減らす {#quantization-reduce-vram}

```python
# 4-bit quantization
tokenizer, model, image_processor, context_len = load_pretrained_model(
    model_path="liuhaotian/llava-v1.5-13b",
    model_base=None,
    model_name=get_model_name_from_path("liuhaotian/llava-v1.5-13b"),
    load_4bit=True  # Reduces VRAM ~4×
)

# 8-bit quantization
load_8bit=True  # Reduces VRAM ~2×
```

## うまく使うコツ {#best-practices}

1. **まず 7B から** - 品質もよく、VRAM も無理がありません
2. **4-bit の量子化を使う** - VRAM がかなり減ります
3. **GPU が必要** - CPU での推論は極端に遅くなります
4. **はっきりしたプロンプト** - 具体的に聞くほどよい答えが返ります
5. **何度もやり取りする** - 会話の流れを保てます
6. **temperature は 0.2〜0.7** - 発想の広さと安定のつり合いを取ります
7. **max_new_tokens は 512〜1024** - 詳しい答えがほしいとき
8. **まとめて処理する** - 複数の画像を順に処理します

## 性能 {#performance}

| モデル | VRAM（FP16） | VRAM（4-bit） | 速度（トークン/秒） |
|-------|-------------|--------------|------------------|
| 7B | 約 14 GB | 約 4 GB | 約 20 |
| 13B | 約 28 GB | 約 8 GB | 約 12 |
| 34B | 約 70 GB | 約 18 GB | 約 5 |

*A100 GPU での測定*

## ベンチマーク {#benchmarks}

LLaVA は次のような成績を収めています。

- **VQAv2**: 78.5%
- **GQA**: 62.0%
- **MM-Vet**: 35.4%
- **MMBench**: 64.3%

## 苦手なこと {#limitations}

1. **事実でないことを言う** - 画像にないものを説明することがあります
2. **位置関係の推論** - 正確な場所を言い当てるのは苦手です
3. **小さな文字** - 細かい字は読み取りにくいです
4. **数を数える** - 数が多いと正確さが落ちます
5. **VRAM の要求** - それなりの GPU が必要です
6. **推論の速度** - CLIP より遅くなります

## ほかの枠組みと組み合わせる {#integration-with-frameworks}

### LangChain {#langchain}

```python
from langchain.llms.base import LLM

class LLaVALLM(LLM):
    def _call(self, prompt, stop=None):
        # Custom LLaVA inference
        return response

llm = LLaVALLM()
```

### Gradio のアプリ {#gradio-app}

```python

def chat(image, text, history):
    response = ask_llava(model, image, text)
    return response

demo = gr.ChatInterface(
    chat,
    additional_inputs=[gr.Image(type="pil")],
    title="LLaVA Chat"
)
demo.launch()
```

## 参考リンク {#resources}

- **GitHub**: https://github.com/haotian-liu/LLaVA ⭐ 23,000+
- **論文**: https://arxiv.org/abs/2304.08485
- **デモ**: https://llava.hliu.cc
- **モデル**: https://huggingface.co/liuhaotian
- **ライセンス**: Apache 2.0
