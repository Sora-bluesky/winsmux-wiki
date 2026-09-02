---
title: "かんばん（複数エージェントの盤）"
description: "複数の Hermes プロファイルをまとめて動かすための、SQLite に残るタスクの盤"
upstream_path: user-guide/features/kanban.md
upstream_blob: 084a36f3f8435c4341d149f6736d7403fd89ed70
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban
---

# かんばん — プロファイル同士で進める仕事 {#kanban-multi-agent-profile-collaboration}

> **順を追って見たいなら。** [かんばんの手引き](/hermes/docs/user-guide/features/kanban-tutorial/)を読んでください。4 つの筋書き（ひとりで開発、群れでの作業、役割をつないで再挑戦、遮断のしくみ）を、それぞれのダッシュボードの画面付きで追えます。このページは調べもの用、手引きのほうは物語です。

Hermes のかんばんは、あなたの Hermes プロファイル全体で共有する、消えないタスクの盤です。壊れやすいプロセス内のサブエージェントの群れに頼らずに、名前を持った複数のエージェントで仕事を進められます。タスクはすべて `~/.hermes/kanban.db` の 1 行、受け渡しもすべて誰でも読み書きできる 1 行、作業役はそれぞれが自分の身元を持った本物の OS プロセスです。

### 入口はふたつ。モデルはツールで、あなたは CLI で話す {#two-surfaces-the-model-talks-through-tools-you-talk-through-the-cli}

盤には玄関がふたつあり、どちらも同じ `~/.hermes/kanban.db` につながっています。

