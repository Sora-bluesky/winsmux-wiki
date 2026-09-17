---
title: "外部プログラムからの連携"
description: "hermes-agent を外部プログラムから動かすための 3 つのプロトコル: ACP、TUI ゲートウェイの JSON-RPC、OpenAI 互換の HTTP API"
upstream_path: developer-guide/programmatic-integration.md
upstream_blob: 505cf5accc8cb628d3f9620dae03ce645e2c867c
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/programmatic-integration
---

# 外部プログラムからの連携 {#programmatic-integration}

Hermes には、エージェントを外部のプログラム（IDE プラグイン、自作の UI、CI パイプライン、組み込みのサブエージェントなど）から動かすためのプロトコルが 3 つ用意されています。使っている通信方式と、動かす側のプログラムに合うものを選んでください。

| プロトコル | 通信方式 | 向いている用途 | 実装場所 |
|----------|-----------|----------|------------|
| **ACP** | stdio 上の JSON-RPC | すでに [Agent Client Protocol](https://github.com/zed-industries/agent-client-protocol) を話せる IDE クライアント（VS Code、Zed、JetBrains） | `acp_adapter/` |
| **TUI ゲートウェイ** | stdio 上の JSON-RPC（または WebSocket） | セッション、スラッシュコマンド、承認、ストリーミングイベントを細かく制御したい自作のホスト | `tui_gateway/server.py` |
| **API サーバー** | HTTP + Server-Sent Events | OpenAI 互換のフロントエンド（Open WebUI、LobeChat、LibreChat など）や、言語を問わない Web クライアント | `gateway/platforms/api_server.py` |

3 つとも動かしているのは同じ `AIAgent` の中核です。違うのは通信の形式と、どこまでの機能を外に見せるかだけです。

---

## ACP（Agent Client Protocol） {#acp-agent-client-protocol}

`hermes acp` を実行すると、ACP を話す stdio の JSON-RPC サーバーが起動します。VS Code（Zed Industries の ACP 拡張）、Zed、ACP プラグインを入れた JetBrains 系 IDE で実際に使われています。

外に見せている機能は、セッションの作成、プロンプトの送信、エージェントのメッセージの逐次配信、ツール呼び出しのイベント、許可の要求、セッションの分岐、中断、そして認証です。ツールの出力は、IDE が解釈できる ACP の `Diff` / `ToolCall` の内容ブロックとして描画されます。

ライフサイクル、イベントの橋渡し、承認の流れの全体は [ACP の内部構造](/hermes/docs/developer-guide/acp-internals/) を参照してください。

```bash
hermes acp                  # serve ACP on stdio
hermes acp --check          # verify ACP dependencies and adapter imports
hermes acp --setup          # interactive provider/model setup for ACP terminal auth
```

---

## TUI ゲートウェイの JSON-RPC {#tui-gateway-json-rpc}

`tui_gateway/server.py` は、Ink 製の TUI（`hermes --tui`）と、ダッシュボードに組み込まれた PTY ブリッジが話している相手です。外部のホストからでも、stdio 越し（または `tui_gateway/ws.py` を使った WebSocket 越し）に同じプロトコルで話しかけられます。

### メソッド一覧（抜粋） {#method-catalog-selected}

```
prompt.submit           prompt.background       session.steer
session.create          session.list            session.active_list
session.activate        session.close           session.interrupt
session.history         session.compress        session.branch
session.title           session.usage           session.status
clarify.lock            config.set / config.get commands.catalog
client.capabilities     gateway.capabilities    ping
command.resolve         command.dispatch        cli.exec
reload.mcp              reload.env              process.stop
delegation.status       subagent.interrupt      subagent.steer
spawn_tree.save / list / load
terminal.resize         clipboard.paste         image.attach
```

`session.active_list`、`session.activate`、`session.close` は、TUI のセッション切り替えが使う「そのプロセスの中で今動いているセッション」を操作するためのものです。保存済みの記録を探すときは `session.list` や `/resume` を使い、これらのメソッドは TUI ゲートウェイのプロセスで現在開いているセッションにだけ使ってください。

同じ認証済みゲートウェイの中では、動いているセッションを再開したり呼び出したりしても、前の接続が置き換わるのではなく、イベントの受け取り手がもう一つ増えるだけです。ストリーミングと端末のイベントは接続中のすべてのクライアントに届き、片方のクライアントが切断しても、別のクライアントが見ているセッションは終わりません。送信の排他制御と、設定された「実行中の入力の扱い」の方針はそのまま生きています。接続しているクライアントはそのセッションのサブエージェントに指示を差し込めますが、ブラウザーコントローラーの結果を受け取れるのは、そのコントローラーを登録した接続だけです。これは、別々のゲートウェイのプロセスが同じセッションに書き込めるようになるという意味ではありませんし、持ち主のプロセスを再起動してもプロンプトの受け付けが残るという意味でもありません。

### `prompt.submit` で履歴を巻き戻す {#rewinding-history-on-promptsubmit}

巻き戻し・編集・やり直しは、保存済みの記録の一部を捨ててから新しいターンを走らせる `prompt.submit` です。この書き込みはセッションの永続的な行を壊す書き換えになるので、ゲートウェイはクライアントがその意図を明示したときにだけ受け付けます。

| パラメーター | 意味 |
|-----------|---------|
| `truncate_before_user_ordinal` | どのユーザーのターンで切るかを 0 始まりで指定します。そのターン以降はすべて捨てられます。表示専用のタイムラインの行（`display_kind`）は数に入りません。必ず整数で指定してください。JSON の真偽値を渡すとコード `4004` で拒否されます。 |
| `truncate_before_row_id` | 切る対象のユーザーのターンを指す SQLite の整数の行 ID（`messages.id` / `row_id`）です。永続的な指定方法としてはこちらが望ましい形です。序数と行 ID の両方が渡された場合、ゲートウェイは両者が一致するか確認します（食い違えば `4030` を返します）。存在しない行 ID や古い行 ID は `4018` で拒否され、序数へ**戻ることはありません**。 |
| `confirm_truncate` | 序数、メッセージ ID、行 ID のいずれかを送るときは必ず必要です。この送信が本当に巻き戻しであって、残っていたパラメーターをたまたま抱えたままの通常の送信ではないことを宣言します。対象を指定せずにこれだけ送るとコード `4004` で拒否されます。 |
| `confirm_empty_truncate` | 切った結果、記録が空になる場合（序数 `0`）に追加で必要です。 |

`confirm_truncate` の付いていない切り詰めのパラメーターはコード `4004` または `4029` で拒否され、何も書き込まれません。巻き戻しを実装するホストは、利用者がそれを求めたその瞬間にフラグを立てる必要があり、通常の送信をまたいで切り詰めのパラメーターを状態として持ち越してはいけません。序数よりも `truncate_before_row_id`（再開時の `row_id` / `_row_id` から取れます）を優先し、序数は永続的な ID がまだ得られないときの互換用・暫定用の経路としてだけ残してください。

永続的なセッションに対して切り詰めを伴う送信が成功すると、`prompt.submit` の結果には `survivor_user_row_ids` も付いてきます。これは、残ったユーザーのターンの書き換え後の新しい行 ID を、画面に見えるユーザーの順番どおりに並べたものです。書き換えでは残す前半部分を新しい行として入れ直すため、巻き戻しの前にホストが覚えていた行 ID はすべて古くなります。このリストで覚え直してください（`null` の項目はそのターンに永続的な ID がないという意味なので、覚えていたものを捨てます）。そうしないと、次にもっと古い残存ターンを狙って巻き戻したときに `4018` で拒否されます。

### 返ってくるイベント {#events-streamed-back}

`message.delta`、`message.complete`、`tool.start`、`tool.generating`、`tool.complete`、`gateway.ready`、`request.cancel` に加えて、セッションのライフサイクルとエラーのイベントが流れてきます。

### サーバーからクライアントへの要求（エージェントからの質問） {#serverclient-requests-questions-the-agent-asks-you}

承認、確認の質問、sudo やシークレットの入力、保管庫のロック解除、MCP の設定、デスクトップの読み取り・操作の橋渡しは、イベントではなく **ゲートウェイからクライアントへ送られる JSON-RPC の要求** です。フレームには文字列の id が入っていて、クライアントは同じ id を付けた通常の JSON-RPC 応答で答えます。

```
← {"jsonrpc":"2.0","id":"srq-7","method":"approval","params":{"session_id":"…","request_id":"…","command":"rm -rf build","description":"…"}}
→ {"jsonrpc":"2.0","id":"srq-7","result":{"choice":"once"}}
```

メソッドと返す値は次のとおりです。`approval` → `{choice}`。`clarify` → `{answer}`（単一の質問）、または `{answers}` / 取り消しなら `{}`（まとめて聞く場合。`clarify.lock` で答えを 1 つ先に確定できます）。`sudo`、`secret`、`vault.code`、`vault.unlock_prompt` → `{value}`。`connection` → `{settled_by, targets}`（`manage_connections` のカードで、対象ごとに結果が 1 つ）。`terminal.read`、`window.read`、`preview.act`、`tour` → `{value}`（JSON のテキスト）。ホストが実装していないメソッドには JSON-RPC のエラー（`-32601`）を返してください。そうすればエージェントはタイムアウトまで待たずにすぐ失敗を受け取れます。

**答えられることを宣言してください（既存の WebSocket 連携にとっては壊れる変更です）。** 接続ごとに 1 回、`gateway.ready` のあとで `client.capabilities` を `{"server_requests": true}` を付けて呼びます。結果には、このバックエンドが送ることのあるリクエストのメソッドが並びます。一度も呼ばない WebSocket のクライアントは、サーバーからクライアントへのリクエストが入る前の古いビルドとみなされ、ゲートウェイはそのクライアント宛てのリクエストをすべてその場で失敗させます（エージェントから見えるのは、エラーで応答されたときと同じ「答えがない」状態です。承認は拒否ではなく取り下げの扱いになります）。締め切りいっぱい待たされることはありません。猶予の経路はありません。この変更の前は `clarify` や `approval`、`sudo` などに答えられていた他社製の WebSocket クライアントでも、`client.capabilities` の呼び出しを 1 つ足さないかぎり、そうしたリクエストは今後すべて断られます。クライアントがつながっていないセッションは影響を受けません。開いたままの質問は `open_requests` に入り、再接続時の再送を待ちます。標準入出力の TUI、デスクトップアプリ、ダッシュボードは、共通の `JsonRpcRequestChannel` を通して宣言しています。

ゲートウェイが質問を取り下げたとき（タイムアウト、中断、別の画面で回答済みなど）は `request.cancel` `{ id, method, reason }` が送られてきます。対応する質問だけを消してください。`session.resume` / `session.activate` の結果と `session.events.since` には、まだ開いているフレームの一覧 `open_requests` が入っているので、再接続したクライアントはそれを表示し直し、そのまま答えることもできます。

### 再接続したときに、進行中のやり取りを組み立て直す {#rebuilding-the-in-flight-turn-on-reconnect}

`session.resume` / `session.activate` の結果には `inflight` が入っています。まだ動いているやり取り（または失敗して保持されているやり取り）のことで、履歴にはまだ入っていないものです。中身は `user`、そこまで配信された `assistant`、`streaming`、やり取りの途中での `corrections`、そしてエラーの項目です。人が入力したのではなくゲートウェイが始めたやり取り（裏で動いていた処理の完了、非同期で任せた作業の結果、表に出さない下準備のプロンプト）の場合、`inflight` には、保存される `messages` の行に付くのと同じ `display_kind` / `display_metadata` も入ります。そのため、やり取りが終わって履歴になったあとの見え方と、いま動いている最中の見え方を、クライアントがぴったり同じにできます。`process_complete` なら `display_metadata.display_text` を使ったタイムラインの印が出て、`hidden` なら何も出ません。本当に利用者が入力したときは、この 2 つの項目はどちらもありません。プロンプトの文面から出どころを推測しないでください（利用者が印の文字列を引用しただけでも、それは利用者の入力です）。

### Pi 方式の RPC との対応 {#pi-style-rpc-mapping}

Pi-mono の RPC 仕様（[issue #360](https://github.com/NousResearch/hermes-agent/issues/360)）にあるコマンドには、すべて TUI ゲートウェイ側の対応物があります。

| Pi のコマンド | Hermes での対応 |
|------------|-------------------|
| `prompt` | `prompt.submit`（または ACP の `session/prompt`） |
| `steer` | `session.steer` |
| `follow_up` | 今のターンの後ろに並べる `prompt.submit` |
| `abort` | `session.interrupt` |
| `set_model` | `/model <provider:model>` を渡す `command.dispatch`（セッションの途中で切り替わり、以後も残ります） |
| `compact` | `session.compress` |
| `get_state` | `session.status` |
| `get_messages` | `session.history` |
| `switch_session` | `session.resume` |
| `fork` | `session.branch` |
| `ui_request` / `ui_response` | サーバーからクライアントへの要求 `clarify` / `sudo` / `secret` / `approval` に、JSON-RPC の応答フレームで答える |

---

## OpenAI 互換の API サーバー {#openai-compatible-api-server}

`gateway/platforms/api_server.py` は、すでに OpenAI の形式を話せるクライアントのために、hermes を HTTP で公開します。Web のフロントエンドを付けたいとき、curl で回す CI のランナーを作りたいとき、Python 以外から使いたいときに便利です。

エンドポイントは次のとおりです。

```
POST /v1/chat/completions        OpenAI Chat Completions (streaming via SSE)
POST /v1/responses               OpenAI Responses API (stateful)
POST /v1/runs                    Start a run, returns run_id (202)
GET  /v1/runs/{id}               Run status
GET  /v1/runs/{id}/events        SSE stream of lifecycle events
POST /v1/runs/{id}/approval      Resolve a pending approval
POST /v1/runs/{id}/steer         Inject mid-run guidance at the next tool boundary
POST /v1/runs/{id}/stop          Interrupt the run
GET  /v1/capabilities            Machine-readable feature flags
POST /v1/browser-control/register Register a browser controller
GET  /v1/browser-control/ws       Browser-controller WebSocket
GET  /v1/models                  Lists hermes-agent
GET  /api/model/options          Provider-aware picker inventory
GET  /health, /health/detailed
```

準備の手順、ヘッダー（`X-Hermes-Session-Id`、`X-Hermes-Session-Key`）、フロントエンドとのつなぎ方は [API サーバー](/hermes/docs/user-guide/features/api-server/) にあります。

ブラウザーの拡張機能は、既定では無効になっているコントローラーのプロトコルを
自分から有効にして、Hermes の会話を開いたそのブラウザーのセッションを操作できます。API と
ダッシュボードは、principal に結び付いた 1 つの仲介役と、明示的に許可された
機能の一覧を共有しています。[ブラウザー拡張機能からの操作](/hermes/docs/user-guide/features/api-server/#browser-extension-control) を参照してください。

### モデル一覧が見られる場所 {#model-catalog-surfaces}

OpenAI 互換の API では、`GET /v1/models` はあえて最小限にしてあります。ここは
フロントエンドが期待する互換用のエンドポイントであって、Hermes の
プロバイダーとモデルを選ぶための全一覧ではありません。

外部の管理側で、Hermes が整えたプロバイダーの行、モデルごとの料金、
機能のヒントが必要なときは、認証付きの次のいずれかを使ってください。

- API サーバーの REST: API サーバーの bearer キーを付けた `GET /api/model/options`
- ダッシュボードのバックエンドの REST: `X-Hermes-Session-Token` を付けた `GET /api/model/options`
- TUI ゲートウェイの RPC: `model.options`

これらは同じ組み立て処理と、同じ独自プロバイダーの
探索方針を共有しています。

- 通常の表示: 今の独自プロバイダーだけを探索します。オフラインで保存された
  接続先が選択画面を止めてしまわないようにするためです。
- 明示的な再読み込み（`refresh=1` または `refresh: true`）: プロバイダーのモデルの
  キャッシュを捨て、保存済みの独自プロバイダーをすべて探索して、最新の一覧を丸ごと入れ直します。

OpenAI のクライアントとの互換のためには `/v1/models` を、Hermes を前提としたモデルの選択画面を作るときは `/api/model/options` か
`model.options` を使ってください。

`POST /v1/runs/{id}/steer` は Hermes の `/steer` を HTTP にしたものです。新しいユーザーのターンを作るわけでも、すでに流れ始めているエージェントの出力をその場で書き換えるわけでもありません。渡した文章は動いている実行に追加され、次にツールの区切りが来たところでエージェントの目に入ります。今のツール呼び出しの流れを捨てずに、進む方向を直せるということです。

`/v1/runs/{id}/steer` を受け付けるのは、実行の状態が `running` のあいだだけです。待機中、承認待ちで止まっている、停止処理中、取り消し済み、失敗、完了の実行は `409 run_not_accepting_steer` を返します。行儀よく終了している途中で、サーバーがまだ内部的にエージェントへの参照を持っていても同じです。

`200` が返り `run.steered` のイベントが出たということは、その文章が**列に並んだ**という意味であって、エージェントが読んだという意味ではありません。エージェントの最終応答より後に届いてしまい、渡すためのツールの区切りがもう来ない場合、届かなかった文章は終了時のイベント（`run.completed`、`run.failed`、`run.cancelled` のいずれか）と実行の状態に `pending_steer` として返ります。クライアントはそれを捨てずに、次のユーザーのターンとして送り直せます。

#### 実行の終了状態 {#terminal-run-status}

実行の終了状態は、エージェントのターンが実際にどう終わったかから決まり、終了時のイベント名は必ずそれと一致します（`run.<status>`）:

| ターンの終わり方 | 状態 | 終了時のイベント | イベント / 状態に付くフラグ |
|---|---|---|---|
| 最終的な回答を出した | `completed` | `run.completed` | `completed: true` |
| 中断された（`/stop`、またはエージェント内部での中断） | `cancelled` | `run.cancelled` | `completed: false`、`interrupted: true`、それに誰が止めたかを示す `turn_exit_reason`。人が止めたときは `interrupted_by_user`、見張り役（`cron_inactivity_watchdog`、`turn_liveness_watchdog`、`gateway_inactivity_watchdog`、`session_turn_lease_lost` など）が終わらせたときは `interrupted_by_system(<issuer>)` / `interrupted_during_api_call(<issuer>)` |
| プロバイダーまたはエージェントの失敗 | `failed` | `run.failed` | `completed: false`、`error` |
| 終わりきらずに止まった（反復回数の上限、途中で切れた返答や部分的な返答） | `failed` | `run.failed` | `completed: false`、該当する場合は `partial`、`turn_exit_reason`（例: `max_iterations_reached(60/60)`）、代わりの文章があれば `output` |

同じ内容の中で、`completed` と報告しつつ `completed: false` や `partial: true` が付くことはありません。同じ決まりは `/api/sessions/{id}/chat/stream` にも当てはまります。こちらの `assistant.completed` の内容には本当の `completed` / `partial` / `interrupted` のフラグが入り、終了時のイベントは `run.completed`、`run.failed`、`run.cancelled` のいずれかになります。

---

## どれを使えばよいのか {#which-one-should-i-use}

- **IDE プラグインを書いていて、その IDE がすでに ACP を話す** → ACP。IDE 側でプロトコルの実装は要りません。
- **自作のデスクトップ / Web / TUI ホストを書いていて、Hermes の機能を全部使いたい**（スラッシュコマンド、承認、確認の問い返し、マルチエージェント、セッションの分岐） → TUI ゲートウェイの JSON-RPC。
- **OpenAI 互換のフロントエンド、言語を問わない HTTP クライアント、curl で回す自動化を使いたい** → API サーバー。
- **別プロセスを立てずに Python の中へ直接組み込みたい** → `run_agent.AIAgent` をそのまま import します。[エージェントのループ](/hermes/docs/developer-guide/agent-loop/) を参照してください。

---

## モデルを動かしたまま切り替える {#model-hot-swapping}

セッションの途中でのモデル切り替えは、どの入口でも使えます。中身はどれも `/model` のスラッシュコマンドです。

- **CLI / TUI:** `/model claude-sonnet-4` または `/model openrouter:anthropic/claude-sonnet-4.6`
- **TUI ゲートウェイの RPC:** `{"command": "/model claude-sonnet-4"}` を渡した `command.dispatch`
- **ACP:** IDE がスラッシュコマンドをプロンプトとして送り、エージェントがそれを実行します
- **API サーバー:** リクエストの本文に `model` の項目を入れます

プロバイダーを踏まえた解決（同じモデル名を書けば、今のプロバイダーに合った形式が選ばれる仕組み）も入っています。`hermes_cli/model_switch.py` を参照してください。

---

## `--mode rpc` について {#a-note-on---mode-rpc}

Hermes に `--mode rpc` というフラグはありません。上の 3 つのプロトコルで用途は足りているからです。IDE のプロトコルを話すクライアントには ACP、stdio の JSON-RPC ホストには TUI ゲートウェイ、HTTP には API サーバーです。どれでも埋まらない穴が本当に見つかったら、作ろうとしている具体的な使い道を添えて issue を立ててください。
