---
title: "フォールバックプロバイダー"
description: "メインのモデルが使えなくなったとき、控えの LLM プロバイダーへ自動で切り替わるように設定します。"
upstream_path: user-guide/features/fallback-providers.md
upstream_blob: 4c286c702356085d1e7b8b86e0d26a6d274f64e8
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/fallback-providers
---

# フォールバックプロバイダー {#fallback-providers}

Hermes Agent には、プロバイダー側で問題が起きてもセッションを止めないための仕組みが 3 層あります。

1. **[認証情報プール](/hermes/docs/user-guide/features/credential-pools/)** — *同じ*プロバイダーの複数の API キーを順に使い回します（最初に試されます）
2. **メインモデルのフォールバック** — メインのモデルが失敗したときに、*別の* provider:model へ自動で切り替えます
3. **補助タスクのフォールバック** — 画像認識や圧縮といった脇のタスクについて、独立にプロバイダーを解決します

認証情報プールは同一プロバイダー内でのキーの持ち回り（たとえば OpenRouter のキーを複数持つ場合）を担当します。このページで扱うのは、プロバイダーをまたぐフォールバックです。どちらも任意の機能で、互いに独立して動きます。

## メインモデルのフォールバック {#primary-model-fallback}

メインの LLM プロバイダーでエラーが起きたとき — レート制限、サーバー過負荷、認証失敗、接続断など — Hermes は会話を失うことなく、セッションの途中で控えの provider:model のペアへ自動的に切り替えられます。

### 設定 {#configuration}

いちばん簡単なのは、対話式のマネージャーを使う方法です。

```bash
hermes fallback
```

`hermes fallback` は `hermes model` と同じプロバイダー選択画面をそのまま使います。プロバイダーの一覧も、認証情報の入力も、検証のしかたも同じです。連鎖の管理には `add`、`list`（別名 `ls`）、`remove`（別名 `rm`）、`clear` のサブコマンドを使います。変更内容は `config.yaml` のトップレベルにある `fallback_providers:` のリストへ保存されます。

YAML を直接書きたい場合は、`~/.hermes/config.yaml` のトップレベルに `fallback_providers` のリストを追加します。

```yaml
fallback_providers:
  - provider: openrouter
    model: anthropic/claude-sonnet-4
```

各エントリーには `provider` と `model` の両方が必要です。どちらかが欠けているエントリーは無視されます。

:::note `fallback_model` と `fallback_providers` の違い
`fallback_providers`（複数形・リスト）が現行の設定の形で、複数の控えを順に試せます。`fallback_model`（単数形）は控えを 1 つだけ指定する古いキーです。Hermes は後方互換のためにこちらも今なお尊重しますが、`hermes fallback` が書き込むのは現行の `fallback_providers` キーで、書き込みのときに古い設定を移行します。両方が設定されている場合は `fallback_providers` が優先されます。
:::

### 対応プロバイダー {#supported-providers}

