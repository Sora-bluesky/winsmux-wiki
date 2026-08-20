---
title: "ツールの実行のしくみ"
description: "ツールのレジストリ、ツールセット、ディスパッチ、ターミナル環境が実行時にどう動くか"
upstream_path: developer-guide/tools-runtime.md
upstream_blob: 7fcbb4d7cd0a844beee08814de36030da5b93c7d
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/tools-runtime
---

# ツールの実行のしくみ {#tools-runtime}

Hermes のツールは自分で自分を登録する関数で、ツールセットにまとめられ、中央のレジストリとディスパッチのしくみを通して実行されます。

主なファイルは次のとおりです。

- `tools/registry.py`
- `model_tools.py`
- `toolsets.py`
- `tools/terminal_tool.py`
- `tools/environments/*`

## ツールの登録のしかた {#tool-registration-model}

それぞれのツールのモジュールは、import された時点で `registry.register(...)` を呼びます。

`model_tools.py` は、ツールのモジュールを import して見つけ出し、モデルに渡すスキーマの一覧を組み立てる役割を持ちます。

### `registry.register()` の動き {#how-registryregister-works}

`tools/` にあるツールのファイルは、モジュールの一番外側で `registry.register()` を呼んで自分を宣言します。関数の書き方は次のとおりです。

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

呼び出すたびに `ToolEntry` が作られ、シングルトンの `ToolRegistry._tools` という辞書に、ツール名をキーとして保存されます。**別の** ツールセットにある既存のツールを上書きしてしまう登録は、呼び出し側が `override=True` を渡さないかぎり拒否されます（エラーログが出ます）。プラグインが組み込みツールを上書きする場合は、それに加えて `config.yaml` で `plugins.entries.<plugin_id>.allow_tool_override: true` と運用者が明示的に許可する必要があります。

モデルに見える説明として正となるのは `schema["description"]` です。引数として別に渡す `description=` の方は `ToolEntry.description` に入り、省略したときはレジストリ側のメタデータがスキーマの説明を引き継ぎます。`get_definitions()` は `entry.schema` から OpenAI 形式の関数定義を組み立てるだけで、`description` を持たないスキーマに `entry.description` を写し込むことはしません。つまり `description=` だけを書いてもモデルへの説明にはならず、両方の値が違っているときにモデルが見るのはスキーマ側の値です。レジストリを読む側があえて違うメタデータを必要とする場合を除いて、説明はスキーマに一度だけ書くようにしてください。

### 見つけ方: `discover_builtin_tools()` {#discovery-discoverbuiltintools}

`model_tools.py` が import されると、`tools/registry.py` の `discover_builtin_tools()` が呼ばれます。この関数は `tools/*.py` のファイルを AST 解析ですべて調べ、一番外側で `registry.register()` を呼んでいるモジュールを見つけて import します。

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

この自動検出のおかげで、新しいツールのファイルは置くだけで拾われます。import の一覧を手で管理する必要はありません。AST の検査が対象にするのは一番外側の `registry.register()` の呼び出しだけ（関数の中の呼び出しは対象外）なので、`tools/` にある補助用のモジュールが import されることはありません。

import されるたびに、そのモジュールの `registry.register()` が実行されます。必須ではないツールで起きたエラー（画像生成用の `fal_client` が入っていない、など）は捕まえてログに残すだけなので、他のツールの読み込みは止まりません。

コアのツールを見つけたあとは、MCP のツールとプラグインのツールも順に見つけていきます。

1. **MCP のツール** — `tools.mcp_tool.discover_mcp_tools()` が MCP サーバーの設定を読み、外部サーバーのツールを登録します。
2. **プラグインのツール** — `hermes_cli.plugins.discover_plugins()` が、ユーザー用・プロジェクト用・pip 由来のプラグインを読み込みます。プラグインが追加のツールを登録することがあります。

## ツールが使えるかの判定（`check_fn`） {#tool-availability-checking-checkfn}

