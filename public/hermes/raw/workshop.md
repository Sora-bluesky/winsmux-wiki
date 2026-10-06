---
title: "Hermes Workshop 日本語版"
description: "Nous Research の Teknium がまとめた、Hermes Agent とつなげる機器のカタログ『The Hermes Workshop』を日本語の 1 行で紹介する索引。"
raw: /hermes/raw/workshop.md
---

# Hermes Workshop 日本語版

「The Hermes Workshop」は、Nous Research の [Teknium](https://x.com/Teknium) がまとめた、Hermes Agent を組み込んだりつないだりできる機器のカタログです。このページでは 307 件・28 分類を日本語の 1 行で紹介し、名前から元のページの各機器の説明へ進めます。

隠し撮り・隠し録音の機器と、侵入検査用の道具（23 件）は、日本の法律に触れる使い方があるため載せていません。[元のページ](https://teknium.io/hermes-devices/)で見られます。

Wi-Fi・Bluetooth・LoRa などの電波を出す機器を日本で使うには、技適マークが必要です。総務省の[技適マークの Q&A](https://www.tele.soumu.go.jp/j/adm/monitoring/summary/qa/giteki_mark/)をご覧ください。

日本語の文はこのサイトによる要約です。価格や仕様は元のページとメーカーの情報をご覧ください。

## Hermes 専用ガジェット

- [Waveshare ESP32-S3-LCD-1.54](https://teknium.io/hermes-devices/#waveshare-esp32-s3-lcd-1-54) — ESP32-S3 に1.54インチ画面とマイク・スピーカーを載せた音声ボードです。Hermes Gadget SDK の正式ターゲットで、ブラウザから書き込み、BOOT を押しながら話しかけられます。（~$15-19）
- [Waveshare ESP32-S3-Touch-AMOLED-1.75](https://teknium.io/hermes-devices/#waveshare-esp32-s3-touch-amoled-1-75) — 円形 AMOLED にマイクと IMU を載せた ESP32-S3 ボードです。Hermes Gadget SDK に対応し、画面を押し続けて話しかけます。MQTT で Hermes に状態を送る使い方もできます。（~$30-40）
- [Waveshare ESP32-S3-Touch-LCD-2.8](https://teknium.io/hermes-devices/#waveshare-esp32-s3-touch-lcd-2-8) — 2.8インチのタッチ画面とスピーカーを備えた ESP32-S3 ボードです。Hermes Familiar プラグインの検証済みボードで、エージェントの状態表示や gateway の承認操作に使えます。（~$20-26）
- [Espressif ESP32-S3-BOX-3](https://teknium.io/hermes-devices/#espressif-esp32-s3-box-3) — Espressif のタッチ画面付き音声ボックスです。Hermes Gadget SDK の実験的ターゲットで、ESPHome の音声アシスタントとして Home Assistant 経由でもつながります。（~$50）
- [M5Stack CoreS3](https://teknium.io/hermes-devices/#m5stack-cores3) — カメラ・マイク・電池を内蔵した M5Stack の ESP32-S3 キューブです。Hermes Gadget SDK の実験的ターゲットで、ESP-Hermes チャネルプラグインもこの機器群を前提に作られています。（~$60）

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
- [xiaozhi-esp32](https://teknium.io/hermes-devices/#xiaozhi-esp32) — MCP を軸にしたオープンソースの ESP32 向け音声アシスタントファームウェアです。セルフホストのサーバーを Hermes API server に向ければ、各ガジェットが Hermes の音声窓口になります。（Free \(OSS\)）
- [ESP-Claw](https://teknium.io/hermes-devices/#esp-claw) — MCP server と client を兼ねる、Espressif のチップ上の AI エージェント基盤です。Hermes が MCP server として登録し、機能を tool として呼べます。（Free \(OSS\)）
- [ESP-IDF](https://teknium.io/hermes-devices/#esp-idf) — 全 ESP32 向けの公式 SDK で、MCP server も備えています。Hermes に ESP-IDF の MCP server を登録すると、ビルドや書き込みがそのまま tool になります。（Free \(OSS\)）
- [PlatformIO](https://teknium.io/hermes-devices/#platformio) — 数千種類のボード向けにファームウェアをビルド・書き込みできる単一の CLI です。すべて CLI で完結するので、Hermes がプロジェクトを作り、ボードごとの手順を skill として残せます。（Free \(OSS\)）
- [MicroPython](https://teknium.io/hermes-devices/#micropython) — マイコン上で直接動く Python 3 の実装です。Hermes が端末から mpremote でコード片を実行したりファイルを送ったりして、書き込みなしでボードを試せます。（Free \(OSS\)）
- [CircuitPython](https://teknium.io/hermes-devices/#circuitpython) — 600種以上のボードで動く、Adafruit の初心者向け Python です。Hermes がマウントされた CIRCUITPY ドライブに code.py を直接書き込み、シリアルコンソールで結果を確かめられます。（Free \(OSS\)）

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
- [balena \(fleet management\)](https://teknium.io/hermes-devices/#balena-fleet-management) — Linux 機器を Docker コンテナでまとめて管理し、OTA で更新する基盤です。Hermes が balena CLI で配置やロールバックを行い、cron で状態を見張って gateway 経由で知らせます。（Free \(first 10 devices\); paid plans from $159/mo）

## レトロ・FPGA・携帯機の開発

- [Analogue Pocket \(openFPGA\)](https://teknium.io/hermes-devices/#analogue-pocket-openfpga) — 実カートリッジとコミュニティ製の Verilog コアを動かす FPGA 携帯ゲーム機です。Hermes が端末で openFPGA コアをビルドし、microSD のフォルダ構成に合わせて配置します。（~$220）
- [ModRetro Chromatic](https://teknium.io/hermes-devices/#modretro-chromatic) — Verilog の設計ファイルを公開している FPGA 製の Game Boy Color 互換機です。Hermes がリポジトリを取得して合成し、openFPGALoader でビットストリームを書き込めます。（~$200）
- [MiSTer FPGA](https://teknium.io/hermes-devices/#mister-fpga) — DE10-Nano で往年のゲーム機やパソコンを FPGA 上に再現するプロジェクトです。Hermes が SSH で更新スクリプトや設定を扱い、cron でコアの更新を自動化できます。（~$200+）
- [Playdate](https://teknium.io/hermes-devices/#playdate) — クランク付きで、無料の C/Lua SDK がそろった携帯ゲーム機です。Hermes が端末で pdc を使ってビルドし、Simulator での確認から実機への転送までを回せます。（~$229）
- [Anbernic RG35XXSP](https://teknium.io/hermes-devices/#anbernic-rg35xxsp) — muOS などのカスタムファームウェアで使う、折りたたみ型のエミュレーション携帯機です。Hermes が microSD 単位で管理し、ファームウェアや自前の ROM バックアップの配置、セーブの同期を受け持ちます。（~$60）
- [Retroid Pocket 5](https://teknium.io/hermes-devices/#retroid-pocket-5) — Snapdragon 865 搭載の Android 携帯ゲーム機で、adb で操作を自動化できます。Hermes が adb でエミュレーターを入れ、自前のゲームのバックアップを転送し、cron でセーブを保存します。（~$199）
- [Miyoo Mini Plus](https://teknium.io/hermes-devices/#miyoo-mini-plus) — システムもゲームも1枚の SD カードで管理する、OnionOS の小型携帯機です。Hermes がカードに OnionOS を書き込み、自前の ROM バックアップやテーマ、セーブを整理します。（~$55）
- [TinyTapeout](https://teknium.io/hermes-devices/#tinytapeout) — Verilog で設計した自分のチップを実際に製造できるプロジェクトです。Hermes が端末でオープンな RTL-to-GDSII の流れを回し、シミュレーションから GitHub 経由の提出まで進めます。（~$100+）

## ロボット

- [Reachy Mini](https://teknium.io/hermes-devices/#reachy-mini) — Pollen Robotics と Hugging Face のオープンな卓上ロボットです。Hermes が Python SDK で動かし、MCP server にして hermes mcp add で登録できます。（$499 Wireless / $399 Lite）
- [LeRobot](https://teknium.io/hermes-devices/#lerobot) — 実機ロボットの学習を扱う Hugging Face の PyTorch ライブラリです。すべて CLI なので、Hermes が端末からデータ収集・学習・評価を回し、正確なオプションを skill に残せます。（Free \(OSS\)）
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
- [UFACTORY Lite 6](https://teknium.io/hermes-devices/#ufactory-lite-6) — 机に載る本格的な協働ロボットアームです。Hermes が xArm Python SDK で動作を計画・実行し、SDK の衝突検知や安全制限が LLM の書く動作の歯止めになります。（~$3,349）
- [Crazyflie 2.1 Brushless](https://teknium.io/hermes-devices/#crazyflie-2-1-brushless) — 群飛行や研究向けの、重さ34gのオープンソース小型ドローンです。Hermes が cflib を使い Crazyradio 経由で飛ばし、検証済みの飛行スクリプトを skill として残せます。（~$480）
- [ArduPilot / PX4](https://teknium.io/hermes-devices/#ardupilot-px4) — 空・陸・水上・水中の機体を扱うオープンソースのオートパイロット ArduPilot と PX4 です。Hermes が MAVLink でミッションを送り、まず SITL で予行してから実機を動かせます。（Free \(OSS\)）
- [OpenBot](https://teknium.io/hermes-devices/#openbot) — Android スマホを頭脳にする安価なロボットカーです。Hermes が Python コントローラーで操作し、走行データの収集から学習、スマホへのモデル転送までを skill にまとめられます。（~$50 + phone）
- [FrodoBots](https://teknium.io/hermes-devices/#frodobots) — インターネット越しに操作やスクリプト実行ができる 4G 対応の歩道ロボットです。SDK のローカルサーバーが HTTP で操作・撮影・発話を受け付けるので、Hermes が直接呼び出せます。（~$349-$399）
- [Feetech servos](https://teknium.io/hermes-devices/#feetech-servos) — オープンなロボットで広く使われる、安価なシリアルバス式スマートサーボです。Hermes が Python SDK でサーボの状態を読み書きし、cron で温度や負荷を点検できます。（~$14-$22 per STS3215）
- [HUSKYLENS 2](https://teknium.io/hermes-devices/#huskylens-2) — AI 画像認識センサーです。別売の Wi-Fi モジュールと最新ファームウェアを用意して MCP Service を有効にし、`hermes mcp add`で登録すると、Hermes が認識結果の取得や撮影を指示できます。（~$90）
- [OpenMV](https://teknium.io/hermes-devices/#openmv) — MicroPython で書ける、ロボット向けの小型マシンビジョンカメラです。Hermes がスクリプトを書いて USB で送り、結果を読んで直すという開発の繰り返しを自分で回せます。（$165-$195）
- [Luxonis OAK depth cams](https://teknium.io/hermes-devices/#luxonis-oak-depth-cams) — ニューラルネットをカメラ上で動かすステレオ深度カメラです。Hermes が DepthAI で Python のパイプラインを組み、3D 座標付きの検出結果を受け取れます。（$269+）
- [Seeed reCamera](https://teknium.io/hermes-devices/#seeed-recamera) — Node-RED を内蔵した、RISC-V Linux のオープンソース AI カメラです。Node-RED から検出結果を Hermes の webhook に送れば、Hermes が反応するセンサーになります。（~$110）
- [Grove Vision AI V2](https://teknium.io/hermes-devices/#grove-vision-ai-v2) — Arm の NPU を積んだマイコン向けの小型画像認識モジュールです。検出結果が I2C/UART や USB シリアルで出るので、Hermes がホストの Pi などから読み取って対応します。（~$16）
- [RPLIDAR A1](https://teknium.io/hermes-devices/#rplidar-a1) — ホビーの SLAM で定番の安価な360度ライダーです。Pi などに USB でつなぐと、Hermes が ROS 2 で SLAM や Nav2 を起動し、地図作りを台本化できます。（~$99）

## 音楽・シンセ・DSP

- [Electrosmith Daisy Seed](https://teknium.io/hermes-devices/#electrosmith-daisy-seed) — コードを書き込んで使う、STM32 ベースのオープンなオーディオ DSP ボードです。Hermes が端末で C++ を書いてビルドし、dfu-util で書き込むまでを無人で回せます。（~$30）
- [monome norns](https://teknium.io/hermes-devices/#monome-norns) — ネットワーク越しに Lua で書ける音のコンピューターです。Hermes が SSH で Lua スクリプトを送り込み、OSC でパラメータ変更や再生を遠隔で指示できます。（~$900 \(shield DIY ~$200\)）
- [Bela](https://teknium.io/hermes-devices/#bela) — 1ミリ秒未満の遅延で音とセンサーを扱うボードで、Pure Data か C++ で書きます。Hermes が SSH や IDE の API でプロジェクトを送り、ビルドから実行、ログ確認まで台本化できます。（~$130+）
- [Zynthian](https://teknium.io/hermes-devices/#zynthian) — OSC と MIDI で操作できる、Raspberry Pi ベースのオープンなシンセ箱です。Hermes が OSC の制御 API でスナップショットの読み込みやエンジンの切り替え、音の送信を行います。（~$550 \(kit\) / DIY varies）
- [Teenage Engineering OP-1 field](https://teknium.io/hermes-devices/#teenage-engineering-op-1-field) — MIDI で操作し、ファイルは USB でやり取りする携帯型シンセです。Hermes がスクリプトや cron から MIDI で演奏を指示し、USB 接続時にサンプルや録音を管理します。（~$1,999）
- [Teenage Engineering EP-133 K.O. II](https://teknium.io/hermes-devices/#teenage-engineering-ep-133-k-o-ii) — MIDI でだけ操作できるサンプラー兼グルーヴボックスです。ファイル操作の API はないため、Hermes はスクリプトや cron から MIDI でパッドを鳴らし、クロックを送ります。（~$299）
- [Ableton Move](https://teknium.io/hermes-devices/#ableton-move) — ネットワーク越しにセットを送り込める単体のグルーヴボックスです。Hermes がブラウザ用の管理ツール Move Manager でセットやサンプルを扱い、USB の MIDI で演奏も指示できます。（~$449）
- [Raspberry Pi Pico \(PicoADK/audio\)](https://teknium.io/hermes-devices/#raspberry-pi-pico-picoadk-audio) — シンセのファームウェアを書き込んで使う、RP2040 のオーディオ開発ボードです。Hermes が端末で C/C++ を生成して UF2 をビルドし、ボードに書き込むまでを受け持ちます。（~$40）

## ウェアラブルと身体のセンサー

- [Watchy](https://teknium.io/hermes-devices/#watchy) — 自分で書き込んで使う、オープンソースの ESP32 電子ペーパー腕時計です。Hermes が独自の文字盤コードを生成して USB シリアルで書き込み、cron で新しい文字盤に差し替えられます。（~$80）
- [PineTime](https://teknium.io/hermes-devices/#pinetime) — オープンな InfiniTime ファームウェアで動く BLE 腕時計です。Hermes が BLE 経由で心拍や歩数を読み、時刻合わせや通知の送信を行えます。（~$27）
- [Bangle.js 2](https://teknium.io/hermes-devices/#bangle-js-2) — Bluetooth 経由で JavaScript のアプリを入れられるスマートウォッチです。Hermes が JS アプリを作って BLE で転送し、端末上でコードを動かしてセンサー値を受け取れます。（~$70）
- [Pebble \(Core Devices\)](https://teknium.io/hermes-devices/#pebble-core-devices) — 完全オープンソースの PebbleOS で復活した Pebble の腕時計です。Hermes がオープンな SDK でアプリや文字盤を作って転送し、BLE や timeline API で通知やデータを腕元に送ります。
- [Oura Ring 4](https://teknium.io/hermes-devices/#oura-ring-4) — 睡眠や HRV、心拍を測るスマートリングで、データはクラウドの Oura API V2 から取れます。Hermes は HTTPS で指標を読み、毎朝の要約や cron のレポートに入れられます。（~$349）
- [WHOOP 5.0 / MG](https://teknium.io/hermes-devices/#whoop-5-0-mg) — 画面のないバンド型トラッカーで、心拍や睡眠から Strain と Recovery を出します。Hermes は OAuth 2.0 の REST API か webhook でデータを受け、レポートやメモリに残せます。
- [Ultrahuman Ring AIR](https://teknium.io/hermes-devices/#ultrahuman-ring-air) — 睡眠や HRV、体温を測るスマートリングで、Partner API が用意されています。Hermes は自分用の Personal API token で日ごとの指標を取り、cron やレポートに使えます。（~$349）
- [Brilliant Labs Halo](https://teknium.io/hermes-devices/#brilliant-labs-halo) — ファームウェアを書き換えられるオープンソースの AI メガネです。Hermes は Brilliant SDK で BLE 越しに画面やカメラを操作し、Zephyr のファームウェアを OTA で入れられます。（~$299）
- [Even Realities G2](https://teknium.io/hermes-devices/#even-realities-g2) — レンズに文字を映すディスプレイ付きメガネで、カメラはありません。Hermes は公式の Even Hub SDK で Web アプリ型のプラグインを作り、通知や文字を HUD に送れます。（~$599）
- [Plaud NotePin](https://teknium.io/hermes-devices/#plaud-notepin) — 身に着けて使う録音機で、文字起こしと要約をアプリで受け取れます。Hermes は公式の Plaud MCP server を hermes mcp add で追加し、録音の検索や文字起こしの読み出しができます。（~$159）

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

## 照明・LED・ピクセル表示

- [WLED](https://teknium.io/hermes-devices/#wled) — ESP32 を LED テープのコントローラーに変えるオープンソースのファームウェアです。Hermes は JSON API に POST して色やエフェクトを 1 回で変えられ、MQTT や DDP にも対応します。（Free \(OSS\)）
- [QuinLED controllers](https://teknium.io/hermes-devices/#quinled-controllers) — WLED 向けに作られた ESP32 の LED コントローラーで、本格的な LED 工事に向いています。Hermes は WLED の JSON API や MQTT で他の WLED 機器と同じように操作できます。
- [Athom WLED music controller](https://teknium.io/hermes-devices/#athom-wled-music-controller) — WLED を書き込み済みで、マイクを内蔵した安価な LED コントローラーです。Hermes は WLED の JSON API で操作でき、cron で設定のバックアップを定期的に取ることもできます。（~$20-36）
- [AWTRIX NG](https://teknium.io/hermes-devices/#awtrix-ng) — ESP32 の LED マトリクス時計を小さな表示器に変える AWTRIX 3 の後継です。Hermes は 1 回の POST で通知を流せ、Berry で書いたアプリは Hermes が止まっても動き続けます。（Free \(noncommercial license\)）
- [rpi-rgb-led-matrix](https://teknium.io/hermes-devices/#rpi-rgb-led-matrix) — Raspberry Pi から HUB75 の LED パネルを駆動するライブラリで、何枚もつないで大画面にできます。Hermes は Python で画面を作り、文字や画像、グラフを表示する skill にできます。（Free \(OSS\)）
- [Open Lighting Architecture](https://teknium.io/hermes-devices/#open-lighting-architecture) — DMX512 や Art-Net、sACN など舞台照明のプロトコルをまとめて扱う Linux 用の仕組みです。Hermes は ola\_set\_dmx などで照明を操作し、チャットや cron から動かせます。（Free \(OSS\)）
- [ENTTEC Open DMX USB](https://teknium.io/hermes-devices/#enttec-open-dmx-usb) — パソコンから DMX 照明を動かすための、昔からある手頃な USB ドングルです。Hermes は Linux 上で OLA や pyftdi を通じて操作でき、skill にすれば照明の操作をチャットから呼べます。（~$70）

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

## Hermes が描くディスプレイ

- [TRMNL BYOS \(Terminus\)](https://teknium.io/hermes-devices/#trmnl-byos-terminus) — TRMNL の電子ペーパー端末を自分のサーバーで動かすためのオープンソースのソフトです。Hermes は JSON API で HTML を送って画面を作り、cron で定期的に描き替えられます。（Free \(OSS\)）
- [TRMNL firmware](https://teknium.io/hermes-devices/#trmnl-firmware) — TRMNL の電子ペーパー端末用のオープンなファームウェアで、他社の ESP32 ボードにも対応しています。通信の仕組みが小さいため、Hermes が描いた画像を配るサーバーを自分で立てられます。（Free \(OSS\)）
- [Tronbyt server](https://teknium.io/hermes-devices/#tronbyt-server) — Tidbyt のピクセル表示器を、クラウドの代わりに LAN 内で動かすサーバーです。Hermes は REST API で画像を表示器に直接送り、ターミナルや cron から表示を切り替えられます。（Free \(OSS\)）
- [InkyPi](https://teknium.io/hermes-devices/#inkypi) — Raspberry Pi と電子ペーパーで作る表示フレームで、Web 画面とプラグインがあります。Hermes は Python のプラグインを書くか、自分で用意したページを表示させて内容を更新できます。（Free \(OSS\)）
- [Pimoroni Inky library](https://teknium.io/hermes-devices/#pimoroni-inky-library) — Pimoroni の電子ペーパーに画像を表示する公式の Python ライブラリです。Hermes は Pi の上で Pillow で描いた画像を数行で表示でき、cron やメッセージをきっかけに描き替えられます。（Free \(OSS\)）
- [Inkplate Arduino library](https://teknium.io/hermes-devices/#inkplate-arduino-library) — Soldered の ESP32 一体型電子ペーパーボード向けの Arduino ライブラリです。Hermes は arduino-cli でビルドと書き込みを行い、自分が描いた画像を端末に定期的に取りに来させられます。（Free \(OSS\)）
- [Seeed reTerminal E1001](https://teknium.io/hermes-devices/#seeed-reterminal-e1001) — ケース入りの 7.5 インチ電子ペーパー表示器で、ESP32-S3 で動きます。Hermes が ESPHome の YAML を書いて OTA で入れれば、Home Assistant の情報を表示できます。（~$69）
- [Pimoroni Presto](https://teknium.io/hermes-devices/#pimoroni-presto) — 4 インチのタッチ画面と背面の RGB ライトを持つ RP2350 の卓上ディスプレイです。Hermes は MicroPython を書いて送り、エージェントの状態を表示したり、タップを承認に使ったりできます。（~$78）

## オーディオとメディア

- [Music Assistant](https://teknium.io/hermes-devices/#music-assistant) — 各種ストリーミングと手元の曲をまとめ、さまざまなスピーカーで再生する自前の音楽サーバーです。MCP Server プラグインが Hermes の config.yaml に貼る設定を出してくれます。（Free \(OSS\)）
- [Snapcast \(multiroom\)](https://teknium.io/hermes-devices/#snapcast-multiroom) — 複数の部屋のスピーカーで音をぴったり同期して鳴らすオープンソースの仕組みです。Hermes は JSON-RPC で音量や音源を切り替えられ、自分の読み上げ音声を家中に流すこともできます。（Free \(OSS\)）
- [Volumio](https://teknium.io/hermes-devices/#volumio) — Raspberry Pi などを音楽ストリーマーにする、音質重視の再生用 OS です。Hermes は REST API で再生や音量を操作し、再生中の曲を取得でき、skill や cron にまとめられます。（Free \(MyVolumio tiers optional\)）
- [Jellyfin](https://teknium.io/hermes-devices/#jellyfin) — 映画やドラマ、音楽を自分で配信できる無料のメディアサーバーです。Hermes は REST API でライブラリの検索や再生中の端末の操作ができ、webhook で再生イベントを受け取ることもできます。（Free \(OSS\)）
- [Kodi / LibreELEC](https://teknium.io/hermes-devices/#kodi-libreelec) — テレビ向けのオープンソースのメディアセンター Kodi と、それを動かすための小さな OS です。Hermes は JSON-RPC で再生や画面通知を操作でき、SSH でアドオンも入れられます。（Free \(OSS\)）
- [Sonos \(SoCo\)](https://teknium.io/hermes-devices/#sonos-soco) — Sonos のスピーカーを LAN 内から操作する Python ライブラリです。Hermes は短いスクリプトで再生や音量、グループ化を操作でき、skill や小さな MCP server にまとめられます。（Free \(OSS\)）

## 部屋ごとの音声端末

- [Home Assistant Voice PE](https://teknium.io/hermes-devices/#home-assistant-voice-pe) — Home Assistant 用のローカル重視の音声スピーカーで、ファームウェアはオープンソースです。Hermes は homeassistant プラグインを通じて、このスピーカーでお知らせを読み上げられます。（~$69）
- [FutureProofHomes Satellite1](https://teknium.io/hermes-devices/#futureproofhomes-satellite1) — 音声アシスタントとスピーカー、部屋のセンサーを 1 台にまとめた組み替え可能な機器です。ESPHome で動くため、Hermes は homeassistant プラグインで操作し、センサーも読めます。（~$70 Dev Kit / ~$133 assembled）
- [reSpeaker XVF3800 \(4-mic\)](https://teknium.io/hermes-devices/#respeaker-xvf3800-4-mic) — XMOS の音声処理を載せた 4 マイクの円形アレイで、離れた声も拾えます。Hermes のホストに USB でつなぐと、Hermes の音声モードや文字起こし用のマイクとして使えます。（~$61）
- [reSpeaker Lite](https://teknium.io/hermes-devices/#respeaker-lite) — XMOS の音声処理を載せた安価な 2 マイクのボードで、自作の音声アシスタント向けです。USB マイクとしてつなげば、Hermes の音声モードにノイズの少ない音声を入れられます。（~$27）
- [Wyoming protocol](https://teknium.io/hermes-devices/#wyoming-protocol) — ローカルの音声サービス同士をつなぐ小さな通信の決まりで、Home Assistant も使っています。Hermes は Python ライブラリで LAN 内の文字起こしや音声合成のサーバーを呼べます。（Free \(OSS\)）
- [Piper TTS](https://teknium.io/hermes-devices/#piper-tts) — Raspberry Pi でも動く、手元で完結する音声合成エンジンです。Hermes の TTS provider として標準で使え、API キーなしで返信を Telegram や gadget で読み上げられます。（Free \(OSS\)）

## ローカル優先のスマートホーム

- [Shelly \(relays, meters\)](https://teknium.io/hermes-devices/#shelly-relays-meters) — 壁内リレーや電力計などのシリーズで、LAN 内の API を備えています。Hermes は Gen2 以降を RPC で操作し、機器内スクリプトも書き込めます。Gen1 は HTTP REST API で扱います。
- [Shelly Pro 3EM](https://teknium.io/hermes-devices/#shelly-pro-3em) — 分電盤に付けて家全体の電力を測る三相対応の電力計です。Hermes は RPC API や MQTT で相ごとの電力を読み、今の消費電力に答えたり、cron で日ごとの集計を作ったりできます。（~$129 \(120A version, US store\)）
- [Athom \(pre-flashed ESPHome/Tasmota/WLED plugs, bulbs, switches\)](https://teknium.io/hermes-devices/#athom-pre-flashed-esphome-tasmota-wled-plugs-bul) — ESPHome や Tasmota、WLED を書き込み済みで届くプラグやスイッチです。Hermes は Home Assistant や MQTT で操作し、ESPHome の設定を OTA で更新できます。（~$10-20 per plug）
- [Sonoff](https://teknium.io/hermes-devices/#sonoff) — ESP で動く安価なリレーやセンサー、Zigbee の USB ドングルのメーカーです。Hermes は Tasmota にした機器を MQTT で操作し、Zigbee2MQTT 経由で Zigbee 機器も扱えます。
- [Apollo Automation](https://teknium.io/hermes-devices/#apollo-automation) — ESPHome で動き、クラウドなしで使える室内センサーのシリーズです。Hermes は Home Assistant の MCP server 経由で値を読め、公開された YAML を改造して OTA で入れられます。（~$38 \(MSR-2\), ~$110+ \(AIR-1\)）
- [Everything Presence One](https://teknium.io/hermes-devices/#everything-presence-one) — ミリ波レーダーと赤外線センサーを組み合わせた在室センサーで、ESPHome で動きます。Hermes は Home Assistant 経由で在室状態を読み、YAML を編集して検知範囲を調整できます。（~$65）
- [ESPresense](https://teknium.io/hermes-devices/#espresense) — 安価な ESP32 を部屋ごとに置き、スマホやタグの BLE で居場所を推定するファームウェアです。Hermes は MQTT の topic を購読して、誰がどの部屋にいるかを把握できます。（Free \(OSS\) + ~$5-10 ESP32 per room）
- [ratgdo](https://teknium.io/hermes-devices/#ratgdo) — Chamberlain のガレージ開閉機を myQ なしで操作できるようにするオープンなボードです。Hermes は Home Assistant や MQTT で開閉でき、cron で夜に閉まっているか確かめられます。（~$62 \(ratgdo32\), ~$94 \(disco\)）
- [Konnected blaQ](https://teknium.io/hermes-devices/#konnected-blaq) — Chamberlain などのガレージ開閉機につなぐ市販のコントローラーで、ESPHome で動きます。Hermes は Home Assistant の MCP server 経由で扉や照明を読み、操作できます。（~$89）
- [Konnected \(alarm panels\)](https://teknium.io/hermes-devices/#konnected-alarm-panels) — 有線の古い警報システムの基板を置き換え、既存のセンサーをスマートホームで使えるようにします。Hermes はゾーンの状態を読み、カメラなどと突き合わせてから通知を出せます。（~$229 \(Pro 12-zone kit\)）
- [Valetudo](https://teknium.io/hermes-devices/#valetudo) — root 化したロボット掃除機のクラウドを、ローカルの Web 画面に置き換えるソフトです。Hermes は REST API や MQTT で操作でき、「台所を掃除して」を部屋の区画に対応させられます。（Free \(OSS\)）
- [OpenMower](https://teknium.io/hermes-devices/#openmower) — 安価なロボット芝刈り機の制御部をオープンなものに置き換え、RTK GPS で動かすプロジェクトです。Hermes は MQTT で開始や帰還を指示し、天気予報と cron で刈る日を決められます。
- [Thingino](https://teknium.io/hermes-devices/#thingino) — Ingenic のチップを使った安価な IP カメラ向けのオープンな Linux ファームウェアです。Hermes は動体検知の MQTT を受けてスナップショットを取り、画像モデルで通知すべきか判断できます。（Free \(OSS\)）
- [Frigate NVR](https://teknium.io/hermes-devices/#frigate-nvr) — 人や車などの物体をローカルで検出する録画サーバーです。Hermes は MQTT で検出イベントを受け、HTTP API でスナップショットやクリップを取り出して、反応を決められます。（Free \(OSS\)）
- [go2rtc](https://teknium.io/hermes-devices/#go2rtc) — さまざまな形式のカメラ映像を受けて、WebRTC や RTSP などに配り直す小さなプログラムです。Hermes は HTTP API で映像の一覧を取り、静止画を切り出して画像解析に回せます。（Free \(OSS\)）
- [Reolink \(local API, HA\)](https://teknium.io/hermes-devices/#reolink-local-api-ha) — LAN 内の API と Home Assistant の公式連携を持つ、手頃な防犯カメラのシリーズです。Hermes は Python ライブラリでライトや首振りを操作し、静止画を取得できます。
- [AirGradient](https://teknium.io/hermes-devices/#airgradient) — CO2 や PM2.5 などを測るオープンハードウェアの空気質モニターです。Hermes は LAN 内の API から JSON で測定値を取得でき、cron で定期的に読んだり、ファームウェアを改造したりできます。（~$230 assembled, ~$138 kit）
- [Ecowitt](https://teknium.io/hermes-devices/#ecowitt) — 温度や雨量、風などを測る手頃な気象観測のセンサー群で、データを自前のサーバーへ送れます。Hermes は受け口を用意するか JSON を取りに行き、予報や散水、芝刈りと組み合わせられます。（Varies \(GW2000 gateway ~$50\)）
- [OpenEVSE](https://teknium.io/hermes-devices/#openevse) — オープンソースの EV 充電器とコントローラーで、HTTP と MQTT の API を持っています。Hermes は充電電流の設定や一時停止ができ、太陽光や電気料金、予定に合わせて充電を組めます。（Varies \(controller ~$130, Wi-Fi kit ~$40\)）
- [IoTaWatt](https://teknium.io/hermes-devices/#iotawatt) — 14 回路の電力を測り、データを SD カードに貯めるオープンハードウェアの電力計です。Hermes はクエリ API で回路ごとの電力を取得し、cron で日ごとの電力レポートを作れます。（~$300-$430 depending on kit）
- [Emporia Vue on ESPHome](https://teknium.io/hermes-devices/#emporia-vue-on-esphome) — Emporia Vue の電力計に ESPHome を書き込み、クラウドなしで最大 16 回路を測れるようにする非公式ファームウェアです。Hermes は Home Assistant 経由で回路ごとの電力を読めます。（Varies \(Vue hardware\) + Free \(OSS\) firmware）
- [Victron Venus OS](https://teknium.io/hermes-devices/#victron-venus-os) — Victron の太陽光・蓄電池・インバーターをまとめて管理する Linux ベースの OS です。Hermes はローカルの MQTT から電池残量や発電量を読み、ESS モードなどの設定も変えられます。（Free \(OSS\); GX hardware varies）
- [Nuki \(developer API\)](https://teknium.io/hermes-devices/#nuki-developer-api) — 既存のシリンダーに後付けするスマートロックで、ローカルの HTTP・MQTT・Matter に対応します。Hermes は Bridge HTTP API で施錠状態の確認や施錠・解錠を行えます。
- [SwitchBot API](https://teknium.io/hermes-devices/#switchbot-api) — SwitchBot のボタン押し・カーテン・ロック・センサーなどを操作するクラウド API です。Hermes は署名付きの REST 呼び出しでコマンドを送り、webhook でイベントを受け取れます。（Free API; devices vary）
- [Philips Hue API](https://teknium.io/hermes-devices/#philips-hue-api) — Zigbee の照明やセンサーをローカルのブリッジ経由で操作する Philips Hue の API です。Hermes は CLIP v2 で照明を動かし、イベントストリームから人感センサーやスイッチに反応できます。
- [TP-Link Kasa \(python-kasa\)](https://teknium.io/hermes-devices/#tp-link-kasa-python-kasa) — TP-Link の Kasa と Tapo のプラグや電球を LAN 内で操作する Python ライブラリと CLI です。Hermes は kasa コマンドで電源の入切や消費電力の確認ができます。（Free \(OSS\); plugs vary）
- [Broadlink IR/RF blasters](https://teknium.io/hermes-devices/#broadlink-ir-rf-blasters) — 赤外線や RF のリモコン信号を学習して再送し、古い家電を自動化する機器です。Hermes は python-broadlink で信号を記録し、部屋や家電ごとのコード集から送り分けられます。

## 制御の中核

- [Home Assistant MCP Server](https://teknium.io/hermes-devices/#home-assistant-mcp-server) — Home Assistant を MCP サーバーとして公開する公式の連携機能です。hermes mcp add で一度登録すると、公開を許可した照明・ロック・センサーが Hermes のツールになります。（Free \(OSS\)）
- [Home Assistant Green](https://teknium.io/hermes-devices/#home-assistant-green) — Home Assistant OS を入れた状態で届く公式のハブ機です。Hermes は MCP サーバーや REST API で家を操作し、SSH 経由で設定の編集やバックアップの取得も行えます。（~$199）
- [Home Assistant Yellow](https://teknium.io/hermes-devices/#home-assistant-yellow) — Zigbee・Thread の無線を内蔵した、CM4 を載せる Home Assistant 用ボードです。Hermes は USB ドングルなしで Zigbee や Thread のメッシュを管理できます。
- [HA Connect ZBT-2](https://teknium.io/hermes-devices/#ha-connect-zbt-2) — Zigbee か Thread に使う公式の USB アダプターの第 2 世代です。Hermes は直接触らず、Home Assistant の MCP サーバーや Zigbee2MQTT 経由で機器を動かします。（~$49）
- [HA Connect ZWA-2](https://teknium.io/hermes-devices/#ha-connect-zwa-2) — Z-Wave 800 と Long Range に対応した公式の USB アダプターです。Hermes は Home Assistant や Z-Wave JS UI を通じて、ノードの追加や状態確認を行えます。（~$69）
- [SMLIGHT SLZB-06](https://teknium.io/hermes-devices/#smlight-slzb-06) — PoE 給電で LAN のどこにでも置ける Zigbee コーディネーターです。Hermes は Zigbee2MQTT の MQTT や Home Assistant の MCP サーバー経由で機器を操作します。
- [ESPHome](https://teknium.io/hermes-devices/#esphome) — YAML で機器を記述するとファームウェアを生成し、Wi-Fi 越しに書き込める仕組みです。Hermes は YAML の下書きから検証・コンパイル・OTA 書き込み・ログ確認までターミナルで進められます。（Free \(OSS\)）
- [Tasmota](https://teknium.io/hermes-devices/#tasmota) — ESP 系のスマートプラグなどをクラウドから切り離すオープンなファームウェアです。Hermes は MQTT や HTTP で操作し、GPIO テンプレートやタイマーも書き込み直さずに変えられます。（Free \(OSS\)）
- [Zigbee2MQTT](https://teknium.io/hermes-devices/#zigbee2mqtt) — Zigbee 機器を MQTT のトピックとして扱えるようにするブリッジです。Hermes は MQTT クライアントとして機器の操作や状態の購読、ペアリングの許可や改名まで行えます。（Free \(OSS\)）
- [Z-Wave JS UI](https://teknium.io/hermes-devices/#z-wave-js-ui) — Z-Wave ネットワークを直接管理する Web アプリで、MQTT ゲートウェイも兼ねます。Hermes は MQTT で Z-Wave 機器を動かし、cron でノードの健全性確認やバックアップを回せます。（Free \(OSS\)）
- [python-matter-server](https://teknium.io/hermes-devices/#python-matter-server) — Home Assistant の Matter 連携を支えてきた Matter コントローラーです。開発は終了しており、Hermes は互換 API を持つ後継の matterjs-server を使えます。（Free \(OSS\)）
- [OpenThread](https://teknium.io/hermes-devices/#openthread) — Google が公開した、Matter のメッシュを支える Thread の実装です。Hermes は OTBR の REST API や SSH の ot-ctl で、ボーダールーターの状態を確認できます。（Free \(OSS\)）
- [Mosquitto \(MQTT broker\)](https://teknium.io/hermes-devices/#mosquitto-mqtt-broker) — Raspberry Pi でも動く軽量な MQTT ブローカーです。Hermes にとってはイベントの通り道で、mosquitto\_pub でコマンドを送り、特定のトピックで Hermes を起こす使い方ができます。（Free \(OSS\)）
- [Node-RED](https://teknium.io/hermes-devices/#node-red) — ブラウザ上でノードをつないで処理の流れを作るツールです。Hermes はフローの JSON を作って Admin HTTP API で反映でき、逆に Node-RED から Hermes を起動もできます。（Free \(OSS\)）
- [openHAB \(alternative hub\)](https://teknium.io/hermes-devices/#openhab-alternative-hub) — 400 を超える技術とつながる、メーカーに依存しない Java 製のホームオートメーション基盤です。Hermes は REST API で item を操作し、ルールや Things の定義もテキストで書けます。（Free \(OSS\)）

## ネットワーク

- [OpenWrt One](https://teknium.io/hermes-devices/#openwrt-one) — OpenWrt プロジェクト自身が設計した、文鎮化しにくい Wi-Fi 6 ルーターです。Hermes は SSH や ubus JSON-RPC で管理でき、シリアルコンソールから復旧もできます。（~$89）
- [Banana Pi BPI-R4](https://teknium.io/hermes-devices/#banana-pi-bpi-r4) — 10G SFP+ を 2 口持つルーター開発ボードです。Hermes は OpenWrt と同じく SSH や ubus で管理でき、ルーター上で MCP サーバーや補助のコンテナも動かせます。
- [Turris Omnia NG](https://teknium.io/hermes-devices/#turris-omnia-ng) — CZ.NIC が作る、Wi-Fi 7 と 10G を備えたオープンソースのセキュリティルーターです。Hermes は SSH で管理し、脅威情報やメトリクスを cron で集めてチャットに要約できます。（~$550-650 \(EUR 538 incl. VAT\)）
- [GL.iNet Flint 2 \(MT6000\)](https://teknium.io/hermes-devices/#gl-inet-flint-2-mt6000) — OpenWrt を土台にした Wi-Fi 6 の家庭用ルーターです。Hermes は JSON-RPC や SSH で操作でき、内蔵の AdGuard Home の API から DNS の統計も読めます。（~$170）
- [GL.iNet Slate 7 \(BE3600\)](https://teknium.io/hermes-devices/#gl-inet-slate-7-be3600) — タッチ画面付きで持ち歩ける Wi-Fi 7 のトラベルルーターです。Tailscale と組み合わせると、Hermes の cron が旅先の回線品質や VPN の状態をどこからでも見守れます。（~$160）
- [OpenWrt](https://teknium.io/hermes-devices/#openwrt) — ルーターを本格的な Linux 機に変えるディストリビューションです。Hermes は SSH の uci や ubus で設定を変え、固定リースの追加などの定型作業を skill にできます。（Free \(OSS\)）
- [MikroTik + REST API](https://teknium.io/hermes-devices/#mikrotik-rest-api) — RouterOS 7 のコンソール操作を包んだ REST API です。Hermes は curl や Python で呼び出し、DHCP リース一覧などの操作を skill や MCP サーバーにできます。
- [OPNsense + API](https://teknium.io/hermes-devices/#opnsense-api) — Web 画面が自身の API の上に作られている FreeBSD ベースのファイアウォールです。Hermes は ACL で範囲を絞った鍵で API を呼び、ルールの切り替えや状態確認を変更の確認付きで行えます。（Free \(OSS\)）
- [Protectli](https://teknium.io/hermes-devices/#protectli) — オープンソースのファイアウォール向けに作られたファンレスの x86 小型 PC です。Hermes は載せた OPNsense や Proxmox を操作でき、Hermes 自体をこの機械で常時動かす使い方もあります。
- [UniFi](https://teknium.io/hermes-devices/#unifi) — Ubiquiti の、ゲートウェイやスイッチ、アクセスポイントを一元管理するネットワーク製品群です。Hermes は公式の Integration API で機器やクライアントを確認し、AP の再起動などを行えます。
- [Pi-hole](https://teknium.io/hermes-devices/#pi-hole) — LAN 全体の広告やトラッカーを DNS で遮断する仕組みです。Hermes は v6 の REST API で問い合わせの統計を読み、遮断の切り替えやリストの管理を行えます。（Free \(OSS\)）
- [AdGuard Home](https://teknium.io/hermes-devices/#adguard-home) — 暗号化 DNS に対応した、単一バイナリの DNS 広告ブロッカーです。Hermes は REST API で統計やログを読み、フィルターを編集できます。GL.iNet ルーターの内蔵版にも同じ skill が使えます。（Free \(OSS\)）
- [Tailscale](https://teknium.io/hermes-devices/#tailscale) — WireGuard を使ったメッシュ VPN で、離れた機器同士をつなぎます。gateway と機器を同じ tailnet に入れると、Hermes はポート開放なしで SSH や API に届きます。（Free personal tier）
- [NetBox](https://teknium.io/hermes-devices/#netbox) — IP・ポート・ラック・ケーブルを管理するネットワークの台帳です。Hermes は公式の netbox-mcp-server で照会でき、変更時は webhook で Hermes を起動できます。（Free \(OSS\)）
- [Network UPS Tools](https://teknium.io/hermes-devices/#network-ups-tools) — 多くのメーカーの UPS を共通の仕組みで監視・管理するソフト群です。Hermes は cron で電池残量や停電中かどうかを確認し、停電時は通知と順序立てたシャットダウンを行えます。（Free \(OSS\)）
- [Proxmox](https://teknium.io/hermes-devices/#proxmox) — Debian 上で仮想マシンとコンテナを動かすオープンソースのハイパーバイザーです。Hermes は API トークンで REST API を呼び、ゲストの起動・停止・複製・スナップショットを扱えます。（Free \(OSS\)）
- [TrueNAS](https://teknium.io/hermes-devices/#truenas) — ZFS を土台に、アプリや仮想マシンも動かせる NAS 用の OS です。Hermes は WebSocket の API で操作し、cron でプールの健全性を確認してチャットに報告できます。（Free \(OSS\)）

## 遠隔操作（IP-KVM）

- [PiKVM + HTTP API](https://teknium.io/hermes-devices/#pikvm-http-api) — PC の画面と入力を BIOS から遠隔操作できるオープンソースの KVM です。Hermes は HTTP API で電源を入れ、画面を OCR で読み、OS の再インストールまで進められます。（~$270-$385）
- [JetKVM](https://teknium.io/hermes-devices/#jetkvm) — タッチ画面付きで手のひらサイズの、安価なオープンソースの KVM です。Hermes はコミュニティのクライアントや開発者モードの SSH で操作し、画面を読んでキー入力やクリックを行えます。（~$100）
- [Sipeed NanoKVM](https://teknium.io/hermes-devices/#sipeed-nanokvm) — RISC-V を使った低価格の IP-KVM のシリーズです。Hermes は REST API と WebSocket で電源の入れ直しやキー入力、画面の取得を行え、端末上にスクリプトを置くこともできます。（~$35-$70 \(Cube; Pro costs more\)）
- [GL.iNet Comet \(GL-RM1\)](https://teknium.io/hermes-devices/#gl-inet-comet-gl-rm1) — Tailscale を内蔵した 4K 対応のリモート KVM です。PiKVM 由来のソフトで動くため、Hermes は PiKVM と同じ形の HTTP API で画面の取得や入力、電源操作をおおむね行えます。（~$100）

## 3D プリンター

- [Klipper](https://teknium.io/hermes-devices/#klipper) — 計算をホストの小型 PC に任せる 3D プリンター用のファームウェアです。Hermes は Moonraker の API 経由で G-code を送り、SSH で設定やマクロの編集もできます。（Free \(OSS\)）
- [Moonraker \(Klipper's API\)](https://teknium.io/hermes-devices/#moonraker-klipper-s-api) — Klipper を HTTP と WebSocket から操作できるようにする API サーバーです。Hermes が Klipper 機を扱う主な窓口で、cron で印刷を見守り Telegram などに報告できます。（Free \(OSS\)）
- [Mainsail / Fluidd](https://teknium.io/hermes-devices/#mainsail-fluidd) — Klipper 用の代表的なオープンソースの Web ダッシュボード 2 種です。人は画面で状況を見て、Hermes は同じ Moonraker の API で裏の自動化を担う分担になります。（Free \(OSS\)）
- [Moonraker HA integration](https://teknium.io/hermes-devices/#moonraker-ha-integration) — Klipper のプリンターを Home Assistant のエンティティとして取り込む連携機能で、現在はメンテナーを募集中です。Hermes は HA の API や MCP サーバーで家の機器と一緒に扱えます。（Free \(OSS\)）
- [Voron](https://teknium.io/hermes-devices/#voron) — 自分で組み立てるオープンソースの CoreXY プリンターのシリーズです。どれも Klipper で動くため Hermes は Moonraker で操作でき、組み立て中の部品表づくりや調整の手順も手伝えます。
- [Sovol SV08](https://teknium.io/hermes-devices/#sovol-sv08) — Voron 2.4 風の組み立て済み CoreXY プリンターで、素の Klipper が動きます。Hermes は LAN の Moonraker でクラウドを通さず印刷を始め、SSH で設定の調整もできます。（~$500-600）
- [Rat Rig](https://teknium.io/hermes-devices/#rat-rig) — 後から拡張できる大型の DIY プリンターキットのメーカーです。Klipper ベースの RatOS で動き、Hermes は Moonraker 経由で IDEX 用のマクロも操作できます。
- [BigTreeTech CB1](https://teknium.io/hermes-devices/#bigtreetech-cb1) — Klipper のホスト向けの、Raspberry Pi CM4 互換の安価なモジュールです。Hermes は SSH で Klipper 一式を入れ、軽い gateway や cron の実行役も置けます。
- [Prusa CORE One](https://teknium.io/hermes-devices/#prusa-core-one) — 庫内を加熱できる Prusa の密閉型 CoreXY プリンターです。Hermes は PrusaLink のローカル HTTP API で G-code を送り、印刷の開始・停止や状態の確認をクラウドなしで行えます。（~$925 kit / ~$1,200 assembled \(CORE One+\)）
- [Bambu Developer Mode](https://teknium.io/hermes-devices/#bambu-developer-mode) — Bambu Lab のプリンターで、ローカルの MQTT・映像・FTP を開く設定です。有効にすると Hermes は Python の skill からオフラインで状態の購読、コマンド送信、ファイル転送を行えます。（Free \(firmware feature\)）
- [ha-bambulab](https://teknium.io/hermes-devices/#ha-bambulab) — Bambu Lab のプリンターを Home Assistant に詳しく取り込む連携機能です。Hermes は HA の API や MCP サーバー経由で、家の他の機器と一緒に状態を扱えます。（Free \(OSS\)）
- [Bambu Lab H2D](https://teknium.io/hermes-devices/#bambu-lab-h2d) — 2 つのノズルを持ち、レーザー加工やカット、ペン描画もこなすプリンターです。Hermes は Developer Mode を有効にして、ローカルの MQTT やカメラで操作と監視を行えます。（From ~$1,899）
- [Elegoo Centauri Carbon](https://teknium.io/hermes-devices/#elegoo-centauri-carbon) — 低価格の密閉型 CoreXY プリンターで、コミュニティ製の Home Assistant 連携があります。Hermes は HA 経由か SDCP で状態確認や一時停止、カメラ画像の取得を行えます。（~$300）
- [OctoPrint](https://teknium.io/hermes-devices/#octoprint) — USB で 3D プリンターにつなぐ、古くからあるオープンソースの Web ホストです。Hermes は REST API でファイル転送や印刷開始、温度の確認ができ、MQTT プラグインでイベントも受けられます。（Free \(OSS\)）
- [Obico \(AI failure detect\)](https://teknium.io/hermes-devices/#obico-ai-failure-detect) — Web カメラの映像から印刷の失敗を見つける、オープンソースの AI 検知と遠隔アクセスの仕組みです。Hermes は自前のサーバーを立て、失敗の通知を受けてプリンターの中断や再開を判断できます。（Free self-hosted / paid cloud tiers）
- [Spoolman](https://teknium.io/hermes-devices/#spoolman) — フィラメントのスプールの残量を自動で追う、自前で動かす在庫管理サービスです。Hermes は REST API か spoolman-mcp で在庫を扱い、印刷前に装着中のスプールの残りを確認できます。（Free \(OSS\)）

## CNC・レーザー・プロッター・部品実装機

- [Makera Carvera / Carvera Air](https://teknium.io/hermes-devices/#makera-carvera-carvera-air) — 密閉型の卓上 CNC フライスで、Carvera は自動工具交換、Carvera Air は手動補助式の工具交換に対応します。Hermes は G-code の生成・点検・送信や加工状況の通知を行えます。（~$5,300-5,800 \(Carvera\); ~$2,300-2,700 \(Air\)）
- [grblHAL](https://teknium.io/hermes-devices/#grblhal) — 32 ビットのマイコン向けに Grbl を作り直した CNC ファームウェアです。Hermes は Grbl のシリアルプロトコルで操作し、設定のバックアップや G-code の事前検証を skill にできます。（Free \(OSS\)）
- [FluidNC](https://teknium.io/hermes-devices/#fluidnc) — YAML で機械を記述し、Wi-Fi で操作する ESP32 用の CNC ファームウェアです。Hermes は Telnet や WebSocket で操作し、同梱の MCP サーバーで設定を検証できます。（Free \(OSS\)）
- [gSender](https://teknium.io/hermes-devices/#gsender) — grbl・grblHAL の CNC 向けの、無料で扱いやすい G-code 送信ソフトです。自動化用の API がないため、Hermes は G-code の生成と点検を担い、開始ボタンは人が押す分担になります。（Free \(OSS\)）
- [LightBurn](https://teknium.io/hermes-devices/#lightburn) — 趣味から業務まで使われるレーザー加工機の設計・制御ソフトです。自動化 API がないため、Hermes は出力や速度を設定済みのデザインやプロジェクトファイルを作り、人が確認して送ります。（$99 \(Core\) / $199 \(Pro\)）
- [LaserGRBL](https://teknium.io/hermes-devices/#lasergrbl) — GRBL のレーザー彫刻機向けの、無料でオープンソースの Windows 用送信ソフトです。Hermes は前処理済みの画像や G-code を渡すほか、カスタムボタンに位置合わせや焦点確認のマクロを入れられます。（Free \(OSS\)）
- [Sculpfun](https://teknium.io/hermes-devices/#sculpfun) — GRBL で動く低価格のダイオード・ファイバー・UV レーザー機のメーカーです。Hermes は USB シリアル経由で Python から G-code を直接送り、スマートプラグでの安全対策や完了通知も担えます。
- [AxiDraw + Python API](https://teknium.io/hermes-devices/#axidraw-python-api) — Python API を持つペンプロッターで、ロボットに手書きさせられます。Hermes は pyaxidraw で自作の SVG を描かせたり、一筆書きのフォントで手紙やカードを書かせたりできます。（~$475+）
- [Opulo LumenPnP](https://teknium.io/hermes-devices/#opulo-lumenpnp) — 自宅で基板に部品を実装できる、オープンソースの卓上ピックアンドプレース機です。Hermes は KiCad から配置ファイルを書き出し、部品表をフィーダーに割り当てて OpenPnP のジョブを作れます。（~$1,995）
- [OpenFlexure Microscope](https://teknium.io/hermes-devices/#openflexure-microscope) — 3D プリントで作る電動の実験用顕微鏡で、HTTP からスクリプトで操作できます。Hermes は Python クライアントでステージの移動やオートフォーカス、撮影を行い、定期的なスライドの走査も組めます。
- [Opentrons Flex](https://teknium.io/hermes-devices/#opentrons-flex) — Python で手順を書く、実験室向けの液体分注ロボットです。Hermes はプロトコルを書いてローカルでシミュレーションし、HTTP API でロボットにアップロードして実行を始められます。（From ~$26,400）

## 基板とチップの製作

- [KiCad](https://teknium.io/hermes-devices/#kicad) — 回路図から製造データまで扱えるオープンソースの基板設計ソフトです。Hermes は kicad-cli で DRC や Gerber の書き出しを無人で行え、MCP サーバーを足せば回路図の読み取りや部品配置もできます。（Free \(OSS\)）
- [JLCPCB](https://teknium.io/hermes-devices/#jlcpcb) — 低価格で早い基板製造と実装を API 付きで提供する深圳のメーカーです。Hermes は kicad-cli で JLCPCB 形式の製造データを書き出し、申請制の API で見積もりや注文、追跡を行えます。（Varies \(PCBs from ~$2\)）
- [PCBWay](https://teknium.io/hermes-devices/#pcbway) — 基板製造や実装、CNC、3D プリントを扱い、KiCad から 1 クリックで注文できる深圳のメーカーです。Hermes は製造データ一式を作って検証し、注文の確定は人が行う分担が一般的です。
- [LCSC](https://teknium.io/hermes-devices/#lcsc) — JLCPCB の実装に部品を供給する、品揃えの多い電子部品の商社です。Hermes は Open API で部品を探し、easyeda2kicad でシンボルなどを KiCad に取り込めます。
- [Tiny Tapeout](https://teknium.io/hermes-devices/#tiny-tapeout) — 自分の設計を、共有の製造便に相乗りして安く実際のチップにできる取り組みです。流れが Git ベースなので、Hermes は Verilog を書いてシミュレーションし、GitHub Action の失敗まで直せます。

## 計測器

- [PyVISA](https://teknium.io/hermes-devices/#pyvisa) — ほとんどの計測器を 1 つの Python API で操作できるパッケージです。Hermes は PyVISA のスクリプトで SCPI 機器を動かし、小さな MCP サーバーにすれば電圧設定などがツールになります。（Free \(OSS\)）
- [Rigol](https://teknium.io/hermes-devices/#rigol) — 手頃なオシロスコープや電源、テスターを作るメーカーで、SCPI で操作できます。Hermes は PyVISA などで時間軸やトリガーを設定し、波形データや画面を取得できます。（Varies \(DHO804 scope ~$400-460\)）
- [Siglent](https://teknium.io/hermes-devices/#siglent) — USB と LAN で SCPI 操作できる、手頃な計測器のメーカーです。Hermes は Python や PyVISA で SCPI を送り、機種ごとの注意点を skill にまとめられます。
- [RD6006 bench PSU \(Python\)](https://teknium.io/hermes-devices/#rd6006-bench-psu-python) — Python から操作できる、安価な 60 V・6 A のプログラマブル電源です。Hermes はシリアル経由で出力を設定して測定値を記録し、長時間の試験を cron で見守れます。（~$100-200 \(module vs. complete unit\)）
- [sigrok](https://teknium.io/hermes-devices/#sigrok) — ロジックアナライザーやオシロスコープ、テスターに対応したオープンソースの信号解析ソフト群です。Hermes は sigrok-cli で取り込みとプロトコル解読を行い、解読結果を読んで考察できます。（Free \(OSS\)）
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

## 無線・SDR・メッシュ

- [HackRF One / HackRF Pro](https://teknium.io/hermes-devices/#hackrf-one-hackrf-pro) — HackRF One / Pro は 1MHz〜6GHz をカバーするオープンソースの SDR です。Hermes は端末の hackrf\_sweep などや Python で動かし、numpy でキャプチャを解析できます。（~$330 \(One\); ~$400 \(Pro\)）
- [RTL-SDR Blog V4](https://teknium.io/hermes-devices/#rtl-sdr-blog-v4) — RTL-SDR Blog V4 は約 500kHz〜1.766GHz を受信する安価な SDR ドングルです。Hermes は rtl\_fm や rtl\_power を端末から動かし、cron で常時の受信拠点にもできます。（~$30-40）
- [KrakenSDR](https://teknium.io/hermes-devices/#krakensdr) — KrakenSDR は 5 チャンネルの位相コヒーレントな SDR で、電波の方向探知に使えます。Hermes は DSP ソフトの Web インターフェースと方位出力に接続し、方位を時系列で記録できます。（~$775 \(plus antennas\)）
- [rtl\_433](https://teknium.io/hermes-devices/#rtl-433) — rtl\_433 は ISM 帯の無線センサーを JSON や MQTT に復号する受信ソフトです。サービスとして動かせば、Hermes はトピックを購読して周囲のセンサーの状態を把握し、動作のきっかけにできます。（Free \(OSS\)）
- [readsb + FlightAware stick](https://teknium.io/hermes-devices/#readsb-flightaware-stick) — readsb は 1090MHz の航空機トランスポンダを受信する ADS-B デコーダで、FlightAware のスティックと組みます。Hermes は aircraft.json を読んで上空の機体を把握できます。（~$37-46 \(stick\); readsb Free \(OSS\)）
- [GNU Radio](https://teknium.io/hermes-devices/#gnu-radio) — GNU Radio は信号処理ブロックからソフトウェア無線を組むオープンソースのツールキットです。フローグラフは Python に変換されるので、Hermes は端末で書いて編集し、実行できます。（Free \(OSS\)）
- [Universal Radio Hacker](https://teknium.io/hermes-devices/#universal-radio-hacker) — Universal Radio Hacker \(URH\) は無線プロトコルを調べる Python/Qt のツールで、多くの SDR に対応します。コマンドライン版があるので、Hermes はキャプチャや復調をスクリプト化できます。（Free \(OSS\)）
- [Meshtastic Python CLI](https://teknium.io/hermes-devices/#meshtastic-python-cli) — Meshtastic の Python パッケージは、LoRa メッシュのノードを USB や BLE で操作する CLI とライブラリです。Hermes は端末から送受信し、メッシュをチャット経路にできます。（Free \(OSS\)）
- [RAK Meshtastic kit](https://teknium.io/hermes-devices/#rak-meshtastic-kit) — RAKwireless の WisBlock Meshtastic キットは、nRF52840 と SX1262 を組んだモジュール式の LoRa ノードです。Hermes は meshtastic の CLI で操作し、テレメトリを読めます。（~$25-61）
- [Heltec WiFi LoRa 32 V3](https://teknium.io/hermes-devices/#heltec-wifi-lora-32-v3) — Heltec WiFi LoRa 32 V3 は ESP32-S3 に LoRa と OLED を載せた安価なボードで、Meshtastic でよく使われます。Hermes は端末から書き込み、Meshtastic のライブラリで操作できます。（~$18-20）
- [SenseCAP T1000-E](https://teknium.io/hermes-devices/#sensecap-t1000-e) — Seeed の SenseCAP T1000-E は Meshtastic が動く、カード大で防水の GPS トラッカーです。Hermes は meshtastic ライブラリや MQTT で位置やテレメトリを受け取れます。（~$40）
- [MeshCore](https://teknium.io/hermes-devices/#meshcore) — MeshCore は専用の中継・ルームサーバーで経路を担う、軽量な LoRa メッシュのファームです。Hermes は meshcore の Python ライブラリや CLI で BLE/USB 経由で送受信できます。（Free \(OSS\)）
- [Reticulum](https://teknium.io/hermes-devices/#reticulum) — Reticulum は LoRa やパケット無線、Wi-Fi 上で動く暗号化ネットワークスタックです。Hermes は rnsd を動かし、Python API で自分の LXMF アドレスを持つエージェントになれます。（Free \(OSS\)）

## 家の防犯と見守り

- [Konnected Pro Alarm Panel](https://teknium.io/hermes-devices/#konnected-pro-alarm) — Konnected Alarm Panel Pro は、既存の有線警報を PoE でネットにつなぐ 12 ゾーンの基板です。Hermes は Home Assistant か MQTT で各ゾーンの状態を読み、制御できます。（~$229）
- [ESPHome Alarm Control Panel](https://teknium.io/hermes-devices/#esphome-alarm-control-panel) — ESPHome の alarm\_control\_panel は、ESP32 を YAML だけで警報パネルにするコンポーネントです。Hermes は Home Assistant のエンティティ経由で状態を読み、作動や解除ができます。（Free \(OSS\)）
- [Reolink Video Doorbell \(local\)](https://teknium.io/hermes-devices/#reolink-doorbell-local) — Reolink の PoE/Wi-Fi ドアベルは、RTSP でストリーミングし、動体や人の検知をローカル HTTP API で返します。Hermes は reolink\_aio で映像を取り、検知を読めます。
- [UniFi Protect](https://teknium.io/hermes-devices/#unifi-protect-api) — UniFi Protect は Ubiquiti の自己ホスト型 NVR で、人や車の検知をローカルで記録します。Hermes は uiprotect で WebSocket の検知を購読し、REST でスナップショットを取れます。
- [Amcrest / Dahua IP cams](https://teknium.io/hermes-devices/#amcrest-dahua-api) — Amcrest と Dahua の IP カメラは、PTZ やスナップショット、動体イベントを扱う CGI/HTTP API を共有します。Hermes は python-amcrest でローカル越しに操作できます。
- [docker-wyze-bridge](https://teknium.io/hermes-devices/#wyze-docker-wyze-bridge) — docker-wyze-bridge は、多くの Wyze カメラからローカルの RTSP や HLS ストリームを作る橋渡しです。Hermes はそのストリームを Frigate などのローカル NVR と組んで検知に使えます。（Free \(OSS\)）
- [Aqara Camera Hub G5 Pro](https://teknium.io/hermes-devices/#aqara-g5-pro) — Aqara Camera Hub G5 Pro は屋外カメラであり、Zigbee と Thread のハブも兼ねます。Hermes は主に Home Assistant と Matter でイベントや映像にアクセスできます。
- [Shelly BLU Motion / Door-Window](https://teknium.io/hermes-devices/#shelly-blu-motion) — Shelly BLU Motion / Door/Window は、動体や開閉を BLE で知らせる電池式センサーです。ゲートウェイが MQTT に中継し、Hermes はトピックを購読してイベントを受け取れます。
- [frient \(Develco\) Z sensors](https://teknium.io/hermes-devices/#frient-sensors) — frient は人感や煙、漏水、開閉などの Zigbee セキュリティ機器を一通り揃えるブランドです。Hermes は Zigbee2MQTT に組み込んで各センサーを読み、サイレンを鳴らせます。
- [Zigbee sirens &amp; keypads](https://teknium.io/hermes-devices/#sonoff-sa-003-siren) — Zigbee2MQTT 対応のサイレンやストロボ、警戒設定・解除用キーパッドの総称です。Hermes は MQTT 経由でサイレンを鳴らし、キーパッドの警戒設定・解除や PIN のイベントを読み取れます。
- [Smart deadbolts \(Matter/Z-Wave\)](https://teknium.io/hermes-devices/#schlage-encode-matter) — Schlage や Yale のスマートデッドボルトは、施錠・解錠と利用者ごとの暗証番号を Z-Wave や Matter で扱えます。Hermes はそれらで操作し、PIN を登録・失効できます。
- [2N IP Intercom \(HTTP API\)](https://teknium.io/hermes-devices/#2n-intercom-api) — 2N の IP インターコムは、ドアの解錠やドアベルのイベント、通話制御を扱う HTTP API を備えた業務用のドア機です。Hermes は API でドアのリレーを開き、イベントを読んでスナップショットを取れます。
- [Hikvision ISAPI](https://teknium.io/hermes-devices/#hikvision-isapi) — ISAPI は Hikvision のカメラや NVR が持つ HTTP+XML/JSON の REST インターフェースです。Hermes は検知ルールを設定し、alertStream でイベントを即時に受け取れます。

## ポケット Linux とサイバーデッキ

- [ClockworkPi uConsole](https://teknium.io/hermes-devices/#clockworkpi-uconsole) — ClockworkPi uConsole は、Raspberry Pi CM4 などを差し替えて使うモジュール式の携帯 Linux 端末です。Hermes Agent は Wi-Fi 越しに SSH し、現場のノードとして扱えます。（~$139）
- [Clockwork DevTerm](https://teknium.io/hermes-devices/#clockwork-devterm) — Clockwork DevTerm はモジュール式の携帯 Linux 端末です。Hermes は SSH でジョブを実行し、オプションの58mmサーマルプリンターを装着すれば、CUPS 経由で結果やログを印刷できます。（~$219）
- [MNT Pocket Reform](https://teknium.io/hermes-devices/#mnt-pocket-reform) — MNT Pocket Reform は、メインライン Linux が動くオープンハードの 7 インチ小型ノートです。Hermes Agent は他の機械と同じように SSH し、ローカルのビルドやエージェントを走らせられます。（~$500）
- [Beepy \(SQFMI\)](https://teknium.io/hermes-devices/#beepy-sqfmi) — Beepy は BlackBerry 風キーボードと省電力の Sharp メモリ液晶を組んだ手のひら大のボードで、Pi Zero W で動かします。Hermes Agent は SSH で動き、液晶や LED を操作できます。（~$79）
- [Raspberry Pi 500+](https://teknium.io/hermes-devices/#raspberry-pi-500) — Raspberry Pi 500+ は、Pi 5 と NVMe SSD をメカニカルキーボードに収めた一体機です。Hermes Agent は SSH で入り、実ストレージを持つデスクトップ級のノードとして使えます。（~$200）

## 工房の運用

- [InvenTree](https://teknium.io/hermes-devices/#inventree) — InvenTree は部品や在庫場所、仕入先、BOM を管理する Django 製の在庫システムです。Hermes は REST API や inventree パッケージで部品を調べ、組み立てに合わせて数量を減らせます。（Free \(OSS\)）
- [HomeBox](https://teknium.io/hermes-devices/#homebox) — Homebox は、写真やシリアル番号、保証を持つ品物を場所やラベルで整理する自己ホスト型の在庫アプリです。Hermes は REST API で品物の追加・検索・移動ができ、物の在りかにも答えられます。（Free \(OSS\)）
- [brother\_ql](https://teknium.io/hermes-devices/#brother-ql) — brother\_ql は Brother QL ラベルプリンタの raster 言語を実装した、ドライバ不要の Python パッケージと CLI です。Hermes は Pillow で画像を作り、USB やネットワークで印刷できます。（Free \(OSS\)）
- [python-escpos](https://teknium.io/hermes-devices/#python-escpos) — python-escpos は Epson の ESC/POS に対応するサーマルレシートプリンタを操作する Python ライブラリです。Hermes は日次のまとめや予定を整えて印刷でき、cron で朝の要約を出せます。（Free \(OSS\)）

## さらに探すには

- [Crowd Supply](https://teknium.io/hermes-devices/#crowd-supply) — Crowd Supply は、独自のオープンハードを扱うクラウドファンディングと物販のプラットフォームです。公式 API は不要で、Hermes は閲覧ページや更新フィードを見て、関心に合う新しい企画を要約できます。
- [Tindie](https://teknium.io/hermes-devices/#tindie) — Tindie は、個人のメイカーが基板やキット、センサーを売るオンラインのマーケットです。Hermes は出品を検索して気になる売り手や製品を追い、届いた後はその機器を手持ちの経路で動かせます。
- [Adafruit / SparkFun / Seeed / Pimoroni](https://teknium.io/hermes-devices/#adafruit-sparkfun-seeed-pimoroni) — Adafruit、SparkFun、Seeed、Pimoroni は、チュートリアルと公開ライブラリ付きで基板やセンサーを売る大手 4 社です。Hermes はガイドを読み、配線からコードまで用意できます。
- [Hackster](https://teknium.io/hermes-devices/#hackster) — Hackster は、数万件のオープンハードのプロジェクトが集まる開発者コミュニティです。Hermes はプロジェクトを検索して出発点として要約し、手持ちの部品に合わせてコードや配線を直せます。（Free）
- [OSHWA certified projects](https://teknium.io/hermes-devices/#oshwa-certified-projects) — OSHWA は、ハードとソフト、文書が open-source の定義を満たすかを検証する認証を運営します。読み書きできる REST の認証 API があり、Hermes は認証済みプロジェクトをプログラムから検索できます。（Free）
- [OpenHardware.io](https://teknium.io/hermes-devices/#openhardware-io) — OpenHardware.io は、ビルド手順や製造ファイル付きでオープンハードの設計を共有するサイトで、MySensors と縁が深いです。Hermes は設計を見てファイルを取り、手持ちのセンサー向けに直せます。（Free）
- [Thingiverse / Printables](https://teknium.io/hermes-devices/#thingiverse-printables) — Thingiverse と Printables は、無料の 3D プリント用モデルを集めた二大ライブラリです。Hermes は基板の寸法に合う筐体を探して STL を取り、スライサーやプリンタの API に渡せます。（Free）

## ファームウェアとエージェントのプロジェクト

- [Hermes Gadget SDK](https://teknium.io/hermes-devices/#hermes-gadget-sdk) — Hermes Gadget SDK は、ESP32-S3 の表示ボードをボタンで話す Hermes 端末にする MIT ライセンスの SDK です。各機器が WebSocket ハブ上の DM チャットになり、承認や TTS も動きます。（Free \(OSS\)）
- [Hermes Familiar](https://teknium.io/hermes-devices/#hermes-familiar) — Hermes Familiar は、Waveshare の ESP32-S3 タッチ液晶で作る Hermes の卓上の相棒で、状態やメッセージを見せます。危険なコマンドの承認が画面に出て、タップで許可・拒否できます。（Free \(OSS\)）
- [ESP-Hermes channel](https://teknium.io/hermes-devices/#esp-hermes-channel) — M5Stack の ESP32-S3 を音声・IO クライアントにする、開発中の gateway プラグインです。Python 側のアダプタとハブは実装・試験済みで、実機側の ESP-IDF ファームウェアはまだ草案です。（Free \(OSS\)）
- [Caduceus robot](https://teknium.io/hermes-devices/#caduceus-robot) — Caduceus は、ESP32 とサーボで歩いて手を振る発泡ボードのロボットで、ハッカソン向けに単独で作られました。stdio の MCP サーバーが wave\_hand などを公開し、Hermes は会話からツールを選んで動かします。（Free \(OSS\)）
- [hermes32](https://teknium.io/hermes-devices/#hermes32) — Hermes32 は、Hermes Agent 向けの携帯ボイスレコーダー兼トランシーバーを目指す進行中のプロジェクトです。Hermes ホスト上の bridge が音声を受けて stt で書き起こし、Hermes に渡します。（Free \(OSS\)）
- [hermes-agent-iot](https://teknium.io/hermes-devices/#hermes-agent-iot) — hermes-agent-iot は、Raspberry Pi 2 など 1GB 級の ARM 向けに公開された Hermes Agent のコミュニティ fork です。pip で入れて設定すれば、cron や skill を動かすノードになります。（Free \(OSS\)）
- [hermes-gadget \(GitHub\)](https://teknium.io/hermes-devices/#hermes-gadget-github) — hermes-gadget は、LilyGo T-Deck 向けの LoRa メッシュ OS「SigurdOS」を公開する GitHub org です。SigurdOS は MeshCore と相互運用でき、Hermes は companion ノードで参加できます。（Free \(OSS\)）
- [ROHITCRAFTSYT/Hermes](https://teknium.io/hermes-devices/#rohitcraftsyt-hermes) — これは Hermes Agent とは無関係の、名前だけが同じ別の ESP32 ボイスアシスタントです。16kHz の音声を HTTP の bridge に送る作りで、同じハードを Hermes の bridge に向けられます。（Free \(OSS\)）

元のページの確認日: 2026-10-06
