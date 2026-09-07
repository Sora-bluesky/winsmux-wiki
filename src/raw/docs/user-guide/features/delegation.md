---
title: "作業の委任（サブエージェント）"
description: "delegate_task で切り離した子エージェントを起こし、いくつもの作業を並行で進めます"
upstream_path: user-guide/features/delegation.md
upstream_blob: dbe5e21c08979465b16eeaaf8a00f353fdf80cb0
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/delegation
---

# 作業の委任（サブエージェント） {#subagent-delegation}

`delegate_task` ツールは、切り離された文脈と、親から引き継いだツール、それぞれ自分の端末セッションを持つ子の AIAgent を起こします。子は新しい会話を与えられて独立に作業し、親の文脈に入るのは最後のまとめだけです。

いちばん上のエージェントからの呼び出しは、自動的に裏で走ります。Hermes はすぐに受け取りの控えを返すので会話はそのまま続けられ、結果はあとから新しいメッセージとして届きます。取りまとめ役のサブエージェントは、結果をまとめてから返す必要があるので、自分の働き手を待ちます。

## 完了の届け方 {#completion-delivery}

メッセージ用のゲートウェイが裏側の完了を受け取ったと認めるのは、そのアダプタが実際にその出来事を予定に入れるか、
セッションの待ち行列へ入れたあとです。受け口が無い、セッションの経路が食い違う、待ち行列がいっぱい、といったときは
完了は保留のままやり直しに回ります。この受け付けの拒みは、記録に残る配達の試行回数を使いません。受け付けに成功すると、
動いているゲートウェイの中での重ねての配達は止まりますが、それはモデルの応答や外への返信が終わったことの証拠ではありません。
落ちて立ち上げ直したときの配達は、これまでどおり少なくとも一度は届く形で、既存の再生の期限に従います。実際に運ぶところで
失敗した場合は、これまでどおり回数を区切ったやり直しの決まりに従います。

API サーバーの経路が使えないときは、経路が無いという警告を繰り返すことなく保留のままになります。形の壊れた
メッセージ用の経路については、これまでどおり診断が出ます。API サーバーでは、裏で走る委任の完了が加えるのは記録に残る
時系列の配達の行だけです。次のモデルの応答をどうするかは、つないでいる側が決めます。裏のプロセスの通知を `off` に
していても、見張りの型に当たった出来事は黙って流し切ります。

## 裏のプロセスの寿命 {#background-process-lifetime}

裏で走る端末のプロセスは、それを起こしたエージェントのものです。委任の後片付けで子を閉じると、その子に残っていた
プロセスは、前の応答で起こしたものも含めて終わります。親や兄弟のエージェントが持つプロセスは止まりません。端末の環境を
共有していても、プロセスの持ち主が移るわけではありません。

子は、ビルドやテストなど終わりのある裏のコマンドを、最後のまとめを返す前に待つべきです。子が終わったあとも続いてほしい
CI の見張りやサーバーは、親のセッションで起こしてください。プロセスの ID を返しても、持ち主が親へ移ることはありません。

## ひとつだけ任せる {#single-task}

```python
delegate_task(
    goal="Debug why tests fail",
    context="Error: assertion in test_foo.py line 42"
)
```

## まとめて並行で任せる {#parallel-batch}

既定では同時に 3 つまでです（設定で変えられ、上限は決まっていません）。

```python
delegate_task(tasks=[
    {"goal": "Research topic A", "context": "Focus on recent primary sources"},
    {"goal": "Research topic B", "context": "Compare the leading explanations"},
    {"goal": "Fix the build", "context": "Project root: /home/user/project"}
])
```

## サブエージェントの文脈はどうなっているか {#how-subagent-context-works}

:::warning 大事なところ: サブエージェントは何も知りません
サブエージェントは**まったく新しい会話**から始まります。親の会話の履歴も、それまでのツールの呼び出しも、委任より前に話したことも、何ひとつ知りません。サブエージェントが持つ文脈は、親のエージェントが `delegate_task` を呼ぶときに書いた `goal` と `context` だけです。
:::

例外がひとつあります。親に作業ディレクトリが定まっている場合、どのサブエージェントのシステムプロンプトにも、その作業場所の**プロジェクトの文脈ファイル**が埋め込まれます（`.hermes.md` > AGENTS.md の連なり > CLAUDE.md > `.cursorrules` の順で、探し方も優先順位も大きさの上限も、本体のエージェントのシステムプロンプトと同じです。SOUL.md は除きます）。リポジトリの中で働くサブエージェントは、そのリポジトリの決まりごとを自分で探し直さずに、その決まりに沿って動きます。

つまり親のエージェントは、サブエージェントに必要なものを**すべて**呼び出しに書かなければなりません。

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

サブエージェントは、こちらが書いた goal と context から組み立てた、絞り込まれたシステムプロンプトを受け取ります。作業をやり遂げ、何をして、何がわかり、どのファイルを変え、どんな問題に当たったかを、形の整ったまとめとして返すよう指示されます。

## 実際の使い方 {#practical-examples}

### 並行して調べる {#parallel-research}

複数のことを同時に調べ、まとめを集めます。

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

### 見直して直す {#code-review-fix}

見直してから直すという流れを、まっさらな文脈へ任せます。

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

### 多くのファイルにまたがる書き直し {#multi-file-refactoring}

