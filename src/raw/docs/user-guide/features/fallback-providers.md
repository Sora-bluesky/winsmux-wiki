---
title: "フォールバックプロバイダー"
description: "主に使うモデルが使えなくなったとき、控えの LLM プロバイダーへ自動で切り替わるように設定します。"
upstream_path: user-guide/features/fallback-providers.md
upstream_blob: cf0610d0f0b23ee19a326c27116a97f4bb5f5613
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/fallback-providers
---

# フォールバックプロバイダー {#fallback-providers}

Hermes Agent には、プロバイダー側で問題が起きてもセッションを止めないための備えが 3 層あります。

1. **[認証情報プール](/hermes/docs/user-guide/features/credential-pools/)** — *同じ* プロバイダーの複数の API キーを回して使います（最初に試されます）
2. **主モデルのフォールバック** — 主に使っているモデルが失敗したとき、*別の* プロバイダーとモデルの組み合わせへ自動で切り替えます
3. **補助タスクのフォールバック** — 画像認識や圧縮といった脇の処理について、独立にプロバイダーを解決します

同じプロバイダー内での持ち回りは認証情報プールが担当します（たとえば OpenRouter のキーを複数持っている場合）。このページで扱うのは、プロバイダーをまたぐフォールバックです。どちらも任意で、それぞれ独立に動きます。

## 主モデルのフォールバック {#primary-model-fallback}

主に使っている LLM プロバイダーでエラーが起きたとき — レート制限、サーバー過負荷、認証失敗、接続断など — Hermes はセッションの途中でも会話を失わずに、控えのプロバイダーとモデルの組み合わせへ自動で切り替えられます。

### 設定 {#configuration}

いちばん簡単なのは対話式の管理画面です。

```bash
hermes fallback
```

`hermes fallback` は `hermes model` のプロバイダー選択をそのまま使い回します。プロバイダーの一覧も、認証情報の入力も、検証も同じです。並び順の管理には、サブコマンドの `add`、`list`（別名 `ls`）、`remove`（別名 `rm`）、`clear` を使います。変更内容は `config.yaml` の最上位にある `fallback_providers:` の一覧に保存されます。

YAML を直接編集したい場合は、`~/.hermes/config.yaml` の最上位に `fallback_providers` の一覧を足します。

```yaml
fallback_providers:
  - provider: openrouter
    model: anthropic/claude-sonnet-4
```

各項目には `provider` と `model` の両方が必要です。どちらかが欠けている項目は無視されます。

:::note `fallback_model` と `fallback_providers` の違い
`fallback_providers`（複数形、一覧）が現行の設定の形で、複数の控えを順に試せます。`fallback_model`（単数形）は控えを 1 つだけ書く古いキーです。Hermes は互換のために今も受け付けますが、`hermes fallback` は現行の `fallback_providers` キーで書き出し、書き込み時に古い設定を移行します。両方が設定されている場合は `fallback_providers` が優先されます。
:::

### 対応プロバイダー {#supported-providers}

