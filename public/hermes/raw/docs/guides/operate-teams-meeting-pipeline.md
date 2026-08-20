---
title: "Teams 会議パイプラインを運用する"
description: "Microsoft Teams 会議パイプラインの運用手順、公開前チェック、運用者用ワークシート"
upstream_path: guides/operate-teams-meeting-pipeline.md
upstream_blob: 93c259cc15e72c26f956ba2abc735039dae8fbe6
sources:
  - https://hermes-agent.nousresearch.com/docs/guides/operate-teams-meeting-pipeline
---

# Teams 会議パイプラインを運用する {#operate-the-teams-meeting-pipeline}

このページは、[Teams の会議](/hermes/docs/user-guide/messaging/teams-meetings/) で機能を有効にし終わったあとに読んでください。

ここで扱う内容は次のとおりです。

- 運用者向け CLI の流れ
- サブスクリプションの定期メンテナンス
- 障害の切り分け
- 公開前の確認
- 展開用ワークシート

## 運用の基本コマンド {#core-operator-commands}

### 設定のスナップショットを検証する {#validate-the-config-snapshot}

```bash
hermes teams-pipeline validate
```

設定を変えたら、まずこれを実行してください。

### トークンの状態を確認する {#inspect-token-health}

```bash
hermes teams-pipeline token-health
hermes teams-pipeline token-health --force-refresh
```

認証の状態が古いままかもしれない、と思ったときは `--force-refresh` を付けます。

### サブスクリプションを確認する {#inspect-subscriptions}

```bash
hermes teams-pipeline subscriptions
```

### 期限が近いサブスクリプションを更新する {#renew-near-expiry-subscriptions}

```bash
hermes teams-pipeline maintain-subscriptions
hermes teams-pipeline maintain-subscriptions --dry-run
```

### サブスクリプション更新の自動化（本番では必須） {#automating-subscription-renewal-required-for-production}

**Microsoft Graph のサブスクリプションは、長くても 72 時間で期限が切れます。** 何も更新しなければ、3 日後に会議の通知が黙って止まり、パイプラインが「壊れた」ように見えます。これは Graph を使った連携すべてに共通する、いちばん多い運用上の失敗です。

`maintain-subscriptions` は必ず定期実行してください。次の 3 つのうちどれかを選びます。

#### 方法 1: Hermes の cron（Hermes ゲートウェイをすでに動かしているならこれ） {#option-1-hermes-cron-recommended-if-you-already-run-the-hermes-gateway}

Hermes には cron のスケジューラーが組み込まれています。`--no-agent` モードは LLM を使わずスクリプトをジョブとして実行するもので、`--script` には `~/.hermes/scripts/` の下にあるファイルを指定します。まずスクリプトを作ります。

```bash
mkdir -p ~/.hermes/scripts
cat > ~/.hermes/scripts/maintain-teams-subscriptions.sh <<'EOF'
#!/usr/bin/env bash
exec hermes teams-pipeline maintain-subscriptions
EOF
chmod +x ~/.hermes/scripts/maintain-teams-subscriptions.sh
```

次に、12 時間ごとに走るスクリプト専用の cron ジョブを登録します（72 時間という期限に対して 6 倍の余裕ができます）。

```bash
hermes cron create "0 */12 * * *" \
  --name "teams-pipeline-maintain-subscriptions" \
  --no-agent \
  --script maintain-teams-subscriptions.sh \
  --deliver local
```

登録できたかを確かめ、次回の実行時刻を見ます。

```bash
hermes cron list
hermes cron status        # scheduler status
```

#### 方法 2: systemd のタイマー（Linux の本番環境ならこれ） {#option-2-systemd-timer-recommended-for-linux-production-deployments}

`/etc/systemd/system/hermes-teams-pipeline-maintain.service` を作ります。

```ini
[Unit]
Description=Hermes Teams pipeline subscription maintenance
After=network-online.target

[Service]
Type=oneshot
User=hermes
EnvironmentFile=/etc/hermes/env
ExecStart=/usr/local/bin/hermes teams-pipeline maintain-subscriptions
```

さらに `/etc/systemd/system/hermes-teams-pipeline-maintain.timer` を作ります。

