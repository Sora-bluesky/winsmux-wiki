---
title: "サブエージェントへの委任"
description: "delegate_task で切り離した子エージェントを起こし、複数の作業を並行して進める"
upstream_path: user-guide/features/delegation.md
upstream_blob: 95c7f94985425cad1c6bf84cefa43712b0843bb8
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/delegation
---

# サブエージェントへの委任 {#subagent-delegation}

`delegate_task` ツールは、切り離された文脈、引き継いだツールの権限、自分専用のターミナルのセッションを持つ子の AIAgent を起こします。子はそれぞれ新しい会話から始まり、独立して作業します。親の文脈に入るのは、最後の要約だけです。

いちばん上の階層からのモデル呼び出しは、自動的にバックグラウンドで動きます。Hermes はすぐに取っ手を返すので会話を続けられ、結果はあとから新しいメッセージとして戻ってきます。取りまとめ役のサブエージェントは、自分の作業者たちの結果をまとめてから返す必要があるので、その完了を待ちます。

## ひとつのタスク {#single-task}

```python
delegate_task(
    goal="Debug why tests fail",
    context="Error: assertion in test_foo.py line 42"
)
```

## まとめて並行実行する {#parallel-batch}

既定では同時に3つまでのサブエージェントが動きます（設定で変えられ、上限はありません）。

```python
delegate_task(tasks=[
    {"goal": "Research topic A", "context": "Focus on recent primary sources"},
    {"goal": "Research topic B", "context": "Compare the leading explanations"},
    {"goal": "Fix the build", "context": "Project root: /home/user/project"}
])
```

## サブエージェントの文脈の扱い {#how-subagent-context-works}

:::warning 重要: サブエージェントは何も知りません
サブエージェントは、**まったく新しい会話**から始まります。親の会話の履歴、それまでのツール呼び出し、委任する前に話したことについて、知識はゼロです。サブエージェントが持つ文脈は、親エージェントが `delegate_task` を呼ぶときに書き込んだ `goal` と `context` の中身だけです。
:::

ひとつだけ例外があります。親に作業ディレクトリが定まっている場合、すべてのサブエージェントのシステムプロンプトには、その作業場の**プロジェクトの文脈ファイル**が埋め込まれます（`.hermes.md` > AGENTS.md の連なり > CLAUDE.md > `.cursorrules` — メインのエージェントのシステムプロンプトと同じ探し方、同じ優先順位、同じ大きさの上限です。SOUL.md は除きます）。リポジトリの中で作業するサブエージェントは、そのリポジトリの決まりごとを自分で見つけ直さなくても、それに従って動きます。

つまり、親エージェントは、サブエージェントに必要なものを**すべて**呼び出しに込めなければなりません。

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

サブエージェントは、渡された目的と文脈から組み立てられた、焦点の絞られたシステムプロンプトを受け取ります。そこには、タスクを完了し、何をしたか・何が分かったか・変更したファイル・遭遇した問題を、決まった形にまとめて返すようにという指示が入っています。

## 実際の例 {#practical-examples}

### 並行した調べもの {#parallel-research}

複数の題目を同時に調べ、要約を集めます。

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

### レビューと修正 {#code-review-fix}

レビューして直すという流れを、まっさらな文脈へ委ねます。

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

### 複数ファイルにまたがる書き直し {#multi-file-refactoring}

親の文脈をあふれさせてしまうような大きな書き直しを委ねます。

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

## まとめて実行するときの詳細 {#batch-mode-details}

いちばん上の階層のエージェントが `tasks` の配列を渡すと、Hermes はバックグラウンドの取っ手をひとつ返し、サブエージェントを並行して動かし、すべての子が終わったあとにひとつにまとめた結果を戻します。取りまとめ役のサブエージェントは、結果をまとめてから返すために、そのターンの中で自分のまとまりを待ちます。

- **同時実行の上限:** 既定で3つ（`delegation.max_concurrent_children` または環境変数 `DELEGATION_MAX_CONCURRENT_CHILDREN` で変えられます。下限は1で、上限はありません）。上限を超えるまとまりは、黙って切り詰められるのではなく、ツールのエラーになります。
- **スレッドプール:** 設定された同時実行数を最大の作業者数として `ThreadPoolExecutor` を使います
- **進行の表示:** CLI では、各サブエージェントのツール呼び出しをツリー表示でリアルタイムに示し、タスクごとの完了行も出ます。ゲートウェイでは、進行状況はまとめられ、親の進行コールバックへ中継されます
- **結果の順番:** 結果は終わった順ではなく、タスクの番号順に並べ替えられ、入力の順番と一致します
- **取り消し:** あとから送ったメッセージでは、いちばん上の階層のバックグラウンドのまとまりは止まりません。`/stop` か、持ち主のセッションを閉じる・やり直すと、動作中の子が取り消されます。取りまとめ役の下で同期的に動く子は、これまでどおり親の中断状態に従います