| プロバイダー | 値 | 必要なもの |
|----------|-------|-------------|
| AI Gateway | `ai-gateway` | `AI_GATEWAY_API_KEY` |
| OpenRouter | `openrouter` | `OPENROUTER_API_KEY` |
| Nous Portal | `nous` | `hermes setup --portal`（新規）または `hermes auth add nous`（OAuth） |
| OpenAI Codex | `openai-codex` | `hermes model` → **ChatGPT または Codex のサブスクリプション**（ChatGPT OAuth） |
| GitHub Copilot | `copilot` | `COPILOT_GITHUB_TOKEN`、`GH_TOKEN`、または `GITHUB_TOKEN` |
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
| xAI（Grok） | `xai`（別名 `grok`） | `XAI_API_KEY`（任意: `XAI_BASE_URL`） |
| xAI Grok OAuth（SuperGrok） | `xai-oauth`（別名 `grok-oauth`） | `hermes model` → xAI Grok OAuth（ブラウザーでログイン。SuperGrok のサブスクリプションが必要） |
| AWS Bedrock | `bedrock` | 標準の boto3 認証（`AWS_REGION` と `AWS_PROFILE` または `AWS_ACCESS_KEY_ID`） |
| Qwen Portal（OAuth） | `qwen-oauth` | `hermes model`（Qwen Portal の OAuth。任意: `HERMES_QWEN_BASE_URL`） |
| MiniMax（OAuth） | `minimax-oauth` | `hermes model`（MiniMax ポータルの OAuth） |
| OpenCode Zen | `opencode-zen` | `OPENCODE_ZEN_API_KEY` |
| CommandCode | `commandcode`（別名 `commandcode-chat`。Claude を使う場合は `commandcode-anthropic`） | `COMMANDCODE_API_KEY` |
| OpenCode Go | `opencode-go` | `OPENCODE_GO_API_KEY` |
| OpenCode Free | `opencode-free` | —（キー不要。認証情報なし） |
| Kilo Code | `kilocode` | `KILOCODE_API_KEY` |
| Ramp Router | `router` | `RAMP_ROUTER_API_KEY` |
| Xiaomi MiMo | `xiaomi` | `XIAOMI_API_KEY` |
| Arcee AI | `arcee` | `ARCEEAI_API_KEY` |
| GMI Cloud | `gmi` | `GMI_API_KEY` |
| Nebius Token Factory | `nebius-token-factory` | `NEBIUS_API_KEY` |
| Alibaba / DashScope | `alibaba` | `DASHSCOPE_API_KEY` |
| Alibaba Coding Plan | `alibaba-coding-plan` | `ALIBABA_CODING_PLAN_API_KEY`（`DASHSCOPE_API_KEY` にフォールバックします） |
| Kimi / Moonshot（中国） | `kimi-coding-cn` | `KIMI_CN_API_KEY` |
| StepFun | `stepfun` | `STEPFUN_API_KEY` |
| Tencent TokenHub | `tencent-tokenhub` | `TOKENHUB_API_KEY` |
| Tencent TokenPlan | `tencent-tokenplan` | `TOKENPLAN_API_KEY` |
| Microsoft Foundry | `azure-foundry` | `AZURE_FOUNDRY_API_KEY` と `AZURE_FOUNDRY_BASE_URL` |
| LM Studio（ローカル） | `lmstudio` | `LM_API_KEY`（ローカルなら不要）と `LM_BASE_URL` |
| Hugging Face | `huggingface` | `HF_TOKEN` |
| 独自エンドポイント | `custom` | `base_url` と `key_env`（下記参照） |

### 独自エンドポイントへのフォールバック {#custom-endpoint-fallback}

OpenAI 互換の独自エンドポイントを使う場合は、`base_url` と、必要に応じて `key_env` を追加します。

```yaml
fallback_providers:
  - provider: custom
    model: my-local-model
    base_url: http://localhost:8000/v1
    key_env: MY_LOCAL_KEY            # env var name containing the API key
```

### フォールバックが働く条件 {#when-fallback-triggers}

メインのモデルが次のかたちで失敗したとき、フォールバックが自動的に動きます。

- **レート制限**（HTTP 429） — 再試行を使い切ったあと
- **サーバーエラー**（HTTP 500、502、503） — 再試行を使い切ったあと
- **認証失敗**（HTTP 401、403） — ただちに（再試行しても意味がないため）
- **見つからない**（HTTP 404） — ただちに
- **不正な応答** — API が壊れた応答や空の応答を繰り返し返したとき

作動すると、Hermes は次の順に処理します。

1. 控えのプロバイダーの認証情報を解決します
2. 新しい API クライアントを組み立てます
3. モデル・プロバイダー・クライアントをその場で差し替えます
4. 再試行のカウンターをリセットし、会話を続けます

切り替えは途切れません。会話の履歴もツール呼び出しもコンテキストもそのまま保たれます。エージェントは中断したところから、モデルだけを変えて続きを進めます。

:::warning フォールバックはプロンプトキャッシュを捨てます
プロンプトキャッシュは、そのリクエストを処理するモデル（そして多くのプロバイダーではアカウント）に紐づいています。フォールバックが働くと、新しい provider:model にはその会話のキャッシュされた前半部分がありません。そのため次のリクエストでは履歴全体を読み直すことになり、約 75〜90% 割り引かれたキャッシュ料金ではなく、入力トークンの正規の料金がかかります。ターンが終わってメインへ戻るときも同じで、メインに戻った最初のリクエストもやはり全文の読み直しになります（メイン側のキャッシュの有効期限が切れていなければ別です）。これは避けられません。障害の最中でも動き続けるための代価です。ただ、プロバイダーの間を行き来する長いセッションが、動かずにいるセッションよりはっきり高くつくのはこのためです。
:::

