---
title: "Openhue — OpenHue CLI で Philips Hue の照明・シーン・部屋を操作する"
description: "OpenHue CLI で Philips Hue の照明・シーン・部屋を操作する"
upstream_path: user-guide/skills/bundled/smart-home/smart-home-openhue.md
upstream_blob: 3255b428e14af1574df85ac498772d7535b41f69
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/smart-home/smart-home-openhue
---

# Openhue {#openhue}

OpenHue CLI を使って、Philips Hue の照明・シーン・部屋を操作します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/smart-home/openhue` |
| バージョン | `1.0.1` |
| 作者 | community |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Smart-Home`, `Hue`, `Lights`, `IoT`, `Automation` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# OpenHue CLI {#openhue-cli}

Hue Bridge 経由で、Philips Hue の照明とシーンをターミナルから操作します。

## 事前に必要なもの {#prerequisites}

```bash
# Linux (pre-built binary — releases ship tarballs, not bare binaries)
curl -sL "https://github.com/openhue/openhue-cli/releases/latest/download/openhue_Linux_x86_64.tar.gz" \
  | tar -xz -C /tmp openhue \
  && install -m 0755 /tmp/openhue ~/.local/bin/openhue
# (use openhue_Linux_arm64.tar.gz on ARM64)

# macOS
brew install openhue/cli/openhue-cli
```

初回の実行では、Hue Bridge 本体のボタンを押してペアリングする必要があります。Bridge は同じローカルネットワーク上にある必要があります。

## こんなときに使います {#when-to-use}

- 「照明をつけて / 消して」
- 「リビングの照明を暗くして」
- 「シーンを設定して」「映画モードにして」
- Hue の特定の部屋・ゾーン・個々の電球を操作したいとき
- 明るさ・色・色温度を調整したいとき

## よく使うコマンド {#common-commands}

### 一覧を見る {#list-resources}

```bash
openhue get light       # List all lights
openhue get room        # List all rooms
openhue get scene       # List all scenes
```

### 照明を操作する {#control-lights}

```bash
# Turn on/off
openhue set light "Bedroom Lamp" --on
openhue set light "Bedroom Lamp" --off

# Brightness (0-100)
openhue set light "Bedroom Lamp" --on --brightness 50

# Color temperature (warm to cool: 153-500 mirek)
openhue set light "Bedroom Lamp" --on --temperature 300

# Color (by name or hex)
openhue set light "Bedroom Lamp" --on --color red
openhue set light "Bedroom Lamp" --on --rgb "#FF5500"
```

### 部屋ごとに操作する {#control-rooms}

```bash
# Turn off entire room
openhue set room "Bedroom" --off

# Set room brightness
openhue set room "Bedroom" --on --brightness 30
```

### シーン {#scenes}

```bash
openhue set scene "Relax" --room "Bedroom"
openhue set scene "Concentrate" --room "Office"
```

## そのまま使える設定例 {#quick-presets}

```bash
# Bedtime (dim warm)
openhue set room "Bedroom" --on --brightness 20 --temperature 450

# Work mode (bright cool)
openhue set room "Office" --on --brightness 100 --temperature 250

# Movie mode (dim)
openhue set room "Living Room" --on --brightness 10

# Everything off
openhue set room "Bedroom" --off
openhue set room "Office" --off
openhue set room "Living Room" --off
```

## 補足 {#notes}

- Bridge は、Hermes を動かしている端末と同じローカルネットワーク上にある必要があります
- 初回の実行では、Hue Bridge 本体のボタンを実際に押して許可する必要があります
- 色の指定は、色に対応した電球でのみ機能します（白色のみのモデルでは使えません）
- 照明名と部屋名は大文字と小文字を区別します。正確な名前は `openhue get light` で確認してください
- cron ジョブと組み合わせると、時間に合わせた照明制御ができます（就寝時に暗く、起床時に明るく、など）
