---
title: "LLM とモデルのプロバイダー"
description: ""
upstream_path: integrations/providers.md
upstream_blob: c02d3b8a30bf3969e9018b7e5a490cfafc3aa4df
sources:
  - https://hermes-agent.nousresearch.com/docs/integrations/providers
---

# LLM とモデルのプロバイダー {#llm-and-model-providers}

このページでは、Hermes Agent で使う推論プロバイダーの設定方法を説明します。OpenRouter や Anthropic のようなクラウド API から、Ollama や vLLM のような自分で立てたエンドポイント、さらに高度なルーティングやフォールバックの設定まで扱います。Hermes を使うには、少なくとも 1 つのプロバイダーを設定しておく必要があります。

## 推論プロバイダー {#inference-providers}

LLM につなぐ手段が最低 1 つ必要です。`hermes model` を使うと対話的にプロバイダーとモデルを切り替えられますし、次のように直接設定することもできます。

| プロバイダー | 設定方法 |
|----------|-------|
| **Nous Portal** | `hermes model`（OAuth、サブスクリプション制） |
| **OpenAI Codex** | `hermes model` → **ChatGPT or Codex Subscription**（ChatGPT の OAuth。Codex のモデルを使います） |
| **GitHub Copilot** | `hermes model`（OAuth のデバイスコード方式、`COPILOT_GITHUB_TOKEN`、`GH_TOKEN`、または `gh auth token`） |
| **GitHub Copilot ACP** | `hermes model`（ローカルで `copilot --acp --stdio` を起動します） |
| **Anthropic** | `hermes model`（Claude Max + 追加使用分のクレジットを OAuth で利用。Anthropic の API キーや手動の setup-token にも対応 — 下の注記を参照） |
| **OpenRouter** | `~/.hermes/.env` に `OPENROUTER_API_KEY` |
| **Fireworks AI** | `~/.hermes/.env` に `FIREWORKS_API_KEY`（provider: `fireworks`、別名: `fireworks-ai`、`fw`） |
| **NovitaAI** | `~/.hermes/.env` に `NOVITA_API_KEY`（provider: `novita`、200 以上のモデル、Model API、Agent Sandbox、GPU Cloud） |
| **AI Gateway** | `~/.hermes/.env` に `AI_GATEWAY_API_KEY`（provider: `ai-gateway`） |
| **z.ai / GLM** | `~/.hermes/.env` に `GLM_API_KEY`（provider: `zai`） |
| **Kimi / Moonshot** | `~/.hermes/.env` に `KIMI_API_KEY`（provider: `kimi-coding`） |
| **Kimi / Moonshot（中国）** | `~/.hermes/.env` に `KIMI_CN_API_KEY`（provider: `kimi-coding-cn`、別名: `kimi-cn`、`moonshot-cn`） |
| **Arcee AI** | `~/.hermes/.env` に `ARCEEAI_API_KEY`（provider: `arcee`、別名: `arcee-ai`、`arceeai`） |
| **GMI Cloud** | `~/.hermes/.env` に `GMI_API_KEY`（provider: `gmi`、別名: `gmi-cloud`、`gmicloud`） |
| **Actual Computer** | ホスト型リレーを使うなら `~/.hermes/.env` に `ACTUAL_API_KEY`、ローカルのデーモンを使うなら `ACTUAL_BASE_URL=http://127.0.0.1:8080` — ループバック接続ならキーは不要です（provider: `actual`、別名: `actual-computer`、`actualcomputer`、`aci`） |
| **MiniMax** | `~/.hermes/.env` に `MINIMAX_API_KEY`（provider: `minimax`） |
| **MiniMax China** | `~/.hermes/.env` に `MINIMAX_CN_API_KEY`（provider: `minimax-cn`） |
| **xAI（Grok）— Responses API** | `~/.hermes/.env` に `XAI_API_KEY`（provider: `xai`） |
| **xAI Grok OAuth（SuperGrok）** | `hermes model` → "xAI Grok OAuth (SuperGrok / Premium+)" — ブラウザでログインするだけで、API キーは不要です。[ガイド](/hermes/docs/guides/xai-grok-oauth/)を参照してください |
| **Qwen Cloud（Alibaba DashScope）** | `~/.hermes/.env` に `DASHSCOPE_API_KEY`（provider: `alibaba`） |
| **Alibaba Cloud（Coding Plan）** | `DASHSCOPE_API_KEY`（provider: `alibaba-coding-plan`、別名: `alibaba_coding`）— 課金の SKU が別で、エンドポイントも異なります |
| **Kilo Code** | `~/.hermes/.env` に `KILOCODE_API_KEY`（provider: `kilocode`） |
| **Xiaomi MiMo** | `~/.hermes/.env` に `XIAOMI_API_KEY`（provider: `xiaomi`、別名: `mimo`、`xiaomi-mimo`） |
| **Tencent TokenHub** | `~/.hermes/.env` に `TOKENHUB_API_KEY`（provider: `tencent-tokenhub`、別名: `tencent`、`tokenhub`、`tencentmaas`） |
| **OpenCode Zen** | `~/.hermes/.env` に `OPENCODE_ZEN_API_KEY`（provider: `opencode-zen`） |
| **CommandCode** | `~/.hermes/.env` に `COMMANDCODE_API_KEY`（provider: `commandcode`、別名: `commandcode-chat`。Claude のモデルは `commandcode-anthropic`、別名: `commandcode-claude`）。GOAT / Pro / Max / Provider の各プランで使えます（1 ドルの Go プランは API を使えないため対象外です）。 |
| **OpenCode Go** | `~/.hermes/.env` に `OPENCODE_GO_API_KEY`（provider: `opencode-go`） |
| **OpenCode Free** | キー不要で、API キーもアカウントも登録せずに使えます（provider: `opencode-free`、別名: `free`、`opencode_free`）。`hermes model` または `/model free` で選ぶと、リクエストは匿名で送られます |
| **DeepSeek** | `~/.hermes/.env` に `DEEPSEEK_API_KEY`（provider: `deepseek`） |
| **Hugging Face** | `~/.hermes/.env` に `HF_TOKEN`（provider: `huggingface`、別名: `hf`） |
| **Google / Gemini** | `~/.hermes/.env` に `GOOGLE_API_KEY`（または `GEMINI_API_KEY`）（provider: `gemini`） |
| **Google Vertex AI** | `hermes model` → "Google Vertex AI"（provider: `vertex`。サービスアカウントの JSON か ADC による OAuth2 認証で、課金は GCP 側です） |
| **OpenAI API（直接）** | `~/.hermes/.env` に `OPENAI_API_KEY`（provider: `openai-api`、任意で `OPENAI_BASE_URL`） |
| **Azure AI Foundry** | `hermes model` → "Azure AI Foundry"（provider: `azure-foundry`。Azure OpenAI / Foundry のエンドポイントとキーを使います） |
| **AWS Bedrock** | `hermes model` → "AWS Bedrock"（provider: `bedrock`。boto3 による標準の AWS 認証情報チェーンを使います） |
| **NVIDIA Build** | `~/.hermes/.env` に `NVIDIA_API_KEY`（provider: `nvidia`。build.nvidia.com 上の NIM ホスト型モデル） |
| **Ollama Cloud** | `hermes model` → "Ollama Cloud"（provider: `ollama-cloud`。クラウドでホストされる Ollama API） |
| **Qwen OAuth** | `hermes model` → "Qwen OAuth"（provider: `qwen-oauth`。ブラウザでの PKCE ログイン） |
| **MiniMax OAuth** | `hermes model` → "MiniMax (OAuth)"（provider: `minimax-oauth`。ブラウザでの PKCE ログイン） |
| **StepFun** | `~/.hermes/.env` に `STEPFUN_API_KEY`（provider: `stepfun`） |
| **LM Studio** | `hermes model` → "LM Studio"（provider: `lmstudio`、任意で `LM_API_KEY`） |
| **Custom Endpoint** | `hermes model` → "Custom endpoint" を選びます（内容は `config.yaml` に保存されます） |

公式の API キーを使う手順は、専用の [Google Gemini ガイド](/hermes/docs/guides/google-gemini/)を参照してください。

:::tip モデルキーの別名
`model:` の設定セクションでは、モデル ID を書くキー名として `default:` と `model:` のどちらも使えます。`model: { default: my-model }` と `model: { model: my-model }` は同じ意味です。
:::

### Nous Portal {#nous-portal}

