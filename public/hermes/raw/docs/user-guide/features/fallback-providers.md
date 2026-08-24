---
title: "予備のプロバイダ"
description: "本命のモデルが使えないとき、控えの LLM プロバイダへ自動で切り替わるように設定します。"
upstream_path: user-guide/features/fallback-providers.md
upstream_blob: dbd824954dae613b5c9ad86135321e3a1be8acc3
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/fallback-providers
---

# 予備のプロバイダ {#fallback-providers}

Hermes Agent には、プロバイダ側で問題が起きてもセッションを走り続けさせるための、3つの層の粘り強さがあります。

1. **[認証情報の持ち回り](/hermes/docs/user-guide/features/credential-pools/)** — *同じ*プロバイダの複数の API キーを順番に使い分けます（まずこれが試されます）
2. **本命モデルの切り替え** — 本命のモデルが失敗したとき、*別の*プロバイダとモデルの組へ自動で移ります
3. **補助作業の切り替え** — 画像の読み取り、文脈の圧縮、ウェブの抜き出しといった脇の作業について、独立にプロバイダを決めます

同じプロバイダ内での使い分け（たとえば OpenRouter の鍵を複数持つ場合）は認証情報の持ち回りが受け持ちます。このページで扱うのは、プロバイダをまたぐ切り替えのほうです。どちらも任意で、それぞれ独立して働きます。

## 本命モデルの切り替え {#primary-model-fallback}

本命の LLM プロバイダでエラーが起きたとき（速度制限、サーバーの過負荷、認証の失敗、接続の切断など）、Hermes は会話を失わないまま、セッションの途中で控えのプロバイダとモデルの組へ自動で移れます。

### 設定 {#configuration}

いちばん手軽なのは、対話式の管理画面です。

```bash
hermes fallback
```

`hermes fallback` は `hermes model` と同じプロバイダの選択画面を使い回します。プロバイダの一覧も、認証情報の聞き方も、確認のしかたも同じです。控えの並びを整えるには、`add`、`list`（別名 `ls`）、`remove`（別名 `rm`）、`clear` の各サブコマンドを使ってください。変更は `config.yaml` のいちばん上の階層にある `fallback_providers:` の一覧に保存されます。

YAML を直に書くほうがよければ、`~/.hermes/config.yaml` のいちばん上の階層に `fallback_providers` の一覧を足してください。

```yaml
fallback_providers:
  - provider: openrouter
    model: anthropic/claude-sonnet-4
```

どの項目にも `provider` と `model` の両方が要ります。どちらかが欠けている項目は読み飛ばされます。

:::note `fallback_model` と `fallback_providers`
`fallback_providers`（複数形の一覧）が今の設定の書き方で、控えを複数並べて順番に試せます。`fallback_model`（単数形）は控えを1つだけ書いていた古い書き方で、Hermes は後方互換のために今も受け付けますが、`hermes fallback` は今の `fallback_providers` のほうに書き込み、書き込むときに古い設定を移してくれます。両方が書かれている場合は `fallback_providers` が優先されます。
:::

### 使えるプロバイダ {#supported-providers}

