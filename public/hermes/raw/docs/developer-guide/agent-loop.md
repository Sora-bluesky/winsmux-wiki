---
title: "エージェントループの内部"
description: "AIAgent の実行、API モード、ツール、コールバック、フォールバックの挙動を詳しくたどる"
upstream_path: developer-guide/agent-loop.md
upstream_blob: a381ea2b9dc373352f39bbaa82187bc8ca1c4689
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/agent-loop
---

# エージェントループの内部 {#agent-loop-internals}

全体を取り仕切る中心のエンジンが `AIAgent` クラスです。`run_agent.py` は今では薄い窓口にすぎません。ループ本体は `agent/conversation_loop.py` に、ターンの各局面（反復の準備、API 呼び出し、API エラー、あふれ、切り詰め、復帰）は `agent/turn_*.py` に、コンストラクタの配線は `agent/agent_init.py` に置かれ、プロンプトの組み立てからツールの振り分け、プロバイダーの切り替えまでは、役割ごとに分けた `agent/*.py` のモジュールが `AIAgent` に混ぜ込まれる形で担っています。

## 中心となる役割 {#core-responsibilities}

`AIAgent` が受け持つのは次のとおりです。

- `prompt_builder.py` を通して、実際に使うシステムプロンプトとツールのスキーマを組み立てる
- 適切なプロバイダーと API モード（chat_completions、codex_responses、anthropic_messages）を選ぶ
- 途中で止められる形でモデルを呼び出す（キャンセルに対応する）
- ツール呼び出しを実行する（順番に、またはスレッドプールで同時に）
- 会話の履歴を OpenAI のメッセージ形式で保持する
- 圧縮、再試行、フォールバックのモデル切り替えを処理する
- 親エージェントと子エージェントをまたいで反復回数の残りを数える
- 文脈が失われる前に、永続化するメモリを書き出す

## 2 つの入口 {#two-entry-points}

```python
# Simple interface — returns final response string
response = agent.chat("Fix the bug in main.py")

# Full interface — returns dict with messages, metadata, usage stats
result = agent.run_conversation(
    user_message="Fix the bug in main.py",
    system_message=None,           # auto-built if omitted
    conversation_history=None,      # auto-loaded from session if omitted
    task_id="task_abc123"
)
```

`chat()` は `run_conversation()` を包んだだけの薄い関数で、返ってきた dict から `final_response` の項目を取り出します。

## API モード {#api-modes}

Hermes は 3 つの API 実行モードに対応しています。どれになるかは、選んだプロバイダー、明示的に渡した引数、ベース URL の見当から決まります。

| API モード | 使いどころ | クライアントの種類 |
|----------|----------|-------------|
| `chat_completions` | OpenAI 互換のエンドポイント（OpenRouter、独自のもの、たいていのプロバイダー） | `openai.OpenAI` |
| `codex_responses` | OpenAI Codex / Responses API | Responses 形式の `openai.OpenAI` |
| `anthropic_messages` | Anthropic 純正の Messages API | アダプター経由の `anthropic.Anthropic` |

このモードによって、メッセージの整え方、ツール呼び出しの組み立て方、応答の読み取り方、キャッシュとストリーミングの動き方が変わります。3 つとも、API 呼び出しの前後では同じ内部のメッセージ形式（OpenAI 風の `role` / `content` / `tool_calls` の dict）に揃えられます。

**モードが決まる順番:**
1. コンストラクタに明示的に渡した `api_mode` 引数（最優先）
2. プロバイダーごとの判定（例: `anthropic` プロバイダーなら `anthropic_messages`）
3. ベース URL からの見当（例: `api.anthropic.com` なら `anthropic_messages`）
4. 既定値: `chat_completions`

## ターンの一生 {#turn-lifecycle}

エージェントループの 1 周は、次の順番で進みます。

```text
run_conversation()
  1. Generate task_id if not provided
  2. Append user message to conversation history
  3. Build or reuse cached system prompt (prompt_builder.py)
  4. Check if preflight compression is needed (>50% context)
  5. Build API messages from conversation history
     - chat_completions: OpenAI format as-is
     - codex_responses: convert to Responses API input items
     - anthropic_messages: convert via anthropic_adapter.py
  6. Inject ephemeral prompt layers (budget warnings, context pressure)
  7. Apply prompt caching markers if on Anthropic
  8. Make interruptible API call (_interruptible_api_call)
  9. Parse response:
     - If tool_calls: execute them, append results, loop back to step 5
     - If text response: persist session, flush memory if needed, return
```

### メッセージの形式 {#message-format}

内部では、すべてのメッセージが OpenAI 互換の形式で扱われます。

