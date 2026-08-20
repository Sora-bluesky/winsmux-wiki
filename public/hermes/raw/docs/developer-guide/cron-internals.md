---
title: "定時実行の内部"
description: "Hermes が定時実行の仕事を保存し、時刻を決め、編集し、止め、スキルを読み込み、結果を届けるしくみ"
upstream_path: developer-guide/cron-internals.md
upstream_blob: 13a342324cc96ea9f0845714221edc7113a5ab95
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/cron-internals
---

# 定時実行の内部 {#cron-internals}

定時実行のしくみは、決まった時刻に仕事を走らせます。単純に一度だけ時間をおいて動かすものから、cron 式で繰り返し、スキルを差し込み、複数のプラットフォームへ結果を届けるものまで扱えます。

## 主なファイル {#key-files}

| ファイル | 役割 |
|------|---------|
| `cron/jobs.py` | 仕事のデータ構造、保存、`jobs.json` への安全な読み書き |
| `cron/scheduler.py` | スケジューラのループ — 実行時刻が来た仕事の検出、実行、繰り返しの管理 |
| `tools/cronjob_tools.py` | モデルに見える `cronjob` ツールの登録とハンドラ |
| `gateway/run.py` | ゲートウェイとの連携 — 常駐ループの中での定時実行の刻み |
| `hermes_cli/cron.py` | CLI の `hermes cron` サブコマンド |

## 時刻の決め方 {#scheduling-model}

指定のしかたは 4 通りあります。

| 形式 | 例 | 動き |
|--------|---------|----------|
| **時間をおく** | `30m`、`2h`、`1d` | 一度だけ。指定した時間が経つと動きます |
| **一定の間隔** | `every 2h`、`every 30m` | 繰り返し。決まった間隔ごとに動きます |
| **cron 式** | `0 9 * * *` | 標準的な 5 つの欄の cron 式（分、時、日、月、曜日） |
| **ISO 形式の時刻** | `2025-01-15T09:00:00` | 一度だけ。ちょうどその時刻に動きます |

モデルに見えるのは `cronjob` ツール 1 つだけで、その中で `create`、`list`、`update`、`pause`、`resume`、`run`、`remove` という操作を選びます。

## 仕事の保存 {#job-storage}

仕事は `~/.hermes/cron/jobs.json` に保存されます。書き込みは安全な手順（一時ファイルに書いてから名前を変える）で行われます。1 件ごとの中身は次のとおりです。

```json
{
  "id": "a1b2c3d4e5f6",
  "name": "Daily briefing",
  "prompt": "Summarize today's AI news and funding rounds",
  "schedule": {
    "kind": "cron",
    "expr": "0 9 * * *",
    "display": "0 9 * * *"
  },
  "skills": ["ai-funding-daily-report"],
  "deliver": "telegram:-1001234567890",
  "repeat": {
    "times": null,
    "completed": 42
  },
  "state": "scheduled",
  "enabled": true,
  "next_run_at": "2025-01-16T09:00:00Z",
  "last_run_at": "2025-01-15T09:00:00Z",
  "last_status": "ok",
  "created_at": "2025-01-01T00:00:00Z",
  "model": null,
  "provider": null,
  "script": null
}
```

### 仕事の状態 {#job-lifecycle-states}

| 状態 | 意味 |
|-------|---------|
| `scheduled` | 有効。次の予定時刻に動きます |
| `paused` | 一時停止中。再開するまで動きません |
| `completed` | 繰り返しの回数を使い切ったか、一度きりの仕事が済んだ状態 |
| `running` | 実行中（一時的な状態） |

### 古い形式との互換 {#backward-compatibility}

古い仕事は、`skills` の配列ではなく `skill` という 1 つの項目を持っていることがあります。スケジューラは読み込み時にこれを揃え、1 つの `skill` を `skills: [skill]` に直します。

## スケジューラの動き {#scheduler-runtime}

### 1 回の刻み {#tick-cycle}

