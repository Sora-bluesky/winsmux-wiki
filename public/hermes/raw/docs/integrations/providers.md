---
title: "LLM とモデルのプロバイダー"
description: ""
upstream_path: integrations/providers.md
upstream_blob: 0d4569accd7739dfa16af5c99b79bbc4f1cd294b
sources:
  - https://hermes-agent.nousresearch.com/docs/integrations/providers
---

# LLM とモデルのプロバイダー {#llm-and-model-providers}

このページでは、Hermes Agent が使う推論プロバイダーの設定を扱います。OpenRouter や Anthropic のようなクラウド API から、Ollama や vLLM のような自前で立てたエンドポイント、さらには込み入った振り分けやフォールバックの設定までが対象です。Hermes を使うには、少なくとも 1 つのプロバイダーを設定しておく必要があります。

## 推論プロバイダー {#inference-providers}

LLM につながる手段が最低 1 つ必要です。`hermes model` を使えば対話的にプロバイダーとモデルを切り替えられますし、直接設定することもできます。

| プロバイダー | 設定 |
|----------|-------|
| **Nous Portal** | `hermes model`（OAuth、サブスクリプション制） |
| **OpenAI Codex** | `hermes model` → **ChatGPT or Codex Subscription**（ChatGPT OAuth。Codex のモデルを使います） |
| **GitHub Copilot** | `hermes model`（OAuth のデバイスコード方式、`COPILOT_GITHUB_TOKEN`、`GH_TOKEN`、または `gh auth token`） |
| **GitHub Copilot ACP** | `hermes model`（ローカルで `copilot --acp --stdio` を起動します） |
| **Anthropic** | `hermes model`（OAuth 経由の Claude Max + 追加の利用クレジット。Anthropic の API キーや手動の setup-token にも対応 — 下の注記を参照） |
| **OpenRouter** | `~/.hermes/.env` の `OPENROUTER_API_KEY` |
| **Ramp Router** | `~/.hermes/.env` の `RAMP_ROUTER_API_KEY`（provider: `router`。別名: `ramp-router`、`ramp`、`router.com`。Responses ネイティブのゲートウェイで、アカウントに紐づく最新のカタログを返します） |
| **Fireworks AI** | `~/.hermes/.env` の `FIREWORKS_API_KEY`（provider: `fireworks`。別名: `fireworks-ai`、`fw`） |
| **NovitaAI** | `~/.hermes/.env` の `NOVITA_API_KEY`（provider: `novita`。200 以上のモデル、Model API、Agent Sandbox、GPU Cloud） |
| **AI Gateway** | `~/.hermes/.env` の `AI_GATEWAY_API_KEY`（provider: `ai-gateway`） |
| **z.ai / GLM** | `~/.hermes/.env` の `GLM_API_KEY`（provider: `zai`） |
| **Kimi / Moonshot** | `~/.hermes/.env` の `KIMI_API_KEY`（provider: `kimi-coding`） |
| **Kimi / Moonshot（中国）** | `~/.hermes/.env` の `KIMI_CN_API_KEY`（provider: `kimi-coding-cn`。別名: `kimi-cn`、`moonshot-cn`） |
| **Arcee AI** | `~/.hermes/.env` の `ARCEEAI_API_KEY`（provider: `arcee`。別名: `arcee-ai`、`arceeai`） |
| **GMI Cloud** | `~/.hermes/.env` の `GMI_API_KEY`（provider: `gmi`。別名: `gmi-cloud`、`gmicloud`） |
| **Nebius Token Factory** | `~/.hermes/.env` の `NEBIUS_API_KEY`（provider: `nebius-token-factory`。別名: `nebius`、`nebius-tf`、`tokenfactory`） |
| **Actual Computer** | ホスト型の中継を使うなら `~/.hermes/.env` の `ACTUAL_API_KEY`、ローカルのデーモンを使うなら `ACTUAL_BASE_URL=http://127.0.0.1:8080`。ループバックならキーは不要です（provider: `actual`。別名: `actual-computer`、`actualcomputer`、`aci`） |
| **MiniMax** | `~/.hermes/.env` の `MINIMAX_API_KEY`（provider: `minimax`） |
| **MiniMax China** | `~/.hermes/.env` の `MINIMAX_CN_API_KEY`（provider: `minimax-cn`） |
| **xAI（Grok） — Responses API** | `~/.hermes/.env` の `XAI_API_KEY`（provider: `xai`） |
| **xAI Grok OAuth（SuperGrok）** | `hermes model` → "xAI Grok OAuth (SuperGrok / Premium+)" — ブラウザーでログインし、API キーは不要です。[ガイド](/hermes/docs/guides/xai-grok-oauth/)を参照 |
| **Qwen Cloud（Alibaba DashScope）** | `~/.hermes/.env` の `DASHSCOPE_API_KEY`（provider: `alibaba`。中国本土向けのエンドポイントは `alibaba-cn`） |
| **Alibaba Cloud（Coding Plan）** | `ALIBABA_CODING_PLAN_API_KEY`（無ければ `DASHSCOPE_API_KEY` を使います）（provider: `alibaba-coding-plan`、別名: `alibaba_coding`。中国本土向けのエンドポイントは `alibaba-coding-plan-cn`） — 課金の区分が別で、エンドポイントも異なります |
| **Alibaba Cloud（Token Plan）** | `~/.hermes/.env` の `ALIBABA_TOKEN_PLAN_API_KEY`（provider: `alibaba-token-plan`。中国本土向けのエンドポイントは `alibaba-token-plan-cn`） — Model Studio の定額トークンの区分です |
| **Kilo Code** | `~/.hermes/.env` の `KILOCODE_API_KEY`（provider: `kilocode`） |
| **Xiaomi MiMo** | `~/.hermes/.env` の `XIAOMI_API_KEY`（provider: `xiaomi`、別名: `mimo`、`xiaomi-mimo`） |
| **Tencent TokenHub** | `~/.hermes/.env` の `TOKENHUB_API_KEY`（provider: `tencent-tokenhub`、別名: `tencent`、`tokenhub`、`tencentmaas`） |
| **Tencent TokenPlan** | `~/.hermes/.env` の `TOKENPLAN_API_KEY`（provider: `tencent-tokenplan`、別名: `tokenplan`、`tencent-lkeap`。Anthropic Messages のエンドポイント） |
| **OpenCode Zen** | `~/.hermes/.env` の `OPENCODE_ZEN_API_KEY`（provider: `opencode-zen`） |
| **CommandCode** | `~/.hermes/.env` の `COMMANDCODE_API_KEY`（provider: `commandcode`、別名: `commandcode-chat`。Claude のモデルは `commandcode-anthropic`、別名: `commandcode-claude`）。GOAT / Pro / Max / Provider の各プランで使えます（月 1 ドルの Go プランは API を使えないため対象外です）。 |
| **OpenCode Go** | `~/.hermes/.env` の `OPENCODE_GO_API_KEY`（provider: `opencode-go`） |
| **OpenCode Free** | キー不要 — API キーもアカウントも要りません（provider: `opencode-free`、別名: `free`、`opencode_free`）。`hermes model` か `/model free` で選びます。リクエストは匿名で送られます。モデルの一覧は OpenCode の最新カタログから自動で更新されるので、入れ替わる無料キャンペーンも Hermes の更新なしに現れ（終わったものは消え）ます |
| **DeepSeek** | `~/.hermes/.env` の `DEEPSEEK_API_KEY`（provider: `deepseek`） |
| **Hugging Face** | `~/.hermes/.env` の `HF_TOKEN`（provider: `huggingface`、別名: `hf`） |
| **Google / Gemini** | `~/.hermes/.env` の `GOOGLE_API_KEY`（または `GEMINI_API_KEY`）（provider: `gemini`） |
| **Google Vertex AI** | `hermes model` → "Google Vertex AI"（provider: `vertex`。サービスアカウントの JSON か ADC を使う OAuth2、GCP での課金） |
| **OpenAI API（直接）** | `~/.hermes/.env` の `OPENAI_API_KEY`（provider: `openai-api`、任意で `OPENAI_BASE_URL`） |
| **Azure AI Foundry** | `hermes model` → "Azure AI Foundry"（provider: `azure-foundry`。Azure OpenAI / Foundry のエンドポイントとキーを使います） |
| **AWS Bedrock** | `hermes model` → "AWS Bedrock"（provider: `bedrock`。boto3 による標準の AWS 認証情報の連鎖） |
| **NVIDIA Build** | `~/.hermes/.env` の `NVIDIA_API_KEY`（provider: `nvidia`。build.nvidia.com にある NIM 提供のモデル） |
| **Ollama Cloud** | `hermes model` → "Ollama Cloud"（provider: `ollama-cloud`。クラウドで動く Ollama API） |
| **Qwen OAuth** | `hermes model` → "Qwen OAuth"（provider: `qwen-oauth`。ブラウザーでの PKCE ログイン） |
| **MiniMax OAuth** | `hermes model` → "MiniMax (OAuth)"（provider: `minimax-oauth`。ブラウザーでの PKCE ログイン） |
| **StepFun** | `~/.hermes/.env` の `STEPFUN_API_KEY`（provider: `stepfun`） |
| **LM Studio** | `hermes model` → "LM Studio"（provider: `lmstudio`、任意で `LM_API_KEY`） |
| **独自エンドポイント** | `hermes model` → "Custom endpoint" を選びます（`config.yaml` に保存されます） |

公式の API キーを使う道筋は、専用の [Google Gemini ガイド](/hermes/docs/guides/google-gemini/)を参照してください。

:::tip モデルのキーの別名
`model:` の設定セクションでは、モデル ID を書くキー名として `default:` と `model:` のどちらも使えます。`model: { default: my-model }` と `model: { model: my-model }` はまったく同じ意味です。
:::

### Nous Portal {#nous-portal}