```python
{"role": "system", "content": "..."}
{"role": "user", "content": "..."}
{"role": "assistant", "content": "...", "tool_calls": [...]}
{"role": "tool", "tool_call_id": "...", "content": "..."}
```

思考を長く伸ばせるモデルから返ってくる推論の内容は `assistant_msg["reasoning"]` に入り、必要に応じて `reasoning_callback` を通して画面に出せます。

### 役割が交互に並ぶ決まり {#message-alternation-rules}

エージェントループは、メッセージの役割が交互に並ぶことを厳しく守らせます。

- システムメッセージのあとは `User → Assistant → User → Assistant → ...` の順
- ツール呼び出しの最中は `Assistant (with tool_calls) → Tool → Tool → ... → Assistant`
- assistant のメッセージが 2 つ続くことは**ありません**
- user のメッセージが 2 つ続くことは**ありません**
- 続けて並べられるのは `tool` の役割**だけ**です（同時に走らせたツールの結果）

プロバイダー側もこの並びを検査していて、形の崩れた履歴は受け付けません。

## 途中で止められる API 呼び出し {#interruptible-api-calls}

API へのリクエストは `_interruptible_api_call()` に包まれています。実際の HTTP 呼び出しは裏のスレッドで走り、その間、中断のイベントが来ていないかを見張ります。

```text
┌────────────────────────────────────────────────────┐
│  Main thread                  API thread           │
│                                                    │
│   wait on:                     HTTP POST           │
│    - response ready     ───▶   to provider         │
│    - interrupt event                               │
│    - timeout                                       │
└────────────────────────────────────────────────────┘
```

中断がかかったとき（ユーザーが新しいメッセージを送った、`/stop` コマンドを打った、シグナルが来た）は次のようになります。

- API のスレッドは打ち切られます（返ってきた応答は捨てられます）
- エージェントは新しい入力を処理するか、きれいに終了できます
- 途中まで返ってきた応答が会話の履歴に紛れ込むことはありません

## ツールの実行 {#tool-execution}

### 順番に実行するか、同時に実行するか {#sequential-vs-concurrent}

モデルからツール呼び出しが返ってきたときは、こうなります。

- **ツール呼び出しが 1 つ** → メインのスレッドでそのまま実行します
- **ツール呼び出しが複数** → `ThreadPoolExecutor` で同時に実行します
  - 例外: 対話が必要と印を付けたツール（`clarify` など）は、順番の実行に切り替わります
  - 終わった順番にかかわらず、結果は元のツール呼び出しの並び順に戻して差し込まれます

### 実行の流れ {#execution-flow}

```text
for each tool_call in response.tool_calls:
    1. Resolve handler from tools/registry.py
    2. Fire pre_tool_call plugin hook
    3. Check if dangerous command (tools/approval.py)
       - If dangerous: invoke approval_callback, wait for user
    4. Execute handler with args + task_id
    5. Fire post_tool_call plugin hook
    6. Append {"role": "tool", "content": result} to history
```

### エージェント側で処理するツール {#agent-level-tools}

一部のツールは、`handle_function_call()` に届く*前に* `agent/tool_executor.py`（`agent/conversation_loop.py` から呼ばれます）が横取りします。

| ツール | 横取りする理由 |
|------|--------------------|
| `todo` | エージェントの手元にあるタスクの状態を読み書きするため |
| `memory` | 文字数の上限を守りながら、永続化するメモリのファイルに書き込むため |
| `session_search` | エージェントのセッション DB を通してセッションの履歴を調べるため |
| `delegate_task` | 文脈を切り離したサブエージェントを立ち上げるため |

これらのツールはエージェントの状態を直接書き換え、レジストリを通らずに作り物のツール結果を返します。

## コールバックの接点 {#callback-surfaces}

`AIAgent` はプラットフォームごとのコールバックに対応していて、CLI・ゲートウェイ・ACP 連携で進み具合をその場で見せられます。

| コールバック | 呼ばれるとき | 使っているところ |
|----------|-----------|---------|
| `tool_progress_callback` | 各ツールの実行の前後 | CLI のスピナー、ゲートウェイの進捗メッセージ |
| `thinking_callback` | モデルが考え始めたとき・終えたとき | CLI の「thinking...」表示 |
| `reasoning_callback` | モデルが推論の内容を返したとき | CLI の推論表示、ゲートウェイの推論ブロック |
| `clarify_callback` | `clarify` ツールが呼ばれたとき | CLI の入力待ち、ゲートウェイの対話メッセージ |
| `step_callback` | エージェントのターンが 1 つ終わるたび | ゲートウェイのステップ追跡、ACP の進捗 |
| `stream_delta_callback` | ストリーミングのトークンごと（有効なとき） | CLI のストリーミング表示 |
| `tool_gen_callback` | ストリームからツール呼び出しを読み取れたとき | CLI のスピナーに出るツールの先出し表示 |
| `status_callback` | 状態が変わったとき（考え中、実行中など） | ACP の状態更新 |

