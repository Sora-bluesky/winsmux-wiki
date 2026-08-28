---
title: "定期実行がうまくいかないとき"
description: "Hermes の定期実行でよく起きる不具合を切り分けて直します。ジョブが動かない、配信が届かない、スキルが読み込めない、動きが遅いといった症状をあつかいます"
upstream_path: guides/cron-troubleshooting.md
upstream_blob: b58d60d67d81a0a38371036579da919a6c172909
sources:
  - https://hermes-agent.nousresearch.com/docs/guides/cron-troubleshooting
---

# 定期実行がうまくいかないとき {#cron-troubleshooting}

定期実行のジョブが思ったとおりに動かないときは、ここに並べた順で確かめていきます。原因のほとんどは、時刻・配信・権限・スキルの読み込みという 4 つのどれかに収まります。

---

## ジョブが動かない {#jobs-not-firing}

### 確認 1: ジョブが存在していて、動く状態になっているか {#check-1-verify-the-job-exists-and-is-active}

```bash
hermes cron list
```

一覧に目当てのジョブがあるか、そして状態が `[active]` になっているか（`[paused]` や `[completed]` ではないか）を見ます。`[completed]` になっているなら、繰り返し回数を使い切ったのかもしれません。ジョブを編集して回数を入れ直してください。

### 確認 2: スケジュールの書き方が正しいか {#check-2-confirm-the-schedule-is-correct}

書式を間違えたスケジュールは、何も言わずに 1 回きりの実行に変わるか、そもそも受け付けられません。自分の書いた式が何時に当たるのか確かめてください。

| 書いた式 | 意味すること |
|----------------|-------------------|
| `0 9 * * *` | 毎日 午前 9:00 |
| `0 9 * * 1` | 毎週月曜 午前 9:00 |
| `every 2h` | 今から 2 時間おき |
| `30m` | 今から 30 分後 |
| `2025-06-01T09:00:00` | 2025 年 6 月 1 日 午前 9:00（UTC） |

1 回動いたあとに一覧から消えるなら、それは 1 回きりのスケジュール（`30m`、`1d`、または ISO 形式の日時）です。故障ではなく、そういう動きです。

### 確認 3: ゲートウェイは動いているか {#check-3-is-the-gateway-running}

定期実行のジョブは、ゲートウェイの裏で動く時計スレッドが動かしています。この時計は 60 秒ごとに時を刻みます。ふつうの CLI のチャットを開いているだけでは、ジョブは**動きません**。

放っておいてもジョブが動く状態にしたいなら、ゲートウェイを動かしておく必要があります（前面で動かすなら `hermes gateway`、サービスとして入れてあるなら `hermes gateway start`）。その場かぎりの切り分けであれば、`hermes cron tick` で時計を手動で 1 目盛り進められます。

**デスクトップアプリの場合:** デスクトップの主バックエンドは自前の時計を持っていて、**ローカルにあるすべてのプロファイル**の定期実行を見ています。そのため、別のプロファイルのバックエンドが眠っていても、そのプロファイルのジョブは動き続けます（デスクトップは使っていないプロファイルのバックエンドを 10 分ほどで眠らせます）。予定したジョブを動かすために、そのプロファイルを開いたままにしておく必要はありません。

### 確認 4: 端末の時計とタイムゾーン {#check-4-check-the-system-clock-and-timezone}

ジョブはローカルのタイムゾーンで動きます。端末の時計がずれていたり、思っているのと違うタイムゾーンになっていたりすると、意図しない時刻にジョブが動きます。次のコマンドで見比べてください。

```bash
date
hermes cron list   # Compare next_run times with local time
```

---

## 配信が届かない {#delivery-failures}

### 確認 1: 配信先の指定が正しいか {#check-1-verify-the-deliver-target-is-correct}

配信先の名前は大文字と小文字を区別します。加えて、その配信先のプラットフォームを設定しておく必要があります。指定を間違えると、返答は何も告げずに捨てられます。

| 配信先 | 必要なもの |
|--------|----------|
| `telegram` | `~/.hermes/.env` の `TELEGRAM_BOT_TOKEN` |
| `discord` | `~/.hermes/.env` の `DISCORD_BOT_TOKEN` |
| `slack` | `~/.hermes/.env` の `SLACK_BOT_TOKEN` |
| `whatsapp` | WhatsApp ゲートウェイの設定 |
| `signal` | Signal ゲートウェイの設定 |
| `matrix` | Matrix ホームサーバーの設定 |
| `email` | `config.yaml` での SMTP 設定 |
| `sms` | SMS 事業者の設定 |
| `local` | `~/.hermes/cron/output/` への書き込み権限 |
| `origin` | ジョブを作ったチャットへ返します |

このほかに `mattermost`、`homeassistant`、`dingtalk`、`feishu`、`wecom`、`weixin`、`bluebubbles`、`qqbot`、`webhook` も使えます。`platform:chat_id` の形で、特定のチャットを名指しすることもできます（たとえば `telegram:-1001234567890`）。

