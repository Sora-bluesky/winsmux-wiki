---
title: "Teams Meetings"
description: "Microsoft Graph の webhook を使って Microsoft Teams の会議要約パイプラインを設定する"
upstream_path: user-guide/messaging/teams-meetings.md
upstream_blob: aca258d37219d4d61683d81e4c3b83be851ff55f
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/teams-meetings
---

# Microsoft Teams の会議 {#microsoft-teams-meetings}

Teams の会議パイプラインは、Microsoft Graph の会議イベントを Hermes に取り込み、まず文字起こしを取りにいき、必要なら録画と音声認識に切り替えて、整った要約を後段の届け先へ送りたいときに使います。

前提として、土台となるボットと認証情報の設定については [Microsoft Teams](/hermes/docs/user-guide/messaging/teams/) を見てください。

> `hermes gateway setup` を実行して **Teams Meetings** を選ぶと、手順を案内してもらえます。

このページで扱うのは、設定と有効化です。
- Graph の認証情報
- webhook リスナーの設定
- Teams への配信モード
- パイプラインの設定の形

運用に入ってからの日々の作業、公開前の確認、運用担当者向けのワークシートについては、専用のガイドを見てください: [Teams 会議パイプラインの運用](/hermes/docs/guides/operate-teams-meeting-pipeline/)。

## この機能でできること {#what-this-feature-does}

パイプラインの流れは次のとおりです。
1. Microsoft Graph の webhook イベントを受け取ります
2. 会議を特定し、まず文字起こしの成果物を優先して取りにいきます
3. 使える文字起こしがない場合は、録画のダウンロードと音声認識に切り替えます
4. ジョブの状態と届け先の記録を、消えない形でローカルに保存します
5. 要約を Notion、Linear、Microsoft Teams へ書き出せます

運用担当者の操作は CLI に集約されています（`teams-pipeline` サブコマンドは `teams_pipeline` プラグインが登録します。`hermes plugins enable teams_pipeline` を実行するか、`config.yaml` に `plugins.enabled: [teams_pipeline]` を書いて有効にしてください）。

```bash
hermes teams-pipeline validate
hermes teams-pipeline list
hermes teams-pipeline maintain-subscriptions
```

## 前提条件 {#prerequisites}

会議パイプラインを有効にする前に、次がそろっているか確かめます。

- 動作している Hermes のインストール
- Teams へ送信したい場合は、すでにある [Microsoft Teams ボットの設定](/hermes/docs/user-guide/messaging/teams/)
- 購読したい会議リソースに必要な権限を持つ、Microsoft Graph のアプリケーション認証情報
- Microsoft Graph が webhook を届けるために呼び出せる、公開された HTTPS URL
- 録画と音声認識への切り替えを使いたい場合は、インストール済みの `ffmpeg`

## ステップ 1: Microsoft Graph の認証情報を追加する {#step-1-add-microsoft-graph-credentials}

アプリ単位の Graph 認証情報を `~/.hermes/.env` に追記します。

```bash
MSGRAPH_TENANT_ID=<tenant-id>
MSGRAPH_CLIENT_ID=<client-id>
MSGRAPH_CLIENT_SECRET=<client-secret>
```

この認証情報は次で使われます。
- Graph クライアントの土台部分
- 購読を保守するコマンド
- 会議の特定と成果物の取得
- Teams 専用のアクセストークンを渡していない場合の、Graph 経由の Teams 送信

## ステップ 2: Graph webhook のリスナーを有効にする {#step-2-enable-the-graph-webhook-listener}

webhook のリスナーは `msgraph_webhook` という名前のゲートウェイプラットフォームです。最低限、これを有効にして clientState の値を設定します。

```bash
MSGRAPH_WEBHOOK_ENABLED=true
MSGRAPH_WEBHOOK_PORT=8646
MSGRAPH_WEBHOOK_CLIENT_STATE=<random-shared-secret>
MSGRAPH_WEBHOOK_ACCEPTED_RESOURCES=communications/onlineMeetings
```

バインドするホストは `config.yaml` にあるプラットフォームの `extra.host` から読み取られます（`MSGRAPH_WEBHOOK_HOST` という環境変数はありません。[webhook リスナーの説明](/hermes/docs/user-guide/messaging/msgraph-webhook/)を参照）。

リスナーが公開するのは次の 2 つです。
- Graph からの通知を受ける `/msgraph/webhook`
- 単純な稼働確認のための `/health`

公開 HTTPS のエンドポイントを、このリスナーへ流し込む必要があります。たとえば公開ドメインが `https://ops.example.com` なら、Graph の通知先 URL はふつう次のようになります。

```text
https://ops.example.com/msgraph/webhook
```

## ステップ 3: Teams への配信とパイプラインの挙動を設定する {#step-3-configure-teams-delivery-and-pipeline-behavior}

会議パイプラインは、実行時の設定をすでにある `teams` プラットフォームの項目から読み取ります。パイプライン固有のつまみは `teams.extra.meeting_pipeline` の下に置きます。Teams への送信設定は、通常の Teams プラットフォームの設定面に置いたままです。

`~/.hermes/config.yaml` の例です。