[Nous Portal](https://portal.nousresearch.com) は Nous Research が提供する統合サブスクリプションの入口で、**Hermes Agent を動かすうえで推奨される方法**です。OAuth で 1 回ログインするだけで、300 を超える最前線のエージェント向けモデル（Claude、GPT、Gemini、DeepSeek、Qwen、Kimi、GLM、MiniMax、Grok など）と [Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/)（ウェブ検索、画像生成、TTS、ブラウザ操作）が使えます。料金はプロバイダーごとに契約するのではなく、Nous のサブスクリプションにまとめて請求されます。

```bash
hermes setup --portal     # fresh install — OAuth + provider + gateway in one command
hermes model              # existing install — pick "Nous Portal" from the list
hermes portal info        # inspect login + routing at any time
```

まだサブスクリプションを契約していない場合は、[portal.nousresearch.com/manage-subscription](https://portal.nousresearch.com/manage-subscription) から申し込めます。

**詳しくは:** 専用の [Nous Portal 連携ページ](/hermes/docs/integrations/nous-portal/)（サブスクリプションに含まれるもの、モデルの一覧、トラブルシューティング）と、手順を追って説明した [Nous Portal で Hermes Agent を動かすガイド](/hermes/docs/guides/run-hermes-with-nous-portal/)を参照してください。

**クライアントの識別。** Hermes Agent から Portal に送られるリクエストには、必ず `client=hermes-client-v<version>` というタグ（例: `client=hermes-client-v0.13.0`）が付き、インストール済みのリリースに自動で合わせられます。このタグはメインのチャットループ、補助的な呼び出し、圧縮用の要約、ウェブ抽出といったすべての Portal 経路で送られ、Portal 側の計測で Hermes のトラフィックを他のクライアントと区別できるようにします。設定は不要で、`hermes update` すればタグも自動で更新されます。

**JWT 認証（自動）。** Hermes は Portal へのリクエストにスコープ付きの `inference:invoke` JWT を優先して使い、従来の不透明なセッションキー方式は予備の経路として残しています。設定は不要で、認証情報は OAuth のフローが管理し、裏側で自動的に更新されます。失効したリフレッシュトークンは隔離され、同じ要求が繰り返されないようになっています。

:::info Codex Note
OpenAI Codex プロバイダーはデバイスコード方式で認証します（URL を開いてコードを入力する形です）。得られた認証情報は Hermes 自身の認証ストア `~/.hermes/auth.json` に保存され、`~/.codex/auth.json` に既存の Codex CLI の認証情報があればそれを取り込めます。Codex CLI 本体のインストールは不要です。

トークンの更新が回復不能なエラー（HTTP 4xx、`invalid_grant`、権限の失効など）で失敗した場合、Hermes はそのリフレッシュトークンを無効と判断して使い回すのをやめるので、同じ認証エラーが大量に出ることはありません。次のリクエストでは、代わりに再認証を促すメッセージが表示されます。`hermes auth add openai-codex`（または `hermes model` → **ChatGPT or Codex Subscription**）を実行するとデバイスコードのログインをやり直せます。隔離状態は、次に認証情報の交換が成功した時点で解除されます。
:::

:::warning
Nous Portal や Codex、独自のエンドポイントを使っている場合でも、一部のツール（画像認識、ウェブの要約、MoA）は別枠の「補助」モデルを使います。既定では（`auxiliary.*.provider: "auto"`）、Hermes はこれらの処理を**メインのチャットモデル** — つまり `hermes model` で選んだのと同じモデル — に回します。処理ごとに設定を上書きして、より安価で速いモデル（例: OpenRouter 上の Gemini Flash）へ振り分けることもできます。[補助モデル](/hermes/docs/user-guide/configuration/#auxiliary-models)を参照してください。
:::

:::tip Nous Tool Gateway
Nous Portal の有料サブスクリプションでは、**[Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/)** も使えます。ウェブ検索、画像生成、TTS、ブラウザ操作をサブスクリプション経由で利用でき、追加の API キーは要りません。新規インストールなら `hermes setup --portal` の 1 コマンドで、ログイン、Nous のプロバイダー設定、ゲートウェイの有効化までまとめて済みます。すでに使っている場合は `hermes model` から、あるいはツールごとに `hermes tools` から有効にできます。振り分けの状況は `hermes portal info` でいつでも確認できます。
:::

### モデル管理のための 2 つのコマンド {#two-commands-for-model-management}

Hermes にはモデル関連のコマンドが **2 つ**あり、それぞれ役割が違います。

| コマンド | 実行する場所 | できること |
|---------|-------------|--------------|
| **`hermes model`** | ターミナル（セッションの外） | 設定ウィザード一式 — プロバイダーの追加、OAuth の実行、API キーの入力、エンドポイントの設定 |
| **`/model`** | Hermes のチャットセッション内 | **すでに設定済みの**プロバイダーとモデルをすばやく切り替える |

まだ設定していないプロバイダーに切り替えたいとき（例: OpenRouter だけ設定してあり、Anthropic を使いたいとき）に必要なのは `hermes model` であって、`/model` ではありません。まずセッションを終了し（`Ctrl+C` または `/quit`）、`hermes model` を実行してプロバイダーの設定を済ませてから、新しいセッションを始めてください。

### サブスクリプションのプラン: 何が支払い対象になるのか {#subscription-plans-what-your-plan-pays-for}

いくつかのプロバイダーでは、API キーの代わりに**一般向けサブスクリプション**（Claude Max、ChatGPT、SuperGrok / X Premium+ など）で Hermes にサインインできます。そのサブスクリプションが実際に何を支払っていて、何を支払っていないのかはプロバイダーごとに違い、これが請求まわりで驚く原因のいちばん多いところです。以下の表は要点だけをまとめたもので、詳細は各プロバイダーの節にあります。

> *not currently documented* と書かれているセルは、文字どおりの意味です。Hermes のドキュメントがまだその挙動を明記していない、ということです。推測せず、プロバイダーの請求ダッシュボードで確認し、未確定の事項として扱ってください。

| プラン / 経路 | Hermes で使えるか | 消費されるもの | 消費されないもの | よくある落とし穴 |
|---|---|---|---|---|
| **Anthropic — Claude Max + OAuth** | ✅ 使えます — `hermes model` → Anthropic OAuth。Max プランに加えて、追加使用分のクレジットを購入していることが条件です | Max プランの上に追加した**追加使用分・超過分のクレジット** | **Max プランに元から含まれる利用枠**（Claude Code で既定で使える分） | 元の Max の枠が手つかずのまま残っていても、Hermes の利用はすべて「追加使用分」として請求されます |
| **Anthropic — Claude Pro** | ❌ 使えません — Pro の契約者は OAuth の経路を利用できません | なし（経路自体が使えません） | Pro のサブスクリプション | 一見使えそうに見えますが、使えません。代わりに `ANTHROPIC_API_KEY` を使ってください（トークン従量課金で、Claude のサブスクリプションとは無関係です） |
| **OpenAI Codex — ChatGPT プランの OAuth** | ✅ 使えます — `hermes model` → **ChatGPT or Codex Subscription**（ChatGPT のデバイスコード方式の OAuth ログイン。Codex のモデルを使います） | *not currently documented* | *not currently documented* | ドキュメントが扱っているのは認証とトークン更新だけで、プランの利用枠がどう消費されるかはまだ記載がありません |
| **xAI — SuperGrok / X Premium+ の OAuth** | ✅ 使えます — ブラウザでの OAuth。API キーは不要です | **サブスクリプションの利用枠**（X Search について明記されています。OAuth が API キーより優先され、"uses your subscription quota instead of API spend" とされています）。それ以外の推論の利用枠の扱いは *not currently documented* | OAuth の認証情報が設定され優先されている間は、`XAI_API_KEY` によるトークン従量課金の API 利用 | ログインに成功したのに `HTTP 403` が返る — アプリ内のサブスクリプションが有効でも、xAI が OAuth の API 利用を特定の SuperGrok ティアに限定しているためです |
| **Google — Gemini の一般向けプラン（Google AI Pro / Ultra）** | ❌ 経路の記載がありません — `gemini` プロバイダーは API キー専用です（`GOOGLE_API_KEY` / `GEMINI_API_KEY`）。Vertex AI は GCP の課金を使います | **API キー側の利用枠**（無料枠、または課金を有効にした Google Cloud プロジェクト）— *一般向けプランの消費については記載がありません* | *not currently documented* | 無料枠のキーは、エージェントの数ターンで使い切ることがあります。Hermes はユーザーの 1 ターンにつき複数回モデルを呼ぶことがあるためです |

**Anthropic。** OAuth の経路は Anthropic アカウントに対して Claude Code として接続され、**Claude Max プランで追加使用分のクレジットを購入している場合にのみ動きます**。Max に元から含まれる枠が Hermes に消費されることはなく、上乗せした追加分・超過分だけが消費されます。Claude Pro の契約者はこの経路を使えません。代わりに使えるのは `ANTHROPIC_API_KEY` で、そのキーが属する組織に対して標準の API 料金でトークン従量課金されます。下の [Anthropic（ネイティブ）](#anthropic-native)を参照してください。

**OpenAI Codex。** Hermes は ChatGPT のデバイスコード方式の OAuth で認証し、認証情報を `~/.hermes/auth.json` に保存します。`~/.codex/auth.json` にある既存の Codex CLI の認証情報を取り込むこともできます。どの ChatGPT プランが対象になるのか、Hermes の利用がプランの Codex 上限にどう数えられるのかは**まだ記載されていません**。[Nous Portal](#nous-portal) の下にある Codex の注記が扱っているのは、認証とトークン更新の挙動だけです。

**xAI（SuperGrok / X Premium+）。** ブラウザでの OAuth は、有効な SuperGrok のサブスクリプションでも、連携した X アカウントの X Premium+ のサブスクリプションでも使えます。同じベアラートークンは、xAI に直接つなぐツール（TTS、画像生成、動画生成、文字起こし、X Search）でも再利用されます。ログイン成功後に推論が `HTTP 403` を返す場合、それは古いトークンのせいではなく、xAI 側のティアや権限による制限です。回避策は `XAI_API_KEY` に切り替えることです。下の [xAI（Grok）](#xai-grok--responses-api--prompt-caching)と [xAI Grok OAuth ガイド](/hermes/docs/guides/xai-grok-oauth/)を参照してください。

**Google Gemini。** 一般向けの Gemini サブスクリプションで Hermes にサインインする方法は、現時点ではありません。`gemini` プロバイダーは API キーを受け取り、[Google Vertex AI](#google-vertex-ai) は GCP プロジェクトに課金します。エージェント用途では、課金を有効にした Google Cloud プロジェクトをおすすめします。無料枠は長時間のエージェントセッションには小さすぎます。[Google Gemini ガイド](/hermes/docs/guides/google-gemini/)を参照してください。

:::tip 5 つ契約する代わりに 1 つで
プロバイダーごとのプランの細かい違いを追いかけたくないなら、[Nous Portal](#nous-portal) なら 1 回の OAuth ログインと 1 つのサブスクリプションで 300 以上のモデルをまかなえます。
:::

### Anthropic（ネイティブ） {#anthropic-native}

OpenRouter を経由せず、Anthropic API で Claude のモデルを直接使います。認証方法は 3 通りあります。

:::caution Requires Claude Max "extra usage" credits
`hermes model` → Anthropic OAuth（または `hermes auth add anthropic --type oauth`）で認証すると、Hermes は Anthropic アカウントに対して Claude Code として接続します。**これは Claude Max プランに加入していて、なおかつ追加使用分のクレジットを購入している場合にのみ動きます。** Max プランに元から含まれる枠（Claude Code で既定で使える分）が Hermes に消費されることはなく、上乗せした追加分・超過分だけが消費されます。Claude Pro の契約者はこの経路を使えません。

Max と追加クレジットがない場合は、代わりに `ANTHROPIC_API_KEY` を使ってください。リクエストはそのキーが属する組織に対してトークン従量課金されます（標準の API 料金で、Claude のサブスクリプションとは無関係です）。
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

`hermes model` で Anthropic OAuth を選ぶと、Hermes はトークンを `~/.hermes/.env` にコピーするのではなく、Claude Code 自身の認証情報ストアを優先して使います。こうすることで、更新可能な Claude の認証情報が更新可能なまま保たれます。

設定を固定したい場合は次のようにします。
```yaml
model:
  provider: "anthropic"
  default: "claude-sonnet-4-6"
```

:::tip 別名
`--provider claude` と `--provider claude-code` も `--provider anthropic` の短縮形として使えます。
:::

### GitHub Copilot {#github-copilot}

Hermes は GitHub Copilot を第一級のプロバイダーとして扱い、2 つのモードを用意しています。

**`copilot` — Copilot API に直接つなぐ方式**（推奨）。GitHub Copilot のサブスクリプションを使って、Copilot API 経由で GPT-5.x、Claude、Gemini などのモデルを利用します。

```bash
hermes chat --provider copilot --model gpt-5.4
```

**認証の選択肢**（この順に確認されます）:

1. 環境変数 `COPILOT_GITHUB_TOKEN`
2. 環境変数 `GH_TOKEN`
3. 環境変数 `GITHUB_TOKEN`
4. `gh auth token` CLI による取得

トークンが見つからない場合、`hermes model` は **OAuth のデバイスコードログイン**を案内します。Copilot CLI や opencode と同じ流れです。

:::warning トークンの種類
Copilot API は従来型の個人アクセストークン（`ghp_*`）に**対応していません**。使えるのは次の種類です。

| 種類 | 接頭辞 | 取得方法 |
|------|--------|------------|
| OAuth トークン | `gho_` | `hermes model` → GitHub Copilot → Login with GitHub |
| きめ細かい権限の PAT | `github_pat_` | GitHub Settings → Developer settings → Fine-grained tokens（**Copilot Requests** の権限が必要です） |
| GitHub App のトークン | `ghu_` | GitHub App のインストール経由 |

`gh auth token` が `ghp_*` のトークンを返す場合は、`hermes model` を使って OAuth で認証してください。
:::

:::info Hermes における Copilot の認証の挙動
Hermes は対応しているトークン（`gho_*`、`github_pat_*`、`ghu_*`）を `api.githubcopilot.com` に直接送り、Copilot 固有のヘッダー（`Editor-Version`、`Copilot-Integration-Id`、`Openai-Intent`、`x-initiator`）を付けます。

HTTP 401 が返った場合、Hermes はフォールバックに移る前に一度だけ認証情報の再取得を試みます。

1. 通常の優先順位（`COPILOT_GITHUB_TOKEN` → `GH_TOKEN` → `GITHUB_TOKEN` → `gh auth token`）でトークンを取り直す
2. 更新したヘッダーで共有の OpenAI クライアントを作り直す
3. リクエストを 1 回だけ再送する

古いコミュニティ製のプロキシには、`api.github.com/copilot_internal/v2/token` でトークンを交換する方式を使うものがあります。このエンドポイントはアカウントの種類によっては使えず、404 が返ることがあります。そのため Hermes は直接トークンを送る方式を主経路とし、堅牢性は実行時の認証情報の更新と再送でまかなっています。
:::

**API の振り分け**: GPT-5 以降のモデル（`gpt-5-mini` を除く）は自動的に Responses API を使います。それ以外のモデル（GPT-4o、Claude、Gemini など）は Chat Completions を使います。モデルは Copilot の最新カタログから自動的に検出されます。

**`copilot-acp` — Copilot ACP をエージェントのバックエンドにする方式**。ローカルの Copilot CLI を子プロセスとして起動します。

```bash
hermes chat --provider copilot-acp --model copilot-acp
# Requires the GitHub Copilot CLI in PATH and an existing `copilot login` session
```

**設定を固定する場合:**
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

### API キーで使える第一級のプロバイダー {#first-class-api-key-providers}

これらのプロバイダーは専用のプロバイダー ID を持ち、標準で対応しています。API キーを設定し、`--provider` で選んでください。

```bash
# Fireworks AI
hermes chat --provider fireworks --model accounts/fireworks/models/kimi-k2p6
# Requires: FIREWORKS_API_KEY in ~/.hermes/.env

# NovitaAI Model API
hermes chat --provider novita --model moonshotai/kimi-k2.5
# Requires: NOVITA_API_KEY in ~/.hermes/.env

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

# Tencent TokenHub (Hy3 Preview)
hermes chat --provider tencent-tokenhub --model hy3-preview
# Requires: TOKENHUB_API_KEY in ~/.hermes/.env

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
```

Fireworks は `accounts/fireworks/models/kimi-k2p6` のような、スラッシュ区切りの独自のカタログ ID を使います。`hermes model` を実行して **Fireworks AI** を選ぶと、最新のカタログから選ぶか、別の Fireworks のモデル ID を直接入力できます。既定のエンドポイントは `https://api.fireworks.ai/inference/v1` です。別のエンドポイントを使いたい場合は、`.env` ではなく `config.yaml` の `model.base_url` で設定してください。

`config.yaml` でプロバイダーを固定することもできます。
```yaml
model:
  provider: "gmi"
  default: "zai-org/GLM-5.1-FP8"
```

ベース URL は、環境変数 `NOVITA_BASE_URL`、`GLM_BASE_URL`、`KIMI_BASE_URL`、`MINIMAX_BASE_URL`、`MINIMAX_CN_BASE_URL`、`DASHSCOPE_BASE_URL`、`XIAOMI_BASE_URL`、`GMI_BASE_URL`、`META_BASE_URL`、`TOKENHUB_BASE_URL` で上書きできます。

:::note Meta の contributor ティア
`muse-spark-1.2-contributor` は Meta の割引ティアです。入力したプロンプトと生成結果が学習に使われる可能性があるため、[対話的なモデル選択では使用前に確認を求めます](/hermes/docs/user-guide/configuring-models/)。機密を扱う作業では `muse-spark-1.2`（標準料金、学習に使われません）を使ってください。
:::

:::note Z.AI のエンドポイント自動判別
Z.AI / GLM プロバイダーを使うと、Hermes は複数のエンドポイント（グローバル、中国、coding 系）を自動で試し、API キーが通るものを探します。`GLM_BASE_URL` を手動で設定する必要はありません。使えるエンドポイントが自動で検出され、キャッシュされます。
:::

### xAI（Grok）— Responses API + プロンプトキャッシュ {#xai-grok-responses-api-prompt-caching}

xAI は Responses API（`codex_responses` トランスポート）経由でつながっており、Grok 4 系のモデルでは推論が自動で有効になります。`reasoning_effort` パラメータは不要で、サーバー側が既定で推論します。`~/.hermes/.env` に `XAI_API_KEY` を設定して `hermes model` で xAI を選ぶか、`/model grok-4-fast-reasoning` のように `grok` を近道として指定してください。

SuperGrok と X Premium+ の契約者は、API キーの代わりにブラウザでの OAuth でサインインできます。`hermes model` で **xAI Grok OAuth (SuperGrok / Premium+)** を選ぶか、`hermes auth add xai-oauth` を実行してください。同じ OAuth のベアラートークンは、xAI に直接つなぐツール（TTS、画像生成、動画生成、文字起こし）でも自動的に再利用されます。手順の全体は [xAI Grok OAuth ガイド](/hermes/docs/guides/xai-grok-oauth/)を参照してください。Hermes をリモートのホストで動かしている場合は、必要になる `ssh -L` のトンネルについて [SSH 越しの OAuth / リモートホスト](/hermes/docs/guides/oauth-over-ssh/)も参照してください。

xAI をプロバイダーとして使っているとき（ベース URL に `x.ai` を含む場合）、Hermes はすべての API リクエストに `x-grok-conv-id` ヘッダーを付けて、プロンプトキャッシュを自動的に有効にします。これにより、同じ会話セッション内のリクエストが同じサーバーへ振り分けられ、xAI 側でシステムプロンプトや会話履歴のキャッシュを再利用できます。

設定は不要です。xAI のエンドポイントが検出され、セッション ID が使える状態なら、キャッシュは自動的に働きます。これにより、複数ターンの会話での待ち時間とコストが下がります。

xAI は TTS 専用のエンドポイント（`/v1/tts`）も提供しています。`hermes tools` → Voice & TTS で **xAI TTS** を選ぶか、設定については [Voice & TTS](/hermes/docs/user-guide/features/tts/#text-to-speech) のページを参照してください。

**xAI の提供終了モデルの移行（2026 年 5 月 15 日）:** xAI は 2026-05-15 に `grok-4*`、`grok-3`、`grok-code-fast-1`、`grok-imagine-image-pro` の提供を終了します。`hermes doctor` と `hermes chat` の起動時のどちらでも、提供終了のモデルを指したままの設定を検出し、推奨される置き換え先を表示します。`hermes migrate xai` を使えば設定を一括で書き換えられます。既定はドライランで、`--apply` を付けると実際に書き込まれます（`config.yaml.bak-pre-migrate-xai-*` という日時入りのバックアップが自動で作られます）。

```bash
hermes migrate xai          # preview replacements
hermes migrate xai --apply  # rewrite ~/.hermes/config.yaml in place
```

**xAI のウェブ検索バックエンド。** [ウェブ検索](/hermes/docs/user-guide/features/web-search/)のツールセットを有効にしているとき、`web.backend: xai` を指定すると、検索は同じ `XAI_API_KEY` または OAuth の認証情報を使って xAI のホスト型検索エンドポイント経由になります。xAI をすでにプロバイダーとして設定していれば、追加の設定は要りません。

### NovitaAI {#novitaai}

[NovitaAI](https://novita.ai) は、開発者とエージェントのための AI ネイティブなクラウドです。製品ラインは 3 つあり、200 以上のモデルを扱う Model API、AI エージェントを作って動かす Agent Sandbox、スケールする計算資源を提供する GPU Cloud が、1 つのプラットフォームからまとめて使えます。

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

API キーは [novita.ai/settings/key-management](https://novita.ai/settings/key-management) で取得できます。ベース URL は `NOVITA_BASE_URL` で上書きできます。

### Ollama Cloud — マネージドの Ollama モデル、OAuth + API キー {#ollama-cloud-managed-ollama-models-oauth-api-key}

[Ollama Cloud](https://ollama.com/cloud) は、ローカルの Ollama と同じオープンウェイトのカタログを、GPU なしで使えるようにホストしています。`hermes model` で **Ollama Cloud** を選び、[ollama.com/settings/keys](https://ollama.com/settings/keys) で取得した API キーを貼り付ければ、Hermes が利用可能なモデルを自動で見つけます。

```bash
hermes model
# → pick "Ollama Cloud"
# → paste your OLLAMA_API_KEY
# → select from discovered models (gpt-oss:120b, glm-4.6:cloud, qwen3-coder:480b-cloud, etc.)
```

`config.yaml` に直接書くこともできます。
```yaml
model:
  provider: "ollama-cloud"
  default: "gpt-oss:120b"
```

モデルのカタログは `ollama.com/v1/models` から動的に取得され、1 時間キャッシュされます。`model:tag` という書き方（例: `qwen3-coder:480b-cloud`）は正規化を経ても保たれるので、ダッシュに置き換えないでください。

:::tip Ollama Cloud とローカルの Ollama
どちらも同じ OpenAI 互換 API を話します。クラウド版は第一級のプロバイダーで（`--provider ollama-cloud`、`OLLAMA_API_KEY`）、ローカルの Ollama は Custom Endpoint の流れで使います（ベース URL は `http://localhost:11434/v1`、キーは不要）。手元で動かせない大きなモデルにはクラウドを、プライバシー重視やオフライン作業にはローカルを使ってください。
:::

### AWS Bedrock {#aws-bedrock}

AWS Bedrock 経由で Anthropic Claude、Amazon Nova、DeepSeek v3.2、Meta Llama 4 などのモデルを使います。AWS SDK（`boto3`）の認証情報チェーンを使うため、API キーは不要で、標準的な AWS の認証がそのまま使えます。

```bash
# Simplest — named profile in ~/.aws/credentials
hermes chat --provider bedrock --model us.anthropic.claude-sonnet-4-6

# Or with explicit env vars
AWS_PROFILE=myprofile AWS_REGION=us-east-1 hermes chat --provider bedrock --model us.anthropic.claude-sonnet-4-6
```

`config.yaml` で固定する場合は次のようにします。
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

認証には標準の boto3 チェーンを使います。明示的な `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`、`~/.aws/credentials` の `AWS_PROFILE`、EC2/ECS/Lambda 上の IAM ロール、IMDS、SSO のいずれかです。AWS CLI ですでに認証済みなら、環境変数は要りません。

Bedrock は内部で **Converse API** を使います。リクエストは Bedrock のモデル非依存な形に変換されるため、同じ設定が Claude、Nova、DeepSeek、Llama のいずれのモデルでも通用します。`BEDROCK_BASE_URL` を設定するのは、既定以外のリージョナルエンドポイントを呼ぶときだけにしてください。

IAM の設定、リージョンの選び方、クロスリージョン推論の手順は [AWS Bedrock ガイド](/hermes/docs/guides/aws-bedrock/)を参照してください。

### Google Vertex AI {#google-vertex-ai}

Google Cloud Vertex AI 上の Gemini モデルを、Vertex の OpenAI 互換エンドポイント経由で使います。認証は **OAuth2** で、サービスアカウントの JSON かアプリケーションのデフォルト認証情報（ADC）から、有効期間およそ 1 時間の短命なアクセストークンを発行します。**静的な API キーはありません。** トークンの発行と自動更新は Hermes が行い、セッション途中の `401` に対しても再発行します。

```bash
# Service account JSON (recommended for servers / gateways)
echo "VERTEX_CREDENTIALS_PATH=/path/to/service-account.json" >> ~/.hermes/.env
# or Application Default Credentials
gcloud auth application-default login

hermes model   # → "Google Vertex AI" → project → region → model
```

`config.yaml` に書く場合は次のようにします（プロジェクトとリージョンは秘密ではないのでここに書き、認証情報のパスは `.env` に置きます）。
```yaml
model:
  provider: "vertex"
  default: "google/gemini-3-flash-preview"   # Vertex requires the google/ prefix
vertex:
  project_id: "my-gcp-project"   # blank → use the project embedded in the credentials
  region: "global"               # required for the Gemini 3.x previews
```

環境変数 `VERTEX_PROJECT_ID` / `VERTEX_REGION` は `config.yaml` の値より優先されます。Hermes は初回利用時に `google-auth` を自動でインストールします。管理下のインストールが壊れた場合は `hermes setup` を実行してください。手順の全体は [Google Vertex AI ガイド](/hermes/docs/guides/google-vertex/)を、静的な API キーを使う AI Studio 経由の方法は [Google Gemini ガイド](/hermes/docs/guides/google-gemini/)を参照してください。

### Qwen Portal（OAuth） {#qwen-portal-oauth}

Alibaba の Qwen Portal に、ブラウザでの OAuth ログインで接続します。`hermes model` で **Qwen OAuth (Portal)** を選び、ブラウザでサインインすると、Hermes がリフレッシュトークンを保存します。

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

`HERMES_QWEN_BASE_URL` を設定するのは、Portal のエンドポイントが移転した場合だけにしてください（既定: `https://portal.qwen.ai/v1`）。

:::tip Qwen OAuth と Qwen Cloud（Alibaba DashScope）の違い
`qwen-oauth` は一般利用者向けの Qwen Portal に OAuth でログインする方式で、個人利用に向いています。`alibaba` プロバイダーは `DASHSCOPE_API_KEY` を使う Qwen Cloud（Alibaba DashScope）で、プログラムからの利用や本番の処理に向いています。どちらも Qwen 系のモデルにつながりますが、エンドポイントが異なります。
:::

### Alibaba Cloud（Coding Plan） {#alibaba-cloud-coding-plan}

Alibaba の **Coding Plan**（通常の DashScope API 利用とは別の料金 SKU）に加入している場合、Hermes はそれを独立した第一級のプロバイダー `alibaba-coding-plan` として提供します。エンドポイントは `https://coding-intl.dashscope.aliyuncs.com/v1` です。通常の `alibaba` プロバイダーと同じく OpenAI 互換ですが、ベース URL と課金の系統が異なります。

```yaml
model:
  provider: alibaba_coding     # alias for alibaba-coding-plan
  model: qwen3-coder-plus
```

CLI から使う場合は次のとおりです。

```bash
hermes chat --provider alibaba_coding --model qwen3-coder-plus
```

`alibaba_coding` は、`alibaba` の設定ですでに使っているのと同じ `DASHSCOPE_API_KEY` を使います。別のキーは不要で、振り分け先が違うだけです。このプロバイダーが登録される前は、`config.yaml` に `provider: alibaba_coding` と書いても、何も告げずに OpenRouter の振り分けに落ちていました。

### MiniMax（OAuth） {#minimax-oauth}

MiniMax-M2.7 をブラウザでの OAuth ログインで使います。API キーは不要です。`hermes model` で **MiniMax (OAuth)** を選び、ブラウザでサインインすると、Hermes がアクセストークンとリフレッシュトークンを保存します。内部では Anthropic Messages 互換のエンドポイント（`/anthropic`）を使います。

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

対応モデルは `MiniMax-M2.7`（メイン）と `MiniMax-M2.7-highspeed`（既定の補助モデルとして組み込み済み）です。OAuth の経路では `MINIMAX_API_KEY` / `MINIMAX_BASE_URL` は無視されます。

:::tip MiniMax の OAuth と API キーの違い
`minimax-oauth` は MiniMax の一般利用者向けポータルに OAuth でログインする方式で、課金の設定は不要です。`minimax` と `minimax-cn` プロバイダーは `MINIMAX_API_KEY` / `MINIMAX_CN_API_KEY` を使い、プログラムからの利用向けです。手順の全体は [MiniMax OAuth ガイド](/hermes/docs/guides/minimax-oauth/)を参照してください。
:::

### NVIDIA NIM {#nvidia-nim}

Nemotron などのオープンソースのモデルを、[build.nvidia.com](https://build.nvidia.com)（API キーは無料）またはローカルの NIM エンドポイント経由で使います。

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
オンプレミスの構成（DGX Spark やローカル GPU）では `NVIDIA_BASE_URL=http://localhost:8000/v1` を設定してください。NIM は build.nvidia.com と同じ OpenAI 互換の chat completions API を提供するので、クラウドとローカルの切り替えは環境変数 1 行の変更で済みます。
:::

Hermes は `build.nvidia.com` へのリクエストすべてに、NIM の課金元を示すヘッダーを自動で付けます。設定は不要です。これにより、NVIDIA の請求ダッシュボードで消費が正しい課金元に振り分けられます。

### GMI Cloud {#gmi-cloud}

[GMI Cloud](https://www.gmicloud.ai/) 経由でオープンなモデルや推論モデルを使います。OpenAI 互換の API で、認証は API キーです。

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

[Actual Computer](https://actual.inc) を使って、自分のハードウェアをプライベートな推論クラスタとして使います。提供方式は 2 つあり、どちらも OpenAI 互換です（Hermes は Responses API のトランスポートを使います）。

- **ホスト型リレー** — `https://api.actual.inc`。エンドツーエンドで暗号化され、*自分の*クラスタへ振り分けられます。認証には [actual.inc/user/keys](https://actual.inc/user/keys) で取得した `ac_` で始まる推論キーを使います。
- **ローカルのデーモン** — 端末上の `http://127.0.0.1:8080` で動き、完全にオフラインで使えます。API キーは不要で、Hermes はループバックのベース URL を検出して、内部のプレースホルダーで自動的に認証します。

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
- モデル ID はクラスタの `GET /v1/models` から取得します。`hermes model` で確認するか、`curl -s https://api.actual.inc/v1/models -H "Authorization: Bearer $ACTUAL_API_KEY"` を実行してください。
- ホストだけを書いた場合は正規化されます。`ACTUAL_BASE_URL=http://127.0.0.1:8080` は自動的に `http://127.0.0.1:8080/v1` になります。
- 推論の強さは Actual が対応する範囲（`none/low/medium/high/max`）に丸められるので、全体設定が `xhigh`/`ultra` でもリクエストが 400 になることはありません。
- 小さいローカルモデルの場合、Hermes の既定のツールセット一式とシステムプロンプトだけで 32k のコンテキストを超えてしまい、llama.cpp 系のサーバーが空のストリームを返してエラーになることがあります。ツールセットを絞る（`-t file,web`）か、より大きいコンテキストでモデルを読み込んでください。任意の `actual-setup` スキル（`hermes skills install official/devops/actual-setup`）が、設定とトラブルシューティングを詳しく扱っています。
- 別名: `actual-computer`、`actualcomputer`、`aci`。

### StepFun {#stepfun}

[StepFun](https://platform.stepfun.com) 経由で Step シリーズのモデルを使います。OpenAI 互換の API で、認証は API キーです。

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

[Hugging Face Inference Providers](https://huggingface.co/docs/inference-providers) は、20 以上のオープンなモデルを 1 つの OpenAI 互換エンドポイント（`router.huggingface.co/v1`）にまとめて振り分けます。リクエストはそのとき最も速いバックエンド（Groq、Together、SambaNova など）へ自動的に回され、障害時には自動で切り替わります。

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

トークンは [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) で取得します。その際、"Make calls to Inference Providers" の権限を必ず有効にしてください。無料枠も含まれます（月 0.10 ドル分のクレジットで、プロバイダーの料金への上乗せはありません）。

モデル名の後ろに振り分けの指定を付けられます。`:fastest`（既定）、`:cheapest`、あるいは `:provider_name` で特定のバックエンドを指定できます。

ベース URL は `HF_BASE_URL` で上書きできます。

## 独自・自前ホストの LLM プロバイダー {#custom-self-hosted-llm-providers}

Hermes Agent は **OpenAI 互換の API エンドポイントであれば何でも**使えます。サーバーが `/v1/chat/completions` を実装していれば、Hermes をそこに向けられます。つまり、ローカルのモデル、GPU の推論サーバー、複数プロバイダーをまとめるルーター、その他のサードパーティ API を利用できます。

### 基本的な設定 {#general-setup}

独自エンドポイントの設定方法は 3 通りあります。

**対話的な設定（推奨）:**
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
`.env` の `LLM_MODEL` は**廃止されました**。モデルとエンドポイントの設定は `config.yaml` が唯一の正となります。`OPENAI_BASE_URL` はまだ有効ですが、**`openai-api` プロバイダーに限って**のことです（API キーで直接アクセスする際に OpenAI のエンドポイントを上書きします）。それ以外のプロバイダーや独自エンドポイントでは、`hermes model` を使うか、`config.yaml` の `model.base_url` を直接設定してください。`.env` に古い記述が残っていても、次回の `hermes setup` か設定の移行時に自動で消去されます。
:::

どちらの方法でも設定は `config.yaml` に保存され、モデル・プロバイダー・ベース URL についてはこれが正となります。

### `/model` によるモデルの切り替え {#switching-models-with-model}

:::warning hermes model vs /model
**`hermes model`**（チャットセッションの外、ターミナルで実行）は**プロバイダー設定ウィザード一式**です。新しいプロバイダーの追加、OAuth の実行、API キーの入力、独自エンドポイントの設定に使います。

**`/model`**（Hermes のチャットセッション内で入力）は、**すでに設定済みの**プロバイダーとモデルを切り替えることしかできません。新しいプロバイダーの追加、OAuth の実行、API キーの入力はできません。プロバイダーを 1 つ（例: OpenRouter）しか設定していない場合、`/model` にはそのプロバイダーのモデルしか出てきません。

**新しいプロバイダーを追加するには:** セッションを終了し（`Ctrl+C` または `/quit`）、`hermes model` を実行して新しいプロバイダーを設定してから、新しいセッションを始めてください。
:::

独自エンドポイントを 1 つでも設定してあれば、セッションの途中でモデルを切り替えられます。

```
/model custom:qwen-2.5          # Switch to a model on your custom endpoint
/model custom                    # Auto-detect the model from the endpoint
/model openrouter:claude-sonnet-4 # Switch back to a cloud provider
```

**名前付きの独自プロバイダー**（後述）を設定している場合は、3 つ組の書き方を使います。

```
/model custom:local:qwen-2.5    # Use the "local" custom provider with model qwen-2.5
/model custom:work:llama3       # Use the "work" custom provider with llama3
```

プロバイダーを切り替えると、Hermes はベース URL とプロバイダーを設定に保存するので、再起動しても変更が残ります。独自エンドポイントから組み込みのプロバイダーへ切り替えたときは、不要になったベース URL が自動で消去されます。

:::tip
`/model custom`（モデル名を付けない形）は、エンドポイントの `/models` API に問い合わせ、読み込まれているモデルがちょうど 1 つならそれを自動で選びます。単一のモデルを動かしているローカルサーバーで便利です。
:::

ここから先はすべて同じ形です。URL、キー、モデル名を変えるだけです。

---

### Ollama — ローカルのモデルを設定なしで {#ollama-local-models-zero-config}

[Ollama](https://ollama.com/) は、オープンウェイトのモデルをコマンド 1 つでローカルに動かします。手軽なローカル実験、プライバシーに配慮した作業、オフライン利用に向いています。OpenAI 互換 API 経由でツール呼び出しにも対応します。

```bash
# Install and run a model
ollama pull qwen2.5-coder:32b
ollama serve   # Starts on port 11434
```

続いて Hermes を設定します。

```bash
hermes model
# Select "Custom endpoint (self-hosted / VLLM / etc.)"
# Enter URL: http://localhost:11434/v1
# Skip API key (Ollama doesn't need one)
# Enter model name (e.g. qwen2.5-coder:32b)
```

`config.yaml` に直接書くこともできます。

```yaml
model:
  default: qwen2.5-coder:32b
  provider: custom
  base_url: http://localhost:11434/v1
  context_length: 64000   # See warning below
```

:::caution Ollama のコンテキスト長は既定でかなり短い
Ollama は既定では、モデルの持つコンテキストウィンドウを丸ごと使いません。VRAM の量に応じて、既定値は次のようになります。

| 使える VRAM | 既定のコンテキスト |
|----------------|----------------|
| 24 GB 未満 | **4,096 トークン** |
| 24〜48 GB | 32,768 トークン |
| 48 GB 以上 | 256,000 トークン |

Hermes Agent がツールを使ったエージェント動作をするには、少なくとも **64,000 トークン**のコンテキストが必要です。それより小さいと起動時に拒否されます。システムプロンプト、ツールの定義、進行中の会話の状態を保つには、複数ステップの処理を安定して回せるだけの余地が要るためです。

**増やし方**（いずれか 1 つを選んでください）:

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

**コンテキスト長は OpenAI 互換 API（`/v1/chat/completions`）からは設定できません。** サーバー側か Modelfile で設定する必要があります。Hermes のようなツールと Ollama をつなぐときに、いちばん混乱を招く点です。
:::

**コンテキストが正しく設定されているか確認する:**

```bash
ollama ps
# Look at the CONTEXT column — it should show your configured value
```

:::tip
利用できるモデルは `ollama list` で一覧できます。[Ollama のライブラリ](https://ollama.com/library)にあるモデルは `ollama pull <model>` で取得できます。GPU への割り当ては Ollama が自動で処理するので、たいていの環境では設定は不要です。
:::

---

### vLLM — GPU での高性能な推論 {#vllm-high-performance-gpu-inference}

[vLLM](https://docs.vllm.ai/) は、本番の LLM 提供における定番です。GPU での最大スループット、大きなモデルの提供、連続バッチ処理に向いています。

```bash
pip install vllm
vllm serve meta-llama/Llama-3.1-70B-Instruct \
  --port 8000 \
  --max-model-len 65536 \
  --tensor-parallel-size 2 \
  --enable-auto-tool-choice \
  --tool-call-parser hermes
```

続いて Hermes を設定します。

```bash
hermes model
# Select "Custom endpoint (self-hosted / VLLM / etc.)"
# Enter URL: http://localhost:8000/v1
# Skip API key (or enter one if you configured vLLM with --api-key)
# Enter model name: meta-llama/Llama-3.1-70B-Instruct
```

**コンテキスト長:** vLLM は既定でモデルの `max_position_embeddings` を読みます。それが GPU のメモリを超える場合はエラーになり、`--max-model-len` を小さくするよう促されます。`--max-model-len auto` を使えば、収まる最大値を自動で見つけさせることもできます。`--gpu-memory-utilization 0.95`（既定は 0.9）を設定すると、VRAM にもう少しコンテキストを詰め込めます。

**ツール呼び出しには明示的なフラグが必要です:**

| フラグ | 目的 |
|------|---------|
| `--enable-auto-tool-choice` | `tool_choice: "auto"`（Hermes の既定）に必要です |
| `--tool-call-parser <name>` | モデルのツール呼び出し形式に対応するパーサー |

対応するパーサー: `hermes`（Qwen 2.5、Hermes 2/3）、`llama3_json`（Llama 3.x）、`mistral`、`deepseek_v3`、`deepseek_v31`、`xlam`、`pythonic`。これらのフラグがないとツール呼び出しは動作せず、モデルはツール呼び出しをただのテキストとして出力します。

**Qwen の推論パーサー:** OpenAI 互換のサーバーが `reasoning`、`reasoning_content`、ストリーミングされる推論の差分といった構造化された推論メタデータを返す場合、Hermes はそれを保持します。ただし、あくまで思考の記録として扱い、ユーザーに見える回答の代わりにはしません。vLLM で提供される Qwen の推論モデルでは、最終的にユーザーに見える応答が `content` に入ることを確認してください。もし `--reasoning-parser qwen3` を使うと `content` が空になる環境なら、そのパーサーを無効にするか、`extra_body` を通じて `chat_template_kwargs.enable_thinking: false` のような、サーバーが対応するリクエストオプションを渡してください。

:::tip
vLLM は人が読みやすいサイズ指定に対応しています。`--max-model-len 64k`（小文字の k は 1000、大文字の K は 1024）のように書けます。
:::

---

### SGLang — RadixAttention による高速な提供 {#sglang-fast-serving-with-radixattention}

[SGLang](https://github.com/sgl-project/sglang) は vLLM の代替で、KV キャッシュを再利用する RadixAttention を備えています。複数ターンの会話（接頭辞のキャッシュ）、制約付きのデコード、構造化された出力に向いています。

```bash
pip install "sglang[all]"
python -m sglang.launch_server \
  --model meta-llama/Llama-3.1-70B-Instruct \
  --port 30000 \
  --context-length 65536 \
  --tp 2 \
  --tool-call-parser qwen
```

続いて Hermes を設定します。

```bash
hermes model
# Select "Custom endpoint (self-hosted / VLLM / etc.)"
# Enter URL: http://localhost:30000/v1
# Enter model name: meta-llama/Llama-3.1-70B-Instruct
```

**コンテキスト長:** SGLang は既定でモデルの設定から読み取ります。上書きするには `--context-length` を使ってください。モデルが宣言する最大値を超えたい場合は、`SGLANG_ALLOW_OVERWRITE_LONGER_CONTEXT_LEN=1` を設定します。

**ツール呼び出し:** モデルの系統に合ったパーサーを `--tool-call-parser` で指定します。`qwen`（Qwen 2.5）、`llama3`、`llama4`、`deepseekv3`、`mistral`、`glm` などです。このフラグがないと、ツール呼び出しはただのテキストとして返ってきます。

:::caution SGLang の出力上限は既定で 128 トークン
応答が途中で切れているように見える場合は、リクエストに `max_tokens` を足すか、サーバー側で `--default-max-tokens` を設定してください。リクエストで指定しない限り、SGLang の既定は 1 応答あたり 128 トークンしかありません。
:::

---

### llama.cpp / llama-server — CPU と Metal での推論 {#llamacpp-llama-server-cpu-metal-inference}

[llama.cpp](https://github.com/ggml-org/llama.cpp) は、量子化されたモデルを CPU、Apple Silicon（Metal）、一般向け GPU で動かします。データセンター級の GPU なしでモデルを動かしたい場合、Mac を使っている場合、エッジでの運用に向いています。

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

**コンテキスト長（`-c`）:** 最近のビルドでは既定が `0` で、GGUF のメタデータからモデルの学習時のコンテキストを読み取ります。学習時のコンテキストが 128k を超えるモデルでは、KV キャッシュを丸ごと確保しようとしてメモリ不足になることがあります。Hermes 向けには `-c` を明示して、少なくとも 64,000 トークンにしてください。並列スロット（`-np`）を使う場合、コンテキスト全体はスロットで分割されます。`-c 64000 -np 4` なら 1 スロットあたり 16k しかなく、これは Hermes が 1 セッションあたりに求める最小値を下回ります。

続いて、Hermes をそこへ向けます。

```bash
hermes model
# Select "Custom endpoint (self-hosted / VLLM / etc.)"
# Enter URL: http://localhost:8080/v1
# Skip API key (local servers don't need one)
# Enter model name — or leave blank to auto-detect if only one model is loaded
```

これでエンドポイントが `config.yaml` に保存され、セッションをまたいで残ります。

:::caution `--jinja` is required for tool calling
`--jinja` がないと、llama-server は `tools` パラメータを完全に無視します。モデルは応答テキストの中に JSON を書くことでツールを呼ぼうとしますが、Hermes はそれをツール呼び出しとして認識しないので、実際の検索が走る代わりに `{"name": "web_search", ...}` のような生の JSON がメッセージとして表示されます。

ツール呼び出しにネイティブ対応しているモデル（性能面で最良）: Llama 3.x、Qwen 2.5（Coder を含む）、Hermes 2/3、Mistral、DeepSeek、Functionary。それ以外のモデルは汎用のハンドラーで動きますが、効率は落ちる場合があります。全一覧は [llama.cpp の function calling ドキュメント](https://github.com/ggml-org/llama.cpp/blob/master/docs/function-calling.md)を参照してください。

ツール対応が有効になっているかは、`http://localhost:8080/props` を確認すればわかります。`chat_template` のフィールドが存在しているはずです。
:::

:::tip
GGUF 形式のモデルは [Hugging Face](https://huggingface.co/models?library=gguf) から入手できます。Q4_K_M の量子化は、品質とメモリ使用量のバランスが最も良い選択です。
:::

---

### LM Studio — ローカルモデルを動かすデスクトップアプリ {#lm-studio-desktop-app-with-local-models}

[LM Studio](https://lmstudio.ai/) は、ローカルのモデルを GUI で動かすデスクトップアプリです。視覚的な操作を好む人、モデルを手早く試したい人、macOS / Windows / Linux で開発している人に向いています。

サーバーは LM Studio のアプリから起動する（Developer タブ → Start Server）か、CLI を使います。

```bash
lms server start                        # Starts on port 1234
lms load qwen2.5-coder --context-length 64000
```

続いて Hermes を設定します。

```bash
hermes model
# Select "LM Studio"
# Press Enter to use http://localhost:1234/v1
# Pick one of the discovered models
# If LM Studio server auth is enabled, enter LM_API_KEY when prompted
```

Hermes は、すでに読み込まれている LM Studio インスタンスのコンテキストをそのまま保ちます。まだ読み込まれていないモデルの場合、既定の explicit モードでは、Hermes 側でコンテキスト長を設定していない限り `context_length` を送りません。LM Studio 自身のモデル設定を活かすためです。そのうえで Hermes は、読み込み後に LM Studio が報告したコンテキスト長だけを使います。

LM Studio でコンテキスト長を変えるには、次の手順を踏みます。

1. モデル選択の横にある歯車アイコンをクリックします
2. "Context Length" を少なくとも 64000 に設定します
3. 変更を反映させるためにモデルを読み込み直します
4. 64000 が載らないマシンなら、より小さくてコンテキスト長の大きいモデルを検討してください

CLI を使う方法もあります: `lms load model-name --context-length 64000`

モデルが収まるかどうかは、CLI で見積もれます: `lms load model-name --context-length 64000 --estimate-only`

モデルごとの既定値を保存するには、My Models タブ → モデルの歯車アイコン → コンテキストサイズを設定します。
:::

LM Studio の Just-In-Time 読み込み / Auto-Evict 機能を使っていて、通常のチャットリクエストからモデルの読み込みと破棄を LM Studio に任せたい場合は、Hermes 側の明示的な事前読み込みを省けます。

```bash
hermes config set model.lmstudio_load_mode jit
```

既定の明示的な事前読み込みに戻すには次のようにします。

```bash
hermes config set model.lmstudio_load_mode explicit
```

**ツール呼び出し:** LM Studio 0.3.6 以降で対応しています。ツール呼び出しをネイティブに学習しているモデル（Qwen 2.5、Llama 3.x、Mistral、Hermes）は自動で判別され、ツールのバッジ付きで表示されます。それ以外のモデルは汎用の代替手段を使うため、信頼性は下がる場合があります。

---

### WSL2 のネットワーク（Windows ユーザー向け） {#wsl2-networking-windows-users}

Hermes Agent は Unix 環境を前提とするため、Windows ユーザーは WSL2 の中で動かします。モデルのサーバー（Ollama、LM Studio など）を **Windows 側**で動かしている場合は、ネットワークの隔たりを埋める必要があります。WSL2 は独自のサブネットを持つ仮想ネットワークアダプターを使うので、WSL2 内の `localhost` は Linux の仮想マシンを指し、Windows 側のホストは指しません。

:::tip どちらも WSL2 の中なら問題ありません
モデルのサーバーも WSL2 の中で動いている場合（vLLM、SGLang、llama-server ではよくある構成です）、同じネットワーク名前空間を共有するので `localhost` はそのまま通じます。この節は読み飛ばしてかまいません。
:::

#### 選択肢 1: ミラーモードのネットワーク（推奨） {#option-1-mirrored-networking-mode-recommended}

**Windows 11 22H2 以降**で使えるミラーモードでは、`localhost` が Windows と WSL2 の双方向で通じるようになります。いちばん簡単な解決策です。

1. `%USERPROFILE%\.wslconfig`（例: `C:\Users\YourName\.wslconfig`）を作るか編集します。
   ```ini
   [wsl2]
   networkingMode=mirrored
   ```

2. PowerShell から WSL を再起動します。
   ```powershell
   wsl --shutdown
   ```

3. WSL2 のターミナルを開き直します。これで `localhost` から Windows 側のサービスに届きます。
   ```bash
   curl http://localhost:11434/v1/models   # Ollama on Windows — works
   ```

:::note Hyper-V のファイアウォール
Windows 11 の一部のビルドでは、Hyper-V のファイアウォールが既定でミラーモードの接続を遮断します。ミラーモードを有効にしても `localhost` が通じない場合は、**管理者権限の PowerShell** で次を実行してください。
```powershell
Set-NetFirewallHyperVVMSetting -Name '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}' -DefaultInboundAction Allow
```
:::

#### 選択肢 2: Windows 側のホスト IP を使う（Windows 10 や古いビルド） {#option-2-use-the-windows-host-ip-windows-10-older-builds}

ミラーモードが使えない場合は、WSL2 の中から Windows 側のホスト IP を調べ、`localhost` の代わりにそれを使います。

```bash
# Get the Windows host IP (the default gateway of WSL2's virtual network)
ip route show | grep -i default | awk '{ print $3 }'
# Example output: 172.29.192.1
```

その IP を Hermes の設定に書きます。

```yaml
model:
  default: qwen2.5-coder:32b
  provider: custom
  base_url: http://172.29.192.1:11434/v1   # Windows host IP, not localhost
```

:::tip 動的に取得する方法
ホスト IP は WSL2 を再起動すると変わることがあります。シェルの中で動的に取得できます。
```bash
export WSL_HOST=$(ip route show | grep -i default | awk '{ print $3 }')
echo "Windows host at: $WSL_HOST"
curl http://$WSL_HOST:11434/v1/models   # Test Ollama
```

マシンの mDNS 名を使う方法もあります（WSL2 に `libnss-mdns` が必要です）。
```bash
sudo apt install libnss-mdns
curl http://$(hostname).local:11434/v1/models
```
:::

#### サーバーの待ち受けアドレス（NAT モードでは必須） {#server-bind-address-required-for-nat-mode}

**選択肢 2**（ホスト IP を使う NAT モード）を選んだ場合、Windows 側のモデルサーバーは `127.0.0.1` 以外からの接続も受け付ける必要があります。既定ではほとんどのサーバーが localhost だけを待ち受けており、NAT モードの WSL2 からの接続は別の仮想サブネットから来るため拒否されます。ミラーモードなら `localhost` がそのまま対応づけられるので、既定の `127.0.0.1` への待ち受けで問題ありません。

| サーバー | 既定の待ち受け | 対処法 |
|--------|-------------|------------|
| **Ollama** | `127.0.0.1` | Ollama を起動する前に環境変数 `OLLAMA_HOST=0.0.0.0` を設定します（Windows のシステム設定 → 環境変数、または Ollama のサービスを編集） |
| **LM Studio** | `127.0.0.1` | Developer タブ → Server settings で **"Serve on Network"** を有効にします |
| **llama-server** | `127.0.0.1` | 起動コマンドに `--host 0.0.0.0` を足します |
| **vLLM** | `0.0.0.0` | 既定ですべてのインターフェースを待ち受けます |
| **SGLang** | `127.0.0.1` | 起動コマンドに `--host 0.0.0.0` を足します |

**Windows での Ollama（詳細）:** Ollama は Windows のサービスとして動きます。`OLLAMA_HOST` を設定する手順は次のとおりです。
1. **システムのプロパティ** → **環境変数**を開きます
2. **システム環境変数**として `OLLAMA_HOST` = `0.0.0.0` を追加します
3. Ollama のサービスを再起動します（または再起動します）

#### Windows のファイアウォール {#windows-firewall}

Windows のファイアウォールは、NAT モードでもミラーモードでも WSL2 を別のネットワークとして扱います。上の手順を踏んでも接続できない場合は、モデルサーバーのポートに対してファイアウォールの規則を追加してください。

```powershell
# Run in Admin PowerShell — replace PORT with your server's port
New-NetFirewallRule -DisplayName "Allow WSL2 to Model Server" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 11434
```

よく使うポート: Ollama は `11434`、vLLM は `8000`、SGLang は `30000`、llama-server は `8080`、LM Studio は `1234` です。

#### 手早い確認 {#quick-verification}

WSL2 の中から、モデルサーバーに届くかどうかを確認します。

```bash
# Replace URL with your server's address and port
curl http://localhost:11434/v1/models          # Mirrored mode
curl http://172.29.192.1:11434/v1/models       # NAT mode (use your actual host IP)
```

モデルの一覧が JSON で返ってくれば成功です。その URL を、そのまま Hermes の設定の `base_url` に使ってください。

---

### ローカルモデルのトラブルシューティング {#troubleshooting-local-models}

ここで挙げる問題は、Hermes と組み合わせたときに**すべての**ローカル推論サーバーで起こりえます。

#### WSL2 から Windows 側のモデルサーバーへの接続が拒否される {#connection-refused-from-wsl2-to-a-windows-hosted-model-server}

Hermes を WSL2 の中で、モデルのサーバーを Windows 側で動かしている場合、WSL2 の既定の NAT ネットワークでは `http://localhost:<port>` は通じません。対処法は上の [WSL2 のネットワーク](#wsl2-networking-windows-users)を参照してください。

#### ツール呼び出しが実行されずテキストとして出てくる {#tool-calls-appear-as-text-instead-of-executing}

モデルが実際にツールを呼ぶ代わりに、`{"name": "web_search", "arguments": {...}}` のようなものをメッセージとして出力する状態です。

**原因:** サーバー側でツール呼び出しが有効になっていないか、そのサーバーのツール呼び出しの実装にモデルが対応していないかのどちらかです。

| サーバー | 対処法 |
|--------|-----|
| **llama.cpp** | 起動コマンドに `--jinja` を足します |
| **vLLM** | `--enable-auto-tool-choice --tool-call-parser hermes` を足します |
| **SGLang** | `--tool-call-parser qwen`（あるいは適切なパーサー）を足します |
| **Ollama** | ツール呼び出しは既定で有効です。モデル側が対応しているか確認してください（`ollama show model-name` で確認できます） |
| **LM Studio** | 0.3.6 以降に更新し、ツール呼び出しにネイティブ対応したモデルを使います |

#### モデルが文脈を忘れたり、話がかみ合わなくなる {#model-seems-to-forget-context-or-give-incoherent-responses}

**原因:** コンテキストウィンドウが小さすぎます。会話がコンテキストの上限を超えると、多くのサーバーは古いメッセージを黙って捨てます。Hermes のシステムプロンプトとツールの定義だけで 4k〜8k トークンを使うこともあります。

**切り分け:**

```bash
# Check what Hermes thinks the context is
# Look at startup line: "Context limit: X tokens"

# Check your server's actual context
# Ollama: ollama ps (CONTEXT column)
# llama.cpp: curl http://localhost:8080/props | jq '.default_generation_settings.n_ctx'
# vLLM: check --max-model-len in startup args
```

**対処法:** エージェント用途では、コンテキストを少なくとも **64,000 トークン**に設定してください。具体的なフラグは、上の各サーバーの節を参照してください。

#### 起動時に "Context limit: 2048 tokens" と出る {#context-limit-2048-tokens-at-startup}

Hermes は、サーバーの `/v1/models` エンドポイントからコンテキスト長を自動で判別します。サーバーが小さい値を返す場合や、そもそも返さない場合、Hermes はモデルが宣言する上限を使いますが、それが正しくないこともあります。

**対処法:** `config.yaml` に明示的に設定します。

```yaml
model:
  default: your-model
  provider: custom
  base_url: http://localhost:11434/v1
  context_length: 64000
```

#### 応答が文の途中で切れる {#responses-get-cut-off-mid-sentence}

**考えられる原因:**
1. **サーバー側の出力上限（`max_tokens`）が小さい** — SGLang の既定は 1 応答あたり 128 トークンです。サーバーで `--default-max-tokens` を設定するか、config.yaml の `model.max_tokens` で Hermes 側を設定してください。なお `max_tokens` が制御するのは応答の長さだけで、会話履歴をどれだけ保持できるか（そちらは `context_length`）とは無関係です。
2. **コンテキストの枯渇** — モデルがコンテキストウィンドウを使い切っています。`model.context_length` を増やすか、Hermes の[コンテキスト圧縮](/hermes/docs/user-guide/configuration/#context-compression)を有効にしてください。

---

### LiteLLM Proxy — 複数プロバイダーのゲートウェイ {#litellm-proxy-multi-provider-gateway}

[LiteLLM](https://docs.litellm.ai/) は、100 を超える LLM プロバイダーを 1 つの API にまとめる OpenAI 互換のプロキシです。設定を変えずにプロバイダーを切り替えたい場合、負荷分散、フォールバックの連鎖、予算の管理に向いています。

```bash
# Install and start
pip install "litellm[proxy]"
litellm --model anthropic/claude-sonnet-4 --port 4000

# Or with a config file for multiple models:
litellm --config litellm_config.yaml --port 4000
```

続いて、`hermes model` → Custom endpoint → `http://localhost:4000/v1` で Hermes を設定します。

フォールバックを含む `litellm_config.yaml` の例です。
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

BlockRunAI による [ClawRouter](https://github.com/BlockRunAI/ClawRouter) は、問い合わせの複雑さに応じてモデルを自動で選ぶローカルのルーティングプロキシです。リクエストを 14 の観点で分類し、その処理をこなせる最も安いモデルへ振り分けます。支払いは USDC の暗号資産で、API キーは使いません。

```bash
# Install and start
npx @blockrun/clawrouter    # Starts on port 8402
```

続いて、`hermes model` → Custom endpoint → `http://localhost:8402/v1` → モデル名 `blockrun/auto` で Hermes を設定します。

ルーティングのプロファイル:
| プロファイル | 方針 | 節約率 |
|---------|----------|---------|
| `blockrun/auto` | 品質とコストのバランス | 74-100% |
| `blockrun/eco` | 可能な限り安く | 95-100% |
| `blockrun/premium` | 最高品質のモデル | 0% |
| `blockrun/free` | 無料のモデルのみ | 100% |
| `blockrun/agentic` | ツール利用に最適化 | 場合による |

:::note
ClawRouter を使うには、Base か Solana 上に USDC を入れたウォレットが必要です。すべてのリクエストは BlockRun のバックエンド API を経由します。ウォレットの状態は `npx @blockrun/clawrouter doctor` で確認できます。
:::

---

### その他の互換プロバイダー {#other-compatible-providers}

OpenAI 互換の API を持つサービスなら何でも使えます。よく使われるものを挙げます。

| プロバイダー | ベース URL | 備考 |
|----------|----------|-------|
| [Together AI](https://together.ai) | `https://api.together.xyz/v1` | クラウドでホストされるオープンなモデル |
| [Groq](https://groq.com) | `https://api.groq.com/openai/v1` | 非常に高速な推論 |
| [DeepSeek](https://deepseek.com) | `https://api.deepseek.com/v1` | DeepSeek のモデル |
| [Fireworks AI](https://fireworks.ai) | `https://api.fireworks.ai/inference/v1` | オープンなモデルの高速ホスティング |
| [GMI Cloud](https://www.gmicloud.ai/) | `https://api.gmi-serving.com/v1` | マネージドの OpenAI 互換推論 |
| [Actual Computer](https://actual.inc) | `https://api.actual.inc/v1` | 自分のクラスタへつなぐプライベートなリレー。ローカルのデーモンは `http://127.0.0.1:8080/v1` |
| [Cerebras](https://cerebras.ai) | `https://api.cerebras.ai/v1` | ウェハースケールのチップによる推論 |
| [Mistral AI](https://mistral.ai) | `https://api.mistral.ai/v1` | Mistral のモデル |
| [OpenAI](https://openai.com) | `https://api.openai.com/v1` | OpenAI への直接アクセス |
| [Azure OpenAI](https://azure.microsoft.com) | `https://YOUR.openai.azure.com/` | 企業向けの OpenAI |
| [LocalAI](https://localai.io) | `http://localhost:8080/v1` | 自前ホスト、複数モデル対応 |
| [Jan](https://jan.ai) | `http://localhost:1337/v1` | ローカルモデルを動かすデスクトップアプリ |

これらは `hermes model` → Custom endpoint から設定するか、`config.yaml` に書きます。

```yaml
model:
  default: meta-llama/Llama-3.1-70B-Instruct-Turbo
  provider: custom
  base_url: https://api.together.xyz/v1
  api_key: your-together-key
```

---

### コンテキスト長の判別 {#context-length-detection}

:::note 混同しやすい 2 つの設定
**`context_length`** は**コンテキストウィンドウ全体**、つまり入力と出力のトークンを合わせた枠です（例: Claude Opus 4.6 なら 200,000）。Hermes はこの値をもとに、履歴をいつ圧縮するかを決め、API リクエストを検証します。

**`model.max_tokens`** は**出力の上限**、つまりモデルが *1 回の応答*で生成できるトークン数の最大値です。会話履歴をどれだけ保持できるかとは関係ありません。業界で標準的に使われている `max_tokens` という名前が混乱のもとになりやすく、Anthropic のネイティブ API では明確さのために `max_output_tokens` へ改名されました。

自動判別がウィンドウの大きさを取り違えるときに `context_length` を設定してください。
`model.max_tokens` を設定するのは、個々の応答の長さを制限したいときだけにしてください。
:::

Hermes は、モデルとプロバイダーに対する正しいコンテキストウィンドウを判別するために、複数の情報源を順に確認します。

1. **設定による上書き** — config.yaml の `model.context_length`（最優先）
2. **独自プロバイダーのモデル別設定** — `providers.<name>.models.<id>.context_length`
3. **永続キャッシュ** — 過去に判別した値（再起動しても残ります）
4. **エンドポイントの `/models`** — サーバーの API に問い合わせます（ローカル / 独自エンドポイント）
5. **Anthropic の `/v1/models`** — Anthropic の API に `max_input_tokens` を問い合わせます（API キー利用者のみ）
6. **OpenRouter の API** — OpenRouter が持つ最新のモデル情報
7. **Nous Portal** — Nous のモデル ID を接尾辞で OpenRouter の情報と突き合わせます
8. **[models.dev](https://models.dev)** — 100 を超えるプロバイダーの 3800 以上のモデルについて、プロバイダーごとのコンテキスト長をまとめたコミュニティ運営の登録簿
9. **既定値へのフォールバック** — 大まかなモデル系統のパターン（既定は 128K）

たいていの構成では、これでそのまま動きます。この仕組みはプロバイダーを考慮するので、同じモデルでも提供元によってコンテキストの上限が変わります（例: `claude-opus-4.6` は Anthropic 直接なら 1M ですが、GitHub Copilot 経由では 128K です）。

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

独自エンドポイントを設定するとき、`hermes model` はコンテキスト長も尋ねます。自動判別に任せたい場合は空欄のままにしてください。

:::tip 手動で設定したほうがよい場合
- モデルの最大値より小さい `num_ctx` を指定して Ollama を使っている
- VRAM を節約するため、モデルの最大値より小さく抑えたい（例: 128k のモデルを 8k に）
- `/v1/models` を公開していないプロキシの後ろで動かしている
:::

---

### 名前付きの独自プロバイダー {#named-custom-providers}

複数の独自エンドポイントを使い分けている場合（例: ローカルの開発サーバーとリモートの GPU サーバー）、`config.yaml` の `providers:` 辞書の下に、プロバイダー名をキーとして定義できます。

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

各エントリーで指定できるのは、`api`（エンドポイントのベース URL。`base_url`/`url` も別名として使えます）、`name`（任意の表示名。既定は辞書のキー）、`key_env` またはインラインの `api_key` か `key_cmd`（後述）、`transport`（`chat_completions` / `anthropic_messages` / `codex_responses`）、`default_model`、`models`、`context_length`、`discover_models`、`extra_body`、`extra_headers`、`ssl_ca_cert` / `ssl_verify`、そしてエントリーを消さずに隠すための `enabled: false` です。

#### コマンドで発行する認証情報（`key_cmd`） {#command-minted-credentials-keycmd}

企業のゲートウェイでは、静的な API キーではなく短命なベアラートークンを発行することがよくあります（SSO/OIDC のブローカー、クラウドの IAM、社内の認証プロキシなど）。そのため `.env` にコピーしたトークンはセッションの途中で期限切れになり、リクエストが 401 を返し始めます。`key_cmd` には、トークンを*標準出力に表示する*コマンドを指定します。Hermes はそれを実行し、期限が来る少し前まで結果をキャッシュするので、長いセッションでも再起動なしで動き続けます。

```yaml
providers:
  my-gateway:
    base_url: "https://gateway.internal.example.com/v1"
    api_mode: chat_completions
    key_cmd: "my-auth-cli print-token --profile prod"
```

トークンを表示する補助コマンドなら何でも使えます。`databricks auth token`、`gcloud auth print-access-token`、`az account get-access-token`、`vault read`、Claude Code 形式の `apiKeyHelper` スクリプトなどです。

コマンドは標準出力に**トークンだけ**を表示する必要があります。裸のトークンでも、`access_token` フィールドを持つ JSON でもかまいません（`expires_in` は考慮されますし、絶対時刻の `expiry`/`expiresOn` の ISO 形式のタイムスタンプも扱えます）。複数行の出力は推測されずに拒否されます。期限が示されていない場合、トークンは一定の間隔で発行し直されます。

優先順位: 明示的な `--api-key` フラグが最優先です。それ以外では、同じエントリー内で `key_cmd` が静的な `api_key`/`key_env` より優先されます。発行された認証情報は、メインのエージェントのターンにも、補助的な処理（タイトル生成、圧縮、画像認識、埋め込み）にも同じように適用されます。

`secrets.command` とは別物なので注意してください。そちらは**起動時に一度だけ**補助コマンドを実行し、プロセス全体の環境変数を用意するものです。多くの秘密情報をまとめて返す vault やキーチェーンの補助コマンドにはそちらを、あるプロバイダーの認証情報をセッションの*途中で*発行し直す必要があるときには `key_cmd` を使ってください。

:::note 旧形式
古い設定では、代わりにトップレベルの `custom_providers:` リストを使っていました。これは今も動きますし（Hermes は両方を読みます）、`hermes update` が `providers:` 辞書（設定 v12）へ自動で移行します。辞書形式ではフィールド名が少し異なり、旧来の `model` は `default_model`、旧来の `api_mode` は `transport` になります。
:::

OpenAI 互換のエンドポイントの中には、そのプロバイダー固有のリクエストボディの項目を必要とするものがあります。該当する独自プロバイダーに `extra_body` のマップを足すと、Hermes はそのエンドポイントへの chat-completions リクエストごとにそれを合成します。

```yaml
providers:
  gemma-local:
    api: http://localhost:8080/v1
    default_model: google/gemma-4-31b-it
    extra_body:
      enable_thinking: true
      reasoning_effort: high
```

サーバーが文書化している形に合わせてください。たとえば vLLM の Gemma 構成や一部の NVIDIA NIM のエンドポイントは、`enable_thinking` を `extra_body` の直下ではなく `chat_template_kwargs` の下に置くことを想定しています。

```yaml
extra_body:
  chat_template_kwargs:
    enable_thinking: true
```

vLLM で提供される Qwen の推論モデルでは、推論パーサーが生成されたテキストをすべて推論のフィールドに振り分けてしまい、アシスタントの `content` が空になる場合に、同じ形で thinking を無効にできます。

```yaml
extra_body:
  chat_template_kwargs:
    enable_thinking: false
```

`hermes model` → Custom Endpoint のウィザードは、API モードを明示的に尋ね、その答えを `config.yaml` に（プロバイダーのエントリーの `transport` として）保存するようになりました。この項目を空欄にした場合は、これまでどおり URL に基づく自動判別（例: `/anthropic` を含むパスなら `anthropic_messages`）が予備として働きます。

**独自プロバイダーのモデルでネイティブに画像を扱う。** 独自エンドポイントで、models.dev に載っていない画像対応のモデルを提供している場合は、`model.supports_vision: true` を設定してください。そうすると Hermes は、添付された画像を `vision_analyze` で事前処理するのではなく、ネイティブに（`image_url` のパートとして）送ります。この 1 つの設定だけでよく、`agent.image_input_mode: native` を併せて設定する必要はありません。

```yaml
model:
  provider: custom
  base_url: http://localhost:8080/v1
  default: qwen3.6-35b-a3b
  supports_vision: true   # send images natively; otherwise vision_analyze pre-describes them
```

同じキーは、名前付きプロバイダーのモデルごとの設定（`providers.<name>.models.<id>.supports_vision`）でも有効で、YAML の標準的な真偽値（`true/false/yes/no/on/off/1/0`）を受け付けます。

セッションの途中で切り替えるには、3 つ組の書き方を使います。

```
/model custom:local:qwen-2.5       # Use the "local" endpoint with qwen-2.5
/model custom:work:llama3-70b      # Use the "work" endpoint with llama3-70b
/model custom:anthropic-proxy:claude-sonnet-4  # Use the proxy
```

名前付きの独自プロバイダーは、対話的な `hermes model` のメニューからも選べます。

---

### 実例集: Together AI、Groq、Perplexity {#cookbook-together-ai-groq-perplexity}

[その他の互換プロバイダー](#other-compatible-providers)に挙げたクラウドのプロバイダーは、いずれも OpenAI の REST 方言を話すので、`providers:` 辞書の下で同じように設定できます。以下に 3 つの実例を示します。それぞれ `~/.hermes/config.yaml` に書き、対応する API キーは `~/.hermes/.env` に置きます。

#### Together AI {#together-ai}

オープンウェイトのモデル（Llama、MiniMax、Gemma、DeepSeek、Qwen）を、各社の純正 API よりかなり安い価格でホストしています。複数のモデルを使い分けるときの既定として手堅い選択です。

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

セッションの途中でモデルを切り替えるには次のようにします。

```
/model custom:together:meta-llama/Llama-3.3-70B-Instruct-Turbo
/model custom:together:google/gemma-4-31b-it
/model custom:together:deepseek-ai/DeepSeek-V3
```

Together の `/v1/models` エンドポイントは使えるので、`hermes model` が利用可能なモデルを自動で見つけられます。

#### Groq {#groq}

非常に高速な推論を提供します（Llama-3.3-70B でおよそ 500 tok/s）。扱うモデルは少ないものの、応答の速さが求められる対話用途に強みがあります。

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

ウェブ検索と出典の提示を自動でこなすモデルが欲しいときに便利です。使えるモデルの制約が厳しいので、現在の一覧は [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api) で確認してください。

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

#### 1 つの設定に複数のプロバイダーを {#multiple-providers-in-one-config}

3 つの実例は組み合わせられます。すべてをまとめて設定しておき、ターンごとに `/model custom:<name>:<model>` で切り替えられます。

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
- CLI の検証まわりが #15083 で修正されて以降、`hermes doctor` はこれらの名前について `Unknown provider` の警告を出さないはずです。
- プロバイダーの `/v1/models` エンドポイントに届かない場合（Perplexity でよく起こります）、`hermes model` は設定を強く拒否するのではなく、警告を出しつつモデルを保存します。#15136 を参照してください。
- 名前付きプロバイダーを使わず、素の `provider: custom` と環境変数 `CUSTOM_BASE_URL` で済ませたい場合は #15103 を参照してください。
:::

---

### 構成の選び方 {#choosing-the-right-setup}

| 用途 | おすすめ |
|----------|-------------|
| **とにかく動けばいい** | OpenRouter（既定）または Nous Portal |
| **ローカルのモデルを手軽に** | Ollama |
| **本番の GPU での提供** | vLLM または SGLang |
| **Mac / GPU なし** | Ollama または llama.cpp |
| **複数プロバイダーの振り分け** | LiteLLM Proxy または OpenRouter |
| **コストの最適化** | ClawRouter、または `sort: "price"` を指定した OpenRouter |
| **プライバシー最優先** | Ollama、vLLM、llama.cpp（完全にローカル） |
| **企業 / Azure** | 独自エンドポイントで Azure OpenAI |
| **中国の AI モデル** | z.ai（GLM）、Kimi/Moonshot（`kimi-coding` または `kimi-coding-cn`）、MiniMax、Xiaomi MiMo、Tencent TokenHub（いずれも第一級のプロバイダー） |

:::tip
プロバイダーは `hermes model` でいつでも切り替えられます。再起動は不要です。どのプロバイダーを使っても、会話履歴、メモリ、スキルはそのまま引き継がれます。
:::

## 任意の API キー {#optional-api-keys}

| 機能 | プロバイダー | 環境変数 |
|---------|----------|--------------|
| ウェブのスクレイピング | [Firecrawl](https://firecrawl.dev/) | `FIRECRAWL_API_KEY`, `FIRECRAWL_API_URL` |
| ブラウザの自動操作 | [Browserbase](https://browserbase.com/) | `BROWSERBASE_API_KEY`, `BROWSERBASE_PROJECT_ID` |
| 画像の生成 | [FAL](https://fal.ai/) | `FAL_KEY` |
| 高品質な TTS の音声 | [ElevenLabs](https://elevenlabs.io/) | `ELEVENLABS_API_KEY` |
| OpenAI の TTS と音声の文字起こし | [OpenAI](https://platform.openai.com/api-keys) | `VOICE_TOOLS_OPENAI_KEY` |
| Mistral の TTS と音声の文字起こし | [Mistral](https://console.mistral.ai/) | `MISTRAL_API_KEY` |
| セッションをまたぐ利用者のモデル化 | [Honcho](https://honcho.dev/) | `HONCHO_API_KEY` |
| 意味的な長期記憶 | [Supermemory](https://supermemory.ai) | `SUPERMEMORY_API_KEY` |

### Firecrawl を自前でホストする {#self-hosting-firecrawl}

既定では、Hermes はウェブ検索とスクレイピングに [Firecrawl のクラウド API](https://firecrawl.dev/) を使います。Firecrawl をローカルで動かしたい場合は、Hermes を自前のインスタンスに向けることもできます。設定手順の全体は Firecrawl の [SELF_HOST.md](https://github.com/firecrawl/firecrawl/blob/main/SELF_HOST.md) を参照してください。

**得られるもの:** API キーが不要になり、レート制限も、ページごとの費用もなくなり、データを自分で完全に管理できます。

**失われるもの:** クラウド版は、Firecrawl 独自の "Fire-engine" で高度なボット対策（Cloudflare、CAPTCHA、IP のローテーション）を回避します。自前ホストの場合は基本的な fetch と Playwright だけなので、保護のかかったサイトでは失敗することがあります。検索も Google ではなく DuckDuckGo を使います。

**設定手順:**

1. Firecrawl の Docker スタックをクローンして起動します（コンテナは API、Playwright、Redis、RabbitMQ、PostgreSQL の 5 つで、4〜8 GB 程度のメモリが必要です）:
   ```bash
   git clone https://github.com/firecrawl/firecrawl
   cd firecrawl
   # In .env, set: USE_DB_AUTHENTICATION=false, HOST=0.0.0.0, PORT=3002
   docker compose up -d
   ```

2. Hermes を自分のインスタンスに向けます（API キーは不要です）:
   ```bash
   hermes config set FIRECRAWL_API_URL http://localhost:3002
   ```

自前ホストのインスタンスで認証を有効にしている場合は、`FIRECRAWL_API_KEY` と `FIRECRAWL_API_URL` の両方を設定することもできます。

## OpenRouter のプロバイダー振り分け {#openrouter-provider-routing}

OpenRouter を使う場合、リクエストを各プロバイダーへどう振り分けるかを制御できます。`~/.hermes/config.yaml` に `provider_routing` の節を足してください。

```yaml
provider_routing:
  sort: "throughput"          # "price" (default), "throughput", or "latency"
  # only: ["anthropic"]      # Only use these providers
  # ignore: ["deepinfra"]    # Skip these providers
  # order: ["anthropic", "google"]  # Try providers in this order
  # require_parameters: true  # Only use providers that support all request params
  # data_collection: "deny"   # Exclude providers that may store/train on data
```

**近道:** モデル名の後ろに `:nitro` を付けるとスループット順（例: `anthropic/claude-sonnet-4:nitro`）、`:floor` を付けると価格順で選ばれます。

## OpenRouter の Pareto Code ルーター {#openrouter-pareto-code-router}

OpenRouter は `openrouter/pareto-code` という実験的なコーディング向けモデルルーターを提供しています。これは、コーディングの品質基準（[Artificial Analysis](https://artificialanalysis.ai/) の評価による）を満たす中で最も安いモデルへ自動で振り分けます。このモデルを選び、`~/.hermes/config.yaml` の `min_coding_score` を調整してください。

```yaml
model:
  provider: openrouter
  model: openrouter/pareto-code

openrouter:
  min_coding_score: 0.65   # 0.0–1.0; higher = stronger (more expensive) coders. Default 0.65.
```

補足:

- `min_coding_score` が送られるのは、`model.model` が `openrouter/pareto-code` のとき**だけ**です。それ以外のモデルでは、この値は何もしません。
- 空文字列にする（または行を削除する）と、OpenRouter が利用可能な中で最も強いコーディングモデルを選びます。プラグインのブロックを省いたときの、文書化された挙動です。
- 選択はある日のスコアに対しては一定ですが、実際に選ばれるモデルはパレートフロンティアの動き（新しいモデルの登場、ベンチマークの更新）に応じて変わりえます。
- ルーターの詳しい挙動は OpenRouter の [Pareto Router のドキュメント](https://openrouter.ai/docs/guides/routing/routers/pareto-router)を参照してください。
- メインのエージェントではなく特定の**補助的な処理**（圧縮、画像認識など）で Pareto Code ルーターを使いたい場合は、その処理の下に `extra_body.plugins` を設定してください。[補助モデル → 補助的な処理での OpenRouter の振り分けと Pareto Code](/hermes/docs/user-guide/configuration/#openrouter-routing--pareto-code-for-auxiliary-tasks)を参照してください。

## フォールバックのプロバイダー {#fallback-providers}

主に使うモデルが失敗したとき（レート制限、サーバーエラー、認証の失敗）に Hermes が順に試す予備のプロバイダーを並べて設定できます。正式な書き方は、トップレベルの `fallback_providers:` リストです。

```yaml
fallback_providers:
  - provider: openrouter
    model: anthropic/claude-sonnet-4
  - provider: anthropic
    model: claude-sonnet-4
    # base_url: http://localhost:8000/v1    # optional, for custom endpoints
    # api_mode: chat_completions           # optional override
```

1 組だけを指定する旧来の `fallback_model:` 辞書も、後方互換のためまだ受け付けられます。

```yaml
fallback_model:
  provider: openrouter
  model: anthropic/claude-sonnet-4
```

フォールバックが働くと、会話を失うことなく、セッションの途中でモデルとプロバイダーが入れ替わります。並びは 1 件ずつ順に試され、切り替わるのは 1 セッションにつき 1 回だけです。

対応しているプロバイダー: `openrouter`、`nous`、`novita`、`openai-codex`、`copilot`、`copilot-acp`、`anthropic`、`gemini`、`qwen-oauth`、`huggingface`、`zai`、`kimi-coding`、`kimi-coding-cn`、`minimax`、`minimax-cn`、`minimax-oauth`、`deepseek`、`nvidia`、`xai`、`xai-oauth`、`ollama-cloud`、`bedrock`、`ai-gateway`、`azure-foundry`、`opencode-zen`、`opencode-go`、`commandcode`、`commandcode-anthropic`、`kilocode`、`xiaomi`、`arcee`、`gmi`、`actual`、`stepfun`、`lmstudio`、`alibaba`、`alibaba-coding-plan`、`tencent-tokenhub`、`custom`。

:::tip
フォールバックの設定は `config.yaml` だけで行います。対話的に設定したい場合は `hermes fallback` を使ってください。どんなときに働くのか、並びをどう進むのか、補助的な処理や委任とどう関わるのかといった詳細は、[フォールバックのプロバイダー](/hermes/docs/user-guide/features/fallback-providers/)を参照してください。
:::

---

## 関連ページ {#see-also}

- [設定](/hermes/docs/user-guide/configuration/) — 全般的な設定（ディレクトリ構成、設定の優先順位、ターミナルのバックエンド、メモリ、圧縮など）
- [環境変数](/hermes/docs/reference/environment-variables/) — すべての環境変数の一覧
