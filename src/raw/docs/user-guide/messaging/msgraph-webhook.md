---
title: "Microsoft Graph webhook リスナー"
description: "Microsoft Graph の変更通知（会議・予定表・チャットなど）を Hermes で受け取る"
upstream_path: user-guide/messaging/msgraph-webhook.md
upstream_blob: eb1cb1dec9bc83166e727c93b3d07cae129dd04d
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/msgraph-webhook
---

# Microsoft Graph webhook リスナー {#microsoft-graph-webhook-listener}

`msgraph_webhook` というゲートウェイプラットフォームは、受信専用のイベントリスナーです。「Teams の会議が終わった」「このチャットに新しいメッセージが届いた」「この予定が更新された」といった、Microsoft Graph からの**変更通知**を Hermes が受け取るための仕組みです。`teams` プラットフォーム（利用者が話しかけるチャットボット）とは役割が違い、こちらは人ではなく M365 が「何かが起きた」と Hermes に伝えてくるものです。

いまのところ主な使い手は Teams の会議要約パイプラインです。会議の文字起こしができたと Graph が知らせ、パイプラインがそれを取得し、Hermes が要約を Teams へ投稿します。ほかの Graph リソース（`/chats/.../messages`、`/users/.../events`）も同じリスナーを使い、それらを消費する側はそれぞれの PR で入ってきます。

## 前提条件 {#prerequisites}

- Microsoft Graph のアプリケーション認証情報 — [Microsoft Graph アプリケーションを登録する](/hermes/docs/guides/microsoft-graph-app-registration/)
- Microsoft Graph が到達できる**公開された HTTPS URL**（Graph は非公開のエンドポイントを呼びません）。試すだけなら開発用トンネルで足りますが、本番では有効な証明書の付いた実際のドメインが要ります
- `clientState` の値として使う、強度のある共有シークレット。`openssl rand -hex 32` で生成し、`~/.hermes/.env` に `MSGRAPH_WEBHOOK_CLIENT_STATE` として置きます

## すぐに動かす {#quick-start}

最小限の `~/.hermes/config.yaml` は次のとおりです。

```yaml
platforms:
  msgraph_webhook:
    enabled: true
    extra:
      host: 127.0.0.1
      port: 8646
      client_state: "replace-with-a-strong-secret"
      accepted_resources:
        - "communications/onlineMeetings"
```

`~/.hermes/.env` の環境変数で書くこともできます（起動時に自動でまとめられます）。

```bash
MSGRAPH_WEBHOOK_ENABLED=true
MSGRAPH_WEBHOOK_PORT=8646
MSGRAPH_WEBHOOK_CLIENT_STATE=<generate-with-openssl-rand-hex-32>
MSGRAPH_WEBHOOK_ACCEPTED_RESOURCES=communications/onlineMeetings
```

補足: バインドするホストは `config.yaml` の `extra.host` から読まれます（上の例を参照）。`MSGRAPH_WEBHOOK_HOST` という環境変数での上書きはありません。

`hermes gateway run` でゲートウェイを起動します。リスナーが公開するのは次のとおりです。

- `POST /msgraph/webhook` — Graph からの変更通知
- `GET /msgraph/webhook?validationToken=...` — Graph の購読を検証するやり取り
- `GET /health` — 受理数と重複数のカウンターが付いた稼働確認

リスナーは外部から届く形にしてください（リバースプロキシ、開発用トンネル、Ingress など）。Graph の購読に指定する通知先 URL は、自分の公開 HTTPS のオリジンに `/msgraph/webhook` を付けたものです。

```
https://ops.example.com/msgraph/webhook
```

## 設定 {#configuration}

設定はすべて `platforms.msgraph_webhook.extra` の下に置きます。

| 設定項目 | 既定値 | 説明 |
|---------|---------|-------------|
| `host` | 未設定（デュアルスタック: 全インターフェース、IPv4+IPv6） | HTTP リスナーのバインドアドレス。ループバック以外にバインドする場合は `allowed_source_cidrs` が必要です。ループバック（`127.0.0.1` / `::1`）が、開発用トンネルやリバースプロキシと組み合わせるいちばん手軽な形です。 |
| `port` | `8646` | バインドするポート。 |
| `webhook_path` | `/msgraph/webhook` | Graph が POST してくる URL のパス。 |
| `health_path` | `/health` | 稼働確認用のエンドポイント。 |
| `client_state` | — | Graph がすべての通知に含めて返してくる共有シークレット。`hmac.compare_digest` で比較されます。`openssl rand -hex 32` で生成してください。 |
| `accepted_resources` | `[]`（すべて受理） | Graph のリソースパス/パターンの許可リスト。末尾の `*` は前方一致として働きます。先頭の `/` は付いていても構いません。例: `["communications/onlineMeetings", "chats/*/messages"]`。 |
| `max_seen_receipts` | `5000` | 通知 ID の重複判定キャッシュの大きさ。上限に達すると古いものから捨てられます。 |
| `allowed_source_cidrs` | `[]` | ループバック以外にバインドする場合は必須。空のままにしてよいのは、リスナーをループバックにバインドし、手元のトンネルやリバースプロキシを前に置いているときだけです。 |