```yaml
platforms:
  msgraph_webhook:
    enabled: true
    extra:
      host: 127.0.0.1
      port: 8646
      client_state: "replace-me"
      accepted_resources:
        - "communications/onlineMeetings"

  teams:
    enabled: true
    extra:
      client_id: "your-teams-client-id"
      client_secret: "your-teams-client-secret"
      tenant_id: "your-teams-tenant-id"

      # outbound summary delivery
      delivery_mode: "graph" # or incoming_webhook
      team_id: "team-id"
      channel_id: "channel-id"
      # incoming_webhook_url: "https://..."

      meeting_pipeline:
        transcript_min_chars: 80
        transcript_required: false
        transcription_fallback: true
        ffmpeg_extract_audio: true
        notion:
          enabled: false
        linear:
          enabled: false
```

`0.0.0.0` のようにループバック以外のホストへリスナーをバインドする場合は、`allowed_source_cidrs` に Microsoft の webhook 送信元レンジも設定しなければなりません。ループバックへのバインド（`127.0.0.1` / `::1`）は、開発用トンネルやローカルのリバースプロキシと組み合わせる想定の形です。

## Teams への配信モード {#teams-delivery-modes}

パイプラインは、既存の Teams プラグインの中で 2 通りの要約配信モードに対応しています。

### `incoming_webhook` {#incomingwebhook}

Graph 経由でチャネルメッセージを作らず、Teams へ単純に webhook で投稿したいときに使います。

必要な設定は次のとおりです。

```yaml
platforms:
  teams:
    enabled: true
    extra:
      delivery_mode: "incoming_webhook"
      incoming_webhook_url: "https://..."
```

### `graph` {#graph}

Microsoft Graph を通して、Teams のチャットやチャネルへ Hermes に要約を投稿させたいときに使います。

指定できる宛先は次のとおりです。
- `chat_id`
- `team_id` と `channel_id` の組み合わせ
- `team_id` と、既存の Teams プラットフォームの `home_channel` による代替指定

例です。

```yaml
platforms:
  teams:
    enabled: true
    extra:
      delivery_mode: "graph"
      team_id: "team-id"
      channel_id: "channel-id"
```

## ステップ 4: ゲートウェイを起動する {#step-4-start-the-gateway}

設定を更新したら、いつもどおり Hermes を起動します。

```bash
hermes gateway run
```

Docker で Hermes を動かしている場合は、ふだんのデプロイと同じやり方でゲートウェイを起動してください。

リスナーの確認は次のとおりです。

```bash
curl http://localhost:8646/health
```

## ステップ 5: Graph の購読を作成する {#step-5-create-graph-subscriptions}

購読の作成と確認には、プラグインの CLI を使います。

例です。

```bash
hermes teams-pipeline subscribe \
  --resource communications/onlineMeetings/getAllTranscripts \
  --notification-url https://ops.example.com/msgraph/webhook \
  --client-state "$MSGRAPH_WEBHOOK_CLIENT_STATE"

hermes teams-pipeline subscribe \
  --resource communications/onlineMeetings/getAllRecordings \
  --notification-url https://ops.example.com/msgraph/webhook \
  --client-state "$MSGRAPH_WEBHOOK_CLIENT_STATE"
```

:::warning Graph の購読は 72 時間で切れます

Microsoft Graph は webhook の購読を最大 72 時間に制限していて、自動では更新しません。運用に入る前に `hermes teams-pipeline maintain-subscriptions` を定期実行するよう仕込んでください。そうしないと、手動で購読を作ってから 3 日後に、何の知らせもなく通知が止まります。運用手順書の[購読の自動更新](/hermes/docs/guides/operate-teams-meeting-pipeline/#automating-subscription-renewal-required-for-production)に、Hermes の定期実行・systemd タイマー・素の crontab という 3 つの方法があります。

:::

購読の保守や運用に入ってからの流れについては、ガイドへ進んでください: [Teams 会議パイプラインの運用](/hermes/docs/guides/operate-teams-meeting-pipeline/)。

## 検証 {#validation}

組み込みの検証スナップショットを実行します。

```bash
hermes teams-pipeline validate
```

あわせて確認しておくと役に立つコマンドです。

```bash
hermes teams-pipeline token-health
hermes teams-pipeline subscriptions
```

## 困ったときは {#troubleshooting}

| 症状 | 確認すること |
|---------|---------------|
| Graph の webhook 検証に失敗する | 公開 URL が正しく到達できるか、Graph が `/msgraph/webhook` のパスちょうどを呼んでいるかを確かめます |
| `hermes teams-pipeline list` にジョブが出てこない | `msgraph_webhook` が有効か、購読が正しい通知先 URL を指しているかを確かめます |
| 文字起こし優先の取得がいつも失敗する | 文字起こしリソースに対する Graph の権限と、その会議に文字起こしの成果物が実際にあるかを確かめます |
| 録画への切り替えが失敗する | `ffmpeg` が入っているか、Graph のアプリが録画の成果物にアクセスできるかを確かめます |
| Teams への要約配信が失敗する | `delivery_mode`、宛先の ID、Teams の認証設定をもう一度見直します |

## 関連ドキュメント {#related-docs}

- [Microsoft Teams ボットの設定](/hermes/docs/user-guide/messaging/teams/)
- [Teams 会議パイプラインの運用](/hermes/docs/guides/operate-teams-meeting-pipeline/)
