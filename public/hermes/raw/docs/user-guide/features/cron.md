---
title: "定期実行タスク（Cron）"
description: "自然言語でタスクの自動実行を予約し、1 つの cron ツールで管理して、スキルを 1 つ以上ひもづけられます"
upstream_path: user-guide/features/cron.md
upstream_blob: 56e31341cfcbc14e3a05ef16149f746ae7914654
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/cron
---

# 定期実行タスク（Cron） {#scheduled-tasks-cron}

自然言語または cron 式で、タスクを自動実行するように予約できます。Hermes では、予約・一覧・削除がそれぞれ別のツールに分かれているのではなく、`cronjob` という 1 つのツールに動作（アクション）を指定する形で cron の管理をまとめています。

## 今の cron でできること {#what-cron-can-do-now}

cron ジョブでは次のことができます。

- 一度だけ実行するタスクも、繰り返し実行するタスクも予約する
- ジョブを一時停止する、再開する、編集する、その場で実行する、削除する
- ジョブにスキルを 0 個、1 個、または複数ひもづける
- 実行結果を、作成元のチャット、ローカルのファイル、設定済みのプラットフォームの宛先へ届ける
- 新しいエージェントのセッションで、いつもの固定のツール一覧を使って実行する
- **no-agent モード** で実行する。スクリプトを予定どおりに走らせ、その標準出力をそのまま届けるだけで、LLM はいっさい関わりません（後述の [no-agent モード](#no-agent-mode-script-only-jobs) の節を参照してください）

これらはすべて `cronjob` ツールを通して Hermes 自身にも使えるので、普通の言葉で頼むだけでジョブの作成・一時停止・編集・削除ができます。CLI は必要ありません。

:::tip
**cron ジョブはどのモデルで動くのか。** 実行時に決まる順番は、ジョブごとの固定指定 → `config.yaml` の `cron.model` → `hermes model` で決まる全体の既定値、です。

- **ジョブごとの固定指定** — ダッシュボード、`hermes cron create/edit --model … --provider …`、または `~/.hermes/cron/jobs.json` を直接編集することで、*あなた自身* が設定します。一度設定すると、変更するまでそのままです。エージェントの `cronjob` ツールからジョブごとのモデルを設定したり変えたりすることはできません。推論の固定指定は利用者が持つものです。
- **`cron.model` / `cron.model_provider`** — cron 全体の既定値です。固定指定のないジョブはすべてこのモデルで動き、チャット用のモデルとは切り離されます。一度設定しておけば（`hermes config set cron.model <name>`）、`hermes model` や `/model` でチャットのモデルを切り替えても cron 側にはまったく影響しません。
- **全体の既定値** — 上の 2 つがどちらも設定されていないときにかぎり、ジョブは `hermes model` に従います。この場合、Hermes は作成時のプロバイダとモデルを **記録（スナップショット）** しておき、あとで全体の既定値が変わるとそのジョブは **安全側に倒れて止まります**。つまり実行を飛ばし、推論の呼び出しをせず、**1 回だけ** 知らせます。以降のタイミングでも、あなたが対処するか設定が元に戻るまで、そのジョブは飛ばされたまま（そして黙ったまま）になります（#44585）。繰り返し実行するジョブや、また実行したいジョブでは、プロバイダとモデルを明示的に固定して（`hermes cron edit <job_id> --provider <provider> --model <model>`）先へ進めてください。すでに実行し終えた回数制限つきの一度きりのジョブは更新できないので、代わりにプロバイダとモデルを明示した新しい一度きりのジョブを作ってください。この仕組みによって、目を離しているジョブが有料のプロバイダやモデルへの切り替えを黙って引き継いでしまうことを防いでいます。cron にかかる費用を意図して振り分けるなら、`cron.model`（またはジョブごとの固定指定）を設定するのが本筋のやり方で、そこで指定した軸についてはこのずれ防止機構は働きません。固定指定のないジョブに、変わっていく全体の既定値をあえて追いかけさせたい場合は、[ずれ防止機構を無効にする](#letting-unpinned-jobs-track-global-defaults) こともできます。

目を離したまま実行させるなら、OAuth の更新が自動で行われる `hermes setup --portal` がいちばん手間の少ない選び方です。[Nous Portal](/hermes/docs/integrations/nous-portal/) を参照してください。
:::

:::warning
cron で実行されたセッションから、さらに cron ジョブを作ることはできません。予約が際限なく増えていくのを防ぐため、Hermes は cron の実行中は cron 管理のツールを無効にします。
:::

## 定期実行タスクを作る {#creating-scheduled-tasks}

### チャットで `/cron` を使う {#in-chat-with-cron}

```bash
/cron add 30m "Remind me to check the build"
/cron add "every 2h" "Check server status"
/cron add "every 1h" "Summarize new feed items" --skill blogwatcher
/cron add "every 1h" "Use both skills and combine the result" --skill blogwatcher --skill maps
```

### 単体の CLI から使う {#from-the-standalone-cli}

```bash
hermes cron create "every 2h" "Check server status"
hermes cron create "every 1h" "Summarize new feed items" --skill blogwatcher
hermes cron create "every 1h" "Use both skills and combine the result" \
  --skill blogwatcher \
  --skill maps \
  --name "Skill combo"
```

### 普通の会話で頼む {#through-natural-conversation}

Hermes にいつもどおり話しかけてください。

```text
Every morning at 9am, check Hacker News for AI news and send me a summary on Telegram.
```

Hermes は内部で、統一された `cronjob` ツールを使います。

## 実行前の設定チェック {#pre-dispatch-configuration-validation}

予約された実行のためにエージェントの仕組みを組み立て始める前に、スケジューラは
そのジョブの設定で実際に実行が成功しうるかを確かめます。

- プロバイダの API キーが解決できること（`fallback_providers` の連鎖が設定されて
  いる場合はこの確認を飛ばします。主キーが無くても代替の経路が救ってくれる可能性が
  あるためです）
- ひもづいたスキルが使える状態であること（必要な環境変数、コマンド、認証情報の
  ファイルが欠けていないこと）
- 配信先のプラットフォームが把握できていて、ゲートウェイの認証情報が設定されている
  こと（`local` / `origin` の宛先は確認しません）

チェックに失敗すると、そのジョブの `last_status` は `blocked_config` になり、知らせは
1 回だけ届き（毎回のタイミングで繰り返されることはありません）、**LLM の呼び出しは
行われません**。設定を間違えたジョブがトークンを使ってしまうことはない、ということです。
次に正常に実行できたときにこの状態は解除されるので、そのあと設定が壊れたらまた
知らせが届きます。

このチェックを無効にして、以前の動き（実行が始まってから失敗する）に戻すには次のようにします。

```yaml
cron:
  preflight: false
```

または `hermes config set cron.preflight false` を実行します。

## 固定指定のないジョブに全体の既定値を追いかけさせる {#letting-unpinned-jobs-track-global-defaults}

モデル／プロバイダのずれ防止機構は、初期状態で有効です。固定指定のない cron ジョブに、
全体のモデルやプロバイダの変更をあえて毎回追いかけさせたい場合は、`config.yaml` で
無効にしてください。

```yaml
cron:
  model_drift_guard: false
```

または設定用のコマンドを使います。

```bash
hermes config set cron.model_drift_guard false
```

これで、実行時に止める働きと、全体の推論設定が変わったときに出る警告の両方が無効に
なります。記録済みのスナップショットはそのまま保存されているので、この項目を `true`
に戻せば、ジョブを作り直さなくても保護が復活します。

:::warning
この機構を無効にすると、目を離している固定指定のないジョブは、変更後の全体の既定値を
すぐに引き継ぎます。そのため、有料のプロバイダやモデルに切り替えると、予約された
実行のたびに費用が発生する可能性があります。
:::

## スキルを使う cron ジョブ {#skill-backed-cron-jobs}

cron ジョブは、プロンプトを実行する前にスキルを 1 つ以上読み込めます。

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

### スキルを複数 {#multiple-skills}

スキルは並べた順に読み込まれます。プロンプトは、それらのスキルの上に重ねる指示になります。

```python
cronjob(
    action="create",
    skills=["blogwatcher", "maps"],
    prompt="Look for new local events and interesting nearby places, then combine them into one short brief.",
    schedule="every 6h",
    name="Local brief",
)
```

これは、予約されたエージェントに使い回せる手順を引き継がせたいけれど、スキルの本文をまるごと cron のプロンプトに詰め込みたくはない、というときに便利です。

## プロジェクトのディレクトリの中でジョブを動かす {#running-a-job-inside-a-project-directory}

cron ジョブは初期状態では、どのリポジトリにも属さない形で実行されます。`AGENTS.md`、`CLAUDE.md`、`.cursorrules` は読み込まれず、ターミナル／ファイル／コード実行のツールは、ゲートウェイが起動したときの作業ディレクトリで動きます。これを変えるには `--workdir`（CLI）または `workdir=`（ツール呼び出し）を渡してください。

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

- そのディレクトリにある `AGENTS.md`、`CLAUDE.md`、`.cursorrules` がシステムプロンプトに差し込まれます（探す順番は対話式の CLI と同じです）
- `terminal`、`read_file`、`write_file`、`patch`、`search_files`、`execute_code` は、すべてそのディレクトリを作業ディレクトリとして使います
- 指定するパスは、実在する絶対パスのディレクトリでなければなりません。相対パスや存在しないディレクトリは、作成時／更新時に拒否されます
- 編集のときに `--workdir ""`（ツール経由なら `workdir=""`）を渡すと設定が消え、元の動きに戻ります

:::note 順番に実行されること
`workdir` を持つジョブは、スケジューラのタイミングで並列の処理枠ではなく順番に実行されます。これは意図した設計です。cron の処理側は、プロセス全体で共有されるターミナルの状態を通じてジョブの作業ディレクトリを適用するため、workdir を持つジョブが 2 つ同時に動くと、互いの作業ディレクトリを壊してしまうからです。workdir を持たないジョブは、これまでどおり並列で実行されます。
:::

## ジョブを編集する {#editing-jobs}

ジョブの内容を変えたいだけなら、消して作り直す必要はありません。

:::tip ジョブの指し方
以下（および [ライフサイクルの操作](#lifecycle-actions)）に出てくる `<job_id>` の部分には、ジョブの名前も使えます（大文字と小文字は区別しません）。16 進数の ID は思い出せないけれど `morning-digest` という名前なら覚えている、というときに便利です。ジョブ ID と完全に一致するものがあればそちらが優先されます。ID ではなく、名前が複数のジョブに一致した場合、コマンドは実行を断り、候補の ID を表示するので、そこから 1 つに絞り込めます。
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

- `--skill` を繰り返して指定すると、そのジョブにひもづくスキルの一覧を丸ごと置き換えます
- `--add-skill` は、今の一覧を置き換えずに追加します
- `--remove-skill` は、指定したスキルのひもづけを外します
- `--clear-skills` は、ひもづいたスキルをすべて外します

## ライフサイクルの操作 {#lifecycle-actions}

cron ジョブには、作成と削除だけではない、もっと細かい一生があります。

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

それぞれの働きはこうです。

- `pause` — ジョブは残したまま、予約の実行を止めます
- `resume` — ジョブを再び有効にして、次に実行する時刻を計算し直します
- `run` — 次のスケジューラのタイミングでそのジョブを実行させます
- `remove` — ジョブを完全に削除します
- `edit` — 予定、プロンプト、配信先などを変更します

**名前での指定について。** 状態を変える 4 つの操作（`pause`、`resume`、`run`、`remove`、`edit`）と、エージェントの `cronjob` ツールは、16 進数の ID の代わりにジョブの **名前** を受け付けるようになりました（大文字と小文字は区別しません）。エージェントも CLI も、ID と完全に一致するものがあればそちらを優先します。名前が複数のジョブに一致してあいまいな場合（同じ名前のジョブが複数ある場合）は、候補の ID をすべて示したうえで実行を断るので、明示的に 1 つを選べます。名前は一意ではないので、この守りは欠かせません。同じ名前のジョブが 2 つあるときに、間違ったほうを黙って書き換えてしまうのを防いでくれます。

## エージェントに予約を任せる（cron ジョブが cron ジョブを管理する） {#agent-managed-scheduling-cron-jobs-that-manage-cron-jobs}

初期状態では、スケジューラ *によって* 起動されたエージェントは `cronjob` ツールを
使えません。予約されたジョブが、ほかのジョブを作ったり編集したり削除したりはできない、
ということです。`config.yaml` で有効にできます。

```yaml
cron:
  allow_agent_scheduling: true   # default: false
```

有効にすると、予約されたエージェントはチャットのセッションと同じように cron の表を
管理できます。予約された作業の中から続きの一度きりのジョブを入れる、自分の実行間隔を
調整する、表全体を整える「cron の司書」のようなジョブを走らせる（一覧を取ってから、
必要に応じて更新・削除・作成する）といったことです。次の 2 つの性質が、これを暴走
させずに保ちます。

- **表は 1 つで、持ち主は利用者。** cron の実行から作られたジョブも、ほかのジョブと
  同じ `jobs.json` に入り、特別な所有関係は持ちません。自分で作ったものとまったく
  同じように、一覧に出したり、編集したり、削除したりできます。
- **宛先が迷子にならない。** cron の実行は一時的なものなので、その中で指定された
  `deliver: origin` は **作成時に** そのジョブ自身の具体的な宛先
  （`platform:chat_id[:thread_id]`、作成元のジョブがどこにも配信しない場合は `local`）
  へ解決されます。予約されたエージェントが作ったジョブが、もう存在しないセッションへ
  出力を向けてしまうことはありません。明示的な宛先（`local`、`all`、
  `telegram:<chat_id>`）はそのまま尊重されます。

実行のたびに新しいジョブを作るようなプロンプトより、既にあるジョブを更新する
プロンプト（まず一覧を取り、ID で更新する）のほうが望ましいです。

## しくみ {#how-it-works}

**cron の実行はゲートウェイのデーモンが担当します。** ゲートウェイは 60 秒ごとにスケジューラを動かし、実行時刻になったジョブを、それぞれ独立したエージェントのセッションで実行します。

```bash
hermes gateway install     # Install as a user service
sudo hermes gateway install --system   # Linux: boot-time system service for servers
hermes gateway             # Or run in foreground

hermes cron list
hermes cron status
```

### ゲートウェイのスケジューラの動き {#gateway-scheduler-behavior}

そのたびに Hermes は次のことをします。

1. `~/.hermes/cron/jobs.json` からジョブを読み込む
2. `next_run_at` を現在時刻と照らし合わせる
3. 実行時刻になったジョブごとに、新しい `AIAgent` のセッションを開始する
4. 必要なら、ひもづいたスキルをその新しいセッションに差し込む
5. プロンプトを最後まで実行する
6. 最終的な応答を届ける
7. 実行の記録と次の予定時刻を更新する

`~/.hermes/cron/.tick.lock` にあるファイルロックが、スケジューラの動作が重なって同じジョブの束を二重に実行してしまうのを防ぎます。

### 実行の履歴 {#execution-history}

Hermes は、受け付けた cron の実行の試みを、実行役やプロバイダへ渡す前に、プロファイル
ごとの `~/.hermes/cron/executions.db` に記録します。試みは `claimed`、`running` を経て、
変更されない最終状態である `completed`、`failed`、`unknown` のいずれかに落ち着きます。
再起動後、Hermes が放置された試みを `unknown` と記すのは、元の PID とプロセス開始時の
特徴から、その持ち主がもういないと確かめられた場合だけです。unknown となった試みは記録として
残るもので、自動で実行し直されることはありません。

最近の試みは `hermes cron runs [job-id] --limit 20`（別名は `history`）で確認できます。
終わった履歴は一定量までに抑えられ、動いている最中の試みが消されることはありません。
この記録は簡易バックアップにも含まれます。

### 失敗が続いたときの見直しの促し {#repeated-failure-review-nudge}

各ジョブは `failure_streak`、つまりエージェントが失敗した実行が何回続いたかを数えて
います（配信の失敗は数えません）。*繰り返し実行する* ジョブでこの回数が決められた
数に届くと、チャットへ届く失敗の知らせに見直しを促す一文が加わり、そのジョブが N 回
続けて失敗していることを伝えて、直すか、一時停止するか（`hermes cron pause <job>`）、
削除するかを提案します。1 回でも成功すれば数え直しになり、`hermes cron list` では
失敗しているジョブの直近の実行の横にこの回数が表示されます。一度きりのジョブでは
この促しは出ません。

```yaml
cron:
  failure_nudge_threshold: 3   # default; 0 disables the nudge
```

## 配信先の選択肢 {#delivery-options}

ジョブを予約するときに、出力をどこへ送るかを指定します。

| 選択肢 | 説明 | 例 |
|--------|-------------|---------|
| `"origin"` | ジョブを作った場所へ返す | メッセージ系プラットフォームでの初期値 |
| `"local"` | ローカルのファイルにだけ保存する（`~/.hermes/cron/output/`） | CLI での初期値 |
| `"telegram"` | Telegram のホームチャンネル | `TELEGRAM_HOME_CHANNEL` を使います |
| `"telegram:123456"` | ID で指定した特定の Telegram のチャット | 直接届けます |
| `"telegram:-100123:17585"` | 特定の Telegram のトピック | `chat_id:thread_id` の形式 |
| `"discord"` | Discord のホームチャンネル | `DISCORD_HOME_CHANNEL` を使います |
| `"discord:#engineering"` | 特定の Discord のチャンネル | チャンネル名で指定 |
| `"slack"` | Slack のホームチャンネル | |
| `"whatsapp"` | WhatsApp のホーム | |
| `"signal"` | Signal | |
| `"matrix"` | Matrix のホームルーム | |
| `"mattermost"` | Mattermost のホームチャンネル | |
| `"email"` | メール | |
| `"sms"` | Twilio 経由の SMS | |
| `"homeassistant"` | Home Assistant | |
| `"dingtalk"` | DingTalk | |
| `"feishu"` | Feishu/Lark | |
| `"wecom"` | WeCom | |
| `"weixin"` | Weixin（WeChat） | |
| `"bluebubbles"` | BlueBubbles（iMessage） | |
| `"qqbot"` | QQ Bot（Tencent QQ） | |
| `"all"` | つながっているホームチャンネルすべてへ広げる | 実行時に解決されます |
| `"telegram,discord"` | 指定した一組のチャンネルへ広げる | カンマ区切りの並び |
| `"origin,all"` | 作成元 **に加えて** つながっているほかのチャンネルすべてへ届ける | どの指定でも組み合わせられます |

エージェントの最終的な応答は、設定した `deliver:` の宛先へ自動的に届けられます。エージェント自身がメッセージを送るわけではないので、cron のプロンプトの中で何かを呼び出す必要はありません。

### 宛先の意図（`all`） {#routing-intent-all}

`all` を使うと、設定済みのメッセージ系チャンネルすべてに、1 つの cron ジョブの結果を届けられます。名前を 1 つずつ書き並べる必要はありません。これは **実行時に解決される** ので、Telegram をつなぐ前に作ったジョブでも、`TELEGRAM_HOME_CHANNEL` を設定すれば次のタイミングから Telegram を拾います。

意味としては、`all` はホームチャンネルが設定されているプラットフォームすべてに広がります。0 個でも構いません。その場合、そのジョブは配信先を持たないだけで、上流では配信の失敗として記録されます。

`all` は明示的な宛先と組み合わせられます。`origin,all` は作成元のチャット *に加えて* つながっているほかのホームチャンネルすべてへ届け、`(platform, chat_id, thread_id)` で重複を取り除きます。

### cron 用の Telegram のトピック（`TELEGRAM_CRON_THREAD_ID`） {#telegram-cron-topic-telegramcronthreadid}

Telegram のトピックモードを有効にしていると、DM の一番上はシステム用のロビーとして確保されます。そこへ返信してもロビーだと知らせる案内が返るだけで、`reply_to_message_id` も外されるため、メインのチャットに届いた cron のメッセージに返信することはできません。

代わりに、cron 専用のフォーラムトピックへ向けてください。

1. Telegram でボットとの DM を開き、たとえば `Cron` という名前のトピックを作ります。トピックの見出しを長押しして **リンクをコピー** すると、末尾の整数がそのトピックの `message_thread_id` です。
2. `.env` に `TELEGRAM_CRON_THREAD_ID=<that id>` を設定します。

これが効くのは cron の配信だけです。`TELEGRAM_HOME_CHANNEL_THREAD_ID`（再起動の通知など、ほかの用途で使うもの）は変わりません。明示的な `deliver="telegram:chat_id:thread_id"` の宛先は、これまでどおり環境変数より優先されます。cron のメッセージへの返信は、そのトピックの既存のセッションに届くようになったので、その場で対応できます。

### 応答の囲み {#response-wrapping}

初期状態では、届く cron の出力には見出しと締めが付いていて、受け取った側が予約されたタスクからのものだと分かるようになっています。

```
Cronjob Response: Morning feeds
-------------

<agent output here>

Note: The agent cannot see this message, and therefore cannot respond to it.
```

この囲みを付けずにエージェントの出力そのままを届けるには、`cron.wrap_response` を `false` にしてください。

```yaml
# ~/.hermes/config.yaml
cron:
  wrap_response: false
```

### 会話を続けられるジョブ（cron の配信に返信する） {#continuable-jobs-reply-to-a-cron-delivery}

初期状態では、cron の配信は送りっぱなしです。メッセージは送られますが、そのチャットの
会話の履歴には残らないので、返信してもエージェントには自分が何を言ったかの記録が
ありません。ジョブを **会話を続けられる** 設定にすると、届いた要約がそのまま返信できる
会話になります。エージェントは「タスク #2 って何ですか」と聞き返すのではなく、その要約を
文脈として持っている状態になります。

これは任意で、**初期状態では無効** です。設定で全体的に有効にするか、`cronjob` ツールの
`attach_to_session`（そのジョブだけ全体の設定を上書きします）でジョブごとに有効にします。

```yaml
# ~/.hermes/config.yaml
cron:
  mirror_delivery: false   # set true to make cron deliveries continuable
```

動きは **スレッドを優先** し、そのジョブの作成元のチャットに限られます。

- **スレッドを扱えるプラットフォーム**（Telegram のトピック、Discord/Slack のスレッド）
  では、配信ごとに専用のスレッドが開かれ、要約はそのスレッドのセッションに置かれるので、
  スレッド内で返信すれば文脈をすべて引き継いで続きます。繰り返し実行するジョブ
  （毎日の要約など）は実行ごとに新しいスレッドを開くので、配信ごとのやりとりが
  混ざりません。
- **DM しかないプラットフォーム**（WhatsApp、Signal、SMS）ではスレッドが存在しないため、
  要約は作成元の DM のセッションへ写されます。DM そのものが続きの場になります。

触れられるのは作成元のチャットだけです。広く配る宛先（`all` や、明示した別のチャットへの
配信）が会話を続けられる形になることはありません。写された内容は、ラベル付きの利用者の
発言（`[Cron delivery: <task name>]`）として書き込まれるので、どのモデルのプロバイダでも
会話の履歴が交互になる決まりを崩しません。

#### チャンネルにそのまま続ける（Slack） {#flat-in-channel-continuation-slack}

上に書いたスレッド優先の動きでは、配信のたびに専用のスレッドが作られます。会話を
続けられるジョブを、スレッドを作らずに **チャンネルの流れの中にそのまま** 出したい
場合は、Slack の **続きの場** を `in_channel` に設定してください。

```yaml
# ~/.hermes/config.yaml
slack:
  cron_continuable_surface: in_channel   # default: thread
  reply_in_thread: false                 # required pairing (see below)
  require_mention: false                 # so a plain reply continues the job
```

`in_channel` にすると、要約はチャンネルの普通の一番上のメッセージとして届き
（スレッドは作られません）、返信するとチャンネル共通のセッションを通じてジョブの続きに
なります。3 つの設定が組み合わさって働きます。

- **`cron_continuable_surface: in_channel`** — 配信のときにスレッドを作らなくなります。
- **`reply_in_thread: false`**（必須） — ボットが返信に *そのまま* チャンネル内で答え、
  要約が置かれたのと同じチャンネル全体のセッションにひもづけるようにします。これが
  ないと、続きの会話自体は働くもののスレッドの中に届きます（スレッド形式の続きへ
  安全に戻るだけで、返信が失われることはありません。食い違いに気づけるよう、
  ゲートウェイは起動時に警告を残します）。
- **`require_mention: false`**（または、そのチャンネルを `free_response_channels` に
  加える） — 普通のメッセージで返信できるようにします。そうしないと、返信のたびに
  `@` で呼びかけないとボットが反応しません。

続きの会話が **チャンネル全体** のセッションになるため、それは共有されたものになります。
チャンネル内のほかの雑談も、会話を続けられる 2 つ目のチャンネル内ジョブも、同じ流れの
会話に加わります。これは「チャンネルにそのまま出す」ことに元から伴うもので、
`reply_in_thread: false` を使っている人が既に受け入れているのと同じ引き換えです。配信
ごとのやりとりを分けたいときは、初期状態の `thread` を使ってください。

これは今のところ Slack の機能です。ほかのプラットフォームはこの項目を受け付けますが、
`thread` の動きに戻ります（続きの会話のしくみが違うためです）。この選択はプラットフォーム
ごとで、それぞれの設定の下に置きます。ゲートウェイ側の設定項目なので、`/restart` で
読み込まれます。Slack アプリを入れ直す必要はありません。

:::note 1 対 1 の DM
`cron_continuable_surface` は **チャンネル** 向けの設定です。1 対 1 の DM には
スレッドか流れかという選び分けがない（DM はもともとそのまま並ぶ形です）ので、この項目は
そこでは効きません。DM での cron の配信が会話を続けられるかどうかを決めるのは、
別に前からある項目 **`slack.dm_top_level_threads_as_sessions`** です。

- **`false`** — 一番上の DM はすべて 1 つの続いた DM のセッションを共有するので、会話を
  続けられる cron の要約とあなたの返信は **同じ** セッションに入り、ジョブは文脈を
  引き継いで続きます。DM で会話を続けられる cron を使いたいなら、これを選びます。
- **`true`**（初期値） — 一番上の DM のメッセージはそれぞれ別のセッションになるので、
  届いた要約に返信すると、その要約の記録を持たない *新しい* セッションが始まります。
  この設定では続きの会話は働きません（cron でも、そのほかのそのまま出す配信でも同じです）。

つまり、1 対 1 の DM へ届ける、会話を続けられる cron ジョブでは
`slack.dm_top_level_threads_as_sessions: false` を設定してください。DM では
`cron_continuable_surface` は必要ありません（設定しても無視されます）。
:::

### 黙って止める {#silent-suppression}

エージェントの最終的な応答に `[SILENT]` が含まれていると、配信はまるごと止まります。出力は監査のためにローカル（`~/.hermes/cron/output/`）に保存されますが、配信先へメッセージは送られません。

これは、何か問題があるときだけ報告してほしい監視のジョブに向いています。

```text
Check if nginx is running. If everything is healthy, respond with only [SILENT].
Otherwise, report the issue.
```

失敗したジョブは `[SILENT]` の印にかかわらず必ず配信されます。黙らせられるのは成功した実行だけです。静かな監視のジョブにしたいなら、報告することが何もないときは `[SILENT]` だけを返すようにエージェントへ指示してください。

## スクリプトの時間制限 {#script-timeout}

実行前のスクリプト（`script` パラメータでひもづけるもの）には、初期値で 3600 秒（1 時間）の時間制限があります。これが区切るのは **スクリプトだけ** です。スキルを使うジョブや LLM が動くジョブは、別の「反応がない時間」の予算で動いていて、この値では区切られません。スクリプトに別の制限が必要なら、変更できます。

```yaml
# ~/.hermes/config.yaml
cron:
  script_timeout_seconds: 1800   # 30 minutes
```

または `HERMES_CRON_SCRIPT_TIMEOUT` という環境変数を設定します。決まる順番は、環境変数 → config.yaml → 初期値の 3600 秒、です。

cron は、実行後のセッションとエージェントの資源の後片づけにも時間の区切りを設けています。これは LLM のやりとりが返ってきたあとに起きるので、反応がない時間の制限とは別物です。初期値は後片づけの処理 1 つにつき 10 秒です。保存や通信の終了処理が返ってこなくなった場合、スケジューラはエラーを記録し、そのジョブの実行中の印を解放して、そのジョブが永久に飛ばされ続けるのではなく、あとの実行が始められるようにします。

```yaml
# ~/.hermes/config.yaml
cron:
  cleanup_timeout_seconds: 10
```

`cleanup_timeout_seconds: 0` にするのは、時間制限のない以前の後片づけの動きに戻したいときだけにしてください。

## メディア送信の時間制限 {#media-send-timeout}

cron の配信に添付ファイル（生成した PDF、読み上げ音声、書き出したレポートなど）が含まれていて、動いているゲートウェイの接続を通して送る場合、添付 1 つごとのアップロードには時間制限がかかります。初期値は 300 秒です。回線の細い環境で大きなファイルを送るときは、もっと必要になることがあります。

```yaml
# ~/.hermes/config.yaml
cron:
  media_send_timeout_seconds: 600   # 10 minutes per attachment
```

または `HERMES_CRON_MEDIA_SEND_TIMEOUT` という環境変数を設定します。決まる順番は、環境変数 → config.yaml → 初期値の 300 秒、です。時間切れになった添付は、そのジョブの実行状態に部分的な配信の失敗として記録されます（本文は届きます）。

## no-agent モード（スクリプトだけのジョブ） {#no-agent-mode-script-only-jobs}

LLM の思考が要らない繰り返しのジョブ、たとえば昔ながらの死活監視、ディスクやメモリの警告、生存確認、CI への問い合わせなどでは、作成時に `no_agent=True` を渡してください。スケジューラはスクリプトを予定どおりに実行し、その標準出力をそのまま届けて、エージェントをまるごと飛ばします。

```bash
hermes cron create "every 5m" \
  --no-agent \
  --script memory-watchdog.sh \
  --deliver telegram \
  --name "memory-watchdog"
```

意味はこうです。

- スクリプトの標準出力（前後の空白を除いたもの）が、そのままメッセージとして届きます。
- **標準出力が空なら、そのタイミングは黙って終わり**、配信はされません。これが死活監視のやり方です。「何か問題があるときだけ言う」ということです。
- 終了コードが 0 以外、または時間切れの場合はエラーの知らせが届くので、壊れた監視が黙って動かなくなることはありません。
- 最後の行が `{"wakeAgent": false}` なら、そのタイミングは黙って終わります（LLM を使うジョブと同じ仕組みです）。
- トークンも、モデルも、プロバイダの切り替えもありません。このジョブが推論の層に触れることはありません。

`.sh` / `.bash` のファイルは、`PATH` にある `bash` があればそれで、なければ `/bin/bash` で実行されます（Windows の Git Bash では重要です）。それ以外は、今の Python の実行環境（`sys.executable`）で実行されます。スクリプトは `$HERMES_HOME/scripts/` の中に解決されなければなりません。ファイル名だけの指定、絶対パス、`~` で始まるパスは、解決した先がそのディレクトリの中にとどまるかぎり受け付けられ、そこから外へ出るパスは拒否されます。子プロセスの環境変数は整理され（`_sanitize_subprocess_env`）、プロバイダの API 認証情報やそのほか Hermes が管理する秘密の値は cron のスクリプトに **引き継がれません**。

### エージェントが用意してくれます {#the-agent-sets-these-up-for-you}

`cronjob` ツールの定義には `no_agent` が Hermes から直接見える形で含まれているので、チャットで死活監視をしたい内容を伝えれば、エージェントが組み立ててくれます。

```text
Ping me on Telegram if RAM is over 85%, every 5 minutes.
```

Hermes は `write_file` でチェック用のスクリプトを `~/.hermes/scripts/` に書き、続けてこう呼び出します。

```python
cronjob(action="create", schedule="every 5m",
        script="memory-watchdog.sh", no_agent=True,
        deliver="telegram", name="memory-watchdog")
```

メッセージの中身がスクリプトだけで決まりきっている場合（死活監視、しきい値の警告、生存確認など）は、自動で `no_agent=True` を選びます。同じツールでエージェントはジョブの一時停止・再開・編集・削除もできるので、誰も CLI に触れないまま、一生をチャットだけで回せます。

具体例は [スクリプトだけの cron ジョブのガイド](/hermes/docs/guides/cron-script-only/) を参照してください。

## `context_from` でジョブをつなぐ {#chaining-jobs-with-contextfrom}

cron ジョブは独立したセッションで実行され、前の実行の記憶を持ちません。とはいえ、あるジョブの出力がまさに次のジョブに必要なもの、ということもあります。`context_from` パラメータは、そのつながりを自動で結んでくれます。ジョブ B のプロンプトの前に、ジョブ A の直近の出力が実行時に差し込まれます。

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

**しくみ**

- ジョブ 2 の時刻になると、Hermes は `~/.hermes/cron/output/{job1_id}/*.md` からジョブ 1 の直近の出力を読みます
- その出力がジョブ 2 のプロンプトの前に自動で足されます
- ジョブ 2 のプロンプトに「このファイルを読んで」と書き込む必要はありません。内容が文脈として渡されます
- つながりの長さに制限はありません。ジョブ 1 → ジョブ 2 → ジョブ 3 → …

**`context_from` に指定できるもの**

| 形式 | 例 |
|--------|---------|
| ジョブ ID を 1 つ（文字列） | `context_from="a1b2c3d4"` |
| ジョブ ID を複数（リスト） | `context_from=["job_a", "job_b"]` |

出力は並べた順につなげられます。

**続きから始める。前回の出力を引き継ぐ**

`continuity=true` にすると、そのジョブは実行のたびに *自分自身* の直近の出力を差し込みます。繰り返し実行するジョブは、普通は毎回まっさらな状態から始まるので、ニュースを探すジョブが同じ記事を何度も報告したり、監視のジョブが同じ状態で何度も警告したりします。これを有効にすると、ジョブは前回自分が報告した内容を見た状態で目覚めるので、重複を取り除いて続きから進められます。

```python
cronjob(
    action="create",
    prompt="Scan HN and arXiv for new agent-tooling papers. Report only items NOT already covered in your previous run's output.",
    schedule="every 6h",
    continuity=True,
    name="Agent Tooling Scout",
)
```

初回は前回の出力がないので、プロンプトはそのまま実行されます。2 回目以降は、前回の出力が「すでに報告したことを繰り返さないように」という前置きとともに先頭に足されます。上流のジョブとの併用も自由で（`context_from=["<other_job_id>"]` と `continuity=true` を同時に指定できます）、更新時に `continuity=false` にすると、ほかの `context_from` の指定は残したままこの働きだけを止められます。内部では、この設定は `context_from` の中の `self` という予約された項目として保存されます。

CLI からは `hermes cron create "every 6h" "Scan for news" --continuity`、既にあるジョブでの切り替えは `hermes cron edit <job_id> --continuity` / `--no-continuity` です。同じ切り替えは、ダッシュボードの cron の編集画面と、デスクトップの Bot Mode の定期実行の設定画面にもあります。

**どんなときに使うか**

- 複数の段階からなる処理の流れ（集める → 選ぶ → 整える → 届ける）
- N 段目の作業が N−1 段目の出力に依存する、つながったタスク
- 1 つのジョブが複数のジョブの結果をまとめる、広げて集める形
- 自分の前回の報告と重複しないようにしたい、繰り返しの調査や監視（`continuity=true`）

## プロバイダからの立て直し {#provider-recovery}

cron ジョブは、設定した代替プロバイダと認証情報の使い回しの仕組みを引き継ぎます。主となる API キーが回数制限にかかったり、プロバイダがエラーを返したりした場合、cron のエージェントは次のことができます。

- `config.yaml` に `fallback_providers`（あるいは以前からの `fallback_model`）を設定していれば、**別のプロバイダに切り替える**
- 同じプロバイダの [認証情報のプール](/hermes/docs/user-guide/configuration/#credential-pool-strategies) の中で、**次の認証情報に切り替える**

つまり、高い頻度で動く cron ジョブや、混み合う時間帯に動く cron ジョブは、より粘り強くなります。1 つのキーが回数制限にかかっても、実行全体が失敗することはありません。

## 予約した実行の取りこぼし（`last_fire_error`） {#missed-scheduled-fires-lastfireerror}

ホスティング型（cron を任せる形）の構成では、予約された実行はプラットフォームのスケジューラからダッシュボードを経て、ゲートウェイの内部 API サーバーへ届きます。この最後の受け渡しが失敗すると、つまりゲートウェイのプロセスが止まっていたり、API サーバーの待ち受けが始まっていなかったりすると、実行そのものが始まらないので、実行の記録も、見に行くべき `last_status` も残りません。見分ける特徴は、手動で実行するといつも動くのに、自動では一度も動かない、という形です。

こうした取りこぼしは、ジョブの記録に `last_fire_error`（時刻と理由）として刻まれ、次の場所で確認できます。

- `cronjob` ツールの `action: "list"` — `last_fire_error` という項目
- `hermes cron list` — ジョブの下に出る赤い `⚠ Missed scheduled fire:` の行
- ダッシュボードのジョブの画面

この印は常に **今の** 自動実行の健康状態を表します。新しい取りこぼしがあれば上書きされ、次に実行が成功すれば自動で消えます。これが見えている場合、ジョブそのものと予定に問題はなく、手当てが必要なのは実行を届ける経路のゲートウェイ側です（いちばん多いのは、プロファイルの環境をすべて読み込ませるために、管理のしくみを通してゲートウェイを再起動することです。`hermes gateway restart`）。

### 取りこぼしの追いつき {#misfire-catch-up}

外部のスケジューラが動いている場合（ホスティング型で cron を任せているとき）、ゲートウェイは追いつきのための見回りも行います。予定の時刻を過ぎても実行が届かず、猶予の時間も過ぎたジョブは、手元で引き受けて実行されます。これにより、実行の受け渡しに障害が起きても、失うのは丸一日ではなく数分で済みます。この見回りは、通常の実行と同じ引き受けの記録を使うことで、スケジューラ側の遅れた再試行と重ならないようになっています。

```yaml
cron:
  misfire_grace_minutes: 10   # wait this long for the scheduler's own retries
                              # before catching up locally; 0 disables catch-up
```

手元の（組み込みの時計を使う）構成では、これは必要ありません。組み込みの時計は、次のタイミングで期限を過ぎたジョブをそのまま拾うからです。

## 予定の書き方 {#schedule-formats}

エージェントの最終的な応答は、そのジョブの `deliver:` の宛先へ自動的に届けられます。エージェント自身がメッセージを送ることはもうないので、利用者に見せたい内容は最終的な応答にそのまま書けば済みます。**追加の宛先や別の宛先** へ届けたい場合は、エージェントに送らせるのではなく、cron ジョブの `deliver:` に宛先を並べてください（カンマ区切り、たとえば `deliver: "telegram,discord"`）。

### 今からの時間で指定する（一度きり） {#relative-delays-one-shot}

```text
30m     → Run once in 30 minutes
2h      → Run once in 2 hours
1d      → Run once in 1 day
```

### 間隔で指定する（繰り返し） {#intervals-recurring}

```text
every 30m    → Every 30 minutes
every 2h     → Every 2 hours
every 1d     → Every day
```

### cron 式 {#cron-expressions}

```text
0 9 * * *       → Daily at 9:00 AM
0 9 * * 1-5     → Weekdays at 9:00 AM
0 */6 * * *     → Every 6 hours
30 8 1 * *      → First of every month at 8:30 AM
0 0 * * 0       → Every Sunday at midnight
```

### ISO 形式の日時 {#iso-timestamps}

```text
2026-03-15T09:00:00    → One-time at March 15, 2026 9:00 AM
```

## 繰り返しの動き {#repeat-behavior}

| 予定の種類 | 繰り返しの初期値 | 動き |
|--------------|----------------|----------|
| 一度きり（`30m`、日時） | 1 | 1 回だけ実行します |
| 間隔（`every 2h`） | forever | 削除するまで実行し続けます |
| cron 式 | forever | 削除するまで実行し続けます |

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

エージェント側から見える窓口は 1 つのツールです。

```python
cronjob(action="create", ...)
cronjob(action="list")
cronjob(action="update", job_id="...")
cronjob(action="pause", job_id="...")
cronjob(action="resume", job_id="...")
cronjob(action="run", job_id="...")
cronjob(action="remove", job_id="...")
```

`update` では、`skills=[]` を渡すとひもづいたスキルをすべて外せます。

### 手動での実行は非同期です {#manual-runs-are-asynchronous}

`cronjob(action="run")` は、そのジョブを **バックグラウンドで** すぐに実行します
（`delegate_task` と同じです）。ツールの呼び出しは取っ手を返してすぐに終わり、
そのジョブの結果、つまり成功か失敗か、配信先、次の予定時刻、出力の抜粋が、実行が
終わったときに新しいメッセージとして会話に戻ってきます。その間もエージェント（と
あなた）は作業を続けられます。すでに実行中のジョブは、二重に実行されるのではなく
「already running」と断られます。

`action="run"` に `prompt` を添えて、その回かぎりの文脈を差し込むこともできます。

```python
cronjob(action="run", job_id="...", prompt="CONTEXT: focus on the EU region today")
```

この文脈は、その 1 回の実行にかぎって `## Run Context` という見出しの下にジョブの
保存済みプロンプトへ追記されます。ジョブの定義に保存されることはなく、保存済みの
プロンプトと同じ、プロンプトへの攻撃を調べる検査を通ります。

離れた場所からの結果を受け取れない実行環境（一度きりの `hermes -z`、CLI からの
`hermes cron run`、cron の子セッション、Kanban のワーカー）では、自動的に同期の実行に
切り替わります。

## cron ジョブが使えるツールの組み {#toolsets-available-to-cron-jobs}

cron は各ジョブを、チャットのプラットフォームがつながっていない新しいエージェントのセッションで実行します。初期状態では、cron のエージェントが受け取るのは **`hermes tools` で `cron` というプラットフォームに設定したツールの組み** です。CLI の初期値でもなければ、あるもの全部でもありません。

```bash
hermes tools
# → pick the "cron" platform in the curses UI
# → toggle toolsets on/off just like you would for Telegram/Discord/etc.
```

ジョブごとにもっと細かく決めたいときは、`cronjob.create` の `enabled_toolsets` という項目（既にあるジョブなら `cronjob.update`）を使います。

```text
cronjob(action="create", name="weekly-news-summary",
        schedule="every sunday 9am",
        enabled_toolsets=["web", "file"],      # just web + file, no terminal/browser/etc.
        prompt="Summarize this week's AI news: ...")
```

ジョブに `enabled_toolsets` が設定されていればそれが優先され、なければ `hermes tools` の cron 向けの設定が優先され、それもなければ Hermes は組み込みの初期値に戻します。これは費用を抑えるうえで大切です。ちょっとした「ニュースを取ってくる」だけのジョブに `browser` や `delegation` まで持たせると、LLM を呼ぶたびにツールの定義でプロンプトが膨らみます。

### エージェントをまるごと飛ばす。`wakeAgent` {#skipping-the-agent-entirely-wakeagent}

cron ジョブに事前チェックのスクリプト（`script=` で指定するもの）をひもづけている場合、そのスクリプトが実行時に、Hermes がそもそもエージェントを呼び出すべきかどうかを決められます。標準出力の最後の行に、次の形を出してください。

```text
{"wakeAgent": false}
```

こうすると、cron はそのタイミングでのエージェントの実行をまるごと飛ばします。1〜5 分ごとのような高い頻度の確認で、状態が実際に変わったときだけ LLM を起こしたい場合に便利です。そうしないと、中身のないやりとりに何度も費用を払うことになります。

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

`wakeAgent` を書かなかった場合の初期値は `true`（いつもどおりエージェントを起こす）です。

#### 手順集。費用のかからない事前チェック {#recipes-cheap-pre-run-gates}

`wakeAgent` の仕組みは、予約されたジョブが LLM のトークンを少しでも使うべきかどうかを、費用 0 で決める手段です。だいたいの使い道は次の 3 つのやり方でまかなえます。

**ファイルの変更で判断する** — 前回うまく実行できたとき以降に、見張っているファイルへ新しい内容が入ったときだけ実行します。スケジューラは各ジョブの `last_run_at` を記録しているので、それをファイルの更新時刻と比べます。

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

**外部からの合図で判断する** — ほかの処理が準備できたと知らせたときだけ実行します（たとえば、デプロイの仕組みがファイルを置く、CI が状態の保管先に値を書く、など）。

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

**SQL の件数で判断する** — 自分のデータベースに処理すべき新しい行があるときだけ実行します。スクリプトはその件数を `context` としてエージェントに渡すこともできるので、エージェントは問い合わせをやり直さなくても、どれだけの量を扱うのか分かります。

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

同じやり方は、スクリプトから問い合わせられるデータの置き場所であれば何にでも使えます。Postgres でも、HTTP の API でも、自分の状態の保管先でも。cron の仕組みそのものに SQL の評価機能を組み込む必要はありません。

:::tip
Hermes 自身の `~/.hermes/state.db` は内部の構造で、版が上がると変わります。事前チェックからここに問い合わせるのはやめて、自分のデータベースやデータの取り込み先を見てください。
:::

謝辞。この手順集は、@iankar8 さんが [#2654](https://github.com/NousResearch/hermes-agent/pull/2654) で試みた内容がきっかけで生まれました。そこでは、sql／ファイル／コマンドをきっかけにする仕組みを別立てで追加することが提案されていました。`script` と `wakeAgent` の組み合わせで 3 つとも費用 0 でまかなえるので、この取り組みはドキュメントという形で残りました。

### ジョブをつなぐ。`context_from` {#chaining-jobs-contextfrom}

cron ジョブは、ほかのジョブが直近に成功したときの出力を、名前（または ID）を `context_from` に並べることで受け取れます。

```text
cronjob(action="create", name="daily-digest",
        schedule="every day 7am",
        context_from=["ai-news-fetch", "github-prs-fetch"],
        prompt="Write the daily digest using the outputs above.")
```

指定したジョブの直近の完了した出力が、この実行のためにプロンプトの上へ文脈として差し込まれます。上流に並べる項目は、それぞれ有効なジョブ ID か名前でなければなりません（`cronjob action="list"` を参照）。なお、つなぐときに読むのは *直近の完了した* 出力です。同じタイミングで動いている上流のジョブを待つわけではありません。

## ジョブの保存場所 {#job-storage}

ジョブは `~/.hermes/cron/jobs.json` に保存されます。ジョブの実行結果は `~/.hermes/cron/output/{job_id}/{timestamp}.md` に保存されます。

ジョブの定義はディスク上のただの JSON なので、`hermes update`、ゲートウェイの再起動、端末の再起動を越えて残ります。再起動のときに実行中だったジョブは、実行の記録の中で `unknown` と記されます。自動で実行し直されることはありませんが、そのジョブの次の予定は普通に動きます。詳しくは [実行の履歴](#execution-history) を参照してください。

:::tip
ジョブの管理は `jobs.json` を直接いじるのではなく、`cronjob` ツール、`hermes cron edit`、`/cron` を通してエージェントに頼んでください。直接編集すると、[ファイル書き込みの安全策](/hermes/docs/user-guide/security/#file-write-safety) がそのパスを止めたときに（たとえば `HERMES_WRITE_SAFE_ROOT` が設定されているとき）黙って失敗することがあります。何も保存されなかったことをはっきり示してくれるのは、[ファイル変更の確認](/hermes/docs/user-guide/configuration/#file-mutation-verifier) の締めの表示です。
:::

ジョブは `model` と `provider` を `null` のまま持つことがあります。これらの項目が省かれている場合、Hermes は実行時に全体の設定から決めます。ジョブの記録に現れるのは、そのジョブだけの上書きが設定されているときだけです。

保存には、途中で中断されても書きかけのジョブのファイルが残らないよう、まとめて書き換える方式を使っています。

## それだけで完結したプロンプトが大切であることは変わりません {#self-contained-prompts-still-matter}

:::warning Important
cron ジョブは、完全に新しいエージェントのセッションで実行されます。プロンプトには、ひもづいたスキルが用意してくれるもの以外の、エージェントに必要なすべてが書かれていなければなりません。
:::

**悪い例。** `"Check on that server issue"`

**良い例。** `"SSH into server 192.168.1.100 as user 'deploy', check if nginx is running with 'systemctl status nginx', and verify https://example.com returns HTTP 200."`

## セキュリティ {#security}

定期実行タスクのプロンプトは、作成時と更新時に、プロンプトへの攻撃や認証情報の持ち出しの型がないか調べられます。目に見えない Unicode の細工、SSH の裏口を作ろうとするもの、あからさまに秘密の値を持ち出そうとするものを含むプロンプトは止められます。
