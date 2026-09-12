---
title: "定期実行タスク（cron）"
description: "自然な言葉で自動タスクを予約し、ひとつの cron ツールで管理して、スキルをひも付けます"
upstream_path: user-guide/features/cron.md
upstream_blob: a49dc7ec03345552572d90110da0f9d66efeda79
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/cron
---

# 定期実行タスク（cron） {#scheduled-tasks-cron}

自然な言葉、または cron 式で、タスクを自動的に走らせる予約ができます。Hermes は cron の管理を、schedule / list / remove といった別々のツールに分けず、`cronjob` というひとつのツールに動作（アクション）の形でまとめています。

## いま cron でできること {#what-cron-can-do-now}

cron ジョブでできることは次のとおりです。

- 1 回きりのタスクも、繰り返すタスクも予約できます
- ジョブを一時停止・再開・編集・手動実行・削除できます
- ジョブにスキルを 0 個、1 個、あるいは複数ひも付けられます
- 結果を、作成元のチャット、ローカルのファイル、設定済みのプラットフォームへ届けられます
- 通常の固定ツール一覧を持った、新しいエージェントセッションとして実行されます
- **no-agent モード**で実行できます。スクリプトを時刻どおりに走らせ、その標準出力をそのまま届ける、LLM をいっさい使わない動き方です（後述の [no-agent モード](#no-agent-mode-script-only-jobs)の節を参照）

これらはすべて `cronjob` ツールを通じて Hermes 自身からも使えます。つまり、ふつうの言葉で頼むだけでジョブの作成・一時停止・編集・削除ができ、CLI は必須ではありません。

:::tip
**cron ジョブはどのモデルで動くのか。** 実行時の解決順は、ジョブごとの固定 → `config.yaml` の `cron.model` → `hermes model` で決めた全体の既定値、の順です。

- **ジョブごとの固定** — これを設定するのは*あなた*で、ダッシュボード、`hermes cron create/edit --model … --provider …`、または `~/.hermes/cron/jobs.json` の編集で行います。いちど設定すれば、変更するまで固定されたままです。エージェントの `cronjob` ツールからジョブごとのモデルを設定・変更することはできません。推論の固定は利用者が持つ権限です。
- **`cron.model` / `cron.model_provider`** — cron 全体の既定値です。固定していないジョブはすべてこのモデルで動き、チャットで使うモデルとは切り離されます。一度設定しておけば（`hermes config set cron.model <name>`）、`hermes model` や `/model` でチャットのモデルを切り替えても cron 側にはいっさい影響しません。
- **全体の既定値** — 上のどちらも設定していないときだけ、ジョブは `hermes model` に従います。この場合 Hermes は作成時のプロバイダとモデルを**スナップショット**として控え、それがそのジョブの実質的な固定になります。あとで全体の既定値を切り替えると（`hermes model`、`/model`、`hermes config set model.default …`）、ジョブは**作成したときのモデルとプロバイダのまま動き続け**、実行ごとに差分を記した INFO 行を 1 行ログへ残します。全体のモデルを変えても予約実行が止まることはなく、無人で動くジョブが有料のプロバイダ・モデルへの切り替えを黙って引き継ぐこともありません（#44585）。新しい既定値へジョブを移したいときは、固定して明示するか（`hermes cron edit <job_id> --provider <provider> --model <model>`）、`cron.model` を設定して cron 全体をいちどに移してください。スナップショットの仕組みができる前に作られたジョブは、いまも動いている全体の既定値に従い続けます。

どのプロバイダに解決されたとしても、そのプロバイダ固有のリクエスト設定（たとえば独自プロバイダ向けの `extra_body` / `extra_headers` といった `request_overrides`）は、対話セッションと同じように予約実行にも引き継がれます。

無人で動かすなら `hermes setup --portal` がいちばん手間がかかりません。OAuth の更新が自動だからです。[Nous Portal](/hermes/docs/integrations/nous-portal/) を参照してください。
:::

:::tip
**ジョブごとの推論の深さ。** ジョブは、モデルの固定とは別に、自分の思考レベルを固定できます。指定できるのは `none`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max`、`ultra` のいずれかです。設定すると、そのジョブの実行に限って全体の `agent.reasoning_effort` とモデルごとの `agent.reasoning_overrides` の両方を上書きします（`none` は思考を止めます）。設定は `hermes cron create/edit --reasoning-effort high` で行い、編集時に空文字列を渡すと固定を外して設定ファイルに従う状態へ戻ります。（エージェントの `cronjob` ツールにはあえて出していません。モデルの設定は利用者が決めることだからです。）モデルが対応していないレベルは、リクエスト時にプロバイダ側で丸められるか無視されます。`high` が上限のモデルに `xhigh` を固定しても `high` で動きます。`no_agent` のジョブにはこの固定は効きません（調整すべき LLM の呼び出しがないからです）。重い分析の予約実行は `high` で、安く繰り返すジョブは `minimal` で、というように、全体の既定値に触らずに使い分けられます。
:::

:::warning
cron から起動されたセッションは、さらに cron ジョブを作ることはできません。予約が際限なく増えていくのを防ぐため、Hermes は cron の実行中は cron 管理ツールを無効にします。
:::

## 予約タスクを作る {#creating-scheduled-tasks}

### チャットで `/cron` を使う {#in-chat-with-cron}

```bash
/cron add "in 30m" "Remind me to check the build"
/cron add "every 2h" "Check server status"
/cron add "every 1h" "Summarize new feed items" --skill blogwatcher
/cron add "every 1h" "Use both skills and combine the result" --skill blogwatcher --skill maps
```

### 単体の CLI から {#from-the-standalone-cli}

```bash
hermes cron create "every 2h" "Check server status"
hermes cron create "every 1h" "Summarize new feed items" --skill blogwatcher
hermes cron create "every 1h" "Use both skills and combine the result" \
  --skill blogwatcher \
  --skill maps \
  --name "Skill combo"
```

### ふつうの会話で頼む {#through-natural-conversation}

Hermes にいつもどおり話しかけます。

```text
Every morning at 9am, check Hacker News for AI news and send me a summary on Telegram.
```

Hermes は内部で `cronjob` ツールを使ってくれます。

## 実行前の設定チェック {#pre-dispatch-configuration-validation}

予約実行のためにエージェントの仕組みを組み立てる前に、スケジューラはそのジョブの設定で
実際に成功しうるかどうかを確かめます。

- プロバイダの API キーが解決できること（`fallback_providers` の連鎖を設定しているときは
  飛ばします。主キーが欠けていても切り替え先が救ってくれる可能性があるためです）
- ひも付けたスキルが動く状態であること（必須の環境変数・コマンド・資格情報ファイルが
  欠けていないこと）
- 配信先のプラットフォームが既知で、ゲートウェイの資格情報が設定されていること
  （`local` / `origin` 宛ては対象外です）

チェックに落ちると、ジョブの `last_status` は `blocked_config` になり、知らせは 1 回だけ
届き（ティックごとに繰り返しません）、**LLM は呼ばれません**。設定を誤ったジョブが
トークンを使うことはありません。次に正常に動いた実行がこの停止状態を解除するので、
その後また設定が壊れたときにはあらためて知らせが届きます。

このチェックを無効にして以前の動き（そのまま実行して途中で失敗する）に戻すには、
次のようにします。

```yaml
cron:
  preflight: false
```

または `hermes config set cron.preflight false` を実行します。

## 固定していないジョブを新しい全体の既定値へ移す {#moving-unpinned-jobs-to-a-new-global-default}

固定していないジョブは、作成したときのプロバイダ・モデルのままなので、チャットのモデルを
変えても cron 全体が変わったり止まったりすることはありません。予約実行のジョブを*あえて*
移したいときは、次のようにします。

```bash
hermes cron edit <job_id> --provider <provider> --model <model>   # one job
hermes config set cron.model <model>                               # every unpinned job
```

`hermes config set model.default …` や Desktop のモデル選択画面には、元のモデルのまま
残る、固定していないジョブの一覧が出るので、意図して決められます。控えてあるスナップショット
は、ジョブのプロバイダ・モデル・base URL を編集するたびに更新されます。

## スキルを付けた cron ジョブ {#skill-backed-cron-jobs}

cron ジョブは、プロンプトを走らせる前にスキルをひとつ以上読み込めます。

### スキル 1 つ {#single-skill}

```python
cronjob(
    action="create",
    skill="blogwatcher",
    prompt="Check the configured feeds and summarize anything new.",
    schedule="0 9 * * *",
    name="Morning feeds",
)
```

### スキル複数 {#multiple-skills}

スキルは並べた順に読み込まれます。プロンプトは、そのスキルの上に重ねる作業指示になります。

```python
cronjob(
    action="create",
    skills=["blogwatcher", "maps"],
    prompt="Look for new local events and interesting nearby places, then combine them into one short brief.",
    schedule="every 6h",
    name="Local brief",
)
```

これは、予約実行するエージェントに使い回しの手順を引き継がせたいけれど、スキルの全文を cron のプロンプトに詰め込みたくはない、というときに便利です。

## プロジェクトのディレクトリで実行する {#running-a-job-inside-a-project-directory}

cron ジョブは既定では、どのリポジトリからも切り離されて動きます。`AGENTS.md`、`CLAUDE.md`、`.cursorrules` は読み込まれず、ターミナル・ファイル・コード実行の各ツールはゲートウェイが起動したときの作業ディレクトリで動きます。これを変えるには、`--workdir`（CLI）または `workdir=`（ツール呼び出し）を渡します。

```bash
# Standalone CLI (schedule and prompt are positional)
hermes cron create "every 1d at 09:00" \
  "Audit open PRs, summarize CI health, and post to #eng" \
  --workdir /home/me/projects/acme
```

```python
# From a chat, via the cronjob tool
cronjob(
    action="create",
    schedule="every 1d at 09:00",
    workdir="/home/me/projects/acme",
    prompt="Audit open PRs, summarize CI health, and post to #eng",
)
```

`workdir` を設定すると、次のようになります。

- そのディレクトリの `AGENTS.md`、`CLAUDE.md`、`.cursorrules` がシステムプロンプトに差し込まれます（探しに行く順番は対話型 CLI と同じです）
- `terminal`、`read_file`、`write_file`、`patch`、`search_files`、`execute_code` のすべてが、そのディレクトリを作業ディレクトリとして使います
- 指定するパスは、実在する絶対パスのディレクトリでなければなりません。相対パスや存在しないディレクトリは、作成時・更新時に弾かれます
- 編集時に `--workdir ""`（ツールなら `workdir=""`）を渡すと設定が消え、元の動きに戻ります

:::note 分離
エージェントの実行はそれぞれ、自分の `workdir` をその実行だけの識別子にひも付けます。そのため workdir を持つジョブも、プロセス全体で共有するターミナル状態を書き換えたり、同時に動く実行どうしでパスが漏れたりすることなく、通常の並列プールを使えます。cron の同時実行数そのものを抑えたいときは `cron.max_parallel_jobs` を設定してください。
:::

## ジョブを編集する {#editing-jobs}

内容を変えたいだけなら、ジョブを消して作り直す必要はありません。

:::tip ジョブの指定
以下（および[ライフサイクル操作](#lifecycle-actions)）で出てくる `<job_id>` のところには、ジョブの名前（大文字小文字は区別しません）も書けます。16 進の ID は覚えていないけれど `morning-digest` なら覚えている、というときに便利です。ジョブ ID に完全一致すればそちらが優先され、ID ではない指定で複数のジョブの名前に当たった場合は、コマンドは実行を断り、候補の ID を並べて表示するので、どれなのかを指定し直せます。
:::

### チャット {#chat}

```bash
/cron edit <job_id> --schedule "every 4h"
/cron edit <job_id> --prompt "Use the revised task"
/cron edit <job_id> --skill blogwatcher --skill maps
/cron edit <job_id> --remove-skill blogwatcher
/cron edit <job_id> --clear-skills
```

### 単体の CLI {#standalone-cli}

```bash
hermes cron edit <job_id> --schedule "every 4h"
hermes cron edit <job_id> --prompt "Use the revised task"
hermes cron edit <job_id> --skill blogwatcher --skill maps
hermes cron edit <job_id> --add-skill maps
hermes cron edit <job_id> --remove-skill blogwatcher
hermes cron edit <job_id> --clear-skills
```

補足です。

- `--skill` を繰り返すと、そのジョブにひも付いたスキル一覧を置き換えます
- `--add-skill` は、いまの一覧を置き換えずに追加します
- `--remove-skill` は、指定したスキルだけを外します
- `--clear-skills` は、ひも付いたスキルをすべて外します

## ライフサイクル操作 {#lifecycle-actions}

cron ジョブには、作成と削除だけではない、もっと幅のある操作がそろっています。

### チャット {#chat}

```bash
/cron list
/cron pause <job_id>
/cron resume <job_id>
/cron run <job_id>
/cron remove <job_id>
```

### 単体の CLI {#standalone-cli}

```bash
hermes cron list
hermes cron pause <job_id_or_name>
hermes cron resume <job_id_or_name>
hermes cron run <job_id_or_name>
hermes cron remove <job_id_or_name>
hermes cron edit <job_id_or_name> [...flags]
hermes cron status
hermes cron tick
```

それぞれの働きは次のとおりです。

- `pause` — ジョブは残したまま、予約を止めます
- `resume` — ジョブを再び有効にし、次に動く時刻を計算し直します
- `run` — 次のスケジューラのティックでジョブを走らせます
- `remove` — ジョブを完全に削除します
- `edit` — スケジュール、プロンプト、配信先などを変更します

**名前で指定する。** 状態を変える 4 つの動詞（`pause`、`resume`、`run`、`remove`、`edit`）と、エージェントの `cronjob` ツールは、16 進の ID の代わりにジョブの**名前**（大文字小文字は区別しません）も受け付けます。エージェントも CLI も、ID に完全一致するものがあればそちらを優先します。名前が複数のジョブに当たってあいまいなときは実行を断り、候補の ID をすべて表示するので、明示的に選べます。名前は一意ではないので、この歯止めは効いています。同じ名前のジョブが 2 つあるときに、黙って違うほうを書き換えてしまうのを防いでくれます。

### 一時停止の状態で作る（安全なカナリア） {#creating-a-job-paused-safe-canary}

作ってから止める間に予約が走ってしまう、という競合なしにカナリアを用意できます。

```bash
hermes cron create "every 1h" "Post the digest" --paused --paused-reason "Awaiting review"
hermes cron resume <job_id>
```

`--paused` は、最初のロック付き書き込みの中で `enabled: false`、`state: paused`、
`next_run_at: null`、一時停止の時刻、そして後から追える理由を保存し、実行のきっかけを
登録しません。理由を省くと "Created paused; awaiting operator approval." が保存されます。
`--paused` を付けなければ、これまでどおり有効な状態で作られます。`--paused-reason` には
`--paused` が必要で、正しくない値は保存の前に弾かれます。

同じ `paused` の真偽値と、任意の `paused_reason` の文字列は、`cron.jobs.create_job`、
cron 管理ツールの `create` 動作、ゲートウェイの `POST /api/jobs`、ダッシュボードの
`POST /api/cron/jobs` でも受け付けます。resume すると次の実行時刻が予約されます。
一時停止が止めるのは自動の実行であって、運用者が明示的に動かすことは止めません。
既存の **Run now** や強制実行はそのまま使えて、ジョブを再開して走らせられます。
ジョブを実行できる運用者に対する、セキュリティ上の境界ではありません。

## エージェントに予約を任せる（cron ジョブが cron ジョブを管理する） {#agent-managed-scheduling-cron-jobs-that-manage-cron-jobs}

既定では、スケジューラ*から*起動されたエージェントは `cronjob` ツールを使えません。
予約実行のジョブが、ほかのジョブを作ったり編集したり削除したりはできない、ということです。
`config.yaml` で使うことを選べます。

```yaml
cron:
  allow_agent_scheduling: true   # default: false
```

有効にすると、予約実行のエージェントも、チャットのセッションと同じように cron の表を
管理できます。予約された作業の中から続きの 1 回きりジョブを入れる、自分の実行間隔を
調整する、表全体をならす「cron の司書」ジョブを走らせる（一覧を見てから、必要に応じて
更新・削除・作成する）といったことができます。次の 2 つの性質が、これを暴走させずに
保ちます。

- **表はひとつ、持ち主はあなた。** cron の実行から作られたジョブも、ほかのジョブと
  同じ `jobs.json` に入り、特別な所有権はありません。自分で作ったものとまったく同じように
  一覧・編集・削除ができます。
- **宛先が宙に浮かない。** cron の実行は使い捨てなので、その中からの `deliver: origin` は
  **作成時に**、作った側のジョブ自身の具体的な宛先へ解決されます
  （`platform:chat_id[:thread_id]`、作った側がどこにも配信していなければ `local`）。
  予約実行のエージェントが作ったジョブが、もう存在しないセッションへ出力を向けることは
  ありません。明示的な宛先（`local`、`all`、`telegram:<chat_id>`）はそのまま尊重されます。

毎回新しいジョブを作るプロンプトより、既存のジョブを更新するプロンプト（まず一覧を見て、
ID を指定して更新する）のほうが望ましいです。

## 仕組み {#how-it-works}

**cron の実行はゲートウェイのデーモンが担います。** ゲートウェイは 60 秒ごとにスケジューラを叩き、実行時刻の来たジョブを独立したエージェントセッションで走らせます。

```bash
hermes gateway install     # Install as a user service
sudo hermes gateway install --system   # Linux: boot-time system service for servers
hermes gateway             # Or run in foreground

hermes cron list
hermes cron status
```

### ゲートウェイのスケジューラの動き {#gateway-scheduler-behavior}

ティックのたびに Hermes は次のことをします。

1. `~/.hermes/cron/jobs.json` からジョブを読み込む
2. `next_run_at` を現在時刻と照らし合わせる
3. 実行時刻の来たジョブごとに、新しい `AIAgent` のセッションを開始する
4. 必要ならひも付いたスキルを、その新しいセッションに差し込む
5. プロンプトを最後まで走らせる
6. 最終的な返答を配信する
7. 実行の記録と次回の予定時刻を更新する

`~/.hermes/cron/.tick.lock` のファイルロックが、スケジューラのティックが重なって同じジョブの束を二重に走らせるのを防ぎます。

### systemd の下で再起動に強い働き手 {#restart-safe-workers-under-systemd}

ゲートウェイを systemd のサービスとして動かしているときは、実行時刻が来たジョブを、使い捨てのユーザースコープ（`systemd-run --user --scope`）で起動した外部の働き手プロセスへ 1 件ずつ渡します。そのため、ジョブの途中でゲートウェイを再起動してもジョブは止まりません。このスコープを作るには、ユーザーの systemd セッションが必要です。それを持たないホスト（コンテナ、最小構成の LXC、linger を有効にしていないサービス用ユーザー）では用意できません。

その場合、cron は既定で**格下げして動きます**。ジョブは同じ実行の受け渡しで別の外部プロセスとして走りますが、cgroup による隔離はありません。そのため、ジョブの途中でゲートウェイを再起動するとジョブも止まります（実行台帳にそのことが記録されます）。警告はゲートウェイのプロセスごとに 1 回だけログに出ます。格下げせずに安全側で止めたい、つまりジョブを飛ばしてジョブの行にエラーを記録したい場合は、次のように設定します。

```yaml
cron:
  require_restart_safe_scope: true
```

根本的に直すには、ゲートウェイを動かすユーザーにユーザーセッションを用意します。`sudo loginctl enable-linger <gateway-user>` を実行し（システム全体へのインストールでは、ユニットに `XDG_RUNTIME_DIR` / `DBUS_SESSION_BUS_ADDRESS` も設定します）、ゲートウェイを再起動してください。Kanban の働き手はこのキーに関係なく、つねにスコープを必要とし、用意できなければ止まります。

### 実行履歴 {#execution-history}

Hermes は、cron の実行を引き受けるたびに、その試行をプロファイルごとの
`~/.hermes/cron/executions.db` に記録します。実行役やプロバイダへ渡すよりも先です。試行は
`claimed`、`running` を経て、`completed`、`failed`、`unknown` のいずれか、変更できない
終端の状態にたどり着きます。再起動のあと、Hermes が放置された試行を `unknown` と印を付けるのは、
元の PID とプロセス起動の指紋から、その持ち主がもういないと証明できるときだけです。
unknown の試行は監査のための記録で、自動的に再実行されることはありません。

最近の試行は `hermes cron runs [job-id] --limit 20`（別名は `history`）で確認できます。
終端に達した履歴には上限がありますが、進行中の試行が消されることはありません。この台帳は
簡易バックアップにも含まれます。

予約実行の試行は、引き受けた時刻とは別に、予定されていた正確な時刻も記録します。古い
`jobs.json` のスナップショットが、台帳では完了済みになっている回をもう一度予約しようとしても、
Hermes はその再実行を飛ばし、繰り返すジョブの起点を取り直します。スナップショットが実行の
記録より古い場合や、元の実行が遅れて始まった場合でも、これは働きます。手で明示的に走らせた
実行は、予約された回の識別子を消費しません。

これは副作用がきっちり 1 回だけ、という保証ではありません。識別子を持たない古い行、消えた履歴、
読めない台帳、途中で切れた試行は、完了を証明できません。台帳そのものを古いバックアップへ
戻した場合も、その証拠は失われます。外部からの実行コールバックが指すのは、いま受け付けている
ストア上の引き受けであって、コールバックに含まれない上流の予約枠ではありません。

### 失敗が続いたときの見直しの促し {#repeated-failure-review-nudge}

ジョブはそれぞれ `failure_streak`（連続して失敗した回数）を数えています。配信の失敗は
数えません。エージェントに届く前に落ちた実行 — 更新が中途半端で import に失敗した、
プロバイダのクライアントを組み立てられなかった、といった場合 — も、エージェント自身が
失敗したときと同じように数え、同じように知らせます。*繰り返す*ジョブでこの連続回数が
しきい値に届くと、チャットへ届く失敗の知らせに、見直しを促す一文が加わります。N 回続けて
失敗していること、直すか、止める（`hermes cron pause <job>`）か、消すかを勧める内容です。
1 回でも成功すれば連続回数は 0 に戻り、`hermes cron list` は失敗しているジョブの直近の実行と
並べて連続回数を表示します。1 回きりのジョブでは促しは出ません。

```yaml
cron:
  failure_nudge_threshold: 3   # default; 0 disables the nudge
```

### 失敗の記録: 分かっている失敗に了解を出す {#failure-incidents-acknowledge-a-known-failure}

*同じ*エラーで失敗し続ける繰り返しジョブは、実行のたびにあなたを呼びます。それぞれの
失敗は、ジョブとエラー文の正規化した特徴を鍵にした、消えない**インシデント**としても、
実行履歴と同じプロファイルごとの台帳データベースに記録されます。

```bash
hermes cron incidents                 # list incidents (newest activity first)
hermes cron incidents --state alerted # filter: detected | alerted | closed
hermes cron incidents ack <id>        # acknowledge — stop re-pinging
```

インシデントに了解を出すと、その特徴とまったく同じ失敗についてだけ、実行ごとの呼び出しが
静かになります。ほかは何も変わりません。実行履歴はすべての失敗を記録し続け、連続失敗回数も
数え続け、*別の*エラーで失敗し始めた瞬間に新しいインシデントが作られて、また知らせが飛びます。
成功してもインシデントには触れません。インシデントはジョブごとではなく、特徴ごとだからです。

インシデントの流れは、`detected`（失敗を記録した）→ `alerted`（失敗の知らせが少なくとも
1 回は配信まで届いた）→ `closed`（了解が出た。その特徴についてはここで終わり）です。
保存されるエラー文は、書き込む前に秘密の部分が伏せられ、長さも切り詰められます。

記録はつねに行われ、放っておいても費用はかかりません。あなたが明示的に `ack` を出すまで、
知らせが抑えられることはありません。

### ジョブ全体の健康診断: `hermes cron doctor` {#fleet-health-check-hermes-cron-doctor}

`hermes cron doctor` は、有効なすべてのジョブを見て回る、読むだけの健康診断です。
ジョブごとの問題をまとめて表示し、手を打つべきものが見つかると終了コード `1`
（健全なら `0`）を返します。端末からでも、見張り役のスクリプトからでも、CI 風の
簡易チェックからでも使えます。

```bash
hermes cron doctor
```

有効なジョブごとに見るのは次の点です。

- 直近の実行が失敗している（`last_status` が ok でない。記録されたエラーも表示）
- 直近の配信が失敗している（出力はできたのに、あなたのところへ届かなかった）
- `next_run_at` が無い、あるいは 15 分のティック待ちの猶予を超えて過去に置き去りに
  なっている。「ジョブが黙って動いていない」の合図です（スケジューラが死んでいる、
  ゲートウェイが落ちている、実行の引き受けが詰まっている）
- スクリプトが無い、ファイルではない、`HERMES_HOME/scripts` の外を指している
- スクリプトの無い `no_agent` ジョブ
- 設定した `workdir` がもう存在しない

doctor がジョブや状態を書き換えることはありません。報告するだけです。引っかかったジョブを
掘り下げるときは、`hermes cron incidents`（消えない失敗の記録）や `hermes cron runs`
（試行の台帳）と組み合わせてください。

## 配信先の選択肢 {#delivery-options}

ジョブを予約するときは、出力の届け先を指定します。

| 指定 | 説明 | 例 |
|--------|-------------|---------|
| `"origin"` | ジョブを作った場所へ返す | メッセージ系プラットフォームでの既定 |
| `"local"` | ローカルのファイルにだけ保存（`~/.hermes/cron/output/`） | CLI での既定 |
| `"telegram"` | Telegram のホームチャンネル | `TELEGRAM_HOME_CHANNEL` を使用 |
| `"telegram:123456"` | ID で指定した Telegram のチャット | 直接届ける |
| `"telegram:-100123:17585"` | 指定した Telegram のトピック | `chat_id:thread_id` の形式 |
| `"discord"` | Discord のホームチャンネル | `DISCORD_HOME_CHANNEL` を使用 |
| `"discord:#engineering"` | 指定した Discord のチャンネル | チャンネル名で指定 |
| `"slack"` | Slack のホームチャンネル | |
| `"whatsapp"` | WhatsApp のホーム | |
| `"signal"` | Signal | |
| `"matrix"` | Matrix のホームルーム | |
| `"mattermost"` | Mattermost のホームチャンネル | |
| `"email"` | メール | |
| `"sms"` | Twilio 経由の SMS | |
| `"homeassistant"` | Home Assistant | |
| `"dingtalk"` | DingTalk | |
| `"feishu"` | Feishu / Lark | |
| `"wecom"` | WeCom | |
| `"weixin"` | Weixin（WeChat） | |
| `"bluebubbles"` | BlueBubbles（iMessage） | |
| `"qqbot"` | QQ Bot（Tencent QQ） | |
| `"bot-chat"` | このプロファイル本来の Bot Chat。ボットが出力を読んで応答する | 同じ端末の中 |
| `"bot-chat:research"` | 同じ端末の別プロファイルの Bot Chat | 作成時に検証される |
| `"all"` | つながっているホームチャンネル全部へ流す | 実行時に解決される |
| `"telegram,discord"` | 指定した複数のチャンネルへ流す | カンマ区切りの並び |
| `"origin,all"` | 作成元に**加えて**、つながっているほかのチャンネル全部へ届ける | どの指定でも組み合わせ可 |

エージェントの最終的な返答は、設定した `deliver:` の宛先へ自動的に届きます。エージェント自身がメッセージを送るわけではないので、cron のプロンプトの中で何かを呼ぶ必要はありません。

### 配信の失敗は別の状態として扱う {#delivery-failures-are-a-distinct-status}

実行と配信は別々に記録されます。エージェントの実行は成功したのに出力が宛先へ届かなかった
とき（プラットフォームの 5xx、レート制限、古くなったセッション、アダプタが送信できた証拠を
返さなかった）、ジョブには `last_status: delivery_failed` が記録され、ただの `ok` には
なりません。理由は `last_delivery_error` に入ります。`hermes cron list` はこれを黄色で
`delivery_failed: <reason>` と表示し、`hermes cron doctor` は配信の問題として報告し、
手動の `cronjob run` は配信のエラーとともに `success: false` を返します。配信の失敗は
そのジョブの `failure_streak` には数えません（エージェントは仕事をしたからです）。次に
完全に成功した実行で、状態は `ok` に戻ります。

### Bot Chat への配信（`bot-chat`） {#bot-chat-delivery-bot-chat}

`bot-chat` は、出力を**あるプロファイル本来の「Bot Chat」セッションへ、実際のメッセージとして**届けます。ほかの宛先ではチャンネルを読む人間が受け手ですが、ここでの受け手はボット自身です。ボットは出力を受信メッセージとして受け取り、対応が必要なことがあれば動き、自分のチャットで応答します。予約実行の出力を、ただ投稿するのではなく*処理させたい*ときに使ってください。

- `bot-chat`（そのまま）は、そのジョブ自身のプロファイルを指します。
- `bot-chat:<profile>` は、**同じ端末の**別のプロファイルを指します。名前はジョブの作成時に `hermes profile list` と照らして検証されます。ほかのゲートウェイや別の端末にあるプロファイルは指定できないので、端末をまたいで同じ名前があってもあいまいにはなりません。
- 配信 1 回ごとに、受け手のボットのエージェントのターンを 1 回まるごと使います。実行間隔には気を配ってください。
- ほかの宛先と組み合わせられます（`bot-chat,telegram`）が、`all` には含まれません。
- 本来のチャットが、メールボックスに対応した Desktop / TUI のバックエンドで開かれている場合、ボットが空いていても取り込み中でも、配信は**その場で確実に待ち行列へ入ります**。受信のターンを走らせるのは、そこにいる持ち主だけです。cron が競合する CLI の書き手を立ち上げることはありません。メールボックスの持ち主がいなければ、これまでどおり `hermes chat -c "Bot Chat" --create-if-missing` の経路が使えます（通常のセッション所有権のチェックはそのまま働きます）。
- **待ち行列に入ったことは、完了ではありません。** cron は受領 ID と `queued` / `claimed` の状態を `last_delivery_queued` に記録し、配信の結果は `queued`（届いてもいないし、失敗してもいない）になります。成功したジョブは `delivery_queued` と表示されます。ほかの宛先で本当のエラーが起きていれば、そちらが配信の失敗として優先されます。ボットは後から終えるかもしれません。正本となるのは、受け手のプロファイルにある `runtime/bot_live_delivery/<receipt-id>.json` の受領記録です。cron 側に残る当時の状態が自動で更新されることはありません。
- 同じ実行をもう一度確かめると、持ち主が消えていても、その既存の受領記録を見にいきます。いちど受け付けたあとで、別の書き手へ切り替えることはありません。`failed`、`cancelled`、`ambiguous` の受領記録が自動で再実行されることはありません。あらためて作業を始める前に、チャットと受領記録を確かめてください。cron の実行ごとに、配信 ID は別のものになります。

### 届け先の意図（`all`） {#routing-intent-all}

`all` を使うと、名前をひとつずつ並べなくても、設定済みのメッセージ系チャンネル全部へひとつの cron ジョブを届けられます。**実行時に解決される**ので、Telegram をつなぐ前に作ったジョブでも、`TELEGRAM_HOME_CHANNEL` を設定した次のティックからは Telegram を拾ってくれます。

意味は次のとおりです。`all` は、ホームチャンネルが設定されているプラットフォームすべてに展開されます。ゼロでも構いません。その場合ジョブは届け先を生まないだけで、上流では配信の失敗として記録されます。

`all` は明示的な宛先とも組み合わせられます。`origin,all` は、作成元のチャット*に加えて*、つながっているほかのホームチャンネル全部へ届け、`(platform, chat_id, thread_id)` で重複を除きます。

### Telegram の cron トピック（`TELEGRAM_CRON_THREAD_ID`） {#telegram-cron-topic-telegramcronthreadid}

Telegram のトピックモードを有効にしていると、ルートの DM はシステムのロビーとして予約されます。そこへ返信を送るとロビーだという案内が返り、`reply_to_message_id` は落とされるので、メインのチャットに届いた cron のメッセージには返信できません。

代わりに、cron 専用のフォーラムトピックを用意して、そちらへ向けてください。

1. Telegram でボットとの DM を開き、たとえば `Cron` という名前のトピックを作ります。トピックのヘッダを長押しして **Copy link** を選ぶと、末尾の整数がそのトピックの `message_thread_id` です。
2. `.env` に `TELEGRAM_CRON_THREAD_ID=<that id>` を設定します。

これは cron の配信にだけ効きます。`TELEGRAM_HOME_CHANNEL_THREAD_ID`（再起動の通知など、ほかの場面で使われます）はそのままです。明示的な `deliver="telegram:chat_id:thread_id"` の宛先は、これまでどおり環境変数より優先されます。cron のメッセージへの返信は既存のトピックのセッションに届くので、そのまま対応できます。

### 返答の囲み {#response-wrapping}

既定では、配信される cron の出力にはヘッダとフッタが付き、受け取った側に予約タスクからのものだと分かるようになっています。

```
Cronjob Response: Morning feeds
-------------

<agent output here>

Note: The agent cannot see this message, and therefore cannot respond to it.
```

囲みなしでエージェントの出力そのままを届けたいときは、`cron.wrap_response` を `false` にします。

```yaml
# ~/.hermes/config.yaml
cron:
  wrap_response: false
```

### プッシュ通知（`cron.delivery.notify`） {#push-notifications-crondeliverynotify}

cron の出力は途中経過ではなく*最終的な*配信なので、既定ではプラットフォームの通知フラグを
立てて送られます。Telegram では、アダプタの通知モードが `important` のときでも
（そのモードは通常 `disable_notification=true` で送るため、利用者から「まるで届かない」と
言われていました）まとめの配信でプッシュが飛ぶ、ということです。静かな配信に戻すには
次のようにします。

```yaml
# ~/.hermes/config.yaml
cron:
  delivery:
    notify: false   # default: true
```

このフラグはテキストの送信にも、添付するメディアにも同じように効くので、片方だけプッシュが
飛んでもう片方は静か、ということは起きません。

### 配信の確認と `UNVERIFIED` の状態 {#delivery-confirmation-and-the-unverified-state}

稼働中のアダプタ経由の配信が「届いた」と記録されるのは、アダプタからの前向きな証拠が
あるときだけです。フィルタで落とされた（`delivered: false`）ものではない明示的な
`success` に加えて、`message_id` か `raw_response` があること、が条件です。`success` は
あるのにそのどちらも無い結果 — Slack、Matrix、Mattermost のアダプタが返す形です — も、
失敗の証拠ではないので受け入れますが、その実行はジョブに `last_delivery_unverified` として
記録され、`hermes cron list` に次のように現れます。

```
⚠ Delivery UNVERIFIED: adapter acked slack:C0123456 without message_id/raw_response
```

`hermes cron doctor` では `last delivery unverified (...)` として出ます。この印は、証拠を
伴って配信できた次の実行で消えます。中身が空の内容（テキストもメディアも無い）は
アダプタへ渡されることがありません。安全側に倒して失敗となり、届いたとは記録されずに
`last_delivery_error` に理由が入ります。

### 会話を続けられるジョブ（cron の配信に返信する） {#continuable-jobs-reply-to-a-cron-delivery}

既定では cron の配信は送りっぱなしです。メッセージは送られますが、そのチャットの会話履歴には
残らないので、返信してもエージェントには自分が何を言ったかの記録がありません。ジョブを
**続けられる**設定にすると、届いたまとめが返信できる会話になります。エージェントはまとめを
文脈として持っているので、「Task #2 とは何ですか」と聞き返すことがなくなります。

これは選んで使う設定で、**既定は無効**です。設定ファイルで全体を有効にするか、`cronjob`
ツールの `attach_to_session`（そのジョブについて全体の設定を上書きします）でジョブごとに
有効にします。

```yaml
# ~/.hermes/config.yaml
cron:
  mirror_delivery: false   # set true to make cron deliveries continuable
```

動きは**スレッド優先**で、そのジョブ自身の会話の中に閉じています。

- **スレッドを持てるプラットフォーム**（Telegram のトピック、Discord / Slack のスレッド）では、
  配信ごとに専用のスレッドが開かれ、まとめがそのスレッドのセッションに入ります。スレッド内で
  返信すれば、文脈を保ったまま続けられます。繰り返すジョブ（たとえば毎日のまとめ）は実行ごとに
  新しいスレッドを開くので、配信ごとの続きの話が混ざりません。
- **DM しかないプラットフォーム**（WhatsApp、Signal、SMS）にはスレッドが無いので、まとめは
  宛先の DM のセッションへ写されます（作成元の DM か、退避先やプラットフォーム名だけのジョブでは
  ホームの DM）。DM そのものが、続きを話す場になります。

触れられるのは、そのジョブ**自身の会話**だけです。

- ジョブが作られた**作成元のチャット**
- `deliver: origin` が作成元を捕まえられなかったときの**ホームチャンネルへの退避先**
  （稼働中のゲートウェイのチャットからではなく、スクリプトや API で作られたジョブの場合）。
  利用者の主な会話が作成元の代わりを務めます
- ジョブに**ひとつだけ明示的に指定した `platform:chat` の宛先**。ただしジョブ自身が
  `attach_to_session: true` で選んだときに限ります。その宛先を会話として扱うと、ジョブの
  作者が宣言したことになるからです。全体の `mirror_delivery` フラグだけでは、明示的に
  宛先を指定したチャットが続けられるようになることはありません。

一斉配信に展開される宛先（`all`）が続けられるようになることはありません。利用者が自分で
プラットフォーム名だけを書いた宛先（`deliver: slack`）は、そのプラットフォームのホームチャンネルを
意図して指定したものとして扱われ、上のホームチャンネルへの退避先と同じ規則に従います。
アップグレード後は、`cron.mirror_delivery: true` を設定した既存の `deliver: <platform>` のジョブが、
スレッドを持てるプラットフォームで実行ごとに新しいスレッドを開くことがあります。この実行ごとに
スレッドを開く動きを止めたいときは、ジョブに `attach_to_session: false` を設定します。

写しはラベル付きの利用者のターン（`[Cron delivery: <task name>]`）
として書かれるので、どのモデルのプロバイダでも会話履歴の交互の並びが崩れません。

#### チャンネルに平置きで続ける（Slack） {#flat-in-channel-continuation-slack}

上のスレッド優先の動きでは、配信のたびに専用のスレッドが作られます。続けられるジョブを
**チャンネルのタイムラインに平置き**したい（スレッドを作りたくない）場合は、Slack の
**続きの場**を `in_channel` に設定します。

```yaml
# ~/.hermes/config.yaml
slack:
  cron_continuable_surface: in_channel   # default: thread
  reply_in_thread: false                 # required pairing (see below)
  require_mention: false                 # so a plain reply continues the job
```

`in_channel` モードでは、まとめはふつうのトップレベルのチャンネルメッセージとして届き
（スレッドは開かれません）、あなたの返信はチャンネル共有のセッションを通じてジョブの続きに
なります。3 つの設定が組み合わさって働きます。

- **`cron_continuable_surface: in_channel`** — 配信時のスレッド作成を飛ばします。
- **`reply_in_thread: false`**（必須） — ボットがあなたの返信に*平置きで*答え、まとめが
  入ったのと同じチャンネル全体のセッションに結び付けます。これが無いと続き自体は働きますが、
  返事はスレッドに届きます（安全にスレッド方式の続きへ落ち、返信が失われることはありません。
  ゲートウェイは起動時に警告を残すので、食い違いに気づけます）。
- **`require_mention: false`**（またはそのチャンネルを `free_response_channels` に加える）
  — ふつうのメッセージで返信できるようにするためです。そうしないと、返信のたびに `@`
  メンションしないとボットは反応しません。

続きの場がチャンネル**全体**のセッションになるので、それは共有されます。チャンネル内の
ほかの会話も、続けられる in_channel のジョブが 2 つあればその両方も、同じ流れの会話に
加わります。これは「チャンネルに平置き」であることに本来ついてくる性質で、
`reply_in_thread: false` を使っている人がすでに受け入れているのと同じ折り合いです。配信ごとの
続きの話を分けたいときは、既定の `thread` の場を使ってください。

いまのところ、これは Slack の機能です。ほかのプラットフォームでもこのキーは受け付けますが、
`thread` の場に落ちます（続きの仕組みが異なるためです）。この選択はプラットフォームごとで、
それぞれの設定の下に置きます。ゲートウェイ側の設定フラグなので、`/restart` で反映されます。
Slack アプリを入れ直す必要はありません。

:::note 1 対 1 の DM
`cron_continuable_surface` は**チャンネル**の設定です。1 対 1 の DM には、スレッドか
タイムラインかという選択そのものが無い（DM はもともと平置きです）ので、このキーは効きません。
DM での cron の配信が続けられるかどうかを決めるのは、以前からある別の設定
**`slack.dm_top_level_threads_as_sessions`** です。

- **`false`** — トップレベルの DM がすべてひとつの流れの DM セッションを共有するので、
  続けられる cron のまとめとあなたの返信が**同じ**セッションに入り、ジョブは文脈を保ったまま
  続きます。DM で続けられる cron を使いたいなら、これが望ましい設定です。
- **`true`**（既定） — トップレベルの DM のメッセージがそれぞれ独立したセッションになるので、
  届いたまとめへの返信は、そのまとめの記録を持たない*新しい*セッションを始めてしまいます。
  このモードでは続きは働きません（cron でも、ほかの平置きの配信でも同じです）。

というわけで、1 対 1 の DM へ届ける続けられる cron ジョブには
`slack.dm_top_level_threads_as_sessions: false` を設定してください。DM では
`cron_continuable_surface` は不要です（設定しても無視されます）。
:::

### 静かに抑える {#silent-suppression}

エージェントの最終的な返答に `[SILENT]` が含まれていると、配信はまるごと抑えられます。出力は監査のためにローカル（`~/.hermes/cron/output/`）へ保存されますが、宛先へメッセージは送られません。

これは、何かおかしいときだけ報告してほしい監視のジョブに便利です。

```text
Check if nginx is running. If everything is healthy, respond with only [SILENT].
Otherwise, report the issue.
```

失敗したジョブは `[SILENT]` の印にかかわらずつねに配信されます。静かにできるのは成功した実行だけです。静かな監視ジョブにしたいなら、報告することが何も無いときは `[SILENT]` だけを返すよう、エージェントに指示してください。

## スクリプトのタイムアウト {#script-timeout}

実行前スクリプト（`script` パラメータでひも付けたもの）の既定のタイムアウトは 3600 秒（1 時間）です。これが区切るのは**スクリプトだけ**です。スキルを使う、あるいは LLM が動かすジョブは、別に無反応時間の予算を持っていて、この値では区切られません。スクリプトに別の上限が必要なら、変更できます。

```yaml
# ~/.hermes/config.yaml
cron:
  script_timeout_seconds: 1800   # 30 minutes
```

`HERMES_CRON_SCRIPT_TIMEOUT` 環境変数でも設定できます。解決の順番は、環境変数 → config.yaml → 既定の 3600 秒です。

cron は、実行後のセッションとエージェントの資源の後片付けにも区切りを設けます。これは LLM のターンが返ったあとに起きるので、無反応時間のタイムアウトとは別物です。既定は後片付けの操作ごとに 10 秒です。ストレージやクライアントの終了処理が返ってこなくなった場合、スケジューラはエラーを記録し、そのジョブの実行中フラグを解放して、以後の実行を走らせられるようにします。そのジョブが永遠に飛ばされ続けることはありません。

```yaml
# ~/.hermes/config.yaml
cron:
  cleanup_timeout_seconds: 10
```

`cleanup_timeout_seconds: 0` は、上限なしだった以前の後片付けの動きに戻したいときにだけ使ってください。

## メディア送信のタイムアウト {#media-send-timeout}

cron の配信に、稼働中のゲートウェイのアダプタ経由で送るメディアの添付（生成した PDF、読み上げ音声、書き出したレポート）が含まれるとき、添付のアップロードはそれぞれタイムアウトで区切られます。既定は 300 秒です。上り回線が遅くて大きなファイルを送るなら、もっと必要になることがあります。

```yaml
# ~/.hermes/config.yaml
cron:
  media_send_timeout_seconds: 600   # 10 minutes per attachment
```

`HERMES_CRON_MEDIA_SEND_TIMEOUT` 環境変数でも設定できます。解決の順番は、環境変数 → config.yaml → 既定の 300 秒です。タイムアウトした添付は、そのジョブの実行状態に部分的な配信の失敗として記録されます（テキストは届きます）。

## Bot Chat 配信のタイムアウト {#bot-chat-delivery-timeout}

`bot-chat` への配信は、受け手のボットのチャットでエージェントのターンを 1 回まるごと走らせるので、区切りは秒ではなく分の単位です。既定は 600 秒です。

```yaml
# ~/.hermes/config.yaml
cron:
  bot_chat_delivery_timeout_seconds: 900
```

タイムアウトした配信は `last_delivery_error` に記録されます。ボットのターンは、そのまま自力で終わることもあります。

## no-agent モード（スクリプトだけのジョブ） {#no-agent-mode-script-only-jobs}

LLM の推論が要らない繰り返しのジョブ — 昔ながらの見張り役、ディスクやメモリの警告、生存確認、CI への合図 — には、作成時に `no_agent=True` を渡します。スケジューラはあなたのスクリプトを時刻どおりに走らせ、その標準出力をそのまま届けて、エージェントをまるごと省きます。

```bash
hermes cron create "every 5m" \
  --no-agent \
  --script memory-watchdog.sh \
  --deliver telegram \
  --name "memory-watchdog"
```

意味は次のとおりです。

- スクリプトの標準出力（前後の空白を落としたもの）が、そのままメッセージとして届きます。
- **標準出力が空なら、そのティックは無言**で、何も配信されません。これが見張り役の型です。「何かおかしいときだけ言う」。
- 終了コードが 0 以外、またはタイムアウトのときは、エラーの知らせが届きます。壊れた見張り役が黙って死んでいることはありません。
- 最後の行が `{"wakeAgent": false}` なら、そのティックは無言になります（LLM を使うジョブと同じ仕組みです）。
- トークンも、モデルも、プロバイダの切り替えもありません。このジョブが推論の層に触れることはありません。

`.sh` / `.bash` のファイルは、`PATH` 上に `bash` があればそれで、無ければ `/bin/bash` で走ります（Windows の Git Bash では大事な点です）。それ以外は、いま動いている Python の処理系（`sys.executable`）で走ります。スクリプトは `$HERMES_HOME/scripts/` の中に解決されなければなりません。相対名でも、絶対パスでも、`~` で始まるパスでも、解決した先がこのディレクトリの中に収まるなら受け付けます。外へ出るパスは弾かれます。サブプロセスの環境変数は掃除されており（`_sanitize_subprocess_env`）、プロバイダの API 資格情報や Hermes が管理するそのほかの秘密は、cron のスクリプトには**引き継がれません**。

### 用意はエージェントがしてくれる {#the-agent-sets-these-up-for-you}

`cronjob` ツールのスキーマは `no_agent` を Hermes に直接見せているので、チャットで見張り役の内容を伝えれば、エージェントが組み立ててくれます。

```text
Ping me on Telegram if RAM is over 85%, every 5 minutes.
```

Hermes は `write_file` でチェック用のスクリプトを `~/.hermes/scripts/` に書き、それから次を呼びます。

```python
cronjob(action="create", schedule="every 5m",
        script="memory-watchdog.sh", no_agent=True,
        deliver="telegram", name="memory-watchdog")
```

伝えたい内容がスクリプトだけで完全に決まる場合（見張り役、しきい値の警告、生存確認）、エージェントは自動的に `no_agent=True` を選びます。同じツールでエージェントはジョブの一時停止・再開・編集・削除もできるので、CLI に触れなくても、一連の流れがすべてチャットで進みます。

作例は [Script-Only Cron Jobs のガイド](/hermes/docs/guides/cron-script-only/)を参照してください。

## `context_from` でジョブをつなぐ {#chaining-jobs-with-contextfrom}

cron ジョブは、前回の実行の記憶を持たない独立したセッションで動きます。とはいえ、あるジョブの出力がまさに次のジョブに必要なもの、ということもあります。`context_from` パラメータは、そのつながりを自動で作ります。ジョブ B のプロンプトの先頭に、ジョブ A の直近の出力が実行時に文脈として差し込まれます。

```python
# Job 1: Collect raw data
cronjob(
    action="create",
    prompt="Fetch the top 10 AI/ML stories from Hacker News. Save them to ~/.hermes/data/briefs/raw.md in markdown format with title, URL, and score.",
    schedule="0 7 * * *",
    name="AI News Collector",
)

# Job 2: Triage — receives Job 1's output as context
# Get Job 1's ID from: cronjob(action="list")
cronjob(
    action="create",
    prompt="Read ~/.hermes/data/briefs/raw.md. Score each story 1–10 for engagement potential and novelty. Output the top 5 to ~/.hermes/data/briefs/ranked.md.",
    schedule="30 7 * * *",
    context_from="<job1_id>",
    name="AI News Triage",
)

# Job 3: Ship — receives Job 2's output as context
cronjob(
    action="create",
    prompt="Read ~/.hermes/data/briefs/ranked.md. Write 3 tweet drafts (hook + body + hashtags). Deliver to telegram:7976161601.",
    schedule="0 8 * * *",
    context_from="<job2_id>",
    name="AI News Brief",
)
```

**仕組み**

- ジョブ 2 が動くとき、Hermes は `~/.hermes/cron/output/{job1_id}/*.md` からジョブ 1 の直近の出力を読みます
- その出力が、ジョブ 2 のプロンプトの先頭に自動で足されます
- ジョブ 2 は「このファイルを読め」と書いておく必要がありません。中身が文脈として渡ってきます
- 連なりの長さに制限はありません。ジョブ 1 → ジョブ 2 → ジョブ 3 → …

**`context_from` が受け付ける形**

| 形式 | 例 |
|--------|---------|
| ジョブ ID ひとつ（文字列） | `context_from="a1b2c3d4"` |
| ジョブ ID 複数（リスト） | `context_from=["job_a", "job_b"]` |

出力は、並べた順につながれます。

**続き: 前回の実行の出力を引き継ぐ**

`continuity=true` にすると、そのジョブは*自分自身*の直近の出力を毎回の実行に差し込みます。繰り返すジョブは通常、毎回まっさらな記憶で始まるので、ニュースの偵察役は同じ記事を何度も報告し、監視役は同じ状態で何度も警告します。continuity を有効にすると、ジョブは前回自分が報告した内容を見た状態で目を覚まし、重複を除いて続きから進められます。

```python
cronjob(
    action="create",
    prompt="Scan HN and arXiv for new agent-tooling papers. Report only items NOT already covered in your previous run's output.",
    schedule="every 6h",
    continuity=True,
    name="Agent Tooling Scout",
)
```

初回は前回の出力が無いので、プロンプトはそのまま走ります。無言の監視ティック（`no_change`）、空の出力、`wakeAgent=false` の監査記録は、文脈を選ぶときに飛ばされるので、静かな期間があっても直近の中身のある出力が残ります。監査のファイルはディスク上に残ります。エラーの記録は、次の実行に立て直しの文脈を与えるために選ばれる余地を残しています。成功したものだけを残す履歴のふるいではありません。2 回目以降は、前回の出力が「すでに報告したことを繰り返さない」という枠付けとともに先頭に足されます。上流のジョブとも自由に組み合わせられ（`context_from=["<other_job_id>"]` と `continuity=true` の併用）、更新時に `continuity=false` にすると、ほかの `context_from` の項目は残したまま、これだけを止められます。内部的にこのフラグは、`context_from` の中の予約語 `self` として保存されます。

CLI からは `hermes cron create "every 6h" "Scan for news" --continuity` で、既存のジョブに対しては `hermes cron edit <job_id> --continuity` / `--no-continuity` で切り替えられます。同じ切り替えは、ダッシュボードの cron 編集画面と、デスクトップの Bot Mode の定期実行ダイアログにもあります。

**使いどころ**

- 多段の流れ（集める → 絞る → 整える → 届ける）
- N 番目の作業が N−1 番目の出力に依存する、つながった作業
- ひとつのジョブが複数のジョブの結果をまとめる、拡散して集約する型
- 自分の前回の報告と照らして重複を除きたい、繰り返しの偵察役・監視役（`continuity=true`）

## プロバイダの立て直し {#provider-recovery}

cron ジョブは、設定した切り替え先のプロバイダと、資格情報プールの持ち回りをそのまま受け継ぎます。主となる API キーがレート制限にかかったり、プロバイダがエラーを返したりしたとき、cron のエージェントは次のことができます。

- `config.yaml` に `fallback_providers`（あるいは古い `fallback_model`）を設定していれば、**別のプロバイダへ切り替える**
- 同じプロバイダの[資格情報プール](/hermes/docs/user-guide/configuration/#credential-pool-strategies)の中で、**次の資格情報へ持ち回る**

つまり、高い頻度で動く cron ジョブや、混み合う時間帯に動くジョブは、より粘り強くなります。キーがひとつレート制限にかかっただけで、実行まるごとが失敗することはありません。

## 実行の失敗（`last_error`） {#run-failures-lasterror}

エージェントの実行が失敗すると、短い `last_error` が記録され、ジョブの一覧や `/cron list` で見られます。
資格情報のパターンや URL に含まれる資格情報は伏せられます（以前から保存されているエラーについても同様です）。
これは `last_fire_error`（スケジューラからの受け渡し）や `last_delivery_error`（配信）とは別物です。
エージェント自身が失敗したときには、それらの項目が空のままでも正しいのです。

接続の失敗を調べるときは、いま使っている Hermes ホームの `cron/output/<job_id>/` にある実行記録を見てください。
その `## Error` の節には、つながったトレースバックが入っており、資格情報のパターンと URL に含まれる資格情報は
伏せられています。ファイルは既存の非公開の出力ファイルの権限を使い、トレースバックのローカル変数は
取り込まれません。配信の知らせと `last_error` に残るのは、全文のトレースバックではなく短いエラーのほうです。
共有する前に内容を確かめてください。伏せ字は、任意のアプリのデータに機微な情報が無いことを保証するものでは
ありません。

## 逃した予約実行（`last_fire_error`） {#missed-scheduled-fires-lastfireerror}

ホスティング型（managed cron）の構成では、予約された実行はプラットフォームのスケジューラからダッシュボードを経て、ゲートウェイの内部 API サーバーへ渡ります。この最後の受け渡しが失敗すると — ゲートウェイのプロセスが落ちている、あるいはその API サーバーの待ち受けがそもそも起動していない — 実行が始まらないので、実行の記録も、調べられる `last_status` も残りません。見分けやすい形は、手で動かすと毎回うまくいくのに、自動では一度も動かない、というものです。

こうした取りこぼしは `last_fire_error`（時刻と理由）としてジョブの記録に刻まれ、次の場所に現れます。

- `cronjob` ツールの `action: "list"` — `last_fire_error` の項目
- `hermes cron list` — ジョブの下に赤い `⚠ Missed scheduled fire:` の行
- ダッシュボードのジョブ表示

この刻印はつねに**いまの**自動実行の健康状態を映します。新しい取りこぼしで上書きされ、次に成功した実行で自動的に消えます。これが出ているなら、ジョブとその予約自体は問題なく、手を入れるべきなのは実行経路のゲートウェイ側です（いちばん多いのは、監督プロセス越しにゲートウェイを再起動して、プロファイルの環境をまるごと読み直させることです: `hermes gateway restart`）。

### 手元での逃した実行の扱い {#local-missed-run-policy}

繰り返しのジョブの予定時刻を過ぎたときにゲートウェイが止まっていた（あるいは再起動中だった）場合、
スケジューラが戻ってきた時点でそのジョブは**1 回だけ追いかけて実行されます**。再起動のすき間で
逃した回はちょうど 1 回だけ実行され、再起動の前にすでに走った回がもう一度走ることはありません。
長く止まっていても、逃した回の数だけ走るのではなく 1 回の実行にまとめられます。一時停止中の
ジョブは追いかけません。追いかけた実行は
`hermes cron list` に `⚠ late` / `⚠ catch-up after missed fire` と表示されます。

計画してゲートウェイを止めたあとに追いかけ実行の負荷がかかるのを避けたい場合は、次のように設定します。

```yaml
cron:
  catch_up_missed: false   # default: true
```

`hermes config set cron.catch_up_missed false` を実行しても同じです。この無効化をすると、
すでにある猶予（周期の半分を 120 秒〜2 時間の範囲に収めたもの）より遅れた繰り返しのジョブは、
いまは実行されず、次に来る予定時刻に合わせ直されます。この飛ばしはログに残ります。
猶予の内側のジョブと、明示的な手動の実行はふだんどおり走ります。次の予定時刻を計算できない場合は、
これまでどおりの「1 回だけ実行する」予備の動きが保たれます。
1 回きりのジョブの期限切れ、再開の動き、下で説明するホスト型プロバイダの一斉点検は変わりません。
ジョブ単位でこの設定を上書きする方法はありません。

### 取りこぼしの追いかけ実行 {#misfire-catch-up}

外部のスケジューラを使っているとき（ホスティング型の managed cron）、ゲートウェイは取りこぼしを拾う掃引も走らせます。予約の時刻を過ぎても実行が届かず、猶予の時間も過ぎたジョブは、ローカルで引き受けて走らせます。受け渡しの障害で失うのが、まる 1 日ではなく数分で済むということです。この掃引は、通常の実行と同じストア上の引き受けによって、スケジューラ側の遅れた再送とは重ならないようにしてあります。

```yaml
cron:
  misfire_grace_minutes: 10   # wait this long for the scheduler's own retries
                              # before catching up locally; 0 disables catch-up
```

ローカル（内蔵のティッカー）の構成にはこれは要りません。ティッカーは次のティックで、時刻を過ぎたジョブをすでに拾ってくれます。

## スケジュールの書き方 {#schedule-formats}

エージェントの最終的な返答は、ジョブの `deliver:` の宛先へ自動的に届きます。エージェント自身がメッセージを送ることはもうないので、利用者に見せたい内容はそのまま最終的な返答に書けば済みます。**追加の、あるいは別の**宛先へ届けたいときは、エージェントに送らせるのではなく、cron ジョブの `deliver:` に複数の宛先を並べてください（カンマ区切り。たとえば `deliver: "telegram,discord"`）。

### 相対的な待ち時間（1 回きり） {#relative-delays-one-shot}

```text
in 30m  → Run once in 30 minutes
in 2h   → Run once in 2 hours
in 1d   → Run once in 1 day
```

### 間隔（繰り返し） {#intervals-recurring}

```text
30m          → Every 30 minutes (bare durations are recurring)
every 30m    → Every 30 minutes
every 2h     → Every 2 hours
every 1d     → Every day
every hour   → Every hour (bare unit = 1)
```

### 曜日・時刻の自然な書き方（繰り返し） {#natural-daytime-schedules-recurring}

```text
every monday 9am         → Weekly, Mondays at 9:00 AM
every day at 9am         → Daily at 9:00 AM
weekdays at 9am          → Weekdays at 9:00 AM
weekends at 10am         → Saturdays and Sundays at 10:00 AM
daily at 7am             → Daily at 7:00 AM
monday, wednesday at 9am → Mondays and Wednesdays at 9:00 AM
```

時刻は `9am`、`9:30pm`、`14:00`、24 時間制の数字だけ（`at 7`）、`noon`、`midnight` を受け付けます。これらの書き方は内部で cron 式へ変換されます（`croniter` パッケージが必要ですが、既定で入っています）。

### cron 式 {#cron-expressions}

```text
0 9 * * *       → Daily at 9:00 AM
0 9 * * 1-5     → Weekdays at 9:00 AM
0 9 * * MON-FRI → Weekdays at 9:00 AM (named weekdays/months accepted)
0 */6 * * *     → Every 6 hours
30 8 1 * *      → First of every month at 8:30 AM
0 0 * * 0       → Every Sunday at midnight
```

### ISO 形式の日時 {#iso-timestamps}

```text
2026-03-15T09:00:00    → One-time at March 15, 2026 9:00 AM
```

## 繰り返しの既定 {#repeat-behavior}

| スケジュールの種類 | 既定の繰り返し | 動き |
|--------------|----------------|----------|
| 1 回きり（`in 30m`、日時指定） | 1 | 1 回だけ動く |
| 間隔（`every 2h`） | 無期限 | 削除するまで動き続ける |
| cron 式 | 無期限 | 削除するまで動き続ける |

上書きもできます。

```python
cronjob(
    action="create",
    prompt="...",
    schedule="every 2h",
    repeat=5,
)
```

## プログラムからジョブを管理する {#managing-jobs-programmatically}

エージェント向けの API は、ツール 1 つだけです。

```python
cronjob(action="create", ...)
cronjob(action="list")
cronjob(action="update", job_id="...")
cronjob(action="pause", job_id="...")
cronjob(action="resume", job_id="...")
cronjob(action="run", job_id="...")
cronjob(action="remove", job_id="...")
```

`update` では、`skills=[]` を渡すとひも付いたスキルがすべて外れます。

### 手動の実行は非同期 {#manual-runs-are-asynchronous}

`cronjob(action="run")` は、そのジョブを**バックグラウンドで**すぐに走らせます
（`delegate_task` と同じです）。ツールの呼び出しはその場で受け取り札を返し、実行が終わると、
結果 — 成否、配信先、次の予定時刻、出力の抜粋 — が新しいメッセージとして会話へ戻ってきます。
その間もエージェント（とあなた）は作業を続けられます。すでに実行中のジョブは、二重に走らせる
のではなく「already running」と断られます。

`action="run"` に `prompt` を添えて、その回限りの文脈を差し込むこともできます。

```python
cronjob(action="run", job_id="...", prompt="CONTEXT: focus on the EU region today")
```

その文脈は、`## Run Context` という見出しの下に、ジョブに保存されているプロンプトへ
その 1 回だけ足されます。ジョブの定義に保存されることはなく、保存済みのプロンプトと同じ
プロンプトインジェクションの検査を通ります。

切り離した結果を受け取れない実行環境（1 回きりの `hermes -z`、CLI からの `hermes
cron run`、cron の子セッション、Kanban のワーカー）は、自動的に同期実行へ落ちます。

## cron ジョブが使えるツールセット {#toolsets-available-to-cron-jobs}

cron はジョブごとに、チャットのプラットフォームがつながっていない新しいエージェントセッションで実行します。既定では、cron のエージェントには **`hermes tools` で `cron` プラットフォーム向けに設定したツールセット**が渡ります。CLI の既定でもなければ、ありったけでもありません。

```bash
hermes tools
# → pick the "cron" platform in the curses UI
# → toggle toolsets on/off just like you would for Telegram/Discord/etc.
```

ジョブ単位でもっと細かく絞りたいときは、`cronjob.create` の `enabled_toolsets` の項目（既存のジョブなら `cronjob.update`）が使えます。

```text
cronjob(action="create", name="weekly-news-summary",
        schedule="every sunday 9am",
        enabled_toolsets=["web", "file"],      # just web + file, no terminal/browser/etc.
        prompt="Summarize this week's AI news: ...")
```

ジョブに `enabled_toolsets` が設定されていればそれが優先され、次に `hermes tools` の cron プラットフォームの設定、それも無ければ Hermes 内蔵の既定に落ちます。これは費用にも効きます。ちょっとした「ニュースを取ってくる」ジョブに `browser` や `delegation` まで抱えさせると、LLM を呼ぶたびにツールのスキーマがプロンプトを膨らませてしまいます。

### エージェントをまるごと省く: `wakeAgent` {#skipping-the-agent-entirely-wakeagent}

cron ジョブに事前チェックのスクリプト（`script=` で指定）を付けていると、そのスクリプトが実行時に、Hermes がそもそもエージェントを呼ぶべきかどうかを決められます。標準出力の最後の行に、次の形を出してください。

```text
{"wakeAgent": false}
```

そうすると cron は、そのティックのエージェントの実行をまるごと飛ばします。1〜5 分おきといった高頻度の見回りで、状態が実際に変わったときだけ LLM を起こしたい、というときに便利です。そうしないと、中身の無いエージェントのターンに何度もお金を払うことになります。

```python
# pre-check script

latest = fetch_latest_issue_count()
prev = read_state("issue_count")
if latest == prev:
    print(json.dumps({"wakeAgent": False}))   # skip this tick
    sys.exit(0)
write_state("issue_count", latest)
print(json.dumps({"wakeAgent": True, "context": {"new_issues": latest - prev}}))
```

`wakeAgent` を省いたときの既定は `true`（いつもどおりエージェントを起こす）です。

#### 作例: 安上がりな実行前の関門 {#recipes-cheap-pre-run-gates}

`wakeAgent` の関門は、予約したジョブが LLM のトークンを使うべきかどうかを、費用 0 円で決める手立てです。次の 3 つの型で、たいていの用途はまかなえます。

**ファイル変更の関門** — 見張っているファイルに、前回うまくいったティック以降の新しい中身があるときだけ実行します。スケジューラはジョブごとに `last_run_at` を記録しているので、ファイルの更新時刻と比べます。

```bash
#!/bin/bash
# ~/.hermes/scripts/feed-changed.sh
FEED="$HOME/data/feed.json"
STATE="$HOME/.hermes/scripts/.feed-changed.last"
test -f "$FEED" || { echo '{"wakeAgent": false}'; exit 0; }
mtime=$(stat -c %Y "$FEED")
last=$(cat "$STATE" 2>/dev/null || echo 0)
if [ "$mtime" -le "$last" ]; then
  echo '{"wakeAgent": false}'
else
  echo "$mtime" > "$STATE"
  echo '{"wakeAgent": true}'
fi
```

```text
cronjob(action="create", name="process-feed",
        schedule="every 30m",
        script="feed-changed.sh",
        prompt="A new ~/data/feed.json has landed. Summarize what changed.")
```

**外部の合図の関門** — ほかの処理が準備完了を知らせたときだけ実行します（デプロイのフックがファイルを置く、CI のジョブが状態ストアに値を入れる、など）。

```bash
#!/bin/bash
# ~/.hermes/scripts/flag-ready.sh
if test -f /tmp/new-data-ready; then
  rm -f /tmp/new-data-ready
  echo '{"wakeAgent": true}'
else
  echo '{"wakeAgent": false}'
fi
```

```text
cronjob(action="create", name="nightly-analysis",
        schedule="0 9 * * *",
        script="flag-ready.sh",
        prompt="Run the nightly analysis over today's batch.")
```

**SQL の件数の関門** — 自分のデータベースに処理すべき新しい行があるときだけ実行します。スクリプトは `context` を通じて件数をエージェントへ渡すこともできるので、エージェントは問い合わせをやり直さなくても、どれだけの量を見ているのかが分かります。

```python
#!/usr/bin/env python
# ~/.hermes/scripts/new-rows.py

conn = sqlite3.connect("/home/me/data/app.db")
n = conn.execute(
    "SELECT COUNT(*) FROM messages WHERE ts > strftime('%s','now','-2 hours')"
).fetchone()[0]
if n < 1:
    print(json.dumps({"wakeAgent": False}))
else:
    print(json.dumps({"wakeAgent": True, "context": {"new_rows": n}}))
```

```text
cronjob(action="create", name="summarize-new-msgs",
        schedule="every 2h",
        script="new-rows.py",
        prompt="Summarize the new messages from the last 2 hours.")
```

同じ型は、スクリプトから問い合わせられるデータ元なら何にでも使えます。Postgres でも、HTTP の API でも、自作の状態ストアでも構いません。cron の仕組みの中に SQL の評価器を組み込む必要はありません。

:::tip
Hermes 自身の `~/.hermes/state.db` は内部の構造で、リリースごとに変わります。実行前の関門からここへ問い合わせないでください。自分のデータベースなり、自分が読んでいる元なりを指してください。
:::

謝辞: この作例集は、@iankar8 さんが [#2654](https://github.com/NousResearch/hermes-agent/pull/2654) で試みた検討がきっかけです。そこでは sql / file / command のきっかけを別の仕組みとして足す案が出ていました。`script` と `wakeAgent` の関門で 3 つとも費用 0 円でまかなえるので、この件はドキュメントとして着地しました。

### ジョブをつなぐ: `context_from` {#chaining-jobs-contextfrom}

cron ジョブは、ほかのジョブの名前（または ID）を `context_from` に並べることで、そのジョブの直近の成功した出力を受け取れます。

```text
cronjob(action="create", name="daily-digest",
        schedule="every day 7am",
        context_from=["ai-news-fetch", "github-prs-fetch"],
        prompt="Write the daily digest using the outputs above.")
```

指定したジョブの直近の完了した出力が、この実行のプロンプトの上に文脈として差し込まれます。上流に並べるものは、有効なジョブの ID か名前でなければなりません（`cronjob action="list"` を参照）。注意: つなぐときに読むのは*直近の完了した*出力です。同じティックで動いている上流のジョブを待つわけではありません。

## ジョブの保存場所 {#job-storage}

ジョブは `~/.hermes/cron/jobs.json` に保存されます。実行の出力は `~/.hermes/cron/output/{job_id}/{timestamp}.md` に保存されます。

ジョブの定義はディスク上のただの JSON です。`hermes update`、ゲートウェイの再起動、端末の再起動を越えて残ります。再起動のときに実行中だったジョブは、実行の台帳で `unknown` と印が付きます。自動で再実行はされませんが、そのジョブの次の予定のティックはいつもどおり動きます。詳しくは[実行履歴](#execution-history)を参照してください。

:::tip
ジョブの管理は、`jobs.json` を直接いじるのではなく、`cronjob` ツール、`hermes cron edit`、`/cron` を通じてエージェントに頼んでください。直接編集すると、[ファイル書き込みの安全機構](/hermes/docs/user-guide/security/#file-write-safety)がそのパスを塞いだとき（たとえば `HERMES_WRITE_SAFE_ROOT` を設定している場合）に、黙って失敗することがあります。そして何も保存されなかったことを確かに教えてくれるのは、[ファイル変更の検証](/hermes/docs/user-guide/configuration/#file-mutation-verifier)のフッタです。
:::

ジョブは `model` と `provider` を `null` のまま保存することがあります。これらの項目が無いとき、Hermes は実行時に全体の設定から解決します。これらがジョブの記録に現れるのは、ジョブごとの上書きを設定したときだけです。

保存にはアトミックなファイル書き込みを使っているので、書き込みが途中で切れても、書きかけのジョブファイルが残ることはありません。

## プロンプトはやはり単体で完結させる {#self-contained-prompts-still-matter}

:::warning 重要
cron ジョブは、まったく新しいエージェントセッションで動きます。ひも付けたスキルが与えてくれるもの以外は、エージェントに必要なすべてをプロンプトに書かなければなりません。
:::

**悪い例:** `"Check on that server issue"`

**良い例:** `"SSH into server 192.168.1.100 as user 'deploy', check if nginx is running with 'systemctl status nginx', and verify https://example.com returns HTTP 200."`

## セキュリティ {#security}

予約タスクのプロンプトは、作成時と更新時に、プロンプトインジェクションと資格情報の持ち出しのパターンについて検査されます。見えない Unicode の細工、SSH の裏口を仕込む試み、あからさまな秘密の持ち出しを含むプロンプトは弾かれます。