スケジューラは決まった間隔（既定では 60 秒ごと）で動きます。

```text
tick()
  1. Acquire scheduler lock (prevents overlapping ticks)
  2. Load all jobs from jobs.json
  3. Filter to due jobs (next_run <= now AND state == "scheduled")
  4. For each due job:
     a. Set state to "running"
     b. Create fresh AIAgent session (no conversation history)
     c. Load attached skills in order (injected as user messages)
     d. Run the job prompt through the agent
     e. Deliver the response to the configured target
     f. Update run_count, compute next_run
     g. If repeat count exhausted → state = "completed"
     h. Otherwise → state = "scheduled"
  5. Write updated jobs back to jobs.json
  6. Release scheduler lock
```

### ゲートウェイとの連携 {#gateway-integration}

ゲートウェイモードでは、定時実行の **引き金** の部分（実行時刻が来た仕事を *いつ* 動かすかを
決める部分。「軸 B」）が、差し替えのできる `CronScheduler` のしくみを通して選ばれます。
ゲートウェイは `resolve_cron_scheduler()`（`cron/scheduler_provider.py`）を呼び、選ばれたものの
`start()` を専用のバックグラウンドスレッドで動かします。その隣では、ゲートウェイの
片づけ用のスレッドが別に動きます。

どれを使うかは `cron.provider` の設定で決まります。

- **空（既定）** → 組み込みの `InProcessCronScheduler`。これまでどおり同じプロセスの中で
  ループを回し、60 秒ごとに `scheduler.tick()` を呼びます。差し替えのしくみが入る前と
  まったく同じ動きです。
- **名前を指定したとき**（例えば、待機中は止まる構成向けの管理型の定時実行である
  `chronos` など）→ `plugins/cron_providers/<name>/` または
  `$HERMES_HOME/plugins/<name>/` から探し出されます。

指定した名前のものが見つからない、読み込みに失敗する、`is_available() ==
False` を返す、のいずれかの場合は、警告を出したうえで組み込みのものに戻ります。**定時実行が
引き金を失うことはありません。** 組み込みのものは `plugins/` ではなくコア側
（`cron/scheduler_provider.py`）にあるので、うっかり消してしまうこともありません。

「動く」という言葉の中身（仕事の実行と結果の配達）は変わっておらず、どのしくみを選んでも
共通です。これは `scheduler.run_job()` と `scheduler._deliver_result()` にあります。
差し替えられるのは引き金だけで、実行そのものではありません。

CLI モードでは、定時実行の仕事は `hermes cron` のコマンドを実行したときか、CLI のセッションが動いている間だけ発火します。

### 待機中は止まる構成のための管理型の定時実行（Chronos） {#managed-cron-chronos-for-scale-to-zero}

ホスティングされたゲートウェイでは、組み込みの刻みの代わりに **Chronos**
（`cron.provider: chronos`）を使えます。Chronos を使うと、何もしていないゲートウェイを
**完全に止めた** まま定時実行の仕事を動かせます。60 秒ごとのループ（これがあるとプロセスは
眠れません）ではなく、**仕事ごとに、その仕事が本当に次に動く時刻へ一度きりの予約を 1 つ**
Nous の基盤に入れてもらうからです。時刻が来ると Nous が認証付きの Webhook
（`POST /api/cron/fire`）でゲートウェイを呼び出し、ゲートウェイは組み込みのときと同じ
`run_one_job` の道筋で仕事を走らせ、次の一度きりの予約を入れ直します。その間、プロセスは
完全に止まっていて構いません。目を覚ますのは本当に動く時だけで、定期的なタイマーでは
起きません。

流れは次のとおりです（管理側のスケジューラは Nous が用意し、エージェント側は
その認証情報を持ちません）。

```
create/update a cron job
  → Chronos asks Nous to arm a one-shot at the job's next_run_at
      (authenticated with the agent's existing Nous token)
  → at fire time Nous calls the gateway: POST {callback_url}/api/cron/fire
      (authenticated with a short-lived, purpose-scoped Nous-minted JWT)
  → the gateway verifies the token, claims the job (store compare-and-set so
    multi-replica deployments fire at-most-once), runs it, and re-arms the next
    one-shot
```

