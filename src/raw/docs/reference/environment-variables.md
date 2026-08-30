---
title: "環境変数"
description: "Hermes Agent が使う環境変数をすべて集めた早見表"
upstream_path: reference/environment-variables.md
upstream_blob: 11eaa30a15527d70623e7e5a60479651666b5fc7
sources:
  - https://hermes-agent.nousresearch.com/docs/reference/environment-variables
---

# 環境変数の早見表 {#environment-variables-reference}

Hermes は環境変数をプロセスの環境から読み、自分で管理する秘密の情報については `~/.hermes/.env` からも読みます。API キー、ボットのトークン、OAuth の秘密鍵といった認証情報は `.env` に置いてください。秘密ではない動作の設定は、対応する設定キーがあるなら `config.yaml` のほうが向いています。以下の変数の中には、そのプロセスかぎりの上書きや内部的な橋渡し用のものもあります。ここに載っているというだけで `.env` に書き込まないでください。

## LLM プロバイダー {#llm-providers}

| 変数 | 説明 |
|----------|-------------|
| `OPENROUTER_API_KEY` | OpenRouter の API キー（融通が利くのでおすすめです） |
| `OPENROUTER_BASE_URL` | OpenRouter 互換のベース URL を上書きします |
| `FIREWORKS_API_KEY` | Fireworks AI の API キー（[app.fireworks.ai](https://app.fireworks.ai/settings/users/api-keys)）。エンドポイントの上書きは `config.yaml` の `model.base_url` で設定します。 |
| `HERMES_OPENROUTER_CACHE` | OpenRouter の応答キャッシュを有効にします（`1`/`true`/`yes`/`on`）。config.yaml の `openrouter.response_cache` より優先されます。[Response Caching](https://openrouter.ai/docs/guides/features/response-caching) を参照してください。 |
| `HERMES_OPENROUTER_CACHE_TTL` | キャッシュの保持時間を秒で指定します（1〜86400）。config.yaml の `openrouter.response_cache_ttl` より優先されます。 |
| `NOUS_BASE_URL` | Nous Portal のベース URL を上書きします（ふだんは不要で、開発や試験のときだけ使います） |
| `NOUS_INFERENCE_BASE_URL` | Nous の推論エンドポイントを直接上書きします |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway の API キー（[ai-gateway.vercel.sh](https://ai-gateway.vercel.sh)） |
| `AI_GATEWAY_BASE_URL` | AI Gateway のベース URL を上書きします（既定: `https://ai-gateway.vercel.sh/v1`） |
| `OPENAI_API_KEY` | OpenAI 互換の独自エンドポイント向けの API キー（`OPENAI_BASE_URL` と一緒に使います） |
| `OPENAI_BASE_URL` | 独自エンドポイント（VLLM、SGLang など）のベース URL |
| `LM_API_KEY` | LM Studio（`lmstudio` プロバイダー）の API キー。手元のサーバー向けには形だけの値で済むことが多いです |
| `LM_BASE_URL` | LM Studio のベース URL（既定: `http://localhost:1234/v1`） |
| `COPILOT_GITHUB_TOKEN` | Copilot API 向けの GitHub トークン。最優先で読まれます（OAuth の `gho_*` か、細かい権限設定ができる `github_pat_*`。従来型の `ghp_*` は**使えません**） |
| `GH_TOKEN` | GitHub のトークン。Copilot では 2 番目に読まれます（`gh` CLI も使います） |
| `GITHUB_TOKEN` | GitHub のトークン。Copilot では 3 番目に読まれます |
| `HERMES_COPILOT_ACP_COMMAND` | Copilot ACP の CLI 実行ファイルのパスを上書きします（既定: `copilot`） |
| `COPILOT_CLI_PATH` | `HERMES_COPILOT_ACP_COMMAND` の別名 |
| `HERMES_COPILOT_ACP_ARGS` | Copilot ACP に渡す引数を上書きします（既定: `--acp --stdio`） |
| `COPILOT_ACP_BASE_URL` | Copilot ACP のベース URL を上書きします |
| `COPILOT_API_BASE_URL` | Copilot API（`copilot` プロバイダー）のベース URL を上書きします |
| `GLM_API_KEY` | z.ai / ZhipuAI GLM の API キー（[z.ai](https://z.ai)） |
| `ZAI_API_KEY` | `GLM_API_KEY` の別名 |
| `Z_AI_API_KEY` | `GLM_API_KEY` の別名 |
| `GLM_BASE_URL` | z.ai のベース URL を上書きします（既定: `https://api.z.ai/api/paas/v4`） |
| `KIMI_API_KEY` | Kimi / Moonshot AI の API キー（[moonshot.ai](https://platform.moonshot.ai)） |
| `KIMI_CODING_API_KEY` | `kimi-coding` プロバイダー向けの別名キー（`KIMI_API_KEY` と併せて受け付けます） |
| `KIMI_BASE_URL` | Kimi のベース URL を上書きします（既定: `https://api.moonshot.ai/v1`） |
| `KIMI_CN_API_KEY` | Kimi / Moonshot 中国版の API キー（[moonshot.cn](https://platform.moonshot.cn)） |
| `ARCEEAI_API_KEY` | Arcee AI の API キー（[chat.arcee.ai](https://chat.arcee.ai/)） |
| `ARCEE_BASE_URL` | Arcee のベース URL を上書きします（既定: `https://api.arcee.ai/api/v1`） |
| `GMI_API_KEY` | GMI Cloud の API キー（[gmicloud.ai](https://www.gmicloud.ai/)） |
| `GMI_BASE_URL` | GMI Cloud のベース URL を上書きします（既定: `https://api.gmi-serving.com/v1`） |
| `ACTUAL_API_KEY` | Actual Computer の推論キー（`ac_...`、[actual.inc/user/keys](https://actual.inc/user/keys)）。手元で動かすデーモンには不要です。 |
| `ACTUAL_BASE_URL` | Actual Computer のベース URL を上書きします（既定: `https://api.actual.inc/v1`）。手元でオフラインのデーモンを使うなら `http://127.0.0.1:8080` にします。ループバックのホストなら API キーは要りません。 |
| `MINIMAX_API_KEY` | MiniMax の API キー（世界向けエンドポイント、[minimax.io](https://www.minimax.io)）。**`minimax-oauth` では使いません**（OAuth の経路はブラウザーでのログインを使います）。 |
| `MINIMAX_BASE_URL` | MiniMax のベース URL を上書きします（既定: `https://api.minimax.io/anthropic`。Hermes は MiniMax の Anthropic Messages 互換エンドポイントを使います）。**`minimax-oauth` では使いません**。 |
| `MINIMAX_CN_API_KEY` | MiniMax の API キー（中国向けエンドポイント、[minimaxi.com](https://www.minimaxi.com)）。**`minimax-oauth` では使いません**（OAuth の経路はブラウザーでのログインを使います）。 |
| `MINIMAX_CN_BASE_URL` | MiniMax 中国版のベース URL を上書きします（既定: `https://api.minimaxi.com/anthropic`）。**`minimax-oauth` では使いません**。 |
| `KILOCODE_API_KEY` | Kilo Code の API キー（[kilo.ai](https://kilo.ai)） |
| `KILOCODE_BASE_URL` | Kilo Code のベース URL を上書きします（既定: `https://api.kilo.ai/api/gateway`） |
| `XIAOMI_API_KEY` | Xiaomi MiMo の API キー（[platform.xiaomimimo.com](https://platform.xiaomimimo.com)） |
| `XIAOMI_BASE_URL` | Xiaomi MiMo のベース URL を上書きします（既定: `https://api.xiaomimimo.com/v1`） |
| `UPSTAGE_API_KEY` | Solar モデル向けの Upstage の API キー（[console.upstage.ai](https://console.upstage.ai/api-keys)） |
| `UPSTAGE_BASE_URL` | Upstage のベース URL を上書きします（既定: `https://api.upstage.ai/v1`） |
| `TOKENHUB_API_KEY` | Tencent TokenHub の API キー（[tokenhub.tencentmaas.com](https://tokenhub.tencentmaas.com)） |
| `TOKENHUB_BASE_URL` | Tencent TokenHub のベース URL を上書きします（既定: `https://tokenhub.tencentmaas.com/v1`） |
| `TOKENPLAN_API_KEY` | Tencent TokenPlan の API キー（LKEAP。Anthropic Messages のエンドポイント） |
| `TOKENPLAN_BASE_URL` | Tencent TokenPlan のベース URL を上書きします（既定: `https://api.lkeap.cloud.tencent.com/plan/anthropic`） |
| `AZURE_FOUNDRY_API_KEY` | Microsoft Foundry / Azure OpenAI の API キー（[ai.azure.com](https://ai.azure.com/)）。`model.auth_mode: entra_id` のときは不要です |
| `AZURE_FOUNDRY_BASE_URL` | Microsoft Foundry のエンドポイント URL（OpenAI 形式なら `https://<resource>.openai.azure.com/openai/v1`、Anthropic 形式なら `https://<resource>.services.ai.azure.com/anthropic` のように書きます） |
| `AZURE_ANTHROPIC_KEY` | `provider: anthropic` と、Microsoft Foundry の Claude デプロイを指す `base_url` の組み合わせで使う Azure Anthropic の API キー（Anthropic と Azure Anthropic の両方を設定しているときに `ANTHROPIC_API_KEY` の代わりに使えます） |
| `AZURE_TENANT_ID` | Entra ID のテナント ID（サービス プリンシパルの流れで使い、`model.auth_mode: entra_id` のとき `azure-identity` が読みます） |
| `AZURE_CLIENT_ID` | Entra ID のクライアント ID（サービス プリンシパル、ワークロード ID、ユーザー割り当てのマネージド ID） |
| `AZURE_CLIENT_SECRET` | `EnvironmentCredential` が使うサービス プリンシパルの秘密鍵 |
| `AZURE_CLIENT_CERTIFICATE_PATH` | サービス プリンシパルの証明書（`AZURE_CLIENT_SECRET` の代わりに使えます） |
| `AZURE_FEDERATED_TOKEN_FILE` | AKS ワークロード ID や OIDC の流れで使うフェデレーション トークンのファイル パス |
| `AZURE_AUTHORITY_HOST` | 各国向けクラウドの認証局を上書きします（Azure Government なら `https://login.microsoftonline.us` など）。[Azure Foundry ガイド](/hermes/docs/guides/azure-foundry/#sovereign-clouds-government-china) を参照してください |
| `IDENTITY_ENDPOINT` / `MSI_ENDPOINT` | App Service、Functions、Container Apps でのマネージド ID のエンドポイント。仮想マシンはたいてい IMDS を使うので、これらは設定しません |
| `HF_TOKEN` | Inference Providers 向けの Hugging Face のトークン（[huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)） |
| `HF_BASE_URL` | Hugging Face のベース URL を上書きします（既定: `https://router.huggingface.co/v1`） |
| `GOOGLE_API_KEY` | Google AI Studio の API キー（[aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)） |
| `GEMINI_API_KEY` | `GOOGLE_API_KEY` の別名 |
| `GEMINI_BASE_URL` | Google AI Studio のベース URL を上書きします |
| `VERTEX_CREDENTIALS_PATH` | Vertex AI（Gemini）向けの Google Cloud サービス アカウント JSON のパス。Vertex は固定の API キーではなく OAuth2 を使います。見つからないときは `GOOGLE_APPLICATION_CREDENTIALS`、さらに ADC（`gcloud auth application-default login`）の順に探します。プロジェクトとリージョンは `config.yaml` の `vertex:` の下に書きます |
| `ANTHROPIC_API_KEY` | Anthropic Console の API キー（[console.anthropic.com](https://console.anthropic.com/)） |
| `ANTHROPIC_BASE_URL` | Anthropic API のベース URL を上書きします |
| `ANTHROPIC_TOKEN` | Anthropic の OAuth / セットアップ トークンを手動または従来の形で上書きします |
| `DASHSCOPE_API_KEY` | Qwen のモデル向けの Qwen Cloud（Alibaba DashScope）の API キー（[modelstudio.console.alibabacloud.com](https://modelstudio.console.alibabacloud.com/)） |
| `DASHSCOPE_BASE_URL` | DashScope のベース URL を自分で指定します（既定: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`。中国本土のリージョンでは `https://dashscope.aliyuncs.com/compatible-mode/v1` を使います） |
| `DASHSCOPE_CN_BASE_URL` | 中国本土向け `alibaba-cn` の DashScope ベース URL を上書きします |
| `ALIBABA_CODING_PLAN_API_KEY` | Qwen Coding Plan の API キー（`alibaba-coding-plan` / `alibaba-coding-plan-cn` プロバイダー） |
| `ALIBABA_CODING_PLAN_BASE_URL` | Qwen Coding Plan のベース URL を上書きします（国際版） |
| `ALIBABA_CODING_PLAN_CN_BASE_URL` | Qwen Coding Plan のベース URL を上書きします（中国本土） |
| `ALIBABA_TOKEN_PLAN_API_KEY` | Alibaba Model Studio Token Plan の API キー（`alibaba-token-plan` / `alibaba-token-plan-cn` プロバイダー） |
| `ALIBABA_TOKEN_PLAN_BASE_URL` | Token Plan のベース URL を上書きします（国際版） |
| `ALIBABA_TOKEN_PLAN_CN_BASE_URL` | Token Plan のベース URL を上書きします（中国本土） |
| `DEEPSEEK_API_KEY` | DeepSeek に直接つなぐための API キー（[platform.deepseek.com](https://platform.deepseek.com/api_keys)） |
| `DEEPSEEK_BASE_URL` | DeepSeek API のベース URL を自分で指定します |
| `DEEPINFRA_API_KEY` | DeepInfra の API キー（[deepinfra.com](https://deepinfra.com/dash/api_keys)） |
| `DEEPINFRA_BASE_URL` | DeepInfra のベース URL の上書き |
| `NOVITA_API_KEY` | NovitaAI の API キー。Model API、Agent Sandbox、GPU Cloud を備えた AI 向けクラウドです（[novita.ai/settings/key-management](https://novita.ai/settings/key-management)） |
| `NOVITA_BASE_URL` | NovitaAI のベース URL を上書きします（既定: `https://api.novita.ai/openai/v1`） |
| `RAMP_ROUTER_API_KEY` | Ramp Router の API キー（[app.router.com/keys](https://app.router.com/keys)）。別名の `ROUTER_API_KEY` も使えます |
| `RAMP_ROUTER_BASE_URL` | Ramp Router のベース URL を上書きします（既定: `https://api.router.com/v1`） |
| `NEBIUS_API_KEY` | Nebius Token Factory の API キー（[tokenfactory.nebius.com](https://tokenfactory.nebius.com/)）。`NEBIUS_TOKEN_FACTORY_API_KEY` も使えます |
| `NEBIUS_BASE_URL` | Nebius Token Factory のベース URL を上書きします（既定: `https://api.tokenfactory.nebius.com/v1`） |
| `NVIDIA_API_KEY` | NVIDIA NIM の API キー。Nemotron や公開モデル向けです（[build.nvidia.com](https://build.nvidia.com)） |
| `NVIDIA_BASE_URL` | NVIDIA のベース URL を上書きします（既定: `https://integrate.api.nvidia.com/v1`。手元の NIM エンドポイントを使うなら `http://localhost:8000/v1`） |
| `STEPFUN_API_KEY` | StepFun の API キー。Step 系のモデル向けです（[platform.stepfun.com](https://platform.stepfun.com)） |
| `STEPFUN_BASE_URL` | StepFun のベース URL を上書きします（既定: `https://api.stepfun.com/v1`） |
| `OLLAMA_API_KEY` | Ollama Cloud の API キー。手元に GPU がなくても Ollama のモデル群を使えます（[ollama.com/settings/keys](https://ollama.com/settings/keys)） |
| `OLLAMA_BASE_URL` | Ollama Cloud のベース URL を上書きします（既定: `https://ollama.com/v1`） |
| `XAI_API_KEY` | xAI（Grok）の API キー。チャット、読み上げ、ウェブ検索に使います（[console.x.ai](https://console.x.ai/)） |
| `XAI_BASE_URL` | xAI のベース URL を上書きします（既定: `https://api.x.ai/v1`） |
| `MISTRAL_API_KEY` | Voxtral の読み上げと文字起こし向けの Mistral の API キー（[console.mistral.ai](https://console.mistral.ai)） |
| `AWS_REGION` | Bedrock で推論するときの AWS リージョン（`us-east-1`、`eu-central-1` など）。boto3 が読みます。 |
| `AWS_PROFILE` | Bedrock の認証に使う AWS の名前付きプロファイル（`~/.aws/credentials` を読みます）。設定しなければ boto3 の既定の認証の流れを使います。 |
| `BEDROCK_BASE_URL` | Bedrock ランタイムのベース URL を上書きします（既定: `https://bedrock-runtime.us-east-1.amazonaws.com`。ふだんは設定せず `AWS_REGION` を使ってください） |
| `HERMES_QWEN_BASE_URL` | Qwen Portal のベース URL の上書き（既定: `https://portal.qwen.ai/v1`） |
| `OPENCODE_ZEN_API_KEY` | OpenCode Zen の API キー。選りすぐりのモデルを従量課金で使えます（[opencode.ai](https://opencode.ai/auth)） |
| `OPENCODE_ZEN_BASE_URL` | OpenCode Zen のベース URL を上書きします |
| `OPENCODE_GO_API_KEY` | OpenCode Go の API キー。公開モデルを月額 10 ドルで使えます（[opencode.ai](https://opencode.ai/auth)） |
| `OPENCODE_GO_BASE_URL` | OpenCode Go のベース URL を上書きします |
| `CLAUDE_CODE_OAUTH_TOKEN` | 自分で書き出した Claude Code のトークンを明示的に指定します |
| `HERMES_MODEL` | プロセス単位でモデル名を上書きします（cron のスケジューラーが使います。ふだんは `config.yaml` を使ってください） |
| `VOICE_TOOLS_OPENAI_KEY` | OpenAI の文字起こしと読み上げで優先して使う OpenAI のキー |
| `HERMES_LOCAL_STT_COMMAND` | 手元で文字起こしをするコマンドのひな形（任意）。`{input_path}`、`{output_dir}`、`{language}`、`{model}` を埋め込めます |
| `HERMES_LOCAL_STT_LANGUAGE` | 文字起こしの既定の言語の手がかり。`local`（faster-whisper）プロバイダー、`HERMES_LOCAL_STT_COMMAND`、手元の `whisper` CLI への切り替え（既定: `en`）、Groq、xAI が、`config.yaml` にプロバイダーごとの `language` がないときに使います |
| `HERMES_HOME` | Hermes の設定ディレクトリを上書きします（既定: `~/.hermes`）。ゲートウェイの PID ファイルと systemd のサービス名もこれに合わせて分かれるので、複数のインストールを同時に動かせます |
| `HERMES_GIT_BASH_PATH` | **Windows 専用。** ターミナル ツールが使う `bash.exe` の探索先を上書きします。Git for Windows の完全な導入、シンボリック リンク経由の WSL の bash、MSYS2、Cygwin など、どの bash でも指せます。インストーラーが用意した PortableGit を自動で設定します。[Windows（ネイティブ）ガイド](/hermes/docs/user-guide/windows-native/#how-hermes-runs-shell-commands-on-windows) を参照してください |
| `HERMES_DISABLE_WINDOWS_UTF8` | **Windows 専用。** `1` にすると UTF-8 の入出力の下ごしらえ（`configure_windows_stdio()`）を無効にして、コンソールのロケールのコード ページに戻します。文字化けの原因を切り分けるときには役立ちますが、ふだんの運用で正解になることはまずありません |
| `HERMES_KANBAN_HOME` | かんばんの土台になる Hermes の共有ルート（データベース、ワークスペース、ワーカーのログ）を上書きします。指定がなければ `get_default_hermes_root()`（作業中のプロファイルの親）を使います。テストや変わった構成のときに便利です |
| `HERMES_KANBAN_BOARD` | このプロセスで使うかんばんのボードを固定します。`~/.hermes/kanban/current` より優先されます。ディスパッチャーがワーカーのサブプロセスの環境にも入れるので、ワーカーは仕組みのうえで別のボードの作業を見られません。既定は `default` です。名前の決まりは、小文字の英数字とハイフンとアンダースコアで 1〜64 文字です |
| `HERMES_KANBAN_DB` | かんばんのデータベース ファイルのパスを直接固定します（最優先で、`HERMES_KANBAN_BOARD` と `HERMES_KANBAN_HOME` より強いです）。ディスパッチャーがワーカーのサブプロセスの環境にも入れるので、プロファイルのワーカーはディスパッチャーのボードに揃います |
| `HERMES_KANBAN_WORKSPACES_ROOT` | かんばんのワークスペースのルートを直接固定します（ワークスペースについては最優先で、`HERMES_KANBAN_HOME` より強いです）。ディスパッチャーがワーカーのサブプロセスの環境にも入れます |
| `HERMES_KANBAN_DISPATCH_IN_GATEWAY` | `kanban.dispatch_in_gateway` を実行時に上書きします。`0`、`false`、`no`、`off` のいずれかにすると、ゲートウェイが内蔵のかんばんディスパッチャーを起動しなくなります。それ以外の空でない値なら有効です。別のディスパッチャーのプロセスがボードを受け持つときに便利です。 |

## プロバイダーの認証（OAuth） {#provider-auth-oauth}

Anthropic の標準の認証については、Claude Code 自身の認証ファイルがあればそちらを優先します。自動で更新できるからです。**Anthropic に対する OAuth には、追加の利用クレジットを購入した Claude Max プランが必要です。** Hermes は Claude Code として経路を通すので、Max プランの基本枠ではなく追加分・超過分のクレジットだけを使い、Claude Pro では動きません。Max と追加クレジットがない場合は API キーを使ってください。`ANTHROPIC_TOKEN` のような環境変数は手動での上書きとして今も使えますが、Claude Max でログインするときの主な経路ではなくなりました。

| 変数 | 説明 |
|----------|-------------|
| `HERMES_PORTAL_BASE_URL` | Nous Portal の URL を上書きします（開発や試験のため） |
| `NOUS_INFERENCE_BASE_URL` | Nous の推論 API の URL を上書きします |
| `HERMES_NOUS_MIN_KEY_TTL_SECONDS` | エージェント キーを作り直すまでの最短の残り時間（既定: 1800 = 30 分） |
| `HERMES_NOUS_TIMEOUT_SECONDS` | Nous の認証情報やトークンのやり取りでの HTTP のタイムアウト |
| `HERMES_DUMP_REQUESTS` | API リクエストの中身をログ ファイルに書き出します（`true`/`false`） |
| `HERMES_PREFILL_MESSAGES_FILE` | API を呼ぶ時点で差し込む、その場かぎりの前置きメッセージを収めた JSON ファイルのパス |
| `HERMES_TIMEZONE` | IANA のタイムゾーンで上書きします（たとえば `America/New_York`） |

## ツールの API {#tool-apis}

| 変数 | 説明 |
|----------|-------------|
| `PARALLEL_API_KEY` | AI 向けのウェブ検索（[parallel.ai](https://parallel.ai/)） |
| `FIRECRAWL_API_KEY` | ウェブの取り込みとクラウドのブラウザー（[firecrawl.dev](https://firecrawl.dev/)） |
| `FIRECRAWL_API_URL` | 自前で立てた Firecrawl のエンドポイントを指定します（任意） |
| `TAVILY_API_KEY` | 検索や抽出の上限を上げるための Tavily の API キー（任意）。ウェブのバックエンドに Tavily を選んだあとは、キーなしでも使えます（[app.tavily.com](https://app.tavily.com/home)、[キーなしの説明](https://docs.tavily.com/documentation/keyless)） |
| `SEARXNG_URL` | 自前で立てて無料で使えるウェブ検索、SearXNG のインスタンスの URL。API キーは不要です（[searxng.github.io](https://searxng.github.io/searxng/)） |
| `TAVILY_BASE_URL` | Tavily の API のエンドポイントを上書きします。社内のプロキシや、自前で立てた Tavily 互換の検索バックエンドに向けるときに使います。`GROQ_BASE_URL` と同じ考え方です。 |
| `EXA_API_KEY` | AI 向けのウェブ検索と本文取得のための Exa の API キー（[exa.ai](https://exa.ai/)） |
| `BRAVE_SEARCH_API_KEY` | ウェブ検索向けの Brave Search API の購読トークン（無料枠あり）（[brave.com/search/api](https://brave.com/search/api/)） |
| `BROWSERBASE_API_KEY` | ブラウザーの自動操作（[browserbase.com](https://browserbase.com/)） |
| `BROWSERBASE_PROJECT_ID` | Browserbase のプロジェクト ID |
| `BROWSER_USE_API_KEY` | Browser Use のクラウド ブラウザーの API キー（[browser-use.com](https://browser-use.com/)） |
| `FIRECRAWL_BROWSER_TTL` | Firecrawl のブラウザー セッションの保持時間を秒で指定します（既定: 300） |
| `BROWSER_CDP_URL` | 手元のブラウザー向けの Chrome DevTools Protocol の URL（`/browser connect` で設定します。例: `ws://localhost:9222`） |
| `CAMOFOX_URL` | 検知回避用のローカル ブラウザー サーバー Camofox のアドレス（既定: `http://localhost:9377`）。あくまでアドレスの指定で、これだけでは Camofox がバックエンドになりません。`hermes tools` で Camofox を選んでください（`browser.cloud_provider: camofox`） |
| `CAMOFOX_API_KEY` | 遠隔や認証つきの Camofox サーバーに Authorization ヘッダーで送るベアラー トークン（任意） |
| `CAMOFOX_USER_ID` | 共有の可視セッション向けに、外部で管理する Camofox のユーザー ID（任意） |
| `CAMOFOX_SESSION_KEY` | `CAMOFOX_USER_ID` 向けにタブを作るときに使う Camofox のセッション キー（任意） |
| `CAMOFOX_ADOPT_EXISTING_TAB` | `true` にすると、新しいタブを作る前に既存の Camofox のタブを使い回します |
| `BROWSER_INACTIVITY_TIMEOUT` | ブラウザー セッションが無操作のまま切れるまでの秒数 |
| `AGENT_BROWSER_ARGS` | Chromium を起動するときの追加のフラグ（カンマ区切りか改行区切り）。root で動かしているとき、あるいは AppArmor で制限された非特権ユーザー名前空間（Ubuntu 23.10 以降、DGX Spark、多くのコンテナー イメージ）では、Hermes が `--no-sandbox,--disable-dev-shm-usage` を自動で足します。上書きしたいときや、別のフラグを足したいときだけ自分で設定してください。 |
| `AGENT_BROWSER_ENGINE` | 手元で動かすときのブラウザー エンジン。`auto`（既定 — CDP 経由の Chromium 系）か、特定のエンジンの指定です。 |
| `FAL_KEY` | 画像生成（[fal.ai](https://fal.ai/)） |
| `KREA_API_KEY` | Krea 2 での画像生成に使う Krea の API キー（[krea.ai](https://krea.ai/)） |
| `GROQ_API_KEY` | Groq の Whisper で文字起こしをするための API キー（[groq.com](https://groq.com/)） |
| `ELEVENLABS_API_KEY` | ElevenLabs の高品質な読み上げ音声（[elevenlabs.io](https://elevenlabs.io/)） |
| `PORCUPINE_ACCESS_KEY` | Picovoice Porcupine の呼びかけ検出エンジン（[console.picovoice.ai](https://console.picovoice.ai/)）。`wake_word.provider: porcupine` のときだけ必要で、既定の openWakeWord と sherpa にはキーが要りません |
| `STT_GROQ_MODEL` | Groq の文字起こしモデルを上書きします（既定: `whisper-large-v3-turbo`） |
| `GROQ_BASE_URL` | Groq の OpenAI 互換の文字起こしエンドポイントを上書きします |
| `STT_OPENAI_MODEL` | OpenAI の文字起こしモデルを上書きします（既定: `whisper-1`） |
| `STT_OPENAI_BASE_URL` | OpenAI 互換の文字起こしエンドポイントを上書きします |
| `GITHUB_TOKEN` | Skills Hub 向けの GitHub のトークン（API の上限が上がり、スキルを公開できます） |
| `HONCHO_API_KEY` | セッションをまたいだ利用者像の把握（[honcho.dev](https://honcho.dev/)） |
| `HONCHO_BASE_URL` | 自前で立てた Honcho のベース URL（既定は Honcho のクラウド）。手元のインスタンスには API キーが要りません |
| `HINDSIGHT_API_KEY` | グラフを踏まえた永続的な記憶のための Hindsight の API キー（[hindsight.vectorize.io](https://hindsight.vectorize.io)） |
| `HINDSIGHT_API_URL` | Hindsight API のベース URL（既定: `https://api.hindsight.vectorize.io`） |
| `HINDSIGHT_TIMEOUT` | Hindsight を記憶の提供元として呼ぶときのタイムアウトを秒で指定します（既定: `60`）。`/sync` や `on_session_switch` のときに Hindsight の応答が遅く、`errors.log` にタイムアウトが出るなら増やしてください。 |
| `MEM0_API_KEY` | 意味を踏まえた永続的な記憶のための Mem0 Platform の API キー（[app.mem0.ai](https://app.mem0.ai)） |
| `MEM0_MODE` | Mem0 のバックエンドの動かし方。`platform`（既定）か `oss` です。[記憶の提供元](/hermes/docs/user-guide/features/memory-providers/) を参照してください |
| `MEM0_HOST` | 自前で立てた Mem0 サーバーのベース URL（プラグインが Platform API を使わなくなります） |
| `MEM0_USER_ID` | Mem0 の記憶を保存するときのユーザー ID を上書きします |
| `MEM0_AGENT_ID` | Mem0 の記憶に付けるエージェント ID を上書きします |
| `RETAINDB_API_KEY` | 永続的な記憶のための RetainDB の API キー（[retaindb.com](https://retaindb.com)） |
| `RETAINDB_BASE_URL` | 自前で立てた RetainDB のベース URL（既定: `https://api.retaindb.com`） |
| `OPENVIKING_API_KEY` | OpenViking の API キー（手元での開発モードでは空のままで構いません） |
| `OPENVIKING_ENDPOINT` | OpenViking のサーバー URL（既定: `http://127.0.0.1:1933`） |
| `BRV_API_KEY` | ByteRover の API キー（任意。クラウド同期用で、既定では手元優先です）（[app.byterover.dev](https://app.byterover.dev)） |
| `SUPERMEMORY_API_KEY` | 利用者像の呼び出しとセッションの取り込みを備えた、意味を踏まえた長期記憶（[supermemory.ai](https://supermemory.ai)） |
| `DAYTONA_API_KEY` | Daytona のクラウド サンドボックス（[daytona.io](https://daytona.io/)） |
| `VERCEL_TOKEN` | Vercel Sandbox のアクセス トークン（[vercel.com](https://vercel.com/)） |
| `VERCEL_PROJECT_ID` | Vercel のプロジェクト ID（`VERCEL_TOKEN` と一緒に必要です） |
| `VERCEL_TEAM_ID` | Vercel のチーム ID（`VERCEL_TOKEN` と一緒に必要です） |
| `VERCEL_OIDC_TOKEN` | Vercel の短命な OIDC トークン（開発時のみの代替手段） |

### スキルの API キー {#skill-api-keys}

同梱や任意導入のスキルが使う秘密の情報です。対応するスキルを使うときだけ必要になります。

| 変数 | 使うスキル | 説明 |
|----------|---------------|-------------|
| `NOTION_API_KEY` | `notion` | Notion の連携トークン。 |
| `LINEAR_API_KEY` | `linear` | Linear の個人用 API キー。 |
| `AIRTABLE_API_KEY` | `airtable` | Airtable の個人用アクセス トークン。 |
| `TENOR_API_KEY` | `gif-search` | GIF を検索するための Tenor の API キー。 |

### Langfuse による可観測性 {#langfuse-observability}

同梱の [`observability/langfuse`](/hermes/docs/user-guide/features/built-in-plugins/#observabilitylangfuse) プラグイン向けの環境変数です。`~/.hermes/.env` に書きます。これらが効くには、プラグイン自体を有効にしておく必要もあります（`hermes plugins enable observability/langfuse` を実行するか、`hermes plugins` でチェックを入れます）。

| 変数 | 説明 |
|----------|-------------|
| `HERMES_LANGFUSE_PUBLIC_KEY` | Langfuse プロジェクトの公開キー（`pk-lf-...`）。必須です。 |
| `HERMES_LANGFUSE_SECRET_KEY` | Langfuse プロジェクトの秘密キー（`sk-lf-...`）。必須です。 |
| `HERMES_LANGFUSE_BASE_URL` | Langfuse サーバーの URL（既定: `https://cloud.langfuse.com`）。自前で立てたときに設定します。 |
| `HERMES_LANGFUSE_ENV` | トレースに付ける環境のタグ（`production`、`staging`、…） |
| `HERMES_LANGFUSE_RELEASE` | トレースに付けるリリースや版のタグ |
| `HERMES_LANGFUSE_SAMPLE_RATE` | SDK の採取率 0.0〜1.0（既定: `1.0`） |
| `HERMES_LANGFUSE_MAX_CHARS` | 直列化した中身の、項目ごとの切り詰め文字数（既定: `12000`） |
| `HERMES_LANGFUSE_DEBUG` | `true` にすると、プラグインの詳しいログを `agent.log` に出します |
| `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` / `LANGFUSE_BASE_URL` | Langfuse SDK の標準の名前です。対応する `HERMES_LANGFUSE_*` が設定されていないときの代わりとして受け付けます。 |

### Nous Tool Gateway {#nous-tool-gateway}

有料の Nous 契約者や、自前で立てたゲートウェイのために [Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/) を設定する変数です。ほとんどの人は設定する必要がありません。ゲートウェイは `hermes model` や `hermes tools` から自動で設定されます。

| 変数 | 説明 |
|----------|-------------|
| `TOOL_GATEWAY_DOMAIN` | Tool Gateway の経路のベース ドメイン（既定: `nousresearch.com`） |
| `TOOL_GATEWAY_SCHEME` | ゲートウェイの URL の HTTP / HTTPS の別（既定: `https`） |
| `TOOL_GATEWAY_USER_TOKEN` | Tool Gateway 向けの認証トークン（ふだんは Nous の認証から自動で入ります） |
| `FIRECRAWL_GATEWAY_URL` | Firecrawl のゲートウェイのエンドポイントだけを上書きする URL |

## ターミナルのバックエンド {#terminal-backend}

| 変数 | 説明 |
|----------|-------------|
| `TERMINAL_ENV` | バックエンド: `local`、`docker`、`ssh`、`singularity`、`modal`、`daytona`、`vercel_sandbox` |
| `HERMES_DOCKER_BINARY` | Hermes が呼び出すコンテナーの実行ファイルを指定します（`podman`、`/usr/local/bin/docker` など）。設定しなければ、`PATH` から `docker` か `podman` を自動で探します。両方入っていて既定でないほうを使いたいときや、実行ファイルが `PATH` の外にあるときに必要です。 |
| `TERMINAL_DOCKER_IMAGE` | Docker のイメージ（既定: `nikolaik/python-nodejs:python3.11-nodejs20`） |
| `TERMINAL_DOCKER_FORWARD_ENV` | Docker のターミナル セッションに明示的に渡す環境変数名の JSON 配列。なお、スキルが宣言した `required_environment_variables` は自動で渡されるので、どのスキルも宣言していない変数のときだけ必要です。 |
| `TERMINAL_DOCKER_VOLUMES` | Docker のボリュームを追加でマウントします（`host:container` の組をカンマ区切りで） |
| `TERMINAL_DOCKER_ENV` | Docker のターミナル セッションの中で設定する追加の環境変数の JSON オブジェクト（例: `{"FOO":"bar"}`） |
| `TERMINAL_DOCKER_EXTRA_ARGS` | `docker run` に足す引数の JSON 配列（例: `["--memory","4g"]`） |
| `TERMINAL_DOCKER_MOUNT_CWD_TO_WORKSPACE` | 上級者向けの任意設定。起動時の作業ディレクトリを Docker の `/workspace` にマウントします（`true`/`false`、既定: `false`） |
| `TERMINAL_SINGULARITY_IMAGE` | Singularity のイメージ、または `.sif` のパス |
| `TERMINAL_MODAL_IMAGE` | Modal のコンテナー イメージ |
| `TERMINAL_DAYTONA_IMAGE` | Daytona のサンドボックス イメージ |
| `TERMINAL_VERCEL_RUNTIME` | Vercel Sandbox のランタイム（`node24`、`node22`、`python3.13`） |
| `TERMINAL_TIMEOUT` | コマンドのタイムアウトを秒で指定します |
| `TERMINAL_LIFETIME_SECONDS` | ターミナル セッションの寿命の上限を秒で指定します |
| `TERMINAL_CWD` | ゲートウェイや cron のターミナル セッション向けの直接の上書き（非推奨）。`config.yaml` の `terminal.cwd` を使ってください。CLI は今も起動したディレクトリを使います。 |
| `SUDO_PASSWORD` | 対話的な入力なしで sudo を使えるようにします |

クラウドのサンドボックスをバックエンドにする場合、残るのはファイルの中身です。`TERMINAL_LIFETIME_SECONDS` は使われていないターミナル セッションを Hermes が片付けるまでの時間を決めるもので、あとから再開したときはサンドボックスが作り直され、動いていたプロセスがそのまま残るとは限りません。

## SSH のバックエンド {#ssh-backend}

| 変数 | 説明 |
|----------|-------------|
| `TERMINAL_SSH_HOST` | 接続先サーバーのホスト名 |
| `TERMINAL_SSH_USER` | SSH のユーザー名 |
| `TERMINAL_SSH_PORT` | SSH のポート（既定: 22） |
| `TERMINAL_SSH_KEY` | 秘密鍵のパス |
| `TERMINAL_SSH_PERSISTENT` | SSH で常駐シェルを使うかを上書きします（既定: `TERMINAL_PERSISTENT_SHELL` に従います） |

## コンテナーの資源（Docker、Singularity、Modal、Daytona） {#container-resources-docker-singularity-modal-daytona}

| 変数 | 説明 |
|----------|-------------|
| `TERMINAL_CONTAINER_CPU` | CPU のコア数（既定: 1） |
| `TERMINAL_CONTAINER_MEMORY` | メモリの MB 数（既定: 5120） |
| `TERMINAL_CONTAINER_DISK` | ディスクの MB 数（既定: 51200） |
| `TERMINAL_CONTAINER_PERSISTENT` | セッションをまたいでコンテナーの中身を残します（既定: `true`） |
| `TERMINAL_SANDBOX_DIR` | ワークスペースと重ね合わせを置くホスト側のディレクトリ（既定: `~/.hermes/sandboxes/`） |

## 常駐シェル {#persistent-shell}

| 変数 | 説明 |
|----------|-------------|
| `TERMINAL_PERSISTENT_SHELL` | 手元以外のバックエンドで常駐シェルを有効にします（既定: `true`）。config.yaml の `terminal.persistent_shell` でも設定できます |
| `TERMINAL_LOCAL_PERSISTENT` | 手元のバックエンドで常駐シェルを有効にします（既定: `false`） |
| `TERMINAL_SSH_PERSISTENT` | SSH のバックエンドで常駐シェルを使うかを上書きします（既定: `TERMINAL_PERSISTENT_SHELL` に従います） |

## 送信プロキシ（サンドボックスに注入されます） {#egress-proxy-sandbox-injected}

これらの環境変数はホスト側には設定されません。`proxy.enabled: true` のときに [送信プロキシ](/hermes/docs/user-guide/egress/iron-proxy/) の仕組みが Docker のサンドボックスの中に注入します。この版で結線されているバックエンドは Docker だけです。

| 変数 | 説明 |
|----------|-------------|
| `HERMES_EGRESS_PROXY` | 送信プロキシが動いているとき、サンドボックスの中で `1` になります。エージェント側のコードは、これを見れば TLS を解いて中継するプロキシの後ろで動いていると分かります。 |
| プロバイダーの環境変数（`OPENROUTER_API_KEY`、`OPENAI_API_KEY`、…） | 本物の上流の秘密ではなく、意味を持たないプロキシ用のトークンが入ります。既存の SDK は標準の変数名をそのまま読み続けられます。iron-proxy がネットワークの境目で、そのトークンを本物の上流の秘密に差し替えます。 |
| `HERMES_PROXY_TOKEN_<ENV_NAME>` | 発行したプロバイダーごとの対応を確かめるための別名です。たとえば `HERMES_PROXY_TOKEN_OPENROUTER_API_KEY=hermes-proxy-openrouter-…` のようになります。値は標準のプロバイダー環境変数と同じトークンです。 |
| `HTTPS_PROXY` / `HTTP_PROXY` | `HTTPS_PROXY` は CONNECT と中継のために `http://host.docker.internal:<tunnel_port>` を指します。`HTTP_PROXY` は素の HTTP の転送のために `<tunnel_port + 1>` を指します。 |
| `NO_PROXY` | `127.0.0.1,localhost,::1` です。サンドボックスの中のループバックの開発サーバーはプロキシを通りません。 |
| `REQUESTS_CA_BUNDLE` / `SSL_CERT_FILE` / `CURL_CA_BUNDLE` / `NODE_EXTRA_CA_CERTS` | サンドボックスの中にマウントされた Hermes の送信用 CA 証明書のパス（`/etc/ssl/certs/hermes-egress-ca.crt`）です。各言語の実行環境が iron-proxy の作る証明書を信頼できるようになります。 |
| `NODE_OPTIONS` | `--use-openssl-ca` が足されます（もともとのフラグは残ります）。Node.js が、ほかの CA 関連の変数で制御している OpenSSL の証明書ストアを通るようになり、[Node.js の CA の扱いの違いによる注意点](/hermes/docs/user-guide/egress/iron-proxy/#nodejs-asymmetric-ca-caveat) を小さくできます。 |
| `HERMES_IRON_PROXY_NONCE` | iron-proxy のデーモンのプロセス自体に設定されます（サンドボックスの中ではありません）。PID が使い回されても、候補の PID が *こちらが管理している* 実行ファイルを指しているかを `_pid_alive` が確かめるために使います。 |

これらは `proxy.enabled: true` かつデーモンが動いているときに、Docker のターミナル バックエンドが自動で設定します。自分で設定するものではありません。運用する側がいじるつまみは `~/.hermes/config.yaml` の `proxy:` の下にあります。[送信プロキシ → 設定](/hermes/docs/user-guide/egress/iron-proxy/#configuration) を参照してください。

## メッセージング {#messaging}

| 変数 | 説明 |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Telegram のボット トークン（@BotFather から取得します） |
| `TELEGRAM_ALLOWED_USERS` | ボットを使えるユーザー ID をカンマ区切りで並べます（1 対 1 の会話、グループ、フォーラムに適用されます） |
| `TELEGRAM_ALLOW_ALL_USERS` | どの Telegram ユーザーでもボットを動かせるようにします（開発時のみ）。 |
| `TELEGRAM_GROUP_ALLOWED_USERS` | グループやフォーラムでだけ許可する送信者のユーザー ID をカンマ区切りで並べます（1 対 1 の会話の権限は与えません）。チャット ID の形（`-` で始まるもの）は、#17686 より前の設定との互換のためチャット ID として今も受け付けますが、非推奨の警告が出ます。 |
| `TELEGRAM_GROUP_ALLOWED_CHATS` | グループやフォーラムのチャット ID をカンマ区切りで並べます。そこのメンバー全員が許可されます |
| `TELEGRAM_HOME_CHANNEL` | cron の配信先になる既定の Telegram のチャットやチャンネル |
| `TELEGRAM_HOME_CHANNEL_NAME` | Telegram のホーム チャンネルの表示名 |
| `TELEGRAM_CRON_THREAD_ID` | cron の配信を受け取るフォーラムのトピック ID。cron についてだけ `TELEGRAM_HOME_CHANNEL_THREAD_ID` より優先されます。トピック モードで使うと、cron のメッセージへの返信がシステムのロビーではなく新しいセッションを開きます（#24409）。 |
| `TELEGRAM_WEBHOOK_URL` | webhook モード用の公開 HTTPS URL（ポーリングの代わりに webhook を使います） |
| `TELEGRAM_WEBHOOK_PORT` | webhook サーバーが待ち受けるローカルのポート（既定: `8443`） |
| `TELEGRAM_WEBHOOK_SECRET` | 検証のために Telegram が更新のたびに送り返す秘密のトークン。**`TELEGRAM_WEBHOOK_URL` を設定したときは必須**で、これがないとゲートウェイは起動を拒否します（GHSA-3vpc-7q5r-276h）。`openssl rand -hex 32` で作ってください。 |
| `TELEGRAM_REACTIONS` | 処理中のメッセージに絵文字のリアクションを付けます（既定: `false`） |
| `TELEGRAM_REQUIRE_MENTION` | Telegram のグループで、返答する前にはっきりした呼びかけを求めます。`config.yaml` の `telegram.require_mention` と同じです。 |
| `TELEGRAM_MENTION_PATTERNS` | Telegram のグループで呼びかけの判定を有効にしたときに受け付ける、呼びかけ語の正規表現。JSON 配列、改行区切り、カンマ区切りのいずれでも書けます。`telegram.mention_patterns` と同じです。 |
| `TELEGRAM_EXCLUSIVE_BOT_MENTIONS` | 有効にすると、Telegram のグループでの `@...bot` というはっきりした呼びかけは、返信や呼びかけ語の判定よりも先に、名指しされたボットにだけ届きます。既定: `true`。`telegram.exclusive_bot_mentions` と同じです。 |
| `TELEGRAM_REPLY_TO_MODE` | 返信の引用の付け方。`off`、`first`（既定）、`all` です。Discord と同じ考え方です。 |
| `TELEGRAM_IGNORED_THREADS` | ボットが返答しない Telegram のフォーラムのトピックやスレッドの ID をカンマ区切りで並べます |
| `TELEGRAM_PROXY` | Telegram への接続に使うプロキシ URL。`HTTPS_PROXY` より優先されます。`http://`、`https://`、`socks5://` が使えます |
| `DISCORD_BOT_TOKEN` | Discord のボット トークン |
| `DISCORD_ALLOWED_USERS` | ボットを使える Discord のユーザー ID をカンマ区切りで並べます |
| `DISCORD_ALLOW_ALL_USERS` | どの Discord ユーザーでもボットを動かせるようにします（開発時のみ）。 |
| `DISCORD_ALLOWED_ROLES` | ボットを使える Discord のロール ID をカンマ区切りで並べます（`DISCORD_ALLOWED_USERS` との OR 条件になります）。Members インテントが自動で有効になります。運営チームの入れ替わりが多いときに便利で、ロールを与えるだけで権限が伝わります。 |
| `DISCORD_ALLOWED_CHANNELS` | Discord のチャンネル ID をカンマ区切りで並べます。設定すると、ボットはこれらのチャンネル（と、許可されていれば 1 対 1 の会話）でだけ返答します。`config.yaml` の `discord.allowed_channels` より優先されます。 |
| `DISCORD_PROXY` | Discord への接続に使うプロキシ URL。`HTTPS_PROXY` より優先されます。`http://`、`https://`、`socks5://` が使えます |
| `DISCORD_HOME_CHANNEL` | cron の配信先になる既定の Discord のチャンネル |
| `DISCORD_HOME_CHANNEL_NAME` | Discord のホーム チャンネルの表示名 |
| `DISCORD_COMMAND_SYNC_POLICY` | 起動時に Discord のスラッシュコマンドをどう同期するか。`safe`（差分を見て合わせる）、`bulk`（従来の `tree.sync()`）、`off` です |
| `DISCORD_REQUIRE_MENTION` | サーバーのチャンネルで、返答する前に @ での呼びかけを求めます |
| `DISCORD_FREE_RESPONSE_CHANNELS` | 呼びかけが要らないチャンネル ID をカンマ区切りで並べます |
| `DISCORD_AUTO_THREAD` | 対応している場所では、長い返答を自動でスレッドにします |
| `DISCORD_ALLOW_ANY_ATTACHMENT` | `true` にすると、どんな種類のファイルの添付も受け取ります（組み込みの PDF / テキスト / zip / オフィス文書の許可リストに限りません）。分からない種類のものは保存され、手元のパスとしてエージェントに渡るので、`terminal` / `read_file` / `ffprobe` で中身を調べられます。既定は `false` です。 |
| `DISCORD_MAX_ATTACHMENT_BYTES` | ゲートウェイが保存する添付 1 つあたりの最大バイト数。既定は `33554432`（32 MiB）です。`0` にすると上限なしになります（書き出しの最中はメモリ上に保持されます）。 |
| `DISCORD_REACTIONS` | 処理中のメッセージに絵文字のリアクションを付けます（既定: `true`） |
| `DISCORD_IGNORED_CHANNELS` | ボットが返答しないチャンネル ID をカンマ区切りで並べます |
| `DISCORD_NO_THREAD_CHANNELS` | ボットが自動でスレッドを作らずに返答するチャンネル ID をカンマ区切りで並べます |
| `DISCORD_REPLY_TO_MODE` | 返信の引用の付け方。`off`、`first`（既定）、`all` です |
| `DISCORD_ALLOW_MENTION_EVERYONE` | ボットが `@everyone` / `@here` で全員に通知できるようにします（既定: `false`）。[呼びかけの制御](/hermes/docs/user-guide/messaging/discord/#mention-control) を参照してください。 |
| `DISCORD_ALLOW_MENTION_ROLES` | ボットが `@role` で通知できるようにします（既定: `false`）。 |
| `DISCORD_ALLOW_MENTION_USERS` | ボットが個別の `@user` で通知できるようにします（既定: `true`）。 |
| `DISCORD_ALLOW_MENTION_REPLIED_USER` | 返信するとき、その相手に通知します（既定: `true`）。 |
| `SLACK_BOT_TOKEN` | Slack のボット トークン（`xoxb-...`） |
| `SLACK_APP_TOKEN` | Slack のアプリ単位のトークン（`xapp-...`。ソケット モードで必要です） |
| `SLACK_ALLOWED_USERS` | Slack のユーザー ID をカンマ区切りで並べます |
| `SLACK_ALLOW_ALL_USERS` | どの Slack ユーザーでもボットを動かせるようにします（開発時のみ）。 |
| `SLACK_ALLOW_BOTS` | ほかの Slack のボットからのメッセージを受け取るか。`none`（既定）、`mentions`、`all` です。自分自身のメッセージはつねに無視します。 |
| `SLACK_THREAD_REQUIRE_MENTION` | Slack のスレッドでの返信にははっきりした @ での呼びかけを求めつつ、最上位では自由に返答するチャンネルをそのまま残します |
| `SLACK_HOME_CHANNEL` | cron の配信先になる既定の Slack のチャンネル |
| `SLACK_HOME_CHANNEL_NAME` | Slack のホーム チャンネルの表示名 |
| `GOOGLE_CHAT_PROJECT_ID` | Pub/Sub のトピックを置く GCP のプロジェクト（なければ `GOOGLE_CLOUD_PROJECT` を使います） |
| `GOOGLE_CHAT_SUBSCRIPTION_NAME` | Pub/Sub のサブスクリプションのフル パス `projects/{proj}/subscriptions/{sub}`（従来の別名: `GOOGLE_CHAT_SUBSCRIPTION`） |
| `GOOGLE_CHAT_SERVICE_ACCOUNT_JSON` | サービス アカウントの JSON のパス、または JSON そのもの（なければ `GOOGLE_APPLICATION_CREDENTIALS` を使います） |
| `GOOGLE_CHAT_ALLOWED_USERS` | ボットと会話できるユーザーのメール アドレスをカンマ区切りで並べます |
| `GOOGLE_CHAT_ALLOW_ALL_USERS` | どの Google Chat ユーザーでもボットを動かせるようにします（開発時のみ） |
| `GOOGLE_CHAT_HOME_CHANNEL` | cron の配信先になる既定のスペース（例: `spaces/AAAA...`） |
| `GOOGLE_CHAT_HOME_CHANNEL_NAME` | Google Chat のホーム スペースの表示名 |
| `GOOGLE_CHAT_MAX_MESSAGES` | Pub/Sub の流量制御で、同時に扱うメッセージの上限（既定: `1`） |
| `GOOGLE_CHAT_MAX_BYTES` | Pub/Sub の流量制御で、同時に扱うバイト数の上限（既定: `16777216`、16 MiB） |
| `GOOGLE_CHAT_BOOTSTRAP_SPACES` | ボット自身の `users/{id}` を解決するために、起動時に追加で調べるスペース ID をカンマ区切りで並べます |
| `GOOGLE_CHAT_DEBUG_RAW` | 何か値を入れると、伏せ字にした Pub/Sub の受信内容を DEBUG レベルで記録します（不具合を調べるとき用） |
| `GOOGLE_CHAT_HTTP_EVENTS_URL` | Chat のメッセージ イベントを受け取る、認証つきの HTTP エンドポイント（Pub/Sub の代わりに使えます） |
| `GOOGLE_CHAT_HTTP_EVENTS_AUDIENCE` | Google が署名した HTTP イベントのベアラー トークンに期待する対象者（既定は `GOOGLE_CHAT_HTTP_EVENTS_URL`） |
| `GOOGLE_CHAT_HTTP_EVENTS_SERVICE_ACCOUNT_EMAIL` | HTTP イベントのベアラー トークンに期待する Google のサービス アカウントのメール アドレス |
| `WHATSAPP_ENABLED` | WhatsApp の橋渡しを有効にします（`true`/`false`） |
| `WHATSAPP_MODE` | `bot`（別の番号を使う）か `self-chat`（自分あてに送る） |
| `WHATSAPP_ALLOWED_USERS` | 電話番号をカンマ区切りで並べます（国番号を付け、`+` は不要）。`*` にすると全員を許可します |
| `WHATSAPP_ALLOW_ALL_USERS` | 許可リストなしで、すべての WhatsApp の送信者を許可します（`true`/`false`） |
| `WHATSAPP_HOME_CHANNEL` | cron や通知の配信先になる既定のチャット ID。 |
| `WHATSAPP_HOME_CHANNEL_NAME` | WhatsApp のホーム チャンネルの表示名。 |
| `WHATSAPP_DEBUG` | 調べもの用に、橋渡しの中で生のメッセージ イベントを記録します（`true`/`false`） |
| `WHATSAPP_CLOUD_PHONE_NUMBER_ID` | WhatsApp Business Cloud API の Meta の電話番号 ID（15〜17 桁。電話番号そのものでは**ありません**） |
| `WHATSAPP_CLOUD_ACCESS_TOKEN` | Meta のアクセス トークン（`EAA` で始まります）。一時的なトークンは 24 時間で切れ、システム ユーザーのトークンは期限がありません |
| `WHATSAPP_CLOUD_APP_SECRET` | 受け取った webhook の署名を検証するための、32 文字の 16 進数のアプリ シークレット |
| `WHATSAPP_CLOUD_VERIFY_TOKEN` | Meta の webhook 検証のやり取りで使う共有の秘密（設定ウィザードが自動で作ります） |
| `WHATSAPP_CLOUD_ALLOWED_USERS` | ボットにメッセージを送れる `wa_id` をカンマ区切りで並べます（国番号付きの電話番号で、`+` は不要） |
| `WHATSAPP_CLOUD_ALLOW_ALL_USERS` | 許可リストなしで、すべての WhatsApp Cloud の送信者を許可します（`true`/`false`） |
| `WHATSAPP_CLOUD_APP_ID` | Meta のアプリ ID（任意。将来の分析連携のため） |
| `WHATSAPP_CLOUD_WABA_ID` | WhatsApp Business アカウント ID（任意。将来の分析連携のため） |
| `WHATSAPP_CLOUD_WEBHOOK_HOST` | 受信用の webhook サーバーが結び付くインターフェース（既定は `0.0.0.0`） |
| `WHATSAPP_CLOUD_WEBHOOK_PORT` | 受信用の webhook サーバーが待ち受けるポート（既定は `8090`） |
| `WHATSAPP_CLOUD_WEBHOOK_PATH` | Meta が受信メッセージを送ってくる URL のパス（既定は `/whatsapp/webhook`） |
| `WHATSAPP_CLOUD_API_VERSION` | 呼び出す Meta Graph API の版（既定は `v20.0`） |
| `WHATSAPP_CLOUD_HOME_CHANNEL` | ボットのホーム チャンネルにする `wa_id`（cron の作業などに使います） |
| `WHATSAPP_CLOUD_DM_POLICY` | Cloud のアダプターでの 1 対 1 の会話の扱い（`open`/`allowlist`/`disabled`）。設定しなければ `WHATSAPP_DM_POLICY` を使います |
| `WHATSAPP_CLOUD_ALLOW_FROM` | `dm_policy: allowlist` のときに許可する送信者をカンマ区切りで並べます（素の `wa_id`。Baileys 形式の JID は正規化されます） |
| `WHATSAPP_CLOUD_GROUP_POLICY` | Cloud のアダプターでのグループの扱い（`open`/`allowlist`/`disabled`）。設定しなければ `WHATSAPP_GROUP_POLICY` を使います |
| `WHATSAPP_CLOUD_GROUP_ALLOW_FROM` | `group_policy: allowlist` のときに許可するグループ チャットの ID をカンマ区切りで並べます |
| `SIGNAL_HTTP_URL` | signal-cli デーモンの HTTP エンドポイント（たとえば `http://127.0.0.1:8080`） |
| `SIGNAL_ACCOUNT` | ボットの電話番号（E.164 形式） |
| `SIGNAL_ALLOWED_USERS` | E.164 形式の電話番号か UUID をカンマ区切りで並べます |
| `SIGNAL_GROUP_ALLOWED_USERS` | グループ ID をカンマ区切りで並べます。`*` ならすべてのグループです |
| `SIGNAL_HOME_CHANNEL_NAME` | Signal のホーム チャンネルの表示名 |
| `SIGNAL_IGNORE_STORIES` | Signal のストーリーやステータスの更新を無視します |
| `SIGNAL_ALLOW_ALL_USERS` | 許可リストなしで、すべての Signal ユーザーを許可します |
| `TWILIO_ACCOUNT_SID` | Twilio のアカウント SID（電話のスキルと共通です） |
| `TWILIO_AUTH_TOKEN` | Twilio の認証トークン（電話のスキルと共通で、webhook の署名の検証にも使います） |
| `TWILIO_PHONE_NUMBER` | E.164 形式の Twilio の電話番号（電話のスキルと共通です） |
| `SMS_WEBHOOK_URL` | Twilio の署名を検証するための公開 URL。Twilio のコンソールにある webhook の URL と一致している必要があります（必須） |
| `SMS_WEBHOOK_PORT` | 受信 SMS 用の webhook が待ち受けるポート（既定: `8080`） |
| `SMS_WEBHOOK_HOST` | webhook が結び付くアドレス（既定: `127.0.0.1`） |
| `SMS_INSECURE_NO_SIGNATURE` | `true` にすると Twilio の署名の検証を無効にします（手元での開発のみ。本番では使わないでください） |
| `SMS_ALLOWED_USERS` | 会話できる E.164 形式の電話番号をカンマ区切りで並べます |
| `SMS_ALLOW_ALL_USERS` | 許可リストなしで、すべての SMS の送信者を許可します |
| `SMS_HOME_CHANNEL` | cron の作業や通知の配信先になる電話番号 |
| `SMS_HOME_CHANNEL_NAME` | SMS のホーム チャンネルの表示名 |
| `EMAIL_ADDRESS` | メールのゲートウェイ アダプターが使うメール アドレス |
| `EMAIL_PASSWORD` | そのメール アカウントのパスワード、またはアプリ パスワード |
| `EMAIL_IMAP_HOST` | メールのアダプターが使う IMAP のホスト名 |
| `EMAIL_IMAP_PORT` | IMAP のポート |
| `EMAIL_SMTP_HOST` | メールのアダプターが使う SMTP のホスト名 |
| `EMAIL_SMTP_PORT` | SMTP のポート |
| `EMAIL_ALLOWED_USERS` | ボットにメッセージを送れるメール アドレスをカンマ区切りで並べます |
| `EMAIL_HOME_ADDRESS` | こちらから送るメールの既定の宛先 |
| `EMAIL_HOME_ADDRESS_NAME` | メールのホームの宛先の表示名 |
| `EMAIL_POLL_INTERVAL` | メールを見に行く間隔を秒で指定します |
| `EMAIL_ALLOW_ALL_USERS` | 受信メールの送信者をすべて許可します |
| `DINGTALK_CLIENT_ID` | 開発者ポータルで取得する DingTalk のボットの AppKey（[open.dingtalk.com](https://open.dingtalk.com)） |
| `DINGTALK_CLIENT_SECRET` | 開発者ポータルで取得する DingTalk のボットの AppSecret |
| `DINGTALK_ALLOWED_USERS` | ボットにメッセージを送れる DingTalk のユーザー ID をカンマ区切りで並べます |
| `DINGTALK_WEBHOOK_URL` | プラットフォームをまたぐ配信や cron の配信に使う、固定のロボットの webhook URL。 |
| `DINGTALK_HOME_CHANNEL` | cron や通知の配信先になる既定の会話 ID。 |
| `DINGTALK_HOME_CHANNEL_NAME` | DingTalk のホーム チャンネルの表示名。 |
| `FEISHU_APP_ID` | [open.feishu.cn](https://open.feishu.cn/) で取得する Feishu / Lark のボットの App ID |
| `FEISHU_APP_SECRET` | Feishu / Lark のボットの App Secret |
| `FEISHU_DOMAIN` | `feishu`（中国）か `lark`（国際版）。既定: `feishu` |
| `FEISHU_CONNECTION_MODE` | `websocket`（おすすめ）か `webhook`。既定: `websocket` |
| `FEISHU_ENCRYPT_KEY` | webhook モード向けの暗号鍵（任意） |
| `FEISHU_VERIFICATION_TOKEN` | webhook モード向けの検証トークン（任意） |
| `FEISHU_ALLOWED_USERS` | ボットにメッセージを送れる Feishu のユーザー ID をカンマ区切りで並べます |
| `FEISHU_ALLOW_BOTS` | `none`（既定）/ `mentions` / `all` — ほかのボットからのメッセージを受け取るかどうか。[ボット同士のやり取り](/hermes/docs/user-guide/messaging/feishu/#bot-to-bot-messaging) を参照してください |
| `FEISHU_REQUIRE_MENTION` | `true`（既定）/ `false` — グループのメッセージでボットへの @ の呼びかけを必須にするかどうか。チャットごとに `group_rules.<chat_id>.require_mention` で上書きできます。 |
| `FEISHU_HOME_CHANNEL` | cron の配信と通知に使う Feishu のチャット ID |
| `FEISHU_HOME_CHANNEL_NAME` | Feishu のホーム チャンネルの表示名。 |
| `FEISHU_ALLOW_ALL_USERS` | どの Feishu ユーザーでもボットを動かせるようにします（開発時のみ）。 |
| `WECOM_BOT_ID` | 管理コンソールで取得する WeCom AI Bot の ID |
| `WECOM_SECRET` | WeCom AI Bot の秘密鍵 |
| `WECOM_WEBSOCKET_URL` | WebSocket の URL を自分で指定します（既定: `wss://openws.work.weixin.qq.com`） |
| `WECOM_ALLOWED_USERS` | ボットにメッセージを送れる WeCom のユーザー ID をカンマ区切りで並べます |
| `WECOM_HOME_CHANNEL` | cron の配信と通知に使う WeCom のチャット ID |
| `WECOM_CALLBACK_CORP_ID` | コールバック方式の自社アプリ向けの WeCom の企業 Corp ID |
| `WECOM_CALLBACK_CORP_SECRET` | その自社アプリの Corp シークレット |
| `WECOM_CALLBACK_AGENT_ID` | その自社アプリのエージェント ID |
| `WECOM_CALLBACK_TOKEN` | コールバックの検証トークン |
| `WECOM_CALLBACK_ENCODING_AES_KEY` | コールバックの暗号化に使う AES 鍵 |
| `WECOM_CALLBACK_HOST` | コールバック サーバーが結び付くアドレス（既定: `0.0.0.0`） |
| `WECOM_CALLBACK_PORT` | コールバック サーバーのポート（既定: `8645`） |
| `WECOM_CALLBACK_ALLOWED_USERS` | 許可リストに載せるユーザー ID をカンマ区切りで並べます |
| `WECOM_CALLBACK_ALLOW_ALL_USERS` | `true` にすると、許可リストなしですべてのユーザーを許可します |
| `WEIXIN_ACCOUNT_ID` | iLink Bot API の QR ログインで取得する Weixin のアカウント ID |
| `WEIXIN_TOKEN` | iLink Bot API の QR ログインで取得する Weixin の認証トークン |
| `WEIXIN_BASE_URL` | Weixin の iLink Bot API のベース URL を上書きします（既定: `https://ilinkai.weixin.qq.com`） |
| `WEIXIN_CDN_BASE_URL` | 添付ファイル向けの Weixin の CDN のベース URL を上書きします（既定: `https://novac2c.cdn.weixin.qq.com/c2c`） |
| `WEIXIN_DM_POLICY` | 1 対 1 の会話の扱い。`open`、`allowlist`、`pairing`、`disabled`（既定: `open`） |
| `WEIXIN_GROUP_POLICY` | グループのメッセージの扱い。`open`、`allowlist`、`disabled`（既定: `disabled`） |
| `WEIXIN_ALLOWED_USERS` | ボットに 1 対 1 でメッセージを送れる Weixin のユーザー ID をカンマ区切りで並べます |
| `WEIXIN_GROUP_ALLOWED_USERS` | ボットとやり取りできる Weixin の**グループ チャット ID**（メンバーのユーザー ID ではありません）をカンマ区切りで並べます。変数名は昔の名残で、実際にはグループ ID を入れます。iLink が実際にグループのイベントを届ける場合にだけ効きます。QR ログインの iLink のボットの識別子（`...@im.bot`）は、ふつうの WeChat のグループのメッセージを受け取らないのが通例です。 |
| `WEIXIN_HOME_CHANNEL` | cron の配信と通知に使う Weixin のチャット ID |
| `WEIXIN_HOME_CHANNEL_NAME` | Weixin のホーム チャンネルの表示名 |
| `WEIXIN_ALLOW_ALL_USERS` | 許可リストなしで、すべての Weixin ユーザーを許可します（`true`/`false`） |
| `BLUEBUBBLES_SERVER_URL` | BlueBubbles のサーバー URL（例: `http://192.168.1.10:1234`） |
| `BLUEBUBBLES_PASSWORD` | BlueBubbles のサーバーのパスワード |
| `BLUEBUBBLES_WEBHOOK_HOST` | webhook の待ち受けが結び付くアドレス（既定: `127.0.0.1`） |
| `BLUEBUBBLES_WEBHOOK_PORT` | webhook の待ち受けポート（既定: `8645`） |
| `BLUEBUBBLES_HOME_CHANNEL` | cron や通知の配信先になる電話番号かメール アドレス |
| `BLUEBUBBLES_ALLOWED_USERS` | 許可するユーザーをカンマ区切りで並べます |
| `BLUEBUBBLES_ALLOW_ALL_USERS` | すべてのユーザーを許可します（`true`/`false`） |
| `QQ_APP_ID` | [q.qq.com](https://q.qq.com) で取得する QQ Bot の App ID |
| `QQ_CLIENT_SECRET` | [q.qq.com](https://q.qq.com) で取得する QQ Bot の App Secret |
| `QQ_STT_API_KEY` | 外部の文字起こしに切り替えるときの API キー（任意。QQ 内蔵の音声認識が何も返さなかったときに使います） |
| `QQ_STT_BASE_URL` | 外部の文字起こしのベース URL（任意） |
| `QQ_STT_MODEL` | 外部の文字起こしのモデル名（任意） |
| `QQ_ALLOWED_USERS` | ボットにメッセージを送れる QQ のユーザーの openID をカンマ区切りで並べます |
| `QQ_GROUP_ALLOWED_USERS` | グループでの @ 付きメッセージを許可する QQ のグループ ID をカンマ区切りで並べます |
| `QQ_ALLOW_ALL_USERS` | すべてのユーザーを許可します（`true`/`false`。`QQ_ALLOWED_USERS` より優先されます） |
| `QQBOT_HOME_CHANNEL` | cron の配信と通知に使う QQ のユーザーかグループの openID |
| `QQBOT_HOME_CHANNEL_NAME` | QQ のホーム チャンネルの表示名 |
| `QQ_PORTAL_HOST` | QQ のポータルのホストを上書きします（`sandbox.q.qq.com` にすると試験用のゲートウェイを通ります。既定: `q.qq.com`）。 |
| `QQ_SANDBOX` | 開発時の試験のために QQ のサンドボックス モードを有効にします（`true`/`false`） |
| `MATTERMOST_URL` | Mattermost のサーバー URL（例: `https://mm.example.com`） |
| `MATTERMOST_TOKEN` | Mattermost のボット トークン、または個人用アクセス トークン |
| `MATTERMOST_ALLOWED_USERS` | ボットにメッセージを送れる Mattermost のユーザー ID をカンマ区切りで並べます |
| `MATTERMOST_ALLOW_ALL_USERS` | どの Mattermost ユーザーでもボットを動かせるようにします（開発時のみ）。 |
| `MATTERMOST_ALLOWED_CHANNELS` | 設定すると、ボットはこれらのチャンネルでだけ返答します（許可リスト）。 |
| `MATTERMOST_HOME_CHANNEL` | こちらから送るメッセージ（cron、通知）の宛先チャンネル ID |
| `MATTERMOST_REQUIRE_MENTION` | チャンネルで `@mention` を求めます（既定: `true`）。`false` にするとすべてのメッセージに返答します。 |
| `MATTERMOST_FREE_RESPONSE_CHANNELS` | `@mention` なしでもボットが返答するチャンネル ID をカンマ区切りで並べます |
| `MATTERMOST_REPLY_MODE` | 返信の見せ方。`thread`（スレッドで返す）か `off`（並べて返す。既定） |
| `MATRIX_HOMESERVER` | Matrix のホームサーバーの URL（例: `https://matrix.org`） |
| `MATRIX_ACCESS_TOKEN` | ボットの認証に使う Matrix のアクセス トークン |
| `MATRIX_USER_ID` | Matrix のユーザー ID（例: `@hermes:matrix.org`）。パスワードでログインするときは必須で、アクセス トークンを使うなら任意です |
| `MATRIX_PASSWORD` | Matrix のパスワード（アクセス トークンの代わり） |
| `MATRIX_ALLOWED_USERS` | ボットにメッセージを送れる Matrix のユーザー ID をカンマ区切りで並べます（例: `@alice:matrix.org`） |
| `MATRIX_ALLOW_ALL_USERS` | どの Matrix ユーザーでもボットを動かせるようにします（開発時のみ）。 |
| `MATRIX_HOME_CHANNEL` | cron や通知の配信先になる既定のルーム ID。 |
| `MATRIX_HOME_CHANNEL_NAME` | Matrix のホーム ルームの表示名。 |
| `MATRIX_ALLOWED_ROOMS` | ボットが応答してよい Matrix のルーム ID をカンマ区切りで並べます |
| `MATRIX_HOME_ROOM` | こちらから送るメッセージの宛先ルーム ID（例: `!abc123:matrix.org`） |
| `MATRIX_ENCRYPTION` | 端から端までの暗号化を有効にします（`true`/`false`、既定: `false`） |
| `MATRIX_E2EE_MODE` | Matrix の端から端までの暗号化の扱い。`off`、`optional`、`required` です。設定すると `MATRIX_ENCRYPTION` より優先されます。 |
| `MATRIX_DEVICE_ID` | 再起動をまたいで暗号化を保つための、変わらない Matrix のデバイス ID（例: `HERMES_BOT`）。これがないと、起動のたびに鍵が入れ替わり、過去のルームの復号ができなくなります。 |
| `MATRIX_REACTIONS` | 受信メッセージに、処理の進みを表す絵文字のリアクションを付けます（既定: `true`）。`false` で無効にできます。 |
| `MATRIX_REQUIRE_MENTION` | ルームで `@mention` を求めます（既定: `true`）。`false` にするとすべてのメッセージに返答します。 |
| `MATRIX_FREE_RESPONSE_ROOMS` | `@mention` なしでもボットが返答するルーム ID をカンマ区切りで並べます |
| `MATRIX_IGNORE_USER_PATTERNS` | 無視する Matrix の橋渡し・アプリサービスの仮のユーザー ID の正規表現をカンマ区切りで並べます |
| `MATRIX_PROCESS_NOTICES` | 受信した Matrix の `m.notice` イベントを処理します（既定: `false`） |
| `MATRIX_SESSION_SCOPE` | プロジェクトのルームでのセッションの区切り方。`auto`、`room`、`thread` です（既定: `auto`） |
| `MATRIX_TOOLS_ALLOW_REDACTION` | Matrix のメッセージ取り消しツールの実行を許可します（既定: `false`） |
| `MATRIX_TOOLS_ALLOW_INVITES` | Matrix の招待ツールの実行を許可します（既定: `false`） |
| `MATRIX_TOOLS_ALLOW_ROOM_CREATE` | Matrix のルーム作成ツールの実行を許可します（既定: `false`） |
| `MATRIX_ALLOW_ROOM_MENTIONS` | ルームの全員に通知する `@room` の送信を許可します（既定: `false`） |
| `MATRIX_AUTO_THREAD` | ルームのメッセージで自動的にスレッドを作ります（既定: `true`） |
| `MATRIX_DM_AUTO_THREAD` | Matrix の 1 対 1 の会話で自動的にスレッドを作ります（既定: `false`） |
| `MATRIX_DM_MENTION_THREADS` | 1 対 1 の会話でボットが `@mentioned` されたときにスレッドを作ります（既定: `false`） |
| `MATRIX_APPROVAL_REQUIRE_SENDER` | 承認やモデル選択のリアクションを、分かっている場合はもとの依頼者からのものに限ります（既定: `true`） |
| `MATRIX_APPROVAL_TIMEOUT_SECONDS` | Matrix のリアクションによる承認やモデル選択の待ち時間（既定: `300`） |
| `MATRIX_ALLOW_PUBLIC_ROOMS` | Matrix のルーム作成ツールが公開ルームを作れるようにします（既定: `false`） |
| `MATRIX_MAX_MEDIA_BYTES` | Matrix でやり取りする添付ファイルの最大バイト数（既定: `104857600`） |
| `MATRIX_RECOVERY_KEY` | デバイスの鍵が入れ替わったあと、相互署名の検証に使う復旧キー。相互署名を有効にした暗号化構成ではおすすめです。 |
| `MATRIX_RECOVERY_KEY_OUTPUT_FILE` | 生成した Matrix の復旧キーを一度だけ書き出すパス（任意）。モード `0600` で作られ、上書きされることはありません。 |
| `HASS_TOKEN` | Home Assistant の長期アクセス トークン（HA のプラットフォームとツールが使えるようになります） |
| `HASS_URL` | Home Assistant の URL（既定: `http://homeassistant.local:8123`） |
| `WEBHOOK_ENABLED` | webhook のプラットフォーム アダプターを有効にします（`true`/`false`） |
| `WEBHOOK_PORT` | webhook を受け取る HTTP サーバーのポート（既定: `8644`） |
| `WEBHOOK_SECRET` | webhook の署名を検証するための全体の HMAC の秘密鍵（経路ごとに指定がないときに使われます） |
| `API_SERVER_ENABLED` | OpenAI 互換の API サーバーを有効にします（`true`/`false`）。ほかのプラットフォームと並行して動きます。 |
| `API_SERVER_KEY` | API サーバーの認証に使うベアラー トークン。API サーバーを有効にするときは必須です。 |
| `API_SERVER_CORS_ORIGINS` | API サーバーを直接呼べるブラウザーのオリジンをカンマ区切りで並べます（たとえば `http://localhost:3000,http://127.0.0.1:3000`）。既定は無効です。 |
| `API_SERVER_PORT` | API サーバーのポート（既定: `8642`） |
| `API_SERVER_HOST` | API サーバーが結び付くホストやアドレス（既定: `127.0.0.1`）。ループバックでも `API_SERVER_KEY` は必要です。ブラウザーからつなぐときは `API_SERVER_CORS_ORIGINS` を絞って許可してください。 |
| `API_SERVER_MODEL_NAME` | `/v1/models` に出すモデル名。既定はプロファイル名（既定のプロファイルなら `hermes-agent`）です。Open WebUI のようなフロントエンドが接続ごとに別のモデル名を必要とする、複数人での構成で役立ちます。 |
| `GATEWAY_PROXY_URL` | メッセージの転送先になる、離れた場所の Hermes API サーバーの URL（[プロキシ モード](/hermes/docs/user-guide/messaging/matrix/#proxy-mode-e2ee-on-macos)）。設定すると、ゲートウェイはプラットフォームとの入出力だけを受け持ち、エージェントの仕事はすべて転送先のサーバーに任せます。`config.yaml` の `gateway.proxy_url` でも設定できます。 |
| `GATEWAY_PROXY_KEY` | プロキシ モードで転送先の API サーバーに認証してもらうためのベアラー トークン。転送先ホストの `API_SERVER_KEY` と一致している必要があります。 |
| `MESSAGING_CWD` | ゲートウェイの作業ディレクトリの、互換のために残された指定（非推奨）。`config.yaml` の `terminal.cwd` を使ってください。 |
| `GATEWAY_ALLOWED_USERS` | すべてのプラットフォームで許可するユーザー ID をカンマ区切りで並べます |
| `GATEWAY_ALLOW_ALL_USERS` | 許可リストなしですべてのユーザーを許可します（`true`/`false`、既定: `false`） |

### ウェブ ダッシュボードと Hermes Desktop {#web-dashboard-hermes-desktop}

[ウェブ ダッシュボード](/hermes/docs/user-guide/features/web-dashboard/) の認証と、[Hermes Desktop を離れた場所のバックエンドにつなぐ](/hermes/docs/user-guide/features/web-dashboard/#connecting-hermes-desktop-to-a-remote-backend) ための認証です。秘密の情報だけを置くという決まりに従い、認証情報は `~/.hermes/.env` に入れます。OAuth の `client_id` は `config.yaml` の `dashboard.oauth` の下に置くほうが向いています（両方あれば環境変数が勝ちます）。

ダッシュボードの認証は 3 種類が同梱されています。離れた場所の Hermes Desktop からつなぐときや、インターネットに面したダッシュボードでは、**OAuth（Nous Portal）** をおすすめします。`HERMES_DASHBOARD_OAUTH_CLIENT_ID` を設定してください（`hermes dashboard register` で用意します）。同梱の**ユーザー名とパスワード**の方式（`HERMES_DASHBOARD_BASIC_AUTH_*`）は、信頼できる LAN の中や VPN の後ろにあるバックエンドにはいちばん手早い選択ですが、インターネットに直接さらす用途には向きません。自分の ID 基盤で認証するなら、**自前で立てる OIDC** の方式（`HERMES_DASHBOARD_OIDC_*`）を使ってください。いずれの場合も、ループバック以外に結び付けると（`hermes dashboard --host 0.0.0.0`）認証の関門が働きます。全体像は [ウェブ ダッシュボード → 認証](/hermes/docs/user-guide/features/web-dashboard/#authentication-gated-mode) を参照してください。

| 変数 | 説明 |
|----------|-------------|
| `HERMES_DASHBOARD_BASIC_AUTH_USERNAME` | 同梱のユーザー名・パスワード方式（`plugins/dashboard_auth/basic`）のユーザー名。パスワードと合わせて設定すると、この方式が有効になります。`dashboard.basic_auth.username` より優先されます。 |
| `HERMES_DASHBOARD_BASIC_AUTH_PASSWORD` | この方式の平文のパスワード（読み込み時にメモリ上でハッシュ化されます）。設定ファイルの `password_hash` より優先されるので、環境変数だけで入れ替えられます。`dashboard.basic_auth.password` より優先されます。 |
| `HERMES_DASHBOARD_BASIC_AUTH_PASSWORD_HASH` | この方式の scrypt によるパスワードのハッシュ（平文が残らないのでこちらがおすすめです）。`python -c "from plugins.dashboard_auth.basic import hash_password; print(hash_password('PW'))"` で計算します。`dashboard.basic_auth.password_hash` より優先されます。 |
| `HERMES_DASHBOARD_BASIC_AUTH_SECRET` | この方式の、状態を持たないセッション トークンに署名する HMAC の鍵（32 バイト以上。base64、16 進数、生の値のいずれか）。明示的に設定すると、再起動をまたいでもセッションが残り、複数のワーカーでも共有できます。空にするとプロセスごとに無作為な値になります（再起動のたびにログアウトします）。`dashboard.basic_auth.secret` より優先されます。 |
| `HERMES_DASHBOARD_BASIC_AUTH_TTL_SECONDS` | この方式のアクセス トークンの寿命（既定は 12 時間）。`dashboard.basic_auth.session_ttl_seconds` より優先されます。 |
| `HERMES_DASHBOARD_OAUTH_CLIENT_ID` | 認証つき・公開のダッシュボード向けの OAuth のクライアント ID（`agent:{instance_id}`）で、Nous の方式（`plugins/dashboard_auth/nous`）が有効になります。`dashboard.oauth.client_id` より優先されます。`hermes dashboard register` で用意します。 |
| `HERMES_DASHBOARD_PUBLIC_URL` | リバース プロキシの後ろでダッシュボードに実際にたどり着く公開 URL の全体。OAuth のコールバックの組み立てを決め、そのホスト名を HTTP の Host と WebSocket の Origin の検査に加え、バックエンドがループバックに結び付いていても、ループバック以外の公開ホストでは認証の関門を必須にします。`dashboard.public_url` より優先されます。 |
| `HERMES_DASHBOARD_OIDC_ISSUER` | 同梱の自前 OIDC の方式（`plugins/dashboard_auth/self_hosted`）の発行者 URL。有効にするには必須です。`dashboard.oauth.self_hosted.issuer` より優先されます。 |
| `HERMES_DASHBOARD_OIDC_CLIENT_ID` | 自前 OIDC の方式の公開クライアント ID（認可コード + PKCE）。有効にするには必須です。`dashboard.oauth.self_hosted.client_id` より優先されます。 |
| `HERMES_DASHBOARD_OIDC_SCOPES` | 自前 OIDC の方式で要求するスコープ（既定は `openid profile email`）。`dashboard.oauth.self_hosted.scopes` より優先されます。 |
| `HERMES_DESKTOP_REMOTE_URL` | （デスクトップ側）離れた場所のバックエンドのベース URL。たとえば `http://host:9119` です。設定するとアプリ内のゲートウェイ URL より優先されますが、サインインはこれまでどおりゲートウェイの設定画面から行います（バックエンドが提示する方式に応じて、OAuth のリダイレクトかユーザー名・パスワードになります）。 |
| `HERMES_DESKTOP_HERMES` | デスクトップのバックエンドのコマンドを上書きします。パッケージ作成や Nix、あるいは不具合を調べるときに、バックエンドの探索のあとで Electron に特定の `hermes` 実行ファイルを指させるために使います。 |
| `HERMES_DESKTOP_HERMES_ROOT` | `hermes desktop --hermes-root` が使う、ソースを取得した場所の指定。パッケージ版の初回導入や `PATH` にある既存の `hermes` より先に見られます。 |
| `HERMES_DESKTOP_IGNORE_EXISTING` | `1` にすると、バックエンドを決めるときに `PATH` にある既存の `hermes` をデスクトップが無視します。`hermes desktop --ignore-existing` と同じです。 |
| `HERMES_DESKTOP_CWD` | デスクトップのチャット セッションの最初のプロジェクト ディレクトリ。`hermes desktop --cwd` が設定します。 |
| `HERMES_DESKTOP_PYTHON` | バックエンド向けの Python インタープリターの絶対パス。ソースを取得した場所について Electron が自動で解決するより先に見られます。共有の仮想環境を使い回すために、ワークツリーでの開発補助（[ワークツリーからの TUI とデスクトップ](/hermes/docs/developer-guide/worktree-ui-dev/) を参照）が使います。 |
| `HERMES_DESKTOP_DEV_SERVER` | Electron の外枠がパッケージ版の代わりに読み込む Vite の開発サーバーの URL（例: `http://127.0.0.1:5174`）。`npm run dev` が自動で設定します。アプリ自体をいじるときだけ関係します。 |
| `HERMES_DESKTOP_CDP_PORT` | DOM や CSS を調べる道具のために、描画側が `127.0.0.1` で公開する Chrome DevTools Protocol のポートを上書きします（既定は `9222`）。開発サーバーでの実行（`npm run dev`、`hgui`）では自動で開きますが、パッケージ版では決して開かず、ここに値を入れてもそれは変わりません。`off` にすると開発時の実行でも無効にできます。このポートに届く相手は誰でも、描画側でコードを実行できます。 |

### Microsoft Graph（Teams の会議） {#microsoft-graph-teams-meetings}

近く提供される Teams の会議要約の仕組みが使う、Microsoft Graph の REST クライアント向けのアプリ単位の認証情報です。Azure ポータルでの手順と、必要になる API の権限は [Microsoft Graph アプリケーションの登録](/hermes/docs/guides/microsoft-graph-app-registration/) にあります。

| 変数 | 説明 |
|----------|-------------|
| `MSGRAPH_TENANT_ID` | Graph のアプリ登録に使う Azure AD のテナント ID（ディレクトリの GUID）。 |
| `MSGRAPH_CLIENT_ID` | Azure のアプリ登録のアプリケーション（クライアント）ID。 |
| `MSGRAPH_CLIENT_SECRET` | アプリ登録のクライアント シークレットの値。`~/.hermes/.env` に `chmod 600` で保管し、Azure ポータルで定期的に入れ替えてください。 |
| `MSGRAPH_SCOPE` | クライアント資格情報でトークンを要求するときの OAuth2 のスコープ（既定: `https://graph.microsoft.com/.default`）。 |
| `MSGRAPH_AUTHORITY_URL` | Microsoft ID プラットフォームの認証局（既定: `https://login.microsoftonline.com`）。各国向けクラウドのときだけ上書きします（GCC High なら `https://login.microsoftonline.us` など）。 |

### Microsoft Graph の webhook 待ち受け {#microsoft-graph-webhook-listener}

Graph のイベント（Teams の会議、カレンダー、チャットなど）の変更通知を受け取る待ち受けです。設定とセキュリティの固め方は [Microsoft Graph の webhook 待ち受け](/hermes/docs/user-guide/messaging/msgraph-webhook/) にあります。

| 変数 | 説明 |
|----------|-------------|
| `MSGRAPH_WEBHOOK_ENABLED` | ゲートウェイのプラットフォーム `msgraph_webhook` を有効にします（`true`/`1`/`yes`）。 |
| `MSGRAPH_WEBHOOK_PORT` | 待ち受けが結び付くポート（既定: `8646`）。 |
| `MSGRAPH_WEBHOOK_CLIENT_STATE` | Graph が通知のたびに返してくる共有の秘密。`hmac.compare_digest` で照合します。`openssl rand -hex 32` で作ってください。 |
| `MSGRAPH_WEBHOOK_ACCEPTED_RESOURCES` | 受け付ける Graph のリソース パスやパターンをカンマ区切りで並べます（例: `communications/onlineMeetings,chats/*/messages`）。末尾の `*` は前方一致です。空ならすべて受け付けます。 |
| `MSGRAPH_WEBHOOK_ALLOWED_SOURCE_CIDRS` | 待ち受けに POST できる CIDR の範囲をカンマ区切りで並べます（例: `52.96.0.0/14,52.104.0.0/14`）。空ならすべて許可します（既定）。本番では Microsoft Graph が公開している送信元の範囲に絞ってください。 |

### Teams の会議要約の配信 {#teams-meeting-summary-delivery}

[`teams_pipeline` プラグイン](/hermes/docs/user-guide/messaging/msgraph-webhook/) を有効にしたときだけ使います。`config.yaml` の `platforms.teams.extra` の下でも設定できます。両方にある場合は環境変数が優先されます。[Microsoft Teams → 会議要約の配信](/hermes/docs/user-guide/messaging/teams/#meeting-summary-delivery-teams-meeting-pipeline) を参照してください。

| 変数 | 説明 |
|----------|-------------|
| `TEAMS_DELIVERY_MODE` | `graph` か `incoming_webhook`。 |
| `TEAMS_INCOMING_WEBHOOK_URL` | Teams が発行する webhook の URL。`TEAMS_DELIVERY_MODE=incoming_webhook` のときは必須です。 |
| `TEAMS_GRAPH_ACCESS_TOKEN` | Graph での配信のために、あらかじめ取得しておいた委任のアクセス トークン。必要になることはまれで、設定しなければ `MSGRAPH_*` のアプリの認証情報が使われます。 |
| `TEAMS_TEAM_ID` | チャンネルに配信するときの対象の Team ID（`graph` モード）。 |
| `TEAMS_CHANNEL_ID` | 対象のチャンネル ID（`TEAMS_TEAM_ID` と組で使います）。 |
| `TEAMS_CHAT_ID` | 対象の 1 対 1 またはグループのチャット ID（`graph` モードで、チームとチャンネルの代わりに使えます）。 |

### LINE Messaging API {#line-messaging-api}

同梱の LINE のプラットフォーム プラグイン（`plugins/platforms/line/`）が使います。設定の全体は [メッセージング ゲートウェイ → LINE](/hermes/docs/user-guide/messaging/line/) にあります。

| 変数 | 説明 |
|----------|-------------|
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Developers コンソール（Messaging API タブ）で発行する、長期のチャネル アクセス トークン。必須です。 |
| `LINE_CHANNEL_SECRET` | チャネル シークレット（Basic settings タブ）。webhook の HMAC-SHA256 署名の検証に使います。必須です。 |
| `LINE_HOST` | webhook が結び付くホスト（既定: `0.0.0.0`）。 |
| `LINE_PORT` | webhook が結び付くポート（既定: `8646`）。 |
| `LINE_PUBLIC_URL` | 公開の HTTPS のベース URL（例: `https://my-tunnel.example.com`）。画像・音声・動画を送るには必須です。LINE は HTTPS でたどり着ける URL しか受け付けません。 |
| `LINE_ALLOWED_USERS` | ボットに 1 対 1 でメッセージを送れるユーザー ID をカンマ区切りで並べます（`U` で始まります）。 |
| `LINE_ALLOWED_GROUPS` | ボットが返答するグループ ID をカンマ区切りで並べます（`C` で始まります）。 |
| `LINE_ALLOWED_ROOMS` | ボットが返答するルーム ID をカンマ区切りで並べます（`R` で始まります）。 |
| `LINE_ALLOW_ALL_USERS` | 開発時だけの逃げ道で、どの送信元も受け付けます。既定: `false`。 |
| `LINE_HOME_CHANNEL` | `deliver: line` を指定した cron の作業の既定の配信先。 |
| `LINE_SLOW_RESPONSE_THRESHOLD` | LLM の応答が遅いときにテンプレート ボタンのポストバックを出すまでの秒数（既定: `45`）。`0` にすると無効になり、つねに Push で送ります。 |
| `LINE_PENDING_TEXT` | ポストバックのボタンと一緒に出す吹き出しの文言。 |
| `LINE_BUTTON_LABEL` | ポストバックのボタンのラベル（既定: `Get answer`）。 |
| `LINE_DELIVERED_TEXT` | すでに届いたポストバックをもう一度押したときの返答（既定: `Already replied ✅`）。 |
| `LINE_INTERRUPTED_TEXT` | `/stop` で行き場をなくしたポストバックのボタンを押したときの返答（既定: `Run was interrupted before completion.`）。 |

### ntfy（プッシュ通知） {#ntfy-push-notifications}

[ntfy](https://ntfy.sh/) は HTTP を使った軽いプッシュ通知の仕組みです。[ntfy のモバイル アプリ](https://ntfy.sh/docs/subscribe/phone/) からトピックを購読し、そのトピックへ送信するとエージェントと会話できます。

| 変数 | 説明 |
|----------|-------------|
| `NTFY_TOPIC` | 購読するトピック（受信メッセージ用）。必須です。 |
| `NTFY_SERVER_URL` | サーバーの URL（既定: `https://ntfy.sh`）。自前で立てた ntfy を指せば、内容を外に出さずに済みます。 |
| `NTFY_TOKEN` | 認証トークン（任意）。ベアラー トークン（例: `tk_xyz`）か、Basic 認証用の `user:pass` です。 |
| `NTFY_PUBLISH_TOPIC` | 返信を送るトピック（既定は `NTFY_TOPIC`）。 |
| `NTFY_MARKDOWN` | `true` にすると `X-Markdown: true` ヘッダーを付けて返信します。既定: `false`。 |
| `NTFY_ALLOWED_USERS` | 許可リスト（ユーザー ID として扱いますが、ntfy ではトピック名です）。ふつうは `NTFY_TOPIC` と同じ値にします。 |
| `NTFY_ALLOW_ALL_USERS` | 開発時だけの逃げ道で、アクセスを制御した非公開のトピックでしか安全ではありません。既定: `false`。 |
| `NTFY_HOME_CHANNEL` | `deliver: ntfy` を指定した cron の作業の既定の配信先。 |
| `NTFY_HOME_CHANNEL_NAME` | ホーム チャンネルの分かりやすい名前（既定はトピック名）。 |

信頼できないトピックで運用する前に、[ntfy のメッセージング ガイド](/hermes/docs/user-guide/messaging/ntfy/)、とくに**識別の考え方**の節を読んでください。

### IRC {#irc}

Hermes を IRC のサーバーにつなぎます。外部の依存はありません。[IRC のメッセージング ガイド](/hermes/docs/user-guide/messaging/irc/) を参照してください。

| 変数 | 説明 |
|----------|-------------|
| `IRC_SERVER` | IRC サーバーのホスト名（例: `irc.libera.chat`）。必須です。 |
| `IRC_CHANNEL` | 参加するチャンネル（例: `#hermes`）。複数ならカンマ区切りにします。必須です。 |
| `IRC_NICKNAME` | ボットのニックネーム（既定: `hermes-bot`）。必須です。 |
| `IRC_PORT` | サーバーのポート（既定: TLS ありなら `6697`、なしなら `6667`）。 |
| `IRC_USE_TLS` | TLS を使います（`true`/`false`。ポート 6697 では既定で `true`）。 |
| `IRC_SERVER_PASSWORD` | `PASS` コマンド用のサーバーのパスワード（任意）。 |
| `IRC_NICKSERV_PASSWORD` | 接続時に自動で IDENTIFY するための NickServ のパスワード（任意）。 |
| `IRC_ALLOWED_USERS` | ボットと会話できるニックネームをカンマ区切りで並べます。 |
| `IRC_ALLOW_ALL_USERS` | チャンネルにいる誰もがボットと会話できるようにします（開発時のみ）。 |
| `IRC_HOME_CHANNEL` | cron や通知の配信先のチャンネル（既定は `IRC_CHANNEL`）。 |

### SimpleX {#simplex}

手元の `simplex-chat` デーモンを通して、Hermes を [SimpleX Chat](https://simplex.chat/) のネットワークにつなぎます。[SimpleX のメッセージング ガイド](/hermes/docs/user-guide/messaging/simplex/) を参照してください。

| 変数 | 説明 |
|----------|-------------|
| `SIMPLEX_WS_URL` | simplex-chat デーモンの WebSocket の URL（例: `ws://127.0.0.1:5225`）。 |
| `SIMPLEX_ALLOWED_USERS` | ボットと会話できる SimpleX の連絡先 ID をカンマ区切りで並べます。 |
| `SIMPLEX_ALLOW_ALL_USERS` | どの連絡先でもボットと会話できるようにします（開発時のみ。許可リストが無効になります）。 |
| `SIMPLEX_AUTO_ACCEPT` | 届いた連絡先の申請を自動で承認します（既定: `true`）。 |
| `SIMPLEX_GROUP_ALLOWED` | ボットが参加する SimpleX のグループ ID をカンマ区切りで並べます。`*` ならどのグループでも許可します。省くとグループのメッセージを完全に無視します（そのほうが安全です。グループにいるボットは、放っておくとメンバー全員の発言を処理してしまいます）。 |
| `SIMPLEX_HOME_CHANNEL` | cron や通知の配信先になる既定の連絡先やグループの ID。 |
| `SIMPLEX_HOME_CHANNEL_NAME` | ホーム チャンネルの分かりやすい名前（既定は ID）。 |

### Photon {#photon}

Node のサイドカーを通して、Hermes を [Photon](https://photon.codes/) / Spectrum（iMessage やそのほかの Spectrum のプラットフォーム）につなぎます。[Photon のメッセージング ガイド](/hermes/docs/user-guide/messaging/photon/) を参照してください。

| 変数 | 説明 |
|----------|-------------|
| `PHOTON_PROJECT_ID` | Spectrum のプロジェクト ID（プロジェクトの `spectrumProjectId`。`hermes photon setup` が設定します）。 |
| `PHOTON_PROJECT_SECRET` | Spectrum のプロジェクト ID と対になる秘密鍵（`hermes photon setup` が設定します）。 |
| `PHOTON_ALLOWED_USERS` | ボットと会話できる E.164 形式の電話番号をカンマ区切りで並べます。 |
| `PHOTON_ALLOW_ALL_USERS` | どの送信者でもボットを動かせるようにします（開発時のみ。許可リストが無効になります）。 |
| `PHOTON_REQUIRE_MENTION` | グループのメッセージは、呼びかけ語に一致しない限り無視します（`true`/`false`、既定は `false`）。 |
| `PHOTON_MENTION_PATTERNS` | グループ チャットでの呼びかけ語の正規表現（JSON のリスト、またはカンマや改行で区切ったもの。既定は Hermes の呼びかけ語です）。 |
| `PHOTON_HOME_CHANNEL` | cron や通知の配信先になる既定の Photon の宛先。Spectrum のスペース ID、1 対 1 の GUID、素の E.164 形式の電話番号のいずれかです。 |
| `PHOTON_HOME_CHANNEL_NAME` | ホーム チャンネルの分かりやすい名前。 |
| `PHOTON_MARKDOWN` | エージェントの返答をマークダウンで送ります。iMessage はそのまま表示し、ほかの Spectrum のプラットフォームでは素の文字になります（`true`/`false`、既定は `true`）。 |
| `PHOTON_REACTIONS` | 処理の状態としてメッセージに 👀 / 👍 / 👎 のタップバックを付け、ボットのメッセージへのタップバックをエージェントに渡します（`true`/`false`、既定は `false`）。 |
| `PHOTON_TELEMETRY` | サイドカーで Spectrum SDK の測定データ送信を有効にします（`true`/`false`、既定は `false`。`hermes photon telemetry on|off` で切り替えられます）。 |
| `PHOTON_SIDECAR_PORT` | Node のサイドカーの制御と受信に使うループバックのポート（既定は `8789`）。 |
| `PHOTON_SIDECAR_AUTOSTART` | 接続時に Node のサイドカーを起動します（`true`/`false`、既定は `true`）。 |
| `PHOTON_NODE_BIN` | node の実行ファイルのパス（既定: `shutil.which('node')`）。 |
| `PHOTON_DASHBOARD_HOST` | Photon Dashboard API のホスト（既定は `https://app.photon.codes`）。 |
| `PHOTON_SPECTRUM_HOST` | Photon Spectrum API のホスト（既定は `https://spectrum.photon.codes`）。 |

### Buzz（Nostr のコミュニティ） {#buzz-nostr-communities}

| 変数 | 説明 |
|----------|-------------|
| `BUZZ_RELAY_URL` | Buzz のコミュニティ リレーのベース URL（例: `https://mycommunity.communities.buzz.xyz`） |
| `BUZZ_PRIVATE_KEY` | エージェントの Buzz 上の識別子に使う Nostr の秘密鍵（nsec か 16 進数）。Buzz で秘密にすべきものはこれだけです |
| `BUZZ_CREDENTIALS_FILE` | nsec を収めた JSON の認証情報ファイル（`BUZZ_PRIVATE_KEY` がないときに使います） |
| `BUZZ_CHANNELS` | 見張るチャンネルの UUID をカンマ区切りで並べます（既定は参加中のすべてのチャンネル） |
| `BUZZ_HOME_CHANNEL` | cron や通知の配信先になるチャンネルの UUID（既定は最初に見張っているチャンネル） |
| `BUZZ_ALLOWED_USERS` | エージェントと会話できる npub か 16 進数の公開鍵をカンマ区切りで並べます |
| `BUZZ_ALLOW_ALL_USERS` | コミュニティの誰もがエージェントと会話できるようにします（`true`/`false`） |
| `BUZZ_TRANSPORT` | 受信の経路。`auto`（WebSocket を使い、だめならポーリング。既定）、`websocket`、`poll` です |
| `BUZZ_POLL_INTERVAL` | 受信のポーリングの間隔を秒で指定します（既定: `4`） |
| `BUZZ_AUTH_TAG` | NIP-42 の WebSocket 認証で使う NIP-OA の所有者証明の認証タグの JSON（任意） |
| `BUZZ_CLI_PATH` | buzz の CLI 実行ファイルのパス（既定: PATH 上の `buzz`、次に `~/bin/buzz`） |

### Microsoft Teams（アダプター） {#microsoft-teams-adapter}

Microsoft Teams のプラットフォーム アダプター（Bot Framework / Azure AD）です。上の [Microsoft Graph（Teams の会議）](#microsoft-graph-teams-meetings) の連携とは別ものです。[Teams のメッセージング ガイド](/hermes/docs/user-guide/messaging/teams/) を参照してください。

| 変数 | 説明 |
|----------|-------------|
| `TEAMS_CLIENT_ID` | Azure AD のアプリケーション（Bot Framework）のクライアント ID。 |
| `TEAMS_CLIENT_SECRET` | Azure AD のアプリケーションのクライアント シークレット。 |
| `TEAMS_TENANT_ID` | ボットのアプリケーションを置く Azure AD のテナント ID。 |
| `TEAMS_HOST` | webhook が結び付くホスト（既定: 未設定 — IPv4 と IPv6 の全インターフェース）。 |
| `TEAMS_PORT` | webhook が待ち受けるポート（Bot Framework の既定: `3978`）。 |
| `TEAMS_ALLOWED_USERS` | ボットと会話できる Teams のユーザー ID や UPN をカンマ区切りで並べます。 |
| `TEAMS_ALLOW_ALL_USERS` | どの Teams ユーザーでもボットを動かせるようにします（開発時のみ）。 |
| `TEAMS_HOME_CHANNEL` | cron や通知の配信先になる既定のチャットやチャンネルの ID。 |
| `TEAMS_HOME_CHANNEL_NAME` | Teams のホーム チャンネルの表示名。 |

### Raft {#raft}

| 変数 | 説明 |
|----------|-------------|
| `RAFT_PROFILE` | Raft のエージェント プロファイルの識別名。設定するとアダプターが自動で有効になります。 |

### メッセージングの細かい調整 {#advanced-messaging-tuning}

送信メッセージのまとめ役を、プラットフォームごとに細かく調整するつまみです。ほとんどの人は触る必要がありません。既定値は、各プラットフォームの送信制限を守りつつ、もたつかないように決めてあります。

| 変数 | 説明 |
|----------|-------------|
| `HERMES_TELEGRAM_TEXT_BATCH_DELAY_SECONDS` | Telegram の待機中の文章のかたまりを送り出すまでの猶予（既定: `0.6`）。 |
| `HERMES_TELEGRAM_TEXT_BATCH_SPLIT_DELAY_SECONDS` | Telegram の 1 通が長さの上限を超えて分割されるときの、かたまりの間隔（既定: `2.0`）。 |
| `HERMES_SIMPLEX_TEXT_BATCH_DELAY` | 立て続けに届いた文章を 1 つの MessageEvent にまとめるための静止時間（秒。既定: `0.8`）。Telegram の文章のまとめ方と同じ考え方です。 |
| `HERMES_TELEGRAM_MEDIA_BATCH_DELAY_SECONDS` | Telegram の待機中の添付を送り出すまでの猶予（既定: `0.6`）。 |
| `HERMES_TELEGRAM_FOLLOWUP_GRACE_SECONDS` | エージェントが終わったあと、続きのメッセージを送るまでの待ち時間。最後のストリームのかたまりと競合しないようにするためです。 |
| `HERMES_TELEGRAM_HTTP_CONNECT_TIMEOUT` / `_READ_TIMEOUT` / `_WRITE_TIMEOUT` / `_POOL_TIMEOUT` | 下地になっている `python-telegram-bot` の HTTP のタイムアウト（秒）を上書きします。 |
| `HERMES_TELEGRAM_INIT_TIMEOUT` | ゲートウェイの起動時に走る Telegram の `initialize()` の接続処理について、1 回あたりの上限（秒）。つながらない代替 IP の連なりで起動が止まり続けないようにするためです（既定: `30`）。 |
| `HERMES_TELEGRAM_HTTP_POOL_SIZE` | Telegram API への同時 HTTP 接続数の上限。 |
| `HERMES_TELEGRAM_DISABLE_FALLBACK_IPS` | DNS が引けないときに使う、埋め込みの Cloudflare の代替 IP を無効にします（`true`/`false`）。 |
| `HERMES_DISCORD_TEXT_BATCH_DELAY_SECONDS` | Discord の待機中の文章のかたまりを送り出すまでの猶予（既定: `0.6`）。 |
| `HERMES_DISCORD_TEXT_BATCH_SPLIT_DELAY_SECONDS` | Discord の 1 通が長さの上限を超えて分割されるときの、かたまりの間隔（既定: `2.0`）。 |
| `HERMES_DISCORD_LIVENESS_INTERVAL_SECONDS` | `discord.websocket_liveness_interval_seconds` を互換のために手動で上書きします。動いている Discord ゲートウェイの WebSocket を見に行く間隔です（既定: `15`。`0` で無効）。`config.yaml` のキーのほうをおすすめします。 |
| `HERMES_DISCORD_LIVENESS_FAILURE_THRESHOLD` | `discord.websocket_liveness_failure_threshold` を互換のために手動で上書きします。WebSocket の不調が何回続いたら強制的につなぎ直すかです（既定: `2`）。`config.yaml` のキーのほうをおすすめします。 |
| `HERMES_MATRIX_TEXT_BATCH_DELAY_SECONDS` / `_SPLIT_DELAY_SECONDS` | Telegram のまとめ方のつまみの Matrix 版です。 |
| `HERMES_FEISHU_TEXT_BATCH_DELAY_SECONDS` / `_SPLIT_DELAY_SECONDS` / `_MAX_CHARS` / `_MAX_MESSAGES` | Feishu のまとめ役の調整。待ち時間、分割の間隔、1 通あたりの最大文字数、1 まとまりの最大通数です。 |
| `HERMES_FEISHU_MEDIA_BATCH_DELAY_SECONDS` | Feishu の添付を送り出すまでの待ち時間。 |
| `HERMES_FEISHU_DEDUP_CACHE_SIZE` | Feishu の webhook の重複除去のキャッシュの大きさ（既定: `1024`）。 |
| `HERMES_WECOM_TEXT_BATCH_DELAY_SECONDS` / `_SPLIT_DELAY_SECONDS` | WeCom のまとめ役の調整。 |
| `HERMES_VISION_DOWNLOAD_TIMEOUT` | 画像を視覚モデルに渡す前に取得するときのタイムアウト（秒。既定: `30`）。 |
| `HERMES_VISION_MAX_CONCURRENCY` | プロセス全体で、画像の**変換と縮小**を同時にいくつまで走らせるか（`auxiliary.vision.max_concurrency` の上書き。既定はホストの CPU コア数で、上限はありません）。CPU を使う変換の段だけを抑えるので、動画のコマを一気に処理してもすべてのコアを埋め尽くしてイベント ループを飢えさせることがありません。LLM の呼び出しはそのまま並行に走ります。`< 1` の値は無視されます。 |
| `HERMES_RESTART_DRAIN_TIMEOUT` | ゲートウェイ。`/restart` のときに、動いている処理が終わるのを待つ秒数（既定: `900`）。これを過ぎると強制的に再起動します。 |
| `HERMES_GATEWAY_PLATFORM_CONNECT_TIMEOUT` | ゲートウェイの起動時と再接続時の、プラットフォームごとの接続のタイムアウト（秒。`0` や負の値なら無制限に待ちます）。接続の試みだけでなく Discord のアダプターの準備待ちにも効くので、同期すべきスラッシュコマンドが多いアカウントでも起動の途中で切られません。`config.yaml` の `gateway.platform_connect_timeout`（既定 `30`）から橋渡しされ、この環境変数は手動での上書きとして、明示的に設定すれば優先されます。 |
| `HERMES_GATEWAY_BUSY_INPUT_MODE` | ゲートウェイが作業中に入力を受けたときの既定の動き。`queue`、`steer`、`interrupt` です。作業中のプロファイルについては `/busy` で上書きできます。 |
| `HERMES_GATEWAY_BUSY_ACK_ENABLED` | エージェントが作業中にユーザーが入力したとき、ゲートウェイが受け取りの知らせ（⚡/⏳/⏩）を送るかどうか（既定: `true`）。`false` にするとこの知らせだけを止めます。入力はこれまでどおり積まれる・方向を促す・中断するのいずれかで扱われ、チャットへの返事だけが消えます。`config.yaml` の `display.busy_ack_enabled` から橋渡しされます。 |
| `HERMES_GATEWAY_NO_SUPERVISE` | s6-overlay の Docker イメージの中で、`hermes gateway run` を実行するときに自動監視をやめ、s6 より前の前面実行の動きにします（自動再起動なし。ゲートウェイがコンテナーの主プロセスになります）。真とみなす値は `1`、`true`、`yes` です。CLI の `--no-supervise` と同じです。s6 のイメージの外では何も起きません。 |
| `HERMES_GATEWAY_BOOTSTRAP_STATE` | s6-overlay の Docker イメージの中で、まっさらなボリュームでのゲートウェイの**最初の**監視状態を決めます。空のボリュームには `gateway_state.json` が残っていないので、起動時の調整役は `gateway-default` の枠を登録しつつ、**停止したまま**にします（最後に記録された状態が `running` のときだけ自動で起動するためです）。これを `running` にしておくと、初回起動の設定処理が調整役より*先に* `gateway_state.json` を用意するので、いちばん最初の起動からゲートウェイが立ち上がります。`running` という値だけが有効です。初回起動のときだけ働き、すでにある `gateway_state.json` を上書きすることはないので、意図して止めたゲートウェイは再起動をまたいでも止まったままです。s6 のイメージの外では何も起きません。 |
| `GATEWAY_RELAY_URL` | 実験的なリレー コネクターの WebSocket のベース URL。設定すると、ゲートウェイは汎用の `relay` アダプターを登録し、こちらからコネクターへつなぎに行きます。`config.yaml` の `gateway.relay_url` と同じです。 |
| `GATEWAY_RELAY_ID` | `hermes gateway enroll` か自動の登録処理が割り当てるリレーのゲートウェイ識別子。`gateway.relay_id` と同じです。 |
| `GATEWAY_RELAY_SECRET` | WebSocket の認証に使う、ゲートウェイごとのリレーの秘密鍵。すでに設定してあれば、自動の登録処理は行われません。`gateway.relay_secret` と同じです。 |
| `GATEWAY_RELAY_DELIVERY_KEY` | リレーや素通しの認証との互換のために残してある、コネクターが発行する配信キー。いまのリレーでは、受信メッセージはゲートウェイ側の HTTP の受け口ではなく、こちらから張った WebSocket に届きます。 |
| `GATEWAY_RELAY_ENROLL_TOKEN` | `--token` を明示的に渡さなかったときに `hermes gateway enroll` が使う登録用のトークン。 |
| `GATEWAY_RELAY_PLATFORM` | リレーの機能の説明に載せるプラットフォーム名（任意）。 |
| `GATEWAY_RELAY_BOT_ID` | リレーの機能の説明に載せるボットの識別子（任意）。 |
| `GATEWAY_RELAY_ENDPOINT` | コールバックや素通しの URL が要るコネクターの動かし方のために載せるゲートウェイのエンドポイント（任意）。既定の WebSocket だけで受信する経路では不要です。`gateway.relay_endpoint` と同じです。 |
| `GATEWAY_RELAY_ROUTE_KEYS` | コネクターに知らせるリレーの経路キーをカンマ区切りで並べます。`gateway.relay_route_keys` と同じです。 |
| `HERMES_FILE_MUTATION_VERIFIER` | ターンごとのファイル変更の照合結果を末尾に付けます（既定: `true`）。有効にすると、そのターンで失敗し、あとから書き込みが成功して置き換わることもなかった `write_file` / `patch` の呼び出しを、注意書きとして並べます。`0`、`false`、`no`、`off` のいずれかにすると出なくなります。`config.yaml` の `display.file_mutation_verifier` と同じで、環境変数を設定すればそちらが勝ちます。 |
| `HERMES_CRON_TIMEOUT` | cron の作業でエージェントを動かすときの、無操作のタイムアウトを秒で指定します（既定: `600`）。ツールを呼び続けていたり、ストリームのトークンを受け取っていたりする間はいくらでも走れます。止まったときにだけ働きます。`0` で無制限です。 |
| `HERMES_CRON_SCRIPT_TIMEOUT` | cron の作業に付けた実行前スクリプトのタイムアウトを秒で指定します（既定: `3600`）。スクリプトだけを区切るもので、スキルやエージェントの作業には別枠の `HERMES_CRON_TIMEOUT` の無操作の上限が効きます。`config.yaml` の `cron.script_timeout_seconds` でも設定できます。 |
| `HERMES_CRON_MEDIA_SEND_TIMEOUT` | 動いているゲートウェイのアダプター経由で cron の結果を届けるときの、添付 1 つあたりの送信のタイムアウトを秒で指定します（既定: `300`）。大きな添付（長い読み上げ音声、大きな書き出し）の送信が間に合わないときは増やしてください。`config.yaml` の `cron.media_send_timeout_seconds` でも設定できます。 |
| `HERMES_CRON_MAX_PARALLEL` | 1 回の実行で並行して動かす cron の作業の上限（既定: `4`）。 |

## NeMo Relay {#nemo-relay}

| 変数 | 説明 |
|----------|-------------|
| `HERMES_NEMO_RELAY_PLUGINS_TOML` | Hermes の中核がプロセス全体で読み込む、標準の NeMo Relay の `plugins.toml` のパスを明示します。設定しなければ、Relay のミドルウェア、動的なプラグイン、書き出しの仕組みは初期化されません。廃止された `HERMES_NEMO_RELAY_ATOF_*` と `HERMES_NEMO_RELAY_ATIF_*` は無視されるので、それらの出力は指定したファイルの中で設定してください。[NeMo Relay の可観測性の設定](https://docs.nvidia.com/nemo/relay/configure-plugins/observability/about) を参照してください。 |

## エージェントの振る舞い {#agent-behavior}

| 変数 | 説明 |
|----------|-------------|
| `HERMES_MAX_ITERATIONS` | 1 つの会話でツールを呼ぶ回数の上限（既定: 500） |
| `HERMES_INFERENCE_MODEL` | プロセス単位でモデル名を上書きします（そのセッションでは `config.yaml` より優先されます）。`-m` / `--model` でも指定できます。 |
| `HERMES_YOLO_MODE` | `1` にすると、危険なコマンドの承認を省きます。`--yolo` と同じです。 |
| `HERMES_ACCEPT_HOOKS` | `config.yaml` に書かれた、まだ確認していないシェルのフックを、端末での確認なしに自動で承認します。`--accept-hooks` や `hooks_auto_accept: true` と同じです。 |
| `HERMES_IGNORE_USER_CONFIG` | `~/.hermes/config.yaml` を読まず、組み込みの既定値を使います（`.env` の認証情報は読み込まれます）。`--ignore-user-config` と同じです。 |
| `HERMES_IGNORE_RULES` | `AGENTS.md`、`SOUL.md`、`.cursorrules`、記憶、あらかじめ読み込むスキルの自動注入をやめます。`--ignore-rules` と同じです。 |
| `HERMES_SAFE_MODE` | 不具合を調べるためのモード。すべてのカスタマイズを無効にし、プラグインの探索、MCP サーバーの読み込み、シェルのフックの登録を行いません。`--safe-mode` を付けると自動で設定されます（上の 2 つのフラグも同時に立ちます）。 |
| `HERMES_TOOL_PROGRESS` | 設定の v12 を下限とするようになってからは使えません。この変数は無視されます。`config.yaml` の `display.tool_progress` を使ってください。 |
| `HERMES_TOOL_PROGRESS_MODE` | ツールの進捗表示のための、互換のために残された非推奨の変数です（ゲートウェイは今も代わりとして読みます）。`config.yaml` の `display.tool_progress` を使ってください。 |
| `HERMES_HUMAN_DELAY_MODE` | 返答の間の取り方。`off`/`natural`/`custom` |
| `HERMES_HUMAN_DELAY_MIN_MS` | 自分で決める待ち時間の下限（ミリ秒） |
| `HERMES_HUMAN_DELAY_MAX_MS` | 自分で決める待ち時間の上限（ミリ秒） |
| `HERMES_QUIET` | 必要のない出力を抑えます（`true`/`false`） |
| `CODEX_HOME` | [Codex app-server ランタイム](/hermes/docs/user-guide/features/codex-app-server-runtime/) を有効にしているとき、Codex CLI が設定と認証を読むディレクトリを上書きします（既定: `~/.codex`）。Hermes の移行処理は、管理下の設定のかたまりを `<CODEX_HOME>/config.toml` に書きます。 |
| `HERMES_KANBAN_TASK` | かんばんのディスパッチャーがワーカーを起こすときに設定します（作業の UUID）。ワーカーと、そこから起きる `hermes-tools` の MCP のサブプロセスが引き継ぐので、かんばんのツールの制限が正しく効きます。自分で設定しないでください。 |
| `HERMES_ACP_SKIP_CONFIGURED_MCP` | [ACP のホスト](/hermes/docs/user-guide/features/acp/#host-integration) が、起こした Hermes のサブプロセスに設定します。`1` にすると、ACP の JSON-RPC のやり取りを始める前に `config.yaml` で全体に設定した MCP サーバーを起動しません。セッションの MCP サーバーを `session/new` で自分から渡すホスト向けです。ACP のセッションが渡したサーバーはこれまでどおり登録されます。それ以外の値なら既定のままです。自分で設定しないでください。 |
| `HERMES_API_TIMEOUT` | LLM の API 呼び出しのタイムアウトを秒で指定します（既定: `1800`） |
| `HERMES_API_CALL_STALE_TIMEOUT` | ストリームを使わない呼び出しが止まったとみなすまでの秒数（既定: `90`）。設定しなければ手元のプロバイダーでは自動で無効になり、とても大きな文脈では自動で伸びることもあります。`config.yaml` の `providers.<id>.stale_timeout_seconds` や `providers.<id>.models.<model>.stale_timeout_seconds` でも設定できます。 |
| `HERMES_STREAM_READ_TIMEOUT` | ストリームのソケットの読み取りのタイムアウトを秒で指定します（既定: `120`）。手元のプロバイダーでは自動で `HERMES_API_TIMEOUT` まで伸びます。手元の LLM が長いコード生成の途中で切れるなら増やしてください。 |
| `HERMES_STREAM_STALE_TIMEOUT` | ストリームが止まったと判断するまでの秒数（既定: `180`）。手元のプロバイダーでは自動で無効になります。この時間の中で何も届かなければ接続を切ります。 |
| `HERMES_LOCAL_STREAM_STALE_TIMEOUT` | 手元のプロバイダー（Ollama、oMLX、llama-cpp）向けの、止まったと判断するまでの上限を秒で指定します（既定: `900`）。基本の判定時間が既定のままで、手元のエンドポイントだと分かったときは、以前のように完全に無効にするのではなく、この有限の上限に置き換わります。詰まった手元のサーバーがいつまでも待たされずに検出されます。`config.yaml` の `agent.local_stream_stale_timeout` でも設定できます。 |
| `HERMES_STREAM_RETRIES` | 一時的なネットワークの不調で、ストリームの途中につなぎ直す回数（既定: `3`）。 |
| `HERMES_STREAM_STALE_GIVEUP` | ターンをまたぐ遮断器です。応答が 1 回も完了しないまま、止まったと判断して切ることがこの回数だけ続いたら（ストリームの有無を問いません）、また判定時間だけ待つのではなく、すぐに分かりやすいエラーで打ち切ります（既定: `5`。`0` で無効）。応答が完了したとき、`/model` で切り替えたとき、代替のプロバイダーに切り替わったとき、ターンの始めに本来のプロバイダーへ戻ったときに数え直します。 |
| `HERMES_AGENT_TIMEOUT` | ゲートウェイで、動いているエージェントが無操作になってからのタイムアウトを秒で指定します（既定: `1800`、30 分）。ツールを呼ぶたび、トークンが届くたびに数え直します。`0` で無効です。 |
| `HERMES_GATEWAY_MAX_STARTS` | 再起動が暴走するのを防ぐ遮断器です。決められた時間の中でゲートウェイを起こせる回数の上限で、これを超えると指数的に間を空けて暴走を断ち切ります（既定: `5`。`0` で無効）。`config.yaml` の `gateway.respawn_storm.max_starts` でも設定できます。 |
| `HERMES_GATEWAY_START_WINDOW_S` | 再起動の暴走を見る時間の幅を秒で指定します（既定: `120`）。`config.yaml` の `gateway.respawn_storm.window_seconds` でも設定できます。 |
| `HERMES_AGENT_TIMEOUT_WARNING` | ゲートウェイ。無操作がこの秒数続いたら注意のメッセージを送ります（既定は `HERMES_AGENT_TIMEOUT` の 75%）。 |
| `HERMES_AGENT_NOTIFY_INTERVAL` | ゲートウェイ。長く続くエージェントのターンで、途中経過を知らせる間隔を秒で指定します。 |
| `HERMES_CHECKPOINT_TIMEOUT` | ファイルのチェックポイントを作るときのタイムアウトを秒で指定します（既定: `30`）。 |
| `HERMES_EXEC_ASK` | ゲートウェイのモードで、実行前の承認を求めます（`true`/`false`） |
| `HERMES_ENABLE_PROJECT_PLUGINS` | エージェントの読み込みとダッシュボードのウェブ サーバーの両方で、リポジトリの中の `./.hermes/plugins/` にあるプラグインを自動で見つけるようにします。真とみなす値は `1` / `true` / `yes` / `on` です（大文字小文字は問いません）。それ以外は、`0`、`false`、`no`、`off`、空文字も含めてすべて**無効**として扱われます（既定）。なお、GHSA-5qr3-c538-wm9j（#29156）以降、ダッシュボードのウェブ サーバーは、この変数を有効にしていてもプロジェクトのプラグインの Python の `api` ファイルを自動で読み込みません。プロジェクトのプラグインは静的な JS / CSS で画面を拡張できますが、サーバー側の経路は `~/.hermes/plugins/` の下へ移したときにだけ読み込まれます。 |
| `HERMES_PLUGINS_DEBUG` | `1` / `true` にすると、プラグインの探索の詳しいログを標準エラーに出します。調べたディレクトリ、読んだマニフェスト、飛ばした理由、読み込みや `register()` の失敗時の完全なトレースが出ます。プラグインを書く人向けです。 |
| `HERMES_BACKGROUND_NOTIFICATIONS` | ゲートウェイでのバックグラウンド処理の知らせ方。`concise`（既定）、`all`、`result`、`error`、`off` |
| `HERMES_EPHEMERAL_SYSTEM_PROMPT` | API を呼ぶ時点で差し込む、その場かぎりのシステム プロンプト（セッションには残りません） |
| `HERMES_PREFILL_MESSAGES_FILE` | API を呼ぶ時点で差し込む、その場かぎりの前置きメッセージを収めた JSON ファイルのパス。 |
| `HERMES_ALLOW_PRIVATE_URLS` | `true`/`false` — ツールが localhost や社内ネットワークの URL を取得できるようにします。ゲートウェイのモードでは既定でオフです。 |
| `HERMES_REDACT_SECRETS` | `true`/`false` — ツールの出力、ログ、チャットの返答で秘密の情報を伏せるかどうか（既定: `true`）。 |
| `HERMES_WRITE_SAFE_ROOT` | 指定したディレクトリの外への `write_file` / `patch` の書き込みを**完全に禁じる**ディレクトリの接頭辞（任意）。承認を求めることすらしません。`os.pathsep`（Unix なら `:`、Windows なら `;`）で区切って複数指定できます。下の [HERMES_WRITE_SAFE_ROOT](#hermes_write_safe_root) を参照してください。 |
| `HERMES_DISABLE_LAZY_INSTALLS` | 公式の Docker イメージで自動的に設定される内部の橋渡し用の変数で、書き換えられない `/opt/hermes` の下に実行中の依存関係が入るのを防ぎます。利用者向けの同等の設定は `config.yaml` の `security.allow_lazy_installs: false` です。これを `.env` に書かないでください。 |
| `HERMES_DISABLE_FILE_STATE_GUARD` | `1` にすると、`patch` / `write_file` での「読んだあとにファイルが変わっています」という見張りを止めます。 |
| `HERMES_BUNDLED_SKILLS` | 起動時に読み込む同梱スキルの一覧を、カンマ区切りで上書きします。 |
| `HERMES_OPTIONAL_SKILLS` | 初回起動時に自動で入れる、任意スキルの名前をカンマ区切りで並べます。 |
| `HERMES_DEBUG_INTERRUPT` | `1` にすると、中断や取り消しの詳しい経過を `agent.log` に記録します。 |
| `HERMES_DUMP_REQUESTS` | API リクエストの中身をログ ファイルに書き出します（`true`/`false`） |
| `HERMES_DUMP_REQUEST_STDOUT` | API リクエストの中身を、ログ ファイルではなく標準出力に書き出します。 |
| `HERMES_OAUTH_TRACE` | `1` にすると、OAuth のトークンの交換と更新の試みを記録します。伏せ字にしたうえで所要時間も含みます。 |
| `HERMES_AGENT_HELP_GUIDANCE` | 独自の運用向けに、システム プロンプトへ案内の文章を追加します。 |
| `HERMES_AGENT_LOGO` | CLI の起動時に出るアスキー アートのロゴを差し替えます。 |
| `DELEGATION_MAX_CONCURRENT_CHILDREN` | `delegate_task` 1 回あたりの、並行して動くサブエージェントの上限（既定: `3`。下限は 1 で、上限はありません）。`config.yaml` の `delegation.max_concurrent_children` でも設定でき、そちらが優先されます。 |

### HERMES_WRITE_SAFE_ROOT {#hermes_write_safe_root}

この変数を設定すると、`write_file` と `patch` は指定したディレクトリの接頭辞の中しか書き換えられなくなります。その外のパスは**その場で拒否**されます。危険なコマンドの承認の仕組みには回らず、押し切るための確認も出ません。

公式の Docker イメージは `HERMES_HOME=/opt/data` と合わせて `HERMES_WRITE_SAFE_ROOT=/opt/data` を設定しており、エージェントがマウントしたデータ ボリュームの外に出られないようにしています。

**書き込みを閉じ込めるつもりがないなら、`~/.hermes/.env` に足さないでください。** よくある失敗が、プロジェクトのディレクトリを指しておきながら、エージェントに `~/.hermes/cron/jobs.json` や `~/.hermes/skills/`、プロファイルの下のスクリプトを編集させようとすることです。これらは閉じ込めた範囲の外なので、`write_file` / `patch` はすべて `outside HERMES_WRITE_SAFE_ROOT` のエラーで失敗します。

作業用のディレクトリと Hermes の状態の両方を許可したいときは、接頭辞を 2 つとも並べます（順番は関係ありません）。

```bash
export HERMES_WRITE_SAFE_ROOT=/path/to/project:/home/you/.hermes
```

変数を消すか `.env` から取り除けば、ふつうの書き込みに戻ります（認証情報のパスを禁じるリストは引き続き効きます。[ファイル書き込みの安全](/hermes/docs/user-guide/security/#file-write-safety) を参照してください）。

## 画面まわり {#interface}

| 変数 | 説明 |
|----------|-------------|
| `HERMES_TUI` | `1` にすると、従来型の CLI ではなく [TUI](/hermes/docs/user-guide/tui/) を起動します。`--tui` を付けるのと同じです。 |
| `HERMES_TUI_DIR` | できあがった `ui-tui/` ディレクトリのパス（`dist/entry.js` と、中身の入った `node_modules` が必要です）。ディストリビューションや Nix が、初回起動時の `npm install` を省くために使います。 |
| `HERMES_TUI_RESUME` | 起動時に、指定した ID の TUI セッションを再開します。設定すると `hermes --tui` は新しいセッションを作らず、名前を付けたセッションを引き継ぎます。接続が切れたときや、ターミナルが落ちたあとにつなぎ直すのに便利です。 |
| `HERMES_TUI_THEME` | TUI の配色を固定します。`light`、`dark`、または背景色の 6 文字の 16 進数（`ffffff` や `1a1a2e` など）です。設定しなければ、`COLORFGBG` とターミナルへの背景色の問い合わせで自動判別します。この変数は、`COLORFGBG` を設定しないターミナル（Ghostty、Warp、iTerm2 など）で判別より優先されます。 |
| `HERMES_INFERENCE_MODEL` | `config.yaml` を書き換えずに、`hermes -z` / `hermes chat` のモデルを固定します。`--provider` と組み合わせて使います。実行ごとに既定のモデルを変えたいスクリプト（一括処理、CI、バッチ実行）から呼ぶときに便利です。 |

## セッションの設定 {#session-settings}

| 変数 | 説明 |
|----------|-------------|
| `SESSION_IDLE_MINUTES` | 何も操作しない時間が N 分続いたらセッションを作り直します（既定: 1440） |
| `SESSION_RESET_HOUR` | 毎日の作り直しの時刻を 24 時間制で指定します（既定: 4 = 午前 4 時） |
| `HERMES_SESSION_ID` | Hermes が起こす**すべてのツールのサブプロセスに自動で渡されます**（`terminal`、`execute_code`、常駐シェル、Docker / Singularity のバックエンド、委譲したサブエージェントの実行）。エージェントがいまのセッション ID を入れるので、ツールから呼ばれた自作のスクリプトはこれを読んで、自分の出力や記録、副作用をもとの Hermes のセッションと結び付けられます。**自分で設定しないでください。** 親のシェルから上書きしてもエージェントの実行の外でしか効かず、エージェントがセッションを始めた瞬間に書き換えられます。 |
| `AI_AGENT` | **CLI とゲートウェイの入口で `hermes-agent` に設定され**（外側の仕組みがすでに設定している場合を除きます）、ターミナル ツールのすべてのシェル（Docker、SSH、Modal、Daytona、Singularity、Vercel といった離れた場所のバックエンドも含みます）に渡されます。子プロセスがどのエージェントの下で動いているかを示す、広まりつつある共通の決まりです。汎用のツール（たとえば huggingface_hub のエージェント検出）は、これを読んで AI エージェントの下で動いていると判断します。値は公開されているエージェント基盤の一覧にある Hermes の ID と同じです。自分で設定しないでください。 |
| `HERMES_AGENT` | **CLI とゲートウェイの入口で `true` に設定され**、ターミナル ツールのすべてのシェルに渡されるので、子プロセスは Hermes の中で動いていることをはっきり判別できます。自分で設定しないでください。 |

## 文脈の圧縮（config.yaml のみ） {#context-compression-configyaml-only}

文脈の圧縮は `config.yaml` だけで設定します。環境変数はありません。しきい値は `compression:` のかたまりに、要約に使うモデルやプロバイダーは `auxiliary.compression:` の下に書きます。

```yaml
compression:
  enabled: true
  threshold: 0.50
  target_ratio: 0.20         # fraction of threshold to preserve as recent tail
  protect_last_n: 20         # minimum recent messages to keep uncompressed
```

:::info 古い設定からの移行
`compression.summary_model`、`compression.summary_provider`、`compression.summary_base_url` を使っている古い設定は、最初に読み込むときに `auxiliary.compression.*` へ自動で移されます。
:::

## 補助的な処理の上書き {#auxiliary-task-overrides}

| 変数 | 説明 |
|----------|-------------|
| `AUXILIARY_VISION_PROVIDER` | 画像を扱う処理のプロバイダーを上書きします |
| `AUXILIARY_VISION_MODEL` | 画像を扱う処理のモデルを上書きします |
| `AUXILIARY_VISION_BASE_URL` | 画像を扱う処理で直接つなぐ OpenAI 互換のエンドポイント |
| `AUXILIARY_VISION_API_KEY` | `AUXILIARY_VISION_BASE_URL` と組で使う API キー |

:::note
`AUXILIARY_WEB_EXTRACT_*` の変数はもう使いません。`web_extract` とブラウザーのスナップショットは補助の LLM を使わなくなりました。長いページやスナップショットは決まった規則で切り詰められ、全文はディスクに保存されて `read_file` でページをめくって読めます。
:::

処理ごとに直接エンドポイントを指定した場合、Hermes はその処理に設定した API キーか `OPENAI_API_KEY` を使います。そうした独自エンドポイントに `OPENROUTER_API_KEY` を使い回すことはありません。

## 代替のプロバイダー（config.yaml のみ） {#fallback-providers-configyaml-only}

主なモデルの切り替え先の連なりは `config.yaml` だけで設定します。環境変数はありません。最上位に `fallback_providers` の一覧を作り、`provider` と `model` のキーを書けば、メインのモデルがエラーになったときに自動で切り替わります。プロバイダーが `auto` の補助的な処理も、Hermes 内蔵の探索の流れより先にこの連なりを見ます。

```yaml
fallback_providers:
  - provider: openrouter
    model: anthropic/claude-sonnet-4
```

以前の、最上位に 1 つだけ書く `fallback_model` の形も互換のために今も読まれますが、これから書くなら `fallback_providers` を使ってください。処理ごとの補助的な方針には `config.yaml` の `auxiliary.<task>.fallback_chain` を使います。こちらにも環境変数はありません。

詳しくは [代替のプロバイダー](/hermes/docs/user-guide/features/fallback-providers/) を参照してください。

## プロバイダーの経路選び（config.yaml のみ） {#provider-routing-configyaml-only}

これらは `~/.hermes/config.yaml` の `provider_routing` の節に書きます。

| キー | 説明 |
|-----|-------------|
| `sort` | プロバイダーの並べ方。`"price"`（既定）、`"throughput"`、`"latency"` |
| `only` | 許可するプロバイダーの識別名の一覧（例: `["anthropic", "google"]`） |
| `ignore` | 使わないプロバイダーの識別名の一覧 |
| `order` | 順に試すプロバイダーの識別名の一覧 |
| `require_parameters` | リクエストのすべての引数に対応しているプロバイダーだけを使います（`true`/`false`） |
| `data_collection` | `"allow"`（既定）か、データを保存するプロバイダーを外す `"deny"` |

:::tip
環境変数の設定には `hermes config set` を使ってください。適切なファイル（秘密の情報は `.env`、それ以外は `config.yaml`）へ自動で保存してくれます。
:::
