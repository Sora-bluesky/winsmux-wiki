---
title: "サブエージェントへの委任"
description: "delegate_task で独立した子エージェントを起動し、作業を並行して進めます"
upstream_path: user-guide/features/delegation.md
upstream_blob: a53ad1ede5d6ec7d5933b86ca99261d47ca799a0
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/delegation
---

# サブエージェントへの委任 {#subagent-delegation}

`delegate_task` ツールは、独立した文脈と、受け継いだツールの権限と、自分専用のターミナルセッションを持つ子の AIAgent を起動します。子はそれぞれ新しい会話から始まり、独立して働きます。親の文脈に入るのは、その最終的なまとめだけです。

最上位からのモデルの呼び出しは、自動的にバックグラウンドで動きます。Hermes はすぐに受け取り札を返すので会話を続けられ、結果はあとから新しいメッセージとして戻ってきます。取りまとめ役のサブエージェントは、自分の配下のワーカーを待ちます。結果をまとめてから返す必要があるからです。

## 完了の届け方 {#completion-delivery}

メッセージ系のゲートウェイがバックグラウンドの完了を受け取ったと認めるのは、そのアダプタが
実際にイベントを予定に入れるか、セッションの待ち行列へ差し込んだあとです。ハンドラが無い、
セッションの経路が食い違う、待ち行列がいっぱい、といった場合、完了は保留のまま再試行に回ります。
こうした受け入れの拒否は、確実な配信試行の回数を消費しません。受け入れに成功すると、動いている
ゲートウェイの中では重複した配信が抑えられますが、それはモデルのターンや外向きの返信が終わった
証拠ではありません。異常終了や再起動をまたぐ配信は、これまでどおり少なくとも 1 回は行われ、
既存の再送の期限に従います。実際の通信の失敗には、これまでどおり上限のある再試行が働きます。

API サーバーの経路が使えないときは、経路が無いという警告を繰り返さずに保留のままになります。
形の壊れたメッセージの経路については、これまでどおり診断が出ます。API サーバー上では、非同期の
委任の完了は、確実に残るタイムラインの配信行を足すだけです。次のモデルのターンはクライアントが
持ちます。バックグラウンドのプロセス通知を `off` にしていても、パターン監視のイベントは静かに
消化されます。

## バックグラウンドプロセスの寿命 {#background-process-lifetime}

バックグラウンドのターミナルのプロセスは、それを起動したエージェントのものです。委任の後片付けで子を閉じると、その子に残っているプロセスは、前のターンで始めた作業も含めて終了します。親や兄弟のエージェントが持つプロセスは止まりません。ターミナルの環境を共有していても、プロセスの所有権は移りません。

子は、最終的なまとめを返す前に、自分のビルドやテスト、その他の終わりのあるバックグラウンドのコマンドを待つべきです。子が終わったあとも続いてほしい CI の見張りやサーバーは、親のセッションで起動してください。プロセス ID を返しても、所有権が親へ移るわけではありません。

## タスク 1 つ {#single-task}

```python
delegate_task(
    goal="Debug why tests fail",
    context="Error: assertion in test_foo.py line 42"
)
```

## まとめて並列に {#parallel-batch}

既定では同時に最大 10 個のサブエージェントが動きます（設定で変えられ、上限はありません）。

```python
delegate_task(tasks=[
    {"goal": "Research topic A", "context": "Focus on recent primary sources"},
    {"goal": "Research topic B", "context": "Compare the leading explanations"},
    {"goal": "Fix the build", "context": "Project root: /home/user/project"}
])
```

## 出力の型を決める（`output_schema`） {#structured-output-outputschema}

タスクにはそれぞれ、任意で `output_schema` を持たせられます。子の最終的な回答が満たすべき JSON Schema のオブジェクトです。子は最初にこのスキーマを出力の約束（「JSON の値だけを返すこと。説明文もコードフェンスも付けない」）として受け取り、回答が返ってきたときに親が検証します。検証に失敗した場合、親は子に、検証エラーをそのまま載せた 1 回きりの修正のターンを渡します（スキーマを貼り直しはしません）。そのタスクの結果には `schema_valid`（true / false）が加わり、失敗したときは `schema_errors` も付きます。

やり直しのあとも約束を満たせなかった場合でも、子の作業は **捨てられません**。結果は `status: completed` のままで、`summary` に子の最終的な生の文章が入り、`schema_valid: false`、`schema_errors`、それに文章が未検証であることを示す `schema_note` が付きます。親は、1 時間かかったかもしれないタスクをやり直す代わりに、生の文章から必要なものを取り出します。中身が正しい JSON（オブジェクトでも配列でも）であれば、前後に説明文やコードフェンスが付いていても、検証では許容されます。

```python
delegate_task(
    tasks=[{
        "goal": "Check which of these three endpoints return 200",
        "context": "https://a.example, https://b.example, https://c.example",
        "output_schema": {
            "type": "object",
            "properties": {
                "healthy": {"type": "array", "items": {"type": "string"}},
                "failing": {"type": "array", "items": {"type": "string"}}
            },
            "required": ["healthy", "failing"]
        }
    }]
)
```

スキーマは緩めにしておいてください。必須にするのは、実際に読む項目だけにします。`output_schema` を持たないタスクには影響しません。

## サブエージェントの文脈はどうなっているか {#how-subagent-context-works}

:::warning 重要: サブエージェントは何も知らない
サブエージェントは**まったく新しい会話**から始まります。親の会話履歴も、それまでのツールの呼び出しも、委任の前に話していたことも、いっさい知りません。サブエージェントが持つ文脈は、親のエージェントが `delegate_task` を呼ぶときに書き込んだ `goal` と `context` の中身だけです。
:::

例外がひとつあります。親に確定した作業ディレクトリがあるとき、どのサブエージェントのシステムプロンプトにも、その作業ディレクトリの**プロジェクトの文脈ファイル**が埋め込まれます（`.hermes.md` > AGENTS.md の連鎖 > CLAUDE.md > `.cursorrules` の順で、探し方も優先順位も大きさの上限も、メインのエージェントのシステムプロンプトと同じです。SOUL.md は除きます）。リポジトリの中で働くサブエージェントは、そのリポジトリの決まりごとを自分で探し直さなくても、それに従って動けます。

つまり親のエージェントは、サブエージェントに必要なものを**すべて**呼び出しに載せなければなりません。

```python
# BAD - subagent has no idea what "the error" is
delegate_task(goal="Fix the error")

# GOOD - subagent has all context it needs
delegate_task(
    goal="Fix the TypeError in api/handlers.py",
    context="""The file api/handlers.py has a TypeError on line 47:
    'NoneType' object has no attribute 'get'.
    The function process_request() receives a dict from parse_body(),
    but parse_body() returns None when Content-Type is missing.
    The project is at /home/user/myproject and uses Python 3.11."""
)
```

サブエージェントは、あなたの goal と context から組み立てられた、焦点の絞られたシステムプロンプトを受け取ります。そこには、タスクを終わらせたうえで、何をしたか、何が分かったか、変更したファイル、ぶつかった問題を、決まった形のまとめとして返すよう書かれています。

### サブエージェントに画像を渡す {#forwarding-images-to-a-subagent}

