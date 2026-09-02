---
title: "cron の内部構造"
description: "Hermes が cron ジョブを保存し、スケジュールし、編集し、一時停止し、スキルを読み込み、届けるまでの仕組み"
upstream_path: developer-guide/cron-internals.md
upstream_blob: 968af066cdf9b94a2f883d9d4ac5c2f42b7019f0
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/cron-internals
---

# cron の内部構造 {#cron-internals}

cron のサブシステムは、決まった時刻にタスクを実行する仕組みです。単純な一回きりの遅延実行から、スキルを差し込んでプラットフォームをまたいで結果を届ける繰り返しジョブまでを受け持ちます。

## 主要なファイル {#key-files}

| ファイル | 役割 |
|------|---------|
| `cron/jobs.py` | ジョブのモデル、保存、`jobs.json` への不可分な読み書き |
| `cron/scheduler.py` | スケジューラのループ。実行時刻が来たジョブの検出、実行、繰り返し回数の管理 |
| `tools/cronjob_tools.py` | モデルから見える `cronjob` ツールの登録とハンドラ |
| `gateway/run.py` | ゲートウェイとの連携。常駐ループの中で cron を刻む |
| `hermes_cli/cron.py` | CLI の `hermes cron` サブコマンド |

## スケジュールの指定方法 {#scheduling-model}

指定できる形式は4つです。

| 形式 | 例 | 動作 |
|--------|---------|----------|
| **相対的な遅延** | `30m`, `2h`, `1d` | 一回きり。指定した時間が過ぎたら実行します |
| **間隔** | `every 2h`, `every 30m` | 繰り返し。一定の間隔で実行します |
| **cron 式** | `0 9 * * *` | 標準的な5フィールドの cron 記法（分、時、日、月、曜日） |
| **ISO 形式の時刻** | `2025-01-15T09:00:00` | 一回きり。指定した時刻ちょうどに実行します |

モデルから見えるのは `cronjob` ツール1つだけで、その中で操作を切り替えます。`create`、`list`、`update`、`pause`、`resume`、`run`、`remove` があります。

## ジョブの保存先 {#job-storage}

ジョブは `~/.hermes/cron/jobs.json` に保存されます。書き込みは一時ファイルへ書いてから名前を変える方式で、途中の状態が読まれないようにしています。1件のジョブは次のような内容です。

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

### `last_status` に入る値 {#laststatus-literals}

`last_status` に入る値は決まっていて、書き込むのは `cron.jobs.mark_job_run` だけです。表示する側
（`hermes cron list` と `doctor`、`cronjob` ツール、Web ダッシュボードのバッジ、
デスクトップの定期実行インスペクタ）はどれも値ごとに意味を明示的に対応づけます。
「利用者の手元に結果が届いた」の判定を `== "ok"` で済ませてはいけません。

| 値 | 意味 | 詳細が入るフィールド |
|---------|---------|--------------|
| `ok` | エージェントの実行が成功し、宛先がある場合は配信も確認できた | — |
| `error` | エージェントの実行が失敗した | `last_error` |
| `delivery_failed` | エージェントの実行は成功したが、出力が宛先まで届かなかった | `last_delivery_error`（`last_error` は `null`） |
| `blocked_config` | 実行前の検証で弾き、無駄な実行を防いだ | `last_error` |

### ジョブの状態 {#job-lifecycle-states}

| 状態 | 意味 |
|-------|---------|
| `scheduled` | 有効。次の予定時刻に実行されます |
| `paused` | 停止中。再開するまで実行されません |
| `completed` | 繰り返し回数を使い切ったか、一回きりのジョブが実行済み |
| `running` | 実行中（一時的な状態） |

### 古い形式との互換 {#backward-compatibility}

以前のジョブには `skills` の配列ではなく `skill` という単一のフィールドが入っていることがあります。スケジューラは読み込み時にこれをそろえ、単一の `skill` を `skills: [skill]` に置き換えます。

## スケジューラの動作 {#scheduler-runtime}

### 1回分の処理 {#tick-cycle}

