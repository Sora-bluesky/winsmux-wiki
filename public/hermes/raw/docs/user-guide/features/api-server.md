---
title: "API サーバー"
description: "hermes-agent を OpenAI 互換の API として公開し、好きなフロントエンドから使えるようにします。"
upstream_path: user-guide/features/api-server.md
upstream_blob: ccba76e104d1c5b3e196fd901da098375b6a6e0d
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/api-server
---

# API サーバー {#api-server}

API サーバーは、hermes-agent を OpenAI 互換の HTTP エンドポイントとして公開します。OpenAI の形式を話せるフロントエンドなら何でも接続できます。Open WebUI、LobeChat、LibreChat、NextChat、ChatBox をはじめ数百種類のクライアントが、hermes-agent を裏側の実行役として使えるようになります。

エージェントは持っている道具（端末操作、ファイル操作、ウェブ検索、記憶、スキル）を全部使ってリクエストを処理し、最後の応答を返します。ストリーミングのときは、ツールの進行状況が途中に差し込まれるので、エージェントが今なにをしているかをフロントエンド側で見せられます。

:::tip モデルもツールも、これひとつで
API サーバーを役立てるには、Hermes 側にプロバイダーの設定とツールの実行先が要ります。[Nous Portal](/hermes/docs/user-guide/features/tool-gateway/) の契約はその両方を一度に片づけます。300 以上のモデルに加えて、ウェブ・画像・TTS・ブラウザが Tool Gateway 経由で使えます。API サーバーを起動する前に `hermes setup --portal` を一度実行しておけば、Open WebUI や LobeChat などのフロントエンドは、ツールがひととおりそろった状態のエージェントを裏側に持てます。
:::

## 最短の手順 {#quick-start}

### 1. API サーバーを有効にする {#1-enable-the-api-server}

`~/.hermes/.env` に次を追記します。

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

OpenAI 互換のクライアントを `http://localhost:8642/v1` に向けます。

```bash
# Test with curl
curl http://localhost:8642/v1/chat/completions \
  -H "Authorization: Bearer change-me-local-dev" \
  -H "Content-Type: application/json" \
  -d '{"model": "hermes-agent", "messages": [{"role": "user", "content": "Hello!"}]}'
```

Open WebUI や LobeChat など他のフロントエンドをつなぐこともできます。手順は [Open WebUI との連携ガイド](/hermes/docs/user-guide/messaging/open-webui/) にひとつずつ書いてあります。

## エンドポイント {#endpoints}

### POST /v1/chat/completions {#post-v1chatcompletions}

OpenAI の Chat Completions 標準形式です。状態を持たないので、会話の全文を毎回 `messages` 配列に入れて送ります。

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

**画像を本文に入れて送る:** ユーザーのメッセージでは、`content` を `text` と `image_url` の部品を並べた配列として送れます。外部の `http(s)` URL と `data:image/...` 形式の URL、どちらにも対応しています。

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

**ストリーミング**（`"stream": true`）: Server-Sent Events（SSE）で、応答をトークン単位の断片として返します。**Chat Completions** では標準の `chat.completion.chunk` イベントに加えて、ツールの開始を見せるための Hermes 独自イベント `hermes.tool.progress` が流れます。**Responses** では `response.created`、`response.output_text.delta`、`response.output_item.added`、`response.output_item.done`、`response.completed` といった OpenAI Responses のイベント型を使います。

**ストリームの中でのツールの進行状況**:
- **Chat Completions**: Hermes は `event: hermes.tool.progress` を送り、保存される応答本文を汚さずにツールの開始を見せます。
- **Responses**: Hermes は SSE ストリームの途中で仕様どおりの `function_call` と `function_call_output` の出力項目を送るので、クライアント側はツールの様子を構造化された形で即座に描けます。

### POST /v1/responses {#post-v1responses}

OpenAI Responses API の形式です。`previous_response_id` によるサーバー側での会話保持に対応しています。サーバーが会話の履歴（ツールの呼び出しと結果を含む）を丸ごと保存するので、クライアントが自分で管理しなくても複数回のやりとりの文脈が保たれます。

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

`output` 配列に入っているツールの呼び出しは、Hermes のエージェントがサーバー側ですでに実行し終えたものです。構造化されたツール表示のために `"status": "completed"` を付けて再生しているだけで、クライアントが実行すべき未処理の呼び出しとして渡されることはありません。

