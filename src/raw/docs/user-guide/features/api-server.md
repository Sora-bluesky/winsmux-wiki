---
title: "API サーバー"
description: "hermes-agent を OpenAI 互換の API として公開し、どんなフロントエンドからでも使えるようにします"
upstream_path: user-guide/features/api-server.md
upstream_blob: 36b6e1c7c039fb3adfb01fbe5d664b6e63c73113
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/api-server
---

# API サーバー {#api-server}

API サーバーは、hermes-agent を OpenAI 互換の HTTP のエンドポイントとして公開します。OpenAI の形式を話せるフロントエンドなら何でも、つまり Open WebUI、LobeChat、LibreChat、NextChat、ChatBox をはじめ何百というものが、hermes-agent につないでこれを裏側として使えます。

エージェントは、持っている道具ひとそろい（ターミナル、ファイル操作、ウェブ検索、記憶、スキル）を使ってリクエストに応え、最終的な返答を返します。逐次送りのときは、ツールの進み具合を示すしるしが文中に現れるので、フロントエンド側はエージェントがいま何をしているかを見せられます。

:::tip 裏側ひとつでモデルもツールも揃います
API サーバーを役立てるには、Hermes 自身に設定済みの提供元とツールの裏側が要ります。[Nous Portal](/hermes/docs/user-guide/features/tool-gateway/) の購読なら両方まかなえます。300 以上のモデルに加えて、ウェブ・画像・読み上げ・ブラウザがツールゲートウェイ経由で使えます。API サーバーを立ち上げる前に `hermes setup --portal` を一度実行しておけば、Open WebUI や LobeChat といったフロントエンドから、道具の揃った裏側につながります。
:::

## まずは動かす {#quick-start}

### 1. API サーバーを有効にする {#1-enable-the-api-server}

`~/.hermes/.env` に次を足します。

```bash
API_SERVER_ENABLED=true
API_SERVER_KEY=change-me-local-dev
# Optional: only if a browser must call Hermes directly
# API_SERVER_CORS_ORIGINS=http://localhost:3000
```

### 2. ゲートウェイを起動する {#2-start-the-gateway}

```bash
hermes gateway
```

こう表示されます。

```
[API Server] API server listening on http://127.0.0.1:8642
```

### 3. フロントエンドをつなぐ {#3-connect-a-frontend}

OpenAI 互換のクライアントを `http://localhost:8642/v1` に向けます。

```bash
# Test with curl
curl http://localhost:8642/v1/chat/completions \
  -H "Authorization: Bearer change-me-local-dev" \
  -H "Content-Type: application/json" \
  -d '{"model": "hermes-agent", "messages": [{"role": "user", "content": "Hello!"}]}'
```

Open WebUI や LobeChat、そのほかのフロントエンドにもつなげます。手順を追った説明は [Open WebUI との連携ガイド](/hermes/docs/user-guide/messaging/open-webui/) を見てください。

## エンドポイント {#endpoints}

### POST /v1/chat/completions {#post-v1chatcompletions}

OpenAI の Chat Completions の標準的な形式です。状態を持たず、会話の全体が毎回のリクエストの `messages` の配列に入ります。

**リクエスト:**
```json
{
  "model": "hermes-agent",
  "messages": [
    {"role": "system", "content": "You are a Python expert."},
    {"role": "user", "content": "Write a fibonacci function"}
  ],
  "stream": false
}
```

**レスポンス:**
```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1710000000,
  "model": "hermes-agent",
  "choices": [{
    "index": 0,
    "message": {"role": "assistant", "content": "Here's a fibonacci function..."},
    "finish_reason": "stop"
  }],
  "usage": {"prompt_tokens": 50, "completion_tokens": 200, "total_tokens": 250}
}
```

**文中への画像の入力:** 利用者からのメッセージでは、`content` を `text` と `image_url` の部品の配列として送れます。遠隔の `http(s)` の URL も、`data:image/...` の URL も使えます。

```json
{
  "model": "hermes-agent",
  "messages": [
    {
      "role": "user",
      "content": [
        {"type": "text", "text": "What is in this image?"},
        {"type": "image_url", "image_url": {"url": "https://example.com/cat.png", "detail": "high"}}
      ]
    }
  ]
}
```

アップロードしたファイル（`file` / `input_file` / `file_id`）と、画像以外の `data:` の URL は `400 unsupported_content_type` を返します。

**逐次送り**（`"stream": true`）: Server-Sent Events（SSE）で、返答をトークンごとの塊にして返します。**Chat Completions** では標準の `chat.completion.chunk` のイベントに加えて、ツールの開始を見せるための Hermes 独自の `hermes.tool.progress` イベントを使います。**Responses** では、`response.created`、`response.output_text.delta`、`response.output_item.added`、`response.output_item.done`、`response.completed` といった OpenAI Responses のイベント型を使います。

**逐次送りでのツールの進み具合**:
- **Chat Completions**: Hermes は `event: hermes.tool.progress` を出します。保存されるアシスタントの文章を汚さずに、ツールの開始を見せるためです。
- **Responses**: Hermes は SSE の流れのなかで、仕様どおりの `function_call` と `function_call_output` という出力項目を出します。クライアント側はツールの様子を構造化した画面として、その場で描けます。

