---
title: "コンテキストエンジンプラグイン"
description: "組み込みの ContextCompressor を置き換えるコンテキストエンジンプラグインの作り方"
upstream_path: developer-guide/context-engine-plugin.md
upstream_blob: 6609158e076554fcac8ef905554fc317baee0936
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/context-engine-plugin
---

# コンテキストエンジンプラグインを作る {#building-a-context-engine-plugin}

コンテキストエンジンプラグインは、会話コンテキストの管理方法を組み込みの `ContextCompressor` から別の方式へ差し替えます。たとえば、要約で情報を削り落とす代わりに知識の DAG を組み立てる Lossless Context Management（LCM）エンジンのようなものです。

## しくみ {#how-it-works}

エージェントのコンテキスト管理は `ContextEngine` という抽象基底クラス（`agent/context_engine.py`）の上に成り立っています。組み込みの `ContextCompressor` はその既定の実装です。プラグイン側のエンジンも同じインターフェースを実装する必要があります。

同時に動かせるコンテキストエンジンは **1 つだけ** です。どれを使うかは設定で決まります。

```yaml
# config.yaml
context:
  engine: "compressor"    # default built-in
  engine: "lcm"           # activates a plugin engine named "lcm"
```

プラグインのエンジンが **勝手に有効になることはありません** — 利用者が `context.engine` にそのプラグインの名前を明示的に設定して初めて動きます。

## ディレクトリ構成 {#directory-structure}

コンテキストエンジンはそれぞれ `plugins/context_engine/<name>/` に置きます。

```
plugins/context_engine/lcm/
├── __init__.py      # exports the ContextEngine subclass
├── plugin.yaml      # metadata (name, description, version)
└── ...              # any other modules your engine needs
```

## ContextEngine 抽象基底クラス {#the-contextengine-abc}

作成するエンジンは、次の **必須** メソッドを実装してください。

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

### エンジンが保持しつづける必要のあるクラス属性 {#class-attributes-your-engine-must-maintain}

エージェントは表示やログのために、次の値を直接読み取ります。

```python
last_prompt_tokens: int = 0
last_completion_tokens: int = 0
last_total_tokens: int = 0
threshold_tokens: int = 0        # when compression triggers
context_length: int = 0          # model's full context window
compression_count: int = 0       # how many times compress() has run
```

### 任意のメソッド {#optional-methods}

以下は抽象基底クラス側にひととおり妥当な既定の動きが用意してあります。必要に応じて上書きしてください。

| メソッド | 既定の動き | 上書きすべき場面 |
|--------|---------|--------------|
| `on_session_start(session_id, **kwargs)` | 何もしない | 保存しておいた状態（DAG、DB）を読み込みたいとき |
| `on_session_end(session_id, messages)` | 何もしない | 状態を書き出したり接続を閉じたりしたいとき |
| `on_session_reset()` | トークンのカウンタをリセットする | セッションごとの状態を消す必要があるとき |
| `update_model(model, context_length, ...)` | context_length としきい値を更新する | モデルを切り替えたときに予算を計算し直したいとき |
| `get_tool_schemas()` | `[]` を返す | エージェントから呼べるツール（`lcm_grep` など）を提供するとき |
| `handle_tool_call(name, args, **kwargs)` | エラーの JSON を返す | ツールの処理を自分で書くとき |
| `should_compress_preflight(messages)` | `False` を返す | API 呼び出し前に安く見積もれるとき |
| `get_status()` | 標準のトークン／しきい値の辞書 | 独自の指標を見せたいとき |
| `select_context(request_messages, *, conversation_messages, incoming_message, budget_tokens)` | `None` を返す（何もしない） | **今回の** リクエストにどのコンテキストを載せるかを選び分けるとき（検索、話題によるルーティング）— 後述 |
| `on_turn_complete(messages, usage=None, **kwargs)` | 何もしない | 終わったターンを取り込む・索引化する・観測するとき — 後述 |

## ターンごとのコンテキスト選択と観測 {#per-turn-context-selection-and-observation}

`compress()` が答えるのは「コンテキストが長すぎる → 短くする」という問いです。これとは直交する *選択／観測* の軸には、既定では何もしないフックが 2 つ用意してあります。おかげでエンジン側が `should_compress()` を無理やり `True` にして `compress()` をターンごとのコールバック代わりに酷使する必要はもうありません。

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

