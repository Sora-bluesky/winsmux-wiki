---
title: "ミドルウェア"
description: "LLM 呼び出しとツール呼び出しの挙動を変えるプラグインのミドルウェア。契約、実行順序、例"
upstream_path: developer-guide/middleware.md
upstream_blob: ad1764f904c30289900e3224164272bf8bfea64e
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/middleware
---

# Hermes のミドルウェア {#hermes-middleware}

Hermes のミドルウェアは、オブザーバーフックと対になる、挙動を変えるための仕組みです。
オブザーバーフックは起きたことを報告します。ミドルウェアは、実行前にリクエストを
書き換えたり、実行のコールバックそのものを包んだりすることで、起きることを変えられます。

この契約は、あえて特定のバックエンドに依存しない形にしてあります。プラグインはこれを使って、
ローカルのポリシー、リクエストの整形、トレース、状況に応じたルーティング、キャッシュ制御、
サンドボックスの選択、NeMo Relay などのランタイムへの受け渡しを実現できます。その際、Hermes の
プランナー、モデルプロバイダーのアダプター、ツールレジストリ、メモリ、CLI の使い勝手を変える必要はありません。

ミドルウェアを有効にすると、プラグインは次のことができます。

- Hermes がプロバイダーを呼び出す前に、LLM プロバイダーへのリクエストの kwargs を書き換える。
- ガードレール、承認チェック、フック、ツールの実行がツールの引数を見る前に、
  その引数を書き換える。
- Hermes のリトライ、ストリーミング、中断、フックの挙動を保ったまま、
  実際の LLM 実行のコールバックを包む。
- Hermes のガードレール、承認、ツール実行後のフック、ツール結果の変換を保ったまま、
  実際のツール実行のコールバックを包む。

## 契約 {#contract}

プラグインは `register(ctx)` からミドルウェアを登録します。

```python
def register(ctx):
    ctx.register_middleware("llm_request", on_llm_request)
    ctx.register_middleware("llm_execution", on_llm_execution)
    ctx.register_middleware("tool_request", on_tool_request)
    ctx.register_middleware("tool_execution", on_tool_execution)
```

すべてのミドルウェアのコールバックは、次の値を受け取ります。

- `telemetry_schema_version`: 現在は `hermes.observer.v1`
- `middleware_schema_version`: 現在は `hermes.middleware.v1`
- 実行時のコンテキスト。該当する場合は `session_id`、`task_id`、`turn_id`、
  `api_request_id`、`provider`、`model`、`api_mode`、`tool_name`、
  `tool_call_id` などが含まれます。

対応しているミドルウェアの種類:

| 種類 | ペイロード | 戻り値の形 | 用途 |
| --- | --- | --- | --- |
| `llm_request` | `request`, `original_request` | `{"request": {...}}` | プロバイダーの実行前に、実際に使うプロバイダーの kwargs を置き換えます。 |
| `tool_request` | `tool_name`, `args`, `original_args` | `{"args": {...}}` | フック、ガードレール、承認、実行の前に、実際に使うツールの引数を置き換えます。 |
| `llm_execution` | `request`, `original_request`, `next_call` | プロバイダーの任意の応答 | 実際のプロバイダー呼び出しを包むか、置き換えます。 |
| `tool_execution` | `tool_name`, `args`, `original_args`, `next_call` | ツールの任意の結果 | 実際のツール呼び出しを包むか、置き換えます。 |

リクエスト系のミドルウェアは、任意でトレース用のフィールドを返せます。

```python
return {
    "request": updated_request,
    "source": "my-plugin",
    "reason": "selected fallback model",
}
```

Hermes はこれらのトレース項目を、後続のオブザーバーフックのペイロードに
`middleware_trace` として格納します。

実行系のミドルウェアは `next_call` コールバックを受け取ります。これを呼ぶと、チェーンの
続きが実行されます。

```python
def on_tool_execution(**kwargs):
    result = kwargs["next_call"](kwargs["args"])
    return result
```