### POST /v1/responses {#post-v1responses}

OpenAI Responses API の形式です。`previous_response_id` によるサーバー側での会話の保持に対応しています。サーバーが会話の履歴（ツールの呼び出しと結果も含めて）をまるごと保存するので、クライアントが管理しなくても何往復もの文脈が保たれます。

**リクエスト:**
```json
{
  "model": "hermes-agent",
  "input": "What files are in my project?",
  "instructions": "You are a helpful coding assistant.",
  "store": true
}
```

**レスポンス:**
```json
{
  "id": "resp_abc123",
  "object": "response",
  "status": "completed",
  "model": "hermes-agent",
  "output": [
    {"type": "function_call", "status": "completed", "name": "terminal", "arguments": "{\"command\": \"ls\"}", "call_id": "call_1"},
    {"type": "function_call_output", "status": "completed", "call_id": "call_1", "output": "README.md src/ tests/"},
    {"type": "message", "role": "assistant", "content": [{"type": "output_text", "text": "Your project has..."}]}
  ],
  "usage": {"input_tokens": 50, "output_tokens": 200, "total_tokens": 250}
}
```

`output` の配列に入っているツールの呼び出しは、すでに Hermes のエージェントがサーバー側で実行し終えたものです。構造化した画面のために `"status": "completed"` で再生されるだけで、クライアントがこれから実行すべき保留中の呼び出しではありません。

**文中への画像の入力:** `input[].content` には `input_text` と `input_image` の部品を入れられます。遠隔の URL も `data:image/...` の URL も使えます。

```json
{
  "model": "hermes-agent",
  "input": [
    {
      "role": "user",
      "content": [
        {"type": "input_text", "text": "Describe this screenshot."},
        {"type": "input_image", "image_url": "data:image/png;base64,iVBORw0K..."}
      ]
    }
  ]
}
```

アップロードしたファイル（`input_file` / `file_id`）と、画像以外の `data:` の URL は `400 unsupported_content_type` を返します。

#### previous_response_id で何往復もする {#multi-turn-with-previousresponseid}

レスポンスを数珠つなぎにすれば、ツールの呼び出しも含めた文脈を往復のあいだ保てます。

```json
{
  "input": "Now show me the README",
  "previous_response_id": "resp_abc123"
}
```

サーバーは、保存されたレスポンスのつながりから会話の全体を組み直します。それまでのツールの呼び出しと結果はすべて残ります。つながったリクエストは同じセッションも共有するので、何往復もの会話がダッシュボードやセッションの履歴では 1 件として見えます。

#### 名前を付けた会話 {#named-conversations}

レスポンスの ID を追いかける代わりに、`conversation` のパラメータを使えます。

```json
{"input": "Hello", "conversation": "my-project"}
{"input": "What's in src/?", "conversation": "my-project"}
{"input": "Run the tests", "conversation": "my-project"}
```

サーバーが、その会話のなかで最新のレスポンスに自動でつなぎます。ゲートウェイのセッションでの `/title` コマンドと似た使い心地です。

### GET /v1/responses/\{id\} {#get-v1responsesid}

保存済みのレスポンスを ID で取り出します。

### DELETE /v1/responses/\{id\} {#delete-v1responsesid}

保存済みのレスポンスを消します。

### GET /v1/models {#get-v1models}

エージェントを、使えるモデルとして一覧に出します。表に出るモデル名は、既定では[プロファイル](/hermes/docs/user-guide/profiles/)の名前です（既定のプロファイルなら `hermes-agent`）。たいていのフロントエンドが、モデルを見つけるためにこれを必要とします。

`/v1/models` は、あえて軽い OpenAI 互換の窓口にしてあります。Hermes が振り分けられる提供元とモデルの組み合わせを
すべて並べたりは**しませんし**、
価格や機能の情報を足したりもしません。

### GET /api/model/options {#get-apimodeloptions}

Hermes を分かっているクライアントなら、ダッシュボードや TUI が使っているのと同じ、
選り分けられた提供元とモデルの一覧を求められます。この経路は API サーバーのふつうの bearer
認証を使い、OpenAI 互換の `/v1/models` の応答には入れるべきでない情報、つまり提供元の行、
モデルの機能の手がかり、価格の情報を返します。

```bash
curl \
  -H "Authorization: Bearer $API_SERVER_KEY" \
  "http://127.0.0.1:8642/api/model/options"
```

この中身は、ダッシュボードの Models のページや TUI の
`model.options` の RPC が使っているのと同じ土台です。認証済みの提供元、選り分けられたモデルの
一覧、モデルごとの価格、モデルの機能の手がかりが返ります。

ふつうに開いたときは、自作の提供元に対してあえて控えめに動きます。Hermes が確かめに行くのは
**いま選ばれている**自作のエンドポイントだけで、古くなった、あるいは止まっている保存済みの
エンドポイントが選択画面を止めてしまわないようにするためです。はっきり更新を求めると、
すべてを確かめに行き、提供元のモデルのキャッシュも捨てます。

```bash
curl \
  -H "Authorization: Bearer $API_SERVER_KEY" \
  "http://127.0.0.1:8642/api/model/options?refresh=1"
```

