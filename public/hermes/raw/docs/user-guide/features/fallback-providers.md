---
title: "予備のプロバイダー"
description: "主に使うモデルが応じないとき、控えの LLM プロバイダーへ自動で切り替わるように設定します。"
upstream_path: user-guide/features/fallback-providers.md
upstream_blob: 6f64ee68349202427fb27502c558d219e551201f
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/fallback-providers
---

# 予備のプロバイダー {#fallback-providers}

Hermes Agent には、プロバイダー側で問題が起きてもセッションを続けるための、3 つの層の粘り強さがあります。

1. **[資格情報のプール](/hermes/docs/user-guide/features/credential-pools/)** — *同じ* プロバイダーの複数の API キーを回して使う（最初に試されます）
2. **主モデルの切り替え** — 主に使うモデルが失敗したとき、*別の* プロバイダーとモデルの組へ自動で切り替える
3. **補助タスクの切り替え** — 画像の読み取り、圧縮、ウェブの抽出といった脇の仕事について、独立にプロバイダーを決める

資格情報のプールは、同じプロバイダー内での持ち回りを引き受けます（OpenRouter のキーを複数持っている場合など）。このページで扱うのは、プロバイダーをまたぐ切り替えです。どちらも任意で、それぞれ独立に働きます。

## 主モデルの切り替え {#primary-model-fallback}

主に使っている LLM プロバイダーがエラーを返したとき — 利用制限、サーバーの過負荷、認証の失敗、接続の切断 — Hermes はセッションの途中でも、会話を失わずに控えのプロバイダーとモデルの組へ自動で切り替えられます。

### 設定 {#configuration}

いちばん楽なのは、対話式の管理画面です。

```bash
hermes fallback
```

`hermes fallback` は `hermes model` のプロバイダー選択をそのまま使い回します。プロバイダーの一覧も、資格情報の入力も、確認の仕方も同じです。連なりを管理するには、サブコマンドの `add`、`list`（別名 `ls`）、`remove`（別名 `rm`）、`clear` を使います。変更は `config.yaml` の最上位にある `fallback_providers:` の一覧として残ります。

YAML を直に書きたければ、`~/.hermes/config.yaml` の最上位に `fallback_providers` の一覧を足してください。

```yaml
fallback_providers:
  - provider: openrouter
    model: anthropic/claude-sonnet-4
```

各項目には `provider` と `model` の両方が要ります。どちらかが欠けている項目は無視されます。

:::note `fallback_model` と `fallback_providers` の違い
`fallback_providers`（複数形の一覧）が今の設定の形で、順に試す控えを複数書けます。`fallback_model`（単数形）は控えをひとつだけ書く古いキーです。Hermes は後方互換のためにまだ受け付けますが、`hermes fallback` は今の `fallback_providers` のキーに書き、書き込みのときに古い設定を移し替えます。両方が設定されている場合は `fallback_providers` が優先されます。
:::

### 対応しているプロバイダー {#supported-providers}

