---
title: "Inference Sh Cli — inference.sh の CLI から 150 以上の AI アプリ（画像・動画・LLM）を動かす"
description: "inference.sh の CLI から 150 以上の AI アプリ（画像・動画・LLM）を動かす"
upstream_path: user-guide/skills/optional/devops/devops-inference-sh-cli.md
upstream_blob: 295c14b0cc8926b23e7a64578f82dada6a8b196e
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/devops/devops-inference-sh-cli
---

# Inference Sh Cli {#inference-sh-cli}

inference.sh の CLI から 150 以上の AI アプリ（画像・動画・LLM）を動かします。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加 skill — `hermes skills install official/devops/inference-sh-cli` で入れます |
| パス | `optional-skills/devops\inference-sh-cli` |
| バージョン | `1.0.0` |
| 作者 | okaris |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `AI`, `image-generation`, `video`, `LLM`, `search`, `inference`, `FLUX`, `Veo`, `Claude` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# inference.sh CLI {#inferencesh-cli}

150 以上の AI アプリを、シンプルな CLI からクラウドで動かせます。GPU は要りません。

すべてのコマンドは、**terminal ツール**から `infsh` を実行します。

## 使う場面 {#when-to-use}

- 画像を作ってほしいと頼まれたとき（FLUX、Reve、Seedream、Grok、Gemini image）
- 動画を作ってほしいと頼まれたとき（Veo、Wan、Seedance、OmniHuman）
- inference.sh や infsh について聞かれたとき
- 各プロバイダの API を個別に管理せずに AI アプリを動かしたいとき
- AI を使った検索を頼まれたとき（Tavily、Exa）
- アバターやリップシンクの生成が必要なとき

## 事前に必要なもの {#prerequisites}

`infsh` CLI が入っていて、ログイン済みである必要があります。次のコマンドで確認します。

```bash
infsh me
```

入っていなければ、こうします。

```bash
curl -fsSL https://cli.inference.sh | sh
infsh login
```

準備の詳しい手順は `references/authentication.md` を見てください。

## 進め方 {#workflow}

### 1. まず必ず検索する {#1-always-search-first}

アプリ名を当てずっぽうで書かず、必ず検索して正しいアプリ ID を確かめます。

```bash
infsh app list --search flux
infsh app list --search video
infsh app list --search image
```

### 2. アプリを実行する {#2-run-an-app}

検索結果に出たアプリ ID をそのまま使います。出力を機械的に扱えるよう、必ず `--json` を付けます。

```bash
infsh app run <app-id> --input '{"prompt": "your prompt here"}' --json
```

### 3. 出力を読み取る {#3-parse-the-output}

JSON の出力には、生成されたメディアの URL が入っています。`MEDIA:<url>` の形でユーザーに渡すと、その場に表示されます。

## よく使うコマンド {#common-commands}

### 画像の生成 {#image-generation}

```bash
# Search for image apps
infsh app list --search image

# FLUX Dev with LoRA
infsh app run falai/flux-dev-lora --input '{"prompt": "sunset over mountains", "num_images": 1}' --json

# Gemini image generation
infsh app run google/gemini-2-5-flash-image --input '{"prompt": "futuristic city", "num_images": 1}' --json

# Seedream (ByteDance)
infsh app run bytedance/seedream-5-lite --input '{"prompt": "nature scene"}' --json

# Grok Imagine (xAI)
infsh app run xai/grok-imagine-image --input '{"prompt": "abstract art"}' --json
```

### 動画の生成 {#video-generation}

```bash
# Search for video apps
infsh app list --search video

# Veo 3.1 (Google)
infsh app run google/veo-3-1-fast --input '{"prompt": "drone shot of coastline"}' --json

# Seedance (ByteDance)
infsh app run bytedance/seedance-1-5-pro --input '{"prompt": "dancing figure", "resolution": "1080p"}' --json

# Wan 2.5
infsh app run falai/wan-2-5 --input '{"prompt": "person walking through city"}' --json
```

### 手元のファイルを渡す {#local-file-uploads}

パスを渡すと、CLI が手元のファイルを自動でアップロードします。

```bash
# Upscale a local image
infsh app run falai/topaz-image-upscaler --input '{"image": "/path/to/photo.jpg", "upscale_factor": 2}' --json

# Image-to-video from local file
infsh app run falai/wan-2-5-i2v --input '{"image": "/path/to/image.png", "prompt": "make it move"}' --json

# Avatar with audio
infsh app run bytedance/omnihuman-1-5 --input '{"audio": "/path/to/audio.mp3", "image": "/path/to/face.jpg"}' --json
```

### 検索と調べもの {#search-research}

```bash
infsh app list --search search
infsh app run tavily/tavily-search --input '{"query": "latest AI news"}' --json
infsh app run exa/exa-search --input '{"query": "machine learning papers"}' --json
```

### そのほかの分野 {#other-categories}

```bash
# 3D generation
infsh app list --search 3d

# Audio / TTS
infsh app list --search tts

# Twitter/X automation
infsh app list --search twitter
```

## つまずきやすいところ {#pitfalls}

1. **アプリ ID を推測しない** — 先に `infsh app list --search <term>` を実行してください。アプリ ID は変わりますし、新しいアプリもどんどん増えます。
2. **必ず `--json` を付ける** — そのままの出力は読み取りづらいです。`--json` を付けると、URL 付きの構造化された出力になります。
3. **ログイン状態を確認する** — 認証まわりのエラーで失敗するときは、`infsh login` を実行するか、`INFSH_API_KEY` が設定されているか確かめてください。
4. **時間のかかるアプリがある** — 動画の生成は 30〜120 秒ほどかかります。terminal ツールの制限時間内には収まるはずですが、少し待つことをユーザーに伝えておいてください。
5. **入力の書き方** — `--input` には JSON の文字列を渡します。引用符のエスケープに気をつけてください。

## 参考資料 {#reference-docs}

- `references/authentication.md` — 準備、ログイン、API キー
- `references/app-discovery.md` — アプリ一覧の検索と閲覧
- `references/running-apps.md` — アプリの実行、入力の形式、出力の扱い
- `references/cli-reference.md` — CLI コマンドの全一覧