ユーザーが送ってきたスクリーンショット、デザインのモック、描画されたグラフのように、タスクそのものが目で見る性質のものだと、文字の context だけでは足りません。各タスクには、任意で `images` の一覧を渡せます（最大 8 件。手元のファイルパス、`http(s)` の URL、`data:image/...` の URL が使えます）。

```python
delegate_task(tasks=[{
    "goal": "Compare the rendered dashboard against the design mock and list layout deviations",
    "context": "The app runs at http://localhost:3000; the repo is at /home/user/dash.",
    "images": ["/home/user/mocks/dashboard-v2.png",
               "https://cdn.example.com/current-render.png"],
}])
```

渡し方は、ユーザーが添付した画像と同じ振り分け（`agent.image_input_mode`）に従います。

- **画像を読める子モデル**の場合: 画像は子の最初のターンで、そのままのマルチモーダルの内容として届きます。手元のファイルは data URL として埋め込まれ（ほかのファイル読み込みと同じ読み取りの防壁がかかります）、リモートの URL と `data:` の URL は手を加えずに渡されます。子は実際の画素を見ることになります。
- **画像を読めない子モデル**の場合: goal に `[Image attached at: <path>]` という手がかりの行が足され、子には `vision_analyze` で中身を確かめるよう指示されます。

画像の受け渡しは「できる範囲で」の扱いです。読めないパスはログに 1 行残して飛ばされ、画像まわりの処理がどこかで失敗しても、画像なしの文字だけの goal に戻ります。子の起動が画像のせいで失敗することはありません。画像は子が*目で見る*必要のあるものに使い、文字のファイルのパスはいつもどおり `context` に書いてください。

## 実際の例 {#practical-examples}

### 並行して調べる {#parallel-research}

複数の題材を同時に調べて、まとめを集めます。

```python
delegate_task(tasks=[
    {
        "goal": "Research the current state of WebAssembly in 2025",
        "context": "Focus on: browser support, non-browser runtimes, language support"
    },
    {
        "goal": "Research the current state of RISC-V adoption in 2025",
        "context": "Focus on: server chips, embedded systems, software ecosystem"
    },
    {
        "goal": "Research quantum computing progress in 2025",
        "context": "Focus on: error correction breakthroughs, practical applications, key players"
    }
])
```

### レビューして直す {#code-review-fix}

レビューと修正の流れを、まっさらな文脈に任せます。

```python
delegate_task(
    goal="Review the authentication module for security issues and fix any found",
    context="""Project at /home/user/webapp.
    Auth module files: src/auth/login.py, src/auth/jwt.py, src/auth/middleware.py.
    The project uses Flask, PyJWT, and bcrypt.
    Focus on: SQL injection, JWT validation, password handling, session management.
    Fix any issues found and run the test suite (pytest tests/auth/)."""
)
```

### 複数ファイルの書き換え {#multi-file-refactoring}

親の文脈をあふれさせるような大きな書き換えを任せます。

```python
delegate_task(
    goal="Refactor all Python files in src/ to replace print() with proper logging",
    context="""Project at /home/user/myproject.
    Use the 'logging' module with logger = logging.getLogger(__name__).
    Replace print() calls with appropriate log levels:
    - print(f"Error: ...") -> logger.error(...)
    - print(f"Warning: ...") -> logger.warning(...)
    - print(f"Debug: ...") -> logger.debug(...)
    - Other prints -> logger.info(...)
    Don't change print() in test files or CLI output.
    Run pytest after to verify nothing broke."""
)
```

## まとめて動かすときの詳細 {#batch-mode-details}

最上位のエージェントが `tasks` の配列を渡すと、Hermes はバックグラウンドの受け取り札をひとつ返し、サブエージェントを並列に走らせます。既定では、すべてのタスクが終わったあとに、まとまったメッセージが**ひとつ**返ります。結果が届くのは親のターンとターンの間だけなので、親は子に依存しない作業を片付けたうえで、記録や成果物や CI を見に行き続けるのではなく、自分のターンを終えるべきです。

### 個別に結果を受け取る（選んで有効に） {#independent-completions-opt-in}

`delegation.independent_completions: true` にすると、結果は**完了の単位ごと**に、終わったそばから届くようになります。モデルに見える `group` の項目と、グループ分けの案内は、この設定を有効にしたときだけ提示されます。設定を変えたら新しいセッションを始めてください。既存の会話のキャッシュされた前置きを変えずに、ツールのスキーマへ設定を反映させるためです。`group` を含む従来の呼び出しはそのまま受け付けます。この設定が無効なら、呼び出し全体はこれまでどおりまとめて返ります。

個別の完了を有効にしたときは、次のようになります。

- それぞれの結果を別々に扱えばよいときは、`group` を省きます。タスクは終わり次第、個別に報告されます。
- 出力をまとめて見たいとき — 比較、統合、ひとつの判断へまとめるとき — は、同じ `group` の文字列を使います。グループは、その中のタスクがすべて終わったあとに、まとまったメッセージを**ひとつ**返します。それぞれ独立に実行できるタスクでも、結果が同じ判断の材料になるなら、ひとつのグループにまとめて構いません。
- 別のグループどうしは独立して報告されます。グループ分けしたタスクとしていないタスクを、ひとつの呼び出しに混ぜられます。

これが既定で無効なのは、単位のひとつひとつが取りまとめ役にとって新しいターンになるからです。15 個のタスクの呼び出しは最大 15 回の目覚めになり、長い作業をこま切れにしてしまいました。グループ分けが決めるのは**結果の届き方であって、実行の順番ではありません**。タスクはどれも並列に走ります。タスク B がタスク A の出力を必要とするなら、まず A を投げ、A が返ってからその出力を添えて B を投げてください。

```json
{"tasks": [
  {"goal": "Review PR #101 ..."},
  {"goal": "Review PR #102 ..."},
  {"goal": "Benchmark approach A ...", "group": "bench"},
  {"goal": "Benchmark approach B ...", "group": "bench"}
]}
```

投入時の受け取り札には、単位ごとの情報（`units[].delegation_id`、`group`、`task_indexes`）が並びます。単位の ID は呼び出しの ID に `-1`、`-2`、… を付けたもので、ひとつの呼び出しのすべての単位が `delegation.max_concurrent_children` の枠をひとつ共有します。つまりグループ分けが同時実行数の勘定を変えることはありません（ワーカーのプールは生きている単位の数まで広がるので、いっぱいのプールの後ろで待つ単位は出ません）。取りまとめ役のサブエージェントは、いまのターンの中で自分の束すべてを待ち、結果をまとめます。