| プロバイダー | 値 | 必要なもの |
|----------|-------|-------------|
| AI Gateway | `ai-gateway` | `AI_GATEWAY_API_KEY` |
| OpenRouter | `openrouter` | `OPENROUTER_API_KEY` |
| Nous Portal | `nous` | `hermes setup --portal`（新規）または `hermes auth add nous`（OAuth） |
| OpenAI Codex | `openai-codex` | `hermes model` → **ChatGPT or Codex Subscription**（ChatGPT の OAuth） |
| GitHub Copilot | `copilot` | `COPILOT_GITHUB_TOKEN`、`GH_TOKEN`、`GITHUB_TOKEN` のいずれか |
| GitHub Copilot ACP | `copilot-acp` | 外部のプロセス（エディター連携） |
| Anthropic | `anthropic` | `ANTHROPIC_API_KEY` または Claude Code の資格情報 |
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
| xAI Grok OAuth（SuperGrok） | `xai-oauth`（別名 `grok-oauth`） | `hermes model` → xAI Grok OAuth（ブラウザーでログイン。SuperGrok の契約が必要） |
| AWS Bedrock | `bedrock` | boto3 の標準の認証（`AWS_REGION` と `AWS_PROFILE`、または `AWS_ACCESS_KEY_ID`） |
| Qwen Portal（OAuth） | `qwen-oauth` | `hermes model`（Qwen Portal の OAuth。任意: `HERMES_QWEN_BASE_URL`） |
| MiniMax（OAuth） | `minimax-oauth` | `hermes model`（MiniMax portal の OAuth） |
| OpenCode Zen | `opencode-zen` | `OPENCODE_ZEN_API_KEY` |
| CommandCode | `commandcode`（別名 `commandcode-chat`。Claude は `commandcode-anthropic` 経由） | `COMMANDCODE_API_KEY` |
| OpenCode Go | `opencode-go` | `OPENCODE_GO_API_KEY` |
| OpenCode Free | `opencode-free` | —（キー不要、資格情報なし） |
| Kilo Code | `kilocode` | `KILOCODE_API_KEY` |
| Xiaomi MiMo | `xiaomi` | `XIAOMI_API_KEY` |
| Arcee AI | `arcee` | `ARCEEAI_API_KEY` |
| GMI Cloud | `gmi` | `GMI_API_KEY` |
| Alibaba / DashScope | `alibaba` | `DASHSCOPE_API_KEY` |
| Alibaba Coding Plan | `alibaba-coding-plan` | `ALIBABA_CODING_PLAN_API_KEY`（なければ `DASHSCOPE_API_KEY`） |
| Kimi / Moonshot（中国） | `kimi-coding-cn` | `KIMI_CN_API_KEY` |
| StepFun | `stepfun` | `STEPFUN_API_KEY` |
| Tencent TokenHub | `tencent-tokenhub` | `TOKENHUB_API_KEY` |
| Microsoft Foundry | `azure-foundry` | `AZURE_FOUNDRY_API_KEY` と `AZURE_FOUNDRY_BASE_URL` |
| LM Studio（ローカル） | `lmstudio` | `LM_API_KEY`（ローカルなら不要）と `LM_BASE_URL` |
| Hugging Face | `huggingface` | `HF_TOKEN` |
| 独自エンドポイント | `custom` | `base_url` と `key_env`（下記参照） |

### 独自エンドポイントを控えにする {#custom-endpoint-fallback}

OpenAI 互換の独自エンドポイントを使うなら、`base_url` を足し、必要なら `key_env` も書きます。

```yaml
fallback_providers:
  - provider: custom
    model: my-local-model
    base_url: http://localhost:8000/v1
    key_env: MY_LOCAL_KEY            # env var name containing the API key
```

### 切り替えが起きる条件 {#when-fallback-triggers}

主モデルが次のように失敗したとき、控えへの切り替えが自動で起きます。

- **利用制限**（HTTP 429） — 試し直しを使い切ったあと
- **サーバーのエラー**（HTTP 500、502、503） — 試し直しを使い切ったあと
- **認証の失敗**（HTTP 401、403） — 即座に（試し直す意味がないため）
- **見つからない**（HTTP 404） — 即座に
- **おかしな応答** — API が壊れた応答や空の応答を繰り返し返すとき

切り替えが起きると、Hermes は次のように動きます。

1. 控えのプロバイダーの資格情報を解決する
2. 新しい API のクライアントを組み立てる
3. モデル、プロバイダー、クライアントをその場で差し替える
4. 試し直しの回数を戻し、会話を続ける

切り替えは滑らかです。会話の履歴、道具の呼び出し、文脈はそのまま残ります。エージェントは中断したところから、使うモデルだけを変えて続きを進めます。

:::warning 切り替えるとプロンプトのキャッシュは無効になります
プロンプトのキャッシュは、そのリクエストを処理するモデル（そしてたいていのプロバイダーではアカウントも）にひもづいています。切り替えが起きると、新しいプロバイダーとモデルの組はその会話の前置きをキャッシュしていないので、次のリクエストは履歴の全体を、約 75〜90% 引きのキャッシュ料金ではなく、入力トークンの正価で読み直します。ターンが終わって主モデルに戻るときも同じで、主モデルへ戻った最初のリクエストもやはり全体の読み直しになります（主モデル側のキャッシュの有効期間がまだ切れていない場合を除きます）。これは避けられません。障害の最中でも動き続けるための代償です。ただし、プロバイダーの間を行き来する長いセッションが、居場所を変えないセッションよりはっきり高くつくのは、この理屈からです。
:::

