---
title: "定期実行がうまくいかないとき"
description: "Hermes の定期実行でよくある困りごとを切り分けて直します。ジョブが動かない、配信が届かない、スキルが読み込めない、動きが遅いといった症状をあつかいます。"
upstream_path: guides/cron-troubleshooting.md
upstream_blob: b4cc65b6f0677bbadb24775727ef8fe3c1eafa17
sources:
  - https://hermes-agent.nousresearch.com/docs/guides/cron-troubleshooting
---

# 定期実行がうまくいかないとき {#cron-troubleshooting}

定期実行が思ったとおりに動かないときは、ここに挙げる順番で確認していってください。ほとんどの原因は、時間の指定、配信、権限、スキルの読み込みの 4 つのどれかに収まります。

---

## ジョブが動かない {#jobs-not-firing}

### 確認 1: ジョブがあって、有効になっているか {#check-1-verify-the-job-exists-and-is-active}

```bash
hermes cron list
```

目当てのジョブを探して、状態が `[active]` になっていることを確かめます（`[paused]` や `[completed]` ではありません）。`[completed]` になっている場合は、決めた回数を走り切ったのかもしれません。ジョブを編集して戻してください。

### 確認 2: 時間の指定が正しいか {#check-2-confirm-the-schedule-is-correct}

書き方を間違えていると、黙って一度きりの実行になったり、そもそも受け付けられなかったりします。書いた式を照らし合わせてみてください。

| 書いた式 | こう解釈されます |
|----------------|-------------------|
| `0 9 * * *` | 毎日 午前 9:00 |
| `0 9 * * 1` | 毎週月曜 午前 9:00 |
| `every 2h` | 今から 2 時間ごと |
| `30m` | 今から 30 分後 |
| `2025-06-01T09:00:00` | 2025 年 6 月 1 日 午前 9:00（UTC） |

一度動いたあと一覧から消えてしまう場合は、一度きりの指定（`30m`、`1d`、ISO 形式の日時）です。これは想定どおりの動きです。

### 確認 3: ゲートウェイは動いているか {#check-3-is-the-gateway-running}

定期実行のジョブは、ゲートウェイの裏で回っている時計係のスレッドが動かしています。この時計係は 60 秒ごとに時を刻みます。ふつうに CLI でチャットしているだけでは、ジョブは自動で動き**ません**。

自動で動いてほしいなら、ゲートウェイを立ち上げておく必要があります（手元で動かすなら `hermes gateway`、サービスとして入れてあるなら `hermes gateway start`）。その場かぎりの確認なら、`hermes cron tick` で手動で一度時を刻ませることもできます。

**デスクトップアプリの場合:** デスクトップの主となるバックエンドは自前の時計係を持っていて、**手元にあるすべてのプロファイル**の cron の保存先を刻みます。そのため、別のプロファイルのバックエンドが眠っている間も、そちらのプロファイルのジョブは動きつづけます（デスクトップは、使われていないプロファイルのバックエンドを 10 分ほどで眠らせます）。決まった時刻のジョブを動かすために、そのプロファイルを開いたままにしておく必要はありません。

### 確認 4: システムの時計とタイムゾーン {#check-4-check-the-system-clock-and-timezone}

ジョブはその端末のタイムゾーンで動きます。時計がずれていたり、思っているのと違うタイムゾーンになっていたりすると、動く時刻もずれます。確かめてください。

```bash
date
hermes cron list   # Compare next_run times with local time
```

---

## 配信が届かない {#delivery-failures}

### 確認 1: 配信先の書き方が合っているか {#check-1-verify-the-deliver-target-is-correct}

配信先は大文字と小文字を区別しますし、その宛先のサービスが設定してある必要があります。設定が食い違っていると、返答は黙って捨てられます。

| 宛先 | 必要なもの |
|--------|----------|
| `telegram` | `~/.hermes/.env` の `TELEGRAM_BOT_TOKEN` |
| `discord` | `~/.hermes/.env` の `DISCORD_BOT_TOKEN` |
| `slack` | `~/.hermes/.env` の `SLACK_BOT_TOKEN` |
| `whatsapp` | WhatsApp のゲートウェイの設定 |
| `signal` | Signal のゲートウェイの設定 |
| `matrix` | Matrix のホームサーバーの設定 |
| `email` | `config.yaml` での SMTP の設定 |
| `sms` | SMS のサービスの設定 |
| `local` | `~/.hermes/cron/output/` への書き込み権限 |
| `origin` | ジョブを作ったチャットへ届きます |