**画像を本文に入れて送る:** `input[].content` には `input_text` と `input_image` の部品を入れられます。外部の URL と `data:image/...` 形式の URL、どちらにも対応しています。

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

#### previous_response_id で会話を続ける {#multi-turn-with-previousresponseid}

応答を数珠つなぎにすると、ツールの呼び出しも含めて文脈を保ったままやりとりを続けられます。

```json
{
  "input": "Now show me the README",
  "previous_response_id": "resp_abc123"
}
```

サーバーは、保存された応答のつながりから会話の全体を組み立て直します。それまでのツールの呼び出しと結果も残ります。つないだリクエストは同じセッションを共有するので、複数回のやりとりもダッシュボードやセッション履歴では 1 件としてまとまって見えます。

#### 名前付きの会話 {#named-conversations}

応答 ID を自分で追いかける代わりに、`conversation` を指定する手もあります。

```json
{"input": "Hello", "conversation": "my-project"}
{"input": "What's in src/?", "conversation": "my-project"}
{"input": "Run the tests", "conversation": "my-project"}
```

サーバーが、その会話の最新の応答へ自動でつなぎます。ゲートウェイのセッションでいう `/title` コマンドと同じ感覚です。

### GET /v1/responses/\{id\} {#get-v1responsesid}

保存済みの応答を ID で取り出します。

### DELETE /v1/responses/\{id\} {#delete-v1responsesid}

保存済みの応答を削除します。

### GET /v1/models {#get-v1models}

エージェントを、使えるモデルとして一覧に出します。表に出るモデル名は、既定では [プロファイル](/hermes/docs/user-guide/profiles/) の名前です（既定のプロファイルなら `hermes-agent`）。ほとんどのフロントエンドがモデルを見つけるために必要とします。

`/v1/models` は、あえて軽い OpenAI 互換の窓口にしてあります。Hermes が振り分けられる認証済みのプロバイダーとモデルの組み合わせを**すべて**並べることはしませんし、料金や機能の情報を足すこともしません。

### GET /api/model/options {#get-apimodeloptions}

Hermes を前提に作られたクライアントであれば、ダッシュボードや TUI が使っているのと同じ、整理済みのプロバイダー／モデル一覧を取得できます。この経路は API サーバーの通常の bearer 認証を使い、OpenAI 互換の `/v1/models` には載せられないプロバイダーの行、モデルの機能の目安、料金の情報を返します。

```bash
curl \
  -H "Authorization: Bearer $API_SERVER_KEY" \
  "http://127.0.0.1:8642/api/model/options"
```

この中身は、ダッシュボードの Models ページと TUI の `model.options` RPC が使っているものと同じ土台です。認証済みのプロバイダー、整理済みのモデル一覧、モデルごとの料金、モデルの機能の目安が返ります。

独自プロバイダーについては、普段の呼び出しはあえて控えめにしてあります。Hermes が状態を確かめに行くのは**いま選ばれている**独自エンドポイントだけなので、保存済みの古いエンドポイントや落ちているエンドポイントが選択画面を止めてしまうことはありません。明示的に更新を指示すると、すべてを確かめに行き、プロバイダーのモデルの記憶も捨てます。

```bash
curl \
  -H "Authorization: Bearer $API_SERVER_KEY" \
  "http://127.0.0.1:8642/api/model/options?refresh=1"
```

OpenAI 互換のクライアントが、chat や responses のリクエストに載せ返すモデル名だけを必要としているなら `/v1/models` を使ってください。認証済みの画面で、Hermes ならではの選択用の細かい情報が要るなら `/api/model/options` を使ってください。

### GET /v1/capabilities {#get-v1capabilities}

外部の画面、指揮役の仕組み、プラグインの橋渡しに向けて、API サーバーの安定した窓口を機械が読める形で説明して返します。

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

ダッシュボード、ブラウザの画面、制御の仕組みをつなぎ込むときはこのエンドポイントを使ってください。動いている Hermes が run、ストリーミング、中断、セッションの引き継ぎに対応しているかどうかを、Python の内部実装に頼らずに調べられます。

## リクエストごとのモデル指定 {#per-request-model-selection}

