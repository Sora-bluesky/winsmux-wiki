---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "カンバン（マルチエージェント盤）"
description: "複数の Hermes プロファイルを連携させる、SQLite に永続化されたタスク盤"
upstream_path: user-guide/features/kanban.md
upstream_blob: 507fa598ce20e9184c6d6bdceab183cff0deb9e0
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban
---

# カンバン — プロファイルをまたぐマルチエージェント協働 {#kanban-multi-agent-profile-collaboration}

> **順を追って試したい場合は** [カンバンのチュートリアル](/hermes/docs/user-guide/features/kanban-tutorial/) を読んでください。4 つの利用場面（1 人での開発、群での作業、再試行を含む役割分担のパイプライン、サーキットブレーカー）を、それぞれのダッシュボードの画面付きで説明しています。このページは早見表で、チュートリアルのほうが物語です。

Hermes のカンバンは、すべての Hermes プロファイルで共有される永続的なタスク盤です。プロセス内で壊れやすいサブエージェントの群れを作らなくても、名前を持つ複数のエージェントが同じ仕事に取り組めます。すべてのタスクは `~/.hermes/kanban.db` の 1 行で、すべての受け渡しは誰でも読み書きできる 1 行で、すべてのワーカーは自分の身元を持つ OS のプロセスです。

### 反復の上限に達する前の区切りの通知 {#completion-checkpoints-before-the-iteration-cap}

ディスパッチャーが持つワーカーには、有限の反復予算の 90% 付近で区切りの
通知が 1 回届きます。ツールを使える呼び出しがまだ残っているうちに、新しい
ツールの結果に添えて渡されます。もっと早いしきい値にしたい場合は
`agent.budget_warning_ratio` を使ってください。予算がごく小さい場合でも、
最後から 2 番目の反復までには必ず警告が出ます。1 回だけの実行には、上限の
手前の区切りの余地がありません。通知は次のリクエストの前にセッションの
記録へ保存されます。ワーカーは、タスクの約束を確かめてから `kanban_complete`
を呼ぶか、進捗のコメントを残して続けてください。コミットや差分だけで
タスクが自動的に完了することはありません。

固い上限、ツールなしの最終要約、連続失敗のサーキットブレーカーはこれまでと
変わりません。それでも予算を使い切ったワーカーには、回数を区切った再試行が
適用されます。これは報告の機会であって、モデルが必ず通知に従うという保証では
ありません。ふつうの会話や委任された子には、カンバンの自動的な区切りの通知は
引き継がれません。そちらの反復の警告は、これまでどおり任意のままです。

### 2 つの入口: モデルはツールで話し、あなたは CLI で話す {#two-surfaces-the-model-talks-through-tools-you-talk-through-the-cli}

盤には正面の入口が 2 つあり、どちらも同じ `~/.hermes/kanban.db` に支えられています。

