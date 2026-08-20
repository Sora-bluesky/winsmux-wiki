---
title: "環境変数"
description: "Hermes Agent が使うすべての環境変数の完全な一覧"
upstream_path: reference/environment-variables.md
upstream_blob: e35fbcaf0a2f8b69f9812cc3e4f2d5fde7c5563c
sources:
  - https://hermes-agent.nousresearch.com/docs/reference/environment-variables
---

# 環境変数の一覧 {#environment-variables-reference}

Hermes は環境変数をプロセスの環境から読み込みます。利用者が自分で管理する秘密情報については `~/.hermes/.env` からも読み込みます。API キー、ボットのトークン、OAuth のシークレットなどの資格情報は `.env` に置いてください。秘密情報ではない動作設定は、対応する設定キーがあるなら `config.yaml` に書くほうが向いています。以下に挙げる変数のうちいくつかはプロセス限定の上書きや内部ブリッジ用の変数なので、ここに載っているからというだけで `.env` に書き込まないでください。

## LLM プロバイダー {#llm-providers}

| 変数 | 説明 |
|----------|-------------|
| `OPENROUTER_API_KEY` | OpenRouter の API キー（融通が利くのでおすすめです） |
| `OPENROUTER_BASE_URL` | OpenRouter 互換のベース URL を上書きします |
| `FIREWORKS_API_KEY` | Fireworks AI の API キー（[app.fireworks.ai](https://app.fireworks.ai/settings/users/api-keys)）。エンドポイントの上書きは `config.yaml` の `model.base_url` で設定します。 |
| `HERMES_OPENROUTER_CACHE` | OpenRouter の応答キャッシュを有効にします（`1`/`true`/`yes`/`on`）。config.yaml の `openrouter.response_cache` を上書きします。[Response Caching](https://openrouter.ai/docs/guides/features/response-caching) を参照してください。 |
| `HERMES_OPENROUTER_CACHE_TTL` | キャッシュの TTL を秒で指定します（1〜86400）。config.yaml の `openrouter.response_cache_ttl` を上書きします。 |
| `NOUS_BASE_URL` | Nous Portal のベース URL を上書きします（必要になることはまれで、開発・検証用です） |
| `NOUS_INFERENCE_BASE_URL` | Nous の推論エンドポイントを直接上書きします |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway の API キー（[ai-gateway.vercel.sh](https://ai-gateway.vercel.sh)） |
| `AI_GATEWAY_BASE_URL` | AI Gateway のベース URL を上書きします（既定値: `https://ai-gateway.vercel.sh/v1`） |
| `OPENAI_API_KEY` | OpenAI 互換の独自エンドポイント向けの API キー（`OPENAI_BASE_URL` と組み合わせて使います） |
| `OPENAI_BASE_URL` | 独自エンドポイントのベース URL（VLLM、SGLang など） |
| `LM_API_KEY` | LM Studio（`lmstudio` プロバイダー）の API キー。ローカルのサーバーでは placeholder を入れておくことが多いです |
| `LM_BASE_URL` | LM Studio のベース URL（既定値: `http://localhost:1234/v1`） |
| `COPILOT_GITHUB_TOKEN` | Copilot API 用の GitHub トークン — 最優先で使われます（OAuth の `gho_*`、または fine-grained PAT の `github_pat_*`。classic PAT の `ghp_*` は**使えません**） |
| `GH_TOKEN` | GitHub トークン — Copilot では2番目の優先度で使われます（`gh` CLI も同じものを使います） |
| `GITHUB_TOKEN` | GitHub トークン — Copilot では3番目の優先度で使われます |
| `HERMES_COPILOT_ACP_COMMAND` | Copilot ACP の CLI バイナリのパスを上書きします（既定値: `copilot`） |
| `COPILOT_CLI_PATH` | `HERMES_COPILOT_ACP_COMMAND` の別名です |
| `HERMES_COPILOT_ACP_ARGS` | Copilot ACP に渡す引数を上書きします（既定値: `--acp --stdio`） |
| `COPILOT_ACP_BASE_URL` | Copilot ACP のベース URL を上書きします |
| `COPILOT_API_BASE_URL` | Copilot API のベース URL を上書きします（`copilot` プロバイダー） |
| `GLM_API_KEY` | z.ai / ZhipuAI GLM の API キー（[z.ai](https://z.ai)） |
| `ZAI_API_KEY` | `GLM_API_KEY` の別名です |
| `Z_AI_API_KEY` | `GLM_API_KEY` の別名です |
| `GLM_BASE_URL` | z.ai のベース URL を上書きします（既定値: `https://api.z.ai/api/paas/v4`） |
| `KIMI_API_KEY` | Kimi / Moonshot AI の API キー（[moonshot.ai](https://platform.moonshot.ai)） |
| `KIMI_CODING_API_KEY` | `kimi-coding` プロバイダー用の別名キーです（`KIMI_API_KEY` と並んで受け付けられます） |
| `KIMI_BASE_URL` | Kimi のベース URL を上書きします（既定値: `https://api.moonshot.ai/v1`） |
| `KIMI_CN_API_KEY` | Kimi / Moonshot 中国版の API キー（[moonshot.cn](https://platform.moonshot.cn)） |
| `ARCEEAI_API_KEY` | Arcee AI の API キー（[chat.arcee.ai](https://chat.arcee.ai/)） |
| `ARCEE_BASE_URL` | Arcee のベース URL を上書きします（既定値: `https://api.arcee.ai/api/v1`） |
| `GMI_API_KEY` | GMI Cloud の API キー（[gmicloud.ai](https://www.gmicloud.ai/)） |
| `GMI_BASE_URL` | GMI Cloud のベース URL を上書きします（既定値: `https://api.gmi-serving.com/v1`） |
| `ACTUAL_API_KEY` | Actual Computer の推論キー（`ac_...`、[actual.inc/user/keys](https://actual.inc/user/keys)）。ローカルのデーモンでは不要です。 |
| `ACTUAL_BASE_URL` | Actual Computer のベース URL を上書きします（既定値: `https://api.actual.inc/v1`）。オフラインのローカルデーモンを使うときは `http://127.0.0.1:8080` にします。ループバックのホストなら API キーは要りません。 |
| `MINIMAX_API_KEY` | MiniMax の API キー — グローバルのエンドポイント用（[minimax.io](https://www.minimax.io)）。**`minimax-oauth` では使いません**（OAuth ではブラウザーでのログインを使います）。 |
| `MINIMAX_BASE_URL` | MiniMax のベース URL を上書きします（既定値: `https://api.minimax.io/anthropic` — Hermes は MiniMax の Anthropic Messages 互換エンドポイントを使います）。**`minimax-oauth` では使いません**。 |
| `MINIMAX_CN_API_KEY` | MiniMax の API キー — 中国のエンドポイント用（[minimaxi.com](https://www.minimaxi.com)）。**`minimax-oauth` では使いません**（OAuth ではブラウザーでのログインを使います）。 |
| `MINIMAX_CN_BASE_URL` | MiniMax 中国版のベース URL を上書きします（既定値: `https://api.minimaxi.com/anthropic`）。**`minimax-oauth` では使いません**。 |
| `KILOCODE_API_KEY` | Kilo Code の API キー（[kilo.ai](https://kilo.ai)） |
| `KILOCODE_BASE_URL` | Kilo Code のベース URL を上書きします（既定値: `https://api.kilo.ai/api/gateway`） |
| `XIAOMI_API_KEY` | Xiaomi MiMo の API キー（[platform.xiaomimimo.com](https://platform.xiaomimimo.com)） |
| `XIAOMI_BASE_URL` | Xiaomi MiMo のベース URL を上書きします（既定値: `https://api.xiaomimimo.com/v1`） |
| `UPSTAGE_API_KEY` | Solar モデル向けの Upstage の API キー（[console.upstage.ai](https://console.upstage.ai/api-keys)） |
| `UPSTAGE_BASE_URL` | Upstage のベース URL を上書きします（既定値: `https://api.upstage.ai/v1`） |
| `TOKENHUB_API_KEY` | Tencent TokenHub の API キー（[tokenhub.tencentmaas.com](https://tokenhub.tencentmaas.com)） |
| `TOKENHUB_BASE_URL` | Tencent TokenHub のベース URL を上書きします（既定値: `https://tokenhub.tencentmaas.com/v1`） |
| `AZURE_FOUNDRY_API_KEY` | Microsoft Foundry / Azure OpenAI の API キー（[ai.azure.com](https://ai.azure.com/)）。`model.auth_mode: entra_id` のときは不要です |
| `AZURE_FOUNDRY_BASE_URL` | Microsoft Foundry のエンドポイント URL（OpenAI 形式なら `https://<resource>.openai.azure.com/openai/v1`、Anthropic 形式なら `https://<resource>.services.ai.azure.com/anthropic` など） |
| `AZURE_ANTHROPIC_KEY` | Microsoft Foundry の Claude デプロイを指す `base_url` と `provider: anthropic` を組み合わせるときの Azure Anthropic の API キー（Anthropic と Azure Anthropic の両方を設定している場合に `ANTHROPIC_API_KEY` の代わりに使います） |
| `AZURE_TENANT_ID` | Entra ID のテナント ID（サービスプリンシパルのフロー用。`model.auth_mode: entra_id` のとき `azure-identity` が読み取ります） |
| `AZURE_CLIENT_ID` | Entra ID のクライアント ID（サービスプリンシパル、ワークロード ID、またはユーザー割り当てのマネージド ID） |
| `AZURE_CLIENT_SECRET` | `EnvironmentCredential` が使うサービスプリンシパルのシークレット |
| `AZURE_CLIENT_CERTIFICATE_PATH` | サービスプリンシパルの証明書（`AZURE_CLIENT_SECRET` の代わりに使えます） |
| `AZURE_FEDERATED_TOKEN_FILE` | AKS Workload Identity / OIDC のフローで使うフェデレーショントークンファイルのパス |
| `AZURE_AUTHORITY_HOST` | ソブリンクラウド向けに認証機関を上書きします（Azure Government なら `https://login.microsoftonline.us` など）。[Azure Foundry ガイド](/hermes/docs/guides/azure-foundry/#sovereign-clouds-government-china) を参照してください |
| `IDENTITY_ENDPOINT` / `MSI_ENDPOINT` | App Service、Functions、Container Apps 向けのマネージド ID のエンドポイントです。VM では通常こちらではなく IMDS を使うため、これらは設定しません |
| `HF_TOKEN` | Inference Providers 向けの Hugging Face トークン（[huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)） |
| `HF_BASE_URL` | Hugging Face のベース URL を上書きします（既定値: `https://router.huggingface.co/v1`） |
| `GOOGLE_API_KEY` | Google AI Studio の API キー（[aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)） |
| `GEMINI_API_KEY` | `GOOGLE_API_KEY` の別名です |
| `GEMINI_BASE_URL` | Google AI Studio のベース URL を上書きします |
| `VERTEX_CREDENTIALS_PATH` | Vertex AI（Gemini）用の Google Cloud サービスアカウント JSON のパスです。Vertex は静的な API キーではなく OAuth2 を使います。指定がなければ `GOOGLE_APPLICATION_CREDENTIALS`、それもなければ ADC（`gcloud auth application-default login`）が使われます。プロジェクトとリージョンは `config.yaml` の `vertex:` の下に書きます |
| `ANTHROPIC_API_KEY` | Anthropic Console の API キー（[console.anthropic.com](https://console.anthropic.com/)） |
| `ANTHROPIC_BASE_URL` | Anthropic API のベース URL を上書きします |
| `ANTHROPIC_TOKEN` | Anthropic の OAuth / セットアップトークンを手動または従来方式で上書きします |
| `DASHSCOPE_API_KEY` | Qwen のモデルを使うための Qwen Cloud（Alibaba DashScope）の API キー（[modelstudio.console.alibabacloud.com](https://modelstudio.console.alibabacloud.com/)） |
| `DASHSCOPE_BASE_URL` | DashScope のベース URL を独自に指定します（既定値: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`。中国本土のリージョンでは `https://dashscope.aliyuncs.com/compatible-mode/v1` を使います） |
| `ALIBABA_CODING_PLAN_API_KEY` | Qwen Coding Plan の API キー（`alibaba-coding-plan` プロバイダー） |
| `ALIBABA_CODING_PLAN_BASE_URL` | Qwen Coding Plan のベース URL を上書きします |
| `DEEPSEEK_API_KEY` | DeepSeek に直接つなぐための DeepSeek の API キー（[platform.deepseek.com](https://platform.deepseek.com/api_keys)） |
| `DEEPSEEK_BASE_URL` | DeepSeek API のベース URL を独自に指定します |
| `DEEPINFRA_API_KEY` | DeepInfra の API キー（[deepinfra.com](https://deepinfra.com/dash/api_keys)） |
| `DEEPINFRA_BASE_URL` | DeepInfra のベース URL を上書きします |
| `NOVITA_API_KEY` | NovitaAI の API キー — Model API、Agent Sandbox、GPU Cloud を提供する AI 前提のクラウドです（[novita.ai/settings/key-management](https://novita.ai/settings/key-management)） |
| `NOVITA_BASE_URL` | NovitaAI のベース URL を上書きします（既定値: `https://api.novita.ai/openai/v1`） |
| `NVIDIA_API_KEY` | NVIDIA NIM の API キー — Nemotron とオープンなモデル向けです（[build.nvidia.com](https://build.nvidia.com)） |
| `NVIDIA_BASE_URL` | NVIDIA のベース URL を上書きします（既定値: `https://integrate.api.nvidia.com/v1`。ローカルの NIM エンドポイントを使うときは `http://localhost:8000/v1` にします） |
| `STEPFUN_API_KEY` | StepFun の API キー — Step シリーズのモデル向けです（[platform.stepfun.com](https://platform.stepfun.com)） |
| `STEPFUN_BASE_URL` | StepFun のベース URL を上書きします（既定値: `https://api.stepfun.com/v1`） |
| `OLLAMA_API_KEY` | Ollama Cloud の API キー — ローカルの GPU なしで Ollama のカタログを使えます（[ollama.com/settings/keys](https://ollama.com/settings/keys)） |
| `OLLAMA_BASE_URL` | Ollama Cloud のベース URL を上書きします（既定値: `https://ollama.com/v1`） |
| `XAI_API_KEY` | xAI（Grok）の API キー。チャット、TTS、ウェブ検索で使います（[console.x.ai](https://console.x.ai/)） |
| `XAI_BASE_URL` | xAI のベース URL を上書きします（既定値: `https://api.x.ai/v1`） |
| `MISTRAL_API_KEY` | Voxtral の TTS と STT で使う Mistral の API キー（[console.mistral.ai](https://console.mistral.ai)） |
| `AWS_REGION` | Bedrock で推論するときの AWS リージョン（`us-east-1`、`eu-central-1` など）。boto3 が読み取ります。 |
| `AWS_PROFILE` | Bedrock の認証に使う AWS の名前付きプロファイル（`~/.aws/credentials` を読みます）。設定しなければ boto3 の既定の資格情報チェーンが使われます。 |
| `BEDROCK_BASE_URL` | Bedrock ランタイムのベース URL を上書きします（既定値: `https://bedrock-runtime.us-east-1.amazonaws.com`。通常は設定せず `AWS_REGION` を使ってください） |
| `HERMES_QWEN_BASE_URL` | Qwen Portal のベース URL を上書きします（既定値: `https://portal.qwen.ai/v1`） |
| `OPENCODE_ZEN_API_KEY` | OpenCode Zen の API キー — 厳選されたモデルを従量課金で使えます（[opencode.ai](https://opencode.ai/auth)） |
| `OPENCODE_ZEN_BASE_URL` | OpenCode Zen のベース URL を上書きします |
| `OPENCODE_GO_API_KEY` | OpenCode Go の API キー — 月額 10 ドルでオープンなモデルを使えます（[opencode.ai](https://opencode.ai/auth)） |
| `OPENCODE_GO_BASE_URL` | OpenCode Go のベース URL を上書きします |
| `CLAUDE_CODE_OAUTH_TOKEN` | 自分で書き出したトークンがある場合に、Claude Code のトークンを明示的に上書きします |
| `HERMES_MODEL` | プロセス単位でモデル名を上書きします（cron のスケジューラーが使います。普段は `config.yaml` を使ってください） |
| `VOICE_TOOLS_OPENAI_KEY` | OpenAI の音声認識・音声合成のプロバイダーで優先して使われる OpenAI のキーです |
| `HERMES_LOCAL_STT_COMMAND` | ローカルで音声認識をするコマンドのテンプレートです（任意）。`{input_path}`、`{output_dir}`、`{language}`、`{model}` のプレースホルダーが使えます |
| `HERMES_LOCAL_STT_LANGUAGE` | 音声認識の言語の既定のヒントです。`config.yaml` でプロバイダーごとの `language` が指定されていないとき、`local`（faster-whisper）プロバイダー、`HERMES_LOCAL_STT_COMMAND`、ローカルの `whisper` CLI へのフォールバック（既定値: `en`）、Groq、xAI が使います |
| `HERMES_HOME` | Hermes の設定ディレクトリを上書きします（既定値: `~/.hermes`）。ゲートウェイの PID ファイルと systemd のサービス名もこれに合わせて切り替わるので、複数のインストールを同時に動かせます |
| `HERMES_GIT_BASH_PATH` | **Windows 専用。** ターミナルツールが探す `bash.exe` を上書きします。Git for Windows の完全なインストール、シンボリックリンク経由の WSL の bash、MSYS2、Cygwin など、どの bash でも指定できます。インストーラーは自分で用意した PortableGit を自動的にここに設定します。[Windows（ネイティブ）ガイド](/hermes/docs/user-guide/windows-native/#how-hermes-runs-shell-commands-on-windows) を参照してください |
| `HERMES_DISABLE_WINDOWS_UTF8` | **Windows 専用。** `1` にすると UTF-8 の stdio シム（`configure_windows_stdio()`）を無効にして、コンソールのロケールのコードページに戻します。文字コード関連の不具合を切り分けるときに便利ですが、普段の運用で必要になることはまずありません |
| `HERMES_KANBAN_HOME` | かんばんボード（DB、ワークスペース、ワーカーのログ）の置き場所となる、共有の Hermes ルートを上書きします。指定がなければ `get_default_hermes_root()`（動作中のプロファイルの親）が使われます。テストや特殊な構成のときに便利です |
| `HERMES_KANBAN_BOARD` | このプロセスで使うかんばんボードを固定します。`~/.hermes/kanban/current` より優先されます。ディスパッチャーはこれをワーカーの子プロセスの環境に渡すので、ワーカーは他のボードのタスクを物理的に見られません。既定値は `default` です。スラッグの検証条件は、小文字の英数字とハイフンとアンダースコアで 1〜64 文字です |
| `HERMES_KANBAN_DB` | かんばんのデータベースファイルのパスを直接固定します（最優先で、`HERMES_KANBAN_BOARD` と `HERMES_KANBAN_HOME` より強く効きます）。ディスパッチャーはこれをワーカーの子プロセスの環境に渡すので、プロファイルのワーカーはディスパッチャーと同じボードに揃います |
| `HERMES_KANBAN_WORKSPACES_ROOT` | かんばんのワークスペースのルートを直接固定します（ワークスペースについては最優先で、`HERMES_KANBAN_HOME` より強く効きます）。ディスパッチャーはこれをワーカーの子プロセスの環境に渡します |
| `HERMES_KANBAN_DISPATCH_IN_GATEWAY` | `kanban.dispatch_in_gateway` を実行時に上書きします。`0`、`false`、`no`、`off` のいずれかにすると、ゲートウェイは組み込みのかんばんディスパッチャーを起動しなくなります。空でない他の値なら有効になります。別のディスパッチャープロセスがボードを受け持っているときに便利です。 |

## プロバイダーの認証（OAuth） {#provider-auth-oauth}

Anthropic のネイティブな認証では、Claude Code 自身の資格情報ファイルがあれば Hermes はそちらを優先します。これらの資格情報は自動で更新できるからです。**Anthropic に対する OAuth には、追加利用クレジットを購入した Claude Max プランが必要です** — Hermes は Claude Code として通信し、Max プランの基本枠ではなく追加分・超過分のクレジットだけを消費します。Claude Pro では使えません。Max と追加クレジットがない場合は API キーを使ってください。`ANTHROPIC_TOKEN` のような環境変数は手動で上書きする手段としては引き続き有用ですが、Claude Max でログインする際に推奨される方法ではなくなりました。

| 変数 | 説明 |
|----------|-------------|
| `HERMES_PORTAL_BASE_URL` | Nous Portal の URL を上書きします（開発・検証用） |
| `NOUS_INFERENCE_BASE_URL` | Nous の推論 API の URL を上書きします |
| `HERMES_NOUS_MIN_KEY_TTL_SECONDS` | エージェントキーを再発行するまでの最小 TTL です（既定値: 1800 = 30 分） |
| `HERMES_NOUS_TIMEOUT_SECONDS` | Nous の資格情報・トークンのやり取りにおける HTTP のタイムアウトです |
| `HERMES_DUMP_REQUESTS` | API リクエストの中身をログファイルに書き出します（`true`/`false`） |
| `HERMES_PREFILL_MESSAGES_FILE` | API 呼び出し時に差し込む一時的なプリフィルメッセージを収めた JSON ファイルのパスです |
| `HERMES_TIMEZONE` | IANA のタイムゾーンを上書きします（たとえば `America/New_York`） |

## ツールの API {#tool-apis}

| 変数 | 説明 |
|----------|-------------|
| `PARALLEL_API_KEY` | AI 前提のウェブ検索です（[parallel.ai](https://parallel.ai/)） |
| `FIRECRAWL_API_KEY` | ウェブのスクレイピングとクラウドのブラウザーです（[firecrawl.dev](https://firecrawl.dev/)） |
| `FIRECRAWL_API_URL` | 自前でホストしている場合に使う Firecrawl API のエンドポイントです（任意） |
| `TAVILY_API_KEY` | 検索・抽出の上限を引き上げるための Tavily の API キーです（任意）。ウェブのバックエンドとして Tavily を選んだあとは、キーなしでも利用できます（[app.tavily.com](https://app.tavily.com/home)、[キーなし利用の説明](https://docs.tavily.com/documentation/keyless)） |
| `SEARXNG_URL` | 自前でホストする無料のウェブ検索に使う SearXNG インスタンスの URL です。API キーは要りません（[searxng.github.io](https://searxng.github.io/searxng/)） |
| `TAVILY_BASE_URL` | Tavily API のエンドポイントを上書きします。社内プロキシや、自前でホストした Tavily 互換の検索バックエンドを使うときに便利です。`GROQ_BASE_URL` と同じ考え方です。 |
| `EXA_API_KEY` | AI 前提のウェブ検索と本文取得に使う Exa の API キーです（[exa.ai](https://exa.ai/)） |
| `BRAVE_SEARCH_API_KEY` | ウェブ検索に使う Brave Search API のサブスクリプショントークンです（無料枠があります）（[brave.com/search/api](https://brave.com/search/api/)） |
| `BROWSERBASE_API_KEY` | ブラウザーの自動操作です（[browserbase.com](https://browserbase.com/)） |
| `BROWSERBASE_PROJECT_ID` | Browserbase のプロジェクト ID です |
| `BROWSER_USE_API_KEY` | Browser Use のクラウドブラウザーの API キーです（[browser-use.com](https://browser-use.com/)） |
| `FIRECRAWL_BROWSER_TTL` | Firecrawl のブラウザーセッションの TTL を秒で指定します（既定値: 300） |
| `BROWSER_CDP_URL` | ローカルのブラウザー向けの Chrome DevTools Protocol の URL です（`/browser connect` で設定します。たとえば `ws://localhost:9222`） |
| `CAMOFOX_URL` | 検出回避用のローカルブラウザーサーバー Camofox のアドレスです（既定値: `http://localhost:9377`）。アドレスを指定するだけで、バックエンドが Camofox に切り替わるわけではありません。切り替えは `hermes tools` で Camofox を選びます（`browser.cloud_provider: camofox`） |
| `CAMOFOX_API_KEY` | リモートや認証ありの Camofox サーバーへ Authorization ヘッダーとして送るベアラートークンです（任意） |
| `CAMOFOX_USER_ID` | 画面を共有するセッション向けに、外部で管理している Camofox のユーザー ID です（任意） |
| `CAMOFOX_SESSION_KEY` | `CAMOFOX_USER_ID` のタブを作るときに使う Camofox のセッションキーです（任意） |
| `CAMOFOX_ADOPT_EXISTING_TAB` | `true` にすると、新しいタブを作る前に既存の Camofox のタブを再利用します |
| `BROWSER_INACTIVITY_TIMEOUT` | ブラウザーのセッションが無操作のまま終了するまでの秒数です |
| `AGENT_BROWSER_ARGS` | Chromium を起動するときの追加フラグです（カンマ区切りまたは改行区切り）。root で動かしている場合や、AppArmor で制限された非特権のユーザー名前空間（Ubuntu 23.10 以降、DGX Spark、多くのコンテナーイメージ）では、Hermes が `--no-sandbox,--disable-dev-shm-usage` を自動で付けます。この変数は、それを上書きしたい場合や他のフラグを足したい場合にだけ手で設定してください。 |
| `AGENT_BROWSER_ENGINE` | ローカルモードで使うブラウザーエンジンです。`auto`（既定値 — CDP 経由で Chromium 系）か、特定のエンジンを指定して上書きします。 |
| `FAL_KEY` | 画像生成です（[fal.ai](https://fal.ai/)） |
| `KREA_API_KEY` | Krea 2 での画像生成に使う Krea の API キーです（[krea.ai](https://krea.ai/)） |
| `GROQ_API_KEY` | Groq Whisper の音声認識の API キーです（[groq.com](https://groq.com/)） |
| `ELEVENLABS_API_KEY` | ElevenLabs の高品質な音声合成のボイスです（[elevenlabs.io](https://elevenlabs.io/)） |
| `PORCUPINE_ACCESS_KEY` | Picovoice Porcupine のウェイクワードエンジンです（[console.picovoice.ai](https://console.picovoice.ai/)） — `wake_word.provider: porcupine` のときだけ必要です。既定の openWakeWord と sherpa のエンジンにはキーが要りません |
| `STT_GROQ_MODEL` | Groq の音声認識モデルを上書きします（既定値: `whisper-large-v3-turbo`） |
| `GROQ_BASE_URL` | Groq の OpenAI 互換の音声認識エンドポイントを上書きします |
| `STT_OPENAI_MODEL` | OpenAI の音声認識モデルを上書きします（既定値: `whisper-1`） |
| `STT_OPENAI_BASE_URL` | OpenAI 互換の音声認識エンドポイントを上書きします |
| `GITHUB_TOKEN` | Skills Hub 用の GitHub トークンです（API のレート上限が上がり、スキルを公開できます） |
| `HONCHO_API_KEY` | セッションをまたいだ利用者のモデリングです（[honcho.dev](https://honcho.dev/)） |
| `HONCHO_BASE_URL` | 自前でホストした Honcho インスタンスのベース URL です（既定値: Honcho のクラウド）。ローカルのインスタンスなら API キーは要りません |
| `HINDSIGHT_API_KEY` | グラフを踏まえた永続的な記憶に使う Hindsight の API キーです（[hindsight.vectorize.io](https://hindsight.vectorize.io)） |
| `HINDSIGHT_API_URL` | Hindsight API のベース URL です（既定値: `https://api.hindsight.vectorize.io`） |
| `HINDSIGHT_TIMEOUT` | Hindsight の記憶プロバイダーへの API 呼び出しのタイムアウトを秒で指定します（既定値: `60`）。`/sync` や `on_session_switch` のときに Hindsight インスタンスの応答が遅く、`errors.log` にタイムアウトが出るなら、この値を上げてください。 |
| `MEM0_API_KEY` | 意味を踏まえた永続的な記憶に使う Mem0 Platform の API キーです（[app.mem0.ai](https://app.mem0.ai)） |
| `MEM0_MODE` | Mem0 のバックエンドのモードです。`platform`（既定値）か `oss` を指定します — [記憶のプロバイダー](/hermes/docs/user-guide/features/memory-providers/) を参照してください |
| `MEM0_HOST` | 自前でホストした Mem0 サーバーのベース URL です（これを設定すると、プラグインは Platform API を使わなくなります） |
| `MEM0_USER_ID` | Mem0 の記憶を保存するときのユーザー ID を上書きします |
| `MEM0_AGENT_ID` | Mem0 の記憶に付けるエージェント ID を上書きします |
| `RETAINDB_API_KEY` | 永続的な記憶に使う RetainDB の API キーです（[retaindb.com](https://retaindb.com)） |
| `RETAINDB_BASE_URL` | 自前でホストした RetainDB インスタンスのベース URL です（既定値: `https://api.retaindb.com`） |
| `OPENVIKING_API_KEY` | OpenViking の API キーです（ローカルの開発モードでは空のままにします） |
| `OPENVIKING_ENDPOINT` | OpenViking サーバーの URL です（既定値: `http://127.0.0.1:1933`） |
| `BRV_API_KEY` | ByteRover の API キーです（任意。クラウドと同期する場合に使います。既定ではローカル優先です）（[app.byterover.dev](https://app.byterover.dev)） |
| `SUPERMEMORY_API_KEY` | プロフィールの呼び出しとセッションの取り込みができる、意味を踏まえた長期記憶です（[supermemory.ai](https://supermemory.ai)） |
| `DAYTONA_API_KEY` | Daytona のクラウドサンドボックスです（[daytona.io](https://daytona.io/)） |
| `VERCEL_TOKEN` | Vercel Sandbox のアクセストークンです（[vercel.com](https://vercel.com/)） |
| `VERCEL_PROJECT_ID` | Vercel のプロジェクト ID です（`VERCEL_TOKEN` と一緒に必要です） |
| `VERCEL_TEAM_ID` | Vercel のチーム ID です（`VERCEL_TOKEN` と一緒に必要です） |
| `VERCEL_OIDC_TOKEN` | Vercel の短命な OIDC トークンです（開発時にだけ使える代替手段です） |

### スキルの API キー {#skill-api-keys}

特定の同梱スキルや追加スキルが使う秘密情報です。それぞれ、対応するスキルを使うときにだけ必要になります。

| 変数 | 使うスキル | 説明 |
|----------|---------------|-------------|
| `NOTION_API_KEY` | `notion` | Notion のインテグレーショントークンです。 |
| `LINEAR_API_KEY` | `linear` | Linear の個人用 API キーです。 |
| `AIRTABLE_API_KEY` | `airtable` | Airtable の個人用アクセストークンです。 |
| `TENOR_API_KEY` | `gif-search` | GIF を検索するための Tenor の API キーです。 |

### Langfuse による可観測性 {#langfuse-observability}

同梱の [`observability/langfuse`](/hermes/docs/user-guide/features/built-in-plugins/#observabilitylangfuse) プラグイン向けの環境変数です。`~/.hermes/.env` に設定してください。これらが効くようにするには、プラグインを有効にしておく必要もあります（`hermes plugins enable observability/langfuse` を実行するか、`hermes plugins` の画面でチェックを入れます）。

| 変数 | 説明 |
|----------|-------------|
| `HERMES_LANGFUSE_PUBLIC_KEY` | Langfuse プロジェクトの公開キーです（`pk-lf-...`）。必須です。 |
| `HERMES_LANGFUSE_SECRET_KEY` | Langfuse プロジェクトのシークレットキーです（`sk-lf-...`）。必須です。 |
| `HERMES_LANGFUSE_BASE_URL` | Langfuse サーバーの URL です（既定値: `https://cloud.langfuse.com`）。自前でホストする場合に設定します。 |
| `HERMES_LANGFUSE_ENV` | トレースに付ける環境のタグです（`production`、`staging` など） |
| `HERMES_LANGFUSE_RELEASE` | トレースに付けるリリース・バージョンのタグです |
| `HERMES_LANGFUSE_SAMPLE_RATE` | SDK のサンプリング率です。0.0〜1.0 で指定します（既定値: `1.0`） |
| `HERMES_LANGFUSE_MAX_CHARS` | シリアライズしたペイロードを項目ごとに切り詰める長さです（既定値: `12000`） |
| `HERMES_LANGFUSE_DEBUG` | `true` にすると、プラグインの詳細なログを `agent.log` に出します |
| `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` / `LANGFUSE_BASE_URL` | Langfuse SDK の標準的な名前です。対応する `HERMES_LANGFUSE_*` が設定されていないときに、代わりに使われます。 |

### Nous Tool Gateway {#nous-tool-gateway}

これらの変数は、Nous の有料プランの利用者や、自前でゲートウェイをホストする場合に [Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/) を設定するためのものです。ほとんどの利用者は設定する必要がありません。ゲートウェイは `hermes model` や `hermes tools` から自動で設定されます。

| 変数 | 説明 |
|----------|-------------|
| `TOOL_GATEWAY_DOMAIN` | Tool Gateway のルーティングのベースとなるドメインです（既定値: `nousresearch.com`） |
| `TOOL_GATEWAY_SCHEME` | ゲートウェイの URL に使うスキームです。HTTP か HTTPS を指定します（既定値: `https`） |
| `TOOL_GATEWAY_USER_TOKEN` | Tool Gateway の認証トークンです（通常は Nous の認証から自動で入ります） |
| `FIRECRAWL_GATEWAY_URL` | Firecrawl のゲートウェイのエンドポイントだけを個別に上書きする URL です |

## ターミナルのバックエンド {#terminal-backend}

| 変数 | 説明 |
|----------|-------------|
| `TERMINAL_ENV` | バックエンドを指定します。`local`、`docker`、`ssh`、`singularity`、`modal`、`daytona`、`vercel_sandbox` から選びます |
| `HERMES_DOCKER_BINARY` | Hermes が呼び出すコンテナーのバイナリを上書きします（`podman`、`/usr/local/bin/docker` など）。設定しなければ、Hermes が `PATH` から `docker` か `podman` を自動で見つけます。両方が入っていて既定ではないほうを使いたいときや、バイナリが `PATH` の外にあるときに必要です。 |
| `TERMINAL_DOCKER_IMAGE` | Docker のイメージです（既定値: `nikolaik/python-nodejs:python3.11-nodejs20`） |
| `TERMINAL_DOCKER_FORWARD_ENV` | Docker のターミナルセッションへ明示的に渡す環境変数名の JSON 配列です。なお、スキルが宣言している `required_environment_variables` は自動で渡されるので、どのスキルも宣言していない変数のときだけ設定してください。 |
| `TERMINAL_DOCKER_VOLUMES` | Docker のボリュームマウントを追加します（`host:container` の組をカンマ区切りで指定します） |
| `TERMINAL_DOCKER_ENV` | Docker のターミナルセッション内で設定する追加の環境変数の JSON オブジェクトです（たとえば `{"FOO":"bar"}`） |
| `TERMINAL_DOCKER_EXTRA_ARGS` | `docker run` に追加する引数の JSON 配列です（たとえば `["--memory","4g"]`） |
| `TERMINAL_DOCKER_MOUNT_CWD_TO_WORKSPACE` | 上級者向けの任意設定です。起動時のカレントディレクトリを Docker の `/workspace` にマウントします（`true`/`false`、既定値: `false`） |
| `TERMINAL_SINGULARITY_IMAGE` | Singularity のイメージ、または `.sif` のパスです |
| `TERMINAL_MODAL_IMAGE` | Modal のコンテナーイメージです |
| `TERMINAL_DAYTONA_IMAGE` | Daytona のサンドボックスイメージです |
| `TERMINAL_VERCEL_RUNTIME` | Vercel Sandbox のランタイムです（`node24`、`node22`、`python3.13`） |
| `TERMINAL_TIMEOUT` | コマンドのタイムアウトを秒で指定します |
| `TERMINAL_LIFETIME_SECONDS` | ターミナルセッションの最大の寿命を秒で指定します |
| `TERMINAL_CWD` | ゲートウェイや cron のターミナルセッション向けの直接的な上書きで、非推奨です。`config.yaml` の `terminal.cwd` を使ってください。CLI は引き続き起動時のディレクトリを使います。 |
| `SUDO_PASSWORD` | 対話的な入力を求めずに sudo を使えるようにします |

クラウドのサンドボックスをバックエンドにする場合、状態の保持はファイルシステムが中心になります。`TERMINAL_LIFETIME_SECONDS` は、使われていないターミナルセッションを Hermes が片付けるタイミングを決めます。あとで再開したときは、動いていたプロセスがそのまま残っているのではなく、サンドボックスが作り直されることがあります。

## SSH のバックエンド {#ssh-backend}

| 変数 | 説明 |
|----------|-------------|
| `TERMINAL_SSH_HOST` | 接続先サーバーのホスト名です |
| `TERMINAL_SSH_USER` | SSH のユーザー名です |
| `TERMINAL_SSH_PORT` | SSH のポートです（既定値: 22） |
| `TERMINAL_SSH_KEY` | 秘密鍵のパスです |
| `TERMINAL_SSH_PERSISTENT` | SSH での常駐シェルの設定を上書きします（既定では `TERMINAL_PERSISTENT_SHELL` に従います） |

## コンテナーのリソース（Docker、Singularity、Modal、Daytona） {#container-resources-docker-singularity-modal-daytona}

| 変数 | 説明 |
|----------|-------------|
| `TERMINAL_CONTAINER_CPU` | CPU のコア数です（既定値: 1） |
| `TERMINAL_CONTAINER_MEMORY` | メモリーを MB で指定します（既定値: 5120） |
| `TERMINAL_CONTAINER_DISK` | ディスクを MB で指定します（既定値: 51200） |
| `TERMINAL_CONTAINER_PERSISTENT` | コンテナーのファイルシステムをセッションをまたいで保持します（既定値: `true`） |
| `TERMINAL_SANDBOX_DIR` | ワークスペースとオーバーレイを置くホスト側のディレクトリです（既定値: `~/.hermes/sandboxes/`） |

## 常駐シェル {#persistent-shell}

| 変数 | 説明 |
|----------|-------------|
| `TERMINAL_PERSISTENT_SHELL` | ローカル以外のバックエンドで常駐シェルを有効にします（既定値: `true`）。config.yaml の `terminal.persistent_shell` でも設定できます |
| `TERMINAL_LOCAL_PERSISTENT` | ローカルのバックエンドで常駐シェルを有効にします（既定値: `false`） |
| `TERMINAL_SSH_PERSISTENT` | SSH のバックエンドでの常駐シェルの設定を上書きします（既定では `TERMINAL_PERSISTENT_SHELL` に従います） |

## 送信プロキシ（サンドボックスに注入されます） {#egress-proxy-sandbox-injected}

これらの環境変数はホスト側には設定されません。`proxy.enabled: true` のときに [送信プロキシ](/hermes/docs/user-guide/egress/iron-proxy/) の連携機能が Docker のサンドボックスへ注入します。今回のリリースで対応しているバックエンドは Docker だけです。

| 変数 | 説明 |
|----------|-------------|
| `HERMES_EGRESS_PROXY` | 送信プロキシが動いているとき、サンドボックスの中で `1` になります。エージェント側のコードは、これを見れば TLS を仲介するプロキシの後ろで動いていると判断できます。 |
| プロバイダーの環境変数（`OPENROUTER_API_KEY`、`OPENAI_API_KEY` など） | 実際の上流の秘密情報ではなく、中身のわからないプロキシ用トークンが設定されます。そのため既存の SDK は標準的な環境変数名をそのまま読み続けられます。iron-proxy がネットワークの境界でそのトークンを本物の秘密情報に差し替えます。 |
| `HERMES_PROXY_TOKEN_<ENV_NAME>` | 発行されたプロバイダーごとの対応づけを確認するための別名です。たとえば `HERMES_PROXY_TOKEN_OPENROUTER_API_KEY=hermes-proxy-openrouter-…` のようになります。トークンの値は標準のプロバイダー環境変数と同じです。 |
| `HTTPS_PROXY` / `HTTP_PROXY` | `HTTPS_PROXY` は CONNECT / 中間者方式のために `http://host.docker.internal:<tunnel_port>` を指します。`HTTP_PROXY` は平文 HTTP の転送のために `<tunnel_port + 1>` を指します。 |
| `NO_PROXY` | `127.0.0.1,localhost,::1` が設定され、サンドボックス内のループバックの開発サーバーはプロキシを通りません。 |
| `REQUESTS_CA_BUNDLE` / `SSL_CERT_FILE` / `CURL_CA_BUNDLE` / `NODE_EXTRA_CA_CERTS` | サンドボックス内にマウントされた Hermes の送信用 CA 証明書のパスです（`/etc/ssl/certs/hermes-egress-ca.crt`）。これにより各言語のランタイムが、iron-proxy が中間者として発行するリーフ証明書を信頼できます。 |
| `NODE_OPTIONS` | `--use-openssl-ca` が追記されます（すでに指定しているフラグは残ります）。これで Node.js も、他の CA バンドルの変数が制御する OpenSSL のストアを通るようになります。[Node.js の CA の扱いが非対称な点](/hermes/docs/user-guide/egress/iron-proxy/#nodejs-asymmetric-ca-caveat) の影響を小さくできます。 |
| `HERMES_IRON_PROXY_NONCE` | iron-proxy のデーモンのプロセス自体に設定されます（サンドボックスの中ではありません）。PID が使い回されても、候補の PID が*こちらが管理しているバイナリ*を指していることを `_pid_alive` が確認するために使います。 |

これらは `proxy.enabled: true` かつデーモンが動いているときに、Docker のターミナルバックエンドが自動で設定します。自分で設定するものではありません。運用者が触るつまみは `~/.hermes/config.yaml` の `proxy:` セクションにあります — [送信プロキシ → 設定](/hermes/docs/user-guide/egress/iron-proxy/#configuration) を参照してください。

## メッセージング {#messaging}

| 変数 | 説明 |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Telegram のボットトークンです（@BotFather から取得します） |
| `TELEGRAM_ALLOWED_USERS` | ボットを使える利用者 ID をカンマ区切りで指定します（DM、グループ、フォーラムのすべてに適用されます） |
| `TELEGRAM_ALLOW_ALL_USERS` | どの Telegram 利用者でもボットを動かせるようにします（開発時のみ）。 |
| `TELEGRAM_GROUP_ALLOWED_USERS` | グループやフォーラムでのみ許可する送信者の利用者 ID をカンマ区切りで指定します（DM の利用は許可しません）。チャット ID の形（`-` で始まるもの）の値も、#17686 以前の設定との互換のためチャット ID として引き続き受け付けますが、非推奨の警告が出ます。 |
| `TELEGRAM_GROUP_ALLOWED_CHATS` | グループやフォーラムのチャット ID をカンマ区切りで指定します。そのメンバーなら誰でも許可されます |
| `TELEGRAM_HOME_CHANNEL` | cron の配信先となる既定の Telegram のチャットまたはチャンネルです |
| `TELEGRAM_HOME_CHANNEL_NAME` | Telegram のホームチャンネルの表示名です |
| `TELEGRAM_CRON_THREAD_ID` | cron の配信を受け取るフォーラムのトピック ID です。cron に限り `TELEGRAM_HOME_CHANNEL_THREAD_ID` より優先されます。トピックモードで使うと、cron のメッセージへの返信がシステムのロビーではなく新しいセッションを開くようになります（#24409）。 |
| `TELEGRAM_WEBHOOK_URL` | webhook モードで使う公開 HTTPS の URL です（設定するとポーリングではなく webhook が有効になります） |
| `TELEGRAM_WEBHOOK_PORT` | webhook サーバーがローカルで待ち受けるポートです（既定値: `8443`） |
| `TELEGRAM_WEBHOOK_SECRET` | 検証のために Telegram が各更新に返してくる秘密トークンです。**`TELEGRAM_WEBHOOK_URL` を設定した場合は必須です** — これがないとゲートウェイは起動しません（GHSA-3vpc-7q5r-276h）。`openssl rand -hex 32` で生成してください。 |
| `TELEGRAM_REACTIONS` | 処理中のメッセージに絵文字のリアクションを付けます（既定値: `false`） |
| `TELEGRAM_REQUIRE_MENTION` | Telegram のグループで返答する前に、明示的なきっかけを必須にします。`config.yaml` の `telegram.require_mention` と同じ働きです。 |
| `TELEGRAM_MENTION_PATTERNS` | Telegram のグループでメンションによる制御を有効にしたときに受け付ける、ウェイクワードの正規表現です。JSON 配列、改行区切り、カンマ区切りのいずれかで指定します。`telegram.mention_patterns` と同じ働きです。 |
| `TELEGRAM_EXCLUSIVE_BOT_MENTIONS` | 有効にすると、Telegram のグループでの明示的な `@...bot` のメンションは、返信やウェイクワードによる判定に進む前に、メンションされたボットのユーザー名だけへ振り分けられます。既定値は `true` です。`telegram.exclusive_bot_mentions` と同じ働きです。 |
| `TELEGRAM_REPLY_TO_MODE` | 返信の引用の付き方です。`off`、`first`（既定値）、`all` から選びます。Discord と同じ方式です。 |
| `TELEGRAM_IGNORED_THREADS` | ボットが決して返答しない Telegram のフォーラムのトピック・スレッド ID をカンマ区切りで指定します |
| `TELEGRAM_PROXY` | Telegram への接続に使うプロキシの URL です。`HTTPS_PROXY` より優先されます。`http://`、`https://`、`socks5://` に対応します |
| `DISCORD_BOT_TOKEN` | Discord のボットトークンです |
| `DISCORD_ALLOWED_USERS` | ボットを使える Discord の利用者 ID をカンマ区切りで指定します |
| `DISCORD_ALLOW_ALL_USERS` | どの Discord 利用者でもボットを動かせるようにします（開発時のみ）。 |
| `DISCORD_ALLOWED_ROLES` | ボットを使える Discord のロール ID をカンマ区切りで指定します（`DISCORD_ALLOWED_USERS` との OR 条件になります）。Members intent が自動で有効になります。運営チームの入れ替わりが多いときに便利で、ロールを付けるだけで自動的に権限が行き渡ります。 |
| `DISCORD_ALLOWED_CHANNELS` | Discord のチャンネル ID をカンマ区切りで指定します。設定すると、ボットはこれらのチャンネル（および許可されていれば DM）でのみ返答します。`config.yaml` の `discord.allowed_channels` より優先されます。 |
| `DISCORD_PROXY` | Discord への接続に使うプロキシの URL です。`HTTPS_PROXY` より優先されます。`http://`、`https://`、`socks5://` に対応します |
| `DISCORD_HOME_CHANNEL` | cron の配信先となる既定の Discord のチャンネルです |
| `DISCORD_HOME_CHANNEL_NAME` | Discord のホームチャンネルの表示名です |
| `DISCORD_COMMAND_SYNC_POLICY` | 起動時に Discord のスラッシュコマンドを同期する方針です。`safe`（差分を取って調整）、`bulk`（従来の `tree.sync()`）、`off` から選びます |
| `DISCORD_REQUIRE_MENTION` | サーバーのチャンネルで返答する前に @メンションを必須にします |
| `DISCORD_FREE_RESPONSE_CHANNELS` | メンションが不要なチャンネル ID をカンマ区切りで指定します |
| `DISCORD_AUTO_THREAD` | 対応している場合に、長い返信を自動でスレッドにします |
| `DISCORD_ALLOW_ANY_ATTACHMENT` | `true` にすると、どんな種類のファイルの添付でも受け付けます（組み込みの PDF / テキスト / zip / Office の許可リストに限りません）。未知の種類のファイルはキャッシュされ、ローカルのパスとしてエージェントに渡されるので、`terminal` / `read_file` / `ffprobe` で中身を調べられます。既定値は `false` です。 |
| `DISCORD_MAX_ATTACHMENT_BYTES` | ゲートウェイがキャッシュする添付ファイル 1 件あたりの最大バイト数です。既定値は `33554432`（32 MiB）です。`0` にすると上限がなくなります（書き込み中の添付ファイルはメモリー上に保持されます）。 |
| `DISCORD_REACTIONS` | 処理中のメッセージに絵文字のリアクションを付けます（既定値: `true`） |
| `DISCORD_IGNORED_CHANNELS` | ボットが決して返答しないチャンネル ID をカンマ区切りで指定します |
| `DISCORD_NO_THREAD_CHANNELS` | ボットが自動スレッド化せずに返答するチャンネル ID をカンマ区切りで指定します |
| `DISCORD_REPLY_TO_MODE` | 返信の引用の付き方です。`off`、`first`（既定値）、`all` から選びます |
| `DISCORD_ALLOW_MENTION_EVERYONE` | ボットが `@everyone` / `@here` で通知できるようにします（既定値: `false`）。[メンションの制御](/hermes/docs/user-guide/messaging/discord/#mention-control) を参照してください。 |
| `DISCORD_ALLOW_MENTION_ROLES` | ボットが `@role` のメンションで通知できるようにします（既定値: `false`）。 |
| `DISCORD_ALLOW_MENTION_USERS` | ボットが個々の `@user` のメンションで通知できるようにします（既定値: `true`）。 |
| `DISCORD_ALLOW_MENTION_REPLIED_USER` | メッセージに返信するときに、その投稿者へ通知します（既定値: `true`）。 |
| `SLACK_BOT_TOKEN` | Slack のボットトークンです（`xoxb-...`） |
| `SLACK_APP_TOKEN` | Slack のアプリレベルのトークンです（`xapp-...`。ソケットモードで必要です） |
| `SLACK_ALLOWED_USERS` | Slack の利用者 ID をカンマ区切りで指定します |
| `SLACK_ALLOW_ALL_USERS` | どの Slack 利用者でもボットを動かせるようにします（開発時のみ）。 |
| `SLACK_ALLOW_BOTS` | 他の Slack のボットからのメッセージを受け付ける度合いです。`none`（既定値）、`mentions`、`all` から選びます。ボットは自分自身のメッセージは常に無視します。 |
| `SLACK_THREAD_REQUIRE_MENTION` | Slack のスレッドへの返信では明示的な @メンションを必須にしつつ、トップレベルで自由に返答するチャンネルはそのまま保ちます |
| `SLACK_HOME_CHANNEL` | cron の配信先となる既定の Slack のチャンネルです |
| `SLACK_HOME_CHANNEL_NAME` | Slack のホームチャンネルの表示名です |
| `GOOGLE_CHAT_PROJECT_ID` | Pub/Sub のトピックを置いている GCP のプロジェクトです（指定がなければ `GOOGLE_CLOUD_PROJECT` が使われます） |
| `GOOGLE_CHAT_SUBSCRIPTION_NAME` | Pub/Sub のサブスクリプションの完全なパスです（`projects/{proj}/subscriptions/{sub}`。従来の別名: `GOOGLE_CHAT_SUBSCRIPTION`） |
| `GOOGLE_CHAT_SERVICE_ACCOUNT_JSON` | サービスアカウントの JSON のパス、または JSON そのものです（指定がなければ `GOOGLE_APPLICATION_CREDENTIALS` が使われます） |
| `GOOGLE_CHAT_ALLOWED_USERS` | ボットと会話できる利用者のメールアドレスをカンマ区切りで指定します |
| `GOOGLE_CHAT_ALLOW_ALL_USERS` | どの Google Chat 利用者でもボットを動かせるようにします（開発時のみ） |
| `GOOGLE_CHAT_HOME_CHANNEL` | cron の配信先となる既定のスペースです（`spaces/AAAA...` など） |
| `GOOGLE_CHAT_HOME_CHANNEL_NAME` | Google Chat のホームスペースの表示名です |
| `GOOGLE_CHAT_MAX_MESSAGES` | Pub/Sub の FlowControl で同時に処理するメッセージの上限です（既定値: `1`） |
| `GOOGLE_CHAT_MAX_BYTES` | Pub/Sub の FlowControl で同時に処理するバイト数の上限です（既定値: `16777216`、16 MiB） |
| `GOOGLE_CHAT_BOOTSTRAP_SPACES` | ボット自身の `users/{id}` を割り出すために、起動時に追加で問い合わせるスペース ID をカンマ区切りで指定します |
| `GOOGLE_CHAT_DEBUG_RAW` | 何か値を入れると、伏せ字処理した Pub/Sub のエンベロープを DEBUG レベルでログに出します（デバッグ専用です） |
| `GOOGLE_CHAT_HTTP_EVENTS_URL` | Chat のメッセージイベントを受け取る、認証付きの HTTP エンドポイントです（Pub/Sub の代わりに使えます） |
| `GOOGLE_CHAT_HTTP_EVENTS_AUDIENCE` | Google が署名した HTTP イベントのベアラートークンに期待する audience です（既定では `GOOGLE_CHAT_HTTP_EVENTS_URL` が使われます） |
| `GOOGLE_CHAT_HTTP_EVENTS_SERVICE_ACCOUNT_EMAIL` | HTTP イベントのベアラートークンに期待する Google のサービスアカウントのメールアドレスです |
| `WHATSAPP_ENABLED` | WhatsApp のブリッジを有効にします（`true`/`false`） |
| `WHATSAPP_MODE` | `bot`（別の番号を使う）か `self-chat`（自分あてにメッセージを送る）を指定します |
| `WHATSAPP_ALLOWED_USERS` | 電話番号をカンマ区切りで指定します（国番号付き、`+` は付けません）。`*` にするとすべての送信者を許可します |
| `WHATSAPP_ALLOW_ALL_USERS` | 許可リストなしで WhatsApp のすべての送信者を許可します（`true`/`false`） |
| `WHATSAPP_HOME_CHANNEL` | cron や通知の配信先となる既定のチャット ID です。 |
| `WHATSAPP_HOME_CHANNEL_NAME` | WhatsApp のホームチャンネルの表示名です。 |
| `WHATSAPP_DEBUG` | 問題を切り分けるために、ブリッジで生のメッセージイベントをログに出します（`true`/`false`） |
| `WHATSAPP_CLOUD_PHONE_NUMBER_ID` | WhatsApp Business Cloud API の Meta の電話番号 ID です（15〜17 桁で、電話番号そのものでは**ありません**） |
| `WHATSAPP_CLOUD_ACCESS_TOKEN` | Meta のアクセストークンです（`EAA` で始まります）。一時的なトークンは 24 時間で期限が切れ、システムユーザーのトークンは無期限です |
| `WHATSAPP_CLOUD_APP_SECRET` | 受信した webhook の署名を検証するための 32 文字の 16 進数のアプリシークレットです |
| `WHATSAPP_CLOUD_VERIFY_TOKEN` | Meta の webhook 検証のやり取りで使う共有の秘密情報です（セットアップウィザードが自動で生成します） |
| `WHATSAPP_CLOUD_ALLOWED_USERS` | ボットにメッセージを送れる `wa_id`（国番号付きの電話番号、`+` は付けません）をカンマ区切りで指定します |
| `WHATSAPP_CLOUD_ALLOW_ALL_USERS` | 許可リストなしで WhatsApp Cloud のすべての送信者を許可します（`true`/`false`） |
| `WHATSAPP_CLOUD_APP_ID` | Meta のアプリ ID です（任意。今後の分析機能との連携用です） |
| `WHATSAPP_CLOUD_WABA_ID` | WhatsApp Business Account の ID です（任意。今後の分析機能との連携用です） |
| `WHATSAPP_CLOUD_WEBHOOK_HOST` | 受信用の webhook サーバーが待ち受けるインターフェースです（既定値 `0.0.0.0`） |
| `WHATSAPP_CLOUD_WEBHOOK_PORT` | 受信用の webhook サーバーが待ち受けるポートです（既定値 `8090`） |
| `WHATSAPP_CLOUD_WEBHOOK_PATH` | Meta が受信メッセージを POST する URL のパスです（既定値 `/whatsapp/webhook`） |
| `WHATSAPP_CLOUD_API_VERSION` | 呼び出す Meta Graph API のバージョンです（既定値 `v20.0`） |
| `WHATSAPP_CLOUD_HOME_CHANNEL` | ボットのホームチャンネルとして使う `wa_id` です（cron のジョブなどで使います） |
| `WHATSAPP_CLOUD_DM_POLICY` | Cloud アダプターでの DM の受け入れ方針です（`open`/`allowlist`/`disabled`）。設定しなければ `WHATSAPP_DM_POLICY` が使われます |
| `WHATSAPP_CLOUD_ALLOW_FROM` | `dm_policy: allowlist` のときに許可する送信者をカンマ区切りで指定します（`wa_id` をそのまま書きます。Baileys 形式の JID は自動で整えられます） |
| `WHATSAPP_CLOUD_GROUP_POLICY` | Cloud アダプターでのグループの受け入れ方針です（`open`/`allowlist`/`disabled`）。設定しなければ `WHATSAPP_GROUP_POLICY` が使われます |
| `WHATSAPP_CLOUD_GROUP_ALLOW_FROM` | `group_policy: allowlist` のときに許可するグループチャットの ID をカンマ区切りで指定します |
| `SIGNAL_HTTP_URL` | signal-cli デーモンの HTTP エンドポイントです（たとえば `http://127.0.0.1:8080`） |
| `SIGNAL_ACCOUNT` | ボットの電話番号を E.164 形式で指定します |
| `SIGNAL_ALLOWED_USERS` | E.164 形式の電話番号または UUID をカンマ区切りで指定します |
| `SIGNAL_GROUP_ALLOWED_USERS` | グループ ID をカンマ区切りで指定します。`*` にするとすべてのグループが対象になります |
| `SIGNAL_HOME_CHANNEL_NAME` | Signal のホームチャンネルの表示名です |
| `SIGNAL_IGNORE_STORIES` | Signal のストーリーやステータスの更新を無視します |
| `SIGNAL_ALLOW_ALL_USERS` | 許可リストなしですべての Signal 利用者を許可します |
| `TWILIO_ACCOUNT_SID` | Twilio のアカウント SID です（電話関連のスキルと共通です） |
| `TWILIO_AUTH_TOKEN` | Twilio の認証トークンです（電話関連のスキルと共通で、webhook の署名の検証にも使います） |
| `TWILIO_PHONE_NUMBER` | Twilio の電話番号を E.164 形式で指定します（電話関連のスキルと共通です） |
| `SMS_WEBHOOK_URL` | Twilio の署名を検証するための公開 URL です。Twilio Console に登録した webhook の URL と一致している必要があります（必須） |
| `SMS_WEBHOOK_PORT` | 受信 SMS を受け取る webhook の待ち受けポートです（既定値: `8080`） |
| `SMS_WEBHOOK_HOST` | webhook が待ち受けるアドレスです（既定値: `127.0.0.1`） |
| `SMS_INSECURE_NO_SIGNATURE` | `true` にすると Twilio の署名の検証を無効にします（ローカルの開発時のみで、本番では使わないでください） |
| `SMS_ALLOWED_USERS` | 会話を許可する E.164 形式の電話番号をカンマ区切りで指定します |
| `SMS_ALLOW_ALL_USERS` | 許可リストなしですべての SMS の送信者を許可します |
| `SMS_HOME_CHANNEL` | cron のジョブや通知の配信先となる電話番号です |
| `SMS_HOME_CHANNEL_NAME` | SMS のホームチャンネルの表示名です |
| `EMAIL_ADDRESS` | メールのゲートウェイアダプターが使うメールアドレスです |
| `EMAIL_PASSWORD` | そのメールアカウントのパスワード、またはアプリパスワードです |
| `EMAIL_IMAP_HOST` | メールのアダプターが使う IMAP のホスト名です |
| `EMAIL_IMAP_PORT` | IMAP のポートです |
| `EMAIL_SMTP_HOST` | メールのアダプターが使う SMTP のホスト名です |
| `EMAIL_SMTP_PORT` | SMTP のポートです |
| `EMAIL_ALLOWED_USERS` | ボットにメッセージを送れるメールアドレスをカンマ区切りで指定します |
| `EMAIL_HOME_ADDRESS` | エージェント側から送るメールの既定の宛先です |
| `EMAIL_HOME_ADDRESS_NAME` | メールのホームの宛先の表示名です |
| `EMAIL_POLL_INTERVAL` | メールを確認する間隔を秒で指定します |
| `EMAIL_ALLOW_ALL_USERS` | 受信するすべてのメールの送信者を許可します |
| `DINGTALK_CLIENT_ID` | 開発者向けポータルで取得する DingTalk のボットの AppKey です（[open.dingtalk.com](https://open.dingtalk.com)） |
| `DINGTALK_CLIENT_SECRET` | 開発者向けポータルで取得する DingTalk のボットの AppSecret です |
| `DINGTALK_ALLOWED_USERS` | ボットにメッセージを送れる DingTalk の利用者 ID をカンマ区切りで指定します |
| `DINGTALK_WEBHOOK_URL` | プラットフォームをまたぐ配信や cron の配信に使う、固定のロボットの webhook URL です。 |
| `DINGTALK_HOME_CHANNEL` | cron や通知の配信先となる既定の会話 ID です。 |
| `DINGTALK_HOME_CHANNEL_NAME` | DingTalk のホームチャンネルの表示名です。 |
| `FEISHU_APP_ID` | [open.feishu.cn](https://open.feishu.cn/) で取得する Feishu / Lark のボットの App ID です |
| `FEISHU_APP_SECRET` | Feishu / Lark のボットの App Secret です |
| `FEISHU_DOMAIN` | `feishu`（中国）か `lark`（国際版）を指定します。既定値は `feishu` です |
| `FEISHU_CONNECTION_MODE` | `websocket`（推奨）か `webhook` を指定します。既定値は `websocket` です |
| `FEISHU_ENCRYPT_KEY` | webhook モードで使う暗号化キーです（任意） |
| `FEISHU_VERIFICATION_TOKEN` | webhook モードで使う検証用トークンです（任意） |
| `FEISHU_ALLOWED_USERS` | ボットにメッセージを送れる Feishu の利用者 ID をカンマ区切りで指定します |
| `FEISHU_ALLOW_BOTS` | `none`（既定値）/ `mentions` / `all` — 他のボットからの受信メッセージを受け付ける度合いです。[ボット同士のやり取り](/hermes/docs/user-guide/messaging/feishu/#bot-to-bot-messaging) を参照してください |
| `FEISHU_REQUIRE_MENTION` | `true`（既定値）/ `false` — グループのメッセージでボットへの @メンションを必須にするかどうかです。チャットごとに `group_rules.<chat_id>.require_mention` で上書きできます。 |
| `FEISHU_HOME_CHANNEL` | cron の配信と通知に使う Feishu のチャット ID です |
| `FEISHU_HOME_CHANNEL_NAME` | Feishu のホームチャンネルの表示名です。 |
| `FEISHU_ALLOW_ALL_USERS` | どの Feishu 利用者でもボットを動かせるようにします（開発時のみ）。 |
| `WECOM_BOT_ID` | 管理コンソールで取得する WeCom AI Bot の ID です |
| `WECOM_SECRET` | WeCom AI Bot のシークレットです |
| `WECOM_WEBSOCKET_URL` | WebSocket の URL を独自に指定します（既定値: `wss://openws.work.weixin.qq.com`） |
| `WECOM_ALLOWED_USERS` | ボットにメッセージを送れる WeCom の利用者 ID をカンマ区切りで指定します |
| `WECOM_HOME_CHANNEL` | cron の配信と通知に使う WeCom のチャット ID です |
| `WECOM_CALLBACK_CORP_ID` | コールバック方式の自社製アプリで使う WeCom の企業の Corp ID です |
| `WECOM_CALLBACK_CORP_SECRET` | その自社製アプリの Corp シークレットです |
| `WECOM_CALLBACK_AGENT_ID` | その自社製アプリのエージェント ID です |
| `WECOM_CALLBACK_TOKEN` | コールバックの検証用トークンです |
| `WECOM_CALLBACK_ENCODING_AES_KEY` | コールバックの暗号化に使う AES キーです |
| `WECOM_CALLBACK_HOST` | コールバックのサーバーが待ち受けるアドレスです（既定値: `0.0.0.0`） |
| `WECOM_CALLBACK_PORT` | コールバックのサーバーのポートです（既定値: `8645`） |
| `WECOM_CALLBACK_ALLOWED_USERS` | 許可リストに載せる利用者 ID をカンマ区切りで指定します |
| `WECOM_CALLBACK_ALLOW_ALL_USERS` | `true` にすると、許可リストなしですべての利用者を許可します |
| `WEIXIN_ACCOUNT_ID` | iLink Bot API の QR ログインで取得する Weixin のアカウント ID です |
| `WEIXIN_TOKEN` | iLink Bot API の QR ログインで取得する Weixin の認証トークンです |
| `WEIXIN_BASE_URL` | Weixin iLink Bot API のベース URL を上書きします（既定値: `https://ilinkai.weixin.qq.com`） |
| `WEIXIN_CDN_BASE_URL` | メディア用の Weixin の CDN のベース URL を上書きします（既定値: `https://novac2c.cdn.weixin.qq.com/c2c`） |
| `WEIXIN_DM_POLICY` | ダイレクトメッセージの方針です。`open`、`allowlist`、`pairing`、`disabled` から選びます（既定値: `open`） |
| `WEIXIN_GROUP_POLICY` | グループのメッセージの方針です。`open`、`allowlist`、`disabled` から選びます（既定値: `disabled`） |
| `WEIXIN_ALLOWED_USERS` | ボットに DM を送れる Weixin の利用者 ID をカンマ区切りで指定します |
| `WEIXIN_GROUP_ALLOWED_USERS` | ボットとやり取りできる Weixin の**グループチャット ID**（メンバーの利用者 ID ではありません）をカンマ区切りで指定します。変数名は以前の名残で、実際にはグループ ID を指定します。iLink が実際にグループのイベントを届けるときにだけ効きます。QR ログインの iLink のボットの識別子（`...@im.bot`）は、通常の WeChat のグループのメッセージを受け取らないのが普通です。 |
| `WEIXIN_HOME_CHANNEL` | cron の配信と通知に使う Weixin のチャット ID です |
| `WEIXIN_HOME_CHANNEL_NAME` | Weixin のホームチャンネルの表示名です |
| `WEIXIN_ALLOW_ALL_USERS` | 許可リストなしですべての Weixin の利用者を許可します（`true`/`false`） |
| `BLUEBUBBLES_SERVER_URL` | BlueBubbles サーバーの URL です（たとえば `http://192.168.1.10:1234`） |
| `BLUEBUBBLES_PASSWORD` | BlueBubbles サーバーのパスワードです |
| `BLUEBUBBLES_WEBHOOK_HOST` | webhook の待ち受けアドレスです（既定値: `127.0.0.1`） |
| `BLUEBUBBLES_WEBHOOK_PORT` | webhook の待ち受けポートです（既定値: `8645`） |
| `BLUEBUBBLES_HOME_CHANNEL` | cron や通知の配信先となる電話番号またはメールアドレスです |
| `BLUEBUBBLES_ALLOWED_USERS` | 許可する利用者をカンマ区切りで指定します |
| `BLUEBUBBLES_ALLOW_ALL_USERS` | すべての利用者を許可します（`true`/`false`） |
| `QQ_APP_ID` | [q.qq.com](https://q.qq.com) で取得する QQ Bot の App ID です |
| `QQ_CLIENT_SECRET` | [q.qq.com](https://q.qq.com) で取得する QQ Bot の App Secret です |
| `QQ_STT_API_KEY` | 外部の音声認識にフォールバックするときのプロバイダーの API キーです（任意。QQ 組み込みの音声認識が文字を返さなかったときに使います） |
| `QQ_STT_BASE_URL` | 外部の音声認識のプロバイダーのベース URL です（任意） |
| `QQ_STT_MODEL` | 外部の音声認識のプロバイダーのモデル名です（任意） |
| `QQ_ALLOWED_USERS` | ボットにメッセージを送れる QQ の利用者の openID をカンマ区切りで指定します |
| `QQ_GROUP_ALLOWED_USERS` | グループでの @ 付きメッセージを許可する QQ のグループ ID をカンマ区切りで指定します |
| `QQ_ALLOW_ALL_USERS` | すべての利用者を許可します（`true`/`false`。`QQ_ALLOWED_USERS` より優先されます） |
| `QQBOT_HOME_CHANNEL` | cron の配信と通知に使う QQ の利用者またはグループの openID です |
| `QQBOT_HOME_CHANNEL_NAME` | QQ のホームチャンネルの表示名です |
| `QQ_PORTAL_HOST` | QQ のポータルのホストを上書きします（`sandbox.q.qq.com` にするとサンドボックスのゲートウェイを経由します。既定値: `q.qq.com`）。 |
| `QQ_SANDBOX` | 開発時の検証のために QQ のサンドボックスモードを有効にします（`true`/`false`） |
| `MATTERMOST_URL` | Mattermost サーバーの URL です（たとえば `https://mm.example.com`） |
| `MATTERMOST_TOKEN` | Mattermost のボットトークン、または個人用アクセストークンです |
| `MATTERMOST_ALLOWED_USERS` | ボットにメッセージを送れる Mattermost の利用者 ID をカンマ区切りで指定します |
| `MATTERMOST_ALLOW_ALL_USERS` | どの Mattermost 利用者でもボットを動かせるようにします（開発時のみ）。 |
| `MATTERMOST_ALLOWED_CHANNELS` | 設定すると、ボットはこれらのチャンネルでのみ返答します（許可リスト）。 |
| `MATTERMOST_HOME_CHANNEL` | エージェント側から送るメッセージ（cron、通知）の配信先となるチャンネル ID です |
| `MATTERMOST_REQUIRE_MENTION` | チャンネルで `@mention` を必須にします（既定値: `true`）。`false` にすると、すべてのメッセージに返答します。 |
| `MATTERMOST_FREE_RESPONSE_CHANNELS` | `@mention` なしでもボットが返答するチャンネル ID をカンマ区切りで指定します |
| `MATTERMOST_REPLY_MODE` | 返信の形式です。`thread`（スレッドで返す）か `off`（フラットなメッセージ、既定値）を指定します |
| `MATRIX_HOMESERVER` | Matrix のホームサーバーの URL です（たとえば `https://matrix.org`） |
| `MATRIX_ACCESS_TOKEN` | ボットの認証に使う Matrix のアクセストークンです |
| `MATRIX_USER_ID` | Matrix の利用者 ID です（たとえば `@hermes:matrix.org`）。パスワードでログインする場合は必須で、アクセストークンを使う場合は任意です |
| `MATRIX_PASSWORD` | Matrix のパスワードです（アクセストークンの代わりに使えます） |
| `MATRIX_ALLOWED_USERS` | ボットにメッセージを送れる Matrix の利用者 ID をカンマ区切りで指定します（たとえば `@alice:matrix.org`） |
| `MATRIX_ALLOW_ALL_USERS` | どの Matrix 利用者でもボットを動かせるようにします（開発時のみ）。 |
| `MATRIX_HOME_CHANNEL` | cron や通知の配信先となる既定のルーム ID です。 |
| `MATRIX_HOME_CHANNEL_NAME` | Matrix のホームルームの表示名です。 |
| `MATRIX_ALLOWED_ROOMS` | ボットの応答を呼び出せる Matrix のルーム ID をカンマ区切りで指定します |
| `MATRIX_HOME_ROOM` | エージェント側から送るメッセージの配信先となるルーム ID です（たとえば `!abc123:matrix.org`） |
| `MATRIX_ENCRYPTION` | エンドツーエンドの暗号化を有効にします（`true`/`false`、既定値: `false`） |
| `MATRIX_E2EE_MODE` | Matrix の E2EE の扱い方です。`off`、`optional`、`required` から選びます。設定すると `MATRIX_ENCRYPTION` より優先されます。 |
| `MATRIX_DEVICE_ID` | 再起動をまたいで E2EE を保つための、固定の Matrix のデバイス ID です（たとえば `HERMES_BOT`）。これがないと E2EE の鍵が起動のたびに入れ替わり、過去のルームの復号ができなくなります。 |
| `MATRIX_REACTIONS` | 受信したメッセージに、処理の進み具合を示す絵文字のリアクションを付けます（既定値: `true`）。`false` にすると無効になります。 |
| `MATRIX_REQUIRE_MENTION` | ルームで `@mention` を必須にします（既定値: `true`）。`false` にすると、すべてのメッセージに返答します。 |
| `MATRIX_FREE_RESPONSE_ROOMS` | `@mention` なしでもボットが返答するルーム ID をカンマ区切りで指定します |
| `MATRIX_IGNORE_USER_PATTERNS` | 無視する Matrix のブリッジ / アプリサービスのゴーストの利用者 ID の正規表現をカンマ区切りで指定します |
| `MATRIX_PROCESS_NOTICES` | 受信した Matrix の `m.notice` イベントを処理します（既定値: `false`） |
| `MATRIX_SESSION_SCOPE` | プロジェクトのルームでのセッションの単位です。`auto`、`room`、`thread` から選びます（既定値: `auto`） |
| `MATRIX_TOOLS_ALLOW_REDACTION` | Matrix のメッセージを取り消すツールの実行を許可します（既定値: `false`） |
| `MATRIX_TOOLS_ALLOW_INVITES` | Matrix の招待ツールの実行を許可します（既定値: `false`） |
| `MATRIX_TOOLS_ALLOW_ROOM_CREATE` | Matrix のルーム作成ツールの実行を許可します（既定値: `false`） |
| `MATRIX_ALLOW_ROOM_MENTIONS` | 送信するメッセージで `@room` のメンションを使い、ルームの全員に通知することを許可します（既定値: `false`） |
| `MATRIX_AUTO_THREAD` | ルームのメッセージで自動的にスレッドを作ります（既定値: `true`） |
| `MATRIX_DM_AUTO_THREAD` | Matrix の DM のメッセージで自動的にスレッドを作ります（既定値: `false`） |
| `MATRIX_DM_MENTION_THREADS` | DM でボットが `@mentioned` されたときにスレッドを作ります（既定値: `false`） |
| `MATRIX_APPROVAL_REQUIRE_SENDER` | 承認やモデル選択のリアクションを、依頼者がわかっている場合はその本人からのものに限ります（既定値: `true`） |
| `MATRIX_APPROVAL_TIMEOUT_SECONDS` | Matrix のリアクションによる承認やモデル選択の待ち時間です（既定値: `300`） |
| `MATRIX_ALLOW_PUBLIC_ROOMS` | Matrix のルーム作成ツールが公開ルームを作ることを許可します（既定値: `false`） |
| `MATRIX_MAX_MEDIA_BYTES` | Matrix でアップロード・ダウンロードできるメディアの最大バイト数です（既定値: `104857600`） |
| `MATRIX_RECOVERY_KEY` | デバイスの鍵が入れ替わったあとにクロス署名の検証をするためのリカバリーキーです。クロス署名を有効にした E2EE の構成では設定をおすすめします。 |
| `MATRIX_RECOVERY_KEY_OUTPUT_FILE` | 生成した Matrix のリカバリーキーを書き出す一度きりのパスです（任意）。モード `0600` で作られ、上書きされることはありません。 |
| `HASS_TOKEN` | Home Assistant の長期アクセストークンです（HA のプラットフォームとツールが有効になります） |
| `HASS_URL` | Home Assistant の URL です（既定値: `http://homeassistant.local:8123`） |
| `WEBHOOK_ENABLED` | webhook のプラットフォームアダプターを有効にします（`true`/`false`） |
| `WEBHOOK_PORT` | webhook を受け取る HTTP サーバーのポートです（既定値: `8644`） |
| `WEBHOOK_SECRET` | webhook の署名を検証するための全体共通の HMAC の秘密情報です（ルートごとに指定がないときに使われます） |
| `API_SERVER_ENABLED` | OpenAI 互換の API サーバーを有効にします（`true`/`false`）。他のプラットフォームと並行して動きます。 |
| `API_SERVER_KEY` | API サーバーの認証に使うベアラートークンです。API サーバーを有効にする場合は必須です。 |
| `API_SERVER_CORS_ORIGINS` | ブラウザーから API サーバーを直接呼び出せるオリジンをカンマ区切りで指定します（たとえば `http://localhost:3000,http://127.0.0.1:3000`）。既定では無効です。 |
| `API_SERVER_PORT` | API サーバーのポートです（既定値: `8642`） |
| `API_SERVER_HOST` | API サーバーのホストや待ち受けアドレスです（既定値: `127.0.0.1`）。ループバックでも `API_SERVER_KEY` は必要です。ブラウザーからのアクセスには、範囲を絞った `API_SERVER_CORS_ORIGINS` の許可リストを使ってください。 |
| `API_SERVER_MODEL_NAME` | `/v1/models` で公開されるモデル名です。既定ではプロファイル名（既定のプロファイルなら `hermes-agent`）になります。Open WebUI のようなフロントエンドが接続ごとに別々のモデル名を必要とする、複数人での構成のときに便利です。 |
| `GATEWAY_PROXY_URL` | メッセージを転送する先となる、リモートの Hermes API サーバーの URL です（[プロキシモード](/hermes/docs/user-guide/messaging/matrix/#proxy-mode-e2ee-on-macos)）。設定すると、ゲートウェイはプラットフォームとの入出力だけを担当し、エージェントの処理はすべてリモートのサーバーに任せます。`config.yaml` の `gateway.proxy_url` でも設定できます。 |
| `GATEWAY_PROXY_KEY` | プロキシモードでリモートの API サーバーに認証するためのベアラートークンです。リモートのホストの `API_SERVER_KEY` と一致している必要があります。 |
| `MESSAGING_CWD` | ゲートウェイの作業ディレクトリを指定する、互換のために残された非推奨の設定です。`config.yaml` の `terminal.cwd` を使ってください。 |
| `GATEWAY_ALLOWED_USERS` | すべてのプラットフォームで許可する利用者 ID をカンマ区切りで指定します |
| `GATEWAY_ALLOW_ALL_USERS` | 許可リストなしですべての利用者を許可します（`true`/`false`、既定値: `false`） |

### ウェブのダッシュボードと Hermes Desktop {#web-dashboard-hermes-desktop}

[ウェブのダッシュボード](/hermes/docs/user-guide/features/web-dashboard/) の認証と、[Hermes Desktop からリモートのバックエンドへつなぐ](/hermes/docs/user-guide/features/web-dashboard/#connecting-hermes-desktop-to-a-remote-backend) ための設定です。秘密情報だけを置くという方針にしたがい、資格情報は `~/.hermes/.env` に入れます。OAuth の `client_id` は `config.yaml` の `dashboard.oauth` の下に書くほうが向いています（環境変数を設定した場合はそちらが優先されます）。

ダッシュボードの認証プロバイダーは、標準で3種類が同梱されています。リモートの Hermes Desktop から接続する場合や、インターネットに公開するダッシュボードの場合は、**OAuth（Nous Portal）** をおすすめします。`HERMES_DASHBOARD_OAUTH_CLIENT_ID` を設定してください（`hermes dashboard register` で発行できます）。同梱の**ユーザー名とパスワード**のプロバイダー（`HERMES_DASHBOARD_BASIC_AUTH_*`）は、信頼できる LAN の中や VPN の内側にあるバックエンドでは一番手軽ですが、インターネットに直接さらす用途には向きません。自前の ID プロバイダーで認証したい場合は、**自前ホストの OIDC** プロバイダー（`HERMES_DASHBOARD_OIDC_*`）を使ってください。いずれの場合も、ループバック以外に待ち受ける（`hermes dashboard --host 0.0.0.0`）と認証のゲートが働きます。全体像は [ウェブのダッシュボード → 認証](/hermes/docs/user-guide/features/web-dashboard/#authentication-gated-mode) を参照してください。

| 変数 | 説明 |
|----------|-------------|
| `HERMES_DASHBOARD_BASIC_AUTH_USERNAME` | 同梱のユーザー名・パスワード方式のダッシュボード認証プロバイダー（`plugins/dashboard_auth/basic`）で使うユーザー名です。パスワードと一緒に設定すると、このプロバイダーが有効になります。`dashboard.basic_auth.username` より優先されます。 |
| `HERMES_DASHBOARD_BASIC_AUTH_PASSWORD` | basic プロバイダーの平文のパスワードです（読み込み時にメモリー上でハッシュ化されます）。設定の `password_hash` より優先されるので、環境変数だけで入れ替えられます。`dashboard.basic_auth.password` より優先されます。 |
| `HERMES_DASHBOARD_BASIC_AUTH_PASSWORD_HASH` | basic プロバイダー用の scrypt のパスワードハッシュです（平文をディスクに残さないので、こちらが推奨です）。`python -c "from plugins.dashboard_auth.basic import hash_password; print(hash_password('PW'))"` で計算できます。`dashboard.basic_auth.password_hash` より優先されます。 |
| `HERMES_DASHBOARD_BASIC_AUTH_SECRET` | basic プロバイダーの、状態を持たないセッショントークンに署名する HMAC のキーです（32 バイト以上、base64 / 16 進数 / 生の値）。明示的に設定すると、再起動をまたいでもセッションが残り、複数のワーカーでも共有できます。空にすると、プロセスごとにランダムな値になり、再起動のたびにログアウトします。`dashboard.basic_auth.secret` より優先されます。 |
| `HERMES_DASHBOARD_BASIC_AUTH_TTL_SECONDS` | basic プロバイダーのアクセストークンの有効期間です（既定は 12 時間）。`dashboard.basic_auth.session_ttl_seconds` より優先されます。 |
| `HERMES_DASHBOARD_OAUTH_CLIENT_ID` | 認証付き・公開のダッシュボード向けの OAuth のクライアント ID（`agent:{instance_id}`）で、これを設定すると Nous のプロバイダー（`plugins/dashboard_auth/nous`）が有効になります。`dashboard.oauth.client_id` より優先されます。`hermes dashboard register` で発行してください。 |
| `HERMES_DASHBOARD_PUBLIC_URL` | ダッシュボードに実際にアクセスするときの完全な公開 URL です。リバースプロキシの後ろで OAuth のコールバックを組み立てるために使います。`dashboard.public_url` より優先されます。 |
| `HERMES_DASHBOARD_OIDC_ISSUER` | 同梱の自前ホストの OIDC プロバイダー（`plugins/dashboard_auth/self_hosted`）の issuer の URL です。有効にするには必須です。`dashboard.oauth.self_hosted.issuer` より優先されます。 |
| `HERMES_DASHBOARD_OIDC_CLIENT_ID` | 自前ホストの OIDC プロバイダー用の公開クライアント ID です（認可コード + PKCE）。有効にするには必須です。`dashboard.oauth.self_hosted.client_id` より優先されます。 |
| `HERMES_DASHBOARD_OIDC_SCOPES` | 自前ホストの OIDC プロバイダーで要求するスコープです（既定値 `openid profile email`）。`dashboard.oauth.self_hosted.scopes` より優先されます。 |
| `HERMES_DESKTOP_REMOTE_URL` | （Desktop 側）リモートのバックエンドのベース URL です。たとえば `http://host:9119` のように指定します。設定すると、アプリ内のゲートウェイの URL より優先されます。サインインは引き続きゲートウェイの設定パネルから行います（バックエンドが提示する方式に応じて OAuth のリダイレクトか、ユーザー名とパスワードになります）。 |
| `HERMES_DESKTOP_HERMES` | Desktop のバックエンドのコマンドを上書きします。パッケージの作成者や Nix、あるいは問題の切り分けのときに、バックエンドの探索後に Electron を特定の `hermes` の実行ファイルへ向けるために使います。 |
| `HERMES_DESKTOP_HERMES_ROOT` | `hermes desktop --hermes-root` が使う、Desktop のソースのチェックアウト先の上書きです。パッケージ版の初回起動時のインストールや、`PATH` にある既存の `hermes` より先に確認されます。 |
| `HERMES_DESKTOP_IGNORE_EXISTING` | `1` にすると、バックエンドを決めるときに Desktop が `PATH` 上の既存の `hermes` を無視します。`hermes desktop --ignore-existing` と同じ働きです。 |
| `HERMES_DESKTOP_CWD` | Desktop のチャットセッションの最初のプロジェクトディレクトリです。`hermes desktop --cwd` が設定します。 |
| `HERMES_DESKTOP_PYTHON` | バックエンドで使う Python インタープリターの絶対パスです。ソースのチェックアウトに対して Electron が自動で選ぶより先に確認されます。共有の venv を使い回すために、worktree の開発補助（[worktree からの TUI と Desktop](/hermes/docs/developer-guide/worktree-ui-dev/) を参照）が使います。 |
| `HERMES_DESKTOP_DEV_SERVER` | Electron のシェルが、同梱のバンドルの代わりに読み込む Vite の開発サーバーの URL です（たとえば `http://127.0.0.1:5174`）。`npm run dev` が自動で設定します。アプリ自体を開発するときにだけ関係します。 |
| `HERMES_DESKTOP_CDP_PORT` | DOM や CSS を調べるツール向けに、レンダラーが `127.0.0.1` で公開する Chrome DevTools Protocol のポートを上書きします（既定値 `9222`）。開発サーバーでの実行（`npm run dev`、`hgui`）では自動で開きますが、パッケージ版のアプリでは決して開かず、ここに値を入れてもそれは変わりません。開発時の実行で無効にしたい場合は `off` にしてください。このポートに到達できるものは、レンダラー上でコードを実行できます。 |

### Microsoft Graph（Teams の会議） {#microsoft-graph-teams-meetings}

まもなく提供される Teams の会議要約のパイプラインが使う、Microsoft Graph の REST クライアント向けのアプリ単位の資格情報です。Azure ポータルでの手順と、必要になる API の権限については [Microsoft Graph のアプリケーションを登録する](/hermes/docs/guides/microsoft-graph-app-registration/) を参照してください。

| 変数 | 説明 |
|----------|-------------|
| `MSGRAPH_TENANT_ID` | Graph のアプリ登録に使う Azure AD のテナント ID（ディレクトリの GUID）です。 |
| `MSGRAPH_CLIENT_ID` | Azure のアプリ登録のアプリケーション（クライアント）ID です。 |
| `MSGRAPH_CLIENT_SECRET` | アプリ登録のクライアントシークレットの値です。`~/.hermes/.env` に `chmod 600` で保存し、Azure ポータルで定期的に入れ替えてください。 |
| `MSGRAPH_SCOPE` | クライアント資格情報でトークンを要求するときの OAuth2 のスコープです（既定値: `https://graph.microsoft.com/.default`）。 |
| `MSGRAPH_AUTHORITY_URL` | Microsoft ID プラットフォームの認証機関です（既定値: `https://login.microsoftonline.com`）。国別クラウドやソブリンクラウドのときだけ上書きしてください（GCC High なら `https://login.microsoftonline.us` など）。 |

### Microsoft Graph の webhook のリスナー {#microsoft-graph-webhook-listener}

Graph のイベント（Teams の会議、カレンダー、チャットなど）の変更通知を受け取るリスナーです。設定とセキュリティの強化については [Microsoft Graph の webhook のリスナー](/hermes/docs/user-guide/messaging/msgraph-webhook/) を参照してください。

| 変数 | 説明 |
|----------|-------------|
| `MSGRAPH_WEBHOOK_ENABLED` | `msgraph_webhook` のゲートウェイのプラットフォームを有効にします（`true`/`1`/`yes`）。 |
| `MSGRAPH_WEBHOOK_PORT` | リスナーが待ち受けるポートです（既定値: `8646`）。 |
| `MSGRAPH_WEBHOOK_CLIENT_STATE` | Graph がすべての通知に載せて返してくる共有の秘密情報です。`hmac.compare_digest` で比較されます。`openssl rand -hex 32` で生成してください。 |
| `MSGRAPH_WEBHOOK_ACCEPTED_RESOURCES` | 受け付ける Graph のリソースのパスやパターンの許可リストをカンマ区切りで指定します（たとえば `communications/onlineMeetings,chats/*/messages`）。末尾の `*` は前方一致です。空にするとすべて受け付けます。 |
| `MSGRAPH_WEBHOOK_ALLOWED_SOURCE_CIDRS` | リスナーへ POST できる CIDR の範囲をカンマ区切りで指定します（たとえば `52.96.0.0/14,52.104.0.0/14`）。空にするとすべて許可します（既定）。本番では Microsoft Graph が公開している送信元の範囲に絞ってください。 |

### Teams の会議要約の配信 {#teams-meeting-summary-delivery}

[`teams_pipeline` プラグイン](/hermes/docs/user-guide/messaging/msgraph-webhook/) を有効にしたときにだけ使われます。これらの設定は `config.yaml` の `platforms.teams.extra` の下でも指定できます。両方を設定した場合は環境変数が優先されます。[Microsoft Teams → 会議要約の配信](/hermes/docs/user-guide/messaging/teams/#meeting-summary-delivery-teams-meeting-pipeline) を参照してください。

| 変数 | 説明 |
|----------|-------------|
| `TEAMS_DELIVERY_MODE` | `graph` か `incoming_webhook` を指定します。 |
| `TEAMS_INCOMING_WEBHOOK_URL` | Teams が発行する webhook の URL です。`TEAMS_DELIVERY_MODE=incoming_webhook` のときに必要です。 |
| `TEAMS_GRAPH_ACCESS_TOKEN` | Graph での配信にあらかじめ取得しておいた委任のアクセストークンです。必要になることはまれで、設定しなければ書き込み側は `MSGRAPH_*` のアプリの資格情報を使います。 |
| `TEAMS_TEAM_ID` | チャンネルへ配信するときの対象のチーム ID です（`graph` モード）。 |
| `TEAMS_CHANNEL_ID` | 対象のチャンネル ID です（`TEAMS_TEAM_ID` と組み合わせて使います）。 |
| `TEAMS_CHAT_ID` | 対象の 1 対 1 またはグループのチャット ID です（`graph` モードでチームとチャンネルの代わりに使えます）。 |

### LINE Messaging API {#line-messaging-api}

同梱の LINE のプラットフォームプラグイン（`plugins/platforms/line/`）が使います。設定の全体は [メッセージングゲートウェイ → LINE](/hermes/docs/user-guide/messaging/line/) を参照してください。

| 変数 | 説明 |
|----------|-------------|
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Developers コンソール（Messaging API のタブ）で取得する長期のチャネルアクセストークンです。必須です。 |
| `LINE_CHANNEL_SECRET` | チャネルシークレットです（Basic settings のタブ）。webhook の HMAC-SHA256 の署名の検証に使います。必須です。 |
| `LINE_HOST` | webhook が待ち受けるホストです（既定値: `0.0.0.0`）。 |
| `LINE_PORT` | webhook が待ち受けるポートです（既定値: `8646`）。 |
| `LINE_PUBLIC_URL` | 公開の HTTPS のベース URL です（たとえば `https://my-tunnel.example.com`）。画像・音声・動画を送るには必須です。LINE は HTTPS でアクセスできる URL しか受け付けません。 |
| `LINE_ALLOWED_USERS` | ボットに DM を送れる利用者 ID をカンマ区切りで指定します（`U` で始まります）。 |
| `LINE_ALLOWED_GROUPS` | ボットが返答するグループ ID をカンマ区切りで指定します（`C` で始まります）。 |
| `LINE_ALLOWED_ROOMS` | ボットが返答するルーム ID をカンマ区切りで指定します（`R` で始まります）。 |
| `LINE_ALLOW_ALL_USERS` | 開発時だけの逃げ道で、どの送信元も受け付けます。既定値: `false`。 |
| `LINE_HOME_CHANNEL` | `deliver: line` を指定した cron のジョブの既定の配信先です。 |
| `LINE_SLOW_RESPONSE_THRESHOLD` | LLM の応答が遅いときに、テンプレートボタンの postback を出すまでの秒数です（既定値: `45`）。`0` にすると無効になり、常に Push で送り直します。 |
| `LINE_PENDING_TEXT` | postback のボタンと一緒に表示する吹き出しの文言です。 |
| `LINE_BUTTON_LABEL` | postback のボタンのラベルです（既定値: `Get answer`）。 |
| `LINE_DELIVERED_TEXT` | すでに配信済みの postback をもう一度タップしたときの返答です（既定値: `Already replied ✅`）。 |
| `LINE_INTERRUPTED_TEXT` | `/stop` で取り残された postback のボタンをタップしたときの返答です（既定値: `Run was interrupted before completion.`）。 |

### ntfy（プッシュ通知） {#ntfy-push-notifications}

[ntfy](https://ntfy.sh/) は HTTP ベースの軽いプッシュ通知のサービスです。[ntfy のモバイルアプリ](https://ntfy.sh/docs/subscribe/phone/) からトピックを購読し、そのトピックに投稿するとエージェントと会話できます。

| 変数 | 説明 |
|----------|-------------|
| `NTFY_TOPIC` | 購読するトピックです（メッセージの受信用）。必須です。 |
| `NTFY_SERVER_URL` | サーバーの URL です（既定値: `https://ntfy.sh`）。プライバシーを重視するなら、自前でホストした ntfy を指定してください。 |
| `NTFY_TOKEN` | 認証トークンです（任意）。ベアラートークン（`tk_xyz` など）か、Basic 認証用の `user:pass` を指定します。 |
| `NTFY_PUBLISH_TOPIC` | 返信を送るトピックです（既定では `NTFY_TOPIC` と同じになります）。 |
| `NTFY_MARKDOWN` | `true` にすると、返信に `X-Markdown: true` ヘッダーを付けて送ります。既定値: `false`。 |
| `NTFY_ALLOWED_USERS` | 許可リストです（利用者 ID として扱われますが、ntfy ではトピック名にあたります）。通常は `NTFY_TOPIC` と同じ値にします。 |
| `NTFY_ALLOW_ALL_USERS` | 開発時だけの逃げ道です。アクセスを制限した非公開のトピックでのみ安全に使えます。既定値: `false`。 |
| `NTFY_HOME_CHANNEL` | `deliver: ntfy` を指定した cron のジョブの既定の配信先です。 |
| `NTFY_HOME_CHANNEL_NAME` | ホームチャンネルにつける人が読むための名前です（既定ではトピック名になります）。 |

信頼できないトピックで運用する前に、[ntfy のメッセージングガイド](/hermes/docs/user-guide/messaging/ntfy/)、とくに **identity model** の節に目を通してください。

### IRC {#irc}

Hermes を IRC サーバーにつなぎます。外部の依存はありません。[IRC のメッセージングガイド](/hermes/docs/user-guide/messaging/irc/) を参照してください。

| 変数 | 説明 |
|----------|-------------|
| `IRC_SERVER` | IRC サーバーのホスト名です（たとえば `irc.libera.chat`）。必須です。 |
| `IRC_CHANNEL` | 参加するチャンネルです（たとえば `#hermes`）。複数指定するときはカンマで区切ります。必須です。 |
| `IRC_NICKNAME` | ボットのニックネームです（既定値: `hermes-bot`）。必須です。 |
| `IRC_PORT` | サーバーのポートです（既定値: TLS ありなら `6697`、なしなら `6667`）。 |
| `IRC_USE_TLS` | TLS を使います（`true`/`false`。ポート 6697 では既定で `true`）。 |
| `IRC_SERVER_PASSWORD` | `PASS` コマンドで使うサーバーのパスワードです（任意）。 |
| `IRC_NICKSERV_PASSWORD` | 接続時に自動で IDENTIFY するための NickServ のパスワードです（任意）。 |
| `IRC_ALLOWED_USERS` | ボットと会話できるニックネームをカンマ区切りで指定します。 |
| `IRC_ALLOW_ALL_USERS` | チャンネルにいる誰でもボットと会話できるようにします（開発時のみ）。 |
| `IRC_HOME_CHANNEL` | cron や通知の配信先となるチャンネルです（既定では `IRC_CHANNEL` になります）。 |

### SimpleX {#simplex}

ローカルの `simplex-chat` デーモンを介して、Hermes を [SimpleX Chat](https://simplex.chat/) のネットワークにつなぎます。[SimpleX のメッセージングガイド](/hermes/docs/user-guide/messaging/simplex/) を参照してください。

| 変数 | 説明 |
|----------|-------------|
| `SIMPLEX_WS_URL` | simplex-chat デーモンの WebSocket の URL です（たとえば `ws://127.0.0.1:5225`）。 |
| `SIMPLEX_ALLOWED_USERS` | ボットと会話できる SimpleX の連絡先 ID をカンマ区切りで指定します。 |
| `SIMPLEX_ALLOW_ALL_USERS` | どの連絡先でもボットと会話できるようにします（開発時のみで、許可リストが無効になります）。 |
| `SIMPLEX_AUTO_ACCEPT` | 届いた連絡先の申請を自動で受け入れます（既定値: `true`）。 |
| `SIMPLEX_GROUP_ALLOWED` | ボットが参加する SimpleX のグループ ID をカンマ区切りで指定します。`*` にするとどのグループでも許可します。省略するとグループのメッセージを完全に無視します（こちらのほうが安全です。そうしないと、グループにいるボットは全員の発言を処理してしまいます）。 |
| `SIMPLEX_HOME_CHANNEL` | cron や通知の配信先となる既定の連絡先またはグループの ID です。 |
| `SIMPLEX_HOME_CHANNEL_NAME` | ホームチャンネルにつける人が読むための名前です（既定では ID になります）。 |

### Photon {#photon}

Node のサイドカーを介して、Hermes を [Photon](https://photon.codes/) / Spectrum（iMessage やその他の Spectrum のプラットフォーム）につなぎます。[Photon のメッセージングガイド](/hermes/docs/user-guide/messaging/photon/) を参照してください。

| 変数 | 説明 |
|----------|-------------|
| `PHOTON_PROJECT_ID` | Spectrum のプロジェクト ID です（プロジェクトの `spectrumProjectId`。`hermes photon setup` が設定します）。 |
| `PHOTON_PROJECT_SECRET` | Spectrum のプロジェクト ID と対になるプロジェクトのシークレットです（`hermes photon setup` が設定します）。 |
| `PHOTON_ALLOWED_USERS` | ボットと会話できる E.164 形式の電話番号をカンマ区切りで指定します。 |
| `PHOTON_ALLOW_ALL_USERS` | どの送信者でもボットを動かせるようにします（開発時のみで、許可リストが無効になります）。 |
| `PHOTON_REQUIRE_MENTION` | メンションのウェイクワードに一致しないかぎり、グループチャットのメッセージを無視します（`true`/`false`、既定値 `false`）。 |
| `PHOTON_MENTION_PATTERNS` | グループチャットで使うメンションのウェイクワードの正規表現です（JSON のリスト、またはカンマ・改行区切り。既定では Hermes のウェイクワードになります）。 |
| `PHOTON_HOME_CHANNEL` | cron や通知の配信先となる既定の Photon の宛先です。Spectrum のスペース ID、DM の GUID、E.164 形式の電話番号のいずれかを指定します。 |
| `PHOTON_HOME_CHANNEL_NAME` | ホームチャンネルにつける人が読むための名前です。 |
| `PHOTON_MARKDOWN` | エージェントの返信をマークダウンで送ります。iMessage はそのまま表示でき、他の Spectrum のプラットフォームでは平文になります（`true`/`false`、既定値 `true`）。 |
| `PHOTON_REACTIONS` | 処理の状況を示すためにメッセージへ 👀/👍/👎 のタップバックを付け、ボットのメッセージへのタップバックをエージェントに渡します（`true`/`false`、既定値 `false`）。 |
| `PHOTON_TELEMETRY` | サイドカーで Spectrum SDK のテレメトリーを有効にします（`true`/`false`、既定値 `false`。`hermes photon telemetry on|off` で切り替えます）。 |
| `PHOTON_SIDECAR_PORT` | Node のサイドカーの制御と受信に使うループバックのポートです（既定値 `8789`）。 |
| `PHOTON_SIDECAR_AUTOSTART` | 接続時に Node のサイドカーを起動します（`true`/`false`、既定値 `true`）。 |
| `PHOTON_NODE_BIN` | node のバイナリのパスです（既定値: `shutil.which('node')`）。 |
| `PHOTON_DASHBOARD_HOST` | Photon Dashboard API のホストです（既定値 `https://app.photon.codes`）。 |
| `PHOTON_SPECTRUM_HOST` | Photon Spectrum API のホストです（既定値 `https://spectrum.photon.codes`）。 |

### Buzz（Nostr のコミュニティ） {#buzz-nostr-communities}

| 変数 | 説明 |
|----------|-------------|
| `BUZZ_RELAY_URL` | Buzz のコミュニティのリレーのベース URL です（たとえば `https://mycommunity.communities.buzz.xyz`） |
| `BUZZ_PRIVATE_KEY` | エージェントの Buzz の identity に使う Nostr の秘密鍵です（nsec または 16 進数）。Buzz で唯一の秘密情報です |
| `BUZZ_CREDENTIALS_FILE` | nsec を収めた JSON の資格情報ファイルです（`BUZZ_PRIVATE_KEY` を設定していないときに使われます） |
| `BUZZ_CHANNELS` | 見張るチャンネルの UUID をカンマ区切りで指定します（既定では参加しているすべてのチャンネル） |
| `BUZZ_HOME_CHANNEL` | cron や通知の配信先となるチャンネルの UUID です（既定では最初に見張っているチャンネル） |
| `BUZZ_ALLOWED_USERS` | エージェントと会話できる npub または 16 進数の公開鍵をカンマ区切りで指定します |
| `BUZZ_ALLOW_ALL_USERS` | コミュニティのメンバーなら誰でもエージェントと会話できるようにします（`true`/`false`） |
| `BUZZ_TRANSPORT` | 受信の方式です。`auto`（WebSocket、失敗したらポーリング。既定値）、`websocket`、`poll` から選びます |
| `BUZZ_POLL_INTERVAL` | 受信のポーリングを行う間隔を秒で指定します（既定値: `4`） |
| `BUZZ_AUTH_TAG` | NIP-42 の WebSocket 認証で使う NIP-OA の所有者証明の認証タグの JSON です（任意） |
| `BUZZ_CLI_PATH` | buzz の CLI のバイナリのパスです（既定では PATH 上の `buzz`、次に `~/bin/buzz`） |

### Microsoft Teams（アダプター） {#microsoft-teams-adapter}

Microsoft Teams のプラットフォームアダプターです（Bot Framework / Azure AD）。前述の [Microsoft Graph（Teams の会議）](#microsoft-graph-teams-meetings) の連携とは別物です。[Teams のメッセージングガイド](/hermes/docs/user-guide/messaging/teams/) を参照してください。

| 変数 | 説明 |
|----------|-------------|
| `TEAMS_CLIENT_ID` | Azure AD のアプリケーション（Bot Framework）のクライアント ID です。 |
| `TEAMS_CLIENT_SECRET` | Azure AD のアプリケーションのクライアントシークレットです。 |
| `TEAMS_TENANT_ID` | ボットのアプリケーションを置いている Azure AD のテナント ID です。 |
| `TEAMS_HOST` | webhook が待ち受けるホストです（既定では未設定で、IPv4 と IPv6 の両方のすべてのインターフェースになります）。 |
| `TEAMS_PORT` | webhook が待ち受けるポートです（Bot Framework の既定値: `3978`）。 |
| `TEAMS_ALLOWED_USERS` | ボットと会話できる Teams の利用者 ID または UPN をカンマ区切りで指定します。 |
| `TEAMS_ALLOW_ALL_USERS` | どの Teams 利用者でもボットを動かせるようにします（開発時のみ）。 |
| `TEAMS_HOME_CHANNEL` | cron や通知の配信先となる既定のチャットまたはチャンネルの ID です。 |
| `TEAMS_HOME_CHANNEL_NAME` | Teams のホームチャンネルの表示名です。 |

### Raft {#raft}

| 変数 | 説明 |
|----------|-------------|
| `RAFT_PROFILE` | Raft のエージェントのプロファイルのスラッグです。設定するとアダプターが自動で有効になります。 |

### メッセージングの詳細な調整 {#advanced-messaging-tuning}

送信メッセージのまとめ役を絞るための、プラットフォームごとの上級者向けのつまみです。ほとんどの利用者が触る必要はありません。既定値は、各プラットフォームのレート制限を守りつつ、もたつきを感じない値になっています。

| 変数 | 説明 |
|----------|-------------|
| `HERMES_TELEGRAM_TEXT_BATCH_DELAY_SECONDS` | 待機中の Telegram のテキストのかたまりを送り出すまでの猶予です（既定値: `0.6`）。 |
| `HERMES_TELEGRAM_TEXT_BATCH_SPLIT_DELAY_SECONDS` | 1 通の Telegram のメッセージが長さの上限を超えて分割されるときの、かたまりの間隔です（既定値: `2.0`）。 |
| `HERMES_SIMPLEX_TEXT_BATCH_DELAY` | 立て続けに届いたテキストのメッセージを1つの MessageEvent にまとめるための、静かな時間の秒数です（既定値: `0.8`）。Telegram のテキストのまとめ方と同じ考え方です。 |
| `HERMES_TELEGRAM_MEDIA_BATCH_DELAY_SECONDS` | 待機中の Telegram のメディアを送り出すまでの猶予です（既定値: `0.6`）。 |
| `HERMES_TELEGRAM_FOLLOWUP_GRACE_SECONDS` | エージェントの処理が終わったあと、追いかけのメッセージを送るまでの待ち時間です。ストリームの最後のかたまりと競合しないようにします。 |
| `HERMES_TELEGRAM_HTTP_CONNECT_TIMEOUT` / `_READ_TIMEOUT` / `_WRITE_TIMEOUT` / `_POOL_TIMEOUT` | 内部で使う `python-telegram-bot` の HTTP のタイムアウトを上書きします（秒）。 |
| `HERMES_TELEGRAM_INIT_TIMEOUT` | ゲートウェイの起動時に行う Telegram の `initialize()` の接続処理について、1 回の試行あたりの上限を秒で指定します。到達できないフォールバック IP の連鎖が起動をいつまでも止めないようにします（既定値: `30`）。 |
| `HERMES_TELEGRAM_HTTP_POOL_SIZE` | Telegram API への同時 HTTP 接続数の上限です。 |
| `HERMES_TELEGRAM_DISABLE_FALLBACK_IPS` | DNS が引けないときに使う、埋め込みの Cloudflare のフォールバック IP を無効にします（`true`/`false`）。 |
| `HERMES_DISCORD_TEXT_BATCH_DELAY_SECONDS` | 待機中の Discord のテキストのかたまりを送り出すまでの猶予です（既定値: `0.6`）。 |
| `HERMES_DISCORD_TEXT_BATCH_SPLIT_DELAY_SECONDS` | Discord のメッセージが長さの上限を超えて分割されるときの、かたまりの間隔です（既定値: `2.0`）。 |
| `HERMES_DISCORD_LIVENESS_INTERVAL_SECONDS` | `discord.websocket_liveness_interval_seconds` を互換のために手動で上書きするものです。動作中の Discord Gateway の WebSocket を確認する間隔です（既定値: `15`。`0` にすると無効になります）。`config.yaml` のキーを使うほうが向いています。 |
| `HERMES_DISCORD_LIVENESS_FAILURE_THRESHOLD` | `discord.websocket_liveness_failure_threshold` を互換のために手動で上書きするものです。強制的に再接続するまでに、WebSocket の状態が続けて不調と判定される回数です（既定値: `2`）。`config.yaml` のキーを使うほうが向いています。 |
| `HERMES_MATRIX_TEXT_BATCH_DELAY_SECONDS` / `_SPLIT_DELAY_SECONDS` | Telegram のまとめ役のつまみに対応する Matrix 版です。 |
| `HERMES_FEISHU_TEXT_BATCH_DELAY_SECONDS` / `_SPLIT_DELAY_SECONDS` / `_MAX_CHARS` / `_MAX_MESSAGES` | Feishu のまとめ役の調整です。猶予、分割の間隔、1 通あたりの最大文字数、1 回のまとまりあたりの最大メッセージ数を指定します。 |
| `HERMES_FEISHU_MEDIA_BATCH_DELAY_SECONDS` | Feishu のメディアを送り出すまでの待ち時間です。 |
| `HERMES_FEISHU_DEDUP_CACHE_SIZE` | Feishu の webhook の重複除去のキャッシュの大きさです（既定値: `1024`）。 |
| `HERMES_WECOM_TEXT_BATCH_DELAY_SECONDS` / `_SPLIT_DELAY_SECONDS` | WeCom のまとめ役の調整です。 |
| `HERMES_VISION_DOWNLOAD_TIMEOUT` | 画像を視覚モデルに渡す前にダウンロードするときのタイムアウトを秒で指定します（既定値: `30`）。 |
| `HERMES_VISION_MAX_CONCURRENCY` | プロセス全体での画像の**エンコードやリサイズ**の同時実行数の上限です（`auxiliary.vision.max_concurrency` の上書き。既定値はホストの CPU のコア数で、上限はありません）。CPU を使うエンコードの工程だけを抑えることで、動画のフレームを一気に処理してもすべてのコアを使い切ってイベントループを詰まらせないようにします。LLM の呼び出し自体は完全に並行のままです。`< 1` の値は無視されます。 |
| `HERMES_RESTART_DRAIN_TIMEOUT` | ゲートウェイの設定です。`/restart` のときに、動作中の処理が終わるのを待つ秒数で、これを過ぎると強制的に再起動します（既定値: `900`）。 |
| `HERMES_GATEWAY_PLATFORM_CONNECT_TIMEOUT` | ゲートウェイの起動時と再接続時の、プラットフォームごとの接続のタイムアウトです（秒。`0` や負の値なら無制限に待ちます）。接続の試行*と* Discord のアダプターの ready 待ちの両方に効くので、同期するスラッシュコマンドが多いアカウントでも起動の途中で打ち切られません。`config.yaml` の `gateway.platform_connect_timeout`（既定値 `30`）から引き継がれますが、この環境変数は手動の上書きで、明示的に設定した場合はこちらが優先されます。 |
| `HERMES_GATEWAY_BUSY_INPUT_MODE` | ゲートウェイが処理中に入力を受けたときの既定の振る舞いです。`queue`、`steer`、`interrupt` から選びます。チャットごとに `/busy` で上書きできます。 |
| `HERMES_GATEWAY_BUSY_ACK_ENABLED` | エージェントが処理中に入力が届いたとき、ゲートウェイが受け取った旨のメッセージ（⚡/⏳/⏩）を送るかどうかです（既定値: `true`）。`false` にするとこれらのメッセージを完全に止められます。入力自体は今までどおり待機・誘導・割り込みとして扱われ、チャットへの返答だけが出なくなります。`config.yaml` の `display.busy_ack_enabled` から引き継がれます。 |
| `HERMES_GATEWAY_NO_SUPERVISE` | s6-overlay の Docker イメージの中で `hermes gateway run` を動かすとき、自動の監視をやめて s6 導入前と同じ前面での動き方にします（自動再起動なし、ゲートウェイがコンテナーの主プロセスになります）。真とみなされる値は `1`、`true`、`yes` です。CLI の `--no-supervise` フラグと同じ働きです。s6 のイメージの外では何もしません。 |
| `HERMES_GATEWAY_BOOTSTRAP_STATE` | s6-overlay の Docker イメージの中で、まっさらなボリュームでのゲートウェイの**最初の**監視状態を宣言します。空のボリュームには保存された `gateway_state.json` がないため、起動時の調整処理は `gateway-default` の枠を登録しつつ、**停止したまま**にします（最後に記録された状態が `running` のときだけ自動で起動するからです）。これを `running` にすると、初回起動時のセットアップフックが調整処理の*前に* `gateway_state.json` を用意するので、いちばん最初の起動からゲートウェイが立ち上がります。`running` という値そのものだけが有効です。効くのは初回起動時だけで、すでにある `gateway_state.json` が上書きされることはありません。そのため、意図して止めたゲートウェイは再起動後も止まったままになります。s6 のイメージの外では何もしません。 |
| `GATEWAY_RELAY_URL` | 実験的なリレーのコネクターの WebSocket のベース URL です。設定すると、ゲートウェイは汎用の `relay` アダプターを登録し、コネクターへ外向きに接続します。`config.yaml` の `gateway.relay_url` に対応します。 |
| `GATEWAY_RELAY_ID` | `hermes gateway enroll` または管理された自動登録で割り当てられるリレーのゲートウェイの識別子です。`gateway.relay_id` に対応します。 |
| `GATEWAY_RELAY_SECRET` | WebSocket の認証に使う、ゲートウェイごとのリレーの秘密情報です。すでに設定されている場合、管理された自動登録は行われません。`gateway.relay_secret` に対応します。 |
| `GATEWAY_RELAY_DELIVERY_KEY` | リレーやパススルーの認証との互換のために残されている、コネクターが発行する配信キーです。現在のリレーの受信メッセージは、ゲートウェイ側の HTTP の受け口ではなく外向きの WebSocket で届きます。 |
| `GATEWAY_RELAY_ENROLL_TOKEN` | `--token` を明示的に渡さなかったときに `hermes gateway enroll` が使う登録用のトークンです。 |
| `GATEWAY_RELAY_PLATFORM` | リレーの能力の記述に載せるプラットフォーム名です（任意）。 |
| `GATEWAY_RELAY_BOT_ID` | リレーの能力の記述に載せるボットの識別子です（任意）。 |
| `GATEWAY_RELAY_ENDPOINT` | コールバックやパススルーの URL を必要とするコネクターのモード向けに公開するゲートウェイのエンドポイントです（任意）。既定の WebSocket のみで受信するリレーの経路では不要です。`gateway.relay_endpoint` に対応します。 |
| `GATEWAY_RELAY_ROUTE_KEYS` | コネクターに知らせるリレーのルートのキーをカンマ区切りで指定します。`gateway.relay_route_keys` に対応します。 |
| `HERMES_FILE_MUTATION_VERIFIER` | やり取りごとにファイルの変更を確かめる末尾の表示を有効にします（既定値: `true`）。有効にすると、そのやり取りの中で失敗し、そのあと成功する書き込みで置き換えられなかった `write_file` / `patch` の呼び出しを、Hermes が参考情報として一覧にして付け足します。`0`、`false`、`no`、`off` のいずれかにすると出なくなります。`config.yaml` の `display.file_mutation_verifier` に対応し、環境変数を設定した場合はそちらが優先されます。 |
| `HERMES_CRON_TIMEOUT` | cron のジョブでエージェントを動かすときの、無操作のタイムアウトを秒で指定します（既定値: `600`）。ツールを呼び出し続けている間やストリームのトークンを受け取っている間は、エージェントはいくらでも動き続けられます。これが働くのは何もしていないときだけです。`0` にすると無制限になります。 |
| `HERMES_CRON_SCRIPT_TIMEOUT` | cron のジョブに付けた実行前のスクリプトのタイムアウトを秒で指定します（既定値: `3600`）。制限がかかるのはスクリプトだけで、スキルやエージェントのジョブは別枠の `HERMES_CRON_TIMEOUT` の無操作の持ち時間を使います。`config.yaml` の `cron.script_timeout_seconds` でも設定できます。 |
| `HERMES_CRON_MEDIA_SEND_TIMEOUT` | 動作中のゲートウェイのアダプター経由で cron の配信をするときに、添付メディアを 1 件送るごとのタイムアウトを秒で指定します（既定値: `300`）。大きな添付（長い音声合成の音声や大きな書き出し）のアップロードがタイムアウトするなら、この値を上げてください。`config.yaml` の `cron.media_send_timeout_seconds` でも設定できます。 |
| `HERMES_CRON_MAX_PARALLEL` | 1 回のチックで並行して動かす cron のジョブの上限です（既定値: `4`）。 |

## NeMo Relay {#nemo-relay}

| 変数 | 説明 |
|----------|-------------|
| `HERMES_NEMO_RELAY_PLUGINS_TOML` | Hermes のコアがプロセス全体で読み込む、標準の NeMo Relay の `plugins.toml` のパスを明示します。設定しなければ、Hermes は Relay のミドルウェア、動的なプラグイン、エクスポーターのいずれも初期化しません。廃止された `HERMES_NEMO_RELAY_ATOF_*` と `HERMES_NEMO_RELAY_ATIF_*` の変数は無視されます。これらの出力は、指定したファイルの中で設定してください。[NeMo Relay の可観測性の設定](https://docs.nvidia.com/nemo/relay/configure-plugins/observability/about) を参照してください。 |

## エージェントの振る舞い {#agent-behavior}

| 変数 | 説明 |
|----------|-------------|
| `HERMES_MAX_ITERATIONS` | 1 つの会話でツールを呼び出す繰り返しの上限です（既定値: 500） |
| `HERMES_INFERENCE_MODEL` | プロセス単位でモデル名を上書きします（そのセッションでは `config.yaml` より優先されます）。`-m`/`--model` フラグでも指定できます。 |
| `HERMES_YOLO_MODE` | `1` にすると、危険なコマンドの承認の確認を省きます。`--yolo` と同じ働きです。 |
| `HERMES_ACCEPT_HOOKS` | `config.yaml` に書かれている未確認のシェルフックを、TTY での確認なしに自動で承認します。`--accept-hooks` や `hooks_auto_accept: true` と同じ働きです。 |
| `HERMES_IGNORE_USER_CONFIG` | `~/.hermes/config.yaml` を読まず、組み込みの既定値を使います（`.env` の資格情報は引き続き読み込まれます）。`--ignore-user-config` と同じ働きです。 |
| `HERMES_IGNORE_RULES` | `AGENTS.md`、`SOUL.md`、`.cursorrules`、記憶、事前読み込みのスキルの自動の差し込みをやめます。`--ignore-rules` と同じ働きです。 |
| `HERMES_SAFE_MODE` | 問題の切り分け用のモードです。カスタマイズをすべて無効にし、プラグインの探索、MCP サーバーの読み込み、シェルフックの登録を行いません。`--safe-mode` を付けると自動で設定されます（このフラグは上の 2 つも一緒に設定します）。 |
| `HERMES_TOOL_PROGRESS` | config-v12 を最低ラインとして以降は使えなくなり、この変数は無視されます。`config.yaml` の `display.tool_progress` を使ってください。 |
| `HERMES_TOOL_PROGRESS_MODE` | ツールの進捗表示のモードを指定する、互換のために残された非推奨の変数です（ゲートウェイは今も予備として読みます）。`config.yaml` の `display.tool_progress` を使うほうが向いています。 |
| `HERMES_HUMAN_DELAY_MODE` | 応答の間の取り方です。`off`/`natural`/`custom` から選びます |
| `HERMES_HUMAN_DELAY_MIN_MS` | 自分で指定する遅延の下限です（ミリ秒） |
| `HERMES_HUMAN_DELAY_MAX_MS` | 自分で指定する遅延の上限です（ミリ秒） |
| `HERMES_QUIET` | 重要でない出力を抑えます（`true`/`false`） |
| `CODEX_HOME` | [Codex app-server ランタイム](/hermes/docs/user-guide/features/codex-app-server-runtime/) を有効にしているとき、Codex CLI が設定と認証情報を読むディレクトリを上書きします（既定値: `~/.codex`）。Hermes の移行処理は、管理下のブロックを `<CODEX_HOME>/config.toml` に書き込みます。 |
| `HERMES_KANBAN_TASK` | かんばんのディスパッチャーがワーカーを起動するときに設定します（タスクの UUID）。ワーカーと、そこから起動される `hermes-tools` の MCP の子プロセスがこれを引き継ぐので、かんばんのツールが正しく制御されます。自分で設定しないでください。 |
| `HERMES_ACP_SKIP_CONFIGURED_MCP` | [ACP のホスト](/hermes/docs/user-guide/features/acp/#host-integration) が、自分で起動する Hermes の子プロセスに設定します。`1` にすると、ACP の JSON-RPC のループの前に `config.yaml` で全体設定されている MCP サーバーを起動しなくなります。セッションの MCP サーバーを自分で `session/new` から渡すホスト向けです。ACP のセッションが指定したサーバーは今までどおり登録されます。それ以外の値では既定の動作のままです。自分で設定しないでください。 |
| `HERMES_API_TIMEOUT` | LLM の API 呼び出しのタイムアウトを秒で指定します（既定値: `1800`） |
| `HERMES_API_CALL_STALE_TIMEOUT` | ストリームを使わない呼び出しが応答しなくなったと判断するまでのタイムアウトを秒で指定します（既定値: `90`）。設定しなければローカルのプロバイダーでは自動で無効になり、非常に大きなコンテキストでは自動で長くなることがあります。`config.yaml` の `providers.<id>.stale_timeout_seconds` や `providers.<id>.models.<model>.stale_timeout_seconds` でも設定できます。 |
| `HERMES_STREAM_READ_TIMEOUT` | ストリームのソケットの読み取りのタイムアウトを秒で指定します（既定値: `120`）。ローカルのプロバイダーでは自動で `HERMES_API_TIMEOUT` まで引き上げられます。長いコード生成の途中でローカルの LLM がタイムアウトするなら、値を大きくしてください。 |
| `HERMES_STREAM_STALE_TIMEOUT` | ストリームが止まったと判断するまでのタイムアウトを秒で指定します（既定値: `180`）。ローカルのプロバイダーでは自動で無効になります。この時間内にかたまりが届かないと、接続を切ります。 |
| `HERMES_LOCAL_STREAM_STALE_TIMEOUT` | ローカルのプロバイダー（Ollama、oMLX、llama-cpp）でストリームが止まったと判断するまでの上限を秒で指定します（既定値: `900`）。基本の判定のタイムアウトが既定値のままで、ローカルのエンドポイントだと分かった場合、以前のように無期限に無効にするのではなく、この有限の上限が使われます。これにより、動かなくなったローカルのサーバーがいつまでも待たされずに検知されます。`config.yaml` の `agent.local_stream_stale_timeout` でも設定できます。 |
| `HERMES_STREAM_RETRIES` | 一時的なネットワークのエラーが起きたときに、ストリームの途中で再接続を試す回数です（既定値: `3`）。 |
| `HERMES_STREAM_STALE_GIVEUP` | やり取りをまたぐサーキットブレーカーです。応答が完了しないまま、止まったと判断して接続を切ることがこの回数だけ続いたら（ストリームの有無を問いません）、以降は判定のタイムアウトを待ち直さずに、対処のわかるエラーを出してすぐ中止します（既定値: `5`、`0` で無効）。応答が完了したとき、`/model` で切り替えたとき、フォールバックが働いたとき、やり取りの開始時に本来のモデルへ戻ったときに、回数はリセットされます。 |
| `HERMES_AGENT_TIMEOUT` | ゲートウェイで、動作中のエージェントが何もしなくなってから終了するまでの秒数です（既定値: `1800`、30 分）。ツールの呼び出しやストリームのトークンのたびにリセットされます。`0` にすると無効になります。 |
| `HERMES_GATEWAY_MAX_STARTS` | 再起動の連鎖を止めるサーキットブレーカーです。一定の時間内にゲートウェイを（再）起動できる回数の上限で、これを超えると指数的に間隔を空けて待ち、連鎖を断ち切ります（既定値: `5`、`0` で無効）。`config.yaml` の `gateway.respawn_storm.max_starts` でも設定できます。 |
| `HERMES_GATEWAY_START_WINDOW_S` | 再起動の連鎖を止める判定の時間の幅を秒で指定します（既定値: `120`）。`config.yaml` の `gateway.respawn_storm.window_seconds` でも設定できます。 |
| `HERMES_AGENT_TIMEOUT_WARNING` | ゲートウェイの設定です。何もしない時間がこの秒数を超えたら警告のメッセージを送ります（既定値: `HERMES_AGENT_TIMEOUT` の 75%）。 |
| `HERMES_AGENT_NOTIFY_INTERVAL` | ゲートウェイの設定です。エージェントの処理が長引いているときに、進捗の通知を送る間隔を秒で指定します。 |
| `HERMES_CHECKPOINT_TIMEOUT` | ファイルシステムのチェックポイントを作るときのタイムアウトを秒で指定します（既定値: `30`）。 |
| `HERMES_EXEC_ASK` | ゲートウェイモードで、実行の承認を確認するようにします（`true`/`false`） |
| `HERMES_ENABLE_PROJECT_PLUGINS` | エージェントの読み込み側とダッシュボードのウェブサーバーの両方で、リポジトリ内の `./.hermes/plugins/` にあるプラグインを自動で見つけられるようにします。真とみなす値は標準どおり `1` / `true` / `yes` / `on`（大文字小文字を区別しません）です。それ以外はすべて — `0`、`false`、`no`、`off`、空文字列を含めて — **無効**として扱われます（既定）。なお、GHSA-5qr3-c538-wm9j（#29156）以降、この変数を有効にしていても、ダッシュボードのウェブサーバーはプロジェクトのプラグインの Python の `api` ファイルを自動で読み込みません。プロジェクトのプラグインは静的な JS / CSS で画面を拡張できますが、バックエンドのルートは `~/.hermes/plugins/` の下に移したときにだけ読み込まれます。 |
| `HERMES_PLUGINS_DEBUG` | `1`/`true` にすると、プラグインの探索の詳しいログを標準エラー出力に出します。走査したディレクトリ、読み取ったマニフェスト、飛ばした理由、解析や `register()` の失敗時の完全なトレースバックが出ます。プラグインの作者向けです。 |
| `HERMES_BACKGROUND_NOTIFICATIONS` | ゲートウェイでのバックグラウンドのプロセスの通知の出し方です。`concise`（既定値）、`all`、`result`、`error`、`off` から選びます |
| `HERMES_EPHEMERAL_SYSTEM_PROMPT` | API 呼び出し時に差し込む一時的なシステムプロンプトです（セッションには保存されません） |
| `HERMES_PREFILL_MESSAGES_FILE` | API 呼び出し時に差し込む一時的なプリフィルメッセージを収めた JSON ファイルのパスです。 |
| `HERMES_ALLOW_PRIVATE_URLS` | `true`/`false` — ツールが localhost やプライベートネットワークの URL を取得できるようにします。ゲートウェイモードでは既定で無効です。 |
| `HERMES_REDACT_SECRETS` | `true`/`false` — ツールの出力、ログ、チャットの応答で秘密情報を伏せるかどうかを制御します（既定値: `true`）。 |
| `HERMES_WRITE_SAFE_ROOT` | 指定したディレクトリの外への `write_file`/`patch` の書き込みを**完全に禁じる**ディレクトリの接頭辞です（任意。承認の確認も出ません）。`os.pathsep`（Unix では `:`、Windows では `;`）で区切って複数のディレクトリを指定できます。下の [HERMES_WRITE_SAFE_ROOT](#hermes_write_safe_root) を参照してください。 |
| `HERMES_DISABLE_LAZY_INSTALLS` | 公式の Docker イメージで自動的に設定される内部ブリッジ用の変数で、書き換えできない `/opt/hermes` のツリーに実行時の依存関係が入るのを防ぎます。利用者が使うのは `config.yaml` の `security.allow_lazy_installs: false` のほうです。これを `.env` に書かないでください。 |
| `HERMES_DISABLE_FILE_STATE_GUARD` | `1` にすると、`patch`/`write_file` での「読んだあとにファイルが変わっています」という保護を無効にします。 |
| `HERMES_BUNDLED_SKILLS` | 起動時に読み込む同梱スキルの一覧をカンマ区切りで上書きします。 |
| `HERMES_OPTIONAL_SKILLS` | 初回起動時に自動でインストールする追加スキルの名前をカンマ区切りで指定します。 |
| `HERMES_DEBUG_INTERRUPT` | `1` にすると、割り込みや取り消しの詳しい追跡を `agent.log` に記録します。 |
| `HERMES_DUMP_REQUESTS` | API リクエストの中身をログファイルに書き出します（`true`/`false`） |
| `HERMES_DUMP_REQUEST_STDOUT` | API リクエストの中身を、ログファイルではなく標準出力に書き出します。 |
| `HERMES_OAUTH_TRACE` | `1` にすると、OAuth のトークンの交換と更新の試みを記録します。伏せ字にした時間の情報も含まれます。 |
| `HERMES_AGENT_HELP_GUIDANCE` | 独自の構成向けに、システムプロンプトへ案内の文章を追加します。 |
| `HERMES_AGENT_LOGO` | CLI の起動時に出る ASCII のバナーのロゴを差し替えます。 |
| `DELEGATION_MAX_CONCURRENT_CHILDREN` | `delegate_task` の 1 回のまとまりで並行して動かすサブエージェントの上限です（既定値: `3`、下限は 1、上限なし）。`config.yaml` の `delegation.max_concurrent_children` でも設定でき、設定ファイルの値が優先されます。 |

### HERMES_WRITE_SAFE_ROOT {#hermes_write_safe_root}

この変数を設定すると、`write_file` と `patch` は、指定したディレクトリの接頭辞の中にあるパスしか対象にできなくなります。そこから外れるパスは**その場で拒否されます** — 危険なコマンドの承認の仕組みを通らず、上書きするための確認も出ません。

公式の Docker イメージでは、`HERMES_HOME=/opt/data` と合わせて `HERMES_WRITE_SAFE_ROOT=/opt/data` を設定しており、エージェントはマウントされたデータのボリュームから出られません。

**書き込みを閉じ込めるつもりがないなら、これを `~/.hermes/.env` に書かないでください。** よくある失敗は、プロジェクトのディレクトリを指定したまま、エージェントに `~/.hermes/cron/jobs.json` や `~/.hermes/skills/`、プロファイル配下のスクリプトを編集させようとすることです。これらのパスは閉じ込めた範囲の外なので、そこへの `write_file`/`patch` はすべて `outside HERMES_WRITE_SAFE_ROOT` のエラーで失敗します。

作業用のディレクトリと Hermes の状態の両方を許可するには、両方の接頭辞を並べてください（順番は問いません）。

```bash
export HERMES_WRITE_SAFE_ROOT=/path/to/project:/home/you/.hermes
```

この変数を解除するか `.env` から削除すると、通常どおり書き込めるようになります（それでも資格情報のパスの禁止リストは適用されます — [ファイル書き込みの安全対策](/hermes/docs/user-guide/security/#file-write-safety) を参照してください）。

## 画面まわり {#interface}

| 変数 | 説明 |
|----------|-------------|
| `HERMES_TUI` | `1` にすると、従来の CLI ではなく [TUI](/hermes/docs/user-guide/tui/) を起動します。`--tui` を付けるのと同じです。 |
| `HERMES_TUI_DIR` | ビルド済みの `ui-tui/` ディレクトリのパスです（`dist/entry.js` と中身の入った `node_modules` が必要です）。初回起動時の `npm install` を省くために、ディストリビューションや Nix が使います。 |
| `HERMES_TUI_RESUME` | 起動時に、指定した ID の TUI のセッションを再開します。設定すると、`hermes --tui` は新しいセッションを作らずに、その名前のセッションを引き継ぎます。接続が切れたときやターミナルが落ちたときの復帰に便利です。 |
| `HERMES_TUI_THEME` | TUI の配色を固定します。`light`、`dark`、または背景色の 6 文字の 16 進数（たとえば `ffffff` や `1a1a2e`）を指定します。設定しなければ、Hermes は `COLORFGBG` とターミナルへの背景色の問い合わせで自動判定します。この変数は、`COLORFGBG` を設定しないターミナル（Ghostty、Warp、iTerm2 など）で自動判定を上書きします。 |
| `HERMES_INFERENCE_MODEL` | `config.yaml` を書き換えずに、`hermes -z` / `hermes chat` で使うモデルを固定します。`--provider` フラグと組み合わせて使います。実行ごとに既定のモデルを変えたい、スクリプトからの呼び出し（sweeper、CI、一括実行）で便利です。 |

## セッションの設定 {#session-settings}

| 変数 | 説明 |
|----------|-------------|
| `SESSION_IDLE_MINUTES` | 何もしない時間が N 分続いたらセッションをリセットします（既定値: 1440） |
| `SESSION_RESET_HOUR` | 毎日リセットする時刻を 24 時間制で指定します（既定値: 4 = 午前 4 時） |
| `HERMES_SESSION_ID` | Hermes が起動する**すべてのツールの子プロセスに自動で渡されます**（`terminal`、`execute_code`、常駐シェル、Docker / Singularity のバックエンド、委任したサブエージェントの実行）。エージェントが現在のセッション ID を設定します。ツールから呼ばれる利用者のスクリプトは、これを読むことで自分の出力やテレメトリー、副作用を、元の Hermes のセッションと結び付けられます。**自分で設定しないでください** — 親のシェルから上書きしても、エージェントの実行の外でしか効かず、エージェントがセッションを始めた時点で上書きされます。 |
| `AI_AGENT` | **CLI とゲートウェイの入口で `hermes-agent` に設定され**（外側の仕組みがすでに設定している場合を除きます）、ターミナルツールのすべてのシェルに渡されます。リモートのバックエンド（Docker、SSH、Modal、Daytona、Singularity、Vercel）にも渡されます。子プロセスに自分の出自を伝えるための、エージェントをまたいだ標準になりつつあるものです。汎用のツール（たとえば huggingface_hub のエージェント判定）は、これを読んで AI エージェントの下で動いていることを知ります。値は、公開されているエージェントのハーネスの登録簿にある Hermes の ID と同じです。自分で設定しないでください。 |
| `HERMES_AGENT` | **CLI とゲートウェイの入口で `true` に設定され**、ターミナルツールのすべてのシェルに渡されます。子プロセスが、とくに Hermes の中で動いていると判別できるようにするためのものです。自分で設定しないでください。 |

## コンテキストの圧縮（config.yaml のみ） {#context-compression-configyaml-only}

コンテキストの圧縮は `config.yaml` だけで設定します — 対応する環境変数はありません。しきい値の設定は `compression:` のブロックにあり、要約に使うモデルとプロバイダーは `auxiliary.compression:` の下にあります。

```yaml
compression:
  enabled: true
  threshold: 0.50
  target_ratio: 0.20         # fraction of threshold to preserve as recent tail
  protect_last_n: 20         # minimum recent messages to keep uncompressed
```

:::info 以前の設定からの移行
`compression.summary_model`、`compression.summary_provider`、`compression.summary_base_url` を使っている古い設定は、最初の読み込み時に自動で `auxiliary.compression.*` へ移されます。
:::

## 補助タスクの上書き {#auxiliary-task-overrides}

| 変数 | 説明 |
|----------|-------------|
| `AUXILIARY_VISION_PROVIDER` | 画像を扱うタスクのプロバイダーを上書きします |
| `AUXILIARY_VISION_MODEL` | 画像を扱うタスクのモデルを上書きします |
| `AUXILIARY_VISION_BASE_URL` | 画像を扱うタスクで直接使う OpenAI 互換のエンドポイントです |
| `AUXILIARY_VISION_API_KEY` | `AUXILIARY_VISION_BASE_URL` と組み合わせて使う API キーです |
| `AUXILIARY_WEB_EXTRACT_PROVIDER` | ウェブの本文抽出や要約のプロバイダーを上書きします |
| `AUXILIARY_WEB_EXTRACT_MODEL` | ウェブの本文抽出や要約のモデルを上書きします |
| `AUXILIARY_WEB_EXTRACT_BASE_URL` | ウェブの本文抽出や要約で直接使う OpenAI 互換のエンドポイントです |
| `AUXILIARY_WEB_EXTRACT_API_KEY` | `AUXILIARY_WEB_EXTRACT_BASE_URL` と組み合わせて使う API キーです |

タスクごとに直接エンドポイントを指定した場合、Hermes はそのタスクに設定された API キーか `OPENAI_API_KEY` を使います。そうした独自のエンドポイントに `OPENROUTER_API_KEY` を使い回すことはありません。

## フォールバックのプロバイダー（config.yaml のみ） {#fallback-providers-configyaml-only}

主に使うモデルのフォールバックの連鎖は `config.yaml` だけで設定します — 対応する環境変数はありません。トップレベルに `provider` と `model` のキーを持つ `fallback_providers` のリストを足すと、主のモデルでエラーが起きたときに自動で切り替わります。プロバイダーが `auto` の補助タスクも、Hermes の組み込みの補助プロバイダーの探索より先にこの連鎖を見ます。

```yaml
fallback_providers:
  - provider: openrouter
    model: anthropic/claude-sonnet-4
```

トップレベルにプロバイダーを 1 つだけ書く従来の `fallback_model` の形も、互換のために今も読まれますが、新しく設定するなら `fallback_providers` を使ってください。タスクごとの補助の方針は `config.yaml` の `auxiliary.<task>.fallback_chain` で指定します。こちらにも対応する環境変数はありません。

詳しくは [フォールバックのプロバイダー](/hermes/docs/user-guide/features/fallback-providers/) を参照してください。

## プロバイダーの振り分け（config.yaml のみ） {#provider-routing-configyaml-only}

これらは `~/.hermes/config.yaml` の `provider_routing` セクションに書きます。

| キー | 説明 |
|-----|-------------|
| `sort` | プロバイダーの並べ方です。`"price"`（既定値）、`"throughput"`、`"latency"` から選びます |
| `only` | 許可するプロバイダーのスラッグの一覧です（たとえば `["anthropic", "google"]`） |
| `ignore` | 使わないプロバイダーのスラッグの一覧です |
| `order` | 順に試すプロバイダーのスラッグの一覧です |
| `require_parameters` | リクエストのパラメーターをすべて扱えるプロバイダーだけを使います（`true`/`false`） |
| `data_collection` | `"allow"`（既定値）か、データを保存するプロバイダーを外す `"deny"` を指定します |

:::tip
環境変数の設定には `hermes config set` を使ってください。秘密情報なら `.env`、それ以外なら `config.yaml` と、適切なファイルへ自動で保存されます。
:::
