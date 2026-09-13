---
title: "オブザーバーフック"
description: "プラグイン向けの読み取り専用テレメトリ契約。イベントの種類、相関 ID、ペイロードの安全性"
upstream_path: developer-guide/observer-hooks.md
upstream_blob: 30b912dda139623f0568121ef2485721ec191632
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/observer-hooks
---

# Hermes のオブザーバーフック {#hermes-observer-hooks}

Hermes のオブザーバーフックは、実行時の挙動を変えずにエージェントの実行を
再構成したいプラグインのための、読み取り専用のテレメトリ契約です。この
契約は、トレース、メトリクス、監査、リプレイ、エクスポートの連携を支えます。
たとえば Langfuse、OpenTelemetry 形式のコレクター、NeMo Relay などです。

オブザーバーフックは、あえて特定のバックエンドに依存しない作りになっています。安定したライフサイクル
イベント、相関 ID、サニタイズ済みのペイロード、時間、ステータス、エラーの各フィールドを公開します。
Hermes のプランナー、モデルプロバイダー、メモリ、ツールレジストリ、
承認の UX、CLI、ゲートウェイの挙動、実行のセマンティクスを置き換えるものではありません。

挙動を変えるリクエストラッパーや実行ラッパーは、このオブザーバー契約の
対象外です。オブザーバーフックは起きたことを報告するためのもので、
プロバイダーへのリクエスト、ツールの引数、実行コールバックを置き換えるべきではありません。

Hermes には、NeMo Relay の共有メトリクスを扱う公式の経路もあります。この経路は
ライフサイクルの境界を直接使うので、observability
プラグインを有効にする必要はありません。詳しくは [Relay の共有メトリクス](/hermes/docs/developer-guide/relay-shared-metrics/) を参照してください。

## 契約 {#contract}

プラグインは `register(ctx)` からオブザーバーのコールバックを登録します。

```python
def register(ctx):
    ctx.register_hook("pre_api_request", on_pre_api_request)
    ctx.register_hook("post_api_request", on_post_api_request)
    ctx.register_hook("pre_tool_call", on_pre_tool_call)
    ctx.register_hook("post_tool_call", on_post_tool_call)
```

どのフックのコールバックも、キーワード引数を受け取ります。フィールドが追加されても
後方互換を保てるよう、プラグインは `**kwargs` を受け取るようにしてください。

```python
def on_post_tool_call(**kwargs):
    tool_name = kwargs.get("tool_name")
    status = kwargs.get("status")
    result = kwargs.get("result")
```

プラグインマネージャーは、すべてのフックのペイロードに次のフィールドを追加します。

```text
telemetry_schema_version = "hermes.observer.v1"
```

フックのコールバックは fail-open です。コールバックが例外を出しても Hermes がそれを捕まえて
警告をログに残し、エージェントのループは止まりません。

オブザーバーフックの戻り値は、ほとんどが無視されます。例外は、以前からある
挙動に影響するフックです。

| フック | 戻り値の扱い |
| --- | --- |
| `pre_llm_call` | 文字列か `{"context": "..."}` を返すと、現在のユーザーメッセージに一時的なコンテキストを差し込めます。 |
| `pre_tool_call` | `{"action": "block", "message": "..."}` を返すと実行前にツールを止められ、`{"action": "modify", "args": {...}}` を返すとツールの入力引数を書き換えられます。 |
| `transform_tool_result` | `post_tool_call` のあとで、ツール結果の文字列を差し替えて返せます。 |
| `transform_llm_output` | アシスタントの最終テキストを差し替えて返せます。 |

テレメトリ用のプラグインは、こうした挙動に影響する戻り値を、互換性のための任意の
機能として扱ってください。observability に必須のものではありません。

## 相関 ID {#correlation-ids}

オブザーバーのペイロードには安定した ID が入っているので、プラグインは
コールバックの順序だけに頼らずイベントを結び付けられます。

