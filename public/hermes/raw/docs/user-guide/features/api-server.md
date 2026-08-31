---
title: "API サーバー"
description: "hermes-agent を OpenAI 互換の API として公開し、好きなフロントエンドから使えるようにします"
upstream_path: user-guide/features/api-server.md
upstream_blob: 47c03736139ca79674680e985aa34a58ccfcf8eb
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/api-server
---

# API サーバー {#api-server}

API サーバーは、hermes-agent を OpenAI 互換の HTTP エンドポイントとして公開します。OpenAI 形式を話せるフロントエンドなら何でも — Open WebUI、LobeChat、LibreChat、NextChat、ChatBox、ほかにも数百種類 — hermes-agent につないでバックエンドとして使えます。

エージェントは持っている道具立てを全部使ってリクエストに応じ（ターミナル、ファイル操作、ウェブ検索、記憶、スキル）、最終的な返答を返します。ストリーミングのときは道具の進捗表示が本文に混ざって流れるので、フロントエンド側で「いま何をしているか」を見せられます。

:::tip 契約ひとつでモデルも道具もそろう
API サーバーが役に立つには、Hermes 側にプロバイダーと道具のバックエンドが設定されている必要があります。[Nous Portal](/hermes/docs/user-guide/features/tool-gateway/) の契約なら両方まかなえます。300 以上のモデルに加えて、ウェブ・画像・TTS・ブラウザーが Tool Gateway 経由で使えます。API サーバーを起動する前に `hermes setup --portal` を一度実行しておけば、Open WebUI や LobeChat のようなフロントエンドから、道具のそろったバックエンドとして使えます。
:::

## すぐ使い始める {#quick-start}

### 1. API サーバーを有効にする {#1-enable-the-api-server}

`~/.hermes/.env` に次を追加します。

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

次のように表示されます。

```
[API Server] API server listening on http://127.0.0.1:8642
```

### 3. フロントエンドをつなぐ {#3-connect-a-frontend}

OpenAI 互換のクライアントの接続先を `http://localhost:8642/v1` に向けます。

```bash
# Test with curl
curl http://localhost:8642/v1/chat/completions \
  -H "Authorization: Bearer change-me-local-dev" \
  -H "Content-Type: application/json" \
  -d '{"model": "hermes-agent", "messages": [{"role": "user", "content": "Hello!"}]}'
```

Open WebUI や LobeChat、そのほかのフロントエンドをつなぐこともできます。手順を追った説明は [Open WebUI 連携ガイド](/hermes/docs/user-guide/messaging/open-webui/) を見てください。

## エンドポイント {#endpoints}

### POST /v1/chat/completions {#post-v1chatcompletions}

OpenAI の Chat Completions の標準形式です。状態を持たないので、会話の全体を毎回 `messages` 配列に入れて送ります。

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

**画像を本文に含めて渡す:** 利用者のメッセージでは、`content` を `text` と `image_url` の部品の配列として送れます。遠隔の `http(s)` URL と `data:image/...` URL のどちらにも対応しています。

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

アップロードしたファイル（`file` / `input_file` / `file_id`）と、画像以外の `data:` URL は `400 unsupported_content_type` を返します。

**ストリーミング**（`"stream": true`）: Server-Sent Events（SSE）で、返答をトークンごとの断片として返します。**Chat Completions** では、標準の `chat.completion.chunk` イベントに加えて、道具の開始を見せるための Hermes 独自イベント `hermes.tool.progress` が流れます。**Responses** では、`response.created`、`response.output_text.delta`、`response.output_item.added`、`response.output_item.done`、`response.completed` といった OpenAI Responses のイベント種別を使います。

**ストリーム中の道具の進捗**:
- **Chat Completions**: 保存される応答本文を汚さずに道具の開始を見せるため、Hermes は `event: hermes.tool.progress` を発行します。
- **Responses**: SSE ストリームの途中で、仕様どおりの `function_call` と `function_call_output` の出力項目を発行するので、クライアント側で構造化した道具の画面をその場で描けます。

### POST /v1/responses {#post-v1responses}

OpenAI の Responses API 形式です。`previous_response_id` によるサーバー側の会話状態に対応しています。サーバーが会話の履歴を丸ごと（道具の呼び出しとその結果も含めて）保持するので、クライアントが管理しなくても複数ターンの文脈が保たれます。

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

