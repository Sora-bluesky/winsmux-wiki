---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "コンテキストエンジンのプラグイン"
description: "組み込みの ContextCompressor を置き換えるコンテキストエンジンのプラグインを作る方法"
upstream_path: developer-guide/context-engine-plugin.md
upstream_blob: d124ce46d9b22e7f08167a8f4c021ca82d2be307
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/context-engine-plugin
---

# コンテキストエンジンのプラグインを作る {#building-a-context-engine-plugin}

コンテキストエンジンのプラグインは、組み込みの `ContextCompressor` を、会話のコンテキストを管理する別の方式に差し替えます。たとえば、情報を削る要約の代わりに知識の DAG を組み立てる Lossless Context Management（LCM）エンジンのようなものです。

## 仕組み {#how-it-works}

エージェントのコンテキスト管理は `ContextEngine` という ABC（`agent/context_engine.py`）の上に成り立っています。組み込みの `ContextCompressor` が既定の実装です。プラグインのエンジンも、同じインターフェースを実装する必要があります。

同時に動かせるコンテキストエンジンは**1 つ**だけです。どれを使うかは設定で決まります。

```yaml
# config.yaml
context:
  engine: "compressor"    # default built-in
  engine: "lcm"           # activates a plugin engine named "lcm"
```

プラグインのエンジンが**自動で有効になることはありません**。利用者が `context.engine` にそのプラグインの名前を明示的に設定する必要があります。

## ディレクトリ構成 {#directory-structure}

各コンテキストエンジンは `plugins/context_engine/<name>/` に置きます。

```
plugins/context_engine/lcm/
├── __init__.py      # exports the ContextEngine subclass
├── plugin.yaml      # metadata (name, description, version)
└── ...              # any other modules your engine needs
```

## ContextEngine の ABC {#the-contextengine-abc}

エンジンは次の**必須**メソッドを実装してください。

```python
from agent.context_engine import ContextEngine

class LCMEngine(ContextEngine):

    @property
    def name(self) -> str:
        """Short identifier, e.g. 'lcm'. Must match config.yaml value."""
        return "lcm"

    def update_from_response(self, usage: dict) -> None:
        """Called after every LLM call with the usage dict.

        Update self.last_prompt_tokens, self.last_completion_tokens,
        self.last_total_tokens from the response.
        """

    def should_compress(self, prompt_tokens: int = None) -> bool:
        """Return True if compaction should fire this turn."""

    def compress(self, messages: list, current_tokens: int = None,
                 focus_topic: str = None) -> list:
        """Compact the message list and return a new (possibly shorter) list.

        The returned list must be a valid OpenAI-format message sequence.

        ``focus_topic`` is an optional topic string from manual
        ``/compress <focus>``; engines that support guided compression should
        prioritise preserving information related to it, others may ignore it.
        """
```

### エンジンが保持しておくべきクラス属性 {#class-attributes-your-engine-must-maintain}

エージェントは表示とログのために、これらを直接読み取ります。

```python
last_prompt_tokens: int = 0
last_completion_tokens: int = 0
last_total_tokens: int = 0
threshold_tokens: int = 0        # when compression triggers
context_length: int = 0          # model's full context window
compression_count: int = 0       # how many times compress() has run
```

### 任意のメソッド {#optional-methods}

これらには ABC 側に無難な既定の実装があります。必要に応じて上書きしてください。

