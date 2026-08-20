---
title: "エージェントループの内部構造"
description: "AIAgent の実行、API モード、ツール、コールバック、フォールバック動作の詳しい解説"
upstream_path: developer-guide/agent-loop.md
upstream_blob: 24cee51082df7aa4672aa674621fe72a31b05215
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/agent-loop
---

# エージェントループの内部構造 {#agent-loop-internals}

中核となる指揮役は `run_agent.py` の `AIAgent` クラスです。プロンプトの組み立てからツールの呼び出し、プロバイダの切り替えまでを一手に引き受ける大きなファイルです。

## 中心となる役割 {#core-responsibilities}

`AIAgent` が担うのは次のことです。

- `prompt_builder.py` を通して、実際に使うシステムプロンプトとツールのスキーマを組み立てる
- 正しいプロバイダと API モード（chat_completions、codex_responses、anthropic_messages）を選ぶ
- 途中で中断できる形でモデルを呼び出す
- ツール呼び出しを実行する（順番に、またはスレッドプールで同時に）
- 会話の履歴を OpenAI のメッセージ形式で保つ
- 圧縮、再試行、フォールバックモデルへの切り替えを扱う
- 親エージェントと子エージェントをまたいで反復回数の予算を数える
- コンテキストが失われる前に、永続メモリを書き出す

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

`chat()` は `run_conversation()` の薄い包み紙で、返ってきた辞書から `final_response` の値を取り出すだけのものです。

## API モード {#api-modes}

Hermes は 3 つの API 実行モードに対応していて、選ばれたプロバイダ、明示的な引数、ベース URL の見当から決まります。

| API モード | 使われる場面 | クライアントの種類 |
|----------|----------|-------------|
| `chat_completions` | OpenAI 互換のエンドポイント（OpenRouter、独自のもの、ほとんどのプロバイダ） | `openai.OpenAI` |
| `codex_responses` | OpenAI Codex / Responses API | Responses 形式の `openai.OpenAI` |
| `anthropic_messages` | Anthropic 純正の Messages API | アダプタ経由の `anthropic.Anthropic` |

このモードによって、メッセージの整形のしかた、ツール呼び出しの組み立て方、応答の読み取り方、キャッシュやストリーミングの効き方が変わります。3 つとも、API 呼び出しの前後では同じ内部形式（OpenAI 風の `role`/`content`/`tool_calls` の辞書）に合流します。

**モードが決まる順番:**
1. コンストラクタの `api_mode` 引数を明示した場合（いちばん強い）
2. プロバイダごとの判定（たとえば `anthropic` プロバイダなら `anthropic_messages`）
3. ベース URL からの見当（たとえば `api.anthropic.com` なら `anthropic_messages`）
4. 既定値: `chat_completions`

## 1 ターンの流れ {#turn-lifecycle}

エージェントループの各回は、次の順に進みます。

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

推論の内容（拡張思考に対応したモデルから返るもの）は `assistant_msg["reasoning"]` に入り、必要に応じて `reasoning_callback` を通して表示されます。

### 役割の交互出現のきまり {#message-alternation-rules}

エージェントループは、メッセージの役割が厳密に交互に並ぶことを求めます。

- システムメッセージのあとは `User → Assistant → User → Assistant → ...`
- ツール呼び出しの最中は `Assistant (with tool_calls) → Tool → Tool → ... → Assistant`
- assistant のメッセージが 2 つ続くことは **決してありません**
- user のメッセージが 2 つ続くことも **決してありません**
- 続けて並べられるのは `tool` の役割 **だけ** です（同時実行したツールの結果）

プロバイダ側もこの並びを検査していて、形の崩れた履歴は受け付けません。

## 中断できる API 呼び出し {#interruptible-api-calls}

API へのリクエストは `_interruptible_api_call()` で包まれます。実際の HTTP 呼び出しを裏のスレッドで走らせながら、中断のイベントを見張るしくみです。

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

中断されたとき（利用者が新しいメッセージを送った、`/stop` コマンドが実行された、シグナルが届いた）は、次のようになります。

- API 側のスレッドは切り離されます（応答は捨てられます）
- エージェントは新しい入力を処理するか、きれいに終了できます
- 途中まで届いた応答が会話履歴に混ざることはありません

## ツールの実行 {#tool-execution}

### 順番に実行するか、同時に実行するか {#sequential-vs-concurrent}

モデルがツール呼び出しを返したときの扱いです。

- **ツール呼び出しが 1 つ** → メインスレッドでそのまま実行します
- **ツール呼び出しが複数** → `ThreadPoolExecutor` で同時に実行します
  - 例外として、対話的だと印を付けられたツール（`clarify` など）は順番に実行されます
  - 結果は、終わった順にかかわらず、元のツール呼び出しの並び順に戻して差し込まれます

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

### エージェント側で処理されるツール {#agent-level-tools}

一部のツールは、`handle_function_call()` に届く *前に* `run_agent.py` が横取りします。

| ツール | 横取りされる理由 |
|------|--------------------|
| `todo` | エージェント内部のタスク状態を読み書きするため |
| `memory` | 文字数の上限付きで永続メモリのファイルに書き込むため |
| `session_search` | エージェントのセッション DB を使って過去の履歴を検索するため |
| `delegate_task` | コンテキストを分けた子エージェントを立ち上げるため |