[Nous Portal](https://portal.nousresearch.com) は Nous Research が提供するサブスクリプション統合ゲートウェイで、**Hermes Agent を動かすうえで推奨の方法**です。OAuth で 1 回ログインするだけで、300 以上の最前線のエージェント向けモデル（Claude、GPT、Gemini、DeepSeek、Qwen、Kimi、GLM、MiniMax、Grok、…）と [Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/)（Web 検索、画像生成、TTS、ブラウザーの自動操作）がまとめて使えます。課金はプロバイダーごとの個別アカウントではなく、Nous のサブスクリプションに寄せられます。

```bash
hermes setup --portal     # fresh install — OAuth + provider + gateway in one command
hermes model              # existing install — pick "Nous Portal" from the list
hermes portal info        # inspect login + routing at any time
```

サブスクリプションをまだ持っていない場合は、[portal.nousresearch.com/manage-subscription](https://portal.nousresearch.com/manage-subscription) から契約できます。

**詳しくは:** 専用の [Nous Portal 連携ページ](/hermes/docs/integrations/nous-portal/)（サブスクリプションに含まれるもの、モデルの一覧、トラブルシューティング）と、手順を追った [Nous Portal で Hermes Agent を動かすガイド](/hermes/docs/guides/run-hermes-with-nous-portal/)を参照してください。

**クライアントの識別。** Hermes Agent から Portal へ送られるリクエストには、`client=hermes-client-v<version>` というタグ（たとえば `client=hermes-client-v0.13.0`）が必ず付き、インストール済みのリリースに自動で合わせられます。これはメインのチャットの流れ、補助的な呼び出し、圧縮の要約、Web 抽出といった Portal を通るすべての経路で送られ、Portal 側の計測が Hermes の通信を他のクライアントと区別できるようにします。設定は不要で、`hermes update` を実行すればタグも自動で更新されます。

**JWT 認証（自動）。** Hermes は Portal へのリクエストに、`inference:invoke` のスコープを持つ JWT を優先して使い、従来の不透明なセッションキーの経路を控えとして残しています。設定は不要です。認証情報は OAuth の流れが管理し、利用者からは見えないところで入れ替わります。失効したリフレッシュトークンは、再送のループを避けるために隔離されます。

:::info Codex に関する注記
OpenAI Codex のプロバイダーはデバイスコードで認証します（URL を開いてコードを入力する方式です）。Hermes は得られた認証情報を `~/.hermes/auth.json` にある自前の認証情報ストアへ保存し、`~/.codex/auth.json` に既存の Codex CLI の認証情報があればそれを取り込めます。Codex CLI のインストールは必要ありません。

トークンの更新が決定的なエラー（HTTP 4xx、`invalid_grant`、失効した許可など）で失敗した場合、Hermes はそのリフレッシュトークンを死んだものとして印を付け、再送をやめます。同じ認証エラーが洪水のように出るのを防ぐためです。次のリクエストでは代わりに、型付きの再認証メッセージが表示されます。`hermes auth add openai-codex`（または `hermes model` → **ChatGPT or Codex Subscription**）を実行すると、新しくデバイスコードのログインを始められます。隔離は、次に交換が成功した時点で解除されます。
:::

:::warning
Nous Portal、Codex、独自エンドポイントのいずれを使っている場合でも、一部のツール（画像認識、Web の要約、MoA）は別の「補助」モデルを使います。既定（`auxiliary.*.provider: "auto"`）では、Hermes はこれらのタスクを**メインのチャットモデル** — `hermes model` で選んだのと同じモデル — に回します。タスクごとに上書きして、より安く速いモデル（たとえば OpenRouter の Gemini Flash）へ回すこともできます。[補助モデル](/hermes/docs/user-guide/configuration/#auxiliary-models)を参照してください。
:::

:::tip Nous Tool Gateway
有料の Nous Portal 契約者は **[Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/)** も使えます。Web 検索、画像生成、TTS、ブラウザーの自動操作が、契約を通して振り分けられます。追加の API キーは要りません。新規インストールなら、`hermes setup --portal` の 1 コマンドでログインし、Nous をプロバイダーに設定し、ゲートウェイまで有効にします。すでに使っている場合は、`hermes model` から、あるいはツールごとに `hermes tools` から有効にできます。振り分けの状態は `hermes portal info` でいつでも確認できます。
:::

### モデル管理の 2 つのコマンド {#two-commands-for-model-management}

Hermes には、目的の違うモデル関連のコマンドが **2 つ**あります。

| コマンド | どこで実行するか | 何をするか |
|---------|-------------|--------------|
| **`hermes model`** | 自分の端末（セッションの外） | セットアップの全工程。プロバイダーの追加、OAuth の実行、API キーの入力、エンドポイントの設定 |
| **`/model`** | Hermes のチャットセッションの中 | **すでに設定済みの**プロバイダーとモデルの間をすばやく切り替える |

まだ設定していないプロバイダーへ切り替えたいとき（たとえば OpenRouter しか設定していないのに Anthropic を使いたいとき）は、`/model` ではなく `hermes model` が必要です。いったんセッションを抜け（`Ctrl+C` か `/quit`）、`hermes model` を実行してプロバイダーの設定を済ませてから、新しいセッションを始めてください。

### サブスクリプションのプラン: 契約が何の支払いになるのか {#subscription-plans-what-your-plan-pays-for}

いくつかのプロバイダーでは、API キーの代わりに**個人向けのサブスクリプション**（Claude Max、ChatGPT、SuperGrok / X Premium+、…）で Hermes にサインインできます。その契約が実際に何を支払っていて、何を支払っていないのかはプロバイダーごとに違い、請求で驚く原因としてはこれが最も多いものです。下の表は短くまとめたものです。詳しくは各プロバイダーの節にあります。

> *現時点では未記載*とあるセルは、文字どおりの意味です。Hermes のドキュメントがまだその挙動を定めていません。決めつけず、プロバイダーの請求ダッシュボードを確認し、未解決の問いとして扱ってください。

| プラン / 経路 | Hermes で使えるか | 何が消費されるか | 何は消費されないか | よくある驚き |
|---|---|---|---|---|
| **Anthropic — Claude Max + OAuth** | ✅ 使えます — `hermes model` → Anthropic OAuth。Max **かつ**追加の利用クレジットの購入が必要です | Max プランに上乗せして追加した**追加分 / 超過分のクレジット** | **Max プランの基本枠**（Claude Code に既定で含まれる利用分） | Max の基本枠が手つかずのままでも、Hermes の利用はすべて「追加利用」として課金されます |
| **Anthropic — Claude Pro** | ❌ 使えません — Pro の契約者は OAuth の経路を使えません | 何も消費されません（経路が使えないため） | Pro のサブスクリプション | Pro でも動きそうに見えますが、動きません。代わりに `ANTHROPIC_API_KEY` を使ってください（トークン従量課金で、Claude のサブスクリプションとは無関係です） |
| **OpenAI Codex — ChatGPT プランの OAuth** | ✅ 使えます — `hermes model` → **ChatGPT or Codex Subscription**（ChatGPT のデバイスコード OAuth でログインし、Codex のモデルを使います） | *現時点では未記載* | *現時点では未記載* | ドキュメントが扱っているのは認証とトークン更新だけで、プランの枠の扱いはまだ記載されていません |
| **xAI — SuperGrok / X Premium+ の OAuth** | ✅ 使えます — ブラウザーでの OAuth。API キーは不要です | **契約の枠**（X Search についてははっきり書かれています。API キーより OAuth が推奨で、「API の支出ではなく契約の枠を使う」とあります）。それ以外の推論の枠の扱いは *現時点では未記載* | OAuth の認証情報が設定されて優先されているときは、`XAI_API_KEY` によるトークン従量の API 支出 | ログインに成功したあとの `HTTP 403`。アプリ内の契約が有効でも、xAI が OAuth の API 利用を特定の SuperGrok の等級に限っていることがあります |
| **Google — Gemini の個人向けプラン（Google AI Pro / Ultra）** | ❌ 記載された経路はありません — `gemini` プロバイダーは API キー方式のみです（`GOOGLE_API_KEY` / `GEMINI_API_KEY`）。Vertex AI は GCP の課金を使います | **API キーの枠**（無料枠か、課金を有効にした Google Cloud プロジェクト） — *個人向けプランの消費については現時点では未記載* | *現時点では未記載* | Hermes は 1 回のユーザーの発言に対して複数回モデルを呼ぶことがあるため、無料枠のキーはエージェントの数ターンで尽きることがあります |

**Anthropic。** OAuth の経路は Anthropic のアカウントに対して Claude Code として振り分けられ、**追加の利用クレジットを購入した Claude Max プランでのみ動きます**。Max の基本枠が Hermes に消費されることはなく、上乗せした追加分 / 超過分のクレジットだけが使われます。Claude Pro の契約者はこの経路を使えません。代わりに使えるのは `ANTHROPIC_API_KEY` で、そのキーの組織に対して標準の API 価格でトークン従量課金されます。下の [Anthropic（ネイティブ）](#anthropic-native)を参照してください。

**OpenAI Codex。** Hermes は ChatGPT のデバイスコード OAuth で認証し、認証情報を `~/.hermes/auth.json` に保存し、`~/.codex/auth.json` にある既存の Codex CLI の認証情報を取り込めます。どの ChatGPT のプランが対象になるのか、Hermes の利用がプランの Codex の上限にどう数えられるのかは、**現時点では未記載**です。[Nous Portal](#nous-portal) の下にある Codex の注記が扱っているのは、認証とトークン更新の挙動だけです。

**xAI（SuperGrok / X Premium+）。** ブラウザーでの OAuth は、有効な SuperGrok の契約か、連携した X アカウントの X Premium+ の契約のどちらかで動きます。同じベアラートークンは、xAI へ直接つながるツール（TTS、画像生成、動画生成、文字起こし、X Search）でも使い回されます。ログインに成功したのに推論が `HTTP 403` を返す場合、それは古いトークンの問題ではなく xAI 側の等級・権限の制限です。回避策は `XAI_API_KEY` へ切り替えることです。下の [xAI（Grok）](#xai-grok--responses-api--prompt-caching)と [xAI Grok OAuth ガイド](/hermes/docs/guides/xai-grok-oauth/)を参照してください。

**Google Gemini。** いまのところ、個人向けの Gemini の契約で Hermes にサインインする方法はありません。`gemini` プロバイダーは API キーを取り、[Google Vertex AI](#google-vertex-ai) は GCP プロジェクトに課金されます。エージェント用途には、課金を有効にした Google Cloud プロジェクトを勧めます。無料枠は、長く走るエージェントのセッションには小さすぎます。[Google Gemini ガイド](/hermes/docs/guides/google-gemini/)を参照してください。

:::tip 5 つ契約する代わりに 1 つ
プロバイダーごとのプランの扱いを追いかけたくないなら、[Nous Portal](#nous-portal) が OAuth のログイン 1 回・契約 1 つで 300 以上のモデルをまかないます。
:::

### Anthropic（ネイティブ） {#anthropic-native}

OpenRouter を経由せず、Anthropic の API から直接 Claude のモデルを使います。認証方法は 3 通りあります。

:::caution Claude Max の「追加利用」クレジットが必要です
`hermes model` → Anthropic OAuth（または `hermes auth add anthropic --type oauth`）で認証すると、Hermes は Anthropic のアカウントに対して Claude Code として振り分けます。**動くのは Claude Max プランで、なおかつ追加の利用クレジットを購入している場合だけです。** Max プランの基本枠（Claude Code に既定で含まれる利用分）が Hermes に消費されることはなく、上乗せした追加分 / 超過分のクレジットだけが使われます。Claude Pro の契約者はこの経路を使えません。

Max と追加クレジットがないなら、代わりに `ANTHROPIC_API_KEY` を使ってください。リクエストはそのキーの組織に対してトークン従量で課金されます（標準の API 価格で、Claude のサブスクリプションとは無関係です）。
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

`hermes model` から Anthropic OAuth を選ぶと、Hermes はトークンを `~/.hermes/.env` へ写すより、Claude Code 自身の認証情報ストアを使うほうを選びます。こうすることで、更新できる Claude の認証情報が更新できるまま保たれます。

設定として固定することもできます。
```yaml
model:
  provider: "anthropic"
  default: "claude-sonnet-4-6"
```

:::tip 別名
`--provider claude` と `--provider claude-code` も、`--provider anthropic` の短縮形として使えます。
:::

### GitHub Copilot {#github-copilot}

Hermes は GitHub Copilot を一級のプロバイダーとして扱い、2 つのモードに対応します。

**`copilot` — Copilot API を直接使う方式**（推奨）。GitHub Copilot の契約を使って、Copilot API 経由で GPT-5.x、Claude、Gemini などのモデルを利用します。

```bash
hermes chat --provider copilot --model gpt-5.4
```

**認証の選択肢**（この順に調べられます）:

1. `COPILOT_GITHUB_TOKEN` 環境変数
2. `GH_TOKEN` 環境変数
3. `GITHUB_TOKEN` 環境変数
4. `gh auth token` という CLI の受け皿

トークンが見つからない場合、`hermes model` は **OAuth のデバイスコードによるログイン**を提示します。Copilot CLI や opencode が使っているのと同じ流れです。

:::warning トークンの種類
Copilot API は従来の Personal Access Token（`ghp_*`）に対応して**いません**。使えるトークンの種類は次のとおりです。

| 種類 | 接頭辞 | 取得方法 |
|------|--------|------------|
| OAuth トークン | `gho_` | `hermes model` → GitHub Copilot → Login with GitHub |
| きめ細かい PAT | `github_pat_` | GitHub Settings → Developer settings → Fine-grained tokens（**Copilot Requests** の権限が必要） |
| GitHub App のトークン | `ghu_` | GitHub App のインストール経由 |

`gh auth token` が `ghp_*` のトークンを返す場合は、代わりに `hermes model` から OAuth で認証してください。
:::

:::info Hermes における Copilot の認証の挙動
Hermes は対応するかたちの GitHub トークン（`gho_*`、`github_pat_*`、`ghu_*`）を `api.githubcopilot.com` へ直接送り、Copilot 固有のヘッダー（`Editor-Version`、`Copilot-Integration-Id`、`Openai-Intent`、`x-initiator`）を添えます。

HTTP 401 が返ったとき、Hermes はフォールバックの前に一度だけ認証情報の回復を試みます。

1. 通常の優先順位の連鎖でトークンを取り直す（`COPILOT_GITHUB_TOKEN` → `GH_TOKEN` → `GITHUB_TOKEN` → `gh auth token`）
2. 更新したヘッダーで、共有の OpenAI クライアントを作り直す
3. リクエストを 1 回だけやり直す

古い有志のプロキシには、`api.github.com/copilot_internal/v2/token` の交換の流れを使うものがあります。このエンドポイントは、アカウントの種類によっては使えません（404 を返します）。そのため Hermes は、トークンを直接使う認証を主たる経路として保ち、堅牢さは実行時の認証情報の取り直しと再試行で担保しています。
:::

**API の振り分け**: GPT-5 以降のモデル（`gpt-5-mini` を除く）は自動的に Responses API を使います。それ以外のモデル（GPT-4o、Claude、Gemini など）は Chat Completions を使います。モデルは Copilot の最新カタログから自動で検出されます。

**`copilot-acp` — Copilot ACP のエージェントを裏側に使う方式**。ローカルの Copilot CLI を子プロセスとして起動します。

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
| `HERMES_COPILOT_ACP_COMMAND` | Copilot CLI の実行ファイルのパスを上書きします（既定: `copilot`） |
| `HERMES_COPILOT_ACP_ARGS` | ACP の引数を上書きします（既定: `--acp --stdio`） |

### 一級の API キー方式プロバイダー {#first-class-api-key-providers}

次のプロバイダーは、専用のプロバイダー ID を持つ組み込み対応です。API キーを設定し、`--provider` で選びます。

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

Fireworks は `accounts/fireworks/models/kimi-k2p6` のような、スラッシュ区切りの独自のカタログ ID を使います。`hermes model` を実行して **Fireworks AI** を選び、最新のカタログから選ぶか、別の Fireworks のモデル ID を入力してください。既定のエンドポイントは `https://api.fireworks.ai/inference/v1` です。別のエンドポイントを使うときは `.env` ではなく、`config.yaml` の `model.base_url` で設定します。

`config.yaml` でプロバイダーを固定することもできます。
```yaml
model:
  provider: "gmi"
  default: "zai-org/GLM-5.1-FP8"
```

ベース URL は `NOVITA_BASE_URL`、`GLM_BASE_URL`、`KIMI_BASE_URL`、`MINIMAX_BASE_URL`、`MINIMAX_CN_BASE_URL`、`DASHSCOPE_BASE_URL`、`XIAOMI_BASE_URL`、`GMI_BASE_URL`、`META_BASE_URL`、`TOKENHUB_BASE_URL` の各環境変数で上書きできます。

:::note Meta の貢献者向けの等級
`muse-spark-1.2-contributor` は Meta の割引された等級です。Meta が入力と出力を学習に使う可能性があるため、使う前に[対話式のモデル選択で確認を求めます](/hermes/docs/user-guide/configuring-models/)。秘密にしたい仕事には `muse-spark-1.2`（標準価格・学習なし）を使ってください。
:::

:::note Z.AI のエンドポイント自動判定
Z.AI / GLM のプロバイダーを使うと、Hermes は複数のエンドポイント（グローバル、中国、コーディング向けの派生）を自動で試し、API キーを受け付けるものを探します。`GLM_BASE_URL` を手で設定する必要はありません。動くエンドポイントは自動で見つけられ、記憶されます。
:::

### xAI（Grok） — Responses API とプロンプトキャッシュ {#xai-grok-responses-api-prompt-caching}

xAI は Responses API（`codex_responses` トランスポート）につないであり、Grok 4 系のモデルで推論が自動的に有効になります。`reasoning_effort` のパラメーターは不要で、サーバー側が既定で推論します。`~/.hermes/.env` に `XAI_API_KEY` を設定し、`hermes model` で xAI を選ぶか、`/model grok-4-fast-reasoning` のように `grok` を近道として使ってください。

SuperGrok と X Premium+ の契約者は、API キーを使わずブラウザーの OAuth でサインインできます。`hermes model` で **xAI Grok OAuth (SuperGrok / Premium+)** を選ぶか、`hermes auth add xai-oauth` を実行します。同じ OAuth のベアラートークンは、xAI へ直接つながるツール（TTS、画像生成、動画生成、文字起こし）でも自動的に使い回されます。全体の流れは [xAI Grok OAuth ガイド](/hermes/docs/guides/xai-grok-oauth/)を参照してください。Hermes をリモートのホストで動かしている場合は、必要になる `ssh -L` のトンネルについて [SSH 越しの OAuth / リモートホスト](/hermes/docs/guides/oauth-over-ssh/)もあわせて参照してください。

xAI をプロバイダーとして使っている間（ベース URL に `x.ai` を含むもの全般）、Hermes はすべての API リクエストに `x-grok-conv-id` ヘッダーを添えて、プロンプトキャッシュを自動的に有効にします。これにより会話のセッション内では同じサーバーへリクエストが向かい、xAI の基盤側がシステムプロンプトと会話の履歴のキャッシュを再利用できます。

設定は不要です。xAI のエンドポイントが検出され、セッション ID が使えるときに自動で有効になります。何往復もする会話では、これで待ち時間と費用が下がります。

xAI は専用の TTS エンドポイント（`/v1/tts`）も提供しています。`hermes tools` → Voice & TTS で **xAI TTS** を選ぶか、設定については[音声と TTS](/hermes/docs/user-guide/features/tts/#text-to-speech) のページを参照してください。

**引退する xAI のモデルの移行（2026 年 5 月 15 日）:** xAI は 2026-05-15 に `grok-4*`、`grok-3`、`grok-code-fast-1`、`grok-imagine-image-pro` を引退させます。`hermes doctor` と `hermes chat` の起動時のどちらも、引退する参照を指したままの設定を検出して、推奨の置き換え先を表示します。設定を一度に書き換えるには `hermes migrate xai` を使ってください。既定では実行せずに内容を見せるだけで、`--apply` を付けると書き込みます（`config.yaml.bak-pre-migrate-xai-*` という日時付きのバックアップが自動で作られます）。

```bash
hermes migrate xai          # preview replacements
hermes migrate xai --apply  # rewrite ~/.hermes/config.yaml in place
```

**xAI の Web 検索バックエンド。** [Web 検索](/hermes/docs/user-guide/features/web-search/)のツール群を有効にしているとき、`web.backend: xai` を指定すると、検索は同じ `XAI_API_KEY` / OAuth の認証情報を使って xAI のホスト型検索エンドポイントへ回されます。xAI をすでにプロバイダーとして設定してあれば、追加の準備は要りません。

### NovitaAI {#novitaai}

[NovitaAI](https://novita.ai) は、作り手とエージェントのための AI ネイティブなクラウドです。製品は 3 つの系統からなり、200 以上のモデルを扱う Model API、AI エージェントを作って動かす Agent Sandbox、規模を変えられる計算資源の GPU Cloud が、いずれも 1 つのプラットフォームから使えます。

```bash
# Use any available model
hermes chat --provider novita --model moonshotai/kimi-k2.5
# Requires: NOVITA_API_KEY in ~/.hermes/.env

# Short alias
hermes chat --provider novita-ai --model deepseek/deepseek-v3-0324
```

`config.yaml` で固定することもできます。
```yaml
model:
  provider: "novita"
  default: "moonshotai/kimi-k2.5"
  base_url: "https://api.novita.ai/openai/v1"
```

API キーは [novita.ai/settings/key-management](https://novita.ai/settings/key-management) で取得します。ベース URL は `NOVITA_BASE_URL` で上書きできます。

### Ollama Cloud — 運用込みの Ollama モデル、OAuth と API キー {#ollama-cloud-managed-ollama-models-oauth-api-key}

[Ollama Cloud](https://ollama.com/cloud) は、ローカルの Ollama と同じ公開重みのカタログを、GPU なしで使えるように提供します。`hermes model` で **Ollama Cloud** を選び、[ollama.com/settings/keys](https://ollama.com/settings/keys) から API キーを貼り付ければ、Hermes が使えるモデルを自動で見つけます。

```bash
hermes model
# → pick "Ollama Cloud"
# → paste your OLLAMA_API_KEY
# → select from discovered models (gpt-oss:120b, glm-4.6:cloud, qwen3-coder:480b-cloud, etc.)
```

`config.yaml` を直接書いてもかまいません。
```yaml
model:
  provider: "ollama-cloud"
  default: "gpt-oss:120b"
```

モデルの一覧は `ollama.com/v1/models` から動的に取得され、1 時間だけ記憶されます。`model:tag` の書き方（たとえば `qwen3-coder:480b-cloud`）は正規化しても保たれます。ダッシュに置き換えないでください。

:::tip Ollama Cloud とローカルの Ollama
どちらも同じ OpenAI 互換の API を話します。Cloud は一級のプロバイダーで（`--provider ollama-cloud`、`OLLAMA_API_KEY`）、ローカルの Ollama は独自エンドポイントの流れで使います（ベース URL は `http://localhost:11434/v1`、キーは不要）。手元で動かせない大きなモデルには Cloud を、プライバシーやオフラインの作業にはローカルを使ってください。
:::

### AWS Bedrock {#aws-bedrock}

AWS Bedrock 経由で Anthropic Claude、Amazon Nova、DeepSeek v3.2、Meta Llama 4 などのモデルを使います。認証には AWS SDK（`boto3`）の認証情報の連鎖を使うので、API キーは要らず、標準的な AWS の認証だけで済みます。

```bash
# Simplest — named profile in ~/.aws/credentials
hermes chat --provider bedrock --model us.anthropic.claude-sonnet-4-6

# Or with explicit env vars
AWS_PROFILE=myprofile AWS_REGION=us-east-1 hermes chat --provider bedrock --model us.anthropic.claude-sonnet-4-6
```

`config.yaml` で固定することもできます。
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

認証には標準の boto3 の連鎖を使います。明示した `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`、`~/.aws/credentials` の `AWS_PROFILE`、EC2/ECS/Lambda 上の IAM ロール、IMDS、SSO のいずれかです。AWS CLI ですでに認証済みなら、環境変数は要りません。

Bedrock は裏で **Converse API** を使います。リクエストは Bedrock のモデル非依存の形へ変換されるので、Claude、Nova、DeepSeek、Llama のどのモデルでも同じ設定が通用します。`BEDROCK_BASE_URL` は、既定以外のリージョンのエンドポイントを呼ぶときにだけ設定してください。

IAM の設定、リージョンの選び方、リージョンをまたぐ推論の手順は [AWS Bedrock ガイド](/hermes/docs/guides/aws-bedrock/)を参照してください。

### Google Vertex AI {#google-vertex-ai}

Vertex の OpenAI 互換エンドポイント経由で、Google Cloud Vertex AI の Gemini モデルを使います。認証は **OAuth2** で、サービスアカウントの JSON か Application Default Credentials（ADC）から発行される短命（約 1 時間）のアクセストークンを使います。**固定の API キーはありません。** トークンの発行と自動更新は Hermes が行い、セッションの途中で `401` が返ったときの再発行も面倒を見ます。

```bash
# Service account JSON (recommended for servers / gateways)
echo "VERTEX_CREDENTIALS_PATH=/path/to/service-account.json" >> ~/.hermes/.env
# or Application Default Credentials
gcloud auth application-default login

hermes model   # → "Google Vertex AI" → project → region → model
```

`config.yaml` に書くこともできます（プロジェクトとリージョンは秘密ではないのでここに置き、認証情報のパスは `.env` に残します）。
```yaml
model:
  provider: "vertex"
  default: "google/gemini-3-flash-preview"   # Vertex requires the google/ prefix
vertex:
  project_id: "my-gcp-project"   # blank → use the project embedded in the credentials
  region: "global"               # required for the Gemini 3.x previews
```

`VERTEX_PROJECT_ID` / `VERTEX_REGION` の環境変数は `config.yaml` の値を上書きします。Hermes は初回の利用時に `google-auth` を遅延インストールします。管理下のインストールが壊れたときは `hermes setup` を実行してください。全体の手順は [Google Vertex AI ガイド](/hermes/docs/guides/google-vertex/)を、固定の API キーで AI Studio を使う道筋は [Google Gemini ガイド](/hermes/docs/guides/google-gemini/)を参照してください。

### Qwen Portal（OAuth） {#qwen-portal-oauth}

ブラウザーで OAuth ログインする、Alibaba の Qwen Portal です。`hermes model` で **Qwen OAuth (Portal)** を選び、ブラウザーでサインインすると、Hermes がリフレッシュトークンを保存します。

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

`HERMES_QWEN_BASE_URL` は、ポータルのエンドポイントが移転したときにだけ設定してください（既定: `https://portal.qwen.ai/v1`）。

:::tip Qwen OAuth と Qwen Cloud（Alibaba DashScope）
`qwen-oauth` は個人向けの Qwen Portal を OAuth ログインで使うもので、個人の利用に向いています。`alibaba` プロバイダーは Qwen Cloud（Alibaba DashScope）を `DASHSCOPE_API_KEY` で使うもので、プログラムからの利用や本番の負荷に向いています。どちらも Qwen 系のモデルへ向かいますが、エンドポイントは別です。
:::

### Alibaba Cloud（Coding Plan） {#alibaba-cloud-coding-plan}

Alibaba の **Coding Plan**（標準の DashScope API とは別の価格の区分）を契約している場合、Hermes はそれを独立した一級のプロバイダー `alibaba-coding-plan` として公開します。エンドポイントは `https://coding-intl.dashscope.aliyuncs.com/v1` です。通常の `alibaba` プロバイダーと同じく OpenAI 互換ですが、ベース URL と課金の窓口が違います。

```yaml
model:
  provider: alibaba_coding     # alias for alibaba-coding-plan
  model: qwen3-coder-plus
```

CLI から使うこともできます。

```bash
hermes chat --provider alibaba_coding --model qwen3-coder-plus
```

`alibaba_coding` は、`alibaba` の設定ですでに使っているのと同じ `DASHSCOPE_API_KEY` を使います。別のキーは要らず、振り分け先が違うだけです。このプロバイダーが登録される前は、`config.yaml` に `provider: alibaba_coding` と書いた利用者は、黙って OpenRouter の振り分けへ落ちていました。

### MiniMax（OAuth） {#minimax-oauth}

ブラウザーでの OAuth ログインで MiniMax-M2.7 を使います。API キーは要りません。`hermes model` で **MiniMax (OAuth)** を選び、ブラウザーでサインインすると、Hermes がアクセストークンとリフレッシュトークンを保存します。裏では Anthropic Messages 互換のエンドポイント（`/anthropic`）を使います。

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

対応するモデルは `MiniMax-M2.7`（メイン）と `MiniMax-M2.7-highspeed`（補助モデルの既定として設定済み）です。OAuth の経路では `MINIMAX_API_KEY` / `MINIMAX_BASE_URL` は無視されます。

:::tip MiniMax の OAuth と API キー
`minimax-oauth` は MiniMax の個人向けポータルを OAuth ログインで使うもので、支払いの設定は要りません。`minimax` と `minimax-cn` のプロバイダーは `MINIMAX_API_KEY` / `MINIMAX_CN_API_KEY` を使い、プログラムからの利用に向いています。手順の全体は [MiniMax OAuth ガイド](/hermes/docs/guides/minimax-oauth/)を参照してください。
:::

### NVIDIA NIM {#nvidia-nim}

[build.nvidia.com](https://build.nvidia.com)（無料の API キー）またはローカルの NIM エンドポイント経由で、Nemotron などのオープンソースのモデルを使います。

```bash
# Cloud (build.nvidia.com)
hermes chat --provider nvidia --model nvidia/nemotron-3-super-120b-a12b
# Requires: NVIDIA_API_KEY in ~/.hermes/.env

# Local NIM endpoint — override base URL
NVIDIA_BASE_URL=http://localhost:8000/v1 hermes chat --provider nvidia --model nvidia/nemotron-3-super-120b-a12b
```

`config.yaml` で固定することもできます。
```yaml
model:
  provider: "nvidia"
  default: "nvidia/nemotron-3-super-120b-a12b"
```

:::tip ローカルの NIM
自社設備での運用（DGX Spark、手元の GPU）なら、`NVIDIA_BASE_URL=http://localhost:8000/v1` を設定します。NIM は build.nvidia.com と同じ OpenAI 互換の chat completions API を提供するので、クラウドとローカルの切り替えは環境変数 1 行で済みます。
:::

Hermes は `build.nvidia.com` へのすべてのリクエストに、NIM の課金元を示すヘッダーを自動で付けます。設定は不要です。これにより NVIDIA の請求ダッシュボードで、消費が正しい出どころに振り分けられます。

### GMI Cloud {#gmi-cloud}

[GMI Cloud](https://www.gmicloud.ai/) 経由でオープンなモデルや推論モデルを使います。OpenAI 互換の API で、API キーによる認証です。

```bash
# GMI Cloud
hermes chat --provider gmi --model deepseek-ai/DeepSeek-V3.2
# Requires: GMI_API_KEY in ~/.hermes/.env
```

`config.yaml` で固定することもできます。
```yaml
model:
  provider: "gmi"
  default: "deepseek-ai/DeepSeek-V3.2"
```

ベース URL は `GMI_BASE_URL` で上書きできます（既定: `https://api.gmi-serving.com/v1`）。

### Actual Computer {#actual-computer}

[Actual Computer](https://actual.inc) を使って、自分の機材を非公開の推論クラスターにします。提供の形は 2 つあり、どちらも OpenAI 互換です（Hermes は Responses API のトランスポートを使います）。

- **ホスト型の中継** — `https://api.actual.inc`。端から端まで暗号化され、*自分の*クラスターへ振り分けられます。認証には [actual.inc/user/keys](https://actual.inc/user/keys) の `ac_` で始まる推論キーを使います。
- **ローカルのデーモン** — 手元の `http://127.0.0.1:8080` で動き、完全にオフラインです。API キーは要りません。Hermes がループバックのベース URL を検出し、内部の代用値で自動的に認証します。

```bash
# Hosted relay (ACTUAL_API_KEY in ~/.hermes/.env)
hermes chat --provider actual --model <model-id-from-your-cluster>

# Local daemon (ACTUAL_BASE_URL=http://127.0.0.1:8080 in ~/.hermes/.env, no key)
hermes chat --provider actual --model <installed-model-name>
```

`config.yaml` で固定することもできます。
```yaml
model:
  provider: "actual"
  default: "<model-id>"
```

補足:
- モデル ID はクラスターの `GET /v1/models` から得られます。`hermes model` か `curl -s https://api.actual.inc/v1/models -H "Authorization: Bearer $ACTUAL_API_KEY"` で調べてください。
- ホスト名だけの指定は正規化されます。`ACTUAL_BASE_URL=http://127.0.0.1:8080` は自動的に `http://127.0.0.1:8080/v1` になります。
- 推論の深さは Actual が対応する範囲（`none/low/medium/high/max`）に丸められます。全体設定が `xhigh`/`ultra` でもリクエストが 400 になることはありません。
- 小さなローカルモデルの場合: Hermes の既定のツール一式とシステムプロンプトを合わせると 32k のコンテキストを超えることがあり、llama.cpp 系のサーバーから空のストリームのエラーが返ります。ツールを絞る（`-t file,web`）か、より大きなコンテキストでモデルを読み込んでください。任意の `actual-setup` スキル（`hermes skills install official/devops/actual-setup`）が、設定とトラブルシューティングを詳しく扱っています。
- 別名: `actual-computer`、`actualcomputer`、`aci`。

### StepFun {#stepfun}

[StepFun](https://platform.stepfun.com) 経由で Step 系のモデルを使います。OpenAI 互換の API で、API キーによる認証です。

```bash
# StepFun
hermes chat --provider stepfun --model step-3.5-flash
# Requires: STEPFUN_API_KEY in ~/.hermes/.env
```

`config.yaml` で固定することもできます。
```yaml
model:
  provider: "stepfun"
  default: "step-3.5-flash"
```

ベース URL は `STEPFUN_BASE_URL` で上書きできます（既定: `https://api.stepfun.com/v1`）。

### Hugging Face Inference Providers {#hugging-face-inference-providers}

[Hugging Face Inference Providers](https://huggingface.co/docs/inference-providers) は、統一された OpenAI 互換のエンドポイント（`router.huggingface.co/v1`）から 20 以上のオープンなモデルへ振り分けます。リクエストは自動でいちばん速い利用可能なバックエンド（Groq、Together、SambaNova など）へ回され、失敗時の切り替えも自動です。

```bash
# Use any available model
hermes chat --provider huggingface --model Qwen/Qwen3.5-397B-A17B
# Requires: HF_TOKEN in ~/.hermes/.env

# Short alias
hermes chat --provider hf --model deepseek-ai/DeepSeek-V3.2
```

`config.yaml` で固定することもできます。
```yaml
model:
  provider: "huggingface"
  default: "Qwen/Qwen3.5-397B-A17B"
```

トークンは [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) で取得します。"Make calls to Inference Providers" の権限を必ず有効にしてください。無料枠も付いています（月 0.10 ドル分のクレジット。プロバイダー料金への上乗せはありません）。

モデル名には振り分けの接尾辞を付けられます。`:fastest`（既定）、`:cheapest`、または特定のバックエンドを指定する `:provider_name` です。

ベース URL は `HF_BASE_URL` で上書きできます。

## 独自 / 自前で立てた LLM プロバイダー {#custom-self-hosted-llm-providers}

Hermes Agent は **OpenAI 互換の API エンドポイントなら何とでも**動きます。サーバーが `/v1/chat/completions` を実装していれば、Hermes をそこへ向けられます。つまり、ローカルのモデル、GPU の推論サーバー、複数プロバイダーを束ねるルーター、第三者の API のいずれも使えるということです。

### 基本の設定 {#general-setup}

独自エンドポイントの設定方法は 3 つあります。

**対話式の設定（推奨）:**
```bash
hermes model
# Select "Custom endpoint (self-hosted / VLLM / etc.)"
# Enter: API base URL, API key, Model name
```

**手書きの設定（`config.yaml`）:**
```yaml
# In ~/.hermes/config.yaml
model:
  default: your-model-name
  provider: custom
  base_url: http://localhost:8000/v1
  api_key: your-key-or-leave-empty-for-local
```

:::warning 古い環境変数
`.env` の `LLM_MODEL` は**廃止されました**。モデルとエンドポイントの設定は `config.yaml` が唯一の正本です。`OPENAI_BASE_URL` はいまも尊重されますが、**`openai-api` プロバイダーに限られます**（API キーで直接使うときの OpenAI のエンドポイントを上書きします）。他のプロバイダーや独自エンドポイントでは、`hermes model` を使うか、`config.yaml` の `model.base_url` を直接設定してください。`.env` に古い項目が残っている場合は、次の `hermes setup` か設定の移行のときに自動で消されます。
:::

どちらの方法でも `config.yaml` に保存されます。モデル、プロバイダー、ベース URL の正本はこのファイルです。

### `/model` でモデルを切り替える {#switching-models-with-model}

:::warning hermes model と /model
**`hermes model`**（チャットセッションの外、端末から実行）は、**プロバイダー設定の全工程**です。新しいプロバイダーの追加、OAuth の実行、API キーの入力、独自エンドポイントの設定に使います。

**`/model`**（動いている Hermes のチャットセッションの中で入力）は、**すでに設定済みのプロバイダーとモデルの間を切り替える**ことしかできません。新しいプロバイダーの追加も、OAuth の実行も、API キーの入力もできません。プロバイダーを 1 つしか設定していない場合（たとえば OpenRouter だけ）、`/model` にはそのプロバイダーのモデルしか出てきません。

**新しいプロバイダーを追加するには:** セッションを抜け（`Ctrl+C` か `/quit`）、`hermes model` を実行して新しいプロバイダーを設定し、それから新しいセッションを始めてください。
:::

独自エンドポイントを 1 つでも設定してあれば、セッションの途中でモデルを切り替えられます。

```
/model custom:qwen-2.5          # Switch to a model on your custom endpoint
/model custom                    # Auto-detect the model from the endpoint
/model openrouter:claude-sonnet-4 # Switch back to a cloud provider
```

**名前付きの独自プロバイダー**を設定している場合（下記参照）は、3 つ組の書き方を使います。

```
/model custom:local:qwen-2.5    # Use the "local" custom provider with model qwen-2.5
/model custom:work:llama3       # Use the "work" custom provider with llama3
```

プロバイダーを切り替えると、Hermes はベース URL とプロバイダーを設定に保存するので、再起動しても切り替えが残ります。独自エンドポイントから組み込みのプロバイダーへ切り替えたときは、古いベース URL が自動で消されます。

:::tip
`/model custom`（モデル名なしの素の形）は、エンドポイントの `/models` API に問い合わせ、読み込まれているモデルがちょうど 1 つならそれを自動で選びます。単一のモデルを動かしているローカルのサーバーに便利です。
:::

以降はどれも同じ型で、URL とキーとモデル名を変えるだけです。

---

### Ollama — ローカルのモデル、設定いらず {#ollama-local-models-zero-config}

[Ollama](https://ollama.com/) はコマンド 1 つで公開重みのモデルをローカルで動かします。向いている用途は、手軽なローカルでの試行、秘密を扱う作業、オフラインでの利用です。OpenAI 互換の API 経由でツール呼び出しにも対応します。

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

:::caution Ollama の既定のコンテキスト長はとても短いです
Ollama は既定では、モデルのコンテキストの全体を使いません。VRAM の量に応じて、既定値は次のようになります。

| 使える VRAM | 既定のコンテキスト |
|----------------|----------------|
| 24 GB 未満 | **4,096 トークン** |
| 24〜48 GB | 32,768 トークン |
| 48 GB 以上 | 256,000 トークン |

Hermes Agent がツールを伴うエージェント用途で必要とするコンテキストは、最低 **64,000 トークン**です。これより小さいものは起動時に拒否されます。システムプロンプト、ツールのスキーマ、進行中の会話の状態が、何段階もの作業を確実にこなすだけの余地を必要とするからです。

**増やし方**（どれか 1 つ）:

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

**OpenAI 互換の API（`/v1/chat/completions`）からコンテキスト長を設定することはできません。** サーバー側か Modelfile で設定する必要があります。Ollama を Hermes のようなツールとつなぐときの、いちばんの混乱のもとです。
:::

**コンテキストが正しく設定できたかを確かめる:**

```bash
ollama ps
# Look at the CONTEXT column — it should show your configured value
```

:::tip
使えるモデルの一覧は `ollama list` で確認できます。[Ollama のライブラリ](https://ollama.com/library)にあるモデルは `ollama pull <model>` で取得できます。GPU への割り当ては Ollama が自動で面倒を見るので、たいていの構成では設定は要りません。
:::

---

### vLLM — 高性能な GPU 推論 {#vllm-high-performance-gpu-inference}

[vLLM](https://docs.vllm.ai/) は本番で LLM を提供するときの定番です。向いている用途は、GPU 環境での最大の処理量、大きなモデルの提供、連続バッチ処理です。

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

**コンテキスト長:** vLLM は既定でモデルの `max_position_embeddings` を読みます。それが GPU のメモリを超える場合はエラーになり、`--max-model-len` を下げるよう促されます。`--max-model-len auto` を使えば、収まる最大値を自動で見つけさせることもできます。`--gpu-memory-utilization 0.95`（既定は 0.9）を設定すると、VRAM にもう少しコンテキストを詰め込めます。

**ツール呼び出しには明示のフラグが要ります:**

| フラグ | 用途 |
|------|---------|
| `--enable-auto-tool-choice` | `tool_choice: "auto"`（Hermes の既定）に必要です |
| `--tool-call-parser <name>` | そのモデルのツール呼び出し形式に対応する解析器 |

対応する解析器は `hermes`（Qwen 2.5、Hermes 2/3）、`llama3_json`（Llama 3.x）、`mistral`、`deepseek_v3`、`deepseek_v31`、`xlam`、`pythonic` です。これらのフラグがないとツール呼び出しは動かず、モデルはツール呼び出しをただのテキストとして出力します。

**Qwen の推論解析器:** OpenAI 互換のサーバーが `reasoning`、`reasoning_content`、ストリームで届く推論の差分といった構造化された推論のメタデータを返す場合、Hermes はそれを保持します。ただしそのメタデータは推論・思考の記録として扱われ、アシスタントが表に出す答えの代わりにはなりません。vLLM で提供する Qwen の推論モデルでは、利用者に見える最終的な応答が `content` に入ったままであることを確かめてください。`--reasoning-parser qwen3` を使うと `content` が空になる構成なら、その解析器を無効にするか、`extra_body` を通じて `chat_template_kwargs.enable_thinking: false` のような、サーバーが対応するリクエストの選択肢を渡してください。

:::tip
vLLM は人間に読みやすいサイズ表記に対応します。`--max-model-len 64k`（小文字の k は 1000、大文字の K は 1024 です）。
:::

---

### SGLang — RadixAttention による高速な提供 {#sglang-fast-serving-with-radixattention}

[SGLang](https://github.com/sgl-project/sglang) は vLLM の代わりになるもので、KV キャッシュを再利用する RadixAttention を備えます。向いている用途は、何往復もする会話（前半部分のキャッシュ）、制約付きの生成、構造化された出力です。

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

**コンテキスト長:** SGLang は既定でモデルの設定から読み取ります。上書きするには `--context-length` を使います。モデルが宣言している最大値を超えたい場合は、`SGLANG_ALLOW_OVERWRITE_LONGER_CONTEXT_LEN=1` を設定してください。

**ツール呼び出し:** モデルの系統に合った解析器を `--tool-call-parser` で指定します。`qwen`（Qwen 2.5）、`llama3`、`llama4`、`deepseekv3`、`mistral`、`glm` があります。このフラグがないと、ツール呼び出しはただのテキストとして返ってきます。

:::caution SGLang の出力上限は既定で 128 トークンです
応答が途中で切れているように見えるときは、リクエストに `max_tokens` を足すか、サーバー側で `--default-max-tokens` を設定してください。リクエストで指定がない場合、SGLang の既定は応答あたり 128 トークンしかありません。
:::

---

### llama.cpp / llama-server — CPU と Metal での推論 {#llamacpp-llama-server-cpu-metal-inference}

[llama.cpp](https://github.com/ggml-org/llama.cpp) は、量子化したモデルを CPU、Apple Silicon（Metal）、民生用の GPU で動かします。向いている用途は、データセンター向けの GPU なしでモデルを動かすこと、Mac での利用、末端の機器での運用です。

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

**コンテキスト長（`-c`）:** 最近のビルドの既定は `0` で、GGUF のメタデータからモデルの学習時のコンテキストを読みます。学習時のコンテキストが 128k 以上のモデルでは、KV キャッシュを丸ごと確保しようとしてメモリ不足になることがあります。Hermes では `-c` を明示して、少なくとも 64,000 トークンにしてください。並列のスロット（`-np`）を使う場合、全体のコンテキストはスロットで分け合われます。`-c 64000 -np 4` なら 1 スロットあたり 16k しかなく、動いているセッション 1 つあたりの Hermes の最低条件を下回ります。

そのうえで、Hermes をそこへ向けます。

```bash
hermes model
# Select "Custom endpoint (self-hosted / VLLM / etc.)"
# Enter URL: http://localhost:8080/v1
# Skip API key (local servers don't need one)
# Enter model name — or leave blank to auto-detect if only one model is loaded
```

これでエンドポイントが `config.yaml` に保存され、セッションをまたいで残ります。

:::caution ツール呼び出しには `--jinja` が必要です
`--jinja` がないと、llama-server は `tools` パラメーターを丸ごと無視します。モデルは応答のテキストに JSON を書いてツールを呼ぼうとしますが、Hermes はそれをツール呼び出しとは認識しません。実際の検索の代わりに、`{"name": "web_search", ...}` のような生の JSON がメッセージとして表示されることになります。

ツール呼び出しにネイティブ対応（性能がいちばん良い）: Llama 3.x、Qwen 2.5（Coder を含む）、Hermes 2/3、Mistral、DeepSeek、Functionary。それ以外のモデルは汎用の処理を使い、動きはしますが効率は落ちるかもしれません。全体の一覧は [llama.cpp の関数呼び出しのドキュメント](https://github.com/ggml-org/llama.cpp/blob/master/docs/function-calling.md)を参照してください。

ツール対応が効いているかは、`http://localhost:8080/props` を見て `chat_template` の項目があるかで確かめられます。
:::

:::tip
GGUF のモデルは [Hugging Face](https://huggingface.co/models?library=gguf) から入手できます。Q4_K_M の量子化が、品質とメモリ使用量のつり合いがいちばん取れています。
:::

---

### LM Studio — ローカルのモデルを扱うデスクトップアプリ {#lm-studio-desktop-app-with-local-models}

[LM Studio](https://lmstudio.ai/) は、ローカルのモデルを GUI で動かすデスクトップアプリです。向いている用途は、画面で操作したい人、モデルをすばやく試したいとき、macOS/Windows/Linux の開発者です。

LM Studio のアプリからサーバーを起動する（Developer タブ → Start Server）か、CLI を使います。

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

すでに読み込まれている LM Studio の状態については、Hermes はそのコンテキストをそのまま保ちます。まだ読み込まれていないモデルについては、既定の明示モードでは、Hermes 側でコンテキスト長を設定していない限り `context_length` を送りません。LM Studio が自分のモデル設定を適用できるようにするためです。そのあと Hermes は、読み込み後に LM Studio が報告したコンテキスト長だけを使います。

LM Studio でコンテキスト長を変えるには、次のようにします。

1. モデル選択の隣にある歯車のアイコンをクリックします
2. "Context Length" を、快適に使うには最低でも 64000 に設定します
3. 変更を反映させるためにモデルを読み込み直します
4. 64000 が機材に収まらない場合は、より小さくてコンテキスト長の大きいモデルを検討してください

あるいは CLI を使います: `lms load model-name --context-length 64000`

CLI を使えば、モデルが収まるかどうかを見積もることもできます: `lms load model-name --context-length 64000 --estimate-only`

モデルごとの既定を残すには、My Models タブ → モデルの歯車アイコン → コンテキストサイズを設定します。
:::

LM Studio の Just-In-Time の読み込み / Auto-Evict の機能を使っていて、通常のチャットのリクエストからモデルの読み込みと退避を LM Studio に任せたい場合は、Hermes 側の明示的な事前読み込みを飛ばせます。

```bash
hermes config set model.lmstudio_load_mode jit
```

既定の明示的な事前読み込みへ戻すには、次のようにします。

```bash
hermes config set model.lmstudio_load_mode explicit
```

**ツール呼び出し:** LM Studio 0.3.6 以降で対応しています。ツール呼び出しを学習済みのモデル（Qwen 2.5、Llama 3.x、Mistral、Hermes）は自動で判別され、ツールのバッジ付きで表示されます。それ以外のモデルは汎用の受け皿を使うので、信頼性は落ちるかもしれません。

---

### WSL2 のネットワーク（Windows の利用者向け） {#wsl2-networking-windows-users}

Hermes Agent は Unix 環境を必要とするため、Windows の利用者は WSL2 の中で動かします。モデルのサーバー（Ollama、LM Studio など）が **Windows のホスト側**で動いている場合は、ネットワークの隔たりを埋める必要があります。WSL2 は独自のサブネットを持つ仮想ネットワークアダプターを使うので、WSL2 の中の `localhost` は Linux の仮想マシンを指し、Windows のホストは**指しません**。

:::tip どちらも WSL2 の中なら、問題ありません。
モデルのサーバーも WSL2 の中で動いているなら（vLLM、SGLang、llama-server ではよくあることです）、`localhost` は期待どおりに動きます。同じネットワーク名前空間を共有しているからです。この節は読み飛ばしてかまいません。
:::

#### 選択肢 1: ミラーリングのネットワークモード（推奨） {#option-1-mirrored-networking-mode-recommended}

**Windows 11 22H2 以降**で使えるミラーリングモードでは、`localhost` が Windows と WSL2 の双方向で通じるようになります。いちばん簡単な解決策です。

1. `%USERPROFILE%\.wslconfig`（たとえば `C:\Users\YourName\.wslconfig`）を作るか編集します。
   ```ini
   [wsl2]
   networkingMode=mirrored
   ```

2. PowerShell から WSL を再起動します。
   ```powershell
   wsl --shutdown
   ```

3. WSL2 の端末を開き直します。これで `localhost` から Windows のサービスに届きます。
   ```bash
   curl http://localhost:11434/v1/models   # Ollama on Windows — works
   ```

:::note Hyper-V のファイアウォール
Windows 11 のビルドによっては、Hyper-V のファイアウォールが既定でミラーリングの接続を遮ります。ミラーリングモードにしても `localhost` が通じない場合は、**管理者権限の PowerShell** で次を実行してください。
```powershell
Set-NetFirewallHyperVVMSetting -Name '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}' -DefaultInboundAction Allow
```
:::

#### 選択肢 2: Windows のホスト IP を使う（Windows 10 や古いビルド） {#option-2-use-the-windows-host-ip-windows-10-older-builds}

ミラーリングモードが使えない場合は、WSL2 の中から Windows のホスト IP を調べ、`localhost` の代わりにそれを使います。

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
ホストの IP は WSL2 を再起動すると変わることがあります。シェルの中で動的に取得できます。
```bash
export WSL_HOST=$(ip route show | grep -i default | awk '{ print $3 }')
echo "Windows host at: $WSL_HOST"
curl http://$WSL_HOST:11434/v1/models   # Test Ollama
```

あるいは機材の mDNS 名を使います（WSL2 に `libnss-mdns` が必要です）。
```bash
sudo apt install libnss-mdns
curl http://$(hostname).local:11434/v1/models
```
:::

#### サーバーの待ち受けアドレス（NAT モードでは必須） {#server-bind-address-required-for-nat-mode}

**選択肢 2**（ホスト IP を使う NAT モード）を使う場合、Windows 側のモデルのサーバーは `127.0.0.1` の外からの接続を受け付ける必要があります。既定では、ほとんどのサーバーは localhost でしか待ち受けません。NAT モードの WSL2 からの接続は別の仮想サブネットから来るので、拒否されてしまいます。ミラーリングモードでは `localhost` がそのまま対応づくので、既定の `127.0.0.1` への待ち受けで問題ありません。

| サーバー | 既定の待ち受け | 直し方 |
|--------|-------------|------------|
| **Ollama** | `127.0.0.1` | Ollama を起動する前に `OLLAMA_HOST=0.0.0.0` の環境変数を設定します（Windows のシステム設定 → 環境変数、または Ollama のサービスを編集） |
| **LM Studio** | `127.0.0.1` | Developer タブ → Server settings で **"Serve on Network"** を有効にします |
| **llama-server** | `127.0.0.1` | 起動コマンドに `--host 0.0.0.0` を足します |
| **vLLM** | `0.0.0.0` | 既定ですべてのインターフェースで待ち受けます |
| **SGLang** | `127.0.0.1` | 起動コマンドに `--host 0.0.0.0` を足します |

**Windows での Ollama（詳しく）:** Ollama は Windows のサービスとして動きます。`OLLAMA_HOST` を設定するには、次のようにします。
1. **システムのプロパティ** → **環境変数**を開きます
2. **システム環境変数**を新しく追加します: `OLLAMA_HOST` = `0.0.0.0`
3. Ollama のサービスを再起動します（または再起動します）

#### Windows のファイアウォール {#windows-firewall}

Windows のファイアウォールは、NAT モードでもミラーリングモードでも WSL2 を別のネットワークとして扱います。上の手順を踏んでもつながらない場合は、モデルのサーバーのポートに対してファイアウォールの規則を足してください。

```powershell
# Run in Admin PowerShell — replace PORT with your server's port
New-NetFirewallRule -DisplayName "Allow WSL2 to Model Server" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 11434
```

よく使うポート: Ollama は `11434`、vLLM は `8000`、SGLang は `30000`、llama-server は `8080`、LM Studio は `1234`。

#### 手早い確認 {#quick-verification}

WSL2 の中から、モデルのサーバーに届くかを試します。

```bash
# Replace URL with your server's address and port
curl http://localhost:11434/v1/models          # Mirrored mode
curl http://172.29.192.1:11434/v1/models       # NAT mode (use your actual host IP)
```

モデルの一覧が JSON で返ってくれば大丈夫です。その同じ URL を Hermes の設定の `base_url` に使ってください。

---

### ローカルのモデルのトラブルシューティング {#troubleshooting-local-models}

ここに挙げる問題は、Hermes と組み合わせたときに**すべての**ローカルの推論サーバーに関わります。

#### WSL2 から Windows 側のモデルのサーバーへ "Connection refused" になる {#connection-refused-from-wsl2-to-a-windows-hosted-model-server}

Hermes を WSL2 の中で、モデルのサーバーを Windows のホストで動かしている場合、WSL2 の既定の NAT ネットワークでは `http://localhost:<port>` は通じません。直し方は上の [WSL2 のネットワーク](#wsl2-networking-windows-users)を参照してください。

#### ツール呼び出しが実行されずテキストとして出てくる {#tool-calls-appear-as-text-instead-of-executing}

モデルが実際にツールを呼ばず、`{"name": "web_search", "arguments": {...}}` のようなものをメッセージとして出力します。

**原因:** サーバー側でツール呼び出しが有効になっていないか、そのサーバーのツール呼び出しの実装ではそのモデルが対応していません。

| サーバー | 直し方 |
|--------|-----|
| **llama.cpp** | 起動コマンドに `--jinja` を足します |
| **vLLM** | `--enable-auto-tool-choice --tool-call-parser hermes` を足します |
| **SGLang** | `--tool-call-parser qwen`（または適切な解析器）を足します |
| **Ollama** | ツール呼び出しは既定で有効です。モデルが対応しているかを確かめてください（`ollama show model-name` で確認できます） |
| **LM Studio** | 0.3.6 以降に更新し、ツール呼び出しにネイティブ対応したモデルを使います |

#### モデルが文脈を忘れる・支離滅裂な応答をする {#model-seems-to-forget-context-or-give-incoherent-responses}

**原因:** コンテキストが小さすぎます。会話がコンテキストの上限を超えると、たいていのサーバーは古いメッセージを黙って捨てます。Hermes のシステムプロンプトとツールのスキーマだけで 4k〜8k トークンを使うことがあります。

**調べ方:**

```bash
# Check what Hermes thinks the context is
# Look at startup line: "Context limit: X tokens"

# Check your server's actual context
# Ollama: ollama ps (CONTEXT column)
# llama.cpp: curl http://localhost:8080/props | jq '.default_generation_settings.n_ctx'
# vLLM: check --max-model-len in startup args
```

**直し方:** エージェント用途では、コンテキストを最低 **64,000 トークン**に設定します。具体的なフラグは、上の各サーバーの節を参照してください。

#### 起動時に "Context limit: 2048 tokens" と出る {#context-limit-2048-tokens-at-startup}

Hermes はサーバーの `/v1/models` エンドポイントからコンテキスト長を自動で判定します。サーバーが小さな値を報告する（あるいはまったく報告しない）場合、Hermes はモデルが宣言している上限を使いますが、それが間違っていることがあります。

**直し方:** `config.yaml` で明示します。

```yaml
model:
  default: your-model
  provider: custom
  base_url: http://localhost:11434/v1
  context_length: 64000
```

#### 応答が文の途中で切れる {#responses-get-cut-off-mid-sentence}

**考えられる原因:**
1. **サーバー側の出力上限（`max_tokens`）が小さい** — SGLang の既定は応答あたり 128 トークンです。サーバーで `--default-max-tokens` を設定するか、config.yaml の `model.max_tokens` で Hermes 側を設定してください。なお `max_tokens` が決めるのは応答の長さだけで、会話の履歴をどれだけ長く保てるか（そちらは `context_length`）とは無関係です。
2. **コンテキストの枯渇** — モデルがコンテキストを使い切りました。`model.context_length` を増やすか、Hermes の[コンテキスト圧縮](/hermes/docs/user-guide/configuration/#context-compression)を有効にしてください。

---

### LiteLLM Proxy — 複数プロバイダーのゲートウェイ {#litellm-proxy-multi-provider-gateway}

[LiteLLM](https://docs.litellm.ai/) は、100 以上の LLM プロバイダーを 1 つの API の裏にまとめる OpenAI 互換のプロキシです。向いている用途は、設定を変えずにプロバイダーを切り替えること、負荷分散、フォールバックの連鎖、予算の管理です。

```bash
# Install and start
pip install "litellm[proxy]"
litellm --model anthropic/claude-sonnet-4 --port 4000

# Or with a config file for multiple models:
litellm --config litellm_config.yaml --port 4000
```

そのうえで `hermes model` → Custom endpoint → `http://localhost:4000/v1` と設定します。

フォールバック付きの `litellm_config.yaml` の例:
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

BlockRunAI による [ClawRouter](https://github.com/BlockRunAI/ClawRouter) は、問い合わせの複雑さに応じてモデルを自動で選ぶ、ローカルの振り分けプロキシです。リクエストを 14 の観点で分類し、その仕事をこなせる中でいちばん安いモデルへ回します。支払いは USDC の暗号通貨で行い、API キーは使いません。

```bash
# Install and start
npx @blockrun/clawrouter    # Starts on port 8402
```

そのうえで `hermes model` → Custom endpoint → `http://localhost:8402/v1` → モデル名 `blockrun/auto` と設定します。

振り分けのプロファイル:
| プロファイル | 方針 | 節約 |
|---------|----------|---------|
| `blockrun/auto` | 品質と費用のつり合い | 74-100% |
| `blockrun/eco` | 可能な限り安く | 95-100% |
| `blockrun/premium` | 品質のいちばん高いモデル | 0% |
| `blockrun/free` | 無料のモデルのみ | 100% |
| `blockrun/agentic` | ツール利用に最適化 | 場合による |

:::note
ClawRouter は支払いのために、Base か Solana 上の USDC を入れたウォレットを必要とします。すべてのリクエストは BlockRun のバックエンド API を経由します。ウォレットの状態は `npx @blockrun/clawrouter doctor` で確認できます。
:::

---

### そのほかの互換プロバイダー {#other-compatible-providers}

OpenAI 互換の API を持つサービスなら何でも動きます。よく使われるものをいくつか挙げます。

| プロバイダー | ベース URL | 備考 |
|----------|----------|-------|
| [Together AI](https://together.ai) | `https://api.together.xyz/v1` | クラウドで動くオープンなモデル |
| [Groq](https://groq.com) | `https://api.groq.com/openai/v1` | 極めて高速な推論 |
| [DeepSeek](https://deepseek.com) | `https://api.deepseek.com/v1` | DeepSeek のモデル |
| [Fireworks AI](https://fireworks.ai) | `https://api.fireworks.ai/inference/v1` | オープンなモデルの高速な提供 |
| [GMI Cloud](https://www.gmicloud.ai/) | `https://api.gmi-serving.com/v1` | 運用込みの OpenAI 互換の推論 |
| [Actual Computer](https://actual.inc) | `https://api.actual.inc/v1` | 自分のクラスターへの非公開の中継。ローカルのデーモンは `http://127.0.0.1:8080/v1` |
| [Cerebras](https://cerebras.ai) | `https://api.cerebras.ai/v1` | ウェハースケールのチップによる推論 |
| [Mistral AI](https://mistral.ai) | `https://api.mistral.ai/v1` | Mistral のモデル |
| [OpenAI](https://openai.com) | `https://api.openai.com/v1` | OpenAI への直接の接続 |
| [Azure OpenAI](https://azure.microsoft.com) | `https://YOUR.openai.azure.com/` | 企業向けの OpenAI |
| [LocalAI](https://localai.io) | `http://localhost:8080/v1` | 自前で立てる、複数モデル対応 |
| [Jan](https://jan.ai) | `http://localhost:1337/v1` | ローカルのモデルを扱うデスクトップアプリ |

いずれも `hermes model` → Custom endpoint から、または `config.yaml` で設定できます。

```yaml
model:
  default: meta-llama/Llama-3.1-70B-Instruct-Turbo
  provider: custom
  base_url: https://api.together.xyz/v1
  api_key: your-together-key
```

---

### コンテキスト長の判定 {#context-length-detection}

:::note 混同しやすい 2 つの設定
**`context_length`** は**コンテキストの全体**で、入力*と*出力のトークンを合わせた予算です（たとえば Claude Opus 4.6 なら 200,000）。Hermes はこれを見て、履歴をいつ圧縮するかを決め、API のリクエストを検証します。

**`model.max_tokens`** は**出力の上限**で、*1 回の応答*でモデルが生成できるトークンの最大数です。会話の履歴をどれだけ長く保てるかとは関係ありません。業界で標準的な `max_tokens` という名前はよく混乱のもとになるため、Anthropic のネイティブ API では分かりやすさを優先して `max_output_tokens` に改名されました。

自動判定がコンテキストの大きさを取り違えたときに `context_length` を設定してください。
`model.max_tokens` は、個々の応答の長さを制限したいときにだけ設定します。
:::

Hermes は、そのモデルとプロバイダーに合った正しいコンテキストを判定するために、複数の情報源をたどる連鎖を使います。

1. **設定による上書き** — config.yaml の `model.context_length`（最優先）
2. **独自プロバイダーのモデル別設定** — `providers.<name>.models.<id>.context_length`
3. **保存されたキャッシュ** — 以前に調べた値（再起動しても残ります）
4. **エンドポイントの `/models`** — サーバーの API に問い合わせます（ローカル / 独自エンドポイント）
5. **Anthropic の `/v1/models`** — Anthropic の API に `max_input_tokens` を問い合わせます（API キーの利用者のみ）
6. **OpenRouter の API** — OpenRouter が持つ最新のモデルのメタデータ
7. **Nous Portal** — Nous のモデル ID を接尾辞で OpenRouter のメタデータと突き合わせます
8. **[models.dev](https://models.dev)** — 有志が管理する登録簿で、100 以上のプロバイダーにまたがる 3800 以上のモデルについて、プロバイダーごとのコンテキスト長を持っています
9. **既定値** — モデルの系統ごとの大まかな型（既定は 128K）

たいていの構成では、これで何もしなくても動きます。この仕組みはプロバイダーを見ているので、同じモデルでも提供元によってコンテキストの上限が変わります（たとえば `claude-opus-4.6` は Anthropic 直では 1M ですが、GitHub Copilot では 128K です）。

コンテキスト長を明示するには、モデルの設定に `context_length` を足します。

```yaml
model:
  default: "qwen3.5:9b"
  base_url: "http://localhost:8080/v1"
  context_length: 131072  # tokens
```

独自エンドポイントでは、モデルごとにコンテキスト長を設定することもできます。

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

独自エンドポイントを設定するとき、`hermes model` はコンテキスト長を尋ねます。自動判定に任せるなら空のままにしてください。

:::tip 手で設定したほうがよい場面
- モデルの最大値より小さい `num_ctx` を指定して Ollama を使っている
- モデルの最大値より下にコンテキストを抑えたい（VRAM を節約するために 128k のモデルを 8k で使う、など）
- `/v1/models` を出していないプロキシの裏で動かしている
:::

---

### 名前付きの独自プロバイダー {#named-custom-providers}

複数の独自エンドポイントを使い分けている場合（たとえばローカルの開発サーバーとリモートの GPU サーバー）、`config.yaml` の `providers:` の辞書に、プロバイダー名を鍵として名前付きの独自プロバイダーを定義できます。

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

各エントリーが受け付けるのは、`api`（エンドポイントのベース URL。`base_url`/`url` も別名として使えます）、`name`（任意の表示名。既定は辞書の鍵）、`key_env` またはインラインの `api_key` または `key_cmd`（下記参照）、`transport`（`chat_completions` / `anthropic_messages` / `codex_responses`）、`default_model`、`models`、`context_length`、`discover_models`、`extra_body`、`extra_headers`、`ssl_ca_cert` / `ssl_verify`、そしてエントリーを削除せずに隠す `enabled: false` です。

#### コマンドで発行する認証情報（`key_cmd`） {#command-minted-credentials-keycmd}

企業のゲートウェイは、固定の API キーではなく短命のベアラートークンを発行することがよくあります（SSO/OIDC の仲介、クラウドの IAM、社内の認証プロキシなど）。そのため `.env` に写したトークンはセッションの途中で古くなり、リクエストが 401 を返しはじめます。`key_cmd` はトークンを*表示する*コマンドを指定するもので、Hermes はそれを実行し、期限の少し手前まで結果を保持します。おかげで長いセッションでも、再起動なしに動き続けます。

```yaml
providers:
  my-gateway:
    base_url: "https://gateway.internal.example.com/v1"
    api_mode: chat_completions
    key_cmd: "my-auth-cli print-token --profile prod"
```

トークンを表示するものなら何でも使えます。`databricks auth token`、`gcloud auth print-access-token`、`az account get-access-token`、`vault read`、Claude Code 方式の `apiKeyHelper` のスクリプトなどです。

コマンドは標準出力に**トークンだけ**を表示する必要があります。素のままでも、`access_token` の項目を持つ JSON でもかまいません（`expires_in` は尊重されます。絶対時刻の `expiry`/`expiresOn` の ISO 形式も同様です）。複数行の出力は、推測せずに拒否されます。期限が示されない場合は、決められた間隔でトークンを発行し直します。

優先順位: 明示した `--api-key` のフラグが依然として最優先です。それがなければ、同じエントリーの中では `key_cmd` が固定の `api_key`/`key_env` より優先されます。発行された認証情報は、メインのエージェントのターンにも、補助タスク（タイトル生成、圧縮、画像認識、埋め込み）にも同じように使われます。

`secrets.command` と混同しないでください。あちらは**起動時に一度だけ**補助のコマンドを実行して、プロセス全体に環境変数を用意するものです。多数の秘密をまとめて返す保管庫やキーチェーンの補助にはそちらを、あるプロバイダーの認証情報をセッションの*最中に*発行し直す必要があるときには `key_cmd` を使ってください。

:::note 古い書き方
以前の設定では、代わりにトップレベルの `custom_providers:` のリストを使っていました。これも今なお動きます（Hermes は両方を読みます）。`hermes update` を実行すると `providers:` の辞書へ自動で移行します（設定 v12）。辞書の形式では項目名が少し違い、旧来の `model` は `default_model` に、旧来の `api_mode` は `transport` になります。
:::

OpenAI 互換のエンドポイントの中には、そのプロバイダー固有のリクエストの項目を必要とするものがあります。該当する独自プロバイダーに `extra_body` のマップを足すと、Hermes はそのエンドポイントへの chat-completions のリクエストごとにそれを混ぜ込みます。

```yaml
providers:
  gemma-local:
    api: http://localhost:8080/v1
    default_model: google/gemma-4-31b-it
    extra_body:
      enable_thinking: true
      reasoning_effort: high
```

サーバーのドキュメントに書かれた形を使ってください。たとえば vLLM の Gemma の構成や一部の NVIDIA NIM のエンドポイントは、`enable_thinking` を `extra_body` の直下ではなく `chat_template_kwargs` の下に置くことを期待します。

```yaml
extra_body:
  chat_template_kwargs:
    enable_thinking: true
```

vLLM で提供する Qwen の推論モデルでは、推論の解析器が生成されたテキストをすべて推論の項目へ振り分けてアシスタントの `content` を空にしてしまうとき、同じ形で思考を無効にできます。

```yaml
extra_body:
  chat_template_kwargs:
    enable_thinking: false
```

設定した `extra_body` は、そのプロバイダーにどこまでもついてきます。エージェントを組み立てるときに混ぜ込まれ、**ゲートウェイのどのターンでも残り**（`/fast` が `service_tier`/`speed` の上書きを重ねるターンでも、それらは `extra_body` を置き換えるのではなく上に重ねられます）、**`/model` を切り替えるたびに導き直されます**。名前付きの独自プロバイダーへ切り替えるとそのプロバイダーの `extra_body` が効き、そこから離れると外れるので、別のプロバイダーへ漏れることはありません。

`hermes model` → Custom Endpoint のウィザードは、API のモードを明示的に尋ねて、その答えを `config.yaml` に保存するようになりました（プロバイダーのエントリーの `transport` として保存されます）。この項目を空のままにした場合は、URL からの自動判定（たとえば `/anthropic` を含むパス → `anthropic_messages`）が引き続き受け皿として働きます。

**独自プロバイダーのモデルでネイティブに画像を扱う。** 独自エンドポイントが、models.dev に載っていない画像対応のモデルを提供している場合は、`model.supports_vision: true` を設定してください。そうすると Hermes は、添付された画像を `vision_analyze` で前処理せず、ネイティブに（`image_url` の部品として）送ります。つまみはこれ 1 つで、`agent.image_input_mode: native` を併せて設定する必要はありません。

```yaml
model:
  provider: custom
  base_url: http://localhost:8080/v1
  default: qwen3.6-35b-a3b
  supports_vision: true   # send images natively; otherwise vision_analyze pre-describes them
```

同じキーは名前付きプロバイダーのモデル単位（`providers.<name>.models.<id>.supports_vision`）でも有効で、YAML の標準的な真偽値（`true/false/yes/no/on/off/1/0`）を受け付けます。

セッションの途中で切り替えるには、3 つ組の書き方を使います。

```
/model custom:local:qwen-2.5       # Use the "local" endpoint with qwen-2.5
/model custom:work:llama3-70b      # Use the "work" endpoint with llama3-70b
/model custom:anthropic-proxy:claude-sonnet-4  # Use the proxy
```

名前付きの独自プロバイダーは、対話式の `hermes model` のメニューからも選べます。

---

### 実例集: Together AI、Groq、Perplexity {#cookbook-together-ai-groq-perplexity}

[そのほかの互換プロバイダー](#other-compatible-providers)に挙げたクラウドのプロバイダーは、いずれも OpenAI の REST の方言を話すので、`providers:` の辞書の下で同じように設定できます。実際に動く 3 つのレシピを示します。どれも `~/.hermes/config.yaml` に書き、対応する API キーは `~/.hermes/.env` に置きます。

#### Together AI {#together-ai}

公開重みのモデル（Llama、MiniMax、Gemma、DeepSeek、Qwen）を、本家の API よりかなり安い価格で提供します。複数のモデルを使い分ける構成の、無難な既定です。

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

Together の `/v1/models` エンドポイントは動くので、`hermes model` が使えるモデルを自動で見つけられます。

#### Groq {#groq}

極めて高速な推論です（Llama-3.3-70B でおよそ 500 tok/s）。カタログは小さいものの、待ち時間が効いてくる対話的な用途に強みがあります。

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

その場で Web を検索し、出典を自動で付けるモデルが欲しいときに便利です。使えるモデルについては厳しいので、最新の一覧は [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api) で確認してください。

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

#### 1 つの設定に複数のプロバイダーを置く {#multiple-providers-in-one-config}

3 つのレシピは組み合わせられます。全部まとめて書いておき、`/model custom:<name>:<model>` でターンごとに切り替えられます。

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
- #15083 で CLI の検証が直ったあとは、`hermes doctor` がこれらの名前について `Unknown provider` の警告を出さないはずです。
- プロバイダーの `/v1/models` エンドポイントに届かない場合（よくあるのは Perplexity です）、`hermes model` は強く拒否せず、警告を出したうえでモデルを保存します。#15136 を参照してください。
- 名前付きのプロバイダーを一切使わず、素の `provider: custom` と `CUSTOM_BASE_URL` の環境変数で済ませたい場合は、#15103 を参照してください。
:::

---

### どの構成を選ぶか {#choosing-the-right-setup}

| 使いどころ | おすすめ |
|----------|-------------|
| **とにかく動いてほしい** | OpenRouter（既定）または Nous Portal |
| **ローカルのモデルを手軽に** | Ollama |
| **本番の GPU での提供** | vLLM または SGLang |
| **Mac / GPU なし** | Ollama または llama.cpp |
| **複数プロバイダーの振り分け** | LiteLLM Proxy または OpenRouter |
| **費用の最適化** | ClawRouter、または `sort: "price"` を指定した OpenRouter |
| **プライバシー最優先** | Ollama、vLLM、llama.cpp（完全にローカル） |
| **企業 / Azure** | 独自エンドポイントで Azure OpenAI |
| **中国の AI モデル** | z.ai（GLM）、Kimi/Moonshot（`kimi-coding` または `kimi-coding-cn`）、MiniMax、Xiaomi MiMo、Tencent TokenHub（いずれも一級のプロバイダー） |

:::tip
プロバイダーは `hermes model` でいつでも切り替えられます。再起動は要りません。どのプロバイダーを使っても、会話の履歴、メモリ、スキルはそのまま引き継がれます。
:::

## 任意の API キー {#optional-api-keys}

| 機能 | プロバイダー | 環境変数 |
|---------|----------|--------------|
| Web のスクレイピング | [Firecrawl](https://firecrawl.dev/) | `FIRECRAWL_API_KEY`、`FIRECRAWL_API_URL` |
| ブラウザーの自動操作 | [Browserbase](https://browserbase.com/) | `BROWSERBASE_API_KEY`、`BROWSERBASE_PROJECT_ID` |
| 画像生成 | [FAL](https://fal.ai/) | `FAL_KEY` |
| 高品質な TTS の声 | [ElevenLabs](https://elevenlabs.io/) | `ELEVENLABS_API_KEY` |
| OpenAI の TTS と音声の文字起こし | [OpenAI](https://platform.openai.com/api-keys) | `VOICE_TOOLS_OPENAI_KEY` |
| Mistral の TTS と音声の文字起こし | [Mistral](https://console.mistral.ai/) | `MISTRAL_API_KEY` |
| セッションをまたぐ利用者のモデル化 | [Honcho](https://honcho.dev/) | `HONCHO_API_KEY` |
| 意味で引く長期記憶 | [Supermemory](https://supermemory.ai) | `SUPERMEMORY_API_KEY` |

### Firecrawl を自前で立てる {#self-hosting-firecrawl}

既定では、Hermes は Web の検索とスクレイピングに [Firecrawl のクラウド API](https://firecrawl.dev/) を使います。Firecrawl をローカルで動かしたい場合は、代わりに自前のインスタンスへ Hermes を向けられます。設定の手順は Firecrawl の [SELF_HOST.md](https://github.com/firecrawl/firecrawl/blob/main/SELF_HOST.md) を参照してください。

**得られるもの:** API キーが不要、レート制限なし、ページ単位の費用なし、データを完全に自分で持てること。

**失うもの:** クラウド版は、高度なボット対策の回避（Cloudflare、CAPTCHA、IP の切り替え）に Firecrawl 独自の "Fire-engine" を使います。自前で立てた場合は基本的な取得と Playwright だけなので、保護されたサイトでは失敗することがあります。検索も Google ではなく DuckDuckGo を使います。

**設定:**

1. Firecrawl の Docker 一式を clone して起動します（API、Playwright、Redis、RabbitMQ、PostgreSQL の 5 コンテナ。おおよそ 4〜8 GB の RAM が必要です）。
   ```bash
   git clone https://github.com/firecrawl/firecrawl
   cd firecrawl
   # In .env, set: USE_DB_AUTHENTICATION=false, HOST=0.0.0.0, PORT=3002
   docker compose up -d
   ```

2. Hermes を自分のインスタンスへ向けます（API キーは不要です）。
   ```bash
   hermes config set FIRECRAWL_API_URL http://localhost:3002
   ```

自前のインスタンスで認証を有効にしている場合は、`FIRECRAWL_API_KEY` と `FIRECRAWL_API_URL` の両方を設定してもかまいません。

## OpenRouter のプロバイダー振り分け {#openrouter-provider-routing}

OpenRouter を使っているときは、リクエストをプロバイダー間でどう振り分けるかを制御できます。`~/.hermes/config.yaml` に `provider_routing` のセクションを足します。

```yaml
provider_routing:
  sort: "throughput"          # "price" (default), "throughput", or "latency"
  # only: ["anthropic"]      # Only use these providers
  # ignore: ["deepinfra"]    # Skip these providers
  # order: ["anthropic", "google"]  # Try providers in this order
  # require_parameters: true  # Only use providers that support all request params
  # data_collection: "deny"   # Exclude providers that may store/train on data
```

**近道:** モデル名の末尾に `:nitro` を付けると処理量で並べ替え（たとえば `anthropic/claude-sonnet-4:nitro`）、`:floor` を付けると価格で並べ替えます。

## OpenRouter の Pareto Code ルーター {#openrouter-pareto-code-router}

OpenRouter は `openrouter/pareto-code` という試験的なコーディング向けモデルのルーターを提供しています。コーディングの品質の基準（[Artificial Analysis](https://artificialanalysis.ai/) の順位付けによる）を満たす中でいちばん安いモデルへ、リクエストを自動で回します。このモデルを選び、`~/.hermes/config.yaml` の `min_coding_score` のつまみを調整してください。

```yaml
model:
  provider: openrouter
  model: openrouter/pareto-code

openrouter:
  min_coding_score: 0.65   # 0.0–1.0; higher = stronger (more expensive) coders. Default 0.65.
```

補足:

- `min_coding_score` が送られるのは、`model.model` が `openrouter/pareto-code` のとき**だけ**です。それ以外のモデルでは、この値は何もしません。
- 空文字列にする（またはその行を消す）と、OpenRouter が使える中でいちばん強いコーダーを選びます。plugins のブロックを省いたときの、記載されている挙動です。
- 同じ日であればスコアごとの選択は決まっていますが、実際に選ばれるモデルは、新しいモデルの登場やベンチマークの更新でパレート境界が動くにつれて変わり得ます。
- ルーターの挙動の全体は OpenRouter の [Pareto Router のドキュメント](https://openrouter.ai/docs/guides/routing/routers/pareto-router)を参照してください。
- メインのエージェントではなく特定の**補助タスク**（圧縮、画像認識など）で Pareto Code ルーターを使いたい場合は、そのタスクの下に `extra_body.plugins` を設定します。[補助モデル → 補助タスクでの OpenRouter の振り分けと Pareto Code](/hermes/docs/user-guide/configuration/#openrouter-routing--pareto-code-for-auxiliary-tasks) を参照してください。

## フォールバックプロバイダー {#fallback-providers}

メインのモデルが失敗したとき（レート制限、サーバーエラー、認証失敗）に Hermes が順に試す、控えのプロバイダーの連鎖を設定します。正典の形は、トップレベルの `fallback_providers:` のリストです。

```yaml
fallback_providers:
  - provider: openrouter
    model: anthropic/claude-sonnet-4
  - provider: anthropic
    model: claude-sonnet-4
    # base_url: http://localhost:8000/v1    # optional, for custom endpoints
    # api_mode: chat_completions           # optional override
```

控えを 1 組だけ書く古い `fallback_model:` の辞書も、後方互換のために受け付けられます。

```yaml
fallback_model:
  provider: openrouter
  model: anthropic/claude-sonnet-4
```

働いたとき、フォールバックは会話を失うことなくセッションの途中でモデルとプロバイダーを差し替えます。連鎖はエントリーを 1 つずつ試し、作動はセッションにつき 1 回だけです。

対応するプロバイダー: `openrouter`、`nous`、`novita`、`openai-codex`、`copilot`、`copilot-acp`、`anthropic`、`gemini`、`qwen-oauth`、`huggingface`、`zai`、`kimi-coding`、`kimi-coding-cn`、`minimax`、`minimax-cn`、`minimax-oauth`、`deepseek`、`nvidia`、`xai`、`xai-oauth`、`ollama-cloud`、`bedrock`、`ai-gateway`、`azure-foundry`、`opencode-zen`、`opencode-go`、`commandcode`、`commandcode-anthropic`、`kilocode`、`xiaomi`、`arcee`、`gmi`、`actual`、`stepfun`、`lmstudio`、`alibaba`、`alibaba-coding-plan`、`tencent-tokenhub`、`tencent-tokenplan`、`nebius-token-factory`、`router`、`custom`。

:::tip
フォールバックの設定は `config.yaml` だけで行います。対話的に設定するなら `hermes fallback` です。どんなときに働くか、連鎖がどう進むか、補助タスクや委任とどう関わるかの詳細は[フォールバックプロバイダー](/hermes/docs/user-guide/features/fallback-providers/)を参照してください。
:::

---

## あわせて読む {#see-also}

- [設定](/hermes/docs/user-guide/configuration/) — 全般の設定（ディレクトリ構成、設定の優先順位、端末のバックエンド、メモリ、圧縮など）
- [環境変数](/hermes/docs/reference/environment-variables/) — すべての環境変数の一覧