認証済みのクライアントは、次の項目を送ることで、Hermes の既定のモデル選択をリクエストごとに上書きできます。

- `model` — この回で使いたいモデルの id
- `provider` — この回の認証情報と実行環境を決めるための、Hermes 側のプロバイダー識別名
- `model_options` — このリクエストだけに効く、推論の深さやサービス階層の指定

同じ項目は、次のいずれでも受け付けます。

- `POST /v1/chat/completions`
- `POST /v1/responses`
- `POST /v1/runs`
- `POST /api/sessions/{session_id}/chat`
- `POST /api/sessions/{session_id}/chat/stream`

優先順位は決まっています。

1. そのセッションにすでに `/model` の上書きがあれば、それ
2. リクエストの `model` が設定済みの経路の別名に当たる場合、静的な `gateway.platforms.api_server.model_routes` の対応づけ
3. 経路の別名に当たらない場合、リクエストが直接指定した `model` / `provider`
4. ゲートウェイ全体の設定、または環境変数の既定値

どのモデルとプロバイダーが選ばれても、`model_options` はそのリクエストの中だけで効きます。設定済みの `model_routes` の別名と食い違う `provider` を送った場合、Hermes は経路の認証情報を別のプロバイダーと黙って混ぜたりせず、`400` で断ります。

**OpenAI 互換のエンドポイントでは、`model` だけを送る形は既定で無効です。** 一般的な OpenAI クライアントはモデル名（`gpt-4o` など）を決め打ちで書いてくることが多く、既存の運用はそれがゲートウェイの既定へ落ちることを当てにしています。そのため `POST /v1/chat/completions` と `POST /v1/responses` では、`provider` を伴わない `model` の値は、次を有効にしないかぎり無視されます。

```yaml
gateway:
  platforms:
    api_server:
      direct_model_requests: true
```

`provider` を明示したリクエストと、Hermes 独自の `/v1/runs` およびセッション用の chat エンドポイントは、この設定に関係なく、指定されたモデルを必ず使います。

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

生存確認です。`{"status": "ok"}` を返します。`/v1/` が付いていることを前提とする OpenAI 互換のクライアント向けに、**GET /v1/health** でも同じものを返します。

### GET /health/detailed {#get-healthdetailed}

監視や制御の仕組み向けの、認証が要る準備状況の確認です。動いているプロファイルの設定、状態データベース、設定されたモデル、ディスクの空き、ゲートウェイと各プラットフォームの状態、実行中の API run、待機中のプロセスの完了、動いている委任について、範囲を絞った状態を返します。返るのは状態と件数だけで、設定値、認証情報、パス、コマンド、待ち行列の中身、生のエラーは出しません。

公開されている `/health` のほうは軽い生存確認のままで、準備状況の確認は行いません。準備状況が悪化していても HTTP は 200 のままなので、いちばん外側の `status` と `readiness.checks` を見てください。

## Runs API（ストリーミングと相性のよいもうひとつの道） {#runs-api-streaming-friendly-alternative}

`/v1/chat/completions` と `/v1/responses` に加えて、**runs** の API も用意しています。長いやりとりで、クライアントがストリーミングを自分で管理する代わりに、進行のイベントを受け取りたい場合に向いています。

### POST /v1/runs {#post-v1runs}

エージェントの run を新しく作ります。進行のイベントを受け取るために使う `run_id` が返ります。

```json
{
  "run_id": "run_abc123",
  "status": "started"
}
```

run が受け取るのは、単純な `input` の文字列と、任意の `session_id`、`instructions`、`conversation_history`、`previous_response_id` です。`session_id` を渡すと、Hermes は run の状態にそれを出すので、外部の画面が自分の会話 ID と run を突き合わせられます。

### GET /v1/runs/\{run_id\} {#get-v1runsrunid}

run のいまの状態を取りに行きます。SSE の接続を開いたままにせず状態だけ欲しいダッシュボードや、画面遷移のあとにつなぎ直す画面に向いています。

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

終わった状態（`completed`、`failed`、`cancelled`）になったあとも、状態は少しのあいだ残ります。取りに行く処理や画面側の突き合わせのためです。

### GET /v1/runs/\{run_id\}/events {#get-v1runsrunidevents}

