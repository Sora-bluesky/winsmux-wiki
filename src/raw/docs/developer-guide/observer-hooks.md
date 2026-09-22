---
title: "オブザーバーフック"
description: "プラグイン向けの読み取り専用テレメトリ契約。イベントの系統、相関 ID、ペイロードの安全性"
upstream_path: developer-guide/observer-hooks.md
upstream_blob: 075f4f809e4447a94e89252bbcd3bf15904da8f5
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/observer-hooks
---

# Hermes のオブザーバーフック {#hermes-observer-hooks}

Hermes のオブザーバーフックは、実行時の挙動を変えずにエージェントの実行内容を
再構成したいプラグインのための、読み取り専用のテレメトリ契約です。この契約は、
Langfuse や OpenTelemetry 形式のコレクター、NeMo Relay といったトレース・メトリクス・
監査・リプレイ・エクスポートの連携を想定しています。

オブザーバーフックは、意図的にどのバックエンドにも寄せていません。安定した
ライフサイクルイベント、相関 ID、サニタイズ済みのペイロード、所要時間、状態、
エラーの各フィールドを公開します。Hermes のプランナー、モデルプロバイダー、メモリ、
ツールレジストリ、承認 UX、CLI、ゲートウェイの挙動、実行時の意味論を置き換えるもの
ではありません。

挙動を変えるリクエストラッパーや実行ラッパーは、このオブザーバー契約の範囲外です。
オブザーバーフックは起きたことを報告するためのもので、プロバイダーへのリクエストや
ツールの引数、実行コールバックを差し替えるためのものではありません。

Hermes には、NeMo Relay 向けの公式な共有メトリクス経路もあります。こちらは同じ
ライフサイクルの区切りを直接使うので、可観測性プラグインを有効にする必要はありません。
[Relay の共有メトリクス](/hermes/docs/developer-guide/relay-shared-metrics/)を参照してください。

## 契約 {#contract}

プラグインは `register(ctx)` からオブザーバーのコールバックを登録します。

```python
def register(ctx):
    ctx.register_hook("pre_api_request", on_pre_api_request)
    ctx.register_hook("post_api_request", on_post_api_request)
    ctx.register_hook("pre_tool_call", on_pre_tool_call)
    ctx.register_hook("post_tool_call", on_post_tool_call)
```

どのフックのコールバックもキーワード引数で呼ばれます。フィールドが追加されても
互換性が保たれるように、プラグイン側は `**kwargs` を受け取るようにしてください。

```python
def on_post_tool_call(**kwargs):
    tool_name = kwargs.get("tool_name")
    status = kwargs.get("status")
    result = kwargs.get("result")
```

プラグインマネージャーは、すべてのフックのペイロードに次のフィールドを差し込みます。

```text
telemetry_schema_version = "hermes.observer.v1"
```

フックのコールバックは fail-open です。コールバックが例外を投げても Hermes が捕捉して
警告をログに出し、エージェントのループはそのまま動き続けます。

オブザーバーフックの戻り値は、ほとんどの場合は無視されます。例外は、挙動に影響する
古いフックです。

| フック | 戻り値の扱い |
| --- | --- |
| `pre_llm_call` | 文字列または `{"context": "..."}` を返すと、現在のユーザーメッセージに一時的なコンテキストを差し込めます。 |
| `pre_tool_call` | `{"action": "block", "message": "..."}` を返すと実行前にツールを止められます。`{"action": "modify", "args": {...}}` を返すとツールの入力引数を書き換えられます。 |
| `transform_tool_result` | `post_tool_call` のあとに、ツールの結果を差し替える文字列を返せます。 |
| `transform_llm_output` | 最終的なアシスタント本文を差し替える文字列を返せます。 |

テレメトリ系のプラグインでは、こうした挙動に影響する戻り値は、可観測性のために必要な
ものではなく、あくまで互換性のための任意機能として扱ってください。

## 相関 ID {#correlation-ids}

