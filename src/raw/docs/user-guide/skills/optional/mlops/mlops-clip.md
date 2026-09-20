---
title: "Clip — 学習なしでの画像の分類と、画像と文章での検索"
description: "学習なしでの画像の分類と、画像と文章での検索"
upstream_path: user-guide/skills/optional/mlops/mlops-clip.md
upstream_blob: e9266e443b29d3f229ce6d1fa26bac387efa465e
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/mlops/mlops-clip
---

# Clip {#clip}

学習なしでの画像の分類と、画像と文章での検索を行います。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/mlops/clip` で導入します |
| パス | `optional-skills/mlops/clip` |
| バージョン | `1.0.0` |
| 作者 | Orchestra Research |
| ライセンス | MIT |
| 依存関係 | `transformers`, `torch`, `pillow` |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Multimodal`, `CLIP`, `Vision-Language`, `Zero-Shot`, `Image Classification`, `OpenAI`, `Image Search`, `Cross-Modal Retrieval`, `Content Moderation` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# CLIP - Contrastive Language-Image Pre-Training {#clip---contrastive-language-image-pre-training}

普通の言葉から画像を読み取る、OpenAI のモデルです。

## CLIP が向いているとき {#when-to-use-clip}

**次のようなときに使います:**
- 学習データなしで画像を分類したい
- 画像と文章がどれくらい合っているかを測りたい
- 画像を意味で検索したい
- 内容の判別（性的表現や暴力の検出）をしたい
- 画像についての質問に答えさせたい
- 画像から文章、文章から画像へと探したい

**数字で見ると**:
- **GitHub のスター 25,300 以上**
- 4 億組の画像と文章の組で学習しています
- ImageNet で、学習なしでも ResNet-50 と同等です
- MIT ライセンス

**他を選んだほうがよいとき**:
- **BLIP-2**: 説明文の生成が得意です
- **LLaVA**: 画像を見ながらの会話ができます
- **Segment Anything**: 画像の領域分けができます

## すぐ試す {#quick-start}

### 導入 {#installation}

```bash
pip install git+https://github.com/openai/CLIP.git
pip install torch torchvision ftfy regex tqdm
```

### 学習なしでの分類 {#zero-shot-classification}

```python

from PIL import Image

# Load model
device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)

# Load image
image = preprocess(Image.open("photo.jpg")).unsqueeze(0).to(device)

# Define possible labels
text = clip.tokenize(["a dog", "a cat", "a bird", "a car"]).to(device)

# Compute similarity
with torch.no_grad():
    image_features = model.encode_image(image)
    text_features = model.encode_text(text)

    # Cosine similarity
    logits_per_image, logits_per_text = model(image, text)
    probs = logits_per_image.softmax(dim=-1).cpu().numpy()

# Print results
labels = ["a dog", "a cat", "a bird", "a car"]
for label, prob in zip(labels, probs[0]):
    print(f"{label}: {prob:.2%}")
```

## 使えるモデル {#available-models}

```python
# Models (sorted by size)
models = [
    "RN50",           # ResNet-50
    "RN101",          # ResNet-101
    "ViT-B/32",       # Vision Transformer (recommended)
    "ViT-B/16",       # Better quality, slower
    "ViT-L/14",       # Best quality, slowest
]

model, preprocess = clip.load("ViT-B/32")
```

| モデル | パラメータ数 | 速さ | 質 |
|-------|------------|-------|---------|
| RN50 | 102M | 速い | 良い |
| ViT-B/32 | 151M | ふつう | より良い |
| ViT-L/14 | 428M | 遅い | いちばん良い |

## 画像と文章の近さを測る {#image-text-similarity}

```python
# Compute embeddings
image_features = model.encode_image(image)
text_features = model.encode_text(text)

# Normalize
image_features /= image_features.norm(dim=-1, keepdim=True)
text_features /= text_features.norm(dim=-1, keepdim=True)

# Cosine similarity
similarity = (image_features @ text_features.T).item()
print(f"Similarity: {similarity:.4f}")
```

## 画像を意味で検索する {#semantic-image-search}