OpenAI 互換のクライアントが、chat や responses のリクエストで送り返すモデル名だけを必要と
しているなら `/v1/models` を使ってください。認証済みの画面が、Hermes ならではの
もっと詳しい選択用の情報を必要とするなら `/api/model/options` です。

### GET /v1/capabilities {#get-v1capabilities}

API サーバーの安定した窓口を、外部の画面や指揮役、プラグインの橋渡しが機械的に読める形で説明します。

```json
{
  "object": "hermes.api_server.capabilities",
  "platform": "hermes-agent",
  "model": "hermes-agent",
  "auth": {"type": "bearer", "required": true},
  "features": {
    "chat_completions": true,
    "responses_api": true,
    "run_submission": true,
    "run_status": true,
    "run_events_sse": true,
    "run_stop": true
  }
}
```

ダッシュボードやブラウザの画面、管理の仕組みをつなぐときは、この経路を使ってください。動いている Hermes の版が実行・逐次送り・取り消し・セッションの継続に対応しているかを、Python の内部に踏み込まずに調べられます。

## ブラウザ拡張からの操作 {#browser-extension-control}

Hermes は、いまの Hermes のセッションに結びついたブラウザのセッションを操る、認証済みの拡張へ
ブラウザ関連のツールを振り分けられます。この機能は既定では無効です。使うには
`browser.extension_control.enabled` を `true` にしてください。

```yaml
browser:
  extension_control:
    enabled: true
```

手元の API の経路にも、API サーバーの bearer キーが要ります。操作役として登録できるのは、
すでにあるサーバーのセッションに対してだけです。Hermes は操作役の主体を、認証済みのサーバーの
状態から導きます。クライアントが送ってきた `principal_id` は無視されます。

いま何ができるかは `GET /v1/capabilities` で分かります。
`browser_extension_control` のオブジェクトが、この機能が有効かどうか、
やり取りの版、通信路の名前、そして許されている操作の一覧そのものを返します。

```text
controller.noop
browser_back
browser_click
browser_navigate
browser_press
browser_screenshot
browser_scroll
browser_snapshot
browser_tab_activate
browser_tabs
browser_type
```

この一覧にないものを求めても、除かれます。生の CDP、好きなスクリプトの実行、コンソールへの
アクセス、アップロード、画像の抽出、視覚の機能は、この操作のやり取りには含まれません。

リクエストに結びついた操作役がいないとき、あるいは機能が無効なときは、Hermes はこれまでどおりの
ブラウザの裏側を使い続けます。ゲートウェイが操作役の主体と通信路の系統をリクエストに結びつけたら、
その拡張の道筋が正となります。操作役がいない、どれか決まらない、切れている、力不足、といった場合は
黙って別の手元やクラウドのブラウザに乗り換えたりせず、閉じる側に倒れて失敗します。
どの操作役かがはっきり決まったあとは、その結果もエラーも正であり、
Hermes が同じ操作を別の裏側でやり直すことはありません。

### 手元の API での登録 {#local-api-registration}

1. `protocol_version`、`session_id`、`controller_id`、`browser_profile_id`、そして求める
   `capabilities` を添えて、認証済みの `POST /v1/browser-control/register` を送ります。
2. Hermes は 30 秒で切れる一度きりの引換券と、絞り込まれてサーバー側に結びつけられた操作の範囲を返します。
3. `hermes-browser-control-v1` と
   `hermes-browser-control-ticket.<ticket>` の 2 つの WebSocket の副プロトコルを添えて
   `GET /v1/browser-control/ws` を開きます。

引換券をクエリ文字列で受け付けることはありません。知らない、期限切れ、使い回し、形が
おかしい引換券は、WebSocket に切り替わる前にはじかれます。

### 操作役とやり取りする枠 {#controller-frames}

Hermes は `browser.controller.command` という枠を送ります。中身は `command_id`、
`action`、書き換えられない `arguments`、ブラウザと操作役の ID、そしてもとになった
`tool_call_id` です。操作役は `browser.controller.result` で、同じ `command_id`、
きっちり真偽値の `ok`、そして `result` か `error` のどちらかを返します。
取り消しや時間切れでは `browser.controller.cancel` が出て、遅れて届いた結果は捨てられます。

思わぬ接続の切断があると操作役は切断中の扱いになり、すでに走っている仕事はそれぞれの
もとの期限まで保たれます。同じ主体、プロファイル、セッション、操作役の ID、ブラウザの
プロファイル、通信路の身元でつなぎ直せば、保留になっていた取り消しが片づくまで新しい仕事を
入れないまま、通信路だけが入れ替わります。つなぎ直しのときに取り決めた機能が変わることは
あります。機能は身元を決める項目ではないからです。同じ認証済みセッションの道筋で操作役の ID や
ブラウザのプロファイルが違えば、それは丸ごとの入れ替えです。後継が使えるようになる前に、
古い保留中の仕事は取り消されます。意図してきっぱり切り離したいときは、認証済みの操作役の通信路で
`browser.controller.detach` を送ってください。保留中の仕事がその場で取り消されます。
ただ接続を閉じただけなら、復帰できる切断として扱われます。

