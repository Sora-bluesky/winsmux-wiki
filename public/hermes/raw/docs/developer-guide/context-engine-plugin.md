---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "コンテキストエンジンのプラグイン"
description: "組み込みの ContextCompressor を置き換えるコンテキストエンジンのプラグインを作る方法"
upstream_path: developer-guide/context-engine-plugin.md
upstream_blob: 8ffc9822a03425565e4e05c79999f75cb71aa68d
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

### メッセージの安定した識別子: `message_uid` {#stable-message-identity-messageuid}

ホストが保存したメッセージには、すべて `message_uid` が付いています。これは 16 進 32 桁の ID
（`uuid4().hex`）で、行が最初に挿入されたときに 1 回だけ発行され、`messages.message_uid` に保存されます。
エンジンがメッセージごとの独自の状態（原文のまま残すストア、要約の DAG、メッセージごとの埋め込みなど）を持っていて、
すでに見たメッセージを見分ける必要があるときは、この ID をキーに使ってください。物理的な行 ID
（`_row_id`）はそのキーにはなりません。コピーのたびに振り直されるうえ、
一部の復元経路でしか付いていないためです。

ホストが保証すること:

- **行ができたあとは、エンジンが触れるすべての場所に付いています。** 対象は、`compress()`
  に渡される入力リスト、`on_turn_complete()` の複製、`post_llm_call` の
  `conversation_history`、`on_session_end()` のメッセージ、そして復元されたすべての履歴
  （CLI、TUI、ACP、ゲートウェイ、圧縮での永続スナップショットの採用）です。`_row_id` と違い、
  常に復元されます。唯一の例外は、この列ができる前に書かれた行です。大きなストアでは、更新処理がそうした行の ID を
  その後の数回の起動にかけて発行するので、旧来の行が一時的に ID なしで届くことがあります。
  ID が無い場合はエラーではなく「まだ識別子が無い」と扱ってください。
- **同じ論理メッセージをホストがコピーしても、ID は引き継がれます。** 対象は、その場で行う圧縮の各世代とその並行する末尾の複製、
  ローテーションの子への引き継ぎのコピーと外部の末尾の複製、`replace_messages` による振り直し、
  巻き戻し、エクスポートとインポート、`/branch` やデスクトップアプリでの分岐のコピー（子
  セッションにコピーされた行は親の ID を保ちます）です。
- **同じ行の内容を書き換えても、ID は引き継がれます。** 対象は、保存時の上書き、
  サニタイザーによる行指定の書き換え、中断されたストリームの補完です。
  `(message_uid, content)` はそのメッセージの*版*として扱ってください。既知の ID のまま内容が変わったことを理由に、
  処理を失敗側に倒さないでください。
- **統合したときは、先頭の構成要素の ID を残し、残りを記録します。** ホストが保存済みのメッセージを別のメッセージへ
  畳み込むとき（交互の並びを直す処理でのユーザー同士・アシスタント同士の連続の統合、圧縮処理が
  進行中のタスクを要約の運び手に書き直すこと、本来のユーザーの起点を末尾の足場用のターンへ畳み込むこと、
  マイクロ圧縮での隣り合うユーザー発言の統合）、統合後のメッセージは、本文が先に来る構成要素の ID を保ち、
  ほかの ID を本文の順に `_absorbed_message_uids` へ記録します。このリストは
  残った行（`messages.absorbed_message_uids`）に保存され、行と一緒に復元されます。
  そのため再起動のあとでも、エンジンは `A\n\nB` が新しいメッセージではなく、ホストが `A` と `B` を畳み込んだものだと
  わかります。履歴の復元中に行った統合（`repair_alternation=True`）も、同じように
  その証拠を記録します。ホストが畳み込まずに捨てた行（最終的な回答に置き換えられた暫定の検証
  候補や、本文がマルチモーダルの内容と並んでいて決して結合されないアシスタントのターン）は記録されません。
  この証拠が指すのは、統合後のメッセージの中に残っている本文だけです。
- **エンジンが作った行は、エンジンが付けた ID を保ちます。** `compress()` の
  出力が要約の運び手（または出力する任意の行）にあらかじめ `message_uid` を付けていれば、
  ホストはその値をそのままコミットに書き込みます。その場で書き換える場合も
  ローテーションの場合も同じで、その後の復元やコピーでもその値が返ります。ID の無い行には
  挿入時に発行されます。したがって、エンジンは自分の行を ID で見分けられます。
- **1 つの ID が指すのは 1 つの論理メッセージであって、1 つの行ではありません。** メッセージのコピーは
  設計上同じ ID を共有します。また、編集や統合をしたメッセージを、まだ有効な以前の行の隣にもう一度追加する
  ホストの経路（復元したリストへの保存時の上書きや、統合後に残った行を新しい行として書き出す場合）では、
  同じ ID を持つ有効な行が 2 つ残ります。
  有効な行の集合の中で ID が行ごとに一意だとは決して仮定しないでください。自分の状態は
  ID をキーに持ち、後ろの行を現在の版として扱ってください。
- **ツール呼び出しにも、発生ごとの ID が付きます。** プロバイダーのツール呼び出し ID は重複します
  （Hermes は同じ呼び出しに決定的な `call_<12hex>` の ID を発行しますし、モデルも
  ID を使い回します）。そのため、アシスタントのメッセージには `_tool_call_uids`（その
  `{tool_call_id: uid}` の `tool_calls` に対する対応表）が付き、ツール結果のメッセージには
  対応する `_tool_call_uid` が付きます。1 つの応答の中でプロバイダーの ID が重複する呼び出しは、1 つの ID を共有します
  （すべての結果がその ID を持つので、どの呼び出しも応答なしには見えません）。畳み込みの結果、
  同じ ID を共有する 2 つのターンの呼び出しを 1 つのメッセージが持つことになった場合、その ID は、
  `tool_calls` の順に発生ごとに 1 つずつの ID を並べたリストに対応づけられます。
  プロバイダーに渡す `id`（
  `tool_calls` の中にあるもの）は変わりません。どちらの ID も、アシスタントの行が最初に
  挿入されたときに発行されます。結果の側には、結果が書き出されるとき（同じバッチなら同時に、結果が後の書き出しに
  回った場合は有効なリストから）と、復元時（直前のアシスタントの行から）に対になるように付けられ、
  保存され（`messages.tool_call_uids`、
  `messages.tool_call_uid`）、`message_uid` と同じコピーと書き換えの経路で
  引き継がれます。呼び出しが ID 付きで保存されなかった結果には、ID がありません。
- **通信には決して載りません。** `message_uid`、`_absorbed_message_uids`、
  `_tool_call_uids`、`_tool_call_uid` は
  `PERSISTENCE_ONLY_MESSAGE_FIELDS` に含まれています。プロバイダーへ送るすべてのコピーから取り除かれ、
  トークン数の見積もりでも無視されます。これらを読まないエンジンには
  影響しません。
- **ID が無いのは、行ができる前だけです。** 現在のターンのユーザーメッセージは、
  ターン開始時の書き出しより前に走る事前の `compress()` の間は ID を持ちません。
  同じ dict オブジェクトが、その書き出しのときに ID を受け取ります。古いスキーマから更新されたストアでは、
  既存のすべての行に ID が 1 回だけ後から付けられます（スキーマ v31）。
  また、その後に古いビルドが v31 のストアへ書き込んだ行には、挿入トリガーが ID を発行します
  （そのビルドが保持している実行中の dict には、復元されるまで ID がありません）。

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