:::info セッション単位ではなくターン単位
切り替えは **ターンの範囲** で効きます。新しいメッセージが来るたびに、主モデルに戻った状態から始まります。ターンの途中で主モデルが失敗したら、そのターンだけ控えが使われます。次のメッセージでは、Hermes はまた主モデルを試します。ひとつのターンの中で切り替えが起きるのは多くても 1 回です。控えも失敗した場合は、通常のエラー処理（試し直し、そしてエラーの表示）に引き継がれます。これでターンの中で切り替えが連鎖するのを防ぎつつ、主モデルには毎ターン新しい機会を与えられます。

このターンごとの試し直しは **回復の時刻を見ています**。主モデルの資格情報が、まだ過ぎていない利用制限の回復時刻を返してきた場合（Claude Pro / Max の 5 時間枠や Codex の週ごとの制限といった契約の枠は、これを時間や日の単位で返します）、Hermes は失敗が分かりきった試し直しを飛ばし、回復の時刻を過ぎるまで控えにとどまります。これで、1 ターンあたり無駄なプロバイダーの切り替え 2 回（そしてプロンプトのキャッシュの無効化 2 回）を避けられます。回復の時刻を過ぎた瞬間、次のターンから自動で主モデルに戻ります。回復時刻の付かない一時的な 429 は、これまでどおりです。短い間を置いてから、毎ターン試し直します。
:::

### 例 {#examples}

**Anthropic 直結の控えに OpenRouter を置く:**
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

**クラウドの控えに手元のモデルを置く:**
```yaml
fallback_providers:
  - provider: custom
    model: llama-3.1-70b
    base_url: http://localhost:8000/v1
    key_env: LOCAL_API_KEY
```

**Codex の OAuth を控えにする:**
```yaml
fallback_providers:
  - provider: openai-codex
    model: gpt-5.3-codex
```

### 切り替えが効く場所 {#where-fallback-works}

| 場面 | 切り替えの対応 |
|---------|-------------------|
| CLI のセッション | ✔ |
| メッセージのゲートウェイ（Telegram、Discord など） | ✔ |
| 子エージェントへの委任 | ✔（子エージェントは親の控えの連なりを受け継ぎます） |
| 定時ジョブ | ✔（定時のエージェントは設定された控えのプロバイダーを受け継ぎます） |
| `provider: auto` の補助タスク | ✔（タスクごとの控え、次に主の控えの連なり、その後に組み込みの補助の探索の順で試します） |

:::tip
主の控えの連なりには環境変数がありません。`config.yaml` か `hermes fallback` だけで設定してください。これは意図してそうしています。控えの設定は意識して選ぶものであって、古くなったシェルの export に上書きされていいものではないからです。
:::

---

## 補助タスクの切り替え {#auxiliary-task-fallback}

Hermes は脇の仕事に、別の軽いモデルを使います。それぞれの仕事は自前のプロバイダー解決の連なりを持っていて、それがそのまま組み込みの控えの仕組みとして働きます。

### プロバイダーを独立に決める仕事 {#tasks-with-independent-provider-resolution}

| 仕事 | 何をするか | 設定のキー |
|------|-------------|-----------|
| 画像の読み取り | 画像の解析、ブラウザーのスクリーンショット | `auxiliary.vision` |
| ウェブの抽出 | ウェブページの要約 | `auxiliary.web_extract` |
| 圧縮 | 文脈を圧縮するための要約 | `auxiliary.compression` |
| スキルの拠点 | スキルの検索と発見 | `auxiliary.skills_hub` |
| MCP | MCP の補助的な操作 | `auxiliary.mcp` |
| 承認 | コマンドの承認を賢く仕分ける | `auxiliary.approval` |
| 題名の生成 | セッションの題名の要約 | `auxiliary.title_generation` |
| 仕分けの肉付け | `hermes kanban specify` とダッシュボードの ✨ ボタン — 一行の仕分けタスクを、ちゃんとした仕様に膨らませます | `auxiliary.triage_specifier` |