このほかに `mattermost`、`homeassistant`、`dingtalk`、`feishu`、`wecom`、`weixin`、`bluebubbles`、`qqbot`、`webhook` も使えます。`platform:chat_id` の形で特定のチャットを指定することもできます（たとえば `telegram:-1001234567890`）。

配信に失敗しても、ジョブ自体は走っています。ただ、どこにも送られないだけです。`hermes cron list` で `last_error` の欄が更新されていないか見てください（表示される場合があります）。

### 確認 2: `[SILENT]` の使い方 {#check-2-check-silent-usage}

定期実行のジョブが何も出力しなければ、配信は止まります。エージェントの返答に静かにするための合図 `[SILENT]` が入っている場合も、同じように止まります。監視のためのジョブではこれが狙いどおりの動きですが、書いたプロンプトのせいで何もかも止まっていないかは確かめてください。

「何も変わっていなければ [SILENT] とだけ返して」のような書き方にします。長い説明の途中に `[SILENT]` を入れさせるのは避けてください。定期実行はその合図を見つけた時点で配信を止めます。

### 確認 3: サービス側のトークンの権限 {#check-3-platform-token-permissions}

メッセージを受け取るには、それぞれのサービスのボットに必要な権限が要ります。配信が黙って失敗するときは次を見てください。

- **Telegram**: ボットが対象のグループやチャンネルの管理者になっている必要があります
- **Discord**: ボットが対象のチャンネルに送信できる権限を持っている必要があります
- **Slack**: ボットがワークスペースに追加され、`chat:write` のスコープを持っている必要があります

### 確認 4: 返答の飾り付け {#check-4-response-wrapping}

既定では、定期実行の返答には見出しと締めが付きます（`config.yaml` の `cron.wrap_response: true`）。サービスや連携先によっては、これをうまくあつかえないことがあります。外すには次のようにします。

```yaml
cron:
  wrap_response: false
```

---

## スキルが読み込めない {#skill-loading-failures}

### 確認 1: スキルが入っているか {#check-1-verify-skills-are-installed}

```bash
hermes skills list
```

定期実行のジョブに付けるには、先にスキルが入っている必要があります。見当たらないときは `hermes skills install <skill-name>` か、CLI の `/skills` から入れてください。

### 確認 2: スキル名とフォルダ名が合っているか {#check-2-check-skill-name-vs-skill-folder-name}

スキル名は大文字と小文字を区別し、入っているスキルのフォルダ名と一致している必要があります。ジョブに `ai-funding-report` と書いてあるのにフォルダが `ai-funding-daily-report` だった、ということがないよう、`hermes skills list` で正確な名前を確かめてください。

### 確認 3: 対話が必要なスキル {#check-3-skills-that-require-interactive-tools}

定期実行のジョブでは、`cronjob`、`messaging`、`clarify` のツール群が無効になっています。定期実行の中からさらに定期実行を作ってしまうことや、直接メッセージを送ること（配信はスケジューラの担当です）、その場で人に聞き返すことを防ぐためです。これらのツール群に頼っているスキルは、定期実行では動きません。

そのスキルの説明を見て、人が付いていない状態でも動くかどうかを確かめてください。

### 確認 4: 複数のスキルの順番 {#check-4-multi-skill-ordering}

スキルを複数使うと、書いた順に読み込まれます。スキル A がスキル B の内容を前提にしているなら、B を先に置いてください。

```bash
/cron add "0 9 * * *" "..." --skill context-skill --skill target-skill
```

この例では、`context-skill` が `target-skill` より先に読み込まれます。

---

## ジョブがエラーになる {#job-errors-and-failures}

### 確認 1: 直近の出力を見る {#check-1-review-recent-job-output}

ジョブが走って失敗したときは、次の場所に手がかりが残っていることがあります。

1. 配信先のチャット（配信自体は成功していた場合）
2. スケジューラのメッセージなら `~/.hermes/logs/agent.log`（警告は `errors.log`）
3. `hermes cron list` で見られる、そのジョブの `last_run` の情報

