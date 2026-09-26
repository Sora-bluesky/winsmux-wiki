---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "キュレーター"
description: "エージェントが作ったスキルを裏側で手入れする仕組み。利用状況の記録、古さの判定、書庫入れ、LLM によるレビュー"
upstream_path: user-guide/features/curator.md
upstream_blob: f298933f8ec96f6356527cf0130fb4a541f66fc5
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/curator
---

# キュレーター {#curator}

キュレーターは、**エージェントが作ったスキル**を裏側で手入れする仕組みです。各スキルが何回見られ、使われ、手を入れられたかを記録し、長く使われていないスキルを `active → stale → archived` と移し、ときどき短い補助モデルのレビューを走らせて、統合の提案やずれの修正を行います。

これがあるのは、[自己改善のループ](/hermes/docs/user-guide/features/skills/#agent-managed-skills-skill_manage-tool)で作られたスキルが際限なく積み上がらないようにするためです。エージェントが未知の問題を解いてスキルとして保存するたび、それは `~/.hermes/skills/` に置かれます。手入れをしないと、狭い範囲の似たようなスキルが何十本もたまり、一覧を汚してトークンを無駄にします。

既定では、キュレーターはエージェントが作ったスキルだけを扱います。`curator.prune_builtins: true` にすると、**使われていない同梱の組み込みスキル**（リポジトリに同梱されているもの）も `archive_after_days` のあいだ使われなければ書庫に入れられます。これを任意設定にしているのは、同梱のスキルが黙って `skills_list` から消えると、インストールが壊れたと勘違いしやすいからです。ハブから入れたスキル（[agentskills.io](https://agentskills.io) 由来）は常に対象外です。キュレーターは**自動で削除することもありません**。最悪でも `~/.hermes/skills/.archive/` へ書庫入れするだけで、元に戻せます。

[issue #7816](https://github.com/NousResearch/hermes-agent/issues/7816) に対応しています。

## 動くタイミング {#how-it-runs}

キュレーターを動かすのは cron ではなく、無操作の確認です。CLI のセッション開始時、ゲートウェイの定期処理の途中、そしてデスクトップや `hermes serve` の保守タイマーで、Hermes は次の2点を確認します。

1. 前回のキュレーター実行から十分な時間が経っているか（`interval_hours`、既定は **7日**）。
2. エージェントが十分に休んでいるか（`min_idle_hours`、既定は **2時間**）。

デスクトップとその他の `hermes serve` のバックエンドは、cron とは別に、既存の1時間ごとの保守タイマーを共有します（最初の確認は90秒後）。無操作の長さは、プロセスの起動時刻と、同じプロファイルでの直近のチャットの動きから測り、セッションが閉じられたり回収されたりしたあともその時刻を保持します。そのプロファイルでターンが動いているあいだはキュレーターを飛ばします。つながっているだけで動いていないウィンドウが保守を妨げることはありません。このタイマーは個人用・組織用のスキル同期の確認も行いますが、それぞれの機能自身の任意設定に従います。同じプロファイル向けのメッセージングゲートウェイが動いている場合は、そちらがこの雑務を受け持ちます。

タイマーが面倒を見るのは、そのバックエンドのプロファイルです。実行中の保守はワーカースレッドで動くので、バックエンドを閉じてもその処理は協調的に中断されません。同じプロファイルに対して独立した serve プロセスを複数立ち上げると、キュレーターの間隔確認が競合することはあります。

両方を満たしていれば、`AIAgent` のバックグラウンドのフォークを立ち上げます。メモリやスキルの自己改善のうながしと同じやり方です。フォークは自分のプロンプトキャッシュで動き、進行中の会話には一切触れません。

:::info 初回の動き
入れたばかりのとき（またはキュレーター導入前のインストールが `hermes update` のあと初めて動くとき）、キュレーターは**すぐには実行されません**。最初の確認は `last_run_at` に「いま」を書き込み、本当の初回を `interval_hours` ひとつぶんだけ先送りします。これで、キュレーターが触る前にスキルの中身を見直したり、大事なものを固定したり、そもそも使わない設定にしたりする時間がまるごと1回分取れます。

本当に動く前にキュレーターが*何をするつもりか*を見たいときは、`hermes curator run --dry-run` を実行してください。中身を変えずに同じレビュー報告を出します。
:::

1回の実行は2段階に分かれます。

1. **自動の状態遷移**（決まった手順どおり、LLM は使いません）。`stale_after_days`（14日）使われていないスキルは `stale` になり、`archive_after_days`（30日）使われていないスキルは `~/.hermes/skills/.archive/` へ移ります。これが常時動く整理の動きで、キュレーターが有効なときは必ず走り、補助モデルの費用はかかりません。
   - **固定されたスキル**と、**cron のジョブから参照されているスキル**（停止中・無効のジョブも含む）は、まるごと飛ばされます。自動遷移については固定と同じ扱いなので、間隔の長いジョブや止めてあるジョブの足元からスキルが書庫入りすることはありません。統合の際には、傘にまとめるときに cron のスキル参照も書き換えます。
   - **一度も使われていないスキル**（`use_count == 0`）には猶予の下限があります。少なくとも `stale_after_days` ぶんの古さになるまでは書庫入りしません。使用回数ゼロは証拠が無いということであって、捨ててよい証拠ではありません。
2. **LLM による統合**（補助モデルの1回の処理で、繰り返しの上限は高めです。ひととおりの整理には通常 50〜100 回の API 呼び出しがかかります）。これは**既定でオフ**です。`curator.consolidate: true` にすると、フォークしたエージェントがエージェント製のスキルを見渡し、`skill_view` でどれでも読み、スキルごとに、そのまま残すか、（`skill_manage` で）手を入れるか、重なっているものをクラス単位の傘にまとめるか、（`absorbed_into` の移行先を指定した `skill_manage action=delete` で）書庫入りさせるかを決めます。この処理に終点はありません。渡される候補の一覧には、実際に読み書きできるスキルだけが入ります。同梱の組み込みスキル（`prune_builtins: true` にしていても同じで、この設定が効くのは決まった手順の書庫入れだけです）と、`skills.disabled` にあるスキル（`skill_view` が拒みます）は候補に出ないので、拒まれる読み書きでツールの予算を使い切ることはありません。統合はスキルをひとまとまりのパッケージとして扱います。スキルが `references/`、`templates/`、`scripts/`、`assets/` を持っていたり、それらへの相対リンクを持っていたりする場合、キュレーターは、そのスキルを単体のまま残すか、必要な補助ファイルを移してパスを書き換えるか、パッケージ全体をそのまま書庫入りさせるかのいずれかを選ばなければなりません。`SKILL.md` だけを別のスキルの `references/` にまとめて押し込む、というやり方は取りません。

:::info 統合は任意です
既定では、キュレーターは**整理だけ**を行います。決まった手順の無操作判定がスキルに古い印を付け、長く使われていないものを書庫に入れます。踏み込んだ LLM の**統合**（傘づくり、重なるスキルの併合）は既定でオフです。実行のたびに補助モデルのトークンを使い、手元のスキル群の構造を大きく変えるからです。使うときは `curator.consolidate: true` にするか、その場かぎりで `hermes curator run --consolidate` を実行してください。
:::

固定されたスキルは、キュレーターの自動遷移からも、エージェント自身の `skill_manage` ツールからも手出しできません。下の[スキルを固定する](#pinning-a-skill)を参照してください。

## 設定 {#configuration}

設定はすべて `config.yaml` の `curator:` 以下にあります（`.env` ではありません。秘密の情報ではないからです）。既定値は次のとおりです。

```yaml
curator:
  enabled: true
  interval_hours: 168          # 7 days
  min_idle_hours: 2
  stale_after_days: 14
  archive_after_days: 30
  consolidate: false           # LLM umbrella-building pass — opt-in (prune-only by default)
  prune_builtins: false        # opt in to archiving unused bundled built-in skills too (hub skills always exempt)
```

まるごと止めるには `curator.enabled: false` にします。常時の整理は残したまま LLM の統合も使いたいときは `curator.consolidate: true` にします。

### レビューを安い補助モデルで走らせる {#running-the-review-on-a-cheaper-aux-model}

キュレーターの LLM レビューは、ふつうの補助タスクの枠 — `auxiliary.curator` — です。画像認識、圧縮、セッション検索などと並びます。「Auto」は「メインのチャットモデルを使う」という意味で、この枠を上書きすると、レビューだけ特定のプロバイダーとモデルに固定できます。

**いちばん簡単な方法 — `hermes model`:**

```bash
hermes model                   # → "Auxiliary models — side-task routing"
                               # → pick "Curator" → pick provider → pick model
```

同じ選択画面は、Web ダッシュボードの **Models** タブにもあります。

**config.yaml を直接書く場合（同じ意味）:**

```yaml
auxiliary:
  curator:
    provider: openrouter
    model: google/gemini-3-flash-preview
    timeout: 600               # generous — reviews can take several minutes
```

`provider: auto`（既定）のままにすると、レビューはメインのチャットモデルを通ります。他の補助タスクと同じ動きです。

:::note 古い書き方の設定
以前の版では、単発の `curator.auxiliary.{provider,model}` ブロックを使っていました。この書き方もまだ動きますが、非推奨のログが1行出ます。他の補助タスクと同じ配管（`hermes model`、ダッシュボードの Models タブ、`base_url`、`api_key`、`timeout`、`extra_body`）を共有できるよう、上の `auxiliary.curator` へ移してください。
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
hermes curator prune [--days N] # bulk-archive agent-created skills idle >= N days (default: `archive_after_days`, 30)
hermes curator ledger           # list the per-mutation audit ledger (all actors)
hermes curator ledger --skill <name> --limit 50  # filter/paginate ledger entries
hermes curator rollback <entry-id>  # undo a single mutation from the ledger
hermes curator purge [--days N] [--dry-run]  # delete archived skills older than the TTL (explicit only)
```

## バックアップと巻き戻し {#backups-and-rollback}

統合の処理（`consolidate: true`。スキルの中身をその場で書き換える唯一の処理です）の前に、Hermes は `~/.hermes/skills/` の tar.gz スナップショットを `~/.hermes/skills/.curator_backups/<utc-iso>/skills.tar.gz` に取ります。スナップショットに入るのは現役のスキルのツリーだけです。`.archive/`、監査台帳、`.hub/`、そしてバックアップ自体は決して巻き込まれませんし、巻き戻しがそれらを戻すこともありません（古い写しに戻すと、書庫入りしたスキルや台帳の記録が失われるからです）。触ってほしくなかったものが書庫入りしたり統合されたりしたときは、コマンド1つで実行まるごとを取り消せます。

```bash
hermes curator rollback        # restore newest snapshot (with confirmation)
hermes curator rollback -y     # skip the prompt
hermes curator rollback --list # see all snapshots with reason + size
```

巻き戻し自体も元に戻せます。スキルのツリーを置き換える前に、Hermes は `pre-rollback to <target-id>` という印を付けたスナップショットをもう1つ取ります。巻き戻しを間違えたときは、`--id` でそちらへ進めば取り消せます。

`hermes curator backup --reason "before-refactor"` で、いつでも手動のスナップショットを取れます。`--reason` に書いた文字列はスナップショットの `manifest.json` に入り、`--list` で表示されます。

既定の整理だけの処理はスナップショットを取りません。ディレクトリをまるごと `.archive/` へ移すだけで、それ自体が取り消しの手段になっていますし（`hermes curator restore`）、変更はすべて下の台帳に残るからです。ディスクの使用量を抑えるため、スナップショットは処理のたびに `curator.backup.keep`（既定は2）まで減らされます。

```yaml
curator:
  backup:
    enabled: true
    keep: 2
```

自動のスナップショットを止めるには `curator.backup.enabled: false` にします。バックアップを止めている状態で手動の `hermes curator backup` を使いたい場合は、先に `enabled: true` に戻す必要があります。このフラグは両方の経路を対称に制御するので、中身を変える実行の前のスナップショットをうっかり飛ばしてしまうことはありません。

`hermes curator status` は、最後に使われてから最も時間が経っているスキル5件も表示します。次に古くなりそうなものをすばやく把握できます。

同じサブコマンドは、動いているセッション（CLI でもゲートウェイのプラットフォームでも）の中で `/curator` スラッシュコマンドとしても使えます。

## 監査台帳と1件だけの巻き戻し {#audit-ledger-and-single-edit-rollback}

実行まるごとのスナップショットは「直前のキュレーターの処理を全部取り消す」に答えるものですが、*誰が何を変えたのか*を知って、1件だけ取り消したいこともあります。スキルへの変更はすべて — キュレーターの自動遷移、エージェントの `skill_manage` 呼び出し、自分で打った CLI の archive/restore/purge — `~/.hermes/skills/.curator_ledger.jsonl` にある追記専用の JSONL 台帳に1件ずつ記録されます。

- **actor** — `curator`（バックグラウンドのレビューのフォークと自動遷移）、`agent`（前面のエージェントのツール呼び出し）、`user`（CLI のコマンド）
- **action** — `create`、`edit`、`patch`、`delete`、`write_file`、`remove_file`、`archive`、`restore`、`purge`、`rollback`
- **evidence** — 削除の意図（統合なら `absorbed_into`、整理なら空、そして元に戻せる書庫入れの経路が処理したかどうか）、分かる場合はきっかけになったセッションの id
- **before/after** — ファイルごとの `{path, sha256}` の一覧。ファイルの中身は内容で名前を付けて（ハッシュで重複を除いて）`~/.hermes/.curator_backups/blobs/` に保存されるので、同じ変わらないファイルに触れる記録が100件あっても、実体は1つで済みます。

```bash
hermes curator ledger                  # newest 20 entries
hermes curator ledger --skill my-skill --limit 50
hermes curator rollback <entry-id>     # restore that one mutation's before-state
```

1件だけの巻き戻しは、その変更が触れたファイルだけを（作られたファイルは消して）保存庫から戻します。スキルのツリーの他の部分は動きません。ツリーまるごとの巻き戻しと同じく、まず現在の状態を安全用の台帳の記録として取り、**失敗したら止まります**。安全用の記録が書けなければ、何も変更しません。前面での削除も台帳に残るので、`hermes curator rollback <entry-id>` は完全に消したスキルをよみがえらせることもできます。

台帳は記録であって関門ではありません。記録の書き込みに失敗しても、変更そのものは通ります。止めたいときは次のようにします。

```yaml
skills:
  ledger: false
```

このファイルには大きさの上限もあります。`skills.ledger_max_bytes`（既定は 5 MB）を超えると、次の変更はまず、変わっていないファイルの重複除去を通してファイルを書き直し（`hermes curator ledger --compact` がやることそのものです）、それでも本当に中身の違う記録が上限を超えるなら、形に関わらず古いものから落とします。最新の記録は必ず残り、残った末尾の行が書き直されたり解析されたりすることはなく（そこにある壊れた行はそのまま残ります）、この掃除で、どこからも参照されなくなって1時間以上経った実体が解放されます（参照の無い新しい実体は、別のプロセスがまだ記録していない取得のものかもしれないからです）。`0` にすると、台帳はずっと追記専用のままになります。

```yaml
skills:
  ledger_max_bytes: 5242880   # 0 = never auto-maintain
```

## 書庫の保存期間と削除 {#archive-ttl-purge}

書庫入りしたスキルは、既定ではずっと残ります。`~/.hermes/skills/.archive/` に上限を設けたいときは、保存期間を決めて明示的に削除してください。削除が自動で走ることはありませんし、削除されるスキルはどれも先に（実体ごと）台帳へ記録されるので、削除のあとにも監査できて元に戻せる跡が残ります。

```yaml
curator:
  archive_ttl_days: 180   # 0 (default) = never purge
```

```bash
hermes curator purge --dry-run   # preview what would be deleted
hermes curator purge             # delete archives older than the TTL (with confirmation)
hermes curator purge --days 90   # one-off TTL override
```

## 「エージェント製」の意味 {#what-agent-created-means}

キュレーターが扱うのは、`~/.hermes/skills/.usage.json` で明示的に
**エージェント製**と印が付いたスキルだけです。次のすべてを満たすと
その対象になります。

1. 名前が `~/.hermes/skills/.bundled_manifest`（リポジトリに同梱されたスキル）に**無い**こと。
2. 名前が `~/.hermes/skills/.hub/lock.json`（ハブから入れたスキル）に**無い**こと。
3. `.usage.json` の記録に `"created_by": "agent"` か `"agent_created": true` があること。

いまのところ、この印を付けるのは**バックグラウンドの自己改善レビューのフォーク**だけです。
定期的なレビュー（エージェントのターンおよそ10回ごと）の中で新しい傘のスキルを作ったときに付きます。
このバックグラウンドのフォークは書き込みの出どころが `"background_review"` として動き
（`tools/skill_provenance.py` 経由）、`skill_manage` の中で
`mark_agent_created()` が呼ばれるのはこの経路だけです。

会話の中で前面のエージェントが `skill_manage(action="create")` で作ったスキル
（`/learn` を含みます）は、エージェント製の印が**付きません**。`created_by: learn` として
記録され、[学びの足あと](/hermes/docs/user-guide/features/memory/#learning-journey-journey)にはすぐ出てきますが、
キュレーターの対象にはなりません。利用者の指示で作られたものと見なされ、
キュレーターは意図的に手を出しません。

:::warning 自分で書いたスキルは手入れの対象外です
自分で `SKILL.md` を作ったり、外部のスキルのディレクトリを Hermes に教えたりした場合、
そのスキルの `.usage.json` の記録は `created_by: null` になります
（またはその項目自体がありません）。キュレーターはそれに触れません。
自分が頼んで前面のエージェントが作ったスキル（`created_by: learn`）も同じです。

**キュレーターが実際にどのスキルを扱っているかを見る**には、`hermes curator status` を実行します。
エージェント製の数が0なら、いまキュレーターの管轄にあるスキルはありません。
LLM のレビューは飛ばされ、報告には `Duration: 0s` とともに
`Model: (not resolved) via (not resolved)` と出ます。
:::

### 対象外のスキルを引き取らせる {#adopting-unmanaged-skills}

`hermes curator status` は、管理下の数と並べて**対象外**の数も
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

この112本は手入れの*対象になりうる*のに、次の2つの理由のどちらかで、
ずっと生涯管理から見えないままです。

- **印より前からある** — その記録は `created_by` が存在する前に書かれたので、
  出どころの手がかりが一切ありません。誰が書いたかは記録からは本当に分かりません。
- **前面で作られた** — 前面の `skill_manage(create)` は設計上 `created_by: learn` と
  記録します（古い記録では未設定）。頼んで作ってもらったスキルは、頼んだ人のものだからです。

そのため、大きなスキル群が、ほとんど手出しできない状態のまま、
きちんと手入れされているように見えることがあります。`adopt` は、**宣言**によって
この隙間を埋めます。

```bash
hermes curator list-unmanaged                    # itemize them, with reasons
hermes curator adopt <name> [<name> ...]         # hand specific skills over
hermes curator adopt --all-unmanaged --dry-run   # preview the full list
hermes curator adopt --all-unmanaged             # hand over everything (prompts)
hermes curator adopt --all-unmanaged --yes       # skip the prompt
```

引き取りは、バックグラウンドのレビューのフォークが書くのと同じ `created_by: agent` の
印を書き込みます。無操作の時計を**戻すことはしません**。引き取られたスキルは
それまでの `last_activity_at` をそのまま保つので、すでに使わなくなったスキル群を
引き渡しても、90日の猶予が新たに手に入るわけではありません。長く放置されていた
スキルは、引き取った次の処理で `stale`（や `archived`）になると考えてください。
それが狙いです。

引き取りは、自律的な*改善*の道を開くものでもあります。バックグラウンドのレビューの
フォークは、キュレーターの管理下にないスキルには手を入れません。ですから、自分の
スキルが古くなっていることに気づいても、編集はせず、そのことを伝えて引き取りを
すすめます。前面での（利用者の指示による）編集はこの影響を受けません。自分も
エージェントも、頼めばいつでも自分のスキルを編集できます。

:::note `created_by` は方針の印であって、出どころの主張ではありません
保存される項目の名前は `created_by` ですが、読まれ方は「自律的な手入れが
これに触れてよいか」であって、「このファイルを誰が書いたか」ではありません。
この2つは別の問いですし、印より前の記録では、誰が書いたかという答えは
そもそも取り戻せません。この名前が残っているのは、すべての `.usage.json` に
すでに書かれているからです。方針として読んでください。`hermes curator adopt` が
変えるのは方針であって、誰がそのファイルを書いたかについては何も言っていません。
:::

:::note 出どころは宣言するもので、推測するものではありません
引き取りを手動にしているのは意図的です。記録から誰が書いたかは決められません。
何千回も手が入っているスキルは、エージェントがそれを**保守している**証拠にはなっても、
エージェントが**書いた**証拠にはなりません。Hermes は利用者が書いたスキルを、
頼まれて日常的に編集しているからです。「エージェントが作ったっぽいから引き取ろう」という
自動判定は、いつか手書きのスキルを書庫送りにします。`adopt` は、同梱のスキル、
ハブから入れたスキル、外部のスキル、保護された組み込みスキルを拒みます。
どれも持ち主が自分ではないからです。
:::

エージェント製のスキルは、生涯の流れをひととおりたどります。

- `active` →（30日未使用）`stale` →（90日未使用）`archived`
- 固定されたスキルは、すべての自動遷移を素通りします
- 書庫入りしたものは `hermes curator restore <name>` で戻せます

特定のスキルを絶対に触られないようにしたいとき — たとえば頼りにしている手書きのスキル —
は、`hermes curator pin <name>` を使ってください。次の節で説明します。

## スキルを固定する {#pinning-a-skill}

固定は、スキルを削除から守ります。キュレーターの自動的な書庫入れの処理からも、エージェントの `skill_manage(action="delete")` の呼び出しからもです。固定すると次のようになります。

- **キュレーター**は自動遷移（`active → stale → archived`）でそれを飛ばし、LLM のレビューにも触らないよう指示します。
- **エージェントの `skill_manage` ツール**はそれに対する `delete` を拒み、`hermes curator unpin <name>` を案内します。手直しや編集は通るので、固定を外してまた付け直すといった手間をかけなくても、落とし穴が見つかったときにエージェントが中身を良くしていけます。

固定と解除は次のようにします。

```bash
hermes curator pin <skill>
hermes curator unpin <skill>
```

この印は `~/.hermes/skills/.usage.json` のそのスキルの記録に `"pinned": true` として保存されるので、セッションをまたいで残ります。

cron のどれかのジョブの `skills:` に名前があるスキルは、**自動遷移**については同じように守られます（参照が残っているかぎり、キュレーターがそれを古い扱いにしたり書庫入りさせたりすることはありません）。ジョブが停止中や無効でも同じです。`skill_manage delete` も止めたいときは、明示的に固定するほうが確実です。

固定できるのは**エージェント製**のスキルだけです。同梱のスキルやハブから入れたスキルに `hermes curator pin` を使うと、理由を添えて断られます。ハブから入れたスキルは、そもそもキュレーターによる変更の対象になりません。同梱の組み込みスキルは `curator.prune_builtins: true` にしたときだけ触られ、それも `archive_after_days` のあいだ使われなかった場合の書庫入れだけです。手を入れられたり、統合されたり、削除されたりすることはありません。

ごく一部の**保護された組み込みスキル**は、`curator.prune_builtins` の設定や固定の有無、LLM の判断に関わらず、書庫入りも統合もされないものとしてコードに直接書き込めます。これらは要になる使い勝手を支えているので、黙って書庫入りすると、そのスラッシュコマンドが何の知らせもなく「Unknown command」のエラーに変わってしまいます。（この集合はいま空です。最初の1つだった `plan` は、ディスク上にスキルを持たない組み込みの `/plan` コマンドへ昇格しました。）保護された組み込みスキルはキュレーターの候補の一覧から完全に外されるので、統合の処理がそれらを目にすることはありません。

「削除されない」よりも強い保証がほしいとき — たとえば、エージェントに読ませたまま中身を完全に凍結したいとき — は、`~/.hermes/skills/<name>/SKILL.md` を自分のエディタで直接編集してください。固定が守るのはツール経由の削除であって、自分のファイル操作ではありません。

## 利用状況の記録 {#usage-telemetry}

キュレーターは `~/.hermes/skills/.usage.json` に、スキルごとに1件の記録を持つ補助ファイルを保ちます。

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

- `view_count`: エージェントがそのスキルに対して `skill_view` を呼んだとき。
- `use_count`: そのスキルが会話のプロンプトに読み込まれたとき。
- `patch_count`: そのスキルに対して `skill_manage patch/edit/write_file/remove_file` が走ったとき。

同梱のスキルとハブから入れたスキルは、この記録の書き込みからはっきり除かれています。

## 実行ごとの報告 {#per-run-reports}

キュレーターは実行のたびに、`~/.hermes/logs/curator/` の下に時刻付きのディレクトリを作ります。

```
~/.hermes/logs/curator/
└── 20260429-111512/
    ├── run.json      # machine-readable: full fidelity, stats, LLM output
    └── REPORT.md     # human-readable summary
```

`REPORT.md` は、その回に何が起きたか — どのスキルが状態を変えたか、LLM のレビューが何と言ったか、どのスキルに手を入れたか — をすばやく確認する手段です。`agent.log` を grep せずに監査できます。

:::note 候補が無いとき、報告には `(not resolved)` と出ます
キュレーターにレビューする**エージェント製のスキルが無い**とき、LLM のレビューは
まるごと飛ばされます。報告の見出しには `Duration: 0s` とともに
`Model: (not resolved) via (not resolved)` と出ますが、これは設定の誤りや
モデルの解決の失敗を示すものでは**ありません**。単に候補が無く、
モデルが1度も呼ばれなかった、というだけです。自動遷移の段階はそれでも走り、
その件数はふつうに報告されます。
:::

### まとめに出る名前の対応表 {#rename-map-in-the-summary}

複数のスキルを傘の下にまとめたり、似たものどうしを併合したりした回は、実行の最後に表示される利用者向けのまとめに、キュレーターが適用した `old-name → new-name` の対応が全部載ります。スキルごとの状態遷移の行とは別に出るので、名前の変更がまとめて起きたときも、JSON の報告を突き合わせずにひと目で気づけます。この案内は `hermes curator pin` の下にも出るので、新しい名前を固めたければ傘の名前をすぐ固定できます。

## 書庫入りしたスキルを戻す {#restoring-an-archived-skill}

キュレーターが書庫入りさせたものを、まだ使いたいときは次のようにします。

```bash
hermes curator restore <skill-name>
```

これでスキルは `~/.hermes/skills/.archive/` から現役のツリーへ戻り、状態も `active` に戻ります。同じ名前で同梱のスキルやハブのスキルがその後に入っていた場合は、上流を覆い隠してしまうので、この復元は断られます。

## 環境ごとに止める {#disabling-per-environment}

キュレーターは既定で有効です。止めるには次のようにします。

- **1つのプロファイルだけ止める場合:** `~/.hermes/config.yaml`（または使っているプロファイルの設定）を編集して `curator.enabled: false` にします。
- **1回だけ止める場合:** `hermes curator pause` を使います。この停止はセッションをまたいで続くので、`resume` で戻してください。

キュレーターは `min_idle_hours` が経っていなければ動かないので、作業中の開発マシンでは自然と静かな時間帯にだけ走ります。

## 関連 {#see-also}

- [スキルの仕組み](/hermes/docs/user-guide/features/skills/) — スキル全般の動きと、それを作る自己改善のループ
- [メモリ](/hermes/docs/user-guide/features/memory/) — 長期記憶を保つ、並行して動くバックグラウンドのレビュー
- [同梱スキル一覧](/hermes/docs/reference/skills-catalog/)
- [Issue #7816](https://github.com/NousResearch/hermes-agent/issues/7816) — 最初の提案と設計の議論
