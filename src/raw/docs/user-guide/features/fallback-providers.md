---
title: "フォールバックプロバイダー"
description: "メインのモデルが使えなくなったとき、控えの LLM プロバイダーへ自動で切り替わるように設定します。"
upstream_path: user-guide/features/fallback-providers.md
upstream_blob: 2c3cdbc066d19cf2eac441e1df4a604972674491
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/fallback-providers
---

# フォールバックプロバイダー {#fallback-providers}

Hermes Agent には、プロバイダー側でトラブルが起きてもセッションを止めないための備えが三層あります。

1. **[認証情報プール](/hermes/docs/user-guide/features/credential-pools/)** — *同じ* プロバイダーの API キーを複数持ち、順番に使い回します（最初に試されるのはここです）
2. **メインモデルのフォールバック** — メインのモデルが失敗したとき、*別の* プロバイダーとモデルの組み合わせへ自動で切り替えます
3. **補助タスクのフォールバック** — 画像認識・圧縮・ウェブ抽出といった脇のタスクについて、独立にプロバイダーを解決します

同じプロバイダー内での切り替え（OpenRouter のキーを複数持つ場合など）は認証情報プールが担当します。このページで扱うのは、プロバイダーをまたぐ切り替えのほうです。どちらも任意で、互いに独立して動きます。

## メインモデルのフォールバック {#primary-model-fallback}

メインの LLM プロバイダーでエラーが起きたとき——レート制限、サーバーの過負荷、認証の失敗、接続の切断など——Hermes は会話を保ったまま、セッションの途中で控えのプロバイダーとモデルの組へ自動的に切り替えられます。

### 設定 {#configuration}

いちばん手軽なのは対話形式の管理画面です。

```bash
hermes fallback
```

`hermes fallback` は `hermes model` と同じプロバイダー選択画面を使い回します。プロバイダーの一覧も、認証情報の入力も、検証のしかたも同じです。切り替え先の並びを管理するには、サブコマンドの `add`、`list`（別名 `ls`）、`remove`（別名 `rm`）、`clear` を使います。変更内容は `config.yaml` の最上位にある `fallback_providers:` のリストへ保存されます。

YAML を自分で編集したい場合は、`~/.hermes/config.yaml` の最上位に `fallback_providers` のリストを足します。

```yaml
fallback_providers:
  - provider: openrouter
    model: anthropic/claude-sonnet-4
```

各エントリーには `provider` と `model` の両方が必要です。どちらかが欠けているエントリーは無視されます。

:::note `fallback_model` と `fallback_providers`
`fallback_providers`（複数形・リスト）が現行の設定の形で、複数の切り替え先を順番に試せます。`fallback_model`（単数形）は切り替え先を 1 つだけ書く古い形式のキーです。Hermes は後方互換のためにこちらも読みますが、`hermes fallback` が書き出すのは現行の `fallback_providers` のほうで、書き込みのときに古い設定を移行します。両方が設定されている場合は `fallback_providers` が優先されます。
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
| xAI（Grok） | `xai`（別名 `grok`） | `XAI_API_KEY`（任意: `XAI_BASE_URL`） |
| xAI Grok OAuth（SuperGrok） | `xai-oauth`（別名 `grok-oauth`） | `hermes model` → xAI Grok OAuth（ブラウザーでログイン。SuperGrok の契約が必要） |
| AWS Bedrock | `bedrock` | boto3 の標準的な認証（`AWS_REGION` と `AWS_PROFILE` または `AWS_ACCESS_KEY_ID`） |
| Qwen Portal（OAuth） | `qwen-oauth` | `hermes model`（Qwen Portal の OAuth。任意: `HERMES_QWEN_BASE_URL`） |
| MiniMax（OAuth） | `minimax-oauth` | `hermes model`（MiniMax ポータルの OAuth） |
| OpenCode Zen | `opencode-zen` | `OPENCODE_ZEN_API_KEY` |
| CommandCode | `commandcode`（別名 `commandcode-chat`。Claude は `commandcode-anthropic` 経由） | `COMMANDCODE_API_KEY` |
| OpenCode Go | `opencode-go` | `OPENCODE_GO_API_KEY` |
| Kilo Code | `kilocode` | `KILOCODE_API_KEY` |
| Xiaomi MiMo | `xiaomi` | `XIAOMI_API_KEY` |
| Arcee AI | `arcee` | `ARCEEAI_API_KEY` |
| GMI Cloud | `gmi` | `GMI_API_KEY` |
| Alibaba / DashScope | `alibaba` | `DASHSCOPE_API_KEY` |
| Alibaba Coding Plan | `alibaba-coding-plan` | `ALIBABA_CODING_PLAN_API_KEY`（無ければ `DASHSCOPE_API_KEY` を使います） |
| Kimi / Moonshot（中国） | `kimi-coding-cn` | `KIMI_CN_API_KEY` |
| StepFun | `stepfun` | `STEPFUN_API_KEY` |
| Tencent TokenHub | `tencent-tokenhub` | `TOKENHUB_API_KEY` |
| Microsoft Foundry | `azure-foundry` | `AZURE_FOUNDRY_API_KEY` と `AZURE_FOUNDRY_BASE_URL` |
| LM Studio（ローカル） | `lmstudio` | `LM_API_KEY`（ローカルなら不要）と `LM_BASE_URL` |
| Hugging Face | `huggingface` | `HF_TOKEN` |
| 独自エンドポイント | `custom` | `base_url` と `key_env`（下記参照） |