`output` 配列に入っている道具の呼び出しは、すでに Hermes エージェントがサーバー側で実行し終えたものです。構造化した道具の画面を描くために `"status": "completed"` として再生されるだけで、クライアントが実行すべき未処理の呼び出しとして返ることはありません。

**画像を本文に含めて渡す:** `input[].content` には `input_text` と `input_image` の部品を入れられます。遠隔の URL と `data:image/...` URL のどちらにも対応しています。

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

アップロードしたファイル（`input_file` / `file_id`）と、画像以外の `data:` URL は `400 unsupported_content_type` を返します。

#### previous_response_id で複数ターンをつなぐ {#multi-turn-with-previousresponseid}

応答を数珠つなぎにすると、道具の呼び出しも含めた文脈がターンをまたいで保たれます。

```json
{
  "input": "Now show me the README",
  "previous_response_id": "resp_abc123"
}
```

サーバーは保存された応答の連なりから会話の全体を組み直します。それまでの道具の呼び出しと結果はすべて残ります。つないだリクエストは同じセッションを共有するので、複数ターンの会話もダッシュボードやセッション履歴では 1 件として並びます。

#### 名前を付けた会話 {#named-conversations}

応答 ID を追いかける代わりに、`conversation` パラメーターを使えます。

```json
{"input": "Hello", "conversation": "my-project"}
{"input": "What's in src/?", "conversation": "my-project"}
{"input": "Run the tests", "conversation": "my-project"}
```

サーバーがその会話の最新の応答へ自動でつなぎます。ゲートウェイのセッションにおける `/title` コマンドと同じ感覚です。

### GET /v1/responses/\{id\} {#get-v1responsesid}

保存済みの応答を ID で取り出します。

### DELETE /v1/responses/\{id\} {#delete-v1responsesid}

保存済みの応答を削除します。

### GET /v1/models {#get-v1models}

エージェントを利用できるモデルとして並べます。名乗るモデル名は既定で [プロファイル](/hermes/docs/user-guide/profiles/) の名前になります（既定のプロファイルなら `hermes-agent`）。たいていのフロントエンドがモデルを見つけるために必要とします。

`/v1/models` は、あくまで軽い OpenAI 互換の窓口として置いています。Hermes が経路を引ける認証済みのプロバイダーとモデルの組み合わせを **すべて** 並べるわけではなく、価格や機能の情報を足すこともしません。

### GET /api/model/options {#get-apimodeloptions}

Hermes を前提に作られたクライアントは、ダッシュボードや TUI が使っているのと同じ、選りすぐりのプロバイダー／モデル一覧を要求できます。この経路は API サーバー通常の bearer 認証を使い、OpenAI 互換の `/v1/models` 応答には収まらないプロバイダーの行、モデルの機能の手がかり、価格の情報を返します。

```bash
curl \
  -H "Authorization: Bearer $API_SERVER_KEY" \
  "http://127.0.0.1:8642/api/model/options"
```

この中身は、ダッシュボードの Models ページと TUI の `model.options` RPC が使っているものと同じ土台です。認証済みのプロバイダー、選りすぐったモデルの一覧、モデルごとの価格、モデルの機能の手がかりが返ります。

普通に開いたときは、独自プロバイダーに対して意図的に控えめに動きます。保存済みのエンドポイントが古かったり落ちていたりしても選択画面が止まらないよう、Hermes は **いま選ばれている** 独自エンドポイントだけを叩きます。明示的に更新を指示すると、全件を叩きにいき、プロバイダーのモデルのキャッシュも捨てます。

```bash
curl \
  -H "Authorization: Bearer $API_SERVER_KEY" \
  "http://127.0.0.1:8642/api/model/options?refresh=1"
```

OpenAI 互換のクライアントが、chat / responses のリクエストに載せ返すモデル名だけを必要としているなら `/v1/models` を使ってください。認証済みの画面で、Hermes 固有の詳しい選択情報が要るなら `/api/model/options` を使ってください。

### GET /v1/capabilities {#get-v1capabilities}

外部の画面、オーケストレーター、プラグインの橋渡しに向けて、API サーバーの安定した窓口を機械が読める形で説明します。

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

ダッシュボードやブラウザーの画面、制御系の仕組みをつなぐときは、このエンドポイントを使ってください。Python の内部実装に頼らずに、動いている Hermes のバージョンが run・ストリーミング・中断・セッションの継続に対応しているかを判定できます。

## ブラウザー拡張からの操作 {#browser-extension-control}

