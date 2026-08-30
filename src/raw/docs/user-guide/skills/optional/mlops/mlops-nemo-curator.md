---
title: "Nemo Curator — LLM の学習データを整える: 重複除去・絞り込み・個人情報の伏せ字化"
description: "LLM の学習データを整える: 重複除去・絞り込み・個人情報の伏せ字化"
upstream_path: user-guide/skills/optional/mlops/mlops-nemo-curator.md
upstream_blob: 40f9c2b7acb44b3240310f55c72d0dcff7b12f82
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/mlops/mlops-nemo-curator
---

# Nemo Curator {#nemo-curator}

LLM の学習データを整えます。重複除去・絞り込み・個人情報の伏せ字化を行います。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/mlops/nemo-curator` で導入します |
| パス | `optional-skills/mlops\nemo-curator` |
| バージョン | `1.0.1` |
| 作者 | Orchestra Research |
| ライセンス | MIT |
| 依存関係 | `nemo-curator`, `cudf`, `dask`, `rapids` |
| 対応プラットフォーム | linux, macos |
| タグ | `Data Processing`, `NeMo Curator`, `Data Curation`, `GPU Acceleration`, `Deduplication`, `Quality Filtering`, `NVIDIA`, `RAPIDS`, `PII Redaction`, `Multimodal`, `LLM Training Data` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# NeMo Curator - GPU で高速化するデータ整備 {#nemo-curator---gpu-accelerated-data-curation}

LLM 向けの質の高い学習データを用意するための、NVIDIA のツール群です。

## NeMo Curator を使う場面 {#when-to-use-nemo-curator}

**次のようなときに NeMo Curator を使います:**
- Web クロール（Common Crawl）から LLM の学習データを用意したい
- 重複除去を速くしたい（CPU の 16 倍）
- テキスト・画像・動画・音声にまたがるデータセットを整えたい
- 品質の低い内容や有害な内容を除きたい
- GPU クラスタでデータ処理をスケールさせたい

**性能**:
- あいまい重複の除去が **16 倍高速**（8TB の RedPajama v2）
- CPU での処理に比べ **総保有コストが 40% 低い**
- GPU ノードを増やすと **ほぼ線形にスケール**

**次の場合は別の選択肢を使います**:
- **datatrove**: CPU ベースのオープンソースなデータ処理
- **dolma**: Allen AI のデータ処理ツール群
- **Ray Data**: 汎用の ML データ処理（データ整備に特化していない）

## すぐ試す {#quick-start}

### 導入 {#installation}

```bash
# NeMo Curator 1.x installs with uv. Extras use hyphens (PyPI-normalized):
#   text-cuda12 / text-cpu (and image/video/audio/math variants), or `all`.

# Text curation (CUDA 12)
uv pip install "nemo-curator[text-cuda12]"

# All modalities
uv pip install "nemo-curator[all]"

# CPU-only text (slower)
uv pip install "nemo-curator[text-cpu]"
```

### テキスト整備の基本パイプライン {#basic-text-curation-pipeline}

> **メジャーバージョンでの作り直し（1.x）:** NeMo Curator は **Ray ベースの
> パイプライン／ステージ構成**に書き直されました。0.x にあった `DocumentDataset` +
> `nemo_curator.modules.*` / `ScoreFilter` / `Modify` を、データセットに対してオブジェクトとして
> 呼び出す API はなくなっています。1.x では `ProcessingStage` を組み合わせて `Pipeline` を作り、
> 実行役（executor）で走らせます。ステージや import の顔ぶれはモダリティごとに違うので、
> 以下の例は **考え方を示すもの（0.x 形式）** と捉え、実際の 1.x の API は最新の
> [quickstart](https://github.com/NVIDIA-NeMo/Curator/blob/main/tutorials/quickstart.py)
> と [text guide](https://docs.nvidia.com/nemo/curator/latest/get-started/text) を見て、
> import をそのまま書き写さないでください。

上流の quickstart にある、1.x のパイプラインの形は次のとおりです。

```python
from nemo_curator.pipeline import Pipeline
from nemo_curator.stages.base import ProcessingStage
from nemo_curator.stages.resources import Resources
from nemo_curator.backends.xenna import XennaExecutor
from nemo_curator.core.client import RayClient

# 1. Define/compose stages (load -> filter -> dedupe -> classify -> write).
#    Each stage declares its own Resources (CPU cores, GPU memory, replicas).
pipeline = Pipeline(name="curation", stages=[...])

