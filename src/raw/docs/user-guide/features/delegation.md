---
title: "サブエージェントへの委任"
description: "delegate_task で子エージェントを切り離して立ち上げ、複数の作業を並行して進めます"
upstream_path: user-guide/features/delegation.md
upstream_blob: 52db42d89501042edd83683296b1fce65af61a74
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

既定では同時に動くサブエージェントは3つまでです（設定で変えられ、決まった上限はありません）。

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

ひとつだけ例外があります。親が作業ディレクトリを確定できているときは、どのサブエージェントのシステムプロンプトにも、そのディレクトリの**プロジェクト文脈ファイル**が埋め込まれます（`.hermes.md` > AGENTS.md の連なり > CLAUDE.md > `.cursorrules` の順で、探し方も優先順位も大きさの上限も本体のシステムプロンプトと同じです。SOUL.md は対象外です）。おかげで、リポジトリの中で働くサブエージェントは、そのリポジトリ独自の決まりごとを自分で探し直さなくても、それに沿って動けます。

そのため、親のエージェントはサブエージェントに必要なものを**すべて**その呼び出しに載せなければなりません。

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

サブエージェントは、渡された goal と context から組み立てられた的の絞れたシステムプロンプトを受け取ります。そこには、作業をやり遂げたうえで、何をしたか・何が分かったか・どのファイルを変えたか・どんな問題にぶつかったかを決まった形でまとめて返すように、と書かれています。

## 実際の使い方 {#practical-examples}

### 調べものを並行して進める {#parallel-research}

複数のテーマを同時に調べさせて、要約を集めます。

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

### コードを点検して直す {#code-review-fix}

点検してから直すという一連の流れを、まっさらな文脈に任せます。

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

### 複数ファイルにまたがる書き換え {#multi-file-refactoring}

そのまま親にやらせると文脈があふれてしまうような、大きな書き換えを任せます。

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

## まとめ渡しのしくみ {#batch-mode-details}

いちばん上の階層のエージェントが `tasks` の配列を渡すと、Hermes は引換券をひとつ返し、サブエージェントたちを並行して走らせ、全員が終わったところで結果をひとつにまとめて届けます。指揮役のサブエージェントは、結果をまとめてから返す必要があるので、そのターンのうちに自分のまとめ渡しの完了を待ちます。

- **同時に動かせる数:** 既定では3件です（`delegation.max_concurrent_children` か環境変数 `DELEGATION_MAX_CONCURRENT_CHILDREN` で変えられます。下限は1で、決まった上限はありません）。この数を超えるまとめ渡しは、黙って切り捨てられるのではなくツールのエラーとして返ります
- **スレッドプール:** `ThreadPoolExecutor` を使い、設定した同時実行数をワーカー数の上限にします
- **進み具合の表示:** CLI では、各サブエージェントのツール呼び出しがその場で木の形に表示され、作業ごとに完了の行が出ます。ゲートウェイ経由のときは、進み具合がまとめられて親側の通知の受け口に送られます
- **結果の並び:** 終わった順ではなく、渡した作業の番号順に並べ替えられます
- **取り消し:** そのあとにメッセージを送っても、いちばん上の階層で裏側を走っているまとめ渡しは止まりません。`/stop` を打つか、持ち主のセッションを閉じるか初期化すると、動いている子が取り消されます。同期で動く指揮役の子は、これまでどおり親の中断状態に従います

指揮役からひとつだけ作業を同期で任せる場合は、スレッドプールを介さずそのまま実行されます。

### 裏側の完了を取りこぼさないしくみ {#durable-background-completions}

裏側の委任が終わると、Hermes はその完了の知らせを、
いつもの新しいターンの待ち行列に流す前に、使用中のプロファイルの `state.db` へ
保存します。終わってから届くまでのあいだに Hermes が再起動しても、
保留中の知らせは復元され、同じ持ち主の確認を通って配られます。
受け取り手が競合する場面では持続する引き取り札を使うので、
合成されたターンを受け入れられた側だけが受け取りを確定させ、
しくじった側は札を手放して次の機会に回します。