| プロバイダー | 値 | 必要なもの |
|----------|-------|-------------|
| AI Gateway | `ai-gateway` | `AI_GATEWAY_API_KEY` |
| OpenRouter | `openrouter` | `OPENROUTER_API_KEY` |
| Nous Portal | `nous` | `hermes setup --portal`（新規）または `hermes auth add nous`（OAuth） |
| OpenAI Codex | `openai-codex` | `hermes model` → **ChatGPT or Codex Subscription**（ChatGPT の OAuth） |
| GitHub Copilot | `copilot` | `COPILOT_GITHUB_TOKEN`、`GH_TOKEN`、`GITHUB_TOKEN` のいずれか |
| GitHub Copilot ACP | `copilot-acp` | 外部プロセス（エディター連携） |
| Anthropic | `anthropic` | `ANTHROPIC_API_KEY` または Claude Code の認証情報 |
| z.ai / GLM | `zai` | `GLM_API_KEY` |
| Kimi / Moonshot | `kimi-coding` | `KIMI_API_KEY` |
| MiniMax | `minimax` | `MINIMAX_API_KEY` |
| MiniMax（中国） | `minimax-cn` | `MINIMAX_CN_API_KEY` |
| DeepSeek | `deepseek` | `DEEPSEEK_API_KEY` |
| NVIDIA NIM | `nvidia` | `NVIDIA_API_KEY`（任意: `NVIDIA_BASE_URL`） |
| GMI Cloud | `gmi` | `GMI_API_KEY`（任意: `GMI_BASE_URL`） |
| Upstage Solar | `upstage`（別名 `solar`） | `UPSTAGE_API_KEY`（任意: `UPSTAGE_BASE_URL`） |
| StepFun | `stepfun` | `STEPFUN_API_KEY`（任意: `STEPFUN_BASE_URL`） |
| Ollama Cloud | `ollama-cloud` | `OLLAMA_API_KEY` |
| Google AI Studio | `gemini` | `GOOGLE_API_KEY`（別名: `GEMINI_API_KEY`） |
| xAI (Grok) | `xai`（別名 `grok`） | `XAI_API_KEY`（任意: `XAI_BASE_URL`） |
| xAI Grok OAuth (SuperGrok) | `xai-oauth`（別名 `grok-oauth`） | `hermes model` → xAI Grok OAuth（ブラウザーでログイン。SuperGrok の契約が必要） |
| AWS Bedrock | `bedrock` | boto3 の標準的な認証（`AWS_REGION` と `AWS_PROFILE`、または `AWS_ACCESS_KEY_ID`） |
| Qwen Portal (OAuth) | `qwen-oauth` | `hermes model`（Qwen Portal の OAuth。任意: `HERMES_QWEN_BASE_URL`） |
| MiniMax (OAuth) | `minimax-oauth` | `hermes model`（MiniMax ポータルの OAuth） |
| OpenCode Zen | `opencode-zen` | `OPENCODE_ZEN_API_KEY` |
| CommandCode | `commandcode`（別名 `commandcode-chat`。Claude は `commandcode-anthropic` 経由） | `COMMANDCODE_API_KEY` |
| OpenCode Go | `opencode-go` | `OPENCODE_GO_API_KEY` |
| OpenCode Free | `opencode-free` | —（キー不要、認証情報なし） |
| Kilo Code | `kilocode` | `KILOCODE_API_KEY` |
| Xiaomi MiMo | `xiaomi` | `XIAOMI_API_KEY` |
| Arcee AI | `arcee` | `ARCEEAI_API_KEY` |
| GMI Cloud | `gmi` | `GMI_API_KEY` |
| Alibaba / DashScope | `alibaba` | `DASHSCOPE_API_KEY` |
| Alibaba Coding Plan | `alibaba-coding-plan` | `ALIBABA_CODING_PLAN_API_KEY`（なければ `DASHSCOPE_API_KEY` を使います） |
| Kimi / Moonshot（中国） | `kimi-coding-cn` | `KIMI_CN_API_KEY` |
| StepFun | `stepfun` | `STEPFUN_API_KEY` |
| Tencent TokenHub | `tencent-tokenhub` | `TOKENHUB_API_KEY` |
| Microsoft Foundry | `azure-foundry` | `AZURE_FOUNDRY_API_KEY` と `AZURE_FOUNDRY_BASE_URL` |
| LM Studio（ローカル） | `lmstudio` | `LM_API_KEY`（ローカルなら不要）と `LM_BASE_URL` |
| Hugging Face | `huggingface` | `HF_TOKEN` |
| 独自のエンドポイント | `custom` | `base_url` と `key_env`（下記を参照） |

### 独自エンドポイントへのフォールバック {#custom-endpoint-fallback}

OpenAI 互換の独自エンドポイントを使う場合は、`base_url` と、必要なら `key_env` を足します。

```yaml
fallback_providers:
  - provider: custom
    model: my-local-model
    base_url: http://localhost:8000/v1
    key_env: MY_LOCAL_KEY            # env var name containing the API key
```

### フォールバックが起きる条件 {#when-fallback-triggers}

主モデルが次のような失敗をしたとき、フォールバックが自動で働きます。

- **レート制限**（HTTP 429）— 再試行を使い切ったあと
- **サーバーエラー**（HTTP 500、502、503）— 再試行を使い切ったあと
- **認証失敗**（HTTP 401、403）— ただちに（再試行しても意味がないため）
- **見つからない**（HTTP 404）— ただちに
- **不正な応答** — API が壊れた応答や空の応答を返し続けるとき

フォールバックが働くと、Hermes は次の順で処理します。

1. 控えのプロバイダー向けに認証情報を解決する
2. 新しい API クライアントを組み立てる
3. モデル・プロバイダー・クライアントをその場で差し替える
4. 再試行のカウンターをリセットして会話を続ける

切り替えは途切れません。会話履歴もツール呼び出しもコンテキストもそのまま保たれます。エージェントは中断したところからそのまま、モデルだけを変えて続けます。

