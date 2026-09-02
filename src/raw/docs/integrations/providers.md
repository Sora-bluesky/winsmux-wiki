---
title: "LLM とモデルの提供元"
description: ""
upstream_path: integrations/providers.md
upstream_blob: 5ede871815d174d7631805ec06bb45a171f4e822
sources:
  - https://hermes-agent.nousresearch.com/docs/integrations/providers
---

# LLM とモデルの提供元 {#llm-and-model-providers}

このページでは、Hermes Agent が推論に使う提供元の設定を扱います。OpenRouter や Anthropic のようなクラウドの API から、Ollama や vLLM のような自前で立てるエンドポイント、さらに込み入った振り分けやフォールバックの設定までが対象です。Hermes を使うには、少なくとも 1 つの提供元を設定する必要があります。

## 推論プロバイダ {#inference-providers}

LLM につなぐ手段が少なくとも 1 つ要ります。`hermes model` を使えば対話的にプロバイダとモデルを切り替えられますし、設定を直接書くこともできます。

| プロバイダ | 設定方法 |
|----------|-------|
| **Nous Portal** | `hermes model`（OAuth、定額制） |
| **OpenAI Codex** | `hermes model` → **ChatGPT or Codex Subscription**（ChatGPT の OAuth。Codex のモデルを使います） |
| **GitHub Copilot** | `hermes model`（OAuth のデバイスコード方式、`COPILOT_GITHUB_TOKEN`、`GH_TOKEN`、または `gh auth token`） |
| **GitHub Copilot ACP** | `hermes model`（手元で `copilot --acp --stdio` を起動します） |
| **Anthropic** | `hermes model`（Claude Max ＋ 追加購入した利用枠を OAuth で。Anthropic の API キーや手動の setup-token にも対応。下の注記を参照） |
| **OpenRouter** | `~/.hermes/.env` に `OPENROUTER_API_KEY` |
| **Ramp Router** | `~/.hermes/.env` に `RAMP_ROUTER_API_KEY`（provider: `router`。別名: `ramp-router`、`ramp`、`router.com`。Responses をそのまま話すゲートウェイで、アカウントごとの最新カタログを持ちます） |
| **Fireworks AI** | `~/.hermes/.env` に `FIREWORKS_API_KEY`（provider: `fireworks`。別名: `fireworks-ai`、`fw`） |
| **NovitaAI** | `~/.hermes/.env` に `NOVITA_API_KEY`（provider: `novita`。200 以上のモデル、Model API、Agent Sandbox、GPU Cloud） |
| **AI Gateway** | `~/.hermes/.env` に `AI_GATEWAY_API_KEY`（provider: `ai-gateway`） |
| **z.ai / GLM** | `~/.hermes/.env` に `GLM_API_KEY`（provider: `zai`） |
| **Kimi / Moonshot** | `~/.hermes/.env` に `KIMI_API_KEY`（provider: `kimi-coding`） |
| **Kimi / Moonshot（中国）** | `~/.hermes/.env` に `KIMI_CN_API_KEY`（provider: `kimi-coding-cn`。別名: `kimi-cn`、`moonshot-cn`） |
| **Arcee AI** | `~/.hermes/.env` に `ARCEEAI_API_KEY`（provider: `arcee`。別名: `arcee-ai`、`arceeai`） |
| **GMI Cloud** | `~/.hermes/.env` に `GMI_API_KEY`（provider: `gmi`。別名: `gmi-cloud`、`gmicloud`） |
| **Nebius Token Factory** | `~/.hermes/.env` に `NEBIUS_API_KEY`（provider: `nebius-token-factory`。別名: `nebius`、`nebius-tf`、`tokenfactory`） |
| **Actual Computer** | ホスト型の中継を使うなら `~/.hermes/.env` に `ACTUAL_API_KEY`、手元のデーモンを使うなら `ACTUAL_BASE_URL=http://127.0.0.1:8080`（ループバックならキーは不要）（provider: `actual`。別名: `actual-computer`、`actualcomputer`、`aci`） |
| **MiniMax** | `~/.hermes/.env` に `MINIMAX_API_KEY`（provider: `minimax`） |
| **MiniMax China** | `~/.hermes/.env` に `MINIMAX_CN_API_KEY`（provider: `minimax-cn`） |
| **xAI (Grok) — Responses API** | `~/.hermes/.env` に `XAI_API_KEY`（provider: `xai`） |
| **xAI Grok OAuth (SuperGrok)** | `hermes model` → 「xAI Grok OAuth (SuperGrok / Premium+)」。ブラウザでログインし、API キーは不要です。[手引き](/hermes/docs/guides/xai-grok-oauth/)を参照してください |
| **Qwen Cloud（Alibaba DashScope）** | `~/.hermes/.env` に `DASHSCOPE_API_KEY`（provider: `alibaba`。中国本土向けのエンドポイントは `alibaba-cn`） |
| **Alibaba Cloud（Coding Plan）** | `ALIBABA_CODING_PLAN_API_KEY`（なければ `DASHSCOPE_API_KEY` に落ちます）（provider: `alibaba-coding-plan`、別名: `alibaba_coding`。中国本土向けは `alibaba-coding-plan-cn` で `ALIBABA_CODING_PLAN_CN_API_KEY`。なければ共通のキーに落ちます） — 課金の種類もエンドポイントも別です |
| **Alibaba Cloud（Token Plan）** | `~/.hermes/.env` に `ALIBABA_TOKEN_PLAN_API_KEY`（provider: `alibaba-token-plan`。中国本土向けは `alibaba-token-plan-cn` で `ALIBABA_TOKEN_PLAN_CN_API_KEY`。なければ共通のキーに落ちます） — Model Studio の定額トークン枠です |
| **Kilo Code** | `~/.hermes/.env` に `KILOCODE_API_KEY`（provider: `kilocode`） |
| **Xiaomi MiMo** | `~/.hermes/.env` に `XIAOMI_API_KEY`（provider: `xiaomi`。別名: `mimo`、`xiaomi-mimo`） |
| **Tencent TokenHub** | `~/.hermes/.env` に `TOKENHUB_API_KEY`（provider: `tencent-tokenhub`。別名: `tencent`、`tokenhub`、`tencentmaas`） |
| **Tencent TokenPlan** | `~/.hermes/.env` に `TOKENPLAN_API_KEY`（provider: `tencent-tokenplan`。別名: `tokenplan`、`tencent-lkeap`。Anthropic Messages のエンドポイントを使います） |
| **OpenCode Zen** | `~/.hermes/.env` に `OPENCODE_ZEN_API_KEY`（provider: `opencode-zen`） |
| **CommandCode** | `~/.hermes/.env` に `COMMANDCODE_API_KEY`（provider: `commandcode`、別名: `commandcode-chat`。Claude のモデルは `commandcode-anthropic`、別名: `commandcode-claude`）。GOAT / Pro / Max / Provider の各プランで使えます（1 ドルの Go プランは API が使えないため対象外です）。 |
| **OpenCode Go** | `~/.hermes/.env` に `OPENCODE_GO_API_KEY`（provider: `opencode-go`） |
| **OpenCode Free** | キー不要。API キーもアカウントも要りません（provider: `opencode-free`。別名: `free`、`opencode_free`）。`hermes model` か `/model free` で選びます。リクエストは匿名で送られます。モデルの一覧は OpenCode の最新カタログから自動で更新されるので、入れ替わる無料枠の対象が Hermes の更新なしに現れたり消えたりします |
| **DeepSeek** | `~/.hermes/.env` に `DEEPSEEK_API_KEY`（provider: `deepseek`） |
| **Hugging Face** | `~/.hermes/.env` に `HF_TOKEN`（provider: `huggingface`。別名: `hf`） |
| **Google / Gemini** | `~/.hermes/.env` に `GOOGLE_API_KEY`（または `GEMINI_API_KEY`）（provider: `gemini`） |
| **Google Vertex AI** | `hermes model` → 「Google Vertex AI」（provider: `vertex`。サービスアカウントの JSON か ADC による OAuth2、課金は GCP） |
| **OpenAI API（直接）** | `~/.hermes/.env` に `OPENAI_API_KEY`（provider: `openai-api`。任意で `OPENAI_BASE_URL`） |
| **Azure AI Foundry** | `hermes model` → 「Azure AI Foundry」（provider: `azure-foundry`。Azure OpenAI / Foundry のエンドポイントとキーを使います） |
| **AWS Bedrock** | `hermes model` → 「AWS Bedrock」（provider: `bedrock`。boto3 による標準の AWS 認証情報の連鎖） |
| **NVIDIA Build** | `~/.hermes/.env` に `NVIDIA_API_KEY`（provider: `nvidia`。build.nvidia.com 上の NIM 提供モデル） |
| **Ollama Cloud** | `hermes model` → 「Ollama Cloud」（provider: `ollama-cloud`。クラウドで動く Ollama の API） |
| **Qwen OAuth** | `hermes model` → 「Qwen OAuth」（provider: `qwen-oauth`。ブラウザでの PKCE ログイン） |
| **MiniMax OAuth** | `hermes model` → 「MiniMax (OAuth)」（provider: `minimax-oauth`。ブラウザでの PKCE ログイン） |
| **StepFun** | `~/.hermes/.env` に `STEPFUN_API_KEY`（provider: `stepfun`） |
| **LM Studio** | `hermes model` → 「LM Studio」（provider: `lmstudio`。任意で `LM_API_KEY`） |
| **独自エンドポイント** | `hermes model` → 「Custom endpoint」を選びます（`config.yaml` に保存されます） |

公式の API キーを使う手順は、専用の [Google Gemini の手引き](/hermes/docs/guides/google-gemini/)を参照してください。

:::tip モデルのキーの別名
`model:` の節では、モデル ID を書くキー名として `default:` と `model:` のどちらも使えます。`model: { default: my-model }` と `model: { model: my-model }` はまったく同じ意味です。
:::

### Nous Portal {#nous-portal}