### 確認 2: よくあるエラー {#check-2-common-error-patterns}

**スクリプトについて「No such file or directory」と出る**
`script` のパスは絶対パス（または Hermes の設定ディレクトリからの相対パス）でなければなりません。確かめてください。
```bash
ls ~/.hermes/scripts/your-script.py   # Must exist
hermes cron edit <job_id> --script ~/.hermes/scripts/your-script.py
```

**実行時に「Skill not found」と出る**
スキルは、スケジューラが動いている端末に入っている必要があります。端末を移った場合、スキルは自動では付いてきません。`hermes skills install <skill-name>` で入れ直してください。

**ジョブは走るのに何も届かない**
配信先の指定の問題（上の「配信が届かない」を見てください）、出力が空、あるいは返答に静かにするための合図 `[SILENT]` が入っている、のどれかでしょう。

**ジョブが止まったままになる、時間切れになる**
スケジューラは「動きが止まってからの時間」で区切ります（既定は 600 秒で、環境変数 `HERMES_CRON_TIMEOUT` で変えられます。`0` なら無制限です）。エージェントがツールを呼び続けているあいだは走り続け、しばらく何もしなくなったときにだけ時間切れになります。長くかかる仕事は、データを集めるところをスクリプトに任せて、結果だけを届けるようにしてください。

### 確認 3: 鍵の取り合い {#check-3-lock-contention}

スケジューラは、時を刻む処理が重ならないようにファイルで鍵をかけています。ゲートウェイが 2 つ動いていたり、CLI のセッションとゲートウェイがぶつかっていたりすると、ジョブが遅れたり飛ばされたりします。

重なって動いているゲートウェイを止めてください。
```bash
ps aux | grep hermes
# Kill duplicate processes, keep only one
```

### 確認 4: jobs.json の権限 {#check-4-permissions-on-jobsjson}

ジョブは `~/.hermes/cron/jobs.json` に保存されます。このファイルを自分のユーザーが読み書きできないと、スケジューラは黙って失敗します。

```bash
ls -la ~/.hermes/cron/jobs.json
chmod 600 ~/.hermes/cron/jobs.json   # Your user should own it
```

---

## 動きが遅いとき {#performance-issues}

### 動き出しが遅い {#slow-job-startup}

定期実行のジョブは毎回まっさらな AIAgent のセッションを作るので、プロバイダの認証やモデルの読み込みが挟まることがあります。時刻に厳しい予定なら、少し余裕をとってください（たとえば `0 9 * * *` ではなく `0 8 * * *` にする、というように）。

### 同じ時刻に集まりすぎている {#too-many-overlapping-jobs}

スケジューラは、ひとつの刻みの中でジョブを順番に走らせます。同じ時刻に複数のジョブが重なると、次々に待たされます。時刻をずらしてください（両方を `0 9 * * *` にせず、`0 9 * * *` と `5 9 * * *` に分ける、というように）。

### スクリプトの出力が大きすぎる {#large-script-output}

何メガバイトも吐き出すスクリプトは、エージェントの動きを重くし、トークンの上限に当たることもあります。スクリプトの側で絞り込むか要約して、エージェントが考えるのに要る分だけを出してください。

---

## 調べるためのコマンド {#diagnostic-commands}

```bash
hermes cron list                    # Show all jobs, states, next_run times
hermes cron run <job_id>            # Schedule for next tick (for testing)
hermes cron edit <job_id>           # Fix configuration issues
hermes logs                         # View recent Hermes logs
hermes skills list                  # Verify installed skills
```

---

## それでも直らないとき {#getting-more-help}

ここまで試しても解決しない場合は、次のようにしてください。

1. `hermes cron run <job_id>` でジョブを走らせて（次の刻みで動きます）、チャットに出るエラーを見る
2. スケジューラのメッセージは `~/.hermes/logs/agent.log`、警告は `~/.hermes/logs/errors.log` を見る
3. [github.com/NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) に issue を立てて、次を書き添える
   - ジョブの ID と時間の指定
   - 配信先
   - 期待していたことと、実際に起きたこと
   - ログに出ていたエラーのうち関係のあるもの

---

*定期実行の全体像は [cron で何でも自動化する](/hermes/docs/guides/automate-with-cron/) と [定期実行（cron）](/hermes/docs/user-guide/features/cron/) を見てください。*