複数のプラグインが同じ種類の実行系ミドルウェアを登録した場合、Hermes は登録順に
入れ子のチェーンとして実行します。ミドルウェアの失敗はフェイルオープンです。
Hermes は警告をログに出し、次のミドルウェア、または本来の実行経路へ進みます。

## 実行順序 {#execution-order}

### LLM 呼び出し {#llm-calls}

プロバイダーへのリクエストごとに、Hermes は次の順でミドルウェアを適用します。

1. 現在の会話からプロバイダーの kwargs を組み立てます。
2. `llm_request` ミドルウェアを適用します。
3. 実際に使うリクエストを添えて、`pre_api_request` オブザーバーフックを発行します。
4. `llm_execution` ミドルウェアを通してプロバイダーを実行します。
5. `post_api_request` または `api_request_error` オブザーバーフックを発行します。

リクエスト系のミドルウェアは、プロバイダーの kwargs 全体を見られます。`messages` または
Responses API の `input`、モデルの設定、ツールの定義、ストリーミングのオプション、
プロバイダー固有のオプションも含まれます。実行系のミドルウェアは、同じ実際のリクエストに
加えて `next_call` を受け取ります。

### ツール呼び出し {#tool-calls}

ツール呼び出しごとに、Hermes は次の順でミドルウェアを適用します。

1. モデルが渡したツールの引数を解析し、型をそろえます。
2. `tool_request` ミドルウェアを適用します。
3. 実際に使う引数に対して、Hermes の通常の実行前処理を行います。
   ツールが使えるかの確認、オブザーバーのブロック指示、ガードレール、
   承認チェックです。
4. `tool_execution` ミドルウェアを通してツールを実行します。
5. `post_tool_call` オブザーバーフックを発行します。
6. 結果を会話のコンテキストに戻す前に、`transform_tool_result` フックを
   適用します。

ツールのリクエスト系ミドルウェアは、承認チェックより前に実行されます。慎重に使ってください。
書き換えたパス、コマンド、URL が、そのまま後段のポリシーで評価される値になります。

## 有効化 {#enablement}

ミドルウェアは、有効になっているプラグインでだけ実行されます。同梱のプラグインの場合は次のとおりです。

```bash
hermes plugins enable <plugin-name>
```

ローカルで切り離してテストするときは、プラグインの有効化とエージェントの実行で
同じ `HERMES_HOME` を使います。

```bash
export HERMES_HOME=/tmp/hermes-middleware-test
mkdir -p "$HERMES_HOME"
hermes plugins enable <plugin-name>
hermes chat --query 'Reply exactly ok'
```

ソースをチェックアウトして使っている場合は、ランタイムが作業ツリーのプラグインと
ミドルウェアを読み込むように、ソース版のコマンドを使ってください。

```bash
uv sync
uv run hermes plugins enable <plugin-name>
uv run hermes chat --query 'Reply exactly ok'
```

## 汎用的なプラグインの例 {#generic-plugin-examples}

以下の例は、あえて小さくしてあります。NeMo Relay に依存せずに、ミドルウェアの契約の形を
示すためのものです。

### LLM リクエストのミドルウェア {#llm-request-middleware}

このプラグインは、プロバイダーへのリクエストに印を付け、ミドルウェアのトレース項目を記録します。

```python
def register(ctx):
    ctx.register_middleware("llm_request", tag_llm_request)

def tag_llm_request(**kwargs):
    request = dict(kwargs["request"])
    extra_body = dict(request.get("extra_body") or {})
    extra_body.setdefault("metadata", {})["hermes_middleware_demo"] = True
    request["extra_body"] = extra_body
    return {
        "request": request,
        "source": "middleware-demo",
        "reason": "tagged provider request",
    }
```

実際に使うリクエストが、`pre_api_request`、プロバイダーの実行、
`post_api_request` に渡されます。

### ツールリクエストのミドルウェア {#tool-request-middleware}