配信に失敗しても、ジョブそのものは動いています。ただ、どこにも届かないだけです。`hermes cron list` で `last_error` の欄が更新されていないか見てください（表示される場合）。

### 確認 2: `[SILENT]` の使い方 {#check-2-check-silent-usage}

ジョブが何も出力しなければ、配信は行われません。エージェントの返答に定期実行の沈黙マーカー `[SILENT]` が含まれている場合も、同じく配信されません。これは見張り役のジョブのために用意された動きですが、書いたプロンプトのせいで意図せず全部が黙ってしまっていないか確かめてください。

プロンプトは「変化がなければ [SILENT] だけを返して」のように書きます。長い説明文のなかに `[SILENT]` を混ぜるよう頼むのは避けてください。定期実行はこのマーカーを、配信を止める合図として受け取ります。

### 確認 3: プラットフォーム側のトークン権限 {#check-3-platform-token-permissions}

メッセージ系のプラットフォームでは、ボットが受け取るためにそれぞれ決まった権限を必要とします。配信が何も言わずに失敗するときは、ここを見てください。

- **Telegram**: ボットが対象のグループ／チャンネルの管理者になっていること
- **Discord**: ボットが対象チャンネルへ送信する権限を持っていること
- **Slack**: ボットがワークスペースに追加されていて、`chat:write` のスコープを持っていること

### 確認 4: 返答の囲み {#check-4-response-wrapping}

既定では、定期実行の返答は見出しと締めくくりで囲まれます（`config.yaml` の `cron.wrap_response: true`）。プラットフォームや連携先によっては、この囲みをうまく扱えないことがあります。やめるには次のように書きます。

```yaml
cron:
  wrap_response: false
```

### 確認 5: 中継越しのプラットフォーム（Hermes Cloud / Team Gateway） {#check-5-relay-fronted-platforms-hermes-cloud-team-gateway}

プラットフォームの認証情報が手元の `.env` ではなく中継コネクタ側にある場合（たとえば Team Gateway 越しの Slack や Discord）、**送信できるのは動いているゲートウェイの中継アダプタだけ**です。単体で配信する道はありません。

- ゲートウェイが動いていれば、予定どおりの実行は成立します。中継越しの配信はゲートウェイの時計が受け持ちます。
- 単体で `hermes cron run <id>` を実行すると、その実行は api_server 経由で**自動的にゲートウェイへ渡されます**（`POST /api/jobs/{id}/run`）。そのためには `api_server` プラットフォームが有効で、`API_SERVER_KEY`（16 文字以上）が入っている必要があります。`--prompt` や `cronjob(action='run', prompt=...)` で渡した内容も一緒に送られ、その 1 回の実行にだけ効きます。
- ゲートウェイに届かないときは、まぎらわしい `platform 'slack' not configured/enabled` ではなく「relay-fronted … start the gateway」というエラーで失敗します。ゲートウェイを起動してからやり直してください。

---

## スキルが読み込めない {#skill-loading-failures}

### 確認 1: スキルが入っているか {#check-1-verify-skills-are-installed}

```bash
hermes skills list
```

スキルは、定期実行のジョブに結び付ける前に入れておく必要があります。見当たらないときは、先に `hermes skills install <skill-name>` か、CLI の `/skills` から入れてください。

### 確認 2: スキル名とフォルダ名の食い違い {#check-2-check-skill-name-vs-skill-folder-name}

スキル名は大文字と小文字を区別し、入っているスキルのフォルダ名と一致していなければなりません。ジョブに `ai-funding-report` と書いてあるのにフォルダが `ai-funding-daily-report` なら、`hermes skills list` で正確な名前を確かめてください。

### 確認 3: 対話が必要なツールを使うスキル {#check-3-skills-that-require-interactive-tools}

定期実行のジョブは、`cronjob`、`messaging`、`clarify` の各ツールセットを無効にした状態で動きます。定期実行が入れ子で作られること、メッセージを直接送ること（配信はスケジューラが受け持ちます）、そして人に問い返すことを防ぐためです。これらのツールセットに頼るスキルは、定期実行のなかでは動きません。

そのスキルが、人の応答なしで（ヘッドレスで）動くかどうかを、スキルの説明で確かめてください。

### 確認 4: 複数スキルの順番 {#check-4-multi-skill-ordering}

複数のスキルを使うとき、スキルは指定した順に読み込まれます。スキル A がスキル B の文脈に頼るなら、B が先に読み込まれるようにしてください。

```bash
/cron add "0 9 * * *" "..." --skill context-skill --skill target-skill
```

この例では、`context-skill` が `target-skill` より先に読み込まれます。

---

## ジョブがエラーで終わる {#job-errors-and-failures}

