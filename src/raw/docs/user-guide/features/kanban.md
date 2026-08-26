---
title: "カンバン（マルチエージェント・ボード）"
description: "複数の Hermes プロファイルを協調させるための、SQLite に永続化されたタスクボード"
upstream_path: user-guide/features/kanban.md
upstream_blob: eacc539e1656a016768d556959acdc44f567851b
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban
---

# カンバン — マルチエージェント・プロファイル協調 {#kanban-multi-agent-profile-collaboration}

> **ひととおり手を動かして確かめたい方へ。** [カンバンのチュートリアル](/hermes/docs/user-guide/features/kanban-tutorial/) をご覧ください。4 つの利用場面（個人開発、フリート運用、リトライ付きロールパイプライン、サーキットブレーカー）を、それぞれのダッシュボードのスクリーンショット付きで追えます。このページは早見表、チュートリアルは物語です。

Hermes カンバンは、すべての Hermes プロファイルで共有される永続的なタスクボードです。壊れやすいインプロセスのサブエージェント群に頼らずに、名前を持った複数のエージェントが同じ作業を進められます。タスクはすべて `~/.hermes/kanban.db` の 1 行、引き継ぎはすべて誰でも読み書きできる 1 行、ワーカーはすべて自分の身元を持つ独立した OS プロセスです。

### 2 つの窓口 — モデルはツール経由、あなたは CLI 経由 {#two-surfaces-the-model-talks-through-tools-you-talk-through-the-cli}

ボードには入口が 2 つあり、どちらも同じ `~/.hermes/kanban.db` を土台にしています。