### 独自エンドポイントへのフォールバック {#custom-endpoint-fallback}

OpenAI 互換の独自エンドポイントを使う場合は、`base_url` を書き、必要に応じて `key_env` も足します。

```yaml
fallback_providers:
  - provider: custom
    model: my-local-model
    base_url: http://localhost:8000/v1
    key_env: MY_LOCAL_KEY            # env var name containing the API key
```

### フォールバックが働く条件 {#when-fallback-triggers}

メインのモデルが次のような失敗をしたとき、フォールバックが自動的に働きます。

- **レート制限**（HTTP 429）— 再試行を使い切ったあと
- **サーバーエラー**（HTTP 500、502、503）— 再試行を使い切ったあと
- **認証の失敗**（HTTP 401、403）— 即座に（再試行しても意味がないため）
- **見つからない**（HTTP 404）— 即座に
- **不正な応答** — API が壊れた応答や空の応答を繰り返し返すとき

働いたとき、Hermes は次のように動きます。

1. 切り替え先プロバイダーの認証情報を解決する
2. 新しい API クライアントを組み立てる
3. モデル・プロバイダー・クライアントをその場で差し替える
4. 再試行のカウンターをリセットし、会話を続ける

切り替えは途切れなく行われます。会話の履歴もツール呼び出しも文脈もそのまま残ります。エージェントは中断した地点からそのまま続き、使うモデルだけが変わります。

:::warning フォールバックするとプロンプトキャッシュが消えます
プロンプトキャッシュは、リクエストを処理するモデル（そしてたいていのプロバイダーではアカウント）ごとに紐づいています。フォールバックが働くと、新しいプロバイダーとモデルの組にはその会話のキャッシュがないため、次のリクエストは履歴全体を、割引の効いたキャッシュ価格（およそ 75〜90% 引き）ではなく通常の入力トークン価格で読み直します。ターンが終わってメインに戻るときも同じで、メインに戻った最初のリクエストもまた全部の読み直しになります（メイン側のキャッシュの有効期限がまだ切れていない場合を除きます）。障害の最中でも動き続けるための代償なので避けようがありませんが、プロバイダーの間を行き来する長いセッションが、ずっと同じところに留まるセッションよりはっきり高くつくのはこのためです。
:::

:::info セッション単位ではなくターン単位です
フォールバックは **ターン単位** です。ユーザーが新しくメッセージを送るたびに、メインのモデルへ戻った状態から始まります。ターンの途中でメインが失敗したら、そのターンのあいだだけフォールバックが働きます。次のメッセージでは、Hermes はまたメインを試します。1 つのターンの中でフォールバックが働くのは最大 1 回までで、切り替え先も失敗した場合は通常のエラー処理（再試行、それからエラーメッセージ）に移ります。こうすることで、ターンの中で切り替えが連鎖するのを防ぎつつ、メインのモデルには毎ターン新しい機会が与えられます。