- **同時実行の上限:** 既定で 10 タスクです（`delegation.max_concurrent_children` か、`DELEGATION_MAX_CONCURRENT_CHILDREN` 環境変数で変更できます。下限は 1 で、上限はありません）。上限を超える束は、黙って切り詰められるのではなく、ツールのエラーを返します。
- **スレッドプール:** 設定した同時実行の上限を最大ワーカー数として、`ThreadPoolExecutor` を使います
- **進み具合の表示:** CLI では、各サブエージェントのツール呼び出しがツリー表示でその場で見え、タスクごとの完了行も出ます。ゲートウェイでは、進み具合はまとめられて親の進捗コールバックへ中継されます。CLI と TUI の完了の知らせは、`Subagent Task Completed: Review changes` のようにタスクを先に置いた見出しになります。複数タスクのグループでは、グループ名とタスク数を使います。うまくいかなかった、あるいは終わりきらなかった作業には、それに応じた状態のラベルが付きます。この短い知らせは、親のエージェントへ届く完全な結果の代わりではありません。
- **結果の並び:** ひとつの単位の中では、終わった順番にかかわらず、入力の順に合わせてタスクの番号で並べ替えられます。`TASK i/N` のラベルは呼び出し全体を通した番号です
- **中止:** 続けて送ったメッセージで、最上位のバックグラウンドの束が止まることはありません。`/stop`（ゲートウェイの `/stop`、CLI の `/stop`、Desktop / TUI の停止ボタン、ACP のキャンセル）か、持ち主のセッションを閉じる・リセットすると、そのバックグラウンドの子と、その下で同期的に動く子孫がすべて終わります。止められた子はそれぞれ、`status="interrupted"` と途中までの出力を持った完了として返ります

取りまとめ役からのタスク 1 つの同期的な委任は、スレッドプールを経由せずそのまま走ります。

### 確実に残るバックグラウンドの完了 {#durable-background-completions}

バックグラウンドの委任が終わると、Hermes はその完了イベントを、いつもの新しいターンの
待ち行列へ流す前に、いま使っているプロファイルの `state.db` に保存します。完了したあと、
届ける前に Hermes が再起動しても、保留のイベントは復元され、同じ所有権のチェックを
通って流れます。取り合う受け手は確実な引き受けを使うので、その仮のターンを受け取れた
受け手だけが配信を認め、失敗した試みは引き受けを解放して再試行に回します。

これは、異常終了のあとに子の実行を再開するものではありません。まだ動いている途中で持ち主の
プロセスが消えた委任は `unknown` として記録されます。外部への副作用が起きたかどうかを
Hermes が証明できないからです。保留の記録も配信済みの記録も、件数に上限があり、
プロファイルの中に閉じています。

### 子のバックグラウンドプロセスの通知 {#child-background-process-notifications}

サブエージェントが起動したバックグラウンドのプロセス（`notify_on_complete` を付けた
`npm ci` など）は、仕組みのうえでは完了とパターン監視の通知を**親**の会話へ流します。
子より長く生きるものには、しっかりした受け手が要るからです。ただし既定では、そうした通知は
親のチャットでは**抑えられます**。届けるべきものは子のまとまった委任の結果であって、
子の内部のビルドから出る「処理が終わりました」の壁が会話の途中に立つのは雑音だからです。
抑えられたイベントは、プロセスのセッション ID とサブエージェントのタスク ID とともに
debug レベルで記録されるので、調べることはできます。

委任の結果そのものが抑えられることはありません。子のプロセスの通知を届くように戻すには
（それぞれに「Started by subagent …」という出どころの行が付きます）、次のようにします。

```yaml
delegation:
  surface_child_process_notifications: true   # default: false
```

### プロセスを親へ引き渡す {#handing-a-process-to-the-parent}

サブエージェントのバックグラウンドのプロセスは、**サブエージェントが終わると同時に終了させられます**。そのため、子が `notify=true` で起動した CI の見張りやビルドは、誰にも報告できません。子の `terminal` の結果にはそのことが書かれており（`notify_on_complete: false` と `subagent_note`）、子には終わる前に取れる正直な選択肢が 3 つあります。

- **待つ** — `process_manage(action="wait", session_id=...)` で待ち、結果を自分で報告する
- **止める** — `process_manage(action="kill", ...)`
- **引き渡す** — `process_manage(action="handoff", session_id=..., data="<one sentence: what it is for>")`。実行環境が、レジストリのロックの下で所有権を親へ移します（子 1 つにつき最大 3 件。受け付けるのは、その子が持っている動作中のプロセスだけで、それ以外はツールのエラーになります）。すると親の完了の知らせが `Handed off to you by a subagent… Purpose: …` とともに親のチャットへ届き、親は自分のものと同じように様子を見たり、ログを読んだり、止めたりできます。

子がまだ動いているうちに終わったプロセスには、引き渡しは要りません。子がそれを読んで（`poll` / `wait` / `log`）報告すればよいのです。子が読まなかった場合、終了コードと出力の末尾が `unread_completions` として子の結果に添えられ、親に見えます。止めも引き渡しもせずに動き続けているものは、その結果（`orphaned_processes`）と親への委任の知らせに、終了させられたものとして名前が挙がります。ですから親は、「見張りは動いています」がもう本当ではないことを、子の文章からではなく実行環境から知ることになります。CI の見張りについては、やはり、子は事実（PR 番号、SHA）を返し、親が自分の見張りを立てる、という形のほうが良いやり方です。

## モデルの上書き {#model-override}

`config.yaml` で、サブエージェントに別のモデルを設定できます。簡単なタスクを、より安く速いモデルに任せたいときに便利です。

```yaml
# In ~/.hermes/config.yaml
delegation:
  model: "google/gemini-flash-2.0"    # Cheaper model for subagents
  provider: "openrouter"              # Optional: route subagents to a different provider
```

省略すると、サブエージェントは親と同じモデルを使います。

### 費用の戦略: 計画は最上位のモデル、作業は安いモデル {#cost-strategy-frontier-planner-inexpensive-workers}

問題を、きちんと仕様の決まった小さな作業へ切り分けるには、最上位の判断力が要ります。一方、はっきりした目標と十分な文脈と出力の約束が揃った小さな作業をこなすほうには、ふつうそこまで要りません。そしてトークンを使うのは子のほうです。並列に走らせたサブエージェントの束が、実行全体のトークンの大半を消費するのがふつうなので、費用がかかっているのはワーカー側のモデルです。メインのセッションは最上位のモデルのままにしつつ、`delegation.model` を安いモデルに固定すれば、計画の質は要るところに残したまま、量の出るところで費用を削れます。

```yaml
# ~/.hermes/config.yaml
model:
  default: "your-frontier-model"     # parent (planner) stays on the frontier model
delegation:
  model: "your-inexpensive-model"    # all delegate_task children run on this
  provider: "openrouter"             # optional: route children to a different provider
```