:::info セッション単位ではなくターン単位
フォールバックは**ターン単位**です。新しいユーザーメッセージごとに、メインのモデルに戻った状態から始まります。ターンの途中でメインが失敗した場合、フォールバックはそのターンにだけ働きます。次のメッセージでは、Hermes はもう一度メインを試します。1 つのターンの中でフォールバックが働くのは最大 1 回までで、控えのほうも失敗した場合は通常のエラー処理（再試行、そのあとエラーメッセージ）に移ります。こうすることで、ターン内で切り替えが連鎖するのを防ぎつつ、メインのモデルには毎ターン新しい機会を与えられます。

このターン単位の再試行は**リセット時刻を見ています**。メイン側の認証情報がレート制限のリセット時刻を返していて、それがまだ来ていない場合（Claude Pro/Max の 5 時間枠や Codex の週次上限といったサブスクリプションの枠は、これを時間単位や日単位で返します）、Hermes は失敗が分かっている再試行を飛ばし、リセットが過ぎるまで控えのまま動きます。1 ターンあたり 2 回の無駄なプロバイダー切り替え（と 2 回のプロンプトキャッシュ破棄）を避けるためです。リセット時刻を過ぎた瞬間から、次のターンは自動的にメインへ戻ります。リセット時刻を伴わない一時的な 429 は従来どおりで、短いクールダウンを置いて毎ターン再試行します。
:::

### 例 {#examples}

**Anthropic ネイティブの控えに OpenRouter を置く:**
```yaml
model:
  provider: anthropic
  default: claude-sonnet-4-6

fallback_providers:
  - provider: openrouter
    model: anthropic/claude-sonnet-4
```

**OpenRouter の控えに Nous Portal を置く:**
```yaml
model:
  provider: openrouter
  default: anthropic/claude-opus-4

fallback_providers:
  - provider: nous
    model: nous-hermes-3
```

**クラウドの控えにローカルのモデルを置く:**
```yaml
fallback_providers:
  - provider: custom
    model: llama-3.1-70b
    base_url: http://localhost:8000/v1
    key_env: LOCAL_API_KEY
```

**控えに Codex OAuth を置く:**
```yaml
fallback_providers:
  - provider: openai-codex
    model: gpt-5.3-codex
```

### フォールバックが効く場所 {#where-fallback-works}

| 場面 | フォールバック対応 |
|---------|-------------------|
| CLI のセッション | ✔ |
| メッセージングゲートウェイ（Telegram、Discord など） | ✔ |
| サブエージェントへの委任 | ✔（サブエージェントは親のフォールバック連鎖を引き継ぎます） |
| cron ジョブ | ✔（cron のエージェントは設定済みのフォールバックプロバイダーを引き継ぎます） |
| `provider: auto` の補助タスク | ✔（タスクごとのフォールバックを試し、次にメインのフォールバック連鎖、それから組み込みの補助用探索へ進みます） |

:::tip
メインのフォールバック連鎖には環境変数がありません。設定は `config.yaml` か `hermes fallback` だけで行います。これは意図的な設計です。フォールバックの設定は熟慮のうえで決めるものであって、シェルに残った古い export に上書きされてよいものではないからです。
:::

---

## 補助タスクのフォールバック {#auxiliary-task-fallback}

Hermes は脇のタスクに、別の軽量なモデルを使います。タスクごとに独自のプロバイダー解決の連鎖があり、それがそのまま組み込みのフォールバックとして働きます。

### 独立にプロバイダーを解決するタスク {#tasks-with-independent-provider-resolution}

