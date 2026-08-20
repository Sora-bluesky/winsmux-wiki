---
title: "プラグインからの LLM 呼び出し"
description: "ctx.llm を使うと、プラグインの中からどんな LLM 呼び出しもできます。チャットでも構造化出力でも、同期でも非同期でも同じです。認証はホストが持ち、信頼ゲートは既定で閉じ、JSON Schema による検証も選べます。"
upstream_path: developer-guide/plugin-llm-access.md
upstream_blob: f6eeee09cdf25333823b87287697bea528ae079a
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
プラグインが使えるのは自分で登録したタスクだけで、知らない名前や他人のタスク名は、
プロバイダーを呼ぶ前の段階で失敗します。`allow_task_override: true` は、Hermes に
もともとある補助タスクを使わせるための、運用側からの明示的な許可です。これで
他のプラグインのタスクが使えるようになるわけではありません。`task=` を省く
（または `"auto"` にする）と、有効になっている本体のプロバイダーとモデルのままになります。

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
