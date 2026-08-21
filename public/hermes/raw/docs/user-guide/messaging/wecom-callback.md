---
title: "WeCom Callback（自社で作るアプリ）"
description: ""
upstream_path: user-guide/messaging/wecom-callback.md
upstream_blob: f6cf5ed4a473f9555e0b40169fcc5bd57e33ab09
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/wecom-callback
---

# WeCom Callback（自社で作るアプリ） {#wecom-callback-self-built-app}

コールバック（Webhook）方式を使い、Hermes を WeCom（企業向け WeChat）の自社製の企業アプリケーションとしてつなぎます。

:::info WeCom Bot と WeCom Callback の違い
Hermes は WeCom との連携方式を 2 つ用意しています。
- **[WeCom Bot](/hermes/docs/user-guide/messaging/wecom/)** — Bot 形式で、WebSocket でつなぎます。設定が簡単で、グループチャットでも使えます。
- **WeCom Callback**（このページ） — 自社で作るアプリで、暗号化された XML のコールバックを受け取ります。利用者の WeCom のサイドバーに、独立したアプリとして並びます。複数の企業アカウントへの振り分けにも対応します。
:::

あわせて読む: Bot 形式の連携は [WeCom Bot](/hermes/docs/user-guide/messaging/wecom/) を参照してください。

> `hermes gateway setup` を実行して **WeCom Callback** を選ぶと、案内に沿って進められます。

## 仕組み {#how-it-works}

1. WeCom 管理コンソールで、自社で作るアプリケーションを登録します
2. WeCom が、暗号化された XML をあなたの HTTP コールバックのエンドポイントへ送ります
3. Hermes がメッセージを復号し、エージェント向けの待ち行列に入れます
4. すぐに受領を返します（画面には何も表示されません）
5. エージェントが要求を処理します（ふつうは 3〜30 分かかります）
6. 返信は WeCom の `message/send` API を使って、こちらから送り届けます

## 前提 {#prerequisites}

- 管理者権限のある WeCom の企業アカウント
- Python パッケージの `aiohttp` と `httpx`（標準のインストールに含まれます）
- コールバックの URL に使う、外から到達できるサーバー（ngrok のようなトンネルでも構いません）

## 設定 {#setup}

### 1. WeCom で自社製のアプリを作る {#1-create-a-self-built-app-in-wecom}