| タスク | 何をするか | 設定キー |
|------|-------------|-----------|
| 画像認識 | 画像の解析、ブラウザーのスクリーンショット | `auxiliary.vision` |
| 圧縮 | コンテキスト圧縮の要約 | `auxiliary.compression` |
| Skills Hub | スキルの検索と発見 | `auxiliary.skills_hub` |
| MCP | MCP の補助的な処理 | `auxiliary.mcp` |
| 承認 | コマンド承認の賢い判定 | `auxiliary.approval` |
| タイトル生成 | セッションのタイトルの要約 | `auxiliary.title_generation` |
| レビュー | `/review` のレビュー担当サブエージェント（1 回の LLM 呼び出しではなく、エージェントまるごと） | `auxiliary.review` |
| トリアージの仕様化 | `hermes kanban specify` とダッシュボードの ✨ ボタン。一行のトリアージ用タスクを実際の仕様へ膨らませます | `auxiliary.triage_specifier` |

### 自動判定の連鎖 {#auto-detection-chain}

タスクのプロバイダーが `"auto"`（既定値）になっている場合、Hermes はまずその補助タスクにメインのプロバイダーとメインのモデルを試します。その経路が使えないか、あとで容量系のエラーで失敗した場合、Hermes は組み込みの探索連鎖を使う前に、利用者が設定したフォールバックの方針を尊重します。

```text
Main provider + main model → auxiliary.<task>.fallback_chain →
fallback_providers / fallback_model → built-in auxiliary discovery chain
```

タスクごとの連鎖がいちばん的確なので、書かれていればそれが優先されます。トップレベルの `fallback_providers` の連鎖はメインのエージェントが使うのと同じ方針なので、無料のみ・同一プロバイダーのみといったフォールバックの決まりごとも、`auto` の補助タスクにそのまま適用されます。

**組み込みのテキスト用探索連鎖（圧縮、Web 抽出、タイトル生成など）:**

```text
OpenRouter → Nous Portal → Custom endpoint → Codex OAuth →
API-key providers (z.ai, Kimi, MiniMax, Xiaomi MiMo, Hugging Face, Anthropic) → give up
```

**組み込みの画像認識用探索連鎖:**

```text
Main provider (if vision-capable) → OpenRouter → Nous Portal →
Codex OAuth → Anthropic → Custom endpoint → give up
```

これらの組み込みの連鎖は、タスクごとの方針もメインのフォールバック方針も宣言していない人のための、便宜的な受け皿です。

### 補助プロバイダーの設定 {#configuring-auxiliary-providers}

タスクはそれぞれ独立に `config.yaml` で設定できます。

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

上のタスクはどれも同じ **provider / model / base_url** のかたちに従います。各タスクは自前の `fallback_chain` を宣言することもできます。省略した場合、`provider: auto` は Hermes の組み込みの補助用探索連鎖より前に、トップレベルの `fallback_providers` の連鎖を使います。

コンテキスト圧縮は `auxiliary.compression` の下で設定します。

```yaml
auxiliary:
  compression:
    provider: main                                    # Same provider options as other auxiliary tasks
    model: google/gemini-3-flash-preview
    base_url: null                                    # Custom OpenAI-compatible endpoint
```

メインのフォールバック連鎖はこう書きます。

```yaml
fallback_providers:
  - provider: openrouter
    model: anthropic/claude-sonnet-4
    # base_url: http://localhost:8000/v1             # Optional custom endpoint
```

補助・圧縮・フォールバックの 3 つは、どれも同じ考え方で動きます。`provider` で誰にリクエストを処理させるかを選び、`model` でどのモデルを使うかを選び、`base_url` で独自のエンドポイントを指す（こちらはプロバイダーの指定を上書きします）というかたちです。

### 補助タスクで指定できるプロバイダー {#provider-options-for-auxiliary-tasks}

ここに挙げる選択肢が使えるのは `auxiliary:`、`compression:`、`fallback_providers:` のエントリーだけです。トップレベルの `model.provider` に `"main"` を指定することは**できません**。独自エンドポイントを使いたい場合は、`model:` のセクションで `provider: custom` を指定してください（[AI プロバイダー](/hermes/docs/integrations/providers/)を参照）。