取り決めは次のとおりです。

- **既定では何もせず、失敗しても素通りします。** どちらも既定では `return None` を返します。フックが無い場合も、例外が飛んだ場合も、戻り値が不正だった場合も、リクエストには手が加わりません — つまりエンジンが壊れていても、入れなかった場合より悪くなることはありません。ホスト側は抽象基底クラスから継承した既定の実装かどうかを同一性で判定して丸ごと飛ばすので、実装していないエンジン（組み込みのコンプレッサを含む）はリクエストごとの処理を一切負担しません。
- **`select_context()` はリクエスト限りです。** 返したリストが置き換えるのは 1 回のプロバイダ呼び出し分のメッセージだけで、保存されている履歴が書き換わることはありません。`None`、`[]`、リスト以外、辞書でない要素を含むリストは、いずれも素通りして元のままのリクエストになります。
- **実行順序とキャッシュの安定性。** このフックはプロンプトのキャッシュ制御より **前**、そしてすべてのリクエストサニタイザより前に走ります。そのため (a) 差し替えたリストも通常のリクエストと同じ検証を通り、(b) 何もしない既定のままならリクエストはバイト単位で同一のままです — 実装していないエンジンのプロンプトキャッシュの挙動は変わりません。リストを差し替えるエンジンが変えるのは、自分のキャッシュ先頭部分だけです。評価はプロバイダへのリクエストごとに行われます（再試行のたびに走ります）。
- **`on_turn_complete()`** はターンが終わったあとの観測専用です。`messages` は読み取り専用として扱ってください。**取りこぼしはあり得ます。** このフックはターンを締めくくる標準の処理から呼ばれます。ループ内の異常系で早期に抜ける経路の一部（コンテンツポリシーによるブロック、プロバイダ側の致命的な失敗など）は、締めくくりの処理を通らずに保存して戻るため、現状このフックは発火しません。完了したターンについての最善努力の観測であって、あらゆる早期終了で必ず呼ばれるコールバックではない、と考えてください。すべての終端経路を 1 つの締めくくり処理にまとめるのは、別途の課題です。

### このフックを使う場面と、使わない場面 {#when-to-use-these-hooks-and-when-not-to}

- **`select_context()` を実装するのは、リクエストごとのコンテキストを *差し替える* 必要があるときだけにしてください** — 検索を併用した選択、話題やブランチによるルーティング、役割の切り替えなどです。リクエストに載せるメッセージを入れ替えられる操作はこれだけです。`pre_llm_call` プラグインフックのほうは、設計上あくまで追記専用です（プロンプトキャッシュの先頭部分を保つため、ユーザーメッセージに付け足すだけでリストを書き換えません）。差し替えが要らないなら、実装しないでください。
- **ターン後の観測・取り込みだけが目的なら**（索引化、記憶の同期、分析）、コンテキストエンジンではなく **メモリプロバイダ**（`sync_turn()` — [メモリプロバイダプラグイン](/hermes/docs/developer-guide/memory-provider-plugin/) を参照）として実装してください。コンテキストエンジンはそのセッションの圧縮方針そのものを引き受けます。メモリプロバイダは何も引き受けずにターンを眺めるだけです。`on_turn_complete()` は、*すでに* `select_context()` を必要としているエンジンのための観測側の対になるもので — 自分がルーティングしたターンから同じ部品が学べるように — 汎用のターンコールバックとして用意したものではありません。
- **本気で `select_context()` を実装したときのプロンプトキャッシュへの影響。** 何もしない実装でなければ、選択が変わったターンではプロンプトキャッシュの先頭部分も当然変わります。そのリクエストの先頭部分はプロバイダ側のキャッシュと一致しなくなるので、そのターンはキャッシュを読む代わりに書き直すことになります。エンジン側は **何も変わっていないときは同じ選択を返し**（同一のオブジェクト、あるいは等しいリスト）、ルーティングの判断が実際に変わったときだけコンテキストを組み直すべきです。ターンごとに中身が入れ替わる選択は、毎ターン黙ってキャッシュの再利用を捨てることになります。

## エンジンが提供するツール {#engine-tools}

コンテキストエンジンは、エージェントが直接呼び出せるツールを公開できます。`get_tool_schemas()` からスキーマを返し、`handle_tool_call()` で呼び出しを処理してください。

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