run のツール呼び出しの進行、トークンの差分、開始と終了のイベントを Server-Sent Events で流します。つないだり切ったりしても状態を見失いたくない、ダッシュボードや作り込んだクライアント向けです。

エージェントが裏で動くサブエージェントに仕事を任せると、`subagent.start` と `subagent.complete` のイベントもこのストリームに流れます。おかげでクライアント側は、任せた仕事の結果（時間切れや失敗も含めて）を見られます。子が働いているあいだ run が黙り込むことはありません。`subagent.complete` の中身には、子の状態、要約、所要時間、トークンと費用の数字、突き合わせ用の `child_session_id` が入ります。自由記述の項目は、プロセスの外へ出る前に必ず秘密の伏せ字処理を通ります。子のツール単位のイベント（`subagent.tool` や進行の刻み）は、あえて転送**しません**。量が多くて画面の邪魔になるからです。逐一の様子を追いたいときは、子ごとの実況の記録ファイルを見てください。

読まれないまま残ったイベントの控えは 5 分で消えます。切断したクライアントのせいでメモリが無限に膨らまないようにするためです。消えるのは受け渡しの状態だけで、まだ動いている run は、実行の中身が本当に終わるまで、状態の確認・承認・停止の操作・同時実行数の勘定から見えたままです。つながっている SSE の受け手は、そのまま普通に受け取り続けます。

### POST /v1/runs/\{run_id\}/stop {#post-v1runsrunidstop}

エージェントの実行中の回を中断します。このエンドポイントはすぐに `{"status": "stopping"}` を返し、その裏で Hermes が、動いているエージェントに次の安全な切れ目で止まるよう伝えます。
run は、実行の中身が終わるまで `stopping` として追跡され、そのあと `cancelled` に落ち着きます。停止を頼んだからといって、まだ動いている実行が見えなくなることはありません。

### POST /v1/runs/\{run_id\}/approval {#post-v1runsrunidapproval}

人の判断を待っている run の承認を返します（承認の決まりで止められたツールの呼び出しなど）。本文に判断を載せて送ると、それが記録された時点で run が再開します。このエンドポイントは `/v1/capabilities` で `run_approval` という機能として告知されるので、外部の画面は承認の問いかけを出す前に対応状況を調べられます。

## Jobs API（裏で動く予定実行） {#jobs-api-background-scheduled-work}

離れたところにあるクライアントから、予定実行や裏で動くエージェントの run を扱えるよう、軽い jobs の CRUD の窓口を用意しています。どのエンドポイントも同じ bearer 認証で守られています。

### GET /api/jobs {#get-apijobs}

予定されている job を全部並べます。

### POST /api/jobs {#post-apijobs}

新しい予定実行の job を作ります。本文の形は `hermes cron` と同じで、プロンプト、予定、スキル、プロバイダーの上書き、届け先を指定します。

### GET /api/jobs/\{job_id\} {#get-apijobsjobid}

job ひとつの定義と、前回の実行の状態を取ります。

### PATCH /api/jobs/\{job_id\} {#patch-apijobsjobid}

既存の job の項目（プロンプト、予定など）を更新します。一部だけの更新は、元の内容に上書きされます。

### DELETE /api/jobs/\{job_id\} {#delete-apijobsjobid}

job を消します。実行中の run があれば、それも取り消します。

### POST /api/jobs/\{job_id\}/pause {#post-apijobsjobidpause}

job を消さずに休ませます。次の実行予定の時刻は、再開するまで止まります。

### POST /api/jobs/\{job_id\}/resume {#post-apijobsjobidresume}

休ませていた job を再開します。

### POST /api/jobs/\{job_id\}/run {#post-apijobsjobidrun}

予定を待たずに、その job をいますぐ動かします。

## Sessions API（REST でのセッション操作） {#sessions-api-session-control-over-rest}

外部の画面は、ダッシュボードを立てなくても REST から Hermes のセッションを扱えます。どのエンドポイントも `API_SERVER_KEY` で守られていて、`/api/sessions/*` の下にあります。

