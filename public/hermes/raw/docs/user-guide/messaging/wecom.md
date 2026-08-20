---
title: "WeCom（企業向け WeChat）"
description: "AI Bot の WebSocket ゲートウェイ経由で Hermes Agent を WeCom につなぎます"
upstream_path: user-guide/messaging/wecom.md
upstream_blob: 2ac5bddb143568a30ca726a9a5574ca58831f8ff
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/wecom
---

# WeCom（企業向け WeChat） {#wecom-enterprise-wechat}

Hermes を、Tencent の企業向けメッセージングプラットフォームである [WeCom](https://work.weixin.qq.com/)（企业微信）につなぎます。アダプターは WeCom の AI Bot 向け WebSocket ゲートウェイを使って双方向にやり取りするので、公開のエンドポイントも Webhook も要りません。

あわせて読む: 受信用の Webhook の設定は [WeCom Callback](/hermes/docs/user-guide/messaging/wecom-callback/) を参照してください。

## 前提 {#prerequisites}

- WeCom の組織アカウント
- WeCom 管理コンソールで作成した AI Bot
- Bot の認証情報のページにある Bot ID と Secret
- Python パッケージ: `aiohttp` と `httpx`

## 設定 {#setup}

### 手順 1: AI Bot を作る {#step-1-create-an-ai-bot}

#### おすすめ: スキャンして作成する（コマンド 1 つ） {#recommended-scan-to-create-one-command}

```bash
hermes gateway setup
```

**WeCom** を選び、WeCom のスマートフォンアプリで QR コードを読み取ります。Hermes が必要な権限を備えた Bot アプリケーションを自動で作り、認証情報を保存します。

設定のウィザードは次のように進みます。
1. ターミナルに QR コードを表示します
2. WeCom のスマートフォンアプリで読み取るのを待ちます
3. Bot ID と Secret を自動で取得します
4. アクセス制御の設定を案内します

#### 別のやり方: 手動で設定する {#alternative-manual-setup}

スキャンでの作成が使えない場合、ウィザードは手入力に切り替わります。

1. [WeCom 管理コンソール](https://work.weixin.qq.com/wework_admin/frame)にログインします
2. **Applications** → **Create Application** → **AI Bot** と進みます
3. Bot の名前と説明を設定します
4. 認証情報のページから **Bot ID** と **Secret** をコピーします
5. `hermes gateway setup` を実行し、**WeCom** を選んで、聞かれたら認証情報を入力します

:::warning
Bot Secret は外に出さないでください。手に入れた相手は、あなたの Bot になりすませます。
:::

### 手順 2: Hermes を設定する {#step-2-configure-hermes}

#### 方法 A: 対話式の設定（おすすめ） {#option-a-interactive-setup-recommended}

```bash
hermes gateway setup
```

**WeCom** を選び、聞かれた内容に答えていきます。ウィザードは次の項目を案内します。
- Bot の認証情報（QR コードの読み取り、または手入力）
- アクセス制御の設定（許可リスト、pairing 方式、または誰でも使える形）
- 通知の届け先となるホームチャンネル

#### 方法 B: 手動で設定する {#option-b-manual-configuration}

`~/.hermes/.env` に次の内容を書き足します。

```bash
WECOM_BOT_ID=your-bot-id
WECOM_SECRET=your-secret

# Optional: restrict access
WECOM_ALLOWED_USERS=user_id_1,user_id_2

# Optional: home channel for cron/notifications
WECOM_HOME_CHANNEL=chat_id
```

### 手順 3: ゲートウェイを起動する {#step-3-start-the-gateway}

```bash
hermes gateway
```

## できること {#features}

- **WebSocket による通信** — 接続を張り続けるので、公開のエンドポイントは要りません
- **個別チャットとグループでのやり取り** — アクセスの方針を設定できます
- **グループごとの送信者の許可リスト** — グループごとに、誰が Bot とやり取りできるかを細かく決められます
- **メディアへの対応** — 画像・ファイル・音声・動画のアップロードとダウンロード
- **AES で暗号化されたメディア** — 受け取った添付を自動で復号します
- **引用の文脈** — 返信のつながりを保ちます
- **マークダウンの表示** — 書式付きの応答
- **返信の対応づけ** — 応答が、届いたメッセージの文脈に結びつきます
- **自動での再接続** — 接続が切れたときは間隔を広げながらつなぎ直します

:::note ストリーミングと入力中の表示について
WeCom のアダプターは、応答をひとつの完成したメッセージとして届けます。トークンを少しずつ流す
ストリーミングは**しません**し、入力中の表示も**出しません**。後述の「返信の対応づけ」は、
応答を元の要求に結びつけるだけで、実況的なストリーミングではありません。
:::

## 設定できる項目 {#configuration-options}

`config.yaml` の `platforms.wecom.extra` の下に設定します。

| キー | 既定値 | 説明 |
|-----|---------|-------------|
| `bot_id` | — | WeCom の AI Bot ID（必須） |
| `secret` | — | WeCom の AI Bot Secret（必須） |
| `websocket_url` | `wss://openws.work.weixin.qq.com` | WebSocket ゲートウェイの URL |
| `dm_policy` | `open` | 個別チャットのアクセス: `open`、`allowlist`、`disabled`、`pairing` |
| `group_policy` | `open` | グループのアクセス: `open`、`allowlist`、`disabled` |
| `allow_from` | `[]` | 個別チャットを許可する利用者 ID（dm_policy=allowlist のとき） |
| `group_allow_from` | `[]` | 許可するグループ ID（group_policy=allowlist のとき） |
| `groups` | `{}` | グループごとの設定（後述） |

## アクセスの方針 {#access-policies}

### 個別チャットの方針 {#dm-policy}

誰が Bot に個別のメッセージを送れるかを決めます。

| 値 | 振る舞い |
|-------|----------|
| `open` | 誰でも Bot に個別のメッセージを送れます（既定） |
| `allowlist` | `allow_from` に載っている利用者 ID だけが個別のメッセージを送れます |
| `disabled` | 個別のメッセージをすべて無視します |
| `pairing` | pairing 方式（最初の設定用） |

```bash
WECOM_DM_POLICY=allowlist
```

### グループの方針 {#group-policy}

どのグループで Bot が応答するかを決めます。

| 値 | 振る舞い |
|-------|----------|
| `open` | すべてのグループで応答します（既定） |
| `allowlist` | `group_allow_from` に載っているグループ ID でだけ応答します |
| `disabled` | グループのメッセージをすべて無視します |

```bash
WECOM_GROUP_POLICY=allowlist
```

### グループごとの送信者の許可リスト {#per-group-sender-allowlists}

細かく決めたい場合は、特定のグループの中で Bot とやり取りできる利用者を絞り込めます。設定は `config.yaml` で行います。

```yaml
platforms:
  wecom:
    enabled: true
    extra:
      bot_id: "your-bot-id"
      secret: "your-secret"
      group_policy: "allowlist"
      group_allow_from:
        - "group_id_1"
        - "group_id_2"
      groups:
        group_id_1:
          allow_from:
            - "user_alice"
            - "user_bob"
        group_id_2:
          allow_from:
            - "user_charlie"
        "*":
          allow_from:
            - "user_admin"
```

**仕組み:**

1. まず `group_policy` と `group_allow_from` で、そのグループを扱うかどうかが決まります。
2. グループが最初の判定を通ったら、`groups.<group_id>.allow_from` の一覧（あれば）で、そのグループの中の誰が Bot とやり取りできるかをさらに絞ります。
3. ワイルドカードの `"*"` のグループ項目は、明示的に書かれていないグループの既定として使われます。
4. 許可リストの項目では `*` のワイルドカードで全員を許可でき、大文字と小文字は区別されません。
5. 項目には `wecom:user:` や `wecom:group:` の接頭辞を付けても構いません。接頭辞は自動で取り除かれます。

グループに `allow_from` を設定していない場合、そのグループにいる全員が許可されます（グループ自体が最初の判定を通っていることが前提です）。

## メディアへの対応 {#media-support}

### 受信 {#inbound-receiving}

アダプターは、利用者から届いた添付メディアを受け取り、エージェントが扱えるよう手元に保存します。

| 種類 | 扱われ方 |
|------|-----------------|
| **画像** | ダウンロードして手元に保存します。URL 形式と base64 形式の両方に対応します。 |
| **ファイル** | ダウンロードして保存します。ファイル名は元のメッセージのものを保ちます。 |
| **音声** | 音声メッセージの文字起こしがあれば取り出します。 |
| **混在したメッセージ** | WeCom の複数の種類が混ざったメッセージ（テキスト + 画像）を解析し、含まれる要素をすべて取り出します。 |

**引用されたメッセージ:** 引用（返信元）のメッセージに含まれるメディアも取り出すので、エージェントは何に対する返信なのかを把握できます。

### AES で暗号化されたメディアの復号 {#aes-encrypted-media-decryption}

WeCom は、受信するメディアの添付の一部を AES-256-CBC で暗号化します。アダプターはこれを自動で処理します。

- 届いたメディアの項目に `aeskey` のフィールドが含まれている場合、アダプターは暗号化されたデータをダウンロードし、PKCS#7 のパディングを伴う AES-256-CBC で復号します。
- AES の鍵は `aeskey` フィールドを base64 で復号した値です（ちょうど 32 バイトである必要があります）。
- IV は鍵の先頭 16 バイトから作られます。
- この処理には Python パッケージの `cryptography`（`pip install cryptography`）が必要です。

設定は要りません。暗号化されたメディアを受け取ると、復号は裏側で自動的に行われます。

### 送信 {#outbound-sending}

| メソッド | 送るもの | 大きさの上限 |
|--------|--------------|------------|
| `send` | マークダウンのテキストメッセージ | 4000 文字 |
| `send_image` / `send_image_file` | WeCom 本来の画像メッセージ | 10 MB |
| `send_document` | 添付ファイル | 20 MB |
| `send_voice` | 音声メッセージ（本来の音声として送れるのは AMR 形式のみ） | 2 MB |
| `send_video` | 動画メッセージ | 10 MB |

**分割してのアップロード:** ファイルは 512 KB ごとに区切り、3 段階の手順（init → chunks → finish）でアップロードします。この処理はアダプターが自動で行います。

**自動での切り替え:** メディアがその種類本来の上限を超えていても、全体の上限である 20 MB に収まっている場合は、一般的な添付ファイルとして自動的に送ります。

- 10 MB を超える画像 → ファイルとして送信
- 10 MB を超える動画 → ファイルとして送信
- 2 MB を超える音声 → ファイルとして送信
- AMR 以外の音声 → ファイルとして送信（WeCom 本来の音声は AMR にしか対応していません）

全体の上限である 20 MB を超えるファイルは送られず、その旨を知らせるメッセージがチャットに投稿されます。

## 返信方式での応答 {#reply-mode-responses}

WeCom のコールバック経由でメッセージを受け取ると、アダプターは届いた要求の ID を覚えておきます。その要求の文脈がまだ生きているうちに応答を送る場合、アダプターは WeCom の返信方式（`aibot_respond_msg`）を使い、応答を元のメッセージに直接結びつけます。WeCom のクライアント上で、より自然な会話に見えます。

応答はひとつの完成したメッセージとして届きます。アダプターはトークンを少しずつ流すことはしません。届いた要求の文脈が期限切れになっているか使えない場合は、`aibot_send_msg` によるこちらからの送信に切り替えます。

返信方式はメディアにも使えます。アップロードしたメディアも、元のメッセージへの返信として送れます。

## 接続と再接続 {#connection-and-reconnection}

アダプターは、WeCom のゲートウェイ `wss://openws.work.weixin.qq.com` への WebSocket 接続を張り続けます。

### 接続の流れ {#connection-lifecycle}

1. **接続:** WebSocket 接続を開き、bot_id と secret を載せた `aibot_subscribe` の認証フレームを送ります。
2. **ハートビート:** 接続を保つため、アプリケーション層の ping フレームを 30 秒ごとに送ります。
3. **待ち受け:** 届いたフレームを読み続け、メッセージのコールバックへ渡します。

### 再接続の動き {#reconnection-behavior}

接続が切れると、アダプターは待ち時間を延ばしながら再接続します。

| 試行 | 待ち時間 |
|---------|-------|
| 1 回目 | 2 秒 |
| 2 回目 | 5 秒 |
| 3 回目 | 10 秒 |
| 4 回目 | 30 秒 |
| 5 回目以降 | 60 秒 |

再接続に成功するたび、待ち時間の数え直しが行われます。切断時には処理待ちの要求をすべて失敗させるので、呼び出し側が延々と待たされることはありません。

### 重複の除去 {#deduplication}

受け取ったメッセージは、メッセージ ID をもとに 5 分の枠、最大 1000 件のキャッシュで重複を除きます。再接続やネットワークの乱れで、同じメッセージが二重に処理されるのを防ぎます。

## 環境変数の一覧 {#all-environment-variables}

| 変数 | 必須 | 既定値 | 説明 |
|----------|----------|---------|-------------|
| `WECOM_BOT_ID` | ✅ | — | WeCom の AI Bot ID |
| `WECOM_SECRET` | ✅ | — | WeCom の AI Bot Secret |
| `WECOM_ALLOWED_USERS` | — | _(空)_ | ゲートウェイ全体の許可リストに使う利用者 ID のカンマ区切りの一覧 |
| `WECOM_HOME_CHANNEL` | — | — | 定期タスクや通知の出力先となるチャット ID |
| `WECOM_WEBSOCKET_URL` | — | `wss://openws.work.weixin.qq.com` | WebSocket ゲートウェイの URL |
| `WECOM_DM_POLICY` | — | `open` | 個別チャットのアクセスの方針 |
| `WECOM_GROUP_POLICY` | — | `open` | グループのアクセスの方針 |

## 困ったときは {#troubleshooting}

| 症状 | 対処 |
|---------|-----|
| `WECOM_BOT_ID and WECOM_SECRET are required` | 両方の環境変数を設定するか、設定のウィザードで指定します |
| `WeCom startup failed: aiohttp not installed` | aiohttp を入れます: `pip install aiohttp` |
| `WeCom startup failed: httpx not installed` | httpx を入れます: `pip install httpx` |
| `invalid secret (errcode=40013)` | Bot の認証情報と secret が一致しているか確かめます |
| `Timed out waiting for subscribe acknowledgement` | `openws.work.weixin.qq.com` へのネットワーク接続を確かめます |
| グループで Bot が応答しない | `group_policy` の設定を見直し、そのグループ ID が `group_allow_from` に入っているか確かめます |
| グループ内の特定の利用者が無視される | `groups` の設定にあるグループごとの `allow_from` の一覧を確かめます |
| メディアの復号に失敗する | `cryptography` を入れます: `pip install cryptography` |
| `cryptography is required for WeCom media decryption` | 受け取ったメディアが AES で暗号化されています。`pip install cryptography` で入れてください。 |
| 音声メッセージがファイルとして送られる | WeCom 本来の音声は AMR 形式にしか対応していません。他の形式は自動でファイルに切り替わります。 |
| `File too large` のエラーが出る | WeCom はすべてのファイルのアップロードに 20 MB の上限を設けています。圧縮するか分割してください。 |
| 画像がファイルとして送られる | 10 MB を超える画像は本来の画像の上限を超えるため、添付ファイルへ自動で切り替わります。 |
| `Timeout sending message to WeCom` | WebSocket が切れている可能性があります。再接続のログを確認してください。 |
| `WeCom websocket closed during authentication` | ネットワークの問題か、認証情報の誤りです。bot_id と secret を確かめてください。 |
