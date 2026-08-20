---
title: "Comfyui — 拡散モデルのワークフローで画像・動画・音声を生成する"
description: "拡散モデルのワークフローで画像・動画・音声を生成する"
upstream_path: user-guide/skills/bundled/creative/creative-comfyui.md
upstream_blob: 5276ffaa0d03566e4b9bf8d30d158f6ecfc6bf40
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/creative/creative-comfyui
---

# Comfyui {#comfyui}

拡散モデルのワークフローで画像・動画・音声を生成します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/creative/comfyui` |
| バージョン | `5.1.0` |
| 作者 | ['kshitijk4poor', 'alt-glitch', 'purzbeats'] |
| ライセンス | MIT |
| 対応プラットフォーム | macos, linux, windows |
| タグ | `comfyui`, `image-generation`, `stable-diffusion`, `flux`, `sd3`, `wan-video`, `hunyuan-video`, `creative`, `generative-ai`, `video-generation` |
| 関連 skill | [`stable-diffusion`](/hermes/docs/user-guide/skills/optional/mlops/mlops-stable-diffusion/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として見ています。
:::

# ComfyUI {#comfyui}

ComfyUI を使って画像・動画・音声・3D コンテンツを生成します。セットアップと起動停止には公式の
`comfy-cli` を、ワークフローの実行には REST/WebSocket API を直接使います。

## この skill に入っているもの {#whats-in-this-skill}

**参照ドキュメント（`references/`）:**

- `official-cli.md` — `comfy ...` コマンドの全一覧とフラグ
- `rest-api.md` — REST と WebSocket のエンドポイント（ローカル・クラウド両方）、ペイロードの形式
- `workflow-format.md` — API 形式の JSON、よく使うノードの種類、パラメータの対応
- `template-integrity.md` — `comfyui-workflow-templates` をエディタ形式から API 形式へ変換する方法。
  Reroute の迂回、ドット付きの動的入力キー
  （`values.a`、`resize_type.width`）、クラウド特有の挙動（302 リダイレクト、無料枠は同時実行 1 件、
  1080p の VRAM 上限）、Discord で再生できる ffmpeg の結合まで扱います。
  執筆は [@purzbeats](https://github.com/purzbeats)。公式テンプレートから始めるときは必ず読み込んでください。

**スクリプト（`scripts/`）:**

| スクリプト | 用途 |
|--------|---------|
| `_common.py` | HTTP 処理・クラウドへの振り分け・ノード一覧の共通部分（直接実行はしません） |
| `hardware_check.py` | GPU/VRAM/ディスクを調べて、ローカルと Comfy Cloud のどちらが向くか判定します |
| `comfyui_setup.sh` | ハードウェア確認 + comfy-cli + ComfyUI の導入 + 起動 + 動作確認 |
| `extract_schema.py` | ワークフローを読んで、変更できるパラメータと必要なモデルを一覧にします |
| `check_deps.py` | 起動中のサーバーとワークフローを突き合わせ、足りないノードやモデルを挙げます |
| `auto_fix_deps.py` | check_deps を実行し、`comfy node install` / `comfy model download` まで走らせます |
| `run_workflow.py` | パラメータを差し込んで送信し、進行を見守り、出力を受け取ります（HTTP または WS） |
| `run_batch.py` | 値を振りながら同じワークフローを N 回投げます。契約プランの上限まで並列実行します |
| `ws_monitor.py` | 実行中のジョブを WebSocket でリアルタイムに眺めます（進捗が随時出ます） |
| `health_check.py` | 動作確認の一括実行 — comfy-cli とサーバーとモデルを見て、試し生成まで行います |
| `fetch_logs.py` | 指定した prompt_id のトレースバックや状態メッセージを取り出します |

**ワークフローの例（`workflows/`）:** SD 1.5、SDXL、Flux Dev、SDXL img2img、
SDXL inpaint、ESRGAN のアップスケール、AnimateDiff の動画、Wan T2V。詳しくは
`workflows/README.md` を見てください。

## こんなときに使います {#when-to-use}

- Stable Diffusion、SDXL、Flux、SD3 などで画像を生成したいと言われたとき
- 特定の ComfyUI ワークフローファイルを実行したいとき
- 生成処理をつなげたいとき（txt2img → アップスケール → 顔の補正）
- ControlNet、インペイント、img2img といった凝ったパイプラインが必要なとき
- ComfyUI のキュー管理、モデルの確認、カスタムノードの追加を頼まれたとき
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

**なぜ 2 層なのか。** 公式 CLI は導入とサーバー管理には申し分ないのですが、ワークフローの実行まわりは
ほとんど面倒を見てくれません。そこを REST/WS API が埋めます。パラメータの差し込み、実行中の監視、
出力の受け取りといった CLI がやらない部分をスクリプトが担当します。

## まず動かす {#quick-start}

### 環境を調べる {#detect-environment}

```bash
# What's available?
command -v comfy >/dev/null 2>&1 && echo "comfy-cli: installed"
curl -s http://127.0.0.1:8188/system_stats 2>/dev/null && echo "server: running"