これは、落ちたあとに子の実行を再開させるしくみではありません。
まだ動いている最中に持ち主のプロセスが消えた委任は `unknown` として
記録されます。外部への影響が起きたのかどうかを、Hermes には示せないからです。
保留中の記録も配り終えた記録も、件数に上限があり、プロファイルごとに閉じています。

### 子が動かした裏側のプロセスの知らせ {#child-background-process-notifications}

サブエージェントが動かした裏側のプロセス（たとえば `notify_on_complete` を付けた
`npm ci`）は、しくみの上では完了の知らせも見張り文字列の知らせも **親** の会話へ
流れます。子より長く生き残るものには、確実に受け取る相手が要るからです。ただし
既定では、その知らせは親のチャットでは **伏せられます**。届けるべき成果は子が
まとめた委任の結果であって、子の内部のビルドが会話の途中に出す「処理が終わりました」
の壁は雑音だからです。伏せられた知らせは、プロセスのセッション ID とサブエージェントの
タスク ID を添えて debug のレベルで記録されるので、あとから調べられます。

委任の結果そのものが伏せられることはありません。子のプロセスの知らせも届くように
戻したいときは、次のようにします（どの知らせにも「Started by subagent …」という
出どころの行が付きます）。

```yaml
delegation:
  surface_child_process_notifications: true   # default: false
```

## 使うモデルの差し替え {#model-override}

`config.yaml` を使うと、サブエージェントだけ別のモデルにできます。単純な作業を安くて速いモデルに任せたいときに便利です。

```yaml
# In ~/.hermes/config.yaml
delegation:
  model: "google/gemini-flash-2.0"    # Cheaper model for subagents
  provider: "openrouter"              # Optional: route subagents to a different provider
```

書かなければ、サブエージェントは親と同じモデルを使います。

### 費用の組み立て方: 計画は最上位モデル、実作業は安いモデル {#cost-strategy-frontier-planner-inexpensive-workers}

問題をきちんと切り分けて指示に落とすには最上位モデルの判断力が要りますが、目的も文脈も出力の形も決まった作業をこなすだけなら、たいていはそこまで要りません。そしてトークンを食うのは子のほうです。サブエージェントをまとめて並行させると、その実行で使うトークンの大半がそちらに寄るので、費用が本当に発生しているのは実作業側のモデルです。本体のセッションは最上位モデルのまま `delegation.model` に安いモデルを指定しておけば、判断が効くところの品質は保ったまま、量がかさむところの支出を削れます。

```yaml
# ~/.hermes/config.yaml
model:
  default: "your-frontier-model"     # parent (planner) stays on the frontier model
delegation:
  model: "your-inexpensive-model"    # all delegate_task children run on this
  provider: "openrouter"             # optional: route children to a different provider
```

