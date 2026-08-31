---
title: "定期実行タスク（cron）"
description: "ふだんの言葉で仕事を予約し、1つの cron のツールで管理し、スキルを1つでも複数でも結び付けられます"
upstream_path: user-guide/features/cron.md
upstream_blob: 410237b6f5e297798df67cdaa3371116d251044d
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/cron
---

# 定期実行タスク（cron） {#scheduled-tasks-cron}

ふだんの言葉か cron の式で、仕事が自動で走るように予約できます。Hermes は、予約・一覧・削除を別々のツールに分けるのではなく、動作を指定する形の `cronjob` という1つのツールで cron を扱います。

## いまの cron でできること {#what-cron-can-do-now}

cron のジョブでは次のことができます。

- 一度きり、または繰り返しの仕事を予約する
- ジョブを休止・再開・編集・その場で実行・削除する
- ジョブにスキルを0個、1個、あるいは複数結び付ける
- 結果を、もとのチャット、手元のファイル、設定したプラットフォームの宛先へ届ける
- 新しいエージェントのセッションで、いつもの決まったツール一覧のまま動かす
- **エージェントなしモード**で動かす。予定どおりにスクリプトを走らせ、その標準出力をそのまま届けるだけで、LLM はいっさい関わりません（下の[エージェントなしモード](#no-agent-mode-script-only-jobs)の節を参照）

これらはすべて `cronjob` のツールを通して Hermes 自身も使えるので、ふだんの言葉で頼むだけでジョブを作り、休止し、編集し、削除できます。CLI は要りません。

:::tip
**cron のジョブはどのモデルで動くのか。** 実行の瞬間に決まる順番は、ジョブごとの固定 → `config.yaml` の `cron.model` → `hermes model` の全体の既定です。

- **ジョブごとの固定** — *自分で*、管理画面、`hermes cron create/edit --model … --provider …`、あるいは `~/.hermes/cron/jobs.json` を編集して決めます。いったん決めると、変えるまでそのままです。エージェントの `cronjob` ツールからは、ジョブごとのモデルを決めることも変えることもできません。推論の固定は利用者のものです。
- **`cron.model` / `cron.model_provider`** — cron の一群に共通の既定です。固定していないジョブはすべてこのモデルで動き、チャットのモデルとは切り離されます。一度決めておけば（`hermes config set cron.model <name>`）、`hermes model` や `/model` でチャットのモデルを変えても、cron の一群には触れません。
- **全体の既定** — 上の2つがどちらもないときだけ、ジョブは `hermes model` に従います。この場合、Hermes は作成の時点で提供元とモデルを**写し取り**、あとで全体の既定が変わるとジョブは**失敗したら閉じる**形をとります。その回を飛ばし、推論を呼ばず、**一度だけ**知らせます。以降の刻みでも、手を打つか設定が戻るまで、飛ばしたまま黙っています（#44585）。繰り返すジョブや、また走らせたいジョブでは、提供元とモデルをはっきり固定してから進めてください（`hermes cron edit <job_id> --provider <provider> --model <model>`）。使い切った一度きりのジョブは更新できないので、代わりに提供元とモデルをはっきり指定して、これからのぶんを新しく作ってください。人の見ていないジョブが、有料の提供元やモデルへの切り替えを黙って受け継いでしまうのを防ぐためです。`cron.model`（またはジョブごとの固定）を決めるのが、cron の支出を意図して割り振るやり方で、そこで押さえた軸については、ずれを見張るしくみは働きません。固定していないジョブに、変わっていく全体の既定を追わせたい運用者は、[ずれの見張りを止められます](#letting-unpinned-jobs-track-global-defaults)。

どの提供元に落ち着いたとしても、その提供元に固有の要求の設定（独自の提供元向けの `extra_body` や `extra_headers` といった `request_overrides` など）は、対話のセッションと同じように、予定された実行にも引き継がれます。

`hermes setup --portal` は、OAuth の更新が自動なので、人の見ていない実行にはいちばん手間のかからない選び方です。[Nous Portal](/hermes/docs/integrations/nous-portal/) を参照してください。
:::

:::tip
**ジョブごとの推論の手間。** ジョブは、モデルの固定とは別に、考える深さを自分で固定できます。`none`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max`、`ultra` のどれかです。決めると、そのジョブの実行では、全体の `agent.reasoning_effort` もモデルごとの `agent.reasoning_overrides` も上書きします（`none` は考えることをやめさせます）。`hermes cron create/edit --reasoning-effort high` で決められ、編集のときに空の文字列を渡すと固定が外れ、また設定に従います。（エージェントの `cronjob` ツールには、わざと出していません。モデルの設定は利用者が決めることだからです。）モデルが対応していない段は、要求の時点で提供元が抑えるか外すので、`high` までのモデルに `xhigh` を固定しても `high` で動きます。この固定は `no_agent` のジョブには効きません（調整すべき LLM の呼び出しがありません）。重い分析の予定は `high` で、安い繰り返しのジョブは `minimal` で、全体の既定に触れずに動かし分けるのに使ってください。
:::

:::warning
cron から動いたセッションは、さらに cron のジョブを作れません。Hermes は、予約が際限なく増えるのを防ぐため、cron の実行の中では cron を扱うツールを止めています。
:::

## 定期実行タスクを作る {#creating-scheduled-tasks}

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

### 普通の会話で {#through-natural-conversation}

Hermes にふつうに頼みます。

```text
Every morning at 9am, check Hacker News for AI news and send me a summary on Telegram.
```

Hermes は内部で、ひとつにまとまった `cronjob` のツールを使います。

## 実行前の設定チェック {#pre-dispatch-configuration-validation}

予定された実行のためにエージェントの仕掛けを組み立てる前に、スケジューラーは、
そのジョブの設定でほんとうに実行が成り立つかを確かめます。

- 提供元の API キーが見つかること（`fallback_providers` の連なりが設定されているときは飛ばします。
  主のキーがなくても、控えの道が救えるかもしれないからです）、
- 結び付けたスキルが使える状態にあること（要る環境変数、コマンド、資格情報のファイルが欠けていないこと）、
- 届け先のプラットフォームが分かっていて、ゲートウェイの資格情報が設定されていること
  （`local` や `origin` の宛先は確かめません）。

確かめに失敗すると、そのジョブの `last_status` は `blocked_config` になり、知らせは
1度だけ届き（刻みのたびには繰り返しません）、**LLM は呼ばれません**。設定を誤ったジョブが
トークンを使うことはありません。次にうまくいった実行で、ふさがれた状態は解けるので、
またあとで設定が壊れたら、あらためて知らせが届きます。

このチェックを止めて、以前の動き（実行に進んで、その途中で失敗する）に戻すには、次のようにします。

```yaml
cron:
  preflight: false
```

あるいは `hermes config set cron.preflight false` です。

## 固定していないジョブに全体の既定を追わせる {#letting-unpinned-jobs-track-global-defaults}

モデルと提供元のずれを見張るしくみは、既定で有効です。固定していない cron の
ジョブに、全体のモデルや提供元の変更をわざと全部追わせたいなら、`config.yaml` で
止めてください。

```yaml
cron:
  model_drift_guard: false
```

あるいは設定のコマンドを使います。

```bash
hermes config set cron.model_drift_guard false
```

これで、実行時の差し止めも、全体の推論の設定が変わったときの警告も、どちらもなくなります。
写し取った値は残るので、この項目を `true` に戻せば、ジョブを作り直さなくても守りが戻ります。

:::warning
見張りを止めると、人の見ていない、固定していないジョブは、変わった全体の既定を
すぐに受け継ぎます。有料の提供元やモデルに切り替えると、予定された実行のたびに
お金がかかることになります。
:::

## スキルを使う cron のジョブ {#skill-backed-cron-jobs}

cron のジョブは、指示を走らせる前にスキルを1つでも複数でも読み込めます。

### スキル 1 個 {#single-skill}

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

スキルは並べた順に読み込まれます。指示は、それらのスキルの上に重ねる仕事の言いつけになります。

```python
cronjob(
    action="create",
    skills=["blogwatcher", "maps"],
    prompt="Look for new local events and interesting nearby places, then combine them into one short brief.",
    schedule="every 6h",
    name="Local brief",
)
```

予定されたエージェントに、使い回せる手順を受け継がせたいけれど、スキルの本文をまるごと cron の指示に詰め込みたくはない、というときに役立ちます。

## プロジェクトのディレクトリの中でジョブを動かす {#running-a-job-inside-a-project-directory}

cron のジョブは、既定ではどのリポジトリからも切り離して動きます。`AGENTS.md` も `CLAUDE.md` も `.cursorrules` も読まれず、ターミナル・ファイル・コード実行のツールは、ゲートウェイが立ち上がった作業ディレクトリで動きます。それを変えるには `--workdir`（CLI）か `workdir=`（ツールの呼び出し）を渡します。

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

`workdir` を決めると、次のようになります。

- そのディレクトリの `AGENTS.md`、`CLAUDE.md`、`.cursorrules` がシステムへの指示に差し込まれます（見つける順は対話式の CLI と同じです）
- `terminal`、`read_file`、`write_file`、`patch`、`search_files`、`execute_code` が、すべてそのディレクトリを作業ディレクトリとして使います
- その道は、実在する絶対パスのディレクトリでなければなりません。相対パスや、ないディレクトリは、作成や更新の時点で断られます
- 編集のときに `--workdir ""`（ツールなら `workdir=""`）を渡すと消えて、以前の動きに戻ります

:::note 切り離し
エージェントの実行ごとに、その `workdir` はその回だけの仕事の身元に結び付きます。だから workdir を使うジョブも、ふつうの並行の枠で動き、プロセス全体のターミナルの状態を書き換えることも、同時に走る実行のあいだで道が漏れることもありません。cron 全体の並行の数を抑えたいなら `cron.max_parallel_jobs` を設定してください。
:::

## ジョブを編集する {#editing-jobs}

変えたいだけなら、ジョブを消して作り直す必要はありません。

:::tip ジョブの指し方
下（および[ライフサイクルの操作](#lifecycle-actions)）の `<job_id>` のところには、ジョブの名前も書けます（大文字と小文字は区別しません）。16進の ID は思い出せないけれど `morning-digest` は覚えている、というときに便利です。ぴったり合う ID があれば、名前より優先されます。ID ではなく、名前が複数のジョブに当たる場合、コマンドは実行を断り、選び分けられるように候補の ID を並べます。
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

覚え書き:

- `--skill` を繰り返すと、そのジョブに結び付いたスキルの一覧を置き換えます
- `--add-skill` は、置き換えずに今の一覧に足します
- `--remove-skill` は、結び付いたスキルのうち指定したものを外します
- `--clear-skills` は、結び付いたスキルをすべて外します

## ライフサイクルの操作 {#lifecycle-actions}

cron のジョブには、作成と削除だけでない、もっと通しの流れがあります。

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

それぞれの働き:

- `pause` — ジョブは残したまま、予約を止めます
- `resume` — ジョブを戻し、次の実行の時刻を計算し直します
- `run` — 次のスケジューラーの刻みでジョブを走らせます
- `remove` — まるごと消します
- `edit` — 予定、指示、届け先などを変えます

**名前で指せます。** 状態を変える4つの動き（`pause`、`resume`、`run`、`remove`、`edit`）と、エージェントの `cronjob` ツールは、16進の ID の代わりにジョブの**名前**も受け取れるようになりました（大文字と小文字は区別しません）。エージェントも CLI も、ぴったり合う ID があればそちらを選びます。名前が曖昧なとき（同じ名前のジョブが複数あるとき）は、はっきり選び直せるように候補の ID をすべて並べて断ります。名前は一意ではないので、この守りは効いています。同じ名前が2つあるときに、黙って違うジョブを書き換えてしまうのを防ぎます。

## エージェントに予約を任せる（cron のジョブが cron のジョブを管理する） {#agent-managed-scheduling-cron-jobs-that-manage-cron-jobs}

既定では、スケジューラー*が*立ち上げたエージェントは `cronjob` のツールを使えません。
予定されたジョブが、ほかのジョブを作ったり編集したり消したりはできない、ということです。
`config.yaml` で選べば使えるようになります。

```yaml
cron:
  allow_agent_scheduling: true   # default: false
```

有効にすると、予定されたエージェントも、チャットのセッションと同じように cron の
一覧を扱えます。予定された仕事の中から続きの一度きりのジョブを予約する、自分の
周期を調整する、あるいは一覧をまるごと整える「cron の司書」のジョブを動かす
（まず並べて、必要に応じて更新・削除・作成する）といったことです。次の2つの
性質が、これを暴走させません。

- **1つの平らな、利用者のものである一覧。** cron の実行から作られたジョブも、ほかの
  すべてのジョブと同じ `jobs.json` に入り、特別な持ち主はいません。自分で作ったのと
  まったく同じように、並べ、編集し、消せます。
- **宙に浮いた届け先を作らない。** cron の実行はその場かぎりなので、その中からの
  `deliver: origin` は、**作成の時点で**、作った側のジョブ自身の具体的な宛先
  （`platform:chat_id[:thread_id]`、作った側がどこにも届けないなら `local`）に
  置き換えられます。予定されたエージェントが作ったジョブが、もう存在しない
  セッションへ出力を向けてしまうことはありません。はっきり書いた宛先
  （`local`、`all`、`telegram:<chat_id>`）は、そのまま尊重されます。

実行のたびに新しいジョブを作る指示より、すでにあるジョブを更新する指示
（まず並べて、ID で更新する）を選んでください。

## 仕組み {#how-it-works}

**cron の実行はゲートウェイの常駐プロセスが受け持ちます。** ゲートウェイは60秒ごとにスケジューラーを刻み、時刻の来たジョブを切り離されたエージェントのセッションで走らせます。

```bash
hermes gateway install     # Install as a user service
sudo hermes gateway install --system   # Linux: boot-time system service for servers
hermes gateway             # Or run in foreground

hermes cron list
hermes cron status
```

### ゲートウェイのスケジューラーの動き {#gateway-scheduler-behavior}

刻みごとに Hermes は次のことをします。

1. `~/.hermes/cron/jobs.json` からジョブを読み込む
2. `next_run_at` を今の時刻と照らす
3. 時刻の来たジョブごとに、新しい `AIAgent` のセッションを始める
4. 必要なら、その新しいセッションに、結び付いたスキルを1つでも複数でも差し込む
5. 指示を最後まで走らせる
6. 最後の応答を届ける
7. 実行の記録と、次の予定の時刻を更新する

`~/.hermes/cron/.tick.lock` のファイルの錠が、スケジューラーの刻みが重なって同じジョブの束を二重に走らせるのを防ぎます。

### 実行の履歴 {#execution-history}

Hermes は、受け持った cron の試みを、実行の仕掛けや提供元へ渡す前に、プロファイルごとの
`~/.hermes/cron/executions.db` に記録します。試みは `claimed`、`running` を経て、
変えられない終わりの状態、つまり `completed`、`failed`、`unknown` のどれかになります。
立ち上げ直したあと、Hermes が置き去りの試みを `unknown` にするのは、もとの PID と
プロセスの起動の指紋から、持ち主がいなくなったと言い切れるときだけです。
分からないままの試みは監査のための記録で、自動で走り直すことはありません。

最近の試みは `hermes cron runs [job-id] --limit 20` で見られます（別名は
`history`）。終わった履歴には上限があり、まだ動いている試みが片づけられることはありません。
この記録は、手早い控えにも含まれます。

### 失敗が続いたときの見直しの促し {#repeated-failure-review-nudge}

ジョブは `failure_streak`、つまり続けて失敗した回数を数えています（届けるところで
失敗したぶんは数えません）。エージェントに届く前に失敗した実行、たとえば中途半端な
更新のあとの読み込みの失敗や、提供元のクライアントを組み立てられなかった場合も、
エージェント自身が失敗したのと同じように数え、同じように知らせます。*繰り返す*
ジョブの連続失敗が閾値に達すると、チャットに届く失敗の知らせに見直しの促しが加わり、
N 回続けて失敗していること、直すか、休止するか（`hermes cron pause <job>`）、
消すことを勧めてくれます。1回でも成功すれば数えは戻り、`hermes cron list` は
失敗しているジョブの前回の実行の横に連続の回数を出します。一度きりのジョブでは
促しは出ません。

```yaml
cron:
  failure_nudge_threshold: 3   # default; 0 disables the nudge
```

### 失敗の記録: 分かっている失敗を了解済みにする {#failure-incidents-acknowledge-a-known-failure}

*同じ*エラーで失敗し続ける繰り返しのジョブは、実行のたびに知らせてきます。
失敗はどれも、ジョブとエラーの文言をならした印を組にした鍵で、消えない
**出来事**としても記録されます。置き場は実行の履歴と同じ、プロファイルごとの
記録のデータベースです。

```bash
hermes cron incidents                 # list incidents (newest activity first)
hermes cron incidents --state alerted # filter: detected | alerted | closed
hermes cron incidents ack <id>        # acknowledge — stop re-pinging
```

出来事を了解済みにすると、その印とまったく同じ失敗についてだけ、実行ごとの知らせが
止まります。ほかは何も変わりません。実行の履歴には失敗が残り続け、連続失敗の数えも
進み、ジョブが*別の*エラーで失敗し始めた瞬間に新しい出来事が作られ、また知らせが
飛びます。成功した実行は出来事に触れません。出来事は印ごとのもので、
ジョブごとのものではないからです。

出来事の移り変わり: `detected`（失敗が記録された）→ `alerted`（失敗の知らせが
少なくとも1度は届いた）→ `closed`（了解済み。その印については終わり）。記録される
エラーの文言は、書く前に秘密を伏せ、長さを切り詰めます。

記録はつねに動いていて、放っておいても何も損はありません。はっきり `ack` するまで、
知らせが止められることはありません。

### 一群の健康診断: `hermes cron doctor` {#fleet-health-check-hermes-cron-doctor}

`hermes cron doctor` は、動いているすべてのジョブを読むだけで診る健康診断です。
ジョブごとの問題をまとめて並べ、手を打つべきものが見つかると `1` を返して終わります
（健やかなら `0`）。ターミナルからでも、見張りのスクリプトからでも、CI のような
軽い点検からでも使えます。

```bash
hermes cron doctor
```

動いているジョブごとに、次のことを見ます。

- 前回の実行が失敗している（`last_status` が ok でない。記録されたエラーも出ます）、
- 前回の配送が失敗している（出力はできたのに、手元に届いていない）、
- `next_run_at` がない、あるいは15分の刻みの猶予を越えて過去に置き去りになっている。
  「ジョブが黙って走っていない」という合図です（スケジューラーが死んでいる、
  ゲートウェイが落ちている、実行の受け持ちが詰まっている）、
- スクリプトがない、ファイルでない、`HERMES_HOME/scripts` の外を指している、
- スクリプトのない `no_agent` のジョブ、
- 設定された `workdir` がもう存在しない。

doctor はジョブも状態も書き換えません。伝えるだけです。引っかかったジョブを掘り下げるときは、
`hermes cron incidents`（消えない失敗の記録）や `hermes cron runs`
（試みの記録）と組み合わせてください。

## 配送先の選択肢 {#delivery-options}

ジョブを予約するときは、出力の行き先を指定します。

| 選択肢 | 説明 | 例 |
|--------|-------------|---------|
| `"origin"` | ジョブを作った場所へ返します | メッセージ連携のプラットフォームでの既定 |
| `"local"` | 手元のファイルにだけ残します（`~/.hermes/cron/output/`） | CLI での既定 |
| `"telegram"` | Telegram の基点のチャンネル | `TELEGRAM_HOME_CHANNEL` を使います |
| `"telegram:123456"` | ID で指定した Telegram のチャット | 直接届けます |
| `"telegram:-100123:17585"` | 指定した Telegram のトピック | `chat_id:thread_id` の形 |
| `"discord"` | Discord の基点のチャンネル | `DISCORD_HOME_CHANNEL` を使います |
| `"discord:#engineering"` | 指定した Discord のチャンネル | 名前で指定します |
| `"slack"` | Slack の基点のチャンネル | |
| `"whatsapp"` | WhatsApp の基点 | |
| `"signal"` | Signal | |
| `"matrix"` | Matrix の基点の部屋 | |
| `"mattermost"` | Mattermost の基点のチャンネル | |
| `"email"` | メール | |
| `"sms"` | Twilio ごしの SMS | |
| `"homeassistant"` | Home Assistant | |
| `"dingtalk"` | DingTalk | |
| `"feishu"` | Feishu / Lark | |
| `"wecom"` | WeCom | |
| `"weixin"` | Weixin（WeChat） | |
| `"bluebubbles"` | BlueBubbles（iMessage） | |
| `"qqbot"` | QQ Bot（Tencent QQ） | |
| `"bot-chat"` | このプロファイルの正式な Bot Chat。ボットが出力を読んで応えます | 同じ端末の中 |
| `"bot-chat:research"` | 同じ端末の別のプロファイルの Bot Chat | 作成の時点で確かめます |
| `"all"` | つながっている基点のチャンネルすべてに配ります | 実行の瞬間に決まります |
| `"telegram,discord"` | 指定したいくつかのチャンネルに配ります | コンマ区切りの並び |
| `"origin,all"` | もとの場所**に加えて**、つながっているほかのチャンネルすべてへ届けます | どの書き方も組み合わせられます |

エージェントの最後の応答は、設定した `deliver:` の宛先へ自動で届きます。エージェント自身がメッセージを送るわけではないので、cron の指示の中で呼ぶものは何もありません。

### Bot Chat への配送（`bot-chat`） {#bot-chat-delivery-bot-chat}

`bot-chat` は、出力を**あるプロファイルの正式な「Bot Chat」のセッションへ、本物のメッセージとして**届けます。ほかのどの宛先とも違い、受け手は人ではなくボット自身です。ボットは出力を届いたメッセージとして受け取り、手を打つべきことがあれば打ち、そのチャットで応えます。予定された出力を、ただ貼り出すのではなく*処理してほしい*ときに使ってください。

- `bot-chat`（そのまま）は、そのジョブ自身のプロファイルを指します。
- `bot-chat:<profile>` は、**同じ端末の**別のプロファイルを指します。名前はジョブを作るときに `hermes profile list` に照らして確かめられます。別のゲートウェイや別の端末のプロファイルは決して指せないので、端末をまたいで同じ名前があっても取り違えません。
- 配送のたびに、相手のボットのエージェントが丸1ターン動きます。どれくらいの頻度にするか気をつけてください。
- ほかの宛先と組み合わせられます（`bot-chat,telegram`）が、`all` には決して含まれません。

### 配送の意図（`all`） {#routing-intent-all}

`all` を使うと、設定してあるメッセージ連携のチャンネルすべてに、1つの cron のジョブを送れます。ひとつずつ名前を挙げる必要はありません。**実行の瞬間に決まる**ので、Telegram をつなぐ前に作ったジョブでも、`TELEGRAM_HOME_CHANNEL` を設定したあとの次の刻みから Telegram を拾います。

意味は次のとおりです。`all` は、基点のチャンネルが設定されているプラットフォームすべてに広がります。0 個でも構いません。その場合ジョブは届け先を作らず、上流では配送の失敗として記録されます。

`all` は、はっきり書いた宛先と組み合わせられます。`origin,all` は、もとのチャット*に加えて*、つながっているほかの基点のチャンネルすべてへ届け、`(platform, chat_id, thread_id)` で重なりを取り除きます。

### Telegram の cron 用トピック（`TELEGRAM_CRON_THREAD_ID`） {#telegram-cron-topic-telegramcronthreadid}

Telegram のトピックの形を有効にしていると、大もとの DM はシステムの控え室として空けられます。そこへ送った返信は控え室の案内で押し返され、`reply_to_message_id` は落とされるので、本流のチャットに着いた cron のメッセージには返信できません。

代わりに、cron 専用のフォーラムのトピックへ向けてください。

1. Telegram でボットの DM を開き、たとえば `Cron` という名前のトピックを作ります。トピックの見出しを長押しして **Copy link** を選ぶと、末尾の整数がそのトピックの `message_thread_id` です。
2. `.env` に `TELEGRAM_CRON_THREAD_ID=<that id>` を設定します。

これは cron の配送にだけ効きます。`TELEGRAM_HOME_CHANNEL_THREAD_ID`（再起動の知らせなど、ほかで使われるもの）は変わりません。はっきり書いた `deliver="telegram:chat_id:thread_id"` の宛先は、これまでどおり環境変数より優先されます。cron のメッセージへの返信は、すでにあるトピックのセッションに届くので、そのまま話を進められます。

### 応答の包み {#response-wrapping}

既定では、届く cron の出力には、予定された仕事から来たことが分かるように、頭と足が付きます。

```
Cronjob Response: Morning feeds
-------------

<agent output here>

Note: The agent cannot see this message, and therefore cannot respond to it.
```

包みなしで、エージェントの出力そのものを届けたいときは、`cron.wrap_response` を `false` にします。

```yaml
# ~/.hermes/config.yaml
cron:
  wrap_response: false
```

### 続きを話せるジョブ（cron の配送に返信する） {#continuable-jobs-reply-to-a-cron-delivery}

既定では、cron の配送は送りっぱなしです。メッセージは送られますが、そのチャットの
会話の履歴には残らないので、返信してもエージェントは自分が何を言ったか覚えていません。
ジョブを**続きを話せる**形にすると、届いた要旨がそのまま返信できる会話になります。
エージェントは要旨を文脈として持っているので、「Task #2 とは何ですか」と聞き返しません。

これは選んで使うもので、**既定では無効**です。設定で全体に効かせるか、`cronjob` の
ツールの `attach_to_session` でジョブごとに決めます（そのジョブについては全体の設定より優先されます）。

```yaml
# ~/.hermes/config.yaml
cron:
  mirror_delivery: false   # set true to make cron deliveries continuable
```

動きは**スレッドを優先する**形で、そのジョブ自身の会話の範囲に限られます。

- **スレッドの使えるプラットフォーム**（Telegram のトピック、Discord や Slack のスレッド）では、
  配送ごとに専用のスレッドが開き、要旨がそのスレッドのセッションに植えられるので、
  スレッドの中で返信すれば、文脈をすべて持ったまま話が続きます。繰り返しのジョブ
  （毎日の要旨など）は実行ごとに新しいスレッドを開くので、配送ごとの続きの話が
  混ざりません。
- **DM しかないプラットフォーム**（WhatsApp、Signal、SMS）にはスレッドがないので、要旨は
  代わりにもとの DM のセッションへ写されます。DM そのものが続きの場になります。

触れられるのは、そのジョブ**自身の会話**だけです。

- ジョブが作られた**もとのチャット**、
- `deliver: origin` がもとの場所を捕まえられなかったときの**基点のチャンネルへの逃げ道**
  （生きたゲートウェイのチャットではなく、スクリプトや API から作られたジョブ）。
  利用者のいちばん主だった会話が、もとの場所の代わりを務めます、
- ジョブの**はっきり書いた `platform:chat` の宛先が1つだけ**のとき。ただし、そのジョブ自身が
  `attach_to_session: true` で選んだ場合に限ります。ジョブの作者が、その宛先を会話だと
  宣言したということです。全体の `mirror_delivery` だけでは、はっきり宛先を書いた
  チャットが続きを話せるようになることはありません。

一斉に配る宛先（`all` や、プラットフォーム名だけの基点のチャンネル）が続きを話せる形に
なることはありません。写しは、名札の付いた利用者の発言（`[Cron delivery: <task name>]`）
として書かれるので、どのモデルの提供元でも、会話の履歴の交互の並びが崩れません。

#### チャンネルにそのまま続ける（Slack） {#flat-in-channel-continuation-slack}

上のスレッドを優先する動きは、配送のたびに専用のスレッドを作ります。続きを話せる
ジョブを、スレッドを作らずに**チャンネルの流れにそのまま**置きたいなら、Slack の
**続きの場**を `in_channel` にしてください。

```yaml
# ~/.hermes/config.yaml
slack:
  cron_continuable_surface: in_channel   # default: thread
  reply_in_thread: false                 # required pairing (see below)
  require_mention: false                 # so a plain reply continues the job
```

`in_channel` にすると、要旨はふつうのチャンネルの一番上の階層のメッセージとして
届き（スレッドは開きません）、返信はチャンネルで共有されたセッションを通して
ジョブの続きになります。3つの設定が組で働きます。

- **`cron_continuable_surface: in_channel`** — 配送のときにスレッドを作りません。
- **`reply_in_thread: false`**（必須） — ボットが返信に*そのまま*チャンネルで答え、
  要旨が植えられたのと同じチャンネル全体のセッションに結び付けます。これがないと
  続きは動きますがスレッドの中に出ます（スレッドの形の続きへ安全に落ちるだけで、
  返信が消えることはありません。食い違いに気づけるよう、ゲートウェイは起動時に警告を出します）。
- **`require_mention: false`**（またはそのチャンネルを `free_response_channels` に加える）
  — ふつうのメッセージで返信できるようにするためです。そうしないと、返信のたびに
  `@` で呼びかけないとボットが起きません。

続きが**チャンネル全体**のセッションになるので、それは共有されます。チャンネルの
ほかのおしゃべりも、2つ目の続きを話せるチャンネルのジョブも、同じ流れの会話に
合流します。これは「チャンネルにそのまま」であることに元から付いてくるもので、
`reply_in_thread: false` を使う人がすでに受け入れているのと同じ引き換えです。配送ごとの
続きの話を分けたいなら、既定の `thread` の場を使ってください。

これは今のところ Slack の機能です。ほかのプラットフォームもこの項目を受け取りますが、
`thread` の場に落ちます（続きのしくみが違うためです）。この選択はプラットフォームごとで、
それぞれの設定の下に置きます。ゲートウェイ側の設定なので、`/restart` で拾われます。
Slack のアプリを入れ直す必要はありません。

:::note 1対1の DM
`cron_continuable_surface` は**チャンネル**の設定です。1対1の DM には、スレッドか流れかという
分かれ道がそもそもない（DM はもうそのまま並んでいる）ので、この項目は効きません。DM での
cron の配送が続きを話せるかどうかを決めるのは、別にもとからある
**`slack.dm_top_level_threads_as_sessions`** のつまみです。

- **`false`** — 一番上の階層の DM はすべて1つの流れの DM のセッションを共有するので、続きを
  話せる cron の要旨と返信が**同じ**セッションに入り、ジョブは文脈を持ったまま続きます。DM で
  続きを話せる cron を使うなら、これが欲しい形です。
- **`true`**（既定） — 一番上の階層の DM のメッセージがそれぞれ別のセッションになるので、届いた
  要旨に返信すると、要旨の記録を持たない*新しい*セッションが始まります。この形では続きは
  動きません（cron でも、そのまま並ぶほかの配送でも同じです）。

というわけで、1対1の DM へ届ける続きを話せる cron のジョブでは、
`slack.dm_top_level_threads_as_sessions: false` にしてください。DM では
`cron_continuable_surface` は要らず（そして無視されます）。
:::

### 黙って止める {#silent-suppression}

エージェントの最後の応答に `[SILENT]` が入っていると、配送はまるごと止められます。出力は監査のために手元（`~/.hermes/cron/output/`）に残りますが、届け先へのメッセージは送られません。

何かおかしいときだけ知らせてほしい見張りのジョブに向いています。

```text
Check if nginx is running. If everything is healthy, respond with only [SILENT].
Otherwise, report the issue.
```

失敗したジョブは `[SILENT]` の印にかかわらずつねに届きます。黙らせられるのは成功した実行だけです。静かな見張りのジョブでは、伝えることがないときは `[SILENT]` だけを返すようエージェントに言いつけてください。

## スクリプトの制限時間 {#script-timeout}

実行の前に走らせるスクリプト（`script` の項目で結び付けたもの）には、既定で3600秒（1時間）の制限時間があります。これが縛るのは**スクリプトだけ**です。スキルや LLM を使うジョブは別の、動きの止まった時間の枠で走るので、この値には縛られません。スクリプトに別の上限が要るなら、変えられます。

```yaml
# ~/.hermes/config.yaml
cron:
  script_timeout_seconds: 1800   # 30 minutes
```

あるいは環境変数 `HERMES_CRON_SCRIPT_TIMEOUT` を設定します。決まる順番は、環境変数 → config.yaml → 既定の3600秒です。

cron は、実行のあとのセッションとエージェントの資源の後片づけにも上限を置きます。これは LLM のやり取りが返ってからのことなので、動きの止まった時間の制限とは別ものです。既定は片づけの操作ごとに10秒です。保管所やクライアントの終い処理が返ってこなくなると、スケジューラーはエラーを記録し、そのジョブの実行中の印を外し、あとの実行が動けるようにします。そのジョブが永久に飛ばされることはありません。

```yaml
# ~/.hermes/config.yaml
cron:
  cleanup_timeout_seconds: 10
```

`cleanup_timeout_seconds: 0` にするのは、上限のない昔の片づけの動きに戻したいときだけにしてください。

## メディア送信の制限時間 {#media-send-timeout}

cron の配送に、生きたゲートウェイの経路で送るメディアの添付（作った PDF、読み上げの音声、書き出した報告など）が含まれるとき、添付の送信ひとつずつに制限時間が掛かります。既定は300秒です。上りの遅い回線で大きなファイルを送るなら、もっと要ることもあります。

```yaml
# ~/.hermes/config.yaml
cron:
  media_send_timeout_seconds: 600   # 10 minutes per attachment
```

あるいは環境変数 `HERMES_CRON_MEDIA_SEND_TIMEOUT` を設定します。決まる順番は、環境変数 → config.yaml → 既定の300秒です。時間切れになった添付は、そのジョブの実行の状態に、一部が届かなかったこととして記録されます（文章のほうは届きます）。

## Bot Chat への配送の制限時間 {#bot-chat-delivery-timeout}

`bot-chat` への配送は、相手のボットのチャットでエージェントを丸1ターン動かすので、上限は秒ではなく分の単位です。既定は600秒です。

```yaml
# ~/.hermes/config.yaml
cron:
  bot_chat_delivery_timeout_seconds: 900
```

時間切れになった配送は `last_delivery_error` に記録されます。ボットのやり取り自体は、そのまま終わることもあります。

## エージェントなしモード（スクリプトだけのジョブ） {#no-agent-mode-script-only-jobs}

LLM に考えさせる必要のない繰り返しのジョブ、つまり昔ながらの見張り、ディスクやメモリの警告、生存確認、CI への合図などには、作るときに `no_agent=True` を渡します。スケジューラーは予定どおりにスクリプトを走らせ、その標準出力をそのまま届け、エージェントはまるごと飛ばします。

```bash
hermes cron create "every 5m" \
  --no-agent \
  --script memory-watchdog.sh \
  --deliver telegram \
  --name "memory-watchdog"
```

意味は次のとおりです。

- スクリプトの標準出力（前後を削ったもの）が、そのままメッセージとして届きます。
- **標準出力が空なら、黙って通り過ぎます**。配送はしません。これが見張りの型です。「おかしいときだけ言う」ということです。
- 0 以外で終わったり時間切れになったりすると、エラーの知らせが届くので、壊れた見張りが黙って死んでいることはありません。
- 最後の行に `{"wakeAgent": false}` があると、黙って通り過ぎます（LLM を使うジョブと同じ関門です）。
- トークンも、モデルも、提供元の控えもありません。このジョブは推論の層にいっさい触れません。

`.sh` と `.bash` のファイルは、`PATH` にあれば `bash` で、なければ `/bin/bash` で走ります（Windows の Git Bash では大事なところです）。それ以外は、いま動いている Python（`sys.executable`）で走ります。スクリプトは `$HERMES_HOME/scripts/` の中に収まらなければなりません。相対の名前も、絶対パスも、`~` で始まる道も、行き着く先がそのディレクトリの中なら受け付けますが、外へ出る道は断られます。子プロセスの環境は掃除され（`_sanitize_subprocess_env`）、提供元の API の資格情報や、そのほか Hermes が扱う秘密は、cron のスクリプトには**引き継がれません**。

### エージェントが用意してくれます {#the-agent-sets-these-up-for-you}

`cronjob` のツールの定義は `no_agent` を Hermes に直に見せているので、チャットで見張りの話をすれば、エージェントが結線してくれます。

```text
Ping me on Telegram if RAM is over 85%, every 5 minutes.
```

Hermes は `write_file` で確認のスクリプトを `~/.hermes/scripts/` に書き、それから次を呼びます。

```python
cronjob(action="create", schedule="every 5m",
        script="memory-watchdog.sh", no_agent=True,
        deliver="telegram", name="memory-watchdog")
```

メッセージの中身がスクリプトだけで決まりきっている場合（見張り、閾値の警告、生存確認）は、自分で `no_agent=True` を選びます。同じツールで、エージェントはジョブの休止・再開・編集・削除もできるので、誰も CLI に触れずに、通しの流れがチャットだけで回ります。

実際の例は[スクリプトだけの cron ジョブの手引き](/hermes/docs/guides/cron-script-only/)を参照してください。

## `context_from` でジョブをつなぐ {#chaining-jobs-with-contextfrom}

cron のジョブは切り離されたセッションで動き、前の実行のことは覚えていません。とはいえ、あるジョブの出力こそ、次のジョブが欲しいものだ、ということもあります。`context_from` の項目が、そのつながりを自動で結線します。ジョブ B の指示の前に、ジョブ A のいちばん新しい出力が、実行時に文脈として置かれます。

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

- ジョブ2の時刻が来ると、Hermes は `~/.hermes/cron/output/{job1_id}/*.md` からジョブ1のいちばん新しい出力を読みます
- その出力が、ジョブ2の指示の前に自動で置かれます
- ジョブ2は「このファイルを読め」と書き込む必要がありません。中身が文脈として渡ってきます
- つながりはいくつでも伸ばせます。ジョブ1 → ジョブ2 → ジョブ3 → …

**`context_from` に書けるもの:**

| 形 | 例 |
|--------|---------|
| ジョブ ID を1つ（文字列） | `context_from="a1b2c3d4"` |
| ジョブ ID を複数（並び） | `context_from=["job_a", "job_b"]` |

出力は、並べた順につなげられます。

**続き: 前回の実行の出力を持ち越す**

`continuity=true` にすると、そのジョブは実行のたびに*自分の*いちばん新しい出力を差し込みます。繰り返しのジョブは、ふつうは毎回すべて忘れた状態から始まるので、ニュースの探し手は同じ話を何度も報せ、見張りは同じことで何度も警告します。続きを有効にすると、ジョブは前回何を報せたかを見た状態で目を覚まし、重なりを取り除いて、続きから進められます。

```python
cronjob(
    action="create",
    prompt="Scan HN and arXiv for new agent-tooling papers. Report only items NOT already covered in your previous run's output.",
    schedule="every 6h",
    continuity=True,
    name="Agent Tooling Scout",
)
```

初回は前回の出力がないので、指示はそのまま走ります。2回目からは、前回の出力が続きの枠組み（「すでに報せたことを繰り返さない」）とともに前に置かれます。上流のジョブと自由に組み合わせられ（`context_from=["<other_job_id>"]` と `continuity=true` の併用）、更新のときに `continuity=false` にすると、ほかの `context_from` の項目は残したまま止められます。内部では、この印は `context_from` の中の予約された `self` の項目として収められます。

CLI からは `hermes cron create "every 6h" "Scan for news" --continuity`、すでにあるジョブでは `hermes cron edit <job_id> --continuity` / `--no-continuity` で入り切りできます。同じ切り替えは、管理画面の cron の編集の面と、デスクトップ版の Bot Mode の定型作業の小窓にも出ます。

**どんなときに使うか:**

- いくつもの段を通す流れ（集める → ふるいにかける → 形を整える → 届ける）
- N 番目の仕事が N−1 番目の出力に頼る、続きものの仕事
- 1つのジョブが、いくつものジョブの結果をまとめる、広げて集める型
- 自分の前回の報せと重ならないようにしたい、繰り返しの探し手や見張り（`continuity=true`）

## プロバイダーの復旧 {#provider-recovery}

cron のジョブは、設定した控えの提供元と、認証情報の束の入れ替えを受け継ぎます。主の API キーが回数制限に掛かったり、提供元がエラーを返したりしたとき、cron のエージェントは次のことができます。

- `config.yaml` に `fallback_providers`（または古い `fallback_model`）を設定していれば、**別の提供元に切り替える**
- 同じ提供元の[認証情報の束](/hermes/docs/user-guide/configuration/#credential-pool-strategies)の中で、**次の認証情報に回す**

そのため、高い頻度で走る cron のジョブや、混み合う時間帯のジョブは、より粘り強くなります。1つのキーが回数制限に掛かったくらいでは、実行がまるごと失敗することはありません。

## 予定した実行の取りこぼし（`last_fire_error`） {#missed-scheduled-fires-lastfireerror}

ホスト型（cron を任せる形）の運用では、予定された実行は、基盤のスケジューラーから管理画面を通って、ゲートウェイの内側の API サーバーへ渡されます。この最後の受け渡しが失敗すると、つまりゲートウェイのプロセスが落ちていたり、その API サーバーの待ち受けがそもそも立ち上がっていなかったりすると、実行そのものが始まりません。だから実行の記録もなく、見るべき `last_status` もありません。見分けの印はこうです。手で実行すればいつも動くのに、自動では一度も走らない。

こうした取りこぼしは、ジョブの記録に `last_fire_error`（時刻と理由）として押され、次のところに出ます。

- `cronjob` のツールの `action: "list"` — `last_fire_error` の項目
- `hermes cron list` — ジョブの下の赤い `⚠ Missed scheduled fire:` の行
- 管理画面のジョブの表示

この印はつねに**今の**自動実行の健康を映します。新しい取りこぼしで上書きされ、次にうまくいった実行で自動的に消えます。これが見えたら、ジョブと予定のほうは問題ありません。実行を渡すゲートウェイ側に手を打つ必要があります（いちばん多いのは、プロファイルの環境をすべて読み込ませるために、監督のしくみからゲートウェイを立ち上げ直すことです。`hermes gateway restart`）。

### 取りこぼしの取り戻し {#misfire-catch-up}

外部のスケジューラーが動いているとき（ホスト型で cron を任せている場合）、ゲートウェイは取り戻しの見回りもします。予定の時刻が過ぎたのに実行が渡ってこず、猶予の時間も過ぎたジョブは、手元で受け持って走らせます。実行の受け渡しが止まっても、失うのは丸1日ではなく数分で済みます。この見回りは、ふつうの実行と同じ受け持ちの記録を使うので、遅れて来たスケジューラーの再試行と重なることはありません。

```yaml
cron:
  misfire_grace_minutes: 10   # wait this long for the scheduler's own retries
                              # before catching up locally; 0 disables catch-up
```

手元で刻む形の運用では、これは要りません。刻むしくみが、次の刻みで時刻の過ぎたジョブをすでに拾ってくれます。

## 予定の書き方 {#schedule-formats}

エージェントの最後の応答は、そのジョブの `deliver:` の宛先へ自動で届きます。エージェント自身がメッセージを送ることはもうないので、人に見せたい内容は、最後の応答にそのまま書けば済みます。**別の宛先や、ほかにも**届けたいときは、エージェントに送らせるのではなく、cron のジョブに `deliver:` の宛先を複数並べてください（コンマ区切り。たとえば `deliver: "telegram,discord"`）。

### 相対的な遅らせ方（一度きり） {#relative-delays-one-shot}

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

### 曜日や時刻を自然な言葉で書く（繰り返し） {#natural-daytime-schedules-recurring}

```text
every monday 9am         → Weekly, Mondays at 9:00 AM
every day at 9am         → Daily at 9:00 AM
weekdays at 9am          → Weekdays at 9:00 AM
weekends at 10am         → Saturdays and Sundays at 10:00 AM
daily at 7am             → Daily at 7:00 AM
monday, wednesday at 9am → Mondays and Wednesdays at 9:00 AM
```

時刻には `9am`、`9:30pm`、`14:00`、24時間制の数字だけ（`at 7`）、`noon`、`midnight` が使えます。これらは内部で cron の式に直されます（`croniter` のパッケージが要りますが、既定で入っています）。

### cron の式 {#cron-expressions}

```text
0 9 * * *       → Daily at 9:00 AM
0 9 * * 1-5     → Weekdays at 9:00 AM
0 9 * * MON-FRI → Weekdays at 9:00 AM (named weekdays/months accepted)
0 */6 * * *     → Every 6 hours
30 8 1 * *      → First of every month at 8:30 AM
0 0 * * 0       → Every Sunday at midnight
```

### ISO の時刻 {#iso-timestamps}

```text
2026-03-15T09:00:00    → One-time at March 15, 2026 9:00 AM
```

## 繰り返しの既定 {#repeat-behavior}

| 予定の種類 | 既定の繰り返し | 動き |
|--------------|----------------|----------|
| 一度きり（`in 30m`、時刻） | 1 | 1回だけ走ります |
| 間隔（`every 2h`） | 無期限 | 消すまで走り続けます |
| cron の式 | 無期限 | 消すまで走り続けます |

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

エージェントに向けた API は1つのツールです。

```python
cronjob(action="create", ...)
cronjob(action="list")
cronjob(action="update", job_id="...")
cronjob(action="pause", job_id="...")
cronjob(action="resume", job_id="...")
cronjob(action="run", job_id="...")
cronjob(action="remove", job_id="...")
```

`update` では、`skills=[]` を渡すと、結び付いたスキルがすべて外れます。

### 手動の実行は非同期です {#manual-runs-are-asynchronous}

`cronjob(action="run")` は、そのジョブを**裏で**すぐに走らせます
（`delegate_task` と同じです）。ツールの呼び出しは取っ手を持ってすぐ返り、
ジョブの結末、つまり成功か失敗か、届け先、次の予定、出力の抜粋は、
実行が終わったときに新しいメッセージとして会話に戻ってきます。
そのあいだ、エージェント（と自分）は仕事を続けられますし、すでに走っている
ジョブは、二重に走らせずに「already running」と断られます。

`action="run"` に `prompt` を添えて、その回だけの一時的な文脈を差し込むこともできます。

```python
cronjob(action="run", job_id="...", prompt="CONTEXT: focus on the EU region today")
```

その文脈は、その1回の実行に限り、`## Run Context` の見出しの下でジョブに
収められた指示に付け足されます。ジョブの定義に残ることはなく、収められた
指示と同じ、指示の乗っ取りを探す検査も通ります。

切り離した結果を受け取れない動かし方（一度きりの `hermes -z`、CLI からの `hermes
cron run`、cron の子のセッション、Kanban の働き手）は、自動で同期の実行に落ちます。

## cron のジョブが使えるツール群 {#toolsets-available-to-cron-jobs}

cron は、チャットのプラットフォームを持たない新しいエージェントのセッションで、ジョブごとに走らせます。既定では、cron のエージェントは **`hermes tools` の `cron` のプラットフォームに設定したツール群**を受け取ります。CLI の既定でも、ありとあらゆるものでもありません。

```bash
hermes tools
# → pick the "cron" platform in the curses UI
# → toggle toolsets on/off just like you would for Telegram/Discord/etc.
```

ジョブごとにもっと細かく決めたいときは、`cronjob.create` の `enabled_toolsets` の項目（すでにあるジョブなら `cronjob.update`）が使えます。

```text
cronjob(action="create", name="weekly-news-summary",
        schedule="every sunday 9am",
        enabled_toolsets=["web", "file"],      # just web + file, no terminal/browser/etc.
        prompt="Summarize this week's AI news: ...")
```

ジョブに `enabled_toolsets` が設定されていればそれが勝ち、なければ `hermes tools` の cron のプラットフォームの設定が勝ち、それもなければ Hermes は組み込みの既定に落ちます。これは費用を抑えるうえで効きます。小さな「ニュースを取ってくる」ジョブにまで `browser` や `delegation` を持ち歩くと、LLM を呼ぶたびにツールの定義の指示が膨らみます。

### エージェントをまるごと飛ばす: `wakeAgent` {#skipping-the-agent-entirely-wakeagent}

cron のジョブに前もって確かめるスクリプト（`script=` で結び付けたもの）が付いていると、そのスクリプトが実行時に、Hermes がそもそもエージェントを呼ぶべきかを決められます。標準出力の最後の行を、次の形で出してください。

```text
{"wakeAgent": false}
```

…すると cron は、その刻みではエージェントの実行をまるごと飛ばします。1〜5分ごとのような頻繁な見回りで、状態がほんとうに変わったときだけ LLM を起こしたい、というときに役立ちます。そうしないと、中身のないやり取りに何度も払うことになります。

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

`wakeAgent` を書かなかったときの既定は `true`（いつもどおりエージェントを起こす）です。

#### 使い方の例: 安上がりな実行前の関門 {#recipes-cheap-pre-run-gates}

`wakeAgent` の関門は、予定されたジョブが LLM のトークンをそもそも使うべきかを、0円で決める手立てです。3つの型で、たいていの用は足ります。

**ファイルの変化で開く関門** — 見張っているファイルに、前回うまくいった刻み以降の新しい中身があるときだけ走らせます。スケジューラーはジョブごとに `last_run_at` を記録しているので、ファイルの更新時刻と比べます。

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

**外からの合図で開く関門** — ほかの何かが「用意ができた」と知らせたときだけ走らせます（配備の仕掛けがファイルを置く、CI が状態の保管所に値を入れる、など）。

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

**SQL の件数で開く関門** — 自分のデータベースに処理すべき新しい行があるときだけ走らせます。スクリプトは `context` を通してその件数をエージェントへ渡せるので、エージェントは問い合わせ直さなくても、どれくらいの量を見ているのか分かります。

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

同じ型は、スクリプトから問い合わせられるどんなデータの出どころでも使えます。Postgres でも、HTTP の API でも、自分の状態の保管所でも、cron のしくみの中に SQL の評価器を焼き付けずに済みます。

:::tip
Hermes 自身の `~/.hermes/state.db` は内部の作りで、版ごとに変わります。実行前の関門から問い合わせないでください。自分のデータベースや取り込み口を指してください。
:::

謝辞: この例の一式は、@iankar8 が [#2654](https://github.com/NousResearch/hermes-agent/pull/2654) で探ったことがきっかけです。そこでは、sql / file / command の引き金を別のしくみとして足す案が出ていました。`script` と `wakeAgent` の関門で3つとも0円でまかなえるので、この仕事は文書として着地しました。

### ジョブをつなぐ: `context_from` {#chaining-jobs-contextfrom}

cron のジョブは、ほかのジョブの名前（または ID）を `context_from` に並べることで、そのジョブたちのいちばん新しい成功した出力を受け取れます。

```text
cronjob(action="create", name="daily-digest",
        schedule="every day 7am",
        context_from=["ai-news-fetch", "github-prs-fetch"],
        prompt="Write the daily digest using the outputs above.")
```

挙げたジョブのいちばん新しい終わった出力が、この実行の文脈として指示の上に差し込まれます。上流の項目は、どれも正しいジョブの ID か名前でなければなりません（`cronjob action="list"` を参照）。なお、このつなぎが読むのは*いちばん新しい終わった*出力です。同じ刻みで走っている上流のジョブを待ちはしません。

## ジョブの保管場所 {#job-storage}

ジョブは `~/.hermes/cron/jobs.json` に収められます。実行の出力は `~/.hermes/cron/output/{job_id}/{timestamp}.md` に残ります。

ジョブの定義は、ディスク上のただの JSON です。`hermes update` も、ゲートウェイの再起動も、端末の立ち上げ直しも越えて残ります。立ち上げ直しのときに実行の途中だったジョブは、実行の記録で `unknown` と印されます。自動では走り直しませんが、そのジョブの次の予定の刻みはふつうに動きます。詳しくは[実行の履歴](#execution-history)を参照してください。

:::tip
ジョブの管理は、`jobs.json` を直に書き換えるのではなく、`cronjob` のツール、`hermes cron edit`、`/cron` を通してエージェントに頼んでください。直に編集すると、[ファイル書き込みの安全策](/hermes/docs/user-guide/security/#file-write-safety)がその道を止めたときに（たとえば `HERMES_WRITE_SAFE_ROOT` が設定されているとき）黙って失敗することがあり、[ファイルの書き換えを確かめるしくみ](/hermes/docs/user-guide/configuration/#file-mutation-verifier)の足の表示こそが、何も保存されなかったことを知らせる確かな合図になります。
:::

ジョブは `model` と `provider` を `null` のまま収められます。これらの項目がないとき、Hermes は実行の時点で全体の設定から決めます。ジョブの記録にこれらが現れるのは、ジョブごとの上書きが設定されているときだけです。

保管にはファイルを一気に書き換えるやり方を使っているので、書き込みが途中で切れても、書きかけのジョブのファイルが残ることはありません。

## プロンプトはそれだけで完結させる {#self-contained-prompts-still-matter}

:::warning 大事なこと
cron のジョブは、まったく新しいエージェントのセッションで動きます。結び付けたスキルが与えてくれないものは、エージェントに要るものすべてを指示の中に書いてください。
:::

**悪い例:** `"Check on that server issue"`

**良い例:** `"SSH into server 192.168.1.100 as user 'deploy', check if nginx is running with 'systemctl status nginx', and verify https://example.com returns HTTP 200."`

## セキュリティ {#security}

定期実行タスクの指示は、作るときと更新するときに、指示の乗っ取りや資格情報の持ち出しの型がないか調べられます。目に見えない Unicode の細工、SSH の裏口を作ろうとするもの、あからさまに秘密を持ち出す中身を含む指示は、止められます。