# Can this machine run ComfyUI locally? (GPU/VRAM/disk check)
python3 scripts/hardware_check.py
```

上のコマンドで何も入っていないと分かったら、後半の **セットアップと導入の流れ** を見てください。ただし、
ハードウェアの確認だけは必ず先に済ませます。

### 一行で状態を確認する {#one-line-health-check}

```bash
python3 scripts/health_check.py
# → JSON: comfy_cli on PATH? server reachable? at least one checkpoint? smoke-test passes?
```

## 基本の流れ {#core-workflow}

### ステップ 1: API 形式のワークフロー JSON を用意する {#step-1-get-a-workflow-json-in-api-format}

ワークフローは API 形式（各ノードに `class_type` がある形）である必要があります。入手先は次のとおりです。

- ComfyUI のウェブ画面 → **Workflow → Export (API)**（新しい画面）または
  従来の「Save (API Format)」ボタン（古い画面）
- この skill の `workflows/` ディレクトリ（そのまま動く例）
- コミュニティからのダウンロード（civitai、Reddit、Discord）— たいていエディタ形式なので、
  いったん ComfyUI に読み込んでから書き出し直します

エディタ形式（最上位に `nodes` と `links` の配列がある形）は **そのままでは実行できません**。
スクリプトがこれを検出して、書き出し直すよう伝えます。

### ステップ 2: 何を変えられるか見る {#step-2-see-whats-controllable}

```bash
python3 scripts/extract_schema.py workflow_api.json --summary-only
# → {"parameter_count": 12, "has_negative_prompt": true, "has_seed": true, ...}

python3 scripts/extract_schema.py workflow_api.json
# → full schema with parameters, model deps, embedding refs
```

### ステップ 3: パラメータを指定して実行する {#step-3-run-with-parameters}

```bash
# Local (defaults to http://127.0.0.1:8188)
python3 scripts/run_workflow.py \
  --workflow workflow_api.json \
  --args '{"prompt": "a beautiful sunset over mountains", "seed": -1, "steps": 30}' \
  --output-dir ./outputs

# Cloud (export API key once; uses correct /api routing automatically)
export COMFY_CLOUD_API_KEY="comfyui-..."
python3 scripts/run_workflow.py \
  --workflow workflow_api.json \
  --args '{"prompt": "..."}' \
  --host https://cloud.comfy.org \
  --output-dir ./outputs

# Real-time progress via WebSocket (requires `pip install websocket-client`)
python3 scripts/run_workflow.py \
  --workflow flux_dev.json \
  --args '{"prompt": "..."}' \
  --ws

