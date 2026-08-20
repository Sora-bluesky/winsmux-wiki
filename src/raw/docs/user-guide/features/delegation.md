---
title: "サブエージェントへの委任"
description: "delegate_task で子エージェントを切り離して立ち上げ、複数の作業を並行して進めます"
upstream_path: user-guide/features/delegation.md
upstream_blob: 15d27cc20eb53ce4fa8ad90e08895e0295840815
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/delegation
---

# サブエージェントへの委任 {#subagent-delegation}

`delegate_task` ツールは、独立した文脈と、親から引き継いだツール、そして自分専用の端末セッションを持つ子の AIAgent を立ち上げます。子はそれぞれまっさらな会話から始まり、単独で作業を進めます。親の文脈に入ってくるのは、最後にまとめた要約だけです。

いちばん上の階層のモデルからの呼び出しは、自動的に裏側で走ります。Hermes はすぐに引換券を返すので会話はそのまま続けられ、結果が出たらあらためて新しいメッセージとして届きます。指揮役のサブエージェントは、自分の配下の作業を待ってから結果をまとめて返します。

## ひとつの作業を任せる {#single-task}

```python
delegate_task(
    goal="Debug why tests fail",
    context="Error: assertion in test_foo.py line 42"
)
```

## まとめて並行させる {#parallel-batch}

既定では同時に動くサブエージェントは3つまでです（設定で変えられ、上限は決まっていません）。

```python
delegate_task(tasks=[
    {"goal": "Research topic A", "context": "Focus on recent primary sources"},
    {"goal": "Research topic B", "context": "Compare the leading explanations"},
    {"goal": "Fix the build", "context": "Project root: /home/user/project"}
])
```

## サブエージェントの文脈はどうなっているか {#how-subagent-context-works}

:::warning 重要: サブエージェントは何も知りません
サブエージェントは**まったく新しい会話**から始まります。親の会話の履歴も、それまでのツール呼び出しも、委任する前に話していた内容も、いっさい知りません。サブエージェントが持てる手がかりは、親が `delegate_task` を呼ぶときに書き入れた `goal` と `context` の中身だけです。
:::

つまり親のエージェントは、サブエージェントに必要なものを**すべて**その呼び出しに載せなければなりません。

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

サブエージェントには、渡された goal と context から組み立てた、用途を絞った指示文が渡されます。その指示は、作業をやり遂げたうえで、何をしたか、何がわかったか、どのファイルを直したか、どんな不具合に当たったかを決まった形でまとめるよう伝えます。

## 実際の使いどころ {#practical-examples}

### 調べものを並行させる {#parallel-research}

複数の題材を同時に調べさせて、要約を集めます。

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

### 点検して直すところまで {#code-review-fix}

点検と修正を続けて行う流れを、まっさらな文脈へ任せます。

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

### 多数のファイルにまたがる書き換え {#multi-file-refactoring}

親の文脈をあふれさせてしまうような大がかりな書き換えを任せます。

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

## まとめて渡すときの細かい話 {#batch-mode-details}

いちばん上の階層のエージェントが `tasks` の配列を渡すと、Hermes は裏側の引換券をひとつ返し、サブエージェントを並行して走らせ、子が全部終わったところで結果をひとつにまとめて届けます。指揮役のサブエージェントの場合は、結果をまとめてから返す必要があるので、そのターンの中で自分の配下を待ちます。

- **同時に動かせる数:** 既定では3つです（`delegation.max_concurrent_children` か環境変数 `DELEGATION_MAX_CONCURRENT_CHILDREN` で変えられます。下限は1で、上限は決まっていません）。この数を超える束を渡すと、黙って切り詰めるのではなくツールの誤りとして返ります
- **スレッドプール:** `ThreadPoolExecutor` を使い、設定した同時実行数をそのまま最大の働き手の数にします
- **進み具合の表示:** CLI では、それぞれのサブエージェントのツール呼び出しが樹形図で刻々と見え、作業ごとに終了の行が出ます。ゲートウェイでは進み具合がまとめられ、親側の進捗の受け口へ中継されます
- **結果の並び:** 終わった順に関わらず、渡したときの順番に合うよう作業の番号で並べ替えられます
- **取り消し:** 後から送ったメッセージでは、いちばん上の階層の裏側の束は止まりません。`/stop` か、持ち主のセッションを閉じる・やり直すと、その配下の子が止まります。指揮役の下で同期して動いている子は、これまでどおり親の中断の状態に従います