認証済みのダッシュボードの通信路も、登録・結果・生存確認・機能・持ち主の扱いを、
自分の Gateway の RPC とイベントの経路で同じように備えています。どちらの通信路でも、
主体、プロファイル、セッション、操作役、ブラウザのプロファイル、通信路の系統、機能のすべてが
一意にぴたりと一致してはじめて選ばれます。いったん選ばれたら、操作役の失敗は正であり、
別のブラウザの裏側でやり直されることはありません。

## リクエストごとのモデルの指定 {#per-request-model-selection}

認証済みのクライアントは、次を送ることで Hermes の既定のモデルの選び方を
リクエストごとに上書きできます。

- `model` — この往復で使いたいモデルの ID
- `provider` — この往復で資格情報と実行環境を決めるための、Hermes の提供元の識別名
- `model_options` — このリクエストの範囲でだけ効く、推論の深さやサービスの等級の指定

同じリクエストの項目は、次で受け付けられます。

- `POST /v1/chat/completions`
- `POST /v1/responses`
- `POST /v1/runs`
- `POST /api/sessions/{session_id}/chat`
- `POST /api/sessions/{session_id}/chat/stream`

優先の順番は決まっています。

1. セッションの `/model` による上書き（そのセッションにすでにあれば）
2. リクエストの `model` が設定済みの経路の別名に当たるときに選ばれる、
   固定の `gateway.platforms.api_server.model_routes` の対応づけ
3. 経路の別名に当たらないときの、リクエストの `model` / `provider` そのもの
4. ゲートウェイ全体の設定や、環境変数の既定値

どのモデルや提供元が選ばれても、`model_options` はそのリクエストの範囲にとどまります。
設定済みの `model_routes` の別名と食い違う `provider` を送ってきたリクエストは、
経路の資格情報を黙って別の提供元と混ぜたりせず、`400` ではじかれます。

**OpenAI 互換のエンドポイントで `model` だけを送る場合は、こちらで許可が要ります。** ふつうの
OpenAI のクライアントはモデル名（`gpt-4o` など）を決め打ちしがちで、いまある構成の多くは
それがゲートウェイの既定に落ちることを当てにしています。そのため
`POST /v1/chat/completions` と `POST /v1/responses` では、`provider` を伴わずに送られた
`model` の値は、次を有効にしない限り無視されます。

```yaml
gateway:
  platforms:
    api_server:
      direct_model_requests: true
```

`provider` をはっきり書いたリクエストと、Hermes 本来の
`/v1/runs` およびセッションのチャットのエンドポイントは、この切り替えに関わらず
求められたモデルを必ず尊重します。

例:

```json
{
  "model": "MiniMax-M3",
  "provider": "minimax",
  "model_options": {
    "reasoning_effort": "high",
    "service_tier": "priority"
  },
  "messages": [
    {"role": "user", "content": "Summarize the repo status."}
  ]
}
```

### GET /health {#get-health}

生存の確認です。`{"status": "ok"}` を返します。`/v1/` の接頭辞を前提とする OpenAI 互換のクライアントのために、**GET /v1/health** でも使えます。

### GET /health/detailed {#get-healthdetailed}

監視や管理の仕組みのための、認証済みの準備状況の確認です。いま使っているプロファイルの設定、
状態のデータベース、設定されたモデル、ディスクの空き、ゲートウェイとプラットフォームの状態、
動いている API の実行、待ちになっているプロセスの完了、動いている委任について、限られた形で
状態を報告します。返るのは状態と件数だけで、設定の値、資格情報、パス、コマンド、待ち行列の
中身、生のエラーは出しません。

公開されている `/health` の経路は軽い生存確認のままで、準備状況の確認は走らせません。
準備状況が芳しくない結果でも HTTP は 200 です。いちばん上の `status` と
`readiness.checks` の項目を見てください。

## Runs の API（逐次送りと相性のよい別の道） {#runs-api-streaming-friendly-alternative}

`/v1/chat/completions` と `/v1/responses` に加えて、長い会話のための **runs** の API があります。クライアント側で逐次送りを自分でさばくのではなく、進み具合のイベントを購読したいときのためのものです。

### POST /v1/runs {#post-v1runs}

エージェントの実行を新しく作ります。進み具合のイベントを購読するのに使える `run_id` が返ります。

```json
{
  "run_id": "run_abc123",
  "status": "started"
}
```

実行は、単純な `input` の文字列と、任意の `session_id`、`instructions`、`conversation_history`、`previous_response_id` を受け付けます。`session_id` を渡すと、Hermes がそれを実行の状態に出すので、外部の画面が自前の会話の ID と突き合わせられます。

安全にやり直せる形で作りたいときは、`Idempotency-Key` のヘッダー（見える ASCII 文字で 1〜255 文字）を送ってください。Hermes は仕事を始める前に、この鍵を確実に押さえます。まったく同じ内容でやり直せば、もとの `run_id` が HTTP 202 と `Idempotency-Replayed: true` とともに返ります。これはゲートウェイを再起動したあとでも、実行が完了・失敗・取り消しになったあとでも同じです。同じ鍵を違う JSON の中身で使い回すと、HTTP 409 とコード `idempotency_key_conflict` が返ります。鍵は認証済みの API のプロファイルや資格情報ごとに分けられ、最後に状態が変わってから 24 時間保たれます。クライアント側は他人に推し量れない固有の鍵を使い、関係のない操作で使い回さないでください。このヘッダーがないリクエストは従来どおりの動きで、必ず新しい実行を作ります。

