---
title: "Teams Meeting Pipeline — Teams の会議のまとめ、ジョブの再実行、Graph の購読"
description: "Teams の会議のまとめ、ジョブの再実行、Graph の購読"
upstream_path: user-guide/skills/bundled/productivity/productivity-teams-meeting-pipeline.md
upstream_blob: ff5476a0536866b9cd13dab810baeb6f594c1e57
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/productivity/productivity-teams-meeting-pipeline
---

# Teams Meeting Pipeline {#teams-meeting-pipeline}

Teams の会議のまとめ、ジョブの再実行、Graph の購読を扱います。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/productivity\teams-meeting-pipeline` |
| バージョン | `1.1.0` |
| 作者 | Hermes Agent + Teknium |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Teams`, `Microsoft Graph`, `Meetings`, `Productivity`, `Operations` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Teams Meeting Pipeline {#teams-meeting-pipeline}

Microsoft Teams の会議のまとめ、文字起こし、録画、やることの洗い出し、Graph の購読、あるいはこの会議処理の流れについての運用上の質問が出たときは、いつでもこの skill を使ってください。どの言語でも動きます。下に挙げた呼び出しのきっかけは例であって、これがすべてではありません。

運用する人が触る操作はすべて、terminal ツールから実行する `hermes teams-pipeline` のサブコマンドです。この処理の流れのために新しいモデル用のツールが増えることはありません。コマンドが入り口です。

## この skill を使う場面 {#when-to-use-this-skill}

次のようなことを頼まれたとき:
- Teams の会議をまとめる / やることを洗い出す / 会議のメモを取り出す
- 処理の状態を確かめる、保存されたジョブの中身を見る、最近の会議を見る
- 失敗した、あるいはまとめ直したいジョブをもう一度実行する
- 環境変数や設定を変えたあとに Microsoft Graph の設定を確かめる
- 「会議のまとめが届かない」「新しい会議が取り込まれない」を調べる
- Graph の webhook の購読を管理する（作成、更新、削除、確認）
- 購読の自動更新を用意する（下の落とし穴を参照）

呼び出しのきっかけの例（多言語。これがすべてではありません）:
- 英語: "summarize the Teams meeting"、"pipeline status"、"replay job X"
- トルコ語: "Teams meeting özetle"、"action item çıkar"、"toplantı notu"、"pipeline durumu"、"replay job"

## 事前に必要なもの {#prerequisites}

使い始める前に、`${HERMES_HOME:-~/.hermes}/.env` に次が設定されているか確かめてください:

```bash
MSGRAPH_TENANT_ID=...
MSGRAPH_CLIENT_ID=...
MSGRAPH_CLIENT_SECRET=...
```

足りないものがあれば、`/docs/guides/microsoft-graph-app-registration` の Azure でのアプリ登録の手引きを案内してください。この流れを動かすには、管理者の同意を得た Graph のアプリケーション権限を持つ Azure AD のアプリ登録が先に必要です。

## コマンド一覧 {#command-reference}

### 状態の確認（まずここから） {#status-and-inspection-start-here}

```bash
hermes teams-pipeline validate              # config snapshot — run first after any change
hermes teams-pipeline token-health          # Graph token status
hermes teams-pipeline token-health --force-refresh   # force a fresh token acquisition
hermes teams-pipeline list                  # recent meeting jobs
hermes teams-pipeline list --status failed  # only failed jobs
hermes teams-pipeline show <job-id>         # full detail of one job
hermes teams-pipeline subscriptions         # current Graph webhook subscriptions
```

### もう一度実行する・調べる {#re-running-debugging}

```bash
hermes teams-pipeline run <job-id>          # replay a stored job (re-summarize, re-deliver)
hermes teams-pipeline fetch --meeting-id <id>   # dry-run: resolve meeting + transcript without persisting
hermes teams-pipeline fetch --join-web-url "<url>"   # dry-run by join URL
hermes teams-pipeline fetch --join-web-url "<url>" --organizer-user-id <id>   # organizer-scoped lookup (required for /meet/ short URLs)
```

### 購読の管理 {#subscription-management}

```bash
hermes teams-pipeline subscribe \
  --resource communications/onlineMeetings/getAllTranscripts \
  --notification-url https://<your-public-host>/msgraph/webhook \
  --client-state "$MSGRAPH_WEBHOOK_CLIENT_STATE"

hermes teams-pipeline renew-subscription <sub-id> --expiration <iso-8601>
hermes teams-pipeline delete-subscription <sub-id>
hermes teams-pipeline maintain-subscriptions            # renew near-expiry ones
hermes teams-pipeline maintain-subscriptions --dry-run  # show what would be renewed
```

## よくある依頼への進め方 {#decision-tree-for-common-asks}

- 「今日の会議のまとめが来ないのはなぜ?」→ まず `list --status failed`、次に該当する行に対して `show <job-id>`。ジョブそのものが見当たらないときは `subscriptions` を確かめてください。webhook の期限が切れている可能性があります（下の落とし穴を参照）。
- 「設定はうまくいってる?」→ `validate`、続いて `token-health`、`subscriptions`。3 つとも通ったら、試しに会議を開いてもらい、`list` に新しい行が出るか確かめます。
- 「会議 X のまとめをやり直して」→ `list` でジョブ ID を探し、`run <job-id>` でもう一度実行します。また失敗するようなら、`show <job-id>` でエラーを見て、`fetch --meeting-id` で素材の取得だけを試してください。
- 「会議 X をこの流れに足して」→ たいていは足しません。この流れは購読を起点に動くもので、会議ごとに登録するものではありません。過去の特定の会議をまとめたいのであれば、`fetch` で文字起こしを取り、ジョブができてから `run` します。

## 重大な落とし穴: Graph の購読は 72 時間で切れます {#critical-pitfall-graph-subscriptions-expire-in-72-hours}

Microsoft Graph は webhook の購読を最長 72 時間に制限しており、**自動では更新しません**。`maintain-subscriptions` を定期実行にしていないと、手で購読を作ってから 3 日後に、会議の通知が何も言わずに届かなくなります。

「昨日までは動いていたのに、今日は何も来ない」と言われたときは:
1. `hermes teams-pipeline subscriptions` を実行します。何も出ないか、すべての項目の `expirationDateTime` が過去になっていれば、それが原因です。
2. 上に示した `subscribe` で作り直します。
3. **すぐに自動更新を用意します**。`hermes cron add`、systemd のタイマー、ふつうの crontab のいずれでも構いません。`/docs/guides/operate-teams-meeting-pipeline#automating-subscription-renewal-required-for-production` の運用手順書に 3 つとも書いてあります。12 時間おきなら安全です（72 時間の制限に対して 6 倍の余裕があります）。

## そのほかの落とし穴 {#other-pitfalls}

- **文字起こしがまだできていない。** Teams は会議が終わってから文字起こしを作るまでに少し時間がかかります。終わったばかりの会議に `fetch --meeting-id` を実行すると、何も返らないことがあります。2〜5 分待ってからやり直すか、Graph の webhook にまかせて自然に取り込ませてください。
- **配信方法の食い違い。** まとめはできている（`list` に成功と出る）のに Teams に何も届かないときは、`platforms.teams.extra.delivery_mode` と、それに対応する送り先の設定（`incoming_webhook_url` か `chat_id` か `team_id`+`channel_id`）を確かめてください。書き込み側はこれらを config.yaml か `TEAMS_*` の環境変数から読みます。
- **Graph のアプリ権限。** トークンは問題なく取れる（`token-health` が通る）のに、Graph の API 呼び出しが 401/403 を返すときは、権限を足したあとに管理者の同意を取り直していないことがあります。Azure ポータルのアプリ登録に戻って、もう一度「管理者の同意を与える」を押してもらってください。

## 関連する資料 {#related-docs}

この skill でまかなえる範囲より詳しい説明が必要なときは、次を案内してください:
- Azure でのアプリ登録の手順: `/docs/guides/microsoft-graph-app-registration`
- 処理の流れの設定の全体: `/docs/user-guide/messaging/teams-meetings`
- 運用手順書（更新の自動化、調べ方、公開前の確認）: `/docs/guides/operate-teams-meeting-pipeline`
- webhook の受け口の設定: `/docs/user-guide/messaging/msgraph-webhook`
