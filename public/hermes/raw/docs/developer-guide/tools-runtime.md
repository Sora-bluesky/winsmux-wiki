---
title: "ツールの実行基盤"
description: "ツールの登録簿、ツールセット、振り分け、ターミナル環境の動き"
upstream_path: developer-guide/tools-runtime.md
upstream_blob: c863219eb26447ad0a0998fa661b142d493a0520
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/tools-runtime
---

# ツールの実行基盤 {#tools-runtime}

Hermes のツールは自分自身を登録する関数で、ツールセットにまとめられ、中央の登録簿と振り分けの仕組みを通して実行されます。

主なファイル:

- `tools/registry.py`
- `model_tools.py`
- `toolsets.py`
- `tools/terminal_tool.py`
- `tools/environments/*`

## ツールの登録のしかた {#tool-registration-model}

各ツールのモジュールは、読み込まれた時点で `registry.register(...)` を呼びます。

ツールのモジュールを読み込んで見つけ出し、モデルに渡すスキーマの一覧を組み立てるのは `model_tools.py` の役目です。

### `registry.register()` の動き {#how-registryregister-works}

`tools/` にあるツールのファイルは、モジュールの最上位で `registry.register()` を呼んで自分を宣言します。関数の書き方は次のとおりです。

```python
registry.register(
    name="terminal",               # Unique tool name (used in API schemas)
    toolset="terminal",            # Toolset this tool belongs to
    schema={...},                  # Model-facing schema (description, parameters)
    handler=handle_terminal,       # The function that executes when the tool is called
    check_fn=check_terminal,       # Optional: returns True/False for availability
    requires_env=["SOME_VAR"],     # Optional: env vars needed (for UI display)
    is_async=False,                # Whether the handler is an async coroutine
    description="Run commands",    # Optional ToolEntry registry metadata
    emoji="💻",                    # Emoji for spinner/progress display
)
```

呼び出すたびに `ToolEntry` が作られ、シングルトンの `ToolRegistry._tools` 辞書にツール名をキーとして入ります。**別の**ツールセットにある既存のツールを覆い隠すような登録は拒否されます（エラーログが出ます）。ただし呼び出し側が `override=True` を渡した場合は別で、さらにプラグインが組み込みツールを上書きするときは、`config.yaml` に `plugins.entries.<plugin_id>.allow_tool_override: true` という運用者の明示的な許可も必要です。

モデルに対する説明として正となるのは `schema["description"]` です。引数の `description=` が埋めるのは `ToolEntry.description` のほうで、`get_definitions()` は `entry.schema` から OpenAI 形式の関数定義を組み立て、`description` を持たないスキーマに `entry.description` を写すことはしません。したがって `description=` を書いただけではモデルへの説明にはならず、両者が食い違えばモデルが見るのはスキーマ側の値です。登録簿の利用者があえて別のメタデータを必要とする場合を除き、説明はスキーマに一度だけ書くのが安全です。

### 探索: `discover_builtin_tools()` {#discovery-discoverbuiltintools}

`model_tools.py` が読み込まれると、`tools/registry.py` の `discover_builtin_tools()` が呼ばれます。この関数は `tools/*.py` のファイルを AST 解析で走査し、最上位に `registry.register()` の呼び出しがあるモジュールを見つけて読み込みます。

```python
# tools/registry.py (simplified)
def discover_builtin_tools(tools_dir=None):
    tools_path = Path(tools_dir) if tools_dir else Path(__file__).parent
    for path in sorted(tools_path.glob("*.py")):
        if path.name in {"__init__.py", "registry.py", "mcp_tool.py"}:
            continue
        if _module_registers_tools(path):  # AST check for top-level registry.register()
            importlib.import_module(f"tools.{path.stem}")
```

この自動探索のおかげで、新しいツールのファイルは何もしなくても拾われます。手で一覧を保守する必要はありません。AST の判定は最上位の `registry.register()` だけを対象にする（関数の中の呼び出しは見ない）ので、`tools/` にある補助モジュールが読み込まれることはありません。

読み込みのたびに、そのモジュールの `registry.register()` が実行されます。任意扱いのツールで起きたエラー（画像生成に必要な `fal_client` が無い場合など）は捕まえてログに残すだけで、ほかのツールの読み込みは止まりません。

中心となるツールの探索が終わると、MCP のツールとプラグインのツールも探されます。