# 2. Run it with an executor (Ray-backed).
client = RayClient()
client.start()
pipeline.run(XennaExecutor())
client.stop()
```

以降の節にある 0.x 形式のコードは、*考え方*（品質での絞り込み、完全一致・あいまい・意味的な重複除去、個人情報の伏せ字化、分類器での絞り込み）を示すためのものです。そのまま動く 1.x のコードにするには、それぞれの考え方をモダリティ別ガイドの対応するステージに置き換えてください。

## データ整備のパイプライン {#data-curation-pipeline}

### 段階 1: 品質での絞り込み {#stage-1-quality-filtering}

```python
from nemo_curator.filters import (
    WordCountFilter,
    RepeatedLinesFilter,
    UrlRatioFilter,
    NonAlphaNumericFilter
)

# Apply 30+ heuristic filters
from nemo_curator import ScoreFilter

# Word count filter
dataset = dataset.filter(WordCountFilter(min_words=50, max_words=100000))

# Remove repetitive content
dataset = dataset.filter(RepeatedLinesFilter(max_repeated_line_fraction=0.3))

# URL ratio filter
dataset = dataset.filter(UrlRatioFilter(max_url_ratio=0.2))
```

### 段階 2: 重複除去 {#stage-2-deduplication}

**完全一致の重複除去**:
```python
from nemo_curator.modules import ExactDuplicates

# Remove exact duplicates
deduped = ExactDuplicates(id_field="id", text_field="text")(dataset)
```

**あいまい重複の除去**（GPU で 16 倍高速）:
```python
from nemo_curator.modules import FuzzyDuplicates

# MinHash + LSH deduplication
fuzzy_dedup = FuzzyDuplicates(
    id_field="id",
    text_field="text",
    num_hashes=260,      # MinHash parameters
    num_buckets=20,
    hash_method="md5"
)

deduped = fuzzy_dedup(dataset)
```

**意味的な重複除去**:
```python
from nemo_curator.modules import SemanticDuplicates

# Embedding-based deduplication
semantic_dedup = SemanticDuplicates(
    id_field="id",
    text_field="text",
    embedding_model="sentence-transformers/all-MiniLM-L6-v2",
    threshold=0.8  # Cosine similarity threshold
)

deduped = semantic_dedup(dataset)
```

### 段階 3: 個人情報の伏せ字化 {#stage-3-pii-redaction}

```python
from nemo_curator.modules import Modify
from nemo_curator.modifiers import PIIRedactor

# Redact personally identifiable information
pii_redactor = PIIRedactor(
    supported_entities=["EMAIL_ADDRESS", "PHONE_NUMBER", "PERSON", "LOCATION"],
    anonymize_action="replace"  # or "redact"
)

redacted = Modify(pii_redactor)(dataset)
```

### 段階 4: 分類器での絞り込み {#stage-4-classifier-filtering}

```python
from nemo_curator.classifiers import QualityClassifier

# Quality classification
quality_clf = QualityClassifier(
    model_path="nvidia/quality-classifier-deberta",
    batch_size=256,
    device="cuda"
)

# Filter low-quality documents
high_quality = dataset.filter(lambda doc: quality_clf(doc["text"]) > 0.5)
```

## GPU での高速化 {#gpu-acceleration}

### GPU と CPU の性能差 {#gpu-vs-cpu-performance}

| 処理 | CPU（16 コア） | GPU（A100） | 速度差 |
|-----------|----------------|------------|---------|
| あいまい重複の除去（8TB） | 120 時間 | 7.5 時間 | 16 倍 |
| 完全一致の重複除去（1TB） | 8 時間 | 0.5 時間 | 16 倍 |
| 品質での絞り込み | 2 時間 | 0.2 時間 | 10 倍 |

### 複数 GPU へのスケール {#multi-gpu-scaling}

```python
from nemo_curator import get_client

# Initialize GPU cluster
client = get_client(cluster_type="gpu", n_workers=8)

# Process with 8 GPUs
deduped = FuzzyDuplicates(...)(dataset)
```

## マルチモーダルなデータ整備 {#multi-modal-curation}

### 画像の整備 {#image-curation}

```python
from nemo_curator.image import (
    AestheticFilter,
    NSFWFilter,
    CLIPEmbedder
)

# Aesthetic scoring
aesthetic_filter = AestheticFilter(threshold=5.0)
filtered_images = aesthetic_filter(image_dataset)

# NSFW detection
nsfw_filter = NSFWFilter(threshold=0.9)
safe_images = nsfw_filter(filtered_images)

# Generate CLIP embeddings
clip_embedder = CLIPEmbedder(model="openai/clip-vit-base-patch32")
image_embeddings = clip_embedder(safe_images)
```

### 動画の整備 {#video-curation}

```python
from nemo_curator.video import (
    SceneDetector,
    ClipExtractor,
    InternVideo2Embedder
)

# Detect scenes
scene_detector = SceneDetector(threshold=27.0)
scenes = scene_detector(video_dataset)

# Extract clips
clip_extractor = ClipExtractor(min_duration=2.0, max_duration=10.0)
clips = clip_extractor(scenes)

