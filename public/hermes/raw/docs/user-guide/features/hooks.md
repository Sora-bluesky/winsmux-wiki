---
title: "イベントフック"
description: "節目となるタイミングで独自のコードを走らせる — 活動の記録、通知の送信、Webhook への送信"
upstream_path: user-guide/features/hooks.md
upstream_blob: 3cb7873babe756e5582ac4f0a8d0daeb5430fb05
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/hooks
---

# イベントフック {#event-hooks}

Hermes には、節目となるタイミングで独自のコードを走らせるフックの仕組みが4つあります。

| 仕組み | 登録方法 | 動く場所 | 使いどころ |
|--------|---------------|---------|----------|
| **[ゲートウェイフック](#gateway-event-hooks)** | `~/.hermes/hooks/` に置いた `HOOK.yaml` + `handler.py` | ゲートウェイのみ | 記録、通知、Webhook |
| **[プラグインフック](#plugin-hooks)** | [プラグイン](/hermes/docs/user-guide/features/plugins/)の中で `ctx.register_hook()` を呼ぶ | CLI + ゲートウェイ | ツール呼び出しの横取り、計測、ガードレール |
| **[シェルフック](#shell-hooks)** | プロファイルの `config.yaml` の `hooks:` ブロックからシェルスクリプトを指す | CLI + ゲートウェイ + デスクトップ / TUI / ダッシュボードのチャット | 置くだけで使えるスクリプトで、遮断・自動整形・コンテキスト注入を行う |
| **[送信 Webhook](#outbound-webhooks)** | `~/.hermes/config.yaml` の `hooks.outbound:` リスト | CLI + ゲートウェイ | 署名付きのライフサイクルイベントを外部の HTTP エンドポイント（CI、ダッシュボード、別のエージェント）へ送り出す |

フックのコールバックで起きたエラーは切り離して記録され、エージェント本体が落ちることはありません。ただしフックは受け身なものばかりではありません。指示・制御系のフックは流れを変えられますし、変換系は内容を差し替えられ、シェルの `pre_tool_call` フックは呼び出しを遮断したり、失敗時に閉じる側へ倒したりできます。

## ゲートウェイイベントフック {#gateway-event-hooks}

ゲートウェイフックは、ゲートウェイの稼働中（Telegram、Discord、Slack、WhatsApp、Teams）に自動で発火し、エージェント本体の処理を止めることはありません。

### フックを作る {#creating-a-hook}

フックは 1 つにつき `~/.hermes/hooks/` 配下のディレクトリで、中に 2 つのファイルを置きます。

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

`events` のリストが、どのイベントでハンドラーを呼ぶかを決めます。`command:*` のようなワイルドカードも含め、好きな組み合わせを購読できます。

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
- 名前は `handle` にします
- 引数として `event_type`（文字列）と `context`（辞書）を受け取ります
- `async def` でも通常の `def` でも構いません — どちらでも動きます
- エラーは捕捉して記録され、エージェントを落とすことはありません

### 使えるイベント {#available-events}

| イベント | 発火するタイミング | context のキー |
|-------|---------------|--------------|
| `gateway:startup` | ゲートウェイのプロセスが起動したとき | `platforms`（稼働中のプラットフォーム名のリスト） |
| `session:start` | メッセージングのセッションが新しく作られたとき | `platform`、`user_id`、`session_id`、`session_key` |
| `session:end` | セッションが終わったとき（リセットの前） | `platform`、`user_id`、`session_key` |
| `session:reset` | 利用者が `/new` または `/reset` を実行したとき | `platform`、`user_id`、`session_key` |
| `session:compress` | セッションのコンテキスト圧縮が終わったとき | `platform`、`session_id`、`old_session_id`（その場で圧縮した場合は空）、`in_place`（真偽値 — `true` なら同じ id のまま記録を圧縮、`false` なら `old_session_id` から切り替え）、`compression_count` |
| `agent:start` | エージェントがメッセージの処理を始めたとき | `platform`、`user_id`、`chat_id`、`thread_id`（フォーラムのトピック / スレッドのルート id。スレッド内でなければ空）、`chat_type`（`"dm"` \| `"group"` \| `"forum"`。不明なら空）、`session_id`、`message`（500 文字で切り詰め） |
| `agent:step` | ツール呼び出しループが 1 周するたび | `platform`、`user_id`、`session_id`、`iteration`、`tool_names` |
| `agent:end` | エージェントが処理を終えたとき | `agent:start` と同じキーに加えて `response`（500 文字で切り詰め） |
| `reaction:added` | ボットから見えるメッセージに絵文字リアクションが付いたとき（現状は Slack アダプター）。`reactions:read` スコープと `reaction_added` のボットイベント購読が必要で、ボットがそのチャンネルに参加している必要があります。 | `platform`、`reaction`、`user_id`、`item_user_id`、`item_type`、`channel_id`、`message_ts`、`team_id`、`event_ts`、`raw_event` |
| `reaction:removed` | ボットから見えるメッセージから絵文字リアクションが外されたとき。`reaction_removed` のボットイベント購読が必要です。 | `reaction:added` と同じ形 |
| `command:*` | スラッシュコマンドが実行されたとき（すべて） | `platform`、`user_id`、`command`、`args` |

#### ワイルドカードの一致 {#wildcard-matching}

`command:*` で登録したハンドラーは、あらゆる `command:` イベント（`command:model`、`command:reset` など）で発火します。購読 1 つですべてのスラッシュコマンドを見張れます。

:::tip スレッドへの返信
同じ Telegram のフォーラムトピックへ続けてメッセージを投げるハンドラーでは、`chat_type == "forum"` かつ `thread_id` が空でないときに `message_thread_id=int(thread_id)` を付けてください。
:::

### 例 {#examples}

#### 長い処理を Telegram で知らせる {#telegram-alert-on-long-tasks}

エージェントの処理が 10 ステップを超えたら自分宛てにメッセージを送ります。

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

#### コマンド利用の記録 {#command-usage-logger}

どのスラッシュコマンドが使われているかを追います。

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

#### セッション開始を Webhook で通知する {#session-start-webhook}

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

### チュートリアル: BOOT.md — ゲートウェイ起動のたびに始業チェックリストを走らせる {#tutorial-bootmd-run-a-startup-checklist-on-every-gateway-boot}

利用者のあいだで広まっている使い方です。`~/.hermes/BOOT.md` に Markdown のチェックリストを置き、ゲートウェイが起動するたびにエージェントへ 1 回実行させます。「起動のたびに夜間の cron 失敗を確認して、失敗があれば Discord で知らせて」や「直近 24 時間の deploy.log をまとめて Slack の #ops に流して」といった用途に向きます。

ここでは、それを自分で定義するフックとして組み立てる手順を示します。Hermes に BOOT.md 用の組み込みフックは同梱されていません。望む振る舞いは自分で配線します。

#### 何を作るか {#what-were-building}

1. 起動時の指示を自然な言葉で書いた `~/.hermes/BOOT.md` というファイル。
2. `gateway:startup` で発火し、ゲートウェイが解決したモデルと資格情報で 1 回きりのエージェントを起こして BOOT.md の指示を実行するゲートウェイフック。
3. 報告することが何もないときにメッセージ送信を見送れるようにする `[SILENT]` という取り決め。

#### 手順 1: チェックリストを書く {#step-1-write-your-checklist}

`~/.hermes/BOOT.md` を作ります。人間のアシスタントに指示を出すつもりで書いてください。

```markdown
# Startup Checklist

1. Run `hermes cron list` and check if any scheduled jobs failed overnight.
2. If any failed, summarize them for Discord #ops (the hook delivers your final response to its configured target).
3. Check if `/opt/app/deploy.log` has any ERROR lines from the last 24 hours. If yes, summarize them and include in the same report.
4. If nothing went wrong, reply with only `[SILENT]` so no message is sent.
```

エージェントはこれをプロンプトの一部として読みます。ツール呼び出し、シェルコマンド、メッセージ送信、ファイルの要約など、普通の言葉で書けることは何でも通ります。

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

肝心なのは次の 2 行です。

- `_resolve_gateway_model()` は、ゲートウェイに今設定されているモデルを読み取ります。
- `_resolve_runtime_agent_kwargs()` は、通常のゲートウェイのやり取りと同じやり方でプロバイダーの資格情報を解決します。API キー、ベース URL、OAuth トークン、資格情報プールが対象です。

これらを使わないと、素の `AIAgent()` は組み込みの既定値にフォールバックし、既定以外のエンドポイントに対しては 401 になります。

#### 手順 3: 動かして確かめる {#step-3-test-it}

ゲートウェイを再起動します。

```bash
hermes gateway restart
```

ログを眺めます。

```bash
hermes logs --follow --level INFO | grep boot-md
```

`Running BOOT.md (N chars)` が出たあと、エージェントが何をしたかの要約として `boot-md completed: ...` が続くか、`[SILENT]` のような沈黙の合図をエージェントがそのまま返したときは `boot-md completed (nothing to report)` が出ます。

チェックリストをやめたいときは `~/.hermes/BOOT.md` を消します。フックは読み込まれたままですが、ファイルが無ければ黙って何もしません。

#### 応用 {#extending-the-pattern}

- **曜日で内容を変える:** BOOT.md の指示の中で `datetime.now().weekday()` を手がかりにします（「月曜なら週次のデプロイログも確認して」など）。指示は自由な文章なので、エージェントが判断できることなら何でも書けます。
- **チェックリストを複数持つ:** フックが読むファイルを変え（`STARTUP.md`、`MORNING.md` など）、それぞれ別のフックディレクトリとして登録します。
- **エージェントを使わない版:** エージェントのループが要らないなら `AIAgent` は使わず、ハンドラーから `httpx` で決まった通知を直接送るだけにします。安く、速く、プロバイダーにも依存しません。

#### なぜ組み込みにしていないのか {#why-this-isnt-a-built-in}

以前の Hermes はこれを組み込みフックとして同梱し、ゲートウェイの起動のたびに素の既定値でエージェントを黙って起こしていました。独自のエンドポイントを使っている人には不意打ちになり、動いていることを知らない人には見えない機能になっていました。手順として文書化し、自分の hooks ディレクトリに自分で作る形にしておけば、何をしているかがそのまま見えますし、ファイルを書くという行為が利用の意思表示になります。

### 仕組み {#how-it-works}

1. ゲートウェイの起動時に `HookRegistry.discover_and_load()` が `~/.hermes/hooks/` を走査します
2. `HOOK.yaml` と `handler.py` を持つサブディレクトリが動的に読み込まれます
3. ハンドラーは宣言されたイベントに登録されます
4. 各ライフサイクルの地点で `hooks.emit()` が一致するハンドラーをすべて呼びます
5. ハンドラー内のエラーは捕捉して記録されます — 壊れたフックがエージェントを落とすことはありません

:::info
ゲートウェイフックが発火するのは**ゲートウェイ**（Telegram、Discord、Slack、WhatsApp、Teams）だけです。CLI はゲートウェイフックを読み込みません。どこでも動かしたいなら[プラグインフック](#plugin-hooks)を使ってください。
:::

## プラグインフック {#plugin-hooks}

[プラグイン](/hermes/docs/user-guide/features/plugins/)は、**CLI とゲートウェイの両方**のセッションで発火するフックを登録できます。登録はプログラムから行い、プラグインの `register()` 関数の中で `ctx.register_hook()` を呼びます。

プラグインの同梱方法や登録の詳しい手順は
[プラグインガイド](/hermes/docs/user-guide/features/plugins/)を見てください。

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

- コールバックは**キーワード引数**で呼ばれます。将来の追加に備えて必ず `**kwargs` を受け取ってください。
- コールバックの例外は記録のうえ読み飛ばされ、後続のコールバックはそのまま続きます。毎回同じ理由で失敗するコールバック（多くは、フックが送らないフィールド名を引数にしている場合。たとえば `tool_name`/`args` ではなく `tool_data` と書いているとき）は WARNING で**1 回だけ**報告され、そのメッセージにはフックが渡すフィールドの一覧が載ります。同じ内容の繰り返しは DEBUG に落ちるので、宣言を間違えたプラグインがログを埋め尽くすことはありません。
- **時間制限のある**フック（`post_tool_call` / `pre_llm_call` のようなホットパスの観測系と、ポリシー用の `pre_tool_call`）で Python プラグインのコールバックが `plugins.hook_callback_timeout`（既定 30 秒、`0` で無効、上限 600）より長く**ブロック**した場合は、ワーカーの終了を待たずに切り離し、エージェントのループを進めます。時間切れになった、あるいはまだ動いている `pre_tool_call` のコールバックは**閉じる側へ倒し**（ツールを遮断し）ます。他の時間制限付きフックは開く側へ倒します（読み飛ばします）。呼び出しスレッドの取り決めが文書化されているフック（`subagent_stop`）は、時間制限用のワーカーへ移されることはありません。シェルフックは項目ごとの `timeout` を自前で持ちます。
- 以下の一覧は性質の説明です。**観測系**は戻り値を無視し、**変換系**は最初に返された妥当な文字列で置き換え、**指示・制御系**は文書化された形の戻り値を受け取ります。プラグインのミドルウェアは別のレジストリと別の面であって、フックの種類がもう 1 つあるわけではありません。
- `turn_id`、`api_request_id`、`task_id`、`session_id`、`api_call_count` といった相関用のフィールドはフックごとに異なり、無いこともあります。ID は中身を解釈せず、そのまま扱ってください。
- 実行時に有効なイベント名は `hermes_cli.plugins.VALID_HOOKS` が定めます。`hermes hooks list` が並べるのは設定済みのシェルフックと送信 Webhook であって、使えるイベントのすべてではありません。`hermes hooks test <event>` は、無効なイベントを渡したときにだけ有効な集合を教えてくれます。

### キャッシュを壊さないシステムプロンプトの節 {#cache-safe-system-prompt-sections}

常に効いていてほしい指針を持ちたいプラグインは、毎回 `pre_llm_call` で同じ文章を注入するかわりに、大きさに上限のあるシステムプロンプトの節を登録できます。

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

取り決めは意図して狭くしてあります。

- ID は全体で一意、かつ安定した 1〜128 文字の小文字の識別子で、使えるのは英字・数字・`.`・`_`・`-` だけです。重複した ID は拒否されます。
- 位置の指定に使えるのは `after_memory` だけです。節は ID 順に並べられ、記憶・プロファイルのコンテキストの後、セッションのメタデータの前に描画されます。プラグインが中核のプロンプトを並べ替えたり差し替えたりはできません。
- 呼び出し可能オブジェクトは、`session_id`、`model`、`provider`、`platform`、`profile_name`、`cwd` を含む読み取り専用のマッピングを受け取ります。実行されるのは**新しいセッションにつき 1 回**です。描画された結果は圧縮の時点で凍結され、プロセスの再起動や再開のあとは、すでに保存済みのシステムプロンプト全体から復元されます。既存のセッションに対してプラグインの状態を読み直すことはありません。
- `max_chars` の上限は 4,000 文字です。プラグインの節をすべて合わせると、監査用の見出しも含めて 8,000 文字・32 節が上限になります。空、文字列でない、大きすぎる、合計が予算を超える、例外を投げる節は警告とともに読み飛ばされ、プロンプトの組み立ては続きます。
- 受け入れられた節はプロンプト中に名前が出るほか、セッション開始時にプラグイン名・位置・文字数がログに記録されます。

その回かぎりの本当に動的なコンテキストには `pre_llm_call` を使ってください。この取り決めに環境ヒント用のプラグインフックを意図して用意していないのは、cwd やブランチなどの環境情報が変わったときに、セッションのキャッシュ済みプロンプトが黙って書き換わってはいけないからです。そうしたフックを追加するには、具体的な利用者と、凍結・再開に耐える同じ意味づけが先に必要です。

### 同梱プラグインフックの一覧 {#shipped-plugin-hook-catalog}

以下のペイロードのフィールドは、それぞれの呼び出し箇所が渡すイベント固有のフィールドそのものです。後方互換のため、`PluginManager` はすべてのプラグインフックのコールバックに `telemetry_schema_version="hermes.observer.v1"` も付けます。この古い封筒の印は、すべてのフックのペイロードが 1 つの意味論を共有していることを示すものではありません。新しい版付きの取り決めは、それぞれのイベントや機能のまとまりに属します。

| フック | 種類 | 発火の正確なタイミングと戻り値の扱い | 明示されたペイロードのフィールド | プライバシー / 機微さ |
|---|---|---|---|---|
| [`pre_tool_call`](#pre_tool_call) | 指示・制御 | 実行前に 1 回。最初の妥当な `block` または `approve` の指示が勝ち、`modify` の戻り値はツール引数へ浅くマージされます。 | `tool_name`、`args`、`task_id`、`session_id`、`tool_call_id`、`turn_id`、`api_request_id`、`middleware_trace` | 生の引数には利用者の内容、パス、コマンド、秘密情報が含まれることがあります。 |
| `post_tool_call` | 観測 | 遮断・エラー・成功のいずれの結果のあとでも。戻り値は無視されます。 | `tool_name`、`args`、`result`、`task_id`、`session_id`、`tool_call_id`、`turn_id`、`api_request_id`、`duration_ms`、`status`、`error_type`、`error_message`、`middleware_trace` | 結果やエラーの文面には、任意のツール・利用者の内容や秘密情報が含まれることがあります。 |
| `transform_tool_result` | 変換 | `post_tool_call` のあと、会話へ追記する前。最初の文字列が結果を置き換えます。 | `tool_name`、`args`、`result`、`task_id`、`session_id`、`tool_call_id`、`turn_id`、`api_request_id`、`duration_ms`、`status`、`error_type`、`error_message` | モデルへ渡る結果と引数の全体が見えます。 |
| `transform_terminal_output` | 変換 | 上限付きの前景プロセスの出力を取り込んだあと、最終的な出力の制限をかける前。最初の文字列が出力を置き換えます。 | `command`、`output`、`returncode`、`task_id`、`env_type` | コマンドや出力に資格情報が含まれることがあります。 |
| `pre_transcription` | 変換 | 音声認識のディスパッチャーが、プロバイダーを解決したあと、いずれのバックエンド（組み込み・コマンド型・プラグイン登録）を呼ぶ前に発火します。辞書の結果は登録順に適用され、フィールドごとに最後の書き手が勝ちます（`prompt`、`language`、`model`。`file_path` は読み取り専用）。 | `file_path`、`provider`、`model`、`language`、`prompt`、`source` | 最終的なプロンプトは音声とともに設定済みの音声認識プロバイダーへ送られます。フックの戻り値に秘密情報を入れないでください。 |
| `pre_llm_call` | 指示・制御 | ループの前に 1 回。妥当な文字列や `{"context": ...}` の戻り値はすべて連結され、利用者のメッセージへ注入されます。 | `session_id`、`task_id`、`turn_id`、`user_message`、`conversation_history`、`is_first_turn`、`model`、`platform`、`parent_session_id`、`sender_id` | 利用者のメッセージと会話履歴のすべて。 |
| `post_llm_call` | 観測 | 中断されず成功したやり取りの確定時。戻り値は無視されます。 | `session_id`、`task_id`、`turn_id`、`user_message`、`assistant_response`、`conversation_history`、`model`、`platform` | プロンプト・応答・履歴のすべて。 |
| `transform_llm_output` | 変換 | `post_llm_call` と最終的な配信の前。最初の空でない文字列が応答を置き換えます。 | `response_text`、`session_id`、`model`、`platform` | 最終的なアシスタントの文面すべて。 |
| `pre_verify` | 指示・制御 | 編集したコードに対する上限付きの検証ゲートで。最初の妥当な継続 / 停止指示がやり取りを続けさせます。 | `session_id`、`platform`、`model`、`coding`、`attempt`、`final_response`、`changed_paths` | 下書きの応答と変更されたパス。 |
| `pre_api_request` | 観測 | プロバイダーへの試行ごとに、リクエストの直前。戻り値は無視されます。 | `task_id`、`turn_id`、`api_request_id`、`session_id`、`user_message`、`conversation_history`、`platform`、`model`、`provider`、`base_url`、`api_mode`、`api_call_count`、`retry_count`、`request_messages`、`message_count`、`tool_count`、`approx_input_tokens`、`request_char_count`、`max_tokens`、`started_at`、`middleware_trace`、`request` | 機微さが高い箇所です。古くからある `user_message`、`conversation_history`、`request_messages` は意図して生のままです。伏せ字処理済みの `request` を使ってください。 |
| `post_api_request` | 観測 | プロバイダーの応答を正規化して成功したあと。戻り値は無視されます。 | `task_id`、`turn_id`、`api_request_id`、`session_id`、`platform`、`model`、`provider`、`base_url`、`api_mode`、`api_call_count`、`api_duration`、`started_at`、`ended_at`、`finish_reason`、`message_count`、`response_model`、`response`、`usage`、`assistant_message`、`assistant_content_chars`、`assistant_tool_call_count` | 伏せ字処理済みの `response` が使えますが、正規化しただけの生の `assistant_message` にはモデルや利用者の内容が含まれることがあります。`usage` は集計用のデータです。 |
| `api_request_error` | 観測 | プロバイダーへの試行が失敗するたび。戻り値は無視されます。 | `task_id`、`turn_id`、`api_request_id`、`session_id`、`platform`、`model`、`provider`、`base_url`、`api_mode`、`api_call_count`、`api_duration`、`started_at`、`ended_at`、`status_code`、`retry_count`、`max_retries`、`retryable`、`reason`、`error`、`request` | エラーの文面にプロバイダーや利用者のデータが含まれることがあります。`request` は伏せ字処理される想定です。 |
| `on_stream_start` | 観測 | ストリーミングの LLM 応答が始まったときに配送されます。トークンの経路から外し、ホストが持つ上限付きのキューと、コールバックごとに 1 つのワーカーで届けます。戻り値は無視されます。 | `turn_id`、`iteration`、`session_id`、`model`、`provider`、`surface` | 識別子と経路のメタデータのみ。 |
| `on_stream_delta` | 観測 | 正規化されたストリーミングのテキスト差分ごとに、上限付きの観測キュー経由で配送されます。詰まったコールバックは自分の分の最も古いイベントだけを落とします。戻り値は無視されます。 | `delta`、`kind`（`text` または `reasoning`）、`turn_id`、`iteration`、`session_id`、`model`、`provider`、`surface` | 差分のテキストはモデルの生の出力です。推論の差分を受け取るには `plugins.stream_reasoning_deltas` での明示的な許可が必要です。 |
| `on_stream_end` | 観測 | ストリーミングの応答が終わるかエラーになり、ストリームが閉じたあとに配送されます。戻り値は無視されます。 | `final_text`、`finished`、`error`、`turn_id`、`iteration`、`session_id`、`model`、`provider`、`surface` | 組み立て終わった応答の全文。エラーの文面にはプロバイダーのデータが含まれることがあります。 |
| `on_interim_message` | 観測 | 最終回答の前に、ループ途中のアシスタントのメッセージが表に出たときに配送されます（ストリーミングの有無を問いません）。戻り値は無視されます。 | `text`、`already_streamed`、`turn_id`、`iteration`、`session_id`、`model`、`provider`、`surface` | 途中経過のアシスタントの文面すべて。 |
| `transform_api_error_classification` | 変換 | プロバイダーへの試行が失敗するたび、組み込みの分類器の先頭で。すべてのコールバックを実行したうえで、妥当な `reason` を持つ最初の辞書が勝ちます（全実行してから先頭を採る方式）。採用されなかった妥当な結果は実行時の警告として記録されます。Python プラグイン専用です。 | `provider`、`model`、`status_code`、`error_type`、`error_code`、`error_message`、`error_body`、`error`、`approx_tokens`、`context_length`、`num_messages` | `error_message` と `error_body` にはプロバイダーや利用者の生データが含まれることがあります。 |
| `on_session_start` | 観測 | 新しいセッションの最初のやり取りで。戻り値は無視されます。 | `session_id`、`model`、`platform` | 識別子と経路のメタデータのみ。 |
| `on_session_end` | 観測 | 正式にはやり取りの確定ごとに。CLI / TUI の終了時には、項目を減らした古い形も追加であります。戻り値は無視されます。 | 正式な形: `session_id`、`task_id`、`turn_id`、`completed`、`failed`、`interrupted`、`turn_exit_reason`、`model`、`platform`。終了経路では `reason`/`api_request_id` が加わったり、項目が欠けたりします。 | ID、モデル / プラットフォーム、結果。正式なペイロードに本文は含まれません。 |
| `on_session_finalize` | 観測 | `finalize_session` を通した CLI / TUI / ゲートウェイの後片付けで。ゲートウェイの停止時はリセットを伴わずに確定することがあります。戻り値は無視されます。 | 面によって変わる `session_id`、`platform`、場合により `reason`、`old_session_id`、`new_session_id` | セッションと経路の識別子。 |
| `on_session_reset` | 観測 | CLI / TUI のセッションの切れ目と、ゲートウェイで入れ替わりのセッションができたあとに。戻り値は無視されます。 | CLI: `session_id`、`platform`、`reason`。TUI: `session_id`、`platform`。ゲートウェイ: それらに加えて `reason`、`old_session_id`、`new_session_id` | セッションと経路の識別子。 |
| `agent_loop_stopped` | 観測 | 実際に動いているエージェントが中断された直後 — ゲートウェイの `_interrupt_and_clear_session`、または TUI / デスクトップの `session.interrupt`。戻り値は無視されます。 | `session_key`、`platform`、`reason`、`invalidation_reason` | セッション / 経路の識別子と中断の理由。本文は含まれません。 |
| `on_skill_lifecycle` | 観測 | スキル利用の状態が正式に変わったあと。戻り値は無視されます。 | `action`、`skill_name`、`provenance`、`task_id`、`session_id`、`use_count`、`reused`、`reuse_after_patch` | 手元のスキル名と出どころが見えます。 |
| `subagent_start` | 観測 | 子が組み立てられ、これから走る直前。戻り値は無視されます。 | `parent_session_id`、`parent_turn_id`、`parent_subagent_id`、`child_session_id`、`child_subagent_id`、`child_role`、`child_goal` | 子の目標に利用者やプロジェクトの内容が含まれることがあります。 |
| `subagent_stop` | 観測 | 子の終了時。戻り値は無視されます。 | `parent_session_id`、`parent_turn_id`、`child_session_id`、`child_role`、`child_summary`、`child_status`、`tool_call_history`、`duration_ms` | 要約と、伏せ字処理済みのツール履歴のメタデータから、プロジェクトの構成が読み取れることがあります。 |
| `pre_gateway_dispatch` | 指示・制御 | 内部イベント以外の受信メッセージについて、認証・ペアリング・振り分けの前。最初の妥当な `skip`、`rewrite`、`allow` が流れを決めます。 | `event`、`gateway`、`session_store` | 極めて強い権限を持つプロセス内のオブジェクトで、受信した利用者・経路のデータやホストのハンドルが見えます。 |
| `gateway_platform_event` | 観測 | ゲートウェイのプロファイル単位の認可が通ったあと、対応するプラットフォーム固有のイベントがゲートウェイの境界で正規化されたとき（Telegram: リアクション、メッセージ編集。Discord: メッセージ編集 / 削除、スレッドの作成 / 改名）。戻り値は無視されます。 | `platform`、`event_type`、`payload`（イベント種別ごとの辞書 — 後述の個別の取り決めを参照） | 正規化された素の辞書だけを渡します。生の SDK オブジェクト、アダプターのハンドル、ボットのクライアントが表に出ることはありません。 |
| `pre_command` | 観測 | 認識されたスラッシュコマンドが振り分けられる直前、ハンドラーが走る前に、CLI とゲートウェイの通常経路で。v1 では戻り値は無視されます（指示の形をした辞書はデバッグログに残ります）。ゲートウェイで実行中のエージェントに割り込むコマンド（稼働中の `/stop`、`/approve`）は意図して除いてあります。制御面の非常口はプラグインの手が届かないところに置く必要があるためです。 | `surface`（`"cli"` \| `"gateway"`）、`command`（正式名）、`alias_used`、`args_raw`、`session_key`、`platform` | `args_raw` には、コマンドのあとに打ち込まれた利用者の内容や秘密情報が含まれることがあります。 |
| `pre_approval_request` | 観測 | 問い合わせ型あるいはスマートな承認の前。戻り値は無視されます。 | `command`、`description`、`pattern_key`、`pattern_keys`、`session_key`、`surface`、`turn_id`、`tool_call_id` | コマンドに秘密情報が含まれることがあります。スマート観測向けの準備では伏せ字処理が強制されますが、すべての面で同じ伏せ字処理がされるわけではありません。 |
| `post_approval_response` | 観測 | 判断・時間切れ・ゲートウェイの通知失敗のあと。戻り値は無視されます。 | `command`、`description`、`pattern_key`、`pattern_keys`、`session_key`、`surface`、`turn_id`、`tool_call_id`、`choice`。スマート経路では `decided_by` が加わることがあります | コマンドの機微さは同じで、加えて判断のメタデータ。 |
| `on_room_member_activity` | 観測 | ボットモードのゲートウェイ上で、ホストされたグループチャットのメンバーのやり取りが走っているあいだ、そのメンバーのセッションが出す実行時イベントごとに 1 回（ツールの開始 / 完了、承認要求、メッセージ / 推論の差分、エラー）。受け手ごとにキューへ入れ、トークンの経路からは外します。戻り値は無視されます。 | `room_id`、`thread_id`、`member_id`、`turn_id`、`task_id`、`execution_generation`、`kind`、`seq`、`payload` | `payload` はクライアントへ出して安全なセッションイベントの本体です。ツールの引数と結果、伏せ字処理済みの承認コマンド、流れてくるメンバーの文面が入ります。 |
| `kanban_task_claimed` | 観測 | 受け持ちの確定後、ワーカーを起こす前のディスパッチャープロセスで。戻り値は無視されます。 | `task_id`、`profile_name`、`board`、`assignee`、`run_id` | ボード / タスク / プロファイル / 担当者の識別子。 |
| `kanban_task_completed` | 観測 | 完了と後片付けのあと、通常はワーカープロセスで。戻り値は無視されます。 | `task_id`、`profile_name`、`board`、`assignee`、`run_id`、`summary` | 要約にプロジェクトや利用者の内容が含まれることがあります。 |
| `kanban_task_blocked` | 観測 | 停滞状態へ移ったあと。依存待ちの経路では、その書き込みトランザクションを抜ける前に発火します。戻り値は無視されます。 | `task_id`、`profile_name`、`board`、`assignee`、`run_id`、`reason` | 理由にプロジェクトや利用者の内容が含まれることがあります。 |
| `on_kanban_worker_spawned` | 観測 | `spawn_fn` が戻り、ワーカーの PID が保存されたあと。振り分けのロックの中で走るので、コールバックは短く保ってください。戻り値は無視されます。 | `task_id`、`profile_name`、`board`、`assignee`、`run_id`、`worker_pid`、`workspace_path` | `workspace_path` はファイルシステムのパスなので、プロジェクトの構成やユーザー名が読み取れることがあります。 |
| `on_kanban_worker_exited` | 観測 | 定期処理から派生します。`detect_crashed_workers` が、消えた PID のタスクを回収し、その回収が確定したあと。戻り値は無視されます。 | `task_id`、`profile_name`、`board`、`assignee`、`run_id`、`worker_pid`、`exit_kind`、`exit_code`、`outcome`、`retry_status` | 識別子と終了のメタデータのみ。 |
| `on_kanban_worker_stale_claim` | 観測 | 有効期限の切れた受け持ちが回収されたあと。PID が生きていて期限が延びた場合は発火しません。戻り値は無視されます。 | `task_id`、`profile_name`、`board`、`assignee`、`run_id`、`worker_pid`、`heartbeat_stale`、`retry_status` | 識別子と受け持ちのメタデータのみ。 |
| `on_kanban_task_updated` | 観測 | 受け持ち / 完了 / 停滞のライフサイクルの外でタスクのフィールドへの書き込みが確定したあと（割り当て、上書き設定、ダッシュボードの編集）。戻り値は無視されます。 | `task_id`、`profile_name`、`board`、`assignee`、`run_id`、`changed_fields` | `changed_fields` が運ぶのはフィールド名だけで、値は含みません。ただしボードの DB にあるタイトルや本文の値には、利用者やプロジェクトの内容が含まれることがあります。 |
| `on_kanban_dispatch_tick` | 観測 | ディスパッチャーの定期処理ごとに 1 回、振り分けのロックが外れた直後に。何もしなかった回や競合した回も発火します。戻り値は無視されます。 | `board`、`profile_name`、`dry_run`、`outcome`、`result` | `result` はその回の `DispatchResult` で、タスク id、担当者、作業ディレクトリのパスを含みます。 |

---

### ストリーミング出力のフック {#streaming-output-hooks}

これらは観測専用のフックで、応答を変えずに、ストリーミングされる LLM の出力を計測・ライブダッシュボード・音声合成のパイプラインに使えるようにします。配送はホストが持つ上限付きのキューを通り、登録されたコールバックごとに 1 つのバックグラウンドワーカーが動くので、プラグインのコールバックがトークンの経路上でそのまま走ることはありません。あるコールバックが詰まっても、埋まって古いイベントを落とすのはそのコールバックのキューだけで、他の観測側は影響なくイベントを受け取り続けます。

登録の仕方は他のプラグインフックと同じです。

```python
def on_delta(delta, kind, model, provider, **kwargs):
    if kind == "text":
        print(delta, end="", flush=True)

def register(ctx):
    ctx.register_hook("on_stream_delta", on_delta)
```

4 つのフックに共通するフィールド:

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `turn_id` | `str` | やり取りの識別子。取得できるときのみ |
| `iteration` | `int` | 現在の API 呼び出し / ツールループの周回数 |
| `session_id` | `str` | 現在の Hermes のセッション id |
| `model` | `str` | 使っているモデルの識別子 |
| `provider` | `str` | 使っているプロバイダー名 |
| `surface` | `str` | 呼び出し元の面。たとえば `cli`、`discord`、`telegram` |

追加のフィールド:

| フック | 追加フィールド |
|------|--------------|
| `on_stream_start` | なし |
| `on_stream_delta` | `delta: str`、`kind: "text" | "reasoning"` |
| `on_stream_end` | `final_text: str`、`finished: bool`、`error: str | None` |
| `on_interim_message` | `text: str`、`already_streamed: bool` |

`on_interim_message` はストリーミングでない応答のあとにも発火しうるので、このフックだけを登録してもプロバイダーの呼び出しがストリーミング方式に切り替わるわけではありません。

推論の差分は既定ではプラグインに渡りません。使うには明示的に許可します。

```yaml
plugins:
  stream_reasoning_deltas: true
```

戻り値は無視されます。ストリームを速いまま保つため、コールバックは自分の処理をキューに積んですぐ戻るようにしてください。例外は記録されるだけで、ストリームは止まりません。

---

### `pre_tool_call` {#pretoolcall}

ツールが実行される**直前**に、組み込みツールでもプラグインのツールでも同じように発火します。

**コールバックの形:**

```python
def my_callback(tool_name: str, args: dict, task_id: str, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `tool_name` | `str` | これから実行されるツールの名前（例: `"terminal"`、`"web_search"`、`"read_file"`） |
| `args` | `dict` | モデルがツールへ渡した引数 |
| `task_id` | `str` | セッション / タスクの識別子。設定されていなければ空文字列。 |

**発火箇所:** `model_tools.py` の `handle_function_call()` の中、ツールのハンドラーが走る前です。ツール呼び出し 1 回につき 1 回発火します。モデルが 3 つのツールを並行して呼べば 3 回発火します。

**戻り値 — 遮断する、または承認を求める:**

```python
return {"action": "block", "message": "Reason the tool call was blocked"}
# or
return {"action": "approve", "message": "Why approval is required", "rule_key": "optional:scope"}
```

最初の妥当な指示が勝ちます（先に登録される Python プラグイン、次にシェルフックの順）。`block` には空でない `message` が必要で、その文面をモデルへ返すエラーとしてツールを打ち切ります。`approve` は既存の人による承認のゲートへ話を上げます。`message` と `rule_key` は任意で、拒否・時間切れ・ゲートのエラーはいずれも閉じる側へ倒します。それ以外の戻り値は無視されるので、観測だけをしている既存のコールバックはそのまま動き続けます。

**戻り値 — ツールの引数を書き換える:**

```python
return {"action": "modify", "args": {"new_string": "fixed content"}}
```

返された `args` の辞書は、ツールが実行される前に元のツール引数へ浅くマージされます。`modify` するフックが複数あれば積み上がります。元の引数から組み立てた 1 つの辞書に、各フックのキーがマージされるので、フック A が `path` を、フック B が `content` を変えた場合はどちらも残ります。2 つのフックが同じキーを変えた場合は、あとのフックが勝ちます。

シェルフックは Claude Code 互換の形も受け付けます。

```json
{"decision": "modify", "tool_input": {"new_string": "fixed content"}}
```

どちらの形も内部では `{"action": "modify", "args": {...}}` に揃えられます。

`pre_tool_call` のコールバックが `plugins.hook_callback_timeout` を超えた場合（あるいは前回時間切れになった分がまだ動いている場合）、Hermes は**閉じる側へ倒します**。ポリシーの判断が得られないまま進めるのではなく、時間切れのメッセージとともにツールを遮断します。

**使いどころ:** 記録、監査証跡、ツール呼び出しの回数集計、危険な操作の遮断、流量制限、利用者ごとのポリシー適用、引数の無害化、パスの書き換え、既定パラメーターの注入。

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

ツールの実行が戻った**直後**に発火します。

**コールバックの形:**

```python
def my_callback(tool_name: str, args: dict, result: str, task_id: str,
                duration_ms: int, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `tool_name` | `str` | いま実行されたツールの名前 |
| `args` | `dict` | モデルがツールへ渡した引数 |
| `result` | `str` | ツールの戻り値（常に JSON 文字列） |
| `task_id` | `str` | セッション / タスクの識別子。設定されていなければ空文字列。 |
| `duration_ms` | `int` | ツールの振り分けにかかった時間（ミリ秒）。`registry.dispatch()` の前後を `time.monotonic()` で測っています。 |

**発火箇所:** `model_tools.py` の `handle_function_call()` の中、ツールのハンドラーが戻ったあとです。ツール呼び出し 1 回につき 1 回発火します。ツールが捕捉されない例外を投げた場合は発火**しません**（その場合エラーは捕捉されてエラーの JSON 文字列として返され、`post_tool_call` はその文字列を `result` として発火します）。

**戻り値:** 無視されます。

**使いどころ:** ツールの結果の記録、メトリクスの収集、ツールの成功 / 失敗率の追跡、遅延のダッシュボード、ツールごとの予算アラート、特定のツールが終わったときの通知。

**例 — ツール利用のメトリクスを追う:**

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

ツール呼び出しのループが始まる前に、**やり取り 1 回につき 1 回**発火します。妥当な戻り値はプラグインの順に集められ、その回の利用者のメッセージへ注入されます。

**コールバックの形:**

```python
def my_callback(session_id: str, user_message: str, conversation_history: list,
                is_first_turn: bool, model: str, platform: str, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `session_id` | `str` | 現在のセッションを一意に表す識別子 |
| `user_message` | `str` | その回の利用者の元のメッセージ（スキルによる注入が入る前） |
| `conversation_history` | `list` | メッセージ一覧全体の複製（OpenAI 形式: `[{"role": "user", "content": "..."}]`） |
| `is_first_turn` | `bool` | 新しいセッションの最初のやり取りなら `True`、以降は `False` |
| `model` | `str` | モデルの識別子（例: `"anthropic/claude-sonnet-4.6"`） |
| `platform` | `str` | セッションが動いている場所: `"cli"`、`"telegram"`、`"discord"` など |

**発火箇所:** `agent/turn_context.py`（`agent/conversation_loop.py` の `run_conversation()` に向けたやり取りの準備）で、コンテキストの圧縮のあと、主となる `while` ループの前です。`run_conversation()` の呼び出しごと（つまり利用者のやり取り 1 回ごと）に発火し、ツールループ内の API 呼び出しごとではありません。

**戻り値:** コールバックが `"context"` キーを持つ辞書、または空でない普通の文字列を返すと、その文章がその回の利用者のメッセージへ追記されます。注入しないときは `None` を返します。

```python
# Inject context
return {"context": "Recalled memories:\n- User likes Python\n- Working on hermes-agent"}

# Plain string (equivalent)
return "Recalled memories:\n- User likes Python"

# No injection
return None
```

**どこへ注入されるか:** 常に**利用者のメッセージ**であって、システムプロンプトではありません。これはプロンプトのキャッシュを守るためです。システムプロンプトがやり取りをまたいで同じままなら、キャッシュされたトークンを再利用できます。システムプロンプトは Hermes の領分です（モデルへの指針、ツールの強制、人格、スキル）。プラグインは利用者の入力と並ぶ形でコンテキストを足します。

きれいな利用者メッセージの `content` はそのまま残ります。再現とプロンプトキャッシュの安定のために、Hermes は API へ渡した実際のメッセージを、プラグインが注入したコンテキストも含めて、その行の `api_content` という付随データへ保存することがあります。

**複数のプラグイン**がコンテキストを返した場合、その出力はプラグインの読み込み順（ディレクトリ名のアルファベット順）で空行を挟んで連結されます。

**使いどころ:** 記憶の呼び出し、RAG のコンテキスト注入、ガードレール、やり取りごとの分析。

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

ツール呼び出しのループが終わり、エージェントが最終的な応答を作ったあとに、**やり取り 1 回につき 1 回**発火します。発火するのは**成功した**やり取りだけで、中断された場合は発火しません。

**コールバックの形:**

```python
def my_callback(session_id: str, user_message: str, assistant_response: str,
                conversation_history: list, model: str, platform: str, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `session_id` | `str` | 現在のセッションを一意に表す識別子 |
| `user_message` | `str` | その回の利用者の元のメッセージ |
| `assistant_response` | `str` | その回のエージェントの最終的な応答テキスト |
| `conversation_history` | `list` | やり取りが終わったあとのメッセージ一覧全体の複製 |
| `model` | `str` | モデルの識別子 |
| `platform` | `str` | セッションが動いている場所 |

**発火箇所:** `agent/turn_finalizer.py`（`agent/conversation_loop.py` の `run_conversation()` が呼ぶ `finalize_turn()`）で、ツールループが最終応答とともに抜けたあとです。`if final_response and not interrupted` で守られているので、利用者が途中で中断した場合や、エージェントが応答を作れないまま反復上限に達した場合は発火**しません**。

**戻り値:** 無視されます。

**使いどころ:** 会話データを外部の記憶システムへ同期する、応答品質の指標を計算する、やり取りの要約を記録する、後続の処理を起こす。

**例 — 外部の記憶へ同期する:**

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

**エージェントがコードを編集したやり取りで 1 回だけ**、終わろうとする直前（組み込みの「停止前に検証する」ガードのあと）に発火します。これは利用者やプラグインのためのポリシーのゲートで、コールバックはエージェントをそこで止めさせずに続けさせられます — チェックを走らせる、あとに回す、差分を整える、といった具合です。

Hermes に同梱されている検証の指針は、既定の `pre_verify` フックではありません。編集したコードに新しい検証の証拠がないときに、証拠にもとづく「停止前の検証」の促しへ付け足される文章なので、既定の継続経路がもう 1 つ生まれるわけではありません。組み込みの証拠の促しを簡潔に保ちたいときは `agent.verify_guidance: false` を設定します。

**コールバックの形:**

```python
def my_callback(session_id: str, platform: str, model: str, coding: bool,
                attempt: int, final_response: str, changed_paths: list, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `session_id` | `str` | 現在のセッションを一意に表す識別子 |
| `platform` | `str` | セッションが動いている場所（`"cli"`、`"telegram"` …） |
| `model` | `str` | モデルの識別子 |
| `coding` | `bool` | そのやり取りがコーディングの姿勢か（コードの作業場にいるか）。フックの適用範囲はこれで絞ります |
| `attempt` | `int` | そのやり取りで何回促されたか（初回は 0）。自分で回数を抑えるのに使います |
| `final_response` | `str` | エージェントがこれから返そうとしている回答 |
| `changed_paths` | `list` | その回にエージェントが編集したファイル（ソート済み。ここでは必ず 1 つ以上あります） |

`pre_tool_call` のフックを `tool_name` で絞るのと同じ要領で、`coding` を見てコーディングの場面に絞り、`attempt` で 1 回かぎりにします（シェルフックはどちらも `.extra` から読みます）。こうすれば `pre_verify` のフックを複数登録して、それぞれ必要な場面でだけ発火させられます。

**発火箇所:** `agent/conversation_loop.py` の、エージェントが最終回答を受け入れようとする地点、「停止前の検証」チェックの直後です。ただしその回にエージェントがコードを編集し、かつ `pre_verify` のフックが 1 つ以上登録されている場合にかぎります。

**戻り値 — エージェントを続けさせる:**

```python
return {"action": "continue", "message": "Run the formatter on your changes, then finish."}
```

`message` は擬似的な利用者のやり取りとして追記され、ループがもう一周します。Claude Code の Stop の形（`{"decision": "block", "reason": "..."}`。停止を block することが*続行*を意味します）も受け付けます。メッセージのない指示や、それ以外の戻り値の場合は、そのやり取りは終わります。

**上限あり:** 1 回のやり取りで連続する継続の指示は `agent.max_verify_nudges`（既定 3）で頭打ちになるので、常に「続けろ」と言うフックがループを閉じ込めることはできません。促されているあいだ、返そうとしていた回答は履歴には残りますが、利用者には見せません。

**何度呼ばれても同じ結果にする:** フックは促しのたびに再発火するので、`attempt` で門を作ってください（`if attempt: return None`）。そうしないと上限に当たるまで促し続けるだけになります。

**使いどころ:** 試行錯誤の最中はテストやリンターを後回しにする、特定のパスでは検査の合格を必須にする、変更履歴の記載ができるまで「完了」を認めない、プロジェクト固有の検証チェックリストを走らせる。

**例 — 見た目づくりの作業ではチェックを後回しにする（範囲を絞って 1 回かぎり）:**

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

証拠が足りないときの組み込みの促しそのものを形づくりたいなら `agent.verify_guidance` を使います。検証を*せき止める*必要のない、もっと広いコーディング時の決まりごとには `config.yaml` の `agent.coding_instructions` が向きます。コーディングの説明書きに同乗するので、やり取りを余分に消費しません。

---

### `transform_api_error_classification` {#transformapierrorclassification}

API 呼び出しが失敗するたびに 1 回、`agent/error_classifier.classify_api_error()` の先頭で、組み込みの処理列の前に発火します。プロバイダー向けのプラグインは、これを使って中核に手を入れずに自分のプロバイダーのエラーの癖を引き受けます。これは振る舞いを変えるフック（変換の仲間）です。返された分類が、再試行・圧縮・資格情報の切り替え・代替経路への振り分けを動かします。

コールバックは解析済みのエラーの文脈をキーワード引数で受け取ります — `provider`（これで自分の担当かを判定します）、`model`、`status_code`、`error_type`、`error_code`、`error_message`、`error_body`、`error`、`approx_tokens`、`context_length`、`num_messages`。引き受けないときは `None` を、引き受けるときは辞書を返します。

```python
return {"reason": "model_not_found",   # required: a FailoverReason name
        "retryable": False, "should_fallback": True}  # optional recovery-hint overrides
```

振り分けは「全部実行してから先頭を採る」方式です。すべてのコールバックが走り、失敗は切り離され、登録順で最初の妥当な結果が勝ちます（妥当だったが採られなかった結果は実行時の警告として記録されます）。妥当でない辞書や知らない理由は読み飛ばされるので、壊れたプラグインが分類そのものを壊すことはありません。

**プライバシー:** `error_message` と `error_body` には伏せ字処理されていないプロバイダーのデータが乗ることがあります。**Python プラグイン専用**で、シェルからの登録は設定の読み込み時に警告とともに拒否されます。

---

### `on_session_start` {#onsessionstart}

まっさらなセッションが作られたときに**1 回だけ**発火します。セッションの続き（既存のセッションで 2 通目を送ったとき）では発火**しません**。

**コールバックの形:**

```python
def my_callback(session_id: str, model: str, platform: str, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `session_id` | `str` | 新しいセッションを一意に表す識別子 |
| `model` | `str` | モデルの識別子 |
| `platform` | `str` | セッションが動いている場所 |

**発火箇所:** `agent/conversation_loop.py` の `run_conversation()` の中、新しいセッションの最初のやり取りのあいだ — 具体的にはシステムプロンプトが組み上がったあと、ツールループが始まる前です。判定は `if not conversation_history`（過去のメッセージが無ければ新しいセッション）です。

**戻り値:** 無視されます。

**使いどころ:** セッション単位の状態の初期化、キャッシュの暖機、外部サービスへのセッション登録、セッション開始の記録。

**例 — セッションのキャッシュを初期化する:**

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

結果にかかわらず、`run_conversation()` の呼び出しの**いちばん最後**に発火します。利用者が終了したときにエージェントがやり取りの最中だった場合は、CLI の終了処理からも発火します。

**コールバックの形:**

```python
def my_callback(session_id: str, completed: bool, interrupted: bool,
                model: str, platform: str, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `session_id` | `str` | セッションを一意に表す識別子 |
| `completed` | `bool` | エージェントが最終応答を作れたなら `True`、そうでなければ `False` |
| `interrupted` | `bool` | やり取りが中断されたなら `True`（新しいメッセージ、`/stop`、終了のいずれか） |
| `model` | `str` | モデルの識別子 |
| `platform` | `str` | セッションが動いている場所 |

**発火箇所:** 2 か所です。
1. **`agent/turn_finalizer.py`** — `run_conversation()`（`agent/conversation_loop.py`）の呼び出しの最後、後片付けがすべて済んだあと。やり取りがエラーになっても必ず発火します。
2. **`cli.py`** — CLI の atexit ハンドラー。ただし終了時にエージェントがやり取りの最中（`_agent_running=True`）だった場合**のみ**です。処理中の Ctrl+C や `/exit` はここで拾われます。この場合は `completed=False`、`interrupted=True` になります。

**戻り値:** 無視されます。

**使いどころ:** バッファの吐き出し、接続の後始末、セッション状態の保存、セッションの所要時間の記録、`on_session_start` で用意した資源の後片付け。

**例 — 吐き出しと後片付け:**

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

**例 — セッションの所要時間を測る:**

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

CLI やゲートウェイが、動いているセッションを**畳む**ときに発火します。たとえば利用者が `/new` を実行したときや、エージェントが動いたまま CLI を終了したときです。資源だけの都合でアイドルのキャッシュを追い出す場合は、保存された会話を畳むことはありません。出ていくセッション ID に紐づく状態を吐き出すのに使ってください。ゲートウェイのリセットでは、このコールバックが走る時点で入れ替わりのセッションはすでに存在します。

**コールバックの形:**

```python
def my_callback(session_id: str | None, platform: str, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `session_id` | `str` または `None` | 出ていくセッション ID。動いているセッションが無かった場合は `None` になることがあります。 |
| `platform` | `str` | `"cli"`、またはメッセージングのプラットフォーム名（`"telegram"`、`"discord"` など）。 |

**発火箇所:** CLI / TUI の後片付けと、ゲートウェイのリセットや停止の経路です。ゲートウェイの停止では、対応する `on_session_reset` を伴わずに確定することがあります。

**戻り値:** 無視されます。

**使いどころ:** セッション ID が捨てられる前に最終的な指標を保存する、セッションごとの資源を閉じる、最後のテレメトリーを送る、溜まった書き込みを流し切る。

---

### `on_session_reset` {#onsessionreset}

CLI や TUI のセッションの切れ目、あるいはゲートウェイが動いているチャットに**新しいセッションキーを差し替えた**ときに発火します。これにより、次の `on_session_start` を待たずに、会話の状態が消えたことへプラグインが反応できます。

**コールバックの形:**

```python
def my_callback(session_id: str, platform: str, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `session_id` | `str` | 新しいセッションの ID（すでに新しい値へ切り替わっています）。 |
| `platform` | `str` | `"cli"`、`"tui"`、またはメッセージングのプラットフォーム名。 |
| `reason` | `str`、任意 | CLI とゲートウェイのリセット経路で渡されます。 |
| `old_session_id` | `str`、任意 | ゲートウェイ専用。出ていくセッション ID。 |
| `new_session_id` | `str`、任意 | ゲートウェイ専用。入れ替わりのセッション ID。 |

**発火箇所:** CLI は `session_id`、`platform`、`reason` を渡します。TUI は `session_id` と `platform` を渡します。ゲートウェイは、入れ替わりのキーを確保したあとに `reason`、`old_session_id`、`new_session_id` を足します。ゲートウェイのリセットでの順序は、入れ替わりの作成と保存 → `on_session_finalize(old_id)` → `on_session_reset(new_id)` → 最初の受信時に `on_session_start(new_id)` です。

**戻り値:** 無視されます。

**使いどころ:** `session_id` をキーにしたセッション単位のキャッシュの初期化、「セッションが切り替わった」という分析イベントの送出、新しい状態の置き場の用意。

---

ツールのスキーマ、ハンドラー、進んだフックの使い方まで含めた通しの説明は **[プラグインを作るガイド](/hermes/docs/developer-guide/plugins/)** を見てください。

---

### `agent_loop_stopped` {#agentloopstopped}

ゲートウェイが**動いているエージェントのやり取りに割り込んだ**ときに発火します。ループの作業中に利用者が `/stop` を実行した場合や、`/new` の中の「動いているエージェント」用の近道が、セッションを入れ替える前に進行中の実行を片付けた場合です。`on_session_finalize` と違って、やり取りの最中というより早い段階で発火するので、エージェントのループがもう使わないやり取り単位の外部資源（ツールの結果を待っていた送信 RPC など）をプラグインが手放せます。

割り込みが起きる 2 つの面で発火します。メッセージングの**ゲートウェイ**（`/stop`、`/new` の近道）と、**TUI / デスクトップ**の `session.interrupt` の経路（プラットフォームは `"tui"` として報告されます）です。素の CLI では発火しません。そこには相当する割り込みの面がないためです。

**コールバックの形:**

```python
def my_callback(session_key: str, platform: str, reason: str, invalidation_reason: str, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `session_key` | `str` | 実行に割り込まれたセッション。 |
| `platform` | `str` | メッセージングのプラットフォーム名（`"telegram"`、`"discord"` など）。不明なら空文字列。 |
| `reason` | `str` | エージェントに割り込んだ理由（例: `"user_stop"`、リセット / 新規の理由）。 |
| `invalidation_reason` | `str` | 溜まっていたセッション状態を無効にした理由（例: `"stop_command"`、`"stop_command_thread_sibling"`、`"stop_command_chat_scope"`、`"reset_command"`）。 |

**発火箇所:** `gateway/run_agent_cache.py::_interrupt_and_clear_session` で、`request_hard_interrupt()` が動いているエージェントに割り込んだ直後です。実際にエージェントが動いていた場合にかぎります。まだエージェントのループが始まっていない保留中の `/stop` の経路では、手放すべき進行中の作業が無いためこのフックは発火**しません**。遅い方の `/new` リセット経路では、かわりに `_handle_reset_command` の中であとから `on_session_finalize` が発火します。

**戻り値:** 無視されます。

**使いどころ:** ループがもう使わないツールの結果を待って止まっている外部リクエストを取り消す、音声 / リアルタイムの接続先へツール呼び出しが打ち切られたことを知らせる、やり取りのあいだだけ握っていた資格情報やロックを手放す。

---

### `subagent_start` {#subagentstart}

`delegate_task` が子の `AIAgent` を組み立てたあと、その子が走る前に、**子エージェント 1 つにつき 1 回**発火します。委任が 1 件でも 3 件まとめてでも、子ごとに 1 回発火します。

このフックは委任・サブエージェントのライフサイクルに限ったものです。ゲートウェイ・CLI・cron・バッチ・MoA など、実行元から始まるあらゆるエージェント実行に共通する「エージェント呼び出しの前」のゲートではありません。

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
| `parent_turn_id` | `str` | 委任を要求した親エージェントのやり取りの ID（取得できる場合）。 |
| `parent_subagent_id` | `str \| None` | この子が別のサブエージェントから起こされた場合の、親サブエージェントの ID。最上位の親エージェントでは `None`。 |
| `child_session_id` | `str \| None` | 子エージェントに割り当てられたセッション ID。 |
| `child_subagent_id` | `str` | 委任の観測と制御で使われる、安定したサブエージェント ID。 |
| `child_role` | `str` | 委任のポリシー適用後に確定した子の役割。たとえば `"leaf"` や `"orchestrator"`。 |
| `child_goal` | `str` | 子エージェントが実行する、委任された目標 / プロンプト。 |

**発火箇所:** `tools/delegate_tool.py` の `_build_child_agent()` の中、子の `AIAgent` が組み立てられてサブエージェントの識別情報が付いたあと、`_run_single_child()` が子を走らせる前です。

**戻り値:** 無視されます。これは観測専用のフックで、値を返しても子エージェントの実行を止めたり変えたりはできません。

**使いどころ:** サブエージェントの生成の記録、親子のセッション関係の対応付け、入れ子になった委任の木の把握、実行前の監査記録の送出、子ごとの観測用の資源の先取り。

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
`subagent_start` は委任の様子を見るのに役立ちますが、遮断のためのポリシーのフックではありません。子が組み立てられる前に委任を止めたいときは、[`pre_tool_call`](#pre_tool_call) で `delegate_task` のツール呼び出しを遮断してください。
:::

---

### `subagent_stop` {#subagentstop}

`delegate_task` が終わったあと、**子エージェント 1 つにつき 1 回**発火します。委任が 1 件でも 3 件まとめてでも、子ごとに 1 回発火します。振り分けは子の future が出そろったあとに親スレッドで直列に行われ、Python のコールバック本体もその同じ呼び出しスレッドで走ります（時間制限用のワーカーではありません）。

**コールバックの形:**

```python
def my_callback(parent_session_id: str, child_role: str | None,
                child_summary: str | None, child_status: str,
                tool_call_history: list[dict], duration_ms: int, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `parent_session_id` | `str` | 委任した親エージェントのセッション ID |
| `child_role` | `str \| None` | 子に付けられた統括役のタグ（機能が有効でなければ `None`） |
| `child_summary` | `str \| None` | 子が親へ返した最終的な応答 |
| `child_status` | `str` | `"completed"`、`"failed"`、`"interrupted"`、`"error"` のいずれか |
| `tool_call_history` | `list[dict]` | メタデータだけを順に並べたツール呼び出し: `tool_name`、上限付きの `tool_input`、`input_bytes`、`output_bytes`、`status`。生の入力と出力は含まれません |
| `duration_ms` | `int` | 子の実行にかかった実時間（ミリ秒） |

**発火箇所:** `tools/delegate_tool.py` で、`ThreadPoolExecutor.as_completed()` が子の future をすべて処理し終えたあとです。`invoke_hook("subagent_stop", ...)` は親スレッドへ渡されるので、書き手が子のプールの再入を気にせずに済み、コールバックもその呼び出しスレッドに留まります。

**戻り値:** 無視されます。

**使いどころ:** 統括の様子の記録、課金のための子の所要時間の積み上げ、委任後の監査記録の書き出し。

**例 — 統括の様子を記録する:**

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
委任が多い構成（統括役 × 5 つの子 × 入れ子の深さ、など）では、`subagent_stop` は 1 回のやり取りで何度も発火します。コールバックは短く保ち、重い処理はバックグラウンドのキューへ回してください。
:::

---

### `pre_gateway_dispatch` {#pregatewaydispatch}

ゲートウェイに届く `MessageEvent` **1 件につき 1 回**、内部イベントの選別のあと、認証・ペアリングとエージェントへの振り分けの**前**に発火します。ここは、どの単一のプラットフォームアダプターにもうまく収まらない、ゲートウェイの段でのメッセージの流れに関する方針（聞くだけの時間帯、人への引き継ぎ、チャットごとの振り分けなど）を差し込む地点です。

**コールバックの形:**

```python
def my_callback(event, gateway, session_store, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `event` | `MessageEvent` | 正規化された受信メッセージ（`.text`、`.source`、`.message_id`、`.internal` などを持ちます）。 |
| `gateway` | `GatewayRunner` | 動いているゲートウェイのランナー。プラグインは `gateway.adapters[platform].send(...)` を呼んで、別経路の返信（持ち主への通知など）ができます。 |
| `session_store` | `SessionStore` | `session_store.append_to_transcript(...)` で記録に静かに取り込むためのもの。 |

**発火箇所:** `gateway/run.py` の `GatewayRunner._handle_message()` の中、`is_internal` を求めた直後です。**内部イベントはフックを丸ごと素通りします**（システムが生成したもの — バックグラウンド処理の完了など — であり、利用者向けの方針でせき止めてはいけないからです）。

**戻り値:** `None` か辞書です。最初に認識された動作の辞書が勝ち、残りのプラグインの結果は無視されます。プラグインのコールバックでの例外は捕捉して記録され、エラー時ゲートウェイは必ず通常の振り分けへ落ちます。

| 戻り値 | 効果 |
|--------|------|
| `{"action": "skip", "reason": "..."}` | メッセージを捨てます。エージェントの返信も、ペアリングの流れも、認証もありません。プラグインがすでに処理した（記録へ静かに取り込んだ、など）ものとみなします。 |
| `{"action": "rewrite", "text": "new text"}` | `event.text` を差し替え、変更後のイベントで通常の振り分けを続けます。溜めておいた周辺のメッセージを 1 つのプロンプトへまとめるのに向きます。 |
| `{"action": "allow"}` / `None` | 通常の振り分け。認証 / ペアリング / エージェントループの流れを一通り走らせます。 |

**使いどころ:** 聞くだけのグループチャット（名指しされたときだけ応じ、周辺のメッセージはコンテキストとして溜める）、人への引き継ぎ（持ち主が手で対応しているあいだ、顧客のメッセージは静かに取り込むだけにする）、プロファイルごとの流量制限、方針にもとづく振り分け。

**例 — 許可していない DM を、ペアリングコードを出さずに黙って捨てる:**

```python
def deny_unauthorized_dms(event, **kwargs):
    src = event.source
    if src.chat_type == "dm" and not _is_approved_user(src.user_id):
        return {"action": "skip", "reason": "unauthorized-dm"}
    return None

def register(ctx):
    ctx.register_hook("pre_gateway_dispatch", deny_unauthorized_dms)
```

**例 — 名指しされた時点で、溜めておいた周辺メッセージを 1 つのプロンプトへ書き換える:**

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

対応しているプラットフォーム固有のイベントについて、ゲートウェイの通常のプロファイル単位の認可が通った**あと**にだけ発火します。コールバックが受け取るのは素の辞書です。生の SDK オブジェクト、アダプターのハンドル、ボットのクライアント、コールバックの文脈は、この安定した取り決めには一切含まれません。

最初に対応したのは Telegram のメッセージリアクションで、その後にメッセージの編集・削除とスレッドのライフサイクルのイベントが続きました。

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
| `platform` | `str` | 安定したプラットフォーム id（`"telegram"`、`"discord"`）。 |
| `event_type` | `str` | イベントごとの取り決めの id（後述の表を参照）。 |
| `payload` | `dict` | イベント種別ごとのフィールド。後述の種別ごとの説明を参照。 |

ペイロードはどれもイベント固有で、足していく形です。ゲートウェイ全体で 1 つのペイロード版があるわけではありません。id はすべて文字列で、欠けている / 取得できないフィールドは `None` になり、推測はしません。壊れたイベントや、送り元を認可できないイベントは捨てられます（閉じる側へ倒します）。Telegram の Application が一時的に作り直されたときは、中核のハンドラーと一緒に観測側も登録し直されます。

**イベント種別ごとのペイロードの取り決め（v1・足していく形）:**

| `event_type` | プラットフォーム | ペイロードのフィールド |
|--------------|-----------|----------------|
| `reaction` | telegram | `emojis: list[str]`、`custom_emoji_ids: list[str]`、`chat_id: str`、`message_id: str`、`thread_id: str \| None`（Telegram のリアクション更新はトピック id を運ばないので、現状は常に `None`）。 |
| `message_edited` | telegram, discord | `chat_id: str`、`message_id: str`、`thread_id: str \| None`、`text: str \| None`（編集後の本文またはキャプション。上限あり。メディアだけの編集やキャッシュに無い場合は `None`）、`edited_at: str \| None`（ISO 8601）。 |
| `message_deleted` | discord | `chat_id: str`、`message_id: str`、`thread_id: str \| None`、`author_id: str \| None`。Discord の削除イベントは誰が消したかを示さないので、認可の対象は消されたメッセージの投稿者になります。キャッシュに無い削除は発火しません。 |
| `thread_created` | discord | `thread_id: str`、`parent_chat_id: str \| None`、`name: str \| None`、`owner_id: str \| None`。 |
| `thread_renamed` | discord | `thread_id: str`、`parent_chat_id: str \| None`、`old_name: str \| None`、`new_name: str`。名前が実際に変わったときだけ発火します。それ以外のスレッドの更新（アーカイブ、低速モード、タグ）は捨てられます。Discord のスレッド更新イベントは実行者を運ばないので、認可の対象はスレッドの持ち主になります。 |

ボット自身が段階的にメッセージを編集していく動き（ストリーミング）が Discord で `message_edited` を発火させることはありません。ボットが起こしたイベントは発火の地点で捨てられます。

このフックは観測専用です。生のイベントやアダプターへの手がかりを与えることは**ありません**。**生の SDK ペイロードへのアクセスは意図して提供していません** — アダプターの SDK オブジェクトは予告なく形が変わり、育てられない API の面になってしまうためです。どうしても必要な場合は、「安定性を保証しない」という但し書き付きの専用の権限（`gateway.raw_events`）と、それ自体の設計が要ります（#64228 で追跡中）。プラットフォームに対して*何かをする*（リアクションを付ける、スレッドの名前を変える）には、[プラグインガイド](/hermes/docs/user-guide/features/plugins/#platform-actions)に書かれた、権限で守られた `ctx.platform_actions` の窓口を使ってください。これは既定では `gateway.platform_actions` の権限の裏で閉じられています。`PluginContext.dispatch_tool()` が呼べるのはツールのレジストリに登録されたツールだけで、`send_message` は意図してそこに登録されていません（その配送経路は、明示的な CLI・cron・かんばん・MCP の配送のために取ってあります）。将来の送信配送の取り決めには、まずすべてのアダプターで安定した配送内容とハンドルが必要です。この段階では、何もしない `gateway_message_delivered` フックを先回りして登録することはしません。

---

### `pre_approval_request` {#preapprovalrequest}

承認の判断が求められる前に発火します。対象は、問い合わせを出す面（対話型の CLI、Ink の TUI、ゲートウェイの各プラットフォーム、ACP のクライアント）と、人に聞かずに下される `approvals.mode=smart` の判断（`surface="smart"`）です。スマートモードでは、補助の LLM を呼ぶ前にフックが走ります。

独自の通知役を差し込むならここです。たとえば許可 / 拒否の通知を出す macOS のメニューバーアプリや、承認の要求を文脈ごと残す監査ログなどです。

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
| `command` | `str` | 判定にかけられているターミナルのコマンド、または `execute_code` のスクリプト。スマートとゲートウェイのペイロードは、観測側へ渡す前に伏せ字処理されます。スマート観測向けの伏せ字処理は `security.redact_secrets` が無効でも必須で、伏せ字処理に失敗した場合スマートのフックは読み飛ばされます。 |
| `description` | `str` | そのコマンドが引っかかった理由を人が読める形で（複数のパターンに当たった場合はまとめられます） |
| `pattern_key` | `str` | 承認のきっかけになった主なパターンのキー（例: `"rm_rf"`、`"sudo"`） |
| `pattern_keys` | `list[str]` | 当たったパターンのキーすべて |
| `session_key` | `str` | セッションの識別子。チャットごとに通知を分けるのに便利です |
| `surface` | `str` | 対話型の CLI / TUI の問い合わせなら `"cli"`、非同期のプラットフォーム承認なら `"gateway"`、補助 LLM による自動の許可 / 拒否なら `"smart"` |

**戻り値:** 無視されます。ここのフックは観測専用で、承認を却下したり先回りして答えたりはできません。承認の仕組みに届く前にツールを止めたいときは [`pre_tool_call`](#pre_tool_call) を使ってください。

**使いどころ:** デスクトップ通知、プッシュ通知、監査ログ、Slack の Webhook、エスカレーションの振り分け、指標の収集。

**例 — macOS のデスクトップ通知:**

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

問い合わせ型やスマートな承認の判断が下されたあと、問い合わせが時間切れになったり取り下げられたり（回答の前にやり取りが中断・終了した）したあと、あるいはゲートウェイが承認の通知を届けられなかったときに発火します。通知の失敗では、承認の判断が存在する前に `choice="notify_failed"` が送られます。

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

`pre_approval_request` と同じキーワード引数に加えて、次が付きます。

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `choice` | `str` | 問い合わせ型の面では `"once"`、`"session"`、`"always"`、`"deny"`、`"timeout"`、`"cancelled"`（誰も答えなかった場合 — やり取りが中断・終了して問い合わせが取り下げられたか、CLI では承認のコールバックが失敗した・prompt_toolkit の下でコールバックが登録されていなかった・読み取りが中断されたために利用者まで届かなかった。コマンドは実行されていません）、`"notify_failed"`。スマートな判断では `"smart_approve"` または `"smart_deny"` |
| `decided_by` | `str` | スマートな判断では `"aux_llm"`。問い合わせ型の面では付きません |

**戻り値:** 無視されます。

**使いどころ:** 対応するデスクトップ通知を閉じる、最終的な判断を監査ログに残す、指標を更新する、流量制限のカウンターを進める。

```python
def log_decision(command, choice, session_key, **kwargs):
    logger.info("approval %s: %s for session %s", choice, command[:60], session_key)

def register(ctx):
    ctx.register_hook("post_approval_response", log_decision)
```

---

### `on_room_member_activity` {#onroommemberactivity}

ホストされた[グループチャット](/hermes/docs/user-guide/bot-mode/#groups-and-group-chats)のメンバーのやり取りが走っているあいだ発火します。メンバーは、どのクライアントもつながっていない隠れた `Group: <room>` セッションで動くので、部屋の記録の `turn.started` から `turn.settled` までのあいだ、そのやり取りは中が見えません。このフックは、そのセッションがすでに出している実行時のイベント — ツールの開始 / 完了、承認の要求、流れてくるテキストと推論、エラー — に部屋の座標を刻んで外へ出します。おかげでクライアント（Hermes Crew、ダッシュボード、監査ログ）は、文面から推し量ることなくツールのカード・承認の問い合わせ・メンバーの状況をそのまま描けます。実行・スケジューリング・保存される記録はグループチャットの実行環境が持ち続け、プラグインは見るだけです。

**コールバックの形:**

```python
def my_callback(
    room_id: str,
    thread_id: str,
    member_id: str,
    turn_id: str,
    task_id: str,
    execution_generation: int,
    kind: str,
    seq: int | None,
    payload: dict,
    **kwargs,
):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `room_id`、`thread_id`、`turn_id`、`task_id` | `str` | 部屋の記録の `turn.*` や `message.member` のイベントが運ぶのと同じ座標です。これで突き合わせます。 |
| `member_id` | `str` | 席に着いているメンバー（`groups.state` の `members[].member_id`）。 |
| `execution_generation` | `int` | 同じタスクを再試行するたびに増えます。差し替えられた試行のイベントは古い値を持ちます。 |
| `kind` | `str` | `tool.started`、`tool.completed`、`tool.output_risk`、`request.opened`（承認）、`message.delta`、`message.interim`、`reasoning.delta`、`turn.error`。種類は足していく形です。 |
| `seq` | `int \| None` | そのメンバーのセッションの、プロセス単位のイベント通し番号（`session.events.since` と同じ採番）。1 つのゲートウェイプロセスの中では単調に増え、再起動で振り出しに戻ります。 |
| `payload` | `dict` | 下地となるセッションイベントの、クライアントへ出して安全な本体（`tool_id`、`name`、`args`、`result`、`request_id`、`choices`、`text` など）。承認のコマンドは資格情報がすでに伏せ字処理されています。 |

**配送:** 登録されたコールバックはそれぞれ専用の上限付きキューとワーカースレッドを持ちます（`on_stream_*` と同じ仕組み）。遅いコールバックは自分の最も古い保留イベントを落とすだけで、メンバーのやり取りを遅らせることはありません。部屋の記録には何も書かれません。差分は保存されず、再生もされないので、残しておきたいクライアントは受け取ったものを自分で保存します。対象は同じ機械のメンバーだけです。別の機械から席に着いたメンバーはその機械のゲートウェイで動き、そちらのプラグインから見えます。

**戻り値:** 無視されます。

```python
def on_member_activity(room_id, member_id, turn_id, kind, payload, **kwargs):
    if kind == "request.opened":
        notify(f"{member_id} in {room_id} needs approval: {payload['command']}")

def register(ctx):
    ctx.register_hook("on_room_member_activity", on_member_activity)
```

---

### `pre_transcription` {#pretranscription}

音声認識のディスパッチャー（`tools.transcription_tools.transcribe_audio`）の中で、プロバイダーが決まった**あと**、どのバックエンド（組み込み、`type: command` のプロバイダー、プラグインが登録したプロバイダー）も呼ばれる**前**に発火します。書き起こしを後から眺めるだけでなく、書き起こしの要求そのものをプラグインから操れるようにするものです。

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
| `provider` | `str` | 解決された音声認識のプロバイダー（`local`、`groq`、`openai`、`mistral`、`xai`、`elevenlabs`、`deepinfra`、`local_command`、コマンド型プロバイダーの名前、プラグインのプロバイダーの名前）。 |
| `model` | `str \| None` | そこまでに決まったモデル。バックエンドの既定に任せる場合は `None`。 |
| `language` | `str \| None` | プロバイダーの設定節で指定された言語。無ければ `None`。 |
| `prompt` | `str \| None` | 固定値の [`stt.prompt`](/hermes/docs/user-guide/configuration/#transcription-prompt-vocabulary-hints) の値。無ければ `None`。 |
| `source` | `str \| None` | 呼び出し元の面を表すラベル（`gateway`、`voice_mode` など）。観測のためだけで、振り分けには使いません。 |

**戻り値:** `"prompt"`、`"language"`、`"model"` のいずれかを文字列に対応づけた `dict`、または要求をそのままにする `None`。文字列でない値、知らないキー、`file_path` は無視されます（`file_path` を変えようとすると警告として記録されます）。結果は `stt.prompt` の設定値の上に、**登録順で、フィールドごとに最後の書き手が勝つ**形で適用されます。`prompt` に `""` を返すと、その要求について設定済みのプロンプトを消せます。

**使いどころ:** 音声をアップロードする前に、利用者ごと・チャットごとの用語集を差し込む、呼び出し元のロケールから `language` を決め打ちする、長い録音ではより軽い `model` に落とす、雑音の多い音源を別のモデルへ回す。

```python
VOCAB = "Hermes, Teknium, Nous Research, kanban"

def add_vocab(provider, prompt, source, **kwargs):
    if source != "gateway":
        return None
    return {"prompt": f"{prompt}. {VOCAB}" if prompt else VOCAB}

def register(ctx):
    ctx.register_hook("pre_transcription", add_vocab)
```

どのバックエンドもプロンプトを受け付けるわけではありません。`local` は faster-whisper の `initial_prompt` に対応づけます。`openai`、`groq`、`mistral`、`deepinfra` は `prompt` として送ります。`xai`、`elevenlabs`、`local_command`、`type: command` のプロバイダーは DEBUG に記録したうえで、プロンプト無しで書き起こします。対応表の全体とプライバシーの境界は[プロバイダー対応表](/hermes/docs/user-guide/configuration/#transcription-prompt-vocabulary-hints)を見てください。フックの配管まわりのエラーは開く側へ倒し、要求は変更されないまま処理が続きます。

---

### `transform_tool_result` {#transformtoolresult}

ツールが結果を返した**あと**、その結果が会話へ追記される**前**に発火します。ターミナルの出力にかぎらず、あらゆるツールの結果の文字列を、モデルが見る前にプラグインから書き換えられます。

**コールバックの形:**

```python
def my_callback(tool_name: str, args: dict, result: str, task_id: str, **kwargs) -> str | None:
```

ペイロード全体には `session_id`、`tool_call_id`、`turn_id`、`api_request_id`、`duration_ms`、`status`、`error_type`、`error_message` も含まれます。`result` はツールの振り分けが返した最終的な結果で、これと `args` には任意の利用者 / ツールの内容や秘密情報が含まれることがあります。

**戻り値:** 最初の `str` が結果を置き換えます（空文字列も含みます）。`None` ならそのままです。

**使いどころ:** `web_extract` の出力から組織固有の個人情報を伏せる、長い JSON のツール応答を要約の見出しで包む、`read_file` の結果に検索で補った手がかりを差し込む、`delegate_task` のサブエージェントの報告をプロジェクト固有の形へ書き直す。

```python

SECRET = re.compile(r"sk-[A-Za-z0-9]{32,}")

def redact_secrets(tool_name, result, **kwargs):
    if SECRET.search(result):
        return SECRET.sub("[REDACTED]", result)
    return None

def register(ctx):
    ctx.register_hook("transform_tool_result", redact_secrets)
```

すべてのツールに効きます。ターミナルだけを書き換えたいときは、下の `transform_terminal_output` を見てください。対象が狭く、`transform_tool_result` より前に走り、置き換えた内容にもターミナルツールの最終的な出力上限がかかります。

---

### `transform_terminal_output` {#transformterminaloutput}

`terminal` ツールの中で、前景プロセスの出力を実行環境の上限まで取り込んだあと、最終的な出力の制限をかける前に発火します。取り込んだ標準出力 / 標準エラーをプラグインから差し替えられますが、差し替えた内容にも最終的な出力の制限はかかります。

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
| `output` | `str` | 上限付きで取り込んだ標準出力と標準エラーを合わせたもの。 |
| `returncode` | `int` | プロセスの終了コード。 |
| `task_id` | `str` | 実際のタスクの識別子。無ければ空文字列。 |
| `env_type` | `str` | 実行環境の種別。 |

**戻り値:** 最初の `str` が出力を置き換えます。`None` ならそのままです。コマンドと出力には資格情報などの機微な情報が含まれることがあります。

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

`transform_tool_result` と対になります。そちらは `terminal` を含むすべてのツールについて、あとから走ります。

---

### `transform_llm_output` {#transformllmoutput}

ツール呼び出しのループが終わってモデルが最終応答を作ったあと、その応答が利用者（CLI、ゲートウェイ、プログラムからの呼び出し元）へ届く**前**に、**やり取り 1 回につき 1 回**発火します。アシスタントの最終的な文面を、ふつうのプログラムの手法で書き換えられます。人格づけの文章やスキル任せの変換に、余分な推論トークンを使わずに済みます。

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
| `response_text` | `str` | その回のアシスタントの最終的な応答テキスト。 |
| `session_id` | `str` | この会話のセッション ID（1 回きりの実行では空のことがあります）。 |
| `model` | `str` | 応答を作ったモデル名（例: `anthropic/claude-sonnet-4.6`）。 |
| `platform` | `str` | 配信先のプラットフォーム（`cli`、`telegram`、`discord` など。未設定なら空）。 |

**戻り値:** 空でない `str` で応答テキストを置き換え、`None` か空文字列ならそのままにします。複数のプラグインが登録されている場合は**最初の空でない文字列が勝ちます**。ツールやターミナルの変換と違い、空文字列は置き換えとして受け付けません。

**使いどころ:** 人格や語彙の変換をかける（海賊風、スポンジ・ボブ風）、最終的な文面から利用者固有の識別子を伏せる、プロジェクト固有の署名を末尾に足す、人格の指示にトークンを使わずに文体の決まりを守らせる。

CLI のストリーミングが有効なとき、末尾に足すだけの変換は、流れ終えた本文のあとに出力されます。応答を置き換える変換は、流れ終えた本文のあとに全文が出力され、ストリーム後の変換であることが明示されるので、置き換えの内容が黙って消えることはありません。

```python

def spongebob(response_text, **kwargs):
    if os.environ.get("SPONGEBOB_MODE") != "on":
        return None  # pass through unchanged
    return re.sub(r"!", "!! Tartar sauce!", response_text)

def register(ctx):
    ctx.register_hook("transform_llm_output", spongebob)
```

このフックは、空でなく中断もされていない応答にかぎって発火するよう守られています。停止ボタンでの中断や空のやり取りでは発火しません。例外は警告として記録され、エージェントの実行を壊すことはありません。

### API リクエストの観測フック {#api-request-observer-hooks}

#### `pre_api_request` {#preapirequest}

プロバイダーへの試行ごとに、送信の直前に発火します。観測専用です。古くからある `user_message`、`conversation_history`、`request_messages` は互換のために意図して生のままです。これから使う側は、伏せ字処理済みの `request` を選んでください。

#### `post_api_request` {#postapirequest}

プロバイダーの応答が正常に正規化されたあとに発火します。観測専用です。伏せ字処理済みの `response` を使ってください。`assistant_message` は正規化しただけの生のメッセージで、`usage` は集計用のデータです。

#### `api_request_error` {#apirequesterror}

プロバイダーへの試行が失敗したときに、ステータスと再試行の時間、`error` オブジェクト、伏せ字処理済みの `request` とともに発火します。観測専用です。エラーメッセージにはプロバイダーや利用者のデータが残っていることがあります。

### `on_skill_lifecycle` {#onskilllifecycle}

スキル利用の状態が正式に変わったあとに発火します。観測専用で、手元の `skill_name`、出どころ、相関用の ID、利用回数、再利用のフラグが見えます。

### かんばんのライフサイクル観測 {#kanban-lifecycle-observers}

#### `kanban_task_claimed` {#kanbantaskclaimed}

ディスパッチャープロセスで受け持ちが確定したあと、ワーカーを起こす直前に発火します。

#### `kanban_task_completed` {#kanbantaskcompleted}

完了と後片付けのあと、通常はワーカープロセスで発火します。`summary` にはプロジェクトや利用者の内容が含まれることがあります。

#### `kanban_task_blocked` {#kanbantaskblocked}

通常の停滞への遷移のあとに発火します。依存待ちの経路では、その書き込みトランザクションを抜ける前に呼ばれます。`reason` にはプロジェクトや利用者の内容が含まれることがあります。

かんばんのこの 3 つはいずれも観測専用で、`task_id`、`profile_name`、`board`、`assignee`、`run_id` を運びます。完了には `summary` が、停滞には `reason` が加わります。

### かんばんのワーカーのライフサイクル・タスク変更・振り分けの観測 {#kanban-worker-lifecycle-task-mutation-and-dispatch-observers}

さらに 5 つの観測（RFC #58548）がかんばんの仲間を広げます。いずれも観測専用で、対象のトランザクションが確定したあとに発火し、`has_hook` で早く打ち切られます。購読者がいなければ振り分けの動きは変わりません。タスク単位のフックは、上のフックと同じ共通フィールドを運びます。

- **`on_kanban_worker_spawned`** — `spawn_fn` が戻り、ワーカーの PID が保存されたあと。`worker_pid`（`None` のことがあります）と `workspace_path` が加わります。振り分けのロックの中で走るので、コールバックは短く保ってください。
- **`on_kanban_worker_exited`** — 定期処理から派生し、`detect_crashed_workers` が消えた PID のタスクを回収したとき。`worker_pid`、`exit_kind`、`exit_code`、`outcome`、`retry_status` が加わります。
- **`on_kanban_worker_stale_claim`** — 有効期限の切れた受け持ちが回収されたとき。PID が生きていて期限が延びた場合は発火しません。`worker_pid`、`heartbeat_stale`、`retry_status` が加わります。
- **`on_kanban_task_updated`** — 受け持ち / 完了 / 停滞のライフサイクルの外でタスクのフィールドへの書き込みが確定したあと（`assign_task`、モデルや推論の上書き、ダッシュボードの編集）。`changed_fields` が加わります。中身はフィールド名だけで、値は含みません。
- **`on_kanban_dispatch_tick`** — ディスパッチャーの定期処理ごとに 1 回、振り分けのロックが外れた直後。何もしなかった回やロックが競合した回も含みます。ペイロードは `board`、`profile_name`、`dry_run`、`outcome`、`result` です。

---

## シェルフック {#shell-hooks}

プロファイルの `config.yaml` にシェルスクリプトのフックを宣言しておくと、対応するプラグインフックのイベントが起きるたびに、Hermes がそれを子プロセスとして実行します。CLI、ゲートウェイ、デスクトップ、TUI、ダッシュボードのチャットのいずれでも動き、Python のプラグインを書く必要はありません。

デスクトップ、TUI、ダッシュボードのチャットは、エージェントを組み立てるときに、そのセッションのプロファイル設定と同意の許可リストを使ってフックを登録します。プロファイルを切り替えたときに、別のプロファイルのフックが使い回されることはありません。既存のフックの同意の要件とセーフモードの振る舞いはそのまま効きます。承認されていないフックは、黙って承認されるのではなく読み飛ばされます。

置くだけの単一ファイルのスクリプト（Bash、Python、シバンのあるものなら何でも）で次のことをしたいときにシェルフックを使います。

- **ツール呼び出しを止める / 変える** — 危険な `terminal` のコマンドを拒否する、ディレクトリごとの方針を守らせる、壊す方向の `write_file` / `patch` に承認を求める、ツールが走る前に引数を書き換える（パスの無害化、既定値の注入）。
- **ツール呼び出しのあとに動く** — エージェントがいま書いた Python や TypeScript のファイルを自動整形する、API 呼び出しを記録する、CI のワークフローを起こす。
- **次の LLM のやり取りにコンテキストを差し込む** — `git status` の出力、今日の曜日、取得した文書などを利用者のメッセージの前に足す（[`pre_llm_call`](#pre_llm_call) を参照）。
- **ライフサイクルのイベントを見る** — サブエージェントが終わったとき（`subagent_stop`）やセッションが始まったとき（`on_session_start`）にログを 1 行書く。

シェルフックは、CLI の起動時（`hermes_cli/main.py`）とゲートウェイの起動時（`gateway/run.py`）の両方で `agent.shell_hooks.register_from_config(cfg)` を呼んで登録されます。Python のプラグインフックとも自然に組み合わさります。どちらも同じディスパッチャーを通るためです。

### ひと目で見る比較 {#comparison-at-a-glance}

| 観点 | シェルフック | [プラグインフック](#plugin-hooks) | [ゲートウェイフック](#gateway-event-hooks) |
|-----------|-------------|-------------------------------|---------------------------------------|
| 宣言する場所 | `~/.hermes/config.yaml` の `hooks:` ブロック | `plugin.yaml` を持つプラグインの `register()` | `HOOK.yaml` + `handler.py` のディレクトリ |
| 置き場所 | `~/.hermes/agent-hooks/`（慣例） | `~/.hermes/plugins/<name>/` | `~/.hermes/hooks/<name>/` |
| 言語 | 何でも（Bash、Python、Go のバイナリ …） | Python のみ | Python のみ |
| 動く場所 | CLI + ゲートウェイ | CLI + ゲートウェイ | ゲートウェイのみ |
| イベント | `VALID_HOOKS`（`subagent_stop` を含む） | `VALID_HOOKS` | ゲートウェイのライフサイクル（`gateway:startup`、`agent:*`、`command:*`） |
| ツール呼び出しを止められるか | はい（`pre_tool_call`） | はい（`pre_tool_call`） | いいえ |
| LLM のコンテキストを差し込めるか | はい（`pre_llm_call`） | はい（`pre_llm_call`） | いいえ |
| 同意 | `(event, command)` の組ごとに初回の問い合わせ | 暗黙（Python プラグインへの信頼） | 暗黙（ディレクトリへの信頼） |
| プロセスの分離 | あり（子プロセス） | なし（同一プロセス） | なし（同一プロセス） |

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

イベント名は[プラグインフックのイベント](#plugin-hooks)のいずれかである必要があります。打ち間違いは「Did you mean X?」の警告が出て読み飛ばされます。1 つの項目の中の知らないキーは無視され、`command` が無い項目は警告のうえ読み飛ばされます。`timeout > 300` は警告とともに上限へ丸められます。`pre_tool_call` 以外のイベントに `fail_closed: true` を書くと警告が出て無視されます（閉じる側へ倒せるのは、遮断できるイベントだけです）。

### JSON のやり取りの形 {#json-wire-protocol}

イベントが起きるたびに、Hermes は一致するフックごとに子プロセスを起こし（matcher が許す範囲で）、**標準入力**へ JSON のペイロードを流し込み、**標準出力**を JSON として読み取ります。

**標準入力 — スクリプトが受け取るペイロード:**

```json
{
  "hook_event_name": "pre_tool_call",
  "tool_name":       "terminal",
  "tool_input":      {"command": "rm -rf /"},
  "session_id":      "sess_abc123",
  "cwd":             "/home/user/project",
  "profile":         "default",
  "extra":           {"task_id": "...", "tool_call_id": "..."}
}
```

`profile` は、そのフックを起こした Hermes のプロファイル名です（プロファイルの外では `"default"`）。おかげで 1 本の
スクリプトを、多重化したゲートウェイの背後にあるすべてのプロファイルで使い回せます。子プロセスはそのプロファイルの
`HERMES_HOME` で動きます。ツール以外のイベント（`pre_llm_call`、`subagent_stop`、セッションのライフサイクル）では `tool_name` と `tool_input` は `null` です。`extra` の辞書は、イベント固有のキーワード引数（`user_message`、`conversation_history`、`child_role`、`duration_ms` …）をすべて運びます。直列化できない値は、省かれるのではなく文字列にされます。

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

壊れた JSON、0 以外の終了コード、時間切れはいずれも警告を記録するだけで、エージェントのループを止めることはありません。

### 終了コード 2 は遮断（Claude Code / Cursor 互換） {#exit-code-2-block-claude-code-cursor-compatible}

`pre_tool_call` のフックが終了コード **2** で終わると、標準出力に遮断の JSON が無くてもツール呼び出しを止めます。遮断のメッセージは次の優先順で決まります。

1. 標準出力の遮断 JSON（`reason` / `message`）があればそれ。
2. 標準エラーの先頭 400 文字。
3. 汎用の既定文言 `"Blocked by shell hook."`。

つまり、いちばん単純な遮断フックはこうなります。

```bash
#!/usr/bin/env bash
echo "policy violation: rm -rf is not permitted" >&2
exit 2
```

遮断の指示が効かないイベント（`pre_tool_call` 以外のすべて）では、終了コード 2 も他の 0 以外の終了と同じ扱いです。警告が記録され、標準出力は引き続き解析されます。

### 開く側に倒すか、閉じる側に倒すか {#fail-open-vs-fail-closed}

既定では、シェルフックは**開く側へ倒します**。起動の失敗、時間切れ、解析できない標準出力はいずれも警告を記録するだけで、処理はそのまま進みます。観測のためのフックにはこれが正しい既定ですが、セキュリティのゲートには向きません。落ちた秘密情報スキャナーが、本来は点検すべきだったツール呼び出しを黙って通してしまってはいけません。

`pre_tool_call` の項目に `fail_closed: true`（Cursor / Claude Code の綴りである `failClosed: true` でも可）を書くと、この向きが逆になります。

```yaml
hooks:
  pre_tool_call:
    - matcher: "terminal|write_file|patch"
      command: "~/.hermes/agent-hooks/secret-scan.sh"
      timeout: 10
      fail_closed: true
```

`fail_closed: true` を付けると、次のそれぞれが `hook <command> failed closed: <reason>` とともにツール呼び出しを**遮断する**ようになります。

| 失敗 | 開く側（既定） | `fail_closed: true` |
|---------|--------------------|--------------------|
| コマンドが見つからない / 実行できない | 警告して続行 | **遮断** |
| 時間切れ | 警告して続行 | **遮断** |
| JSON でない標準出力（スタックトレースなど） | 警告して続行 | **遮断** |
| 正常終了で、妥当な何もしない JSON（`{}`） | 続行 | 続行 |

`fail_closed` が効くのは遮断できるイベント（今のところ `pre_tool_call`）だけです。それ以外のイベントに付けると、設定の読み込み時に警告が出て無視されます。`hermes hooks test` もこの意味づけに従い、`parsed` の行にはディスパッチャーが受け取るはずの遮断の形がそのまま出ます。

### 実例 {#worked-examples}

#### 1. 書き込みのたびに Python のファイルを自動整形する {#1-auto-format-python-files-after-every-write}

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

エージェントが頭の中に持っているファイルの内容が自動で読み直されるわけでは**ありません**。整形が効くのはディスク上のファイルだけです。次に `read_file` を呼んだときに整形後の内容を読み取ります。

#### 2. 壊す方向の `terminal` コマンドを止める {#2-block-destructive-terminal-commands}

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

#### 3. 毎回のやり取りに `git status` を差し込む（Claude Code の `UserPromptSubmit` に相当） {#3-inject-git-status-into-every-turn-claude-code-userpromptsubmit-equivalent}

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

Claude Code の `UserPromptSubmit` イベントを Hermes の別イベントとして用意していないのは意図してのことです。`pre_llm_call` が同じ地点で発火し、コンテキストの注入にもすでに対応しています。ここではそちらを使ってください。

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

`(event, command)` の組は、Hermes が初めて見たときに利用者へ承認を求め、その判断を `~/.hermes/shell-hooks-allowlist.json` に保存します。次回以降（CLI でもゲートウェイでも）は問い合わせを飛ばします。

対話的な問い合わせを回避する抜け道は 3 つあり、どれか 1 つで足ります。

1. CLI の `--accept-hooks` フラグ（例: `hermes --accept-hooks chat`）
2. 環境変数 `HERMES_ACCEPT_HOOKS=1`
3. `~/.hermes/config.yaml` の `hooks_auto_accept: true`

端末を持たない実行（ゲートウェイ、cron、CI）ではこの 3 つのどれかが要ります。無いと、新しく足したフックは黙って未登録のままになり、警告が記録されるだけです。

**スクリプトの書き換えは黙って信頼されます。** 許可リストのキーはコマンドの文字列そのもので、スクリプトのハッシュではないので、ディスク上のスクリプトを書き換えても同意は無効になりません。`hermes hooks doctor` が更新時刻のずれを教えてくれるので、書き換えに気づいて承認し直すかどうかを判断できます。

#### 手作業で許可リストに入れる {#manual-allowlisting}

手作業での許可リスト登録は、端末を持たない環境やサービスアカウントでの運用のように、初回の問い合わせに人が答えられない場合に役立ちます。許可リストのファイルは `~/.hermes/shell-hooks-allowlist.json` で、想定している形式は `approvals` の配列です。各承認はフックの `event` と、`command` の文字列そのものを記録します。

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

コマンドの文字列は、設定したフックのコマンドと完全に一致する必要があります。パスをキーにして `sha256` フィールドを持つオブジェクトは想定している形式ではなく、フックの承認にはなりません。手で書いた項目は `hermes hooks list` で確かめてください。

### `hermes hooks` コマンド {#the-hermes-hooks-cli}

| コマンド | 何をするか |
|---------|--------------|
| `hermes hooks list` | 設定済みのフックを、matcher・timeout・同意の状態とともに一覧にする |
| `hermes hooks test <event> [--for-tool X] [--payload-file F]` | 一致するフックをすべて、仮のペイロードで実行して、解析後の応答を表示する |
| `hermes hooks revoke <command>` | `<command>` に一致する許可リストの項目をすべて削除する（次回の再起動から有効） |
| `hermes hooks doctor` | 設定済みのフックそれぞれについて、実行ビット、許可リストの状態、更新時刻のずれ、JSON 出力の妥当性、おおよその実行時間を調べる |

### セキュリティ {#security}

シェルフックは**あなたの権限そのまま**で動きます。cron の項目やシェルのエイリアスと同じ信頼の境界です。`config.yaml` の `hooks:` ブロックは特権のある設定として扱ってください。

- 自分で書いたか、隅々まで目を通したスクリプトだけを指すこと。
- パスを追いやすいよう、スクリプトは `~/.hermes/agent-hooks/` の中に置くこと。
- 共有の設定を取り込んだあとは `hermes hooks doctor` を回し、登録される前に新しく増えたフックに気づくこと。
- config.yaml をチームでバージョン管理しているなら、`hooks:` の節を変える PR は CI の設定と同じ厳しさでレビューすること。

### 順序と優先関係 {#ordering-and-precedence}

Python のプラグインフックもシェルフックも、同じ `invoke_hook()` のディスパッチャーを通ります。先に登録されるのは Python のプラグイン（`discover_and_load()`）で、シェルフックはその次（`register_from_config()`）なので、同点の場合は Python の `pre_tool_call` の遮断判断が優先されます。最初の妥当な遮断が勝ちます。いずれかのコールバックが空でないメッセージを伴う `{"action": "block", "message": str}` を返した時点で、集約はそこで打ち切られます。

## 送信 Webhook {#outbound-webhooks}

送信 Webhook は、[受信 Webhook の仕組み](/hermes/docs/user-guide/messaging/webhooks/)を押し出し方向に映したものです。受信 Webhook は世の中が変わったときに Hermes を起こし、送信 Webhook は Hermes が何かをしたときに世の中へ伝えます。HTTP のエンドポイントと、そこが関心を持つライフサイクルのイベントを並べておけば、一致するイベントが起きるたびに Hermes が署名付きの JSON を各エンドポイントへ POST します。受け手が定期的に問い合わせる必要はありません。

よくある使い方:

- エージェントのやり取りが終わったときに CI やダッシュボードへ知らせる（`on_session_end`）
- 群れ全体のサブエージェントの完了を追う（`subagent_stop`）
- ツールの動きを外部の監視へ流す（`matcher` を付けた `post_tool_call`）
- *別の* Hermes を起こす。URL をその受信 Webhook に向けます

### 設定 {#configuration}

`~/.hermes/config.yaml` に `hooks.outbound:` のリストを足します。

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

プラグインフックの集合にあるイベントはどれでも指定できます（`pre_tool_call`、`post_tool_call`、`pre_llm_call`、`post_llm_call`、`on_session_start`、`on_session_end`、`subagent_start`、`subagent_stop` など）。形の崩れた項目は警告のうえ読み飛ばされます。壊れた Webhook がエージェントを落とすことはありません。変更は次の CLI セッション、またはゲートウェイの再起動から効きます。

秘密情報については、インラインの `secret:` に直書きするより `secret_env`（環境変数の名前。ふつうは `~/.hermes/.env` で設定します）を選んでください。設定ファイルに資格情報を残さずに済みます。秘密情報を持たない項目は署名なしで送られ、`hermes hooks list` では `UNSIGNED` と表示されます。

### 送信されるデータの形 {#wire-format}

発火のたびに、シェルフックの標準入力と同じ最上位の形に配送のメタデータを足した JSON の本文を POST します。`profile` はそのイベントを出した Hermes のプロファイル名なので（プロファイルの外では `"default"`）、多重化したゲートウェイの背後にいる受け手でもプロファイルを見分けられます。

```json
{
  "hook_event_name": "on_session_end",
  "profile": "default",
  "tool_name": null,
  "tool_input": null,
  "session_id": "sess_abc123",
  "cwd": "/home/user/project",
  "extra": {"completed": true, "interrupted": false, "model": "...", "platform": "cli"},
  "delivery_id": "3f2c9a...",
  "timestamp": "2026-07-22T14:00:00Z"
}
```

ヘッダー:

| ヘッダー | 値 |
|--------|-------|
| `Content-Type` | `application/json` |
| `X-Hermes-Event` | フックのイベント名 |
| `X-Hermes-Delivery` | 配送ごとに一意な id — 本文の `delivery_id` と同じ値 |
| `X-Hermes-Signature-256` | `sha256=<hex>` — 生の本文の HMAC-SHA256。GitHub と同じ流儀で、秘密情報を設定したときだけ付きます |

署名は GitHub の Webhook とまったく同じように検証します。

```python

def verify(body: bytes, header: str, secret: str) -> bool:
    expected = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, header)
```

`delivery_id` と `timestamp` は**署名された本文の中**にあるので、署名を検証する受け手は再送への備えも同時に手に入ります。

- **重複を弾く:** `delivery_id`（または対応する `X-Hermes-Delivery` ヘッダー）を使い、最近見た id を覚えておいて重複を飛ばします。Hermes は失敗した配送を 1 回だけ再送するので、同じ id が正当に 2 回届くことがあります。
- **古いイベントを拒む:** `timestamp` を自分の時計と比べ、許容幅（5 分が一般的な既定）の外なら拒みます。捕まえたリクエストを流し直す攻撃者も、秘密情報なしに新しい時刻を偽造することはできません。

### 配送の考え方 {#delivery-semantics}

- **投げっぱなしで、主要な処理の外を通ります。** イベントは即座に直列化されてキューへ入り、HTTP の POST は 1 本のバックグラウンドスレッドが行います。遅い / 死んでいるエンドポイントがツール呼び出しやエージェントのやり取りを止めることはありません。
- **知らせるだけです。** シェルフックと違い、送信 Webhook はツール呼び出しを止めたりコンテキストを差し込んだりできません。応答の本文は無視されます。見るだけで、舵は取りません。
- **再送には上限があります。** 接続エラーと 5xx の応答は間隔を空けて 1 回だけ再送します。4xx は再送しません（リクエスト自体が間違っていると受け手が言っているからです）。失敗は記録されて捨てられます。配送はできるかぎりの努力であって、保証ではありません。
- **リダイレクトは決して追いません。** 3xx の応答は設定の誤りとみなして記録します。リダイレクトされた POST を追うと、署名付きのペイロードが黙って落ちてしまうためです。`url` は最終的なエンドポイントに向けてください。
- **キューには上限があります。** キューが詰まった場合（死んだエンドポイント、イベントの嵐）、際限なくメモリを食うのではなく、新しいイベントを警告とともに捨てます。
- **同意の問い合わせはありません。** 送信先はあなたの機械でコードを実行しません。あなたが設定した URL でデータを受け取るだけです。`HERMES_SAFE_MODE=1` は、プラグインやシェルフックと同じく登録そのものを飛ばします。ただしペイロードにはツールの入力やイベントのメタデータが含まれるので、送信先は信頼できるエンドポイントだけにし、`https://` を選んでください。

`hermes hooks list` は、設定済みの送信先をシェルフックと並べて表示し、それぞれが署名付きかどうかも示します。
