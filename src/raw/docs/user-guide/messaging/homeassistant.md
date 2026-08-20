---
title: "Home Assistant"
description: "Home Assistant との連携で、Hermes Agent からスマートホームを操作する。"
upstream_path: user-guide/messaging/homeassistant.md
upstream_blob: 2079654305cfa15557c3e5a582fe13ac2fc1b018
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/homeassistant
---

# Home Assistant との連携 {#home-assistant-integration}

Hermes Agent は [Home Assistant](https://www.home-assistant.io/) と 2 つの形で連携します。

1. **ゲートウェイのプラットフォームとして** — WebSocket で状態の変化をリアルタイムに受け取り、その出来事に反応します
2. **スマートホームのツールとして** — REST API 経由で機器の状態を調べたり操作したりする、LLM から呼べる 4 つのツールを提供します

## 設定 {#setup}

### 1. 長期アクセストークンを作る {#1-create-a-long-lived-access-token}

1. 自分の Home Assistant を開きます
2. **プロフィール** へ移動します（サイドバーで自分の名前をクリックします）
3. **長期アクセストークン** まで画面を下げます
4. **トークンを作成** をクリックし、「Hermes Agent」のような名前を付けます
5. トークンをコピーします

### 2. 環境変数を設定する {#2-configure-environment-variables}

```bash
# Add to ~/.hermes/.env

# Required: your Long-Lived Access Token
HASS_TOKEN=your-long-lived-access-token

# Optional: HA URL (default: http://homeassistant.local:8123)
HASS_URL=http://192.168.1.100:8123
```

:::info
`HASS_TOKEN` を設定すると、`homeassistant` ツールセットが自動で有効になります。ゲートウェイのプラットフォームも機器操作のツールも、このトークン 1 つで動き出します。
:::

### 3. ゲートウェイを起動する {#3-start-the-gateway}

```bash
hermes gateway
```

Home Assistant が、ほかのメッセージングサービス（Telegram、Discord など）と並んで、つながっているプラットフォームとして表示されます。

## 使えるツール {#available-tools}

Hermes Agent は、スマートホームを操作するための 4 つのツールを登録します。

### `ha_list_entities` {#halistentities}

Home Assistant のエンティティを一覧します。ドメインやエリアで絞り込めます。

**引数:**
- `domain` *(任意)* — エンティティのドメインで絞ります: `light`、`switch`、`climate`、`sensor`、`binary_sensor`、`cover`、`fan`、`media_player` など
- `area` *(任意)* — エリアや部屋の名前で絞ります（表示名との照合です）: `living room`、`kitchen`、`bedroom` など

**例:**
```
List all lights in the living room
```

エンティティの ID、状態、表示名を返します。

### `ha_get_state` {#hagetstate}

1 つのエンティティの詳しい状態を取得します。明るさ、色、設定温度、センサーの測定値といった属性もすべて含みます。

**引数:**
- `entity_id` *(必須)* — 調べたいエンティティ。たとえば `light.living_room`、`climate.thermostat`、`sensor.temperature`

**例:**
```
What's the current state of climate.thermostat?
```

状態、すべての属性、最後に変化・更新した時刻を返します。

### `ha_list_services` {#halistservices}

機器を操作するために使えるサービス（アクション）を一覧します。機器の種類ごとに、どんな操作ができて、どんな引数を受け付けるかがわかります。

**引数:**
- `domain` *(任意)* — ドメインで絞ります。たとえば `light`、`climate`、`switch`

**例:**
```
What services are available for climate devices?
```

### `ha_call_service` {#hacallservice}

Home Assistant のサービスを呼んで、機器を操作します。

**引数:**
- `domain` *(必須)* — サービスのドメイン: `light`、`switch`、`climate`、`cover`、`media_player`、`fan`、`scene`、`script`
- `service` *(必須)* — サービス名: `turn_on`、`turn_off`、`toggle`、`set_temperature`、`set_hvac_mode`、`open_cover`、`close_cover`、`set_volume_level`
- `entity_id` *(任意)* — 対象のエンティティ。たとえば `light.living_room`
- `data` *(任意)* — 追加の引数を JSON のオブジェクトで

**例:**

```
Turn on the living room lights
→ ha_call_service(domain="light", service="turn_on", entity_id="light.living_room")
```

```
Set the thermostat to 22 degrees in heat mode
→ ha_call_service(domain="climate", service="set_temperature",
    entity_id="climate.thermostat", data={"temperature": 22, "hvac_mode": "heat"})
```

```
Set living room lights to blue at 50% brightness
→ ha_call_service(domain="light", service="turn_on",
    entity_id="light.living_room", data={"brightness": 128, "color_name": "blue"})
```

## ゲートウェイのプラットフォーム: リアルタイムの出来事 {#gateway-platform-real-time-events}

Home Assistant のゲートウェイアダプターは WebSocket で接続し、`state_changed` のイベントを購読します。機器の状態が変わり、それが指定した条件に合っていれば、メッセージとしてエージェントへ転送されます。

### イベントの絞り込み {#event-filtering}

:::warning 設定が必須です
既定では **イベントは一切転送されません**。イベントを受け取るには、`watch_domains`、`watch_entities`、`watch_all` のうち少なくとも 1 つを設定する必要があります。条件が何もないと、起動時に警告がログに出て、状態の変化はすべて黙って捨てられます。
:::

エージェントがどのイベントを見るかは、`~/.hermes/config.yaml` の Home Assistant プラットフォームの `extra` の下で設定します。

```yaml
platforms:
  homeassistant:
    enabled: true
    extra:
      watch_domains:
        - climate
        - binary_sensor
        - alarm_control_panel
        - light
      watch_entities:
        - sensor.front_door_battery
      ignore_entities:
        - sensor.uptime
        - sensor.cpu_usage
        - sensor.memory_usage
      cooldown_seconds: 30
```

| 設定 | 既定値 | 説明 |
|---------|---------|-------------|
| `watch_domains` | *(なし)* | このエンティティのドメインだけを見ます（例: `climate`、`light`、`binary_sensor`） |
| `watch_entities` | *(なし)* | このエンティティ ID だけを見ます |
| `watch_all` | `false` | `true` にすると **すべて** の状態の変化を受け取ります（多くの環境ではおすすめしません） |
| `ignore_entities` | *(なし)* | ここに挙げたエンティティは常に無視します（ドメインやエンティティの条件より先に適用されます） |
| `cooldown_seconds` | `30` | 同じエンティティのイベントの間に空ける最小の秒数 |

:::tip
まずは対象を絞ったドメインから始めてください。`climate`、`binary_sensor`、`alarm_control_panel` があれば、役に立つ自動化のほとんどをまかなえます。必要になったら足していきましょう。CPU の温度や稼働時間のような、うるさいセンサーは `ignore_entities` で黙らせられます。
:::

### イベントの書式 {#event-formatting}

状態の変化は、ドメインに応じて人が読める文章にまとめられます。

| ドメイン | 書式 |
|--------|--------|
| `climate` | 「HVAC mode changed from 'off' to 'heat' (current: 21, target: 23)」 |
| `sensor` | 「changed from 21°C to 22°C」 |
| `binary_sensor` | 「triggered」／「cleared」 |
| `light`、`switch`、`fan` | 「turned on」／「turned off」 |
| `alarm_control_panel` | 「alarm state changed from 'armed_away' to 'triggered'」 |
| *(そのほか)* | 「changed from 'old' to 'new'」 |

### エージェントからの返答 {#agent-responses}

エージェントから送られるメッセージは、**Home Assistant の常設通知** として届きます（`persistent_notification.create` を使います）。HA の通知パネルに「Hermes Agent」という見出しで表示されます。

### 接続の管理 {#connection-management}

- **WebSocket** で、30 秒ごとのハートビートを使ってリアルタイムのイベントを受け取ります
- **自動再接続** は待ち時間を延ばしながら行います: 5 秒 → 10 秒 → 30 秒 → 60 秒
- **REST API** は送信する通知に使います（WebSocket とぶつからないよう、別のセッションを使います）
- **認可** — HA のイベントは常に許可されます（`HASS_TOKEN` が接続を認証しているので、ユーザーの許可リストは要りません）

## セキュリティ {#security}

Home Assistant のツールには、安全のための制限があります。

:::warning 禁止されているドメイン
HA のホスト上で任意のコードが実行されるのを防ぐため、次のサービスのドメインは **禁止** されています。

- `shell_command` — 任意のシェルコマンド
- `command_line` — コマンドを実行するセンサーやスイッチ
- `python_script` — Python のスクリプト実行
- `pyscript` — より広範なスクリプト連携
- `hassio` — アドオンの操作、ホストの停止・再起動
- `rest_command` — HA サーバーからの HTTP リクエスト（SSRF の入口になります）

これらのドメインのサービスを呼ぼうとすると、エラーが返ります。
:::

エンティティ ID は、インジェクション攻撃を防ぐために `^[a-z_][a-z0-9_]*\.[a-z0-9_]+$` というパターンで検証されます。

## 自動化の例 {#example-automations}

### 朝の支度 {#morning-routine}

```
User: Start my morning routine

Agent:
1. ha_call_service(domain="light", service="turn_on",
     entity_id="light.bedroom", data={"brightness": 128})
2. ha_call_service(domain="climate", service="set_temperature",
     entity_id="climate.thermostat", data={"temperature": 22})
3. ha_call_service(domain="media_player", service="turn_on",
     entity_id="media_player.kitchen_speaker")
```

### 戸締まりの確認 {#security-check}

```
User: Is the house secure?

Agent:
1. ha_list_entities(domain="binary_sensor")
     → checks door/window sensors
2. ha_get_state(entity_id="alarm_control_panel.home")
     → checks alarm status
3. ha_list_entities(domain="lock")
     → checks lock states
4. Reports: "All doors closed, alarm is armed_away, all locks engaged."
```

### 出来事に反応する自動化（ゲートウェイのイベント経由） {#reactive-automation-via-gateway-events}

ゲートウェイのプラットフォームとしてつないでおくと、エージェントは出来事に反応できます。

```
[Home Assistant] Front Door: triggered (was cleared)

Agent automatically:
1. ha_get_state(entity_id="binary_sensor.front_door")
2. ha_call_service(domain="light", service="turn_on",
     entity_id="light.hallway")
3. Sends notification: "Front door opened. Hallway lights turned on."
```

## 困ったときは {#troubleshooting}

**環境変数が読み込まれない。**
アダプターは認証情報を `~/.hermes/.env`（起動時に自動で取り込まれます）か
`config.yaml` から読みます。そのファイルが今使っている Hermes のプロファイルの
ホームの下にあるか、URL やトークンに余計な引用符が付いていないかを確認してください。編集したら
ゲートウェイを再起動します。環境変数の変更はプロセスの起動時にしか反映されません。

**REST の認証が通らない（`401 Unauthorized`）。**
トークンは、HA のユーザープロフィールのページ（**プロフィール → セキュリティ → 長期アクセストークン**）
から作った *長期アクセストークン* である必要があります。画面のセッション用の短命な
トークンでは動きません。ベース URL にスキームとポートが入っているか
（例: `http://homeassistant.local:8123`）、Hermes を動かしているホストからつながるかも確認してください。
`curl -H "Authorization: Bearer <token>" <url>/api/` が
`{"message": "API running."}` を返せば大丈夫です。
