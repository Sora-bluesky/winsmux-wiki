---
title: "Findmy — macOS の FindMy.app で Apple 製端末や AirTag の位置を調べる"
description: "macOS の FindMy.app で Apple 製端末や AirTag の位置を調べる"
upstream_path: user-guide/skills/bundled/apple/apple-findmy.md
upstream_blob: 0d4647e4474214bd6eb1fc257eb81fb0a2def715
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/apple/apple-findmy
---

# Findmy {#findmy}

macOS の FindMy.app で、Apple 製端末や AirTag の位置を調べます。

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
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Find My (Apple) {#find-my-apple}

macOS の FindMy.app を使って、Apple 製端末や AirTag の位置を調べます。Apple は
FindMy 用の CLI を用意していないため、この skill では AppleScript でアプリを開き、
画面を撮って端末の位置を読み取ります。

## 事前に必要なもの {#prerequisites}

- **macOS**、「探す」アプリ、そして iCloud にサインイン済みであること
- 端末や AirTag が「探す」にあらかじめ登録されていること
- ターミナルに画面収録の権限があること（システム設定 → プライバシー → 画面収録）
- **必須ではありませんが、あると便利**: UI 操作をより確実にする `peekaboo` を入れておきます。
  `brew install steipete/tap/peekaboo`

## こんなときに使います {#when-to-use}

- 「わたしの端末 / 猫 / 鍵 / かばんはどこ？」と聞かれたとき
- AirTag の位置を調べたいとき
- 端末（iPhone、iPad、Mac、AirPods）の位置を確認したいとき
- ペットや持ち物の動きを時間を追って見たいとき（AirTag の移動経路）

## 方法 1: AppleScript + スクリーンショット（基本） {#method-1-applescript-screenshot-basic}

### FindMy を開いて画面を切り替える {#open-findmy-and-navigate}

```bash
# Open Find My app
osascript -e 'tell application "FindMy" to activate'

# Wait for it to load
sleep 3

# Take a screenshot of the Find My window
screencapture -w -o /tmp/findmy.png
```

続けて `vision_analyze` でスクリーンショットを読み取ります。
```
vision_analyze(image_url="/tmp/findmy.png", question="What devices/items are shown and what are their locations?")
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

`peekaboo` を入れてある場合は、こちらのほうが UI 操作が安定します。

```bash
# Open Find My
osascript -e 'tell application "FindMy" to activate'
sleep 3

# Capture and annotate the UI
peekaboo see --app "FindMy" --annotate --path /tmp/findmy-ui.png

# Click on a specific device/item by element ID
peekaboo click --on B3 --app "FindMy"

# Capture the detail view
peekaboo image --app "FindMy" --path /tmp/findmy-detail.png
```

続けて vision で読み取ります。
```
vision_analyze(image_url="/tmp/findmy-detail.png", question="What is the location shown for this device/item? Include address and coordinates if visible.")
```

## 手順: AirTag の位置を時間を追って記録する {#workflow-track-airtag-location-over-time}

AirTag を見張るとき（たとえば猫の移動経路を追うとき）は次のようにします。

```bash
# 1. Open FindMy to Items tab
osascript -e 'tell application "FindMy" to activate'
sleep 3

# 2. Click on the AirTag item (stay on page — AirTag only updates when page is open)

# 3. Periodically capture location
while true; do
    screencapture -w -o /tmp/findmy-$(date +%H%M%S).png
    sleep 300  # Every 5 minutes
done
```

撮った画像を 1 枚ずつ vision で読み取って座標を取り出し、経路としてまとめます。

## 制限 {#limitations}

- FindMy には **CLI も API もありません**。UI を操作するしかありません
- AirTag の位置は、FindMy の画面を開いているあいだしか更新されません
- 位置の精度は、FindMy のネットワークに参加している近くの Apple 製端末に左右されます
- スクリーンショットを撮るには画面収録の権限が必要です
- AppleScript による UI 操作は、macOS のバージョンが変わると動かなくなることがあります

## ルール {#rules}

1. AirTag を追っているあいだは FindMy アプリを前面に出しておきます（最小化すると更新が止まります）
2. スクリーンショットの中身は `vision_analyze` で読み取ります。ピクセルを自力で解析しようとしないでください
3. 継続して追いたいときは、cronjob で定期的に撮影して位置を記録します
4. プライバシーに配慮し、本人が持ち主である端末や持ち物だけを対象にします
