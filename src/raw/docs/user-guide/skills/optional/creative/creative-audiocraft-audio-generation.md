---
title: "Audiocraft Audio Generation — AudioCraft。MusicGen で文章から音楽、AudioGen で文章から音"
description: "AudioCraft。MusicGen で文章から音楽、AudioGen で文章から音"
upstream_path: user-guide/skills/optional/creative/creative-audiocraft-audio-generation.md
upstream_blob: 418ab5e652cff8083640007f9030515439d3bb7c
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/creative/creative-audiocraft-audio-generation
---

# Audiocraft Audio Generation {#audiocraft-audio-generation}

AudioCraft です。MusicGen で文章から音楽を、AudioGen で文章から音を作ります。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加で入れるもの — `hermes skills install official/creative/audiocraft-audio-generation` で導入します |
| パス | `optional-skills/creative/audiocraft-audio-generation` |
| バージョン | `1.0.0` |
| 作者 | Orchestra Research |
| ライセンス | MIT |
| 依存関係 | `audiocraft`, `torch>=2.0.0`, `transformers>=4.30.0` |
| 対応プラットフォーム | linux, macos |
| タグ | `Multimodal`, `Audio Generation`, `Text-to-Music`, `Text-to-Audio`, `MusicGen` |
| 関連 skill | [`heartmula`](/hermes/docs/user-guide/skills/optional/creative/creative-heartmula/), [`songwriting-and-ai-music`](/hermes/docs/user-guide/skills/bundled/creative/creative-songwriting-and-ai-music/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# AudioCraft: Audio Generation {#audiocraft-audio-generation}

Meta の AudioCraft を使い、MusicGen・AudioGen・EnCodec で文章から音楽や音を作るための手引きです。

## AudioCraft を使う場面 {#when-to-use-audiocraft}

**次のようなときに向いています:**
- 文章の説明から音楽を作りたいとき
- 効果音や環境音を作りたいとき
- 音楽生成を組み込んだアプリを作りたいとき
- 旋律を下敷きにして音楽を作りたいとき
- ステレオで書き出したいとき
- 参考にする曲の雰囲気を移しながら、細かく制御して音楽を作りたいとき

**主な機能:**
- **MusicGen**: 文章から音楽を作る。旋律を下敷きにもできます
- **AudioGen**: 文章から効果音を作る
- **EnCodec**: 高音質のニューラル音声コーデック
- **大きさの違うモデル**: Small（300M）から Large（3.3B）まで
- **ステレオ対応**: ステレオ音声をそのまま生成できます
- **雰囲気の指定**: 参考音源をもとに作る MusicGen-Style があります

**別の道具のほうが向いている場合:**
- **Stable Audio**: 商用向けの、もっと長い楽曲を作りたいとき
- **Bark**: 音楽や効果音を交えた読み上げを作りたいとき
- **Riffusion**: スペクトログラムをもとに音楽を作りたいとき
- **OpenAI Jukebox**: 歌詞つきの音声をそのまま作りたいとき

## さっそく使う {#quick-start}

### 導入 {#installation}

```bash
# From PyPI
pip install audiocraft

# From GitHub (latest)
pip install git+https://github.com/facebookresearch/audiocraft.git

# Or use HuggingFace Transformers
pip install transformers torch torchaudio
```

### 文章から音楽を作る（AudioCraft） {#basic-text-to-music-audiocraft}

```python

from audiocraft.models import MusicGen

# Load model
model = MusicGen.get_pretrained('facebook/musicgen-small')

# Set generation parameters
model.set_generation_params(
    duration=8,  # seconds
    top_k=250,
    temperature=1.0
)

# Generate from text
descriptions = ["happy upbeat electronic dance music with synths"]
wav = model.generate(descriptions)

# Save audio
torchaudio.save("output.wav", wav[0].cpu(), sample_rate=32000)
```

### HuggingFace Transformers を使う {#using-huggingface-transformers}

```python
from transformers import AutoProcessor, MusicgenForConditionalGeneration

# Load model and processor
processor = AutoProcessor.from_pretrained("facebook/musicgen-small")
model = MusicgenForConditionalGeneration.from_pretrained("facebook/musicgen-small")
model.to("cuda")

# Generate music
inputs = processor(
    text=["80s pop track with bassy drums and synth"],
    padding=True,
    return_tensors="pt"
).to("cuda")

audio_values = model.generate(
    **inputs,
    do_sample=True,
    guidance_scale=3,
    max_new_tokens=256
)

# Save
sampling_rate = model.config.audio_encoder.sampling_rate
scipy.io.wavfile.write("output.wav", rate=sampling_rate, data=audio_values[0, 0].cpu().numpy())
```

### AudioGen で文章から音を作る {#text-to-sound-with-audiogen}

```python
from audiocraft.models import AudioGen

# Load AudioGen
model = AudioGen.get_pretrained('facebook/audiogen-medium')

model.set_generation_params(duration=5)

# Generate sound effects
descriptions = ["dog barking in a park with birds chirping"]
wav = model.generate(descriptions)

torchaudio.save("sound.wav", wav[0].cpu(), sample_rate=16000)
```

## 基本のしくみ {#core-concepts}

### 全体の構成 {#architecture-overview}

<!-- ascii-guard-ignore -->
```
AudioCraft Architecture:
┌──────────────────────────────────────────────────────────────┐
│                    Text Encoder (T5)                          │
│                         │                                     │
│                    Text Embeddings                            │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│              Transformer Decoder (LM)                         │
│     Auto-regressively generates audio tokens                  │
│     Using efficient token interleaving patterns               │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│                EnCodec Audio Decoder                          │
│        Converts tokens back to audio waveform                 │
└──────────────────────────────────────────────────────────────┘
```
<!-- ascii-guard-ignore-end -->

### モデルの種類 {#model-variants}

| モデル | 大きさ | 説明 | 向いている用途 |
|-------|------|-------------|----------|
| `musicgen-small` | 300M | 文章から音楽 | 手早く作りたいとき |
| `musicgen-medium` | 1.5B | 文章から音楽 | ほどよい釣り合い |
| `musicgen-large` | 3.3B | 文章から音楽 | いちばん高音質 |
| `musicgen-melody` | 1.5B | 文章＋旋律 | 旋律を下敷きにする |
| `musicgen-melody-large` | 3.3B | 文章＋旋律 | 旋律の再現がいちばん良い |
| `musicgen-stereo-*` | まちまち | ステレオ出力 | ステレオで作る |
| `musicgen-style` | 1.5B | 雰囲気の移し替え | 参考音源をもとに作る |
| `audiogen-medium` | 1.5B | 文章から音 | 効果音 |

### 生成の設定 {#generation-parameters}

| 設定 | 既定値 | 説明 |
|-----------|---------|-------------|
| `duration` | 8.0 | 長さ（秒、1〜120） |
| `top_k` | 250 | 上位 k 個から選ぶ |
| `top_p` | 0.0 | 確率の積み上げで選ぶ（0 で無効） |
| `temperature` | 1.0 | 選び方のばらけ具合 |
| `cfg_coef` | 3.0 | 分類器を使わない誘導の強さ |

## MusicGen の使い方 {#musicgen-usage}

### 文章から音楽を作る {#text-to-music-generation}

```python
from audiocraft.models import MusicGen

model = MusicGen.get_pretrained('facebook/musicgen-medium')

# Configure generation
model.set_generation_params(
    duration=30,          # Up to 30 seconds
    top_k=250,            # Sampling diversity
    top_p=0.0,            # 0 = use top_k only
    temperature=1.0,      # Creativity (higher = more varied)
    cfg_coef=3.0          # Text adherence (higher = stricter)
)

# Generate multiple samples
descriptions = [
    "epic orchestral soundtrack with strings and brass",
    "chill lo-fi hip hop beat with jazzy piano",
    "energetic rock song with electric guitar"
]

# Generate (returns [batch, channels, samples])
wav = model.generate(descriptions)

# Save each
for i, audio in enumerate(wav):
    torchaudio.save(f"music_{i}.wav", audio.cpu(), sample_rate=32000)
```

### 旋律を下敷きにして作る {#melody-conditioned-generation}

```python
from audiocraft.models import MusicGen

# Load melody model
model = MusicGen.get_pretrained('facebook/musicgen-melody')
model.set_generation_params(duration=30)

# Load melody audio
melody, sr = torchaudio.load("melody.wav")

# Generate with melody conditioning
descriptions = ["acoustic guitar folk song"]
wav = model.generate_with_chroma(descriptions, melody, sr)

torchaudio.save("melody_conditioned.wav", wav[0].cpu(), sample_rate=32000)
```

### ステレオで作る {#stereo-generation}

```python
from audiocraft.models import MusicGen

# Load stereo model
model = MusicGen.get_pretrained('facebook/musicgen-stereo-medium')
model.set_generation_params(duration=15)

descriptions = ["ambient electronic music with wide stereo panning"]
wav = model.generate(descriptions)

# wav shape: [batch, 2, samples] for stereo
print(f"Stereo shape: {wav.shape}")  # [1, 2, 480000]
torchaudio.save("stereo.wav", wav[0].cpu(), sample_rate=32000)
```

### 既存の音声の続きを作る {#audio-continuation}

```python
from transformers import AutoProcessor, MusicgenForConditionalGeneration

processor = AutoProcessor.from_pretrained("facebook/musicgen-medium")
model = MusicgenForConditionalGeneration.from_pretrained("facebook/musicgen-medium")

# Load audio to continue

audio, sr = torchaudio.load("intro.wav")

# Process with text and audio
inputs = processor(
    audio=audio.squeeze().numpy(),
    sampling_rate=sr,
    text=["continue with a epic chorus"],
    padding=True,
    return_tensors="pt"
)

# Generate continuation
audio_values = model.generate(**inputs, do_sample=True, guidance_scale=3, max_new_tokens=512)
```

## MusicGen-Style の使い方 {#musicgen-style-usage}

### 参考音源の雰囲気で作る {#style-conditioned-generation}

```python
from audiocraft.models import MusicGen

# Load style model
model = MusicGen.get_pretrained('facebook/musicgen-style')

# Configure generation with style
model.set_generation_params(
    duration=30,
    cfg_coef=3.0,
    cfg_coef_beta=5.0  # Style influence
)

# Configure style conditioner
model.set_style_conditioner_params(
    eval_q=3,          # RVQ quantizers (1-6)
    excerpt_length=3.0  # Style excerpt length
)

# Load style reference
style_audio, sr = torchaudio.load("reference_style.wav")

# Generate with text + style
descriptions = ["upbeat dance track"]
wav = model.generate_with_style(descriptions, style_audio, sr)
```

### 文章なしで、雰囲気だけで作る {#style-only-generation-no-text}

```python
# Generate matching style without text prompt
model.set_generation_params(
    duration=30,
    cfg_coef=3.0,
    cfg_coef_beta=None  # Disable double CFG for style-only
)

wav = model.generate_with_style([None], style_audio, sr)
```

## AudioGen の使い方 {#audiogen-usage}

### 効果音を作る {#sound-effect-generation}

```python
from audiocraft.models import AudioGen

model = AudioGen.get_pretrained('facebook/audiogen-medium')
model.set_generation_params(duration=10)

# Generate various sounds
descriptions = [
    "thunderstorm with heavy rain and lightning",
    "busy city traffic with car horns",
    "ocean waves crashing on rocks",
    "crackling campfire in forest"
]

wav = model.generate(descriptions)

for i, audio in enumerate(wav):
    torchaudio.save(f"sound_{i}.wav", audio.cpu(), sample_rate=16000)
```

## EnCodec の使い方 {#encodec-usage}

### 音声を圧縮する {#audio-compression}

```python
from audiocraft.models import CompressionModel

# Load EnCodec
model = CompressionModel.get_pretrained('facebook/encodec_32khz')

# Load audio
wav, sr = torchaudio.load("audio.wav")

# Ensure correct sample rate
if sr != 32000:
    resampler = torchaudio.transforms.Resample(sr, 32000)
    wav = resampler(wav)

# Encode to tokens
with torch.no_grad():
    encoded = model.encode(wav.unsqueeze(0))
    codes = encoded[0]  # Audio codes

# Decode back to audio
with torch.no_grad():
    decoded = model.decode(codes)

torchaudio.save("reconstructed.wav", decoded[0].cpu(), sample_rate=32000)
```

## よくある使い方 {#common-workflows}

### 進め方 1: 音楽を作る一連の流れ {#workflow-1-music-generation-pipeline}

```python

from audiocraft.models import MusicGen

class MusicGenerator:
    def __init__(self, model_name="facebook/musicgen-medium"):
        self.model = MusicGen.get_pretrained(model_name)
        self.sample_rate = 32000

    def generate(self, prompt, duration=30, temperature=1.0, cfg=3.0):
        self.model.set_generation_params(
            duration=duration,
            top_k=250,
            temperature=temperature,
            cfg_coef=cfg
        )

        with torch.no_grad():
            wav = self.model.generate([prompt])

        return wav[0].cpu()

    def generate_batch(self, prompts, duration=30):
        self.model.set_generation_params(duration=duration)

        with torch.no_grad():
            wav = self.model.generate(prompts)

        return wav.cpu()

    def save(self, audio, path):
        torchaudio.save(path, audio, sample_rate=self.sample_rate)

# Usage
generator = MusicGenerator()
audio = generator.generate(
    "epic cinematic orchestral music",
    duration=30,
    temperature=1.0
)
generator.save(audio, "epic_music.wav")
```

### 進め方 2: 効果音をまとめて作る {#workflow-2-sound-design-batch-processing}

```python

from pathlib import Path
from audiocraft.models import AudioGen

def batch_generate_sounds(sound_specs, output_dir):
    """
    Generate multiple sounds from specifications.

    Args:
        sound_specs: list of {"name": str, "description": str, "duration": float}
        output_dir: output directory path
    """
    model = AudioGen.get_pretrained('facebook/audiogen-medium')
    output_dir = Path(output_dir)
    output_dir.mkdir(exist_ok=True)

    results = []

    for spec in sound_specs:
        model.set_generation_params(duration=spec.get("duration", 5))

        wav = model.generate([spec["description"]])

        output_path = output_dir / f"{spec['name']}.wav"
        torchaudio.save(str(output_path), wav[0].cpu(), sample_rate=16000)

        results.append({
            "name": spec["name"],
            "path": str(output_path),
            "description": spec["description"]
        })

    return results

# Usage
sounds = [
    {"name": "explosion", "description": "massive explosion with debris", "duration": 3},
    {"name": "footsteps", "description": "footsteps on wooden floor", "duration": 5},
    {"name": "door", "description": "wooden door creaking and closing", "duration": 2}
]

results = batch_generate_sounds(sounds, "sound_effects/")
```

### 進め方 3: Gradio で試せる画面を作る {#workflow-3-gradio-demo}

```python

from audiocraft.models import MusicGen

model = MusicGen.get_pretrained('facebook/musicgen-small')

def generate_music(prompt, duration, temperature, cfg_coef):
    model.set_generation_params(
        duration=duration,
        temperature=temperature,
        cfg_coef=cfg_coef
    )

    with torch.no_grad():
        wav = model.generate([prompt])

    # Save to temp file
    path = "temp_output.wav"
    torchaudio.save(path, wav[0].cpu(), sample_rate=32000)
    return path

demo = gr.Interface(
    fn=generate_music,
    inputs=[
        gr.Textbox(label="Music Description", placeholder="upbeat electronic dance music"),
        gr.Slider(1, 30, value=8, label="Duration (seconds)"),
        gr.Slider(0.5, 2.0, value=1.0, label="Temperature"),
        gr.Slider(1.0, 10.0, value=3.0, label="CFG Coefficient")
    ],
    outputs=gr.Audio(label="Generated Music"),
    title="MusicGen Demo"
)

demo.launch()
```

## 速さと軽さの調整 {#performance-optimization}

### メモリを節約する {#memory-optimization}

```python
# Use smaller model
model = MusicGen.get_pretrained('facebook/musicgen-small')

# Clear cache between generations
torch.cuda.empty_cache()

# Generate shorter durations
model.set_generation_params(duration=10)  # Instead of 30

# Use half precision
model = model.half()
```

### まとめて処理して速くする {#batch-processing-efficiency}

```python
# Process multiple prompts at once (more efficient)
descriptions = ["prompt1", "prompt2", "prompt3", "prompt4"]
wav = model.generate(descriptions)  # Single batch

# Instead of
for desc in descriptions:
    wav = model.generate([desc])  # Multiple batches (slower)
```

### GPU メモリの目安 {#gpu-memory-requirements}

| モデル | FP32 の VRAM | FP16 の VRAM |
|-------|-----------|-----------|
| musicgen-small | ~4GB | ~2GB |
| musicgen-medium | ~8GB | ~4GB |
| musicgen-large | ~16GB | ~8GB |

## よくある困りごと {#common-issues}

| 症状 | 対処 |
|-------|----------|
| CUDA のメモリ不足 | 小さいモデルを使い、長さを短くする |
| 音が良くない | cfg_coef を上げ、指示の文章を練り直す |
| 生成が短すぎる | 長さの上限の設定を見直す |
| 音が濁る | temperature を変えてみる |
| ステレオにならない | ステレオ対応のモデルを使う |

## 参考資料 {#references}

- **[Advanced Usage](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative/audiocraft-audio-generation/references/advanced-usage.md)** - 学習、追加学習、運用への載せ方
- **[Troubleshooting](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative/audiocraft-audio-generation/references/troubleshooting.md)** - よくある困りごとと対処

## 関連リンク {#resources}

- **GitHub**: https://github.com/facebookresearch/audiocraft
- **論文（MusicGen）**: https://arxiv.org/abs/2306.05284
- **論文（AudioGen）**: https://arxiv.org/abs/2209.15352
- **HuggingFace**: https://huggingface.co/facebook/musicgen-small
- **デモ**: https://huggingface.co/spaces/facebook/MusicGen
