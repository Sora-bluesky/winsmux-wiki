---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "QQ Bot"
description: ""
upstream_path: user-guide/messaging/qqbot.md
upstream_blob: 5ad299bece6b25f5d8bd4f5af8fee9f0d61e368d
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/qqbot
---

# QQ Bot {#qq-bot}

このページにある Python の依存関係のコマンドは、
[PM で準備したソースのチェックアウト](/hermes/docs/reference/package-management/#developer-workflow)を前提にしています。
依存関係を変えたら、チェックアウトを有効化し直してから Hermes を再起動してください。

**公式 QQ Bot API (v2)** を使って Hermes を QQ につなぎます。個人チャット（C2C）、グループでの @ メンション、ギルド、ダイレクトメッセージに対応し、音声メッセージの文字起こしもできます。

## 概要 {#overview}

QQ Bot アダプターは [公式 QQ Bot API](https://bot.q.qq.com/wiki/develop/api-v2/) を利用して、次のことを行います。

- QQ ゲートウェイへの **WebSocket** 接続を張り続けて、メッセージを受け取る
- **REST API** 経由でテキストや markdown の返信を送る
- 画像・音声メッセージ・添付ファイルをダウンロードして処理する
- Tencent 内蔵の ASR、または設定した STT プロバイダーで音声メッセージを文字起こしする

## 事前に必要なもの {#prerequisites}

1. **QQ Bot アプリケーション** — [q.qq.com](https://q.qq.com) で登録します。
   - 新しいアプリケーションを作成し、**App ID** と **App Secret** を控えます
   - 必要な intent を有効にします（C2C メッセージ、グループの @ メッセージ、ギルドメッセージ）
   - テスト中はサンドボックスモードで設定し、本番運用では公開します

2. **依存パッケージ** — アダプターには `aiohttp` と `httpx` が必要です。
   ```bash
   python -c "import pm; pm.sync_venv(['messaging'], explicit=True)"
   ```

## 設定 {#configuration}

### 対話形式のセットアップ {#interactive-setup}

```bash
hermes gateway setup
```

プラットフォームの一覧から **QQ Bot** を選び、表示される質問に答えていきます。

### 手動で設定する {#manual-configuration}

`~/.hermes/.env` に、必要な環境変数を書きます。

```bash
QQ_APP_ID=your-app-id
QQ_CLIENT_SECRET=your-app-secret
```

## 環境変数 {#environment-variables}

| 変数 | 説明 | 既定値 |
|---|---|---|
| `QQ_APP_ID` | QQ Bot の App ID（必須） | — |
| `QQ_CLIENT_SECRET` | QQ Bot の App Secret（必須） | — |
| `QQBOT_HOME_CHANNEL` | cron や通知の配送先になる OpenID | — |
| `QQBOT_HOME_CHANNEL_NAME` | ホームチャンネルの表示名 | `Home` |
| `QQ_ALLOWED_USERS` | DM を許可するユーザーの OpenID をカンマ区切りで指定 | 制限なし（全ユーザー） |
| `QQ_GROUP_ALLOWED_USERS` | グループ利用を許可するグループの OpenID をカンマ区切りで指定 | — |
| `QQ_ALLOW_ALL_USERS` | `true` にすると、すべての DM を受け付けます | `false` |
| `QQ_PORTAL_HOST` | QQ ポータルのホストを上書きします（サンドボックスへ向けるときは `sandbox.q.qq.com`） | `q.qq.com` |
| `QQ_STT_API_KEY` | 音声を文字にするプロバイダーの API キー | — |
| `QQ_STT_BASE_URL` | （直接は読まれません。代わりに `config.yaml` の `platforms.qqbot.extra.stt.baseUrl` を設定してください） | 該当なし |
| `QQ_STT_MODEL` | STT のモデル名 | `glm-asr` |

## 詳しい設定 {#advanced-configuration}

細かく制御したいときは、`~/.hermes/config.yaml` にプラットフォームの設定を足します。

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
        timeout: 60              # seconds per transcription request (default 60)
```

## 音声メッセージ（STT） {#voice-messages-stt}

音声の文字起こしは、二段構えで動きます。

1. **QQ 内蔵の ASR**（無料。常に最初に試されます） — QQ は音声メッセージの添付データに `asr_refer_text` を付けてくれます。Tencent 自前の音声認識の結果です
2. **設定した STT プロバイダー**（うまくいかなかったときの受け皿） — QQ の ASR がテキストを返さなかった場合、アダプターは OpenAI 互換の STT API を呼びます。

   - **Zhipu/GLM (zai)**: 既定のプロバイダーで、`glm-asr` モデルを使います
   - **OpenAI Whisper**: `QQ_STT_BASE_URL` と `QQ_STT_MODEL` を設定します
   - そのほか、OpenAI 互換の STT エンドポイントなら何でも使えます

## 困ったとき {#troubleshooting}

### Bot がすぐ切断される {#bot-disconnects-immediately-quick-disconnect}

たいていは次のどれかです。

- **App ID / Secret が違う** — q.qq.com で認証情報をもう一度確かめてください
- **権限が足りない** — 必要な intent が有効になっているか確認してください
- **サンドボックス専用の Bot になっている** — サンドボックスモードのままだと、QQ のサンドボックステストチャンネルからのメッセージしか受け取れません

### 音声メッセージが文字にならない {#voice-messages-not-transcribed}

1. 添付データに QQ 内蔵の `asr_refer_text` が入っているか確かめます
2. 独自の STT プロバイダーを使っているなら、`QQ_STT_API_KEY` が正しく設定されているか確かめます
3. ゲートウェイのログに STT のエラーが出ていないか確かめます

### メッセージが届かない {#messages-not-delivered}

- q.qq.com で Bot の **intent** が有効になっているか確かめます
- DM を制限しているなら `QQ_ALLOWED_USERS` を見直します
- グループでは Bot が **@ メンション** されている必要があります（グループのポリシー次第では、許可リストへの登録も必要です）
- cron や通知の配送先として `QQBOT_HOME_CHANNEL` を確かめます

### 接続エラーが出る {#connection-errors}

- `aiohttp` と `httpx` が入っているか確かめます: `python -c "import pm; pm.sync_venv(['messaging'], explicit=True)"`
- `api.sgroup.qq.com` と WebSocket ゲートウェイに通信が届くか確かめます
- ゲートウェイのログで、詳しいエラー内容と再接続の様子を確認します