| プロバイダ | 値 | 必要なもの |
|----------|-------|-------------|
| AI Gateway | `ai-gateway` | `AI_GATEWAY_API_KEY` |
| OpenRouter | `openrouter` | `OPENROUTER_API_KEY` |
| Nous Portal | `nous` | `hermes setup --portal`（新規）または `hermes auth add nous`（OAuth） |
| OpenAI Codex | `openai-codex` | `hermes model` → **ChatGPT または Codex のサブスクリプション**（ChatGPT の OAuth） |
| GitHub Copilot | `copilot` | `COPILOT_GITHUB_TOKEN`、`GH_TOKEN`、または `GITHUB_TOKEN` |
| GitHub Copilot ACP | `copilot-acp` | 外部のプロセス（エディタ連携） |
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
| xAI Grok OAuth（SuperGrok） | `xai-oauth`（別名 `grok-oauth`） | `hermes model` → xAI Grok OAuth（ブラウザでログイン。SuperGrok のサブスクリプションが必要） |
| AWS Bedrock | `bedrock` | 標準の boto3 認証（`AWS_REGION` + `AWS_PROFILE` または `AWS_ACCESS_KEY_ID`） |
| Qwen Portal（OAuth） | `qwen-oauth` | `hermes model`（Qwen Portal の OAuth。任意: `HERMES_QWEN_BASE_URL`） |
| MiniMax（OAuth） | `minimax-oauth` | `hermes model`（MiniMax ポータルの OAuth） |
| OpenCode Zen | `opencode-zen` | `OPENCODE_ZEN_API_KEY` |
| CommandCode | `commandcode`（別名 `commandcode-chat`。Claude は `commandcode-anthropic` 経由） | `COMMANDCODE_API_KEY` |
| OpenCode Go | `opencode-go` | `OPENCODE_GO_API_KEY` |
| OpenCode Free | `opencode-free` | —（鍵なし。認証情報は要りません） |
| Kilo Code | `kilocode` | `KILOCODE_API_KEY` |
| Xiaomi MiMo | `xiaomi` | `XIAOMI_API_KEY` |
| Arcee AI | `arcee` | `ARCEEAI_API_KEY` |
| GMI Cloud | `gmi` | `GMI_API_KEY` |
| Alibaba / DashScope | `alibaba` | `DASHSCOPE_API_KEY` |
| Alibaba Coding Plan | `alibaba-coding-plan` | `ALIBABA_CODING_PLAN_API_KEY`（なければ `DASHSCOPE_API_KEY` を使います） |
| Kimi / Moonshot（中国） | `kimi-coding-cn` | `KIMI_CN_API_KEY` |
| StepFun | `stepfun` | `STEPFUN_API_KEY` |
| Tencent TokenHub | `tencent-tokenhub` | `TOKENHUB_API_KEY` |
| Microsoft Foundry | `azure-foundry` | `AZURE_FOUNDRY_API_KEY` + `AZURE_FOUNDRY_BASE_URL` |
| LM Studio（ローカル） | `lmstudio` | `LM_API_KEY`（ローカルなら不要）+ `LM_BASE_URL` |
| Hugging Face | `huggingface` | `HF_TOKEN` |
| 自前の接続先 | `custom` | `base_url` + `key_env`（下記参照） |

### 自前の接続先を控えにする {#custom-endpoint-fallback}

OpenAI 互換の自前の接続先を使うときは、`base_url` を足し、必要なら `key_env` も書きます。

```yaml
fallback_providers:
  - provider: custom
    model: my-local-model
    base_url: http://localhost:8000/v1
    key_env: MY_LOCAL_KEY            # env var name containing the API key
```

### どんなときに切り替わるか {#when-fallback-triggers}

本命のモデルが次のかたちで失敗したとき、控えへの切り替えが自動で働きます。

- **速度制限**（HTTP 429）— 再試行を使い切ったあと
- **サーバーのエラー**（HTTP 500、502、503）— 再試行を使い切ったあと
- **認証の失敗**（HTTP 401、403）— すぐに（再試行しても意味がないため）
- **見つからない**（HTTP 404）— すぐに
- **おかしな応答** — API が壊れた応答や空の応答を繰り返し返すとき

切り替わるとき、Hermes は次のことをします。

1. 控えのプロバイダの認証情報を解決する
2. 新しい API のつなぎ手を組み立てる
3. モデル、プロバイダ、つなぎ手をその場で入れ替える
4. 再試行の数え直しをして会話を続ける

切り替えは継ぎ目なく行われます。会話の履歴も、ツールの呼び出しも、文脈もそのままです。エージェントは中断したところからそのまま続け、ただ使うモデルが変わるだけです。