Hermes は、いまの Hermes セッションにひもづくブラウザーのセッションを操る認証済みの拡張機能を通して、ブラウザーの道具を扱えます。この機能は既定では無効です。使うなら `browser.extension_control.enabled` を `true` にします。

```yaml
browser:
  extension_control:
    enabled: true
```

ローカルの API 経路にも API サーバーの bearer キーが必要です。操作側が登録できるのは、すでに存在するサーバー側セッションに対してだけです。Hermes は操作側の主体を認証済みのサーバー状態から導きます。クライアントが送ってきた `principal_id` は無視します。

いま有効な取り決めは `GET /v1/capabilities` で分かります。`browser_extension_control` オブジェクトが、機能が有効かどうか、プロトコルの版、通信路の名前、そして許可された能力の正確な一覧を返します。

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

この一覧の外にある能力を要求しても取り除かれます。生の CDP、任意のスクリプト実行、コンソールへの接続、アップロード、画像の抽出、画像の読み取りは、操作側のプロトコルには含まれていません。

リクエストに操作側の身元がひもづいていないとき、あるいは機能が無効なときは、Hermes はいままでのブラウザーのバックエンドをそのまま使います。ゲートウェイがリクエストに操作側の主体と通信路の系統をひもづけたら、その拡張機能の経路が正となります。操作側がいない・特定できない・切断されている・能力が足りない場合は、黙って別のローカル／クラウドのブラウザーへ切り替えたりせず、失敗として閉じます。ひとつの操作側が確定したあとは、その結果もエラーも正であり、Hermes が同じ操作を別のバックエンドで試し直すことはありません。

### ローカル API での登録 {#local-api-registration}

1. `protocol_version`、`session_id`、`controller_id`、`browser_profile_id`、要求する `capabilities` を添えて、認証済みの `POST /v1/browser-control/register` を送ります。
2. Hermes は使い切りのチケット（有効期間 30 秒）と、絞り込み済みでサーバー側にひもづいた操作範囲を返します。
3. `hermes-browser-control-v1` と `hermes-browser-control-ticket.<ticket>` の両方の WebSocket サブプロトコルを付けて `GET /v1/browser-control/ws` を開きます。

チケットをクエリ文字列で渡すことは決してできません。知らないチケット、期限切れ、使い回し、形が壊れているものは、WebSocket への切り替え前に弾かれます。

### 操作側とやり取りするフレーム {#controller-frames}

Hermes は `browser.controller.command` フレームを送ります。中身は `command_id`、`action`、書き換え不可の `arguments`、ブラウザーと操作側の ID、そして発端となった `tool_call_id` です。操作側は `browser.controller.result` に、同じ `command_id`、真偽値そのままの `ok`、そして `result` か `error` のどちらかを載せて返します。取り消しと時間切れでは `browser.controller.cancel` が出ます。遅れて届いた結果は無視されます。

思いがけず接続が切れた場合、操作側は切断中として印を付けられ、すでに進行中の作業はそれぞれの元の期限まで保たれます。主体・プロファイル・セッション・操作側 ID・ブラウザーのプロファイル・通信路の身元がすべて同じままつなぎ直せば、保留になっていた取り消しを流し切るまで新しい作業を受け付けずに、通信路だけが更新されます。つなぎ直しの際に取り決めた能力が変わることはありますが、これは身元を決める項目ではありません。同じ認証済みセッションの経路で操作側 ID やブラウザーのプロファイルが違う場合は、完全な置き換えとして扱われます。古い未処理の作業は、後継が経路に載る前に取り消されます。意図して完全に切り離したいときは、認証済みの操作側の通信路で `browser.controller.detach` を送ってください。未処理の作業がその場で取り消されます。ソケットを閉じただけなら、復帰できる切断として扱われます。

認証済みのダッシュボードの通信路も、Gateway の RPC／イベントの経路を通して、同じ登録・結果・生存確認・能力・所有権の決まりを提供します。どちらの通信路でも、選ばれるには主体・プロファイル・セッション・操作側・ブラウザーのプロファイル・通信路の系統・能力について、あいまいさのない完全一致がひとつだけ必要です。いったん選ばれたら、操作側の失敗は正であり、別のブラウザーのバックエンドで試し直されることはありません。

## リクエストごとにモデルを選ぶ {#per-request-model-selection}

認証済みのクライアントは、次を送ることで Hermes の既定のモデル選択をリクエストごとに上書きできます。

- `model` — このターンで使いたいモデルの id
- `provider` — このターンの資格情報と実行環境を解決するための Hermes 側のプロバイダー識別子
- `model_options` — そのリクエストの範囲だけに効く推論／サービス階層の指定