| メソッド | パス | 内容 |
|--------|------|-------------|
| `GET` | `/api/sessions` | セッションを並べる（ページ分割 — `limit`、`offset`、`source`、`include_children`） |
| `POST` | `/api/sessions` | 空のセッションを作る |
| `GET` | `/api/sessions/{id}` | セッションの情報を読む |
| `PATCH` | `/api/sessions/{id}` | 題名または `end_reason` を更新する |
| `DELETE` | `/api/sessions/{id}` | セッションを削除する |
| `GET` | `/api/sessions/{id}/messages` | そのセッションのやりとりの履歴 |
| `POST` | `/api/sessions/{id}/fork` | `SessionDB` の系譜をたどってセッションを枝分かれさせる（CLI の `/branch` と同じ挙動） |
| `POST` | `/api/sessions/{id}/chat` | エージェントの回を 1 回、同期で走らせる |
| `POST` | `/api/sessions/{id}/chat/stream` | 1 回分を SSE で包んだもの — `assistant.delta`、`tool.started`、`tool.completed`、`run.completed` のイベントを流す |

`/v1/capabilities` は、この窓口の全体を `session_*` の機能フラグと `endpoints.session_*` の項目で告知します。外部の画面は対応状況を調べて、安全に別の手へ切り替えられます。`chat` と `chat/stream` の本文では画像も扱えます（複数の形式に対応した経路です）。

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

## スキルとツールセットの照会 {#skills-and-toolsets-discovery}

`GET /v1/skills` と `GET /v1/toolsets` を使うと、外部のクライアントがエージェントにできることを、モデルに尋ねるのではなく REST から確実に数え上げられます。どちらも読み取り専用で、`API_SERVER_KEY` で守られています。

```bash
curl http://localhost:8642/v1/skills \
  -H "Authorization: Bearer $API_SERVER_KEY"
# → [{"name": "github-pr-workflow", "description": "...", "category": "..."}, ...]

curl http://localhost:8642/v1/toolsets \
  -H "Authorization: Bearer $API_SERVER_KEY"
# → [{"name": "core", "label": "...", "description": "...", "enabled": true,
#     "configured": true, "tools": ["read_file", "write_file", ...]}, ...]
```

`/v1/skills` は、スキルの取りまとめが内部で使っているのと同じ情報を返します。`/v1/toolsets` は `api_server` のプラットフォーム向けに解決されたツールセットと、それぞれが実際に展開する `tools` の一覧を返します。どちらも `/v1/capabilities` の `endpoints.*` で告知されます。

## 長期記憶の区切り方（`X-Hermes-Session-Key`） {#long-term-memory-scoping-x-hermes-session-key}

Open WebUI のように複数の利用者が使うフロントエンドでは、長期記憶（Honcho など）のために、会話の入れ物ごとに変わらない目印が要ります。しかもそれは、`/new` のたびに変わってしまう、やりとりの記録に紐づいた `X-Hermes-Session-Id` とは**別物**でなければなりません。`/v1/chat/completions`、`/v1/responses`、`/v1/runs` に `X-Hermes-Session-Key` を付けて送ると、Hermes はそれを `AIAgent(gateway_session_key=...)` まで通し、Honcho の記憶の担当がそこから変わらない区切りを作ります。

```http
POST /v1/chat/completions HTTP/1.1
Authorization: Bearer ***
X-Hermes-Session-Id: transcript-alpha
X-Hermes-Session-Key: agent:main:webui:dm:user-42
```

決まりごと: 最大 256 文字、制御文字（`\r`、`\n`、`\x00`）は受け付けません。値は応答（JSON と SSE）にそのまま返します。`/v1/capabilities` は `"session_key_header": "X-Hermes-Session-Key"` として対応を告知します。この目印がないと、Honcho の `per-session` の方式では `session_id` ごとに別々の区切りができます。Hermes が以前そうだった挙動そのものです。

## システムプロンプトの扱い {#system-prompt-handling}

フロントエンドが `system` のメッセージ（Chat Completions）や `instructions` の項目（Responses API）を送ってきたとき、hermes-agent はそれを自分の中心のシステムプロンプトの**上に重ねます**。エージェントは道具も記憶もスキルも全部持ったままで、フロントエンドのシステムプロンプトは追加の指示として効きます。

つまり、できることを削らずに、フロントエンドごとの味付けができます。
- Open WebUI のシステムプロンプト: 「Python の専門家として答えてください。型注釈は必ず付けてください。」
- それでもエージェントは端末操作、ファイルの道具、ウェブ検索、記憶などを持ったままです。