# img2img / inpaint: pass --input-image to upload + reference automatically
python3 scripts/run_workflow.py \
  --workflow sdxl_img2img.json \
  --input-image image=./photo.png \
  --args '{"prompt": "make it watercolor", "denoise": 0.6}'

# Batch / sweep: 8 random seeds, parallel up to cloud tier limit
python3 scripts/run_batch.py \
  --workflow sdxl.json \
  --args '{"prompt": "abstract"}' \
  --count 8 --randomize-seed --parallel 3 \
  --output-dir ./outputs/batch
```

`seed` に `-1` を渡す（または `--randomize-seed` を付けて seed を省く）と、実行ごとに新しい乱数の
シードが選ばれます。

### ステップ 4: 結果を見せる {#step-4-present-results}

スクリプトは、出力ファイル 1 つ 1 つを説明する JSON を標準出力に流します。

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

## 判断早見表 {#decision-tree}

| 言われたこと | 使うもの | コマンド |
|-----------|------|---------|
| **起動停止まわり（comfy-cli を使う）** | | |
| 「ComfyUI を入れて」 | comfy-cli | `bash scripts/comfyui_setup.sh` |
| 「ComfyUI を動かして」 | comfy-cli | `comfy launch --background` |
| 「ComfyUI を止めて」 | comfy-cli | `comfy stop` |
| 「X ノードを入れて」 | comfy-cli | `comfy node install <name>` |
| 「X モデルを落として」 | comfy-cli | `comfy model download --url <url> --relative-path models/checkpoints` |
| 「入っているモデルを見せて」 | comfy-cli | `comfy model list` |
| 「入っているノードを見せて」 | comfy-cli | `comfy node show installed` |
| **実行まわり（スクリプトを使う）** | | |
| 「準備はできてる?」 | スクリプト | `health_check.py`（必要なら `--workflow X --smoke-test` を付けます） |
| 「このワークフローで何を変えられる?」 | スクリプト | `extract_schema.py W.json` |
| 「W に必要なものが揃っているか見て」 | スクリプト | `check_deps.py W.json` |
| 「足りないものを入れて」 | スクリプト | `auto_fix_deps.py W.json` |
| 「画像を作って」 | スクリプト | `run_workflow.py --workflow W --args '{...}'` |
| 「この画像を使って」（img2img） | スクリプト | `run_workflow.py --input-image image=./x.png ...` |
| 「シードを変えて 8 パターン」 | スクリプト | `run_batch.py --count 8 --randomize-seed ...` |
| 「進み具合を見せて」 | スクリプト | `ws_monitor.py --prompt-id <id>` |
| 「ジョブ X のエラーを見せて」 | スクリプト | `fetch_logs.py <prompt_id>` |
| **REST を直接叩く** | | |
| 「キューには何が入ってる?」 | REST | `curl http://HOST:8188/queue`（ローカル）または `--host https://cloud.comfy.org` |
| 「今のをやめて」 | REST | `curl -X POST http://HOST:8188/interrupt` |
| 「GPU のメモリを空けて」 | REST | `curl -X POST http://HOST:8188/free` |

## セットアップと導入の流れ {#setup-onboarding}

ComfyUI のセットアップを頼まれたら、**まず最初に聞くのは、Comfy Cloud（ホスト型・インストール不要・
API キーが要る）か、ローカル（自分のマシンに ComfyUI を入れる）か** です。答えをもらう前に、
インストールのコマンドやハードウェアの確認を始めないでください。

**公式ドキュメント:** https://docs.comfy.org/installation
**CLI のドキュメント:** https://docs.comfy.org/comfy-cli/getting-started
**クラウドのドキュメント:** https://docs.comfy.org/get_started/cloud
**クラウド API:** https://docs.comfy.org/development/cloud/overview

### ステップ 0: ローカルかクラウドかを聞く（必ず最初に） {#step-0-ask-local-vs-cloud-always-first}

聞き方の例です。