:::warning フォールバックするとプロンプトキャッシュが消える
プロンプトキャッシュは、そのリクエストを処理するモデル（多くのプロバイダーではアカウントも）に紐づいています。フォールバックが起きると、新しいプロバイダーとモデルの組み合わせには会話のキャッシュ済み接頭辞がないので、次のリクエストは履歴全体を、約 75〜90% 割引のキャッシュ料金ではなく入力トークンの正規料金で読み直します。ターンが終わって主モデルに戻るときも同じで、戻ってからの最初のリクエストはやはり全部の読み直しになります（主モデル側のキャッシュの有効期限が切れていなければ別です）。これは避けられません。障害をまたいで動き続けるための代償です。ただ、プロバイダーの間を行き来する長いセッションが、動かないセッションよりはっきり高くつくのはこのためです。
:::

:::info セッション単位ではなくターン単位
フォールバックは **ターン単位** です。ユーザーの新しいメッセージごとに、主モデルに戻った状態から始まります。ターンの途中で主モデルが失敗すると、そのターンだけフォールバックが働きます。次のメッセージでは、Hermes はまた主モデルから試します。1 つのターンの中では、フォールバックは多くても 1 回しか起きません。控えのほうも失敗した場合は、通常のエラー処理（再試行、そしてエラーメッセージ）に移ります。こうすることで、ターンの中で切り替えが連鎖するのを防ぎつつ、毎ターン主モデルにやり直しの機会を与えています。

ターンごとの再試行は **リセット時刻を見ています**。主モデルの認証情報が、まだ過ぎていないレート制限のリセット時刻を返してきたとき（Claude Pro/Max の 5 時間枠や Codex の週次上限のような契約の枠では、時間単位や日単位で返ってきます）、Hermes は失敗が分かりきった再試行を飛ばし、リセットまで控えのまま進みます。おかげで 1 ターンにつき無駄なプロバイダー切り替えが 2 回（とプロンプトキャッシュの破棄が 2 回）起きるのを避けられます。リセット時刻を過ぎた瞬間、次のターンから自動で主モデルに戻ります。リセット時刻のない一時的な 429 はこれまでどおりで、短い待機のあと毎ターン再試行します。
:::

### 例 {#examples}

**Anthropic 直接接続の控えに OpenRouter を使う:**
```yaml
model:
  provider: anthropic
  default: claude-sonnet-4-6

fallback_providers:
  - provider: openrouter
    model: anthropic/claude-sonnet-4
```

**OpenRouter の控えに Nous Portal を使う:**
```yaml
model:
  provider: openrouter
  default: anthropic/claude-opus-4

fallback_providers:
  - provider: nous
    model: nous-hermes-3
```

**クラウドの控えにローカルのモデルを使う:**
```yaml
fallback_providers:
  - provider: custom
    model: llama-3.1-70b
    base_url: http://localhost:8000/v1
    key_env: LOCAL_API_KEY
```

**控えに Codex の OAuth を使う:**
```yaml
fallback_providers:
  - provider: openai-codex
    model: gpt-5.3-codex
```

### フォールバックが効く場所 {#where-fallback-works}

| 場面 | フォールバックの対応 |
|---------|-------------------|
| CLI のセッション | ✔ |
| メッセージングのゲートウェイ（Telegram、Discord など） | ✔ |
| サブエージェントへの委任 | ✔（サブエージェントは親の控えの並びを引き継ぎます） |
| 定期実行のジョブ | ✔（定期実行のエージェントは設定済みの控えを引き継ぎます） |
| `provider: auto` の補助タスク | ✔（タスクごとの控え、次に主モデルの控えの並びを試し、その後で組み込みの補助探索に移ります） |

:::tip
主モデルの控えの並びを指定する環境変数はありません。設定は `config.yaml` か `hermes fallback` だけで行います。これは意図的です。フォールバックの設定は意識して選ぶものであり、古いシェルの export に上書きされてよいものではないからです。
:::

---

## 補助タスクのフォールバック {#auxiliary-task-fallback}

Hermes は脇の処理に、別の軽量なモデルを使います。タスクごとにプロバイダーの解決順が独立していて、これ自体が組み込みのフォールバックとして働きます。

### プロバイダーを独立に解決するタスク {#tasks-with-independent-provider-resolution}