同じリクエスト項目は、次で受け付けます。

- `POST /v1/chat/completions`
- `POST /v1/responses`
- `POST /v1/runs`
- `POST /api/sessions/{session_id}/chat`
- `POST /api/sessions/{session_id}/chat/stream`

優先順位は決まっています。

1. そのセッションにすでに `/model` の上書きがあるなら、それ
2. リクエストの `model` が設定済みの経路の別名に当たるときに選ばれる、固定の `gateway.platforms.api_server.model_routes` の対応付け
3. 経路の別名に当たらない場合は、リクエストの `model` / `provider` をそのまま
4. ゲートウェイ全体の設定と環境の既定値

`model_options` は、どのモデルやプロバイダーが選ばれたかに関わらず、そのリクエストの範囲にとどまります。設定済みの `model_routes` の別名と食い違う `provider` を送ってきた場合、Hermes は経路の資格情報を別のプロバイダーと黙って混ぜたりせず、`400` で拒否します。

**OpenAI 互換のエンドポイントでは、`model` だけを送る形は既定では効きません。** 汎用の OpenAI クライアントはモデル名（`gpt-4o` など）を決め打ちで書いていることが多く、いまある構成はそれがゲートウェイの既定値に落ちることを前提にしています。そのため `POST /v1/chat/completions` と `POST /v1/responses` では、`provider` を伴わない `model` の値は、次を有効にしない限り無視されます。

```yaml
gateway:
  platforms:
    api_server:
      direct_model_requests: true
```

`provider` を明示したリクエストと、Hermes 独自の `/v1/runs` およびセッションの chat エンドポイントは、この設定に関わらず常に要求どおりのモデルを使います。

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

生存確認です。`{"status": "ok"}` を返します。`/v1/` の接頭辞を期待する OpenAI 互換のクライアント向けに、**GET /v1/health** でも同じものが使えます。

### GET /health/detailed {#get-healthdetailed}

監視や制御の仕組み向けの、認証が要る準備状況の確認です。いま使っているプロファイルの設定、状態のデータベース、設定されたモデル、ディスクの空き、ゲートウェイとプラットフォームの状態、動いている API の run、完了待ちのプロセス、動いている委任について、範囲を絞った状況を返します。返るのは状況と件数であって、設定値・資格情報・パス・コマンド・待ち行列の中身・生のエラーではありません。

公開されている `/health` の経路は軽い生存確認のままで、準備状況の確認は走りません。準備状況が芳しくない場合でも HTTP 200 が返るので、最上位の `status` と `readiness.checks` の項目を見てください。

## Runs API（ストリーミング向きの別の道） {#runs-api-streaming-friendly-alternative}

`/v1/chat/completions` と `/v1/responses` に加えて、サーバーは **runs** の API も持っています。ストリーミングを自分で捌く代わりに進捗のイベントを購読したい、長めのセッション向けです。

### POST /v1/runs {#post-v1runs}

新しいエージェントの run を作ります。進捗のイベントを購読するのに使える `run_id` が返ります。

```json
{
  "run_id": "run_abc123",
  "status": "started"
}
```

run は単純な `input` の文字列を受け取り、`session_id`、`instructions`、`conversation_history`、`previous_response_id` は任意です。`session_id` を渡すと Hermes が run の状況にそれを出すので、外部の画面が自分の会話 ID と run を突き合わせられます。

作成を安全にやり直せるようにしたいときは、`Idempotency-Key` ヘッダー（表示できる ASCII 文字で 1〜255 文字）を送ります。Hermes は仕事を始める前に、このキーを消えない形で確保します。まったく同じ内容で送り直すと、元の `run_id` が HTTP 202 と `Idempotency-Replayed: true` を伴って返ります。ゲートウェイを再起動したあとでも、その run が完了・失敗・取り消しになったあとでも同じです。同じキーで違う JSON の中身を送ると、HTTP 409 と `idempotency_key_conflict` のコードが返ります。キーは認証された API のプロファイルと資格情報ごとに分けて扱われ、状態が最後に更新されてから 24 時間は残ります。クライアント側は推測されにくい一意のキーを使い、関係のない操作で使い回さないでください。ヘッダーを付けないリクエストはこれまでどおりの動きで、必ず新しい run を作ります。

