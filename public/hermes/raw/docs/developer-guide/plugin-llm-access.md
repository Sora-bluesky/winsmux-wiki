---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "プラグインからの LLM 呼び出し"
description: "ctx.llm を使うと、プラグインの中からどんな LLM 呼び出しもできます。チャットでも構造化出力でも、同期でも非同期でも同じです。認証はホストが持ち、信頼ゲートは既定で閉じ、JSON Schema による検証も選べます。"
upstream_path: developer-guide/plugin-llm-access.md
upstream_blob: a619c06ae25e17c6d0b0f1cb93fd9e3ea8e6c4db
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/plugin-llm-access
---

# プラグインからの LLM 呼び出し {#plugin-llm-access}

プラグインが LLM を呼ぶときは、`ctx.llm` を使うのが正式なやり方です。
チャット補完でも、構造化された抽出でも、同期でも非同期でも、画像があってもなくても、
同じ入り口・同じ信頼ゲート・同じホスト管理の資格情報で動きます。

プラグインがこれを使うのは、モデルの力は借りたいけれど、
エージェントとの会話そのものには乗せたくない場面です。たとえば、ツールのエラーを
エンジニア以外にも読める文章に書き直すフック。受け取ったメッセージを
キューに積む前に翻訳するゲートウェイのアダプター。長い貼り付けテキストを
要約するスラッシュコマンド。昨日の活動を採点して状況ボードに一行だけ書く
定期ジョブ。そもそもエージェントを起こす価値があるメッセージなのかを
判定する前段のフィルター。

どれもエージェントを巻き込むまでもない仕事です。LLM を一回呼んで、
型の付いた答えをもらって、それで終わりにしたい、というものです。

## いちばん短い呼び出し {#the-smallest-possible-call}

```python
result = ctx.llm.complete(messages=[{"role": "user", "content": "ping"}])
return result.text
```

これで API のすべてが一行に収まっています。鍵の設定も、プロバイダーの設定も、
SDK の初期化も要りません。プラグインは、そのときユーザーが使っているプロバイダーと
モデルに対してそのまま動きます。ユーザーがプロバイダーを切り替えれば、
プラグインも自動でついていきます。

## もう少し実用的なチャットの例 {#a-more-complete-chat-example}

```python
result = ctx.llm.complete(
    messages=[
        {"role": "system", "content": "Rewrite errors as one short sentence a non-engineer can act on."},
        {"role": "user",   "content": traceback_text},
    ],
    max_tokens=64,
    purpose="hooks.error-rewrite",
)
return result.text
```

`purpose` は自由に書ける監査用の文字列です。`agent.log` と `result.audit` に
現れるので、どのプラグインがどの呼び出しをしたのかを運用側が追えます。
省略できますが、頻繁に走るものには付けておくことをすすめます。

## 構造化された出力 {#structured-output}

型の付いた答えがほしいときは、構造化のほうに切り替えます。

```python
result = ctx.llm.complete_structured(
    instructions="Score this support reply for urgency (0–1) and pick a category.",
    input=[{"type": "text", "text": message_body}],
    json_schema=TRIAGE_SCHEMA,
    purpose="support.triage",
    temperature=0.0,
    max_tokens=128,
)

if result.parsed["urgency"] > 0.8:
    await dispatch_to_oncall(result.parsed["category"], message_body)
```

ホストはプロバイダーに JSON 出力を要求し、うまくいかないときの備えとして
手元でも解析し、`jsonschema` が入っていればスキーマと突き合わせて検証し、
Python のオブジェクトを `result.parsed` に入れて返します。モデルが正しい JSON を
作れなかったときは `result.parsed` が `None` になり、`result.text` に生の応答が入ります。

## この入り口で得られるもの {#what-this-lane-gives-you}

* **一つの呼び出しに四つの形。** チャットなら `complete()`、型付きの JSON なら
  `complete_structured()`、asyncio なら `acomplete()` と
  `acomplete_structured()`。引数も結果のオブジェクトも同じです。
* **資格情報はホストが持つ。** OAuth のトークン、更新の流れ、資格情報のプール、
  タスクごとの補助的な上書きまで、Hermes が持っている資格情報のしくみが
  そのまま効きます。プラグインがトークンを見ることはありません。ホストは
  `result.audit` を通して、その呼び出しが誰のものかを記録します。
* **範囲が決まっている。** 同期か非同期の呼び出しが一回きり。ストリーミングも、
  ツールのループも、管理すべき会話の状態もありません。入力を渡し、結果を受け取り、
  返す。それだけです。
* **信頼は既定で閉じている。** 設定したことのないプラグインは、プロバイダーも
  モデルもエージェントも保存済みの資格情報も、自分では選べません。既定の姿勢は
  「ユーザーが使っているものを使う」です。運用側が `config.yaml` で
  プラグインごとに、特定の上書きだけを許可します。

## すぐに試す {#quick-start}

下に完全なプラグインを二つ載せます。ひとつはチャット、もうひとつは構造化です。
どちらも `register(ctx)` 関数ひとつに収まっていて、外部の設定をまったくしなくても、
ユーザーが有効にしているモデルに対して動きます。

### チャット補完 — `/tldr` {#chat-completion-tldr}

```python
def register(ctx):
    ctx.register_command(
        name="tldr",
        handler=lambda raw: _tldr(ctx, raw),
        description="Summarise the supplied text in one paragraph.",
        args_hint="<text>",
    )

def _tldr(ctx, raw_args: str) -> str:
    text = raw_args.strip()
    if not text:
        return "Usage: /tldr <text to summarise>"
    result = ctx.llm.complete(
        messages=[
            {"role": "system",
             "content": "Summarise the user's text in one tight paragraph. No preamble."},
            {"role": "user", "content": text},
        ],
        max_tokens=256,
        temperature=0.3,
        purpose="tldr",
    )
    return result.text
```

`result.text` がモデルの応答です。`result.usage` にトークン数が入り、
`result.provider` と `result.model` に、どこの何を使ったかが入ります。

### 構造化された抽出 — `/paste-to-tasks` {#structured-extraction-paste-to-tasks}