決まる順番はこうです。まず `delegation.base_url`（直接つなぐ接続先）が優先され、次に `delegation.provider`（実行時のプロバイダのしくみを通して認証情報一式が解決されます）、どちらも設定されていなければ子は親のプロバイダと認証情報を引き継ぎます。`delegation.model` はどの場合でも効き、空のときは子が親のモデルを引き継ぎます。`delegation.base_url` と並べて `delegation.provider` を設定すると、接続先は明示したものが使われたまま、そのプロバイダのリクエスト指定と出力トークンの上限が子に持ち込まれます。`delegation.request_overrides` を明示した辞書はどの経路でも尊重され、実行時に決まったそれらの値の上に重なります（下の[設定](#configuration)を参照）。

この指定は全体に効くという点に注意してください。`delegate_task` には作業ごとにモデルを選ぶ引数がないので、まとめ渡しの子はすべて同じ委任用モデルで動きます。品質を落とせない作業に強いモデルを使いたいときは、そのセッションだけ `delegation.model` を空にしておくか、作業ごとのモデル指定に対応している[かんばんボード](/hermes/docs/user-guide/features/kanban/#per-task-model-override)に渡してください。

## `/review` コマンド {#the-review-command}

`/review` は、いま会話で作り上げたもの（プルリクエスト、差分、コード、文書、設計）を点検することだけを仕事にした、独立した権限そのままのサブエージェントを裏側で立ち上げます。CLI でも TUI でもデスクトップ版でも、ゲートウェイでつながるどのメッセージ基盤でも同じように動きます。

```
/review                       # review whatever the last 10 messages presented
/review focus on security     # add extra instructions for the reviewer
```

そのとき何が起きるかというと、

1. 直近10件の利用者とアシスタントのメッセージが、点検役の出発点となる材料として切り取られます（ツールの出力とシステムメッセージは除かれます）。
2. 点検役のサブエージェントは、`delegate_task` と同じ裏側の委任のしくみで送り出されます。ふつうのサブエージェントと同じ道具立て（端末、ウェブ、ファイル、ブラウザなど）を持つので、切り取られた抜粋だけで判断するのではなく、実際にプルリクエストを開き、差分を読み、コードを動かします。
3. 点検役は、本体のエージェントが持っていた作業の文脈を引き継ぎます。本体が読み込んでいたスキル（起動時に読み込んだものも、セッション中に `skill_view` で読んだものも）は指示書の中に名前が挙がり、それらを読み込んだうえで、その決まりごとに照らして点検するように言われます。ほかのサブエージェントと同じく、システムプロンプトには作業ディレクトリのプロジェクト文脈ファイル（AGENTS.md / CLAUDE.md / .cursorrules）も、守るべき決まりごととして埋め込まれます。
4. 終わると、その点検結果の全文が、ふつうの裏側サブエージェントの完了と同じ形で同じセッションに戻ってきます。本体のエージェントはそれを読み、指摘を直す・追加の変更を送る・こちらに返事をするといった行動に移せます。

いちばん素直な流れはこうです。本体のエージェントがプルリクエストを出し、こちらが `/review` と打つと、別の目が調べているあいだも作業を続けられ、点検結果はそのプルリクエストを作ったエージェント宛てとしてチャットに戻ってきます。

### 点検に使うモデル {#review-model}

既定では、点検役も本体と同じモデルで動きます。点検専用のモデルを固定したいときは、`config.yaml` に `auxiliary.review` を書きます。

```yaml
auxiliary:
  review:
    provider: openrouter               # or nous, anthropic, a direct base_url, ...
    model: anthropic/claude-opus-4.6   # a strong reviewer model
```

認証情報の解決のされ方は `delegation.provider` を指定したときとまったく同じです（base_url、API キー、api_mode を含む実行時プロバイダ一式）。`provider: auto` と `model` を空にしておくと「本体のエージェントのモデルを引き継ぐ」という意味になり、これが既定です。

`/review` は `/refine` とわざと切り分けてあります。`/refine` は記憶とスキルを更新するために会話そのものを見直し、`/review` は会話が生み出した*成果物*を点検します。

## 引き継がれるツール {#inherited-tool-access}

`delegate_task` には、モデルが指定できる `toolsets` の引数はありません。サブエージェントは親が有効にしているツール群をそのまま引き継ぐので、モデルが親の持っていない力を子に与えることはできません。委任する作業に別の力が要るなら、会話を始める前に親のツールを設定しておいてください。

親が持っていても、サブエージェントには使えないツールがあります。

- `delegate_task` — 末端のサブエージェント（既定）には使えません。`role="orchestrator"` の子だけが持ち続け、`max_spawn_depth` で制限されます。後述の[階層の上限と入れ子の指揮](#depth-limit-and-nested-orchestration)を参照してください。
- `clarify` — サブエージェントは利用者とやり取りできません
- `memory` — 共有の記憶に書き込めません
- `send_message` — 別の基盤へ影響を及ぼせません
- `cronjob` — 親の名前で新たな作業を予約できません

どちらの役でも `execute_code`（プログラムからツールを呼ぶしくみ）は残るので、子は機械的な作業をまとめて片付けられます。

## 折り返しの上限 {#max-iterations}

サブエージェントには、ツールを呼ぶやり取りを何回まで重ねられるかの上限があります（既定は50回）。

```python
delegate_task(
    goal="Quick file check",
    context="Check if /etc/nginx/nginx.conf exists and print its first 10 lines",
    max_iterations=10  # Simple task, don't need many turns
)
```

## 子の制限時間 {#child-timeout}

既定では、サブエージェントに**時計で測る制限時間はありません**。子が失敗するのは、実際にやっていることが原因のときだけです。API のエラー、ツールのエラー、折り返しの上限に達した場合であって、委任のしくみが持つストップウォッチのせいで止まることはありません。以前の版では固い上限（当初は300秒、のちに600秒）がありましたが、これがまじめに働いている子を途中で殺してしまっていました。じっくりしたコードの点検、大きく広げた調べもの、推論の遅いモデルは、ずっと着実に進んでいても10分を超えるのがふつうだったからです。

本当に詰まってしまった子は、いまでも見つけられます。子がまったく進まなくなると（API の呼び出しもツールの開始もなく、活動時刻の更新もない状態）、心拍の停滞を見張るしくみが親の活動の記録を更新しなくなり、本当に動かなくなったものにゲートウェイの無活動タイムアウトが働きます。モデルの応答を待っている最中は進行中とみなされます。サブエージェントはプロバイダからの応答を待つあいだも活動時刻を更新するので、遅いローカルモデルや前処理の長い応答が、止まったものとして扱われることはありません。

それでも固い上限を設けたいときは（たとえば、人が見ていない定時実行の委任で費用を抑えたいとき）、導入ごとに自分で有効にできます。

```yaml
delegation:
  child_timeout_seconds: 0     # default: 0 = no timeout
  # child_timeout_seconds: 1800  # opt-in hard cap (floor 30s)
```

正の値を入れると、子ごとに時計で測る固い上限が課されます。`0` か負の値なら無効です。

設定した上限が働いたときは、子の結果にエラーの文言とあわせて、決まった形の
制限時間の情報が載ります。おかげで親やフックは、文面を読み解かなくても
ストップウォッチによる打ち切りとほかの失敗を見分けられます。載るのは `timeout_seconds`
（設定した上限）、`timed_out_after_seconds`（実際に経過した時間）、
`timeout_phase`（最初の要求に届かないうちに終わったなら `before_first_llm_call`、
それ以外は `after_llm_calls`）です。制限時間以外のエラーでは、
3つとも `null` になります。

:::tip API を一度も呼ばずに時間切れしたときの診断出力
固い上限を設定している場合、サブエージェントが API を**一度も**呼ばないまま時間切れになったとき（たいていは、プロバイダにつながらない、認証に失敗した、ツールの定義が受け付けられなかった、のどれかです）、`delegate_task` は `~/.hermes/logs/subagent-timeout-<session>-<timestamp>.log` に整った形の診断を書き出します。そこにはサブエージェントの設定の写し、認証情報を解決した経過、初期のエラー文言、そして**生きているすべての**スレッド（子自身のものだけではありません）のスタックトレースが入ります。入れ子になった補助スレッドを待って止まっている子は、全体像がないと遅いプロバイダと区別がつかないからです。
:::

## 裏側のサブエージェントの停滞を見つける {#stall-detection-for-background-subagents}

裏側の委任（`delegate_task(background=true)`）は、
**進み具合をもとに停滞を見張るしくみ**に守られています。既定で有効で、設定は要りません。
時計で測る制限時間とは違い、進んでいる子には
どれだけ長くかかっていても手を出しません。

見張り役は、切り離された子それぞれの進み具合の合図を拾います。API を呼んだ回数、
いま使っているツール、最後に動いた時刻の3つです（この時刻は**流れてくるトークン1つごと**、
ツールの切り替え、API 呼び出しの区切りで進むので、長い応答を受け取っている最中の子は
つねに生きているとみなされます）。

1. **進んでいる子には決して手を出しません。** 何か動きがあれば
   時計は振り出しに戻ります。
2. 進み具合が完全に固まったまま停滞の目安を超えた子は（何もしていない状態で450秒、
   ツールの中にいる状態で1200秒。時間のかかる端末のコマンドやウェブの取得には
   長いほうの目安が当てられます）**中断**され、
   120秒の猶予が与えられます。そのあいだに畳めた子は、
   ふつうの完了の経路で途中までの結果を届けます。
3. それでも戻ってこない子は、`stalled` という終わりの完了として強制的に締められます。
   持ち主のセッションが黙り込むのではなく結果を受け取れるようになり、
   非同期の枠も次の作業のために空きます。

`stalled` の知らせには、同期側の制限時間の項目と対になる情報が
決まった形で載ります。`stalled_after_quiet_seconds`、`stall_threshold_seconds`、
`stall_phase`（`idle` / `in_tool`）、`stall_grace_seconds` です。

これで、長らく残っていた困った状態が解消しました。裏側の子が動かなくなると、
プロセスを再起動するまでそのセッションが死んでいるように見えていた、というものです。
その根っこにあった詰まり（ゲートウェイを何日も動かし続けたあと、
子が最初の API 呼び出しで止まってしまう）も、大元から直っています。委任された子は
OpenAI 形式の API 要求を、入れ子のワーカースレッドではなく自分の会話スレッドの上で
そのまま実行するようになりました。詰まりが起きていたのがまさにその層だったからです。
停滞を見張るしくみは、それ以外の事態に備える安全網として残っています。

## 動いているサブエージェントを見る（`/agents`） {#monitoring-running-subagents-agents}

TUI には `/agents` の重ね表示（別名 `/tasks`）があり、`delegate_task` が入れ子に広がっていく様子を、そのまま追いかけられる画面にしてくれます。

- 動いているサブエージェントと終わったばかりのサブエージェントを、親ごとにまとめた木の表示
- 枝ごとの費用、トークン、触ったファイルの集計
- 打ち切りと一時停止の操作 — 兄弟を止めずに、特定のサブエージェントだけを途中で取り消せます
- あとからの振り返り — 親に結果を返したあとでも、各サブエージェントのやり取りを1つずつたどれます

昔ながらの CLI では `/agents` は文字の要約を出すだけで、この重ね表示が活きるのは TUI です。[TUI — スラッシュコマンド](/hermes/docs/user-guide/tui/#slash-commands)を参照してください。

昔ながらの CLI とゲートウェイでつながるすべての基盤（Telegram、Discord、Slack など）では、
`/agents` は**裏側の委任と、子ごとの今の動き**も並べます。
数字は動いている子から直に拾ったものです。

```
Background delegations: 1 running
- deleg_ab12cd34 · running · research the delegation stall monitor
  - child 1: 4 api calls · in web_search · active 12s ago
  - child 2: 7 api calls · between turns · active 3s ago
```

停滞を見張るしくみが目を付けた委任は
`stalling · no progress 450s — interrupting` と表示され、静かな時間が長いだけで
元気な子は、その静かな時間が出るので「遅い」と「詰まった」をひと目で
見分けられます。

## 動いているサブエージェントに指示を足す {#steering-a-running-subagent}

子を中断すると、途中までの作業は捨てられます。多くの場合、本当にやりたいのは向きを変えさせることだけです。

### 親のエージェントから（モデルが使う） {#from-the-parent-agent-model-facing}

親のエージェントは、子を立ち上げたのと同じ `delegate_task` ツールで、動いている自分の子を差配します。別に操作用のツールは要りません。

```json
{"action": "list"}
{"action": "steer", "subagent_id": "sa-0-1a2b3c4d", "message": "focus on pricing instead"}
{"action": "stop",  "subagent_id": "sa-0-1a2b3c4d"}
```

- **`list`** は、その会話で生きている子を返します。`subagent_id`、目的、状態、`running_seconds`、`accepting_steer`、そして今このときの記録の置き場所です。ID は立ち上げたときの応答にも `subagent_ids` として返ります。
- **`steer`** は、動いている子を止めずに軌道修正を送り込みます（届き方については後述します）。
- **`stop`** は、次の折り返しの区切りで子を早めに終わらせます。途中までの結果は、ふつうの完了メッセージとして会話に戻ります。

これらの操作はそのターンのうちに同期で走り（裏側には回りません）、呼び出した側が立ち上げた木の中だけに効きます。ある会話が別のセッションの子を見たり操作したりすることは決してできません。またターンごとのサブエージェント立ち上げ上限を消費しないので、上限に達したあとでも `stop` は使えます。

### TUI やゲートウェイから（セッションが使う） {#from-the-tui-gateway-session-facing}

`tools/delegate_tool.py` にある `steer_subagent(subagent_id, text)` は、`interrupt_subagent()` の向きを変える側の相棒です。[`/steer`](/hermes/docs/reference/slash-commands/) と同じしくみで、生きている子に文章を送り込みます。文章は次の折り返しの区切りで子の最後のツール結果に付け足され、実行中のツール呼び出しが切られることはなく、子からは筋の外から届いた利用者のメッセージとして見えます。プログラムから使う側は、`subagent.interrupt` の隣にあるセッション単位の `subagent.steer` というゲートウェイ RPC で届きます。

```json
{"method": "subagent.steer", "params": {"session_id": "owning-ui-session", "subagent_id": "sa-0-1a2b3c4d", "text": "focus on pricing instead"}}
```

サブエージェントの ID は `delegation.status`（または `list_active_subagents()`）から得られます。`subagent.interrupt` が使うのと同じ場所です。ゲートウェイは、その子を立ち上げた当の生きている画面／ゲートウェイのセッションからの指示だけを受け付けます。持ち主が見つからない、別のもの、あいまい、あるいは古くて使い回された身元は拒まれます。全体で通用するサブエージェント ID を知っていることは、権限にはなりません。プロセス内から直に呼ぶ側だけは、範囲を絞らない補助関数の約束をあえて保っています。

**受け取ったことと届いたことは別ですが、ありもしない成功を返すことはありません。** `"queued"` という応答は、子が完了する区切りより前に文章が受け取られたという意味であって、子がそれを見たとは限りません。受け取りと完了は足並みがそろえてあります。子がまだその文章を読めるか、さもなければまったく同じ文章が `pending_steer` として結果に流し込まれるか、どちらかです。閉じたあとの呼び出しには `"rejected"` が返ります。子が指示を受け取ったものの、すでに最終的な答えを出していた場合は、親が受け取る完了の記録にそれが `missed_steer` として残り、要約に一言添えられます。

```
[steer did not land — the subagent finished before it could be delivered: focus on pricing instead]
```

こうしておけば、親（またはそれを動かしている運用者）は、指示が効いた子と古い指示のまま終わった子を見分けられ、届いたものと思い込む代わりに、あらためて指示を出し直せます。

## 今このときの記録 {#live-transcripts}

`delegate_task` を送り出すたびに、**作業ごとに1つずつ、追記だけの読める記録**も作られます。まとめた要約を待たずに、こちらから（あるいは親のエージェントから）サブエージェントの働きぶりをその場で見られます。

```
<hermes_home>/cache/delegation/live/<delegation_id>/task-<n>.log
```

送り出したときの応答に `live_transcripts` として置き場所が入り、ファイルは送り出しの時点で先に作られるので、すぐに使えます。

```bash
tail -f ~/.hermes/cache/delegation/live/deleg_ab12cd34/task-0.log
```

各行には時刻が入り、子のアシスタントとしての発言、考えている途中の断片、ツールの呼び出し（`-> tool_name({args})`）、ツールの結果、最後の状態の印が並びます。同じディレクトリの `manifest.json` には、そのまとめ渡しの中身（目的、作業の数、作業ごとの状態）が書かれています。記録は終わったあとも残り、要約と並ぶ細部まで残した運用の記録として役立ちます。7日より古いディレクトリは、新しい送り出しのときに自動で片付けられます。`cache/delegation` の下にあるので、離れた場所の端末（Docker／Modal／SSH）からも読めます。

## 階層の上限と入れ子の指揮 {#depth-limit-and-nested-orchestration}

既定では、委任は**平ら**です。親（階層0）が子（階層1）を立ち上げ、その子はそれ以上委任できません。委任が際限なく入れ子になるのを防ぐためです。

段取りの分かれる仕事（調査 → まとめ、あるいは小問題ごとに並行して指揮する形）では、親が**指揮役**の子を立ち上げ、その子が自分の実作業係を委任*できる*ようにできます。

```python
delegate_task(
    goal="Survey three code review approaches and recommend one",
    role="orchestrator",  # Allows this child to spawn its own workers
    context="...",
)
```

- `role="leaf"`（既定）: 子はそれ以上委任できません。平らな委任とまったく同じ振る舞いです。
- `role="orchestrator"`: 子は `delegation` のツール群を持ち続けます。`delegation.max_spawn_depth`（既定は **1** = 平ら。つまり既定のままだと `role="orchestrator"` は何も起きません）で制限されます。`max_spawn_depth` を2にすると指揮役の子が末端の孫を立ち上げられるようになり、3以上でさらに深くなります。上限は決まっておらず、費用が実質的な歯止めです。
- `delegation.orchestrator_enabled: false`: `role` の指定にかかわらず、すべての子を末端（`leaf`）に固定する全体の非常停止です。

**費用の注意:** `max_spawn_depth: 3` と `max_concurrent_children: 3` を組み合わせると、木は 3×3×3 = 27 の末端エージェントが同時に動くところまで広がります。階層を1つ増やすごとに支出は掛け算で膨らむので、`max_spawn_depth` を上げるときは意図をもって上げてください。

## 生存期間と残り方 {#lifetime-and-durability}

:::warning 完了が残ることと、実行が残ることは別です
モデルが呼ぶいちばん上の階層の `delegate_task` は、あとから結果を届けられるセッションであれば自動的に裏側で走ります。Hermes はすぐに引換券を返し、子やまとめ渡しが終わってから結果が会話に戻ってきます。指揮役のサブエージェントは、結果をまとめてから返さなければならないので、そのターンのうちに配下を待ちます。状態を持たない要求と応答だけの接続先では、切り離した結果をあとで届けられないため、同期での実行に切り替わります。

- ふつうの追加のメッセージでは、裏側の子は取り消されません。`/stop` は動いている裏側の委任を取り消し、持ち主のセッションを閉じるか初期化すると、動いている子は捨てられます。
- はっきりとセッションを閉じたり初期化したりすると、そのセッションの裏側の子は中断されます。ゲートウェイが持っているセッションを TUI で覗いていた画面を閉じても、ゲートウェイ側の作業は止まりません。
- Hermes のプロセスを再起動しても、動いていた子は**再開しません**。どの影響が起きたのかを示せないため、その試みは `unknown` になります。
- 再起動の前に終わっていたものの結果が届いていなかった子は、復元されて持ち主のセッションのふつうの確認を通って戻されます。
- 取り消された子は決まった形の結果（`status="interrupted"`、`exit_reason="interrupted"`）を返しますが、親も一緒に中断されているため、その結果が利用者の目に見える返事になることはあまりありません。

セッションを閉じてもプロセスを再起動しても残さなければならない**確実な実行**には、次を使ってください。

- `cronjob`（action=`create`）— 別のエージェントの実行を予約します。親のターンの中断に影響されません。
- `terminal(background=True, notify_on_complete=True)` — エージェントが別のことをしているあいだも動き続ける、長時間のシェルコマンドです。
:::

## 押さえておきたい性質 {#key-properties}

- サブエージェントはそれぞれ**自分専用の端末セッション**を持ちます（親とは別です）
- サブエージェントは親が有効にしているツール群を引き継ぎます。モデルが呼び出しごとに選んだり広げたりはできません
- **入れ子の委任は明示的に有効にするもの**です。`role="orchestrator"` の子だけがさらに委任でき、しかも `max_spawn_depth` を既定の1（平ら）から上げたときに限られます。全体で止めるには `orchestrator_enabled: false` を使います。
- 末端のサブエージェントは `delegate_task`、`clarify`、`memory`、`send_message`、`cronjob` を呼べ**ません**。指揮役のサブエージェントは `delegate_task` を持ち続けますが、ほかの制限はそのままです。どちらの役でも `execute_code`（プログラムからツールを呼ぶしくみ）は残るので、子は推論の折り返しを使い切らずに機械的な作業をまとめて片付けられます。
- **取り消しは持ち主に従います** — `/stop` を打つか持ち主のセッションを閉じる・初期化すると、その裏側の子が取り消されます。指揮役の下で同期で動く子孫は、親の中断状態に従います
- 親の文脈に入るのは最後の要約だけなので、トークンの使い方が無駄になりません
- サブエージェントは親の **API キー、プロバイダの設定、認証情報の持ち回り**を引き継ぎます（速度制限に当たったときの鍵の切り替えが効きます）

## ワークツリーによる切り離し {#worktree-isolation}

既定では、サブエージェントは親の作業ディレクトリを共有します。調べものや読むのが中心の作業なら
それで困りませんが、同じリポジトリを並行して編集する子はぶつかることがあります。
`delegation.worktree_isolation: true` にすると、リポジトリの今の `HEAD` から枝分かれした
git のワークツリーが子ごとに与えられます（Muse Code の
`--subagent-worktree-isolation` に着想を得ています）。

```yaml
delegation:
  worktree_isolation: true   # default: false
```

切り離しを有効にすると、

- 子はそれぞれ `<repo>/.worktrees/subagent-<id>` で端末を開始し、
  自分のブランチ `hermes-subagent/subagent-<id>` に乗ります。目的を伝えるメッセージにも、
  そこで作業してコミットするように書かれます。
- 親のチェックアウトはそのままで、子どうしが互いの編集を
  上書きすることもありません。
- 子が終わると、その結果の記録に `worktree` という項目が加わり、
  `path`、`branch`、`commits`（もとからいくつ進んだか）、`dirty` が入ります。親はそれぞれのブランチを
  見て取り込みます（`git log <branch>`、`git merge <branch>`）。
- コミットがなく、変更も残っていないワークツリーは**自動的に片付けられます**
  （`pruned: true`）。何か作業が残っているものは残されます。
- 片付けるには裏付けが要ります。git の状態を調べる処理が失敗したとき、あるいは
  締めの処理そのものがエラーになったときは、ワークツリーもブランチも残され、記録には
  `inspection_failed: true` と `note` が付きます。このとき `commits` と `dirty` は
  実測ではなく既定値なので、子が何も生み出さなかったと決めつけず、
  ワークツリーを自分で確かめてください。

適用範囲: 明示的に有効にするもので、git のときだけ、しかもローカルの端末のときだけです。git 管理下でない
ディレクトリ、docker／ssh／modal の端末、あるいはワークツリーの作成に失敗したときは、
この設定は黙って従来どおりの作業ディレクトリ共有に戻ります。エラーにはなりません。

## delegate_task と execute_code の使い分け {#delegation-vs-executecode}

| 観点 | delegate_task | execute_code |
|--------|--------------|-------------|
| **推論** | LLM の推論の輪がまるごと回る | Python コードを実行するだけ |
| **文脈** | 切り離されたまっさらな会話 | 会話はなく、スクリプトだけ |
| **使えるツール** | 制限されていないツールすべてを推論つきで | RPC 経由の7つのツール、推論なし |
| **並行の度合い** | 既定でサブエージェント3つまで同時（設定で変更可） | スクリプト1本 |
| **向いている用途** | 判断が要る込み入った作業 | 機械的で段取りの決まった処理 |
| **トークンの費用** | 高め（LLM の輪がまるごと回るため） | 低め（標準出力だけが返る） |
| **利用者とのやり取り** | なし（サブエージェントは聞き返せません） | なし |

**目安:** 推論や判断、段取りを踏む問題解決が要るなら `delegate_task` を使ってください。機械的なデータ処理や決まった手順の処理なら `execute_code` を使ってください。

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

`base_url` が Anthropic 互換の接続先を指しているとき（たとえば末尾が `/anthropic` のパス、Azure Foundry の Claude 経路、MiniMax の `/anthropic` 中継など）は、`api_mode` が `anthropic_messages` だと自動で判別されるので、何も設定しなくてもサブエージェントは正しい通信形式を使います。自動判別が外れたとき（まれです）だけ、`api_mode` を明示してください。

`delegation.request_overrides` は**3 つ**の解決経路すべて（`base_url` の直接指定、名前付きの `provider`、そして純粋な引き継ぎ）で効くので、必ず反映されます。最上位のキーは API の引数として渡され（たとえば `service_tier`）、`extra_body` の下位辞書はリクエストの `extra_body` に混ぜ込まれます。明示した値は、実行時や親から渡された指定より**優先**されます。最上位のキーは明示したものが勝ち、`extra_body` は一段深くまで混ぜ合わされるので、プロバイダ側が持つリクエストの癖（たとえば `thinking: {type: disabled}`）は、こちらのキーで上書きしないかぎり残ります。詳しくは [設定 → 委任](/hermes/docs/user-guide/configuration/#delegation) をご覧ください。

:::tip
エージェントは作業の込み入り具合を見て、委任するかどうかを自分で決めます。委任してほしいとわざわざ頼む必要はありません。そうしたほうがよい場面では、自分でそうします。
:::