| フィールド | 意味 |
| --- | --- |
| `session_id` | 会話やセッションの識別子です。 |
| `task_id` | タスクの識別子です。サブエージェントや分離された実行で特に役立ちます。 |
| `turn_id` | ユーザーのターンの識別子です。そのターン内の API 試行とツール呼び出しで共有されます。 |
| `api_request_id` | プロバイダーへの試行ごとの不透明な識別子です。文字列の形式を解析しないでください。 |
| `api_call_count` | エージェントループ内での API 試行の回数です。 |
| `tool_call_id` | プロバイダーが付けたツール呼び出し ID です（ある場合）。 |
| `parent_session_id` / `child_session_id` | 委任したサブエージェントとのセッションのつながりです。 |
| `parent_subagent_id` / `child_subagent_id` | サブエージェント同士のつながりです（ある場合）。 |
| `parent_turn_id` | 委任作業を起こした親のターンです。 |

受け取る側は、複合 ID を解析するより明示的なフィールドを使ってください。
特に `api_request_id` は、中身を解釈しない相関用の値です。

## イベントの種類 {#event-families}

### セッションのライフサイクル {#session-lifecycle}

セッションのフックは、会話の区切りとリセットを表します。

| フック | 発火するタイミング |
| --- | --- |
| `on_session_start` | システムプロンプトを組み立てたあと、まったく新しいセッションが始まったとき。 |
| `on_session_end` | `run_conversation` の呼び出しが終わったとき。中断されたターンや完了しなかったターンも含みます。 |
| `on_session_finalize` | CLI やゲートウェイが、使用中のセッション識別子を片付けるとき。 |
| `on_session_reset` | CLI やゲートウェイが、古いセッション識別子から新しいものへ切り替えるとき。 |

よく入るフィールドは `session_id`、`completed`、`interrupted`、`reason`、
`old_session_id`、`new_session_id` です（ある場合）。

`on_session_end` はターンや実行の単位で発火します。チャットの識別子にとって、最後の
区切りとは限りません。セッションの識別子ごとに一度だけ行うべき後片付けには、
`on_session_finalize` と `on_session_reset` を使ってください。

### ターン単位の LLM フック {#turn-scoped-llm-hooks}

これらのフックは、プロバイダー API への個々の試行ではなく、ユーザーのターン全体を囲みます。

| フック | 発火するタイミング |
| --- | --- |
| `pre_llm_call` | ユーザーのターンで、ツールループが始まる前。 |
| `post_llm_call` | ターンが完了し、アシスタントの最終出力が出たあと。 |

`pre_llm_call` によく入るフィールドは `session_id`、`turn_id`、
`user_message`、`conversation_history`、`is_first_turn`、`model`、`platform`、
`sender_id` です。

`post_llm_call` によく入るフィールドは `session_id`、`turn_id`、
`user_message`、`assistant_response`、`conversation_history`、`model`、
`platform` です。

LLM のスパンをテレメトリに取るなら、リクエスト単位の API フックを使ってください。`pre_llm_call` と
`post_llm_call` は、ターン単位のコンテキスト、互換性、ターンの最終まとめに使います。

### リクエスト単位の API フック {#request-scoped-api-hooks}

API フックは、エージェントループの中でのプロバイダーへの試行を表します。

| フック | 発火するタイミング |
| --- | --- |
| `pre_api_request` | プロバイダー API へリクエストを送る直前。 |
| `post_api_request` | プロバイダーから正常な応答が返ったあと。 |
| `api_request_error` | プロバイダーへのリクエストが失敗したとき、または再試行できるエラーの経路に入ったあと。 |

`pre_api_request` に入るもの:

- 識別子: `session_id`、`task_id`、`turn_id`、`api_request_id`
- 実行環境: `platform`、`model`、`provider`、`base_url`、`api_mode`
- 試行のメタデータ: `api_call_count`、`message_count`、`tool_count`、
  `approx_input_tokens`、`request_char_count`、`max_tokens`
- 時間: `started_at`
- サニタイズ済みのリクエストペイロード: `request`

`post_api_request` には、同じ識別子と実行環境のフィールドに加えて次が入ります。