それぞれのツールは、必要なら `check_fn` を用意できます。これは、そのツールが使えるときに `True`、使えないときに `False` を返す関数です。よくある判定は次のとおりです。

- **API キーがあるか** — 例えば Web 検索なら `lambda: bool(os.environ.get("SERP_API_KEY"))`
- **サービスが動いているか** — 例えば Honcho のサーバーが設定されているかを確かめる
- **実行ファイルが入っているか** — 例えばブラウザ系のツール向けに `playwright` が使えるかを確かめる

`registry.get_definitions()` がモデル向けのスキーマ一覧を組み立てるとき、各ツールの `check_fn()` が実行されます。

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

主な挙動は次のとおりです。
- 判定の結果は **呼び出しごとにキャッシュ** されます。複数のツールが同じ `check_fn` を使っていても、実行は一度だけです。
- `check_fn()` の中で例外が起きたときは「使えない」とみなします（安全側に倒す）。
- `is_toolset_available()` は、ツールセットの `check_fn` が通るかどうかを調べるもので、画面表示とツールセットの解決に使われます。

## ツールセットの解決 {#toolset-resolution}

ツールセットは、ツールに名前を付けて束ねたものです。Hermes は次の材料から解決します。

- 明示的に有効・無効にしたツールセットの一覧
- プラットフォームごとの既定の組み合わせ（`hermes-cli`、`hermes-telegram` など）
- MCP から動的に作られるツールセット
- `hermes-acp` のような用途を絞って選び抜かれた組み合わせ

### `get_tool_definitions()` の絞り込み {#how-gettooldefinitions-filters-tools}

主な入り口は `model_tools.get_tool_definitions(enabled_toolsets, disabled_toolsets, quiet_mode)` です。

1. **`enabled_toolsets` が渡されたとき** — そのツールセットに属するツールだけを対象にします。それぞれのツールセット名は `resolve_toolset()` が解決し、複合のツールセットは個々のツール名に展開されます。

2. **`disabled_toolsets` が渡されたとき** — まず全ツールセットから始めて、無効にしたものを差し引きます。

3. **どちらもないとき** — 分かっているツールセットをすべて対象にします。

4. **レジストリ側の絞り込み** — こうして決まったツール名の集合が `registry.get_definitions()` に渡され、`check_fn` による絞り込みをかけたうえで OpenAI 形式のスキーマが返ります。

5. **スキーマの動的な差し替え** — 絞り込みのあと、`execute_code` と `browser_navigate` のスキーマは、実際に残ったツールだけを参照するように書き換えられます（使えないツールをモデルが勝手に思い浮かべるのを防ぐためです）。

### 古いツールセット名 {#legacy-toolset-names}

`_tools` が付いた古いツールセット名（`web_tools`、`terminal_tools` など）は、`_LEGACY_TOOLSET_MAP` によって今のツール名に対応づけられ、そのまま使い続けられるようになっています。

## ディスパッチ {#dispatch}

実行時、ツールは中央のレジストリを通して振り分けられます。ただし、メモリ・TODO・セッション検索のように、エージェントのループ側で扱うツールは例外です。

### 振り分けの流れ: モデルの tool_call からハンドラの実行まで {#dispatch-flow-model-toolcall-handler-execution}

モデルが `tool_call` を返したあとの流れは次のとおりです。