### 自動で選ぶ連なり {#auto-detection-chain}

仕事のプロバイダーが `"auto"`（既定）のとき、Hermes はまずその補助タスクに主プロバイダーと主モデルを試します。その経路が使えないか、あとから容量に類するエラーで失敗した場合、Hermes は組み込みの探索の連なりを使う前に、利用者が設定した控えの方針を尊重します。

```text
Main provider + main model → auxiliary.<task>.fallback_chain →
fallback_providers / fallback_model → built-in auxiliary discovery chain
```

仕事ごとの連なりがいちばん細かく、書かれていればそれが勝ちます。最上位の `fallback_providers` の連なりは主エージェントが使う方針と同じものなので、無料だけ、あるいは同じプロバイダーだけ、といった控えの決まりは `auto` の補助タスクにも同じように効きます。

**組み込みの、文章向けの探索の連なり（圧縮、ウェブの抽出、題名の生成など）:**

```text
OpenRouter → Nous Portal → Custom endpoint → Codex OAuth →
API-key providers (z.ai, Kimi, MiniMax, Xiaomi MiMo, Hugging Face, Anthropic) → give up
```

**組み込みの、画像の読み取り向けの探索の連なり:**

```text
Main provider (if vision-capable) → OpenRouter → Nous Portal →
Codex OAuth → Anthropic → Custom endpoint → give up
```

これらの組み込みの連なりは、仕事ごとの控えも主の控えも書いていない人のための、ありあわせの助けです。

### 補助のプロバイダーを設定する {#configuring-auxiliary-providers}

それぞれの仕事は `config.yaml` で個別に設定できます。

```yaml
auxiliary:
  vision:
    provider: "auto"              # auto | openrouter | nous | codex | main | anthropic
    model: ""                     # e.g. "openai/gpt-4o"
    base_url: ""                  # direct endpoint (takes precedence over provider)
    api_key: ""                   # API key for base_url

  web_extract:
    provider: "auto"
    model: ""

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

上のどの仕事も、**provider / model / base_url** という同じ形に従います。それぞれの仕事は自前の `fallback_chain` も宣言できます。書かなかった場合、`provider: auto` は Hermes 組み込みの補助の探索の連なりより先に、最上位の `fallback_providers` の連なりを使います。

文脈の圧縮は `auxiliary.compression` の下で設定します。

```yaml
auxiliary:
  compression:
    provider: main                                    # Same provider options as other auxiliary tasks
    model: google/gemini-3-flash-preview
    base_url: null                                    # Custom OpenAI-compatible endpoint
```

そして主の控えの連なりは次のようにします。

```yaml
fallback_providers:
  - provider: openrouter
    model: anthropic/claude-sonnet-4
    # base_url: http://localhost:8000/v1             # Optional custom endpoint
```

補助・圧縮・控えの 3 つは、どれも同じ仕組みです。`provider` で誰に処理させるかを選び、`model` でどのモデルかを選び、`base_url` で独自のエンドポイントを指します（プロバイダーの指定より優先されます）。

### 補助タスクで選べるプロバイダー {#provider-options-for-auxiliary-tasks}

ここに挙げる選択肢が効くのは `auxiliary:`、`compression:`、`fallback_providers:` の項目だけです。`"main"` は最上位の `model.provider` の値としては **使えません**。独自のエンドポイントを使うなら、`model:` の節で `provider: custom` を指定してください（[AI プロバイダー](/hermes/docs/integrations/providers/) を参照）。

| プロバイダー | 説明 | 必要なもの |
|----------|-------------|-------------|
| `"auto"` | どれかが通るまで順に試す（既定） | プロバイダーが少なくともひとつ設定されていること |
| `"openrouter"` | OpenRouter を強制する | `OPENROUTER_API_KEY` |
| `"nous"` | Nous Portal を強制する | `hermes auth` |
| `"codex"` | Codex の OAuth を強制する | `hermes model` → ChatGPT or Codex Subscription |
| `"main"` | 主エージェントが使っているプロバイダーをそのまま使う（補助タスク専用） | 主プロバイダーが設定されていること |
| `"anthropic"` | Anthropic 直結を強制する | `ANTHROPIC_API_KEY` または Claude Code の資格情報 |

### エンドポイントを直に指定して上書きする {#direct-endpoint-override}

どの補助タスクでも、`base_url` を設定するとプロバイダーの解決を完全に飛ばして、そのエンドポイントへ直接リクエストを送ります。

```yaml
auxiliary:
  vision:
    base_url: "http://localhost:1234/v1"
    api_key: "local-key"
    model: "qwen2.5-vl"