`session_id` がすでにある Hermes のセッションを指していて、`conversation_history` も
`previous_response_id` も渡されていないときは、そのセッションのいま使われている記録を
読み込みます。セッションの順番待ちの仕組みが、同時に書こうとするものを一列に並べ、
待たされたあとには記録を読み直します。

### GET /v1/runs/\{run_id\} {#get-v1runsrunid}

いまの実行の状態を問い合わせます。SSE の接続をつなぎっぱなしにせずに状態だけ知りたいダッシュボードや、画面の移動のあとでつなぎ直す画面に向いています。

```json
{
  "object": "hermes.run",
  "run_id": "run_abc123",
  "status": "completed",
  "session_id": "space-session",
  "model": "hermes-agent",
  "output": "Done.",
  "usage": {"input_tokens": 50, "output_tokens": 200, "total_tokens": 250}
}
```

終わりの状態（`completed`、`failed`、`cancelled`）になったあとも、問い合わせと画面の突き合わせのために状態はしばらく残ります。

### GET /v1/runs/\{run_id\}/events {#get-v1runsrunidevents}

その実行のツールの進み具合、トークンの差分、節目のできごとを Server-Sent Events で流します。状態を失わずにつないだり離れたりしたい、ダッシュボードや作り込んだクライアントのためのものです。

エージェントが裏で動く子エージェントに仕事を任せたときは、
`subagent.start` と `subagent.complete` という節目のできごとも流れます。だからクライアント側は、
子が働いているあいだ実行が黙り込むのではなく、任せた結果を（時間切れや失敗も含めて）
見られます。`subagent.complete` の中身には、子の状態、要約、かかった時間、トークンと費用の
数字、突き合わせ用の `child_session_id`、そして所属するひとまとまりの `delegation_id`
（同時や入れ子の分岐でも区別が付くように）が入ります。自由に書ける項目は、プロセスの外に出る前に
必ず秘密を伏せる処理を通ります。子のツールごとのできごと
（`subagent.tool` や進み具合の刻み）は、あえて流し**ません**。画面には量が多すぎるからです。
細かい実況は、子ごとの実況の記録ファイルを見てください。

読まれなかったイベントの控えは 5 分で捨てられます。離れていったクライアントのせいで
メモリが際限なく増えないようにするためです。これで消えるのは通信の状態だけです。まだ走っている
実行は、実際にその仕事が終わるまで、状態の問い合わせ・承認・停止の操作・同時実行の
数え上げから見え続けます。つながっている SSE の購読者は、これまでどおり受け取り続けます。

### POST /v1/runs/\{run_id\}/stop {#post-v1runsrunidstop}

走っているエージェントの往復に割り込みます。この経路はすぐに `{"status": "stopping"}` を返し、その裏で Hermes が、いま動いているエージェントに次の安全な切れ目で止まるよう頼みます。
実行は、その仕事が実際に終わるまで `stopping` として追われ、そのあと
`cancelled` に落ち着きます。停止を頼んだからといって、まだ走っている働き手が
隠されることはありません。

### POST /v1/runs/\{run_id\}/approval {#post-v1runsrunidapproval}

人の判断を待っている実行について、保留中の承認に答えます（たとえば、承認の方針でせき止められたツールの呼び出しです）。本文には承認の判断を入れます。判断が記録されると、実行が再開します。この経路は `/v1/capabilities` で `run_approval` という機能として公開されているので、外部の画面は承認の問いかけを出す前に対応しているかを調べられます。

## Jobs の API（裏で動く予定の仕事） {#jobs-api-background-scheduled-work}

サーバーは、予定された裏側のエージェントの実行を離れたところから管理するための、軽い仕事の作成・取得・更新・削除の窓口を備えています。どの経路も同じ bearer 認証で守られています。

### GET /api/jobs {#get-apijobs}

予定されている仕事をすべて並べます。

### POST /api/jobs {#post-apijobs}

新しい予定の仕事を作ります。本文は `hermes cron` と同じ形、つまり指示文、予定、スキル、提供元の上書き、届け先を受け付けます。

### GET /api/jobs/\{job_id\} {#get-apijobsjobid}

仕事ひとつの定義と、最後に走ったときの状態を取り出します。

### PATCH /api/jobs/\{job_id\} {#patch-apijobsjobid}

すでにある仕事の項目（指示文、予定など）を更新します。一部だけの更新は、混ぜ合わされます。

### DELETE /api/jobs/\{job_id\} {#delete-apijobsjobid}

仕事を消します。走っている途中の実行も取り消されます。

### POST /api/jobs/\{job_id\}/pause {#post-apijobsjobidpause}

仕事を消さずに止めます。次に走る予定の時刻は、再開するまで宙に浮いた状態になります。

### POST /api/jobs/\{job_id\}/resume {#post-apijobsjobidresume}

止めてあった仕事を再開します。

### POST /api/jobs/\{job_id\}/run {#post-apijobsjobidrun}