```python
def register(ctx):
    ctx.register_command(
        name="paste-to-tasks",
        handler=lambda raw: _paste_to_tasks(ctx, raw),
        description="Turn freeform meeting notes into structured tasks.",
        args_hint="<text>",
    )

_TASKS_SCHEMA = {
    "type": "object",
    "properties": {
        "tasks": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "owner":  {"type": "string"},
                    "action": {"type": "string"},
                    "due":    {"type": "string", "description": "ISO date or empty"},
                },
                "required": ["action"],
            },
        },
    },
    "required": ["tasks"],
}

def _paste_to_tasks(ctx, raw_args: str) -> str:
    if not raw_args.strip():
        return "Usage: /paste-to-tasks <meeting notes>"
    result = ctx.llm.complete_structured(
        instructions=(
            "Extract concrete action items from these meeting notes. "
            "One task per actionable line. If no owner is named, leave 'owner' blank."
        ),
        input=[{"type": "text", "text": raw_args}],
        json_schema=_TASKS_SCHEMA,
        schema_name="meeting.tasks",
        purpose="paste-to-tasks",
        temperature=0.0,
        max_tokens=512,
    )
    if result.parsed is None:
        return f"Couldn't parse a response. Raw output:\n{result.text}"
    lines = [f"- [{t.get('owner') or '?'}] {t['action']}" for t in result.parsed["tasks"]]
    return "\n".join(lines) or "(no tasks found)"
```