親の文脈をあふれさせてしまうような、大きな書き直しを任せます。

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

## まとめて任せるときの詳細 {#batch-mode-details}

いちばん上のエージェントが `tasks` の配列を渡すと、Hermes は裏で走る受け取りの控えをひとつ返し、サブエージェントを並行で走らせます。既定では、すべての作業が終わった時点で、まとめた **ひとつ** のメッセージが返ります。結果が届くのは親の応答と応答の間だけです。親は子に依存しない用事を先に片付け、待っている間に記録や成果物や CI を見に行くのではなく、自分の応答をいったん終えてください。

### 終わったものから受け取る（自分で有効にします） {#independent-completions-opt-in}

`delegation.independent_completions: true` にすると、結果は代わりに **まとまりごと** に、終わったそばから届きます。

- それぞれの結果に別々に手を打てるときは `group` を書かないでください。作業は終わった時点でそれぞれ報告します。
- 出力をまとめて見たいとき——比べる、合わせる、ひとつの判断につなげる——は同じ `group` の文字列を使ってください。そのまとまりは、含まれる作業がすべて終わってから **ひとつ** のメッセージとして返ります。それぞれ独立に走らせられる作業でも、結果が同じ判断の材料になるなら、ひとつのまとまりに入れて構いません。
- 別のまとまりは互いに関係なく報告します。まとまりに入れた作業と入れない作業を、ひとつの呼び出しに混ぜられます。

既定で切ってあるのは、まとまりのひとつひとつが取りまとめ役にとって新しい応答になるからです。15 件の呼び出しは最大 15 回の起こし直しになり、長い取り組みが細切れになりました。まとめ方が決めるのは **結果の届き方であって、走る順番ではありません**。作業はどのみち並行で走ります。作業 B が作業 A の出力を必要とするなら、まず A を出し、A が返ってからその出力を添えて B を出してください。

```json
{"tasks": [
  {"goal": "Review PR #101 ..."},
  {"goal": "Review PR #102 ..."},
  {"goal": "Benchmark approach A ...", "group": "bench"},
  {"goal": "Benchmark approach B ...", "group": "bench"}
]}
```

受け取りの控えには、まとまりごとの情報（`units[].delegation_id`、`group`、`task_indexes`）が並びます。まとまりの ID は呼び出しの ID に `-1`、`-2`、… を付けたものです。ひとつの呼び出しのすべてのまとまりは `delegation.max_concurrent_children` の枠をひとつだけ使うので、まとめ方によって使える量が変わることはありません（働き手の数は生きているまとまりの数まで増えるので、いっぱいのプールの後ろで待たされるまとまりはありません）。取りまとめ役のサブエージェントは、結果をまとめられるように、いまの応答の中で自分の一括分をすべて待ちます。

- **同時に走る数の上限:** 既定で 3 件です（`delegation.max_concurrent_children` か環境変数 `DELEGATION_MAX_CONCURRENT_CHILDREN` で設定できます。下限は 1 で、上限は決まっていません）。上限を超える数を渡すと、黙って切り詰められるのではなく、ツールのエラーが返ります。
- **スレッドプール:** 設定した同時実行数を最大の働き手の数として `ThreadPoolExecutor` を使います
- **進み具合の表示:** CLI では、各サブエージェントのツール呼び出しが木の形でその場で見え、作業ごとの完了の行も出ます。プラットフォーム連携では、進み具合はまとめられて親の進捗の受け口へ渡されます。CLI と TUI の完了の知らせは、`Subagent Task Completed: Review changes` のように作業名を先に置いた見出しになります。複数の作業を含むまとまりでは、まとまりの名前と作業の数を使います。うまくいかなかった作業や途中で終わった作業には、それに応じた状態の札が付きます。この短い知らせは、親のエージェントへ届く結果そのものの代わりではありません。
- **結果の並び:** ひとつのまとまりの中では、終わった順にかかわらず入力の順に並び替えられます。`TASK i/N` の見出しは呼び出し全体を通した番号です
- **取り消し:** あとから送ったメッセージでは、いちばん上で裏で走っている一括分は止まりません。`/stop` するか、持ち主のセッションを閉じるか初期化すると、動いている子が止まります。取りまとめ役の下で同期的に動く子は、これまでどおり親の中断の状態に従います

取りまとめ役からひとつだけ委任する場合は、スレッドプールを通さずそのまま走ります。

### 裏で終わったことを取りこぼさない {#durable-background-completions}

裏で動いていた委任が終わると、Hermes はその完了の記録を、
ふつうの新しい応答の列へ流す前に、いま使っているプロファイルの `state.db` に
書き留めます。終わったあと、届く前に Hermes が再起動しても、待っている
記録は復元され、同じ持ち主かどうかの確認を通ってから流れます。受け取り手が
競合しても、確保の記録が残るので、実際に受け取った側だけが届いたことを
知らせます。失敗した側は確保を手放し、やり直しに回ります。

これは、落ちたあとに子の実行を再開するものではありません。走っているあいだに
持ち主のプロセスが消えた委任は `unknown` として記録されます。外向きの副作用が
起きたかどうかを、Hermes が証明できないからです。待ちの記録も届いた記録も、
量に上限があり、プロファイルの中だけに閉じています。

### 子が起こした裏のプロセスの通知 {#child-background-process-notifications}