:::warning 切り替えるとプロンプトの使い回しが消えます
プロンプトの使い回しは、その要求を処理するモデル（そして多くのプロバイダではアカウント）に結び付いています。控えに切り替わると、新しいプロバイダとモデルの組にはその会話の使い回せる前置きがないので、次の要求では履歴のすべてを、割引された使い回しの料金（元の 75〜90% 引き）ではなく、入力トークンの正規の料金で読み直すことになります。ターンが終わって本命に戻るときも同じで、本命に戻ってからの最初の要求もやはり読み直しになります（本命側の使い回しの有効期限がまだ切れていなければ別です）。これは避けようがなく、障害の最中も動き続けるための代償です。ただ、プロバイダのあいだを行き来する長いセッションが、動かないままのセッションよりはっきり高くつくのは、これが理由です。
:::

:::info セッション単位ではなくターン単位
切り替えは**ターンの範囲**で効きます。利用者からの新しいメッセージごとに、本命のモデルに戻った状態から始まります。ターンの途中で本命が失敗したら、そのターンのあいだだけ控えが働きます。次のメッセージでは、Hermes はまた本命を試します。1つのターンの中で切り替わるのは多くても1回で、控えも失敗したときは通常のエラー処理（再試行のあとエラーの表示）に移ります。こうすることで、1つのターンの中で次々に切り替わり続けるのを防ぎつつ、本命のモデルにはターンごとに新しい機会を与えています。

このターンごとの再試行は**復帰時刻を見て判断します**。本命の認証情報が、まだ過ぎていない速度制限の解除時刻を報告しているとき（Claude Pro/Max の5時間区切りや Codex の週単位の上限といったサブスクリプションの区切りは、これを時間や日の単位で返します）、Hermes は失敗が分かりきった再試行を飛ばし、解除時刻が過ぎるまで控えのままでいます。そのおかげで、1ターンにつきプロバイダを2回無駄に切り替えること（とプロンプトの使い回しを2回捨てること）を避けられます。解除時刻を過ぎた瞬間、次のターンからは自動で本命に戻ります。解除時刻の付かない一時的な 429 はこれまでどおりで、少し間を置いてから毎ターン再試行します。
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

**クラウドの控えにローカルのモデルを置く:**
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

### どこで切り替えが効くか {#where-fallback-works}

| 使う場面 | 切り替えの対応 |
|---------|-------------------|
| CLI のセッション | ✔ |
| メッセージのゲートウェイ（Telegram、Discord など） | ✔ |
| サブエージェントへの委任 | ✔（サブエージェントは親の控えの並びを引き継ぎます） |
| 定時実行の作業 | ✔（定時実行のエージェントも設定した控えのプロバイダを引き継ぎます） |
| `provider: auto` の補助作業 | ✔（作業ごとの控えを試し、次に本命の控えの並び、それから内蔵の補助用の探索に進みます） |

:::tip
本命の控えの並びには環境変数がありません。設定は `config.yaml` か `hermes fallback` だけで行ってください。これは意図してそうしています。控えの設定は考えたうえでの選択であって、古いシェルの設定に上書きされてよいものではないからです。
:::

---

## 補助作業の切り替え {#auxiliary-task-fallback}

Hermes は脇の作業に、別の軽いモデルを使います。作業ごとにプロバイダを決める連なりを持っていて、それがそのまま内蔵の切り替えのしくみになっています。

### プロバイダを独立に決める作業 {#tasks-with-independent-provider-resolution}

| 作業 | 何をするか | 設定のキー |
|------|-------------|-----------|
| 画像の読み取り | 画像の分析、ブラウザの画面写し | `auxiliary.vision` |
| ウェブの抜き出し | ウェブページの要約 | `auxiliary.web_extract` |
| 圧縮 | 文脈を圧縮した要約 | `auxiliary.compression` |
| スキルの拠点 | スキルの検索と発見 | `auxiliary.skills_hub` |
| MCP | MCP まわりの補助的な処理 | `auxiliary.mcp` |
| 承認 | コマンドを承認するかの賢い振り分け | `auxiliary.approval` |
| 題名の生成 | セッションの題名の要約 | `auxiliary.title_generation` |
| 点検 | `/review` の点検役サブエージェント（LLM を1回呼ぶのではなく、エージェントまるごと） | `auxiliary.review` |
| 仕様の肉付け | `hermes kanban specify` と管理画面の ✨ ボタン。一行だけの仕分け用の作業を、ちゃんとした仕様に膨らませます | `auxiliary.triage_specifier` |

