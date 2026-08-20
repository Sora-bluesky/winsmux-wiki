---
title: "Maps — OpenStreetMap と OSRM で位置検索・周辺施設・経路・タイムゾーンを調べる"
description: "OpenStreetMap と OSRM で位置検索・周辺施設・経路・タイムゾーンを調べる"
upstream_path: user-guide/skills/bundled/productivity/productivity-maps.md
upstream_blob: 7fdc002cc3001324b3570338eaa13ecb37ec2e70
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/productivity/productivity-maps
---

# Maps {#maps}

OpenStreetMap と OSRM で位置検索・周辺施設・経路・タイムゾーンを調べます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/productivity/maps` |
| バージョン | `1.2.0` |
| 作者 | Mibayy |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `maps`, `geocoding`, `places`, `routing`, `distance`, `directions`, `nearby`, `location`, `openstreetmap`, `nominatim`, `overpass`, `osrm` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Maps Skill {#maps-skill}

無料で公開されているデータをもとに、場所にまつわる情報を扱います。コマンドは
8 つ、施設の分類は 44 種類。追加のライブラリは要らず（Python の標準ライブラリ
だけです）、API キーも不要です。

データの出どころは OpenStreetMap / Nominatim、Overpass API、OSRM、TimeAPI.io です。

この skill は、以前の `find-nearby` skill を置き換えるものです。find-nearby で
できたことは、下の `nearby` コマンドですべてまかなえます。`--near "<place>"` の
書き方も、複数の分類を同時に指定できる点も同じです。

## こんなときに使います {#when-to-use}

- 利用者が Telegram で位置情報のピンを送ってきた（メッセージに緯度と経度が入っている）→ `nearby`
- 地名から座標を知りたい → `search`
- 座標から住所を知りたい → `reverse`
- 近くのレストラン、病院、薬局、ホテルなどを探したい → `nearby`
- 車・徒歩・自転車での距離や所要時間を知りたい → `distance`
- 2 地点間の曲がり角ごとの案内がほしい → `directions`
- ある場所のタイムゾーンを知りたい → `timezone`
- ある範囲の中にある施設を探したい → `area` と `bbox`

## 事前に必要なもの {#prerequisites}

Python 3.8 以上（標準ライブラリだけで動くので、pip でのインストールは不要です）。

スクリプトの場所: `~/.hermes/skills/maps/scripts/maps_client.py`

## コマンド {#commands}

```bash
MAPS=~/.hermes/skills/maps/scripts/maps_client.py
```

### search — 地名から座標を調べる {#search-geocode-a-place-name}

```bash
python3 $MAPS search "Eiffel Tower"
python3 $MAPS search "1600 Pennsylvania Ave, Washington DC"
```

返ってくるもの: 緯度、経度、表示用の名前、種別、範囲を表す四角形、重要度のスコア。

### reverse — 座標から住所を調べる {#reverse-coordinates-to-address}

```bash
python3 $MAPS reverse 48.8584 2.2945
```

返ってくるもの: 住所の内訳一式（通り、市、州、国、郵便番号）。

### nearby — 分類から近くの場所を探す {#nearby-find-places-by-category}

```bash
# By coordinates (from a Telegram location pin, for example)
python3 $MAPS nearby 48.8584 2.2945 restaurant --limit 10
python3 $MAPS nearby 40.7128 -74.0060 hospital --radius 2000

# By address / city / zip / landmark — --near auto-geocodes
python3 $MAPS nearby --near "Times Square, New York" --category cafe
python3 $MAPS nearby --near "90210" --category pharmacy

