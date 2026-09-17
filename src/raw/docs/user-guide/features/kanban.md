---
title: "カンバン（マルチエージェント盤）"
description: "複数の Hermes プロファイルを連携させる、SQLite に永続化されたタスク盤"
upstream_path: user-guide/features/kanban.md
upstream_blob: 8037c3acb04da48457a125536edb22e2e4247c19
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban
---

# カンバン — 複数プロファイルの協働 {#kanban-multi-agent-profile-collaboration}

> **手順を追って見たいときは。** [カンバンのチュートリアル](/hermes/docs/user-guide/features/kanban-tutorial/)をどうぞ。4 つの利用シーン（個人開発、大量アカウントの運用、再試行つきの役割パイプライン、サーキットブレーカー）を、それぞれのダッシュボード画面つきで追えます。このページは調べもの用、チュートリアルは物語として読むものです。

Hermes のカンバンは、手元のすべての Hermes プロファイルで共有される、消えないタスク盤です。プロセス内でサブエージェントを大量に走らせる壊れやすいやり方に頼らず、名前を持つ複数のエージェントが同じ仕事を分担できます。タスクはどれも `~/.hermes/kanban.db` の 1 行、引き継ぎもすべて誰もが読み書きできる 1 行、ワーカーはそれぞれ自分の身元を持った本物の OS プロセスです。

### 反復上限の手前に置く完了チェックポイント {#completion-checkpoints-before-the-iteration-cap}

ディスパッチャが持つワーカーには、限られた反復回数の 9 割あたりで一度だけ
チェックポイントの通知が届きます。ツールを呼べる回数がまだ残っているうちに、新しいツール結果へ添えて渡されます。
もっと早い段階で知らせたいときは `agent.budget_warning_ratio` を使ってください。反復回数がごく少ない場合でも、
最後から 2 回目までには必ず警告が出ます。1 回だけの実行にはチェックポイントの余地がありません。
通知は次のリクエストの前にセッションの記録へ保存されます。ワーカーは、タスクの約束どおりに仕上がったか
確かめてから `kanban_complete` を呼ぶか、そうでなければ途中経過をコメントとして残して作業を続けます。
コミットや差分があるだけでタスクが自動的に完了扱いになることはありません。

厳密な上限、ツールなしの最終要約、連続失敗のサーキットブレーカーはこれまでどおりです。
それでも反復を使い切ったワーカーは、回数を区切った再試行の対象になります。
これは報告の機会を作る仕組みであって、モデルが通知に必ず従う保証ではありません。
通常の会話や委譲された子エージェントは、このカンバンの自動チェックポイントを引き継ぎません。
そちらの反復警告は、これまでどおり自分で有効にする方式のままです。

### 2 つの入口 — モデルはツールで、あなたは CLI で話しかける {#two-surfaces-the-model-talks-through-tools-you-talk-through-the-cli}

盤には正面玄関が 2 つあり、どちらも同じ `~/.hermes/kanban.db` につながっています。