### 自動で選ぶ連なり {#auto-detection-chain}

作業のプロバイダが `"auto"`（既定）になっているとき、Hermes はまずその補助作業を本命のプロバイダと本命のモデルで試します。その道が使えない場合や、あとで容量不足の類のエラーで失敗した場合、Hermes は内蔵の探索に進む前に、利用者が設定した控えの方針を尊重します。

```text
Main provider + main model → auxiliary.<task>.fallback_chain →
fallback_providers / fallback_model → built-in auxiliary discovery chain
```

作業ごとの並びがいちばん細かく効き、書かれていればそれが勝ちます。いちばん上の階層の `fallback_providers` の並びは本体のエージェントが使うのと同じ方針なので、無料のものだけを使う、同じプロバイダに限る、といった決まりも `auto` の補助作業にそのまま当てはまります。

**内蔵の文章向けの探索の連なり（圧縮、ウェブの抜き出し、題名の生成など）:**

```text
OpenRouter → Nous Portal → Custom endpoint → Codex OAuth →
API-key providers (z.ai, Kimi, MiniMax, Xiaomi MiMo, Hugging Face, Anthropic) → give up
```

**内蔵の画像向けの探索の連なり:**

```text
Main provider (if vision-capable) → OpenRouter → Nous Portal →
Codex OAuth → Anthropic → Custom endpoint → give up
```

これら内蔵の連なりは、作業ごとの控えも本命の控えも決めていない人のための、便宜的な受け皿です。

### 補助作業のプロバイダを設定する {#configuring-auxiliary-providers}

作業ごとに、`config.yaml` で別々に設定できます。

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

上に挙げた作業はどれも、**provider / model / base_url** という同じ形をとります。作業ごとに自分の `fallback_chain` を書くこともできます。書かなければ、`provider: auto` はいちばん上の階層の `fallback_providers` の並びを、Hermes 内蔵の補助用の探索より先に使います。

文脈の圧縮は `auxiliary.compression` の下で設定します。

```yaml
auxiliary:
  compression:
    provider: main                                    # Same provider options as other auxiliary tasks
    model: google/gemini-3-flash-preview
    base_url: null                                    # Custom OpenAI-compatible endpoint
```

そして本命の控えの並びはこう書きます。

```yaml
fallback_providers:
  - provider: openrouter
    model: anthropic/claude-sonnet-4
    # base_url: http://localhost:8000/v1             # Optional custom endpoint
```

補助作業、圧縮、控えの3つは、どれも同じ理屈で動きます。`provider` で誰が処理するかを選び、`model` でどのモデルかを選び、`base_url` で自前の接続先を指す（これを書くとプロバイダの指定より優先されます）、という具合です。

### 補助作業で選べるプロバイダ {#provider-options-for-auxiliary-tasks}

ここに挙げる選択肢が使えるのは `auxiliary:`、`compression:`、`fallback_providers:` の項目だけです。いちばん上の階層の `model.provider` に `"main"` は**指定できません**。自前の接続先を使いたいときは、`model:` の節で `provider: custom` を使ってください（[AI プロバイダ](/hermes/docs/integrations/providers/)を参照）。

| プロバイダ | 説明 | 必要なもの |
|----------|-------------|-------------|
| `"auto"` | うまくいくものが見つかるまで順に試します（既定） | プロバイダが少なくとも1つ設定されていること |
| `"openrouter"` | OpenRouter に固定します | `OPENROUTER_API_KEY` |
| `"nous"` | Nous Portal に固定します | `hermes auth` |
| `"codex"` | Codex の OAuth に固定します | `hermes model` → ChatGPT または Codex のサブスクリプション |
| `"main"` | 本体のエージェントが使っているプロバイダをそのまま使います（補助作業のみ） | 本命のプロバイダが設定されていること |
| `"anthropic"` | Anthropic 直結に固定します | `ANTHROPIC_API_KEY` または Claude Code の認証情報 |

