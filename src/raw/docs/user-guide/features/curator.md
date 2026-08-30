---
title: "キュレーター"
description: "エージェントが作ったスキルを裏で手入れする仕組み — 利用状況の記録、古びの判定、書庫入れ、そして LLM による見直し"
upstream_path: user-guide/features/curator.md
upstream_blob: 66dd545cc7e611c06095690b9d36404ffc35047e
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/curator
---

# キュレーター {#curator}

キュレーターは、**エージェントが自分で作ったスキル**を裏で手入れする仕組みです。それぞれのスキルが何回開かれ、何回使われ、何回直されたかを記録し、長く使われていないスキルを `active → stale → archived` と移していきます。さらに、ときどき補助モデルによる短い見直しを走らせて、まとめ直しの案を出したり、ずれてきた内容を直したりします。

[自己改善のループ](/hermes/docs/user-guide/features/skills/#agent-managed-skills-skill_manage-tool)で作られたスキルが、いつまでも積み上がり続けないようにするためのものです。エージェントが初めての問題を解くたびにスキルを保存すると、それは `~/.hermes/skills/` に置かれます。手入れをしないでいると、似たような狭いスキルが何十個もたまり、一覧を汚してトークンを無駄にします。

初期値（`prune_builtins: true`）では、キュレーターは主に受け持っているエージェント作のスキルに加えて、**使われていない同梱の組み込みスキル**（リポジトリに最初から入っているもの）も `archive_after_days` の間使われなければ書庫に移せます。ハブから入れたスキル（[agentskills.io](https://agentskills.io) 由来のもの）には、いつでも一切手を触れません。`curator.prune_builtins: false` にすると、エージェント作のスキルだけを相手にする以前の動きに戻り、同梱のスキルには触れなくなります。なお、キュレーターが**自動で削除することはありません**。いちばん厳しくても `~/.hermes/skills/.archive/` へ書庫入りするだけで、そこから戻せます。

[issue #7816](https://github.com/NousResearch/hermes-agent/issues/7816) で追いかけています。

## どう動くか {#how-it-runs}

キュレーターを呼び出すのは、常駐する cron のデーモンではなく、手が空いているかどうかの確認です。CLI のセッション開始時と、ゲートウェイの cron ティッカーのスレッドが定期的に刻むたびに、Hermes は次の二つを確かめます。

1. 前回のキュレーターの実行から十分な時間が経ったか（`interval_hours`、初期値は **7 日**）
2. エージェントが十分に休んでいるか（`min_idle_hours`、初期値は **2 時間**）

どちらも満たしていれば、`AIAgent` を分身としてバックグラウンドに立ち上げます。記憶やスキルの自己改善のうながしと同じ作りです。分身は自分専用のプロンプトキャッシュで動き、今のやりとりには一切触れません。

:::info 初回の動き
入れたばかりのとき（あるいはキュレーター登場前から使っている環境が `hermes update` のあと初めて刻んだとき）、キュレーターは**すぐには動きません**。最初の確認では `last_run_at` を「今」にして、本当の一巡目を `interval_hours` ひとつ分だけ先送りします。おかげで、キュレーターが手を触れる前に、スキルの棚を見直したり、大事なものを固定したり、まるごと使わない選択をしたりする時間がまるまる一巡分とれます。

本番の前にキュレーターが*何をするつもりか*を見ておきたいときは、`hermes curator run --dry-run` を実行してください。棚には手を触れずに、同じ内容の見直し報告だけを出します。
:::

一度の実行には二つの段階があります。

1. **自動の切り替え**（決まりきった処理で、LLM は使いません）。`stale_after_days`（30）の間使われなかったスキルは `stale` になり、`archive_after_days`（90）の間使われなかったスキルは `~/.hermes/skills/.archive/` へ移ります。これは常に働く整理の動きで、キュレーターが有効なら必ず走り、補助モデルの費用はかかりません。
   - **固定したスキル**と、**どれかの cron ジョブから参照されているスキル**（一時停止中や無効のジョブも含みます）は、まるごと対象から外れます。自動の切り替えについては固定と同じ扱いなので、動きの遅い予定や止めてある予定のせいで、ジョブの足元からスキルが書庫入りしてしまうことはありません。まとめ直しの際も、傘となるスキルへ統合したときは cron 側のスキル参照を書き換えます。
   - **一度も使われていないスキル**（`use_count == 0`）には猶予の底が用意してあります。作られてから少なくとも `stale_after_days` 経つまでは書庫入りしません。使われた記録がないことは、証拠がないというだけで、捨ててよい証拠ではありません。
2. **LLM によるまとめ直し**（補助モデルを 1 回だけ使い、反復の上限は高めです。ひととおりの手入れで API 呼び出しはだいたい 50〜100 回になります）— こちらは**初期状態では切ってあります**。`curator.consolidate: true` にすると、分身のエージェントがエージェント作のスキルを見渡し、必要なら `skill_view` でどれでも読み、スキルごとに、そのまま残す／`skill_manage` で手を入れる／重なっているものを種類ごとの傘にまとめる／ターミナルのツールで書庫へ移す、を決めます。まとめ直しでは、スキルを一式のまとまりとして扱います。スキルが `references/`、`templates/`、`scripts/`、`assets/` を持っていたり、それらへの相対リンクを持っていたりする場合、キュレーターは単独のまま残すか、必要な補助ファイルを引っ越させてパスを書き換えるか、その一式ごと手つかずで書庫へ入れるかのどれかを選ばなければなりません。`SKILL.md` だけを別のスキルの `references/` に平たく押し込むことは許されていません。

:::info まとめ直しは自分で入れるもの
初期状態のキュレーターは**整理だけ**をします。決まりきった手順で使われていないスキルに印を付け、長く放っておかれたものを書庫へ移します。考えのはっきりした LLM の**まとめ直し**（傘づくりや、重なるスキルの統合）は初期状態では切ってあります。実行のたびに補助モデルのトークンを使いますし、棚の構造を大きく変えてしまうからです。使いたいときは `curator.consolidate: true` にするか、`hermes curator run --consolidate` でその場かぎり走らせてください。
:::

固定したスキルは、キュレーターの自動の切り替えからも、エージェント自身の `skill_manage` ツールからも守られます。下の[スキルを固定する](#pinning-a-skill)をご覧ください。

## 設定 {#configuration}

設定はすべて `config.yaml` の `curator:` の下に置きます（`.env` ではありません。秘密の値ではないからです）。初期値は次のとおりです。

```yaml
curator:
  enabled: true
  interval_hours: 168          # 7 days
  min_idle_hours: 2
  stale_after_days: 30
  archive_after_days: 90
  consolidate: false           # LLM umbrella-building pass — opt-in (prune-only by default)
  prune_builtins: true         # archive unused bundled built-in skills too (hub skills always exempt)
```

まるごと止めたいときは `curator.enabled: false` にします。常に働く整理は残したまま LLM のまとめ直しも使いたいときは `curator.consolidate: true` にします。

### 見直しを安い補助モデルで走らせる {#running-the-review-on-a-cheaper-aux-model}

キュレーターの LLM による見直しは、ふつうの補助タスクの枠のひとつ（`auxiliary.curator`）です。画像認識、圧縮、セッション検索などと並んでいます。「Auto」は「メインのチャットモデルを使う」という意味で、この枠を上書きすれば、見直し用にプロバイダーとモデルを名指しで決められます。

**いちばん手軽なのは `hermes model` です。**

```bash
hermes model                   # → "Auxiliary models — side-task routing"
                               # → pick "Curator" → pick provider → pick model
```

同じ選択画面は、ウェブのダッシュボードの **Models** タブにもあります。

**config.yaml に直接書く場合（同じことです）:**

```yaml
auxiliary:
  curator:
    provider: openrouter
    model: google/gemini-3-flash-preview
    timeout: 600               # generous — reviews can take several minutes
```

`provider: auto`（初期値）のままにしておくと、見直しはメインのチャットモデルを通ります。ほかの補助タスクと同じ振る舞いです。

:::note 古い書き方
以前の版では、`curator.auxiliary.{provider,model}` という専用のまとまりを使っていました。今でも動きますが、廃止予定を知らせる行がログに出ます。上の `auxiliary.curator` へ移してください。そうすれば、`hermes model`、ダッシュボードの Models タブ、`base_url`、`api_key`、`timeout`、`extra_body` といった仕組みを、ほかの補助タスクと同じように使えます。
:::

## CLI {#cli}

```bash
hermes curator status         # last run, counts, pinned list, LRU top 5
hermes curator run            # trigger a run now (blocks until done). Prune-only unless curator.consolidate: true
hermes curator run --consolidate # force the LLM consolidation pass on for this run, overriding the config default
hermes curator run --background  # fire-and-forget: start the run in a background thread
hermes curator run --dry-run  # preview only — report without any mutations
hermes curator backup         # take a manual snapshot of ~/.hermes/skills/
hermes curator rollback       # restore from the newest snapshot
hermes curator rollback --list     # list available snapshots
hermes curator rollback --id <ts>  # restore a specific snapshot
hermes curator rollback -y         # skip the confirmation prompt
hermes curator pause          # stop runs until resumed
hermes curator resume
hermes curator pin <skill>    # never auto-transition this skill
hermes curator unpin <skill>
hermes curator adopt <skill>    # hand an unmanaged skill to the curator
hermes curator adopt --all-unmanaged   # hand over every unmanaged skill
hermes curator list-unmanaged   # itemize skills with no provenance marker
hermes curator restore <skill>  # move an archived skill back to active
hermes curator list-archived    # list skills currently in ~/.hermes/skills/.archive/
hermes curator archive <skill>  # manually archive a single skill now
hermes curator prune [--days N] # bulk-archive agent-created skills idle >= N days (default 90)
hermes curator ledger           # list the per-mutation audit ledger (all actors)
hermes curator ledger --skill <name> --limit 50  # filter/paginate ledger entries
hermes curator rollback <entry-id>  # undo a single mutation from the ledger
hermes curator purge [--days N] [--dry-run]  # delete archived skills older than the TTL (explicit only)
```

## バックアップと巻き戻し {#backups-and-rollback}

本番のキュレーターの実行を始める前に、Hermes は `~/.hermes/skills/` を tar.gz で写し取り、`~/.hermes/skills/.curator_backups/<utc-iso>/skills.tar.gz` に置きます。触ってほしくなかったものが書庫入りしたりまとめられたりしても、コマンド一つで一巡分をまるごと元に戻せます。

```bash
hermes curator rollback        # restore newest snapshot (with confirmation)
hermes curator rollback -y     # skip the prompt
hermes curator rollback --list # see all snapshots with reason + size
```

巻き戻し自体も、あとから取り消せます。スキルの木を差し替える前に、Hermes は `pre-rollback to <target-id>` という札を付けた写しをもう一つ取ります。うっかり巻き戻してしまっても、`--id` でそちらへ進み直せばもとに戻せます。

`hermes curator backup --reason "before-refactor"` を使えば、いつでも自分の手で写しを取れます。`--reason` に書いた文字列は写しの `manifest.json` に入り、`--list` に表示されます。

写しは、ディスクを圧迫しないように `curator.backup.keep`（初期値は 5）の数まで残します。

```yaml
curator:
  backup:
    enabled: true
    keep: 5
```

`curator.backup.enabled: false` にすると、自動での写し取りが止まります。バックアップを切っているときに `hermes curator backup` を手で実行したい場合は、先に `enabled: true` に戻す必要があります。この設定は両方の経路に同じように効くので、棚を書き換える実行の前の写し取りだけをうっかり飛ばす、ということは起きません。

`hermes curator status` は、いちばん長く使われていないスキルを 5 つ並べても見せます。次に古びそうなものをさっと確かめられます。

同じサブコマンドは、動いているセッションの中（CLI でもゲートウェイのプラットフォームでも）から `/curator` というスラッシュコマンドとしても使えます。

## 記録簿と、1 件だけの巻き戻し {#audit-ledger-and-single-edit-rollback}

一巡分の写しは「前回のキュレーターがやったことを全部なかったことにする」ための答えです。けれども、*誰が何を変えたのか*を知って、そのうち 1 件だけを取り消したいこともあります。スキルへの変更は、キュレーターの自動の切り替えも、エージェントの `skill_manage` の呼び出しも、自分で打った CLI の archive / restore / purge も、すべて `~/.hermes/skills/.curator_ledger.jsonl` にある追記だけの JSONL の記録簿に 1 行ずつ積まれます。

- **actor** — `curator`（裏で見直す分身と自動の切り替え）、`agent`（表で動くエージェントのツール呼び出し）、`user`（CLI のコマンド）のいずれか
- **action** — `create`、`edit`、`patch`、`delete`、`write_file`、`remove_file`、`archive`、`restore`、`purge`、`rollback`
- **evidence** — 削除の意図（まとめ直しなら `absorbed_into`、単なる整理なら空、そして戻せる書庫の経路が処理したかどうか）と、わかる場合は引き金になったセッションの id
- **before/after** — ファイルごとの `{path, sha256}` の一覧。ファイルの中身は `~/.hermes/.curator_backups/blobs/` の下に、内容から決まる名前で（同じハッシュのものはまとめて）保存されます。同じ変わらないファイルに触れる記録が 100 件あっても、実体は 1 つで済みます。

```bash
hermes curator ledger                  # newest 20 entries
hermes curator ledger --skill my-skill --limit 50
hermes curator rollback <entry-id>     # restore that one mutation's before-state
```

1 件だけの巻き戻しは、その変更が触れたファイルだけを（作られたファイルは消して）実体の保管庫から元に戻します。スキルの木のそれ以外は動きません。木ぜんぶの巻き戻しと同じく、まず今の状態を安全のために記録簿へ書き留めますし、**だめなときは止まります**。安全のための書き留めができなければ、何も変更しません。表で動くエージェントの削除も記録簿に残るので、`hermes curator rollback <entry-id>` は完全に消されたスキルさえ生き返らせられます。

記録簿はあくまで観測用で、通せんぼをすることはありません。記録の書き込みに失敗しても、変更そのものは通ります。止めたいときは次のようにします。

```yaml
skills:
  ledger: false
```

## 書庫の期限切れの掃除 {#archive-ttl-purge}

書庫に入れたスキルは、初期状態ではずっと残ります。`~/.hermes/skills/.archive/` の大きさに上限を設けたいときは、期限を決めて自分で掃除してください。掃除が自動で走ることはありませんし、掃除したスキルはすべて先に記録簿へ（実体つきで）取り込まれるので、掃除のあとでもたどれて取り戻せる跡が残ります。

```yaml
curator:
  archive_ttl_days: 180   # 0 (default) = never purge
```

```bash
hermes curator purge --dry-run   # preview what would be deleted
hermes curator purge             # delete archives older than the TTL (with confirmation)
hermes curator purge --days 90   # one-off TTL override
```

## 「エージェントが作った」とは {#what-agent-created-means}

キュレーターが受け持つのは、`~/.hermes/skills/.usage.json` の中で
**エージェント作**とはっきり印が付いているスキルだけです。次の条件を
すべて満たすものが該当します。

1. 名前が `~/.hermes/skills/.bundled_manifest`（リポジトリに同梱されているスキル）に**ない**こと。
2. 名前が `~/.hermes/skills/.hub/lock.json`（ハブから入れたスキル）に**ない**こと。
3. `.usage.json` の記録に `"created_by": "agent"` か `"agent_created": true` があること。

今のところ、この印を付けるのは**裏で走る自己改善の見直しの分身**だけです。
定期的な見直し（エージェントのやりとりおよそ 10 回ごと）の中で新しい傘の
スキルを作ったときに付けます。裏の分身は書き込みの出どころを
`"background_review"` として動いており（`tools/skill_provenance.py` を通ります）、
`skill_manage` の中の `mark_agent_created()` を呼ぶ経路はここだけです。

会話の中で表のエージェントが `skill_manage(action="create")` で作ったスキルには、
エージェント作の印は**付きません**。それは利用者の指示で作られたものと見なし、
キュレーターはあえて手を触れません。

:::warning 自分で書いたスキルは手入れの対象外です
自分で `SKILL.md` を書いた場合や、外部のスキルのディレクトリを Hermes に
指し示した場合、そのスキルの `.usage.json` の記録は `created_by: null` に
なります（あるいはその欄自体がありません）。キュレーターはそれに触れません。
表のエージェントに頼んで作ってもらったスキルも同じです。

**キュレーターが実際にどのスキルを受け持っているかを見る**には、`hermes curator status` を実行してください。
エージェント作の数が 0 なら、今キュレーターの管轄にあるスキルはありません。
LLM による見直しは飛ばされ、報告には `Duration: 0s` とともに
`Model: (not resolved) via (not resolved)` と出ます。
:::

### 受け持ちのないスキルを引き取らせる {#adopting-unmanaged-skills}

`hermes curator status` は、受け持っている数と並べて**受け持ちのない**数も
報告します。

```
curator-managed skills: 43 total  (agent-created=43  bundled=0)
  active     41
  stale       2
  archived    0

unmanaged (no provenance marker): 112 total
  pre-dates marker    34
  foreground-created  78
  never auto-staled or archived — `hermes curator adopt <name>` hands one over
```

この 112 個は手入れの*対象になりうる*ものですが、次の二つのどちらかの理由で、
一生このライフサイクルからは見えません。

- **pre-dates marker** — `created_by` という欄ができる前に書かれた記録なので、
  出どころの手がかりを何も持っていません。誰が書いたのかは、記録からは
  本当にわかりません。
- **foreground-created** — 表での `skill_manage(create)` は、あえて印を
  付けません。頼んで作ってもらったスキルは、頼んだ人のものだからです。

つまり、大きな棚がすっかり手入れされているように見えて、その大半には手が
届いていない、ということが起こりえます。`adopt` は、**こちらから宣言する**ことで
その隙間を埋めます。

```bash
hermes curator list-unmanaged                    # itemize them, with reasons
hermes curator adopt <name> [<name> ...]         # hand specific skills over
hermes curator adopt --all-unmanaged --dry-run   # preview the full list
hermes curator adopt --all-unmanaged             # hand over everything (prompts)
hermes curator adopt --all-unmanaged --yes       # skip the prompt
```

引き取らせると、裏の見直しの分身が書くのと同じ `created_by: agent` の印が
付きます。使われていない期間の時計が巻き戻ることは**ありません**。引き取った
スキルは今までの `last_activity_at` をそのまま持ち続けるので、とっくに使わなく
なった棚を引き渡しても、90 日の猶予が新しくもらえるわけではありません。長く
放っておかれたスキルを引き取らせたら、次の一巡で `stale`（あるいは `archived`）に
なると思ってください。それが狙いです。

引き取らせることは、自分で*良くしていく*動きの入口でもあります。裏の見直しの
分身は、キュレーターの受け持ちでないスキルには手を入れることを拒みます。だから、
あなたのスキルが古びていることに気づいても、自分で直さずに、そう伝えて引き取りを
すすめます。表での（利用者の指示による）編集はまったく影響を受けません。自分の
スキルは、頼めばいつでも自分でもエージェントでも直せます。

:::note `created_by` は方針の札で、出どころの主張ではありません
保存されている欄の名前は `created_by` ですが、読まれ方は「自動の手入れが
ここに触れてよいか」であって、「このファイルを誰が書いたか」ではありません。
この二つは別の問いですし、この欄ができる前の記録では、書いた人の答えはもう
取り戻せません。名前をそのままにしてあるのは、すでにどの `.usage.json` にも
書かれているからです。方針として読んでください。`hermes curator adopt` が
変えるのは方針であって、誰が書いたかについては何も語りません。
:::

:::note 出どころは宣言するもので、推し量るものではありません
引き取りは、あえて手作業にしてあります。観測の数字から誰が書いたかは決められ
ません。何千回も直されているスキルは、エージェントがそれを**世話している**証拠で
あって、エージェントが**書いた**証拠ではないからです。Hermes は利用者が書いた
スキルにも、しょっちゅう頼まれて手を入れています。「エージェントが作ったっぽい
から引き取ろう」という自動の当て推量は、いつか自分で書いたものを書庫へ送って
しまいます。`adopt` は、同梱のもの、ハブから入れたもの、外部のもの、そして守られた
組み込みのものを拒みます。それらには、あなた以外の持ち主がいるからです。
:::

エージェント作であるスキルは、次のひととおりの流れをたどります。

- `active` →（30 日使われない）`stale` →（90 日使われない）`archived`
- 固定したスキルは、自動の切り替えをすべて飛ばします
- 書庫に入ったものは `hermes curator restore <name>` で戻せます

このスキルだけは絶対に触られたくない、というものがあれば（たとえば自分で書いて
頼りにしているスキルなど）、`hermes curator pin <name>` を使ってください。次の節を
ご覧ください。

## スキルを固定する {#pinning-a-skill}

固定すると、そのスキルは削除から守られます。キュレーターの自動の書庫入れからも、エージェントの `skill_manage(action="delete")` の呼び出しからもです。固定したあとは次のようになります。

- **キュレーター**は自動の切り替え（`active → stale → archived`）でそれを飛ばし、LLM による見直しにも手を出さないよう指示します。
- **エージェントの `skill_manage` ツール**はそれに対する `delete` を断り、`hermes curator unpin <name>` を案内します。手入れや編集は通るので、つまずきが見つかったときにはエージェントが固定したスキルの中身を良くしていけます。固定を外して直してまた固定する、という手間は要りません。

固定と解除はこうします。

```bash
hermes curator pin <skill>
hermes curator unpin <skill>
```

この札は `~/.hermes/skills/.usage.json` のそのスキルの記録に `"pinned": true` として保存されるので、セッションをまたいでも残ります。

どれかの cron ジョブの `skills:` の並びに名前が挙がっているスキルは、**自動の切り替え**については同じように守られます（参照が残っているかぎり、キュレーターがそれを古びた扱いにしたり書庫へ入れたりすることはありません）。ジョブが一時停止中でも無効でも同じです。`skill_manage delete` も止めたいときは、はっきり固定するほうを選んでください。

固定できるのは**エージェント作**のスキルだけです。同梱のものやハブから入れたものに `hermes curator pin` を使おうとすると、理由を添えて断られます。ハブから入れたスキルが、キュレーターに書き換えられることはありません。同梱の組み込みスキルは `curator.prune_builtins: true`（初期値）のときだけ触れられ、それも `archive_after_days` の間使われなかったときに書庫へ入るだけで、手を入れられたり、まとめられたり、消されたりはしません。`curator.prune_builtins: false` にすれば、同梱のスキルはまるごと対象から外れます。

さらに、ごく少数の**守られた組み込みスキル**は、`curator.prune_builtins` の設定にも固定の有無にも LLM の判断にも関係なく、書庫入りもまとめ直しもされないように作り込まれています。これらは大事な使い心地を支えているので、黙って書庫に入れてしまうと、そのスラッシュコマンドは何の知らせもなく「Unknown command」のエラーに変わり、こちらには何も伝わりません。（この集まりは今のところ空です。もともと入っていた `plan` は、ディスク上にスキルを持たない組み込みの `/plan` コマンドへ移りました。）守られた組み込みスキルはキュレーターの候補の一覧からそもそも外されるので、まとめ直しの見直しがそれを目にすることはありません。

「消されない」より強い保証がほしいとき、たとえばエージェントには読ませたままで中身は一切変えさせたくないときは、`~/.hermes/skills/<name>/SKILL.md` を自分のエディタで直接編集してください。固定が守るのはツールからの削除であって、あなた自身のファイル操作ではありません。

## 利用状況の記録 {#usage-telemetry}

キュレーターは `~/.hermes/skills/.usage.json` に、スキルごとに 1 件ずつの記録を持ちます。

```json
{
  "my-skill": {
    "use_count": 12,
    "view_count": 34,
    "last_used_at": "2026-04-24T18:12:03Z",
    "last_viewed_at": "2026-04-23T09:44:17Z",
    "patch_count": 3,
    "last_patched_at": "2026-04-20T22:01:55Z",
    "created_at": "2026-03-01T14:20:00Z",
    "state": "active",
    "pinned": false,
    "archived_at": null
  }
}
```

数が増えるのは次のときです。

- `view_count`: エージェントがそのスキルに `skill_view` を使ったとき。
- `use_count`: そのスキルが会話のプロンプトに読み込まれたとき。
- `patch_count`: そのスキルに対して `skill_manage patch/edit/write_file/remove_file` が走ったとき。

同梱のスキルとハブから入れたスキルは、この記録の書き込みからはっきり除かれています。

## 実行ごとの報告 {#per-run-reports}

キュレーターは実行のたびに、`~/.hermes/logs/curator/` の下へ日時の付いたディレクトリを書き出します。

```
~/.hermes/logs/curator/
└── 20260429-111512/
    ├── run.json      # machine-readable: full fidelity, stats, LLM output
    └── REPORT.md     # human-readable summary
```

`REPORT.md` は、その回に何が起きたかをさっと知るのに便利です。どのスキルがどう変わったか、LLM の見直し役が何と言ったか、どのスキルに手を入れたかがわかります。`agent.log` を grep しなくても様子を確かめられます。

:::note 候補がないと報告に `(not resolved)` と出ます
キュレーターに見直すべき**エージェント作のスキルがない**とき、LLM による
見直しはまるごと飛ばされます。報告の見出しには `Duration: 0s` とともに
`Model: (not resolved) via (not resolved)` と出ますが、これは設定の誤りでも
モデルを決められなかったわけでも**ありません**。ただ候補が一つもなかったので、
モデルが一度も呼ばれなかったというだけです。自動の切り替えの段階はいつも
どおり走り、その数もふつうに報告されます。
:::

### まとめの中の名前の対応表 {#rename-map-in-the-summary}

その回に複数のスキルを傘のもとへまとめた（あるいはよく似たものを統合した）場合、実行の最後に表示されるまとめには、キュレーターが行った `old-name → new-name` の組がすべて一覧で並びます。スキルごとの変化の行とは別に出るので、名前の変更がまとめて起きたときも、JSON の報告を突き合わせなくてもひと目で気づけます。同じ案内は `hermes curator pin` にも出てくるので、新しい名前をそのまま固定したければすぐに固定できます。

## 書庫に入ったスキルを戻す {#restoring-an-archived-skill}

まだ使いたいものがキュレーターに書庫へ入れられてしまったら、こうします。

```bash
hermes curator restore <skill-name>
```

これで、そのスキルは `~/.hermes/skills/.archive/` から現役の木へ戻り、状態も `active` に戻ります。ただし、その間に同じ名前で同梱のスキルやハブのスキルが入っていた場合、上流を覆い隠してしまうので、この戻しは断られます。

## 環境ごとに止める {#disabling-per-environment}

キュレーターは初期状態で動いています。止めるには次のようにします。

- **あるプロファイルだけ止める場合:** `~/.hermes/config.yaml`（または今使っているプロファイルの設定）を開いて `curator.enabled: false` にします。
- **一回だけ止める場合:** `hermes curator pause` を使います。この一時停止はセッションをまたいで残るので、戻すときは `resume` を使ってください。

キュレーターは `min_idle_hours` が過ぎていないと動かないので、開発でよく使っているマシンでは、自然と静かな時間帯だけに動きます。

## あわせて読みたいもの {#see-also}

- [スキルの仕組み](/hermes/docs/user-guide/features/skills/) — スキル全般の話と、それを生み出す自己改善のループについて
- [記憶](/hermes/docs/user-guide/features/memory/) — 長く残る記憶を手入れする、裏で走るもう一つの見直し
- [同梱スキルの一覧](/hermes/docs/reference/skills-catalog/)
- [Issue #7816](https://github.com/NousResearch/hermes-agent/issues/7816) — もとの提案と、設計についてのやりとり