### 確認 1: 直近のジョブの出力を見る {#check-1-review-recent-job-output}

ジョブが動いたうえで失敗した場合、手がかりは次の場所に残ります。

1. そのジョブの配信先のチャット（配信が成功していれば）
2. スケジューラのメッセージなら `~/.hermes/logs/agent.log`（警告なら `errors.log`）
3. `hermes cron list` で見られる、そのジョブの `last_run` の情報

### 確認 2: よくあるエラーの形 {#check-2-common-error-patterns}

**スクリプトに対する "No such file or directory"**
`script` に渡すパスは絶対パス（あるいは Hermes の設定ディレクトリからの相対パス）でなければなりません。次のように確かめます。
```bash
ls ~/.hermes/scripts/your-script.py   # Must exist
hermes cron edit <job_id> --script ~/.hermes/scripts/your-script.py
```

**実行時の "Skill not found"**
スキルは、スケジューラが動いている端末に入っている必要があります。端末を移しても、スキルはついてきません。移った先で `hermes skills install <skill-name>` を実行し直してください。

**ジョブは動くのに何も届かない**
配信先の指定（上の「配信が届かない」を参照）、出力がそもそも空だった、あるいは返答に定期実行の沈黙マーカー `[SILENT]` が入っていた、のいずれかが疑わしいところです。

**ジョブが固まる、時間切れになる**
スケジューラは「何もしていない時間」を測って打ち切ります（既定 600 秒。環境変数 `HERMES_CRON_TIMEOUT` で変えられ、`0` なら無制限）。エージェントがツールを呼び続けているあいだは走り続けられ、タイマーは静かな時間が続いたときだけ発火します。長くかかるジョブでは、データ集めをスクリプトに任せ、結果だけを届けるようにしてください。

### 確認 3: ロックの取り合い {#check-3-lock-contention}

スケジューラは、時計の刻みが重ならないようファイルによるロックを使います。ゲートウェイが 2 つ動いていたり、CLI のセッションがゲートウェイとぶつかっていたりすると、ジョブが遅れたり飛ばされたりします。

重複しているゲートウェイのプロセスを終了させます。
```bash
ps aux | grep hermes
# Kill duplicate processes, keep only one
```

### 確認 4: jobs.json の権限 {#check-4-permissions-on-jobsjson}

ジョブは `~/.hermes/cron/jobs.json` に保存されます。このファイルを自分のユーザーで読み書きできないと、スケジューラは何も言わずに失敗します。

```bash
ls -la ~/.hermes/cron/jobs.json
chmod 600 ~/.hermes/cron/jobs.json   # Your user should own it
```

---

## 動きが遅いとき {#performance-issues}

### ジョブの立ち上がりが遅い {#slow-job-startup}

定期実行のジョブは、そのつど新しい AIAgent のセッションを作ります。ここで提供元の認証やモデルの読み込みが挟まることがあります。時刻に厳しいスケジュールでは、少し余裕を持たせてください（たとえば `0 9 * * *` ではなく `0 8 * * *` にする）。

### 同じ時刻にジョブが多すぎる {#too-many-overlapping-jobs}

スケジューラは、1 回の刻みのなかでジョブを順番に実行します。同じ時刻に何本も予定が重なっていると、あとのものは前のものを待ちます。時刻をずらしてください（両方を `0 9 * * *` にせず、`0 9 * * *` と `5 9 * * *` に分けるなど）。

### スクリプトの出力が大きい {#large-script-output}

何メガバイトも吐き出すスクリプトは、エージェントの動きを鈍らせ、トークンの上限に当たることもあります。スクリプトの側で絞り込むか要約して、エージェントが考えるのに要るぶんだけを出してください。

---

## 切り分けに使うコマンド {#diagnostic-commands}

```bash
hermes cron list                    # Show all jobs, states, next_run times
hermes cron run <job_id>            # Schedule for next tick (for testing)
hermes cron edit <job_id>           # Fix configuration issues
hermes logs                         # View recent Hermes logs
hermes skills list                  # Verify installed skills
```

---

## それでも直らないとき {#getting-more-help}

ここまで試しても症状が続く場合は、次のようにします。

1. `hermes cron run <job_id>` でジョブを走らせ（次のゲートウェイの刻みで動きます）、チャットの出力にエラーが出ないか見る
2. スケジューラのメッセージを `~/.hermes/logs/agent.log`、警告を `~/.hermes/logs/errors.log` で確かめる
3. [github.com/NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) に、次の内容を添えて issue を立てる
   - ジョブの ID とスケジュール
   - 配信先
   - 期待した動きと、実際に起きたこと
   - ログに出ていた関係するエラーメッセージ

---

*定期実行の全体像は [Automate Anything with Cron](/hermes/docs/guides/automate-with-cron/) と [Scheduled Tasks (Cron)](/hermes/docs/user-guide/features/cron/) にまとまっています。*