サブエージェントが起こした裏のプロセス（`notify_on_complete` を付けた
`npm ci` など）は、仕組みのうえでは完了や監視文字列の通知を**親**の会話へ
流します。子より長く生きるものには、確かな受け取り手が要るからです。ただし
既定では、その通知は親のやり取りの中では**出しません**。届けるべきものは
子の委任の結果としてまとまったものであり、子の内側のビルドが会話の途中に出す
「処理が終わりました」の壁は雑音だからです。出さなかった記録は、プロセスの
セッション ID とサブエージェントの作業 ID とともにデバッグの記録に残るので、
あとから調べられます。

委任の結果そのものは、出さないことはありません。子のプロセスの通知を
届くようにしたい場合は次のようにします（通知には「Started by subagent …」と
どこから来たかを示す行が付きます）。

```yaml
delegation:
  surface_child_process_notifications: true   # default: false
```

### 親へプロセスを引き継ぐ {#handing-a-process-to-the-parent}

サブエージェントが起こした裏のプロセスは、**そのサブエージェントが終わると一緒に止められます**。ですから、子が `notify=true` で起こした CI の見張りやビルドは、誰にも報告しないまま消えます。子の `terminal` の結果はそのことを伝えます（`notify_on_complete: false` と `subagent_note` が付きます）。子には、終わる前に取れる正直な道が三つあります。

- **待つ** — `process_manage(action="wait", session_id=...)` で待ち、結果を自分で報告する。
- **止める** — `process_manage(action="kill", ...)`。
- **引き継ぐ** — `process_manage(action="handoff", session_id=..., data="<one sentence: what it is for>")`。実行時の仕組みが、登録簿のロックのもとで持ち主を親へ移します（子ひとつにつき 3 件まで。受け付けるのは、その子が持っていて動いているプロセスだけで、それ以外はツールのエラーになります）。完了の知らせはその後、親の会話に `Handed off to you by a subagent… Purpose: …` として届き、親は自分のものと同じように様子を見たり止めたりできます。

子がまだ動いているうちに終わったプロセスには、引き継ぎは要りません。子がそれを読み（`poll` / `wait` / `log`）、報告すればよいだけです。子が読まなかった場合は、終了コードと出力の末尾が結果に `unread_completions` として添えられ、親にも見えます。止めも引き継ぎもされないまま動き続けているものは、その結果（`orphaned_processes`）と親への委任の知らせに、終了させたものとして名前が出ます。ですから「見張りは動いています」がもう本当でないことを、親は子の言葉ではなく実行時の仕組みから知ります。CI の見張りについては、やはり次の形が優れています。子は事実（PR の番号、SHA）を返し、親が自分で見張りを起こす。

## モデルの上書き {#model-override}

`config.yaml` で、サブエージェントに別のモデルを設定できます。かんたんな作業を、安くて速いモデルへ任せたいときに便利です。

```yaml
# In ~/.hermes/config.yaml
delegation:
  model: "google/gemini-flash-2.0"    # Cheaper model for subagents
  provider: "openrouter"              # Optional: route subagents to a different provider
```

書かなければ、サブエージェントは親と同じモデルを使います。

### 費用の考え方: 立てるのは最上位、働くのは安いモデル {#cost-strategy-frontier-planner-inexpensive-workers}

問題を、条件のはっきりした小さな作業へ分けるには最上位の判断力が要りますが、目標も文脈も出力の形も揃った小さな作業をこなすほうには、たいてい要りません。そしてトークンを食うのは子の側です。並行で走らせたサブエージェントは、ふつう 1 回の実行のトークンの大半を使うので、費用がかかっているのは働き手のモデルです。`delegation.model` を安いモデルに固定し、本体のセッションは最上位のモデルのままにしておくと、計画の質は要るところに残したまま、量の出るところの支出を削れます。

```yaml
# ~/.hermes/config.yaml
model:
  default: "your-frontier-model"     # parent (planner) stays on the frontier model
delegation:
  model: "your-inexpensive-model"    # all delegate_task children run on this
  provider: "openrouter"             # optional: route children to a different provider
```