スケジューラは一定間隔（既定では60秒ごと）で動きます。

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

ゲートウェイモードでは、cron の**引き金**（実行時刻が来たジョブを*いつ*動かすかを決める部分、
いわゆる「Axis B」）を差し替え可能な `CronScheduler` プロバイダから選びます。
ゲートウェイは `resolve_cron_scheduler()`（`cron/scheduler_provider.py`）を呼び、選ばれたプロバイダの
`start()` を専用のバックグラウンドスレッドで動かします。ゲートウェイの後片付け用スレッドはそれとは別に走ります。

どのプロバイダを使うかは `cron.provider` という設定キーで決まります。

- **空（既定）** の場合は組み込みの `InProcessCronScheduler` が使われ、従来どおり
  プロセス内のループが60秒ごとに `scheduler.tick()` を呼びます。プロバイダ機構が入る前と
  まったく同じ挙動です。
- **プロバイダ名を書いた場合**（たとえばゼロまで縮退させる構成向けのマネージド cron プロバイダ
  `chronos`）は、`plugins/cron_providers/<name>/` または
  `$HERMES_HOME/plugins/<name>/` から探して読み込みます。

指定したプロバイダが見つからない、読み込みに失敗する、あるいは `is_available() ==
False` を返す場合は、警告を出したうえで組み込みのものに戻します。**cron から引き金が
なくなることはありません。** 組み込みのプロバイダは `plugins/` ではなくコア側
（`cron/scheduler_provider.py`）にあるので、うっかり消してしまうこともありません。

「実行する」とは何をすることか（ジョブの実行と結果の配信）は変わらず、どのプロバイダでも共通です。
`scheduler.run_job()` と `scheduler._deliver_result()` が受け持ちます。
プロバイダが握るのは引き金だけで、実行そのものには手を出しません。

CLI モードでは、cron ジョブは `hermes cron` のコマンドを実行したときか、CLI のセッションが動いている間だけ実行されます。

### ゼロまで縮退させるためのマネージド cron（Chronos） {#managed-cron-chronos-for-scale-to-zero}

ホスト型のゲートウェイでは、組み込みのティッカーの代わりに **Chronos** プロバイダ
（`cron.provider: chronos`）を使えます。Chronos を使うと、待機中のゲートウェイを
**ゼロまで縮退**させたまま cron ジョブを動かせます。60秒ごとにプロセス内でループを回す
（つまりプロセスを起こしっぱなしにする）のではなく、Nous の基盤に対して
**ジョブごとに、実際の次回実行時刻ちょうどの一回きりの予約を1つだけ**入れてもらいます。
時刻が来ると Nous が認証付きの Webhook（`POST /api/cron/fire`）でゲートウェイを呼び出し、
ゲートウェイは組み込みの場合と同じ `run_one_job` の経路でジョブを実行し、次の一回きりの予約を入れ直します。
実行と実行のあいだはプロセスを完全に止めておけます。起きるのは本当に実行するときだけで、
定期タイマーで起こされることはありません。

流れは次のとおりです（マネージドのスケジューラは Nous 側が提供し、エージェントは
スケジューラの資格情報を持ちません）。

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

設定はすべて秘密情報ではありません（ホスト型のエージェントでは Nous が用意の段階で設定します）。

| キー | 意味 |
|---|---|
| `cron.provider` | `chronos` にすると有効になります（空なら組み込みのティッカー） |
| `cron.chronos.portal_url` | Nous のベース URL（予約の投入と、実行用トークンの発行元） |
| `cron.chronos.callback_url` | 実行の呼び出しを受けるゲートウェイ自身の公開ベース URL |
| `cron.chronos.expected_audience` | このエージェント向けの実行用トークンの audience |
| `cron.chronos.nas_jwks_url` | 受け取った実行用トークンを検証するための鍵セット |