ほとんどの設定には対応する環境変数（`MSGRAPH_WEBHOOK_*`）があり、ゲートウェイの起動時に設定へ取り込まれます（例外は `host` で、これは設定ファイル専用です。上の補足を参照）。詳しくは[環境変数の一覧](/hermes/docs/reference/environment-variables/#microsoft-graph-teams-meetings)を見てください。

## セキュリティを固める {#security-hardening}

### clientState が中心の認証チェックです {#clientstate-is-the-primary-auth-check}

Graph からの通知には、購読時に登録した `clientState` の文字列が必ず入っています。リスナーは `clientState` が一致しない通知を、時間差で情報が漏れない比較方法で拒否します。これは Microsoft が公式に案内している仕組みなので、この値は強度のある共有シークレットとして扱ってください。

`client_state` が未設定の場合、リスナーは起動を拒否します。

### 送信元 IP の許可リスト（本番環境） {#source-ip-allowlisting-production-deployments}

本番では、Microsoft が公開している Graph webhook の送信元 IP レンジにリスナーを限定します。Microsoft は送信元レンジを [Office 365 IP アドレスと URL の Web サービス](https://learn.microsoft.com/en-us/microsoft-365/enterprise/urls-and-ip-address-ranges)で公開しています。次のように設定します。

```yaml
platforms:
  msgraph_webhook:
    enabled: true
    extra:
      host: 0.0.0.0
      client_state: "..."
      allowed_source_cidrs:
        - "52.96.0.0/14"
        - "52.104.0.0/14"
        # ...add the current Microsoft 365 "Common" + "Teams" category egress ranges
```

環境変数でも書けます。

```bash
MSGRAPH_WEBHOOK_ALLOWED_SOURCE_CIDRS="52.96.0.0/14,52.104.0.0/14"
```

`0.0.0.0` や `::`、LAN の IP といったループバック以外のホストへ `allowed_source_cidrs` なしでバインドしようとすると、起動時に拒否されます。開発用トンネルや同じマシンのリバースプロキシを使っているなら、Hermes は `127.0.0.1` か `::1` にバインドして、許可リストは空のままにしてください。CIDR の書き方が不正な場合は警告をログに出して無視します。**Microsoft の IP 一覧は四半期ごとに見直してください** — 変わります。

### HTTPS の終端 {#https-termination}

リスナーが話すのはプレーンな HTTP です。TLS はリバースプロキシ（Caddy、Nginx、Cloudflare Tunnel、AWS ALB など）で終端し、ローカルのネットワーク越しにリスナーへ渡してください。Graph は HTTPS でないエンドポイントには配信しないので、Graph からの通信が暗号化されないまま届く経路はそもそもありません。

### 応答の作法 {#response-hygiene}

成功したとき、リスナーは本文が空の `202 Accepted` を返します。内部のカウンターは応答に載せません。運用担当者は `/health` から件数を見られます。こちらも webhook のパスと同じ送信元 IP の規則で守られています。

ステータスコードの一覧です。

| 結果 | ステータス |
|---------|--------|
| 通知を受理した、または重複として処理した | 202 |
| 検証のやり取り（`validationToken` 付きの GET） | 200（トークンをそのまま返します） |
| バッチ内のすべての項目が clientState 不一致 | 403 |
| JSON が壊れている / `value` 配列がない / 未知のリソース | 400 |
| 送信元 IP が許可リストにない | 403 |
| `validationToken` のない素の GET | 400 |

## 困ったときは {#troubleshooting}

| 症状 | 確認すること |
|---------|---------------|
| Graph の購読検証に失敗する | 公開 URL に到達できること、`/msgraph/webhook` のパスが一致していること、`validationToken` 付きの GET に対して 10 秒以内にトークンをそのまま `text/plain` で返していること。 |
| 通知は POST されるのに何も取り込まれない | `client_state` が購読の登録時の値と一致しているか。値がずれていたら `openssl rand -hex 32` をやり直して購読を作り直します。`accepted_resources` に Graph が送ってくるリソースパスが含まれているかも確認します。 |
| すべての通知が 403 になる | `clientState` の不一致です（偽装か、別の値で購読を登録している）。`hermes teams-pipeline subscribe --client-state "$MSGRAPH_WEBHOOK_CLIENT_STATE" ...` で購読を作り直してください（パイプラインのランタイムの PR に同梱されています）。 |
| `0.0.0.0` ではリスナーが起動を拒否する | `allowed_source_cidrs` に Microsoft の現在の webhook 送信元レンジを設定するか、トンネルやリバースプロキシの後ろで Hermes を `127.0.0.1` / `::1` にバインドしてください。 |
| リスナーは起動するのに `curl http://localhost:8646/health` が返ってこない | ポートの取り合いです。`ss -tlnp \| grep 8646` を確認し、必要なら `port:` を変えてください。 |
| Microsoft からの本物の Graph リクエストが 403 になる | 送信元 IP の許可リストが狭すぎます。Microsoft の現在の送信元レンジを含むように広げてください。まだトンネル経路を確かめている段階なら、Hermes はループバックにバインドして、外部への公開はトンネルに任せます。 |

## 関連ドキュメント {#related-docs}

- [Microsoft Graph アプリケーションを登録する](/hermes/docs/guides/microsoft-graph-app-registration/) — Azure でのアプリ登録という前提作業
- [環境変数 → Microsoft Graph](/hermes/docs/reference/environment-variables/#microsoft-graph-teams-meetings) — 環境変数の全一覧
- [Microsoft Teams ボットの設定](/hermes/docs/user-guide/messaging/teams/) — 利用者が Teams で Hermes と会話するための、別のプラットフォーム
