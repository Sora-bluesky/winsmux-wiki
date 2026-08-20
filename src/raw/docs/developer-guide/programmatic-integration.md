---
title: "プログラムからの連携"
description: "外部プログラムから hermes-agent を動かすための 3 つのプロトコル: ACP、TUI ゲートウェイの JSON-RPC、OpenAI 互換の HTTP API"
upstream_path: developer-guide/programmatic-integration.md
upstream_blob: 42a603215e0a484a1cebf3bd8f29e6f75ef49dd9
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/programmatic-integration
---

# プログラムからの連携 {#programmatic-integration}

Hermes には、外部のプログラム（IDE のプラグイン、独自の UI、CI のパイプライン、組み込みのサブエージェントなど）からエージェントを動かすためのプロトコルが 3 つあります。通信方式と使う側に合うものを選んでください。

| プロトコル | 通信方式 | 向いている用途 | 定義されている場所 |
|----------|-----------|----------|------------|
| **ACP** | stdio 上の JSON-RPC | すでに [Agent Client Protocol](https://github.com/zed-industries/agent-client-protocol) を話す IDE クライアント（VS Code、Zed、JetBrains） | `acp_adapter/` |
| **TUI ゲートウェイ** | stdio（または WebSocket）上の JSON-RPC | セッション、スラッシュコマンド、承認、イベントの逐次配信を細かく制御したい独自のホスト | `tui_gateway/server.py` |
| **API サーバー** | HTTP + Server-Sent Events | OpenAI 互換のフロントエンド（Open WebUI、LobeChat、LibreChat など）や、言語を問わない Web クライアント | `gateway/platforms/api_server.py` |

3 つとも同じ `AIAgent` の中核を動かします。違うのは通信の形式と、公開している機能の範囲だけです。

---

## ACP（Agent Client Protocol） {#acp-agent-client-protocol}

`hermes acp` は、ACP を話す stdio の JSON-RPC サーバーを起動します。VS Code（Zed Industries の ACP 拡張）、Zed、ACP プラグインを入れた JetBrains 系 IDE で実際に使われています。

公開している機能は、セッションの作成、プロンプトの送信、エージェントのメッセージを少しずつ流すこと、ツール呼び出しのイベント、権限の確認、セッションの分岐、中断、認証です。ツールの出力は、IDE が解釈できる ACP の `Diff` / `ToolCall` のコンテンツブロックとして描画されます。

ライフサイクル、イベントの橋渡し、承認の流れの全体は [ACP の内部構造](/hermes/docs/developer-guide/acp-internals/) を参照してください。

```bash
hermes acp                  # serve ACP on stdio
hermes acp --check          # verify ACP dependencies and adapter imports
hermes acp --setup          # interactive provider/model setup for ACP terminal auth
```

---

## TUI ゲートウェイの JSON-RPC {#tui-gateway-json-rpc}

`tui_gateway/server.py` は、Ink 製の TUI（`hermes --tui`）と、埋め込みダッシュボードの PTY ブリッジが話すプロトコルです。外部のホストも stdio（または `tui_gateway/ws.py` による WebSocket）で同じプロトコルを話せます。

### メソッドの一覧（抜粋） {#method-catalog-selected}

```
prompt.submit           prompt.background       session.steer
session.create          session.list            session.active_list
session.activate        session.close           session.interrupt
session.history         session.compress        session.branch
session.title           session.usage           session.status
clarify.respond         sudo.respond            secret.respond
approval.respond        config.set / config.get commands.catalog
command.resolve         command.dispatch        cli.exec
reload.mcp              reload.env              process.stop
delegation.status       subagent.interrupt      subagent.steer
spawn_tree.save / list / load
terminal.resize         clipboard.paste         image.attach
```

`session.active_list`、`session.activate`、`session.close` は、TUI のセッション切り替えで使う、プロセス内の実行中セッション向けの操作です。保存済みの会話記録を探すときは `session.list` や `/resume` を使い、実行中セッション向けのメソッドは、TUI ゲートウェイのプロセスで今まさに開いているセッションにだけ使ってください。

### `prompt.submit` で履歴を巻き戻す {#rewinding-history-on-promptsubmit}

巻き戻し・編集・再生成は、保存済みの会話記録の一部を消してから新しいターンを実行する `prompt.submit` です。この書き込みは永続化された行を壊す形の書き換えなので、ゲートウェイはクライアントが意図を明示したときにだけ受け付けます。

| パラメータ | 意味 |
|-----------|---------|
| `truncate_before_user_ordinal` | 切り取る位置となる利用者のターンを 0 起点で数えた番号。そのターン以降がすべて消えます。表示専用のタイムライン行（`display_kind`）は数に含まれません。整数でなければならず、JSON の真偽値はコード `4004` で拒否されます。 |
| `truncate_before_row_id` | 切り取る対象となる利用者のターンの SQLite の行 ID（`messages.id` / `row_id`）。永続的な指定方法としてはこちらが推奨です。番号と行 ID の両方を渡した場合、ゲートウェイは一致するかを確認します（一致しなければ `4030` を返します）。存在しない、または古い行 ID は `4018` で拒否され、番号に **フォールバックしません**。 |
| `confirm_truncate` | 番号、メッセージ ID、行 ID のいずれかを送るときは必須です。この送信が本当に巻き戻しであり、パラメータが残ったままの通常の送信ではないことを宣言します。対象を指定せずにこれだけ送るとコード `4004` で拒否されます。 |
| `confirm_empty_truncate` | 切り取りによって会話記録が空になる場合（番号が `0`）に、さらに必要になります。 |

`confirm_truncate` を伴わない切り取りのパラメータは、コード `4004` または `4029` で拒否され、何も書き込まれません。巻き戻しを実装するホストは、利用者がそれを求めた時点でこのフラグを立てる必要があり、通常の送信をまたいで切り取りのパラメータを保持し続けてはいけません。番号よりも `truncate_before_row_id`（再開時の `row_id` / `_row_id` から得られます）を使い、永続的な ID がまだ手元にない場合の後方互換や暫定の手段としてのみ番号を残してください。

永続化されたセッションに対して切り取りを伴う送信が成功すると、`prompt.submit` の結果には `survivor_user_row_ids` も含まれます。これは書き換え後に残った利用者のターンの新しい行 ID を、画面上の並び順で並べたものです。書き換えでは残す部分を新しい行として入れ直すため、巻き戻し前にホストが覚えていた行 ID はすべて古くなります。この一覧で覚えている ID を結び直してください（`null` の要素は、そのターンに永続的な ID がないことを意味するので、覚えている ID は捨てます）。そうしないと、次に古いターンを対象に巻き戻したときに `4018` で拒否されます。

### 返ってくるイベント {#events-streamed-back}

`message.delta`、`message.complete`、`tool.start`、`tool.progress`、`tool.complete`、`approval.request`、`clarify.request`、`sudo.request`、`sudo.expire`、`secret.request`、`secret.expire`、`gateway.ready` のほか、セッションのライフサイクルとエラーのイベントがあります。期限切れのイベントには元の `{ request_id }` が付くので、外部のホストは対応する保留中の要求だけを消してください。

### Pi 形式の RPC との対応 {#pi-style-rpc-mapping}

Pi-mono の RPC 仕様（[issue #360](https://github.com/NousResearch/hermes-agent/issues/360)）にあるコマンドは、すべて TUI ゲートウェイに対応するものがあります。

| Pi のコマンド | Hermes での対応 |
|------------|-------------------|
| `prompt` | `prompt.submit`（または ACP の `session/prompt`） |
| `steer` | `session.steer` |
| `follow_up` | 現在のターンの後ろに積まれる `prompt.submit` |
| `abort` | `session.interrupt` |
| `set_model` | `/model <provider:model>` の `command.dispatch`（セッションの途中で切り替わり、以後も保持されます） |
| `compact` | `session.compress` |
| `get_state` | `session.status` |
| `get_messages` | `session.history` |
| `switch_session` | `session.resume` |
| `fork` | `session.branch` |
| `ui_request` / `ui_response` | `clarify.respond` / `sudo.respond` / `secret.respond` / `approval.respond` |

---

## OpenAI 互換の API サーバー {#openai-compatible-api-server}

`gateway/platforms/api_server.py` は、すでに OpenAI の形式を話すクライアント向けに、hermes を HTTP で公開します。Web のフロントエンド、curl で動かす CI ランナー、Python 以外から使いたい場合に便利です。

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
GET  /v1/models                  Lists hermes-agent
GET  /api/model/options          Provider-aware picker inventory
GET  /health, /health/detailed
```

セットアップ、ヘッダ（`X-Hermes-Session-Id`、`X-Hermes-Session-Key`）、フロントエンドとのつなぎ方は [API サーバー](/hermes/docs/user-guide/features/api-server/) を参照してください。

### モデル一覧を返す口 {#model-catalog-surfaces}

OpenAI 互換の API では、`GET /v1/models` をあえて最小限にとどめています。これは
フロントエンドが期待する互換のためのエンドポイントであって、Hermes の
プロバイダ・モデル選択の一覧そのものではありません。

外部の管理画面などから Hermes が用意したプロバイダの一覧、モデルごとの
価格、対応機能の情報が必要な場合は、認証付きの次のいずれかを使ってください。

- API サーバーの REST: API サーバーのベアラーキーを付けた `GET /api/model/options`
- ダッシュボードのバックエンドの REST: `X-Hermes-Session-Token` を付けた `GET /api/model/options`
- TUI ゲートウェイの RPC: `model.options`

これらはどれも同じ組み立て処理を共有し、独自プロバイダの
探索の方針も共通です。

- 通常の表示: 現在の独自プロバイダだけを確認します。保存済みでも
  接続できないエンドポイントで一覧が止まらないようにするためです。
- 明示的な更新（`refresh=1` または `refresh: true`）: プロバイダのモデル
  キャッシュを破棄し、保存済みの独自プロバイダをすべて確認して、最新の一覧を取り直します。

OpenAI のクライアントとの互換のためには `/v1/models` を、Hermes を前提としたモデル選択画面を作るときは `/api/model/options` または
`model.options` を使ってください。

`POST /v1/runs/{id}/steer` は Hermes の `/steer` を HTTP にしたものです。新しい利用者のターンを作ることも、すでに生成中のアシスタントの出力をその場で書き換えることもしません。送ったテキストは実行中の処理に追加され、次のツールの区切りでエージェントから見えるようになります。今動いているツール呼び出しのループを捨てずに、進む方向を直せます。

`/v1/runs/{id}/steer` は、実行の状態が `running` のときだけ受け付けます。待機中、承認待ちで止まっている、停止処理中、取り消し済み、失敗、完了の状態では `409 run_not_accepting_steer` を返します。協調的な終了処理の途中でサーバー内部にエージェントの参照が残っていても同じです。

`200`（および `run.steered` イベント）は、テキストが **積まれた** ことを意味するだけで、エージェントがそれを受け取ったという意味ではありません。エージェントの最終応答の後に届いてしまい、渡せるツールの区切りがもう無い場合、渡せなかったテキストは終了時の `run.completed` イベントと実行状態に `pending_steer` として返されます。クライアントはそれを失わずに、次の利用者のターンとして送り直せます。

---

## どれを使えばよいか {#which-one-should-i-use}

- **IDE のプラグインを書いていて、その IDE がすでに ACP を話す** → ACP。IDE 側でプロトコルの実装は要りません。
- **独自のデスクトップ / Web / TUI ホストを書いていて、Hermes の機能をすべて使いたい**（スラッシュコマンド、承認、確認の問い合わせ、マルチエージェント、セッションの分岐）→ TUI ゲートウェイの JSON-RPC。
- **OpenAI 互換のフロントエンド、言語を問わない HTTP クライアント、curl による自動化を使いたい** → API サーバー。
- **サブプロセスを挟まずに Python へ直接組み込みたい** → `run_agent.AIAgent` をそのまま import してください。[エージェントループ](/hermes/docs/developer-guide/agent-loop/) を参照してください。

---

## 実行中のモデル切り替え {#model-hot-swapping}

セッションの途中でモデルを切り替える機能は、どの経路でも使えます。中身は `/model` スラッシュコマンドです。

- **CLI / TUI:** `/model claude-sonnet-4` または `/model openrouter:anthropic/claude-sonnet-4.6`
- **TUI ゲートウェイの RPC:** `{"command": "/model claude-sonnet-4"}` を付けた `command.dispatch`
- **ACP:** IDE がスラッシュコマンドをプロンプトとして送り、エージェントがそれを処理します
- **API サーバー:** リクエストの本文に `model` フィールドを含めます

プロバイダを意識した解決（同じモデル名から、今使っているプロバイダに合った形式を選ぶ）も組み込まれています。`hermes_cli/model_switch.py` を参照してください。

---

## `--mode rpc` について {#a-note-on---mode-rpc}

Hermes に `--mode rpc` というフラグはありません。上の 3 つのプロトコルで用途はすでにまかなえます。IDE のプロトコルを話すクライアントには ACP、stdio の JSON-RPC ホストには TUI ゲートウェイ、HTTP には API サーバーです。どれでも足りない場面が本当にあれば、作ろうとしている具体的な利用者像を添えて issue を立ててください。
