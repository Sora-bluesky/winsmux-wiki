---
title: "定期実行タスク（cron）"
description: "自然な言葉で自動タスクを予約し、ひとつの cron ツールで管理して、1 つ以上のスキルをひも付けます"
upstream_path: user-guide/features/cron.md
upstream_blob: 39634741d59a77c5016c1a97bb2aa8ca409e417c
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/cron
---

# 定期実行タスク（cron） {#scheduled-tasks-cron}

自然な言葉や cron 式で、タスクを自動的に実行するよう予約できます。Hermes は、schedule / list / remove と別々に分かれたツールではなく、アクション形式の操作をそなえた単一の `cronjob` ツールで cron の管理を提供します。

## cron でいまできること {#what-cron-can-do-now}

cron ジョブでできることは次のとおりです。

- 一度きり、または繰り返しのタスクを予約する
- ジョブを一時停止する、再開する、編集する、手で発火させる、削除する
- ジョブにスキルを 0 個・1 個・複数ひも付ける
- 結果を、作成元のチャット、ローカルのファイル、設定済みのプラットフォーム宛先へ届ける
- 通常の静的なツール一覧を持つ、新しいエージェントセッションで実行する
- **no-agent モード**で実行する — スクリプトを予定どおり走らせ、その標準出力をそのまま届けます。LLM は一切関与しません（下の [no-agent モード](#no-agent-mode-script-only-jobs)の節を参照）
- **外部イベント**で発火する — `cron_job` を設定した webhook ルートは、次の予定時刻を待たずに、何かが起きた瞬間（PR にフィードバックが付いた、サービスがアラートを投げた）にジョブを発火させます。[イベント起動の cron ジョブ](/hermes/docs/user-guide/messaging/webhooks/#event-triggered-cron-jobs)を参照してください。

これらはすべて `cronjob` ツールを通じて Hermes 自身からも使えます。つまり、普通の言葉で頼むだけでジョブの作成・一時停止・編集・削除ができ、CLI は要りません。

:::tip
**cron ジョブはどのモデルで動くのか。** 発火時の解決順は、ジョブごとの固定 → `config.yaml` の `cron.model` → `hermes model` によるグローバル既定、です。

- **ジョブごとの固定** — *あなた*が、ダッシュボード、`hermes cron create/edit --model … --provider …`、あるいは `~/.hermes/cron/jobs.json` の編集で設定します。いちど設定すると、変えるまで維持されます。エージェントの `cronjob` ツールは、ジョブごとのモデルを設定も変更もできません。推論の固定は利用者が持つものです。
- **`cron.model` / `cron.model_provider`** — cron 群ぜんたいの既定です。固定されていないジョブはすべてこのモデルで動き、チャット用のモデルとは切り離されます。いちど設定しておけば（`hermes config set cron.model <name>`）、`hermes model` や `/model` でチャットのモデルを切り替えても cron 群には触れません。
- **グローバル既定** — 上のどちらも設定されていないときだけ、ジョブは `hermes model` に従います。Hermes は作成時にプロバイダーとモデルを**スナップショット**として控え、それがそのジョブの実効的な固定になります。あとからグローバル既定を切り替えても（`hermes model`、`/model`、`hermes config set model.default …`）、ジョブは**作成したときのモデルとプロバイダーのまま動き続け**、実行ごとに違いを知らせる INFO 行を 1 行だけ残します。グローバルなモデル変更が予約ジョブを止めることはありませんし、無人のジョブが有料のプロバイダー／モデルへの切り替えを黙って引き継ぐこともありません（#44585）。ジョブを新しい既定へ移すには、**resnap** する（`hermes cron resnap <job_id>`、固定されていないジョブすべてなら `--all`）と、固定しないまま現在の既定を採用します。あるいは固定する（`hermes cron edit <job_id> --provider <provider> --model <model>`）か、`cron.model` を設定して群ぜんたいをまとめて移します。スナップショットの仕組みができる前に作られたジョブは、これまでどおり現在のグローバル既定に従います。

どのプロバイダーに解決される場合でも、そのプロバイダー固有のリクエスト設定（カスタムプロバイダー向けの `extra_body`/`extra_headers` といった `request_overrides` など）は、対話セッションと同じように予約実行にも引き継がれます。

`hermes setup --portal` は OAuth の更新が自動なので、無人の実行では最も手間の少ない選択肢です。[Nous Portal](/hermes/docs/integrations/nous-portal/)を参照してください。
:::

:::tip
**ジョブごとの推論エフォート。** ジョブは、モデルの固定とは別に、自分の思考レベルを固定できます。`none`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max`、`ultra` のいずれかです。設定すると、そのジョブの実行についてはグローバルの `agent.reasoning_effort` と、モデルごとの `agent.reasoning_overrides` の両方を上書きします（`none` は思考を無効にします）。設定は `hermes cron create/edit --reasoning-effort high` で行い、編集時に空文字を渡すと固定を外して再び設定ファイルに従います。（エージェントの `cronjob` ツールには意図的に出していません。モデルの設定は利用者が決めることだからです。）モデルが対応していないレベルは、リクエストの時点でプロバイダーが丸めるか省きます。上限が `high` のモデルに `xhigh` を固定すると `high` で動きます。この固定は `no_agent` のジョブには効きません（調整すべき LLM 呼び出しがないためです）。重い定期分析は `high` で、安い繰り返しジョブは `minimal` で、というように、グローバル既定に触れずに使い分けられます。
:::

:::warning
cron から実行されたセッションは、さらに cron ジョブを作ることができません。Hermes は、予約が暴走して連鎖するのを防ぐため、cron の実行中は cron 管理ツールを無効にします。
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

### 自然な会話で {#through-natural-conversation}

Hermes に普通に頼みます。

```text
Every morning at 9am, check Hacker News for AI news and send me a summary on Telegram.
```

Hermes は内部で、統合された `cronjob` ツールを使います。

## 発送前の設定検証 {#pre-dispatch-configuration-validation}

予約実行のためのエージェント機構を組み立てる前に、スケジューラーはそのジョブの設定が
実際に実行を成功させられるかどうかを検証します。

- プロバイダーの API キーが解決できること（`fallback_providers` の連鎖が設定されているときは
  省きます。主キーが欠けていてもフォールバック経路が救うことがあるためです）、
- ひも付いたスキルが使える状態であること（必要な環境変数・コマンド・認証情報ファイルが
  欠けていないこと）、
- 配信先のプラットフォーム宛先が分かっていて、ゲートウェイの認証情報が設定されていること
  （`local`/`origin` の宛先は検査しません）、
- そのジョブが自分の `enabled_toolsets` で名指しした MCP サーバーがすべて、このプロファイル
  向けに少なくとも 1 つのツールを返せること。このゲートウェイで一度つながったことがあり、
  ネットワークの一時的な途切れ（ルーターの再起動、DNS の失敗）のあとでつなぎ直しているだけの
  サーバーは、実行を**止めません**。ジョブは解決できたツールで走り、どのサーバーを飛ばしたかは
  ゲートウェイの記録に残ります（途切れ 1 回につき 1 度）。このプロファイルでは一度もつながって
  いないサーバー（URL や認証情報が違う、あるいは多重化の下で別のプロファイルが持っている
  サーバー）や、認証情報の取り消しのような恒久的なエラーで止まっているサーバーは、実行を
  止めます。

検証に失敗すると、そのジョブの `last_status` は `blocked_config` になり、アラートは 1 回だけ
届き（毎回の tick では繰り返しません）、**LLM の呼び出しは行われません**。設定を誤った
ジョブがトークンを使うことはありません。次に正常な実行ができるとブロック状態は解除され、
以後にまた設定が壊れたときはアラートが出ます。

検証を無効にして、以前の挙動（実行が進み、途中で失敗する）に戻すには次のようにします。

```yaml
cron:
  preflight: false
```

あるいは `hermes config set cron.preflight false` を実行します。

## 固定していないジョブを新しいグローバル既定へ移す {#moving-unpinned-jobs-to-a-new-global-default}

固定していないジョブは作成時のプロバイダー／モデルのまま動くので、チャットのモデルを変えても
cron 群が変わったり止まったりすることはありません。予約ジョブを*動かしたい*ときは、次のようにします。

```bash
hermes cron edit <job_id> --provider <provider> --model <model>   # one job
hermes config set cron.model <model>                               # every unpinned job
```

`hermes config set model.default …` と Desktop のモデル選択画面は、元のモデルのままになる
固定していないジョブを一覧で示すので、意図して判断できます。保存されたスナップショットは、ジョブの
プロバイダー・モデル・ベース URL を編集するたびに更新されます。

resnap は、固定していないジョブの保存済みスナップショットを、固定せずに現在のグローバルな解決へ
更新します。そのため、以後の変更も追い続けます。

```bash
hermes cron resnap <job_id>   # one job
hermes cron resnap --all      # every unpinned agent job
```

エージェント向けの `cronjob` ツールも同じアクションを受け付けます（`action=resnap job_id=<id>` または
`action=resnap all=true`）。固定済みの軸と、`no_agent` のスクリプトジョブはそのままです。

## スキル付きの cron ジョブ {#skill-backed-cron-jobs}

cron ジョブは、プロンプトを実行する前に 1 つ以上のスキルを読み込めます。各スキルは、チャットで `/skill-name` と打ったときとまったく同じように読み込まれ、`config.yaml` から解決した `metadata.hermes.config` の値を含む `[Skill config ...]` ブロックも付きます。

### スキルがひとつのとき {#single-skill}

```python
cronjob(
    action="create",
    skill="blogwatcher",
    prompt="Check the configured feeds and summarize anything new.",
    schedule="0 9 * * *",
    name="Morning feeds",
)
```

### スキルが複数のとき {#multiple-skills}

スキルは並べた順に読み込まれます。プロンプトは、それらのスキルの上に重ねる作業指示になります。

```python
cronjob(
    action="create",
    skills=["blogwatcher", "maps"],
    prompt="Look for new local events and interesting nearby places, then combine them into one short brief.",
    schedule="every 6h",
    name="Local brief",
)
```

これは、スキルの本文をまるごと cron のプロンプトに詰め込まずに、使い回せる手順を予約エージェントへ引き継がせたいときに便利です。

## プロジェクトのディレクトリでジョブを動かす {#running-a-job-inside-a-project-directory}

cron ジョブは、既定ではどのリポジトリからも切り離して動きます。`AGENTS.md`、`CLAUDE.md`、`.cursorrules` は読み込まれず、terminal / file / code-exec のツールは、ゲートウェイが起動したときの作業ディレクトリで動きます。これを変えるには、`--workdir`（CLI）または `workdir=`（ツール呼び出し）を渡します。

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

`workdir` を設定すると、こうなります。

- そのディレクトリの `AGENTS.md`、`CLAUDE.md`、`.cursorrules` がシステムプロンプトへ差し込まれます（探し方の順番は対話版の CLI と同じです）
- `terminal`、`read_file`、`write_file`、`patch`、`search_files`、`execute_code` は、すべてそのディレクトリを作業ディレクトリとして使います
- 指定するパスは、実在する絶対パスのディレクトリでなければなりません。相対パスや存在しないディレクトリは、作成時・更新時に拒否されます
- 編集のときに `--workdir ""`（ツールなら `workdir=""`）を渡すと解除され、元の挙動に戻ります

:::note 分離
エージェントの実行は、それぞれ自分の `workdir` をその実行に固有のタスク識別子へひも付けます。そのため workdir 付きのジョブは、プロセス全体の端末の状態を書き換えたり、同時に走る実行どうしでパスを漏らしたりせずに、通常の並列プールを使います。cron ぜんたいの同時実行数を絞りたいときは `cron.max_parallel_jobs` を設定してください。
:::

## ジョブを編集する {#editing-jobs}

内容を変えたいだけなら、ジョブを消して作り直す必要はありません。

:::tip ジョブの指定
以下（および[ライフサイクルの操作](#lifecycle-actions)）の `<job_id>` のところには、ジョブの名前も書けます（大文字小文字は区別しません）。`morning-digest` は覚えていても 16 進数の ID は覚えていない、というときに便利です。ジョブ ID の完全一致は、名前の一致より優先されます。ID ではない指定で名前が複数のジョブに当たった場合、コマンドは実行を断り、候補の ID を並べて表示するので、そこから選び直せます。
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

- `--skill` を繰り返すと、そのジョブにひも付いたスキルの一覧を置き換えます
- `--add-skill` は、既存の一覧を置き換えずに追加します
- `--remove-skill` は、指定したスキルだけを外します
- `--clear-skills` は、ひも付いたスキルをすべて外します

## ライフサイクルの操作 {#lifecycle-actions}

cron ジョブには、作成と削除だけではない、もっと厚いライフサイクルがあります。

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

- `pause` — ジョブは残したまま、予約するのをやめます
- `resume` — ジョブをふたたび有効にします。一時停止している間に実行時刻が来ていた繰り返しジョブは、その枠を実行待ちのまま保つので、次の tick で埋め合わせの実行が 1 回だけ走ります（`cron.catch_up_missed: false` のときは飛ばした記録を残します）。黙って次の実行時刻へ進んでしまうことはありません。それ以外の場合は、次の実行時刻を計算します
- `run` — 次のスケジューラーの tick でジョブを発火させます
- `remove` — まるごと削除します
- `edit` — 予定・プロンプト・配信などを変えます

**名前での指定。** 変更をともなう 4 つの動詞（`pause`、`resume`、`run`、`remove`、`edit`）と、エージェントの `cronjob` ツールは、16 進数の ID の代わりにジョブの**名前**も受け付けるようになりました（大文字小文字は区別しません）。エージェントも CLI も、ID の完全一致があればそちらを優先します。名前があいまいな場合（同じ名前のジョブが複数ある場合）は、候補の ID をすべて示して断るので、明示的に選び直せます。名前は一意ではないので、この防護は効いています。同じ名前のジョブが 2 つあるときに、黙って別のジョブを書き換えてしまうのを防ぎます。

### すべてを止める: `hermes pause` {#pausing-everything-hermes-pause}

`hermes pause [--reason ...]` は、ぜんたいの緊急停止です（`hermes resume` で解除します）。有効な間は、どの入り口から来た予約発火も始まりません。内蔵の ticker は発送を飛ばし、マネージド cron（ホスト型のスケジューラー）の発火 webhook は `Retry-After: 60` を付けた `503` を返すので、再開したあとにスケジューラーが配り直します。[取りこぼしの追い付き](#misfire-catch-up)の掃き取りも、止められていた分を無理に発火させず静かにしています。すでに走っている実行が殺されることはなく、失われるものもありません。溜まった仕事は、`hermes resume` のあと最初の tick か掃き取りで追い付きます。手による明示的な実行（`hermes cron run`、ダッシュボードの Trigger ボタン）は運用者の上書きなので、停止中でも実行されます。

### 一時停止した状態で作る（安全なカナリア） {#creating-a-job-paused-safe-canary}

作ってから止めるまでの予約の競合なしに、カナリアを用意できます。

```bash
hermes cron create "every 1h" "Post the digest" --paused --paused-reason "Awaiting review"
hermes cron resume <job_id>
```

`--paused` は、トリガーを登録しないまま、最初のロック付き書き込みで `enabled: false`、
`state: paused`、`next_run_at: null`、一時停止の時刻、そして監査できる理由を保存します。
理由を省くと "Created paused; awaiting operator approval." が保存されます。`--paused` を
付けなければ、これまでどおり有効な状態で作成されます。`--paused-reason` には `--paused` が
必要で、不正な値は保存する前に拒否されます。

同じ `paused` の真偽値と、任意の `paused_reason` の文字列は、`cron.jobs.create_job`、
cron 管理ツールの `create` アクション、ゲートウェイの `POST /api/jobs`、ダッシュボードの
`POST /api/cron/jobs` でも受け付けます。resume すると次の実行が予約されます。一時停止が
止めるのは自動の発火であって、運用者の上書きではありません。これまでの明示的な
**Run now** や強制実行はそのまま使え、ジョブを再開して実行できます。ジョブを実行できる
運用者に対するセキュリティの境界ではありません。

## エージェントによる予約管理（cron ジョブが cron ジョブを管理する） {#agent-managed-scheduling-cron-jobs-that-manage-cron-jobs}

既定では、スケジューラー*から*起動されたエージェントは `cronjob` ツールを使えません。
予約ジョブが別のジョブを作ったり、編集したり、削除したりはできません。`config.yaml` で
明示的に有効にします。

```yaml
cron:
  allow_agent_scheduling: true   # default: false
```

有効にすると、予約エージェントはチャットのセッションと同じように cron の表を扱えます。
予約作業の中から後続の一度きりジョブを組んだり、自分の間隔を調整したり、表ぜんたいを整理する
「cron 司書」のようなジョブを走らせたり（一覧を取り、必要に応じて更新・削除・作成する）できます。
これを破綻させない性質が 2 つあります。

- **平らで、利用者が持つ 1 つの表。** cron の実行から作られたジョブも、ほかのジョブと同じ
  `jobs.json` に、特別な所有権なしで入ります。自分で作ったものとまったく同じように、
  一覧・編集・削除ができます。
- **宙に浮いた配信先を作らない。** cron の実行は一時的なものなので、その中の `deliver: origin` は
  **作成の時点で**、作成元ジョブ自身の具体的な宛先（`platform:chat_id[:thread_id]`、作成元の
  ジョブがどこにも配信しないなら `local`）へ解決されます。予約エージェントが作ったジョブが、
  もう存在しないセッションへ出力を向けることはありません。明示的な宛先
  （`local`、`all`、`telegram:<chat_id>`）は、書かれたとおりに尊重されます。
- **ジョブは自分を消してから報告できる。** 「X を見張って、1 回だけ知らせたら止まる」という形
  — 実行中に `cronjob(action="remove", job_id=<its own id>)` を呼んでから答える繰り返しジョブ —
  は、その最後の応答を配信し、実行を `completed` として記録します。そのあとジョブの記録と
  `cron/output/<job_id>/` ディレクトリは無くなり、最後の実行結果はそこへ書かれません。実行の*外*から
  記録を消した場合（別のプロセス、あるいは同じ ID を使い回す差し替えのジョブ）は、これまでどおり
  古い実行の出力を捨てます。

毎回あたらしいジョブを作るものより、既存のジョブを更新するプロンプト（まず一覧を取り、ID で
更新する）を選んでください。

## 仕組み {#how-it-works}

**cron の実行は、ゲートウェイのデーモンが担当します。** ゲートウェイは 60 秒ごとにスケジューラーを tick させ、時刻になったジョブを独立したエージェントセッションで走らせます。

```bash
hermes gateway install     # Install as a user service
sudo hermes gateway install --system   # Linux: boot-time system service for servers
hermes gateway             # Or run in foreground

hermes cron list
hermes cron status
```

`hermes cron status` は、スケジューラーが生きているかどうか（ゲートウェイのプロセス、ticker のハートビート、最後に成功した tick）と、有効なジョブのうちいちばん早い実行予定を報告します。ジョブごとに UTC のオフセットが違っていても、実際の時刻の順に並びます。`next_run_at` がすでに 15 分以上過去になっている場合、それが次の「Next run」として表示されることはありません。`cron status` は `⚠ Next run <time> is OVERDUE — passed 7h ago but the job has not fired` と出し、`cron list` とチャット内の `/cron list` はその行に `Overdue:` と付け、ダッシュボードと Desktop の cron パネル（Bot のルーティンのカードを含む）は `Overdue since` と表示します。スケジューラーが tick を止めているときは、`status`（ゲートウェイが落ちている場合）とダッシュボードの Cron ページが、最後に tick した時刻も知らせます。これはスケジューラーが止まったときの特徴です。ゲートウェイを再起動して（`hermes gateway restart`）次の tick で遅れているジョブを拾わせるか、`hermes cron run <id>` ですぐに走らせてください。

既定プロファイルのマルチプレクサーが受け持つ名前付きプロファイルでは、`hermes cron status` がそのスケジューラーのホストを示し、名前付きプロファイル自身のハートビートの健康状態を報告します。ハートビートが無い、または古いときは `hermes --profile default gateway restart` が手がかりになります。`cron list` と `cron create` も、そのハートビートが無い・古いときに警告します。`cron status` はさらに、最後に成功した tick を確認して tick のエラーを報告します。

### ゲートウェイのスケジューラーの挙動 {#gateway-scheduler-behavior}

tick のたびに、Hermes は次のことをします。

1. `~/.hermes/cron/jobs.json` からジョブを読み込む
2. `next_run_at` を現在時刻と突き合わせる
3. 時刻になったジョブごとに、新しい `AIAgent` のセッションを起こす
4. 必要なら、ひも付いたスキルをその新しいセッションへ差し込む
5. プロンプトを最後まで実行する
6. 最終の応答を配信する
7. 実行のメタデータと、次の予定時刻を更新する

`~/.hermes/cron/.tick.lock` のファイルロックが、スケジューラーの tick が重なって同じジョブの束を二重に実行するのを防ぎます。

### systemd での再起動に強いワーカー {#restart-safe-workers-under-systemd}

ゲートウェイを systemd のサービスとして動かしている場合、時刻になったジョブは、一時的なユーザースコープ（`systemd-run --user --scope`）で起動する外部のワーカープロセスへ渡されます。そのため、ジョブの途中でゲートウェイを再起動してもジョブは死にません。このスコープを作るにはユーザーの systemd セッションが必要で、それが無いホスト（コンテナ、最小構成の LXC、linger を有効にしていないサービスユーザー）では用意できません。

既定では、そのとき cron は**機能を落として動きます**。ジョブは同じ受け渡しで別の外部プロセスとして走りますが、cgroup による分離が無いので、実行中にゲートウェイを再起動するとジョブは死にます（そのことは実行の台帳に記録されます）。警告はゲートウェイのプロセスごとに 1 回だけ記録されます。代わりに失敗側へ倒して、ジョブを飛ばしてジョブの行にエラーを記録したい場合は、次を設定します。

```yaml
cron:
  require_restart_safe_scope: true
```

根本の対処は、ゲートウェイを動かすユーザーにユーザーセッションを用意することです。`sudo loginctl enable-linger <gateway-user>` を実行し（システム全体へ入れている場合は、ユニットに `XDG_RUNTIME_DIR` と `DBUS_SESSION_BUS_ADDRESS` も）、ゲートウェイを再起動します。Kanban のワーカーは、管理されたゲートウェイのもとでは、この設定にかかわらず常にスコープを必要とします。ホストがスコープを付けられなかった起動は、そのカードにインフラ側の失敗として記録され、あとで再試行されます。カードの責任として数えられることはありません（[Kanban のドキュメント](/hermes/docs/user-guide/features/kanban/#workers-and-systemd-cgroups)を参照してください）。

ワーカーは、ゲートウェイ自身のインタープリタが `python -m cron.scheduler` を走らせたものです。ゲートウェイのチェックアウトがその `PYTHONPATH` に固定されており（ゲートウェイ自身が起動時に持っていた項目も加わります）、ゲートウェイが動かしているのと同じ Hermes の木を読み込みます。venv の editable install の対応付けや、ユニットの `WorkingDirectory`、その端末の `PYTHONSAFEPATH` がどうなっていても変わりません。引き継ぎを受け取ったと伝える前に落ちたワーカーは、自分の標準エラーの末尾をそのジョブの最後のエラーと実行の台帳に書き残すので、素の終了コードではなく、失敗した import（あるいは何が落としたのか）が名前で分かります。

### 実行の履歴 {#execution-history}

Hermes は、実行役やプロバイダーへ発送する前に、確保した cron の試行をプロファイルごとの
`~/.hermes/cron/executions.db` へ記録します。試行は `claimed`、`running` を経て、変えられない
終端の状態（`completed`、`failed`、`unknown`）のどれか 1 つへ進みます。再起動のあと、そして手動の
`hermes cron run` / `/cron run` を実行するたびに（スケジューラーが動いていない単発の呼び出しでも
台帳が手当てされます）、Hermes が放置された試行を `unknown` にするのは、元の PID とプロセス起動の
指紋から、その持ち主がもういないと証明できたときだけです。unknown の試行は監査のための記録で、
自動で再実行されることはありません。

直近の試行は `hermes cron runs [job-id] --limit 20`（別名は `history`）で見られます。終端に達した
履歴には上限がありますが、進行中の試行が刈られることはありません。この台帳は簡易バックアップに
含まれます。

予約された試行は、確保された時刻とは別に、予定されていた正確な時点も記録します。古い `jobs.json`
のスナップショットが、台帳では完了済みとして残っている回をまた組み直した場合、Hermes はその
やり直しを飛ばし、繰り返しジョブの基準を取り直します。これは、スナップショットが発送の刻印より
古い場合や、元の実行が遅れて始まった場合でも働きます。手による明示的な実行が、予約された回の
identity を消費することはありません。

これは、副作用がちょうど 1 回であることの保証ではありません。identity を持たない古い行、刈られた
履歴、参照できない台帳、中断された試行は、完了を証明できません。台帳そのものを古いバックアップへ
戻した場合も、その証拠は失われます。外部からの発火コールバックが指すのは、いま受け付けている
ストアの claim であって、コールバックに含まれない上流の予約枠ではありません。

### 失敗が続いたときの見直しの促し {#repeated-failure-review-nudge}

ジョブはそれぞれ `failure_streak`（続けて失敗した実行の回数。配信の失敗は数えません）を
持ちます。エージェントにたどり着く前に失敗した実行 — 更新が中途半端に当たったあとの import 失敗、
組み立てられないプロバイダークライアントなど — も、エージェント自身が失敗した場合と同じように
数えられ、同じようにアラートを出します。*繰り返し*ジョブの連続失敗がしきい値に届くと、
チャットへ届く失敗のメッセージに見直しの促しが加わり、そのジョブが N 回続けて失敗していること、
そして直すか、止めるか（`hermes cron pause <job>`）、消すかを勧める文が付きます。1 回でも成功すれば
連続失敗はリセットされ、`hermes cron list` は失敗しているジョブの最終実行の横に連続回数を出します。
一度きりのジョブが促すことはありません。

```yaml
cron:
  failure_nudge_threshold: 3   # default; 0 disables the nudge
```

### モデルに届かなかったときの自動の再実行 {#automatic-re-runs-when-the-model-was-unreachable}

モデルを 1 回も呼ぶ前に、一時的なネットワークや DNS のエラーで失敗した繰り返しジョブ —
よくあるのは、コンピューターが復帰した直後、VPN や Wi-Fi がまだ再接続している最中の発火です —
は、その周期をまるごと休むことはありません。スケジューラーが **5 分後、15 分後、30 分後**に
自動で走らせ直し（Claude Cowork の予約タスクの再実行に着想を得ています）、そのあとは通常の
予定に戻ります。API の呼び出しが 1 回も起きていないので、この再実行は費用に影響せず、
副作用が重複することもありません。

再実行が控えている間、途中の失敗の通知は抑えられます。再実行が成功すれば本当の結果が届き、
段階を使い切れば通常の失敗アラートが届きます。モデルに届いた実行は、成功でも失敗でも、この段階を
リセットします。一度きりのジョブは対象外です。発送の勘定が「多くても 1 回」で、いちど使われた
発送がよみがえることはないためです。再試行が、予定そのものの次の回より後ろへはみ出すことも
ありません（次の回のほうが早ければ、そちらが先です）。

```yaml
cron:
  retry_unreachable: false   # default true; disables the automatic re-runs
```

### 失敗のインシデント: 1 度だけ知らせ、間をあけて念押しし、了解済みにする {#failure-incidents-alert-once-remind-on-a-cooldown-acknowledge}

*同じ*エラーで失敗し続ける繰り返しジョブが知らせてくるのは、実行のたびではなく**1 度だけ**です。
それぞれの失敗は、実行履歴と同じプロファイルごとの台帳データベースに、ジョブとエラー文を正規化
した署名を鍵とする消えない**インシデント**として記録されます。ある署名の最初の失敗は必ず配信され、
そのあとインシデントが `alerted` の間は、繰り返しの通知が抑えられます（実行そのものは記録されて
いるので、`hermes cron runs` にも連続失敗の数にも現れます。抑えられるのは通知だけです）。

```yaml
cron:
  failure_repeat_alert_hours: 6   # still broken after this long → one reminder ping,
                                  # then silent again; 0 = alert on every failing run
```

状況が変わることが起きれば、すぐに知らせが届きます。*違う*エラーはそれ自身のインシデントを作って
その場で通知しますし、実行がひとつ成功すると署名の構えが戻るので、正常な実行のあとに同じエラーが
出ればまた知らせが届きます。インシデントの台帳が読めないときは、通知は握りつぶされずに配信されます。

```bash
hermes cron incidents                 # list incidents (newest activity first)
hermes cron incidents --state alerted # filter: detected | alerted | resolved | closed
hermes cron incidents ack <id>        # acknowledge — silence this signature for good
```

インシデントを了解済みにすると、その署名にぴたりと一致する失敗の通知だけが、念押しも含めて出なく
なります。ほかは何も変わりません。実行の履歴はすべての失敗を記録し続け、連続失敗の数も数え続け、
ジョブが*違う*エラーで失敗し始めた瞬間に、新しいインシデントが作られてまたアラートが飛びます。

実行がひとつ成功すると、そのジョブの開いているインシデントはすべて `resolved` になるので、一覧は
そのジョブが過去に出したすべての失敗ではなく、いまの健康状態を映します。あとで*同じ*エラーで
失敗すると、解決済みのインシデントが `detected` として開き直り、また知らせが届きます。了解済み
（`closed`）のインシデントだけは例外で、成功しても手を付けられず、再発しても静かなままです。

インシデントの流れは、`detected`（失敗を記録）→ `alerted`（失敗の通知が少なくとも 1 回は配信
された。`alerted_at` はその最新の時刻で、ここから念押しまでの間隔が始まります）→ `resolved`
（そのあとジョブが正常に実行された。再発すると開き直る）または `closed`（了解済み。その署名に
ついてはこれで終わり）です。保存されるエラー文は、書き込む前に秘密情報を伏せ、長さを切り詰めます。

### 群ぜんたいの健康診断: `hermes cron doctor` {#fleet-health-check-hermes-cron-doctor}

`hermes cron doctor` は、有効なすべてのジョブに対する読み取り専用の健康診断です。ジョブごとの問題をまとめて表示し、見つかったものが残っている間は `1` で終了します。過去に遅れた発送や埋め合わせの発送があった場合も含みます（見つかったものが残っていなければ `0`）。

埋め合わせが成功しても、遅れの警告は消えません。消えるのは、次に時刻どおりに発送できたときです。そのため `hermes cron doctor || alert` のような監視は、ホストが目を覚ましたあと、埋め合わせが成功していても、予定の間隔まるまる分は警報を出し続けることがあります。

```bash
hermes cron doctor
```

有効なジョブごとに見るのは次の点です。

- 直近の実行が失敗している（`last_status` が ok でない。記録されたエラーも出ます）、
- 直近の配信が失敗している（出力は作られたのに、手元へ届かなかった）、
- 直近の発送が遅れた、あるいは予定を逃したあとの埋め合わせだった（`last_dispatch`）。この警告は、次に時刻どおり発火したときに消えます、
- 予定の発火が実行役へ届かなかった（`last_fire_error`）。記録された時刻と短くした理由も出ます。この警告は、実行がひとつ成功すると消えます、
- `next_run_at` が無い、あるいは 15 分の ticker の猶予を越えて過去に取り残されている
  — 「ジョブが黙って発火していない」の信号です（スケジューラーが死んでいる、
  ゲートウェイが落ちている、発火の claim が詰まっている）、
- スクリプトが無い、ファイルでない、`HERMES_HOME/scripts` の外に解決される、
- スクリプトの無い `no_agent` のジョブ、
- 設定した `workdir` がもう存在しない。

doctor がジョブや状態を書き換えることはありません。報告するだけです。引っかかったジョブを
掘るときは、`hermes cron incidents`（消えない失敗の記録）と `hermes cron runs`（試行の台帳）を
併せて使ってください。

## 配信先の選び方 {#delivery-options}

ジョブを予約するときに、出力の届け先を指定します。

| 選択肢 | 説明 | 例 |
|--------|-------------|---------|
| `"origin"` | ジョブを作った場所へ返します | メッセージングでの既定 |
| `"local"` | ローカルのファイルにだけ保存します（`~/.hermes/cron/output/`） | CLI での既定 |
| `"telegram"` | Telegram のホームチャンネル | `TELEGRAM_HOME_CHANNEL` を使います |
| `"telegram:123456"` | ID で指定した Telegram のチャット | 直接届けます |
| `"telegram:-100123:17585"` | 指定した Telegram のトピック | `chat_id:thread_id` の形式 |
| `"discord"` | Discord のホームチャンネル | `DISCORD_HOME_CHANNEL` を使います |
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
| `"bot-chat"` | このプロファイル本来の Bot Chat。ボットが出力を読んで応答します | 同じマシンの中 |
| `"bot-chat:research"` | 同じマシンの別プロファイルの Bot Chat | 作成時に検証します |
| `"all"` | つながっているすべてのホームチャンネルへ配ります | 発火のときに解決します |
| `"telegram,discord"` | 指定した複数のチャンネルへ配ります | カンマ区切りの並び |
| `"origin,all"` | 作成元に**加えて**、つながっているほかのすべてのチャンネルへ届けます | どの語も組み合わせられます |

エージェントの最終の応答は、設定した `deliver:` の宛先へ自動的に届きます。エージェント自身がメッセージを送るわけではないので、cron のプロンプトの中で呼ぶものは何もありません。

届く出力は、送り出される途中で秘密情報が伏せられます。これはどの経路でも同じで、プラットフォームの
メッセージ、セッションの控え（本文と、その前後に差し込まれるジョブ名）、`bot-chat` のやり取りの
いずれもです。資格情報の形をしたもの（ベンダー名で始まる API キー、トークン、`KEY=value` の代入）は、
`security.redact_secrets: false` にしていても伏せられます。この設定が決めるのは自分の手元のログで
あって、マシンの外へ出ていくものではありません。伏せる処理が失敗したときは、そのまま送るのではなく
本文を置き換えます。資格情報のような名前の付いた URL のクエリパラメータは取り除きません（マジック
リンクや署名済みの URL は、cron の出力として真っ当なものだからです）。また、利用者が自分で決めた、
それと分かる形を持たない秘密は検出できません。`cron/output/<job_id>/` の下にある実行の記録には、
エージェントの応答が書かれたまま残ります。

### 配信の失敗は別のステータス {#delivery-failures-are-a-distinct-status}

実行と配信は別々に追われます。エージェントの実行は成功したのに出力が宛先へ届かなかったとき
（プラットフォームの 5xx、レート制限、古くなったセッション、アダプターが送信できた証拠を返さない）、
ジョブは `last_status: delivery_failed` を記録します。ただの `ok` にはなりません。理由は
`last_delivery_error` に入ります。`hermes cron list` は黄色で `delivery_failed: <reason>` と表示し、
`hermes cron doctor` は配信の問題として報告し、手で実行した `cronjob run` は配信のエラーとともに
`success: false` を返します。配信の失敗は、そのジョブの `failure_streak` には数えません
（エージェントは仕事をしたためです）。次に完全に成功した実行で、ステータスは `ok` に戻ります。

### Bot Chat への配信（`bot-chat`） {#bot-chat-delivery-bot-chat}

`bot-chat` は、出力を**あるプロファイル本来の「Bot Chat」セッションへ、実際のメッセージとして**届けます。受け手がチャンネルを読む人間である他のすべての宛先と違って、ここでの受け手はボット自身です。ボットは出力を受信メッセージとして受け取り、対処が要ることに対処し、自分のチャットで応答します。予約実行の出力を、ただ投稿するのではなく*処理*させたいときに使います。

- `bot-chat`（そのまま）は、そのジョブ自身のプロファイルを指します。
- `bot-chat:<profile>` は、**同じマシン上の**別のプロファイルを指します。名前は、ジョブを作るときに `hermes profile list` と突き合わせて検証されます。別のゲートウェイやマシンのプロファイルは決して指定できないので、マシンをまたいで同じ名前があっても曖昧になりません。
- 配信 1 回につき、受け側のボットのエージェントのターンをまるごと 1 回使います。実行の間隔には気をつけてください。
- ほかの宛先と組み合わせられますが（`bot-chat,telegram`）、`all` に含まれることは決してありません。
- 本来のチャットが、メールボックスに対応した Desktop / TUI のバックエンドで開かれている場合、配信は、ボットが空いていても取り込み中でも**すぐに確実にキューへ入ります**。受信のターンを走らせるのはその生きた持ち主だけで、cron が競合する CLI の書き手を起こすことはありません。CLI しか使えない持ち主や、対応していない古い持ち主がそのチャットを握っている場合、cron は未着手の出力を、送る側のプロファイルの `cron/bot_chat_pending/<receipt-id>.json` に保持します。以後のスケジューラーの tick が、その持ち主がチャットを手放したあと、受け入れた順に届けます。持ち越された仕事は、スケジューラーの起動ルートが変わっても、受け入れたときの宛先ホームとレシート ID を保ち続けます。宛先が無くなったり名前が変わったりしても、作り直したり別のプロファイルへ振り替えたりはしません。`transferred` の保留記録が指すのは、失敗したターンではなく、生きた持ち主のレシートです。壊れた JSON の記録は、ほかのキュー済みの出力を止めずに保持され、ログに残ります。持ち主がいない場合は、これまでの `hermes chat -c "Bot Chat" --create-if-missing` の経路がそのまま使えます（通常のセッション所有権の確認も引き続き働きます）。その子プロセスは、cron がすでに確かめた宛先ホームをそのまま使い、独自のルートも含みます。引き継いだ `HOME` や、アクティブなプロファイルの変更で行き先が変わることはありません。宛先のディレクトリが無い場合は、起動する前に断られ、作り直されることはありません。持ち越された要求は、その経路を起動する前に確保されます。中断や、サブプロセスの結果がはっきりしない場合でも、自動で送り直すことはありません。
- 未着手の出力に期限はありません。対応していない持ち主がずっと手放さなくても、黙って捨てられることはなく、キューに残ります。レシートはその中身を無期限に保持します。予期しない配信の例外はログに残り、`ambiguous` として保持され、その掃き取りの中のほかの配信を止めることはありません。claimed や ambiguous の試行が自動でやり直されることはありません。
- **キューに入った＝完了ではありません。** cron はレシート ID と `queued`/`claimed` のステータスを `last_delivery_queued` に記録し、配信の結果は `queued`（届いてもいないし、失敗でもない）になります。成功したジョブは `delivery_queued` と表示されます。ほかの宛先での本当のエラーは、引き続き配信の失敗として優先されます。ボットはあとから終えるかもしれません。正本は、宛先プロファイルの `runtime/bot_live_delivery/<receipt-id>.json` にある消えないレシートです。cron 側の過去のステータスが自動で更新されることはありません。
- 同じ実行をもう一度確かめると、持ち主が消えていても既存のレシートを見にいきます。受け入れたあとに別の書き手へ戻ることはありません。`failed`、`cancelled`、`ambiguous` のレシートが自動でやり直されることはありません。意図して新しい仕事を始める前に、チャットとレシートを確かめてください。cron の実行ごとに、配信の ID は別のものになります。

### 配り方の意図（`all`） {#routing-intent-all}

`all` を使うと、設定済みのすべてのメッセージングチャンネルへ、名前をひとつずつ並べずに cron ジョブをひとつ届けられます。これは**発火のときに解決される**ので、Telegram をつなぐ前に作ったジョブでも、`TELEGRAM_HOME_CHANNEL` を設定すれば次の tick から Telegram を拾います。

意味はこうです。`all` は、ホームチャンネルを設定したすべてのプラットフォームへ広がります。0 件でも構いません。その場合ジョブは配信先を持たず、上流では配信の失敗として記録されます。

`all` は明示的な宛先と組み合わせられます。`origin,all` は、作成元のチャット*に加えて*つながっているほかのすべてのホームチャンネルへ届け、`(platform, chat_id, thread_id)` で重複を取り除きます。

### Telegram の cron トピック（`TELEGRAM_CRON_THREAD_ID`） {#telegram-cron-topic-telegramcronthreadid}

Telegram のトピックモードを有効にしていると、DM のルートはシステムのロビーとして取っておかれます。そこへ送った返信はロビーの案内で押し返され、`reply_to_message_id` は落とされるので、メインのチャットに届いた cron のメッセージには返信できません。

代わりに、cron を専用のフォーラムトピックへ向けます。

1. Telegram でボットの DM を開き、たとえば `Cron` という名前のトピックを作ります。トピックのヘッダーを長押しして **Copy link** を選ぶと、末尾の整数がそのトピックの `message_thread_id` です。
2. `.env` に `TELEGRAM_CRON_THREAD_ID=<that id>` を設定します。

これが効くのは cron の配信だけです。`TELEGRAM_HOME_CHANNEL_THREAD_ID`（再起動の通知など、ほかの用途で使うもの）はそのままです。明示的な `deliver="telegram:chat_id:thread_id"` の宛先は、引き続き環境変数より優先されます。cron のメッセージへの返信は、そのトピックのセッションに届くようになったので、そのまま対応できます。

### 応答の包み方 {#response-wrapping}

既定では、届く cron の出力はヘッダーとフッターで包まれ、受け取った人が予約タスクからのものだと分かるようになっています。

```
Cronjob Response: Morning feeds
-------------

<agent output here>

Note: The agent cannot see this message, and therefore cannot respond to it.
```

包まずに生のエージェントの出力を届けたいときは、`cron.wrap_response` を `false` にします。

```yaml
# ~/.hermes/config.yaml
cron:
  wrap_response: false
```

### プッシュ通知（`cron.delivery.notify`） {#push-notifications-crondeliverynotify}

cron の出力は途中経過ではなく*最終*の配信なので、既定ではプラットフォームの通知フラグを立てて
送られます。Telegram では、アダプターの通知モードが `important` のときでも
（そのモードは本来 `disable_notification=true` で送るため、利用者から「静かなブリーフは
まったく届かない」と報告されます）ブリーフでプッシュが鳴る、ということです。静かな配信に戻すには
次のようにします。

```yaml
# ~/.hermes/config.yaml
cron:
  delivery:
    notify: false   # default: true
```

このフラグはテキストの送信にも、メディアの添付にも同じように乗るので、片方だけ鳴ってもう片方は
静か、ということは起きません。

### 配信の確認と `UNVERIFIED` の状態 {#delivery-confirmation-and-the-unverified-state}

生きたアダプターへの配信が「届いた」と記録されるのは、アダプターから確かな証拠が返ったときだけです。
フィルタによる取り下げ（`delivered: false`）ではない明示的な `success` と、`message_id` か
`raw_response` のどちらかがあること、です。`success` はあるがどちらの証拠も無い結果 — Slack、
Matrix、Mattermost のアダプターが返す形 — も受け入れられますが（失敗の証拠ではないためです）、
その実行はジョブに `last_delivery_unverified` として記録され、`hermes cron list` に次のように
現れます。

```
⚠ Delivery UNVERIFIED: adapter acked slack:C0123456 without message_id/raw_response
```

`hermes cron doctor` では `last delivery unverified (...)` と出ます。この印は、次に証拠付きで
配信できた実行で消えます。中身が空のペイロード（テキストもメディアも無いもの）はアダプターへ
渡されません。失敗側へ倒れ、届いたとは記録されずに `last_delivery_error` に理由が入ります。

### 続きを話せるジョブ（cron の配信に返信する） {#continuable-jobs-reply-to-a-cron-delivery}

既定では、cron の配信は送りっぱなしです。メッセージは送られますが、そのチャットの会話履歴には
残らないので、返信してもエージェントは自分が何を言ったか覚えていません。ジョブを**続きを話せる**
設定にすると、届いたブリーフがそのまま返信できる会話になります。エージェントはブリーフを文脈として
持っているので、「タスク #2 とは何ですか」と聞き返すことがありません。

自分で有効にする方式で、**既定は無効**です。設定ファイルでぜんたいを有効にするか、`cronjob` ツールの
`attach_to_session`（そのジョブについてはグローバルの設定を上書きします）でジョブごとに有効にします。

```yaml
# ~/.hermes/config.yaml
cron:
  mirror_delivery: false   # set true to make cron deliveries continuable
```

挙動は**スレッド優先**で、そのジョブ自身の会話に限られます。

- **スレッドを持てるプラットフォーム**（Telegram のトピック、Discord / Slack / Matrix のスレッド）では、
  配信ごとに専用のスレッドが開かれ、ブリーフがそのスレッドのセッションへ差し込まれます。スレッドの
  中で返信すれば、文脈をすべて持ったまま続けられます。繰り返しのジョブ（毎日のブリーフなど）は
  実行ごとに新しいスレッドを開くので、配信ごとのやりとりが混ざりません。
- **DM しかないプラットフォーム**（WhatsApp、Signal、SMS）にはスレッドが無いので、ブリーフは宛先の
  DM のセッションへ写されます（作成元の DM、フォールバックやプラットフォーム名だけのジョブなら
  ホームの DM）。DM そのものが、続きを話す場所になります。

触れられるのは、そのジョブ**自身の会話**だけです。

- ジョブが作られた**作成元のチャット**、
- `deliver: origin` が作成元を捕まえられなかったときの**ホームチャンネルへの受け皿**（生きた
  ゲートウェイのチャットからではなく、スクリプトや API から作られたジョブ）。利用者の
  主な会話が、作成元の代わりを務めます、
- ジョブの**ひとつだけの明示的な `platform:chat` 宛先**。ただし、そのジョブ自身が
  `attach_to_session: true` で有効にしたときに限ります。ジョブの作者が、その宛先を会話だと
  宣言した、という意味です。グローバルな `mirror_delivery` のフラグだけでは、明示的に宛先を
  書いたチャットが続きを話せるようになることはありません。

一斉配信への展開（`all`）が、続きを話せるようになることはありません。利用者が書いた
プラットフォーム名だけの指定（`deliver: slack`）は、そのプラットフォームのホームチャンネルを
意図して指したものなので、上のホームチャンネルの受け皿と同じ規則に従います。更新したあと、
`cron.mirror_delivery: true` を設定した既存の `deliver: <platform>` のジョブは、スレッドを持てる
プラットフォームで実行ごとに新しいスレッドを開くことがあります。この「実行ごとにスレッド」を
やめたいジョブには `attach_to_session: false` を設定してください。

写しは、ラベルの付いた利用者のターン（`[Cron delivery: <task name>]`）として書かれます。これにより、
どのモデルプロバイダーでも会話履歴の交互の並びが崩れません。

#### チャンネルに平らに続ける（Slack） {#flat-in-channel-continuation-slack}

上のスレッド優先の挙動は、配信のたびに専用のスレッドを作ります。続きを話せるジョブを
**チャンネルのタイムラインへ平らに**置きたい（スレッドを作りたくない）ときは、Slack の
**続きを話す場所**を `in_channel` にします。

```yaml
# ~/.hermes/config.yaml
slack:
  cron_continuable_surface: in_channel   # default: thread
  reply_in_thread: false                 # required pairing (see below)
  require_mention: false                 # so a plain reply continues the job
```

`in_channel` のモードでは、ブリーフは普通のトップレベルのチャンネルメッセージとして届き
（スレッドは開かれません）、返信するとチャンネル共通のセッションでジョブが続きます。
3 つの設定が組み合わさって働きます。

- **`cron_continuable_surface: in_channel`** — 配信のときにスレッドを作らなくなります。
- **`reply_in_thread: false`**（必須） — ボットが返信に*平らに*チャンネルで答え、ブリーフが
  差し込まれたのと同じチャンネル全体のセッションへひも付けます。これが無いと、続き自体は働きますが
  スレッドで届きます（スレッド方式の継続へ安全に戻るだけで、返信が落ちることはありません。
  食い違いに気づけるよう、ゲートウェイは起動時に警告を出します）。
- **`require_mention: false`**（または、そのチャンネルを `free_response_channels` に加える）
  — 普通のメッセージで返信できるようになります。そうしないと、返信のたびに `@` で呼びかけないと
  ボットは起きません。

続きが**チャンネル全体**のセッションになるので、それは共有されます。チャンネルの中のほかの雑談も、
2 つ目の続きを話せる in_channel のジョブも、同じ流れの会話に合流します。これは「チャンネルに
平らに」であることの必然で、`reply_in_thread: false` を使う人がすでに受け入れているのと同じ
引き換えです。配信ごとのやりとりを分けたいときは、既定の `thread` を使ってください。

これはいまのところ Slack の機能です。ほかのプラットフォームもこのキーを受け付けますが、`thread` へ
戻ります（継続の仕組みが違うためです）。選択はプラットフォームごとで、それぞれの設定の下に
書きます。ゲートウェイ側の設定フラグなので、`/restart` で読み込まれます。Slack アプリの入れ直しは
要りません。

:::note 1 対 1 の DM
`cron_continuable_surface` は**チャンネル**の設定です。1 対 1 の DM には、スレッドとタイムラインの
どちらかを選ぶという区別が無い（DM はもともと平らです）ので、このキーはそこでは効きません。
DM の cron 配信が続きを話せるかどうかを決めるのは、以前からある別のつまみ
**`slack.dm_top_level_threads_as_sessions`** です。

- **`false`** — トップレベルの DM はすべてひとつの流れの DM セッションを共有するので、続きを話せる
  cron のブリーフと返信が**同じ**セッションに入り、ジョブは文脈を保ったまま続きます。DM で続きを
  話せる cron にしたいなら、これです。
- **`true`**（既定） — トップレベルの DM のメッセージはそれぞれ独立したセッションになるので、届いた
  ブリーフへの返信は、そのブリーフを知らない*新しい*セッションを始めてしまいます。このモードでは
  継続は働きません（cron でも、ほかの平らな配信でも）。

つまり、1 対 1 の DM へ届ける、続きを話せる cron ジョブには
`slack.dm_top_level_threads_as_sessions: false` を設定します。DM では `cron_continuable_surface` は
不要で、無視されます。
:::

### 静かに抑える {#silent-suppression}

エージェントの最終の応答に `[SILENT]` が含まれていると、配信はすべて抑えられます。出力は監査のためにローカル（`~/.hermes/cron/output/`）へ保存されますが、配信先へメッセージは送られません。

これは、異常があったときだけ報告してほしい監視のジョブに便利です。

```text
Check if nginx is running. If everything is healthy, respond with only [SILENT].
Otherwise, report the issue.
```

失敗したジョブは `[SILENT]` の印にかかわらず必ず配信されます。静かにできるのは成功した実行だけです。静かな監視のジョブにしたいときは、報告することが無ければ `[SILENT]` だけを返すようにエージェントへ指示してください。

### 実行を失敗と宣言する {#declaring-a-failed-run}

実行が失敗と記録されるのは、実行時の失敗（例外、タイムアウト、モデルに届かない）だけです。エージェント自身は
ターンを終えたのに仕事が片付かなかったとき — たとえば、任せたサブエージェントや、走らせたスクリプトが失敗した
とき — は、応答の**1 行目**に `[CRON_FAILURE]` だけを置き、そのあとに説明を続けることで、その実行を失敗だと
宣言できます。

```text
[CRON_FAILURE]
The nightly export subagent exited with "disk full"; no report was produced.
```

すると実行は失敗として記録され（`last_status`、連続失敗、`hermes cron runs`、`hermes cron incidents` の
すべてに反映されます）、失敗の通知はほかの失敗した実行と同じように届きます。応答の全文は切り分けのために
`~/.hermes/cron/output/` の下へ保存されます。この印の判定は厳密です。報告のほかの場所で `[CRON_FAILURE]` に
触れたり引用したりしても、実行は成功のままです。スクリプトだけの（`no_agent`）ジョブはこれを無視します。
スクリプトは 0 以外の終了コードで失敗を伝えます。

## スクリプトのタイムアウト {#script-timeout}

事前に走らせるスクリプト（`script` パラメーターでひも付けるもの）の既定のタイムアウトは 3600 秒（1 時間）です。これが縛るのは**スクリプトだけ**で、スキルや LLM で動くジョブは別の無操作の予算で動き、この値では制限されません。スクリプトに別の上限が要るなら、変えられます。

```yaml
# ~/.hermes/config.yaml
cron:
  script_timeout_seconds: 1800   # 30 minutes
```

あるいは `HERMES_CRON_SCRIPT_TIMEOUT` の環境変数を設定します。解決の順番は、環境変数 → config.yaml → 既定の 3600 秒です。

cron は、実行のあとのセッションとエージェントの資源の後片付けにも上限を掛けます。これは LLM のターンが返ったあとに起きるので、無操作のタイムアウトとは別ものです。既定は後片付けの操作ごとに 10 秒です。ストレージやクライアントの終了処理が返ってこなくなった場合、スケジューラーはエラーを記録し、そのジョブの実行中の印を外して、そのジョブを永久に飛ばすのではなく、以後の実行を発送できるようにします。

```yaml
# ~/.hermes/config.yaml
cron:
  cleanup_timeout_seconds: 10
```

`cleanup_timeout_seconds: 0` は、上限の無い従来の後片付けに戻したいときだけ設定してください。

## メディア送信のタイムアウト {#media-send-timeout}

cron の配信にメディアの添付（生成した PDF、TTS の音声、書き出したレポート）が含まれ、それを生きたゲートウェイのアダプター経由で送る場合、添付ごとのアップロードにタイムアウトが掛かります。既定は 300 秒です。回線の遅いところで大きなファイルを送るときは、もっと必要になることがあります。

```yaml
# ~/.hermes/config.yaml
cron:
  media_send_timeout_seconds: 600   # 10 minutes per attachment
```

あるいは `HERMES_CRON_MEDIA_SEND_TIMEOUT` の環境変数を設定します。解決の順番は、環境変数 → config.yaml → 既定の 300 秒です。タイムアウトした添付は、ジョブの実行ステータスに部分的な配信の失敗として記録されます（テキストは届きます）。

## Bot Chat 配信のタイムアウト {#bot-chat-delivery-timeout}

`bot-chat` への配信は、相手のボットのチャットでエージェントのターンをまるごと 1 回動かすので、上限は秒ではなく分の単位です。既定は 600 秒です。

```yaml
# ~/.hermes/config.yaml
cron:
  bot_chat_delivery_timeout_seconds: 900
```

タイムアウトした配信は `last_delivery_error` に記録されます。ボットのターン自体は、そのまま終わることもあります。

この上限が縛るのは、ボットの**ターン**だけです。そのターンが仲間へメッセージを送った場合（`message_agent`）、配信のプロセスはそのあとも生き続け（`terminal.oneshot_completion_wait_seconds` が上限です）、仲間の返事が Bot Chat へ届けられるようにします。この待ち時間は配信の一部ではなく、この上限に数えられることも、この上限で打ち切られることもありません。

## no-agent モード（スクリプトだけのジョブ） {#no-agent-mode-script-only-jobs}

LLM の推論が要らない繰り返しのジョブ — 昔ながらの見張り、ディスクやメモリの警告、死活の確認、CI への ping — には、作成のときに `no_agent=True` を渡します。スケジューラーは予定どおりスクリプトを走らせ、その標準出力をそのまま届け、エージェントをまるごと飛ばします。

```bash
hermes cron create "every 5m" \
  --no-agent \
  --script memory-watchdog.sh \
  --deliver telegram \
  --name "memory-watchdog"
```

意味は次のとおりです。

- スクリプトの標準出力（前後の空白を落としたもの）は、そのままメッセージとして届きます。
- **標準出力が空なら静かな tick**で、配信はありません。「異常があるときだけ言う」という見張りの型です。
- 0 以外の終了、またはタイムアウトなら、エラーのアラートが届くので、壊れた見張りが黙って死ぬことはありません。
- 最後の行の `{"wakeAgent": false}` は、静かな tick になります（LLM のジョブと同じ関門です）。
- トークンも、モデルも、プロバイダーのフォールバックもありません。このジョブが推論の層に触れることはありません。

`.sh` / `.bash` のファイルは、`PATH` に `bash` があればそれで、無ければ `/bin/bash` で動きます（Windows の Git Bash では大事な点です）。それ以外は、いまの Python インタープリター（`sys.executable`）で動きます。スクリプトは `$HERMES_HOME/scripts/` の中に解決されなければなりません。相対名、絶対パス、`~` で始まるパスは、解決した先がそのディレクトリに収まるなら受け付けられ、外へ出るパスは拒否されます。サブプロセスの環境変数は掃除されます（`_sanitize_subprocess_env`）。プロバイダーの API 認証情報や、Hermes が管理するほかの秘密情報は、cron のスクリプトへ**引き継がれません**。

#### スクリプトへ資格情報を渡す {#giving-a-script-a-credential}

外部のサービスへ認証しなければならないスクリプト（API のトークン、サービスアカウントの鍵）は、端末や `execute_code` の子プロセスと同じやり方で受け取ります。持ち主のプロファイルの `config.yaml` で変数名を宣言し、そのプロファイルの `.env`（または外部の[秘密情報の取得元](/hermes/docs/user-guide/secrets/)）で値を定義します。

```yaml
terminal:
  env_passthrough:
    - MY_SERVICE_TOKEN
```

この変数は、**持ち主のプロファイルの**値としてスクリプトの環境へ渡されます。複数プロファイルのゲートウェイや Desktop・ダッシュボードのバックエンドが受け持つプロファイルに属するジョブでは、値はそのプロファイルの秘密情報のスコープから解決され、起動したプロファイルのプロセス環境から取られることはありません。そのプロファイル自身の `.env` の資格情報が、ほかのプロファイルのスクリプトへ届くこともありません。Hermes が管理するプロバイダーの資格情報（`OPENAI_API_KEY`、ゲートウェイのトークンなど）は宣言できません。掃除の仕組みが拒否します。プロファイルがひとつだけの導入では、これまでどおり、ゲートウェイの `.env` がプロセス環境へ入れたものをスクリプトが引き継ぎます。ログに出すのは有無（`set`／`MISSING`）だけにして、値は出さないでください。スクリプトの出力はそのまま届きます。

### エージェントが用意してくれます {#the-agent-sets-these-up-for-you}

`cronjob` ツールのスキーマは `no_agent` を Hermes 自身へ見せているので、チャットで見張りの内容を伝えるだけで、エージェントに組み立てさせられます。

```text
Ping me on Telegram if RAM is over 85%, every 5 minutes.
```

Hermes は `write_file` で確認用のスクリプトを `~/.hermes/scripts/` へ書き、それから次を呼びます。

```python
cronjob(action="create", schedule="every 5m",
        script="memory-watchdog.sh", no_agent=True,
        deliver="telegram", name="memory-watchdog")
```

メッセージの中身がスクリプトだけで決まる場合（見張り、しきい値の警告、死活の確認）は、自動で `no_agent=True` を選びます。同じツールで一時停止・再開・編集・削除もできるので、CLI に誰も触れないまま、ライフサイクルぜんたいをチャットから動かせます。

作った例は[スクリプトだけの cron ジョブのガイド](/hermes/docs/guides/cron-script-only/)を参照してください。

## `context_from` でジョブをつなぐ {#chaining-jobs-with-contextfrom}

cron のジョブは、前の実行を覚えていない独立したセッションで動きます。とはいえ、あるジョブの出力が、次のジョブに必要なものそのもの、ということもあります。`context_from` のパラメーターは、そのつながりを自動で配線します。ジョブ B のプロンプトの先頭に、実行時にジョブ A の直近の出力が文脈として付きます。

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

**仕組み:**

- ジョブ 2 が発火すると、Hermes はジョブ 1 の直近の出力を `~/.hermes/cron/output/{job1_id}/*.md` から読みます
- その出力が、ジョブ 2 のプロンプトの先頭へ自動で付きます
- ジョブ 2 は「このファイルを読め」と書いておく必要がありません。中身を文脈として受け取ります
- 鎖の長さは自由です。ジョブ 1 → ジョブ 2 → ジョブ 3 → …

**`context_from` が受け付ける形:**

| 形式 | 例 |
|--------|---------|
| ジョブ ID をひとつ（文字列） | `context_from="a1b2c3d4"` |
| 複数のジョブ ID（リスト） | `context_from=["job_a", "job_b"]` |

出力は、並べた順につながります。

**継続: 前の実行の出力を引き継ぐ**

`continuity=true` にすると、そのジョブは*自分自身*の直近の出力を毎回の実行へ差し込みます。繰り返しのジョブは普通、毎回まっさらな記憶で始まります。ニュースの収集は同じ話題を何度も報告し、監視は同じ状態で何度も警告します。継続を有効にすると、ジョブは前回なにを報告したかを見た状態で目を覚ますので、重複を取り除いて、続きから進められます。

```python
cronjob(
    action="create",
    prompt="Scan HN and arXiv for new agent-tooling papers. Report only items NOT already covered in your previous run's output.",
    schedule="every 6h",
    continuity=True,
    name="Agent Tooling Scout",
)
```

最初の実行には前の出力が無いので、プロンプトはそのまま走ります。文脈を選ぶときには、静かな監視の tick（`no_change`）、空の出力、`wakeAgent=false` の監査記録は飛ばされるので、静かな時期があっても、直近の中身のある出力が残ります。監査のファイルはディスクに残ります。エラーの記録は、次の実行へ復旧の文脈を渡すため、引き続き対象になります。成功だけを残す履歴の絞り込みではありません。2 回目以降の実行では、前の出力が継続の枠組み（「すでに報告したことを繰り返さないように」）とともに先頭へ付きます。上流のジョブとも自由に組み合わせられ（`context_from=["<other_job_id>"]` と `continuity=true` の併用）、更新のときに `continuity=false` にすると、ほかの `context_from` の項目を残したまま継続だけを切れます。内部では、このフラグは `context_from` の予約済みの項目 `self` として保存されます。

CLI からは `hermes cron create "every 6h" "Scan for news" --continuity`、既存のジョブで切り替えるには `hermes cron edit <job_id> --continuity` / `--no-continuity` です。同じ切り替えは、ダッシュボードの cron 編集画面と、デスクトップの Bot Mode のルーチンのダイアログにもあります。

**使いどころ:**

- 多段のパイプライン（収集 → 絞り込み → 整形 → 配信）
- N 段目の仕事が N−1 段目の出力に依存する、依存関係のあるタスク
- ひとつのジョブが複数のジョブの結果をまとめる、広げて集める型
- 自分の前回の報告と突き合わせて重複を取り除きたい、繰り返しの収集や監視（`continuity=true`）

## プロバイダーの復旧 {#provider-recovery}

cron のジョブは、設定したフォールバックのプロバイダーと、認証情報プールの巡回を引き継ぎます。主となる API キーがレート制限に掛かったり、プロバイダーがエラーを返したりしたとき、cron のエージェントは次のことができます。

- `config.yaml` に `fallback_providers`（または旧来の `fallback_model`）を設定していれば、**別のプロバイダーへ切り替える**
- 同じプロバイダーの[認証情報プール](/hermes/docs/user-guide/configuration/#credential-pool-strategies)にある**次の認証情報へ回す**

つまり、高い頻度で動く cron のジョブや、混み合う時間帯に動くジョブほど粘り強くなります。キーひとつがレート制限に掛かっても、実行ぜんたいが失敗することはありません。

## 実行の失敗（`last_error`） {#run-failures-lasterror}

エージェントの実行が失敗すると、短い `last_error` が記録され、ジョブの一覧や `/cron list` で見られます。
認証情報のパターンと、URL に埋め込まれた認証情報は伏せられます（以前に保存されたエラーも同じです）。
これは `last_fire_error`（スケジューラーからの受け渡し）や `last_delivery_error`（配信）とは別ものです。
エージェント自身が失敗したとき、それらのフィールドが空なのは正しい状態です。

接続の失敗については、いまの Hermes ホームの `cron/output/<job_id>/` にある実行の記録を見てください。
その `## Error` の節には、認証情報のパターンと URL に埋め込まれた認証情報を伏せたうえで、連なった
トレースバックが入ります。このファイルには、これまでと同じ非公開の出力ファイルの権限が付き、
トレースバックのローカル変数は記録されません。配信の通知と `last_error` には、全文のトレースバック
ではなく短いエラーが残ります。共有する前に中身を確かめてください。伏せ字は、アプリケーションの
任意のデータが機微でないことを保証するものではありません。

## 予約した発火の取りこぼし（`last_fire_error`） {#missed-scheduled-fires-lastfireerror}

ホスト型（マネージド cron）の構成では、予約された発火はプラットフォームのスケジューラーからダッシュボードを経て、ゲートウェイの内部 API サーバーへ届きます。その最後の受け渡しが失敗すると — ゲートウェイのプロセスが落ちている、あるいは API サーバーの待ち受けがそもそも始まっていない — 実行は始まらないので、実行の記録も、確かめられる `last_status` もありません。見分け方は、手で発火させれば毎回動くのに、自動では一度も発火しない、という形です。

この取りこぼしは `last_fire_error`（時刻と理由）としてジョブの記録に刻まれ、次の場所に現れます。

- `cronjob` ツールの `action: "list"` — `last_fire_error` のフィールド
- `hermes cron list`: ジョブの下に、赤い取りこぼしの警告
- `hermes cron doctor`: ジョブごとの取りこぼしの指摘。これがあると、コマンドは `1` で終了します
- ダッシュボードのジョブの画面

この刻印は、常に**いまの**自動発火の健康状態を映します。新しい取りこぼしで上書きされ、次に実行が成功すると自動で消えます。これが見えている場合、ジョブとその予定自体は問題ありません。手当てが要るのは、発火の経路のゲートウェイ側です（多いのは、プロファイルの環境をまるごと読み直させるために、監督プロセス経由でゲートウェイを再起動することです: `hermes gateway restart`）。

### ローカルでの取りこぼしの方針 {#local-missed-run-policy}

繰り返しのジョブの予定時刻が過ぎたときにゲートウェイが落ちていた（あるいは再起動中だった）場合、
スケジューラーが戻ってきたときにそのジョブは**1 回だけ追い付きます**。再起動の隙間に取りこぼした枠は
ちょうど 1 回だけ発火し、再起動より前にすでに実行された枠が二度と実行されることはなく、長い停止も、
枠の数だけ実行するのではなく 1 回にまとめられます。一時停止中のジョブは追い付きません。追い付きは
`hermes cron list` に `⚠ late` / `⚠ catch-up after missed fire` として出ます。

計画的にゲートウェイを止めたあと、この追い付きの負荷を避けたいときは、次を設定します。

```yaml
cron:
  catch_up_missed: false   # default: true
```

あるいは `hermes config set cron.catch_up_missed false` を実行します。これを外すと、既存の猶予の窓
（周期の半分を 120 秒〜2 時間に収めたもの）より遅れた繰り返しのジョブは、いま発火せずに次の回へ
基準を取り直します。飛ばしたことはログに残ります。猶予の中にあるジョブと、手による明示的な発火は
これまでどおり動きます。次の回を計算できない場合は、これまでの「1 回だけ実行する」受け皿が
そのまま残ります。これは、一度きりのジョブの期限切れ、resume の挙動、下にあるホスト型プロバイダーの
掃き取りを変えるものではありません。ジョブごとの上書きはありません。

### 取りこぼしの追い付き {#misfire-catch-up}

外部のスケジューラーのプロバイダーが動いているとき（ホスト型構成のマネージド cron）、ゲートウェイは追い付きの掃き取りも走らせます。予定の時刻が過ぎても発火が届かず、猶予の窓も過ぎたジョブは、ローカルで確保して実行されます。そのため、発火の受け渡しが止まっても、失うのは 1 日分ではなく数分で済みます。この掃き取りは、通常の発火と同じストアの claim によって、遅れて届くスケジューラーの再送と重ならないようになっています。

```yaml
cron:
  misfire_grace_minutes: 10   # wait this long for the scheduler's own retries
                              # before catching up locally; 0 disables catch-up
```

ローカル（内蔵の ticker）の構成に、これは要りません。ticker は次の tick で、期限の過ぎたジョブをすでに拾います。

## 予定の書き方 {#schedule-formats}

エージェントの最終の応答は、ジョブの `deliver:` の宛先へ自動的に届きます。エージェントが自分でメッセージを送ることはもう無いので、利用者に見せたい内容はそのまま最終の応答に書けば済みます。**追加の、あるいは別の**宛先へ届けたいときは、エージェントに送らせるのではなく、cron のジョブに `deliver:` の宛先を複数並べます（カンマ区切り、たとえば `deliver: "telegram,discord"`）。

### 相対的な遅れ（一度きり） {#relative-delays-one-shot}

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

### 自然な曜日・時刻の指定（繰り返し） {#natural-daytime-schedules-recurring}

```text
every monday 9am         → Weekly, Mondays at 9:00 AM
every day at 9am         → Daily at 9:00 AM
weekdays at 9am          → Weekdays at 9:00 AM
weekends at 10am         → Saturdays and Sundays at 10:00 AM
daily at 7am             → Daily at 7:00 AM
monday, wednesday at 9am → Mondays and Wednesdays at 9:00 AM
```

時刻は `9am`、`9:30pm`、`14:00`、24 時間制の数字だけのもの（`at 7`）、`noon`、`midnight` を受け付けます。これらの書き方は、内部で cron 式へ変換されます（`croniter` のパッケージが必要で、既定で入っています）。

### cron 式 {#cron-expressions}

```text
0 9 * * *       → Daily at 9:00 AM
0 9 * * 1-5     → Weekdays at 9:00 AM
0 9 * * MON-FRI → Weekdays at 9:00 AM (named weekdays/months accepted)
0 */6 * * *     → Every 6 hours
30 8 1 * *      → First of every month at 8:30 AM
0 0 * * 0       → Every Sunday at midnight
```

### ISO のタイムスタンプ {#iso-timestamps}

```text
2026-03-15T09:00:00    → One-time at March 15, 2026 9:00 AM
```

## 繰り返しの挙動 {#repeat-behavior}

| 予定の種類 | 既定の繰り返し | 挙動 |
|--------------|----------------|----------|
| 一度きり（`in 30m`、タイムスタンプ） | 1 | 1 回だけ実行します |
| 間隔（`every 2h`） | 無期限 | 消すまで実行します |
| cron 式 | 無期限 | 消すまで実行します |

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

エージェント向けの API は、ツールひとつです。

```python
cronjob(action="create", ...)
cronjob(action="list")
cronjob(action="update", job_id="...")
cronjob(action="pause", job_id="...")
cronjob(action="resume", job_id="...")
cronjob(action="run", job_id="...")
cronjob(action="remove", job_id="...")
```

`update` では、`skills=[]` を渡すと、ひも付いたスキルをすべて外せます。

### 手で発火させると非同期になります {#manual-runs-are-asynchronous}

`cronjob(action="run")` は、ジョブを**バックグラウンドで**すぐに発火させます（`delegate_task` と
同じです）。ツールの呼び出しはハンドルを返してすぐ戻り、実行が終わると、その結果 — 成功か失敗か、
配信先、次の予定、出力の抜粋 — が新しいメッセージとして会話に入ってきます。その間もエージェント
（とあなた）は作業を続けられますし、すでに走っているジョブは、二重に発火させずに
「already running」と断られます。

`action="run"` に `prompt` を添えて、その回だけの文脈を注ぐこともできます。

```python
cronjob(action="run", job_id="...", prompt="CONTEXT: focus on the EU region today")
```

その文脈は、その 1 回の発火に限り、`## Run Context` という見出しの下でジョブの保存済みプロンプトへ
足されます。ジョブの定義へ残ることはなく、保存済みのプロンプトと同じプロンプトインジェクションの
検査を通ります。

切り離された結果を受け取れない実行環境（一度きりの `hermes -z`、CLI からの `hermes cron run`、
cron の子セッション、Kanban のワーカー）は、自動的に同期の実行へ切り替わります。

## cron ジョブが使えるツールセット {#toolsets-available-to-cron-jobs}

cron は、チャットのプラットフォームがひも付いていない新しいエージェントセッションで、ジョブをひとつずつ動かします。既定では、cron のエージェントは **`hermes tools` で `cron` のプラットフォーム向けに設定したツールセット**を受け取ります。CLI の既定でもなければ、ありったけでもありません。

```bash
hermes tools
# → pick the "cron" platform in the curses UI
# → toggle toolsets on/off just like you would for Telegram/Discord/etc.
```

ジョブごとのもっと細かい制御は、`cronjob.create` の `enabled_toolsets` のフィールド（既存のジョブなら `cronjob.update`）で行えます。

```text
cronjob(action="create", name="weekly-news-summary",
        schedule="every sunday 9am",
        enabled_toolsets=["web", "file"],      # just web + file, no terminal/browser/etc.
        prompt="Summarize this week's AI news: ...")
```

ジョブに `enabled_toolsets` が設定されていればそれが勝ち、無ければ `hermes tools` の cron プラットフォームの設定が勝ち、それも無ければ Hermes は組み込みの既定へ戻ります。cron プラットフォームのツールセットの設定がまったく読めない場合（たとえば `config.yaml` の `platform_toolsets` のブロックが壊れている場合）、実行は、すべてのツールを抱えたまま黙って走るのではなく、エラーを記録して失敗します。`hermes cron list` / `hermes cron doctor` を確かめてください。これは費用の管理に効きます。小さな「ニュースを取ってくる」ジョブのたびに `browser` や `delegation` を持ち歩くと、LLM の呼び出しのたびにツールスキーマのプロンプトが膨らみます。

ログインが要るサイトをジョブが操作する場合、そのログインは実行の前に済ませておく必要があります。予約された tick には、問いに答える人がいません。その用意については[予約実行と無人の実行](/hermes/docs/user-guide/features/browser/#scheduled-and-unattended-runs)で説明しています。

### エージェントをまるごと飛ばす: `wakeAgent` {#skipping-the-agent-entirely-wakeagent}

cron のジョブに事前チェックのスクリプト（`script=` でひも付けたもの）がある場合、そのスクリプトが実行時に、Hermes がそもそもエージェントを呼ぶべきかどうかを決められます。標準出力の最後の行として、次の形を出します。

```text
{"wakeAgent": false}
```

…すると cron は、この tick のエージェントの実行をまるごと飛ばします。状態が本当に変わったときだけ LLM を起こしたい、頻繁な監視（1〜5 分ごと）に便利です。そうしないと、中身の無いエージェントのターンに何度も費用を払うことになります。

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

#### レシピ: 安上がりな事前の関門 {#recipes-cheap-pre-run-gates}

`wakeAgent` の関門を使うと、予約したジョブに LLM のトークンを使わせるかどうかを 0 円で決められます。3 つの型で、たいていの用途はまかなえます。

**ファイル変更の関門** — 前回うまくいった tick 以降に、見張っているファイルへ新しい中身が入ったときだけ実行します。スケジューラーは各ジョブの `last_run_at` を記録しているので、それをファイルの mtime と比べます。

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

**外部フラグの関門** — ほかのプロセスが「準備できた」と合図したときだけ実行します（デプロイのフックがファイルを置く、CI のジョブが状態ストアへ値を書く、など）。

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

**SQL の件数の関門** — 自分のデータベースに処理すべき新しい行があるときだけ実行します。スクリプトは `context` で件数をエージェントへ渡せるので、エージェントは問い合わせ直さなくても、どれくらいの量を見ているのか分かります。

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

同じ型は、スクリプトから問い合わせられるどんなデータ源にも使えます。Postgres でも、HTTP の API でも、自分の状態ストアでも。cron の仕組みに SQL の評価器を組み込む必要はありません。

:::tip
Hermes 自身の `~/.hermes/state.db` は内部のスキーマで、リリースごとに変わります。事前の関門から問い合わせないでください。自分のデータベースやフィードを見るようにしてください。
:::

謝辞: このレシピ集は、@iankar8 さんが [#2654](https://github.com/NousResearch/hermes-agent/pull/2654) で試した探索がきっかけです。そこでは sql / file / command のトリガーを別の仕組みとして足すことが提案されていました。`script` と `wakeAgent` の関門が 3 つとも 0 円でまかなえていたので、この作業はドキュメントとして着地しました。

### ジョブをつなぐ: `context_from` {#chaining-jobs-contextfrom}

cron のジョブは、ほかの 1 つ以上のジョブの直近の成功した出力を、`context_from` に名前（または ID）を並べることで取り込めます。

```text
cronjob(action="create", name="daily-digest",
        schedule="every day 7am",
        context_from=["ai-news-fetch", "github-prs-fetch"],
        prompt="Write the daily digest using the outputs above.")
```

挙げたジョブの直近の完了した出力が、この実行のプロンプトの上に文脈として差し込まれます。上流の項目は、それぞれ有効なジョブ ID か名前でなければなりません（`cronjob action="list"` を参照）。注意: つなぎ込みが読むのは*直近の完了した*出力です。同じ tick で走っている上流のジョブを待つことはありません。

## ジョブの保存先 {#job-storage}

ジョブは `~/.hermes/cron/jobs.json` に保存されます。実行の出力は `~/.hermes/cron/output/{job_id}/{timestamp}.md` へ保存されます。

ジョブの定義は、ディスク上のただの JSON です。`hermes update`、ゲートウェイの再起動、マシンの再起動を越えて残ります。再起動のときに実行中だったジョブは、実行の台帳で `unknown` と記録されます。自動で再試行はされませんが、そのジョブの次の予定の tick は普通に発火します。詳しくは[実行の履歴](#execution-history)を参照してください。

:::tip
ジョブの管理は、`jobs.json` を直接いじるのではなく、`cronjob` ツール、`hermes cron edit`、`/cron` を通じてエージェントに頼んでください。直接の編集は、[ファイル書き込みの安全装置](/hermes/docs/user-guide/security/#file-write-safety)がそのパスを止めたとき（`HERMES_WRITE_SAFE_ROOT` を設定している場合など）に黙って失敗することがあり、[ファイル変更の検証](/hermes/docs/user-guide/configuration/#file-mutation-verifier)のフッターが、何も保存されなかったことを示す正式な信号になります。
:::

ジョブは `model` と `provider` を `null` として保存することがあります。これらが省かれている場合、Hermes は実行のときにグローバルな設定から解決します。ジョブの記録に現れるのは、ジョブごとの上書きが設定されているときだけです。

保存には原子的なファイル書き込みを使うので、書き込みが中断されても、途中まで書かれたジョブのファイルが残ることはありません。

## 自己完結したプロンプトは、いまも大事です {#self-contained-prompts-still-matter}

:::warning 重要
cron のジョブは、まったく新しいエージェントセッションで動きます。ひも付けたスキルが渡してくれないものは、すべてプロンプトに書いてください。
:::

**悪い例:** `"Check on that server issue"`

**良い例:** `"SSH into server 192.168.1.100 as user 'deploy', check if nginx is running with 'systemctl status nginx', and verify https://example.com returns HTTP 200."`

## セキュリティ {#security}

予約タスクのプロンプトは、作成のときと更新のときに、プロンプトインジェクションと認証情報の持ち出しのパターンについて検査されます。見えない Unicode の細工、SSH のバックドアを仕込もうとするもの、あからさまな秘密情報の持ち出しを含むプロンプトはブロックされます。
