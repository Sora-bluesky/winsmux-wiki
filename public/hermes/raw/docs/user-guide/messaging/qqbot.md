---
title: "QQ Bot"
description: ""
upstream_path: user-guide/messaging/qqbot.md
upstream_blob: e5050b304fc6d5b20acbf2ab9c793a5eba675cdf
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/qqbot
---

# QQ Bot {#qq-bot}

Hermes を **QQ 公式ボット API（v2）** 経由で QQ につなぎます。個人チャット（C2C）、グループでの @ メンション、ギルド、ダイレクトメッセージに対応し、音声の書き起こしも使えます。

## 概要 {#overview}

QQ Bot アダプターは [QQ 公式ボット API](https://bot.q.qq.com/wiki/develop/api-v2/) を使って次のことを行います。

- QQ のゲートウェイへ **WebSocket** で常時接続し、メッセージを受け取る
- **REST API** でテキストや Markdown の返信を送る
- 画像、音声メッセージ、添付ファイルをダウンロードして処理する
- テンセント内蔵の ASR、または設定した音声認識サービスで音声メッセージを書き起こす

## 事前に必要なもの {#prerequisites}

1. **QQ ボットのアプリケーション** — [q.qq.com](https://q.qq.com) で登録します。
   - 新しいアプリケーションを作り、**App ID** と **App Secret** を控えます
   - 必要なインテントを有効にします: C2C メッセージ、グループの @ メッセージ、ギルドのメッセージ
   - 試すときはサンドボックスモードで、本番で使うときは公開設定でボットを構成します

2. **依存関係** — アダプターには `aiohttp` と `httpx` が必要です。
   ```bash
   pip install aiohttp httpx
   ```

## 設定 {#configuration}

### 対話式のセットアップ {#interactive-setup}

```bash
hermes gateway setup
```

プラットフォームの一覧から **QQ Bot** を選び、案内に従って進めます。

### 手作業での設定 {#manual-configuration}

必要な環境変数を `~/.hermes/.env` に書きます。

```bash
QQ_APP_ID=your-app-id
QQ_CLIENT_SECRET=your-app-secret
```

## 環境変数 {#environment-variables}

| 変数 | 説明 | 既定値 |
|---|---|---|
| `QQ_APP_ID` | QQ ボットの App ID（必須） | — |
| `QQ_CLIENT_SECRET` | QQ ボットの App Secret（必須） | — |
| `QQBOT_HOME_CHANNEL` | 定期実行や通知の送り先の OpenID | — |
| `QQBOT_HOME_CHANNEL_NAME` | ホームチャンネルの表示名 | `Home` |
| `QQ_ALLOWED_USERS` | DM を許可するユーザーの OpenID をカンマ区切りで | open（すべてのユーザー） |
| `QQ_GROUP_ALLOWED_USERS` | グループでの利用を許可するグループの OpenID をカンマ区切りで | — |
| `QQ_ALLOW_ALL_USERS` | `true` にするとすべての DM を許可します | `false` |
| `QQ_PORTAL_HOST` | QQ のポータルのホストを上書きします（サンドボックスへ向けるなら `sandbox.q.qq.com`） | `q.qq.com` |
| `QQ_STT_API_KEY` | 音声認識サービスの API キー | — |
| `QQ_STT_BASE_URL` | （直接は読まれません。代わりに `config.yaml` の `platforms.qqbot.extra.stt.baseUrl` を設定します） | n/a |
| `QQ_STT_MODEL` | 音声認識のモデル名 | `glm-asr` |

## 細かい設定 {#advanced-configuration}

もっと細かく制御したい場合は、`~/.hermes/config.yaml` にプラットフォームの設定を書きます。

```yaml
platforms:
  qqbot:
    enabled: true
    extra:
      app_id: "your-app-id"
      client_secret: "your-secret"
      markdown_support: true       # enable QQ markdown (msg_type 2). Config-only; no env-var equivalent.
      dm_policy: "open"          # open | allowlist | disabled
      allow_from:
        - "user_openid_1"
      group_policy: "open"       # open | allowlist | disabled
      group_allow_from:
        - "group_openid_1"
      stt:
        provider: "zai"          # zai (GLM-ASR), openai (Whisper), etc.
        baseUrl: "https://open.bigmodel.cn/api/coding/paas/v4"
        apiKey: "your-stt-key"
        model: "glm-asr"
```

## 音声メッセージ（音声認識） {#voice-messages-stt}

音声の書き起こしは 2 段階で行われます。

1. **QQ 内蔵の ASR**（無料。必ず最初に試されます） — QQ は音声メッセージの添付に `asr_refer_text` を付けてきます。これはテンセント自身の音声認識によるものです
2. **設定した音声認識サービス**（うまくいかないときの受け皿） — QQ の ASR がテキストを返さなかった場合、アダプターは OpenAI 互換の音声認識 API を呼びます。

   - **Zhipu/GLM（zai）**: 既定のサービス。`glm-asr` モデルを使います
   - **OpenAI Whisper**: `QQ_STT_BASE_URL` と `QQ_STT_MODEL` を設定します
   - そのほか OpenAI 互換の音声認識エンドポイントなら何でも

## 困ったときは {#troubleshooting}

### ボットがすぐ切断される {#bot-disconnects-immediately-quick-disconnect}

たいていは次のどれかです。
- **App ID / Secret が違う** — q.qq.com で認証情報を見直してください
- **権限が足りない** — ボットに必要なインテントが有効になっているか確認してください
- **サンドボックス専用のボット** — サンドボックスモードのボットは、QQ のサンドボックスのテスト用チャンネルからしかメッセージを受け取れません

### 音声メッセージが書き起こされない {#voice-messages-not-transcribed}

1. 添付のデータに QQ 内蔵の `asr_refer_text` が入っているか確認します
2. 独自の音声認識サービスを使っている場合、`QQ_STT_API_KEY` が正しく設定されているか確認します
3. ゲートウェイのログに音声認識のエラーが出ていないか確認します

### メッセージが届かない {#messages-not-delivered}

- ボットの **インテント** が q.qq.com で有効になっているか確認します
- DM を制限しているなら `QQ_ALLOWED_USERS` を確認します
- グループのメッセージでは、ボットが **@ メンションされている** ことを確認します（グループの方針によっては許可リストへの追加も必要です）
- 定期実行や通知の送り先については `QQBOT_HOME_CHANNEL` を確認します

### 接続のエラー {#connection-errors}

- `aiohttp` と `httpx` が入っているか確認します: `pip install aiohttp httpx`
- `api.sgroup.qq.com` と WebSocket ゲートウェイへのネットワーク接続を確認します
- ゲートウェイのログで、詳しいエラーや再接続の様子を確認します
