---
title: "Heartmula — HeartMuLa: 歌詞とタグから Suno のように曲を作る"
description: "HeartMuLa: 歌詞とタグから Suno のように曲を作る"
upstream_path: user-guide/skills/optional/creative/creative-heartmula.md
upstream_blob: ed2182277042bb08f6cd780de80e996504c924a3
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/creative/creative-heartmula
---

# Heartmula {#heartmula}

HeartMuLa: 歌詞とタグから Suno のように曲を作ります。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール型 — `hermes skills install official/creative/heartmula` で入れます |
| パス | `optional-skills/creative\heartmula` |
| バージョン | `1.0.0` |
| 作者 | Teknium (teknium1)、Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `music`, `audio`, `generation`, `ai`, `heartmula`, `heartcodec`, `lyrics`, `songs` |
| 関連 skill | [`audiocraft-audio-generation`](/hermes/docs/user-guide/skills/optional/creative/creative-audiocraft-audio-generation/), [`songwriting-and-ai-music`](/hermes/docs/user-guide/skills/bundled/creative/creative-songwriting-and-ai-music/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として見ています。
:::

# HeartMuLa - Open-Source Music Generation {#heartmula---open-source-music-generation}

## 概要 {#overview}
HeartMuLa は、歌詞とタグをもとに音楽を作る、オープンソースの音楽基盤モデル群（Apache-2.0）です。多言語に対応しています。歌詞とタグから曲を丸ごと作れます。オープンソースの中では Suno に並ぶものです。次のものが含まれます:
- **HeartMuLa** — 歌詞とタグから生成する音楽の言語モデル（3B／7B）
- **HeartCodec** — 高品質に音を復元する 12.5Hz の音楽コーデック
- **HeartTranscriptor** — Whisper をもとにした歌詞の書き起こし
- **HeartCLAP** — 音とテキストを対応づけるモデル

## こんなときに使います {#when-to-use}
- 文章の説明から音楽や曲を作りたいと言われたとき
- Suno の代わりになるオープンソースのものを探しているとき
- 手元・オフラインで音楽を作りたいとき
- HeartMuLa、heartlib、AI による音楽生成について聞かれたとき

## 必要なハードウェア {#hardware-requirements}
- **最低**: VRAM 8GB ＋ `--lazy_load true`（モデルを順番に読み込んでは解放します）
- **推奨**: 単一 GPU で余裕をもって使うなら VRAM 16GB 以上
- **複数 GPU**: `--mula_device cuda:0 --codec_device cuda:1` で GPU をまたいで分けます
- 3B モデルを lazy_load 付きで動かすと、VRAM の使用量は最大 6.2GB ほどです

## 導入の手順 {#installation-steps}

### 1. リポジトリを取得する {#1-clone-repository}
```bash
cd ~/  # or desired directory
git clone https://github.com/HeartMuLa/heartlib.git
cd heartlib
```

### 2. 仮想環境を作る（Python 3.10 が必要です） {#2-create-virtual-environment-python-310-required}
```bash
uv venv --python 3.10 .venv
. .venv/bin/activate
uv pip install -e .
```

### 3. 依存関係の食い違いを直す {#3-fix-dependency-compatibility-issues}

**重要**: 2026 年 2 月時点で、固定されている依存関係が新しいパッケージとぶつかります。次の対処をしてください:

```bash
# Upgrade datasets (old version incompatible with current pyarrow)
uv pip install --upgrade datasets

# Upgrade transformers (needed for huggingface-hub 1.x compatibility)
uv pip install --upgrade transformers
```

### 4. ソースコードに手を入れる（transformers 5.x では必須です） {#4-patch-source-code-required-for-transformers-5x}

**修正 1 — RoPE のキャッシュの直し方**（`src/heartlib/heartmula/modeling_heartmula.py`）:

`HeartMuLa` クラスの `setup_caches` メソッドで、`reset_caches` の try/except ブロックのあと、`with device:` ブロックの前に、RoPE の初期化をやり直す処理を足します:

```python
# Re-initialize RoPE caches that were skipped during meta-device loading
from torchtune.models.llama3_1._position_embeddings import Llama3ScaledRoPE
for module in self.modules():
    if isinstance(module, Llama3ScaledRoPE) and not module.is_cache_built:
        module.rope_init()
        module.to(device)
```

**理由**: `from_pretrained` はまずメタデバイス上にモデルを作ります。`Llama3ScaledRoPE.rope_init()` はメタテンソルに対してはキャッシュを作らず、そのあと重みが実際のデバイスに読み込まれても作り直されないためです。

**修正 2 — HeartCodec の読み込みの直し方**（`src/heartlib/pipelines/music_generation.py`）:

`HeartCodec.from_pretrained()` の呼び出し**すべて**に `ignore_mismatched_sizes=True` を足します（`__init__` の中で先に読み込むものと、`codec` プロパティで遅れて読み込むものの 2 か所あります）。

**理由**: VQ のコードブックの `initted` バッファは、チェックポイントでは形が `[1]` なのに対し、モデル側では `[]` になっています。中身は同じで、スカラーか 0 次元テンソルかの違いだけです。無視して問題ありません。

### 5. モデルのチェックポイントをダウンロードする {#5-download-model-checkpoints}
```bash
cd heartlib  # project root
hf download --local-dir './ckpt' 'HeartMuLa/HeartMuLaGen'
hf download --local-dir './ckpt/HeartMuLa-oss-3B' 'HeartMuLa/HeartMuLa-oss-3B-happy-new-year'
hf download --local-dir './ckpt/HeartCodec-oss' 'HeartMuLa/HeartCodec-oss-20260123'
```

3 つとも同時にダウンロードできます。合計で数 GB になります。

## GPU / CUDA {#gpu-cuda}

HeartMuLa は既定で CUDA を使います（`--mula_device cuda --codec_device cuda`）。NVIDIA の GPU があり、CUDA 対応の PyTorch が入っていれば、追加の設定は要りません。

- 入っている `torch==2.4.1` には、はじめから CUDA 12.1 対応が含まれています
- `torchtune` のバージョンが `0.4.0+cpu` と表示されることがありますが、これはパッケージの情報上そうなっているだけで、PyTorch 経由で CUDA を使っています
- GPU が使われているか確かめるには、出力の中の "CUDA memory" の行を見てください（たとえば "CUDA memory before unloading: 6.20 GB"）
- **GPU がない場合** は `--mula_device cpu --codec_device cpu` で CPU でも動きますが、生成は**とても遅く**なります（GPU なら 4 分ほどの曲 1 つに、30〜60 分以上かかることがあります）。CPU で動かすにはメモリもかなり必要です（空きが 12GB 以上）。NVIDIA の GPU がない利用者には、クラウドの GPU サービス（Google Colab の無料枠の T4、Lambda Labs など）か、https://heartmula.github.io/ のオンラインデモを勧めてください。

## 使い方 {#usage}

### 基本的な生成 {#basic-generation}
```bash
cd heartlib
. .venv/bin/activate
python ./examples/run_music_generation.py \
  --model_path=./ckpt \
  --version="3B" \
  --lyrics="./assets/lyrics.txt" \
  --tags="./assets/tags.txt" \
  --save_path="./assets/output.mp3" \
  --lazy_load true
```

### 入力の書き方 {#input-formatting}

**タグ**（コンマ区切り、空白なし）:
```
piano,happy,wedding,synthesizer,romantic
```
または
```
rock,energetic,guitar,drums,male-vocal
```

**歌詞**（構成を角かっこのタグで示します）:
```
[Intro]

[Verse]
Your lyrics here...

[Chorus]
Chorus lyrics...

[Bridge]
Bridge lyrics...

[Outro]
```

### 主なパラメーター {#key-parameters}
| Parameter | Default | Description |
|-----------|---------|-------------|
| `--max_audio_length_ms` | 240000 | 長さの上限（ミリ秒。240s = 4 分） |
| `--topk` | 50 | 上位 k 個からのサンプリング |
| `--temperature` | 1.0 | サンプリングの温度 |
| `--cfg_scale` | 1.5 | classifier-free guidance の強さ |
| `--lazy_load` | false | 必要なときだけモデルを読み込んで解放します（VRAM の節約になります） |
| `--mula_dtype` | bfloat16 | HeartMuLa のデータ型（bf16 を推奨） |
| `--codec_dtype` | float32 | HeartCodec のデータ型（品質のため fp32 を推奨） |

### 処理速度 {#performance}
- RTF（実時間に対する比）はおよそ 1.0 です。4 分の曲を作るのに 4 分ほどかかります
- 出力: MP3、48kHz ステレオ、128kbps

## つまずきやすいところ {#pitfalls}
1. **HeartCodec に bf16 を使わないでください。** 音質が落ちます。fp32（既定）のままにしてください。
2. **タグが効かないことがあります。** 既知の問題（#90）です。歌詞のほうが強く効きがちなので、タグの並び順を変えて試してみてください。
3. **macOS では Triton が使えません。** GPU で速くできるのは Linux／CUDA だけです。
4. 上流の issue で **RTX 5080 で動かない**という報告があります。
5. 依存関係の固定がぶつかるため、上に書いた手動での更新と修正が必要です。

## リンク {#links}
- リポジトリ: https://github.com/HeartMuLa/heartlib
- モデル: https://huggingface.co/HeartMuLa
- 論文: https://arxiv.org/abs/2601.10547
- ライセンス: Apache-2.0
