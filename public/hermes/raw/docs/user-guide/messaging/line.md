---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "LINE"
description: "Hermes Agent を LINE Messaging API のボットとして設定する"
upstream_path: user-guide/messaging/line.md
upstream_blob: a5ad8e146bd5d534aa6d2136e52ca5d1b29310b2
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/line
---

# LINE の設定 {#line-setup}

公式の LINE Messaging API を通じて、Hermes Agent を [LINE](https://line.me/) のボットとして動かします。アダプターは同梱のプラットフォームプラグインとして `plugins/platforms/line/` に置かれています。コア部分に手を入れる必要はなく、ほかのプラットフォームと同じように有効にするだけです。

LINE は日本・台湾・タイでもっとも使われているメッセージアプリです。相手がその地域にいるなら、ここがつながる場所になります。

> `hermes gateway setup` を実行して **LINE** を選ぶと、手順を案内してもらえます。

## ボットが応答する条件 {#how-the-bot-responds}

| 状況 | 動作 |
|---------|----------|
| **1 対 1 のトーク**（`U` で始まる ID） | すべてのメッセージに応答します |
| **グループトーク**（`C` で始まる ID） | そのグループが許可リストにあるときに応答します |
| **複数人のルーム**（`R` で始まる ID） | そのルームが許可リストにあるときに応答します |

受信側はテキスト・画像・音声・動画・ファイル・スタンプ・位置情報のすべてを扱えます。送信側のテキストは、まず**無料の応答トークン**（1 回だけ使える、約 60 秒の有効期間）を使い、トークンが切れていたら従量課金の Push API に切り替えます。

---

## 手順 1: LINE Messaging API チャネルを作る {#step-1-create-a-line-messaging-api-channel}

1. [LINE Developers コンソール](https://developers.line.biz/console/)を開きます。
2. プロバイダーを作り、その配下に **Messaging API** チャネルを作ります。
3. チャネルの **Basic settings** タブから **Channel secret** をコピーします。
4. **Messaging API** タブで **Channel access token (long-lived)** まで下がり、**Issue** を押します。表示されたトークンをコピーします。
5. 同じ **Messaging API** タブで **Auto-reply messages** と **Greeting messages** も無効にします。ボットの返信とぶつからないようにするためです。

---

## 手順 2: webhook のポートを外から届くようにする {#step-2-expose-the-webhook-port}

LINE は公開された HTTPS 経由で webhook を届けます。既定のポートは `8646` です。変えたいときは `LINE_PORT` で上書きします。

```bash
# Cloudflare Tunnel (recommended for production — fixed hostname)
cloudflared tunnel --url http://localhost:8646

# ngrok (good for dev)
ngrok http 8646

# devtunnel
devtunnel create hermes-line --allow-anonymous
devtunnel port create hermes-line -p 8646 --protocol https
devtunnel host hermes-line
```

表示された `https://...` の URL をコピーします。あとで webhook URL として設定するものです。テスト中は**トンネルを起動したままにしてください**。本番では固定の Cloudflare 名前付きトンネルを用意して、再起動しても webhook URL が変わらないようにします。

---

## 手順 3: Hermes 側を設定する {#step-3-configure-hermes}

`~/.hermes/.env` に次を足します。

```env
LINE_CHANNEL_ACCESS_TOKEN=YOUR_LONG_LIVED_TOKEN
LINE_CHANNEL_SECRET=YOUR_CHANNEL_SECRET

# Allowlist — at least one of these (or LINE_ALLOW_ALL_USERS=true for dev)
LINE_ALLOWED_USERS=U1234567890abcdef...           # comma-separated U-prefixed IDs
LINE_ALLOWED_GROUPS=C1234567890abcdef...          # optional group IDs
LINE_ALLOWED_ROOMS=R1234567890abcdef...           # optional room IDs

# Required for image / audio / video sends — the public HTTPS base URL
# the tunnel resolves to.  Without it, send_image/voice/video will refuse.
LINE_PUBLIC_URL=https://my-tunnel.example.com
```

続いて `~/.hermes/config.yaml` に次を書きます。

```yaml
gateway:
  platforms:
    line:
      enabled: true
```

設定はこれで足ります。`gateway/config.py` の同梱プラグイン走査が `plugins/platforms/line/` を自動で拾います。`Platform.LINE` の列挙値を足す必要も、`_create_adapter` に登録する必要もありません。

---

## 手順 4: webhook URL を設定する {#step-4-set-the-webhook-url}

LINE のコンソールに戻ります。

1. 対象のチャネルを開き、**Messaging API** タブに移ります。
2. **Webhook settings** → **Webhook URL** に `https://<your-tunnel>/line/webhook` を貼ります（末尾の `/line/webhook` を忘れずに。アダプターはそのパスで待ち受けます）。
3. **Verify** を押します。LINE がその URL に接続を試し、200 が返れば成功です。
4. **Use webhook** を **On** に切り替えます。

---

## 手順 5: ゲートウェイを動かす {#step-5-run-the-gateway}

```bash
hermes gateway
```

エージェントのログに次のような行が出ます。

```
LINE: webhook listening on * (all interfaces, IPv4+IPv6):8646/line/webhook (public: https://my-tunnel.example.com)
```

LINE アプリからボットを友だちに追加し（チャネルの **Messaging API** タブにある QR コードを読み取ります）、メッセージを送ってみてください。

---

## LLM の応答が遅いとき {#slow-llm-responses}

LINE の応答トークンは 1 回しか使えず、受信イベントからおよそ 60 秒で失効します。遅い LLM は時間内に返しきれず、そのままだと有料の Push API 呼び出しになってしまいます。

`LINE_SLOW_RESPONSE_THRESHOLD` 秒（既定は `45`）を過ぎても LLM がまだ動いている場合、アダプターは元の応答トークンを使って **Template Buttons** の吹き出しを送ります。

> 🤔 Still thinking. Tap below to fetch the answer when it's ready.
>
> [ Get answer ]

利用者は都合のよいときに **Get answer** を押します。この postback が*新しい*応答トークンを運んでくるので、アダプターはそれを使って保存しておいた答えを送れます（こちらも無料です）。

状態遷移は `PENDING → READY → DELIVERED` で、実行が取り消された場合は `ERROR` になります（`/stop` のあと、宙に浮いた PENDING は "Run was interrupted before completion." に落ち着き、ボタンが押され続ける状態になりません）。

postback のボタンをやめて、常に Push へ切り替えたい場合は次のようにします。

```env
LINE_SLOW_RESPONSE_THRESHOLD=0
```

postback の流れを確実に動かすには、しきい値の前に応答トークンを使ってしまう細かな発話を抑えておきます。

```yaml
# ~/.hermes/config.yaml
display:
  interim_assistant_messages: false
  platforms:
    line:
      tool_progress: off
```

---

## cron と通知の送り先 {#cron-notification-delivery}

```env
LINE_HOME_CHANNEL=Uxxxxxxxxxxxxxxxxxxxx     # default delivery target
```

`deliver: line` を指定した cron ジョブは `LINE_HOME_CHANNEL` に届きます。アダプターは Push 専用の単独送信機能も備えているので、cron がゲートウェイとは別のプロセスで動いていても cron ジョブは届きます。

---

## 環境変数の早見表 {#environment-variable-reference}

| 変数 | 必須 | 既定値 | 説明 |
|---|---|---|---|
| `LINE_CHANNEL_ACCESS_TOKEN` | はい | — | 長期有効のチャネルアクセストークン |
| `LINE_CHANNEL_SECRET` | はい | — | チャネルシークレット（webhook の HMAC-SHA256 検証に使います） |
| `LINE_HOST` | いいえ | 未設定（デュアルスタック: 全インターフェース、IPv4+IPv6） | webhook を待ち受けるホスト |
| `LINE_PORT` | いいえ | `8646` | webhook を待ち受けるポート |
| `LINE_PUBLIC_URL` | メディア送信に必要 | — | 公開 HTTPS のベース URL。画像・音声・動画の送信に要ります |
| `LINE_ALLOWED_USERS` | いずれか 1 つ | — | カンマ区切りのユーザー ID（U で始まるもの） |
| `LINE_ALLOWED_GROUPS` | いずれか 1 つ | — | カンマ区切りのグループ ID（C で始まるもの） |
| `LINE_ALLOWED_ROOMS` | いずれか 1 つ | — | カンマ区切りのルーム ID（R で始まるもの） |
| `LINE_ALLOW_ALL_USERS` | 開発時のみ | `false` | 許可リストを丸ごと省きます |
| `LINE_HOME_CHANNEL` | いいえ | — | cron と通知の既定の送り先 |
| `LINE_SLOW_RESPONSE_THRESHOLD` | いいえ | `45` | postback のボタンが出るまでの秒数（`0` で無効） |
| `LINE_PENDING_TEXT` | いいえ | "🤔 Still thinking…" | postback のボタンと一緒に出す吹き出しの文言 |
| `LINE_BUTTON_LABEL` | いいえ | "Get answer" | ボタンの文言 |
| `LINE_DELIVERED_TEXT` | いいえ | "Already replied ✅" | 送信済みのボタンをもう一度押されたときの返信 |
| `LINE_INTERRUPTED_TEXT` | いいえ | "Run was interrupted before completion." | `/stop` で宙に浮いたボタンを押されたときの返信 |
| `LINE_EXPIRED_TEXT` | いいえ | "That request has expired — send your message again." | 保存していた答えが消えたボタンを押されたときの返信 |

---

## うまくいかないとき {#troubleshooting}

**webhook の検証で "invalid signature" が出る。** `Channel secret` の写し間違いか、トンネルがリクエストの本文を書き換えています。まず `curl -i https://<tunnel>/line/webhook/health` で確かめてください。`{"status":"ok","platform":"line"}` が返るはずです。

**グループで何も受け取らない。** `LINE_ALLOWED_GROUPS` に `C...` のグループ ID が入っているか確認します。グループ ID を調べるには、テストのメッセージを送ってから `~/.hermes/logs/gateway.log` を `LINE: rejecting unauthorized source` で検索します。はじかれた送信元の情報に ID が入っています。

**`send_image` が "LINE_PUBLIC_URL must be set" で失敗する。** LINE の Messaging API はバイナリのアップロードを受け付けません。画像・音声・動画は HTTPS で到達できる URL である必要があります。`LINE_PUBLIC_URL` にトンネルの公開ホスト名を設定すれば、アダプターが `/line/media/<token>/<filename>` からファイルを自動で配ります。

**postback のボタンがいつまでも出ない。** LLM が `LINE_SLOW_RESPONSE_THRESHOLD` より速く返したか、別の吹き出し（ツールの進捗表示やストリーミング）が先に応答トークンを使ってしまっています。「LLM の応答が遅いとき」の抑制設定を見てください。

**"already in use by another profile" が出る。** 同じチャネルアクセストークンが、別に動いている Hermes のプロファイルに結び付いています。もう一方のゲートウェイを止めるか、別のチャネルを使ってください。

---

## できないこと {#limitations}

* **吹き出しと文字数の上限。** LINE のテキストの吹き出しは 1 つあたり 5000 文字までです。長い応答は、Reply／Push の 1 回の呼び出しにつき最大 5 つの吹き出しへ、約 4500 文字ごとに、できるだけ自然な切れ目で分けて送られます。
* **メッセージの編集ができない。** LINE にはメッセージを編集する API がないため、ストリーミング中の応答は必ず新しい吹き出しとして送られ、前のものを書き換えることはありません。
* **Markdown は描画されません。** 太字（`**`）・斜体（`*`）・コードフェンス・見出しは、そのままの文字として表示されます。アダプターは送信前にそれらを取り除きます。URL は残ります（`[label](url)` は `label (url)` になります）。
* **ローディング表示は 1 対 1 のときだけ。** LINE はグループとルームに対して chat/loading の API を受け付けないため、入力中の表示は 1 対 1 のトークでのみ出ます。
