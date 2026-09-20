---
title: "Segment Anything Model — SAM: 点・ボックス・マスクで指示するゼロショット画像セグメンテーション"
description: "SAM: 点・ボックス・マスクで指示するゼロショット画像セグメンテーション"
upstream_path: user-guide/skills/optional/mlops/mlops-models-segment-anything-model.md
upstream_blob: f18118c370e0f72a35e89b3947d3aee7d6dc4e31
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/mlops/mlops-models-segment-anything-model
---

# Segment Anything Model {#segment-anything-model}

SAM は、点・ボックス・マスクで指示するゼロショット画像セグメンテーションのモデルです。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/mlops/segment-anything-model` で導入します |
| パス | `optional-skills/mlops/models/segment-anything-model` |
| バージョン | `1.0.0` |
| 作者 | Orchestra Research |
| ライセンス | MIT |
| 依存関係 | `segment-anything`、`transformers>=4.30.0`、`torch>=1.7.0` |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Multimodal`、`Image Segmentation`、`Computer Vision`、`SAM`、`Zero-Shot` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Segment Anything Model (SAM) {#segment-anything-model-sam}

Meta AI の Segment Anything Model を使って、ゼロショットで画像をセグメンテーションするための手引きです。

## SAM を使う場面 {#when-to-use-sam}

**次のようなときに SAM を使います:**
- タスクごとの学習なしに、画像内のあらゆる物体を切り出したい
- 点やボックスで指示する対話的なアノテーションツールを作りたい
- 別の画像モデル向けの学習データを作りたい
- 未知の画像領域へゼロショットで適用したい
- 物体検出・セグメンテーションのパイプラインを組みたい
- 医療画像・衛星画像など、特定分野の画像を処理したい

**主な特長:**
- **ゼロショットのセグメンテーション**: 追加学習なしで、どんな画像領域でも動きます
- **柔軟な指示方法**: 点・バウンディングボックス・直前のマスクで指定できます
- **自動セグメンテーション**: 画像内すべての物体マスクを自動生成できます
- **高い品質**: 1,100 万枚の画像から得た 11 億のマスクで学習しています
- **複数のモデルサイズ**: ViT-B（最速）、ViT-L、ViT-H（最も高精度）
- **ONNX への書き出し**: ブラウザやエッジ端末にも載せられます

**次の場合は別の選択肢を使います:**
- **YOLO/Detectron2**: クラス付きのリアルタイム物体検出をしたいとき
- **Mask2Former**: カテゴリ付きのセマンティック／パノプティックセグメンテーションをしたいとき
- **GroundingDINO + SAM**: テキストで対象を指示したいとき
- **SAM 2**: 動画のセグメンテーションをしたいとき

## すぐ試す {#quick-start}

### 導入 {#installation}

```bash
# From GitHub
pip install git+https://github.com/facebookresearch/segment-anything.git

# Optional dependencies
pip install opencv-python pycocotools matplotlib

# Or use HuggingFace transformers
pip install transformers
```

### チェックポイントの取得 {#download-checkpoints}

```bash
# ViT-H (largest, most accurate) - 2.4GB
wget https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth

# ViT-L (medium) - 1.2GB
wget https://dl.fbaipublicfiles.com/segment_anything/sam_vit_l_0b3195.pth

# ViT-B (smallest, fastest) - 375MB
wget https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth
```

### SamPredictor を使った基本の流れ {#basic-usage-with-sampredictor}

```python

from segment_anything import sam_model_registry, SamPredictor

# Load model
sam = sam_model_registry["vit_h"](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops/models/segment-anything-model/checkpoint="sam_vit_h_4b8939.pth")
sam.to(device="cuda")

# Create predictor
predictor = SamPredictor(sam)

# Set image (computes embeddings once)
image = cv2.imread("image.jpg")
image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
predictor.set_image(image)

# Predict with point prompts
input_point = np.array([[500, 375]])  # (x, y) coordinates
input_label = np.array([1])  # 1 = foreground, 0 = background

masks, scores, logits = predictor.predict(
    point_coords=input_point,
    point_labels=input_label,
    multimask_output=True  # Returns 3 mask options
)

# Select best mask
best_mask = masks[np.argmax(scores)]
```

### HuggingFace Transformers から使う {#huggingface-transformers}

```python

from PIL import Image
from transformers import SamModel, SamProcessor

# Load model and processor
model = SamModel.from_pretrained("facebook/sam-vit-huge")
processor = SamProcessor.from_pretrained("facebook/sam-vit-huge")
model.to("cuda")

# Process image with point prompt
image = Image.open("image.jpg")
input_points = [[[450, 600]]]  # Batch of points

inputs = processor(image, input_points=input_points, return_tensors="pt")
inputs = {k: v.to("cuda") for k, v in inputs.items()}

# Generate masks
with torch.no_grad():
    outputs = model(**inputs)

# Post-process masks to original size
masks = processor.image_processor.post_process_masks(
    outputs.pred_masks.cpu(),
    inputs["original_sizes"].cpu(),
    inputs["reshaped_input_sizes"].cpu()
)
```

## 基本のしくみ {#core-concepts}

### モデルの構造 {#model-architecture}

<!-- ascii-guard-ignore -->
<!-- ascii-guard-ignore -->
```
SAM Architecture:
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Image Encoder  │────▶│ Prompt Encoder  │────▶│  Mask Decoder   │
│     (ViT)       │     │ (Points/Boxes)  │     │ (Transformer)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
   Image Embeddings      Prompt Embeddings         Masks + IoU
   (computed once)       (per prompt)             predictions
```
<!-- ascii-guard-ignore-end -->
<!-- ascii-guard-ignore-end -->

### モデルの種類 {#model-variants}

| モデル | チェックポイント | サイズ | 速度 | 精度 |
|-------|------------|------|-------|----------|
| ViT-H | `vit_h` | 2.4 GB | 最も遅い | 最高 |
| ViT-L | `vit_l` | 1.2 GB | 中くらい | 良好 |
| ViT-B | `vit_b` | 375 MB | 最も速い | 良好 |

### 指示の種類 {#prompt-types}

| 指示 | 説明 | 使いどころ |
|--------|-------------|----------|
| 点（前景） | 対象の上をクリックする | 単体の物体を選ぶ |
| 点（背景） | 対象の外側をクリックする | 除外したい範囲を示す |
| バウンディングボックス | 対象を囲む矩形 | 大きめの物体 |
| 直前のマスク | 低解像度のマスクを入力する | 少しずつ精度を上げる |

## 対話的なセグメンテーション {#interactive-segmentation}

### 点で指示する {#point-prompts}

```python
# Single foreground point
input_point = np.array([[500, 375]])
input_label = np.array([1])

masks, scores, logits = predictor.predict(
    point_coords=input_point,
    point_labels=input_label,
    multimask_output=True
)

# Multiple points (foreground + background)
input_points = np.array([[500, 375], [600, 400], [450, 300]])
input_labels = np.array([1, 1, 0])  # 2 foreground, 1 background

masks, scores, logits = predictor.predict(
    point_coords=input_points,
    point_labels=input_labels,
    multimask_output=False  # Single mask when prompts are clear
)
```

### ボックスで指示する {#box-prompts}

```python
# Bounding box [x1, y1, x2, y2]
input_box = np.array([425, 600, 700, 875])

masks, scores, logits = predictor.predict(
    box=input_box,
    multimask_output=False
)
```

### 組み合わせて指示する {#combined-prompts}

```python
# Box + points for precise control
masks, scores, logits = predictor.predict(
    point_coords=np.array([[500, 375]]),
    point_labels=np.array([1]),
    box=np.array([400, 300, 700, 600]),
    multimask_output=False
)
```

### 少しずつ精度を上げる {#iterative-refinement}

```python
# Initial prediction
masks, scores, logits = predictor.predict(
    point_coords=np.array([[500, 375]]),
    point_labels=np.array([1]),
    multimask_output=True
)

# Refine with additional point using previous mask
masks, scores, logits = predictor.predict(
    point_coords=np.array([[500, 375], [550, 400]]),
    point_labels=np.array([1, 0]),  # Add background point
    mask_input=logits[np.argmax(scores)][None, :, :],  # Use best mask
    multimask_output=False
)
```

## マスクの自動生成 {#automatic-mask-generation}

### 自動セグメンテーションの基本 {#basic-automatic-segmentation}

```python
from segment_anything import SamAutomaticMaskGenerator

# Create generator
mask_generator = SamAutomaticMaskGenerator(sam)

# Generate all masks
masks = mask_generator.generate(image)

# Each mask contains:
# - segmentation: binary mask
# - bbox: [x, y, w, h]
# - area: pixel count
# - predicted_iou: quality score
# - stability_score: robustness score
# - point_coords: generating point
```

### 生成の細かい調整 {#customized-generation}

```python
mask_generator = SamAutomaticMaskGenerator(
    model=sam,
    points_per_side=32,          # Grid density (more = more masks)
    pred_iou_thresh=0.88,        # Quality threshold
    stability_score_thresh=0.95,  # Stability threshold
    crop_n_layers=1,             # Multi-scale crops
    crop_n_points_downscale_factor=2,
    min_mask_region_area=100,    # Remove tiny masks
)

masks = mask_generator.generate(image)
```

### マスクの絞り込み {#filtering-masks}

```python
# Sort by area (largest first)
masks = sorted(masks, key=lambda x: x['area'], reverse=True)

# Filter by predicted IoU
high_quality = [m for m in masks if m['predicted_iou'] > 0.9]

# Filter by stability score
stable_masks = [m for m in masks if m['stability_score'] > 0.95]
```

## まとめて推論する {#batched-inference}

### 複数の画像 {#multiple-images}

```python
# Process multiple images efficiently
images = [cv2.imread(f"image_{i}.jpg") for i in range(10)]

all_masks = []
for image in images:
    predictor.set_image(image)
    masks, _, _ = predictor.predict(
        point_coords=np.array([[500, 375]]),
        point_labels=np.array([1]),
        multimask_output=True
    )
    all_masks.append(masks)
```

### 1 枚の画像に複数の指示 {#multiple-prompts-per-image}

```python
# Process multiple prompts efficiently (one image encoding)
predictor.set_image(image)

# Batch of point prompts
points = [
    np.array([[100, 100]]),
    np.array([[200, 200]]),
    np.array([[300, 300]])
]

all_masks = []
for point in points:
    masks, scores, _ = predictor.predict(
        point_coords=point,
        point_labels=np.array([1]),
        multimask_output=True
    )
    all_masks.append(masks[np.argmax(scores)])
```

## ONNX での配布 {#onnx-deployment}

### モデルを書き出す {#export-model}

```bash
python scripts/export_onnx_model.py \
    --checkpoint sam_vit_h_4b8939.pth \
    --model-type vit_h \
    --output sam_onnx.onnx \
    --return-single-mask
```

### ONNX モデルを使う {#use-onnx-model}

```python

# Load ONNX model
ort_session = onnxruntime.InferenceSession("sam_onnx.onnx")

# Run inference (image embeddings computed separately)
masks = ort_session.run(
    None,
    {
        "image_embeddings": image_embeddings,
        "point_coords": point_coords,
        "point_labels": point_labels,
        "mask_input": np.zeros((1, 1, 256, 256), dtype=np.float32),
        "has_mask_input": np.array([0], dtype=np.float32),
        "orig_im_size": np.array([h, w], dtype=np.float32)
    }
)
```

## よくある使い方 {#common-workflows}

### 使い方 1: アノテーションツール {#workflow-1-annotation-tool}

```python

# Load model
predictor = SamPredictor(sam)
predictor.set_image(image)

def on_click(event, x, y, flags, param):
    if event == cv2.EVENT_LBUTTONDOWN:
        # Foreground point
        masks, scores, _ = predictor.predict(
            point_coords=np.array([[x, y]]),
            point_labels=np.array([1]),
            multimask_output=True
        )
        # Display best mask
        display_mask(masks[np.argmax(scores)])
```

### 使い方 2: 物体の切り抜き {#workflow-2-object-extraction}

```python
def extract_object(image, point):
    """Extract object at point with transparent background."""
    predictor.set_image(image)

    masks, scores, _ = predictor.predict(
        point_coords=np.array([point]),
        point_labels=np.array([1]),
        multimask_output=True
    )

    best_mask = masks[np.argmax(scores)]

    # Create RGBA output
    rgba = np.zeros((image.shape[0], image.shape[1], 4), dtype=np.uint8)
    rgba[:, :, :3] = image
    rgba[:, :, 3] = best_mask * 255

    return rgba
```

### 使い方 3: 医療画像のセグメンテーション {#workflow-3-medical-image-segmentation}

```python
# Process medical images (grayscale to RGB)
medical_image = cv2.imread("scan.png", cv2.IMREAD_GRAYSCALE)
rgb_image = cv2.cvtColor(medical_image, cv2.COLOR_GRAY2RGB)

predictor.set_image(rgb_image)

# Segment region of interest
masks, scores, _ = predictor.predict(
    box=np.array([x1, y1, x2, y2]),  # ROI bounding box
    multimask_output=True
)
```

## 出力の形式 {#output-format}

### マスクのデータ構造 {#mask-data-structure}

```python
# SamAutomaticMaskGenerator output
{
    "segmentation": np.ndarray,  # H×W binary mask
    "bbox": [x, y, w, h],        # Bounding box
    "area": int,                 # Pixel count
    "predicted_iou": float,      # 0-1 quality score
    "stability_score": float,    # 0-1 robustness score
    "crop_box": [x, y, w, h],    # Generation crop region
    "point_coords": [[x, y]],    # Input point
}
```

### COCO RLE 形式 {#coco-rle-format}

```python
from pycocotools import mask as mask_utils

# Encode mask to RLE
rle = mask_utils.encode(np.asfortranarray(mask.astype(np.uint8)))
rle["counts"] = rle["counts"].decode("utf-8")

# Decode RLE to mask
decoded_mask = mask_utils.decode(rle)
```

## 性能を上げる {#performance-optimization}

### GPU メモリ {#gpu-memory}

```python
# Use smaller model for limited VRAM
sam = sam_model_registry["vit_b"](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops/models/segment-anything-model/checkpoint="sam_vit_b_01ec64.pth")

# Process images in batches
# Clear CUDA cache between large batches
torch.cuda.empty_cache()
```

### 速度の改善 {#speed-optimization}

```python
# Use half precision
sam = sam.half()

# Reduce points for automatic generation
mask_generator = SamAutomaticMaskGenerator(
    model=sam,
    points_per_side=16,  # Default is 32
)

# Use ONNX for deployment
# Export with --return-single-mask for faster inference
```

## よくある問題 {#common-issues}

| 症状 | 対処 |
|-------|----------|
| メモリ不足 | ViT-B モデルを使い、画像サイズを小さくします |
| 推論が遅い | ViT-B を使い、points_per_side を減らします |
| マスクの品質が低い | 指示の出し方を変えるか、ボックスと点を併用します |
| 輪郭が乱れる | stability_score で絞り込みます |
| 小さい物体が抜ける | points_per_side を増やします |

## 参考資料 {#references}

- **[応用的な使い方](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops/models/segment-anything-model/references/advanced-usage.md)** - バッチ処理、ファインチューニング、他ツールとの連携
- **[困ったとき](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops/models/segment-anything-model/references/troubleshooting.md)** - よくある問題と対処

## 関連情報 {#resources}

- **GitHub**: https://github.com/facebookresearch/segment-anything
- **論文**: https://arxiv.org/abs/2304.02643
- **デモ**: https://segment-anything.com
- **SAM 2（動画向け）**: https://github.com/facebookresearch/segment-anything-2
- **HuggingFace**: https://huggingface.co/facebook/sam-vit-huge