このターンごとの再試行は **リセット時刻を見ています**。メイン側の認証情報がレート制限の解除時刻を返していて、それがまだ来ていない場合（Claude Pro / Max の 5 時間枠や Codex の週次上限のような契約の枠は、解除まで数時間〜数日と返します）、Hermes は失敗が分かりきった再試行を飛ばし、解除時刻が過ぎるまでフォールバック側に留まります。1 ターンにつき無駄なプロバイダー切り替えが 2 回（つまりプロンプトキャッシュの破棄も 2 回）起きるのを避けるためです。解除時刻を過ぎた瞬間、次のターンから自動的にメインへ戻ります。解除時刻の付かない一時的な 429 は従来どおりの動きで、短い待機のあと毎ターン再試行します。
:::

### 例 {#examples}

**Anthropic に直結しているときのフォールバックに OpenRouter を使う:**
```yaml
model:
  provider: anthropic
  default: claude-sonnet-4-6

fallback_providers:
  - provider: openrouter
    model: anthropic/claude-sonnet-4
```

**OpenRouter のフォールバックに Nous Portal を使う:**
```yaml
model:
  provider: openrouter
  default: anthropic/claude-opus-4

fallback_providers:
  - provider: nous
    model: nous-hermes-3
```

**クラウドのフォールバックにローカルのモデルを使う:**
```yaml
fallback_providers:
  - provider: custom
    model: llama-3.1-70b
    base_url: http://localhost:8000/v1
    key_env: LOCAL_API_KEY
```

**Codex の OAuth をフォールバックに使う:**
```yaml
fallback_providers:
  - provider: openai-codex
    model: gpt-5.3-codex
```

### フォールバックが使える場所 {#where-fallback-works}

| 場面 | フォールバックの対応 |
|---------|-------------------|
| CLI のセッション | ✔ |
| メッセージングのゲートウェイ（Telegram、Discord など） | ✔ |
| サブエージェントへの委任 | ✔（サブエージェントは親の切り替え先の並びを引き継ぎます） |
| 定期実行のジョブ | ✔（定期実行のエージェントも設定済みの切り替え先を引き継ぎます） |
| `provider: auto` の補助タスク | ✔（タスクごとの切り替え先、次にメインの切り替え先の並び、そのあとで組み込みの補助タスク探索の順に試します） |

:::tip
メインの切り替え先の並びを指定する環境変数はありません。設定するのは `config.yaml` か `hermes fallback` だけです。これは意図した設計で、フォールバックの設定は意識して選ぶものであり、シェルに残った古い環境変数に上書きされてよいものではないからです。
:::

---

## 補助タスクのフォールバック {#auxiliary-task-fallback}

Hermes は脇のタスクに、それぞれ別の軽いモデルを使います。タスクごとに独自のプロバイダー解決の連なりがあり、それ自体が組み込みのフォールバックとして働きます。

### プロバイダーを独立に解決するタスク {#tasks-with-independent-provider-resolution}

| タスク | 何をするか | 設定キー |
|------|-------------|-----------|
| 画像認識 | 画像の解析、ブラウザーのスクリーンショット | `auxiliary.vision` |
| ウェブ抽出 | ウェブページの要約 | `auxiliary.web_extract` |
| 圧縮 | 文脈を圧縮するための要約 | `auxiliary.compression` |
| スキルハブ | スキルの検索と発見 | `auxiliary.skills_hub` |
| MCP | MCP の補助的な処理 | `auxiliary.mcp` |
| 承認 | コマンドの承認を賢く仕分ける処理 | `auxiliary.approval` |
| タイトル生成 | セッションのタイトルの要約 | `auxiliary.title_generation` |
| トリアージの具体化 | `hermes kanban specify` とダッシュボードの ✨ ボタン。一行のトリアージ項目をちゃんとした仕様に膨らませます | `auxiliary.triage_specifier` |