| タスク | 何をするか | 設定キー |
|------|-------------|-----------|
| 画像認識 | 画像の解析、ブラウザーのスクリーンショット | `auxiliary.vision` |
| 圧縮 | コンテキスト圧縮の要約 | `auxiliary.compression` |
| Skills Hub | スキルの検索と発見 | `auxiliary.skills_hub` |
| MCP | MCP の補助的な処理 | `auxiliary.mcp` |
| 承認 | コマンド承認の賢い判定 | `auxiliary.approval` |
| タイトル生成 | セッションのタイトルをまとめる | `auxiliary.title_generation` |
| レビュー | `/review` のレビュー担当サブエージェント（LLM を 1 回呼ぶだけでなく、エージェントとして動きます） | `auxiliary.review` |
| 仕様の肉付け | `hermes kanban specify` とダッシュボードの ✨ ボタン。1 行のトリアージ用タスクを本物の仕様に膨らませます | `auxiliary.triage_specifier` |

### 自動判定の順序 {#auto-detection-chain}

タスクのプロバイダーが `"auto"`（既定）のとき、Hermes はまずその補助タスクを主プロバイダーと主モデルで処理しようとします。その経路が使えない場合や、あとから容量系のエラーで失敗した場合、Hermes は組み込みの探索順に入る前に、まずユーザーが設定したフォールバックの方針に従います。

```text
Main provider + main model → auxiliary.<task>.fallback_chain →
fallback_providers / fallback_model → built-in auxiliary discovery chain
```

タスクごとの並びがいちばん細かい指定なので、書いてあればそれが優先されます。最上位の `fallback_providers` の並びは主エージェントが使うのと同じ方針なので、無料のみに限る、同じプロバイダーに限る、といった規則が `auto` の補助タスクにもそのまま効きます。

**組み込みのテキスト用の探索順（圧縮、Web 抽出、タイトル生成など）:**

```text
OpenRouter → Nous Portal → Custom endpoint → Codex OAuth →
API-key providers (z.ai, Kimi, MiniMax, Xiaomi MiMo, Hugging Face, Anthropic) → give up
```

**組み込みの画像認識用の探索順:**

```text
Main provider (if vision-capable) → OpenRouter → Nous Portal →
Codex OAuth → Anthropic → Custom endpoint → give up
```

これらの組み込みの並びは、タスクごとの方針も主モデルの控えの方針も書いていない人のための、便利な逃げ道です。

### 補助プロバイダーの設定 {#configuring-auxiliary-providers}

タスクごとに `config.yaml` で別々に設定できます。

```yaml
auxiliary:
  vision:
    provider: "auto"              # auto | openrouter | nous | codex | main | anthropic
    model: ""                     # e.g. "openai/gpt-4o"
    base_url: ""                  # direct endpoint (takes precedence over provider)
    api_key: ""                   # API key for base_url

  compression:
    provider: "auto"
    model: ""
    fallback_chain:              # optional, task-specific fallback policy
      - provider: openrouter
        model: inclusionai/ring-2.6-1t:free

  skills_hub:
    provider: "auto"
    model: ""

  mcp:
    provider: "auto"
    model: ""
```

上のどのタスクも **provider / model / base_url** という同じ形に従います。タスクごとに自前の `fallback_chain` を書くこともできます。書かない場合、`provider: auto` は Hermes 組み込みの補助探索の並びより先に、最上位の `fallback_providers` の並びを使います。

コンテキスト圧縮は `auxiliary.compression` の下で設定します。

```yaml
auxiliary:
  compression:
    provider: main                                    # Same provider options as other auxiliary tasks
    model: google/gemini-3-flash-preview
    base_url: null                                    # Custom OpenAI-compatible endpoint
```

主モデルの控えの並びはこう書きます。

```yaml
fallback_providers:
  - provider: openrouter
    model: anthropic/claude-sonnet-4
    # base_url: http://localhost:8000/v1             # Optional custom endpoint
```

補助タスク、圧縮、フォールバックの 3 つはどれも同じ考え方です。`provider` で誰にリクエストを処理させるかを選び、`model` でどのモデルかを選び、`base_url` で独自のエンドポイントを指します（これを書くとプロバイダーの指定より優先されます）。

### 補助タスクで指定できるプロバイダー {#provider-options-for-auxiliary-tasks}

ここに挙げる値が使えるのは `auxiliary:`、`compression:`、`fallback_providers:` の項目だけです。最上位の `model.provider` に `"main"` は **使えません**。独自のエンドポイントを使いたい場合は、`model:` の節で `provider: custom` を指定してください（[AI プロバイダー](/hermes/docs/integrations/providers/) を参照）。