エンジンのツールは起動時にエージェントのツール一覧へ差し込まれ、自動的に振り分けられます。レジストリへの登録は要りません。

## 登録 {#registration}

### ディレクトリで登録する（おすすめ） {#via-directory-recommended}

エンジンを `plugins/context_engine/<name>/` に置きます。`__init__.py` は `ContextEngine` のサブクラスをエクスポートしてください。探索のしくみが自動で見つけてインスタンス化します。

### 汎用のプラグインのしくみで登録する {#via-general-plugin-system}

汎用のプラグインからコンテキストエンジンを登録することもできます。

```python
def register(ctx):
    engine = LCMEngine(context_length=200000)
    ctx.register_context_engine(engine)
```

登録できるエンジンは 1 つだけです。2 つ目のプラグインが登録しようとすると、警告とともに拒否されます。

## ライフサイクル {#lifecycle}

```
1. Engine instantiated (plugin load or directory discovery)
2. on_session_start() — conversation begins
3. update_from_response() — after each API call
4. should_compress() — checked each turn
5. compress() — called when should_compress() returns True
6. on_session_end() — session boundary (CLI exit, /reset, gateway expiry)
```

`on_session_reset()` は `/new` や `/reset` のときに呼ばれ、完全に終了させることなくセッションごとの状態を消します。

## 設定 {#configuration}

利用者は `hermes plugins` → Provider Plugins → Context Engine から、または `config.yaml` を編集してエンジンを選びます。

```yaml
context:
  engine: "lcm"   # must match your engine's name property
```

`compression` の設定ブロック（`compression.threshold`、`compression.protect_last_n` など）は組み込みの `ContextCompressor` に固有のものですが、1 つだけ明示的な例外があります。`compression.model_thresholds`（モデルごとのしきい値の上書き）はコンテキストエンジンの取り決めの一部です。ホストは解決済みのマップを、最初の `update_model()` 呼び出しの *前に* `engine.model_thresholds` へ代入し、基底クラスの `update_model()` がそれを適用します（最長の部分一致で探し、見つからなければエンジンに設定されたしきい値に戻ります）。`update_model()` を上書きしたエンジンは自分で圧縮方針を持つので、このマップを尊重してもしなくてもかまいません — 同じ解決処理を使い回したい場合は `from agent.context_compressor import resolve_model_threshold` としてください。それ以外については、必要なら独自の設定形式を決めて、初期化のときに `config.yaml` から読んでください。

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

抽象基底クラスの取り決めを検証するテスト一式は `tests/agent/test_context_engine.py` にあります。

## スレッド安全性 {#thread-safety}

`compression.context_timeout_seconds > 0` のとき（これが既定です）、Hermes は圧縮の処理全体 — エンジンの `compress()` と境界のコールバック、それにメモリプロバイダの `on_pre_compress` / `on_session_switch` を含みます — を、ホスト側でタイムアウトを見張りながらプールされたデーモンスレッド上で実行します。そのためエンジンは次を前提にしてください。

- 呼び出しはプール内のどのスレッドから来るか分かりません。スレッドの固定や、会話スレッドと共有する `threading.local` の状態に頼らないでください。
- 受け取るメッセージのリストは自分専用の深いコピーです。その場で書き換えるのは許されていますが（従来からの取り決め）、書き換えが見えるのは処理が確定したときだけです。ホスト側のタイムアウト後、まだ走っている作業の結果は捨てられます — 確定より前に外部や永続的な状態へ書き出さないでください。
- *別々の* セッションの処理が、プール内の兄弟スレッドで同時に走ることがあります。セッションをまたいで 1 つのエンジンやプロバイダのインスタンスを共有する場合は、スレッド安全にしてください。

## 関連ページ {#see-also}

- [コンテキストの圧縮とキャッシュ](/hermes/docs/developer-guide/context-compression-and-caching/) — 組み込みのコンプレッサのしくみ
- [メモリプロバイダプラグイン](/hermes/docs/developer-guide/memory-provider-plugin/) — 記憶について同じく 1 つだけ選ぶ形のプラグインのしくみ
- [プラグイン](/hermes/docs/user-guide/features/plugins/) — 汎用のプラグインのしくみの概要