## 認証 {#authentication}

`Authorization` ヘッダーによる bearer トークン認証です。

```
Authorization: Bearer ***
```

鍵は `API_SERVER_KEY` の環境変数で設定します。ブラウザから Hermes を直接呼ぶ必要がある場合は、`API_SERVER_CORS_ORIGINS` にも許可する相手を明示的に並べてください。

### プロファイルごとの経路（`/p/<profile>/…`） {#multi-profile-routing-pprofile}

[プロファイル別のゲートウェイ経路](/hermes/docs/user-guide/multi-profile-gateways/) を有効（`gateway.multiplex_profiles`）にすると、ひとつの待ち受け口が `/p/<profile>/` という接頭辞で全プロファイルを配ります。このとき**認証はその経路のプロファイルに結びつきます**。

- `/p/<profile>/v1/...` へのリクエストには、そのプロファイル自身の `API_SERVER_KEY`（`~/.hermes/profiles/<profile>/.env` のもの）が要ります。既定の待ち受け口の鍵は、名前付きプロファイルの接頭辞では受け付けません。
- 接頭辞のない経路と `/p/default/...` は、これまでどおり既定のプロファイルの鍵を使います。
- 自分の `API_SERVER_KEY` を持たない名前付きプロファイルは、閉じた側に倒れます。鍵を設定するまで、その接頭辞へは入れません。

:::warning 互換性のない変更（2026 年 7 月）
この修正の前は、既定プロファイルの正しい鍵が、どの `/p/<profile>/` 接頭辞でも通っていました。ひとつの鍵を接頭辞をまたいで使い回していた場合は、各プロファイルの `.env` にそれぞれ別の `API_SERVER_KEY` を設定してください。名前付きの接頭辞で既定の鍵を使い回すと、これからは `401` が返ります。
:::

:::warning セキュリティ
API サーバーは hermes-agent の道具一式に、**端末コマンドも含めて**全部触れさせます。`API_SERVER_KEY` は、既定の `127.0.0.1` への待ち受けも含めて、**どんな構成でも必須**です。ブラウザからの呼び出しをあえて許すときは、`API_SERVER_CORS_ORIGINS` を狭く保って、どこから来るものを許すかを絞ってください。
:::

## 設定 {#configuration}

### 環境変数 {#environment-variables}

| 変数 | 既定値 | 内容 |
|----------|---------|-------------|
| `API_SERVER_ENABLED` | `false` | API サーバーを有効にする |
| `API_SERVER_PORT` | `8642` | HTTP サーバーのポート |
| `API_SERVER_HOST` | `127.0.0.1` | 待ち受けるアドレス（既定では自分の端末の中だけ） |
| `API_SERVER_KEY` | _(必須)_ | 認証用の bearer トークン |
| `API_SERVER_CORS_ORIGINS` | _(なし)_ | ブラウザからの呼び出しを許す送り元をカンマ区切りで |
| `API_SERVER_MODEL_NAME` | _(プロファイル名)_ | `/v1/models` に出るモデル名。既定はプロファイル名で、既定のプロファイルなら `hermes-agent`。 |

### config.yaml {#configyaml}

同じ設定は、`~/.hermes/config.yaml` の `gateway.api_server:` という入れ子の節にも書けます。

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

`port`、`key`、`host`、`cors_origins`、`model_name` は自動でプラットフォームの `extra` 設定へ橋渡しされるので、`API_SERVER_*` の環境変数とまったく同じように働きます。環境変数のほうが `config.yaml` の値より優先されます。この節は `gateway.platforms.api_server:` の下や、いちばん外側の `platforms.api_server:` の節に書いても受け付けます。

### 同時実行数の上限 {#concurrent-run-cap}

API サーバーは、OpenAI 互換のエンドポイントと Runs のエンドポイントを合わせて、エージェントの run を同時に何本まで走らせるかを制限します。上限は `gateway.api_server.max_concurrent_runs` から読みます（既定は **10**。`0` で制限なし、負の値は 0 に丸めます）。上限に達すると、新しく run を始めるリクエストは **HTTP 429** の `Too many concurrent runs (max N)` で断られます。クライアント側は間を置いてやり直してください。

## セキュリティ用のヘッダー {#security-headers}