| プロバイダー | 説明 | 必要なもの |
|----------|-------------|-------------|
| `"auto"` | うまくいくものが見つかるまで順に試します（既定） | プロバイダーが最低 1 つ設定してあること |
| `"openrouter"` | OpenRouter に固定します | `OPENROUTER_API_KEY` |
| `"nous"` | Nous Portal に固定します | `hermes auth` |
| `"codex"` | Codex の OAuth に固定します | `hermes model` → ChatGPT or Codex Subscription |
| `"main"` | 主エージェントが使っているプロバイダーをそのまま使います（補助タスク限定） | 主プロバイダーが設定してあること |
| `"anthropic"` | Anthropic 直接接続に固定します | `ANTHROPIC_API_KEY` または Claude Code の認証情報 |

### エンドポイントの直接指定 {#direct-endpoint-override}

どの補助タスクでも、`base_url` を設定するとプロバイダーの解決を丸ごと飛ばして、そのエンドポイントへ直接リクエストを送ります。

```yaml
auxiliary:
  vision:
    base_url: "http://localhost:1234/v1"
    api_key: "local-key"
    model: "qwen2.5-vl"
```

`base_url` は `provider` より優先されます。認証には設定した `api_key` を使い、未設定なら `OPENAI_API_KEY` を使います。独自のエンドポイントに対して `OPENROUTER_API_KEY` を流用することは **ありません**。

---

## 補助タスクの容量エラーによるフォールバック {#auxiliary-capacity-error-fallback}

補助タスクのプロバイダーを明示的に指定した場合（たとえば `auxiliary.vision.provider: glm`）、Hermes はそれをあなたの希望として尊重します。ただし、**容量のエラー**（HTTP 402 の支払い要求、HTTP 429 の 1 日ぶんの上限切れ、接続失敗）でそのプロバイダーが文字どおり処理できないときは、黙って失敗させずに段階的な並びをたどります。

1. **指定した補助プロバイダー** — あなたが設定したもの（つねに最初に試します）
2. **`auxiliary.<task>.fallback_chain`** — タスクごとの上書き一覧（書いてあれば）
3. **主エージェントのプロバイダーとモデル** — 最後の安全網（並びを書いていなくても、つねに試します）
4. **警告して投げ直す** — どの段階も失敗したら、Hermes は WARNING レベルで `Auxiliary <task>: ... all fallbacks exhausted` を記録し、元のエラーを投げ直します

一時的な HTTP 429 のレート制限（`Retry-After: ...`）は、容量の問題ではなくリクエスト側の制約として扱います。明示的なプロバイダー指定はそのまま尊重され、上のはしごは **降りません**。この指定を飛び越えるのは、日次・月次の上限切れ、支払いのエラー、接続の失敗だけです。

`provider: auto` を使っている場合（補助プロバイダーを明示していない場合）は、既存の自動判定の並びが手順 2〜3 の代わりに走ります。その最初の段階がすでに主エージェントのモデルなので、`auto` の場合は何も設定しなくても同じ結果になります。

### 任意: タスクごとの控えの並び {#optional-per-task-fallback-chain}

「まず主エージェントのモデル」とは違う順番にしたいときは、`fallback_chain` を明示的に設定します。各項目には最低でも `provider` が必要で、`model`、`base_url`、`api_key` は任意です。

```yaml
auxiliary:
  vision:
    provider: glm
    model: glm-4v-flash
    fallback_chain:
      - provider: openrouter
        model: google/gemini-3-flash-preview
      - provider: nous
        model: anthropic/claude-sonnet-4

  compression:
    provider: openrouter
    fallback_chain:
      - provider: openai
        model: gpt-4o-mini
        timeout: 240            # optional — this candidate's own deadline (seconds)
```

フォールバックを効かせるために `fallback_chain` を設定する必要は **ありません**。主エージェントという安全網は書かなくても働きます。既定とは違う順番にしたいときだけ使ってください。

`fallback_chain` の各項目には、自前の `timeout`（秒）も書けます。書かない場合、控えの候補はタスク単位のタイムアウトを引き継ぎますが、その値は主プロバイダーに合わせて詰めてあるかもしれません。項目ごとに `timeout` を書いておけば、遅いけれど確実な控え（たとえば長いコンテキストを扱う要約役）に、主プロバイダーの時計で打ち切られずに必要なだけの時間を与えられます。

### フォールバックを起こすプロバイダー側の上限エラー {#provider-quota-errors-that-trigger-fallback}