予定を待たずに、その場で仕事を走らせます。

## Sessions の API（REST でのセッションの操作） {#sessions-api-session-control-over-rest}

外部の画面は、ダッシュボードを立ち上げなくても REST から Hermes のセッションを扱えます。どの経路も `API_SERVER_KEY` で守られていて、`/api/sessions/*` の下にあります。

| メソッド | パス | 説明 |
|--------|------|-------------|
| `GET` | `/api/sessions` | セッションを並べます（ページ送りあり — `limit`、`offset`、`source`、`include_children`） |
| `POST` | `/api/sessions` | 空のセッションを作ります |
| `GET` | `/api/sessions/{id}` | セッションの情報を読みます |
| `PATCH` | `/api/sessions/{id}` | 題名か `end_reason` を更新します |
| `DELETE` | `/api/sessions/{id}` | セッションを消します |
| `GET` | `/api/sessions/{id}/messages` | そのセッションのメッセージの履歴 |
| `POST` | `/api/sessions/{id}/fork` | `SessionDB` の系譜をたどってセッションを枝分かれさせます（CLI の `/branch` と同じ考え方です） |
| `POST` | `/api/sessions/{id}/chat` | エージェントの往復を 1 回、待ち合わせる形で走らせます |
| `POST` | `/api/sessions/{id}/chat/stream` | 往復 1 回を SSE で包んだもの。`assistant.delta`、`tool.started`、`tool.completed`、`run.completed` のできごとを出します |

`/v1/capabilities` は `session_*` の機能の旗と `endpoints.session_*` の項目でこの窓口の全体を知らせるので、外部の画面は対応を調べたうえで安全に別の手に切り替えられます。`chat` と `chat/stream` の中身では、文中の画像にも対応しています（複数の形式を扱える経路です）。

```bash
# fork a session and run one turn
curl -X POST http://localhost:8642/api/sessions/$ID/fork \
  -H "Authorization: Bearer $API_SERVER_KEY" \
  -d '{"title": "explore alt path"}'

# stream a turn over SSE
curl -N -X POST http://localhost:8642/api/sessions/$ID/chat/stream \
  -H "Authorization: Bearer $API_SERVER_KEY" \
  -d '{"input": "what files changed in the last hour?"}'
```

## スキルと道具立ての一覧 {#skills-and-toolsets-discovery}

`GET /v1/skills` と `GET /v1/toolsets` を使えば、外部のクライアントがモデルに尋ねるのではなく、REST から確実にエージェントの能力を並べられます。どちらも読むだけで、`API_SERVER_KEY` で守られています。

```bash
curl http://localhost:8642/v1/skills \
  -H "Authorization: Bearer $API_SERVER_KEY"
# → [{"name": "github-pr-workflow", "description": "...", "category": "..."}, ...]

curl http://localhost:8642/v1/toolsets \
  -H "Authorization: Bearer $API_SERVER_KEY"
# → [{"name": "core", "label": "...", "description": "...", "enabled": true,
#     "configured": true, "tools": ["read_file", "write_file", ...]}, ...]
```

`/v1/skills` は、スキルの集約が内部で使っているのと同じ情報を返します。`/v1/toolsets` は `api_server` のプラットフォーム向けに解決された道具立てと、それぞれが実際に展開される `tools` の一覧を返します。どちらも `/v1/capabilities` の `endpoints.*` に載っています。

## 長期の記憶の切り分け（`X-Hermes-Session-Key`） {#long-term-memory-scoping-x-hermes-session-key}

Open WebUI のように複数の利用者がいるフロントエンドでは、長期の記憶（Honcho など）のために、経路ごとに変わらない識別子が要ります。それは、記録に紐づいていて `/new` のたびに変わる `X-Hermes-Session-Id` とは**別のもの**でなければなりません。`/v1/chat/completions`、`/v1/responses`、`/v1/runs` に `X-Hermes-Session-Key` を渡すと、Hermes がそれを `AIAgent(gateway_session_key=...)` まで通し、Honcho の記憶の提供元がそこから変わらない切り分けを導きます。

```http
POST /v1/chat/completions HTTP/1.1
Authorization: Bearer ***
X-Hermes-Session-Id: transcript-alpha
X-Hermes-Session-Key: agent:main:webui:dm:user-42
```

決まりごと: 最大 256 文字、制御文字（`\r`、`\n`、`\x00`）は拒否され、値はレスポンス（JSON も SSE も）にそのまま返ります。`/v1/capabilities` は `"session_key_header": "X-Hermes-Session-Key"` で対応していることを知らせます。この鍵がないと、Honcho の `per-session` のやり方では `session_id` ごとに違う切り分けになります。Hermes がこれまでしていたのと、まさに同じ動きです。

## システムプロンプトの扱い {#system-prompt-handling}

フロントエンドが `system` のメッセージ（Chat Completions）や `instructions` の項目（Responses API）を送ってくると、hermes-agent はそれを自分の中核のシステムプロンプトの**上に重ねます**。エージェントはツールも記憶もスキルもすべて保ったままで、フロントエンドのシステムプロンプトは追加の指示として効きます。