| プロバイダー | 説明 | 必要なもの |
|----------|-------------|-------------|
| `"auto"` | 動くものが見つかるまで順に試します（既定値） | プロバイダーが少なくとも 1 つ設定されていること |
| `"openrouter"` | OpenRouter を強制します | `OPENROUTER_API_KEY` |
| `"nous"` | Nous Portal を強制します | `hermes auth` |
| `"codex"` | Codex OAuth を強制します | `hermes model` → ChatGPT または Codex のサブスクリプション |
| `"main"` | メインのエージェントが使っているプロバイダーをそのまま使います（補助タスク専用） | メインのプロバイダーが有効に設定されていること |
| `"anthropic"` | Anthropic ネイティブを強制します | `ANTHROPIC_API_KEY` または Claude Code の認証情報 |

### エンドポイントの直接指定 {#direct-endpoint-override}

どの補助タスクでも、`base_url` を設定するとプロバイダーの解決を丸ごと飛ばして、そのエンドポイントへ直接リクエストを送ります。

```yaml
auxiliary:
  vision:
    base_url: "http://localhost:1234/v1"
    api_key: "local-key"
    model: "qwen2.5-vl"
```

`base_url` は `provider` より優先されます。認証には設定された `api_key` が使われ、未設定なら `OPENAI_API_KEY` が使われます。独自エンドポイントに `OPENROUTER_API_KEY` が流用されることは**ありません**。

---

## 補助タスクの容量エラーによるフォールバック {#auxiliary-capacity-error-fallback}

補助タスクのプロバイダーを明示的に指定した場合（たとえば `auxiliary.vision.provider: glm`）、Hermes はそれを利用者の希望として扱います。ただし、そのプロバイダーが**容量エラー**（HTTP 402 の支払い要求、HTTP 429 の日次クォータ枯渇、接続失敗）によってリクエストを物理的に処理できないときは、黙って失敗するのではなく、次の層をたどってフォールバックします。

1. **一次の補助プロバイダー** — 利用者が設定したもの（常に最初に試されます）
2. **`auxiliary.<task>.fallback_chain`** — タスクごとの上書きリスト（書いていれば）
3. **メインエージェントのプロバイダーとモデル** — 最後の安全網（連鎖を書いていなくても常に試されます）
4. **警告して再送出** — すべての層が失敗した場合、Hermes は WARNING レベルで `Auxiliary <task>: ... all fallbacks exhausted` を記録し、元のエラーを再送出します

一時的な HTTP 429 のレート制限（`Retry-After: ...`）は容量の問題ではなくリクエスト側の制約として扱われます。明示的なプロバイダー指定が尊重され、フォールバックのはしごは**動きません**。明示指定の門をくぐり抜けるのは、日次・月次のクォータ枯渇、支払いエラー、接続失敗だけです。

`provider: auto` を使っている（補助プロバイダーを明示していない）場合は、手順 2〜3 の代わりに従来の自動判定の連鎖が走ります。その最初の一歩がすでにメインエージェントのモデルなので、`auto` の利用者は設定ゼロで同じ結果を得られます。

### 任意: タスクごとのフォールバック連鎖 {#optional-per-task-fallback-chain}

「まずメインエージェントのモデル」とは違う順番にしたい場合は、`fallback_chain` を明示的に設定します。各エントリーには少なくとも `provider` が必要で、`model`、`base_url`、`api_key` は任意です。

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

フォールバックを効かせるために `fallback_chain` を設定する必要は**ありません**。メインエージェントによる安全網は設定の有無にかかわらず動きます。既定とは違う順番にしたいときにだけ使ってください。

`fallback_chain` の各エントリーは、自分の `timeout`（秒）を宣言することもできます。宣言しない場合、控えの候補はタスク全体のタイムアウトを引き継ぎますが、その値は一次のプロバイダーに合わせて調整されているかもしれません。エントリーごとに `timeout` を書けば、遅くても確実な控え（たとえば大きなコンテキストを扱う要約器）に、一次側の時計で打ち切られることなく必要な時間を与えられます。

### フォールバックを引き起こすプロバイダーのクォータエラー {#provider-quota-errors-that-trigger-fallback}

Hermes は次のものを、402 のクレジット枯渇と同等の容量問題として扱います（一時的なレート制限としては扱いません）。

- Bedrock / LiteLLM: `Too many tokens per day`、`daily limit`、`tokens per day`
- Vertex AI / GCP: `quota exceeded`、`resource exhausted`、`RESOURCE_EXHAUSTED`
- 汎用: `daily quota`、`quota_exceeded`