Chronos の設定が誤っている場合や、エージェントが Nous にログインしていない場合は、
`resolve_cron_scheduler()` が警告を残したうえで組み込みのティッカーに戻します。
cron が引き金を失うことはありません。繰り返しのジョブは実行のたびに次の予約を入れ直し、
`repeat` に回数を指定したジョブは回数を使い切った時点できれいに止まります（予約が取り残されることはありません）。
エージェントと Nous のあいだのやり取りの取り決めは `docs/chronos-managed-cron-contract.md` にすべて書かれています。

### まっさらなセッションで動かす {#fresh-session-isolation}

cron ジョブは毎回まっさらなエージェントセッションで動きます。

- 前回までの会話は引き継ぎません
- 前回までの cron の実行内容も覚えていません（MEMORY.md や USER.md といった
  永続的な記憶は、ほかのエージェントの実行と同じように読み込まれるので、
  長く残る好みや事実は引き継がれます。1回ごとの会話の文脈は引き継がれません）
- プロンプトはそれだけで完結している必要があります。cron ジョブは聞き返せません
- `cronjob` のツール群は無効になります（再帰の防止）

## スキルを付けたジョブ {#skill-backed-jobs}

cron ジョブには `skills` フィールドで1つ以上のスキルを付けられます。実行時には次のように進みます。

1. 指定した順にスキルを読み込みます
2. 各スキルの SKILL.md の内容が文脈として差し込まれます
3. ジョブのプロンプトが、やるべきことの指示として最後に足されます
4. エージェントはスキルの文脈とプロンプトをまとめて処理します

これにより、手順の全文を cron のプロンプトに貼り付けなくても、作り込んで動作を確かめた手順をそのまま使い回せます。たとえば次のようになります。

```
Create a daily funding report → attach "ai-funding-daily-report" skill
```

### スクリプトを付けたジョブ {#script-backed-jobs}

ジョブには `script` フィールドで Python のスクリプトを付けることもできます。スクリプトはエージェントの各ターンの*前*に走り、その標準出力がプロンプトへ文脈として差し込まれます。データの収集や変化の検出といった使い方ができます。

```python
# ~/.hermes/scripts/check_competitors.py

# Fetch competitor release notes, diff against last run
# Print summary to stdout — agent analyzes and reports
```

スクリプトの制限時間は既定で3600秒（1時間）です。`_get_script_timeout()` は次の3層をたどって値を決めます。

1. **モジュールレベルの上書き** — `_SCRIPT_TIMEOUT`（テストや差し替え用）。既定値と違うときだけ使われます。
2. **環境変数** — `HERMES_CRON_SCRIPT_TIMEOUT`
3. **設定** — `config.yaml` の `cron.script_timeout_seconds`（`load_config()` 経由で読み込みます）
4. **既定値** — 3600秒（1時間）

この制限時間がかかるのは**実行前のスクリプトだけ**で、エージェント側にはかかりません。スキルや LLM で動くジョブは、*無操作*の時間を基準にした別の制限（`HERMES_CRON_TIMEOUT`、既定は無操作600秒、`0` で無制限）で動きます。ツールを呼び続けたりトークンを出し続けたりしているかぎり何時間でも動き、何も起きない時間が設定分だけ続いたときに初めて打ち切られます。スクリプトは常駐のスレッドプールに投げられ、1回分の処理のロックを握ったままにはしないので、長く走るスクリプトがほかのジョブの実行を止めることはありません。

### プロバイダの切り替えによる復帰 {#provider-recovery}

`run_job()` は、利用者が設定した予備のプロバイダと資格情報のプールを `AIAgent` のインスタンスへ渡します。

- **予備のプロバイダ** — `config.yaml` から `fallback_providers`（リスト）または `fallback_model`（旧来の辞書）を読み、ゲートウェイの `_load_fallback_model()` と同じやり方に合わせます。`fallback_model=` として `AIAgent.__init__` に渡され、どちらの形式も予備の連なりへとそろえられます。
- **資格情報のプール** — 実行時に決まったプロバイダ名を使い、`agent.credential_pool` の `load_pool(provider)` で読み込みます。渡すのはプールに資格情報があるとき（`pool.has_credentials()`）だけです。429 や利用制限のエラーが出たときに、同じプロバイダの別の鍵へ切り替えられます。