- **エージェントは専用の `kanban_*` ツール群で盤を操作します** — `kanban_show`、`kanban_list`、`kanban_complete`、`kanban_request_review`、`kanban_request_changes`、`kanban_block`、`kanban_heartbeat`、`kanban_comment`、`kanban_attach`、`kanban_attach_url`、`kanban_attachments`、`kanban_create`、`kanban_link`、`kanban_unblock` です。ディスパッチャーは、これらのツールをすでにスキーマに入れた状態で各ワーカーを起動します。取りまとめ役のプロファイルでも、`kanban` のツール群を明示的に有効にできます。モデルはツールを直接呼んでタスクを読み、振り分けます。`hermes kanban` をシェルで叩くのでは*ありません*。下の [ワーカーは盤とどうやり取りするか](#how-workers-interact-with-the-board) を参照してください。
- **あなた（とスクリプト、cron）は `hermes kanban …`** という CLI、スラッシュコマンドの `/kanban …`、あるいはダッシュボードで盤を操作します。こちらは人と自動処理のためのもので、背後にツールを呼ぶモデルがいない場所です。

どちらの入口も同じ `kanban_db` の層を通るので、読み出しは一貫した状態を見ますし、書き込みがずれることもありません。このページの残りは貼り付けやすさから CLI の例を示しますが、どの CLI の動詞にも、モデルが使うツール呼び出しの対応物があります。

これは `delegate_task` では扱えない仕事の形に対応します。

- **調査の仕分け** — 並列の調査役 + 分析役 + 書き手、途中に人が入る形。
- **定期的な運用** — 毎日の要約が何週間もかけて記録を積み上げていく形。
- **デジタルな分身** — 名前を持つ常設の助手（`inbox-triage`、`ops-review`）が、時間をかけて記憶を蓄えていく形。
- **開発のパイプライン** — 分解 → 並列の worktree で実装 → レビュー → 反復 → PR。
- **群での作業** — 1 人の専門家が N 個の対象を担当する形（50 個の SNS アカウント、12 個の監視対象サービス）。

代表的な 8 つの協働の型は、下の [協働の型](#collaboration-patterns) にまとめてあります。

## PR の完了条件 {#pr-completion-contracts}

PR を伴う作業は、作成時に `--completion-contract OWNER/REPO`（既存の作業なら
`https://github.com/OWNER/REPO/pull/123` のような正確な URL）で宣言します。
`kanban_create` も同じ `completion_contract` を受け取ります。意図してローカルに
留める作業には `local-only` を使ってください。既存のカードや宣言のないカードは
その既定値のままです。本文に書かれた URL は方針にはなりません。

公開したあとは、完了時に `metadata.published_pr` を渡します。最初に一致した URL が
そのカードに恒久的に結びつき、再試行で別の緑の PR に差し替えることはできません。
CLI の `show --json` と `kanban_show` が、保存された条件を表示します。

共通の `complete_task` の境界が、ワーカーのツール、CLI、レビューの承認、
ダッシュボードからの完了のすべてを受け持ちます。従来のブランチ保護と、有効な
ルールセットが要求するコンテキストを読み、head が正確に一致するチェック実行と
以前の形式のステータスをページ送りで集め、そのうえで PR の head/base を読み直します。
任意の失敗 / スキップの情報が、受理された必須チェックを覆すことはありません。
**必須**の証拠が、存在しない・保留・失敗・中止・時間切れ・古い・スキップ・
中立のいずれかであれば、カードは完了できません。実行数ゼロでの受理、読めない方針、
GitHub API の失敗でも完了できません。必須チェックのないリポジトリには、
local-only の条件が要ります。`gh` は、そのリポジトリのチェックとルールを読める
状態で認証されている必要があります。この関門がリモートへ書き込むことはありません。

拒否された場合、カードと作業場所はそのまま残ります。永続的な `pr_acceptance`
イベントには、PR の URL、SHA、必須コンテキスト、チェックの ID と URL、分類、
復旧の手順が保存されます。`last_failure_error` が次の一手を示します。失敗を直し、
基盤側のチェックを再実行するか待ってから、完了をやり直してください。人の対応が
必要なときは `kanban_block` を使います。GitHub の汎用的な `failure` からは、
テストが落ちたのか成果物のアップロードが落ちたのかを判別できません。保存された
URL を確かめてください。基盤側の明示的な結論と API の失敗は、別々に分類されます。
追加のワーカーが起動されることはありません。

受領の保存と、最後の書き込み時の実行 / 状態 / 条件の所有者の再確認は、1 つの
SQLite のロックの下で行われます。回収されたワーカーが、新しい実行を完了させたり
受理を結びつけたりすることはできません。最後の GitHub の読み出しは完了時点の
断面であって、分散トランザクションでも、完了後の継続的な監視でもありません。
これは 1 人の利用者を想定したライフサイクルの守りであって、データベースへの
任意の直接書き込みに対する OS レベルの隔離ではありません。GitHub Enterprise は
対象外です。関連する公開 / ライフサイクルの作業: #91230、#84254、#52311。
ローカルでの検証と公開だけでは、リモートでの受理にはなりません。

## カンバンと `delegate_task` の違い {#kanban-vs-delegatetask}

似て見えますが、同じ部品ではありません。

| | `delegate_task` | カンバン |
|---|---|---|
| 形 | RPC 呼び出し（分岐 → 合流） | 永続的なメッセージキュー + 状態機械 |
| 親 | 子が返るまで待つ | `create` したら投げっぱなし |
| 子の身元 | 名前のないサブエージェント | 記憶を持ち続ける名前付きプロファイル |
| 再開できるか | できない — 失敗はそのまま失敗 | ブロック → 解除 → 再実行、異常終了 → 回収 |
| 人の介在 | 対応しない | いつでもコメント / 解除ができる |
| 1 タスクあたりのエージェント数 | 1 回の呼び出し = 1 つのサブエージェント | タスクの一生で N 体（再試行、レビュー、追加作業） |
| 記録 | コンテキストの圧縮で失われる | SQLite に永続的な行として残る |
| 連携 | 階層型（呼ぶ側 → 呼ばれる側） | 対等 — どのプロファイルもどのタスクを読み書きできる |

**一文でいうと:** `delegate_task` は関数呼び出しで、カンバンは、すべての受け渡しがどのプロファイル（や人）からも見えて編集できる 1 行になっている作業の待ち行列です。

:::caution 解除したい相手のカードに、支援用のカードをつながない
`t_parent` でブロックされたワーカーが、足りない部分のために支援用のカードを作ったとき、`kanban_link(t_parent, t_support)` をして**はいけません**。このリンクは支援用のカードをブロック中の親の*子*にしてしまうので、解除したいはずの親に阻まれ、どちらのカードも動かなくなります。代わりに、支援用のカードの本文で親の id に触れてください。`link`/`kanban_link` は `ready` の子を降格させるときに `gated: true` を返して `dependency_wait` イベントを記録します（`parents` 付きの `kanban_create` が新しいカードを待たせるときも同様です）。行き詰まりが盤の上で見えるようになっています。`hermes kanban unlink <parent> <child>` で解除できます。
:::

**`delegate_task` を使うのは**、親のエージェントが続きに進む前に短い推論の答えが必要で、人が関わらず、結果が親のコンテキストに戻ってくる場合です。

**カンバンを使うのは**、作業がエージェントの境界をまたぐ、再起動をまたいで残る必要がある、人の入力が要るかもしれない、別の役割の担当が引き取るかもしれない、あとから見つけられる必要がある、といった場合です。

両者は共存します。カンバンのワーカーが、実行中に内部で `delegate_task` を呼んでも構いません。

## 中心となる考え方 {#core-concepts}

- **盤（ボード）** — 独立した SQLite の DB、作業場所のディレクトリ、
  ディスパッチャーのループを持つ、単独のタスクの待ち行列です。1 つの導入で
  盤をいくつも持てます（プロジェクトごと、リポジトリごと、領域ごとなど）。
  下の [盤（複数プロジェクト）](#boards-multi-project) を参照してください。
  1 つのプロジェクトだけを扱う人は `default` の盤のままで、この節以外で
  「盤」という言葉を目にすることはありません。
- **タスク** — タイトル、任意の本文、1 人の担当者（プロファイル名）、状態（`triage | todo | ready | running | blocked | review | done | archived`）、任意のテナントの名前空間、任意の冪等キー（再試行された自動処理の重複排除）を持つ 1 行です。
- **リンク** — 親 → 子の依存関係を記録する `task_links` の行です。ディスパッチャーは、すべての親が `done` になった時点で `todo → ready` に昇格させます。実行中の子へのリンクの追加は拒否されます。すでに取り掛かられている作業を待たせることはできないからです。唯一の例外は、稼働中のワーカーが、ディスパッチャーから与えられた実行の所有権のもとで、依存によるブロックの直前に自分自身のカードをつなぐ場合です。
- **コメント** — エージェント間のやり取りの仕組みです。エージェントも人もコメントを書き足せます。ワーカーが（再）起動されるとき、コメントのつながり全体をコンテキストの一部として読みます。
- **作業場所（ワークスペース）** — ワーカーが作業するディレクトリです。3 種類あります。
  - `scratch`（既定） — `~/.hermes/kanban/workspaces/<id>/`（既定以外の盤では `~/.hermes/kanban/boards/<slug>/workspaces/<id>/`）の下に作られる新しい一時ディレクトリです。**タスクの完了時に削除されます** — scratch は設計上その場限りのものです。`kanban_complete(artifacts=[...])` や `kanban_request_review(artifacts=[...])` で明示的に宣言されたファイルは、片付けの前に、タスクごとの永続的な添付の保管場所へコピーされます（レビューへの受け渡しでは受け渡しの時点で退避されます。scratch の作業場所を消すのは、そのあとのレビュー担当の完了だからです）。以前の形式の完了の要約にある成果物のパスも同じ扱いになります。それ以外の scratch のファイルは削除されます。宣言された scratch の成果物が見つからない場合、タスクは進行中のままになるので、ワーカーはパスを直して再試行できます。作業場所を丸ごと残したいときは `worktree:` か `dir:<path>` を使ってください。ある導入で scratch の作業場所が初めて作られたとき、ディスパッチャーは警告を記録し、そのタスクに `tip_scratch_workspace` イベントを出します（`hermes kanban show <id>` で見られます）。
  - `dir:<path>` — 既存の共有ディレクトリです（Obsidian の保管庫、メール運用のディレクトリ、アカウントごとのフォルダーなど）。**絶対パスである必要があります。** `dir:../tenants/foo/` のような相対パスは、振り分けの時点で拒否されます。ディスパッチャーがたまたまいる作業ディレクトリを基準に解決されてしまい、曖昧なうえに、権限の取り違えを招く抜け道になるからです。パスはそれ以外の点では信頼されます。あなたの機械、あなたのファイルシステムであり、ワーカーはあなたの uid で動くからです。これは信頼されたローカル利用者を前提とした脅威モデルで、カンバンは設計上 1 台のホストで完結します。**完了しても残ります。**
  - `worktree` — コーディングのタスク向けに `.worktrees/<id>/` の下に作られる git の worktree です。対象のパスを固定したい場合は `worktree:<path>` を使います。ワーカー側の `git worktree add` が作成し、指定があれば `--branch` を使います。**完了しても残ります。**
- **ディスパッチャー** — N 秒ごと（既定 60 秒）に次を行う、長く動き続けるループです。古くなった取り掛かりの解除、異常終了したワーカーの回収（PID が消えているが TTL はまだ切れていないもの）、終わった実行より長生きしたワーカーの回収（自分で `kanban_complete`/`kanban_block` を呼んだあともまだ生きているワーカーは、その実行が閉じてから 2 分後に終了させられます。最後のやり取りを終える時間を残すためです。PID *と*起動時刻の指紋の両方で照合するので、使い回された PID にシグナルが飛ぶことはありません。`terminal_worker_reaped` イベントとして記録されます）、準備できたタスクの昇格、不可分な取り掛かり、割り当てられたプロファイルの起動です。既定では**ゲートウェイの中**で動きます（`kanban.dispatch_in_gateway: true`）。1 つのディスパッチャーが 1 回のまわりですべての盤を見ます。ワーカーは `HERMES_KANBAN_BOARD` を固定した状態で起動されるので、他の盤を見ることはできません。同じタスクで `kanban.failure_limit` 回（既定 2 回）続けて起動に失敗すると、ディスパッチャーは最後のエラーを理由にそのタスクを自動でブロックします。プロファイルが存在しない、作業場所をマウントできないといったタスクで、無駄に繰り返すのを防ぐためです。
- **テナント** — 盤の*中*での任意の文字列による名前空間です。1 つの専門家の群が、作業場所のパスと記憶のキーの接頭辞でデータを分けながら、複数の事業（`--tenant business-a`）に対応できます。テナントは緩やかな絞り込みで、強い隔離の境界は盤のほうです。

## 盤（複数プロジェクト） {#boards-multi-project}

盤を使うと、関係のない作業の流れを — プロジェクトごと、リポジトリごと、
領域ごとに — 独立した待ち行列へ分けられます。新しい導入には `default` という
盤がちょうど 1 つあります（後方互換のため DB は `~/.hermes/kanban.db` です）。
作業の流れが 1 つで足りる人は、盤について知る必要はまったくありません。
この機能は使いたい人だけが使うものです。

盤ごとの隔離は徹底しています。

- 盤ごとに別の SQLite の DB（`~/.hermes/kanban/boards/<slug>/kanban.db`）。
- 別々の `workspaces/` と `logs/` のディレクトリ。
- あるタスクのために起動されたワーカーが見られるのは、その盤のタスク**だけ**です。
  ディスパッチャーが子のプロセスの環境変数に `HERMES_KANBAN_BOARD` を設定し、
  ワーカーが使えるすべての `kanban_*` ツールがそれを読みます。
- 盤をまたいだタスクのリンクはできません（スキーマを単純に保つためです。
  どうしてもプロジェクトをまたいだ参照が必要なら、自由記述で触れておいて、
  id で手作業で引いてください）。

### CLI から盤を管理する {#managing-boards-from-the-cli}

```bash
# See what's on disk. Fresh installs show only "default".
hermes kanban boards list

# Create a new board.
hermes kanban boards create atm10-server \
    --name "ATM10 Server" \
    --description "Minecraft modded server ops" \
    --icon 🎮 \
    --switch                   # optional: make it the active board

# Operate on a specific board without switching.
hermes kanban --board atm10-server list
hermes kanban --board atm10-server create "Restart ATM server" --assignee ops

# Change which board is "current" for subsequent calls.
hermes kanban boards switch atm10-server
hermes kanban boards show             # who's active right now?

# Rename the display name (the slug is immutable — it's the directory name).
hermes kanban boards rename atm10-server "ATM10 (Prod)"

# Archive (default) — moves the board's dir to boards/_archived/<slug>-<ts>/.
# Recoverable by moving the dir back.
hermes kanban boards rm atm10-server

# Hard delete — `rm -rf` the board dir. No recovery.
hermes kanban boards rm atm10-server --delete
```

盤が決まる順序（優先度の高いものから）:

1. CLI 呼び出しでの明示的な `--board <slug>`。
2. `HERMES_KANBAN_BOARD` の環境変数（ワーカーの起動時にディスパッチャーが
   設定するので、ワーカーは他の盤を見られません）。
3. `~/.hermes/kanban/current` — `hermes kanban
   boards switch` が保存した slug。
4. `default`。

slug は検証されます。小文字の英数字 + ハイフン + アンダースコアで、1〜64
文字、先頭は英数字である必要があります。大文字の入力は自動的に小文字へ
変換されます。それ以外（スラッシュ、空白、ドット、`..`）は CLI の層で
拒否されるので、パスをたどる細工で盤に名前を付けることはできません。

### ダッシュボードから盤を管理する {#managing-boards-from-the-dashboard}

`hermes dashboard` の カンバン タブでは、盤が 2 つ以上になった時点（または
どれかの盤にタスクがある時点）で、上部に盤の切り替えが現れます。盤が 1 つ
だけの人には小さな `+ New board` のボタンだけが見え、切り替えは必要になる
まで隠れています。

- **盤のドロップダウン** — 使う盤を選びます。選択はブラウザーの
  `localStorage` に保存されるので、読み込み直しても残りますし、開いたままの
  端末の下で CLI の `current` の指す先が動くこともありません。
- **+ New board** — slug、表示名、説明、アイコン、プロジェクトのディレクトリ、
  そして（プロジェクトが 1 つでもあれば）**Project** の選択を尋ねる画面が
  開きます。新しい盤へ自動で切り替える選択肢もあります。
- **Settings** — 現在の盤の表示名、説明、**プロジェクトのディレクトリ**
  （`default_workdir`）を編集する画面が開きます。プロジェクトのディレクトリは、
  新しいタスクがすべて引き継ぐ、盤の単位での作業場所の既定値です（git の
  リポジトリなら残る worktree、ふつうのディレクトリなら残るディレクトリ）。
  タスクごとに作成時に上書きすることもできます。この欄を空にすると、新しい
  タスクは使い捨ての scratch の作業場所に戻ります。ただしプロジェクトが
  結びつけられている場合は、そのプロジェクトの主フォルダーが使われます。
  scratch に戻したいときは、先にプロジェクトの結びつけを外してください。
- **Project**（どちらの画面にもあります） — 盤を Hermes のプロジェクトに
  結びつけます（盤の `project_id`）。
  結びつけられた盤で作られたタスクはそのプロジェクトを引き継ぎます。
  ディレクトリの欄が空のままプロジェクトを選ぶと、プロジェクトの主フォルダーが
  プロジェクトのディレクトリの初期値にもなります。結びついたプロジェクトは
  盤のドロップダウンの横に `Project: <name>` のバッジとして表示され、その `×`
  でプロジェクトのディレクトリに触れずに結びつけを外せます（`project_id: ""`
  を送ります）。Settings の `No binding` も、保存時に同じことをします。
  この選択肢は、プロジェクトが 1 つ以上あるときだけ現れます。
- **Archive** — `default` 以外の盤にだけ表示されます。確認のうえ、盤の
  ディレクトリを `boards/_archived/` へ移します。

ダッシュボードの API のすべての経路が、盤を絞り込む `?board=<slug>` を
受け付けます。イベントの WebSocket は接続時に 1 つの盤に固定されるので、
画面で切り替えると新しい盤に対して新しい接続が開きます。

### デスクトップアプリで盤を切り替える {#switching-boards-in-the-desktop-app}

デスクトップアプリでは、盤の切り替えはカンバンのページ上部、ページの見出しの
横にあるヘッダーの行に置かれています。現在の盤の名前とタスク数を表示する
**Board** という部品で、山形の印が付いています。ここにカーソルを合わせると
「Switch board」と出ます。クリックすると別の盤を選べるほか、盤の名前の変更、
設定、書き出し、読み込み、作成、アーカイブができます。ダッシュボードと同じく、
デスクトップアプリも自分の選択を（ローカルに）保持し、CLI の `current` の
指す先を動かすことはありません。

## ファイルの添付 {#file-attachments}

タスクにはファイルを添付できます — PDF、画像、元の資料など。本文にパスを
貼り付けて見つけてくれることを祈らなくても、ワーカーは必要な資料を手にできます。

- **アップロード** — ダッシュボードの引き出しでタスクを開き、
  **Attachments** の欄にある *Upload file* のボタンを使います（一度に複数の
  ファイルでも構いません）。1 回のアップロードにつき 25 MB までです。
- **保管場所** — 既定の盤では
  `<hermes-home>/kanban/attachments/<task_id>/` の下、名前付きの盤では
  `<hermes-home>/kanban/boards/<slug>/attachments/<task_id>/` の下に置かれます。
  場所を固定したい場合は `HERMES_KANBAN_ATTACHMENTS_ROOT` を設定します。
- **ワーカーから見えるもの** — ディスパッチャーがタスクをワーカーへ渡すとき、
  ワーカーのコンテキストには、各ファイルの名前と**絶対パス**を並べた
  **Attachments** の節が入ります。ワーカーはファイルと端末のツールを完全に
  使えるので、添付を直接読めます（`read_file` や、`pdftotext` のようなシェルの
  ツール）。
- **ダウンロード / 削除** — 引き出しには、それぞれの添付がダウンロードの
  リンクと削除（×）の操作とともに並びます。添付を削除するとその管理の行が
  消えます。ディスク上のファイルが消えるのは、他のどの添付の行からも参照
  されなくなったときだけです（複数のタスクで共有されているファイルは、最後の
  参照が消えるまで残ります）。CLI からは `hermes kanban attach-rm
  ATTACHMENT_ID` が同じように添付を削除します。

:::note リモートの端末バックエンド
添付のパスは、カンバンのワーカーの既定である**ローカル**の端末バックエンドで
そのまま解決されます。リモートのバックエンド（Docker、Modal）でワーカーを
動かす場合は、ワーカーのコンテキストにある絶対パスに届くよう、盤の
`attachments/` ディレクトリをサンドボックスの中にマウントしてください。
:::

## 手早く始める {#quick-start}

下のコマンドは、**あなた**（人）が盤を用意してタスクを作る場面です。タスクが割り当てられると、ディスパッチャーがその担当のプロファイルをワーカーとして起動し、そこから先は**モデルが CLI ではなく `kanban_*` のツール呼び出しでタスクを進めます** — [ワーカーは盤とどうやり取りするか](#how-workers-interact-with-the-board) を参照してください。

```bash
# 1. Create the board (you)
hermes kanban init

# 2. Start the gateway (hosts the embedded dispatcher)
hermes gateway start

# 3. Create a task (you — or an orchestrator agent via kanban_create)
hermes kanban create "research AI funding landscape" --assignee researcher

# 4. Watch activity live (you)
hermes kanban watch

# 5. See the board (you)
hermes kanban list
hermes kanban stats
```

ディスパッチャーが `t_abcd` を拾って `researcher` のプロファイルを起動すると、そのワーカーのモデルが真っ先にすることは、自分のタスクを読むための `kanban_show()` の呼び出しです。`hermes kanban show t_abcd` を実行するのではありません。

### ゲートウェイに組み込まれたディスパッチャー（既定） {#gateway-embedded-dispatcher-default}

ディスパッチャーはゲートウェイのプロセスの中で動きます。入れるものも、別に
管理するサービスもありません。ゲートウェイが動いていれば、準備できたタスクは
次のまわり（既定 60 秒）で拾われます。

```yaml
# config.yaml
kanban:
  dispatch_in_gateway: true        # default
  dispatch_interval_seconds: 60    # default
  review_dispatch: true            # default: spawn the assigned profile with
                                   # the bundled sdlc-review skill. Set false
                                   # for human-only review boards.
  # dispatch_profiles: [sage]       # unset (key omitted): this home may claim
                                   # cards for any existing profile. Set to a
                                   # list (or comma-separated string) of profile
                                   # names to restrict which assignees this home
                                   # claims. Fail-closed: an empty list, `null`
                                   # or a bare `dispatch_profiles:` claims
                                   # nothing, and so does an unreadable config.
```

調べもののために、実行時には `HERMES_KANBAN_DISPATCH_IN_GATEWAY=0` で設定の
項目を上書きできます。ゲートウェイのふつうの管理方法がそのまま使えます。
`hermes gateway start` を直接実行するか、ゲートウェイを systemd のユーザー
ユニットとして組み込んでください（ゲートウェイの文書を参照）。ゲートウェイが
動いていないと、`ready` のタスクは 1 つ立ち上がるまでそのままです。
`hermes kanban create` は、作成の時点でこのことを警告します。

#### ワーカーと systemd の cgroup {#workers-and-systemd-cgroups}

ワーカーは、ディスパッチャーのまわりより長く生きる投げっぱなしのプロセスです。
そのためディスパッチャーが systemd のユニットの中で動いている場合、ワーカーは
自分専用の一時的なスコープ（`systemd-run --user --scope --unit hermes-worker-kanban-<task>-run-<run>`）
で起動され、そのユニットの終了や再起動を越えて生き残ります。スコープの作成には
振り分ける側の利用者のセッションバス（`/run/user/<uid>/bus`）が必要です。
システム全体への導入では `sudo loginctl enable-linger <user>` で用意してください。

- **ゲートウェイのディスパッチャー**（`dispatch_in_gateway: true`、ゲートウェイが
  systemd の下）: スコープは必須です。バスに届かない場合は起動が拒否され、
  カードには*基盤側*の失敗として記録されます — `metadata.infrastructure: true`
  を持つ `spawn_failed`、`last_failure_error` に書かれた linger の対処、
  ゲートウェイのログの警告 — そしてカードは `ready` のままです。
  `consecutive_failures` は**増えない**ので、ホスト側の一時的な不調でカードが
  素の `blocked` に置かれることはありません。再起動の見張りが再試行の間隔を
  空けます（`infrastructure_cooldown`。レート制限の冷却と同じ長さです）。
  バスが戻るまでこれが続きます。
- **自分のユニットからの `hermes kanban dispatch`**（`Type=oneshot` のタイマー、
  順に実行するサービスなど）: バスに届くなら、ワーカーは同じスコープを得ます。
  なければワーカーはやはり起動されますが — *あなたの*ユニットの cgroup の中で
  — ユニットの終了がワーカーを道連れにすることを、ディスパッチャーが 1 回、
  はっきりと記録します。既定の `KillMode=control-group` の `Type=oneshot` では、
  処理が終わった 1 秒後にすべてのワーカーが失われます。スコープを作れるよう
  linger を有効にするか、そのユニットに `KillMode=process` を設定して、終了が
  ディスパッチャー自身だけを止めるようにしてください。

`hermes kanban daemon` を別のプロセスとして動かすのは**非推奨**です。
ゲートウェイを使ってください。どうしてもゲートウェイを動かせない場合
（画面のないホストの方針で常駐サービスが禁じられているなど）、`--force` という
逃げ道が 1 リリースの間だけ従来の単独のデーモンを残しますが、同じ
`kanban.db` に対してゲートウェイ組み込みのディスパッチャーと単独のデーモンを
両方動かすと、取り掛かりの競合が起きます。これは対応の対象外です。

### 複数の home で盤を共有する {#shared-boards-across-homes}

1 つの `kanban.db` を複数の Hermes home（コンテナ、群のホスト）でマウントすると
盤を共有できますが、プロファイル名は home のローカルなもので、どの home にも
`default` という名前の root プロファイルがあります。つまり `default` は
仕組みの上で必ずぶつかります。ディスパッチャーの起動の関門は、*取り掛かろうと
している* home に対して `profile_exists(assignee)` を調べます。追加の設定が
なければ、どの home のディスパッチャーも `default` に割り当てられたカードを
取り掛かれると判断するので、間違った home が取り掛かって実行してしまいます。
home ごとに固有のプロファイル名を付けて、共有の盤では `default` にカードを
割り当てないようにするか、home ごとに `kanban.dispatch_profiles` を設定して、
その home が取り掛かってよい担当者をちょうど宣言してください。それ以外は
起動されず、ディスパッチャーの `skipped_nonspawnable` に入り、ゲートウェイの
起き上がりの確認でも起動できる作業として数えられなくなります。

### 冪等な作成（自動処理 / Webhook 向け） {#idempotent-create-for-automation-webhooks}

```bash
# First call creates the task. Any subsequent call with the same key
# returns the existing task id instead of duplicating.
hermes kanban create "nightly ops review" \
    --assignee ops \
    --idempotency-key "nightly-ops-$(date -u +%Y-%m-%d)" \
    --json
```

### まとめて扱える CLI の動詞 {#bulk-cli-verbs}

ライフサイクルの動詞はどれも複数の id を受け取るので、まとめて片付けられます。

```bash
hermes kanban complete t_abc t_def t_hij --result "batch wrap"
hermes kanban archive  t_abc t_def t_hij
hermes kanban unblock  t_abc t_def
hermes kanban block    t_abc "need input" --ids t_def t_hij
```

:::note 解除されたタスクの行き先
`unblock` は安全な元の段階へ戻します。親が完了しているレビュー由来の作業なら
**`review`**、親が完了している実装の作業なら **`ready`**、親がまだ開いている
間は **`todo`** です。`todo` のタスクは元の段階の由来を覚えていて、依存の関門が
外れたときに自動で `review` か `ready` に戻ります。`unblock` が直接 `triage`
へ送ることはありません。

タスクを解除したのに、あとで **`triage`** に現れたなら、そこへ送ったのは解除では
ありません。そのあとの*同じ理由での再ブロック*です。タスクがブロック → 解除 →
同じ理由で再ブロック、を `BLOCK_RECURRENCE_LIMIT` 回（既定 `2`）繰り返すと、
解除ループの遮断機が `blocked` へ戻すのをやめ — cron がひたすら解除し続ける場所
です — 取りまとめの目が届くよう `triage` へ送ります。これは LLM の判断ではなく
DB の上の決まり切った守りで、タスクの本文で免れることはできません。繰り返しの
数え上げは、解除のたびに意図して残ります（`complete` が成功したときにだけ
ゼロに戻ります）。解除したタスクを作業の流れに留めたいなら、解除の前に*なぜ
再ブロックが続くのか*（親が終わっていない、入力が足りない、能力が足りない）を
解決してください。あるいは、その繰り返しが想定内なら `BLOCK_RECURRENCE_LIMIT`
を上げてください。
:::

## チャットのプロファイルでツールを有効にする {#enabling-tools-for-a-chat-profile}

デスクトップのカンバンのプラグインは盤を表示するだけで、チャットのエージェントに
タスクを管理する権限を与えるものではありません。作業を取りまとめるプロファイルと
プラットフォームで `kanban` のツール群を有効にしてください。

```bash
hermes -p planner tools enable kanban                      # CLI / TUI / Desktop chats
hermes -p planner tools enable kanban --platform telegram  # a gateway platform
```

プラットフォームごとの選択は `config.yaml` の `platform_toolsets.<platform>` の
下にあります。このツール群は `hermes tools` とダッシュボードのチェックボックスにも
なっています。これを持つゲートウェイのエージェントはチャットから `kanban_create`
でき、同じやり取りの中でそのタスクの完了 / ブロックの通知を自動で受け取ります。
この設定を変えたら新しいチャットを始めてください。既存の会話は、ツールのスキーマと
プロンプトのキャッシュをそのまま持ち続けます。`agent.disabled_toolsets` は変わらず
最終的な決め手です。以前の形式のトップレベルの `toolsets: [kanban]` は、
プラットフォームごとの選択が保存されていないときにだけ予備として尊重されます。
`all` だけではカンバンを有効にしたことになりません。

ディスパッチャーが持つワーカーは、タスクのライフサイクルのツールを自動で受け取ります。
`delegate_task` の子が盤を書き換える権限を得ることはありません。

## ワーカーは盤とどうやり取りするか {#how-workers-interact-with-the-board}

**ワーカーは `hermes kanban` をシェルで叩きません。** ディスパッチャーがワーカーを起動するとき、子のプロセスの環境変数に `HERMES_KANBAN_TASK=t_abcd` を設定します。この環境変数が、モデルのスキーマにある専用の**カンバンのツール群**を有効にします。同じツール群は、ツール群の設定で `kanban` を有効にした取りまとめ役のプロファイルでも使えます。これらのツールは、CLI と同じく Python の `kanban_db` の層を通して盤を直接読み書きします。動いているワーカーは、他のツールと同じようにこれらを呼びます。`hermes kanban` の CLI を見ることも、必要とすることもありません。

| ツール | 用途 | 必須の引数 |
|---|---|---|
| `kanban_show` | 現在のタスクを読みます（タイトル、本文、過去の試み、親からの受け渡し、コメント、整形済みの `worker_context` 全文）。既定では環境変数のタスク id を使います。 | — |
| `kanban_list` | `assignee`、`status`、`tenant`、アーカイブの表示、件数の上限で絞り込みながら、タスクの要約を並べます。盤の作業を把握する取りまとめ役向けです。 | — |
| `kanban_complete` | `summary` + `metadata` の構造化された受け渡しとともに終えます。 | `summary` / `result` の少なくとも一方 |
| `kanban_request_review` | 永続的な `summary`、任意の `metadata`、任意のレビュー担当プロファイルとともに、同じカードでのレビューを始めます。タスクは `review` へ移ります。これはブロックではありません。 | `summary` |
| `kanban_request_changes` | 実行中のレビューからのレビュー担当の判定です。その実行を閉じ、親の関門を適用し直し、ブロックの数え上げをせずにタスクを元の実装者へ戻します。 | `reason` |
| `kanban_block` | 作業を止め、理由で行き先を決めます。`kind=dependency`（`todo` で待ち、終わっていない親が終わると自動で再開します。開いている親がない場合は、その待ちが決して満たされないので `needs_input` として記録されます）、`needs_input`/`capability`/`transient`（人に知らせます）。同じ種類の再ブロックが繰り返されると自動で `triage` へ上がります。 | `reason` |
| `kanban_heartbeat` | 長い処理の間、生きていることを知らせます。副作用だけのツールです。 | — |
| `kanban_comment` | タスクのつながりに残る注記を書き足します。 | `task_id`、`body` |
| `kanban_attach` | バイト列をそのまま渡して（base64）タスクにファイルを添付します。タスクの添付ディレクトリの下に保存されます（25 MB まで）。 | ファイルのバイト列と名前 |
| `kanban_attach_url` | URL でタスクにファイルを添付します。 | `url` |
| `kanban_attachments` | タスクの添付を並べます。 | — |
| `kanban_create` | （取りまとめ役向け）`assignee`、任意の `parents`、`skills` などを指定して子のタスクへ展開します。開いている親のせいで新しいカードが `todo` に置かれた場合は `gated: true` + `gated_by` を返します。 | `title`、`assignee` |
| `kanban_link` | （取りまとめ役向け）あとから `parent_id → child_id` の依存の辺を足します。子が `ready` だったが親が終わっていないために `todo` へ降格された場合は `gated: true` を返します。子は親が完了してからでないと動きません。子がすでに取り掛かられている場合は `child is already running` として拒否されます。取り掛かりのあとに足した辺では実行の順序を決められないからです（ワーカーが `kind=dependency` のブロックの直前に、*自分自身の*実行中のカードをつなぐことはできます）。 | `parent_id`、`child_id` |
| `kanban_unblock` | （取りまとめ役向け）ブロックされたタスクを元の段階（`review` か `ready`）へ、親がまだ開いている間は `todo` へ戻します。 | `task_id` |

ふつうのワーカーのやり取りは、こんな形になります。

```
# Model's tool calls, in order:
kanban_show()                                     # no args — uses HERMES_KANBAN_TASK
# (model reads the returned worker_context, does the work via terminal/file tools)
kanban_heartbeat(note="halfway through — 4 of 8 files transformed")
# (more work)
kanban_complete(
    summary="migrated limiter.py to token-bucket; added 14 tests, all pass",
    metadata={"changed_files": ["limiter.py", "tests/test_limiter.py"], "tests_run": 14},
)
```

**取りまとめ役**のワーカーは、代わりに展開します。

```
kanban_show()
kanban_create(
    title="research ICP funding 2024-2026",
    assignee="researcher-a",
    body="focus on seed + series A, North America, AI-adjacent",
)
# → returns {"task_id": "t_r1", ...}
kanban_create(title="research ICP funding — EU angle", assignee="researcher-b", body="…")
# → returns {"task_id": "t_r2", ...}
kanban_create(
    title="synthesize findings into launch brief",
    assignee="writer",
    parents=["t_r1", "t_r2"],                     # promotes to ready when both complete
    body="one-pager, 300 words, neutral tone",
)
kanban_complete(summary="decomposed into 2 research tasks + 1 writer; linked dependencies")
```

「（取りまとめ役向け）」のツール — `kanban_list`、`kanban_create`、`kanban_link`、`kanban_unblock`、それに他人のタスクへの `kanban_comment` — は同じツール群から使えます。取り決め（自動で差し込まれるカンバンの案内に書かれています）としては、ワーカーのプロファイルは展開や無関係な作業の振り分けをせず、取りまとめ役のプロファイルは実装の作業をしません。ディスパッチャーが起動したワーカーは、破壊的なライフサイクルの操作についてはやはりタスクの範囲に限られ、無関係なタスクを書き換えることはできません。

### なぜ `hermes kanban` をシェルで叩かずツールにするのか {#why-tools-instead-of-shelling-to-hermes-kanban}

理由は 3 つあります。

1. **バックエンドの移しやすさ。** 端末のツールがリモートのバックエンド（Docker / Modal / Singularity / SSH）を向いているワーカーは、`hermes kanban complete` をコンテナの*中*で実行してしまいます。そこには `hermes` が入っておらず、`~/.hermes/kanban.db` もマウントされていません。カンバンのツールはエージェント自身の Python のプロセスで動くので、端末のバックエンドが何であれ必ず `~/.hermes/kanban.db` に届きます。
2. **シェルの引用符で壊れない。** `--metadata '{"files": [...]}'` を shlex と argparse に通すのは、潜んだ落とし穴です。構造化されたツールの引数なら、その工程を丸ごと飛ばせます。
3. **エラーが分かりやすい。** ツールの結果は、モデルが推論できる構造化された JSON であって、解釈しなければならない標準エラー出力の文字列ではありません。

**ふつうのセッションにはスキーマ上の負担がありません。** ふつうの `hermes chat` のセッションには、取りまとめの作業のためにアクティブなプロファイルが `kanban` のツール群を明示的に有効にしていない限り、`kanban_*` のツールは 1 つもありません。ディスパッチャーが起動したタスクのワーカーは `HERMES_KANBAN_TASK` が設定されているのでタスクの範囲のツールを得ますし、取りまとめ役のプロファイルは設定を通してより広い振り分けの手段を得ます。カンバンに触れない人にツールが増えることはありません。

自動で差し込まれるカンバンの案内が、どのツールをいつどの順で呼ぶかをモデルに教えます。これが差し込まれるのは、そのタスクを持つ、ディスパッチャーが起動したワーカーだけです。`kanban` のツール群を有効にしているだけの対話セッションは、ツールは持ちますが「1 つのタスクが割り当てられた」とは教えられません。またワーカーの中から起動された `delegate_task` の子や cron の実行は — ワーカーの `HERMES_KANBAN_TASK` を引き継ぎますが — ワーカーの手順を受け取ることも、自分のやり取りの予算が尽きたときにワーカーのカードへ終了の結果を記録することもありません。

### 受け渡しに残すとよい証拠 {#recommended-handoff-evidence}

`kanban_complete(summary=..., metadata={...})` は意図して柔軟にしてあります。
summary は人が読む締めくくりで、`metadata` は下流のエージェント、レビュー担当、
ダッシュボードが、文章をかき集めずに再利用できる機械向けの受け渡しです。

開発とレビューのタスクでは、次の形の metadata をおすすめします（任意です）。

```json
{
  "changed_files": ["path/to/file.py"],
  "verification": ["pytest tests/hermes_cli/test_kanban_db.py -q"],
  "dependencies": ["parent task id or external issue, if any"],
  "blocked_reason": null,
  "retry_notes": "what failed before, if this was a retry",
  "residual_risk": ["what was not tested or still needs human review"]
}
```

これらのキーは取り決めであって、スキーマ上の要求ではありません。大事なのは、
どのワーカーも、次に読む人が 4 つの問いにすぐ答えられるだけの証拠を残す、という
性質のほうです。

1. 何が変わったのか。
2. どうやって確かめたのか。
3. これが失敗したとき、何があれば解除や再試行ができるのか。
4. どんなリスクを意図して残したのか。

秘密の情報、生のログ、トークン、OAuth の材料、関係のないやり取りの記録は
`metadata` に入れないでください。代わりに参照先と要約を置きます。ファイルや
テストのないタスクなら、`summary` でそのことをはっきり書き、`metadata` には
実際にある証拠（出典の URL、課題の id、手作業での確認の手順など）を入れてください。

### ワーカーのライフサイクル {#the-worker-lifecycle}

カンバンのタスクに取り組むプロファイルは、すべて自動でワーカーのライフサイクルを受け取ります。起動時にワーカーのシステムプロンプトへ差し込まれるので（`KANBAN_GUIDANCE` のブロック）、**入れるものも設定するものもありません**。CLI のコマンドではなく **ツール呼び出し**で、ライフサイクルの全体をワーカーに教えます。

1. 起動したら `kanban_show()` を呼び、タイトル + 本文 + 親からの受け渡し + 過去の試み + コメントのつながり全体を読みます。
2. （端末のツールで）`cd $HERMES_KANBAN_WORKSPACE` して、そこで作業します。
3. 長い処理の間は数分おきに `kanban_heartbeat(note="...")` を呼びます。**作業が 1 時間を超えそうなら、少なくとも 1 時間に 1 回は `kanban_heartbeat` を呼んでください。** ディスパッチャーは、`kanban.dispatch_stale_timeout_seconds`（既定 4 時間）を超えて実行中で、直近 1 時間に鼓動のないタスクを、ワーカーが片付けをせずに落ちたとみなして回収します。回収そのものは害のない処理ですが（失敗の数え上げなしに `ready` へ戻って再度振り分けられます）、いま進めている実行の成果は失われます。
4. `kanban_complete(summary="...", metadata={...})` で完了するか、`kanban_request_review(summary="...")` でコードの変更を同じカードのレビューへ渡すか、行き詰まったら `kanban_block(reason="...")` を呼びます。

ふつうのツールの動きも、取り掛かりを自動で延長します（ワーカーは、プロセス内で生きていることを 1 分に 1 回ほど盤へ映します）。この橋渡しが効くのは、ディスパッチャー自身が起動したプロセスだけです。`HERMES_KANBAN_TASK` の隣に `HERMES_DELEGATED_CHILD_CONTEXT` を持つプロセス（`delegate_task` の子孫や、ワーカーの環境を手で真似て起動したもの）は盤から隔てられます。自動の鼓動は `kanban auto-heartbeat for task … refused` という警告を 1 回記録し、`kanban_complete` / `kanban_request_review` は拒否されます。目印を環境変数から消すのではなく、起動のしかたを直してください（ディスパッチャーにワーカーを起動させてください）。

その最後の盤への呼び出し（`kanban_complete` / `kanban_request_review` /
`kanban_block`。レビュー担当は `kanban_complete` か `kanban_request_changes` で終えます）は、
ワーカーの
手順の一部です。タスクがまだ `running` のままワーカーのプロセスが状態 0 で
終了した場合、ディスパッチャーはそれを手順違反とみなし、
`protocol_violation` イベントを出します。そのため、やり取りに失敗した
ディスパッチャー起動のワーカーは 0 以外で終了します。ふつうの失敗なら `1`、
プロバイダーがレート制限や過負荷、5xx、時間切れだったとき、あるいは請求や
利用枠の壁に当たったときは `75`（`EX_TEMPFAIL`）です。後者ではディスパッチャーが
その実行を `rate_limited` として記録し、失敗として数えずにタスクを待ち行列へ
戻すので、利用枠の時間帯が手順違反として記録されることはありません。そして
再試行では直せないものをプロバイダーが拒否したときは `78`（`EX_CONFIG`）です。
プロファイルの資格情報（401/403、失効または無効なキー）、モデル（404 / モデルが
見つからない）、TLS の連鎖がこれに当たります。この**終端のプロバイダーエラー**は、
最初の 1 回でサーキットブレーカーを落とします。ディスパッチャーはその実行を
`exit_kind: terminal_provider` 付きの `crashed` として記録し、`terminal_provider: true`
付きの `gave_up` を出し、プロバイダー自身の言葉を `last_failure_error` に入れて
カードを `blocked` に置きます（貼り付いた状態で、`recompute_ready` が自動で
再開させることはありません）。`kanban.failure_limit` / `max_retries` を使い切る
まで同じ壁に向かって起動し直す代わりの扱いです。どちらの流れでも記録は同じで、
失効したキーで死んだレビュー担当のワーカーも、実装者とまったく同じようにカードを
置きます。`hermes kanban show` では*このプロファイルの資格情報かモデルを
プロバイダーが拒否した — 1 回の試行でブロック*として表示されます。担当者の
プロファイルのプロバイダーを直し（`hermes -p <profile> auth` / `setup`）、
そのあと `hermes kanban unblock <id>` を実行してください。ワーカーは自分の
終了コードを自分のログの最終行にも書きます（`[kanban-worker-exit] rc=<code>`）。
そのため、まわりごとに動く `hermes kanban dispatch` のプロセス — ワーカーを
回収しておらず終了状態を読めません — でも、ゲートウェイ組み込みの
ディスパッチャーと同じように同じ死に方を記録できます。その行に届く前に
止められたワーカーは、素の `crashed`（`pid <n> not alive`）です。

**エージェント側での予防:** ワーカーが終了する前に、盤の最後のツール呼び出しを
せずに止まろうとしていることを検知すると、Hermes は合成した促しを最大 2 回
差し込みます。モデルが次の一手を語って（「では報告書を書きます」）
`finish_reason=stop` で止まる、というよくある場面を捕まえるためです。促しは、
すぐに `kanban_complete`、`kanban_request_review`、`kanban_block` のどれかを
呼ぶようモデルに思い出させます。すでにカードを渡したワーカー
（`kanban_request_review`、あるいはレビュー担当からの `kanban_request_changes`）が
促されることはありません。その受け渡しが最後の呼び出しであり、レビュー中の
カードを `kanban_complete` するよう促すことは決してありません。この守りが効くのは
ディスパッチャーが起動したワーカー自身のときだけで（`HERMES_KANBAN_TASK` が
設定されていて、その実行がそのタスクを持っている場合）— ワーカーの中で動く
`delegate_task` の子や cron のジョブは、この変数を引き継ぎますが盤のツールを
持たないので促されません — `HERMES_KANBAN_STOP_NUDGE=0` で無効にできます。

**ディスパッチャー側での回復:** 促しを使い切ったか、促しに届く前にワーカーが
落ちた場合、ディスパッチャーは違反に**回数を区切った再試行**を与え
（連続の違反が `_PROTOCOL_VIOLATION_FAILURE_LIMIT` 回、既定 3 回まで）、
同じループへ起動し直す代わりにタスクを自動でブロックします。この予算が数えるのは
*連続した*きれいな終了による手順違反だけで、間にレート制限による待ち行列への
戻りが挟まっても影響せず、他の種類の失敗が入れば連続は切れます。タスクごとの
`max_retries` はこの上限を上書きします。この予算でブロックされたカードは、
`hermes kanban unblock <id>` を実行するまでブロックのままです（`failure_limit`
未満の遮断機によるブロックのように自動で昇格しません）。この操作は新しい再試行の
予算も与えます。たいていの場合これは、
モデルが素のテキストで答えを書き、カンバンのツールを使わずに終了したという
ことです。

ライフサイクルと、要となる早見の情報（作業場所の種類、成果物の `artifacts`、作ったカードの取り掛かり）は、そのシステムプロンプトのブロックに入って届きます。どのプロファイルで動いていてもすべてのワーカーがそれを持つので、プロファイルごとにスキルを用意する必要はありません。

**ワーカーのセッション名。** ワーカーのセッションには、起動時にそのカードにちなんだ名前が付きます（`Fix the swap modal`、盤の行が読めないときは `Kanban task <id>`）。そのため `hermes sessions` やセッションの検索では、モデルの当て推量ではなくカードが見えます。ワーカーは、対話セッションに名前を付ける補助の `title_generation` のモデル呼び出しをしません。ワーカーのセッションで手動の `/title` を使えば、そちらが優先されます。

### 特定のタスクに追加のスキルを付ける {#pinning-extra-skills-to-a-specific-task}

あるタスクにだけ、担当のプロファイルがふだん持っていない専門の知識が要ることがあります。`translation` のスキルが要る翻訳の仕事、`github-code-review` が要るレビューの作業、`security-pr-audit` が要るセキュリティの監査などです。そのたびに担当のプロファイルを編集するのではなく、スキルをタスクに直接付けてください。

**取りまとめ役のエージェントから**（1 つのエージェントが別のエージェントへ作業を振り分ける、いつもの場面）は、`kanban_create` ツールの `skills` の配列を使います。

```
kanban_create(
    title="translate README to Japanese",
    assignee="linguist",
    skills=["translation"],
)

kanban_create(
    title="audit auth flow",
    assignee="reviewer",
    skills=["security-pr-audit", "github-code-review"],
)
```

**人から（CLI / スラッシュコマンド）**は、`--skill` をそれぞれ繰り返します。

```bash
hermes kanban create "translate README to Japanese" \
    --assignee linguist \
    --skill translation

hermes kanban create "audit auth flow" \
    --assignee reviewer \
    --skill security-pr-audit \
    --skill github-code-review
```

**ダッシュボードから**は、タスク作成の画面の **skills** の欄にスキルをカンマ区切りで入力します。

ディスパッチャーは挙げられたスキルごとに `--skills <name>` のフラグを 1 つずつ出すので、ワーカーは自動で差し込まれるカンバンの案内に加えて、それらをすべて読み込んだ状態で起動します。スキル名は、担当者のプロファイルに実際に入っているスキルと一致している必要があります（何が使えるかは `hermes skills list` で確認してください）。実行時に導入されることはありません。

### タスクごとのモデルの上書き {#per-task-model-override}

担当のプロファイルの既定とは別に、そのタスクのワーカーを特定のモデル（必要ならプロバイダーも）に固定できます。

```bash
# At creation
hermes kanban create "hard refactor" --assignee coder \
    --model claude-opus-4.6 --provider anthropic

# Or later — takes effect on the next dispatch
hermes kanban set-model t_abcd claude-opus-4.6 --provider anthropic
hermes kanban set-model t_abcd none    # clear the override
```

ディスパッチャーは、固定されたモデルでワーカーを起動します（設定されていれば `--provider <name>` も渡します。`--provider` にはモデルの指定が必要です）。ダッシュボードのタスクごとのモデルのドロップダウンも、同じ `model_override` の項目を動かします。上書きがなければ、ワーカーは自分のプロファイルに設定されたモデルを使います。

### 費用の考え方: 取りまとめ役は最上位、ワーカーは安く {#cost-strategy-frontier-orchestrator-inexpensive-workers}

カンバンのプロファイルごとの設定は、計画役とワーカーで費用を分けるのに向いています。プロジェクトを適切な大きさのカードへ分解するには最上位の判断力が要りますが、目的と文脈と受け渡しの証拠をすでに持っているカードを実行するのに、ふつうそこまでは要りません。そしてトークンの大半を使うのはワーカーのほうなので、費用が乗るのはワーカーのモデルです。取りまとめ役 / ディスパッチャーのプロファイルは最上位のモデルで動かし、ワーカーのプロファイルは安いモデルに向けてください。プロファイルはそれぞれ `~/.hermes/profiles/<name>/` の下に自分の `config.yaml` を持ち、ディスパッチャーは `hermes -p <assignee>` を起動するときにプロファイルごとの `HERMES_HOME` を差し込むので、各ワーカーは自分のプロファイルのモデル設定を読みます。

```yaml
# ~/.hermes/config.yaml (orchestrator / dispatcher profile)
model:
  default: "your-frontier-model"

# ~/.hermes/profiles/coder/config.yaml (worker profile)
model:
  default: "your-inexpensive-model"

# ~/.hermes/profiles/researcher/config.yaml (another worker profile)
model:
  default: "your-inexpensive-model"
```

たまに品質が要るカードだけは、[タスクごとのモデルの上書き](#per-task-model-override)（作成時の `--model`/`--provider`、あとからの `hermes kanban set-model`、ダッシュボードのモデルのドロップダウン）で、そのタスクだけ強いモデルに戻せます。プロファイルを編集する必要はありません。

### ライフサイクルのプラグインフック {#lifecycle-plugin-hooks}

盤の遷移は [プラグインフック](/hermes/docs/user-guide/features/hooks/#plugin-hooks) を発火させます。`kanban_task_claimed`、`kanban_task_completed`、`kanban_task_blocked` で、それぞれ `task_id` と `profile_name` を運びます。フックが動くのは盤の DB の変更が確定した**あと**なので、コールバックは必ず確定した状態を見ます。プロセスの分かれ方に注意してください。`kanban_task_claimed` は**ディスパッチャー**のプロセスで、`kanban_task_completed`/`kanban_task_blocked` は**ワーカー**のプロセスで発火します。すべての遷移を一か所で見たいなら、ディスパッチャーのプロファイルにフックを登録してください。

```python
def register(ctx):
    def on_blocked(task_id=None, profile_name=None, **kw):
        ctx.dispatch_tool("terminal", {"command": f"notify-send 'kanban blocked: {task_id}'"})
    ctx.register_hook("kanban_task_blocked", on_blocked)
```

### 目標モードのカード（`--goal`） {#goal-mode-cards---goal}

既定では、ワーカーは自分のカードに**一度だけ**取り組みます。作業して、`kanban_complete`/`kanban_block` を呼んで、終了です。`--goal`（CLI）または `goal_mode=True`（`kanban_create` ツール / ダッシュボード）を渡すと、代わりにそのワーカーを**目標のループ**で動かせます。`/goal` のスラッシュコマンドの背後にあるのと同じ、Ralph 方式の仕組みです。やり取りのたびに補助の判定役がワーカーの出力をカードのタイトル + 本文（受け入れの条件として扱われます）と突き合わせ、作業が終わっていなくて — やり取りの予算が残っていれば — 判定役が納得するか、ワーカー自身がタスクを終えるか、予算が尽きるまで、**同じセッションの中で**ワーカーが続けます（予算が尽きた場合は、黙って終了するのではなくカードを**ブロック**して人のレビューを求めます）。判定役が、書かれたままではその目標は**達成不能**だと判断した場合、カードはその理由とともにすぐブロックされます。無理なカードが完了扱いになることはなく、そうしたカードへの `kanban complete` / `kanban request-review` は、`kanban block` か範囲の見直しを示して拒否されます。

```bash
hermes kanban create "Translate the docs site to French" \
    --body "Acceptance: every page translated, no English left, links intact." \
    --assignee linguist \
    --goal \
    --goal-max-turns 15      # optional; default 20
```

終わりの決まっていない作業、多段階の作業、「X になるまで続ける」型のカードに使ってください。安く一度で済む作業には使わないでください。やり取りごとの判定の負担に見合いませんし、ディスパッチャーの既存の再試行とサーキットブレーカーが、一時的なワーカーの失敗をすでに扱っています。判定役の質は目標の文章の質までなので、本文は**はっきりした受け入れの条件**として書いてください。

`kanban complete` / `kanban request-review`（および対応する `kanban_complete` / `kanban_request_review` のツール）に対する判定の関門は、**実際の判定**があったときにだけ拒否します。判定の呼び出し自体が失敗した場合 — 中継のエラー、認証、時間切れ — 受け渡しは許可され、`goal judge unreachable … allowing lifecycle handoff` という警告がログに残ります。届かない判定役が人の承認を妨げることはありません。画面のない CLI の関門は、`specify`/`decompose` と同じタスクごとの中継の結びつけのキー（`kanban:<task-id>`）を送るので、セッションのキーを要求する中継でも判定の要求を受け付けます。

目標モードのワーカーの **Worker log**（ダッシュボードの引き出し、`hermes kanban log <id>`）には、他のワーカーと同じ実況のツールの流れに加えて、判定されたやり取りごとに `kanban goal loop: turn N/M verdict=…` の行が 1 つ入るので、カードが動いている間もループの様子を追えます。

:::note 目標モードのカードは `/goal` の仕組みを借りているだけで、つながってはいません
`--goal` は、継続のループを*そのカード 1 枚のワーカーのセッションの中で*動かします。共有しているのは [`/goal` スラッシュコマンド](/hermes/docs/user-guide/features/goals/) と同じ仕組みであって、状態ではありません。チャットのセッションで `/goal` を設定しても、カンバンのカードが作られたり、取り掛かられたり、動いたりすることはありませんし、目標モードのカードのループは、どのチャットのセッションの `/goal status` からも見えません。いまの会話に反復を続けさせたいなら [`/goal`](/hermes/docs/user-guide/features/goals/) を、盤の上の作業がほしいならカードを作ってください。
:::

### 取りまとめ役はどう振る舞うか {#how-the-orchestrator-behaves}

**行儀のよい取りまとめ役は、自分では作業しません。** 利用者の目的をタスクへ分解し、つなぎ、それぞれをあなたが用意したプロファイルのどれかに割り当てて、退きます。取りまとめ役への案内 — 手を出したくなる誘惑への戒め、手順 0 としてのプロファイルの確認（ディスパッチャーは知らない担当者名では黙って失敗するので、取りまとめ役はすべてのカードを、あなたの機械に実在するプロファイルに結びつけなければなりません）、`kanban_create` / `kanban_link` / `kanban_comment` を軸にした分解の手引き — は、ワーカーのシステムプロンプトへ自動で差し込まれます。入れるものはありません。

代表的な取りまとめ役のやり取り（2 人の並列の調査役が書き手へ引き渡す形）:

```
# Goal from user: "draft a launch post on the ICP funding landscape"
kanban_create(title="research ICP funding, NA angle",  assignee="researcher-a", body="…")  # → t_r1
kanban_create(title="research ICP funding, EU angle",  assignee="researcher-b", body="…")  # → t_r2
kanban_create(
    title="synthesize ICP funding research into launch post draft",
    assignee="writer",
    parents=["t_r1", "t_r2"],        # promoted to 'ready' when both researchers complete
    body="one-pager, neutral tone, cite sources inline",
)                                     # → t_w1
# Optional: add cross-cutting deps discovered later without re-creating tasks
kanban_link(parent_id="t_r1", child_id="t_followup")
kanban_complete(
    summary="decomposed into 2 parallel research tasks → 1 synthesis task; writer starts when both researchers finish",
)
```

取りまとめ役への案内はワーカーのシステムプロンプトに自動で入ります。プロファイルごとに入れたり同期したりするものはありません。

**展開する前に決めておく。** 設計上の判断は取りまとめ役のもので、ワーカーのものではありません。並列の 2 枚のカードが同じもの — 命名の方式、スキーマ、ファイル形式、API の形 — をそれぞれ選ばなければならないなら、取りまとめ役が一度決めて、その決定を**両方**のカードの本文に書き込んでください。ワーカーは兄弟のカードを見られないので、子のカードの本文は、それが依存するすべての決定を自分で持っている必要があります。例: 「書き出し側を作る」と「読み込み側を作る」という並列のカードでは、それぞれのワーカーに勝手なファイル形式を考えさせないでください。先に 1 つ決めて（たとえば `version` の項目を持つ改行区切りの JSON）、両方の本文に書いてください。さもないと、2 つの半分がかみ合うことはありません。

うまく使うには、ツール群を盤の操作（`kanban`、`gateway`、`memory`）に絞ったプロファイルと組み合わせてください。そうすれば取りまとめ役は、やろうとしても実装の作業を実行できません。

## ダッシュボード（GUI） {#dashboard-gui}

`/kanban` の CLI とスラッシュコマンドがあれば画面なしで盤を回せますが、人が関わる場面 — 仕分け、プロファイルをまたいだ監督、コメントのつながりを読むこと、カードを列の間で動かすこと — には、目に見える盤のほうが適した入口であることがよくあります。Hermes はこれを `plugins/kanban/` にある**同梱のダッシュボードのプラグイン**として提供しています。中核の機能でも、別のサービスでもなく、[ダッシュボードの拡張](/hermes/docs/user-guide/features/extending-the-dashboard/) で示されている形に沿っています。

次のように開きます。

```bash
hermes kanban init      # one-time: create kanban.db if not already present
hermes dashboard        # "Kanban" tab appears in the nav, after "Skills"
```

### プラグインでできること {#what-the-plugin-gives-you}

- 状態ごとに 1 列を並べた **Kanban** のタブ: `triage`、`todo`、`ready`、`running`、`blocked`、`done`（切り替えを入れると `archived` も）。
  - 待ち行列の列は、振り分けの順（優先度、次に古い順 — 一番上のカードが次に起動されます）でカードを並べます。`done` の列は履歴なので、完了の新しい順に並びます。CLI では `hermes kanban list --status done --sort completed-desc` が同じ順になります。
  - `triage` は、まだ粗い思いつきを置いておく列です。既定（`kanban.auto_decompose: true`）では、ディスパッチャーがここに来たタスクに対して**分解役**を自動で走らせます。組み込みの分解役は `auxiliary.kanban_decomposer` のモデルの経路を使い、あなたのプロファイルの顔ぶれ（説明付き）を読んで、タスクを、最も適した専門家へ振り分けられた子のタスクの小さなグラフへ展開します。元のタスクはすべての子の親として残るので、すべてが終わったときに、その担当者（`kanban.orchestrator_profile`、なければタスクがすでに持っていた担当者、それもなければ現在の既定プロファイル）が目を覚まして完了を判定します。ページ上部の **Orchestration: Auto/Manual** の切り替え（緑 = Auto、くすんだ灰色 = Manual）で、あるいは `config.yaml` を直接編集して切り替えます。どちらのモードも `hermes kanban specify` と共存します。展開したくないときの、1 タスクだけの仕様の書き直しとして、こちらは変わらず使えます。
- カードには、タスクの id、タイトル、優先度のバッジ、テナントのタグ、割り当てられたプロファイル、コメント / リンクの数、**進捗の表示**（依存する子がある場合に完了した子の `N/M`）、「created N ago」が並びます。カードごとのチェックボックスで複数選択ができます。
- **Running の中のプロファイルごとのレーン** — ツールバーのチェックボックスで、Running の列を担当者ごとに小分けにできます。
- **WebSocket による即時の更新** — プラグインは追記だけの `task_events` のテーブルを短い間隔で追いかけます。どのプロファイル（CLI、ゲートウェイ、別のダッシュボードのタブ）が動いても、盤はすぐその変化を映します。読み直しはまとめられるので、イベントが連続しても取得は 1 回です。
- 列の間でカードを**ドラッグ&ドロップ**して状態を変えられます。ドロップは `PATCH /api/plugins/kanban/tasks/:id` を送り、CLI と同じ `kanban_db` のコードを通ります。3 つの入口がずれることはありません。破壊的な状態（`done`、`archived`、`blocked`）への移動は確認を求めます。タッチ機器ではポインター方式の代替が働くので、タブレットからでも操作できます。
- **タスク作成の画面** — どの列の見出しでも `+` をクリックすると、ラベル付きの項目を持つ画面が開きます。タイトル、担当者、優先度、スキル、作業場所の種類 / パス（盤のプロジェクトのディレクトリから初期値が入り、タスクごとに上書きできます）、目標モード、そして（任意で）既存のすべてのタスクから選ぶ親のタスクです。Enter でタスクを作成、Shift+Enter でタイトルの欄に改行を挿入、Escape で取り消しです。Triage の列から作ると、新しいタスクは自動で triage に置かれます。
- **複数選択と一括操作** — shift / ctrl を押しながらカードをクリックするか、チェックボックスを入れると選択に加わります。上部に一括操作のバーが現れ、まとめての状態の変更、アーカイブ、担当の付け替え（プロファイルのドロップダウン、または「(unassign)」）ができます。破壊的なまとめての操作は先に確認します。id ごとの一部の失敗は、残りを中断せずに報告されます。
- （shift / ctrl なしで）**カードをクリック**すると、横から引き出しが開きます（Escape か外側のクリックで閉じます）。中身は次のとおりです。
  - **編集できるタイトル** — 見出しをクリックすると名前を変えられます。
  - **編集できる担当者 / 優先度** — 情報の行をクリックすると書き換えられます。
  - **編集できる説明** — 既定では markdown として表示されます（見出し、太字、斜体、インラインのコード、コードブロック、`http(s)` / `mailto:` のリンク、箇条書き）。「edit」のボタンで入力欄に切り替わります。markdown の表示は小さく、XSS に強い描画です。すべての置換は HTML をエスケープした入力に対して行われ、通るリンクは `http(s)` / `mailto:` だけで、`target="_blank"` + `rel="noopener noreferrer"` が必ず付きます。
  - **依存の編集** — 親と子をチップの並びで表示し、それぞれ `×` で切り離せます。加えて、他のすべてのタスクから新しい親や子を選ぶドロップダウンがあります。循環になる操作はサーバー側で、分かりやすいメッセージとともに拒否されます。
  - **状態の操作の行**（→ triage / → ready / → running / block / unblock / complete / archive）。破壊的な遷移には確認が入ります。**Triage** の列のカードでは、この行に LLM を使う操作も 2 つ現れます。**⚗ Decompose** はタスクを、説明をもとに専門のプロファイルへ振り分けた子のタスクのグラフへ展開し、**✨ Specify** は 1 タスクだけの仕様の書き直しをします。LLM が展開の意味がないと判断した場合、Decompose は specify と同じ昇格に切り替わるので、厳密に上位互換です。どちらも CLI（`hermes kanban decompose <id>` / `specify <id>` / `--all`）から、どのゲートウェイのプラットフォーム（`/kanban decompose <id>`）から、そしてプログラムからは `POST /api/plugins/kanban/tasks/:id/decompose` と `…/specify` で使えます。モデルは `config.yaml` の `auxiliary.kanban_decomposer` と `auxiliary.triage_specifier` で設定します。
  - 結果の節（こちらも markdown として表示されます）、Enter で送信できるコメントのつながり、直近 20 件のイベント。
- **ツールバーの絞り込み** — 自由記述の検索、テナントのドロップダウン（`config.yaml` の `dashboard.kanban.default_tenant` が初期値）、担当者のドロップダウン、「show archived」の切り替え、「lanes by profile」の切り替え、そして次の 60 秒のまわりを待たずに済む **Nudge dispatcher** のボタン。

見た目としては、見慣れた Linear / Fusion の配置を目指しています。暗い配色、件数付きの列の見出し、色分けされた状態の点、優先度とテナントのチップです。プラグインはテーマの CSS 変数（`--color-*`、`--radius`、`--font-mono` など）だけを読むので、どのダッシュボードのテーマが有効でも自動でなじみます。

### 自動と手動の取りまとめ {#auto-vs-manual-orchestration}

カンバンの盤には、Triage の列に置いたタスクの扱い方が 2 通りあります。

**自動（既定）** — `kanban.auto_decompose: true`。ゲートウェイ組み込みのディスパッチャーが、まわりごとに**分解役**を走らせます。`kanban.auto_decompose_per_tick`（既定は 1 まわりあたり 3 タスク）で上限が付くので、仕分けのタスクを大量に入れても補助の LLM を一気に使い切ることはありません。分解役は組み込みの分解のプロンプトと `auxiliary.kanban_decomposer` のモデルの経路を使い、導入済みのプロファイルとその説明を読んで、LLM に JSON のタスクのグラフを作らせます。どのタスクを起こすか、誰に渡すか、どれがどれに依存するかです。元の仕分けのタスクはグラフのすべての葉の親になるので、グラフ全体が終わるまで残り、そのあと `ready` に戻って、その担当者（`kanban.orchestrator_profile`、なければタスクがすでに持っていた担当者、それもなければ現在の既定プロファイル）が完了を判定し、作業が終わっていなければタスクを足せます。「一言だけ置いて、あとは任せる」という流れです。

組み込みの展開が終わると、その子のグラフとともに不可分に記録されます。その根を
Triage へ戻しても、別のグラフが作られることはありません。ふつうの前提条件の
リンクが、タスクの最初の分解を妨げることもありません。完了の目印は、タスクが
削除されるまでイベントの保持期間を越えて残ります。これは、別々に作られた手動の
グラフを意味で重複排除するものではありませんし、以前に刈り取られた履歴を直すもの
でもありません。

新しいタスクがテナントを持たない場合、作成時に、親のうち最初に空でない
テナントを、渡された順で引き継ぎます。明示的なテナント（ツールが渡す
ワーカーの現在のテナントを含みます）が優先されます。強い隔離の境界は、
変わらず盤のほうです。

**手動** — `kanban.auto_decompose: false`。仕分けのタスクは、あなたが動くまで triage に留まります。カードの **⚗ Decompose** のボタンをクリックするか、`hermes kanban decompose <id>`（または `--all`）を実行するか、チャットから `/kanban decompose <id>` を使ってください。これは分解役が入る前の盤の振る舞いと同じで、何をいつ走らせるかを完全に握りたいときに向いています。

**重要な境界:** 手動モードが止めるのは、組み込みの Triage の分解役だけです。プロファイルが `kanban_create` を呼ぶことを妨げませんし、作成元のセッションの起き上がりを止めることもありません。`kanban.auto_subscribe_on_create: true` の場合、タスクの終了のイベントが、合成された状態のやり取りとともに作成元のエージェントを再開させるので、受け渡しを確かめて、本当に新しい追加作業が必要かどうかを判断できます。タスクの完了を受け身のままにしたいときは `auto_subscribe_on_create: false` にしてください。出どころを示すため、組み込みの分解役の子は `created_by=auto-decomposer` を持ち、再開したプロファイルが作ったタスクは代わりにそのプロファイル名を持ちます。

2 つのモードは、カンバンのページ上部の **Orchestration: Auto/Manual** の切り替え（緑 = Auto、くすんだ灰色 = Manual）で、あるいは `config.yaml` を直接編集して行き来できます。どちらのモードも `hermes kanban specify` と共存します。展開したくないときの、1 タスクだけの仕様の書き直しとして、こちらは変わらず使えます。

分解役の振り分けの判断はプロファイルの説明に依存します。これはプロファイルごとのラベル付けの部品で、`hermes profile create --description "..."`、`hermes profile describe <name> --text "..."`、`hermes profile describe <name> --auto`（プロファイルの導入済みスキルとモデルから LLM が生成します）、あるいはダッシュボードの **Orchestration settings** を広げたところにあるプロファイルごとの編集画面で設定します。説明のないプロファイルも顔ぶれには出てきます。名前で振り分けられますが、精度は落ちます。分解役が `assignee=None` の子のタスクを置くことは決してありません。LLM が知らないプロファイルを選んだ場合、子は `kanban.default_assignee` へ、なければ根のタスクの担当者（それが実在するプロファイル名なら）へ、それもなければ現在の既定プロファイルへ振り分けられます。

`kanban.orchestrator_profile` は、そのプロファイルのプロンプト、スキル、独自の処理を分解の呼び出しへ読み込むものではありません。展開のあとに根 / 取りまとめのタスクを誰が持つかを決めるものです。分解役のモデル / プロバイダーを変えたい場合は `auxiliary.kanban_decomposer` を設定してください。組み込みの分解役の代わりにプロファイル独自のタスク分割の処理を使いたい場合は、手動モードに切り替えて、そのプロファイルに明示的にタスクを作らせるか分解させてください。

設定の項目（すべて `~/.hermes/config.yaml` の `kanban:` の下）:

| キー | 既定値 | 用途 |
|---|---|---|
| `auto_decompose` | `true` | ディスパッチャーが、まわりごとに Triage のタスクへ組み込みの分解役を自動で走らせます。プロファイルが動かす `kanban_create` の呼び出しや、作成元の起き上がりのやり取りを止めるものではありません。 |
| `auto_decompose_per_tick` | `3` | ディスパッチャーの 1 まわりあたりの分解の上限。あふれた分は次のまわりに回ります。 |
| `orchestrator_profile` | `""` | 分解のあとに根 / 取りまとめのタスクへ割り当てられるプロファイル。空にすると、根のタスクは自分の担当者を保ち、それもなければ現在の既定プロファイルになります。 |
| `default_assignee` | `""` | LLM が知らないプロファイルを選んだとき、子のタスクが行き着く先。空にすると根のタスクの担当者へ、それもなければ現在の既定へ落ちます。 |
| `auto_subscribe_on_create` | `true` | `kanban_create` が常駐のゲートウェイ / TUI のセッションの中で走ったとき、終了のイベントが合成された状態のやり取りとともに作成元のエージェントを再開させます。受け身の完了にしたい場合や、明示的な `kanban_notify-subscribe` の呼び出しを必須にしたい場合は `false` にします。`auto_decompose` とは独立です。 |
| `notify_in_gateway` | `true` | このゲートウェイからカンバンの購読を確認して配信します。通知の購読を持たないプロファイルでは `false` にすると、5 秒ごとの空回りの確認を止められます。`dispatch_in_gateway` とは独立で、振り分けをしないゲートウェイでもプロファイル固有の配信のアダプターを持てます。 |
| `done_sub_retention_days` | `30` | 通知の購読は `done` を越えて残り（再開に耐えます）、`archived` で削除されます。通知の掃除は、タスクが `done` か `blocked` のまま新しいイベントなしにこの日数を過ぎた購読を取り除き、アーカイブしない盤で購読の表が膨らみ続けるのを抑えます。`0` にすると掃除を止めます。 |

そして補助の LLM の枠が 2 つあります。

| キー | 用途 |
|---|---|
| `auxiliary.kanban_decomposer` | タスクのグラフを作るモデル（Decompose が呼びます）。主のチャットのモデルを上書きするには `provider`/`model` を設定します。 |
| `auxiliary.profile_describer` | プロファイルの説明を自動生成するモデル（`hermes profile describe --auto` が呼びます）。 |

### 構造 {#architecture}

GUI は厳密に **DB から読み、kanban_db を通して書く**層で、それ自体に業務の処理は持ちません。

<!-- ascii-guard-ignore -->
```
┌────────────────────────┐      WebSocket (tails task_events)
│   React SPA (plugin)   │ ◀──────────────────────────────────┐
│   HTML5 drag-and-drop  │                                    │
└──────────┬─────────────┘                                    │
           │ REST over fetchJSON                              │
           ▼                                                  │
┌────────────────────────┐     writes call kanban_db.*        │
│  FastAPI router        │     directly — same code path      │
│  plugins/kanban/       │     the CLI /kanban verbs use      │
│  dashboard/plugin_api.py                                    │
└──────────┬─────────────┘                                    │
           │                                                  │
           ▼                                                  │
┌────────────────────────┐                                    │
│  ~/.hermes/kanban.db   │ ───── append task_events ──────────┘
│  (WAL, shared)         │
└────────────────────────┘
```
<!-- ascii-guard-ignore-end -->

### REST の窓口 {#rest-surface}

すべての経路は `/api/plugins/kanban/` の下に置かれ、ダッシュボードの一時的なセッションのトークンで守られています。

| メソッド | パス | 用途 |
|---|---|---|
| `GET` | `/board?tenant=<name>&include_archived=…` | 状態の列でまとめた盤の全体と、絞り込み用のテナント + 担当者の一覧 |
| `GET` | `/tasks/:id` | タスク + コメント + イベント + リンク |
| `POST` | `/tasks` | 作成（`kanban_db.create_task` を包み、`triage: bool` と `parents: [id, …]` を受け取ります） |
| `PATCH` | `/tasks/:id` | 状態 / 担当者 / 優先度 / タイトル / 本文 / 結果 |
| `POST` | `/tasks/bulk` | 同じ変更（状態 / アーカイブ / 担当者 / 優先度）を `ids` のすべての id に適用します。id ごとの失敗は、他を中断せずに報告されます |
| `POST` | `/tasks/:id/comments` | コメントを書き足す |
| `POST` | `/tasks/:id/specify` | 仕分けの仕様化を走らせます。補助の LLM がタスクの本文を肉付けし、`triage` から `todo` へ昇格させます。`{ok, task_id, reason, new_title}` を返します。「triage にない」/ 補助のクライアントがない / LLM のエラーの場合は、人が読める理由を添えた `ok=false` を 200 で返します（4xx ではありません） |
| `POST` | `/tasks/:id/decompose` | カンバンの分解役を走らせます。補助の LLM がタスクのグラフを作り、補助の処理が不可分に子を作り、根をつなぎ、`triage → todo` へ切り替えます。`{ok, task_id, reason, fanout, child_ids, new_title}` を返します。LLM のエラーでも 200 を返す点は `/specify` と同じです。 |
| `GET` | `/profiles` | 導入済みのプロファイルを説明付きで並べます（ダッシュボードのプロファイルの説明の編集画面と、取りまとめ役の選択で使われます）。 |
| `PATCH` | `/profiles/:name` | プロファイルの説明を設定または消去します（人が書いたもの — `description_auto: false`）。`{ok, profile, description}` を返します。 |
| `POST` | `/profiles/:name/describe-auto` | `auxiliary.profile_describer` でプロファイルの説明を生成します。`description_auto: true` として保存されるので、ダッシュボードが「要確認」のバッジを出せます。 |
| `GET` | `/orchestration` | カンバンの取りまとめの設定（`orchestrator_profile`、`default_assignee`、`auto_decompose`）と、予備の値まで含めて*解決された*実効値を読みます。 |
| `PUT` | `/orchestration` | `config.yaml` にある取りまとめの 3 つのキーのうち 1 つ以上を更新します。空でないプロファイル名が実在するかを検証します。 |
| `POST` | `/links` | 依存を追加します（`parent_id` → `child_id`） |
| `DELETE` | `/links?parent_id=…&child_id=…` | 依存を取り除きます |
| `POST` | `/dispatch?max=…&dry_run=…` | ディスパッチャーを促します — 60 秒の待ちを飛ばします |
| `GET` | `/config` | `config.yaml` から `dashboard.kanban` の設定を読みます — `default_tenant`、`lane_by_profile`、`include_archived_by_default`、`render_markdown` |
| `WS` | `/events?since=<event_id>` | `task_events` の行の実況。`since` を付けないと、盤のいまの末尾から流れ始めます（過去の分は `/board` のスナップショットがすでに持っています）。そこから追いつくには `since=<latest_event_id>` を、履歴を最初から流し直すには `since=0` を渡します |

どの処理も薄い包みです。プラグインは Python でおよそ 700 行（ルーター + WebSocket の追いかけ + まとめての処理 + 設定の読み取り）で、新しい業務の処理は足していません。小さな `_conn()` の補助が、読み書きのたびに `kanban.db` を自動で初期化するので、利用者がダッシュボードを先に開いても、REST API を直接叩いても、`hermes kanban init` を実行しても、新しい導入がそのまま動きます。

### ダッシュボードの設定 {#dashboard-config}

`~/.hermes/config.yaml` の `dashboard.kanban` の下にあるこれらのキーで、タブの初期値が変わります。プラグインは読み込み時に `GET /config` で取得します。

```yaml
dashboard:
  kanban:
    default_tenant: acme              # preselects the tenant filter
    lane_by_profile: true             # default for the "lanes by profile" toggle
    include_archived_by_default: false
    render_markdown: true             # set false for plain <pre> rendering
```

どのキーも任意で、書かれていなければ示した既定値になります。

### セキュリティの考え方 {#security-model}

ダッシュボードの HTTP 認証の中間層は [`/api/plugins/` を意図的に飛ばします](/hermes/docs/user-guide/features/extending-the-dashboard/#backend-api-routes)。ダッシュボードが既定で localhost に結び付くため、プラグインの経路は設計上、認証なしです。つまりカンバンの REST の窓口は、そのホストのどのプロセスからも届きます。

WebSocket はもう一段だけ加えています。ダッシュボードの一時的なセッションのトークンを `?token=…` のクエリ引数として要求します（ブラウザーは接続の切り替えのリクエストに `Authorization` を付けられません）。ブラウザー内の PTY の橋渡しと同じやり方です。

`hermes dashboard --host 0.0.0.0` で動かすと、カンバンを含むすべてのプラグインの経路がネットワークから届くようになります。**共有のホストではやらないでください。** 盤にはタスクの本文、コメント、作業場所のパスが入っています。これらの経路に届いた攻撃者は、あなたの協働の場を丸ごと読めてしまいますし、タスクの作成 / 担当の付け替え / アーカイブもできてしまいます。

`~/.hermes/kanban.db` のタスクは、意図してプロファイルに依存しません（それが連携の部品だからです）。`hermes -p <profile> dashboard` でダッシュボードを開いても、盤にはそのホストの他のどのプロファイルが作ったタスクも表示されます。すべてのプロファイルの持ち主は同じ利用者ですが、複数の人格が同居しているなら知っておく価値があります。

### 即時の更新 {#live-updates}

`task_events` は、単調に増える `id` を持つ追記だけの SQLite の表です。WebSocket の窓口は、クライアントごとに最後に見たイベントの id を保持し、新しい行が来たら送ります。イベントがまとまって届いたときは、画面側が（とても軽い）盤の窓口を読み直します。イベントの種類ごとに手元の状態を当てにいくより単純で、正確です。WAL モードなので、読み出しのループがディスパッチャーの `BEGIN IMMEDIATE` の取り掛かりのトランザクションを妨げることはありません。

### 拡張する {#extending-it}

このプラグインは Hermes のダッシュボードのプラグインの標準的な約束事に従っています。マニフェストの全一覧、外枠の差し込み口、ページごとの差し込み口、プラグイン SDK については [ダッシュボードの拡張](/hermes/docs/user-guide/features/extending-the-dashboard/) を参照してください。列の追加、カードの見た目の作り込み、テナントで絞った配置、`tab.override` による丸ごとの差し替えまで、このプラグインを分岐させずに表現できます。

消さずに無効にするには、`config.yaml` に `dashboard.plugins.kanban.enabled: false` を追加してください（または `plugins/kanban/dashboard/manifest.json` を削除します）。

### 範囲の線引き {#scope-boundary}

GUI は意図して薄く作ってあります。プラグインができることはすべて CLI からできます。プラグインはそれを人にとって快適にするだけです。自動の割り当て、予算、統制の関門、組織図の表示は利用者側の領分のままです。振り分け役のプロファイル、別のプラグイン、`tools/approval.py` の再利用など、設計の仕様で範囲外として挙げられているとおりです。

## CLI コマンドの一覧 {#cli-command-reference}

これは**あなた**（やスクリプト、cron、ダッシュボード）が盤を動かすための窓口です。ディスパッチャーの中で動くワーカーは、同じ操作に `kanban_*` の [ツールの窓口](#how-workers-interact-with-the-board) を使います。ここの CLI とあちらのツールはどちらも `kanban_db` を通るので、2 つの入口は仕組みの上で必ず一致します。

```
hermes kanban init                                     # create kanban.db + print daemon hint
hermes kanban create "<title>" [--body ...] [--assignee <profile>]
                                [--parent <id>]... [--tenant <name>]
                                [--workspace scratch|worktree|worktree:<path>|dir:<path>]
                                [--branch <name>]
                                [--priority N] [--triage] [--idempotency-key KEY]
                                [--max-runtime 30m|2h|1d|<seconds>]
                                [--max-retries N]
                                [--goal] [--goal-max-turns N]
                                [--skill <name>]...
                                [--json]
hermes kanban list [--mine] [--assignee P] [--status S] [--tenant T] [--archived]
        [--workflow-template-id <id>] [--current-step-key <key>]
        [--sort completed-desc|created|created-desc|priority|priority-desc|status|assignee|title|updated]
        [--json]
hermes kanban show <id> [--json]
hermes kanban assign <id> <profile>                    # or 'none' to unassign
hermes kanban reassign <id>... <profile>               # bulk re-assign tasks to a profile
hermes kanban edit <id> [--title ...] [--body ...]     # edit task title / body / priority in place
        [--priority N]
hermes kanban promote <id>...                          # move todo/blocked tasks to ready (recovery)
hermes kanban schedule <id> --at <ISO8601>             # set/clear a task's scheduled_at start time
hermes kanban diagnostics [--json]                     # board health snapshot (alias: diag)
hermes kanban link <parent_id> <child_id>
hermes kanban unlink <parent_id> <child_id>
hermes kanban claim <id> [--ttl SECONDS]
hermes kanban comment <id> "<text>" [--author NAME]

# Bulk verbs — accept multiple ids:
hermes kanban complete <id>... [--result "..."] [--force]
hermes kanban block <id> "<reason>" [--ids <id>...]
hermes kanban unblock <id>...
hermes kanban archive <id>...

hermes kanban request-review <id> [--summary "..."] [--metadata JSON] [--reviewer PROFILE]
hermes kanban request-changes <id> "<required changes>"               # active reviewer -> implementer
hermes kanban reopen-review  <id>... [--reason "..."]                 # changes requested: 'review' -> ready/todo

hermes kanban tail <id>                                # follow a single task's event stream
hermes kanban watch [--assignee P] [--tenant T]        # live stream ALL events to the terminal
        [--kinds completed,blocked,…] [--interval SECS]
hermes kanban heartbeat <id> [--note "..."]            # worker liveness signal for long ops
hermes kanban runs <id> [--json]                       # attempt history (one row per run)
hermes kanban assignees [--json]                       # profiles on disk + per-assignee task counts
hermes kanban dispatch [--dry-run] [--max N]           # one-shot pass
        [--failure-limit N] [--json]
hermes kanban daemon --force                           # DEPRECATED — standalone dispatcher (use `hermes gateway start` instead)
        [--failure-limit N] [--pidfile PATH] [-v]
hermes kanban stats [--json]                           # per-status + per-assignee counts
hermes kanban log <id> [--tail BYTES]                  # worker log from ~/.hermes/kanban/logs/
hermes kanban notify-subscribe <id>                    # gateway bridge hook (used by /kanban in the gateway)
        --platform <name> --chat-id <id> [--thread-id <id>] [--user-id <id>]
        [--chat-type dm|group|channel|thread] [--delivery-mode notify|notify+wake|wake]
hermes kanban notify-list [<id>] [--json]
hermes kanban notify-unsubscribe <id>
        --platform <name> --chat-id <id> [--thread-id <id>]
hermes kanban context <id>                             # what a worker sees
hermes kanban specify [<id> | --all] [--tenant T]      # flesh out a triage-column idea
        [--author NAME] [--json]                       #   into a full spec and promote to todo
hermes kanban gc [--event-retention-days N]            # workspaces + old events + old logs
        [--log-retention-days N]                       #   (negative N is rejected; 0 disables that sweep)
```

すべてのコマンドは、対話型の CLI とメッセージングのゲートウェイでスラッシュコマンドとしても使えます（下の [`/kanban` スラッシュコマンド](#kanban-slash-command) を参照）。

`--max-retries` は、ディスパッチャーに対するタスクごとのサーキットブレーカーの上書きです。`--max-retries 1` は最初の失敗でタスクをブロックし、`--max-retries 3` は 2 回の再試行を許して 3 回目の失敗でブロックします。省くと `config.yaml` の `kanban.failure_limit` が、それもなければ組み込みの既定値が使われます。

### 同時実行、予定、子の昇格の設定 {#concurrency-scheduling-and-child-promotion-config}

| 設定のキー | 既定値 | 何をするか |
|------------|---------|--------------|
| `kanban.max_in_progress` | 未設定（無制限） | 同時に実行するタスクの数の上限です。盤にすでに N 個が実行中なら、ディスパッチャーはそれ以上の起動を見送ります。遅いワーカー（ローカルの LLM、資源の限られたホスト）で、積み上がって時間切れになる前に手元の分を終わらせたいときに役立ちます。不正な値や 1 未満の値は警告を記録し、無制限として扱われます。 |
| `kanban.max_in_progress_per_profile` | 未設定（無制限） | `max_in_progress` のプロファイルごとの版で、1 つの担当者のプロファイルが同時に実行できるタスク数の上限です。あるプロファイルだけが遅かったりレート制限を受けていたりして、他は流し続けたいときに役立ちます。盤全体の `max_in_progress` と併せて働き、起動には両方が許す必要があります。 |
| `kanban.dispatch_profiles` | 未設定（実在するどのプロファイルでも） | 複数の Hermes home で共有する盤のための、home ごとの取り掛かりの許可一覧です。このキーがある場合、この home のディスパッチャーは、挙げられた担当者のカードだけを取り掛かります。閉じる側へ倒れる設計で、空のリスト、`null`、素の `dispatch_profiles:` は何も取り掛かりませんし、設定の読み取りに失敗したときも警告を記録して何も取り掛かりません。他の担当者は `skipped_nonspawnable` に入ります。「実在するどのプロファイルでも」になるのは、キーを省いたときだけです。`hermes kanban diagnostics` が、この home で解決された値（`any`、挙げられた名前、`none (fail-closed: …)`）を表示します。[複数の home で盤を共有する](#shared-boards-across-homes) を参照してください。 |
| `kanban.auto_promote_children` | `true` | `decompose_triage_task()` が親による足止めのない子を作ったあと、ディスパッチャーが拾えるよう自動で `ready` へ昇格させます。手作業での確認を必須にしたい場合は `false` にします。子は昇格させるまで `todo` に留まります。 |
| `kanban.default_workdir` | 未設定 | `--workspace` もタスク自身も上書きしないときに、新しいタスクへ適用される盤の単位の既定の作業ディレクトリです。タスクごとの `workspace:` が優先されます。 |

```yaml
kanban:
  max_in_progress: 2
  auto_promote_children: false
  default_workdir: ~/work/active-project
```

### 開始時刻の予約（`scheduled_at`） {#scheduled-task-starts-scheduledat}

タスクに `scheduled_at` を設定すると、決まった時刻まで振り分けを遅らせられます。ディスパッチャーは `scheduled_at` が未来にある準備済みのタスクを飛ばし、その時刻を過ぎた最初のまわりで拾います。

```bash
hermes kanban create "nightly backup audit" \
  --assignee ops --scheduled-at "2026-06-01T03:00:00Z"
```

### 再起動の見張り {#respawn-guard}

ディスパッチャーは、準備済みのタスクでも、前回の実行で利用枠 / 認証 / 429 のエラーに当たった場合（`blocker_auth`）、見張りの期間内に実行が成功して終わっている場合（`recent_success`）、最近のタスクのコメントが GitHub の PR を指している場合（`active_pr`）は、起動し直すのを拒みます。カードを失敗として数えずに保留する冷却が 2 つあります。利用枠の壁に当たって待ち行列へ戻したあとの `rate_limit_cooldown` と、ホストがワーカーの配置を拒んだあとの `infrastructure_cooldown`（再起動に耐える systemd のスコープがない場合 — [ワーカーと systemd の cgroup](#workers-and-systemd-cgroups) を参照）です。どちらも `HERMES_KANBAN_RATE_LIMIT_COOLDOWN_SECONDS` の期間（既定 300 秒）を共有します。これにより、人が追いつくまでの間、同じ不具合やタスクでワーカーが繰り返し嵐のように起動するのを防ぎます。[イベントの一覧](#event-reference) の `respawn_guarded` の行も参照してください。

準備済みのカードがなぜ起動しないのかを見るには `hermes kanban dispatch --dry-run` を実行してください。保留されているカードごとに `Guarded (<reason>): <task id>` が出ます（`--json` なら `respawn_guarded`、`rate_limited`、`skipped_locked`、`memory_pressure` も出ます）。ゲートウェイと単独のデーモンの「ディスパッチャーが止まっている」という警告も、直前のまわりが何を保留したかを示します（たとえば `Last tick held back: active_pr=1`）。

`recent_success` と `active_pr` が保留するのは **ready** の流れだけです。これらはレビューへの受け渡しの入力であって、受け渡しに反対する合図ではありません。すでに PR が開いているカードを、レビュー担当や締めの担当、その他の回復のプロファイルに拾わせたい場合は、`hermes kanban request-review <id>` でレビューの流れへ移すか（`running` だけでなく `ready` からも受け付けます。レビューの流れでの起動は、どちらの見張りの対象でもありません）、`hermes kanban assign <id> <profile>` で準備済みのカードをそのプロファイルへ渡してください。PR のコメントの*あと*に記録された受け渡し — 運用者による付け替え、レビュー担当の変更要求の判定、レビューの再開 — は、いまカードに名前が載っているプロファイルについて `active_pr` を解除します。その PR こそが取り組むべきものだからです。数えられるのは*別の*プロファイルへの変更だけです。同じプロファイルへの付け替え直し、担当の解除、ディスパッチャー自身の `kanban.default_assignee` による補充では見張りは解けません。そのため、PR を開いた担当者が、異常終了や回収、何も変わらない付け替えのあとに同じ PR に対して起動し直されることはありませんし、受け渡しのあとに新しい PR のコメントが投稿されればまた見張りが働きます。成功のあとの意図的な待ち行列への戻し（`done→ready` へのドラッグ、`unblock`、昇格し直し）も `recent_success` を解除するので、手作業での再実行が期間いっぱい黙って保留されることはありません。

### ドラッグでの削除とまとめての削除（ダッシュボード） {#drag-to-delete-and-bulk-delete-dashboard}

ダッシュボードのカンバンのページには**ゴミ箱の受け皿**があります。カードをそこへドラッグするとタスクを削除できます（`task_events`、子のリンク、購読まで連鎖します）。確認の問い合わせが事故を防ぎます。まとめての削除は、JSON の本文 `{"ids": ["t_abc", "t_def", ...]}` を付けた `DELETE /api/plugins/kanban/tasks` でも行えます。

### ワーカーを見るための窓口 {#worker-visibility-endpoints}

ダッシュボードのプラグイン API は、外部の監視向けにこれらの読み取り専用の窓口（と実行の制御の動詞が 1 つ）を提供します。

| 窓口 | 返すもの |
|----------|---------|
| `GET /api/plugins/kanban/workers/active` | いま起動しているワーカーと、その PID、プロファイル、タスク id、開始時刻、最後の鼓動 |
| `GET /api/plugins/kanban/runs/{id}` | 1 回の実行の詳細 — タスク id、状態、開始 / 終了、終了コード、ログのパス |
| `POST /api/plugins/kanban/runs/{run_id}/terminate` | 回収できる実行を終了させます — ワーカーを止め、タスクを再度の振り分けへ解放します |
| `GET /api/plugins/kanban/inspect` | ディスパッチャーの断面のまとめ — 残りの作業、`max_in_progress` に対する実行中の数、直近のイベント |

これらはすべて、カンバンのプラグイン API の他の部分と同じダッシュボードのプラグイン認証で守られています。

### カンバンの群の形を作る補助 {#kanban-swarm-topology-helper}

`hermes kanban swarm` は、永続的な **Kanban Swarm v1** のグラフを一度に作ります。完了状態の根 / 共有板のカード、N 枚の並列のワーカーのカード、すべてのワーカーに依存する検証役のカード、検証役に依存するまとめ役のカードです。群で共有する文脈（「共有板」）は、根のカードに構造化された JSON のコメントとして保存されるので、どのワーカーからも読めます。

```bash
hermes kanban swarm "Design a multi-region failover plan" \
  --workers researcher,architect,sre \
  --verifier reviewer --synthesizer writer
```

できあがるグラフは不可分に確定します。ディスパッチャーもダッシュボードの読み手も、新しい群がまだ無い状態か、完成した形かのどちらかしか見ません。途中までつながった根 / ワーカー / 検証役のグラフを見ることはありません。そのあとはふつうに振り分けられます。ワーカーが並列に動き、全員が終わると検証役が起き、検証役が問題なしと記した後にまとめ役が起きます。

## `/kanban` スラッシュコマンド {#kanban-slash-command}

`hermes kanban <action>` のどの動詞も `/kanban <action>` として使えます。対話型の `hermes chat` のセッションの中から**も**、どのゲートウェイのプラットフォーム（Telegram、Discord、Slack、WhatsApp、Signal、Matrix、Mattermost、メール、SMS）からもです。どちらの入口も、`hermes kanban` の argparse の木をそのまま再利用する同じ `hermes_cli.kanban.run_slash()` を呼ぶので、引数の形、フラグ、出力の形式は CLI、`/kanban`、`hermes kanban` で同じです。盤を動かすためにチャットを離れる必要はありません。

```
/kanban list
/kanban show t_abcd
/kanban create "write launch post" --assignee writer --parent t_research
/kanban comment t_abcd "looks good, ship it"
/kanban unblock t_abcd
/kanban dispatch --max 3
/kanban specify t_abcd                  # flesh out a triage one-liner into a real spec
/kanban specify --all --tenant engineering  # sweep every triage task in one tenant
```

複数の語からなる引数は、シェルと同じように引用符で囲んでください。`run_slash` は行の残りを `shlex.split` で解釈するので、`"..."` も `'...'` も使えます。

### 実行中の利用: `/kanban` は実行中エージェントの見張りを通り抜ける {#mid-run-usage-kanban-bypasses-the-running-agent-guard}

ゲートウェイはふつう、エージェントがまだ考えている間はスラッシュコマンドと利用者のメッセージを待たせます。最初のやり取りが進行中に、うっかり 2 つ目を始めてしまうのを止めるためです。**`/kanban` はこの見張りから明示的に外されています。** 盤は実行中のエージェントの状態ではなく `~/.hermes/kanban.db` にあるので、読み出し（`list`、`show`、`context`、`tail`、`watch`、`stats`、`runs`）も書き込み（`comment`、`unblock`、`block`、`assign`、`archive`、`create`、`link` など）も、やり取りの途中でもすぐに通ります。

この分離こそが目的です。

- ワーカーが仲間を待ってブロックしている → 手元の携帯から `/kanban unblock t_abcd` を送ると、ディスパッチャーが次のまわりで仲間を拾います。ブロック中のワーカーが中断されることはなく、ブロックでなくなるだけです。
- 人の文脈が要るカードに気づいた → `/kanban comment t_xyz "use the 2026 schema, not 2025"` がタスクのつながりに載り、そのタスクの*次の*実行が `kanban_show()` でそれを読みます。
- 取りまとめ役を止めずに群の様子を知りたい → `/kanban list --mine` や `/kanban stats` が、あなたの主な会話に触れずに盤を見せてくれます。

### `/kanban create` での自動購読（ゲートウェイのみ） {#auto-subscribe-on-kanban-create-gateway-only}

ゲートウェイから `/kanban create "…"` でタスクを作ると、その作成元のチャット（プラットフォーム + チャット id + スレッド id）が、そのタスクの終了のイベント（`completed`、`blocked`、`gave_up`、`crashed`、`timed_out`）へ自動で購読されます。終了のイベントごとに 1 通のメッセージが返ってきます。`completed` のときはワーカーの結果の要約の 1 行目も含まれるので、確認しに行ったり、タスクの id を覚えておいたりする必要はありません。

```
you> /kanban create "transcribe today's podcast" --assignee transcriber
bot> Created t_9fc1a3  (ready, assignee=transcriber)
     (subscribed — you'll be notified when t_9fc1a3 completes or blocks)

… ~8 minutes later …

bot> ✓ t_9fc1a3 completed by transcriber
     transcribed 42 minutes, saved to podcast/2026-05-04.md
```

購読は、タスクが `done` に達しても残ります。完了は取り消せる（レビュー担当や管理役が完了したタスクを開き直せる）ので、作成元のセッションは開き直しの周期を通じて通知を受け取り続けます。購読は `archived`（取り消せない終わりの状態）で自動的に消えます。アーカイブしない盤では、掃除のひとまわりが、`kanban.done_sub_retention_days` 日（既定 30。0 で無効）の間 `done` か `blocked` のまま何の動きもないタスクの購読を取り除くので、古い行が永遠に溜まることはありません。`--json`（機械向けの出力）を付けて作成を自動化した場合、自動購読は行われません。スクリプトから呼ぶ人は `/kanban notify-subscribe` で購読を明示的に管理したいはずだ、という想定です。

`kanban_create` や `hermes kanban create` でタスクを作るディスパッチャーのワーカーは、
`parents` の依存のリンクがなくても、持っているタスクの永続的な通知の購読を
引き継ぎます。宛先、経路の手がかり、配信の方式は保たれます。受け身の購読が
自動購読によって起き上がりへ格上げされることはありません。これは既存の購読を
写すもので、いまの会話を新しい宛先として加えるかどうかを決める
`auto_subscribe_on_create` とは独立です。素の CLI のセッションや、持っている
タスクに購読のないワーカーのために、宛先が作り出されることはありません。

`kanban_create` では、セッションの系譜が次の順で決まります。明示的な `session_id`、
持っているワーカーのタスクの永続的なセッション、リクエストの範囲での API の出どころ、
そして現在のセッションです。候補の id が刻まれるのは、アクティブなプロファイルの
`state.db` の `sessions` の表に行があるときだけです。どこにも解決しない id
（行が書かれなかったセッションや、別のプロセスから引き継いだ id）の場合、
どのデータベースでも解決できないセッションを指すのではなく、`session_id` は
NULL のままになります。組み込みの分解も、その根の永続的なセッションを引き継ぎます。
セッションの系譜そのものは通知の宛先ではありません。`session_id` を変えても
既存の購読は置き換わりません。イベントの届け先を変えるには `notify-subscribe` と
`notify-unsubscribe` を使ってください。

チャット由来の自動購読は `notify+wake` の方式で作られます。終了のイベントのとき、宛先のエージェントは受け身のメッセージを受け取る**とともに**実際にやり取りを 1 回行うので、盤の文脈を読んで自分の言葉で返せます。下の [配信の方式](#delivery-modes) を参照してください。

### メッセージングでの出力の切り詰め {#output-truncation-in-messaging}

ゲートウェイのプラットフォームには、実用上のメッセージ長の上限があります。`/kanban list`、`/kanban show`、`/kanban tail` の出力がおよそ 3800 文字を超えると、応答は `… (truncated; use \`hermes kanban …\` in your terminal for full output)` という末尾を付けて切り詰められます。CLI の窓口にはこうした上限はありません。

### 入力の補完 {#autocomplete}

対話型の CLI では、`/kanban ` と入力して Tab を押すと、組み込みのサブコマンドの一覧（`list`、`ls`、`show`、`create`、`assign`、`link`、`unlink`、`claim`、`comment`、`complete`、`block`、`unblock`、`archive`、`tail`、`dispatch`、`context`、`init`、`gc`）を順に切り替えられます。上の CLI の一覧にある残りの動詞（`watch`、`stats`、`runs`、`log`、`assignees`、`heartbeat`、`notify-subscribe`、`notify-list`、`notify-unsubscribe`、`daemon`）も動きます。まだ補完の候補に入っていないだけです。

## 協働の型 {#collaboration-patterns}

盤は、新しい部品を足さずに次の 8 つの型に対応します。

| 型 | 形 | 例 |
|---|---|---|
| **P1 展開** | 同じ役割の N 人の兄弟 | 「5 つの切り口を並列で調べる」 |
| **P2 パイプライン** | 役割の連なり: 探索役 → 編集役 → 書き手 | 日次の要約の組み立て |
| **P3 投票 / 多数決** | N 人の兄弟 + 1 人のまとめ役 | 3 人の調査役 → 1 人のレビュー担当が選ぶ |
| **P4 長く続く記録** | 同じプロファイル + 共有ディレクトリ + cron | Obsidian の保管庫 |
| **P5 人が入る形** | ワーカーがブロック → 人がコメント → 解除 | あいまいな判断 |
| **P6 `@mention`** | 文章からそのまま振り分け | `@reviewer look at this` |
| **P7 スレッド単位の作業場所** | スレッド内での `/kanban here` | プロジェクトごとのゲートウェイのスレッド |
| **P8 群での作業** | 1 つのプロファイル、N 個の対象 | 50 個の SNS アカウント |
| **P9 仕分けの仕様化** | 粗い思いつき → `triage` → `hermes kanban specify` が本文を広げる → `todo` | 「この一言を、仕様の付いたタスクにする」 |

## 追加のカードへ文脈を渡す（親のリンク） {#handing-context-to-follow-up-cards-the-parent-link}

親のリンクは、順番を決める関門であるだけではありません。**完了した**カードから新しいカードへの、文脈の受け渡しの通り道です。`--parent <done-card-id>` を付けてカードを作ると、2 つのことが起こります。

1. **すぐに動ける状態になります。** `create_task` は親の状態で状態を決めます。親がすべて `done` の子は、そのまま `ready` として作られます。待ちも、手作業での昇格も要りません。（まだ開いている親を持つ子は、最後の親が終わったときに `recompute_ready` が昇格させるまで `todo` にいます。）
2. **親の受け渡しが一緒に付いてきます。** 子のために組み立てられるワーカーのコンテキスト（`build_worker_context`。`kanban_show()` が返すもの）には、それぞれの親の完了時の `summary` と `metadata` をそのまま載せた `## Parent task results` の節が入ります。

```
## Parent task results
### t_77c26979 (completed just now)
Added exponential backoff with jitter to the retry helper.
_metadata_: `{"changed_files": ["hermes_cli/retry.py", "tests/test_retry.py"], "decisions": ["capped backoff at 60s", "jitter = full"]}`
```

だからこそ、終わったカードへの追加作業は、**完了したカードを開き直すのではなく、新しい子のカードを作る**のが型なのです。完了したカードは動かせない履歴で、その文脈は親のリンクを通って前へ流れます。同じカードでのやり直し（失敗するカードでの再試行のループ）は別の仕組みで、*同じ*カードでの過去の試みは、そのカード自身のコンテキストに「過去の試み」として現れます。

worktree やブランチだけでは代わりになりません。リポジトリの状態は、追加作業のワーカーにコードが*どうなっているか*は伝えますが、*なぜ*そうなのかは伝えません。判断、実行したテスト、触れたファイルは、git ではなく親の構造化された受け渡しの中にあります。親が完了した時点では存在しなかった証拠（あとで落ちた CI のログなど）は、新しいカードの**本文**に入れてください。

```bash
# Implementation card t_impl is done. CI fails two hours later.
hermes kanban create "Fix CI failure from t_impl: test_retry flakes on 3.11" \
    --assignee coder \
    --parent t_impl \
    --body "$(cat <<'EOF'
CI run #4812 failed after t_impl merged.
Log excerpt: FAILED tests/test_retry.py::test_backoff_jitter - TimeoutError
Acceptance: tests/test_retry.py green on 3.11 and 3.12 in CI.
Use a fresh worktree/branch; do not force-push the original branch.
EOF
)"
```

修正のワーカーは、元のカードの要約とメタデータ（変更したファイル、判断）をすでにコンテキストに入れた状態で起動し、加えてあなたが本文に入れた新しい証拠を手にします。

### ぶつかったワーカーのブランチを調停する {#reconciling-colliding-worker-branches}

開発のパイプライン（worktree を使う P1/P2）では、2 人のワーカーのブランチが
マージ時にぶつかることがあります。どちらのワーカーにも自分で裁かせないでください。
ぶつかっている側は相手の文脈を持っていないので、決まって相手側を上書きするか、
自分の側を捨てます。代わりに、ぶつかった**両方**のカードを親としてつないだ
調停のカードを作り、**3 人目の中立なプロファイル**に割り当ててください。親の
リンクが両側の完了の要約を調停役のコンテキストへ運ぶので、両方の差分*と*
両方の意図が届きます。同梱の
[`agent-merge-conflict-arbiter` の任意のスキル](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/autonomous-ai-agents/agent-merge-conflict-arbiter/SKILL.md)
が、そのワーカーに手順一式を与えます。ぶつかった塊をそれぞれ分類し、公平に
解決し、確かめ、すべての判断に触れた要約を返す、という手順です。

### 並列の作戦でぶつかりやすい場所 {#collision-hotspots-in-parallel-campaigns}

広い作戦では、いくつかのファイルがぶつかりの磁石になります。多くのワーカーが
同じファイルに少しずつ足し、小さく保つ責任を誰も持たず、そこが恒常的な
マージの衝突の現場になります。対策はコメントの取り決めであって、新しい部品では
ありません。自分の差分が 1 つのファイルで兄弟とぶつかり続けていると気づいた
ワーカー — あるいは、自分が触れているファイルが他のカードの最近のコメントに
何度も現れていると気づいたワーカー — は、黙って積み増しをしてはいけません。
代わりに、見分けのつく接頭辞を付けて自分のカードにコメントを残します。

```
hotspot: hermes_cli/kanban_db.py — third conflicting edit to the dispatch loop this wave
```

そして完了時の `metadata` でも同じ印を繰り返します。取りまとめ役（や盤を見る
人）は、**同じパスを名指しする `hotspot:` のコメントを 2 つ以上**見かけたら、
そのファイルに触れる作業をさらに積む**前に**、そのファイル専用のリファクタリング /
分解のカードを作ってください。磁石になっているファイルを分けるほうが、そこから
生じる将来のぶつかりをすべて調停するより安く済みます。*すでに*起きてしまった
衝突には、上の調停のカードの型と `agent-merge-conflict-arbiter` の任意のスキルを
使ってください。ぶつかりやすい場所の印は、調停役が常設の役割になるのを防ぐ、
上流での手当てです。

## 複数テナントでの利用 {#multi-tenant-usage}

1 つの専門家の群が複数の事業に対応するときは、それぞれのタスクにテナントの札を付けます。

```bash
hermes kanban create "monthly report" \
    --assignee researcher \
    --tenant business-a \
    --workspace dir:~/tenants/business-a/data/
```

ワーカーは `$HERMES_TENANT` を受け取り、記憶への書き込みを接頭辞で名前空間に分けます。盤も、ディスパッチャーも、プロファイルの定義も共有されます。分けられるのはデータだけです。

## デスクトップの通知 {#desktop-notifications}

デスクトップアプリのカンバンのプラグインは、同じ終了のイベントをそのまま扱います。ゲートウェイのプラットフォームは要りません。カンバンの盤の実況のイベントの接続が生きている間、`completed`、`blocked`、`gave_up`、`crashed`、`timed_out`、あるいは仕分けへの振り分け（`block_loop_detected`）のイベントごとに、ワーカーの受け渡し（要約、ブロックの理由、エラー）と「Open Kanban」の操作を含むアプリ内の通知が出ます。Hermes の画面から離れているときは、同じイベントが OS のネイティブな通知も出すので（**Settings ▸ Notifications ▸ Plugin notifications** で制御します）、別のアプリを使っている間にタスクが行き詰まっても届きます。

届く範囲: デスクトップの通知は実況のイベントの流れに乗るので、カンバンのプラグインを有効にしたアプリが動いている間だけ出ます。アプリを閉じている間に起きたイベントが、次回の起動時に通知として流し直されることはありません。アプリを閉じていても必ず届いてほしい場合は、次に述べるゲートウェイの購読を使ってください。

## ゲートウェイの通知 {#gateway-notifications}

ゲートウェイ（Telegram、Discord、Slack など）から `/kanban create …` を実行すると、作成元のチャットが新しいタスクへ自動で購読されます。ゲートウェイの裏で動く通知役が数秒ごとに `task_events` を確認し、終了のイベント（`completed`、`blocked`、`gave_up`、`crashed`、`timed_out`）ごとに 1 通のメッセージをそのチャットへ届けます。完了したタスクでは、ワーカーの `--result` の 1 行目も送られるので、`/kanban show` をしなくても結果が分かります。

購読は CLI から明示的に管理できます。スクリプトや cron のジョブが、自分の由来ではないチャットへ知らせたいときに便利です。

```bash
hermes kanban notify-subscribe t_abcd \
    --platform telegram --chat-id 12345678 --thread-id 7 \
    --chat-type group --delivery-mode notify+wake
hermes kanban notify-list
hermes kanban notify-unsubscribe t_abcd \
    --platform telegram --chat-id 12345678 --thread-id 7
```

購読は、タスクが `done` か `archived` に達すると自動で消えます。片付けは要りません。

**`profile_routes` の下の Discord のスレッド:** ゲートウェイが複数のプロファイルを多重化して*チャンネル*を
プロファイルへ振り分けている場合、そのチャンネルの*スレッド*について CLI から作った購読には、スレッドの
経路の手がかりが要ります。ないと通知役はどの経路にも結び付けられず、その購読を飛ばします（WARNING で 1 回
記録されます）。`--parent-chat-id <channel id>` と、Discord なら `--guild-id <guild id>` を明示的に渡してください。

```bash
hermes kanban notify-subscribe t_abcd \
    --platform discord --chat-id <thread id> --thread-id <thread id> --chat-type thread \
    --parent-chat-id <channel id> --guild-id <guild id> --delivery-mode notify+wake
```

チャットの中から作った購読（`/kanban create`、`kanban_create`）は、これらの手がかりを自動で記録します。

### 配信の方式 {#delivery-modes}

`--delivery-mode` は、終了のイベントに対して通知役が**どう**反応するかを決めます。どの購読も 3 つの方式のどれかです（`notify` が既定で、従来の振る舞いです）。

| 方式 | 受け身のメッセージ | エージェントを起こす | こんなときに |
|------|-----------------|-----------------|-------------|
| `notify` | はい | いいえ | チャットに知らせの一言がほしいだけのとき（既定）。 |
| `notify+wake` | はい | はい | 宛先のエージェントにも実際にやり取りをさせたいとき。盤の文脈を読んで自分の言葉で返します。チャット由来の自動購読はこれを使います。 |
| `wake` | いいえ | はい | 別の呼び出しなしに、エージェントにイベントへ対処させたいだけのとき。 |

`notify+wake` では、受け身の知らせが送られることに加えて、起き上がりがアダプターのやり取りの待ち行列に受け付けられて初めて配信が完了します。処理役がいない、経路が拒否された、待ち行列がいっぱい、といった場合は、購読を失効させずにあとの通知役のまわりで再試行されます。送った知らせは SQLite に別々に記録されるので、起き上がりが拒否されても、すでに記録された知らせが繰り返されることはありません。`notify` は受け身のままで、やり取りを始めることはありません。受け付けられたことは、モデルが実行されることや返信が成功することの保証ではありません。ふつうのやり取りの関門はそのまま適用されます。これはちょうど 1 回の配信ではありません。送信と記録の間にプロセスが落ちれば知らせが繰り返されることがありますし、既存の配信前の取り掛かりの位置は、異常終了から復旧できる待ち行列ではありません。

「起き上がり」は、宛先のゲートウェイのエージェントに合成した受信メッセージを渡し、1 行の受け身の通知を受け取る代わりに、ふつうのやり取り（コメント + 結果を読み、考え、返す）をさせます。これが働くのは、通知役が生きたゲートウェイのプロセスの中で動いているときだけです。そうでない場合、`notify+wake` の購読は受け身のメッセージだけを届け、`wake` だけの購読はそのプロセスでは何もしません。

**どのイベントが起こすか。** タスクの結果を返すもの、あるいは取りまとめの目を要するものです。`completed`、`blocked`、`gave_up`、`crashed`、`timed_out`、`review_requested`（ワーカーが実装を終えて `kanban_request_review` で引き渡した）、`block_loop_detected`（繰り返しのブロックのあとタスクが `triage` へ送られた）です。`status`、`archived`、`unblocked` は届きますが、起こすことはありません。これらは帳簿上の遷移であって、注意を促す合図ではないからです。`completed` や `review_requested` のイベントが要約を持っている場合、その受け渡しが起き上がりのやり取りに乗るので、起きたエージェントはワーカーが実際に何をしたのかを見られます。

`--chat-type`（`dm` | `group` | `channel` | `thread`）は、作成元のチャットの種類を記録して、起きたやり取りが運用者の**本当の**セッションに解決されるようにします。`build_session_key` はグループ、チャンネル、スレッドを DM とは別のキーにするので、`chat_type` が不正確だと起き上がりが別の、文脈のないセッションへ流れてしまいます。`/kanban` の自動購読とスラッシュコマンドの経路はこれを自動で拾います。手で設定するのは、スクリプトや cron からチャットを購読するときだけです。省くと既存の購読は変わりません（新しい購読の既定は `dm` です）。

### 複数プロファイルの構成: 配信はプロファイルが持つ {#multi-profile-setups-delivery-is-profile-owned}

プロファイルごとにゲートウェイを立てる構成（1 つのディスパッチャーと、`writer`、
`admin` などの別々のゲートウェイのプロセス — [複数ゲートウェイの
手引き](/hermes/docs/user-guide/features/kanban-multi-gateway/) を参照）では、
振り分けと配信は別の持ち主になります。

- **振り分けの持ち主は 1 つだけ。** ちょうど 1 つのゲートウェイが
  `kanban.dispatch_in_gateway: true` を保ってディスパッチャーを動かし、他の
  ゲートウェイはすべて `false` にします。
- **通知の配信はプロファイルが持ちます。** 振り分けをしないものも含めて
  すべてのゲートウェイが通知役を動かし、自分がホストするプラットフォームの
  アダプターを持つプロファイルの刻まれた購読だけを確認します。`writer`
  プロファイルの Telegram から作られたタスクは、振り分けたのが `default` の
  ゲートウェイであっても、`completed`/`blocked` のメッセージを `writer` の
  ゲートウェイが届けます。
- **`gateway.profile_routes` で固定された多重化のプロファイル**は、購読に
  保存されたプラットフォーム、チャット、スレッド、範囲、親チャンネルの手がかりが
  `gateway.profile_routes` を通してそのちょうど対応するプロファイルに解決され、
  かつそのプロファイルが購読のプラットフォーム向けに自前のアダプターを持たない
  場合に、主のアダプターを使えます。そのプラットフォーム向けに接続された副の
  アダプターがあれば、そちらが優先されます。プロファイルが*他の*プラットフォームで
  動かしているアダプターが配信を妨げることはありません（固定されたチャットに
  対応する資格情報は共有のボットだけで、受信のやり取りでも通知でも同じです）。
  一致しない、付け替えられた、無効な、あいまいな経路は、届かないまま再試行の
  対象になります。必要な経路の手がかりを欠く古い行が、推測でプロファイルに
  結び付けられることはありません。起き上がりのやり取りは、宛先のプロファイルの
  実行時の範囲と、認可された伝送路を保ちます。
- **状態を持たない（`api_server`）購読**は、生のセッション id を運びます。
  これはどの `profile_routes` の項目でも固定できません（セッションには
  チャット / スレッド / サーバーの区別がありません）。対応するプロファイルが
  認可されるのは、購読のセッションがそのプロファイル自身の `state.db` にあるとき
  ちょうどです。共有の受け口は `/p/<profile>/` を映すので、所有の証拠になるのは
  セッションの保管場所であって、プラットフォームではありません。起き上がりは
  そのプロファイルの実行時の範囲で動き、そのセッションをプロセス内でそのまま
  再開するので、2 つ目の受け口も副の `API_SERVER_KEY` も要りません。見知らぬ
  セッション、別のプロファイルに刻まれたセッション、対応していないプロファイルが
  持つセッションは、届かないまま再試行の対象になり、既定のプロファイル自身の
  `api_server` の購読には影響しません。
- **以前の購読**（プロファイルの刻印が入る前に作られ、行に `notifier_profile`
  がないもの）は、実際のディスパッチャーの単一のロックを握るゲートウェイだけが
  届けるので、2 つのゲートウェイがそれを取り合うことはありません。

ゲートウェイをまたいだ二重の配信は、盤の DB にあるイベントごとの不可分な
取り掛かりで防がれます。中継も、資格情報の共有も、追加のディスパッチャーも
要りません。プロファイルのゲートウェイがそれぞれ自分のアダプターで届けるだけです。

## 実行（run） — 試みごとに 1 行 {#runs-one-row-per-attempt}

タスクは論理的な作業のまとまりで、**実行**はそれを 1 回やってみることです。ディスパッチャーが準備済みのタスクに取り掛かると `task_runs` に行を作り、`tasks.current_run_id` をそこへ向けます。その試みが終わると — 完了、ブロック、異常終了、時間切れ、起動の失敗、回収 — その実行の行は `outcome` とともに閉じられ、タスクの指す先は消えます。3 回試されたタスクには `task_runs` の行が 3 つあります。

タスクを書き換えるのではなく表を 2 つにしている理由は、現実の振り返りに**試みの全履歴**が要るから（「2 人目のレビュー担当は承認まで行き、3 人目がマージした」）、そして試みごとのメタデータ — どのファイルが変わったか、どのテストが走ったか、レビュー担当が何を見つけたか — をきれいに置ける場所が要るからです。これらは実行の事実であって、タスクの事実ではありません。

実行は、**構造化された受け渡し**が置かれる場所でもあります。ワーカーが（`kanban_complete(...)` で）タスクを完了するとき、次を渡せます。

- `summary`（ツールの引数）/ `--summary`（CLI） — 人向けの受け渡しです。実行に載り、下流の子が `build_worker_context` で見ます。
- `metadata`（ツールの引数）/ `--metadata`（CLI） — 実行に載る自由な形の JSON の辞書です。子は要約と並べて直列化された形で見ます。
- `result`（ツールの引数）/ `--result`（CLI） — タスクの行に載る短いログの行です（以前からある項目で、互換のために残されています）。

下流の子は、それぞれの親について、直近に完了した実行の要約とメタデータを読みます。再試行するワーカーは、自分のタスクの過去の試み（結果、要約、エラー）を読むので、すでに失敗した道をもう一度たどることはありません。

```
# What a worker actually does — a tool call, from inside the agent loop:
kanban_complete(
    summary="implemented token bucket, keys on user_id with IP fallback, all tests pass",
    metadata={"changed_files": ["limiter.py", "tests/test_limiter.py"], "tests_run": 14},
    result="rate limiter shipped",
)
```

同じ受け渡しは、ワーカーが閉じられないタスクを**あなた**（人）が締めくくる必要があるときに CLI からも使えます。放置されたタスクや、ダッシュボードで手作業で完了にしたタスクなどです。

```bash
hermes kanban complete t_abcd \
    --result "rate limiter shipped" \
    --summary "implemented token bucket, keys on user_id with IP fallback, all tests pass" \
    --metadata '{"changed_files": ["limiter.py", "tests/test_limiter.py"], "tests_run": 14}'

# Review the attempt history on a retried task:
hermes kanban runs t_abcd
#   #  OUTCOME       PROFILE           ELAPSED  STARTED
#   1  blocked       worker               12s  2026-04-27 14:02
#        → BLOCKED: need decision on rate-limit key
#   2  completed     worker                8m   2026-04-27 15:18
#        → implemented token bucket, keys on user_id with IP fallback
```

実行はダッシュボード（引き出しの Run History の節。試みごとに色の付いた 1 行）でも、REST API（`GET /api/plugins/kanban/tasks/:id` が `runs[]` の配列を返します）でも見られます。`{status: "done", summary, metadata}` を付けた `PATCH /api/plugins/kanban/tasks/:id` は両方を中核へ渡すので、ダッシュボードの「mark done」のボタンは CLI と同じ働きをします。`task_events` の行は自分が属する `run_id` を持つので、画面は試みごとにまとめられます。また `completed` のイベントは、1 行目の要約を（400 文字までで）中身に埋め込むので、ゲートウェイの通知役は SQL をもう一度たどらずに構造化された受け渡しを描けます。

**まとめて閉じるときの注意。** `hermes kanban complete a b c --summary X` は拒否されます。構造化された受け渡しは実行ごとのものなので、同じ要約を N 個のタスクへ貼り付けるのは、ほぼ確実に誤りだからです。`--summary` / `--metadata` を**付けない**まとめての完了は、「事務的な作業をまとめて終えた」というよくある場面のために変わらず使えます。

**完了時の依存の拒否は親を名指しします。** 直接の親が `done`/`archived` でないカード（実行の途中で親が開き直された、あるいは実行中の子への拒否より前からある辺）に対する `kanban_complete` / `hermes kanban complete` / ダッシュボードの「mark done」と「request review」の操作（単独でもまとめてでも）は、汎用の「不明な id、古い実行、またはすでに終端」という文言ではなく `unsatisfied parent dependencies: t_… (todo)` を返します。カードは進行中のままです。`kanban_show` は同じ親を `unsatisfied_parents` に並べ、`hermes kanban show` / `hermes kanban diagnostics` / ダッシュボードは、その状態の実行中のカードに `running_with_open_parents` の警告を出します。親を終わらせるか、`hermes kanban unlink <parent> <child>` してください。依存の関門を力ずくで通る道はありません。

**完了時の取り掛かりの見張り。** ワーカーが生きた取り掛かりを持っている `running` のタスクを完了できるのは、そのワーカー自身（実行の中からの `kanban_complete`）か、運用者の明示的な上書きだけです。後者は `hermes kanban complete <id> --force` とダッシュボードの「mark done」の操作です。取り掛かりのない `hermes kanban complete <id>` や、取りまとめ役のセッションからの `kanban_complete` は、`--force` / `hermes kanban reclaim` を示して拒否されます。これにより、別のセッションが生きたワーカーの実行を足元から閉じることはできなくなりました。取り掛かりのない `ready`、`blocked`、`review` のカードの完了は、これまでどおりです。

**状態の変更による回収された実行。** ダッシュボードで実行中のタスクを `running` の外へ（`ready` へ戻す、あるいは直接 `todo` へ）ドラッグした場合や、まだ実行中のタスクをアーカイブした場合、進行中の実行は取り残されるのではなく `outcome='reclaimed'` で閉じられます。`tasks.current_run_id` が `NULL` のとき `task_runs` の行は必ず終端の状態にあり、その逆も成り立ちます。この不変条件は、CLI、ダッシュボード、ディスパッチャー、通知役のすべてで保たれます。

**取り掛かりのなかった完了のための合成された実行。** 一度も取り掛かられなかったタスクの完了やブロック（たとえば人がダッシュボードから `ready` のタスクを要約付きで閉じる、CLI の利用者が `hermes kanban complete <ready-task> --summary X` を実行する）は、そのままでは受け渡しが落ちてしまいます。代わりに中核が、要約 / メタデータ / 理由を運ぶ長さゼロの実行の行（`started_at == ended_at`）を挿入するので、試みの履歴は欠けません。`completed` / `blocked` のイベントの `run_id` は、その行を指します。

**引き出しの即時の更新。** ダッシュボードの WebSocket のイベントの流れが、利用者がいま見ているタスクの新しいイベントを知らせると、引き出しは自分を読み直します（タスクごとのイベントの数え上げを `useEffect` の依存に通しています）。実行の新しい行や更新された結果を見るために、閉じて開き直す必要はもうありません。

### 将来との互換性 {#forward-compatibility}

`tasks` にある 2 つの NULL を許す列は、v2 のワークフローの振り分けのために予約されています。`workflow_template_id`（このタスクがどのテンプレートに属するか）と `current_step_key`（そのテンプレートのどの段階が有効か）です。v1 の中核は振り分けにこれらを使いませんが、クライアントが書き込むことは許すので、v2 のリリースがもう一度スキーマを移行しなくても振り分けの仕組みを足せます。

## イベントの一覧 {#event-reference}

すべての遷移が `task_events` に 1 行を書き足します。各行は任意の `run_id` を持つので、画面はイベントを試みごとにまとめられます。種類は 3 つの塊に分かれているので、絞り込みが簡単です（`hermes kanban watch --kinds completed,gave_up,timed_out`）。

**ライフサイクル**（論理的なまとまりとしてのタスクに何が起きたか）:

| 種類 | 中身 | いつ |
|---|---|---|
| `created` | `{assignee, status, parents, tenant}` | タスクが挿入された。`run_id` は `NULL`。 |
| `promoted` | — | すべての親が `done` になったことによる `todo → ready`。`run_id` は `NULL`。 |
| `claimed` | `{lock, expires, run_id}` | ディスパッチャーが起動のために `ready` のタスクへ不可分に取り掛かった。 |
| `completed` | `{result_len, summary?}` | ワーカーが `--result` / `--summary` を書き、タスクが `done` になった。`summary` は 1 行目の受け渡し（400 文字まで）で、全文は実行の行にあります。受け渡しの項目付きで、一度も取り掛かられていないタスクに `complete_task` が呼ばれた場合、`run_id` が何かを指すよう長さゼロの実行が合成されます。 |
| `blocked` | `{reason, kind, recurrences}` | ワーカーか人がタスクを `blocked` にした。`kind` は型の付いたブロックの理由（`needs_input`、`capability`、`transient`、汎用のブロックなら `null`）で、`recurrences` は解除ループの数え上げです。終わっていない親のない `kind=dependency` のブロックは `needs_input` としてここに入ります（中身に `requested_kind: dependency`、`rekind_reason: no_open_parent` が加わります）。`todo` にしても次の振り分けのまわりで昇格して起動し直されるだけだからです。`--reason` 付きで、一度も取り掛かられていないタスクに呼ばれた場合は長さゼロの実行を合成します。 |
| `dependency_wait` | `{reason, kind}` または `{reason: parent_not_done, demoted: true, parent}` | 少なくとも 1 つの親がまだ開いている状態で、ワーカーが `kind=dependency` でブロックした。タスクは別のタスクを待っているだけなので、`blocked` ではなく `todo`（親による関門があり、自動で昇格します）へ行き、繰り返しとしては数えられません。人の手は要りません。`link`/`kanban_link` が `ready` の子を `done` でない親の下に置いたときにも出ます。子は `todo` へ戻り、このイベントがその理由を記録します（`ready → running` の取り掛かりが親を確かめ直すので、親が完了するか `hermes kanban unlink` でリンクが外れるまで、何も実行できません）。 |
| `block_loop_detected` | `{reason, kind, recurrences, limit}` | 同じ理由でタスクが解除されて再ブロックされることが `BLOCK_RECURRENCE_LIMIT` 回（既定 2）続いた。もう一度 `blocked` へ入る代わりに — cron が解除し続ける場所です — 取りまとめの目が届くよう `triage` へ送り、解除と再ブロックのループを断ちます。 |
| `unblocked` | — | `blocked → ready`（親がまだ開いていれば `todo`）。手作業でも `/unblock` でも。ディスパッチャーの `consecutive_failures` をゼロに戻しますが、ループの遮断機が記憶を保てるよう `block_recurrences` は意図して残します。`run_id` は `NULL`。 |
| `archived` | — | 既定の盤から隠されました。タスクがまだ実行中だった場合、その副作用として回収された実行の `run_id` を運びます。 |

**編集**（遷移ではない、人による変更）:

| 種類 | 中身 | いつ |
|---|---|---|
| `assigned` | `{assignee}` | 担当者が変わった（解除を含む）。 |
| `edited` | `{fields}` | タイトルか本文が更新された。 |
| `reprioritized` | `{priority}` | 優先度が変わった。 |
| `status` | `{status}` | ダッシュボードのドラッグ&ドロップが状態を直接書いた（`todo → ready` など）。`running` から外へドラッグして回収された実行の `run_id` を運びます。それ以外では `run_id` は NULL です。 |

**ワーカーの状況**（論理的なタスクではなく、実行のプロセスについて）:

| 種類 | 中身 | いつ |
|---|---|---|
| `spawned` | `{pid}` | ディスパッチャーがワーカーのプロセスを無事に開始した。 |
| `heartbeat` | `{note?}` | 長い処理の間、生きていることを知らせるためにワーカーが `hermes kanban heartbeat $TASK` を呼んだ。 |
| `reclaimed` | `{stale_lock}` | 完了のないまま取り掛かりの TTL が切れた。タスクは `ready` へ戻ります。自動の回収は、`gave_up` の遮断機に向けて 1 回の不成功の試みとして数えられます（ワーカーを起動しなかった取り掛かりは、さもないと 取り掛かり → 回収 → 取り掛かり を永遠に繰り返します）。運用者による `reclaim` は、代わりに数え上げをゼロに戻します。 |
| `crashed` | `{pid, claimer, exit_kind?, exit_code?, worker_output?}` | ワーカーの PID はもう生きていないが、TTL はまだ切れていなかった。`worker_output` はワーカー自身のログの末尾（最後の応答か、描画されたプロバイダーのエラー。装飾を取り除いた 400 文字まで）で、タスクの `last_failure_error` にも書き足されるので、盤には終了コードだけでなく*理由*が出ます。 |
| `timed_out` | `{pid, elapsed_seconds, limit_seconds, sigkill}` | `max_runtime_seconds` を超えた。ディスパッチャーが SIGTERM を送り（5 秒の猶予のあと SIGKILL）、待ち行列へ戻しました。 |
| `stale` | `{elapsed_seconds, last_heartbeat_at, heartbeat_age_seconds, timeout_seconds, pid, terminated}` | タスクが `kanban.dispatch_stale_timeout_seconds`（既定 4 時間）より長く実行され、かつ直近 1 時間に `kanban_heartbeat` が来なかった。ディスパッチャーは（いれば）同じホストのワーカーに SIGTERM を送り、タスクを再度の振り分けのために `ready` へ戻します。失敗の数え上げは進めません（古びた状態はディスパッチャー側の不在の検知であって、ワーカーの落ち度ではないからです）。長い処理を走らせるワーカーは、これを避けるために少なくとも 1 時間に 1 回は `kanban_heartbeat` を呼んでください。 |
| `reconciled` | `{reason, claim_lock, claim_expires, worker_pid}` | 取り残されたカードの手当て: カードが `running` のまま取り掛かりの帳簿が壊れていて（`claim_lock` か `claim_expires` が NULL — 取り掛かりの途中での異常終了、手作業の SQL、DB の復元）、生きたワーカーもいないため、TTL / 異常終了 / 古びた状態のどの経路でも回復できなかった。ディスパッチャーが説明のコメントとともに `ready` へ戻しました。config.yaml の `kanban.reconcile_orphans`（既定 `true`）で制御します。 |
| `respawn_guarded` | `{reason}` | ディスパッチャーが、このまわりでは準備済みのこのタスクを起動し直すのを拒んだ。理由: `infrastructure_cooldown`（ホストが直前の起動を拒み — 再起動に耐える systemd のスコープがない — 冷却がまだ明けていない。カードの失敗としては決して数えません）、`rate_limit_cooldown`（直前の実行が利用枠の壁に当たった。同じ冷却で、やはり数えません）、`blocker_auth`（直前の失敗が利用枠 / 認証 / 429 のエラーだった — レート制限の時間帯が戻るのを待ちます）、`recent_success`（直近 1 時間に完了した実行がある — 再実行の前にレビューを待ちます）、`active_pr`（最近のコメントに GitHub の PR の URL がある — 以前のワーカーがすでに PR を開いています）。タスクは `ready` のままで、次のまわりに起動の機会がまた来ます。根本の状態が続く場合は、ふつうの `consecutive_failures` のサーキットブレーカーが `failure_limit` 回の失敗のあと `gave_up` で自動的にブロックします。 |
| `spawn_failed` | `{error, failures}` | 1 回の起動が失敗した（PATH がない、作業場所をマウントできない、など）。数え上げが増え、タスクは再試行のために `ready` へ戻ります。 |
| `protocol_violation` | `{pid, claimer, exit_code, protocol_violation, worker_output?}` | タスクがまだ `running` の間にワーカーが正常終了した。たいていは、盤への最後の呼び出し（`kanban_complete`、`kanban_request_review`、`kanban_block`）をせずに答えてしまった場合です。違反のたびに出ます（中身の `protocol_violation: true` の印は実行のメタデータへ写され、違反だけを数える再試行の予算に使われます）。予算の範囲内では — `_PROTOCOL_VIOLATION_FAILURE_LIMIT`（既定 3）回の*連続した*違反まで。タスクごとの `max_retries` が上書きします — タスクはもう一度試すために `ready` へ戻るだけです。連続が上限に達すると、ディスパッチャーは `gave_up` も出して自動でブロックします。`worker_output` はワーカー自身が最後に出力した文章（たいていは止まった理由の説明）で、`last_failure_error` にも畳み込まれ、再試行のワーカーには過去の試みのエラーとして示されます。 |
| `gave_up` | `{failures, effective_limit, limit_source, error, terminal_provider?}` | 不成功の試みが N 回続いてサーキットブレーカーが落ちた。タスクは最後のエラーとともに自動でブロックされます。実効の上限は、タスクの `max_retries`、次にディスパッチャーの `failure_limit` / `kanban.failure_limit`、それもなければ組み込みの既定値の順で決まります。`terminal_provider: true` は、再試行では直せないプロバイダーのエラー（資格情報の失効、モデルの消失）でワーカーが `78` で終了し、上限にかかわらず最初の試みで遮断機が落ち、貼り付いたことを意味します。 |

`hermes kanban tail <id>` は 1 つのタスクについてこれらを表示し、`hermes kanban watch` は盤全体を流します。

## 対象外 {#out-of-scope}

カンバンは意図して 1 台のホストで完結します。`~/.hermes/kanban.db` はローカルの SQLite のファイルで、ディスパッチャーは同じ機械でワーカーを起動します。2 台のホストで盤を共有する使い方には対応していません。「ホスト A のワーカー X、ホスト B のワーカー Y」を調整する部品はありませんし、異常終了の検知は PID が同じホストのものであることを前提にしています。複数のホストが必要なら、ホストごとに独立した盤を動かし、`delegate_task` やメッセージのキューで橋渡ししてください。
