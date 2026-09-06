---
title: "LLM とモデルプロバイダ"
description: ""
upstream_path: integrations/providers.md
upstream_blob: 006b04c50322c14d44282dbcb2be2d74741ad16f
sources:
  - https://hermes-agent.nousresearch.com/docs/integrations/providers
---

# LLM とモデルプロバイダ {#llm-and-model-providers}

このページでは、Hermes Agent 向けの推論プロバイダを設定する方法を扱います。OpenRouter や Anthropic のようなクラウド API から、Ollama や vLLM のような自前ホストのエンドポイント、さらに高度なルーティングやフォールバックの設定までを取り上げます。Hermes を使うには、少なくとも 1 つのプロバイダを設定しておく必要があります。

## 推論プロバイダ {#inference-providers}

LLM につなぐ手段が少なくとも 1 つ必要です。`hermes model` を使うとプロバイダとモデルを対話的に切り替えられますし、直接設定することもできます。

| プロバイダ | 設定方法 |
|----------|-------|
| **Nous Portal** | `hermes model`（OAuth、サブスクリプション制） |
| **OpenAI Codex** | `hermes model` → **ChatGPT or Codex Subscription**（ChatGPT の OAuth。Codex のモデルを使います） |
| **GitHub Copilot** | `hermes model`（OAuth デバイスコードフロー、`COPILOT_GITHUB_TOKEN`、`GH_TOKEN`、または `gh auth token`） |
| **GitHub Copilot ACP** | `hermes model`（ローカルで `copilot --acp --stdio` を起動します） |
| **Anthropic** | `hermes model`（Claude Max + 追加利用クレジットを OAuth で。Anthropic の API キーや手動の setup-token にも対応 — 下の注記を参照） |
| **OpenRouter** | `~/.hermes/.env` に `OPENROUTER_API_KEY` |
| **Ramp Router** | `~/.hermes/.env` に `RAMP_ROUTER_API_KEY`（provider: `router`、別名: `ramp-router`、`ramp`、`router.com`。Responses ネイティブのゲートウェイで、アカウント単位の最新カタログを持ちます） |
| **Fireworks AI** | `~/.hermes/.env` に `FIREWORKS_API_KEY`（provider: `fireworks`、別名: `fireworks-ai`、`fw`） |
| **NovitaAI** | `~/.hermes/.env` に `NOVITA_API_KEY`（provider: `novita`、200 以上のモデル、Model API、Agent Sandbox、GPU Cloud） |
| **AI Gateway** | `~/.hermes/.env` に `AI_GATEWAY_API_KEY`（provider: `ai-gateway`） |
| **z.ai / GLM** | `~/.hermes/.env` に `GLM_API_KEY`（provider: `zai`） |
| **Kimi / Moonshot** | `~/.hermes/.env` に `KIMI_API_KEY`（provider: `kimi-coding`） |
| **Kimi / Moonshot（中国）** | `~/.hermes/.env` に `KIMI_CN_API_KEY`（provider: `kimi-coding-cn`、別名: `kimi-cn`、`moonshot-cn`） |
| **Arcee AI** | `~/.hermes/.env` に `ARCEEAI_API_KEY`（provider: `arcee`、別名: `arcee-ai`、`arceeai`） |
| **GMI Cloud** | `~/.hermes/.env` に `GMI_API_KEY`（provider: `gmi`、別名: `gmi-cloud`、`gmicloud`） |
| **Nebius Token Factory** | `~/.hermes/.env` に `NEBIUS_API_KEY`（provider: `nebius-token-factory`、別名: `nebius`、`nebius-tf`、`tokenfactory`） |
| **Actual Computer** | ホスト型リレーを使うなら `~/.hermes/.env` に `ACTUAL_API_KEY`、ローカルのデーモンを使うなら `ACTUAL_BASE_URL=http://127.0.0.1:8080`（ループバックならキーは不要）（provider: `actual`、別名: `actual-computer`、`actualcomputer`、`aci`） |
| **MiniMax** | `~/.hermes/.env` に `MINIMAX_API_KEY`（provider: `minimax`） |
| **MiniMax China** | `~/.hermes/.env` に `MINIMAX_CN_API_KEY`（provider: `minimax-cn`） |
| **xAI（Grok）— Responses API** | `~/.hermes/.env` に `XAI_API_KEY`（provider: `xai`） |
| **xAI Grok OAuth（SuperGrok）** | `hermes model` → 「xAI Grok OAuth (SuperGrok / Premium+)」 — ブラウザでログインし、API キーは不要です。[ガイド](/hermes/docs/guides/xai-grok-oauth/)を参照 |
| **Qwen Cloud（Alibaba DashScope）** | `~/.hermes/.env` に `DASHSCOPE_API_KEY`（provider: `alibaba`、中国本土向けエンドポイント: `alibaba-cn`） |
| **Alibaba Cloud（Coding Plan）** | `ALIBABA_CODING_PLAN_API_KEY`（無ければ `DASHSCOPE_API_KEY` にフォールバック）（provider: `alibaba-coding-plan`、別名: `alibaba_coding`。中国本土向けエンドポイントは `alibaba-coding-plan-cn` で `ALIBABA_CODING_PLAN_CN_API_KEY` を使い、無ければ共有キーにフォールバック） — 課金 SKU が別で、エンドポイントも異なります |
| **Alibaba Cloud（Token Plan）** | `~/.hermes/.env` に `ALIBABA_TOKEN_PLAN_API_KEY`（provider: `alibaba-token-plan`。中国本土向けエンドポイントは `alibaba-token-plan-cn` で `ALIBABA_TOKEN_PLAN_CN_API_KEY` を使い、無ければ共有キーにフォールバック） — Model Studio の定額トークン枠です |
| **Kilo Code** | `~/.hermes/.env` に `KILOCODE_API_KEY`（provider: `kilocode`） |
| **Xiaomi MiMo** | `~/.hermes/.env` に `XIAOMI_API_KEY`（provider: `xiaomi`、別名: `mimo`、`xiaomi-mimo`） |
| **Tencent TokenHub** | `~/.hermes/.env` に `TOKENHUB_API_KEY`（provider: `tencent-tokenhub`、別名: `tencent`、`tokenhub`、`tencentmaas`） |
| **Tencent TokenPlan** | `~/.hermes/.env` に `TOKENPLAN_API_KEY`（provider: `tencent-tokenplan`、別名: `tokenplan`、`tencent-lkeap`。Anthropic Messages エンドポイント） |
| **OpenCode Zen** | `~/.hermes/.env` に `OPENCODE_ZEN_API_KEY`（provider: `opencode-zen`） |
| **CommandCode** | `~/.hermes/.env` に `COMMANDCODE_API_KEY`（provider: `commandcode`、別名: `commandcode-chat`。Claude 系モデルは `commandcode-anthropic`、別名: `commandcode-claude`）。GOAT / Pro / Max / Provider の各プランで使えます（1 ドルの Go プランは API アクセスが無いため使えません）。 |
| **OpenCode Go** | `~/.hermes/.env` に `OPENCODE_GO_API_KEY`（provider: `opencode-go`） |
| **OpenCode Free** | キー不要 — API キーもアカウントも要りません（provider: `opencode-free`、別名: `free`、`opencode_free`）。`hermes model` か `/model free` で選びます。リクエストは匿名で送られます。モデル一覧は OpenCode の最新カタログから自動で更新されるので、入れ替わる無料キャンペーンのモデルも Hermes を更新せずに現れ（掲載が終われば消え）ます |
| **DeepSeek** | `~/.hermes/.env` に `DEEPSEEK_API_KEY`（provider: `deepseek`） |
| **Hugging Face** | `~/.hermes/.env` に `HF_TOKEN`（provider: `huggingface`、別名: `hf`） |
| **Google / Gemini** | `~/.hermes/.env` に `GOOGLE_API_KEY`（または `GEMINI_API_KEY`）（provider: `gemini`） |
| **Google Vertex AI** | `hermes model` → 「Google Vertex AI」（provider: `vertex`。サービスアカウント JSON か ADC を使った OAuth2、課金は GCP 側） |
| **OpenAI API（直接）** | `~/.hermes/.env` に `OPENAI_API_KEY`（provider: `openai-api`、任意で `OPENAI_BASE_URL`） |
| **Azure AI Foundry** | `hermes model` → 「Azure AI Foundry」（provider: `azure-foundry`。Azure OpenAI / Foundry のエンドポイントとキーを使います） |
| **AWS Bedrock** | `hermes model` → 「AWS Bedrock」（provider: `bedrock`。boto3 経由の標準的な AWS 認証情報チェーン） |
| **NVIDIA Build** | `~/.hermes/.env` に `NVIDIA_API_KEY`（provider: `nvidia`。build.nvidia.com 上の NIM ホストモデル） |
| **Ollama Cloud** | `hermes model` → 「Ollama Cloud」（provider: `ollama-cloud`。クラウドでホストされる Ollama API） |
| **Qwen OAuth** | `hermes model` → 「Qwen OAuth」（provider: `qwen-oauth`。ブラウザでの PKCE ログイン） |
| **MiniMax OAuth** | `hermes model` → 「MiniMax (OAuth)」（provider: `minimax-oauth`。ブラウザでの PKCE ログイン） |
| **StepFun** | `~/.hermes/.env` に `STEPFUN_API_KEY`（provider: `stepfun`） |
| **LM Studio** | `hermes model` → 「LM Studio」（provider: `lmstudio`、任意で `LM_API_KEY`） |
| **カスタムエンドポイント** | `hermes model` → 「Custom endpoint」を選ぶ（`config.yaml` に保存されます） |

OpenCode 系の 3 プロバイダはいずれも、会話ごとに変わる不透明な `x-opencode-session` ヘッダをすべてのリクエストに付けて送ります（全トランスポートのメインのやり取りに加えて、圧縮やタイトル生成といった補助的な呼び出しにも付きます）。OpenCode はこれを使って 1 つの会話を同じバックエンドに固定し、プロンプトキャッシュを温かいまま保ちます。値は Hermes のセッション ID から導出したもので、個人情報は含みません。

公式の API キーを使う経路については、[Google Gemini ガイド](/hermes/docs/guides/google-gemini/)を参照してください。

:::tip model キーの別名
`model:` の設定セクションでは、モデル ID のキー名として `default:` と `model:` のどちらでも使えます。`model: { default: my-model }` と `model: { model: my-model }` は同じ意味です。
:::

### Nous Portal {#nous-portal}