これはゲートウェイと同じ振る舞いです。これがないと、cron のエージェントは利用制限にぶつかった時点で、立て直しを試みないまま失敗してしまいます。

## 結果の届け方 {#delivery-model}

cron ジョブの結果は、対応しているどのプラットフォームにも届けられます。

プラットフォーム名だけを書くと（`slack`、`telegram` など）、そのプラットフォームで設定してある**ホームチャンネル**へ届きます。**特定の**宛先を指すときは、コロンに続けて宛先を書きます（`platform:<target>`）。宛先が解決されるのはジョブを作ったときではなく実行するときなので、まだつないでいないプラットフォームの宛先を先に書いておき、つながった時点から届き始める、という使い方もできます。

多くのプラットフォームでは、3つ目の区切りとしてスレッドやトピックも指定できます（`platform:<chat_id>:<thread_id>`）。

| 宛先 | 書き方 | 例 |
|--------|--------|---------|
| 発生元のチャット | `origin` | ジョブを作ったチャットへ届けます |
| ローカルのファイル | `local` | `~/.hermes/cron/output/` に保存します |
| Telegram | `telegram`, `telegram:<chat_id>`, `telegram:<chat_id>:<thread_id>`, `telegram:@username` | `telegram:-1001234567890:17585` |
| Discord | `discord`, `discord:#channel`, `discord:<channel_id>`, `discord:<channel_id>:<thread_id>` | `discord:#engineering` |
| Slack | `slack`, `slack:#channel`, `slack:<channel_id>`, `slack:<channel_id>:<thread_ts>` | `slack:#engineering` |
| Matrix | `matrix`, `matrix:<!room_id:server>`, `matrix:<@user:server>` | `matrix:!abc123:example.org` |
| Feishu | `feishu`, `feishu:<chat_id>`, `feishu:<chat_id>:<thread_id>` | `feishu:oc_abc123def` |
| WhatsApp | `whatsapp`, `whatsapp:<jid>`, `whatsapp:+<E.164>` | `whatsapp:123456@g.us` |
| Signal | `signal`, `signal:group:<id>`, `signal:+<E.164>` | `signal:group:aBcD==` |
| SMS | `sms`, `sms:+<E.164>` | `sms:+<E.164 number>` |
| メール | `email`, `email:<address>` | `email:alerts@example.com` |
| Weixin | `weixin`, `weixin:<wxid>` | `weixin:wxid_abc123` |
| Mattermost | `mattermost` または `mattermost:<channel_id>` | 名前だけなら Mattermost のホームへ届きます |
| Home Assistant | `homeassistant` または `homeassistant:<conversation>` | 名前だけなら HA の会話へ届きます |
| DingTalk | `dingtalk` または `dingtalk:<chat_id>` | 名前だけなら DingTalk へ届きます |
| WeCom | `wecom` または `wecom:<chat_id>` | 名前だけなら WeCom へ届きます |
| BlueBubbles | `bluebubbles` または `bluebubbles:<chat_guid>` | 名前だけなら BlueBubbles 経由で iMessage へ届きます |
| QQ Bot | `qqbot` または `qqbot:<chat_id>` | 名前だけなら公式 API v2 経由で QQ（Tencent）へ届きます |
| Bot Chat | `bot-chat` または `bot-chat:<profile>` | 手元のプロファイルの正規の Bot Chat へ流し込みます（ボットが応答します） |

前半のプラットフォームには、名前付きチャンネル（`#channel`）、トピックやスレッド、ルームや利用者の ID、グループ ID、電話番号といった、検証つきの書き方が用意されています。残りのプラットフォームは汎用の `platform:<chat_id>` の形を受け付けます（コロンの後ろの値はそのまま宛先の ID として使われます）。プラットフォーム名だけを書いた場合は、いつでもホームチャンネルへ届きます。

**名前付きチャンネル**（`slack:#engineering`、`discord:#engineering`、あるいは `slack:engineering` のような読みやすい名前）は、ゲートウェイがつながっているアダプタから作るチャンネル一覧に照らして解決されます。したがって名前で指すには、ゲートウェイがそのチャンネルを見つけている必要があります。ID をそのまま書く形（`slack:C0123ABCD45`）はいつでも使えます。