`session_id` が既存の Hermes のセッションを指していて、`conversation_history` も `previous_response_id` も明示していない場合、run はそのセッションのいま生きているやり取りの記録を読み込みます。セッションのターンごとの占有権が、同時に書き込もうとする側を順番に並べ、順番待ちのあとは記録を取り直します。

### GET /v1/runs/\{run_id\} {#get-v1runsrunid}

いまの run の状態を問い合わせます。SSE の接続を開いたままにせずに状況だけ知りたいダッシュボードや、画面遷移のあとにつなぎ直す画面に向いています。

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

終わった状態（`completed`、`failed`、`cancelled`）になったあとも、問い合わせと画面の整合のために状況はしばらく残ります。

### GET /v1/runs/\{run_id\}/events {#get-v1runsrunidevents}

run における道具呼び出しの進捗、トークンの差分、節目の出来事を Server-Sent Events で流します。状態を失わずにつないだり離れたりしたい、ダッシュボードや作り込んだクライアント向けです。

エージェントが裏で動く子エージェントに仕事を任せると、このストリームには `subagent.start` と `subagent.complete` の節目の出来事も流れます。子が働いているあいだ run が黙り込むのではなく、時間切れや失敗も含めて委任の顛末を見られます。`subagent.complete` の中身には、子の状況、要約、所要時間、トークンと費用の数字、そして突き合わせ用の `child_session_id` が入ります。自由記述の項目は、プロセスの外に出る前に必ず秘密の伏せ字処理を通ります。子の道具ごとの出来事（`subagent.tool` や進捗の刻み）は、意図して **転送していません**。量が多くて画面が騒がしくなるからです。逐一を追いたいときは、子ごとの実況の記録ファイルを見てください。

読み取られなかったイベントの控えは 5 分で捨てられます。離れていったクライアントのせいでメモリーが際限なく膨らまないようにするためです。ここで消えるのは通信の状態だけです。まだ実行中の run は、実行の仕事が本当に終わるまで、状況の問い合わせ・承認・停止の操作・同時実行数の勘定からは見え続けます。つないでいる SSE の購読者は、そのまま普通に受け取り続けます。

### POST /v1/runs/\{run_id\}/stop {#post-v1runsrunidstop}

動いているエージェントのターンを中断します。このエンドポイントはすぐ `{"status": "stopping"}` を返し、そのあいだに Hermes が、いま動いているエージェントへ次の安全な区切りで止まるよう頼みます。
run は実行中の仕事が抜けるまで `stopping` として追われ、そのあと `cancelled` に落ち着きます。停止を頼んだからといって、まだ動いている働き手が隠されることはありません。

### POST /v1/runs/\{run_id\}/approval {#post-v1runsrunidapproval}

人の判断待ちになっている run の承認を返します（たとえば、承認の方針で止められている道具の呼び出しなど）。本文に承認の判断を載せると、それが記録された時点で run が再開します。このエンドポイントは `/v1/capabilities` で `run_approval` の機能として名乗るので、外部の画面は承認を求める表示を出す前に対応の有無を確かめられます。

## Jobs API（裏で動く予定作業） {#jobs-api-background-scheduled-work}

サーバーは、予定された裏方のエージェントの run を遠隔のクライアントから管理するための、軽い jobs の CRUD 窓口を持っています。どのエンドポイントも同じ bearer 認証で守られています。

### GET /api/jobs {#get-apijobs}

予定されているジョブをすべて並べます。

### POST /api/jobs {#post-apijobs}

新しい予定ジョブを作ります。本文は `hermes cron` と同じ形を受け付けます。プロンプト、予定、スキル、プロバイダーの上書き、届け先です。

### GET /api/jobs/\{job_id\} {#get-apijobsjobid}

ひとつのジョブの定義と、直近の実行状態を取り出します。

### PATCH /api/jobs/\{job_id\} {#patch-apijobsjobid}

既存のジョブの項目（プロンプト、予定など）を更新します。部分的な更新は既存の内容に混ぜ込まれます。

### DELETE /api/jobs/\{job_id\} {#delete-apijobsjobid}

ジョブを削除します。実行中の run も取り消します。

### POST /api/jobs/\{job_id\}/pause {#post-apijobsjobidpause}

ジョブを消さずに一時停止します。次に走る予定の時刻は、再開するまで止まります。

### POST /api/jobs/\{job_id\}/resume {#post-apijobsjobidresume}

一時停止していたジョブを再開します。

### POST /api/jobs/\{job_id\}/run {#post-apijobsjobidrun}

予定を待たずに、そのジョブをいますぐ走らせます。