### 接続先を直に指定して上書きする {#direct-endpoint-override}

どの補助作業でも、`base_url` を書くとプロバイダの解決をまるごと飛ばして、その接続先へ直に要求を送ります。

```yaml
auxiliary:
  vision:
    base_url: "http://localhost:1234/v1"
    api_key: "local-key"
    model: "qwen2.5-vl"
```

`base_url` は `provider` より優先されます。Hermes は認証に、設定された `api_key` を使い、なければ `OPENAI_API_KEY` を使います。自前の接続先に `OPENROUTER_API_KEY` を使い回すことは**ありません**。

---

## 容量不足のときの補助作業の切り替え {#auxiliary-capacity-error-fallback}

補助作業のプロバイダをはっきり指定したとき（たとえば `auxiliary.vision.provider: glm`）、Hermes はそれをこちらの希望として扱います。ただ、そのプロバイダが**容量不足のエラー**（HTTP 402 の支払いが必要、HTTP 429 の日次上限の使い切り、接続の失敗）のせいで文字どおり要求を処理できないときは、黙って失敗する代わりに、段になった連なりをたどって控えに移ります。

1. **主となる補助のプロバイダ** — こちらが設定したもの（つねに最初に試されます）
2. **`auxiliary.<task>.fallback_chain`** — 作業ごとに書いた上書きの一覧（書いていれば）
3. **本体のエージェントのプロバイダとモデル** — 最後の安全網（連なりを書いていなくても、つねに試されます）
4. **警告を出して投げ直す** — すべての層が失敗したら、Hermes は `Auxiliary <task>: ... all fallbacks exhausted` を WARNING の水準で記録し、元のエラーを投げ直します

一時的な HTTP 429 の速度制限（`Retry-After: ...`）は、容量の問題ではなく要求のしかたの制約として扱われます。こちらが指定したプロバイダをそのまま守り、この段の連なりを**動かしません**。はっきり指定したプロバイダの縛りを越えるのは、日次・月次の上限の使い切り、支払いのエラー、接続の失敗だけです。

`provider: auto` の場合（補助作業のプロバイダをはっきり指定していない場合）は、手順2〜3の代わりに、既にある自動で選ぶ連なりが走ります。その最初の一歩がすでに本体のエージェントのモデルなので、`auto` のままでも設定なしで同じ結果になります。

### 任意: 作業ごとの控えの並び {#optional-per-task-fallback-chain}

「まず本体のエージェントのモデル」とは違う順番にしたければ、`fallback_chain` をはっきり書いてください。各項目には少なくとも `provider` が要ります。`model`、`base_url`、`api_key` は任意です。

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

控えを効かせるために `fallback_chain` を書く必要は**ありません**。本体のエージェントという安全網は、書かなくても働きます。既定とは違う順番にしたいときだけ使ってください。

`fallback_chain` の各項目には、自分の `timeout`（秒）も書けます。書かなければ、控えの候補は作業ごとの制限時間を引き継ぎますが、その値は主となるプロバイダに合わせて調整されているかもしれません。項目ごとに `timeout` を書いておけば、遅くても確実な控え（たとえば長い文脈を扱う要約役）が、主となるプロバイダの時計に合わせて途中で切られることなく、実際に必要なだけの時間をもらえます。

### 切り替えのきっかけになるプロバイダの上限エラー {#provider-quota-errors-that-trigger-fallback}

Hermes は次のものを、一時的な速度制限ではなく、402 の残高切れと同じ容量の問題として扱います。

- Bedrock / LiteLLM: `Too many tokens per day`、`daily limit`、`tokens per day`
- Vertex AI / GCP: `quota exceeded`、`resource exhausted`、`RESOURCE_EXHAUSTED`
- 一般的なもの: `daily quota`、`quota_exceeded`

使っているプロバイダが日次上限の使い切りに別の言い回しを返していて、Hermes が切り替えてくれない場合は、それは不具合です。エラーの文字列をそのまま添えて報告してください。

---