- **エージェントは専用の `kanban_*` ツール群で盤を動かします** — `kanban_show`、`kanban_list`、`kanban_complete`、`kanban_request_review`、`kanban_request_changes`、`kanban_block`、`kanban_heartbeat`、`kanban_comment`、`kanban_attach`、`kanban_attach_url`、`kanban_attachments`、`kanban_create`、`kanban_link`、`kanban_unblock` です。差配役は、これらのツールをすでに備えた状態で作業役を立ち上げます。まとめ役のプロファイルでは、`kanban` のツール群を自分で有効にすることもできます。モデルはツールを直に呼んでタスクを読み、割り振ります。`hermes kanban` を端末から叩くわけでは *ありません*。下の[作業役はどう盤とやり取りするか](#how-workers-interact-with-the-board)を見てください。
- **あなた（とスクリプトと cron）は `hermes kanban …`** を CLI で、`/kanban …` をスラッシュコマンドで、あるいはダッシュボードで使います。こちらは人と自動化のためのもの、つまり後ろにツールを呼ぶモデルがいない場所のためのものです。

どちらの入口も同じ `kanban_db` の層を通るので、読めば同じものが見え、書いてもずれません。このページの例は貼り付けやすいので CLI で書いていますが、CLI のどの動詞にも、モデルが使う同じ働きのツール呼び出しがあります。

これは、`delegate_task` では受けきれない仕事に効く形です。

- **調べものの仕分け** — 調べ役を並列に、そこに分析役と書き手、人も入ります。
- **予定どおりの運用** — 毎日のまとめを繰り返して、何週間ぶんもの記録を積み上げます。
- **写し身** — 名前を持った常設の助手（`inbox-triage`、`ops-review`）が、記憶をためていきます。
- **開発の流れ** — 分解して、並列の作業ツリーで実装して、レビューして、直して、PR まで。
- **群れの作業** — ひとりの専門役が N 個の対象を見ます（SNS のアカウント 50 個、監視するサービス 12 個）。

設計の考え方の全体、Cline Kanban／Paperclip／NanoClaw／Google Gemini Enterprise との比べ合わせ、そして 8 つの代表的な進め方については、リポジトリの `docs/hermes-kanban-v1-spec.pdf` を見てください。

## かんばんと `delegate_task` の違い {#kanban-vs-delegatetask}

見た目は似ていますが、同じ部品ではありません。

| | `delegate_task` | かんばん |
|---|---|---|
| 形 | 関数の呼び出し（分けて、合流する） | 消えない待ち行列と状態のしくみ |
| 呼んだ側 | 子が返るまで止まる | `create` したら投げっぱなし |
| 子の身元 | 名無しのサブエージェント | 記憶を持ち続ける、名前のあるプロファイル |
| やり直し | できない。失敗は失敗のまま | 止める → 解く → 走り直す。落ちたら取り戻す |
| 人の関与 | できない | いつでもコメント／解除できる |
| タスクあたりのエージェント | 1 回の呼び出しにつき 1 体 | タスクの一生のあいだに N 体（再挑戦、レビュー、追いかけ） |
| 記録 | 文脈の圧縮で消える | SQLite にずっと残る行 |
| 進め方 | 上下（呼ぶ側 → 呼ばれる側） | 対等。どのプロファイルもどのタスクも読み書きできる |

**一文でいうと：** `delegate_task` は関数の呼び出し、かんばんは仕事の待ち行列で、受け渡しのひとつひとつが、どのプロファイル（や人）も見て直せる 1 行になっています。

**`delegate_task` を使うのは**、親のエージェントが先へ進むために短い答えが要るとき、人が関わらないとき、結果が親の文脈へ戻ればよいときです。

**かんばんを使うのは**、仕事がエージェントの垣根をまたぐとき、再起動を越えて残ってほしいとき、人の入力が要るかもしれないとき、別の役が引き取るかもしれないとき、あとから見つけられる必要があるときです。

両方は共存します。かんばんの作業役が、その実行の中で `delegate_task` を呼ぶこともあります。

## 中心となる考え方 {#core-concepts}

- **盤** — それ自身の SQLite の DB、作業場のディレクトリ、差配のループを持った、
  独立したタスクの待ち行列です。ひとつのインストールに盤はいくつあっても
  かまいません（プロジェクトごと、リポジトリごと、領域ごとなど）。下の
  [盤（複数プロジェクト）](#boards-multi-project)を見てください。プロジェクトが
  ひとつだけの人は `default` の盤のまま、この節の外で「盤」という言葉を
  見ることはありません。
- **タスク** — 表題、任意の本文、担当ひとり（プロファイル名）、状態（`triage | todo | ready | running | blocked | review | done | archived`）、任意の借り主の名前空間、任意の重複よけの鍵（自動処理の再実行での二重登録よけ）を持った 1 行です。
- **つながり** — 親 → 子の依存を記録した `task_links` の行です。親がすべて `done` になると、差配役が `todo → ready` へ進めます。
- **コメント** — エージェント同士のやり取りの決まりごとです。エージェントも人も追記でき、作業役が（改めて）立ち上がるとき、その全部を文脈の一部として読みます。
- **作業場** — 作業役が動くディレクトリです。3 種類あります。
  - `scratch`（既定） — `~/.hermes/kanban/workspaces/<id>/` の下の、まっさらな一時ディレクトリです（既定でない盤では `~/.hermes/kanban/boards/<slug>/workspaces/<id>/`）。**タスクが終わると消えます**。使い捨てなのはそういう設計だからです。`kanban_complete(artifacts=[...])` ではっきり申告したファイルは、片付けの前に、タスクごとの消えない置き場へ写されます。昔ながらの完了報告に書かれた成果物のパスも、同じように扱われます。申告した成果物が見つからないときは、パスを直して再挑戦できるよう、タスクは走ったままになります。作業場ごと残しておきたいときは `worktree:` か `dir:<path>` を使ってください。使い捨ての作業場がそのインストールで初めて作られたとき、差配役は警告を出し、そのタスクに `tip_scratch_workspace` の出来事を残します（`hermes kanban show <id>` で見られます）。
  - `dir:<path>` — すでにある共有のディレクトリ（Obsidian の保管庫、メール運用のディレクトリ、アカウントごとのフォルダ）です。**絶対パスでなければなりません。** `dir:../tenants/foo/` のような相対パスは、差し向けのときにはねられます。差配役がたまたまいる作業ディレクトリを基準に解決されてしまい、あいまいなうえ、権限の取り違えを突く抜け道になるからです。それ以外の点で、そのパスは信用されます。あなたの機械、あなたのファイルシステムで、作業役はあなたの権限で動きます。これは「ローカルの利用者は信用する」という前提で、かんばんは 1 台で動かす作りです。**終わっても残ります。**
  - `worktree` — コードの作業のための、`.worktrees/<id>/` の下の git の作業ツリーです。置き場所をきっちり決めたいときは `worktree:<path>` を使います。作業役の側の `git worktree add` が作り、指定があれば `--branch` を使います。**終わっても残ります。**
- **差配役** — N 秒ごと（既定は 60）に、古くなった確保を戻し、落ちた作業役を取り戻し（PID は消えたが TTL はまだ切れていないもの）、支度のできたタスクを進め、ひとつずつ確実に確保して、割り当てられたプロファイルを立ち上げる、動き続けるループです。既定では **ゲートウェイの中で** 動きます（`kanban.dispatch_in_gateway: true`）。ひとつの差配役が、1 ティックですべての盤を見ます。作業役は `HERMES_KANBAN_BOARD` を固定した状態で立ち上がるので、ほかの盤は見えません。同じタスクで立ち上げに続けて `kanban.failure_limit` 回（既定は 2）失敗すると、差配役は最後のエラーを理由にしてそのタスクを自動で止めます。存在しないプロファイル、つなげない作業場といったもので、いつまでも空回りするのを防ぎます。
- **借り主** — 盤の *中の* 任意の名前空間です。ひとつの専門役の群れが、作業場のパスと記憶の鍵の前置きでデータを分けながら、複数の事業（`--tenant business-a`）を受け持てます。借り主はゆるい絞り込みで、きっちり分ける境目は盤のほうです。

## 盤（複数プロジェクト） {#boards-multi-project}

盤を使うと、関わりのない仕事の流れを——プロジェクトごと、リポジトリごと、
領域ごとに——別々の待ち行列に切り分けられます。入れたばかりのときは
`default` というひとつの盤だけがあります（DB は昔と同じ
`~/.hermes/kanban.db`）。仕事の流れがひとつでよい人は、盤のことを知らずに
済みます。使いたい人だけが使う機能です。

盤ごとの切り分けは徹底しています。

- 盤ごとに別の SQLite の DB（`~/.hermes/kanban/boards/<slug>/kanban.db`）。
- 別の `workspaces/` と `logs/` のディレクトリ。
- タスクのために立ち上がった作業役に見えるのは、その盤のタスク **だけ** です。
  差配役が子の環境に `HERMES_KANBAN_BOARD` を置き、作業役が使えるすべての
  `kanban_*` ツールがそれを読みます。
- 盤をまたいだタスクのつながりは作れません（構造を単純に保つためです。どうしても
  プロジェクトをまたいで指したいなら、本文で触れておいて、id で自分で引いて
  ください）。

### CLI から盤を扱う {#managing-boards-from-the-cli}

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

盤が決まる順番（強いものから）。

1. CLI の呼び出しにはっきり書いた `--board <slug>`。
2. 環境変数 `HERMES_KANBAN_BOARD`（作業役を立ち上げるときに差配役が置きます。
   おかげで作業役はほかの盤を見られません）。
3. `~/.hermes/kanban/current` — `hermes kanban
   boards switch` が書き残した slug。
4. `default`。

slug は形が決まっています。小文字の英数字とハイフンとアンダースコア、1〜64
文字で、先頭は英数字です。大文字は自動で小文字に直されます。それ以外
（スラッシュ、空白、ドット、`..`）は CLI の層ではねられるので、パスをさかのぼる
細工で盤に名前を付けることはできません。

### ダッシュボードから盤を扱う {#managing-boards-from-the-dashboard}

`hermes dashboard` の「かんばん」タブでは、盤がふたつ以上になったとき（または
どれかの盤にタスクがあるとき）、上に盤の切り替えが出ます。盤がひとつだけの人には
小さな `+ New board` のボタンだけが見え、切り替えは必要になるまで隠れています。

- **盤の一覧** — どの盤を使うか選びます。選んだ内容はブラウザの
  `localStorage` に保存されるので、読み込み直しても残り、開きっぱなしの端末の
  足元で CLI の `current` の向き先が動くこともありません。
- **+ New board** — slug、表示名、説明、アイコンを聞く小窓が開きます。作った盤へ
  自動で切り替える選択肢もあります。
- **Settings** — いまの盤の表示名、説明、そして **プロジェクトのディレクトリ**
  （`default_workdir`）を直す小窓が開きます。プロジェクトのディレクトリは、
  新しいタスクが引き継ぐ盤ぐるみの作業場の既定値です（git のリポジトリなら残る
  作業ツリー、ふつうのディレクトリなら残るディレクトリ）。タスクごとに、作成の
  ときに上書きすることもできます。この欄を空にすると、新しいタスクは使い捨ての
  作業場に戻ります。
- **Archive** — `default` 以外の盤にだけ出ます。確認したうえで、その盤の
  ディレクトリを `boards/_archived/` へ移します。

ダッシュボードの API はどれも、盤を絞る `?board=<slug>` を受け付けます。出来事の
WebSocket はつないだ時点の盤に固定されるので、画面で切り替えると新しい盤に対して
新しい接続が開きます。

## 添付ファイル {#file-attachments}

タスクにはファイルを添えられます。PDF、画像、元になる資料などです。おかげで
作業役は、あなたが本文にパスを貼って見つけてくれることを願わなくても、必要な
材料を手にできます。

- **アップロード** — ダッシュボードの引き出しでタスクを開き、
  **Attachments** の *Upload file* のボタンを使います（一度に何個でも
  かまいません）。1 個につき 25 MB までです。
- **置き場所** — 既定の盤なら
  `<hermes-home>/kanban/attachments/<task_id>/` の下、名前を付けた盤なら
  `<hermes-home>/kanban/boards/<slug>/attachments/<task_id>/` の下です。
  置き場所を自分で決めたいときは `HERMES_KANBAN_ATTACHMENTS_ROOT` を設定します。
- **作業役から見えるもの** — 差配役がタスクを作業役に渡すとき、作業役の文脈には
  **Attachments** の節が入り、ファイルごとに名前と **絶対パス** が並びます。
  作業役はファイルと端末のツールをひととおり使えるので、そのまま読みます
  （`read_file`、あるいは `pdftotext` のようなコマンド）。
- **ダウンロードと削除** — 引き出しには、添付ごとにダウンロードのリンクと
  削除（×）が並びます。削除すると、記録の行とディスク上のファイルの両方が
  消えます。

:::note 端末が別の場所にあるとき
添付のパスは、**手元の** 端末で直に解決されます。かんばんの作業役では、これが
既定です。作業役を別の場所（Docker、Modal）で動かすなら、作業役の文脈にある
絶対パスに手が届くよう、その盤の `attachments/` のディレクトリを砂場の中へ
つないでください。
:::

## まず動かす {#quick-start}

以下のコマンドは、**あなた**（人）が盤を用意してタスクを作るところです。タスクに担当が付くと、差配役がその担当のプロファイルを作業役として立ち上げ、そこから先は **モデルが `kanban_*` のツール呼び出しでタスクを進めます。CLI のコマンドではありません** — [作業役はどう盤とやり取りするか](#how-workers-interact-with-the-board)を見てください。

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

差配役が `t_abcd` を拾って `researcher` のプロファイルを立ち上げると、その作業役のモデルがまずやるのは、自分のタスクを読むための `kanban_show()` の呼び出しです。`hermes kanban show t_abcd` を走らせるわけではありません。

### ゲートウェイに載った差配役（既定） {#gateway-embedded-dispatcher-default}

差配役はゲートウェイのプロセスの中で動きます。入れるものも、別に面倒を見る
サービスもありません。ゲートウェイが上がっていれば、支度のできたタスクは次の
ティック（既定で 60 秒）で拾われます。

```yaml
# config.yaml
kanban:
  dispatch_in_gateway: true        # default
  dispatch_interval_seconds: 60    # default
  review_dispatch: true            # default: spawn the assigned profile with
                                   # the bundled sdlc-review skill. Set false
                                   # for human-only review boards.
```

調べもののときは、`HERMES_KANBAN_DISPATCH_IN_GATEWAY=0` で実行時に設定を
上書きできます。ゲートウェイの面倒の見方はふつうどおりです。`hermes gateway
start` を直に走らせるか、systemd の利用者ユニットとして組み込みます
（ゲートウェイの説明を見てください）。ゲートウェイが動いていないと、`ready` の
タスクはどれかが上がるまでそのまま待ちます。`hermes kanban create` は、作成の
ときにそのことを知らせます。

`hermes kanban daemon` を別のプロセスとして動かすやり方は **やめる方向** です。
ゲートウェイを使ってください。どうしてもゲートウェイを動かせない場合（画面の
無いホストの決まりで、動き続けるサービスが禁じられているなど）は、`--force` の
逃げ道で、昔ながらの単体の常駐役を 1 つの版のあいだだけ使えます。ただし、
同じ `kanban.db` に対してゲートウェイに載った差配役と単体の常駐役を同時に
動かすと、確保の取り合いが起きます。これは想定していません。

### 二重登録しない作成（自動処理や webhook 向け） {#idempotent-create-for-automation-webhooks}

```bash
# First call creates the task. Any subsequent call with the same key
# returns the existing task id instead of duplicating.
hermes kanban create "nightly ops review" \
    --assignee ops \
    --idempotency-key "nightly-ops-$(date -u +%Y-%m-%d)" \
    --json
```

### まとめて使える CLI の動詞 {#bulk-cli-verbs}

一生を通じたどの動詞も id をいくつでも受け取るので、まとめて片付けるのが
1 コマンドで済みます。

```bash
hermes kanban complete t_abc t_def t_hij --result "batch wrap"
hermes kanban archive  t_abc t_def t_hij
hermes kanban unblock  t_abc t_def
hermes kanban block    t_abc "need input" --ids t_def t_hij
```

:::note 解除したタスクの行き先
`unblock` は、安全な元の段階へ戻します。親が片付いているレビュー由来の仕事なら
**`review`**、親が片付いている実装の仕事なら **`ready`**、親がまだ開いていれば
**`todo`** です。`todo` のタスクは元の段階の由来を持ったままで、依存の関門が
開けば自動で `review` か `ready` へ戻ります。`unblock` が `triage` へ直に
送ることはありません。

解除したタスクがあとで **`triage`** に出てきたとしても、それは解除のせいでは
ありません。*同じ理由でもう一度止まった* ことが原因です。止まる → 解ける →
同じ原因でまた止まる、を `BLOCK_RECURRENCE_LIMIT` 回（既定は `2`）くり返すと、
輪を断つしくみが働きます。`blocked` へ送り返すのをやめ——そこでは cron が
解除し続けるだけなので——人が決められるよう `triage` へ回します。これは LLM の
判断ではなく DB の決まった守りで、タスクの本文でこれを外すことはできません。
くり返しの数え上げは、解除のたびにあえて残ります（`complete` が成功したときだけ
0 に戻ります）。解除したタスクを仕事の輪の中に留めたいなら、解除の前に
*なぜ止まり続けるのか* を片付けてください（終わっていない親、足りない入力、
できない相談）。輪ができるのが織り込み済みなら、`BLOCK_RECURRENCE_LIMIT` を
上げてください。
:::

## 作業役はどう盤とやり取りするか {#how-workers-interact-with-the-board}

**作業役は `hermes kanban` を端末から叩きません。** 差配役は作業役を立ち上げるとき、子の環境に `HERMES_KANBAN_TASK=t_abcd` を置きます。この環境変数が、モデルの持ちものの中で専用の **かんばんのツール群** を有効にします。同じツール群は、自分のツール設定で `kanban` を有効にしたまとめ役のプロファイルでも使えます。これらのツールは、CLI と同じように Python の `kanban_db` の層を通して、盤を直に読み書きします。動いている作業役はこれらをほかのツールと同じように呼びます。`hermes kanban` の CLI を目にすることも、必要とすることもありません。

| ツール | 役割 | 必須の引数 |
|---|---|---|
| `kanban_show` | いまのタスクを読みます（表題、本文、これまでの試み、親からの受け渡し、コメント、整形済みの `worker_context` 全文）。既定では環境変数のタスク id を使います。 | — |
| `kanban_list` | タスクの概要を並べます。`assignee`、`status`、`tenant`、書庫入りを出すかどうか、件数で絞れます。盤の仕事を見つけるまとめ役のためのものです。 | — |
| `kanban_complete` | `summary` と `metadata` の形をそろえた受け渡しで終わらせます。 | `summary` / `result` の少なくとも一方 |
| `kanban_request_review` | 同じカードのままレビューに入ります。残る `summary`、任意の `metadata`、任意のレビュー役のプロファイルを渡します。タスクは `review` へ移り、これは中断ではありません。 | `summary` |
| `kanban_request_changes` | 動いているレビューからの、レビュー役の判定です。そのレビューを閉じ、親の関門をかけ直し、輪の数え上げを増やさずに元の実装役へ戻します。 | `reason` |
| `kanban_block` | 作業を止め、理由で行き先を分けます。`kind=dependency`（`todo` で待ち、自動で再開）、`needs_input`／`capability`／`transient`（人に見せます）。同じ種類でくり返し止まると、自動で `triage` へ上がります。 | `reason` |
| `kanban_heartbeat` | 長い作業のあいだ、生きていることを知らせます。作用だけです。 | — |
| `kanban_comment` | タスクの流れに、残る書き込みを足します。 | `task_id`、`body` |
| `kanban_attach` | ファイルの中身をそのまま（base64 で）渡して、タスクに添えます。そのタスクの添付のディレクトリに置かれます（25 MB まで）。 | ファイルの中身と名前 |
| `kanban_attach_url` | URL でファイルをタスクに添えます。 | `url` |
| `kanban_attachments` | タスクの添付を並べます。 | — |
| `kanban_create` | （まとめ役向け）`assignee`、任意の `parents`、`skills` などを付けて、子のタスクへ広げます。 | `title`、`assignee` |
| `kanban_link` | （まとめ役向け）あとから `parent_id → child_id` の依存の線を足します。 | `parent_id`、`child_id` |
| `kanban_unblock` | （まとめ役向け）止まったタスクを元の段階（`review` か `ready`）へ戻します。親がまだ開いていれば `todo` です。 | `task_id` |

作業役のひと回りは、たとえばこうなります。

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

**まとめ役** の作業役は、代わりに仕事を広げます。

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

「（まとめ役向け）」のツール——`kanban_list`、`kanban_create`、`kanban_link`、`kanban_unblock`、それに自分以外のタスクへの `kanban_comment`——も同じツール群から使えます。そのうえでの約束ごと（自動で差し込まれるかんばんの案内に書かれています）は、作業役のプロファイルは仕事を広げたり関わりのない仕事を割り振ったりしない、まとめ役のプロファイルは実装をしない、というものです。差配役が立ち上げた作業役は、消したり終わらせたりする操作については自分のタスクの範囲に限られていて、関わりのないタスクを書き換えることはできません。

### なぜ `hermes kanban` を叩かずにツールを使うのか {#why-tools-instead-of-shelling-to-hermes-kanban}

理由は 3 つです。

1. **どこで動いても同じであるために。** 端末のツールが別の場所（Docker／Modal／Singularity／SSH）を向いている作業役は、`hermes kanban complete` をそのコンテナの *中で* 走らせてしまいます。そこには `hermes` が入っていませんし、`~/.hermes/kanban.db` もつながっていません。かんばんのツールはエージェント自身の Python のプロセスで動くので、端末がどこを向いていても、いつも `~/.hermes/kanban.db` に届きます。
2. **引用符で壊れないために。** `--metadata '{"files": [...]}'` を shlex と argparse に通すのは、いつか足を撃つ仕掛けです。形の決まったツールの引数なら、そこをまるごと避けられます。
3. **エラーが分かりやすいために。** ツールの結果は、モデルが考えられる形の JSON です。読み解かないといけない標準エラーの文字列ではありません。

**ふだんのセッションには何も足しません。** ふつうの `hermes chat` のセッションには、`kanban_*` のツールは 1 つもありません。まとめ役として使うために、そのプロファイルが `kanban` のツール群をはっきり有効にしていない限りは、です。差配役が立ち上げたタスクの作業役に、そのタスクの範囲のツールが付くのは `HERMES_KANBAN_TASK` が置かれているからで、まとめ役のプロファイルには設定を通してもっと広い割り振りの手立てが付きます。かんばんを触らない人のところで、ツールが膨らむことはありません。

自動で差し込まれるかんばんの案内が、どのツールをいつ、どの順で呼ぶかをモデルに教えます。

### 受け渡しに残すとよい証拠 {#recommended-handoff-evidence}

`kanban_complete(summary=..., metadata={...})` は、あえて自由な形にしてあります。
summary は人が読む締めくくり、`metadata` は、あとを継ぐエージェント、レビュー役、
ダッシュボードが、文章を読み解かずに使い回せる、機械向けの受け渡しです。

開発とレビューの仕事では、任意ですが次の形をおすすめします。

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

これらの鍵は約束ごとであって、決まった形ではありません。大事なのは、どの作業役も、
次に読む人が 4 つの問いにすぐ答えられるだけの証拠を残す、という性質です。

1. 何が変わったのか。
2. どうやって確かめたのか。
3. 失敗したとき、何があれば解けるか、やり直せるか。
4. どんなリスクを、承知のうえで残したのか。

秘密、生のログ、トークン、OAuth まわりのもの、関係のないやり取りは
`metadata` に入れないでください。代わりに、そこを指すものと要約を置きます。
ファイルもテストも無いタスクなら、そのことを `summary` にはっきり書き、
実際にある証拠——参照した URL、issue の id、手で確かめた手順——を `metadata` に
書いてください。

### 作業役の一生 {#the-worker-lifecycle}

かんばんのタスクを受け持つプロファイルには、この一生の流れが自動で付きます。立ち上げのときに作業役のシステムプロンプトへ差し込まれるので（`KANBAN_GUIDANCE` のかたまり）、**入れるものも設定するものもありません**。教えるのは、CLI のコマンドではなく **ツール呼び出し** で表した一生の全体です。

1. 立ち上がったら `kanban_show()` を呼び、表題、本文、親からの受け渡し、これまでの試み、コメントの全部を読みます。
2. `cd $HERMES_KANBAN_WORKSPACE`（端末のツールで）して、そこで作業します。
3. 長い作業のあいだは数分おきに `kanban_heartbeat(note="...")` を呼びます。**1 時間を超えそうな作業なら、少なくとも 1 時間に 1 回は `kanban_heartbeat` を呼んでください**。差配役は、`kanban.dispatch_stale_timeout_seconds`（既定 4 時間）を超えて走っていて、直近 1 時間に鼓動の無いタスクを、作業役が片付けもせずに落ちたとみなして取り戻します。取り戻し自体は害のない動きですが（失敗の数え上げを増やさずに、タスクは `ready` へ戻って差し向け直されます）、いま走らせているぶんの進みは失われます。
4. `kanban_complete(summary="...", metadata={...})` で終わらせるか、手詰まりなら `kanban_block(reason="...")` を呼びます。

この最後の `kanban_complete` / `kanban_block` の呼び出しは、作業役の決まりごとの
一部です。タスクがまだ `running` のまま作業役のプロセスが終了コード 0 で終わると、
差配役はそれを決まりごと破りとみなし、`protocol_violation` の出来事を残します。

**エージェント側での予防：** 作業役が終わる前、モデルが盤に終わりを告げるツールを
呼ばないまま止まりそうだと気付くと、Hermes は多くて 2 回、合いの手を差し込みます。
モデルが次の一歩を言葉にして（「では報告を書きます」）`finish_reason=stop` で
止まってしまう、よくある場面を捕まえるためです。合いの手は、すぐに
`kanban_complete` か `kanban_block` を呼ぶようモデルに思い出させます。この守りは、
差配役が立ち上げた作業役のときだけ働き（`HERMES_KANBAN_TASK` が置かれている
とき）、`HERMES_KANBAN_STOP_NUDGE=0` で切れます。

**差配役側での立て直し：** 合いの手を使い切ったか、そこへ届く前に作業役が落ちた
場合、差配役はその破りに **回数を区切った再挑戦** を与え
（続けての破りが `_PROTOCOL_VIOLATION_FAILURE_LIMIT` 回まで、既定は 3）、
同じ輪へ立ち上げ直すのではなく、そこでタスクを自動的に止めます。この持ち回数が
数えるのは *続けて* 起きた、きれいに終了した決まりごと破りだけです。あいだに
挟まった流量制限による並び直しは数に入らず、ほかの種類の失敗が起きれば続きは
0 に戻ります。タスクごとの `max_retries` があれば、そちらが優先されます。たいていは、
モデルがふつうの文章で答えて、かんばんのツールを使わずに終わった、ということです。

一生の流れに加えて、要となる細かい点（作業場の種類、成果物の `artifacts`、作った カードの引き受け方）も同じシステムプロンプトのかたまりに入っています。ですからどの作業役も、どのプロファイルで動いていてもそれを持っています。プロファイルごとにスキルを用意する必要はありません。

### 特定のタスクにだけスキルを足す {#pinning-extra-skills-to-a-specific-task}

そのタスクだけ、担当のプロファイルがふだん持っていない専門の知識が要ることがあります。`translation` のスキルが要る翻訳の仕事、`github-code-review` が要るレビューの仕事、`security-pr-audit` が要る安全性の点検などです。そのたびに担当のプロファイルを直すのではなく、スキルをタスクに直接付けてください。

**まとめ役のエージェントから**（よくあるのはこちらです。あるエージェントが別のエージェントへ仕事を回す形）は、`kanban_create` ツールの `skills` の配列を使います。

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

**人から（CLI やスラッシュコマンド）** なら、`--skill` を数だけくり返します。

```bash
hermes kanban create "translate README to Japanese" \
    --assignee linguist \
    --skill translation

hermes kanban create "audit auth flow" \
    --assignee reviewer \
    --skill security-pr-audit \
    --skill github-code-review
```

**ダッシュボードから** なら、タスク作成の小窓の **skills** の欄に、カンマ区切りで打ち込みます。

差配役は、並べたスキルの数だけ `--skills <name>` を渡すので、作業役は自動で差し込まれるかんばんの案内の上に、それらを全部読み込んだ状態で立ち上がります。スキルの名前は、担当のプロファイルに実際に入っているものと一致していなければなりません（`hermes skills list` で何があるか見られます）。実行時に入れることはできません。

### タスクごとのモデルの指定 {#per-task-model-override}

担当のプロファイルの既定とは別に、そのタスクの作業役だけを特定のモデル（必要ならプロバイダーも）に固定できます。

```bash
# At creation
hermes kanban create "hard refactor" --assignee coder \
    --model claude-opus-4.6 --provider anthropic

# Or later — takes effect on the next dispatch
hermes kanban set-model t_abcd claude-opus-4.6 --provider anthropic
hermes kanban set-model t_abcd none    # clear the override
```

差配役は、指定されたモデルで作業役を立ち上げます（指定があれば `--provider <name>` も渡します。`--provider` にはモデルの指定が要ります）。ダッシュボードのタスクごとのモデルの選択も、同じ `model_override` の項目を動かします。指定が無ければ、作業役はそのプロファイルに設定されたモデルを使います。

### 費用の考え方：まとめ役は上等に、作業役は安く {#cost-strategy-frontier-orchestrator-inexpensive-workers}

かんばんはプロファイルごとに設定を持てるので、計画役と作業役で費用を分けるのが自然にできます。プロジェクトを筋の通ったカードに分けるには最上位の判断力が要りますが、目的も文脈も受け渡しの証拠もそろったカードをこなすほうには、ふつうそこまで要りません。そしてトークンの大半を使うのは作業役なので、費用のありかは作業役のモデルです。まとめ役・差配役のプロファイルは上等なモデルで動かし、作業役のプロファイルは安いモデルに向けてください。プロファイルはそれぞれ `~/.hermes/profiles/<name>/` の下に自分の `config.yaml` を持ち、差配役は `hermes -p <assignee>` を立ち上げるときにそのプロファイル向けの `HERMES_HOME` を差し込むので、作業役はそれぞれ自分のプロファイルのモデル設定を読みます。

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

たまに品質が効いてくるカードがあれば、そのタスクだけ[タスクごとのモデルの指定](#per-task-model-override)で強いモデルに戻せます（作成時の `--model`／`--provider`、あとからの `hermes kanban set-model`、ダッシュボードのモデルの選択）。プロファイルを直す必要はありません。

### 一生の節目で動くプラグインの仕掛け {#lifecycle-plugin-hooks}

盤の移り変わりは[プラグインの仕掛け](/hermes/docs/user-guide/features/hooks/#plugin-hooks)を動かします。`kanban_task_claimed`、`kanban_task_completed`、`kanban_task_blocked` の 3 つで、それぞれ `task_id` と `profile_name` を持ちます。仕掛けが動くのは盤の DB の変更が確定した **あと** なので、呼ばれた側はいつも確かな状態を見ます。プロセスが分かれている点に注意してください。`kanban_task_claimed` は **差配役** のプロセスで動き、`kanban_task_completed` と `kanban_task_blocked` は **作業役** のプロセスで動きます。移り変わりを 1 か所でまとめて見たいなら、差配役のプロファイルに仕掛けを登録してください。

```python
def register(ctx):
    def on_blocked(task_id=None, profile_name=None, **kw):
        ctx.dispatch_tool("terminal", {"command": f"notify-send 'kanban blocked: {task_id}'"})
    ctx.register_hook("kanban_task_blocked", on_blocked)
```

### 目標つきのカード（`--goal`） {#goal-mode-cards---goal}

既定では、作業役はカードに **一度きり** 挑みます。仕事をして、`kanban_complete`／`kanban_block` を呼んで、終わります。`--goal`（CLI）か `goal_mode=True`（`kanban_create` ツールやダッシュボード）を渡すと、代わりにその作業役を **目標のループ** で動かせます。`/goal` のスラッシュコマンドの後ろにあるのと同じ、Ralph 式のしくみです。ひと回りごとに、補助の判定役が作業役の出力をカードの表題と本文（受け入れの条件とみなします）と突き合わせ、まだ終わっていなくて——回数の持ち分が残っていれば——判定役が納得するか、作業役が自分でタスクを終わらせるか、持ち分が尽きるまで、**同じセッションのまま** 作業を続けます（持ち分が尽きた場合は、黙って終わるのではなく、人が見るためにカードを **止めます**）。書かれたとおりでは目標が **達成できない** と判定役が判断すると、その理由とともにカードはすぐ止まります。無理なカードが done になることはなく、そういうカードへの `kanban complete` / `kanban request-review` は、`kanban block` か組み直しを促して断られます。

```bash
hermes kanban create "Translate the docs site to French" \
    --body "Acceptance: every page translated, no English left, links intact." \
    --assignee linguist \
    --goal \
    --goal-max-turns 15      # optional; default 20
```

終わりの決まっていない仕事、何段にも分かれる仕事、「X になるまで続ける」たぐいのカードに使ってください。安く一度で済む仕事には向きません。ひと回りごとの判定の手間に見合いませんし、差配役の再挑戦と遮断のしくみが、一時的な失敗はすでに面倒を見ています。判定役は目標の書きぶり以上のものにはならないので、本文は **はっきりした受け入れの条件** として書いてください。

:::note 目標つきのカードは `/goal` のしくみを借りているだけで、つながってはいません
`--goal` は、続きを回すループを *そのカードの作業役のセッションの中で* 走らせます。[`/goal` のスラッシュコマンド](/hermes/docs/user-guide/features/goals/)とはしくみを共有していますが、状態は共有しません。チャットのセッションで `/goal` を立てても、かんばんのカードが作られたり、確保されたり、動いたりはしませんし、目標つきのカードのループは、どのチャットの `/goal status` からも見えません。この会話を回し続けたいなら [`/goal`](/hermes/docs/user-guide/features/goals/) を、盤の上で仕事を進めたいならカードを作ってください。
:::

### まとめ役はどうふるまうか {#how-the-orchestrator-behaves}

**行儀のよいまとめ役は、自分では仕事をしません。** 利用者の目標をタスクに分け、つなぎ、あなたが用意したプロファイルのどれかに割り当てて、一歩下がります。まとめ役への案内——手を出したくなる気持ちを抑える決まり、まず 0 番目にプロファイルを調べさせる指示（差配役は知らない担当名では黙って失敗するので、まとめ役はどのカードも、あなたの機械に実際にあるプロファイルに結び付けなければなりません）、そして `kanban_create` / `kanban_link` / `kanban_comment` を軸にした分け方の手引き——は、作業役のシステムプロンプトへ自動で差し込まれます。入れるものはありません。

まとめ役のひと回りの見本です（並列の調べ役ふたりが、書き手へ渡します）。

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

まとめ役への案内は作業役のシステムプロンプトに自動で入るので、プロファイルごとに入れたり合わせたりするものはありません。

**広げる前に決める。** 設計の判断はまとめ役のもので、作業役のものではありません。並列のカードが 2 枚とも同じことを選ばなければならないなら——名前の付け方、データの形、ファイルの形式、API の形——まとめ役が一度決めて、その決定を **両方の** カードの本文に書き込みます。作業役は兄弟のカードを見られないので、子のカードの本文には、そのカードが頼りにする決定がすべて書かれていなければなりません。たとえば「書き出しを作る」と「読み込みを作る」という並列のカードなら、それぞれの作業役に自前のファイル形式を考えさせないでください。先にひとつ決めて（たとえば `version` の項目を持つ、行区切りの JSON）両方の本文に書きます。そうしないと、ふたつの半分は永遠にかみ合いません。

うまくやりたいなら、ツール群を盤の操作（`kanban`、`gateway`、`memory`）に絞ったプロファイルと組み合わせてください。そうすれば、まとめ役はやろうとしても実装の仕事ができません。

## ダッシュボード（画面） {#dashboard-gui}

`/kanban` の CLI とスラッシュコマンドだけでも画面なしで盤を回せますが、人が間に入る場面——仕分け、プロファイルをまたいだ見守り、コメントの流れを読むこと、カードを列のあいだで動かすこと——には、目で見える盤のほうが向いています。Hermes はこれを、中心機能でも別のサービスでもなく、`plugins/kanban/` に置いた **同梱のダッシュボードのプラグイン** として届けています。作りは[ダッシュボードを広げる](/hermes/docs/user-guide/features/extending-the-dashboard/)に沿っています。

開き方はこうです。

```bash
hermes kanban init      # one-time: create kanban.db if not already present
hermes dashboard        # "Kanban" tab appears in the nav, after "Skills"
```

### プラグインでできること {#what-the-plugin-gives-you}

- 状態ごとに 1 列ずつ並ぶ **Kanban** のタブ。`triage`、`todo`、`ready`、`running`、`blocked`、`done`（切り替えを入れれば `archived` も）です。
  - `triage` は、まだ粗い思い付きを置いておく列です。既定（`kanban.auto_decompose: true`）では、ここへ落ちたタスクに対して差配役が **分解役** を自動で走らせます。組み込みの分解役は `auxiliary.kanban_decomposer` のモデルを使い、あなたのプロファイルの顔ぶれ（説明付き）を読んで、そのタスクを小さな子タスクの図に広げ、いちばん向いた専門役へ振り分けます。元のタスクはすべての子の親として生き残るので、全部が終わったときに、その担当（`kanban.orchestrator_profile`、未設定ならいま使っている既定のプロファイル）が起きて、仕上がりを見ます。ページ上部の **Orchestration: Auto/Manual** の切り替えを押すか、`config.yaml` を直に書き換えてください。どちらのやり方も `hermes kanban specify` と共存します。広げたくないときの、1 タスクぶんの書き直しとして、それは引き続き使えます。
- カードにはタスクの id、表題、優先度の印、借り主の札、割り当てられたプロファイル、コメントとつながりの数、**進みの印**（依存する子がいるとき `N/M`）、「作成から N 前」が出ます。カードごとのチェックで複数選択もできます。
- **Running の中でプロファイルごとに分ける** — ツールバーのチェックで、Running の列を担当ごとに分けられます。
- **WebSocket で即座に更新** — プラグインは追記だけの `task_events` の表を短い間隔で追いかけます。どのプロファイル（CLI、ゲートウェイ、別のダッシュボードのタブ）が動いても、盤はその瞬間に変わります。出来事がまとめて来たときは、読み込み直しを 1 回にまとめます。
- カードを列のあいだへ **ドラッグして** 状態を変えられます。落としたときに送られる `PATCH /api/plugins/kanban/tasks/:id` は、CLI と同じ `kanban_db` のコードを通るので、3 つの入口がずれることはありません。取り返しのつきにくい状態（`done`、`archived`、`blocked`）への移動では確認が出ます。触って操作する端末では、ポインタを使う別のやり方に切り替わるので、タブレットからでも使えます。
- **タスク作成の小窓** — 列の見出しの `+` を押すと、名前の付いた欄が並ぶ小窓が開きます。表題、担当、優先度、スキル、作業場の種類とパス（盤のプロジェクトのディレクトリを下敷きにしつつ、タスクごとに上書きできます）、目標つきかどうか、そして（任意で）既存の全タスクから選ぶ親タスクです。Enter で作成、Shift+Enter で表題の欄に改行、Escape で取り消しです。Triage の列から作ると、新しいタスクは自動で仕分けの列に置かれます。
- **複数選択とまとめ操作** — shift や ctrl を押しながらカードを押すか、チェックを入れると選択に加わります。上にまとめ操作の帯が出て、状態の一括変更、書庫入れ、担当の付け替え（プロファイルの一覧から、または「(unassign)」）ができます。取り返しのつきにくいものは先に確認します。id ごとの失敗は、残りを止めずに報告されます。
- **カードを押す**（shift や ctrl なしで）と横から引き出しが開き（Escape か外を押すと閉じます）、次のものが並びます。
  - **直せる表題** — 見出しを押すと書き換えられます。
  - **直せる担当と優先度** — 情報の行を押すと書き換えられます。
  - **直せる説明** — 既定ではマークダウンとして表示されます（見出し、太字、斜体、インラインのコード、囲みコード、`http(s)` と `mailto:` のリンク、箇条書き）。「edit」のボタンで入力欄に切り替わります。マークダウンの表示はごく小さく、XSS に強い作りです。置き換えはすべて HTML を逃がしたあとの文字に対して走り、通るリンクは `http(s)` と `mailto:` だけで、`target="_blank"` と `rel="noopener noreferrer"` がつねに付きます。
  - **依存の編集** — 親と子が札で並び、それぞれ `×` で切り離せます。ほかのすべてのタスクから選んで、親や子を足せる一覧も付きます。輪ができる指定は、はっきりした説明とともにサーバー側ではねられます。
  - **状態の操作の行**（→ triage / → ready / → running / block / unblock / complete / archive）。取り返しのつきにくい移動には確認が出ます。**Triage** の列のカードでは、この行に LLM を使うふたつの操作も出ます。**⚗ Decompose** は、そのタスクを子タスクの図に広げ、説明をもとに専門のプロファイルへ振り分けます。**✨ Specify** は 1 タスクぶんの書き直しです。Decompose は、広げても得がないと LLM が判断したときは specify と同じ形の格上げに落ちるので、こちらが広いほうです。どちらも CLI から（`hermes kanban decompose <id>` / `specify <id>` / `--all`）、どのゲートウェイからも（`/kanban decompose <id>`）、そしてプログラムからも `POST /api/plugins/kanban/tasks/:id/decompose` と `…/specify` で使えます。モデルは `config.yaml` の `auxiliary.kanban_decomposer` と `auxiliary.triage_specifier` で決めます。
  - 結果の欄（こちらもマークダウン表示）、Enter で送れるコメントの流れ、直近 20 件の出来事。
- **ツールバーの絞り込み** — 自由な文字での検索、借り主の一覧（既定は `config.yaml` の `dashboard.kanban.default_tenant`）、担当の一覧、「書庫入りも出す」の切り替え、「プロファイルごとに分ける」の切り替え、そして次の 60 秒のティックを待たなくてよい **Nudge dispatcher** のボタンです。

見た目に目指しているのは、見慣れた Linear や Fusion のような並びです。暗い配色、件数付きの列の見出し、色の付いた状態の点、優先度と借り主の札。プラグインが読むのはテーマの CSS 変数（`--color-*`、`--radius`、`--font-mono` など）だけなので、ダッシュボードのテーマを変えれば見た目も自動で付いてきます。

### 自動と手動の割り振り {#auto-vs-manual-orchestration}

かんばんの盤には、Triage の列に落としたタスクの扱い方がふたつあります。

**自動（既定）** — `kanban.auto_decompose: true`。ゲートウェイに載った差配役が、ティックごとに **分解役** を走らせます。`kanban.auto_decompose_per_tick`（既定はティックあたり 3 タスク）で上限を掛けてあるので、仕分けのタスクをまとめて放り込んでも、補助の LLM を一気に使い切ることはありません。分解役は、組み込みの分解の指示と `auxiliary.kanban_decomposer` のモデルを使い、入っているプロファイルとその説明を読んで、LLM に JSON のタスクの図を作らせます。どのタスクを起こすか、誰に渡すか、どれがどれに依存するか、です。元の仕分けのタスクは図のすべての葉の親になるので、図が丸ごと終わるまで生き残り、そのあと `ready` へ戻って、担当（`kanban.orchestrator_profile`、未設定ならいま使っている既定のプロファイル）が仕上がりを見て、まだ足りなければタスクを足せます。これが「一言だけ書いて、あとは放っておく」流れです。

**手動** — `kanban.auto_decompose: false`。仕分けのタスクは、あなたが動かすまで仕分けの列に留まります。カードの **⚗ Decompose** のボタンを押すか、`hermes kanban decompose <id>`（や `--all`）を走らせるか、チャットから `/kanban decompose <id>` を使ってください。これは分解役が入る前の盤のふるまいと同じで、何をいつ走らせるかを自分で握りたいときに向いています。

**大事な境目：** 手動にして止まるのは、組み込みの仕分けの分解役だけです。プロファイルが `kanban_create` を呼ぶことは止まりませんし、作った側のセッションを起こす動きも止まりません。`kanban.auto_subscribe_on_create: true` のとき、タスクの終わりの出来事は、状態を伝える人工のひと回りで、そのタスクを作ったエージェントを再開させます。受け渡しを確かめて、ほんとうに新しい追いかけの仕事が要るかを判断できるようにするためです。タスクが終わっても何も起きなくてよいなら、`auto_subscribe_on_create: false` にしてください。出どころを追えるよう、組み込みの分解役が作った子は `created_by=auto-decomposer` を持ち、再開したプロファイルが作ったタスクは、そのプロファイル名を持ちます。

ふたつのやり方は、かんばんのページの上にある **Orchestration: Auto/Manual** の切り替えで行き来できます（緑が Auto、くすんだ灰色が Manual）。`config.yaml` を直に書き換えてもかまいません。どちらのやり方も `hermes kanban specify` と共存します。広げたくないときの、1 タスクぶんの書き直しとして、それは引き続き使えます。

分解役の振り分けは、プロファイルの説明に頼っています。説明はプロファイルごとに付ける札で、`hermes profile create --description "..."`、`hermes profile describe <name> --text "..."`、`hermes profile describe <name> --auto`（そのプロファイルに入っているスキルとモデルから LLM が書きます）、あるいは **Orchestration settings** を開いたところにある、ダッシュボードのプロファイルごとの編集欄で付けられます。説明の無いプロファイルも顔ぶれには出ます。名前で振り分けられますが、精度は落ちます。分解役が子タスクを `assignee=None` で置くことは決してありません。LLM が知らないプロファイルを選んだときは、その子は `kanban.default_assignee`（未設定ならいま使っている既定のプロファイル）へ回されます。

`kanban.orchestrator_profile` は、そのプロファイルの指示、スキル、独自の処理を分解の呼び出しに読み込むわけではありません。これが決めるのは、広げたあとに根っこの（まとめ役の）タスクを誰が持つか、です。分解役のモデルやプロバイダーを変えるなら `auxiliary.kanban_decomposer` を設定してください。組み込みの分解役ではなく、あるプロファイル独自の分け方を使いたいなら、手動に切り替えて、そのプロファイルにタスクを作らせるか分解させてください。

設定できるもの（すべて `~/.hermes/config.yaml` の `kanban:` の下です）。

| キー | 既定値 | 役割 |
|---|---|---|
| `auto_decompose` | `true` | 差配役が、Triage のタスクに対してティックごとに組み込みの分解役を自動で走らせます。プロファイルが呼ぶ `kanban_create` や、作った側を起こすひと回りには効きません。 |
| `auto_decompose_per_tick` | `3` | 差配役のティックあたりの分解の上限です。あふれたぶんは次のティックへ回ります。 |
| `orchestrator_profile` | `""` | 分解のあと、根っこの（まとめ役の）タスクを受け持つプロファイルです。空なら、いま使っている既定のプロファイルに落ちます。 |
| `default_assignee` | `""` | LLM が知らないプロファイルを選んだとき、子タスクが行き着く先です。空なら、いま使っている既定に落ちます。 |
| `auto_subscribe_on_create` | `true` | `kanban_create` が動き続けるゲートウェイや TUI のセッションの中で走ったとき、終わりの出来事が、状態を伝える人工のひと回りでそのエージェントを再開させます。終わっても何も起きなくてよいときや、`kanban_notify-subscribe` を明示的に呼ばせたいときは `false` にしてください。`auto_decompose` とは別ものです。 |
| `done_sub_retention_days` | `30` | 通知の登録は `done` を越えて残り（また開いても大丈夫です）、`archived` で消えます。通知役の掃除は、タスクが `done` か `blocked` のまま新しい動きが無い日数がこれを超えた登録を消し、書庫入れをしない盤で登録の表が膨らむのを抑えます。`0` で掃除を止めます。 |

そして、補助の LLM の枠がふたつあります。

| キー | 役割 |
|---|---|
| `auxiliary.kanban_decomposer` | タスクの図を作るモデルです（Decompose から呼ばれます）。主のチャットのモデルと変えたいときは `provider`／`model` を設定します。 |
| `auxiliary.profile_describer` | プロファイルの説明を自動で書くモデルです（`hermes profile describe --auto` から呼ばれます）。 |

### 組み立て {#architecture}

この画面は、あくまで **DB を読んで、kanban_db を通して書く** 層で、自分の側に業務の処理は持ちません。

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

### REST の口 {#rest-surface}

どの経路も `/api/plugins/kanban/` の下にあり、ダッシュボードの使い捨ての合い言葉で守られています。

| 手 | パス | 役割 |
|---|---|---|
| `GET` | `/board?tenant=<name>&include_archived=…` | 状態の列ごとにまとめた盤の全体と、絞り込み用の借り主と担当の一覧 |
| `GET` | `/tasks/:id` | タスクとコメントと出来事とつながり |
| `POST` | `/tasks` | 作成（`kanban_db.create_task` を包み、`triage: bool` と `parents: [id, …]` を受け取ります） |
| `PATCH` | `/tasks/:id` | 状態／担当／優先度／表題／本文／結果 |
| `POST` | `/tasks/bulk` | `ids` のすべての id に同じ変更（状態／書庫入れ／担当／優先度）を当てます。id ごとの失敗は、ほかを止めずに報告されます |
| `POST` | `/tasks/:id/comments` | コメントを足します |
| `POST` | `/tasks/:id/specify` | 仕分けの書き直しを走らせます。補助の LLM がタスクの本文を膨らませ、`triage` から `todo` へ上げます。`{ok, task_id, reason, new_title}` を返します。「仕分けにいない」「補助のクライアントが無い」「LLM のエラー」のときは、人が読める理由を付けた `ok=false` を 200 で返します。4xx ではありません |
| `POST` | `/tasks/:id/decompose` | かんばんの分解役を走らせます。補助の LLM がタスクの図を作り、補助の処理が子をまとめて作り、根っこにつなぎ、`triage → todo` へ切り替えます。`{ok, task_id, reason, fanout, child_ids, new_title}` を返します。LLM のエラーでも 200 を返すのは `/specify` と同じです。 |
| `GET` | `/profiles` | 入っているプロファイルとその説明を並べます（ダッシュボードの説明の編集欄と、まとめ役の選択で使います）。 |
| `PATCH` | `/profiles/:name` | プロファイルの説明を書くか消します（人が書いたものとして `description_auto: false` になります）。`{ok, profile, description}` を返します。 |
| `POST` | `/profiles/:name/describe-auto` | `auxiliary.profile_describer` でプロファイルの説明を作ります。`description_auto: true` で保存されるので、ダッシュボードは「要確認」の印を出せます。 |
| `GET` | `/orchestration` | かんばんの割り振りの設定（`orchestrator_profile`、`default_assignee`、`auto_decompose`）と、既定に落ちたあとの *実際に効く* 値を読みます。 |
| `PUT` | `/orchestration` | `config.yaml` の割り振りの 3 つの鍵のうち、ひとつ以上を書き換えます。空でないプロファイル名が実在するかを確かめます。 |
| `POST` | `/links` | 依存を足します（`parent_id` → `child_id`） |
| `DELETE` | `/links?parent_id=…&child_id=…` | 依存を外します |
| `POST` | `/dispatch?max=…&dry_run=…` | 差配役をつつきます。60 秒の待ちを飛ばせます |
| `GET` | `/config` | `config.yaml` の `dashboard.kanban` の設定を読みます。`default_tenant`、`lane_by_profile`、`include_archived_by_default`、`render_markdown` です |
| `WS` | `/events?since=<event_id>` | `task_events` の行をそのまま流します |

どの受け口も薄い包みです。プラグインは Python でおよそ 700 行（経路と WebSocket の追いかけとまとめ処理と設定の読み取り）で、新しい業務の処理は足していません。小さな `_conn()` の補助が、読み書きのたびに `kanban.db` を必要なら用意するので、入れたばかりの環境でも、ダッシュボードを先に開いても、REST を直に叩いても、`hermes kanban init` を走らせても動きます。

### ダッシュボードの設定 {#dashboard-config}

`~/.hermes/config.yaml` の `dashboard.kanban` の下にあるこれらの鍵で、タブの既定が変わります。プラグインは読み込みのときに `GET /config` で読みます。

```yaml
dashboard:
  kanban:
    default_tenant: acme              # preselects the tenant filter
    lane_by_profile: true             # default for the "lanes by profile" toggle
    include_archived_by_default: false
    render_markdown: true             # set false for plain <pre> rendering
```

どの鍵も任意で、書かなければ上に示した既定になります。

### 安全性の考え方 {#security-model}

ダッシュボードの HTTP の認証は、[`/api/plugins/` をわざと素通しします](/hermes/docs/user-guide/features/extending-the-dashboard/#backend-api-routes)。ダッシュボードは既定で localhost にしか出ないので、プラグインの経路は設計として認証なしです。つまり、かんばんの REST の口は、そのホストのどのプロセスからも届きます。

WebSocket だけはもうひと手間かけていて、ダッシュボードの使い捨ての合い言葉を `?token=…` の問い合わせとして求めます（ブラウザは切り替えの要求に `Authorization` を付けられないためです）。ブラウザの中の PTY の橋渡しと同じやり方です。

`hermes dashboard --host 0.0.0.0` で動かすと、かんばんも含めてすべてのプラグインの経路がネットワークから届くようになります。**みんなで使うホストでは、これをやらないでください。** 盤にはタスクの本文、コメント、作業場のパスが入っています。この経路に届いた相手は、あなたの仕事の場をまるごと読めますし、タスクを作ったり、担当を変えたり、書庫へ入れたりもできます。

`~/.hermes/kanban.db` のタスクは、わざとプロファイルに紐づけていません（そこが人をつなぐ要だからです）。`hermes -p <profile> dashboard` でダッシュボードを開いても、盤にはそのホストのほかのプロファイルが作ったタスクも出ます。すべてのプロファイルの持ち主は同じ人ですが、いくつもの人格を並べているなら知っておく価値があります。

### 即座の更新 {#live-updates}

`task_events` は、増えるだけの SQLite の表で、`id` はひたすら増えます。WebSocket の口は、つないでいる相手ごとに最後に見た出来事の id を持っていて、新しい行が入るたびに送ります。出来事がまとめて来たときは、画面の側が（とても軽い）盤の取得をやり直します。出来事の種類ごとに手元の状態を継ぎ足そうとするより、単純で正しくなります。WAL のおかげで、読み込みのループが差配役の `BEGIN IMMEDIATE` の確保を邪魔することもありません。

### 広げるには {#extending-it}

このプラグインは、Hermes のダッシュボードのプラグインの決まりごとをそのまま使っています。仕様の全体、外枠の差し込み口、ページごとの差し込み口、プラグイン SDK については[ダッシュボードを広げる](/hermes/docs/user-guide/features/extending-the-dashboard/)を見てください。列を足す、カードの見た目を変える、借り主で絞った並びにする、`tab.override` でまるごと差し替える、どれもこのプラグインを分岐させずに書けます。

消さずに止めたいときは、`config.yaml` に `dashboard.plugins.kanban.enabled: false` を足してください（または `plugins/kanban/dashboard/manifest.json` を消します）。

### どこまでやるか {#scope-boundary}

この画面は、あえて薄く作ってあります。プラグインができることは、すべて CLI からもできます。プラグインは、それを人にとって心地よくするだけです。自動の割り当て、予算、決裁の関門、組織図のような表示は、設計の仕様で対象外に挙げたとおり、利用者の側に置かれたままです。振り分け役のプロファイル、別のプラグイン、`tools/approval.py` の作り直しといった形で作れます。

## CLI のコマンド一覧 {#cli-command-reference}

これは、**あなた**（やスクリプト、cron、ダッシュボード）が盤を動かすための口です。差配役の中で動く作業役は、同じ操作を `kanban_*` の[ツールの口](#how-workers-interact-with-the-board)で行います。ここの CLI も向こうのツールも `kanban_db` を通るので、ふたつの口は作りからしてずれません。

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

どのコマンドも、対話中の CLI とメッセージのゲートウェイでスラッシュコマンドとして使えます（下の[`/kanban` スラッシュコマンド](#kanban-slash-command)を見てください）。

`--max-retries` は、差配役に対するタスクごとの遮断の上書きです。`--max-retries 1` なら最初にうまくいかなかった時点でタスクを止め、`--max-retries 3` なら 2 回まで再挑戦して 3 回目の失敗で止めます。書かなければ `config.yaml` の `kanban.failure_limit` が使われ、それも無ければ組み込みの既定になります。

### 同時実行、予定、子の格上げの設定 {#concurrency-scheduling-and-child-promotion-config}

| 設定の鍵 | 既定値 | 効果 |
|------------|---------|--------------|
| `kanban.max_in_progress` | 未設定（無制限） | 同時に走るタスクの数に上限を掛けます。すでに N 個走っていると、差配役はそれ以上立ち上げません。遅い作業役（手元の LLM、資源の限られたホスト）で、抱えたものを片付ける前に積み上がって時間切れになるのを防ぎます。おかしな値や 1 未満の値は、警告を出して無制限として扱われます。 |
| `kanban.max_in_progress_per_profile` | 未設定（無制限） | `max_in_progress` のプロファイル版で、ひとつの担当プロファイルが同時に走らせられるタスクの数に上限を掛けます。あるプロファイルだけが遅かったり流量制限に掛かったりするけれど、ほかは流したいときに向いています。盤ぐるみの `max_in_progress` と一緒に効き、両方が許したときだけ立ち上がります。 |
| `kanban.auto_promote_children` | `true` | `decompose_triage_task()` が、親で止まる依存を持たない子を作ったあと、差配役が拾えるよう自動で `ready` へ上げます。人が見てから進めたいときは `false` にしてください。子は、あなたが上げるまで `todo` に留まります。 |
| `kanban.default_workdir` | 未設定 | `--workspace` もタスク自身も上書きしないとき、新しいタスクに当てる盤ぐるみの既定の作業ディレクトリです。タスクごとの `workspace:` があれば、そちらが勝ちます。 |

```yaml
kanban:
  max_in_progress: 2
  auto_promote_children: false
  default_workdir: ~/work/active-project
```

### 時刻を決めた開始（`scheduled_at`） {#scheduled-task-starts-scheduledat}

タスクに `scheduled_at` を設定すると、その時刻まで差し向けを遅らせられます。差配役は、`scheduled_at` が未来の支度済みのタスクを飛ばし、その時刻を過ぎた最初のティックで拾います。

```bash
hermes kanban create "nightly backup audit" \
  --assignee ops --scheduled-at "2026-06-01T03:00:00Z"
```

### 立ち上げ直しの守り {#respawn-guard}

差配役は、支度済みのタスクでも、前回の実行で使用量・認証・429 のエラーに当たったとき（`blocker_auth`）、守りの時間の内にうまく終わった実行があるとき（`recent_success`）、最近のコメントが GitHub の PR を指しているとき（`active_pr`）は、立ち上げ直しを断ります。人が追いつくまで、同じ不具合やタスクに作業役が押し寄せるのを防ぎます。[出来事の一覧](#event-reference)の `respawn_guarded` の行を見てください。

### ドラッグして消す、まとめて消す（ダッシュボード） {#drag-to-delete-and-bulk-delete-dashboard}

ダッシュボードのかんばんのページには **ごみ箱の受け皿** があります。カードをそこへドラッグすると、そのタスクが消えます（`task_events`、子のつながり、通知の登録もたどって消えます）。うっかりを防ぐ確認が出ます。まとめて消すには、`DELETE /api/plugins/kanban/tasks` に JSON の本体 `{"ids": ["t_abc", "t_def", ...]}` を送ってもできます。

### 作業役を見るための口 {#worker-visibility-endpoints}

ダッシュボードのプラグインの API には、外から見張るための読み取り専用の口（と、実行を止める動詞がひとつ）が用意されています。

| 口 | 返るもの |
|----------|---------|
| `GET /api/plugins/kanban/workers/active` | いま立ち上がっている作業役。PID、プロファイル、タスクの id、開始時刻、最後の鼓動 |
| `GET /api/plugins/kanban/runs/{id}` | ひとつの実行の詳細。タスクの id、状態、開始と終了、終了コード、ログのパス |
| `POST /api/plugins/kanban/runs/{run_id}/terminate` | 取り戻せる実行を止めます。作業役を止め、そのタスクを差し向け直せるようにします |
| `GET /api/plugins/kanban/inspect` | 差配役のようすをまとめたもの。たまっている数、走っている数と `max_in_progress` の比較、最近の出来事 |

これらはすべて、かんばんのプラグインの API のほかの部分と同じ、ダッシュボードのプラグインの認証で守られています。

### かんばんの群れの形を作る補助 {#kanban-swarm-topology-helper}

`hermes kanban swarm` は、消えない **Kanban Swarm v1** の図をひと息で作ります。終わった状態の根っこ（黒板）のカード、並列の作業カード N 枚、作業カード全部を待つ検証のカード、そして検証を待つ取りまとめのカードです。群れで共有する文脈（「黒板」）は、根っこのカードに形の決まった JSON のコメントとして残るので、どの作業役からも読めます。

```bash
hermes kanban swarm "Design a multi-region failover plan" \
  --workers researcher,architect,sre \
  --verifier reviewer --synthesizer writer
```

出来上がった図はまとめて確定します。差配役もダッシュボードも、新しい群れが見えないか、完成した形が見えるかのどちらかで、根っこ・作業・検証が途中までつながった図を見ることはありません。あとはふつうに動きます。作業役が並列で走り、全員が終わると検証役が起き、検証役が問題なしと印を付けると取りまとめ役が起きます。

## `/kanban` スラッシュコマンド {#kanban-slash-command}

`hermes kanban <action>` のどの動詞も、`/kanban <action>` として使えます。対話中の `hermes chat` のセッションの中からも、**そして** どのゲートウェイ（Telegram、Discord、Slack、WhatsApp、Signal、Matrix、Mattermost、メール、SMS）からもです。どちらの入口も、`hermes kanban` の argparse の木をそのまま使う同じ `hermes_cli.kanban.run_slash()` を呼ぶので、引数もフラグも出力の形も、CLI と `/kanban` と `hermes kanban` で同じです。盤を動かすためにチャットを離れる必要はありません。

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

いくつかの語からなる引数は、シェルと同じように引用符でくくってください。`run_slash` は行の残りを `shlex.split` で読むので、`"..."` も `'...'` もどちらも使えます。

### 実行中でも使える：`/kanban` は待たされません {#mid-run-usage-kanban-bypasses-the-running-agent-guard}

ゲートウェイはふだん、エージェントがまだ考えているあいだ、スラッシュコマンドや利用者のメッセージを並べて待たせます。1 回目が飛んでいるうちに 2 回目を始めてしまうのを止めるためです。**`/kanban` は、この守りからはっきり外してあります。** 盤は動いているエージェントの中ではなく `~/.hermes/kanban.db` にあるので、読み取り（`list`、`show`、`context`、`tail`、`watch`、`stats`、`runs`）も書き込み（`comment`、`unblock`、`block`、`assign`、`archive`、`create`、`link` など）も、ひと回りの最中でもすぐ通ります。

切り分けてある意味は、まさにここにあります。

- 作業役が仲間を待って止まったら、あなたはスマホから `/kanban unblock t_abcd` を送り、差配役が次のティックでその仲間を拾います。止まっていた作業役は邪魔されません。止まっていた状態でなくなるだけです。
- 人の知恵が要るカードを見つけたら、`/kanban comment t_xyz "use the 2026 schema, not 2025"` がそのタスクの流れに載り、*次の* 実行が `kanban_show()` でそれを読みます。
- まとめ役を止めずに群れのようすを知りたいなら、`/kanban list --mine` や `/kanban stats` が、あなたの本題の会話に触れずに盤を見せてくれます。

### `/kanban create` での自動登録（ゲートウェイのみ） {#auto-subscribe-on-kanban-create-gateway-only}

ゲートウェイから `/kanban create "…"` でタスクを作ると、その元になったチャット（プラットフォームとチャットの id とスレッドの id）が、そのタスクの終わりの出来事（`completed`、`blocked`、`gave_up`、`crashed`、`timed_out`）に自動で登録されます。終わりの出来事ごとに 1 通ずつ返ってきます。`completed` のときは作業役の結果の 1 行目も付くので、見に行ったりタスクの id を覚えたりしなくて済みます。

```
you> /kanban create "transcribe today's podcast" --assignee transcriber
bot> Created t_9fc1a3  (ready, assignee=transcriber)
     (subscribed — you'll be notified when t_9fc1a3 completes or blocks)

… ~8 minutes later …

bot> ✓ t_9fc1a3 completed by transcriber
     transcribed 42 minutes, saved to podcast/2026-05-04.md
```

登録は、タスクが `done` になっても残ります。完了は取り消せる（レビュー役や差配する側が、終わったタスクをまた開けられる）ので、開き直しても元のセッションに知らせが届き続けます。`archived`（取り返しのつかない終わり）で自動的に外れます。書庫入れをしない盤では、掃除のひと巡りが、`done` か `blocked` のまま `kanban.done_sub_retention_days` 日（既定 30、0 で止まります）動きの無いタスクの登録を消すので、古い行がいつまでも積み上がることはありません。`--json`（機械向けの出力）を付けてスクリプトから作った場合、自動の登録は行われません。スクリプトから呼ぶ側は、`/kanban notify-subscribe` で自分で登録を管理したいだろう、という前提です。

チャット由来の自動登録は `notify+wake` で作られます。終わりの出来事が起きると、届け先のエージェントは受け取るだけでなく、ほんとうにひと回り動くので、盤の文脈を読んで自分の言葉で返せます。下の[届け方](#delivery-modes)を見てください。

### メッセージでの出力の切り詰め {#output-truncation-in-messaging}

ゲートウェイのプラットフォームには、実際のところメッセージの長さに上限があります。`/kanban list`、`/kanban show`、`/kanban tail` の出力がおよそ 3800 文字を超えると、`… (truncated; use \`hermes kanban …\` in your terminal for full output)` の一文を添えて切り詰められます。CLI のほうに、こうした上限はありません。

### 入力の補い {#autocomplete}

対話中の CLI で `/kanban ` と打って Tab を押すと、組み込みのコマンドの一覧を順に見られます（`list`、`ls`、`show`、`create`、`assign`、`link`、`unlink`、`claim`、`comment`、`complete`、`block`、`unblock`、`archive`、`tail`、`dispatch`、`context`、`init`、`gc`）。上の CLI の一覧にある残りの動詞（`watch`、`stats`、`runs`、`log`、`assignees`、`heartbeat`、`notify-subscribe`、`notify-list`、`notify-unsubscribe`、`daemon`）も使えます。まだ補いの候補に入っていないだけです。

## 進め方の型 {#collaboration-patterns}

盤は、新しい部品を足さずに次の 8 つの型を支えます。

| 型 | 形 | 例 |
|---|---|---|
| **P1 広げる** | 同じ役の兄弟が N 人 | 「5 つの角度を並列で調べる」 |
| **P2 流れ作業** | 役の連なり：探し役 → 編集役 → 書き手 | 毎日のまとめ作り |
| **P3 多数決** | 兄弟 N 人と取りまとめ 1 人 | 調べ役 3 人 → レビュー役 1 人が選ぶ |
| **P4 長く続く記録** | 同じプロファイル、共有のディレクトリ、cron | Obsidian の保管庫 |
| **P5 人が間に入る** | 作業役が止まる → 人がコメント → 解除 | はっきりしない判断 |
| **P6 `@mention`** | 文章の中から割り振る | `@reviewer look at this` |
| **P7 スレッドごとの作業場** | スレッドの中で `/kanban here` | プロジェクトごとのゲートウェイのスレッド |
| **P8 群れの世話** | ひとつのプロファイルで N 個の対象 | SNS のアカウント 50 個 |
| **P9 仕分けの書き直し** | 粗い思い付き → `triage` → `hermes kanban specify` が本文を膨らませる → `todo` | 「この一言を、きちんとしたタスクに」 |

それぞれの実例は `docs/hermes-kanban-v1-spec.pdf` を見てください。

## 後続のカードへ文脈を渡す（親のつながり） {#handing-context-to-follow-up-cards-the-parent-link}

親とのつながりは、順番を決める関門であるだけでなく、**終わった** カードから新しいカードへ文脈を渡す道でもあります。`--parent <done-card-id>` を付けてカードを作ると、ふたつのことが起きます。

1. **すぐ動ける状態になります。** `create_task` は、親の状態から状態を決めます。親がすべて `done` の子は、そのまま `ready` で作られます。待ちも、手作業の格上げもありません。（まだ開いている親を持つ子は `todo` にいて、最後の親が終わったときに `recompute_ready` が上げます。）
2. **親からの受け渡しが一緒に来ます。** 子のために組み立てられる作業役の文脈（`build_worker_context`、つまり `kanban_show()` が返すもの）には、`## Parent task results` の節が入り、親ごとの完了時の `summary` と `metadata` がそのまま並びます。

```
## Parent task results
### t_77c26979 (completed just now)
Added exponential backoff with jitter to the retry helper.
_metadata_: `{"changed_files": ["hermes_cli/retry.py", "tests/test_retry.py"], "decisions": ["capped backoff at 60s", "jitter = full"]}`
```

だから、終わったカードの続きの仕事は **終わったカードを開き直すのではなく、新しい子のカードを作る** のが型です。終わったカードは動かない履歴で、その文脈は親のつながりを通って前へ流れます。同じカードでのやり直し（失敗するカードの再挑戦の輪）は別のしくみです。*同じ* カードのそれまでの試みは、そのカード自身の文脈に「これまでの試み」として出ます。

作業ツリーやブランチだけでは代わりになりません。リポジトリの状態は、続きの作業役にコードが *どうなっているか* を伝えますが、*なぜ* そうなのかは伝えません。判断、走らせたテスト、触ったファイルは、git ではなく親の形の決まった受け渡しの中にあります。親が終わった時点では無かった証拠（あとで落ちた CI のログなど）は、新しいカードの **本文** に書くものです。

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

直しに当たる作業役は、元のカードの要約と受け渡し（変えたファイル、判断）を文脈に持った状態で立ち上がり、そこにあなたが本文へ書いた新しい証拠が加わります。

### ぶつかった作業役のブランチをまとめる {#reconciling-colliding-worker-branches}

開発の流れ（作業ツリーを使う P1・P2）では、ふたりの作業役のブランチが合流の
ときにぶつかることがあります。どちらかに自分で裁かせてはいけません。ぶつかった
側は相手の文脈を持たないので、決まって相手を上書きするか、自分のほうを捨てます。
代わりに、**第三の中立なプロファイル** に割り当てたまとめ直しのカードを作り、
ぶつかった **両方の** カードを親としてつなぎます。親のつながりが両側の完了報告を
まとめ役の文脈へ運ぶので、差分の両方 *と* 意図の両方が届きます。同梱の
[`agent-merge-conflict-arbiter` の追加スキル](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/autonomous-ai-agents/agent-merge-conflict-arbiter/SKILL.md)
が、その作業役に手順一式を渡します。ぶつかった箇所を種類分けし、公平に片付け、
確かめ、どの判断をしたかを並べた要約を返す、という手順です。

### 並列の作戦でぶつかりやすい場所 {#collision-hotspots-in-parallel-campaigns}

手広い作戦では、いくつかのファイルがぶつかりの磁石になります。大勢の作業役が
同じファイルに少しずつ足し、小さく保つ役目は誰も持たず、そこが合流のぶつかりの
名所になります。効くのは新しい部品ではなく、コメントの約束ごとです。自分の差分が
ひとつのファイルで兄弟とぶつかり続けると気付いた作業役——あるいは、自分が触った
ファイルがほかのカードの最近のコメントに出続けていると気付いた作業役——は、
黙って積み増してはいけません。代わりに、目印になる前置きを付けたコメントを自分の
カードに残します。

```
hotspot: hermes_cli/kanban_db.py — third conflicting edit to the dispatch loop this wave
```

そして完了時の `metadata` にも同じ印をくり返します。同じパスを名指しした
**`hotspot:` のコメントがふたつ以上** あるのを見たまとめ役（や、盤を見ている人）は、
そのファイルに触れる仕事をこれ以上並べる **前に**、そのファイル専用の整理・分割の
カードを作ってください。磁石になったファイルを割るほうが、これから起きるぶつかりを
すべてまとめ直すより安く済みます。*すでに* 起きたぶつかりには、上のまとめ直しの
カードの型と `agent-merge-conflict-arbiter` の追加スキルを使ってください。ぶつかり
やすい場所に印を付けるのは、まとめ役が常設の仕事にならないようにする、上流側の
手当てです。

## 借り主を分けて使う {#multi-tenant-usage}

ひとつの専門役の群れが複数の事業を受け持つときは、タスクごとに借り主の札を付けます。

```bash
hermes kanban create "monthly report" \
    --assignee researcher \
    --tenant business-a \
    --workspace dir:~/tenants/business-a/data/
```

作業役は `$HERMES_TENANT` を受け取り、記憶を書くときに前置きで分けます。盤も、差配役も、プロファイルの定義も共有で、分かれるのはデータだけです。

## デスクトップの知らせ {#desktop-notifications}

デスクトップアプリのかんばんのプラグインは、同じ終わりの出来事をそのまま出します。ゲートウェイは要りません。かんばんの盤の出来事の口がつながっているあいだ、`completed`、`blocked`、`gave_up`、`crashed`、`timed_out`、そして仕分けへ回された（`block_loop_detected`）の出来事ごとに、作業役の受け渡し（要約、止まった理由、エラー）と「Open Kanban」の操作が付いた小窓がアプリの中に出ます。Hermes の窓から離れているときは、同じ出来事が OS の知らせも鳴らすので（**Settings ▸ Notifications ▸ Plugin notifications** で切り替えます）、別のアプリを使っているあいだにタスクが止まっても届きます。

届く範囲について。デスクトップの知らせは、生の出来事の流れに乗っています。ですからアプリが動いていて、かんばんのプラグインが有効なあいだだけ鳴ります。アプリを閉じているあいだに起きた出来事が、次に開いたときに鳴り直すことはありません。閉じていても届いてほしいなら、下のゲートウェイの登録を使ってください。

## ゲートウェイからの知らせ {#gateway-notifications}

ゲートウェイ（Telegram、Discord、Slack など）で `/kanban create …` を走らせると、元になったチャットが新しいタスクに自動で登録されます。ゲートウェイの裏で動く通知役が数秒おきに `task_events` を見て、終わりの出来事（`completed`、`blocked`、`gave_up`、`crashed`、`timed_out`）ごとに 1 通ずつそのチャットへ届けます。終わったタスクでは作業役の `--result` の 1 行目も送られるので、`/kanban show` をしなくても結末が分かります。

登録は CLI から自分で扱えます。スクリプトや cron のジョブが、自分の由来ではないチャットへ知らせたいときに便利です。

```bash
hermes kanban notify-subscribe t_abcd \
    --platform telegram --chat-id 12345678 --thread-id 7 \
    --chat-type group --delivery-mode notify+wake
hermes kanban notify-list
hermes kanban notify-unsubscribe t_abcd \
    --platform telegram --chat-id 12345678 --thread-id 7
```

登録は、タスクが `done` か `archived` になると自分で外れます。片付けは要りません。

### 届け方 {#delivery-modes}

`--delivery-mode` は、終わりの出来事に通知役が **どう** 応じるかを決めます。どの登録も 3 つのうちのひとつです（`notify` が既定で、昔からの動きです）。

| 届け方 | 受け身のメッセージ | エージェントを起こす | こんなとき |
|------|-----------------|-----------------|-------------|
| `notify` | 出す | 起こさない | チャットに知らせが来ればよいとき（既定）。 |
| `notify+wake` | 出す | 起こす | 届け先のエージェントにもひと回り動いてほしいとき。盤の文脈を読んで自分の言葉で返します。チャット由来の自動登録はこれです。 |
| `wake` | 出さない | 起こす | 別の呼び出しは要らず、エージェントに動いてほしいだけのとき。 |

「起こす」は、届け先のゲートウェイのエージェントに人工の受信メッセージを渡して、ふつうのひと回り（コメントと結果を読み、考え、返す）をさせます。1 行の受け身の知らせで終わらせません。これは通知役が生きているゲートウェイのプロセスの中で動いているときだけ働きます。そうでないときは、`notify+wake` の登録は受け身のメッセージだけを届け、`wake` だけの登録はそのプロセスでは何もしません。

**どの出来事が起こすのか。** 判断を元へ返すものです。`completed`、`blocked`、`gave_up`、`crashed`、`timed_out`、`review_requested`（作業役が実装を終えて `kanban_request_review` で渡した）、そして `block_loop_detected`（くり返し止まったあとタスクが `triage` へ回った）です。`status`、`archived`、`unblocked` は届きますが、起こしません。これらは判断ではなく、帳面の付け替えだからです。`completed` や `review_requested` が要約を持っているときは、その受け渡しも起こすひと回りに乗るので、起きたエージェントは作業役が実際に何をしたかを見られます。

`--chat-type`（`dm` | `group` | `channel` | `thread`）は、元になったチャットの種類を記録します。起こされたひと回りが、操作している人の **本物の** セッションにたどり着くためです。`build_session_key` は、グループ、チャンネル、スレッドを DM とは別の鍵にするので、`chat_type` が違っていると、起こす先が文脈の無い別のセッションになってしまいます。`/kanban` の自動登録とスラッシュコマンドの経路はこれを自動で取ります。スクリプトや cron からチャットを登録するときだけ、自分で指定してください。書かなければ、いまある登録はそのままです（新しい登録の既定は `dm` です）。

### プロファイルが複数あるとき：届けるのはプロファイルの持ち場 {#multi-profile-setups-delivery-is-profile-owned}

プロファイルごとにゲートウェイを立てる構成（差配役はひとつ、`writer` や
`admin` などのゲートウェイのプロセスは別々。[複数ゲートウェイの
手引き](https://github.com/NousResearch/hermes-agent/blob/main/docs/kanban/multi-gateway.md)
を見てください）では、差し向けと届けの持ち主が分かれます。

- **差し向けの持ち主はひとつだけです。** ちょうどひとつのゲートウェイが
  `kanban.dispatch_in_gateway: true` のままで差配役を動かし、ほかのゲートウェイは
  すべて `false` にします。
- **知らせを届けるのはプロファイルの持ち場です。** どのゲートウェイも——差し向けを
  しないものも含めて——通知役を動かし、自分が抱えるプラットフォームのプロファイルの
  印が付いた登録だけを見ます。`writer` のプロファイルの Telegram から作られた
  タスクの `completed`／`blocked` は、差し向けたのが `default` のゲートウェイでも、
  `writer` のゲートウェイが届けます。
- **昔からの登録**、つまりプロファイルの印が付く前に作られたもの（行に
  `notifier_profile` が無いもの）は、差配役の錠を実際に握っているゲートウェイだけが
  届けるので、ふたつのゲートウェイが取り合うことはありません。

ゲートウェイをまたいだ二重の配信は、盤の DB での出来事ごとの確実な確保で防いで
います。中継役も、認証情報の共有も、追加の差配役も要りません。プロファイルごとの
ゲートウェイが、それぞれ自分の口から届けるだけです。

## 実行 — 1 回の挑戦につき 1 行 {#runs-one-row-per-attempt}

タスクは仕事のまとまりで、**実行** はそれをこなす 1 回の挑戦です。差配役が支度済みのタスクを確保すると、`task_runs` に 1 行作り、`tasks.current_run_id` をそこへ向けます。その挑戦が終わると——完了、中断、落ちた、時間切れ、立ち上げ失敗、取り戻し——その行が `outcome` を持って閉じ、タスクの向き先は空になります。3 回挑んだタスクには、`task_runs` の行が 3 つあります。

タスクを書き換えるだけにせず表をふたつに分けている理由は、実際に振り返るときに **挑戦の全部の履歴** が要るからです（「2 回目のレビューで承認まで行き、3 回目で合流した」）。それに、挑戦ごとの情報——どのファイルが変わったか、どのテストが走ったか、レビュー役が何に気付いたか——を掛けておく、きれいな場所も要ります。それらは実行の事実であって、タスクの事実ではありません。

実行はまた、**形の決まった受け渡し** が住むところでもあります。作業役がタスクを終えるとき（`kanban_complete(...)` で）、次のものを渡せます。

- `summary`（ツールの引数）／`--summary`（CLI） — 人に向けた受け渡しです。実行に載り、あとに続く子は `build_worker_context` の中でこれを見ます。
- `metadata`（ツールの引数）／`--metadata`（CLI） — 実行に載る、形の自由な JSON です。子は要約と並んだ形で見ます。
- `result`（ツールの引数）／`--result`（CLI） — タスクの行に載る短い記録です（昔からの項目で、互換のために残しています）。

あとに続く子は、親ごとにいちばん最近終わった実行の要約と metadata を読みます。やり直す作業役は、自分のタスクのそれまでの試み（結末、要約、エラー）を読むので、すでに失敗した道をもう一度たどりません。

```
# What a worker actually does — a tool call, from inside the agent loop:
kanban_complete(
    summary="implemented token bucket, keys on user_id with IP fallback, all tests pass",
    metadata={"changed_files": ["limiter.py", "tests/test_limiter.py"], "tests_run": 14},
    result="rate limiter shipped",
)
```

同じ受け渡しは、作業役には閉じられないタスクをあなた（人）が締めるときに、CLI からも使えます。放り出されたタスクや、ダッシュボードで手作業で done にしたタスクなどです。

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

実行はダッシュボード（引き出しの Run History の欄に、挑戦ごとに色の付いた 1 行）にも、REST の API（`GET /api/plugins/kanban/tasks/:id` が `runs[]` の配列を返します）にも出ます。`PATCH /api/plugins/kanban/tasks/:id` に `{status: "done", summary, metadata}` を渡すと両方が中心へ送られるので、ダッシュボードの「done にする」ボタンは CLI と同じ働きをします。`task_events` の行は、自分が属する `run_id` を持っているので、画面は挑戦ごとにまとめられますし、`completed` の出来事は 1 行目の要約を中身に埋め込む（400 文字まで）ので、ゲートウェイの通知役は SQL をもう一往復せずに、形の決まった受け渡しを見せられます。

**まとめて閉じるときの注意。** `hermes kanban complete a b c --summary X` は断られます。形の決まった受け渡しは実行ごとのものなので、同じ要約を N 個のタスクへ貼るのは、ほぼいつも間違いです。`--summary` / `--metadata` **なし** のまとめ閉じは、「事務作業の山を片付けた」というよくある場合のために、これまでどおり使えます。

**状態を変えたときの取り戻し。** ダッシュボードで走っているタスクを `running` から外すと（`ready` へ戻す、`todo` へ直行する）、あるいはまだ走っているタスクを書庫へ入れると、飛んでいた実行は宙に浮くのではなく `outcome='reclaimed'` で閉じます。`tasks.current_run_id` が `NULL` のとき `task_runs` の行はつねに終わりの状態にあり、その逆も成り立ちます。この決まりは、CLI でも、ダッシュボードでも、差配役でも、通知役でも保たれます。

**確保されなかった完了のための、人工の実行。** 一度も確保されなかったタスクを完了したり止めたりすると（ダッシュボードから人が `ready` のタスクを要約付きで閉じる、CLI で `hermes kanban complete <ready-task> --summary X` を走らせる、など）、そのままでは受け渡しが落ちてしまいます。そこで中心の処理が、要約・metadata・理由を持った長さ 0 の実行の行（`started_at == ended_at`）を差し込むので、挑戦の履歴は欠けません。`completed` / `blocked` の出来事の `run_id` は、その行を指します。

**引き出しがその場で更新されます。** ダッシュボードの WebSocket が、いま開いているタスクの新しい出来事を伝えると、引き出しは自分で読み込み直します（タスクごとの出来事の数え上げを `useEffect` の依存に通しています）。実行の新しい行や結末の変化を見るために、閉じて開き直す必要はもうありません。

### これから先との折り合い {#forward-compatibility}

`tasks` にある空を許すふたつの列は、v2 の流れの振り分けのために取ってあります。`workflow_template_id`（このタスクがどの型に属するか）と `current_step_key`（その型のどの段が動いているか）です。v1 の中心はこれらを振り分けに使いませんが、書き込むことは許すので、v2 では構造を作り直さずに振り分けのしくみを足せます。

## 出来事の一覧 {#event-reference}

移り変わりのたびに、`task_events` に 1 行足されます。それぞれの行は任意の `run_id` を持つので、画面は挑戦ごとにまとめられます。種類は 3 つの群れに分かれていて、絞り込みが楽です（`hermes kanban watch --kinds completed,gave_up,timed_out`）。

**一生**（仕事のまとまりとしてのタスクに何が起きたか）。

| 種類 | 中身 | いつ |
|---|---|---|
| `created` | `{assignee, status, parents, tenant}` | タスクが入りました。`run_id` は `NULL` です。 |
| `promoted` | — | 親がすべて `done` になったので `todo → ready`。`run_id` は `NULL` です。 |
| `claimed` | `{lock, expires, run_id}` | 差配役が、立ち上げのために `ready` のタスクを確実に確保しました。 |
| `completed` | `{result_len, summary?}` | 作業役が `--result` / `--summary` を書き、タスクが `done` になりました。`summary` は 1 行目の受け渡しです（400 文字まで）。全文は実行の行にあります。受け渡しを持った状態で、一度も確保されていないタスクに `complete_task` が呼ばれると、`run_id` が何かを指せるよう、長さ 0 の実行が作られます。 |
| `blocked` | `{reason, kind, recurrences}` | 作業役か人が、タスクを `blocked` にしました。`kind` は止まった理由の種類です（`needs_input`、`capability`、`transient`、ふつうの中断なら `null`）。`recurrences` は解除の輪の数え上げです。一度も確保されていないタスクに `--reason` 付きで呼ばれたときは、長さ 0 の実行を作ります。 |
| `dependency_wait` | `{reason, kind}` | 作業役が `kind=dependency` で止まりました。ほかのタスクを待っているだけなので、`blocked` ではなく `todo` へ回ります（親の関門で待ち、自動で上がります）。人は要りません。 |
| `block_loop_detected` | `{reason, kind, recurrences, limit}` | タスクが同じ理由で `BLOCK_RECURRENCE_LIMIT` 回（既定 2）、解除されては止まりました。また `blocked` に落ちる代わりに——そこでは cron が解除し続けるだけなので——人が決められるよう `triage` へ回り、解除と再中断の輪を断ちます。 |
| `unblocked` | — | `blocked → ready`（親がまだ開いていれば `todo`）。手作業でも `/unblock` でも同じです。差配役の `consecutive_failures` は 0 に戻しますが、輪を断つしくみが覚えていられるよう `block_recurrences` はあえて残します。`run_id` は `NULL` です。 |
| `archived` | — | 既定の盤から隠れます。まだ走っていたタスクなら、そのついでに取り戻された実行の `run_id` を持ちます。 |

**手直し**（移り変わりではない、人による変更）。

| 種類 | 中身 | いつ |
|---|---|---|
| `assigned` | `{assignee}` | 担当が変わりました（外した場合も含みます）。 |
| `edited` | `{fields}` | 表題か本文が変わりました。 |
| `reprioritized` | `{priority}` | 優先度が変わりました。 |
| `status` | `{status}` | ダッシュボードのドラッグが状態を直に書きました（`todo → ready` など）。`running` から外したときに取り戻された実行の `run_id` を持ちます。それ以外では `run_id` は NULL です。 |

**作業役のようす**（仕事そのものではなく、実行のプロセスについて）。

| 種類 | 中身 | いつ |
|---|---|---|
| `spawned` | `{pid}` | 差配役が作業役のプロセスをうまく始めました。 |
| `heartbeat` | `{note?}` | 長い作業のあいだ、作業役が `hermes kanban heartbeat $TASK` で生きていることを知らせました。 |
| `reclaimed` | `{stale_lock}` | 完了のないまま確保の TTL が切れました。タスクは `ready` へ戻ります。 |
| `crashed` | `{pid, claimer}` | 作業役の PID がもういないのに、TTL はまだ切れていませんでした。 |
| `timed_out` | `{pid, elapsed_seconds, limit_seconds, sigkill}` | `max_runtime_seconds` を超えました。差配役が SIGTERM を送り（5 秒の猶予のあと SIGKILL）、並べ直しました。 |
| `stale` | `{elapsed_seconds, last_heartbeat_at, heartbeat_age_seconds, timeout_seconds, pid, terminated}` | タスクが `kanban.dispatch_stale_timeout_seconds`（既定 4 時間）より長く走り、かつ直近 1 時間に `kanban_heartbeat` が来ませんでした。差配役は同じホストの作業役があれば SIGTERM を送り、差し向け直すためにタスクを `ready` へ戻します。失敗の数え上げは増やしません（これは作業役の落ち度ではなく、差配役の側で不在を見つけただけです）。長く走る作業役は、これを避けるために少なくとも 1 時間に 1 回は `kanban_heartbeat` を呼んでください。 |
| `reconciled` | `{reason, claim_lock, claim_expires, worker_pid}` | 迷子のカードの立て直しです。そのカードは `running` なのに確保の帳面が壊れていて（`claim_lock` か `claim_expires` が NULL。確保の途中で落ちた、手で SQL を叩いた、DB を戻した、など）、生きている作業役もいないため、TTL・落ちた・止まったのどの道でも救えませんでした。差配役が説明のコメントを付けて `ready` へ並べ直しました。config.yaml の `kanban.reconcile_orphans` で切り替えます（既定は `true`）。 |
| `respawn_guarded` | `{reason}` | 差配役が、このティックではこの支度済みのタスクを立ち上げ直しませんでした。理由は `blocker_auth`（前回の失敗が使用量・認証・429 のエラー。制限の窓が開くのを待ちます）、`recent_success`（直近 1 時間にうまく終わった実行がある。走らせ直す前にレビューを待ちます）、`active_pr`（最近のコメントに GitHub の PR の URL がある。前の作業役がすでに PR を開いています）です。タスクは `ready` に留まり、次のティックでまた立ち上がる機会があります。元の状態が続けば、ふつうの `consecutive_failures` の遮断が、`failure_limit` 回の失敗のあと `gave_up` で自動的に止めます。 |
| `spawn_failed` | `{error, failures}` | 立ち上げが 1 回失敗しました（PATH が無い、作業場をつなげない、など）。数え上げが増え、タスクは再挑戦のために `ready` へ戻ります。 |
| `protocol_violation` | `{pid, claimer, exit_code, protocol_violation}` | タスクがまだ `running` なのに、作業役が正常に終了しました。たいていは `kanban_complete` も `kanban_block` も呼ばずに答えたからです。破りのたびに出ます（中身の `protocol_violation: true` の印は実行の情報へ写され、破りだけを数える再挑戦の持ち分に効きます）。持ち分の内なら——`_PROTOCOL_VIOLATION_FAILURE_LIMIT`（既定 3）回まで *続けての* 破り、タスクごとの `max_retries` があればそちらが優先——タスクはもう一度挑むために `ready` へ戻るだけです。続いた回数が上限に届くと、差配役は `gave_up` も出して自動的に止めます。 |
| `gave_up` | `{failures, effective_limit, limit_source, error}` | うまくいかない挑戦が N 回続いて、遮断が働きました。タスクは最後のエラーを添えて自動的に止まります。効く上限は、タスクの `max_retries`、次に差配役の `failure_limit` / `kanban.failure_limit`、最後に組み込みの既定の順で決まります。 |

`hermes kanban tail <id>` は、ひとつのタスクぶんを見せます。`hermes kanban watch` は盤ぐるみで流します。

## やらないこと {#out-of-scope}

かんばんは、あえて 1 台で動く作りです。`~/.hermes/kanban.db` は手元の SQLite のファイルで、差配役は同じ機械で作業役を立ち上げます。ひとつの盤を 2 台で共有する使い方は想定していません。「ホスト A の作業役 X、ホスト B の作業役 Y」をまとめる部品がありませんし、落ちたことを見つける道筋は PID が同じホストのものだと決めてかかっています。複数のホストが要るなら、ホストごとに独立した盤を動かし、`delegate_task` かメッセージの待ち行列で橋を渡してください。

## 設計の仕様 {#design-spec}

設計の全体——組み立て、同時実行の正しさ、ほかのしくみとの比べ合わせ、実装の計画、危うさ、残っている問い——は `docs/hermes-kanban-v1-spec.pdf` にあります。ふるまいを変える PR を出す前に、それを読んでください。