## Sessions API（REST でセッションを操る） {#sessions-api-session-control-over-rest}

外部の画面は、ダッシュボードを立てなくても REST で Hermes のセッションを扱えます。どのエンドポイントも `API_SERVER_KEY` で守られていて、`/api/sessions/*` の下にあります。

| メソッド | パス | 説明 |
|--------|------|-------------|
| `GET` | `/api/sessions` | セッションを並べる（ページ送り — `limit`、`offset`、`source`、`include_children`） |
| `POST` | `/api/sessions` | 空のセッションを作る |
| `GET` | `/api/sessions/{id}` | セッションの情報を読む |
| `PATCH` | `/api/sessions/{id}` | 題名か `end_reason` を更新する |
| `DELETE` | `/api/sessions/{id}` | セッションを削除する |
| `GET` | `/api/sessions/{id}/messages` | そのセッションのやり取りの履歴 |
| `POST` | `/api/sessions/{id}/fork` | `SessionDB` の系譜をたどってセッションを枝分かれさせる（CLI の `/branch` と同じ意味） |
| `POST` | `/api/sessions/{id}/chat` | エージェントのターンを 1 回、同期で走らせる |
| `POST` | `/api/sessions/{id}/chat/stream` | 1 ターンを SSE で包んだもの — `assistant.delta`、`tool.started`、`tool.completed`、`run.completed` の出来事を流す |

`/v1/capabilities` は `session_*` の機能フラグと `endpoints.session_*` の項目でこの窓口の全体を名乗るので、外部の画面は対応の有無を判定して安全に別の道へ逃げられます。`chat` と `chat/stream` の中身では画像も渡せます（複数の形式を理解する経路）。

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

## スキルと道具立ての一覧を取る {#skills-and-toolsets-discovery}

`GET /v1/skills` と `GET /v1/toolsets` を使うと、外部のクライアントがモデルに尋ねる代わりに、REST で確実にエージェントの能力を並べられます。どちらも読み取り専用で、`API_SERVER_KEY` で守られています。

```bash
curl http://localhost:8642/v1/skills \
  -H "Authorization: Bearer $API_SERVER_KEY"
# → [{"name": "github-pr-workflow", "description": "...", "category": "..."}, ...]

curl http://localhost:8642/v1/toolsets \
  -H "Authorization: Bearer $API_SERVER_KEY"
# → [{"name": "core", "label": "...", "description": "...", "enabled": true,
#     "configured": true, "tools": ["read_file", "write_file", ...]}, ...]
```

`/v1/skills` は、スキルの拠点が内部で使っているのと同じ情報を返します。`/v1/toolsets` は `api_server` のプラットフォーム向けに解決された道具立てと、それぞれが実際に展開される `tools` の一覧を返します。どちらも `/v1/capabilities` の `endpoints.*` の下で名乗っています。

## ずっと残る記憶の範囲を決める（`X-Hermes-Session-Key`） {#long-term-memory-scoping-x-hermes-session-key}

Open WebUI のような多人数向けのフロントエンドは、ずっと残る記憶（Honcho など）のために、会話ごとに安定した識別子を必要とします。それは、`/new` のたびに変わる会話単位の `X-Hermes-Session-Id` とは **別物** でなければなりません。`/v1/chat/completions`、`/v1/responses`、`/v1/runs` に `X-Hermes-Session-Key` を渡すと、Hermes はそれを `AIAgent(gateway_session_key=...)` まで通し、Honcho の記憶プロバイダーがそこから安定した範囲を導きます。

```http
POST /v1/chat/completions HTTP/1.1
Authorization: Bearer ***
X-Hermes-Session-Id: transcript-alpha
X-Hermes-Session-Key: agent:main:webui:dm:user-42
```

決まりごと: 最大 256 文字、制御文字（`\r`、`\n`、`\x00`）は拒否、そして値は応答（JSON と SSE の両方）に返されます。`/v1/capabilities` は `"session_key_header": "X-Hermes-Session-Key"` で対応を名乗ります。このキーがないと、Honcho の `per-session` の方式は `session_id` ごとに違う範囲を作ります。これは Hermes が以前していた動きそのままです。

## システムプロンプトの扱い {#system-prompt-handling}

フロントエンドが `system` のメッセージ（Chat Completions）や `instructions` の項目（Responses API）を送ってきたとき、hermes-agent はそれを自前のシステムプロンプトの **上に重ねます**。エージェントは道具も記憶もスキルもそのまま持ち続け、フロントエンドのシステムプロンプトは追加の指示として効きます。