### 自動判別の連なり {#auto-detection-chain}

タスクのプロバイダーが `"auto"`（既定値）のとき、Hermes はまずその補助タスクにメインのプロバイダーとメインのモデルを試します。それが使えない場合や、あとで容量不足系のエラーで失敗した場合、Hermes は組み込みの探索へ進む前に、利用者が設定したフォールバックの方針を尊重します。

```text
Main provider + main model → auxiliary.<task>.fallback_chain →
fallback_providers / fallback_model → built-in auxiliary discovery chain
```

タスクごとの並びがいちばん的確なので、設定されていればそれが勝ちます。最上位の `fallback_providers` の並びはメインのエージェントが使うのと同じ方針なので、無料のみに絞る・同じプロバイダーに留める、といったルールが `auto` の補助タスクにもそのまま適用されます。

**組み込みのテキスト系探索の連なり（圧縮、ウェブ抽出、タイトル生成など）:**

```text
OpenRouter → Nous Portal → Custom endpoint → Codex OAuth →
API-key providers (z.ai, Kimi, MiniMax, Xiaomi MiMo, Hugging Face, Anthropic) → give up
```

**組み込みの画像認識の探索の連なり:**

```text
Main provider (if vision-capable) → OpenRouter → Nous Portal →
Codex OAuth → Anthropic → Custom endpoint → give up
```

これらの組み込みの連なりは、タスクごとの方針もメインの方針も書いていない利用者のための、いわば間に合わせの受け皿です。

### 補助タスクのプロバイダーを設定する {#configuring-auxiliary-providers}

タスクごとに `config.yaml` で個別に設定できます。

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

上のタスクはどれも同じ **provider / model / base_url** の形をしています。タスクごとに独自の `fallback_chain` を書くこともできます。書かなかった場合、`provider: auto` は Hermes の組み込みの補助タスク探索より先に、最上位の `fallback_providers` の並びを使います。

文脈の圧縮は `auxiliary.compression` の下で設定します。

```yaml
auxiliary:
  compression:
    provider: main                                    # Same provider options as other auxiliary tasks
    model: google/gemini-3-flash-preview
    base_url: null                                    # Custom OpenAI-compatible endpoint
```

メインの切り替え先の並びはこう書きます。

```yaml
fallback_providers:
  - provider: openrouter
    model: anthropic/claude-sonnet-4
    # base_url: http://localhost:8000/v1             # Optional custom endpoint
```

補助タスク・圧縮・フォールバックの 3 つはどれも同じ考え方です。`provider` で誰に処理させるかを選び、`model` でどのモデルかを選び、`base_url` で独自のエンドポイントを指す（こちらがプロバイダーの指定より優先されます）。

### 補助タスクで指定できるプロバイダー {#provider-options-for-auxiliary-tasks}

ここに挙げる値が使えるのは `auxiliary:`、`compression:`、`fallback_providers:` のエントリーだけです。最上位の `model.provider` に `"main"` は **書けません**。独自のエンドポイントを使いたい場合は、`model:` のセクションで `provider: custom` を指定してください（[AI プロバイダー](/hermes/docs/integrations/providers/) を参照）。

| プロバイダー | 説明 | 必要なもの |
|----------|-------------|-------------|
| `"auto"` | うまくいくものが見つかるまで順番に試します（既定値） | 少なくとも 1 つプロバイダーが設定してあること |
| `"openrouter"` | OpenRouter に固定します | `OPENROUTER_API_KEY` |
| `"nous"` | Nous Portal に固定します | `hermes auth` |
| `"codex"` | Codex の OAuth に固定します | `hermes model` → ChatGPT or Codex Subscription |
| `"main"` | メインのエージェントが使っているプロバイダーをそのまま使います（補助タスク専用） | メインのプロバイダーが設定済みで有効なこと |
| `"anthropic"` | Anthropic に直結します | `ANTHROPIC_API_KEY` または Claude Code の認証情報 |

### エンドポイントを直接指定して上書きする {#direct-endpoint-override}

