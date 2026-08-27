---
title: "イベントフック"
description: "重要なライフサイクルの節目で独自のコードを走らせる — 活動の記録、通知の送信、Webhook への投稿"
upstream_path: user-guide/features/hooks.md
upstream_blob: 8ef9e7b180c826128f348790c138ed8ab5752a27
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/hooks
---

# イベントフック {#event-hooks}

Hermes には、重要なライフサイクルの節目で独自のコードを走らせるフックの仕組みが 4 つあります。

| 仕組み | 登録方法 | 動く場所 | 用途 |
|--------|---------------|---------|----------|
| **[ゲートウェイフック](#gateway-event-hooks)** | `~/.hermes/hooks/` に置いた `HOOK.yaml` と `handler.py` | ゲートウェイのみ | 記録、通知、Webhook |
| **[プラグインフック](#plugin-hooks)** | [プラグイン](/hermes/docs/user-guide/features/plugins/)の中で `ctx.register_hook()` を呼ぶ | CLI とゲートウェイ | ツールの横取り、計測、ガードレール |
| **[シェルフック](#shell-hooks)** | `~/.hermes/config.yaml` の `hooks:` ブロックからシェルスクリプトを指す | CLI とゲートウェイ | 実行の遮断、自動整形、文脈の注入を、置くだけで動くスクリプトで行う |
| **[送信 Webhook](#outbound-webhooks)** | `~/.hermes/config.yaml` の `hooks.outbound:` 一覧 | CLI とゲートウェイ | 署名付きのライフサイクルイベントを外部の HTTP エンドポイント（CI、ダッシュボード、他のエージェントなど）へ押し出す |

フックのコールバックで起きたエラーは切り離して記録され、エージェント本体が落ちることはありません。ただし、フックがすべて受け身というわけではありません。指示・制御系のフックは処理の流れを変えられますし、変換系のフックは内容を差し替えられます。シェルの `pre_tool_call` フックは実行を止めることも、失敗時に閉じる側へ倒すこともできます。

## ゲートウェイのイベントフック {#gateway-event-hooks}

ゲートウェイフックは、ゲートウェイ（Telegram、Discord、Slack、WhatsApp、Teams）の動作中に自動で発火します。エージェント本体の処理をせき止めることはありません。

### フックを作る {#creating-a-hook}

フックはひとつずつ `~/.hermes/hooks/` の下のディレクトリとして置き、その中にファイルを 2 つ入れます。

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

`events` に並べたものが、ハンドラーを呼び出すきっかけになります。イベントは好きな組み合わせで購読でき、`command:*` のようなワイルドカードも使えます。

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

**ハンドラーの決まりごと**
- 名前は `handle` にします
- 引数として `event_type`（文字列）と `context`（辞書）を受け取ります
- `async def` でも通常の `def` でも構いません。どちらでも動きます
- エラーは捕まえて記録されるだけで、エージェントを落とすことはありません

### 使えるイベント {#available-events}

| イベント | 発火するタイミング | context のキー |
|-------|---------------|--------------|
| `gateway:startup` | ゲートウェイのプロセスが起動したとき | `platforms`（動作中のプラットフォーム名の一覧） |
| `session:start` | メッセージのセッションが新しく作られたとき | `platform`、`user_id`、`session_id`、`session_key` |
| `session:end` | セッションが終わったとき（リセットの前） | `platform`、`user_id`、`session_key` |
| `session:reset` | 利用者が `/new` または `/reset` を実行したとき | `platform`、`user_id`、`session_key` |
| `session:compress` | セッションの文脈の圧縮が完了したとき | `platform`、`session_id`、`old_session_id`（その場で圧縮した場合は空）、`in_place`（真偽値。`true` なら同じ ID のまま記録を圧縮、`false` なら `old_session_id` から切り替え）、`compression_count` |
| `agent:start` | エージェントがメッセージの処理を始めたとき | `platform`、`user_id`、`chat_id`、`thread_id`（フォーラムのトピックやスレッドの起点 ID。スレッド内でなければ空）、`chat_type`（`"dm"` \| `"group"` \| `"forum"`。不明なら空）、`session_id`、`message`（500 文字で切り詰め） |
| `agent:step` | ツール呼び出しループが 1 周するたび | `platform`、`user_id`、`session_id`、`iteration`、`tool_names` |
| `agent:end` | エージェントが処理を終えたとき | `agent:start` と同じキーに加えて `response`（500 文字で切り詰め） |
| `reaction:added` | ボットから見えるメッセージに絵文字のリアクションが付いたとき（今のところ Slack アダプターのみ）。`reactions:read` スコープと `reaction_added` のボットイベント購読が必要で、ボットがそのチャンネルに参加している必要があります。 | `platform`、`reaction`、`user_id`、`item_user_id`、`item_type`、`channel_id`、`message_ts`、`team_id`、`event_ts`、`raw_event` |
| `reaction:removed` | ボットから見えるメッセージから絵文字のリアクションが外されたとき。`reaction_removed` のボットイベント購読が必要です。 | `reaction:added` と同じ形 |
| `command:*` | スラッシュコマンドが実行されたとき（種類を問わず） | `platform`、`user_id`、`command`、`args` |

#### ワイルドカードの照合 {#wildcard-matching}

`command:*` に登録したハンドラーは、`command:model` や `command:reset` など `command:` で始まるイベントすべてで発火します。購読ひとつで、スラッシュコマンド全体を見張れます。

:::tip スレッドへの返信
同じ Telegram のフォーラムトピックへ追いのメッセージを投げるハンドラーでは、`chat_type == "forum"` かつ `thread_id` が空でないときに `message_thread_id=int(thread_id)` を付けてください。
:::

### 例 {#examples}

#### 長く続くタスクを Telegram に通知する {#telegram-alert-on-long-tasks}

エージェントの手数が 10 を超えたら、自分宛てにメッセージを送ります。

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

#### セッション開始を Webhook で知らせる {#session-start-webhook}

セッションが新しく始まったら、外部のサービスへ POST します。

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

利用者のあいだで広まっている使い方です。Markdown の点検リストを `~/.hermes/BOOT.md` に置いておき、ゲートウェイが起動するたびにエージェントへ一度だけ実行させます。「起動のたびに夜間の cron の失敗を確認して、何か落ちていたら Discord で知らせる」「直近 24 時間の deploy.log をまとめて Slack の #ops に投げる」といった用途に向いています。

ここでは、それを自分で定義するフックとして組み立てる手順を紹介します。Hermes は BOOT.md 用のフックを組み込みでは持っていません。望む挙動は自分で配線します。

#### 作るもの {#what-were-building}

1. 起動時にやってほしいことを自然な文章で書いた `~/.hermes/BOOT.md` というファイル。
2. `gateway:startup` で発火し、ゲートウェイが解決したモデルと資格情報を使い捨てのエージェントに渡して、BOOT.md の指示を実行させるゲートウェイフック。
3. 報告することが何もないときにメッセージ送信を見送れるようにする `[SILENT]` という取り決め。

#### 手順 1: 点検リストを書く {#step-1-write-your-checklist}

`~/.hermes/BOOT.md` を作ります。人間の助手に指示を出すつもりで書いてください。

```markdown
# Startup Checklist

1. Run `hermes cron list` and check if any scheduled jobs failed overnight.
2. If any failed, summarize them for Discord #ops (the hook delivers your final response to its configured target).
3. Check if `/opt/app/deploy.log` has any ERROR lines from the last 24 hours. If yes, summarize them and include in the same report.
4. If nothing went wrong, reply with only `[SILENT]` so no message is sent.
```

この内容はプロンプトの一部としてエージェントに渡ります。ツールの呼び出し、シェルコマンド、メッセージの送信、ファイルの要約など、普通の言葉で説明できることなら何でも書けます。

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

- `_resolve_gateway_model()` は、ゲートウェイに今設定されているモデルを読み取ります。
- `_resolve_runtime_agent_kwargs()` は、通常のゲートウェイの応答と同じやり方でプロバイダーの資格情報を解決します。API キー、ベース URL、OAuth トークン、資格情報プールまで含みます。

これらを使わずに素の `AIAgent()` を作ると、組み込みの既定値に落ちてしまい、既定以外のエンドポイントに対しては 401 になります。

#### 手順 3: 動かしてみる {#step-3-test-it}

ゲートウェイを再起動します。

```bash
hermes gateway restart
```

ログを眺めます。

```bash
hermes logs --follow --level INFO | grep boot-md
```

`Running BOOT.md (N chars)` に続いて、`boot-md completed: ...`（エージェントがやったことの要約）か、`boot-md completed (nothing to report)`（`[SILENT]` のような黙るための合図をエージェントがそのまま返したとき）のどちらかが出るはずです。

点検リストをやめたいときは `~/.hermes/BOOT.md` を消してください。フックは読み込まれたままですが、ファイルがなければ黙って何もしません。

#### 応用のしかた {#extending-the-pattern}

- **曜日や日付で内容を変える**: BOOT.md の指示の中で `datetime.now().weekday()` を手掛かりにします（「月曜なら週次のデプロイログも確認する」など）。指示は自由な文章なので、エージェントが考えて判断できることなら何でも書けます。
- **点検リストを複数持つ**: フックの向き先を別のファイル（`STARTUP.md`、`MORNING.md` など）にして、それぞれ別のフックディレクトリとして登録します。
- **エージェントを使わない版**: エージェントのループまでは必要ないなら、`AIAgent` は使わず、ハンドラーから `httpx` で決まった通知を直接投げるだけにします。安く、速く、プロバイダーにも依存しません。

#### これを組み込みにしていない理由 {#why-this-isnt-a-built-in}

以前の Hermes はこれを組み込みのフックとして同梱しており、ゲートウェイが起動するたびに素の既定値でエージェントを黙って立ち上げていました。独自のエンドポイントを使っている人を驚かせましたし、動いていること自体を知らない人にとってはまったく見えない機能でした。自分の hooks ディレクトリに自分で書く、記録された作り方として残しておけば、何が起きているかがそのまま見えますし、ファイルを書くという行為そのものが「使う」という意思表示になります。

### 仕組み {#how-it-works}

1. ゲートウェイの起動時に、`HookRegistry.discover_and_load()` が `~/.hermes/hooks/` を走査します
2. `HOOK.yaml` と `handler.py` を持つサブディレクトリが、その場で読み込まれます
3. ハンドラーは、宣言されたイベントに対して登録されます
4. ライフサイクルの節目ごとに、`hooks.emit()` が該当するハンドラーをすべて発火させます
5. どのハンドラーで起きたエラーも捕まえて記録されます。壊れたフックがエージェントを落とすことはありません

:::info
ゲートウェイフックが発火するのは**ゲートウェイ**（Telegram、Discord、Slack、WhatsApp、Teams）の中だけです。CLI はゲートウェイフックを読み込みません。どこでも動くフックが必要なら、[プラグインフック](#plugin-hooks)を使ってください。
:::

## プラグインフック {#plugin-hooks}

[プラグイン](/hermes/docs/user-guide/features/plugins/)は、**CLI とゲートウェイの両方**のセッションで発火するフックを登録できます。登録はプラグインの `register()` 関数の中で `ctx.register_hook()` を呼ぶ形で、プログラムから行います。

プラグインの配布や登録のしかたについては、
[プラグインのガイド](/hermes/docs/user-guide/features/plugins/)をご覧ください。

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

**すべてのフックに共通する決まりごと**

- コールバックは**キーワード引数**で値を受け取ります。将来の変更に備えて、常に `**kwargs` を受け取れるようにしてください。
- コールバックで例外が起きた場合は記録して読み飛ばします。後続のコールバックはそのまま続きます。
- **時間の上限が決まっている**フック（`post_tool_call` や `pre_llm_call` のような処理の本流にある観測系と、方針を決める `pre_tool_call`）で Python プラグインのコールバックが `plugins.hook_callback_timeout`（既定は 30 秒、`0` で無効、最大 600）を超えて**止まった**場合は、ワーカーの終了を待たずに切り離し、エージェントのループを先へ進めます。時間切れになった、あるいはまだ動き続けている `pre_tool_call` のコールバックは**閉じる側に倒し**（ツールを止め）ます。その他の上限付きフックは開く側に倒します（読み飛ばします）。呼び出し元のスレッドで動くことが決まっているフック（`subagent_stop`）は、時間管理用のワーカーへ移されることはありません。シェルフックは各エントリーごとの `timeout` を持ち続けます。
- 以下の一覧は分類の説明です。**観測系**は戻り値を無視し、**変換系**は最初に返された正しい文字列で置き換え、**指示・制御系**は決められた形の戻り値を解釈します。プラグインのミドルウェアは別の登録先と別の窓口であり、フックのもう一つの分類ではありません。
- `turn_id`、`api_request_id`、`task_id`、`session_id`、`api_call_count` といったひも付け用のフィールドはフックごとに異なり、無いこともあります。ID は中身を解釈しない不透明な値として扱ってください。
- 実行時にどのイベント名が有効かは `hermes_cli.plugins.VALID_HOOKS` が決めます。`hermes hooks list` が並べるのは設定済みのシェルフックと送信フックであって、使えるイベントの全部ではありません。`hermes hooks test <event>` は、無効なイベントを渡したときにだけ有効な一覧を教えてくれます。

### キャッシュを壊さないシステムプロンプトの節 {#cache-safe-system-prompt-sections}

毎回変わらない案内をずっと効かせたいプラグインは、同じ文章を毎ターン
`pre_llm_call` で流し込むかわりに、大きさの上限が決まったシステムプロンプトの節を
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

この取り決めは、意図して狭く作ってあります。

- ID は全体で一意、変わらないもので、1〜128 文字の小文字。使える文字は
  英字、数字、`.`、`_`、`-` だけです。同じ ID は受け付けません。
- 置き場所を指定できるのは `after_memory` のみです。節は ID 順に並び、
  記憶やプロフィールの文脈のあと、セッションのメタデータの前に描画されます。
  プラグインが中核のプロンプトを並べ替えたり差し替えたりすることはできません。
- 関数を渡した場合、`session_id`、`model`、`provider`、`platform`、`profile_name`、
  `cwd` を含む読み取り専用の対応表を受け取ります。実行されるのは**新しいセッション
  につき一度だけ**です。描画された内容は圧縮の時点で固定され、プロセスの再起動や
  再開のあとは、すでに保存済みのシステムプロンプト全体から復元されます。既存の
  セッションでプラグインの状態を読み直すことはありません。
- `max_chars` の上限は 4,000 文字です。プラグインの節は監査用の見出しも含めて
  合計 8,000 文字・32 節までに制限されます。空、文字列以外、大きすぎる、合計が
  予算を超える、あるいは例外を投げる節は警告とともに読み飛ばされ、プロンプトの
  組み立てはそのまま続きます。
- 受け付けられた節はすべてプロンプト内に名前が出ますし、セッション開始時に、
  どのプラグインのものか・どの位置か・何文字かとともに記録されます。

ターンごとに本当に変わる文脈には `pre_llm_call` を使ってください。この取り決めには
プラグイン向けの環境ヒント用フックを意図的に用意していません。作業ディレクトリや
ブランチなど環境まわりの情報が変わったからといって、セッションのキャッシュ済み
プロンプトが黙って書き換わってはいけないからです。そうしたフックを追加するには、
具体的な利用先と、固定・再開時の扱いに関する同じ約束が先に必要です。

### 同梱のプラグインフック一覧 {#shipped-plugin-hook-catalog}

以下に挙げるのは、それぞれの呼び出し箇所が渡すイベント固有のフィールドそのものです。過去との互換のため、`PluginManager` はすべてのプラグインフックのコールバックに `telemetry_schema_version="hermes.observer.v1"` も付けます。この古い包み紙の目印は、すべてのフックの中身が同じ意味の型を共有していることを意味しません。新しく版を切る取り決めは、その具体的なイベントや機能のまとまりに属します。

| フック | 分類 | 発火の正確なタイミングと戻り値の扱い | 明示的に渡されるフィールド | プライバシー・機微さ |
|---|---|---|---|---|
| [`pre_tool_call`](#pre_tool_call) | 指示・制御 | 実行前に一度。最初に返された正しい `block` または `approve` の指示が採用され、`modify` の戻り値はツールの引数へ浅くマージされます。 | `tool_name`、`args`、`task_id`、`session_id`、`tool_call_id`、`turn_id`、`api_request_id`、`middleware_trace` | 生の引数には利用者の内容、パス、コマンド、秘密情報が含まれることがあります。 |
| `post_tool_call` | 観測 | 遮断・エラー・成功のいずれの結果のあとにも。戻り値は無視されます。 | `tool_name`、`args`、`result`、`task_id`、`session_id`、`tool_call_id`、`turn_id`、`api_request_id`、`duration_ms`、`status`、`error_type`、`error_message`、`middleware_trace` | 結果やエラーの文面には、ツールや利用者の任意の内容、秘密情報が含まれることがあります。 |
| `transform_tool_result` | 変換 | `post_tool_call` のあと、会話へ追記する前。最初に返された文字列が結果を置き換えます。 | `tool_name`、`args`、`result`、`task_id`、`session_id`、`tool_call_id`、`turn_id`、`api_request_id`、`duration_ms`、`status`、`error_type`、`error_message` | モデルへ渡る結果と引数がそのまま見えます。 |
| `transform_terminal_output` | 変換 | 上限付きの前面プロセスの出力を取り込んだあと、最終的な出力の切り詰めの前。最初に返された文字列が出力を置き換えます。 | `command`、`output`、`returncode`、`task_id`、`env_type` | コマンドや出力に資格情報が含まれることがあります。 |
| `pre_transcription` | 変換 | 音声認識のディスパッチャーがプロバイダーを解決したあと、どのバックエンド（組み込み、コマンド型、プラグイン登録のいずれも）を呼ぶよりも前に発火します。辞書の戻り値は登録順に適用され、フィールドごとに後勝ちになります（`prompt`、`language`、`model`。`file_path` は読み取り専用）。 | `file_path`、`provider`、`model`、`language`、`prompt`、`source` | 最終的なプロンプトは音声と一緒に、設定された音声認識プロバイダーへ送られます。フックの戻り値に秘密情報を入れないでください。 |
| `pre_llm_call` | 指示・制御 | ループの前に、ターンごとに一度。正しい文字列や `{"context": ...}` の戻り値はすべて連結され、利用者のメッセージへ差し込まれます。 | `session_id`、`task_id`、`turn_id`、`user_message`、`conversation_history`、`is_first_turn`、`model`、`platform`、`parent_session_id`、`sender_id` | 利用者のメッセージと会話履歴の全体。 |
| `post_llm_call` | 観測 | 中断されずに成功したターンの締めくくり。戻り値は無視されます。 | `session_id`、`task_id`、`turn_id`、`user_message`、`assistant_response`、`conversation_history`、`model`、`platform` | プロンプト、応答、履歴の全体。 |
| `transform_llm_output` | 変換 | `post_llm_call` と最終的な送り出しの前。最初に返された空でない文字列が応答を置き換えます。 | `response_text`、`session_id`、`model`、`platform` | 最終的なアシスタントの文面の全体。 |
| `pre_verify` | 指示・制御 | コードを編集したターンの、上限付きの検証ゲートの地点。最初に返された正しい「続ける／止める」の指示がターンの継続を決めます。 | `session_id`、`platform`、`model`、`coding`、`attempt`、`final_response`、`changed_paths` | 下書きの応答と、変更されたパス。 |
| `pre_api_request` | 観測 | プロバイダーへの試行ごとに、リクエストの直前。戻り値は無視されます。 | `task_id`、`turn_id`、`api_request_id`、`session_id`、`user_message`、`conversation_history`、`platform`、`model`、`provider`、`base_url`、`api_mode`、`api_call_count`、`retry_count`、`request_messages`、`message_count`、`tool_count`、`approx_input_tokens`、`request_char_count`、`max_tokens`、`started_at`、`middleware_trace`、`request` | 機微さが高い区分です。古くからある `user_message`、`conversation_history`、`request_messages` は意図的に生のままです。伏せ字済みの `request` を使ってください。 |
| `post_api_request` | 観測 | プロバイダーの成功を正規化したあと。戻り値は無視されます。 | `task_id`、`turn_id`、`api_request_id`、`session_id`、`platform`、`model`、`provider`、`base_url`、`api_mode`、`api_call_count`、`api_duration`、`started_at`、`ended_at`、`finish_reason`、`message_count`、`response_model`、`response`、`usage`、`assistant_message`、`assistant_content_chars`、`assistant_tool_call_count` | 伏せ字済みの `response` が使えますが、正規化された生の `assistant_message` にはモデルや利用者の内容が含まれることがあります。`usage` は集計用のデータです。 |
| `api_request_error` | 観測 | プロバイダーへの試行が失敗するたび。戻り値は無視されます。 | `task_id`、`turn_id`、`api_request_id`、`session_id`、`platform`、`model`、`provider`、`base_url`、`api_mode`、`api_call_count`、`api_duration`、`started_at`、`ended_at`、`status_code`、`retry_count`、`max_retries`、`retryable`、`reason`、`error`、`request` | エラーの文面にはプロバイダーや利用者のデータが含まれることがあります。`request` は伏せ字済みで渡す想定です。 |
| `on_stream_start` | 観測 | ストリーミングの LLM 応答が始まったときに配られます。トークンの流れとは別に、ホストが持つ上限付きのキューを通り、コールバックごとにワーカーが 1 つ付きます。戻り値は無視されます。 | `turn_id`、`iteration`、`session_id`、`model`、`provider`、`surface` | 識別子と経路のメタデータのみ。 |
| `on_stream_delta` | 観測 | 正規化されたストリーミングの差分テキストごとに、上限付きの観測キューを通じて配られます。詰まったコールバックがあっても、捨てられるのはそのコールバック自身の最も古いイベントだけです。戻り値は無視されます。 | `delta`、`kind`（`text` または `reasoning`）、`turn_id`、`iteration`、`session_id`、`model`、`provider`、`surface` | 差分のテキストはモデルの生の出力です。推論の差分を受け取るには `plugins.stream_reasoning_deltas` で明示的に有効にする必要があります。 |
| `on_stream_end` | 観測 | ストリーミングの応答が終わるかエラーになり、ストリームが閉じたあとに配られます。戻り値は無視されます。 | `final_text`、`finished`、`error`、`turn_id`、`iteration`、`session_id`、`model`、`provider`、`surface` | 組み立て終えた応答の全文。エラーの文面にはプロバイダーのデータが含まれることがあります。 |
| `on_interim_message` | 観測 | 最終回答の前に、ループの途中でアシスタントのメッセージが表に出たときに配られます（ストリーミングでもそうでなくても）。戻り値は無視されます。 | `text`、`already_streamed`、`turn_id`、`iteration`、`session_id`、`model`、`provider`、`surface` | 途中経過のアシスタントの文面の全体。 |
| `transform_api_error_classification` | 変換 | プロバイダーへの試行が失敗するたび、組み込みの分類器の入口で発火します。すべてのコールバックを走らせたうえで、正しい `reason` を持つ最初の辞書が採用されます（全部走らせてから先頭を採る方式）。採用されなかった正しい結果は実行時の警告として記録されます。Python プラグインのみ。 | `provider`、`model`、`status_code`、`error_type`、`error_code`、`error_message`、`error_body`、`error`、`approx_tokens`、`context_length`、`num_messages` | `error_message` と `error_body` には、伏せ字にされていないプロバイダーや利用者のデータが含まれることがあります。 |
| `on_session_start` | 観測 | 新しいセッションの最初のターン。戻り値は無視されます。 | `session_id`、`model`、`platform` | 識別子と経路のメタデータのみ。 |
| `on_session_end` | 観測 | 正式にはターンの締めくくりごとに。CLI と TUI の終了時には、項目を減らした古い形も別にあります。戻り値は無視されます。 | 正式な形: `session_id`、`task_id`、`turn_id`、`completed`、`failed`、`interrupted`、`turn_exit_reason`、`model`、`platform`。終了経路では `reason` や `api_request_id` が加わったり、項目が欠けたりします。 | ID、モデルとプラットフォーム、結末。正式な中身にメッセージ本文は含まれません。 |
| `on_session_finalize` | 観測 | CLI・TUI・ゲートウェイの後始末で `finalize_session` を通ったとき。ゲートウェイの停止や期限切れでは、リセットを伴わずに締めくくられることもあります。戻り値は無視されます。 | 窓口によって異なる `session_id`、`platform`、場合により `reason`、`old_session_id`、`new_session_id` | セッションと経路の識別子。 |
| `on_session_reset` | 観測 | CLI と TUI ではセッションの切れ目、ゲートウェイでは置き換え先のセッションができたあと。戻り値は無視されます。 | CLI: `session_id`、`platform`、`reason`。TUI: `session_id`、`platform`。ゲートウェイ: それらに加えて `reason`、`old_session_id`、`new_session_id` | セッションと経路の識別子。 |
| `on_skill_lifecycle` | 観測 | スキルの利用状態が正式に変わったあと。戻り値は無視されます。 | `action`、`skill_name`、`provenance`、`task_id`、`session_id`、`use_count`、`reused`、`reuse_after_patch` | 手元のスキル名と、その出どころが見えます。 |
| `subagent_start` | 観測 | 子が組み立てられ、これから動き出すところ。戻り値は無視されます。 | `parent_session_id`、`parent_turn_id`、`parent_subagent_id`、`child_session_id`、`child_subagent_id`、`child_role`、`child_goal` | 子の目標に利用者やプロジェクトの内容が含まれることがあります。 |
| `subagent_stop` | 観測 | 子の終了時。戻り値は無視されます。 | `parent_session_id`、`parent_turn_id`、`child_session_id`、`child_role`、`child_summary`、`child_status`、`tool_call_history`、`duration_ms` | 要約と、伏せ字済みのツール履歴のメタデータから、プロジェクトの構成が読み取れることがあります。 |
| `pre_gateway_dispatch` | 指示・制御 | 内部由来でない受信メッセージについて、認証・ペアリング・振り分けの前。最初に返された正しい `skip`、`rewrite`、`allow` が処理の流れを決めます。 | `event`、`gateway`、`session_store` | 極めて強い権限を持つプロセス内のオブジェクトで、受信した利用者や経路のデータ、ホスト側のハンドルが見えます。 |
| `gateway_platform_event` | 観測 | ゲートウェイのプロフィール単位の認可が通ったあと、対応しているプラットフォーム固有のイベントがゲートウェイの境界で正規化されたとき（Telegram: リアクション、メッセージの編集。Discord: メッセージの編集と削除、スレッドの作成と改名）。戻り値は無視されます。 | `platform`、`event_type`、`payload`（イベント種別ごとの辞書。個別の取り決めは後述） | 正規化された素の辞書だけが渡されます。SDK の生のオブジェクト、アダプターのハンドル、ボットのクライアントが表に出ることはありません。 |
| `pre_command` | 観測 | 認識されたスラッシュコマンドが振り分けられる直前、ハンドラーが動く前に、CLI とゲートウェイの通常経路の振り分けで発火します。v1 では戻り値は無視されます（指示の形をした辞書はデバッグレベルで記録されます）。ゲートウェイで動作中のエージェントに割り込むコマンド（実行中の `/stop`、`/approve`）は意図的に除外しています。制御用の非常口はプラグインの手の届かない場所に置く必要があるためです。 | `surface`（`"cli"` \| `"gateway"`）、`command`（正式名）、`alias_used`、`args_raw`、`session_key`、`platform` | `args_raw` には、コマンドのあとに入力された利用者の内容や秘密情報が含まれることがあります。 |
| `pre_approval_request` | 観測 | 問い合わせ型または自動判定型の承認の前。戻り値は無視されます。 | `command`、`description`、`pattern_key`、`pattern_keys`、`session_key`、`surface`、`turn_id`、`tool_call_id` | コマンドに秘密情報が含まれることがあります。自動判定型の観測用の準備では強制的に伏せ字にしますが、すべての窓口が同じ伏せ字処理を持つわけではありません。 |
| `post_approval_response` | 観測 | 判断、時間切れ、あるいはゲートウェイからの通知失敗のあと。戻り値は無視されます。 | `command`、`description`、`pattern_key`、`pattern_keys`、`session_key`、`surface`、`turn_id`、`tool_call_id`、`choice`。自動判定型の経路では `decided_by` が加わることがあります。 | コマンドの機微さは同じで、加えて判断のメタデータ。 |
| `kanban_task_claimed` | 観測 | 取得の確定後、ディスパッチャーのプロセスでワーカーを起こす前。戻り値は無視されます。 | `task_id`、`profile_name`、`board`、`assignee`、`run_id` | ボード、タスク、プロフィール、担当者の識別子。 |
| `kanban_task_completed` | 観測 | 完了と後始末のあと、通常はワーカーのプロセスで。戻り値は無視されます。 | `task_id`、`profile_name`、`board`、`assignee`、`run_id`、`summary` | 要約にプロジェクトや利用者の内容が含まれることがあります。 |
| `kanban_task_blocked` | 観測 | 停滞状態へ移ったあと。依存待ちの経路では、そのトランザクションを抜ける前に発火します。戻り値は無視されます。 | `task_id`、`profile_name`、`board`、`assignee`、`run_id`、`reason` | 理由にプロジェクトや利用者の内容が含まれることがあります。 |
| `on_kanban_worker_spawned` | 観測 | `spawn_fn` が戻り、ワーカーの PID が保存されたあと。振り分けのロックの内側で動くので、コールバックは短く済ませてください。戻り値は無視されます。 | `task_id`、`profile_name`、`board`、`assignee`、`run_id`、`worker_pid`、`workspace_path` | `workspace_path` はファイルシステム上のパスで、プロジェクトの構成や利用者名が読み取れることがあります。 |
| `on_kanban_worker_exited` | 観測 | 定期処理から導かれます。`detect_crashed_workers` が死んだ PID のタスクを回収し、その回収が確定したあとに発火します。戻り値は無視されます。 | `task_id`、`profile_name`、`board`、`assignee`、`run_id`、`worker_pid`、`exit_kind`、`exit_code`、`outcome`、`retry_status` | 識別子と終了時のメタデータのみ。 |
| `on_kanban_worker_stale_claim` | 観測 | 期限切れになった取得が回収されたあと。PID が生きていて期限が延びた場合は発火しません。戻り値は無視されます。 | `task_id`、`profile_name`、`board`、`assignee`、`run_id`、`worker_pid`、`heartbeat_stale`、`retry_status` | 識別子と取得時のメタデータのみ。 |
| `on_kanban_task_updated` | 観測 | 取得・完了・停滞というライフサイクルの外側で、タスクのフィールドへの書き込みが確定したあと（担当の割り当て、上書き、ダッシュボードの編集画面など）。戻り値は無視されます。 | `task_id`、`profile_name`、`board`、`assignee`、`run_id`、`changed_fields` | `changed_fields` が運ぶのはフィールド名だけで、値は決して含みません。ただしボードのデータベース側にある表題や本文の値には、利用者やプロジェクトの内容が含まれることがあります。 |
| `on_kanban_dispatch_tick` | 観測 | ディスパッチャーの定期処理ごとに一度、必ず振り分けのロックを手放したあとに。何もしなかった回や、競合した回でも発火します。戻り値は無視されます。 | `board`、`profile_name`、`dry_run`、`outcome`、`result` | `result` はその回の `DispatchResult` で、タスク ID、担当者、作業ディレクトリのパスを含みます。 |

---

### ストリーミング出力のフック {#streaming-output-hooks}

ここに挙げる観測専用のフックを使うと、プラグインは応答そのものに手を加えずに、ストリーミングされる LLM の出力を計測、実況ダッシュボード、音声合成のパイプラインなどに流し込めます。配送はホストが持つ上限付きのキューを通り、登録されたコールバックごとに裏方のワーカーが 1 つ付くので、プラグインのコールバックがトークンの流れの上で直接動くことはありません。あるコールバックが詰まっても、あふれて古いものから捨てられるのはそのコールバックのキューだけで、他の観測用フックはそのままイベントを受け取り続けます。

登録のしかたは他のプラグインフックと変わりません。

```python
def on_delta(delta, kind, model, provider, **kwargs):
    if kind == "text":
        print(delta, end="", flush=True)

def register(ctx):
    ctx.register_hook("on_stream_delta", on_delta)
```

4 つのフックに共通するフィールドです。

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `turn_id` | `str` | ターンの識別子（中身は解釈しません）。取れる場合のみ |
| `iteration` | `int` | 現在の API 呼び出し・ツールループの周回数 |
| `session_id` | `str` | 現在の Hermes のセッション ID |
| `model` | `str` | 動作中のモデルの識別子 |
| `provider` | `str` | 動作中のプロバイダー名 |
| `surface` | `str` | 呼び出し元の窓口。`cli`、`discord`、`telegram` など |

フックごとに追加されるフィールドです。

| フック | 追加されるフィールド |
|------|--------------|
| `on_stream_start` | なし |
| `on_stream_delta` | `delta: str`、`kind: "text" | "reasoning"` |
| `on_stream_end` | `final_text: str`、`finished: bool`、`error: str | None` |
| `on_interim_message` | `text: str`、`already_streamed: bool` |

`on_interim_message` はストリーミングでない応答のあとにも発火します。このフックだけを登録しても、プロバイダーへの呼び出しがストリーミングの通信方式へ切り替わるわけではありません。

推論の差分は、既定ではプラグインに渡されません。受け取りたい場合は明示的に有効にしてください。

```yaml
plugins:
  stream_reasoning_deltas: true
```

戻り値は無視されます。ストリームの速さを保つため、コールバックは自分の仕事をキューへ積んですぐに戻るようにしてください。例外は記録されるだけで、ストリームを止めることはありません。

---

### `pre_tool_call` {#pretoolcall}

すべてのツールの実行**直前**に発火します。組み込みのツールでも、プラグインのツールでも同じです。

**コールバックの形**

```python
def my_callback(tool_name: str, args: dict, task_id: str, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `tool_name` | `str` | これから実行されるツールの名前（`"terminal"`、`"web_search"`、`"read_file"` など） |
| `args` | `dict` | モデルがツールへ渡した引数 |
| `task_id` | `str` | セッションやタスクの識別子。設定されていなければ空文字列。 |

**発火する場所**: `model_tools.py` の `handle_function_call()` の中で、ツールのハンドラーが動く前です。ツール呼び出し 1 回につき 1 回発火します。モデルが 3 つのツールを同時に呼べば、3 回発火します。

**戻り値 — 遮断する、または承認を求める**

```python
return {"action": "block", "message": "Reason the tool call was blocked"}
# or
return {"action": "approve", "message": "Why approval is required", "rule_key": "optional:scope"}
```

最初に返された正しい指示が採用されます（先に Python プラグイン、次にシェルフックの順です）。`block` には空でない `message` が必要で、ツールをその場で打ち切り、その文面がエラーとしてモデルへ返ります。`approve` はその呼び出しを既存の人による承認のゲートへ回します。`message` と `rule_key` は任意で、拒否・時間切れ・ゲートのエラーはいずれも閉じる側に倒れます。それ以外の戻り値は無視されるので、これまでの観測専用のコールバックはそのまま動き続けます。

**戻り値 — ツールの引数を書き換える**

```python
return {"action": "modify", "args": {"new_string": "fixed content"}}
```

返された `args` の辞書は、ツールが動く前に元の引数へ浅くマージされます。`modify` のフックは積み重なります。元の引数から組み立てた一つの辞書に、各フックのキーが順に混ぜられていくので、フック A が `path` を、フック B が `content` を変えたなら、どちらも残ります。2 つのフックが同じキーを書き換えた場合は、あとのフックが勝ちます。

シェルフックは Claude Code 互換の形も受け付けます。

```json
{"decision": "modify", "tool_input": {"new_string": "fixed content"}}
```

どちらの形も、内部では `{"action": "modify", "args": {...}}` に揃えられます。

`pre_tool_call` のコールバックが `plugins.hook_callback_timeout` を超えた場合（あるいは前回時間切れになったものがまだ動き続けている場合）、Hermes は**閉じる側に倒します**。方針が決まらないまま先へ進めるのではなく、時間切れを伝えるメッセージとともにツールを止めます。

**使いどころ**: 記録、監査の証跡、ツール呼び出しの回数の集計、危険な操作の遮断、実行頻度の制限、利用者ごとの方針の適用、引数の無害化、パスの書き換え、既定の引数の差し込みなど。

**例 — ツール呼び出しの監査ログ**

```python

from datetime import datetime

logger = logging.getLogger(__name__)

def audit_tool_call(tool_name, args, task_id, **kwargs):
    logger.info("TOOL_CALL session=%s tool=%s args=%s",
                task_id, tool_name, json.dumps(args)[:200])

def register(ctx):
    ctx.register_hook("pre_tool_call", audit_tool_call)
```

**例 — 危険なツールに警告を出す**

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

すべてのツールの実行が戻った**直後**に発火します。

**コールバックの形**

```python
def my_callback(tool_name: str, args: dict, result: str, task_id: str,
                duration_ms: int, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `tool_name` | `str` | いま実行されたツールの名前 |
| `args` | `dict` | モデルがツールへ渡した引数 |
| `result` | `str` | ツールの戻り値（常に JSON の文字列） |
| `task_id` | `str` | セッションやタスクの識別子。設定されていなければ空文字列。 |
| `duration_ms` | `int` | ツールの振り分けにかかった時間（ミリ秒）。`registry.dispatch()` の前後を `time.monotonic()` で測ります。 |

**発火する場所**: `model_tools.py` の `handle_function_call()` の中で、ツールのハンドラーが戻ったあとです。ツール呼び出し 1 回につき 1 回発火します。ツールが捕まえられていない例外を投げた場合は発火**しません**（そのエラーは捕まえられてエラーの JSON 文字列として返され、`post_tool_call` はそのエラー文字列を `result` として発火します）。

**戻り値**: 無視されます。

**使いどころ**: ツールの結果の記録、指標の収集、ツールごとの成功率と失敗率の追跡、応答時間のダッシュボード、ツールごとの予算超過の通知、特定のツールが終わったときの知らせなど。

**例 — ツールの利用状況を計測する**

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

ツール呼び出しのループが始まる前に、**ターンごとに一度**発火します。正しい戻り値はすべてプラグインの順にまとめられ、そのターンの利用者のメッセージへ差し込まれます。

**コールバックの形**

```python
def my_callback(session_id: str, user_message: str, conversation_history: list,
                is_first_turn: bool, model: str, platform: str, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `session_id` | `str` | 現在のセッションを一意に表す識別子 |
| `user_message` | `str` | このターンで利用者が送った元のメッセージ（スキルによる差し込みの前） |
| `conversation_history` | `list` | メッセージ一覧の全体の写し（OpenAI 形式: `[{"role": "user", "content": "..."}]`） |
| `is_first_turn` | `bool` | 新しいセッションの最初のターンなら `True`、それ以降は `False` |
| `model` | `str` | モデルの識別子（`"anthropic/claude-sonnet-4.6"` など） |
| `platform` | `str` | セッションが動いている場所。`"cli"`、`"telegram"`、`"discord"` など |

**発火する場所**: `run_agent.py` の `run_conversation()` の中で、文脈の圧縮のあと、主となる `while` ループの前です。`run_conversation()` の呼び出しごと（つまり利用者のターンごと）に一度発火するのであって、ツールループ内の API 呼び出しごとではありません。

**戻り値**: コールバックが `"context"` キーを持つ辞書か、空でないただの文字列を返すと、その文面がそのターンの利用者のメッセージへ追記されます。何も差し込まないときは `None` を返してください。

```python
# Inject context
return {"context": "Recalled memories:\n- User likes Python\n- Working on hermes-agent"}

# Plain string (equivalent)
return "Recalled memories:\n- User likes Python"

# No injection
return None
```

**文脈が差し込まれる場所**: 常に**利用者のメッセージ**であり、システムプロンプトではありません。こうすることでプロンプトのキャッシュが保たれます。システムプロンプトがターンをまたいで同一のままなので、キャッシュ済みのトークンが再利用されるのです。システムプロンプトは Hermes の領分です（モデルへの案内、ツールの強制、人格、スキル）。プラグインは利用者の入力の側に文脈を足します。

きれいな利用者メッセージの `content` はそのまま変わりません。再生のためと、プロンプトのキャッシュを安定させるために、Hermes は API へ実際に渡したメッセージを、プラグインが差し込んだ文脈も含めて、その行の `api_content` という控えに保存することがあります。

**複数のプラグイン**が文脈を返した場合、その出力はプラグインの発見順（ディレクトリ名のアルファベット順）に、空行を挟んで連結されます。

**使いどころ**: 記憶の呼び出し、RAG の文脈の差し込み、ガードレール、ターンごとの分析など。

**例 — 記憶の呼び出し**

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

**例 — ガードレール**

```python
POLICY = "Never execute commands that delete files without explicit user confirmation."

def guardrails(**kwargs):
    return {"context": POLICY}

def register(ctx):
    ctx.register_hook("pre_llm_call", guardrails)
```

---

### `post_llm_call` {#postllmcall}

ツール呼び出しのループが終わり、エージェントが最終的な応答を作り終えたあとに、**ターンごとに一度**発火します。発火するのは**成功した**ターンだけで、ターンが中断された場合は発火しません。

**コールバックの形**

```python
def my_callback(session_id: str, user_message: str, assistant_response: str,
                conversation_history: list, model: str, platform: str, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `session_id` | `str` | 現在のセッションを一意に表す識別子 |
| `user_message` | `str` | このターンで利用者が送った元のメッセージ |
| `assistant_response` | `str` | このターンでエージェントが返した最終的な文面 |
| `conversation_history` | `list` | ターンが終わったあとのメッセージ一覧の全体の写し |
| `model` | `str` | モデルの識別子 |
| `platform` | `str` | セッションが動いている場所 |

**発火する場所**: `run_agent.py` の `run_conversation()` の中で、ツールループが最終的な応答を持って抜けたあとです。`if final_response and not interrupted` で守られているので、利用者がターンの途中で割り込んだ場合や、応答を作れないまま繰り返しの上限に達した場合には発火**しません**。

**戻り値**: 無視されます。

**使いどころ**: 会話のデータを外部の記憶の仕組みへ同期する、応答の品質の指標を計算する、ターンの要約を記録する、後続の処理を起こすなど。

**例 — 外部の記憶へ同期する**

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

**例 — 応答の長さを追いかける**

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

エージェントが**コードを編集したターン**で、処理を終える直前（組み込みの「停止前に検証する」ガードのあと）に一度発火します。これは利用者やプラグインが方針を差し込むためのゲートです。コールバックは、エージェントをそこで止めるかわりに、そのまま走らせ続けられます。検査を走らせる、あと回しにする、差分を整える、といったことができます。

Hermes に同梱されている検証の案内は、既定の `pre_verify` フックではありません。編集したコードに新しい検証の証拠がないときに、証拠に基づく「停止前に検証する」うながしへ付け足される文面です。ですから、既定の継続経路が二重にできることはありません。組み込みの証拠のうながしを短くしておきたい場合は、`agent.verify_guidance: false` を設定してください。

**コールバックの形**

```python
def my_callback(session_id: str, platform: str, model: str, coding: bool,
                attempt: int, final_response: str, changed_paths: list, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `session_id` | `str` | 現在のセッションを一意に表す識別子 |
| `platform` | `str` | セッションが動いている場所（`"cli"`、`"telegram"` など） |
| `model` | `str` | モデルの識別子 |
| `coding` | `bool` | そのターンがコード作業の構えにあるか（コードの作業ディレクトリにいるか）。フックの適用範囲はこれで絞ります |
| `attempt` | `int` | そのターンで何回うながされたか（最初は 0）。自分で回数を抑えるのに使います |
| `final_response` | `str` | エージェントがこれから返そうとしている答え |
| `changed_paths` | `list` | そのターンでエージェントが編集したファイル（並べ替え済み。ここでは必ず 1 件以上あります） |

`coding` を見てコード作業の場面に限定し、`attempt` で一度きりにする（シェルフックはどちらも `.extra` から読みます）——`pre_tool_call` のフックを `tool_name` で絞るのと同じやり方です。こうすれば、`pre_verify` のフックをいくつも登録して、それぞれが必要な場面でだけ発火するようにできます。

**発火する場所**: `agent/conversation_loop.py` の、エージェントが最終的な答えを受け入れようとする地点、「停止前に検証する」検査の直後です。ただし、そのターンでエージェントがコードを編集していて、かつ `pre_verify` のフックが 1 つ以上登録されている場合に限ります。

**戻り値 — エージェントを続けさせる**

```python
return {"action": "continue", "message": "Run the formatter on your changes, then finish."}
```

`message` は人工的な利用者のターンとして追記され、ループがもう一度回ります。Claude Code の Stop の形（`{"decision": "block", "reason": "..."}`。停止を遮る＝*続ける*という意味です）も受け付けます。メッセージのない指示や、それ以外の戻り値の場合は、そのターンはそのまま終わります。

**上限あり**: 1 つのターンの中で続けて出せる継続の指示は `agent.max_verify_nudges`（既定は 3）で頭打ちになるので、常に「続ける」と言うフックがループを閉じ込めてしまうことはありません。いったん出そうとした答えは履歴に残りますが、うながしを受けているあいだは利用者には見えません。

**何度動いても同じ結果にする**: このフックはうながしのたびに再び発火するので、`attempt` で門を閉じてください（`if attempt: return None`）。そうしないと、上限に達するまでうながし続けることになります。

**使いどころ**: 試行錯誤の最中はテストやリンターをあと回しにする、特定のパスでは検査の成功を必須にする、変更履歴の記載ができるまで「完了」を認めない、プロジェクト固有の検証の点検リストを走らせる、など。

**例 — 見た目を作り込む UI 作業では検査をあと回しにする（範囲を絞り、一度きり）**

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

組み込みの「証拠が足りない」といううながしの中身を整えたいだけなら、`agent.verify_guidance` を使ってください。検証を*せき止める*必要のない、もっと広いコード作業の心得については、`config.yaml` の `agent.coding_instructions` のほうが向いています。こちらはコード作業の案内に相乗りするので、ターンを余計に消費しません。

---

### `transform_api_error_classification` {#transformapierrorclassification}

API 呼び出しが失敗するたび、`agent/error_classifier.classify_api_error()` の入口で、組み込みの処理の前に一度発火します。プロバイダー向けのプラグインは、これを使って自分のプロバイダー特有のエラーの癖を、中核に手を入れずに面倒みられます。これは挙動を変える種類のフック（変換系）です。返された分類が、再試行、圧縮、資格情報の切り替え、代替先への振り分けを左右します。

コールバックは、解析済みのエラーの文脈をキーワード引数で受け取ります。`provider`（これで自分の担当かを絞ります）、`model`、`status_code`、`error_type`、`error_code`、`error_message`、`error_body`、`error`、`approx_tokens`、`context_length`、`num_messages` です。引き受けないときは `None` を、引き受けるときは辞書を返します。

```python
return {"reason": "model_not_found",   # required: a FailoverReason name
        "retryable": False, "should_fallback": True}  # optional recovery-hint overrides
```

呼び出し方は「全部走らせてから先頭を採る」方式です。すべてのコールバックが動き、失敗は切り離され、登録順で最初の正しい結果が採用されます（正しいのに採用されなかった結果は実行時の警告として記録されます）。形の不正な辞書や、知らない理由は読み飛ばされるので、壊れたプラグインが分類そのものを壊すことはありません。

**プライバシー**: `error_message` と `error_body` には、伏せ字にされていないプロバイダーのデータが乗ることがあります。**Python プラグインのみ**です。シェルからの登録は、設定の読み込み時に警告とともに拒否されます。

---

### `on_session_start` {#onsessionstart}

まったく新しいセッションが作られたときに**一度だけ**発火します。セッションの続き（すでにあるセッションで利用者が 2 通目のメッセージを送ったとき）では発火**しません**。

**コールバックの形**

```python
def my_callback(session_id: str, model: str, platform: str, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `session_id` | `str` | 新しいセッションを一意に表す識別子 |
| `model` | `str` | モデルの識別子 |
| `platform` | `str` | セッションが動いている場所 |

**発火する場所**: `run_agent.py` の `run_conversation()` の中で、新しいセッションの最初のターンのあいだ。正確には、システムプロンプトが組み上がったあと、ツールループが始まる前です。判定は `if not conversation_history`（前のメッセージがない＝新しいセッション）で行われます。

**戻り値**: 無視されます。

**使いどころ**: セッション単位の状態の初期化、キャッシュの温め、外部サービスへのセッションの登録、セッション開始の記録など。

**例 — セッション用のキャッシュを用意する**

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

結果にかかわらず、`run_conversation()` の呼び出しの**いちばん最後**に発火します。利用者が終了したときにエージェントがターンの途中だった場合は、CLI の終了処理からも発火します。

**コールバックの形**

```python
def my_callback(session_id: str, completed: bool, interrupted: bool,
                model: str, platform: str, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `session_id` | `str` | セッションを一意に表す識別子 |
| `completed` | `bool` | エージェントが最終的な応答を作れたなら `True`、そうでなければ `False` |
| `interrupted` | `bool` | ターンが中断されたなら `True`（利用者が新しいメッセージを送った、`/stop` を使った、終了した） |
| `model` | `str` | モデルの識別子 |
| `platform` | `str` | セッションが動いている場所 |

**発火する場所**: 2 か所あります。
1. **`run_agent.py`** — すべての `run_conversation()` の呼び出しの最後、後始末がすべて終わったあと。ターンがエラーになっていても、必ず発火します。
2. **`cli.py`** — CLI の atexit ハンドラーの中。ただし終了した時点でエージェントがターンの途中だった（`_agent_running=True`）場合**のみ**です。処理の最中の Ctrl+C や `/exit` を拾うためのものです。この場合は `completed=False`、`interrupted=True` になります。

**戻り値**: 無視されます。

**使いどころ**: バッファの吐き出し、接続の後始末、セッションの状態の保存、セッションの所要時間の記録、`on_session_start` で用意した資源の片付けなど。

**例 — 吐き出しと後始末**

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

**例 — セッションの所要時間を追いかける**

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

CLI やゲートウェイが動作中のセッションを**畳む**ときに発火します。たとえば利用者が `/new` を実行したとき、ゲートウェイが放置されたセッションを回収したとき、エージェントが動いたまま CLI を終了したときなどです。畳まれるほうのセッション ID にひも付いた状態を吐き出すのに使います。ゲートウェイのリセットでは、このコールバックが動く時点で置き換え先のセッションはすでにできています。

**コールバックの形**

```python
def my_callback(session_id: str | None, platform: str, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `session_id` | `str` または `None` | 畳まれるほうのセッション ID。動作中のセッションが無かった場合は `None` になることがあります。 |
| `platform` | `str` | `"cli"` か、メッセージのプラットフォーム名（`"telegram"`、`"discord"` など）。 |

**発火する場所**: CLI と TUI の後始末、およびゲートウェイのリセット・停止・放置による期限切れの経路です。ゲートウェイの停止と期限切れでは、対になる `on_session_reset` を伴わずに締めくくられることがあります。

**戻り値**: 無視されます。

**使いどころ**: セッション ID が捨てられる前に最終的な指標を保存する、セッションごとの資源を閉じる、最後の計測イベントを送る、たまっている書き込みを流し切る、など。

---

### `on_session_reset` {#onsessionreset}

CLI や TUI のセッションの切れ目、あるいはゲートウェイが動作中のチャットに対して**新しいセッションキーに差し替えた**ときに発火します。次の `on_session_start` を待たずに、会話の状態がまっさらになったことへ反応できます。

**コールバックの形**

```python
def my_callback(session_id: str, platform: str, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `session_id` | `str` | 新しいセッションの ID（すでに新しい値へ切り替わっています）。 |
| `platform` | `str` | `"cli"`、`"tui"`、またはメッセージのプラットフォーム名。 |
| `reason` | `str`、任意 | CLI とゲートウェイのリセット経路で渡されます。 |
| `old_session_id` | `str`、任意 | ゲートウェイのみ。畳まれるほうのセッション ID。 |
| `new_session_id` | `str`、任意 | ゲートウェイのみ。置き換え先のセッション ID。 |

**発火する場所**: CLI は `session_id`、`platform`、`reason` を渡します。TUI は `session_id` と `platform` を渡します。ゲートウェイは置き換え用のキーを確保したあと、`reason`、`old_session_id`、`new_session_id` を加えます。ゲートウェイのリセットでは、置き換え先を作って保存する → `on_session_finalize(old_id)` → `on_session_reset(new_id)` → 最初の受信ターンで `on_session_start(new_id)`、という順になります。

**戻り値**: 無視されます。

**使いどころ**: `session_id` を鍵にしたセッションごとのキャッシュを作り直す、「セッションが切り替わった」という分析用のイベントを送る、新しい状態の入れ物を先に用意する、など。

---

ツールのスキーマ、ハンドラー、進んだフックの使い方まで含めた通しの解説は、**[プラグインを作るガイド](/hermes/docs/developer-guide/plugins/)**をご覧ください。

---

### `subagent_start` {#subagentstart}

`delegate_task` が子の `AIAgent` を組み立てたあと、その子が動き出す前に、**子エージェント 1 つにつき一度**発火します。タスクを 1 つ任せた場合でも、3 つまとめて任せた場合でも、子ごとに 1 回ずつ発火します。

このフックは委任とサブエージェントのライフサイクルに限ったものです。ゲートウェイ、CLI、cron、一括処理、MoA など、他の実行元から始まるエージェントの実行すべてに効く「エージェント起動前」の共通ゲートではありません。

**コールバックの形**

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
| `parent_turn_id` | `str` | 委任を求めた親エージェントのターン ID（取れる場合）。 |
| `parent_subagent_id` | `str \| None` | この子が別のサブエージェントから生まれた場合の、親サブエージェントの ID。最上位の親エージェントでは `None`。 |
| `child_session_id` | `str \| None` | 子エージェントに割り当てられたセッション ID。 |
| `child_subagent_id` | `str` | 委任の観測と制御で使う、変わらないサブエージェント ID。 |
| `child_role` | `str` | 委任の方針を適用したあとの、実際の子の役割。たとえば `"leaf"` や `"orchestrator"`。 |
| `child_goal` | `str` | 子エージェントがこれから実行する、委任された目標やプロンプト。 |

**発火する場所**: `tools/delegate_tool.py` の `_build_child_agent()` の中で、子の `AIAgent` が組み立てられ、サブエージェントの身元のメタデータが付いたあと、`_run_single_child()` が子を動かす前です。

**戻り値**: 無視されます。これは観測専用のフックです。値を返しても、子エージェントの実行を止めたり書き換えたりはできません。

**使いどころ**: サブエージェントの生成の記録、親子のセッションの対応付け、入れ子の委任のたどり方の把握、実行前の監査記録の出力、子ごとの観測用の資源の先取りなど。

**例 — サブエージェントの生成を記録する**

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
`subagent_start` は委任の様子を観測するのに便利ですが、処理をせき止める方針用のフックではありません。子が組み立てられる前に委任を止めたい場合は、[`pre_tool_call`](#pre_tool_call) で `delegate_task` のツール呼び出しを遮断してください。
:::

---

### `subagent_stop` {#subagentstop}

`delegate_task` が終わったあと、**子エージェント 1 つにつき一度**発火します。タスクを 1 つ任せた場合でも、3 つまとめて任せた場合でも、子ごとに 1 回ずつ発火します。呼び出しは子の future が出そろったあと親のスレッド上で順番に行われ、Python のコールバックの中身も同じ呼び出し元スレッドで動きます（時間管理用のワーカーではありません）。

**コールバックの形**

```python
def my_callback(parent_session_id: str, child_role: str | None,
                child_summary: str | None, child_status: str,
                tool_call_history: list[dict], duration_ms: int, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `parent_session_id` | `str` | 委任した親エージェントのセッション ID |
| `child_role` | `str \| None` | 子に付けられた統括役の役割タグ（この機能が有効でなければ `None`） |
| `child_summary` | `str \| None` | 子が親へ返した最終的な応答 |
| `child_status` | `str` | `"completed"`、`"failed"`、`"interrupted"`、`"error"` のいずれか |
| `tool_call_history` | `list[dict]` | ツール呼び出しのメタデータのみを順に並べたもの。`tool_name`、上限付きの `tool_input`、`input_bytes`、`output_bytes`、`status` を含み、生の入力と出力は含みません |
| `duration_ms` | `int` | 子を動かすのにかかった実時間（ミリ秒） |

**発火する場所**: `tools/delegate_tool.py` の中、`ThreadPoolExecutor.as_completed()` がすべての子の future を出し切ったあとです。`invoke_hook("subagent_stop", ...)` は親のスレッドへ渡されるので、書き手が子のスレッドプールの再入に悩まされることはなく、コールバックはその呼び出し元スレッドに留まります。

**戻り値**: 無視されます。

**使いどころ**: 統括の動きの記録、課金のための子の所要時間の積み上げ、委任後の監査記録の書き出しなど。

**例 — 統括役の動きを記録する**

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
委任を多用する構成（統括役 × 5 つの末端 × 入れ子の深さ、など）では、`subagent_stop` は 1 ターンに何度も発火します。コールバックは短く済ませ、重い処理は裏方のキューへ回してください。
:::

---

### `pre_gateway_dispatch` {#pregatewaydispatch}

ゲートウェイに届く `MessageEvent` **1 通につき一度**、内部イベントの判定のあと、認証・ペアリングとエージェントへの振り分けの**前**に発火します。どのプラットフォームのアダプターにもきれいに収まらない、ゲートウェイの階層でのメッセージの流れの方針（聞くだけの時間帯、人への引き継ぎ、チャットごとの振り分けなど）を差し込む地点です。

**コールバックの形**

```python
def my_callback(event, gateway, session_store, **kwargs):
```

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `event` | `MessageEvent` | 正規化された受信メッセージ（`.text`、`.source`、`.message_id`、`.internal` などを持ちます）。 |
| `gateway` | `GatewayRunner` | 動作中のゲートウェイのランナー。プラグインから `gateway.adapters[platform].send(...)` を呼んで、別経路の返信（所有者への通知など）ができます。 |
| `session_store` | `SessionStore` | `session_store.append_to_transcript(...)` で、会話記録へ静かに取り込むためのものです。 |

**発火する場所**: `gateway/run.py` の `GatewayRunner._handle_message()` の中、`is_internal` を求めた直後です。**内部イベントはこのフックをまるごと飛ばします**（内部イベントは裏方の処理の完了通知などシステムが作るもので、利用者向けの方針で門番をしてはいけないためです）。

**戻り値**: `None` か辞書です。最初に認識された動作の辞書が採用され、残りのプラグインの結果は無視されます。プラグインのコールバックで起きた例外は捕まえて記録され、エラーのときゲートウェイは必ず通常の振り分けへ落ちます。

| 戻り値 | 効果 |
|--------|--------|
| `{"action": "skip", "reason": "..."}` | そのメッセージを捨てます。エージェントの返信も、ペアリングの流れも、認証もありません。プラグイン側で処理済み（会話記録へ静かに取り込んだなど）とみなされます。 |
| `{"action": "rewrite", "text": "new text"}` | `event.text` を差し替えたうえで、書き換わったイベントで通常の振り分けを続けます。ためておいた周囲のメッセージを 1 つのプロンプトにまとめるのに便利です。 |
| `{"action": "allow"}` / `None` | 通常の振り分け。認証、ペアリング、エージェントのループという一連の流れをそのまま通します。 |

**使いどころ**: 聞くだけのグループチャット（呼ばれたときだけ答え、周囲のメッセージは文脈としてためておく）、人への引き継ぎ（所有者が手作業でチャットを見ているあいだ、顧客のメッセージを静かに取り込む）、プロフィールごとの実行頻度の制限、方針に沿った振り分けなど。

**例 — 許可されていない DM を、ペアリングコードを出さずに静かに捨てる**

```python
def deny_unauthorized_dms(event, **kwargs):
    src = event.source
    if src.chat_type == "dm" and not _is_approved_user(src.user_id):
        return {"action": "skip", "reason": "unauthorized-dm"}
    return None

def register(ctx):
    ctx.register_hook("pre_gateway_dispatch", deny_unauthorized_dms)
```

**例 — ためておいた周囲のメッセージを、呼ばれた時点で 1 つのプロンプトに書き換える**

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

対応しているプラットフォーム固有のイベントについて、ゲートウェイの通常のプロフィール単位の認可チェックが通った**あと**にだけ発火します。コールバックが受け取るのは素の辞書です。SDK の生のオブジェクト、アダプターのハンドル、ボットのクライアント、コールバックの文脈が、この安定した取り決めに含まれることはありません。

最初に対応したのは Telegram のメッセージへのリアクションで、そのあとメッセージの編集と削除、スレッドのライフサイクルのイベントが続きました。

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
| `platform` | `str` | 変わらないプラットフォームの ID（`"telegram"`、`"discord"`）。 |
| `event_type` | `str` | そのイベント固有の取り決めの ID（下の表を参照）。 |
| `payload` | `dict` | イベント種別ごとのフィールド。種別ごとの内容は後述します。 |

中身はどれも足し算方式で、イベント固有です。ゲートウェイ全体でひとつにまとめた版番号はありません。ID はすべて文字列で、取れない項目は `None` になります。推測することはありません。形の壊れたイベントや、送り元を認可できないイベントは捨てられます（閉じる側に倒します）。Telegram の Application が一時的に作り直されたときは、この観測用の仕組みも中核のハンドラーと一緒に登録し直されます。

**イベントごとの中身の取り決め（v1、足し算方式）**

| `event_type` | プラットフォーム | 中身のフィールド |
|--------------|-----------|----------------|
| `reaction` | telegram | `emojis: list[str]`、`custom_emoji_ids: list[str]`、`chat_id: str`、`message_id: str`、`thread_id: str \| None`（Telegram のリアクションの更新にはトピック ID が乗らないので、今のところ常に `None`）。 |
| `message_edited` | telegram, discord | `chat_id: str`、`message_id: str`、`thread_id: str \| None`、`text: str \| None`（編集後の本文かキャプション。長さに上限あり。画像などだけの編集や、キャッシュに無い場合は `None`）、`edited_at: str \| None`（ISO 8601）。 |
| `message_deleted` | discord | `chat_id: str`、`message_id: str`、`thread_id: str \| None`、`author_id: str \| None`。Discord の削除イベントは誰が削除したかを教えてくれません。認可の対象となる送り元は削除されたメッセージの書き手で、キャッシュに無い削除では発火しません。 |
| `thread_created` | discord | `thread_id: str`、`parent_chat_id: str \| None`、`name: str \| None`、`owner_id: str \| None`。 |
| `thread_renamed` | discord | `thread_id: str`、`parent_chat_id: str \| None`、`old_name: str \| None`、`new_name: str`。名前が実際に変わったときだけ発火します。それ以外のスレッドの更新（アーカイブ、低速モード、タグ）は捨てられます。Discord のスレッド更新のイベントには操作した人の情報が乗らないので、認可の対象となる送り元はスレッドの持ち主になります。 |

ボット自身が段階的にメッセージを編集していく動き（ストリーミング）で、Discord の `message_edited` が発火することはありません。ボットが書き手のイベントは、発火の地点で捨てられます。

このフックは観測専用です。生のイベントへのアクセスや、アダプターへのアクセスを**足すものではありません**。**SDK の生の中身へのアクセスは意図的に提供していません**。アダプターの SDK のオブジェクトは予告なく形が変わるもので、そのまま公開すると先へ進めない API の窓口になってしまうからです。本当に必要な場面では、「安定性は保証しない」という札を付けた専用の機能（`gateway.raw_events`）として、独自の設計とともに用意する必要があります（#64228 で追跡中）。プラットフォームに対して*働きかける*場合（リアクションを付ける、スレッドの名前を変えるなど）は、[プラグインのガイド](/hermes/docs/user-guide/features/plugins/#platform-actions)にある、機能で制限された `ctx.platform_actions` という窓口を使ってください。こちらは既定では `gateway.platform_actions` の機能の裏で無効になっています。`PluginContext.dispatch_tool()` が呼べるのは、ツールの登録簿に載っているツールだけです。`send_message` は意図的にそこへ登録していません（その送り出しの経路は、CLI、cron、かんばん、MCP という明示的な配送用に取ってあります）。将来、外向きの配送の取り決めを作るなら、まずすべてのアダプターにまたがって、配送された内容やハンドルを安定して扱えるようにする必要があります。今回の範囲では、中身のない `gateway_message_delivered` フックをあらかじめ登録しておくことはしません。

---

### `pre_approval_request` {#preapprovalrequest}

承認の判断が求められる前に発火します。対象は問い合わせを出す窓口——対話型の CLI、Ink の TUI、ゲートウェイの各プラットフォーム、ACP のクライアント——に加えて、人に尋ねずに下される `approvals.mode=smart` の判断（`surface="smart"`）です。smart モードでは、補助の LLM が呼ばれる前にこのフックが動きます。

独自の通知の仕組みを差し込むならここが適所です。たとえば、許可か拒否かの通知を出す macOS のメニューバーアプリや、承認の求めを文脈ごと記録する監査ログなどです。

**コールバックの形**

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
| `command` | `str` | 判定にかけられているターミナルのコマンドか `execute_code` のスクリプト。smart とゲートウェイの中身は、観測用に渡す前に伏せ字にされます。smart の観測用の伏せ字は、`security.redact_secrets` が無効でも必ず行われます。伏せ字に失敗した場合、smart のフックは飛ばされます。 |
| `description` | `str` | そのコマンドが引っかかった理由を人が読める形にしたもの（複数の条件に当たった場合はまとめられます） |
| `pattern_key` | `str` | 承認のきっかけになった主な条件のキー（`"rm_rf"`、`"sudo"` など） |
| `pattern_keys` | `list[str]` | 当てはまった条件のキーのすべて |
| `session_key` | `str` | セッションの識別子。チャットごとに通知を分けるのに使えます |
| `surface` | `str` | 対話型の CLI や TUI の問い合わせなら `"cli"`、プラットフォーム経由の非同期の承認なら `"gateway"`、補助の LLM による自動の許可・拒否の判断なら `"smart"` |

**戻り値**: 無視されます。ここのフックは観測専用で、承認を拒んだり先回りして答えたりはできません。承認の仕組みに届く前にツールを止めたい場合は、[`pre_tool_call`](#pre_tool_call) を使ってください。

**使いどころ**: デスクトップの通知、プッシュ通知、監査の記録、Slack への Webhook、担当者への引き上げ、指標の収集など。

**例 — macOS のデスクトップ通知**

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

問い合わせ型または smart の承認の判断が下ったあと、問い合わせが時間切れになったあと、あるいはゲートウェイが承認の通知を届けられなかったときに発火します。通知の失敗では、承認の判断が存在する前に `choice="notify_failed"` が出ます。

**コールバックの形**

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

キーワード引数は `pre_approval_request` と同じで、さらに次が加わります。

| 引数 | 型 | 説明 |
|-----------|------|-------------|
| `choice` | `str` | 問い合わせ型の窓口では `"once"`、`"session"`、`"always"`、`"deny"`、`"timeout"`、`"notify_failed"`。smart の判断では `"smart_approve"` または `"smart_deny"` |
| `decided_by` | `str` | smart の判断では `"aux_llm"`。問い合わせ型の窓口では付きません |

**戻り値**: 無視されます。

**使いどころ**: 対応するデスクトップ通知を閉じる、最終的な判断を監査ログに残す、指標を更新する、実行頻度の制限を先へ進める、など。

```python
def log_decision(command, choice, session_key, **kwargs):
    logger.info("approval %s: %s for session %s", choice, command[:60], session_key)

def register(ctx):
    ctx.register_hook("post_approval_response", log_decision)
```

---

### `pre_transcription` {#pretranscription}

音声認識のディスパッチャー（`tools.transcription_tools.transcribe_audio`）の中で、プロバイダーが解決された**あと**、どのバックエンドが呼ばれるより**前**に発火します。バックエンドが組み込みでも、`type: command` のプロバイダーでも、プラグインが登録したプロバイダーでも同じです。書き起こしの結果をあとから眺めるだけでなく、書き起こしの依頼そのものに手を入れられます。

**コールバックの形**

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
| `provider` | `str` | 解決された音声認識のプロバイダー（`local`、`groq`、`openai`、`mistral`、`xai`、`elevenlabs`、`deepinfra`、`local_command`、コマンド型のプロバイダー名、プラグインのプロバイダー名）。 |
| `model` | `str \| None` | ここまでに解決されたモデル。バックエンドの既定に任せる場合は `None`。 |
| `language` | `str \| None` | プロバイダーの設定の節で指定された言語。無ければ `None`。 |
| `prompt` | `str \| None` | 固定値の [`stt.prompt`](/hermes/docs/user-guide/configuration/#transcription-prompt-vocabulary-hints) の値。無ければ `None`。 |
| `source` | `str \| None` | 呼び出し元の窓口を表す札（`gateway`、`voice_mode` など）。観測用であって、振り分けには使いません。 |

**戻り値**: `"prompt"`、`"language"`、`"model"` のいずれかを文字列に対応させた `dict`、または依頼をそのままにする `None` です。文字列以外の値、知らないキー、`file_path` は無視されます（`file_path` を変えようとすると警告として記録されます）。結果は `stt.prompt` の設定値の上に、**登録順に、フィールドごとに後勝ちで**適用されます。`prompt` に `""` を返すと、その依頼については設定されたプロンプトを消せます。

**使いどころ**: 音声を送る前に利用者ごと・チャットごとの用語集を差し込む、呼び出し元の地域設定から `language` を強制する、長い録音では `model` を軽いものへ落とす、雑音の多い音源を別のモデルへ回す、など。

```python
VOCAB = "Hermes, Teknium, Nous Research, kanban"

def add_vocab(provider, prompt, source, **kwargs):
    if source != "gateway":
        return None
    return {"prompt": f"{prompt}. {VOCAB}" if prompt else VOCAB}

def register(ctx):
    ctx.register_hook("pre_transcription", add_vocab)
```

すべてのバックエンドがプロンプトを受け付けるわけではありません。`local` は faster-whisper の `initial_prompt` へ渡します。`openai`、`groq`、`mistral`、`deepinfra` は `prompt` として送ります。`xai`、`elevenlabs`、`local_command`、`type: command` のプロバイダーは DEBUG で記録して、プロンプト無しで書き起こします。対応の全体像とプライバシー上の線引きは、[プロバイダー対応表](/hermes/docs/user-guide/configuration/#transcription-prompt-vocabulary-hints)をご覧ください。フックの受け渡しで起きたエラーは開く側に倒します。依頼は書き換えられないまま先へ進みます。

---

### `transform_tool_result` {#transformtoolresult}

ツールが結果を返した**あと**、その結果が会話へ追記される**前**に発火します。ターミナルの出力に限らず、どのツールの結果の文字列でも、モデルの目に触れる前にプラグインが書き換えられます。

**コールバックの形**

```python
def my_callback(tool_name: str, args: dict, result: str, task_id: str, **kwargs) -> str | None:
```

渡される中身には、ほかに `session_id`、`tool_call_id`、`turn_id`、`api_request_id`、`duration_ms`、`status`、`error_type`、`error_message` も含まれます。`result` はツールの振り分けが返した最終的な結果で、これと `args` には利用者やツールの任意の内容、秘密情報が入り得ます。

**戻り値**: 最初に返された `str` が結果を置き換えます（空文字列も含みます）。`None` ならそのままです。

**使いどころ**: `web_extract` の出力から組織固有の個人情報を伏せる、長い JSON のツールの応答に要約の見出しを付ける、`read_file` の結果に検索で引いたヒントを差し込む、`delegate_task` のサブエージェントの報告をプロジェクト固有の形に書き換える、など。

```python

SECRET = re.compile(r"sk-[A-Za-z0-9]{32,}")

def redact_secrets(tool_name, result, **kwargs):
    if SECRET.search(result):
        return SECRET.sub("[REDACTED]", result)
    return None

def register(ctx):
    ctx.register_hook("transform_tool_result", redact_secrets)
```

すべてのツールに効きます。ターミナルだけを書き換えたい場合は、後述の `transform_terminal_output` を見てください。そちらは対象が狭く、`transform_tool_result` より先に動き、置き換えた内容もターミナルのツールの最終的な出力の上限を受けます。

---

### `transform_terminal_output` {#transformterminaloutput}

`terminal` ツールの中で、前面プロセスの出力の取り込みがすでに実行環境の上限で区切られたあと、最終的な出力の上限がかかる前に発火します。取り込まれた標準出力と標準エラー出力をプラグインが差し替えられます。差し替えた内容も、最終的な出力の上限を受けます。

**コールバックの形**

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
| `task_id` | `str` | 実際のタスクの識別子。無ければ空文字列。 |
| `env_type` | `str` | 実行環境の種別。 |

**戻り値**: 最初に返された `str` が出力を置き換えます。`None` ならそのままです。コマンドと出力には、資格情報などの機微なデータが含まれることがあります。

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

`transform_tool_result` と対になります。あちらは `terminal` を含むすべてのツールについて、このあとに動きます。

---

### `transform_llm_output` {#transformllmoutput}

ツール呼び出しのループが終わり、モデルが最終的な応答を作ったあと、その応答が利用者（CLI、ゲートウェイ、プログラムからの呼び出し元）へ届く**前**に、**ターンごとに一度**発火します。アシスタントの最終的な文面を、普通のプログラムの手法で書き換えられます。人格の味付けの文章や、スキルで変換するために推論のトークンを余分に燃やす必要がありません。

**コールバックの形**

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
| `response_text` | `str` | このターンのアシスタントの最終的な文面。 |
| `session_id` | `str` | この会話のセッション ID（一度きりの実行では空のことがあります）。 |
| `model` | `str` | その応答を作ったモデル名（`anthropic/claude-sonnet-4.6` など）。 |
| `platform` | `str` | 届け先のプラットフォーム（`cli`、`telegram`、`discord` など。設定されていなければ空）。 |

**戻り値**: 空でない `str` を返すと応答の文面が置き換わり、`None` か空文字列ならそのままです。複数のプラグインが登録されている場合は、**最初の空でない文字列が採用されます**。ツールやターミナルの変換とは違い、空文字列は置き換えとして受け付けません。

**使いどころ**: 口調や語彙の変換（海賊風、スポンジ・ボブ風）、最終的な文面から利用者を特定できる情報を伏せる、プロジェクト固有の署名を末尾に足す、人格の指示にトークンを使わずに社内の表記ルールを守らせる、など。

CLI のストリーミングが有効なとき、末尾に足すだけの変換は、流れ終えた本文の
あとに表示されます。応答そのものを置き換える変換は、流れ終えた本文のあとに、
ストリーム後の変換だと分かる形で全文が表示されるので、置き換えの内容が黙って
失われることはありません。

```python

def spongebob(response_text, **kwargs):
    if os.environ.get("SPONGEBOB_MODE") != "on":
        return None  # pass through unchanged
    return re.sub(r"!", "!! Tartar sauce!", response_text)

def register(ctx):
    ctx.register_hook("transform_llm_output", spongebob)
```

このフックは、応答が空でなく、中断もされていない場合にだけ動くように守られています。停止ボタンによる中断や、中身のないターンでは発火しません。例外は警告として記録され、エージェントの実行を壊すことはありません。

### API リクエストの観測用フック {#api-request-observer-hooks}

#### `pre_api_request` {#preapirequest}

プロバイダーへの試行ごとに、送る直前に発火します。観測専用です。古くからある `user_message`、`conversation_history`、`request_messages` のフィールドは、互換のために意図的に生のまま、伏せ字にせず渡されます。新しく作るものは、伏せ字済みの `request` の包みを使ってください。

#### `post_api_request` {#postapirequest}

プロバイダーの応答が問題なく正規化されたあとに発火します。観測専用です。伏せ字済みの `response` を使ってください。`assistant_message` は正規化された生のメッセージで、`usage` は集計用のデータです。

#### `api_request_error` {#apirequesterror}

プロバイダーへの試行が失敗したときに発火し、状態や再試行のタイミング、`error` のオブジェクト、伏せ字済みの `request` を渡します。観測専用です。エラーの文面には、なおプロバイダーや利用者のデータが含まれることがあります。

### `on_skill_lifecycle` {#onskilllifecycle}

スキルの利用状態が正式に変わったあとに発火します。観測専用で、手元の `skill_name`、出どころ、ひも付け用の ID、利用回数、再利用のフラグが見えます。

### かんばんのライフサイクルの観測用フック {#kanban-lifecycle-observers}

#### `kanban_task_claimed` {#kanbantaskclaimed}

ディスパッチャーのプロセスで取得が確定したあと、ワーカーを起こす直前に発火します。

#### `kanban_task_completed` {#kanbantaskcompleted}

完了と後始末のあと、通常はワーカーのプロセスで発火します。`summary` にはプロジェクトや利用者の内容が含まれることがあります。

#### `kanban_task_blocked` {#kanbantaskblocked}

通常の停滞状態への移行のあとに発火します。依存待ちの経路では、その書き込みのトランザクションを抜ける前に呼ばれます。`reason` にはプロジェクトや利用者の内容が含まれることがあります。

かんばんのこの 3 つのフックはいずれも観測専用で、`task_id`、`profile_name`、`board`、`assignee`、`run_id` を運びます。完了のフックには `summary` が、停滞のフックには `reason` が加わります。

### かんばんのワーカーのライフサイクル・タスクの変更・振り分けの観測用フック {#kanban-worker-lifecycle-task-mutation-and-dispatch-observers}

さらに 5 つの観測用フック（RFC #58548）が、かんばんの仲間を広げています。いずれも観測専用で、関係するトランザクションが確定したあとに発火し、`has_hook` で早めに切り上げます。購読者がいなければ、振り分けの挙動は変わりません。タスク単位のフックは、上のフックと同じ共通のフィールドを運びます。

- **`on_kanban_worker_spawned`** — `spawn_fn` が戻り、ワーカーの PID が保存されたあと。`worker_pid`（`None` のことがあります）と `workspace_path` が加わります。振り分けのロックの内側で動くので、コールバックは短く済ませてください。
- **`on_kanban_worker_exited`** — 定期処理から導かれます。`detect_crashed_workers` が死んだ PID のタスクを回収したときに発火します。`worker_pid`、`exit_kind`、`exit_code`、`outcome`、`retry_status` が加わります。
- **`on_kanban_worker_stale_claim`** — 期限切れになった取得が回収されたときに発火します。PID が生きていて期限が延びた場合は発火しません。`worker_pid`、`heartbeat_stale`、`retry_status` が加わります。
- **`on_kanban_task_updated`** — 取得・完了・停滞というライフサイクルの外側で、タスクのフィールドへの書き込みが確定したあと（`assign_task`、モデルや推論の上書き、ダッシュボードの編集画面）。`changed_fields` が加わります。中身はフィールド名だけで、値は決して含みません。
- **`on_kanban_dispatch_tick`** — ディスパッチャーの定期処理ごとに一度、必ず振り分けのロックを手放したあとに。何もしなかった回や、ロックが競合した回でも発火します。中身は `board`、`profile_name`、`dry_run`、`outcome`、`result` です。

---

## シェルフック {#shell-hooks}

`~/.hermes/config.yaml` にシェルスクリプトのフックを書いておくと、対応するプラグインフックのイベントが発火するたびに、Hermes がそれを別プロセスとして実行します。CLI のセッションでもゲートウェイのセッションでも動きます。Python のプラグインを書く必要はありません。

シェルフックは、置くだけで動く 1 ファイルのスクリプト（Bash でも Python でも、シバンがあれば何でも）で次のようなことをしたいときに使います。

- **ツール呼び出しを止める、あるいは書き換える** — 危険な `terminal` のコマンドを拒む、ディレクトリごとの方針を守らせる、破壊的な `write_file` や `patch` の操作に承認を求める、ツールが動く前に引数を書き換える（パスを無害にする、既定値を入れる）。
- **ツール呼び出しのあとに動かす** — エージェントが書いたばかりの Python や TypeScript のファイルを自動で整形する、API の呼び出しを記録する、CI のワークフローを起こす。
- **次の LLM のターンへ文脈を差し込む** — `git status` の出力、今日の曜日、引いてきた文書などを利用者のメッセージの前に足す（[`pre_llm_call`](#pre_llm_call)を参照）。
- **ライフサイクルのイベントを見張る** — サブエージェントが終わったとき（`subagent_stop`）やセッションが始まったとき（`on_session_start`）にログを 1 行書く。

シェルフックは、CLI の起動時（`hermes_cli/main.py`）とゲートウェイの起動時（`gateway/run.py`）の両方で `agent.shell_hooks.register_from_config(cfg)` を呼んで登録されます。Python のプラグインフックとも無理なく組み合わせられます。どちらも同じディスパッチャーを通るからです。

### ひと目で分かる比較 {#comparison-at-a-glance}

| 観点 | シェルフック | [プラグインフック](#plugin-hooks) | [ゲートウェイフック](#gateway-event-hooks) |
|-----------|-------------|-------------------------------|---------------------------------------|
| 書く場所 | `~/.hermes/config.yaml` の `hooks:` ブロック | `plugin.yaml` を持つプラグインの `register()` | `HOOK.yaml` と `handler.py` を置いたディレクトリ |
| 置き場所 | `~/.hermes/agent-hooks/`（慣例） | `~/.hermes/plugins/<name>/` | `~/.hermes/hooks/<name>/` |
| 言語 | 何でも（Bash、Python、Go のバイナリなど） | Python のみ | Python のみ |
| 動く場所 | CLI とゲートウェイ | CLI とゲートウェイ | ゲートウェイのみ |
| イベント | `VALID_HOOKS`（`subagent_stop` を含む） | `VALID_HOOKS` | ゲートウェイのライフサイクル（`gateway:startup`、`agent:*`、`command:*`） |
| ツール呼び出しを止められるか | はい（`pre_tool_call`） | はい（`pre_tool_call`） | いいえ |
| LLM へ文脈を差し込めるか | はい（`pre_llm_call`） | はい（`pre_llm_call`） | いいえ |
| 同意 | `(event, command)` の組ごとに、初回に確認 | 暗黙（Python プラグインへの信頼） | 暗黙（ディレクトリへの信頼） |
| プロセスの分離 | あり（別プロセス） | なし（同一プロセス内） | なし（同一プロセス内） |

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

イベント名は[プラグインフックのイベント](#plugin-hooks)のどれかでなければなりません。打ち間違いには「Did you mean X?」という警告が出て、そのエントリーは読み飛ばされます。エントリーの中の知らないキーは無視されます。`command` が無い場合は警告を出して読み飛ばします。`timeout > 300` は警告とともに上限へ丸められます。`pre_tool_call` 以外のイベントに `fail_closed: true` を付けると、警告が出て無視されます（閉じる側に倒せるのは、実行を止められるイベントだけです）。

### JSON のやり取りの決まり {#json-wire-protocol}

イベントが発火するたび、Hermes は条件に当てはまるフックごとに別プロセスを起こし（matcher が許せば）、JSON の中身を**標準入力**へ流し込み、**標準出力**を JSON として読み取ります。

**標準入力 — スクリプトが受け取る中身**

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

ツール以外のイベント（`pre_llm_call`、`subagent_stop`、セッションのライフサイクル）では、`tool_name` と `tool_input` は `null` になります。`extra` の辞書には、イベント固有のキーワード引数がすべて入ります（`user_message`、`conversation_history`、`child_role`、`duration_ms` など）。JSON にできない値は、省くのではなく文字列にして入れます。

**標準出力 — 返してもよい応答**

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

形の壊れた JSON、0 以外の終了コード、時間切れは警告として記録されるだけで、エージェントのループを止めることはありません。

### 終了コード 2 で遮断（Claude Code / Cursor 互換） {#exit-code-2-block-claude-code-cursor-compatible}

`pre_tool_call` のフックが終了コード **2** で終わると、標準出力に遮断用の JSON が無くてもツール呼び出しが止まります。遮断のメッセージは次の優先順で決まります。

1. 標準出力の遮断用 JSON（`reason` か `message`）。あればそれ。
2. 標準エラー出力の先頭 400 文字。
3. 既定の `"Blocked by shell hook."` という一般的な文面。

つまり、いちばん簡単な遮断のフックはこうなります。

```bash
#!/usr/bin/env bash
echo "policy violation: rm -rf is not permitted" >&2
exit 2
```

遮断の指示が効かないイベント（`pre_tool_call` 以外のすべて）では、終了コード 2 も他の 0 以外の終了と同じ扱いです。警告が記録され、標準出力はそのまま解釈されます。

### 開く側に倒すか、閉じる側に倒すか {#fail-open-vs-fail-closed}

既定では、シェルフックは**開く側に倒します**。プロセスの起動の失敗、時間切れ、解釈できない標準出力は警告として記録され、処理はそのまま進みます。観測が目的のフックにはそれが正しい既定ですが、安全のためのゲートには向きません。落ちてしまった秘密情報の検査役が、本来調べるはずだったツール呼び出しを黙って通してしまってはいけないからです。

`pre_tool_call` のエントリーに `fail_closed: true`（Cursor と Claude Code の綴りである `failClosed: true` でも可）を付けると、これが逆になります。

```yaml
hooks:
  pre_tool_call:
    - matcher: "terminal|write_file|patch"
      command: "~/.hermes/agent-hooks/secret-scan.sh"
      timeout: 10
      fail_closed: true
```

`fail_closed: true` にすると、次のそれぞれが `hook <command> failed closed: <reason>` としてツール呼び出しを**止める**ようになります。

| 失敗の内容 | 開く側（既定） | `fail_closed: true` |
|---------|--------------------|--------------------|
| コマンドが見つからない／実行できない | 警告して先へ進む | **遮断** |
| 時間切れ | 警告して先へ進む | **遮断** |
| JSON でない標準出力（スタックトレースなど） | 警告して先へ進む | **遮断** |
| 正常終了で、何もしない正しい JSON（`{}`） | 先へ進む | 先へ進む |

`fail_closed` が効くのは、実行を止められるイベント（今のところ `pre_tool_call`）だけです。それ以外のイベントに付けると、設定の読み込み時に警告が記録され、無視されます。`hermes hooks test` もこの意味づけに沿って動き、`parsed` の行にはディスパッチャーが実際に受け取る遮断の形がそのまま出ます。

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

エージェントが文脈として持っているファイルの中身が、自動で読み直されるわけでは**ありません**。整形が効くのはディスク上のファイルだけです。次に `read_file` を呼んだ時点で、整形後のものが読み込まれます。

#### 2. 破壊的な `terminal` のコマンドを遮断する {#2-block-destructive-terminal-commands}

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

Claude Code の `UserPromptSubmit` に当たるイベントは、意図して Hermes では別立てにしていません。`pre_llm_call` が同じ場所で発火し、文脈の差し込みにもすでに対応しているからです。ここではそちらを使ってください。

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

`(event, command)` の組は、Hermes が初めて見たときに利用者へ承認を求め、その判断を `~/.hermes/shell-hooks-allowlist.json` に残します。以降の実行（CLI でもゲートウェイでも）では確認は出ません。

対話的な確認を飛ばす抜け道が 3 つあります。どれか 1 つで足ります。

1. CLI の `--accept-hooks` フラグ（`hermes --accept-hooks chat` など）
2. 環境変数 `HERMES_ACCEPT_HOOKS=1`
3. `~/.hermes/config.yaml` の `hooks_auto_accept: true`

端末を持たない実行（ゲートウェイ、cron、CI）では、この 3 つのどれかが必要です。そうでないと、新しく足したフックは黙って登録されないまま、警告だけが記録されます。

**スクリプトの編集は黙って信頼されます。** 許可リストの鍵になるのはコマンドの文字列そのもので、スクリプトのハッシュではありません。ですからディスク上のスクリプトを書き換えても、同意は無効になりません。`hermes hooks doctor` が更新時刻のずれを知らせてくれるので、編集に気づいて承認し直すかどうかを判断できます。

#### 手作業で許可リストに載せる {#manual-allowlisting}

手作業で許可リストに載せるやり方は、端末を持たない構成や、サービス用のアカウントでの運用など、運用担当者が初回の確認に対話で答えられない場面で役に立ちます。許可リストのファイルは `~/.hermes/shell-hooks-allowlist.json` で、想定している形は `approvals` の配列です。承認のひとつひとつが、フックの `event` と、`command` の文字列そのものを記録します。

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

コマンドの文字列は、設定に書いたフックのコマンドと完全に一致していなければなりません。パスを鍵にして `sha256` フィールドを持つオブジェクトは想定している形ではなく、そのフックを承認したことにはなりません。手作業で足したものは `hermes hooks list` で確かめてください。

### `hermes hooks` コマンド {#the-hermes-hooks-cli}

| コマンド | 何をするか |
|---------|--------------|
| `hermes hooks list` | 設定済みのフックを、matcher、timeout、同意の状態とともに書き出します |
| `hermes hooks test <event> [--for-tool X] [--payload-file F]` | 条件に当てはまるフックを、作りものの中身に対してすべて発火させ、解釈された応答を表示します |
| `hermes hooks revoke <command>` | `<command>` に当てはまる許可リストの項目をすべて消します（次回の再起動から効きます） |
| `hermes hooks doctor` | 設定済みのフックそれぞれについて、実行権限、許可リストの状態、更新時刻のずれ、JSON の出力の正しさ、おおよその実行時間を調べます |

### 安全のために {#security}

シェルフックは**あなたの権限そのまま**で動きます。cron の項目やシェルのエイリアスと同じ信頼の境界です。`config.yaml` の `hooks:` ブロックは、特権を持つ設定として扱ってください。

- 自分で書いたか、隅々まで目を通したスクリプトだけを指すようにします。
- パスを追いやすいよう、スクリプトは `~/.hermes/agent-hooks/` の中に置きます。
- 共有の設定を取り込んだあとは `hermes hooks doctor` を実行し直し、新しく足されたフックが登録される前に気づけるようにします。
- config.yaml をチームでバージョン管理しているなら、`hooks:` の節を変える PR は、CI の設定を見るときと同じ目つきでレビューします。

### 順番と優先順位 {#ordering-and-precedence}

Python のプラグインフックもシェルフックも、同じ `invoke_hook()` のディスパッチャーを通ります。先に Python のプラグインが登録され（`discover_and_load()`）、次にシェルフックが登録される（`register_from_config()`）ので、引き分けの場面では Python の `pre_tool_call` の遮断の判断が優先されます。最初の正しい遮断が採用されます。どれかのコールバックが空でないメッセージ付きの `{"action": "block", "message": str}` を返した時点で、まとめ役はそこで打ち切ります。

## 送信 Webhook {#outbound-webhooks}

送信 Webhook は、[受信 Webhook の仕組み](/hermes/docs/user-guide/messaging/webhooks/)を押し出し側から映したものです。受信 Webhook は世の中の変化で Hermes を起こしますが、送信 Webhook は Hermes が何かをしたことを世の中へ伝えます。HTTP のエンドポイントと、そこが関心を持つライフサイクルのイベントを並べておけば、当てはまるイベントが発火するたびに、Hermes が署名付きの JSON をそれぞれのエンドポイントへ POST します。受け取る側で定期的に問い合わせる必要はありません。

よくある使い方です。

- エージェントのターンが終わったときに CI やダッシュボードへ知らせる（`on_session_end`）
- 複数の端末にまたがるサブエージェントの完了を追いかける（`subagent_stop`）
- ツールの動きを外部の監視へ流し込む（`matcher` 付きの `post_tool_call`）
- *別の* Hermes を起こす。その相手の受信 Webhook を URL に指定します

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

プラグインフックのイベントであれば何でも指定できます（`pre_tool_call`、`post_tool_call`、`pre_llm_call`、`post_llm_call`、`on_session_start`、`on_session_end`、`subagent_start`、`subagent_stop` など）。形の壊れた項目は警告を出して読み飛ばされます。壊れた Webhook がエージェントを落とすことはありません。変更は次の CLI のセッション、またはゲートウェイの再起動から効きます。

秘密情報について: 設定ファイルに資格情報を残さないよう、`secret:` に値を直接書くよりも `secret_env`（環境変数の名前。ふつうは `~/.hermes/.env` で設定します）を使ってください。秘密情報を設定していない項目は、署名なしで送られます（`hermes hooks list` では `UNSIGNED` と表示されます）。

### 送るデータの形 {#wire-format}

発火のたびに、シェルフックの標準入力と同じ最上位の形の JSON に、配送のメタデータを足したものを POST します。

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

ヘッダーです。

| ヘッダー | 値 |
|--------|-------|
| `Content-Type` | `application/json` |
| `X-Hermes-Event` | フックのイベント名 |
| `X-Hermes-Delivery` | 配送ごとに一意の ID。本文の `delivery_id` と同じ値です |
| `X-Hermes-Signature-256` | `sha256=<hex>` — GitHub と同じやり方で、本文そのものの HMAC-SHA256 を取ったもの。秘密情報を設定している場合にだけ付きます |

署名の確認は、GitHub の Webhook とまったく同じやり方でできます。

```python

def verify(body: bytes, header: str, secret: str) -> bool:
    expected = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, header)
```

`delivery_id` と `timestamp` は**署名される本文の中**にあるので、署名を確かめる受け手は、そのまま再送への備えも手に入ります。

- `delivery_id`（または対応する `X-Hermes-Delivery` ヘッダー）で**重複を除きます**。最近見た ID を覚えておいて、同じものは飛ばしてください。Hermes は失敗した配送を一度だけ再送するので、同じ ID が正当に 2 回届くことがあります。
- `timestamp` を自分の時計と照らし、許容の幅（5 分がよく使われる既定です）を超えていれば**古いイベントとして拒みます**。取っておいたリクエストを送り直す攻撃者も、秘密情報なしでは新しい時刻を偽造できません。

### 配送の約束ごと {#delivery-semantics}

- **投げっぱなし、本流の外で。** イベントはすぐに直列化されてキューへ積まれ、裏方のスレッド 1 本が HTTP の POST を行います。遅いエンドポイントや死んだエンドポイントが、ツール呼び出しやエージェントのターンを止めることは決してありません。
- **知らせるだけ。** シェルフックと違い、送信 Webhook はツール呼び出しを止めたり文脈を差し込んだりできません。応答の本文は無視されます。見るだけで、舵は取りません。
- **再送は限りあり。** 接続のエラーと 5xx の応答は、間を置いて一度だけ再送します。4xx は再送しません（受け手が「リクエストそのものがおかしい」と言っているからです）。失敗は記録して捨てます。配送は最善を尽くすもので、保証はありません。
- **リダイレクトは決してたどりません。** 3xx の応答は設定の誤りとみなして記録します。リダイレクトされた POST をたどると、署名付きの中身が黙って失われてしまうからです。`url` には最終的なエンドポイントを指定してください。
- **キューには上限があります。** キューが詰まった場合（エンドポイントが死んでいる、イベントが殺到したなど）、際限なくメモリを食うのではなく、新しいイベントを警告とともに捨てます。
- **同意の確認はありません。** 送信先はあなたの端末で何かを実行するわけではなく、あなたが設定した URL でデータを受け取るだけだからです。`HERMES_SAFE_MODE=1` のときは、プラグインやシェルフックと同じように登録そのものを飛ばします。送る中身にはツールの入力やイベントのメタデータが含まれるので、送信先は信頼できるエンドポイントだけにして、`https://` を使うようにしてください。

`hermes hooks list` は、設定済みの送信先をシェルフックと並べて表示します。それぞれが署名付きかどうかも分かります。