**Telegram のトピック**には `telegram:<chat_id>:<thread_id>` を使います（例: `telegram:-1001234567890:17585`）。**Slack のスレッド**の場合、3つ目の区切りは親メッセージの `thread_ts` です（例: `slack:C0123ABCD45:1700000000.000100`）。つまり既存のメッセージにぶら下げて返すときにだけ使えます。

**Bot Chat**（`bot-chat`、`bot-chat:<profile>`）はゲートウェイのアダプタではなく、その端末の中だけで完結する疑似プラットフォームです。スケジューラは `hermes [-p <profile>] chat --in ~ -c "Bot Chat" --create-if-missing -Q --query-file <tmp>` を走らせて届けます。これはボットモードでエージェント同士がやり取りするときと同じ経路なので、出力は本物の受信ターンとしてプロファイルの正規の Bot Chat に現れ、ボットはそれに対して丸ごと1ターン分の処理を行います（作りの上で発言の順番が崩れません。これはチャットコマンドの経路であって、会話の写しではありません）。名前を書かない場合はジョブ自身のプロファイルが宛先になります。プロファイル名を書いた形は、作成時と実行時の両方で `~/.hermes/profiles/` に照らして検証され、別の端末をまたぐことはありません。bot-chat の宛先は `all` という一括指定の対象から外れ、配信前の事前確認からも外れます（ゲートウェイの資格情報を使わないためです）。1回の配信ごとのサブプロセスの制限時間は `cron.bot_chat_delivery_timeout_seconds` です（既定は600）。

### 結果に添える定型文 {#response-wrapping}

既定（`cron.wrap_response: true`）では、cron の配信に次のものが添えられます。
- cron ジョブの名前とやったことを示す見出し
- 届けたメッセージをエージェント自身は会話として見られない、という断り書き

cron の応答の先頭に `[SILENT]` を付けると、配信そのものを止められます。ファイルへ書くだけ、あるいは何か別の処理をするだけのジョブに向いています。

### セッションの切り分け {#session-isolation}

cron の配信は、ゲートウェイのセッションの会話履歴には写されません。cron ジョブ自身のセッションの中にだけ存在します。こうすることで、届け先のチャットの会話で発言の順番が崩れるのを防いでいます。

## 再帰の防止 {#recursion-guard}

cron から実行されたセッションでは `cronjob` のツール群が無効になります。これにより次のことを防いでいます。

- 予定されたジョブが新しい cron ジョブを作ってしまうこと
- 再帰的に予定が増えてトークンの消費が跳ね上がること
- ジョブの中から、そのジョブ自身の予定をうっかり書き換えてしまうこと

## ロック {#locking}

スケジューラはプロセスをまたぐファイルロック（Unix では `fcntl.flock`、Windows では `msvcrt.locking`）を使い、処理が重なって同じジョブの束が二重に実行されるのを防ぎます。ゲートウェイのプロセス内ティッカーと、単独で動かした `hermes cron` や手動の `tick()` のあいだでも同じです。ロックを取れなかった場合、`tick()` はすぐに 0 を返します。

## CLI からの操作 {#cli-interface}

`hermes cron` の CLI からジョブを直接扱えます。

```bash
hermes cron list                    # Show all jobs
hermes cron create                  # Interactive job creation (alias: add)
hermes cron edit <job_id>           # Edit job configuration
hermes cron pause <job_id>          # Pause a running job
hermes cron resume <job_id>         # Resume a paused job
hermes cron run <job_id>            # Trigger immediate execution
hermes cron remove <job_id>         # Delete a job
```

## 関連するページ {#related-docs}

- [cron の機能ガイド](/hermes/docs/user-guide/features/cron/)
- [ゲートウェイの内部構造](/hermes/docs/developer-guide/gateway-internals/)
- [エージェントループの内部構造](/hermes/docs/developer-guide/agent-loop/)