> 「ComfyUI を自分のマシンで動かしますか。それとも Comfy Cloud を使いますか。
>
> - **Comfy Cloud** — RTX 6000 Pro の GPU で動き、よく使うモデルは入った状態で、
>   セットアップは不要です。API キーが必要です（実際にワークフローを回すには有料契約が要ります。
>   無料枠は閲覧のみ）。手元に十分な GPU がないならこちらです。
> - **ローカル** — 無料ですが、マシンが次の条件を満たしている必要があります。
>   - **6 GB 以上の VRAM** を持つ NVIDIA GPU（SDXL なら 8 GB 以上、Flux や動画なら 12 GB 以上）、または
>   - ROCm に対応した AMD GPU（Linux）、または
>   - **16 GB 以上のユニファイドメモリ** を積んだ Apple Silicon の Mac（M1 以降。32 GB 以上を推奨）。
>   - Intel Mac や GPU のないマシンでは動きません。クラウドを使ってください。
>
> どちらにしますか。」

振り分けは次のとおりです。

- **クラウド** → **経路 A** へ進みます。
- **ローカル** → 先にハードウェアを確認し、その判定に応じて 経路 B〜E から選びます。
- **決めかねている** → ハードウェアを確認して、その判定に決めてもらいます。

### ステップ 1: ハードウェアを確認する（ローカルを選んだときだけ） {#step-1-verify-hardware-only-if-user-chose-local}

```bash
python3 scripts/hardware_check.py --json
# Optional: also probe `torch` for actual CUDA/MPS:
python3 scripts/hardware_check.py --json --check-pytorch
```

| 判定    | 意味                                                       | やること |
|------------|---------------------------------------------------------------|--------|
| `ok`       | VRAM 8 GB 以上（単体 GPU）、またはユニファイドメモリ 32 GB 以上（Apple Silicon）       | ローカルに導入します。レポートの `comfy_cli_flag` を使ってください |
| `marginal` | SD1.5 は動きます。SDXL は厳しく、Flux や動画はほぼ無理です                  | 軽いワークフローならローカルで大丈夫です。そうでなければ **経路 A（クラウド）** へ |
| `cloud`    | 使える GPU がない、VRAM &lt;6 GB、Apple のユニファイドメモリ &lt;16 GB、Intel Mac、Rosetta 上の Python | 利用者がどうしてもローカルと言わない限り **クラウドに切り替えます** |

このスクリプトは `wsl: true`（NVIDIA を渡した WSL2）と
`rosetta: true`（Apple Silicon 上で x86_64 の Python が動いている状態。ARM64 で入れ直しが必要）も知らせます。

判定が `cloud` なのに利用者がローカルを望む場合、黙って進めてはいけません。
`notes` の配列をそのまま見せたうえで、(a) クラウドに切り替えるか、(b) それでもローカルに入れるか
（最近のモデルではメモリ不足で落ちるか、使い物にならないほど遅くなります）を聞いてください。

### 導入経路の選び方 {#choosing-an-installation-path}

まずハードウェアの確認を行ってください。下の表は、利用者からハードウェアをすでに聞いている場合の
代わりの目安です。

| 状況 | おすすめの経路 |
|-----------|------------------|
| ハードウェア確認が `verdict: cloud` | **経路 A: Comfy Cloud** |
| GPU がない / まずは気軽に試したい | **経路 A: Comfy Cloud** |
| Windows + NVIDIA + 技術に明るくない | **経路 B: ComfyUI Desktop** |
| Windows + NVIDIA + 技術に明るい | **経路 C: ポータブル版** または **経路 D: comfy-cli** |
| Linux + 何らかの GPU | **経路 D: comfy-cli**（いちばん簡単です） |
| macOS + Apple Silicon | **経路 B: Desktop** または **経路 D: comfy-cli** |
| 画面なし / サーバー / CI / エージェント | **経路 D: comfy-cli** |