[Nous Portal](https://portal.nousresearch.com) は Nous Research が提供する定額の統合ゲートウェイで、**Hermes Agent を動かすうえで推奨される方法**です。OAuth で一度ログインすれば、エージェント向けのフロンティアモデル 300 以上（Claude、GPT、Gemini、DeepSeek、Qwen、Kimi、GLM、MiniMax、Grok など）と [Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/)（Web 検索、画像生成、音声合成、ブラウザ操作）がまとめて使えます。プロバイダごとにアカウントを持つのではなく、Nous の契約から請求されます。

```bash
hermes setup --portal     # fresh install — OAuth + provider + gateway in one command
hermes model              # existing install — pick "Nous Portal" from the list
hermes portal info        # inspect login + routing at any time
```

まだ契約していない場合は [portal.nousresearch.com/manage-subscription](https://portal.nousresearch.com/manage-subscription) で申し込んでください。

**詳しくは：** 専用の [Nous Portal 連携ページ](/hermes/docs/integrations/nous-portal/)（契約に含まれるもの、モデルのカタログ、困ったときの対処）と、手順を追った [Nous Portal で Hermes Agent を動かす手引き](/hermes/docs/guides/run-hermes-with-nous-portal/)を参照してください。

**クライアントの識別。** Hermes Agent から Portal へのリクエストには、必ず `client=hermes-client-v<version>` という印が付きます（たとえば `client=hermes-client-v0.13.0`）。これは入っている版に自動で合わせられます。主なチャットのやり取り、補助の呼び出し、圧縮の要約、Web の本文抽出まで、Portal を通るすべての経路で送られ、Portal 側の計測で Hermes の通信を他のクライアントと区別できるようにしています。設定は不要で、`hermes update` すると印も自動で更新されます。

**JWT による認証（自動）。** Hermes は Portal へのリクエストに、権限を絞った `inference:invoke` の JWT を優先して使い、旧来の不透明なセッションキーの経路は予備として残しています。設定は不要で、認証情報は OAuth の流れが管理し、意識せず入れ替わります。失効したリフレッシュトークンは、送り直しの繰り返しを避けるために隔離されます。

:::info Codex についての注記
OpenAI Codex のプロバイダはデバイスコードで認証します（URL を開いてコードを入力します）。Hermes は得られた認証情報を自前の保管場所（`~/.hermes/auth.json`）に置き、`~/.codex/auth.json` があれば既存の Codex CLI の認証情報を取り込めます。Codex CLI を入れる必要はありません。

トークンの更新が回復不能なエラー（HTTP 4xx、`invalid_grant`、失効した許可など）で失敗した場合、Hermes はそのリフレッシュトークンを死んだものとして印を付け、送り直すのをやめます。同じ認証エラーが延々と並ぶのを防ぐためです。次のリクエストでは、代わりに再認証を促すはっきりしたメッセージが出ます。`hermes auth add openai-codex`（または `hermes model` → **ChatGPT or Codex Subscription**）を実行してデバイスコードのログインをやり直してください。隔離は次に交換が成功した時点で解除されます。
:::

:::warning
Nous Portal、Codex、独自エンドポイントのいずれを使っていても、一部のツール（画像の読み取り、Web の要約、MoA）は「補助」用の別のモデルを使います。既定（`auxiliary.*.provider: "auto"`）では、Hermes はこれらを**主に使っているチャットのモデル**、つまり `hermes model` で選んだのと同じモデルへ回します。作業ごとに個別に上書きして、より安く速いモデル（たとえば OpenRouter の Gemini Flash）へ回すこともできます。[補助モデル](/hermes/docs/user-guide/configuration/#auxiliary-models)を参照してください。
:::

:::tip Nous Tool Gateway
Nous Portal の有料契約者は **[Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/)** も使えます。Web 検索、画像生成、音声合成、ブラウザ操作が契約を通ります。追加の API キーは要りません。新規導入なら `hermes setup --portal` の 1 本で、ログイン、Nous をプロバイダに設定、ゲートウェイの有効化まで済みます。すでに使っている場合は `hermes model` から、あるいはツールごとに `hermes tools` から有効にできます。どこを通っているかは `hermes portal info` でいつでも確認できます。
:::

### モデル管理の 2 つのコマンド {#two-commands-for-model-management}

Hermes には目的の違うモデル関連のコマンドが **2 つ**あります。

| コマンド | どこで実行するか | 何をするか |
|---------|-------------|--------------|
| **`hermes model`** | 端末（セッションの外） | 設定ウィザードの全体。プロバイダの追加、OAuth の実行、API キーの入力、エンドポイントの設定 |
| **`/model`** | Hermes のチャットセッションの中 | **設定済みの**プロバイダとモデルの間をすばやく切り替える |

まだ設定していないプロバイダへ移りたいとき（たとえば OpenRouter しか設定していないのに Anthropic を使いたいとき）は、`/model` ではなく `hermes model` が必要です。先にセッションを抜けて（`Ctrl+C` か `/quit`）、`hermes model` を実行し、プロバイダの設定を終えてから新しいセッションを始めてください。

### 定額プラン：そのプランで何がまかなえるのか {#subscription-plans-what-your-plan-pays-for}

いくつかのプロバイダでは、API キーの代わりに**個人向けの定額契約**（Claude Max、ChatGPT、SuperGrok / X Premium+ など）で Hermes にサインインできます。その契約が実際に何をまかない、何をまかなわないのかはプロバイダごとに違い、請求で驚く原因のいちばんの元になっています。下の表は要点だけです。詳しくは各プロバイダの節を見てください。

> *記載なし*と書かれた欄は、文字どおりそのままの意味です。Hermes のドキュメントがまだその挙動を定めていません。決めつけず、提供元の請求画面で確かめ、未解決の問いとして扱ってください。

| プラン・経路 | Hermes で使えるか | 何が消費されるか | 何は消費されないか | よくある驚き |
|---|---|---|---|---|
| **Anthropic — Claude Max ＋ OAuth** | ✅ 使えます。`hermes model` → Anthropic の OAuth。Max **かつ**追加購入した利用枠が必要です | Max プランの上に足した**追加分の利用枠** | **Max プランに元から含まれる枠**（Claude Code で既定で使える分） | Max に含まれる枠が手つかずのまま、Hermes の利用がすべて「追加利用」として請求されます |
| **Anthropic — Claude Pro** | ❌ 使えません。Pro の契約者はこの OAuth の経路を使えません | 何も消費されません（経路が使えないため） | Pro の契約 | Pro でも使えそうに見えますが、使えません。代わりに `ANTHROPIC_API_KEY` を使ってください（トークン従量課金で、Claude の契約とは無関係です） |
| **OpenAI Codex — ChatGPT プランの OAuth** | ✅ 使えます。`hermes model` → **ChatGPT or Codex Subscription**（ChatGPT のデバイスコードでログインし、Codex のモデルを使います） | *記載なし* | *記載なし* | ドキュメントが扱っているのは認証とトークンの更新だけで、プランの枠の扱いはまだ書かれていません |
| **xAI — SuperGrok / X Premium+ の OAuth** | ✅ 使えます。ブラウザでの OAuth で、API キーは不要です | **契約の枠**（X Search については明記されています。API キーより OAuth が優先され、「API の支払いではなく契約の枠を使う」とされています）。それ以外の推論の枠の扱いは *記載なし* | OAuth の認証情報が設定され優先されている間は、`XAI_API_KEY` によるトークン従量課金の支払い | ログインに成功したのに `HTTP 403` が返る。アプリ内の契約が生きていても、xAI が OAuth の API 利用を特定の SuperGrok の等級に限っているためです |
| **Google — Gemini の個人向けプラン（Google AI Pro / Ultra）** | ❌ 使える経路は書かれていません。`gemini` は API キー方式のみ（`GOOGLE_API_KEY` / `GEMINI_API_KEY`）で、Vertex AI は GCP の課金を使います | **その API キーの枠**（無料枠、または課金を有効にした Google Cloud のプロジェクト）。*個人向けプランの消費については記載なし* | *記載なし* | 無料枠のキーは、エージェントの数往復で尽きることがあります。Hermes は利用者の 1 往復につきモデルを何度か呼ぶことがあるためです |

**Anthropic。** OAuth の経路は Claude Code として Anthropic のアカウントに接続し、**Claude Max プランで追加の利用枠を購入している場合にだけ動きます**。Max に元から含まれる枠が Hermes に使われることはなく、その上に足した追加分だけが減ります。Claude Pro の契約者はこの経路を使えません。代わりに用意されているのは `ANTHROPIC_API_KEY` で、そのキーの所属組織に対して標準の API 料金でトークン従量課金されます。下の [Anthropic（ネイティブ）](#anthropic-native)を参照してください。

**OpenAI Codex。** Hermes は ChatGPT のデバイスコード方式の OAuth で認証し、認証情報を `~/.hermes/auth.json` に保存します。既存の Codex CLI の認証情報を `~/.codex/auth.json` から取り込むこともできます。どの ChatGPT プランが対象になるのか、Hermes の利用がプランの Codex の上限にどう数えられるのかは、**まだ書かれていません**。[Nous Portal](#nous-portal) の下にある Codex の注記が扱っているのは、認証とトークンの更新の挙動だけです。

**xAI（SuperGrok / X Premium+）。** ブラウザでの OAuth は、有効な SuperGrok の契約か、連携した X アカウントの X Premium+ の契約があれば使えます。同じベアラートークンは、xAI へ直接つなぐツール（音声合成、画像生成、動画生成、文字起こし、X Search）でも使い回されます。ログインに成功したのに推論が `HTTP 403` を返す場合、それはトークンが古いのではなく xAI 側の等級や権限の制限です。回避策は `XAI_API_KEY` に切り替えることです。下の [xAI (Grok)](#xai-grok--responses-api--prompt-caching) と [xAI Grok OAuth の手引き](/hermes/docs/guides/xai-grok-oauth/)を参照してください。

**Google Gemini。** 個人向けの Gemini の契約で Hermes にサインインする方法は、今のところありません。`gemini` は API キーを受け取り、[Google Vertex AI](#google-vertex-ai) は GCP のプロジェクトへ請求されます。エージェントとして使うなら、課金を有効にした Google Cloud のプロジェクトをおすすめします。無料枠は、長く続くエージェントのセッションには小さすぎます。[Google Gemini の手引き](/hermes/docs/guides/google-gemini/)を参照してください。

:::tip 5 つの契約ではなく 1 つで
プロバイダごとのプランの細かい違いを追いかけたくないなら、[Nous Portal](#nous-portal) が 1 回の OAuth と 1 つの契約で 300 以上のモデルをまかないます。
:::

### Anthropic（ネイティブ） {#anthropic-native}

OpenRouter を挟まず、Anthropic の API から Claude のモデルを直接使います。認証は 3 通りに対応しています。

:::caution Claude Max の「追加利用」枠が必要です
`hermes model` → Anthropic の OAuth（または `hermes auth add anthropic --type oauth`）で認証すると、Hermes は Claude Code として Anthropic のアカウントに接続します。**これは Claude Max プランで、追加の利用枠を購入している場合にだけ動きます。** Max に元から含まれる枠（Claude Code で既定で使える分）が Hermes に消費されることはなく、その上に足した追加分だけが減ります。Claude Pro の契約者はこの経路を使えません。

Max と追加枠がない場合は、代わりに `ANTHROPIC_API_KEY` を使ってください。そのキーの所属組織に対してトークン従量課金で請求されます（標準の API 料金で、Claude の契約とは無関係です）。
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

`hermes model` から Anthropic の OAuth を選ぶと、Hermes はトークンを `~/.hermes/.env` に写すより、Claude Code 自身の保管場所を使うことを優先します。更新できる Claude の認証情報を、更新できるまま保つためです。

設定に書いて固定することもできます。
```yaml
model:
  provider: "anthropic"
  default: "claude-sonnet-4-6"
```

:::tip 別名
`--provider claude` と `--provider claude-code` も `--provider anthropic` の短い書き方として使えます。
:::

### GitHub Copilot {#github-copilot}

Hermes は GitHub Copilot を正式なプロバイダとして扱い、2 つの方式に対応しています。

**`copilot` — Copilot の API を直接使う**（推奨）。GitHub Copilot の契約を使って、Copilot の API 越しに GPT-5.x、Claude、Gemini などのモデルを使います。

```bash
hermes chat --provider copilot --model gpt-5.4
```

**認証の選択肢**（この順に調べます）。

1. 環境変数 `COPILOT_GITHUB_TOKEN`
2. 環境変数 `GH_TOKEN`
3. 環境変数 `GITHUB_TOKEN`
4. `gh auth token` コマンドによる取得

どのトークンも見つからない場合、`hermes model` が **OAuth のデバイスコードでのログイン**を案内します。Copilot CLI や opencode が使っているのと同じ流れです。

:::warning トークンの種類
Copilot の API は、旧来の個人用アクセストークン（`ghp_*`）に対応して**いません**。使えるのは次の種類です。

| 種類 | 接頭辞 | 取り方 |
|------|--------|------------|
| OAuth トークン | `gho_` | `hermes model` → GitHub Copilot → GitHub でログイン |
| きめ細かい PAT | `github_pat_` | GitHub の Settings → Developer settings → Fine-grained tokens（**Copilot Requests** の権限が要ります） |
| GitHub App のトークン | `ghu_` | GitHub App の導入を通じて |

`gh auth token` が `ghp_*` のトークンを返す場合は、代わりに `hermes model` から OAuth で認証してください。
:::

:::info Hermes での Copilot 認証の動き
Hermes は対応するトークン（`gho_*`、`github_pat_*`、`ghu_*`）を `api.githubcopilot.com` へ直接送り、Copilot 固有のヘッダー（`Editor-Version`、`Copilot-Integration-Id`、`Openai-Intent`、`x-initiator`）を添えます。

HTTP 401 が返ったとき、Hermes は代替へ移る前に一度だけ認証情報の立て直しを試みます。

1. 通常の優先順位（`COPILOT_GITHUB_TOKEN` → `GH_TOKEN` → `GITHUB_TOKEN` → `gh auth token`）でトークンを取り直します
2. 更新したヘッダーで共有の OpenAI クライアントを作り直します
3. リクエストを 1 回だけやり直します

古いコミュニティ製の中継の中には、`api.github.com/copilot_internal/v2/token` での交換を使うものがあります。このエンドポイントはアカウントの種類によっては使えません（404 が返ります）。そのため Hermes はトークンを直接送る方式を主な経路として保ち、実行時の認証情報の取り直しとやり直しで安定性を確保しています。
:::

**API の振り分け**：GPT-5 以降のモデル（`gpt-5-mini` を除く）は自動的に Responses API を使います。それ以外のモデル（GPT-4o、Claude、Gemini など）は Chat Completions を使います。モデルは Copilot の最新カタログから自動で判別されます。

**`copilot-acp` — Copilot の ACP エージェントを使う**。手元の Copilot CLI を子プロセスとして起動します。

```bash
hermes chat --provider copilot-acp --model copilot-acp
# Requires the GitHub Copilot CLI in PATH and an existing `copilot login` session
```

**設定に書いて固定する場合：**
```yaml
model:
  provider: "copilot"
  default: "gpt-5.4"
```

| 環境変数 | 説明 |
|---------------------|-------------|
| `COPILOT_GITHUB_TOKEN` | Copilot API 用の GitHub のトークン（最優先） |
| `HERMES_COPILOT_ACP_COMMAND` | Copilot CLI の実行ファイルのパスを上書きします（既定: `copilot`） |
| `HERMES_COPILOT_ACP_ARGS` | ACP の引数を上書きします（既定: `--acp --stdio`） |

### 標準で対応している API キー方式のプロバイダ {#first-class-api-key-providers}

次のプロバイダには専用の ID が用意されていて、はじめから対応しています。API キーを設定し、`--provider` で選んでください。

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

Fireworks は `accounts/fireworks/models/kimi-k2p6` のような、スラッシュを含む独自のカタログ ID を使います。`hermes model` を実行して **Fireworks AI** を選び、最新のカタログから選ぶか、別の Fireworks のモデル ID を入力してください。既定のエンドポイントは `https://api.fireworks.ai/inference/v1` です。別のエンドポイントを使うときは `.env` ではなく `config.yaml` の `model.base_url` で設定します。

`config.yaml` に書いて固定することもできます。
```yaml
model:
  provider: "gmi"
  default: "zai-org/GLM-5.1-FP8"
```

ベース URL は、環境変数 `NOVITA_BASE_URL`、`GLM_BASE_URL`、`KIMI_BASE_URL`、`MINIMAX_BASE_URL`、`MINIMAX_CN_BASE_URL`、`DASHSCOPE_BASE_URL`、`XIAOMI_BASE_URL`、`GMI_BASE_URL`、`META_BASE_URL`、`TOKENHUB_BASE_URL` で上書きできます。

:::note Meta の貢献者向け枠
`muse-spark-1.2-contributor` は Meta の割引枠です。Meta が入力と出力を学習に使う可能性があるため、使う前に[対話的なモデル選択で確認を求めます](/hermes/docs/user-guide/configuring-models/)。秘密を扱う作業には `muse-spark-1.2`（通常料金、学習に使われません）を選んでください。
:::

:::note Z.AI のエンドポイントの自動判別
Z.AI / GLM を使うとき、Hermes は複数のエンドポイント（グローバル、中国、コーディング向け）を自動で試し、その API キーを受け付けるものを見つけます。`GLM_BASE_URL` を手で設定する必要はありません。通ったエンドポイントが自動で見つかり、記憶されます。
:::

### xAI (Grok) — Responses API とプロンプトキャッシュ {#xai-grok-responses-api-prompt-caching}

xAI は Responses API（`codex_responses` の通信方式）につながっており、Grok 4 系のモデルでは推論が自動で働きます。`reasoning_effort` を指定する必要はなく、サーバー側が既定で考えます。`~/.hermes/.env` に `XAI_API_KEY` を設定して `hermes model` で xAI を選ぶか、`/model grok-4-fast-reasoning` のように `grok` を近道として指定してください。

SuperGrok と X Premium+ の契約者は、API キーの代わりにブラウザでの OAuth でサインインできます。`hermes model` で **xAI Grok OAuth (SuperGrok / Premium+)** を選ぶか、`hermes auth add xai-oauth` を実行してください。同じ OAuth のベアラートークンは、xAI へ直接つなぐツール（音声合成、画像生成、動画生成、文字起こし）でも自動的に使い回されます。全体の流れは [xAI Grok OAuth の手引き](/hermes/docs/guides/xai-grok-oauth/)にあります。Hermes をリモートのホストで動かしている場合は、必要な `ssh -L` のトンネルについて [SSH 越しの OAuth / リモートホスト](/hermes/docs/guides/oauth-over-ssh/)も参照してください。

xAI をプロバイダとして使っているとき（ベース URL に `x.ai` を含む場合）、Hermes はすべての API リクエストに `x-grok-conv-id` ヘッダーを添えて、プロンプトキャッシュを自動で有効にします。これにより会話の中でリクエストが同じサーバーへ届き、xAI 側でシステムプロンプトや会話の履歴のキャッシュを使い回せます。

設定は不要です。xAI のエンドポイントが見つかり、セッション ID が使える状態なら自動で働きます。何往復もする会話で、待ち時間と費用が減ります。

xAI は音声合成の専用エンドポイント（`/v1/tts`）も出しています。`hermes tools` → Voice & TTS で **xAI TTS** を選ぶか、設定については [Voice & TTS](/hermes/docs/user-guide/features/tts/#text-to-speech) のページを参照してください。

**引退する xAI モデルの移行（2026 年 5 月 15 日）：** xAI は `grok-4*`、`grok-3`、`grok-code-fast-1`、`grok-imagine-image-pro` を 2026-05-15 に終了します。`hermes doctor` と `hermes chat` の起動時のどちらも、引退する名前を指したままの設定を見つけて、推奨される置き換え先を表示します。設定を一括で書き換えるには `hermes migrate xai` を使ってください。既定は下見だけで、`--apply` を付けると実際に書き換わります（`config.yaml.bak-pre-migrate-xai-*` という日時入りのバックアップが自動で作られます）。

```bash
hermes migrate xai          # preview replacements
hermes migrate xai --apply  # rewrite ~/.hermes/config.yaml in place
```

**xAI の Web 検索。** [Web 検索](/hermes/docs/user-guide/features/web-search/)のツール群を有効にしているとき、`web.backend: xai` にすると、同じ `XAI_API_KEY` や OAuth の認証情報を使って xAI の検索エンドポイントを通ります。xAI をすでにプロバイダとして設定してあれば、追加の準備は要りません。

### NovitaAI {#novitaai}

[NovitaAI](https://novita.ai) は、作り手とエージェントのための AI 向けクラウドです。3 つの柱があり、200 以上のモデルを扱う Model API、AI エージェントを作って動かす Agent Sandbox、規模を伸ばせる計算資源の GPU Cloud が、1 つの基盤から使えます。

```bash
# Use any available model
hermes chat --provider novita --model moonshotai/kimi-k2.5
# Requires: NOVITA_API_KEY in ~/.hermes/.env

# Short alias
hermes chat --provider novita-ai --model deepseek/deepseek-v3-0324
```

`config.yaml` に書いて固定することもできます。
```yaml
model:
  provider: "novita"
  default: "moonshotai/kimi-k2.5"
  base_url: "https://api.novita.ai/openai/v1"
```

API キーは [novita.ai/settings/key-management](https://novita.ai/settings/key-management) で取得します。ベース URL は `NOVITA_BASE_URL` で上書きできます。

### Ollama Cloud — 運用込みの Ollama モデル、OAuth と API キー {#ollama-cloud-managed-ollama-models-oauth-api-key}

[Ollama Cloud](https://ollama.com/cloud) は、手元の Ollama と同じ公開重みのカタログを、GPU なしで使えるようにしたものです。`hermes model` で **Ollama Cloud** を選び、[ollama.com/settings/keys](https://ollama.com/settings/keys) の API キーを貼り付ければ、Hermes が使えるモデルを自動で見つけます。

```bash
hermes model
# → pick "Ollama Cloud"
# → paste your OLLAMA_API_KEY
# → select from discovered models (gpt-oss:120b, glm-4.6:cloud, qwen3-coder:480b-cloud, etc.)
```

`config.yaml` に直接書いてもかまいません。
```yaml
model:
  provider: "ollama-cloud"
  default: "gpt-oss:120b"
```

モデルのカタログは `ollama.com/v1/models` から動的に取得され、1 時間だけ記憶されます。`model:tag` の書き方（たとえば `qwen3-coder:480b-cloud`）は正規化を通しても保たれます。ハイフンに置き換えないでください。

:::tip Ollama Cloud と手元の Ollama
どちらも同じ OpenAI 互換の API を話します。クラウド版は正式なプロバイダで（`--provider ollama-cloud`、`OLLAMA_API_KEY`）、手元の Ollama は独自エンドポイントの流れでつなぎます（ベース URL は `http://localhost:11434/v1`、キーは不要）。手元では動かせない大きなモデルにはクラウドを、秘密を守りたいときや通信のない場所では手元のものを使ってください。
:::

### AWS Bedrock {#aws-bedrock}

AWS Bedrock 経由で、Anthropic Claude、Amazon Nova、DeepSeek v3.2、Meta Llama 4 などのモデルを使えます。認証は AWS の SDK（`boto3`）の連鎖を使うので、API キーは要らず、いつもの AWS の認証で足ります。

```bash
# Simplest — named profile in ~/.aws/credentials
hermes chat --provider bedrock --model us.anthropic.claude-sonnet-4-6

# Or with explicit env vars
AWS_PROFILE=myprofile AWS_REGION=us-east-1 hermes chat --provider bedrock --model us.anthropic.claude-sonnet-4-6
```

`config.yaml` に書いて固定することもできます。
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

認証には boto3 の標準の連鎖を使います。明示した `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`、`~/.aws/credentials` の `AWS_PROFILE`、EC2 / ECS / Lambda の IAM ロール、IMDS、SSO のいずれかです。AWS CLI ですでに認証が済んでいれば、環境変数は要りません。

Bedrock は内部で **Converse API** を使います。リクエストは Bedrock のモデルに依らない形へ変換されるので、同じ設定が Claude、Nova、DeepSeek、Llama のどれでも通ります。`BEDROCK_BASE_URL` は、既定以外のリージョンのエンドポイントを呼ぶときにだけ設定してください。

IAM の設定、リージョンの選び方、リージョンをまたぐ推論については、[AWS Bedrock の手引き](/hermes/docs/guides/aws-bedrock/)に一連の手順があります。

### Google Vertex AI {#google-vertex-ai}

Google Cloud の Vertex AI が持つ OpenAI 互換のエンドポイント経由で、Gemini のモデルを使います。認証は **OAuth2** で、サービスアカウントの JSON かアプリケーションの既定の認証情報（ADC）から発行される、1 時間ほどの短命なアクセストークンを使います。**固定の API キーはありません。** トークンの発行と自動更新は Hermes が行い、セッションの途中で `401` が返ったときの再発行も含めて面倒を見ます。

```bash
# Service account JSON (recommended for servers / gateways)
echo "VERTEX_CREDENTIALS_PATH=/path/to/service-account.json" >> ~/.hermes/.env
# or Application Default Credentials
gcloud auth application-default login

hermes model   # → "Google Vertex AI" → project → region → model
```

`config.yaml` に書く場合はこうします（プロジェクトとリージョンは秘密ではないのでここに置き、認証情報のパスは `.env` に残します）。
```yaml
model:
  provider: "vertex"
  default: "google/gemini-3-flash-preview"   # Vertex requires the google/ prefix
vertex:
  project_id: "my-gcp-project"   # blank → use the project embedded in the credentials
  region: "global"               # required for the Gemini 3.x previews
```

環境変数 `VERTEX_PROJECT_ID` / `VERTEX_REGION` は `config.yaml` の値より優先されます。Hermes は初回の利用時に `google-auth` を必要に応じて入れます。管理された導入の修復が要るときは `hermes setup` を実行してください。一連の手順は [Google Vertex AI の手引き](/hermes/docs/guides/google-vertex/)に、固定の API キーを使う AI Studio の経路は [Google Gemini の手引き](/hermes/docs/guides/google-gemini/)にあります。

### Qwen Portal（OAuth） {#qwen-portal-oauth}

Alibaba の Qwen Portal に、ブラウザでの OAuth でログインします。`hermes model` で **Qwen OAuth (Portal)** を選び、ブラウザでサインインすると、Hermes がリフレッシュトークンを保存します。

```bash
hermes model
# → pick "Qwen OAuth (Portal)"
# → browser opens; sign in with your Alibaba account
# → confirm — credentials are saved to ~/.hermes/auth.json

hermes chat   # uses portal.qwen.ai/v1 endpoint
```

`config.yaml` で設定することもできます。
```yaml
model:
  provider: "qwen-oauth"
  default: "qwen3-coder-plus"
```

`HERMES_QWEN_BASE_URL` は、ポータルのエンドポイントが移動したときにだけ設定してください（既定は `https://portal.qwen.ai/v1`）。

:::tip Qwen OAuth と Qwen Cloud（Alibaba DashScope）
`qwen-oauth` は個人向けの Qwen Portal に OAuth でログインするもので、個人での利用に向いています。`alibaba` は `DASHSCOPE_API_KEY` を使う Qwen Cloud（Alibaba DashScope）で、プログラムからの利用や本番の負荷に向いています。どちらも Qwen 系のモデルにつながりますが、エンドポイントは別です。
:::

### Alibaba Cloud（Coding Plan） {#alibaba-cloud-coding-plan}

Alibaba の **Coding Plan**（通常の DashScope の API 利用とは別の課金の種類）を契約している場合、Hermes はそれを `alibaba-coding-plan` という独立したプロバイダとして扱います。エンドポイントは `https://coding-intl.dashscope.aliyuncs.com/v1` です。通常の `alibaba` と同じく OpenAI 互換ですが、ベース URL と請求の枠が別になります。

```yaml
model:
  provider: alibaba_coding     # alias for alibaba-coding-plan
  model: qwen3-coder-plus
```

コマンドから指定するならこうです。

```bash
hermes chat --provider alibaba_coding --model qwen3-coder-plus
```

`alibaba_coding` は、`alibaba` の設定ですでに使っている `DASHSCOPE_API_KEY` をそのまま使います。別のキーは要らず、宛先だけが変わります。このプロバイダが登録される前は、`config.yaml` に `provider: alibaba_coding` と書いた人は黙って OpenRouter へ流れていました。

中国本土向けのエンドポイント（`alibaba-coding-plan-cn`、`https://coding.dashscope.aliyuncs.com/v1`）を使うには `ALIBABA_CODING_PLAN_CN_API_KEY` を設定します。CN 側も `ALIBABA_CODING_PLAN_API_KEY` / `DASHSCOPE_API_KEY` に落ちる作りですが、共通のキーしか設定していないと `/model` の一覧には国際版の行しか出ません。CN 側を出すには CN のキーを設定するか、`config.yaml` に `provider: alibaba-coding-plan-cn` と書いてください。`alibaba-token-plan-cn` と `ALIBABA_TOKEN_PLAN_CN_API_KEY` の関係も同じです。

### MiniMax（OAuth） {#minimax-oauth}

ブラウザでの OAuth ログインで MiniMax-M2.7 を使います。API キーは要りません。`hermes model` で **MiniMax (OAuth)** を選び、ブラウザでサインインすると、Hermes がアクセストークンとリフレッシュトークンを保存します。内部では Anthropic Messages 互換のエンドポイント（`/anthropic`）を使います。

```bash
hermes model
# → pick "MiniMax (OAuth)"
# → browser opens; sign in with your MiniMax account (global or CN region)
# → confirm — credentials are saved to ~/.hermes/auth.json

hermes chat   # uses api.minimax.io/anthropic endpoint
```

`config.yaml` で設定することもできます。
```yaml
model:
  provider: "minimax-oauth"
  default: "MiniMax-M2.7"
```

対応するモデルは `MiniMax-M2.7`（主用途）と `MiniMax-M2.7-highspeed`（補助モデルの既定として組み込まれています）です。OAuth の経路では `MINIMAX_API_KEY` / `MINIMAX_BASE_URL` は無視されます。

:::tip MiniMax の OAuth と API キー
`minimax-oauth` は MiniMax の個人向けポータルに OAuth でログインするもので、請求の設定は要りません。`minimax` と `minimax-cn` は `MINIMAX_API_KEY` / `MINIMAX_CN_API_KEY` を使い、プログラムからの利用向けです。一連の手順は [MiniMax OAuth の手引き](/hermes/docs/guides/minimax-oauth/)にあります。
:::

### NVIDIA NIM {#nvidia-nim}

[build.nvidia.com](https://build.nvidia.com)（無料の API キー）または手元の NIM のエンドポイント経由で、Nemotron などの公開モデルを使います。

```bash
# Cloud (build.nvidia.com)
hermes chat --provider nvidia --model nvidia/nemotron-3-super-120b-a12b
# Requires: NVIDIA_API_KEY in ~/.hermes/.env

# Local NIM endpoint — override base URL
NVIDIA_BASE_URL=http://localhost:8000/v1 hermes chat --provider nvidia --model nvidia/nemotron-3-super-120b-a12b
```

`config.yaml` に書いて固定することもできます。
```yaml
model:
  provider: "nvidia"
  default: "nvidia/nemotron-3-super-120b-a12b"
```

:::tip 手元の NIM
自社の設備で動かす場合（DGX Spark、手元の GPU）は、`NVIDIA_BASE_URL=http://localhost:8000/v1` を設定してください。NIM は build.nvidia.com と同じ OpenAI 互換のチャット API を出しているので、クラウドと手元の切り替えは環境変数 1 行で済みます。
:::

Hermes は `build.nvidia.com` へのリクエストごとに、NIM の課金元を示すヘッダーを自動で付けます。設定は要りません。これにより NVIDIA の請求画面で、消費が正しい区分に集計されます。

### GMI Cloud {#gmi-cloud}

[GMI Cloud](https://www.gmicloud.ai/) 経由で、公開モデルや推論向けモデルを使います。OpenAI 互換の API で、認証は API キーです。

```bash
# GMI Cloud
hermes chat --provider gmi --model deepseek-ai/DeepSeek-V3.2
# Requires: GMI_API_KEY in ~/.hermes/.env
```

`config.yaml` に書いて固定することもできます。
```yaml
model:
  provider: "gmi"
  default: "deepseek-ai/DeepSeek-V3.2"
```

ベース URL は `GMI_BASE_URL` で上書きできます（既定は `https://api.gmi-serving.com/v1`）。

### Actual Computer {#actual-computer}

[Actual Computer](https://actual.inc) を使って、自分の機材を専用の推論クラスタにします。動かし方は 2 通りで、どちらも OpenAI 互換です（Hermes は Responses API の通信方式を使います）。

- **ホスト型の中継** — `https://api.actual.inc`。端から端まで暗号化され、*自分の*クラスタへ届きます。[actual.inc/user/keys](https://actual.inc/user/keys) で発行する `ac_` 形式の推論キーで認証します。
- **手元のデーモン** — 端末上の `http://127.0.0.1:8080` で、完全に通信なしで動きます。API キーは不要です。Hermes はループバックのベース URL を見分け、内部の仮の値で自動的に認証します。

```bash
# Hosted relay (ACTUAL_API_KEY in ~/.hermes/.env)
hermes chat --provider actual --model <model-id-from-your-cluster>

# Local daemon (ACTUAL_BASE_URL=http://127.0.0.1:8080 in ~/.hermes/.env, no key)
hermes chat --provider actual --model <installed-model-name>
```

`config.yaml` に書いて固定することもできます。
```yaml
model:
  provider: "actual"
  default: "<model-id>"
```

補足です。
- モデル ID はクラスタの `GET /v1/models` から得られます。`hermes model` か `curl -s https://api.actual.inc/v1/models -H "Authorization: Bearer $ACTUAL_API_KEY"` で確かめてください。
- ホスト名だけの指定は整えられます。`ACTUAL_BASE_URL=http://127.0.0.1:8080` は自動で `http://127.0.0.1:8080/v1` になります。
- 推論の強さは Actual が対応する範囲（`none/low/medium/high/max`）に収められます。全体の設定が `xhigh` や `ultra` でも、リクエストが 400 になることはありません。
- 小さなモデルを手元で動かす場合：Hermes の既定のツール一式とシステムプロンプトを合わせると 32k の文脈を超えることがあり、llama.cpp 系のサーバーから空の応答のエラーが返ります。ツールを絞る（`-t file,web`）か、より大きな文脈でモデルを読み込んでください。任意で入れられる `actual-setup` スキル（`hermes skills install official/devops/actual-setup`）が、設定と対処を詳しく扱っています。
- 別名: `actual-computer`、`actualcomputer`、`aci`。

### StepFun {#stepfun}

[StepFun](https://platform.stepfun.com) 経由で Step 系のモデルを使います。OpenAI 互換の API で、認証は API キーです。

```bash
# StepFun
hermes chat --provider stepfun --model step-3.5-flash
# Requires: STEPFUN_API_KEY in ~/.hermes/.env
```

`config.yaml` に書いて固定することもできます。
```yaml
model:
  provider: "stepfun"
  default: "step-3.5-flash"
```

ベース URL は `STEPFUN_BASE_URL` で上書きできます（既定は `https://api.stepfun.com/v1`）。

### Hugging Face Inference Providers {#hugging-face-inference-providers}

[Hugging Face Inference Providers](https://huggingface.co/docs/inference-providers) は、1 つの OpenAI 互換エンドポイント（`router.huggingface.co/v1`）から 20 以上の公開モデルへ振り分けます。リクエストはその時いちばん速いバックエンド（Groq、Together、SambaNova など）へ自動で回され、障害時の切り替えも自動です。

```bash
# Use any available model
hermes chat --provider huggingface --model Qwen/Qwen3.5-397B-A17B
# Requires: HF_TOKEN in ~/.hermes/.env

# Short alias
hermes chat --provider hf --model deepseek-ai/DeepSeek-V3.2
```

`config.yaml` に書いて固定することもできます。
```yaml
model:
  provider: "huggingface"
  default: "Qwen/Qwen3.5-397B-A17B"
```

トークンは [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) で取得します。「Make calls to Inference Providers」の権限を必ず有効にしてください。無料枠も含まれています（月 0.10 ドル分のクレジットで、提供元の料金に上乗せはありません）。

モデル名の後ろに振り分けの指定を足せます。`:fastest`（既定）、`:cheapest`、または `:provider_name` で特定のバックエンドを指定します。

ベース URL は `HF_BASE_URL` で上書きできます。

## 独自・自前運用の LLM プロバイダ {#custom-self-hosted-llm-providers}

Hermes Agent は **OpenAI 互換のエンドポイントなら何にでも**つながります。`/v1/chat/completions` を実装しているサーバーなら、Hermes を向けられます。つまり、手元のモデル、GPU の推論サーバー、複数の提供元をまとめる中継、あるいは外部の API を使えるということです。

### 全体の設定 {#general-setup}

独自エンドポイントの設定には 3 通りあります。

**対話的な設定（推奨）：**
```bash
hermes model
# Select "Custom endpoint (self-hosted / VLLM / etc.)"
# Enter: API base URL, API key, Model name
```

**手で書く（`config.yaml`）：**
```yaml
# In ~/.hermes/config.yaml
model:
  default: your-model-name
  provider: custom
  base_url: http://localhost:8000/v1
  api_key: your-key-or-leave-empty-for-local
```

:::warning 旧来の環境変数
`.env` の `LLM_MODEL` は**廃止されました**。モデルとエンドポイントの設定は `config.yaml` が唯一の正本です。`OPENAI_BASE_URL` はまだ効きますが、**`openai-api` プロバイダに限られます**（API キーで直接つなぐときの OpenAI のエンドポイントを上書きします）。他のプロバイダや独自エンドポイントでは、`hermes model` を使うか、`config.yaml` の `model.base_url` を直接設定してください。`.env` に古い記述が残っている場合は、次の `hermes setup` か設定の移行時に自動で消えます。
:::

どちらのやり方でも `config.yaml` に保存されます。モデル、プロバイダ、ベース URL の正本はここです。

### `/model` でモデルを切り替える {#switching-models-with-model}

:::warning hermes model と /model
**`hermes model`**（チャットの外、端末から実行）は**プロバイダ設定のウィザード全体**です。新しいプロバイダの追加、OAuth の実行、API キーの入力、独自エンドポイントの設定に使います。

**`/model`**（動いている Hermes のチャットの中で入力）は、**すでに設定してあるプロバイダとモデルの間を切り替える**ことしかできません。新しいプロバイダの追加も、OAuth の実行も、API キーの入力もできません。プロバイダを 1 つ（たとえば OpenRouter）しか設定していなければ、`/model` にはそのプロバイダのモデルしか出ません。

**新しいプロバイダを足すには：** セッションを抜けて（`Ctrl+C` か `/quit`）、`hermes model` を実行し、新しいプロバイダを設定してから、新しいセッションを始めてください。
:::

独自エンドポイントを 1 つでも設定すれば、セッションの途中でモデルを切り替えられます。

```
/model custom:qwen-2.5          # Switch to a model on your custom endpoint
/model custom                    # Auto-detect the model from the endpoint
/model openrouter:claude-sonnet-4 # Switch back to a cloud provider
```

**名前を付けた独自プロバイダ**を設定してある場合（下を参照）は、3 つ組の書き方を使います。

```
/model custom:local:qwen-2.5    # Use the "local" custom provider with model qwen-2.5
/model custom:work:llama3       # Use the "work" custom provider with llama3
```

プロバイダを切り替えると、Hermes はベース URL とプロバイダを設定に書き込むので、再起動しても変更が残ります。独自エンドポイントから組み込みのプロバイダへ移るときは、古いベース URL が自動で消されます。

:::tip
`/model custom`（モデル名なし）は、エンドポイントの `/models` を呼び、読み込まれているモデルがちょうど 1 つならそれを自動で選びます。モデルを 1 つだけ動かしている手元のサーバーで便利です。
:::

以下はどれも同じ形です。URL とキーとモデル名を変えるだけです。

---

### Ollama — 手元のモデルを設定なしで {#ollama-local-models-zero-config}

[Ollama](https://ollama.com/) はコマンド 1 本で公開重みのモデルを手元で動かします。向いているのは、手元でさっと試すこと、秘密を守りたい作業、通信のない環境です。OpenAI 互換の API を通じてツール呼び出しにも対応しています。

```bash
# Install and run a model
ollama pull qwen2.5-coder:32b
ollama serve   # Starts on port 11434
```

そのうえで Hermes を設定します。

```bash
hermes model
# Select "Custom endpoint (self-hosted / VLLM / etc.)"
# Enter URL: http://localhost:11434/v1
# Skip API key (Ollama doesn't need one)
# Enter model name (e.g. qwen2.5-coder:32b)
```

`config.yaml` を直接書いてもかまいません。

```yaml
model:
  default: qwen2.5-coder:32b
  provider: custom
  base_url: http://localhost:11434/v1
  context_length: 64000   # See warning below
```

:::caution Ollama の既定の文脈長はかなり短い
Ollama は既定では、モデルが持つ文脈の広さを使い切りません。VRAM の量によって、既定値はこうなります。

| 使える VRAM | 既定の文脈長 |
|----------------|----------------|
| 24 GB 未満 | **4,096 トークン** |
| 24〜48 GB | 32,768 トークン |
| 48 GB 以上 | 256,000 トークン |

Hermes Agent がツールを使って動くには、少なくとも **64,000 トークン**の文脈が要ります。それより狭いと起動時に断られます。システムプロンプト、ツールの定義、進行中の会話の状態を収めて、何段階もの作業を確実に進めるだけの余裕が必要だからです。

**広げ方**（どれか 1 つを選びます）。

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

**OpenAI 互換の API（`/v1/chat/completions`）からは文脈長を設定できません。** サーバー側か Modelfile で設定するしかありません。Ollama を Hermes のようなツールとつなぐときに、いちばん多く混乱を生むところです。
:::

**文脈長が正しく設定できたか確かめる：**

```bash
ollama ps
# Look at the CONTEXT column — it should show your configured value
```

:::tip
使えるモデルは `ollama list` で確認できます。[Ollama のライブラリ](https://ollama.com/library)からは `ollama pull <model>` で好きなモデルを取れます。GPU への割り振りは Ollama が自動で処理するので、たいていの環境では設定は要りません。
:::

---

### vLLM — GPU での高性能な推論 {#vllm-high-performance-gpu-inference}

[vLLM](https://docs.vllm.ai/) は本番で LLM を提供するときの定番です。向いているのは、GPU の性能を最大限に引き出すこと、大きなモデルを提供すること、連続的なまとめ処理です。

```bash
pip install vllm
vllm serve meta-llama/Llama-3.1-70B-Instruct \
  --port 8000 \
  --max-model-len 65536 \
  --tensor-parallel-size 2 \
  --enable-auto-tool-choice \
  --tool-call-parser hermes
```

そのうえで Hermes を設定します。

```bash
hermes model
# Select "Custom endpoint (self-hosted / VLLM / etc.)"
# Enter URL: http://localhost:8000/v1
# Skip API key (or enter one if you configured vLLM with --api-key)
# Enter model name: meta-llama/Llama-3.1-70B-Instruct
```

**文脈長：** vLLM は既定でモデルの `max_position_embeddings` を読みます。それが GPU のメモリを超えると、エラーになって `--max-model-len` を下げるよう促されます。`--max-model-len auto` を使えば、収まる最大値を自動で探せます。`--gpu-memory-utilization 0.95`（既定は 0.9）にすると、VRAM にもう少し文脈を詰め込めます。

**ツール呼び出しには明示的なフラグが要ります：**

| フラグ | 目的 |
|------|---------|
| `--enable-auto-tool-choice` | `tool_choice: "auto"`（Hermes の既定）に必要です |
| `--tool-call-parser <name>` | そのモデルのツール呼び出しの形式を読む解析器 |

使える解析器は `hermes`（Qwen 2.5、Hermes 2/3）、`llama3_json`（Llama 3.x）、`mistral`、`deepseek_v3`、`deepseek_v31`、`xlam`、`pythonic` です。これらのフラグがないとツール呼び出しは働かず、モデルはツール呼び出しを文章として書き出してしまいます。

**Qwen の推論解析器：** OpenAI 互換のサーバーが `reasoning`、`reasoning_content`、途中経過の推論の差分といった構造化された情報を返す場合、Hermes はそれを保ちます。ただしそれは思考の記録として扱うものであって、利用者に見える回答の代わりにはなりません。vLLM が提供する Qwen の推論モデルでは、最終的に利用者へ見せる応答が `content` に入るようにしてください。使っている環境で `--reasoning-parser qwen3` を付けると `content` が空になる場合は、その解析器を無効にするか、`extra_body` 経由で `chat_template_kwargs.enable_thinking: false` のような、サーバーが対応するリクエストの指定を渡してください。

:::tip
vLLM は人が読みやすい単位を受け付けます。`--max-model-len 64k`（小文字の k は 1000、大文字の K は 1024）のように書けます。
:::

---

### SGLang — RadixAttention による高速な提供 {#sglang-fast-serving-with-radixattention}

[SGLang](https://github.com/sgl-project/sglang) は vLLM の代わりになるもので、KV キャッシュを使い回す RadixAttention を備えています。向いているのは、何往復もする会話（前置きのキャッシュ）、制約付きの生成、決まった形式の出力です。

```bash
pip install "sglang[all]"
python -m sglang.launch_server \
  --model meta-llama/Llama-3.1-70B-Instruct \
  --port 30000 \
  --context-length 65536 \
  --tp 2 \
  --tool-call-parser qwen
```

そのうえで Hermes を設定します。

```bash
hermes model
# Select "Custom endpoint (self-hosted / VLLM / etc.)"
# Enter URL: http://localhost:30000/v1
# Enter model name: meta-llama/Llama-3.1-70B-Instruct
```

**文脈長：** SGLang は既定でモデルの設定から読みます。`--context-length` で上書きしてください。モデルが宣言する最大値を超えたい場合は、`SGLANG_ALLOW_OVERWRITE_LONGER_CONTEXT_LEN=1` を設定します。

**ツール呼び出し：** モデルの系統に合った解析器を `--tool-call-parser` で指定します。`qwen`（Qwen 2.5）、`llama3`、`llama4`、`deepseekv3`、`mistral`、`glm` です。このフラグがないと、ツール呼び出しはただの文字列として返ってきます。

:::caution SGLang の出力の既定は 128 トークン
応答が途中で切れているように見えるときは、リクエストに `max_tokens` を足すか、サーバー側で `--default-max-tokens` を設定してください。リクエストで指定しない場合、SGLang の既定は 1 応答あたり 128 トークンしかありません。
:::

---

### llama.cpp / llama-server — CPU と Metal での推論 {#llamacpp-llama-server-cpu-metal-inference}

[llama.cpp](https://github.com/ggml-org/llama.cpp) は、量子化したモデルを CPU、Apple Silicon（Metal）、市販の GPU で動かします。向いているのは、データセンター向けの GPU なしでモデルを動かすこと、Mac での利用、末端の機器への配置です。

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

**文脈長（`-c`）：** 最近の版の既定は `0` で、GGUF のメタデータからモデルの学習時の文脈長を読みます。学習時の文脈が 128k を超えるモデルでは、KV キャッシュを丸ごと確保しようとしてメモリが足りなくなることがあります。Hermes 向けには `-c` を明示して、少なくとも 64,000 トークンにしてください。並列の枠（`-np`）を使うと、全体の文脈が枠の数で割られます。`-c 64000 -np 4` なら 1 枠あたり 16k しかなく、動いているセッション 1 つに対する Hermes の下限を下回ります。

そのうえで、Hermes をそこに向けます。

```bash
hermes model
# Select "Custom endpoint (self-hosted / VLLM / etc.)"
# Enter URL: http://localhost:8080/v1
# Skip API key (local servers don't need one)
# Enter model name — or leave blank to auto-detect if only one model is loaded
```

これでエンドポイントが `config.yaml` に保存され、セッションをまたいで残ります。

:::caution ツール呼び出しには `--jinja` が要ります
`--jinja` がないと、llama-server は `tools` の指定をまるごと無視します。モデルは応答の文章に JSON を書いてツールを呼ぼうとしますが、Hermes はそれをツール呼び出しとして認識しません。実際の検索の代わりに、`{"name": "web_search", ...}` のような生の JSON がメッセージとして表示されることになります。

ツール呼び出しに元から対応しているモデル（性能が最も出ます）は、Llama 3.x、Qwen 2.5（Coder を含む）、Hermes 2/3、Mistral、DeepSeek、Functionary です。それ以外のモデルは汎用の処理を通り、動きはしますが効率は落ちることがあります。全体の一覧は [llama.cpp の関数呼び出しのドキュメント](https://github.com/ggml-org/llama.cpp/blob/master/docs/function-calling.md)を参照してください。

ツール対応が効いているかは `http://localhost:8080/props` を見て確かめられます。`chat_template` の項目があるはずです。
:::

:::tip
GGUF のモデルは [Hugging Face](https://huggingface.co/models?library=gguf) から取得できます。Q4_K_M の量子化は、品質とメモリ使用量の釣り合いがいちばんよく取れます。
:::

---

### LM Studio — 手元のモデルを動かすデスクトップアプリ {#lm-studio-desktop-app-with-local-models}

[LM Studio](https://lmstudio.ai/) は、画面から手元のモデルを動かせるデスクトップアプリです。向いているのは、目で見える操作を好む人、モデルをさっと試したいとき、macOS / Windows / Linux の開発者です。

サーバーは LM Studio のアプリから起動する（Developer タブ → Start Server）か、コマンドから起動します。

```bash
lms server start                        # Starts on port 1234
lms load qwen2.5-coder --context-length 64000
```

そのうえで Hermes を設定します。

```bash
hermes model
# Select "LM Studio"
# Press Enter to use http://localhost:1234/v1
# Pick one of the discovered models
# If LM Studio server auth is enabled, enter LM_API_KEY when prompted
```

Hermes は、すでに読み込まれている LM Studio の文脈をそのまま保ちます。まだ読み込まれていないモデルについては、既定の explicit の方式では、Hermes 側で設定していない限り `context_length` を送りません。LM Studio 自身のモデル設定を効かせるためです。そのうえで、読み込み後に LM Studio が報告した文脈長だけを使います。

LM Studio で文脈長を変えるにはこうします。

1. モデル選択の横にある歯車のアイコンを押します
2. 「Context Length」を少なくとも 64000 にします
3. モデルを読み込み直して反映させます
4. 64000 が乗り切らない機材なら、より小さくて文脈の広いモデルを検討してください

コマンドからでもできます。`lms load model-name --context-length 64000` です。

モデルが乗るかどうかの見積もりもコマンドで取れます。`lms load model-name --context-length 64000 --estimate-only` です。

モデルごとの既定値を残すには、My Models タブ → モデルの歯車アイコン → 文脈のサイズを設定します。
:::

LM Studio の必要時読み込み（Just-In-Time loading / Auto-Evict）を使っていて、通常のチャットのリクエストから LM Studio 自身にモデルの読み込みと解放を任せたい場合は、Hermes 側の明示的な事前読み込みを飛ばせます。

```bash
hermes config set model.lmstudio_load_mode jit
```

既定の明示的な事前読み込みに戻すにはこうします。

```bash
hermes config set model.lmstudio_load_mode explicit
```

**ツール呼び出し：** LM Studio 0.3.6 から対応しています。ツール呼び出しを学習しているモデル（Qwen 2.5、Llama 3.x、Mistral、Hermes）は自動で見分けられ、ツールの印が付いて表示されます。それ以外のモデルは汎用の代替処理を通るため、確実さは落ちることがあります。

---

### WSL2 のネットワーク（Windows の利用者向け） {#wsl2-networking-windows-users}

Hermes Agent は Unix の環境を必要とするので、Windows の利用者は WSL2 の中で動かします。モデルのサーバー（Ollama、LM Studio など）が **Windows 側**で動いている場合、その間をつなぐ必要があります。WSL2 は独自のサブネットを持つ仮想のネットワークアダプタを使うため、WSL2 の中の `localhost` は Linux の仮想マシンを指し、Windows 側**ではありません**。

:::tip どちらも WSL2 の中なら気にしなくて大丈夫
モデルのサーバーも WSL2 の中で動いているなら（vLLM、SGLang、llama-server ではよくあります）、`localhost` はそのまま通ります。同じネットワークの空間にいるからです。この節は飛ばしてください。
:::

#### 選択肢 1：ミラーモード（推奨） {#option-1-mirrored-networking-mode-recommended}

**Windows 11 22H2 以降**で使えます。ミラーモードにすると、Windows と WSL2 の間で `localhost` が双方向に通ります。いちばん簡単な解決です。

1. `%USERPROFILE%\.wslconfig`（たとえば `C:\Users\YourName\.wslconfig`）を作るか編集します。
   ```ini
   [wsl2]
   networkingMode=mirrored
   ```

2. PowerShell から WSL を再起動します。
   ```powershell
   wsl --shutdown
   ```

3. WSL2 の端末を開き直します。`localhost` から Windows 側のサービスへ届くようになります。
   ```bash
   curl http://localhost:11434/v1/models   # Ollama on Windows — works
   ```

:::note Hyper-V のファイアウォール
Windows 11 の一部の版では、Hyper-V のファイアウォールが既定でミラーモードの接続を止めます。ミラーモードにしても `localhost` が通らないときは、**管理者権限の PowerShell** でこれを実行してください。
```powershell
Set-NetFirewallHyperVVMSetting -Name '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}' -DefaultInboundAction Allow
```
:::

#### 選択肢 2：Windows 側の IP を使う（Windows 10 や古い版） {#option-2-use-the-windows-host-ip-windows-10-older-builds}

ミラーモードが使えない場合は、WSL2 の中から Windows 側の IP を調べ、`localhost` の代わりにそれを使います。

```bash
# Get the Windows host IP (the default gateway of WSL2's virtual network)
ip route show | grep -i default | awk '{ print $3 }'
# Example output: 172.29.192.1
```

その IP を Hermes の設定で使います。

```yaml
model:
  default: qwen2.5-coder:32b
  provider: custom
  base_url: http://172.29.192.1:11434/v1   # Windows host IP, not localhost
```

:::tip 動的に取る小技
この IP は WSL2 を再起動すると変わることがあります。シェルから動的に取れます。
```bash
export WSL_HOST=$(ip route show | grep -i default | awk '{ print $3 }')
echo "Windows host at: $WSL_HOST"
curl http://$WSL_HOST:11434/v1/models   # Test Ollama
```

端末の mDNS 名を使う手もあります（WSL2 に `libnss-mdns` が要ります）。
```bash
sudo apt install libnss-mdns
curl http://$(hostname).local:11434/v1/models
```
:::

#### サーバーの待ち受けアドレス（NAT モードでは必須） {#server-bind-address-required-for-nat-mode}

**選択肢 2**（ホストの IP を使う NAT モード）を選んだ場合、Windows 側のモデルのサーバーが `127.0.0.1` の外からの接続を受け付ける必要があります。たいていのサーバーは既定で localhost だけを待ち受けており、NAT モードの WSL2 からの接続は別の仮想サブネットから来るため断られます。ミラーモードなら `localhost` がそのまま対応づくので、既定の `127.0.0.1` のままで問題ありません。

| サーバー | 既定の待ち受け | 直し方 |
|--------|-------------|------------|
| **Ollama** | `127.0.0.1` | Ollama を起動する前に環境変数 `OLLAMA_HOST=0.0.0.0` を設定します（Windows のシステム設定 → 環境変数、または Ollama のサービスを編集） |
| **LM Studio** | `127.0.0.1` | Developer タブ → Server settings で **「Serve on Network」**を有効にします |
| **llama-server** | `127.0.0.1` | 起動コマンドに `--host 0.0.0.0` を足します |
| **vLLM** | `0.0.0.0` | 既定ですべてのインターフェイスで待ち受けます |
| **SGLang** | `127.0.0.1` | 起動コマンドに `--host 0.0.0.0` を足します |

**Windows の Ollama（詳しく）：** Ollama は Windows のサービスとして動きます。`OLLAMA_HOST` を設定するには次のようにします。
1. **システムのプロパティ** → **環境変数**を開きます
2. **システム環境変数**に `OLLAMA_HOST` = `0.0.0.0` を追加します
3. Ollama のサービスを再起動します（または再起動します）

#### Windows のファイアウォール {#windows-firewall}

Windows のファイアウォールは、NAT モードでもミラーモードでも WSL2 を別のネットワークとして扱います。上の手順のあとでもつながらない場合は、モデルのサーバーのポートに対する規則を足してください。

```powershell
# Run in Admin PowerShell — replace PORT with your server's port
New-NetFirewallRule -DisplayName "Allow WSL2 to Model Server" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 11434
```

よく使うポートは、Ollama が `11434`、vLLM が `8000`、SGLang が `30000`、llama-server が `8080`、LM Studio が `1234` です。

#### 手早い確認 {#quick-verification}

WSL2 の中から、モデルのサーバーに届くか試します。

```bash
# Replace URL with your server's address and port
curl http://localhost:11434/v1/models          # Mirrored mode
curl http://172.29.192.1:11434/v1/models       # NAT mode (use your actual host IP)
```

モデルの一覧が JSON で返ってくれば大丈夫です。その URL をそのまま Hermes の設定の `base_url` に使ってください。

---

### 手元のモデルで困ったときは {#troubleshooting-local-models}

ここに挙げるのは、Hermes と組み合わせたときに**すべての**手元の推論サーバーで起きうる問題です。

#### WSL2 から Windows 側のモデルサーバーへ「Connection refused」 {#connection-refused-from-wsl2-to-a-windows-hosted-model-server}

Hermes を WSL2 の中で、モデルのサーバーを Windows 側で動かしている場合、WSL2 の既定の NAT モードでは `http://localhost:<port>` は通りません。直し方は上の [WSL2 のネットワーク](#wsl2-networking-windows-users)を参照してください。

#### ツール呼び出しが実行されず文字として出る {#tool-calls-appear-as-text-instead-of-executing}

ツールが実際に呼ばれる代わりに、`{"name": "web_search", "arguments": {...}}` のようなものがメッセージとして出てきます。

**原因：** サーバー側でツール呼び出しが有効になっていないか、そのサーバーのツール呼び出しの実装がそのモデルに対応していません。

| サーバー | 直し方 |
|--------|-----|
| **llama.cpp** | 起動コマンドに `--jinja` を足します |
| **vLLM** | `--enable-auto-tool-choice --tool-call-parser hermes` を足します |
| **SGLang** | `--tool-call-parser qwen`（またはモデルに合った解析器）を足します |
| **Ollama** | ツール呼び出しは既定で有効です。モデルが対応しているか確かめてください（`ollama show model-name` で確認できます） |
| **LM Studio** | 0.3.6 以降に更新し、ツール呼び出しに元から対応したモデルを使います |

#### モデルが文脈を忘れる、話がかみ合わない {#model-seems-to-forget-context-or-give-incoherent-responses}

**原因：** 文脈が狭すぎます。会話が上限を超えると、たいていのサーバーは古いメッセージを黙って捨てます。Hermes のシステムプロンプトとツールの定義だけで 4k〜8k トークンを使うことがあります。

**調べ方：**

```bash
# Check what Hermes thinks the context is
# Look at startup line: "Context limit: X tokens"

# Check your server's actual context
# Ollama: ollama ps (CONTEXT column)
# llama.cpp: curl http://localhost:8080/props | jq '.default_generation_settings.n_ctx'
# vLLM: check --max-model-len in startup args
```

**直し方：** エージェントとして使うなら、文脈を少なくとも **64,000 トークン**にしてください。指定するフラグは、上の各サーバーの節にあります。

#### 起動時に「Context limit: 2048 tokens」と出る {#context-limit-2048-tokens-at-startup}

Hermes は文脈長を、サーバーの `/v1/models` から自動で読み取ります。サーバーが小さい値を返す場合（あるいは何も返さない場合）、Hermes はモデルが宣言している上限を使いますが、それが正しくないことがあります。

**直し方：** `config.yaml` で明示します。

```yaml
model:
  default: your-model
  provider: custom
  base_url: http://localhost:11434/v1
  context_length: 64000
```

#### 応答が文の途中で切れる {#responses-get-cut-off-mid-sentence}

**考えられる原因：**
1. **サーバー側の出力の上限（`max_tokens`）が小さい** — SGLang の既定は 1 応答 128 トークンです。サーバーで `--default-max-tokens` を設定するか、Hermes の config.yaml で `model.max_tokens` を設定してください。なお `max_tokens` が決めるのは応答の長さだけで、会話の履歴をどれだけ持てるか（そちらは `context_length`）とは関係ありません。
2. **文脈を使い切った** — モデルの文脈がいっぱいになっています。`model.context_length` を増やすか、Hermes の[文脈の圧縮](/hermes/docs/user-guide/configuration/#context-compression)を有効にしてください。

---

### LiteLLM Proxy — 複数の提供元をまとめるゲートウェイ {#litellm-proxy-multi-provider-gateway}

[LiteLLM](https://docs.litellm.ai/) は OpenAI 互換の中継で、100 以上の LLM の提供元を 1 つの API の裏にまとめます。向いているのは、設定を変えずに提供元を切り替えること、負荷の分散、切り替えの連鎖、予算の管理です。

```bash
# Install and start
pip install "litellm[proxy]"
litellm --model anthropic/claude-sonnet-4 --port 4000

# Or with a config file for multiple models:
litellm --config litellm_config.yaml --port 4000
```

そのうえで、`hermes model` → Custom endpoint → `http://localhost:4000/v1` と設定します。

切り替えを入れた `litellm_config.yaml` の例です。
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

### ClawRouter — 費用を抑える振り分け {#clawrouter-cost-optimized-routing}

BlockRunAI の [ClawRouter](https://github.com/BlockRunAI/ClawRouter) は、質問の難しさに応じてモデルを自動で選ぶ、手元で動く振り分けの中継です。リクエストを 14 の観点で分類し、その仕事をこなせるいちばん安いモデルへ回します。支払いは USDC の暗号資産で、API キーは使いません。

```bash
# Install and start
npx @blockrun/clawrouter    # Starts on port 8402
```

そのうえで、`hermes model` → Custom endpoint → `http://localhost:8402/v1` → モデル名 `blockrun/auto` と設定します。

振り分けの方針は次のとおりです。
| 方針 | 考え方 | 節約 |
|---------|----------|---------|
| `blockrun/auto` | 品質と費用の釣り合い | 74〜100% |
| `blockrun/eco` | できるだけ安く | 95〜100% |
| `blockrun/premium` | 最も品質の高いモデル | 0% |
| `blockrun/free` | 無料のモデルだけ | 100% |
| `blockrun/agentic` | ツールの利用に合わせて最適化 | 場合による |

:::note
ClawRouter を使うには、Base か Solana 上に USDC を入れた財布が要ります。すべてのリクエストは BlockRun のバックエンドの API を通ります。財布の状態は `npx @blockrun/clawrouter doctor` で確認できます。
:::

---

### その他の互換プロバイダ {#other-compatible-providers}

OpenAI 互換の API を持つサービスなら何でも使えます。よく使われるものを挙げます。

| プロバイダ | ベース URL | 補足 |
|----------|----------|-------|
| [Together AI](https://together.ai) | `https://api.together.xyz/v1` | クラウドで動く公開モデル |
| [Groq](https://groq.com) | `https://api.groq.com/openai/v1` | 非常に速い推論 |
| [DeepSeek](https://deepseek.com) | `https://api.deepseek.com/v1` | DeepSeek のモデル |
| [Fireworks AI](https://fireworks.ai) | `https://api.fireworks.ai/inference/v1` | 公開モデルの高速な提供 |
| [GMI Cloud](https://www.gmicloud.ai/) | `https://api.gmi-serving.com/v1` | 運用込みの OpenAI 互換推論 |
| [Actual Computer](https://actual.inc) | `https://api.actual.inc/v1` | 自分のクラスタへの専用中継。手元のデーモンは `http://127.0.0.1:8080/v1` |
| [Cerebras](https://cerebras.ai) | `https://api.cerebras.ai/v1` | ウェハースケールのチップによる推論 |
| [Mistral AI](https://mistral.ai) | `https://api.mistral.ai/v1` | Mistral のモデル |
| [OpenAI](https://openai.com) | `https://api.openai.com/v1` | OpenAI への直接接続 |
| [Azure OpenAI](https://azure.microsoft.com) | `https://YOUR.openai.azure.com/` | 企業向けの OpenAI |
| [LocalAI](https://localai.io) | `http://localhost:8080/v1` | 自前運用、複数モデル |
| [Jan](https://jan.ai) | `http://localhost:1337/v1` | 手元のモデルを動かすデスクトップアプリ |

どれも `hermes model` → Custom endpoint から、あるいは `config.yaml` で設定できます。

```yaml
model:
  default: meta-llama/Llama-3.1-70B-Instruct-Turbo
  provider: custom
  base_url: https://api.together.xyz/v1
  api_key: your-together-key
```

---

### 文脈長の判別 {#context-length-detection}

:::note 混同しやすい 2 つの設定
**`context_length`** は**文脈の総量**です。入力*と*出力を合わせた予算になります（たとえば Claude Opus 4.6 なら 200,000）。Hermes はこれを見て、履歴を圧縮する時期を決め、API のリクエストを検査します。

**`model.max_tokens`** は**出力の上限**です。*1 回の応答*でモデルが生成できるトークン数の上限で、会話の履歴をどれだけ持てるかとは関係ありません。業界で広く使われる `max_tokens` という名前は混乱の元になりがちで、Anthropic は自社の API でこれを `max_output_tokens` へ改名しました。

自動の判別が文脈の広さを取り違えるときは `context_length` を設定してください。
1 回ごとの応答の長さを抑えたいときだけ `model.max_tokens` を設定してください。
:::

Hermes は、そのモデルとプロバイダに合った文脈の広さを、いくつもの情報源をたどって判別します。

1. **設定での上書き** — config.yaml の `model.context_length`（最優先）
2. **独自プロバイダのモデルごとの設定** — `providers.<name>.models.<id>.context_length`
3. **保存された記憶** — 以前に判明した値（再起動しても残ります）
4. **エンドポイントの `/models`** — 手元や独自のエンドポイントの API に問い合わせます
5. **Anthropic の `/v1/models`** — Anthropic の API に `max_input_tokens` を問い合わせます（API キーの利用者のみ）
6. **OpenRouter の API** — OpenRouter の最新のモデル情報
7. **Nous Portal** — Nous のモデル ID を OpenRouter の情報に後方一致で突き合わせます
8. **[models.dev](https://models.dev)** — 有志が保つ登録簿。100 以上の提供元にまたがる 3800 以上のモデルについて、提供元ごとの文脈長を持ちます
9. **既定の値** — モデルの系統ごとのおおまかな当てはめ（既定は 128K）

たいていの環境では、そのままで正しく働きます。このしくみは提供元を踏まえており、同じモデルでも誰が提供するかで上限が変わります（たとえば `claude-opus-4.6` は Anthropic に直接つなぐと 1M ですが、GitHub Copilot 経由では 128K です）。

文脈長を明示するには、モデルの設定に `context_length` を足します。

```yaml
model:
  default: "qwen3.5:9b"
  base_url: "http://localhost:8080/v1"
  context_length: 131072  # tokens
```

独自エンドポイントでは、モデルごとに文脈長を設定することもできます。

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

`hermes model` は、独自エンドポイントの設定時に文脈長を尋ねます。自動で判別させたいときは空のままにしてください。

:::tip 手で設定したほうがよいとき
- Ollama で、モデルの上限より小さい `num_ctx` を使っている
- VRAM を節約するなど、モデルの上限より小さく抑えたい（たとえば 128k のモデルを 8k で使う）
- `/v1/models` を出さない中継の裏で動かしている
:::

---

### 名前を付けた独自プロバイダ {#named-custom-providers}

独自エンドポイントを複数扱う場合（たとえば手元の開発用サーバーと遠くの GPU サーバー）、`config.yaml` の `providers:` 辞書の下に、名前をキーにして定義できます。

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

各項目が受け付けるのは、`api`（エンドポイントのベース URL。`base_url` / `url` も同じ意味で使えます）、`name`（表示名。省くと辞書のキーになります）、`key_env` か直接書く `api_key` か `key_cmd`（下を参照）、`transport`（`chat_completions` / `anthropic_messages` / `codex_responses`）、`default_model`、`models`、`context_length`、`discover_models`、`extra_body`、`extra_headers`、`ssl_ca_cert` / `ssl_verify`、そして項目を消さずに隠す `enabled: false` です。

#### コマンドで発行する認証情報（`key_cmd`） {#command-minted-credentials-keycmd}

企業向けのゲートウェイは、固定の API キーではなく短命のベアラートークンを発行することがよくあります（SSO / OIDC の仲介、クラウドの IAM、社内の認証中継など）。そのため `.env` に写したトークンはセッションの途中で古くなり、リクエストが 401 を返し始めます。`key_cmd` は、トークンを*出力する*コマンドを指定するものです。Hermes はそれを実行し、期限の少し前まで結果を保つので、長いセッションでも再起動なしに動き続けます。

```yaml
providers:
  my-gateway:
    base_url: "https://gateway.internal.example.com/v1"
    api_mode: chat_completions
    key_cmd: "my-auth-cli print-token --profile prod"
```

トークンを出力するものなら何でも使えます。`databricks auth token`、`gcloud auth print-access-token`、`az account get-access-token`、`vault read`、Claude Code 形式の `apiKeyHelper` スクリプトなどです。

このコマンドは標準出力に**トークンだけ**を出す必要があります。そのまま出すか、`access_token` の項目を持つ JSON にします（`expires_in` は反映されます。絶対時刻の `expiry` / `expiresOn` の ISO 形式も同様です）。複数行の出力は、推測せずにそのまま拒否されます。期限が示されない場合、トークンは決まった間隔で取り直されます。

優先順位は、明示した `--api-key` が最も強く、そうでなければ同じ項目にある固定の `api_key` / `key_env` より `key_cmd` が優先されます。発行された認証情報は、主なやり取りにも補助の作業（題名の生成、圧縮、画像の読み取り、埋め込み）にも同じように使われます。

`secrets.command` とは別物です。あちらは**起動時に一度だけ**補助のプログラムを走らせて、プロセス全体の環境変数を用意するものです。金庫や鍵束から多くの秘密をまとめて受け取るならそちらを、あるプロバイダの認証情報をセッションの*途中で*取り直す必要があるなら `key_cmd` を使ってください。

:::note 旧来の書き方
古い設定では、代わりにトップレベルの `custom_providers:` のリストを使っていました。今も動きますし（Hermes は両方を読みます）、`hermes update` が `providers:` 辞書へ自動で移行します（設定の v12）。辞書の形では項目名が少し違い、旧来の `model` は `default_model`、旧来の `api_mode` は `transport` になります。
:::

OpenAI 互換のエンドポイントの中には、リクエストの本体に独自の項目を求めるものがあります。該当する独自プロバイダに `extra_body` を足しておくと、Hermes がそのエンドポイントへのチャットのリクエストごとに混ぜ込みます。

```yaml
providers:
  gemma-local:
    api: http://localhost:8080/v1
    default_model: google/gemma-4-31b-it
    extra_body:
      enable_thinking: true
      reasoning_effort: high
```

書き方はサーバーの説明に合わせてください。たとえば vLLM の Gemma や一部の NVIDIA NIM のエンドポイントは、`enable_thinking` を `extra_body` の直下ではなく `chat_template_kwargs` の下に置くことを求めます。

```yaml
extra_body:
  chat_template_kwargs:
    enable_thinking: true
```

vLLM が提供する Qwen の推論モデルでは、推論の解析器が生成された文章をすべて推論の項目へ振り分けてしまい、アシスタントの `content` が空になる場合に、同じ書き方で思考を止められます。

```yaml
extra_body:
  chat_template_kwargs:
    enable_thinking: false
```

設定した `extra_body` はどこへ行っても付いて回ります。エージェントを組み立てるときに混ぜ込まれ、**ゲートウェイの往復ごとに保たれ**（`/fast` が `service_tier` / `speed` の上書きを重ねる往復でも、それらは `extra_body` の上に混ざるだけで置き換えません）、**`/model` の切り替えのたびに導き直されます**。名前を付けた独自プロバイダへ切り替えるとその `extra_body` が適用され、離れると消えるので、別のプロバイダへ漏れることはありません。

`hermes model` → Custom Endpoint のウィザードは、API の方式を明示的に尋ね、答えを `config.yaml`（プロバイダ項目の `transport`）に保存するようになりました。空のままにした場合は、URL からの自動判別（たとえば `/anthropic` を含むパスなら `anthropic_messages`）が予備として働きます。

**独自プロバイダのモデルでの画像対応。** 独自エンドポイントが models.dev に載っていない画像対応のモデルを提供している場合は、`model.supports_vision: true` を設定してください。Hermes は添付された画像を `vision_analyze` で前処理せず、そのまま（`image_url` の部品として）送ります。つまみは 1 つだけで、`agent.image_input_mode: native` を併せて設定する必要はありません。

```yaml
model:
  provider: custom
  base_url: http://localhost:8080/v1
  default: qwen3.6-35b-a3b
  supports_vision: true   # send images natively; otherwise vision_analyze pre-describes them
```

同じキーは、名前を付けたプロバイダのモデルごとの設定（`providers.<name>.models.<id>.supports_vision`）でも効き、YAML の標準的な真偽値（`true/false/yes/no/on/off/1/0`）を受け付けます。

セッションの途中では、3 つ組の書き方で切り替えます。

```
/model custom:local:qwen-2.5       # Use the "local" endpoint with qwen-2.5
/model custom:work:llama3-70b      # Use the "work" endpoint with llama3-70b
/model custom:anthropic-proxy:claude-sonnet-4  # Use the proxy
```

名前を付けた独自プロバイダは、対話的な `hermes model` のメニューからも選べます。

---

### 実例集：Together AI、Groq、Perplexity {#cookbook-together-ai-groq-perplexity}

[その他の互換プロバイダ](#other-compatible-providers)に挙げたクラウドの提供元は、どれも OpenAI の REST の書き方を話すので、`providers:` 辞書の下に同じやり方で書けます。実際に動く例を 3 つ挙げます。どれも `~/.hermes/config.yaml` に入れ、対応する API キーは `~/.hermes/.env` に置きます。

#### Together AI {#together-ai}

公開重みのモデル（Llama、MiniMax、Gemma、DeepSeek、Qwen）を、一次提供元の API よりかなり安く提供しています。複数のモデルを併用する構成の既定として使いやすいところです。

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

セッションの途中でモデルを切り替えるにはこうします。

```
/model custom:together:meta-llama/Llama-3.3-70B-Instruct-Turbo
/model custom:together:google/gemma-4-31b-it
/model custom:together:deepseek-ai/DeepSeek-V3
```

Together は `/v1/models` に対応しているので、`hermes model` が使えるモデルを自動で見つけられます。

#### Groq {#groq}

非常に速い推論です（Llama-3.3-70B で毎秒 500 トークンほど）。品ぞろえは小さいものの、待ち時間が効く対話的な用途に強いところです。

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

その場で Web を検索し、出典まで自動で付けるモデルが欲しいときに便利です。使えるモデルの制限が厳しいので、最新の一覧は [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api) で確かめてください。

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

#### 複数の提供元を 1 つの設定にまとめる {#multiple-providers-in-one-config}

3 つの例は組み合わせられます。全部を並べておいて、`/model custom:<name>:<model>` で往復ごとに切り替えられます。

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

:::tip 困ったときは
- CLI の検証まわりが #15083 で直ってからは、ここに挙げた名前のどれについても `hermes doctor` が `Unknown provider` の警告を出さないはずです。
- 提供元の `/v1/models` に届かない場合（Perplexity でよく起きます）、`hermes model` は強く断るのではなく、警告を出したうえでモデルを保存します。#15136 を参照してください。
- 名前を付けたプロバイダをまったく使わず、素の `provider: custom` と環境変数 `CUSTOM_BASE_URL` で済ませたい場合は、#15103 を参照してください。
:::

---

### どの構成を選ぶか {#choosing-the-right-setup}

| 用途 | おすすめ |
|----------|-------------|
| **とにかく動けばいい** | OpenRouter（既定）または Nous Portal |
| **手元のモデルを手軽に** | Ollama |
| **本番で GPU を使って提供する** | vLLM か SGLang |
| **Mac / GPU なし** | Ollama か llama.cpp |
| **複数の提供元へ振り分ける** | LiteLLM Proxy か OpenRouter |
| **費用を抑える** | ClawRouter か、`sort: "price"` を付けた OpenRouter |
| **秘密を最大限に守る** | Ollama、vLLM、llama.cpp（すべて手元で完結） |
| **企業 / Azure** | 独自エンドポイントとして設定した Azure OpenAI |
| **中国発のモデル** | z.ai（GLM）、Kimi / Moonshot（`kimi-coding` か `kimi-coding-cn`）、MiniMax、Xiaomi MiMo、Tencent TokenHub（いずれも標準対応） |

:::tip
プロバイダは `hermes model` でいつでも切り替えられ、再起動は要りません。どのプロバイダを使っても、会話の履歴、記憶、スキルはそのまま引き継がれます。
:::

## 任意の API キー {#optional-api-keys}

| 機能 | 提供元 | 環境変数 |
|---------|----------|--------------|
| Web の本文取得 | [Firecrawl](https://firecrawl.dev/) | `FIRECRAWL_API_KEY`、`FIRECRAWL_API_URL` |
| ブラウザ操作 | [Browserbase](https://browserbase.com/) | `BROWSERBASE_API_KEY`、`BROWSERBASE_PROJECT_ID` |
| 画像生成 | [FAL](https://fal.ai/) | `FAL_KEY` |
| 上位の音声合成 | [ElevenLabs](https://elevenlabs.io/) | `ELEVENLABS_API_KEY` |
| OpenAI の音声合成と文字起こし | [OpenAI](https://platform.openai.com/api-keys) | `VOICE_TOOLS_OPENAI_KEY` |
| Mistral の音声合成と文字起こし | [Mistral](https://console.mistral.ai/) | `MISTRAL_API_KEY` |
| セッションをまたぐ利用者の把握 | [Honcho](https://honcho.dev/) | `HONCHO_API_KEY` |
| 意味で引く長期記憶 | [Supermemory](https://supermemory.ai) | `SUPERMEMORY_API_KEY` |

### Firecrawl を自前で運用する {#self-hosting-firecrawl}

Hermes は既定で、Web の検索と本文取得に [Firecrawl のクラウド API](https://firecrawl.dev/) を使います。Firecrawl を手元で動かしたい場合は、自前で立てたものへ向けられます。設定の全手順は Firecrawl の [SELF_HOST.md](https://github.com/firecrawl/firecrawl/blob/main/SELF_HOST.md) を参照してください。

**得られるもの：** API キーが不要、レート制限なし、ページごとの費用なし、データを完全に手元で持てること。

**失うもの：** クラウド版は、ボット対策（Cloudflare、画像認証、IP の切り替え）をくぐるための Firecrawl 独自の「Fire-engine」を使います。自前運用では素の取得と Playwright を使うため、保護されたサイトでは失敗することがあります。検索も Google ではなく DuckDuckGo になります。

**手順：**

1. Firecrawl の Docker 一式を取得して起動します（API、Playwright、Redis、RabbitMQ、PostgreSQL の 5 つのコンテナで、4〜8 GB ほどのメモリが要ります）。
   ```bash
   git clone https://github.com/firecrawl/firecrawl
   cd firecrawl
   # In .env, set: USE_DB_AUTHENTICATION=false, HOST=0.0.0.0, PORT=3002
   docker compose up -d
   ```

2. Hermes をそこへ向けます（API キーは不要です）。
   ```bash
   hermes config set FIRECRAWL_API_URL http://localhost:3002
   ```

自前で立てたものに認証をかけている場合は、`FIRECRAWL_API_KEY` と `FIRECRAWL_API_URL` の両方を設定できます。

## OpenRouter での提供元の振り分け {#openrouter-provider-routing}

OpenRouter を使うとき、リクエストをどの提供元へ回すかを制御できます。`~/.hermes/config.yaml` に `provider_routing` の節を足してください。

```yaml
provider_routing:
  sort: "throughput"          # "price" (default), "throughput", or "latency"
  # only: ["anthropic"]      # Only use these providers
  # ignore: ["deepinfra"]    # Skip these providers
  # order: ["anthropic", "google"]  # Try providers in this order
  # require_parameters: true  # Only use providers that support all request params
  # data_collection: "deny"   # Exclude providers that may store/train on data
```

**近道：** モデル名の後ろに `:nitro` を付けると処理量で並べ替え（たとえば `anthropic/claude-sonnet-4:nitro`）、`:floor` を付けると価格で並べ替えます。

## OpenRouter の Pareto Code ルーター {#openrouter-pareto-code-router}

OpenRouter は `openrouter/pareto-code` という、コーディング向けの実験的な振り分けを出しています。コーディングの品質の基準を満たすなかで最も安いモデルへ自動で回すもので、順位は [Artificial Analysis](https://artificialanalysis.ai/) によります。このモデルを選び、`~/.hermes/config.yaml` の `min_coding_score` で加減してください。

```yaml
model:
  provider: openrouter
  model: openrouter/pareto-code

openrouter:
  min_coding_score: 0.65   # 0.0–1.0; higher = stronger (more expensive) coders. Default 0.65.
```

補足です。

- `min_coding_score` が送られるのは、`model.model` が `openrouter/pareto-code` のとき**だけ**です。他のモデルでは何の効果もありません。
- 空文字にする（または行ごと消す）と、使えるなかで最も強いモデルを OpenRouter が選びます。プラグインの節を省いたときの、公表された動きです。
- ある日のうちは同じ点数なら選ばれるモデルも決まりますが、Pareto の前線が動けば（新しいモデル、ベンチマークの更新）選ばれるモデルは変わりえます。
- 振り分けの全体の動きは OpenRouter の [Pareto Router のドキュメント](https://openrouter.ai/docs/guides/routing/routers/pareto-router)を参照してください。
- 主のエージェントではなく特定の**補助の作業**（圧縮、画像の読み取りなど）で Pareto Code を使いたい場合は、その作業の下に `extra_body.plugins` を設定してください。[補助モデル → 補助の作業での OpenRouter の振り分けと Pareto Code](/hermes/docs/user-guide/configuration/#openrouter-routing--pareto-code-for-auxiliary-tasks)を参照してください。

## フォールバックプロバイダ {#fallback-providers}

主のモデルが失敗したとき（レート制限、サーバーのエラー、認証の失敗）に Hermes が順に試す、控えのプロバイダの連鎖を設定できます。正式な書き方は、トップレベルの `fallback_providers:` のリストです。

```yaml
fallback_providers:
  - provider: openrouter
    model: anthropic/claude-sonnet-4
  - provider: anthropic
    model: claude-sonnet-4
    # base_url: http://localhost:8000/v1    # optional, for custom endpoints
    # api_mode: chat_completions           # optional override
```

旧来の 1 組だけを書く `fallback_model:` も、後方互換のために受け付けます。

```yaml
fallback_model:
  provider: openrouter
  model: anthropic/claude-sonnet-4
```

切り替わると、会話を失わずにセッションの途中でモデルとプロバイダが入れ替わります。連鎖は上から 1 つずつ試され、切り替えはセッションにつき 1 回だけ働きます。

対応するプロバイダは次のとおりです。`openrouter`、`nous`、`novita`、`openai-codex`、`copilot`、`copilot-acp`、`anthropic`、`gemini`、`qwen-oauth`、`huggingface`、`zai`、`kimi-coding`、`kimi-coding-cn`、`minimax`、`minimax-cn`、`minimax-oauth`、`deepseek`、`nvidia`、`xai`、`xai-oauth`、`ollama-cloud`、`bedrock`、`ai-gateway`、`azure-foundry`、`opencode-zen`、`opencode-go`、`commandcode`、`commandcode-anthropic`、`kilocode`、`xiaomi`、`arcee`、`gmi`、`actual`、`stepfun`、`lmstudio`、`alibaba`、`alibaba-coding-plan`、`tencent-tokenhub`、`tencent-tokenplan`、`nebius-token-factory`、`router`、`custom`。

:::tip
フォールバックの設定は `config.yaml` だけで行います。対話的にやるなら `hermes fallback` です。どんなときに働くのか、連鎖がどう進むのか、補助の作業や委譲とどう関わるのかは、[フォールバックプロバイダ](/hermes/docs/user-guide/features/fallback-providers/)にすべて載っています。
:::

---

## 関連ページ {#see-also}

- [設定](/hermes/docs/user-guide/configuration/) — 全体の設定（ディレクトリの構成、設定の優先順位、端末の実装、記憶、圧縮など）
- [環境変数](/hermes/docs/reference/environment-variables/) — すべての環境変数の一覧