| メソッド | 既定の動作 | 上書きする場面 |
|--------|---------|--------------|
| `on_session_start(session_id, **kwargs)` | 何もしない | 保存した状態（DAG や DB）を読み込みたいとき |
| `on_session_end(session_id, messages)` | 何もしない | 状態を書き出したり、接続を閉じたりしたいとき |
| `on_session_reset()` | トークンのカウンターをリセットする | セッションごとの状態を消したいとき |
| `update_model(model, context_length, ...)` | context_length と閾値を更新する | モデルを切り替えたときに割り当てを計算し直したいとき |
| `get_tool_schemas()` | `[]` を返す | エージェントが呼べるツール（たとえば `lcm_grep`）をエンジンが提供するとき |
| `handle_tool_call(name, args, **kwargs)` | エラーの JSON を返す | ツールの処理を自分で実装するとき |
| `should_compress_preflight(messages)` | `False` を返す | API を呼ぶ前に軽く見積もれるとき |
| `get_status()` | トークンと閾値の標準的な辞書 | 独自の指標を見せたいとき |
| `select_context(request_messages, *, conversation_messages, incoming_message, budget_tokens)` | `None` を返す（何もしない） | **この**リクエストにどのコンテキストを入れるかを選んだり振り分けたりするとき（検索、話題の振り分け）。詳しくは後述します |
| `on_turn_complete(messages, usage=None, **kwargs)` | 何もしない | 終わったターンを取り込んだり、索引を作ったり、観測したりするとき。詳しくは後述します |
| `clone_for_agent()` | `copy.deepcopy(self)` | コピーできない状態（ロック、SQLite や DB の接続）をエンジンが持っているとき。[一般のプラグインの仕組みから登録する](#via-general-plugin-system)を参照してください |

## ターンごとのコンテキスト選択と観測 {#per-turn-context-selection-and-observation}

`compress()` が答えるのは「コンテキストが長すぎる → 短くする」という問いです。これとは別の軸である*選択と観測*には、既定では何もしない任意のフックが 2 つ用意されています。おかげでエンジンは、`should_compress()` を無理やり `True` にして `compress()` をターンごとのコールバック代わりに使う、といったことをせずに済みます。

```python
def select_context(self, request_messages, *, conversation_messages=None,
                   incoming_message=None, budget_tokens=0):
    """Choose/replace the context for THIS request, before dispatch.

    Return a new message list to use for this one provider call (retrieval,
    topic routing, role/branch switching), or None to leave it unchanged.
    Request-only: the persisted conversation history is never mutated.
    """

def on_turn_complete(self, messages, usage=None, **kwargs):
    """Observe a finished turn after the assistant/tool loop completes.

    Receives a shallow copy of the finalized transcript plus the turn's
    canonical usage dict (or None if no provider response was reached), so the
    engine can ingest/index/summarize for the next select_context(). The return
    value is ignored.
    """
```

契約は次のとおりです。

- **既定では何もせず、失敗しても素通しします。** どちらも既定では `return None` です。フックが無い場合も、例外が出た場合も、返り値が不正な場合も、リクエストはそのまま通ります。つまり、うまく動かないエンジンでも、入れていない状態より悪くなることはありません。ホスト側は ABC から継承した既定の実装かどうかを同一性で判定して丸ごと飛ばすので、実装していないエンジン（組み込みのコンプレッサーを含む）にはリクエストごとの負荷がまったくかかりません。
- **`select_context()` はそのリクエストだけに効きます。** 返したリストは、プロバイダーへの 1 回の呼び出しに使うメッセージを置き換えるだけで、保存される履歴には書き込みません。`None`、`[]`、リスト以外、辞書以外を含むリストのいずれを返しても、リクエストは変更されないまま通ります。
- **順序とキャッシュの安定性。** このフックは、プロンプトのキャッシュ制御とすべてのリクエストのサニタイザーよりも**前**に走ります。そのため (a) 差し替えたリストも通常のリクエストと同じ検証を通り、(b) 何もしない既定のままならリクエストはバイト単位で同じに保たれます。つまり、実装していないエンジンではプロンプトキャッシュの挙動が変わりません。リストを差し替えるエンジンが変えるのは、自分のキャッシュの前方部分だけです。判定はプロバイダーへのリクエストごとに行われます（再試行のたびに走り直します）。
- **`on_turn_complete()`** はターンのあとの観測専用です。`messages` は読み取り専用として扱ってください。**取りこぼしはあり得ます。** このフックはターンを締めくくる標準の場所から発火します。ループの中には、異常時に早く抜ける経路（コンテンツポリシーによる遮断や、プロバイダー側の致命的な失敗など）があり、そうした経路は締めくくりを通らずに保存して戻るため、現状ではこのフックを出しません。すべての早期終了で必ず呼ばれるコールバックではなく、完了したターンについての最善努力の観測だと考えてください。終了経路をすべて 1 か所の締めくくりに集約するのは、別途取り組む課題です。

### このフックを使う場面と、使わない場面 {#when-to-use-these-hooks-and-when-not-to}

- **`select_context()` を実装するのは、リクエストごとのコンテキストを*差し替える*必要があるときだけにしてください。** 検索を使った選択、話題や分岐の振り分け、役割の切り替えなどです。リクエストに入るメッセージそのものを入れ替えられるのは、この操作だけです。プラグインの `pre_llm_call` フックは、設計上あくまで追加専用です（プロンプトキャッシュの前方部分を保つため、ユーザーメッセージに追記するだけで、リストを書き換えません）。差し替えが要らないなら、実装しないでください。
- **ターンのあとの観測や取り込みだけが目的なら**（索引づくり、メモリの同期、分析など）、コンテキストエンジンではなく**メモリプロバイダー**（`sync_turn()`。[メモリプロバイダーのプラグイン](/hermes/docs/developer-guide/memory-provider-plugin/)を参照）を実装してください。コンテキストエンジンは、そのセッションの圧縮方針そのものを引き受けます。一方のメモリプロバイダーは、何も引き受けずにターンを見ているだけです。`on_turn_complete()` は、*すでに* `select_context()` を必要としているエンジンのための観測側の対になるもので、同じ部品が直前に振り分けたターンから学べるようにするためにあります。汎用のターンコールバックではありません。
- **実際に動く `select_context()` がプロンプトキャッシュに与える影響。** 何かしら選び直す実装にすると、選択が変わったターンではプロンプトキャッシュの前方部分も当然変わります。そのリクエストの前方部分はプロバイダー側のキャッシュと一致しなくなるので、そうしたターンはキャッシュを読む代わりに書き直すことになります。エンジンは、**何も変わっていないときには同じ選択を返す**ようにして（同じオブジェクト、または等価なリスト）、振り分けの判断が実際に変わったときだけコンテキストを組み替えてください。ターンごとに中身が入れ替わる選択は、毎ターン黙ってキャッシュの再利用を捨てることになります。

## エンジンのツール {#engine-tools}

コンテキストエンジンは、エージェントが直接呼べるツールを公開できます。`get_tool_schemas()` でスキーマを返し、`handle_tool_call()` で呼び出しを処理してください。

```python
def get_tool_schemas(self):
    return [{
        "name": "lcm_grep",
        "description": "Search the context knowledge graph",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query"}
            },
            "required": ["query"],
        },
    }]

def handle_tool_call(self, name, args, **kwargs):
    if name == "lcm_grep":
        results = self._search_dag(args["query"])
        return json.dumps({"results": results})
    return json.dumps({"error": f"Unknown tool: {name}"})
```

エンジンのツールは起動時にエージェントのツール一覧へ差し込まれ、自動で振り分けられます。レジストリへの登録は不要です。

## 登録のしかた {#registration}

### ディレクトリで登録する（推奨） {#via-directory-recommended}

エンジンを `plugins/context_engine/<name>/`（同梱のもの）か `~/.hermes/plugins/<name>/`（利用者が入れたもの。`$HERMES_HOME/plugins/<name>/`）に置きます。`__init__.py` は `ContextEngine` のサブクラスを公開するか、`ctx.register_context_engine(...)` を呼ぶ `register(ctx)` を公開してください。有効化にあたるのは `context.engine: <name>` を設定することで、利用者が入れたエンジンに `plugins.enabled` の項目は要りません。名前がぶつかった場合は同梱のものが優先されます。

### 一般のプラグインの仕組みから登録する {#via-general-plugin-system}

一般のプラグインからコンテキストエンジンを登録することもできます。

```python
def register(ctx):
    engine = LCMEngine(context_length=200000)
    ctx.register_context_engine(engine)
```

登録できるエンジンは 1 つだけです。2 つめのプラグインが登録しようとすると、警告を出して拒否されます。

登録されたインスタンスはプロセス全体で共有されますが、`AIAgent`（親、サブエージェント、ゲートウェイの各セッション）はそれぞれ自分のエンジンを持つ必要があります。子の `update_model()` が親の割り当てを書き換えてしまわないようにするためです。そこで Hermes は、エージェントを初期化するたびに、登録されたインスタンスの `engine.clone_for_agent()` を呼びます。既定は `copy.deepcopy(self)` です。ロックや SQLite・HTTP の接続のように深いコピーができない状態をエンジンが持っている場合は、これを上書きして、永続的なバックエンドは共有しつつ、書き換わる割り当てのフィールドだけをコピーした新しいエンジンを返してください。複製が例外を投げた場合、エージェントは組み込みのコンプレッサーに戻り、`Context engine 'X' could not be safely copied for this agent` とログに出します。

```python
def clone_for_agent(self):
    clone = LCMEngine(db_path=self.db_path)  # reopens its own connection
    clone.threshold_percent = self.threshold_percent
    return clone
```

## ライフサイクル {#lifecycle}

```
1. Engine instantiated (plugin load or directory discovery)
2. on_session_start() — conversation begins
3. update_from_response() — after each API call
4. should_compress() — checked each turn
5. compress() — called when should_compress() returns True
6. on_session_end() — session boundary (CLI exit, /reset, gateway shutdown)
```

`on_session_reset()` は `/new` や `/reset` のときに呼ばれ、全体を落とさずにセッションごとの状態を消します。

## 設定 {#configuration}

利用者は `hermes plugins` → Provider Plugins → Context Engine から、あるいは `config.yaml` を編集して、作ったエンジンを選びます。

```yaml
context:
  engine: "lcm"   # must match your engine's name property
```

`compression` の設定ブロック（`compression.threshold`、`compression.protect_last_n` など）は組み込みの `ContextCompressor` 専用ですが、1 つだけ明示的な例外があります。`compression.model_thresholds`（モデルごとの閾値の上書き）は、コンテキストエンジンの契約の一部です。ホストは解決済みのマップを、最初の `update_model()` を呼ぶ*前*に `engine.model_thresholds` へ代入し、基底クラスの `update_model()` がそれを適用します（いちばん長く一致する部分文字列を採用し、見つからなければエンジンに設定された閾値に戻ります）。`update_model()` を上書きするエンジンは自分で圧縮の方針を持つので、このマップに従っても無視してもかまいません。同じ解決処理を再利用したい場合は `from agent.context_compressor import resolve_model_threshold` としてください。それ以外については、必要ならエンジン側で独自の設定形式を決めて、初期化のときに `config.yaml` から読んでください。

## テスト {#testing}

```python
from agent.context_engine import ContextEngine

def test_engine_satisfies_abc():
    engine = YourEngine(context_length=200000)
    assert isinstance(engine, ContextEngine)
    assert engine.name == "your-name"

def test_compress_returns_valid_messages():
    engine = YourEngine(context_length=200000)
    msgs = [{"role": "user", "content": "hello"}]
    result = engine.compress(msgs)
    assert isinstance(result, list)
    assert all("role" in m for m in result)
```

ABC の契約を確かめるテスト一式は `tests/agent/test_context_engine.py` にあります。

## スレッドの安全性 {#thread-safety}

`compression.context_timeout_seconds > 0` のとき（これが既定です）、Hermes は圧縮の処理全体を、ホスト側でタイムアウトを見ながらプールのデーモンスレッドで走らせます。ここにはエンジンの `compress()` と区切りのコールバック、それにメモリプロバイダーの `on_pre_compress` や `on_session_switch` も含まれます。したがってエンジン側は次を前提にしてください。

- 呼び出しはプールのどのスレッドから来るかわかりません。スレッドが固定されていることや、会話のスレッドと共有される `threading.local` の状態に頼らないでください。
- 受け取るメッセージのリストは、そのとき専用に深くコピーされたものです。その場で書き換えても構いませんが（従来からの契約です）、書き換えが見えるのは処理が確定したときだけです。ホスト側でタイムアウトすると、まだ走っている作業は捨てられます。確定の外側で、外部の永続的な状態へ書き出さないでください。
- *別の*セッションに対する処理が、プールの別スレッドで同時に走ることがあります。複数のセッションで 1 つのエンジンやプロバイダーのインスタンスを共有する場合は、スレッドセーフにしてください。

## 関連ページ {#see-also}

- [コンテキストの圧縮とキャッシュ](/hermes/docs/developer-guide/context-compression-and-caching/) — 組み込みのコンプレッサーの仕組み
- [メモリプロバイダーのプラグイン](/hermes/docs/developer-guide/memory-provider-plugin/) — メモリ向けの、1 つだけ選ぶ同じ形のプラグインの仕組み
- [プラグイン](/hermes/docs/user-guide/features/plugins/) — プラグインの仕組み全体の概要