使っているプロバイダーが日次クォータ枯渇を別の文言で返していて、Hermes がフォールバックしない場合、それは不具合です。エラー文字列をそのまま添えて issue を立ててください。

---

## コンテキスト圧縮のフォールバック {#context-compression-fallback}

コンテキスト圧縮は、要約をどのモデルとプロバイダーに任せるかを `auxiliary.compression` の設定ブロックで決めます。

```yaml
auxiliary:
  compression:
    provider: "auto"                              # auto | openrouter | nous | main
    model: "google/gemini-3-flash-preview"
```

:::info 古い設定の移行
`compression.summary_model` / `compression.summary_provider` / `compression.summary_base_url` を使っている古い設定は、最初の読み込み時に `auxiliary.compression.*` へ自動的に移行されます（設定バージョン 17）。
:::

圧縮に使えるプロバイダーが 1 つもない場合、Hermes はセッションを落とすのではなく、要約を作らずに会話の途中のターンを捨てます。

---

## 委任時のプロバイダー上書き {#delegation-provider-override}

`delegate_task` で立ち上がったサブエージェントは、親エージェントのメインのフォールバック連鎖を引き継ぎます。そのうえで、コストを抑えるためにサブエージェントだけ別の provider:model のペアへ回すこともできます。

```yaml
delegation:
  provider: "openrouter"                      # override provider for all subagents
  model: "google/gemini-3-flash-preview"      # override model
  # base_url: "http://localhost:1234/v1"      # or use a direct endpoint
  # api_key: "local-key"
```

設定の詳細は[サブエージェントへの委任](/hermes/docs/user-guide/features/delegation/)を参照してください。

---

## cron ジョブのプロバイダー {#cron-job-providers}

cron ジョブはエージェントを作るとき、設定された `fallback_providers` の連鎖（または旧来の `fallback_model`）を引き継ぎます。cron ジョブだけ別のプロバイダーをメインにしたい場合は、そのジョブ自身に `provider` と `model` の上書きを設定します。

```python
cronjob(
    action="create",
    schedule="every 2h",
    prompt="Check server status",
    provider="openrouter",
    model="google/gemini-3-flash-preview"
)
```

設定の詳細は[定時タスク（cron）](/hermes/docs/user-guide/features/cron/)を参照してください。

---

## まとめ {#summary}

| 機能 | フォールバックの仕組み | 設定場所 |
|---------|-------------------|----------------|
| メインエージェントのモデル | config.yaml の `fallback_providers`。エラー時にターン単位で切り替わり、毎ターン、メインに戻ります | `fallback_providers:`（トップレベルのリスト） |
| 補助タスク全般 — auto の利用者 | 容量エラー時に自動判定の連鎖をひととおり実行します（まずメインエージェントのモデル、次にプロバイダーの連鎖） | `auxiliary.<task>.provider: auto` |
| 補助タスク全般 — プロバイダー明示 | 容量エラーのときだけ `fallback_chain`（設定していれば）→ メインエージェントのモデル → 警告して送出 | `auxiliary.<task>.fallback_chain` |
| 画像認識 | 上記の多層方式に加え、OpenRouter への内部的な再試行 | `auxiliary.vision` |
| コンテキスト圧縮 | 上記の多層方式。どの層も使えない場合は要約なしに劣化します | `auxiliary.compression` |
| Skills hub | 上記の多層方式 | `auxiliary.skills_hub` |
| MCP の補助処理 | 上記の多層方式 | `auxiliary.mcp` |
| 承認の判定 | 上記の多層方式 | `auxiliary.approval` |
| タイトル生成 | 上記の多層方式 | `auxiliary.title_generation` |
| トリアージの仕様化 | 上記の多層方式 | `auxiliary.triage_specifier` |
| 委任 | 親の `fallback_providers` の連鎖を引き継ぎます。プロバイダーとモデルの上書きは任意 | `delegation.provider` / `delegation.model` |
| cron ジョブ | 設定された `fallback_providers` の連鎖を引き継ぎます。ジョブごとのプロバイダー上書きは任意 | ジョブごとの `provider` / `model` |