```
Model response with tool_call
    ↓
run_agent.py agent loop
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

1. **`registry.dispatch()`** — ハンドラから出た例外をすべて捕まえ、`{"error": "Tool execution failed: ExceptionType: message"}` を JSON として返します。

2. **`handle_function_call()`** — その振り分け全体をもう一段の try/except で包み、`{"error": "Error executing tool_name: message"}` を返します。

こうすることで、モデルが受け取るのは必ず形の整った JSON の文字列になり、処理されないままの例外が届くことはありません。

### エージェントのループ側で扱うツール {#agent-loop-tools}

次の 4 つのツールは、エージェント側の状態（TodoStore、MemoryStore など）を必要とするため、レジストリに振り分ける前に横取りされます。

- `todo` — 計画づくりと作業の追跡
- `memory` — 残しておく記憶の書き込み
- `session_search` — セッションをまたいだ思い出し
- `delegate_task` — サブエージェントのセッションを立ち上げる

これらのツールのスキーマもレジストリには登録されていますが（`get_tool_definitions` のためです）、万一そのまま振り分けが届いた場合、ハンドラはスタブのエラーを返します。

### 非同期の橋渡し {#async-bridging}

ツールのハンドラが非同期のとき、`_run_async()` がそれを同期の振り分けの流れにつなぎます。

- **CLI の経路（動いているループがない）** — 常設のイベントループを使い、キャッシュされた非同期クライアントを生かしたままにします
- **ゲートウェイの経路（動いているループがある）** — 使い捨てのスレッドを立てて `asyncio.run()` を実行します
- **ワーカースレッド（ツールの並列実行）** — スレッドローカルに置いた、スレッドごとの常設ループを使います

## DANGEROUS_PATTERNS による承認の流れ {#the-dangerouspatterns-approval-flow}

ターミナルのツールには、`tools/approval.py` で定義された、危険なコマンドを承認にかけるしくみが組み込まれています。

1. **パターンの定義** — `DANGEROUS_PATTERNS` は `(regex, description)` の組の一覧で、次のような壊れる操作を対象にします。
   - 再帰的な削除（`rm -rf`）
   - ファイルシステムの初期化（`mkfs`、`dd`）
   - 中身が消える SQL 操作（`DROP TABLE`、`WHERE` のない `DELETE FROM`）
   - システム設定の上書き（`> /etc/`）
   - サービスの操作（`systemctl stop`）
   - 遠隔からのコード実行（`curl | sh`）
   - フォーク爆弾、プロセスの強制終了など

2. **検出** — ターミナルのコマンドを実行する前に、`detect_dangerous_command(command)` がすべてのパターンと照らし合わせます。

3. **承認の問いかけ** — 当てはまるものがあった場合は、次のようになります。
   - **CLI モード** — その場で、許可するか、拒否するか、以後ずっと許可するかを尋ねます
   - **ゲートウェイモード** — 非同期の承認コールバックが、メッセージングのプラットフォームへ依頼を送ります
   - **賢い承認** — 必要なら、補助の LLM がパターンに当てはまるだけの危険度の低いコマンドを自動で許可することもできます（例えば `rm -rf node_modules/` は「再帰的な削除」に当てはまりますが、実際には安全です）

4. **セッションごとの状態** — 承認はセッション単位で覚えられます。あるセッションで「再帰的な削除」を一度許可すれば、以後の `rm -rf` では改めて尋ねられません。

5. **恒久的な許可リスト** — 「以後ずっと許可する」を選ぶと、そのパターンが `config.yaml` の `command_allowlist` に書き込まれ、セッションをまたいで残ります。

## ターミナルと実行環境 {#terminalruntime-environments}

ターミナルのしくみは、複数の実行基盤に対応しています。

- local
- docker
- ssh
- singularity
- modal
- daytona
- vercel_sandbox

さらに、次のこともできます。

- 作業ディレクトリをタスクごとに上書きする
- バックグラウンドのプロセスを管理する
- PTY モードで動かす
- 危険なコマンドに対する承認のコールバックを使う

## 同時実行 {#concurrency}

ツールの呼び出しは、組み合わせと、やり取りが必要かどうかによって、順番に実行されることも同時に実行されることもあります。

## 関連ページ {#related-docs}

- [ツールセット早見表](/hermes/docs/reference/toolsets-reference/)
- [組み込みツール早見表](/hermes/docs/reference/tools-reference/)
- [エージェントループの内部](/hermes/docs/developer-guide/agent-loop/)
- [ACP の内部](/hermes/docs/developer-guide/acp-internals/)
