---
title: "定期実行タスク（Cron）"
description: "自然言語でタスクの自動実行を予約し、1 つの cron ツールで管理して、スキルを 1 つ以上ひもづけられます"
upstream_path: user-guide/features/cron.md
upstream_blob: cb91709320f26b360bcb1bd623d0d9a919f23b44
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/cron
---

# 定期実行タスク（Cron） {#scheduled-tasks-cron}

自然言語または cron 式で、タスクを自動的に実行するよう予約できます。Hermes では予約・一覧・削除がそれぞれ別のツールに分かれておらず、`cronjob` という 1 つのツールにアクション形式の操作をまとめて公開しています。

## いま cron でできること {#what-cron-can-do-now}

cron ジョブでは次のことができます。

- 1 回きり、または繰り返しのタスクを予約する
- ジョブの一時停止・再開・編集・即時実行・削除を行う
- ジョブにスキルを 0 個、1 個、または複数ひもづける
- 実行結果を、作成元のチャット・ローカルのファイル・設定済みのプラットフォーム宛先へ届ける
- 通常の静的なツール一覧を持った、新しいエージェントセッションで実行する
- **no-agent モード**で実行する（スクリプトを予約実行し、その標準出力をそのまま届けるだけで、LLM はいっさい関与しません。後述の [no-agent モード](#no-agent-mode-script-only-jobs)の節を参照してください）

これらはすべて `cronjob` ツールを通じて Hermes 自身からも使えるので、普通の言葉で頼むだけでジョブの作成・一時停止・編集・削除ができます。CLI は必須ではありません。

:::tip
**cron ジョブはどのモデルで動くのか。** 実行時の解決順序は、ジョブごとの固定 → `config.yaml` の `cron.model` → `hermes model` によるグローバルの既定値、となります。

- **ジョブごとの固定** — ダッシュボード、`hermes cron create/edit --model … --provider …`、あるいは `~/.hermes/cron/jobs.json` の編集によって、*利用者自身*が設定します。いったん設定すると、変更するまでそのまま維持されます。エージェントの `cronjob` ツールからジョブごとのモデルを設定・変更することはできません。推論の固定は利用者が持つものだからです。
- **`cron.model` / `cron.model_provider`** — cron 群全体の既定値です。固定していないジョブはすべてこのモデルで動き、チャットで使っているモデルとは切り離されます。一度設定しておけば（`hermes config set cron.model <name>`）、`hermes model` や `/model` でチャットのモデルを切り替えても cron 群には影響しません。
- **グローバルの既定値** — 上の 2 つがどちらも設定されていない場合にかぎり、ジョブは `hermes model` に従います。この場合、Hermes は作成時点のプロバイダーとモデルを**スナップショット**として記録し、あとからグローバルの既定値が変わるとジョブは**安全側に倒れて停止**します。つまり実行を飛ばし、推論の呼び出しも行わず、**1 回だけ**通知します。以降のティックでもジョブは飛ばされたまま（かつ無言のまま）で、対処するか設定が元に戻るまで続きます（#44585）。繰り返し実行するジョブや、また実行しうるジョブでは、プロバイダーとモデルを明示的に固定して（`hermes cron edit <job_id> --provider <provider> --model <model>`）先に進めてください。すでに消化された 1 回きりのジョブは更新できないので、代わりに未来の 1 回きりのジョブを、プロバイダーとモデルを明示して新しく作成します。この仕組みによって、無人で動くジョブが有料のプロバイダーやモデルへの切り替えを黙って引き継いでしまうのを防げます。cron の費用の行き先を意図して決めるなら `cron.model`（またはジョブごとの固定）を設定するのが本筋で、それでカバーされている軸には、このずれ検知は働きません。逆に、固定していないジョブに、変化するグローバルの既定値へ追従してほしい場合は、[ずれ検知を無効にする](#letting-unpinned-jobs-track-global-defaults)こともできます。

無人実行では `hermes setup --portal` が最も手間の少ない選択肢です。OAuth の更新が自動で行われるためです。[Nous Portal](/hermes/docs/integrations/nous-portal/) を参照してください。
:::

:::tip
**ジョブごとの推論の深さ。** ジョブは、モデルの固定とは独立に、思考の深さを自分で固定できます。指定できるのは `none`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max`、`ultra` のいずれかです。設定すると、そのジョブの実行にかぎり、グローバルの `agent.reasoning_effort` とモデルごとの `agent.reasoning_overrides` の両方を上書きします（`none` は思考を無効にします）。設定は `hermes cron create/edit --reasoning-effort high` で行い、編集時に空文字列を渡すと固定が解除されて再び設定ファイルに従います。（エージェントの `cronjob` ツールには意図的に公開していません。モデルの設定は利用者が決めることだからです。）モデルが対応していない深さは、リクエスト時にプロバイダー側で丸められるか省かれます。上限が `high` のモデルに `xhigh` を固定しても `high` で動きます。`no_agent` のジョブには効果がありません（調整すべき LLM の呼び出しがないためです）。重い分析の定期実行だけを `high` で走らせ、安価な繰り返しジョブは `minimal` で回す、といった使い分けを、グローバルの既定値に触れずに実現できます。
:::

:::warning
cron から起動されたセッションは、そこからさらに cron ジョブを作ることはできません。予約が際限なく増殖するのを防ぐため、Hermes は cron 実行の内部では cron 管理ツールを無効にします。
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

Hermes にいつもどおり話しかけます。

```text
Every morning at 9am, check Hacker News for AI news and send me a summary on Telegram.
```

Hermes は内部で、統合された `cronjob` ツールを使います。

## 実行前の設定チェック {#pre-dispatch-configuration-validation}

予約実行のためのエージェントを組み立てる前に、スケジューラーは、そのジョブの
設定で本当に実行が成功しうるかを検証します。

- プロバイダーの API キーが解決できること（`fallback_providers` の連鎖が
  設定されている場合は省略されます。主キーが欠けていてもフォールバック側で
  救えるからです）
- ひもづけたスキルが使える状態であること（必須の環境変数・コマンド・認証
  ファイルが欠けていないこと）
- 配信先のプラットフォームが既知で、ゲートウェイの認証情報が設定されている
  こと（`local` / `origin` 宛ては検証されません）

検証に失敗すると、ジョブの `last_status` は `blocked_config` になり、通知は
1 回だけ届き（ティックごとに繰り返されることはありません）、**LLM の呼び出しは
行われません**。設定を誤ったジョブがトークンを消費することはない、ということです。
次に正常な実行が起きるとブロック状態は解除され、その後にまた設定が壊れたときに
改めて通知されます。

この検証を無効にして、以前の挙動（実行はそのまま進み、途中で失敗する）に
戻すには次のようにします。

```yaml
cron:
  preflight: false
```

あるいは `hermes config set cron.preflight false` を実行します。

## 固定していないジョブをグローバルの既定値に追従させる {#letting-unpinned-jobs-track-global-defaults}

モデルとプロバイダーのずれ検知は、既定で有効です。固定していない cron ジョブに、
グローバルのモデル・プロバイダーの変更をすべて意図して追従させたい場合は、
`config.yaml` で無効にします。

```yaml
cron:
  model_drift_guard: false
```

または設定コマンドを使います。

```bash
hermes config set cron.model_drift_guard false
```

これで、実行時のブロックと、グローバルの推論設定が変わったときの警告の両方が
無効になります。記録済みのスナップショットはそのまま残るので、この設定を
`true` に戻せば、ジョブを作り直さなくても保護が復活します。

:::warning
この保護を無効にすると、固定していない無人のジョブは、変更後のグローバルの
既定値をただちに引き継ぎます。有料のプロバイダーやモデルへ切り替えると、
予約実行のたびに費用が発生することになります。
:::

## スキルつきの cron ジョブ {#skill-backed-cron-jobs}

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

### スキル複数 {#multiple-skills}

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

これは、予約実行のエージェントに使い回せる作業手順を引き継がせたいけれど、スキルの本文まるごとを cron のプロンプトに詰め込みたくはない、というときに便利です。

## プロジェクトのディレクトリの中でジョブを動かす {#running-a-job-inside-a-project-directory}

cron ジョブは既定では、どのリポジトリからも切り離された状態で動きます。`AGENTS.md`、`CLAUDE.md`、`.cursorrules` はいずれも読み込まれず、ターミナル・ファイル・コード実行の各ツールは、ゲートウェイが起動したときの作業ディレクトリで動きます。これを変えるには、CLI なら `--workdir`、ツール呼び出しなら `workdir=` を渡します。

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

- そのディレクトリにある `AGENTS.md`、`CLAUDE.md`、`.cursorrules` がシステムプロンプトへ差し込まれます（探索の順序は対話型 CLI と同じです）
- `terminal`、`read_file`、`write_file`、`patch`、`search_files`、`execute_code` はすべて、そのディレクトリを作業ディレクトリとして使います
- 指定するパスは、実在する絶対パスのディレクトリでなければなりません。相対パスや存在しないディレクトリは、作成時・更新時に拒否されます
- 編集時に `--workdir ""`（ツールからは `workdir=""`）を渡すと設定が消え、元の挙動に戻ります

:::note 直列化
`workdir` を持つジョブは、スケジューラーのティックで並列プールではなく順番に実行されます。これは意図的なものです。cron のワーカーはプロセス全体で共有されるターミナルの状態を通じてジョブの作業ディレクトリを適用するため、workdir 付きのジョブが同時に走ると互いのカレントディレクトリを壊してしまうからです。workdir のないジョブは、これまでどおり並列で実行されます。
:::

## ジョブを編集する {#editing-jobs}

内容を変えるためだけに、ジョブを削除して作り直す必要はありません。

:::tip ジョブの指定方法
以下（および[ライフサイクルの操作](#lifecycle-actions)）に出てくる `<job_id>` の部分には、ジョブの名前も指定できます（大文字小文字は区別しません）。`morning-digest` は覚えているけれど 16 進数の ID は思い出せない、というときに便利です。ジョブ ID に完全一致した場合はそちらが優先されます。ID ではなく、名前が複数のジョブに一致した場合は、コマンドは実行を拒み、区別できるように候補の ID を表示します。
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

- `--skill` を繰り返すと、そのジョブにひもづくスキル一覧を置き換えます
- `--add-skill` は、既存の一覧を置き換えずに追加します
- `--remove-skill` は、指定したスキルのひもづけを外します
- `--clear-skills` は、ひもづいたスキルをすべて外します

## ライフサイクルの操作 {#lifecycle-actions}

cron ジョブには、作成と削除だけではない、もっと幅のあるライフサイクルがあります。

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

- `pause` — ジョブは残したまま、予約実行を止めます
- `resume` — ジョブを再び有効にし、次の実行時刻を計算し直します
- `run` — 次のスケジューラーのティックでジョブを実行させます
- `remove` — ジョブを完全に削除します
- `edit` — 予約・プロンプト・配信先などを変更します

**名前での指定。** 状態を変える 4 つの動詞（`pause`、`resume`、`run`、`remove`、`edit`）とエージェントの `cronjob` ツールは、16 進数の ID の代わりにジョブの**名前**も受け付けます（大文字小文字は区別しません）。エージェントも CLI も、ID に完全一致するものがあればそちらを優先します。名前が複数のジョブに一致してあいまいな場合は、候補の ID をすべて示したうえで実行を拒みます。名前は一意ではないので、この防止策は重要です。同じ名前のジョブが 2 つあるときに、意図しないほうを黙って書き換えてしまうのを防いでくれます。

## エージェントによる予約管理（cron ジョブが cron ジョブを管理する） {#agent-managed-scheduling-cron-jobs-that-manage-cron-jobs}

既定では、スケジューラー*から*起動されたエージェントは `cronjob` ツールを使えません。
予約実行されたジョブが、他のジョブを作成・編集・削除することはできない、という
ことです。使いたい場合は `config.yaml` で明示的に有効にします。

```yaml
cron:
  allow_agent_scheduling: true   # default: false
```

有効にすると、予約実行のエージェントも通常のチャットのセッションと同じように
cron の表を管理できます。予約された作業の中から追加の 1 回きりのジョブを予約する、
自分の実行間隔を調整する、表全体を整理する「cron の司書」のようなジョブを走らせる
（一覧を取り、必要に応じて更新・削除・作成する）といったことが可能です。これが
破綻しないよう、2 つの性質が備わっています。

- **表は 1 つ、持ち主は利用者。** cron の実行から作られたジョブも、他のジョブと
  同じ `jobs.json` に入り、特別な所有権は持ちません。自分で作ったジョブと
  まったく同じように、一覧表示・編集・削除ができます。
- **宙に浮いた配信先を作らない。** cron の実行は一時的なものなので、その中の
  `deliver: origin` は、**作成の時点で**作成元ジョブ自身の具体的な宛先
  （`platform:chat_id[:thread_id]`、作成元ジョブがどこにも配信しない場合は
  `local`）に解決されます。予約実行のエージェントが作ったジョブが、すでに
  存在しないセッションへ出力を向けてしまうことはありません。明示的な宛先
  （`local`、`all`、`telegram:<chat_id>`）は、書かれたとおりに扱われます。

プロンプトは、実行のたびに新しいジョブを作るものより、既存のジョブを更新するもの
（まず一覧を取り、ID を指定して更新する）を選ぶほうがよいでしょう。

## 仕組み {#how-it-works}

**cron の実行はゲートウェイのデーモンが担当します。** ゲートウェイは 60 秒ごとにスケジューラーを進め、実行時刻になったジョブを、それぞれ独立したエージェントセッションで走らせます。

```bash
hermes gateway install     # Install as a user service
sudo hermes gateway install --system   # Linux: boot-time system service for servers
hermes gateway             # Or run in foreground

hermes cron list
hermes cron status
```

### ゲートウェイのスケジューラーの動き {#gateway-scheduler-behavior}

ティックのたびに、Hermes は次のことを行います。

1. `~/.hermes/cron/jobs.json` からジョブを読み込む
2. `next_run_at` を現在時刻と照らし合わせる
3. 実行時刻になったジョブごとに、新しい `AIAgent` セッションを開始する
4. 必要に応じて、ひもづいたスキルをその新しいセッションへ差し込む
5. プロンプトを最後まで実行する
6. 最終的な応答を届ける
7. 実行の記録と、次回の実行時刻を更新する

`~/.hermes/cron/.tick.lock` にあるファイルロックが、スケジューラーのティックの重なりによって同じジョブの束が二重に実行されるのを防ぎます。

### 実行の履歴 {#execution-history}

Hermes は、実行役やプロバイダーへ処理を渡す前に、確保した cron の試行を
プロファイルごとの `~/.hermes/cron/executions.db` へ記録します。試行は
`claimed`、`running` を経て、変更されない終了状態のいずれか（`completed`、
`failed`、`unknown`）へ進みます。再起動後、Hermes が放置された試行を `unknown` と
記録するのは、元の PID とプロセス起動時の指紋によって、その持ち主がもういないと
確かめられた場合だけです。不明とされた試行は監査のための記録であり、自動で
再実行されることはありません。

直近の試行は `hermes cron runs [job-id] --limit 20`（別名は `history`）で
確認できます。終了した履歴には上限がありますが、進行中の試行が刈り取られる
ことはありません。この台帳はクイックバックアップにも含まれます。

### 失敗が続いたときの見直しの促し {#repeated-failure-review-nudge}

各ジョブは `failure_streak`、つまり連続して失敗した実行の回数を記録しています
（配信の失敗は数えません）。更新が中途半端に適用されて import が壊れた、
プロバイダーのクライアントを構築できなかった、といった、そもそもエージェントに
たどり着く前の失敗も、エージェント自身が失敗した場合と同じように数えられ、
同じように通知されます。*繰り返し実行される*ジョブの連続失敗がしきい値に達すると、
チャットへ届く失敗のメッセージに見直しを促す一文が加わり、そのジョブが N 回連続で
失敗していることを伝えて、修正するか、一時停止する（`hermes cron pause <job>`）か、
削除するかを勧めます。1 回でも成功すれば連続失敗の数は 0 に戻り、`hermes cron list`
では失敗しているジョブの最終実行の横に連続失敗の回数が表示されます。1 回きりの
ジョブでは、この促しは行われません。

```yaml
cron:
  failure_nudge_threshold: 3   # default; 0 disables the nudge
```

## 配信先の選択肢 {#delivery-options}

ジョブを予約するときに、出力の届け先を指定します。

| 選択肢 | 説明 | 例 |
|--------|-------------|---------|
| `"origin"` | ジョブを作成した場所へ返す | メッセージ系プラットフォームでの既定値 |
| `"local"` | ローカルのファイルにだけ保存する（`~/.hermes/cron/output/`） | CLI での既定値 |
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
| `"bot-chat"` | このプロファイル本来の Bot Chat。ボットが出力を読んで応答します | 同じ端末の中 |
| `"bot-chat:research"` | 同じ端末の別プロファイルの Bot Chat | 作成時に検証されます |
| `"all"` | つながっているホームチャンネルすべてへ配る | 実行時に解決されます |
| `"telegram,discord"` | 指定した複数のチャンネルへ配る | カンマ区切りの並び |
| `"origin,all"` | 作成元に**加えて**、つながっている他のすべてのチャンネルへ届ける | どの指定でも組み合わせられます |

エージェントの最終的な応答は、設定した `deliver:` の宛先へ自動的に届けられます。エージェント自身がメッセージを送るわけではないので、cron のプロンプトの中で送信を呼び出す必要はありません。

### Bot Chat への配信（`bot-chat`） {#bot-chat-delivery-bot-chat}

`bot-chat` は、出力を**そのプロファイル本来の「Bot Chat」セッションへ、実際のメッセージとして**届けます。他の宛先ではチャンネルを読む人間が受け手ですが、ここでの受け手はボット自身です。ボットは出力を受信メッセージとして受け取り、対応が必要なものに対応し、自分のチャットで応答します。予約実行の出力を、ただ投稿するのではなく*処理させたい*ときに使ってください。

- `bot-chat`（そのまま）は、そのジョブ自身のプロファイルを指します。
- `bot-chat:<profile>` は、**同じ端末上の**別のプロファイルを指します。名前はジョブの作成時に `hermes profile list` と照合されます。他のゲートウェイや他の端末のプロファイルは指定できないので、端末をまたいで同じ名前があってもあいまいさは生じません。
- 配信 1 回につき、宛先のボットのエージェントのやり取りが 1 回まるごと消費されます。実行の頻度には気をつけてください。
- 他の宛先と組み合わせられますが（`bot-chat,telegram`）、`all` には決して含まれません。

### 配信の意図（`all`） {#routing-intent-all}

`all` を使うと、1 つの cron ジョブの出力を、設定済みのすべてのメッセージ系チャンネルへ、名前を並べることなく送れます。これは**実行時に解決される**ので、Telegram をつなぐ前に作ったジョブでも、`TELEGRAM_HOME_CHANNEL` を設定した後の次のティックからは Telegram にも届くようになります。

意味としては、`all` はホームチャンネルが設定されているすべてのプラットフォームに展開されます。0 個でも構いません。その場合、ジョブは配信先を 1 つも生成せず、上流では配信の失敗として記録されます。

`all` は明示的な宛先と組み合わせられます。`origin,all` は、作成元のチャットに*加えて*、つながっている他のすべてのホームチャンネルへ届け、`(platform, chat_id, thread_id)` で重複を取り除きます。

### Telegram の cron 用トピック（`TELEGRAM_CRON_THREAD_ID`） {#telegram-cron-topic-telegramcronthreadid}

Telegram のトピックモードを有効にすると、DM のルートはシステム用の待合室として予約され、そこへ送った返信はロビーであることを知らせる案内とともに退けられ、`reply_to_message_id` も落とされます。そのため、メインのチャットに届いた cron のメッセージには返信できません。

代わりに、専用のフォーラムトピックへ cron を向けてください。

1. Telegram でボットとの DM を開き、たとえば `Cron` という名前のトピックを作ります。トピックのヘッダーを長押しして **Copy link** を選ぶと、末尾の整数がそのトピックの `message_thread_id` です。
2. `.env` に `TELEGRAM_CRON_THREAD_ID=<that id>` を設定します。

これが効くのは cron の配信だけです。他の用途（再起動の通知など）で使われる `TELEGRAM_HOME_CHANNEL_THREAD_ID` は変わりません。`deliver="telegram:chat_id:thread_id"` のように明示した宛先は、これまでどおり環境変数より優先されます。cron のメッセージへの返信は既存のトピックのセッションに届くので、そのまま続きの操作ができます。

### 応答の囲み {#response-wrapping}

既定では、届けられる cron の出力にはヘッダーとフッターが付き、受け取った側が定期実行タスクからのものだと分かるようになっています。

```
Cronjob Response: Morning feeds
-------------

<agent output here>

Note: The agent cannot see this message, and therefore cannot respond to it.
```

囲みを付けずにエージェントの出力そのままを届けたい場合は、`cron.wrap_response` を `false` にします。

```yaml
# ~/.hermes/config.yaml
cron:
  wrap_response: false
```

### 会話を続けられるジョブ（cron の配信に返信する） {#continuable-jobs-reply-to-a-cron-delivery}

既定では、cron の配信は送りっぱなしです。メッセージは送られますが、そのチャットの
会話履歴には残らないので、返信してもエージェントには自分が何を言ったかの記録が
ありません。ジョブを**会話継続あり**に設定すると、届いた要約がそのまま返信できる
会話になります。「タスク #2 って何のことですか」と聞き返されることなく、
エージェントは要約を文脈として持っています。

明示的に有効にする方式で、**既定は無効**です。設定ファイルで全体に有効にするか、
`cronjob` ツールの `attach_to_session`（そのジョブにかぎり全体設定を上書きします）で
ジョブごとに指定します。

```yaml
# ~/.hermes/config.yaml
cron:
  mirror_delivery: false   # set true to make cron deliveries continuable
```

動きは**スレッド優先**で、そのジョブの作成元チャットの範囲に限られます。

- **スレッドを持てるプラットフォーム**（Telegram のトピック、Discord / Slack の
  スレッド）では、配信ごとに専用のスレッドが開かれ、要約はそのスレッドの
  セッションへ差し込まれます。そのため、スレッド内で返信すれば文脈を保ったまま
  会話が続きます。日次の要約のような繰り返しジョブは実行ごとに新しいスレッドを
  開くので、配信ごとのやり取りが混ざりません。
- **DM しかないプラットフォーム**（WhatsApp、Signal、SMS）にはスレッドがないため、
  要約は作成元の DM のセッションへ写されます。DM そのものが会話を続ける場になる、
  ということです。

触られるのは作成元のチャットだけです。同報や一斉配信の宛先（`all`、明示した
他チャットへの配信）が会話継続ありになることはありません。写しは
ラベル付きの利用者の発言（`[Cron delivery: <task name>]`）として書き込まれ、
これによって会話履歴の発言の交互性が、どのモデルのプロバイダーでも保たれます。

#### チャンネル内に平らに続ける（Slack） {#flat-in-channel-continuation-slack}

上のスレッド優先の動きは、配信のたびに専用のスレッドを作ります。会話を続けられる
ジョブを、スレッドではなく**チャンネルのタイムラインに平らに**置きたい場合は、
Slack の**会話継続の場所**を `in_channel` に設定します。

```yaml
# ~/.hermes/config.yaml
slack:
  cron_continuable_surface: in_channel   # default: thread
  reply_in_thread: false                 # required pairing (see below)
  require_mention: false                 # so a plain reply continues the job
```

`in_channel` モードでは、要約はチャンネルの通常のトップレベルのメッセージとして
届き（スレッドは作られません）、そこへ返信すると、チャンネル共有のセッションを
通じてジョブの会話が続きます。次の 3 つの設定が組み合わさって働きます。

- **`cron_continuable_surface: in_channel`** — 配信時にスレッドを作らなくなります。
- **`reply_in_thread: false`**（必須）— ボットが返信に対してチャンネル内で*平らに*
  答えるようになり、要約が差し込まれたのと同じチャンネル全体のセッションに
  ひもづきます。これがないと会話の継続自体は動くもののスレッドの中に現れます
  （返信が落ちるのではなく、スレッド方式の継続へ安全に戻ります。ゲートウェイは
  起動時に警告を記録するので、食い違いに気づけます）。
- **`require_mention: false`**（またはそのチャンネルを `free_response_channels` に
  追加する）— 普通のメッセージで返信できるようにします。そうしないと、返信の
  たびに `@` で呼びかけないとボットが反応しません。

会話の継続が**チャンネル全体**のセッションである以上、それは共有されたものになります。
チャンネル内の他の雑談も、会話継続ありの 2 つ目のジョブも、同じ流れの会話に混ざります。
これは「チャンネル内に平らに置く」ことに元から伴うもので、`reply_in_thread: false` を
使う人がすでに受け入れているのと同じ引き換えです。配信ごとのやり取りを切り分けたい
ときは、既定の `thread` を使ってください。

これは今のところ Slack の機能です。他のプラットフォームでもこのキーは受け付けますが、
`thread` の挙動に戻ります（会話継続の仕組みが異なるためです）。設定はプラットフォーム
ごとで、それぞれのプラットフォームの設定の下に書きます。これはゲートウェイ側の設定
なので、`/restart` すれば反映されます。Slack アプリの再インストールは不要です。

:::note 1 対 1 の DM
`cron_continuable_surface` は**チャンネル**の設定です。1 対 1 の DM には
スレッドかタイムラインかという選択がそもそもなく（DM はすでに平らです）、
このキーは効きません。DM で cron の配信を続けられるかどうかを決めるのは、
以前からある別の設定 **`slack.dm_top_level_threads_as_sessions`** です。

- **`false`** — トップレベルの DM はすべて 1 つの流れの DM セッションを共有します。
  そのため、会話継続ありの cron の要約と返信が**同じ**セッションに入り、文脈を
  保ったままジョブの会話が続きます。DM で会話を続けたいなら、これを選びます。
- **`true`**（既定）— トップレベルの DM のメッセージがそれぞれ独立したセッションに
  なるため、届いた要約に返信すると要約の記録を持たない*新しい*セッションが始まります。
  このモードでは会話の継続は働きません（cron でも、他の平らな配信でも同様です）。

つまり、1 対 1 の DM に届ける会話継続ありの cron ジョブでは、
`slack.dm_top_level_threads_as_sessions: false` を設定してください。DM では
`cron_continuable_surface` は不要です（設定しても無視されます）。
:::

### 静かに黙らせる {#silent-suppression}

エージェントの最終的な応答に `[SILENT]` が含まれていると、配信はまるごと止められます。出力は監査のためにローカル（`~/.hermes/cron/output/`）へ保存されますが、配信先にはメッセージが送られません。

これは、異常があったときだけ報告してほしい監視ジョブに便利です。

```text
Check if nginx is running. If everything is healthy, respond with only [SILENT].
Otherwise, report the issue.
```

失敗したジョブは、`[SILENT]` の目印にかかわらず必ず配信されます。黙らせられるのは成功した実行だけです。静かな監視ジョブにしたいときは、報告することがなければ `[SILENT]` だけを返すようエージェントに指示してください。

## スクリプトのタイムアウト {#script-timeout}

実行前のスクリプト（`script` パラメーターでひもづけたもの）には、既定で 3600 秒（1 時間）のタイムアウトがあります。これが縛るのは**スクリプトだけ**です。スキルを使うジョブや LLM が動かすジョブは、別枠の無応答時間の予算で動き、この値の上限は受けません。スクリプトに別の上限が必要なら、変更できます。

```yaml
# ~/.hermes/config.yaml
cron:
  script_timeout_seconds: 1800   # 30 minutes
```

または `HERMES_CRON_SCRIPT_TIMEOUT` 環境変数を設定します。解決の順序は、環境変数 → config.yaml → 既定の 3600 秒、です。

cron は、実行後のセッションとエージェントの資源の後片付けにも上限を設けています。これは LLM のやり取りが返ってきた後に起きるので、無応答時間のタイムアウトとは別ものです。既定は後片付けの操作 1 つにつき 10 秒です。保存や通信のクライアントの終了処理が返ってこなくなった場合、スケジューラーはエラーを記録し、そのジョブの実行中フラグを解放して、以降の実行が始められるようにします。そのジョブが永久に飛ばされ続けることはありません。

```yaml
# ~/.hermes/config.yaml
cron:
  cleanup_timeout_seconds: 10
```

`cleanup_timeout_seconds: 0` は、上限のない従来の後片付けの挙動に戻したいときにだけ設定してください。

## メディア送信のタイムアウト {#media-send-timeout}

cron の配信に、生成した PDF・読み上げ音声・書き出したレポートなどのメディアの添付が含まれ、それを稼働中のゲートウェイのアダプター経由で送る場合、添付ごとのアップロードにタイムアウトがかかります。既定は 300 秒です。回線が細いところで大きなファイルを送るなら、もっと必要になることもあります。

```yaml
# ~/.hermes/config.yaml
cron:
  media_send_timeout_seconds: 600   # 10 minutes per attachment
```

または `HERMES_CRON_MEDIA_SEND_TIMEOUT` 環境変数を設定します。解決の順序は、環境変数 → config.yaml → 既定の 300 秒、です。タイムアウトした添付は、そのジョブの実行状態に部分的な配信の失敗として記録されます（本文のほうは届きます）。

## Bot Chat 配信のタイムアウト {#bot-chat-delivery-timeout}

`bot-chat` への配信は、宛先のボットのチャットでエージェントのやり取りを 1 回まるごと走らせるので、上限は秒ではなく分の単位になります。既定は 600 秒です。

```yaml
# ~/.hermes/config.yaml
cron:
  bot_chat_delivery_timeout_seconds: 900
```

タイムアウトした配信は `last_delivery_error` に記録されます。ボット側のやり取りは、そのまま自力で終わることもあります。

## no-agent モード（スクリプトだけのジョブ） {#no-agent-mode-script-only-jobs}

LLM の推論を必要としない繰り返しジョブ、たとえば昔ながらの監視、ディスクやメモリの警告、生存確認、CI への通知などでは、作成時に `no_agent=True` を渡します。スケジューラーは予約どおりにスクリプトを実行し、その標準出力をそのまま届けて、エージェントをまるごと省きます。

```bash
hermes cron create "every 5m" \
  --no-agent \
  --script memory-watchdog.sh \
  --deliver telegram \
  --name "memory-watchdog"
```

意味は次のとおりです。

- スクリプトの標準出力（前後の空白を除いたもの）が、そのままメッセージとして届きます。
- **標準出力が空なら、そのティックは無言**で、配信もありません。これが監視の型です。「異常があるときだけ何か言う」ということです。
- 終了コードが 0 以外、またはタイムアウトした場合はエラーの通知が届くので、壊れた監視が黙り込んでしまうことはありません。
- 最終行が `{"wakeAgent": false}` なら、そのティックは無言です（LLM を使うジョブと同じ判定を使います）。
- トークンも、モデルも、プロバイダーのフォールバックもありません。このジョブが推論の層に触れることはありません。

`.sh` / `.bash` のファイルは、`PATH` にあれば `bash` で、なければ `/bin/bash` で実行されます（Windows の Git Bash では重要です）。それ以外は、現在の Python インタープリター（`sys.executable`）で実行されます。スクリプトは `$HERMES_HOME/scripts/` の中に解決されなければなりません。相対名・絶対パス・`~` で始まるパスのいずれも、解決した先がそのディレクトリの中にとどまるかぎり受け付けられます。外へ出るパスは拒否されます。子プロセスの環境変数は掃除されており（`_sanitize_subprocess_env`）、プロバイダーの API 認証情報など Hermes が管理する秘密の値は、cron のスクリプトへ**引き継がれません**。

### エージェントが用意してくれます {#the-agent-sets-these-up-for-you}

`cronjob` ツールのスキーマは `no_agent` を Hermes に直接公開しているので、チャットで監視の内容を伝えれば、エージェントが組み立ててくれます。

```text
Ping me on Telegram if RAM is over 85%, every 5 minutes.
```

Hermes は `write_file` でチェック用のスクリプトを `~/.hermes/scripts/` に書き、続いて次のように呼び出します。

```python
cronjob(action="create", schedule="every 5m",
        script="memory-watchdog.sh", no_agent=True,
        deliver="telegram", name="memory-watchdog")
```

メッセージの内容がスクリプトだけで決まる場合（監視、しきい値の警告、生存確認）には、`no_agent=True` が自動的に選ばれます。同じツールでジョブの一時停止・再開・編集・削除もできるので、CLI に触れることなく、ライフサイクル全体をチャットから進められます。

実際の例は[スクリプトだけの cron ジョブの手引き](/hermes/docs/guides/cron-script-only/)を参照してください。

## `context_from` でジョブをつなぐ {#chaining-jobs-with-contextfrom}

cron ジョブは独立したセッションで動くので、前回の実行の記憶を持ちません。とはいえ、あるジョブの出力が次のジョブにちょうど必要、ということもあります。`context_from` パラメーターは、そのつながりを自動で作ります。ジョブ B のプロンプトには、実行時にジョブ A の直近の出力が文脈として先頭に付け足されます。

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
- その出力が、ジョブ 2 のプロンプトの先頭に自動で付け足されます
- ジョブ 2 は「このファイルを読め」と書いておく必要がありません。内容が文脈として渡されます
- つなぐ数に制限はありません。ジョブ 1 → ジョブ 2 → ジョブ 3 → … と続けられます

**`context_from` が受け取れる形式**

| 形式 | 例 |
|--------|---------|
| ジョブ ID を 1 つ（文字列） | `context_from="a1b2c3d4"` |
| ジョブ ID を複数（リスト） | `context_from=["job_a", "job_b"]` |

出力は、並べた順につなげられます。

**継続性: 前回の実行の出力を引き継ぐ**

`continuity=true` を設定すると、そのジョブは実行のたびに*自分自身*の直近の出力を差し込みます。繰り返しジョブは通常、毎回まっさらな状態で始まるため、ニュースを探すジョブは同じ記事を何度も報告し、監視のジョブは同じ状態で何度も警告します。継続性を有効にすると、ジョブは前回自分が報告した内容を見た状態で目覚めるので、重複を省いて続きから進められます。

```python
cronjob(
    action="create",
    prompt="Scan HN and arXiv for new agent-tooling papers. Report only items NOT already covered in your previous run's output.",
    schedule="every 6h",
    continuity=True,
    name="Agent Tooling Scout",
)
```

初回の実行には前回の出力がないので、プロンプトはそのまま実行されます。2 回目以降は、前回の出力が「すでに報告した内容を繰り返さないように」という枠組みとともに先頭へ付け足されます。上流のジョブとの併用も自由で（`context_from=["<other_job_id>"]` と `continuity=true` の同時指定）、更新時に `continuity=false` にすると、他の `context_from` の指定を残したまま継続性だけを切れます。内部的には、このフラグは `context_from` の中の予約された `self` という項目として保存されます。

CLI からは `hermes cron create "every 6h" "Scan for news" --continuity` で作成でき、既存のジョブでは `hermes cron edit <job_id> --continuity` / `--no-continuity` で切り替えられます。同じ切り替えは、ダッシュボードの cron 編集画面と、デスクトップの Bot Mode の定期実行ダイアログにもあります。

**こんなときに使います**

- 複数段のパイプライン（収集 → 絞り込み → 整形 → 配信）
- N 番目の作業が N−1 番目の出力に依存する、順序のあるタスク
- 1 つのジョブが複数のジョブの結果をまとめる、分散と集約の形
- 自分の前回の報告と重複を省きたい、繰り返しの探索や監視（`continuity=true`）

## プロバイダーの復旧 {#provider-recovery}

cron ジョブは、設定済みのフォールバックのプロバイダーと、認証情報プールの巡回をそのまま引き継ぎます。主となる API キーが利用制限にかかったり、プロバイダーがエラーを返したりした場合、cron のエージェントは次のことができます。

- `config.yaml` に `fallback_providers`（あるいは旧来の `fallback_model`）を設定していれば、**別のプロバイダーへ切り替える**
- 同じプロバイダーの[認証情報プール](/hermes/docs/user-guide/configuration/#credential-pool-strategies)の中で、**次の認証情報へ切り替える**

つまり、高い頻度で動く cron ジョブや、混み合う時間帯に動く cron ジョブが、より粘り強くなります。キーが 1 つ制限にかかっただけで実行全体が失敗することはありません。

## 予約した実行が取りこぼされたとき（`last_fire_error`） {#missed-scheduled-fires-lastfireerror}

ホスティング型（マネージド cron）の環境では、予約された実行はプラットフォームのスケジューラーからダッシュボードを経由して、ゲートウェイの内部 API サーバーへ届きます。この最後の受け渡しが失敗した場合、つまりゲートウェイのプロセスが落ちていたり、その API サーバーの待ち受けが起動していなかったりすると、実行そのものが始まらないので、実行の記録も、確認できる `last_status` も残りません。特徴的な症状は、手動で実行すれば毎回動くのに、自動では一度も動かない、という形です。

こうした取りこぼしは `last_fire_error`（時刻と理由）としてジョブの記録に刻まれ、次の場所で確認できます。

- `cronjob` ツールの `action: "list"` にある `last_fire_error` フィールド
- `hermes cron list` で、ジョブの下に赤字で出る `⚠ Missed scheduled fire:` の行
- ダッシュボードのジョブ画面

この記録は常に**現在の**自動実行の健康状態を映します。新しい取りこぼしがあれば上書きされ、次に実行が成功すれば自動で消えます。これが見えているときは、ジョブと予約自体には問題がなく、手当てが必要なのは実行を伝えるゲートウェイ側です（多くの場合は、`hermes gateway restart` のように監督プロセス経由でゲートウェイを再起動して、プロファイルの環境をすべて読み込ませ直します）。

### 取りこぼしの取り戻し {#misfire-catch-up}

外部のスケジューラーが動いている場合（ホスティング型でのマネージド cron）、ゲートウェイは取り戻しの走査も行います。予約時刻を過ぎても実行が届かず、猶予の時間も過ぎたジョブは、ローカルで確保して実行されます。そのため、実行の受け渡しが止まっても、失うのは丸一日ではなく数分で済みます。この走査は、通常の実行と同じ保管庫の確保の仕組みによって、スケジューラー自身の遅れた再送とは重複しないようになっています。

```yaml
cron:
  misfire_grace_minutes: 10   # wait this long for the scheduler's own retries
                              # before catching up locally; 0 disables catch-up
```

ローカル（内蔵のティッカー）の環境ではこれは不要です。ティッカーは次のティックで、時刻を過ぎたジョブをすでに拾ってくれます。

## 予約の書き方 {#schedule-formats}

エージェントの最終的な応答は、そのジョブの `deliver:` の宛先へ自動的に届けられます。エージェント自身がメッセージを送ることはもうないので、利用者に見せたい内容は最終的な応答にそのまま書けば大丈夫です。**追加の宛先や別の宛先**へ届けたいときは、エージェントに送らせるのではなく、cron ジョブの `deliver:` に複数の宛先をカンマ区切りで並べます（たとえば `deliver: "telegram,discord"`）。

### 相対的な待ち時間（1 回きり） {#relative-delays-one-shot}

```text
30m     → Run once in 30 minutes
2h      → Run once in 2 hours
1d      → Run once in 1 day
```

### 間隔（繰り返し） {#intervals-recurring}

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

### ISO 形式の時刻 {#iso-timestamps}

```text
2026-03-15T09:00:00    → One-time at March 15, 2026 9:00 AM
```

## 繰り返しの挙動 {#repeat-behavior}

| 予約の種類 | 既定の繰り返し | 挙動 |
|--------------|----------------|----------|
| 1 回きり（`30m`、時刻の指定） | 1 | 1 回だけ実行します |
| 間隔（`every 2h`） | 無期限 | 削除するまで実行し続けます |
| cron 式 | 無期限 | 削除するまで実行し続けます |

これは上書きできます。

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

`update` では、`skills=[]` を渡すとひもづいたスキルをすべて外せます。

### 手動での実行は非同期です {#manual-runs-are-asynchronous}

`cronjob(action="run")` は、`delegate_task` と同じように、ジョブをただちに
**バックグラウンドで**実行します。ツールの呼び出しはすぐに引き換えの情報を返し、
実行が終わると、その結果（成功か失敗か、配信先、次回の予約、出力の抜粋）が
新しいメッセージとして会話に戻ってきます。その間もエージェント（と利用者）は
作業を続けられ、すでに実行中のジョブは二重に走らせるのではなく
「already running」として拒否されます。

`action="run"` に `prompt` を添えると、その回かぎりの文脈を差し込めます。

```python
cronjob(action="run", job_id="...", prompt="CONTEXT: focus on the EU region today")
```

この文脈は、`## Run Context` という見出しの下に、そのジョブの保存済みプロンプトへ
付け足されます。効くのはその 1 回の実行だけで、ジョブの定義に保存されることは
なく、保存済みのプロンプトと同じプロンプトインジェクションの検査を通ります。

切り離された結果を受け取れない実行環境（1 回きりの `hermes -z`、CLI からの `hermes cron run`、cron の子セッション、Kanban のワーカー）では、自動的に同期実行に切り替わります。

## cron ジョブが使えるツールセット {#toolsets-available-to-cron-jobs}

cron はジョブごとに、チャットのプラットフォームがつながっていない新しいエージェントセッションで実行します。既定では、cron のエージェントが受け取るのは **`hermes tools` で `cron` プラットフォーム向けに設定したツールセット**です。CLI の既定でも、ありとあらゆるツールでもありません。

```bash
hermes tools
# → pick the "cron" platform in the curses UI
# → toggle toolsets on/off just like you would for Telegram/Discord/etc.
```

ジョブごとにさらに絞りたい場合は、`cronjob.create` の `enabled_toolsets` フィールド（既存のジョブなら `cronjob.update`）で指定できます。

```text
cronjob(action="create", name="weekly-news-summary",
        schedule="every sunday 9am",
        enabled_toolsets=["web", "file"],      # just web + file, no terminal/browser/etc.
        prompt="Summarize this week's AI news: ...")
```

ジョブに `enabled_toolsets` が設定されていればそれが優先され、なければ `hermes tools` の cron プラットフォームの設定が使われ、それもなければ Hermes は組み込みの既定値に戻ります。これは費用の管理に効いてきます。ちょっとした「ニュースを取ってくる」だけのジョブに `browser` や `delegation` まで持たせると、LLM を呼ぶたびにツールのスキーマの分だけプロンプトが膨らむからです。

### エージェントをまるごと省く: `wakeAgent` {#skipping-the-agent-entirely-wakeagent}

cron ジョブに事前チェックのスクリプトを（`script=` で）ひもづけている場合、そのスクリプトが実行時に、Hermes がそもそもエージェントを呼ぶべきかどうかを決められます。標準出力の最終行に、次の形を出力してください。

```text
{"wakeAgent": false}
```

そうすると、cron はそのティックのエージェントの実行をまるごと省きます。1〜5 分ごとのような頻繁な巡回で、状態が実際に変わったときだけ LLM を起こしたい、というときに便利です。そうしないと、中身のないやり取りに何度も料金を払うことになります。

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

`wakeAgent` を省いた場合の既定は `true` です（いつもどおりエージェントを起こします）。

#### 実例: 安上がりな実行前の関門 {#recipes-cheap-pre-run-gates}

`wakeAgent` の関門を使うと、予約したジョブが LLM のトークンをそもそも使うべきかどうかを、費用 0 で判断できます。次の 3 つの型で、たいていの用途はまかなえます。

**ファイルの変更を見る関門** — 監視対象のファイルに、前回成功したティック以降の新しい内容があるときだけ実行します。スケジューラーはジョブごとの `last_run_at` を記録しているので、それをファイルの更新時刻と比べます。

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

**外部の合図を見る関門** — 他のプロセスが準備完了を知らせたときだけ実行します（たとえばデプロイのフックがファイルを置く、CI のジョブが状態の保管先に値を書く、など）。

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

**SQL の件数を見る関門** — 自分のデータベースに処理すべき新しい行があるときだけ実行します。スクリプトは `context` を通じて件数をエージェントへ渡すこともできるので、エージェントは問い合わせをやり直さなくても、どれくらいの量を扱うのか分かります。

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

同じ型は、スクリプトから問い合わせられるデータの置き場所なら何にでも使えます。Postgres でも、HTTP の API でも、自分で用意した状態の保管先でも構いません。cron の仕組みの中に SQL の評価器を組み込む必要はありません。

:::tip
Hermes 自身の `~/.hermes/state.db` は内部用のスキーマで、リリースごとに変わります。実行前の関門から問い合わせないでください。自分のデータベースやフィードを見るようにしてください。
:::

謝辞: この実例集は、@iankar8 さんが [#2654](https://github.com/NousResearch/hermes-agent/pull/2654) で試された内容がきっかけで生まれました。そこでは sql / file / command のきっかけを別の仕組みとして追加することが提案されていました。`script` と `wakeAgent` の関門があれば 3 つの場合すべてを費用 0 でまかなえるため、この成果は機能ではなくドキュメントとして着地しました。

### ジョブをつなぐ: `context_from` {#chaining-jobs-contextfrom}

cron ジョブは、他のジョブの名前（または ID）を `context_from` に並べることで、そのジョブが直近に成功した出力を受け取れます。

```text
cronjob(action="create", name="daily-digest",
        schedule="every day 7am",
        context_from=["ai-news-fetch", "github-prs-fetch"],
        prompt="Write the daily digest using the outputs above.")
```

指定したジョブの、直近に完了した出力が、この実行のプロンプトの上に文脈として差し込まれます。上流の指定は、いずれも有効なジョブ ID か名前でなければなりません（`cronjob action="list"` を参照してください）。なお、読み込まれるのは*直近に完了した*出力です。同じティックで実行中の上流のジョブを待つことはしません。

## ジョブの保存場所 {#job-storage}

ジョブは `~/.hermes/cron/jobs.json` に保存されます。実行の出力は `~/.hermes/cron/output/{job_id}/{timestamp}.md` に保存されます。

ジョブの定義はディスク上のただの JSON なので、`hermes update`、ゲートウェイの再起動、端末の再起動を越えて残ります。再起動のときに実行中だったジョブは、実行の台帳に `unknown` と記録されます。自動で再実行されることはありませんが、そのジョブの次の予約時刻には通常どおり実行されます。詳しくは[実行の履歴](#execution-history)を参照してください。

:::tip
ジョブの管理は `jobs.json` を直接いじるのではなく、`cronjob` ツール、`hermes cron edit`、`/cron` のいずれかを通してエージェントに頼んでください。直接の編集は、[ファイル書き込みの安全機構](/hermes/docs/user-guide/security/#file-write-safety)がそのパスを止めたとき（たとえば `HERMES_WRITE_SAFE_ROOT` が設定されているとき）に、何も言わずに失敗することがあります。そして[ファイル変更の検証](/hermes/docs/user-guide/configuration/#file-mutation-verifier)のフッターこそが、保存されなかったことを示す確かな合図です。
:::

ジョブは `model` と `provider` を `null` のまま保存することがあります。これらのフィールドが省かれている場合、Hermes は実行時にグローバルの設定から解決します。ジョブの記録にこれらが現れるのは、そのジョブ固有の指定がある場合だけです。

保存にはアトミックなファイル書き込みを使っているので、書き込みが中断されても、途中まで書かれたジョブのファイルが残ることはありません。

## それでもプロンプトは自己完結させること {#self-contained-prompts-still-matter}

:::warning 重要
cron ジョブは、完全にまっさらなエージェントセッションで動きます。ひもづけたスキルが与えてくれるもの以外で、エージェントに必要なものはすべてプロンプトに書いてください。
:::

**悪い例:** `"Check on that server issue"`

**良い例:** `"SSH into server 192.168.1.100 as user 'deploy', check if nginx is running with 'systemctl status nginx', and verify https://example.com returns HTTP 200."`

## セキュリティ {#security}

定期実行タスクのプロンプトは、作成時と更新時に、プロンプトインジェクションと認証情報の持ち出しのパターンについて検査されます。目に見えない Unicode の細工、SSH の裏口を仕込もうとするもの、あからさまに秘密の値を持ち出そうとするものを含むプロンプトは、遮断されます。