取りまとめ役からのひとつだけの同期的な委任は、スレッドプールを使わず直接動きます。

### バックグラウンドの完了を取りこぼさない仕組み {#durable-background-completions}

バックグラウンドの委任が終わると、Hermes はその完了イベントを、通常の新しいターンの
待ち行列へ流す前に、有効なプロファイルの `state.db` に保存します。完了したあと、
届ける前に Hermes が再起動しても、保留中のイベントは復元され、同じ持ち主の確認を
通って届けられます。受け取り手が競合する場合は保存された引き受けの印を使うので、
その仮のターンを実際に受け取った側だけが配達を確定し、失敗した側は印を戻して
やり直せるようにします。

これは、異常終了のあとに子の実行を再開するものではありません。まだ動作中に持ち主の
プロセスが消えた委任は `unknown` として記録されます。外部への影響が起きたかどうかを、
Hermes が証明できないからです。保留中の記録も配達済みの記録も、数に上限があり、
プロファイルの中だけに留まります。

### 子のバックグラウンド処理からの通知 {#child-background-process-notifications}

サブエージェントが起こしたバックグラウンドの処理（例: `notify_on_complete` を付けた
`npm ci`）は、仕組みの上では完了や監視パターンの通知を**親**の会話へ送ります。子より
長生きするものには、確実に受け取れる相手が必要だからです。ただし既定では、これらの
通知は親のチャットでは**抑えられます**。届けたいものは子がまとめた委任の結果であって、
子の内部のビルドから来る「処理が終わりました」という壁が会話の途中に立つのは雑音
だからです。抑えられたイベントは、処理のセッション ID とサブエージェントのタスク ID
とともにデバッグ水準で記録されるので、あとから調べることはできます。

委任の結果そのものが抑えられることはありません。子の処理の通知を再び届けたい場合は
次のように設定します（それぞれに「Started by subagent …」という出どころの行が付きます）。

```yaml
delegation:
  surface_child_process_notifications: true   # default: false
```

## モデルの上書き {#model-override}

`config.yaml` で、サブエージェント用に別のモデルを設定できます。単純なタスクを、安くて速いモデルへ委ねたいときに役立ちます。

```yaml
# In ~/.hermes/config.yaml
delegation:
  model: "google/gemini-flash-2.0"    # Cheaper model for subagents
  provider: "openrouter"              # Optional: route subagents to a different provider
```

省略した場合、サブエージェントは親と同じモデルを使います。

### 費用の考え方: 計画は最前線のモデル、作業は安いモデル {#cost-strategy-frontier-planner-inexpensive-workers}

問題を、きちんと仕様の定まった小さなタスクに分けるには、最前線のモデルの判断力が要ります。一方、明確な目的・十分な文脈・出力の約束がそろったタスクをこなすだけなら、たいていはそこまで要りません。そしてトークンを食うのは子のほうです。サブエージェントを並行して動かすと、実行全体のトークンの大半はそこで燃えるので、費用が実際に生まれる場所は作業側のモデルです。メインのセッションは最前線のモデルのままにして、`delegation.model` を安いモデルに固定すれば、計画の質は要るところに残したまま、量の出るところで支出を減らせます。

```yaml
# ~/.hermes/config.yaml
model:
  default: "your-frontier-model"     # parent (planner) stays on the frontier model
delegation:
  model: "your-inexpensive-model"    # all delegate_task children run on this
  provider: "openrouter"             # optional: route children to a different provider
```