どの補助タスクでも、`base_url` を書くとプロバイダーの解決を丸ごと飛ばして、そのエンドポイントへ直接リクエストを送ります。

```yaml
auxiliary:
  vision:
    base_url: "http://localhost:1234/v1"
    api_key: "local-key"
    model: "qwen2.5-vl"
```

`base_url` は `provider` より優先されます。認証には設定した `api_key` を使い、書かれていない場合は `OPENAI_API_KEY` を使います。独自のエンドポイントに `OPENROUTER_API_KEY` を流用することは **ありません**。

---

## 補助タスクの容量エラーによるフォールバック {#auxiliary-capacity-error-fallback}

補助タスクのプロバイダーを明示的に指定した場合（`auxiliary.vision.provider: glm` など）、Hermes はそれをあなたの希望として扱います。ただし、**容量エラー**（HTTP 402 の支払い要求、HTTP 429 の日次上限の使い切り、接続の失敗）でプロバイダーがそもそもリクエストを処理できないときは、黙って失敗するのではなく、段階を追った受け皿へ降りていきます。

1. **指定した補助プロバイダー** — あなたが設定したもの（つねに最初に試します）
2. **`auxiliary.<task>.fallback_chain`** — タスクごとの上書きリスト（書いていれば）
3. **メインのエージェントのプロバイダーとモデル** — 最後の安全網（並びを書いていなくても、つねに試します）
4. **警告して再送出** — どの段階も失敗した場合、Hermes は `Auxiliary <task>: ... all fallbacks exhausted` を WARNING レベルで記録し、元のエラーをそのまま投げ直します

一時的な HTTP 429 のレート制限（`Retry-After: ...` が付くもの）は、容量の問題ではなくリクエスト側の制約として扱われます。つまり明示的なプロバイダー指定がそのまま尊重され、上の受け皿の階段は **降りません**。この階段に進むのは、日次・月次の上限の使い切り、支払いのエラー、接続の失敗だけです。

`provider: auto`（補助プロバイダーを明示していない状態）の場合は、2 と 3 の代わりに従来の自動判別の連なりが走ります。その最初の段はもともとメインのエージェントのモデルなので、`auto` の利用者は何も設定しなくても同じ結果になります。

### 任意: タスクごとの切り替え先の並び {#optional-per-task-fallback-chain}

「まずメインのエージェントのモデル」以外の順番にしたい場合は、`fallback_chain` を明示的に設定します。各エントリーには最低限 `provider` が必要で、`model`、`base_url`、`api_key` は任意です。

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

フォールバックを働かせるために `fallback_chain` を設定する必要は **ありません**。メインのエージェントという安全網は、書かなくても働きます。既定と違う順番にしたいときだけ使ってください。

`fallback_chain` の各エントリーには、それぞれ独自の `timeout`（秒）を書くこともできます。書かない場合、切り替え先の候補はタスク全体の待ち時間の設定を引き継ぎますが、それはメインのプロバイダーに合わせて詰めてあるかもしれません。エントリーごとに `timeout` を書けば、遅いけれど確実な切り替え先（大きな文脈をまとめる要約モデルなど）に、メインの時計で息絶えずに済むだけの時間を与えられます。

### フォールバックの引き金になる、プロバイダー側の上限エラー {#provider-quota-errors-that-trigger-fallback}

Hermes は次のものを、一時的なレート制限ではなく、402 の残高切れと同じ容量の問題として扱います。

- Bedrock / LiteLLM: `Too many tokens per day`、`daily limit`、`tokens per day`
- Vertex AI / GCP: `quota exceeded`、`resource exhausted`、`RESOURCE_EXHAUSTED`
- 一般的なもの: `daily quota`、`quota_exceeded`

もし使っているプロバイダーが日次上限の使い切りを別の言い回しで返していて、Hermes がフォールバックしないなら、それは不具合です。エラー文字列をそのまま添えて issue を立ててください。

---

## 文脈の圧縮のフォールバック {#context-compression-fallback}