設定はすべて秘密ではない値です（ホスティングされたエージェントでは、Nous が用意の時点で設定します）。

| キー | 意味 |
|---|---|
| `cron.provider` | `chronos` にすると有効になります（空なら組み込みの刻み） |
| `cron.chronos.portal_url` | Nous の基点となる URL（予約の投入先であり、発火用トークンの発行元） |
| `cron.chronos.callback_url` | 呼び出しを受けるゲートウェイ自身の公開 URL |
| `cron.chronos.expected_audience` | このエージェント向けの発火用トークンの宛先 |
| `cron.chronos.nas_jwks_url` | 届いた発火用トークンを検証するための鍵の一覧 |

Chronos の設定が誤っている場合や、エージェントが Nous にログインしていない場合は、
`resolve_cron_scheduler()` が組み込みの刻みに戻します（警告がログに残ります）。定時実行が
引き金を失うことはありません。繰り返しの仕事は動くたびに次の予約を入れ直し、`repeat` で
回数を決めた仕事は、その回数を使い切るときれいに止まります（予約だけが取り残されることは
ありません）。エージェントと Nous のやり取りの取り決めは `docs/chronos-managed-cron-contract.md` に全文があります。

### まっさらなセッションで動かす {#fresh-session-isolation}

定時実行の仕事は、毎回まっさらなエージェントのセッションで動きます。

- 前回までの会話は引き継ぎません
- 前回までの定時実行の記憶もありません（記憶やファイルに残していれば別です）
- プロンプトはそれだけで完結している必要があります。定時実行の仕事は、途中で聞き返せません
- `cronjob` のツールセットは無効になります（入れ子を防ぐためです）

## スキルを付けた仕事 {#skill-backed-jobs}

定時実行の仕事には、`skills` の項目で 1 つ以上のスキルを付けられます。実行時には次のように動きます。

1. 指定した順にスキルを読み込みます
2. それぞれのスキルの SKILL.md の内容が文脈として差し込まれます
3. その仕事のプロンプトが、やることの指示として後ろに足されます
4. エージェントは、スキルの文脈とプロンプトを合わせたものを処理します

こうすると、長い指示を定時実行のプロンプトに貼り付けなくても、使い回しの利く、試し済みの手順をそのまま使えます。例を挙げます。

```
Create a daily funding report → attach "ai-funding-daily-report" skill
```

### スクリプトを付けた仕事 {#script-backed-jobs}

仕事には `script` の項目で Python のスクリプトも付けられます。スクリプトはエージェントが動く *前* に実行され、その標準出力がプロンプトへ文脈として差し込まれます。データを集めて変化を見つける、といった使い方ができます。

```python
# ~/.hermes/scripts/check_competitors.py

# Fetch competitor release notes, diff against last run
# Print summary to stdout — agent analyzes and reports
```

スクリプトの制限時間は既定で 3600 秒（1 時間）です。`_get_script_timeout()` は、次の 3 段構えでこの上限を決めます。

1. **モジュールレベルの上書き** — `_SCRIPT_TIMEOUT`（テストや差し替え用）。既定値と違うときだけ使われます。
2. **環境変数** — `HERMES_CRON_SCRIPT_TIMEOUT`
3. **設定ファイル** — `config.yaml` の `cron.script_timeout_seconds`（`load_config()` で読み込みます）
4. **既定値** — 3600 秒（1 時間）

この制限時間がかかるのは **実行前のスクリプトだけ** で、エージェント自体にはかかりません。スキルを使う仕事や LLM が動かす仕事には、別に *何もしていない時間* を基準にした持ち時間があります（`HERMES_CRON_TIMEOUT`、既定は 600 秒の待ち時間、`0` で無制限）。ツールを呼び続けたりトークンを流し続けたりしているかぎり何時間でも動けて、設定した時間だけ何も起きなかったときにはじめて止められます。スクリプトは常設のスレッドプールに渡され（刻みのロックを持ったままにはなりません）、長く動くスクリプトがあっても、他の実行時刻が来た仕事は動けます。

