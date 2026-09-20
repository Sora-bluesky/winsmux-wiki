---
title: "Findmy — macOS の FindMy.app で Apple 製デバイスや AirTag の場所を追う"
description: "macOS の FindMy.app で Apple 製デバイスや AirTag の場所を追う"
upstream_path: user-guide/skills/bundled/apple/apple-findmy.md
upstream_blob: 294410b5d3197f43d8a5bbcee5bd4813f7f3481f
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/apple/apple-findmy
---

# Findmy {#findmy}

macOS の FindMy.app で、Apple 製デバイスや AirTag の場所を追います。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/apple/findmy` |
| バージョン | `1.0.0` |
| 作者 | Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | macos |
| タグ | `FindMy`, `AirTag`, `location`, `tracking`, `macOS`, `Apple` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として見ています。
:::

# 探す（Apple） {#find-my-apple}

macOS の FindMy.app で、Apple 製デバイスや AirTag の場所を追います。Apple は
FindMy 用の CLI を出していないため、この skill は AppleScript でアプリを開き、
画面を撮ってデバイスの位置を読み取ります。

## 事前に必要なもの {#prerequisites}

- **macOS**。「探す」アプリがあり、iCloud にサインイン済みであること
- デバイスや AirTag が「探す」に登録済みであること
- ターミナルへの画面収録の許可（システム設定 → プライバシー → 画面収録）
- **必須ではありませんが、おすすめ**: UI 操作がより安定する `peekaboo` を入れておきます:
  `brew install steipete/tap/peekaboo`

## こんなときに使います {#when-to-use}

- 「[デバイス / 猫 / 鍵 / かばん] はどこ？」と聞かれたとき
- AirTag の場所を追うとき
- デバイス（iPhone、iPad、Mac、AirPods）の場所を確かめるとき
- ペットや持ち物の動きを時間をかけて見守るとき（AirTag の巡回ルート）

## 方法 1: AppleScript + スクリーンショット（基本） {#method-1-applescript-screenshot-basic}

### FindMy を開いて操作する {#open-findmy-and-navigate}

```bash
# Open Find My app
osascript -e 'tell application "FindMy" to activate'

# Wait for it to load
sleep 3

# Take a screenshot of the Find My window
screencapture -w -o ~/.hermes/cache/scratch/findmy.png
```

撮った画面は `vision_analyze` で読み取ります:
```
vision_analyze(image_url="~/.hermes/cache/scratch/findmy.png", question="What devices/items are shown and what are their locations?")
```

### タブを切り替える {#switch-between-tabs}

```bash
# Switch to Devices tab
osascript -e '
tell application "System Events"
    tell process "FindMy"
        click button "Devices" of toolbar 1 of window 1
    end tell
end tell'

# Switch to Items tab (AirTags)
osascript -e '
tell application "System Events"
    tell process "FindMy"
        click button "Items" of toolbar 1 of window 1
    end tell
end tell'
```

## 方法 2: Peekaboo による UI 操作（おすすめ） {#method-2-peekaboo-ui-automation-recommended}

`peekaboo` を入れてあるなら、こちらのほうが UI 操作は確実です:

```bash
# Open Find My
osascript -e 'tell application "FindMy" to activate'
sleep 3

# Capture and annotate the UI
peekaboo see --app "FindMy" --annotate --path ~/.hermes/cache/scratch/findmy-ui.png

# Click on a specific device/item by element ID
peekaboo click --on B3 --app "FindMy"

# Capture the detail view
peekaboo image --app "FindMy" --path ~/.hermes/cache/scratch/findmy-detail.png
```

そのうえで、画像を読み取らせます:
```
vision_analyze(image_url="~/.hermes/cache/scratch/findmy-detail.png", question="What is the location shown for this device/item? Include address and coordinates if visible.")
```

## 手順: AirTag の位置を時間を追って記録する {#workflow-track-airtag-location-over-time}

AirTag を見守るとき（たとえば猫の巡回ルートを追うとき）は、次のようにします:

```bash
# 1. Open FindMy to Items tab
osascript -e 'tell application "FindMy" to activate'
sleep 3

# 2. Click on the AirTag item (stay on page — AirTag only updates when page is open)

# 3. Periodically capture location
while true; do
    screencapture -w -o ~/.hermes/cache/scratch/findmy-$(date +%H%M%S).png
    sleep 300  # Every 5 minutes
done
```

撮った画面を一枚ずつ画像解析にかけて座標を取り出し、まとめてルートにします。

## できないこと {#limitations}

- FindMy には **CLI も API もありません**。UI 操作で進めるしかありません
- AirTag は、FindMy の画面を開いているあいだしか位置を更新しません
- 位置の精度は、FindMy ネットワークにいる近くの Apple 製デバイス次第です
- スクリーンショットには画面収録の許可が要ります
- AppleScript による UI 操作は、macOS のバージョンが上がると動かなくなることがあります

## ルール {#rules}

1. AirTag を追うあいだは FindMy アプリを前面に出しておきます（最小化すると更新が止まります）
2. スクリーンショットの中身は `vision_analyze` で読み取ります。ピクセルを自力で解析しようとしないでください
3. 追い続けるなら、cronjob で定期的に撮影して位置を記録します
4. プライバシーを守ってください。追ってよいのは、ユーザー本人のデバイスや持ち物だけです
