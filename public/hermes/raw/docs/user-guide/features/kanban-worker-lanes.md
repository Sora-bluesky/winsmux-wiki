---
title: "カンバンの作業レーン"
description: ""
upstream_path: user-guide/features/kanban-worker-lanes.md
upstream_blob: c14025d49ebd06421a13f061cb5e44b02c532ac7
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban-worker-lanes
---

# カンバンの作業レーン {#kanban-worker-lanes}

**作業レーン**とは、カンバンの割り振り役が仕事を流し込める処理の種類のことです。どのレーンにも、名乗り（担当者の文字列）と、立ち上げのしくみと、立ち上がった後にその仕事へ何をしなければならないかという取り決めがあります。

このページはその取り決めそのものです。読み手として想定しているのは次の2種類です。

- **運用する人**。どのレーンを盤に組み込むか（どのプロファイルを作り、どの担当者名を使うか）を決める場面で読みます。
- **プラグインや連携を書く人**。新しい形のレーンを足したい場面です（Codex / Claude Code / OpenCode を包む CLI の作業役、コンテナに入れた検分役、API 経由で仕事を取りにくる Hermes 以外のサービスなど）。

レーンの*中*で動くエージェント、つまり作業役のコードそのものを書いているなら、カンバンの一生と細かい取り決めは作業役のシステムプロンプトに自動で差し込まれます（[`agent/prompt_builder.py`](https://github.com/NousResearch/hermes-agent/blob/main/agent/prompt_builder.py) の `KANBAN_GUIDANCE` の塊がそれです）。

## 全体の階層 {#the-hierarchy}

```text
Hermes Kanban  =  canonical task lifecycle + audit trail
Worker lane    =  implementation executor for one assigned card
Reviewer       =  human or human-proxy that gates "done"
GitHub PR      =  upstreamable artifact (optional, for code lanes)
```

仕事の一生についての正しさは Hermes のカンバンが握ります。`ready` → `running` → `review` / `blocked` / `done` / `archived` という流れです。作業レーンは仕事を実行しますが、この正しさを持つことはありません。レーンがすることはすべて `kanban_*` ツールを通じてカンバンの中核へ戻ってきます（Hermes 以外の外部の作業役なら API を通じて戻ります）。検分役は「コードの変更を書き終えた」から「仕事が済んだ」への移り変わりを見張ります。

## レーンが備えるもの {#what-a-lane-provides}

カンバンの作業レーンになるには、連携する側が次の3つを備える必要があります。

### 1. 担当者の文字列 {#1-an-assignee-string}

割り振り役は `task.assignee` を、Hermes のプロファイル名（既定のレーンの形）か、登録済みの立ち上げ対象外の識別子（プラグインによるレーンの形。後述の[外部 CLI の作業レーンを足す](#adding-an-external-cli-worker-lane)を参照）と照合します。担当者が解決できない仕事は `ready` に残り、`skipped_nonspawnable` という出来事が記録されるので、盤を運用する人が直せます。黙って捨てられたり、適当な代役に実行されたりはしません。

### 2. 立ち上げのしくみ {#2-a-spawn-mechanism}

Hermes のプロファイルによるレーンでは、割り振り役の `_default_spawn` が、その仕事に紐づけられた作業場所の中で `hermes -p <assignee> chat -q <prompt>` を実行します（`hermes` の呼び出し口が `$PATH` にないときは、同じ働きをするモジュール形式で実行します）。そのとき次の環境変数が設定されます。

| 変数 | 運ぶもの |
|---|---|
| `HERMES_KANBAN_TASK` | 作業役が扱っている仕事の id |
| `HERMES_KANBAN_DB` | 盤ごとの SQLite ファイルへの絶対パス |
| `HERMES_KANBAN_BOARD` | 盤の識別名 |
| `HERMES_KANBAN_WORKSPACES_ROOT` | 盤の作業場所の木の根 |
| `HERMES_KANBAN_WORKSPACE` | *この*仕事の作業場所への絶対パス |
| `HERMES_KANBAN_RUN_ID` | 今回の実行の id（一生を見張るしくみが使います） |
| `HERMES_KANBAN_CLAIM_LOCK` | 取得の錠を表す文字列（`<host>:<pid>:<uuid>`） |
| `HERMES_PROFILE` | 作業役自身のプロファイル名（`kanban_comment` の書き手を示すために使います） |
| `HERMES_TENANT` | その仕事にテナントがある場合、その名前空間 |

Hermes 以外のレーン（プラグインで登録するもの）では、プラグインが自前の `spawn_fn` を渡します。この関数は `task`・`workspace`・`board` を受け取り、異常終了を見つけるための pid を返せます。

### 3. 一生を終わらせる手段 {#3-a-lifecycle-terminator}

仕事を取得したら、必ず次のどれか1つで終える必要があります。

- `kanban_complete(summary=..., metadata=...)` — 仕事が成功し、状態が `done` に変わります。
- `kanban_request_review(summary=..., metadata=..., reviewer=...)` — 同じカードでの実装が終わり、独立した検分に入ります。状態は `review` に変わります。`kanban.review_dispatch` を無効にしていない限り、割り振り役が同梱の `sdlc-review` スキルを読み込みます。検分役は `kanban_complete` で承認するか、`kanban_request_changes` で手を入れるべき点を返すか、本当に外部の要因で止まっているときだけ `kanban_block` で持ち上げます。
- `kanban_block(reason=...)` — 人の入力待ちになり、状態が `blocked` に変わります。`kanban_unblock` が実行されると割り振り役が立ち上げ直します。
- 作業役の処理が、ツールを呼ばないまま終了する。中核がそれを回収し、`crashed`（PID が消えた）か `gave_up`（連続失敗の遮断が働いた）か `timed_out`（max_runtime を超えた）を出します。これは失敗の経路で、健全な作業役はここで終わりません。

カンバンの中核は、1回の実行がこのうちちょうど1つで終わることを強制します。どれも呼ばずに正常終了した作業役は、異常終了として扱われます。

## 成果と検分への引き継ぎ {#outputs-and-the-review-handoff}

コードを変える仕事では、仕事の関係図が示す検分の形を選びます。

- **同じカードでの検分:** `kanban_request_review(summary=..., metadata=..., reviewer=...)` を呼びます。仕事は `review` に入り、停止回数の勘定には触れません。既定では割り振り役が同梱の `sdlc-review` スキルで取得します。検分役は `kanban_complete` で承認するか、`kanban_request_changes(reason=...)` を呼んで検分の実行を閉じ、元の実装役へ仕事を戻すか、本当に外部へ持ち上げるべきときだけ止めます。
- **あらかじめ作ってある下流の検分／QA／リリースのカード:** `kanban_show` が子の ID を並べます。終わらせ方を選ぶ前に `kanban_show(task_id=...)` でそれらのカードを確かめてください。子が下流の検分／QA／リリースの工程であれば、実装の工程では `kanban_complete` を呼びます。子はこの親が `done`／`archived` になるまで進めません。それに加えて同じカードでの検分を求めてはいけませんし、`review-required:` で親を居座らせて止めるのも禁物です。どちらを選んでも、下流のレーンが取り残されるか二重になります。
- **人だけで回す盤:** `kanban.review_dispatch: false` を設定します。すると仕事は、人が承認するか、`reopen-review` や画面から `ready`／`todo` に戻すまで `review` にとどまれます。

どちらの検分の形でも、構造化された引き継ぎは状態の移り変わりそのものに載ります。`summary` や `metadata` に秘密の情報・トークン・生の個人情報を入れないでください。実行の記録は消えずに残ります。

差し込まれる `KANBAN_GUIDANCE` は、両方の関係図の形と、`kanban_complete` と、同じカードでの検分の流れと、本当に止まったときの `kanban_block` を扱います。

## ログと監査の記録 {#logs-and-audit-trail}

割り振り役は、仕事ごとの作業役の標準出力・標準エラーを `<board-root>/logs/<task_id>.log` に書きます。ログはカンバンのメタデータからたどれます。

- `task_runs` の行が `log_path`・終了コード（取れる場合）・要約・メタデータを持ちます。
- `task_events` の行が状態の移り変わりをすべて持ちます（`promoted`・`claimed`・`heartbeat`・`completed`・`blocked`・`review_requested`・`changes_requested`・`review_reopened`・`gave_up`・`crashed`・`timed_out`・`reclaimed`・`claim_extended`）。
- `kanban_show` は両方を返すので、仕事を読む検分役（や後続の作業役）は画面を開かなくても経緯をひととおり把握できます。

画面のほうは、実行の履歴を要約・メタデータの塊・終了状態のバッジ付きで描きます。CLI を使う人は `hermes kanban tail <task_id>` で流れを追いかけられますし、`hermes kanban runs <task_id>` で過去の試行の一覧を見られます。

## 今あるレーンの形 {#existing-lane-shapes}

### Hermes のプロファイルによるレーン（既定） {#hermes-profile-lane-default}

現在のカンバンの作業役がすべて取っている形です。担当者はプロファイル名で、割り振り役が `hermes -p <profile>` を立ち上げ、作業役には `KANBAN_GUIDANCE` のシステムプロンプトの塊が自動で差し込まれ、`kanban_*` ツールで実行を終えます。プロファイルを定義する以外の準備は要りません。

自分の陣容のためにプロファイルを作るときは、まとめ役に振ってほしい*役割*に合う名前を選んでください。まとめ役がいる場合、そのまとめ役は `hermes profile list` であなたのプロファイル名を見つけます。あらかじめ決まった顔ぶれが想定されているわけではありません（まとめ役の側の取り決めも、差し込まれる `KANBAN_GUIDANCE` に含まれています）。

### まとめ役プロファイルのレーン {#orchestrator-profile-lane}

プロファイルによるレーンを特化させたものです。まとめ役とは、道具立てに `kanban` を含みつつ、実装のための `terminal` / `file` / `code` / `web` を外した Hermes のプロファイルを指します。その務めは、大きな目標を `kanban_create` と `kanban_link` で子の仕事に分け、あとは一歩下がることです。まとめ役のスキルには、手を出したくなる誘惑を断つための決まりが書かれています。

## 外部 CLI の作業レーンを足す {#adding-an-external-cli-worker-lane}

Hermes 以外の CLI ツール（Codex CLI、Claude Code CLI、OpenCode CLI、手元で動かすコーディング用モデルなど）をカンバンの作業レーンとしてつなぐ道は、*まだ舗装されていません*。割り振り役の立ち上げ関数は差し替えられますし（`spawn_fn` は `dispatch_once` の引数です）、プラグインが Hermes 以外の担当者向けに自前の `spawn_fn` を登録することもできます。ただしその周りの作り込み — CLI の終了コードを `kanban_complete` や `kanban_block` の呼び出しに変換する、CLI ごとの作業場所やサンドボックスの流儀を割り振り役の `HERMES_KANBAN_WORKSPACE` に対応づける、認証と CLI ごとの決まりを扱う — は、いまも連携ごとの設計仕事のままです。

CLI のレーンを足そうと考えているなら、対象の CLI と実現したい流れを具体的に書いた issue を立ててください。上に書いた取り決めは、そうしたレーンが満たすべき制約です。実装の形（CLI ごとに1つのプラグインにするのか、設定で振る舞いを変える汎用の CLI 実行プラグインにするのか）はまだ決まっていません。

これまでの経緯は issue [#19931](https://github.com/NousResearch/hermes-agent/issues/19931) と、閉じられたまま取り込まれなかった Codex 向けの PR [#19924](https://github.com/NousResearch/hermes-agent/pull/19924) にあります。どちらも当初の設計案を述べていますが、実行のしくみは入りませんでした。

## 割り振り役が面倒を見る失敗のかたち {#failure-modes-the-dispatcher-handles}

レーンを書く人が同じものを作り直さずに済むように、次は割り振り役が引き受けます。

- **古くなった取得の期限切れ** — 仕事を取得したきり、鼓動も完了も停止も知らせない作業役は、`DEFAULT_CLAIM_TTL_SECONDS`（既定15分）を過ぎると取得を取り消されます。ただし作業役の処理が実際に死んでいる場合だけです。生きている作業役（遅いモデルが、ツールを呼ばない1回の応答に20分以上かけている場合など）は殺されず、取得の期限が*延ばされます*。回収されるのは死んだ PID だけです。
- **異常終了した作業役** — その端末での PID が消えた作業役は `detect_crashed_workers` が見つけて回収します。仕事の `consecutive_failures` が増え、遮断が働くと自動で停止することがあります。
- **実行単位での再試行** — 仕事が再試行されるとき（停止のあと、異常終了のあと、取得の取り消しのあと）、作業役は終わらせるツールの `expected_run_id` 引数を使うことで、自分の実行がすでに置き換えられていた場合にすぐ失敗できます。
- **仕事ごとの最長実行時間** — `task.max_runtime_seconds` が、PID が生きているかどうかに関係なく、1回の実行の実時間に上限をかけます。生きている PID による延長では止められない、本当に固まった作業役を捕まえます。
- **取り残された仕事の検出** — ready にある仕事の担当者が `kanban.stranded_threshold_seconds`（既定30分）の間に一度も取得しないと、`hermes kanban diagnostics` に `stranded_in_ready` の警告として現れます。深刻度はしきい値の2倍で error、6倍で critical に上がります。打ち間違えた担当者名も、消したプロファイルも、落ちている外部の作業役の一群も、この1つの合図で捕まります。名乗りに依存せず、盤ごとに許可名簿を整える必要もありません。
- **古い形の検分による行き詰まり** — `review-required:` で居座らせて止めた親に対し、直接の子が1つ以上まだ依存で `todo` に留まっている場合、`review_dependency_deadlock` の error がすぐ出ます。この診断は読むだけです。終わった工程を完了させるか、間違ったつながりを外すかを勧めるだけで、人が付けた停止を自動で外すことはありません。

## 関連 {#related}

- [カンバンの概要](/hermes/docs/user-guide/features/kanban/) — 使う人向けの入り口。
- [カンバンの手引き](/hermes/docs/user-guide/features/kanban-tutorial/) — 画面を開きながらたどる説明。
- [`KANBAN_GUIDANCE`](https://github.com/NousResearch/hermes-agent/blob/main/agent/prompt_builder.py) — すべてのカンバンの作業役のシステムプロンプトに差し込まれる、作業役とまとめ役の一生。