### プロバイダの立て直し {#provider-recovery}

`run_job()` は、利用者が設定した予備のプロバイダと認証情報の束を `AIAgent` に渡します。

- **予備のプロバイダ** — `config.yaml` から `fallback_providers`（リスト）または `fallback_model`（旧来の辞書形式）を読みます。ゲートウェイの `_load_fallback_model()` と同じやり方です。`AIAgent.__init__` に `fallback_model=` として渡され、そこで両方の形式が予備の連なりに整えられます。
- **認証情報の束** — 解決された実行時のプロバイダ名を使い、`agent.credential_pool` の `load_pool(provider)` で読み込みます。束に認証情報があるとき（`pool.has_credentials()`）だけ渡されます。これにより、429 や回数制限のエラーが出たときに同じプロバイダ内で鍵を切り替えられます。

これはゲートウェイと同じ動きです。これがないと、定時実行のエージェントは回数制限に当たった時点で、立て直しを試みることなく失敗してしまいます。

## 結果の届け方 {#delivery-model}

定時実行の仕事の結果は、対応しているどのプラットフォームにも届けられます。

プラットフォーム名だけを書くと（`slack`、`telegram` など）、そのプラットフォームで設定された **既定の届け先** に届きます。**特定の** 宛先を指したいときは、コロンのあとに宛先を足して `platform:<target>` と書きます。宛先は仕事を作ったときではなく動く時点で解決されるので、まだつながっていないプラットフォームの宛先を書いておき、つながった時点から届き始める、という使い方ができます。

多くのプラットフォームでは、3 つ目の区切りとしてスレッドや話題も指定できます（`platform:<chat_id>:<thread_id>`）。

| 宛先 | 書き方 | 例 |
|--------|--------|---------|
| もとのチャット | `origin` | 仕事を作ったチャットへ届けます |
| ローカルのファイル | `local` | `~/.hermes/cron/output/` に保存します |
| Telegram | `telegram`、`telegram:<chat_id>`、`telegram:<chat_id>:<thread_id>`、`telegram:@username` | `telegram:-1001234567890:17585` |
| Discord | `discord`、`discord:#channel`、`discord:<channel_id>`、`discord:<channel_id>:<thread_id>` | `discord:#engineering` |
| Slack | `slack`、`slack:#channel`、`slack:<channel_id>`、`slack:<channel_id>:<thread_ts>` | `slack:#engineering` |
| Matrix | `matrix`、`matrix:<!room_id:server>`、`matrix:<@user:server>` | `matrix:!abc123:example.org` |
| Feishu | `feishu`、`feishu:<chat_id>`、`feishu:<chat_id>:<thread_id>` | `feishu:oc_abc123def` |
| WhatsApp | `whatsapp`、`whatsapp:<jid>`、`whatsapp:+<E.164>` | `whatsapp:123456@g.us` |
| Signal | `signal`、`signal:group:<id>`、`signal:+<E.164>` | `signal:group:aBcD==` |
| SMS | `sms`、`sms:+<E.164>` | `sms:+<E.164 number>` |
| メール | `email`、`email:<address>` | `email:alerts@example.com` |
| Weixin | `weixin`、`weixin:<wxid>` | `weixin:wxid_abc123` |
| Mattermost | `mattermost` または `mattermost:<channel_id>` | 名前だけなら Mattermost の既定の届け先へ |
| Home Assistant | `homeassistant` または `homeassistant:<conversation>` | 名前だけなら HA の会話へ |
| DingTalk | `dingtalk` または `dingtalk:<chat_id>` | 名前だけなら DingTalk へ |
| WeCom | `wecom` または `wecom:<chat_id>` | 名前だけなら WeCom へ |
| BlueBubbles | `bluebubbles` または `bluebubbles:<chat_guid>` | 名前だけなら BlueBubbles 経由で iMessage へ |
| QQ Bot | `qqbot` または `qqbot:<chat_id>` | 名前だけなら公式 API v2 経由で QQ（テンセント）へ |