[Nous Portal](https://portal.nousresearch.com) は Nous Research が提供する統合サブスクリプションのゲートウェイで、**Hermes Agent を動かす方法としておすすめ**です。OAuth で 1 回ログインすれば、300 以上のフロンティア級エージェントモデル（Claude、GPT、Gemini、DeepSeek、Qwen、Kimi、GLM、MiniMax、Grok、…）と [Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/)（ウェブ検索、画像生成、TTS、ブラウザ自動化）が使えます。料金はプロバイダごとに別のアカウントを持つのではなく、Nous のサブスクリプションにまとめて請求されます。

```bash
hermes setup --portal     # fresh install — OAuth + provider + gateway in one command
hermes model              # existing install — pick "Nous Portal" from the list
hermes portal info        # inspect login + routing at any time
```

まだサブスクリプションが無い場合は [portal.nousresearch.com/manage-subscription](https://portal.nousresearch.com/manage-subscription) から契約できます。

**詳しくは:** 専用の [Nous Portal 連携ページ](/hermes/docs/integrations/nous-portal/)（サブスクリプションに含まれるもの、モデルカタログ、トラブルシューティング）と、手順を追った [Nous Portal で Hermes Agent を動かすガイド](/hermes/docs/guides/run-hermes-with-nous-portal/)を参照してください。

**クライアントの識別。** Hermes Agent から Portal へ送るリクエストにはすべて `client=hermes-client-v<version>` のタグが付き（例: `client=hermes-client-v0.13.0`）、インストール済みのリリースに自動で合わせられます。これは Portal を通る全経路（メインのチャットループ、補助的な呼び出し、圧縮の要約、ウェブ抽出）で送られ、Portal 側のテレメトリが Hermes からのトラフィックを他のクライアントと区別できるようにします。設定は不要で、`hermes update` すればタグも自動で更新されます。

**JWT 認証（自動）。** Hermes は Portal へのリクエストに、スコープ付きの `inference:invoke` JWT を優先して使い、従来の不透明なセッションキー経路はフォールバックとして残しています。設定は不要で、認証情報は OAuth フローが管理し、意識せずローテーションされます。失効したリフレッシュトークンは隔離され、再送のループに陥らないようになっています。

:::info Codex についての注記
OpenAI Codex プロバイダはデバイスコードで認証します（URL を開いてコードを入力する方式です）。Hermes は得られた認証情報を自前の認証ストア `~/.hermes/auth.json` に保存し、既存の Codex CLI の認証情報が `~/.codex/auth.json` にあればそれを取り込めます。Codex CLI のインストールは不要です。

トークンの更新が回復不能なエラー（HTTP 4xx、`invalid_grant`、権限の失効など）で失敗した場合、Hermes はそのリフレッシュトークンを無効と判断して再送をやめるので、同じ認証エラーが延々と出ることはありません。次のリクエストでは、代わりに再認証を促すメッセージが出ます。`hermes auth add openai-codex`（または `hermes model` → **ChatGPT or Codex Subscription**）を実行してデバイスコードのログインをやり直してください。隔離は次に交換が成功した時点で解除されます。
:::

:::warning
Nous Portal や Codex、カスタムエンドポイントを使っている場合でも、一部のツール（画像認識、ウェブ要約、MoA）は別枠の「補助」モデルを使います。既定（`auxiliary.*.provider: "auto"`）では、Hermes はこれらのタスクを**メインのチャットモデル** — `hermes model` で選んだのと同じモデル — に流します。タスクごとに個別に上書きして、より安価で高速なモデル（たとえば OpenRouter 上の Gemini Flash）へ振り分けることもできます。[補助モデル](/hermes/docs/user-guide/configuration/#auxiliary-models)を参照してください。
:::

:::tip Nous Tool Gateway
有料の Nous Portal 契約者は **[Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/)** も使えます。ウェブ検索、画像生成、TTS、ブラウザ自動化がサブスクリプション経由で通り、追加の API キーは要りません。新規インストールなら `hermes setup --portal` の 1 コマンドでログイン・Nous のプロバイダ設定・ゲートウェイの有効化まで済みます。すでに使っている場合は `hermes model` から、あるいはツール単位で `hermes tools` から有効にできます。ルーティングの状況は `hermes portal info` でいつでも確認できます。
:::

### モデル管理の 2 つのコマンド {#two-commands-for-model-management}

Hermes には目的の違う **2 つ**のモデル関連コマンドがあります。

| コマンド | 実行する場所 | できること |
|---------|-------------|--------------|
| **`hermes model`** | 端末（セッションの外） | 設定ウィザード一式 — プロバイダの追加、OAuth の実行、API キーの入力、エンドポイントの設定 |
| **`/model`** | Hermes のチャットセッション内 | **すでに設定済み**のプロバイダとモデルの間をすばやく切り替える |

まだ設定していないプロバイダに切り替えようとしている場合（たとえば OpenRouter だけを設定した状態で Anthropic を使いたいとき）は、`/model` ではなく `hermes model` が必要です。いったんセッションを抜け（`Ctrl+C` か `/quit`）、`hermes model` を実行してプロバイダの設定を済ませてから、新しいセッションを始めてください。

### サブスクリプションのプラン: 契約で何が支払われるのか {#subscription-plans-what-your-plan-pays-for}

いくつかのプロバイダでは、API キーの代わりに**個人向けサブスクリプション**（Claude Max、ChatGPT、SuperGrok / X Premium+、…）で Hermes にサインインできます。その契約が実際に何を支払い、何を支払わないのかはプロバイダごとに違い、課金の想定外が生まれるいちばんの原因になっています。下の表は要点だけをまとめたもので、詳細は各プロバイダの節にあります。

> *現時点で文書化されていません* と書かれたセルは、文字どおりの意味です。Hermes のドキュメントがまだその挙動を明記していない、ということです。決めつけずに、プロバイダの課金ダッシュボードを確認し、未解決の疑問として扱ってください。

| プラン / 経路 | Hermes で使えるか | 消費されるもの | 消費されないもの | よくある想定外 |
|---|---|---|---|---|
| **Anthropic — Claude Max + OAuth** | ✅ 使えます — `hermes model` → Anthropic の OAuth。Max **かつ**追加利用クレジットの購入が必要です | Max プランの上に積んだ**追加 / 超過分のクレジット** | **Max プランの基本枠**（既定で Claude Code に含まれる利用分） | 含まれているはずの Max の枠が手つかずのまま、Hermes の利用がすべて「追加利用」として請求されます |
| **Anthropic — Claude Pro** | ❌ 使えません — Pro の契約者は OAuth の経路を使えません | 何も消費しません（経路が使えないため） | Pro のサブスクリプション | 動きそうに見えて動きません。代わりに `ANTHROPIC_API_KEY` を使ってください（トークン従量課金で、Claude のサブスクリプションとは無関係です） |
| **OpenAI Codex — ChatGPT プランの OAuth** | ✅ 使えます — `hermes model` → **ChatGPT or Codex Subscription**（ChatGPT のデバイスコードによる OAuth ログイン。Codex のモデルを使います） | *現時点で文書化されていません* | *現時点で文書化されていません* | ドキュメントが扱っているのは認証とトークン更新だけで、プランの利用枠がどう計算されるかはまだ書かれていません |
| **xAI — SuperGrok / X Premium+ の OAuth** | ✅ 使えます — ブラウザでの OAuth。API キーは不要です | **サブスクリプションの利用枠**（X Search については明示されています。OAuth が API キーより優先され、「API の支出ではなくサブスクリプションの枠を使う」と書かれています）。それ以外の推論の枠の扱いは *現時点で文書化されていません* | OAuth の認証情報が設定されて優先される場合、`XAI_API_KEY` によるトークン従量課金の支出 | ログインに成功したのに `HTTP 403` が返る — xAI が OAuth の API アクセスを特定の SuperGrok ティアに限定しているためで、アプリ内の契約が有効でも起こります |
| **Google — Gemini の個人向けプラン（Google AI Pro / Ultra）** | ❌ 文書化された経路はありません — `gemini` プロバイダは API キー専用です（`GOOGLE_API_KEY` / `GEMINI_API_KEY`）。Vertex AI は GCP 側の課金を使います | **API キーの枠**（無料枠、または課金を有効にした Google Cloud プロジェクト） — *個人向けプランの消費については現時点で文書化されていません* | *現時点で文書化されていません* | Hermes は 1 回のユーザー入力に対して複数回モデルを呼ぶことがあるため、無料枠のキーはエージェントを数ターン動かしただけで尽きることがあります |

**Anthropic。** OAuth の経路は Anthropic アカウントに対して Claude Code として通り、**追加利用クレジットを購入済みの Claude Max プランでのみ動きます**。Max の基本枠が Hermes に使われることはなく、上乗せした追加 / 超過分のクレジットだけが減ります。Claude Pro の契約者はこの経路を使えません。代わりに使えるのは `ANTHROPIC_API_KEY` で、そのキーが属する組織に対して標準の API 料金でトークン従量課金されます。下の [Anthropic（ネイティブ）](#anthropic-native)を参照してください。

**OpenAI Codex。** Hermes は ChatGPT のデバイスコード OAuth で認証し、認証情報を `~/.hermes/auth.json` に保存します。既存の Codex CLI の認証情報が `~/.codex/auth.json` にあれば取り込めます。どの ChatGPT プランが対象になるのか、Hermes の利用がプランの Codex の上限にどう計上されるのかは、**現時点で文書化されていません**。[Nous Portal](#nous-portal) の下にある Codex の注記が扱っているのは、認証とトークン更新の挙動だけです。

**xAI（SuperGrok / X Premium+）。** ブラウザでの OAuth は、有効な SuperGrok の契約か、連携した X アカウントの X Premium+ の契約のどちらかで動きます。同じベアラートークンは xAI へ直接つなぐツール（TTS、画像生成、動画生成、文字起こし、X Search）でも再利用されます。ログインに成功したのに推論が `HTTP 403` を返す場合、それはトークンが古いのではなく xAI 側のティア / 権限の制限です。回避策は `XAI_API_KEY` に切り替えることです。下の [xAI（Grok）](#xai-grok--responses-api--prompt-caching)と [xAI Grok OAuth ガイド](/hermes/docs/guides/xai-grok-oauth/)を参照してください。

**Google Gemini。** いまのところ、個人向けの Gemini サブスクリプションで Hermes にサインインする方法はありません。`gemini` プロバイダは API キーを取り、[Google Vertex AI](#google-vertex-ai) は GCP プロジェクトに課金されます。エージェント用途では課金を有効にした Google Cloud プロジェクトをおすすめします。無料枠は長く走るエージェントのセッションには小さすぎます。[Google Gemini ガイド](/hermes/docs/guides/google-gemini/)を参照してください。

:::tip 5 つの契約より 1 つの契約
プロバイダごとのプランの細かい違いを追いかけたくないなら、[Nous Portal](#nous-portal) なら 1 回の OAuth ログインと 1 つの契約で 300 以上のモデルが使えます。
:::

### Anthropic（ネイティブ） {#anthropic-native}

Claude のモデルを Anthropic API 経由で直接使います。OpenRouter を挟む必要はありません。3 つの認証方法に対応しています。

:::caution Claude Max の「追加利用」クレジットが必要です
`hermes model` → Anthropic の OAuth（または `hermes auth add anthropic --type oauth`）で認証すると、Hermes は Anthropic アカウントに対して Claude Code として通ります。**これは Claude Max プランに加入していて、かつ追加利用クレジットを購入している場合にだけ動きます。** Max プランの基本枠（既定で Claude Code に含まれる利用分）は Hermes には使われず、上乗せした追加 / 超過分のクレジットだけが減ります。Claude Pro の契約者はこの経路を使えません。

Max と追加クレジットが無い場合は、代わりに `ANTHROPIC_API_KEY` を使ってください。リクエストはそのキーが属する組織にトークン従量課金されます（標準の API 料金で、Claude のサブスクリプションとは無関係です）。
:::

```bash
# With an API key (pay-per-token)
export ANTHROPIC_API_KEY=***
hermes chat --provider anthropic --model claude-sonnet-4-6

# Preferred: authenticate through `hermes model`
# Hermes will use Claude Code's credential store directly when available
hermes model

# Manual override with a setup-token (fallback / legacy)
export ANTHROPIC_TOKEN=***  # setup-token or manual OAuth token
hermes chat --provider anthropic

# Auto-detect Claude Code credentials (if you already use Claude Code)
hermes chat --provider anthropic  # reads Claude Code credential files automatically
```

`hermes model` で Anthropic の OAuth を選ぶと、Hermes はトークンを `~/.hermes/.env` にコピーするのではなく、Claude Code 自身の認証情報ストアを優先して使います。こうすることで、更新可能な Claude の認証情報が更新可能なまま保たれます。

恒久的に設定する場合は次のようにします。
```yaml
model:
  provider: "anthropic"
  default: "claude-sonnet-4-6"
```

:::tip 別名
`--provider claude` と `--provider claude-code` も `--provider anthropic` の短縮形として使えます。
:::

### GitHub Copilot {#github-copilot}

Hermes は GitHub Copilot を第一級のプロバイダとして扱い、2 つのモードを用意しています。

**`copilot` — Copilot API に直接つなぐ方式**（おすすめ）。GitHub Copilot の契約を使って、Copilot API 経由で GPT-5.x、Claude、Gemini などのモデルにアクセスします。

```bash
hermes chat --provider copilot --model gpt-5.4
```

**認証の選択肢**（この順に確認されます）:

1. `COPILOT_GITHUB_TOKEN` 環境変数
2. `GH_TOKEN` 環境変数
3. `GITHUB_TOKEN` 環境変数
4. `gh auth token` の CLI へのフォールバック

トークンが見つからない場合、`hermes model` が **OAuth デバイスコードログイン**を案内します。Copilot CLI や opencode と同じフローです。

:::warning トークンの種類
Copilot API は従来型の Personal Access Token（`ghp_*`）に**対応していません**。使えるトークンの種類は次のとおりです。

| 種類 | 接頭辞 | 取得方法 |
|------|--------|------------|
| OAuth トークン | `gho_` | `hermes model` → GitHub Copilot → Login with GitHub |
| Fine-grained PAT | `github_pat_` | GitHub Settings → Developer settings → Fine-grained tokens（**Copilot Requests** の権限が必要） |
| GitHub App のトークン | `ghu_` | GitHub App のインストール経由 |

`gh auth token` が `ghp_*` のトークンを返す場合は、代わりに `hermes model` から OAuth で認証してください。
:::

:::info Hermes における Copilot 認証の挙動
Hermes は対応するトークン（`gho_*`、`github_pat_*`、`ghu_*`）を `api.githubcopilot.com` へ直接送り、Copilot 固有のヘッダ（`Editor-Version`、`Copilot-Integration-Id`、`Openai-Intent`、`x-initiator`）を付けます。

HTTP 401 が返ったとき、Hermes はフォールバックの前に一度だけ認証情報の復旧を試みます。

1. 通常の優先順位のチェーン（`COPILOT_GITHUB_TOKEN` → `GH_TOKEN` → `GITHUB_TOKEN` → `gh auth token`）でトークンを取り直す
2. 更新したヘッダで共有の OpenAI クライアントを組み直す
3. リクエストを 1 回だけ再送する

古いコミュニティ製のプロキシには `api.github.com/copilot_internal/v2/token` の交換フローを使うものがあります。このエンドポイントは一部のアカウント種別では使えないことがあります（404 が返ります）。そのため Hermes はトークンを直接使う認証を主経路に据え、堅牢性は実行時の認証情報の更新と再送で担保しています。
:::

**API のルーティング**: GPT-5 以降のモデル（`gpt-5-mini` を除く）は自動的に Responses API を使います。それ以外のモデル（GPT-4o、Claude、Gemini など）は Chat Completions を使います。モデルは Copilot の最新カタログから自動で検出されます。

**`copilot-acp` — Copilot ACP のエージェントバックエンド**。ローカルの Copilot CLI をサブプロセスとして起動します。

```bash
hermes chat --provider copilot-acp --model copilot-acp
# Requires the GitHub Copilot CLI in PATH and an existing `copilot login` session
```

**恒久的な設定:**
```yaml
model:
  provider: "copilot"
  default: "gpt-5.4"
```

| 環境変数 | 説明 |
|---------------------|-------------|
| `COPILOT_GITHUB_TOKEN` | Copilot API 用の GitHub トークン（最優先） |
| `HERMES_COPILOT_ACP_COMMAND` | Copilot CLI のバイナリのパスを上書きします（既定: `copilot`） |
| `HERMES_COPILOT_ACP_ARGS` | ACP の引数を上書きします（既定: `--acp --stdio`） |

### 第一級の API キープロバイダ {#first-class-api-key-providers}

これらのプロバイダは専用のプロバイダ ID を持ち、組み込みで対応しています。API キーを設定して `--provider` で選んでください。

```bash
# Fireworks AI
hermes chat --provider fireworks --model accounts/fireworks/models/kimi-k2p6
# Requires: FIREWORKS_API_KEY in ~/.hermes/.env

# NovitaAI Model API
hermes chat --provider novita --model moonshotai/kimi-k2.5
# Requires: NOVITA_API_KEY in ~/.hermes/.env

# Ramp Router (model IDs come from your account's live catalog)
hermes chat --provider router --model gpt-5.4-mini
# Requires: RAMP_ROUTER_API_KEY in ~/.hermes/.env

# z.ai / ZhipuAI GLM
hermes chat --provider zai --model glm-5
# Requires: GLM_API_KEY in ~/.hermes/.env

# Kimi / Moonshot AI (international: api.moonshot.ai)
hermes chat --provider kimi-coding --model kimi-for-coding
# Requires: KIMI_API_KEY in ~/.hermes/.env

# Kimi / Moonshot AI (China: api.moonshot.cn)
hermes chat --provider kimi-coding-cn --model kimi-k2.5
# Requires: KIMI_CN_API_KEY in ~/.hermes/.env

# MiniMax (global endpoint)
hermes chat --provider minimax --model MiniMax-M2.7
# Requires: MINIMAX_API_KEY in ~/.hermes/.env

# MiniMax (China endpoint)
hermes chat --provider minimax-cn --model MiniMax-M2.7
# Requires: MINIMAX_CN_API_KEY in ~/.hermes/.env

# Qwen Cloud / DashScope (Qwen models)
hermes chat --provider alibaba --model qwen3.5-plus
# Requires: DASHSCOPE_API_KEY in ~/.hermes/.env

# Xiaomi MiMo
hermes chat --provider xiaomi --model mimo-v2-pro
# Requires: XIAOMI_API_KEY in ~/.hermes/.env

# Tencent TokenHub (Hy4 preview)
hermes chat --provider tencent-tokenhub --model hy4-preview
# Requires: TOKENHUB_API_KEY in ~/.hermes/.env

# Tencent TokenPlan (Hy4 preview via Anthropic Messages endpoint)
hermes chat --provider tencent-tokenplan --model hy4-preview
# Requires: TOKENPLAN_API_KEY in ~/.hermes/.env

# Arcee AI (Trinity models)
hermes chat --provider arcee --model trinity-large-thinking
# Requires: ARCEEAI_API_KEY in ~/.hermes/.env

# Meta Model API (Muse Spark family)
hermes chat --provider meta-ai --model muse-spark-1.2
# Requires: MODEL_API_KEY in ~/.hermes/.env

# GMI Cloud
# Use the exact model ID returned by GMI's /v1/models endpoint.
hermes chat --provider gmi --model zai-org/GLM-5.1-FP8
# Requires: GMI_API_KEY in ~/.hermes/.env

# Nebius Token Factory
hermes chat --provider nebius --model deepseek-ai/DeepSeek-V4-Pro
# Requires: NEBIUS_API_KEY in ~/.hermes/.env
```

Fireworks は `accounts/fireworks/models/kimi-k2p6` のような、スラッシュ区切りのネイティブなカタログ ID を使います。`hermes model` を実行して **Fireworks AI** を選び、最新のカタログから選ぶか、別の Fireworks のモデル ID を入力してください。既定のエンドポイントは `https://api.fireworks.ai/inference/v1` です。別のエンドポイントを使いたい場合は、`.env` ではなく `config.yaml` の `model.base_url` で設定します。

`config.yaml` でプロバイダを恒久的に設定することもできます。
```yaml
model:
  provider: "gmi"
  default: "zai-org/GLM-5.1-FP8"
```

ベース URL は `NOVITA_BASE_URL`、`GLM_BASE_URL`、`KIMI_BASE_URL`、`MINIMAX_BASE_URL`、`MINIMAX_CN_BASE_URL`、`DASHSCOPE_BASE_URL`、`XIAOMI_BASE_URL`、`GMI_BASE_URL`、`META_BASE_URL`、`TOKENHUB_BASE_URL` の各環境変数で上書きできます。

:::note Meta のコントリビュータ枠
`muse-spark-1.2-contributor` と `muse-spark-1.3-contributor` は Meta のコントリビュータ枠です。Meta が入力したプロンプトと出力を学習に使う可能性があるため、どちらかを使う前に[対話的なモデル選択で確認を求めます](/hermes/docs/user-guide/configuring-models/)。現在の料金とレート制限は [Meta Model API の料金とレート制限](https://dev.meta.ai/docs/pricing-rate-limits/)を参照してください。秘匿性のある作業には、学習に使われない通常の `muse-spark-1.2` / `muse-spark-1.3` を使ってください。
:::

:::note Z.AI のエンドポイント自動検出
Z.AI / GLM プロバイダを使うと、Hermes は複数のエンドポイント（グローバル、中国、コーディング向けの各種）を自動で試し、API キーを受け付けるものを見つけます。`GLM_BASE_URL` を手で設定する必要はありません。動くエンドポイントが自動で検出され、キャッシュされます。
:::

### xAI（Grok）— Responses API + プロンプトキャッシュ {#xai-grok-responses-api-prompt-caching}

xAI は Responses API（`codex_responses` トランスポート）経由でつながっており、Grok 4 系のモデルでは推論が自動で有効になります。`reasoning_effort` パラメータは不要で、サーバー側が既定で推論します。`~/.hermes/.env` に `XAI_API_KEY` を設定して `hermes model` で xAI を選ぶか、`/model grok-4-fast-reasoning` のように `grok` を近道として指定してください。

SuperGrok と X Premium+ の契約者は、API キーの代わりにブラウザでの OAuth でサインインできます。`hermes model` で **xAI Grok OAuth (SuperGrok / Premium+)** を選ぶか、`hermes auth add xai-oauth` を実行してください。同じ OAuth のベアラートークンは、xAI へ直接つなぐツール（TTS、画像生成、動画生成、文字起こし）でも自動的に再利用されます。フロー全体は [xAI Grok OAuth ガイド](/hermes/docs/guides/xai-grok-oauth/)を参照してください。Hermes をリモートのホストで動かしている場合は、必要になる `ssh -L` のトンネルについて [SSH 越しの OAuth / リモートホスト](/hermes/docs/guides/oauth-over-ssh/)も参照してください。

xAI をプロバイダとして使っているとき（ベース URL に `x.ai` を含む場合）、Hermes は毎回のリクエストに `x-grok-conv-id` ヘッダを付けてプロンプトキャッシュを自動で有効にします。これにより、1 つの会話セッション内のリクエストが同じサーバーへ振り分けられ、xAI 側の基盤がキャッシュ済みのシステムプロンプトや会話履歴を再利用できます。

設定は不要です。xAI のエンドポイントが検出され、セッション ID が使える状態であればキャッシュは自動的に働きます。これによって、複数ターンの会話の待ち時間とコストが下がります。

xAI は専用の TTS エンドポイント（`/v1/tts`）も提供しています。`hermes tools` → Voice & TTS で **xAI TTS** を選ぶか、設定については [Voice & TTS](/hermes/docs/user-guide/features/tts/#text-to-speech) のページを参照してください。

**廃止される xAI モデルの移行（2026 年 5 月 15 日）:** xAI は `grok-4*`、`grok-3`、`grok-code-fast-1`、`grok-imagine-image-pro` を 2026-05-15 に廃止します。`hermes doctor` と `hermes chat` の起動時のどちらでも、廃止される参照を指したままの設定を検出し、推奨される置き換え先を表示します。設定を一度に書き換えるには `hermes migrate xai` を使ってください。既定はドライランで、`--apply` を付けると変更が書き込まれます（タイムスタンプ付きの `config.yaml.bak-pre-migrate-xai-*` のバックアップが自動で作られます）。

```bash
hermes migrate xai          # preview replacements
hermes migrate xai --apply  # rewrite ~/.hermes/config.yaml in place
```

**xAI のウェブ検索バックエンド。** [ウェブ検索](/hermes/docs/user-guide/features/web-search/)のツールセットを有効にしているとき、`web.backend: xai` にすると、同じ `XAI_API_KEY` / OAuth の認証情報を使って xAI のホスト型検索エンドポイントへ検索が流れます。xAI をすでにプロバイダとして設定していれば、追加の設定は要りません。

### NovitaAI {#novitaai}

[NovitaAI](https://novita.ai) は、開発者とエージェントのための AI ネイティブなクラウドです。3 つの製品ラインがあり、200 以上のモデルを扱う Model API、AI エージェントを組み立てて動かす Agent Sandbox、スケールする計算資源を提供する GPU Cloud が、1 つのプラットフォームから使えます。

```bash
# Use any available model
hermes chat --provider novita --model moonshotai/kimi-k2.5
# Requires: NOVITA_API_KEY in ~/.hermes/.env

# Short alias
hermes chat --provider novita-ai --model deepseek/deepseek-v3-0324
```

`config.yaml` で恒久的に設定することもできます。
```yaml
model:
  provider: "novita"
  default: "moonshotai/kimi-k2.5"
  base_url: "https://api.novita.ai/openai/v1"
```

API キーは [novita.ai/settings/key-management](https://novita.ai/settings/key-management) で取得できます。ベース URL は `NOVITA_BASE_URL` で上書きできます。

### Ollama Cloud — マネージドな Ollama モデル、OAuth + API キー {#ollama-cloud-managed-ollama-models-oauth-api-key}

[Ollama Cloud](https://ollama.com/cloud) は、ローカルの Ollama と同じオープンウェイトのカタログを、GPU を用意せずに使えるようにしたものです。`hermes model` で **Ollama Cloud** を選び、[ollama.com/settings/keys](https://ollama.com/settings/keys) の API キーを貼り付ければ、使えるモデルは Hermes が自動で見つけてくれます。

```bash
hermes model
# → pick "Ollama Cloud"
# → paste your OLLAMA_API_KEY
# → select from discovered models (gpt-oss:120b, glm-4.6:cloud, qwen3-coder:480b-cloud, etc.)
```

`config.yaml` に直接書く場合は次のとおりです。
```yaml
model:
  provider: "ollama-cloud"
  default: "gpt-oss:120b"
```

モデルのカタログは `ollama.com/v1/models` から動的に取得され、1 時間キャッシュされます。`model:tag` の記法（例: `qwen3-coder:480b-cloud`）は正規化を通しても保たれます。ハイフンに置き換えないでください。

:::tip Ollama Cloud とローカルの Ollama
どちらも同じ OpenAI 互換 API を話します。クラウド版は第一級のプロバイダで（`--provider ollama-cloud`、`OLLAMA_API_KEY`）、ローカルの Ollama はカスタムエンドポイントの流れで使います（ベース URL は `http://localhost:11434/v1`、キーは不要）。手元で動かせない大きなモデルにはクラウドを、プライバシー重視やオフラインの作業にはローカルを使ってください。
:::

### AWS Bedrock {#aws-bedrock}

Anthropic Claude、Amazon Nova、DeepSeek v3.2、Meta Llama 4 などのモデルを AWS Bedrock 経由で使えます。AWS SDK（`boto3`）の認証情報チェーンを使うため、API キーは不要で、標準的な AWS の認証だけで済みます。

```bash
# Simplest — named profile in ~/.aws/credentials
hermes chat --provider bedrock --model us.anthropic.claude-sonnet-4-6

# Or with explicit env vars
AWS_PROFILE=myprofile AWS_REGION=us-east-1 hermes chat --provider bedrock --model us.anthropic.claude-sonnet-4-6
```

`config.yaml` で恒久的に設定する場合は次のとおりです。
```yaml
model:
  provider: "bedrock"
  default: "us.anthropic.claude-sonnet-4-6"
bedrock:
  region: "us-east-1"          # or set AWS_REGION
  # profile: "myprofile"       # or set AWS_PROFILE
  # discovery: true            # auto-discover region from IAM
  # guardrail:                 # optional Bedrock Guardrails
  #   guardrail_identifier: "your-guardrail-id"
  #   guardrail_version: "DRAFT"
```

認証には標準の boto3 のチェーンを使います。明示的な `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`、`~/.aws/credentials` の `AWS_PROFILE`、EC2/ECS/Lambda の IAM ロール、IMDS、SSO のいずれかです。AWS CLI ですでに認証済みなら、環境変数は不要です。

Bedrock は内部で **Converse API** を使います。リクエストは Bedrock のモデル非依存の形に変換されるので、同じ設定が Claude、Nova、DeepSeek、Llama のいずれのモデルでも使えます。`BEDROCK_BASE_URL` を設定するのは、既定以外のリージョンのエンドポイントを呼ぶときだけです。

IAM の設定、リージョンの選び方、リージョン横断の推論については、[AWS Bedrock ガイド](/hermes/docs/guides/aws-bedrock/)の手順を参照してください。

### Google Vertex AI {#google-vertex-ai}

Google Cloud Vertex AI 上の Gemini モデルを、Vertex の OpenAI 互換エンドポイント経由で使います。認証は **OAuth2** で、サービスアカウントの JSON か Application Default Credentials（ADC）から発行される短命（1 時間ほど）のアクセストークンを使います。**静的な API キーはありません**。トークンの発行と自動更新は Hermes が行い、セッションの途中で `401` が返った場合も発行し直します。

```bash
# Service account JSON (recommended for servers / gateways)
echo "VERTEX_CREDENTIALS_PATH=/path/to/service-account.json" >> ~/.hermes/.env
# or Application Default Credentials
gcloud auth application-default login

hermes model   # → "Google Vertex AI" → project → region → model
```

`config.yaml` に書く場合は次のとおりです（プロジェクトとリージョンは秘密ではないのでここに置き、認証情報のパスは `.env` に残します）。
```yaml
model:
  provider: "vertex"
  default: "google/gemini-3-flash-preview"   # Vertex requires the google/ prefix
vertex:
  project_id: "my-gcp-project"   # blank → use the project embedded in the credentials
  region: "global"               # required for the Gemini 3.x previews
```

`VERTEX_PROJECT_ID` / `VERTEX_REGION` の環境変数は `config.yaml` の値を上書きします。Hermes は初回利用時に `google-auth` を遅延インストールします。管理されたインストールの修復が必要なら `hermes setup` を実行してください。手順の全体は [Google Vertex AI ガイド](/hermes/docs/guides/google-vertex/)を、静的な API キーを使う AI Studio の経路は [Google Gemini ガイド](/hermes/docs/guides/google-gemini/)を参照してください。

### Qwen Portal（OAuth） {#qwen-portal-oauth}

ブラウザでの OAuth ログインに対応した Alibaba の Qwen Portal です。`hermes model` で **Qwen OAuth (Portal)** を選んでブラウザでサインインすると、Hermes がリフレッシュトークンを保存します。

```bash
hermes model
# → pick "Qwen OAuth (Portal)"
# → browser opens; sign in with your Alibaba account
# → confirm — credentials are saved to ~/.hermes/auth.json

hermes chat   # uses portal.qwen.ai/v1 endpoint
```

`config.yaml` で設定する場合は次のとおりです。
```yaml
model:
  provider: "qwen-oauth"
  default: "qwen3-coder-plus"
```

`HERMES_QWEN_BASE_URL` を設定するのは、ポータルのエンドポイントが移転した場合だけです（既定: `https://portal.qwen.ai/v1`）。

:::tip Qwen OAuth と Qwen Cloud（Alibaba DashScope）
`qwen-oauth` は個人向けの Qwen Portal を OAuth ログインで使うもので、個人利用に向いています。`alibaba` プロバイダは Qwen Cloud（Alibaba DashScope）を `DASHSCOPE_API_KEY` で使うもので、プログラムからの利用や本番のワークロードに向いています。どちらも Qwen 系のモデルにつながりますが、エンドポイントは別です。
:::

### Alibaba Cloud（Coding Plan） {#alibaba-cloud-coding-plan}

Alibaba の **Coding Plan**（標準の DashScope API とは別の料金 SKU）を契約している場合、Hermes はそれを独立した第一級のプロバイダ `alibaba-coding-plan` として提供します。エンドポイントは `https://coding-intl.dashscope.aliyuncs.com/v1` です。通常の `alibaba` プロバイダと同じく OpenAI 互換ですが、ベース URL と課金の面が異なります。

```yaml
model:
  provider: alibaba_coding     # alias for alibaba-coding-plan
  model: qwen3-coder-plus
```

CLI から使う場合は次のとおりです。

```bash
hermes chat --provider alibaba_coding --model qwen3-coder-plus
```

`alibaba_coding` は `alibaba` の設定で使っているのと同じ `DASHSCOPE_API_KEY` を使うので、別のキーは要りません。振り分け先が違うだけです。このプロバイダが登録される前は、`config.yaml` に `provider: alibaba_coding` と書いたユーザーは黙って OpenRouter のルーティングに落ちていました。

中国本土向けのエンドポイント（`alibaba-coding-plan-cn`、`https://coding.dashscope.aliyuncs.com/v1`）を使うには `ALIBABA_CODING_PLAN_CN_API_KEY` を設定します。CN のプロバイダも `ALIBABA_CODING_PLAN_API_KEY` / `DASHSCOPE_API_KEY` にフォールバックしますが、共有キーだけを設定した状態では `/model` の選択肢に国際版の行しか出ません。CN 用のキーを設定する（または `config.yaml` に `provider: alibaba-coding-plan-cn` と書く）と CN の行が現れます。同じことが `alibaba-token-plan-cn` と `ALIBABA_TOKEN_PLAN_CN_API_KEY` にも当てはまります。

### MiniMax（OAuth） {#minimax-oauth}

MiniMax-M2.7 をブラウザの OAuth ログインで使えます。API キーは不要です。`hermes model` で **MiniMax (OAuth)** を選んでブラウザでサインインすると、Hermes がアクセストークンとリフレッシュトークンを保存します。内部では Anthropic Messages 互換のエンドポイント（`/anthropic`）を使います。

```bash
hermes model
# → pick "MiniMax (OAuth)"
# → browser opens; sign in with your MiniMax account (global or CN region)
# → confirm — credentials are saved to ~/.hermes/auth.json

hermes chat   # uses api.minimax.io/anthropic endpoint
```

`config.yaml` で設定する場合は次のとおりです。
```yaml
model:
  provider: "minimax-oauth"
  default: "MiniMax-M2.7"
```

対応モデルは `MiniMax-M2.7`（メイン）と `MiniMax-M2.7-highspeed`（既定の補助モデルとして組み込まれています）です。OAuth の経路では `MINIMAX_API_KEY` / `MINIMAX_BASE_URL` は無視されます。

:::tip MiniMax の OAuth と API キー
`minimax-oauth` は MiniMax の個人向けポータルを OAuth ログインで使うもので、課金の設定は要りません。`minimax` と `minimax-cn` のプロバイダは `MINIMAX_API_KEY` / `MINIMAX_CN_API_KEY` を使うもので、プログラムからのアクセス向けです。手順の全体は [MiniMax OAuth ガイド](/hermes/docs/guides/minimax-oauth/)を参照してください。
:::

### NVIDIA NIM {#nvidia-nim}

Nemotron をはじめとするオープンソースのモデルを、[build.nvidia.com](https://build.nvidia.com)（無料の API キー）またはローカルの NIM エンドポイント経由で使えます。

```bash
# Cloud (build.nvidia.com)
hermes chat --provider nvidia --model nvidia/nemotron-3-super-120b-a12b
# Requires: NVIDIA_API_KEY in ~/.hermes/.env

# Local NIM endpoint — override base URL
NVIDIA_BASE_URL=http://localhost:8000/v1 hermes chat --provider nvidia --model nvidia/nemotron-3-super-120b-a12b
```

`config.yaml` で恒久的に設定する場合は次のとおりです。
```yaml
model:
  provider: "nvidia"
  default: "nvidia/nemotron-3-super-120b-a12b"
```

:::tip ローカルの NIM
オンプレミスでの運用（DGX Spark、手元の GPU）では `NVIDIA_BASE_URL=http://localhost:8000/v1` を設定します。NIM は build.nvidia.com と同じ OpenAI 互換のチャット補完 API を提供するので、クラウドとローカルの切り替えは環境変数 1 行の変更で済みます。
:::

Hermes は `build.nvidia.com` への全リクエストに NIM の課金オリジンのヘッダを自動で付けます。設定は不要です。これにより、消費が NVIDIA の課金ダッシュボードで正しいオリジンに計上されます。

### GMI Cloud {#gmi-cloud}

オープンなモデルや推論モデルを [GMI Cloud](https://www.gmicloud.ai/) 経由で使えます。OpenAI 互換の API で、認証は API キーです。

```bash
# GMI Cloud
hermes chat --provider gmi --model deepseek-ai/DeepSeek-V3.2
# Requires: GMI_API_KEY in ~/.hermes/.env
```

`config.yaml` で恒久的に設定する場合は次のとおりです。
```yaml
model:
  provider: "gmi"
  default: "deepseek-ai/DeepSeek-V3.2"
```

ベース URL は `GMI_BASE_URL` で上書きできます（既定: `https://api.gmi-serving.com/v1`）。

### Actual Computer {#actual-computer}

自分のハードウェアを private な推論クラスタとして使えるようにするのが [Actual Computer](https://actual.inc) です。提供方式は 2 つあり、どちらも OpenAI 互換です（Hermes は Responses API のトランスポートを使います）。

- **ホスト型リレー** — `https://api.actual.inc`。エンドツーエンドで暗号化され、*自分の*クラスタへ振り分けられます。[actual.inc/user/keys](https://actual.inc/user/keys) の `ac_` で始まる推論キーで認証します。
- **ローカルデーモン** — 端末上の `http://127.0.0.1:8080` で動き、完全にオフラインです。API キーは不要で、Hermes はループバックのベース URL を検出して内部のプレースホルダで自動的に認証します。

```bash
# Hosted relay (ACTUAL_API_KEY in ~/.hermes/.env)
hermes chat --provider actual --model <model-id-from-your-cluster>

# Local daemon (ACTUAL_BASE_URL=http://127.0.0.1:8080 in ~/.hermes/.env, no key)
hermes chat --provider actual --model <installed-model-name>
```

`config.yaml` で恒久的に設定する場合は次のとおりです。
```yaml
model:
  provider: "actual"
  default: "<model-id>"
```

補足:
- モデル ID はクラスタの `GET /v1/models` から得られます。`hermes model` か `curl -s https://api.actual.inc/v1/models -H "Authorization: Bearer $ACTUAL_API_KEY"` で確認できます。
- ホスト名だけの指定は正規化されます。`ACTUAL_BASE_URL=http://127.0.0.1:8080` は自動的に `http://127.0.0.1:8080/v1` になります。
- 推論の effort は Actual が対応する範囲（`none/low/medium/high/max`）に丸められるので、全体設定が `xhigh`/`ultra` でもリクエストが 400 になることはありません。
- 小さなローカルモデルの場合: Hermes の既定のツールセット一式とシステムプロンプトを合わせると 32k のコンテキストを超えることがあり、llama.cpp 系のサーバーでは空のストリームのエラーになります。ツールセットを絞る（`-t file,web`）か、コンテキストを大きくしてモデルを読み込んでください。任意の `actual-setup` スキル（`hermes skills install official/devops/actual-setup`）が設定とトラブルシューティングを詳しく扱っています。
- 別名: `actual-computer`、`actualcomputer`、`aci`。

### StepFun {#stepfun}

Step シリーズのモデルを [StepFun](https://platform.stepfun.com) 経由で使えます。OpenAI 互換の API で、認証は API キーです。

```bash
# StepFun
hermes chat --provider stepfun --model step-3.5-flash
# Requires: STEPFUN_API_KEY in ~/.hermes/.env
```

`config.yaml` で恒久的に設定する場合は次のとおりです。
```yaml
model:
  provider: "stepfun"
  default: "step-3.5-flash"
```

ベース URL は `STEPFUN_BASE_URL` で上書きできます（既定: `https://api.stepfun.com/v1`）。

### Hugging Face Inference Providers {#hugging-face-inference-providers}

[Hugging Face Inference Providers](https://huggingface.co/docs/inference-providers) は、20 以上のオープンモデルを統一された OpenAI 互換のエンドポイント（`router.huggingface.co/v1`）経由で振り分けます。リクエストは最速で使えるバックエンド（Groq、Together、SambaNova など）へ自動で振り分けられ、フェイルオーバーも自動です。

```bash
# Use any available model
hermes chat --provider huggingface --model Qwen/Qwen3.5-397B-A17B
# Requires: HF_TOKEN in ~/.hermes/.env

# Short alias
hermes chat --provider hf --model deepseek-ai/DeepSeek-V3.2
```

`config.yaml` で恒久的に設定する場合は次のとおりです。
```yaml
model:
  provider: "huggingface"
  default: "Qwen/Qwen3.5-397B-A17B"
```

トークンは [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) で取得できます。「Make calls to Inference Providers」の権限を有効にしておいてください。無料枠が含まれています（月 0.10 ドル分のクレジット、プロバイダ料金への上乗せなし）。

モデル名にはルーティングの接尾辞を付けられます。`:fastest`（既定）、`:cheapest`、または特定のバックエンドを指定する `:provider_name` です。

ベース URL は `HF_BASE_URL` で上書きできます。

## カスタム / 自前ホストの LLM プロバイダ {#custom-self-hosted-llm-providers}

Hermes Agent は **OpenAI 互換の API エンドポイントなら何でも**扱えます。サーバーが `/v1/chat/completions` を実装していれば、Hermes をそこへ向けられます。つまり、ローカルのモデル、GPU の推論サーバー、複数プロバイダをまとめるルーター、あるいは任意のサードパーティ API が使えます。

### 基本の設定 {#general-setup}

カスタムエンドポイントの設定方法は 3 つあります。

**対話的な設定（おすすめ）:**
```bash
hermes model
# Select "Custom endpoint (self-hosted / VLLM / etc.)"
# Enter: API base URL, API key, Model name
```

**手動の設定（`config.yaml`）:**
```yaml
# In ~/.hermes/config.yaml
model:
  default: your-model-name
  provider: custom
  base_url: http://localhost:8000/v1
  api_key: your-key-or-leave-empty-for-local
```

:::warning 古い環境変数
`.env` の `LLM_MODEL` は**削除されました**。モデルとエンドポイントの設定は `config.yaml` が唯一の正になります。`OPENAI_BASE_URL` はまだ有効ですが、**`openai-api` プロバイダに限られます**（API キーで直接アクセスする際の OpenAI のエンドポイントを上書きします）。他のプロバイダやカスタムエンドポイントでは、`hermes model` を使うか `config.yaml` の `model.base_url` を直接設定してください。`.env` に古い記述が残っている場合は、次の `hermes setup` か設定の移行のときに自動で消えます。
:::

どちらの方法でも `config.yaml` に保存され、モデル・プロバイダ・ベース URL についてはこれが正になります。

### `/model` でモデルを切り替える {#switching-models-with-model}

:::warning hermes model と /model の違い
**`hermes model`**（チャットセッションの外、端末から実行します）は**プロバイダ設定のウィザード一式**です。新しいプロバイダの追加、OAuth フローの実行、API キーの入力、カスタムエンドポイントの設定に使います。

**`/model`**（動いている Hermes のチャットセッション内で入力します）は、**すでに設定済みのプロバイダとモデルの間を切り替える**ことしかできません。新しいプロバイダの追加も、OAuth の実行も、API キーの入力もできません。プロバイダを 1 つしか設定していない場合（たとえば OpenRouter だけ）、`/model` にはそのプロバイダのモデルしか出ません。

**新しいプロバイダを追加するには:** セッションを抜け（`Ctrl+C` か `/quit`）、`hermes model` を実行して新しいプロバイダを設定し、それから新しいセッションを始めてください。
:::

カスタムエンドポイントを 1 つでも設定すれば、セッションの途中でモデルを切り替えられます。

```
/model custom:qwen-2.5          # Switch to a model on your custom endpoint
/model custom                    # Auto-detect the model from the endpoint
/model openrouter:claude-sonnet-4 # Switch back to a cloud provider
```

**名前付きのカスタムプロバイダ**（後述）を設定している場合は、3 つ組の記法を使います。

```
/model custom:local:qwen-2.5    # Use the "local" custom provider with model qwen-2.5
/model custom:work:llama3       # Use the "work" custom provider with llama3
```

プロバイダを切り替えると、Hermes はベース URL とプロバイダを設定に保存するので、再起動しても切り替えは残ります。カスタムエンドポイントから組み込みのプロバイダへ切り替えたときは、古いベース URL が自動で消えます。

:::tip
`/model custom`（モデル名を付けない形）はエンドポイントの `/models` API を問い合わせ、読み込まれているモデルがちょうど 1 つならそれを自動で選びます。単一のモデルを動かしているローカルのサーバーで便利です。
:::

以下はすべて同じ形の繰り返しです。URL とキーとモデル名を変えるだけです。

---

### Ollama — ローカルのモデルを設定なしで {#ollama-local-models-zero-config}

[Ollama](https://ollama.com/) は、オープンウェイトのモデルをコマンド 1 つでローカルに動かします。向いている用途は、手早いローカルでの試行、プライバシーに配慮したい作業、オフラインでの利用です。OpenAI 互換 API 経由のツール呼び出しにも対応しています。

```bash
# Install and run a model
ollama pull qwen2.5-coder:32b
ollama serve   # Starts on port 11434
```

続けて Hermes を設定します。

```bash
hermes model
# Select "Custom endpoint (self-hosted / VLLM / etc.)"
# Enter URL: http://localhost:11434/v1
# Skip API key (Ollama doesn't need one)
# Enter model name (e.g. qwen2.5-coder:32b)
```

`config.yaml` を直接書く場合は次のとおりです。

```yaml
model:
  default: qwen2.5-coder:32b
  provider: custom
  base_url: http://localhost:11434/v1
  context_length: 64000   # See warning below
```

:::caution Ollama の既定のコンテキスト長はかなり小さい
Ollama は既定ではモデルのコンテキストウィンドウを全部は使いません。VRAM に応じて既定値は次のようになります。

| 使える VRAM | 既定のコンテキスト |
|----------------|----------------|
| 24 GB 未満 | **4,096 トークン** |
| 24〜48 GB | 32,768 トークン |
| 48 GB 以上 | 256,000 トークン |

Hermes Agent がツールを伴うエージェント用途で必要とするコンテキストは、少なくとも **64,000 トークン**です。これより小さいウィンドウは起動時に拒否されます。システムプロンプト、ツールのスキーマ、進行中の会話の状態を保つには、複数ステップの作業を安定して回せるだけの余裕が要るからです。

**大きくする方法**（どれか 1 つを選びます）:

```bash
# Option 1: Set server-wide via environment variable (recommended)
OLLAMA_CONTEXT_LENGTH=64000 ollama serve

# Option 2: For systemd-managed Ollama
sudo systemctl edit ollama.service
# Add: Environment="OLLAMA_CONTEXT_LENGTH=64000"
# Then: sudo systemctl daemon-reload && sudo systemctl restart ollama

# Option 3: Bake it into a custom model (persistent per-model)
echo -e "FROM qwen2.5-coder:32b\nPARAMETER num_ctx 64000" > Modelfile
ollama create qwen2.5-coder-64k -f Modelfile
```

**コンテキスト長は OpenAI 互換 API（`/v1/chat/completions`）からは設定できません。** サーバー側か Modelfile で設定する必要があります。Hermes のようなツールと Ollama をつなぐときに、いちばん混乱の元になる点です。
:::

**コンテキストが正しく設定されたか確認する:**

```bash
ollama ps
# Look at the CONTEXT column — it should show your configured value
```

:::tip
使えるモデルの一覧は `ollama list` で見られます。[Ollama のライブラリ](https://ollama.com/library)にあるモデルは `ollama pull <model>` で取得できます。GPU への割り当ては Ollama が自動で処理するので、たいていの環境では設定は要りません。
:::

---

### vLLM — GPU での高性能な推論 {#vllm-high-performance-gpu-inference}

[vLLM](https://docs.vllm.ai/) は、本番での LLM 提供の定番です。向いている用途は、GPU の性能を出し切るスループット、大きなモデルの提供、連続バッチ処理です。

```bash
pip install vllm
vllm serve meta-llama/Llama-3.1-70B-Instruct \
  --port 8000 \
  --max-model-len 65536 \
  --tensor-parallel-size 2 \
  --enable-auto-tool-choice \
  --tool-call-parser hermes
```

続けて Hermes を設定します。

```bash
hermes model
# Select "Custom endpoint (self-hosted / VLLM / etc.)"
# Enter URL: http://localhost:8000/v1
# Skip API key (or enter one if you configured vLLM with --api-key)
# Enter model name: meta-llama/Llama-3.1-70B-Instruct
```

**コンテキスト長:** vLLM は既定でモデルの `max_position_embeddings` を読みます。それが GPU のメモリを超える場合はエラーになり、`--max-model-len` を小さくするよう促されます。`--max-model-len auto` を使えば、収まる最大値を自動で見つけてくれます。`--gpu-memory-utilization 0.95`（既定は 0.9）にすると、VRAM にもう少しコンテキストを詰め込めます。

**ツール呼び出しには明示的なフラグが必要です:**

| フラグ | 目的 |
|------|---------|
| `--enable-auto-tool-choice` | `tool_choice: "auto"`（Hermes の既定）に必要です |
| `--tool-call-parser <name>` | モデルのツール呼び出し形式に合わせたパーサー |

対応しているパーサーは `hermes`（Qwen 2.5、Hermes 2/3）、`llama3_json`（Llama 3.x）、`mistral`、`deepseek_v3`、`deepseek_v31`、`xlam`、`pythonic` です。これらのフラグが無いとツール呼び出しは動かず、モデルはツール呼び出しをテキストとして出力してしまいます。

**Qwen の推論パーサー:** OpenAI 互換のサーバーが `reasoning`、`reasoning_content`、ストリーミングされる推論の差分といった構造化された推論のメタデータを返す場合、Hermes はそれを保持します。このメタデータは推論・思考の痕跡として扱われ、アシスタントが見せる答えの代わりにはなりません。vLLM で提供する Qwen の推論モデルでは、利用者に見える最終的な応答が `content` に入っていることを確かめてください。`--reasoning-parser qwen3` を使うと `content` が空になる環境では、そのパーサーを無効にするか、`extra_body` 経由で `chat_template_kwargs.enable_thinking: false` のようなサーバーが対応するリクエストオプションを渡してください。

:::tip
vLLM は人が読みやすいサイズ表記に対応しています。`--max-model-len 64k` のように書けます（小文字の k は 1000、大文字の K は 1024 です）。
:::

---

### SGLang — RadixAttention による高速な提供 {#sglang-fast-serving-with-radixattention}

[SGLang](https://github.com/sgl-project/sglang) は vLLM の代わりになる選択肢で、KV キャッシュを再利用する RadixAttention を備えています。向いている用途は、複数ターンの会話（接頭辞キャッシュ）、制約付きデコード、構造化された出力です。

```bash
pip install "sglang[all]"
python -m sglang.launch_server \
  --model meta-llama/Llama-3.1-70B-Instruct \
  --port 30000 \
  --context-length 65536 \
  --tp 2 \
  --tool-call-parser qwen
```

続けて Hermes を設定します。

```bash
hermes model
# Select "Custom endpoint (self-hosted / VLLM / etc.)"
# Enter URL: http://localhost:30000/v1
# Enter model name: meta-llama/Llama-3.1-70B-Instruct
```

**コンテキスト長:** SGLang は既定でモデルの設定から読み取ります。上書きするには `--context-length` を使います。モデルが宣言している最大値を超えたい場合は `SGLANG_ALLOW_OVERWRITE_LONGER_CONTEXT_LEN=1` を設定してください。

**ツール呼び出し:** `--tool-call-parser` に、モデルの系統に合ったパーサーを指定します。`qwen`（Qwen 2.5）、`llama3`、`llama4`、`deepseekv3`、`mistral`、`glm` です。このフラグが無いと、ツール呼び出しはただのテキストとして返ってきます。

:::caution SGLang の既定の出力上限は 128 トークン
応答が途中で切れているようなら、リクエストに `max_tokens` を足すか、サーバー側で `--default-max-tokens` を設定してください。リクエストで指定しない場合、SGLang の既定は 1 回の応答あたり 128 トークンしかありません。
:::

---

### llama.cpp / llama-server — CPU と Metal での推論 {#llamacpp-llama-server-cpu-metal-inference}

[llama.cpp](https://github.com/ggml-org/llama.cpp) は、量子化したモデルを CPU、Apple Silicon（Metal）、コンシューマ向け GPU で動かします。向いている用途は、データセンター級の GPU が無い環境での実行、Mac ユーザー、エッジでの運用です。

```bash
# Build and start llama-server
cmake -B build && cmake --build build --config Release
./build/bin/llama-server \
  --jinja -fa \
  -c 64000 \
  -ngl 99 \
  -m models/qwen2.5-coder-32b-instruct-Q4_K_M.gguf \
  --port 8080 --host 0.0.0.0
```

**コンテキスト長（`-c`）:** 最近のビルドの既定は `0` で、GGUF のメタデータからモデルの学習時のコンテキストを読みます。128k 以上の学習コンテキストを持つモデルでは、KV キャッシュを丸ごと確保しようとしてメモリ不足になることがあります。Hermes 向けには `-c` を明示して、少なくとも 64,000 トークンにしてください。並列スロット（`-np`）を使う場合、コンテキストの総量はスロット間で分割されます。`-c 64000 -np 4` なら 1 スロットあたり 16k しかなく、Hermes が 1 セッションに必要とする最小値を下回ります。

続けて、そこを向くように Hermes を設定します。

```bash
hermes model
# Select "Custom endpoint (self-hosted / VLLM / etc.)"
# Enter URL: http://localhost:8080/v1
# Skip API key (local servers don't need one)
# Enter model name — or leave blank to auto-detect if only one model is loaded
```

これでエンドポイントが `config.yaml` に保存され、セッションをまたいで残ります。

:::caution ツール呼び出しには `--jinja` が必要です
`--jinja` が無いと、llama-server は `tools` パラメータを完全に無視します。モデルは応答テキストに JSON を書いてツールを呼ぼうとしますが、Hermes はそれをツール呼び出しとして認識できず、実際の検索が走る代わりに `{"name": "web_search", ...}` のような生の JSON がメッセージとして表示されます。

ネイティブにツール呼び出しへ対応しているモデル（性能が最も出ます）: Llama 3.x、Qwen 2.5（Coder を含む）、Hermes 2/3、Mistral、DeepSeek、Functionary。それ以外のモデルは汎用のハンドラを使うので、動きはしますが効率は落ちるかもしれません。全リストは [llama.cpp の function calling ドキュメント](https://github.com/ggml-org/llama.cpp/blob/master/docs/function-calling.md)を参照してください。

ツール対応が有効になっているかは `http://localhost:8080/props` を見れば確認できます。`chat_template` のフィールドがあるはずです。
:::

:::tip
GGUF のモデルは [Hugging Face](https://huggingface.co/models?library=gguf) からダウンロードできます。Q4_K_M の量子化が、品質とメモリ使用量のバランスがいちばん良いです。
:::

---

### LM Studio — ローカルのモデルを動かすデスクトップアプリ {#lm-studio-desktop-app-with-local-models}

[LM Studio](https://lmstudio.ai/) は、ローカルのモデルを GUI で動かすデスクトップアプリです。向いているのは、視覚的なインターフェースを好む人、モデルを手早く試したい場合、macOS / Windows / Linux の開発者です。

サーバーは LM Studio アプリから起動する（Developer タブ → Start Server）か、CLI を使います。

```bash
lms server start                        # Starts on port 1234
lms load qwen2.5-coder --context-length 64000
```

続けて Hermes を設定します。

```bash
hermes model
# Select "LM Studio"
# Press Enter to use http://localhost:1234/v1
# Pick one of the discovered models
# If LM Studio server auth is enabled, enter LM_API_KEY when prompted
```

Hermes は、すでに読み込まれている LM Studio のインスタンスのコンテキストをそのまま使います。既定の explicit モードで未読み込みのモデルを使う場合、Hermes 側でコンテキストを設定していなければ `context_length` を送らないので、LM Studio が自分のモデル設定を適用できます。その後 Hermes は、読み込み後に LM Studio が報告したコンテキスト長だけを使います。

LM Studio でコンテキスト長を変えるには次のようにします。

1. モデル選択の横にある歯車のアイコンをクリックします
2. 「Context Length」を、快適に使うには少なくとも 64000 に設定します
3. 変更を反映させるためにモデルを読み込み直します
4. 64000 が手元のマシンに収まらない場合は、より小さくてコンテキストの大きいモデルを検討してください

あるいは CLI を使います: `lms load model-name --context-length 64000`

モデルが収まるかどうかは CLI で見積もれます: `lms load model-name --context-length 64000 --estimate-only`

モデルごとの既定値を恒久的に設定するには、My Models タブ → モデルの歯車アイコン → コンテキストサイズを設定します。
:::

LM Studio の Just-In-Time 読み込み / Auto-Evict を使っていて、通常のチャットのリクエストからモデルの読み込みと解放を LM Studio に任せたい場合は、Hermes の明示的な事前読み込みの手順を飛ばせます。

```bash
hermes config set model.lmstudio_load_mode jit
```

既定の明示的な事前読み込みに戻すには次のようにします。

```bash
hermes config set model.lmstudio_load_mode explicit
```

**ツール呼び出し:** LM Studio 0.3.6 以降で対応しています。ネイティブにツール呼び出しを学習したモデル（Qwen 2.5、Llama 3.x、Mistral、Hermes）は自動で検出され、ツールのバッジ付きで表示されます。それ以外のモデルは汎用のフォールバックを使うため、信頼性は落ちるかもしれません。

---

### WSL2 のネットワーク（Windows ユーザー向け） {#wsl2-networking-windows-users}

Hermes Agent は Unix 環境を必要とするため、Windows ユーザーは WSL2 の中で動かします。モデルのサーバー（Ollama、LM Studio など）が **Windows ホスト側**で動いている場合、ネットワークの隔たりを埋める必要があります。WSL2 は独自のサブネットを持つ仮想ネットワークアダプタを使うので、WSL2 の中の `localhost` は Windows ホストではなく **Linux の VM** を指します。

:::tip どちらも WSL2 の中にあるなら問題ありません
モデルのサーバーも WSL2 の中で動いているなら（vLLM、SGLang、llama-server ではよくある構成です）、同じネットワーク名前空間を共有するので `localhost` はそのまま使えます。この節は飛ばしてください。
:::

#### 方法 1: ミラーモード（おすすめ） {#option-1-mirrored-networking-mode-recommended}

**Windows 11 22H2 以降**で使えるミラーモードは、Windows と WSL2 の間で `localhost` を双方向に通します。いちばん簡単な解決策です。

1. `%USERPROFILE%\.wslconfig`（例: `C:\Users\YourName\.wslconfig`）を作るか編集します。
   ```ini
   [wsl2]
   networkingMode=mirrored
   ```

2. PowerShell から WSL を再起動します。
   ```powershell
   wsl --shutdown
   ```

3. WSL2 の端末を開き直します。これで `localhost` から Windows 側のサービスに届きます。
   ```bash
   curl http://localhost:11434/v1/models   # Ollama on Windows — works
   ```

:::note Hyper-V のファイアウォール
一部の Windows 11 のビルドでは、Hyper-V のファイアウォールがミラーモードの接続を既定でブロックします。ミラーモードを有効にしても `localhost` が通らない場合は、**管理者権限の PowerShell** で次を実行してください。
```powershell
Set-NetFirewallHyperVVMSetting -Name '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}' -DefaultInboundAction Allow
```
:::

#### 方法 2: Windows ホストの IP を使う（Windows 10 / 古いビルド） {#option-2-use-the-windows-host-ip-windows-10-older-builds}

ミラーモードが使えない場合は、WSL2 の中から Windows ホストの IP を調べて、`localhost` の代わりにそれを使います。

```bash
# Get the Windows host IP (the default gateway of WSL2's virtual network)
ip route show | grep -i default | awk '{ print $3 }'
# Example output: 172.29.192.1
```

その IP を Hermes の設定に使います。

```yaml
model:
  default: qwen2.5-coder:32b
  provider: custom
  base_url: http://172.29.192.1:11434/v1   # Windows host IP, not localhost
```

:::tip 動的に取る補助
ホストの IP は WSL2 を再起動すると変わることがあります。シェルで動的に取得できます。
```bash
export WSL_HOST=$(ip route show | grep -i default | awk '{ print $3 }')
echo "Windows host at: $WSL_HOST"
curl http://$WSL_HOST:11434/v1/models   # Test Ollama
```

マシンの mDNS 名を使う手もあります（WSL2 に `libnss-mdns` が必要です）。
```bash
sudo apt install libnss-mdns
curl http://$(hostname).local:11434/v1/models
```
:::

#### サーバーの待ち受けアドレス（NAT モードでは必須） {#server-bind-address-required-for-nat-mode}

**方法 2**（ホストの IP を使う NAT モード）を使う場合、Windows 側のモデルサーバーは `127.0.0.1` の外からの接続を受け付けなければなりません。既定では、たいていのサーバーは localhost しか待ち受けません。NAT モードの WSL2 からの接続は別の仮想サブネットから来るため、拒否されます。ミラーモードなら `localhost` がそのまま対応づくので、既定の `127.0.0.1` の待ち受けで問題ありません。

| サーバー | 既定の待ち受け | 直し方 |
|--------|-------------|------------|
| **Ollama** | `127.0.0.1` | Ollama を起動する前に環境変数 `OLLAMA_HOST=0.0.0.0` を設定します（Windows のシステム設定 → 環境変数、または Ollama のサービスを編集） |
| **LM Studio** | `127.0.0.1` | Developer タブ → Server settings で **「Serve on Network」**を有効にします |
| **llama-server** | `127.0.0.1` | 起動コマンドに `--host 0.0.0.0` を足します |
| **vLLM** | `0.0.0.0` | 既定ですべてのインターフェースを待ち受けます |
| **SGLang** | `127.0.0.1` | 起動コマンドに `--host 0.0.0.0` を足します |

**Windows での Ollama（詳細）:** Ollama は Windows のサービスとして動きます。`OLLAMA_HOST` を設定するには次のようにします。
1. **システムのプロパティ** → **環境変数** を開きます
2. **システム環境変数**として `OLLAMA_HOST` = `0.0.0.0` を追加します
3. Ollama のサービスを再起動します（または再起動します）

#### Windows ファイアウォール {#windows-firewall}

Windows ファイアウォールは、NAT モードでもミラーモードでも WSL2 を別のネットワークとして扱います。上の手順を踏んでも接続できない場合は、モデルサーバーのポートに対するファイアウォールの規則を追加してください。

```powershell
# Run in Admin PowerShell — replace PORT with your server's port
New-NetFirewallRule -DisplayName "Allow WSL2 to Model Server" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 11434
```

よく使うポート: Ollama は `11434`、vLLM は `8000`、SGLang は `30000`、llama-server は `8080`、LM Studio は `1234` です。

#### 手早い確認 {#quick-verification}

WSL2 の中から、モデルサーバーに届くかどうかを確かめます。

```bash
# Replace URL with your server's address and port
curl http://localhost:11434/v1/models          # Mirrored mode
curl http://172.29.192.1:11434/v1/models       # NAT mode (use your actual host IP)
```

モデルの一覧が JSON で返ってくれば大丈夫です。その同じ URL を Hermes の設定の `base_url` に使ってください。

---

### ローカルモデルのトラブルシューティング {#troubleshooting-local-models}

ここで挙げる問題は、Hermes と使う**すべての**ローカル推論サーバーに当てはまります。

#### WSL2 から Windows 上のモデルサーバーへの「Connection refused」 {#connection-refused-from-wsl2-to-a-windows-hosted-model-server}

Hermes を WSL2 の中で、モデルサーバーを Windows ホストで動かしている場合、WSL2 の既定の NAT ネットワークでは `http://localhost:<port>` は通りません。直し方は上の [WSL2 のネットワーク](#wsl2-networking-windows-users)を参照してください。

#### ツール呼び出しが実行されずテキストとして出てくる {#tool-calls-appear-as-text-instead-of-executing}

モデルが `{"name": "web_search", "arguments": {...}}` のようなものを、ツールを実際に呼ぶ代わりにメッセージとして出力してしまう症状です。

**原因:** サーバー側でツール呼び出しが有効になっていないか、そのサーバーのツール呼び出しの実装ではモデルが対応していません。

| サーバー | 直し方 |
|--------|-----|
| **llama.cpp** | 起動コマンドに `--jinja` を足します |
| **vLLM** | `--enable-auto-tool-choice --tool-call-parser hermes` を足します |
| **SGLang** | `--tool-call-parser qwen`（またはモデルに合ったパーサー）を足します |
| **Ollama** | ツール呼び出しは既定で有効です。モデルが対応しているか確認してください（`ollama show model-name` で見られます） |
| **LM Studio** | 0.3.6 以降に更新し、ネイティブにツールへ対応したモデルを使ってください |

#### モデルが文脈を忘れる、応答がちぐはぐになる {#model-seems-to-forget-context-or-give-incoherent-responses}

**原因:** コンテキストウィンドウが小さすぎます。会話がコンテキストの上限を超えると、たいていのサーバーは古いメッセージを黙って捨てます。Hermes のシステムプロンプトとツールのスキーマだけで 4k〜8k トークンを使うことがあります。

**切り分け方:**

```bash
# Check what Hermes thinks the context is
# Look at startup line: "Context limit: X tokens"

# Check your server's actual context
# Ollama: ollama ps (CONTEXT column)
# llama.cpp: curl http://localhost:8080/props | jq '.default_generation_settings.n_ctx'
# vLLM: check --max-model-len in startup args
```

**直し方:** エージェント用途では、コンテキストを少なくとも **64,000 トークン**に設定してください。指定するフラグは、上の各サーバーの節を参照してください。

#### 起動時に「Context limit: 2048 tokens」と出る {#context-limit-2048-tokens-at-startup}

Hermes はサーバーの `/v1/models` エンドポイントからコンテキスト長を自動検出します。サーバーが小さな値を返す（あるいは何も返さない）場合、Hermes はモデルが宣言している上限を使いますが、それが誤っていることがあります。

**直し方:** `config.yaml` で明示的に設定します。

```yaml
model:
  default: your-model
  provider: custom
  base_url: http://localhost:11434/v1
  context_length: 64000
```

#### 応答が文の途中で切れる {#responses-get-cut-off-mid-sentence}

**考えられる原因:**
1. **サーバー側の出力上限（`max_tokens`）が小さい** — SGLang の既定は 1 応答あたり 128 トークンです。サーバーで `--default-max-tokens` を設定するか、config.yaml の `model.max_tokens` で Hermes 側を設定してください。なお `max_tokens` が制御するのは応答の長さだけで、会話履歴をどれだけ長く保てるか（そちらは `context_length`）とは無関係です。
2. **コンテキストの枯渇** — モデルがコンテキストウィンドウを使い切りました。`model.context_length` を増やすか、Hermes の[コンテキスト圧縮](/hermes/docs/user-guide/configuration/#context-compression)を有効にしてください。

---

### LiteLLM プロキシ — 複数プロバイダのゲートウェイ {#litellm-proxy-multi-provider-gateway}

[LiteLLM](https://docs.litellm.ai/) は、100 以上の LLM プロバイダを 1 つの API の背後にまとめる OpenAI 互換のプロキシです。向いている用途は、設定を変えずにプロバイダを切り替えること、負荷分散、フォールバックの連鎖、予算の管理です。

```bash
# Install and start
pip install "litellm[proxy]"
litellm --model anthropic/claude-sonnet-4 --port 4000

# Or with a config file for multiple models:
litellm --config litellm_config.yaml --port 4000
```

続けて `hermes model` → Custom endpoint → `http://localhost:4000/v1` で Hermes を設定します。

フォールバック付きの `litellm_config.yaml` の例は次のとおりです。
```yaml
model_list:
  - model_name: "best"
    litellm_params:
      model: anthropic/claude-sonnet-4
      api_key: sk-ant-...
  - model_name: "best"
    litellm_params:
      model: openai/gpt-4o
      api_key: sk-...
router_settings:
  routing_strategy: "latency-based-routing"
```

---

### ClawRouter — コスト最適化のルーティング {#clawrouter-cost-optimized-routing}

BlockRunAI による [ClawRouter](https://github.com/BlockRunAI/ClawRouter) は、問い合わせの難しさに応じてモデルを自動で選ぶローカルのルーティングプロキシです。リクエストを 14 の軸で分類し、そのタスクをこなせるいちばん安いモデルへ振り分けます。支払いは USDC の暗号資産で行い、API キーは使いません。

```bash
# Install and start
npx @blockrun/clawrouter    # Starts on port 8402
```

続けて `hermes model` → Custom endpoint → `http://localhost:8402/v1` → モデル名 `blockrun/auto` で Hermes を設定します。

ルーティングのプロファイル:
| プロファイル | 方針 | 節約幅 |
|---------|----------|---------|
| `blockrun/auto` | 品質とコストのバランス | 74-100% |
| `blockrun/eco` | できるだけ安く | 95-100% |
| `blockrun/premium` | 品質の高いモデル優先 | 0% |
| `blockrun/free` | 無料のモデルのみ | 100% |
| `blockrun/agentic` | ツール利用に最適化 | 場合による |

:::note
ClawRouter は、支払いのために Base か Solana 上の USDC を入れたウォレットを必要とします。すべてのリクエストは BlockRun のバックエンド API を経由します。ウォレットの状態は `npx @blockrun/clawrouter doctor` で確認できます。
:::

---

### その他の互換プロバイダ {#other-compatible-providers}

OpenAI 互換の API を持つサービスなら何でも使えます。よく使われるものをいくつか挙げます。

| プロバイダ | ベース URL | 備考 |
|----------|----------|-------|
| [Together AI](https://together.ai) | `https://api.together.xyz/v1` | クラウドでホストされるオープンモデル |
| [Groq](https://groq.com) | `https://api.groq.com/openai/v1` | 非常に高速な推論 |
| [DeepSeek](https://deepseek.com) | `https://api.deepseek.com/v1` | DeepSeek のモデル |
| [Fireworks AI](https://fireworks.ai) | `https://api.fireworks.ai/inference/v1` | 高速なオープンモデルのホスティング |
| [GMI Cloud](https://www.gmicloud.ai/) | `https://api.gmi-serving.com/v1` | マネージドな OpenAI 互換の推論 |
| [Actual Computer](https://actual.inc) | `https://api.actual.inc/v1` | 自分のクラスタへの private なリレー。ローカルのデーモンは `http://127.0.0.1:8080/v1` |
| [Cerebras](https://cerebras.ai) | `https://api.cerebras.ai/v1` | ウェハースケールのチップによる推論 |
| [Mistral AI](https://mistral.ai) | `https://api.mistral.ai/v1` | Mistral のモデル |
| [OpenAI](https://openai.com) | `https://api.openai.com/v1` | OpenAI への直接アクセス |
| [Azure OpenAI](https://azure.microsoft.com) | `https://YOUR.openai.azure.com/` | 企業向けの OpenAI |
| [LocalAI](https://localai.io) | `http://localhost:8080/v1` | 自前ホスト、複数モデル対応 |
| [Jan](https://jan.ai) | `http://localhost:1337/v1` | ローカルのモデルを動かすデスクトップアプリ |

いずれも `hermes model` → Custom endpoint で設定できますし、`config.yaml` に書くこともできます。

```yaml
model:
  default: meta-llama/Llama-3.1-70B-Instruct-Turbo
  provider: custom
  base_url: https://api.together.xyz/v1
  api_key: your-together-key
```

---

### コンテキスト長の検出 {#context-length-detection}

:::note 混同しやすい 2 つの設定
**`context_length`** は**コンテキストウィンドウの総量**で、入力トークンと出力トークンを合わせた枠です（たとえば Claude Opus 4.6 なら 200,000）。Hermes はこれを見て、履歴をいつ圧縮するかを決め、API リクエストを検証します。

**`model.max_tokens`** は**出力の上限**で、モデルが*1 回の応答*で生成してよいトークン数の最大値です。会話履歴をどれだけ長く保てるかとは関係ありません。業界で標準的な `max_tokens` という名前は混乱のもとになりやすく、Anthropic のネイティブ API はその後わかりやすさのために `max_output_tokens` へ改名しました。

自動検出がウィンドウのサイズを取り違えたときは `context_length` を設定してください。
個々の応答の長さを制限したいときだけ `model.max_tokens` を設定してください。
:::

Hermes は、モデルとプロバイダに合ったコンテキストウィンドウを見つけるために、複数の情報源をたどる解決の連鎖を使います。

1. **設定による上書き** — config.yaml の `model.context_length`（最優先）
2. **カスタムプロバイダのモデル単位の設定** — `providers.<name>.models.<id>.context_length`
3. **永続キャッシュ** — 過去に判明した値（再起動しても残ります）
4. **エンドポイントの `/models`** — サーバーの API に問い合わせます（ローカル / カスタムのエンドポイント）
5. **Anthropic の `/v1/models`** — Anthropic の API に `max_input_tokens` を問い合わせます（API キー利用者のみ）
6. **OpenRouter の API** — OpenRouter の最新のモデルのメタデータ
7. **Nous Portal** — Nous のモデル ID を OpenRouter のメタデータと接尾辞で照合します
8. **[models.dev](https://models.dev)** — 100 以上のプロバイダ、3800 以上のモデルについて、プロバイダごとのコンテキスト長を持つコミュニティ運営のレジストリ
9. **フォールバックの既定値** — モデル系統ごとの大まかなパターン（既定は 128K）

たいていの環境では、これでそのまま動きます。仕組みはプロバイダを意識していて、同じモデルでも提供元によってコンテキストの上限は変わります（たとえば `claude-opus-4.6` は Anthropic 直なら 1M ですが、GitHub Copilot 経由では 128K です）。

コンテキスト長を明示するには、モデルの設定に `context_length` を足します。

```yaml
model:
  default: "qwen3.5:9b"
  base_url: "http://localhost:8080/v1"
  context_length: 131072  # tokens
```

カスタムエンドポイントでは、モデルごとにコンテキスト長を設定することもできます。

```yaml
providers:
  my-local-llm:
    api: "http://localhost:11434/v1"
    models:
      qwen3.5:27b:
        context_length: 64000
      deepseek-r1:70b:
        context_length: 65536
```

`hermes model` は、カスタムエンドポイントを設定するときにコンテキスト長を尋ねます。自動検出に任せるなら空のままにしてください。

:::tip 手で設定したほうがよい場面
- モデルの最大値より小さい `num_ctx` を指定して Ollama を使っている
- モデルの最大値より小さく抑えたい（VRAM を節約するために 128k のモデルを 8k にする、など）
- `/v1/models` を公開していないプロキシの背後で動かしている
:::

---

### 名前付きのカスタムプロバイダ {#named-custom-providers}

複数のカスタムエンドポイントを使い分けている場合（たとえばローカルの開発サーバーとリモートの GPU サーバー）、`config.yaml` の `providers:` の辞書に、プロバイダ名をキーとして名前付きのカスタムプロバイダを定義できます。

```yaml
providers:
  local:
    api: http://localhost:8080/v1
    # api_key omitted — Hermes uses "no-key-required" for keyless local servers
  work:
    api: https://gpu-server.internal.corp/v1
    key_env: CORP_API_KEY
    transport: chat_completions   # set explicitly by `hermes model` → Custom Endpoint wizard; auto-detection still happens as a fallback
  anthropic-proxy:
    api: https://proxy.example.com/anthropic
    key_env: ANTHROPIC_PROXY_KEY
    transport: anthropic_messages  # for Anthropic-compatible proxies
```

各エントリが受け付けるのは、`api`（エンドポイントのベース URL。`base_url`/`url` も別名として使えます）、`name`（任意の表示名。既定は辞書のキー）、`key_env` かインラインの `api_key` か `key_cmd`（後述）、`transport`（`chat_completions` / `anthropic_messages` / `codex_responses`）、`default_model`、`models`、`context_length`、`discover_models`、`extra_body`、`extra_headers`、`ssl_ca_cert` / `ssl_verify`、そしてエントリを消さずに隠すための `enabled: false` です。

#### コマンドで発行する認証情報（`key_cmd`） {#command-minted-credentials-keycmd}

企業向けのゲートウェイでは、静的な API キーではなく短命のベアラートークンを発行することがよくあります（SSO/OIDC のブローカー、クラウドの IAM、社内の認証プロキシなど）。そのため `.env` にコピーしたトークンはセッションの途中で期限切れになり、リクエストが 401 を返し始めます。`key_cmd` には、トークンを*表示する*コマンドを指定します。Hermes はそれを実行し、期限の少し前まで結果をキャッシュするので、長いセッションでも再起動なしで動き続けます。

```yaml
providers:
  my-gateway:
    base_url: "https://gateway.internal.example.com/v1"
    api_mode: chat_completions
    key_cmd: "my-auth-cli print-token --profile prod"
```

トークンを表示するものであれば、どんな補助コマンドでも使えます。`databricks auth token`、`gcloud auth print-access-token`、`az account get-access-token`、`vault read`、あるいは Claude Code 形式の `apiKeyHelper` のスクリプトなどです。

コマンドは標準出力にトークン**だけ**を出す必要があります。素のトークンか、`access_token` フィールドを持つ JSON のどちらかです（`expires_in` は考慮されます。`expiry`/`expiresOn` の絶対時刻の ISO タイムスタンプも同様です）。複数行の出力は推測せずに拒否されます。期限が示されていない場合、トークンは一定の間隔で発行し直されます。

優先順位: 明示的な `--api-key` フラグが常に勝ちます。それ以外では、同じエントリ内では `key_cmd` が静的な `api_key`/`key_env` より優先されます。発行された認証情報は、メインのエージェントのやり取りにも、補助タスク（タイトル生成、圧縮、画像認識、埋め込み）にも同じように使われます。

`secrets.command` とは別物です。あちらは**起動時に一度だけ**補助コマンドを実行して、プロセス全体の環境変数を用意するものです。多くのシークレットをまとめて返す vault / キーチェーンの補助にはあちらを、1 つのプロバイダの認証情報をセッションの*途中で*発行し直す必要があるときには `key_cmd` を使ってください。

:::note 旧来の形式
古い設定では、代わりにトップレベルの `custom_providers:` のリストを使っていました。これはまだ動きますし（Hermes は両方を読みます）、`hermes update` が `providers:` の辞書形式へ自動で移行します（config v12）。辞書形式ではフィールド名が少し違い、旧来の `model` は `default_model`、旧来の `api_mode` は `transport` になります。
:::

OpenAI 互換のエンドポイントの中には、プロバイダ固有のリクエストボディのフィールドを必要とするものがあります。該当するカスタムプロバイダに `extra_body` のマップを足すと、Hermes はそのエンドポイント向けの各チャット補完のリクエストにそれを混ぜ込みます。

```yaml
providers:
  gemma-local:
    api: http://localhost:8080/v1
    default_model: google/gemma-4-31b-it
    extra_body:
      enable_thinking: true
      reasoning_effort: high
```

サーバーが文書化している形に合わせてください。たとえば vLLM の Gemma 構成や一部の NVIDIA NIM のエンドポイントでは、`enable_thinking` を `extra_body` のトップレベルではなく `chat_template_kwargs` の下に置くことを期待します。

```yaml
extra_body:
  chat_template_kwargs:
    enable_thinking: true
```

vLLM で提供する Qwen の推論モデルでは、推論パーサーが生成テキストをすべて推論のフィールドへ振り分けてアシスタントの `content` を空にしてしまう場合に、同じ形で思考を無効にできます。

```yaml
extra_body:
  chat_template_kwargs:
    enable_thinking: false
```

設定した `extra_body` は、どこへ行ってもプロバイダについて回ります。エージェントの構築時に混ぜ込まれ、**ゲートウェイのやり取りをまたいでも残り**（`/fast` が `service_tier`/`speed` の上書きを重ねるやり取りでも、それらは `extra_body` を置き換えるのではなく上に重ねます）、**`/model` の切り替えのたびに導出し直されます**。名前付きのカスタムプロバイダへ切り替えればその `extra_body` が適用され、別へ切り替えればクリアされるので、他のプロバイダへ漏れることはありません。

`hermes model` → Custom Endpoint のウィザードは、API のモードを明示的に尋ねて、その答えを `config.yaml` に保存するようになりました（プロバイダのエントリの `transport` として保存されます）。この項目を空にした場合は、URL による自動検出（たとえば `/anthropic` のパスなら `anthropic_messages`）がフォールバックとして働きます。

**カスタムプロバイダのモデルでのネイティブな画像入力。** カスタムエンドポイントが models.dev に載っていない画像対応のモデルを提供している場合、`model.supports_vision: true` を設定すると、Hermes は添付された画像を `vision_analyze` で前処理せず、ネイティブに（`image_url` のパートとして）渡します。この 1 つのつまみだけで済み、`agent.image_input_mode: native` を併せて設定する必要はありません。

```yaml
model:
  provider: custom
  base_url: http://localhost:8080/v1
  default: qwen3.6-35b-a3b
  supports_vision: true   # send images natively; otherwise vision_analyze pre-describes them
```

同じキーは名前付きプロバイダのモデル単位でも有効で（`providers.<name>.models.<id>.supports_vision`）、標準的な YAML の真偽値（`true/false/yes/no/on/off/1/0`）を受け付けます。

セッションの途中で切り替えるには、3 つ組の記法を使います。

```
/model custom:local:qwen-2.5       # Use the "local" endpoint with qwen-2.5
/model custom:work:llama3-70b      # Use the "work" endpoint with llama3-70b
/model custom:anthropic-proxy:claude-sonnet-4  # Use the proxy
```

名前付きのカスタムプロバイダは、対話的な `hermes model` のメニューからも選べます。

---

### レシピ集: Together AI、Groq、Perplexity {#cookbook-together-ai-groq-perplexity}

[その他の互換プロバイダ](#other-compatible-providers)に挙げたクラウドのプロバイダは、いずれも OpenAI の REST 方言を話すので、`providers:` の辞書の下で同じように設定できます。以下に 3 つの実例を挙げます。どれも `~/.hermes/config.yaml` に書き、対応する API キーは `~/.hermes/.env` に置きます。

#### Together AI {#together-ai}

オープンウェイトのモデル（Llama、MiniMax、Gemma、DeepSeek、Qwen）を、一次プロバイダの API よりかなり安く提供しています。複数のモデルを併用する構成の既定として良い選択です。

```yaml
# ~/.hermes/config.yaml
providers:
  together:
    api: https://api.together.xyz/v1
    key_env: TOGETHER_API_KEY
    # transport: chat_completions  # default — no need to set

model:
  default: MiniMaxAI/MiniMax-M2.7   # or any model from together.ai/models
  provider: custom:together
```

```bash
# ~/.hermes/.env
TOGETHER_API_KEY=your-together-key
```

セッションの途中でモデルを切り替えます。

```
/model custom:together:meta-llama/Llama-3.3-70B-Instruct-Turbo
/model custom:together:google/gemma-4-31b-it
/model custom:together:deepseek-ai/DeepSeek-V3
```

Together の `/v1/models` エンドポイントは使えるので、`hermes model` が利用できるモデルを自動で見つけられます。

#### Groq {#groq}

非常に高速な推論です（Llama-3.3-70B でおよそ 500 tok/s）。カタログは小さいものの、待ち時間が気になる対話的な用途には強い選択肢です。

```yaml
# ~/.hermes/config.yaml
providers:
  groq:
    api: https://api.groq.com/openai/v1
    key_env: GROQ_API_KEY

model:
  default: llama-3.3-70b-versatile
  provider: custom:groq
```

```bash
# ~/.hermes/.env
GROQ_API_KEY=your-groq-key
```

#### Perplexity {#perplexity}

ライブのウェブ検索と引用を自動でやってくれるモデルが欲しいときに便利です。使えるモデルの制約が厳しいので、現在の一覧は [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api) で確認してください。

```yaml
# ~/.hermes/config.yaml
providers:
  perplexity:
    api: https://api.perplexity.ai
    key_env: PERPLEXITY_API_KEY

model:
  default: sonar
  provider: custom:perplexity
```

```bash
# ~/.hermes/.env
PERPLEXITY_API_KEY=your-perplexity-key
```

#### 1 つの設定に複数のプロバイダを入れる {#multiple-providers-in-one-config}

3 つのレシピは組み合わせられます。全部をまとめて設定し、ターンごとに `/model custom:<name>:<model>` で切り替えられます。

```yaml
providers:
  together:
    api: https://api.together.xyz/v1
    key_env: TOGETHER_API_KEY
  groq:
    api: https://api.groq.com/openai/v1
    key_env: GROQ_API_KEY
  perplexity:
    api: https://api.perplexity.ai
    key_env: PERPLEXITY_API_KEY

model:
  default: MiniMaxAI/MiniMax-M2.7
  provider: custom:together      # boot to Together; switch freely after
```

:::tip トラブルシューティング
- CLI のバリデータが #15083 で修正されて以降、`hermes doctor` はこれらの名前について `Unknown provider` の警告を出さないはずです。
- プロバイダの `/v1/models` エンドポイントに届かない場合（Perplexity でよく起こります）、`hermes model` は強制的に拒否せず、警告を出したうえでモデルを保存します。#15136 を参照してください。
- 名前付きプロバイダを使わずに、素の `provider: custom` と `CUSTOM_BASE_URL` の環境変数で済ませる方法は #15103 を参照してください。
:::

---

### 構成の選び方 {#choosing-the-right-setup}

| 用途 | おすすめ |
|----------|-------------|
| **とにかく動けばいい** | OpenRouter（既定）または Nous Portal |
| **ローカルのモデルを手軽に** | Ollama |
| **本番の GPU での提供** | vLLM または SGLang |
| **Mac / GPU なし** | Ollama または llama.cpp |
| **複数プロバイダの振り分け** | LiteLLM プロキシまたは OpenRouter |
| **コストの最適化** | ClawRouter、または `sort: "price"` を付けた OpenRouter |
| **プライバシー最優先** | Ollama、vLLM、llama.cpp（完全にローカル） |
| **企業 / Azure** | カスタムエンドポイントで Azure OpenAI |
| **中国発の AI モデル** | z.ai（GLM）、Kimi/Moonshot（`kimi-coding` または `kimi-coding-cn`）、MiniMax、Xiaomi MiMo、Tencent TokenHub（いずれも第一級のプロバイダ） |

:::tip
プロバイダはいつでも `hermes model` で切り替えられ、再起動は要りません。どのプロバイダを使っていても、会話履歴・メモリ・スキルはそのまま引き継がれます。
:::

## 任意の API キー {#optional-api-keys}

| 機能 | プロバイダ | 環境変数 |
|---------|----------|--------------|
| ウェブスクレイピング | [Firecrawl](https://firecrawl.dev/) | `FIRECRAWL_API_KEY`, `FIRECRAWL_API_URL` |
| ブラウザ自動化 | [Browserbase](https://browserbase.com/) | `BROWSERBASE_API_KEY`, `BROWSERBASE_PROJECT_ID` |
| 画像生成 | [FAL](https://fal.ai/) | `FAL_KEY` |
| 高品質な TTS の音声 | [ElevenLabs](https://elevenlabs.io/) | `ELEVENLABS_API_KEY` |
| OpenAI の TTS と音声の文字起こし | [OpenAI](https://platform.openai.com/api-keys) | `VOICE_TOOLS_OPENAI_KEY` |
| Mistral の TTS と音声の文字起こし | [Mistral](https://console.mistral.ai/) | `MISTRAL_API_KEY` |
| セッションをまたぐユーザーのモデリング | [Honcho](https://honcho.dev/) | `HONCHO_API_KEY` |
| 意味的な長期記憶 | [Supermemory](https://supermemory.ai) | `SUPERMEMORY_API_KEY` |

### Firecrawl を自前でホストする {#self-hosting-firecrawl}

Hermes は既定で、ウェブ検索とスクレイピングに [Firecrawl のクラウド API](https://firecrawl.dev/) を使います。Firecrawl をローカルで動かしたい場合は、代わりに自前ホストのインスタンスへ Hermes を向けられます。設定手順の全体は Firecrawl の [SELF_HOST.md](https://github.com/firecrawl/firecrawl/blob/main/SELF_HOST.md) を参照してください。

**得られるもの:** API キーが不要になり、レート制限もページ単位の費用もなく、データを自分で完全に管理できます。

**失うもの:** クラウド版は、ボット対策を突破する Firecrawl 独自の「Fire-engine」（Cloudflare、CAPTCHA、IP のローテーション）を使います。自前ホスト版は基本的な fetch と Playwright を使うので、保護のかかったサイトでは失敗することがあります。検索は Google ではなく DuckDuckGo を使います。

**設定手順:**

1. Firecrawl の Docker スタックをクローンして起動します（API、Playwright、Redis、RabbitMQ、PostgreSQL の 5 コンテナで、4〜8 GB ほどのメモリが必要です）。
   ```bash
   git clone https://github.com/firecrawl/firecrawl
   cd firecrawl
   # In .env, set: USE_DB_AUTHENTICATION=false, HOST=0.0.0.0, PORT=3002
   docker compose up -d
   ```

2. Hermes をそのインスタンスへ向けます（API キーは不要です）。
   ```bash
   hermes config set FIRECRAWL_API_URL http://localhost:3002
   ```

自前ホストのインスタンスで認証を有効にしている場合は、`FIRECRAWL_API_KEY` と `FIRECRAWL_API_URL` の両方を設定することもできます。

## OpenRouter のプロバイダルーティング {#openrouter-provider-routing}

OpenRouter を使うときは、リクエストをどのプロバイダへ振り分けるかを制御できます。`~/.hermes/config.yaml` に `provider_routing` のセクションを足してください。

```yaml
provider_routing:
  sort: "throughput"          # "price" (default), "throughput", or "latency"
  # only: ["anthropic"]      # Only use these providers
  # ignore: ["deepinfra"]    # Skip these providers
  # order: ["anthropic", "google"]  # Try providers in this order
  # require_parameters: true  # Only use providers that support all request params
  # data_collection: "deny"   # Exclude providers that may store/train on data
  # models:                   # Per-model pins (same keys; unset keys fall through)
  #   "openai/gpt-6-astra": {only: ["openai"]}
  #   "anthropic/claude-fable-5.1": {only: ["anthropic"]}
```

**近道:** モデル名の末尾に `:nitro` を付けるとスループット順（例: `anthropic/claude-sonnet-4:nitro`）、`:floor` を付けると価格順になります。モデルごとの詳細は [プロバイダルーティング](/hermes/docs/user-guide/features/provider-routing/#per-model-overrides-models)を参照してください。

## OpenRouter の Pareto Code ルーター {#openrouter-pareto-code-router}

OpenRouter は `openrouter/pareto-code` で、コーディング向けの実験的なモデルルーターを提供しています。コーディングの品質の基準（[Artificial Analysis](https://artificialanalysis.ai/) のランキングに基づく）を満たすなかで、いちばん安いモデルへリクエストを自動で振り分けます。このモデルを選んだうえで、`~/.hermes/config.yaml` の `min_coding_score` のつまみを調整してください。

```yaml
model:
  provider: openrouter
  model: openrouter/pareto-code

openrouter:
  min_coding_score: 0.65   # 0.0–1.0; higher = stronger (more expensive) coders. Default 0.65.
```

補足:

- `min_coding_score` が送られるのは、`model.model` が `openrouter/pareto-code` のとき**だけ**です。他のモデルでは何の効果もありません。
- 空文字にする（または行を消す）と、OpenRouter が使えるなかで最も強いコーダーを選びます。プラグインのブロックを省いたときの、文書化された挙動です。
- ある日のあるスコアに対する選択は決定的ですが、実際に選ばれるモデルはパレートフロンティアの移動（新しいモデルの登場、ベンチマークの更新）につれて変わります。
- ルーターの挙動の全体は OpenRouter の [Pareto Router のドキュメント](https://openrouter.ai/docs/guides/routing/routers/pareto-router)を参照してください。
- メインのエージェントではなく特定の**補助タスク**（圧縮、画像認識など）で Pareto Code ルーターを使うには、そのタスクの下に `extra_body.plugins` を設定します。[補助モデル → 補助タスクでの OpenRouter のルーティングと Pareto Code](/hermes/docs/user-guide/configuration/#openrouter-routing--pareto-code-for-auxiliary-tasks)を参照してください。

## フォールバックのプロバイダ {#fallback-providers}

メインのモデルが失敗したとき（レート制限、サーバーエラー、認証の失敗）に、Hermes が順に試す予備のプロバイダの連鎖を設定できます。正式な書き方は、トップレベルの `fallback_providers:` のリストです。

```yaml
fallback_providers:
  - provider: openrouter
    model: anthropic/claude-sonnet-4
  - provider: anthropic
    model: claude-sonnet-4
    # base_url: http://localhost:8000/v1    # optional, for custom endpoints
    # api_mode: chat_completions           # optional override
```

旧来の 1 組だけを書く `fallback_model:` の辞書も、後方互換のために受け付けられます。

```yaml
fallback_model:
  provider: openrouter
  model: anthropic/claude-sonnet-4
```

フォールバックが働くと、会話を失わずにセッションの途中でモデルとプロバイダが入れ替わります。連鎖は 1 件ずつ順に試され、発動は 1 セッションにつき 1 回だけです。

対応するプロバイダ: `openrouter`、`nous`、`novita`、`openai-codex`、`copilot`、`copilot-acp`、`anthropic`、`gemini`、`qwen-oauth`、`huggingface`、`zai`、`kimi-coding`、`kimi-coding-cn`、`minimax`、`minimax-cn`、`minimax-oauth`、`deepseek`、`nvidia`、`xai`、`xai-oauth`、`ollama-cloud`、`bedrock`、`ai-gateway`、`azure-foundry`、`opencode-zen`、`opencode-go`、`commandcode`、`commandcode-anthropic`、`kilocode`、`xiaomi`、`arcee`、`gmi`、`actual`、`stepfun`、`lmstudio`、`alibaba`、`alibaba-coding-plan`、`tencent-tokenhub`、`tencent-tokenplan`、`nebius-token-factory`、`router`、`custom`。

:::tip
フォールバックの設定は `config.yaml` だけで行います（対話的にやるなら `hermes fallback` です）。どんなときに発動するのか、連鎖がどう進むのか、補助タスクや委任とどう関わるのかについては、[フォールバックのプロバイダ](/hermes/docs/user-guide/features/fallback-providers/)を参照してください。
:::

---

## 関連ページ {#see-also}

- [設定](/hermes/docs/user-guide/configuration/) — 全般的な設定（ディレクトリ構成、設定の優先順位、端末のバックエンド、メモリ、圧縮など）
- [環境変数](/hermes/docs/reference/environment-variables/) — すべての環境変数の一覧