指揮役からひとつだけ同期で任せる場合は、スレッドプールを挟まずそのまま走ります。

### 裏側で終わった分を取りこぼさない {#durable-background-completions}

裏側の委任が終わると、Hermes はその完了の記録を、いま使っている
プロファイルの `state.db` に書いてから、通常の新しいターンの待ち行列へ
流します。完了したあと届く前に Hermes が再起動しても、保留中の記録は
戻され、同じ持ち主の確認を通って届きます。受け取り手が複数いる場合は
記録に印を付けて取り合うので、差し込まれたターンを受け取れた側だけが
受領を返し、取り損ねた側は印を手放して次の機会に回します。

これは、落ちたあとに子の実行を再開する仕組みではありません。まだ走って
いる最中に持ち主のプロセスが消えた委任は `unknown` として記録されます。
外に及ぶ影響がどこまで起きたのかを Hermes が示せないからです。保留分も
配達済み分も、記録の数には上限があり、プロファイルごとに分かれています。

## 使うモデルを差し替える {#model-override}

`config.yaml` を書けば、サブエージェントだけ別のモデルにできます。手のかからない作業を、安く速いモデルへ任せたいときに便利です。

```yaml
# In ~/.hermes/config.yaml
delegation:
  model: "google/gemini-flash-2.0"    # Cheaper model for subagents
  provider: "openrouter"              # Optional: route subagents to a different provider
```

書かなければ、サブエージェントは親と同じモデルを使います。

### 費用の考え方: 段取りは最上位のモデル、手を動かすのは安いモデル {#cost-strategy-frontier-planner-inexpensive-workers}

問題をきちんと切り分けて小さな作業に落とすには、最上位のモデルの判断力が要ります。一方、はっきりした目的と十分な材料、そして出力の決まりまで揃った作業をこなすほうは、たいていそこまでの力を必要としません。そしてトークンを食うのは子のほうです。サブエージェントを並行させると、その走行全体のトークンの大半は子が使います。つまり費用は働き手のモデル側にあります。`delegation.model` を安いモデルに固定し、自分の本体のセッションは最上位のモデルのままにしておくと、肝心の段取りの質は保ったまま、量がかさむところの支出を削れます。

```yaml
# ~/.hermes/config.yaml
model:
  default: "your-frontier-model"     # parent (planner) stays on the frontier model
delegation:
  model: "your-inexpensive-model"    # all delegate_task children run on this
  provider: "openrouter"             # optional: route children to a different provider
```

決まる順番はこうです。まず `delegation.base_url`（接続先を直に指す書き方）が優先され、次に `delegation.provider`（実行時の提供元の仕組みを通して、認証情報も含めてひとそろい解決されます）、どちらも書かれていなければ子は親の提供元と認証情報をそのまま引き継ぎます。`delegation.model` はどの場合にも効き、空のままなら子は親のモデルを引き継ぎます。