```python
# Index images
image_paths = ["img1.jpg", "img2.jpg", "img3.jpg"]
image_embeddings = []

for img_path in image_paths:
    image = preprocess(Image.open(img_path)).unsqueeze(0).to(device)
    with torch.no_grad():
        embedding = model.encode_image(image)
        embedding /= embedding.norm(dim=-1, keepdim=True)
    image_embeddings.append(embedding)

image_embeddings = torch.cat(image_embeddings)

# Search with text query
query = "a sunset over the ocean"
text_input = clip.tokenize([query]).to(device)
with torch.no_grad():
    text_embedding = model.encode_text(text_input)
    text_embedding /= text_embedding.norm(dim=-1, keepdim=True)

# Find most similar images
similarities = (text_embedding @ image_embeddings.T).squeeze(0)
top_k = similarities.topk(3)

for idx, score in zip(top_k.indices, top_k.values):
    print(f"{image_paths[idx]}: {score:.3f}")
```

## 内容の判別 {#content-moderation}

```python
# Define categories
categories = [
    "safe for work",
    "not safe for work",
    "violent content",
    "graphic content"
]

text = clip.tokenize(categories).to(device)

# Check image
with torch.no_grad():
    logits_per_image, _ = model(image, text)
    probs = logits_per_image.softmax(dim=-1)

# Get classification
max_idx = probs.argmax().item()
max_prob = probs[0, max_idx].item()

print(f"Category: {categories[max_idx]} ({max_prob:.2%})")
```

## まとめて処理する {#batch-processing}

```python
# Process multiple images
images = [preprocess(Image.open(f"img{i}.jpg")) for i in range(10)]
images = torch.stack(images).to(device)

with torch.no_grad():
    image_features = model.encode_image(images)
    image_features /= image_features.norm(dim=-1, keepdim=True)

# Batch text
texts = ["a dog", "a cat", "a bird"]
text_tokens = clip.tokenize(texts).to(device)

with torch.no_grad():
    text_features = model.encode_text(text_tokens)
    text_features /= text_features.norm(dim=-1, keepdim=True)

# Similarity matrix (10 images × 3 texts)
similarities = image_features @ text_features.T
print(similarities.shape)  # (10, 3)
```

## ベクトルデータベースと組み合わせる {#integration-with-vector-databases}

```python
# Store CLIP embeddings in Chroma/FAISS

client = chromadb.Client()
collection = client.create_collection("image_embeddings")

# Add image embeddings
for img_path, embedding in zip(image_paths, image_embeddings):
    collection.add(
        embeddings=[embedding.cpu().numpy().tolist()],
        metadatas=[{"path": img_path}],
        ids=[img_path]
    )

# Query with text
query = "a sunset"
text_embedding = model.encode_text(clip.tokenize([query]))
results = collection.query(
    query_embeddings=[text_embedding.cpu().numpy().tolist()],
    n_results=5
)
```

## うまくやるこつ {#best-practices}

1. **たいていは ViT-B/32 を使う** - つり合いが取れています
2. **埋め込みを正規化する** - コサイン類似度には必要です
3. **まとめて処理する** - そのほうが効率的です
4. **埋め込みを取っておく** - 作り直すと高くつきます
5. **説明的なラベルを使う** - 学習なしでも当たりやすくなります
6. **GPU をおすすめします** - 10〜50 倍速くなります
7. **画像を前処理する** - 用意されている前処理の関数を使います

## 性能の目安 {#performance}

| 操作 | CPU | GPU (V100) |
|-----------|-----|------------|
| 画像の変換 | 約 200 ミリ秒 | 約 20 ミリ秒 |
| 文章の変換 | 約 50 ミリ秒 | 約 5 ミリ秒 |
| 近さの計算 | &lt;1ms | &lt;1ms |

## 苦手なこと {#limitations}

1. **細かい違いの見分けには向きません** - 大まかな分類が得意です
2. **説明的な文章が要ります** - ぼんやりしたラベルでは当たりません
3. **ウェブのデータに引きずられます** - データ由来の偏りが出ることがあります
4. **枠は出せません** - 画像全体だけが対象です
5. **位置の理解は弱いです** - 位置や個数の把握は苦手です

## 参考先 {#resources}

- **GitHub**: https://github.com/openai/CLIP ⭐ 25,300+
- **論文**: https://arxiv.org/abs/2103.00020
- **Colab**: https://colab.research.google.com/github/openai/clip/
- **ライセンス**: MIT