このプラグインは、`terminal` の呼び出しを決まった作業ディレクトリに固定します。

```python
def register(ctx):
    ctx.register_middleware("tool_request", normalize_terminal_workdir)

def normalize_terminal_workdir(**kwargs):
    if kwargs.get("tool_name") != "terminal":
        return None
    args = dict(kwargs["args"])
    args.setdefault("workdir", "/tmp/hermes-middleware-demo")
    return {
        "args": args,
        "source": "middleware-demo",
        "reason": "defaulted terminal workdir",
    }
```

これはフックや承認より前に実行されるため、後段のテレメトリーとポリシーには
書き換え後の `workdir` が見えます。

### LLM 実行のミドルウェア {#llm-execution-middleware}

このプラグインは、プロバイダーの呼び出しを包み、プロバイダーの生の応答をそのまま返します。

```python

def register(ctx):
    ctx.register_middleware("llm_execution", time_llm_execution)

def time_llm_execution(**kwargs):
    started = time.monotonic()
    response = kwargs["next_call"](kwargs["request"])
    elapsed_ms = int((time.monotonic() - started) * 1000)
    print(f"llm_execution elapsed_ms={elapsed_ms}")
    return response
```

Hermes がプロバイダーのアダプターから受け取る想定の、同じ形の応答を返してください。
ランタイムのほかの部分がその包みを想定していない限り、応答をプラグイン独自の形式で
包まないでください。

### ツール実行のミドルウェア {#tool-execution-middleware}

このプラグインは、ツールの結果をそのまま保ちながらツールの実行を包みます。

```python
def register(ctx):
    ctx.register_middleware("tool_execution", annotate_tool_execution)

def annotate_tool_execution(**kwargs):
    result = kwargs["next_call"](kwargs["args"])
    # Metrics, logging, or external routing can happen here.
    return result
```

実行系のミドルウェアは `next_call(modified_args)` を呼んで、変更したペイロードを
後続のミドルウェアと本来のツールディスパッチャーに渡すこともできます。

プラグイン固有の例は、その挙動を持つプラグイン側に置くべきです。
NeMo Relay の実行ミドルウェアは、明示的に選んだ Relay の `plugins.toml` を通して
組み込まれます。詳しくは
[Relay の共有メトリクス](/hermes/docs/developer-guide/relay-shared-metrics/)を参照してください。

## 安全上の注意 {#safety-notes}

- 動的な外部システムへ明示的にルーティングする場合を除き、ミドルウェアは同じ入力に対して
  同じ結果を返すようにしてください。
- リクエスト系のミドルウェアは、部分的な差分ではなく、置き換え用のペイロード全体を
  返してください。
- 実行系のミドルウェアは、意図的に実行を打ち切る場合を除き、`next_call(...)` をちょうど 1 回だけ
  呼んでください。
- 実行系のミドルウェアが `next_call(...)` を呼ぶ前に例外を出した場合、Hermes は
  ミドルウェアの失敗として扱い、残りのミドルウェアチェーンと本来の実行を続けます。
- 実行系のミドルウェアが `next_call(...)` を正常に呼んだ後、後処理の途中で例外を出した場合、
  Hermes は下流の結果を保持し、プロバイダーやツールを 2 回目に実行することはありません。
- 下流のプロバイダーやツールの実行が失敗した場合、ミドルウェアはそのエラーをそのまま伝えても、
  意図して別の形に変換してもかまいません。Hermes が下流の失敗を、成功した `None` の結果に
  変えることはありません。
- ツールのリクエスト系ミドルウェアは承認より前に実行されます。ファイルパス、コマンド、URL、
  引数を書き換えた場合、ガードレールと承認が評価するのは書き換え後の値です。
- 読み取りだけのテレメトリーには、引き続きオブザーバーフックが適しています。ミドルウェアは、
  プラグインが挙動を変えたり包んだりする必要があるときだけ使ってください。