なお、この固定は全体に効きます。`delegate_task` には作業ごとにモデルを指定する引数がないので、束の中の子はすべて設定した委任用のモデルで動きます。質が問われて強いモデルが要る作業では、そのセッションでは `delegation.model` を書かないでおくか、作業ごとのモデル指定に対応している [かんばん](/hermes/docs/user-guide/features/kanban/#per-task-model-override) に渡してください。

## ツールは親から引き継ぐ {#inherited-tool-access}

`delegate_task` に、モデルから指定できる `toolsets` の引数はありません。サブエージェントは親で有効になっているツールの組をそのまま引き継ぐので、親が持っていない力をモデルが子に与えることはできません。任せる作業に別の力が要るなら、会話を始める前に親側のツールを設定しておいてください。

親が持っていても、サブエージェントには使えないツールがあります。

- `delegate_task` — 末端のサブエージェント（既定）では使えません。`role="orchestrator"` の子だけが持ち続けられ、その範囲は `max_spawn_depth` で区切られます。下の [階層の上限と入れ子の指揮](#depth-limit-and-nested-orchestration) を参照してください。
- `clarify` — サブエージェントは利用者とやりとりできません
- `memory` — 全体で共有する記憶には書き込めません
- `send_message` — 外のサービスに影響を及ぼすことはできません
- `cronjob` — 親の名前で新しい仕事を予約することはできません

どちらの役割でも `execute_code`（プログラムからツールを呼ぶ仕組み）は残るので、子は機械的な作業をまとめて片づけられます。

## ターン数の上限 {#max-iterations}

サブエージェントには、ツールを呼びながら進められるターン数の上限があります（既定は50）。

```python
delegate_task(
    goal="Quick file check",
    context="Check if /etc/nginx/nginx.conf exists and print its first 10 lines",
    max_iterations=10  # Simple task, don't need many turns
)
```

## 子の時間切れ {#child-timeout}

既定では、サブエージェントに**実時間での時間切れはありません**。子が失敗するのは、実際にやっていることが原因のとき、つまり API の誤り、ツールの誤り、ターン数の上限に達したときだけで、委任の側のストップウォッチで打ち切られることはありません。以前の版には固い上限（はじめは300秒、のちに600秒）があり、まっとうに働いている子を途中で殺し続けていました。踏み込んだコードの点検、大きく広げた調べもの、じっくり考えるモデルなどは、ずっと着実に進んでいても10分を超えるのが普通です。

本当に行き詰まった子は、それでも見つけられます。子がまったく進まなくなると（API を呼ばない、ツールを開始しない、活動の時刻も刻まれない）、鼓動の古さを見張る仕組みが親の活動の更新をやめるので、本当に固まった働き手に対してはゲートウェイの無反応での時間切れが働きます。モデルの返事を待っている最中は進んでいる扱いです。サブエージェントは提供元からの返事を待つ間も活動の時計を進めるので、手元の遅いモデルや、前置きの長い応答が止まっていると見なされることはありません。

それでも固い上限を置きたいときは（たとえば、人が見ていない定時実行の委任で費用を抑えたい場合）、設置ごとに自分で有効にします。

```yaml
delegation:
  child_timeout_seconds: 0     # default: 0 = no timeout
  # child_timeout_seconds: 1800  # opt-in hard cap (floor 30s)
```

正の値を入れると、子ひとつずつに実時間の固い上限がかかります。`0` か負の値なら無効になります。

設定した上限が働いたときは、その子の結果に、誤りの文言とは別に決まった形の
時間切れの情報が付きます。親も差し込みの処理も、文章を読み解かずに
ストップウォッチによる打ち切りと他の失敗を見分けられます。中身は
`timeout_seconds`（設定した上限）、`timed_out_after_seconds`（実際の経過
時間）、`timeout_phase`（最初の要求にすら届かなかったなら
`before_first_llm_call`、そうでなければ `after_llm_calls`）です。時間切れ
以外の誤りでは、この3つはすべて `null` になります。

:::tip 一度も呼ばずに時間切れしたときの診断の書き出し
固い上限を設定しているとき、サブエージェントが API を**一度も**呼ばないまま時間切れになると（たいていは提供元につながらない、認証に失敗した、ツールの定義が拒まれた、のいずれかです）、`delegate_task` が `~/.hermes/logs/subagent-timeout-<session>-<timestamp>.log` へ決まった形の診断を書き出します。中身は、そのサブエージェントの設定の写し、認証情報がどう解決されたかの記録、早い段階で出た誤りの文言、そして**動いているすべての**スレッドの呼び出しの跡です（その子自身の分だけではありません）。入れ子の補助スレッドを待って止まっている子は、全体が見えないと、返事の遅い提供元と区別がつきません。
:::

## 裏で動くサブエージェントの停滞を見つける {#stall-detection-for-background-subagents}

裏側の委任（`delegate_task(background=true)`）は、**進み具合をもとに停滞を
見張る仕組み**が受け持ちます。既定で有効、設定は要りません。実時間での
時間切れと違って、進んでいる子にはどれだけ長く走っていても手を出しません。

この見張りは、切り離された子それぞれの進み具合の合図、つまり API を呼んだ
回数、いま使っているツール、最後に活動した時刻（**流れてくるトークン
ひとつごと**、ツールの切り替え、API 呼び出しの区切りで刻まれるので、長い
返事を受け取っている最中の子は必ず生きている扱いになります）を見ています。

1. **進んでいる子には決して手を出しません。** 何かひとつでも先へ進む合図が
   あれば時計は戻ります。
2. 進み具合が完全に止まったまま古さの区切りを超えた子（何もしていない状態
   なら450秒、ツールの中にいるなら1200秒。時間のかかる端末の実行や
   ウェブの取得には長いほうの余裕を与えています）は**中断され**、120秒の
   猶予が与えられます。その間に片づけられた子は、通常の完了の道筋で
   途中までの成果を届けます。
3. それでも戻ってこない子は、`stalled` という最終的な完了の記録を付けて
   強制的に終わらせます。持ち主のセッションは黙って待たされる代わりに
   結末を受け取り、非同期の枠も次の仕事のために空きます。

`stalled` の記録には、同期の側の時間切れと対になる形で
`stalled_after_quiet_seconds`、`stall_threshold_seconds`、
`stall_phase`（`idle` / `in_tool`）、`stall_grace_seconds` が入ります。

これで、固まった裏側の子のせいでセッションが死んだように見え、プロセスを
入れ直すまで直らない、という長らく続いた不具合がなくなりました。その
おおもとの固まり（ゲートウェイを何日も動かし続けたあと、子が最初の API
呼び出しで止まる）も根から直してあります。任された子は、OpenAI 形式の
API への要求を、入れ子の働き手スレッドではなく自分の会話のスレッドで
そのまま出すようになりました。固まりが潜んでいたのはその層です。停滞の
見張りは、それ以外に備える安全網として残しています。

## 動いているサブエージェントを見る（`/agents`） {#monitoring-running-subagents-agents}

TUI には `/agents` の重ね表示（別名 `/tasks`）があり、`delegate_task` が入れ子に広がっていく様子を、そのまま点検できる画面に変えてくれます。

- 動いている・最近終わったサブエージェントを、親ごとにまとめた生きた樹形図
- 枝ごとの費用、トークン、触れたファイル数の合計
- 打ち切りと一時停止の操作。ほかの子を止めずに、特定のサブエージェントだけを途中で取り消せます
- 事後の見直し。親へ返ったあとでも、それぞれのサブエージェントのターンごとの履歴をたどれます

昔ながらの CLI では `/agents` は文字の要約を出すだけです。この重ね表示が生きるのは TUI のほうです。[TUI — スラッシュコマンド](/hermes/docs/user-guide/tui/#slash-commands) を参照してください。

昔ながらの CLI と、すべてのゲートウェイ（Telegram、Discord、Slack、…）でも、
`/agents` は**裏側の委任を、子ごとの生きた活動つきで**並べます。値は動いて
いる子から直に取っています。

```
Background delegations: 1 running
- deleg_ab12cd34 · running · research the delegation stall monitor
  - child 1: 4 api calls · in web_search · active 12s ago
  - child 2: 7 api calls · between turns · active 3s ago
```

停滞の見張りが目を付けた委任は
`stalling · no progress 450s — interrupting` と表示され、長く静かでも
元気な子は静かにしていた時間が出るので、「遅い」のか「止まっている」のか
ひと目で見分けられます。

## 動いているサブエージェントの向きを変える {#steering-a-running-subagent}

子を中断すると、途中まで進めた分は捨てられます。多くの場合、本当にやりたいのは向きを変えさせることのはずです。

### 親のエージェントから（モデル側） {#from-the-parent-agent-model-facing}

親のエージェントは、子を生み出したのと同じ `delegate_task` ツールで、動いている自分の子を差配します。別の制御用ツールは要りません。

```json
{"action": "list"}
{"action": "steer", "subagent_id": "sa-0-1a2b3c4d", "message": "focus on pricing instead"}
{"action": "stop",  "subagent_id": "sa-0-1a2b3c4d"}
```

- **`list`** はその会話で生きている子を返します。`subagent_id`、目的、状態、`running_seconds`、`accepting_steer`、そして生きた記録の置き場所です。id は、立ち上げたときの応答にも `subagent_ids` として返ります。
- **`steer`** は、動いている子を止めずに、進む向きの修正を差し入れます（どこまで届くかは下記）。
- **`stop`** は、次のターンの区切りで子を早めに終わらせます。途中までの結果は、通常の完了のメッセージとして会話に戻ってきます。

これらの操作はそのターンの中で同期して走り（裏側に回ることはありません）、呼んだ側自身が生み出した木の範囲に限られ（ある会話が別のセッションの子を見たり操作したりすることはできません）、1ターンあたりのサブエージェントを立ち上げられる上限も消費しません。ですから上限に達したあとでも `stop` は効きます。

### TUI やゲートウェイから（セッション側） {#from-the-tui-gateway-session-facing}

`tools/delegate_tool.py` の `steer_subagent(subagent_id, text)` は、`interrupt_subagent()` の向きを変える側の相方です。[`/steer`](/hermes/docs/reference/slash-commands/) と同じ仕組みで、生きている子に文章を差し入れます。その文章は次のターンの区切りで子の最後のツールの結果に付け足され、進行中のツール呼び出しが切られることはなく、子からは割り込みの利用者メッセージとして見えます。プログラムから使う側は、`subagent.interrupt` の隣にある、セッション単位の `subagent.steer` というゲートウェイの RPC から呼びます。

```json
{"method": "subagent.steer", "params": {"session_id": "owning-ui-session", "subagent_id": "sa-0-1a2b3c4d", "text": "focus on pricing instead"}}
```

サブエージェントの id は `delegation.status`（または `list_active_subagents()`）から取れます。`subagent.interrupt` が使うのと同じ出どころです。ゲートウェイは、その子を生み出した当の生きた UI・ゲートウェイのセッションからしか、向きの変更を受け付けません。存在しない・別物・どちらとも取れる・古くて作り直された身元は拒まれます。全体で通用するサブエージェントの id を知っていることは、権限の証しにはなりません。同じプロセスの中から直に呼ぶ場合は、あえて範囲を限らない従来の約束のままにしてあります。

**待ち行列に入ったことと、届いたことは別です。ただし、届いていないのに成功と偽ることはありません。** `"queued"` という返事は、子が完了する区切りより前にその文章が受け付けられたという意味であって、子がもう見たという意味ではありません。受け付けと完了は足並みが揃えてあります。子がまだその文章を読める状態にあるか、さもなければその文章がそのまま `pending_steer` として結果に流し込まれるか、どちらかです。閉じたあとの呼び出しには `"rejected"` が返ります。子が受け付けたものの、すでに最後の答えを出し終えていた場合は、親が受け取る完了の記録に `missed_steer` として残り、要約に次のような注記が付きます。

```
[steer did not land — the subagent finished before it could be delivered: focus on pricing instead]
```

これで親（あるいはそれを動かしている運用者）は、向きが変わった子と、前の指示のまま終えた子を区別でき、届いたと思い込む代わりに、あらためて同じ指示を出し直せます。

## 生きた記録 {#live-transcripts}

`delegate_task` を出すたびに、**作業ごとにひとつ、追記だけの読みやすい記録**も作られます。まとめの要約を待たずに、サブエージェントが働く様子をその場で（あるいは親のエージェントが）眺められます。

```
<hermes_home>/cache/delegation/live/<delegation_id>/task-<n>.log
```

その置き場所は、送り出したときの応答に `live_transcripts` として入っており、ファイルは送り出した時点で先に作られているので、すぐに使えます。

```bash
tail -f ~/.hermes/cache/delegation/live/deleg_ab12cd34/task-0.log
```

各行には時刻が付き、子のしゃべった内容、考えごとの断片、ツールの呼び出し（`-> tool_name({args})`）、ツールの結果、そして最後の状態の印が並びます。同じ場所にある `manifest.json` が、その束の中身（目的、作業の数、作業ごとの状態）を説明します。記録は終わったあとも残り、要約と並ぶ、省略のない運用の記録として使えます。7日より古い置き場所は、新しく送り出すときに自動で片づけられます。`cache/delegation` の下にあるので、離れたところの端末（Docker・Modal・SSH）からも読めます。

## 階層の上限と入れ子の指揮 {#depth-limit-and-nested-orchestration}

既定では、委任は**平ら**です。親（階層0）が子（階層1）を立ち上げ、その子はもう先へは任せられません。委任がどこまでも入れ子に広がるのを防ぐためです。

段取りが何段にも分かれる作業（調べてからまとめる、あるいは小さく分けた問題を並行して指揮する）では、親が**指揮役**の子を立ち上げると、その子は自分の働き手を任せられるようになります。

```python
delegate_task(
    goal="Survey three code review approaches and recommend one",
    role="orchestrator",  # Allows this child to spawn its own workers
    context="...",
)
```

- `role="leaf"`（既定）: その子はもう先へ任せられません。平らな委任と同じ振る舞いです。
- `role="orchestrator"`: その子は `delegation` のツールの組を持ち続けます。`delegation.max_spawn_depth`（既定は **1** = 平ら。つまり既定のままだと `role="orchestrator"` は何も変えません）で区切られます。`max_spawn_depth` を2にすると指揮役の子が末端の孫を立ち上げられるようになり、3以上でさらに深くなります。上限は決まっておらず、実際に歯止めになるのは費用です。
- `delegation.orchestrator_enabled: false`: 全体を止める切り替えです。`role` に何を書いても、すべての子が末端の `leaf` になります。

**費用の注意:** `max_spawn_depth: 3` と `max_concurrent_children: 3` にすると、木は 3×3×3 = 27 の末端エージェントが同時に動くところまで広がります。階層をひとつ増やすたびに支出が掛け算になるので、`max_spawn_depth` を上げるときは意図をもって上げてください。

## どこまで生き延びるか {#lifetime-and-durability}

:::warning 裏側の完了が残ることと、実行そのものが残ることは別です
モデルから呼ぶ、いちばん上の階層の `delegate_task` は、あとから結果を届けられるセッションであれば自動的に裏側で走ります。Hermes はすぐに引換券を返し、子や束が終わったところで結果が会話に戻ります。指揮役のサブエージェントは、配下の結果をまとめてから返す必要があるので、そのターンの中で待ちます。要求と応答を1回で完結させる接続先は、切り離した結果をあとから届けられないので、同期での実行に切り替わります。

- 普通に続けて送ったメッセージでは、裏側の子は止まりません。`/stop` は動いている裏側の委任を止め、持ち主のセッションを閉じる・やり直すと、その配下の子は捨てられます。
- はっきりセッションを閉じる・やり直すと、そのセッションの裏側の子は中断されます。ゲートウェイが持っているセッションを TUI で覗いていて、その画面を閉じただけなら、ゲートウェイ側の作業は止まりません。
- Hermes のプロセスを入れ直しても、動いている子は**再開されません**。どの影響がどこまで及んだかを Hermes が示せないので、その試みは `unknown` になります。
- 入れ直す前に終わっていたのに結果が届いていなかった子は、記録から戻され、持ち主のセッションの通常の確認を通ってあらためて届きます。
- 取り消された子は決まった形の結果（`status="interrupted"`、`exit_reason="interrupted"`）を返しますが、親のほうも中断されているため、その結果が利用者の目に見える返事に載らないことがよくあります。

セッションを閉じてもプロセスを入れ直しても生き延びなければならない**確実な実行**には、次を使ってください。

- `cronjob`（action=`create`）— 別立てのエージェントの走行を予約します。親のターンの中断に左右されません。
- `terminal(background=True, notify_on_complete=True)` — 時間のかかるコマンドを、エージェントが別のことをしている間も走らせ続けます。
:::

## 押さえておきたい性質 {#key-properties}

- サブエージェントはそれぞれ**自分専用の端末セッション**を持ちます（親とは別です）
- サブエージェントは親で有効なツールの組を引き継ぎます。モデルが呼び出しごとに選んだり広げたりすることはできません
- **入れ子の委任は自分で有効にするもの**です。先へ任せられるのは `role="orchestrator"` の子だけで、しかも `max_spawn_depth` を既定の1（平ら）から上げたときに限ります。`orchestrator_enabled: false` で全体を止められます。
- 末端のサブエージェントは `delegate_task`、`clarify`、`memory`、`send_message`、`cronjob` を**呼べません**。指揮役のサブエージェントは `delegate_task` を持ち続けますが、ほかの制限はそのままです。どちらの役割でも `execute_code`（プログラムからツールを呼ぶ仕組み）は残るので、子は考えるターンを使い切る代わりに、機械的な作業をまとめて片づけられます。
- **取り消しは持ち主に従います** — `/stop` か、持ち主のセッションを閉じる・やり直すと、その裏側の子が止まります。指揮役の下で同期して動いている子孫は、親の中断の状態に従います
- 親の文脈に入るのは最後の要約だけなので、トークンの使い方が無駄になりません
- サブエージェントは親の **API キー、提供元の設定、認証情報の持ち札**を引き継ぎます（回数制限に当たったときの鍵の切り替えが効きます）

## 作業場所を分ける {#worktree-isolation}

既定では、サブエージェントは親の作業場所をそのまま使います。調べものや
読むのが主な作業ならこれで十分ですが、同じリポジトリを並行して直す子どうしは
ぶつかることがあります。`delegation.worktree_isolation: true` にすると、
リポジトリのいまの `HEAD` から枝分かれした git の作業ツリーが子ごとに
与えられます（Muse Code の
`--subagent-worktree-isolation` に着想を得ています）。

```yaml
delegation:
  worktree_isolation: true   # default: false
```

分けたときの振る舞いはこうです。

- それぞれの子は `<repo>/.worktrees/subagent-<id>` で端末を始め、自分の枝
  `hermes-subagent/subagent-<id>` の上で作業します。目的を伝えるメッセージにも、
  そこで作業して記録を残すよう書かれます。
- 親の作業場所は手つかずのままです。子どうしが互いの直したところを
  上書きすることもありません。
- 子が終わると、その結果の記録に `worktree` という項目が付き、`path`、
  `branch`、`commits`（元からいくつ進んだか）、`dirty` が入ります。親は
  それぞれの枝を確かめたり取り込んだりします（`git log <branch>`、
  `git merge <branch>`）。
- 記録がひとつもなく、汚れてもいない作業ツリーは**自動で片づけられます**
  （`pruned: true`）。何か残っているものは残されます。
- 片づけるには裏付けが要ります。git の様子を調べる手順が失敗したとき、
  あるいは終わりの処理そのものが誤ったときは、作業ツリーも枝も残され、
  記録には `inspection_failed: true` と `note` が付きます。このとき
  `commits` と `dirty` は測った値ではなく既定値なので、子が何もしなかったと
  決めつけず、作業ツリーそのものを確かめてください。

適用の範囲: 自分で有効にするもので、git のときだけ、しかも手元の端末を使う
ときだけです。git で管理していない場所、docker・ssh・modal を使うとき、
あるいは作業ツリーを作れなかったときは、この設定は黙って今までどおりの
場所を共有する振る舞いに戻ります。誤りにはなりません。

## delegate_task と execute_code の使い分け {#delegation-vs-executecode}

| 観点 | delegate_task | execute_code |
|--------|--------------|-------------|
| **考えること** | LLM の思考の輪をひととおり回します | Python のコードを実行するだけです |
| **文脈** | 切り離されたまっさらな会話 | 会話はなく、台本だけ |
| **使えるツール** | 止められているもの以外すべて、考えながら使えます | RPC 経由で7つ、考えることはしません |
| **並行して動かす** | 既定で同時に3つのサブエージェント（設定できます） | 台本ひとつ |
| **向いている用途** | 判断が要る込み入った作業 | 機械的で手数の多い流れ作業 |
| **トークンの費用** | 高め（LLM の輪をひととおり回すため） | 低め（返るのは標準出力だけ） |
| **利用者とのやりとり** | なし（サブエージェントは聞き返せません） | なし |

**目安:** 小さく分けた作業に、考えること・判断・段階を踏んだ問題解決が要るなら `delegate_task` を使ってください。機械的なデータの処理や、台本どおりの流れ作業なら `execute_code` です。

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
```

`base_url` が Anthropic と互換の接続先を指しているとき、たとえば末尾が `/anthropic` の道筋、Azure Foundry の Claude の経路、MiniMax の `/anthropic` の中継などでは、`api_mode` は `anthropic_messages` と自動で判別されるので、何も書かなくてもサブエージェントは正しい形式で通信します。この自動の判別が外れたときだけ（まれです）、`api_mode` をはっきり書いてください。

:::tip
エージェントは作業の込み入り具合に応じて、委任を自分で使い分けます。委任してほしいと言葉にする必要はありません。そのほうがよいときには、自分でそうします。
:::
