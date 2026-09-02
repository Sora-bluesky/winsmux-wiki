---
title: "出来事のフック"
description: "節目ごとに自分のコードを走らせます — 動きの記録、通知、webhook への送信"
upstream_path: user-guide/features/hooks.md
upstream_blob: e30b3b0d397cff7afa842f5335e9a468b1656822
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/hooks
---

# 出来事のフック {#event-hooks}

Hermes には、節目ごとに自分のコードを走らせるフックの仕組みが4つあります。

| 仕組み | 登録の仕方 | 動く場所 | 使いどころ |
|--------|---------------|---------|----------|
| **[ゲートウェイのフック](#gateway-event-hooks)** | `~/.hermes/hooks/` の中の `HOOK.yaml` と `handler.py` | ゲートウェイだけ | 記録、通知、webhook |
| **[プラグインのフック](#plugin-hooks)** | [プラグイン](/hermes/docs/user-guide/features/plugins/)の中の `ctx.register_hook()` | CLI とゲートウェイ | 道具の横取り、計測、守りの柵 |
| **[シェルのフック](#shell-hooks)** | `~/.hermes/config.yaml` の `hooks:` の塊からシェルのスクリプトを指す | CLI とゲートウェイ | 差し込むだけのスクリプト。遮断、自動整形、文脈の差し込み |
| **[外向きの webhook](#outbound-webhooks)** | `~/.hermes/config.yaml` の `hooks.outbound:` の並び | CLI とゲートウェイ | 署名付きの節目の出来事を外の HTTP の口へ送る — CI、ダッシュボード、ほかのエージェント |

フックの呼び出しでエラーが起きても、エージェントを落とさずに切り離して記録します。フックはどれも受け身というわけではありません。指示・制御のフックは流れを変えられ、変換のフックは中身を置き換えられ、シェルの `pre_tool_call` のフックは遮断や安全側での停止ができます。

## ゲートウェイの出来事のフック {#gateway-event-hooks}

ゲートウェイのフックは、ゲートウェイ（Telegram、Discord、Slack、WhatsApp、Teams）が動いているあいだ、本体のエージェントの流れを止めることなく自動で発火します。

### フックを作る {#creating-a-hook}

フックはそれぞれ `~/.hermes/hooks/` の下のディレクトリで、2つのファイルを持ちます。

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

`events` の並びが、どの出来事でこちらの処理役が動くかを決めます。`command:*` のようなワイルドカードも含めて、好きな組み合わせを購読できます。

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

**処理役の決まり:**
- 名前は `handle` でなければなりません
- `event_type`（文字列）と `context`（辞書）を受け取ります
- `async def` でも普通の `def` でもかまいません。どちらも動きます
- エラーは捕まえて記録され、エージェントを落とすことはありません

### 使える出来事 {#available-events}

| 出来事 | いつ発火するか | context の鍵 |
|-------|---------------|--------------|
| `gateway:startup` | ゲートウェイのプロセスが立ち上がったとき | `platforms`（動いている場の名前の並び） |
| `session:start` | メッセージのセッションが新しく作られたとき | `platform`、`user_id`、`session_id`、`session_key` |
| `session:end` | セッションが終わったとき（作り直しの前） | `platform`、`user_id`、`session_key` |
| `session:reset` | `/new` か `/reset` が実行されたとき | `platform`、`user_id`、`session_key` |
| `session:compress` | セッションの文脈の圧縮が終わったとき | `platform`、`session_id`、`old_session_id`（その場で詰めたときは空）、`in_place`（真偽値。`true` = 同じ ID のまま記録を詰めた、`false` = `old_session_id` から入れ替えた）、`compression_count` |
| `agent:start` | エージェントがメッセージの処理を始めたとき | `platform`、`user_id`、`chat_id`、`thread_id`（掲示板の話題やスレッドの根の ID。スレッドの中でなければ空）、`chat_type`（`"dm"` \| `"group"` \| `"forum"`。分からなければ空）、`session_id`、`message`（500 文字で切ります） |
| `agent:step` | 道具を呼ぶ輪が1周するたび | `platform`、`user_id`、`session_id`、`iteration`、`tool_names` |
| `agent:end` | エージェントが処理を終えたとき | `agent:start` と同じ鍵に加えて `response`（500 文字で切ります） |
| `reaction:added` | bot から見えるメッセージに絵文字の反応が付いたとき（今のところ Slack のアダプタ）。`reactions:read` の権限と `reaction_added` の bot の出来事の購読が必要で、bot がそのチャンネルの一員である必要があります。 | `platform`、`reaction`、`user_id`、`item_user_id`、`item_type`、`channel_id`、`message_ts`、`team_id`、`event_ts`、`raw_event` |
| `reaction:removed` | bot から見えるメッセージから絵文字の反応が外れたとき。`reaction_removed` の bot の出来事の購読が必要です。 | `reaction:added` と同じ形 |
| `command:*` | スラッシュコマンドが実行されたとき | `platform`、`user_id`、`command`、`args` |

#### ワイルドカードの当たり方 {#wildcard-matching}

`command:*` で登録した処理役は、どの `command:` の出来事（`command:model`、`command:reset` など）でも発火します。購読1つで、スラッシュコマンドをすべて見張れます。

:::tip スレッドへの返信
同じ Telegram の掲示板の話題に続きのメッセージを出す処理役は、`chat_type == "forum"` で `thread_id` が空でないときに `message_thread_id=int(thread_id)` を付けてください。
:::

### 例 {#examples}

#### 長い仕事のときに Telegram へ通知する {#telegram-alert-on-long-tasks}

エージェントが 10 歩より多く進んだら、自分にメッセージを送ります。

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

#### コマンドの使われ方を記録する {#command-usage-logger}

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

#### セッションの始まりを webhook で知らせる {#session-start-webhook}

新しいセッションのたびに、外のサービスへ POST します。

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

### 手引き: BOOT.md — ゲートウェイが立ち上がるたびに点検表を走らせる {#tutorial-bootmd-run-a-startup-checklist-on-every-gateway-boot}

界隈で人気のある形です。`~/.hermes/BOOT.md` に Markdown の点検表を置いておき、ゲートウェイが立ち上がるたびに、エージェントにそれを一度だけ実行させます。「立ち上がるたびに、夜のうちに失敗した cron を確かめて、何かあれば Discord で知らせて」や「deploy.log の直近 24 時間をまとめて Slack の #ops に出して」といった使い方に向きます。

この手引きでは、それを自分で作るフックとして組み立てる方法を示します。Hermes に BOOT.md のフックが組み込まれているわけではありません。欲しいふるまいを、そのとおりに自分でつなぎます。

#### 何を作るか {#what-were-building}

1. 立ち上がりのときの指示を普通の言葉で書いた `~/.hermes/BOOT.md` というファイル。
2. `gateway:startup` で発火し、ゲートウェイが解決したモデルと資格情報で使い捨てのエージェントを立ち上げ、BOOT.md の指示を実行するゲートウェイのフック。
3. 報告することが何もないときにメッセージを送らずに済ませるための、`[SILENT]` という取り決め。

#### 手順1: 点検表を書く {#step-1-write-your-checklist}

`~/.hermes/BOOT.md` を作ります。人の助手に指示を出すつもりで書いてください。

```markdown
# Startup Checklist

1. Run `hermes cron list` and check if any scheduled jobs failed overnight.
2. If any failed, summarize them for Discord #ops (the hook delivers your final response to its configured target).
3. Check if `/opt/app/deploy.log` has any ERROR lines from the last 24 hours. If yes, summarize them and include in the same report.
4. If nothing went wrong, reply with only `[SILENT]` so no message is sent.
```

エージェントはこれをプロンプトの一部として見るので、普通の言葉で書けることなら何でも通ります。道具の呼び出し、シェルのコマンド、メッセージの送信、ファイルのまとめ、どれでもです。

#### 手順2: フックを作る {#step-2-create-the-hook}

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

大事なのは2行です。

- `_resolve_gateway_model()` は、ゲートウェイに今設定されているモデルを読みます。
- `_resolve_runtime_agent_kwargs()` は、普通のゲートウェイのターンと同じやり方でプロバイダの資格情報を解決します。API キー、ベース URL、OAuth のトークン、資格情報の束も含めてです。

これがないと、素の `AIAgent()` は組み込みの既定に落ち、既定以外の口に対しては 401 になります。

#### 手順3: 試す {#step-3-test-it}

ゲートウェイを再起動します。

```bash
hermes gateway restart
```

ログを眺めます。

```bash
hermes logs --follow --level INFO | grep boot-md
```

`Running BOOT.md (N chars)` に続いて、`boot-md completed: ...`（エージェントがしたことのまとめ）か、エージェントが `[SILENT]` のようなちょうどの沈黙の合図で答えたときの `boot-md completed (nothing to report)` のどちらかが見えるはずです。

`~/.hermes/BOOT.md` を消せば点検表は止まります。フックは読み込まれたままですが、ファイルがなければ黙って飛ばします。

#### この形を広げる {#extending-the-pattern}

- **曜日を見る点検表:** BOOT.md の指示の中で `datetime.now().weekday()` を手がかりにします（「月曜なら、週次のデプロイのログも確かめて」）。指示は自由な文章なので、エージェントが考えられることなら何でも書けます。
- **点検表をいくつも:** フックを別のファイル（`STARTUP.md`、`MORNING.md` など）に向け、それぞれに別のフックのディレクトリを登録します。
- **エージェントを使わない形:** エージェントの輪がまるごと要らないなら、`AIAgent` は使わず、処理役から `httpx` で決まった通知を直接投げます。安く、速く、プロバイダにも依存しません。

#### なぜ組み込みにしていないのか {#why-this-isnt-a-built-in}

以前の版の Hermes は、これを組み込みのフックとして出荷し、ゲートウェイが立ち上がるたびに素の既定でエージェントを黙って走らせていました。独自の口を使っている人を驚かせ、動いていることを知らない人には見えない機能になっていました。書かれた形として — こちらのフックのディレクトリで、自分の手で作るものとして — 残しておけば、何をするものかが目に見え、ファイルを書くという行為で自分から選ぶことになります。

### 仕組み {#how-it-works}

1. ゲートウェイが立ち上がるとき、`HookRegistry.discover_and_load()` が `~/.hermes/hooks/` を走査します
2. `HOOK.yaml` と `handler.py` を持つディレクトリが、その場で読み込まれます
3. 処理役が、宣言した出来事に対して登録されます
4. 節目ごとに `hooks.emit()` が、当てはまる処理役をすべて発火させます
5. どの処理役のエラーも捕まえて記録されます。壊れたフックがエージェントを落とすことはありません

:::info
ゲートウェイのフックが発火するのは**ゲートウェイ**（Telegram、Discord、Slack、WhatsApp、Teams）だけです。CLI はゲートウェイのフックを読み込みません。どこでも動くフックが要るなら、[プラグインのフック](#plugin-hooks)を使ってください。
:::

## プラグインのフック {#plugin-hooks}

[プラグイン](/hermes/docs/user-guide/features/plugins/)は、**CLI とゲートウェイの両方**のセッションで発火するフックを登録できます。これはプラグインの `register()` の関数の中で、`ctx.register_hook()` を使って書く形で登録します。

プラグインの束ね方と登録の細かいところは、[プラグインの手引き](/hermes/docs/user-guide/features/plugins/)を見てください。

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

- 呼び出しは**キーワード引数**で渡されます。この先の変化に備えて、必ず `**kwargs` を受け取ってください。
- 呼び出しの中で起きた例外は記録して飛ばされ、あとの呼び出しは続きます。
- **制限時間の付いた**フック（`post_tool_call` や `pre_llm_call` のような熱い経路の見張り役に加えて、方針を決めるフックの `pre_tool_call`）で Python のプラグインの呼び出しが `plugins.hook_callback_timeout`（既定は 30 秒。`0` で無効、最大 600）より長く**止まった**ときは、働き手を待たずに見捨てて、エージェントの輪を進めます。制限時間を超えた、あるいはまだ動いている `pre_tool_call` の呼び出しは**安全側で止まります**（道具を遮断します）。ほかの制限時間付きのフックは開く側に倒れます（飛ばします）。呼び出し元のスレッドについて取り決めのあるフック（`subagent_stop`）は、制限時間の働き手に移されることはありません。シェルのフックは、項目ごとの `timeout` を自分で持ちます。
- 下の一覧は説明のためのものです。**見張り役**は戻り値を無視し、**変換**は最初の使える文字列の置き換えを受け取り、**指示・制御**のフックは決まった形の戻り値を読みます。プラグインのミドルウェアは別の登録簿・別の面であって、フックのもう1つの種類ではありません。
- `turn_id`、`api_request_id`、`task_id`、`session_id`、`api_call_count` のような突き合わせ用の項目はフックごとに違い、ないこともあります。ID は中身を読まない印として扱ってください。
- 実行時に出来事の名前が正しいかどうかは `hermes_cli.plugins.VALID_HOOKS` が決めます。`hermes hooks list` が並べるのは設定されたシェルや外向きのフックであって、使えるすべての出来事ではありません。`hermes hooks test <event>` は、正しくない出来事を渡したときにだけ、正しいものの一式を教えます。

### キャッシュを壊さないシステムプロンプトの節 {#cache-safe-system-prompt-sections}

いつも効いている案内をずっと置いておきたいプラグインは、毎ターン `pre_llm_call` で同じ文章を差し込む代わりに、大きさの決まったシステムプロンプトの節を登録できます。

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

取り決めはわざと狭くしてあります。

- ID は全体で1つ、変わらない、1〜128 文字の小文字の名前で、使えるのは英字、数字、`.`、`_`、`-` だけです。同じ ID は断られます。
- 置き場所の錨は `after_memory` だけです。節は ID の順に並べられ、記憶やプロファイルの文脈のあと、セッションの情報の前に描かれます。プラグインが中核のプロンプトの中身を並べ替えたり置き換えたりすることはできません。
- 呼び出せるものには、`session_id`、`model`、`provider`、`platform`、`profile_name`、`cwd` を持つ読み取り専用の対応表が渡されます。これは**新しいセッションにつき一度**だけ動きます。描かれたバイト列は圧縮のときに凍り、プロセスの再起動や再開のあとは、すでに保存されているシステムプロンプトの全体から取り戻されます。すでにあるセッションのために、プラグインの状態が読み直されることはありません。
- `max_chars` の上限は 4,000 文字です。プラグインの節をすべて合わせると、監査用の見出しも含めて 8,000 文字・32 節が上限です。空のもの、文字列でないもの、大きすぎるもの、合計が予算を超えるもの、例外を投げるものは、警告を出して飛ばされます。プロンプトの組み立ては続きます。
- 受け入れられた節はすべてプロンプトの中で名前が出て、セッションの始まりに、そのプラグイン・位置・文字数とともに記録されます。

本当にターンごとに変わる文脈には `pre_llm_call` を使ってください。この取り決めに、プラグインが環境の手がかりを渡すフックはわざと置いていません。cwd やブランチ、そのほかの環境のデータが変わったからといって、セッションのキャッシュされたプロンプトが黙って変わってはいけないからです。そういうフックを足すには、まずはっきりした使い手と、同じ凍結・再開の安全さが要ります。

### 出荷されているプラグインのフックの一覧 {#shipped-plugin-hook-catalog}

下に挙げる中身の項目は、それぞれの呼び出し元が渡す、その出来事に固有の項目そのものです。昔との互換のため、`PluginManager` はすべてのプラグインのフックの呼び出しに `telemetry_schema_version="hermes.observer.v1"` も足します。この古い封筒の印は、すべてのフックの中身が1つの意味の設計図を共有していることを意味しません。新しく版の付いた取り決めは、その具体的な出来事や能力の系統に属します。

| フック | 種類 | 正確なタイミングと戻り値のふるまい | 明示された中身の項目 | プライバシー／機微さ |
|---|---|---|---|---|
| [`pre_tool_call`](#pre_tool_call) | 指示・制御 | 実行の前に一度。最初の使える `block` か `approve` の指示が勝ち、`modify` の戻り値は道具の引数へ浅く混ぜられます。 | `tool_name`、`args`、`task_id`、`session_id`、`tool_call_id`、`turn_id`、`api_request_id`、`middleware_trace` | 生の引数には、利用者の中身、パス、コマンド、秘密が入っていることがあります。 |
| `post_tool_call` | 見張り役 | 遮断・エラー・成功のいずれの結果のあとにも。戻り値は無視されます。 | `tool_name`、`args`、`result`、`task_id`、`session_id`、`tool_call_id`、`turn_id`、`api_request_id`、`duration_ms`、`status`、`error_type`、`error_message`、`middleware_trace` | 結果やエラーの文章には、道具や利用者の任意の中身と秘密が入りえます。 |
| `transform_tool_result` | 変換 | `post_tool_call` のあと、会話へ足す前。最初の文字列が結果を置き換えます。 | `tool_name`、`args`、`result`、`task_id`、`session_id`、`tool_call_id`、`turn_id`、`api_request_id`、`duration_ms`、`status`、`error_type`、`error_message` | モデルに渡る結果と引数がそのまま見えます。 |
| `transform_terminal_output` | 変換 | 前面のプロセスの取り込みが区切られたあと、最後の出力の制限の前。最初の文字列が出力を置き換えます。 | `command`、`output`、`returncode`、`task_id`、`env_type` | コマンドや出力に資格情報が入りえます。 |
| `pre_transcription` | 変換 | STT の振り分け役が、プロバイダを決めたあと、どの裏方（組み込み、コマンド型、プラグインが登録したもの）を呼ぶ前にも発火します。辞書の結果は登録の順に当てられ、項目ごとに最後に書いたものが勝ちます（`prompt`、`language`、`model`。`file_path` は読み取り専用）。 | `file_path`、`provider`、`model`、`language`、`prompt`、`source` | 最後のプロンプトは音声と一緒に設定した STT のプロバイダへ送られます。フックの戻り値に秘密を入れないでください。 |
| `pre_llm_call` | 指示・制御 | 輪が始まる前、ターンにつき一度。使える文字列や `{"context": ...}` の戻り値はすべてつなげられ、利用者のメッセージへ差し込まれます。 | `session_id`、`task_id`、`turn_id`、`user_message`、`conversation_history`、`is_first_turn`、`model`、`platform`、`parent_session_id`、`sender_id` | 利用者のメッセージと会話の履歴がまるごと。 |
| `post_llm_call` | 見張り役 | 中断されずに成功したターンの締めくくり。戻り値は無視されます。 | `session_id`、`task_id`、`turn_id`、`user_message`、`assistant_response`、`conversation_history`、`model`、`platform` | プロンプト、返事、履歴がまるごと。 |
| `transform_llm_output` | 変換 | `post_llm_call` と最後の受け渡しの前。空でない最初の文字列が返事を置き換えます。 | `response_text`、`session_id`、`model`、`platform` | 最後のアシスタントの文章がまるごと。 |
| `pre_verify` | 指示・制御 | 直したコードを確かめる関所で。最初の使える continue／block-stop の指示がターンを続けさせます。 | `session_id`、`platform`、`model`、`coding`、`attempt`、`final_response`、`changed_paths` | 下書きの返事と変わったパス。 |
| `pre_api_request` | 見張り役 | プロバイダへの試みごとに、送る直前。戻り値は無視されます。 | `task_id`、`turn_id`、`api_request_id`、`session_id`、`user_message`、`conversation_history`、`platform`、`model`、`provider`、`base_url`、`api_mode`、`api_call_count`、`retry_count`、`request_messages`、`message_count`、`tool_count`、`approx_input_tokens`、`request_char_count`、`max_tokens`、`started_at`、`middleware_trace`、`request` | とても機微です。古くからの `user_message`、`conversation_history`、`request_messages` はわざと生のままです。整えた `request` のほうを使ってください。 |
| `post_api_request` | 見張り役 | プロバイダの成功が整えられたあと。戻り値は無視されます。 | `task_id`、`turn_id`、`api_request_id`、`session_id`、`platform`、`model`、`provider`、`base_url`、`api_mode`、`api_call_count`、`api_duration`、`started_at`、`ended_at`、`finish_reason`、`message_count`、`response_model`、`response`、`usage`、`assistant_message`、`assistant_content_chars`、`assistant_tool_call_count` | 整えた `response` が使えますが、生のまま整えられた `assistant_message` にはモデルや利用者の中身が入りえます。`usage` は勘定のデータです。 |
| `api_request_error` | 見張り役 | プロバイダへの試みが失敗するたび。戻り値は無視されます。 | `task_id`、`turn_id`、`api_request_id`、`session_id`、`platform`、`model`、`provider`、`base_url`、`api_mode`、`api_call_count`、`api_duration`、`started_at`、`ended_at`、`status_code`、`retry_count`、`max_retries`、`retryable`、`reason`、`error`、`request` | エラーの文章にプロバイダや利用者のデータが入りえます。`request` は整えられている想定です。 |
| `on_stream_start` | 見張り役 | 流れてくる LLM の返事が始まったときに配られます。呼び出しごとに1つの働き手を持つ、母屋が持つ大きさの決まった待ち行列を通して、トークンの経路から外して届けます。戻り値は無視されます。 | `turn_id`、`iteration`、`session_id`、`model`、`provider`、`surface` | 識別子と経路の情報だけ。 |
| `on_stream_delta` | 見張り役 | 整えられた流れの文字の差分ごとに、大きさの決まった見張りの待ち行列を通して配られます。詰まった呼び出しは、自分の分の古い出来事だけを落とします。戻り値は無視されます。 | `delta`、`kind`（`text` か `reasoning`）、`turn_id`、`iteration`、`session_id`、`model`、`provider`、`surface` | 差分の文章は生のモデルの出力です。考えの差分には `plugins.stream_reasoning_deltas` の同意が要ります。 |
| `on_stream_end` | 見張り役 | 流れる返事が終わるかエラーになったあと、流れが閉じてから配られます。戻り値は無視されます。 | `final_text`、`finished`、`error`、`turn_id`、`iteration`、`session_id`、`model`、`provider`、`surface` | 組み上がった返事の文章がまるごと。エラーの文章にプロバイダのデータが入りえます。 |
| `on_interim_message` | 見張り役 | 最後の答えの前に、輪の途中のアシスタントのメッセージが表に出たときに配られます（流れていてもいなくても）。戻り値は無視されます。 | `text`、`already_streamed`、`turn_id`、`iteration`、`session_id`、`model`、`provider`、`surface` | 途中のアシスタントの文章がまるごと。 |
| `transform_api_error_classification` | 変換 | プロバイダへの試みが失敗するたび、組み込みの分類役の入口で。すべての呼び出しが走ってから、使える `reason` を持つ最初の辞書が勝ちます（全部走らせてから最初を選ぶ形）。飛ばされた使える結果は実行時の警告として記録されます。Python のプラグインだけです。 | `provider`、`model`、`status_code`、`error_type`、`error_code`、`error_message`、`error_body`、`error`、`approx_tokens`、`context_length`、`num_messages` | `error_message` と `error_body` に、生のプロバイダや利用者のデータが入りえます。 |
| `on_session_start` | 見張り役 | 新しいセッションの最初のターン。戻り値は無視されます。 | `session_id`、`model`、`platform` | 識別子と経路の情報だけ。 |
| `on_session_end` | 見張り役 | 決まりとしてはターンの締めくくりごとに。CLI や TUI の終了では、項目の減った古い形もあります。戻り値は無視されます。 | 決まりの形: `session_id`、`task_id`、`turn_id`、`completed`、`failed`、`interrupted`、`turn_exit_reason`、`model`、`platform`。終了の経路では `reason` や `api_request_id` が足され、項目が欠けることもあります。 | ID、モデルと場、結末。決まりの形にメッセージの本文はありません。 |
| `on_session_finalize` | 見張り役 | `finalize_session` を通した CLI／TUI／ゲートウェイの片づけ。ゲートウェイの終了や期限切れでは、作り直しなしで締められることもあります。戻り値は無視されます。 | 面によって変わる `session_id`、`platform`、場合により `reason`、`old_session_id`、`new_session_id` | セッションと経路の識別子。 |
| `on_session_reset` | 見張り役 | CLI／TUI のセッションの切れ目と、ゲートウェイで入れ替わりのセッションができたあと。戻り値は無視されます。 | CLI: `session_id`、`platform`、`reason`。TUI: `session_id`、`platform`。ゲートウェイ: それらに加えて `reason`、`old_session_id`、`new_session_id` | セッションと経路の識別子。 |
| `on_skill_lifecycle` | 見張り役 | スキルの使用の状態が正式に変わったあと。戻り値は無視されます。 | `action`、`skill_name`、`provenance`、`task_id`、`session_id`、`use_count`、`reused`、`reuse_after_patch` | 手元のスキルの名前と出どころが見えます。 |
| `subagent_start` | 見張り役 | 子が作られ、これから走るとき。戻り値は無視されます。 | `parent_session_id`、`parent_turn_id`、`parent_subagent_id`、`child_session_id`、`child_subagent_id`、`child_role`、`child_goal` | 子の目的に、利用者や案件の中身が入りえます。 |
| `subagent_stop` | 見張り役 | 子の終了。戻り値は無視されます。 | `parent_session_id`、`parent_turn_id`、`child_session_id`、`child_role`、`child_summary`、`child_status`、`tool_call_history`、`duration_ms` | まとめと、伏せ字にした道具の履歴の情報から、案件の構造が知れることがあります。 |
| `pre_gateway_dispatch` | 指示・制御 | 内部のものでない入ってくるメッセージについて、認証・対応づけ・振り分けの前。最初の使える `skip`、`rewrite`、`allow` が流れを決めます。 | `event`、`gateway`、`session_store` | プロセスの中の非常に強い物で、入ってくる利用者と経路のデータ、母屋の取っ手が見えます。 |
| `gateway_platform_event` | 見張り役 | ゲートウェイのプロファイル単位の認可が通ったあと、対応している場に固有の出来事がゲートウェイの境目で整えられたとき（Telegram: 反応、メッセージの編集。Discord: メッセージの編集と削除、スレッドの作成と改名）。戻り値は無視されます。 | `platform`、`event_type`、`payload`（出来事の種類ごとの辞書。下の種類ごとの取り決めを見てください） | 整えられた素の辞書の封筒だけです。生の SDK の物、アダプタの取っ手、bot のクライアントが出ることはありません。 |
| `pre_command` | 見張り役 | 見分けの付いたスラッシュコマンドが振り分けられる直前、処理役が動く前に、CLI とゲートウェイの冷たい経路の振り分けで。v1 では戻り値は無視されます（指示の形をした辞書は debug で記録されます）。ゲートウェイで動いているエージェントに割り込むコマンド（動いている最中の `/stop`、`/approve`）はわざと外してあります。制御側の逃げ道は、プラグインの手の届かないところに置く必要があるからです。 | `surface`（`"cli"` \| `"gateway"`）、`command`（決まった名前）、`alias_used`、`args_raw`、`session_key`、`platform` | `args_raw` に、コマンドのあとに打たれた利用者の中身や秘密が入りえます。 |
| `pre_approval_request` | 見張り役 | 尋ねる形の承認や賢い承認の前。戻り値は無視されます。 | `command`、`description`、`pattern_key`、`pattern_keys`、`session_key`、`surface`、`turn_id`、`tool_call_id` | コマンドに秘密が入りえます。賢い見張りの下ごしらえでは伏せ字が強いられますが、どの面でも同じ伏せ方というわけではありません。 |
| `post_approval_response` | 見張り役 | 判断、時間切れ、あるいはゲートウェイの通知の失敗のあと。戻り値は無視されます。 | `command`、`description`、`pattern_key`、`pattern_keys`、`session_key`、`surface`、`turn_id`、`tool_call_id`、`choice`。賢い経路では `decided_by` が足されることがあります | コマンドの機微さは同じで、そこに判断の情報が加わります。 |
| `kanban_task_claimed` | 見張り役 | 取得が確定したあと、振り分け役のプロセスで、働き手が生まれる前。戻り値は無視されます。 | `task_id`、`profile_name`、`board`、`assignee`、`run_id` | 板・仕事・プロファイル・担当の識別子。 |
| `kanban_task_completed` | 見張り役 | 完了と片づけのあと、たいていは働き手のプロセスで。戻り値は無視されます。 | `task_id`、`profile_name`、`board`、`assignee`、`run_id`、`summary` | まとめに案件や利用者の中身が入りえます。 |
| `kanban_task_blocked` | 見張り役 | 止まったことへ移ったあと。依存待ちの経路では、その取引が終わる前に発火します。戻り値は無視されます。 | `task_id`、`profile_name`、`board`、`assignee`、`run_id`、`reason` | 理由に案件や利用者の中身が入りえます。 |
| `on_kanban_worker_spawned` | 見張り役 | `spawn_fn` が返り、働き手の PID が保存されたあと。振り分けの錠の中で動くので、呼び出しは軽くしてください。戻り値は無視されます。 | `task_id`、`profile_name`、`board`、`assignee`、`run_id`、`worker_pid`、`workspace_path` | `workspace_path` はファイルの場所で、案件の並びや利用者名が知れることがあります。 |
| `on_kanban_worker_exited` | 見張り役 | 見回り由来。`detect_crashed_workers` が死んだ PID の仕事を取り戻し、それが確定したあと。戻り値は無視されます。 | `task_id`、`profile_name`、`board`、`assignee`、`run_id`、`worker_pid`、`exit_kind`、`exit_code`、`outcome`、`retry_status` | 識別子と終了の情報だけ。 |
| `on_kanban_worker_stale_claim` | 見張り役 | 期限の切れた取得が取り戻されたあと。PID が生きている延長では発火しません。戻り値は無視されます。 | `task_id`、`profile_name`、`board`、`assignee`、`run_id`、`worker_pid`、`heartbeat_stale`、`retry_status` | 識別子と取得の情報だけ。 |
| `on_kanban_task_updated` | 見張り役 | 取得・完了・停止の流れの外で、仕事の項目への書き込みが確定したあと（割り当て、上書き、ダッシュボードの編集）。戻り値は無視されます。 | `task_id`、`profile_name`、`board`、`assignee`、`run_id`、`changed_fields` | `changed_fields` が運ぶのは項目の名前だけで、値は決して運びません。板のデータベースにある表題や本文の値には、利用者や案件の中身が入りえます。 |
| `on_kanban_dispatch_tick` | 見張り役 | 振り分け役の見回りごとに一度、振り分けの錠が外れたあとで確実に。何もない見回りや取り合いの見回りでも発火します。戻り値は無視されます。 | `board`、`profile_name`、`dry_run`、`outcome`、`result` | `result` はその見回りの `DispatchResult` で、仕事の ID、担当、作業場の場所を運びます。 |

---

### 流れる出力のフック {#streaming-output-hooks}

これらの見張り役だけのフックを使うと、返事を変えずに、流れてくる LLM の出力を計測、生きたダッシュボード、読み上げの流れのために受け取れます。母屋が持つ大きさの決まった待ち行列を通し、登録された呼び出しごとに裏の働き手が1つ付くので、プラグインの呼び出しがトークンの経路の上で直に走ることはありません。1つの呼び出しが詰まっても、埋まって古い見張りの出来事を落とすのはその呼び出しの待ち行列だけで、ほかの見張り役は関係なく出来事を受け取り続けます。

ほかのプラグインのフックと同じように登録します。

```python
def on_delta(delta, kind, model, provider, **kwargs):
    if kind == "text":
        print(delta, end="", flush=True)

def register(ctx):
    ctx.register_hook("on_stream_delta", on_delta)
```

4つのフックに共通の項目です。

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `turn_id` | `str` | 中身を読まないターンの識別子。使えるときだけ |
| `iteration` | `int` | 今の API 呼び出し／道具の輪の周回 |
| `session_id` | `str` | 今の Hermes のセッションの ID |
| `model` | `str` | 動いているモデルの識別子 |
| `provider` | `str` | 動いているプロバイダの名前 |
| `surface` | `str` | 呼び出し元の面。たとえば `cli`、`discord`、`telegram` |

追加の項目です。

| フック | 追加の項目 |
|------|--------------|
| `on_stream_start` | なし |
| `on_stream_delta` | `delta: str`, `kind: "text" | "reasoning"` |
| `on_stream_end` | `final_text: str`, `finished: bool`, `error: str | None` |
| `on_interim_message` | `text: str`, `already_streamed: bool` |

`on_interim_message` は流れない返事のあとにも発火しうるので、このフックだけを登録しても、プロバイダの呼び出しが流れる形の通信に押し込まれることはありません。

考えの差分は、既定ではプラグインに出しません。はっきり同意してください。

```yaml
plugins:
  stream_reasoning_deltas: true
```

戻り値は無視されます。流れを速いままにするため、呼び出しは自分の仕事を待ち行列に入れて、すぐ返すようにしてください。例外は記録され、流れを止めません。

---

### `pre_tool_call` {#pretoolcall}

道具が実行される**直前**に発火します。組み込みの道具でも、プラグインの道具でも同じです。

**呼び出しの形:**

```python
def my_callback(tool_name: str, args: dict, task_id: str, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `tool_name` | `str` | これから実行される道具の名前（たとえば `"terminal"`、`"web_search"`、`"read_file"`） |
| `args` | `dict` | モデルが道具に渡した引数 |
| `task_id` | `str` | セッションや仕事の識別子。設定されていなければ空の文字列です。 |

**発火する場所:** `model_tools.py` の `handle_function_call()` の中、道具の処理役が動く前です。道具の呼び出しごとに一度発火します。モデルが3つの道具を並べて呼べば、3回発火します。

**戻り値 — 遮断する、あるいは承認を求める:**

```python
return {"action": "block", "message": "Reason the tool call was blocked"}
# or
return {"action": "approve", "message": "Why approval is required", "rule_key": "optional:scope"}
```

最初の使える指示が勝ちます（先に Python のプラグイン、次にシェルのフック）。`block` には空でない `message` が要り、その文章をモデルに返すエラーとして、道具を短絡させます。`approve` はその呼び出しを、今ある人の承認の関所へ上げます。`message` と `rule_key` は任意で、拒否・時間切れ・関所のエラーは安全側で止まります。それ以外の戻り値は無視されるので、これまでの見張るだけの呼び出しはそのまま動き続けます。

**戻り値 — 道具の引数を書き換える:**

```python
return {"action": "modify", "args": {"new_string": "fixed content"}}
```

返された `args` の辞書は、道具が実行される前に、もとの道具の引数へ浅く混ぜられます。`modify` のフックがいくつあっても積み重なります。もとの引数から作った1つの辞書に、それぞれのフックの鍵が混ぜられていくので、フック A が `path` を、フック B が `content` を変えたなら、どちらも残ります。2つのフックが同じ鍵を変えたときは、あとのフックが勝ちます。

シェルのフックは、Claude Code と同じ形も受け付けます。

```json
{"decision": "modify", "tool_input": {"new_string": "fixed content"}}
```

どちらの形も、内部では `{"action": "modify", "args": {...}}` に整えられます。

`pre_tool_call` の呼び出しが `plugins.hook_callback_timeout` を超えた（あるいは前に時間切れになった発火からまだ動いている）とき、Hermes は**安全側で止まります**。方針の判断がないまま進めるのではなく、時間切れのメッセージとともに道具を遮断します。

**使いどころ:** 記録、監査の跡、道具の呼び出しの数え上げ、危ない操作の遮断、回数の制限、利用者ごとの方針の当てはめ、引数の掃除、パスの書き換え、既定の引数の差し込み。

**例 — 道具の呼び出しの監査ログ:**

```python

from datetime import datetime

logger = logging.getLogger(__name__)

def audit_tool_call(tool_name, args, task_id, **kwargs):
    logger.info("TOOL_CALL session=%s tool=%s args=%s",
                task_id, tool_name, json.dumps(args)[:200])

def register(ctx):
    ctx.register_hook("pre_tool_call", audit_tool_call)
```

**例 — 危ない道具のときに警告する:**

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

道具の実行が返った**直後**に発火します。

**呼び出しの形:**

```python
def my_callback(tool_name: str, args: dict, result: str, task_id: str,
                duration_ms: int, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `tool_name` | `str` | いま実行された道具の名前 |
| `args` | `dict` | モデルが道具に渡した引数 |
| `result` | `str` | 道具の戻り値（常に JSON の文字列です） |
| `task_id` | `str` | セッションや仕事の識別子。設定されていなければ空の文字列です。 |
| `duration_ms` | `int` | 道具の振り分けにかかった時間（ミリ秒）。`registry.dispatch()` のまわりを `time.monotonic()` で測ります。 |

**発火する場所:** `model_tools.py` の `handle_function_call()` の中、道具の処理役が返ったあとです。道具の呼び出しごとに一度発火します。道具が拾われない例外を投げたときは発火**しません**（そのエラーは捕まえられてエラーの JSON の文字列として返され、`post_tool_call` はその文字列を `result` として発火します）。

**戻り値:** 無視されます。

**使いどころ:** 道具の結果の記録、指標の集計、道具の成功・失敗の率の追跡、待ち時間のダッシュボード、道具ごとの予算の通知、特定の道具が終わったときの知らせ。

**例 — 道具の使われ方の指標を追う:**

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

道具を呼ぶ輪が始まる前に、**ターンにつき一度**発火します。使える戻り値はすべてプラグインの順にまとめられ、そのターンの利用者のメッセージへ差し込まれます。

**呼び出しの形:**

```python
def my_callback(session_id: str, user_message: str, conversation_history: list,
                is_first_turn: bool, model: str, platform: str, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `session_id` | `str` | 今のセッションを一意に示す識別子 |
| `user_message` | `str` | このターンの、利用者のもとのメッセージ（スキルの差し込みより前） |
| `conversation_history` | `list` | メッセージの並び全体の写し（OpenAI の形式: `[{"role": "user", "content": "..."}]`） |
| `is_first_turn` | `bool` | 新しいセッションの最初のターンなら `True`、そのあとのターンでは `False` |
| `model` | `str` | モデルの識別子（たとえば `"anthropic/claude-sonnet-4.6"`） |
| `platform` | `str` | セッションが動いている場所: `"cli"`、`"telegram"`、`"discord"` など |

**発火する場所:** `run_agent.py` の `run_conversation()` の中、文脈の圧縮のあと、本体の `while` の輪の前です。`run_conversation()` の呼び出しごと（つまり利用者のターンごと）に一度発火し、道具の輪の中の API 呼び出しごとではありません。

**戻り値:** 呼び出しが `"context"` の鍵を持つ辞書か、空でない素の文字列を返すと、その文章がこのターンの利用者のメッセージの後ろに足されます。差し込まないなら `None` を返してください。

```python
# Inject context
return {"context": "Recalled memories:\n- User likes Python\n- Working on hermes-agent"}

# Plain string (equivalent)
return "Recalled memories:\n- User likes Python"

# No injection
return None
```

**どこに差し込まれるか:** いつも**利用者のメッセージ**で、システムプロンプトには決して入りません。これでプロンプトのキャッシュが保たれます。システムプロンプトはターンをまたいで同じままなので、キャッシュされたトークンが使い回されます。システムプロンプトは Hermes の領分です（モデルへの案内、道具の当てはめ、人柄、スキル）。プラグインは、利用者の入力に並べて文脈を足します。

きれいな利用者のメッセージの `content` は変わりません。再生とプロンプトのキャッシュの安定のために、Hermes はプラグインが差し込んだ文脈も含めた、API に渡るそのままのメッセージを、その行の `api_content` の脇に残すことがあります。

**プラグインがいくつも**文脈を返したときは、その出力がプラグインの見つかった順（ディレクトリ名のアルファベット順）に、空行を挟んでつなげられます。

**使いどころ:** 記憶の呼び出し、RAG の文脈の差し込み、守りの柵、ターンごとの分析。

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

**例 — 守りの柵:**

```python
POLICY = "Never execute commands that delete files without explicit user confirmation."

def guardrails(**kwargs):
    return {"context": POLICY}

def register(ctx):
    ctx.register_hook("pre_llm_call", guardrails)
```

---

### `post_llm_call` {#postllmcall}

道具を呼ぶ輪が終わり、エージェントが最後の返事を作ったあと、**ターンにつき一度**発火します。発火するのは**成功した**ターンだけで、ターンが中断されたときは発火しません。

**呼び出しの形:**

```python
def my_callback(session_id: str, user_message: str, assistant_response: str,
                conversation_history: list, model: str, platform: str, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `session_id` | `str` | 今のセッションを一意に示す識別子 |
| `user_message` | `str` | このターンの、利用者のもとのメッセージ |
| `assistant_response` | `str` | このターンの、エージェントの最後の文章の返事 |
| `conversation_history` | `list` | ターンが終わったあとの、メッセージの並び全体の写し |
| `model` | `str` | モデルの識別子 |
| `platform` | `str` | セッションが動いている場所 |

**発火する場所:** `run_agent.py` の `run_conversation()` の中、道具の輪が最後の返事とともに抜けたあとです。`if final_response and not interrupted` で守られているので、利用者がターンの途中で割り込んだときや、エージェントが返事を作れないまま周回の上限に当たったときは発火**しません**。

**戻り値:** 無視されます。

**使いどころ:** 会話のデータを外の記憶の仕組みへ同期する、返事の質の指標を計算する、ターンのまとめを記録する、あとに続く動きの引き金を引く。

**例 — 外の記憶へ同期する:**

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

**例 — 返事の長さを追う:**

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

**エージェントがコードを直したターンにつき一度**、終わろうとする直前に（組み込みの、止まる前に確かめる守りのあとで）発火します。これは利用者やプラグインの方針の関所です。呼び出しは、エージェントをそこで止まらせるのではなく、進ませ続けられます — 確認を走らせる、後回しにする、差分を整える、といったことです。

Hermes が出荷している確認の案内は、既定の `pre_verify` のフックではありません。直したコードに新しい確認の証拠がないときに、証拠にもとづく「止まる前に確かめる」うながしへ足されるので、2本目の既定の継続の道を作ることはありません。この組み込みの証拠のうながしを短くしておきたいなら、`agent.verify_guidance: false` を設定してください。

**呼び出しの形:**

```python
def my_callback(session_id: str, platform: str, model: str, coding: bool,
                attempt: int, final_response: str, changed_paths: list, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `session_id` | `str` | 今のセッションを一意に示す識別子 |
| `platform` | `str` | セッションが動いている場所（`"cli"`、`"telegram"`、…） |
| `model` | `str` | モデルの識別子 |
| `coding` | `bool` | そのターンがコードを書く構えか（コードの作業場にいるか）。これでフックの範囲を絞ってください |
| `attempt` | `int` | このターンで、すでに何回うながされたか（最初は0）。これで自分に歯止めをかけてください |
| `final_response` | `str` | エージェントがこれから返そうとしている答え |
| `changed_paths` | `list` | このターンでエージェントが直したファイル（並べ替え済み。ここでは必ず空ではありません） |

`pre_tool_call` のフックが `tool_name` で範囲を絞るのと同じように、`coding` を見てコードの文脈にフックを絞り、`attempt` で一度だけにしてください（シェルのフックはどちらも `.extra` から読みます）。こうすれば `pre_verify` のフックをいくつも登録して、それぞれが必要なところでだけ発火するようにできます。

**発火する場所:** `agent/conversation_loop.py` の、エージェントが最後の答えを受け入れようとする地点、止まる前に確かめる検査の直後です。ただし、そのターンでエージェントがコードを直していて、かつ `pre_verify` のフックが少なくとも1つ登録されているときだけです。

**戻り値 — エージェントを進ませ続ける:**

```python
return {"action": "continue", "message": "Run the formatter on your changes, then finish."}
```

`message` は人工の利用者のターンとして足され、輪がもう一度動きます。Claude Code の Stop の形（`{"decision": "block", "reason": "..."}`。止まるのを遮る = *進み続ける*、という意味です）も受け付けます。メッセージのない指示、あるいはそれ以外の戻り値では、ターンはそのまま終わります。

**上限があります:** 1つのターンで続けて出せる continue の指示は `agent.max_verify_nudges`（既定は3）で頭打ちになるので、いつも continue と言うフックが輪を閉じ込めることはできません。答えようとした内容は履歴に残りますが、うながされているあいだは利用者に見せられません。

**何度動かしても同じ結果になるように:** フックはうながしのたびに再び発火するので、`attempt` で関所を作ってください（`if attempt: return None`）。そうしないと、上限に当たるまでうながし続けるだけになります。

**使いどころ:** 作りながら試している最中はテストや lint を後回しにする、特定のパスには緑の確認を求める、変更履歴の項目ができるまで「終わり」を遮る、案件ごとの確認の点検表を走らせる。

**例 — 見た目を作り込んでいる最中は確認を後回しにする。範囲を絞って、一度だけ:**

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

組み込みの「証拠が足りない」といううながしの形を決めたいだけの、ずっと効く案内には `agent.verify_guidance` を使ってください。確認を*関所にする*必要のない、もっと広いコードの構えの決まりには、`config.yaml` の `agent.coding_instructions` が向いています。コードの手引きに相乗りするので、余分なターンを使いません。

---

### `transform_api_error_classification` {#transformapierrorclassification}

API の呼び出しが失敗するたびに一度、`agent/error_classifier.classify_api_error()` の入口で、組み込みの流れより前に発火します。プロバイダのプラグインは、これを使って中核に手を入れずに、自分のプロバイダのエラーの癖を引き受けます。これはふるまいを変えるもの（変換の系統）で、返した分類が、やり直し、圧縮、資格情報の入れ替え、控えへの振り分けを動かします。

呼び出しは、解いたエラーの文脈をキーワード引数で受け取ります — `provider`（これで自分の範囲を絞ってください）、`model`、`status_code`、`error_type`、`error_code`、`error_message`、`error_body`、`error`、`approx_tokens`、`context_length`、`num_messages`。引き受けないなら `None` を、引き受けるなら辞書を返します。

```python
return {"reason": "model_not_found",   # required: a FailoverReason name
        "retryable": False, "should_fallback": True}  # optional recovery-hint overrides
```

振り分けは、全部走らせてから最初を選ぶ形です。呼び出しはすべて走り、失敗は切り離され、登録の順で最初の使える結果が勝ちます（使えるのに負けた結果は実行時の警告として記録されます）。使えない辞書と知らない理由は飛ばされるので、壊れたプラグインが分類を壊すことはできません。

**プライバシー:** `error_message` と `error_body` には、伏せられていないプロバイダのデータが入りえます。**Python のプラグインだけ**です。シェルからの登録は、設定を読むときに警告とともに断られます。

---

### `on_session_start` {#onsessionstart}

まったく新しいセッションが作られたときに**一度**発火します。セッションの続き（すでにあるセッションで2つ目のメッセージを送ったとき）では発火**しません**。

**呼び出しの形:**

```python
def my_callback(session_id: str, model: str, platform: str, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `session_id` | `str` | 新しいセッションを一意に示す識別子 |
| `model` | `str` | モデルの識別子 |
| `platform` | `str` | セッションが動いている場所 |

**発火する場所:** `run_agent.py` の `run_conversation()` の中、新しいセッションの最初のターンで、正確にはシステムプロンプトが組み上がったあと、道具の輪が始まる前です。判定は `if not conversation_history`（前のメッセージがなければ新しいセッション）です。

**戻り値:** 無視されます。

**使いどころ:** セッションの範囲の状態の初期化、キャッシュの温め、外のサービスへのセッションの登録、セッションの始まりの記録。

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

結末にかかわらず、`run_conversation()` の呼び出しの**いちばん最後**に発火します。利用者が抜けたときにエージェントがターンの途中だったなら、CLI の終了の処理役からも発火します。

**呼び出しの形:**

```python
def my_callback(session_id: str, completed: bool, interrupted: bool,
                model: str, platform: str, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `session_id` | `str` | セッションを一意に示す識別子 |
| `completed` | `bool` | エージェントが最後の返事を作ったなら `True`、そうでなければ `False` |
| `interrupted` | `bool` | ターンが中断されたなら `True`（利用者が新しいメッセージを送った、`/stop`、あるいは終了） |
| `model` | `str` | モデルの識別子 |
| `platform` | `str` | セッションが動いている場所 |

**発火する場所:** 2か所です。
1. **`run_agent.py`** — `run_conversation()` の呼び出しの最後、片づけがすべて済んだあと。ターンがエラーになっても、必ず発火します。
2. **`cli.py`** — CLI の atexit の処理役の中。ただし、終了が起きたときにエージェントがターンの途中だった（`_agent_running=True`）ときに**だけ**です。処理中の Ctrl+C や `/exit` がこれに当たります。このとき `completed=False`、`interrupted=True` になります。

**戻り値:** 無視されます。

**使いどころ:** 溜めたものの吐き出し、接続の後始末、セッションの状態の保存、セッションの長さの記録、`on_session_start` で用意した資源の片づけ。

**例 — 吐き出しと片づけ:**

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

CLI やゲートウェイが、動いているセッションを**畳む**ときに発火します。たとえば `/new` が実行されたとき、ゲートウェイが手すきのセッションを片づけたとき、エージェントが動いたまま CLI が終わったときです。出ていくセッションの ID に結びついた状態を吐き出すのに使ってください。ゲートウェイの作り直しでは、この呼び出しが動く前に、入れ替わりのセッションがすでにできています。

**呼び出しの形:**

```python
def my_callback(session_id: str | None, platform: str, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `session_id` | `str` または `None` | 出ていくセッションの ID。動いているセッションがなかったときは `None` のことがあります。 |
| `platform` | `str` | `"cli"` か、メッセージの場の名前（`"telegram"`、`"discord"` など）。 |

**発火する場所:** CLI／TUI の片づけと、ゲートウェイの作り直し・終了・手すきでの期限切れの経路です。ゲートウェイの終了と期限切れでは、対になる `on_session_reset` なしで締められることがあります。

**戻り値:** 無視されます。

**使いどころ:** セッションの ID が捨てられる前に最後の指標を残す、セッションごとの資源を閉じる、最後の計測の出来事を出す、待っている書き込みを流し切る。

---

### `on_session_reset` {#onsessionreset}

CLI や TUI のセッションの切れ目、あるいはゲートウェイが動いているチャットの**セッションの鍵を新しいものに差し替えた**ときに発火します。これでプラグインは、次の `on_session_start` を待たずに、会話の状態が消えたことに応じられます。

**呼び出しの形:**

```python
def my_callback(session_id: str, platform: str, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `session_id` | `str` | 新しいセッションの ID（すでに新しい値へ入れ替わっています）。 |
| `platform` | `str` | `"cli"`、`"tui"`、あるいはメッセージの場の名前。 |
| `reason` | `str`、任意 | CLI とゲートウェイの作り直しの経路で付きます。 |
| `old_session_id` | `str`、任意 | ゲートウェイだけ。出ていくセッションの ID。 |
| `new_session_id` | `str`、任意 | ゲートウェイだけ。入れ替わりのセッションの ID。 |

**発火する場所:** CLI は `session_id`、`platform`、`reason` を渡します。TUI は `session_id` と `platform` を渡します。ゲートウェイは、入れ替わりの鍵を割り当てたあとに `reason`、`old_session_id`、`new_session_id` を足します。ゲートウェイの作り直しでの順番は、入れ替わりを作って保存 → `on_session_finalize(old_id)` → `on_session_reset(new_id)` → 最初の入ってくるターンで `on_session_start(new_id)`、となります。

**戻り値:** 無視されます。

**使いどころ:** `session_id` を鍵にしたセッションごとのキャッシュの作り直し、「セッションが入れ替わった」という分析の送出、新しい状態の入れ物の下ごしらえ。

---

道具の設計図、処理役、進んだフックの形まで含めた通しの説明は、**[プラグインを作る手引き](/hermes/docs/developer-guide/plugins/)**を見てください。

---

### `subagent_start` {#subagentstart}

`delegate_task` が子の `AIAgent` を組み立てたあと、その子が走る前に、**子のエージェントにつき一度**発火します。仕事を1つ任せても、3つまとめて任せても、このフックは子ごとに一度ずつ発火します。

このフックは委任・サブエージェントの流れに限ったものです。ゲートウェイ、CLI、cron、まとめ処理、MoA、そのほか実行役の始めるエージェントの実行に対する、「どのエージェントの呼び出しの前にも効く」万能の関所ではありません。

**呼び出しの形:**

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
| `parent_session_id` | `str \| None` | 任せる側の親のエージェントのセッション ID。 |
| `parent_turn_id` | `str` | 委任を求めた親のエージェントのターンの ID。あるときだけ。 |
| `parent_subagent_id` | `str \| None` | この子が別のサブエージェントから生まれたときの、親のサブエージェントの ID。いちばん上の親のエージェントでは `None` です。 |
| `child_session_id` | `str \| None` | 子のエージェントに割り当てられたセッション ID。 |
| `child_subagent_id` | `str` | 委任の見通しと制御で使う、変わらないサブエージェントの ID。 |
| `child_role` | `str` | 委任の方針を当てたあとの、子の実際の役割。たとえば `"leaf"` や `"orchestrator"`。 |
| `child_goal` | `str` | 子のエージェントが実行する、任された目的やプロンプト。 |

**発火する場所:** `tools/delegate_tool.py` の `_build_child_agent()` の中、子の `AIAgent` が組み上がってサブエージェントの身元の情報が付けられたあと、`_run_single_child()` が子を走らせる前です。

**戻り値:** 無視されます。これは見張り役のフックだけで、値を返しても子のエージェントの実行を遮ったり変えたりはできません。

**使いどころ:** サブエージェントが作られたことの記録、親と子のセッションの関係の対応づけ、入れ子になった委任の木の追跡、走る前の監査の記録の送出、子ごとの見通しの資源の先取り。

**例 — サブエージェントの誕生を記録する:**

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
`subagent_start` は委任の見通しには役立ちますが、遮ることのできる方針のフックではありません。子が組み立てられる前に委任を遮りたいなら、[`pre_tool_call`](#pre_tool_call) で `delegate_task` の道具の呼び出しを遮ってください。
:::

---

### `subagent_stop` {#subagentstop}

`delegate_task` が終わったあと、**子のエージェントにつき一度**発火します。仕事を1つ任せても、3つまとめて任せても、このフックは子ごとに一度ずつ発火します。振り分けは、子の未来の値が出そろったあとに親のスレッドの上で順に行われ、Python の呼び出しの中身はどれもその同じ呼び出し元のスレッドで動きます（制限時間の働き手の上ではありません）。

**呼び出しの形:**

```python
def my_callback(parent_session_id: str, child_role: str | None,
                child_summary: str | None, child_status: str,
                tool_call_history: list[dict], duration_ms: int, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `parent_session_id` | `str` | 任せる側の親のエージェントのセッション ID |
| `child_role` | `str \| None` | 子に付けられた取りまとめ役の役割の札（この働きが無効なら `None`） |
| `child_summary` | `str \| None` | 子が親へ返した最後の返事 |
| `child_status` | `str` | `"completed"`、`"failed"`、`"interrupted"`、`"error"` のいずれか |
| `tool_call_history` | `list[dict]` | 順に並んだ、情報だけの道具の呼び出し: `tool_name`、大きさを抑えた `tool_input`、`input_bytes`、`output_bytes`、`status`。生の入力と出力は入りません |
| `duration_ms` | `int` | 子を走らせるのにかかった実時間（ミリ秒） |

**発火する場所:** `tools/delegate_tool.py` の、`ThreadPoolExecutor.as_completed()` が子の未来の値をすべて出しきったあとです。`invoke_hook("subagent_stop", ...)` は親のスレッドへ渡されるので、書く側が子の処理の束の再入を気にせずに済み、呼び出しはその呼び出し元のスレッドに留まります。

**戻り値:** 無視されます。

**使いどころ:** 取りまとめの動きの記録、請求のための子の所要時間の積み上げ、委任のあとの監査の記録の書き出し。

**例 — 取りまとめの動きを記録する:**

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
委任が重なると（たとえば取りまとめ役 × 葉5つ × 入れ子の深さ）、`subagent_stop` は1ターンに何度も発火します。呼び出しは軽く保ち、重い仕事は裏の待ち行列へ回してください。
:::

---

### `pre_gateway_dispatch` {#pregatewaydispatch}

ゲートウェイで、内部の出来事の守りのあと、認証・対応づけとエージェントへの振り分けの**前**に、**入ってくる `MessageEvent` につき一度**発火します。どれか1つの場のアダプタにはきれいに収まらない、ゲートウェイの高さでのメッセージの流れの方針（聞くだけの時間帯、人への引き継ぎ、チャットごとの振り分けなど）を横取りする地点です。

**呼び出しの形:**

```python
def my_callback(event, gateway, session_store, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `event` | `MessageEvent` | 整えられた入ってくるメッセージ（`.text`、`.source`、`.message_id`、`.internal` などを持ちます）。 |
| `gateway` | `GatewayRunner` | 動いているゲートウェイの実行役。プラグインは `gateway.adapters[platform].send(...)` を呼んで、脇道からの返事（持ち主への知らせなど）を出せます。 |
| `session_store` | `SessionStore` | `session_store.append_to_transcript(...)` で、静かに記録へ取り込むために。 |

**発火する場所:** `gateway/run.py` の `GatewayRunner._handle_message()` の中、`is_internal` が求められた直後です。**内部の出来事はこのフックを丸ごと飛ばします**（裏のプロセスの完了など、仕組みが自分で出したもので、利用者向けの方針に関所を張られてはいけないからです）。

**戻り値:** `None` か辞書です。最初に見分けの付いた動きの辞書が勝ち、残りのプラグインの結果は無視されます。プラグインの呼び出しの中の例外は捕まえて記録され、エラーのときゲートウェイは必ず普通の振り分けへ落ちます。

| 戻り値 | 効き方 |
|--------|--------|
| `{"action": "skip", "reason": "..."}` | メッセージを捨てます。エージェントの返事も、対応づけの流れも、認証もありません。プラグインが引き受けたものとみなされます（たとえば静かに記録へ取り込んだ場合）。 |
| `{"action": "rewrite", "text": "new text"}` | `event.text` を置き換えて、変えた出来事で普通の振り分けを続けます。溜めておいた周りのメッセージを1つのプロンプトにまとめるのに便利です。 |
| `{"action": "allow"}` / `None` | 普通の振り分けです。認証・対応づけ・エージェントの輪の一連がすべて動きます。 |

**使いどころ:** 聞くだけのグループのチャット（名前を呼ばれたときだけ答え、周りのメッセージは文脈として溜める）、人への引き継ぎ（持ち主が手で相手をしているあいだ、客のメッセージを静かに取り込む）、プロファイルごとの回数の制限、方針にもとづく振り分け。

**例 — 許していない DM を、対応づけの合図を出さずに静かに捨てる:**

```python
def deny_unauthorized_dms(event, **kwargs):
    src = event.source
    if src.chat_type == "dm" and not _is_approved_user(src.user_id):
        return {"action": "skip", "reason": "unauthorized-dm"}
    return None

def register(ctx):
    ctx.register_hook("pre_gateway_dispatch", deny_unauthorized_dms)
```

**例 — 名前を呼ばれたときに、溜めた周りのメッセージを1つのプロンプトへ書き換える:**

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

対応している場に固有の出来事についてだけ、ゲートウェイの普通の、プロファイル単位の認可の検査が通った**あと**に発火します。呼び出しには素の辞書が渡されます。生の SDK の物、アダプタの取っ手、bot のクライアント、呼び出しの文脈が、この安定した取り決めに含まれることはありません。

最初に対応したのは Telegram のメッセージへの反応で、そのあとメッセージの編集、削除、スレッドの節目の出来事が続きました。

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
| `platform` | `str` | 変わらない場の ID（`"telegram"`、`"discord"`）。 |
| `event_type` | `str` | その出来事だけの取り決めの ID（下の表を見てください）。 |
| `payload` | `dict` | 出来事の種類ごとの項目。下に種類ごとに書いてあります。 |

どの中身も足していく形で、出来事ごとに違います。ゲートウェイの中身に、まとめて1つの版が付くことはありません。ID はすべて文字列で、ないものや取れないものは `None` になり、当て推量はしません。形の崩れた出来事や、出どころを認可できない出来事は捨てられます（安全側で止まります）。Telegram の Application が一時的に組み直されたときは、中核の処理役と一緒に見張り役も登録し直されます。

**出来事ごとの中身の取り決め（v1、足していく形）:**

| `event_type` | 場 | 中身の項目 |
|--------------|-----------|----------------|
| `reaction` | telegram | `emojis: list[str]`、`custom_emoji_ids: list[str]`、`chat_id: str`、`message_id: str`、`thread_id: str \| None`（Telegram の反応の知らせは話題の ID を運ばないので、今のところ常に `None` です）。 |
| `message_edited` | telegram, discord | `chat_id: str`、`message_id: str`、`thread_id: str \| None`、`text: str \| None`（直された文章か説明文。大きさは抑えられます。画像だけの編集や、控えにないときは `None`）、`edited_at: str \| None`（ISO 8601）。 |
| `message_deleted` | discord | `chat_id: str`、`message_id: str`、`thread_id: str \| None`、`author_id: str \| None`。Discord の削除の出来事は誰が消したかを示しません。認可の対象になるのは消されたメッセージの書き手で、控えにない削除は発火しません。 |
| `thread_created` | discord | `thread_id: str`、`parent_chat_id: str \| None`、`name: str \| None`、`owner_id: str \| None`。 |
| `thread_renamed` | discord | `thread_id: str`、`parent_chat_id: str \| None`、`old_name: str \| None`、`new_name: str`。名前が実際に変わったときにだけ発火します。ほかのスレッドの更新（保管、書き込みの間隔、札）は捨てられます。Discord のスレッドの更新の出来事は誰がしたかを運ばないので、スレッドの持ち主が認可の対象になります。 |

bot 自身が少しずつメッセージを直していくもの（流れる出力）は、Discord で `message_edited` を発火させません。bot が書いた出来事は、発火の場所で捨てられます。

このフックは見張り役だけです。生の出来事やアダプタへの手がかりを**足しません**。**生の SDK の中身へ触れる道はわざと出荷していません**。アダプタの SDK の物は知らせなく形が変わり、育てられない API の面になってしまうからです。本当に要るところでは、「安定は保証しない」という札を付けた専用の能力（`gateway.raw_events`）と、それ自身の設計が必要になります（#64228 で追われています）。場に対して*働きかける*（反応を付ける、スレッドの名前を変える）には、[プラグインの手引き](/hermes/docs/user-guide/features/plugins/#platform-actions)にある、能力で守られた `ctx.platform_actions` の窓口を使ってください。これは `gateway.platform_actions` の能力の後ろで、既定では閉じています。`PluginContext.dispatch_tool()` が呼べるのは道具の登録簿にある道具だけです。`send_message` はわざとそこに登録していません（その運び方は、はっきりした CLI、cron、かんばん、MCP の受け渡しの経路のために取ってあります）。この先の外向きの受け渡しの取り決めは、まずすべてのアダプタで安定した、届いた中身と取っ手を用意しなければなりません。この切り出しでは、働かない `gateway_message_delivered` のフックを先に登録しておくようなことはしません。

---

### `pre_approval_request` {#preapprovalrequest}

承認の判断が求められる前に発火します。尋ねる形の面 — 対話的な CLI、Ink の TUI、ゲートウェイの場、ACP のクライアント — と、人に尋ねずに下される `approvals.mode=smart` の判断（`surface="smart"`）を覆います。賢いモードでは、補助の LLM が呼ばれる前にこのフックが動きます。

自作の知らせ役をつなぐのはここです。たとえば、許可・拒否の通知を出す macOS のメニューバーのアプリや、承認の求めを文脈ごと記録する監査のログです。

**呼び出しの形:**

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
| `command` | `str` | 見定められている端末のコマンドか `execute_code` のスクリプト。賢い経路とゲートウェイの中身は、見張り役へ配る前に伏せ字にされます。賢い見張りの伏せ字は、`security.redact_secrets` を切っていても必ず行われます。伏せ字に失敗したときは、賢い経路のフックは飛ばされます。 |
| `description` | `str` | そのコマンドが引っかかった、人が読める理由（いくつも当たったときはまとめられます） |
| `pattern_key` | `str` | 承認の引き金になった主な模様の鍵（たとえば `"rm_rf"`、`"sudo"`） |
| `pattern_keys` | `list[str]` | 当たった模様の鍵をすべて |
| `session_key` | `str` | セッションの識別子。チャットごとに知らせを分けるのに便利です |
| `surface` | `str` | 対話的な CLI／TUI の問いかけなら `"cli"`、場での非同期の承認なら `"gateway"`、補助の LLM による自動の許可・拒否の判断なら `"smart"` |

**戻り値:** 無視されます。ここでのフックは見張り役だけで、承認を退けたり先回りして答えたりはできません。承認の仕組みに届く前に道具を遮りたいなら、[`pre_tool_call`](#pre_tool_call) を使ってください。

**使いどころ:** デスクトップの通知、押し出しの知らせ、監査の記録、Slack への webhook、上位への振り分け、指標。

**例 — macOS でのデスクトップの通知:**

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

尋ねる形や賢い承認の判断のあと、問いかけが時間切れになったあと、あるいはゲートウェイが承認の知らせを届けられなかったときに発火します。知らせの失敗では、承認の判断がまだない状態で `choice="notify_failed"` が出ます。

**呼び出しの形:**

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
| `choice` | `str` | 尋ねる形の面では `"once"`、`"session"`、`"always"`、`"deny"`、`"timeout"`、`"notify_failed"`。賢い判断では `"smart_approve"` か `"smart_deny"` |
| `decided_by` | `str` | 賢い判断では `"aux_llm"`。尋ねる形の面では付きません |

**戻り値:** 無視されます。

**使いどころ:** 対応するデスクトップの通知を閉じる、最後の判断を監査のログに残す、指標を更新する、回数の制限を先へ進める。

```python
def log_decision(command, choice, session_key, **kwargs):
    logger.info("approval %s: %s for session %s", choice, command[:60], session_key)

def register(ctx):
    ctx.register_hook("post_approval_response", log_decision)
```

---

### `pre_transcription` {#pretranscription}

STT の振り分け役（`tools.transcription_tools.transcribe_audio`）の中で、プロバイダが決まった**あと**、どの裏方が呼ばれる**前**にも発火します。その裏方が組み込みでも、`type: command` のプロバイダでも、プラグインが登録したプロバイダでも同じです。あとから書き起こしを眺めるだけでなく、書き起こしの求めそのものをプラグインが導けます。

**呼び出しの形:**

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
| `file_path` | `str` | これから書き起こされる音声のファイルの絶対の場所。読み取り専用です。 |
| `provider` | `str` | 決まった STT のプロバイダ（`local`、`groq`、`openai`、`mistral`、`xai`、`elevenlabs`、`deepinfra`、`local_command`、コマンドのプロバイダの名前、プラグインのプロバイダの名前）。 |
| `model` | `str \| None` | ここまでに決まったモデル。裏方の既定に任せるなら `None`。 |
| `language` | `str \| None` | プロバイダの設定の節にある言語。なければ `None`。 |
| `prompt` | `str \| None` | 固定の [`stt.prompt`](/hermes/docs/user-guide/configuration/#transcription-prompt-vocabulary-hints) の値。なければ `None`。 |
| `source` | `str \| None` | 呼び出し元の面の札（`gateway`、`voice_mode`、…）。見通しのためだけで、振り分けには使いません。 |

**戻り値:** `"prompt"`、`"language"`、`"model"` のどれかを文字列に対応づけた `dict`、あるいは求めをそのままにするなら `None` です。文字列でない値、知らない鍵、`file_path` は無視されます（`file_path` を書こうとすると警告として記録されます）。結果は `stt.prompt` の設定の値の上に、**登録の順で、項目ごとに最後に書いたものが勝つ**形で当てられます。`prompt` に `""` を返すと、その求めについては設定されたプロンプトが消えます。

**使いどころ:** 音声が上がる前に利用者ごと・チャットごとの語彙の並びを差し込む、呼び出し元の地域から `language` を決める、長い録音では `model` を下げる、雑音の多い出どころを別のモデルへ回す。

```python
VOCAB = "Hermes, Teknium, Nous Research, kanban"

def add_vocab(provider, prompt, source, **kwargs):
    if source != "gateway":
        return None
    return {"prompt": f"{prompt}. {VOCAB}" if prompt else VOCAB}

def register(ctx):
    ctx.register_hook("pre_transcription", add_vocab)
```

どの裏方もプロンプトを受け取るわけではありません。`local` はこれを faster-whisper の `initial_prompt` に対応づけ、`openai`、`groq`、`mistral`、`deepinfra` は `prompt` として送り、`xai`、`elevenlabs`、`local_command`、`type: command` のプロバイダは DEBUG に記録してプロンプトなしで書き起こします。対応の全体とプライバシーの境目は、[プロバイダの対応表](/hermes/docs/user-guide/configuration/#transcription-prompt-vocabulary-hints)を見てください。フックのつなぎのエラーは開く側に倒れます。求めは変えられないまま、振り分けが続きます。

---

### `transform_tool_result` {#transformtoolresult}

道具が返った**あと**、その結果が会話へ足される**前**に発火します。端末の出力だけでなく、どの道具の結果の文字列でも、モデルが見る前にプラグインが書き換えられます。

**呼び出しの形:**

```python
def my_callback(tool_name: str, args: dict, result: str, task_id: str, **kwargs) -> str | None:
```

中身の全体には `session_id`、`tool_call_id`、`turn_id`、`api_request_id`、`duration_ms`、`status`、`error_type`、`error_message` も入ります。`result` は道具の振り分けが返した最後の結果で、これと `args` には利用者や道具の任意の中身と秘密が入りえます。

**戻り値:** 最初の `str` が結果を置き換えます（空の文字列も含みます）。`None` ならそのままです。

**使いどころ:** `web_extract` の出力から組織に固有の個人情報を伏せる、長い JSON の道具の返事をまとめの見出しで包む、`read_file` の結果に検索で補った手がかりを差し込む、`delegate_task` のサブエージェントの報告を案件ごとの形へ書き換える。

```python

SECRET = re.compile(r"sk-[A-Za-z0-9]{32,}")

def redact_secrets(tool_name, result, **kwargs):
    if SECRET.search(result):
        return SECRET.sub("[REDACTED]", result)
    return None

def register(ctx):
    ctx.register_hook("transform_tool_result", redact_secrets)
```

すべての道具に効きます。端末だけを書き換えたいなら、下の `transform_terminal_output` を見てください。あちらは範囲が狭く、`transform_tool_result` より前に動き、その置き換えも端末の道具の最後の出力の制限を受けます。

---

### `transform_terminal_output` {#transformterminaloutput}

`terminal` の道具の中で、前面のプロセスの取り込みが環境によってすでに区切られたあと、最後の出力の制限の前に発火します。プラグインが、取り込んだ標準出力・標準エラーを置き換えられます。置き換えたものも、最後の出力の制限を受けます。

**呼び出しの形:**

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
| `command` | `str` | その出力を出したシェルのコマンド。 |
| `output` | `str` | 区切られたプロセスの取り込みのあとの、標準出力と標準エラーを合わせたもの。 |
| `returncode` | `int` | プロセスの戻り値。 |
| `task_id` | `str` | 実際の仕事の識別子。なければ空の文字列。 |
| `env_type` | `str` | 実行の環境の種類。 |

**戻り値:** 最初の `str` が出力を置き換えます。`None` ならそのままです。コマンドと出力には、資格情報やそのほかの機微なデータが入りえます。

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

`transform_tool_result` と対になります。あちらは `terminal` も含めたすべての道具について、このあとに動きます。

---

### `transform_llm_output` {#transformllmoutput}

道具を呼ぶ輪が終わってモデルが最後の返事を作ったあと、その返事が利用者（CLI、ゲートウェイ、あるいはプログラムからの呼び出し元）へ渡される**前**に、**ターンにつき一度**発火します。プラグインが、昔ながらのプログラムのやり方でアシスタントの最後の文章を書き換えられます。人柄の味付けの文章やスキルによる変換に、推論のトークンを余分に燃やしません。

**呼び出しの形:**

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
| `response_text` | `str` | このターンの、アシスタントの最後の返事の文章。 |
| `session_id` | `str` | この会話のセッション ID（使い捨ての実行では空のことがあります）。 |
| `model` | `str` | その返事を作ったモデルの名前（たとえば `anthropic/claude-sonnet-4.6`）。 |
| `platform` | `str` | 届け先の場（`cli`、`telegram`、`discord`、…。設定がなければ空）。 |

**戻り値:** 空でない `str` なら返事の文章を置き換え、`None` か空の文字列ならそのままです。プラグインがいくつも登録されているときは、**空でない最初の文字列が勝ちます**。道具や端末の変換と違い、空の文字列は置き換えとして受け付けません。

**使いどころ:** 人柄や語彙の変換を当てる（海賊のことば、スポンジ・ボブ）、最後の文章から利用者を特定できるものを伏せる、案件ごとの署名を足す、人柄の指示にトークンを使わずに社内の文体を守らせる。

CLI で流れる出力が有効なときは、足すだけの変換は流れた本文のあとに表示されます。返事を置き換える変換は、流れた本文のあとに全文が表示され、流れたあとの変換であることが示されるので、置き換えた中身が黙って消えることはありません。

```python

def spongebob(response_text, **kwargs):
    if os.environ.get("SPONGEBOB_MODE") != "on":
        return None  # pass through unchanged
    return re.sub(r"!", "!! Tartar sauce!", response_text)

def register(ctx):
    ctx.register_hook("transform_llm_output", spongebob)
```

このフックは、空でなく中断もされていない返事に限って動きます。停止のボタンによる中断や、空のターンでは発火しません。例外は警告として記録され、エージェントの実行を壊しません。

### API の求めを見張るフック {#api-request-observer-hooks}

#### `pre_api_request` {#preapirequest}

プロバイダへの試みごとに、送る直前に発火します。見張り役だけです。古くからの `user_message`、`conversation_history`、`request_messages` の項目は、互換のためにわざと生のまま整えられていません。これから作るものは、整えられた `request` の封筒のほうを使ってください。

#### `post_api_request` {#postapirequest}

プロバイダの返事が問題なく整えられたあとに発火します。見張り役だけです。整えられた `response` のほうを使ってください。`assistant_message` は生のまま整えられたメッセージで、`usage` には勘定のデータが入っています。

#### `api_request_error` {#apirequesterror}

プロバイダへの試みが失敗したときに、状態ややり直しの時間、`error` の物、整えられた `request` とともに発火します。見張り役だけです。エラーの文章には、プロバイダや利用者のデータが残っていることがあります。

### `on_skill_lifecycle` {#onskilllifecycle}

スキルの使用の状態が正式に変わったあとに発火します。見張り役だけで、手元の `skill_name`、出どころ、突き合わせ用の ID、使った回数、使い回しの旗が見えます。

### かんばんの節目の見張り役 {#kanban-lifecycle-observers}

#### `kanban_task_claimed` {#kanbantaskclaimed}

振り分け役のプロセスで取得が確定したあと、働き手が生まれる直前に発火します。

#### `kanban_task_completed` {#kanbantaskcompleted}

完了と片づけのあと、たいていは働き手のプロセスで発火します。`summary` には案件や利用者の中身が入りえます。

#### `kanban_task_blocked` {#kanbantaskblocked}

普通に止まったことへ移ったあとに発火します。依存待ちの経路では、その書き込みの取引が終わる前に呼ばれます。`reason` には案件や利用者の中身が入りえます。

かんばんのこの3つのフックはどれも見張り役だけで、`task_id`、`profile_name`、`board`、`assignee`、`run_id` を運びます。completed には `summary` が、blocked には `reason` が足されます。

### かんばんの働き手の節目、仕事の書き換え、振り分けの見張り役 {#kanban-worker-lifecycle-task-mutation-and-dispatch-observers}

さらに5つの見張り役（RFC #58548）が、かんばんの系統を広げます。どれも見張り役だけで、関わる取引が確定したあとに発火し、`has_hook` で短絡します。購読する人がいなければ、振り分けのふるまいは変わりません。仕事の範囲のフックは、上のフックと同じ共通の項目を運びます。

- **`on_kanban_worker_spawned`** — `spawn_fn` が返り、働き手の PID が保存されたあと。`worker_pid`（`None` のことがあります）と `workspace_path` が足されます。振り分けの錠の中で動くので、呼び出しは軽く保ってください。
- **`on_kanban_worker_exited`** — 見回り由来。`detect_crashed_workers` が死んだ PID の仕事を取り戻したとき。`worker_pid`、`exit_kind`、`exit_code`、`outcome`、`retry_status` が足されます。
- **`on_kanban_worker_stale_claim`** — 期限の切れた取得が取り戻されたとき。PID が生きている延長では発火しません。`worker_pid`、`heartbeat_stale`、`retry_status` が足されます。
- **`on_kanban_task_updated`** — 取得・完了・停止の流れの外で、仕事の項目への書き込みが確定したあと（`assign_task`、モデルや考え方の上書き、ダッシュボードの編集）。`changed_fields` が足されます。項目の名前だけで、値は入りません。
- **`on_kanban_dispatch_tick`** — 振り分け役の見回りごとに一度、振り分けの錠が外れたあとで確実に。何もない見回りや、錠を取り合った見回りも含みます。中身は `board`、`profile_name`、`dry_run`、`outcome`、`result` です。

---

## シェルのフック {#shell-hooks}

`~/.hermes/config.yaml` にシェルのスクリプトのフックを書いておくと、対応するプラグインのフックの出来事が発火するたびに、Hermes がそれを子プロセスとして走らせます。CLI のセッションでもゲートウェイのセッションでも動きます。Python のプラグインを書く必要はありません。

差し込むだけの、1つのファイル（Bash、Python、shebang のあるものなら何でも）で次のことをしたいときに、シェルのフックを使ってください。

- **道具の呼び出しを遮る、あるいは変える** — 危ない `terminal` のコマンドを断る、ディレクトリごとの方針を当てる、壊す方向の `write_file` や `patch` に承認を求める、あるいは道具が動く前に引数を書き換える（パスを掃除する、既定を差し込む）。
- **道具の呼び出しのあとに動かす** — エージェントがいま書いた Python や TypeScript のファイルを自動で整える、API の呼び出しを記録する、CI の流れの引き金を引く。
- **次の LLM のターンに文脈を差し込む** — `git status` の出力や、今日の曜日、探してきた文書を利用者のメッセージの前に足す（[`pre_llm_call`](#pre_llm_call) を見てください）。
- **節目の出来事を見張る** — サブエージェントが終わったとき（`subagent_stop`）やセッションが始まったとき（`on_session_start`）にログの行を書く。

シェルのフックは、CLI の立ち上がり（`hermes_cli/main.py`）とゲートウェイの立ち上がり（`gateway/run.py`）の両方で `agent.shell_hooks.register_from_config(cfg)` を呼んで登録されます。Python のプラグインのフックとも自然に組み合わさります。どちらも同じ振り分け役を通るからです。

### ひと目で見る違い {#comparison-at-a-glance}

| 観点 | シェルのフック | [プラグインのフック](#plugin-hooks) | [ゲートウェイのフック](#gateway-event-hooks) |
|-----------|-------------|-------------------------------|---------------------------------------|
| 書く場所 | `~/.hermes/config.yaml` の `hooks:` の塊 | `plugin.yaml` のプラグインの `register()` | `HOOK.yaml` と `handler.py` のディレクトリ |
| 置き場所 | `~/.hermes/agent-hooks/`（決まりごととして） | `~/.hermes/plugins/<name>/` | `~/.hermes/hooks/<name>/` |
| 言語 | 何でも（Bash、Python、Go の実行ファイル、…） | Python だけ | Python だけ |
| 動く場所 | CLI とゲートウェイ | CLI とゲートウェイ | ゲートウェイだけ |
| 出来事 | `VALID_HOOKS`（`subagent_stop` も含む） | `VALID_HOOKS` | ゲートウェイの節目（`gateway:startup`、`agent:*`、`command:*`） |
| 道具の呼び出しを遮れるか | はい（`pre_tool_call`） | はい（`pre_tool_call`） | いいえ |
| LLM に文脈を差し込めるか | はい（`pre_llm_call`） | はい（`pre_llm_call`） | いいえ |
| 同意 | `(event, command)` の組ごとに初回だけ尋ねます | 暗黙（Python のプラグインへの信頼） | 暗黙（ディレクトリへの信頼） |
| プロセスの隔離 | あり（子プロセス） | なし（同じプロセス内） | なし（同じプロセス内） |

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

出来事の名前は[プラグインのフックの出来事](#plugin-hooks)のどれかでなければなりません。打ち間違いは「Did you mean X?」の警告を出して飛ばされます。1つの項目の中の知らない鍵は無視され、`command` がなければ警告を出して飛ばされます。`timeout > 300` は警告とともに切り詰められます。`pre_tool_call` 以外の出来事に付いた `fail_closed: true` は警告を出して無視されます（遮れる出来事だけが安全側で止まれるからです）。

### JSON でのやり取りの決まり {#json-wire-protocol}

出来事が発火するたびに、Hermes は当てはまるフック（matcher が許すもの）ごとに子プロセスを立ち上げ、JSON の中身を**標準入力**に流し、**標準出力**を JSON として読み返します。

**標準入力 — スクリプトが受け取るもの:**

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

道具に関わらない出来事（`pre_llm_call`、`subagent_stop`、セッションの節目）では、`tool_name` と `tool_input` は `null` になります。`extra` の辞書は、その出来事に固有のキーワード引数（`user_message`、`conversation_history`、`child_role`、`duration_ms`、…）をすべて運びます。そのままでは形にできない値は、省かれるのではなく文字列にされます。

**標準出力 — 任意の返事:**

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

形の崩れた JSON、0 でない終了コード、時間切れは警告として記録されますが、エージェントの輪を止めることは決してありません。

### 終了コード 2 は遮断（Claude Code や Cursor と同じ） {#exit-code-2-block-claude-code-cursor-compatible}

`pre_tool_call` のフックが終了コード **2** で終わると、標準出力に遮断の JSON がなくても道具の呼び出しは遮られます。遮断のメッセージは次の順で決まります。

1. 標準出力の遮断の JSON（`reason` か `message`）。あるとき。
2. 標準エラーの先頭 400 文字。
3. 既定の `"Blocked by shell hook."`。

つまり、いちばん簡単な遮断のフックはこうなります。

```bash
#!/usr/bin/env bash
echo "policy violation: rm -rf is not permitted" >&2
exit 2
```

遮断の指示が通らない出来事（`pre_tool_call` 以外すべて）では、終了コード 2 はほかの 0 でない終了と同じ扱いです。警告が記録され、標準出力はそれでも読まれます。

### 開く側に倒すか、安全側で止まるか {#fail-open-vs-fail-closed}

既定では、シェルのフックは**開く側に倒れます**。立ち上げのエラー、時間切れ、読めない標準出力は警告として記録され、動作はそのまま進みます。見張るためのフックにはそれが正しい既定ですが、安全のための関所には間違っています。落ちた秘密の検査役が、本来調べるはずだった道具の呼び出しを黙って通してしまってはいけません。

`pre_tool_call` の項目に `fail_closed: true`（あるいは Cursor や Claude Code の書き方の `failClosed: true`）を設定すると、これが逆になります。

```yaml
hooks:
  pre_tool_call:
    - matcher: "terminal|write_file|patch"
      command: "~/.hermes/agent-hooks/secret-scan.sh"
      timeout: 10
      fail_closed: true
```

`fail_closed: true` にすると、次のそれぞれが `hook <command> failed closed: <reason>` とともに道具の呼び出しを**遮る**ようになります。

| 失敗 | 開く側（既定） | `fail_closed: true` |
|---------|--------------------|--------------------|
| コマンドが見つからない／実行できない | 警告して進む | **遮る** |
| 時間切れ | 警告して進む | **遮る** |
| JSON でない標準出力（たとえば例外の跡） | 警告して進む | **遮る** |
| きれいに終わり、何もしない正しい JSON（`{}`） | 進む | 進む |

`fail_closed` が効くのは遮れる出来事（今のところ `pre_tool_call`）だけです。ほかの出来事に付けると、設定を読むときに警告が記録され、無視されます。`hermes hooks test` もこのふるまいを映します。`parsed` の行が、振り分け役が受け取るであろう遮断の形をそのまま見せます。

### 作った例 {#worked-examples}

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

エージェントが文脈の中で持っているそのファイルの姿は、自動では読み直され**ません**。整形はディスクの上のファイルにだけ効きます。そのあとの `read_file` の呼び出しが、整えられたほうを拾います。

#### 2. 壊す方向の `terminal` のコマンドを遮る {#2-block-destructive-terminal-commands}

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

#### 3. 毎ターン `git status` を差し込む（Claude Code の `UserPromptSubmit` にあたるもの） {#3-inject-git-status-into-every-turn-claude-code-userpromptsubmit-equivalent}

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

Claude Code の `UserPromptSubmit` の出来事を、Hermes は別の出来事にしていません。これはわざとです。`pre_llm_call` が同じ場所で発火し、すでに文脈の差し込みに対応しているからです。ここではそちらを使ってください。

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

`(event, command)` の組はそれぞれ、Hermes が初めて見たときに承認を尋ね、その判断を `~/.hermes/shell-hooks-allowlist.json` に残します。次からは（CLI でもゲートウェイでも）尋ねません。

対話的な問いかけを飛ばす逃げ道が3つあります。どれか1つで足ります。

1. CLI の `--accept-hooks` の指定（たとえば `hermes --accept-hooks chat`）
2. `HERMES_ACCEPT_HOOKS=1` の環境変数
3. `~/.hermes/config.yaml` の `hooks_auto_accept: true`

端末のない実行（ゲートウェイ、cron、CI）では、この3つのどれかが要ります。ないと、新しく足したフックは黙って登録されないまま警告だけが残ります。

**スクリプトの書き換えは黙って信じられます。** 許可の並びの鍵はコマンドの文字列そのもので、スクリプトのハッシュではないので、ディスクの上のスクリプトを直しても同意は失われません。`hermes hooks doctor` が更新時刻のずれを教えてくれるので、書き換えに気づいて、承認し直すかどうかを決められます。

#### 手で許可の並びに入れる {#manual-allowlisting}

手で許可の並びに入れるやり方は、端末のない配置や、担当者が初回の問いかけに対話で答えられないサービス用の口座での配置に役立ちます。許可の並びのファイルは `~/.hermes/shell-hooks-allowlist.json` で、期待される形は `approvals` の配列です。承認はそれぞれ、フックの `event` と、`command` の文字列そのものを記録します。

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

コマンドの文字列は、設定したフックのコマンドとぴったり一致しなければなりません。パスを鍵にして `sha256` の項目を持つ物は期待される形ではなく、それではフックは承認されません。手で入れた項目は `hermes hooks list` で確かめてください。

### `hermes hooks` のコマンド {#the-hermes-hooks-cli}

| コマンド | 何をするか |
|---------|--------------|
| `hermes hooks list` | 設定されたフックを、matcher、制限時間、同意の状態とともに書き出します |
| `hermes hooks test <event> [--for-tool X] [--payload-file F]` | 当てはまるフックを人工の中身に対してすべて発火させ、読み取った返事を表示します |
| `hermes hooks revoke <command>` | `<command>` に当たる許可の並びの項目をすべて外します（次の再起動で効きます） |
| `hermes hooks doctor` | 設定されたフックごとに、実行の権限、許可の並びの状態、更新時刻のずれ、JSON の出力の正しさ、おおよその実行時間を確かめます |

### 安全について {#security}

シェルのフックは**こちらの権限そのまま**で動きます。cron の項目やシェルの別名と同じ信頼の境目です。`config.yaml` の `hooks:` の塊は、強い権限を持つ設定として扱ってください。

- 自分で書いたか、すみずみまで目を通したスクリプトだけを指してください。
- 場所を追いやすいよう、スクリプトは `~/.hermes/agent-hooks/` の中に置いてください。
- 共有の設定を取り込んだあとは `hermes hooks doctor` をもう一度走らせ、登録される前に新しく足されたフックに気づいてください。
- config.yaml をチームで版管理しているなら、`hooks:` の節を変える PR は CI の設定を見るのと同じ目で確かめてください。

### 順番と優先度 {#ordering-and-precedence}

Python のプラグインのフックもシェルのフックも、同じ `invoke_hook()` の振り分け役を通ります。Python のプラグインが先に（`discover_and_load()`）、シェルのフックが次に（`register_from_config()`）登録されるので、並んだときは Python の `pre_tool_call` の遮断の判断が優先されます。最初の使える遮断が勝ちます。空でないメッセージを持つ `{"action": "block", "message": str}` をどれかの呼び出しが出した時点で、まとめ役はそこで返します。

## 外向きの webhook {#outbound-webhooks}

外向きの webhook は、[入ってくる webhook の場](/hermes/docs/user-guide/messaging/webhooks/)を押し出し側から映したものです。入ってくる webhook は世の中が変わったときに Hermes を起こし、外向きの webhook は Hermes が何かをしたときに世の中へ伝えます。HTTP の口の並びと、それぞれが気にする節目の出来事を設定しておけば、当てはまる出来事が発火するたびに、Hermes が署名付きの JSON をそれぞれの口へ POST します。受け取る側で見張り続ける必要はありません。

よくある使い方です。

- エージェントのターンが終わったときに CI やダッシュボードへ知らせる（`on_session_end`）
- 群れ全体でサブエージェントの完了を追う（`subagent_stop`）
- 道具の動きを外の監視へ流す（`matcher` を付けた `post_tool_call`）
- *別の* Hermes を起こす。その相手の入ってくる webhook に URL を向けます

### 設定 {#configuration}

`~/.hermes/config.yaml` に `hooks.outbound:` の並びを足します。

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

プラグインのフックの一式にある出来事なら、どれでも使えます（`pre_tool_call`、`post_tool_call`、`pre_llm_call`、`post_llm_call`、`on_session_start`、`on_session_end`、`subagent_start`、`subagent_stop`、…）。形の崩れた項目は警告を出して飛ばされます。壊れた webhook がエージェントを落とすことはありません。変更は、次の CLI のセッションかゲートウェイの再起動で効きます。

秘密について。設定のファイルに資格情報を残さないよう、その場に書く `secret:` より `secret_env`（環境変数の名前。ふつうは `~/.hermes/.env` で設定します）のほうを使ってください。秘密のない項目は署名なしで送られます（`hermes hooks list` では `UNSIGNED` と示されます）。

### 送られる形 {#wire-format}

発火のたびに、シェルのフックの標準入力と同じいちばん上の形に、受け渡しの情報を足した JSON の本体が POST されます。`profile` はその出来事を出した Hermes のプロファイルを示すので（プロファイルの外なら `"default"`）、束ねられたゲートウェイの向こう側でも、受け取る側がプロファイルを見分けられます。

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

ヘッダです。

| ヘッダ | 値 |
|--------|-------|
| `Content-Type` | `application/json` |
| `X-Hermes-Event` | フックの出来事の名前 |
| `X-Hermes-Delivery` | 受け渡しごとに一意な ID。本体の `delivery_id` と同じ値です |
| `X-Hermes-Signature-256` | `sha256=<hex>` — 生の本体の HMAC-SHA256。GitHub と同じ形で、秘密が設定されているときにだけ付きます |

署名は、GitHub の webhook とまったく同じように確かめます。

```python

def verify(body: bytes, header: str, secret: str) -> bool:
    expected = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, header)
```

`delivery_id` と `timestamp` が**署名された本体の中**にあるので、署名を確かめる受け手は、繰り返しへの備えもただで手に入ります。

- `delivery_id`（あるいは対応する `X-Hermes-Delivery` のヘッダ）で**重なりを取り除いて**ください。最近見た ID を覚えておき、同じものは飛ばします。Hermes は失敗した受け渡しを一度だけやり直すので、同じ ID が正しく2回届くことがあります。
- `timestamp` を自分の時計と、許す幅（5分がよくある既定です）で照らし合わせて、**古い出来事は断って**ください。捕まえた求めを流し直す相手も、秘密がなければ新しい時刻を作れません。

### 受け渡しの決まり {#delivery-semantics}

- **投げっぱなしで、熱い経路の外で。** 出来事はすぐに形にされて待ち行列へ入り、裏の1つのスレッドが HTTP の POST を行います。遅い口や死んだ口が、道具の呼び出しやエージェントのターンを止めることはありません。
- **知らせるだけ。** シェルのフックと違い、外向きの webhook は道具の呼び出しを遮ったり文脈を差し込んだりできません。返事の本体は無視されます。眺めるだけで、導きません。
- **やり直しには上限があります。** 接続のエラーと 5xx の返事は、間を空けて一度だけやり直します。4xx はやり直しません（求めそのものが間違っている、と受け手が言っているからです）。失敗は記録して捨てられます。受け渡しは best-effort で、保証はありません。
- **転送には決して従いません。** 3xx の返事は設定の誤りとして扱い、記録します。転送された POST に従うと、署名された中身が黙って落ちてしまうからです。`url` は最後の口に向けてください。
- **待ち行列には上限があります。** 待ち行列が詰まったとき（死んだ口、出来事の嵐）は、限りなくメモリを使う代わりに、新しい出来事を警告とともに捨てます。
- **同意の問いかけはありません。** 外向きの送り先は、こちらの機械でコードを走らせません。こちらが設定した URL でデータを受け取るだけです。`HERMES_SAFE_MODE=1` は、プラグインやシェルのフックと同じく、今も登録を飛ばします。ただし中身には道具の入力や出来事の情報が入るので、信頼できる口にだけ向け、`https://` のほうを選んでください。

`hermes hooks list` は、設定された外向きの送り先を、それぞれ署名されているかどうかも含めて、シェルのフックと並べて表示します。