文脈の圧縮は、`auxiliary.compression` の設定ブロックで、どのモデルとプロバイダーが要約を担当するかを決めます。

```yaml
auxiliary:
  compression:
    provider: "auto"                              # auto | openrouter | nous | main
    model: "google/gemini-3-flash-preview"
```

:::info 古い設定からの移行
`compression.summary_model` / `compression.summary_provider` / `compression.summary_base_url` を使っている古い設定は、最初の読み込み時に `auxiliary.compression.*` へ自動的に移行されます（設定バージョン 17）。
:::

圧縮に使えるプロバイダーが 1 つもない場合、Hermes はセッションを落とすかわりに、要約を作らないまま会話の中ほどのやり取りを捨てます。

---

## 委任先のプロバイダーの上書き {#delegation-provider-override}

`delegate_task` で生まれたサブエージェントは、親エージェントのメインの切り替え先の並びを引き継ぎます。そのうえで、費用を抑えるためにサブエージェントだけ別のプロバイダーとモデルの組に向けることもできます。

```yaml
delegation:
  provider: "openrouter"                      # override provider for all subagents
  model: "google/gemini-3-flash-preview"      # override model
  # base_url: "http://localhost:1234/v1"      # or use a direct endpoint
  # api_key: "local-key"
```

設定の詳しい内容は [サブエージェントへの委任](/hermes/docs/user-guide/features/delegation/) を参照してください。

---

## 定期実行ジョブのプロバイダー {#cron-job-providers}

定期実行のジョブは、エージェントを作るときに、設定済みの `fallback_providers` の並び（または古い形式の `fallback_model`）を引き継ぎます。ジョブごとに別のメインプロバイダーを使いたい場合は、そのジョブ自身に `provider` と `model` の上書きを設定します。

```python
cronjob(
    action="create",
    schedule="every 2h",
    prompt="Check server status",
    provider="openrouter",
    model="google/gemini-3-flash-preview"
)
```

設定の詳しい内容は [定期実行タスク（cron）](/hermes/docs/user-guide/features/cron/) を参照してください。

---

## まとめ {#summary}

| 機能 | フォールバックの仕組み | 設定を書く場所 |
|---------|-------------------|----------------|
| メインのエージェントのモデル | config.yaml の `fallback_providers`。エラー時にターン単位で切り替え（毎ターン、メインへ戻ります） | `fallback_providers:`（最上位のリスト） |
| 補助タスク全般 — auto の利用者 | 容量エラーのとき、自動判別の連なりを丸ごと使います（まずメインのエージェントのモデル、続いてプロバイダーの連なり） | `auxiliary.<task>.provider: auto` |
| 補助タスク全般 — プロバイダーを明示した場合 | 容量エラーのときだけ、`fallback_chain`（設定されていれば）→ メインのエージェントのモデル → 警告して送出 | `auxiliary.<task>.fallback_chain` |
| 画像認識 | 上記の段階的な受け皿と、OpenRouter への内部的な再試行 | `auxiliary.vision` |
| ウェブ抽出 | 上記の段階的な受け皿と、OpenRouter への内部的な再試行 | `auxiliary.web_extract` |
| 文脈の圧縮 | 上記の段階的な受け皿。どの段階も使えなければ要約なしに落とします | `auxiliary.compression` |
| スキルハブ | 上記の段階的な受け皿 | `auxiliary.skills_hub` |
| MCP の補助処理 | 上記の段階的な受け皿 | `auxiliary.mcp` |
| 承認の仕分け | 上記の段階的な受け皿 | `auxiliary.approval` |
| タイトル生成 | 上記の段階的な受け皿 | `auxiliary.title_generation` |
| トリアージの具体化 | 上記の段階的な受け皿 | `auxiliary.triage_specifier` |
| 委任 | 親の `fallback_providers` の並びを引き継ぎます。プロバイダーとモデルの上書きも可能です | `delegation.provider` / `delegation.model` |
| 定期実行ジョブ | 設定済みの `fallback_providers` の並びを引き継ぎます。ジョブごとの上書きも可能です | ジョブごとの `provider` / `model` |