オブザーバーのペイロードは安定した ID を持つので、プラグインはコールバックの順序だけに
頼らずにイベントを突き合わせられます。

| フィールド | 意味 |
| --- | --- |
| `session_id` | 会話・セッションの識別子です。 |
| `task_id` | タスクの識別子です。サブエージェントや分離された実行でとくに役立ちます。 |
| `turn_id` | ユーザーの 1 ターンの識別子で、そのターン内の API 試行とツール呼び出しが共有します。 |
| `api_request_id` | プロバイダーへの試行を表す不透明な識別子です。文字列の形式を解析しないでください。 |
| `api_call_count` | エージェントループ内での API 試行回数です。 |
| `tool_call_id` | プロバイダーが返したツール呼び出しの ID です（返ってきた場合）。 |
| `parent_session_id` / `child_session_id` | 委譲したサブエージェントとのセッションの結び付きです。 |
| `parent_subagent_id` / `child_subagent_id` | サブエージェント同士の結び付きです（取得できた場合）。 |
| `parent_turn_id` | 委譲した作業を生み出した親のターンです。 |

利用側では、複合的な ID を解析するのではなく、明示されたフィールドを使ってください。
とくに `api_request_id` は、中身を読まずに突き合わせるための値です。

## イベントの系統 {#event-families}

### セッションのライフサイクル {#session-lifecycle}

セッション系のフックは、会話の区切りとリセットを表します。

| フック | 発火するタイミング |
| --- | --- |
| `on_session_start` | システムプロンプトを組み立てたあと、新しいセッションが始まったとき。 |
| `on_session_end` | `run_conversation` の呼び出しが終わったとき。中断されたターンや未完了のターンも含みます。 |
| `on_session_finalize` | CLI やゲートウェイが、動作中のセッション識別子を破棄するとき。 |
| `on_session_reset` | CLI やゲートウェイが、古いセッション識別子から新しいものへ切り替えるとき。 |

よく使うフィールドには `session_id`、`completed`、`interrupted`、`reason`、
`old_session_id`、`new_session_id` があります（取得できる場合）。

`on_session_end` はターンや 1 回の実行の単位です。チャットの識別子にとっての最後の
区切りとは限りません。1 つのセッション識別子につき 1 回だけ行いたい後始末には、
`on_session_finalize` と `on_session_reset` を使ってください。

### ターン単位の LLM フック {#turn-scoped-llm-hooks}

これらのフックは、プロバイダーへの個々の API 試行ではなく、ユーザーの 1 ターンを囲みます。

| フック | 発火するタイミング |
| --- | --- |
| `pre_llm_call` | ユーザーのターンでツールのループが始まる前。 |
| `post_llm_call` | 最終的なアシスタントの出力が出てターンが完了したあと。 |

`pre_llm_call` でよく使うフィールドには `session_id`、`turn_id`、
`user_message`、`conversation_history`、`is_first_turn`、`model`、`platform`、
`sender_id` があります。

`post_llm_call` でよく使うフィールドには `session_id`、`turn_id`、
`user_message`、`assistant_response`、`conversation_history`、`model`、
`platform` があります。

LLM のスパンをテレメトリとして取るなら、リクエスト単位の API フックを使ってください。
`pre_llm_call` と `post_llm_call` は、ターン単位の文脈、互換性、ターンの最終的な
まとめのために使います。

### リクエスト単位の API フック {#request-scoped-api-hooks}

API 系のフックは、エージェントループ内でのプロバイダーへの試行を表します。

| フック | 発火するタイミング |
| --- | --- |
| `pre_api_request` | プロバイダーへ API リクエストを送る直前。 |
| `post_api_request` | プロバイダーからの応答が成功したあと。 |
| `api_request_error` | プロバイダーへのリクエストが失敗したとき、または再試行の対象になるエラー経路を通ったあと。 |
| `pre_auxiliary_call` | 補助的な LLM 呼び出し（タイトル生成、圧縮、MoA、画像認識など）で、プロバイダーへ試行する前ごと。`aux_task` が付きます。`*_api_request` のフックはメインループ専用のままです。 |
| `post_auxiliary_call` | その試行が値を返したか例外を投げたあと（失敗時は `error` が入ります）。 |

