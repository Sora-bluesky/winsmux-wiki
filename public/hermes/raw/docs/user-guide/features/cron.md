---
title: "定期実行タスク（cron）"
description: "自然な言葉で自動タスクを予約し、一つの cron ツールで管理し、スキルを一つ以上ひも付けます"
upstream_path: user-guide/features/cron.md
upstream_blob: b82353d3f30fe54dd25188e4500696358e050a37
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/cron
---

# 定期実行タスク（cron） {#scheduled-tasks-cron}

自然な言葉や cron の式を使って、タスクを自動で走らせる予約ができます。Hermes は、予約・一覧・削除のツールを別々に用意するのではなく、`cronjob` という一つのツールに操作の種類を渡す形で cron の管理を提供します。

## いまの cron でできること {#what-cron-can-do-now}

cron のジョブでできることは次のとおりです。

- 一度きり、または繰り返しのタスクを予約する
- ジョブの一時停止・再開・編集・即時実行・削除
- ジョブにスキルを 0 個、1 個、または複数ひも付ける
- 結果を、依頼元のチャット、手元のファイル、設定済みのプラットフォームに届ける
- 通常の固定されたツール一覧を持つ、新しいエージェントのセッションで実行する
- **エージェントなしモード** で実行する。スクリプトを定期実行し、その標準出力をそのまま届けるだけで、LLM は一切関わりません（下の [エージェントなしモード](#no-agent-mode-script-only-jobs) の節を参照してください）

これらはすべて `cronjob` ツールを通して Hermes 自身も使えるので、普通の言葉で頼むだけでジョブの作成・一時停止・編集・削除ができます。CLI は要りません。

:::tip
**cron のジョブはどのモデルで動くのか。** 実行時に決まる順番は、ジョブごとの固定 → `config.yaml` の `cron.model` → `hermes model` で決めた全体の既定、です。

- **ジョブごとの固定** — *あなた* が、ダッシュボード、`hermes cron create/edit --model … --provider …`、または `~/.hermes/cron/jobs.json` の編集で設定します。一度決めたら、変えるまでそのままです。エージェントの `cronjob` ツールからジョブごとのモデルを設定したり変更したりはできません。推論の固定は利用者のものです。
- **`cron.model` / `cron.model_provider`** — cron 全体の既定です。固定されていないジョブはすべてこのモデルで動き、チャットで使うモデルとは切り離されます。一度設定しておけば（`hermes config set cron.model <name>`）、`hermes model` や `/model` でチャットのモデルを切り替えても cron 側には影響しません。
- **全体の既定** — 上のどちらも設定されていないときだけ、ジョブは `hermes model` に従います。この場合、Hermes は作成時にプロバイダーとモデルを **記録** しておき、あとで全体の既定が変わるとジョブは **安全側に倒れて失敗** します。つまりその回の実行を飛ばし、推論の呼び出しは行わず、**一度だけ** 知らせます。あなたが対応するか設定が元に戻るまで、以降の周期でもジョブは飛ばされたまま（そして静かなまま）です（#44585）。繰り返すジョブや再実行できるジョブでは、プロバイダーとモデルを明示的に固定して（`hermes cron edit <job_id> --provider <provider> --model <model>`）先へ進めてください。使い切った一度きりのジョブは更新できないので、プロバイダーとモデルを明示した新しい一度きりのジョブを未来に向けて作ってください。これは、見ていないジョブが有料のプロバイダーやモデルへの切り替えを黙って引き継いでしまうのを防ぐためです。`cron.model`（またはジョブごとの固定）を設定するのが、cron の費用を意図して振り分ける正しいやり方で、それでカバーされている軸には、このずれの防止は働きません。固定していないジョブに、変わっていく全体の既定を追わせたい運用者は、[ずれの防止を無効にできます](#letting-unpinned-jobs-track-global-defaults)。

ジョブがどのプロバイダーに落ち着いたとしても、そのプロバイダー固有のリクエスト設定（独自プロバイダー向けの `extra_body` / `extra_headers` といった `request_overrides` など）は、対話中のセッションと同じように予定された実行にも引き継がれます。

見ていないところで動かすなら、OAuth の更新が自動で行われる `hermes setup --portal` が一番手間がかかりません。[Nous Portal](/hermes/docs/integrations/nous-portal/) を参照してください。
:::

:::tip
**ジョブごとの思考の深さ。** ジョブは、モデルの固定とは別に、自分の思考の深さを固定できます。`none`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max`、`ultra` のいずれかです。設定すると、そのジョブの実行では全体の `agent.reasoning_effort` とモデルごとの `agent.reasoning_overrides` の両方を上書きします（`none` は思考を切ります）。設定は `hermes cron create/edit --reasoning-effort high` で行い、編集時に空の文字列を渡すと固定が外れて設定に従うようになります。（エージェントの `cronjob` ツールには意図的に出していません。モデルの設定は利用者が決めることだからです。）モデルが対応していない深さは、リクエストの時点でプロバイダー側が丸めるか無視します。`high` が上限のモデルに `xhigh` を固定しても `high` で動きます。`no_agent` のジョブには効きません（調整する LLM の呼び出しがそもそもありません）。重い定期分析は `high` で走らせ、安く繰り返すジョブは `minimal` で走らせる、といった使い分けを、全体の既定に触れずにできます。
:::

:::warning
cron から実行されたセッションが、さらに cron のジョブを作ることはできません。予約が際限なく増える輪を防ぐため、Hermes は cron の実行中に cron 管理のツールを無効にします。
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

いつもどおり Hermes に頼みます。

```text
Every morning at 9am, check Hacker News for AI news and send me a summary on Telegram.
```

Hermes は内部で、一つにまとまった `cronjob` ツールを使います。

## 実行前の設定チェック {#pre-dispatch-configuration-validation}

予約された実行のためにエージェントの仕掛けを組み立てる前に、スケジューラーは
そのジョブの設定で本当に実行が成功しうるかを確かめます。

- プロバイダーの API キーが解決できること（`fallback_providers` の連鎖が
  設定されている場合は飛ばします。主キーが無くても代替の経路で救えるためです）、
- ひも付いたスキルが使える状態にあること（必要な環境変数、コマンド、
  認証情報のファイルが欠けていないこと）、
- 配送先のプラットフォームが分かっていて、ゲートウェイの認証情報が設定されていること
  （`local` と `origin` の宛先は確認しません）。

チェックに落ちると、そのジョブの `last_status` は `blocked_config` になり、警告は
一度だけ届き（周期ごとに繰り返されることはありません）、**LLM の呼び出しは
行われません**。設定を間違えたジョブがトークンを使うことはありません。次に正常に
実行できたときにこの状態は解除されるので、将来また設定が壊れたときには改めて知らせます。

このチェックを無効にして以前の挙動に戻す（実行に進み、その途中で失敗する）には、
次のようにします。

```yaml
cron:
  preflight: false
```

あるいは `hermes config set cron.preflight false` です。

## 固定していないジョブに全体の既定を追わせる {#letting-unpinned-jobs-track-global-defaults}

モデルとプロバイダーのずれを防ぐ仕組みは、既定で有効です。固定していない cron の
ジョブに、全体のモデルやプロバイダーの変更をあえて追わせたい場合は、`config.yaml`
で無効にします。

```yaml
cron:
  model_drift_guard: false
```

設定コマンドでも構いません。

```bash
hermes config set cron.model_drift_guard false
```

これで、実行時の遮断と、全体の推論設定が変わったときの警告の両方が止まります。
記録済みの内容はそのまま残るので、この設定を `true` に戻せば、ジョブを作り直さなくても
保護が効くようになります。

:::warning
この仕組みを無効にすると、見ていない、固定されていないジョブは、変わった全体の既定を
すぐに引き継ぎます。有料のプロバイダーやモデルへ切り替えると、予約された実行のたびに
お金がかかる可能性があります。
:::

## スキルを使う cron のジョブ {#skill-backed-cron-jobs}

cron のジョブは、プロンプトを実行する前にスキルを一つ以上読み込めます。

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

スキルは並べた順に読み込まれます。プロンプトは、それらのスキルの上に重ねる作業の指示になります。

```python
cronjob(
    action="create",
    skills=["blogwatcher", "maps"],
    prompt="Look for new local events and interesting nearby places, then combine them into one short brief.",
    schedule="every 6h",
    name="Local brief",
)
```

これは、スキルの全文を cron のプロンプトに詰め込まずに、使い回せる進め方を予約されたエージェントに引き継がせたいときに便利です。

## プロジェクトのディレクトリの中でジョブを動かす {#running-a-job-inside-a-project-directory}

cron のジョブは、既定ではどのリポジトリからも切り離して動きます。`AGENTS.md`、`CLAUDE.md`、`.cursorrules` は読み込まれず、ターミナル・ファイル・コード実行のツールは、ゲートウェイが起動したときの作業ディレクトリから動きます。これを変えるには、`--workdir`（CLI）または `workdir=`（ツール呼び出し）を渡します。

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

- そのディレクトリの `AGENTS.md`、`CLAUDE.md`、`.cursorrules` がシステムプロンプトに差し込まれます（探す順番は対話式の CLI と同じです）
- `terminal`、`read_file`、`write_file`、`patch`、`search_files`、`execute_code` は、いずれもそのディレクトリを作業ディレクトリとして使います
- 指定する場所は、実在する絶対パスのディレクトリでなければなりません。相対パスや存在しないディレクトリは、作成や更新の時点で拒否されます
- 編集時に `--workdir ""`（ツールなら `workdir=""`）を渡すと設定が消え、元の挙動に戻ります

:::note 直列に実行されます
`workdir` を持つジョブは、スケジューラーの周期の中で並列の枠ではなく順番に実行されます。これは意図したものです。cron の実行役は、プロセス全体で共有されるターミナルの状態を通してジョブの作業ディレクトリを適用するので、workdir を持つジョブが二つ同時に動くと、互いの現在地を壊してしまいます。workdir の無いジョブは、これまでどおり並列で動きます。
:::

## ジョブを編集する {#editing-jobs}

内容を変えるためだけに、ジョブを消して作り直す必要はありません。

:::tip ジョブの指定
下（および [ライフサイクルの操作](#lifecycle-actions)）に出てくる `<job_id>` の部分には、ジョブの名前も使えます（大文字と小文字は区別しません）。`morning-digest` は覚えているのに 16 進数の ID は思い出せない、というときに便利です。ジョブ ID と完全に一致するものがあれば、名前の一致より優先されます。ID ではなく、名前が複数のジョブに一致した場合は、コマンドは実行を断り、候補の ID を並べるので、そこから選べます。
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

補足:

- `--skill` を繰り返すと、そのジョブにひも付くスキルの一覧を置き換えます
- `--add-skill` は、いまの一覧を置き換えずに追加します
- `--remove-skill` は、指定したスキルのひも付けを外します
- `--clear-skills` は、ひも付いたスキルをすべて外します

## ライフサイクルの操作 {#lifecycle-actions}

cron のジョブは、作成と削除だけではなく、もっと細かく扱えるようになりました。

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
- `resume` — ジョブを再び有効にし、次の実行時刻を計算します
- `run` — 次のスケジューラーの周期でジョブを走らせます
- `remove` — 完全に削除します
- `edit` — 予定、プロンプト、配送先などを変更します

**名前での指定。** 状態を変える四つの動詞（`pause`、`resume`、`run`、`remove`、`edit`）とエージェントの `cronjob` ツールは、16 進数の ID の代わりにジョブの **名前**（大文字と小文字は区別しません）も受け付けるようになりました。エージェントも CLI も、ID と完全に一致するものがあればそちらを優先します。名前が複数のジョブに一致してあいまいな場合は、候補の ID をすべて並べて実行を断るので、明示的に選べます。名前は一意ではないので、この守りが効いてきます。同じ名前のジョブが二つあるときに、間違ったほうを黙って書き換えてしまうのを防ぎます。

## エージェントに予約を任せる（cron のジョブが cron のジョブを管理する） {#agent-managed-scheduling-cron-jobs-that-manage-cron-jobs}

既定では、スケジューラー *から* 起動されたエージェントは `cronjob` ツールを使えません。
予約されたジョブが、他のジョブを作ったり編集したり削除したりはできない、ということです。
使いたい場合は `config.yaml` で許可します。

```yaml
cron:
  allow_agent_scheduling: true   # default: false
```

有効にすると、予約されたエージェントもチャットのセッションと同じように cron の表を
扱えます。予約された作業の中から続きの一度きりのジョブを予約したり、自分の間隔を
調整したり、表全体を整える「cron の司書」のようなジョブを走らせたり（一覧を取り、
必要に応じて更新・削除・作成する）できます。これが破綻しないように、二つの性質が
効いています。

- **表は一つで、持ち主は利用者です。** cron の実行から作られたジョブも、他のジョブと
  同じ `jobs.json` に入り、特別な所有権は付きません。自分で作ったのとまったく同じように
  一覧・編集・削除できます。
- **宙に浮いた配送はありません。** cron の実行は一時的なものなので、その中からの
  `deliver: origin` は **作成の時点で** 、作った側のジョブ自身の具体的な宛先
  （`platform:chat_id[:thread_id]`、作った側がどこにも配送しないなら `local`）に
  解決されます。予約されたエージェントが作ったジョブが、もう存在しないセッションへ
  出力を向けてしまうことはありません。明示的な宛先
  （`local`、`all`、`telegram:<chat_id>`）はそのまま尊重されます。

実行のたびに新しいジョブを作るようなプロンプトより、既存のジョブを更新する
プロンプト（まず一覧を取り、ID で更新する）のほうが向いています。

## 仕組み {#how-it-works}

**cron の実行はゲートウェイのデーモンが受け持ちます。** ゲートウェイは 60 秒ごとにスケジューラーを進め、時刻の来たジョブを、分離されたエージェントのセッションで実行します。

```bash
hermes gateway install     # Install as a user service
sudo hermes gateway install --system   # Linux: boot-time system service for servers
hermes gateway             # Or run in foreground

hermes cron list
hermes cron status
```

### ゲートウェイのスケジューラーの動き {#gateway-scheduler-behavior}

周期ごとに Hermes は次のことをします。

1. `~/.hermes/cron/jobs.json` からジョブを読み込む
2. `next_run_at` を現在時刻と比べる
3. 時刻の来たジョブごとに、新しい `AIAgent` のセッションを開始する
4. 必要なら、ひも付いたスキルをその新しいセッションに差し込む
5. プロンプトを最後まで実行する
6. 最終的な応答を配送する
7. 実行の記録と次の予定時刻を更新する

`~/.hermes/cron/.tick.lock` のファイルロックが、周期の重なりによって同じジョブの束が二重に実行されるのを防ぎます。

### 実行の履歴 {#execution-history}

Hermes は、実行役やプロバイダーに渡す前に、受け付けた cron の試行をプロファイルごとの
`~/.hermes/cron/executions.db` に記録します。試行は `claimed`、`running` を経て、
変更できない終端の状態、つまり `completed`、`failed`、`unknown` のいずれかに落ち着きます。
再起動のあと、Hermes が途中で放置された試行を `unknown` にするのは、元の PID と
プロセス開始時の指紋から、その持ち主がもういないと確かめられたときだけです。
unknown の試行は監査のための記録で、自動的に再実行されることはありません。

最近の試行は `hermes cron runs [job-id] --limit 20`（別名は
`history`）で確認できます。終端の履歴には上限がありますが、動いている試行が
消されることはありません。この記録は簡易バックアップにも含まれます。

### 失敗が続いたときの見直しの促し {#repeated-failure-review-nudge}

ジョブはそれぞれ `failure_streak` を数えます。続けて失敗した回数のことです（配送の
失敗は数えません）。エージェントに到達する前に失敗した回、たとえば中途半端に適用された
更新のせいで import が壊れた、プロバイダーのクライアントを組み立てられなかった、
といった場合も、エージェント自身が失敗した場合と同じように数えられ、同じように
知らせます。*繰り返す* ジョブの連続失敗がしきい値に達すると、チャットに届く失敗の
メッセージに見直しの促しが加わり、N 回続けて失敗していることを伝えて、直すか、
一時停止するか（`hermes cron pause <job>`）、削除するかを勧めます。一度でも成功すれば
数はゼロに戻り、`hermes cron list` では失敗しているジョブの最終実行の横にこの数が出ます。
一度きりのジョブでは促しは出ません。

```yaml
cron:
  failure_nudge_threshold: 3   # default; 0 disables the nudge
```

### 失敗の記録: 分かっている失敗を了解済みにする {#failure-incidents-acknowledge-a-known-failure}

繰り返すジョブが *同じ* エラーで失敗し続けると、実行のたびに通知が飛びます。
それぞれの失敗は、ジョブとエラー文を正規化した特徴を鍵として、実行の履歴と同じ
プロファイルごとの記録用データベースに、消えない **できごと** としても残ります。

```bash
hermes cron incidents                 # list incidents (newest activity first)
hermes cron incidents --state alerted # filter: detected | alerted | closed
hermes cron incidents ack <id>        # acknowledge — stop re-pinging
```

できごとを了解済みにすると、その特徴とまったく同じ失敗についてだけ、実行ごとの
通知が止まります。それ以外は何も変わりません。実行の履歴には失敗がすべて残り、
連続失敗の数も数え続け、*別の* エラーで失敗し始めた瞬間に新しいできごとが作られて
通知がまた飛びます。実行が成功してもできごとには触れません。できごとはジョブ単位では
なく、特徴ごとのものだからです。

できごとの移り変わりは、`detected`（失敗を記録）→ `alerted`（失敗の通知が少なくとも
一度配送された）→ `closed`（了解済み。その特徴については終わり）です。保存されるエラー文は、
書き込む前に秘密を伏せ、長さを切り詰めます。

記録は常に行われ、無視しても何のコストもかかりません。あなたが明示的に `ack` するまで、
通知が抑えられることはありません。

## 配送先の選択肢 {#delivery-options}

ジョブを予約するとき、出力の届け先を指定します。

| 選択肢 | 説明 | 例 |
|--------|-------------|---------|
| `"origin"` | ジョブを作った場所に返します | メッセージ系プラットフォームでの既定 |
| `"local"` | 手元のファイルにだけ保存します（`~/.hermes/cron/output/`） | CLI での既定 |
| `"telegram"` | Telegram のホームチャンネル | `TELEGRAM_HOME_CHANNEL` を使います |
| `"telegram:123456"` | ID で指定した Telegram のチャット | 直接配送します |
| `"telegram:-100123:17585"` | 指定した Telegram のトピック | `chat_id:thread_id` の形式 |
| `"discord"` | Discord のホームチャンネル | `DISCORD_HOME_CHANNEL` を使います |
| `"discord:#engineering"` | 指定した Discord のチャンネル | チャンネル名で指定します |
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
| `"bot-chat"` | このプロファイル本来の Bot Chat。ボットが出力を読んで応答します | 同じ機械の中 |
| `"bot-chat:research"` | 同じ機械の別プロファイルの Bot Chat | 作成時に確認します |
| `"all"` | つながっているホームチャンネルすべてに配ります | 実行時に解決します |
| `"telegram,discord"` | 指定した一群のチャンネルに配ります | カンマ区切りの並び |
| `"origin,all"` | 依頼元に **加えて** 、つながっている他のすべてのチャンネルに届けます | どの指定も組み合わせられます |

エージェントの最終的な応答は、設定した `deliver:` の宛先へ自動的に届きます。エージェント自身がメッセージを送るわけではないので、cron のプロンプトの中で何かを呼ぶ必要はありません。

### Bot Chat への配送（`bot-chat`） {#bot-chat-delivery-bot-chat}

`bot-chat` は、出力を **そのプロファイル本来の「Bot Chat」のセッションへ、本物のメッセージとして** 届けます。他の宛先ではチャンネルを読む人間が受け手ですが、ここでの受け手はボット自身です。ボットは出力を届いたメッセージとして受け取り、対応が要るものに対応し、自分のチャットで応答します。予約された出力を、ただ投稿するのではなく *処理させたい* ときに使ってください。

- `bot-chat`（そのまま）は、そのジョブ自身のプロファイルを指します。
- `bot-chat:<profile>` は、**同じ機械の上の** 別のプロファイルを指します。名前はジョブの作成時に `hermes profile list` と照合されます。他のゲートウェイや他の機械にあるプロファイルは指定できないので、機械をまたいで同じ名前があってもあいまいになりません。
- 配送のたびに、相手のボットはエージェントとしてまるまる一往復を消費します。実行の頻度にご注意ください。
- 他の宛先と組み合わせられますが（`bot-chat,telegram`）、`all` には決して含まれません。

### 配送の意図（`all`） {#routing-intent-all}

`all` を使うと、一つの cron のジョブの結果を、設定済みのメッセージ用チャンネルすべてに、名前を並べずに届けられます。**実行の時点で解決される** ので、Telegram をつなぐ前に作ったジョブでも、`TELEGRAM_HOME_CHANNEL` を設定すれば次の周期から Telegram にも届くようになります。

意味としては、`all` はホームチャンネルが設定されているプラットフォームすべてに展開されます。0 個でも構いません。その場合ジョブは配送先を持たず、上流では配送の失敗として記録されます。

`all` は明示的な宛先と組み合わせられます。`origin,all` は依頼元のチャットに *加えて* 、つながっている他のすべてのホームチャンネルにも届け、`(platform, chat_id, thread_id)` で重複を取り除きます。

### Telegram の cron 用トピック（`TELEGRAM_CRON_THREAD_ID`） {#telegram-cron-topic-telegramcronthreadid}

Telegram のトピックモードを有効にしていると、直下の DM はシステム用の待合室として確保されます。そこへの返信は待合室の案内とともに押し返され、`reply_to_message_id` も落ちるので、メインのチャットに届いた cron のメッセージには返信できません。

代わりに、cron 専用のフォーラムのトピックを用意して、そこへ向けてください。

1. Telegram でボットの DM を開き、たとえば `Cron` という名前のトピックを作ります。トピックの見出しを長押しして **リンクをコピー** すると、末尾の整数がそのトピックの `message_thread_id` です。
2. `.env` に `TELEGRAM_CRON_THREAD_ID=<that id>` を設定します。

これは cron の配送にだけ効きます。他の用途（たとえば再起動の通知）で使う `TELEGRAM_HOME_CHANNEL_THREAD_ID` は変わりません。明示的な `deliver="telegram:chat_id:thread_id"` の宛先は、引き続き環境変数より優先されます。cron のメッセージへの返信は、そのトピックの既存のセッションに届くので、そのまま話を続けられます。

### 応答の包み {#response-wrapping}

既定では、配送される cron の出力は、予約されたタスクから来たものだと受け手に分かるよう、見出しと末尾の注記で包まれます。

```
Cronjob Response: Morning feeds
-------------

<agent output here>

Note: The agent cannot see this message, and therefore cannot respond to it.
```

包まずにエージェントの出力そのままを届けたい場合は、`cron.wrap_response` を `false` にします。

```yaml
# ~/.hermes/config.yaml
cron:
  wrap_response: false
```

### 続きを話せるジョブ（cron の配送に返信する） {#continuable-jobs-reply-to-a-cron-delivery}

既定では、cron の配送は投げっぱなしです。メッセージは送られますが、そのチャットの
会話の履歴には残らないので、返信してもエージェントには自分が何を言ったかの記録が
ありません。ジョブを **続きを話せる** 設定にすると、届いた要約が返信のできる会話に
変わります。エージェントは「タスク #2 とは何ですか」と聞き返さず、要約を文脈として
持っています。

これは選んで使うもので、**既定は無効** です。設定で全体に有効にするか、`cronjob`
ツールの `attach_to_session`（そのジョブについては全体の設定より優先されます）で
ジョブごとに有効にします。

```yaml
# ~/.hermes/config.yaml
cron:
  mirror_delivery: false   # set true to make cron deliveries continuable
```

挙動は **スレッドを優先** し、そのジョブの依頼元のチャットに閉じています。

- **スレッドを扱えるプラットフォーム**（Telegram のトピック、Discord や Slack の
  スレッド）: 配送のたびに専用のスレッドが開かれ、要約はそのスレッドのセッションに
  差し込まれるので、スレッドの中で返信すれば十分な文脈のまま続けられます。繰り返す
  ジョブ（たとえば毎日の要約）は実行ごとに新しいスレッドを開くので、配送ごとの
  やり取りが混ざりません。
- **DM しかないプラットフォーム**（WhatsApp、Signal、SMS）: スレッドが無いので、要約は
  依頼元の DM のセッションに写されます。DM そのものが続きを話す場になります。

触れられるのは、そのジョブ **自身の会話** だけです。

- ジョブが作られた **依頼元のチャット**。
- `deliver: origin` が依頼元を拾えなかったときの **ホームチャンネルへの引き受け**
  （ゲートウェイの実際のチャットからではなく、スクリプトや API から作られた
  ジョブの場合）。依頼元の代わりに、その利用者のいちばん主となる会話が使われます。
- そのジョブが `platform:chat` の形で **一つだけ明示している宛先**。ただし、
  ジョブ自身が `attach_to_session: true` で有効にしたときに限ります。その宛先を
  会話として扱う、とジョブの作成者が宣言したことになるからです。全体の
  `mirror_delivery` だけでは、宛先を明示したチャットが続きを話せるように
  なることはありません。

広く配る宛先（`all` や、プラットフォーム名だけを指定したときのホームチャンネル）が
続きを話せるようになることはありません。写しは札の付いた
利用者の発言（`[Cron delivery: <task name>]`）として書かれるので、どのモデルの
プロバイダーでも会話の交互のつながりが崩れません。

#### チャンネルにそのまま続ける（Slack） {#flat-in-channel-continuation-slack}

上で説明したスレッド優先の挙動では、配送のたびに専用のスレッドが作られます。
続きを話せるジョブを **チャンネルの流れにそのまま** 出したい、スレッドは要らない、
という場合は、Slack の **続きを話す場** を `in_channel` に設定します。

```yaml
# ~/.hermes/config.yaml
slack:
  cron_continuable_surface: in_channel   # default: thread
  reply_in_thread: false                 # required pairing (see below)
  require_mention: false                 # so a plain reply continues the job
```

`in_channel` のモードでは、要約は普通のチャンネル直下のメッセージとして配送され
（スレッドは開かれません）、あなたの返信はチャンネル共有のセッションを通してジョブを
続けます。三つの設定が組み合わさって働きます。

- **`cron_continuable_surface: in_channel`** — 配送時のスレッド作成を飛ばします。
- **`reply_in_thread: false`**（必須） — ボットがあなたの返信に *そのまま* チャンネルで
  答え、要約が差し込まれたのと同じチャンネル全体のセッションにひも付けます。これが
  無くても続きは動きますが、スレッドの中に届きます（安全にスレッド形式の続きへ
  落ちるだけで、返信が消えることはありません。食い違いに気づけるよう、ゲートウェイは
  起動時に警告を記録します）。
- **`require_mention: false`**（またはそのチャンネルを `free_response_channels` に追加）
  — 普通のメッセージで返信できるようにするためです。そうしないと、返信のたびに
  `@` で呼びかけないとボットは起きません。

続きの場が **チャンネル全体** のセッションになるので、これは共有されます。チャンネルの
他の雑談も、二つめの続きを話せるチャンネル内ジョブも、同じ流れの会話に加わります。
これは「チャンネルにそのまま出す」ことに元から付いてくるもので、`reply_in_thread: false`
を使う人がすでに受け入れているのと同じ引き換えです。配送ごとのやり取りを分けたいなら、
既定の `thread` の場を使ってください。

これは今のところ Slack の機能です。他のプラットフォームはこの設定を受け付けますが、
`thread` の場に落ちます（続きを支える仕組みが違うためです）。選択はプラットフォームごとで、
それぞれの設定の下に書きます。これはゲートウェイ側の設定なので、`/restart` で読み込まれます。
Slack アプリを入れ直す必要はありません。

:::note 1 対 1 の DM
`cron_continuable_surface` は **チャンネル** 向けの設定です。1 対 1 の DM には
スレッドか流れかという選択がそもそもありません（DM はすでにそのままの流れです）ので、
この設定は効きません。DM の cron の配送で続きを話せるかどうかを決めるのは、別に
以前からある **`slack.dm_top_level_threads_as_sessions`** というつまみです。

- **`false`** — 直下のすべての DM が一つの流れの DM セッションを共有するので、続きを
  話せる cron の要約とあなたの返信が **同じ** セッションに入り、文脈を保ったまま
  ジョブが続きます。DM で続きを話せる cron を使いたいなら、これです。
- **`true`**（既定） — 直下の DM のメッセージがそれぞれ独立したセッションになるので、
  届いた要約への返信は要約の記録を持たない *新しい* セッションを始めてしまいます。
  このモードでは続きは動きません（cron でも、他のそのままの配送でも同じです）。

したがって、1 対 1 の DM に届ける続きを話せる cron のジョブでは、
`slack.dm_top_level_threads_as_sessions: false` を設定してください。DM では
`cron_continuable_surface` は不要です（設定しても無視されます）。
:::

### 黙って止める {#silent-suppression}

エージェントの最終的な応答に `[SILENT]` が含まれていると、配送はまるごと止まります。出力は監査のために手元（`~/.hermes/cron/output/`）へ保存されますが、配送先にメッセージは送られません。

これは、何かおかしいときだけ報告してほしい監視のジョブに便利です。

```text
Check if nginx is running. If everything is healthy, respond with only [SILENT].
Otherwise, report the issue.
```

失敗したジョブは `[SILENT]` の印にかかわらず必ず配送されます。黙らせられるのは成功した実行だけです。静かな監視のジョブにするには、報告することが無いときは `[SILENT]` だけを返すようエージェントに指示してください。

## スクリプトの制限時間 {#script-timeout}

実行前のスクリプト（`script` の引数でひも付けるもの）には、既定で 3600 秒（1 時間）の制限時間があります。これが縛るのは **スクリプトだけ** です。スキルや LLM で動くジョブは別の無操作時間の枠で動き、この値では制限されません。スクリプトに別の上限が要る場合は、変更できます。

```yaml
# ~/.hermes/config.yaml
cron:
  script_timeout_seconds: 1800   # 30 minutes
```

環境変数 `HERMES_CRON_SCRIPT_TIMEOUT` でも設定できます。決まる順番は、環境変数 → config.yaml → 既定の 3600 秒です。

cron は、実行後のセッションとエージェントの資源の後片付けにも上限をかけます。これは LLM の一往復が返ったあとに起きるので、無操作の制限時間とは別ものです。既定は後片付けの操作ごとに 10 秒です。保存や通信の後始末が返らなくなった場合、スケジューラーはエラーを記録し、そのジョブの実行中の印を解放して、以降の実行を通します。そのジョブが永久に飛ばされ続けることはありません。

```yaml
# ~/.hermes/config.yaml
cron:
  cleanup_timeout_seconds: 10
```

`cleanup_timeout_seconds: 0` は、上限の無い昔の後片付けの挙動に戻したいときだけ設定してください。

## メディア送信の制限時間 {#media-send-timeout}

cron の配送に、生きたゲートウェイのアダプター経由で送る添付（生成した PDF、読み上げ音声、書き出した報告書）が含まれる場合、添付ごとのアップロードに制限時間がかかります。既定は 300 秒です。回線の細いところで大きなファイルを送るなら、もっと必要かもしれません。

```yaml
# ~/.hermes/config.yaml
cron:
  media_send_timeout_seconds: 600   # 10 minutes per attachment
```

環境変数 `HERMES_CRON_MEDIA_SEND_TIMEOUT` でも設定できます。決まる順番は、環境変数 → config.yaml → 既定の 300 秒です。制限時間を超えた添付は、ジョブの実行状態に部分的な配送の失敗として記録されます（本文は届きます）。

## Bot Chat への配送の制限時間 {#bot-chat-delivery-timeout}

`bot-chat` への配送は、相手のボットのチャットでエージェントの一往復をまるまる走らせるので、上限は秒ではなく分の単位です。既定は 600 秒です。

```yaml
# ~/.hermes/config.yaml
cron:
  bot_chat_delivery_timeout_seconds: 900
```

制限時間を超えた配送は `last_delivery_error` に記録されます。ボット側の一往復は、そのまま自力で終わることもあります。

## エージェントなしモード（スクリプトだけのジョブ） {#no-agent-mode-script-only-jobs}

LLM の推論が要らない繰り返しのジョブ、たとえば昔ながらの見張り、ディスクやメモリの警告、生存確認、CI への通知には、作成時に `no_agent=True` を渡します。スケジューラーはあなたのスクリプトを予定どおり実行し、その標準出力をそのまま届けて、エージェントはまるごと飛ばします。

```bash
hermes cron create "every 5m" \
  --no-agent \
  --script memory-watchdog.sh \
  --deliver telegram \
  --name "memory-watchdog"
```

意味は次のとおりです。

- スクリプトの標準出力（前後の空白を落としたもの）が、そのままメッセージとして届きます。
- **標準出力が空なら、その周期は黙って終わり**、配送はされません。これが見張りの型です。「おかしいときだけ何か言う」というやり方です。
- 0 以外の終了コードや制限時間の超過では、エラーの警告が届くので、壊れた見張りが黙って死んでいることはありません。
- 最後の行が `{"wakeAgent": false}` なら、その周期は黙って終わります（LLM のジョブと同じ関門です）。
- トークンも、モデルも、プロバイダーの切り替えもありません。このジョブは推論の層に一切触れません。

`.sh` と `.bash` のファイルは、`PATH` にあれば `bash` で、無ければ `/bin/bash` で実行されます（Windows の Git Bash では大事な点です）。それ以外は、いま動いている Python の処理系（`sys.executable`）で実行されます。スクリプトは `$HERMES_HOME/scripts/` の中に解決されなければなりません。相対の名前、絶対パス、`~` で始まるパスは、解決した先がそのディレクトリの中にとどまるなら受け付けられ、外に出るパスは拒否されます。子プロセスの環境は掃除されるので（`_sanitize_subprocess_env`）、プロバイダーの API 認証情報など Hermes が管理する秘密が cron のスクリプトに引き継がれることは **ありません**。

### エージェントが用意してくれます {#the-agent-sets-these-up-for-you}

`cronjob` ツールの定義には `no_agent` がそのまま出ているので、チャットで見張りの内容を伝えれば、あとはエージェントが組み立ててくれます。

```text
Ping me on Telegram if RAM is over 85%, every 5 minutes.
```

Hermes は `write_file` で確認用のスクリプトを `~/.hermes/scripts/` に書き、そのうえで次を呼びます。

```python
cronjob(action="create", schedule="every 5m",
        script="memory-watchdog.sh", no_agent=True,
        deliver="telegram", name="memory-watchdog")
```

メッセージの中身がスクリプトだけで決まる場合（見張り、しきい値の警告、生存確認）は、自動的に `no_agent=True` を選びます。同じツールでジョブの一時停止・再開・編集・削除もできるので、誰も CLI に触れずに、すべてチャットから回せます。

手を動かした例は [スクリプトだけの cron ジョブの手引き](/hermes/docs/guides/cron-script-only/) を参照してください。

## `context_from` でジョブをつなぐ {#chaining-jobs-with-contextfrom}

cron のジョブは、前回の実行を覚えていない分離されたセッションで動きます。とはいえ、あるジョブの出力こそが次のジョブに必要なもの、という場面もあります。`context_from` の引数は、そのつながりを自動で作ります。ジョブ B のプロンプトの前に、ジョブ A の直近の出力が実行時に文脈として差し込まれます。

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

- ジョブ 2 の時刻が来ると、Hermes は `~/.hermes/cron/output/{job1_id}/*.md` からジョブ 1 の直近の出力を読みます
- その出力が、ジョブ 2 のプロンプトの前に自動で差し込まれます
- ジョブ 2 は「このファイルを読め」と書いておく必要がありません。内容を文脈として受け取ります
- つながりの長さに制限はありません。ジョブ 1 → ジョブ 2 → ジョブ 3 → …

**`context_from` に渡せるもの:**

| 形式 | 例 |
|--------|---------|
| ジョブ ID を一つ（文字列） | `context_from="a1b2c3d4"` |
| ジョブ ID を複数（配列） | `context_from=["job_a", "job_b"]` |

出力は、並べた順につなげられます。

**継続: 前回の実行の出力を持ち越す**

`continuity=true` を設定すると、そのジョブは *自分自身* の直近の出力を毎回の実行に差し込みます。繰り返すジョブは、ふだんは毎回まっさらな状態から始まります。ニュースの探索役は同じ記事を何度も報告し、監視役は同じ状態で何度も警告します。継続を有効にすると、ジョブは前回自分が何を報告したかを見た状態で目覚めるので、重複を省いて続きから進められます。

```python
cronjob(
    action="create",
    prompt="Scan HN and arXiv for new agent-tooling papers. Report only items NOT already covered in your previous run's output.",
    schedule="every 6h",
    continuity=True,
    name="Agent Tooling Scout",
)
```

初回の実行には前の出力が無いので、プロンプトはそのまま実行されます。以降の実行では、前回の出力が「すでに報告したことを繰り返さないように」という枠組みとともに前に差し込まれます。上流のジョブとも自由に組み合わせられ（`context_from=["<other_job_id>"]` と `continuity=true` の併用）、更新時に `continuity=false` にすると、他の `context_from` の項目を残したままこれだけを切れます。内部では、この設定は `context_from` の中の予約語 `self` として保存されます。

CLI からは `hermes cron create "every 6h" "Scan for news" --continuity` で、既存のジョブには `hermes cron edit <job_id> --continuity` / `--no-continuity` で切り替えます。同じ切り替えは、ダッシュボードの cron 編集画面と、デスクトップの Bot Mode の定型作業のダイアログにもあります。

**どんなときに使うか:**

- 多段の流れ作業（集める → 選ぶ → 整える → 届ける）
- 手順 N の作業が手順 N−1 の出力に依存する、つながったタスク
- 一つのジョブが複数のジョブの結果をまとめる、分けて集める形
- 自分の前回の報告と照らして重複を省くべき、繰り返しの探索役や監視役（`continuity=true`）

## プロバイダーの復旧 {#provider-recovery}

cron のジョブは、設定済みの代替プロバイダーと認証情報の使い回しをそのまま引き継ぎます。主となる API キーが利用制限に当たったり、プロバイダーがエラーを返したりした場合、cron のエージェントは次のことができます。

- `config.yaml` に `fallback_providers`（または以前の `fallback_model`）を設定していれば、**別のプロバイダーに切り替える**
- 同じプロバイダーの [認証情報のプール](/hermes/docs/user-guide/configuration/#credential-pool-strategies) の中で、**次の認証情報に回す**

つまり、頻繁に走る cron のジョブや、混み合う時間帯に走るジョブは、より粘り強くなります。キーが一つ利用制限に当たっただけで、実行全体が失敗することはありません。

## 予定した実行の取りこぼし（`last_fire_error`） {#missed-scheduled-fires-lastfireerror}

ホスト型（cron を任せる形）の環境では、予約された実行はプラットフォームのスケジューラーからダッシュボードを経て、ゲートウェイの内部 API サーバーへと渡ります。この最後の受け渡しが失敗した場合、たとえばゲートウェイのプロセスが落ちていたり、その API サーバーの待ち受けが立ち上がっていなかったりすると、実行そのものが始まりません。だから実行の記録も無く、確かめられる `last_status` もありません。見分け方は分かりやすく、手で実行すれば毎回うまくいくのに、自動では一度も動かない、という形です。

こうした取りこぼしは、ジョブの記録に `last_fire_error`（時刻と理由）として刻まれ、次の場所に現れます。

- `cronjob` ツールの `action: "list"` — `last_fire_error` の項目
- `hermes cron list` — ジョブの下に赤い `⚠ Missed scheduled fire:` の行
- ダッシュボードのジョブ画面

この印は常に **いまの** 自動実行の健全さを表します。新しい取りこぼしで上書きされ、次に実行が成功すると自動的に消えます。これが見えたら、ジョブと予定そのものは問題ありません。手当てが要るのは実行を届ける経路のゲートウェイ側です（多くの場合、プロファイルの環境をきちんと読み込ませるために、監視役を通してゲートウェイを再起動します: `hermes gateway restart`）。

### 取りこぼしの取り戻し {#misfire-catch-up}

外部のスケジューラーが動いている場合（ホスト型で cron を任せている場合）、ゲートウェイは取り戻しの掃引も行います。予定の時刻を過ぎても実行が届かず、猶予の時間も過ぎたジョブは、手元で引き受けて実行されます。だから実行の受け渡しが止まっても、失うのは丸一日ではなく数分で済みます。この掃引は、通常の実行と同じ受け付けの仕組みを使うので、スケジューラー側の遅れた再試行と重複しません。

```yaml
cron:
  misfire_grace_minutes: 10   # wait this long for the scheduler's own retries
                              # before catching up locally; 0 disables catch-up
```

手元で動かす（内蔵の刻み役を使う）環境では、これは要りません。刻み役は次の周期で、時刻を過ぎたジョブをすでに拾います。

## 予定の書き方 {#schedule-formats}

エージェントの最終的な応答は、ジョブの `deliver:` の宛先へ自動的に届きます。エージェント自身がメッセージを送ることはもうないので、利用者に見せたい内容はそのまま最終的な応答に書けば済みます。**追加の宛先や別の宛先** に届けたい場合は、エージェントに送らせるのではなく、cron のジョブに複数の `deliver:` の宛先を並べてください（カンマ区切り。たとえば `deliver: "telegram,discord"`）。

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

時刻は `9am`、`9:30pm`、`14:00`、24 時間表記の時だけを書いた形（`at 7`）、`noon`、`midnight` を受け付けます。これらの書き方は内部で cron の式に変換されます（変換には `croniter` パッケージが必要で、既定で導入済みです）。

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

| 予定の種類 | 既定の繰り返し | 挙動 |
|--------------|----------------|----------|
| 一度きり（`in 30m`、時刻） | 1 | 一度だけ実行します |
| 間隔（`every 2h`） | 無期限 | 削除するまで実行します |
| cron の式 | 無期限 | 削除するまで実行します |

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

エージェント向けの入り口は、一つのツールだけです。

```python
cronjob(action="create", ...)
cronjob(action="list")
cronjob(action="update", job_id="...")
cronjob(action="pause", job_id="...")
cronjob(action="resume", job_id="...")
cronjob(action="run", job_id="...")
cronjob(action="remove", job_id="...")
```

`update` では、`skills=[]` を渡すとひも付いたスキルをすべて外せます。

### 手動の実行は非同期です {#manual-runs-are-asynchronous}

`cronjob(action="run")` は、ジョブをすぐに **背後で** 実行します（`delegate_task` と
同じ形です）。ツールの呼び出しは取っ手を返してすぐ戻り、実行が終わるとその結果、
つまり成否・配送先・次の予定・出力の抜粋が、新しいメッセージとして会話に戻ってきます。
その間、エージェント（とあなた）は作業を続けられますし、すでに実行中のジョブは
二重に走らせず「already running」として断られます。

`action="run"` に `prompt` を添えれば、その回かぎりの文脈を差し込めます。

```python
cronjob(action="run", job_id="...", prompt="CONTEXT: focus on the EU region today")
```

この文脈は、その一回の実行のあいだだけ `## Run Context` という見出しの下に、
ジョブに保存されたプロンプトへ追記されます。ジョブの定義に残ることはなく、
保存済みのプロンプトと同じプロンプトインジェクションの検査も通ります。

切り離された結果を受け取れない実行環境（一度きりの `hermes -z`、CLI からの `hermes
cron run`、cron の子セッション、Kanban の作業役）は、自動的に同期の実行に落ちます。

## cron のジョブが使えるツール群 {#toolsets-available-to-cron-jobs}

cron は、チャットのプラットフォームがつながっていない新しいエージェントのセッションで、ジョブをそれぞれ実行します。既定では、cron のエージェントには **`hermes tools` で `cron` のプラットフォームに設定したツール群** が渡ります。CLI の既定でも、ありったけのツールでもありません。

```bash
hermes tools
# → pick the "cron" platform in the curses UI
# → toggle toolsets on/off just like you would for Telegram/Discord/etc.
```

ジョブごとにもっと細かく決めたい場合は、`cronjob.create` の `enabled_toolsets` の項目（既存のジョブなら `cronjob.update`）で指定できます。

```text
cronjob(action="create", name="weekly-news-summary",
        schedule="every sunday 9am",
        enabled_toolsets=["web", "file"],      # just web + file, no terminal/browser/etc.
        prompt="Summarize this week's AI news: ...")
```

ジョブに `enabled_toolsets` が設定されていればそれが勝ち、無ければ `hermes tools` の cron 向けの設定が勝ち、それも無ければ Hermes が内蔵の既定に落ちます。これは費用の面で効いてきます。小さな「ニュースを取ってくる」だけのジョブにまで `browser` や `delegation` を持たせると、LLM を呼ぶたびにツールの定義でプロンプトが膨らみます。

### エージェントをまるごと飛ばす: `wakeAgent` {#skipping-the-agent-entirely-wakeagent}

cron のジョブに事前チェックのスクリプト（`script=` で指定）をひも付けている場合、そのスクリプトは実行時に、Hermes がそもそもエージェントを呼ぶべきかどうかを決められます。標準出力の最後の行に、次の形を出してください。

```text
{"wakeAgent": false}
```

…すると cron は、その周期についてエージェントの実行をまるごと飛ばします。1〜5 分おきのような頻繁な確認で、状態が実際に変わったときだけ LLM を起こしたい場合に便利です。そうしないと、中身の無いエージェントの往復に何度もお金を払うことになります。

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

`wakeAgent` を省いた場合の既定は `true`（いつもどおりエージェントを起こす）です。

#### 使い方の例: 安上がりな実行前の関門 {#recipes-cheap-pre-run-gates}

`wakeAgent` の関門は、予約されたジョブが LLM のトークンを使うべきかどうかを 0 円で決める手立てになります。三つの型で、たいていの用途は足ります。

**ファイルの変化で判断する関門** — 見張っているファイルに、前回うまくいった周期のあと新しい内容が入ったときだけ実行します。スケジューラーは各ジョブの `last_run_at` を記録するので、それをファイルの更新時刻と比べます。

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

**外部の合図で判断する関門** — 別の処理が準備完了を知らせたときだけ実行します（たとえば配備の仕掛けがファイルを置く、CI のジョブがあなたの状態保管庫に値を書く、など）。

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

**SQL の件数で判断する関門** — 自分のデータベースに処理すべき新しい行があるときだけ実行します。スクリプトは `context` を通してその件数をエージェントに渡せるので、エージェントは問い合わせ直さずに、どれだけの量を扱うのかを把握できます。

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

同じ型は、スクリプトから問い合わせられるデータ源なら何にでも使えます。Postgres でも、HTTP の API でも、自分の状態保管庫でも構いません。cron の仕組みの中に SQL の評価器を作り込む必要はありません。

:::tip
Hermes 自身の `~/.hermes/state.db` は内部の構造で、版が変わると中身も変わります。実行前の関門からこれを問い合わせないでください。自分のデータベースやデータ源を見てください。
:::

謝辞: この一連の例は、@iankar8 さんが [#2654](https://github.com/NousResearch/hermes-agent/pull/2654) で試したことがきっかけで生まれました。そこでは、sql / file / command のきっかけを別の仕組みとして足す案が出ていました。`script` と `wakeAgent` の関門で三つとも 0 円ですでに賄えるので、この成果は文書という形で取り込まれました。

### ジョブをつなぐ: `context_from` {#chaining-jobs-contextfrom}

cron のジョブは、他のジョブの名前（または ID）を `context_from` に並べることで、そのジョブが直近に成功したときの出力を受け取れます。

```text
cronjob(action="create", name="daily-digest",
        schedule="every day 7am",
        context_from=["ai-news-fetch", "github-prs-fetch"],
        prompt="Write the daily digest using the outputs above.")
```

指定したジョブの直近の完了時の出力が、この実行の文脈としてプロンプトの上に差し込まれます。上流の項目は、いずれも有効なジョブの ID か名前でなければなりません（`cronjob action="list"` を参照）。注意点として、このつなぎ方が読むのは *直近に完了した* 出力です。同じ周期で動いている上流のジョブを待つわけではありません。

## ジョブの保管場所 {#job-storage}

ジョブは `~/.hermes/cron/jobs.json` に保存されます。実行の出力は `~/.hermes/cron/output/{job_id}/{timestamp}.md` に保存されます。

ジョブの定義はディスク上のただの JSON なので、`hermes update` でも、ゲートウェイの再起動でも、機械の再起動でも残ります。再起動のときに実行中だったジョブは、実行の記録では `unknown` と印が付きます。自動で再試行はされませんが、そのジョブの次の予定の周期は普通に動きます。詳しくは [実行の履歴](#execution-history) を参照してください。

:::tip
ジョブの管理は、`jobs.json` を直接いじるのではなく、`cronjob` ツール、`hermes cron edit`、`/cron` を通してエージェントに頼んでください。直接の編集は、[ファイル書き込みの安全装置](/hermes/docs/user-guide/security/#file-write-safety) がその場所を遮っているとき（たとえば `HERMES_WRITE_SAFE_ROOT` が設定されているとき）に黙って失敗することがあります。何も保存されなかったことを確実に教えてくれるのは、[ファイル変更の確認役](/hermes/docs/user-guide/configuration/#file-mutation-verifier) が付ける末尾の表示です。
:::

ジョブは `model` と `provider` を `null` のまま保存することがあります。これらの項目が無い場合、Hermes は実行の時点で全体の設定から解決します。ジョブの記録にこれらが現れるのは、ジョブごとの上書きが設定されているときだけです。

保存にはファイルの原子的な書き込みを使うので、書き込みが途中で止まっても、中途半端なジョブのファイルが残ることはありません。

## プロンプトはそれだけで完結させる {#self-contained-prompts-still-matter}

:::warning 大切なこと
cron のジョブは、まったく新しいエージェントのセッションで動きます。ひも付いたスキルが与えてくれないものは、エージェントに必要なものをすべてプロンプトに書いてください。
:::

**悪い例:** `"Check on that server issue"`

**良い例:** `"SSH into server 192.168.1.100 as user 'deploy', check if nginx is running with 'systemctl status nginx', and verify https://example.com returns HTTP 200."`

## セキュリティ {#security}

定期実行タスクのプロンプトは、作成時と更新時に、プロンプトインジェクションや認証情報の持ち出しの型がないか検査されます。見えない Unicode の細工、SSH の裏口を仕込もうとするもの、あからさまに秘密を持ち出そうとする中身を含むプロンプトは遮断されます。
