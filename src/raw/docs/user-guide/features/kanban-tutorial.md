---
title: "かんばんの手引き"
description: ""
upstream_path: user-guide/features/kanban-tutorial.md
upstream_blob: 3e76e94da6a052627c446537462424ee3c4da1d9
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban-tutorial
---

# かんばんの手引き {#kanban-tutorial}

Hermes のかんばんが想定して作られた四つの使い方を、ダッシュボードをブラウザで開いた状態でひととおり歩いてみます。まだ[かんばんの概要](/hermes/docs/user-guide/features/kanban/)を読んでいなければ、そちらから始めてください。ここでは、作業（task）、実行（run）、担当（assignee）、割り振り役（dispatcher）が何かを知っている前提で進めます。

## 準備 {#setup}

```bash
hermes kanban init           # optional; first `hermes kanban <anything>` auto-inits
hermes dashboard             # opens http://127.0.0.1:9119 in your browser
# click Kanban in the left nav
```

**あなた**が全体を眺めるには、ダッシュボードがいちばん見やすい場所です。割り振り役が立ち上げるエージェントの作業役は、ダッシュボードも CLI も見ません。専用の `kanban_*` [ツール一式](/hermes/docs/user-guide/features/kanban/#how-workers-interact-with-the-board)（`kanban_show`、`kanban_list`、`kanban_complete`、`kanban_block`、`kanban_heartbeat`、`kanban_comment`、`kanban_attach`、`kanban_attach_url`、`kanban_attachments`、`kanban_create`、`kanban_link`、`kanban_unblock`）でボードを動かします。ダッシュボード、CLI、作業役のツールという三つの窓口は、いずれもボードごとの同じ SQLite の DB（既定のボードなら `~/.hermes/kanban.db`、あとから作ったボードなら `~/.hermes/kanban/boards/<slug>/kanban.db`）を通ります。だから、どちら側から変更しても、ボードの中身は食い違いません。

この手引きでは終始 `default` のボードを使います。プロジェクトやリポジトリや領域ごとに切り離した待ち行列がほしいときは、概要の[ボード（複数プロジェクト）](/hermes/docs/user-guide/features/kanban/#boards-multi-project)をご覧ください。CLI もダッシュボードも作業役の流れも、ボードごとに同じように使えますし、作業役は仕組みのうえでほかのボードの作業を見られません。

この手引きを通して、**`bash` と書かれたコードの塊は*あなた*が実行するコマンド**です。`# worker tool calls` と書かれた塊は、立ち上がった作業役のモデルが吐き出すツール呼び出しで、流れを端から端まで見せるために載せています。あなたが実行するものではありません。

## ボードをひと目で {#the-board-at-a-glance}

![かんばんのボードの全体像](https://hermes-agent.nousresearch.com/img/kanban-tutorial/01-board-overview.png)

列は左から右へ六つあります。

- **Triage** — まだ形になっていない思いつきです。既定では、割り振り役がここにある作業に**分解役**を自動でかけます。内蔵の分解役は `auxiliary.kanban_decomposer` を使い、あなたのプロファイルの顔ぶれと説明を読み、いちばん合う専門役へ振り分けた子の作業のつながりを作ります。元の作業は親として生かしたままなので、その担当（`kanban.orchestrator_profile`、未設定なら現在の既定のプロファイル）が、すべて終わったところで起き出して完了かどうかを見極めます。かんばんのページの上にある **Orchestration: Auto/Manual** の切り替えで、動き方を変えられます。Manual のときは、カードの **⚗ Decompose** を押すか、`hermes kanban decompose <id>` か `/kanban decompose <id>` を実行します。枝分かれの要らない単発の作業なら、**✨ Specify** が一度きりの仕様の書き直し（目標、進め方、受け入れの条件）をして `todo` へ上げます。モデルは `config.yaml` の `auxiliary.kanban_decomposer` と `auxiliary.triage_specifier` で設定します。かんばんの本編にある[自動と手動の使い分け](/hermes/docs/user-guide/features/kanban/#auto-vs-manual-orchestration)もご覧ください。
- **Todo** — 作られたものの、依存しているものを待っているか、まだ担当が決まっていないものです。
- **Ready** — 担当が決まり、割り振り役に取られるのを待っているものです。
- **In progress** — 作業役がいま実際に動かしているものです。「Lanes by profile」を有効にしていると（これが既定です）、この列は担当ごとにまとまるので、それぞれの作業役が何をしているかをひと目で見られます。
- **Blocked** — 作業役が人の判断を求めたか、繰り返しの遮断が働いたものです。
- **Done** — 終わったものです。

上の帯には、検索・テナント・担当の絞り込みに加えて、`Lanes by profile` の切り替えと `Nudge dispatcher` のボタンがあります。後者を押すと、常駐の次の周期を待たずに、いますぐ一回だけ割り振りが走ります。カードをクリックすると、右側に引き出しが開きます。

### 平らな表示 {#flat-view}

プロファイルごとのまとまりがうるさく感じたら「Lanes by profile」を切ってください。In Progress の列が、取られた時刻の順に並ぶひとつの平らな一覧になります。

![プロファイルごとのまとまりを切ったボード](https://hermes-agent.nousresearch.com/img/kanban-tutorial/02-board-flat.png)

## 物語 1 — ひとりで機能を仕上げる {#story-1-solo-dev-shipping-a-feature}

ある機能を作っているとします。よくある流れです。スキーマを設計し、API を実装し、テストを書く。親から子への依存でつながった三つの作業になります。

```bash
SCHEMA=$(hermes kanban create "Design auth schema" \
    --assignee backend-dev --tenant auth-project --priority 2 \
    --body "Design the user/session/token schema for the auth module." \
    --json | jq -r .id)

API=$(hermes kanban create "Implement auth API endpoints" \
    --assignee backend-dev --tenant auth-project --priority 2 \
    --parent $SCHEMA \
    --body "POST /register, POST /login, POST /refresh, POST /logout." \
    --json | jq -r .id)

hermes kanban create "Write auth integration tests" \
    --assignee qa-dev --tenant auth-project --priority 2 \
    --parent $API \
    --body "Cover happy path, wrong password, expired token, concurrent refresh."
```

`API` は `SCHEMA` を親に持ち、`tests` は `API` を親に持つので、最初に `ready` になるのは `SCHEMA` だけです。あとの二つは、親が終わるまで `todo` に座っています。これが依存にもとづく繰り上げの仕組みの働きで、テストを書く相手の API ができるまで、ほかの作業役がテストを書き始めることはありません。

割り振り役の次の周期で（既定は 60 秒、**Nudge dispatcher** を押せばすぐに）、`backend-dev` のプロファイルが作業役として立ち上がり、環境変数に `HERMES_KANBAN_TASK=$SCHEMA` が入ります。エージェントの中から見ると、作業役のツール呼び出しの流れはこう見えます。

```python
# worker tool calls — NOT commands you run
kanban_show()
# → returns title, body, worker_context, parents, prior attempts, comments

# (worker reads worker_context, uses terminal/file tools to design the schema,
#  write migrations, run its own checks, commit — the real work happens here)

kanban_heartbeat(note="schema drafted, writing migrations now")

kanban_complete(
    summary="users(id, email, pw_hash), sessions(id, user_id, jti, expires_at); "
            "refresh tokens stored as sessions with type='refresh'",
    metadata={
        "changed_files": ["migrations/001_users.sql", "migrations/002_sessions.sql"],
        "decisions": ["bcrypt for hashing", "JWT for session tokens",
                      "7-day refresh, 15-min access"],
    },
)
```

`kanban_show` は `task_id` の既定値に `$HERMES_KANBAN_TASK` を使うので、作業役は自分の id を知らなくてもかまいません。`kanban_complete` は要約とメタデータを今の `task_runs` の行へ書き、その実行を閉じ、作業を `done` へ移します。ここまでが `kanban_db` を通した、途中で割り込まれないひとつの手順です。

`SCHEMA` が `done` になると、依存の仕組みが `API` を自動で `ready` へ繰り上げます。API の作業役は、取りかかるときに `kanban_show()` を呼び、親の引き渡しに付いた `SCHEMA` の要約とメタデータを見ます。長い設計書を読み直さなくても、スキーマで何をどう決めたかが分かります。

ボードで終わったスキーマの作業をクリックすると、引き出しにすべてが出ます。

![ひとりで進める例 — 終わったスキーマの作業の引き出し](https://hermes-agent.nousresearch.com/img/kanban-tutorial/03-drawer-schema-task.png)

いちばん下の Run History の欄が肝心なところです。試行は一回、結果は `completed`、作業役は `@backend-dev`、所要時間、時刻、そして引き渡しの要約が丸ごと載っています。メタデータの塊（`changed_files`、`decisions`）も実行に紐づいて保存され、この親を読む下流の作業役に見えます。

同じ内容は、いつでも端末から確かめられます。次のコマンドは作業役ではなく、**あなた**がボードをのぞくためのものです。

```bash
hermes kanban show $SCHEMA
hermes kanban runs $SCHEMA
# #  OUTCOME       PROFILE       ELAPSED  STARTED
# 1  completed     backend-dev        0s  2026-04-27 19:34
#     → users(id, email, pw_hash), sessions(id, user_id, jti, expires_at); refresh tokens ...
```

## 物語 2 — たくさんの作業役に一気に刈らせる {#story-2-fleet-farming}

作業役が三つ（翻訳役、書き起こし役、コピー書き役）あり、互いに関係しない作業が山になっているとします。三つとも並行して引き取り、目に見えて進んでほしい。これはかんばんのいちばん素直な使い方で、もともとの設計がまさにこれを狙っていました。

作業を作ります。

```bash
for lang in Spanish French German; do
    hermes kanban create "Translate homepage to $lang" \
        --assignee translator --tenant content-ops
done
for i in 1 2 3 4 5; do
    hermes kanban create "Transcribe Q3 customer call #$i" \
        --assignee transcriber --tenant content-ops
done
for sku in 1001 1002 1003 1004; do
    hermes kanban create "Generate product description: SKU-$sku" \
        --assignee copywriter --tenant content-ops
done
```

あとはゲートウェイを立ち上げて、その場を離れるだけです。ゲートウェイの中には
割り振り役が組み込まれていて、同じ kanban.db 上にある三つの専門役の
プロファイルの作業を拾っていきます。

```bash
hermes gateway start
```

ここでボードを `content-ops` で絞り込むと（あるいは「Transcribe」で検索すると）、こう見えます。

![書き起こしの作業で絞り込んだ全体の眺め](https://hermes-agent.nousresearch.com/img/kanban-tutorial/07-fleet-transcribes.png)

書き起こしは二つが終わり、一つが動いていて、二つが次の周期を待っています。In Progress の列はプロファイルごとにまとまっているので（「Lanes by profile」の既定です）、混ざった一覧を目で追わなくても、それぞれの作業役がいま何をしているかが分かります。いま動いているものが終わり次第、割り振り役が次の待機中の作業を動かします。三つの常駐が三つの担当の山を並行して片づけるので、内容の待ち行列は人の手を借りずに空になっていきます。

**物語 1 で書いた構造化された引き渡しの話は、ここでもそのまま当てはまります。** 翻訳役が一件を終えるときは `kanban_complete(summary="translated 4 pages, style matched existing marketing voice", metadata={"duration_seconds": 720, "tokens_used": 2100})` のように吐き出します。集計にも、これに依存する下流の作業にも役立ちます。

## 物語 3 — 役割をまたぐ流れとやり直し {#story-3-role-pipeline-with-retry}

ここが、平らな TODO 一覧に対してかんばんが本領を出すところです。PM が仕様を書く。技術者が実装する。レビュー役が一回目を突き返す。技術者が直してもう一度出す。レビュー役が通す。

ダッシュボードを `auth-project` で絞り込んだ眺めです。

![複数の役割にまたがる機能の流れの眺め](https://hermes-agent.nousresearch.com/img/kanban-tutorial/08-pipeline-auth.png)

この画面は、**下流のカードをあらかじめ作っておく**やり方を使っています。実装のカードに、レビュー用の子カードが付いています。このやり方では、レビューの子カードが `todo` を出られるように、技術者は実装ができた時点で `kanban_complete` を呼ぶ必要があります。レビューを頼みたいというだけの理由で、実装の親を止めてはいけません。

同じカードが実装とレビューの両方を持つ進め方をしたいときは、代わりに一級の仕組みとして用意されているレビューの流れを使ってください。実装 → レビュー → 修正依頼 → 再レビューの段取りは、ひととおり書くとこうなります。

```python
# --- Engineer: first implementation attempt ---
kanban_show()
# (write code, run tests, prepare the candidate)
kanban_request_review(
    summary="implemented reset flow; candidate is ready for review",
    metadata={"changed_files": ["auth/reset.py"], "tests_run": 8},
    reviewer="reviewer",
)
# → the same card enters review; the implementation run closes as
#   outcome='review_requested'

# --- Reviewer: request concrete changes ---
kanban_show()
# (inspect the handoff and candidate)
kanban_request_changes(
    reason="Add password-strength validation and make reset tokens single-use."
)
# → the review run closes as outcome='changes_requested'; the card returns
#   to backend-dev in ready/todo without touching block-loop accounting

# --- Engineer: second implementation attempt ---
kanban_show()  # prior review evidence is in worker_context
# (apply feedback and re-run tests)
kanban_request_review(
    summary="added zxcvbn validation and single-use reset tokens",
    metadata={
        "changed_files": [
            "auth/reset.py",
            "auth/tests/test_reset.py",
            "migrations/003_single_use_reset_tokens.sql",
        ],
        "tests_run": 11,
        "review_iteration": 2,
    },
    reviewer="reviewer",
)

# --- Reviewer: approve ---
kanban_complete(summary="review passed; acceptance criteria verified")
# → done
```

この作業の実行の履歴には `review_requested → changes_requested → review_requested → completed` が残ります。試行ごとに、誰がやったか、要約、メタデータ、結果がそれぞれ付くので、二度目の技術者はレビュー役が何を突き返したのかをそのまま見られますし、最後に通した記録もあとから追えます。`kanban_block` は、本当に外部へ持ち上げるとき（権限が足りない、製品としての判断が要る、必要な基盤が使えない）のために取ってあります。ふつうのレビューの指摘には使いません。

画面のように下流のカードを分けるやり方をあえて選んだ場合、レビュー役は実装の親が終わってから `Review password reset PR` を開きます。

![レビュー役から見た流れの引き出し](https://hermes-agent.nousresearch.com/img/kanban-tutorial/09-drawer-pipeline-review.png)

レビュー役のカードの `worker_context` には、終わった実装の引き渡しが入っています。これはカードを分ける進め方なので、同じカードでの `kanban_request_review` と混ぜないでください。レビューの流れが二重になります。

## 物語 4 — 繰り返しの遮断と、落ちたあとの立て直し {#story-4-circuit-breaker-and-crash-recovery}

現実の作業役は失敗します。資格情報が無い、メモリ不足で殺される、一時的な通信の失敗。割り振り役には守りが二段あります。ひとつは**繰り返しの遮断**で、連続 N 回の失敗で自動的に止め、ボードがいつまでも空回りしないようにします。もうひとつは**落ちたことの検知**で、作業役のプロセスが持ち時間の前に消えたら、その作業を回収します。

### 繰り返しの遮断 — 直りそうにない失敗 {#circuit-breaker-permanent-looking-failure}

プロファイルの環境に `AWS_ACCESS_KEY_ID` が無いせいで、作業役を立ち上げられない配置の作業です。

```bash
hermes kanban create "Deploy to staging (missing creds)" \
    --assignee deploy-bot --tenant ops \
    --max-retries 3
```

割り振り役は作業役を立ち上げようとします。立ち上げは失敗します（`RuntimeError: AWS_ACCESS_KEY_ID not set`）。割り振り役は確保を解き、失敗の数を増やし、次の周期でまた試します。この例では `--max-retries 3` を付けているので、三回続けて失敗した時点で遮断が働き、作業は結果 `gave_up` として `blocked` へ移ります。このフラグを省くと、Hermes は `kanban.failure_limit`（既定は 2）を使います。人が止めを解くまで、もう再試行はしません。

止まった作業をクリックします。

![繰り返しの遮断 — spawn_failed が 2 回と gave_up が 1 回](https://hermes-agent.nousresearch.com/img/kanban-tutorial/11-drawer-gave-up.png)

実行は三つ、いずれも `error` の欄に同じエラーが入っています。最初の二つは `spawn_failed`（やり直せるもの）で、三つ目は `gave_up`（これで終わり）です。上のイベントの記録には、`created → claimed → spawn_failed → claimed → spawn_failed → claimed → gave_up` という流れが丸ごと出ています。

端末ではこうなります。

```bash
hermes kanban runs t_ef5d
# #   OUTCOME        PROFILE        ELAPSED  STARTED
# 1   spawn_failed   deploy-bot          0s  2026-04-27 19:34
#       ! AWS_ACCESS_KEY_ID not set in deploy-bot env
# 2   spawn_failed   deploy-bot          0s  2026-04-27 19:34
#       ! AWS_ACCESS_KEY_ID not set in deploy-bot env
# 3   gave_up        deploy-bot          0s  2026-04-27 19:34
#       ! AWS_ACCESS_KEY_ID not set in deploy-bot env
```

Telegram や Discord や Slack をつないであれば、`gave_up` のイベントでゲートウェイの通知が飛びます。ボードを見に行かなくても、止まったことに気づけます。

### 落ちたあとの立て直し — 作業役が途中で死ぬ {#crash-recovery-worker-dies-mid-flight}

立ち上げには成功したのに、そのあとで作業役のプロセスが死ぬこともあります。segfault、メモリ不足、`systemctl stop`。割り振り役は `kill(pid, 0)` で見張っていて、死んだ pid に気づきます。確保が解け、作業は `ready` へ戻り、次の周期で新しい作業役に渡されます。

見本のデータに入っている例は、メモリ不足を起こしていた移行の処理です。

```bash
# Worker claims, starts scanning 2.4M rows, OOM kills it at ~2.3M
# Dispatcher detects dead pid, releases claim, increments attempt counter
# Retry with a chunked strategy succeeds
```

引き出しには、二回ぶんの履歴が丸ごと出ます。

![落ちたあとの立て直し — crashed が 1 回と completed が 1 回](https://hermes-agent.nousresearch.com/img/kanban-tutorial/06-drawer-crash-recovery.png)

一回目は `crashed` で、エラーは `OOM kill at row 2.3M (process 99999 gone)`。二回目は `completed` で、メタデータに `"strategy": "chunked with LIMIT + WHERE id > last_id"` が入っています。やり直した作業役は一回目が落ちたことを文脈で見て、より安全なやり方を選びました。メタデータのおかげで、あとから見る人（あるいは振り返りを書く人）にも何を変えたのかがはっきり分かります。

## 構造化された引き渡し — `summary` と `metadata` が効く理由 {#structured-handoff-why-summary-and-metadata-matter}

ここまでのどの物語でも、作業役は最後に `kanban_complete(summary=..., metadata=...)` を呼んでいました。これは飾りではなく、仕事の段階と段階をつなぐ主たる引き渡しの経路です。

作業 B の作業役が立ち上がって `kanban_show()` を呼ぶと、返ってくる `worker_context` には次のものが入っています。

- B の**それまでの試行**（前の実行の結果、要約、エラー、メタデータ）。やり直す作業役が、失敗した道をもう一度たどらずに済みます。
- **親の作業の結果** — 親ごとに、いちばん新しく終わった実行の要約とメタデータ。下流の作業役が、上流の作業をなぜどう進めたのかを見られます。

これで、平らなかんばんにありがちな「コメントと成果物を掘り返す」踊りが要らなくなります。PM が仕様のメタデータに受け入れの条件を書けば、技術者の作業役は親の引き渡しの中でそれを構造のまま見ます。技術者がどのテストを走らせて何件通ったかを記録すれば、レビュー役の作業役は差分を開く前にその一覧を手にしています。

一括での完了に歯止めがあるのは、このデータが実行ごとのものだからです。`hermes kanban complete a b c --summary X`（あなたが CLI から実行するもの）は断られます。同じ要約を三つの作業へ貼り付けるのは、たいてい正しくありません。引き渡しのフラグを付けない一括の完了は、「事務的な作業をまとめて片づけた」というよくある場面のために残してあります。ツールの側にはそもそも一括の変種がなく、`kanban_complete` は同じ理由でつねに一件ずつです。

## 終わったカードのあと始末 — 親のつながりで CI を直す {#follow-up-on-a-done-card-ci-remediation-via-the-parent-link}

物語 1 の実装のカードは `done` です。二時間後、取り込んだ枝で CI が落ちました。終わったカードを開き直さないでください。終わったカードは履歴であり、その引き渡しは前へ流れていくものです。終わったカードを**親**にして、直すためのカードを作ります。

```bash
hermes kanban create "Fix CI: test_backoff_jitter flakes on 3.11" \
    --assignee backend-dev \
    --parent t_impl \
    --workspace worktree --branch wt/ci-fix-backoff \
    --body "CI run #4812 failed after t_impl completed.
FAILED tests/test_retry.py::test_backoff_jitter - TimeoutError
Acceptance: tests/test_retry.py green on 3.11 and 3.12."
```

これがうまく働く理由は三つあります。

- **すぐ割り振られます。** 親がすでに `done` なので、子は最初から `ready` で作られます。割り振り役は次の周期で取れます。（まだ開いている親の子なら `todo` で待ちます。）
- **文脈を受け継ぎます。** 直すための作業役の文脈には *Parent task results* の欄があり、`t_impl` の完了の要約とメタデータ、つまり元の作業役が記録した変更したファイルと決めごとが載っています。コードを一行も読む前に、なぜそういう形になっているのかが分かります。
- **新しい証拠は本文に書きます。** CI の記録は `t_impl` が終わった時点では存在しなかったので、親の引き渡しには入りません。だから、はっきりした受け入れの条件と一緒に、新しいカードの本文に書きます。

直すためのカードには、新しい worktree と枝を用意するのがよいでしょう。元の枝をそのまま出すと、作業役はリポジトリの*状態*は得られますが、*なぜそうしたのか*は得られません。それを運ぶのは親の引き渡しです。担当のプロファイルは同じで問題ないことが多いです。そのコードを書いたプロファイルには、それを直す腕もあります。

## いま動いている作業をのぞく {#inspecting-a-task-currently-running}

念のため、まだ進行中の作業の引き出しも見ておきます（物語 1 の API の実装で、`backend-dev` が取ったもののまだ終わっていません）。

![取られて進行中の作業](https://hermes-agent.nousresearch.com/img/kanban-tutorial/10-drawer-in-flight.png)

状態は `Running` です。動いている実行は Run History の欄に出ていて、結果は `active`、`ended_at` はまだありません。この作業役が死んだり時間切れになったりすると、割り振り役はこの実行をそれに応じた結果で閉じ、次に取られたときに新しい実行を開きます。試行の行が消えることはありません。

## 次にすること {#next-steps}

- [かんばんの概要](/hermes/docs/user-guide/features/kanban/) — データの構造、イベントの語彙、CLI の一覧をひととおり。
- `hermes kanban --help` — すべてのサブコマンドと、すべてのフラグ。
- `hermes kanban watch --kinds completed,gave_up,timed_out` — ボード全体の終了のイベントを、端末で流しっぱなしに見ます。
- `hermes kanban notify-subscribe <task> --platform telegram --chat-id <id>` — ある作業が終わったときに、ゲートウェイから知らせを受け取ります。
