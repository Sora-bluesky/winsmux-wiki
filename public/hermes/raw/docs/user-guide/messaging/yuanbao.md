---
title: "Yuanbao"
description: "WebSocket ゲートウェイ経由で Hermes Agent を企業向けメッセージングサービス Yuanbao につなぐ"
upstream_path: user-guide/messaging/yuanbao.md
upstream_blob: a7414f8852f46fec632871e31a2f4038df223747
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/yuanbao
---

# Yuanbao {#yuanbao}

Hermes を、テンセントの企業向けメッセージングサービス [Yuanbao](https://yuanbao.tencent.com/) につなぎます。このアダプターは WebSocket のゲートウェイでメッセージをリアルタイムに受け渡し、個人チャット（C2C）とグループの会話の両方に対応します。

:::info
Yuanbao はテンセント社内や企業環境で主に使われている、企業向けのメッセージングサービスです。リアルタイム通信に WebSocket を使い、HMAC による認証を行い、画像・ファイル・音声メッセージといったリッチメディアに対応しています。
:::

## 事前に必要なもの {#prerequisites}

- ボットを作る権限のある Yuanbao アカウント
- Yuanbao の APP_ID と APP_SECRET（プラットフォームの管理者から受け取ります）
- Python パッケージ: `websockets` と `httpx`
- メディアを扱う場合: `aiofiles`

必要な依存関係をインストールします。

```bash
pip install websockets httpx aiofiles
```

## 設定 {#setup}

### 1. Yuanbao でボットを作る {#1-create-a-bot-in-yuanbao}

1. [https://yuanbao.tencent.com/](https://yuanbao.tencent.com/) から Yuanbao のアプリをダウンロードします
2. アプリで **PAI → My Bot** を開き、新しいボットを作ります
3. ボットができたら、**APP_ID** と **APP_SECRET** をコピーします

### 2. セットアップウィザードを実行する {#2-run-the-setup-wizard}

Yuanbao を設定するいちばん簡単な方法は、対話式のセットアップです。

```bash
hermes gateway setup
```

選択肢が出たら **Yuanbao** を選びます。ウィザードは次の流れで進みます。

1. APP_ID を尋ねる
2. APP_SECRET を尋ねる
3. 設定を自動で保存する

:::tip
WebSocket の URL と API のドメインには、そのまま使える既定値が入っています。使い始めるのに必要なのは APP_ID と APP_SECRET だけです。
:::

### 3. 環境変数を設定する {#3-configure-environment-variables}

最初の設定が済んだら、`~/.hermes/.env` で次の変数を確認します。

```bash
# Required
YUANBAO_APP_ID=your-app-id
YUANBAO_APP_SECRET=your-app-secret
YUANBAO_WS_URL=wss://api.yuanbao.example.com/ws
YUANBAO_API_DOMAIN=https://api.yuanbao.example.com

# Optional: bot account ID (normally obtained automatically from sign-token)
# YUANBAO_BOT_ID=your-bot-id

# Optional: internal routing environment (e.g. test/staging/production)
# YUANBAO_ROUTE_ENV=production

# Optional: home channel for cron/notifications (format: direct:<account> or group:<group_code>)
YUANBAO_HOME_CHANNEL=direct:bot_account_id
YUANBAO_HOME_CHANNEL_NAME="Bot Notifications"

# Optional: restrict access (legacy, see Access Control below for fine-grained policies)
YUANBAO_ALLOWED_USERS=user_account_1,user_account_2
```

### 4. ゲートウェイを起動する {#4-start-the-gateway}

```bash
hermes gateway
```

アダプターが Yuanbao の WebSocket ゲートウェイに接続し、HMAC の署名で認証して、メッセージの処理を始めます。

## できること {#features}

- **WebSocket ゲートウェイ** — リアルタイムの双方向通信
- **HMAC 認証** — APP_ID/APP_SECRET によるリクエストの安全な署名
- **C2C のやり取り** — ユーザーとボットの 1 対 1 の会話
- **グループのやり取り** — グループチャットでの会話
- **メディア対応** — COS（クラウドオブジェクトストレージ）経由の画像、ファイル、音声メッセージ
- **Markdown の書式** — Yuanbao のサイズ上限に合わせてメッセージを自動で分割します
- **メッセージの重複排除** — 同じメッセージを二重に処理しないようにします
- **ハートビート／キープアライブ** — WebSocket の接続を安定させます
- **入力中の表示** — エージェントが処理している間、「入力中…」を表示します
- **自動再接続** — WebSocket が切れたとき、待ち時間を延ばしながらつなぎ直します
- **グループ情報の照会** — グループの詳細やメンバーの一覧を取得します
- **スタンプ／絵文字への対応** — 会話で TIMFaceElem のスタンプや絵文字を送れます
- **WeChat から転送されたチャット履歴への対応** — ユーザーが WeChat のチャット履歴のまとまりを Yuanbao へ転送すると、アダプターが転送された記録（送信者のニックネーム、テキスト、入れ子の転送を含むマルチメディアの項目）を読み取り、会話へ差し込むので、エージェントが転送されたやり取りの全体を読めます
- **ホームチャンネルの自動設定** — 最初にボットへ話しかけたユーザーが、自動でホームチャンネルの持ち主になります
- **応答が遅いときのお知らせ** — エージェントの処理が思ったより長引いたとき、待ってもらう旨のメッセージを送ります

## 設定できる項目 {#configuration-options}

### チャット ID の書き方 {#chat-id-formats}

Yuanbao は会話の種類に応じて、接頭辞の付いた識別子を使います。

| チャットの種類 | 書き方 | 例 |
|-----------|--------|---------|
| ダイレクトメッセージ（C2C） | `direct:<account>` | `direct:user123` |
| グループのメッセージ | `group:<group_code>` | `group:grp456` |

### メディアのアップロード {#media-uploads}

Yuanbao アダプターは、COS（テンセントクラウドのオブジェクトストレージ）へのメディアのアップロードを自動で処理します。

- **画像**: JPEG、PNG、GIF、WebP に対応
- **ファイル**: 一般的な文書形式に幅広く対応
- **音声**: WAV、MP3、OGG に対応

メディアの URL は SSRF 攻撃を防ぐため、アップロード前に自動で検証してからダウンロードされます。

## ホームチャンネル {#home-channel}

Yuanbao のどのチャット（DM でもグループでも）でも `/sethome` コマンドを使うと、そこを **ホームチャンネル** に指定できます。スケジュール実行の結果（cron ジョブ）はこのチャンネルへ届きます。

:::tip ホームチャンネルの自動設定
ホームチャンネルが設定されていない場合、最初にボットへ話しかけたユーザーが自動でホームチャンネルの持ち主になります。今のホームチャンネルがグループチャットの場合、最初の DM がそれをダイレクトのチャンネルへ切り替えます。
:::

`~/.hermes/.env` で手作業で設定することもできます。

```bash
YUANBAO_HOME_CHANNEL=direct:user_account_id
# or for a group:
# YUANBAO_HOME_CHANNEL=group:group_code
YUANBAO_HOME_CHANNEL_NAME="My Bot Updates"
```

### 例: ホームチャンネルを設定する {#example-set-home-channel}

1. Yuanbao でボットとの会話を始めます
2. `/sethome` コマンドを送ります
3. ボットが「Home channel set to [chat_name] with ID [chat_id]. Cron jobs will deliver to this location.」と返します
4. 以降の定期実行や通知は、このチャンネルへ送られます

### 例: 定期実行の結果を受け取る {#example-cron-job-delivery}

定期実行を登録します。

```bash
/cron "0 9 * * *" Check server status
```

スケジュールされた出力は、毎日午前 9 時に Yuanbao のホームチャンネルへ届きます。

## 使い方のヒント {#usage-tips}

### 会話を始める {#starting-a-conversation}

Yuanbao でボットに何か送ってみてください。

```
hello
```

ボットは同じ会話の流れの中で返事をします。

### 使えるコマンド {#available-commands}

Hermes の標準のコマンドはすべて Yuanbao でも使えます。

| コマンド | 説明 |
|---------|-------------|
| `/new` | 新しい会話を始めます |
| `/model [provider:model]` | モデルを表示・変更します |
| `/sethome` | このチャットをホームチャンネルにします |
| `/status` | セッションの情報を表示します |
| `/help` | 使えるコマンドを表示します |

### ファイルを送る {#sending-files}

ボットにファイルを渡すには、Yuanbao のチャットにそのまま添付するだけです。ボットが自動でダウンロードして、添付ファイルを処理します。

添付と一緒にメッセージを書くこともできます。

```
Please analyze this document
```

### ファイルを受け取る {#receiving-files}

ファイルの作成や書き出しを頼むと、ボットはそのファイルを Yuanbao のチャットへ直接送ります。

## 困ったときは {#troubleshooting}

### ボットはオンラインなのにメッセージに反応しない {#bot-is-online-but-not-responding-to-messages}

**原因**: WebSocket のハンドシェイクで認証に失敗しています。

**対処**:
1. APP_ID と APP_SECRET が正しいか確認します
2. WebSocket の URL につながるか確認します
3. ボットのアカウントに適切な権限があるか確認します
4. ゲートウェイのログを見ます: `tail -f ~/.hermes/logs/gateway.log`

### 「Connection refused」のエラー {#connection-refused-error}

**原因**: WebSocket の URL につながらないか、URL が間違っています。

**対処**:
1. WebSocket の URL の書き方を確認します（`wss://` で始まっているはずです）
2. Yuanbao の API ドメインへのネットワーク接続を確認します
3. ファイアウォールが WebSocket の接続を通すか確認します
4. URL を試します: `curl -I https://[YUANBAO_API_DOMAIN]`

### メディアのアップロードが失敗する {#media-uploads-fail}

**原因**: COS の認証情報が無効か、メディアのサーバーにつながりません。

**対処**:
1. API_DOMAIN が正しいか確認します
2. ボットにメディアのアップロード権限があるか確認します
3. メディアのファイルが読める状態で、壊れていないか確認します
4. COS のバケットの設定をプラットフォームの管理者と確認します

### ホームチャンネルにメッセージが届かない {#messages-not-delivered-to-home-channel}

**原因**: ホームチャンネルの ID の書き方が違うか、定期実行がまだ動いていません。

**対処**:
1. YUANBAO_HOME_CHANNEL の書き方が正しいか確認します
2. `/sethome` コマンドで、正しい書き方を自動で判定させます
3. `/status` で定期実行のスケジュールを確認します
4. 対象のチャットでボットに送信権限があるか確認します

### 接続がよく切れる {#frequent-disconnections}

**原因**: WebSocket の接続が不安定か、ネットワークが安定していません。

**対処**:
1. ゲートウェイのログでエラーの傾向を確認します
2. 接続設定のハートビートのタイムアウトを長くします
3. Yuanbao の API との安定したネットワーク接続を確保します
4. 詳しいログを出すことも検討します: `hermes gateway run -vv`

## アクセスの制御 {#access-control}

Yuanbao では、DM とグループの会話の両方について細かくアクセスを制御できます。

```bash
# DM policy: open (default) | allowlist | disabled
YUANBAO_DM_POLICY=open
# Comma-separated user IDs allowed to DM the bot (only used when DM_POLICY=allowlist)
YUANBAO_DM_ALLOW_FROM=user_id_1,user_id_2

# Group policy: open (default) | allowlist | disabled
YUANBAO_GROUP_POLICY=open
# Comma-separated group codes allowed (only used when GROUP_POLICY=allowlist)
YUANBAO_GROUP_ALLOW_FROM=group_code_1,group_code_2
```

`config.yaml` に書くこともできます。

```yaml
platforms:
  yuanbao:
    extra:
      dm_policy: allowlist
      dm_allow_from: "user1,user2"
      group_policy: open
      group_allow_from: ""
```

## 細かい設定 {#advanced-configuration}

### メッセージの分割 {#message-chunking}

Yuanbao にはメッセージのサイズ上限があります。Hermes は長い返信を自動で分割し、その際に Markdown の構造（コードフェンス、表、段落の区切り）を崩さないようにします。

### 接続のパラメーター {#connection-parameters}

次の接続パラメーターは、そのまま使える既定値としてアダプターに組み込まれています。

| パラメーター | 既定値 | 説明 |
|-----------|---------------|-------------|
| WebSocket の接続タイムアウト | 15 秒 | WS のハンドシェイクを待つ時間 |
| ハートビートの間隔 | 30 秒 | 接続を保つための ping の頻度 |
| 再接続の最大試行回数 | 100 | つなぎ直しを試す上限 |
| 再接続の待ち時間 | 1 秒 → 60 秒（指数的に増加） | 再接続の試行と試行の間の待ち時間 |
| 返信のハートビート間隔 | 2 秒 | RUNNING 状態を送る頻度 |
| 送信のタイムアウト | 30 秒 | 送信する WS メッセージのタイムアウト |

:::note
これらの値は今のところ環境変数では変えられません。一般的な Yuanbao の環境に合わせて調整されています。
:::

### 詳しいログ {#verbose-logging}

接続の問題を調べるには、デバッグ用のログを有効にします。

```bash
hermes gateway run -vv
```

## ほかの機能との組み合わせ {#integration-with-other-features}

### 定期実行 {#cron-jobs}

Yuanbao で動く定期実行を登録します。

```
/cron "0 */4 * * *" Report system health
```

結果はホームチャンネルへ届きます。

### バックグラウンドの処理 {#background-tasks}

会話を止めずに、時間のかかる処理を走らせます。

```
/background Analyze all files in the archive
```

### プラットフォームをまたいだメッセージ {#cross-platform-messages}

CLI から Yuanbao へメッセージを送ります。

```bash
hermes chat -q "Send 'Hello from CLI' to yuanbao:group:group_code"
```

## 関連するドキュメント {#related-documentation}

- [メッセージングゲートウェイの概要](/hermes/docs/user-guide/messaging/)
- [スラッシュコマンド早見表](/hermes/docs/reference/slash-commands/)
- [定期実行](/hermes/docs/user-guide/features/cron/)
- [バックグラウンドのセッション](/hermes/docs/user-guide/cli/#background-sessions)