- **エージェントは専用の `kanban_*` ツール群で盤を操作します** — `kanban_show`、`kanban_list`、`kanban_complete`、`kanban_request_review`、`kanban_request_changes`、`kanban_block`、`kanban_heartbeat`、`kanban_comment`、`kanban_attach`、`kanban_attach_url`、`kanban_attachments`、`kanban_create`、`kanban_link`、`kanban_unblock`。ディスパッチャは各ワーカーを起動するとき、これらのツールをあらかじめスキーマに入れておきます。とりまとめ役のプロファイルでも `kanban` ツールセットを明示的に有効にできます。モデルはツールを直接呼んでタスクを読み、振り分けます。`hermes kanban` をシェルから実行するわけでは *ありません*。後述の [ワーカーは盤とどうやりとりするか](#how-workers-interact-with-the-board) を参照してください。
- **あなた（とスクリプト、cron）は CLI の `hermes kanban …`**、スラッシュコマンドの `/kanban …`、またはダッシュボードから盤を操作します。こちらは人と自動処理のための入口で、背後にツールを呼ぶモデルがいない場所です。

どちらの入口も同じ `kanban_db` 層を通るので、読み取りはいつも同じ状態が見え、書き込みがずれることもありません。このページの例が CLI 中心なのはコピーして試しやすいからで、CLI の各動詞にはモデルが使うツール呼び出しの対応版が必ずあります。

これは `delegate_task` では扱いきれない仕事の形をカバーします。

- **調査のさばき** — 並行して動く調査役 + 分析役 + 書き手、途中に人が入る形。
- **定期運用** — 毎日繰り返し、何週間もかけて日誌を積み上げるタイプ。
- **デジタルツイン** — 名前つきの常設アシスタント（`inbox-triage`、`ops-review`）が記憶を蓄えていく形。
- **開発パイプライン** — 分解 → 並行 worktree で実装 → レビュー → 反復 → PR。
- **大量の対象を回す仕事** — 1 人の専門役が N 個の対象を見る（SNS アカウント 50 件、監視対象サービス 12 件）。

代表的な協働パターン 8 種は、後述の [協働パターン](#collaboration-patterns) にまとめてあります。

## PR の完了条件 {#pr-completion-contracts}

PR を伴う仕事は、作成時に `--completion-contract OWNER/REPO` で宣言します（すでにある仕事なら
`https://github.com/OWNER/REPO/pull/123` のように正確な URL でも構いません）。`kanban_create` も同じ
`completion_contract` を受け取ります。意図してローカルで完結させる仕事には `local-only` を使ってください。既存のカードや
宣言のないカードは、この既定のままになります。本文に URL を書いただけでは条件になりません。

公開したあとは、完了時に `metadata.published_pr` を渡します。最初に一致した
URL がそのカードに永久に結びつき、再試行で別の（CI が通っている）PR に差し替えることはできません。
CLI の `show --json` と `kanban_show` が、保存された条件を表示します。

共通の `complete_task` 境界が、ワーカーのツール・CLI・レビュー承認・
ダッシュボードからの完了のすべてを覆います。従来のブランチ保護と有効なルールセットの
必須コンテキストを読み、ヘッドが一致するチェック実行と旧来のステータスをページ送りで集め、
そのうえで PR のヘッドとベースを読み直します。任意扱いの失敗・スキップの情報が、受理済みの
必須チェックを覆すことはありません。**必須**の証拠が欠けている、保留中、失敗、キャンセル、タイムアウト、
古い、スキップ、中立のいずれであってもカードは完了できません。実行 0 件での受理、読めない方針、
GitHub API の失敗も同じく不可です。必須チェックのないリポジトリには local-only の条件が要ります。`gh` は、
そのリポジトリのチェックとルールを読める状態で認証されている必要があります。この関門はリモートへ何も書き込みません。

却下されても、そのカードと作業場所は残ります。永続する `pr_acceptance` イベントに、
PR の URL、SHA、必須コンテキスト、チェックの ID と URL、分類、復旧の手順が記録されます。
`last_failure_error` が次の一手を示します。失敗を直すか、基盤側のチェックを流し直すか待つかしてから、
もう一度完了させてください。人の手が要るときは `kanban_block` を使います。GitHub が返す一般的な `failure` だけでは、
テストが落ちたのか成果物のアップロードが落ちたのかまでは分かりません。残っている URL を開いて確かめてください。
基盤側だと明示された結論と API の失敗は、別々に分類されます。追加のワーカーが起動されることはありません。

受領記録の保存と最終の書き込みは、実行・状態・条件の持ち主を 1 つの SQLite ロックの下で
確かめ直します。取り上げられたワーカーが、新しい実行を完了させたり受理を後付けしたりはできません。
最後の GitHub 読み取りは完了時点のスナップショットであって、分散トランザクションでも、
完了後に見張り続ける監視でもありません。これは 1 ユーザー分のライフサイクルを守る仕組みで、
データベースへ直接書き込まれる操作に対する OS レベルの隔離ではありません。GitHub Enterprise は
対象外です。公開とライフサイクル周りの関連作業は #91230、#84254、#52311。ローカルでの検証と公開だけでは、リモートの受理にはなりません。

## カンバンと `delegate_task` の違い {#kanban-vs-delegatetask}

見た目は似ていますが、同じ部品ではありません。

| | `delegate_task` | カンバン |
|---|---|---|
| 形 | RPC 呼び出し（分岐 → 合流） | 永続するメッセージキュー + 状態機械 |
| 親 | 子が返るまで待つ | `create` したら投げっぱなし |
| 子の身元 | 名前のないサブエージェント | 記憶を持ち続ける名前つきプロファイル |
| やり直し | なし — 失敗はそのまま失敗 | ブロック → 解除 → 再実行、クラッシュ → 取り戻し |
| 人の介在 | できない | いつでもコメント / ブロック解除ができる |
| 1 タスクあたりのエージェント数 | 1 回の呼び出し = サブエージェント 1 体 | タスクの生涯で N 体（再試行・レビュー・追撃） |
| 記録 | コンテキスト圧縮で消える | SQLite に永久に残る行 |
| 連携の形 | 上下関係（呼ぶ側 → 呼ばれる側） | 対等 — どのプロファイルもどのタスクも読み書きできる |

**一言でいうと。** `delegate_task` は関数呼び出し、カンバンは仕事の待ち行列で、引き継ぎのすべてが、どのプロファイル（や人）でも見て編集できる 1 行になります。

:::caution 助けを求めるカードを、その助けで動かしたいカードにつながない
`t_parent` でつまずいたワーカーが、足りない部分のための支援カードを作ったとき、**絶対に** `kanban_link(t_parent, t_support)` をしてはいけません。このリンクは支援カードを、止まっている親の *子* にしてしまいます。すると支援カードは、自分が助けようとしている親の後ろで待たされ、どちらも永久に動きません。代わりに、支援カードの本文で親の id に触れてください。`link` / `kanban_link` は `ready` の子を降格させるとき `gated: true` を返して `dependency_wait` イベントを記録します（`parents` つきの `kanban_create` が新しいカードを待たせるときも同じです）。おかげで行き詰まりは盤の上で見えます。`hermes kanban unlink <parent> <child>` で解放できます。
:::

**`delegate_task` を使う場面。** 親エージェントが先へ進むために短い推論の答えを必要としていて、人が関わらず、結果がそのまま親の文脈に戻ればよいとき。

**カンバンを使う場面。** 仕事がエージェントの境界をまたぐとき、再起動をまたいで残ってほしいとき、人の入力が要るかもしれないとき、別の役割が引き取るかもしれないとき、あとから探せる形にしたいとき。

両者は共存します。カンバンのワーカーが実行中に `delegate_task` を内部で呼んでも構いません。

## 基本の考え方 {#core-concepts}

- **盤（board）** — 独立した SQLite の DB、作業ディレクトリ、ディスパッチャのループを
  持つ、タスクの待ち行列。1 つのインストールに盤をいくつも置けます
  （プロジェクトごと、リポジトリごと、領域ごとなど）。後述の [盤を分ける（複数プロジェクト）](#boards-multi-project)
  を参照してください。単一プロジェクトで使う人は `default` の盤のままでよく、この節の外で
  「盤」という言葉に出会うことはありません。
- **タスク** — タイトル、任意の本文、担当者 1 人（プロファイル名）、状態（`triage | todo | ready | running | blocked | review | done | archived`）、任意のテナント名前空間、任意の冪等キー（自動処理の再送で重複を防ぐ）を持つ 1 行。
- **リンク** — 親 → 子の依存関係を記録する `task_links` の行。すべての親が `done` になると、ディスパッチャが `todo → ready` へ上げます。
- **コメント** — エージェント同士の通信手段。エージェントも人もコメントを追記でき、ワーカーが（再）起動されるときには、コメントの流れ全体が文脈の一部として読み込まれます。
- **作業場所（workspace）** — ワーカーが作業するディレクトリ。3 種類あります。
  - `scratch`（既定） — `~/.hermes/kanban/workspaces/<id>/` の下に作られる新しい一時ディレクトリ（既定以外の盤では `~/.hermes/kanban/boards/<slug>/workspaces/<id>/`）。**タスクが完了すると消えます** — 使い捨てとして設計されています。`kanban_complete(artifacts=[...])` や `kanban_request_review(artifacts=[...])` で明示的に申告されたファイルは、片付けの前に、タスクごとの永続的な添付保管場所へコピーされます（レビューへの引き継ぎでは引き継ぎの時点で退避されます。使い捨ての作業場所を消すのは、後でレビュー担当が完了させたときだからです）。旧来の完了要約に書かれた成果物のパスも、実在すれば同じ扱いになります。それ以外の使い捨てファイルは削除されます。申告した成果物が見つからないときはタスクを進行中のままにするので、ワーカーはパスを直して再試行できます。作業場所ごと残したいときは `worktree:` か `dir:<path>` を使ってください。あるインストールで初めて使い捨ての作業場所が作られたとき、ディスパッチャは警告をログに出し、そのタスクに `tip_scratch_workspace` イベントを出します（`hermes kanban show <id>` で見えます）。
  - `dir:<path>` — すでにある共有ディレクトリ（Obsidian の保管庫、メール運用のディレクトリ、アカウントごとのフォルダなど）。**絶対パスである必要があります。** `dir:../tenants/foo/` のような相対パスは起動時に拒否されます。ディスパッチャがたまたまいる作業ディレクトリを基準に解決されてしまい、あいまいなうえ、権限を勝手に借りる抜け道になるからです。それ以外の点でパスは信頼されます。あなたの機械、あなたのファイルシステムで、ワーカーはあなたの uid で動きます。これは「ローカルの利用者は信頼する」という前提で、カンバンは設計上 1 台のホストで完結します。**完了しても残ります。**
  - `worktree` — コーディング作業のための `.worktrees/<id>/` 配下の git worktree。置き場所を固定したいときは `worktree:<path>` を使います。ワーカー側の `git worktree add` が作り、指定があれば `--branch` を渡します。**完了しても残ります。**
- **ディスパッチャ** — N 秒ごと（既定 60 秒）に動く常駐ループ。古くなった占有を解除し、落ちたワーカーを回収し（PID は消えたが TTL がまだ切れていないもの）、実行が終わったのに生き残っているワーカーを片付け（自分で `kanban_complete` / `kanban_block` を呼んだあともまだ生きているワーカーは、実行が閉じてから 2 分後に終了させます。最後のひと呼吸ぶんの猶予です。PID *と* 起動時刻の指紋の両方で照合するので、使い回された PID にシグナルが飛ぶことはありません。`terminal_worker_reaped` イベントとして記録されます）、準備のできたタスクを昇格させ、競合しない形で占有し、割り当てられたプロファイルを起動します。既定では**ゲートウェイの中で**動きます（`kanban.dispatch_in_gateway: true`）。1 つのディスパッチャが 1 回の周回ですべての盤を見ますが、ワーカーは `HERMES_KANBAN_BOARD` を固定した状態で起動されるので、他の盤は見えません。同じタスクで起動失敗が `kanban.failure_limit` 回続くと（既定 2 回）、ディスパッチャは最後のエラーを理由にしてそのタスクを自動でブロックします。存在しないプロファイルや、マウントできない作業場所などで、同じ失敗を繰り返すのを防ぐためです。
- **テナント** — 盤の *中* で使える任意の名前空間。1 つの専門役の集団が、作業場所のパスと記憶キーの接頭辞でデータを分けながら、複数の事業（`--tenant business-a`）に対応できます。テナントはゆるい絞り込みで、きっちりした分離の境界は盤のほうです。

## 盤を分ける（複数プロジェクト） {#boards-multi-project}

盤を使うと、関係のない仕事の流れを — プロジェクトごと、リポジトリごと、
領域ごとに — 別々の待ち行列へ分けられます。入れたばかりの状態では
`default` という盤が 1 つだけあります（DB は後方互換のため `~/.hermes/kanban.db`）。
仕事の流れが 1 本で足りる人は、盤のことを知る必要がありません。使いたい人だけが
使う機能です。

盤ごとの分離は徹底しています。

- 盤ごとに別の SQLite DB（`~/.hermes/kanban/boards/<slug>/kanban.db`）。
- `workspaces/` と `logs/` のディレクトリも別。
- あるタスクのために起動されたワーカーには、その盤のタスク **だけ** が見えます。
  ディスパッチャが子プロセスの環境に `HERMES_KANBAN_BOARD` を設定し、ワーカーが使える
  `kanban_*` ツールはすべてそれを読みます。
- 盤をまたいでタスクをつなぐことはできません（スキーマを単純に保つためです。
  どうしてもプロジェクトをまたいで参照したいときは、本文に id を書いて
  手で引くようにしてください）。

### CLI で盤を管理する {#managing-boards-from-the-cli}

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

どの盤を使うかは、次の順で決まります（上ほど優先）。

1. CLI 呼び出しでの明示的な `--board <slug>`。
2. `HERMES_KANBAN_BOARD` 環境変数（ワーカー起動時にディスパッチャが設定するので、
   ワーカーからは他の盤が見えません）。
3. `~/.hermes/kanban/current` — `hermes kanban
   boards switch` が書き込んだ slug。
4. `default`。

slug は検査されます。小文字の英数字 + ハイフン + アンダースコアで、1〜64
文字、先頭は英数字。大文字で入力すると自動で小文字になります。
それ以外（スラッシュ、空白、ドット、`..`）は CLI の層で拒否されるので、
パスをたどる小細工で盤に名前を付けることはできません。

### ダッシュボードで盤を管理する {#managing-boards-from-the-dashboard}

`hermes dashboard` → カンバンのタブでは、盤が 2 つ以上になるか、どれかの盤に
タスクが入った時点で、上部に盤の切替が出ます。盤が 1 つだけの人には
小さな `+ New board` ボタンだけが見え、切替は必要になるまで隠れています。

- **盤のドロップダウン** — 使う盤を選びます。選択はブラウザの
  `localStorage` に保存され、再読み込みしても残ります。開いたままの端末の下で
  CLI 側の `current` が勝手に動くことはありません。
- **+ New board** — slug、表示名、説明、アイコンを尋ねるモーダルが開きます。
  作った盤へそのまま切り替えるかどうかも選べます。
- **Settings** — いまの盤の表示名、説明、**プロジェクトディレクトリ**
  （`default_workdir`）を編集するモーダルが開きます。プロジェクト
  ディレクトリは、新しいタスクが引き継ぐ盤レベルの作業場所の既定値です
  （git リポジトリなら残る worktree、ふつうのディレクトリならそのまま残る
  ディレクトリ）。タスクごとに作成時の上書きもできます。この欄を空にすると、
  新しいタスクは使い捨ての作業場所に戻ります。
- **Archive** — `default` 以外の盤にだけ出ます。確認のうえ、盤の
  ディレクトリを `boards/_archived/` へ移します。

ダッシュボードの API はどれも `?board=<slug>` で盤を指定できます。
イベントの WebSocket は接続時に盤へ固定されるので、画面で切り替えると
新しい盤に対して別の WS が開きます。

## ファイルの添付 {#file-attachments}

タスクにはファイルを添付できます — PDF、画像、元資料など。パスを本文に貼って
見つけてくれることを祈らなくても、ワーカーが必要な材料を手にできます。

- **アップロード** — ダッシュボードの引き出しでタスクを開き、
  **Attachments** 欄の *Upload file* ボタンを使います（複数同時でも
  構いません）。1 ファイルあたり 25 MB までです。
- **保管場所** — 既定の盤では
  `<hermes-home>/kanban/attachments/<task_id>/` の下、名前つきの盤では
  `<hermes-home>/kanban/boards/<slug>/attachments/<task_id>/` の下に置かれます。
  場所を指定したいときは `HERMES_KANBAN_ATTACHMENTS_ROOT` を設定してください。
- **ワーカーから見えるもの** — ディスパッチャがタスクをワーカーへ渡すとき、
  ワーカーの文脈には **Attachments** の節が入り、各ファイルの名前と
  **絶対パス** が並びます。ワーカーはファイルと端末のツールを自由に使えるので、
  添付をそのまま読めます（`read_file` や、`pdftotext` のような端末のコマンド）。
- **ダウンロードと削除** — 引き出しには添付ごとにダウンロードのリンクと
  削除（×）が並びます。削除すると、メタデータの行とディスク上のファイルの両方が消えます。

:::note リモートの端末バックエンド
添付のパスは **ローカル** の端末バックエンド上でそのまま解決されます。カンバンの
ワーカーはこれが既定です。リモートのバックエンド（Docker、Modal）でワーカーを動かす場合は、
ワーカーの文脈にある絶対パスへ届くように、その盤の `attachments/` ディレクトリを
サンドボックスへマウントしてください。
:::

## クイックスタート {#quick-start}

以下のコマンドは、**あなた**（人間）が盤を用意してタスクを作る操作です。タスクに担当が付くと、ディスパッチャが担当プロファイルをワーカーとして起動し、そこから先は **モデルが CLI ではなく `kanban_*` のツール呼び出しでタスクを進めます** — [ワーカーは盤とどうやりとりするか](#how-workers-interact-with-the-board) を参照してください。

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

ディスパッチャが `t_abcd` を拾って `researcher` プロファイルを起動すると、そのワーカーのモデルがまずやることは、自分のタスクを読むための `kanban_show()` の呼び出しです。`hermes kanban show t_abcd` を実行するわけではありません。

### ゲートウェイ内蔵のディスパッチャ（既定） {#gateway-embedded-dispatcher-default}

ディスパッチャはゲートウェイのプロセスの中で動きます。入れるものも、別に
面倒を見るサービスもありません。ゲートウェイが上がっていれば、準備のできた
タスクは次の周回（既定 60 秒）で拾われます。

```yaml
# config.yaml
kanban:
  dispatch_in_gateway: true        # default
  dispatch_interval_seconds: 60    # default
  review_dispatch: true            # default: spawn the assigned profile with
                                   # the bundled sdlc-review skill. Set false
                                   # for human-only review boards.
  dispatch_profiles: null           # default: this home may claim cards for any
                                   # existing profile. Set to a list (or
                                   # comma-separated string) of profile names to
                                   # restrict which assignees this home claims;
                                   # fail-closed, an empty list claims nothing.
```

デバッグのときは `HERMES_KANBAN_DISPATCH_IN_GATEWAY=0` で実行時に設定を
上書きできます。ゲートウェイの面倒の見方はふだんどおりで、`hermes gateway
start` を直接実行するか、ゲートウェイを systemd のユーザーユニットにします
（ゲートウェイのドキュメントを参照）。ゲートウェイが動いていないと、`ready` の
タスクは上がってくるまでそのまま止まります。`hermes kanban create` は作成時に
そのことを警告します。

`hermes kanban daemon` を別プロセスとして走らせる方法は **非推奨** です。
ゲートウェイを使ってください。どうしてもゲートウェイを動かせない場合
（画面のないホストの方針で常駐サービスが禁じられている、など）に備えて、
`--force` の逃げ道が旧来の単独デーモンを 1 リリースぶん生かしてあります。ただし、
同じ `kanban.db` に対してゲートウェイ内蔵のディスパッチャと単独デーモンを
両方動かすと占有の取り合いが起き、これは対象外です。

### 複数のホーム間で盤を共有する {#shared-boards-across-homes}

1 つの `kanban.db` を複数の Hermes ホーム（コンテナ、多数のホスト）でマウントすれば
盤を共有できます。ただしプロファイル名はホームごとに閉じていて、どのホームにも
`default` という root プロファイルがあるので、`default` は構造上かならずぶつかります。ディスパッチャの起動
判定は *占有しようとしている* ホームに対して `profile_exists(assignee)` を確かめるだけなので、追加の設定がなければ
どのホームのディスパッチャも `default` 宛てのカードを占有できると判断し、意図しないホームが拾って
実行してしまいます。共有する盤では、ホームごとにプロファイル名をユニークにして
`default` にカードを割り当てないようにするか、ホームごとに `kanban.dispatch_profiles` を設定して、
そのホームが占有してよい担当者を厳密に宣言してください。それ以外はディスパッチャの
`skipped_nonspawnable` に入って起動されず、ゲートウェイの起こし判定でも
起動対象の仕事として数えられなくなります。

### 冪等な作成（自動処理 / webhook 向け） {#idempotent-create-for-automation-webhooks}

```bash
# First call creates the task. Any subsequent call with the same key
# returns the existing task id instead of duplicating.
hermes kanban create "nightly ops review" \
    --assignee ops \
    --idempotency-key "nightly-ops-$(date -u +%Y-%m-%d)" \
    --json
```

### まとめて指示する CLI の動詞 {#bulk-cli-verbs}

ライフサイクル系の動詞はどれも id を複数受け取るので、まとめて
片付けられます。

```bash
hermes kanban complete t_abc t_def t_hij --result "batch wrap"
hermes kanban archive  t_abc t_def t_hij
hermes kanban unblock  t_abc t_def
hermes kanban block    t_abc "need input" --ids t_def t_hij
```

:::note ブロックを解除したタスクの行き先
`unblock` は安全な元の段階へ戻します。親が片付いているレビュー由来の仕事は **`review`**、
親が片付いている実装の仕事は **`ready`**、まだ開いている親があるうちは **`todo`** です。`todo` に入ったタスクは
どの段階から来たかを覚えていて、依存の関門が開けば自動的に `review` か `ready` へ
戻ります。`unblock` が直接 `triage` へ送ることはありません。

ブロックを解除したタスクがあとで **`triage`** に現れたなら、それを置いたのは
解除ではありません。*同じ理由での再ブロック* です。ブロック → 解除 → 同じ原因で再ブロック、を
`BLOCK_RECURRENCE_LIMIT` 回（既定 `2`）繰り返すと、解除ループの遮断器が働いて
`blocked` へ戻すのをやめ — cron がひたすら解除し続けるだけの場所です —
とりまとめの目が届く `triage` へ回します。これは LLM の判断ではなく DB の決まりきった守りで、
タスクの本文で抜けることはできません。繰り返し回数のカウンタは解除をまたいで
わざと残ります（リセットされるのは `complete` が成功したときだけです）。解除した
タスクを仕事の流れに残したいなら、解除する前に *なぜ再ブロックが続くのか*（親が終わっていない、
入力が足りない、能力が足りない）を解いてください。ループが想定どおりなら
`BLOCK_RECURRENCE_LIMIT` を上げます。
:::

## チャット用プロファイルでツールを有効にする {#enabling-tools-for-a-chat-profile}

デスクトップのカンバンプラグインは盤を表示するだけで、チャットのエージェントに
タスクを動かす権限を与えるものではありません。仕事を差配させたいプロファイルと
プラットフォームで `kanban` ツールセットを有効にしてください。

```bash
hermes -p planner tools enable kanban                      # CLI / TUI / Desktop chats
hermes -p planner tools enable kanban --platform telegram  # a gateway platform
```

プラットフォームごとの選択は `config.yaml` の `platform_toolsets.<platform>` に
入ります。このツールセットは `hermes tools` とダッシュボードのチェックボックスでもあります。
これを持つゲートウェイのエージェントはチャットから `kanban_create` でき、そのタスクの
完了・ブロック通知を同じスレッドで自動的に受け取ります。設定を変えたら新しいチャットを
始めてください。すでに始まっている会話はツールのスキーマとプロンプトのキャッシュを
そのまま保ちます。`agent.disabled_toolsets` は変わらず最終権限を持ちます。旧来のトップレベルの
`toolsets: [kanban]` は、プラットフォームごとの選択が保存されていないときの代替としてだけ
効きます。`all` だけではカンバンを有効にしたことになりません。

ディスパッチャが持つワーカーには、タスクのライフサイクル用ツールが自動で渡されます。
`delegate_task` の子に、盤を書き換える権限はありません。

## ワーカーは盤とどうやりとりするか {#how-workers-interact-with-the-board}

**ワーカーは `hermes kanban` をシェルから実行しません。** ディスパッチャはワーカーを起動するとき、子プロセスの環境に `HERMES_KANBAN_TASK=t_abcd` を設定します。この環境変数が、モデルのスキーマにある専用の **カンバンツールセット** を有効にします。同じツールセットは、ツールセット設定で `kanban` を有効にしたとりまとめ役のプロファイルでも使えます。これらのツールは、CLI と同じく Python の `kanban_db` 層を通して直接、盤を読み書きします。動いているワーカーは他のツールと同じようにこれらを呼ぶだけで、`hermes kanban` の CLI を見ることも必要とすることもありません。

| ツール | 役割 | 必須の引数 |
|---|---|---|
| `kanban_show` | いまのタスクを読む（タイトル、本文、過去の試行、親からの引き継ぎ、コメント、整形済みの `worker_context` 全文）。既定では環境変数のタスク id を使う。 | — |
| `kanban_list` | `assignee`、`status`、`tenant`、アーカイブの表示、件数の上限で絞ってタスクの要約を並べる。盤の仕事を見つけるとりまとめ役向け。 | — |
| `kanban_complete` | `summary` + `metadata` の構造化された引き継ぎで仕上げる。 | `summary` / `result` のいずれか |
| `kanban_request_review` | 同じカードのままレビューを始める。永続する `summary`、任意の `metadata`、任意のレビュー担当プロファイルを渡す。タスクは `review` へ移る。ブロックではない。 | `summary` |
| `kanban_request_changes` | 進行中のレビューからのレビュー担当の判定。その実行を閉じ、親の関門をかけ直し、元の実装担当へ戻す。ブロックの回数には数えない。 | `reason` |
| `kanban_block` | 作業を止め、理由で行き先を決める。`kind=dependency`（`todo` で待ち、自動で再開）、`needs_input` / `capability` / `transient`（人に知らせる）。同じ種類の再ブロックが続くと自動で `triage` へ上がる。 | `reason` |
| `kanban_heartbeat` | 長い処理の間、生きていることを知らせる。副作用だけのツール。 | — |
| `kanban_comment` | タスクの流れに消えないメモを追記する。 | `task_id`、`body` |
| `kanban_attach` | 中身（base64）を直接渡してファイルをタスクに添付する。タスクの添付ディレクトリに保存される（25 MB まで）。 | ファイルの中身と名前 |
| `kanban_attach_url` | URL でファイルをタスクに添付する。 | `url` |
| `kanban_attachments` | タスクの添付を並べる。 | — |
| `kanban_create` | （とりまとめ役向け）`assignee`、任意の `parents`、`skills` などを付けて子タスクへ広げる。開いている親のせいで新しいカードが `todo` で待つときは `gated: true` + `gated_by` を返す。 | `title`、`assignee` |
| `kanban_link` | （とりまとめ役向け）あとから `parent_id → child_id` の依存を足す。子が `ready` だったのに親が未完了で `todo` へ降格したときは `gated: true` を返す。子は親が終わってから動く。 | `parent_id`、`child_id` |
| `kanban_unblock` | （とりまとめ役向け）ブロックされたタスクを元の段階（`review` か `ready`）へ戻す。親がまだ開いていれば `todo`。 | `task_id` |

ワーカーの典型的な一手番はこうなります。

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

**とりまとめ役** のワーカーは、代わりに仕事を広げます。

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

「（とりまとめ役向け）」のツール — `kanban_list`、`kanban_create`、`kanban_link`、`kanban_unblock`、それに他人のタスクへの `kanban_comment` — は同じツールセットから使えます。慣例として（自動で差し込まれるカンバンの手引きに書かれています）、ワーカーのプロファイルは仕事を広げたり無関係な仕事を振り分けたりせず、とりまとめ役のプロファイルは実装をしません。ディスパッチャが起動したワーカーは、壊す方向のライフサイクル操作については自分のタスクに閉じたままで、関係のないタスクを書き換えることはできません。

### `hermes kanban` を叩かずツールにする理由 {#why-tools-instead-of-shelling-to-hermes-kanban}

3 つあります。

1. **バックエンドを問わないこと。** 端末ツールがリモートのバックエンド（Docker / Modal / Singularity / SSH）を指しているワーカーは、`hermes kanban complete` をコンテナの *中* で実行してしまいます。そこには `hermes` が入っておらず、`~/.hermes/kanban.db` もマウントされていません。カンバンのツールはエージェント自身の Python プロセスで動くので、端末のバックエンドが何であっても必ず `~/.hermes/kanban.db` に届きます。
2. **シェルの引用符で壊れないこと。** `--metadata '{"files": [...]}'` を shlex と argparse に通すのは、いつか足を撃つ仕掛けです。構造化されたツールの引数なら、そこを丸ごと飛ばせます。
3. **エラーが分かりやすいこと。** ツールの結果はモデルが考えられる構造化された JSON で、解釈しなければならない標準エラー出力の文字列ではありません。

**ふだんのセッションにスキーマの負担はゼロ。** ふつうの `hermes chat` のセッションには、そのプロファイルがとりまとめ用に `kanban` ツールセットを明示的に有効にしていないかぎり、`kanban_*` のツールは 1 つも入りません。ディスパッチャが起動したワーカーは `HERMES_KANBAN_TASK` が設定されているのでタスクに閉じたツールを受け取り、とりまとめ役のプロファイルは設定を通してより広い差配の手段を受け取ります。カンバンを使わない人のところでツールが膨らむことはありません。

自動で差し込まれるカンバンの手引きが、どのツールをいつ、どの順で呼ぶかをモデルに教えます。差し込まれるのは、そのタスクを持つディスパッチャ起動のワーカーだけです。`kanban` ツールセットを有効にしているだけの対話セッションは、ツールは持っていても「タスクが 1 つ割り当てられている」とは告げられません。ワーカーの中から起動された `delegate_task` の子や cron の実行は — `HERMES_KANBAN_TASK` を受け継ぎますが — ワーカーの手順を受け取ることもなく、自分の手番の回数を使い切ってもワーカーのカードに結果を書き込むこともありません。

### 引き継ぎに残しておきたい証拠 {#recommended-handoff-evidence}

`kanban_complete(summary=..., metadata={...})` はわざと自由な形にしてあります。
summary は人が読む締めくくり、`metadata` は下流のエージェントやレビュー担当、
ダッシュボードが、文章を読み解かずに再利用できる機械向けの引き継ぎです。

開発とレビューの仕事では、次の形の（任意の）メタデータをおすすめします。

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

これらのキーは慣例であって、スキーマの決まりではありません。大事なのは、
どのワーカーも次に読む人が 4 つの問いにすぐ答えられるだけの証拠を残す、という
ところです。

1. 何が変わったか。
2. どうやって確かめたか。
3. 失敗したとき、何があれば解除・再試行できるか。
4. どのリスクを承知のうえで残したか。

秘密の情報、生のログ、トークン、OAuth の資格情報、関係のない会話の記録は
`metadata` に入れないでください。代わりに、場所を指す情報と要約を置きます。ファイルも
テストもないタスクなら、そのことを `summary` にはっきり書き、`metadata` には実際にある証拠 —
出典の URL、issue の id、手作業のレビュー手順など — を入れてください。

### ワーカーのライフサイクル {#the-worker-lifecycle}

カンバンのタスクを扱うプロファイルは、どれも自動的にワーカーのライフサイクルを受け取ります。起動時にワーカーのシステムプロンプトへ差し込まれるので（`KANBAN_GUIDANCE` のブロック）、**入れるものも設定するものもありません**。CLI コマンドではなく **ツール呼び出し** で、流れ全体を教えます。

1. 起動したら `kanban_show()` を呼び、タイトル + 本文 + 親からの引き継ぎ + 過去の試行 + コメントの流れ全体を読む。
2. （端末ツールで）`cd $HERMES_KANBAN_WORKSPACE` して、そこで作業する。
3. 長い処理の間は数分おきに `kanban_heartbeat(note="...")` を呼ぶ。**1 時間を超えそうな作業なら、少なくとも 1 時間に 1 回は `kanban_heartbeat` を呼ぶ** こと。ディスパッチャは、`kanban.dispatch_stale_timeout_seconds`（既定 4 時間）を超えて動き続け、直近 1 時間に鼓動のないタスクを、ワーカーが後始末せずに落ちたとみなして取り戻します。取り戻し自体は害のない動きですが（失敗カウンタを進めずに `ready` へ戻して再配分するだけです）、いま走っている実行の成果は失われます。
4. `kanban_complete(summary="...", metadata={...})` で仕上げるか、行き詰まったら `kanban_block(reason="...")` を呼ぶ。

最後の `kanban_complete` / `kanban_block` の呼び出しは、ワーカーの手順の一部です。
タスクがまだ `running` のままワーカーのプロセスが status 0 で終わると、
ディスパッチャはそれを手順違反とみなして `protocol_violation` イベントを出します。
そのため、手番に失敗したディスパッチャ起動のワーカーは 0 以外で終了します。ふつうの
失敗は `1`、プロバイダがレート制限・過負荷・5xx・タイムアウトだったときや、
アカウントが課金や上限の壁に当たったときは `75`（`EX_TEMPFAIL`）です。ディスパッチャはその実行を `rate_limited` として記録し、
失敗に数えずタスクを待ち行列へ戻すので、上限の待ち時間が手順違反として
記録されることはありません。

**エージェント側の予防。** ワーカーが終わる前に、盤への締めのツール呼び出しなしに
モデルが止まろうとしているのを見つけると、Hermes は最大 2 回まで人工的なひと押しを
差し込みます。「レポートを書きますね」と次の手順を語って `finish_reason=stop` で
止まってしまう、よくある形を捕まえるためです。ひと押しは、いますぐ
`kanban_complete` か `kanban_block` を呼ぶようモデルに思い出させます。この
守りが働くのは、ディスパッチャが起動したワーカー自身だけです（`HERMES_KANBAN_TASK` が
設定されていて、その実行がタスクを持っている場合）。ワーカーの中で動く `delegate_task` の子や cron の仕事は
変数こそ受け継ぎますが、盤のツールを持たないのでひと押しの対象にはなりません。
`HERMES_KANBAN_STOP_NUDGE=0` で無効にできます。

**ディスパッチャ側の立て直し。** ひと押しを使い切ったか、そこへ届く前にワーカーが落ちた場合、
ディスパッチャはその違反に **回数を区切った再試行** を与えます
（連続する違反が `_PROTOCOL_VIOLATION_FAILURE_LIMIT` 回まで、既定 3 回）。
それを超えると、同じループへ投げ直す代わりにタスクを自動でブロックします。
この予算が数えるのは *連続した* きれいな終了の手順違反だけで、間に入った
レート制限による待ち行列戻しは中立、それ以外の種類の失敗は連続を
リセットします。タスクごとの `max_retries` があればそちらが優先されます。たいていは、
モデルがただの文章で答え、カンバンのツールを使わずに終わったということです。

ライフサイクルに加えて、要となる詳細（作業場所の種類、成果物の `artifacts`、作ったカードの占有）も同じシステムプロンプトのブロックに入っています。どのプロファイルで動いても、すべてのワーカーがそれを持つので、プロファイルごとにスキルを用意する必要はありません。

**ワーカーのセッション名。** ワーカーのセッションは、起動時に自分のカードの名前（`Fix the swap modal`、盤の行が読めないときは `Kanban task <id>`）が付きます。そのため `hermes sessions` やセッション検索には、モデルの当て推量ではなくカードの名前が出ます。ワーカーは、対話セッションに名前を付ける補助的な `title_generation` の呼び出しをしません。ワーカーのセッションで手動の `/title` を打てば、そちらが優先されます。

### 特定のタスクにスキルを追加する {#pinning-extra-skills-to-a-specific-task}

担当プロファイルがふだん持っていない専門知識が、1 つのタスクにだけ必要なことがあります。`translation` スキルが要る翻訳の仕事、`github-code-review` が要るレビュー、`security-pr-audit` が要るセキュリティ監査などです。そのたびに担当プロファイルを編集するのではなく、スキルをタスクへ直接付けてください。

**とりまとめ役のエージェントから**（あるエージェントが別のエージェントへ仕事を回す、いちばん多い形）は、`kanban_create` ツールの `skills` 配列を使います。

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

**人から（CLI / スラッシュコマンド）** は、`--skill` を必要な数だけ繰り返します。

```bash
hermes kanban create "translate README to Japanese" \
    --assignee linguist \
    --skill translation

hermes kanban create "audit auth flow" \
    --assignee reviewer \
    --skill security-pr-audit \
    --skill github-code-review
```

**ダッシュボードから** は、タスク作成ダイアログの **skills** 欄にカンマ区切りで打ち込みます。

ディスパッチャは並べたスキルごとに `--skills <name>` のフラグを 1 つずつ出すので、自動で差し込まれるカンバンの手引きに加えて、すべてのスキルを読み込んだ状態でワーカーが起動します。スキル名は、担当プロファイルに実際に入っているスキルと一致していなければなりません（`hermes skills list` で確かめられます）。実行時にインストールする仕組みはありません。

### タスクごとのモデル指定 {#per-task-model-override}

担当プロファイルの既定とは別に、そのタスクのワーカーだけ特定のモデル（必要ならプロバイダも）に固定できます。

```bash
# At creation
hermes kanban create "hard refactor" --assignee coder \
    --model claude-opus-4.6 --provider anthropic

# Or later — takes effect on the next dispatch
hermes kanban set-model t_abcd claude-opus-4.6 --provider anthropic
hermes kanban set-model t_abcd none    # clear the override
```

ディスパッチャは固定されたモデルでワーカーを起動します（設定されていれば `--provider <name>` を渡します。`--provider` にはモデルの指定が要ります）。ダッシュボードのタスクごとのモデル選択も、同じ `model_override` の項目を動かします。指定がなければ、ワーカーは自分のプロファイルに設定されたモデルを使います。

### 費用の組み立て — とりまとめは最上位、ワーカーは安いモデルで {#cost-strategy-frontier-orchestrator-inexpensive-workers}

カンバンはプロファイルごとに設定を持てるので、計画役とワーカーで費用を分けるのが自然にできます。プロジェクトをきちんと切り分けたカードへ分解するには最上位級の判断が要りますが、目標も文脈も引き継ぎの証拠もそろったカードをこなすほうには、たいてい要りません。しかもトークンの大半を使うのはワーカーなので、費用が乗るのはワーカーのモデルです。とりまとめ役（ディスパッチャ）のプロファイルは最上位のモデルで動かし、ワーカーのプロファイルは安いモデルに向けましょう。プロファイルはそれぞれ `~/.hermes/profiles/<name>/` の下に自分の `config.yaml` を持ち、ディスパッチャは `hermes -p <assignee>` を起動するときにそのプロファイル用の `HERMES_HOME` を渡すので、各ワーカーは自分のプロファイルのモデル設定を読みます。

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

たまに出てくる品質の要るカードは、[タスクごとのモデル指定](#per-task-model-override)（作成時の `--model` / `--provider`、あとからの `hermes kanban set-model`、ダッシュボードのモデル選択）でそのタスクだけ強いモデルに戻せます。プロファイルをいじる必要はありません。

### ライフサイクルのプラグインフック {#lifecycle-plugin-hooks}

盤の状態が変わると [プラグインフック](/hermes/docs/user-guide/features/hooks/#plugin-hooks) が発火します。`kanban_task_claimed`、`kanban_task_completed`、`kanban_task_blocked` の 3 つで、それぞれ `task_id` と `profile_name` を運びます。フックが走るのは盤の DB の変更がコミットされた **あと** なので、コールバックからはいつも確定した状態が見えます。プロセスが分かれている点に注意してください。`kanban_task_claimed` は **ディスパッチャ** のプロセスで、`kanban_task_completed` / `kanban_task_blocked` は **ワーカー** のプロセスで発火します。すべての変化を一か所で観測したいなら、ディスパッチャのプロファイルにフックを登録してください。

```python
def register(ctx):
    def on_blocked(task_id=None, profile_name=None, **kw):
        ctx.dispatch_tool("terminal", {"command": f"notify-send 'kanban blocked: {task_id}'"})
    ctx.register_hook("kanban_task_blocked", on_blocked)
```

### ゴール方式のカード（`--goal`） {#goal-mode-cards---goal}

既定では、ワーカーは自分のカードに **一発勝負** で挑みます。作業して、`kanban_complete` / `kanban_block` を呼んで、終了です。`--goal`（CLI）や `goal_mode=True`（`kanban_create` ツール / ダッシュボード）を渡すと、代わりにそのワーカーを **ゴールのループ** で動かせます。`/goal` スラッシュコマンドの裏にあるのと同じ Ralph 方式の仕組みです。毎回の手番のあと、補助の判定役がワーカーの出力をカードのタイトル + 本文（受け入れ条件とみなされます）と突き合わせ、まだ終わっていなくて手番の余裕が残っていれば、ワーカーは **同じセッションのまま** 続きます。判定役が納得するか、ワーカー自身がタスクを終わらせるか、手番を使い切るか（このときは黙って終わるのではなく、人のレビューのためにカードを **ブロック** します）まで続きます。書かれたとおりではゴールが **達成不可能** だと判定役が判断した場合、カードはその理由とともに即座にブロックされます。無理なカードが done になることはなく、そのカードに対する `kanban complete` / `kanban request-review` は、`kanban block` か組み直しを促して拒否されます。

```bash
hermes kanban create "Translate the docs site to French" \
    --body "Acceptance: every page translated, no English left, links intact." \
    --assignee linguist \
    --goal \
    --goal-max-turns 15      # optional; default 20
```

終わりの見えない仕事、手数の多い仕事、「X になるまで続ける」タイプのカードに向いています。安上がりな一発仕事には使わないでください。毎手番の判定の手間に見合いませんし、ディスパッチャの再試行とサーキットブレーカーが、一時的なワーカーの失敗はすでに面倒を見ています。判定役の出来はゴールの文面しだいなので、本文は **はっきりした受け入れ条件** として書いてください。

:::note ゴール方式のカードは `/goal` の仕組みを借りるだけで、つながってはいない
`--goal` は、続行のループを *そのカードのワーカーのセッションの中で* 回します。[`/goal` スラッシュコマンド](/hermes/docs/user-guide/features/goals/) と仕組みは共有していますが、状態は別です。チャットのセッションで `/goal` を設定してもカンバンのカードを作ったり占有したり動かしたりはしませんし、ゴール方式のカードのループは、どのチャットセッションの `/goal status` からも見えません。いまの会話を回し続けたいなら [`/goal`](/hermes/docs/user-guide/features/goals/) を、盤の上で仕事を進めたいならカードを作ってください。
:::

### とりまとめ役のふるまい {#how-the-orchestrator-behaves}

**まともなとりまとめ役は自分で作業をしません。** 利用者のゴールをタスクへ分解し、つなぎ、用意されたプロファイルへそれぞれ割り当てて、一歩下がります。とりまとめの手引き — 手を出したくなるのを抑える決まり、最初にプロファイルを調べさせる Step 0 の指示（知らない担当者名を渡されるとディスパッチャは黙って失敗するので、とりまとめ役はカードを必ず実在するプロファイルに結びつけなければなりません）、`kanban_create` / `kanban_link` / `kanban_comment` を軸にした分解の手順 — は、ワーカーのシステムプロンプトへ自動で差し込まれます。入れるものはありません。

とりまとめ役の代表的な一手番（2 人の調査役が並行して動き、書き手へ渡す形）はこうです。

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

とりまとめの手引きはワーカーのシステムプロンプトに自動で入ります。プロファイルごとに入れたり同期したりするものはありません。

**広げる前に決める。** 設計の判断はとりまとめ役のもので、ワーカーのものではありません。並行する 2 枚のカードが同じもの — 命名の規則、スキーマ、ファイル形式、API の形 — をそれぞれ選ばなければならないなら、とりまとめ役が一度で決めて、**両方の** カード本文に書き込みます。ワーカーは兄弟のカードを見られないので、子カードの本文には、そのカードが頼っている決定をすべて載せる必要があります。たとえば「書き出し側を作る」「読み込み側を作る」という並行カードで、それぞれのワーカーにファイル形式を考えさせてはいけません。先に 1 つ決めて（たとえば `version` の項目を持つ改行区切りの JSON）、両方の本文に書いてください。そうしないと、2 つの半分は永久にかみ合いません。

うまくやるには、ツールセットを盤の操作（`kanban`、`gateway`、`memory`）に絞ったプロファイルと組み合わせてください。そうすれば、とりまとめ役はやろうとしても実装の仕事を実行できません。

## ダッシュボード（GUI） {#dashboard-gui}

`/kanban` の CLI とスラッシュコマンドがあれば盤は画面なしで回せますが、人が関わる場面 — さばき、複数プロファイルの見守り、コメントの流れを読むこと、カードを列から列へ動かすこと — には、目に見える盤のほうが向いています。Hermes はこれを `plugins/kanban/` の **同梱ダッシュボードプラグイン** として配っています。中核機能でも別サービスでもなく、[ダッシュボードを拡張する](/hermes/docs/user-guide/features/extending-the-dashboard/) に書かれた方式に従ったものです。

開き方はこうです。

```bash
hermes kanban init      # one-time: create kanban.db if not already present
hermes dashboard        # "Kanban" tab appears in the nav, after "Skills"
```

### プラグインでできること {#what-the-plugin-gives-you}

- 状態ごとに 1 列ずつ並ぶ **Kanban** タブ。`triage`、`todo`、`ready`、`running`、`blocked`、`done`（切替を入れると `archived` も）。
  - `triage` は、まだ粗い思いつきを置いておく列です。既定（`kanban.auto_decompose: true`）では、ここに入ったタスクに対してディスパッチャが **分解役** を自動で走らせます。組み込みの分解役は `auxiliary.kanban_decomposer` のモデル設定を使い、プロファイルの一覧（説明つき）を読んで、そのタスクを小さな子タスクの集まりへ広げ、いちばん合う専門役へ振り分けます。元のタスクはすべての子の親として生き続けるので、全部が終わったときに担当者（`kanban.orchestrator_profile`、未設定なら現在の既定プロファイル）が起き上がって完了を判断します。ページ上部の **Orchestration: Auto/Manual** のピルで切り替えるか（緑 = Auto、灰色 = Manual）、`config.yaml` を直接編集してください。どちらの方式でも `hermes kanban specify` は使えます。広げたくないときの、1 タスクだけの仕様書き直しとして残っています。
- カードには、タスク id、タイトル、優先度のバッジ、テナントのタグ、担当プロファイル、コメントとリンクの数、**進捗のピル**（子を持つタスクでは `N/M`）、「作成から N 前」が出ます。カードごとのチェックボックスで複数選択できます。
- **Running の中でプロファイルごとに分ける** — ツールバーのチェックボックスで、Running の列を担当者ごとに小分けにできます。
- **WebSocket による即時更新** — プラグインは追記だけの `task_events` テーブルを短い間隔で追いかけるので、どのプロファイル（CLI、ゲートウェイ、別のダッシュボードのタブ）が動かしても、盤はすぐそれを映します。イベントがまとまって届いても、再読み込みは 1 回にまとめられます。
- **カードのドラッグ＆ドロップ** で列を移して状態を変えられます。ドロップは `PATCH /api/plugins/kanban/tasks/:id` を送り、CLI と同じ `kanban_db` のコードを通ります。3 つの入口がずれることはありません。壊す方向の状態（`done`、`archived`、`blocked`）へ移すときは確認が出ます。タッチ端末ではポインタを使う代替があるので、タブレットからでも使えます。
- **タスク作成のダイアログ** — 列の見出しの `+` を押すと、名前つきの入力欄が並んだモーダルが開きます。タイトル、担当者、優先度、スキル、作業場所の種類とパス（盤のプロジェクトディレクトリから初期値が入り、タスクごとに上書き可）、ゴール方式、それから（任意で）既存のタスクから選ぶ親タスク。Enter で作成、Shift+Enter でタイトル欄に改行、Escape で取り消しです。Triage の列から作ると、新しいタスクは自動的に triage に置かれます。
- **複数選択とまとめ操作** — カードを shift / ctrl クリックするかチェックを入れると選択に加わります。上部にまとめ操作のバーが出て、状態の一括変更、アーカイブ、担当の付け替え（プロファイルの選択、または「(unassign)」）ができます。壊す方向のまとめ操作には確認が入ります。id ごとの失敗は、残りを止めずに報告されます。
- **カードをクリック**（shift / ctrl なし）すると横から引き出しが開きます（Escape か外側のクリックで閉じます）。中身は次のとおりです。
  - **タイトルの編集** — 見出しをクリックして名前を変えられます。
  - **担当者 / 優先度の編集** — メタ情報の行をクリックして書き換えられます。
  - **説明の編集** — 既定ではマークダウンとして表示されます（見出し、太字、斜体、インラインコード、コードブロック、`http(s)` / `mailto:` のリンク、箇条書き）。「edit」ボタンでテキストエリアに切り替わります。マークダウンの描画は小さく、XSS に強い実装です。置換はすべて HTML エスケープ済みの入力に対して行われ、通るリンクは `http(s)` / `mailto:` だけ、`target="_blank"` と `rel="noopener noreferrer"` が必ず付きます。
  - **依存関係の編集** — 親と子がチップで並び、それぞれ `×` で外せます。さらに、他のすべてのタスクから親や子を選んで追加できます。循環しようとするとサーバー側ではっきりした説明つきで拒否されます。
  - **状態を動かす行**（→ triage / → ready / → running / block / unblock / complete / archive）。壊す方向の変化には確認が出ます。**Triage** の列のカードでは、この行に LLM を使う操作が 2 つ増えます。**⚗ Decompose** はタスクを子タスクの集まりへ広げ、説明をもとに専門役のプロファイルへ振り分けます。**✨ Specify** は 1 タスクだけの仕様書き直しです。Decompose は、広げるまでもないと LLM が判断したときには specify 相当の昇格に落ちるので、厳密に上位互換です。どちらも CLI（`hermes kanban decompose <id>` / `specify <id>` / `--all`）、どのゲートウェイのプラットフォーム（`/kanban decompose <id>`）、そしてプログラムからは `POST /api/plugins/kanban/tasks/:id/decompose` と `…/specify` で呼べます。モデルは `config.yaml` の `auxiliary.kanban_decomposer` と `auxiliary.triage_specifier` で設定します。
  - 結果の欄（こちらもマークダウン表示）、Enter で送信できるコメントの流れ、直近 20 件のイベント。
- **ツールバーの絞り込み** — 自由入力の検索、テナントの選択（既定は `config.yaml` の `dashboard.kanban.default_tenant`）、担当者の選択、「show archived」の切替、「lanes by profile」の切替、それに次の 60 秒の周回を待たずに済む **Nudge dispatcher** ボタン。

見た目が目指しているのは、見慣れた Linear / Fusion 風のレイアウトです。暗いテーマ、件数つきの列見出し、色分けされた状態の点、優先度とテナントのピル。プラグインはテーマの CSS 変数（`--color-*`、`--radius`、`--font-mono` など）だけを読むので、どのダッシュボードテーマでも自動で見た目が合います。

### 自動と手動の切り替え {#auto-vs-manual-orchestration}

Triage の列に放り込んだタスクの扱い方は 2 通りあります。

**自動（既定）** — `kanban.auto_decompose: true`。ゲートウェイ内蔵のディスパッチャが周回ごとに **分解役** を走らせます。1 周あたりの上限は `kanban.auto_decompose_per_tick`（既定 3 件）なので、triage にまとめて投入しても補助 LLM を一気に使い切ることはありません。分解役は組み込みの分解用プロンプトと `auxiliary.kanban_decomposer` のモデル設定を使い、入っているプロファイルとその説明を読んで、LLM に JSON のタスクグラフを作らせます。どのタスクを起こすか、誰に渡すか、どれがどれに依存するか、です。元の triage のタスクはグラフのすべての葉の親になるので、グラフ全体が終わるまで生き続け、そのあと `ready` へ戻って担当者（`kanban.orchestrator_profile`、未設定なら現在の既定プロファイル）が完了を判断し、足りなければタスクを足せます。これが「一行だけ放り込んで、あとは任せる」流れです。

組み込みの展開が終わると、その子のグラフと一緒に不可分な形で記録されます。
その根を Triage へ戻しても、もう 1 つグラフができることはありません。ふつうの前提条件の
リンクが、そのタスクの最初の分解を妨げることもありません。完了の印は
イベントの保存期間を越えて、タスクが消されるまで残ります。これは、独立に作られた手動のグラフを
意味で重複判定する仕組みではありませんし、すでに刈り取られた履歴を直すものでもありません。

新しいタスクがテナントを指定していない場合、作成時に親のうち最初の空でないテナントを
渡された順に引き継ぎます。明示的なテナント（ツールが渡すワーカーの
現在のテナントを含む）が優先されます。きっちりした分離の境界は、変わらず盤です。

**手動** — `kanban.auto_decompose: false`。triage のタスクは、あなたが動かすまで triage に留まります。カードの **⚗ Decompose** ボタンを押すか、`hermes kanban decompose <id>`（または `--all`）を実行するか、チャットから `/kanban decompose <id>` を使ってください。分解役が入る前の盤のふるまいと同じで、何をいつ走らせるかを完全に握りたいときに向いています。

**大事な境界。** 手動にしても止まるのは組み込みの Triage 分解役だけです。プロファイルが `kanban_create` を呼ぶのは止まりませんし、作成者のセッションを起こす動きも止まりません。`kanban.auto_subscribe_on_create: true` のとき、タスクの最終イベントが元のエージェントを人工的な状況報告の手番で再開させるので、引き継ぎを確かめて、本当に次の仕事が要るかどうかを判断できます。完了を受け身のままにしたいときは `auto_subscribe_on_create: false` にしてください。出どころを追えるように、組み込みの分解役が作った子は `created_by=auto-decomposer` を持ち、再開したプロファイルが作ったタスクにはそのプロファイル名が入ります。

2 つの方式は、カンバンのページ上部にある **Orchestration: Auto/Manual** のピル（緑 = Auto、灰色 = Manual）で切り替えるか、`config.yaml` を直接編集して切り替えます。どちらの方式でも `hermes kanban specify` は使えます。広げたくないときの、1 タスクだけの仕様書き直しとして残っています。

分解役の振り分けは、プロファイルの説明に左右されます。これはプロファイルごとのラベル付けの仕組みで、`hermes profile create --description "..."`、`hermes profile describe <name> --text "..."`、`hermes profile describe <name> --auto`（入っているスキルとモデルから LLM が生成）、またはダッシュボードの **Orchestration settings** パネルを開いたところにあるプロファイル編集で設定します。説明のないプロファイルも一覧には出ます。名前で振り分けられますが、精度は落ちます。分解役が子タスクを `assignee=None` で置くことは決してありません。LLM が知らないプロファイルを選んだときは、`kanban.default_assignee`（未設定なら現在の既定プロファイル）へ回されます。

`kanban.orchestrator_profile` は、そのプロファイルのプロンプトやスキル、独自の処理を分解の呼び出しへ読み込むものではありません。展開したあと、根の（とりまとめの）タスクを誰が持つかを決める設定です。分解役のモデルやプロバイダを変えたいときは `auxiliary.kanban_decomposer` を設定してください。組み込みの分解役ではなく、あるプロファイル独自の分け方を使いたいときは、手動へ切り替えて、そのプロファイルに明示的にタスクを作らせるか分解させてください。

設定できる項目（すべて `~/.hermes/config.yaml` の `kanban:` の下）。

| キー | 既定 | 役割 |
|---|---|---|
| `auto_decompose` | `true` | ディスパッチャが周回ごとに、Triage のタスクへ組み込みの分解役を自動で走らせる。プロファイルからの `kanban_create` の呼び出しや、作成者を起こす手番は制御しない。 |
| `auto_decompose_per_tick` | `3` | 1 周回あたりの分解の上限。あふれた分は次の周回へ回る。 |
| `orchestrator_profile` | `""` | 分解のあと、根の（とりまとめの）タスクを持つプロファイル。空なら現在の既定プロファイルに落ちる。 |
| `default_assignee` | `""` | LLM が知らないプロファイルを選んだときの子タスクの行き先。空なら現在の既定に落ちる。 |
| `auto_subscribe_on_create` | `true` | `kanban_create` が常駐のゲートウェイ / TUI セッションの中で走ったとき、最終イベントが元のエージェントを人工的な状況報告の手番で再開させる。受け身の完了にしたい、または `kanban_notify-subscribe` を明示的に呼ばせたいときは `false` に。`auto_decompose` とは独立。 |
| `notify_in_gateway` | `true` | このゲートウェイからカンバンの購読を監視して配達する。通知の購読を持たないプロファイルでは `false` にして、5 秒ごとの空回りをやめられる。`dispatch_in_gateway` とは独立で、配分を担当しないゲートウェイがプロファイル固有の配達だけ持つこともある。 |
| `done_sub_retention_days` | `30` | 通知の購読は `done` を越えて残り（再開しても大丈夫）、`archived` で消える。通知役の掃除は、タスクが `done` か `blocked` のまま新しいイベントがないまま指定日数を過ぎた購読を削り、アーカイブしない盤で購読表が際限なく育つのを防ぐ。`0` で掃除を止める。 |

そして補助 LLM の枠が 2 つ。

| キー | 役割 |
|---|---|
| `auxiliary.kanban_decomposer` | タスクグラフを作るモデル（Decompose から呼ばれる）。`provider` / `model` を設定すると、主たるチャットのモデルより優先される。 |
| `auxiliary.profile_describer` | プロファイルの説明を自動生成するモデル（`hermes profile describe --auto` から呼ばれる）。 |

### 構造 {#architecture}

GUI はあくまで **DB を読み、kanban_db 経由で書く** だけの層で、自前の業務ロジックは持ちません。

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

### REST の入口 {#rest-surface}

どの経路も `/api/plugins/kanban/` の下に置かれ、ダッシュボードの一時的なセッショントークンで守られています。

| メソッド | パス | 役割 |
|---|---|---|
| `GET` | `/board?tenant=<name>&include_archived=…` | 状態の列ごとにまとめた盤の全体と、絞り込み用のテナント・担当者の一覧 |
| `GET` | `/tasks/:id` | タスク + コメント + イベント + リンク |
| `POST` | `/tasks` | 作成（`kanban_db.create_task` を包む。`triage: bool` と `parents: [id, …]` を受け取る） |
| `PATCH` | `/tasks/:id` | 状態 / 担当者 / 優先度 / タイトル / 本文 / 結果 |
| `POST` | `/tasks/bulk` | `ids` のすべてに同じ変更（状態 / アーカイブ / 担当者 / 優先度）を当てる。id ごとの失敗は、他を止めずに報告される |
| `POST` | `/tasks/:id/comments` | コメントを追記する |
| `POST` | `/tasks/:id/specify` | triage の仕様化を走らせる。補助 LLM が本文を肉付けし、`triage` から `todo` へ上げる。`{ok, task_id, reason, new_title}` を返す。「triage にない」「補助クライアントがない」「LLM のエラー」のときは、4xx ではなく 200 で `ok=false` と人が読める理由が返る |
| `POST` | `/tasks/:id/decompose` | カンバンの分解役を走らせる。補助 LLM がタスクグラフを作り、補助処理が子の作成・根へのリンク・`triage → todo` の切り替えを不可分に行う。`{ok, task_id, reason, fanout, child_ids, new_title}` を返す。LLM のエラーでも 200 を返す点は `/specify` と同じ。 |
| `GET` | `/profiles` | 入っているプロファイルを説明つきで並べる（ダッシュボードの説明編集と、とりまとめ役の選択で使われる）。 |
| `PATCH` | `/profiles/:name` | プロファイルの説明を設定または消す（人が書いたもの — `description_auto: false`）。`{ok, profile, description}` を返す。 |
| `POST` | `/profiles/:name/describe-auto` | `auxiliary.profile_describer` でプロファイルの説明を生成する。`description_auto: true` で保存されるので、ダッシュボードが「要確認」のバッジを出せる。 |
| `GET` | `/orchestration` | カンバンのとりまとめ設定（`orchestrator_profile`、`default_assignee`、`auto_decompose`）と、既定へ落ちたあとの *実効* 値を読む。 |
| `PUT` | `/orchestration` | `config.yaml` のとりまとめ用 3 キーのうち 1 つ以上を更新する。空でないプロファイル名が実在するか検査する。 |
| `POST` | `/links` | 依存を足す（`parent_id` → `child_id`） |
| `DELETE` | `/links?parent_id=…&child_id=…` | 依存を外す |
| `POST` | `/dispatch?max=…&dry_run=…` | ディスパッチャをつつく — 60 秒の待ちを飛ばす |
| `GET` | `/config` | `config.yaml` の `dashboard.kanban` の設定を読む — `default_tenant`、`lane_by_profile`、`include_archived_by_default`、`render_markdown` |
| `WS` | `/events?since=<event_id>` | `task_events` の行を流し続ける |

どのハンドラも薄い包みで、プラグインは Python にして約 700 行（ルーター + WebSocket の追跡 + まとめ処理 + 設定の読み取り）、新しい業務ロジックは足していません。小さな `_conn()` 補助が読み書きのたびに `kanban.db` を自動で初期化するので、ダッシュボードを先に開いた人も、REST API を直接叩いた人も、`hermes kanban init` を実行した人も、入れたばかりの状態から動きます。

### ダッシュボードの設定 {#dashboard-config}

`~/.hermes/config.yaml` の `dashboard.kanban` にある次のキーで、タブの初期状態を変えられます。プラグインは読み込み時に `GET /config` で取得します。

```yaml
dashboard:
  kanban:
    default_tenant: acme              # preselects the tenant filter
    lane_by_profile: true             # default for the "lanes by profile" toggle
    include_archived_by_default: false
    render_markdown: true             # set false for plain <pre> rendering
```

どのキーも任意で、書かなければ上に示した既定になります。

### セキュリティの考え方 {#security-model}

ダッシュボードの HTTP 認証ミドルウェアは [`/api/plugins/` を明示的に素通りさせます](/hermes/docs/user-guide/features/extending-the-dashboard/#backend-api-routes)。プラグインの経路が認証なしなのは設計どおりで、ダッシュボードは既定でローカルホストにだけ待ち受けるからです。つまり、カンバンの REST の入口はそのホスト上のどのプロセスからも届きます。

WebSocket だけは一歩踏み込んで、ダッシュボードの一時的なセッショントークンを `?token=…` のクエリパラメータとして要求します（ブラウザはアップグレード要求に `Authorization` を付けられません）。ブラウザ内の PTY ブリッジと同じやり方です。

`hermes dashboard --host 0.0.0.0` で動かすと、カンバンを含むすべてのプラグインの経路がネットワークから届くようになります。**共有のホストではやめてください。** 盤にはタスクの本文、コメント、作業場所のパスが入っています。ここへ到達した攻撃者は、あなたの協働の場すべてを読めますし、タスクの作成・担当変更・アーカイブもできます。

`~/.hermes/kanban.db` のタスクは、わざとプロファイルに紐づいていません（それが連携の土台だからです）。`hermes -p <profile> dashboard` でダッシュボードを開いても、盤にはそのホストの他のプロファイルが作ったタスクも出ます。すべてのプロファイルの持ち主は同じ利用者ですが、複数の人格を並べているなら知っておく価値があります。

### 即時の更新 {#live-updates}

`task_events` は追記だけの SQLite のテーブルで、単調に増える `id` を持ちます。WebSocket の入口はクライアントごとに最後に見たイベント id を覚えていて、新しい行が入るたびに押し出します。イベントがまとまって届いたときは、フロントエンドが（とても軽い）盤の取得をやり直します。イベントの種類ごとに手元の状態を継ぎ足そうとするより、単純で正確です。WAL モードなので、読み取りのループがディスパッチャの `BEGIN IMMEDIATE` による占有をふさぐことはありません。

### 自分で広げる {#extending-it}

このプラグインは Hermes のダッシュボードプラグインの標準的な決まりに従っています。マニフェストの全項目、外枠の差し込み口、ページ単位の差し込み口、プラグイン SDK については [ダッシュボードを拡張する](/hermes/docs/user-guide/features/extending-the-dashboard/) を参照してください。列を足す、カードの見た目を変える、テナントで絞ったレイアウトにする、`tab.override` で丸ごと置き換える。どれもこのプラグインを fork せずに書けます。

消さずに止めたいときは、`config.yaml` に `dashboard.plugins.kanban.enabled: false` を足してください（または `plugins/kanban/dashboard/manifest.json` を消します）。

### どこまでやるかの線引き {#scope-boundary}

GUI はわざと薄くしてあります。プラグインがすることはすべて CLI から届き、プラグインはそれを人にとって心地よくするだけです。担当の自動割り当て、予算、統制の関門、組織図のような表示は利用者側の領分のままです。振り分け用のプロファイル、別のプラグイン、`tools/approval.py` の再利用 — 設計書の対象外の節に並べたとおりです。

## CLI コマンド早見表 {#cli-command-reference}

これは **あなた**（やスクリプト、cron、ダッシュボード）が盤を動かすための入口です。ディスパッチャの中で動くワーカーは、同じ操作に `kanban_*` の [ツール](#how-workers-interact-with-the-board) を使います。ここの CLI とあちらのツールはどちらも `kanban_db` を通るので、2 つの入口は構造上かならず一致します。

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
        [--sort created|created-desc|priority|priority-desc|status|assignee|title|updated]
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
        [--log-retention-days N]
```

どのコマンドも、対話的な CLI と messaging のゲートウェイではスラッシュコマンドとしても使えます（後述の [`/kanban` スラッシュコマンド](#kanban-slash-command) を参照）。

`--max-retries` は、そのタスクだけディスパッチャの遮断器を上書きする設定です。`--max-retries 1` なら最初の失敗でブロック、`--max-retries 3` なら 2 回まで再試行して 3 回目の失敗でブロックします。省くと `config.yaml` の `kanban.failure_limit`、それもなければ組み込みの既定が使われます。

### 同時実行・時刻指定・子の昇格の設定 {#concurrency-scheduling-and-child-promotion-config}

| 設定キー | 既定 | 何をするか |
|------------|---------|--------------|
| `kanban.max_in_progress` | 未設定（無制限） | 同時に走るタスクの数に上限をかける。すでに N 件走っていると、ディスパッチャはそれ以上起動しない。遅いワーカー（ローカル LLM、資源の限られたホスト）で、積み上がってタイムアウトする前に手持ちを片付けさせたいときに便利。おかしい値や 1 未満の値は警告を出して無制限として扱う。 |
| `kanban.max_in_progress_per_profile` | 未設定（無制限） | `max_in_progress` のプロファイル版で、1 つの担当プロファイルが同時に走らせるタスク数に上限をかける。1 つのプロファイルだけ遅い、あるいはレート制限にかかっていて、他は流したいときに便利。盤全体の `max_in_progress` と同時に効き、両方が許さないと起動しない。 |
| `kanban.dispatch_profiles` | 未設定（実在するプロファイルすべて） | 複数の Hermes ホームで共有する盤で、このホームが占有してよい担当者の許可リスト。設定すると、このホームのディスパッチャは列挙された担当者のカードだけを占有する（安全側に倒れるので、空のリストは何も占有しない）。それ以外は `skipped_nonspawnable` に入る。[複数のホーム間で盤を共有する](#shared-boards-across-homes) を参照。 |
| `kanban.auto_promote_children` | `true` | `decompose_triage_task()` が親でふさがれない子を作ったあと、ディスパッチャが拾えるように自動で `ready` へ上げる。人の確認を挟みたいときは `false` にすると、昇格させるまで子は `todo` に留まる。 |
| `kanban.default_workdir` | 未設定 | `--workspace` もタスク自身の指定もないときに、新しいタスクへ当てる盤レベルの既定の作業ディレクトリ。タスクごとの `workspace:` が優先される。 |

```yaml
kanban:
  max_in_progress: 2
  auto_promote_children: false
  default_workdir: ~/work/active-project
```

### 開始時刻を指定する（`scheduled_at`） {#scheduled-task-starts-scheduledat}

タスクに `scheduled_at` を設定すると、指定の時刻まで配分を遅らせられます。ディスパッチャは `scheduled_at` が未来の ready タスクを飛ばし、その時刻を過ぎた最初の周回で拾います。

```bash
hermes kanban create "nightly backup audit" \
  --assignee ops --scheduled-at "2026-06-01T03:00:00Z"
```

### 再起動の抑止 {#respawn-guard}

ディスパッチャは、前回の実行で上限・認証・429 のエラーに当たった（`blocker_auth`）、抑止の時間内に実行が成功して終わった（`recent_success`）、直近のコメントに GitHub の PR へのリンクがある（`active_pr`）ready タスクについては、起動し直すのを拒みます。人が追いつくまで、同じバグやタスクにワーカーの嵐が繰り返し起きるのを防ぐためです。[イベント一覧](#event-reference) の `respawn_guarded` の行を参照してください。

ready のカードがなぜ起動しないかを見るには、`hermes kanban dispatch --dry-run` を実行してください。押さえられているカードごとに `Guarded (<reason>): <task id>` が並びます（`--json` を付けると `respawn_guarded`、`rate_limited`、`skipped_locked`、`memory_pressure` も出ます）。ゲートウェイと単独デーモンの「ディスパッチャが詰まっている」警告にも、直近の周回が何を押さえたかが出ます。たとえば `Last tick held back: active_pr=1` のように。

`recent_success` と `active_pr` が押さえるのは **ready** の流れだけです。これらはレビューへの引き継ぎの入力であって、引き継ぎを止める合図ではありません。PR がすでに開いているカードを、レビュー担当や締め役、その他の立て直し役に拾わせたいときは、`hermes kanban request-review <id>` でレビューの流れへ移してください（`running` だけでなく `ready` からも受け付けます）。レビューの流れでの起動はどちらの抑止も受けず、開発の担当者が自分の PR に対して再び起動されることもありません。成功のあとにわざと待ち行列へ戻す操作（`done→ready` のドラッグ、`unblock`、昇格のやり直し）も `recent_success` を解くので、手動の再実行が抑止の時間ぶん黙って止められることはありません。

### ドラッグで削除・まとめて削除（ダッシュボード） {#drag-to-delete-and-bulk-delete-dashboard}

ダッシュボードのカンバンのページには **ゴミ箱の落とし場所** があり、カードをそこへドラッグするとタスクを削除できます（`task_events`、子へのリンク、購読まで連鎖して消えます）。事故を防ぐために確認が出ます。まとめての削除は `DELETE /api/plugins/kanban/tasks` に JSON の本文 `{"ids": ["t_abc", "t_def", ...]}` を渡しても行えます。

### ワーカーを見るための入口 {#worker-visibility-endpoints}

ダッシュボードのプラグイン API は、外部の監視向けに次の読み取り専用の入口（と実行を止める動詞）を提供します。

| 入口 | 返すもの |
|----------|---------|
| `GET /api/plugins/kanban/workers/active` | いま起動しているワーカー。PID、プロファイル、タスク id、開始時刻、最後の鼓動 |
| `GET /api/plugins/kanban/runs/{id}` | 1 回の実行の詳細 — タスク id、状態、開始と終了、終了コード、ログのパス |
| `POST /api/plugins/kanban/runs/{run_id}/terminate` | 取り戻せる実行を止める — ワーカーを終了させ、タスクを配分し直せるようにする |
| `GET /api/plugins/kanban/inspect` | ディスパッチャの様子をまとめて — 待ち、`max_in_progress` に対する進行中の数、直近のイベント |

これらはすべて、カンバンのプラグイン API の他の部分と同じダッシュボードの認証で守られています。

### カンバンの群れを作る補助 {#kanban-swarm-topology-helper}

`hermes kanban swarm` は、永続する **Kanban Swarm v1** のグラフを一度に作ります。完了済みの根（共有の黒板）のカード、並行する N 枚のワーカーカード、すべてのワーカーを待つ検証役のカード、検証役を待つ統合役のカードです。群れで共有する文脈（「黒板」）は、根のカードに構造化された JSON のコメントとして保存されるので、どのワーカーからも読めます。

```bash
hermes kanban swarm "Design a multi-region failover plan" \
  --workers researcher,architect,sre \
  --verifier reviewer --synthesizer writer
```

できあがるグラフは不可分にコミットされます。ディスパッチャもダッシュボードの読み手も、群れがまだ無いか、完全な形があるかのどちらかしか見ません。途中までつながった根・ワーカー・検証役のグラフが見えることはありません。そのあとはふつうに配分されます。ワーカーが並行して走り、全員が終わると検証役が起き、検証役が問題なしと判断すると統合役が起きます。

## `/kanban` スラッシュコマンド {#kanban-slash-command}

`hermes kanban <action>` のどの動詞も、`/kanban <action>` として使えます。対話的な `hermes chat` のセッションの中からも、**そして** どのゲートウェイのプラットフォーム（Telegram、Discord、Slack、WhatsApp、Signal、Matrix、Mattermost、メール、SMS）からも使えます。どちらの入口も、`hermes kanban` の argparse の木をそのまま再利用する `hermes_cli.kanban.run_slash()` という同じ入口を呼ぶので、引数の形、フラグ、出力の見た目は CLI、`/kanban`、`hermes kanban` のどれでも同じです。盤を動かすためにチャットを離れる必要はありません。

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

複数語の引数は、シェルと同じように引用符で囲んでください。`run_slash` は行の残りを `shlex.split` で解釈するので、`"..."` も `'...'` も使えます。

### 実行中でも使える — `/kanban` は「実行中のエージェント」の関門を素通りする {#mid-run-usage-kanban-bypasses-the-running-agent-guard}

ゲートウェイはふつう、エージェントがまだ考えている間はスラッシュコマンドと利用者のメッセージを待たせます。最初の手番が飛んでいる最中にうっかり 2 つ目を始めないための仕組みです。**`/kanban` はこの関門から明示的に外してあります。** 盤は動いているエージェントの状態ではなく `~/.hermes/kanban.db` にあるので、読み取り（`list`、`show`、`context`、`tail`、`watch`、`stats`、`runs`）も書き込み（`comment`、`unblock`、`block`、`assign`、`archive`、`create`、`link` など）も、手番の途中でもそのまま通ります。

分けてあることの意味は、まさにここです。

- ワーカーが仲間を待って止まる → スマホから `/kanban unblock t_abcd` を送れば、次の周回でディスパッチャが仲間を拾います。止まっていたワーカーは邪魔されません。ただ、止まる理由がなくなるだけです。
- 人の判断が要るカードを見つけた → `/kanban comment t_xyz "use the 2026 schema, not 2025"` がタスクの流れに載り、*次の* 実行で `kanban_show()` が読みます。
- とりまとめ役を止めずに全体の様子を知りたい → `/kanban list --mine` や `/kanban stats` が、あなたの主たる会話に触れずに盤を見せます。

### `/kanban create` の自動購読（ゲートウェイのみ） {#auto-subscribe-on-kanban-create-gateway-only}

ゲートウェイから `/kanban create "…"` でタスクを作ると、その元になったチャット（プラットフォーム + チャット id + スレッド id）が、そのタスクの最終イベント（`completed`、`blocked`、`gave_up`、`crashed`、`timed_out`）に自動で購読されます。最終イベントごとに 1 通返ってきます。`completed` のときはワーカーの結果要約の 1 行目も付くので、こちらから確認したりタスク id を覚えておいたりする必要はありません。

```
you> /kanban create "transcribe today's podcast" --assignee transcriber
bot> Created t_9fc1a3  (ready, assignee=transcriber)
     (subscribed — you'll be notified when t_9fc1a3 completes or blocks)

… ~8 minutes later …

bot> ✓ t_9fc1a3 completed by transcriber
     transcribed 42 minutes, saved to podcast/2026-05-04.md
```

購読はタスクが `done` に達しても残ります。完了は取り消せる（レビュー担当や管理役が done のタスクを開き直せる）ので、元のセッションは開き直しの周回を通しても通知を受け取り続けます。購読が自動で外れるのは `archived`（戻れない終わりの状態）のときです。アーカイブしない盤では、`done` か `blocked` のまま `kanban.done_sub_retention_days` 日（既定 30 日、0 で無効）動きのないタスクの購読を掃除が消すので、古い行が溜まり続けることはありません。`--json`（機械向けの出力）でスクリプトから作った場合、自動購読は行われません。スクリプトから呼ぶ側は `/kanban notify-subscribe` で購読を自分で管理したいはずだ、という前提です。

ディスパッチャのワーカーが `kanban_create` や `hermes kanban create` でタスクを作るときは、
`parents` の依存リンクがなくても、持ち主のタスクの永続的な通知購読を引き継ぎます。
届け先、経路の目印、配達の方式はそのまま保たれます。受け身の購読が自動購読によって
起こす方式へ格上げされることはありません。これは既存の購読を写す動きで、
いまの会話を新しい届け先として足すかどうかを決める `auto_subscribe_on_create` とは
独立しています。素の CLI セッションや、持ち主のタスクに購読がないワーカーのために、届け先が作り出されることはありません。

`kanban_create` では、セッションの出どころが次の順で決まります。明示的な `session_id`、
持ち主のワーカーのタスクが持つ永続セッション、リクエスト単位の API の出どころ、そして
いまのプロセスのセッションです。組み込みの分解も、その根の永続セッションを引き継ぎます。
セッションの出どころ自体は通知の届け先ではありません。`session_id` を変えても既存の購読は
置き換わりません。届け先を変えるには `notify-subscribe` と
`notify-unsubscribe` を使ってください。

チャット由来の自動購読は `notify+wake` の方式で作られます。最終イベントのとき、届け先のエージェントは受け身のメッセージを受け取る **と同時に** 実際に手番を取るので、盤の文脈を読んで自分の言葉で返せます。後述の [配達の方式](#delivery-modes) を参照してください。

### メッセージでの出力の打ち切り {#output-truncation-in-messaging}

ゲートウェイのプラットフォームには、実用上のメッセージ長の上限があります。`/kanban list`、`/kanban show`、`/kanban tail` の出力が約 3800 文字を超えると、`… (truncated; use \`hermes kanban …\` in your terminal for full output)` という末尾を付けて打ち切られます。CLI の側にこの上限はありません。

### 入力補完 {#autocomplete}

対話的な CLI で `/kanban ` と打って Tab を押すと、組み込みのサブコマンドの一覧（`list`、`ls`、`show`、`create`、`assign`、`link`、`unlink`、`claim`、`comment`、`complete`、`block`、`unblock`、`archive`、`tail`、`dispatch`、`context`、`init`、`gc`）を順に出せます。上の CLI の早見表にある残りの動詞（`watch`、`stats`、`runs`、`log`、`assignees`、`heartbeat`、`notify-subscribe`、`notify-list`、`notify-unsubscribe`、`daemon`）も動きます。まだ補完の候補に入っていないだけです。

## 協働パターン {#collaboration-patterns}

盤は、新しい部品を足さずに次の 8 つの形を支えます。

| パターン | 形 | 例 |
|---|---|---|
| **P1 広げる** | 同じ役割の兄弟 N 枚 | 「5 つの切り口を並行して調べる」 |
| **P2 パイプライン** | 役割の連鎖。偵察 → 編集 → 書き手 | 日次ブリーフの組み立て |
| **P3 多数決 / 合議** | 兄弟 N 枚 + まとめ役 1 枚 | 調査役 3 人 → レビュー役 1 人が選ぶ |
| **P4 長く続く日誌** | 同じプロファイル + 共有ディレクトリ + cron | Obsidian の保管庫 |
| **P5 人が入る形** | ワーカーが止まる → 利用者がコメント → 解除 | あいまいな判断 |
| **P6 `@mention`** | 文章の中から振り分ける | `@reviewer look at this` |
| **P7 スレッド単位の作業場所** | スレッドの中で `/kanban here` | プロジェクトごとのゲートウェイのスレッド |
| **P8 大量の対象を回す** | 1 プロファイルで N 対象 | SNS アカウント 50 件 |
| **P9 さばきの仕様化** | 粗い思いつき → `triage` → `hermes kanban specify` が本文を膨らませる → `todo` | 「この一行を、仕様のあるタスクにする」 |

## 追撃のカードへ文脈を渡す（親リンク） {#handing-context-to-follow-up-cards-the-parent-link}

親リンクは順番を決める関門なだけではなく、**完了した** カードから新しいカードへ文脈を渡す通り道です。`--parent <done-card-id>` を付けてカードを作ると、2 つのことが起きます。

1. **すぐ動ける状態になる。** `create_task` は親の状態を見て状態を決めます。親がすべて `done` の子は、いきなり `ready` で作られます。待ちも手動の昇格も要りません。（まだ開いている親を持つ子は、最後の親が終わって `recompute_ready` が上げるまで `todo` にいます。）
2. **親の引き継ぎが一緒に流れる。** 子のために組み立てられるワーカーの文脈（`build_worker_context`、`kanban_show()` が返すもの）には、各親の完了時の `summary` と `metadata` がそのまま入った `## Parent task results` の節が含まれます。

```
## Parent task results
### t_77c26979 (completed just now)
Added exponential backoff with jitter to the retry helper.
_metadata_: `{"changed_files": ["hermes_cli/retry.py", "tests/test_retry.py"], "decisions": ["capped backoff at 60s", "jitter = full"]}`
```

だからこそ、終わったカードの続きをやるときは **done のカードを開き直すのではなく、新しい子カードを作る** のが定石です。完了したカードは動かせない履歴で、その文脈は親リンクを通って前へ流れます。同じカードでのやり直し（失敗したカードでの再試行）は別の仕組みで、*同じ* カードの過去の試行は、そのカード自身の文脈に「過去の試行」として出ます。

worktree やブランチだけでは代わりになりません。リポジトリの状態は、続きのワーカーにコードが *どうなっているか* を教えますが、*なぜそうなのか* は教えません。判断、走らせたテスト、触ったファイルは git ではなく、親の構造化された引き継ぎの中にあります。親が完了したときには存在しなかった証拠（あとで落ちた CI のログなど）は、新しいカードの **本文** に書くものです。

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

直しに当たるワーカーは、元のカードの要約とメタデータ（変えたファイル、判断）をすでに文脈に持った状態で起動し、そこにあなたが本文へ入れた新しい証拠が加わります。

### ぶつかったワーカーのブランチを収める {#reconciling-colliding-worker-branches}

開発のパイプライン（worktree を使う P1 / P2）では、2 人のワーカーのブランチが
マージでぶつかることがあります。どちらかに自分で裁かせてはいけません。ぶつかった
エージェントは相手の文脈を持っていないので、決まって相手側を上書きするか、
自分の側を捨てます。代わりに、**第三の中立なプロファイル** に割り当てた収拾用のカードを作り、
ぶつかった **両方の** カードを親としてつないでください。親リンクが両側の完了要約を
収拾役の文脈へ運ぶので、両方の差分 *と* 両方の意図が届きます。同梱の
[`agent-merge-conflict-arbiter` の追加スキル](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/autonomous-ai-agents/agent-merge-conflict-arbiter/SKILL.md)
が、そのワーカーに手順一式を与えます。ぶつかった塊を分類し、公平に解き、
確かめ、どの判断をしたかをすべて書いた要約を返す、という手順です。

### 並行作業でぶつかりやすい場所 {#collision-hotspots-in-parallel-campaigns}

広く走らせる仕事では、いくつかのファイルが衝突の磁石になります。たくさんの
ワーカーが同じファイルに少しずつ足し、小さく保つ役は誰もおらず、そこが絶えず
マージ衝突の起きる場所になります。これを和らげるのは新しい部品ではなく、
コメントの決まりごとです。自分の差分が 1 つのファイルで兄弟とぶつかり続けていると気づいた
ワーカー — あるいは自分が触るファイルが、他のカードの最近のコメントにも
出てくると気づいたワーカー — は、黙って積み増してはいけません。代わりに、
見分けのつく接頭辞を付けて自分のカードにコメントを残します。

```
hotspot: hermes_cli/kanban_db.py — third conflicting edit to the dispatch loop this wave
```

そして完了時の `metadata` でも同じ印を繰り返します。とりまとめ役（や盤を見ている
人）が、**同じパスを名指しした `hotspot:` のコメントを 2 つ以上** 見つけたら、そのファイルに
触る仕事をさらに積む **前に**、そのファイル専用のリファクタ / 分解のカードを作ってください。
磁石になっているファイルを割るほうが、この先起きる衝突を毎回収めるより安上がりです。*すでに* 起きてしまった
衝突には、上の収拾カードのやり方と `agent-merge-conflict-arbiter` の追加スキルを使ってください。hotspot の
印付けは、収拾役が常設の担当にならないようにするための、川上側の手当てです。

## 複数テナントでの使い方 {#multi-tenant-usage}

1 つの専門役の集団が複数の事業に対応するときは、タスクごとにテナントの札を付けます。

```bash
hermes kanban create "monthly report" \
    --assignee researcher \
    --tenant business-a \
    --workspace dir:~/tenants/business-a/data/
```

ワーカーは `$HERMES_TENANT` を受け取り、記憶の書き込みを接頭辞で分けます。盤もディスパッチャもプロファイルの定義も共有で、分かれるのはデータだけです。

## デスクトップの通知 {#desktop-notifications}

デスクトップアプリのカンバンプラグインは、同じ最終イベントをそのまま画面に出します。ゲートウェイのプラットフォームは要りません。カンバンの盤のイベント接続が生きている間、`completed`、`blocked`、`gave_up`、`crashed`、`timed_out`、triage へ回された（`block_loop_detected`）の各イベントが、ワーカーの引き継ぎ（要約、ブロックの理由、エラー）と「Open Kanban」の操作を添えたアプリ内のトーストを出します。Hermes のウィンドウを離れているときは、同じイベントが OS の通知も鳴らすので（**Settings ▸ Notifications ▸ Plugin notifications** で制御）、別のアプリを使っている最中にタスクが詰まっても気づけます。

届く範囲について。デスクトップの通知は生きているイベントの流れに乗るので、アプリが動いていてカンバンプラグインが有効な間だけ鳴ります。アプリを閉じている間に起きたイベントが、次に起動したときに通知として流し直されることはありません。閉じていても届いてほしい配達には、次のゲートウェイの購読を使ってください。

## ゲートウェイからの通知 {#gateway-notifications}

ゲートウェイ（Telegram、Discord、Slack など）で `/kanban create …` を実行すると、元になったチャットが新しいタスクに自動で購読されます。ゲートウェイの通知役は数秒ごとに `task_events` を見て、最終イベント（`completed`、`blocked`、`gave_up`、`crashed`、`timed_out`）ごとに 1 通をそのチャットへ届けます。完了したタスクでは、ワーカーの `--result` の 1 行目も送られるので、`/kanban show` をしなくても結果が分かります。

購読は CLI から自分で管理することもできます。自分が始めたのではないチャットへ、スクリプトや cron の仕事から知らせたいときに便利です。

```bash
hermes kanban notify-subscribe t_abcd \
    --platform telegram --chat-id 12345678 --thread-id 7 \
    --chat-type group --delivery-mode notify+wake
hermes kanban notify-list
hermes kanban notify-unsubscribe t_abcd \
    --platform telegram --chat-id 12345678 --thread-id 7
```

タスクが `done` か `archived` になると購読は自動で外れます。後片付けは要りません。

**`profile_routes` の下の Discord のスレッドについて。** ゲートウェイが複数のプロファイルを束ね、*チャンネル* を
プロファイルへ振り分けている場合、そのチャンネル内の *スレッド* のために CLI から作った購読には、スレッドの
経路の目印が要ります。ないと通知役はどの経路にも結びつけられず、その購読を飛ばします（WARNING で 1 回だけ記録されます）。
`--parent-chat-id <channel id>` と、Discord なら `--guild-id <guild id>` を明示的に渡してください。

```bash
hermes kanban notify-subscribe t_abcd \
    --platform discord --chat-id <thread id> --thread-id <thread id> --chat-type thread \
    --parent-chat-id <channel id> --guild-id <guild id> --delivery-mode notify+wake
```

チャットの中から作った購読（`/kanban create`、`kanban_create`）は、これらの目印を自動で記録します。

### 配達の方式 {#delivery-modes}

`--delivery-mode` は、最終イベントに通知役が **どう反応するか** を決めます。購読はどれも 3 つの方式のどれかです（`notify` が既定で、これまでの動きです）。

| 方式 | 受け身のメッセージ | エージェントを起こす | こんなときに |
|------|-----------------|-----------------|-------------|
| `notify` | あり | なし | チャットにひとこと届けばよいとき（既定）。 |
| `notify+wake` | あり | あり | 届け先のエージェントに実際に手番を取らせ、盤の文脈を読んで自分の言葉で返させたいとき。チャット由来の自動購読はこれを使う。 |
| `wake` | なし | あり | 別途の通知はいらず、エージェントに動いてほしいだけのとき。 |

`notify+wake` では、受け身の通知が送られたうえで、起こす動きがアダプタの手番の待ち行列に受け入れられて初めて配達が完了します。ハンドラがない、経路が拒まれた、待ち行列がいっぱい、といった場合は購読を失効させずに後の周回で再試行されます。送った通知は SQLite に別途しるしが付くので、起こす動きが拒まれても、すでにしるしの付いた通知が繰り返されることはありません。`notify` は受け身のままで、手番を始めることはありません。受け入れられたからといって、モデルが実際に動くことや返事が成功することまでは保証されません。ふだんの手番の関門はそのまま効きます。これはちょうど 1 回の配達ではありません。送信としるし付けの間でプロセスが落ちれば通知が重複しますし、いまある「配達前に占有する」カーソルは、クラッシュから復旧できる待ち行列ではありません。

「起こす」は、届け先のゲートウェイのエージェントへ人工的な受信メッセージを作って渡し、1 行の受け身の通知ではなく、ふつうの手番（コメントと結果を読み、考え、返す）を取らせる動きです。これは通知役が生きているゲートウェイのプロセスの中で動いているときだけ発火します。そうでない場合、`notify+wake` の購読は受け身のメッセージだけを届け、`wake` だけの購読はそのプロセスでは何もしません。

**どのイベントが起こすか。** タスクの結果を返すもの、あるいはとりまとめの目が要るものです。`completed`、`blocked`、`gave_up`、`crashed`、`timed_out`、`review_requested`（ワーカーが実装を終えて `kanban_request_review` で引き継いだ）、`block_loop_detected`（ブロックが繰り返されてタスクが `triage` へ回された）。`status`、`archived`、`unblocked` は配達されますが、起こしません。これらは帳簿上の遷移であって、注意を促す合図ではないからです。`completed` や `review_requested` が要約を持っているときは、その引き継ぎが起こす手番に乗るので、起きたエージェントにはワーカーが実際にやったことが見えます。

`--chat-type`（`dm` | `group` | `channel` | `thread`）は、元のチャットの種類を記録して、起きた手番が操作者の **本当の** セッションにたどり着けるようにします。`build_session_key` はグループ、チャンネル、スレッドを DM とは違う形で鍵にするので、`chat_type` が違っていると、起こす動きは文脈のない別のセッションへ流れてしまいます。`/kanban` の自動購読とスラッシュコマンドの経路はこれを自動で拾うので、手で設定するのはスクリプトや cron からチャットを購読するときだけです。省くと既存の購読はそのままです（新しい購読の既定は `dm`）。

### 複数プロファイルの構成 — 配達はプロファイルが持つ {#multi-profile-setups-delivery-is-profile-owned}

プロファイルごとにゲートウェイを立てる構成（ディスパッチャは 1 つ、`writer` や
`admin` などのゲートウェイのプロセスは別 — [複数ゲートウェイの
手引き](/hermes/docs/user-guide/features/kanban-multi-gateway/) を参照）では、
配分と配達の持ち主が分かれます。

- **配分は 1 人が持つ。** ちょうど 1 つのゲートウェイだけが
  `kanban.dispatch_in_gateway: true` のままディスパッチャを動かし、他の
  ゲートウェイはすべて `false` にします。
- **通知の配達はプロファイルが持つ。** 配分を担当しないものも含め、どのゲートウェイも
  通知役を動かし、自分がホストするプラットフォームのアダプタに対応する
  プロファイルの印が付いた購読だけを見ます。`writer` プロファイルの Telegram から作られた
  タスクの `completed` / `blocked` は、配分をしたのが `default` の
  ゲートウェイであっても、`writer` のゲートウェイが届けます。
- **振り分けだけの束ね役プロファイル** は、購読に保存された
  プラットフォーム、チャット、スレッド、範囲、親チャンネルの目印が
  `gateway.profile_routes` を通してそのプロファイルちょうどに解決できるとき、主たるアダプタを使えます。
  つながっている二次のアダプタがあれば、そちらが最終権限を持ちます。二次のアダプタの登録が
  途中までしかない状態で、主たるボットへ落ちることはありません。一致しない、割り当てが変わった、
  無効になった、あいまいな経路は、配達されないまま再試行に残ります。必要な経路の目印を
  欠いた古い行が、当て推量でプロファイルに結びつけられることはありません。起こす手番は、
  届け先プロファイルの実行範囲と、許可された通り道を保ちます。
- **古い購読** — プロファイルの印付けより前に作られたもの（行に
  `notifier_profile` がない）は、実際のディスパッチャの単独ロックを握っている
  ゲートウェイだけが届けるので、2 つのゲートウェイが取り合うことはありません。

ゲートウェイをまたいだ二重配達は、盤の DB にあるイベントごとの不可分な占有で
防がれます。中継も、資格情報の共有も、追加のディスパッチャも
要りません。プロファイルごとのゲートウェイが、自分のアダプタで届けるだけです。

## 実行 — 1 回の試行につき 1 行 {#runs-one-row-per-attempt}

タスクは仕事の論理的なまとまりで、**実行（run）** はそれを 1 回やってみることです。ディスパッチャが ready のタスクを占有すると `task_runs` に行を作り、`tasks.current_run_id` をそこへ向けます。その試行が終わると — 完了、ブロック、クラッシュ、タイムアウト、起動失敗、取り戻し — 実行の行は `outcome` を付けて閉じられ、タスク側の指し先は消えます。3 回試したタスクには `task_runs` の行が 3 つあります。

タスクを書き換えるのではなくテーブルを 2 つに分けている理由。実務の振り返りには **試行の履歴全体** が要りますし（「2 回目のレビューは承認まで行った、3 回目でマージした」）、試行ごとのメタデータ — どのファイルが変わったか、どのテストが走ったか、レビュー担当が何を見つけたか — を置くきれいな場所も要ります。これらはタスクの事実ではなく、実行の事実です。

**構造化された引き継ぎ** も実行に置かれます。ワーカーがタスクを完了するとき（`kanban_complete(...)` で）、次のものを渡せます。

- `summary`（ツールの引数）/ `--summary`（CLI） — 人向けの引き継ぎ。実行に付き、下流の子は `build_worker_context` でこれを見ます。
- `metadata`（ツールの引数）/ `--metadata`（CLI） — 実行に付く自由な JSON の辞書。子は要約と並べた形で受け取ります。
- `result`（ツールの引数）/ `--result`（CLI） — タスクの行に載る短い記録（旧来の項目で、後方互換のために残っています）。

下流の子は、親ごとに直近で完了した実行の要約とメタデータを読みます。再試行するワーカーは、自分のタスクの過去の試行（結果、要約、エラー）を読むので、すでに失敗した道をもう一度たどらずに済みます。

```
# What a worker actually does — a tool call, from inside the agent loop:
kanban_complete(
    summary="implemented token bucket, keys on user_id with IP fallback, all tests pass",
    metadata={"changed_files": ["limiter.py", "tests/test_limiter.py"], "tests_run": 14},
    result="rate limiter shipped",
)
```

ワーカーには閉じられないタスクを、あなた（人間）が締める必要があるときも、同じ引き継ぎを CLI から渡せます。放置されたタスクや、ダッシュボードから手で done にしたタスクなどです。

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

実行はダッシュボード（引き出しの Run History の節に、試行ごとに色分けされた行が 1 つずつ）と REST API（`GET /api/plugins/kanban/tasks/:id` が `runs[]` の配列を返します）に出ます。`PATCH /api/plugins/kanban/tasks/:id` に `{status: "done", summary, metadata}` を渡すと両方が中核へ転送されるので、ダッシュボードの「mark done」ボタンは CLI と同じ働きをします。`task_events` の行は自分が属する `run_id` を持つので、UI は試行ごとにまとめられますし、`completed` のイベントは要約の 1 行目を中身に埋め込む（400 文字まで）ので、ゲートウェイの通知役は SQL をもう一度叩かずに構造化された引き継ぎを表示できます。

**まとめて締めるときの注意。** `hermes kanban complete a b c --summary X` は拒否されます。構造化された引き継ぎは実行ごとのものなので、同じ要約を N 件へ貼り付けるのはほぼ確実に間違いだからです。`--summary` / `--metadata` **なし** のまとめ締めは、「事務的なタスクをまとめて片付けた」というよくある場面のために使えます。

**完了時の生きた占有の守り。** ワーカーが生きた占有を持っている `running` のタスクを完了できるのは、そのワーカー自身（実行の中からの `kanban_complete`）か、操作者の明示的な上書き（`hermes kanban complete <id> --force` とダッシュボードの「mark done」）だけです。占有のない `hermes kanban complete <id>` や、とりまとめ役のセッションからの `kanban_complete` は、`--force` / `hermes kanban reclaim` を示して拒否されます。別のセッションが、生きているワーカーの実行を下から閉じてしまうことはもうありません。占有のない `ready`、`blocked`、`review` のカードの完了はこれまでどおりです。

**状態の変更による取り戻し。** ダッシュボードで動いているタスクを `running` の外（`ready` へ戻す、あるいは `todo` へ直接）へドラッグしたり、まだ走っているタスクをアーカイブしたりすると、飛んでいる最中の実行は宙に浮くのではなく `outcome='reclaimed'` で閉じます。`tasks.current_run_id` が `NULL` のとき `task_runs` の行は必ず終わった状態にあり、その逆も成り立ちます。この決まりは CLI、ダッシュボード、ディスパッチャ、通知役のすべてで守られます。

**占有されなかった完了のための人工の実行。** 一度も占有されなかったタスクを完了・ブロックすると（人がダッシュボードから `ready` のタスクを要約付きで閉じる、CLI で `hermes kanban complete <ready-task> --summary X` を実行する、など）、そのままでは引き継ぎが落ちてしまいます。代わりに中核が、要約 / メタデータ / 理由を載せた時間ゼロの実行の行（`started_at == ended_at`）を差し込むので、試行の履歴は欠けません。`completed` / `blocked` のイベントの `run_id` は、その行を指します。

**引き出しの即時更新。** ダッシュボードの WebSocket が、いま開いているタスクの新しいイベントを知らせると、引き出しは自分で読み直します（タスクごとのイベント数を `useEffect` の依存に通しています）。実行の新しい行や結果の更新を見るために、閉じて開き直す必要はもうありません。

### 先を見た互換性 {#forward-compatibility}

`tasks` にある NULL 可の列 2 つは、v2 のワークフロー振り分けのために予約されています。`workflow_template_id`（このタスクがどのテンプレートに属するか）と `current_step_key`（そのテンプレートのどのステップが有効か）です。v1 の中核は振り分けにこれらを使いませんが、クライアントが書き込むことは許すので、v2 のリリースでスキーマ移行をもう一度やらずに振り分けの仕組みを足せます。

## イベント一覧 {#event-reference}

状態が変わるたびに `task_events` へ行が追記されます。どの行も任意の `run_id` を持つので、UI は試行ごとにイベントをまとめられます。種類は 3 つの集まりに分かれていて、絞り込みが簡単です（`hermes kanban watch --kinds completed,gave_up,timed_out`）。

**ライフサイクル**（論理的なまとまりとしてのタスクに何が起きたか）。

| 種類 | 中身 | いつ |
|---|---|---|
| `created` | `{assignee, status, parents, tenant}` | タスクが作られた。`run_id` は `NULL`。 |
| `promoted` | — | すべての親が `done` になり `todo → ready`。`run_id` は `NULL`。 |
| `claimed` | `{lock, expires, run_id}` | ディスパッチャが `ready` のタスクを起動のために不可分に占有した。 |
| `completed` | `{result_len, summary?}` | ワーカーが `--result` / `--summary` を書き、タスクが `done` になった。`summary` は引き継ぎの 1 行目（400 文字まで）で、全文は実行の行にある。一度も占有されていないタスクに引き継ぎの項目付きで `complete_task` が呼ばれると、時間ゼロの実行が作られて `run_id` が何かを指すようになる。 |
| `blocked` | `{reason, kind, recurrences}` | ワーカーか人がタスクを `blocked` にした。`kind` は分類されたブロックの理由（`needs_input`、`capability`、`transient`、ふつうのブロックなら `null`）、`recurrences` は解除ループのカウンタ。一度も占有されていないタスクに `--reason` 付きで呼ばれると、時間ゼロの実行が作られる。 |
| `dependency_wait` | `{reason, kind}` または `{reason: parent_not_done, demoted: true, parent}` | ワーカーが `kind=dependency` でブロックした。別のタスクを待っているだけなので、`blocked` ではなく `todo`（親に関門をかけられ、自動で昇格する）へ回る。人は要らない。`link` / `kanban_link` が `ready` の子を、`done` でない親の下へ置いたときにも出る。子は `todo` へ戻り、このイベントが理由を記録する（`ready → running` の占有は親を確かめ直すので、親が終わるか `hermes kanban unlink` でリンクが外れるまで、何も動かせない）。 |
| `block_loop_detected` | `{reason, kind, recurrences, limit}` | 同じ理由での解除と再ブロックが `BLOCK_RECURRENCE_LIMIT` 回（既定 2 回）繰り返された。また `blocked` に落ちる — cron が解除し続けるだけの場所 — のではなく、とりまとめの目が届く `triage` へ回り、解除と再ブロックのループを断ち切る。 |
| `unblocked` | — | 手動か `/unblock` で `blocked → ready`（親がまだ開いていれば `todo`）。ディスパッチャの `consecutive_failures` はリセットするが、`block_recurrences` はわざと残してループの遮断器に記憶を保たせる。`run_id` は `NULL`。 |
| `archived` | — | 既定の盤から隠される。まだ走っていたタスクなら、その副作用として取り戻された実行の `run_id` を持つ。 |

**編集**（遷移ではない、人による変更）。

| 種類 | 中身 | いつ |
|---|---|---|
| `assigned` | `{assignee}` | 担当が変わった（外した場合も含む）。 |
| `edited` | `{fields}` | タイトルか本文が更新された。 |
| `reprioritized` | `{priority}` | 優先度が変わった。 |
| `status` | `{status}` | ダッシュボードのドラッグ＆ドロップが状態を直接書いた（`todo → ready` など）。`running` から外へドラッグして取り戻された実行の `run_id` を持つ。それ以外では `run_id` は NULL。 |

**ワーカーの記録**（論理的なタスクではなく、実行するプロセスについて）。

| 種類 | 中身 | いつ |
|---|---|---|
| `spawned` | `{pid}` | ディスパッチャがワーカーのプロセスを起動できた。 |
| `heartbeat` | `{note?}` | 長い処理の間、ワーカーが `hermes kanban heartbeat $TASK` を呼んで生存を知らせた。 |
| `reclaimed` | `{stale_lock}` | 完了しないまま占有の TTL が切れた。タスクは `ready` へ戻る。自動の取り戻しは `gave_up` の遮断器に対して 1 回の不成功として数える（ワーカーを起動しないまま占有が終わると、占有 → 取り戻し → 占有 が永久に回ってしまうため）。操作者による `reclaim` のほうはカウンタをリセットする。 |
| `crashed` | `{pid, claimer, exit_kind?, exit_code?, worker_output?}` | ワーカーの PID が消えたが、TTL はまだ切れていなかった。`worker_output` はワーカー自身のログの末尾（最後の応答、または整形されたプロバイダのエラー。飾りを削って 400 文字まで）で、タスクの `last_failure_error` にも追記されるので、盤には終了コードだけでなく *理由* が出る。 |
| `timed_out` | `{pid, elapsed_seconds, limit_seconds, sigkill}` | `max_runtime_seconds` を超えた。ディスパッチャが SIGTERM を送り（5 秒の猶予のあと SIGKILL）、待ち行列へ戻した。 |
| `stale` | `{elapsed_seconds, last_heartbeat_at, heartbeat_age_seconds, timeout_seconds, pid, terminated}` | タスクが `kanban.dispatch_stale_timeout_seconds`（既定 4 時間）より長く走り、**かつ** 直近 1 時間に `kanban_heartbeat` が届かなかった。ディスパッチャは同じホストにいるワーカー（あれば）に SIGTERM を送り、タスクを `ready` に戻して配分し直す。失敗カウンタは進めない（stale はワーカーの落ち度ではなく、ディスパッチャ側の不在検知だから）。長い処理をするワーカーは、これを避けるために少なくとも 1 時間に 1 回 `kanban_heartbeat` を呼ぶこと。 |
| `reconciled` | `{reason, claim_lock, claim_expires, worker_pid}` | 迷子のカードの立て直し。カードは `running` なのに占有の帳簿が壊れていて（`claim_lock` か `claim_expires` が NULL — 占有の途中でのクラッシュ、手作業の SQL、DB の復元）、生きたワーカーもいないため、TTL・クラッシュ・stale のどの経路でも救えない状態だった。ディスパッチャは説明のコメントを付けて `ready` へ戻した。config.yaml の `kanban.reconcile_orphans` で制御（既定 `true`）。 |
| `respawn_guarded` | `{reason}` | ディスパッチャがこの周回で、この ready タスクの起動し直しを拒んだ。理由は `blocker_auth`（前回の失敗が上限・認証・429 のエラー — 待ち時間が明けるのを待つ）、`recent_success`（直近 1 時間に完了した実行がある — 再実行の前にレビューを待つ）、`active_pr`（直近のコメントに GitHub の PR の URL がある — 前のワーカーがすでに PR を開いている）。タスクは `ready` のままで、次の周回にまた起動の機会がある。原因が続く場合は、ふつうの `consecutive_failures` の遮断器が `failure_limit` 回の失敗で `gave_up` を出して自動ブロックする。 |
| `spawn_failed` | `{error, failures}` | 起動の試みが 1 回失敗した（PATH がない、作業場所をマウントできない、など）。カウンタが増え、タスクは再試行のため `ready` へ戻る。 |
| `protocol_violation` | `{pid, claimer, exit_code, protocol_violation, worker_output?}` | タスクがまだ `running` のうちにワーカーが正常終了した。たいていは `kanban_complete` も `kanban_block` も呼ばずに答えてしまった場合。違反のたびに出る（中身の `protocol_violation: true` の印は実行のメタデータへ写され、違反だけを数える再試行の予算に使われる）。予算の内（`_PROTOCOL_VIOLATION_FAILURE_LIMIT`（既定 3 回）まで、*連続する* 違反。タスクごとの `max_retries` が優先）であれば、タスクは次の試行のために `ready` へ戻るだけ。連続が上限に達すると、ディスパッチャは `gave_up` も出して自動ブロックする。`worker_output` はワーカー自身が最後に出した文章（たいていは、なぜ止まったかの説明）で、`last_failure_error` にも畳み込まれ、再試行するワーカーには前回の試行のエラーとして見える。 |
| `gave_up` | `{failures, effective_limit, limit_source, error}` | 連続 N 回の不成功で遮断器が働いた。タスクは最後のエラーとともに自動でブロックされる。実効の上限は、タスクの `max_retries`、次にディスパッチャの `failure_limit` / `kanban.failure_limit`、最後に組み込みの既定の順で決まる。 |

`hermes kanban tail <id>` は 1 つのタスクぶんを表示し、`hermes kanban watch` は盤の全体を流します。

## 対象外のこと {#out-of-scope}

カンバンはわざと 1 台のホストで完結させています。`~/.hermes/kanban.db` はローカルの SQLite のファイルで、ディスパッチャは同じ機械でワーカーを起動します。2 台のホストで 1 つの盤を共有する使い方は対象外です。「ホスト A のワーカー X、ホスト B のワーカー Y」を調整する部品はありませんし、クラッシュの検知も PID が同じホストのものだという前提に立っています。複数のホストが必要なら、ホストごとに独立した盤を動かし、`delegate_task` やメッセージキューで橋渡ししてください。