1. [WeCom 管理コンソール](https://work.weixin.qq.com/) → **Applications** → **Create App** と進みます
2. **Corp ID**（管理コンソールの上部に表示されます）を控えます
3. アプリの設定で **Corp Secret** を作ります
4. アプリの概要ページから **Agent ID** を控えます
5. **Receive Messages** で、コールバックの URL を設定します。
   - URL: `http://YOUR_PUBLIC_IP:8645/wecom/callback`
   - Token: ランダムなトークンを生成します（WeCom が用意してくれます）
   - EncodingAESKey: 鍵を生成します（WeCom が用意してくれます）

### 2. 環境変数を設定する {#2-configure-environment-variables}

`.env` ファイルに次の内容を書き足します。

```bash
WECOM_CALLBACK_CORP_ID=your-corp-id
WECOM_CALLBACK_CORP_SECRET=your-corp-secret
WECOM_CALLBACK_AGENT_ID=1000002
WECOM_CALLBACK_TOKEN=your-callback-token
WECOM_CALLBACK_ENCODING_AES_KEY=your-43-char-aes-key

# Optional
# WECOM_CALLBACK_HOST=  # optional pin; unset = dual-stack (all interfaces, IPv4+IPv6)
WECOM_CALLBACK_PORT=8645
WECOM_CALLBACK_ALLOWED_USERS=user1,user2
```

### 3. ゲートウェイを起動する {#3-start-the-gateway}

```bash
hermes gateway
```

（`hermes gateway start` を使うのは、`hermes gateway install` で systemd / launchd のサービスを登録したあとだけにしてください。）

コールバックのアダプターは、設定したポートで HTTP サーバーを立ち上げます。WeCom はまず GET 要求でコールバックの URL を確認し、その後 POST でメッセージを送り始めます。

## 設定項目の早見表 {#configuration-reference}

`config.yaml` の `platforms.wecom_callback.extra` の下に設定するか、環境変数で指定します。

| 設定 | 既定値 | 説明 |
|---------|---------|-------------|
| `corp_id` | — | WeCom の企業アカウントの Corp ID（必須） |
| `corp_secret` | — | 自社製アプリの Corp Secret（必須） |
| `agent_id` | — | 自社製アプリの Agent ID（必須） |
| `token` | — | コールバックの検証に使うトークン（必須） |
| `encoding_aes_key` | — | コールバックの暗号化に使う 43 文字の AES 鍵（必須） |
| `host` | 未設定（デュアルスタック: すべてのインターフェース、IPv4 と IPv6） | HTTP のコールバックサーバーの待ち受けアドレス |
| `port` | `8645` | HTTP のコールバックサーバーのポート |
| `path` | `/wecom/callback` | コールバックのエンドポイントの URL パス |

## 複数アプリの振り分け {#multi-app-routing}

部署や子会社ごとなど、自社製のアプリを複数動かしている企業では、`config.yaml` で `apps` の一覧を設定します。

```yaml
platforms:
  wecom_callback:
    enabled: true
    extra:
      host: "0.0.0.0"
      port: 8645
      apps:
        - name: "dept-a"
          corp_id: "ww_corp_a"
          corp_secret: "secret-a"
          agent_id: "1000002"
          token: "token-a"
          encoding_aes_key: "key-a-43-chars..."
        - name: "dept-b"
          corp_id: "ww_corp_b"
          corp_secret: "secret-b"
          agent_id: "1000003"
          token: "token-b"
          encoding_aes_key: "key-b-43-chars..."
```

利用者は `corp_id:user_id` の形で切り分けられ、企業アカウントをまたいだ取り違えが起きないようになっています。利用者がメッセージを送ると、アダプターはその人がどのアプリ（企業アカウント）に属するかを記録し、正しいアプリのアクセストークンで返信を送ります。

## アクセス制御 {#access-control}

アプリとやり取りできる利用者を絞ります。

```bash
# Allowlist specific users
WECOM_CALLBACK_ALLOWED_USERS=zhangsan,lisi,wangwu

# Or allow all users
WECOM_CALLBACK_ALLOW_ALL_USERS=true
```

## エンドポイント {#endpoints}

アダプターが用意するのは次のエンドポイントです。

| メソッド | パス | 目的 |
|--------|------|---------|
| GET | `/wecom/callback` | URL 確認のやり取り（設定時に WeCom が送ってきます） |
| POST | `/wecom/callback` | 暗号化されたメッセージのコールバック（利用者のメッセージがここに届きます） |
| GET | `/health` | 稼働確認 — `{"status": "ok"}` を返します |

## 暗号化 {#encryption}

コールバックの中身はすべて、EncodingAESKey を使った AES-CBC で暗号化されています。アダプターは次のように処理します。

- **受信**: XML の中身を復号し、SHA1 の署名を検証します
- **送信**: 返信はこちらから API を呼んで送ります（暗号化したコールバックの応答としては返しません）

暗号処理の実装は、Tencent 公式の WXBizMsgCrypt SDK と互換です。

## できないこと {#limitations}

- **ストリーミングなし** — 返信は、エージェントの処理が終わってから完成した形で届きます
- **入力中の表示なし** — コールバック方式は入力中の状態に対応していません
- **テキストのみ** — 入力として扱えるのは今のところテキストのメッセージだけで、画像・ファイル・音声の入力はまだ実装されていません。送信側のメディア対応（画像、文書、動画、音声）については、WeCom プラットフォームのヒントを通じてエージェントが把握しています。
- **応答までの時間** — エージェントの処理には 3〜30 分かかります。利用者には、処理が終わった時点で返信が表示されます

## 困ったときは {#troubleshooting}

**署名の検証に失敗する。**
WeCom は、管理コンソールで登録した **Token** を使ってすべての要求に署名します。
Hermes に設定したトークンと、管理コンソール側が期待するトークンが食い違っているのが
最もよくある原因です。**Token** と **EncodingAESKey** の両方を管理コンソールから
コピーし直してください。どちらも途中で切れやすい値です。`~/.hermes/.env` の値で
`=` の前後に空白が入っていても、署名の確認は失敗します。直したら
`hermes gateway run` を再起動してください。

**コールバックの URL に届かない / 確認の手順で失敗する。**
WeCom は、あなたが登録した公開の URL にアクセスします。次を確かめてください。
1. リバースプロキシやトンネルが `/wecom/callback` をゲートウェイのポートへ転送していること。
2. 管理コンソールの URL が HTTPS であること（WeCom は素の HTTP を受け付けません）。
3. 自分のネットワークの外から `curl -i https://<your-domain>/wecom/callback`
   を実行して、タイムアウト以外の何かが返ること（クエリ文字列なしで 4xx が返るのは問題ありません。
   待ち受けに届いている、というだけの意味です）。

**ポートに届かない / 待ち受けが開いていない。**
`hermes gateway run` のログで、どのアドレスとポートで待ち受けているか確認してください。
アダプターが `127.0.0.1` で待ち受けている場合は、リバースプロキシかトンネルを前に置く
必要があります。WeCom のサーバーはループバックには届きません。`extra.host` を未設定のままにして
既定のデュアルスタック（すべてのインターフェース、IPv4 と IPv6）で待ち受けるか、`config.yaml` で
インターフェースを固定するか（そのまま外に出すなら `allowed_source_cidrs` も併せて）、
あるいはループバックのままにして Cloudflare Tunnel や nginx のようなトンネルを使ってください。