つまり、能力を失わずにフロントエンドごとの振る舞いを調整できます。
- Open WebUI のシステムプロンプト: 「あなたは Python の専門家です。必ず型注釈を付けてください」
- それでもエージェントはターミナル、ファイルの道具、ウェブ検索、記憶などを持ったままです

## 認証 {#authentication}

`Authorization` ヘッダーによる bearer トークン認証です。

```
Authorization: Bearer ***
```

キーは `API_SERVER_KEY` の環境変数で設定します。ブラウザーから Hermes を直接呼ぶ必要があるなら、`API_SERVER_CORS_ORIGINS` に許可する相手を明示して設定してください。

### 複数プロファイルの振り分け（`/p/<profile>/…`） {#multi-profile-routing-pprofile}

[複数プロファイルのゲートウェイ振り分け](/hermes/docs/user-guide/multi-profile-gateways/) を有効にすると（`gateway.multiplex_profiles`）、ひとつの待ち受けが `/p/<profile>/` の URL 接頭辞ですべてのプロファイルを提供します。そして **認証は振り分け先のプロファイルにひもづきます**。

- `/p/<profile>/v1/...` へのリクエストには、そのプロファイル自身の `API_SERVER_KEY`（`~/.hermes/profiles/<profile>/.env` のもの）が要ります。既定の待ち受けのキーは、名前付きプロファイルの接頭辞では拒否されます。
- 接頭辞のない経路と `/p/default/...` は、これまでどおり既定のプロファイルのキーを使います。
- 自分の `API_SERVER_KEY` を持たない名前付きプロファイルは、失敗として閉じます。設定するまで、その接頭辞には届きません。

:::warning 互換性のない変更（2026 年 7 月）
この修正の前は、既定プロファイルの正しいキーがどの `/p/<profile>/` 接頭辞でも通っていました。プロファイルの接頭辞をまたいでキーを共有していた場合は、各プロファイルの `.env` に別々の `API_SERVER_KEY` を設定してください。名前付きの接頭辞で既定のキーを使い回すと、いまは `401` が返ります。
:::

:::warning セキュリティ
API サーバーは、**ターミナルのコマンドも含めて** hermes-agent の道具立てへの全権を渡します。`API_SERVER_KEY` は **どの構成でも必須** です。`127.0.0.1` にだけ待ち受ける既定の構成でも同じです。ブラウザーからの呼び出しをあえて許すときは、`API_SERVER_CORS_ORIGINS` を狭く保ってブラウザーからの接続を制御してください。
:::

## 設定 {#configuration}

### 環境変数 {#environment-variables}

| 変数 | 既定値 | 説明 |
|----------|---------|-------------|
| `API_SERVER_ENABLED` | `false` | API サーバーを有効にする |
| `API_SERVER_PORT` | `8642` | HTTP サーバーのポート |
| `API_SERVER_HOST` | `127.0.0.1` | 待ち受けるアドレス（既定では localhost のみ） |
| `API_SERVER_KEY` | _(必須)_ | 認証用の bearer トークン |
| `API_SERVER_CORS_ORIGINS` | _(なし)_ | 許可するブラウザーの生成元をカンマ区切りで |
| `API_SERVER_MODEL_NAME` | _(プロファイル名)_ | `/v1/models` で名乗るモデル名。既定ではプロファイル名、既定のプロファイルなら `hermes-agent`。 |

### config.yaml {#configyaml}

同じ設定は、`~/.hermes/config.yaml` の `gateway.api_server:` という入れ子の節にも置けます。

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

`port`、`key`、`host`、`cors_origins`、`model_name` は自動でプラットフォームの `extra` 設定に橋渡しされるので、対応する `API_SERVER_*` の環境変数とまったく同じように動きます。環境変数のほうが `config.yaml` の値より優先されます。この節は `gateway.platforms.api_server:` の下や、最上位の `platforms.api_server:` の節でも受け付けます。

### 同時に走る run の上限 {#concurrent-run-cap}

API サーバーは、OpenAI 互換のエンドポイントと Runs のエンドポイントを合わせて、同時に走れるエージェントの run の数を制限します。上限は `gateway.api_server.max_concurrent_runs` から読みます（既定は **10**。`0` で無制限、負の値は 0 に丸められます）。上限に達すると、run を新しく始めるリクエストは **HTTP 429** の `Too many concurrent runs (max N)` で拒否されます。クライアント側は間を置いて試し直してください。

