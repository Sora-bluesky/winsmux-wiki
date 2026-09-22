---
title: "イベントフック"
description: "節目となるタイミングで独自のコードを走らせる — 活動の記録、通知の送信、Webhook への送信"
upstream_path: user-guide/features/hooks.md
upstream_blob: 59975d14edf93509da71e8f886c1d0f98bcef97c
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/hooks
---

# イベントフック {#event-hooks}

Hermes には、節目となるタイミングで独自のコードを走らせるフックの仕組みが 4 つあります。

| 仕組み | 登録のしかた | 動く場所 | 使いどころ |
|--------|---------------|---------|----------|
| **[ゲートウェイのフック](#gateway-event-hooks)** | `~/.hermes/hooks/` の `HOOK.yaml` + `handler.py` | ゲートウェイのみ | 記録、通知、Webhook |
| **[プラグインのフック](#plugin-hooks)** | [プラグイン](/hermes/docs/user-guide/features/plugins/) の中での `ctx.register_hook()` | CLI + ゲートウェイ | ツールの横取り、計測、防護 |
| **[シェルのフック](#shell-hooks)** | プロファイルの `config.yaml` の `hooks:` ブロックからシェルのスクリプトを指す | CLI + ゲートウェイ + デスクトップ / TUI / ダッシュボードのチャット | 置くだけで使えるスクリプトで、遮断、自動整形、文脈の差し込み |
| **[送信する Webhook](#outbound-webhooks)** | `~/.hermes/config.yaml` の `hooks.outbound:` の一覧 | CLI + ゲートウェイ | 署名付きのライフサイクルのイベントを外部の HTTP の窓口へ押し出す — CI、ダッシュボード、他のエージェント |

フックのコールバックのエラーは切り離されて記録され、エージェントを落とすことはありません。フックがすべて受け身なわけではありません。指示 / 制御のフックは流れを変えられますし、変換のフックは内容を置き換えられますし、シェルの `pre_tool_call` のフックは遮断や、閉じる側へ倒れることができます。

## ゲートウェイのイベントフック {#gateway-event-hooks}

ゲートウェイのフックは、ゲートウェイの動作中（Telegram、Discord、Slack、WhatsApp、Teams）に、主のエージェントの処理を止めずに自動で発火します。

### 信頼の考え方: ファイルを置くことが「使う」という意思表示 {#gateway-hook-trust}

フックのディレクトリは、**置いた時点で信頼される**拡張の入口です。`3988c3c245f`（2026 年 4 月）以来の文書化された約束で、そのとき下の比較の表が同意の形をはじめて「暗黙（ディレクトリへの信頼）」として記録しました。有効にする一覧はなく、`plugins.enabled` / `plugins.disabled` も適用されません。ゲートウェイのフックはプラグインではないからです。何が読み込まれるかは次のとおりです。

- **いつ:** ゲートウェイの起動時に 1 回（`gateway/run_startup.py` から呼ばれる `HookRegistry.discover_and_load()`）。[複数プロファイルのゲートウェイ](/hermes/docs/user-guide/multi-profile-gateways/) では、そのプロファイルで最初にイベントが発火したときに、そのプロファイル自身の `hooks/` が読み込まれます。CLI、TUI、デスクトップ、cron はゲートウェイのフックを読み込みません。
- **何が:** `<profile home>/hooks/`（既定のプロファイルなら `~/.hermes/hooks/`）の下の、空でない `events` の一覧を持つマッピングとして解釈できる `HOOK.yaml` **と** `handler.py` の両方があるサブディレクトリすべてです。どちらかが欠けているディレクトリは黙って飛ばされます。マニフェストが不正な場合や `events` が空の場合は、`[hooks] Skipping …` のログの行とともに飛ばされます。
- **どう:** `handler.py` はプロセスの中で読み込まれます。モジュールの本体は読み込み時に実行され、その `handle` 関数が宣言されたイベントに登録されます。ゲートウェイのプロセスとして、ゲートウェイ自身と同じ権限（読み込まれた資格情報、ツール、プラグインの状態）で動きます。サンドボックスも、初回の確認もありませんし、`HERMES_SAFE_MODE` でもこの読み込みは飛ばされません。

2 つのファイルをそのディレクトリに置くことが「使う」という意思表示**そのもの**であり、`HOOK.yaml` かそのディレクトリを消す（あるいは名前を変える）ことが「使わない」という意思表示です。あなたのプロファイルの home に書き込める人は、`config.yaml` のシェルのフックや `plugins.enabled` を通して、すでにあなたとしてコードを実行できます。つまりこのディレクトリは `~/.hermes/` の他の部分と同じ信頼の枠の中にあります。セキュリティのページの [置くことで信頼される拡張の入口](/hermes/docs/user-guide/security/#trusted-by-placement) を参照してください。プラグインを有効にする前に確かめるのと同じように、フックを置く前にその `handler.py` を読んでください。

### フックを作る {#creating-a-hook}

フックはそれぞれ `~/.hermes/hooks/` の下のディレクトリで、2 つのファイルを含みます。

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

`events` の一覧が、どのイベントであなたの処理が動くかを決めます。`command:*` のようなワイルドカードを含め、どんな組み合わせでも購読できます。

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

**処理の決まり:**
- 名前は `handle` である必要があります
- `event_type`（文字列）と `context`（辞書）を受け取ります
- `async def` でも通常の `def` でも、どちらでも動きます
- エラーは捕まえて記録されるので、エージェントが落ちることはありません

### 使えるイベント {#available-events}

| イベント | いつ発火するか | context のキー |
|-------|---------------|--------------|
| `gateway:startup` | ゲートウェイのプロセスが起動したとき | `platforms`（動いているプラットフォーム名の一覧） |
| `session:start` | 新しいメッセージングのセッションが作られたとき | `platform`、`user_id`、`session_id`、`session_key` |
| `session:end` | セッションが終わったとき（作り直しの前） | `platform`、`user_id`、`session_key` |
| `session:reset` | 利用者が `/new` か `/reset` を実行したとき | `platform`、`user_id`、`session_key` |
| `session:compress` | セッションの文脈の圧縮が終わったとき | `platform`、`session_id`、`old_session_id`（その場で圧縮した場合は空）、`in_place`（真偽値 — `true` = 同じ id で記録を圧縮、`false` = `old_session_id` から切り替え）、`compression_count` |
| `agent:start` | エージェントがメッセージの処理を始めたとき | `platform`、`user_id`、`chat_id`、`thread_id`（フォーラムのトピック / スレッドの根の id。スレッドでなければ空）、`chat_type`（`"dm"` \| `"group"` \| `"forum"`。不明なら空）、`session_id`、`message`（500 文字で切られます） |
| `agent:step` | ツールを呼ぶループの各回 | `platform`、`user_id`、`session_id`、`iteration`、`tool_names` |
| `agent:end` | エージェントが処理を終えたとき | `agent:start` と同じキーに加えて `response`（500 文字で切られます） |
| `reaction:added` | ボットから見えるメッセージに絵文字のリアクションが付いたとき（いまのところ Slack のアダプター）。`reactions:read` の権限と `reaction_added` のボットのイベントの購読が必要で、ボットがそのチャンネルのメンバーである必要があります。 | `platform`、`reaction`、`user_id`、`item_user_id`、`item_type`、`channel_id`、`message_ts`、`team_id`、`event_ts`、`raw_event` |
| `reaction:removed` | ボットから見えるメッセージから絵文字のリアクションが外されたとき。`reaction_removed` のボットのイベントの購読が必要です。 | `reaction:added` と同じ形 |
| `command:*` | スラッシュコマンドが実行されたとき | `platform`、`user_id`、`command`、`args` |

#### ワイルドカードの照合 {#wildcard-matching}

`command:*` に登録した処理は、どの `command:` のイベント（`command:model`、`command:reset` など）でも発火します。1 つの購読で、すべてのスラッシュコマンドを見張れます。

:::tip スレッドでの返信
同じ Telegram のフォーラムのトピックへ続きのメッセージを投稿する処理では、`chat_type == "forum"` で `thread_id` が空でないときに `message_thread_id=int(thread_id)` を付けてください。
:::

### 例 {#examples}

#### 長い作業を Telegram で知らせる {#telegram-alert-on-long-tasks}

エージェントの手順が 10 回を超えたら自分にメッセージを送ります。

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

#### コマンドの利用の記録 {#command-usage-logger}

どのスラッシュコマンドが使われたかを追います。

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

#### セッション開始の Webhook {#session-start-webhook}

新しいセッションのときに外部のサービスへ POST します。

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

### チュートリアル: BOOT.md — ゲートウェイの起動のたびに点検表を走らせる {#tutorial-bootmd-run-a-startup-checklist-on-every-gateway-boot}

利用者の間で広まっている使い方です。`~/.hermes/BOOT.md` に Markdown の点検表を置き、ゲートウェイが起動するたびにエージェントに 1 回それを実行させます。「起動のたびに、夜間の cron の失敗を調べて、何か落ちていたら Discord で知らせて」とか、「直近 24 時間の deploy.log をまとめて Slack の #ops に投稿して」といった用途に向いています。

このチュートリアルでは、それを自分で定義するフックとして作る方法を示します。Hermes は BOOT.md のフックを組み込みでは持っていません。欲しい振る舞いをちょうど自分で組み立てます。

#### 何を作るか {#what-were-building}

1. 起動時の指示を自然な言葉で書いた `~/.hermes/BOOT.md` のファイル。
2. `gateway:startup` で発火し、ゲートウェイで解決されたモデルと資格情報で 1 回きりのエージェントを起こして BOOT.md の指示を実行するゲートウェイのフック。
3. 報告することが何もないときにメッセージの送信を見送れるようにする `[SILENT]` の取り決め。

#### 手順 1: 点検表を書く {#step-1-write-your-checklist}

`~/.hermes/BOOT.md` を作ります。人の助手に指示を出すつもりで書いてください。

```markdown
# Startup Checklist

1. Run `hermes cron list` and check if any scheduled jobs failed overnight.
2. If any failed, summarize them for Discord #ops (the hook delivers your final response to its configured target).
3. Check if `/opt/app/deploy.log` has any ERROR lines from the last 24 hours. If yes, summarize them and include in the same report.
4. If nothing went wrong, reply with only `[SILENT]` so no message is sent.
```

エージェントはこれをプロンプトの一部として見るので、素の言葉で説明できることなら何でも通ります。ツールの呼び出し、シェルのコマンド、メッセージの送信、ファイルの要約などです。

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

要となるのは 2 行です。

- `_resolve_gateway_model()` が、ゲートウェイでいま設定されているモデルを読みます。
- `_resolve_runtime_agent_kwargs()` が、ふつうのゲートウェイのやり取りと同じやり方でプロバイダーの資格情報を解決します。API のキー、base URL、OAuth のトークン、資格情報の組も含みます。

これがないと、素の `AIAgent()` は組み込みの既定値に落ちるので、既定以外の窓口に対しては 401 になります。

#### 手順 3: 試す {#step-3-test-it}

ゲートウェイを再起動します。

```bash
hermes gateway restart
```

ログを見ます。

```bash
hermes logs --follow --level INFO | grep boot-md
```

`Running BOOT.md (N chars)` に続いて、`boot-md completed: ...`（エージェントが何をしたかの要約）か、エージェントが `[SILENT]` のようなちょうどの沈黙の合図で返した場合の `boot-md completed (nothing to report)` が出るはずです。

点検表を止めたいときは `~/.hermes/BOOT.md` を削除してください。フックは読み込まれたままですが、ファイルがなければ黙って飛ばします。

#### この型を広げる {#extending-the-pattern}

- **曜日を意識した点検表:** BOOT.md の指示の中で `datetime.now().weekday()` を手がかりにします（「月曜なら週次のデプロイのログも見て」）。指示は自由な文章なので、エージェントが考えられることなら何でも書けます。
- **複数の点検表:** フックを別のファイル（`STARTUP.md`、`MORNING.md` など）へ向けて、それぞれ別のフックのディレクトリを登録します。
- **エージェントを使わない形:** エージェントのループが要らないなら `AIAgent` はまるごと省いて、処理が `httpx` で決まった通知を直接投げるようにします。安く、速く、プロバイダーにも依存しません。

#### これが組み込みでない理由 {#why-this-isnt-a-built-in}

以前の版の Hermes はこれを組み込みのフックとして持っていて、ゲートウェイの起動のたびに素の既定値でエージェントを黙って起こしていました。独自の窓口を使う人を驚かせましたし、動いていることを知らない人には見えない機能になっていました。文書化された型として — あなたが自分のフックのディレクトリに作るものとして — 残せば、何をするのかがそのまま見えますし、ファイルを書くことが「使う」という意思表示になります。

### 仕組み {#how-it-works}

1. ゲートウェイの起動時に、`HookRegistry.discover_and_load()` が `~/.hermes/hooks/` を調べます
2. `HOOK.yaml` + `handler.py` のあるサブディレクトリがプロセス内で読み込まれます。有効にする一覧は参照されません（[信頼の考え方](#gateway-hook-trust) を参照）
3. 宣言されたイベントに処理が登録されます
4. 節目ごとに `hooks.emit()` が、一致するすべての処理を発火させます
5. どの処理のエラーも捕まえて記録されます。壊れたフックがエージェントを落とすことはありません

:::info
ゲートウェイのフックが発火するのは**ゲートウェイ**（Telegram、Discord、Slack、WhatsApp、Teams）だけです。CLI はゲートウェイのフックを読み込みません。どこでも動くフックが必要なら [プラグインのフック](#plugin-hooks) を使ってください。
:::

## プラグインのフック {#plugin-hooks}

[プラグイン](/hermes/docs/user-guide/features/plugins/) は、**CLI とゲートウェイの両方**のセッションで発火するフックを登録できます。これはプラグインの `register()` 関数の中で `ctx.register_hook()` を呼んで、プログラムとして登録します。

プラグインの作り方と登録の詳細は、
[プラグインの手引き](/hermes/docs/user-guide/features/plugins/) を参照してください。

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

**すべてのフックに共通の決まり:**

- コールバックは**キーワード引数**を受け取ります。将来の変更に備えて、必ず `**kwargs` を受けてください。
- コールバックの例外は記録されて飛ばされ、後続のコールバックは続きます。毎回同じ形で失敗するコールバック（ふつうは、そのフックが送らない項目を引数名にしている場合。たとえば `tool_name`/`args` ではなく `tool_data` としているなど）は WARNING で**一度だけ**報告され — その文言はそのフックが渡す項目を並べます — 同じ繰り返しは DEBUG へ落ちるので、宣言を誤ったプラグインがログを埋め尽くすことはありません。
- **時間の上限のある**フック（`post_tool_call` / `pre_llm_call` のような要となる経路の観測役に加えて、方針のフックである `pre_tool_call`）で Python のプラグインのコールバックが `plugins.hook_callback_timeout`（既定 30 秒、`0` で無効、最大 600）より長く**止まった**場合、作業役の終了を待たずに切り離されるので、エージェントのループは続きます。時間切れになった、あるいはまだ動いている `pre_tool_call` のコールバックは**閉じる側へ倒れます**（ツールを遮断します）。他の上限のあるフックは開く側へ倒れます（飛ばします）。呼び出し元のスレッドで動く約束のあるフック（`subagent_stop`）が、時間の上限のある作業役へ移されることはありません。シェルのフックは、項目ごとの `timeout` を自分で持ちます。
- 下の一覧は説明のためのものです。**観測役**は戻り値を無視し、**変換**は最初の有効な文字列の置き換えを受け取り、**指示 / 制御**のフックは文書化された戻り値の形を使います。プラグインのミドルウェアは別の登録簿であり別の入口で、もう 1 つのフックの種類ではありません。
- `turn_id`、`api_request_id`、`task_id`、`session_id`、`api_call_count` のような突き合わせのための項目はフックごとに異なり、無いこともあります。ID は中身を読まない不透明なものとして扱ってください。
- 実行時に有効なイベント名は `hermes_cli.plugins.VALID_HOOKS` が決めます。`hermes hooks list` は設定されたシェル / 送信の Webhook のフックを並べるもので、使えるすべてのイベントを並べるものではありません。`hermes hooks test <event>` は、無効なイベントを渡したときにだけ有効な一覧を示します。

### キャッシュを壊さないシステムプロンプトの節 {#cache-safe-system-prompt-sections}

常に効いていてほしい案内を持ちたいプラグインは、毎回のやり取りで `pre_llm_call`
から同じ文章を差し込むのではなく、大きさの上限付きのシステムプロンプトの節を
登録できます。

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

この約束は意図して狭くしてあります。

- ID は全体で一意の、安定した 1〜128 文字の小文字の識別子で、使えるのは
  英字、数字、`.`、`_`、`-` だけです。重複する ID は拒否されます。
- 置き場所の目印は `after_memory` だけです。節は ID 順に並べられ、記憶 /
  プロファイルの文脈のあと、セッションの情報の前に出ます。プラグインが
  中核のプロンプトの内容を並べ替えたり置き換えたりすることはできません。
- 呼び出し可能なものには、`session_id`、`model`、`provider`、`platform`、
  `profile_name`、`cwd` を持つ読み取り専用のマッピングが渡されます。これは
  **新しいセッションにつき 1 回**動きます。その描画された内容は圧縮の時点で
  固定され、プロセスの再起動や再開のあとは、すでに保存されたシステム
  プロンプト全文から回復されます。既存のセッションでプラグインの状態が
  読み直されることはありません。
- `max_chars` の上限は 4,000 文字です。監査用の見出しを含めたプラグインの節の
  合計は、8,000 文字・32 節までです。空、文字列でない、大きすぎる、合計が
  予算を超える、例外を投げる節は警告とともに飛ばされ、プロンプトの組み立ては
  続きます。
- 受け入れられた節はすべてプロンプトに名前が出て、セッションの開始時に
  プラグイン名、置き場所、文字数とともに記録されます。

本当にやり取りごとに変わる文脈には `pre_llm_call` を使ってください。この約束には
プラグイン向けの環境の手がかりのフックを意図して置いていません。cwd、ブランチ、
その他の環境のデータが変わったことで、セッションのキャッシュされたプロンプトが
黙って変わってはならないからです。そうしたフックを足すには、具体的な使い手と、
同じ「固定され、再開に耐える」意味づけが先に要ります。

### 同梱のプラグインのフックの一覧 {#shipped-plugin-hook-catalog}

以下に挙げる項目は、それぞれの呼び出し元が渡す、そのイベント固有の項目そのものです。以前との互換のため、`PluginManager` はすべてのプラグインのフックのコールバックに `telemetry_schema_version="hermes.observer.v1"` も足します。この以前からの包みの印は、すべてのフックの中身が 1 つの意味の型を共有するという意味ではありません。新しく版を付けた約束は、それぞれの具体的なイベントや能力のまとまりに属します。

| フック | 種類 | 発火のタイミングと戻り値の扱い | 明示的に渡される項目 | プライバシー / 機微さ |
|---|---|---|---|---|
| [`pre_tool_call`](#pre_tool_call) | 指示 / 制御 | 実行の前に 1 回。有効な `block` はどの `approve` よりも優先され（そのあと最初の有効な `approve`）、`modify` の戻り値はツールの引数へ浅くマージされます。 | `tool_name`、`args`、`task_id`、`session_id`、`tool_call_id`、`turn_id`、`api_request_id`、`middleware_trace` | 素の引数には、利用者の内容、パス、コマンド、秘密の情報が含まれることがあります。 |
| `post_tool_call` | 観測役 | 遮断、エラー、成功のいずれの結果のあとにも。戻り値は無視されます。 | `tool_name`、`args`、`result`、`task_id`、`session_id`、`tool_call_id`、`turn_id`、`api_request_id`、`duration_ms`、`status`、`error_type`、`error_message`、`middleware_trace` | 結果やエラーの文章には、任意のツールや利用者の内容、秘密の情報が含まれることがあります。 |
| `transform_tool_result` | 変換 | `post_tool_call` のあと、会話への追加の前。最初の文字列が結果を置き換えます。 | `tool_name`、`args`、`result`、`task_id`、`session_id`、`tool_call_id`、`turn_id`、`api_request_id`、`duration_ms`、`status`、`error_type`、`error_message` | モデルへ渡る結果と引数が丸ごと見えます。 |
| `transform_terminal_output` | 変換 | 前面のプロセスの出力を上限付きで受け取ったあと、最後の出力の制限の前。最初の文字列が出力を置き換えます。 | `command`、`output`、`returncode`、`task_id`、`env_type` | コマンドや出力に資格情報が含まれることがあります。 |
| `pre_transcription` | 変換 | プロバイダーが決まったあと、どのバックエンド（組み込み、コマンド型、プラグインが登録したもの）が呼ばれるよりも前に、音声認識の振り分け役が発火させます。辞書の結果は登録の順に適用され、項目ごとに最後の書き手が勝ちます（`prompt`、`language`、`model`。`file_path` は読み取り専用です）。 | `file_path`、`provider`、`model`、`language`、`prompt`、`source` | 最後のプロンプトは音声と一緒に、設定された音声認識のプロバイダーへ送られます。フックの戻り値に秘密の情報を入れないでください。 |
| `pre_llm_call` | 指示 / 制御 | ループの前に、やり取りごとに 1 回。有効な文字列 / `{"context": ...}` の戻り値はすべてつなげられ、利用者のメッセージへ差し込まれます。 | `session_id`、`task_id`、`turn_id`、`user_message`、`conversation_history`、`is_first_turn`、`model`、`platform`、`parent_session_id`、`sender_id` | 利用者のメッセージと会話の履歴が丸ごと。 |
| `post_llm_call` | 観測役 | 中断されずに成功したやり取りの締めくくり。戻り値は無視されます。 | `session_id`、`task_id`、`turn_id`、`user_message`、`assistant_response`、`conversation_history`、`model`、`platform` | プロンプト、応答、履歴が丸ごと。 |
| `transform_llm_output` | 変換 | `post_llm_call` と最後の配信の前。最初の空でない文字列が応答を置き換えます。 | `response_text`、`session_id`、`model`、`platform` | 最後のアシスタントの文章が丸ごと。 |
| `pre_verify` | 指示 / 制御 | 編集したコードの確認の関門で、上限付きに。最初の有効な続行 / 遮断の指示がやり取りを続けさせます。 | `session_id`、`platform`、`model`、`coding`、`attempt`、`final_response`、`changed_paths` | 下書きの応答と変更されたパス。 |
| `pre_api_request` | 観測役 | プロバイダーへの試みごとに、送る直前。戻り値は無視されます。 | `task_id`、`turn_id`、`api_request_id`、`session_id`、`user_message`、`conversation_history`、`platform`、`model`、`provider`、`base_url`、`api_mode`、`api_call_count`、`retry_count`、`request_messages`、`message_count`、`tool_count`、`approx_input_tokens`、`request_char_count`、`max_tokens`、`started_at`、`middleware_trace`、`request` | 機微さが高いです。以前からある `user_message`、`conversation_history`、`request_messages` は意図して素のままです。整えられた `request` のほうを使ってください。 |
| `post_api_request` | 観測役 | プロバイダーの成功が正規化されたあと。戻り値は無視されます。 | `task_id`、`turn_id`、`api_request_id`、`session_id`、`platform`、`model`、`provider`、`base_url`、`api_mode`、`api_call_count`、`api_duration`、`started_at`、`ended_at`、`finish_reason`、`message_count`、`response_model`、`response`、`usage`、`assistant_message`、`assistant_content_chars`、`assistant_tool_call_count` | 整えられた `response` が使えますが、素の正規化された `assistant_message` にはモデルや利用者の内容が含まれることがあります。`usage` は集計のデータです。 |
| `api_request_error` | 観測役 | プロバイダーへの試みが失敗するたび。戻り値は無視されます。 | `task_id`、`turn_id`、`api_request_id`、`session_id`、`platform`、`model`、`provider`、`base_url`、`api_mode`、`api_call_count`、`api_duration`、`started_at`、`ended_at`、`status_code`、`retry_count`、`max_retries`、`retryable`、`reason`、`error`、`request` | エラーの文章にプロバイダーや利用者のデータが含まれることがあります。`request` は整えられている想定です。 |
| `pre_auxiliary_call` | 観測役 | 補助の LLM の呼び出し（題名付け、圧縮、MoA、画像、承認など）のプロバイダーへの試みごとに、送る直前。戻り値は無視されます。 | `aux_task`、`task_id`、`turn_id`、`session_id`、`platform`（親のやり取りのもの。やり取りの外では空）、`api_request_id`、`api_call_count`、`retry_count`、`streaming`、`model`、`provider`、`base_url`、`api_mode`、`request_messages`、`system_prompt`、`message_count`、`tool_count`、`approx_input_tokens`、`request_char_count`、`max_tokens`、`started_at`、`request` | `request_messages` は素のままです（圧縮は記録の全体を見ます）。整えられた `request` のほうを使ってください。 |
| `post_auxiliary_call` | 観測役 | 同じ試みが返るか例外を投げたあと。戻り値は無視されます。 | `pre_auxiliary_call` と同じ身元の項目に加えて `api_duration`、`ended_at`、`finish_reason`、`response_model`、`usage`、`response`、`assistant_content_chars`、`assistant_tool_call_count`、`error`、`error_type`（成功時は `None`。エラー時と `streaming=True` のときは `usage`/`response` が `None`） | 整えられた `response`。`usage` は集計のデータで、`error` にはプロバイダーの文章が含まれることがあります。 |
| `on_stream_start` | 観測役 | 逐次の LLM の応答が始まったときに送られます。ホストが持つ上限付きの待ち行列を通じて、トークンの経路の外で届きます。戻り値は無視されます。 | `turn_id`、`iteration`、`session_id`、`model`、`provider`、`surface` | 識別子と経路の情報だけ。 |
| `on_stream_delta` | 観測役 | 正規化された逐次のテキストの差分ごとに、上限付きの観測の待ち行列を通じて送られます。詰まったコールバックは自分の最も古いイベントだけを落とします。戻り値は無視されます。 | `delta`、`kind`（`text` か `reasoning`）、`turn_id`、`iteration`、`session_id`、`model`、`provider`、`surface` | 差分のテキストは素のモデルの出力です。推論の差分には `plugins.stream_reasoning_deltas` を自分で有効にする必要があります。 |
| `on_stream_end` | 観測役 | 逐次の応答が終わるかエラーになったあと、流れが閉じてから送られます。戻り値は無視されます。 | `final_text`、`finished`、`error`、`turn_id`、`iteration`、`session_id`、`model`、`provider`、`surface` | 組み上がった応答の文章が丸ごと。エラーの文章にはプロバイダーのデータが含まれることがあります。 |
| `on_interim_message` | 観測役 | 最後の答えより前に、ループの途中のアシスタントのメッセージが表に出たときに送られます（逐次でもそうでなくても）。戻り値は無視されます。 | `text`、`already_streamed`、`turn_id`、`iteration`、`session_id`、`model`、`provider`、`surface` | 途中のアシスタントの文章が丸ごと。 |
| `transform_api_error_classification` | 変換 | プロバイダーへの試みが失敗するたび、組み込みの分類の先頭で。すべてのコールバックが動き、そのあと有効な `reason` を持つ最初の辞書が勝ちます（全部動かしてから先頭を選ぶ形）。飛ばされた有効な結果は実行時の警告を記録します。Python のプラグイン専用です。 | `provider`、`model`、`status_code`、`error_type`、`error_code`、`error_message`、`error_body`、`error`、`approx_tokens`、`context_length`、`num_messages` | `error_message` と `error_body` には、素のプロバイダーや利用者のデータが含まれることがあります。 |
| `on_session_start` | 観測役 | 新しいセッションの最初のやり取り。戻り値は無視されます。 | `session_id`、`model`、`platform` | 識別子と経路の情報だけ。 |
| `on_session_end` | 観測役 | 正準には、やり取りの締めくくりごとに。CLI / TUI の終了では、項目の減った以前からの形も追加であります。戻り値は無視されます。 | 正準: `session_id`、`task_id`、`turn_id`、`completed`、`failed`、`interrupted`、`turn_exit_reason`、`model`、`platform`。終了の経路では `reason`/`api_request_id` が加わったり、項目が欠けたりします。 | ID、モデル / プラットフォーム、結果。正準の中身にメッセージの本文はありません。 |
| `on_session_finalize` | 観測役 | `finalize_session` を通した CLI / TUI / ゲートウェイの片付け。ゲートウェイの停止では、作り直しなしで締めくくることがあります。戻り値は無視されます。 | 入口によって変わる `session_id`、`platform`、必要に応じて `reason`、`old_session_id`、`new_session_id` | セッションと経路の識別子。 |
| `on_session_reset` | 観測役 | CLI / TUI のセッションの区切りと、ゲートウェイで置き換えのセッションができたあと。戻り値は無視されます。 | CLI: `session_id`、`platform`、`reason`。TUI: `session_id`、`platform`。ゲートウェイ: それらに加えて `reason`、`old_session_id`、`new_session_id` | セッションと経路の識別子。 |
| `agent_loop_stopped` | 観測役 | 実際に動いていたエージェントが中断された直後 — ゲートウェイの `_interrupt_and_clear_session` か、TUI / デスクトップの `session.interrupt`。戻り値は無視されます。 | `session_key`、`platform`、`reason`、`invalidation_reason` | セッション / 経路の識別子と中断の理由。メッセージの本文はありません。 |
| `on_skill_lifecycle` | 観測役 | スキルの利用の状態が確定的に変わったあと。戻り値は無視されます。 | `action`、`skill_name`、`provenance`、`task_id`、`session_id`、`use_count`、`reused`、`reuse_after_patch` | 手元のスキル名と出どころが見えます。 |
| `subagent_start` | 観測役 | 子が組み立てられ、これから動くところ。戻り値は無視されます。 | `parent_session_id`、`parent_turn_id`、`parent_subagent_id`、`child_session_id`、`child_subagent_id`、`child_role`、`child_goal` | 子の目的に利用者やプロジェクトの内容が含まれることがあります。 |
| `subagent_stop` | 観測役 | 子の終了。戻り値は無視されます。 | `parent_session_id`、`parent_turn_id`、`child_session_id`、`child_role`、`child_summary`、`child_status`、`tool_call_history`、`duration_ms` | 要約と、伏せ字にしたツールの履歴の情報から、プロジェクトの構成が読み取れることがあります。 |
| `pre_gateway_dispatch` | 指示 / 制御 | 内部のものでない受信メッセージについて、認証 / ペアリング / 振り分けの前。最初の有効な `skip`、`rewrite`、`allow` が流れを決めます。 | `event`、`gateway`、`session_store` | 極めて強い権限を持つプロセス内のオブジェクトで、受信した利用者 / 経路のデータとホストの操作手段が見えます。 |
| `gateway_platform_event` | 観測役 | ゲートウェイのプロファイル単位の認可が通ったあと、対応するプラットフォーム固有のイベントがゲートウェイの境界で正規化されたとき（Telegram: リアクション、メッセージの編集。Discord: メッセージの編集 / 削除、スレッドの作成 / 改名）。戻り値は無視されます。 | `platform`、`event_type`、`payload`（イベント種別ごとの辞書 — 下のイベントごとの約束を参照） | 正規化された素の辞書の包みだけです。素の SDK のオブジェクト、アダプターの操作手段、ボットのクライアントが出ることはありません。 |
| `pre_command` | 観測役 | 認識されたスラッシュコマンドがこれから振り分けられるところ、処理が動く前。CLI とゲートウェイの通常の振り分けで発火します。v1 では戻り値は無視されます（指示の形の辞書はデバッグで記録されます）。ゲートウェイで実行中のエージェントに割り込むコマンド（実行中の `/stop`、`/approve`）は意図して外してあります。制御のための逃げ道は、プラグインの手の届かないところに置く必要があります。 | `surface`（`"cli"` \| `"gateway"`）、`command`（正準の名前）、`alias_used`、`args_raw`、`session_key`、`platform` | `args_raw` には、コマンドのあとに打たれた利用者の内容や秘密の情報が含まれることがあります。 |
| `pre_approval_request` | 観測役 | 問い合わせ、あるいは賢い承認の前。戻り値は無視されます。 | `command`、`description`、`pattern_key`、`pattern_keys`、`session_key`、`surface`、`turn_id`、`tool_call_id` | コマンドに秘密の情報が含まれることがあります。賢い観測の準備では伏せ字が強制されますが、入口によって伏せ字の扱いが同じとは限りません。 |
| `post_approval_response` | 観測役 | 判断、時間切れ、あるいはゲートウェイの通知の失敗のあと。戻り値は無視されます。 | `command`、`description`、`pattern_key`、`pattern_keys`、`session_key`、`surface`、`turn_id`、`tool_call_id`、`choice`。賢い経路では `decided_by` が加わることがあります | コマンドの機微さは同じで、加えて判断の情報。 |
| `on_room_member_activity` | 観測役 | Bot モードのゲートウェイで、ホストされたグループチャットのメンバーのやり取りが動いている間、メンバーのセッションが出す実行時のイベント（ツールの開始 / 完了、承認の要求、メッセージ / 推論の差分、エラー）ごとに 1 回。受け手ごとにトークンの経路の外で待ち行列に入ります。戻り値は無視されます。 | `room_id`、`thread_id`、`member_id`、`turn_id`、`task_id`、`execution_generation`、`kind`、`seq`、`payload` | `payload` はクライアントに渡して安全なセッションのイベントの本体です。ツールの引数と結果、伏せ字にした承認のコマンド、逐次に流れるメンバーの文章。 |
| `kanban_task_claimed` | 観測役 | 取り掛かりが確定したあと、ワーカーの起動の前にディスパッチャーのプロセスで。戻り値は無視されます。 | `task_id`、`profile_name`、`board`、`assignee`、`run_id` | 盤 / タスク / プロファイル / 担当者の識別子。 |
| `kanban_task_completed` | 観測役 | 完了と片付けのあと、ふつうはワーカーのプロセスで。戻り値は無視されます。 | `task_id`、`profile_name`、`board`、`assignee`、`run_id`、`summary` | 要約にプロジェクトや利用者の内容が含まれることがあります。 |
| `kanban_task_blocked` | 観測役 | ブロックへの遷移のあと。依存の待ちの経路では、そのトランザクションを抜ける前に発火します。戻り値は無視されます。 | `task_id`、`profile_name`、`board`、`assignee`、`run_id`、`reason` | 理由にプロジェクトや利用者の内容が含まれることがあります。 |
| `on_kanban_worker_spawned` | 観測役 | `spawn_fn` が返り、ワーカーの PID が保存されたあと。振り分けのロックの中で動くので、コールバックは速く保ってください。戻り値は無視されます。 | `task_id`、`profile_name`、`board`、`assignee`、`run_id`、`worker_pid`、`workspace_path` | `workspace_path` はファイルシステムのパスで、プロジェクトの構成や利用者名が読み取れることがあります。 |
| `on_kanban_worker_exited` | 観測役 | まわりに由来します。`detect_crashed_workers` が PID の死んだタスクを回収し、その回収が確定したあと。戻り値は無視されます。 | `task_id`、`profile_name`、`board`、`assignee`、`run_id`、`worker_pid`、`exit_kind`、`exit_code`、`outcome`、`retry_status` | 識別子と終了の情報だけ。 |
| `on_kanban_worker_stale_claim` | 観測役 | TTL の切れた取り掛かりが回収されたあと。PID が生きている延長では発火しません。戻り値は無視されます。 | `task_id`、`profile_name`、`board`、`assignee`、`run_id`、`worker_pid`、`heartbeat_stale`、`retry_status` | 識別子と取り掛かりの情報だけ。 |
| `on_kanban_task_updated` | 観測役 | 取り掛かり / 完了 / ブロックのライフサイクルの外でタスクの項目の書き込みが確定したあと（割り当て、上書き、ダッシュボードの編集画面）。戻り値は無視されます。 | `task_id`、`profile_name`、`board`、`assignee`、`run_id`、`changed_fields` | `changed_fields` は項目名だけを運び、値は決して運びません。盤の DB にある題名 / 本文の値には、利用者やプロジェクトの内容が含まれることがあります。 |
| `on_kanban_dispatch_tick` | 観測役 | ディスパッチャーのまわりごとに 1 回、振り分けのロックが外れたあとで確実に。何もしないまわりや、取り合いのあったまわりでも発火します。戻り値は無視されます。 | `board`、`profile_name`、`dry_run`、`outcome`、`result` | `result` はそのまわりの `DispatchResult` で、タスクの id、担当者、作業場所のパスを運びます。 |

---

### 逐次の出力のフック {#streaming-output-hooks}

これらの観測専用のフックは、応答を変えずに、プラグインが逐次の LLM の出力を計測、実況の盤、読み上げの処理に使えるようにします。登録されたコールバックごとに 1 つの背後の作業役を持つ、ホストが管理する上限付きの待ち行列を通じて届くので、プラグインのコールバックがトークンの経路の上で直接動くことはありません。1 つのコールバックが詰まっても、詰まるのはそのコールバックの待ち行列だけで、そこで最も古い保留中の観測のイベントが落ちます。他の観測役は、独立してイベントを受け取り続けます。

他のプラグインのフックと同じように登録します。

```python
def on_delta(delta, kind, model, provider, **kwargs):
    if kind == "text":
        print(delta, end="", flush=True)

def register(ctx):
    ctx.register_hook("on_stream_delta", on_delta)
```

4 つのフックに共通の項目:

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `turn_id` | `str` | 分かる場合の、中身を読まないやり取りの識別子 |
| `iteration` | `int` | いまの API 呼び出し / ツールのループの回数 |
| `session_id` | `str` | いまの Hermes のセッション id |
| `model` | `str` | 使っているモデルの識別子 |
| `provider` | `str` | 使っているプロバイダー名 |
| `surface` | `str` | 呼び出し元の入口。たとえば `cli`、`discord`、`telegram` |

追加の項目:

| フック | 追加の項目 |
|------|--------------|
| `on_stream_start` | なし |
| `on_stream_delta` | `delta: str`、`kind: "text" | "reasoning"` |
| `on_stream_end` | `final_text: str`、`finished: bool`、`error: str | None` |
| `on_interim_message` | `text: str`、`already_streamed: bool` |

`on_interim_message` は逐次でない応答のあとにも発火し得るので、このフックだけを登録してもプロバイダーの呼び出しが逐次の伝送に切り替わることはありません。

推論の差分は、既定ではプラグインに渡されません。明示的に選んでください。

```yaml
plugins:
  stream_reasoning_deltas: true
```

戻り値は無視されます。流れを速く保つため、コールバックは自分の処理を待ち行列に入れてすぐ返すべきです。例外は記録され、流れを止めません。

---

### `pre_tool_call` {#pretoolcall}

**すべてのツールの実行の直前**に発火します。組み込みのツールもプラグインのツールも同じです。

**コールバックの形:**

```python
def my_callback(tool_name: str, args: dict, task_id: str, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `tool_name` | `str` | これから実行されるツールの名前（たとえば `"terminal"`、`"web_search"`、`"read_file"`） |
| `args` | `dict` | モデルがツールに渡した引数 |
| `task_id` | `str` | セッション / タスクの識別子。設定されていなければ空文字列です。 |

**発火する場所:** `model_tools.py` の `handle_function_call()` の中、ツールの処理が動く前です。ツールの呼び出しごとに 1 回発火します。モデルが 3 つのツールを並列に呼べば、3 回発火します。

**戻り値 — 遮断するか、承認を求める:**

```python
return {"action": "block", "message": "Reason the tool call was blocked"}
# or
return {"action": "approve", "message": "Why approval is required", "rule_key": "optional:scope"}
```

優先の順は、登録の順にかかわらず `block` > `approve` > 指示なし です。どのプラグインの有効な `block` も、先に返された `approve` より優先されますし、`approve` どうしでは最初の有効なものが勝ちます（Python のプラグインが先に登録され、そのあとシェルのフックです）。`block` には空でない `message` が必要で、その文章をモデルへ返すエラーとしてツールを打ち切ります。`approve` は、その呼び出しを既存の人による承認の関門へ上げます。`message` と `rule_key` は任意で、拒否、時間切れ、関門のエラーは閉じる側へ倒れます。それ以外の戻り値は無視されるので、既存の観測だけのコールバックはそのまま動き続けます。

**戻り値 — ツールの引数を書き換える:**

```python
return {"action": "modify", "args": {"new_string": "fixed content"}}
```

返された `args` の辞書は、ツールが動く前に元のツールの引数へ浅くマージされます。複数の `modify` のフックは積み上がります。各フックのキーは、元の引数から作られた 1 つの辞書へマージされるので、フック A が `path` を変え、フック B が `content` を変えても、どちらも残ります。2 つのフックが同じキーを変えた場合は、あとのフックが勝ちます。

シェルのフックは、Claude Code と互換の形も受け付けます。

```json
{"decision": "modify", "tool_input": {"new_string": "fixed content"}}
```

どちらの形も、内部では `{"action": "modify", "args": {...}}` に整えられます。

`pre_tool_call` のコールバックが `plugins.hook_callback_timeout` を超えた場合（あるいは、前回の時間切れの発火からまだ動いている場合）、Hermes は**閉じる側へ倒れます**。方針の判断がないまま進むのではなく、時間切れの文言とともにツールを遮断します。例外を投げたコールバックでも同じで、遮断の文言にそのコールバックとエラーの名前が出ます。止まったコールバックは 60 秒の抑制の間は飛ばされ、そのあと新しいツールの呼び出しでもう一度動きます（コールバックごとに切り離す作業役は 3 つまでなので、永久に止まったプラグインは、再起動まで黙ってエージェントを詰まらせる代わりに、そのプラグインを名指しする警告とともにツールの呼び出しを遮断します）。

**使いどころ:** 記録、監査の証跡、ツールの呼び出しの数え上げ、危険な操作の遮断、回数の制限、利用者ごとの方針の適用、引数の整え、パスの書き換え、既定の引数の差し込み。

**例 — ツールの呼び出しの監査の記録:**

```python

from datetime import datetime

logger = logging.getLogger(__name__)

def audit_tool_call(tool_name, args, task_id, **kwargs):
    logger.info("TOOL_CALL session=%s tool=%s args=%s",
                task_id, tool_name, json.dumps(args)[:200])

def register(ctx):
    ctx.register_hook("pre_tool_call", audit_tool_call)
```

**例 — 危険なツールで警告する:**

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

**すべてのツールの実行が返った直後**に発火します。

**コールバックの形:**

```python
def my_callback(tool_name: str, args: dict, result: str, task_id: str,
                duration_ms: int, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `tool_name` | `str` | いま実行されたツールの名前 |
| `args` | `dict` | モデルがツールに渡した引数 |
| `result` | `str` | ツールの戻り値（必ず JSON の文字列です） |
| `task_id` | `str` | セッション / タスクの識別子。設定されていなければ空文字列です。 |
| `duration_ms` | `int` | ツールの振り分けにかかった時間（ミリ秒。`registry.dispatch()` の前後を `time.monotonic()` で測ります）。 |

**発火する場所:** `model_tools.py` の `handle_function_call()` の中、ツールの処理が返ったあとです。ツールの呼び出しごとに 1 回発火します。ツールが捕まえられていない例外を投げた場合は発火**しません**（そのエラーは捕まえられてエラーの JSON の文字列として返され、`post_tool_call` はそのエラーの文字列を `result` として発火します）。

**戻り値:** 無視されます。

**使いどころ:** ツールの結果の記録、指標の収集、ツールの成功 / 失敗の割合の追跡、応答時間の盤、ツールごとの予算の警告、特定のツールが終わったときの通知の送信。

**例 — ツールの利用の指標を取る:**

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

ツールを呼ぶループが始まる前に、**やり取りごとに 1 回**発火します。有効なコールバックの戻り値はすべてプラグインの順にまとめられ、いまのやり取りの利用者のメッセージへ差し込まれます。

**コールバックの形:**

```python
def my_callback(session_id: str, user_message: str, conversation_history: list,
                is_first_turn: bool, model: str, platform: str, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `session_id` | `str` | いまのセッションの一意の識別子 |
| `user_message` | `str \| list` | このやり取りでの利用者の元のメッセージ（スキルの差し込みより前）。画像などの添付を含むやり取りでは、送られたとおりの内容の部分の一覧になります |
| `conversation_history` | `list` | メッセージの一覧全体の写し（OpenAI の形式: `[{"role": "user", "content": "..."}]`） |
| `is_first_turn` | `bool` | 新しいセッションの最初のやり取りなら `True`、以降は `False` |
| `model` | `str` | モデルの識別子（たとえば `"anthropic/claude-sonnet-4.6"`） |
| `platform` | `str` | セッションが動いている場所: `"cli"`、`"telegram"`、`"discord"` など |

**発火する場所:** `agent/turn_context.py`（`agent/conversation_loop.py` の `run_conversation()` のためのやり取りの準備）の中、文脈の圧縮のあと、主の `while` のループの前です。`run_conversation()` の呼び出しごと（つまり利用者のやり取りごと）に 1 回発火し、ツールのループの中の API 呼び出しごとではありません。

**戻り値:** コールバックが `"context"` のキーを持つ辞書か、空でない素の文字列を返すと、その文章がいまのやり取りの利用者のメッセージへ足されます。差し込まないときは `None` を返します。

```python
# Inject context
return {"context": "Recalled memories:\n- User likes Python\n- Working on hermes-agent"}

# Plain string (equivalent)
return "Recalled memories:\n- User likes Python"

# No injection
return None
```

**どこへ差し込まれるか:** いつでも**利用者のメッセージ**で、システムプロンプトには決して入りません。こうするとプロンプトのキャッシュが保たれます。システムプロンプトはやり取りをまたいで同じままなので、キャッシュされたトークンが使い回されます。システムプロンプトは Hermes の領分です（モデルへの案内、ツールの強制、人格、スキル）。プラグインは、利用者の入力の側に文脈を足します。

きれいな利用者のメッセージの `content` は変わりません。再生とプロンプトのキャッシュの安定のために、Hermes は、プラグインが差し込んだ文脈を含む API へ渡ったそのままのメッセージを、その行の `api_content` の控えに残すことがあります。

画像の添付や、部分として送られたテキストなど、**内容が一覧になっているやり取り**では、文字列の控えはありません。まとめられた文脈は、最初の要求の前に、そのやり取りの内容へ `{"type": "text"}` の部分として 1 つ足され、その部分はやり取りとともに保存されるので、再開したセッション、圧縮、再生のどれでもモデルが見たのと同じメッセージが見えます。それより前のメッセージとシステムプロンプトには決して触れません。

**複数のプラグイン**が文脈を返した場合、その出力はプラグインが見つかった順（ディレクトリ名のアルファベット順）で、空行を挟んでつなげられます。

**使いどころ:** 記憶の呼び出し、検索で補う文脈の差し込み、防護、やり取りごとの分析。

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

**例 — 防護:**

```python
POLICY = "Never execute commands that delete files without explicit user confirmation."

def guardrails(**kwargs):
    return {"context": POLICY}

def register(ctx):
    ctx.register_hook("pre_llm_call", guardrails)
```

---

### `post_llm_call` {#postllmcall}

ツールを呼ぶループが終わり、エージェントが最後の応答を作ったあと、**やり取りごとに 1 回**発火します。発火するのは**成功した**やり取りだけで、中断された場合は発火しません。

**コールバックの形:**

```python
def my_callback(session_id: str, user_message: str, assistant_response: str,
                conversation_history: list, model: str, platform: str, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `session_id` | `str` | いまのセッションの一意の識別子 |
| `user_message` | `str` | このやり取りでの利用者の元のメッセージ |
| `assistant_response` | `str` | このやり取りでのエージェントの最後の文章の応答 |
| `conversation_history` | `list` | やり取りが終わったあとのメッセージの一覧全体の写し |
| `model` | `str` | モデルの識別子 |
| `platform` | `str` | セッションが動いている場所 |

**発火する場所:** `agent/turn_finalizer.py`（`agent/conversation_loop.py` の `run_conversation()` が呼ぶ `finalize_turn()`）の中、ツールのループが最後の応答とともに抜けたあとです。`if final_response and not interrupted` で守られているので、利用者がやり取りの途中で割り込んだ場合や、エージェントが応答を作れないまま反復の上限に達した場合は発火**しません**。

**戻り値:** 無視されます。

**使いどころ:** 会話のデータを外部の記憶の仕組みへ同期する、応答の質の指標を計算する、やり取りの要約を記録する、あとの処理を起こす。

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

**エージェントがコードを編集したやり取りごとに 1 回**、終わる直前（組み込みの、止まる前の確認の守りのあと）に発火します。これは利用者 / プラグインの方針の関門です。コールバックは、そのまま止めさせる代わりに、エージェントを続けさせられます。検査を走らせる、あとに回す、差分を整える、といったことです。

Hermes が同梱している確認の案内は、既定の `pre_verify` のフックではありません。編集したコードに新しい確認の証拠がないときに、証拠に基づく「止まる前の確認」の促しへ足されるものなので、2 つ目の既定の継続の経路を作ることはありません。その組み込みの証拠の促しを短くしたい場合は `agent.verify_guidance: false` を設定してください。

**コールバックの形:**

```python
def my_callback(session_id: str, platform: str, model: str, coding: bool,
                attempt: int, final_response: str, changed_paths: list, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `session_id` | `str` | いまのセッションの一意の識別子 |
| `platform` | `str` | セッションが動いている場所（`"cli"`、`"telegram"` など） |
| `model` | `str` | モデルの識別子 |
| `coding` | `bool` | そのやり取りがコーディングの姿勢にあるか（コードの作業場所にいるか）。これでフックの範囲を絞ってください |
| `attempt` | `int` | このやり取りですでに何回促されたか（最初は 0）。これで自分で回数を抑えてください |
| `final_response` | `str` | エージェントがこれから返そうとしている答え |
| `changed_paths` | `list` | このやり取りでエージェントが編集したファイル（並べ替え済みで、ここでは必ず空ではありません） |

`coding` を見てコーディングの場面にフックの範囲を絞り、`attempt` で 1 回きりにしてください（シェルのフックはどちらも `.extra` から読みます）。`pre_tool_call` のフックが `tool_name` で範囲を絞るのと同じやり方です。こうすれば `pre_verify` のフックをいくつも登録して、それぞれが必要な場面でだけ発火するようにできます。

**発火する場所:** `agent/conversation_loop.py` の、エージェントが最後の答えを受け入れようとする地点、止まる前の確認のすぐあとです。ただし、そのやり取りでエージェントがコードを編集していて、かつ `pre_verify` のフックが 1 つ以上登録されているときだけです。

**戻り値 — エージェントを続けさせる:**

```python
return {"action": "continue", "message": "Run the formatter on your changes, then finish."}
```

`message` は合成された利用者のやり取りとして足され、ループがもう一度動きます。Claude Code の Stop の形（`{"decision": "block", "reason": "..."}`。止まるのを遮断する = *続けさせる*）も受け付けます。メッセージのない指示や、それ以外の戻り値では、やり取りはそのまま終わります。

**上限があります:** 1 回のやり取りで続く続行の指示は `agent.max_verify_nudges`（既定 3）で上限がかかるので、いつも続行と言うフックがループを閉じ込めることはできません。促されている間、試みられた答えは履歴には残りますが、利用者には見えません。

**何度動かしても同じ結果にしてください:** フックは促しのたびに再び発火するので、`attempt` で関門を作ってください（`if attempt: return None`）。そうしないと、上限に当たるまで促し続けるだけになります。

**使いどころ:** 試行錯誤の間はテストや静的検査を後回しにする、特定のパスでは検査が通ることを求める、変更履歴の記載ができるまで「完了」を遮る、プロジェクト固有の確認の点検表を走らせる。

**例 — 見た目の作業では検査を後回しにする。範囲を絞り、1 回きり:**

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

組み込みの「証拠が足りない」という促しの形を変えたい、常設の案内には `agent.verify_guidance` を使ってください。確認を*関門にする*必要のない、もっと広いコーディングの姿勢の決まりには、`config.yaml` の `agent.coding_instructions` のほうが向いています。コーディングの説明に乗るので、やり取りが増えません。

---

### `transform_api_error_classification` {#transformapierrorclassification}

API の呼び出しが失敗するたびに 1 回、`agent/error_classifier.classify_api_error()` の先頭、組み込みの処理の前に発火します。プロバイダーのプラグインは、これを使って中核に手を入れずに自分のプロバイダーのエラーの癖を扱います。これは振る舞いを変えるもの（変換のまとまり）です。返された分類が、再試行、圧縮、資格情報の切り替え、代替への振り分けを動かします。

コールバックは、解釈されたエラーの情報をキーワード引数で受け取ります。`provider`（これで自分の範囲を絞ってください）、`model`、`status_code`、`error_type`、`error_code`、`error_message`、`error_body`、`error`、`approx_tokens`、`context_length`、`num_messages` です。引き受けないときは `None` を、引き受けるときは辞書を返します。

```python
return {"reason": "model_not_found",   # required: a FailoverReason name
        "retryable": False, "should_fallback": True}  # optional recovery-hint overrides
```

振り分けは、全部動かしてから先頭を選ぶ形です。すべてのコールバックが動き、失敗は切り離され、登録の順で最初の有効な結果が勝ちます（有効なのに負けた結果は実行時の警告を記録します）。不正な辞書と知らない理由は飛ばされるので、壊れたプラグインが分類を壊すことはありません。

**プライバシー:** `error_message` と `error_body` には、伏せ字にされていないプロバイダーのデータが含まれることがあります。**Python のプラグイン専用**で、シェルからの登録は設定の解釈の時点で警告とともに拒否されます。

---

### `on_session_start` {#onsessionstart}

まったく新しいセッションが作られたときに**1 回**発火します。セッションの続き（既存のセッションで利用者が 2 通目を送ったとき）では発火**しません**。

**コールバックの形:**

```python
def my_callback(session_id: str, model: str, platform: str, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `session_id` | `str` | 新しいセッションの一意の識別子 |
| `model` | `str` | モデルの識別子 |
| `platform` | `str` | セッションが動いている場所 |

**発火する場所:** `agent/conversation_loop.py` の `run_conversation()` の中、新しいセッションの最初のやり取りの間 — 正確には、システムプロンプトが組み立てられたあと、ツールのループが始まる前です。判定は `if not conversation_history`（以前のメッセージがない = 新しいセッション）です。

**戻り値:** 無視されます。

**使いどころ:** セッション単位の状態の初期化、キャッシュの準備、外部のサービスへのセッションの登録、セッションの開始の記録。

**例 — セッションのキャッシュを用意する:**

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

結果にかかわらず、すべての `run_conversation()` の呼び出しの**いちばん最後**に発火します。利用者が終了したときにエージェントがやり取りの途中だった場合は、CLI の終了の処理からも発火します。

**コールバックの形:**

```python
def my_callback(session_id: str, completed: bool, interrupted: bool,
                model: str, platform: str, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `session_id` | `str` | そのセッションの一意の識別子 |
| `completed` | `bool` | エージェントが最後の応答を作ったなら `True`、そうでなければ `False` |
| `interrupted` | `bool` | やり取りが中断されたなら `True`（利用者が新しいメッセージを送った、`/stop`、終了） |
| `model` | `str` | モデルの識別子 |
| `platform` | `str` | セッションが動いている場所 |

**発火する場所:** 2 か所です。
1. **`agent/turn_finalizer.py`** — すべての `run_conversation()` の呼び出し（`agent/conversation_loop.py`）の最後、片付けがすべて終わったあと。やり取りがエラーになっても必ず発火します。
2. **`cli.py`** — CLI の atexit の処理の中。ただし終了の時点でエージェントがやり取りの途中（`_agent_running=True`）だった場合**だけ**です。処理中の Ctrl+C や `/exit` を捕まえます。この場合は `completed=False`、`interrupted=True` になります。

**戻り値:** 無視されます。

**使いどころ:** 溜めたものの書き出し、接続の後始末、セッションの状態の保存、セッションの長さの記録、`on_session_start` で用意した資源の片付け。

**例 — 書き出して片付ける:**

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

**例 — セッションの長さを追う:**

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

CLI かゲートウェイが、動いているセッションを**片付ける**ときに発火します。たとえば利用者が `/new` を実行したときや、エージェントが動いたまま CLI を終了したときです。資源のためだけの、使われていないキャッシュの追い出しでは、残る会話の締めくくりは行われません。出ていくセッションの ID に紐づいた状態を書き出すのに使ってください。ゲートウェイの作り直しでは、このコールバックが動く時点で置き換えのセッションはすでにあります。

**コールバックの形:**

```python
def my_callback(session_id: str | None, platform: str, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `session_id` | `str` または `None` | 出ていくセッションの ID。動いているセッションがなければ `None` のことがあります。 |
| `platform` | `str` | `"cli"` か、メッセージングのプラットフォーム名（`"telegram"`、`"discord"` など）。 |

**発火する場所:** CLI / TUI の片付けと、ゲートウェイの作り直しや停止の経路です。ゲートウェイの停止では、対応する `on_session_reset` なしで締めくくることがあります。

**戻り値:** 無視されます。

**使いどころ:** セッションの ID が捨てられる前に最後の指標を残す、セッションごとの資源を閉じる、最後の計測のイベントを出す、溜まった書き込みを流し切る。

---

### `on_session_reset` {#onsessionreset}

CLI や TUI のセッションの区切りで、あるいはゲートウェイが、動いているチャットに**新しいセッションのキーを入れ替えた**ときに発火します。これにより、次の `on_session_start` を待たずに、会話の状態が消えたことへプラグインが反応できます。

**コールバックの形:**

```python
def my_callback(session_id: str, platform: str, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `session_id` | `str` | 新しいセッションの ID（すでに新しい値へ切り替わっています）。 |
| `platform` | `str` | `"cli"`、`"tui"`、またはメッセージングのプラットフォーム名。 |
| `reason` | `str`、任意 | CLI とゲートウェイの作り直しの経路であります。 |
| `old_session_id` | `str`、任意 | ゲートウェイ専用の、出ていくセッションの ID。 |
| `new_session_id` | `str`、任意 | ゲートウェイ専用の、置き換えのセッションの ID。 |

**発火する場所:** CLI は `session_id`、`platform`、`reason` を渡します。TUI は `session_id` と `platform` を渡します。ゲートウェイは、置き換えのキーを割り当てたあとに `reason`、`old_session_id`、`new_session_id` を足します。ゲートウェイの作り直しの順序は、置き換えを作って保存 → `on_session_finalize(old_id)` → `on_session_reset(new_id)` → 最初の受信のやり取りで `on_session_start(new_id)` です。

**戻り値:** 無視されます。

**使いどころ:** `session_id` を鍵にしたセッションごとのキャッシュを作り直す、「セッションが切り替わった」という分析を出す、新しい状態の入れ物を用意する。

---

ツールのスキーマ、処理、進んだフックの型まで含めた全体の説明は、**[プラグインを作る手引き](/hermes/docs/developer-guide/plugins/)** を参照してください。

---

### `agent_loop_stopped` {#agentloopstopped}

ゲートウェイが**動いているエージェントのやり取りに割り込んだ**ときに発火します。ループが働いている間に利用者が `/stop` を実行した、あるいは `/new` の中の、動いているエージェントへの近道が、セッションを入れ替える前に進行中の実行を消した場合です。`on_session_finalize` と違い、こちらはやり取りの途中というより早い時点で発火するので、エージェントのループが決して使わない、やり取りごとの外部の資源（ツールの結果を待っていた外向きの RPC など）をプラグインが手放せます。

割り込みの入口は 2 つあり、どちらでも発火します。メッセージングの**ゲートウェイ**（`/stop`、`/new` の近道）と、**TUI / デスクトップ**の `session.interrupt` の経路（プラットフォームは `"tui"` として報告されます）です。素の CLI では発火しません。そこには同じような割り込みの入口がないからです。

**コールバックの形:**

```python
def my_callback(session_key: str, platform: str, reason: str, invalidation_reason: str, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `session_key` | `str` | 実行が中断されたセッション。 |
| `platform` | `str` | メッセージングのプラットフォーム名（`"telegram"`、`"discord"` など）。分からなければ空文字列です。 |
| `reason` | `str` | エージェントが中断された理由（たとえば `"user_stop"`、作り直し / 新規の理由）。 |
| `invalidation_reason` | `str` | 待ち行列のセッションの状態が無効にされた理由（たとえば `"stop_command"`、`"stop_command_thread_sibling"`、`"stop_command_chat_scope"`、`"reset_command"`）。 |

**発火する場所:** `gateway/run_agent_cache.py::_interrupt_and_clear_session` の中、`request_hard_interrupt()` が動いているエージェントに割り込んだ直後です。本当にエージェントが動いていたときだけで、保留の目印による `/stop` の経路（エージェントのループがまだ始まっていない）ではこのフックは発火**しません**。手放すべき進行中の作業がないからです。遅いほうの `/new` の作り直しの経路では、代わりに `_handle_reset_command` の中であとから `on_session_finalize` が発火します。

**戻り値:** 無視されます。

**使いどころ:** ループが決して使わないツールの結果を待って止まっている外部の要求を取り消す、ツールの呼び出しが放棄されたことを、つながっている音声 / 即時のクライアントへ知らせる、動いているやり取りの間だけ持っていた資格情報やロックを手放す。

---

### `subagent_start` {#subagentstart}

`delegate_task` が子の `AIAgent` を組み立てたあと、その子が動く前に、**子のエージェントごとに 1 回**発火します。1 つの作業を委ねても、3 つまとめて委ねても、このフックは子ごとに 1 回ずつ発火します。

このフックは委任 / サブエージェントのライフサイクルに固有のものです。ゲートウェイ、CLI、cron、一括処理、MoA、その他の実行元から始まるエージェントの実行すべてに対する「どんなエージェントの呼び出しの前でも」という関門ではありません。

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
| `parent_session_id` | `str \| None` | 委任した親のエージェントのセッション ID。 |
| `parent_turn_id` | `str` | 分かる場合の、委任を求めた親のやり取りの ID。 |
| `parent_subagent_id` | `str \| None` | この子が別のサブエージェントから起こされた場合の、親のサブエージェント ID。最上位の親のエージェントでは `None` です。 |
| `child_session_id` | `str \| None` | 子のエージェントに割り当てられたセッション ID。 |
| `child_subagent_id` | `str` | 委任の観測と制御で使われる、安定したサブエージェント ID。 |
| `child_role` | `str` | 委任の方針が適用されたあとの、実際の子の役割。たとえば `"leaf"` や `"orchestrator"`。 |
| `child_goal` | `str` | 子のエージェントが実行する、委ねられた目的 / 指示。 |

**発火する場所:** `tools/delegate_tool.py` の `_build_child_agent()` の中、子の `AIAgent` が組み立てられてサブエージェントの身元の情報が付いたあと、`_run_single_child()` が子を動かす前です。

**戻り値:** 無視されます。これは観測だけのフックで、値を返しても子のエージェントの実行を遮ったり変えたりはしません。

**使いどころ:** サブエージェントの生成の記録、親と子のセッションの対応付け、入れ子の委任の木の追跡、実行前の監査の記録、子ごとの観測の資源の先取り。

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
`subagent_start` は委任の様子を見るのに役立ちますが、遮断のための方針のフックではありません。子が組み立てられる前に委任を遮るには、[`pre_tool_call`](#pre_tool_call) で `delegate_task` のツールの呼び出しを遮ってください。
:::

---

### `subagent_stop` {#subagentstop}

`delegate_task` が終わったあと、**子のエージェントごとに 1 回**発火します。1 つの作業を委ねても、3 つまとめて委ねても、このフックは子ごとに 1 回ずつ発火します。振り分けは、子の処理が出そろったあとに親のスレッドで順に行われ、Python のコールバックの本体はどれも、その同じ呼び出し元のスレッドで動きます（時間の上限のある作業役ではありません）。

**コールバックの形:**

```python
def my_callback(parent_session_id: str, child_role: str | None,
                child_summary: str | None, child_status: str,
                tool_call_history: list[dict], duration_ms: int, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `parent_session_id` | `str` | 委任した親のエージェントのセッション ID |
| `child_role` | `str \| None` | 子に設定された取りまとめの役割の札（機能が有効でなければ `None`） |
| `child_summary` | `str \| None` | 子が親へ返した最後の応答 |
| `child_status` | `str` | `"completed"`、`"failed"`、`"interrupted"`、`"error"` のいずれか |
| `tool_call_history` | `list[dict]` | 情報だけの、順に並んだツールの呼び出し。`tool_name`、上限のある `tool_input`、`input_bytes`、`output_bytes`、`status` です。素の入力と出力は含まれません |
| `duration_ms` | `int` | 子を動かすのにかかった実際の時間（ミリ秒） |

**発火する場所:** `tools/delegate_tool.py` の中、`ThreadPoolExecutor.as_completed()` がすべての子の処理を出し切ったあとです。`invoke_hook("subagent_stop", ...)` は親のスレッドへ渡されるので、書く人が子の処理の取り合いを気にせずに済みますし、コールバックはその呼び出し元のスレッドに留まります。

**戻り値:** 無視されます。

**使いどころ:** 取りまとめの活動の記録、請求のための子の所要時間の積み上げ、委任のあとの監査の記録の書き出し。

**例 — 取りまとめの活動を記録する:**

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
委任が多い場合（取りまとめの役割 × 5 つの末端 × 入れ子の深さなど）、`subagent_stop` は 1 回のやり取りで何度も発火します。コールバックは速く保ち、重い処理は背後の待ち行列へ回してください。
:::

---

### `pre_gateway_dispatch` {#pregatewaydispatch}

ゲートウェイで、内部のイベントの判定のあと、認証 / ペアリングとエージェントの振り分けの**前**に、**受信した `MessageEvent` ごとに 1 回**発火します。ここは、どのプラットフォームのアダプターにもきれいに収まらない、ゲートウェイの段階でのメッセージの流れの方針（聞くだけの時間帯、人への引き継ぎ、チャットごとの振り分けなど）を差し込む地点です。

**コールバックの形:**

```python
def my_callback(event, gateway, session_store, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `event` | `MessageEvent` | 正規化された受信メッセージ（`.text`、`.source`、`.message_id`、`.internal` などを持ちます）。 |
| `gateway` | `GatewayRunner` | 動いているゲートウェイの実行役。プラグインが `gateway.adapters[platform].send(...)` を呼んで、別経路の返信（持ち主への通知など）を出せます。 |
| `session_store` | `SessionStore` | `session_store.append_to_transcript(...)` で、黙って記録に取り込むためのものです。 |

**発火する場所:** `gateway/run.py` の `GatewayRunner._handle_message()` の中、`is_internal` が決まった直後です。**内部のイベントはこのフックを丸ごと飛ばします**（それらはシステムが作るもの — 背後の処理の完了など — で、利用者向けの方針で止められてはならないからです）。

**戻り値:** `None` か辞書です。最初に認識された動作の辞書が勝ち、残りのプラグインの結果は無視されます。プラグインのコールバックの例外は捕まえて記録され、エラーのときゲートウェイは必ずふつうの振り分けへ流れます。

コールバックは `async def` でも構いません。ゲートウェイ自身のイベントループで待たれるので、ループに紐づいた待ち（`asyncio.Event`、aiohttp のセッション、`asyncio.to_thread`）も進みますし、コールバックが動いている間も他の受信メッセージは流れ続けます。このフックは意図して `plugins.hook_callback_timeout` の対象にしていません。時間切れでメッセージを捨てるのも通すのも、方針の関門としては誤りだからです。そのため、決して返らないコールバックは、そのメッセージの振り分けを止め続けます。

| 戻り値 | 効果 |
|--------|--------|
| `{"action": "skip", "reason": "..."}` | メッセージを捨てます。エージェントの返信も、ペアリングの流れも、認証もありません。プラグインが扱った（たとえば記録へ黙って取り込んだ）という前提です。 |
| `{"action": "rewrite", "text": "new text"}` | `event.text` を置き換え、変えたイベントでふつうの振り分けを続けます。溜めておいた周囲のメッセージを 1 つの指示にまとめるのに便利です。 |
| `{"action": "allow"}` / `None` | ふつうの振り分け。認証 / ペアリング / エージェントのループの流れを全部通ります。 |

**使いどころ:** 聞くだけのグループチャット（呼ばれたときだけ応じ、周りのメッセージは文脈として溜める）、人への引き継ぎ（持ち主が手で対応する間、顧客のメッセージを黙って取り込む）、プロファイルごとの回数の制限、方針による振り分け。

**例 — ペアリングのコードを出さずに、認可されていない DM を黙って捨てる:**

```python
def deny_unauthorized_dms(event, **kwargs):
    src = event.source
    if src.chat_type == "dm" and not _is_approved_user(src.user_id):
        return {"action": "skip", "reason": "unauthorized-dm"}
    return None

def register(ctx):
    ctx.register_hook("pre_gateway_dispatch", deny_unauthorized_dms)
```

**例 — 溜めた周囲のメッセージを、呼ばれたときに 1 つの指示へ書き換える:**

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

対応しているプラットフォーム固有のイベントについて、ゲートウェイの通常のプロファイル単位の認可の判定が通った**あと**にだけ発火します。コールバックが受け取るのは素の辞書です。SDK のオブジェクト、アダプターの操作手段、ボットのクライアント、コールバックの文脈が、この安定した約束の一部になることはありません。

Telegram のメッセージへのリアクションが最初に対応したイベントで、そのあとメッセージの編集、削除、スレッドのライフサイクルのイベントが続きました。

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
| `platform` | `str` | 安定したプラットフォームの id（`"telegram"`、`"discord"`）。 |
| `event_type` | `str` | イベントごとの約束の id（下の表を参照）。 |
| `payload` | `dict` | イベント種別ごとの項目。下でイベント種別ごとに説明します。 |

どの中身も足していく形で、イベントごとに固有です。ゲートウェイ全体で 1 つの中身の版があるわけではありません。id はすべて文字列で、無い / 分からない項目は `None` であり、推測されることはありません。壊れたイベントと、送り元を認可できないイベントは捨てられます（閉じる側へ倒れます）。Telegram の Application が一時的に作り直されると、観測役も中核の処理と一緒に登録し直されます。

**イベントごとの中身の約束（v1、足していく形）:**

| `event_type` | プラットフォーム | 中身の項目 |
|--------------|-----------|----------------|
| `reaction` | telegram | `emojis: list[str]`、`custom_emoji_ids: list[str]`、`chat_id: str`、`message_id: str`、`thread_id: str \| None`（Telegram のリアクションの更新はトピックの id を運ばないので、いまのところ常に `None` です）。 |
| `message_edited` | telegram, discord | `chat_id: str`、`message_id: str`、`thread_id: str \| None`、`text: str \| None`（編集された本文か説明文。長さに上限があり、メディアだけの編集やキャッシュにないときは `None`）、`edited_at: str \| None`（ISO 8601）。 |
| `message_deleted` | discord | `chat_id: str`、`message_id: str`、`thread_id: str \| None`、`author_id: str \| None`。Discord の削除のイベントは削除した人を示さないので、認可の対象は削除されたメッセージの書き手です。キャッシュにない削除では発火しません。 |
| `thread_created` | discord | `thread_id: str`、`parent_chat_id: str \| None`、`name: str \| None`、`owner_id: str \| None`。 |
| `thread_renamed` | discord | `thread_id: str`、`parent_chat_id: str \| None`、`old_name: str \| None`、`new_name: str`。名前が実際に変わったときにだけ発火します。それ以外のスレッドの更新（アーカイブ、低速モード、タグ）は捨てられます。Discord のスレッドの更新のイベントは誰が行ったかを運ばないので、認可の対象はスレッドの持ち主です。 |

ボット自身の少しずつのメッセージの編集（逐次表示）が Discord で `message_edited` を発火させることはありません。ボットが書いたイベントは発火の地点で捨てられます。

このフックは観測専用です。素のイベントへの経路もアダプターへの経路も**足しません**。**素の SDK の中身へのアクセスは意図して提供していません**。アダプターの SDK のオブジェクトは断りなく形が変わるので、育てられない API の面になってしまいます。本当に必要な場合は、「安定の保証なし」と明示した独自の能力（`gateway.raw_events`）と、それ自身の設計が要ります（#64228 で追っています）。プラットフォームに対して*何かをする*（リアクションを付ける、スレッドの名前を変える）には、[プラグインの手引き](/hermes/docs/user-guide/features/plugins/#platform-actions) にある、能力で制御される `ctx.platform_actions` の窓口を使ってください。これは `gateway.platform_actions` の能力の後ろで、既定では無効です。`PluginContext.dispatch_tool()` が呼べるのは、ツールの登録簿に登録されたツールだけです。`send_message` は意図してそこに登録されていません（その伝送は、CLI、cron、カンバン、MCP という明示的な配信の経路のために取ってあります）。将来の送信の約束は、まずすべてのアダプターで、届いた内容と操作手段が安定して得られるようにする必要があります。この範囲では、動かない `gateway_message_delivered` のフックを先に登録することはしません。

---

### `pre_approval_request` {#preapprovalrequest}

承認の判断が求められる前に発火します。問い合わせを出す入口 — 対話型の CLI、Ink の TUI、ゲートウェイのプラットフォーム、ACP のクライアント — と、人に尋ねずに決まる `approvals.mode=smart` の判断（`surface="smart"`）を対象にします。賢いモードでは、補助の LLM が呼ばれる前にこのフックが動きます。

独自の通知を組み込むならここが適しています。たとえば、許可 / 拒否の通知を出す macOS のメニューバーのアプリや、承認の要求を文脈ごと記録する監査のログです。

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
| `command` | `str` | 判定されているターミナルのコマンドか `execute_code` のスクリプト。賢い経路とゲートウェイの中身は、観測役へ渡る前に伏せ字にされます。賢い観測での伏せ字は、`security.redact_secrets` が無効でも必須です。伏せ字に失敗した場合、賢い経路のフックは飛ばされます。 |
| `description` | `str` | そのコマンドが引っかかった、人が読める理由（複数の型に一致した場合はまとめられます） |
| `pattern_key` | `str` | 承認を起こした主な型のキー（たとえば `"rm_rf"`、`"sudo"`） |
| `pattern_keys` | `list[str]` | 一致したすべての型のキー |
| `session_key` | `str` | セッションの識別子。チャットごとに通知を分けるのに便利です |
| `surface` | `str` | 対話型の CLI / TUI の問い合わせなら `"cli"`、プラットフォームの非同期の承認なら `"gateway"`、補助の LLM による自動の許可 / 拒否なら `"smart"` |

**戻り値:** 無視されます。ここのフックは観測専用で、承認を覆したり先回りして答えたりはできません。ツールが承認の仕組みに届く前に遮るには [`pre_tool_call`](#pre_tool_call) を使ってください。

**使いどころ:** デスクトップの通知、携帯への通知、監査の記録、Slack の Webhook、上位への回付、指標。

**例 — macOS でデスクトップの通知を出す:**

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

問い合わせや賢い承認の判断のあと、問い合わせが時間切れになるか取り下げられたあと（答えが出る前にやり取りが中断されたか終わった場合）、あるいはゲートウェイが承認の通知を届けられなかったときに発火します。通知の失敗では、承認の判断がまだ存在しない段階で `choice="notify_failed"` が出ます。

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

`pre_approval_request` と同じキーワード引数に加えて、次があります。

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `choice` | `str` | 問い合わせの入口では `"once"`、`"session"`、`"always"`、`"deny"`、`"timeout"`、`"cancelled"`（誰も答えなかった場合 — やり取りが中断されたか終わったために問い合わせが取り下げられた、あるいは CLI で承認のコールバックが失敗した、prompt_toolkit の下でコールバックが登録されていなかった、読み取りが中断されたなどで利用者に届かなかった場合。コマンドは実行されていません）、または `"notify_failed"` です。賢い判断では `"smart_approve"` か `"smart_deny"` を使います |
| `decided_by` | `str` | 賢い判断では `"aux_llm"`。問い合わせの入口ではありません |

**戻り値:** 無視されます。

**使いどころ:** 対応するデスクトップの通知を閉じる、最後の判断を監査の記録に残す、指標を更新する、回数の制限を進める。

```python
def log_decision(command, choice, session_key, **kwargs):
    logger.info("approval %s: %s for session %s", choice, command[:60], session_key)

def register(ctx):
    ctx.register_hook("post_approval_response", log_decision)
```

---

### `on_room_member_activity` {#onroommemberactivity}

ホストされた [グループチャット](/hermes/docs/user-guide/bot-mode/#groups-and-group-chats) のメンバーのやり取りが動いている間に発火します。メンバーは、どのクライアントもつながっていない隠れた `Group: <room>` のセッションで動くので、部屋の記録の `turn.started` と `turn.settled` の間、そのやり取りは中の見えない箱です。このフックは、そのセッションがすでに出している実行時のイベント — ツールの開始 / 完了、承認の要求、逐次のテキストと推論、エラー — を部屋の座標を付けて外へ出すので、クライアント（Hermes Crew、盤、監査の記録）が、文章から推し量ることなくツールのカード、承認の問い合わせ、メンバーの状態を描けます。実行、順番の管理、残る記録はグループチャットの実行部が持ち続け、プラグインは見るだけです。

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
| `room_id`、`thread_id`、`turn_id`、`task_id` | `str` | 部屋の記録の `turn.*` と `message.member` のイベントが運ぶのと同じ座標です。これで突き合わせてください。 |
| `member_id` | `str` | 席についているメンバー（`groups.state` の `members[].member_id`）。 |
| `execution_generation` | `int` | 同じ作業を再試行するたびに増えます。差し替えられた試みのイベントは、古い値を持ちます。 |
| `kind` | `str` | `tool.started`、`tool.completed`、`tool.output_risk`、`request.opened`（承認）、`message.delta`、`message.interim`、`reasoning.delta`、`turn.error`。新しい種類は足されていきます。 |
| `seq` | `int \| None` | メンバーのセッションの、プロセスごとのイベントの通し番号（`session.events.since` と同じ番号付け）。1 つのゲートウェイのプロセスの中では単調に増え、再起動でゼロに戻ります。 |
| `payload` | `dict` | 元のセッションのイベントの、クライアントに渡して安全な本体（`tool_id`、`name`、`args`、`result`、`request_id`、`choices`、`text` など）。承認のコマンドは資格情報が伏せ字にされています。 |

**届き方:** 登録された各コールバックが、自分の上限付きの待ち行列と作業役のスレッドを持ちます（`on_stream_*` と同じ仕組み）。遅いコールバックは自分の最も古い保留のイベントを落とすだけで、メンバーのやり取りを遅らせることはありません。部屋の記録には何も書かれません。差分は残らず、再生もされません。残したいクライアントは、受け取ったものを自分で保存してください。対象は同じ機械のメンバーだけです。別の機械から席についたメンバーは、その機械のゲートウェイで動き、そちらのプラグインから見えます。

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

音声認識の振り分け役（`tools.transcription_tools.transcribe_audio`）の中で、プロバイダーが決まった**あと**、どのバックエンドが呼ばれるより**前**に発火します。そのバックエンドが組み込みでも、`type: command` のプロバイダーでも、プラグインが登録したものでも同じです。あとから文字起こしを見るだけでなく、文字起こしの要求そのものをプラグインが導けます。

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
| `file_path` | `str` | これから文字起こしされる音声ファイルの絶対パス。読み取り専用です。 |
| `provider` | `str` | 決まった音声認識のプロバイダー（`local`、`groq`、`openai`、`mistral`、`xai`、`elevenlabs`、`deepinfra`、`local_command`、コマンド型のプロバイダー名、プラグインのプロバイダー名）。 |
| `model` | `str \| None` | そこまでで決まったモデル。バックエンドの既定が使われる場合は `None`。 |
| `language` | `str \| None` | プロバイダーの設定の節にある言語、なければ `None`。 |
| `prompt` | `str \| None` | 固定の [`stt.prompt`](/hermes/docs/user-guide/configuration/#transcription-prompt-vocabulary-hints) の値、なければ `None`。 |
| `source` | `str \| None` | 呼び出し元の入口の札（`gateway`、`voice_mode` など）。観測のためだけで、振り分けには使われません。 |

**戻り値:** `"prompt"`、`"language"`、`"model"` のいずれかを文字列に対応付けた `dict`、あるいは要求を変えないなら `None` です。文字列でない値、知らないキー、`file_path` は無視されます（`file_path` を変えようとすると警告が記録されます）。結果は `stt.prompt` の設定値の上に、**登録の順で、項目ごとに最後の書き手が勝つ**形で適用されます。`prompt` に `""` を返すと、その要求について設定されたプロンプトが消えます。

**使いどころ:** 音声を送る前に、利用者ごと / チャットごとの語彙の一覧を差し込む、呼び出し元の地域から `language` を決める、長い録音では `model` を軽いものにする、雑音の多い入力を別のモデルへ回す。

```python
VOCAB = "Hermes, Teknium, Nous Research, kanban"

def add_vocab(provider, prompt, source, **kwargs):
    if source != "gateway":
        return None
    return {"prompt": f"{prompt}. {VOCAB}" if prompt else VOCAB}

def register(ctx):
    ctx.register_hook("pre_transcription", add_vocab)
```

すべてのバックエンドがプロンプトを受け付けるわけではありません。`local` は faster-whisper の `initial_prompt` に対応付けます。`openai`、`groq`、`mistral`、`deepinfra` は `prompt` として送ります。`xai`、`elevenlabs`、`local_command`、`type: command` のプロバイダーは DEBUG に記録して、それなしで文字起こしします。対応の全体とプライバシーの境界は [プロバイダーの対応の表](/hermes/docs/user-guide/configuration/#transcription-prompt-vocabulary-hints) を参照してください。フックの受け渡しのエラーは開く側へ倒れます。変えられていない要求のまま振り分けが続きます。

---

### `transform_tool_result` {#transformtoolresult}

ツールが返った**あと**、その結果が会話へ足される**前**に発火します。ターミナルの出力だけでなく、どのツールの結果の文字列でも、モデルが見る前にプラグインが書き換えられます。

**コールバックの形:**

```python
def my_callback(tool_name: str, args: dict, result: str, task_id: str, **kwargs) -> str | None:
```

渡される中身には `session_id`、`tool_call_id`、`turn_id`、`api_request_id`、`duration_ms`、`status`、`error_type`、`error_message` も含まれます。`result` はツールの振り分けが返した最後の結果で、これと `args` には任意の利用者 / ツールの内容や秘密の情報が含まれ得ます。

**戻り値:** 最初の `str` が結果を置き換えます（空文字列も含みます）。`None` なら変わりません。

**使いどころ:** `web_extract` の出力から組織固有の個人情報を伏せる、長い JSON のツールの応答に要約の見出しを付ける、`read_file` の結果に検索で補った手がかりを差し込む、`delegate_task` のサブエージェントの報告をプロジェクト固有の形へ書き換える。

```python

SECRET = re.compile(r"sk-[A-Za-z0-9]{32,}")

def redact_secrets(tool_name, result, **kwargs):
    if SECRET.search(result):
        return SECRET.sub("[REDACTED]", result)
    return None

def register(ctx):
    ctx.register_hook("transform_tool_result", redact_secrets)
```

すべてのツールに適用されます。ターミナルだけを書き換えたい場合は、下の `transform_terminal_output` を見てください。そちらはもっと狭く、`transform_tool_result` より前に動き、その置き換えもターミナルのツールの最後の出力の制限を受けます。

---

### `transform_terminal_output` {#transformterminaloutput}

`terminal` のツールの中で、前面のプロセスの出力が実行環境によってすでに上限をかけられたあと、最後の出力の制限の前に発火します。プラグインが、受け取った標準出力 / 標準エラーを置き換えられます。その置き換えも、最後の出力の制限を受けます。

背後のプロセスの出力が、モデルやチャットへ向かう途中でも発火します。`process_manage` の `poll` / `wait` / `log` / `kill` の結果（と `list` の下書き）、それに完了、鼓動、見張りの型の通知です。そこでは、プロセスがまだ動いている間 `returncode` は `None` で、`env_type` は空文字列です（実行環境はプロセスごとには記録されません）。どちらの場合も、このフックは秘密の情報の伏せ字より*前*に動くので、置き換えに資格情報が残っていても伏せられます。

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
| `output` | `str` | 上限付きで受け取った標準出力 / 標準エラーをまとめたもの。 |
| `returncode` | `int` | プロセスの戻り値。 |
| `task_id` | `str` | 実際のタスクの識別子、または空文字列。 |
| `env_type` | `str` | 実行環境の種類。 |

**戻り値:** 最初の `str` が出力を置き換えます。`None` なら変わりません。コマンドと出力には、資格情報などの機微な情報が含まれ得ます。

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

`transform_tool_result` と組み合わさります。そちらは `terminal` を含むすべてのツールについて、あとから動きます。

---

### `transform_llm_output` {#transformllmoutput}

ツールを呼ぶループが終わってモデルが最後の応答を作ったあと、その応答が利用者（CLI、ゲートウェイ、プログラムからの呼び出し）へ届く**前**、そしてアシスタントの行が保存される**前**に、**やり取りごとに 1 回**発火します。置き換えたものがセッションに残り、`/resume` で見えるものになり、次のやり取りが再生するものになるので、記録が利用者の見たものとずれることはありません。Hermes 自身の末尾（ファイルの変更の警告、異常終了の注記）はそのあとに足されるもので、`response_text` の一部ではありません。プラグインが、ふつうのプログラムのやり方でアシスタントの最後の文章を書き換えられます。人格の味付けやスキルによる変換に、余計な推論のトークンを使いません。

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
| `response_text` | `str` | このやり取りでのアシスタントの最後の応答の文章。 |
| `session_id` | `str` | この会話のセッション ID（1 回きりの実行では空のことがあります）。 |
| `model` | `str` | その応答を作ったモデル名（たとえば `anthropic/claude-sonnet-4.6`）。 |
| `platform` | `str` | 配信のプラットフォーム（`cli`、`telegram`、`discord` など。未設定なら空）。 |

**戻り値:** 空でない `str` で応答の文章を置き換え、`None` か空文字列なら変えません。複数のプラグインが登録している場合、**最初の空でない文字列が勝ちます**。ツールとターミナルの変換と違い、空文字列は置き換えとして受け付けられません。

**使いどころ:** 人格や語彙の変換（海賊風、スポンジボブ風）を当てる、最後の文章から利用者固有の識別子を伏せる、プロジェクト固有の署名を足す、人格の指示にトークンを使わずに文体の決まりを守らせる。

CLI の逐次表示が有効なとき、足すだけの変換は逐次の本文のあとに表示されます。
応答を置き換える変換は、逐次の本文のあとに全文が、逐次表示のあとの変換である
ことを示す札とともに表示されるので、置き換えた内容が黙って失われることは
ありません。

```python

def spongebob(response_text, **kwargs):
    if os.environ.get("SPONGEBOB_MODE") != "on":
        return None  # pass through unchanged
    return re.sub(r"!", "!! Tartar sauce!", response_text)

def register(ctx):
    ctx.register_hook("transform_llm_output", spongebob)
```

このフックは、空でなく中断もされていない応答であることを条件にしています。停止のボタンによる中断や空のやり取りでは発火しません。例外は警告として記録され、エージェントの実行を壊しません。

### API の要求の観測のフック {#api-request-observer-hooks}

#### `pre_api_request` {#preapirequest}

プロバイダーへの試みごとに、送る直前に発火します。観測専用です。以前からある `user_message`、`conversation_history`、`request_messages` の項目は互換のために素のまま、意図して整えられていません。新しく使う場合は、整えられた `request` の包みのほうを選んでください。

#### `post_api_request` {#postapirequest}

プロバイダーの応答が問題なく正規化されたあとに発火します。観測専用です。整えられた `response` のほうを使ってください。`assistant_message` は素の正規化されたメッセージで、`usage` には集計のデータが入ります。

#### `api_request_error` {#apirequesterror}

プロバイダーへの試みが失敗したときに、状態 / 再試行の時間、`error` のオブジェクト、整えられた `request` とともに発火します。観測専用です。エラーの文言には、プロバイダーや利用者のデータが残っていることがあります。

### 補助の呼び出しの観測のフック {#auxiliary-call-observer-hooks}

#### `pre_auxiliary_call` / `post_auxiliary_call` {#preauxiliarycall-postauxiliarycall}

補助の LLM の呼び出し — セッションの題名付け、文脈の圧縮、MoA の助言役とまとめ役、画像、承認の分類、記憶などの周辺の作業 — は、主のツールのループの外で動き、`pre_api_request` / `post_api_request` を発火させ**ません**（あちらはやり取りの範囲に留まるので、やり取りごとに追跡するプラグインが周辺の通信をうっかり見ることはありません）。代わりに `pre_auxiliary_call` / `post_auxiliary_call` を購読してください。プロバイダーへの実際の試みごとに 1 回（再試行と代替も含めて）、同じ中身の形に加えて `aux_task`（作業の名前。たとえば `title_generation`、`compression`、`moa_aggregator`、`vision`）とともに発火します。`session_id` / `task_id` / `turn_id` は、やり取りの下で動いている場合は親のやり取りのもの、そうでなければ空です。`api_request_id`（`aux-…`）は 1 つの論理的な呼び出しのすべての試みで共通で、`retry_count` がそれらを区別します。どちらも観測専用で、開く側へ倒れます。例外を投げたり時間切れになったりしたコールバックは記録され、補助の作業は続きます。`post_auxiliary_call` は、試みが例外を投げた場合に `error` / `error_type` を、応答が流れとして返された場合に `streaming: True`（このとき `usage`/`response` は `None`）を運びます。

### `on_skill_lifecycle` {#onskilllifecycle}

スキルの利用の状態が確定的に変わったあとに発火します。観測専用で、手元の `skill_name`、出どころ、突き合わせの ID、利用の回数、再利用の印を渡します。

### カンバンのライフサイクルの観測役 {#kanban-lifecycle-observers}

#### `kanban_task_claimed` {#kanbantaskclaimed}

ディスパッチャーのプロセスで取り掛かりが確定したあと、ワーカーの起動の直前に発火します。

#### `kanban_task_completed` {#kanbantaskcompleted}

完了と片付けのあと、ふつうはワーカーのプロセスで発火します。その `summary` には、プロジェクトや利用者の内容が含まれることがあります。

#### `kanban_task_blocked` {#kanbantaskblocked}

ふつうのブロックへの遷移のあとに発火します。依存の待ちの経路では、その書き込みのトランザクションを抜ける前に呼ばれます。その `reason` には、プロジェクトや利用者の内容が含まれることがあります。

カンバンの 3 つのフックはどれも観測専用で、`task_id`、`profile_name`、`board`、`assignee`、`run_id` を運びます。完了ではこれに `summary` が、ブロックでは `reason` が加わります。

### カンバンのワーカーのライフサイクル、タスクの変更、振り分けの観測役 {#kanban-worker-lifecycle-task-mutation-and-dispatch-observers}

追加の 5 つの観測役（RFC #58548）が、カンバンのまとまりを広げます。どれも観測専用で、対象のトランザクションが確定したあとに発火し、`has_hook` で早く抜けます。購読者がいなければ、振り分けの振る舞いは変わりません。タスクの範囲のフックは、上のフックと同じ共通の項目を運びます。

- **`on_kanban_worker_spawned`** — `spawn_fn` が返り、ワーカーの PID が保存されたあと。`worker_pid`（`None` のことがあります）と `workspace_path` が加わります。振り分けのロックの中で動くので、コールバックは速く保ってください。
- **`on_kanban_worker_exited`** — まわりに由来し、`detect_crashed_workers` が PID の死んだタスクを回収したとき。`worker_pid`、`exit_kind`、`exit_code`、`outcome`、`retry_status` が加わります。
- **`on_kanban_worker_stale_claim`** — TTL の切れた取り掛かりが回収されたとき。PID が生きている延長では発火しません。`worker_pid`、`heartbeat_stale`、`retry_status` が加わります。
- **`on_kanban_task_updated`** — 取り掛かり / 完了 / ブロックのライフサイクルの外でタスクの項目の書き込みが確定したあと（`assign_task`、モデル / 推論の上書き、ダッシュボードの編集画面）。`changed_fields` が加わります。項目名だけで、値は決して入りません。
- **`on_kanban_dispatch_tick`** — ディスパッチャーのまわりごとに 1 回、振り分けのロックが外れたあとで確実に。何もしないまわりや、ロックの取り合いのあったまわりも含みます。中身は `board`、`profile_name`、`dry_run`、`outcome`、`result` です。

---

## シェルのフック {#shell-hooks}

プロファイルの `config.yaml` にシェルのスクリプトのフックを宣言しておくと、対応するプラグインのフックのイベントが発火するたびに、Hermes がそれを子のプロセスとして実行します。CLI、ゲートウェイ、デスクトップ、TUI、ダッシュボードのチャットのセッションで動きます。Python のプラグインを書く必要はありません。

デスクトップ、TUI、ダッシュボードのチャットは、エージェントを組み立てるときに、そのセッションのプロファイルの設定と同意の許可一覧を使ってフックを登録します。プロファイルを切り替えても、別のプロファイルのフックが使い回されることはありません。既存のフックの同意の要求と安全モードの振る舞いはそのまま効きます。承認されていないフックは、黙って承認されるのではなく飛ばされます。

置くだけの 1 枚のスクリプト（Bash、Python、シェバンのあるもの何でも）で次のことをしたいときに、シェルのフックを使ってください。

- **ツールの呼び出しを遮る、あるいは変える** — 危険な `terminal` のコマンドを拒む、ディレクトリごとの方針を効かせる、壊す恐れのある `write_file` / `patch` の操作に承認を求める、ツールが動く前に引数を書き換える（パスを整える、既定値を差し込む）。
- **ツールの呼び出しのあとに動かす** — エージェントがいま書いた Python や TypeScript のファイルを自動で整える、API の呼び出しを記録する、CI の流れを起こす。
- **次の LLM のやり取りへ文脈を差し込む** — `git status` の出力、今日の曜日、取り出した文書を、利用者のメッセージの前に足す（[`pre_llm_call`](#pre_llm_call) を参照）。
- **ライフサイクルのイベントを見る** — サブエージェントが終わったとき（`subagent_stop`）やセッションが始まったとき（`on_session_start`）にログの行を書く。

シェルのフックは、CLI の起動時（`hermes_cli/main.py`）とゲートウェイの起動時（`gateway/run.py`）の両方で `agent.shell_hooks.register_from_config(cfg)` を呼んで登録されます。Python のプラグインのフックとも自然に組み合わさります。どちらも同じ振り分け役を通るからです。

### ひと目で分かる比較 {#comparison-at-a-glance}

| 観点 | シェルのフック | [プラグインのフック](#plugin-hooks) | [ゲートウェイのフック](#gateway-event-hooks) |
|-----------|-------------|-------------------------------|---------------------------------------|
| 宣言する場所 | `~/.hermes/config.yaml` の `hooks:` ブロック | `plugin.yaml` のプラグインの `register()` | `HOOK.yaml` + `handler.py` のディレクトリ |
| 置き場所 | `~/.hermes/agent-hooks/`（慣例） | `~/.hermes/plugins/<name>/` | `~/.hermes/hooks/<name>/` |
| 言語 | 何でも（Bash、Python、Go のバイナリなど） | Python のみ | Python のみ |
| 動く場所 | CLI + ゲートウェイ | CLI + ゲートウェイ | ゲートウェイのみ |
| イベント | `VALID_HOOKS`（`subagent_stop` を含む） | `VALID_HOOKS` | ゲートウェイのライフサイクル（`gateway:startup`、`agent:*`、`command:*`） |
| ツールの呼び出しを遮れるか | はい（`pre_tool_call`） | はい（`pre_tool_call`） | いいえ |
| LLM の文脈を差し込めるか | はい（`pre_llm_call`） | はい（`pre_llm_call`） | いいえ |
| 同意 | `(event, command)` の組ごとに初回の確認 | 明示的（`plugins.enabled`）、そのあとプロセス内で信頼 | 暗黙（[ディレクトリへの信頼](#gateway-hook-trust)） |
| プロセスの分離 | あり（子のプロセス） | なし（プロセス内） | なし（プロセス内） |

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

イベント名は [プラグインのフックのイベント](#plugin-hooks) のどれかである必要があります。打ち間違いは「Did you mean X?」の警告を出して飛ばされます。1 つの項目の中の知らないキーは無視され、`command` が無い場合は警告とともに飛ばされます。`timeout > 300` は警告とともに丸められます。`pre_tool_call` 以外のイベントでの `fail_closed: true` は警告されて無視されます（遮断できるイベントだけが閉じる側へ倒れられます）。

Windows では、`command` が実在するスクリプトのファイルで始まる場合 — 下の例で使っている `~/.hermes/agent-hooks/x.sh` の形 — そのファイル自身の実行系（`.sh`/`.bash` なら Git Bash、`.py` なら動いている Hermes の Python）を通して起動されます。`CreateProcess` にはシェバンの対応がなく、素のスクリプトは `WinError 193` で拒否されるからです。それ以外のコマンドと、POSIX のプラットフォームでは、`argv` がそのまま `Popen` へ渡され、カーネルがシェバンを解釈します。

### JSON のやり取りの決まり {#json-wire-protocol}

イベントが発火するたび、Hermes は（照合の条件を満たす）フックごとに子のプロセスを起こし、JSON の中身を**標準入力**へ流し、**標準出力**を JSON として読み取ります。

**標準入力 — スクリプトが受け取る中身:**

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

`profile` は、そのフックを発火させた Hermes のプロファイル名です（プロファイルの外では `"default"`）。1 つの
スクリプトで、多重化されたゲートウェイの背後のすべてのプロファイルに対応できます。子のプロセスは、その
プロファイルの `HERMES_HOME` でも動きます。ツール以外のイベント（`pre_llm_call`、`subagent_stop`、セッションのライフサイクル）では、`tool_name` と `tool_input` は `null` です。`extra` の辞書は、そのイベント固有のキーワード引数（`user_message`、`conversation_history`、`child_role`、`duration_ms` など）をすべて運びます。直列化できない値は、省かれるのではなく文字列にされます。

**標準出力 — 任意の応答:**

```jsonc
// Block a pre_tool_call (both shapes accepted; normalised internally):
{"decision": "block", "reason":  "Forbidden: rm -rf"}   // Claude-Code style
{"action":   "block", "message": "Forbidden: rm -rf"}   // Hermes-canonical

// Modify a pre_tool_call — rewrite tool args before dispatch:
{"action": "modify", "args": {"new_string": "fixed content"}}         // Hermes-canonical
{"decision": "modify", "tool_input": {"new_string": "fixed content"}} // Claude-Code style

// Escalate a pre_tool_call to the human-approval gate (Hermes-only; `message` and `rule_key`
// are optional). Claude-Code's `{"decision": "approve"}` means auto-allow and is NOT mapped here:
{"action": "approve", "message": "Why approval is required", "rule_key": "optional:scope"}

// Inject context for pre_llm_call:
{"context": "Today is Friday, 2026-04-17"}

// Keep the agent going at the verify gate (pre_verify); both shapes accepted:
{"action": "continue", "message": "Run the formatter, then finish."}
{"decision": "block",  "reason":  "Run the formatter, then finish."}

// Silent no-op — any empty / non-matching output is fine:
```

壊れた JSON、0 以外の終了コード、時間切れは警告を記録しますが、エージェントのループを止めることは決してありません。

### 終了コード 2 = 遮断（Claude Code / Cursor と互換） {#exit-code-2-block-claude-code-cursor-compatible}

終了コード **2** で終わった `pre_tool_call` のフックは、標準出力に遮断の JSON がなくてもツールの呼び出しを遮ります。遮断の文言は、次の優先の順で決まります。

1. あれば標準出力の遮断の JSON（`reason` / `message`）
2. 標準エラーの先頭 400 文字
3. 汎用の `"Blocked by shell hook."` の既定値

つまり、いちばん簡単な遮断のフックはこうなります。

```bash
#!/usr/bin/env bash
echo "policy violation: rm -rf is not permitted" >&2
exit 2
```

遮断の指示が効かないイベント（`pre_tool_call` 以外すべて）では、終了コード 2 は他の 0 以外の終了と同じ扱いです。警告が記録され、標準出力はそれでも解釈されます。

### 開く側へ倒れるか、閉じる側へ倒れるか {#fail-open-vs-fail-closed}

既定では、シェルのフックは**開く側へ倒れます**。起動のエラー、時間切れ、解釈できない標準出力は警告を記録して、処理はそのまま進みます。観測のためのフックにはそれが正しい既定ですが、安全の関門には誤りです。落ちた秘密情報の検査役が、本来調べるはずだったツールの呼び出しを黙って通してはいけません。

`pre_tool_call` の項目に `fail_closed: true`（あるいは Cursor / Claude Code の綴りである `failClosed: true`）を設定すると、これが反転します。

```yaml
hooks:
  pre_tool_call:
    - matcher: "terminal|write_file|patch"
      command: "~/.hermes/agent-hooks/secret-scan.sh"
      timeout: 10
      fail_closed: true
```

`fail_closed: true` のとき、次はどれも `hook <command> failed closed: <reason>` とともにツールの呼び出しを**遮ります**。

| 失敗 | 開く側（既定） | `fail_closed: true` |
|---------|--------------------|--------------------|
| コマンドが無い / 実行できない | 警告して進む | **遮断** |
| 時間切れ | 警告して進む | **遮断** |
| JSON でない標準出力（スタックトレースなど） | 警告して進む | **遮断** |
| きれいに終了し、有効な何もしない JSON（`{}`） | 進む | 進む |

`fail_closed` は遮断できるイベント（いまは `pre_tool_call`）にだけ効きます。他のイベントに設定すると、設定の解釈の時点で警告を記録して無視されます。`hermes hooks test` はこの意味づけを反映します。`parsed` の行には、振り分け役が受け取るのとちょうど同じ遮断の形が出ます。

### 実際の例 {#worked-examples}

#### 1. 書き込みのたびに Python のファイルを自動で整える {#1-auto-format-python-files-after-every-write}

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

エージェントが文脈として持っているそのファイルの中身は、自動では読み直され**ません**。整形が効くのはディスク上のファイルだけです。そのあとの `read_file` の呼び出しで、整形された版が読まれます。

#### 2. 壊す恐れのある `terminal` のコマンドを遮る {#2-block-destructive-terminal-commands}

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

#### 3. すべてのやり取りに `git status` を差し込む（Claude Code の `UserPromptSubmit` に相当） {#3-inject-git-status-into-every-turn-claude-code-userpromptsubmit-equivalent}

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

Claude Code の `UserPromptSubmit` のイベントは、意図して Hermes の別のイベントにしていません。`pre_llm_call` が同じ地点で発火し、文脈の差し込みにもすでに対応しているからです。ここではそちらを使ってください。

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

### 同意の考え方 {#consent-model}

`(event, command)` の組ごとに、Hermes がそれを初めて見たときに利用者へ承認を求め、その判断を `~/.hermes/shell-hooks-allowlist.json` に残します。以降の実行（CLI でもゲートウェイでも）では確認を飛ばします。

対話の確認を通らずに済む逃げ道が 3 つあり、どれか 1 つで足ります。

1. CLI の `--accept-hooks` の指定（たとえば `hermes --accept-hooks chat`）
2. `HERMES_ACCEPT_HOOKS=1` の環境変数
3. `~/.hermes/config.yaml` の `hooks_auto_accept: true`

端末のない実行（ゲートウェイ、cron、CI）ではこの 3 つのどれかが要ります。そうでないと、新しく足したフックは黙って登録されないまま警告だけが残ります。

**スクリプトの編集は黙って信頼されます。** 許可一覧の鍵は、スクリプトのハッシュではなく、そのままのコマンドの文字列です。ディスク上でスクリプトを直しても同意は無効になりません。`hermes hooks doctor` が更新時刻のずれを知らせるので、編集に気づいて、承認し直すかどうかを判断できます。

#### 手作業での許可一覧 {#manual-allowlisting}

手作業での許可一覧は、端末がない、あるいはサービス用のアカウントで動かしていて、運用者が初回の確認に対話で答えられない場合に役立ちます。許可一覧のファイルは `~/.hermes/shell-hooks-allowlist.json` で、期待される形は `approvals` の配列です。承認はそれぞれ、フックの `event` とそのままの `command` の文字列を記録します。

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

コマンドの文字列は、設定されたフックのコマンドとちょうど一致している必要があります。パスを鍵にして `sha256` の項目を持つオブジェクトは期待される形ではなく、それでフックが承認されることはありません。手で書いた項目は `hermes hooks list` で確かめてください。

### `hermes hooks` の CLI {#the-hermes-hooks-cli}

| コマンド | 何をするか |
|---------|--------------|
| `hermes hooks list` | 設定されたフックを、照合の条件、時間の上限、同意の状態とともに出します |
| `hermes hooks test <event> [--for-tool X] [--payload-file F]` | 合成した中身に対して、一致するすべてのフックを発火させ、解釈された応答を表示します |
| `hermes hooks revoke <command>` | `<command>` に一致する許可一覧の項目をすべて消します（次の再起動から効きます） |
| `hermes hooks doctor` | 設定されたすべてのフックについて、実行の権限、許可一覧の状態、更新時刻のずれ、JSON の出力の正しさ、おおよその実行時間を調べます |

### セキュリティ {#security}

シェルのフックは**あなたの利用者の権限のまま**動きます。cron の項目やシェルの別名と同じ信頼の境界です。`config.yaml` の `hooks:` のブロックは、特権のある設定として扱ってください。

- 自分で書いたか、隅々まで読んだスクリプトだけを指してください。
- パスを見渡しやすいよう、スクリプトは `~/.hermes/agent-hooks/` の中に置いてください。
- 共有の設定を取り込んだあとは `hermes hooks doctor` を実行し直して、登録される前に新しく足されたフックに気づいてください。
- config.yaml をチームでバージョン管理しているなら、`hooks:` の節を変える PR は CI の設定と同じ目でレビューしてください。

### 順序と優先 {#ordering-and-precedence}

Python のプラグインのフックも、シェルのフックも、同じ `invoke_hook()` の振り分け役を通ります。Python のプラグインが先に登録され（`discover_and_load()`）、シェルのフックがそのあと（`register_from_config()`）なので、引き分けのときは Python の `pre_tool_call` の判断が優先されます。最初の有効な遮断が勝ちます。まとめ役は、どれかのコールバックが空でないメッセージを持つ `{"action": "block", "message": str}` を返した時点で返り、一覧のどこかにある遮断は、先に返された `approve` より上位です。

## 送信する Webhook {#outbound-webhooks}

送信する Webhook は、[受信の Webhook のプラットフォーム](/hermes/docs/user-guide/messaging/webhooks/) を押し出す側から映したものです。受信の Webhook は世界が変わったときに Hermes を起こし、送信する Webhook は Hermes が何かしたときに世界へ伝えます。HTTP の窓口の一覧と、それぞれが気にするライフサイクルのイベントを設定しておくと、一致するイベントが発火するたびに、Hermes が署名付きの JSON をそれぞれの窓口へ POST します。受け手が確かめに行く必要はありません。

よくある使い方:

- エージェントのやり取りが終わったときに CI や盤へ知らせる（`on_session_end`）
- 群をまたいでサブエージェントの完了を追う（`subagent_stop`）
- ツールの活動を外部の監視へ送る（`matcher` 付きの `post_tool_call`）
- *別の* Hermes を起こす。その環境の受信の Webhook へ URL を向けます

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

プラグインのフックの組にあるイベントはどれも使えます（`pre_tool_call`、`post_tool_call`、`pre_llm_call`、`post_llm_call`、`on_session_start`、`on_session_end`、`subagent_start`、`subagent_stop` など）。壊れた項目は警告とともに飛ばされます。壊れた Webhook がエージェントを落とすことはありません。変更は次の CLI のセッション / ゲートウェイの再起動から効きます。

秘密の情報について: 設定のファイルに資格情報が残らないよう、`secret:` に直接書くより `secret_env`（環境変数の名前。ふつうは `~/.hermes/.env` で設定します）を選んでください。秘密の情報のない項目は署名なしで届けられ、`hermes hooks list` では `UNSIGNED` と示されます。

### 送られる形 {#wire-format}

発火のたびに、シェルのフックの標準入力と同じトップレベルの形に配信の情報を足した JSON の本文が POST されます。`profile` は、そのイベントを出した Hermes のプロファイル名です（プロファイルの外では `"default"`）。多重化されたゲートウェイの背後にいる受け手が、プロファイルを見分けられます。

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
| `X-Hermes-Delivery` | 配信ごとに一意の id。本文の `delivery_id` と同じ値です |
| `X-Hermes-Signature-256` | `sha256=<hex>` — 生の本文の HMAC-SHA256 で、GitHub と同じ形。秘密の情報を設定しているときだけ付きます |

署名は、GitHub の Webhook とまったく同じように確かめてください。

```python

def verify(body: bytes, header: str, secret: str) -> bool:
    expected = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, header)
```

`delivery_id` と `timestamp` は**署名された本文の中**にあるので、確かめた受け手は再生への備えも同時に得られます。

- `delivery_id`（または対応する `X-Hermes-Delivery` のヘッダー）で**重複を取り除いて**ください。最近見た id を覚えておいて、重複は飛ばします。Hermes は失敗した配信を 1 回だけ再試行するので、同じ id が正当に 2 回届くことがあります。
- `timestamp` を自分の時計と、幅を持たせて突き合わせて**古いイベントを拒んで**ください（5 分がよくある既定です）。捕まえた要求を再生する攻撃者は、秘密の情報なしに新しい時刻を作れません。

### 配信の意味づけ {#delivery-semantics}

- **投げっぱなしで、要となる経路の外。** イベントは直列化されてすぐ待ち行列に入り、背後の 1 つのスレッドが HTTP の POST を行います。遅い、あるいは死んでいる窓口が、ツールの呼び出しやエージェントのやり取りを止めることはありません。
- **知らせるだけ。** シェルのフックと違い、送信する Webhook はツールの呼び出しを遮ったり文脈を差し込んだりできません。応答の本文は無視されます。見るだけで、導くことはありません。
- **上限のある再試行。** 接続のエラーと 5xx の応答は、間を空けて 1 回だけ再試行します。4xx は再試行しません（受け手が、要求そのものが誤っていると言っているからです）。失敗は記録して捨てられます。配信はできる範囲で行われるもので、保証はありません。
- **転送先は決してたどりません。** 3xx の応答は設定の誤りとして扱われ、記録されます。転送された POST をたどると、署名された中身が黙って失われるからです。`url` は最後の窓口に向けてください。
- **上限のある待ち行列。** 待ち行列が詰まった場合（死んだ窓口、イベントの嵐）、際限なくメモリを使うのではなく、新しいイベントを警告とともに捨てます。
- **同意の確認はありません。** 送信先はあなたの機械でコードを実行しません。あなたが設定した URL でデータを受け取るだけです。`HERMES_SAFE_MODE=1` では、プラグインやシェルのフックと同じく登録が飛ばされます。中身にはツールの入力やイベントの情報が含まれるので、信頼できる窓口にだけ向け、`https://` を選んでください。

`hermes hooks list` は、設定された送信先を、それぞれ署名されているかどうかも含めてシェルのフックと並べて表示します。