つまり、能力を失わずにフロントエンドごとの振る舞いを整えられるということです。
- Open WebUI のシステムプロンプト: 「あなたは Python の専門家です。必ず型ヒントを付けてください。」
- それでもエージェントには、ターミナル、ファイルのツール、ウェブ検索、記憶などが残ります。

## 認証 {#authentication}

`Authorization` のヘッダーによる bearer トークンの認証です。

```
Authorization: Bearer ***
```

鍵は環境変数 `API_SERVER_KEY` で設定します。ブラウザから Hermes を直接呼ぶ必要があるなら、`API_SERVER_CORS_ORIGINS` にもはっきりと許可する一覧を設定してください。

### プロファイルごとの振り分け（`/p/<profile>/…`） {#multi-profile-routing-pprofile}

[プロファイルごとのゲートウェイの振り分け](/hermes/docs/user-guide/multi-profile-gateways/)が
有効なとき（`gateway.multiplex_profiles`）、ひとつの待ち受けが `/p/<profile>/` という URL の
接頭辞ですべてのプロファイルを引き受けます。そして**認証は、振り分けられた
プロファイルに結びつきます**。

- `/p/<profile>/v1/...` へのリクエストには、そのプロファイル自身の
  `API_SERVER_KEY`（`~/.hermes/profiles/<profile>/.env` のもの）が要ります。既定の
  待ち受けの鍵は、名前付きのプロファイルの接頭辞では拒否されます。
- 接頭辞のない経路と `/p/default/...` は、これまでどおり既定のプロファイルの鍵を使います。
- 自分の `API_SERVER_KEY` を持たない名前付きのプロファイルは、閉じる側に倒れます。
  鍵を設定するまで、その接頭辞には届きません。
- 実行はプロファイルごとに切り分けられます。`/v1/runs/{run_id}` と、その `events`、`stop`、
  `steer`、`approval` の経路は、その実行を作ったプロファイルにしか応えません
  （`/api/sessions/{id}/chat/stream` から始めた実行も含みます）。
  別のプロファイルの実行の ID には `403` ではなく必ず `404` を返します。

:::warning 動きの変わる変更（2026 年 7 月）
この修正の前は、既定のプロファイルの正しい鍵が、どの
`/p/<profile>/` の接頭辞でも通っていました。プロファイルの接頭辞をまたいで鍵を 1 本で
済ませていたなら、それぞれのプロファイルの `.env` に別々の `API_SERVER_KEY` を設定して
ください。名前付きの接頭辞で既定の鍵を使い回すと、いまは `401` が返ります。
:::

:::warning 安全について
API サーバーは、hermes-agent の道具ひとそろいに、**ターミナルのコマンドも含めて**すべて手を届かせます。`API_SERVER_KEY` は、既定の `127.0.0.1` への閉じた待ち受けも含めて、**どんな構成でも必須**です。ブラウザからの呼び出しをあえて許すときは、`API_SERVER_CORS_ORIGINS` を狭く保って、どこから触れるかを抑えてください。
:::

## 設定 {#configuration}

### 環境変数 {#environment-variables}

| 変数 | 既定 | 説明 |
|----------|---------|-------------|
| `API_SERVER_ENABLED` | `false` | API サーバーを有効にします |
| `API_SERVER_PORT` | `8642` | HTTP サーバーのポート |
| `API_SERVER_HOST` | `127.0.0.1` | 待ち受けるアドレス（既定では手元だけ） |
| `API_SERVER_KEY` | _(必須)_ | 認証の bearer トークン |
| `API_SERVER_CORS_ORIGINS` | _(なし)_ | カンマ区切りで許すブラウザの出どころ |
| `API_SERVER_MODEL_NAME` | _(プロファイル名)_ | `/v1/models` に出るモデル名。既定はプロファイル名で、既定のプロファイルなら `hermes-agent` です。 |

### config.yaml {#configyaml}

同じ設定は、`~/.hermes/config.yaml` の入れ子になった `gateway.api_server:` の節にも置けます。

```yaml
gateway:
  api_server:
    enabled: true
    port: 8642
    host: 127.0.0.1
    key: your-secret-key
    cors_origins: http://localhost:3000
    model_name: my-hermes
    max_concurrent_runs: 10   # concurrent-run cap; 0 disables the limit
```

`port`、`key`、`host`、`cors_origins`、`model_name` はプラットフォームの `extra` の設定へ自動で橋渡しされるので、対応する `API_SERVER_*` の環境変数とまったく同じように動きます。環境変数のほうが `config.yaml` の値より優先されます。この塊は `gateway.platforms.api_server:` の下や、いちばん上の `platforms.api_server:` の節でも受け付けられます。

### 同時に走る実行の上限 {#concurrent-run-cap}

API サーバーは、OpenAI 互換のエンドポイントと Runs のエンドポイントを合わせて、エージェントの実行が同時にいくつまで走れるかを制限します。上限は `gateway.api_server.max_concurrent_runs` から読まれます（既定は **10**、`0` で制限なし、負の値は 0 に丸められます）。上限に達すると、新しく実行を始めようとするリクエストは **HTTP 429** の `Too many concurrent runs (max N)` ではじかれます。クライアント側は間を置いてやり直してください。

## 安全のためのヘッダー {#security-headers}