```ini
[Unit]
Description=Run Hermes Teams pipeline subscription maintenance every 12 hours

[Timer]
OnBootSec=5min
OnUnitActiveSec=12h
Persistent=true

[Install]
WantedBy=timers.target
```

有効にします。

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now hermes-teams-pipeline-maintain.timer
systemctl list-timers hermes-teams-pipeline-maintain.timer
```

#### 方法 3: 素の crontab {#option-3-plain-crontab}

```cron
0 */12 * * * /usr/local/bin/hermes teams-pipeline maintain-subscriptions >> /var/log/hermes/teams-pipeline-maintain.log 2>&1
```

cron の実行環境に `MSGRAPH_*` の認証情報が渡っているか確認してください。いちばん簡単なのは、crontab から呼ぶラッパースクリプトの先頭で `~/.hermes/.env` を読み込むことです。

#### 更新が効いているかを確かめる {#verifying-renewal-is-working}

定期実行を設定したら、最初の実行が終わったあとに更新の様子を確認します。

```bash
hermes teams-pipeline subscriptions   # should show expirationDateTime advanced
hermes teams-pipeline maintain-subscriptions --dry-run   # should show "0 expiring soon" most of the time
```

Graph の Webhook がちょうど 72 時間くらいで理由もなく「動かなくなった」ように見えたら、まず疑うのはここです。更新のジョブは本当に走ったでしょうか。

### 最近のジョブを確認する {#inspect-recent-jobs}

```bash
hermes teams-pipeline list
hermes teams-pipeline list --status failed
hermes teams-pipeline show <job-id>
```

### 保存済みのジョブを再実行する {#replay-a-stored-job}

```bash
hermes teams-pipeline run <job-id>
```

### 会議データの取得を試しに動かす {#dry-run-meeting-artifact-fetches}

```bash
hermes teams-pipeline fetch --meeting-id <meeting-id>
hermes teams-pipeline fetch --join-web-url "<join-url>"
hermes teams-pipeline fetch --join-web-url "<join-url>" --organizer-user-id <entra-user-id>
```

`--organizer-user-id`（主催者の Microsoft Entra ユーザー ID）を渡すと、主催者に紐づいた
`/users/{id}/onlineMeetings` の Graph パスを通って会議を特定できます。Teams の `/meet/`
形式の短い URL では、これが必須です。`/communications/onlineMeetings` のエンドポイントでは
Graph が受け付けてくれません。Webhook から起動したジョブは、通知の `@odata.id` から
主催者を自動的に割り出します。

## 日々の運用手順 {#routine-runbook}

### 初回セットアップの直後 {#after-first-setup}

次の順に実行します。

```bash
hermes teams-pipeline validate
hermes teams-pipeline token-health --force-refresh
hermes teams-pipeline subscriptions
```

そのうえで、実際の会議イベントを起こすか発生を待って、次で確認します。

```bash
hermes teams-pipeline list
hermes teams-pipeline show <job-id>
```

### 毎日、あるいは定期的な確認 {#daily-or-periodic-checks}

- `hermes teams-pipeline maintain-subscriptions --dry-run` を実行する
- `hermes teams-pipeline list --status failed` を確認する
- Teams の配信先が、いまも正しいチャットかチャネルかを確かめる

### Webhook の URL や配信先を変える前に {#before-changing-webhook-urls-or-delivery-targets}

- 公開している通知 URL か、Teams の配信先の設定を更新する
- `hermes teams-pipeline validate` を実行する
- 影響を受けるサブスクリプションを更新するか、作り直す
- 新しいイベントが想定どおりの届け先に流れることを確かめる

## 障害の切り分け {#failure-triage}

### ジョブがまったく作られない {#no-jobs-are-being-created}

確認する点は次のとおりです。

- `msgraph_webhook` が有効になっているか
- 公開している通知 URL が `/msgraph/webhook` を指しているか
- サブスクリプションのクライアント状態が `MSGRAPH_WEBHOOK_CLIENT_STATE` と一致しているか
- サブスクリプションがリモート側にまだ存在し、期限切れになっていないか

### ジョブが再試行のまま止まる、または要約の前に失敗する {#jobs-stay-in-retry-or-fail-before-summarization}

確認する点は次のとおりです。

- 文字起こしの許可と、その有無
- 録画の許可と、ファイルが取得できるか
- 録画へのフォールバックを有効にしているなら `ffmpeg` が入っているか
- Graph のトークンの状態

### 要約はできているのに Teams に届かない {#summaries-are-produced-but-not-delivered-to-teams}

確認する点は次のとおりです。

- `platforms.teams.enabled: true`
- `delivery_mode`
- Webhook モードなら `incoming_webhook_url`
- Graph モードなら `chat_id`、あるいは `team_id` と `channel_id`
- Graph 経由で投稿する場合は Teams の認証設定

### 重複や、意図しない再実行が起きる {#duplicate-or-unexpected-replays}

確認する点は次のとおりです。

- `hermes teams-pipeline run` でジョブを手動で再実行しなかったか
- その会議のレコードが、届け先にすでに存在していないか
- 自分のローカル設定で、意図的に再送の経路を有効にしていないか

## 公開前チェックリスト {#go-live-checklist}

- [ ] Graph の認証情報が揃っていて、内容も正しい
- [ ] `msgraph_webhook` が有効で、インターネットから到達できる
- [ ] `MSGRAPH_WEBHOOK_CLIENT_STATE` が設定されていて、サブスクリプションと一致している
- [ ] 文字起こし用のサブスクリプションを作成済み
- [ ] 音声認識へのフォールバックが必要なら、録画用のサブスクリプションも作成済み
- [ ] 録画へのフォールバックを有効にしているなら `ffmpeg` を導入済み
- [ ] Teams への送信先を設定し、動作を確認済み
- [ ] Notion と Linear の届け先は、本当に必要なときだけ設定してある
- [ ] `hermes teams-pipeline validate` が問題なしのスナップショットを返す
- [ ] `hermes teams-pipeline token-health --force-refresh` が成功する
- [ ] **`maintain-subscriptions` を定期実行に登録済み**（Hermes の cron、systemd のタイマー、crontab のいずれか。[サブスクリプション更新の自動化](#automating-subscription-renewal-required-for-production) を参照）。これがないと Graph のサブスクリプションは 72 時間以内に黙って切れます。
- [ ] 実際の会議イベントが端から端まで通り、ジョブが保存されている
- [ ] 要約が少なくとも 1 件、狙った届け先に到達している

## 配信モードの選び方 {#delivery-mode-decision-guide}

| モード | 向いている場面 | 引き換えになるもの |
|------|----------|--------|
| `incoming_webhook` | Teams に投稿できればよい場合 | 設定はいちばん簡単だが、制御は効きにくい |
| `graph` | Graph 経由でチャネルやチャットに投稿したい場合 | 制御は効くが、認証と配信先の設定が増える |

## 運用者用ワークシート {#operator-worksheet}

展開の前に埋めてください。

| 項目 | 値 |
|------|-------|
| 公開している通知 URL | |
| Graph のテナント ID | |
| Graph のクライアント ID | |
| Webhook のクライアント状態 | |
| 文字起こしリソースのサブスクリプション | |
| 録画リソースのサブスクリプション | |
| Teams の配信モード | |
| Teams のチャット ID、またはチーム／チャネル | |
| Notion のデータベース ID | |
| Linear のチーム ID | |
| 保存先パスの上書き設定（あれば） | |
| 日々の確認の担当者 | |

## 変更レビュー用ワークシート {#change-review-worksheet}

デプロイ内容を変えるときは、この表を先に埋めてください。

| 問い | 答え |
|----------|--------|
| 公開している Webhook の URL を変えるか | |
| Graph の認証情報をローテーションするか | |
| Teams の配信モードを変えるか | |
| 別の Teams チャットやチャネルに移すか | |
| サブスクリプションの作り直しや更新が必要か | |
| 端から端まで通す検証をやり直す必要があるか | |

## 関連ドキュメント {#related-docs}

- [Teams の会議のセットアップ](/hermes/docs/user-guide/messaging/teams-meetings/)
- [Microsoft Teams のボットのセットアップ](/hermes/docs/user-guide/messaging/teams/)