`pre_api_request` に含まれるもの。

- 識別子: `session_id`、`task_id`、`turn_id`、`api_request_id`
- 実行環境: `platform`、`model`、`provider`、`base_url`、`api_mode`
- 試行のメタデータ: `api_call_count`、`message_count`、`tool_count`、
  `approx_input_tokens`、`request_char_count`、`max_tokens`
- 時刻: `started_at`
- サニタイズ済みのリクエストのペイロード: `request`

`post_api_request` には、同じ識別子と実行環境のフィールドに加えて次が含まれます。

- `api_duration`、`started_at`、`ended_at`
- `finish_reason`、`message_count`、`response_model`
- `usage`
- `assistant_content_chars`、`assistant_tool_call_count`
- サニタイズ済みの応答のペイロード: `response`
- 互換性のためのオブジェクト: `assistant_message`

`api_request_error` には、同じ識別子と実行環境のフィールドに加えて次が含まれます。

- `api_duration`、`started_at`、`ended_at`
- `status_code`、`retry_count`、`max_retries`、`retryable`、`reason`
- 構造化されたエラー `error = {"type": ..., "message": ...}`
- サニタイズ済みの、失敗したリクエストのペイロード: `request`

サニタイズ済みの `request`、`response`、`error` の各フィールドが、これから作る
利用側にとっての正式な入力です。

### ツールのライフサイクル {#tool-lifecycle}

ツール系のフックは、個々のツール呼び出しを表します。

| フック | 発火するタイミング |
| --- | --- |
| `pre_tool_call` | ガードレールの承認を通ったツールを実行に回す前。 |
| `post_tool_call` | ツールの実行、キャンセル、ブロック、エラーのいずれかが終わったあと。 |
| `transform_tool_result` | `post_tool_call` のあと、結果がモデルのコンテキストに追加される前。 |

`pre_tool_call` には `tool_name`、`args`、`task_id`、`session_id`、
`tool_call_id`、`turn_id`、`api_request_id` が含まれます。

`post_tool_call` には、同じ識別子のフィールドに加えて `result`、
`duration_ms`、`status`、`error_type`、`error_message` が含まれます。

`status` は、オブザーバー向けに整えたライフサイクルの結果です。よく出る値は次のとおりです。

| 状態 | 意味 |
| --- | --- |
| `ok` | ツールが正常に終わりました。 |
| `error` | ツールは動きましたが、エラーを返したか例外を投げました。 |
| `blocked` | `pre_tool_call` のフックが実行を止めました。 |
| `cancelled` | 正常に終わる前に実行がキャンセルされました。 |

ブロックされた経路やキャンセルされた経路でも `post_tool_call` は発火するので、
テレメトリ系のプラグインはスパンをきれいに閉じられます。

### 承認のライフサイクル {#approval-lifecycle}

承認系のフックは、危険なコマンドに対する承認の問い合わせを表します。

| フック | 発火するタイミング |
| --- | --- |
| `pre_approval_request` | 承認の問い合わせを表示または送信する前。 |
| `post_approval_response` | 利用者が答えたあと、または問い合わせがタイムアウトしたあと。 |

よく使うフィールドには `command`、`description`、`pattern_key`、
`pattern_keys`、`session_key`、`surface` があります。

`post_approval_response` には `choice` も含まれ、値には `once`、
`session`、`always`、`deny`、`timeout`、`cancelled` などがあります（最後のものは誰も
答えなかった場合です。ターンが中断または終了して問い合わせが取り下げられたか、CLI で
利用者のところまで届かなかったケースです）。

承認系のフックは観測のためだけのものです。プラグインがこれらのフックから承認に
先回りして答えたり、拒否したりはできません。ツールが承認まで届かないようにしたい
場合は、`pre_tool_call` のブロックを使ってください。