## 文脈の圧縮の切り替え {#context-compression-fallback}

文脈の圧縮は、要約をどのモデルとプロバイダが受け持つかを `auxiliary.compression` の設定のかたまりで決めます。

```yaml
auxiliary:
  compression:
    provider: "auto"                              # auto | openrouter | nous | main
    model: "google/gemini-3-flash-preview"
```

:::info 古い設定からの移行
`compression.summary_model` / `compression.summary_provider` / `compression.summary_base_url` を使っている古い設定は、最初に読み込まれたときに `auxiliary.compression.*` へ自動で移されます（設定の版は17）。
:::

圧縮に使えるプロバイダが1つもない場合、Hermes はセッションを失敗させるのではなく、要約を作らずに会話の途中のやり取りを落とします。

---

## 委任のプロバイダの上書き {#delegation-provider-override}

`delegate_task` で立ち上がったサブエージェントは、親のエージェントの本命の控えの並びを引き継ぎます。そのうえで、費用を抑えるためにサブエージェントだけ別のプロバイダとモデルの組に向けることもできます。

```yaml
delegation:
  provider: "openrouter"                      # override provider for all subagents
  model: "google/gemini-3-flash-preview"      # override model
  # base_url: "http://localhost:1234/v1"      # or use a direct endpoint
  # api_key: "local-key"
```

設定の詳しい中身は[サブエージェントへの委任](/hermes/docs/user-guide/features/delegation/)を参照してください。

---

## 定時実行の作業のプロバイダ {#cron-job-providers}

定時実行の作業は、エージェントを作るときに設定済みの `fallback_providers` の並び（または古い `fallback_model`）を引き継ぎます。ある作業だけ別の本命プロバイダを使いたいときは、その作業自体に `provider` と `model` の上書きを書いてください。

```python
cronjob(
    action="create",
    schedule="every 2h",
    prompt="Check server status",
    provider="openrouter",
    model="google/gemini-3-flash-preview"
)
```

設定の詳しい中身は[予約した作業（cron）](/hermes/docs/user-guide/features/cron/)を参照してください。

---

## まとめ {#summary}

| 対象 | 切り替えのしくみ | 設定の場所 |
|---------|-------------------|----------------|
| 本体のエージェントのモデル | config.yaml の `fallback_providers`。エラー時にターン単位で切り替わり、ターンごとに本命に戻ります | `fallback_providers:`（いちばん上の階層の一覧） |
| 補助作業すべて — auto の場合 | 容量不足のエラー時に、自動で選ぶ連なりをひととおり（まず本体のエージェントのモデル、次にプロバイダの連なり） | `auxiliary.<task>.provider: auto` |
| 補助作業すべて — プロバイダを指定した場合 | 容量不足のエラーのときだけ、`fallback_chain`（書いていれば）→ 本体のエージェントのモデル → 警告して投げ直す | `auxiliary.<task>.fallback_chain` |
| 画像の読み取り | 上記の段の連なり + OpenRouter への内部的な再試行 | `auxiliary.vision` |
| ウェブの抜き出し | 上記の段の連なり + OpenRouter への内部的な再試行 | `auxiliary.web_extract` |
| 文脈の圧縮 | 上記の段の連なり。すべての層が使えなければ要約なしに落とします | `auxiliary.compression` |
| スキルの拠点 | 上記の段の連なり | `auxiliary.skills_hub` |
| MCP の補助 | 上記の段の連なり | `auxiliary.mcp` |
| 承認の振り分け | 上記の段の連なり | `auxiliary.approval` |
| 題名の生成 | 上記の段の連なり | `auxiliary.title_generation` |
| 仕様の肉付け | 上記の段の連なり | `auxiliary.triage_specifier` |
| 委任 | 親の `fallback_providers` の並びを引き継ぎます。プロバイダとモデルは任意で上書きできます | `delegation.provider` / `delegation.model` |
| 定時実行の作業 | 設定済みの `fallback_providers` の並びを引き継ぎます。作業ごとにプロバイダを上書きできます | 作業ごとの `provider` / `model` |