これらのツールはエージェントの状態を直接書き換え、レジストリを通らずに合成した結果を返します。

## コールバックの口 {#callback-surfaces}

`AIAgent` は、CLI・ゲートウェイ・ACP それぞれで進み具合をその場で見せられるように、プラットフォームごとのコールバックを受け取れます。

| コールバック | 呼ばれる場面 | 使っているところ |
|----------|-----------|---------|
| `tool_progress_callback` | 各ツールの実行の前後 | CLI のスピナー、ゲートウェイの進捗メッセージ |
| `thinking_callback` | モデルが考え始めた/終えたとき | CLI の「thinking...」表示 |
| `reasoning_callback` | モデルが推論の内容を返したとき | CLI の推論表示、ゲートウェイの推論ブロック |
| `clarify_callback` | `clarify` ツールが呼ばれたとき | CLI の入力プロンプト、ゲートウェイの対話メッセージ |
| `step_callback` | エージェントの 1 ターンが終わるたび | ゲートウェイのステップ追跡、ACP の進捗 |
| `stream_delta_callback` | ストリーミングのトークンごと（有効時） | CLI のストリーミング表示 |
| `tool_gen_callback` | ストリームからツール呼び出しが読み取れたとき | CLI のスピナー内でのツール先読み表示 |
| `status_callback` | 状態が変わったとき（思考中、実行中など） | ACP の状態更新 |

## 予算とフォールバックの動き {#budget-and-fallback-behavior}

### 反復回数の予算 {#iteration-budget}

エージェントは `IterationBudget` で反復回数を数えます。

- 既定は 500 回（`agent.max_turns` で変えられます）
- エージェントごとに独立した予算を持ちます。子エージェントは `delegation.max_iterations`（既定 50）を上限とする独自の予算を持つので、親と子を合わせた総回数は親の上限を超えることがあります
- 100% に達すると、エージェントは処理を止め、それまでの作業のまとめを返します

### フォールバックモデル {#fallback-model}

主に使うモデルが失敗したとき（429 のレート制限、5xx のサーバーエラー、401/403 の認証エラー）の動きです。

1. 設定の `fallback_providers` の一覧を見る
2. 上から順に試す
3. 成功したら、そのプロバイダで会話を続ける
4. 401/403 のときは、切り替える前に資格情報の更新を試みる

このフォールバックのしくみは、補助的な処理にも別立てで働きます。画像認識、圧縮、Web からの本文抽出には、`auxiliary.*` の設定セクションでそれぞれ独立したフォールバックの連鎖を用意できます。

## 圧縮と保存 {#compression-and-persistence}

### 圧縮が起きる条件 {#when-compression-triggers}

- **事前圧縮**（API 呼び出しの前）: 会話がモデルのコンテキストウィンドウの 50% を超えたとき
- **ゲートウェイの自動圧縮**: 会話が 85% を超えたとき（より思い切った圧縮で、ターンとターンの間に走ります）

### 圧縮のときに起きること {#what-happens-during-compression}

1. まずメモリがディスクに書き出されます（取りこぼしを防ぐため）
2. 会話の中ほどのやりとりが、短いまとめに要約されます
3. 直近の N 件はそのまま残ります（`compression.protect_last_n`、既定は 20）
4. ツール呼び出しとその結果の組は、切り離されずにまとめて保たれます
5. 新しいセッション系統の ID が作られます（圧縮は「子」のセッションを生みます）

### セッションの保存 {#session-persistence}

各ターンのあとに行われることです。

- メッセージがセッションの保管先に保存されます（`hermes_state.py` を通した SQLite）
- メモリの変更が `MEMORY.md` / `USER.md` に書き出されます
- そのセッションは、あとから `/resume` や `hermes chat --resume` で再開できます

## 主なソースファイル {#key-source-files}

| ファイル | 役割 |
|------|---------|
| `run_agent.py` | AIAgent クラス — エージェントループの全体 |
| `agent/prompt_builder.py` | メモリ、スキル、コンテキストファイル、人格からシステムプロンプトを組み立てる |
| `agent/context_engine.py` | ContextEngine の抽象基底クラス — 差し替え可能なコンテキスト管理 |
| `agent/context_compressor.py` | 既定のエンジン — 情報を落としながら要約するアルゴリズム |
| `agent/prompt_caching.py` | Anthropic のプロンプトキャッシュの目印とキャッシュの計測 |
| `agent/auxiliary_client.py` | 補助的な処理（画像認識、要約）のための LLM クライアント |
| `model_tools.py` | ツールスキーマの収集と `handle_function_call()` による振り分け |

## 関連するドキュメント {#related-docs}

- [プロバイダのランタイム解決](/hermes/docs/developer-guide/provider-runtime/)
- [プロンプトの組み立て](/hermes/docs/developer-guide/prompt-assembly/)
- [コンテキスト圧縮とプロンプトキャッシュ](/hermes/docs/developer-guide/context-compression-and-caching/)
- [ツールのランタイム](/hermes/docs/developer-guide/tools-runtime/)
- [アーキテクチャの概観](/hermes/docs/developer-guide/architecture/)