## セキュリティのヘッダー {#security-headers}

すべての応答にセキュリティのヘッダーが付きます。
- `X-Content-Type-Options: nosniff` — MIME 種別の推測を防ぐ
- `Referrer-Policy: no-referrer` — 参照元の漏れを防ぐ

## CORS {#cors}

API サーバーは、ブラウザー向けの CORS を既定では **有効にしません**。

ブラウザーから直接つなぐなら、許可する相手を明示してください。

```bash
API_SERVER_CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

CORS を有効にすると、次のようになります。
- **事前確認への応答** に `Access-Control-Max-Age: 600` が付きます（10 分のキャッシュ）
- **SSE のストリーミング応答** にも CORS のヘッダーが付くので、ブラウザーの EventSource のクライアントが正しく動きます
- **`Idempotency-Key`** をリクエストのヘッダーとして許可します。クライアントは重複を避けるために送れます（応答はキーごとに 5 分間キャッシュされます）

ここで説明しているフロントエンドの多く、たとえば Open WebUI はサーバー同士でつなぐので、CORS はそもそも要りません。

## つながるフロントエンド {#compatible-frontends}

OpenAI の API 形式に対応したフロントエンドなら何でも動きます。動作を確かめて説明があるものは次のとおりです。

| フロントエンド | Star 数 | つなぎ方 |
|----------|-------|------------|
| [Open WebUI](/hermes/docs/user-guide/messaging/open-webui/) | 126k | 詳しいガイドあり |
| LobeChat | 73k | 独自プロバイダーのエンドポイント |
| LibreChat | 34k | librechat.yaml の独自エンドポイント |
| AnythingLLM | 56k | 汎用の OpenAI プロバイダー |
| NextChat | 87k | BASE_URL の環境変数 |
| ChatBox | 39k | API Host の設定 |
| Jan | 26k | 遠隔モデルの設定 |
| HF Chat-UI | 8k | OPENAI_BASE_URL |
| big-AGI | 7k | 独自エンドポイント |
| OpenAI Python SDK | — | `OpenAI(base_url="http://localhost:8642/v1")` |
| curl | — | 直接 HTTP を叩く |

## プロファイルで多人数に使わせる {#multi-user-setup-with-profiles}

複数の人にそれぞれ独立した Hermes（設定・記憶・スキルが別々のもの）を渡すには、[プロファイル](/hermes/docs/user-guide/profiles/) を使います。

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

それぞれのプロファイルの API サーバーは、プロファイル名をモデルの ID として自動で名乗ります。

- `http://localhost:8643/v1/models` → モデル `alice`
- `http://localhost:8644/v1/models` → モデル `bob`

Open WebUI では、それぞれを別の接続として追加してください。モデルの一覧に `alice` と `bob` が別々のモデルとして並び、それぞれ完全に独立した Hermes が裏で動きます。詳しくは [Open WebUI のガイド](/hermes/docs/user-guide/messaging/open-webui/#multi-user-setup-with-profiles) を見てください。

## 制限 {#limitations}

- **応答の保存** — 保存された応答（`previous_response_id` 用）は SQLite に残るので、ゲートウェイを再起動しても消えません。保存できるのは最大 100 件です（古いものから捨てられます）。
- **ファイルのアップロードはできない** — 画像を本文に含めて渡す形は `/v1/chat/completions` と `/v1/responses` の両方で使えますが、アップロードしたファイル（`file`、`input_file`、`file_id`）や画像以外の書類は、この API 経由では扱えません。
- **単純な OpenAI クライアントには別名しか見えない** — `/v1/models` が名乗るのは Hermes の安定した別名（`hermes-agent` か、いま使っているプロファイル名）です。もっと作り込んだクライアントなら、リクエストで `provider` / `model_options` を明示して上書きできます。

## 中継モード {#proxy-mode}

API サーバーは、**ゲートウェイの中継モード** の受け手にもなります。別の Hermes ゲートウェイに `GATEWAY_PROXY_URL` を設定してこの API サーバーへ向けると、そのゲートウェイは自分でエージェントを動かさず、すべてのメッセージをここへ転送します。これで構成を分けられます。たとえば、Matrix の E2EE を担う Docker コンテナが、ホスト側のエージェントへ中継する、といった形です。

設定の全手順は [Matrix の中継モード](/hermes/docs/user-guide/messaging/matrix/#proxy-mode-e2ee-on-macos) を見てください。