- `api_duration`、`started_at`、`ended_at`
- `finish_reason`、`message_count`、`response_model`
- `usage`
- `assistant_content_chars`、`assistant_tool_call_count`
- サニタイズ済みのレスポンスペイロード: `response`
- 互換用のオブジェクト: `assistant_message`

`api_request_error` には、同じ識別子と実行環境のフィールドに加えて次が入ります。

- `api_duration`、`started_at`、`ended_at`
- `status_code`、`retry_count`、`max_retries`、`retryable`、`reason`
- 構造化された `error = {"type": ..., "message": ...}`
- 失敗したリクエストのサニタイズ済みペイロード: `request`

新しく作る受け取り側は、サニタイズ済みの `request`、`response`、`error` フィールドを
オブザーバーの正式な入力として使ってください。

### ツールのライフサイクル {#tool-lifecycle}

ツールのフックは、個々のツール呼び出しを表します。

| フック | 発火するタイミング |
| --- | --- |
| `pre_tool_call` | ガードレールで承認されたツールを実行に回す前。 |
| `post_tool_call` | ツールの実行、キャンセル、ブロック、エラーのいずれかで終わったあと。 |
| `transform_tool_result` | `post_tool_call` のあと、結果をモデルのコンテキストに追加する前。 |

`pre_tool_call` には `tool_name`、`args`、`task_id`、`session_id`、
`tool_call_id`、`turn_id`、`api_request_id` が入ります。

`post_tool_call` には、同じ識別子のフィールドに加えて `result`、
`duration_ms`、`status`、`error_type`、`error_message` が入ります。

`status` は、オブザーバー向けのライフサイクルの結果です。よく使われる値は次のとおりです。

| ステータス | 意味 |
| --- | --- |
| `ok` | ツールが正常に終わりました。 |
| `error` | ツールは動きましたが、エラーを返したか例外を出しました。 |
| `blocked` | `pre_tool_call` フックが実行を止めました。 |
| `cancelled` | 正常に終わる前に実行がキャンセルされました。 |

ブロックやキャンセルの経路でも `post_tool_call` が発行されるので、テレメトリ用の
プラグインはスパンをきちんと閉じられます。

### 承認のライフサイクル {#approval-lifecycle}

承認のフックは、危険なコマンドの実行前に出る承認の確認を表します。

| フック | 発火するタイミング |
| --- | --- |
| `pre_approval_request` | 承認の確認を表示または送信する前。 |
| `post_approval_response` | ユーザーが応答したか、確認がタイムアウトしたあと。 |

よく入るフィールドは `command`、`description`、`pattern_key`、
`pattern_keys`、`session_key`、`surface` です。

`post_approval_response` には `choice` も入り、値は `once`、
`session`、`always`、`deny`、`timeout` などです。

承認のフックは観測専用です。プラグインがこれらのフックから、承認に先回りして答えたり
拒否したりはできません。ツールを承認の段階まで進ませたくない場合は、
`pre_tool_call` のブロックを使ってください。

### サブエージェントのライフサイクル {#subagent-lifecycle}

サブエージェントのフックは、子エージェントに委任した作業を表します。

| フック | 発火するタイミング |
| --- | --- |
| `subagent_start` | 委任先の子エージェントが作られたとき。 |
| `subagent_stop` | 委任先の子エージェントが結果を返したか、失敗したとき。 |

`subagent_start` のフィールドは `parent_session_id`、`parent_turn_id`、
`parent_subagent_id`、`child_session_id`、`child_subagent_id`、`child_role`、
`child_goal` です。

`subagent_stop` のフィールドは、親と子のセッション ID、役割とステータスのフィールド、
`child_summary`、`duration_ms`、メタデータだけの `tool_call_history` です。
履歴の各エントリには、ツール名、引数の名前、上限付きの副作用の
対象、入出力のバイト数、結果が入ります。URL のクエリ文字列とフラグメントは
取り除かれます。生の引数、プロンプト、コマンド、内容、ヘッダー、結果は
意図的に含めていません。

