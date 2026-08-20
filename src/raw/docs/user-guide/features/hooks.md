---
title: "イベントフック"
description: "重要なライフサイクルの節目で独自のコードを走らせる — 活動の記録、通知の送信、Webhook への投稿"
upstream_path: user-guide/features/hooks.md
upstream_blob: ace2d2998c7418c2845c5d7130d98b8db4519e68
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/hooks
---

# イベントフック {#event-hooks}

Hermes には、重要なライフサイクルの節目で独自のコードを走らせるフックの仕組みが 4 つあります。

| 仕組み | 登録方法 | 動く場所 | 用途 |
|--------|---------------|---------|----------|
| **[ゲートウェイフック](#gateway-event-hooks)** | `~/.hermes/hooks/` 内の `HOOK.yaml` と `handler.py` | ゲートウェイのみ | 記録、通知、Webhook |
| **[プラグインフック](#plugin-hooks)** | [プラグイン](/hermes/docs/user-guide/features/plugins/)の中で `ctx.register_hook()` を呼ぶ | CLI とゲートウェイ | ツール呼び出しへの介入、計測、ガードレール |
| **[シェルフック](#shell-hooks)** | `~/.hermes/config.yaml` の `hooks:` ブロックからシェルスクリプトを指す | CLI とゲートウェイ | 差し込むだけで使えるスクリプト（実行の遮断、自動整形、文脈の注入） |
| **[送信 Webhook](#outbound-webhooks)** | `~/.hermes/config.yaml` の `hooks.outbound:` の一覧 | CLI とゲートウェイ | 署名付きのライフサイクルイベントを外部の HTTP エンドポイントへ送る — CI、ダッシュボード、他のエージェントなど |

フックのコールバックで起きたエラーは切り離して記録され、エージェント本体を巻き込んで落とすことはありません。とはいえフックは受け身なだけの仕組みではなく、指示・制御系のフックは処理の流れを変えられますし、変換系のフックは内容を差し替えられます。シェルの `pre_tool_call` フックなら実行を遮断したり、安全側に倒して失敗させたりもできます。

## ゲートウェイのイベントフック {#gateway-event-hooks}

ゲートウェイフックは、ゲートウェイ（Telegram、Discord、Slack、WhatsApp、Teams）の動作中に自動で発火します。エージェント本体の処理を止めることはありません。

### フックを作る {#creating-a-hook}

フックは 1 つにつき `~/.hermes/hooks/` 直下のディレクトリで、次の 2 つのファイルを置きます。

```text
~/.hermes/hooks/
└── my-hook/
    ├── HOOK.yaml      # Declares which events to listen for
    └── handler.py     # Python handler function
```

#### HOOK.yaml {#hookyaml}

```yaml
name: my-hook
description: Log all agent activity to a file
events:
  - agent:start
  - agent:end
  - agent:step
```

`events` の一覧が、どのイベントでハンドラーを呼ぶかを決めます。`command:*` のようなワイルドカードも含め、イベントは好きな組み合わせで購読できます。

#### handler.py {#handlerpy}

```python

from datetime import datetime
from pathlib import Path

LOG_FILE = Path.home() / ".hermes" / "hooks" / "my-hook" / "activity.log"

async def handle(event_type: str, context: dict):
    """Called for each subscribed event. Must be named 'handle'."""
    entry = {
        "timestamp": datetime.now().isoformat(),
        "event": event_type,
        **context,
    }
    with open(LOG_FILE, "a") as f:
        f.write(json.dumps(entry) + "\n")
```

**ハンドラーの決まりごと:**
- 名前は `handle` にする
- `event_type`（文字列）と `context`（辞書）を受け取る
- `async def` でも通常の `def` でもよい — どちらでも動く
- エラーは捕捉して記録されるだけで、エージェントを落とすことはない

### 使えるイベント {#available-events}

| イベント | 発火するタイミング | context のキー |
|-------|---------------|--------------|
| `gateway:startup` | ゲートウェイのプロセスが起動したとき | `platforms`（動作中のプラットフォーム名の一覧） |
| `session:start` | メッセージのセッションが新しく作られたとき | `platform`、`user_id`、`session_id`、`session_key` |
| `session:end` | セッションが終了したとき（リセットの前） | `platform`、`user_id`、`session_key` |
| `session:reset` | 利用者が `/new` または `/reset` を実行したとき | `platform`、`user_id`、`session_key` |
| `session:compress` | セッションの文脈の圧縮が完了したとき | `platform`、`session_id`、`old_session_id`（その場で圧縮された場合は空）、`in_place`（真偽値 — `true` なら同じ id のまま記録を圧縮、`false` なら `old_session_id` から切り替え）、`compression_count` |
| `agent:start` | エージェントがメッセージの処理を始めたとき | `platform`、`user_id`、`chat_id`、`thread_id`（フォーラムのトピックやスレッドの起点 id。スレッド内でなければ空）、`chat_type`（`"dm"` \| `"group"` \| `"forum"`。不明なら空）、`session_id`、`message`（500 文字で切り詰め） |
| `agent:step` | ツール呼び出しループの各回 | `platform`、`user_id`、`session_id`、`iteration`、`tool_names` |
| `agent:end` | エージェントが処理を終えたとき | `agent:start` と同じキーに加えて `response`（500 文字で切り詰め） |
| `reaction:added` | ボットから見えるメッセージに絵文字のリアクションが付いたとき（現状は Slack アダプター）。`reactions:read` のスコープと `reaction_added` のボットイベント購読が必要で、ボットがそのチャンネルに参加している必要があります。 | `platform`、`reaction`、`user_id`、`item_user_id`、`item_type`、`channel_id`、`message_ts`、`team_id`、`event_ts`、`raw_event` |
| `reaction:removed` | ボットから見えるメッセージから絵文字のリアクションが外されたとき。`reaction_removed` のボットイベント購読が必要です。 | `reaction:added` と同じ形 |
| `command:*` | スラッシュコマンドが実行されたとき（種類を問わず） | `platform`、`user_id`、`command`、`args` |

#### ワイルドカードの照合 {#wildcard-matching}

`command:*` で登録したハンドラーは、`command:` で始まるどのイベント（`command:model`、`command:reset` など）でも発火します。購読を 1 つ書くだけで、すべてのスラッシュコマンドを見張れます。

:::tip スレッドへの返信
同じ Telegram のフォーラムトピックへ続きのメッセージを投稿するハンドラーでは、`chat_type == "forum"` かつ `thread_id` が空でないときに `message_thread_id=int(thread_id)` を渡してください。
:::

### 例 {#examples}

#### 長く続くタスクを Telegram で知らせる {#telegram-alert-on-long-tasks}

エージェントの手順が 10 を超えたら自分にメッセージを送ります。

```yaml
# ~/.hermes/hooks/long-task-alert/HOOK.yaml
name: long-task-alert
description: Alert when agent is taking many steps
events:
  - agent:step
```

```python
# ~/.hermes/hooks/long-task-alert/handler.py

THRESHOLD = 10
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
CHAT_ID = os.getenv("TELEGRAM_HOME_CHANNEL")

async def handle(event_type: str, context: dict):
    iteration = context.get("iteration", 0)
    if iteration == THRESHOLD and BOT_TOKEN and CHAT_ID:
        tools = ", ".join(context.get("tool_names", []))
        text = f"⚠️ Agent has been running for {iteration} steps. Last tools: {tools}"
        async with httpx.AsyncClient() as client:
            await client.post(
                f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                json={"chat_id": CHAT_ID, "text": text},
            )
```

#### コマンドの利用状況を記録する {#command-usage-logger}

どのスラッシュコマンドが使われているかを追いかけます。

```yaml
# ~/.hermes/hooks/command-logger/HOOK.yaml
name: command-logger
description: Log slash command usage
events:
  - command:*
```

```python
# ~/.hermes/hooks/command-logger/handler.py

from datetime import datetime
from pathlib import Path

LOG = Path.home() / ".hermes" / "logs" / "command_usage.jsonl"

def handle(event_type: str, context: dict):
    LOG.parent.mkdir(parents=True, exist_ok=True)
    entry = {
        "ts": datetime.now().isoformat(),
        "command": context.get("command"),
        "args": context.get("args"),
        "platform": context.get("platform"),
        "user": context.get("user_id"),
    }
    with open(LOG, "a") as f:
        f.write(json.dumps(entry) + "\n")
```

#### セッション開始時の Webhook {#session-start-webhook}

新しいセッションができたら外部サービスへ POST します。

```yaml
# ~/.hermes/hooks/session-webhook/HOOK.yaml
name: session-webhook
description: Notify external service on new sessions
events:
  - session:start
  - session:reset
```

```python
# ~/.hermes/hooks/session-webhook/handler.py

WEBHOOK_URL = "https://your-service.example.com/hermes-events"

async def handle(event_type: str, context: dict):
    async with httpx.AsyncClient() as client:
        await client.post(WEBHOOK_URL, json={
            "event": event_type,
            **context,
        }, timeout=5)
```

### チュートリアル: BOOT.md — ゲートウェイが起動するたびに点検リストを走らせる {#tutorial-bootmd-run-a-startup-checklist-on-every-gateway-boot}

利用者のあいだで広まっている使い方です。`~/.hermes/BOOT.md` に Markdown の点検リストを置いておき、ゲートウェイが起動するたびにエージェントに一度だけ実行させます。「起動のたびに夜間の cron の失敗を確認して、失敗があれば Discord で知らせて」や「直近 24 時間の deploy.log をまとめて Slack の #ops に投げて」といった用途に向いています。

このチュートリアルでは、これを自分で定義するフックとして組み立てる手順を示します。Hermes は BOOT.md 用のフックを標準では同梱していません。欲しい動きは自分で組みます。

#### 何を作るのか {#what-were-building}

1. 起動時の指示を自然な文章で書いた `~/.hermes/BOOT.md`。
2. `gateway:startup` で発火し、ゲートウェイが解決したモデルと資格情報で使い捨てのエージェントを起こし、BOOT.md の指示を実行するゲートウェイフック。
3. 報告することが何もないときにメッセージの送信を見送れるようにする `[SILENT]` という取り決め。

#### 手順 1: 点検リストを書く {#step-1-write-your-checklist}

`~/.hermes/BOOT.md` を作ります。人のアシスタントに指示を出すつもりで書いてください。

```markdown
# Startup Checklist

1. Run `hermes cron list` and check if any scheduled jobs failed overnight.
2. If any failed, summarize them for Discord #ops (the hook delivers your final response to its configured target).
3. Check if `/opt/app/deploy.log` has any ERROR lines from the last 24 hours. If yes, summarize them and include in the same report.
4. If nothing went wrong, reply with only `[SILENT]` so no message is sent.
```

エージェントはこの中身をプロンプトの一部として読みます。ですから、普通の言葉で説明できることなら何でも書けます — ツールの呼び出し、シェルコマンド、メッセージの送信、ファイルの要約など。

#### 手順 2: フックを作る {#step-2-create-the-hook}

```text
~/.hermes/hooks/boot-md/
├── HOOK.yaml
└── handler.py
```

**`~/.hermes/hooks/boot-md/HOOK.yaml`**

```yaml
name: boot-md
description: Run ~/.hermes/BOOT.md on gateway startup
events:
  - gateway:startup
```

**`~/.hermes/hooks/boot-md/handler.py`**

```python
"""Run ~/.hermes/BOOT.md on every gateway startup."""

from pathlib import Path

logger = logging.getLogger("hooks.boot-md")

BOOT_FILE = Path.home() / ".hermes" / "BOOT.md"

def _build_prompt(content: str) -> str:
    return (
        "You are running a startup boot checklist. Follow the instructions "
        "below exactly.\n\n"
        "---\n"
        f"{content}\n"
        "---\n\n"
        "Execute each instruction. Put any user-facing summary in your "
        "final response — the hook delivers it to the configured channel "
        "(e.g. Discord or Slack); you do not send messages yourself.\n"
        "If nothing needs attention and there is nothing to report, reply "
        "with ONLY: [SILENT]"
    )

def _run_boot_agent(content: str) -> None:
    """Spawn a one-shot agent and execute the checklist.

    Uses the gateway's resolved model and runtime credentials so this works
    against custom endpoints, aggregators, and OAuth-based providers alike.
    """
    try:
        from gateway.run import _resolve_gateway_model, _resolve_runtime_agent_kwargs
        from run_agent import AIAgent

        agent = AIAgent(
            model=_resolve_gateway_model(),
            **_resolve_runtime_agent_kwargs(),
            platform="gateway",
            quiet_mode=True,
            skip_context_files=True,
            skip_memory=True,
            max_iterations=20,
        )
        result = agent.run_conversation(_build_prompt(content))
        response = (result.get("final_response", "") or "").strip()
        if response.upper() not in {"[SILENT]", "SILENT", "NO_REPLY", "NO REPLY"}:
            logger.info("boot-md completed: %s", response[:200])
        else:
            logger.info("boot-md completed (nothing to report)")
    except Exception as e:
        logger.error("boot-md agent failed: %s", e)

async def handle(event_type: str, context: dict) -> None:
    if not BOOT_FILE.exists():
        return
    content = BOOT_FILE.read_text(encoding="utf-8").strip()
    if not content:
        return

    logger.info("Running BOOT.md (%d chars)", len(content))

    # Background thread so gateway startup isn't blocked on a full agent turn.
    thread = threading.Thread(
        target=_run_boot_agent,
        args=(content,),
        name="boot-md",
        daemon=True,
    )
    thread.start()
```

要になるのは次の 2 行です。

- `_resolve_gateway_model()` は、ゲートウェイに現在設定されているモデルを読み取ります。
- `_resolve_runtime_agent_kwargs()` は、通常のゲートウェイの応答と同じやり方で提供元の資格情報を解決します — API キー、ベース URL、OAuth トークン、資格情報プールを含みます。

これらを書かないと、素の `AIAgent()` は組み込みの既定値に落ち、既定以外のエンドポイントに対しては 401 になります。

#### 手順 3: 動かして確かめる {#step-3-test-it}

ゲートウェイを再起動します。

```bash
hermes gateway restart
```

ログを見ます。

```bash
hermes logs --follow --level INFO | grep boot-md
```

`Running BOOT.md (N chars)` に続いて、`boot-md completed: ...`（エージェントが何をしたかの要約）か、`[SILENT]` のような沈黙を表す語だけを返した場合の `boot-md completed (nothing to report)` のどちらかが出るはずです。

点検リストをやめたいときは `~/.hermes/BOOT.md` を削除します。フックは読み込まれたままですが、ファイルがなければ何もせず通り過ぎます。

#### この型を広げる {#extending-the-pattern}

- **曜日や時期で内容を変える:** BOOT.md の指示の中で `datetime.now().weekday()` を手がかりにします（「月曜なら週次のデプロイログも確認して」など）。指示は自由な文章なので、エージェントが考えられることなら何でも書けます。
- **点検リストを複数持つ:** フックが読むファイルを別のもの（`STARTUP.md`、`MORNING.md` など）に変え、それぞれ別のフックのディレクトリとして登録します。
- **エージェントを使わない版:** エージェントのループが不要なら `AIAgent` は使わず、ハンドラーから `httpx` で決まった通知を直接投げます。安く、速く、提供元に依存しません。

#### なぜ標準機能ではないのか {#why-this-isnt-a-built-in}

以前の Hermes はこれを組み込みのフックとして同梱していて、ゲートウェイが起動するたびに素の既定値でエージェントを黙って起こしていました。独自のエンドポイントを使っている人を驚かせましたし、動いていること自体を知らない人からは仕組みが見えませんでした。文書化された型として — 自分の手で、自分の hooks ディレクトリに — 置く形にすれば、何が起きるかがそのまま見えますし、ファイルを書くという行為が導入の意思表示になります。

### 仕組み {#how-it-works}

1. ゲートウェイの起動時に、`HookRegistry.discover_and_load()` が `~/.hermes/hooks/` を走査します
2. `HOOK.yaml` と `handler.py` がそろっているサブディレクトリが動的に読み込まれます
3. ハンドラーは、宣言したイベントに対して登録されます
4. 各ライフサイクルの節目で、`hooks.emit()` が該当するハンドラーをすべて発火します
5. どのハンドラーのエラーも捕捉して記録されます — 壊れたフックがエージェントを落とすことはありません

:::info
ゲートウェイフックが発火するのは**ゲートウェイ**（Telegram、Discord、Slack、WhatsApp、Teams）の中だけです。CLI はゲートウェイフックを読み込みません。どこでも動くフックが欲しい場合は[プラグインフック](#plugin-hooks)を使ってください。
:::
## プラグインフック {#plugin-hooks}

[プラグイン](/hermes/docs/user-guide/features/plugins/)は、**CLI とゲートウェイの両方**のセッションで発火するフックを登録できます。登録はプログラムから行い、プラグインの `register()` 関数の中で `ctx.register_hook()` を呼びます。

プラグインの梱包と登録の詳細については、
[プラグインの手引き](/hermes/docs/user-guide/features/plugins/)を参照してください。

```python
def register(ctx):
    ctx.register_hook("pre_tool_call", my_tool_observer)
    ctx.register_hook("post_tool_call", my_tool_logger)
    ctx.register_hook("pre_llm_call", my_memory_callback)
    ctx.register_hook("post_llm_call", my_sync_callback)
    ctx.register_hook("on_session_start", my_init_callback)
    ctx.register_hook("on_session_end", my_cleanup_callback)
    # Kanban board lifecycle (dependency-wait blocking may fire inside its transaction):
    ctx.register_hook("kanban_task_claimed", my_claim_callback)     # dispatcher process
    ctx.register_hook("kanban_task_completed", my_done_callback)    # worker process
    ctx.register_hook("kanban_task_blocked", my_blocked_callback)   # worker process
```

**すべてのフックに共通する決まりごと:**

- コールバックは**キーワード引数**を受け取ります。将来の変更に備えて、必ず `**kwargs` も受け取るようにしてください。
- コールバックが例外を投げた場合は記録して読み飛ばし、後続のコールバックはそのまま続きます。
- 下の一覧は分類の説明です。**観測系**は戻り値を無視し、**変換系**は最初に返された有効な文字列で置き換え、**指示・制御系**は決められた形の戻り値を解釈します。プラグインのミドルウェアはこれとは別の登録先・別の面であって、フックのもう 1 つの分類ではありません。
- `turn_id`、`api_request_id`、`task_id`、`session_id`、`api_call_count` といった突き合わせ用の項目はフックごとに異なり、ないこともあります。ID は中身を解釈せず、そのまま扱ってください。
- 実行時にどのイベント名が有効かは `hermes_cli.plugins.VALID_HOOKS` が決めます。`hermes hooks list` が並べるのは設定済みのシェルフックと送信 Webhook であって、使えるイベントすべてではありません。`hermes hooks test <event>` は、無効なイベントを渡したときにだけ有効な一覧を教えてくれます。

### キャッシュを壊さないシステムプロンプトの節 {#cache-safe-system-prompt-sections}

常に効かせておきたい案内を持つプラグインは、毎回の応答で `pre_llm_call` から同じ文面を差し込む代わりに、長さの上限があるシステムプロンプトの節を登録できます。

```python
def board_rules(session_info):
    return f"Apply the worker rules for profile {session_info['profile_name']}."

def register(ctx):
    ctx.register_system_prompt_section(
        "kanban-advanced.worker-rules",
        board_rules,                       # a string is also accepted
        position="after_memory",
        max_chars=4000,
    )
```

取り決めは意図的に狭くしてあります。

- ID は全体で一意、変わらない値で、1〜128 文字の小文字の識別子です。使えるのは
  英字、数字、`.`、`_`、`-` だけです。ID が重複すると拒否されます。
- 位置の指定は `after_memory` だけです。節は ID 順に並び、
  記憶やプロファイルの文脈より後、セッションのメタ情報より前に描画されます。プラグインが
  中核のプロンプトの中身を並べ替えたり差し替えたりすることはできません。
- 呼び出し可能オブジェクトには、`session_id`、`model`、
  `provider`、`platform`、`profile_name`、`cwd` を持つ読み取り専用のマッピングが渡ります。実行されるのは
  **新しいセッションにつき 1 回**です。描画された内容は圧縮の時点で固定され、プロセスの再起動や再開のあとは
  すでに保存済みのシステムプロンプト全体から復元されます。
  既存のセッションに対してプラグインの状態を読み直すことはありません。
- `max_chars` の上限は 4,000 文字です。プラグインの節をすべて合わせると、
  監査用の見出しも含めて 8,000 文字・32 個までに制限されます。空のもの、文字列でないもの、大きすぎるもの、
  合計が上限を超えるもの、例外を投げたものは警告を出して読み飛ばされ、プロンプトの組み立ては続きます。
- 受け入れられた節はすべてプロンプト内に名前が出て、セッション開始時に
  プラグイン名・位置・文字数とともに記録されます。

応答ごとに本当に変わる文脈には `pre_llm_call` を使ってください。この取り決めには、
プラグインが環境情報を差し込むためのフックを意図的に用意していません。作業ディレクトリやブランチなどの
環境データが変わったからといって、セッションのキャッシュ済みプロンプトが黙って書き換わってはいけないからです。
そうしたフックを追加するには、具体的な利用先と、同じ「固定される・再開しても安全」という意味づけが先に必要です。

### 同梱のプラグインフック一覧 {#shipped-plugin-hook-catalog}

以下のペイロードの項目は、それぞれの呼び出し箇所が渡すイベント固有の項目そのものです。後方互換のため、`PluginManager` はすべてのプラグインフックのコールバックに `telemetry_schema_version="hermes.observer.v1"` も付け足します。この古い封筒の目印は、すべてのフックのペイロードが 1 つの意味づけを共有していることを表すものではありません。新しく版を切る取り決めは、それぞれのイベントや機能の系統に属します。

| フック | 分類 | 発火の正確なタイミングと戻り値の扱い | 明示されるペイロードの項目 | プライバシー・機微さ |
|---|---|---|---|---|
| [`pre_tool_call`](#pre_tool_call) | 指示・制御 | 実行前に 1 回。最初に返された有効な `block` または `approve` の指示が採用され、`modify` の戻り値はツールの引数へ浅く統合されます。 | `tool_name`、`args`、`task_id`、`session_id`、`tool_call_id`、`turn_id`、`api_request_id`、`middleware_trace` | 生の引数には利用者の入力、パス、コマンド、秘密情報が含まれることがあります。 |
| `post_tool_call` | 観測 | 遮断・エラー・成功のいずれの結果のあとでも発火。戻り値は無視されます。 | `tool_name`、`args`、`result`、`task_id`、`session_id`、`tool_call_id`、`turn_id`、`api_request_id`、`duration_ms`、`status`、`error_type`、`error_message`、`middleware_trace` | 結果やエラーの文面には、任意のツール出力や利用者の入力、秘密情報が含まれることがあります。 |
| `transform_tool_result` | 変換 | `post_tool_call` のあと、会話へ追記する前。最初の文字列が結果を置き換えます。 | `tool_name`、`args`、`result`、`task_id`、`session_id`、`tool_call_id`、`turn_id`、`api_request_id`、`duration_ms`、`status`、`error_type`、`error_message` | モデルに渡る結果と引数がそのまま見えます。 |
| `transform_terminal_output` | 変換 | 上限付きで前面のプロセス出力を取り込んだあと、最終的な出力の切り詰めより前。最初の文字列が出力を置き換えます。 | `command`、`output`、`returncode`、`task_id`、`env_type` | コマンドや出力に資格情報が含まれることがあります。 |
| `pre_transcription` | 変換 | 音声認識の振り分け役が提供元を決めたあと、どのバックエンド（組み込み・コマンド型・プラグイン登録のいずれも）を呼ぶ前にも発火します。辞書の戻り値は登録順に適用され、項目ごとに後勝ちです（`prompt`、`language`、`model`。`file_path` は読み取り専用）。 | `file_path`、`provider`、`model`、`language`、`prompt`、`source` | 最終的なプロンプトは音声とともに設定済みの音声認識の提供元へ送られます — フックの戻り値に秘密情報を入れないでください。 |
| `pre_llm_call` | 指示・制御 | 応答ごとに 1 回、ループの前。有効な文字列や `{"context": ...}` の戻り値はすべて連結され、利用者のメッセージへ差し込まれます。 | `session_id`、`task_id`、`turn_id`、`user_message`、`conversation_history`、`is_first_turn`、`model`、`platform`、`parent_session_id`、`sender_id` | 利用者のメッセージ全文と会話履歴。 |
| `post_llm_call` | 観測 | 中断されずに成功した応答の締めくくり。戻り値は無視されます。 | `session_id`、`task_id`、`turn_id`、`user_message`、`assistant_response`、`conversation_history`、`model`、`platform` | プロンプト・応答・履歴の全文。 |
| `transform_llm_output` | 変換 | `post_llm_call` と最終的な送出の前。空でない最初の文字列が応答を置き換えます。 | `response_text`、`session_id`、`model`、`platform` | アシスタントの最終出力の全文。 |
| `pre_verify` | 指示・制御 | 編集済みコードの検証ゲート（上限付き）の地点。最初に返された有効な「続行」「遮断して停止」の指示で応答を続けるかが決まります。 | `session_id`、`platform`、`model`、`coding`、`attempt`、`final_response`、`changed_paths` | 下書きの応答と変更されたパス。 |
| `pre_api_request` | 観測 | 提供元への試行ごとに、リクエストの直前。戻り値は無視されます。 | `task_id`、`turn_id`、`api_request_id`、`session_id`、`user_message`、`conversation_history`、`platform`、`model`、`provider`、`base_url`、`api_mode`、`api_call_count`、`retry_count`、`request_messages`、`message_count`、`tool_count`、`approx_input_tokens`、`request_char_count`、`max_tokens`、`started_at`、`middleware_trace`、`request` | 機微さは高めです。古くからある `user_message`、`conversation_history`、`request_messages` は意図的に生のままです。伏せ字処理済みの `request` を使ってください。 |
| `post_api_request` | 観測 | 提供元からの応答を正規化して成功したあと。戻り値は無視されます。 | `task_id`、`turn_id`、`api_request_id`、`session_id`、`platform`、`model`、`provider`、`base_url`、`api_mode`、`api_call_count`、`api_duration`、`started_at`、`ended_at`、`finish_reason`、`message_count`、`response_model`、`response`、`usage`、`assistant_message`、`assistant_content_chars`、`assistant_tool_call_count` | 伏せ字処理済みの `response` が使えますが、正規化しただけの生の `assistant_message` にはモデルや利用者の内容が含まれることがあります。`usage` は集計用のデータです。 |
| `api_request_error` | 観測 | 提供元への試行が失敗するたび。戻り値は無視されます。 | `task_id`、`turn_id`、`api_request_id`、`session_id`、`platform`、`model`、`provider`、`base_url`、`api_mode`、`api_call_count`、`api_duration`、`started_at`、`ended_at`、`status_code`、`retry_count`、`max_retries`、`retryable`、`reason`、`error`、`request` | エラーの文面には提供元や利用者のデータが含まれることがあります。`request` は伏せ字処理される想定です。 |
| `on_stream_start` | 観測 | 逐次出力の応答が始まったときに配られます。トークンの経路とは切り離し、ホストが持つ上限付きのキューを通して、コールバックごとに 1 つの担当者が配ります。戻り値は無視されます。 | `turn_id`、`iteration`、`session_id`、`model`、`provider`、`surface` | 識別子と経路のメタ情報だけです。 |
| `on_stream_delta` | 観測 | 正規化された逐次出力の差分ごとに、上限付きの観測キューを通して配られます。あるコールバックが詰まっても、捨てられるのはそのコールバック自身の古いイベントだけです。戻り値は無視されます。 | `delta`、`kind`（`text` または `reasoning`）、`turn_id`、`iteration`、`session_id`、`model`、`provider`、`surface` | 差分の文面はモデルの生の出力です。推論の差分を受け取るには `plugins.stream_reasoning_deltas` での明示的な許可が必要です。 |
| `on_stream_end` | 観測 | 逐次出力が終わるか失敗したあと、ストリームが閉じてから配られます。戻り値は無視されます。 | `final_text`、`finished`、`error`、`turn_id`、`iteration`、`session_id`、`model`、`provider`、`surface` | 組み立て済みの応答の全文。エラーの文面には提供元のデータが含まれることがあります。 |
| `on_interim_message` | 観測 | 最終的な答えの前に、ループの途中でアシスタントのメッセージが表に出たときに配られます（逐次出力かどうかを問いません）。戻り値は無視されます。 | `text`、`already_streamed`、`turn_id`、`iteration`、`session_id`、`model`、`provider`、`surface` | 途中のアシスタント出力の全文。 |
| `transform_api_error_classification` | 変換 | 提供元への試行が失敗するたび、組み込みの分類処理の先頭で発火します。すべてのコールバックを走らせたうえで、有効な `reason` を持つ最初の辞書が採用されます（全部走らせてから先頭を採る方式）。採用されなかった有効な結果は実行時の警告として記録されます。Python プラグインのみ対応。 | `provider`、`model`、`status_code`、`error_type`、`error_code`、`error_message`、`error_body`、`error`、`approx_tokens`、`context_length`、`num_messages` | `error_message` と `error_body` には提供元や利用者のデータが生のまま含まれることがあります。 |
| `on_session_start` | 観測 | 新しいセッションの最初の応答。戻り値は無視されます。 | `session_id`、`model`、`platform` | 識別子と経路のメタ情報だけです。 |
| `on_session_end` | 観測 | 正式には応答を締めくくるたびに発火します。CLI や TUI の終了時には、項目を減らした古い形も別に流れます。戻り値は無視されます。 | 正式な形: `session_id`、`task_id`、`turn_id`、`completed`、`failed`、`interrupted`、`turn_exit_reason`、`model`、`platform`。終了経路では `reason` や `api_request_id` が加わったり、項目が欠けたりします。 | ID、モデルとプラットフォーム、結果です。正式なペイロードにメッセージ本文は含まれません。 |
| `on_session_finalize` | 観測 | `finalize_session` を通した CLI・TUI・ゲートウェイの後始末。ゲートウェイの停止や期限切れでは、リセットを伴わずに締めくくられることがあります。戻り値は無視されます。 | 面によって異なる `session_id`、`platform`、場合により `reason`、`old_session_id`、`new_session_id` | セッションと経路の識別子。 |
| `on_session_reset` | 観測 | CLI・TUI ではセッションの切れ目、ゲートウェイでは後継のセッションができたあと。戻り値は無視されます。 | CLI: `session_id`、`platform`、`reason`。TUI: `session_id`、`platform`。ゲートウェイ: これらに加えて `reason`、`old_session_id`、`new_session_id` | セッションと経路の識別子。 |
| `on_skill_lifecycle` | 観測 | スキルの利用状態が正式に変わったあと。戻り値は無視されます。 | `action`、`skill_name`、`provenance`、`task_id`、`session_id`、`use_count`、`reused`、`reuse_after_patch` | 手元のスキル名と出どころが見えます。 |
| `subagent_start` | 観測 | 子エージェントを組み立てて、これから走らせるところ。戻り値は無視されます。 | `parent_session_id`、`parent_turn_id`、`parent_subagent_id`、`child_session_id`、`child_subagent_id`、`child_role`、`child_goal` | 子の目標には利用者やプロジェクトの内容が含まれることがあります。 |
| `subagent_stop` | 観測 | 子エージェントの終了時。戻り値は無視されます。 | `parent_session_id`、`parent_turn_id`、`child_session_id`、`child_role`、`child_summary`、`child_status`、`tool_call_history`、`duration_ms` | 要約と、伏せ字処理済みのツール履歴のメタ情報から、プロジェクトの構成が推測できることがあります。 |
| `pre_gateway_dispatch` | 指示・制御 | 内部由来でない受信メッセージについて、認証・ペアリング・振り分けの前。最初に返された有効な `skip`、`rewrite`、`allow` が流れを決めます。 | `event`、`gateway`、`session_store` | 権限が非常に強いプロセス内のオブジェクトで、受信した利用者データや経路の情報、ホスト側のハンドルが見えます。 |
| `gateway_platform_event` | 観測 | ゲートウェイのプロファイル単位の認可が通ったあと、対応するプラットフォーム固有のイベントがゲートウェイの境界で正規化されたときに発火します（Telegram: リアクション、メッセージの編集。Discord: メッセージの編集・削除、スレッドの作成・改名）。戻り値は無視されます。 | `platform`、`event_type`、`payload`（イベントの種類ごとの辞書 — 後述のイベント別の取り決めを参照） | 正規化された素の辞書の封筒だけです。SDK の生のオブジェクト、アダプターのハンドル、ボットのクライアントが外に出ることはありません。 |
| `pre_command` | 観測 | 認識済みのスラッシュコマンドが振り分けられる直前、ハンドラーが走る前に、CLI とゲートウェイの通常の振り分け経路で発火します。v1 では戻り値は無視されます（指示の形をした辞書はデバッグ記録に残ります）。ゲートウェイで実行中のエージェントに割り込むコマンド（実行中の `/stop`、`/approve`）は意図的に対象外です — 制御面の非常口はプラグインの手が届かない場所に置いておく必要があります。 | `surface`（`"cli"` \| `"gateway"`）、`command`（正式な名前）、`alias_used`、`args_raw`、`session_key`、`platform` | `args_raw` には、コマンドのあとに入力された利用者の内容や秘密情報が含まれることがあります。 |
| `pre_approval_request` | 観測 | 問い合わせ形式または自動判定の承認の前。戻り値は無視されます。 | `command`、`description`、`pattern_key`、`pattern_keys`、`session_key`、`surface`、`turn_id`、`tool_call_id` | コマンドに秘密情報が含まれることがあります。自動判定の観測用の下ごしらえでは強制的に伏せ字にしますが、伏せ字の扱いは面ごとに同じとは限りません。 |
| `post_approval_response` | 観測 | 判断・時間切れ・ゲートウェイの通知失敗のあと。戻り値は無視されます。 | `command`、`description`、`pattern_key`、`pattern_keys`、`session_key`、`surface`、`turn_id`、`tool_call_id`、`choice`。自動判定の経路では `decided_by` が加わることがあります | コマンドの機微さは同じで、加えて判断のメタ情報が載ります。 |
| `kanban_task_claimed` | 観測 | 引き受けを確定したあと、振り分け役のプロセス内で、作業役を起こす前。戻り値は無視されます。 | `task_id`、`profile_name`、`board`、`assignee`、`run_id` | ボード・タスク・プロファイル・担当者の識別子。 |
| `kanban_task_completed` | 観測 | 完了と後始末のあと、通常は作業役のプロセス内。戻り値は無視されます。 | `task_id`、`profile_name`、`board`、`assignee`、`run_id`、`summary` | 要約にはプロジェクトや利用者の内容が含まれることがあります。 |
| `kanban_task_blocked` | 観測 | 停滞状態へ移ったあと。依存待ちの経路では、そのトランザクションを抜ける前に発火します。戻り値は無視されます。 | `task_id`、`profile_name`、`board`、`assignee`、`run_id`、`reason` | 理由にはプロジェクトや利用者の内容が含まれることがあります。 |
| `on_kanban_worker_spawned` | 観測 | `spawn_fn` が返って作業役の PID を保存したあと。振り分けのロックの内側で走るので、コールバックは手短に済ませてください。戻り値は無視されます。 | `task_id`、`profile_name`、`board`、`assignee`、`run_id`、`worker_pid`、`workspace_path` | `workspace_path` はファイルシステムのパスなので、プロジェクトの構成や利用者名が見えることがあります。 |
| `on_kanban_worker_exited` | 観測 | 定期点検由来です。`detect_crashed_workers` が死んだ PID のタスクを回収し、その回収が確定したあとに発火します。戻り値は無視されます。 | `task_id`、`profile_name`、`board`、`assignee`、`run_id`、`worker_pid`、`exit_kind`、`exit_code`、`outcome`、`retry_status` | 識別子と終了時のメタ情報だけです。 |
| `on_kanban_worker_stale_claim` | 観測 | 期限切れの引き受けが回収されたあと。PID が生きていて期限を延ばした場合は発火しません。戻り値は無視されます。 | `task_id`、`profile_name`、`board`、`assignee`、`run_id`、`worker_pid`、`heartbeat_stale`、`retry_status` | 識別子と引き受けのメタ情報だけです。 |
| `on_kanban_task_updated` | 観測 | 引き受け・完了・停滞というライフサイクルの外で、タスクの項目への書き込みが確定したあと（担当の割り当て、上書き設定、ダッシュボードの編集画面）。戻り値は無視されます。 | `task_id`、`profile_name`、`board`、`assignee`、`run_id`、`changed_fields` | `changed_fields` が運ぶのは項目名だけで、値は含みません。ただしボードのデータベース側にある題名や本文の値には、利用者やプロジェクトの内容が含まれることがあります。 |
| `on_kanban_dispatch_tick` | 観測 | 振り分け役の点検 1 回につき 1 度、振り分けのロックを手放した直後に発火します。何もしなかった回や競合した回でも発火します。戻り値は無視されます。 | `board`、`profile_name`、`dry_run`、`outcome`、`result` | `result` はその回の `DispatchResult` で、タスク ID、担当者、作業場所のパスを含みます。 |

---

### 逐次出力のフック {#streaming-output-hooks}

これらは観測専用のフックで、応答そのものは変えずに、逐次出力される LLM の出力を計測・実況ダッシュボード・音声合成の処理などに使えます。配送はホストが持つ上限付きのキューを通して行われ、登録されたコールバックごとに裏方が 1 つ付くので、プラグインのコールバックがトークンの経路上でそのまま走ることはありません。あるコールバックが詰まっても、いっぱいになって古い観測イベントを捨てるのはそのコールバックのキューだけで、他の観測側は独立してイベントを受け取り続けます。

登録の仕方は他のプラグインフックと同じです。

```python
def on_delta(delta, kind, model, provider, **kwargs):
    if kind == "text":
        print(delta, end="", flush=True)

def register(ctx):
    ctx.register_hook("on_stream_delta", on_delta)
```

4 つのフックに共通する項目は次のとおりです。

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `turn_id` | `str` | 応答を表す識別子（中身は解釈しない）。取得できる場合のみ |
| `iteration` | `int` | 現在の API 呼び出し／ツールループの回数 |
| `session_id` | `str` | 現在の Hermes のセッション id |
| `model` | `str` | 使用中のモデルの識別子 |
| `provider` | `str` | 使用中の提供元の名前 |
| `surface` | `str` | 呼び出し元の面。例: `cli`、`discord`、`telegram` |

追加の項目は次のとおりです。

| フック | 追加の項目 |
|------|--------------|
| `on_stream_start` | なし |
| `on_stream_delta` | `delta: str`, `kind: "text" | "reasoning"` |
| `on_stream_end` | `final_text: str`, `finished: bool`, `error: str | None` |
| `on_interim_message` | `text: str`, `already_streamed: bool` |

`on_interim_message` は逐次出力でない応答のあとにも発火します。そのため、このフックだけを登録しても、提供元への呼び出しが逐次出力の通信方式へ切り替わることはありません。

推論の差分は、既定ではプラグインに渡されません。明示的に許可してください。

```yaml
plugins:
  stream_reasoning_deltas: true
```

戻り値は無視されます。ストリームを詰まらせないために、コールバックは自分の仕事をキューに積んですぐ返すようにしてください。例外は記録されるだけで、ストリームは止まりません。

---

### `pre_tool_call` {#pretoolcall}

ツールが実行される**直前**に発火します。組み込みのツールでもプラグインのツールでも同じです。

**コールバックの形:**

```python
def my_callback(tool_name: str, args: dict, task_id: str, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `tool_name` | `str` | これから実行されるツールの名前（例: `"terminal"`、`"web_search"`、`"read_file"`） |
| `args` | `dict` | モデルがツールに渡した引数 |
| `task_id` | `str` | セッション／タスクの識別子。未設定なら空文字列。 |

**発火箇所:** `model_tools.py` の `handle_function_call()` の中、ツールのハンドラーが走る前です。ツール呼び出し 1 回につき 1 度発火します — モデルが 3 つのツールを同時に呼べば 3 回発火します。

**戻り値 — 遮断する、または承認を求める:**

```python
return {"action": "block", "message": "Reason the tool call was blocked"}
# or
return {"action": "approve", "message": "Why approval is required", "rule_key": "optional:scope"}
```

最初に返された有効な指示が採用されます（先に Python プラグイン、次にシェルフックの順）。`block` には空でない `message` が必要で、ツールの実行を打ち切り、その文面をエラーとしてモデルに返します。`approve` は呼び出しを既存の人による承認ゲートへ引き上げます。`message` と `rule_key` は省略できます。否認・時間切れ・ゲートのエラーはいずれも安全側に倒れて失敗します。それ以外の戻り値は無視されるので、観測だけをしていた既存のコールバックはそのまま動き続けます。

**戻り値 — ツールの引数を書き換える:**

```python
return {"action": "modify", "args": {"new_string": "fixed content"}}
```

返された `args` の辞書は、ツールが走る前に元のツールの引数へ浅く統合されます。`modify` のフックが複数あるときは積み重なります — 元の引数から作った 1 つの辞書に各フックのキーが統合されるので、フック A が `path` を、フック B が `content` を変えれば、どちらも残ります。2 つのフックが同じキーを変えた場合は、あとのフックが勝ちます。

シェルフックでは、Claude Code と互換の形式も受け付けます。

```json
{"decision": "modify", "tool_input": {"new_string": "fixed content"}}
```

どちらの形式も、内部では `{"action": "modify", "args": {...}}` に揃えられます。

**使いどころ:** 記録、監査証跡、ツール呼び出しの回数集計、危険な操作の遮断、実行頻度の制限、利用者ごとの方針の適用、引数の無害化、パスの書き換え、既定の引数の差し込み。

**例 — ツール呼び出しの監査ログ:**

```python

from datetime import datetime

logger = logging.getLogger(__name__)

def audit_tool_call(tool_name, args, task_id, **kwargs):
    logger.info("TOOL_CALL session=%s tool=%s args=%s",
                task_id, tool_name, json.dumps(args)[:200])

def register(ctx):
    ctx.register_hook("pre_tool_call", audit_tool_call)
```

**例 — 危険なツールで警告を出す:**

```python
DANGEROUS = {"terminal", "write_file", "patch"}

def warn_dangerous(tool_name, **kwargs):
    if tool_name in DANGEROUS:
        print(f"⚠ Executing potentially dangerous tool: {tool_name}")

def register(ctx):
    ctx.register_hook("pre_tool_call", warn_dangerous)
```

---

### `post_tool_call` {#posttoolcall}

ツールの実行が返ってきた**直後**に発火します。

**コールバックの形:**

```python
def my_callback(tool_name: str, args: dict, result: str, task_id: str,
                duration_ms: int, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `tool_name` | `str` | いま実行されたツールの名前 |
| `args` | `dict` | モデルがツールに渡した引数 |
| `result` | `str` | ツールの戻り値（常に JSON 文字列） |
| `task_id` | `str` | セッション／タスクの識別子。未設定なら空文字列。 |
| `duration_ms` | `int` | ツールの振り分けにかかった時間（ミリ秒。`registry.dispatch()` の前後を `time.monotonic()` で計測） |

**発火箇所:** `model_tools.py` の `handle_function_call()` の中、ツールのハンドラーが返ったあとです。ツール呼び出し 1 回につき 1 度発火します。ツールが捕捉されない例外を投げた場合は発火**しません**（そのエラーは捕捉されてエラーの JSON 文字列として返され、`post_tool_call` はその文字列を `result` として発火します）。

**戻り値:** 無視されます。

**使いどころ:** ツールの結果の記録、指標の収集、ツールの成功率・失敗率の追跡、応答時間のダッシュボード、ツールごとの予算の警告、特定のツールが終わったときの通知。

**例 — ツールの利用指標を集める:**

```python
from collections import Counter, defaultdict

_tool_counts = Counter()
_error_counts = Counter()
_latency_ms = defaultdict(list)

def track_metrics(tool_name, result, duration_ms=0, **kwargs):
    _tool_counts[tool_name] += 1
    _latency_ms[tool_name].append(duration_ms)
    try:
        parsed = json.loads(result)
        if "error" in parsed:
            _error_counts[tool_name] += 1
    except (json.JSONDecodeError, TypeError):
        pass

def register(ctx):
    ctx.register_hook("post_tool_call", track_metrics)
```

---

### `pre_llm_call` {#prellmcall}

ツール呼び出しのループが始まる前に、**応答ごとに 1 回**発火します。有効な戻り値はすべてプラグインの順に集められ、その応答の利用者のメッセージへ差し込まれます。

**コールバックの形:**

```python
def my_callback(session_id: str, user_message: str, conversation_history: list,
                is_first_turn: bool, model: str, platform: str, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `session_id` | `str` | 現在のセッションを表す一意の識別子 |
| `user_message` | `str` | この応答における利用者の元のメッセージ（スキルの差し込みが起きる前のもの） |
| `conversation_history` | `list` | メッセージ一覧全体の写し（OpenAI 形式: `[{"role": "user", "content": "..."}]`） |
| `is_first_turn` | `bool` | 新しいセッションの最初の応答なら `True`、2 回目以降は `False` |
| `model` | `str` | モデルの識別子（例: `"anthropic/claude-sonnet-4.6"`） |
| `platform` | `str` | セッションが動いている場所: `"cli"`、`"telegram"`、`"discord"` など |

**発火箇所:** `run_agent.py` の `run_conversation()` の中、文脈の圧縮のあと、主となる `while` ループの前です。`run_conversation()` の呼び出しごと（つまり利用者の応答 1 回ごと）に発火し、ツールループ内の API 呼び出しごとではありません。

**戻り値:** コールバックが `"context"` キーを持つ辞書、または空でない普通の文字列を返すと、その文面がその応答の利用者のメッセージに追記されます。差し込まないときは `None` を返します。

```python
# Inject context
return {"context": "Recalled memories:\n- User likes Python\n- Working on hermes-agent"}

# Plain string (equivalent)
return "Recalled memories:\n- User likes Python"

# No injection
return None
```

**文脈が差し込まれる場所:** 常に**利用者のメッセージ**であり、システムプロンプトではありません。こうすることでプロンプトのキャッシュが保たれます — システムプロンプトが応答をまたいで同じままなので、キャッシュ済みのトークンを再利用できます。システムプロンプトは Hermes の領分です（モデルへの案内、ツールの強制、人格、スキル）。プラグインは、利用者の入力の傍らに文脈を添える形で貢献します。

きれいな利用者のメッセージの `content` はそのまま変わりません。やり直しの再生とプロンプトのキャッシュの安定のため、Hermes はプラグインが差し込んだ文脈も含めて、API へ実際に送られたメッセージをその行の `api_content` という付随データとして保存することがあります。

**複数のプラグイン**が文脈を返した場合、その出力はプラグインが見つかった順（ディレクトリ名のアルファベット順）に、空行を挟んで連結されます。

**使いどころ:** 記憶の呼び出し、RAG の文脈の差し込み、ガードレール、応答ごとの分析。

**例 — 記憶の呼び出し:**

```python

MEMORY_API = "https://your-memory-api.example.com"

def recall(session_id, user_message, is_first_turn, **kwargs):
    try:
        resp = httpx.post(f"{MEMORY_API}/recall", json={
            "session_id": session_id,
            "query": user_message,
        }, timeout=3)
        memories = resp.json().get("results", [])
        if not memories:
            return None
        text = "Recalled context:\n" + "\n".join(f"- {m['text']}" for m in memories)
        return {"context": text}
    except Exception:
        return None

def register(ctx):
    ctx.register_hook("pre_llm_call", recall)
```

**例 — ガードレール:**

```python
POLICY = "Never execute commands that delete files without explicit user confirmation."

def guardrails(**kwargs):
    return {"context": POLICY}

def register(ctx):
    ctx.register_hook("pre_llm_call", guardrails)
```

---

### `post_llm_call` {#postllmcall}

ツール呼び出しのループが終わり、エージェントが最終的な応答を作ったあとに、**応答ごとに 1 回**発火します。発火するのは**成功した**応答のときだけで、途中で中断された場合は発火しません。

**コールバックの形:**

```python
def my_callback(session_id: str, user_message: str, assistant_response: str,
                conversation_history: list, model: str, platform: str, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `session_id` | `str` | 現在のセッションを表す一意の識別子 |
| `user_message` | `str` | この応答における利用者の元のメッセージ |
| `assistant_response` | `str` | この応答でエージェントが返した最終的な文面 |
| `conversation_history` | `list` | 応答が終わったあとのメッセージ一覧全体の写し |
| `model` | `str` | モデルの識別子 |
| `platform` | `str` | セッションが動いている場所 |

**発火箇所:** `run_agent.py` の `run_conversation()` の中、ツールループが最終的な応答を持って抜けたあとです。`if final_response and not interrupted` で守られているので、利用者が応答の途中で割り込んだ場合や、エージェントが応答を作れないまま反復回数の上限に達した場合には発火**しません**。

**戻り値:** 無視されます。

**使いどころ:** 会話のデータを外部の記憶システムへ同期する、応答の品質指標を計算する、応答の要約を記録する、後続の処理を起動する。

**例 — 外部の記憶システムへ同期する:**

```python

MEMORY_API = "https://your-memory-api.example.com"

def sync_memory(session_id, user_message, assistant_response, **kwargs):
    try:
        httpx.post(f"{MEMORY_API}/store", json={
            "session_id": session_id,
            "user": user_message,
            "assistant": assistant_response,
        }, timeout=5)
    except Exception:
        pass  # best-effort

def register(ctx):
    ctx.register_hook("post_llm_call", sync_memory)
```

**例 — 応答の長さを追う:**

```python

logger = logging.getLogger(__name__)

def log_response_length(session_id, assistant_response, model, **kwargs):
    logger.info("RESPONSE session=%s model=%s chars=%d",
                session_id, model, len(assistant_response or ""))

def register(ctx):
    ctx.register_hook("post_llm_call", log_response_length)
```

---

### `pre_verify` {#preverify}

**エージェントがコードを編集した応答**につき 1 回、応答を終える直前（組み込みの「停止前に検証する」仕掛けのあと）に発火します。これは利用者やプラグインが方針を差し込むためのゲートです。コールバックが返せば、エージェントは停止せずに作業を続けられます — 検査を走らせる、あとに回す、差分を整える、といったことができます。

Hermes に同梱されている検証の案内は、既定の `pre_verify` フックではありません。編集したコードに新しい検証の証拠がないときに、証拠に基づく「停止前の一押し」へ書き足される形になっており、既定の継続経路が二重にできることはありません。組み込みの証拠の一押しを短く保ちたいときは `agent.verify_guidance: false` を設定してください。

**コールバックの形:**

```python
def my_callback(session_id: str, platform: str, model: str, coding: bool,
                attempt: int, final_response: str, changed_paths: list, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `session_id` | `str` | 現在のセッションを表す一意の識別子 |
| `platform` | `str` | セッションが動いている場所（`"cli"`、`"telegram"` など） |
| `model` | `str` | モデルの識別子 |
| `coding` | `bool` | その応答がコーディングの構えにあるか（コードの作業場所にいるか） — フックの適用範囲はこれで絞ります |
| `attempt` | `int` | その応答ですでに何回一押しされたか（初回は 0） — 自分で回数を抑えるのに使います |
| `final_response` | `str` | エージェントがこれから返そうとしている答え |
| `changed_paths` | `list` | その応答でエージェントが編集したファイル（並べ替え済み。ここでは必ず 1 つ以上） |

`coding` を見てコーディングの文脈に絞り、`attempt` で 1 回きりにします（シェルフックはどちらも `.extra` から読みます）。`pre_tool_call` のフックが `tool_name` で適用範囲を絞るのと同じ考え方です — こうすれば `pre_verify` のフックを複数登録して、それぞれ必要な場面だけで発火させられます。

**発火箇所:** `agent/conversation_loop.py` の、エージェントが最終的な答えを受け入れようとする地点で、停止前の検証の確認の直後です。ただし発火するのは、その応答でエージェントがコードを編集していて、なおかつ `pre_verify` のフックが 1 つ以上登録されているときだけです。

**戻り値 — エージェントに作業を続けさせる:**

```python
return {"action": "continue", "message": "Run the formatter on your changes, then finish."}
```

`message` は人工的な利用者の発言として追記され、ループがもう一度回ります。Claude Code の Stop の形（`{"decision": "block", "reason": "..."}`。停止を遮断することが*続行*を意味します）も受け付けます。メッセージのない指示や、それ以外の戻り値では、その応答はそのまま終わります。

**上限があります:** 1 つの応答で続けざまに出せる続行の指示は `agent.max_verify_nudges`（既定は 3）で頭打ちになるので、常に続行と言うフックがループを閉じ込めてしまうことはありません。一押しの最中は、返そうとしていた答えは履歴に残りますが、利用者には見せられません。

**何度呼ばれても同じ結果にしてください:** 一押しのたびにフックは再び発火するので、`attempt` で条件を付けてください（`if attempt: return None`）。そうしないと、上限に達するまで一押しし続けるだけになります。

**使いどころ:** 試行錯誤の最中はテストや静的検査をあとに回す、特定のパスでは検査の合格を必須にする、変更履歴の記載ができるまで「完了」を認めない、プロジェクト固有の検証の点検リストを走らせる。

**例 — UI の作り込み中は検査をあと回しにする（範囲を絞り、1 回きり）:**

```python
UI = (".tsx", ".jsx", ".css", ".scss")

def defer_ui_checks(coding, attempt, changed_paths, **kwargs):
    if attempt or not coding:
        return None  # one-shot, coding only
    if not all(p.endswith(UI) for p in changed_paths):
        return None  # only pure-UI edits
    return {
        "action": "continue",
        "message": "This is UI work — don't run tests/lints yet; ask the user to "
                   "eyeball it first, and clean the diff before any commit.",
    }

def register(ctx):
    ctx.register_hook("pre_verify", defer_ui_checks)
```

組み込みの「証拠が足りない」ときの一押しの中身を整えたい場合は、`agent.verify_guidance` を使ってください。検証を*せき止める*必要のない、もっと広いコーディングの構えの決まりごとには、`config.yaml` の `agent.coding_instructions` のほうが向いています — コーディングの説明に相乗りするので、応答を余分に消費しません。

---

### `transform_api_error_classification` {#transformapierrorclassification}

API の呼び出しが失敗するたびに 1 回、`agent/error_classifier.classify_api_error()` の先頭で、組み込みの処理の前に発火します。提供元のプラグインはこれを使って、中核に手を入れずに自分の提供元固有のエラーの癖を引き受けられます。これは挙動を変えるフックです（変換の系統）。返された分類が、再試行・圧縮・資格情報の切り替え・代替経路への振り分けを左右します。

コールバックは、解釈済みのエラーの情報をキーワード引数として受け取ります — `provider`（自分の担当かどうかはこれで判定します）、`model`、`status_code`、`error_type`、`error_code`、`error_message`、`error_body`、`error`、`approx_tokens`、`context_length`、`num_messages`。担当しないときは `None` を、そのエラーを引き受けるときは辞書を返します。

```python
return {"reason": "model_not_found",   # required: a FailoverReason name
        "retryable": False, "should_fallback": True}  # optional recovery-hint overrides
```

配り方は「全部走らせてから先頭を採る」方式です。すべてのコールバックが走り、失敗は切り離され、登録順で最初に有効だった結果が採用されます（有効だったのに採用されなかった結果は実行時の警告として記録されます）。不正な辞書や知らない理由は読み飛ばされるので、壊れたプラグインが分類そのものを壊すことはありません。

**プライバシー:** `error_message` と `error_body` には、伏せ字処理されていない提供元のデータが載ることがあります。**Python プラグイン専用**です — シェルから登録しようとすると、設定の読み込み時に警告付きで拒否されます。

---

### `on_session_start` {#onsessionstart}

まっさらなセッションが作られたときに **1 回だけ**発火します。既存のセッションの続き（利用者が 2 通目のメッセージを送ったとき）では発火**しません**。

**コールバックの形:**

```python
def my_callback(session_id: str, model: str, platform: str, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `session_id` | `str` | 新しいセッションを表す一意の識別子 |
| `model` | `str` | モデルの識別子 |
| `platform` | `str` | セッションが動いている場所 |

**発火箇所:** `run_agent.py` の `run_conversation()` の中、新しいセッションの最初の応答のあいだ — 具体的には、システムプロンプトを組み立てたあと、ツールループが始まる前です。判定は `if not conversation_history` です（先行するメッセージがなければ新しいセッション）。

**戻り値:** 無視されます。

**使いどころ:** セッション単位の状態を初期化する、キャッシュを温める、外部サービスにセッションを登録する、セッションの開始を記録する。

**例 — セッション用のキャッシュを用意する:**

```python
_session_caches = {}

def init_session(session_id, model, platform, **kwargs):
    _session_caches[session_id] = {
        "model": model,
        "platform": platform,
        "tool_calls": 0,
        "started": __import__("datetime").datetime.now().isoformat(),
    }

def register(ctx):
    ctx.register_hook("on_session_start", init_session)
```

---

### `on_session_end` {#onsessionend}

`run_conversation()` の呼び出しの**いちばん最後**に、結果を問わず発火します。利用者が終了したときにエージェントが応答の途中だった場合は、CLI の終了処理からも発火します。

**コールバックの形:**

```python
def my_callback(session_id: str, completed: bool, interrupted: bool,
                model: str, platform: str, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `session_id` | `str` | そのセッションを表す一意の識別子 |
| `completed` | `bool` | エージェントが最終的な応答を作ったなら `True`、そうでなければ `False` |
| `interrupted` | `bool` | 応答が中断されたなら `True`（利用者が新しいメッセージを送った、`/stop`、終了のいずれか） |
| `model` | `str` | モデルの識別子 |
| `platform` | `str` | セッションが動いている場所 |

**発火箇所:** 次の 2 か所です。
1. **`run_agent.py`** — `run_conversation()` の呼び出しごとに、後始末をすべて終えたあと。応答がエラーになった場合でも必ず発火します。
2. **`cli.py`** — CLI の atexit ハンドラーの中。ただし、終了した時点でエージェントが応答の途中だった（`_agent_running=True`）ときに**限ります**。処理中の Ctrl+C や `/exit` はここで拾われます。この場合は `completed=False`、`interrupted=True` になります。

**戻り値:** 無視されます。

**使いどころ:** バッファーの書き出し、接続の後始末、セッションの状態の保存、セッションの所要時間の記録、`on_session_start` で用意した資源の片づけ。

**例 — 書き出しと後始末:**

```python
_session_caches = {}

def cleanup_session(session_id, completed, interrupted, **kwargs):
    cache = _session_caches.pop(session_id, None)
    if cache:
        # Flush accumulated data to disk or external service
        status = "completed" if completed else ("interrupted" if interrupted else "failed")
        print(f"Session {session_id} ended: {status}, {cache['tool_calls']} tool calls")

def register(ctx):
    ctx.register_hook("on_session_end", cleanup_session)
```

**例 — セッションの所要時間を追う:**

```python

logger = logging.getLogger(__name__)

_start_times = {}

def on_start(session_id, **kwargs):
    _start_times[session_id] = time.time()

def on_end(session_id, completed, interrupted, **kwargs):
    start = _start_times.pop(session_id, None)
    if start:
        duration = time.time() - start
        logger.info("SESSION_DURATION session=%s seconds=%.1f completed=%s interrupted=%s",
                     session_id, duration, completed, interrupted)

def register(ctx):
    ctx.register_hook("on_session_start", on_start)
    ctx.register_hook("on_session_end", on_end)
```

---

### `on_session_finalize` {#onsessionfinalize}

CLI やゲートウェイが動作中のセッションを**畳むとき**に発火します — たとえば利用者が `/new` を実行した、ゲートウェイが放置されたセッションを回収した、エージェントが動いたまま CLI が終了した、といった場合です。閉じていくセッション ID に紐づいた状態を書き出すのに使います。ゲートウェイのリセットでは、このコールバックが走る時点で後継のセッションはすでに存在します。

**コールバックの形:**

```python
def my_callback(session_id: str | None, platform: str, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `session_id` | `str` または `None` | 閉じていくセッションの ID。動作中のセッションがなかった場合は `None` になることがあります。 |
| `platform` | `str` | `"cli"`、またはメッセージのプラットフォーム名（`"telegram"`、`"discord"` など）。 |

**発火箇所:** CLI・TUI の後片づけと、ゲートウェイのリセット・停止・放置による期限切れの経路です。ゲートウェイの停止や期限切れでは、対になる `on_session_reset` を伴わずに締めくくられることがあります。

**戻り値:** 無視されます。

**使いどころ:** セッション ID が捨てられる前に最終的な指標を保存する、セッション単位の資源を閉じる、最後の計測イベントを送る、たまっている書き込みを吐き出す。

---

### `on_session_reset` {#onsessionreset}

CLI や TUI のセッションの切れ目、あるいはゲートウェイが動作中のチャットに**新しいセッションキーを差し替えた**ときに発火します。これにより、次の `on_session_start` を待たずに、会話の状態が消えたことへプラグインが反応できます。

**コールバックの形:**

```python
def my_callback(session_id: str, platform: str, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `session_id` | `str` | 新しいセッションの ID（すでに新しい値へ切り替わっています）。 |
| `platform` | `str` | `"cli"`、`"tui"`、またはメッセージのプラットフォーム名。 |
| `reason` | `str`、省略可 | CLI とゲートウェイのリセットの経路で渡されます。 |
| `old_session_id` | `str`、省略可 | ゲートウェイのみ。閉じていくセッションの ID。 |
| `new_session_id` | `str`、省略可 | ゲートウェイのみ。後継のセッションの ID。 |

**発火箇所:** CLI は `session_id`、`platform`、`reason` を渡し、TUI は `session_id` と `platform` を渡します。ゲートウェイは後継のキーを割り当てたあと、`reason`、`old_session_id`、`new_session_id` を加えます。ゲートウェイのリセットでは、順番は次のとおりです。後継を作って保存する → `on_session_finalize(old_id)` → `on_session_reset(new_id)` → 最初の受信の応答で `on_session_start(new_id)`。

**戻り値:** 無視されます。

**使いどころ:** `session_id` を鍵にしたセッション単位のキャッシュを空にする、「セッションが切り替わった」という分析用のイベントを送る、新しい状態の置き場を用意する。

---

ツールのスキーマ、ハンドラー、フックの発展的な使い方まで含めた通しの説明は、**[プラグインを作る手引き](/hermes/docs/developer-guide/plugins/)**を参照してください。

---

### `subagent_start` {#subagentstart}

`delegate_task` が子の `AIAgent` を組み立てたあと、その子を走らせる前に、**子エージェントごとに 1 回**発火します。タスクを 1 つ任せる場合でも 3 つまとめて任せる場合でも、子ごとに 1 回ずつ発火します。

このフックは委任・サブエージェントのライフサイクル専用です。ゲートウェイ、CLI、cron、一括処理、MoA、その他の実行役から始まるエージェントの実行すべてに効く「エージェントを呼ぶ前」の万能ゲートではありません。

**コールバックの形:**

```python
def my_callback(parent_session_id: str | None,
                parent_turn_id: str,
                parent_subagent_id: str | None,
                child_session_id: str | None,
                child_subagent_id: str,
                child_role: str,
                child_goal: str,
                **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `parent_session_id` | `str \| None` | 委任した親エージェントのセッション ID。 |
| `parent_turn_id` | `str` | 委任を要求した親エージェントの応答の ID（取得できる場合）。 |
| `parent_subagent_id` | `str \| None` | この子が別のサブエージェントから起こされた場合の、親のサブエージェント ID。最上位の親エージェントでは `None`。 |
| `child_session_id` | `str \| None` | 子エージェントに割り当てられたセッション ID。 |
| `child_subagent_id` | `str` | 委任の可視化と制御で使う、変わらないサブエージェント ID。 |
| `child_role` | `str` | 委任の方針を適用したあとの、実際の子の役割。たとえば `"leaf"` や `"orchestrator"`。 |
| `child_goal` | `str` | 子エージェントがこれから実行する、委任された目標やプロンプト。 |

**発火箇所:** `tools/delegate_tool.py` の `_build_child_agent()` の中、子の `AIAgent` を組み立ててサブエージェントの識別情報を付けたあと、`_run_single_child()` が子を走らせる前です。

**戻り値:** 無視されます。これは観測専用のフックで、値を返しても子エージェントの実行を止めたり変えたりすることはできません。

**使いどころ:** サブエージェントの生成を記録する、親子のセッションの関係を対応づける、入れ子になった委任の木を追う、実行前の監査記録を残す、子ごとの計測用の資源を先に確保する。

**例 — サブエージェントの生成を記録する:**

```python

logger = logging.getLogger(__name__)

def log_subagent_start(
    parent_session_id,
    parent_turn_id,
    child_session_id,
    child_subagent_id,
    child_role,
    child_goal,
    **kwargs,
):
    logger.info(
        "SUBAGENT_START parent=%s turn=%s child_session=%s child=%s role=%s goal=%r",
        parent_session_id,
        parent_turn_id,
        child_session_id,
        child_subagent_id,
        child_role,
        child_goal[:200],
    )

def register(ctx):
    ctx.register_hook("subagent_start", log_subagent_start)
```

:::info
`subagent_start` は委任の様子を見るのに便利ですが、実行をせき止める方針用のフックではありません。子が組み立てられる前に委任を止めたい場合は、[`pre_tool_call`](#pre_tool_call) で `delegate_task` のツール呼び出しを遮断してください。
:::

---

### `subagent_stop` {#subagentstop}

`delegate_task` が終わったあと、**子エージェントごとに 1 回**発火します。タスクを 1 つ任せた場合でも 3 つまとめて任せた場合でも、子ごとに 1 回ずつ、親のスレッド上で順番に発火します。

**コールバックの形:**

```python
def my_callback(parent_session_id: str, child_role: str | None,
                child_summary: str | None, child_status: str,
                tool_call_history: list[dict], duration_ms: int, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `parent_session_id` | `str` | 委任した親エージェントのセッション ID |
| `child_role` | `str \| None` | 子に設定された取りまとめ役の役割タグ（この機能が有効でなければ `None`） |
| `child_summary` | `str \| None` | 子が親に返した最終的な応答 |
| `child_status` | `str` | `"completed"`、`"failed"`、`"interrupted"`、`"error"` のいずれか |
| `tool_call_history` | `list[dict]` | 順番に並んだ、メタ情報だけのツール呼び出しの記録: `tool_name`、長さを抑えた `tool_input`、`input_bytes`、`output_bytes`、`status`。生の入力と出力は含みません |
| `duration_ms` | `int` | 子の実行にかかった実時間（ミリ秒） |

**発火箇所:** `tools/delegate_tool.py` の中、`ThreadPoolExecutor.as_completed()` が子の処理をすべて回収したあとです。発火は親のスレッドに集約されるので、フックを書く人が同時実行を気にする必要はありません。

**戻り値:** 無視されます。

**使いどころ:** 取りまとめの様子を記録する、課金のために子の所要時間を積み上げる、委任後の監査記録を書き出す。

**例 — 取りまとめの様子を記録する:**

```python

logger = logging.getLogger(__name__)

def log_subagent(parent_session_id, child_role, child_status, duration_ms, **kwargs):
    logger.info(
        "SUBAGENT parent=%s role=%s status=%s duration_ms=%d",
        parent_session_id, child_role, child_status, duration_ms,
    )

def register(ctx):
    ctx.register_hook("subagent_stop", log_subagent)
```

:::info
委任を多用すると（取りまとめ役 × 5 つの末端 × 入れ子の深さ、など）、`subagent_stop` は 1 回の応答で何度も発火します。コールバックは手短に済ませ、重い処理は裏方のキューへ回してください。
:::

---

### `pre_gateway_dispatch` {#pregatewaydispatch}

ゲートウェイで受信した `MessageEvent` **1 件につき 1 回**、内部イベントの判定のあと、認証・ペアリングとエージェントへの振り分けの**前**に発火します。ここは、どの単独のプラットフォームアダプターにもきれいに収まらない、ゲートウェイの層でのメッセージの流れの方針（聞くだけの時間帯、人への引き継ぎ、チャットごとの振り分けなど）を差し込む地点です。

**コールバックの形:**

```python
def my_callback(event, gateway, session_store, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `event` | `MessageEvent` | 正規化された受信メッセージ（`.text`、`.source`、`.message_id`、`.internal` などを持ちます）。 |
| `gateway` | `GatewayRunner` | 動作中のゲートウェイの実行役。プラグインから `gateway.adapters[platform].send(...)` を呼んで、別経路の返信（持ち主への通知など）ができます。 |
| `session_store` | `SessionStore` | `session_store.append_to_transcript(...)` で、黙って記録に取り込むのに使います。 |

**発火箇所:** `gateway/run.py` の `GatewayRunner._handle_message()` の中、`is_internal` を求めた直後です。**内部イベントはこのフックを完全に飛ばします**（システムが作るもの — 裏方の処理の完了通知など — であり、利用者向けの方針でせき止めてはいけないためです）。

**戻り値:** `None` または辞書。最初に認識された動作の辞書が採用され、残りのプラグインの結果は無視されます。プラグインのコールバックの例外は捕捉して記録され、エラー時のゲートウェイは必ず通常の振り分けへ進みます。

| 戻り値 | 効果 |
|--------|--------|
| `{"action": "skip", "reason": "..."}` | メッセージを捨てます — エージェントの返信も、ペアリングの流れも、認証もありません。プラグイン側で処理済み（記録へ黙って取り込んだなど）とみなされます。 |
| `{"action": "rewrite", "text": "new text"}` | `event.text` を置き換え、変更後のイベントで通常どおり振り分けを続けます。ためておいた周囲のメッセージを 1 つのプロンプトにまとめるのに便利です。 |
| `{"action": "allow"}` / `None` | 通常の振り分け — 認証・ペアリング・エージェントのループの一連の流れを走らせます。 |

**使いどころ:** 聞くだけのグループチャット（呼ばれたときだけ返し、周囲のメッセージは文脈としてためておく）、人への引き継ぎ（持ち主が手作業で対応するあいだ、顧客のメッセージを黙って取り込む）、プロファイルごとの実行頻度の制限、方針に沿った振り分け。

**例 — 権限のない個別チャットを、ペアリングコードを出さずに黙って捨てる:**

```python
def deny_unauthorized_dms(event, **kwargs):
    src = event.source
    if src.chat_type == "dm" and not _is_approved_user(src.user_id):
        return {"action": "skip", "reason": "unauthorized-dm"}
    return None

def register(ctx):
    ctx.register_hook("pre_gateway_dispatch", deny_unauthorized_dms)
```

**例 — 呼ばれたときに、ためておいた周囲のメッセージを 1 つのプロンプトへ書き換える:**

```python
_buffers = {}

def buffer_or_rewrite(event, **kwargs):
    key = (event.source.platform, event.source.chat_id)
    buf = _buffers.setdefault(key, [])
    if _bot_mentioned(event.text):
        combined = "\n".join(buf + [event.text])
        buf.clear()
        return {"action": "rewrite", "text": combined}
    buf.append(event.text)
    return {"action": "skip", "reason": "ambient-buffered"}

def register(ctx):
    ctx.register_hook("pre_gateway_dispatch", buffer_or_rewrite)
```

---

### `gateway_platform_event` {#gatewayplatformevent}

対応しているプラットフォーム固有のイベントについて、ゲートウェイの通常のプロファイル単位の認可の確認が通った**あと**にだけ発火します。コールバックが受け取るのは素の辞書です。SDK の生のオブジェクト、アダプターのハンドル、ボットのクライアント、コールバックの文脈は、この安定した取り決めに含まれることはありません。

最初に対応したのは Telegram のメッセージのリアクションで、その後、メッセージの編集・削除とスレッドのライフサイクルのイベントが続きました。

```python
def on_platform_event(platform, event_type, payload, **kwargs):
    if platform == "telegram" and event_type == "reaction":
        print(payload["chat_id"], payload["message_id"], payload["emojis"])
    elif event_type == "message_edited":
        print(platform, payload["chat_id"], payload["message_id"], payload["text"])

def register(ctx):
    ctx.register_hook("gateway_platform_event", on_platform_event)
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `platform` | `str` | 変わらないプラットフォームの id（`"telegram"`、`"discord"`）。 |
| `event_type` | `str` | イベントごとの取り決めの id（下の表を参照）。 |
| `payload` | `dict` | イベントの種類ごとの項目。種類別の内容は下にまとめています。 |

ペイロードはどれも項目が足されていく方式で、イベントごとに異なります。ゲートウェイのペイロード全体を束ねる版番号はありません。id はすべて文字列で、欠けている項目や取得できない項目は `None` になり、推測することはありません。壊れたイベントと、送り主を認可できないイベントは捨てられます（安全側に倒します）。Telegram の Application が一時的に組み直された場合は、中核のハンドラーと一緒に観測側も登録し直されます。

**イベント種類ごとのペイロードの取り決め（v1。項目は足されていきます）:**

| `event_type` | プラットフォーム | ペイロードの項目 |
|--------------|-----------|----------------|
| `reaction` | telegram | `emojis: list[str]`、`custom_emoji_ids: list[str]`、`chat_id: str`、`message_id: str`、`thread_id: str \| None`（Telegram のリアクションの更新はトピックの id を持たないため、現状は常に `None`）。 |
| `message_edited` | telegram, discord | `chat_id: str`、`message_id: str`、`thread_id: str \| None`、`text: str \| None`（編集後の本文または説明文。長さは抑えられます。メディアだけの編集や、控えが残っていない場合は `None`）、`edited_at: str \| None`（ISO 8601）。 |
| `message_deleted` | discord | `chat_id: str`、`message_id: str`、`thread_id: str \| None`、`author_id: str \| None`。Discord の削除イベントは誰が削除したかを示しません。認可の対象になるのは削除されたメッセージの書き手で、控えが残っていない削除では発火しません。 |
| `thread_created` | discord | `thread_id: str`、`parent_chat_id: str \| None`、`name: str \| None`、`owner_id: str \| None`。 |
| `thread_renamed` | discord | `thread_id: str`、`parent_chat_id: str \| None`、`old_name: str \| None`、`new_name: str`。名前が実際に変わったときにだけ発火します。それ以外のスレッドの更新（保管、投稿間隔の制限、タグ）は捨てられます。Discord のスレッド更新のイベントは操作した人を持たないため、認可の対象はスレッドの持ち主になります。 |

ボット自身が段階的にメッセージを編集していく動き（逐次出力）が、Discord で `message_edited` を発火させることはありません — ボットが書き手のイベントは発火する場所で捨てられます。

このフックは観測専用です。生のイベントやアダプターへの手がかりを**足すことはありません**。**SDK の生のペイロードへの手がかりは意図的に用意していません** — アダプターの SDK のオブジェクトは予告なく形が変わるため、公開しても育てられない面になってしまうからです。本当に必要な場合は、「安定性は保証しない」という札を付けた専用の機能（`gateway.raw_events`）と、それ自身の設計が必要です（#64228 で管理しています）。プラットフォームに対して*働きかける*場合（リアクションを付ける、スレッドの名前を変えるなど）は、[プラグインの手引き](/hermes/docs/user-guide/features/plugins/#platform-actions)で説明している、機能で守られた `ctx.platform_actions` の窓口を使ってください — 既定では `gateway.platform_actions` の機能の裏で無効になっています。`PluginContext.dispatch_tool()` が呼べるのは、ツールの登録簿にあるツールだけです。`send_message` は意図的にそこへ登録していません（その送信経路は、CLI・cron・かんばん・MCP という明示的な配送の経路のために取ってあります）。将来の送信の取り決めを作るには、まずすべてのアダプターにわたって安定した配送内容と手がかりを用意する必要があります。この段階では、何もしない `gateway_message_delivered` フックを先回りして用意することはしません。

---

### `pre_approval_request` {#preapprovalrequest}

承認の判断が求められる前に発火します。対象になるのは、問い合わせを出す面（対話的な CLI、Ink の TUI、ゲートウェイのプラットフォーム、ACP のクライアント）と、人に尋ねずに下される `approvals.mode=smart` の判断（`surface="smart"`）です。smart のときは、補助の LLM を呼ぶ前にこのフックが走ります。

独自の通知の仕組みをつなぐのに向いた場所です — たとえば、許可・拒否の通知を出す macOS のメニューバーのアプリや、承認の要求を文脈ごと記録する監査ログなどです。

**コールバックの形:**

```python
def my_callback(
    command: str,
    description: str,
    pattern_key: str,
    pattern_keys: list[str],
    session_key: str,
    surface: str,
    **kwargs,
):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `command` | `str` | 判定の対象になっているターミナルのコマンド、または `execute_code` のスクリプト。smart とゲートウェイのペイロードは、観測側へ配る前に伏せ字処理されます。smart の観測側の伏せ字処理は、`security.redact_secrets` が無効でも必須です。伏せ字処理に失敗した場合、smart のフックは飛ばされます。 |
| `description` | `str` | そのコマンドが引っかかった理由を人が読める形にしたもの（複数の条件に当てはまった場合はまとめられます） |
| `pattern_key` | `str` | 承認のきっかけになった主な条件のキー（例: `"rm_rf"`、`"sudo"`） |
| `pattern_keys` | `list[str]` | 当てはまったすべての条件のキー |
| `session_key` | `str` | セッションの識別子。チャットごとに通知を切り分けるのに使えます |
| `surface` | `str` | 対話的な CLI・TUI の問い合わせなら `"cli"`、非同期のプラットフォームでの承認なら `"gateway"`、補助の LLM による自動の許可・拒否の判断なら `"smart"` |

**戻り値:** 無視されます。ここでのフックは観測専用で、承認を拒否したり先に答えたりはできません。承認の仕組みに届く前にツールを止めたい場合は [`pre_tool_call`](#pre_tool_call) を使ってください。

**使いどころ:** デスクトップの通知、プッシュ通知、監査の記録、Slack の Webhook、上位への引き上げの振り分け、指標の収集。

**例 — macOS でデスクトップ通知を出す:**

```python

def notify_approval(command, description, session_key, **kwargs):
    title = "Hermes needs approval"
    body = f"{description}: {command[:80]}"
    subprocess.Popen([
        "osascript", "-e",
        f'display notification "{body}" with title "{title}"',
    ])

def register(ctx):
    ctx.register_hook("pre_approval_request", notify_approval)
```

---

### `post_approval_response` {#postapprovalresponse}

問い合わせ形式または smart の承認の判断が下されたあと、問い合わせが時間切れになったあと、あるいはゲートウェイが承認の通知を届けられなかったときに発火します。通知の失敗では、承認の判断が存在する前に `choice="notify_failed"` が送られます。

**コールバックの形:**

```python
def my_callback(
    command: str,
    description: str,
    pattern_key: str,
    pattern_keys: list[str],
    session_key: str,
    surface: str,
    choice: str,
    **kwargs,
):
```

キーワード引数は `pre_approval_request` と同じで、加えて次のものがあります。

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `choice` | `str` | 問い合わせを出す面では `"once"`、`"session"`、`"always"`、`"deny"`、`"timeout"`、`"notify_failed"` のいずれか。smart の判断では `"smart_approve"` または `"smart_deny"` |
| `decided_by` | `str` | smart の判断では `"aux_llm"`。問い合わせを出す面では渡されません |

**戻り値:** 無視されます。

**使いどころ:** 対応するデスクトップ通知を閉じる、最終的な判断を監査ログに残す、指標を更新する、実行頻度の制限を進める。

```python
def log_decision(command, choice, session_key, **kwargs):
    logger.info("approval %s: %s for session %s", choice, command[:60], session_key)

def register(ctx):
    ctx.register_hook("post_approval_response", log_decision)
```

---

### `pre_transcription` {#pretranscription}

音声認識の振り分け役（`tools.transcription_tools.transcribe_audio`）の中で、提供元が決まった**あと**、どのバックエンドを呼ぶ**前**にも発火します。バックエンドが組み込みでも、`type: command` の提供元でも、プラグインが登録した提供元でも同じです。これにより、書き起こしの結果をあとから眺めるだけでなく、書き起こしの要求そのものをプラグインから方向づけられます。

**コールバックの形:**

```python
def my_callback(
    file_path: str,
    provider: str,
    model: str | None,
    language: str | None,
    prompt: str | None,
    source: str | None,
    **kwargs,
) -> dict | None:
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `file_path` | `str` | これから書き起こす音声ファイルの絶対パス。読み取り専用です。 |
| `provider` | `str` | 決定された音声認識の提供元（`local`、`groq`、`openai`、`mistral`、`xai`、`elevenlabs`、`deepinfra`、`local_command`、コマンド型の提供元の名前、プラグインの提供元の名前のいずれか）。 |
| `model` | `str \| None` | ここまでに決まったモデル。バックエンドの既定を使う場合は `None`。 |
| `language` | `str \| None` | 提供元の設定の節で指定された言語。なければ `None`。 |
| `prompt` | `str \| None` | 固定値の [`stt.prompt`](/hermes/docs/user-guide/configuration/#transcription-prompt-vocabulary-hints) の値。なければ `None`。 |
| `source` | `str \| None` | 呼び出し元の面を表す札（`gateway`、`voice_mode` など）。様子を見るためのもので、振り分けには使いません。 |

**戻り値:** `"prompt"`、`"language"`、`"model"` のいずれかを文字列に対応づけた `dict`、または要求をそのままにする場合は `None`。文字列でない値、知らないキー、`file_path` は無視されます（`file_path` を変えようとすると警告として記録されます）。結果は `stt.prompt` の設定値の上に、**登録順で、項目ごとに後勝ち**で適用されます。`prompt` に `""` を返すと、その要求では設定済みのプロンプトが消えます。

**使いどころ:** 音声を送る前に利用者ごと・チャットごとの語彙の一覧を差し込む、呼び出し元の言語設定から `language` を決め打ちする、長い録音では `model` を軽いものに落とす、雑音の多い音源を別のモデルへ振り分ける。

```python
VOCAB = "Hermes, Teknium, Nous Research, kanban"

def add_vocab(provider, prompt, source, **kwargs):
    if source != "gateway":
        return None
    return {"prompt": f"{prompt}. {VOCAB}" if prompt else VOCAB}

def register(ctx):
    ctx.register_hook("pre_transcription", add_vocab)
```

どのバックエンドもプロンプトを受け付けるわけではありません。`local` は faster-whisper の `initial_prompt` に対応づけます。`openai`、`groq`、`mistral`、`deepinfra` は `prompt` として送ります。`xai`、`elevenlabs`、`local_command`、`type: command` の提供元は DEBUG の記録を残し、プロンプトなしで書き起こします。対応の全体像とプライバシーの境界については、[提供元ごとの対応表](/hermes/docs/user-guide/configuration/#transcription-prompt-vocabulary-hints)を参照してください。フックの受け渡しでエラーが起きた場合は通す側に倒れ、要求を変えないまま振り分けが続きます。

---

### `transform_tool_result` {#transformtoolresult}

ツールが結果を返した**あと**、その結果が会話に追記される**前**に発火します。ターミナルの出力に限らず、どのツールの結果の文字列でも、モデルが目にする前にプラグインから書き換えられます。

**コールバックの形:**

```python
def my_callback(tool_name: str, args: dict, result: str, task_id: str, **kwargs) -> str | None:
```

ペイロード全体には `session_id`、`tool_call_id`、`turn_id`、`api_request_id`、`duration_ms`、`status`、`error_type`、`error_message` も含まれます。`result` はツールの振り分けが返した最終的な結果で、これと `args` には任意の利用者やツールの内容、秘密情報が含まれることがあります。

**戻り値:** 最初の `str` が結果を置き換えます（空文字列でも置き換わります）。`None` なら変更しません。

**使いどころ:** `web_extract` の出力から組織固有の個人情報を伏せ字にする、長い JSON のツール応答に要約の見出しを付ける、`read_file` の結果へ検索で補った手がかりを差し込む、`delegate_task` のサブエージェントの報告をプロジェクト固有の形式に書き直す。

```python

SECRET = re.compile(r"sk-[A-Za-z0-9]{32,}")

def redact_secrets(tool_name, result, **kwargs):
    if SECRET.search(result):
        return SECRET.sub("[REDACTED]", result)
    return None

def register(ctx):
    ctx.register_hook("transform_tool_result", redact_secrets)
```

これはすべてのツールに効きます。ターミナルだけを書き換えたい場合は、下の `transform_terminal_output` を参照してください — 対象が狭く、`transform_tool_result` より先に走り、置き換えた内容もターミナルのツールの最終的な出力の上限を受けます。

---

### `transform_terminal_output` {#transformterminaloutput}

`terminal` ツールの中で、前面のプロセスの出力の取り込みが実行環境によってすでに上限までに抑えられたあと、最終的な出力の上限より前に発火します。取り込んだ標準出力・標準エラー出力をプラグインから置き換えられます。置き換えた内容も、最終的な出力の上限を受けます。

**コールバックの形:**

```python
def my_callback(
    command: str,
    output: str,
    returncode: int,
    task_id: str,
    env_type: str,
    **kwargs,
) -> str | None:
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `command` | `str` | その出力を生んだシェルのコマンド。 |
| `output` | `str` | 上限付きで取り込んだあとの、標準出力と標準エラー出力を合わせたもの。 |
| `returncode` | `int` | プロセスの終了コード。 |
| `task_id` | `str` | 実際に使われたタスクの識別子。なければ空文字列。 |
| `env_type` | `str` | 実行環境の種類。 |

**戻り値:** 最初の `str` が出力を置き換えます。`None` なら変更しません。コマンドと出力には、資格情報などの機微な内容が含まれることがあります。

```python
def summarize_find(command, output, **kwargs):
    if command.startswith("find ") and len(output) > 50_000:
        lines = output.count("\n")
        head = "\n".join(output.splitlines()[:40])
        return f"{head}\n\n[summary: {lines} paths total, showing first 40]"
    return None

def register(ctx):
    ctx.register_hook("transform_terminal_output", summarize_find)
```

`transform_tool_result` と対になります。あちらは `terminal` を含むすべてのツールについて、このあとに走ります。

---

### `transform_llm_output` {#transformllmoutput}

ツール呼び出しのループが終わってモデルが最終的な応答を作ったあと、その応答が利用者（CLI、ゲートウェイ、プログラムからの呼び出し元）へ届けられる**前**に、**応答ごとに 1 回**発火します。ふつうのプログラムの手法でアシスタントの最終的な文面を書き換えられます — SOUL の味付けの文面やスキル任せの変換で、余分な推論のトークンを使いません。

**コールバックの形:**

```python
def my_callback(
    response_text: str,
    session_id: str,
    model: str,
    platform: str,
    **kwargs,
) -> str | None:
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `response_text` | `str` | この応答におけるアシスタントの最終的な文面。 |
| `session_id` | `str` | この会話のセッション ID（使い捨ての実行では空のことがあります）。 |
| `model` | `str` | その応答を作ったモデルの名前（例: `anthropic/claude-sonnet-4.6`）。 |
| `platform` | `str` | 届け先のプラットフォーム（`cli`、`telegram`、`discord` など。未設定なら空）。 |

**戻り値:** 空でない `str` を返すと応答の文面を置き換え、`None` または空文字列なら変更しません。複数のプラグインが登録されている場合は、**空でない最初の文字列が採用されます**。ツールやターミナルの変換とは違い、空文字列は置き換えとしては受け付けられません。

**使いどころ:** 人格や言い回しの変換をかける（海賊風、スポンジ・ボブ風）、最終的な文面から利用者を特定できる情報を伏せ字にする、プロジェクト固有の署名を末尾に足す、SOUL の指示にトークンを使わずに社内の文章のきまりを守らせる。

CLI の逐次出力が有効なときは、追記型の変換は
逐次出力された本文のあとに表示されます。応答を置き換える変換は、逐次出力された本文のあとに全文が表示され、
逐次出力のあとの変換であることが示されます。置き換えた内容が黙って失われることはありません。

```python

def spongebob(response_text, **kwargs):
    if os.environ.get("SPONGEBOB_MODE") != "on":
        return None  # pass through unchanged
    return re.sub(r"!", "!! Tartar sauce!", response_text)

def register(ctx):
    ctx.register_hook("transform_llm_output", spongebob)
```

このフックは、空でなく中断もされていない応答でのみ発火するよう守られています — 停止ボタンによる中断や、中身のない応答では発火しません。例外は警告として記録され、エージェントの実行を止めることはありません。

### API リクエストの観測フック {#api-request-observer-hooks}

#### `pre_api_request` {#preapirequest}

提供元への試行ごとに、送信の直前に発火します。観測専用です。古くからある `user_message`、`conversation_history`、`request_messages` の項目は互換のために生のままで、意図的に伏せ字処理していません。新しく使い始める場合は、伏せ字処理済みの `request` の封筒を使ってください。

#### `post_api_request` {#postapirequest}

提供元からの応答を正規化して成功したあとに発火します。観測専用です。伏せ字処理済みの `response` を使ってください。`assistant_message` は正規化しただけの生のメッセージで、`usage` には集計用のデータが入っています。

#### `api_request_error` {#apirequesterror}

提供元への試行が失敗したときに、状態と再試行のタイミング、`error` オブジェクト、伏せ字処理済みの `request` とともに発火します。観測専用です。エラーの文面には、提供元や利用者のデータが残っていることがあります。

### `on_skill_lifecycle` {#onskilllifecycle}

スキルの利用状態が正式に変わったあとに発火します。観測専用で、手元の `skill_name`、出どころ、突き合わせ用の ID、利用回数、再利用の目印が見えます。

### かんばんのライフサイクルの観測フック {#kanban-lifecycle-observers}

#### `kanban_task_claimed` {#kanbantaskclaimed}

振り分け役のプロセスで引き受けが確定したあと、作業役を起こす直前に発火します。

#### `kanban_task_completed` {#kanbantaskcompleted}

完了と後始末のあと、通常は作業役のプロセスで発火します。`summary` にはプロジェクトや利用者の内容が含まれることがあります。

#### `kanban_task_blocked` {#kanbantaskblocked}

通常の停滞状態への移行のあとに発火します。依存待ちの経路では、その書き込みのトランザクションを抜ける前に呼ばれます。`reason` にはプロジェクトや利用者の内容が含まれることがあります。

かんばんのこの 3 つのフックはいずれも観測専用で、`task_id`、`profile_name`、`board`、`assignee`、`run_id` を運びます。完了時にはこれに `summary` が、停滞時には `reason` が加わります。

### かんばんの作業役のライフサイクル・タスクの変更・振り分けの観測フック {#kanban-worker-lifecycle-task-mutation-and-dispatch-observers}

さらに 5 つの観測フック（RFC #58548）がかんばんの系統を広げます。いずれも観測専用で、該当するトランザクションが確定したあとに発火し、`has_hook` で早めに打ち切られます — 購読するものがなければ、振り分けの挙動は変わりません。タスク単位のフックは、上のフックと同じ共通の項目を運びます。

- **`on_kanban_worker_spawned`** — `spawn_fn` が返って作業役の PID を保存したあと。`worker_pid`（`None` のことがあります）と `workspace_path` が加わります。振り分けのロックの内側で走るので、コールバックは手短に。
- **`on_kanban_worker_exited`** — 定期点検由来で、`detect_crashed_workers` が死んだ PID のタスクを回収したとき。`worker_pid`、`exit_kind`、`exit_code`、`outcome`、`retry_status` が加わります。
- **`on_kanban_worker_stale_claim`** — 期限切れの引き受けが回収されたとき。PID が生きていて期限を延ばした場合は発火しません。`worker_pid`、`heartbeat_stale`、`retry_status` が加わります。
- **`on_kanban_task_updated`** — 引き受け・完了・停滞のライフサイクルの外で、タスクの項目への書き込みが確定したあと（`assign_task`、モデルや推論設定の上書き、ダッシュボードの編集画面）。`changed_fields` が加わります — 項目名だけで、値は含みません。
- **`on_kanban_dispatch_tick`** — 振り分け役の点検 1 回につき 1 度、振り分けのロックを手放した直後。何もしなかった回や、ロックが競合した回も含みます。ペイロード: `board`、`profile_name`、`dry_run`、`outcome`、`result`。

---

## シェルフック {#shell-hooks}

`~/.hermes/config.yaml` にシェルスクリプトのフックを書いておくと、対応するプラグインフックのイベントが発火するたびに、Hermes がそれを子プロセスとして走らせます — CLI のセッションでもゲートウェイのセッションでも同じです。Python のプラグインを書く必要はありません。

シェルフックは、差し込むだけの 1 ファイルのスクリプト（Bash でも Python でも、シバンがあるものなら何でも）で次のことをしたいときに使います。

- **ツール呼び出しを止める、または変える** — 危険な `terminal` のコマンドを拒む、ディレクトリごとの方針を課す、壊れる恐れのある `write_file` や `patch` の操作に承認を求める、ツールが走る前に引数を書き換える（パスの無害化、既定値の差し込み）。
- **ツール呼び出しのあとに走らせる** — エージェントが書いたばかりの Python や TypeScript のファイルを自動で整形する、API の呼び出しを記録する、CI のワークフローを起動する。
- **次の LLM の応答へ文脈を差し込む** — `git status` の出力や、今日の曜日、検索してきた文書を利用者のメッセージの前に足す（[`pre_llm_call`](#pre_llm_call) を参照）。
- **ライフサイクルのイベントを見張る** — サブエージェントが終わったとき（`subagent_stop`）やセッションが始まったとき（`on_session_start`）にログを 1 行書く。

シェルフックは、CLI の起動時（`hermes_cli/main.py`）とゲートウェイの起動時（`gateway/run.py`）の両方で `agent.shell_hooks.register_from_config(cfg)` を呼ぶことで登録されます。Python のプラグインフックとも自然に組み合わさります — どちらも同じ振り分け役を通るからです。

### ひと目でわかる比較 {#comparison-at-a-glance}

| 観点 | シェルフック | [プラグインフック](#plugin-hooks) | [ゲートウェイフック](#gateway-event-hooks) |
|-----------|-------------|-------------------------------|---------------------------------------|
| 宣言する場所 | `~/.hermes/config.yaml` の `hooks:` ブロック | `plugin.yaml` を持つプラグインの `register()` | `HOOK.yaml` と `handler.py` のディレクトリ |
| 置き場所 | `~/.hermes/agent-hooks/`（慣習として） | `~/.hermes/plugins/<name>/` | `~/.hermes/hooks/<name>/` |
| 言語 | 何でも（Bash、Python、Go のバイナリなど） | Python のみ | Python のみ |
| 動く場所 | CLI とゲートウェイ | CLI とゲートウェイ | ゲートウェイのみ |
| イベント | `VALID_HOOKS`（`subagent_stop` を含む） | `VALID_HOOKS` | ゲートウェイのライフサイクル（`gateway:startup`、`agent:*`、`command:*`） |
| ツール呼び出しを止められるか | はい（`pre_tool_call`） | はい（`pre_tool_call`） | いいえ |
| LLM へ文脈を差し込めるか | はい（`pre_llm_call`） | はい（`pre_llm_call`） | いいえ |
| 同意 | `(event, command)` の組ごとに初回だけ確認 | 暗黙（Python プラグインへの信頼） | 暗黙（ディレクトリへの信頼） |
| プロセスの隔離 | あり（子プロセス） | なし（同一プロセス） | なし（同一プロセス） |

### 設定の書き方 {#configuration-schema}

```yaml
hooks:
  <event_name>:                  # Must be in VALID_HOOKS
    - matcher: "<regex>"         # Optional; used for pre/post_tool_call only
      command: "<shell command>" # Required; runs via shlex.split, shell=False
      timeout: <seconds>         # Optional; default 60, capped at 300
      fail_closed: <bool>        # Optional; default false. pre_tool_call only.
                                 # `failClosed` also accepted (Cursor/Claude Code compat)

hooks_auto_accept: false         # See "Consent model" below
```

イベント名は[プラグインフックのイベント](#plugin-hooks)のいずれかである必要があります。綴りを間違えると「Did you mean X?」という警告が出て読み飛ばされます。1 つの項目の中の知らないキーは無視されます。`command` がない場合は警告付きで読み飛ばされます。`timeout > 300` は警告付きで頭打ちになります。`pre_tool_call` 以外のイベントに `fail_closed: true` を付けると警告が出て無視されます（遮断できるイベントだけが安全側に倒せます）。

### JSON のやりとりの形式 {#json-wire-protocol}

イベントが発火するたびに、Hermes は条件に合うフックごとに子プロセスを起こし（matcher が許す範囲で）、JSON のペイロードを**標準入力**へ流し込み、**標準出力**を JSON として読み取ります。

**標準入力 — スクリプトが受け取るペイロード:**

```json
{
  "hook_event_name": "pre_tool_call",
  "tool_name":       "terminal",
  "tool_input":      {"command": "rm -rf /"},
  "session_id":      "sess_abc123",
  "cwd":             "/home/user/project",
  "extra":           {"task_id": "...", "tool_call_id": "..."}
}
```

ツールを伴わないイベント（`pre_llm_call`、`subagent_stop`、セッションのライフサイクル）では、`tool_name` と `tool_input` は `null` になります。`extra` の辞書には、そのイベント固有のキーワード引数がすべて入ります（`user_message`、`conversation_history`、`child_role`、`duration_ms` など）。直列化できない値は、省かれるのではなく文字列にされます。

**標準出力 — 任意の応答:**

```jsonc
// Block a pre_tool_call (both shapes accepted; normalised internally):
{"decision": "block", "reason":  "Forbidden: rm -rf"}   // Claude-Code style
{"action":   "block", "message": "Forbidden: rm -rf"}   // Hermes-canonical

// Modify a pre_tool_call — rewrite tool args before dispatch:
{"action": "modify", "args": {"new_string": "fixed content"}}         // Hermes-canonical
{"decision": "modify", "tool_input": {"new_string": "fixed content"}} // Claude-Code style

// Inject context for pre_llm_call:
{"context": "Today is Friday, 2026-04-17"}

// Keep the agent going at the verify gate (pre_verify); both shapes accepted:
{"action": "continue", "message": "Run the formatter, then finish."}
{"decision": "block",  "reason":  "Run the formatter, then finish."}

// Silent no-op — any empty / non-matching output is fine:
```

壊れた JSON、0 以外の終了コード、時間切れはいずれも警告として記録されるだけで、エージェントのループを中断させることはありません。

### 終了コード 2 は遮断（Claude Code / Cursor と互換） {#exit-code-2-block-claude-code-cursor-compatible}

`pre_tool_call` のフックが終了コード **2** で終わると、標準出力に遮断の JSON がなくてもツール呼び出しが遮断されます。遮断の文面は次の優先順で決まります。

1. 標準出力の遮断の JSON（`reason` または `message`）があればそれ
2. 標準エラー出力の先頭 400 文字
3. 既定の `"Blocked by shell hook."`

つまり、いちばん単純な遮断のフックはこうなります。

```bash
#!/usr/bin/env bash
echo "policy violation: rm -rf is not permitted" >&2
exit 2
```

遮断の指示が効かないイベント（`pre_tool_call` 以外のすべて）では、終了コード 2 も他の 0 以外の終了と同じ扱いになります。警告が記録され、標準出力はそのまま解釈されます。

### 通す側に倒すか、止める側に倒すか {#fail-open-vs-fail-closed}

シェルフックは既定では**通す側に倒します**。起動の失敗、時間切れ、解釈できない標準出力はいずれも警告を記録するだけで、処理はそのまま進みます。様子を見るためのフックにはこれが正しい既定です — ただし安全のためのゲートには向きません。落ちた秘密情報の走査役が、点検するはずだったツール呼び出しを黙って通してしまってはいけません。

`pre_tool_call` の項目に `fail_closed: true`（または Cursor / Claude Code の綴りである `failClosed: true`）を付けると、これが逆になります。

```yaml
hooks:
  pre_tool_call:
    - matcher: "terminal|write_file|patch"
      command: "~/.hermes/agent-hooks/secret-scan.sh"
      timeout: 10
      fail_closed: true
```

`fail_closed: true` を付けると、次のそれぞれが `hook <command> failed closed: <reason>` としてツール呼び出しを**遮断する**ようになります。

| 失敗の種類 | 通す側（既定） | `fail_closed: true` |
|---------|--------------------|--------------------|
| コマンドが見つからない／実行できない | 警告して続行 | **遮断** |
| 時間切れ | 警告して続行 | **遮断** |
| JSON でない標準出力（スタックトレースなど） | 警告して続行 | **遮断** |
| 正常終了で、何もしない有効な JSON（`{}`） | 続行 | 続行 |

`fail_closed` が効くのは遮断できるイベント（現状は `pre_tool_call`）だけです。それ以外のイベントに付けると、設定の読み込み時に警告が記録され、無視されます。`hermes hooks test` はこの挙動をそのまま映します — `parsed` の行に、振り分け役が受け取ることになる遮断の形がそのまま出ます。

### 具体例 {#worked-examples}

#### 1. 書き込みのたびに Python のファイルを自動で整形する {#1-auto-format-python-files-after-every-write}

```yaml
# ~/.hermes/config.yaml
hooks:
  post_tool_call:
    - matcher: "write_file|patch"
      command: "~/.hermes/agent-hooks/auto-format.sh"
```

```bash
#!/usr/bin/env bash
# ~/.hermes/agent-hooks/auto-format.sh
payload="$(cat -)"
path=$(echo "$payload" | jq -r '.tool_input.path // empty')
[[ "$path" == *.py ]] && command -v black >/dev/null && black "$path" 2>/dev/null
printf '{}\n'
```

エージェントが文脈として持っているファイルの中身は、自動では読み直され**ません** — 整形の効果はディスク上のファイルにだけ及びます。そのあとの `read_file` の呼び出しで、整形後の版が読み込まれます。

#### 2. 壊れる恐れのある `terminal` のコマンドを遮断する {#2-block-destructive-terminal-commands}

```yaml
hooks:
  pre_tool_call:
    - matcher: "terminal"
      command: "~/.hermes/agent-hooks/block-rm-rf.sh"
      timeout: 5
```

```bash
#!/usr/bin/env bash
# ~/.hermes/agent-hooks/block-rm-rf.sh
payload="$(cat -)"
cmd=$(echo "$payload" | jq -r '.tool_input.command // empty')
if echo "$cmd" | grep -qE 'rm[[:space:]]+-rf?[[:space:]]+/'; then
  printf '{"decision": "block", "reason": "blocked: rm -rf / is not permitted"}\n'
else
  printf '{}\n'
fi
```

#### 3. 応答のたびに `git status` を差し込む（Claude Code の `UserPromptSubmit` に相当） {#3-inject-git-status-into-every-turn-claude-code-userpromptsubmit-equivalent}

```yaml
hooks:
  pre_llm_call:
    - command: "~/.hermes/agent-hooks/inject-cwd-context.sh"
```

```bash
#!/usr/bin/env bash
# ~/.hermes/agent-hooks/inject-cwd-context.sh
cat - >/dev/null   # discard stdin payload
if status=$(git status --porcelain 2>/dev/null) && [[ -n "$status" ]]; then
  jq --null-input --arg s "$status" \
     '{context: ("Uncommitted changes in cwd:\n" + $s)}'
else
  printf '{}\n'
fi
```

Claude Code の `UserPromptSubmit` イベントは、意図的に Hermes の別イベントにしていません — `pre_llm_call` が同じ場所で発火し、すでに文脈の差し込みに対応しているからです。ここではそちらを使ってください。

#### 4. サブエージェントの完了をすべて記録する {#4-log-every-subagent-completion}

```yaml
hooks:
  subagent_stop:
    - command: "~/.hermes/agent-hooks/log-orchestration.sh"
```

```bash
#!/usr/bin/env bash
# ~/.hermes/agent-hooks/log-orchestration.sh
log=~/.hermes/logs/orchestration.log
jq -c '{ts: now, parent: .session_id, extra: .extra}' < /dev/stdin >> "$log"
printf '{}\n'
```

### 同意の仕組み {#consent-model}

`(event, command)` の組は、Hermes が初めて見たときに利用者へ承認を求め、その判断を `~/.hermes/shell-hooks-allowlist.json` に残します。以降の実行（CLI でもゲートウェイでも）では確認を飛ばします。

対話的な確認を回避する抜け道が 3 つあり、どれか 1 つで足ります。

1. CLI の `--accept-hooks` フラグ（例: `hermes --accept-hooks chat`）
2. 環境変数 `HERMES_ACCEPT_HOOKS=1`
3. `~/.hermes/config.yaml` の `hooks_auto_accept: true`

端末を持たない実行（ゲートウェイ、cron、CI）では、この 3 つのどれかが必要です — そうしないと、新しく足したフックは黙って未登録のままになり、警告だけが記録されます。

**スクリプトの編集は黙って信頼されます。** 許可の一覧はコマンドの文字列そのものを鍵にしていて、スクリプトのハッシュではありません。そのため、ディスク上のスクリプトを書き換えても同意は無効になりません。`hermes hooks doctor` が更新時刻のずれを知らせるので、編集に気づいて承認をやり直すかどうかを判断できます。

#### 手作業で許可する {#manual-allowlisting}

手作業での許可は、初回の確認に人が対話的に答えられない、端末を持たない環境やサービスアカウントでの運用に役立ちます。許可の一覧のファイルは `~/.hermes/shell-hooks-allowlist.json` で、想定している形式は `approvals` の配列です。各項目には、フックの `event` と `command` の文字列そのものを記録します。

```json
{
  "approvals": [
    {
      "event": "post_llm_call",
      "command": "/home/hermes/.hermes/hooks/my-hook.py"
    }
  ]
}
```

コマンドの文字列は、設定したフックのコマンドと完全に一致している必要があります。パスを鍵にして `sha256` の項目を持たせたオブジェクトは想定している形式ではなく、それではフックは許可されません。手で書いた項目は `hermes hooks list` で確認してください。

### `hermes hooks` のコマンド {#the-hermes-hooks-cli}

| コマンド | 何をするか |
|---------|--------------|
| `hermes hooks list` | 設定済みのフックを、matcher・時間切れの設定・同意の状態とともに書き出します |
| `hermes hooks test <event> [--for-tool X] [--payload-file F]` | 条件に合うフックを作り物のペイロードで走らせ、解釈された応答を表示します |
| `hermes hooks revoke <command>` | `<command>` に一致する許可の一覧の項目をすべて消します（次回の再起動から効きます） |
| `hermes hooks doctor` | 設定済みのフックそれぞれについて、実行権限、許可の状態、更新時刻のずれ、JSON 出力の妥当性、おおよその実行時間を確認します |

### 安全上の注意 {#security}

シェルフックは**あなた自身の権限そのもの**で動きます — cron の項目やシェルの別名と同じ信頼の境界です。`config.yaml` の `hooks:` ブロックは、特権を持つ設定として扱ってください。

- 自分で書いたか、隅々まで読んだスクリプトだけを指すようにします。
- パスを追いやすくするため、スクリプトは `~/.hermes/agent-hooks/` の中に置きます。
- 共有の設定を取り込んだら `hermes hooks doctor` を走らせ直し、登録される前に新しく足されたフックに気づけるようにします。
- config.yaml をチームでバージョン管理しているなら、`hooks:` の節を変える PR は CI の設定と同じ目つきで確認します。

### 順番と優先順位 {#ordering-and-precedence}

Python のプラグインフックもシェルフックも、同じ `invoke_hook()` の振り分け役を通ります。先に Python のプラグインが登録され（`discover_and_load()`）、次にシェルフックが登録される（`register_from_config()`）ので、同点のときは Python の `pre_tool_call` の遮断の判断が優先されます。最初に返された有効な遮断が採用されます — どれかのコールバックが空でないメッセージを伴う `{"action": "block", "message": str}` を返した時点で、集約する側はすぐに返ります。

## 送信 Webhook {#outbound-webhooks}

送信 Webhook は、[受信 Webhook の仕組み](/hermes/docs/user-guide/messaging/webhooks/)を送る側から見た鏡像です。受信 Webhook は外の世界が変わったときに Hermes を起こし、送信 Webhook は Hermes が何かをしたときに外の世界へ知らせます。HTTP のエンドポイントと、それぞれが関心を持つライフサイクルのイベントを一覧で設定しておくと、条件に合うイベントが発火するたびに、Hermes が署名付きの JSON のペイロードを各エンドポイントへ POST します — 受け取る側が定期的に問い合わせる必要はありません。

よくある使い方は次のとおりです。

- エージェントの応答が終わったときに CI やダッシュボードへ知らせる（`on_session_end`）
- 稼働中の複数のインスタンスをまたいでサブエージェントの完了を追う（`subagent_stop`）
- ツールの動きを外部の監視へ流し込む（`matcher` を付けた `post_tool_call`）
- *別の* Hermes を起こす: その受信 Webhook を URL に指定します

### 設定 {#configuration}

`~/.hermes/config.yaml` に `hooks.outbound:` の一覧を足します。

```yaml
hooks:
  outbound:
    - name: ci-notify                       # optional label for logs
      url: https://ci.example.com/hermes-events
      events: [on_session_end, subagent_stop]
      secret_env: HERMES_OUTBOUND_WEBHOOK_SECRET   # env var holding the HMAC secret
      timeout: 10                           # per-attempt seconds (1–60)

    - name: tool-monitor
      url: https://metrics.example.com/hooks/hermes
      events: [post_tool_call]
      matcher: "terminal|delegate_task"     # regex, tool-scoped events only
```

プラグインフックのイベントであれば、どれでも指定できます（`pre_tool_call`、`post_tool_call`、`pre_llm_call`、`post_llm_call`、`on_session_start`、`on_session_end`、`subagent_start`、`subagent_stop` など）。書式が壊れた項目は警告を出して読み飛ばされます — 壊れた Webhook がエージェントを落とすことはありません。変更は次の CLI のセッション、またはゲートウェイの再起動から効きます。

秘密情報について: 設定ファイルに資格情報を残さずに済むよう、`secret:` に直接書くのではなく `secret_env`（環境変数の名前。ふつうは `~/.hermes/.env` で設定します）を使ってください。秘密情報のない項目は署名なしで送られます（`hermes hooks list` では `UNSIGNED` と表示されます）。

### やりとりの形式 {#wire-format}

発火のたびに、シェルフックの標準入力と同じ最上位の形に配送のメタ情報を足した JSON の本文を POST します。

```json
{
  "hook_event_name": "on_session_end",
  "tool_name": null,
  "tool_input": null,
  "session_id": "sess_abc123",
  "cwd": "/home/user/project",
  "extra": {"completed": true, "interrupted": false, "model": "...", "platform": "cli"},
  "delivery_id": "3f2c9a...",
  "timestamp": "2026-07-22T14:00:00Z"
}
```

ヘッダーは次のとおりです。

| ヘッダー | 値 |
|--------|-------|
| `Content-Type` | `application/json` |
| `X-Hermes-Event` | フックのイベント名 |
| `X-Hermes-Delivery` | 配送ごとに一意の id — 本文の `delivery_id` と同じ値 |
| `X-Hermes-Signature-256` | `sha256=<hex>` — 本文そのものの HMAC-SHA256（GitHub と同じ形式）。秘密情報を設定したときにだけ付きます |

署名の検証は、GitHub の Webhook とまったく同じやり方でできます。

```python

def verify(body: bytes, header: str, secret: str) -> bool:
    expected = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, header)
```

`delivery_id` と `timestamp` は**署名される本文の中**にあるので、検証する受け手は再送攻撃への備えも同時に手に入ります。

- `delivery_id`（または対応する `X-Hermes-Delivery` ヘッダー）で**重複を取り除きます** — 最近見た id を覚えておき、重複を読み飛ばします。Hermes は失敗した配送を 1 度だけやり直すので、同じ id が正当に 2 回届くことがあります。
- `timestamp` を自分の時計と突き合わせ、許容する時間の幅（5 分が一般的な既定です）を超えていれば**古いイベントとして拒みます**。取り込んだ要求を再送する攻撃者は、秘密情報なしに新しい時刻を偽れません。

### 配送の考え方 {#delivery-semantics}

- **投げっぱなしで、主要な処理の経路の外で動きます。** イベントは即座に直列化してキューへ積まれ、裏方のスレッド 1 本が HTTP の POST を行います。遅いエンドポイントや死んだエンドポイントが、ツール呼び出しやエージェントの応答を止めることはありません。
- **知らせるだけです。** シェルフックとは違い、送信 Webhook はツール呼び出しを止めたり文脈を差し込んだりできません — 応答の本文は無視されます。見るだけで、舵を取ることはありません。
- **やり直しには上限があります。** 接続のエラーと 5xx の応答は、間隔を空けて 1 度だけやり直します。4xx はやり直しません（要求そのものが誤りだと受け手が言っているためです）。失敗は記録して捨てられます — 配送はできる限りの努力であって、保証ではありません。
- **リダイレクトは決して追いません。** 3xx の応答は設定の誤りとみなして記録します — リダイレクトされた POST を追うと、署名付きのペイロードが黙って失われるからです。`url` には最終的なエンドポイントを指定してください。
- **キューには上限があります。** キューが詰まった場合（死んだエンドポイント、イベントの嵐）、際限なくメモリーを食うのではなく、新しいイベントを警告付きで捨てます。
- **同意の確認はありません。** 送信先はあなたの機械上でコードを実行しません — 設定した URL でデータを受け取るだけです。`HERMES_SAFE_MODE=1` のときは、プラグインやシェルフックと同じく登録が飛ばされます。ペイロードにはツールの入力やイベントのメタ情報が含まれるので、送信先は信頼できるエンドポイントだけにし、`https://` を使ってください。

`hermes hooks list` は、シェルフックと並べて設定済みの送信先を表示します。各送信先が署名付きかどうかも分かります。