解決の順序はこうです。まず `delegation.base_url`（接続先の直接指定）が優先され、次に `delegation.provider`（実行時のプロバイダの仕組みで解決される、資格情報一式）が使われ、どちらも設定されていなければ子は親のプロバイダと資格情報を引き継ぎます。`delegation.model` はどの場合でも適用され、空なら子は親のモデルを引き継ぎます。`delegation.base_url` と一緒に `delegation.provider` を設定すると、明示した接続先はそのまま使いつつ、そのプロバイダのリクエストの上書きと出力トークンの上限が子へ引き継がれます。明示的な `delegation.request_overrides` の辞書は、どの経路でも尊重され、実行時に導かれた値の上に重ねられます（後述の [設定](#configuration) を参照してください）。

なお、この固定は全体に効きます。`delegate_task` にはタスクごとのモデルの指定がないので、まとまりの中のすべての子が、設定された委任用のモデルで動きます。より強いモデルが必要な、質の問われるタスクには、そのセッションでは `delegation.model` を設定しないでおくか、タスクごとのモデルの上書きに対応している [かんばんボード](/hermes/docs/user-guide/features/kanban/#per-task-model-override) にタスクを渡してください。

## `/review` コマンド {#the-review-command}

`/review` は、独立した、権限を絞らないバックグラウンドのサブエージェントを起こします。その仕事は、いまの会話が作り出したもの（PR、差分、コード、ドキュメント、設計）をレビューすることだけです。CLI、TUI、デスクトップアプリ、そしてすべてのゲートウェイのメッセージングのプラットフォームで動きます。

```
/review                       # review whatever the last 10 messages presented
/review focus on security     # add extra instructions for the reviewer
```

何が起きるか:

1. 直近10件のユーザーとアシスタントのメッセージが、レビュー担当の出発点となる材料として切り取られます（ツールの出力とシステムのメッセージは除きます）。
2. レビュー担当のサブエージェントは、`delegate_task` と同じバックグラウンドの委任の仕組みで送り出されます。通常のサブエージェントと同じツール一式（ターミナル、Web、ファイル、ブラウザなど）を持つので、抜粋だけで判断するのではなく、実際に PR を開き、差分を読み、コードを動かします。
3. レビュー担当は、主となるエージェントの作業の文脈を引き継ぎます。主となるエージェントが読み込んでいたスキル（起動時に読み込んだもの、セッション中に `skill_view` で読み込んだもの）は、それを読み込んでその決まりごとに照らして評価するようにという指示とともに、説明の中で名前を挙げられます。ほかのサブエージェントと同じく、そのシステムプロンプトには、作業場のプロジェクトの文脈ファイル（AGENTS.md / CLAUDE.md / .cursorrules）が、守るべき決まりごととして埋め込まれます。
4. 終わると、そのレビュー全文が、通常のバックグラウンドのサブエージェントの完了として同じセッションへ戻ります。主となるエージェントはそれを見て、動くことができます（指摘を直す、追加の対応を出す、あなたに返す）。

典型的な流れはこうです。メインのエージェントが PR を開き、あなたが `/review` と打つと、あなたが作業を続けている間に第二の目がそれを調べます。レビューは、その PR を作ったエージェント宛てとしてチャットに戻ってきます。

### レビュー用のモデル {#review-model}

既定では、レビュー担当はメインのモデルで動きます。専用のレビュー用モデルを固定するには、`config.yaml` に `auxiliary.review` を設定します。

```yaml
auxiliary:
  review:
    provider: openrouter               # or nous, anthropic, a direct base_url, ...
    model: anthropic/claude-opus-4.6   # a strong reviewer model
```

資格情報は `delegation.provider` の固定とまったく同じように解決されます（base_url、api キー、api_mode を含む、実行時のプロバイダの一式）。`model` が空のままの `provider: auto` は「メインのエージェントのモデルを引き継ぐ」という意味で、これが既定です。

`/review` は `/refine` とは意図的に別物です。`/refine` は会話をレビューして記憶とスキルを更新し、`/review` は会話が作り出した*成果物*をレビューします。

## 引き継がれるツールの権限 {#inherited-tool-access}

`delegate_task` には、モデルが指定できる `toolsets` の引数はありません。各サブエージェントは親の有効なツールセットを引き継ぐので、モデルが親の持たない権限を子に与えることはできません。委ねる作業に追加の権限が必要なら、会話を始める前に親のツールを設定してください。

親が持っていても、サブエージェントには使えないツールがあります。
- `delegate_task` — 末端のサブエージェント（既定）では使えません。`role="orchestrator"` の子では残り、`max_spawn_depth` で制限されます — 後述の [深さの上限と入れ子の取りまとめ](#depth-limit-and-nested-orchestration) を参照してください。
- `clarify` — サブエージェントはユーザーとやり取りできません
- `memory` — 共有される、残り続ける記憶への書き込みはできません
- `send_message` — プラットフォームをまたいだ影響は起こせません
- `cronjob` — 親の名前でさらに作業を予約することはできません

どちらの役割でも `execute_code`（プログラムからのツール呼び出し）は残るので、子は機械的な作業をまとめて片づけられます。

## 繰り返しの上限 {#max-iterations}

サブエージェントには、ツールを呼ぶターンを何回まで重ねられるかの上限があります（既定は50）。

```python
delegate_task(
    goal="Quick file check",
    context="Check if /etc/nginx/nginx.conf exists and print its first 10 lines",
    max_iterations=10  # Simple task, don't need many turns
)
```

## 子の時間の上限 {#child-timeout}

既定では、サブエージェントに**実時間での打ち切りはありません**。子が失敗するのは、実際にやっていることが原因のときだけです — API のエラー、ツールのエラー、繰り返しの上限に達したときで、委任の側のストップウォッチで止まることはありません。以前の版には固い上限がありました（300秒、のちに600秒）が、それが正当に忙しい子を作業の途中で殺し続けていました。深いコードレビュー、大きく広がる調べもの、遅い推論モデルは、ずっと着実に進んでいながら10分を超えることが普通にあります。

本当に行き詰まった子は、いまでも検出されます。子が何も進めていないとき（API 呼び出しも、ツールの開始も、活動時刻の更新もない状態）、鼓動の停滞を見張る仕組みが親の活動の更新を止めるので、本当に固まった作業者に対してはゲートウェイの無活動の打ち切りが働きます。モデルからの応答を待っている状態は進行として数えられます。サブエージェントはプロバイダを待っている間も活動の時計を更新するので、手元の遅いモデルや長い前処理を伴う応答が、停滞とみなされることはありません。

それでも固い上限が欲しい場合（たとえば、人の見ていない cron からの委任で費用を抑えたいとき）は、環境ごとに自分で有効にできます。

```yaml
delegation:
  child_timeout_seconds: 0     # default: 0 = no timeout
  # child_timeout_seconds: 1800  # opt-in hard cap (floor 30s)
```

正の値を入れると、子ごとに実時間での固い上限が働きます。`0` または負の値で無効になります。

設定した上限が働いたとき、子の結果には、エラーの文言とは別に、決まった形の打ち切りの
情報が付きます。親やフックが、文字列を読み解かなくてもストップウォッチによる停止と
ほかの失敗を見分けられるようにするためです: `timeout_seconds`（設定した上限）、
`timed_out_after_seconds`（実際の経過時間）、`timeout_phase`（子が最初のリクエストに
たどり着かなかった場合は `before_first_llm_call`、それ以外は `after_llm_calls`）。
打ち切り以外のエラーでは、この3つはすべて `null` です。

## 失敗が見えること {#failure-visibility}

失敗したサブエージェント — 再試行できないプロバイダのエラー（404／400）、打ち切り、異常終了、使える出力がない — が黙って消えることはありません。

- **CLI**: 委任のツリーが、理由を1行で表示します: `⚠️ Subagent failed — "your goal": HTTP 404: model not found (after 12s)`。まとめて実行した場合は、タスクごとの `✗` の完了行に理由が付きます。
- **ゲートウェイのプラットフォーム**（Telegram、Discord、Slack など）: 同じ短い行が、独立したチャットのお知らせとして届きます。そのプラットフォームで **`tool_progress` が無効でも**届きます。
- **親エージェント**: ツールの結果の項目に `status: "failed"` と `error` の全文が入るので、モデルが対応できます（やり直す、経路を変える、報告する）。

エラーの文言は、いちばん情報のある1行（例外のメッセージであって、スタックトレースの壁ではありません）まで絞られ、長さにも上限があります。

:::tip API 呼び出しゼロで打ち切られたときの診断情報
固い上限を設定している場合、サブエージェントが API 呼び出しを**一度も**しないまま打ち切られたとき（多くは、プロバイダにつながらない、認証の失敗、ツールの定義が拒否された、のいずれかです）、`delegate_task` は `~/.hermes/logs/subagent-timeout-<session>-<timestamp>.log` に、決まった形の診断情報を書き出します。中身は、サブエージェントの設定の写し、資格情報の解決の記録、初期のエラーメッセージ、それに**すべての**生きているスレッドのスタックトレース（子自身のものだけではありません）です。入れ子の補助スレッドを待って止まっている子は、全体が見えないと、遅いプロバイダと見分けがつかないからです。
:::

## バックグラウンドのサブエージェントの停滞の検出 {#stall-detection-for-background-subagents}

バックグラウンドの委任（`delegate_task(background=true)`）は、**進行に基づく停滞の
見張り**が見ています。既定で有効で、設定は要りません。実時間での打ち切りと違い、
どれだけ長く動いていても、進んでいる子には手を出しません。

この見張りは、切り離された各子の進行の信号 — API 呼び出しの回数、いま使っている
ツール、最後の活動の時刻（これは**流れてくるトークン1つごと**、ツールの切り替え、
API 呼び出しの区切りで進むので、長い応答の途中にいる子は常に生きているとみなされます）
— を見ています。

1. **進んでいる子には決して手を出しません。** 何かひとつでも進めば、時計は戻ります。
2. 停滞のしきい値を超えて進行が完全に止まった子（何もしていない状態で450秒、ツールの
   中にいる場合は1200秒 — 正当に遅いターミナルのコマンドや Web の取得には高いほうの
   上限が当てられます）は**中断され**、120秒の猶予が与えられます。その間に片づけを
   終えた子は、通常の完了の経路で途中までの結果を届けます。
3. それでも戻らない子は、`stalled` という終端の完了イベントで強制的に締められます。
   持ち主のセッションは黙り込む代わりに結果を受け取り、非同期の枠も新しい作業のために
   空きます。

`stalled` のイベントには、同期の経路の打ち切りの項目と対になる、決まった形の情報が
付きます: `stalled_after_quiet_seconds`、`stall_threshold_seconds`、
`stall_phase`（`idle` / `in_tool`）、`stall_grace_seconds`。

これによって、行き詰まったバックグラウンドの子が、プロセスを再起動するまでセッションを
死んだように見せる、という長年の失敗の形が閉じられました。その根っこにあった詰まり
（何日も動き続けたゲートウェイで、子が最初の API 呼び出しで止まる）も、大元から
直されています。委ねられた子は、入れ子の作業スレッドではなく、自分の会話のスレッド上で
OpenAI 形式の API リクエストを直接動かすようになりました。詰まりが住んでいたのは、
まさにその層でした。停滞の見張りは、それ以外の何かのための安全網として残っています。

## 動作中のサブエージェントを見る（`/agents`） {#monitoring-running-subagents-agents}

TUI には `/agents` の重ね表示（別名 `/tasks`）があり、入れ子に広がる `delegate_task` を、きちんと見て確かめられる場所に変えます。

- 動作中と、最近終わったサブエージェントの、親ごとにまとめた生きたツリー表示
- 枝ごとの費用、トークン、触れたファイルの集計
- 停止と一時停止の操作 — 兄弟を止めずに、特定のサブエージェントだけを途中で取り消せます
- あとからの確認: 親へ返ったあとでも、各サブエージェントのターンごとの履歴をたどれます

従来の CLI では `/agents` は文字の要約を出すだけで、この重ね表示が活きるのは TUI です。[TUI — スラッシュコマンド](/hermes/docs/user-guide/tui/#slash-commands) を参照してください。

従来の CLI と、すべてのゲートウェイのプラットフォーム（Telegram、Discord、Slack など）
では、`/agents` は**バックグラウンドの委任を、子ごとの生きた活動とともに**一覧します。
情報は、動作中の各子から直接取られます。

```
Background delegations: 1 running
- deleg_ab12cd34 · running · research the delegation stall monitor
  - child 1: 4 api calls · in web_search · active 12s ago
  - child 2: 7 api calls · between turns · active 3s ago
```

停滞の見張りが印を付けた委任は
`stalling · no progress 450s — interrupting` と表示され、長く静かでも健全な子は
その静かな時間を表示するので、「遅い」のか「詰まっている」のかが一目で分かります。

## 動作中のサブエージェントの軌道修正 {#steering-a-running-subagent}

子を中断すると、進めていた作業が捨てられます。多くの場合、やりたいのは向きを変えることだけのはずです。

### 親エージェントから（モデル側の操作） {#from-the-parent-agent-model-facing}

親エージェントは、子を起こしたのと同じ `delegate_task` ツールで、自分の動作中の子を操作します。別の制御用のツールはありません。

```json
{"action": "list"}
{"action": "steer", "subagent_id": "sa-0-1a2b3c4d", "message": "focus on pricing instead"}
{"action": "stop",  "subagent_id": "sa-0-1a2b3c4d"}
```

- **`list`** は、その会話の生きている子を返します: `subagent_id`、目的、状態、`running_seconds`、`accepting_steer`、それに生きた記録のパスです。ID は、子を起こしたときの応答にも `subagent_ids` として返ります。
- **`steer`** は、動作中の子を止めずに、進む方向の修正を待ち行列へ入れます（届き方は後述します）。
- **`stop`** は、子を次の区切りで早めに終わらせます。途中までの結果は、通常の完了メッセージとして会話へ戻ります。

これらの操作は、そのターンの中で同期的に動き（バックグラウンドにはなりません）、呼び出した側自身が起こした木の範囲に限られ（ある会話が別のセッションの子を見たり操作したりすることはできません）、ターンごとのサブエージェントの起動上限も消費しません。ですから、上限に達したあとでも `stop` は使えます。

### TUI やゲートウェイから（セッション側の操作） {#from-the-tui-gateway-session-facing}

`tools/delegate_tool.py` の `steer_subagent(subagent_id, text)` は、`interrupt_subagent()` の、向きを変える側の対になるものです。[`/steer`](/hermes/docs/reference/slash-commands/) と同じ仕組みで、生きている子へテキストを流し込みます。テキストは次の区切りで子の直前のツールの結果に付け足され、実行中のツール呼び出しが切られることはなく、子はそれを会話の外から来たユーザーのメッセージとして受け取ります。プログラムから使う側は、`subagent.interrupt` の隣にある、セッション単位の `subagent.steer` というゲートウェイの RPC を通じて呼び出します。

```json
{"method": "subagent.steer", "params": {"session_id": "owning-ui-session", "subagent_id": "sa-0-1a2b3c4d", "text": "focus on pricing instead"}}
```

サブエージェントの ID は `delegation.status`（または `list_active_subagents()`）から得られます。`subagent.interrupt` が使うのと同じ場所です。ゲートウェイは、その子を起こしたまさにその生きた UI ／ゲートウェイのセッションからしか、軌道修正を受け付けません。存在しない、別の、あいまいな、あるいは古くて使い回されたセッションの識別は拒否されます。全体で通用するサブエージェントの ID を知っていることは、権限にはなりません。プロセス内から直接呼ぶ場合は、範囲を絞らない補助関数の約束が意図的に残されています。

**待ち行列に入ることは、届いたことではありません。ただし、見せかけの成功でもありません。** `"queued"` という応答は、子が完了する区切りより前にテキストが受け付けられたという意味であって、子がそれを見たとは限りません。受け付けと完了は同期がとられています。子がまだそのテキストを取り込めるか、あるいはそのテキストがそのまま結果へ `pending_steer` として流し込まれるかの、どちらかです。閉じたあとの呼び出しは `"rejected"` を返します。子が軌道修正を受け付けたものの、すでに最終的な答えを出していた場合、親が受け取る完了の項目にはそれが `missed_steer` として残り、要約に注記が付きます。

```
[steer did not land — the subagent finished before it could be delivered: focus on pricing instead]
```

こうして親（あるいはそれを動かしている人）は、軌道修正が効いた子と、古い指示のまま終わった子を見分けられ、届いたと思い込む代わりに、指示を改めて出し直せます。

## 生きた記録 {#live-transcripts}

`delegate_task` を送り出すたびに、**タスクごとに1つの、追記だけの、人が読める記録**も作られます。まとまった要約を待たずに、あなた（や親エージェント）がサブエージェントの作業をその場で見られるようにするためです。

```
<hermes_home>/cache/delegation/live/<delegation_id>/task-<n>.log
```

送り出したときの応答には、そのパスが `live_transcripts` として入ります。ファイルは送り出しの時点で先に作られるので、すぐに使えます。

```bash
tail -f ~/.hermes/cache/delegation/live/deleg_ab12cd34/task-0.log
```

各行には時刻が付き、子のアシスタントとしての発言、思考の断片、ツール呼び出し（`-> tool_name({args})`）、ツールの結果、最後の状態の印が並びます。同じディレクトリの `manifest.json` が、そのまとまり（目的、タスク数、タスクごとの状態）を説明します。この記録は完了後も残り、要約と並ぶ、忠実な運用の記録にもなります。7日より古いディレクトリは、新しい送り出しのときに自動で片づけられます。`cache/delegation` の下にあるので、離れた場所のターミナルのバックエンド（Docker／Modal／SSH）からも読めます。

## 深さの上限と入れ子の取りまとめ {#depth-limit-and-nested-orchestration}

既定では、委任は**平ら**です。親（深さ0）が子（深さ1）を起こし、その子はそれ以上委任できません。委任が果てしなく入れ子になるのを防ぐためです。

多段階の流れ（調べもの → まとめ、あるいは小問題ごとの並行した取りまとめ）のために、親は自分の作業者を起こせる**取りまとめ役**の子を起こせます。

```python
delegate_task(
    goal="Survey three code review approaches and recommend one",
    role="orchestrator",  # Allows this child to spawn its own workers
    context="...",
)
```

- `role="leaf"`（既定）: 子はそれ以上委任できません — 平らな委任と同じ動作です。
- `role="orchestrator"`: 子は `delegation` のツールセットを保ちます。`delegation.max_spawn_depth`（既定は **1** = 平ら。したがって既定のままでは `role="orchestrator"` は何もしません）で制限されます。`max_spawn_depth` を2に上げると、取りまとめ役の子が末端の孫を起こせるようになります。3以上でさらに深くなります。上限はありません — 実際に効いてくるのは費用です。
- `delegation.orchestrator_enabled: false`: `role` の指定にかかわらず、すべての子を `leaf` にする全体の停止スイッチです。

**費用への注意:** `max_spawn_depth: 3` と `max_concurrent_children: 3` では、木は 3×3×3 = 27 の末端エージェントが同時に動くところまで広がります。階層がひとつ増えるごとに支出は掛け算になります。`max_spawn_depth` を上げるのは、意図してからにしてください。

## 寿命と確実さ {#lifetime-and-durability}

:::warning バックグラウンドの完了が確実なことと、実行そのものが確実なことは別です
モデルから呼ぶいちばん上の階層の `delegate_task` は、あとから結果を届けられるセッションであれば、自動的にバックグラウンドで動きます。Hermes はすぐに取っ手を返し、子やまとまりが終わったあとに結果が会話へ戻ります。取りまとめ役のサブエージェントは、作業者たちの結果をまとめてから返す必要があるので、そのターンの中で待ちます。状態を持たないリクエスト・レスポンス型の接続先では、切り離した結果をあとで届けられないため、同期的な実行に切り替わります。

- 通常のあとからのメッセージでは、バックグラウンドの子は取り消されません。`/stop` は動作中のバックグラウンドの委任を取り消し、持ち主のセッションを閉じる・やり直すと、動作中の子は破棄されます。
- 明示的にセッションを閉じる・やり直すと、そのセッションのバックグラウンドの子が中断されます。ゲートウェイが持つセッションを見ていた TUI の画面を閉じても、ゲートウェイ側の作業は止まりません。
- Hermes のプロセスを再起動しても、動作中の子は**再開しません**。どの影響が起きたかを Hermes が証明できないため、その試行は `unknown` になります。
- 再起動の前に完了していたものの、結果が届いていなかった子は復元され、持ち主のセッションの通常の確認を通って戻されます。
- 取り消された子は決まった形の結果（`status="interrupted"`、`exit_reason="interrupted"`）を返しますが、親も一緒に中断されているため、その結果がユーザーの目に見える返信まで届かないことも多いです。

セッションを閉じたり、プロセスを再起動したりしても生き残らなければならない**確実な実行**には、次を使ってください。

- `cronjob`（action=`create`） — 別のエージェントの実行を予約します。親のターンの中断の影響を受けません。
- `terminal(background=True, notify_on_complete=True)` — エージェントが別のことをしている間も動き続ける、時間のかかるシェルコマンドです。
:::

## 主な性質 {#key-properties}

- サブエージェントはそれぞれ**自分専用のターミナルのセッション**を持ちます（親とは別です）
- サブエージェントは親の有効なツールセットを引き継ぎます。モデルが呼び出しごとに選んだり広げたりすることはできません
- **入れ子の委任は、自分で有効にするものです** — さらに委任できるのは `role="orchestrator"` の子だけで、しかも `max_spawn_depth` を既定の1（平ら）から上げたときだけです。全体で止めるには `orchestrator_enabled: false` を設定します。
- 末端のサブエージェントは `delegate_task`、`clarify`、`memory`、`send_message`、`cronjob` を呼び**出せません**。取りまとめ役のサブエージェントは `delegate_task` を保ちますが、ほかの制限はそのままです。どちらの役割でも `execute_code`（プログラムからのツール呼び出し）は残るので、子は推論の回数を使い切る代わりに、機械的な作業をまとめて片づけられます。
- **取り消しは持ち主に従います** — `/stop` か、持ち主のセッションを閉じる・やり直すと、そのバックグラウンドの子が取り消されます。取りまとめ役の下で同期的に動く子孫は、親の中断状態に従います
- 親の文脈に入るのは最後の要約だけなので、トークンの消費が抑えられます
- サブエージェントは、親の **API キー、プロバイダの設定、資格情報のプール**を引き継ぎます（利用制限に当たったときのキーの入れ替えが働きます）

## 作業ツリーによる分離 {#worktree-isolation}

既定では、サブエージェントは親の作業ディレクトリを共有します。調べものや読むことが
中心の作業には問題ありませんが、同じリポジトリを複数の子が同時に編集するとぶつかる
ことがあります。`delegation.worktree_isolation: true` を設定すると、リポジトリの現在の
`HEAD` から分岐した、子ごとの git の作業ツリーが与えられます（Muse Code の
`--subagent-worktree-isolation` に着想を得ています）。

```yaml
delegation:
  worktree_isolation: true   # default: false
```

分離を有効にすると:

- 各子は、自分のブランチ `hermes-subagent/subagent-<id>` の上で、
  `<repo>/.worktrees/subagent-<id>` からターミナルを始めます。目的のメッセージにも、
  そこで作業してコミットするようにと書かれます。
- 親のチェックアウトはそのまま残り、子どうしが互いの編集を壊すことはありません。
- 子が終わると、その結果の項目に `worktree` の欄が加わり、`path`、`branch`、
  `commits`（基点からの進み）、`dirty` を報告します。親は、それぞれのブランチを
  確認したり取り込んだりします（`git log <branch>`、`git merge <branch>`）。
- **コミットがなく、きれいなままの**作業ツリーは自動で片づけられます
  （`pruned: true`）。作業を抱えているものは残ります。
- 片づけには裏付けが要ります。git の調査が失敗した場合、あるいは締めの処理そのものが
  エラーになった場合、作業ツリーとブランチは残され、その項目には
  `inspection_failed: true` と `note` が付きます。このとき `commits` と `dirty` は
  実測ではなく既定値なので、子が何も作らなかったと決めつけず、作業ツリーを自分で
  確かめてください。

適用の範囲: 自分で有効にするもので、git のみ、しかも手元のターミナルのバックエンド
だけです。git 管理下でないディレクトリ、docker／ssh／modal のバックエンド、あるいは
作業ツリーの作成に失敗した場合は、この設定は黙って今までどおりの共有の作業場の動作へ
下がります。エラーにはなりません。

## delegate_task と execute_code の違い {#delegation-vs-executecode}

| 観点 | delegate_task | execute_code |
|--------|--------------|-------------|
| **推論** | LLM の推論のループがまるごと動きます | Python のコードを実行するだけです |
| **文脈** | 切り離されたまっさらな会話 | 会話はなく、スクリプトだけです |
| **ツールの権限** | 禁止されていないすべてのツールを、推論とともに使えます | RPC 経由の7つのツール、推論なし |
| **並行実行** | 既定で3つのサブエージェントを同時に（設定で変えられます） | ひとつのスクリプト |
| **向いている用途** | 判断の要る、込み入ったタスク | 機械的な多段の処理 |
| **トークンの費用** | 高め（LLM のループがまるごと動くため） | 低め（標準出力だけが返るため） |
| **ユーザーとのやり取り** | なし（サブエージェントは確認できません） | なし |

**目安:** 小タスクに推論・判断・多段の問題解決が要るなら `delegate_task` を使ってください。機械的なデータ処理や、手順の決まった流れなら `execute_code` を使ってください。

## 設定 {#configuration}

```yaml
# In ~/.hermes/config.yaml
delegation:
  max_iterations: 50                        # Max turns per child (default: 50)
  # max_concurrent_children: 3              # Parallel children per batch (default: 3)
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

`base_url` が Anthropic 互換の接続先（たとえば `/anthropic` で終わるパス、Azure Foundry の Claude の経路、MiniMax の `/anthropic` の中継）を指しているときは、`api_mode` は `anthropic_messages` として自動的に判別されるので、何も設定しなくてもサブエージェントが正しい通信形式を使います。この自動判別が外れる（まれな）ときだけ、`api_mode` を明示してください。

`delegation.request_overrides` は、**3つすべて**の解決の経路 — 直接の `base_url`、名前付きの `provider`、そのまま引き継ぐ場合 — で働くので、必ず効きます。最上位のキーは API の引数（例: `service_tier`）で、`extra_body` の下位の辞書はリクエストの `extra_body` へ統合されます。明示した値は、実行時や親から導かれた上書きの**上に**重なります。最上位のキーは明示したほうが勝ち、`extra_body` は一段階だけ深く統合されるので、プロバイダ自身のリクエストの癖（例: `thinking: {type: disabled}`）は、あなたのキーがそれを定義し直さない限り残ります。詳しくは [設定 → 委任](/hermes/docs/user-guide/configuration/#delegation) を参照してください。

:::tip
エージェントは、タスクの込み入り具合に応じて委任を自分で扱います。委任するように明示して頼む必要はありません — 理にかなうときには、そうしてくれます。
:::