決まる順番はこうです。まず `delegation.base_url`（つなぎ先を直に指定するもの）が優先され、次に `delegation.provider`（実行時の提供元の仕組みで、認証情報のひとそろいが解決されます）、どちらも書かなければ子は親の提供元と認証情報を引き継ぎます。`delegation.model` はどの場合にも効き、空なら子は親のモデルを引き継ぎます。`delegation.base_url` と一緒に `delegation.provider` を書くと、指定したつなぎ先はそのままに、その提供元の要求の上書きと出力トークンの上限が子へ渡ります。`delegation.request_overrides` を明示した場合は、どの経路でも尊重され、実行時に決まった値の上に重なります（下の[設定](#configuration)をご覧ください）。

この固定は全体に効くことに注意してください。`delegate_task` には作業ごとにモデルを指定する引数がないので、一括で渡した子はすべて、設定した委任用のモデルで走ります。質を落としたくない作業に強いモデルを使いたい場合は、そのセッションでは `delegation.model` を書かないでおくか、作業ごとのモデルの上書きに対応している[かんばん](/hermes/docs/user-guide/features/kanban/#per-task-model-override)へ渡してください。

## `/review` コマンド {#the-review-command}

`/review` は、独立していて権限をすべて持つサブエージェントを裏で起こします。その仕事はただひとつ、いまの会話が作り出したもの（PR、差分、コード、文書、設計）を見直すことです。CLI、TUI、デスクトップアプリ、どのプラットフォーム連携でも使えます。

```
/review                       # review whatever the last 10 messages presented
/review focus on security     # add extra instructions for the reviewer
```

何が起きるかというと、次のとおりです。

1. 直近 10 件のユーザーとアシスタントのメッセージが、見直し役の出発点となる材料として写し取られます（ツールの出力とシステムのメッセージは除きます）。
2. 見直し役のサブエージェントが、`delegate_task` と同じ裏の委任の経路で送り出されます。ふつうのサブエージェントと同じツール一式（端末、ウェブ、ファイル、ブラウザなど）を持つので、抜粋だけで判断するのではなく、実際に PR を開き、差分を読み、コードを走らせます。
3. 見直し役は、本体のエージェントの作業の文脈を引き継ぎます。本体のエージェントが読み込んでいたスキル（起動時に読み込んだものも、セッション中に `skill_view` で読んだものも）は、それを読み込んでその決まりに照らして見直すようにという指示とともに、見直し役への申し送りに名前が挙がります。ほかのサブエージェントと同じく、システムプロンプトには作業場所のプロジェクトの文脈ファイル（AGENTS.md / CLAUDE.md / .cursorrules）が、守るべき決まりとして埋め込まれます。
4. 終わると、その見直しの全文が、裏のサブエージェントの完了としてふつうに同じセッションへ戻ります。本体のエージェントがそれを読み、手を打てます（指摘を直す、追いの変更を出す、こちらへ返す）。

いちばん典型的な流れはこうです。本体のエージェントが PR を出し、あなたが `/review` と打つと、作業を続けているあいだにもうひとつの目がそれを調べます。見直しは、PR を作ったエージェント宛てとしてやり取りへ戻ってきます。

### 見直しに使うモデル {#review-model}

既定では、見直し役は本体のモデルで走ります。専用のモデルを決めたいときは、`config.yaml` に `auxiliary.review` を設定します。

```yaml
auxiliary:
  review:
    provider: openrouter               # or nous, anthropic, a direct base_url, ...
    model: anthropic/claude-opus-4.6   # a strong reviewer model
```

認証情報は `delegation.provider` を指定したときとまったく同じように決まります（実行時の提供元のひとそろい、つまり base_url、API キー、api_mode）。`model` を空にした `provider: auto` は「本体のエージェントのモデルを引き継ぐ」という意味で、これが既定です。

`/review` は `/refine` とは意図して別物にしてあります。`/refine` は会話を見直して記憶とスキルを更新するもので、`/review` は会話が作り出した*成果物*を見直すものです。

## 引き継がれるツール {#inherited-tool-access}

`delegate_task` には、モデルが指定できる `toolsets` の引数はありません。サブエージェントは親で有効になっているツール一式を引き継ぐので、モデルが親の持たない力を子へ与えることはできません。任せる作業に追加の力が要る場合は、会話を始める前に親のツールを設定してください。

親が持っていても、サブエージェントでは使えないツールがあります。

- `delegate_task` — 末端のサブエージェント（既定）では使えません。`role="orchestrator"` の子には残り、`max_spawn_depth` で範囲が決まります。下の[深さの上限と入れ子の取りまとめ](#depth-limit-and-nested-orchestration)をご覧ください。
- `clarify` — サブエージェントは利用者とやり取りできません
- `memory` — 共有の記憶へは書き込めません
- `send_message` — プラットフォームをまたぐ副作用は起こせません
- `cronjob` — 親の名前で作業を予定に入れることはできません

どちらの役割でも `execute_code`（コードからのツール呼び出し）は残るので、子は機械的な作業をまとめて片づけられます。

## 反復の上限 {#max-iterations}

サブエージェントには、ツールを呼ぶ応答を何回まで行えるかの上限があります（既定は 50 回）。

```python
delegate_task(
    goal="Quick file check",
    context="Check if /etc/nginx/nginx.conf exists and print its first 10 lines",
    max_iterations=10  # Simple task, don't need many turns
)
```

## 子の制限時間 {#child-timeout}

既定では、サブエージェントに**時計で測る制限時間はありません**。子が止まるのは、実際にやっていることが理由のとき（API のエラー、ツールのエラー、反復の上限に達したとき）だけで、委任の側のストップウォッチで止まることはありません。以前の版には固い上限があり（300 秒、のちに 600 秒）、まっとうに働いている子を作業の途中で止めてしまっていました。込み入ったコードの見直し、大きく広げた調査、じっくり考えるモデルは、ずっと進み続けていても 10 分を超えることがふつうにあります。

本当に行き詰まった子は、いまも見つけられます。子が何も進めていないとき（API の呼び出しも、ツールの開始も、活動時刻の更新もないとき）、生存確認の監視が親の活動の更新をやめるので、本当に固まった働き手についてはプラットフォーム連携の無活動の制限時間が働きます。モデルの応答を待っているあいだは進んでいる扱いです。サブエージェントは提供元を待つあいだも活動の時計を更新するので、手元の遅いモデルや、前処理の長い応答が止まっている扱いになることはありません。

それでも固い上限が欲しい場合は（無人の cron から委任するときの費用の抑えなど）、導入ごとに自分で入れられます。

```yaml
delegation:
  child_timeout_seconds: 0     # default: 0 = no timeout
  # child_timeout_seconds: 1800  # opt-in hard cap (floor 30s)
```

正の値を入れると、子ごとに時計で測る固い上限が効きます。`0` か負の値なら無効です。

上限が働いたとき、子の結果にはエラーの文とあわせて、形の整った制限時間の
情報が付きます。文章を読み解かなくても、親やフックが、ストップウォッチで
止められたのかほかの失敗なのかを見分けられます。付くのは `timeout_seconds`
（設定した上限）、`timed_out_after_seconds`（実際にかかった時間）、
`timeout_phase`（最初の要求に届かなかったときは `before_first_llm_call`、
それ以外は `after_llm_calls`）です。制限時間以外のエラーでは、3 つとも `null` です。

## 失敗はかならず見える {#failure-visibility}

サブエージェントが失敗したとき（やり直しの効かない提供元のエラー（404 / 400）、制限時間、異常終了、使える出力がない場合）、黙って終わることはありません。

- **CLI**: 委任の木に理由が 1 行で出ます。`⚠️ Subagent failed — "your goal": HTTP 404: model not found (after 12s)` のような形です。一括で走らせたときは、作業ごとの `✗` の行に理由が付きます。
- **プラットフォーム連携**（Telegram、Discord、Slack など）: 同じ短い行が、単独のお知らせとして届きます。そのプラットフォームで `tool_progress` を切っていても**届きます**。
- **親のエージェント**: ツールの結果に `status: "failed"` と `error` の全文が入るので、モデルが手を打てます（やり直す、別へ回す、報告する）。

エラーの文章は、いちばん中身のある 1 行（例外のメッセージであって、追跡の壁ではありません）に絞られ、長さにも上限があります。

:::tip 一度も呼べずに時間切れになったときの記録
固い上限を設定しているとき、サブエージェントが API を**一度も**呼ばないまま時間切れになると（たいていは提供元へつながらない、認証に失敗した、ツールの形が拒否された、のいずれかです）、`delegate_task` は `~/.hermes/logs/subagent-timeout-<session>-<timestamp>.log` に、形の整った記録を書き出します。中身は、そのサブエージェントの設定の写し、認証情報がどう解決されたかの記録、早い段階のエラーの文、それに**すべての**生きているスレッド（子自身のものだけではありません）のスタックの記録です。入れ子の補助スレッドを待って止まっている子は、全体を見なければ、遅い提供元と区別が付かないからです。
:::

## 裏のサブエージェントの停滞を見つける {#stall-detection-for-background-subagents}

裏で走る委任（`delegate_task(background=true)`）は、**進み具合をもとにした停滞の監視**に
見られています。既定で有効で、設定は要りません。時計で測る制限時間と違い、
どれだけ長く走っていても、進んでいる子には手を出しません。

監視は、切り離された子それぞれの進み具合の合図を見ます。API の呼び出し回数、
いま使っているツール、最後に動いた時刻です（この時刻は**流れてくるトークン 1 つ
ごと**、ツールの切り替え、API の呼び出しの区切りで進むので、長い返答を
流している途中の子はいつでも生きている扱いです）。

1. **進んでいる子には手を出しません。** 何か進む合図があれば、時計は戻ります。
2. 進み具合がまったく止まったまま、しきい値を超えた子（何もしていないなら
   450 秒、ツールの中にいるなら 1200 秒。時間のかかる端末のコマンドや
   ウェブの取得には長いほうを当てます）は**中断され**、120 秒の猶予が
   与えられます。その間に片づいた子は、ふつうの完了の経路で途中までの結果を
   届けます。
3. それでも返ってこない子は、`stalled` という終わりの記録を付けて強制的に
   締められます。持ち主のセッションが黙り込まずに結果を受け取れ、
   非同期の枠も次の作業のために空きます。

`stalled` の記録には、同期の経路の制限時間の情報と対になる形で、
`stalled_after_quiet_seconds`、`stall_threshold_seconds`、
`stall_phase`（`idle` / `in_tool`）、`stall_grace_seconds` が付きます。

これで、固まった裏の子のせいで、プロセスを再起動するまでセッションが死んで
見える、という長年の失敗の形がなくなりました。固まりの元（プラットフォーム連携を
何日も動かしたあと、子が最初の API 呼び出しで止まる）も根から直してあります。
委任された子は、OpenAI 形式の API の要求を、入れ子の働き手スレッドではなく
自分の会話のスレッドでそのまま走らせるようになりました。固まりが住んでいたのは
その層です。停滞の監視は、それ以外のためのお守りとして残しています。

## 動いているサブエージェントを見る（`/agents`） {#monitoring-running-subagents-agents}

TUI には `/agents` という重ね表示（別名 `/tasks`）があり、`delegate_task` が入れ子に広がっていく様子を、そのまま追える画面にします。

- 動いている、あるいはさっき終わったサブエージェントを、親ごとにまとめた木の形でその場に表示
- 枝ごとの費用、トークン、触ったファイルの集計
- 止める・待たせる操作。ほかの子を巻き込まずに、特定のサブエージェントを途中で止められます
- あとからの見直し。親へ返ったあとでも、各サブエージェントのやり取りを 1 回ずつたどれます

昔ながらの CLI では `/agents` は文章のまとめを出すだけで、重ね表示が生きるのは TUI です。[TUI — スラッシュコマンド](/hermes/docs/user-guide/tui/#slash-commands)をご覧ください。

昔ながらの CLI でも、どのプラットフォーム連携（Telegram、Discord、Slack など）でも、
`/agents` は**裏で動いている委任を、子ごとの生の様子とともに**並べます。
様子は動いている子から直に取っています。

```
Background delegations: 1 running
- deleg_ab12cd34 · running · research the delegation stall monitor
  - child 1: 4 api calls · in web_search · active 12s ago
  - child 2: 7 api calls · between turns · active 3s ago
```

停滞の監視が印を付けた委任は
`stalling · no progress 450s — interrupting` と表示されます。長く静かでも
元気な子は、静かにしている時間が出るので、「遅い」のか「止まっている」のかが
ひと目でわかります。

## 動いているサブエージェントの向きを変える {#steering-a-running-subagent}

子を中断すると、途中までの作業は捨てられます。多くの場合、本当にしたいのは向きを変えることです。

### 親のエージェントから（モデルが使う側） {#from-the-parent-agent-model-facing}

親のエージェントは、動いている自分の子を、起こしたときと同じ `delegate_task` ツールで動かします。別の操作用ツールはありません。

```json
{"action": "list"}
{"action": "steer", "subagent_id": "sa-0-1a2b3c4d", "message": "focus on pricing instead"}
{"action": "stop",  "subagent_id": "sa-0-1a2b3c4d"}
```

- **`list`** は、その会話の生きている子を返します。`subagent_id`、目標、状態、`running_seconds`、`accepting_steer`、そのときのやり取りの記録の場所です。ID は起こしたときの応答にも `subagent_ids` として返ります。
- **`steer`** は、動いている子を止めずに、進む向きの修正を渡します（届き方は下に書きます）。
- **`stop`** は、次の反復の区切りで子を早めに終わらせます。途中までの結果は、ふつうの完了のメッセージとして会話へ戻ります。

これらの操作は、応答の中で同期的に走り（裏には回りません）、呼び出した側が起こした木の中だけに効きます。ある会話が、別のセッションの子を見たり動かしたりすることはできません。また、応答ごとのサブエージェントを起こせる回数を使わないので、その上限に達したあとでも `stop` は使えます。

### TUI やプラットフォーム連携から（セッションが使う側） {#from-the-tui-gateway-session-facing}

`tools/delegate_tool_registry.py` の `steer_subagent(subagent_id, text)` は、`interrupt_subagent()` の向きを変える側の対になるものです。[`/steer`](/hermes/docs/reference/slash-commands/) と同じ仕組みで、生きている子へ文章を渡します。文章は、次の反復の区切りで子の最後のツールの結果に足され、走っているツールの呼び出しが断ち切られることはなく、子はそれを流れの外から来たユーザーの発言として受け取ります。プログラムから使う側は、`subagent.interrupt` の隣にある、セッションに紐づいた `subagent.steer` というゲートウェイの RPC から届きます。

```json
{"method": "subagent.steer", "params": {"session_id": "owning-ui-session", "subagent_id": "sa-0-1a2b3c4d", "text": "focus on pricing instead"}}
```

サブエージェントの ID は `delegation.status`（または `list_active_subagents()`）から取れます。`subagent.interrupt` が使っているのと同じ場所です。ゲートウェイは、その子を起こしたまさにその UI・連携のセッションからの指示だけを受け付けます。存在しない、他人のもの、どれか定まらない、古くて使い回された、といったセッションの身元は拒まれます。世界で通用するサブエージェントの ID を知っていることは、権限にはなりません。プロセスの中から直に呼ぶ場合は、意図してこの縛りのない形を残してあります。

**受け付けたことは、届いたことではありません。ただし、うその成功でもありません。** `"queued"` という返事は、その文章が子の完了の区切りより前に受け付けられたという意味で、子がもう見たという意味ではありません。受け付けと完了は同期していて、子がまだその文章を読めるか、あるいはその文章がそのまま結果の `pending_steer` へ流し込まれるか、どちらかになります。閉じたあとの呼び出しには `"rejected"` が返ります。子が受け付けたものの、すでに最終の答えを出していた場合、親が受け取る完了の記録にはそれが `missed_steer` として残り、まとめに次のような注記が付きます。

```
[steer did not land — the subagent finished before it could be delivered: focus on pricing instead]
```

これで親（あるいは動かしている人）は、向きを変えられた子と、前の指示のまま終わった子を見分けられ、届いたと思い込まずに、あらためて指示を出し直せます。

## その場で読めるやり取りの記録 {#live-transcripts}

`delegate_task` を送り出すたびに、**作業ごとに 1 本、追記だけの読みやすい記録**も作られます。まとめを待たずに、サブエージェントが働く様子をその場で見られます（親のエージェントも見られます）。

```
<hermes_home>/cache/delegation/live/<delegation_id>/task-<n>.log
```

送り出したときの返事に `live_transcripts` として場所が入り、ファイルは送り出しの時点で先に作られるので、すぐに使えます。

```bash
tail -f ~/.hermes/cache/delegation/live/deleg_ab12cd34/task-0.log
```

各行には時刻が付き、子のアシスタントとしての発言、考えている途中の断片、ツールの呼び出し（`-> tool_name({args})`）、ツールの結果、最後の状態の印が並びます。同じディレクトリの `manifest.json` には、その一括分の中身（目標、作業の数、作業ごとの状態）が書かれています。記録は終わったあとも残り、まとめと並ぶ、細部まで残した運用の記録になります。7 日より古いディレクトリは、新しく送り出したときに自動で片づけられます。置き場所が `cache/delegation` の下なので、離れた端末のつなぎ先（Docker / Modal / SSH）からも読めます。

## 深さの上限と入れ子の取りまとめ {#depth-limit-and-nested-orchestration}

既定では、委任は**平ら**です。親（深さ 0）が子（深さ 1）を起こし、その子はさらに委任できません。委任がどこまでも入れ子になって暴れるのを防ぐためです。

段階のある流れ（調査 → まとめ、あるいは小さな問題を並行で取りまとめる形）のためには、親が**取りまとめ役**の子を起こせます。この子は自分の働き手を委任*できます*。

```python
delegate_task(
    goal="Survey three code review approaches and recommend one",
    role="orchestrator",  # Allows this child to spawn its own workers
    context="...",
)
```

- `role="leaf"`（既定）: 子はさらに委任できません。平らな委任とまったく同じ動きです。
- `role="orchestrator"`: 子は `delegation` のツール一式を持ったままになります。`delegation.max_spawn_depth`（既定は **1** = 平ら。つまり既定のままだと `role="orchestrator"` は何も変えません）で範囲が決まります。`max_spawn_depth` を 2 にすると、取りまとめ役の子が末端の孫を起こせるようになり、3 以上でさらに深くなります。上限は決まっておらず、実際に効いてくる歯止めは費用です。
- `delegation.orchestrator_enabled: false`: 全体を止める切り替えです。`role` に何を書いても、すべての子が末端（`leaf`）になります。

**費用の注意:** `max_spawn_depth: 3` と `max_concurrent_children: 3` にすると、木は 3×3×3 = 27 の末端のエージェントが同時に動くところまで広がります。1 段増えるごとに支出は掛け算で増えます。`max_spawn_depth` は意図して上げてください。

## どこまで生きるか、どこまで守られるか {#lifetime-and-durability}

:::warning 裏で終わったことが守られることと、実行そのものが守られることは別です
モデルが呼ぶ、いちばん上の `delegate_task` は、あとから結果を届けられるセッションでは自動的に裏で走ります。Hermes はすぐに受け取りの控えを返し、子や一括分が終わったあとで結果が会話へ戻ります。取りまとめ役のサブエージェントは、結果をまとめてから返さなければならないので、いまの応答の中で自分の働き手を待ちます。1 回ごとに完結する要求と応答のつなぎ先では、切り離した結果をあとから届けられないため、同期的な実行に落ちます。

- ふつうのあとからのメッセージでは、裏の子は止まりません。`/stop` は動いている裏の委任を止め、持ち主のセッションを閉じるか初期化すると、動いている子は捨てられます。
- はっきり閉じる・初期化すると、そのセッションの裏の子が中断されます。プラットフォーム連携が持っているセッションを TUI で見ていて、その画面を閉じただけなら、連携側の作業は止まりません。
- Hermes のプロセスを再起動しても、動いていた子は再開**しません**。どの副作用が起きたかを Hermes が証明できないので、その試みは `unknown` になります。
- 再起動の前に終わっていたのに結果が届いていなかった子は、記録が復元され、持ち主のセッションのふつうの確認を通って戻ります。
- 取り消された子は形の整った結果（`status="interrupted"`、`exit_reason="interrupted"`）を返しますが、親も同時に中断されているため、その結果が利用者の目に触れる返事に載らないことがよくあります。

セッションを閉じてもプロセスを再起動しても続いてほしい、**確実に走り切る実行**には、次を使ってください。

- `cronjob`（action=`create`） — 別のエージェントの実行として予定に入ります。親の応答が中断されても影響を受けません。
- `terminal(background=True, notify_on_complete=True)` — 長く走るシェルのコマンドを、エージェントが別のことをしているあいだも走らせ続けます。
:::

## 押さえておきたい性質 {#key-properties}

- サブエージェントはそれぞれ**自分の端末セッション**を持ちます（親とは別です）
- サブエージェントは親で有効なツール一式を引き継ぎます。モデルが呼び出しごとに選んだり広げたりはできません
- **入れ子の委任は、自分で有効にするもの**です。さらに委任できるのは `role="orchestrator"` の子だけで、しかも `max_spawn_depth` を既定の 1（平ら）から上げたときだけです。`orchestrator_enabled: false` で全体を止められます。
- 末端のサブエージェントが呼べ**ない**もの: `delegate_task`、`clarify`、`memory`、`send_message`、`cronjob`。取りまとめ役のサブエージェントは `delegate_task` を持ちますが、ほかは同じく使えません。どちらの役割でも `execute_code`（コードからのツール呼び出し）は残るので、子は考える回数を使い切らずに機械的な作業をまとめて片づけられます。
- **取り消しは持ち主に従います。** `/stop` するか、持ち主のセッションを閉じるか初期化すると、その裏の子が止まります。取りまとめ役の下で同期的に動く子孫は、親の中断の状態に従います
- 親の文脈に入るのは最後のまとめだけなので、トークンの使い方が無駄になりません
- サブエージェントは親の **API キー、提供元の設定、認証情報のプール**を引き継ぎます（利用制限に当たったときの鍵の入れ替えができます）

## worktree で切り分ける {#worktree-isolation}

既定では、サブエージェントは親と同じ作業ディレクトリを使います。調べものや
読むことが中心の作業なら問題ありませんが、同じリポジトリを並行で編集する子どうしは
ぶつかることがあります。`delegation.worktree_isolation: true` にすると、子ごとに
自分の git の worktree が用意され、そのリポジトリのいまの `HEAD` から枝分かれします
（Muse Code の `--subagent-worktree-isolation` に着想を得ています）。

```yaml
delegation:
  worktree_isolation: true   # default: false
```

切り分けを有効にすると、次のようになります。

- 子はそれぞれ `<repo>/.worktrees/subagent-<id>` で端末を開き、自分のブランチ
  `hermes-subagent/subagent-<id>` に乗ります。目標のメッセージにも、そこで作業して
  コミットするように書かれます。
- 親のチェックアウトはそのままで、子どうしが互いの編集を上書きすることはありません。
- 子が終わると、結果の記録に `worktree` の項目が付き、`path`、`branch`、
  `commits`（もとからの進み）、`dirty` を伝えます。親は各ブランチを見直すか
  取り込みます（`git log <branch>`、`git merge <branch>`）。
- コミットがひとつもなく、変更も残っていない worktree は**自動で片づけられます**
  （`pruned: true`）。何か作業を抱えているものは残ります。
- 片づけるには証拠が要ります。git の確認に失敗したり、締めの処理そのものが
  エラーになったりした場合、worktree もブランチも残され、記録には
  `inspection_failed: true` と `note` が付きます。このとき `commits` と `dirty` は
  測った値ではなく既定値なので、子が何も作らなかったと決めつけず、worktree を
  見にいってください。

効く範囲は、自分で有効にしたときだけ、git のリポジトリだけ、手元の端末を使う場合だけです。
git でないディレクトリ、docker / ssh / modal のつなぎ先、あるいは worktree の作成に
失敗した場合は、設定は黙って、いまの共有の作業場所での動きに戻ります。エラーには
なりません。

## delegate_task と execute_code の違い {#delegation-vs-executecode}

| 見るところ | delegate_task | execute_code |
|--------|--------------|-------------|
| **推論** | LLM がひととおり考える | Python のコードを走らせるだけ |
| **文脈** | 切り離された新しい会話 | 会話はなく、スクリプトだけ |
| **使えるツール** | 止められているもの以外すべてを、考えながら使える | RPC 経由で 7 つ、考えることはしない |
| **並行して動く数** | 既定でサブエージェント 3 つ（設定できます） | スクリプト 1 本 |
| **向いていること** | 判断の要る込み入った作業 | 機械的で段取りの決まった処理 |
| **トークンの費用** | 高め（LLM がひととおり考えるため） | 低め（標準出力だけが返る） |
| **利用者とのやり取り** | なし（サブエージェントは聞き返せません） | なし |

**目安:** 推論・判断・段取りを踏んだ問題解決が要るときは `delegate_task`、機械的なデータ処理やスクリプトの流れを回したいときは `execute_code` を使います。

## 設定 {#configuration}

```yaml
# In ~/.hermes/config.yaml
delegation:
  max_iterations: 50                        # Max turns per child (default: 50)
  # max_concurrent_children: 3              # Parallel children per batch (default: 3)
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

`base_url` が Anthropic 互換のつなぎ先を指しているとき（たとえば末尾が `/anthropic` の経路、Azure Foundry の Claude、MiniMax の `/anthropic` の中継など）、`api_mode` は自動で `anthropic_messages` と判定され、何も書かなくてもサブエージェントが正しい形で通信します。自動の判定が外れるとき（まれです）は、`api_mode` をはっきり書いてください。

サブエージェントは親と同じ割合の目安で圧縮します（`compression.threshold`、既定では窓の 0.50 倍）。`delegation.compression_threshold_tokens`（既定は `0` で無効）は、子が圧縮を*始める*絶対量の上限を足すもので、割合の目安と比べて小さいほうが使われます。要求の中身にも親にも影響しません。16000 以上のトークン数を書くと有効になります。`true` や `"200k"` は設定の誤りとして警告が出て無視されます。既定で無効にしてあるのは、1,393 エージェントの実行を再現したところ、キャッシュの前置きが残っていれば 20 万から 40 万の上限の費用差が 5% 以内に収まり、圧縮するたびに細部を失う危険があるからです。

`delegation.request_overrides` は、**3 つとも**の決まり方（`base_url` を直に書いた場合、名前で `provider` を指定した場合、そのまま引き継ぐ場合）で効くので、いつでも反映されます。いちばん上の階層の鍵は API の引数（`service_tier` など）で、`extra_body` の下の辞書は要求の `extra_body` に混ぜられます。明示した値は、実行時や親から来た上書きの**上に**重なります。いちばん上の階層は明示した側が勝ち、`extra_body` は 1 階層だけ深く混ぜられるので、提供元自身の要求の癖（`thinking: {type: disabled}` など）は、こちらが同じ鍵で書き換えないかぎり残ります。詳しくは[設定 → 委任](/hermes/docs/user-guide/configuration/#delegation)をご覧ください。

:::tip
エージェントは作業の込み入り具合を見て、自分で委任します。委任してほしいとわざわざ頼む必要はありません。理にかなうときには、自分でそうします。
:::