# Multiple categories merged into one query
python3 $MAPS nearby --near "downtown austin" --category restaurant --category bar --limit 10
```

分類は 46 種類です: restaurant, cafe, bar, hospital, pharmacy, hotel, guest_house,
camp_site, supermarket, atm, gas_station, parking, museum, park, school,
university, bank, police, fire_station, library, airport, train_station,
bus_stop, church, mosque, synagogue, dentist, doctor, cinema, theatre, gym,
swimming_pool, post_office, convenience_store, bakery, bookshop, laundry,
car_wash, car_rental, bicycle_rental, taxi, veterinary, zoo, playground,
stadium, nightclub。

結果にはそれぞれ、`name`、`address`、`lat` と `lon`、`distance_m`、
`maps_url`（そのまま開ける Google マップのリンク）、`directions_url`（検索した
地点からの Google マップの経路）が入ります。データがあれば、`cuisine`、
`hours`（opening_hours）、`phone`、`website` も一緒に返ります。

### distance — 移動の距離と時間 {#distance-travel-distance-and-time}

```bash
python3 $MAPS distance "Paris" --to "Lyon"
python3 $MAPS distance "New York" --to "Boston" --mode driving
python3 $MAPS distance "Big Ben" --to "Tower Bridge" --mode walking
```

移動手段は driving（既定）、walking、cycling です。道路をたどった距離と所要時間に
加えて、比較用に直線距離も返ります。

### directions — 曲がり角ごとの案内 {#directions-turn-by-turn-navigation}

```bash
python3 $MAPS directions "Eiffel Tower" --to "Louvre Museum" --mode walking
python3 $MAPS directions "JFK Airport" --to "Times Square" --mode driving
```

番号の付いた手順が返ります。各手順には案内文、距離、所要時間、道路名、動作の
種類（曲がる、出発、到着など）が入ります。

### timezone — 座標のタイムゾーン {#timezone-timezone-for-coordinates}

```bash
python3 $MAPS timezone 48.8584 2.2945
python3 $MAPS timezone 35.6762 139.6503
```

タイムゾーン名、UTC からのずれ、その場所の現在時刻が返ります。

### area — 場所の範囲と面積 {#area-bounding-box-and-area-for-a-place}

```bash
python3 $MAPS area "Manhattan, New York"
python3 $MAPS area "London"
```

範囲を表す四角形の座標、幅と高さ（km）、おおよその面積が返ります。bbox コマンドの
入力として使えます。

### bbox — 四角い範囲の中を探す {#bbox-search-within-a-bounding-box}

```bash
python3 $MAPS bbox 40.75 -74.00 40.77 -73.98 restaurant --limit 20
```

四角く区切った範囲の中にある施設を探します。地名から範囲の座標を出すには、
先に `area` を使ってください。

## Telegram の位置情報ピンを使う {#working-with-telegram-location-pins}

利用者が位置情報のピンを送ると、メッセージに `latitude:` と `longitude:` の
項目が入ります。その値をそのまま `nearby` に渡してください。

```bash
# User sent a pin at 36.17, -115.14 and asked "find cafes nearby"
python3 $MAPS nearby 36.17 -115.14 cafe --radius 1500
```

結果は、名前と距離、それに `maps_url` を添えた番号付きの一覧で示してください。
そうすると、チャットの中でタップして開けるリンクになります。「いま開いて
いますか」と聞かれたら `hours` の項目を確認します。値がなかったり、はっきり
しなかったりする場合は `web_search` で裏を取ってください。OSM の営業時間は
有志が手入力しているもので、最新とは限りません。

## 使い方の例 {#workflow-examples}

**「コロッセオの近くでイタリア料理の店を探して」:**
1. `nearby --near "Colosseum Rome" --category restaurant --radius 500`
   （コマンド 1 つ。地名から座標も自動で調べます）

**「送られてきた位置情報ピンの近くには何がある？」:**
1. Telegram のメッセージから緯度と経度を取り出す
2. `nearby LAT LON cafe --radius 1500`

**「ホテルから会議場まで、歩きだとどう行く？」:**
1. `directions "Hotel Name" --to "Conference Center" --mode walking`

**「シアトルのダウンタウンにはどんなレストランがある？」:**
1. `area "Downtown Seattle"` で範囲の座標を出す
2. `bbox S W N E restaurant --limit 30`

## つまずきやすいところ {#pitfalls}

- Nominatim の利用規約では 1 秒あたり 1 リクエストまでです（スクリプトが自動で守ります）
- `nearby` には緯度・経度か `--near "<address>"` のどちらかが必要です
- OSRM の経路データは、ヨーロッパと北米がいちばん充実しています
- Overpass API は混む時間帯に遅くなることがあります。スクリプトは自動で
  別のミラーに切り替えます（overpass-api.de → overpass.kumi.systems）
- `distance` と `directions` の行き先は `--to` フラグで渡します（位置引数ではありません）
- 郵便番号だけでは世界のあちこちで候補が出てしまう場合、国名や州名も添えてください

## 確かめかた {#verification}

```bash
python3 ~/.hermes/skills/maps/scripts/maps_client.py search "Statue of Liberty"
# Should return lat ~40.689, lon ~-74.044

python3 ~/.hermes/skills/maps/scripts/maps_client.py nearby --near "Times Square" --category restaurant --limit 3
# Should return a list of restaurants within ~500m of Times Square
```