三つめの実例は画像を入力に使うもので、
[`hermes-example-plugins`](https://github.com/NousResearch/hermes-example-plugins/tree/main/plugin-llm-example)
リポジトリにあります（参考用プラグインをまとめた別リポジトリで、
hermes-agent 本体には同梱されていません）。非同期のほう（`acomplete()` /
`acomplete_structured()` と `asyncio.gather()` の組み合わせ）は、
同じリポジトリの
[`plugin-llm-async-example`](https://github.com/NousResearch/hermes-example-plugins/tree/main/plugin-llm-async-example)
を見てください。

## どれを使うか {#when-to-use-which}

| やりたいこと | 使うもの |
|---|---|
| 自由な文章の応答（翻訳、要約、書き直し、生成） | `complete()` |
| 何往復かのプロンプト（システム + 例示 + ユーザー） | `complete()` |
| スキーマで検証された、型の付いた辞書を受け取る | `complete_structured()` |
| 画像かテキストを入れて、型の付いた辞書を受け取る | `complete_structured()` |
| 同じ呼び出しを非同期のコードから（ゲートウェイのアダプター、非同期のフック） | `acomplete()` / `acomplete_structured()` |

これ以外のこと — プロバイダーの選択、モデルの解決、認証、代替への切り替え、
タイムアウト、画像の振り分け — は、四つとも同じです。

## API の一覧 {#api-surface}

`ctx.llm` は `agent.plugin_llm.PluginLlm` のインスタンスです。

### `complete()` {#complete}

```python
result = ctx.llm.complete(
    messages=[{"role": "user", "content": "Hi"}],
    provider=None,         # optional, gated — Hermes provider id (e.g. "openrouter")
    model=None,            # optional, gated — whatever string that provider expects
    temperature=None,
    max_tokens=None,
    timeout=None,          # seconds
    agent_id=None,         # optional, gated
    profile=None,          # optional, gated — explicit auth-profile name
    purpose="optional-audit-string",
    task=None,             # optional — a plugin-registered auxiliary slot
)
# → PluginLlmCompleteResult(text, provider, model, agent_id, usage, audit)
```

素のチャット補完です。`messages` は OpenAI と同じ形、つまり
`{"role": "...", "content": "..."}` という辞書のリストです。何往復かのプロンプト
（システム + ユーザーとアシスタントの例示 + 最後のユーザー発話）も、
OpenAI の SDK とまったく同じように書けます。

`provider=` と `model=` は互いに独立していて、ホスト本体の設定
（`model.provider` と `model.model`）と同じ形です。`model=` だけを指定すれば、
ユーザーが有効にしているプロバイダーのまま、別のモデルを使えます。両方を指定すれば
プロバイダーごと切り替わります。運用側の許可がないまま、どちらかの引数を渡すと
`PluginLlmTrustError` が出ます。

### `complete_structured()` {#completestructured}

```python
result = ctx.llm.complete_structured(
    instructions="What you want extracted.",
    input=[
        {"type": "text",  "text": "..."},
        {"type": "image", "data": b"...", "mime_type": "image/png"},
        {"type": "image", "url":  "https://..."},
    ],
    json_schema={...},     # optional — triggers parsed result + validation
    json_mode=False,       # set True without a schema to ask for JSON anyway
    schema_name=None,      # optional human-readable schema name
    system_prompt=None,
    provider=None,         # optional, gated
    model=None,            # optional, gated
    temperature=None,
    max_tokens=None,
    timeout=None,
    agent_id=None,
    profile=None,
    purpose=None,
    task=None,             # optional — a plugin-registered auxiliary slot
)
# → PluginLlmStructuredResult(text, provider, model, agent_id,
#                             usage, parsed, content_type, audit)
```

入力は、型の付いたテキストか画像のかたまりです（生のバイト列は自動で base64 に直され、
`data:` の URL になります）。`json_schema` を渡すか `json_mode=True` にすると、
ホストは `response_format` を使ってプロバイダーに JSON 出力を求め、
うまくいかないときの備えとして手元でも解析し、`jsonschema` が入っていれば
スキーマと突き合わせて検証します。

* `result.content_type == "json"` のとき — `result.parsed` は、スキーマに合った
  Python のオブジェクトです。
* `result.content_type == "text"` のとき — 解析か検証に失敗しています。
  `result.text` で、モデルの生の応答を確かめてください。

### 非同期 {#async}

```python
result = await ctx.llm.acomplete(messages=..., task="classifier")
result = await ctx.llm.acomplete_structured(
    instructions=..., input=..., task="classifier"
)
```

引数も結果の型も、同期版とまったく同じです。ゲートウェイのアダプター、
非同期のフック、そのほか asyncio のループの上で動いているプラグインのコードから
使ってください。

### タスクで振り分ける補助的な呼び出し {#task-routed-auxiliary-calls}

プラグインが自分専用の補助的な経路を持ちたいときは、四つの呼び出しのどれにでも
`task=` を渡します。そのタスクはプラグインの初期設定のときに登録します。
運用側が `auxiliary.<task>` でプロバイダーとモデルを上書きするまでは、
プラグイン側の既定値が使われます。

```python
def register(ctx):
    ctx.register_auxiliary_task(
        "classifier", display_name="Classifier", description="Classify input."
    )

result = ctx.llm.complete(messages=[...], task="classifier")
result = ctx.llm.complete_structured(instructions=..., input=..., task="classifier")
```

```yaml
auxiliary:
  classifier:
    provider: openrouter
    model: vendor/model-id
```

プラグインは、自分が持つタスクについてプロバイダーとモデルの既定値を登録できます。
`auxiliary.<task>` にある運用側の設定はその既定値より優先され、実際に何を使うかを決めます。
登録したタスクは、モデルを割り当てるすべての画面で、組み込みのタスクと同じ扱いの枠になります。
`hermes model` →
*Configure auxiliary models* の選択画面、ダッシュボードの Models ページ、デスクトップアプリの
Settings → Models → Auxiliary のどれにも（組み込みのタスクのあとに、プラグインの `display_name` で）
並び、組み込みのものと同じように固定・リセットしたり、古くなったプロバイダーの固定として印を付けたりできます。
プラグインが使えるのは自分で登録したタスクだけで、知らない名前や他人のタスク名は、
プロバイダーを呼ぶ前の段階で失敗します。`allow_task_override: true` は、Hermes に
もともとある補助タスクを使わせるための、運用側からの明示的な許可です。これで
他のプラグインのタスクが使えるようになるわけではありません。`task=` を省く
（または `"auto"` にする）と、有効になっている本体のプロバイダーとモデルのままになります。

#### プラグインのフロントエンドから使う: プラグインの RPC メソッド {#from-the-plugins-frontend-a-plugin-rpc-method}

プラグインのフロントエンド（デスクトップアプリのページや、共有のゲートウェイにつながったクライアント）は、
自分ではモデルを呼びません。同じプラグインの Python 側を
[プラグインの RPC メソッド](/hermes/docs/developer-guide/plugins/#talk-to-your-own-frontend-plugin-rpc-methods-and-session-events)を通して呼び、
そのハンドラーが、プラグインの登録したタスクで `ctx.llm` を呼びます。プラグインの
RPC 呼び出しは、ハンドラーが戻るまで、そのクライアントからのリクエストの列を止めたままにします。そのためハンドラーは、
モデルの呼び出しをスレッドで始めてすぐにジョブの id を返し、
結果はセッションのイベントとして届けます。

```python
import contextvars
import threading
import uuid

from agent.redact import redact_sensitive_text

CHART = {"type": "object", "properties": {"kind": {"type": "string"}}, "required": ["kind"]}

def register(ctx):
    ctx.register_auxiliary_task("chart_writer", display_name="Charts", description="Pick chart kinds.")
    slots = threading.BoundedSemaphore(4)  # model calls in flight

    def write_chart(params, *, session_id, **kwargs):
        if not session_id:
            raise ValueError("chart.write needs a session_id")
        job = uuid.uuid4().hex
        text = redact_sensitive_text(str(params.get("text", "")), force=True)

        def run():
            try:
                result = ctx.llm.complete_structured(
                    instructions="Pick a chart kind for this data.",
                    input=[{"type": "text", "text": text}],
                    json_schema=CHART,
                    task="chart_writer",
                )
                if result.parsed is None:
                    raise ValueError("the model did not answer with JSON")
                payload = {"job": job, "chart": result.parsed}
            except Exception as exc:
                payload = {"job": job, "error": str(exc)}
            finally:
                slots.release()
            ctx.emit_to_session(session_id, "chart.written", payload)

        if not slots.acquire(blocking=False):
            raise RuntimeError("chart.write is busy: wait for a chart.written event")
        try:
            # copy_context: the thread keeps the call's profile scope, which ctx.llm reads.
            threading.Thread(target=contextvars.copy_context().run, args=(run,), daemon=True).start()
        except Exception:
            slots.release()  # run() never started, so it never releases
            raise
        return {"job": job}

    ctx.register_rpc("chart.write", write_chart)
```

フロントエンドは
`{"method": "plugin.<plugin_id>.chart.write", "params": {"session_id": "…", "text": "…"}}` を送ると、
すぐに `{"job": "…"}` を受け取り、そのあとチャート（または `error`）を、
同じ `job` を持つセッションのイベント `plugin.<plugin_id>.chart.written` として受け取ります。
モデルの呼び出しをハンドラーの中でそのまま行うと、モデルが答えるまで、そのクライアントが同じ接続で送る次のリクエストが、
中断や承認の返事も含めて止まってしまいます。セマフォは `llm.oneshot` にあった呼び出し元ごとの上限の代わりで、
四つが実行中のときに来た五つめの呼び出しは拒否されます。ハンドラーそのものの中で例外が起きると、
その呼び出しには理由 `plugin_rpc_failed` が返ります。

- **境界で伏せ字にする。** `agent.redact.redact_sensitive_text` は
  [公開プラグイン API](/hermes/docs/developer-guide/plugins/public-api/) の一部です。モデルに送るテキストのように、
  秘密の情報が決して端末の外に出てはいけない場所では `force=True` を渡してください。そうすると、
  運用側が `security.redact_secrets: false` で伏せ字処理を切っていても、秘密の情報を隠します。
  `force=True` を付けなければ、その設定に従います。
- **タスクが経路を決める。** `task=` には自分のプラグインが登録したタスクを指定する必要があります。
  そのため、モデルを選ぶのは運用側の `auxiliary.<task>` の設定で、
  フロントエンドが別の経路を選ぶことはできません。
- **`parsed` を確かめる。** 返答が JSON でないとき、これは `None` になります。
  `json_schema` に合わない返答は、任意の `jsonschema` パッケージが入っていれば `ValueError` を出します。
  入っていなければ、スキーマとの照合は行われません。

#### 組み込みの枠を引き継ぐ {#inheriting-a-built-in-slot}

`inherit_from` には、モデルの選択画面に並ぶ組み込みの補助タスク
（`compression`、`mcp`、`vision`、`curator` など）、`background_review`、あるいは
自分のプラグイン（またはそれより先に読み込まれたプラグイン）がすでに登録したタスクの名前を書きます。
それ以外のコアの `auxiliary.*` の設定は、引き継ぎ元になりません。すると、運用側が自分のタスクに
直接モデルを固定するまで、そのタスクは引き継ぎ元の枠のモデルを使います。

**組み込みの枠のモデルに従うには、運用側の許可が要ります。** 枠の経路
（`provider`、`model`、`base_url`、`api_key`、`api_mode`、キーを入れる環境変数、
`reasoning_effort`、`extra_body`、`fallback_chain`）が引き継がれるのは、運用側が
あなたのプラグインに `allow_task_override` を設定したときだけです。これは、`task=` で
組み込みの枠を指定できるようにするのと同じ許可です。許可がなければ、タスクは枠の
それ以外の設定（`timeout` など）だけを引き継ぎ、自分の経路で動きます。つまり、プラグインの
`defaults`、それがなければ有効になっている本体のモデルです。タスクをユーザーの見直し用や
curator 用のモデルに従わせたいときは、セットアップの手順にこの設定を書いておいてください。

```yaml
plugins:
  entries:
    my-plugin:
      llm:
        allow_task_override: true
```

```python
def register(ctx):
    ctx.register_auxiliary_task(
        "classifier",
        display_name="Classifier",
        description="Classify input.",
        inherit_from="compression",         # use whatever compression uses...
        defaults={"timeout": 90},           # ...but give slow classifiers more room
    )
```

- **登録時に写し取るのではなく、読むたびに解決します。** CLI・ダッシュボード・デスクトップアプリ・`config.yaml` のどこかで
  `auxiliary.compression` を変えると、classifier も次の呼び出しから、プロファイルごとにそれに従います。
- **優先順位:** 引き継ぎ元が土台になり、その上にプラグインの `defaults`、さらにその上に
  運用側の `auxiliary.<task>` の設定が重なります。
- **引き継ぎの連鎖は、その根元として扱われます。** 組み込みの枠を引き継いでいる別のプラグインのタスクを
  引き継いだ場合、その枠の経路が引き継がれるのは、自分のプラグインにも許可があるときだけです。
- **運用側の固定は、経路まるごとで優先されます。** `auxiliary.classifier` で
  `auto` 以外のプロバイダー、モデル、`base_url` のどれかを設定すると、プロバイダー・モデル・接続先・
  キー・推論の強さはすべてその設定から取られ、引き継ぎ元の経路の値が混ざることはありません。
  `provider: auto` でモデルが空のときは「指定なし」の扱いなので、タスクは引き続き引き継ぎ元に従います
  （「Reset all」やデスクトップアプリの *Follow &lt;base&gt;* ボタンが書き込むのはこの形です）。
- **引き継ぎ元がおかしくても、プラグインは壊れません。** 存在しない名前や自分自身を指す
  `inherit_from` は警告をログに残し、そのタスクは引き継ぎなしで登録されます。

Models の設定画面では、固定されていない引き継ぎタスクが
*inherits Compression · &lt;provider · model&gt;* のように表示されます。また
`GET /api/model/auxiliary` は、そうした行について `inherit_from` と、実際に使われる値を示す `effective`
`{provider, model, base_url}` を返します。

### 結果の属性 {#result-attributes}

```python
@dataclass
class PluginLlmCompleteResult:
    text: str                    # the assistant's response
    provider: str                # e.g. "openrouter", "anthropic"
    model: str                   # whatever the provider returned for this call
    agent_id: str                # whose model/auth was used
    usage: PluginLlmUsage        # tokens + cache + cost estimate
    audit: Dict[str, Any]        # plugin_id, purpose, profile

@dataclass
class PluginLlmStructuredResult:
    # same fields as PluginLlmCompleteResult, plus:
    parsed: Optional[Any]        # JSON object when content_type == "json"
    content_type: str            # "json" or "text"
    # audit also carries schema_name when supplied
```

`usage` には、プロバイダーが返してくれる場合に限り、`input_tokens`、`output_tokens`、
`total_tokens`、`cache_read_tokens`、`cache_write_tokens`、`cost_usd` が入ります。

## 信頼ゲート {#trust-gate}

既定の動きは、閉じたまま失敗する側です。`plugins.entries` の設定を何も書かない場合、
プラグインにできるのは次のことです。

* ユーザーが有効にしているプロバイダーとモデルに対して、四つのメソッドのどれかを
  実行する
* 要求の形を決める引数（`temperature`、`max_tokens`、`timeout`、`system_prompt`、
  `purpose`、`messages`、`instructions`、`input`、`json_schema`）を指定する

…以上です。`provider=`、`model=`、`agent_id=`、`profile=` の各引数は、運用側が
許可するまで `PluginLlmTrustError` を出します。同じように、`task=` に使えるのは
そのプラグインが登録した補助タスクだけで、もとからある補助タスクを使うには
運用側が `allow_task_override` を与える必要があります。

**ほとんどのプラグインは、この節を読む必要がありません。** 上書きを何もせずに
`ctx.llm.complete(messages=...)` を呼ぶだけのプラグインは、ユーザーが有効にしている
ものに対して動き、設定なしで使えます。下の設定が関わってくるのは、プラグインが
どうしてもユーザーとは違うモデルやプロバイダーに固定したいときだけです。

```yaml
plugins:
  entries:
    my-plugin:
      llm:
        # Allow this plugin to choose a different Hermes provider
        # (must be one Hermes already knows about — same names as
        # `hermes model` and config.yaml model.provider).
        allow_provider_override: true

        # Optionally restrict which providers. Use ["*"] for any.
        allowed_providers:
          - openrouter
          - anthropic

        # Allow this plugin to ask for a specific model.
        allow_model_override: true

        # Optionally restrict which models. Use ["*"] for any.
        # Models are matched literally against whatever string the
        # plugin sends — Hermes does not look anything up.
        allowed_models:
          - openai/gpt-4o-mini
          - anthropic/claude-3-5-haiku

        # Allow cross-agent calls (rare).
        allow_agent_id_override: false

        # Allow the plugin to request a specific stored auth profile
        # (e.g. a different OAuth account on the same provider).
        allow_profile_override: false
```

プラグインの id は、単層のプラグインならマニフェストの `name:` の値、
入れ子のプラグインならパスから作られるキー（`image_gen/openai`、
`memory/honcho` など）です。

### ゲートが止めるもの {#what-the-gate-enforces}

| 上書き        | 既定 | 設定のキー                       |
| --------------- | ------- | -------------------------------- |
| `provider=`     | 不許可  | `allow_provider_override: true`  |
| ↳ 許可する一覧     | —       | `allowed_providers: [...]`       |
| `model=`        | 不許可  | `allow_model_override: true`     |
| ↳ 許可する一覧     | —       | `allowed_models: [...]`          |
| `agent_id=`     | 不許可  | `allow_agent_id_override: true`  |
| `profile=`      | 不許可  | `allow_profile_override: true`   |
| もとからある `task=` | 不許可  | `allow_task_override: true`      |
| 組み込みの枠から引き継いだ経路 | 除外 | `allow_task_override: true` |

上書きは、それぞれ独立して許可されます。`allow_model_override` を与えても
`allow_provider_override` を与えたことには**なりません**。モデルを選ぶことを
任せたプラグインでも、プロバイダー側の許可を別に与えないかぎり、ユーザーが
有効にしているプロバイダーに固定されたままです。

### ゲートが止めなくてよいもの {#what-the-gate-does-not-need-to-enforce}

* 要求の形を決める引数 — `temperature`、`max_tokens`、`timeout`、`system_prompt`、
  `purpose`、`messages`、`instructions`、`input`、`json_schema`、`schema_name`、
  `json_mode` — は、いつでも使えます。資格情報も経路も選ばないからです。
* 既定で拒む姿勢をとっていても、設定していないプラグインは役に立つ仕事ができます。
  ただ、有効になっているプロバイダーとモデルに対して動くだけのことです。運用側が
  `plugins.entries` を考える必要があるのは、経路を細かく決めたいプラグインだけです。

## ホストが受け持つもの {#what-the-host-owns}

`ctx.llm` がプラグインの代わりにやってくれることを、まとめて挙げます。

* **プロバイダーの解決。** ユーザーの設定から `model.provider` と `model.model` を
  読みます（許可されている場合は、明示された上書きを読みます）。
* **認証。** `~/.hermes/auth.json` や環境変数から、API キー、OAuth のトークン、
  更新用のトークンを取り出します。資格情報のプールを設定していれば、それも含みます。
  プラグインがそれらを見ることはありません。
* **画像の振り分け。** 画像が入力に含まれていて、ユーザーが有効にしているテキストの
  モデルが画像を扱えないとき、ホストは設定してある画像用のモデルに自動で切り替えます。
* **代替への切り替え。** ユーザーの主なプロバイダーが 5xx や 429 を返したときは、
  エラーをプラグインに返す前に、Hermes がいつも使っている、集約先を踏まえた
  切り替えの仕組みを通ります。
* **タイムアウト。** 渡された `timeout=` を尊重し、なければ
  `auxiliary.<task>.timeout` の設定、それもなければ全体の既定値を使います。
* **JSON の形づくり。** JSON を求めたときはプロバイダーに `response_format` を送り、
  返ってきたものがコードブロックで囲まれていれば、手元で解析し直します。
* **スキーマの検証。** `jsonschema` が入っていれば `json_schema` と突き合わせて検証し、
  入っていなければデバッグ用の一行を記録して、厳密な検証は飛ばします。
* **監査の記録。** 呼び出しごとに、プラグインの id、プロバイダーとモデル、目的、
  トークンの合計を、`agent.log` に INFO の一行として書きます。

## プラグインが受け持つもの {#what-the-plugin-owns}

* **要求の形。** チャットなら `messages`、構造化なら `instructions` と `input` です。
  プロンプトを組み立てるのはプラグインで、それを実行するのがホストです。
* **スキーマ。** どんな形で返してほしいかは自分で決めます。ホストが推測することはありません。
* **エラーへの対処。** `complete_structured()` は、入力が空のときと、スキーマの検証に
  失敗したときに `ValueError` を出します。信頼ゲートが上書きを拒んだときは
  `PluginLlmTrustError` が出ます。それ以外（プロバイダーの 5xx、資格情報が
  設定されていない、タイムアウト）は、`auxiliary_client.call_llm()` が出すものが
  そのまま出ます。
* **費用。** どの呼び出しも、ユーザーが料金を払っているプロバイダーに対して走ります。
  ゲートウェイのメッセージひとつひとつに `complete()` をループで回すときは、
  トークンの消費をよく考えてください。

## セッション自身のエージェントに聞く（`ctx.side_question`） {#asking-the-sessions-own-agent-ctxsidequestion}

`ctx.llm` は、プラグインが渡した内容しか知らない新しい呼び出しを実行します。
これに対して `ctx.side_question` は、セッション*自身*のエージェントに聞きます。
同じモデル、同じシステムプロンプト（メモリも含む）、ここまでの会話すべてに、
プラグインからの質問をひとつ足して送ります。そのターンで送ったばかりのリクエストを
そのまま使い直すので、プロバイダーのプロンプトキャッシュはまだ温まっていて、
呼び出しの大半はキャッシュの読み出しで済みます。

答えが会話そのものに左右されるときに使ってください。たとえば、ユーザーが次に打ちそうな
プロンプトを提案する、そのターンで何をしたかにラベルを付ける、セッションに
続きの対応が要るかを判断する、といった用途です。セッションの中身が要らないものには
`ctx.llm` を使ってください。そのほうが安く、リースの規則もありません。

```python
import threading

def register(ctx):
    def on_post_llm_call(**kwargs):
        token = kwargs.get("side_question_token")
        if token is None:  # no consented plugin loaded, or not a user turn
            return
        # post_llm_call is time-bounded: never wait for the model inside the hook.
        threading.Thread(target=_suggest, args=(token,), daemon=True).start()

    def _suggest(token):
        answer = ctx.side_question(
            token, "Suggest the user's most likely next prompt in one short line.")
        if answer:
            ctx.state.set("next_prompt", answer)

    ctx.register_hook("post_llm_call", on_post_llm_call)
```

プラグインは `plugin.yaml` でこの機能を宣言し、ユーザーがそれを許可する必要があります
（同意画面には「各ターンのあとで、エージェントに短い質問をします。エージェントには
メモリを含むセッション全体が見え、メインモデルのトークンを使います。」と表示されます）。

```yaml
capabilities:
  - llm.side_question
```

### リースの規則 {#lease-rules}

* 読み込まれているプラグインのうち少なくともひとつがこの機能を持っていると、
  `post_llm_call` は `side_question_token`（文字列）を受け取ります。そうでなければ `None` です。
  cron の実行と、委任されたサブエージェントのターンには、常に `None` が渡ります。
  誰もその結果を待っていないので、追加の質問はトークンを使うだけになるからです。
* **1ターンに1回だけで、全プラグインで共有します。** どのプラグインのフックにも同じ
  トークンが渡り、最初の `ctx.side_question` の呼び出しが、成功しても失敗しても
  それを使い切ります。この機能を持たないプラグインが呼ぶと `None` が返り、
  トークンは使われません。
* トークンは **60 秒** で失効します。セッションが次のターンを始めた時点でも失効します。
* トークンは、それを発行したターンのプロファイルに属します。別のプロファイルの
  プラグインコンテキストが呼ぶと `None` が返り、トークンは使われません。
* `prompt` は空でない文字列で、長さは **4096 文字** までです。
* `timeout` の既定は **15 秒** で、上限は 60 秒です。リクエストの準備も含めた、
  呼び出し全体にかかる時間です。

### 返ってくるもの {#what-you-get-back}

エージェントの返答のテキストか、`None` です。`None` は、呼び出しが拒否されたか
失敗したことを表します。たとえば、Mixture-of-Agents のランタイム、エージェントを
プロバイダーとして使うランタイム（ACP、外部プロセスのプロバイダー、Codex の app-server）、
そのターンのあとでモデルが変わったセッション（
`auxiliary.voice_chat` に回された音声チャットのターンは、その直後に元へ戻ります）、
プロバイダー側で実行される（サーバー側の）ツールを含むリクエスト、タイムアウト、
プロバイダーのエラー、空の返答がそうです。再試行はなく、
代わりのモデルもありません。

この呼び出しはツールを一切実行せず（返答の中のツール呼び出しは捨てられます）、
会話記録にも書き込みません。トークンは、そのトークンを発行したターンのセッションに
課金され（その後にセッション ID が切り替わっていても同じです）、使用量には
`plugin_side_question:<plugin id>` として記録されます。
`/btw` の `side_question` とは別に数えられます。モデル、ツール、
システムプロンプト、出力の長さは選べません。どれを変えても、温まったキャッシュが
使えなくなるからです。短く答えてほしいときは、プロンプトでそう頼んでください。

観測用のプラグインからは、この呼び出しは補助呼び出しとして見えます。
`pre_auxiliary_call` / `post_auxiliary_call` が、
`aux_task="plugin_side_question"` と、質問したプラグインを指す `plugin_id` を付けて
発火します。ターン単位の `pre_api_request` /
`post_api_request` は、この呼び出しでは発火しません。

## セッション自身のエージェントを分岐させる（`ctx.fork_session`） {#forking-the-sessions-own-agent-ctxforksession}

:::caution 実験的な機能
`ctx.fork_session` と [`ctx.register_idle_task`](#idle-tasks-ctxregister_idle_task) は
実験的な機能です。シグネチャや分岐のハンドルの形は、今後のリリースで変わることがあります。ハンドルは、
プレーンなデータを返す、プラグイン内の小さな関数ひとつの中に閉じ込め、ターンを越えて保存しないでください。
`fork_session` は、使えなくても困らないものとして扱ってください。要求が拒否されたとき
（`llm.session_fork` の許可がない、トークンが不正・失効済み・使用済み、許可一覧にないツールを指定した）は `None` を返しますし、
どこでも使えるわけではありません。`plugins.isolation: host` のもとでは、サードパーティのプラグインの
`ctx.fork_session` は存在しても `PluginHostUnsupported`（`RuntimeError` の一種）を出します。ハンドルが
Hermes のプロセス内で動いている実際のセッションのエージェントのスレッドを追うためです。`None` や例外を受けたときに
「分岐なし」として動き続けるプラグインなら、どちらの環境でも動きます。
:::

`ctx.side_question` が受け取るのは、テキストの返答ひとつです。これに対して `ctx.fork_session` は、
セッションのエージェントのコピーを、範囲を限って裏で走らせます。コピーは同じシステムプロンプト、
`tools[]`、メモリ、会話を持ち、温まったプロンプトキャッシュの上で何段階かのプロンプトをこなします。
その途中で、プラグインが名前を挙げた自身のツールを呼ぶこともできます。Hermes が自分のメモリやスキルを
裏で見直すときのやり方を、プラグインにも開いたものです。典型的な使い方は、スキルを作ったり編集したりした
ターンのあとで、そのスキルが共有する価値のあるものかを分岐に尋ね、共有を提案するプラグイン自身のツールを
呼ばせる、というものです。

```python
import json
import threading

def register(ctx):
    def offer_share(args, turn_origin=None, **kwargs):
        if turn_origin != "plugin_fork:wisdom":
            return json.dumps({"error": "only the background check may offer a share"})
        ...  # present the approval card for args["skill"]
        return json.dumps({"offered": True})

    ctx.register_tool("wisdom_offer_share", "wisdom", OFFER_SCHEMA, offer_share)

    def on_post_llm_call(side_question_token=None, review_signals=None, **kwargs):
        if side_question_token is None or not (review_signals or {}).get("skill_review_due"):
            return
        handle = ctx.fork_session(
            side_question_token,
            "Did this session create or change a skill the team would benefit from? "
            "If so, call wisdom_offer_share once for it; otherwise answer 'no'.",
            tools=["wisdom_offer_share"], max_iterations=4)
        if handle is not None:  # runs in the background; never wait inside the hook
            threading.Thread(target=lambda: handle.wait(600) and ctx.state.set(
                "last_check", handle.outcome), daemon=True).start()

    ctx.register_hook("post_llm_call", on_post_llm_call)
```

```yaml
capabilities:
  - llm.session_fork
```

同意画面には「ターンのあとで、エージェントのコピーを裏で走らせます。コピーにはメモリを含む
セッション全体が見え、プラグイン自身のツールを使え、メインモデルのトークンを使います。」と表示されます。

### シグネチャと規則 {#signature-and-rules}

`ctx.fork_session(token, prompt, *, tools=(), max_iterations=8,
input_budget=None, task=None, timeout=None)` はハンドルを返します。何も始まらなかったときは
`None` を返します。

* `token` は `post_llm_call` が受け取る `side_question_token` です。上の
  [リースの規則](#lease-rules)がそのまま当てはまります。ひとつのトークンで行える要求は
  1ターンに1回だけで、追加の質問*か*分岐のどちらかです。これは全プラグインで共有します。
  人が見ていないターン（cron、サブエージェント）にはトークンが渡りません。別のプロファイルの
  プラグインが呼ぶと `None` が返り、トークンは使われません。`llm.session_fork` を持たない
  プラグインが呼んだときも、分岐の許可一覧（後述）にないツールを指定したときも、同じく
  `None` が返り、トークンは使われません。それ以外で `None` が返ったときは、トークンは使われたことになります。
* `prompt` は空でない文字列で、長さは **8192 文字** までです。分岐のユーザーメッセージとして
  送られます。システムプロンプトと `tools[]` はセッションのものとバイト単位で同じままなので、
  最初のリクエストはほとんどがキャッシュの読み出しで済みます。
* `tools` には、分岐が呼んでよいツールの名前を、分岐の許可一覧の中から並べます。許可一覧に
  入るのは、呼び出しがこのプラグインの `register_tool` で登録したハンドラーに届く名前
  （その名前の現在の登録がこのプラグインのもので、Hermes がそれをツールレジストリに振り分けるもの）と、
  Hermes がひとつの中央の一覧で「分岐しても安全」と印を付けたコアのツール（現時点ではありません）です。
  それ以外のツールはすべて一覧の外です。別のプラグインのツール、すべての MCP ツール、
  「分岐しても安全」の印が付いていないすべてのコアのツールがそうで、
  `delegate_task`、`message_agent`、`cronjob_manage`、Kanban のツールも含まれます。
  Hermes がツールレジストリより先に振り分ける名前は、プラグインが登録していても一覧の外です。
  その呼び出しはプラグインのハンドラーに決して届かないからです。エージェントレベルのツール、
  古い別名、Tool Search の橋渡し、`connectors__<connector>__<tool>` という形の名前すべて、
  セッションのメモリプロバイダーとコンテキストエンジンのツールがこれに当たります。許可一覧にない
  ツールを指定すると、トークンを使わずに `None` が返ります。ツールのハンドラーは、分岐が追いかけられない
  仕事（サブエージェント、リモートのエージェントタスク、cron の実行、切り離されたワーカー、
  MCP サーバーのサンプリング要求）を始められてしまい、その仕事には分岐のツール一覧も、
  自動で拒否される承認も引き継がれません。プラグイン自身のハンドラーなら、もともと
  プラグインのコードを動かしているだけです。
* 指定したツールは、セッションの中にもなければなりません。なければ呼び出しは `None` を返し、
  トークンは使われます。セッションの中にあるとは、その `tools[]` に載っているか、Tool Search の
  裏に後回しにされている（既定で有効で、プラグインのツールは既定で後回しになります）ことです。
  後者の場合、セッションの `tools[]` にはその代わりに `tool_call` の橋渡しが入っています。
  分岐からもセッションのツールはすべて、バイト単位でそのまま*見えます*（キャッシュを合わせるため）。
  一覧にない呼び出しは、振り分けの時点で、許可されたツールを挙げたメッセージとともに拒否されます。
* 後回しにされたツールは `tool_call` を通して呼ばれますが、プラグインは自分のツールのどれが
  後回しになっているかを知らなくてかまいません。Hermes がプロンプトに一行足して、そのツールを
  名前を指定して `tool_call` 経由で呼ぶようモデルに伝え、続けてツールのパラメーターを示します。
  分岐の中では、`tool_call` が運べるのは指定されたツールの呼び出しだけです。それ以外のツール
  （プラグイン自身の指定されていないツール、別のプラグインのツール、コアのツール、コネクター）への
  `tool_call` は振り分けの時点で拒否され、`tool_search` と `tool_describe` も拒否されたままです。
  足した一行が、すでにツールとそのパラメーターを示しているからです。分岐が始まるときには、
  許可一覧が実際のセッションと照らしてもう一度読み直され、プラグイン自身のものでなくなったツールや、
  セッションがいまはレジストリより先に扱うようになったツールも、振り分けの時点で拒否されます。
  一覧が空なら、ツールを持たない分岐になります。
* `max_iterations` は分岐のループの回数の上限です（1〜16）。分岐全体の入力トークンには、
  裏で行う見直しと同じ上限があります（`auxiliary.background_review.max_input_tokens`、
  既定はコンテキストウィンドウの 75%）。`input_budget` では、この上限を下げることしかできません。
* 危険なコマンドの承認は自動で拒否され、分岐が行ったことは会話記録にもセッションの
  データベースにも書き込まれません。
* 分岐は、セッションが次のターンを始めた時点で取り消されます。実行中でも、開始中でも、
  まだ後回しにされていても同じで、後回しの分岐はそのまま起動しません。例外は、プラグインが
  差し込むターン（`ctx.inject_message`。分岐自身のツールのハンドラーから差し込む場合も含みます）です。
  このターンは、セッションで実行中の裏の見直しと実行中の分岐が終わるのを最大 120 秒待ち、
  そのあとまだ動いているものを取り消します。そのため、差し込んだターンで裏の作業を取り消せるとは
  考えないでください。この猶予のせいで人が待たされることはありません。差し込んだターンが待っている間に
  人がセッションへメッセージを送ると、`display.busy_input_mode` がそれをどう扱うかにかかわらず
  待ちはすぐに終わり、裏の作業は、人のターンのときと同じように取り消されます。キューに入った
  メッセージ（キューモード、割り込み、差し込んだターンにエージェントがまだ付いていないうちに来た
  メッセージ）は、差し込んだターンのあとに、届いた順にそれぞれ独立したターンとして実行されます。
  ターンの向きを変える steer（steer モードや `/steer`）や割り込みモードでの訂正は、差し込んだ
  ターンそのものに入ります。別のプラグインが差し込んだメッセージでは、待ちは終わりません。
  ゲートウェイの停止、再起動、プロファイルの退役でも、停止時の後始末に使える時間の範囲内で、
  同じように待ちは終わります。差し込んだターンはゲートウェイ自身のコンテキストから始まるので、
  分岐が差し込んだものであっても、そのツール呼び出しには `turn_origin` が付きません。`timeout`
  （秒、最大 1800）を指定すると、実時間での制限が加わります。どちらも協調的な仕組みで、
  分岐に割り込みをかけるだけです。分岐は次に割り込みを確かめたところで止まり、分岐のワーカーが
  終了した時点でハンドルが確定します。割り込みを無視するプロバイダーの呼び出しがあると、それが
  戻るまでハンドルは開いたままになるので、待つときは上限を付けてください（`handle.wait(t)`）。
* `task` には、このプラグイン自身の
  [`register_auxiliary_task`](#task-routed-auxiliary-calls) の経路のどれかを指定します。すると
  分岐はその経路のモデルで動き、そのモデルは `auxiliary.background_review` と同じように解決されます
  （違うモデルはキャッシュが冷えた状態から始まり、会話の要約を受け取ります）。プラグインが
  登録していないタスクを指定すると `None` が返ります。`task` を指定しなければ、分岐はセッションの
  モデルで動きます。`inherit_from="background_review"` を指定した経路がユーザーの見直し用モデルに
  従うのは、`allow_task_override` があるときだけです（[組み込みの枠を引き継ぐ](#inheriting-a-built-in-slot)）。
* Hermes が手元で管理するランタイム（同梱の llama-server）では、分岐は裏の見直しと同じように、
  マシンが空くまで待ちます（`outcome == "deferred"`）。同じセッションに対して同じプラグインの
  新しい後回しの分岐が来ると、待っていたほうはそれに置き換えられます（`"superseded"`）。

### ハンドル {#the-handle}

ハンドルには `handle.done`、`handle.cancelled`、`handle.outcome`、`handle.result`（分岐の
最終的なテキスト、または `None`）、`handle.actions`（分岐が呼んだ許可済みのツール名を
呼んだ順に並べたもの。`tool_call` を通した呼び出しは、それが運んだツールとして載ります）、
`handle.wait(timeout)`、`handle.cancel()` があります。
`outcome` は `deferred`、`running`、`ok`、`cancelled`、
`superseded`、`timeout`、`budget_exhausted`、`error`、`error:spawn`（分岐のワーカースレッドを
始められなかった。`fork_session` は例外を出す代わりに、確定済みのハンドルを返します）、
または `refused:<reason>` のどれかです。拒否の理由は `parent_gone`（分岐が始まる前に
セッションのエージェントが解放された）、`moa`（Mixture-of-Agents のランタイム）、
`agent_provider`（自前のツールを実行する、エージェントをプロバイダーとして使うランタイム）、
`runtime_changed`（そのターンのあとでセッションのモデルかプロバイダーが切り替わった）のどれかです。
ハンドルが分岐のエージェントそのものを見せることはありません。

### 分岐と実際のエージェントを見分ける {#telling-a-fork-from-the-live-agent}

分岐の中で呼ばれたツールのハンドラーは、キーワード引数
`turn_origin="plugin_fork:<plugin id>"` を受け取ります（引数として宣言するか、
`**kwargs` を受け付けてください）。実際に動いているエージェントからの呼び出しには `turn_origin` が
付きません。上の例ではこれを使って、実際のエージェントが自分の判断でプラグインの
共有提案ツールを動かせないようにしています。

使用量は `plugin_fork:<plugin id>` としてセッションに課金されます。分岐がプロバイダーに
送るリクエストのたびに、`pre_auxiliary_call` /
`post_auxiliary_call` が `aux_task="plugin_fork"` と `plugin_id` を付けて発火します。
ターン単位の `pre_api_request` / `post_api_request` が発火することはありません。

## アイドル時のタスク（`ctx.register_idle_task`） {#idle-tasks-ctxregisteridletask}

`fork_session` と同じく実験的な機能です（[上](#forking-the-sessions-own-agent-ctxfork_session)の注意書きを見てください）。
`ctx.register_idle_task(name, fn, *, interval_hours, min_idle_hours=2, first_run="defer")` は、
セッションを持たないプラグインのジョブを、スキルの curator と同じアイドル時のスケジュールで実行します。
規則の全体は
[Hermes がアイドルのときにジョブを実行する](/hermes/docs/developer-guide/plugins/#run-a-job-when-hermes-is-idle-ctxregister_idle_task)にあります。
タスクの `fn` を書くときに前提とする約束は次のとおりです。

* `fn` は、それを登録したプロファイルの中で、専用のスレッドで動きます。ホストの定期確認
  （ゲートウェイの定期処理、CLI/TUI の起動時、`hermes serve` の保守用の定期処理）はそれを始めると
  すぐに戻ります。実行を待つことはなく、ホスト側で時間制限を設けることもありません。
* 1回の実行は短くしてください。独自の時間制限を設け、プラグインのデータにチェックポイントを残しながら
  小さな単位で処理して、次の実行が今回止まったところから続けられるようにします。
* 1回の実行は冪等にしてください。再起動で途中で切られた実行は記録を残さず、あとで最初から
  やり直されます。そのため、同じ単位を2回処理しても害がないようにする必要があります。
* ゲートウェイの定期処理が止まるとき（ゲートウェイの停止や、同じプロセス内でのマルチプレクサーの
  再起動）は、新しい実行は始まらず、ゲートウェイは実行中のものを数秒待ってから、それを残したまま
  止まります。プラグインのコードは止められず、`fn` に停止の合図も届かないので、まだ動いている実行は
  裏で続きます。それが終わっても何も記録されず（タスクの状態は実行前のままなので、あとでもう一度
  実行されます）、確保していた実行権を手放します。Hermes が保証するのは、停止のあとに新しい実行が
  始まらず、タスクの状態も書き込まれないことだけです。1回の実行は短くしてください。
* 同じタスクは、実行中のものがある間は次の実行が始まりません。実行権を持つプロセスが死んでいる
  （クラッシュや強制終了）場合、その実行権は次の定期確認で引き継がれます。持ち主を確かめられない
  実行権（別のマシンで書かれたもの）は、1時間たつと放棄されたものとみなされます。例外は
  捕まえられてログに残り、`last_status: error` として記録されます。ホストまで届くことはありません。
* `fn` からのモデルの呼び出しは、`ctx.llm` とその信頼ゲートを通ります。`fn` にはターンがないので、
  `side_question_token` は渡らず、セッションを分岐させることもできません。

## プラグインの全体像の中での位置づけ {#where-this-fits-in-the-plugin-surface}

これまでの `ctx.*` のメソッドは、Hermes の既存の仕組みを広げるものでした。

| `ctx.register_tool` | エージェントが呼べるツールを足す |
| `ctx.register_platform` | 新しいゲートウェイのアダプターをつなぐ |
| `ctx.register_image_gen_provider` | 画像生成の裏側を差し替える |
| `ctx.register_memory_provider` | 記憶の裏側を差し替える |
| `ctx.register_context_engine` | 文脈を圧縮する仕組みを差し替える |
| `ctx.register_hook` | ライフサイクルの出来事を見張る |

`ctx.llm` は、上のどれも使わずに、ユーザーが話しているのと同じモデルを
*会話の外で* プラグインに走らせる、最初の入り口です。その一点だけが仕事です。
エージェントが呼ぶツールを登録したいなら `register_tool`、ライフサイクルの
出来事に反応したいなら `register_hook`、そして自分でモデルを呼びたいなら —
理由が何であれ、構造化でもそうでなくても — `ctx.llm` です。

## 参照先 {#reference}

* 実装: [`agent/plugin_llm.py`](https://github.com/NousResearch/hermes-agent/blob/main/agent/plugin_llm.py)
* テスト: [`tests/agent/test_plugin_llm.py`](https://github.com/NousResearch/hermes-agent/blob/main/tests/agent/test_plugin_llm.py)
* 参考用のプラグイン（別リポジトリ）:
  * [`plugin-llm-example`](https://github.com/NousResearch/hermes-example-plugins/tree/main/plugin-llm-example) — 画像を入力に使う、同期の構造化された抽出
  * [`plugin-llm-async-example`](https://github.com/NousResearch/hermes-example-plugins/tree/main/plugin-llm-async-example) — `asyncio.gather()` を使う非同期の例
* 補助のクライアント（裏で動いているエンジン）:
  [プロバイダーの実行環境](/hermes/docs/developer-guide/provider-runtime/) を見てください。