1. **MCP のツール** — `tools.mcp_tool_discovery.discover_mcp_tools()`（窓口の `tools.mcp_tool` から再公開）が MCP サーバーの設定を読み、外部サーバーのツールを登録します。
2. **プラグインのツール** — `hermes_cli.plugins.discover_plugins()` が利用者・プロジェクト・pip のプラグインを読み込み、その中にツールを登録するものがあれば加わります。

## ツールが使えるかの判定（`check_fn`） {#tool-availability-checking-checkfn}

各ツールは任意で `check_fn` を持てます。使えるときに `True`、そうでなければ `False` を返す呼び出し可能なものです。よくある判定は次のとおりです。

- **API キーがあるか** — ウェブ検索なら `lambda: bool(os.environ.get("SERP_API_KEY"))` など
- **サービスが動いているか** — Honcho のサーバーが設定されているかを確かめる、など
- **実行ファイルが入っているか** — ブラウザ操作のツール向けに `playwright` があるかを確かめる、など

`registry.get_definitions()` がモデルに渡すスキーマの一覧を組み立てるとき、各ツールの `check_fn()` を実行します。

```python
# Simplified from registry.py
if entry.check_fn:
    try:
        available = bool(entry.check_fn())
    except Exception:
        available = False   # Exceptions = unavailable
    if not available:
        continue            # Skip this tool entirely
```

押さえておきたい動きは次のとおりです。
- 判定の結果は**呼び出しごとにキャッシュ**されます。複数のツールが同じ `check_fn` を共有していれば、実行は 1 回だけです。
- `check_fn()` の中で例外が出た場合は「使えない」とみなします（安全側に倒します）。
- `is_toolset_available()` メソッドは、そのツールセットの `check_fn` が通るかを確かめます。画面表示とツールセットの解決に使われます。

## ツールセットの解決 {#toolset-resolution}

ツールセットは名前の付いたツールの束です。Hermes は次を通してこれを解決します。

- 有効・無効のツールセットの明示的な一覧
- プラットフォームごとの既定の組み合わせ（`hermes-cli`、`hermes-telegram` など）
- 動的な MCP のツールセット
- `hermes-acp` のような、用途を絞って選び抜かれた束

### `get_tool_definitions()` による絞り込み {#how-gettooldefinitions-filters-tools}

入口となるのは `model_tools.get_tool_definitions(enabled_toolsets, disabled_toolsets, quiet_mode)` です。

1. **`enabled_toolsets` が渡された場合** — そのツールセットのツールだけが対象になります。各ツールセット名は `resolve_toolset()` で解決され、複合のツールセットは個々のツール名に展開されます。

2. **`disabled_toolsets` が渡された場合** — すべてのツールセットから始めて、無効にしたものを差し引きます。

3. **どちらも無い場合** — 知られているツールセットをすべて含めます。

4. **登録簿での絞り込み** — 解決したツール名の集合が `registry.get_definitions()` に渡され、そこで `check_fn` による絞り込みが行われ、OpenAI 形式のスキーマが返ります。

5. **スキーマの動的な書き換え** — 絞り込みのあと、`execute_code` と `browser_navigate` のスキーマが調整され、実際に絞り込みを通過したツールだけを指すようになります（使えないツールをモデルが思い込みで呼ぶのを防ぎます）。

### 昔のツールセット名 {#legacy-toolset-names}

`_tools` が末尾に付く古いツールセット名（`web_tools`、`terminal_tools` など）は、後方互換のために `_LEGACY_TOOLSET_MAP` を通して今のツール名へ対応づけられます。

## 振り分け {#dispatch}

実行時、ツールは中央の登録簿を通して振り分けられます。ただし、メモリ・todo・セッション検索の処理のように、エージェントの階層で扱うツールは例外です。

### 振り分けの流れ: モデルの tool_call からハンドラの実行まで {#dispatch-flow-model-toolcall-handler-execution}

モデルが `tool_call` を返したとき、流れは次のようになります。

```
Model response with tool_call
    ↓
agent loop (`agent/conversation_loop.py`, via `run_agent.py`'s `AIAgent` facade)
    ↓
model_tools.handle_function_call(name, args, task_id, user_task)
    ↓
[Agent-loop tools?] → handled directly by agent loop (todo, memory, session_search, delegate_task)
    ↓
[Plugin pre-hook] → invoke_hook("pre_tool_call", ...)
    ↓
registry.dispatch(name, args, **kwargs)
    ↓
Look up ToolEntry by name
    ↓
[Async handler?] → bridge via _run_async()
[Sync handler?]  → call directly
    ↓
Return result string (or JSON error)
    ↓
[Plugin post-hook] → invoke_hook("post_tool_call", ...)
```