すべて自動でやる場合（ハードウェア確認 → 導入 → 起動 → 動作確認）は次のとおりです。

```bash
bash scripts/comfyui_setup.sh
# Or with overrides:
bash scripts/comfyui_setup.sh --m-series --port=8190 --workspace=/data/comfy
```

このスクリプトは内部で `hardware_check.py` を実行し、判定が `cloud` のときはローカル導入を拒みます
（`--force-cloud-override` を付けた場合を除く）。さらに適切な
`comfy-cli` のフラグを選び、システムの Python を汚さないよう、global な `pip` より `pipx`/`uvx` を優先します。

---

### 経路 A: Comfy Cloud（ローカルに何も入れない） {#path-a-comfy-cloud-no-local-install}

十分な GPU がない方や、セットアップを一切したくない方向けです。RTX 6000 Pro 上で動きます。

**ドキュメント:** https://docs.comfy.org/get_started/cloud

1. https://comfy.org/cloud で登録します
2. https://platform.comfy.org/login で API キーを発行します
3. キーを設定します:
   ```bash
   export COMFY_CLOUD_API_KEY="your-comfyui-key"
   ```
4. ワークフローを実行します:
   ```bash
   python3 scripts/run_workflow.py \
     --workflow workflows/flux_dev_txt2img.json \
     --args '{"prompt": "..."}' \
     --host https://cloud.comfy.org \
     --output-dir ./outputs
   ```

**料金:** https://www.comfy.org/cloud/pricing
**同時実行数:** Free/Standard は 1、Creator は 3、Pro は 5 です。無料枠では
**API からワークフローを実行できません**。モデルを眺めるだけです。`/api/prompt`、`/api/upload/*`、`/api/view` などには
有料契約が必要です。

---

### 経路 B: ComfyUI Desktop（Windows / macOS） {#path-b-comfyui-desktop-windows-macos}

技術に明るくない方向けの、ワンクリック導入版です。現在はベータです。

**ドキュメント:** https://docs.comfy.org/installation/desktop
- **Windows（NVIDIA）:** https://download.comfy.org/windows/nsis/x64
- **macOS（Apple Silicon）:** https://comfy.org

Desktop 版は Linux に **対応していません**。経路 D を使ってください。

---

### 経路 C: ComfyUI ポータブル版（Windows 限定） {#path-c-comfyui-portable-windows-only}

**ドキュメント:** https://docs.comfy.org/installation/comfyui_portable_windows

https://github.com/comfyanonymous/ComfyUI/releases からダウンロードして展開し、
`run_nvidia_gpu.bat` を実行します。更新は `update/update_comfyui_stable.bat` から行います。

---

### 経路 D: comfy-cli（全プラットフォーム対応。エージェントにはこれを推奨） {#path-d-comfy-cli-all-platforms-recommended-for-agents}

画面なしで自動化したい場合、公式 CLI がいちばん向いています。

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

対話なしで解析データの送信を止めるには次のようにします。
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

既定の場所は `~/comfy/ComfyUI`（Linux）、`~/Documents/comfy/ComfyUI`
（macOS/Win）です。`comfy --workspace /custom/path install` で変えられます。

#### 起動と動作確認 {#launch-verify}

```bash
comfy launch --background                       # background daemon on :8188
comfy launch -- --listen 0.0.0.0 --port 8190    # LAN-accessible custom port
curl -s http://127.0.0.1:8188/system_stats      # health check
```

---

### 経路 E: 手動での導入（上級者向け / 非対応ハードウェア） {#path-e-manual-install-advanced-unsupported-hardware}

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

### 導入後: モデルをダウンロードする {#post-install-download-models}

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

入っているものを一覧するには `comfy model list` を実行します。

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
python3 scripts/health_check.py
# → comfy_cli on PATH? server reachable? checkpoints? smoke test?

python3 scripts/check_deps.py my_workflow.json
# → are this workflow's nodes/models/embeddings installed?