Hermes は次のものを、402 のクレジット切れと同じ容量の問題として扱います（一時的なレート制限とは区別します）。

- Bedrock / LiteLLM: `Too many tokens per day`、`daily limit`、`tokens per day`
- Vertex AI / GCP: `quota exceeded`、`resource exhausted`、`RESOURCE_EXHAUSTED`
- 一般: `daily quota`、`quota_exceeded`

使っているプロバイダーが 1 日ぶんの上限切れを別の文言で返し、Hermes がフォールバックしない場合、それは不具合です。エラー文字列をそのまま添えて issue を立ててください。

---

## コンテキスト圧縮のフォールバック {#context-compression-fallback}

コンテキスト圧縮は、`auxiliary.compression` の設定ブロックで、どのモデルとプロバイダーが要約を担当するかを決めます。

```yaml
auxiliary:
  compression:
    provider: "auto"                              # auto | openrouter | nous | main
    model: "google/gemini-3-flash-preview"
```

:::info 古い設定からの移行
`compression.summary_model` / `compression.summary_provider` / `compression.summary_base_url` を使っている古い設定は、最初の読み込み時に `auxiliary.compression.*` へ自動で移行されます（設定バージョン 17）。
:::

圧縮に使えるプロバイダーがひとつもない場合、Hermes はセッションを失敗させるのではなく、要約を作らずに会話の中ほどのターンを落とします。

---

## 委任時のプロバイダー上書き {#delegation-provider-override}

`delegate_task` で立ち上がるサブエージェントは、親エージェントの主モデルの控えの並びを引き継ぎます。その上で、コストを抑えるためにサブエージェントだけ別のプロバイダーとモデルへ振り向けることもできます。

```yaml
delegation:
  provider: "openrouter"                      # override provider for all subagents
  model: "google/gemini-3-flash-preview"      # override model
  # base_url: "http://localhost:1234/v1"      # or use a direct endpoint
  # api_key: "local-key"
```

設定の詳細は [サブエージェントへの委任](/hermes/docs/user-guide/features/delegation/) を参照してください。

---

## 定期実行ジョブのプロバイダー {#cron-job-providers}

定期実行のジョブは、エージェントを作るときに設定済みの `fallback_providers` の並び（あるいは古い `fallback_model`）を引き継ぎます。特定のジョブだけ別の主プロバイダーを使いたい場合は、そのジョブ自体に `provider` と `model` の上書きを設定します。

```python
cronjob(
    action="create",
    schedule="every 2h",
    prompt="Check server status",
    provider="openrouter",
    model="google/gemini-3-flash-preview"
)
```

設定の詳細は [定期実行タスク（Cron）](/hermes/docs/user-guide/features/cron/) を参照してください。

---

## まとめ {#summary}

| 機能 | フォールバックのしくみ | 設定の場所 |
|---------|-------------------|----------------|
| 主エージェントのモデル | config.yaml の `fallback_providers`。エラー時にターン単位で切り替え（毎ターン主モデルに戻ります） | `fallback_providers:`（最上位の一覧） |
| 補助タスク全般 — auto の場合 | 容量エラー時に自動判定の並びを最後までたどります（まず主エージェントのモデル、次にプロバイダーの並び） | `auxiliary.<task>.provider: auto` |
| 補助タスク全般 — プロバイダーを明示した場合 | 容量エラーのときだけ `fallback_chain`（設定してあれば）→ 主エージェントのモデル → 警告して投げ直す | `auxiliary.<task>.fallback_chain` |
| 画像認識 | 段階的（上記参照）＋ OpenRouter 内部での再試行 | `auxiliary.vision` |
| コンテキスト圧縮 | 段階的（上記参照）。どの段階も使えないときは要約なしに落とします | `auxiliary.compression` |
| Skills hub | 段階的（上記参照） | `auxiliary.skills_hub` |
| MCP の補助処理 | 段階的（上記参照） | `auxiliary.mcp` |
| 承認の判定 | 段階的（上記参照） | `auxiliary.approval` |
| タイトル生成 | 段階的（上記参照） | `auxiliary.title_generation` |
| 仕様の肉付け | 段階的（上記参照） | `auxiliary.triage_specifier` |
| 委任 | 親の `fallback_providers` の並びを引き継ぎます。プロバイダーやモデルの上書きも可能 | `delegation.provider` / `delegation.model` |
| 定期実行のジョブ | 設定済みの `fallback_providers` の並びを引き継ぎます。ジョブごとの上書きも可能 | ジョブごとの `provider` / `model` |