## 反復の上限とフォールバックの挙動 {#budget-and-fallback-behavior}

### 反復回数の上限 {#iteration-budget}

エージェントは `IterationBudget` で反復回数を数えています。

- 既定値: 500 回（`agent.max_turns` で変えられます）
- エージェントごとに別々の上限を持ちます。サブエージェントは `delegation.max_iterations`（既定値 50）で頭打ちになる独自の上限を持つので、親とサブエージェントを合わせた合計は親の上限を超えることがあります
- 100% に達すると、エージェントは止まり、そこまでにやった作業のまとめを返します

### フォールバックのモデル {#fallback-model}

主のモデルが失敗したとき（429 のレート制限、5xx のサーバーエラー、401/403 の認証エラー）は、こう動きます。

1. 設定の `fallback_providers` の一覧を見る
2. 上から順に試す
3. うまくいったら、新しいプロバイダーのまま会話を続ける
4. 401/403 のときは、切り替える前に資格情報の更新を試す

フォールバックの仕組みは、脇で走る処理にも別立てで効きます。画像の解析、圧縮、Web からの本文抽出は、それぞれ独自の切り替え順を持っていて、設定の `auxiliary.*` の節で決められます。

## 圧縮と保存 {#compression-and-persistence}

### 圧縮が始まる条件 {#when-compression-triggers}

- **事前チェック**（API 呼び出しの前）: 会話がモデルのコンテキストウィンドウの 50% を超えたとき
- **ゲートウェイの自動圧縮**: 会話が 85% を超えたとき（より強めで、ターンとターンの間に走ります）

### 圧縮のあいだに起きること {#what-happens-during-compression}

1. まずメモリをディスクに書き出します（消えてしまうのを防ぐため）
2. 会話の中ほどのやり取りを、短いまとめに置き換えます
3. 直近の N 件のメッセージはそのまま残します（`compression.protect_last_n`、既定値: 20）
4. ツール呼び出しとその結果は対にしたまま残します（切り離しません）
5. セッションの系統を表す新しい ID を作ります（圧縮すると「子」のセッションが生まれます）

### セッションの保存 {#session-persistence}

各ターンのあとに、次のことが起きます。

- メッセージがセッションの保管場所に保存されます（`hermes_state.py` を通した SQLite）
- メモリの変更が `MEMORY.md` と `USER.md` に書き出されます
- そのセッションは、あとから `/resume` や `hermes chat --resume` で再開できます

## 主なソースファイル {#key-source-files}

| ファイル | 役割 |
|------|---------|
| `run_agent.py` | `AIAgent` の窓口。公開されている入口だけを持ち、ループとターンの各局面は `agent/` にある |
| `agent/conversation_loop.py` | エージェントループ本体（`run_conversation()` の中身） |
| `agent/turn_*.py` | ターンの各局面: iteration_prep、api_call、api_error、overflow、truncation、recovery |
| `agent/tool_executor.py` | ツール呼び出しの実行と、エージェント側で処理するツールの横取り |
| `agent/prompt_builder.py` | メモリ、スキル、コンテキストファイル、人格からシステムプロンプトを組み立てる |
| `agent/context_engine.py` | ContextEngine の抽象基底クラス。文脈の管理を差し替えられる |
| `agent/context_compressor.py` | 既定のエンジン。情報を削りながらまとめる方式 |
| `agent/prompt_caching.py` | Anthropic のプロンプトキャッシュの印付けと、キャッシュの計測値 |
| `agent/auxiliary_client.py` | 脇の処理（画像の解析、要約）に使う補助の LLM クライアント |
| `model_tools.py` | ツールスキーマの収集と、`handle_function_call()` による振り分け |

## 関連するドキュメント {#related-docs}

- [プロバイダーの実行時の解決](/hermes/docs/developer-guide/provider-runtime/)
- [プロンプトの組み立て](/hermes/docs/developer-guide/prompt-assembly/)
- [文脈の圧縮とプロンプトキャッシュ](/hermes/docs/developer-guide/context-compression-and-caching/)
- [ツールの実行環境](/hermes/docs/developer-guide/tools-runtime/)
- [アーキテクチャの全体像](/hermes/docs/developer-guide/architecture/)