### サブエージェントのライフサイクル {#subagent-lifecycle}

サブエージェント系のフックは、委譲された子エージェントの作業を表します。

| フック | 発火するタイミング |
| --- | --- |
| `subagent_start` | 委譲先の子エージェントが作られたとき。 |
| `subagent_stop` | 委譲先の子エージェントが結果を返したか、失敗したとき。 |

`subagent_start` のフィールドには `parent_session_id`、`parent_turn_id`、
`parent_subagent_id`、`child_session_id`、`child_subagent_id`、`child_role`、
`child_goal` があります。

`subagent_stop` のフィールドには、親子のセッション ID、役割と状態のフィールド、
`child_summary`、`duration_ms`、そしてメタデータだけの `tool_call_history` が
あります。履歴の各項目には、ツール名、引数名、範囲を絞った副作用の対象、入出力の
バイト数、結果が入ります。URL のクエリ文字列とフラグメントは取り除かれ、生の引数、
プロンプト、コマンド、内容、ヘッダー、結果は意図的に含めていません。

観測する側はこれらのフックを使って、入れ子になった軌跡を表現しつつ、子エージェントの
実行をそれを生み出した親のターンに結び付けたままにできます。

## ペイロードの安全性 {#payload-safety}

オブザーバーのペイロードは、生のオブジェクトを触るためではなく、テレメトリを受け取る側の
ために設計されています。これから作る利用側では、サニタイズ済みの API ペイロードを
使ってください。

- `pre_api_request.request`
- `post_api_request.response`
- `api_request_error.request`
- `api_request_error.error`

サニタイズでは、プロバイダーのオブジェクトを JSON 互換の構造に変換し、大きな
ペイロードに上限をかけ、機微なキーを伏せ字にし、生の応答オブジェクトが
サニタイズ済みのフィールドに現れないようにします。

`request_messages`、`conversation_history`、`assistant_message` といった
従来互換のフィールドも、既存のプラグインのために残っている場合があります。
これから可観測性を組む側では、サニタイズ済みのペイロードを使ってください。

## 性能 {#performance}

計測を入れていない既定の経路は、軽いままであるべきです。コストのかかる
リクエスト・応答のペイロード構築は `has_hook(...)` で囲まれているので、該当するフックを
登録したプラグインが 1 つ以上ある場合にだけ、Hermes はサニタイズ済みの API テレメトリの
ペイロードを組み立てます。

プラグインを書く側も、この性質を保ってください。

- 実際に使うフックだけを登録します。
- サニタイズ済みのペイロードを深くコピーし直したり、もう一度サニタイズしたりしません。
- フックのコールバックは速く、そして fail-open に保ちます。
- ネットワークへの送出やまとめ書きは、可能なら別の場所へ逃がします。

## オブザーバープラグインを書く {#writing-an-observer-plugin}

最小限のオブザーバープラグインです。

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

スパンを突き合わせるには `session_id`、`turn_id`、`api_request_id`、`tool_call_id`
を使ってください。エクスポート先の形式が入れ子のエージェント作業やセキュリティ関連の
ライフサイクルイベントに対応しているなら、サブエージェント系と承認系のフックも使えます。

## すでに使っている例 {#existing-consumers}

同梱の Langfuse プラグインは、ターン、プロバイダーへのリクエスト、ツール呼び出しについて、
フックを直接使った可観測性の実装例になっています。

NeMo Relay SDK との公式な統合は、Hermes のセッション、ターン、LLM、ツールの各
ライフサイクルを Relay へ対応付けます。Relay のプラグインを明示的に設定すれば、
[ATOF、ATIF、OTEL](https://docs.nvidia.com/nemo/relay/configure-plugins/observability/about)
のエクスポーターや実行ミドルウェアを追加できます。
[Relay の共有メトリクス](/hermes/docs/developer-guide/relay-shared-metrics/)を参照してください。
