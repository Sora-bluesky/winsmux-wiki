---
title: "LINE"
description: "Hermes Agent を LINE Messaging API のボットとして設定する"
upstream_path: user-guide/messaging/line.md
upstream_blob: abed60427b38a534ad68fd9ef269755e02dfba2b
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/line
---

# LINE の設定 {#line-setup}

公式の LINE Messaging API を使って、Hermes Agent を [LINE](https://line.me/) のボットとして動かします。アダプターは同梱のプラグインとして `plugins/platforms/line/` に入っています。中核に手を入れる必要はなく、ほかの経路と同じように有効にするだけです。

LINE は日本、台湾、タイでいちばん使われているメッセンジャーです。相手がそこにいるなら、これがつながる道になります。

> `hermes gateway setup` を動かして **LINE** を選ぶと、手順に沿って設定できます。

## ボットが返事をする条件 {#how-the-bot-responds}

| 相手 | ふるまい |
|---------|----------|
| **1 対 1 のトーク**（`U` で始まる ID） | すべてのメッセージに返事をします |
| **グループトーク**（`C` で始まる ID） | そのグループが許可の一覧にあるときに返事をします |
| **複数人のトークルーム**（`R` で始まる ID） | そのルームが許可の一覧にあるときに返事をします |

受信は、文字、画像、音声、動画、ファイル、スタンプ、位置情報のいずれにも対応します。送信はまず **無料の応答トークン** を使い（一度きりで、およそ 60 秒のあいだ有効です）、期限が切れていたら課金対象の Push API に切り替えます。

---

## ステップ 1: LINE Messaging API のチャネルを作る {#step-1-create-a-line-messaging-api-channel}

1. [LINE Developers コンソール](https://developers.line.biz/console/) を開きます。
2. プロバイダーを作り、その下に **Messaging API** のチャネルを作ります。
3. チャネルの **チャネル基本設定** のタブから、**チャネルシークレット** をコピーします。
4. **Messaging API** のタブで **チャネルアクセストークン（長期）** まで進み、**発行** を押します。出てきたトークンをコピーします。
5. 同じ **Messaging API** のタブで、**応答メッセージ** と **あいさつメッセージ** を無効にします。有効なままだと、ボットの返事とぶつかります。

---

## ステップ 2: Webhook のポートを外から届くようにする {#step-2-expose-the-webhook-port}

LINE は Webhook を公開された HTTPS 経由で届けます。ポートの初期値は `8646` で、必要なら `LINE_PORT` で変えられます。

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

出てきた `https://...` の URL をコピーします。このあと Webhook の URL として設定します。試しているあいだは **トンネルを止めないでください**。本番では、再起動しても URL が変わらないよう、Cloudflare の名前付きトンネルを用意しておくのがおすすめです。

---

## ステップ 3: Hermes を設定する {#step-3-configure-hermes}

`~/.hermes/.env` に書き足します。

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

続いて `~/.hermes/config.yaml` に書きます。

```yaml
gateway:
  platforms:
    line:
      enabled: true
```

これで十分です。`gateway/config.py` が同梱のプラグインを走査して、`plugins/platforms/line/` を自動で拾います。`Platform.LINE` の列挙に手を入れる必要も、`_create_adapter` に登録する必要もありません。

---

## ステップ 4: Webhook の URL を設定する {#step-4-set-the-webhook-url}

LINE のコンソールに戻ります。

1. 自分のチャネルを開き、**Messaging API** のタブへ進みます。
2. **Webhook 設定** の **Webhook URL** に、`https://<your-tunnel>/line/webhook` を貼り付けます（末尾の `/line/webhook` を忘れずに。アダプターはそこで待ち受けます）。
3. **検証** を押します。LINE がその URL に問い合わせるので、200 が返れば成功です。
4. **Webhook の利用** を **オン** にします。

---

## ステップ 5: ゲートウェイを動かす {#step-5-run-the-gateway}

```bash
hermes gateway
```

エージェントの記録に、次のように出ます。

```
LINE: webhook listening on * (all interfaces, IPv4+IPv6):8646/line/webhook (public: https://my-tunnel.example.com)
```

LINE のアプリからボットを友だちに追加し（チャネルの **Messaging API** のタブにある QR コードを読み取ります）、メッセージを送ってみてください。

---

## LLM の返事が遅いとき {#slow-llm-responses}

LINE の応答トークンは一度きりで、メッセージが届いてからおよそ 60 秒で切れます。返事の遅い LLM は間に合わず、そのままだと課金対象の Push API を使うことになります。

LLM の処理が `LINE_SLOW_RESPONSE_THRESHOLD` 秒（初期値は `45`）を超えて続いているとき、アダプターは元の応答トークンを使って **テンプレートのボタン** の吹き出しを送ります。

> 🤔 Still thinking. Tap below to fetch the answer when it's ready.
>
> [ Get answer ]

読む人は、都合のいいときに **Get answer** を押します。その操作で *新しい* 応答トークンが渡されるので、アダプターはそれを使って、取っておいた答えを送ります（こちらも無料のままです）。

状態は `PENDING → READY → DELIVERED` と移ります。取り消された処理には `ERROR` が付きます（`/stop` のあとに取り残された PENDING は「Run was interrupted before completion.」として片づけられ、残ったボタンが押され続けることはありません）。

このボタンをやめて、いつでも Push に切り替えたい場合は次のようにします。

```env
LINE_SLOW_RESPONSE_THRESHOLD=0
```

このボタンの仕組みを確実に働かせるには、しきい値に達する前に応答トークンを使ってしまう、途中のおしゃべりを止めておきます。

```yaml
# ~/.hermes/config.yaml
display:
  interim_assistant_messages: false
  platforms:
    line:
      tool_progress: off
```

---

## 定期実行と通知の届け先 {#cron-notification-delivery}

```env
LINE_HOME_CHANNEL=Uxxxxxxxxxxxxxxxxxxxx     # default delivery target
```

`deliver: line` を指定した定期実行の仕事は `LINE_HOME_CHANNEL` に届きます。アダプターには Push 専用の単体の送信機能も入っているので、定期実行がゲートウェイとは別のプロセスで動いていても届きます。

---

## 環境変数の一覧 {#environment-variable-reference}

| 変数 | 必須 | 初期値 | 説明 |
|---|---|---|---|
| `LINE_CHANNEL_ACCESS_TOKEN` | はい | — | 長期のチャネルアクセストークン |
| `LINE_CHANNEL_SECRET` | はい | — | チャネルシークレット（Webhook の検証に HMAC-SHA256 で使います） |
| `LINE_HOST` | いいえ | 未設定（IPv4 と IPv6 の全インターフェース） | Webhook を待ち受けるホスト |
| `LINE_PORT` | いいえ | `8646` | Webhook を待ち受けるポート |
| `LINE_PUBLIC_URL` | メディアを送るなら必要 | — | 公開された HTTPS の基点となる URL。画像・音声・動画の送信に必要です |
| `LINE_ALLOWED_USERS` | いずれか一つ | — | 利用者の ID をカンマ区切りで指定（U で始まるもの） |
| `LINE_ALLOWED_GROUPS` | いずれか一つ | — | グループの ID をカンマ区切りで指定（C で始まるもの） |
| `LINE_ALLOWED_ROOMS` | いずれか一つ | — | ルームの ID をカンマ区切りで指定（R で始まるもの） |
| `LINE_ALLOW_ALL_USERS` | 開発時のみ | `false` | 許可の一覧をまったく使わない |
| `LINE_HOME_CHANNEL` | いいえ | — | 定期実行や通知の既定の届け先 |
| `LINE_SLOW_RESPONSE_THRESHOLD` | いいえ | `45` | ボタンを出すまでの秒数（`0` で無効） |
| `LINE_PENDING_TEXT` | いいえ | "🤔 Still thinking…" | ボタンと一緒に出す吹き出しの文章 |
| `LINE_BUTTON_LABEL` | いいえ | "Get answer" | ボタンの文字 |
| `LINE_DELIVERED_TEXT` | いいえ | "Already replied ✅" | 届け終わったボタンをもう一度押したときの返事 |
| `LINE_INTERRUPTED_TEXT` | いいえ | "Run was interrupted before completion." | `/stop` で取り残されたボタンを押したときの返事 |

---

## 困ったときは {#troubleshooting}

**Webhook の検証で「invalid signature」と出る。** `Channel secret` の写し間違いか、トンネルが本文を書き換えています。まず `curl -i https://<tunnel>/line/webhook/health` で確かめてください。`{"status":"ok","platform":"line"}` が返るはずです。

**グループで何も受け取らない。** `LINE_ALLOWED_GROUPS` に `C...` で始まるグループの ID が入っているか確かめます。グループの ID を知るには、試しにメッセージを送ってから `~/.hermes/logs/gateway.log` を `LINE: rejecting unauthorized source` で検索します。はねられた相手の情報に ID が入っています。

**`send_image` が「LINE_PUBLIC_URL must be set」で失敗する。** LINE の Messaging API はファイルそのものの送信を受け付けません。画像、音声、動画は HTTPS で取りにいける URL である必要があります。`LINE_PUBLIC_URL` にトンネルの公開ホスト名を設定すれば、アダプターが `/line/media/<token>/<filename>` からファイルを配ります。

**ボタンがまったく出てこない。** LLM が `LINE_SLOW_RESPONSE_THRESHOLD` より早く答えたか、ほかの吹き出し（道具の進み具合や、流しながらの返事）が先に応答トークンを使ってしまっています。「LLM の返事が遅いとき」にある、止め方の設定を見てください。

**「already in use by another profile」と出る。** 同じチャネルアクセストークンが、動いている別の Hermes のプロファイルにひもづいています。もう一方のゲートウェイを止めるか、別のチャネルを使ってください。

---

## できないこと {#limitations}

* **吹き出しと長さの上限。** LINE の一つの吹き出しは 5000 文字までです。長い返事はおよそ 4500 文字ごとに、なるべく切りのよいところで分けられ、一回の Reply / Push につき最大 5 つの吹き出しとして送られます。
* **送ったメッセージを直せません。** LINE にはメッセージを編集する API がないため、流しながらの返事はつねに新しい吹き出しになり、前のものが書き換わることはありません。
* **Markdown は表示されません。** 太字（`**`）、斜体（`*`）、コードの囲い、見出しは、そのままの記号として出てしまいます。アダプターは送る前にこれらを取り除きます。URL は残ります（`[label](/hermes/docs/user-guide/messaging/url/)` は `label (url)` になります）。
* **入力中の表示は 1 対 1 のときだけです。** LINE はグループとルームでは入力中を示す API を受け付けないので、この表示は 1 対 1 のトークにだけ出ます。