オブザーバーはこれらのフックを使って、入れ子になった実行の流れをモデル化できます。そのとき子
エージェントの実行は、それを起こした親のターンと結び付いたままです。

## ペイロードの安全性 {#payload-safety}

オブザーバーのペイロードは、生のオブジェクトに触るためではなく、テレメトリを受け取る側のために設計されています。
新しく作る受け取り側は、サニタイズ済みの API ペイロードを使ってください。

- `pre_api_request.request`
- `post_api_request.response`
- `api_request_error.request`
- `api_request_error.error`

サニタイズでは、プロバイダーのオブジェクトを JSON 互換の構造に変換し、
大きなペイロードに上限をかけ、機密性のあるキーを伏せ字にし、サニタイズ済みのフィールドに
生のレスポンスオブジェクトが出ないようにします。

`request_messages`、`conversation_history`、
`assistant_message` のような互換用の古いフィールドは、既存のプラグインのために残っていることがあります。新しい
observability の受け取り側は、サニタイズ済みのペイロードを優先してください。

## パフォーマンス {#performance}

計測を入れていない既定の経路は、軽いまま保つべきです。コストの高いリクエスト／レスポンスの
ペイロード組み立ては `has_hook(...)` の条件の内側にあるので、Hermes は
該当するフックを登録したプラグインが1つ以上あるときだけ、サニタイズ済みの API テレメトリのペイロードを作ります。

プラグインを書く人は、この性質を崩さないようにしてください。

- プラグインが実際に使うフックだけを登録する。
- サニタイズ済みのペイロードを深くコピーしたり、もう一度サニタイズしたりしない。
- フックのコールバックは速く、fail-open に保つ。
- ネットワークへのエクスポートやまとめ書きは、できるだけ別処理に逃がす。

## オブザーバープラグインを書く {#writing-an-observer-plugin}

最小限のオブザーバープラグイン:

```python
def register(ctx):
    ctx.register_hook("pre_api_request", on_pre_api_request)
    ctx.register_hook("post_api_request", on_post_api_request)
    ctx.register_hook("pre_tool_call", on_pre_tool_call)
    ctx.register_hook("post_tool_call", on_post_tool_call)

def on_pre_api_request(**kwargs):
    start_llm_span(
        request_id=kwargs.get("api_request_id"),
        turn_id=kwargs.get("turn_id"),
        request=kwargs.get("request"),
        model=kwargs.get("model"),
    )

def on_post_api_request(**kwargs):
    finish_llm_span(
        request_id=kwargs.get("api_request_id"),
        response=kwargs.get("response"),
        usage=kwargs.get("usage"),
        duration=kwargs.get("api_duration"),
    )

def on_pre_tool_call(**kwargs):
    start_tool_span(
        call_id=kwargs.get("tool_call_id"),
        name=kwargs.get("tool_name"),
        args=kwargs.get("args"),
    )

def on_post_tool_call(**kwargs):
    finish_tool_span(
        call_id=kwargs.get("tool_call_id"),
        result=kwargs.get("result"),
        status=kwargs.get("status"),
        duration_ms=kwargs.get("duration_ms"),
    )
```

スパンの相関には `session_id`、`turn_id`、`api_request_id`、`tool_call_id` を使います。
エクスポート形式が入れ子のエージェント作業やセキュリティのライフサイクルイベントに対応しているなら、
サブエージェントと承認のフックも使ってください。

## 既存の利用例 {#existing-consumers}

同梱の Langfuse プラグインは、フックを直接使った observability の例です。
ターン、プロバイダーへのリクエスト、ツール呼び出しを記録します。

NeMo Relay SDK とのネイティブ連携は、Hermes のセッション、ターン、LLM、ツールの
ライフサイクルを Relay に対応付けます。Relay プラグインを明示的に設定すると、
[ATOF、ATIF、OTEL](https://docs.nvidia.com/nemo/relay/configure-plugins/observability/about)
のエクスポーターや実行ミドルウェアを追加できます。詳しくは
[Relay の共有メトリクス](/hermes/docs/developer-guide/relay-shared-metrics/) を参照してください。