解決の順番は、まず `delegation.base_url`（直接の接続先）が優先され、次に `delegation.provider`（実行時のプロバイダの仕組みで解決される、資格情報一式）が使われ、どちらも設定していなければ子は親のプロバイダと資格情報を受け継ぎます。`delegation.model` はどの場合にも効き、これが空なら子は親のモデルを受け継ぎます。`delegation.base_url` と一緒に `delegation.provider` を設定すると、明示した接続先はそのままに、そのプロバイダのリクエストの上書きと最大出力トークン数が子に引き継がれます。明示的な `delegation.request_overrides` の辞書は、どの分岐でも尊重され、実行時に導かれた値の上へ重なります（後述の[設定](#configuration)を参照）。

なお、この固定は全体に効きます。`delegate_task` にはタスクごとのモデルの指定がないので、束の中のどの子も、設定した委任用のモデルで動きます。もっと強いモデルが要る、質にこだわる小作業には、そのセッションでは `delegation.model` を設定しないでおくか、その作業を[かんばんボード](/hermes/docs/user-guide/features/kanban/#per-task-model-override)へ回してください。そちらはタスクごとのモデルの上書きに対応しています。

## `/review` コマンド {#the-review-command}

`/review` は、独立した、権限をすべて持つバックグラウンドのサブエージェントを起動します。その仕事はただひとつ、あなたの会話がいま作り出したもの — PR、差分、コード、ドキュメント、設計 — をレビューすることです。CLI、TUI、デスクトップアプリ、そしてゲートウェイのすべてのメッセージ系プラットフォームで使えます。

```
/review                       # review whatever the last 10 messages presented
/review focus on security     # add extra instructions for the reviewer
```

起きることは次のとおりです。

1. 直近 10 件の利用者・アシスタントのメッセージが、レビュー役の出発点となる材料として切り取られます（ツールの出力とシステムのメッセージは除きます）。
2. レビュー役のサブエージェントが、`delegate_task` と同じバックグラウンドの委任の経路で投入されます。通常のサブエージェントのツール一式（ターミナル、ウェブ、ファイル、ブラウザ…）をすべて持つので、抜粋だけで判断するのではなく、実際に PR を開き、差分を読み、コードを動かします。
3. レビュー役は、主となるエージェントの作業の文脈を受け継ぎます。主エージェントが読み込んでいたスキル（起動時に読み込んだものも、セッション中に `skill_view` で読んだものも）は、それを読み込んだうえでその決まりごとに照らして判断するように、という指示とともに、レビュー役への説明の中で名前を挙げられます。ほかのサブエージェントと同じく、そのシステムプロンプトにも作業ディレクトリのプロジェクトの文脈ファイル（AGENTS.md / CLAUDE.md / .cursorrules）が、守るべき決まりごととして埋め込まれます。
4. 終わると、そのレビューの全文が、通常のバックグラウンドのサブエージェントの完了として同じセッションへ戻ります。主エージェントはそれを見て、指摘を直す、追いの変更を出す、あなたに返事をする、といった行動が取れます。

いちばんきれいな流れはこうです。メインのエージェントが PR を出し、あなたが `/review` と打つと、あなたが作業を続けている間に、もうひとつの目がそれを調べます。レビューは、PR を作ったエージェント宛てにチャットへ戻ってきます。

投入時に表示されるのは “Review started. Results will return here.” だけです。動いているサブエージェントの表示では、このワーカーは **Review: your focus**（引数なしの `/review` なら **Review recent work**）として、短い 1 行のラベルで示されます。レビュー役自身はあなたの指示を全文受け取っています。従来型の CLI では、入力欄の上のドックに経過時間と直近の動きが出ます。**Ctrl+T**（または **F6**）で一覧が開き、モデル、記録、指示の差し込み、停止の操作ができます。同じレビューのラベルは、TUI とデスクトップのサブエージェント表示にも出ます。

### レビュー用のモデル {#review-model}

既定では、レビュー役はあなたのメインのモデルで動きます。レビュー専用のモデルを固定するには、`config.yaml` に `auxiliary.review` を設定します。

```yaml
auxiliary:
  review:
    provider: openrouter               # or nous, anthropic, a direct base_url, ...
    model: anthropic/claude-opus-4.6   # a strong reviewer model
```

資格情報は `delegation.provider` の固定とまったく同じように解決されます（base_url、api key、api_mode を含む、実行時のプロバイダ一式）。`model` を空にしたうえでの `provider: auto` は「メインのエージェントのモデルを受け継ぐ」という意味で、これが既定です。

`/review` は `/refine` とは意図して分けてあります。`/refine` は、記憶とスキルを更新するために会話をレビューします。`/review` は、その会話が作り出した*成果物*をレビューします。

## 受け継ぐツールの権限 {#inherited-tool-access}

`delegate_task` には、モデルから指定できる `toolsets` のパラメータがありません。サブエージェントはそれぞれ親の有効なツールセットを受け継ぐので、親が持っていない能力をモデルが子に与えることはできません。委任する作業に別の能力が要るなら、会話を始める前に親のツールを設定してください。

親が持っていても、サブエージェントには塞がれているツールがあります。
- `delegate_task` — 末端のサブエージェント（既定）では塞がれます。`role="orchestrator"` の子には残り、`max_spawn_depth` で区切られます。後述の[深さの上限と入れ子の取りまとめ](#depth-limit-and-nested-orchestration)を参照してください。
- `clarify` — サブエージェントは利用者とやり取りできません
- `memory` — 共有の記憶へは書き込めません
- `send_message` — プラットフォームをまたぐ副作用は起こせません
- `cronjob` — 親の名前でさらに作業を予約することはできません

どちらの役割でも `execute_code`（プログラムからのツール呼び出し）は残るので、子は機械的な作業をまとめて片付けられます。

## 繰り返しの上限 {#max-iterations}

サブエージェントにはそれぞれ、ツールを呼ぶターンを何回まで取れるかの上限（既定は 250）があります。この上限は `config.yaml` で全体に設定し、すべての子に効きます。`delegate_task` の呼び出しごとのパラメータではありません。

```yaml
# In ~/.hermes/config.yaml
delegation:
  max_iterations: 60   # lower it for fleets of simple tasks, raise it for long investigations
```

予算を使い切った子は `exit_reason: max_iterations` と `truncated: true` を付けて返るので、親は予算切れで止まったのか、タスクを終えたのかを見分けられます。

## 子のタイムアウト {#child-timeout}

既定では、サブエージェントに**実時間のタイムアウトはありません**。子が失敗するのは、実際にやっていることが原因のとき — API のエラー、ツールのエラー、繰り返しの予算切れ — だけで、委任の層のストップウォッチで死ぬことはありません。以前のリリースには固い上限（300 秒、のちに 600 秒）があり、それが正当に忙しい子を作業の途中で殺し続けていました。深いコードレビュー、大きく広げた調査、推論の遅いモデルは、ずっと着実に進んでいるのに 10 分を超えることがふつうにあります。

本当に詰まっている子は、上限を設定していてもいなくても、どの実行環境でも見つけられます。心拍の停滞監視が、子ごとに進んでいるしるし（API の呼び出し、ツールの開始、活動時刻の更新）を見ています。進み具合が完全に止まったまま停滞のしきい値を超えた子は — 応答の合間なら 450 秒、ツールの中にいるなら 1200 秒 — 中断され、その待ちは**打ち切られます**。親には `status: "timeout"` の項目が返り、そのエラーには `Subagent stopped making progress after N API call(s) — no activity for 450s (heartbeat stale threshold); the pending worker was abandoned.` と書かれます。ゲートウェイの無反応監視が後ろにいない一度きりの実行（`hermes chat -Q`、Bot Chat の一度きりの実行、cron）でも待ちは終わるので、動かなくなった子がそのターンやセッションの占有をいつまでも握り続けることはなくなりました。モデルの応答待ちは進んでいるうちに入ります。サブエージェントはプロバイダを待っている間も活動の時計を更新するので、遅いローカルモデルや長い前処理の応答が止まっていると見なされることはありません。

それでも上限が欲しい場合（たとえば cron 起点の無人の委任で費用を抑えたいとき）は、環境ごとに選んで有効にできます。

```yaml
delegation:
  child_timeout_seconds: 0     # default: 0 = no timeout
  # child_timeout_seconds: 1800  # opt-in inactivity cap (floor 30s)
```

正の値で区切られるのは**全体の実行時間ではなく、無活動の時間**です。子が進んだしるしを何も見せないまま（API の呼び出しが完了しない、ツールが変わらない、活動の時計が進まない）いられる最長の時間で、これを過ぎると打ち切られます。進んだしるしが出るたびに時間枠は最初からになるので、何分もかかる応答を待っている子 — 以前は終わった作業を失っていたケース — が長くかかったという理由で止められることはありません。一方で、本当に動かなくなった子は引き続き捕まえます（処理中のリクエストは、それとは別に呼び出しごとの停滞監視が上限を設けています）。`0` か負の値なら上限は無効です。どちらの場合でも、下の心拍の停滞監視は働き続けます。

無活動の時間枠の約 80% に達すると、子は操縦用の経路を通じて 1 行の `[delegation budget warning]` を受け取ります（次の反復の区切りで届きます）。どれだけ無活動が続いたかと、いますぐ要約を返すようにという内容です。遅くても立て直せる子が、文脈を失わずに作業をまとめられるようにするためです。警告は 1 つの時間枠につき 1 回だけ出て、進み始めるとまた出せる状態に戻ります。

設定した上限か停滞のしきい値が働いたとき、子の結果にはエラーメッセージと並んで、
決まった形のタイムアウトの情報が付きます。親やフックが、文字列を解析しなくても、
ストップウォッチによる停止とそれ以外の失敗を見分けられるようにするためです。
`timeout_seconds`（実際に待ちを終わらせたほうの上限。停滞のしきい値が、
それより長い設定上限に先んじたならそちら、そうでなければ設定した上限）、
`timed_out_after_seconds`（実際の経過時間）、`last_event_age`（待ちが終わった時点で、子が
どれだけ黙っていたか。遅いプロバイダと暴走を手早く見分ける手がかりです）、`timeout_phase`
（最初のリクエストに届く前なら `before_first_llm_call`、それ以外は `after_llm_calls`）です。
タイムアウト以外のエラーでは、4 つとも `null` になります。

## 失敗が見えること {#failure-visibility}

サブエージェントの失敗 — 再試行できないプロバイダのエラー（404 / 400）、タイムアウト、異常終了、使える出力が無い — が、黙って流されることはありません。

- **CLI**: 委任のツリーに理由が 1 行で出ます。`⚠️ Subagent failed — "your goal": HTTP 404: model not found (after 12s)`。まとめて動かしたときは、タスクごとの `✗` の完了行に理由が足されます。
- **ゲートウェイのプラットフォーム**（Telegram、Discord、Slack、…）: 同じすっきりした行が、単独のチャットの知らせとして届きます。そのプラットフォームで `tool_progress` が無効でも届きます。
- **親のエージェント**: ツールの結果に `status: "failed"` と `error` の全文が入るので、モデルはそれに応じて動けます（再試行、経路の変更、報告）。

エラーの文言は、いちばん役に立つ 1 行（トレースバックの壁ではなく、例外のメッセージ）に絞られ、長さにも上限があります。

:::tip 呼び出しゼロでのタイムアウト時の診断ダンプ
固い上限を設定しているとき、サブエージェントが API の呼び出しを**一度も**しないままタイムアウトすると（たいていは、プロバイダに届かない、認証に失敗した、ツールのスキーマが弾かれた、のいずれかです）、`delegate_task` は `~/.hermes/logs/subagent-timeout-<session>-<timestamp>.log` に決まった形の診断を書き出します。中身は、サブエージェントの設定のスナップショット、資格情報の解決の記録、早い段階のエラーメッセージ、そして**生きているすべての**スレッド（子自身のものだけではありません）のスタックトレースです。入れ子の補助スレッドを待って止まっている子は、全体を見なければ、遅いプロバイダと見分けがつかないからです。
:::

## バックグラウンドのサブエージェントの停滞検知 {#stall-detection-for-background-subagents}

バックグラウンドの委任（`delegate_task(background=true)`）は、**進み具合を見る停滞監視**が
見張っています。既定で有効で、設定は要りません。実時間のタイムアウトと違って、進んでいる
子には、どれだけ長く動いていても手を出しません。

監視は、切り離された子それぞれの進み具合の信号を見ます。API の呼び出し回数、いま使っている
ツール、最後に動いた時刻（これは**流れてくるトークン 1 つごと**、ツールの切り替え、API の
呼び出しの区切りで進むので、長い応答を受け取っている途中の子はつねに生きていると数えられます）
の 3 つです。

1. **進んでいる子には決して手を出しません。** どれかの信号が進めば、時計はリセットされます。
2. 進み具合が完全に止まったまま、停滞のしきい値（何もしていないなら 450 秒、ツールの中に
   いるなら 1200 秒。正当に時間のかかるターミナルのコマンドやウェブの取得には高いほうの
   天井が与えられます）を超えた子は**中断**され、120 秒の猶予をもらいます。その間にたたむ
   ことができた子は、通常の完了の経路で途中までの結果を届けます。
3. まったく返ってこない子は、`stalled` という終端の完了イベントで強制的に終わらせます。
   持ち主のセッションが黙り込むのではなく結末を受け取れるようにし、非同期の枠を新しい
   作業のために空けるためです。

`stalled` のイベントには、同期の経路のタイムアウトの項目と対になる情報が付きます。
`stalled_after_quiet_seconds`、`stall_threshold_seconds`、`stall_phase`（`idle` /
`in_tool`）、`stall_grace_seconds` です。

これで、詰まったバックグラウンドの子がセッションを死んだように見せたまま、プロセスを
再起動するまで放置される、という長らく続いた不具合が塞がりました。その根にあった詰まり
（ゲートウェイを何日も動かしたあと、子が最初の API の呼び出しで固まる）も、根本から
直しました。委任された子は、入れ子のワーカースレッドではなく、自分の会話のスレッド上で
OpenAI 形式の API リクエストを直接走らせるようになっています。詰まりが住んでいたのは、
まさにその層でした。停滞監視は、それ以外の事態に備える安全網として残っています。

## 動いているサブエージェントを見る（`/agents`） {#monitoring-running-subagents-agents}

TUI には `/agents` のオーバーレイ（別名 `/tasks`）があり、再帰的に広がる `delegate_task` を、きちんと追える表示に変えてくれます。

- 動いているサブエージェントと最近終わったサブエージェントを、親ごとにまとめたツリー表示
- 枝ごとの費用、トークン、触れたファイルの集計
- 停止と一時停止の操作。兄弟を止めずに、特定のサブエージェントだけを途中で止められます
- あとから見直す。親へ返ったあとでも、各サブエージェントのターンごとの履歴をたどれます

### 入力欄の上に出る動きの表示 {#live-activity-above-the-composer}

従来型の CLI、TUI、デスクトップは、動いているサブエージェントを入力欄の上に自動で表示します。動いている数、タスク名、経過時間、直近の動きを見ながら、書き続けられます。端末のドックは画面の高さに応じて表示する行数を絞り、隠れているワーカーが何人いるかを示します。デスクトップは 3 人まで先出しします。

| 画面 | 広げて中を見る | 選んだワーカーを操作する |
|---|---|---|
| 従来型 CLI | **Ctrl+T**（または **F6**）で全画面の一覧が開きます。矢印で選び、**Enter** で記録の末尾を開き、**PgUp/PgDn** でスクロールします | **s** で別の指示入力が開きます。**x** に続けて **y** で停止を求めます |
| TUI | **Ctrl+T** または `/agents` で全高のツリーが開きます。**Enter/t** で動いている記録の末尾が開き、**d** で詳しい情報が開きます（保存済み・再生の表示では Enter でそのまま詳細が開きます） | **e** で指示入力が開きます。**x** で選んだワーカーを止め、**X** でその配下ごと止めます |
| デスクトップ | 入力欄の上の **Subagents** を広げ、ワーカーを選ぶとその動きと詳細が見られます | **Steer** で指示を積み、**Stop** でそのワーカーの中断を求めます |

端末の監視画面を閉じると、書きかけの入力へ戻ります。指示の差し込みは専用の入力を使い、返るのは配信ではなく**受け付けた**という応答です。子は区切りのところで指示を受け取ります。停止が、関係のない兄弟を中断することはありません。

**裏で動くプロセスも同じドックに並びます。** エージェントが `terminal(background=true)` で起こしたもの（ビルド、テストの実行、開発用サーバー、CI の見張りなど）は、起きたその瞬間からサブエージェントの行の下の **Processes** のまとまりに出ます — `⚙ <command> · 42s · last: <latest output line>` — そして終わると同じ場所で `✔ exit 0` / `✘ exit 1` / `✘ killed` へ変わり、その 60 秒ほどあとにドックから消えます（あとから見返せる記録は、会話に出る完了の知らせのほうです）。従来型 CLI の監視画面では、プロセスの行はエージェントの下に並び、**Enter** でそのプロセスのログの末尾が見られ、**x** でそのプロセスだけを止められます。プロセスに指示を差し込むことはできません。TUI の `/agents` の重ね表示でも、同じまとまりが呼び出しの木の下に並びます（`/stop` は裏で動くプロセスをすべて終わらせます）。デスクトップでは、同じプロセスが入力欄の上のタイルとして出ます。

従来型 CLI や TUI の入力欄で **F7** を押すと、ドックが複数行の先出しと、1 行の薄い要約とで切り替わります。要約でも、動いている数と、広げる・戻す手がかりは残り、余裕があれば動きも足されます。入力も送信もそのまま使え、監視画面を開いて閉じても、書きかけの内容とカーソルの位置は保たれます。これはその場の表示の選択であって、設定として保存されるものではありません。

動いている記録の末尾は、区切られた直近の抜粋であって、会話をいくらでもさかのぼれる閲覧画面ではありません。子が動いているものの一覧から外れると、ドックからも消えます。終わった作業を見直す場所は、これまでどおり完了のメッセージと、TUI・デスクトップの履歴表示です。直近の動きは観察であって、進み具合の百分率の見積もりではありません。

従来型 CLI の `/agents` と `/tasks` のコマンドは、いまも文字で要約を表示します。**Ctrl+T**（または **F6**）が、親が忙しいときでも使える、その場で触れる監視画面です。[TUI — スラッシュコマンド](/hermes/docs/user-guide/tui/#slash-commands)を参照してください。

従来型 CLI と、すべてのゲートウェイのプラットフォーム（Telegram、Discord、Slack、…）では、
`/agents` は**バックグラウンドの委任と、子ごとのいまの動き**も並べます。動いている子から
直接取ってきた値です。

```
Background delegations: 1 running
- deleg_ab12cd34 · running · research the delegation stall monitor
  - child 1: 4 api calls · in web_search · active 12s ago
  - child 2: 7 api calls · between turns · active 3s ago
```

停滞監視が印を付けた委任は
`stalling · no progress 450s — interrupting` と表示され、長く静かだけれど健康な子は
静かにしている時間が出るので、「遅い」のか「詰まっている」のかがひと目で分かります。

## 動いているサブエージェントに指示を差し込む {#steering-a-running-subagent}

子を中断すると、進めていた作業は捨てられます。多くの場合、本当にやりたいのは向きを変えることです。

### 親のエージェントから（モデル向け） {#from-the-parent-agent-model-facing}

親のエージェントは、子を起動したのと同じ `delegate_task` ツールで、動いている自分の子を采配します。別の操作ツールは要りません。

```json
{"action": "list"}
{"action": "steer", "subagent_id": "sa-0-1a2b3c4d", "message": "focus on pricing instead"}
{"action": "stop",  "subagent_id": "sa-0-1a2b3c4d"}
```

- **`list`** は、その会話の動いている子を返します。`subagent_id`、goal、状態、`running_seconds`、`accepting_steer`、そして動いている記録のパスです。ID は、起動時の応答にも `subagent_ids` として返ります。
- **`steer`** は、動いている子を止めずに、向きを変える指示を積みます（届き方は後述します）。
- **`stop`** は、次の区切りで子を早めに終わらせます。途中までの結果は、通常の完了メッセージとして会話へ戻ります。

これらの操作はターンの中で同期的に走り（バックグラウンドには回りません）、呼び出した側の起動したツリーの中に閉じています。ある会話が、別のセッションの子を見たり操作したりすることはできません。またターンごとのサブエージェントの起動上限を消費しないので、上限に達したあとでも `stop` は使えます。

### TUI / ゲートウェイから（セッション向け） {#from-the-tui-gateway-session-facing}

`tools/delegate_tool_registry.py` の `steer_subagent(subagent_id, text)` は、`interrupt_subagent()` の、向きを変える側の対になるものです。[`/steer`](/hermes/docs/reference/slash-commands/) と同じ仕組みで、動いている子にテキストを積みます。テキストは次の区切りで子の最後のツールの結果に足され、実行中のツールの呼び出しが断ち切られることはなく、子はそれを外から届いた利用者のメッセージとして受け取ります。プログラムから使うホストは、セッションに閉じたゲートウェイの RPC `subagent.steer` から届きます。これは `subagent.interrupt` の隣にあります。

```json
{"method": "subagent.steer", "params": {"session_id": "owning-ui-session", "subagent_id": "sa-0-1a2b3c4d", "text": "focus on pricing instead"}}
```

サブエージェントの ID は `delegation.status`（または `list_active_subagents()`）から得られます。`subagent.interrupt` が使うのと同じ場所です。ゲートウェイが指示の差し込みを受け付けるのは、その子を起動した、まさにその生きている UI / ゲートウェイのセッションからだけです。存在しない、他人の、あいまい、あるいは古い・使い回されたセッションの身元は弾かれます。世界共通のサブエージェント ID を知っていることは、権限ではありません。プロセス内から直接呼ぶ側には、あえて範囲を絞らない補助関数の約束が残されています。

**積んだことは届いたことではありませんが、うそをつく成功でもありません。** `"queued"` の応答は、子が完了する区切りより前にテキストが受け付けられたという意味であって、子がそれを見たとは限りません。受け付けと完了は同期しています。子がまだそのテキストを受け取れるか、そうでなければそのテキストがそのまま結果に `pending_steer` として流れ出るか、のどちらかです。閉じたあとの呼び出しは `"rejected"` を返します。子が指示を受け付けたものの、すでに最終的な回答を作り終えていた場合、親が受け取る完了の記録にそれが `missed_steer` として残り、まとめには次のような注記が足されます。

```
[steer did not land — the subagent finished before it could be delivered: focus on pricing instead]
```

こうして親（あるいはそれを動かしている運用者）は、指示が効いた子と、古い指示のまま終えた子とを見分けられ、届いたものと思い込まずに、あらためて指示を出し直せます。

## 動いている記録 {#live-transcripts}

`delegate_task` を投入すると、**タスクごとに、追記だけの、人が読める記録**もひとつ作られます。まとまったまとめを待たずに、あなた（や親のエージェント）がサブエージェントの働きぶりをその場で見られるようにするためです。

```
<hermes_home>/cache/delegation/live/<delegation_id>/task-<n>.log
```

投入時の応答には、そのパスが `live_transcripts` として含まれ、ファイルは投入の時点で先に作られるので、すぐに使えます。

```bash
tail -f ~/.hermes/cache/delegation/live/deleg_ab12cd34/task-0.log
```

各行には時刻が入り、子のアシスタントとしての発言、思考の断片、ツールの呼び出し（`-> tool_name({args})`）、ツールの結果、そして最後の状態の印が並びます。同じディレクトリの `manifest.json` が、その束の内容（目標、タスク数、タスクごとの状態）を説明します。記録は完了後も残り、まとめと並ぶ、細部まで残った運用の記録として働きます。7 日より古いディレクトリは、新しい投入のときに自動で片付けられます。`cache/delegation` の下にあるので、離れたところのターミナル（Docker / Modal / SSH）からも読めます。

## 深さの上限と入れ子の取りまとめ {#depth-limit-and-nested-orchestration}

既定では、委任は**平ら**です。親（深さ 0）が子（深さ 1）を起動し、その子はそれ以上委任できません。委任が際限なく再帰するのを防ぐためです。

多段の流れ（調査 → 統合、あるいは小問題ごとの並行した取りまとめ）のために、親は自分のワーカーを起動*できる***取りまとめ役**の子を起動できます。

```python
delegate_task(
    goal="Survey three code review approaches and recommend one",
    role="orchestrator",  # Allows this child to spawn its own workers
    context="...",
)
```

- `role="leaf"`（既定）: 子はそれ以上委任できません。平らな委任と同じ動きです。
- `role="orchestrator"`: 子は `delegation` のツールセットを持ち続けます。`delegation.max_spawn_depth`（既定は **1** = 平ら。なので既定のままでは `role="orchestrator"` は何も変えません）で区切られます。取りまとめ役の子が末端の孫を起動できるようにするには `max_spawn_depth` を 2 に、さらに深いツリーには 3 以上にします。上限はありません。実際に区切りになるのは費用です。
- `delegation.orchestrator_enabled: false`: 全体を止める切り替えで、`role` の指定にかかわらず、すべての子を `leaf` にします。

**費用の注意:** `max_spawn_depth: 3` と `max_concurrent_children: 3` なら、ツリーは 3×3×3 = 27 個の末端エージェントが同時に動くところまで広がります。階層がひとつ増えるごとに費用は掛け算になります。`max_spawn_depth` を上げるのは、意図してからにしてください。

**一度きりの実行は別枠で区切られます。** `hermes chat -q` / `--oneshot` のセッションが起動できるサブエージェントは、合計で `delegation.oneshot_max_children` まで（既定は `2`、`0` なら無制限）です。一度きりの実行には結果を受け取るあとのターンがなく、ベンチマークの記録を見ると、その起動のほとんどは並行して進める作業ではなく「自分の作業を独立に見直させる」ものでした。そうした子はどれも、冷えた状態のシステムプロンプトを払い直し、リポジトリを読み直します。対話のセッションとゲートウェイのセッションは影響を受けません。

## 寿命と残り方 {#lifetime-and-durability}

:::warning バックグラウンドの完了が残ることは、実行そのものが残ることではありません
モデルから呼ぶ最上位の `delegate_task` は、あとから結果を届けられるセッションであれば、自動的にバックグラウンドで動きます。Hermes はすぐに受け取り札を返し、子または束が終わったあとで結果が会話へ戻ります。取りまとめ役のサブエージェントは、返す前にワーカーの結果をまとめる必要があるので、いまのターンの中で待ちます。状態を持たない要求・応答型の接続先は、あとから切り離した結果を届けられないので、同期実行に落ちます。

- ふつうに続けて送るメッセージで、バックグラウンドの子が止まることはありません。どの画面からでも `/stop`（ゲートウェイの `/stop` — 送り出したターンが終わってセッションが待ち状態になったあとでも効きます — CLI の `/stop`、Desktop / TUI の停止ボタン、ACP のキャンセル）を使えば、そのセッションで動いているバックグラウンドの委任が終わります。持ち主のセッションを閉じる・リセットしても同じです。
- セッションを明示的に閉じる・リセットすると、そのセッションのバックグラウンドの子は中断されます。ゲートウェイが持っているセッションを TUI の表示から閉じても、ゲートウェイ側の作業は止まりません。
- Hermes のプロセスを再起動しても、動いている子が再開することは**ありません**。その試行は `unknown` になります。どの副作用が起きたのかを Hermes が証明できないからです。
- 再起動の前に終わっていたのに結果が届いていなかった子は、復元され、持ち主のセッションの通常のチェックを通って戻されます。
- 止められた子は決まった形の結果（`status="interrupted"`、`exit_reason="interrupted"`）を返し、その `summary` には止まる直前に子が出した最後の文章が入ります（中断を示す差し込みの文は `error` へ移ります）。停止は起動のツリーを下までたどるので、取りまとめ役の子の下で同期的に動くワーカーが先に中断され、その途中までの結果が子自身の中断された結果へまとめ上げられます。そしてバックグラウンドの単位ごとの結果は、ふつうの完了の知らせ（`Subagent Task Interrupted: …`）としてすぐ会話へ戻るので、子が予算を使い切るのを待つものは何もありません。

セッションを閉じてもプロセスを再起動しても残り続ける、**確実な実行**が要るときは、次を使ってください。

- `cronjob`（action=`create`） — 別のエージェントの実行を予約します。親のターンの中断の影響を受けません。
- `terminal(background=True, notify_on_complete=True)` — エージェントが別のことをしている間も動き続ける、長いシェルのコマンドです。
:::

## 押さえておきたい性質 {#key-properties}

- サブエージェントはそれぞれ**自分のターミナルセッション**を持ちます（親とは別です）
- サブエージェントは親の有効なツールセットを受け継ぎます。モデルが呼び出しごとに選んだり広げたりはできません
- **入れ子の委任は選んで使うもの**です。さらに委任できるのは `role="orchestrator"` の子だけで、しかも `max_spawn_depth` を既定の 1（平ら）から上げたときだけです。全体で止めるには `orchestrator_enabled: false` を使います。
- 末端のサブエージェントは `delegate_task`、`clarify`、`memory`、`send_message`、`cronjob` を呼べ**ません**。取りまとめ役のサブエージェントは `delegate_task` を持ち続けますが、ほかの制限はそのままです。どちらの役割でも `execute_code`（プログラムからのツール呼び出し）は残るので、子は推論の回数を使い切る代わりに、機械的な作業をまとめて片付けられます。
- **中止は所有権に従います。** `/stop` か、持ち主のセッションを閉じる・リセットすると、その配下のバックグラウンドの子と、その下で同期的に動く子孫が終わります。それぞれ、途中までの出力を持った中断の完了として返ります
- 親の文脈に入るのは最終的なまとめだけなので、トークンの使い方が無駄になりません
- サブエージェントは親の **API キー、プロバイダの設定、資格情報プール**を受け継ぎます（レート制限のときのキーの持ち回りが効きます）

## worktree による分離 {#worktree-isolation}

既定では、サブエージェントは親の作業ディレクトリを共有します。調べもの中心・読み中心の
作業なら問題ありませんが、並行して同じリポジトリを編集する子どうしはぶつかります。
`delegation.worktree_isolation: true` にすると、子ごとに、リポジトリのいまの `HEAD` から
枝分かれした専用の git worktree が与えられます（Muse Code の
`--subagent-worktree-isolation` にならったものです）。

```yaml
delegation:
  worktree_isolation: true   # default: false
```

分離を有効にすると、次のようになります。

- 子はそれぞれ `<repo>/.worktrees/subagent-<id>` で、自分のブランチ
  `hermes-subagent/subagent-<id>` の上でターミナルを開始し、目標のメッセージにも
  そこで作業してコミットするように書かれます。
- 親のチェックアウトはそのままで、子どうしが互いの編集を潰すこともありません。
- 子が終わると、その結果に `worktree` の項目が加わり、`path`、`branch`、`commits`
  （元からいくつ進んだか）、`dirty` が入ります。親は各ブランチを見て、あるいは
  取り込みます（`git log <branch>`、`git merge <branch>`）。
- コミットが無く、作業ツリーもきれいなまま残された worktree は**自動的に片付けられます**
  （`pruned: true`）。作業を抱えているものは残ります。
- 片付けには証拠が要ります。git を調べる試みが失敗したとき、あるいは終了処理そのものが
  エラーになったときは、worktree もブランチも残り、その項目には `inspection_failed: true`
  と `note` が付きます。この場合の `commits` / `dirty` は測った値ではなく既定値なので、
  子が何も作らなかったと決めつけず、worktree を自分で見てください。

適用の範囲: 選んで使うもので、git のリポジトリでだけ、ローカルのターミナルでだけ働きます。
git ではないディレクトリ、docker / ssh / modal のバックエンド、あるいは worktree の作成に
失敗した場合、この設定は静かに、いまの作業ディレクトリを共有する動きへ落ちます。エラーには
なりません。

## delegate_task と execute_code の使い分け {#delegation-vs-executecode}

| 観点 | delegate_task | execute_code |
|--------|--------------|-------------|
| **推論** | LLM の推論ループをまるごと使う | Python のコードを実行するだけ |
| **文脈** | 独立した新しい会話 | 会話は無く、スクリプトだけ |
| **ツールの権限** | 塞がれていないツールすべてを、推論とともに使える | RPC 経由の 7 ツール、推論は無し |
| **並列** | 既定で 10 個のサブエージェントが同時に動く（設定可） | スクリプト 1 本 |
| **向いている用途** | 判断の要る込み入った作業 | 機械的な多段の処理 |
| **トークンの費用** | 高め（LLM のループをまるごと使う） | 低め（標準出力だけが返る） |
| **利用者とのやり取り** | 無し（サブエージェントは聞き返せない） | 無し |

**目安:** その小作業に推論・判断・多段の問題解決が要るなら `delegate_task` を、機械的なデータ処理や決まった手順の流れが要るなら `execute_code` を使ってください。

## 設定 {#configuration}

```yaml
# In ~/.hermes/config.yaml
delegation:
  max_iterations: 250                       # Max turns per child (default: 250)
  # max_concurrent_children: 10             # Parallel children per batch (default: 10)
  # independent_completions: false          # true = each task/group returns as it finishes (default: one message per call)
  # worktree_isolation: false               # Give each child its own git worktree (see Worktree Isolation above)
  # max_spawn_depth: 1                      # Tree depth (floor 1, no ceiling, default 1 = flat). Raise to 2 to allow orchestrator children to spawn leaves; 3+ for deeper trees.
  # orchestrator_enabled: true              # Disable to force all children to leaf role.
  model: "google/gemini-3-flash-preview"             # Optional provider/model override
  provider: "openrouter"                             # Optional built-in provider
  api_mode: anthropic_messages                       # optional; auto-detected from base_url for anthropic_messages endpoints

# Or use a direct custom endpoint instead of provider:
delegation:
  model: "qwen2.5-coder"
  base_url: "http://localhost:1234/v1"
  api_key: "local-key"
  # api_mode: "anthropic_messages"  # Optional. Wire protocol override for base_url ("chat_completions", "codex_responses", or "anthropic_messages"). Empty = auto-detect from URL (e.g. /anthropic suffix). Set explicitly for endpoints the heuristic can't classify (Azure AI Foundry, MiniMax, Zhipu GLM, LiteLLM proxies, …).

# Send per-child request settings on every subagent API call — e.g. OpenRouter
# routing hints when delegating straight to openrouter.ai via base_url:
delegation:
  model: "deepseek/deepseek-v4-flash-0731"
  base_url: "https://openrouter.ai/api/v1"
  api_key: "sk-or-..."
  request_overrides:
    extra_body:
      provider:
        sort: throughput   # children route to the fastest OpenRouter provider
```

`base_url` が Anthropic 互換の接続先を指しているとき — たとえば `/anthropic` で終わるパス、Azure Foundry の Claude の経路、MiniMax の `/anthropic` のプロキシなど — `api_mode` は `anthropic_messages` として自動で見分けられるので、何も設定しなくてもサブエージェントは正しい形式を使います。自動の見分けが外れたとき（まれです）は、`api_mode` を明示してください。

サブエージェントは親と同じところで文脈を圧縮します。`compression.threshold` × 窓の大きさ と、全体にかかる `compression.threshold_tokens` の上限（1M のモデルなら既定で 256K）のうち、小さいほうが使われます。`delegation.compression_threshold_tokens`（既定は `0`、無効）は、子の圧縮の*きっかけ*に対する絶対値の上限を任意で足すもので、割合のしきい値と比べて小さいほうが使われます。リクエストの中身にも、親にも触れません。16000 以上のトークン数を入れると有効になります。`true` や `"200k"` は設定の誤りで、警告を出して無視されます。既定で無効なのは、1,393 エージェントの実行を再生してみたところ、キャッシュの前置きが保たれていれば 200K と 400K の上限の費用差が 5% 以内に収まり、しかも圧縮のたびに細部を失う恐れがあるからです。

`delegation.request_overrides` は**3 つの**解決の分岐すべて — 直接の `base_url`、名前付きの `provider`、そのまま受け継ぐ場合 — で働くので、つねに効きます。最上位のキーは API の引数（たとえば `service_tier`）で、`extra_body` の下の辞書はリクエストの `extra_body` へ混ぜられます。明示した値は、実行時や親から導かれた上書きの**上**に重なります。最上位のキーは明示したほうが勝ち、`extra_body` は 1 階層だけ深く混ぜられるので、プロバイダ自身のリクエストの癖（たとえば `thinking: {type: disabled}`）は、あなたのキーがそれを定義し直さないかぎり残ります。詳しくは[設定 → Delegation](/hermes/docs/user-guide/configuration/#delegation)を参照してください。

:::tip
エージェントは、作業の込み入り具合を見て、委任を自分で使い分けます。委任するように明示的に頼む必要はありません。理にかなうときには、そうしてくれます。
:::