どの応答にも、次のヘッダーが付きます。
- `X-Content-Type-Options: nosniff` — MIME タイプの推測を防ぎます
- `Referrer-Policy: no-referrer` — 参照元が漏れるのを防ぎます

## CORS {#cors}

API サーバーは、既定ではブラウザ向けの CORS を**有効にしません**。

ブラウザから直接つなぎたい場合は、許す送り元を明示的に並べてください。

```bash
API_SERVER_CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

CORS を有効にすると、次のようになります。
- **事前確認の応答**に `Access-Control-Max-Age: 600`（10 分間の保持）が付きます
- **SSE のストリーミング応答**にも CORS のヘッダーが付くので、ブラウザの EventSource が正しく動きます
- **`Idempotency-Key`** を送ってよいヘッダーとして許します。クライアントは重複を避けるために送れます（応答は鍵ごとに 5 分間覚えておきます）

Open WebUI をはじめ、ここで案内しているフロントエンドのほとんどはサーバー同士でつなぐので、CORS はまったく要りません。

## つながるフロントエンド {#compatible-frontends}

OpenAI API の形式に対応したフロントエンドなら何でも動きます。動作を確かめて手順を書いてあるものは次のとおりです。

| フロントエンド | スター数 | つなぎ方 |
|----------|-------|------------|
| [Open WebUI](/hermes/docs/user-guide/messaging/open-webui/) | 126k | 手順書あり |
| LobeChat | 73k | 独自プロバイダーのエンドポイント |
| LibreChat | 34k | librechat.yaml に独自エンドポイントを書く |
| AnythingLLM | 56k | 汎用の OpenAI プロバイダー |
| NextChat | 87k | BASE_URL の環境変数 |
| ChatBox | 39k | API Host の設定 |
| Jan | 26k | リモートモデルの設定 |
| HF Chat-UI | 8k | OPENAI_BASE_URL |
| big-AGI | 7k | 独自エンドポイント |
| OpenAI Python SDK | — | `OpenAI(base_url="http://localhost:8642/v1")` |
| curl | — | HTTP を直接叩く |

## プロファイルで複数の利用者に配る {#multi-user-setup-with-profiles}

複数の利用者に、それぞれ独立した Hermes（設定・記憶・スキルが別々）を渡すには、[プロファイル](/hermes/docs/user-guide/profiles/) を使います。

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

それぞれのプロファイルの API サーバーは、プロファイル名をそのままモデル ID として名乗ります。

- `http://localhost:8643/v1/models` → モデル `alice`
- `http://localhost:8644/v1/models` → モデル `bob`

Open WebUI では、それぞれを別の接続として登録します。モデルの一覧には `alice` と `bob` が別のモデルとして並び、その裏側はそれぞれ完全に切り離された Hermes です。詳しくは [Open WebUI のガイド](/hermes/docs/user-guide/messaging/open-webui/#multi-user-setup-with-profiles) を見てください。

## できないこと {#limitations}

- **応答の保存** — `previous_response_id` のために保存する応答は SQLite に残るので、ゲートウェイを再起動しても消えません。保存できるのは最大 100 件です（古いものから順に捨てます）。
- **ファイルのアップロードはできない** — 画像を本文に入れる形は `/v1/chat/completions` と `/v1/responses` の両方で使えますが、アップロードしたファイル（`file`、`input_file`、`file_id`）や画像以外の書類は、この API では扱えません。
- **単純な OpenAI クライアントには別名しか見えない** — `/v1/models` に出るのは、Hermes の変わらない別名（`hermes-agent` か、動いているプロファイルの名前）です。もっと作り込んだクライアントなら、リクエストで `provider` や `model_options` を明示して上書きできます。

## 中継として使う {#proxy-mode}

API サーバーは、**ゲートウェイの中継**の受け手にもなります。別の Hermes のゲートウェイで `GATEWAY_PROXY_URL` をこの API サーバーに向けて設定すると、そちらは自分でエージェントを動かさず、すべてのメッセージをここへ転送します。おかげで役割を分けた構成が作れます。たとえば、Matrix の端末間暗号化を Docker のコンテナが担当し、本体の端末側にいるエージェントへ中継する、といった形です。

詳しい手順は [Matrix の中継](/hermes/docs/user-guide/messaging/matrix/#proxy-mode-e2ee-on-macos) を見てください。