どのレスポンスにも、安全のためのヘッダーが入ります。
- `X-Content-Type-Options: nosniff` — 中身の種類を勝手に推し量られるのを防ぎます
- `Referrer-Policy: no-referrer` — どこから来たかが漏れるのを防ぎます

## CORS {#cors}

API サーバーは、既定ではブラウザ向けの CORS を有効に**しません**。

ブラウザから直接つなぐなら、許可する一覧をはっきり書きます。

```bash
API_SERVER_CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

CORS を有効にすると、こうなります。
- **事前確認のレスポンス**に `Access-Control-Max-Age: 600` が入ります（10 分のキャッシュ）
- **SSE の逐次送りのレスポンス**にも CORS のヘッダーが入るので、ブラウザの EventSource のクライアントがきちんと動きます
- **`Idempotency-Key`** が許されるリクエストのヘッダーになります。重複を避けるために送れます（レスポンスは鍵ごとに 5 分キャッシュされます）

Open WebUI をはじめ、ここで説明しているフロントエンドの多くはサーバー同士でつながるので、そもそも CORS は要りません。

## つながるフロントエンド {#compatible-frontends}

OpenAI の API の形式に対応したフロントエンドなら、どれでも動きます。実際に試して説明のあるものは次のとおりです。

| フロントエンド | スター | つなぎ方 |
|----------|-------|------------|
| [Open WebUI](/hermes/docs/user-guide/messaging/open-webui/) | 126k | 詳しいガイドがあります |
| LobeChat | 73k | 自作の提供元のエンドポイント |
| LibreChat | 34k | librechat.yaml で自作のエンドポイント |
| AnythingLLM | 56k | 汎用の OpenAI 提供元 |
| NextChat | 87k | 環境変数 BASE_URL |
| ChatBox | 39k | API Host の設定 |
| Jan | 26k | 遠隔のモデルの設定 |
| HF Chat-UI | 8k | OPENAI_BASE_URL |
| big-AGI | 7k | 自作のエンドポイント |
| OpenAI Python SDK | — | `OpenAI(base_url="http://localhost:8642/v1")` |
| curl | — | 素の HTTP リクエスト |

## プロファイルで複数の利用者に対応する {#multi-user-setup-with-profiles}

何人もの利用者に、それぞれ切り離された Hermes（設定・記憶・スキルが別々のもの）を渡すには、[プロファイル](/hermes/docs/user-guide/profiles/)を使います。

```bash
# Create a profile per user
hermes profile create alice
hermes profile create bob

# Configure each profile's API server on a different port. API_SERVER_* are env
# vars (not config.yaml keys), so write them to each profile's .env:
cat >> ~/.hermes/profiles/alice/.env <<EOF
API_SERVER_ENABLED=true
API_SERVER_PORT=8643
API_SERVER_KEY=alice-secret
EOF

cat >> ~/.hermes/profiles/bob/.env <<EOF
API_SERVER_ENABLED=true
API_SERVER_PORT=8644
API_SERVER_KEY=bob-secret
EOF

# Start each profile's gateway
hermes -p alice gateway &
hermes -p bob gateway &
```

それぞれのプロファイルの API サーバーは、そのプロファイル名をモデルの ID として自動で知らせます。

- `http://localhost:8643/v1/models` → モデル `alice`
- `http://localhost:8644/v1/models` → モデル `bob`

Open WebUI では、それぞれを別のつなぎ先として足します。モデルの一覧には `alice` と `bob` が別々のモデルとして並び、それぞれの裏にはすっかり切り離された Hermes がいます。詳しくは [Open WebUI のガイド](/hermes/docs/user-guide/messaging/open-webui/#multi-user-setup-with-profiles) を見てください。

## 制限 {#limitations}

- **レスポンスの保存** — 保存されたレスポンス（`previous_response_id` のためのもの）は SQLite に残り、ゲートウェイを再起動しても消えません。保存できるのは最大 100 件です（古いものから捨てられます）。
- **ファイルのアップロードには対応していません** — `/v1/chat/completions` と `/v1/responses` のどちらでも文中の画像は使えますが、アップロードしたファイル（`file`、`input_file`、`file_id`）と、画像以外の文書の入力は、この API では使えません。
- **単純な OpenAI のクライアントには、いまも別名が見えます** — `/v1/models` が知らせるのは
  変わらない Hermes の別名（`hermes-agent` か、いま使っているプロファイル名）です。もっと作り込まれた
  クライアントは、リクエストで `provider` / `model_options` の上書きをはっきり送れます。

## 中継の使い方 {#proxy-mode}

API サーバーは、**ゲートウェイの中継の使い方**の裏側にもなります。別の Hermes のゲートウェイが `GATEWAY_PROXY_URL` をこの API サーバーに向けて設定されていると、そちらは自前でエージェントを動かす代わりに、すべてのメッセージをここへ送ってきます。おかげで、役割を分けた構成にできます。たとえば Matrix の端末間の暗号化を受け持つ Docker のコンテナが、ホスト側のエージェントへ中継するといった形です。

設定の手順は [Matrix の中継の使い方](/hermes/docs/user-guide/messaging/matrix/#proxy-mode-e2ee-on-macos) を見てください。