python3 scripts/run_workflow.py \
  --workflow workflows/sd15_txt2img.json \
  --args '{"prompt": "test", "steps": 4}' \
  --output-dir ./test-outputs
```

## 画像のアップロード（img2img / インペイント） {#image-upload-img2img-inpainting}

いちばん簡単なのは、`run_workflow.py` に `--input-image` を渡す方法です。

```bash
python3 scripts/run_workflow.py \
  --workflow workflows/sdxl_img2img.json \
  --input-image image=./photo.png \
  --args '{"prompt": "make it cyberpunk", "denoise": 0.6}'
```

このフラグは `photo.png` をアップロードしたうえで、サーバー側のファイル名を、スキーマの中で
`image` という名前のパラメータに差し込みます。インペイントでは両方を渡します。

```bash
python3 scripts/run_workflow.py \
  --workflow workflows/sdxl_inpaint.json \
  --input-image image=./photo.png \
  --input-image mask_image=./mask.png \
  --args '{"prompt": "fill with flowers"}'
```

REST で手動アップロードする場合は次のとおりです。
```bash
curl -X POST "http://127.0.0.1:8188/upload/image" \
  -F "image=@photo.png" -F "type=input" -F "overwrite=true"
# Returns: {"name": "photo.png", "subfolder": "", "type": "input"}

# Cloud equivalent:
curl -X POST "https://cloud.comfy.org/api/upload/image" \
  -H "X-API-Key: $COMFY_CLOUD_API_KEY" \
  -F "image=@photo.png" -F "type=input" -F "overwrite=true"
```

## クラウドならではの話 {#cloud-specifics}

- **ベース URL:** `https://cloud.comfy.org`
- **認証:** `X-API-Key` ヘッダー（WebSocket では `?token=KEY`）
- **API キー:** `$COMFY_CLOUD_API_KEY` を一度設定すれば、スクリプトが自動で拾います
- **出力のダウンロード:** `/api/view` は署名付き URL への 302 を返します。スクリプトはそれを追いかけ、
  保管先から取得する前に `X-API-Key` を外します
  （S3/CloudFront に API キーを渡さないためです）。
- **ローカルの ComfyUI との違い:**
  - `/api/object_info`、`/api/queue`、`/api/userdata` — **無料枠では 403** になります。
    有料契約が必要です。
  - `/history` はクラウドでは `/history_v2` という名前です（スクリプトが自動で
    振り分けます）。
  - `/models/<folder>` はクラウドでは `/experiment/models/<folder>` という名前です
    （スクリプトが自動で振り分けます）。
  - WebSocket の `clientId` は今のところ無視されます。同じ利用者の接続はすべて
    同じ内容を受け取るので、`prompt_id` でクライアント側から絞ってください。
  - アップロード時の `subfolder` は受け付けられますが無視されます。クラウドの名前空間は平坦です。
- **同時実行数:** Free/Standard は 1、Creator は 3、Pro は 5 です。あふれた分は自動で
  順番待ちになります。`run_batch.py --parallel N` で契約プランの枠を使い切れます。

## キューとシステムの管理 {#queue-system-management}

```bash
# Local
curl -s http://127.0.0.1:8188/queue | python3 -m json.tool
curl -X POST http://127.0.0.1:8188/queue -d '{"clear": true}'    # cancel pending
curl -X POST http://127.0.0.1:8188/interrupt                      # cancel running
curl -X POST http://127.0.0.1:8188/free \
  -H "Content-Type: application/json" \
  -d '{"unload_models": true, "free_memory": true}'

# Cloud — same paths under /api/, plus:
python3 scripts/fetch_logs.py --tail-queue --host https://cloud.comfy.org
```

## つまずきやすいところ {#pitfalls}