# Generate embeddings
video_embedder = InternVideo2Embedder()
video_embeddings = video_embedder(clips)
```

### 音声の整備 {#audio-curation}

```python
from nemo_curator.audio import (
    ASRInference,
    WERFilter,
    DurationFilter
)

# ASR transcription
asr = ASRInference(model="nvidia/stt_en_fastconformer_hybrid_large_pc")
transcribed = asr(audio_dataset)

# Filter by WER (word error rate)
wer_filter = WERFilter(max_wer=0.3)
high_quality_audio = wer_filter(transcribed)

# Duration filtering
duration_filter = DurationFilter(min_duration=1.0, max_duration=30.0)
filtered_audio = duration_filter(high_quality_audio)
```

## よくある組み合わせ {#common-patterns}

### Web クロールの整備（Common Crawl） {#web-scrape-curation-common-crawl}

```python
from nemo_curator import ScoreFilter, Modify
from nemo_curator.filters import *
from nemo_curator.modules import *
from nemo_curator.datasets import DocumentDataset

# Load Common Crawl data
dataset = DocumentDataset.read_parquet("common_crawl/*.parquet")

# Pipeline
pipeline = [
    # 1. Quality filtering
    WordCountFilter(min_words=100, max_words=50000),
    RepeatedLinesFilter(max_repeated_line_fraction=0.2),
    SymbolToWordRatioFilter(max_symbol_to_word_ratio=0.3),
    UrlRatioFilter(max_url_ratio=0.3),

    # 2. Language filtering
    LanguageIdentificationFilter(target_languages=["en"]),

    # 3. Deduplication
    ExactDuplicates(id_field="id", text_field="text"),
    FuzzyDuplicates(id_field="id", text_field="text", num_hashes=260),

    # 4. PII redaction
    PIIRedactor(),

    # 5. NSFW filtering
    NSFWClassifier(threshold=0.8)
]

# Execute
for stage in pipeline:
    dataset = stage(dataset)

# Save
dataset.to_parquet("curated_common_crawl/")
```

### 分散処理 {#distributed-processing}

```python
from nemo_curator import get_client
from dask_cuda import LocalCUDACluster

# Multi-GPU cluster
cluster = LocalCUDACluster(n_workers=8)
client = get_client(cluster=cluster)

# Process large dataset
dataset = DocumentDataset.read_parquet("s3://large_dataset/*.parquet")
deduped = FuzzyDuplicates(...)(dataset)

# Cleanup
client.close()
cluster.close()
```

## 性能の実測値 {#performance-benchmarks}

### あいまい重複の除去（8TB の RedPajama v2） {#fuzzy-deduplication-8tb-redpajama-v2}

- **CPU（256 コア）**: 120 時間
- **GPU（A100 × 8）**: 7.5 時間
- **速度差**: 16 倍

### 完全一致の重複除去（1TB） {#exact-deduplication-1tb}

- **CPU（64 コア）**: 8 時間
- **GPU（A100 × 4）**: 0.5 時間
- **速度差**: 16 倍

### 品質での絞り込み（100GB） {#quality-filtering-100gb}

- **CPU（32 コア）**: 2 時間
- **GPU（A100 × 2）**: 0.2 時間
- **速度差**: 10 倍

## 費用の比較 {#cost-comparison}

**CPU でのデータ整備**（AWS c5.18xlarge × 10）:
- 費用: 1 時間あたり $3.60 × 10 = $36
- 8TB にかかる時間: 120 時間
- **合計**: $4,320

**GPU でのデータ整備**（AWS p4d.24xlarge × 2）:
- 費用: 1 時間あたり $32.77 × 2 = $65.54
- 8TB にかかる時間: 7.5 時間
- **合計**: $491.55

**削減幅**: 89% 減（$3,828 の節約）

## 扱えるデータ形式 {#supported-data-formats}

- **入力**: Parquet、JSONL、CSV
- **出力**: Parquet（おすすめ）、JSONL
- **WebDataset**: マルチモーダル向けの TAR アーカイブ

## 使われている場面 {#use-cases}

**実運用での採用例**:
- NVIDIA は Nemotron-4 の学習データ作りに NeMo Curator を使いました
- 整備されたオープンソースのデータセット: RedPajama v2、The Pile

## 参考資料 {#references}

- **[絞り込みのガイド](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops\nemo-curator/references/filtering.md)** - 30 種類以上の品質フィルタと判定の目安
- **[重複除去のガイド](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops\nemo-curator/references/deduplication.md)** - 完全一致・あいまい・意味的な手法

## 関連情報 {#resources}

- **GitHub**: https://github.com/NVIDIA-NeMo/Curator
- **ドキュメント**: https://docs.nvidia.com/nemo/curator/latest/
- **バージョン**: 1.2.0（1.x は Ray ベースのパイプラインへの書き直しです。0.x のコードを写す前に quickstart を確認してください）
- **ライセンス**: Apache 2.0