```

`base_url` は `provider` より優先されます。Hermes は認証に、設定された `api_key` を使い、なければ `OPENAI_API_KEY` を使います。独自のエンドポイントに `OPENROUTER_API_KEY` を使い回すことは **ありません**。

---

## 容量のエラーで起きる補助の切り替え {#auxiliary-capacity-error-fallback}

補助のプロバイダーを明示している場合（`auxiliary.vision.provider: glm` など）、Hermes はそれをあなたの希望として扱います。ただし、そのプロバイダーが **容量のエラー**（HTTP 402 の支払い要求、HTTP 429 の日次上限の使い切り、接続の失敗）で本当にリクエストを処理できない場合は、黙って失敗するのではなく、層になった連なりをたどって控えへ移ります。

1. **主の補助プロバイダー** — あなたが設定したもの（常に最初に試されます）
2. **`auxiliary.<task>.fallback_chain`** — 書いてあれば、その仕事ごとの上書きの一覧
3. **主エージェントのプロバイダーとモデル** — 最後の受け皿（連なりを書いていなくても、常に試されます）
4. **警告して投げ直す** — どの層も失敗したら、Hermes は WARNING の水準で `Auxiliary <task>: ... all fallbacks exhausted` を記録し、元のエラーを投げ直します

一時的な HTTP 429 の利用制限（`Retry-After: ...`）は、容量の問題ではなくリクエスト側の都合として扱われます。明示したプロバイダーの選択が尊重され、控えの階段は **降りません**。明示したプロバイダーの縛りを飛び越えるのは、日次や月次の上限の使い切り、支払いのエラー、接続の失敗だけです。

`provider: auto` の人（補助のプロバイダーを明示していない人）には、手順 2〜3 の代わりに既存の自動の探索の連なりが走ります。その最初の一手はもともと主エージェントのモデルなので、`auto` の人は何も設定しなくても同じ結果になります。

### 任意: 仕事ごとの控えの連なり {#optional-per-task-fallback-chain}

「まず主エージェントのモデル」とは違う順番にしたいなら、`fallback_chain` を明示して設定してください。各項目には少なくとも `provider` が要ります。`model`、`base_url`、`api_key` は任意です。

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

控えを効かせるために `fallback_chain` を設定する必要は **ありません**。主エージェントという受け皿は、どのみち働きます。既定とは違う順番にしたいときだけ使ってください。

`fallback_chain` の各項目は、自分の `timeout`（秒）も宣言できます。書かなければ、控えの候補は仕事ごとの制限時間を受け継ぎます。それは主のプロバイダーに合わせて調整されているかもしれません。項目ごとに `timeout` を書いておけば、遅いが確実な控え（たとえば長い文脈をまとめる要約役）が、主のプロバイダーの時計で切られずに、実際に必要な時間をもらえます。

### 切り替えを引き起こす、プロバイダーの上限のエラー {#provider-quota-errors-that-trigger-fallback}

Hermes は次を、402 の残高切れと同じ容量の問題として認識します（一時的な利用制限とは区別します）。

- Bedrock / LiteLLM: `Too many tokens per day`、`daily limit`、`tokens per day`
- Vertex AI / GCP: `quota exceeded`、`resource exhausted`、`RESOURCE_EXHAUSTED`
- 一般的なもの: `daily quota`、`quota_exceeded`

日次の上限の使い切りに別の言い回しを返すプロバイダーがあって、Hermes が切り替えないなら、それは不具合です。エラーの文字列そのままを添えて issue を立ててください。

---

## 文脈の圧縮の切り替え {#context-compression-fallback}

文脈の圧縮は、要約をどのモデルとプロバイダーが担うかを `auxiliary.compression` の設定の塊で決めます。

```yaml
auxiliary:
  compression:
    provider: "auto"                              # auto | openrouter | nous | main
    model: "google/gemini-3-flash-preview"
