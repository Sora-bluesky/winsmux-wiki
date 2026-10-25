---
title: "Hermes Workshop 日本語版"
description: "Nous Research の Teknium がまとめた、Hermes Agent とつなげる機器のカタログ『The Hermes Workshop』を日本語の 1 行で紹介する索引。"
raw: /hermes/raw/workshop.md
---

# Hermes Workshop 日本語版

「The Hermes Workshop」は、Nous Research の [Teknium](https://x.com/Teknium) がまとめた、Hermes Agent を組み込んだりつないだりできる機器のカタログです。このページでは 423 件・32 分類を日本語の 1 行で紹介し、名前から元のページの各機器の説明へ進めます。

隠し撮り・隠し録音の機器と、侵入検査用の道具（16 件）は、日本の法律に触れる使い方があるため載せていません。[元のページ](https://teknium.io/hermes-devices/)で見られます。

Wi-Fi・Bluetooth・LoRa などの電波を出す機器を日本で使うには、技適マークが必要です。総務省の[技適マークの Q&A](https://www.tele.soumu.go.jp/j/adm/monitoring/summary/qa/giteki_mark/)をご覧ください。

日本語の文はこのサイトによる要約です。価格や仕様は元のページとメーカーの情報をご覧ください。

## Hermes 専用ガジェット

- [Waveshare ESP32-S3-LCD-1.54](https://teknium.io/hermes-devices/#waveshare-esp32-s3-lcd-1-54) — ESP32-S3 に1.54インチ画面とマイク・スピーカーを載せた音声ボードです。Hermes Gadget SDK の正式ターゲットで、ブラウザから書き込み、BOOT を押しながら話しかけられます。（~$15-19）
- [Waveshare ESP32-S3-Touch-AMOLED-1.75](https://teknium.io/hermes-devices/#waveshare-esp32-s3-touch-amoled-1-75) — 円形 AMOLED にマイクと IMU を載せた ESP32-S3 ボードです。Hermes Gadget SDK に対応し、画面を押し続けて話しかけます。MQTT で Hermes に状態を送る使い方もできます。（~$30-40）
- [Waveshare ESP32-S3-Touch-LCD-2.8](https://teknium.io/hermes-devices/#waveshare-esp32-s3-touch-lcd-2-8) — 2.8インチのタッチ画面とスピーカーを備えた ESP32-S3 ボードです。Hermes Familiar プラグインの検証済みボードで、エージェントの状態表示や gateway の承認操作に使えます。（~$20-26）
- [Espressif ESP32-S3-BOX-3](https://teknium.io/hermes-devices/#espressif-esp32-s3-box-3) — Espressif のタッチ画面付き音声ボックスです。Hermes Gadget SDK の実験的ターゲットで、ESPHome の音声アシスタントとして Home Assistant 経由でもつながります。（~$50）
- [M5Stack CoreS3](https://teknium.io/hermes-devices/#m5stack-cores3) — カメラ・マイク・電池を内蔵した M5Stack の ESP32-S3 キューブです。Hermes Gadget SDK の実験的ターゲットで、ESP-Hermes チャネルプラグインもこの機器群を前提に作られています。（~$60）

## スマートグラスと AR

- [Even Realities G2](https://teknium.io/hermes-devices/#even-realities-g2) — レンズに文字を映すディスプレイ付きメガネで、カメラはありません。Hermes は公式の Even Hub SDK で Web アプリ型のプラグインを作り、通知や文字を HUD に送れます。（~$599）
- [Brilliant Labs Halo](https://teknium.io/hermes-devices/#brilliant-labs-halo) — ファームウェアを書き換えられるオープンソースの AI メガネです。Hermes は Brilliant SDK で BLE 越しに画面やカメラを操作し、Zephyr のファームウェアを OTA で入れられます。（$399）
- [Meta Ray-Ban Display + Meta Neural Band](https://teknium.io/hermes-devices/#meta-ray-ban-display) — 右レンズに小さな画面を持つ Ray-Ban のメガネと、指の動きを読むリストバンドのセットです。Hermes が作ったスマホアプリ経由でカメラ映像と音声を受け取り、返答をレンズに表示します。（$799）
- [Ray-Ban Meta \(Gen 2\)](https://teknium.io/hermes-devices/#ray-ban-meta-gen-2) — 画面のないカメラ付きメガネです。Hermes が Meta の SDK でスマホアプリを作り、カメラ映像とマイク音声を WebSocket で受け取って、返事をメガネのスピーカーから話します。（$379）
- [Oakley Meta Vanguard](https://teknium.io/hermes-devices/#oakley-meta-vanguard) — 防水性の高いスポーツ向けのカメラ付きメガネです。Hermes が作ったスマホアプリがカメラ映像と音声を中継し、電池や温度の状態も見ながら、返事を耳元のスピーカーで伝えます。（$499）
- [Mentra Live](https://teknium.io/hermes-devices/#mentra-live) — オープンソースの MentraOS で動く、画面のないカメラ付きメガネです。公式の Bluetooth SDK で Hermes がボタン操作や音声を受け取り、撮った写真を自分の webhook で受信できます。（$449）
- [Omi Glass Dev Kit](https://teknium.io/hermes-devices/#omi-glass-dev-kit) — ESP32-S3 で作られた、オープンソースのカメラ・マイク付きメガネです。Hermes が Linux から BLE で直接つないで音声と写真を受け取り、ファームウェアの書き換えもできます。（$499）
- [Rokid Glasses](https://teknium.io/hermes-devices/#rokid-glasses) — 緑色の HUD とカメラを持ち、Android アプリがそのまま動く軽いメガネです。Hermes が APK を作って adb で入れると、カメラやマイク、タッチ操作を使って Hermes と通信できます。（~$619）
- [RayNeo X3 Pro](https://teknium.io/hermes-devices/#rayneo-x3-pro) — 両目にカラー表示を持ち、単体で動く Android ベースの AR メガネです。Hermes が RayNeo の SDK でアプリを作って adb で入れ、表示・カメラ・マイクの役を持たせます。（$1,299）
- [Everysight Maverick Sport](https://teknium.io/hermes-devices/#everysight-maverick) — 片目にカラー HUD を持つスポーツ向けの AR メガネで、カメラはありません。Hermes が EvsKit でスマホアプリを作り、表示を送ってタッチ操作や頭の向きを受け取ります。（$399）
- [ENGO 3](https://teknium.io/hermes-devices/#engo-3) — ランニングや自転車向けの HUD メガネで、表示用の BLE 命令が公開されています。Hermes は Linux から bleak で直接つなぎ、文字やゲージを表示してタップ操作を受け取れます。（$399.95）
- [Vuzix M400](https://teknium.io/hermes-devices/#vuzix-m400) — ヘルメットなどに取り付けて使う、業務向けの片目ディスプレイ型 Android 端末です。ADB を有効にすれば Hermes がアプリを入れて操作でき、音声コマンドやバーコードの SDK もあります。（$1,499.99）
- [XREAL One Pro](https://teknium.io/hermes-devices/#xreal-one-pro) — USB-C でつなぎ、パソコンの画面を目の前に映す表示用メガネです。Hermes は Linux のオープンソースドライバで頭の向きを読み、Unity SDK で AR アプリを作ることもできます。（$599）
- [VITURE Luma Ultra](https://teknium.io/hermes-devices/#viture-luma-ultra) — USB-C でつなぐ XR メガネで、前面カメラと位置追跡を備えています。公式の C SDK を Hermes が Python から呼び、頭の位置や向き、カメラ映像を Linux で受け取れます。（$599）
- [Rokid AR Spatial](https://teknium.io/hermes-devices/#rokid-ar-spatial) — 表示用メガネ Rokid Max 2 と、Android ベースの小型端末 Station 2 のセットです。Hermes が作った空間アプリを端末に入れ、Wi-Fi で Hermes とやり取りします。（$549）

## VR と複合現実

- [Meta Quest 3](https://teknium.io/hermes-devices/#meta-quest-3) — Android ベースの単体型 MR ヘッドセットです。公式の Meta VR CLI が MCP server としても動くので、Hermes がアプリの導入・起動やログ取得、画面操作を tool として扱えます。（$599.99）
- [Apple Vision Pro \(M5\)](https://teknium.io/hermes-devices/#apple-vision-pro-m5) — Apple の空間コンピューターです。Hermes は SSH で Mac に入り Xcode でビルドしたアプリを転送するか、Safari が対応する WebXR のページを配信して表示させます。（$3,699）
- [Samsung Galaxy XR](https://teknium.io/hermes-devices/#samsung-galaxy-xr) — Android XR で動く Samsung のヘッドセットです。開発者向けオプションを有効にすれば、Hermes が adb で自作の APK を入れたり、Chrome 向けの WebXR ページを配信したりできます。（$1,799.99）
- [Valve Steam Frame](https://teknium.io/hermes-devices/#valve-steam-frame) — SteamOS で動く Valve のワイヤレス VR ヘッドセットです。開発者モードで SSH と adb が使えるので、Hermes は Linux マシンと同じようにログインしてビルドを配置できます。（$1,059）
- [Bigscreen Beyond 2e](https://teknium.io/hermes-devices/#bigscreen-beyond-2e) — とても軽い、視線追跡付きの PC 向け SteamVR ヘッドセットです。Hermes は PC 上で OpenXR アプリを作り、Python で頭やコントローラーの位置を、OSC で視線データを読みます。（~$1,159）
- [Pimax Crystal Super](https://teknium.io/hermes-devices/#pimax-crystal-super) — 光学部を交換できる高解像度の PC 向け VR ヘッドセットです。Hermes は SteamVR の機器として扱って OpenXR アプリを作り、Python で位置を、コミュニティ製ドライバで視線を読みます。（$1,599）
- [HTC VIVE Focus Vision](https://teknium.io/hermes-devices/#htc-vive-focus-vision) — 単体でも PC 接続でも使える、視線追跡付きの VR ヘッドセットです。Android ベースなので Hermes が adb で自作の APK を入れ、VIVE OpenXR SDK で視線や手の動きを扱えます。（$999）
- [bHaptics TactSuit Pro](https://teknium.io/hermes-devices/#bhaptics-tactsuit-pro) — 振動モーターを並べたワイヤレスの触覚ベストです。Hermes は公式の Python パッケージで、Windows か Mac 上の bHaptics Player を通し、モーターごとの振動やパターンを鳴らします。（$565）
- [Logitech MX Ink](https://teknium.io/hermes-devices/#logitech-mx-ink) — Meta Quest 3 / 3S 用の筆圧対応スタイラスです。Hermes が Quest Browser 向けの WebXR ページを配信するか APK を作ると、ペンの位置や筆圧、ボタンを読み、振動を返せます。（$129.99）
- [SlimeVR Full-Body Tracker](https://teknium.io/hermes-devices/#slimevr-full-body-tracker) — 体に付けた IMU センサーで全身の動きを取る、オープンハードウェアのトラッカーです。Hermes は SlimeVR Server に WebSocket や OSC でつなぎ、動きのデータを受け取ります。（$219）
- [Sony mocopi](https://teknium.io/hermes-devices/#sony-mocopi) — 小さなセンサーを体に付けて全身の動きを取る、Sony のモーションキャプチャーです。スマホアプリが UDP で送る動きを、Hermes が Blender や Unity のプラグインで受けて記録します。（$449.99）

## ウェアラブルと身体のセンサー

- [Watchy](https://teknium.io/hermes-devices/#watchy) — 自分で書き込んで使う、オープンソースの ESP32 電子ペーパー腕時計です。Hermes が独自の文字盤コードを生成して USB シリアルで書き込み、cron で新しい文字盤に差し替えられます。（~$80）
- [PineTime](https://teknium.io/hermes-devices/#pinetime) — オープンな InfiniTime ファームウェアで動く BLE 腕時計です。Hermes が BLE 経由で心拍や歩数を読み、時刻合わせや通知の送信を行えます。（~$27）
- [Bangle.js 2](https://teknium.io/hermes-devices/#bangle-js-2) — Bluetooth 経由で JavaScript のアプリを入れられるスマートウォッチです。Hermes が JS アプリを作って BLE で転送し、端末上でコードを動かしてセンサー値を受け取れます。（~$70）
- [Pebble \(Core Devices\)](https://teknium.io/hermes-devices/#pebble-core-devices) — 完全オープンソースの PebbleOS で復活した Pebble の腕時計です。Hermes がオープンな SDK でアプリや文字盤を作って転送し、BLE や timeline API で通知やデータを腕元に送ります。
- [Oura Ring 4](https://teknium.io/hermes-devices/#oura-ring-4) — 睡眠や HRV、心拍を測るスマートリングで、データはクラウドの Oura API V2 から取れます。Hermes は HTTPS で指標を読み、毎朝の要約や cron のレポートに入れられます。（~$349）
- [WHOOP 5.0 / MG](https://teknium.io/hermes-devices/#whoop-5-0-mg) — 画面のないバンド型トラッカーで、心拍や睡眠から Strain と Recovery を出します。Hermes は OAuth 2.0 の REST API か webhook でデータを受け、レポートやメモリに残せます。
- [Ultrahuman Ring AIR](https://teknium.io/hermes-devices/#ultrahuman-ring-air) — 睡眠や HRV、体温を測るスマートリングで、Partner API が用意されています。Hermes は自分用の Personal API token で日ごとの指標を取り、cron やレポートに使えます。（~$349）
- [Apple Watch Series 12](https://teknium.io/hermes-devices/#apple-watch-series-12) — Apple の定番スマートウォッチです。Linux から直接はつなげないため、iPhone のショートカットで健康データを Hermes の webhook に送るか、ヘルスケアの書き出しファイルを読み込みます。（$399）
- [Samsung Galaxy Watch9](https://teknium.io/hermes-devices/#samsung-galaxy-watch9) — Wear OS で動く Samsung のスマートウォッチです。Hermes は ADB でアプリを入れて操作でき、Health Sensor SDK で心拍などの生データを webhook に送るアプリも作れます。（$379.99）
- [Samsung Galaxy Ring](https://teknium.io/hermes-devices/#samsung-galaxy-ring) — 睡眠や心拍を測るチタン製のスマートリングです。直接つなぐ口がないため、Hermes がスマホ用のアプリを作り、Health Connect に集まったデータを webhook に送らせます。（$399.99）
- [Google Pixel Watch 5](https://teknium.io/hermes-devices/#google-pixel-watch-5) — Google の Wear OS スマートウォッチです。健康データは REST の Google Health API で取得でき、Hermes は無線デバッグの adb で自作のウォッチ用アプリを入れることもできます。（$399.99）
- [Google Fitbit Air](https://teknium.io/hermes-devices/#google-fitbit-air) — 画面のない Fitbit の活動量計バンドです。データは Google Health アプリに同期されるので、Hermes は OAuth で Google Health API を呼び、睡眠や心拍などを取得します。（$99.99）
- [Garmin fēnix 9](https://teknium.io/hermes-devices/#garmin-fenix-9) — Garmin の最上位マルチスポーツウォッチです。Hermes は公式の Personal API で活動や健康のデータを取り、Connect IQ SDK で作ったウォッチ用アプリを USB で入れることもできます。（$999.99）
- [Garmin Forerunner 970](https://teknium.io/hermes-devices/#garmin-forerunner-970) — Garmin のランニング向け最上位ウォッチです。Hermes は Personal API と公式の Python クライアントでランのデータを取り、Connect IQ のデータ項目やウィジェットも作れます。（$749.99）
- [Amazfit Balance 3](https://teknium.io/hermes-devices/#amazfit-balance-3) — Zepp OS で動く Amazfit のスマートウォッチです。Hermes が Zeus CLI で JavaScript のミニアプリを作り、スマホ側の処理から HTTP で Hermes とやり取りします。（$369.99）
- [Suunto Race 2](https://teknium.io/hermes-devices/#suunto-race-2) — JavaScript の SuuntoPlus アプリで機能を足せる Suunto のウォッチです。Hermes がアプリを書き、Windows か Mac の SuuntoPlus Editor でビルドして入れます。（$499）
- [Polar Grit X2 Pro](https://teknium.io/hermes-devices/#polar-grit-x2-pro) — Polar のアウトドア向け最上位ウォッチです。Hermes は誰でも登録できる AccessLink API に OAuth2 でつなぎ、運動や睡眠、回復のデータを REST と webhook で受け取ります。（$999.99）
- [COROS PACE 4 Pro](https://teknium.io/hermes-devices/#coros-pace-4-pro) — 軽いチタン製の COROS のスポーツウォッチです。公式の MCP server を Hermes に追加すれば、活動や睡眠のデータを読み、ウォッチに同期するトレーニング計画も作れます。（$449）
- [Polar H10](https://teknium.io/hermes-devices/#polar-h10) — 心電式の胸ストラップ型心拍計です。Hermes は Linux から bleak で直接つなぎ、心拍と RR 間隔、生の心電データを受け取れます。スマホやクラウドは通しません。（$104.95）
- [Polar Verity Sense](https://teknium.io/hermes-devices/#polar-verity-sense) — 腕に巻く光学式の心拍センサーです。Hermes は bleak で心拍を読み、オープンソースの bleakheart で脈波の生データも取れます。公式 SDK で Android アプリを作る道もあります。（$104.95）
- [Polar Loop](https://teknium.io/hermes-devices/#polar-loop) — 画面のない、24 時間身につけるタイプのバンドです。Hermes は AccessLink API で睡眠や心拍、活動のデータを取得でき、公式の BLE SDK でセンサーの値を直接取るアプリも作れます。（$199.99）
- [Withings ScanWatch 2](https://teknium.io/hermes-devices/#withings-scanwatch-2) — 針で時刻を示すハイブリッド型のスマートウォッチで、心電図アプリを備えています。Hermes は Withings の API、MCP server、Home Assistant 連携のいずれかで健康データを読めます。（$369.95）
- [RingConn Gen 2 Air](https://teknium.io/hermes-devices/#ringconn-gen-2-air) — サブスク不要のスマートリングです。Hermes は Health Connect の記録を読む小さな Android アプリを作って ADB で入れ、睡眠や心拍のデータを JSON で受け取ります。（$199）
- [Muse S Athena](https://teknium.io/hermes-devices/#muse-s-athena) — 脳波（EEG）と fNIRS を組み合わせた布製のヘッドバンドです。Hermes は BrainFlow の Python パッケージで BLE 接続し、脳波や光学センサーのデータを受けて自分で解析します。（$474.99）
- [Emotiv Insight](https://teknium.io/hermes-devices/#emotiv-insight) — 無線の脳波ヘッドセットです。Hermes は EMOTIV Launcher の Cortex API に WebSocket で接続し、生の脳波やメンタルコマンドなどを受け取ります。（$499）

## 健康・睡眠・フィットネスの機器

- [Withings BodyScan 2](https://teknium.io/hermes-devices/#withings-bodyscan-2) — 体組成や心電図、SpO2 まで測る Withings の Wi-Fi 体重計です。Hermes は公式 API で測定値を読み、Webhook や Home Assistant 連携でも受け取れます。（$599.95）
- [Withings BPM Vision](https://teknium.io/hermes-devices/#withings-bpm-vision) — カラー画面付きの上腕式 Wi-Fi 血圧計です。Hermes は Withings の公式 API で血圧と脈拍を読み、測定のたびに届く Webhook や Home Assistant 連携でも受け取れます。（$179.95）
- [Withings Sleep Analyzer](https://teknium.io/hermes-devices/#withings-sleep-analyzer) — マットレスの下に敷く睡眠計測パッドです。Hermes は Withings の API で毎晩の睡眠サマリーを読み、就寝・起床の Webhook を合図に Home Assistant 連携で家電を動かせます。（$199.95）
- [Withings BeamO](https://teknium.io/hermes-devices/#withings-beamo) — 体温計・心電計・聴診器をひとつにした手のひらサイズの機器です。Hermes は Withings の API で体温、心電図、聴診の記録を読み、同期と同時に届く Webhook で反応します。（$249.95）
- [Garmin Index S2](https://teknium.io/hermes-devices/#garmin-index-s2) — Garmin Connect に同期する Wi-Fi 体組成計です。公式 API は業務向けのため、Hermes は非公式の python-garminconnect ライブラリで計量データを読み書きします。（$199.99）
- [Renpho Elis 1 \(ES-CS20M\)](https://teknium.io/hermes-devices/#renpho-elis-1) — Bluetooth LE だけで通信する Renpho の体組成計です。Hermes はコミュニティ製の Python ライブラリで BLE から体重を直接受け取り、メーカーのアプリやクラウドを使わずに記録します。（$24.99）
- [Dexcom Stelo](https://teknium.io/hermes-devices/#dexcom-stelo) — インスリンを使わない成人向けの市販の持続血糖センサーです。Hermes は Android の xDrip+ 経由で血糖値を REST で読み、記録と報告だけを行います。診断はしません。（$99）
- [Omron Evolv \(BP7000\)](https://teknium.io/hermes-devices/#omron-evolv-bp7000) — チューブのない一体型の上腕式血圧計です。Hermes は Python の CLI ツール omblepy で BLE から測定記録を直接読むほか、Home Assistant 連携でもセンサーとして扱えます。（$119.99）
- [Nanit Pro](https://teknium.io/hermes-devices/#nanit-pro) — ベビーベッドを真上から見守るカメラです。Hermes はコミュニティ製の ha-nanit を入れた Home Assistant 経由で、映像や室温・湿度、動きと音の検知、ナイトライトを扱います。（$289.99）
- [Hatch Restore 3](https://teknium.io/hermes-devices/#hatch-restore-3) — 光で起こす目覚ましとサウンドマシンを兼ねた枕元の時計です。Hermes は Home Assistant 連携の ha\_hatch を通じて、お気に入りの再生や照明、起床時刻の変更ができます。（$169.99）
- [Eight Sleep Pod 6](https://teknium.io/hermes-devices/#eight-sleep-pod-6) — 左右別々に温冷できる水循環式のベッドカバーです。Hermes との連携候補として非公式の Home Assistant 連携がありますが、原文では本機の動作報告は未確認です。（$2,899 + $17/mo）
- [Sleep Number Climate360](https://teknium.io/hermes-devices/#sleep-number-climate360) — 硬さと温度を左右別に調整できるエアベッドです。Hermes は Home Assistant 標準の SleepIQ 連携を通じて、在床や硬さ、ベースの角度、温冷モードを読み書きします。（$9,249）
- [Concept2 RowErg with PM5](https://teknium.io/hermes-devices/#concept2-rowerg-pm5) — 仕様が公開されたモニター PM5 付きのローイングマシンです。Hermes は bleak で PM5 に BLE 接続してストロークを受け取り、ワークアウトを設定し、履歴は Logbook API で読みます。（$990）
- [Wahoo KICKR \(v6\)](https://teknium.io/hermes-devices/#wahoo-kickr-v6) — ダイレクトドライブ式のスマートトレーナーです。Hermes は標準規格 FTMS で BLE 接続し、パワーやケイデンスを読みながら、ERG モードの目標ワットや勾配を書き込みます。（$849.99）
- [Wahoo KICKR RUN](https://teknium.io/hermes-devices/#wahoo-kickr-run) — 標準規格 FTMS でデータを流す Wahoo のスマートトレッドミルです。Hermes は Python の pyftms で速度や傾斜、距離を読みます。外部からの操作は公式に案内されていません。（$6,999.99）

## AI ペンダント・録音機・コンパニオン

- [Plaud NotePin](https://teknium.io/hermes-devices/#plaud-notepin) — 身に着けて使う録音機で、文字起こしと要約をアプリで受け取れます。Hermes は公式の Plaud MCP server を hermes mcp add で追加し、録音の検索や文字起こしの読み出しができます。（~$159）
- [Omi](https://teknium.io/hermes-devices/#omi-pendant) — 会話を文字起こしや要約にするオープンソースのペンダントです。Hermes は公式の MCP server、REST API、CLI で会話やメモを読み書きし、BLE で音声を直接受けることもできます。（$129）
- [Bee Frontier](https://teknium.io/hermes-devices/#bee-frontier) — 手首や服に付けて会話を要約や ToDo にする Amazon のウェアラブルです。Hermes は公式 CLI を入れ、MCP server や REST API で会話や事実、ToDo を読み書きします。（$74.99）
- [Pebble Index 01](https://teknium.io/hermes-devices/#pebble-index-01) — ボタンを押している間だけ録音する指輪型のボイスメモです。アプリの Webhook を Hermes に向けると、音声や文字起こしを受け取れます。MCP にも対応します。（$75）
- [Looki L1](https://teknium.io/hermes-devices/#looki-l1) — 首や服に付けて日常を撮るウェアラブルカメラです。API の利用申請が通ると、Hermes は開発者 API で日ごとの記録や写真・動画を取得でき、コミュニティ製の MCP server もあります。（$249）
- [Mobvoi TicNote](https://teknium.io/hermes-devices/#mobvoi-ticnote) — スマホに磁石で貼り付けるカード型のボイスレコーダーです。Professional または Business プランのキーで、Hermes が公式クラウド API から文字起こしや要約を取得し、翻訳やアップロードも行えます。（$179.99 + Pro plan）
- [rabbit r1](https://teknium.io/hermes-devices/#rabbit-r1) — ポケットサイズの AI 端末です。公式に Hermes Agent に対応し、PC に rabbit agent を入れると、ボタンを押して話すだけで Hermes のセッションを始められます。（$199）
- [Sony aibo ERS-1000](https://teknium.io/hermes-devices/#sony-aibo-ers-1000) — 人や声に反応して個性が育つ Sony のロボット犬です。Hermes は公式の aibo Web API で芸や姿勢の動作を指示し、話しかけた言葉を Webhook で受け取れます。（$3,199.99 + $300/yr after year 3）
- [Living AI EMO](https://teknium.io/hermes-devices/#living-ai-emo) — 歩き回って表情を見せる卓上のペットロボットです。公式 API はなく、Hermes はコミュニティが解析した BLE の通信を使い、話す言葉や移動、アニメーションを送ります。（$279）
- [TangibleFuture LOOI](https://teknium.io/hermes-devices/#tangiblefuture-looi) — スマホを顔として載せる車輪付きの卓上ロボットです。公式 SDK はなく、Hermes はコミュニティ製の BLE ツールで走行や首の向き、ライトを操作し、タッチや着脱の通知を受けます。（$259）
- [Energize Lab Eilik](https://teknium.io/hermes-devices/#energize-lab-eilik) — 手のひらサイズの卓上ロボットです。Hermes はコミュニティ製 SDK のローカル HTTP API を呼び、サービス経由で USB 接続した本体の腕や首、顔の表示を操作します。（$139.99）
- [Yoto Player \(3rd Gen\)](https://teknium.io/hermes-devices/#yoto-player-3rd-gen) — カードを差して物語や音楽を流す子ども向けプレーヤーで、画面はなく小さなピクセル表示があります。Hermes は公式 API と MQTT で音量やライト、再生を操作し、読み上げ音声のプレイリストも作れます。（$109.99）
- [Toniebox 2](https://teknium.io/hermes-devices/#toniebox-2) — フィギュアを載せると物語や歌が流れる子ども向けスピーカーです。公開 API はなく、Hermes はコミュニティ製の Home Assistant 連携で再生や音量を操作し、自作の音声も送り込めます。（$129.99）
- [Birdbuddy Pro Solar](https://teknium.io/hermes-devices/#birdbuddy-pro-solar) — 訪れた鳥の種類を見分けるカメラ付きのソーラー給餌器です。Hermes はコミュニティ製の Python ライブラリや Home Assistant 連携で、新しい鳥が来た通知と写真を受け取ります。（$299.99）

## 集中・在席・状態表示のガジェット

- [BUSY Bar](https://teknium.io/hermes-devices/#busy-bar) — 集中中や通話中を表示する LED のステータスバーで、ファームウェアはオープンです。Hermes は HTTP API と busylib で表示を切り替え、WebSocket でボタン操作を受け取れます。（$199）
- [blink\(1\) mk3](https://teknium.io/hermes-devices/#blink-1-mk3) — USB に挿す小さな RGB の通知ライトで、ハードウェアは公開されています。Hermes は blink1-tool を 1 行呼ぶだけで色や点滅を変えられ、イベントの通知灯に使えます。（$39.95）
- [Luxafor Flag](https://teknium.io/hermes-devices/#luxafor-flag) — 旗の形をした USB の在席ライトで、取り込み中や通話中を周りに伝えます。Hermes は USB HID で色を変えるか、Luxafor の Web API を 1 回呼んで状態を切り替えられます。（$59）
- [Kuando Busylight](https://teknium.io/hermes-devices/#kuando-busylight) — 業務向けの USB 在席ライトで、色や点滅に加えて音も鳴らせます。Hermes は Plenom の USB API や SDK で操作でき、kuandoHUB 経由なら普通の HTTP リクエストでも動かせます。（$99）
- [MuteMe](https://teknium.io/hermes-devices/#muteme) — マイクのミュート状態を光で示すタッチボタンで、HID のキーマップが公開されています。Hermes は色を送り、タッチを読み取れるので、Hermes の起動ボタン兼ランプに使えます。（$29.99）
- [Flic 2](https://teknium.io/hermes-devices/#flic-2) — 押し方で動作を分けられる Bluetooth のワイヤレスボタンです。押すと HTTP POST を送る設定にすれば、Hermes の受け口を呼べます。Flic Hub LR なら MQTT にも流せます。（$34.99）
- [Elgato Stream Deck Neo](https://teknium.io/hermes-devices/#elgato-stream-deck-neo) — 8 個の液晶キーを持つ小型のマクロパッドです。Hermes は Stream Deck のプラグインでキーの画像を描き替え、押されたら Hermes のコマンドを実行させられます。HID で直接扱う方法もあります。（$99.99）
- [Ulanzi TC001 \(AWTRIX\)](https://teknium.io/hermes-devices/#ulanzi-tc001-awtrix) — 32x8 のピクセル時計で、AWTRIX 3 を書き込むと家庭用の表示器になります。Hermes は REST API か MQTT に JSON を送り、文字やアイコン、通知を表示できます。（$59.99）
- [Time Timer](https://teknium.io/hermes-devices/#time-timer) — 残り時間が赤い円盤の大きさで分かるアナログのタイマーです。API も無線もないため、Hermes から読むことも設定することもできません。手で使う集中用の道具として並べています。（$24.95+）
- [TickTime Cube](https://teknium.io/hermes-devices/#ticktime-cube) — 上に向けた面の時間でカウントダウンが始まるキューブ型のタイマーです。アプリも Bluetooth も API もないため、Hermes からは操作できません。手で使う集中用の道具です。（$24.99）

## Hermes が描くディスプレイ

- [Seeed reTerminal E1001](https://teknium.io/hermes-devices/#seeed-reterminal-e1001) — ケース入りの 7.5 インチ電子ペーパー表示器で、ESP32-S3 で動きます。Hermes が ESPHome の YAML を書いて OTA で入れれば、Home Assistant の情報を表示できます。（~$69）
- [Pimoroni Presto](https://teknium.io/hermes-devices/#pimoroni-presto) — 4 インチのタッチ画面と背面の RGB ライトを持つ RP2350 の卓上ディスプレイです。Hermes は MicroPython を書いて送り、エージェントの状態を表示したり、タップを承認に使ったりできます。（~$78）
- [TRMNL OG](https://teknium.io/hermes-devices/#trmnl-og) — 電子ペーパーの表示器です。Developer Edition を有効にすると、Hermes が Webhook に JSON を送って表示内容を渡せます。公式 CLI や MCP、自前のサーバーを使う方法もあります。（$139 + $20 dev add-on）
- [TRMNL X](https://teknium.io/hermes-devices/#trmnl-x) — TRMNL の大型の電子ペーパー表示器で、タッチバーを備えます。Hermes は OG と同じ Webhook、CLI、MCP で扱え、広い画面に写真やグラフも描けます。（$229 + $20 dev add-on）
- [Vobot Mini Dock](https://teknium.io/hermes-devices/#vobot-mini-dock) — 小さな画面とつまみが付いた USB-C ドックです。Hermes が MicroPython アプリを作って USB で転送し、アプリが LAN 上の Hermes から状態や通知を取得して表示します。（$41.99）
- [GeekMagic SmallTV Ultra](https://teknium.io/hermes-devices/#geekmagic-smalltv-ultra) — 小さな Wi-Fi 表示器です。Hermes は機種とファームウェアを確認し、コミュニティが解析した HTTP API へ画像をアップロードして表示します。（~$10 + shipping）
- [LaMetric TIME](https://teknium.io/hermes-devices/#lametric-time) — ドット表示の Wi-Fi 時計です。Hermes は LAN 内のローカル API に JSON を送り、アイコン付きの通知やグラフを出します。Home Assistant の標準連携からも送れます。（$199.99）
- [LaMetric SKY](https://teknium.io/hermes-devices/#lametric-sky) — 三角形の LED タイルをつなげる壁掛けライトです。Hermes は LaMetric TIME と同じローカル API を使い、UDP でピクセルを流してライブ表示したり、MQTT で数値を出したりします。（$199.99）
- [Divoom Pixoo-64 II](https://teknium.io/hermes-devices/#divoom-pixoo-64-ii) — Divoom の LED ピクセルアート表示パネルです。Hermes は公開されたローカル JSON API に POST し、画像や流れる文字、GIF、ブザーを操作します。Home Assistant 連携もあります。（$149.99）
- [Divoom Times Gate](https://teknium.io/hermes-devices/#divoom-times-gate) — 5枚のカラー画面を並べた Divoom の卓上表示器です。Hermes は公式のローカル JSON API で画面を1枚ずつ指定し、画像や GIF、文字を送ります。（$139.99）
- [Soldered Inkplate 13SPECTRA](https://teknium.io/hermes-devices/#soldered-inkplate-13spectra) — ESP32-S3 を内蔵した A4 サイズのカラー電子ペーパーです。Hermes が描いた画像を HTTP で配り、パネルが定期的に取りに行きます。ESPHome 経由で Home Assistant にも出せます。（$379）
- [Soldered Inkplate 6FLICK](https://teknium.io/hermes-devices/#soldered-inkplate-6flick) — フロントライトとタッチ機能を備えた電子ペーパーです。Hermes が配信する画像を表示し、タッチ操作を Hermes の HTTP エンドポイントへ返す操作盤を作れます。（~$220）
- [Pimoroni Inky Impression 13.3"](https://teknium.io/hermes-devices/#pimoroni-inky-impression-13) — Raspberry Pi に載せる大判のカラー電子ペーパーです。Hermes が SSH で Pi に入り、描いた画像を inky ライブラリで表示します。背面ボタンも読めます。（$209）
- [Pimoroni Inky Frame 7.3" \(Pico 2 W\)](https://teknium.io/hermes-devices/#pimoroni-inky-frame-7-3) — Pico 2 W 内蔵の、起きて画像を取って眠るカラー電子ペーパーの額です。Hermes が配る JPEG を MicroPython で取りに行き、コードも Hermes が USB で書き込めます。（$86）
- [Waveshare ESP32-S3-PhotoPainter](https://teknium.io/hermes-devices/#waveshare-esp32-s3-photopainter) — ESP32-S3 内蔵の木枠のカラー電子ペーパー額です。Hermes は標準ファームの画像アップロード経路を使うか、公開コードから独自の ESP-IDF ファームを作って書き込めます。（~$84）
- [Elgato Stream Deck +](https://teknium.io/hermes-devices/#elgato-stream-deck-plus) — LCD キーとダイヤル、タッチストリップを持つ操作盤です。Linux では Hermes が USB HID で直接描画と入力を扱い、Windows や Mac では公式 SDK のプラグインでつなぎます。（$179.99）
- [Pimoroni Stellar Unicorn \(Pico 2 W\)](https://teknium.io/hermes-devices/#pimoroni-stellar-unicorn) — Pico 2 W で動く RGB LED マトリクスです。Hermes が MicroPython スクリプトを書き込み、Wi-Fi 越しに文字を送ったり、Hermes の HTTP エンドポイントから情報を取得させたりできます。（$45）
- [Ulanzi D200X Creative Deck](https://teknium.io/hermes-devices/#ulanzi-d200x) — LCD キーとノブ、画面を備えたストリームコントローラーです。Hermes が公式 Plugin SDK で Node.js のプラグインを書き、キー表示とノブの操作を扱います。（$99.99）

## キーボードと周辺機器

- [ZSA Voyager](https://teknium.io/hermes-devices/#zsa-voyager) — 薄型の分割キーボードで、QMK で動きます。Hermes は kontroll CLI で Keymapp API を呼び、レイヤーの切り替えや LED の色をエージェントの状態に合わせて変えられます。（~$365）
- [ZSA Moonlander](https://teknium.io/hermes-devices/#zsa-moonlander) — 親指キーを備えた分割キーボードで、QMK で動きます。Hermes は kontroll CLI でレイヤーや RGB を操作でき、ビルドの結果や通知に合わせてキーボードの光を変えられます。（~$365）
- [Keychron Q1 Max](https://teknium.io/hermes-devices/#keychron-q1-max) — アルミ筐体の 75% キーボードで、QMK と VIA に対応しています。Hermes は VIA の仕組みでキー配置やマクロを書き換えたり、QMK のファームウェアをビルドして書き込んだりできます。（~$230）
- [Wooting 80HE](https://teknium.io/hermes-devices/#wooting-80he) — キーの押し込み量を読める磁気スイッチのキーボードです。Hermes はオープンソースの Wooting Analog SDK で押し込み量を受け取り、キーを連続値の入力として使えます。（~$200）
- [Work Louder Creator Micro](https://teknium.io/hermes-devices/#work-louder-creator-micro) — AI エージェントの操作用とうたう QMK のマクロパッドです。Hermes は実行状態をキーの光で示し、キーで出力の承認・却下や push-to-talk を受け付ける使い方ができます。（~$149）
- [Elgato Stream Deck](https://teknium.io/hermes-devices/#elgato-stream-deck) — 液晶キーを並べたマクロパッドで、公式の SDK と WebSocket のプラグイン API があります。Hermes は小さなプラグインを作り、キーを操作ボタンや状態表示に変えられます。（~$150）
- [Ploopy \(open trackballs\)](https://teknium.io/hermes-devices/#ploopy-open-trackballs) — 設計とファームウェアがすべて公開されたトラックボールのシリーズで、QMK で動きます。Hermes は QMK をビルドして書き込み、ボタンやスクロールの割り当てを変えられます。（Varies \(~CAD $40-150\)）
- [SmartKnob](https://teknium.io/hermes-devices/#smartknob) — モーターで手応えをソフトウェアから変えられる、自作向けのオープンソースのノブです。Hermes は USB シリアルで設定を送り、目盛りの数や止まる位置をその場で切り替えられます。（Varies \(DIY\)）
- [Logitech MX Creative Console](https://teknium.io/hermes-devices/#logitech-mx-creative-console) — キーパッドとダイヤルパッドの 2 つに分かれたマクロ操作機です。Hermes は Logi Actions SDK でプラグインを作り、キーで skill を起動したり、ダイヤルで値を変えたりできます。（~$200）
- [Kinesis Advantage360 Pro](https://teknium.io/hermes-devices/#kinesis-advantage360-pro) — 傾きを調整できる分割型のエルゴノミクスキーボードで、Pro は ZMK で動きます。Hermes はキー配置をコードとして編集してビルドできますが、書き込みは手で行い、動作中の切り替えはできません。（~$499）

## オーディオとメディア

- [LG OLED evo C6](https://teknium.io/hermes-devices/#lg-oled-evo-c6) — webOS で動く LG の OLED テレビです。Hermes がローカルの WebSocket API でペアリングし、入力切り替え、アプリ起動、音量、画面への通知表示を操作します。（65" $1,399.99）
- [Samsung The Frame \(2026\)](https://teknium.io/hermes-devices/#samsung-the-frame) — 使わないときに絵を飾れる Samsung のアートモード付きテレビです。Hermes がローカル API で操作し、画像のアップロードや表示する作品の切り替えまで行えます。（65" $1,199.99）
- [Sony BRAVIA 8 II](https://teknium.io/hermes-devices/#sony-bravia-8-ii) — Google TV を載せた Sony のテレビです。IP 制御を有効にすると、Hermes が公開された REST API で電源、入力、音量、アプリ起動を操作し、リモコンのコードも送れます。（65" $2,799.99）
- [TCL QM8L](https://teknium.io/hermes-devices/#tcl-qm8l) — Google TV を載せた TCL のテレビです。Hermes が ADB でキー送信やアプリ起動、APK の導入を行い、開発者モードなしでも Android TV Remote プロトコルで操作できます。（65" $1,199.99）
- [Apple TV 4K \(4th gen\)](https://teknium.io/hermes-devices/#apple-tv-4k) — tvOS で動き、Apple Home のハブにもなる小型機です。Hermes が pyatv でペアリングし、リモコン操作、再生中の情報の取得、アプリ起動、AirPlay での配信を行います。（$299）
- [Google TV Streamer](https://teknium.io/hermes-devices/#google-tv-streamer) — Google TV のセットトップボックスで、Thread のボーダールーターも兼ねます。Hermes が Android TV Remote プロトコルか ADB で、キー送信やアプリ起動を行います。（$149.99）
- [Roku Ultra](https://teknium.io/hermes-devices/#roku-ultra) — Roku の上位のストリーミングプレーヤーです。Hermes が公開された HTTP の制御 API でキー操作、アプリ起動、再生状態の取得を行い、開発者モードでは自作アプリも入れられます。（$149.99）
- [NVIDIA SHIELD TV Pro](https://teknium.io/hermes-devices/#nvidia-shield-tv-pro) — NVIDIA の Android TV ボックスです。Hermes がネットワーク ADB でアプリ起動やシェル実行、前面アプリの確認を行い、軽い操作は Android TV Remote プロトコルで済ませます。（$299.99）
- [Amazon Fire TV Stick 4K Max \(2nd Gen\)](https://teknium.io/hermes-devices/#fire-tv-stick-4k-max) — 標準で ADB を使える Fire OS の Fire TV Stick です。ADB デバッグを有効にすると、Hermes がキー送信、アプリ起動、APK の導入、前面アプリの確認を行えます。（$84.99）
- [Steam Deck OLED](https://teknium.io/hermes-devices/#steam-deck-oled) — SteamOS で動く Valve の携帯ゲーム PC です。パスワードを設定して sshd を有効にすると、Hermes が SSH で入り、ゲームの起動や Decky Loader のプラグイン作りができます。（$789）
- [Xbox Series X](https://teknium.io/hermes-devices/#xbox-series-x) — Microsoft のゲーム機です。現在の連携経路はクラウド経由で、Hermes は Home Assistant の Xbox 連携を通して本体やアプリの起動を操作します。（$799.99）
- [PlayStation 5](https://teknium.io/hermes-devices/#playstation-5) — Sony のゲーム機で、操作できる範囲は限られます。Hermes は Home Assistant の PSN 連携で遊んでいるゲームを読み、ps5-mqtt でレストモードとの切り替えを行います。（$649.99）
- [Epson Home Cinema LS7500](https://teknium.io/hermes-devices/#epson-home-cinema-ls7500) — LAN につながる Epson のレーザープロジェクターです。IP 制御を有効にすると、Hermes が PJLink で電源・入力・エラー状態を扱い、ESC/VP21 のコマンドも送れます。（$2,699.99）
- [XGIMI HORIZON 20 Max](https://teknium.io/hermes-devices/#xgimi-horizon-20-max) — Google TV を載せた XGIMI のレーザープロジェクターです。Hermes が Android TV Remote プロトコルでペアリングし、電源、キー、音量、ディープリンクでのアプリ起動を操作します。（$2,599）
- [Sonos Era 100](https://teknium.io/hermes-devices/#sonos-era-100) — Sonos の小型ステレオスピーカーです。Hermes が SoCo で LAN 上のスピーカーを見つけ、音量、部屋のグループ化、キュー、アラームを操作し、音声の URL も再生できます。（$219）
- [Sonos Arc Ultra](https://teknium.io/hermes-devices/#sonos-arc-ultra) — Dolby Atmos 対応の Sonos のサウンドバーです。Hermes が SoCo で操作し、Home Assistant の sonos 連携でナイトサウンドや会話の強調など、テレビ向けの設定も変えられます。（$1,099）
- [WiiM Ultra](https://teknium.io/hermes-devices/#wiim-ultra) — タッチ画面付きのネットワークストリーマー兼プリアンプです。WiiM が公開する HTTP API で、Hermes が状態の取得、音量、URL の再生、入力切り替え、EQ を操作します。（$349）
- [Bluesound NODE \(N132\)](https://teknium.io/hermes-devices/#bluesound-node) — BluOS で動く Bluesound のストリーマーです。公開された HTTP の API で、Hermes が状態の取得、音量、URL の再生、プリセット、グループ化を行い、変化もすぐ拾えます。（$749）
- [Denon AVR-X3800H](https://teknium.io/hermes-devices/#denon-avr-x3800h) — IP 制御に対応した Denon の AV アンプです。Hermes が denonavr ライブラリで状態を読み、telnet でイベントを受けながら、電源、入力、音量、ゾーンを切り替えます。（$1,399）
- [Philips Hue Play HDMI Sync Box 8K](https://teknium.io/hermes-devices/#hue-play-hdmi-sync-box-8k) — HDMI の映像に合わせて Hue の照明を光らせる中継ボックスです。一度登録すると、Hermes がローカルの HTTPS API で同期の入り切り、モード、明るさ、入力を操作できます。（$384.99）

## カメラ・ドローン・撮影機材

- [GoPro HERO13 Black](https://teknium.io/hermes-devices/#gopro-hero13-black) — 公式の Open GoPro API に対応した GoPro のアクションカメラです。Hermes が Python SDK で BLE から起こし、設定変更、録画の開始と停止、メディアの取得を行います。（$429.99）
- [Insta360 X6](https://teknium.io/hermes-devices/#insta360-x6) — Insta360 の 360 度カメラです。Hermes がカメラの Wi-Fi に入り、OSC の HTTP API で撮影や設定を扱います。USB なら Linux 向けの Camera SDK も使えます。（$699.99）
- [RICOH THETA X](https://teknium.io/hermes-devices/#ricoh-theta-x) — 家の Wi-Fi に参加できる RICOH の 360 度カメラです。Hermes が公開された Web API で撮影、設定、ライブプレビュー、状態の取得を行い、BLE からシャッターも切れます。（$599.95）
- [Insta360 Link 2](https://teknium.io/hermes-devices/#insta360-link-2) — ジンバルで向きを変えて人を追う Web カメラです。Hermes が公式の UVC Camera SDK でパン・チルト・ズームを動かし、追尾やホワイトボードのモードを切り替えます。（$199.99）
- [OBSBOT Tiny 3](https://teknium.io/hermes-devices/#obsbot-tiny-3) — 2 軸ジンバルに載った小型の Web カメラです。Hermes が OBSBOT の C++ SDK で、ジンバル、ズーム、プリセット、AI 追尾を操作します。Windows や Mac では OSC も使えます。（$349）
- [OBSBOT Tail 2](https://teknium.io/hermes-devices/#obsbot-tail-2) — ネットワークにつながる AI 追尾の PTZ カメラです。Hermes が OSC か VISCA を送ってジンバル、ズーム、追尾、録画を操作し、NDI や RTSP の映像で写り方も確かめます。（$1,298）
- [PTZOptics Move 4K](https://teknium.io/hermes-devices/#ptzoptics-move-4k) — PTZOptics のパン・チルト・ズームのカメラです。Hermes が公開された HTTP-CGI API でプリセットや追尾を操作し、細かい制御は VISCA で送ります。映像で構図も確かめられます。（$2,349）
- [Sony Alpha 7 V](https://teknium.io/hermes-devices/#sony-a7-v) — Sony のフルサイズのミラーレス一眼です。Linux 向けにも出ている Camera Remote SDK を Hermes が使い、露出の設定、シャッター、ライブビュー、画像のダウンロードを行います。（$2,899.99）
- [Canon EOS R6 Mark III](https://teknium.io/hermes-devices/#canon-eos-r6-mark-iii) — Camera Control API に対応した Canon のミラーレス一眼です。Hermes が Wi-Fi 越しの REST で露出の設定、シャッター、ライブビュー、ファイル取得を行います。（$2,799）
- [Nikon Z6III](https://teknium.io/hermes-devices/#nikon-z6iii) — Nikon のフルサイズのミラーレス一眼です。公式 SDK は Windows と Mac 向けなので、Linux では Hermes が USB 経由の gphoto2 で設定変更、撮影、ファイル取得を行います。（$1,999.95）
- [FUJIFILM X-T5](https://teknium.io/hermes-devices/#fujifilm-x-t5) — ダイヤル操作が特徴の FUJIFILM のミラーレス一眼です。Linux 向けにも出ている Camera Control SDK を Hermes が使い、USB か Wi-Fi で画像の転送と遠隔操作を行います。（$1,999.95）
- [Blackmagic Cinema Camera 6K](https://teknium.io/hermes-devices/#blackmagic-cinema-camera-6k) — フルサイズのシネマカメラです。Hermes は Camera Control REST API で録画の開始・停止や ISO・フォーカスを操作し、WebSocket で状態の変化を受け取れます。（$1,755）
- [Elgato Key Light \(MK.2\)](https://teknium.io/hermes-devices/#elgato-key-light-mk2) — 机に付ける Wi-Fi 対応の LED パネルライトです。Hermes は本体の JSON API に HTTP で明るさや色温度を送ります。python-elgato や Home Assistant 連携も使えます。（$179.99）
- [Logitech G Litra Beam LX](https://teknium.io/hermes-devices/#logitech-litra-beam-lx) — 前面の照明と背面の RGB を持つ両面のデスクライトです。litra CLI で USB から操作でき、litra mcp を起動すれば Hermes が MCP server として使えます。（$159.99）
- [ModalAI Starling 2 Max](https://teknium.io/hermes-devices/#modalai-starling-2-max) — PX4 と Linux が動く VOXL 2 を積んだ開発用ドローンです。Hermes は機体に SSH し、MAVSDK-Python や pymavlink でテレメトリの読み取りやミッションの送信を行います。（$4,199.99）

## 部屋ごとの音声端末

- [Home Assistant Voice PE](https://teknium.io/hermes-devices/#home-assistant-voice-pe) — Home Assistant 用のローカル重視の音声スピーカーで、ファームウェアはオープンソースです。Hermes は homeassistant プラグインを通じて、このスピーカーでお知らせを読み上げられます。（~$69）
- [FutureProofHomes Satellite1](https://teknium.io/hermes-devices/#futureproofhomes-satellite1) — 音声アシスタントとスピーカー、部屋のセンサーを 1 台にまとめた組み替え可能な機器です。ESPHome で動くため、Hermes は homeassistant プラグインで操作し、センサーも読めます。（~$70 Dev Kit / ~$133 assembled）
- [reSpeaker XVF3800 \(4-mic\)](https://teknium.io/hermes-devices/#respeaker-xvf3800-4-mic) — XMOS の音声処理を載せた 4 マイクの円形アレイで、離れた声も拾えます。Hermes のホストに USB でつなぐと、Hermes の音声モードや文字起こし用のマイクとして使えます。（~$61）
- [reSpeaker Lite](https://teknium.io/hermes-devices/#respeaker-lite) — XMOS の音声処理を載せた安価な 2 マイクのボードで、自作の音声アシスタント向けです。USB マイクとしてつなげば、Hermes の音声モードにノイズの少ない音声を入れられます。（~$27）

## 制御の中核

- [Home Assistant Green](https://teknium.io/hermes-devices/#home-assistant-green) — Home Assistant OS を入れた状態で届く公式のハブ機です。Hermes は MCP サーバーや REST API で家を操作し、SSH 経由で設定の編集やバックアップの取得も行えます。（~$199）
- [Home Assistant Yellow](https://teknium.io/hermes-devices/#home-assistant-yellow) — Zigbee・Thread の無線を内蔵した、CM4 を載せる Home Assistant 用ボードです。Hermes は USB ドングルなしで Zigbee や Thread のメッシュを管理できます。
- [HA Connect ZBT-2](https://teknium.io/hermes-devices/#ha-connect-zbt-2) — Zigbee か Thread に使う公式の USB アダプターの第 2 世代です。Hermes は直接触らず、Home Assistant の MCP サーバーや Zigbee2MQTT 経由で機器を動かします。（~$49）
- [HA Connect ZWA-2](https://teknium.io/hermes-devices/#ha-connect-zwa-2) — Z-Wave 800 と Long Range に対応した公式の USB アダプターです。Hermes は Home Assistant や Z-Wave JS UI を通じて、ノードの追加や状態確認を行えます。（~$69）
- [SMLIGHT SLZB-06](https://teknium.io/hermes-devices/#smlight-slzb-06) — PoE 給電で LAN のどこにでも置ける Zigbee コーディネーターです。Hermes は Zigbee2MQTT の MQTT や Home Assistant の MCP サーバー経由で機器を操作します。

## スマートホームのハブ・照明・空調

- [IKEA DIRIGERA Hub](https://teknium.io/hermes-devices/#ikea-dirigera) — IKEA Home のスマート製品をまとめる Matter 対応ハブです。Hermes は dirigera Python ライブラリでローカル API を使い、照明やブラインドの操作とイベントの受信を行います。（$139.99）
- [Aeotec Smart Home Hub 2 \(SmartThings\)](https://teknium.io/hermes-devices/#aeotec-smart-home-hub-2) — Zigbee・Thread・Matter に対応した SmartThings のハブです。Hermes は SmartThings REST API か公式 CLI で、ハブにつないだ機器の状態を読んで操作します。（$119.99）
- [Aqara Hub M3](https://teknium.io/hermes-devices/#aqara-hub-m3) — Aqara の Zigbee 機器を Matter にまとめるハブです。Home Assistant に追加すると、Hermes がその API や MCP server から Aqara の機器を扱えます。（$159.99）
- [Hubitat Elevation C-8 Pro](https://teknium.io/hermes-devices/#hubitat-elevation-c-8-pro) — Z-Wave と Zigbee の自動化をローカルで動かすハブです。Maker API で REST API を出せ、MCP Connector を入れれば Hermes が MCP server として追加できます。（$199.95）
- [Homey Pro \(2026\)](https://teknium.io/hermes-devices/#homey-pro) — 多くの無線方式を内蔵し Flow をローカルで動かすハブです。Hermes はローカル API キーで Homey Web API を呼ぶか、公式の MCP server を追加して機器や Flow を操作します。（$449）
- [Lutron Caséta Smart Hub](https://teknium.io/hermes-devices/#lutron-caseta-smart-hub) — Caséta の調光スイッチやシェードを独自の無線で制御するハブです。Hermes は pylutron-caseta で LAN 上の LEAP を話し、明るさの変更やリモコン操作の受信を行います。（$89.95）
- [Inovelli Blue Series 2-1 Switch](https://teknium.io/hermes-devices/#inovelli-blue-series-2-1-switch) — 壁に埋め込む Zigbee のスイッチ兼調光器で、色の変わる LED バーを持ちます。Zigbee2MQTT につなぐと、Hermes が MQTT で操作し、ボタンの押下や電力値を受け取れます。（$60）
- [Twinkly Strings](https://teknium.io/hermes-devices/#twinkly-strings) — LED を一つずつ指定できる Wi-Fi 対応のストリングライトです。Hermes は本体のローカル HTTP API を ttls ライブラリで使い、色や明るさを変えたりフレームを流したりできます。（$74.99+）
- [WiZ Full Color A19 Bulb](https://teknium.io/hermes-devices/#wiz-full-color-a19-bulb) — ハブなしで Wi-Fi につながるフルカラー電球です。Hermes は UDP で JSON を送って色や明るさを変え、状態も読めます。pywizlight や Home Assistant 連携も使えます。（$21.99 \(2-pack\)）
- [SwitchBot Curtain 3](https://teknium.io/hermes-devices/#switchbot-curtain-3) — 今あるカーテンに付けて開け閉めする電池式のモーターです。Hermes はハブなしなら PySwitchbot で BLE から、ハブがあれば SwitchBot のクラウド API で操作します。（$89.99）
- [ecobee Smart Thermostat Premium](https://teknium.io/hermes-devices/#ecobee-smart-thermostat-premium) — 室内センサーと空気質の測定を備えた ecobee のサーモスタットです。開発者 API は新規登録を止めているため、Hermes は Home Assistant 連携を通して操作します。（$259.99）
- [Google Nest Learning Thermostat \(4th gen\)](https://teknium.io/hermes-devices/#nest-learning-thermostat-4th-gen) — 予定を学習する Matter 認証のサーモスタットです。Hermes は Google の SDM REST API で設定を変えられ、Home Assistant の Matter 連携ならローカルでも操作できます。（$279.99）
- [Sensibo Air Pro](https://teknium.io/hermes-devices/#sensibo-air-pro) — リモコンと同じ赤外線でエアコンを動かす小さな Wi-Fi 機器です。Hermes は Sensibo の公開 REST API を API キーで呼び、電源やモード、設定温度を変え、測定履歴も取れます。（$139）
- [Honeywell Home X8S Smart Thermostat](https://teknium.io/hermes-devices/#honeywell-home-x8s) — 空気質も測る Honeywell Home の Matter 認証サーモスタットです。Hermes は Home Assistant の Matter 連携を通して、温度を読みモードや設定温度を変えます。（$219.99）
- [Mysa Smart Thermostat](https://teknium.io/hermes-devices/#mysa-smart-thermostat) — セントラル空調向けの Matter 対応サーモスタットです。Home Assistant に Matter で登録すると、Hermes がその API や MCP server を通して温湿度を読み設定を変えます。（$129）
- [Big Ass Fans Haiku](https://teknium.io/hermes-devices/#big-ass-fans-haiku) — 温度と人感のセンサーを内蔵したシーリングファンです。Hermes は aiobafi6 で LAN 上から風量やモードを操作し、温湿度や在室の情報をクラウドなしで読み取ります。（$1,550+）
- [Dyson Purifier Big+Quiet Formaldehyde BP04](https://teknium.io/hermes-devices/#dyson-big-quiet-formaldehyde-bp04) — 広い部屋向けの Dyson の空気清浄機で、本体が MQTT broker を動かしています。Hermes は libdyson-neon で LAN から接続し、空気質を読み電源や風量を変えます。（$899.99）
- [Levoit Core 600S-P](https://teknium.io/hermes-devices/#levoit-core-600s-p) — 広い部屋向けの HEPA 空気清浄機です。Hermes は pyvesync で VeSync のクラウドに接続し、PM2.5 やフィルター寿命を読み、モードや風量を変えます。（$299.99）
- [IKEA ALPSTUGA](https://teknium.io/hermes-devices/#ikea-alpstuga) — CO2 と PM2.5 を測る IKEA の Matter over Thread センサーです。Home Assistant に登録すると、Hermes がその値を読み、清浄機や換気扇を動かす判断に使えます。（$34.99）
- [Aqara Presence Multi-Sensor FP300](https://teknium.io/hermes-devices/#aqara-fp300) — ミリ波レーダーで座った人も検知する電池式の在室センサーです。Thread なら Matter で Home Assistant に、Zigbee なら Zigbee2MQTT から Hermes が値を受け取れます。（$49.99）
- [Airthings View Plus](https://teknium.io/hermes-devices/#airthings-view-plus) — ラドンや CO2 など 7 種類を測る空気質モニターです。Hermes は Airthings 公式の Consumer API で最新の測定値を取得します。Home Assistant 連携も使えます。（$329.99）
- [Qingping Air Monitor 2](https://teknium.io/hermes-devices/#qingping-air-monitor-2) — CO2 や PM2.5 を画面に出す空気質モニターです。自分の MQTT broker に送らせる設定にすると、Hermes が測定値を受け取り、通知間隔やアラームの値も変えられます。（$149.99）

## ローカル優先のスマートホーム

- [Shelly \(relays, meters\)](https://teknium.io/hermes-devices/#shelly-relays-meters) — 壁内リレーや電力計などのシリーズで、LAN 内の API を備えています。Hermes は Gen2 以降を RPC で操作し、機器内スクリプトも書き込めます。Gen1 は HTTP REST API で扱います。
- [Shelly Pro 3EM](https://teknium.io/hermes-devices/#shelly-pro-3em) — 分電盤に付けて家全体の電力を測る三相対応の電力計です。Hermes は RPC API や MQTT で相ごとの電力を読み、今の消費電力に答えたり、cron で日ごとの集計を作ったりできます。（~$129 \(120A version, US store\)）
- [Athom \(pre-flashed ESPHome/Tasmota/WLED plugs, bulbs, switches\)](https://teknium.io/hermes-devices/#athom-pre-flashed-esphome-tasmota-wled-plugs-bul) — ESPHome や Tasmota、WLED を書き込み済みで届くプラグやスイッチです。Hermes は Home Assistant や MQTT で操作し、ESPHome の設定を OTA で更新できます。（~$10-20 per plug）
- [SONOFF Dongle Plus MG24](https://teknium.io/hermes-devices/#sonoff-dongle-plus-mg24) — USB に挿す Zigbee のコーディネーターです。Zigbee2MQTT を動かすと、つないだ Zigbee 機器がすべて MQTT に出て、Hermes が状態を読み操作できます。（$35.90）
- [Apollo Automation](https://teknium.io/hermes-devices/#apollo-automation) — ESPHome で動き、クラウドなしで使える室内センサーのシリーズです。Hermes は Home Assistant の MCP server 経由で値を読め、公開された YAML を改造して OTA で入れられます。（~$38 \(MSR-2\), ~$110+ \(AIR-1\)）
- [Everything Presence One](https://teknium.io/hermes-devices/#everything-presence-one) — ミリ波レーダーと赤外線センサーを組み合わせた在室センサーで、ESPHome で動きます。Hermes は Home Assistant 経由で在室状態を読み、YAML を編集して検知範囲を調整できます。（~$65）
- [ratgdo](https://teknium.io/hermes-devices/#ratgdo) — Chamberlain のガレージ開閉機を myQ なしで操作できるようにするオープンなボードです。Hermes は Home Assistant や MQTT で開閉でき、cron で夜に閉まっているか確かめられます。（~$62 \(ratgdo32\), ~$94 \(disco\)）
- [Konnected blaQ](https://teknium.io/hermes-devices/#konnected-blaq) — Chamberlain などのガレージ開閉機につなぐ市販のコントローラーで、ESPHome で動きます。Hermes は Home Assistant の MCP server 経由で扉や照明を読み、操作できます。（~$89）
- [Konnected \(alarm panels\)](https://teknium.io/hermes-devices/#konnected-alarm-panels) — 有線の古い警報システムの基板を置き換え、既存のセンサーをスマートホームで使えるようにします。Hermes はゾーンの状態を読み、カメラなどと突き合わせてから通知を出せます。（~$229 \(Pro 12-zone kit\)）
- [OpenMower](https://teknium.io/hermes-devices/#openmower) — 安価なロボット芝刈り機の制御部をオープンなものに置き換え、RTK GPS で動かすプロジェクトです。Hermes は MQTT で開始や帰還を指示し、天気予報と cron で刈る日を決められます。
- [Reolink \(local API, HA\)](https://teknium.io/hermes-devices/#reolink-local-api-ha) — LAN 内の API と Home Assistant の公式連携を持つ、手頃な防犯カメラのシリーズです。Hermes は Python ライブラリでライトや首振りを操作し、静止画を取得できます。
- [AirGradient](https://teknium.io/hermes-devices/#airgradient) — CO2 や PM2.5 などを測るオープンハードウェアの空気質モニターです。Hermes は LAN 内の API から JSON で測定値を取得でき、cron で定期的に読んだり、ファームウェアを改造したりできます。（~$230 assembled, ~$138 kit）
- [Ecowitt](https://teknium.io/hermes-devices/#ecowitt) — 温度や雨量、風などを測る手頃な気象観測のセンサー群で、データを自前のサーバーへ送れます。Hermes は受け口を用意するか JSON を取りに行き、予報や散水、芝刈りと組み合わせられます。（Varies \(GW2000 gateway ~$50\)）
- [OpenEVSE](https://teknium.io/hermes-devices/#openevse) — オープンソースの EV 充電器とコントローラーで、HTTP と MQTT の API を持っています。Hermes は充電電流の設定や一時停止ができ、太陽光や電気料金、予定に合わせて充電を組めます。（Varies \(controller ~$130, Wi-Fi kit ~$40\)）
- [IoTaWatt](https://teknium.io/hermes-devices/#iotawatt) — 14 回路の電力を測り、データを SD カードに貯めるオープンハードウェアの電力計です。Hermes はクエリ API で回路ごとの電力を取得し、cron で日ごとの電力レポートを作れます。（~$300-$430 depending on kit）
- [Emporia Vue 3](https://teknium.io/hermes-devices/#emporia-vue-3) — 分電盤に付けて回路ごとの電力を測る機器です。Hermes は PyEmVue でクラウドから値を読むか、ESPHome の非公式ファームウェアに書き換えてローカルで受け取ります。（$199.99 \(16 sensors\)）
- [Victron Cerbo GX MK2](https://teknium.io/hermes-devices/#victron-cerbo-gx-mk2) — Victron の太陽光・蓄電池・インバーターをまとめるハブです。Hermes は本体のローカル MQTT broker で値を読み設定を書き込み、Modbus TCP や SSH も使えます。（~$273）
- [Nuki \(developer API\)](https://teknium.io/hermes-devices/#nuki-developer-api) — 既存のシリンダーに後付けするスマートロックで、ローカルの HTTP・MQTT・Matter に対応します。Hermes は Bridge HTTP API で施錠状態の確認や施錠・解錠を行えます。
- [Philips Hue Bridge Pro](https://teknium.io/hermes-devices/#philips-hue-bridge-pro) — 多くの Hue 照明をまとめる次世代のハブです。Hermes は CLIP API v2 を HTTPS で呼び、イベントの流れも受け取ります。MCP server を持つ openhue CLI も使えます。（$149.99）
- [TP-Link Kasa KP125M](https://teknium.io/hermes-devices/#kasa-kp125m) — 電力を測れる Matter 対応のスマートプラグです。Hermes は python-kasa で LAN 上のプラグを見つけ、電源の入り切りや消費電力の読み取りを行います。（$29.99 \(2-pack\)）
- [Broadlink IR/RF blasters](https://teknium.io/hermes-devices/#broadlink-ir-rf-blasters) — 赤外線や RF のリモコン信号を学習して再送し、古い家電を自動化する機器です。Hermes は python-broadlink で信号を記録し、部屋や家電ごとのコード集から送り分けられます。

## そのほかの照明・プラグ・センサー

- [Nanoleaf \(lines/shapes\)](https://teknium.io/hermes-devices/#nanoleaf-lines-shapes) — 組み合わせて壁に貼る LED パネルで、LAN 内の REST API で操作できます。Hermes はクラウドを通さず電源や色、エフェクトを変えられ、UDP で滑らかなアニメーションも送れます。（$$）
- [Govee \(LAN API\)](https://teknium.io/hermes-devices/#govee-lan-api) — 手頃な RGB ライトのシリーズで、一部の機種は公式の LAN API に対応しています。Hermes は UDP で機器を見つけ、認証なしで点灯や明るさ、色を指定するコマンドを送れます。（$）
- [LIFX](https://teknium.io/hermes-devices/#lifx) — ハブのいらない Wi-Fi 電球で、LAN の通信プロトコルが公開されています。Hermes は UDP で電球を見つけて色や電源を直接操作でき、家の外からはクラウドの HTTP API も使えます。（$$）
- [Sonoff / ITEAD \(flashable\)](https://teknium.io/hermes-devices/#sonoff-itead-flashable) — ESP で動く安価な Wi-Fi スイッチで、ESPHome や Tasmota を書き込むとクラウドなしで使えます。Hermes は MQTT や HTTP で操作し、ESPHome の YAML も書けます。（$）
- [Aqara FP2 presence](https://teknium.io/hermes-devices/#aqara-fp2-presence) — ミリ波レーダーで部屋のエリアごとに人の在不在を検知するセンサーです。Hermes は Home Assistant 経由でエリアごとの状態を読み、自動化のきっかけとして使えます。（$$）
- [Ruuvi Tag](https://teknium.io/hermes-devices/#ruuvi-tag) — 温度や湿度、気圧を BLE で発信し続ける電池式のセンサーで、データ形式は公開されています。Hermes は BLE のスキャンで受信するだけで値を読め、ペアリングも鍵もいりません。（$$）
- [Aranet4](https://teknium.io/hermes-devices/#aranet4) — CO2 や温湿度を測る電子ペーパー表示のモニターで、BLE で直接読めます。Hermes は Python のライブラリで現在値や履歴をクラウドなしで取得でき、Home Assistant 経由でも読めます。（$$$）
- [ThirdReality \(Zigbee/Matter\)](https://teknium.io/hermes-devices/#thirdreality-zigbee-matter) — 安価な Zigbee・Matter 対応のプラグやセンサーで、クラウドなしで使えます。Hermes は ZHA や Zigbee2MQTT につないだ機器を Home Assistant や MQTT で操作できます。（$）
- [SwitchBot Hub/sensors](https://teknium.io/hermes-devices/#switchbot-hub-sensors) — ボタンを押すロボットやカーテン、温湿度計などのシリーズです。Hermes は公開された BLE プロトコルでクラウドなしに操作でき、外出先からは Hub 経由のクラウド API も使えます。（$$）
- [QuinLED controllers](https://teknium.io/hermes-devices/#quinled-controllers) — WLED 向けに作られた ESP32 の LED コントローラーで、本格的な LED 工事に向いています。Hermes は WLED の JSON API や MQTT で他の WLED 機器と同じように操作できます。
- [Athom WLED music controller](https://teknium.io/hermes-devices/#athom-wled-music-controller) — WLED を書き込み済みで、マイクを内蔵した安価な LED コントローラーです。Hermes は WLED の JSON API で操作でき、cron で設定のバックアップを定期的に取ることもできます。（~$20-36）
- [ENTTEC Open DMX USB](https://teknium.io/hermes-devices/#enttec-open-dmx-usb) — パソコンから DMX 照明を動かすための、昔からある手頃な USB ドングルです。Hermes は Linux 上で OLA や pyftdi を通じて操作でき、skill にすれば照明の操作をチャットから呼べます。（~$70）

## 家の防犯と見守り

- [Konnected Pro Alarm Panel](https://teknium.io/hermes-devices/#konnected-pro-alarm) — Konnected Alarm Panel Pro は、既存の有線警報を PoE でネットにつなぐ 12 ゾーンの基板です。Hermes は Home Assistant か MQTT で各ゾーンの状態を読み、制御できます。（~$229）
- [Reolink Video Doorbell \(local\)](https://teknium.io/hermes-devices/#reolink-doorbell-local) — Reolink の PoE/Wi-Fi ドアベルは、RTSP でストリーミングし、動体や人の検知をローカル HTTP API で返します。Hermes は reolink\_aio で映像を取り、検知を読めます。
- [UniFi G6 Bullet](https://teknium.io/hermes-devices/#unifi-g6-bullet) — 人や車を本体で検知する屋外用 PoE カメラで、UniFi Protect に録画します。Hermes は公式の Protect API で検知イベントを受け取り、静止画や映像を取得します。（$199）
- [Aqara Camera Hub G5 Pro](https://teknium.io/hermes-devices/#aqara-g5-pro) — Aqara Camera Hub G5 Pro は屋外カメラであり、Zigbee と Thread のハブも兼ねます。Hermes は主に Home Assistant と Matter でイベントや映像にアクセスできます。
- [Shelly BLU Motion / Door-Window](https://teknium.io/hermes-devices/#shelly-blu-motion) — Shelly BLU Motion / Door/Window は、動体や開閉を BLE で知らせる電池式センサーです。ゲートウェイが MQTT に中継し、Hermes はトピックを購読してイベントを受け取れます。
- [frient \(Develco\) Z sensors](https://teknium.io/hermes-devices/#frient-sensors) — frient は人感や煙、漏水、開閉などの Zigbee セキュリティ機器を一通り揃えるブランドです。Hermes は Zigbee2MQTT に組み込んで各センサーを読み、サイレンを鳴らせます。
- [Zigbee sirens &amp; keypads](https://teknium.io/hermes-devices/#sonoff-sa-003-siren) — Zigbee2MQTT 対応のサイレンやストロボ、警戒設定・解除用キーパッドの総称です。Hermes は MQTT 経由でサイレンを鳴らし、キーパッドの警戒設定・解除や PIN のイベントを読み取れます。
- [Smart deadbolts \(Matter/Z-Wave\)](https://teknium.io/hermes-devices/#schlage-encode-matter) — Schlage や Yale のスマートデッドボルトは、施錠・解錠と利用者ごとの暗証番号を Z-Wave や Matter で扱えます。Hermes はそれらで操作し、PIN を登録・失効できます。
- [2N IP Intercom \(HTTP API\)](https://teknium.io/hermes-devices/#2n-intercom-api) — 2N の IP インターコムは、ドアの解錠やドアベルのイベント、通話制御を扱う HTTP API を備えた業務用のドア機です。Hermes は API でドアのリレーを開き、イベントを読んでスナップショットを取れます。
- [Tailwind iQ3 2.1](https://teknium.io/hermes-devices/#tailwind-iq3-2-1) — ローカル API が公開されたガレージドアのコントローラーです。Hermes はトークン付きの HTTP で JSON を送り、ドアの状態確認や開閉、イベントの受信を行います。（$99.99）
- [Meross Smart Garage Door Opener MSG200](https://teknium.io/hermes-devices/#meross-msg200) — Wi-Fi 対応のガレージドア用コントローラーです。Hermes は Home Assistant の meross\_lan 連携か MerossIot ライブラリで、ドアの開閉や状態確認を行えます。（$69.99）
- [Aqara Smart Lock U300](https://teknium.io/hermes-devices/#aqara-smart-lock-u300) — デッドボルトのないドア向けのレバー型スマートロックです。Hermes は Home Assistant の Matter 連携を通して、クラウドなしで施錠・解錠や状態の確認を行います。（$229.99）
- [ULTRALOQ U-Bolt Pro WiFi](https://teknium.io/hermes-devices/#ultraloq-u-bolt-pro-wifi) — 指紋とキーパッドで開ける Wi-Fi 内蔵のデッドボルトです。Hermes は OAuth2 でクラウド API に接続し、施錠・解錠や状態の取得、Webhook での通知の受信ができます。（$179.99）
- [Level Lock Pro](https://teknium.io/hermes-devices/#level-lock-pro) — ドアの中に機構を隠したスマートデッドボルトです。Matter over Thread に対応し、Hermes は Home Assistant の Matter 連携からローカルで施錠・解錠や状態の確認を行います。（$349）
- [Google Nest Doorbell \(battery\)](https://teknium.io/hermes-devices/#google-nest-doorbell-battery) — Google の公式 API で扱える電池式のドアベルです。Hermes は SDM REST API に接続し、来訪や人の検知を Pub/Sub で受け取り、クリップやライブ映像も取得できます。（$199.99）
- [Ring Wired Doorbell 4K Pro](https://teknium.io/hermes-devices/#ring-wired-doorbell-4k-pro) — Ring の有線ドアベルの上位モデルです。ローカル API はなく、Hermes は Home Assistant の ring 連携か ring-mqtt を通した非公式のクラウド API でイベントを受け取ります。（$249.99 + $4.99/mo for recordings）
- [Abode iota All-In-One Security Kit](https://teknium.io/hermes-devices/#abode-iota) — カメラ・人感センサー・サイレンを1台にまとめた家庭用アラームのハブです。Hermes は Python ライブラリか CLI で、警戒モードの切り替えやカメラの静止画取得、プッシュ通知の受信ができます。（$399 + optional $8.49-$26.99/mo）
- [SimpliSafe Gen 3 System](https://teknium.io/hermes-devices/#simplisafe-gen3) — 基地局とキーパッド、無線センサーで組む DIY 型のホームアラームです。Hermes は非公式の Python クライアントで、警戒状態の切り替えやセンサーの読み取り、PIN の管理ができます。（$250.96 + optional $9.99-$79.99/mo）
- [TP-Link Tapo C225](https://teknium.io/hermes-devices/#tapo-c225) — 首振りできる屋内用の見守りカメラです。Hermes は RTSP の映像を ffmpeg や OpenCV で直接取り込めるほか、Home Assistant 経由で首振りやプライバシーモードを操作できます。（$49.99）
- [Moen Flo Smart Water Shutoff](https://teknium.io/hermes-devices/#moen-flo-smart-water-shutoff) — 家の給水本管に取り付け、漏水を見つけると自分で閉まる止水弁です。Hermes は Home Assistant の Flo 連携を通じて流量や水圧を読み、弁の開閉やモードの切り替えができます。（$649）
- [Phyn Protect](https://teknium.io/hermes-devices/#phyn-protect) — 超音波で水の流れを見張る、給水本管用の漏水検知つき止水弁です。Hermes は Home Assistant の連携か、コミュニティが解析した LAN 内の API で使用量を読み、弁を開け閉めできます。（$579.99）
- [YoLink Water Leak Sensor 4](https://teknium.io/hermes-devices/#yolink-water-leak-sensor-4) — LoRa 無線でつながる、ブザー内蔵の小さな漏水センサーです。Hermes は Home Assistant の YoLink 連携か、Local Hub の公式 API と MQTT で漏水の知らせを受け取れます。（$19.99 + hub）
- [Aqara Water Leak Sensor](https://teknium.io/hermes-devices/#aqara-water-leak-sensor) — Zigbee で動く小型の漏水センサーで、Aqara のハブなしで Zigbee2MQTT に直接つなげます。Hermes は MQTT のトピックを購読し、クラウドを通さずに漏水の知らせへ反応できます。（$18.99）
- [Flume 2 Smart Home Water Monitor](https://teknium.io/hermes-devices/#flume-2-water-monitor) — 水道メーターに巻き付けて使用量を読む、配管工事のいらない水量モニターです。Hermes は公式の Personal API で水が流れているかや使用量を確かめられ、Home Assistant の連携からも読めます。（$269）

## 家電と家庭用ロボット

- [Roborock Saros 20](https://teknium.io/hermes-devices/#roborock-saros-20) — 水拭きもこなす Roborock の最上位のロボット掃除機です。Hermes は Home Assistant の標準連携か python-roborock を通じ、LAN 内で掃除の開始や状態の確認ができます。（$1,599.99）
- [Dreame X50 Ultra](https://teknium.io/hermes-devices/#dreame-x50-ultra) — 脚で段差を乗り越えるロボット掃除機で、水拭きとゴミ収集のドックが付きます。Hermes は HACS の dreame-vacuum 連携で部屋ごとの掃除や地図の取得ができ、Matter でも基本操作ができます。（$999.99）
- [Eureka J15 Max Ultra \(Valetudo\)](https://teknium.io/hermes-devices/#eureka-j15-max-ultra-valetudo) — root 化して Valetudo を入れて使うロボット掃除機です。Valetudo がメーカーのクラウドに代わり、Hermes は LAN 内の REST API や MQTT で区画ごとの掃除などを指示できます。（$1,199.99）
- [iRobot Roomba Max 775 Combo](https://teknium.io/hermes-devices/#irobot-roomba-max-775-combo) — 水拭きと自動洗浄ドックを備えた Roomba です。Hermes は Home Assistant の Matter 連携から掃除や帰還を指示でき、Roomba+ による地図連携は本機での動作確認が必要です。（$799.99）
- [Husqvarna Automower 410 iQ](https://teknium.io/hermes-devices/#husqvarna-automower-410-iq) — 境界ワイヤーなしで走る Husqvarna のロボット芝刈り機です。Hermes は公式の Automower Connect API で状態を読んで開始や駐機を指示し、WebSocket でイベントを受け取れます。（$2,599.99）
- [Mammotion LUBA 3 AWD](https://teknium.io/hermes-devices/#mammotion-luba-3-awd) — LiDAR と RTK、カメラで走る全輪駆動のロボット芝刈り機です。Hermes はコミュニティ製の連携か PyMammotion で、クラウドか Bluetooth から開始や帰還、状態の確認ができます。（$2,399）
- [Segway Navimow i2 AWD](https://teknium.io/hermes-devices/#segway-navimow-i2-awd) — 小さな庭向けの、Segway の全輪駆動ロボット芝刈り機です。メーカー自身が Home Assistant 連携と Python SDK を公開しており、Hermes は開始・一時停止・帰還の指示や状態の確認ができます。（$999）
- [Worx Landroid Vision Cloud](https://teknium.io/hermes-devices/#worx-landroid-vision-cloud) — カメラと RTK で境界ワイヤーなしに走るロボット芝刈り機です。Hermes は pyworxcloud か、それを使った Home Assistant 連携で開始や帰還、雨天待機の設定、エラーの確認ができます。（$1,799.99）
- [Aiper EcoSurfer S2](https://teknium.io/hermes-devices/#aiper-ecosurfer-s2) — 太陽光で動き、プールの水面を回ってゴミを集めるロボットです。公式 API はなく、Hermes は非公式の Home Assistant 連携 ha-aiper で運転の開始・停止や、電池と警告の確認ができます。（$399.99）
- [Anova Precision Cooker 3.0](https://teknium.io/hermes-devices/#anova-precision-cooker-3) — 鍋に取り付けて使う Wi-Fi 対応の低温調理器です。Hermes は Anova 公式の WebSocket API にトークンでつなぎ、水温や調理状態を読みながら、温度とタイマーを指定して調理を始められます。（$229）
- [Combustion Predictive Thermometer](https://teknium.io/hermes-devices/#combustion-predictive-thermometer) — 複数の温度センサーを持つワイヤレスの肉用温度計で、BLE の仕様が公開されています。Hermes は bleak で広告パケットから温度を読み、接続すれば目標温度の設定やログの取得もできます。（$149）
- [Ember Mug 2](https://teknium.io/hermes-devices/#ember-mug-2) — 設定した温度を保ち続ける、ヒーター内蔵のマグカップです。Hermes は python-ember-mug で Bluetooth 越しに温度や残量、電池を読み、目標温度や LED の色を変えられます。（$89.99）
- [Fellow Aiden Precision Coffee Maker](https://teknium.io/hermes-devices/#fellow-aiden) — 抽出の温度や蒸らしをレシピとして保存できる、Wi-Fi 対応のコーヒーメーカーです。公式 API はなく、Hermes は非公式の Python ライブラリや HACS 連携でレシピと予約を作り、抽出を始められます。（$399.95）
- [Bosch 800 Series Dishwasher \(SHP78CM5N\)](https://teknium.io/hermes-devices/#bosch-800-series-dishwasher) — Home Connect に対応した Bosch の食器洗い機です。Hermes は公式の Home Connect REST API に OAuth でつなぎ、コースの選択・開始や状態の確認ができます。（$1,499）
- [LG WashCombo All-in-One \(WM6998HBA\)](https://teknium.io/hermes-devices/#lg-washcombo-all-in-one) — 排気ダクトなしで洗濯から乾燥までこなす、LG の洗濯乾燥機です。Hermes は LG 公式の ThinQ Connect の Python SDK で状態を読んで操作し、MQTT で状態変化の通知を受け取れます。（~$2,199）
- [Litter-Robot 5](https://teknium.io/hermes-devices/#litter-robot-5) — 回転して排せつ物をふるい分ける、猫の自動トイレです。Hermes は非公式の pylitterbot で清掃の開始やゴミ箱の残量確認ができ、同梱の MCP サーバーをそのまま読み込んで使うこともできます。（$799）
- [PETLIBRO Granary Smart Feeder](https://teknium.io/hermes-devices/#petlibro-granary-smart-feeder) — 予定どおりにドライフードを出す、Wi-Fi 対応の自動給餌器です。Hermes はコミュニティ製の Home Assistant 連携を通じて、手動での給餌やその日の予定のスキップ、給餌記録の確認ができます。（$89.99）
- [Rachio 3 Smart Sprinkler Controller](https://teknium.io/hermes-devices/#rachio-3) — 天気に合わせて散水を調整する、Wi-Fi 対応のスプリンクラー制御器です。Hermes は公開されている REST API でゾーンの散水開始や雨天延期を指示でき、Webhook でイベントを受け取れます。（$199.99）
- [OpenSprinkler v4.0](https://teknium.io/hermes-devices/#opensprinkler-v4) — クラウドなしで動く、オープンソースのスプリンクラー制御器です。Hermes は LAN 内の HTTP API や MQTT で、ゾーンの散水やプログラムの開始、雨天延期を指示できます。（$160）
- [Rheem ProTerra Hybrid Heat Pump Water Heater](https://teknium.io/hermes-devices/#rheem-proterra-hybrid) — ヒートポンプと電気ヒーターを併用する Rheem の給湯器です。Hermes は Home Assistant の econet 連携か esphome-econet を通じて、設定温度や運転モードを切り替えられます。（~$1,950）

## エネルギー・EV・車

- [EcoFlow DELTA Pro 3](https://teknium.io/hermes-devices/#ecoflow-delta-pro-3) — 家のバックアップにも使えるポータブル電源です。Hermes は公式 API に署名付きで接続し、REST で状態取得や出力・充電設定を行い、MQTT で更新通知を受け取れます。（$2,799）
- [Anker SOLIX F3800 Plus](https://teknium.io/hermes-devices/#anker-solix-f3800-plus) — 家のバックアップにも使える大容量のポータブル電源です。公式 API はなく、Hermes はコミュニティ製の anker-solix-api か SolixBLE で状態を読み、出力を切り替えられます。（~$2,499）
- [Tesla Powerwall 3](https://teknium.io/hermes-devices/#tesla-powerwall-3) — 太陽光インバーターを内蔵した、壁掛けの家庭用蓄電池です。Hermes は公式の Tesla Fleet API で状態を読んで運転モードなどを変えられ、pypowerwall なら有線 LAN 経由でも操作できます。（Installer quote）
- [BLUETTI Elite 200 V2](https://teknium.io/hermes-devices/#bluetti-elite-200-v2) — メーカー公式の Home Assistant 連携がある BLUETTI のポータブル電源です。Hermes はこの連携のクラウドか BLE で電池残量や発電量を読み、出力や運転モードを切り替えられます。（$899）
- [Jackery Explorer 5000 Plus](https://teknium.io/hermes-devices/#jackery-explorer-5000-plus) — Jackery の大容量ポータブル電源です。公式 API はなく、Hermes はオープンソースの Home Assistant 連携 private\_jack で、Bluetooth から電池を読み出力を切り替えます。（$3,149）
- [Enphase IQ Gateway](https://teknium.io/hermes-devices/#enphase-iq-gateway) — Enphase の太陽光発電システムをまとめる通信ゲートウェイです。Hermes はトークン付きで LAN 内の公式 API を呼び、発電量やパネルごとの出力、系統との電力のやり取りを読めます。（$558.50）
- [SPAN Panel MAIN 32](https://teknium.io/hermes-devices/#span-panel-main-32) — 回路ごとに計測と入り切りができる、分電盤そのものを置き換える機器です。Hermes は盤内の MQTT ブローカーに LAN でつなぎ、回路ごとの電力を読み、各回路のリレーを開閉できます。（$3,500 + install）
- [Rainforest EAGLE 3](https://teknium.io/hermes-devices/#rainforest-eagle-3) — 電力会社のスマートメーターから家全体の使用量を受け取るゲートウェイです。Hermes は LAN 内の API に XML で問い合わせて、瞬時の電力や積算の使用量を読めます。（$99.99）
- [Tesla Wall Connector \(Gen 3\)](https://teknium.io/hermes-devices/#tesla-wall-connector-gen3) — Tesla の家庭用 EV 充電器です。Hermes はログイン不要の LAN 内の JSON エンドポイントから、接続状態や充電量、電流・電圧、温度を読めます。この経路は読むだけで、充電の開始や停止はできません。（$585）
- [Wallbox Pulsar Plus](https://teknium.io/hermes-devices/#wallbox-pulsar-plus) — Wi-Fi と Bluetooth に対応した小型の EV 充電器です。Hermes は Home Assistant の標準連携で充電の一時停止・再開や電流の上限設定ができ、自前の OCPP サーバーにもつなげます。（$649.99）
- [Emporia Pro EV Charger](https://teknium.io/hermes-devices/#emporia-pro-ev-charger) — 分電盤が過負荷にならないよう充電速度を調整する EV 充電器です。公式 API はなく、Hermes は Emporia のクラウドを通じ、PyEmVue や HACS 連携で充電の入り切りと電流を変えられます。（$599）
- [ChargePoint Home Flex](https://teknium.io/hermes-devices/#chargepoint-home-flex) — 電流の上限を変えられる家庭用の EV 充電器です。Hermes は非公式の python-chargepoint か Home Assistant 連携を通して、充電の開始と停止、状態や消費電力の読み取りができます。（$599）
- [Tesla Model Y](https://teknium.io/hermes-devices/#tesla-model-y) — Tesla の公式 Fleet API で読み書きできる電気自動車です。Hermes は車両データを取得し、充電や空調、施錠などの命令を署名付きで送れます。Home Assistant 連携も使えます。（$39,990）
- [comma four](https://teknium.io/hermes-devices/#comma-four) — オープンソースの運転支援 openpilot を動かすフロントガラス用のコンピューターです。Hermes は SSH や comma API で位置や走行記録、動画を取り出し、ログの解析に使います。（$999）
- [OBDLink MX+](https://teknium.io/hermes-devices/#obdlink-mx-plus) — 車の OBD-II 端子に挿す Bluetooth アダプターです。Hermes は Linux から python-OBD でつなぎ、回転数や水温などの値を読んだり、故障コードを読み出して消したりできます。（$139.95）
- [Bouncie](https://teknium.io/hermes-devices/#bouncie) — OBD-II 端子に挿す LTE 通信の車両トラッカーです。Hermes は公式 REST API で位置や燃料、故障コード、走行履歴を読み、webhook で走行の開始や終了の通知を受け取れます。（$89.99 + $9.65/mo）

## ネットワーク

- [OpenWrt One](https://teknium.io/hermes-devices/#openwrt-one) — OpenWrt プロジェクト自身が設計した、文鎮化しにくい Wi-Fi 6 ルーターです。Hermes は SSH や ubus JSON-RPC で管理でき、シリアルコンソールから復旧もできます。（~$89）
- [Banana Pi BPI-R4](https://teknium.io/hermes-devices/#banana-pi-bpi-r4) — 10G SFP+ を 2 口持つルーター開発ボードです。Hermes は OpenWrt と同じく SSH や ubus で管理でき、ルーター上で MCP サーバーや補助のコンテナも動かせます。
- [Turris Omnia NG](https://teknium.io/hermes-devices/#turris-omnia-ng) — CZ.NIC が作る、Wi-Fi 7 と 10G を備えたオープンソースのセキュリティルーターです。Hermes は SSH で管理し、脅威情報やメトリクスを cron で集めてチャットに要約できます。（~$550-650 \(EUR 538 incl. VAT\)）
- [GL.iNet Flint 2 \(MT6000\)](https://teknium.io/hermes-devices/#gl-inet-flint-2-mt6000) — OpenWrt を土台にした Wi-Fi 6 の家庭用ルーターです。Hermes は JSON-RPC や SSH で操作でき、内蔵の AdGuard Home の API から DNS の統計も読めます。（~$170）
- [GL.iNet Slate 7 \(BE3600\)](https://teknium.io/hermes-devices/#gl-inet-slate-7-be3600) — タッチ画面付きで持ち歩ける Wi-Fi 7 のトラベルルーターです。Tailscale と組み合わせると、Hermes の cron が旅先の回線品質や VPN の状態をどこからでも見守れます。（~$160）
- [MikroTik hAP ax³](https://teknium.io/hermes-devices/#mikrotik-hap-ax3) — RouterOS v7 で動く Wi-Fi 6 ルーターで、コンソールの操作がそのまま REST API になります。Hermes は権限を絞った専用ユーザーで呼び、DHCP やファイアウォールを読み書きします。（$139）
- [Protectli](https://teknium.io/hermes-devices/#protectli) — オープンソースのファイアウォール向けに作られたファンレスの x86 小型 PC です。Hermes は載せた OPNsense や Proxmox を操作でき、Hermes 自体をこの機械で常時動かす使い方もあります。
- [UniFi Cloud Gateway Max](https://teknium.io/hermes-devices/#unifi-cloud-gateway-max) — UniFi 機器をまとめて管理する小型ゲートウェイです。Hermes は API キーで公式の Network API を呼び、機器や接続端末の一覧を読んだり、再起動やゲスト用バウチャーの発行をしたりできます。（$199）

## 遠隔操作（IP-KVM）

- [PiKVM + HTTP API](https://teknium.io/hermes-devices/#pikvm-http-api) — PC の画面と入力を BIOS から遠隔操作できるオープンソースの KVM です。Hermes は HTTP API で電源を入れ、画面を OCR で読み、OS の再インストールまで進められます。（~$270-$385）
- [JetKVM](https://teknium.io/hermes-devices/#jetkvm) — タッチ画面付きで手のひらサイズの、安価なオープンソースの KVM です。Hermes はコミュニティのクライアントや開発者モードの SSH で操作し、画面を読んでキー入力やクリックを行えます。（~$100）
- [Sipeed NanoKVM](https://teknium.io/hermes-devices/#sipeed-nanokvm) — RISC-V を使った低価格の IP-KVM のシリーズです。Hermes は REST API と WebSocket で電源の入れ直しやキー入力、画面の取得を行え、端末上にスクリプトを置くこともできます。（~$35-$70 \(Cube; Pro costs more\)）
- [GL.iNet Comet \(GL-RM1\)](https://teknium.io/hermes-devices/#gl-inet-comet-gl-rm1) — Tailscale を内蔵した 4K 対応のリモート KVM です。PiKVM 由来のソフトで動くため、Hermes は PiKVM と同じ形の HTTP API で画面の取得や入力、電源操作をおおむね行えます。（~$100）

## ロボット

- [Reachy Mini](https://teknium.io/hermes-devices/#reachy-mini) — Pollen Robotics と Hugging Face のオープンな卓上ロボットです。Hermes が Python SDK で動かし、MCP server にして hermes mcp add で登録できます。（$499 Wireless / $399 Lite）
- [SO-101 arm](https://teknium.io/hermes-devices/#so-101-arm) — 家庭でのロボット学習を広めた、6自由度のオープンソースのアームです。Hermes が LeRobot 経由で USB シリアルから操作し、キャリブレーションや収録の手順を skill として持てます。（~$278 \(Seeed Pro motor kit\)）
- [LeKiwi \(mobile SO-101\)](https://teknium.io/hermes-devices/#lekiwi-mobile-so-101) — SO-101 アームを3輪のオムニホイール台車に載せた移動マニピュレーターです。LeRobot のクライアントとして Hermes が動作指令を送り、SSH で搭載 Pi のホスト処理も管理します。（~$480-$500 \(DIY BOM\)）
- [HOPEJr \(DIY humanoid\)](https://teknium.io/hermes-devices/#hopejr-diy-humanoid) — TheRobotStudio と Hugging Face のオープンソース等身大ヒューマノイドです。Hermes は LeRobot に対応したアームとハンドの調整・遠隔操作・収録・学習を端末から実行できます。（~$3,000 \(announced\)）
- [Open Duck Mini](https://teknium.io/hermes-devices/#open-duck-mini) — Disney の BDX ドロイドを小型化した、強化学習で歩くオープンソースの二足ロボットです。Hermes が SSH で搭載 Pi の歩行ポリシーを入れ替え、IMU のログを読めます。（~$400 \(DIY BOM\)）
- [Stack-chan](https://teknium.io/hermes-devices/#stack-chan) — 顔を表示し、声とサーボで動く M5Stack の卓上ロボットです。Hermes が JS の小さなアプリ「MOD」を作って書き込んだり、HTTP 経由で表情や発話を指示したりできます。（~$99 \(official M5Stack kit\)）
- [Anki Vector + wire-pod](https://teknium.io/hermes-devices/#anki-vector-wire-pod) — クラウド終了後の Anki Vector を、ローカルで動くロボットとして復活させる wire-pod です。OpenAI 互換の窓口から Hermes に音声を渡し、Python SDK で動きの台本も書けます。
- [Petoi Bittle X](https://teknium.io/hermes-devices/#petoi-bittle-x) — 音声コマンドに対応した、手のひらサイズの ESP32 ロボット犬です。Hermes が Python からシリアルで「お座り」「歩く」などの指令を送り、MCP server にすればいつでも動かせます。（~$319-$469）
- [Unitree Go2 / G1](https://teknium.io/hermes-devices/#unitree-go2-g1) — Unitree のロボット犬と身長約1.3mのヒューマノイドです。Hermes は EDU 向けの公式 SDK・ROS 2 や、Go2 Air/Pro 向けのコミュニティ製 WebRTC ライブラリを使って操作します。（Go2 from $1,600; G1 from $13.5K）
- [TurtleBot 4 \(ROS 2\)](https://teknium.io/hermes-devices/#turtlebot-4-ros-2) — 組み立て済みで届く、ROS 2 学習用の定番ロボットです。Hermes が ros2 CLI で Nav2 の目標送信や SLAM を行い、部屋の地図作りなどの定型ミッションを skill にまとめられます。
- [iRobot Create 3 \(ROS 2\)](https://teknium.io/hermes-devices/#irobot-create-3-ros-2) — 掃除機能を外した Roomba 由来の、ROS 2 にそのまま対応した移動台車です。Hermes が ros2 CLI で走行やドッキングを指示し、「ドックに戻る」のような簡単な台本を skill にできます。（~$300-$450）
- [Waveshare UGV Rover ROS 2](https://teknium.io/hermes-devices/#waveshare-ugv-rover-ros-2) — ライダーと深度カメラを積んだ6輪の金属製 ROS 2 ローバーです。ESP32 側が JSON コマンドを受け付けるので、Hermes は Python や curl から簡単に動かせます。（~$535-$727）
- [Waveshare UGV Beast](https://teknium.io/hermes-devices/#waveshare-ugv-beast) — サスペンションを備えた履帯式のオフロード AI ローバーで、PT 版にはパン・チルトカメラもあります。Hermes は JSON コマンドや SSH で操作し、Pi 上の画像認識と走行をつなげられます。（~$265-$502）
- [myCobot 280 Pi](https://teknium.io/hermes-devices/#mycobot-280-pi) — 台座に Raspberry Pi 4 を内蔵した卓上の6軸アームです。Hermes が SSH で pymycobot を使って動かし、関節や把持の操作を MCP server や skill にまとめられます。（~$799）
- [AgileX PiPER X](https://teknium.io/hermes-devices/#agilex-piper-x) — 研究向けの6軸卓上ロボットアームです。Hermes は piper\_sdk で CAN 越しに直接動かし、ROS の MoveIt で動作を計画し、SDK の EmergencyStop を緊急停止に使えます。（~$2,799）
- [Crazyflie 2.1 Brushless](https://teknium.io/hermes-devices/#crazyflie-2-1-brushless) — 群飛行や研究向けの、重さ34gのオープンソース小型ドローンです。Hermes が cflib を使い Crazyradio 経由で飛ばし、検証済みの飛行スクリプトを skill として残せます。（~$480）
- [OpenBot](https://teknium.io/hermes-devices/#openbot) — Android スマホを頭脳にする安価なロボットカーです。Hermes が Python コントローラーで操作し、走行データの収集から学習、スマホへのモデル転送までを skill にまとめられます。（~$50 + phone）
- [FrodoBots](https://teknium.io/hermes-devices/#frodobots) — インターネット越しに操作やスクリプト実行ができる 4G 対応の歩道ロボットです。SDK のローカルサーバーが HTTP で操作・撮影・発話を受け付けるので、Hermes が直接呼び出せます。（~$349-$399）
- [Feetech servos](https://teknium.io/hermes-devices/#feetech-servos) — オープンなロボットで広く使われる、安価なシリアルバス式スマートサーボです。Hermes が Python SDK でサーボの状態を読み書きし、cron で温度や負荷を点検できます。（~$14-$22 per STS3215）
- [HUSKYLENS 2](https://teknium.io/hermes-devices/#huskylens-2) — AI 画像認識センサーです。別売の Wi-Fi モジュールと最新ファームウェアを用意して MCP Service を有効にし、`hermes mcp add`で登録すると、Hermes が認識結果の取得や撮影を指示できます。（~$90）
- [OpenMV](https://teknium.io/hermes-devices/#openmv) — MicroPython で書ける、ロボット向けの小型マシンビジョンカメラです。Hermes がスクリプトを書いて USB で送り、結果を読んで直すという開発の繰り返しを自分で回せます。（$165-$195）
- [Luxonis OAK depth cams](https://teknium.io/hermes-devices/#luxonis-oak-depth-cams) — ニューラルネットをカメラ上で動かすステレオ深度カメラです。Hermes が DepthAI で Python のパイプラインを組み、3D 座標付きの検出結果を受け取れます。（$269+）
- [Seeed reCamera](https://teknium.io/hermes-devices/#seeed-recamera) — Node-RED を内蔵した、RISC-V Linux のオープンソース AI カメラです。Node-RED から検出結果を Hermes の webhook に送れば、Hermes が反応するセンサーになります。（~$110）
- [Grove Vision AI V2](https://teknium.io/hermes-devices/#grove-vision-ai-v2) — Arm の NPU を積んだマイコン向けの小型画像認識モジュールです。検出結果が I2C/UART や USB シリアルで出るので、Hermes がホストの Pi などから読み取って対応します。（~$16）
- [RPLIDAR A1](https://teknium.io/hermes-devices/#rplidar-a1) — ホビーの SLAM で定番の安価な360度ライダーです。Pi などに USB でつなぐと、Hermes が ROS 2 で SLAM や Nav2 を起動し、地図作りを台本化できます。（~$99）

## マイコンと開発ボード

- [ESP32-P4](https://teknium.io/hermes-devices/#esp32-p4) — 画面やカメラ向けの RISC-V チップ ESP32-P4 です。Hermes が ESP-IDF でビルド・書き込みを行え、ESP-IDF の MCP server を登録すればその操作が tool になります。
- [ESP32-C6](https://teknium.io/hermes-devices/#esp32-c6) — Wi-Fi 6・Thread・Zigbee などに対応した安価な RISC-V チップです。Hermes が ESPHome で書き込めば、Home Assistant 経由でセンサーやスイッチを操作できます。
- [Waveshare ESP32-P4 7" touch](https://teknium.io/hermes-devices/#waveshare-esp32-p4-7-touch) — 壁掛けを想定した7インチの ESP32-P4 タッチパネルです。Hermes が ESPHome の YAML を書いて OTA で書き込み、頼むたびに書き換わる Home Assistant の画面になります。（~$47-56）
- [Seeed XIAO ESP32S3 Sense](https://teknium.io/hermes-devices/#seeed-xiao-esp32s3-sense) — カメラ・マイク・SD スロット付きの親指サイズの ESP32-S3 ボードです。Hermes が cron で HTTP 経由のスナップショットを取得し、vision tool で画像を読み取る使い方ができます。（~$14）
- [SenseCAP Watcher](https://teknium.io/hermes-devices/#sensecap-watcher) — Seeed が物理的な AI エージェントとして売る、カメラ付きの卓上ロボットです。Home Assistant 連携や HTTP 通知でイベントを渡し、対処を Hermes に判断させられます。（~$61）
- [SenseCAP Indicator D1](https://teknium.io/hermes-devices/#sensecap-indicator-d1) — ESP32-S3 と RP2040 を内蔵した4インチ角のタッチパネルです。ESPHome で書き込めば Home Assistant のパネルになり、Hermes が HA の tool で読み取りや操作をします。（~$49）
- [LilyGO T-Deck Plus](https://teknium.io/hermes-devices/#lilygo-t-deck-plus) — キーボード・GPS・電池を備えた BlackBerry 風の LoRa 通信端末です。手元の Meshtastic ノードを介して Hermes がメッシュに加わり、圏外でもエージェントと話せる端末になります。（~$71）
- [LilyGO T-Lora Pager](https://teknium.io/hermes-devices/#lilygo-t-lora-pager) — キーボード・GPS・NFC・IMU を備えた改造向けの LoRa ページャーです。Meshtastic のメッシュ端末にするほか、Wi-Fi で Hermes API に問い合わせて短い返答を横長の画面に出せます。（~$87）
- [LilyGO T-Watch S3](https://teknium.io/hermes-devices/#lilygo-t-watch-s3) — LoRa を内蔵したオープンソースの ESP32-S3 スマートウォッチです。Hermes から Wi-Fi（MQTT や HTTP）や Meshtastic 経由の LoRa で通知を送れます。（~$43）
- [Adafruit ESP32-S3 Feather](https://teknium.io/hermes-devices/#adafruit-esp32-s3-feather) — カラー TFT を内蔵した Feather 規格の ESP32-S3 ボードです。CircuitPython なら Hermes が USB ドライブ上の code.py を直接書き換えられ、小さな表示板として使えます。（~$25）
- [Adafruit Qualia ESP32-S3](https://teknium.io/hermes-devices/#adafruit-qualia-esp32-s3) — 大型の RGB-666 TTL ディスプレイを駆動する ESP32-S3 ボードです。Hermes がパネル用のコードを書いて送り込み、MQTT や HTTP で表示内容を流し込めます。（~$20）
- [Raspberry Pi Pico 2](https://teknium.io/hermes-devices/#raspberry-pi-pico-2) — Arm と RISC-V のどちらのコアでも起動できる RP2350 搭載の安価なボードです。Hermes が MicroPython を載せ、mpremote を使って USB シリアル越しに端末から操作できます。（~$5）
- [WCH CH32 RISC-V + ch32fun](https://teknium.io/hermes-devices/#wch-ch32-risc-v-ch32fun) — 非常に安価な RISC-V マイコンと、ベンダー HAL を使わない開発環境 ch32fun です。Hermes が端末で C を書き、minichlink で書き込みとデバッグ出力の確認まで回せます。（~$0.10/chip）

## シングルボードコンピューターとエッジ AI

- [Raspberry Pi 5](https://teknium.io/hermes-devices/#raspberry-pi-5) — Hermes 自体を動かせる、Cortex-A76 クアッドコアの Linux ボードです。Hermes Agent をそのまま載せ、GPIO やカメラを扱ったり cron でハードウェアの作業を予約したりできます。（From $45 \(1GB\); 16GB $305）
- [Raspberry Pi Zero 2 W](https://teknium.io/hermes-devices/#raspberry-pi-zero-2-w) — ガムの包みほどの大きさのクアッドコア Linux コンピューターです。メモリが少ないので Hermes 本体は載せず、SSH や MQTT で Hermes から操作する手足として使うのが向いています。（~$15）
- [Raspberry Pi AI HAT+ 2](https://teknium.io/hermes-devices/#raspberry-pi-ai-hat-2) — Raspberry Pi 5 でローカル LLM を動かす、Hailo-10H 搭載の拡張ボードです。Ollama 風の API を介し、意図の解析や要約などの軽い処理を Hermes から任せられます。（~$200）
- [Arduino UNO Q](https://teknium.io/hermes-devices/#arduino-uno-q) — Debian が動く Linux 側とリアルタイム処理用マイコンを載せた UNO 形状のボードです。Hermes が SSH で Linux 側に入り、Bridge RPC 経由でマイコン側のピン操作まで扱えます。（$59 \(2GB\) / $79 \(4GB\)）
- [Jetson Orin Nano Super](https://teknium.io/hermes-devices/#jetson-orin-nano-super) — ローカル生成 AI 向けの、手のひらサイズの NVIDIA 製 CUDA ボックスです。Hermes を直接載せ、llama.cpp や Ollama のモデルを custom provider にできます。（~$399 \(launched at $249\)）
- [Seeed reComputer J4012](https://teknium.io/hermes-devices/#seeed-recomputer-j4012) — Jetson Orin NX 16GB を筐体に収めた、すぐ使えるエッジコンピューターです。LAN 上の GPU サーバーとして、Hermes が SSH でコンテナやモデルを配置し、定期ジョブで状態を見張ります。（~$1,450）
- [Hailo-8L](https://teknium.io/hermes-devices/#hailo-8l) — Raspberry Pi AI Kit にも使われる画像処理向けアクセラレーターです。Hermes は HailoRT のスクリプトや Frigate の MQTT イベントで検出結果を受け取り、意味を判断します。（~$70 \(as Pi AI HAT+ 13 TOPS\)）
- [Google Coral](https://teknium.io/hermes-devices/#google-coral) — ホビー向け AI を広めた Edge TPU で、いまはオープンな NPU に移った Coral です。旧ハードは Frigate の検出器にし、Hermes が MQTT 経由で検出結果を判断します。
- [BeagleY-AI](https://teknium.io/hermes-devices/#beagley-ai) — TI の画像処理向けチップを積んだ、Pi と同じ形のオープンハードウェア SBC です。Debian が動くので、Hermes が SSH で管理し、画像処理モデルの配置や結果の読み取りを受け持ちます。（~$70）
- [Milk-V \(RISC-V\)](https://teknium.io/hermes-devices/#milk-v-risc-v) — 小さな Duo から Mini-ITX 機まで揃う Milk-V の RISC-V ボード群です。大型ボードは Hermes が SSH でビルドや検証に使い、小型の Duo は周辺機器として扱うのが向いています。（From ~$5 \(Duo\); larger boards vary）
- [Framework Desktop](https://teknium.io/hermes-devices/#framework-desktop) — 最大128GB の統合メモリを積める、修理しやすい小型デスクトップです。ローカル推論サーバーとして OpenAI 互換の窓口を立て、Hermes の custom provider にすれば処理が家の外に出ません。（~$1,269-$3,449 \(DIY, 32GB-128GB\)）

## レトロ・FPGA・携帯機の開発

- [Analogue Pocket \(openFPGA\)](https://teknium.io/hermes-devices/#analogue-pocket-openfpga) — 実カートリッジとコミュニティ製の Verilog コアを動かす FPGA 携帯ゲーム機です。Hermes が端末で openFPGA コアをビルドし、microSD のフォルダ構成に合わせて配置します。（~$220）
- [ModRetro Chromatic](https://teknium.io/hermes-devices/#modretro-chromatic) — Verilog の設計ファイルを公開している FPGA 製の Game Boy Color 互換機です。Hermes がリポジトリを取得して合成し、openFPGALoader でビットストリームを書き込めます。（~$200）
- [MiSTer FPGA](https://teknium.io/hermes-devices/#mister-fpga) — DE10-Nano で往年のゲーム機やパソコンを FPGA 上に再現するプロジェクトです。Hermes が SSH で更新スクリプトや設定を扱い、cron でコアの更新を自動化できます。（~$200+）
- [Playdate](https://teknium.io/hermes-devices/#playdate) — クランク付きで、無料の C/Lua SDK がそろった携帯ゲーム機です。Hermes が端末で pdc を使ってビルドし、Simulator での確認から実機への転送までを回せます。（~$229）
- [Anbernic RG35XXSP](https://teknium.io/hermes-devices/#anbernic-rg35xxsp) — muOS などのカスタムファームウェアで使う、折りたたみ型のエミュレーション携帯機です。Hermes が microSD 単位で管理し、ファームウェアや自前の ROM バックアップの配置、セーブの同期を受け持ちます。（~$60）
- [Retroid Pocket 5](https://teknium.io/hermes-devices/#retroid-pocket-5) — Snapdragon 865 搭載の Android 携帯ゲーム機で、adb で操作を自動化できます。Hermes が adb でエミュレーターを入れ、自前のゲームのバックアップを転送し、cron でセーブを保存します。（~$199）
- [Miyoo Mini Plus](https://teknium.io/hermes-devices/#miyoo-mini-plus) — システムもゲームも1枚の SD カードで管理する、OnionOS の小型携帯機です。Hermes がカードに OnionOS を書き込み、自前の ROM バックアップやテーマ、セーブを整理します。（~$55）
- [TinyTapeout](https://teknium.io/hermes-devices/#tinytapeout) — Verilog で設計した自分のチップを実際に製造できるプロジェクトです。Hermes が端末でオープンな RTL-to-GDSII の流れを回し、シミュレーションから GitHub 経由の提出まで進めます。（~$100+）

## 音楽・シンセ・DSP

- [Electrosmith Daisy Seed](https://teknium.io/hermes-devices/#electrosmith-daisy-seed) — コードを書き込んで使う、STM32 ベースのオープンなオーディオ DSP ボードです。Hermes が端末で C++ を書いてビルドし、dfu-util で書き込むまでを無人で回せます。（~$30）
- [monome norns](https://teknium.io/hermes-devices/#monome-norns) — ネットワーク越しに Lua で書ける音のコンピューターです。Hermes が SSH で Lua スクリプトを送り込み、OSC でパラメータ変更や再生を遠隔で指示できます。（~$900 \(shield DIY ~$200\)）
- [Bela](https://teknium.io/hermes-devices/#bela) — 1ミリ秒未満の遅延で音とセンサーを扱うボードで、Pure Data か C++ で書きます。Hermes が SSH や IDE の API でプロジェクトを送り、ビルドから実行、ログ確認まで台本化できます。（~$130+）
- [Zynthian](https://teknium.io/hermes-devices/#zynthian) — OSC と MIDI で操作できる、Raspberry Pi ベースのオープンなシンセ箱です。Hermes が OSC の制御 API でスナップショットの読み込みやエンジンの切り替え、音の送信を行います。（~$550 \(kit\) / DIY varies）
- [Teenage Engineering OP-1 field](https://teknium.io/hermes-devices/#teenage-engineering-op-1-field) — MIDI で操作し、ファイルは USB でやり取りする携帯型シンセです。Hermes がスクリプトや cron から MIDI で演奏を指示し、USB 接続時にサンプルや録音を管理します。（~$1,999）
- [Teenage Engineering EP-133 K.O. II](https://teknium.io/hermes-devices/#teenage-engineering-ep-133-k-o-ii) — MIDI でだけ操作できるサンプラー兼グルーヴボックスです。ファイル操作の API はないため、Hermes はスクリプトや cron から MIDI でパッドを鳴らし、クロックを送ります。（~$299）
- [Ableton Move](https://teknium.io/hermes-devices/#ableton-move) — ネットワーク越しにセットを送り込める単体のグルーヴボックスです。Hermes がブラウザ用の管理ツール Move Manager でセットやサンプルを扱い、USB の MIDI で演奏も指示できます。（~$449）
- [Raspberry Pi Pico \(PicoADK/audio\)](https://teknium.io/hermes-devices/#raspberry-pi-pico-picoadk-audio) — シンセのファームウェアを書き込んで使う、RP2040 のオーディオ開発ボードです。Hermes が端末で C/C++ を生成して UF2 をビルドし、ボードに書き込むまでを受け持ちます。（~$40）

## 3D プリンター

- [Voron](https://teknium.io/hermes-devices/#voron) — 自分で組み立てるオープンソースの CoreXY プリンターのシリーズです。どれも Klipper で動くため Hermes は Moonraker で操作でき、組み立て中の部品表づくりや調整の手順も手伝えます。
- [Sovol SV08](https://teknium.io/hermes-devices/#sovol-sv08) — Voron 2.4 風の組み立て済み CoreXY プリンターで、素の Klipper が動きます。Hermes は LAN の Moonraker でクラウドを通さず印刷を始め、SSH で設定の調整もできます。（~$500-600）
- [Rat Rig](https://teknium.io/hermes-devices/#rat-rig) — 後から拡張できる大型の DIY プリンターキットのメーカーです。Klipper ベースの RatOS で動き、Hermes は Moonraker 経由で IDEX 用のマクロも操作できます。
- [BigTreeTech CB1](https://teknium.io/hermes-devices/#bigtreetech-cb1) — Klipper のホスト向けの、Raspberry Pi CM4 互換の安価なモジュールです。Hermes は SSH で Klipper 一式を入れ、軽い gateway や cron の実行役も置けます。
- [Prusa CORE One](https://teknium.io/hermes-devices/#prusa-core-one) — 庫内を加熱できる Prusa の密閉型 CoreXY プリンターです。Hermes は PrusaLink のローカル HTTP API で G-code を送り、印刷の開始・停止や状態の確認をクラウドなしで行えます。（~$925 kit / ~$1,200 assembled \(CORE One+\)）
- [Bambu Lab H2D](https://teknium.io/hermes-devices/#bambu-lab-h2d) — 2 つのノズルを持ち、レーザー加工やカット、ペン描画もこなすプリンターです。Hermes は Developer Mode を有効にして、ローカルの MQTT やカメラで操作と監視を行えます。（From ~$1,899）
- [Elegoo Centauri Carbon](https://teknium.io/hermes-devices/#elegoo-centauri-carbon) — 低価格の密閉型 CoreXY プリンターで、コミュニティ製の Home Assistant 連携があります。Hermes は HA 経由か SDCP で状態確認や一時停止、カメラ画像の取得を行えます。（~$300）

## CNC・レーザー・プロッター・部品実装機

- [Makera Carvera / Carvera Air](https://teknium.io/hermes-devices/#makera-carvera-carvera-air) — 密閉型の卓上 CNC フライスで、Carvera は自動工具交換、Carvera Air は手動補助式の工具交換に対応します。Hermes は G-code の生成・点検・送信や加工状況の通知を行えます。（~$5,300-5,800 \(Carvera\); ~$2,300-2,700 \(Air\)）
- [Sculpfun](https://teknium.io/hermes-devices/#sculpfun) — GRBL で動く低価格のダイオード・ファイバー・UV レーザー機のメーカーです。Hermes は USB シリアル経由で Python から G-code を直接送り、スマートプラグでの安全対策や完了通知も担えます。
- [AxiDraw + Python API](https://teknium.io/hermes-devices/#axidraw-python-api) — Python API を持つペンプロッターで、ロボットに手書きさせられます。Hermes は pyaxidraw で自作の SVG を描かせたり、一筆書きのフォントで手紙やカードを書かせたりできます。（~$475+）
- [Opulo LumenPnP](https://teknium.io/hermes-devices/#opulo-lumenpnp) — 自宅で基板に部品を実装できる、オープンソースの卓上ピックアンドプレース機です。Hermes は KiCad から配置ファイルを書き出し、部品表をフィーダーに割り当てて OpenPnP のジョブを作れます。（~$1,995）
- [OpenFlexure Microscope](https://teknium.io/hermes-devices/#openflexure-microscope) — 3D プリントで作る電動の実験用顕微鏡で、HTTP からスクリプトで操作できます。Hermes は Python クライアントでステージの移動やオートフォーカス、撮影を行い、定期的なスライドの走査も組めます。
- [Opentrons Flex](https://teknium.io/hermes-devices/#opentrons-flex) — Python で手順を書く、実験室向けの液体分注ロボットです。Hermes はプロトコルを書いてローカルでシミュレーションし、HTTP API でロボットにアップロードして実行を始められます。（From ~$26,400）
- [xTool S1 40W](https://teknium.io/hermes-devices/#xtool-s1-40w) — 囲い付きのダイオードレーザー加工機です。Hermes はコミュニティ製の Home Assistant 連携で状態や安全センサーを読み、一時停止や中止を操作します。加工データは LightBurn から送ります。（~$1,620-1,820）
- [Silhouette Cameo 5 Alpha Plus](https://teknium.io/hermes-devices/#silhouette-cameo-5-alpha-plus) — 幅広の素材を切れる家庭用カッティングマシンです。Hermes はオープンソースの Python ドライバー inkscape-silhouette を CLI で動かし、SVG からカットやペン描きを指示できます。（$399.99）

## 計測器

- [Rigol DHO804](https://teknium.io/hermes-devices/#rigol-dho804) — LAN と USB に対応するオシロスコープです。Hermes は PyVISA で SCPI を送り、トリガー設定、測定、波形や画面の取得を行えます。（$459）
- [Siglent SDS804X HD](https://teknium.io/hermes-devices/#siglent-sds804x-hd) — SCPI で制御できるオシロスコープです。Hermes は LAN の TCP ソケットか PyVISA を使い、チャンネル設定、測定、波形や画面の取得を行えます。（$461）
- [RD6006 bench PSU \(Python\)](https://teknium.io/hermes-devices/#rd6006-bench-psu-python) — Python から操作できる、安価な 60 V・6 A のプログラマブル電源です。Hermes はシリアル経由で出力を設定して測定値を記録し、長時間の試験を cron で見守れます。（~$100-200 \(module vs. complete unit\)）
- [Saleae](https://teknium.io/hermes-devices/#saleae) — Python の自動化 API を持つ USB ロジックアナライザーです。Hermes は logic2-automation でチャンネルやトリガーを設定して取り込み、解読したデータを文字として読み返せます。（From ~$499 \(Logic 8\)）
- [Digilent Analog Discovery 3](https://teknium.io/hermes-devices/#digilent-analog-discovery-3) — オシロスコープや信号発生器、ロジックアナライザー、電源を 1 台にまとめた USB 計測器です。Hermes は WaveForms SDK の Python バインディングで回路に信号を入れ、応答を測って説明できます。（~$379）
- [Joulescope](https://teknium.io/hermes-devices/#joulescope) — ナノアンペアからアンペアまで測れる高精度のエネルギー分析器です。Hermes は Python バインディングで測定し、ファームウェアの変更ごとの消費電力を測りながら省電力化を繰り返せます。（~$999 \(JS320\)）
- [Nordic PPK2](https://teknium.io/hermes-devices/#nordic-ppk2) — Nordic の Power Profiler Kit II は、わずかな消費電流から 1A までを測る電流計です。USB シリアルでつながるので、Hermes は基板に給電して平均電流を測り、ファームごとに比較できます。（~$100）
- [Glasgow Interface Explorer](https://teknium.io/hermes-devices/#glasgow-interface-explorer) — Glasgow は FPGA を使ったデジタルインターフェースの多用途ツールで、UART や SPI、JTAG などを扱えます。CLI なので、Hermes は端末から applet を呼んで出力を解析できます。（~$179 \(revC, limited stock\)）
- [Black Magic Probe](https://teknium.io/hermes-devices/#black-magic-probe) — Black Magic Probe は GDB サーバーを内蔵した JTAG/SWD デバッガで、ARM や RISC-V を扱えます。Hermes は端末の GDB だけで書き込み・停止・メモリ読み出しができます。（~$77 \(V2.3\)）
- [Raspberry Pi Debug Probe](https://teknium.io/hermes-devices/#raspberry-pi-debug-probe) — Raspberry Pi Debug Probe は SWD デバッガと USB シリアル変換を 1 つにした機器です。Hermes は OpenOCD と GDB で書き込み・デバッグし、UART 側でログも読めます。（~$12）
- [Bus Pirate 6](https://teknium.io/hermes-devices/#bus-pirate-6) — Bus Pirate 6 は端末から I2C や SPI、UART で各種チップと対話でき、ライブのロジック取り込みも備えます。Hermes は pyserial でシリアルを開き、同じコマンドを送れます。（~$83）
- [Pinecil + IronOS](https://teknium.io/hermes-devices/#pinecil-ironos) — Pinecil V2 はオープンソースの IronOS を載せた RISC-V のはんだごてです。V2 は BLE を持つので、Hermes は Python の BLE スクリプトでこて先の温度を読み、設定を変えられます。（~$26-36）
- [NanoVNA](https://teknium.io/hermes-devices/#nanovna) — NanoVNA は小型で安価なベクトルネットワークアナライザで、アンテナやフィルタの S11・S21 を測れます。Hermes は pyserial で USB シリアルのシェルを開き、掃引や周波数、データのコマンドを送れます。（~$60-130）
- [tinySA](https://teknium.io/hermes-devices/#tinysa) — tinySA は信号発生もできる小型のスペクトラムアナライザです。Hermes は USB シリアルを開いて scan や capture を送り、端末上の Python で dBm のデータを解析できます。（~$60-190 \(Basic to Ultra+\)）
- [Topdon TC001 thermal cam](https://teknium.io/hermes-devices/#topdon-tc001-thermal-cam) — Topdon TC001 は 256x192 の USB サーマルカメラで、基板の発熱を見つけるのに向きます。Linux では標準の映像機器として見え、Hermes は OpenCV でフレームと温度を読めます。（~$289）
- [Owon SPM6103](https://teknium.io/hermes-devices/#owon-spm6103) — 直流電源とマルチメーターを1台にまとめた卓上機です。Hermes は owon-psu ライブラリで USB 経由につなぎ、電圧や電流の設定と出力の切り替え、測定値の読み取りを1本のケーブルで行えます。（~$159）

## 工房の運用

- [Brother QL-820NWBc](https://teknium.io/hermes-devices/#brother-ql-820nwbc) — 幅広のラベルを刷れる、ネットワーク対応のラベルプリンターです。Hermes は Pillow でラベル画像を作り、オープンソースの brother\_ql パッケージで LAN 越しに印刷します。（$229.99）
- [Brother P-touch PT-P750W](https://teknium.io/hermes-devices/#brother-pt-p750w) — ラミネートされた TZe テープに印字する P-touch のラベルライターです。Hermes は ptouch パッケージを入れ、Wi-Fi 越しに文字や画像のラベルを印刷します。USB 向けの CLI もあります。（$154.99）
- [NIIMBOT B1](https://teknium.io/hermes-devices/#niimbot-b1) — スマホアプリで使う小型の感熱ラベルメーカーです。Hermes はコミュニティが解析したプロトコルを使う niimprint や niimblue-node から印刷します。非公式なので、更新で動かなくなる場合があります。（~$27）
- [Zebra ZD421](https://teknium.io/hermes-devices/#zebra-zd421) — 業務用のラベルプリンターです。Hermes は ZPL を生成し、ネットワーク対応構成では TCP 接続で、USB 接続では CUPS 経由で印刷できます。（~$550）
- [Epson OmniLink TM-m30III](https://teknium.io/hermes-devices/#epson-tm-m30iii) — Epson の小型レシートプリンターです。Hermes は python-escpos で LAN から印刷するほか、内蔵の HTTP に ePOS-Print の XML を送ったり、ジョブを取りに来させたりできます。（~$320）
- [Star Micronics mC-Print3](https://teknium.io/hermes-devices/#star-mc-print3) — 印刷ジョブをサーバーへ取りに行くレシートプリンターです。Hermes が小さな CloudPRNT サーバーを立てると、プリンターが HTTP か MQTT で問い合わせて印刷を受け取ります。（~$500）
- [Fujifilm instax mini Link 3](https://teknium.io/hermes-devices/#fujifilm-instax-mini-link-3) — instax mini フィルムに刷るスマホ用プリンターです。Hermes は非公式の InstantLink CLI で、Linux から Bluetooth で写真を印刷し、電池やフィルム残数も読めます。（~$117）
- [Canon SELPHY CP1500](https://teknium.io/hermes-devices/#canon-selphy-cp1500) — はがきサイズの写真を刷る昇華型プリンターです。Linux の CUPS からはドライバー不要の IPP プリンターに見えるので、Hermes は lp コマンドや Python から写真を印刷できます。（$179.99）
- [Brother ADS-1800W](https://teknium.io/hermes-devices/#brother-ads-1800w) — 両面を一度に読む小型の Wi-Fi スキャナーです。Hermes は sane-airscan でネットワーク越しにスキャンするか、スキャナーが SFTP に置いた PDF を拾って OCR と整理を行います。（$324.99）
- [Zebra DS2208](https://teknium.io/hermes-devices/#zebra-ds2208) — 1次元と2次元のバーコードを読むハンディスキャナーです。Hermes はキーボード入力として python-evdev で読むほか、Zebra の Linux 用 SDK でイベントやブザー、LED を扱えます。（~$193）

## 無線・SDR・メッシュ

- [HackRF One / HackRF Pro](https://teknium.io/hermes-devices/#hackrf-one-hackrf-pro) — HackRF One / Pro は 1MHz〜6GHz をカバーするオープンソースの SDR です。Hermes は端末の hackrf\_sweep などや Python で動かし、numpy でキャプチャを解析できます。（~$330 \(One\); ~$400 \(Pro\)）
- [RTL-SDR Blog V4 / V4L](https://teknium.io/hermes-devices/#rtl-sdr-blog-v4) — RTL-SDR Blog V4 は約 500kHz〜1.766GHz を受信する安価な SDR ドングルです。Hermes は rtl\_fm や rtl\_power を端末から動かし、cron で常時の受信拠点にもできます。（~$38 \(V4L\)）
- [Airspy R2](https://teknium.io/hermes-devices/#airspy-r2) — VHF と UHF を広い帯域で受信できる SDR 受信機です。Hermes は trunk-recorder や SatDump などの裏で動かし、それらが MQTT や JSON、音声ファイルで出す結果を読みます。（$169）
- [KiwiSDR 2](https://teknium.io/hermes-devices/#kiwisdr-2) — 短波帯をまるごと受信できるネットワーク接続の HF 受信機です。Hermes は kiwiclient で音声や波形を定時に記録し、wsprdaemon で WSPR の受信記録を集めて問い合わせられます。（$519.99）
- [KrakenSDR](https://teknium.io/hermes-devices/#krakensdr) — KrakenSDR は 5 チャンネルの位相コヒーレントな SDR で、電波の方向探知に使えます。Hermes は DSP ソフトの Web インターフェースと方位出力に接続し、方位を時系列で記録できます。（$775 \(+$67.50 antenna set\)）
- [KrakenRF Discovery Dish + Drive](https://teknium.io/hermes-devices/#krakenrf-discovery-dish) — 受信フィードを交換して使うパラボラアンテナです。Hermes は SatDump の受信結果を読み、別売の Discovery Drive を追加すれば rotctl で回転台を制御できます。（$274 \(dish + L-band feed\); Drive $799）
- [RockBLOCK 9704](https://teknium.io/hermes-devices/#rockblock-9704) — Iridium 衛星網でメッセージを送受信する USB-C モデムです。Hermes は公式 Python ライブラリで使い、端末から送ったメッセージを Cloudloop 経由で指定の Webhook に届けられます。（$279 + $15/mo airtime）
- [Blues Starnote for Skylo](https://teknium.io/hermes-devices/#blues-starnote-skylo) — Blues の Notecard に衛星通信を足す拡張です。Hermes は note-python で Notecard の JSON API を使い、圏外のときの死活報告や警報を Notehub 経由で受け取ります。（$99 starter kit）
- [SparkFun ZED-F9P RTK GNSS](https://teknium.io/hermes-devices/#sparkfun-zed-f9p) — RTK 補正情報を使う GNSS 受信ボードです。Hermes は pyubx2 や gpsd で位置と時刻を読み、RTKLIB で基地局や移動局を動かせます。（$259.95 \(+$109.95 antenna\)）
- [bladeRF 2.0 micro xA4](https://teknium.io/hermes-devices/#bladerf-xa4) — 送信と受信を同時に行える SDR です。Hermes は SoapySDR や GNU Radio で動かし、周波数や出力を制限して、減衰器を挟んだ同軸接続やダミーロードで送信実験を行います。（$540）
- [QRP Labs QMX+](https://teknium.io/hermes-devices/#qrp-labs-qmx-plus) — FT8 や WSPR に使える小出力の HF 無線機で、USB 1本でパソコンにつながります。Hermes は hamlib の rigctld と WSJT-X で操作します。送信には免許と運用者の立ち会いが要ります。（$125 kit / $185 assembled）
- [FlightAware Pro Stick Plus](https://teknium.io/hermes-devices/#flightaware-pro-stick-plus) — 航空機の ADS-B 信号を受ける USB 受信機です。Raspberry Pi で readsb を動かすと aircraft.json が更新され続け、Hermes はそれを読んで頭上の飛行機を把握し、通知します。（$45.99）
- [RAK WisMesh Station HP](https://teknium.io/hermes-devices/#rak-wismesh-station-hp) — Meshtastic の基地局として組まれた Raspberry Pi です。Hermes は SSH で入り、Python の TCP 接続か内蔵の MQTT で無線とつながり、メッシュとの橋渡しをします。（$175.99）
- [RAK Meshtastic kit](https://teknium.io/hermes-devices/#rak-meshtastic-kit) — RAKwireless の WisBlock Meshtastic キットは、nRF52840 と SX1262 を組んだモジュール式の LoRa ノードです。Hermes は meshtastic の CLI で操作し、テレメトリを読めます。（~$25-61）
- [Heltec WiFi LoRa 32 V4 / V3](https://teknium.io/hermes-devices/#heltec-wifi-lora-32-v3) — Heltec WiFi LoRa 32 V3 は ESP32-S3 に LoRa と OLED を載せた安価なボードで、Meshtastic でよく使われます。Hermes は端末から書き込み、Meshtastic のライブラリで操作できます。（~$18-28）
- [SenseCAP T1000-E](https://teknium.io/hermes-devices/#sensecap-t1000-e) — Seeed の SenseCAP T1000-E は Meshtastic が動く、カード大で防水の GPS トラッカーです。Hermes は meshtastic ライブラリや MQTT で位置やテレメトリを受け取れます。（~$40）
- [RAK7268V2 LoRaWAN gateway](https://teknium.io/hermes-devices/#rak7268v2) — ネットワークサーバーと MQTT を内蔵した屋内用の LoRaWAN ゲートウェイです。Hermes は MQTT ブリッジを購読してセンサーの値を受け取り、同じ経路でセンサーへの送信も予約できます。（$154）
- [Morse Micro HaLowLink 1](https://teknium.io/hermes-devices/#halowlink-1) — Wi-Fi HaLow で遠くまで IP をつなぐ OpenWrt のルーターです。Hermes は SSH で uci や ubus を使って管理し、通信品質を見張りながら、その回線越しに離れた機器を扱います。（$99 each \(needs two\)）

## ポケット Linux とサイバーデッキ

- [ClockworkPi uConsole](https://teknium.io/hermes-devices/#clockworkpi-uconsole) — ClockworkPi uConsole は、Raspberry Pi CM4 などを差し替えて使うモジュール式の携帯 Linux 端末です。Hermes Agent は Wi-Fi 越しに SSH し、現場のノードとして扱えます。（~$139）
- [Clockwork DevTerm](https://teknium.io/hermes-devices/#clockwork-devterm) — Clockwork DevTerm はモジュール式の携帯 Linux 端末です。Hermes は SSH でジョブを実行し、オプションの58mmサーマルプリンターを装着すれば、CUPS 経由で結果やログを印刷できます。（~$219）
- [MNT Pocket Reform](https://teknium.io/hermes-devices/#mnt-pocket-reform) — MNT Pocket Reform は、メインライン Linux が動くオープンハードの 7 インチ小型ノートです。Hermes Agent は他の機械と同じように SSH し、ローカルのビルドやエージェントを走らせられます。（~$500）
- [Beepy \(SQFMI\)](https://teknium.io/hermes-devices/#beepy-sqfmi) — Beepy は BlackBerry 風キーボードと省電力の Sharp メモリ液晶を組んだ手のひら大のボードで、Pi Zero W で動かします。Hermes Agent は SSH で動き、液晶や LED を操作できます。（~$79）
- [Raspberry Pi 500+](https://teknium.io/hermes-devices/#raspberry-pi-500) — Raspberry Pi 500+ は、Pi 5 と NVMe SSD をメカニカルキーボードに収めた一体機です。Hermes Agent は SSH で入り、実ストレージを持つデスクトップ級のノードとして使えます。（~$200）

元のページの確認日: 2026-10-26