上の方にあるプラットフォームは、宛先の書き方がはっきり決まっていて検証もされます。名前付きのチャンネル（`#channel`）、話題やスレッド、ルームや利用者の ID、グループの ID、電話番号などです。残りのプラットフォームは、汎用の `platform:<chat_id>` の形を受け付けます（コロンのあとの値が、そのまま宛先の ID として使われます）。プラットフォーム名だけを書いた場合は、必ず既定の届け先に届きます。

**名前付きのチャンネル**（`slack:#engineering`、`discord:#engineering`、あるいは `slack:engineering` のような分かりやすい名前）は、ゲートウェイがつながっているアダプタから作るチャンネルの一覧と突き合わせて解決されます。そのため、名前で解決するには、ゲートウェイがそのチャンネルを見つけている必要があります。ID をそのまま書く形（`slack:C0123ABCD45`）なら常に使えます。

**Telegram の話題** には `telegram:<chat_id>:<thread_id>` を使います（例えば `telegram:-1001234567890:17585`）。**Slack のスレッド** では、3 つ目の区切りが親のメッセージの `thread_ts` になります（例えば `slack:C0123ABCD45:1700000000.000100`）。そのため、既にあるメッセージへの返信として送るときにだけ使えます。

### 結果の包み方 {#response-wrapping}

既定（`cron.wrap_response: true`）では、定時実行の結果は次のもので包まれて届きます。
- 仕事の名前とやることを示す見出し
- 届けたメッセージをエージェント自身は会話の中で見られない、と断る末尾の一文

定時実行の結果の先頭に `[SILENT]` を付けると、配達そのものが止まります。ファイルへの書き込みなど、裏で処理するだけの仕事に便利です。

### 会話との切り分け {#session-isolation}

定時実行の結果は、ゲートウェイのセッションの会話履歴には写されません。あくまで、その定時実行の仕事自身のセッションの中だけに存在します。これにより、届け先のチャットの会話で、発言の順番の決まりが崩れるのを防ぎます。

## 入れ子を防ぐしくみ {#recursion-guard}

定時実行で動くセッションでは `cronjob` のツールセットが無効になります。これで次のことを防ぎます。
- 予定された仕事が、新しい定時実行の仕事を作ってしまうこと
- 入れ子の予定が増え続けて、トークンの消費が膨れ上がること
- 仕事の中から、その仕事の予定をうっかり書き換えてしまうこと

## ロック {#locking}

スケジューラは、プロセスをまたいだファイルによるロック（Unix では `fcntl.flock`、Windows では `msvcrt.locking`）を使い、刻みが重なって同じ一群の仕事を二度実行してしまうのを防ぎます。ゲートウェイの中で動く刻みと、単独の `hermes cron` や手動の `tick()` の間でも同じです。ロックを取れなかった場合、`tick()` はすぐに 0 を返します。

## CLI での操作 {#cli-interface}

`hermes cron` の CLI から、仕事を直接扱えます。

```bash
hermes cron list                    # Show all jobs
hermes cron create                  # Interactive job creation (alias: add)
hermes cron edit <job_id>           # Edit job configuration
hermes cron pause <job_id>          # Pause a running job
hermes cron resume <job_id>         # Resume a paused job
hermes cron run <job_id>            # Trigger immediate execution
hermes cron remove <job_id>         # Delete a job
```

## 関連ページ {#related-docs}

- [定時実行の使い方](/hermes/docs/user-guide/features/cron/)
- [ゲートウェイの内部](/hermes/docs/developer-guide/gateway-internals/)
- [エージェントループの内部](/hermes/docs/developer-guide/agent-loop/)