```

:::info 古い設定の移行
`compression.summary_model` / `compression.summary_provider` / `compression.summary_base_url` を使っている古い設定は、最初に読み込むときに `auxiliary.compression.*` へ自動で移されます（設定の版 17）。
:::

圧縮に使えるプロバイダーがひとつもない場合、Hermes はセッションを失敗させるのではなく、要約を作らずに会話の中ほどのやり取りを落とします。

---

## 委任のプロバイダーの上書き {#delegation-provider-override}

`delegate_task` が生む子エージェントは、親エージェントの主の控えの連なりを受け継ぎます。費用を抑えるために、子エージェントだけ別の主プロバイダーとモデルの組へ回すこともできます。

```yaml
delegation:
  provider: "openrouter"                      # override provider for all subagents
  model: "google/gemini-3-flash-preview"      # override model
  # base_url: "http://localhost:1234/v1"      # or use a direct endpoint
  # api_key: "local-key"
```

設定の詳しい内容は [子エージェントへの委任](/hermes/docs/user-guide/features/delegation/) を見てください。

---

## 定時ジョブのプロバイダー {#cron-job-providers}

定時ジョブは、エージェントを作るときに、設定された `fallback_providers` の連なり（または古い `fallback_model`）を受け継ぎます。ある定時ジョブだけ別の主プロバイダーを使いたいときは、そのジョブ自身に `provider` と `model` の上書きを設定します。

```python
cronjob(
    action="create",
    schedule="every 2h",
    prompt="Check server status",
    provider="openrouter",
    model="google/gemini-3-flash-preview"
)
```

設定の詳しい内容は [定時タスク（Cron）](/hermes/docs/user-guide/features/cron/) を見てください。

---

## まとめ {#summary}

| 機能 | 切り替えの仕組み | 設定の場所 |
|---------|-------------------|----------------|
| 主エージェントのモデル | config.yaml の `fallback_providers` — エラー時にターン単位で切り替わる（毎ターン主モデルに戻る） | `fallback_providers:`（最上位の一覧） |
| 補助タスク（すべて） — auto の人 | 容量のエラー時に、自動の探索の連なりを丸ごと使う（まず主エージェントのモデル、次にプロバイダーの連なり） | `auxiliary.<task>.provider: auto` |
| 補助タスク（すべて） — プロバイダーを明示した人 | 容量のエラーのときだけ、`fallback_chain`（あれば）→ 主エージェントのモデル → 警告して投げ直す | `auxiliary.<task>.fallback_chain` |
| 画像の読み取り | 層になった切り替え（上記）と、内部での OpenRouter の試し直し | `auxiliary.vision` |
| ウェブの抽出 | 層になった切り替え（上記）と、内部での OpenRouter の試し直し | `auxiliary.web_extract` |
| 文脈の圧縮 | 層になった切り替え（上記）。どの層も使えなければ要約なしに落とす | `auxiliary.compression` |
| スキルの拠点 | 層になった切り替え（上記） | `auxiliary.skills_hub` |
| MCP の補助 | 層になった切り替え（上記） | `auxiliary.mcp` |
| 承認の仕分け | 層になった切り替え（上記） | `auxiliary.approval` |
| 題名の生成 | 層になった切り替え（上記） | `auxiliary.title_generation` |
| 仕分けの肉付け | 層になった切り替え（上記） | `auxiliary.triage_specifier` |
| 委任 | 親の `fallback_providers` の連なりを受け継ぐ。プロバイダーとモデルの上書きは任意 | `delegation.provider` / `delegation.model` |
| 定時ジョブ | 設定された `fallback_providers` の連なりを受け継ぐ。ジョブごとのプロバイダーの上書きは任意 | ジョブごとの `provider` / `model` |
