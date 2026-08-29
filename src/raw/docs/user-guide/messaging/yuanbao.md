---
title: "Yuanbao"
description: "WebSocket ゲートウェイ経由で Hermes Agent を企業向けメッセージングサービス Yuanbao につなぐ"
upstream_path: user-guide/messaging/yuanbao.md
upstream_blob: 5ba3b56a700ce3eb4a2c54ed377be7280729e824
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
- Python のパッケージ: `websockets` と `httpx`
- メディアを扱う場合: `aiofiles`

必要な依存パッケージを入れます。

```bash
pip install websockets httpx aiofiles
```

## 準備の手順 {#setup}

### 1. Yuanbao でボットを作る {#1-create-a-bot-in-yuanbao}

1. [https://yuanbao.tencent.com/](https://yuanbao.tencent.com/) から Yuanbao のアプリをダウンロードします
2. アプリの **PAI → My Bot** を開き、新しいボットを作ります
3. ボットができたら、**APP_ID** と **APP_SECRET** を控えておきます

### 2. 設定ウィザードを実行する {#2-run-the-setup-wizard}

Yuanbao の設定でいちばん手軽なのは、対話式のウィザードです。

```bash
hermes gateway setup
```

聞かれたら **Yuanbao** を選びます。ウィザードは次のことをしてくれます。

1. APP_ID を尋ねる
2. APP_SECRET を尋ねる
3. 設定を自動で保存する

:::tip
WebSocket の URL と API ドメインには、そのまま使える初期値が入っています。使い始めるのに用意するのは APP_ID と APP_SECRET だけです。
:::

### 3. 環境変数を設定する {#3-configure-environment-variables}

最初の設定が終わったら、`~/.hermes/.env` で次の変数を確認します。

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

このコマンドでアダプターが Yuanbao の WebSocket ゲートウェイにつながり、HMAC の署名で認証したうえで、メッセージの処理を始めます。

## できること {#features}

- **WebSocket ゲートウェイ** — リアルタイムの双方向通信
- **HMAC 認証** — APP_ID と APP_SECRET によるリクエストの安全な署名
- **C2C のメッセージ** — 利用者とボットの一対一の会話
- **グループのメッセージ** — グループチャットでの会話
- **メディア対応** — COS（クラウドオブジェクトストレージ）を通じた画像・ファイル・音声メッセージ
- **Markdown の書式** — Yuanbao のサイズ上限に合わせてメッセージを自動で分割
- **メッセージの重複排除** — 同じメッセージを二重に処理しない
- **ハートビート／接続維持** — WebSocket の接続を安定させる
- **入力中の表示** — エージェントの処理中に「typing…」の状態を出す
- **自動での再接続** — WebSocket が切れても指数バックオフでつなぎ直す
- **グループ情報の問い合わせ** — グループの詳細やメンバー一覧を取得
- **スタンプ・絵文字対応** — 会話のなかで TIMFaceElem のスタンプや絵文字を送れる
- **WeChat の転送されたチャット履歴への対応** — WeChat のチャット履歴のまとまりを Yuanbao へ転送すると、アダプターがその記録（送信者のニックネーム、本文、入れ子の転送を含むマルチメディアの項目）を読み解いて会話に差し込み、エージェントが転送されたやり取り全体を読めるようにします
- **ホームチャンネルの自動設定** — 最初にボットへメッセージを送った利用者が、ホームチャンネルの持ち主として自動で設定されます
- **応答が遅いときの通知** — エージェントの処理が予想より長引くときに、待ってほしい旨のメッセージを送ります

## 設定できる項目 {#configuration-options}

### チャット ID の書き方 {#chat-id-formats}

Yuanbao では、会話の種類に応じて接頭辞付きの識別子を使います。

| チャットの種類 | 書き方 | 例 |
|-----------|--------|-----|
| 個人チャット（C2C） | `direct:<account>` | `direct:user123` |
| グループのメッセージ | `group:<group_code>` | `group:grp456` |

### メディアのアップロード {#media-uploads}

Yuanbao のアダプターは、COS（テンセントのクラウドオブジェクトストレージ）を使ってメディアのアップロードを自動で行います。

- **画像**: JPEG、PNG、GIF、WebP に対応
- **ファイル**: 一般的な文書形式に幅広く対応
- **音声**: WAV、MP3、OGG に対応

メディアの URL は SSRF 攻撃を防ぐため、アップロードの前に自動で検証してからダウンロードされます。

## ホームチャンネル {#home-channel}

Yuanbao のどのチャット（個人チャットでもグループでも）でも `/sethome` コマンドを送れば、そこを **ホームチャンネル** に指定できます。定期実行のタスク（cron ジョブ）の結果は、このチャンネルに届きます。

:::tip ホームチャンネルの自動設定
ホームチャンネルが未設定のときは、最初にボットへメッセージを送った利用者が自動でホームチャンネルの持ち主になります。今のホームチャンネルがグループチャットの場合、最初の個人チャットが届いた時点で個人チャットのほうへ切り替わります。
:::

`~/.hermes/.env` で手動で指定することもできます。

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
4. これ以降の定期実行の結果や通知は、このチャンネルに届きます

### 例: 定期実行の結果を受け取る {#example-cron-job-delivery}

定期実行のジョブを作ります。

```bash
/cron "0 9 * * *" Check server status
```

指定した処理の結果が、毎日午前 9 時に Yuanbao のホームチャンネルへ届きます。

## 使いこなしのヒント {#usage-tips}

### 会話を始める {#starting-a-conversation}

Yuanbao でボットに何かメッセージを送ります。

```
hello
```

ボットは同じ会話のなかで返事をします。

### 使えるコマンド {#available-commands}

Hermes の標準のコマンドは、Yuanbao でもひととおり使えます。

| コマンド | 説明 |
|---------|------|
| `/new` | 新しい会話を始める |
| `/model [provider:model]` | モデルを表示する、または切り替える |
| `/sethome` | このチャットをホームチャンネルにする |
| `/status` | セッションの情報を表示する |
| `/help` | 使えるコマンドを表示する |

### ファイルを送る {#sending-files}

ボットにファイルを渡すときは、Yuanbao のチャットにそのまま添付するだけです。ボットが添付ファイルを自動でダウンロードして処理します。

添付といっしょにメッセージを書くこともできます。

```
Please analyze this document
```

### ファイルを受け取る {#receiving-files}

ファイルの作成や書き出しをボットに頼むと、できあがったファイルが Yuanbao のチャットに直接届きます。

## 困ったときは {#troubleshooting}

### ボットはオンラインなのにメッセージに反応しない {#bot-is-online-but-not-responding-to-messages}

**原因**: WebSocket の接続時に認証が通っていません。

**対処**:
1. APP_ID と APP_SECRET が正しいか確かめます
2. WebSocket の URL につながるか確かめます
3. ボットのアカウントに必要な権限があるか確かめます
4. ゲートウェイのログを見ます: `tail -f ~/.hermes/logs/gateway.log`

### 「Connection refused」のエラーが出る {#connection-refused-error}

**原因**: WebSocket の URL につながらないか、URL が間違っています。

**対処**:
1. WebSocket の URL の書き方を確かめます（`wss://` で始まるはずです）
2. Yuanbao の API ドメインにネットワークがつながるか確かめます
3. ファイアウォールが WebSocket の接続を通しているか確かめます
4. URL を試します: `curl -I https://[YUANBAO_API_DOMAIN]`

### メディアのアップロードが失敗する {#media-uploads-fail}

**原因**: COS の資格情報が無効か、メディアのサーバーにつながっていません。

**対処**:
1. API_DOMAIN が正しいか確かめます
2. ボットにメディアのアップロード権限があるか確かめます
3. メディアのファイルが読める状態で、壊れていないか確かめます
4. COS のバケットの設定をプラットフォームの管理者に確認します

### ホームチャンネルにメッセージが届かない {#messages-not-delivered-to-home-channel}

**原因**: ホームチャンネルの ID の書き方が違うか、定期実行がまだ動いていません。

**対処**:
1. YUANBAO_HOME_CHANNEL の書き方が正しいか確かめます
2. `/sethome` コマンドを使って、正しい書き方を自動で判定させます
3. `/status` で定期実行のスケジュールを確かめます
4. 送り先のチャットでボットに送信の権限があるか確かめます

### 接続がひんぱんに切れる {#frequent-disconnections}

**原因**: WebSocket の接続が不安定か、ネットワークが安定していません。

**対処**:
1. ゲートウェイのログにエラーの傾向がないか見ます
2. 接続の設定でハートビートのタイムアウトを延ばします
3. Yuanbao の API まで安定してつながるネットワークを用意します
4. 詳しいログを出すことも検討します: `hermes gateway run -vv`

## アクセスの制御 {#access-control}

Yuanbao では、個人チャットとグループの会話それぞれについて、細かくアクセスを制御できます。

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

同じ設定は `config.yaml` にも書けます。

```yaml
platforms:
  yuanbao:
    extra:
      dm_policy: allowlist
      dm_allow_from: "user1,user2"
      group_policy: open
      group_allow_from: ""
```

## 進んだ設定 {#advanced-configuration}

### メッセージの分割 {#message-chunking}

Yuanbao には 1 通あたりのサイズの上限があります。Hermes は長い応答を、Markdown の構造を見ながら自動で分割します（コードブロック・表・段落の切れ目を壊しません）。

### 接続まわりの値 {#connection-parameters}

接続まわりの次の値は、そのまま使える初期値としてアダプターに組み込まれています。

| 項目 | 初期値 | 説明 |
|-----------|---------------|------|
| WebSocket の接続タイムアウト | 15 秒 | WS の接続確立を待つ時間 |
| ハートビートの間隔 | 30 秒 | 接続を保つための ping の頻度 |
| 再接続の最大試行回数 | 100 | つなぎ直しを試みる上限の回数 |
| 再接続の待ち時間 | 1 秒 → 60 秒（指数的に増加） | 再接続を試すまでの待ち時間 |
| 応答ハートビートの間隔 | 2 秒 | RUNNING の状態を送る頻度 |
| 送信のタイムアウト | 30 秒 | 外向きの WS メッセージのタイムアウト |

:::note
これらの値は今のところ環境変数では変えられません。一般的な Yuanbao の運用に合わせて調整済みの値です。
:::

### 詳しいログを出す {#verbose-logging}

接続の問題を調べるときは、デバッグ用のログを有効にします。

```bash
hermes gateway run -vv
```

## ほかの機能との組み合わせ {#integration-with-other-features}

### 定期実行 {#cron-jobs}

Yuanbao で動く定期実行のタスクを登録します。

```
/cron "0 */4 * * *" Report system health
```

結果はホームチャンネルに届きます。

### バックグラウンドのタスク {#background-tasks}

会話を止めずに、時間のかかる処理を走らせます。

```
/bg Analyze all files in the archive
```

### プラットフォームをまたいだメッセージ {#cross-platform-messages}

コマンドラインから Yuanbao へメッセージを送ります。

```bash
hermes chat -q "Send 'Hello from CLI' to yuanbao:group:group_code"
```

## 関連するドキュメント {#related-documentation}

- [メッセージングゲートウェイの概要](/hermes/docs/user-guide/messaging/)
- [スラッシュコマンド早見表](/hermes/docs/reference/slash-commands/)
- [定期実行](/hermes/docs/user-guide/features/cron/)
- [バックグラウンドのセッション](/hermes/docs/user-guide/cli/#background-sessions)