- **エージェントは専用の `kanban_*` ツールセットでボードを操作します** — `kanban_show`、`kanban_list`、`kanban_complete`、`kanban_request_review`、`kanban_request_changes`、`kanban_block`、`kanban_heartbeat`、`kanban_comment`、`kanban_attach`、`kanban_attach_url`、`kanban_attachments`、`kanban_create`、`kanban_link`、`kanban_unblock` です。ディスパッチャーは各ワーカーを起動する時点でこれらのツールをスキーマに組み込んでおり、オーケストレーター側のプロファイルでも `kanban` ツールセットを明示的に有効化できます。モデルはツールを直接呼んでタスクを読み、振り分けます。`hermes kanban` をシェル経由で叩くわけでは *ありません*。後述の [ワーカーとボードのやり取り](#how-workers-interact-with-the-board) をご覧ください。
- **あなた（およびスクリプトや cron）は、CLI の `hermes kanban …`**、スラッシュコマンドの `/kanban …`、あるいはダッシュボードでボードを操作します。こちらは人間と自動化のための窓口で、背後にツール呼び出しをするモデルがいない場面向けです。

どちらの窓口も同じ `kanban_db` 層を通るため、読み取りは一貫した状態を見られますし、書き込みがずれることもありません。このページの残りはコピー＆ペーストしやすいので CLI の例で説明しますが、CLI のコマンドにはそれぞれモデルが使うツール呼び出しの対応物があります。

これは、`delegate_task` では扱いきれない次のような作業を受け止める形です。

- **調査のトリアージ** — 並列のリサーチャー＋アナリスト＋ライターに、人間が途中で関与する構成。
- **定期運用** — 毎日繰り返されるブリーフィングが、何週間もかけて 1 冊の記録になっていく形。
- **デジタルツイン** — 記憶を積み上げていく、名前付きの常駐アシスタント（`inbox-triage`、`ops-review` など）。
- **開発パイプライン** — 分解 → 複数の worktree で並列実装 → レビュー → 反復 → PR。
- **フリート作業** — 1 人の専門家が N 個の対象を担当する形（50 個の SNS アカウント、12 個の監視対象サービスなど）。

設計思想の全体像、Cline Kanban / Paperclip / NanoClaw / Google Gemini Enterprise との比較分析、そして 8 つの代表的な協調パターンについては、リポジトリ内の `docs/hermes-kanban-v1-spec.pdf` をご覧ください。

## カンバンと `delegate_task` の違い {#kanban-vs-delegatetask}

見た目は似ていますが、部品としては別物です。

| | `delegate_task` | カンバン |
|---|---|---|
| 形 | RPC 呼び出し（fork → join） | 永続的なメッセージキュー＋状態機械 |
| 親 | 子が返るまで待って止まる | `create` した後は投げっぱなし |
| 子の身元 | 匿名のサブエージェント | 記憶が残る名前付きプロファイル |
| 再開できるか | できない — 失敗したら失敗のまま | ブロック → 解除 → 再実行。クラッシュしても回収 |
| 人間の関与 | 非対応 | どの時点でもコメント／ブロック解除ができる |
| タスクあたりのエージェント数 | 1 回の呼び出しにつき 1 サブエージェント | タスクの一生を通じて N 体（リトライ、レビュー、追いタスク） |
| 記録 | コンテキスト圧縮で失われる | SQLite に恒久的に残る行 |
| 連携の形 | 階層的（呼ぶ側 → 呼ばれる側） | 対等 — どのプロファイルもどのタスクを読み書きできる |

**一文で言うと。** `delegate_task` は関数呼び出しで、カンバンは引き継ぎのすべてが、どのプロファイル（や人間）からも見えて編集できる 1 行になっている作業キューです。

**`delegate_task` を選ぶ場面。** 親エージェントが処理を続ける前に短い推論の答えだけ欲しく、人間は関与せず、結果は親のコンテキストに戻ってくればよいとき。

**カンバンを選ぶ場面。** 作業がエージェントの垣根をまたぐとき、再起動をまたいで残す必要があるとき、人間の入力が要るかもしれないとき、別の役割が引き取るかもしれないとき、あるいは後から探し出せる必要があるとき。

両者は共存します。カンバンのワーカーが実行中に内部で `delegate_task` を呼ぶこともあります。

## 中心となる考え方 {#core-concepts}

- **ボード** — 自前の SQLite DB、ワークスペース用ディレクトリ、ディスパッチャーのループ
  を持つ、独立したタスクのキューです。1 つのインストールに複数のボードを置けます
  （プロジェクト単位、リポジトリ単位、分野単位など）。後述の [ボード（複数プロジェクト）](#boards-multi-project)
  をご覧ください。プロジェクトが 1 つだけの方は `default` ボードのまま使い続ければよく、
  この節以外で「ボード」という語に出会うことはありません。
- **タスク** — タイトル、任意の本文、1 人の担当者（プロファイル名）、ステータス（`triage | todo | ready | running | blocked | review | done | archived`）、任意のテナント名前空間、任意の冪等キー（自動化のリトライで重複を防ぐ）を持つ 1 行です。
- **リンク** — 親 → 子の依存関係を記録する `task_links` の行です。ディスパッチャーは、親がすべて `done` になった時点で `todo → ready` に進めます。
- **コメント** — エージェント同士のやり取りの手段です。エージェントも人間もコメントを追記でき、ワーカーが（再）起動されるときにはコメントのスレッド全体を自分のコンテキストの一部として読みます。
- **ワークスペース** — ワーカーが作業するディレクトリです。3 種類あります。
  - `scratch`（既定） — `~/.hermes/kanban/workspaces/<id>/`（既定以外のボードでは `~/.hermes/kanban/boards/<slug>/workspaces/<id>/`）の下に作られる、新しい一時ディレクトリです。**タスクが完了すると削除されます** — scratch はもともと使い捨ての設計です。`kanban_complete(artifacts=[...])` で明示的に申告されたファイルは、後片付けの前にタスクごとの永続的な添付ファイル置き場へコピーされます。旧来の完了サマリーに書かれた成果物のパスも、実在すれば同じ扱いになります。それ以外の scratch のファイルは消えます。申告された scratch の成果物が見つからない場合、そのタスクは進行中のまま残るので、ワーカーがパスを直して再試行できます。ワークスペース全体を残しておきたいときは `worktree:` か `dir:<path>` を使ってください。あるインストールで初めて scratch ワークスペースが作られたときには、ディスパッチャーが警告をログに出し、そのタスクに `tip_scratch_workspace` イベントを記録します（`hermes kanban show <id>` で確認できます）。
  - `dir:<path>` — 既にある共有ディレクトリです（Obsidian の保管庫、メール運用のディレクトリ、アカウントごとのフォルダなど）。**絶対パスである必要があります。** `dir:../tenants/foo/` のような相対パスは、ディスパッチャーがたまたま置かれているカレントディレクトリを基準に解決されてしまい、曖昧なうえに権限のすり抜け経路にもなるため、起動時に拒否されます。それ以外の点では、このパスは信頼されます — あなたの端末、あなたのファイルシステムであり、ワーカーはあなたの uid で動きます。これは「ローカルの利用者は信頼できる」という前提のもとでの設計で、カンバンはもともと単一ホスト向けです。**完了しても残ります。**
  - `worktree` — コーディング作業向けに、`.worktrees/<id>/` の下に作られる git の worktree です。対象のパスを固定したいときは `worktree:<path>` を使います。ワーカー側の `git worktree add` が作成し、指定があれば `--branch` を添えます。**完了しても残ります。**
- **ディスパッチャー** — N 秒ごと（既定は 60 秒）に、古くなった占有の解除、クラッシュしたワーカーの回収（PID は消えているが TTL は切れていないもの）、実行可能になったタスクの繰り上げ、タスクのアトミックな占有、担当プロファイルの起動を行う、長時間動き続けるループです。既定では **ゲートウェイの中で** 動きます（`kanban.dispatch_in_gateway: true`）。1 回のティックで 1 つのディスパッチャーがすべてのボードを見て回り、ワーカーは `HERMES_KANBAN_BOARD` を固定した状態で起動されるので、他のボードは見えません。同じタスクで起動の失敗が `kanban.failure_limit` 回連続すると（既定は 2 回）、ディスパッチャーは最後のエラーを理由としてそのタスクを自動的にブロックします。プロファイルが存在しない、ワークスペースをマウントできないといったタスクで無駄な繰り返しが続くのを防ぐためです。
- **テナント** — ボード *の中* に置ける、任意の文字列の名前空間です。1 つの専門家フリートで、ワークスペースのパスとメモリキーの接頭辞によってデータを分けながら、複数の事業（`--tenant business-a`）を担当できます。テナントはゆるやかな絞り込みで、はっきりした隔離の境界はボードです。

## ボード（複数プロジェクト） {#boards-multi-project}

ボードを使うと、互いに関係のない作業の流れを、プロジェクト単位・リポジトリ単位・
分野単位で独立したキューに分けられます。入れたばかりの環境には `default` という
ボードが 1 つだけあります（後方互換のため DB は `~/.hermes/kanban.db` です）。
作業の流れが 1 本で足りる方は、ボードのことを知らないままで構いません。この機能は
使いたい人だけが使うものです。

ボードごとの隔離は徹底しています。

- ボードごとに別の SQLite DB（`~/.hermes/kanban/boards/<slug>/kanban.db`）。
- `workspaces/` と `logs/` もボードごとに分かれます。
- タスクのために起動されたワーカーには、そのボードのタスク **だけ** が見えます。
  ディスパッチャーが子プロセスの環境変数に `HERMES_KANBAN_BOARD` を設定し、
  ワーカーが使えるすべての `kanban_*` ツールがそれを読むためです。
- ボードをまたいだタスクのリンクはできません（スキーマを単純に保つためです。
  どうしてもプロジェクトをまたいで参照したい場合は、本文中に自由記述で書いておき、
  id から手作業で辿ってください）。

### CLI からボードを管理する {#managing-boards-from-the-cli}

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

ボードが決まる順番（優先度の高いものから）。

1. CLI 呼び出しで明示された `--board <slug>`。
2. 環境変数 `HERMES_KANBAN_BOARD`（ワーカー起動時にディスパッチャーが設定するため、
   ワーカーからは他のボードが見えません）。
3. `~/.hermes/kanban/current` — `hermes kanban
   boards switch` が書き残した slug。
4. `default`。

slug は検証されます。小文字の英数字とハイフンとアンダースコアで、1〜64 文字、
先頭は英数字である必要があります。大文字は自動的に小文字へ変換されます。
それ以外（スラッシュ、空白、ドット、`..`）は CLI の層で拒否されるので、
パスを遡るような細工をボード名に仕込むことはできません。

### ダッシュボードからボードを管理する {#managing-boards-from-the-dashboard}

`hermes dashboard` の Kanban タブでは、ボードが 2 つ以上ある（またはどれかのボードに
タスクがある）時点で、画面上部にボードの切り替えが現れます。ボードが 1 つだけの方には
小さな `+ New board` ボタンしか見えず、切り替えは必要になるまで隠れています。

- **ボードのドロップダウン** — 使うボードを選びます。選択はブラウザーの
  `localStorage` に保存されるので、再読み込みしても残りますし、開いたままの
  ターミナルの足元で CLI 側の `current` が動いてしまうこともありません。
- **+ New board** — slug、表示名、説明、アイコンを尋ねるモーダルが開きます。
  作成後にそのボードへ自動で切り替える選択肢もあります。
- **Settings** — 現在のボードの表示名、説明、そして **プロジェクトディレクトリ**
  （`default_workdir`）を編集するモーダルが開きます。プロジェクトディレクトリは、
  新しいタスクがすべて引き継ぐボード単位のワークスペースの既定値です（git リポジトリなら
  残される worktree、ふつうのディレクトリなら残されるディレクトリになります）。
  タスクごとに作成時に上書きすることもできます。この欄を空にすると、
  新しいタスクは使い捨ての scratch ワークスペースに戻ります。
- **Archive** — `default` 以外のボードにだけ表示されます。確認のうえ、ボードの
  ディレクトリを `boards/_archived/` へ移します。

ダッシュボードの API エンドポイントはすべて、ボードを指定する `?board=<slug>` を
受け付けます。イベントの WebSocket は接続時にボードへ固定されるため、UI で
切り替えると新しいボードに対して新しい WebSocket が開かれます。

## ファイルの添付 {#file-attachments}

タスクにはファイル（PDF、画像、元資料など）を添付できます。本文にパスを貼り付けて
ワーカーが見つけてくれることを祈らなくても、必要な材料が手元に届きます。

- **アップロード** — ダッシュボードのドロワーでタスクを開き、**Attachments**
  セクションの *Upload file* ボタンを使います（複数のファイルを一度に選んでも
  構いません）。1 ファイルあたり 25 MB までです。
- **保存先** — 既定のボードでは
  `<hermes-home>/kanban/attachments/<task_id>/`、名前付きのボードでは
  `<hermes-home>/kanban/boards/<slug>/attachments/<task_id>/` に置かれます。
  場所を指定したい場合は `HERMES_KANBAN_ATTACHMENTS_ROOT` を設定してください。
- **ワーカーからの見え方** — ディスパッチャーがタスクをワーカーに渡すとき、
  ワーカーのコンテキストには各ファイルの名前と **絶対パス** を並べた
  **Attachments** セクションが含まれます。ワーカーはファイルとターミナルの
  ツールをひととおり使えるので、添付を直接読みます（`read_file` や、
  `pdftotext` のようなシェルのツール）。
- **ダウンロードと削除** — ドロワーには添付ごとにダウンロードのリンクと
  削除（×）の操作が並びます。添付を削除すると、メタデータの行とディスク上の
  ファイルの両方が消えます。

:::note リモートのターミナルバックエンド
添付のパスは **ローカル** のターミナルバックエンド上でそのまま解決されます。
これがカンバンのワーカーの既定です。ワーカーをリモートのバックエンド
（Docker、Modal）で動かす場合は、ワーカーのコンテキストにある絶対パスに
届くよう、ボードの `attachments/` ディレクトリをサンドボックスへマウントしてください。
:::

## クイックスタート {#quick-start}

以下のコマンドは、**あなた**（人間）がボードを用意してタスクを作るところです。タスクに担当者が付くと、ディスパッチャーがその担当プロファイルをワーカーとして起動し、そこから先は **モデルが CLI ではなく `kanban_*` のツール呼び出しでタスクを進めます** — [ワーカーとボードのやり取り](#how-workers-interact-with-the-board) をご覧ください。

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

ディスパッチャーが `t_abcd` を拾って `researcher` プロファイルを起動すると、そのワーカーのモデルが最初にすることは、自分のタスクを読むための `kanban_show()` の呼び出しです。`hermes kanban show t_abcd` を実行するわけではありません。

### ゲートウェイ内蔵のディスパッチャー（既定） {#gateway-embedded-dispatcher-default}

ディスパッチャーはゲートウェイのプロセスの中で動きます。追加で入れるものも、
別に面倒を見るサービスもありません。ゲートウェイが動いていれば、実行可能な
タスクは次のティック（既定では 60 秒）で拾われます。

```yaml
# config.yaml
kanban:
  dispatch_in_gateway: true        # default
  dispatch_interval_seconds: 60    # default
  review_dispatch: true            # default: spawn the assigned profile with
                                   # the bundled sdlc-review skill. Set false
                                   # for human-only review boards.
```

デバッグ時には `HERMES_KANBAN_DISPATCH_IN_GATEWAY=0` で設定を実行時に
上書きできます。ゲートウェイの管理方法はふだんどおりで、`hermes gateway
start` を直接実行するか、ゲートウェイを systemd のユーザーユニットとして
登録します（ゲートウェイのドキュメントをご覧ください）。ゲートウェイが
動いていなければ、`ready` のタスクは起動されるまでその場にとどまります。
`hermes kanban create` は作成時にこの点を警告します。

`hermes kanban daemon` を別プロセスとして動かす方法は **非推奨** です。
ゲートウェイをお使いください。どうしてもゲートウェイを動かせない場合
（ヘッドレスなホストの方針で常駐サービスが禁じられているなど）に備えて、
`--force` という逃げ道が 1 リリースのあいだだけ従来の単独デーモンを
生かしていますが、同じ `kanban.db` に対してゲートウェイ内蔵の
ディスパッチャーと単独デーモンの両方を動かすと占有の取り合いが起き、
これは想定外の使い方です。

### 冪等な作成（自動化・Webhook 向け） {#idempotent-create-for-automation-webhooks}

```bash
# First call creates the task. Any subsequent call with the same key
# returns the existing task id instead of duplicating.
hermes kanban create "nightly ops review" \
    --assignee ops \
    --idempotency-key "nightly-ops-$(date -u +%Y-%m-%d)" \
    --json
```

### まとめて処理する CLI のコマンド {#bulk-cli-verbs}

状態を変えるコマンドはどれも複数の id を受け付けるので、まとめて片付ける
のも 1 コマンドで済みます。

```bash
hermes kanban complete t_abc t_def t_hij --result "batch wrap"
hermes kanban archive  t_abc t_def t_hij
hermes kanban unblock  t_abc t_def
hermes kanban block    t_abc "need input" --ids t_def t_hij
```

:::note ブロックを解除したタスクの行き先
`unblock` は安全な元の段階へ戻します。親が完了しているレビュー由来の作業なら
**`review`**、親が完了している実装の作業なら **`ready`**、親がまだ開いているあいだは
**`todo`** です。`todo` のタスクは元の段階の情報を保持し続け、依存の条件が満たされた
時点で自動的に `review` か `ready` へ戻ります。`unblock` が直接 `triage` へ送ることは
ありません。

ブロックを解除したタスクが後から **`triage`** に現れたとしたら、それを起こしたのは
ブロックの解除ではありません。*同じ理由での再ブロック* が原因です。ブロック → 解除 →
同じ原因で再ブロック、が `BLOCK_RECURRENCE_LIMIT` 回（既定は `2`）続くと、
解除ループの遮断機構が働きます。cron がひたすら解除し続けるだけになる `blocked` へ
戻すのをやめ、人間が判断できるよう `triage` へ回します。これは LLM の判断ではなく
DB 側の決定的な守りで、タスクの本文でこの動きを免れることはできません。再発の
カウンターは解除のたびに意図的に残ります（リセットされるのは `complete` が成功した
ときだけです）。解除したタスクを作業の列に留めておきたい場合は、解除する前に
*なぜ再ブロックが繰り返されるのか*（親が終わっていない、入力が足りない、能力が
足りない）を解消してください。繰り返しが想定どおりであれば
`BLOCK_RECURRENCE_LIMIT` を引き上げます。
:::

## ワーカーとボードのやり取り {#how-workers-interact-with-the-board}

**ワーカーは `hermes kanban` をシェルから呼びません。** ディスパッチャーはワーカーを起動するとき、子プロセスの環境変数に `HERMES_KANBAN_TASK=t_abcd` を設定します。この環境変数が、モデルのスキーマにある専用の **カンバンツールセット** を有効にします。同じツールセットは、ツールセットの設定で `kanban` を有効にしたオーケストレーターのプロファイルからも使えます。これらのツールは CLI と同じく、Python の `kanban_db` 層を通じてボードを直接読み書きします。動作中のワーカーは他のツールと同じ感覚でこれらを呼び、`hermes kanban` の CLI を目にすることも必要とすることもありません。

| ツール | 用途 | 必須のパラメーター |
|---|---|---|
| `kanban_show` | 現在のタスクを読みます（タイトル、本文、過去の試行、親からの引き継ぎ、コメント、整形済みの `worker_context` 一式）。既定では環境変数のタスク id を使います。 | — |
| `kanban_list` | `assignee`、`status`、`tenant`、アーカイブの表示可否、件数の上限で絞り込みながら、タスクの概要を並べます。ボード上の作業を見つけるオーケストレーター向けです。 | — |
| `kanban_complete` | `summary` と `metadata` による構造化された引き継ぎを添えて終了します。 | `summary` / `result` のうち少なくとも 1 つ |
| `kanban_request_review` | 同じカードのままレビューを開始します。永続的な `summary`、任意の `metadata`、任意のレビュアープロファイルを添えます。タスクは `review` へ移ります。これはブロックではありません。 | `summary` |
| `kanban_request_changes` | 実行中のレビューからのレビュアーの判定です。そのレビューの実行を閉じ、親の条件を再適用し、ブロックの回数に数えずに元の実装者へタスクを戻します。 | `reason` |
| `kanban_block` | 作業を止め、理由で行き先を決めます。`kind=dependency`（`todo` で待ち、自動で再開）、`needs_input`／`capability`／`transient`（人間に知らせます）。同じ種類の再ブロックが続くと、自動で `triage` へ上げられます。 | `reason` |
| `kanban_heartbeat` | 長い処理の途中で生存を知らせます。副作用だけのツールです。 | — |
| `kanban_comment` | タスクのスレッドに、消えない書き込みを追記します。 | `task_id`、`body` |
| `kanban_attach` | ファイルの中身をそのまま（base64 で）渡してタスクに添付します。タスクの添付ディレクトリに保存されます（上限 25 MB）。 | ファイルの中身と名前 |
| `kanban_attach_url` | URL を指定してファイルをタスクに添付します。 | `url` |
| `kanban_attachments` | タスクの添付を並べます。 | — |
| `kanban_create` | （オーケストレーター向け）`assignee` と、任意の `parents`、`skills` などを指定して、子タスクへ展開します。 | `title`、`assignee` |
| `kanban_link` | （オーケストレーター向け）後から `parent_id → child_id` の依存の辺を追加します。 | `parent_id`、`child_id` |
| `kanban_unblock` | （オーケストレーター向け）ブロックされたタスクを元の段階（`review` か `ready`）へ戻します。親がまだ開いているあいだは `todo` です。 | `task_id` |

ワーカーの典型的な 1 ターンはこんな形です。

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

**オーケストレーター** のワーカーは、自分で作業する代わりに次のように展開します。

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

「（オーケストレーター向け）」と書いたツール — `kanban_list`、`kanban_create`、`kanban_link`、`kanban_unblock`、そして他人のタスクへの `kanban_comment` — は同じツールセットから使えます。慣習として（自動で差し込まれるカンバンの案内文に書かれています）、ワーカーのプロファイルは作業を展開したり無関係な仕事を振り分けたりせず、オーケストレーターのプロファイルは実装作業をしません。ディスパッチャーが起動したワーカーは、状態を大きく変える操作については自分のタスクの範囲に限られ、無関係なタスクを書き換えることはできません。

### なぜ `hermes kanban` を呼ばずにツールを使うのか {#why-tools-instead-of-shelling-to-hermes-kanban}

理由は 3 つあります。

1. **バックエンドを選ばないこと。** ターミナルのツールがリモートのバックエンド（Docker / Modal / Singularity / SSH）を向いているワーカーは、`hermes kanban complete` をコンテナの *中* で実行してしまいます。そこには `hermes` が入っておらず、`~/.hermes/kanban.db` もマウントされていません。カンバンのツールはエージェント自身の Python プロセスで動くので、ターミナルのバックエンドが何であっても必ず `~/.hermes/kanban.db` に届きます。
2. **シェルの引用でつまずかないこと。** `--metadata '{"files": [...]}'` を shlex と argparse に通すのは、いつか事故になる仕掛けです。構造化されたツールの引数なら、その工程がまるごと不要になります。
3. **エラーが読みやすいこと。** ツールの結果はモデルが考えられる構造化された JSON であって、自力で解釈しなければならない標準エラー出力の文字列ではありません。

**ふだんのセッションにはスキーマ上の負担がありません。** ふつうの `hermes chat` のセッションには、アクティブなプロファイルがオーケストレーター用に `kanban` ツールセットを明示的に有効にしていない限り、`kanban_*` のツールは 1 つも載りません。ディスパッチャーが起動したタスクのワーカーは `HERMES_KANBAN_TASK` が設定されているのでタスクの範囲のツールを受け取り、オーケストレーターのプロファイルは設定を通じてより広い振り分けの手段を受け取ります。カンバンを使わない方のツールが増えることはありません。

自動で差し込まれるカンバンの案内文が、どのツールをいつ、どの順で呼ぶのかをモデルに教えます。

### 引き継ぎに残しておきたい根拠 {#recommended-handoff-evidence}

`kanban_complete(summary=..., metadata={...})` は意図的にゆるく作られています。
summary は人が読むための締めくくり、`metadata` は後続のエージェントやレビュアー、
ダッシュボードが文章を読み解かずに再利用できる、機械可読な引き継ぎです。

開発やレビューのタスクでは、次の形の metadata（任意）をおすすめします。

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

これらのキーは慣習であって、スキーマ上の決まりではありません。大事なのは、
次に読む人が 4 つの問いにすぐ答えられるだけの根拠を、どのワーカーも残していく
という性質です。

1. 何が変わったのか。
2. どうやって確かめたのか。
3. 失敗したとき、何があればブロックを解除したり再試行したりできるのか。
4. どのリスクを、承知のうえで残してあるのか。

秘密情報、生のログ、トークン、OAuth の資格情報、無関係な会話の記録は
`metadata` に入れないでください。代わりに、それらを指す手がかりと要約を
置きます。ファイルもテストもないタスクなら、そのことを `summary` に
はっきり書き、`metadata` には実際にある根拠（出典の URL、issue の id、
手作業での確認手順など）を入れます。

### ワーカーの一生 {#the-worker-lifecycle}

カンバンのタスクをこなすプロファイルには、この一連の流れが自動的に備わります。起動時にワーカーのシステムプロンプトへ差し込まれるためです（`KANBAN_GUIDANCE` のブロック）。ですから **入れるものも設定するものもありません**。この案内は、CLI のコマンドではなく **ツール呼び出し** で一生分の流れをワーカーに教えます。

1. 起動したら `kanban_show()` を呼び、タイトル、本文、親からの引き継ぎ、過去の試行、コメントのスレッド全体を読みます。
2. （ターミナルのツールで）`cd $HERMES_KANBAN_WORKSPACE` して、そこで作業します。
3. 長い処理の最中は、数分おきに `kanban_heartbeat(note="...")` を呼びます。**作業が 1 時間を超えそうなら、少なくとも 1 時間に 1 回は `kanban_heartbeat` を呼んでください。** ディスパッチャーは、`kanban.dispatch_stale_timeout_seconds`（既定は 4 時間）を超えて実行中で、直近 1 時間に鼓動のないタスクを、ワーカーが後片付けをせずに落ちたものとみなして回収します。回収そのものは害のない動きですが（失敗カウンターを増やさずに `ready` へ戻り、あらためて配られます）、いま進めていた分の成果は失われます。
4. `kanban_complete(summary="...", metadata={...})` で完了するか、行き詰まったなら `kanban_block(reason="...")` を呼びます。

最後の `kanban_complete` / `kanban_block` の呼び出しは、ワーカーの取り決めの
一部です。タスクがまだ `running` のままワーカーのプロセスが終了ステータス 0 で
終わると、ディスパッチャーはそれを取り決め違反とみなし、
`protocol_violation` イベントを記録します。

**エージェント側での予防。** ワーカーが終了する前に、Hermes はモデルがボードの
終了系ツールを呼ばずに止まろうとしているのを検知すると、最大 2 回まで人工的な
うながしを差し込みます。モデルが次の手順を口で説明して（「では報告書を書きます」）
`finish_reason=stop` で止まる、というよくある場面を拾うためです。うながしは、
`kanban_complete` か `kanban_block` をすぐ呼ぶようモデルに伝えます。この守りが
働くのはディスパッチャーが起動したワーカー（`HERMES_KANBAN_TASK` が設定されて
いるもの）だけで、`HERMES_KANBAN_STOP_NUDGE=0` で無効にできます。

**ディスパッチャー側での回復。** うながしを使い切った場合や、うながしに至る前に
ワーカーが落ちた場合、ディスパッチャーは同じ堂々巡りへ送り返す代わりに、
**回数を区切った再試行** を与えてから（連続した違反が
`_PROTOCOL_VIOLATION_FAILURE_LIMIT` 回まで、既定は 3 回）タスクを自動的に
ブロックします。この持ち分に数えられるのは *連続した* 正常終了の取り決め違反だけで、
あいだに挟まるレート制限による差し戻しは中立、それ以外の失敗が起きれば連続は
途切れます。タスクごとの `max_retries` があればそちらが優先されます。たいていは、
モデルがカンバンのツールを使わずに、ただの文章で答えて終了したという意味です。

一連の流れと、要になる詳細（ワークスペースの種類、成果物の `artifacts`、作ったカードの引き取り方）は、このシステムプロンプトのブロックに同梱されています。どのプロファイルで動いていても、すべてのワーカーがそれを持っています。プロファイルごとにスキルを用意する必要はありません。

### 特定のタスクにスキルを追加で紐づける {#pinning-extra-skills-to-a-specific-task}

タスクによっては、担当プロファイルがふだん持っていない専門的な知識が要ることがあります。`translation` スキルが要る翻訳の仕事、`github-code-review` が要るレビューのタスク、`security-pr-audit` が要るセキュリティ監査などです。そのたびに担当プロファイルを書き換える代わりに、スキルをタスクへ直接付けられます。

**オーケストレーターのエージェントから**（あるエージェントが別のエージェントへ仕事を振る、よくある場面です）は、`kanban_create` ツールの `skills` の配列を使います。

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

**人間から（CLI やスラッシュコマンド）** は、スキルの数だけ `--skill` を繰り返します。

```bash
hermes kanban create "translate README to Japanese" \
    --assignee linguist \
    --skill translation

hermes kanban create "audit auth flow" \
    --assignee reviewer \
    --skill security-pr-audit \
    --skill github-code-review
```

**ダッシュボードから** は、タスク作成のダイアログの **skills** 欄にスキル名をカンマ区切りで入力します。

ディスパッチャーは並べられたスキル 1 つにつき `--skills <name>` を 1 つ渡すので、ワーカーは自動で差し込まれるカンバンの案内文に加えて、それらすべてを読み込んだ状態で起動します。スキル名は、担当者のプロファイルに実際に入っているスキルと一致している必要があります（`hermes skills list` で確認できます）。実行時に取ってくる仕組みはありません。

### タスクごとのモデル指定 {#per-task-model-override}

担当プロファイルの既定とは無関係に、そのタスクのワーカーが使うモデル（必要ならプロバイダーも）を固定できます。

```bash
# At creation
hermes kanban create "hard refactor" --assignee coder \
    --model claude-opus-4.6 --provider anthropic

# Or later — takes effect on the next dispatch
hermes kanban set-model t_abcd claude-opus-4.6 --provider anthropic
hermes kanban set-model t_abcd none    # clear the override
```

ディスパッチャーは、指定されたモデルでワーカーを起動します（`--provider <name>` は設定されている場合に渡され、`--provider` にはモデルの指定が必要です）。ダッシュボードのタスクごとのモデル選択も、同じ `model_override` の項目を動かします。指定がなければ、ワーカーは自分のプロファイルに設定されたモデルを使います。

### 費用の考え方 — 最上位のオーケストレーターと、安価なワーカー {#cost-strategy-frontier-orchestrator-inexpensive-workers}

カンバンはプロファイルごとに設定を持てるので、計画役とワーカーで費用を分けるのが自然にできます。プロジェクトを適切な粒度のカードに分解するには最上位の判断力が要りますが、目的と背景と引き継ぎの根拠が既に書かれたカードをこなすほうには、たいていそこまで要りません。そしてトークンの大半を使うのはワーカーの側なので、費用が生まれるのもワーカーのモデルです。オーケストレーターやディスパッチャーのプロファイルは最上位のモデルで動かし、ワーカーのプロファイルには安価なモデルを割り当ててください。プロファイルはそれぞれ `~/.hermes/profiles/<name>/` の下に自分の `config.yaml` を持ち、ディスパッチャーは `hermes -p <assignee>` を起動するときにそのプロファイル向けの `HERMES_HOME` を渡すので、各ワーカーは自分のプロファイルのモデル設定を読みます。

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

ときどき出てくる品質重視のカードだけは、[タスクごとのモデル指定](#per-task-model-override)（作成時の `--model`／`--provider`、後からの `hermes kanban set-model`、あるいはダッシュボードのモデル選択）でより強いモデルに戻せます。プロファイルを書き換える必要はありません。

### 状態遷移のプラグインフック {#lifecycle-plugin-hooks}

ボード上の状態の移り変わりは [プラグインフック](/hermes/docs/user-guide/features/hooks/#plugin-hooks) を発火させます。`kanban_task_claimed`、`kanban_task_completed`、`kanban_task_blocked` の 3 つで、いずれも `task_id` と `profile_name` を伴います。フックはボードの DB への変更が確定した **後** に発火するので、コールバックからは常に確定した状態が見えます。プロセスが分かれる点にご注意ください。`kanban_task_claimed` は **ディスパッチャー** のプロセスで発火し、`kanban_task_completed`／`kanban_task_blocked` は **ワーカー** のプロセスで発火します。すべての移り変わりを一箇所で見るには、ディスパッチャーのプロファイルにフックを登録してください。

```python
def register(ctx):
    def on_blocked(task_id=None, profile_name=None, **kw):
        ctx.dispatch_tool("terminal", {"command": f"notify-send 'kanban blocked: {task_id}'"})
    ctx.register_hook("kanban_task_blocked", on_blocked)
```

### ゴールモードのカード（`--goal`） {#goal-mode-cards---goal}

既定では、ワーカーがカードに取り組む機会は **1 回だけ** です。作業をして、`kanban_complete`／`kanban_block` を呼び、終了します。CLI で `--goal` を、あるいは `kanban_create` ツールやダッシュボードで `goal_mode=True` を渡すと、そのワーカーは代わりに **ゴールのループ** で動きます。`/goal` スラッシュコマンドの裏にあるのと同じ Ralph 方式の仕組みです。1 ターンごとに補助の判定役が、ワーカーの出力をカードのタイトルと本文（これが受け入れ条件として扱われます）と照らし合わせます。まだ終わっていなくてターンの持ち分が残っていれば、ワーカーは **同じセッションのまま** 作業を続けます。判定役が納得するか、ワーカー自身がタスクを終えるか、持ち分が尽きるまでです（尽きた場合は黙って終わるのではなく、人が見られるようカードを **ブロック** します）。

```bash
hermes kanban create "Translate the docs site to French" \
    --body "Acceptance: every page translated, no English left, links intact." \
    --assignee linguist \
    --goal \
    --goal-max-turns 15      # optional; default 20
```

答えの形が決まっていない作業、手順が多い作業、「X が成り立つまで続ける」たぐいのカードに向いています。軽い 1 回きりの作業では使わないでください。ターンごとの判定の手間に見合いませんし、ディスパッチャーの既存の再試行とサーキットブレーカーが、一時的なワーカーの失敗はすでに面倒を見ています。判定役の出来はゴールの文章次第なので、本文には **はっきりした受け入れ条件** を書いてください。

:::note ゴールモードのカードは `/goal` の仕組みを借りているだけで、つながってはいません
`--goal` は継続のループを *そのカードのワーカーのセッションの中で* 回します。共有しているのは [`/goal` スラッシュコマンド](/hermes/docs/user-guide/features/goals/) との仕組みであって、状態ではありません。チャットのセッションで `/goal` を設定してもカンバンのカードが作られたり、引き取られたり、動いたりすることはありませんし、ゴールモードのカードのループはチャットの `/goal status` からは見えません。いまの会話を反復させたいなら [`/goal`](/hermes/docs/user-guide/features/goals/) を、ボード上の作業にしたいならカードを作ってください。
:::

### オーケストレーターのふるまい {#how-the-orchestrator-behaves}

**行儀のよいオーケストレーターは、自分では作業しません。** 利用者の目的をタスクへ分解し、互いを結びつけ、あなたが用意したプロファイルのどれかに割り当てて、身を引きます。オーケストレーター向けの案内文 — 自分でやってしまいたくなる誘惑を断つ決まり、手順 0 としてプロファイルを調べさせるうながし（担当者の名前が存在しないとディスパッチャーは黙って失敗するので、オーケストレーターはすべてのカードを実在するプロファイルに結びつける必要があります）、そして `kanban_create` / `kanban_link` / `kanban_comment` を軸にした分解の手引き — は、自動的にワーカーのシステムプロンプトへ差し込まれます。入れるものはありません。

代表的なオーケストレーターの 1 ターンです（2 人のリサーチャーが並行して調べ、ライターへ引き継ぎます）。

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

オーケストレーター向けの案内文は、ワーカーのシステムプロンプトに自動的に同梱されます。プロファイルごとに入れたり同期したりする作業はありません。

**展開する前に決めておくこと。** 設計上の判断はオーケストレーターのもので、ワーカーのものではありません。並行する 2 枚のカードがどちらも同じこと（命名の方式、スキーマ、ファイル形式、API の形）を選ばなければならないなら、オーケストレーターが一度だけ決めて、その判断を **両方の** カードの本文に書き込みます。ワーカーからは兄弟のカードが見えないので、子のカードの本文には、そのカードが頼っている判断をすべて書いておく必要があります。たとえば「書き出し側を作る」「読み込み側を作る」という並行のカードでは、それぞれのワーカーに勝手なファイル形式を考えさせないでください。最初に 1 つ決めて（たとえば `version` フィールドを持つ改行区切りの JSON）、両方の本文に書きます。そうしないと、2 つの半分が噛み合うことはありません。

いちばんうまくいくのは、ツールセットをボードの操作（`kanban`、`gateway`、`memory`）だけに絞ったプロファイルと組み合わせる形です。そうすれば、オーケストレーターは仮にやろうとしても実装のタスクを実行できません。

## ダッシュボード（GUI） {#dashboard-gui}

`/kanban` の CLI とスラッシュコマンドだけでも画面なしでボードは回せますが、人が途中で関わる場面 — トリアージ、プロファイルをまたいだ監督、コメントのスレッドを読むこと、カードを列から列へ動かすこと — には、目に見えるボードのほうが向いています。Hermes はこれを `plugins/kanban/` に置かれた **同梱のダッシュボードプラグイン** として提供します。中核の機能でも、別サービスでもありません。[ダッシュボードの拡張](/hermes/docs/user-guide/features/extending-the-dashboard/) で説明されている作りに沿っています。

開き方はこうです。

```bash
hermes kanban init      # one-time: create kanban.db if not already present
hermes dashboard        # "Kanban" tab appears in the nav, after "Skills"
```

### プラグインでできること {#what-the-plugin-gives-you}

- ステータスごとに 1 列を並べた **Kanban** タブ。`triage`、`todo`、`ready`、`running`、`blocked`、`done`（切り替えを入れると `archived` も）が並びます。
  - `triage` は、まだ粗い思いつきを置いておく列です。既定（`kanban.auto_decompose: true`）では、ここに入ったタスクに対してディスパッチャーが自動で **分解役** を走らせます。組み込みの分解役は `auxiliary.kanban_decomposer` のモデルを使い、あなたのプロファイル一覧（説明つき）を読んで、タスクを小さな子タスクのグラフへ展開し、いちばん合う専門家に振り分けます。もとのタスクは全部の子の親として残るので、すべてが終わったときにその担当者（`kanban.orchestrator_profile`、未設定なら現在の既定プロファイル）が目を覚まし、完了を見届けます。ページ上部の **Orchestration: Auto/Manual** のピルで切り替えるか（緑＝Auto、くすんだ灰色＝Manual）、`config.yaml` を直接書き換えます。どちらのモードでも `hermes kanban specify` は使えます。展開せずに 1 つのタスクの仕様を書き直したいときには、引き続きこちらが使えます。
- カードにはタスクの id、タイトル、優先度のバッジ、テナントのタグ、担当プロファイル、コメントとリンクの数、**進捗のピル**（依存されているタスクなら、子の完了数が `N/M` で出ます）、そして「作成から N 経過」が表示されます。カードごとのチェックボックスで複数選択もできます。
- **Running の中でプロファイルごとに列を分ける** — ツールバーのチェックボックスで、Running の列を担当者ごとにまとめ直せます。
- **WebSocket による即時更新** — プラグインは追記だけの `task_events` テーブルを短い間隔で追いかけます。どのプロファイル（CLI、ゲートウェイ、別のダッシュボードのタブ）が動いても、その瞬間にボードへ反映されます。再読み込みは間引かれるので、イベントがまとめて届いても取得は 1 回で済みます。
- カードを列から列へ **ドラッグ＆ドロップ** すればステータスが変わります。ドロップすると `PATCH /api/plugins/kanban/tasks/:id` が送られ、CLI と同じ `kanban_db` のコードを通ります。3 つの窓口がずれることはありません。取り返しのつかないステータス（`done`、`archived`、`blocked`）へ移すときは確認を求められます。タッチ端末ではポインター方式の代替が使われるので、タブレットからでも操作できます。
- **タスク作成のダイアログ** — 列の見出しの `+` を押すと、項目名の付いたモーダルが開きます。タイトル、担当者、優先度、スキル、ワークスペースの種類とパス（ボードのプロジェクトディレクトリが初期値。タスクごとに上書き可）、ゴールモード、そして（任意で）既存のすべてのタスクから選べる親タスクです。Enter で作成、Shift+Enter でタイトル欄に改行、Escape で取り消しです。Triage の列から作ると、新しいタスクは自動的に triage に置かれます。
- **複数選択と一括操作** — カードを shift／ctrl クリックするか、チェックボックスを入れると選択に加わります。上部に一括操作のバーが現れ、ステータスの一括変更、アーカイブ、担当の付け替え（プロファイルのドロップダウン、または「(unassign)」）ができます。取り返しのつかない一括操作は先に確認されます。id ごとの失敗は、残りを中断せずに報告されます。
- **カードをクリック**（shift／ctrl なし）すると横からドロワーが開き（Escape か外側のクリックで閉じます）、次のものが見られます。
  - **編集できるタイトル** — 見出しをクリックすると変えられます。
  - **編集できる担当者と優先度** — メタ情報の行をクリックすると書き換えられます。
  - **編集できる説明** — 既定では Markdown として描画されます（見出し、太字、斜体、インラインのコード、コードブロック、`http(s)` / `mailto:` のリンク、箇条書き）。「edit」ボタンでテキストエリアに切り替わります。Markdown の描画はごく小さな、XSS に強い実装です。置換はすべて HTML エスケープ済みの文字列に対して行われ、通るリンクは `http(s)` / `mailto:` だけ、`target="_blank"` と `rel="noopener noreferrer"` は常に付きます。
  - **依存関係の編集** — 親と子をチップで並べ、それぞれに解除の `×` が付きます。加えて、他のすべてのタスクから選べるドロップダウンで、親や子を新しく追加できます。循環しようとするとサーバー側ではっきりした理由とともに拒否されます。
  - **ステータスの操作行**（→ triage / → ready / → running / block / unblock / complete / archive）。取り返しのつかない変更には確認が入ります。**Triage** の列のカードでは、この行に LLM を使う操作が 2 つ増えます。**⚗ Decompose** はタスクを子タスクのグラフへ展開し、説明をもとに専門のプロファイルへ振り分けます。**✨ Specify** は 1 つのタスクの仕様を書き直します。Decompose は、展開しても得がないと LLM が判断した場合には specify と同じ形の繰り上げに落ちるので、こちらが完全に上位互換です。どちらも CLI（`hermes kanban decompose <id>` / `specify <id>` / `--all`）、どのゲートウェイのプラットフォーム（`/kanban decompose <id>`）、そしてプログラムから `POST /api/plugins/kanban/tasks/:id/decompose` と `…/specify` で呼べます。モデルは `config.yaml` の `auxiliary.kanban_decomposer` と `auxiliary.triage_specifier` で設定します。
  - 結果の欄（こちらも Markdown で描画されます）、Enter で送信できるコメントのスレッド、直近 20 件のイベント。
- **ツールバーの絞り込み** — 自由入力の検索、テナントのドロップダウン（既定値は `config.yaml` の `dashboard.kanban.default_tenant`）、担当者のドロップダウン、「show archived」の切り替え、「lanes by profile」の切り替え、そして次の 60 秒のティックを待たずに済む **Nudge dispatcher** ボタン。

見た目が目指しているのは、見慣れた Linear / Fusion の配置です。暗い配色、件数つきの列見出し、色分けされたステータスの点、優先度とテナントのピル型のチップ。プラグインはテーマの CSS 変数（`--color-*`、`--radius`、`--font-mono`、…）だけを読むので、どのダッシュボードのテーマを使っていても自動でその見た目になじみます。

### Auto と Manual の使い分け {#auto-vs-manual-orchestration}

Triage の列に置いたタスクの扱い方は 2 通りあります。

**Auto（既定）** — `kanban.auto_decompose: true`。ゲートウェイに内蔵されたディスパッチャーが、ティックごとに **分解役** を走らせます。1 ティックあたりの上限は `kanban.auto_decompose_per_tick`（既定は 3 タスク）で、トリアージのタスクをまとめて放り込んでも補助 LLM の費用が一気に膨らまないようにしています。分解役は組み込みの分解用のプロンプトと `auxiliary.kanban_decomposer` のモデルを使い、入っているプロファイルとその説明を読み、LLM に JSON のタスクグラフを作らせます。どのタスクを生やすか、誰に渡すか、どれがどれに依存するか、です。もとのトリアージのタスクはグラフの葉すべての親になるので、グラフ全体が終わるまで生き続け、そのあと `ready` へ戻って担当者（`kanban.orchestrator_profile`、未設定なら現在の既定プロファイル）が完了を見届け、まだ足りなければタスクを足せます。「一行だけ書いて放っておく」使い方はこれです。

**Manual** — `kanban.auto_decompose: false`。トリアージのタスクは、あなたが手を動かすまで triage に留まります。カードの **⚗ Decompose** ボタンを押すか、`hermes kanban decompose <id>`（または `--all`）を実行するか、チャットから `/kanban decompose <id>` を使います。分解役が入る前のボードのふるまいと同じで、何をいつ動かすかを自分で握っていたいときに向いています。

**ここは間違えやすい境目です。** Manual モードが止めるのは、組み込みのトリアージ分解役だけです。プロファイルが `kanban_create` を呼ぶことは止めませんし、作成元のセッションが起こされる仕組みも無効になりません。`kanban.auto_subscribe_on_create: true` のとき、タスクの終了イベントは作成元のエージェントを人工的な状況報告のターンで再開させ、引き継ぎを確かめて本当に追加の作業が要るかを判断させます。タスクの完了を受け身のままにしておきたい場合は `auto_subscribe_on_create: false` にしてください。出どころが分かるよう、組み込みの分解役が作った子には `created_by=auto-decomposer` が付き、再開したプロファイルが作ったタスクにはそのプロファイル名が入ります。

2 つのモードの切り替えは、カンバンのページ上部の **Orchestration: Auto/Manual** のピル（緑＝Auto、くすんだ灰色＝Manual）から行うか、`config.yaml` を直接書き換えます。どちらのモードでも `hermes kanban specify` は使えます。展開せずに 1 つのタスクの仕様を書き直したいときには、引き続きこちらが使えます。

分解役の振り分けの判断は、プロファイルの説明文に左右されます。これはプロファイルごとに付ける短いラベルで、`hermes profile create --description "..."`、`hermes profile describe <name> --text "..."`、`hermes profile describe <name> --auto`（そのプロファイルに入っているスキルとモデルから LLM が生成します）、あるいはダッシュボードの **Orchestration settings** パネルを開いたところにあるプロファイルごとの編集画面で設定します。説明のないプロファイルも一覧には出ます。名前で振り分けられますが、精度は落ちます。分解役が `assignee=None` の子タスクを作ることは決してありません。LLM が知らないプロファイルを選んだ場合、その子は `kanban.default_assignee`（未設定なら現在の既定プロファイル）へ回されます。

`kanban.orchestrator_profile` は、そのプロファイルのプロンプトやスキル、独自のロジックを分解の呼び出しに読み込むわけではありません。展開後に、大もとのタスク（オーケストレーションのタスク）を誰が持つかを決めるものです。分解役のモデルやプロバイダーを変えるには `auxiliary.kanban_decomposer` を設定してください。組み込みの分解役の代わりにプロファイル独自のタスク分割ロジックを使いたい場合は、Manual モードに切り替えて、そのプロファイルにタスクを作らせるか分解させてください。

設定の項目（すべて `~/.hermes/config.yaml` の `kanban:` の下）。

| キー | 既定値 | 用途 |
|---|---|---|
| `auto_decompose` | `true` | ディスパッチャーがティックごとに、Triage のタスクへ組み込みの分解役を自動で走らせます。プロファイル発の `kanban_create` の呼び出しや、作成元を起こすターンを止めるものではありません。 |
| `auto_decompose_per_tick` | `3` | ディスパッチャーの 1 ティックあたりの分解の上限です。あふれた分は次のティックに回ります。 |
| `orchestrator_profile` | `""` | 分解後に、大もとのタスク（オーケストレーションのタスク）へ割り当てられるプロファイルです。空なら現在の既定プロファイルに戻ります。 |
| `default_assignee` | `""` | LLM が知らないプロファイルを選んだときに、子タスクが送られる先です。空なら現在の既定に戻ります。 |
| `auto_subscribe_on_create` | `true` | `kanban_create` が常駐のゲートウェイや TUI のセッションの中で動いたとき、終了イベントが作成元のエージェントを人工的な状況報告のターンで再開させます。完了を受け身にしたい場合や、`kanban_notify-subscribe` の明示的な呼び出しを必須にしたい場合は `false` にします。`auto_decompose` とは独立しています。 |
| `done_sub_retention_days` | `30` | 通知の購読は `done` を越えて残り（再オープンしても大丈夫です）、`archived` で削除されます。通知側のごみ掃除は、タスクが `done` のまま新しいイベントなしでこの日数を過ぎた購読を消し、アーカイブしないボードでも購読のテーブルが増え続けないようにします。`0` で掃除を止めます。 |

そして、補助の LLM の枠が 2 つあります。

| キー | 用途 |
|---|---|
| `auxiliary.kanban_decomposer` | タスクグラフを作るモデルです（Decompose から呼ばれます）。`provider`／`model` を設定すると、主なチャットのモデルを上書きできます。 |
| `auxiliary.profile_describer` | プロファイルの説明を自動生成するモデルです（`hermes profile describe --auto` から呼ばれます）。 |

### 全体の作り {#architecture}

GUI はあくまで **DB から読み、kanban_db を通して書く** だけの層で、それ自体は業務のロジックを持ちません。

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

すべての経路は `/api/plugins/kanban/` の下に置かれ、ダッシュボードの一時的なセッショントークンで守られています。

| メソッド | パス | 用途 |
|---|---|---|
| `GET` | `/board?tenant=<name>&include_archived=…` | ステータスの列ごとにまとめたボード全体と、絞り込み用のテナントおよび担当者の一覧 |
| `GET` | `/tasks/:id` | タスク＋コメント＋イベント＋リンク |
| `POST` | `/tasks` | 作成（`kanban_db.create_task` を包み、`triage: bool` と `parents: [id, …]` を受け付けます） |
| `PATCH` | `/tasks/:id` | ステータス／担当者／優先度／タイトル／本文／結果 |
| `POST` | `/tasks/bulk` | `ids` に並べたすべての id へ同じ変更（ステータス／アーカイブ／担当者／優先度）を適用します。id ごとの失敗は、他を中断せずに報告されます |
| `POST` | `/tasks/:id/comments` | コメントを追記します |
| `POST` | `/tasks/:id/specify` | トリアージの仕様書き役を実行します。補助 LLM がタスクの本文を書き足し、`triage` から `todo` へ繰り上げます。`{ok, task_id, reason, new_title}` を返します。「triage にない」、補助クライアントがない、LLM のエラー、といった場合は人が読める理由を添えた `ok=false` を 200 で返し、4xx にはしません |
| `POST` | `/tasks/:id/decompose` | カンバンの分解役を実行します。補助 LLM がタスクグラフを作り、補助の処理が子の作成、大もととのリンク、`triage → todo` の切り替えをまとめて行います。`{ok, task_id, reason, fanout, child_ids, new_title}` を返します。LLM のエラーでも 200 を返す点は `/specify` と同じです。 |
| `GET` | `/profiles` | 入っているプロファイルを説明つきで並べます（ダッシュボードのプロファイル説明の編集画面と、オーケストレーターの選択に使われます）。 |
| `PATCH` | `/profiles/:name` | プロファイルの説明を設定または消去します（利用者が書いたもの — `description_auto: false`）。`{ok, profile, description}` を返します。 |
| `POST` | `/profiles/:name/describe-auto` | `auxiliary.profile_describer` を使ってプロファイルの説明を生成します。`description_auto: true` で保存されるので、ダッシュボードが「要確認」のバッジを出せます。 |
| `GET` | `/orchestration` | カンバンのオーケストレーション設定（`orchestrator_profile`、`default_assignee`、`auto_decompose`）と、既定値へ落ちた後の *実際に効く* 値を読みます。 |
| `PUT` | `/orchestration` | `config.yaml` にある 3 つのオーケストレーションのキーを、1 つ以上まとめて更新します。空でないプロファイル名が実在するかを検証します。 |
| `POST` | `/links` | 依存関係（`parent_id` → `child_id`）を追加します |
| `DELETE` | `/links?parent_id=…&child_id=…` | 依存関係を削除します |
| `POST` | `/dispatch?max=…&dry_run=…` | ディスパッチャーをうながします。60 秒待たずに済みます |
| `GET` | `/config` | `config.yaml` から `dashboard.kanban` の設定を読みます — `default_tenant`、`lane_by_profile`、`include_archived_by_default`、`render_markdown` |
| `WS` | `/events?since=<event_id>` | `task_events` の行をそのまま流し続けます |

どのハンドラーも薄い包みにすぎません。プラグインは Python にして 700 行ほど（ルーター＋WebSocket の追従＋一括処理＋設定の読み取り）で、新しい業務ロジックは足していません。小さな `_conn()` の補助が読み書きのたびに `kanban.db` を自動で用意するので、入れたばかりの環境でも、先にダッシュボードを開いても、REST の API を直接叩いても、`hermes kanban init` を実行しても、どれでも動きます。

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

どのキーも任意で、書かなければ上に示した既定値になります。

### セキュリティの考え方 {#security-model}

ダッシュボードの HTTP 認証のミドルウェアは [`/api/plugins/` を意図的に素通しします](/hermes/docs/user-guide/features/extending-the-dashboard/#backend-api-routes)。ダッシュボードは既定で localhost にだけ待ち受けるため、プラグインの経路は設計として認証を求めません。つまり、カンバンの REST の窓口には、そのホスト上のどのプロセスからも届きます。

WebSocket だけは一歩多く踏みます。ダッシュボードの一時的なセッショントークンを `?token=…` のクエリパラメーターとして要求します（ブラウザーはアップグレードの要求に `Authorization` を付けられないためです）。ブラウザー内の PTY のブリッジと同じやり方です。

`hermes dashboard --host 0.0.0.0` で動かすと、カンバンを含むすべてのプラグインの経路がネットワークから届くようになります。**共有のホストでは、これをしないでください。** ボードにはタスクの本文、コメント、ワークスペースのパスが入っています。ここに手が届いた相手は、あなたの協働の場を丸ごと読めるうえに、タスクの作成、担当の付け替え、アーカイブもできてしまいます。

`~/.hermes/kanban.db` のタスクは、意図的にプロファイルに依存しません（それが協調の仕組みそのものだからです）。`hermes -p <profile> dashboard` でダッシュボードを開いても、そのホスト上の他のどのプロファイルが作ったタスクも表示されます。すべてのプロファイルの持ち主は同じ利用者ですが、複数の人格を使い分けている場合は知っておく価値があります。

### 即時更新 {#live-updates}

`task_events` は、単調に増える `id` を持つ、追記だけの SQLite のテーブルです。WebSocket の窓口はクライアントごとに最後に見たイベントの id を保持し、新しい行が届くたびに送ります。イベントがまとめて届いたときは、フロントエンド側で（とても軽い）ボードの窓口を読み直します。イベントの種類ごとに手元の状態を修正しようとするより、単純で正確だからです。WAL モードなので、読み取りのループがディスパッチャーの `BEGIN IMMEDIATE` による占有のトランザクションを妨げることはありません。

### 拡張する {#extending-it}

このプラグインは Hermes ダッシュボードの標準的なプラグインの取り決めに沿っています。マニフェストの一覧、シェルの差し込み口、ページ単位の差し込み口、プラグイン SDK については [ダッシュボードの拡張](/hermes/docs/user-guide/features/extending-the-dashboard/) をご覧ください。列を足す、カードの見た目を変える、テナントで絞り込んだ配置にする、`tab.override` でまるごと差し替える — いずれもこのプラグインを分岐させずに書けます。

消さずに無効にしたい場合は、`config.yaml` に `dashboard.plugins.kanban.enabled: false` を足してください（または `plugins/kanban/dashboard/manifest.json` を削除します）。

### どこまでを担うか {#scope-boundary}

GUI はあえて薄く作られています。プラグインができることはすべて CLI からも届き、プラグインはそれを人が扱いやすくしているだけです。自動割り当て、予算、ガバナンスの関門、組織図の表示は、設計書の対象外の節に並べられているとおり、利用者側の領域のまま残されています。振り分け役のプロファイル、別のプラグイン、あるいは `tools/approval.py` の再利用で実現してください。

## CLI コマンド一覧 {#cli-command-reference}

これは **あなた**（あるいはスクリプト、cron、ダッシュボード）がボードを動かすための窓口です。ディスパッチャーの中で動くワーカーは、同じ操作を `kanban_*` の [ツールの窓口](#how-workers-interact-with-the-board) で行います。ここの CLI とあちらのツールはどちらも `kanban_db` を通るので、2 つの窓口は作りからしてずれません。

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
hermes kanban complete <id>... [--result "..."]
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

これらのコマンドはすべて、対話型の CLI とメッセージングのゲートウェイでスラッシュコマンドとしても使えます（後述の [`/kanban` スラッシュコマンド](#kanban-slash-command) をご覧ください）。

`--max-retries` は、ディスパッチャーのサーキットブレーカーをタスクごとに上書きするものです。`--max-retries 1` なら最初の失敗でタスクをブロックし、`--max-retries 3` なら 2 回の再試行を許して 3 回目の失敗でブロックします。省略すると `config.yaml` の `kanban.failure_limit` が使われ、それもなければ組み込みの既定値になります。

### 同時実行・実行時刻・子の繰り上げの設定 {#concurrency-scheduling-and-child-promotion-config}

| 設定のキー | 既定値 | はたらき |
|------------|---------|--------------|
| `kanban.max_in_progress` | 未設定（無制限） | 同時に走るタスクの数の上限です。ボードで既に N 件が走っていると、ディスパッチャーはそれ以上の起動を見送ります。動作の遅いワーカー（ローカルの LLM、資源の限られたホスト）で、抱えている分を終える前に積み上がってタイムアウトするのを防げます。不正な値や 1 未満の値は警告をログに出し、無制限として扱われます。 |
| `kanban.max_in_progress_per_profile` | 未設定（無制限） | `max_in_progress` のプロファイルごとの版で、1 つの担当プロファイルが同時に走らせられるタスクの数を制限します。あるプロファイルだけが遅い、あるいはレート制限を受けているけれど、他は流し続けたいときに便利です。ボード全体の `max_in_progress` と併せて働き、両方が許したときだけ起動が進みます。 |
| `kanban.auto_promote_children` | `true` | `decompose_triage_task()` が親による待ちのない子を作った後、ディスパッチャーが拾えるように自動で `ready` へ繰り上げます。人の確認を必須にしたい場合は `false` にします。子は繰り上げるまで `todo` に留まります。 |
| `kanban.default_workdir` | 未設定 | 新しいタスクに適用される、ボード単位の既定の作業ディレクトリです。`--workspace` もタスク自身の指定もない場合に使われます。タスクごとの `workspace:` のほうが優先されます。 |

```yaml
kanban:
  max_in_progress: 2
  auto_promote_children: false
  default_workdir: ~/work/active-project
```

### 開始時刻の予約（`scheduled_at`） {#scheduled-task-starts-scheduledat}

タスクに `scheduled_at` を設定すると、指定した時刻まで配布が遅らされます。ディスパッチャーは `scheduled_at` が未来の実行可能なタスクを飛ばし、その時刻を過ぎた最初のティックで拾います。

```bash
hermes kanban create "nightly backup audit" \
  --assignee ops --scheduled-at "2026-06-01T03:00:00Z"
```

### 再起動の抑制 {#respawn-guard}

前回の実行で使用量・認証・429 のエラーに当たった場合（`blocker_auth`）、抑制の時間内に実行が成功して終わった場合（`recent_success`）、あるいは最近のタスクのコメントが GitHub の PR を指している場合（`active_pr`）、ディスパッチャーは実行可能なタスクの再起動を拒みます。人が追いつくまでのあいだ、同じ不具合やタスクに向かってワーカーが押し寄せるのを防ぎます。[イベント一覧](#event-reference) の `respawn_guarded` の行をご覧ください。

### ドラッグでの削除と一括削除（ダッシュボード） {#drag-to-delete-and-bulk-delete-dashboard}

ダッシュボードのカンバンのページには **ごみ箱の受け皿** があります。カードをそこへドラッグすると、そのタスクが削除されます（`task_events`、子のリンク、購読までまとめて消えます）。うっかりを防ぐために確認が入ります。一括削除は、JSON の本文 `{"ids": ["t_abc", "t_def", ...]}` を添えた `DELETE /api/plugins/kanban/tasks` でも行えます。

### ワーカーの様子を見る窓口 {#worker-visibility-endpoints}

ダッシュボードのプラグイン API では、外部の監視向けに次の読み取り専用の窓口（と実行を止めるコマンドが 1 つ）が使えます。

| 窓口 | 返るもの |
|----------|---------|
| `GET /api/plugins/kanban/workers/active` | いま起動しているワーカーと、その PID、プロファイル、タスク id、開始時刻、最後の鼓動 |
| `GET /api/plugins/kanban/runs/{id}` | 1 回の実行の詳細 — タスク id、状態、開始と終了、終了コード、ログのパス |
| `POST /api/plugins/kanban/runs/{run_id}/terminate` | 回収できる実行を止めます。ワーカーを終わらせ、タスクを再配布できるようにします |
| `GET /api/plugins/kanban/inspect` | ディスパッチャーのまとめ — 溜まっている数、進行中の数と `max_in_progress` の比較、最近のイベント |

これらはいずれも、カンバンのプラグイン API の他の部分と同じダッシュボードのプラグイン認証で守られています。

### カンバン Swarm の構成を作る補助 {#kanban-swarm-topology-helper}

`hermes kanban swarm` は、永続的な **Kanban Swarm v1** のグラフを一度に作ります。完了済みの大もと（黒板）のカード、並行して動く N 枚のワーカーのカード、すべてのワーカーを待つ検証役のカード、そして検証役を待つ統合役のカードです。共有される swarm の文脈（「黒板」）は、大もとのカードに構造化された JSON のコメントとして保存されるので、どのワーカーからも読めます。

```bash
hermes kanban swarm "Design a multi-region failover plan" \
  --workers researcher,architect,sre \
  --verifier reviewer --synthesizer writer
```

できあがったグラフはひとまとまりで確定します。ディスパッチャーやダッシュボードから見えるのは「新しい swarm がまだない」か「構成が全部できている」のどちらかで、大もと・ワーカー・検証役が中途半端に結ばれた状態は見えません。あとはふつうに配布されます。ワーカーが並行して動き、全員が終わると検証役が起き、検証役が問題なしとしたところで統合役が起きます。

## `/kanban` スラッシュコマンド {#kanban-slash-command}

`hermes kanban <action>` のコマンドはすべて `/kanban <action>` としても使えます。対話型の `hermes chat` のセッションの中からも、**そして** どのゲートウェイのプラットフォーム（Telegram、Discord、Slack、WhatsApp、Signal、Matrix、Mattermost、メール、SMS）からもです。どちらの窓口も、`hermes kanban` の argparse の構造をそのまま使う `hermes_cli.kanban.run_slash()` という同じ入口を呼ぶので、引数の形もフラグも出力の形式も、CLI と `/kanban` と `hermes kanban` で同じです。ボードを動かすためにチャットを離れる必要はありません。

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

単語をまたぐ引数は、シェルと同じように引用符でくくってください。`run_slash` は行の残りを `shlex.split` で解析するので、`"..."` でも `'...'` でも通ります。

### 実行中の利用 — `/kanban` は待機の仕組みをすり抜けます {#mid-run-usage-kanban-bypasses-the-running-agent-guard}

ゲートウェイはふだん、エージェントがまだ考えているあいだはスラッシュコマンドや利用者のメッセージを列に並べて待たせます。1 つ目のターンが進行中に、うっかり 2 つ目を始めてしまわないための仕組みです。**`/kanban` はこの待機から明示的に除外されています。** ボードは動作中のエージェントの状態ではなく `~/.hermes/kanban.db` にあるので、読み取り（`list`、`show`、`context`、`tail`、`watch`、`stats`、`runs`）も書き込み（`comment`、`unblock`、`block`、`assign`、`archive`、`create`、`link`、…）も、ターンの途中でもすぐに通ります。

分けてある意味はまさにここにあります。

- ワーカーが仲間を待ってブロックしている → 手元のスマートフォンから `/kanban unblock t_abcd` を送れば、ディスパッチャーが次のティックでその仲間を拾います。ブロックしていたワーカーは中断されず、ただブロックでなくなります。
- 人の知識が要るカードを見つけた → `/kanban comment t_xyz "use the 2026 schema, not 2025"` がタスクのスレッドに残り、そのタスクの *次の* 実行が `kanban_show()` でそれを読みます。
- オーケストレーターを止めずに、フリートの様子を知りたい → `/kanban list --mine` や `/kanban stats` が、いまの会話に触れずにボードを覗きます。

### `/kanban create` での自動購読（ゲートウェイのみ） {#auto-subscribe-on-kanban-create-gateway-only}

ゲートウェイから `/kanban create "…"` でタスクを作ると、その発信元のチャット（プラットフォーム＋チャット id＋スレッド id）が、そのタスクの終了イベント（`completed`、`blocked`、`gave_up`、`crashed`、`timed_out`）を自動的に購読します。終了イベントごとに 1 通の返信が届きます。`completed` ならワーカーの結果の要約の 1 行目も添えられ、こちらから問い合わせたりタスクの id を覚えたりする必要はありません。

```
you> /kanban create "transcribe today's podcast" --assignee transcriber
bot> Created t_9fc1a3  (ready, assignee=transcriber)
     (subscribed — you'll be notified when t_9fc1a3 completes or blocks)

… ~8 minutes later …

bot> ✓ t_9fc1a3 completed by transcriber
     transcribed 42 minutes, saved to podcast/2026-05-04.md
```

購読はタスクが `done` になっても残ります。完了は取り消せる（レビュアーや管理役が完了済みのタスクを開き直せる）ので、開き直しの周回のあいだも発信元のセッションに通知が届き続けます。購読が自動で消えるのは `archived`（取り消せない終わりの状態）です。アーカイブしないボードでは、`done` のまま新しい動きがなく `kanban.done_sub_retention_days` 日（既定は 30 日、0 で無効）が過ぎたタスクの購読をごみ掃除が消すので、古い行がいつまでも溜まることはありません。`--json`（機械向けの出力）を付けてスクリプトから作成した場合、自動購読は行われません。スクリプトから呼ぶ側は `/kanban notify-subscribe` で購読を明示的に管理したいはずだ、という前提です。

チャット発の自動購読は `notify+wake` モードで作られます。終了イベントが起きると、宛先のエージェントは受け身のメッセージを受け取る **と同時に** 実際に 1 ターン動くので、ボードの文脈を読んで自分の言葉で返せます。後述の [配信のモード](#delivery-modes) をご覧ください。

### メッセージングでの出力の打ち切り {#output-truncation-in-messaging}

ゲートウェイのプラットフォームには、実用上のメッセージ長の上限があります。`/kanban list`、`/kanban show`、`/kanban tail` の出力がおよそ 3800 文字を超えると、`… (truncated; use \`hermes kanban …\` in your terminal for full output)` という末尾を付けて打ち切られます。CLI の側にこの上限はありません。

### 入力の補完 {#autocomplete}

対話型の CLI では、`/kanban ` と入力して Tab を押すと、組み込みのサブコマンドの一覧（`list`、`ls`、`show`、`create`、`assign`、`link`、`unlink`、`claim`、`comment`、`complete`、`block`、`unblock`、`archive`、`tail`、`dispatch`、`context`、`init`、`gc`）を順に巡れます。上の CLI 一覧に並べた残りのコマンド（`watch`、`stats`、`runs`、`log`、`assignees`、`heartbeat`、`notify-subscribe`、`notify-list`、`notify-unsubscribe`、`daemon`）も動きます。まだ補完の候補に入っていないだけです。

## 協調のパターン {#collaboration-patterns}

ボードは、新しい仕組みを足さずに次の 8 つのパターンを支えます。

| パターン | 形 | 例 |
|---|---|---|
| **P1 展開** | 同じ役割の兄弟が N 人 | 「5 つの切り口を並行して調べる」 |
| **P2 パイプライン** | 役割の連なり。偵察 → 編集 → 執筆 | 日次ブリーフの組み立て |
| **P3 投票・多数決** | 兄弟 N 人＋まとめ役 1 人 | リサーチャー 3 人 → レビュアー 1 人が選ぶ |
| **P4 長く続く記録** | 同じプロファイル＋共有ディレクトリ＋cron | Obsidian の保管庫 |
| **P5 人が関わる形** | ワーカーがブロック → 利用者がコメント → 解除 | 判断のつかない場面 |
| **P6 `@mention`** | 文章の中からの振り分け | `@reviewer look at this` |
| **P7 スレッド単位のワークスペース** | スレッドでの `/kanban here` | プロジェクトごとのゲートウェイのスレッド |
| **P8 フリート運用** | プロファイル 1 つ、対象 N 個 | 50 個の SNS アカウント |
| **P9 トリアージの仕様書き** | 粗い思いつき → `triage` → `hermes kanban specify` が本文を膨らませる → `todo` | 「この一行を、仕様の書かれたタスクにする」 |

それぞれの具体例は `docs/hermes-kanban-v1-spec.pdf` をご覧ください。

## 後続のカードへ文脈を渡す（親のリンク） {#handing-context-to-follow-up-cards-the-parent-link}

親のリンクは、いつ動かすかを決めるだけの関門ではありません。**完了した** カードから新しいカードへ、文脈を引き渡す経路でもあります。`--parent <done-card-id>` を付けてカードを作ると、2 つのことが起こります。

1. **すぐ動ける状態になります。** `create_task` は親の状態からステータスを決めます。親がすべて `done` の子は、そのまま `ready` で作られます。待ちも手作業の繰り上げもありません。（まだ開いている親を持つ子は、最後の親が終わったときに `recompute_ready` が繰り上げるまで `todo` にいます。）
2. **親の引き継ぎが一緒に届きます。** 子のために組み立てられるワーカーの文脈（`build_worker_context`、`kanban_show()` が返すもの）には、親それぞれの完了時の `summary` と `metadata` をそのまま載せた `## Parent task results` の節が含まれます。

```
## Parent task results
### t_77c26979 (completed just now)
Added exponential backoff with jitter to the retry helper.
_metadata_: `{"changed_files": ["hermes_cli/retry.py", "tests/test_retry.py"], "decisions": ["capped backoff at 60s", "jitter = full"]}`
```

だからこそ、終わったカードの続きの作業は **完了したカードを開き直すのではなく、新しい子のカードを作る** のが定石です。完了したカードは書き換えられない履歴で、その文脈は親のリンクを通って前へ流れます。同じカードでのやり直し（失敗しているカードでの再試行の周回）は別の仕組みで、*同じ* カードでの過去の試行は、そのカード自身の文脈に「過去の試行」として現れます。

worktree やブランチだけでは代わりになりません。リポジトリの状態は、続きを担うワーカーにコードが *どうなっているか* は伝えますが、*なぜそうなったか* は伝えません。判断、走らせたテスト、触れたファイルは、git ではなく親の構造化された引き継ぎの中にあります。親が完了した時点では存在しなかった根拠（後から失敗した CI のログなど）は、新しいカードの **本文** に書きます。

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

修正を担うワーカーは、もとのカードの要約とメタデータ（変わったファイル、下した判断）を文脈に持った状態で起動し、そこにあなたが本文へ書いた新しい根拠が加わります。

### ぶつかったワーカーのブランチを収める {#reconciling-colliding-worker-branches}

開発のパイプライン（worktree を使う P1/P2）では、2 人のワーカーのブランチが
マージ時にぶつかることがあります。どちらかのワーカーに自分で裁かせないでください。
ぶつかった側のエージェントは相手の文脈を持たないので、たいてい相手側を上書きするか、
自分の側を捨てます。代わりに、**第三の中立なプロファイル** に割り当てた収拾のカードを作り、
ぶつかった **両方の** カードを親としてリンクします。親のリンクが両者の完了の要約を
収拾役の文脈へ運ぶので、両方の差分 *と* 両方の意図が届きます。同梱の
[`merge-reconciler` スキル](https://github.com/NousResearch/hermes-agent/blob/main/skills/autonomous-ai-agents/merge-reconciler/SKILL.md)
は、そのワーカーに手順一式を渡します。ぶつかった箇所を種類ごとに分け、
どちらにも肩入れせずに解決し、確かめ、下したすべての判断を挙げた要約を返す、という流れです。

### 並行して進む作業でぶつかりやすい場所 {#collision-hotspots-in-parallel-campaigns}

幅の広い作業では、いくつかのファイルが衝突の的になります。多くのワーカーが同じ
ファイルに少しずつ足していき、そのファイルを小さく保つ役が誰もいないので、
マージの衝突が絶えない場所になっていきます。手当ては新しい仕組みではなく、
コメントの書き方の取り決めです。自分の差分が 1 つのファイルで兄弟と衝突し続けて
いることに気づいたワーカー、あるいは自分が触るファイルが他のカードの最近の
コメントに繰り返し出てくることに気づいたワーカーは、黙って積み増さないでください。
代わりに、見分けのつく接頭辞を付けて自分のカードにコメントを残します。

```
hotspot: hermes_cli/kanban_db.py — third conflicting edit to the dispatch loop this wave
```

そして完了時の `metadata` にも同じ印を繰り返します。**同じパスを挙げた `hotspot:` の
コメントを 2 つ以上** 見つけたオーケストレーター（あるいはボードを見ている人）は、
そのファイルに触れる作業をこれ以上並べる **前に**、そのファイル専用の整理・分解の
カードを作ってください。的になっているファイルを割るほうが、そこから生まれる
将来の衝突をすべて収めるより安く済みます。*すでに* 起きてしまった衝突には、
上の収拾のカードのパターンと `merge-reconciler` スキルを使ってください。hotspot の
印は、収拾役が常設の担当になってしまうのを防ぐ、上流側の手当てです。

## 複数テナントでの使い方 {#multi-tenant-usage}

1 つの専門家フリートで複数の事業を担当するときは、タスクごとにテナントの札を付けます。

```bash
hermes kanban create "monthly report" \
    --assignee researcher \
    --tenant business-a \
    --workspace dir:~/tenants/business-a/data/
```

ワーカーには `$HERMES_TENANT` が渡り、記憶への書き込みは接頭辞で名前空間が分かれます。ボードもディスパッチャーもプロファイルの定義も共有されていて、分かれるのはデータだけです。

## デスクトップの通知 {#desktop-notifications}

デスクトップアプリのカンバンのプラグインは、同じ終了イベントをそのまま扱います。ゲートウェイのプラットフォームは要りません。カンバンのボードのイベントの接続が生きているあいだ、`completed`、`blocked`、`gave_up`、`crashed`、`timed_out`、そしてトリアージへ回された（`block_loop_detected`）イベントは、それぞれワーカーの引き継ぎ（要約、ブロックの理由、エラー）と「Open Kanban」の操作を添えたアプリ内のトーストを出します。Hermes のウィンドウから離れているときは、同じイベントが OS の通知も出すので（**Settings ▸ Notifications ▸ Plugin notifications** で制御します）、別のアプリを使っている最中にタスクが行き詰まっても気づけます。

届く範囲について。デスクトップの通知はイベントの流れに乗っているので、アプリが動いていてカンバンのプラグインが有効なあいだだけ出ます。アプリを閉じているあいだに起きたイベントが、次の起動時に通知として流し直されることはありません。アプリを閉じていても届いてほしい場合は、下記のゲートウェイの購読をお使いください。

## ゲートウェイの通知 {#gateway-notifications}

ゲートウェイ（Telegram、Discord、Slack など）から `/kanban create …` を実行すると、発信元のチャットが新しいタスクを自動的に購読します。ゲートウェイの裏で動く通知役が数秒おきに `task_events` を見て、終了イベント（`completed`、`blocked`、`gave_up`、`crashed`、`timed_out`）ごとに 1 通をそのチャットへ届けます。完了したタスクではワーカーの `--result` の 1 行目も送られるので、`/kanban show` をしなくても結果が分かります。

購読は CLI から明示的に管理できます。スクリプトや cron の仕事が、自分の発信元ではないチャットへ知らせたいときに便利です。

```bash
hermes kanban notify-subscribe t_abcd \
    --platform telegram --chat-id 12345678 --thread-id 7 \
    --chat-type group --delivery-mode notify+wake
hermes kanban notify-list
hermes kanban notify-unsubscribe t_abcd \
    --platform telegram --chat-id 12345678 --thread-id 7
```

購読は、タスクが `done` か `archived` に達すると自動的に外れます。後片付けは要りません。

### 配信のモード {#delivery-modes}

`--delivery-mode` は、終了イベントに対して通知役が **どう反応するか** を決めます。購読はどれも次の 3 つのモードのどれかです（`notify` が既定で、もとからのふるまいです）。

| モード | 受け身のメッセージ | エージェントを起こす | 選ぶ場面 |
|------|-----------------|-----------------|-------------|
| `notify` | あり | なし | チャットに知らせが 1 通ほしいだけのとき（既定）。 |
| `notify+wake` | あり | あり | 宛先のエージェントにも実際に 1 ターン動いてほしいとき。ボードの文脈を読んで自分の言葉で返します。チャット発の自動購読はこれを使います。 |
| `wake` | なし | あり | 別途の知らせは要らず、エージェントにイベントへ対応させたいだけのとき。 |

「起こす」というのは、宛先のゲートウェイのエージェントに向けて人工的な受信メッセージを作ることです。1 行の受け身の通知を受け取る代わりに、ふつうの 1 ターン（コメントと結果を読み、考え、返す）を動かします。これが働くのは通知役が生きているゲートウェイのプロセスの中で動いているときだけです。そうでない場合、`notify+wake` の購読は受け身のメッセージだけを届け、`wake` だけの購読はそのプロセスでは何もしません。

**どのイベントが起こすのか。** 判断を発信元へ返すたぐいのものです。`completed`、`blocked`、`gave_up`、`crashed`、`timed_out`、`review_requested`（ワーカーが実装を終えて `kanban_request_review` で引き継いだもの）、そして `block_loop_detected`（ブロックが繰り返されてタスクが `triage` へ回されたもの）です。`status`、`archived`、`unblocked` は届きますが、起こすことはありません。判断ではなく、記録上の移り変わりだからです。`completed` や `review_requested` のイベントが要約を伴うときは、その引き継ぎが起こすターンに一緒に乗るので、起こされたエージェントにはワーカーが実際に何をしたのかが見えます。

`--chat-type`（`dm` | `group` | `channel` | `thread`）は発信元のチャットの種類を記録します。起こされたターンが、操作している人の **本当の** セッションに届くようにするためです。`build_session_key` はグループ、チャンネル、スレッドを DM とは別のキーにするので、`chat_type` が実際と違うと、起こす動きが文脈のない別のセッションへ流れてしまいます。`/kanban` の自動購読やスラッシュコマンドの経路では、これが自動的に取得されます。手で設定するのは、スクリプトや cron からチャットを購読させるときだけです。省略すると既にある購読はそのまま変わりません（新しい購読の既定は `dm` です）。

### 複数プロファイルの構成 — 配信はプロファイルが持ちます {#multi-profile-setups-delivery-is-profile-owned}

プロファイルごとにゲートウェイを立てる構成（ディスパッチャーは 1 つ、`writer` や
`admin` などのゲートウェイのプロセスは別々。[複数ゲートウェイの手引き](https://github.com/NousResearch/hermes-agent/blob/main/docs/kanban/multi-gateway.md)
をご覧ください）では、配布と配信の持ち主が分かれます。

- **配布の持ち主は 1 つだけです。** ちょうど 1 つのゲートウェイが
  `kanban.dispatch_in_gateway: true` のままディスパッチャーを動かし、他の
  ゲートウェイはすべて `false` にします。
- **通知の配信はプロファイルが持ちます。** 配布を担わないものも含めてすべての
  ゲートウェイが通知役を動かしますが、見に行くのは自分がつないでいる
  プラットフォームのアダプターを持つプロファイルの印が付いた購読だけです。
  `writer` プロファイルの Telegram から作られたタスクの `completed`／`blocked` の
  知らせは、配布をしたのが `default` のゲートウェイであっても、`writer` の
  ゲートウェイが届けます。
- **古い購読**（プロファイルの印が付く前に作られ、行に `notifier_profile` が
  ないもの）は、実際のディスパッチャーの単独ロックを持つゲートウェイだけが
  届けるので、2 つのゲートウェイが取り合うことはありません。

ゲートウェイをまたいだ二重配信は、ボードの DB でイベントごとにひとまとまりで
引き取ることで防がれています。中継役も、資格情報の共有も、追加の
ディスパッチャーも要りません。それぞれのプロファイルのゲートウェイが、
自分のアダプターを通して届けるだけです。

## 実行 — 1 回の試行につき 1 行 {#runs-one-row-per-attempt}

タスクは作業のひとまとまりで、**実行（run）** はそれを 1 回試みたものです。ディスパッチャーが実行可能なタスクを引き取ると、`task_runs` に 1 行を作り、`tasks.current_run_id` をそこへ向けます。その試行が終わると — 完了、ブロック、クラッシュ、タイムアウト、起動失敗、回収 — 実行の行が `outcome` とともに閉じ、タスクの参照は外れます。3 回試されたタスクには `task_runs` の行が 3 つあります。

タスクを書き換えるのではなくテーブルを 2 つに分けている理由は、実務の振り返りに **試行の履歴が丸ごと** 必要だからです（「2 回目のレビュアーの試行で承認まで行き、3 回目でマージされた」）。そして、試行ごとのメタデータ — どのファイルが変わったか、どのテストが走ったか、レビュアーが何を指摘したか — を置くきれいな場所が要るからです。それらは実行の事実であって、タスクの事実ではありません。

**構造化された引き継ぎ** が置かれるのも実行の側です。ワーカーが（`kanban_complete(...)` で）タスクを完了するとき、次のものを渡せます。

- `summary`（ツールの引数）／`--summary`（CLI） — 人向けの引き継ぎです。実行に記録され、後続の子は自分の `build_worker_context` でこれを見ます。
- `metadata`（ツールの引数）／`--metadata`（CLI） — 実行に付く、形の決まっていない JSON の辞書です。子は要約と並べた形でこれを見ます。
- `result`（ツールの引数）／`--result`（CLI） — タスクの行に載る短いログの 1 行です（古い項目で、後方互換のために残されています）。

後続の子は、親ごとに最新の完了した実行の要約とメタデータを読みます。再試行するワーカーは、自分のタスクの過去の試行（結果、要約、エラー）を読み、すでに失敗した道をなぞらないようにします。

```
# What a worker actually does — a tool call, from inside the agent loop:
kanban_complete(
    summary="implemented token bucket, keys on user_id with IP fallback, all tests pass",
    metadata={"changed_files": ["limiter.py", "tests/test_limiter.py"], "tests_run": 14},
    result="rate limiter shipped",
)
```

同じ引き継ぎは CLI からも渡せます。ワーカーには閉じられないタスクを、あなた（人間）が締めくくる必要があるとき — 放置されたタスクや、ダッシュボードから手で完了にしたタスクなど — に使います。

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

実行はダッシュボード（ドロワーの Run History の欄に、試行ごとに色分けされた 1 行）にも、REST の API（`GET /api/plugins/kanban/tasks/:id` が `runs[]` の配列を返します）にも出ます。`PATCH /api/plugins/kanban/tasks/:id` に `{status: "done", summary, metadata}` を渡すと両方が中核へ届くので、ダッシュボードの「mark done」ボタンは CLI と同じ働きをします。`task_events` の行は自分が属する `run_id` を持つので、UI は試行ごとにまとめられます。また `completed` のイベントは要約の 1 行目を中身に埋め込むので（400 文字まで）、ゲートウェイの通知役は SQL をもう一往復させずに構造化された引き継ぎを表示できます。

**まとめて閉じるときの注意。** `hermes kanban complete a b c --summary X` は拒否されます。構造化された引き継ぎは実行ごとのものなので、同じ要約を N 個のタスクへ貼り回すのはたいてい間違いです。`--summary` / `--metadata` を付けない一括の完了は、「事務的なタスクをまとめて片付けた」というよくある場面のために引き続き使えます。

**ステータス変更による実行の回収。** ダッシュボードで実行中のタスクを `running` の外へ（`ready` に戻す、あるいは直接 `todo` へ）ドラッグしたり、まだ実行中のタスクをアーカイブしたりすると、進行中の実行は迷子にならず `outcome='reclaimed'` として閉じます。`tasks.current_run_id` が `NULL` のとき `task_runs` の行は必ず終わった状態にあり、その逆も成り立ちます。この決まりは CLI、ダッシュボード、ディスパッチャー、通知役のすべてで守られます。

**引き取られなかった完了のための人工的な実行。** 一度も引き取られていないタスクを完了したりブロックしたりすると（人がダッシュボードから `ready` のタスクに要約を添えて閉じる、CLI で `hermes kanban complete <ready-task> --summary X` を実行する、など）、そのままでは引き継ぎが落ちてしまいます。そこで中核は、要約・メタデータ・理由を載せた所要時間ゼロの実行の行（`started_at == ended_at`）を挿し込み、試行の履歴が途切れないようにします。`completed` / `blocked` のイベントの `run_id` はその行を指します。

**ドロワーの自動更新。** ダッシュボードの WebSocket のイベントが、利用者がいま開いているタスクの新しいイベントを伝えると、ドロワー自身が読み直します（タスクごとのイベントの数え上げを `useEffect` の依存に通しています）。実行の新しい行や更新された結果を見るために、閉じて開き直す必要はもうありません。

### 将来への備え {#forward-compatibility}

`tasks` にある NULL 可の列 2 つは、v2 のワークフロー振り分けのために予約されています。`workflow_template_id`（このタスクが属するテンプレート）と `current_step_key`（そのテンプレートのどの段階が動いているか）です。v1 の中核は振り分けにこれらを使いませんが、クライアントが書き込むことは許しているので、v2 の版ではスキーマの移行をもう一度行わずに振り分けの仕組みを足せます。

## イベント一覧 {#event-reference}

状態が移り変わるたびに、`task_events` へ 1 行が追記されます。各行には任意の `run_id` が付くので、UI は試行ごとにイベントをまとめられます。種類は 3 つのまとまりに分かれていて、絞り込みが簡単です（`hermes kanban watch --kinds completed,gave_up,timed_out`）。

**ライフサイクル**（作業のひとまとまりとしてのタスクに何が起きたか）。

| 種類 | 中身 | 起きるとき |
|---|---|---|
| `created` | `{assignee, status, parents, tenant}` | タスクが登録されたとき。`run_id` は `NULL` です。 |
| `promoted` | — | 親がすべて `done` になったための `todo → ready`。`run_id` は `NULL` です。 |
| `claimed` | `{lock, expires, run_id}` | ディスパッチャーが起動のために `ready` のタスクをひとまとまりで引き取ったとき。 |
| `completed` | `{result_len, summary?}` | ワーカーが `--result` / `--summary` を書き、タスクが `done` になったとき。`summary` は 1 行目の引き継ぎ（400 文字まで）で、全文は実行の行にあります。引き取られたことのないタスクに引き継ぎの項目つきで `complete_task` が呼ばれた場合、`run_id` が何かを指せるよう所要時間ゼロの実行が作られます。 |
| `blocked` | `{reason, kind, recurrences}` | ワーカーか人がタスクを `blocked` にしたとき。`kind` はブロックの種類（`needs_input`、`capability`、`transient`、種類のないブロックなら `null`）、`recurrences` は解除ループの数え上げです。引き取られたことのないタスクに `--reason` つきで呼ばれた場合、所要時間ゼロの実行が作られます。 |
| `dependency_wait` | `{reason, kind}` | ワーカーが `kind=dependency` でブロックしたとき。他のタスクを待っているだけなので、`blocked` ではなく `todo` へ回されます（親による待ちで、自動で繰り上げられます）。人の出番はありません。 |
| `block_loop_detected` | `{reason, kind, recurrences, limit}` | 同じ理由での解除と再ブロックが `BLOCK_RECURRENCE_LIMIT` 回（既定は 2 回）続いたとき。cron が解除し続けるだけになる `blocked` へ戻す代わりに、人が判断できるよう `triage` へ回し、解除と再ブロックの堂々巡りを断ちます。 |
| `unblocked` | — | 手作業か `/unblock` による `blocked → ready`（親がまだ開いていれば `todo`）。ディスパッチャーの `consecutive_failures` はリセットしますが、堂々巡りの遮断が記憶を保てるよう `block_recurrences` は意図的に残します。`run_id` は `NULL` です。 |
| `archived` | — | 既定のボードから隠されたとき。タスクがまだ実行中だった場合、その副作用として回収された実行の `run_id` を伴います。 |

**編集**（状態の移り変わりではない、人による変更）。

| 種類 | 中身 | 起きるとき |
|---|---|---|
| `assigned` | `{assignee}` | 担当者が変わったとき（担当を外した場合も含みます）。 |
| `edited` | `{fields}` | タイトルか本文が更新されたとき。 |
| `reprioritized` | `{priority}` | 優先度が変わったとき。 |
| `status` | `{status}` | ダッシュボードのドラッグ＆ドロップがステータスを直接書いたとき（`todo → ready` など）。`running` の外へドラッグして回収された実行の `run_id` を伴います。そうでなければ `run_id` は NULL です。 |

**ワーカーの計測**（作業のひとまとまりではなく、実行のプロセスについて）。

| 種類 | 中身 | 起きるとき |
|---|---|---|
| `spawned` | `{pid}` | ディスパッチャーがワーカーのプロセスの起動に成功したとき。 |
| `heartbeat` | `{note?}` | 長い処理の最中に、ワーカーが生存を知らせるため `hermes kanban heartbeat $TASK` を呼んだとき。 |
| `reclaimed` | `{stale_lock}` | 完了しないまま占有の TTL が切れたとき。タスクは `ready` へ戻ります。 |
| `crashed` | `{pid, claimer}` | ワーカーの PID が消えているのに、TTL はまだ切れていないとき。 |
| `timed_out` | `{pid, elapsed_seconds, limit_seconds, sigkill}` | `max_runtime_seconds` を超えたとき。ディスパッチャーが SIGTERM を送り（5 秒の猶予の後に SIGKILL）、列に戻します。 |
| `stale` | `{elapsed_seconds, last_heartbeat_at, heartbeat_age_seconds, timeout_seconds, pid, terminated}` | タスクが `kanban.dispatch_stale_timeout_seconds`（既定は 4 時間）より長く走り、かつ直近 1 時間に `kanban_heartbeat` が届かなかったとき。ディスパッチャーは同じホストのワーカーがあれば SIGTERM を送り、タスクを `ready` に戻して配り直します。失敗のカウンターは増えません（stale はワーカーの落ち度ではなく、ディスパッチャー側からの不在の検知です）。長い処理を走らせるワーカーは、これを避けるために少なくとも 1 時間に 1 回は `kanban_heartbeat` を呼んでください。 |
| `reconciled` | `{reason, claim_lock, claim_expires, worker_pid}` | 迷子になったカードの立て直し。カードが `running` のまま占有の記録が壊れていて（`claim_lock` や `claim_expires` が NULL — 引き取りの途中でのクラッシュ、手作業の SQL、DB の復元）、生きているワーカーもいない状態です。TTL・クラッシュ・stale のどの経路でも救えないため、ディスパッチャーが説明のコメントを添えて `ready` の列へ戻しました。config.yaml の `kanban.reconcile_orphans`（既定は `true`）で制御します。 |
| `respawn_guarded` | `{reason}` | ディスパッチャーが、このティックでこの実行可能なタスクの再起動を見送ったとき。理由は `blocker_auth`（前回の失敗が使用量・認証・429 のエラー — 制限の窓が開くまで待ちます）、`recent_success`（直近 1 時間に完了した実行がある — 再実行の前にレビューを待ちます）、`active_pr`（最近のコメントに GitHub の PR の URL がある — 前のワーカーがすでに PR を出しています）です。タスクは `ready` のまま残り、次のティックであらためて起動の機会を得ます。もとになっている状況が続く場合は、ふつうの `consecutive_failures` のサーキットブレーカーが `failure_limit` 回の失敗の後に `gave_up` で自動的にブロックします。 |
| `spawn_failed` | `{error, failures}` | 起動の試みが 1 回失敗したとき（PATH がない、ワークスペースをマウントできない、など）。カウンターが増え、タスクは再試行のため `ready` へ戻ります。 |
| `protocol_violation` | `{pid, claimer, exit_code, protocol_violation}` | タスクがまだ `running` のままワーカーが正常終了したとき。たいていは `kanban_complete` も `kanban_block` も呼ばずに答えてしまった場合です。違反のたびに記録されます（中身の `protocol_violation: true` の印は実行のメタデータへ写され、違反だけを数える再試行の持ち分に使われます）。持ち分の内側 — *連続した* 違反が `_PROTOCOL_VIOLATION_FAILURE_LIMIT`（既定は 3 回）まで、タスクごとの `max_retries` があればそちらが優先 — であれば、タスクはもう一度試すために `ready` へ戻るだけです。連続がその上限に達すると、ディスパッチャーは `gave_up` も記録して自動的にブロックします。 |
| `gave_up` | `{failures, effective_limit, limit_source, error}` | 成功しない試行が N 回続いてサーキットブレーカーが働いたとき。タスクは最後のエラーを添えて自動的にブロックされます。効いてくる上限は、タスクの `max_retries`、次にディスパッチャーの `failure_limit` / `kanban.failure_limit`、最後に組み込みの既定値の順で決まります。 |

`hermes kanban tail <id>` は 1 つのタスクについてこれらを表示します。`hermes kanban watch` はボード全体の分を流し続けます。

## 対象外のこと {#out-of-scope}

カンバンは意図して単一ホスト向けです。`~/.hermes/kanban.db` はローカルの SQLite のファイルで、ディスパッチャーは同じ端末上でワーカーを起動します。2 つのホストにまたがって 1 つのボードを共有する使い方には対応していません。「ホスト A のワーカー X、ホスト B のワーカー Y」を取りまとめる仕組みがなく、クラッシュの検知も PID が同じホストのものであることを前提にしています。複数のホストが必要な場合は、ホストごとに独立したボードを動かし、`delegate_task` やメッセージキューで橋渡ししてください。

## 設計書 {#design-spec}

設計の全体 — 構成、同時実行の正しさ、他のシステムとの比較、実装の計画、リスク、未解決の問い — は `docs/hermes-kanban-v1-spec.pdf` にあります。ふるまいを変える PR を出す前に、まずそちらをお読みください。
