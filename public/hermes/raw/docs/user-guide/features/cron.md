---
title: "定期タスク（Cron）"
description: "自然な言葉で定期タスクを組み、ひとつの cron ツールで管理し、スキルをいくつでも付けられます"
upstream_path: user-guide/features/cron.md
upstream_blob: e9a24600c1febb89d6b420e1f2bc92832c221c6c
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/cron
---

# 定期タスク（Cron） {#scheduled-tasks-cron}

自然な言葉か cron 式で、タスクを自動で走らせる予定を組めます。Hermes では、予定の作成・一覧・削除がそれぞれ別のツールに分かれておらず、`cronjob` というひとつのツールに動作を指定する形でまとまっています。

## いまの cron でできること {#what-cron-can-do-now}

cron ジョブでできるのは次のことです。

- 1 回きり、または繰り返しのタスクを予定に入れる
- ジョブを一時停止、再開、編集、手動実行、削除する
- ジョブにスキルを 0 個、1 個、あるいは複数付ける
- 結果を、作成元のチャット、ローカルのファイル、設定済みのプラットフォームへ返す
- ふつうの静的なツール一覧を持った、まっさらなエージェントのセッションで走らせる
- **エージェントなしモード** で走らせる。予定どおりにスクリプトを動かし、その標準出力をそのまま届けるだけで、LLM はいっさい関わりません（下の[エージェントなしモード](#no-agent-mode-script-only-jobs)の節を見てください）

これらはすべて `cronjob` ツールを通して Hermes 自身も使えるので、ふつうの言葉で頼むだけでジョブを作る・止める・直す・消すができます。CLI は要りません。

:::tip
**cron ジョブはどのモデルで動くのか。** 発火のときの決まり方は、ジョブごとの指定 → `config.yaml` の `cron.model` → `hermes model` で決めた全体の既定値、の順です。

- **ジョブごとの指定** — *あなた* がダッシュボード、`hermes cron create/edit --model … --provider …`、あるいは `~/.hermes/cron/jobs.json` の編集で決めます。一度決めたら、変えるまでそのままです。エージェントの `cronjob` ツールからジョブごとのモデルを決めたり変えたりはできません。推論の指定は利用者のものです。
- **`cron.model` / `cron.model_provider`** — cron の群れ全体の既定値です。指定のないジョブはすべてこのモデルで動き、チャットで使っているモデルとは切り離されます。一度設定しておけば（`hermes config set cron.model <name>`）、`hermes model` や `/model` でチャット側のモデルを変えても cron の群れには手が触れません。
- **全体の既定値** — 上のどちらも設定されていないときだけ、ジョブは `hermes model` に従います。この場合 Hermes は作成時のプロバイダーとモデルを **控えておき**、あとで全体の既定値が変わるとジョブは **安全側に倒れて止まります**。その回は走らせず、推論の呼び出しもせず、**一度だけ** 知らせます。以後のティックでもそのジョブは黙って飛ばされたままで、あなたが手を打つか設定が元に戻るまで続きます（#44585）。繰り返すジョブや、また走らせたいジョブは、プロバイダーとモデルをはっきり指定してください（`hermes cron edit <job_id> --provider <provider> --model <model>`）。使い切った 1 回きりのジョブは更新できないので、その場合はプロバイダーとモデルを明記した新しい 1 回きりのジョブを作ってください。こうしておけば、目の届かないところで動くジョブが、有料のプロバイダーやモデルへの切り替えを黙って引き継いでしまうことがありません。`cron.model`（またはジョブごとの指定）を設定するのが、cron にかかる費用を意図して振り分けるやり方で、それでカバーされている軸には、このずれ防止は働きません。指定のないジョブに、変わっていく全体の既定値をあえて追わせたい場合は、[ずれ防止を無効にする](#letting-unpinned-jobs-track-global-defaults)こともできます。

どのプロバイダーに決まったとしても、そのプロバイダー向けの要求設定（独自プロバイダーの `extra_body`／`extra_headers` といった `request_overrides` など）は、対話中のセッションと同じように、予定された実行にも引き継がれます。

`hermes setup --portal` は、OAuth の更新が自動なので、目を離して走らせるにはいちばん手間がかかりません。[Nous Portal](/hermes/docs/integrations/nous-portal/) を見てください。
:::

:::tip
**ジョブごとの思考の深さ。** ジョブは、モデルの指定とは別に、思考の深さを自分で決められます。`none`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max`、`ultra` のどれかです。指定すると、そのジョブの実行では全体の `agent.reasoning_effort` も、モデルごとの `agent.reasoning_overrides` も上書きします（`none` は思考をオフにします）。`hermes cron create/edit --reasoning-effort high` のように指定し、編集で空文字を渡せば指定が外れて設定に従うようになります。（これはあえてエージェントの `cronjob` ツールには出していません。モデルまわりの設定は利用者が決めることだからです。）モデルが対応していない深さは、要求のときにプロバイダー側で丸められるか外されます。`high` が上限のモデルに `xhigh` を指定すれば `high` で動きます。この指定は `no_agent` のジョブには効きません（調整すべき LLM の呼び出しがそもそもありません）。重い分析だけ `high` で走らせ、安く済ませたい定期ジョブは `minimal` にする、といった使い分けが、全体の既定値に触らずにできます。
:::

:::warning
cron から動いたセッションが、さらに cron ジョブを作ることはできません。予定が際限なく増える輪ができないよう、Hermes は cron の実行中には cron 管理のツールを止めています。
:::

## 定期タスクを作る {#creating-scheduled-tasks}

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

### ふつうの会話で {#through-natural-conversation}

いつもどおり Hermes に頼んでください。

```text
Every morning at 9am, check Hacker News for AI news and send me a summary on Telegram.
```

Hermes は裏で、ひとつにまとまった `cronjob` ツールを使います。

## 実行前の設定チェック {#pre-dispatch-configuration-validation}

予定された実行のためにエージェントの支度を始める前に、スケジューラは、その
ジョブの設定でちゃんと実行できるのかを確かめます。

- プロバイダーの API キーが解決できること（`fallback_providers` の連なりが
  設定されているときは飛ばします。主キーが無くても控えの経路で助かることが
  あるからです）、
- 付いているスキルが使える状態にあること（必要な環境変数、コマンド、
  認証情報のファイルが欠けていないこと）、
- 届け先のプラットフォームが分かっていて、ゲートウェイの認証情報が
  設定されていること（`local`／`origin` の届け先は確認しません）。

チェックに落ちると、そのジョブの `last_status` は `blocked_config` になり、
知らせは 1 回だけ届き（ティックのたびに繰り返しません）、**LLM の呼び出しは
起きません**。設定を間違えたジョブがトークンを使うことはありません。次に
健全に走った時点でこの状態は解除されるので、あとでまた設定が壊れれば
改めて知らせが届きます。

このチェックを止めて以前の動き（そのまま走らせて、実行の途中で失敗する）に
戻すには、次のようにします。

```yaml
cron:
  preflight: false
```

あるいは `hermes config set cron.preflight false` でも同じです。

## 固定していないジョブに全体の既定値を追わせる {#letting-unpinned-jobs-track-global-defaults}

モデル・プロバイダーのずれ防止は、既定で有効です。固定していない cron ジョブに、
全体のモデルやプロバイダーの変更をあえて全部追わせたいなら、`config.yaml` で
無効にしてください。

```yaml
cron:
  model_drift_guard: false
```

設定コマンドを使ってもかまいません。

```bash
hermes config set cron.model_drift_guard false
```

これで、実行時の差し止めと、全体の推論設定が変わったときの警告の両方が止まり
ます。控えてある内容はそのまま残るので、`true` に戻せばジョブを作り直さなくても
守りが戻ります。

:::warning
この守りを外すと、目の届かないところで動く未固定のジョブは、変わった全体の
既定値をすぐに引き継ぎます。有料のプロバイダーやモデルに切り替えると、予定された
実行のたびにお金がかかることになります。
:::

## スキルを使う cron ジョブ {#skill-backed-cron-jobs}

cron ジョブは、プロンプトを走らせる前にスキルをひとつ以上読み込めます。

### スキルをひとつ {#single-skill}

```python
cronjob(
    action="create",
    skill="blogwatcher",
    prompt="Check the configured feeds and summarize anything new.",
    schedule="0 9 * * *",
    name="Morning feeds",
)
```

### スキルを複数 {#multiple-skills}

スキルは書いた順に読み込まれます。プロンプトは、それらのスキルの上に重ねる作業の指示になります。

```python
cronjob(
    action="create",
    skills=["blogwatcher", "maps"],
    prompt="Look for new local events and interesting nearby places, then combine them into one short brief.",
    schedule="every 6h",
    name="Local brief",
)
```

使い回しのきく手順を、cron のプロンプトにスキルの本文ごと貼り付けずに、予定されたエージェントへ引き継がせたいときに便利です。

## プロジェクトのディレクトリの中でジョブを動かす {#running-a-job-inside-a-project-directory}

cron ジョブは既定では、どのリポジトリからも切り離して動きます。`AGENTS.md`、`CLAUDE.md`、`.cursorrules` は読み込まれず、端末・ファイル・コード実行のツールは、ゲートウェイが起動したときの作業ディレクトリから動きます。これを変えるには、`--workdir`（CLI）か `workdir=`（ツール呼び出し）を渡してください。

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

`workdir` を指定すると、こうなります。

- そのディレクトリの `AGENTS.md`、`CLAUDE.md`、`.cursorrules` がシステムプロンプトに差し込まれます（探す順番は対話中の CLI と同じです）
- `terminal`、`read_file`、`write_file`、`patch`、`search_files`、`execute_code` はすべて、そのディレクトリを作業ディレクトリとして動きます
- 指定する場所は、実在する絶対パスのディレクトリでなければなりません。相対パスや存在しないディレクトリは、作成・更新の時点ではねられます
- 編集のときに `--workdir ""`（ツールなら `workdir=""`）を渡すと指定が消え、元の動きに戻ります

:::note 分離
エージェントの実行はそれぞれ、自分の `workdir` をその実行だけのタスク識別子に結び付けます。ですから workdir を持つジョブも、プロセス全体の端末の状態を書き換えたり、同時に走っている実行のあいだでパスが漏れたりすることなく、ふつうの並列の枠を使います。cron の同時実行数そのものを抑えたいときは `cron.max_parallel_jobs` を設定してください。
:::

## ジョブを編集する {#editing-jobs}

中身を変えたいだけなら、ジョブを消して作り直す必要はありません。

:::tip ジョブの指し方
以下（および[ジョブの一生を操作する](#lifecycle-actions)）に出てくる `<job_id>` の部分には、ジョブの名前も書けます（大文字小文字は区別しません）。16 進数の ID は思い出せないけれど `morning-digest` なら覚えている、というときに便利です。ID がぴたりと一致すればそちらが優先されます。ID ではなく、名前が複数のジョブに当てはまるときは、コマンドは実行を断り、候補の ID を並べて示すので、どれなのかを選べます。
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

覚えておきたいこと。

- `--skill` を並べて書くと、そのジョブに付いているスキルの一覧を置き換えます
- `--add-skill` は、いまの一覧を置き換えずに後ろへ足します
- `--remove-skill` は、指定したスキルだけを外します
- `--clear-skills` は、付いているスキルをすべて外します

## ジョブの一生を操作する {#lifecycle-actions}

cron ジョブには、作る・消すだけではない、もっと幅のある操作がそろっています。

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

それぞれの意味はこうです。

- `pause` — ジョブは残したまま、予定に入れるのをやめます
- `resume` — ジョブを再び有効にし、次の実行時刻を計算し直します
- `run` — 次のスケジューラのティックでそのジョブを走らせます
- `remove` — まるごと消します
- `edit` — 予定、プロンプト、届け先などを変えます

**名前でも指せます。** 中身を変える 4 つの操作（`pause`、`resume`、`run`、`remove`、`edit`）と、エージェントの `cronjob` ツールは、16 進数の ID の代わりにジョブの **名前** も受け付けます（大文字小文字は区別しません）。エージェントも CLI も、ID がぴたりと一致するものがあればそちらを優先します。名前が複数のジョブに当てはまる場合は、候補の ID を全部並べたうえで実行を断るので、こちらではっきり選べます。名前は一意ではないので、この守りは効いています。同じ名前のジョブが 2 つあるときに、黙って違うほうを書き換えてしまうのを防ぎます。

## エージェントに予定を任せる（cron ジョブが cron ジョブを扱う） {#agent-managed-scheduling-cron-jobs-that-manage-cron-jobs}

既定では、スケジューラ *から* 立ち上がったエージェントは `cronjob` ツールを
使えません。予定されたジョブが、ほかのジョブを作ったり直したり消したりは
できないということです。使いたいときは `config.yaml` で明示します。

```yaml
cron:
  allow_agent_scheduling: true   # default: false
```

有効にすると、予定されたエージェントも、チャットのセッションと同じように
cron の一覧を扱えます。予定された作業の中から後続の 1 回きりのジョブを組んだり、
自分の実行間隔を調整したり、一覧全体を整える「cron の司書」のようなジョブを
走らせたり（まず一覧を見て、必要に応じて更新・削除・作成する）といったことです。
これが荒れないよう、2 つの性質があります。

- **一覧は平らなひとつで、持ち主は利用者です。** cron の実行から作られた
  ジョブも、ほかのジョブと同じ `jobs.json` に、特別な所有権なしで入ります。
  自分で作ったものとまったく同じように、一覧に出し、直し、消せます。
- **宙に浮いた届け先は生まれません。** cron の実行はその場限りなので、その中から
  の `deliver: origin` は、**作成の時点で** 作った側のジョブの具体的な届け先
  （`platform:chat_id[:thread_id]`、作った側がどこにも届けないなら `local`）に
  解決されます。予定されたエージェントが作ったジョブが、もう存在しない
  セッションへ出力を向けてしまうことはありません。はっきり書かれた届け先
  （`local`、`all`、`telegram:<chat_id>`）はそのまま尊重されます。

実行のたびに新しいジョブを作るようなプロンプトより、既にあるジョブを更新する
プロンプト（まず一覧を見て、ID で更新する）のほうがおすすめです。

## しくみ {#how-it-works}

**cron の実行はゲートウェイの常駐プロセスが受け持ちます。** ゲートウェイは 60 秒ごとにスケジューラを叩き、時間になったジョブを切り離されたエージェントのセッションで走らせます。

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
2. `next_run_at` を現在時刻と見比べる
3. 時間になったジョブごとに、まっさらな `AIAgent` のセッションを始める
4. 必要なら、そのまっさらなセッションに付いているスキルを読み込ませる
5. プロンプトを最後まで走らせる
6. 最終の返答を届ける
7. 実行の記録と、次の予定時刻を更新する

`~/.hermes/cron/.tick.lock` のファイルロックがあるので、スケジューラのティックが重なって同じジョブの束を二重に走らせることはありません。

### 実行の履歴 {#execution-history}

Hermes は、実行役やプロバイダーへ渡す前に、確保した cron の試行をプロファイル
ごとの `~/.hermes/cron/executions.db` に記録します。試行は `claimed`、
`running` を経て、あとから変わらない終わりの状態のいずれかへ進みます。
`completed`、`failed`、`unknown` です。再起動のあと、放り出された試行を
Hermes が `unknown` と印を付けるのは、元の PID とプロセス起動の指紋から、
その持ち主がもういないと確かめられたときだけです。不明として残った試行は
記録でしかなく、自動で走り直すことはありません。

最近の試行は `hermes cron runs [job-id] --limit 20`（別名は `history`）で
見られます。終わった履歴には上限がありますが、まだ動いている試行が消される
ことはありません。この台帳は、手早いバックアップにも含まれます。

### 失敗が続いたときの見直しの合図 {#repeated-failure-review-nudge}

ジョブはそれぞれ `failure_streak` を持っています。続けて失敗した回数です
（配信の失敗は数えません）。エージェントに届く前に失敗した実行も——更新が
中途半端で読み込みに失敗した、プロバイダーのクライアントが組み立てられない
——エージェント自身が失敗した場合と同じように数え、同じように知らせます。
*繰り返す* ジョブでこの回数がしきい値に届くと、チャットへ届く失敗の知らせに、
見直しをうながす一文が付きます。何回続けて失敗しているかを伝え、直すか、
止めるか（`hermes cron pause <job>`）、消すかをすすめる内容です。一度でも
成功すれば回数は 0 に戻り、`hermes cron list` では失敗したジョブの前回の実行と
並べてこの回数が出ます。1 回きりのジョブでは、この合図は出ません。

```yaml
cron:
  failure_nudge_threshold: 3   # default; 0 disables the nudge
```

### 失敗の記録：わかっている失敗に印を付ける {#failure-incidents-acknowledge-a-known-failure}

*同じ* エラーで失敗し続ける繰り返しのジョブは、実行のたびにあなたを呼び出します。
失敗はそのつど、消えない **記録** としても残ります。ジョブと、エラー文を
そろえた形にした署名を組にした鍵で、実行の履歴と同じプロファイルごとの台帳
データベースに入ります。

```bash
hermes cron incidents                 # list incidents (newest activity first)
hermes cron incidents --state alerted # filter: detected | alerted | closed
hermes cron incidents ack <id>        # acknowledge — stop re-pinging
```

記録に印を付けると、その署名にぴたりと当てはまる失敗の呼び出しだけが黙ります。
ほかは何も変わりません。実行の履歴には失敗が残り続け、連続失敗の回数も
数え続け、*違う* エラーで失敗し始めた瞬間に新しい記録が生まれて、また
知らせが飛びます。成功しても記録には触れません。これはジョブ単位ではなく、
署名ごとのものだからです。

記録の移り変わりは、`detected`（失敗が記録された）→ `alerted`（失敗の
呼び出しが少なくとも 1 回は届いた）→ `closed`（印が付いた。その署名としては
そこで終わり）です。しまわれるエラー文は、書き込む前に秘密を伏せ、長さを
切り詰めます。

記録は常に取られていて、放っておくぶんには何も起きません。あなたが自分で
`ack` するまで、呼び出しが抑えられることはありません。

### 全ジョブの健康診断：`hermes cron doctor` {#fleet-health-check-hermes-cron-doctor}

`hermes cron doctor` は、動いているすべてのジョブを読むだけで確かめる健康診断
です。ジョブごとに気になる点をまとめて出し、手を打つべきことが見つかれば
`1` で終わります（問題なければ `0`）。ですから、端末からでも、見張り用の
スクリプトからでも、CI のような疎通確認からでも使えます。

```bash
hermes cron doctor
```

動いているジョブごとに、次を見ます。

- 前回の実行が失敗している（`last_status` が ok ではなく、記録されたエラーも出ます）、
- 前回の配信が失敗している（出力はできたのに、あなたのところへ届かなかった）、
- `next_run_at` が無い、あるいは 15 分の余裕を超えて過去に置き去りになっている
  ——「黙って発火しなくなっている」合図です（スケジューラが死んでいる、
  ゲートウェイが落ちている、発火の確保が引っかかっている）、
- スクリプトが無い、ファイルではない、`HERMES_HOME/scripts` の外を指している、
- `no_agent` のジョブなのにスクリプトが無い、
- 設定された `workdir` が、もう存在しない。

doctor がジョブや状態を書き換えることはありません。報告するだけです。
引っかかったジョブを掘るときは、`hermes cron incidents`（消えない失敗の記録）と
`hermes cron runs`（試行の台帳）と組み合わせて使ってください。

## 届け先の選び方 {#delivery-options}

ジョブを予定に入れるとき、出力をどこへ出すかを指定します。

| 指定 | 説明 | 例 |
|--------|-------------|---------|
| `"origin"` | ジョブを作った場所へ返す | メッセージ系プラットフォームでの既定 |
| `"local"` | ローカルのファイルに保存するだけ（`~/.hermes/cron/output/`） | CLI での既定 |
| `"telegram"` | Telegram のホームチャンネル | `TELEGRAM_HOME_CHANNEL` を使います |
| `"telegram:123456"` | ID で指定した Telegram のチャット | 直接届けます |
| `"telegram:-100123:17585"` | 指定した Telegram のトピック | `chat_id:thread_id` の形 |
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
| `"feishu"` | Feishu／Lark | |
| `"wecom"` | WeCom | |
| `"weixin"` | Weixin（WeChat） | |
| `"bluebubbles"` | BlueBubbles（iMessage） | |
| `"qqbot"` | QQ Bot（Tencent QQ） | |
| `"bot-chat"` | このプロファイルの正規の Bot Chat。ボットが出力を読んで返事をします | この端末の中 |
| `"bot-chat:research"` | 同じ端末の別プロファイルの Bot Chat | 作成時に確かめます |
| `"all"` | つながっているホームチャンネルすべてへ配ります | 発火のときに解決します |
| `"telegram,discord"` | 指定した組のチャンネルへ配ります | カンマ区切りの並び |
| `"origin,all"` | 作成元 **と**、つながっているほかのチャンネル全部へ届けます | どの指定も組み合わせられます |

エージェントの最終の返答は、設定した `deliver:` の届け先へ自動で届きます。エージェントが自分でメッセージを送るわけではないので、cron のプロンプトの中で何かを呼び出す必要はありません。

### 配信の失敗は別の状態として扱う {#delivery-failures-are-a-distinct-status}

実行と配信は別々に記録されます。エージェントの実行はうまくいったのに出力が
届かなかったとき（プラットフォームの 5xx、流量制限、古くなったセッション、
送れた確かな証拠を返さないアダプタ）、そのジョブには `last_status:
delivery_failed` が残ります。ただの `ok` にはなりません。理由は
`last_delivery_error` に入ります。`hermes cron list` は黄色で
`delivery_failed: <reason>` と出し、`hermes cron doctor` は配信の問題として
報告し、手動の `cronjob run` は配信のエラーを添えて `success: false` を返します。
配信の失敗は、そのジョブの `failure_streak` には数えません（エージェントは
仕事をしたからです）。次に完全にうまくいった実行で、状態は `ok` に戻ります。

### Bot Chat への配信（`bot-chat`） {#bot-chat-delivery-bot-chat}

`bot-chat` は、出力を **そのプロファイルの正規の「Bot Chat」セッションへ、本物のメッセージとして** 届けます。ほかの届け先では、受け取るのはチャンネルを読む人ですが、ここでは受け取るのはボット自身です。ボットは出力を届いたメッセージとして受け取り、手を打つべきことがあれば動き、自分のチャットで返事をします。予定された出力を、ただ貼るのではなく *処理してほしい* ときに使ってください。

- `bot-chat`（単独）は、そのジョブ自身のプロファイルを指します。
- `bot-chat:<profile>` は、**同じ端末の** 別プロファイルを指します。名前はジョブを作るときに `hermes profile list` と突き合わせて確かめます。ほかのゲートウェイや別の端末のプロファイルは指しようがないので、端末をまたいで同じ名前があっても取り違えは起きません。
- 1 回の配信につき、届け先のボットはエージェントのターンをまるごと 1 回使います。実行の間隔には気を付けてください。
- ほかの届け先と組み合わせられますが（`bot-chat,telegram`）、`all` には決して含まれません。

### 送り先のまとめ指定（`all`） {#routing-intent-all}

`all` を使うと、ひとつの cron ジョブの結果を、設定済みのメッセージ系チャンネル全部へ、名前を並べずに送れます。これは **発火のときに解決される** ので、Telegram をつなぐ前に作ったジョブでも、`TELEGRAM_HOME_CHANNEL` を設定すれば次のティックから Telegram を拾います。

意味あいはこうです。`all` は、ホームチャンネルが設定されているプラットフォームすべてに広がります。0 個でもかまいません。その場合、そのジョブは届け先を持たないだけで、上流では配信の失敗として記録されます。

`all` は、はっきり書いた届け先と組み合わせられます。`origin,all` は、作成元のチャット *と*、つながっているほかのホームチャンネル全部へ届け、`(platform, chat_id, thread_id)` が同じものは重複を取り除きます。

### Telegram の cron 用トピック（`TELEGRAM_CRON_THREAD_ID`） {#telegram-cron-topic-telegramcronthreadid}

Telegram のトピックモードが有効なとき、いちばん上の DM はシステム用の玄関として空けてあります。そこへ返信すると玄関だと知らせて押し返され、`reply_to_message_id` も落とされるので、メインのチャットに届いた cron のメッセージには返信できません。

代わりに、cron 専用のフォーラムのトピックを向けてください。

1. Telegram でボットの DM を開き、たとえば `Cron` という名前のトピックを作ります。トピックの見出しを長押しして **リンクをコピー** すると、末尾の整数がそのトピックの `message_thread_id` です。
2. `.env` に `TELEGRAM_CRON_THREAD_ID=<that id>` を書きます。

これは cron の配信にだけ効きます。`TELEGRAM_HOME_CHANNEL_THREAD_ID`（再起動の知らせなど、ほかの場面で使うもの）は変わりません。はっきり書いた `deliver="telegram:chat_id:thread_id"` は、これまでどおり環境変数より優先されます。cron のメッセージへの返信は、いまあるトピックのセッションに届くので、そのまま話を続けられます。

### 返答の包み {#response-wrapping}

既定では、届く cron の出力には前後に一言が付き、受け取った側が定期タスクからのものだと分かるようになっています。

```
Cronjob Response: Morning feeds
-------------

<agent output here>

Note: The agent cannot see this message, and therefore cannot respond to it.
```

包みなしでエージェントの出力をそのまま届けたいときは、`cron.wrap_response` を `false` にしてください。

```yaml
# ~/.hermes/config.yaml
cron:
  wrap_response: false
```

### プッシュ通知（`cron.delivery.notify`） {#push-notifications-crondeliverynotify}

cron の出力は途中経過ではなく *最終の* 配信なので、既定ではプラットフォームの
通知フラグを立てて送ります。Telegram では、アダプタの通知モードが `important`
のとき（ふだんは `disable_notification=true` で送るモードで、これだと利用者から
「まとめが届かない」と言われがちです）でも、まとめがプッシュを鳴らすという
ことです。音を立てない配信に戻すには、こうします。

```yaml
# ~/.hermes/config.yaml
cron:
  delivery:
    notify: false   # default: true
```

このフラグは本文の送信にも、付いてくるメディアにも同じように効くので、片方だけ
鳴って片方は静か、ということは起きません。

### 配信の確認と `UNVERIFIED` の状態 {#delivery-confirmation-and-the-unverified-state}

つながっているアダプタ経由の配信が「届いた」と記録されるのは、アダプタから
はっきりした証拠が返ったときだけです。ふるい落としによる取りやめ
（`delivered: false`）ではない `success` に加えて、`message_id` か
`raw_response` があること、が条件です。`success` はあるのにどちらの証拠も
無い返り——Slack、Matrix、Mattermost のアダプタが返す形です——も受け入れは
します（失敗した証拠でもないからです）が、その実行はジョブに
`last_delivery_unverified` として記録され、`hermes cron list` に出ます。

```
⚠ Delivery UNVERIFIED: adapter acked slack:C0123456 without message_id/raw_response
```

`hermes cron doctor` では `last delivery unverified (...)` と出ます。この印は、
証拠付きで配信できた次の実行で消えます。中身が空（本文もメディアも無い）のもの
がアダプタへ渡ることはありません。安全側に倒れて失敗となり、届いたとは記録されず
`last_delivery_error` に理由が入ります。

### 続きを話せるジョブ（cron の配信に返信する） {#continuable-jobs-reply-to-a-cron-delivery}

既定では、cron の配信は送りっぱなしです。メッセージは送られますが、そのチャットの
会話の履歴には残らないので、あなたが返信してもエージェントには自分が何と言ったかの
記録がありません。ジョブを **続きを話せる** 設定にすると、届いたまとめは返信できる
会話になります。エージェントはまとめを手元に持った状態なので、「タスク #2 って
何のこと？」と聞き返すことがなくなります。

これは任意で、**既定はオフ** です。設定で全体に効かせるか、`cronjob` ツールの
`attach_to_session` でジョブごとに指定してください（後者はそのジョブについて
全体の設定を上書きします）。

```yaml
# ~/.hermes/config.yaml
cron:
  mirror_delivery: false   # set true to make cron deliveries continuable
```

動きは **スレッドがあればスレッドを優先** で、そのジョブ自身の会話の中に限られます。

- **スレッドが使えるプラットフォーム**（Telegram のトピック、Discord や Slack の
  スレッド）では、配信ごとに専用のスレッドが開き、まとめがそのスレッドのセッションに
  差し込まれます。ですからスレッド内で返信すれば、そのまま文脈を保って続けられます。
  繰り返すジョブ（毎日のまとめなど）は実行ごとに新しいスレッドを開くので、配信ごとの
  やり取りが混ざりません。
- **DM しかないプラットフォーム**（WhatsApp、Signal、SMS）にはスレッドが無いので、
  まとめは作成元の DM のセッションに写されます。DM そのものが続きの場になります。

触れるのは、そのジョブ **自身の会話** だけです。

- そのジョブが作られた **作成元のチャット**、
- `deliver: origin` が作成元を捕まえられなかったときの **ホームチャンネルへの
  代替**（生きているゲートウェイのチャットからではなく、スクリプトや API から
  作られたジョブの場合）。利用者の主な会話が作成元の代わりを務めます、
- ジョブに **はっきり書かれた `platform:chat` の届け先がひとつだけ** の場合。
  ただしこれは、ジョブ自身が `attach_to_session: true` で選んだときに限ります。
  その届け先を会話とみなすと、ジョブの書き手が宣言したということです。全体の
  `mirror_delivery` だけでは、名指しされたチャットが続きを話せるようにはなりません。

一斉配信・拡散の届け先（`all`、プラットフォーム名だけのホームチャンネル）が
続きを話せるようになることはありません。写しは、目印を付けた利用者側の発言
（`[Cron delivery: <task name>]`）として書かれるので、どのモデルのプロバイダーでも
会話の交互の並びが崩れません。

#### チャンネルに平置きで続ける（Slack） {#flat-in-channel-continuation-slack}

上のスレッド優先の動きでは、配信のたびに専用のスレッドができます。続きを話せる
ジョブを、スレッドではなく **チャンネルの流れに平置きで** 届けたいなら、Slack の
**続きの場** を `in_channel` にしてください。

```yaml
# ~/.hermes/config.yaml
slack:
  cron_continuable_surface: in_channel   # default: thread
  reply_in_thread: false                 # required pairing (see below)
  require_mention: false                 # so a plain reply continues the job
```

`in_channel` では、まとめはふつうのチャンネルの投稿として届き（スレッドは開きません）、
あなたの返信は、そのチャンネル共通のセッションを通してジョブの続きになります。
ここでは 3 つの設定が組になって働きます。

- **`cron_continuable_surface: in_channel`** — 配信のときにスレッドを作りません。
- **`reply_in_thread: false`**（必須） — ボットの返事をチャンネルに *平置き* にし、
  まとめが差し込まれたのと同じ、チャンネル全体のセッションに結び付けます。これが
  無くても続き自体は働きますが、返事はスレッドに届きます（安全にスレッド式の続きへ
  落ちるだけで、返信が消えることはありません。食い違いに気付けるよう、ゲートウェイは
  起動時に警告を出します）。
- **`require_mention: false`**（またはそのチャンネルを `free_response_channels` に
  加える） — ふつうのメッセージで返信できるようにするためです。そうしないと、返信の
  たびに `@` で呼ばないとボットが起きません。

続きの場がチャンネル **全体** のセッションなので、そこは共有です。チャンネル内の
ほかの雑談も、2 つ目の平置きの続きジョブも、同じ流れの会話に混ざります。これは
「チャンネルに平置き」であることそのものから来るもので、`reply_in_thread: false`
を選んだ人がすでに受け入れているのと同じ引き換えです。配信ごとのやり取りを分けたい
なら、既定の `thread` のままにしてください。

これはいまのところ Slack の機能です。ほかのプラットフォームもこのキーは受け付けますが、
`thread` の場に落ちます（続きのしくみが違うためです）。選び方はプラットフォームごとで、
それぞれの設定の下に書きます。これはゲートウェイ側の設定なので、`/restart` で読み直され、
Slack アプリを入れ直す必要はありません。

:::note 1 対 1 の DM
`cron_continuable_surface` は **チャンネル** の設定です。1 対 1 の DM には
スレッドか流れかという分かれ道がそもそも無い（DM はもともと平置きです）ので、
このキーは効きません。DM での cron の配信が続きを話せるかどうかを決めるのは、
別にある以前からの設定 **`slack.dm_top_level_threads_as_sessions`** です。

- **`false`** — いちばん上の DM はすべてひとつの流れのセッションを共有するので、
  続きを話せる cron のまとめとあなたの返信は **同じ** セッションに入り、ジョブは
  文脈を保って続きます。DM で続きを話せる cron を使いたいなら、これです。
- **`true`**（既定） — いちばん上の DM は 1 通ごとに別のセッションになるので、
  届いたまとめに返信すると、そのまとめを知らない *まっさらな* セッションが始まります。
  このやり方では続きは働きません（cron でも、ほかの平置きの配信でも同じです）。

ですから、1 対 1 の DM に届く続きを話せる cron ジョブを使うなら、
`slack.dm_top_level_threads_as_sessions: false` にしてください。DM では
`cron_continuable_surface` は要りません（書いても無視されます）。
:::

### 黙らせる {#silent-suppression}

エージェントの最終の返答に `[SILENT]` が含まれていると、配信はまるごと止まります。出力は記録のためにローカルには残りますが（`~/.hermes/cron/output/`）、届け先には何も送られません。

何かおかしいときだけ知らせてほしい見張りのジョブに向いています。

```text
Check if nginx is running. If everything is healthy, respond with only [SILENT].
Otherwise, report the issue.
```

失敗したジョブは `[SILENT]` の印があっても必ず届きます。黙らせられるのは成功した実行だけです。静かな見張りのジョブにしたいなら、知らせることが何も無いときは `[SILENT]` だけを返すようにエージェントへ頼んでください。

## スクリプトの制限時間 {#script-timeout}

実行前のスクリプト（`script` の引数で付けるもの）には、既定で 3600 秒（1 時間）の制限時間があります。これが縛るのは **スクリプトだけ** です。スキルを使うジョブや LLM が動かすジョブは、別に無応答の持ち時間があり、この値では縛られません。スクリプトの制限を変えたいときは、こうします。

```yaml
# ~/.hermes/config.yaml
cron:
  script_timeout_seconds: 1800   # 30 minutes
```

環境変数 `HERMES_CRON_SCRIPT_TIMEOUT` でも設定できます。決まる順番は、環境変数 → config.yaml → 既定の 3600 秒です。

cron は、実行後のセッションとエージェントの後片付けにも制限を掛けます。これは LLM のターンが返ったあとに起きることなので、無応答の制限時間とは別ものです。既定は後片付けの処理ひとつにつき 10 秒です。保存まわりやクライアントの終了処理が返ってこなくなった場合、スケジューラはエラーを記録し、そのジョブの実行中の印を外して、あとの実行が動けるようにします。そのジョブが永久に飛ばされ続けることはありません。

```yaml
# ~/.hermes/config.yaml
cron:
  cleanup_timeout_seconds: 10
```

`cleanup_timeout_seconds: 0` は、制限なしだった昔の動きに戻すためだけに使ってください。

## メディア送信の制限時間 {#media-send-timeout}

cron の配信に、つながっているゲートウェイのアダプタ経由で送るメディア（作った PDF、読み上げ音声、書き出したレポート）が含まれるとき、その 1 つずつのアップロードには制限時間があります。既定は 300 秒です。回線が細くてファイルが大きいときは、もっと必要なこともあります。

```yaml
# ~/.hermes/config.yaml
cron:
  media_send_timeout_seconds: 600   # 10 minutes per attachment
```

環境変数 `HERMES_CRON_MEDIA_SEND_TIMEOUT` でも設定できます。決まる順番は、環境変数 → config.yaml → 既定の 300 秒です。時間切れになったメディアは、そのジョブの実行の状態に、一部だけ届かなかったこととして記録されます（本文は届きます）。

## Bot Chat 配信の制限時間 {#bot-chat-delivery-timeout}

`bot-chat` の配信は、届け先のボットのチャットでエージェントのターンをまるごと 1 回動かすので、制限は秒ではなく分の単位です。既定は 600 秒です。

```yaml
# ~/.hermes/config.yaml
cron:
  bot_chat_delivery_timeout_seconds: 900
```

時間切れになった配信は `last_delivery_error` に記録されます。ボットのターン自体は、そのまま最後まで進むこともあります。

## エージェントなしモード（スクリプトだけのジョブ） {#no-agent-mode-script-only-jobs}

LLM の思考が要らない繰り返しのジョブ——昔ながらの見張り、ディスクやメモリの警報、生存確認、CI への合図——には、作成時に `no_agent=True` を渡してください。スケジューラは予定どおりスクリプトを動かし、その標準出力をそのまま届けて、エージェントはまるごと飛ばします。

```bash
hermes cron create "every 5m" \
  --no-agent \
  --script memory-watchdog.sh \
  --deliver telegram \
  --name "memory-watchdog"
```

意味あいはこうです。

- スクリプトの標準出力（前後の空白は落とします）が、そのままメッセージとして届きます。
- **標準出力が空なら、そのティックは黙ります。** 何も届けません。これが見張りの型です。「おかしいときだけ何か言う」。
- 終了コードが 0 以外、または時間切れなら、エラーの知らせが届きます。壊れた見張りが黙って死ぬことはありません。
- 最後の行が `{"wakeAgent": false}` なら、そのティックは黙ります（LLM を使うジョブと同じ関門です）。
- トークンも、モデルも、プロバイダーの控えも使いません。このジョブが推論の層に触れることはありません。

`.sh` と `.bash` のファイルは、`PATH` にあれば `bash` で、無ければ `/bin/bash` で動きます（Windows の Git Bash では大事な点です）。それ以外は、いま動いている Python（`sys.executable`）で動きます。スクリプトは `$HERMES_HOME/scripts/` の中に収まらなければなりません。相対名でも、絶対パスでも、`~` で始まるパスでも、たどり着く先がそのディレクトリの中なら受け付けます。外へ出るパスははねられます。子プロセスの環境変数は掃除されるので（`_sanitize_subprocess_env`）、プロバイダーの API 認証情報など、Hermes が持っている秘密は cron のスクリプトには **渡りません**。

### 用意はエージェントがやってくれます {#the-agent-sets-these-up-for-you}

`cronjob` ツールの定義には `no_agent` が Hermes から見える形で入っているので、チャットで見張りの中身を話せば、エージェントが組み立ててくれます。

```text
Ping me on Telegram if RAM is over 85%, every 5 minutes.
```

Hermes は `write_file` で確認用のスクリプトを `~/.hermes/scripts/` に書き、それから次を呼びます。

```python
cronjob(action="create", schedule="every 5m",
        script="memory-watchdog.sh", no_agent=True,
        deliver="telegram", name="memory-watchdog")
```

メッセージの中身がスクリプトだけで決まりきっているとき（見張り、しきい値の警報、生存確認）は、`no_agent=True` を自分で選びます。同じツールでエージェントはジョブの一時停止・再開・編集・削除もできるので、CLI に触れないまま、チャットだけで一生ぶんの操作がまかなえます。

やってみた例は、[スクリプトだけの cron ジョブの手引き](/hermes/docs/guides/cron-script-only/)を見てください。

## `context_from` でジョブをつなぐ {#chaining-jobs-with-contextfrom}

cron ジョブは、前の実行の記憶を持たない切り離されたセッションで動きます。とはいえ、あるジョブの出力が、次のジョブにちょうど必要なものだということもあります。`context_from` を指定すると、そのつながりが自動でできます。実行のとき、ジョブ B のプロンプトの前に、ジョブ A のいちばん新しい出力が差し込まれます。

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

**しくみ：**

- ジョブ 2 が動くとき、Hermes は `~/.hermes/cron/output/{job1_id}/*.md` からジョブ 1 のいちばん新しい出力を読みます
- その出力が、ジョブ 2 のプロンプトの前に自動で足されます
- ジョブ 2 は「このファイルを読め」と書いておく必要がありません。中身が文脈として渡ってきます
- つながりの長さに制限はありません。ジョブ 1 → ジョブ 2 → ジョブ 3 → …

**`context_from` に書けるもの：**

| 書き方 | 例 |
|--------|---------|
| ジョブ ID をひとつ（文字列） | `context_from="a1b2c3d4"` |
| ジョブ ID を複数（リスト） | `context_from=["job_a", "job_b"]` |

出力は、並べた順につながれます。

**続きもの：前回の実行の出力を持ち越す**

`continuity=true` にすると、そのジョブは *自分自身* のいちばん新しい出力を毎回の実行に差し込みます。繰り返すジョブは、ふつうは毎回もの忘れした状態から始まります。ニュースを探すジョブは同じ記事をまた報告し、見張りは同じ状態でまた警報を出します。続きものを有効にすると、そのジョブは前回に何を報告したかを見た状態で目を覚まし、重なりを避けて、続きから進められます。

```python
cronjob(
    action="create",
    prompt="Scan HN and arXiv for new agent-tooling papers. Report only items NOT already covered in your previous run's output.",
    schedule="every 6h",
    continuity=True,
    name="Agent Tooling Scout",
)
```

初回は前回の出力が無いので、プロンプトはそのまま走ります。2 回目以降は、前回の出力が「すでに報告したことは繰り返さない」という言い添えとともに前に付きます。上流のジョブとも自由に組み合わせられ（`context_from=["<other_job_id>"]` と `continuity=true` を併用）、更新のときに `continuity=false` にすると、ほかの `context_from` の指定は残したままこれだけを切れます。内部では、このフラグは `context_from` の中の予約された `self` という項目として保存されます。

CLI からは `hermes cron create "every 6h" "Scan for news" --continuity` で作れ、既にあるジョブは `hermes cron edit <job_id> --continuity` と `--no-continuity` で切り替えられます。同じ切り替えは、ダッシュボードの cron 編集画面と、デスクトップの Bot Mode の定型作業のダイアログにもあります。

**こんなときに使います：**

- 何段かに分かれた流れ（集める → 選ぶ → 整える → 届ける）
- N 番目の作業が N−1 番目の出力に依存する、つながった作業
- ひとつのジョブが、いくつかのジョブの結果をまとめる形
- 自分の前回の報告と重ならないようにしたい、繰り返しの探索や見張り（`continuity=true`）

## プロバイダーの立て直し {#provider-recovery}

cron ジョブは、設定してある控えのプロバイダーと、認証情報の持ち回りをそのまま引き継ぎます。主 API キーが流量制限に掛かったり、プロバイダーがエラーを返したりしたとき、cron のエージェントはこうできます。

- `config.yaml` に `fallback_providers`（あるいは昔からの `fallback_model`）が設定してあれば、**別のプロバイダーへ切り替える**
- 同じプロバイダーの[認証情報の束](/hermes/docs/user-guide/configuration/#credential-pool-strategies)の中で、**次の認証情報へ回す**

おかげで、頻繁に走る cron ジョブや、混み合う時間帯のジョブも粘り強くなります。ひとつのキーが流量制限に掛かっただけで実行がまるごと失敗することはありません。

## 発火の取りこぼし（`last_fire_error`） {#missed-scheduled-fires-lastfireerror}

ホスティング型（cron をこちらで面倒を見る形）では、予定された発火はプラットフォームのスケジューラからダッシュボードを経て、ゲートウェイの内部 API サーバーへ届きます。この最後の受け渡しが失敗すると——ゲートウェイのプロセスが落ちている、あるいはその API サーバーが待ち受けを始めていない——実行そのものが始まらないので、実行の記録も、見に行くべき `last_status` も残りません。見分けやすい形は、手で動かせば毎回うまくいくのに、自動では一度も発火しない、というものです。

こうした取りこぼしは、ジョブの記録に `last_fire_error`（時刻と理由）として刻まれ、次の場所に出ます。

- `cronjob` ツールの `action: "list"` の、`last_fire_error` の項目
- `hermes cron list` の、ジョブの下に出る赤い `⚠ Missed scheduled fire:` の行
- ダッシュボードのジョブの画面

この刻印はつねに **いまの** 自動発火の状態を映します。新しい取りこぼしで上書きされ、次にうまく走れば自動で消えます。これが出ているなら、ジョブも予定も問題はありません。発火の道筋のゲートウェイ側に手を入れる必要があります（いちばん多いのは、プロファイルの環境をまるごと読み直させるために、ゲートウェイをその管理下で再起動することです。`hermes gateway restart`）。

### 取りこぼしの追いかけ実行 {#misfire-catch-up}

外部のスケジューラが動いているとき（ホスティング型で cron をこちらで面倒を見る形）、ゲートウェイは追いかけの掃き寄せも走らせます。予定の時刻を過ぎても発火が届かず、猶予の時間も過ぎたジョブは、こちらで確保してローカルで走らせます。おかげで、発火の受け渡しが止まっても、失うのは丸一日ではなく数分で済みます。この掃き寄せは、ふつうの発火と同じ確保のしくみで、遅れてきたスケジューラの再試行と重ならないようになっています。

```yaml
cron:
  misfire_grace_minutes: 10   # wait this long for the scheduler's own retries
                              # before catching up locally; 0 disables catch-up
```

ローカル（内蔵のティッカー）で動かしている場合、これは要りません。ティッカーは次のティックで、時間を過ぎたジョブをすでに拾います。

## 予定の書き方 {#schedule-formats}

エージェントの最終の返答は、そのジョブの `deliver:` の届け先へ自動で届きます。エージェントが自分でメッセージを飛ばすことはもうないので、人に見せたい内容はそのまま最終の返答に書けば済みます。**別の届け先や、追加の届け先** に出したいときは、エージェントに送らせるのではなく、cron ジョブの `deliver:` に届け先を並べてください（カンマ区切り。たとえば `deliver: "telegram,discord"`）。

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

### 曜日と時刻の自然な書き方（繰り返し） {#natural-daytime-schedules-recurring}

```text
every monday 9am         → Weekly, Mondays at 9:00 AM
every day at 9am         → Daily at 9:00 AM
weekdays at 9am          → Weekdays at 9:00 AM
weekends at 10am         → Saturdays and Sundays at 10:00 AM
daily at 7am             → Daily at 7:00 AM
monday, wednesday at 9am → Mondays and Wednesdays at 9:00 AM
```

時刻は `9am`、`9:30pm`、`14:00`、24 時間制の数字だけ（`at 7`）、`noon`、`midnight` を受け付けます。これらは内部で cron 式に直されます（`croniter` パッケージが必要ですが、既定で入っています）。

### cron 式 {#cron-expressions}

```text
0 9 * * *       → Daily at 9:00 AM
0 9 * * 1-5     → Weekdays at 9:00 AM
0 9 * * MON-FRI → Weekdays at 9:00 AM (named weekdays/months accepted)
0 */6 * * *     → Every 6 hours
30 8 1 * *      → First of every month at 8:30 AM
0 0 * * 0       → Every Sunday at midnight
```

### ISO の日時 {#iso-timestamps}

```text
2026-03-15T09:00:00    → One-time at March 15, 2026 9:00 AM
```

## 繰り返しの動き {#repeat-behavior}

| 予定の種類 | 既定の繰り返し | 動き |
|--------------|----------------|----------|
| 1 回きり（`in 30m`、日時） | 1 | 1 回だけ走ります |
| 間隔（`every 2h`） | 無期限 | 消すまで走り続けます |
| cron 式 | 無期限 | 消すまで走り続けます |

これは上書きできます。

```python
cronjob(
    action="create",
    prompt="...",
    schedule="every 2h",
    repeat=5,
)
```

## プログラムからジョブを扱う {#managing-jobs-programmatically}

エージェント側から見た口はひとつのツールです。

```python
cronjob(action="create", ...)
cronjob(action="list")
cronjob(action="update", job_id="...")
cronjob(action="pause", job_id="...")
cronjob(action="resume", job_id="...")
cronjob(action="run", job_id="...")
cronjob(action="remove", job_id="...")
```

`update` では、`skills=[]` を渡すと付いているスキルをすべて外せます。

### 手動の実行は非同期です {#manual-runs-are-asynchronous}

`cronjob(action="run")` は、そのジョブをすぐ **裏で** 走らせます
（`delegate_task` と同じです）。ツールの呼び出しはその場で受け取りの札を返し、
ジョブの結末——成否、届け先、次の予定、出力の抜粋——は、実行が終わったときに
新しいメッセージとして会話へ入ってきます。そのあいだ、エージェントもあなたも
別の作業を続けられますし、すでに走っている最中のジョブは二重に発火せず、
「もう走っています」と断られます。

`action="run"` に `prompt` を添えて、その回かぎりの文脈を差し込むこともできます。

```python
cronjob(action="run", job_id="...", prompt="CONTEXT: focus on the EU region today")
```

添えた文脈は、その 1 回の発火に限って、ジョブに保存されているプロンプトの下に
`## Run Context` という見出しで足されます。ジョブの定義に残ることはありませんし、
保存されたプロンプトと同じプロンプトインジェクションの検査も通ります。

切り離された結果を受け取れない動かし方（1 回きりの `hermes -z`、CLI からの `hermes cron run`、cron の子セッション、かんばんの作業役）は、自動で同期の実行に切り替わります。

## cron ジョブが使えるツール群 {#toolsets-available-to-cron-jobs}

cron はジョブごとに、チャットのプラットフォームがつながっていない、まっさらなエージェントのセッションで走らせます。既定では、cron のエージェントが受け取るのは **`hermes tools` で `cron` のプラットフォーム向けに設定したツール群** です。CLI の既定でもなければ、あるもの全部でもありません。

```bash
hermes tools
# → pick the "cron" platform in the curses UI
# → toggle toolsets on/off just like you would for Telegram/Discord/etc.
```

ジョブごとにもっと細かく決めたいときは、`cronjob.create` の `enabled_toolsets`（既にあるジョブなら `cronjob.update`）が使えます。

```text
cronjob(action="create", name="weekly-news-summary",
        schedule="every sunday 9am",
        enabled_toolsets=["web", "file"],      # just web + file, no terminal/browser/etc.
        prompt="Summarize this week's AI news: ...")
```

ジョブに `enabled_toolsets` が指定されていればそれが勝ち、無ければ `hermes tools` の cron プラットフォームの設定が勝ち、それも無ければ Hermes は組み込みの既定に落ちます。これは費用にも効いてきます。ちょっとした「ニュースを取ってくる」ジョブにまで `browser` や `delegation` を持たせると、LLM を呼ぶたびにツール定義でプロンプトが膨らみます。

### エージェントをまるごと飛ばす：`wakeAgent` {#skipping-the-agent-entirely-wakeagent}

cron ジョブに事前チェックのスクリプトを付けていると（`script=` で指定）、そのスクリプトが、そもそもエージェントを呼ぶ必要があるかどうかを実行時に決められます。標準出力の最後の行に、次の形を出してください。

```text
{"wakeAgent": false}
```

…すると cron は、そのティックではエージェントの実行をまるごと飛ばします。1〜5 分おきのような細かい見回りで、状態が実際に変わったときだけ LLM を起こしたい、という場合に便利です。そうしないと、中身の無いエージェントのターンに何度もお金を払うことになります。

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

`wakeAgent` を書かなかったときの既定は `true` です（いつもどおりエージェントを起こします）。

#### 実例：安上がりな実行前の関門 {#recipes-cheap-pre-run-gates}

`wakeAgent` の関門は、予定されたジョブが LLM のトークンを使うべきかどうかを、0 円で決める手立てです。3 つの型で、たいていの用は足ります。

**ファイルが変わったかの関門** — 見張っているファイルに、前回うまくいったティック以降の新しい中身があるときだけ走らせます。スケジューラはジョブごとに `last_run_at` を記録しているので、それとファイルの更新時刻を比べます。

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

**外からの合図の関門** — ほかの処理が「準備できた」と知らせたときだけ走らせます（デプロイの仕掛けがファイルを置く、CI のジョブが状態の保管先に値を書く、など）。

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

**SQL の件数の関門** — 自分のデータベースに、処理すべき新しい行があるときだけ走らせます。スクリプトは `context` を通してその件数をエージェントへ渡せるので、エージェントは自分で問い合わせ直さなくても、どれくらいの量を相手にしているか分かります。

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

同じ型は、スクリプトから問い合わせられるどんなデータ源にも使えます。Postgres でも、HTTP の API でも、自分の状態の保管先でも。cron のしくみに SQL の評価器を組み込む必要はありません。

:::tip
Hermes 自身の `~/.hermes/state.db` は内部のもので、版が変われば形も変わります。実行前の関門からこれを読まないでください。自分のデータベースやフィードを指してください。
:::

謝辞：この実例の一式は、@iankar8 さんが [#2654](https://github.com/NousResearch/hermes-agent/pull/2654) で試したことがきっかけです。そこでは、sql・file・command の引き金を別の仕組みとして足す案が出ていました。`script` と `wakeAgent` の関門で 3 つとも 0 円でまかなえるので、成果はドキュメントという形になりました。

### ジョブをつなぐ：`context_from` {#chaining-jobs-contextfrom}

cron ジョブは、ほかのジョブがいちばん最近うまく出した出力を、名前（か ID）を `context_from` に並べることで取り込めます。

```text
cronjob(action="create", name="daily-digest",
        schedule="every day 7am",
        context_from=["ai-news-fetch", "github-prs-fetch"],
        prompt="Write the daily digest using the outputs above.")
```

指した各ジョブの、いちばん最近終わった出力が、この実行のプロンプトの上に文脈として差し込まれます。上流として書く項目は、正しいジョブ ID か名前でなければなりません（`cronjob action="list"` を見てください）。なお、つなぐときに読むのは *いちばん最近終わった* 出力です。同じティックで走っている上流のジョブを待つわけではありません。

## ジョブの保存先 {#job-storage}

ジョブは `~/.hermes/cron/jobs.json` に保存されます。実行の出力は `~/.hermes/cron/output/{job_id}/{timestamp}.md` に残ります。

ジョブの定義は、ディスク上のただの JSON です。`hermes update` も、ゲートウェイの再起動も、端末の再起動も越えて残ります。再起動のときに走っている最中だったジョブは、実行の台帳に `unknown` と印が付きます。自動で走り直すことはありませんが、次に予定されたティックではふつうに発火します。くわしくは[実行の履歴](#execution-history)を見てください。

:::tip
ジョブの管理は、`jobs.json` を直に書き換えるのではなく、`cronjob` ツールか `hermes cron edit` か `/cron` でエージェントに頼んでください。直に編集すると、[ファイル書き込みの安全策](/hermes/docs/user-guide/security/#file-write-safety)がそのパスを止めたときに（たとえば `HERMES_WRITE_SAFE_ROOT` が設定されている場合）、黙って失敗することがあります。保存されなかったことをはっきり示すのは、[ファイル変更の確認](/hermes/docs/user-guide/configuration/#file-mutation-verifier)の脚注です。
:::

ジョブは `model` と `provider` を `null` のまま持つことがあります。これらが書かれていないとき、Hermes は実行のときに全体の設定から決めます。ジョブの記録にこれらが出てくるのは、ジョブごとの指定があるときだけです。

保存はファイルを丸ごと入れ替える形で行うので、書き込みが途中で止まっても、書きかけのジョブファイルが残ることはありません。

## プロンプトはやはり単体で完結させる {#self-contained-prompts-still-matter}

:::warning 大事なこと
cron ジョブは、まったくまっさらなエージェントのセッションで動きます。付けたスキルで補われないものは、エージェントに必要なことをすべてプロンプトに書いてください。
:::

**よくない例：** `"Check on that server issue"`

**よい例：** `"SSH into server 192.168.1.100 as user 'deploy', check if nginx is running with 'systemctl status nginx', and verify https://example.com returns HTTP 200."`

## 安全性 {#security}

定期タスクのプロンプトは、作成のときと更新のときに、プロンプトインジェクションと認証情報の持ち出しの疑いがないか調べられます。目に見えない Unicode の細工、SSH の裏口を作ろうとするもの、あからさまに秘密を持ち出す中身を含むプロンプトは止められます。
