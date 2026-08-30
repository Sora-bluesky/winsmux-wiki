---
title: "Comfyui — 拡散モデルのワークフローで画像・動画・音声を生成する"
description: "拡散モデルのワークフローで画像・動画・音声を生成する"
upstream_path: user-guide/skills/optional/creative/creative-comfyui.md
upstream_blob: 418bf365c5b449e7fdf45e5490ba002a046fcb92
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/creative/creative-comfyui
---

# Comfyui {#comfyui}

拡散モデルのワークフローで画像、動画、音声を生成します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | オプション — `hermes skills install official/creative/comfyui` で導入します |
| パス | `optional-skills/creative\comfyui` |
| バージョン | `5.1.0` |
| 作者 | ['kshitijk4poor', 'alt-glitch', 'purzbeats'] |
| ライセンス | MIT |
| 対応プラットフォーム | macos, linux, windows |
| タグ | `comfyui`, `image-generation`, `stable-diffusion`, `flux`, `sd3`, `wan-video`, `hunyuan-video`, `creative`, `generative-ai`, `video-generation` |
| 関連 skill | [`stable-diffusion`](/hermes/docs/user-guide/skills/optional/mlops/mlops-stable-diffusion/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# ComfyUI {#comfyui}

ComfyUI を通して画像、動画、音声、3D のコンテンツを生成します。導入と起動・停止には
公式の `comfy-cli` を、ワークフローの実行には REST/WebSocket API を直接
使います。

## この skill に入っているもの {#whats-in-this-skill}

**参照用ドキュメント（`references/`）:**

- `official-cli.md` — `comfy ...` の全コマンドと、そのフラグ
- `rest-api.md` — REST と WebSocket のエンドポイント（ローカルとクラウド）、送信データの形
- `workflow-format.md` — API 形式の JSON、よく使うノードの種類、パラメータの対応づけ
- `template-integrity.md` — `comfyui-workflow-templates` をエディタ形式から
  API 形式へ変換する手順。Reroute の迂回、ドット付きの動的入力キー
  （`values.a`、`resize_type.width`）、クラウド特有のクセ（302 リダイレクト、無料枠は
  同時実行 1 件、1080p の VRAM 上限）、Discord で再生できる ffmpeg の連結。
  作者は [@purzbeats](https://github.com/purzbeats) です。公式のテンプレートから
  始めるときは、必ずこれを読み込んでください。

**スクリプト（`scripts/`）:**

| スクリプト | 用途 |
|--------|---------|
| `_common.py` | 共通の HTTP 処理、クラウドへの振り分け、ノードの一覧（直接は実行しません） |
| `hardware_check.py` | GPU/VRAM/ディスクを調べ、ローカルと Comfy Cloud のどちらが向くかを示す |
| `comfyui_setup.sh` | ハードウェアの確認 + comfy-cli + ComfyUI の導入 + 起動 + 動作確認 |
| `extract_schema.py` | ワークフローを読み、変えられるパラメータとモデルの依存を並べる |
| `check_deps.py` | 稼働中のサーバーと照らし合わせ、足りないノードやモデルを並べる |
| `auto_fix_deps.py` | check_deps を走らせてから `comfy node install` / `comfy model download` を実行する |
| `run_workflow.py` | パラメータを差し込み、投入し、進み具合を見守り、出力を取得する（HTTP か WS） |
| `run_batch.py` | 値を振りながら同じワークフローを N 回投入する。並列数は契約の上限まで |
| `ws_monitor.py` | 実行中のジョブを WebSocket で実況表示する（進み具合をその場で） |
| `health_check.py` | 動作確認の一括実行 — comfy-cli、サーバー、モデル、試し撃ちまで |
| `fetch_logs.py` | ある prompt_id について、トレースバックや状態のメッセージを取り出す |

**サンプルのワークフロー（`workflows/`）:** SD 1.5、SDXL、Flux Dev、SDXL の img2img、
SDXL の部分描き直し、ESRGAN のアップスケール、AnimateDiff の動画、Wan T2V。
`workflows/README.md` を参照してください。

## いつ使うか {#when-to-use}

- 利用者が Stable Diffusion、SDXL、Flux、SD3 などで画像を作りたいと言ったとき
- 利用者が特定の ComfyUI ワークフローのファイルを走らせたいとき
- 利用者が生成の工程をつなげたいとき（txt2img → アップスケール → 顔の補正）
- ControlNet、部分描き直し、img2img など、込み入った処理が必要なとき
- 利用者が ComfyUI の待ち行列の管理、モデルの確認、カスタムノードの導入を求めたとき
- AnimateDiff、Hunyuan、Wan、AudioCraft などで動画・音声・3D を生成したいとき

## 構成: 2 つの層 {#architecture-two-layers}

<!-- ascii-guard-ignore -->
```
┌─────────────────────────────────────────────────────┐
│ Layer 1: comfy-cli (official lifecycle tool)        │
│   Setup, server lifecycle, custom nodes, models     │
│   → comfy install / launch / stop / node / model    │
└─────────────────────────┬───────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────┐
│ Layer 2: REST/WebSocket API + skill scripts         │
│   Workflow execution, param injection, monitoring   │
│   POST /api/prompt, GET /api/view, WS /ws           │
│   → run_workflow.py, run_batch.py, ws_monitor.py    │
└─────────────────────────────────────────────────────┘
```
<!-- ascii-guard-ignore-end -->

**なぜ 2 層なのか。** 公式の CLI は導入とサーバーの管理には申し分ありませんが、
ワークフローの実行はほとんど支援してくれません。その穴を埋めるのが REST/WS の API です。
CLI がやらないパラメータの差し込み、実行の見守り、出力の取得を、スクリプトが引き受けます。

## 手早く試す {#quick-start}

### 環境を調べる {#detect-environment}

```bash
# What's available?
command -v comfy >/dev/null 2>&1 && echo "comfy-cli: installed"
curl -s http://127.0.0.1:8188/system_stats 2>/dev/null && echo "server: running"

# Can this machine run ComfyUI locally? (GPU/VRAM/disk check)
python scripts/hardware_check.py
```

まだ何も入っていない場合は、下の**導入と初期設定**を見てください。ただし、
ハードウェアの確認だけは必ず先に走らせます。

### 一行でできる動作確認 {#one-line-health-check}

```bash
python scripts/health_check.py
# → JSON: comfy_cli on PATH? server reachable? at least one checkpoint? smoke-test passes?
```

## 基本の流れ {#core-workflow}

### ステップ1: API 形式のワークフロー JSON を用意する {#step-1-get-a-workflow-json-in-api-format}

ワークフローは API 形式でなければなりません（どのノードも `class_type` を持つ形です）。入手先は次のとおりです。

- ComfyUI のウェブ画面 → **Workflow → Export (API)**（新しい画面）、
  または以前の「Save (API Format)」ボタン（古い画面）
- この skill の `workflows/` ディレクトリ（そのまま動く例）
- コミュニティからの入手（civitai、Reddit、Discord）。たいていはエディタ形式なので、
  ComfyUI に読み込んでから書き出し直す必要があります

エディタ形式（最上位に `nodes` と `links` の配列がある形）は、**そのままでは
実行できません**。スクリプトはこれを見分けて、書き出し直すよう伝えます。

### ステップ2: 何を変えられるかを見る {#step-2-see-whats-controllable}

```bash
python scripts/extract_schema.py workflow_api.json --summary-only
# → {"parameter_count": 12, "has_negative_prompt": true, "has_seed": true, ...}

python scripts/extract_schema.py workflow_api.json
# → full schema with parameters, model deps, embedding refs
```

### ステップ3: パラメータを与えて実行する {#step-3-run-with-parameters}

```bash
# Local (defaults to http://127.0.0.1:8188)
python scripts/run_workflow.py \
  --workflow workflow_api.json \
  --args '{"prompt": "a beautiful sunset over mountains", "seed": -1, "steps": 30}' \
  --output-dir ./outputs

# Cloud (export API key once; uses correct /api routing automatically)
export COMFY_CLOUD_API_KEY="comfyui-..."
python scripts/run_workflow.py \
  --workflow workflow_api.json \
  --args '{"prompt": "..."}' \
  --host https://cloud.comfy.org \
  --output-dir ./outputs

# Real-time progress via WebSocket (requires `pip install websocket-client`)
python scripts/run_workflow.py \
  --workflow flux_dev.json \
  --args '{"prompt": "..."}' \
  --ws

# img2img / inpaint: pass --input-image to upload + reference automatically
python scripts/run_workflow.py \
  --workflow sdxl_img2img.json \
  --input-image image=./photo.png \
  --args '{"prompt": "make it watercolor", "denoise": 0.6}'

# Batch / sweep: 8 random seeds, parallel up to cloud tier limit
python scripts/run_batch.py \
  --workflow sdxl.json \
  --args '{"prompt": "abstract"}' \
  --count 8 --randomize-seed --parallel 3 \
  --output-dir ./outputs/batch
```

`seed` に `-1` を渡すと（あるいは `--randomize-seed` を付けて省くと）、実行のたびに
新しい乱数の種が使われます。

### ステップ4: 結果を示す {#step-4-present-results}

スクリプトは、出力ファイルの一つひとつを説明する JSON を標準出力に書きます。

```json
{
  "status": "success",
  "prompt_id": "abc-123",
  "outputs": [
    {"file": "./outputs/sdxl_00001_.png", "node_id": "9",
     "type": "image", "filename": "sdxl_00001_.png"}
  ]
}
```

## 使い分けの早見表 {#decision-tree}

| 利用者の言葉 | 使うもの | コマンド |
|-----------|------|---------|
| **導入と起動・停止（comfy-cli を使う）** | | |
| 「ComfyUI を入れて」 | comfy-cli | `bash scripts/comfyui_setup.sh` |
| 「ComfyUI を起動して」 | comfy-cli | `comfy launch --background` |
| 「ComfyUI を止めて」 | comfy-cli | `comfy stop` |
| 「X というノードを入れて」 | comfy-cli | `comfy node install <name>` |
| 「X というモデルを落として」 | comfy-cli | `comfy model download --url <url> --relative-path models/checkpoints` |
| 「入っているモデルを見せて」 | comfy-cli | `comfy model list` |
| 「入っているノードを見せて」 | comfy-cli | `comfy node show installed` |
| **実行（スクリプトを使う）** | | |
| 「準備はできている?」 | スクリプト | `health_check.py`（必要なら `--workflow X --smoke-test` を付けます） |
| 「このワークフローで何を変えられる?」 | スクリプト | `extract_schema.py W.json` |
| 「W の依存がそろっているか見て」 | スクリプト | `check_deps.py W.json` |
| 「足りない依存を直して」 | スクリプト | `auto_fix_deps.py W.json` |
| 「画像を作って」 | スクリプト | `run_workflow.py --workflow W --args '{...}'` |
| 「この画像を使って」（img2img） | スクリプト | `run_workflow.py --input-image image=./x.png ...` |
| 「乱数の種を変えて 8 通り」 | スクリプト | `run_batch.py --count 8 --randomize-seed ...` |
| 「進み具合をその場で見せて」 | スクリプト | `ws_monitor.py --prompt-id <id>` |
| 「ジョブ X のエラーを取ってきて」 | スクリプト | `fetch_logs.py <prompt_id>` |
| **REST を直接叩く** | | |
| 「待ち行列には何がある?」 | REST | `curl http://HOST:8188/queue`（ローカル）、またはクラウドなら `--host https://cloud.comfy.org` |
| 「それを取り消して」 | REST | `curl -X POST http://HOST:8188/interrupt` |
| 「GPU のメモリを空けて」 | REST | `curl -X POST http://HOST:8188/free` |

## 導入と初期設定 {#setup-onboarding}

利用者から ComfyUI を用意してほしいと言われたら、**まず最初にすることは、
Comfy Cloud（ホスト型、導入なし、API キー）とローカル（自分のマシンに ComfyUI を
入れる）のどちらがよいかを尋ねること**です。答えをもらうまで、導入のコマンドも
ハードウェアの確認も始めないでください。

**公式ドキュメント:** https://docs.comfy.org/installation
**CLI のドキュメント:** https://docs.comfy.org/comfy-cli/getting-started
**クラウドのドキュメント:** https://docs.comfy.org/get_started/cloud
**クラウドの API:** https://docs.comfy.org/development/cloud/overview

### ステップ0: ローカルかクラウドかを尋ねる（必ず最初に） {#step-0-ask-local-vs-cloud-always-first}

こんなふうに尋ねます。

> 「ComfyUI をご自分のマシンで動かしたいですか。それとも Comfy Cloud を使いますか。
>
> - **Comfy Cloud** — RTX 6000 Pro の GPU 上で動き、よく使うモデルは最初から入っていて、
>   準備は要りません。API キーが必要です（ワークフローを実際に走らせるには有料の契約が
>   必要で、無料枠は閲覧だけです）。手元に十分な GPU がないなら、こちらが向いています。
> - **ローカル** — 無料ですが、マシンが次のいずれかを満たしている必要があります。
>   - **6 GB 以上の VRAM** を積んだ NVIDIA の GPU（SDXL なら 8 GB 以上、Flux や動画なら 12 GB 以上）、または
>   - ROCm に対応した AMD の GPU（Linux）、または
>   - **16 GB 以上のユニファイドメモリ**を積んだ Apple Silicon の Mac（M1 以降。32 GB 以上を推奨）。
>   - Intel の Mac や GPU のないマシンでは動きません。かわりにクラウドを使ってください。
>
> どちらにしますか。」

振り分け方は次のとおりです。

- **クラウド** → **経路 A** へ飛びます。
- **ローカル** → まずハードウェアの確認を走らせ、その判定に応じて経路 B〜E から選びます。
- **決めかねている** → ハードウェアの確認を走らせ、その判定に任せます。

### ステップ1: ハードウェアを確認する（ローカルを選んだときだけ） {#step-1-verify-hardware-only-if-user-chose-local}

```bash
python scripts/hardware_check.py --json
# Optional: also probe `torch` for actual CUDA/MPS:
python scripts/hardware_check.py --json --check-pytorch
```

| 判定    | 意味                                                       | すること |
|------------|---------------------------------------------------------------|--------|
| `ok`       | 単体 GPU で 8 GB 以上の VRAM、または Apple Silicon で 32 GB 以上のユニファイドメモリ       | ローカルに導入します。レポートの `comfy_cli_flag` を使ってください |
| `marginal` | SD1.5 は動きます。SDXL はぎりぎり。Flux や動画は厳しいでしょう                  | 軽いワークフローならローカルで構いません。そうでなければ **経路 A（クラウド）** |
| `cloud`    | 使える GPU がない、VRAM が &lt;6 GB、Apple のユニファイドメモリが &lt;16 GB、Intel Mac、Rosetta 上の Python | 利用者がはっきりローカルを押し通さないかぎり、**クラウドに切り替えます** |

このスクリプトは `wsl: true`（NVIDIA のパススルーが効く WSL2）や
`rosetta: true`（Apple Silicon 上の x86_64 版 Python。ARM64 版で入れ直す必要があります）も併せて示します。

判定が `cloud` なのに利用者がローカルを望む場合、黙って進めてはいけません。
`notes` の配列をそのまま見せて、(a) クラウドに切り替えるか、(b) ローカルへの導入を
押し通すか（今どきのモデルではメモリ不足になるか、使い物にならないほど遅くなります）を尋ねてください。

### 導入の経路を選ぶ {#choosing-an-installation-path}

まずハードウェアの確認を使います。下の表は、利用者からすでに機材を聞いている
場合の代わりの目安です。

| 状況 | おすすめの経路 |
|-----------|------------------|
| ハードウェアの確認で `verdict: cloud` が出た | **経路 A: Comfy Cloud** |
| GPU がない / まずは気軽に試したい | **経路 A: Comfy Cloud** |
| Windows + NVIDIA + 技術に明るくない | **経路 B: ComfyUI Desktop** |
| Windows + NVIDIA + 技術に明るい | **経路 C: ポータブル版** または **経路 D: comfy-cli** |
| Linux + 何らかの GPU | **経路 D: comfy-cli**（いちばん簡単） |
| macOS + Apple Silicon | **経路 B: Desktop** または **経路 D: comfy-cli** |
| 画面なし / サーバー / CI / エージェント | **経路 D: comfy-cli** |

すべて自動で進める経路（ハードウェアの確認 → 導入 → 起動 → 動作確認）は次のとおりです。

```bash
bash scripts/comfyui_setup.sh
# Or with overrides:
bash scripts/comfyui_setup.sh --m-series --port=8190 --workspace=/data/comfy
```

このスクリプトは内部で `hardware_check.py` を走らせ、判定が `cloud` のときは
（`--force-cloud-override` がないかぎり）ローカルへの導入を断り、`comfy-cli` に
渡すべきフラグを選び、システムの Python を汚さないように全体向けの `pip` より
`pipx`/`uvx` を優先します。

---

### 経路 A: Comfy Cloud（ローカルには入れない） {#path-a-comfy-cloud-no-local-install}

十分な GPU がない人や、準備を一切したくない人向けです。RTX 6000 Pro 上で動きます。

**ドキュメント:** https://docs.comfy.org/get_started/cloud

1. https://comfy.org/cloud で登録します
2. https://platform.comfy.org/login で API キーを作ります
3. キーを設定します:
   ```bash
   export COMFY_CLOUD_API_KEY="your-comfyui-key"
   ```
4. ワークフローを実行します:
   ```bash
   python scripts/run_workflow.py \
     --workflow workflows/flux_dev_txt2img.json \
     --args '{"prompt": "..."}' \
     --host https://cloud.comfy.org \
     --output-dir ./outputs
   ```

**料金:** https://www.comfy.org/cloud/pricing
**同時に流せるジョブ数:** Free/Standard は 1、Creator は 3、Pro は 5 です。無料枠は
**API からワークフローを実行できません**。モデルを見られるだけです。`/api/prompt`、
`/api/upload/*`、`/api/view` などを使うには有料の契約が必要です。

---

### 経路 B: ComfyUI Desktop（Windows / macOS） {#path-b-comfyui-desktop-windows-macos}

技術に明るくない人向けの、ワンクリックのインストーラーです。今のところベータ版です。

**ドキュメント:** https://docs.comfy.org/installation/desktop
- **Windows（NVIDIA）:** https://download.comfy.org/windows/nsis/x64
- **macOS（Apple Silicon）:** https://comfy.org

Desktop は Linux に**対応していません**。経路 D を使ってください。

---

### 経路 C: ComfyUI のポータブル版（Windows のみ） {#path-c-comfyui-portable-windows-only}

**ドキュメント:** https://docs.comfy.org/installation/comfyui_portable_windows

https://github.com/comfyanonymous/ComfyUI/releases から入手して展開し、
`run_nvidia_gpu.bat` を実行します。更新は `update/update_comfyui_stable.bat` で行います。

---

### 経路 D: comfy-cli（全プラットフォーム — エージェントにはこれを推奨） {#path-d-comfy-cli-all-platforms-recommended-for-agents}

画面のない環境や自動化した環境には、公式の CLI がいちばん向いています。

**ドキュメント:** https://docs.comfy.org/comfy-cli/getting-started

#### comfy-cli を入れる {#install-comfy-cli}

```bash
# Recommended:
pipx install comfy-cli
# Or use uvx without installing:
uvx --from comfy-cli comfy --help
# Or (if pipx/uvx unavailable):
pip install --user comfy-cli
```

対話なしで利用状況の送信を切るには、次のようにします。
```bash
comfy --skip-prompt tracking disable
```

#### ComfyUI を入れる {#install-comfyui}

```bash
comfy --skip-prompt install --nvidia              # NVIDIA (CUDA)
comfy --skip-prompt install --amd                 # AMD (ROCm, Linux)
comfy --skip-prompt install --m-series            # Apple Silicon (MPS)
comfy --skip-prompt install --cpu                 # CPU only (slow)
comfy --skip-prompt install --nvidia --fast-deps  # uv-based dep resolution
```

既定の置き場所は `~/comfy/ComfyUI`（Linux）と `~/Documents/comfy/ComfyUI`
（macOS/Windows）です。`comfy --workspace /custom/path install` で変えられます。

#### 起動と動作確認 {#launch-verify}

```bash
comfy launch --background                       # background daemon on :8188
comfy launch -- --listen 0.0.0.0 --port 8190    # LAN-accessible custom port
curl -s http://127.0.0.1:8188/system_stats      # health check
```

---

### 経路 E: 手作業での導入（上級者 / 対応していないハードウェア） {#path-e-manual-install-advanced-unsupported-hardware}

Ascend NPU、Cambricon MLU、Intel Arc など、対応していないハードウェア向けです。

**ドキュメント:** https://docs.comfy.org/installation/manual_install

```bash
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI
pip install torch torchvision torchaudio --extra-index-url https://download.pytorch.org/whl/cu130
pip install -r requirements.txt
python main.py
```

---

### 導入後: モデルを取得する {#post-install-download-models}

```bash
# SDXL (general purpose, ~6.5 GB)
comfy model download \
  --url "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors" \
  --relative-path models/checkpoints

# SD 1.5 (lighter, ~4 GB, good for 6 GB cards)
comfy model download \
  --url "https://huggingface.co/stable-diffusion-v1-5/stable-diffusion-v1-5/resolve/main/v1-5-pruned-emaonly.safetensors" \
  --relative-path models/checkpoints

# Flux Dev fp8 (smaller variant, ~12 GB)
comfy model download \
  --url "https://huggingface.co/Comfy-Org/flux1-dev/resolve/main/flux1-dev-fp8.safetensors" \
  --relative-path models/checkpoints

# CivitAI (set token first):
comfy model download \
  --url "https://civitai.com/api/download/models/128713" \
  --relative-path models/checkpoints \
  --set-civitai-api-token "YOUR_TOKEN"
```

入っているものの一覧は `comfy model list` で見られます。

### 導入後: カスタムノードを入れる {#post-install-install-custom-nodes}

```bash
comfy node install comfyui-impact-pack             # popular utility pack
comfy node install comfyui-animatediff-evolved     # video generation
comfy node install comfyui-controlnet-aux          # ControlNet preprocessors
comfy node install comfyui-essentials              # common helpers
comfy node update all
comfy node install-deps --workflow=workflow.json   # install everything a workflow needs
```

### 導入後: 動作を確かめる {#post-install-verify}

```bash
python scripts/health_check.py
# → comfy_cli on PATH? server reachable? checkpoints? smoke test?

python scripts/check_deps.py my_workflow.json
# → are this workflow's nodes/models/embeddings installed?

python scripts/run_workflow.py \
  --workflow workflows/sd15_txt2img.json \
  --args '{"prompt": "test", "steps": 4}' \
  --output-dir ./test-outputs
```

## 画像のアップロード（img2img / 部分描き直し） {#image-upload-img2img-inpainting}

いちばん簡単なのは、`run_workflow.py` に `--input-image` を付ける方法です。

```bash
python scripts/run_workflow.py \
  --workflow workflows/sdxl_img2img.json \
  --input-image image=./photo.png \
  --args '{"prompt": "make it cyberpunk", "denoise": 0.6}'
```

このフラグは `photo.png` をアップロードし、サーバー側でのファイル名を、スキーマ上で
`image` という名前が付いたパラメータに差し込みます。部分描き直しでは、次のように両方渡します。

```bash
python scripts/run_workflow.py \
  --workflow workflows/sdxl_inpaint.json \
  --input-image image=./photo.png \
  --input-image mask_image=./mask.png \
  --args '{"prompt": "fill with flowers"}'
```

REST で自分でアップロードする場合は次のとおりです。
```bash
curl -X POST "http://127.0.0.1:8188/upload/image" \
  -F "image=@photo.png" -F "type=input" -F "overwrite=true"
# Returns: {"name": "photo.png", "subfolder": "", "type": "input"}

# Cloud equivalent:
curl -X POST "https://cloud.comfy.org/api/upload/image" \
  -H "X-API-Key: $COMFY_CLOUD_API_KEY" \
  -F "image=@photo.png" -F "type=input" -F "overwrite=true"
```

## クラウド特有の話 {#cloud-specifics}

- **ベース URL:** `https://cloud.comfy.org`
- **認証:** `X-API-Key` ヘッダー（WebSocket では `?token=KEY`）
- **API キー:** `$COMFY_CLOUD_API_KEY` を一度設定しておけば、スクリプトが自動で拾います
- **出力の取得:** `/api/view` は署名付き URL への 302 を返します。スクリプトはそれを
  たどり、保管先から取得する前に `X-API-Key` を外します
  （S3/CloudFront に API キーを漏らさないためです）。
- **ローカルの ComfyUI との違い:**
  - `/api/object_info`、`/api/queue`、`/api/userdata` は **無料枠では 403** になります。
    有料の契約が必要です。
  - `/history` はクラウドでは `/history_v2` という名前になっています（スクリプトが
    自動で振り分けます）。
  - `/models/<folder>` はクラウドでは `/experiment/models/<folder>` になっています
    （スクリプトが自動で振り分けます）。
  - WebSocket の `clientId` は今のところ無視されます。同じ利用者の接続はすべて同じ
    配信を受け取るので、`prompt_id` で手元より分けてください。
  - アップロード時の `subfolder` は受け付けられますが無視されます。クラウドの
    名前空間は平坦です。
- **同時に流せるジョブ数:** Free/Standard は 1、Creator は 3、Pro は 5 です。あふれた分は
  自動で待ち行列に並びます。契約の上限まで使い切るには `run_batch.py --parallel N` を使います。

## 待ち行列とシステムの管理 {#queue-system-management}

```bash
# Local
curl -s http://127.0.0.1:8188/queue | python -m json.tool
curl -X POST http://127.0.0.1:8188/queue -d '{"clear": true}'    # cancel pending
curl -X POST http://127.0.0.1:8188/interrupt                      # cancel running
curl -X POST http://127.0.0.1:8188/free \
  -H "Content-Type: application/json" \
  -d '{"unload_models": true, "free_memory": true}'

# Cloud — same paths under /api/, plus:
python scripts/fetch_logs.py --tail-queue --host https://cloud.comfy.org
```

## 落とし穴 {#pitfalls}

1. **API 形式であることが前提です** — どのスクリプトも `/api/prompt` のエンドポイントも、
   API 形式のワークフロー JSON を期待します。スクリプトはエディタ形式（最上位に
   `nodes` と `links` の配列がある形）を見分けて、
   「Workflow → Export (API)」（新しい画面）か「Save (API Format)」（古い画面）で
   書き出し直すよう伝えます。

2. **サーバーが動いている必要があります** — 実行には必ず生きたサーバーが要ります。
   `comfy launch --background` で立ち上がります。
   `curl http://127.0.0.1:8188/system_stats` で確かめてください。

3. **モデル名は正確に** — 大文字と小文字を区別し、拡張子まで含みます。
   `check_deps.py` はある程度あいまいに照合します（拡張子やフォルダの前置きの
   有無を吸収します）が、ワークフロー自体は正式な名前を使う必要があります。
   何が入っているかは `comfy model list` で調べられます。

4. **カスタムノードが足りない** — 「class_type not found」は、必要なノードが
   入っていないという意味です。どのパッケージを入れればよいかは `check_deps.py` が
   教えてくれますし、`auto_fix_deps.py` が導入まで代わりに行います。

5. **作業ディレクトリ** — `comfy-cli` は ComfyUI の作業場所を自動で見つけます。
   「no workspace found」でコマンドが失敗するときは、
   `comfy --workspace /path/to/ComfyUI <command>` を使うか、
   `comfy set-default /path/to/ComfyUI` を実行してください。

6. **クラウド無料枠の API 制限** — `/api/prompt`、`/api/view`、`/api/upload/*`、
   `/api/object_info` は無料のアカウントではすべて 403 を返します。`health_check.py` と
   `check_deps.py` はこれを穏当に扱い、はっきりしたメッセージを出します。

7. **動画・音声のワークフローの待ち時間** — 出力ノードが `VHS_VideoCombine` や
   `SaveVideo` などのときは自動で判定され、既定の待ち時間が 300 秒から
   900 秒に伸びます。`--timeout 1800` で明示的に上書きできます。

8. **出力ファイル名によるディレクトリの遡り** — サーバーから返ったファイル名は
   `safe_path_join` を通し、`--output-dir` の外へ出るものを拒みます。
   この保護は切らないでください。保存ノードを自作したワークフローは、任意のパスを作れます。

9. **ワークフローの JSON は実質コードです** — カスタムノードは Python を動かすので、
   素性の知れないワークフローを投入することは `eval` と同じ信頼度になります。
   信頼できない出どころのワークフローは、走らせる前に中身を確かめてください。

10. **乱数の種の自動割り当て** — `--args` に `seed: -1` を渡す（または
    `--randomize-seed` を付けて seed を省く）と、実行のたびに新しい種になります。
    実際に使われた種は標準エラー出力に記録されます。

11. **`tracking` の確認** — `comfy` の初回実行では、利用状況の送信について
    尋ねられることがあります。`comfy --skip-prompt tracking disable` を使えば、
    対話なしで飛ばせます。`comfyui_setup.sh` はこれを代わりに行います。

## 動作確認のチェックリスト {#verification-checklist}

`python scripts/health_check.py` を使えば、この一覧をまとめて確認できます。手作業でやる場合は次のとおりです。

- [ ] `hardware_check.py` の判定が `ok` である、または利用者がはっきり Comfy Cloud を選んだ
- [ ] `comfy --version` が動く（または `uvx --from comfy-cli comfy --help` が動く）
- [ ] `curl http://HOST:PORT/system_stats` が JSON を返す
- [ ] `comfy model list` にチェックポイントが少なくとも 1 つ出る（ローカル）、または
      `/api/experiment/models/checkpoints` がモデルを返す（クラウド）
- [ ] ワークフローの JSON が API 形式になっている
- [ ] `check_deps.py` が `is_ready: true` を返す（クラウドの無料枠では
      `node_check_skipped` だけが出る状態でも可）
- [ ] 小さなワークフローの試し撃ちが完走し、出力が `--output-dir` に落ちている