### エラーの包み方 {#error-wrapping}

ツールの実行は、二段構えでエラー処理に包まれています。

1. **`registry.dispatch()`** — ハンドラから出たあらゆる例外を捕まえ、`{"error": "Tool execution failed: ExceptionType: message"}` を JSON として返します。

2. **`handle_function_call()`** — 振り分け全体をもう一段の try/except で包み、`{"error": "Error executing tool_name: message"}` を返します。

これにより、モデルが受け取るのは常に整った JSON の文字列になり、処理されないままの例外が渡ることはありません。

### エージェントループが扱うツール {#agent-loop-tools}

次の 4 つは、エージェントの階層の状態（TodoStore、MemoryStore など）を必要とするため、登録簿での振り分けより前に横取りされます。

- `todo` — 計画とタスクの管理
- `memory` — 残しておくメモリへの書き込み
- `session_search` — セッションをまたいだ想起
- `delegate_task` — 副エージェントのセッションを起こす

これらのツールのスキーマも登録簿には登録されていますが（`get_tool_definitions` のため）、万一そのまま振り分けに届いた場合、ハンドラはエラーの雛形を返します。

### 非同期のつなぎ {#async-bridging}

ツールのハンドラが非同期の場合、`_run_async()` が同期の振り分け経路へつなぎます。

- **CLI の経路（動いているループが無い）** — 常設のイベントループを使い、キャッシュした非同期クライアントを生かしておきます
- **ゲートウェイの経路（ループが動いている）** — 使い捨てのスレッドを立てて `asyncio.run()` を実行します
- **ワーカースレッド（ツールの並列実行）** — スレッドごとの常設ループをスレッドローカルに持たせます

## DANGEROUS_PATTERNS による承認の流れ {#the-dangerouspatterns-approval-flow}

ターミナルのツールには、`tools/approval.py` で定義された危険なコマンドの承認の仕組みが組み込まれています。

1. **パターンの定義** — `DANGEROUS_PATTERNS` は `(regex, description)` の組の一覧で、壊す方向の操作を網羅します。
   - 再帰的な削除（`rm -rf`）
   - ファイルシステムの初期化（`mkfs`、`dd`）
   - SQL の破壊的な操作（`DROP TABLE`、`WHERE` の無い `DELETE FROM`）
   - システム設定の上書き（`> /etc/`）
   - サービスの操作（`systemctl stop`）
   - 遠隔からのコード実行（`curl | sh`）
   - フォーク爆弾、プロセスの強制終了、ほか

2. **検出** — ターミナルのコマンドを実行する前に、`detect_dangerous_command(command)` がすべてのパターンと照合します。

3. **承認の問い合わせ** — 一致するものがあった場合:
   - **CLI のとき** — 対話的に、承認する・拒否する・以後ずっと許可する、を利用者に尋ねます
   - **ゲートウェイのとき** — 非同期の承認コールバックが、依頼をメッセージのプラットフォームへ送ります
   - **賢い承認** — 任意で、補助の LLM がパターンに当たっただけの危険度の低いコマンドを自動承認できます（たとえば `rm -rf node_modules/` は安全ですが「再帰的な削除」に一致します）

4. **セッションの状態** — 承認はセッションごとに記録されます。そのセッションで一度「再帰的な削除」を承認すれば、以後の `rm -rf` では聞き直しません。

5. **恒久的な許可リスト** — 「以後ずっと許可する」を選ぶと、そのパターンが `config.yaml` の `command_allowlist` に書き込まれ、セッションをまたいで残ります。

## ターミナルと実行環境 {#terminalruntime-environments}

ターミナルの仕組みは複数の実行先に対応しています。

- local
- docker
- ssh
- singularity
- modal
- daytona
- vercel_sandbox

さらに次にも対応します。

- タスクごとの作業ディレクトリの上書き
- 背後で動くプロセスの管理
- PTY モード
- 危険なコマンドの承認コールバック

## 並行実行 {#concurrency}

ツールの呼び出しは、ツールの組み合わせや対話の要件に応じて、順番に実行されることも同時に実行されることもあります。

## 関連するページ {#related-docs}

- [ツールセット早見表](/hermes/docs/reference/toolsets-reference/)
- [組み込みツール早見表](/hermes/docs/reference/tools-reference/)
- [エージェントループの内側](/hermes/docs/developer-guide/agent-loop/)
- [ACP の内側](/hermes/docs/developer-guide/acp-internals/)