1. **API 形式でないと動きません** — すべてのスクリプトと `/api/prompt` エンドポイントは、
   API 形式のワークフロー JSON を前提にしています。エディタ形式（最上位に
   `nodes` と `links` の配列がある形）はスクリプトが見分けて、
   「Workflow → Export (API)」（新しい画面）または「Save (API Format)」（古い画面）から書き出し直すよう伝えます。

2. **サーバーが動いている必要があります** — 実行にはすべて、生きているサーバーが要ります。
   `comfy launch --background` で起動します。
   `curl http://127.0.0.1:8188/system_stats` で確かめてください。

3. **モデル名は完全一致です** — 大文字小文字を区別し、拡張子も含みます。
   `check_deps.py` はある程度あいまいに照合しますが（拡張子やフォルダの
   接頭辞の有無を吸収）、ワークフロー自体には正式な名前を書く必要があります。
   何が入っているかは `comfy model list` で調べられます。

4. **カスタムノードが足りない** — 「class_type not found」は、必要なノードが
   入っていないという意味です。`check_deps.py` がどのパッケージを入れればよいか教えてくれます。
   `auto_fix_deps.py` なら導入まで代わりにやってくれます。

5. **作業ディレクトリ** — `comfy-cli` は ComfyUI のワークスペースを自動で見つけます。
   「no workspace found」で失敗するときは、
   `comfy --workspace /path/to/ComfyUI <command>` を使うか、
   `comfy set-default /path/to/ComfyUI` を実行してください。

6. **クラウド無料枠の API 制限** — `/api/prompt`、`/api/view`、`/api/upload/*`、
   `/api/object_info` は無料アカウントではすべて 403 になります。`health_check.py` と
   `check_deps.py` はこれをうまく受け止めて、分かりやすいメッセージを出します。

7. **動画・音声ワークフローの待ち時間** — 出力ノードが
   `VHS_VideoCombine` や `SaveVideo` などのときは自動で判別し、既定値が 300 秒から
   900 秒に上がります。`--timeout 1800` のように明示して上書きすることもできます。

8. **出力ファイル名でのパス移動** — サーバーから返るファイル名は
   `safe_path_join` を通し、`--output-dir` の外へ出ようとするものは拒みます。
   この保護は外さないでください。保存ノードを自作したワークフローは、どんなパスでも作れてしまいます。

9. **ワークフロー JSON は実行されるコードです** — カスタムノードは Python を動かすので、
   素性の分からないワークフローを投げるのは `eval` と同じ危うさがあります。
   信頼できない出所のワークフローは、実行する前に中身を確かめてください。

10. **シードの自動生成** — `--args` に `seed: -1` を渡す（または
    `--randomize-seed` を使って seed を省く）と、実行ごとに新しいシードになります。
    実際に使われたシードは標準エラー出力に記録されます。

11. **`tracking` の確認が出る** — `comfy` を初めて実行すると、解析データについて聞かれることがあります。
    対話なしで飛ばすには `comfy --skip-prompt tracking disable` を使ってください。
    `comfyui_setup.sh` はこれを代わりにやってくれます。

## 動作確認リスト {#verification-checklist}

`python3 scripts/health_check.py` を実行すれば、以下を一度にまとめて確認できます。手作業でやる場合は次のとおりです。

- [ ] `hardware_check.py` の判定が `ok` である、または利用者が明示的に Comfy Cloud を選んでいる
- [ ] `comfy --version` が動く（または `uvx --from comfy-cli comfy --help`）
- [ ] `curl http://HOST:PORT/system_stats` が JSON を返す
- [ ] `comfy model list` にチェックポイントが 1 つ以上出る（ローカル）、または
      `/api/experiment/models/checkpoints` がモデルを返す（クラウド）
- [ ] ワークフロー JSON が API 形式である
- [ ] `check_deps.py` が `is_ready: true` を返す（クラウド無料枠では `node_check_skipped`
      だけが出る状態でも可）
- [ ] 小さなワークフローで試し実行が最後まで通り、出力が `--output-dir` に届く
