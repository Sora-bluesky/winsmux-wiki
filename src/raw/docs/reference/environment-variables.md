---
title: "環境変数"
description: "Hermes Agent が使うすべての環境変数の完全な一覧"
upstream_path: reference/environment-variables.md
upstream_blob: 8fb15ecadcd9625396da887999ef15a2f0a9f8a8
sources:
  - https://hermes-agent.nousresearch.com/docs/reference/environment-variables
---

# 環境変数の一覧 {#environment-variables-reference}

Hermes は環境変数をプロセスの環境から読み込みます。利用者が管理する秘密情報については `~/.hermes/.env` からも読み込みます。API キー、ボットトークン、OAuth の秘密情報などの認証情報は `.env` に置いてください。秘密ではない挙動の設定は、対応する設定キーがあるなら `config.yaml` に書くほうが向いています。以下に挙げた変数のなかにはプロセス限定の上書きや内部的な橋渡し用のものもあり、ここに載っているというだけの理由で `.env` に書き込むべきではありません。

## LLM プロバイダ {#llm-providers}

| 変数 | 説明 |
|----------|-------------|
| `OPENROUTER_API_KEY` | OpenRouter の API キー（柔軟に使えるのでおすすめです） |
| `OPENROUTER_BASE_URL` | OpenRouter 互換のベース URL を上書きします |
| `FIREWORKS_API_KEY` | Fireworks AI の API キー（[app.fireworks.ai](https://app.fireworks.ai/settings/users/api-keys)）。エンドポイントの上書きは `config.yaml` の `model.base_url` で設定します。 |
| `HERMES_OPENROUTER_CACHE` | OpenRouter の応答キャッシュを有効にします（`1`/`true`/`yes`/`on`）。config.yaml の `openrouter.response_cache` を上書きします。[Response Caching](https://openrouter.ai/docs/guides/features/response-caching) を参照してください。 |
| `HERMES_OPENROUTER_CACHE_TTL` | キャッシュの TTL（秒、1〜86400）。config.yaml の `openrouter.response_cache_ttl` を上書きします。 |
| `NOUS_BASE_URL` | Nous Portal のベース URL を上書きします（必要になることはまれで、開発・テスト用です） |
| `NOUS_INFERENCE_BASE_URL` | Nous の推論エンドポイントを直接上書きします |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway の API キー（[ai-gateway.vercel.sh](https://ai-gateway.vercel.sh)） |
| `AI_GATEWAY_BASE_URL` | AI Gateway のベース URL を上書きします（既定値: `https://ai-gateway.vercel.sh/v1`） |
| `OPENAI_API_KEY` | OpenAI 互換の独自エンドポイント向けの API キー（`OPENAI_BASE_URL` と組み合わせて使います） |
| `OPENAI_BASE_URL` | 独自エンドポイント（VLLM、SGLang など）のベース URL |
| `LM_API_KEY` | LM Studio（`lmstudio` プロバイダ）の API キー。ローカルサーバーではダミー値を入れておくことが多いです |
| `LM_BASE_URL` | LM Studio のベース URL（既定値: `http://localhost:1234/v1`） |
| `COPILOT_GITHUB_TOKEN` | Copilot API 用の GitHub トークン — 最優先で使われます（OAuth の `gho_*` または fine-grained PAT の `github_pat_*`。classic PAT の `ghp_*` は**サポートされません**） |
| `GH_TOKEN` | GitHub トークン — Copilot では 2 番目に使われます（`gh` CLI でも使われます） |
| `GITHUB_TOKEN` | GitHub トークン — Copilot では 3 番目に使われます |
| `HERMES_COPILOT_ACP_COMMAND` | Copilot ACP の CLI バイナリのパスを上書きします（既定値: `copilot`） |
| `COPILOT_CLI_PATH` | `HERMES_COPILOT_ACP_COMMAND` の別名 |
| `HERMES_COPILOT_ACP_ARGS` | Copilot ACP の引数を上書きします（既定値: `--acp --stdio`） |
| `COPILOT_ACP_BASE_URL` | Copilot ACP のベース URL を上書きします |
| `COPILOT_API_BASE_URL` | Copilot API のベース URL を上書きします（`copilot` プロバイダ） |
| `GLM_API_KEY` | z.ai / ZhipuAI GLM の API キー（[z.ai](https://z.ai)） |
| `ZAI_API_KEY` | `GLM_API_KEY` の別名 |
| `Z_AI_API_KEY` | `GLM_API_KEY` の別名 |
| `GLM_BASE_URL` | z.ai のベース URL を上書きします（既定値: `https://api.z.ai/api/paas/v4`） |
| `KIMI_API_KEY` | Kimi / Moonshot AI の API キー（[moonshot.ai](https://platform.moonshot.ai)） |
| `KIMI_CODING_API_KEY` | `kimi-coding` プロバイダ用の別名キー（`KIMI_API_KEY` と並べて指定できます） |
| `KIMI_BASE_URL` | Kimi のベース URL を上書きします（既定値: `https://api.moonshot.ai/v1`） |
| `KIMI_CN_API_KEY` | Kimi / Moonshot の中国向け API キー（[moonshot.cn](https://platform.moonshot.cn)） |
| `ARCEEAI_API_KEY` | Arcee AI の API キー（[chat.arcee.ai](https://chat.arcee.ai/)） |
| `ARCEE_BASE_URL` | Arcee のベース URL を上書きします（既定値: `https://api.arcee.ai/api/v1`） |
| `GMI_API_KEY` | GMI Cloud の API キー（[gmicloud.ai](https://www.gmicloud.ai/)） |
| `GMI_BASE_URL` | GMI Cloud のベース URL を上書きします（既定値: `https://api.gmi-serving.com/v1`） |
| `ACTUAL_API_KEY` | Actual Computer の推論キー（`ac_...`、[actual.inc/user/keys](https://actual.inc/user/keys)）。ローカルのデーモンでは不要です。 |
| `ACTUAL_BASE_URL` | Actual Computer のベース URL を上書きします（既定値: `https://api.actual.inc/v1`）。ローカルのオフラインデーモンを使うときは `http://127.0.0.1:8080` を指定します。ループバックのホストなら API キーは要りません。 |
| `MINIMAX_API_KEY` | MiniMax の API キー — グローバル向けエンドポイント（[minimax.io](https://www.minimax.io)）。**`minimax-oauth` では使いません**（OAuth の経路ではブラウザでログインします）。 |
| `MINIMAX_BASE_URL` | MiniMax のベース URL を上書きします（既定値: `https://api.minimax.io/anthropic` — Hermes は MiniMax の Anthropic Messages 互換エンドポイントを使います）。**`minimax-oauth` では使いません**。 |
| `MINIMAX_CN_API_KEY` | MiniMax の API キー — 中国向けエンドポイント（[minimaxi.com](https://www.minimaxi.com)）。**`minimax-oauth` では使いません**（OAuth の経路ではブラウザでログインします）。 |
| `MINIMAX_CN_BASE_URL` | MiniMax 中国向けのベース URL を上書きします（既定値: `https://api.minimaxi.com/anthropic`）。**`minimax-oauth` では使いません**。 |
| `KILOCODE_API_KEY` | Kilo Code の API キー（[kilo.ai](https://kilo.ai)） |
| `KILOCODE_BASE_URL` | Kilo Code のベース URL を上書きします（既定値: `https://api.kilo.ai/api/gateway`） |
| `XIAOMI_API_KEY` | Xiaomi MiMo の API キー（[platform.xiaomimimo.com](https://platform.xiaomimimo.com)） |
| `XIAOMI_BASE_URL` | Xiaomi MiMo のベース URL を上書きします（既定値: `https://api.xiaomimimo.com/v1`） |
| `UPSTAGE_API_KEY` | Solar モデル向けの Upstage API キー（[console.upstage.ai](https://console.upstage.ai/api-keys)） |
| `UPSTAGE_BASE_URL` | Upstage のベース URL を上書きします（既定値: `https://api.upstage.ai/v1`） |
| `TOKENHUB_API_KEY` | Tencent TokenHub の API キー（[tokenhub.tencentmaas.com](https://tokenhub.tencentmaas.com)） |
| `TOKENHUB_BASE_URL` | Tencent TokenHub のベース URL を上書きします（既定値: `https://tokenhub.tencentmaas.com/v1`） |
| `TOKENPLAN_API_KEY` | Tencent TokenPlan の API キー（LKEAP、Anthropic Messages エンドポイント） |
| `TOKENPLAN_BASE_URL` | Tencent TokenPlan のベース URL を上書きします（既定値: `https://api.lkeap.cloud.tencent.com/plan/anthropic`） |
| `AZURE_FOUNDRY_API_KEY` | Microsoft Foundry / Azure OpenAI の API キー（[ai.azure.com](https://ai.azure.com/)）。`model.auth_mode: entra_id` のときは不要です |
| `AZURE_FOUNDRY_BASE_URL` | Microsoft Foundry のエンドポイント URL（OpenAI 形式なら `https://<resource>.openai.azure.com/openai/v1`、Anthropic 形式なら `https://<resource>.services.ai.azure.com/anthropic` など） |
| `AZURE_ANTHROPIC_KEY` | `provider: anthropic` に Microsoft Foundry の Claude デプロイを指す `base_url` を組み合わせるときの Azure Anthropic API キー（Anthropic と Azure Anthropic の両方を設定している場合の `ANTHROPIC_API_KEY` の代わりになります） |
| `AZURE_TENANT_ID` | Entra ID のテナント ID（サービスプリンシパル方式。`model.auth_mode: entra_id` のとき `azure-identity` が参照します） |
| `AZURE_CLIENT_ID` | Entra ID のクライアント ID（サービスプリンシパル、ワークロード ID、またはユーザー割り当てのマネージド ID） |
| `AZURE_CLIENT_SECRET` | `EnvironmentCredential` が使うサービスプリンシパルのシークレット |
| `AZURE_CLIENT_CERTIFICATE_PATH` | サービスプリンシパルの証明書（`AZURE_CLIENT_SECRET` の代わりに使えます） |
| `AZURE_FEDERATED_TOKEN_FILE` | AKS Workload Identity / OIDC 方式で使うフェデレーショントークンのファイルパス |
| `AZURE_AUTHORITY_HOST` | ソブリンクラウド向けの authority の上書き（Azure Government なら `https://login.microsoftonline.us` など）。[Azure Foundry ガイド](/hermes/docs/guides/azure-foundry/#sovereign-clouds-government-china)を参照してください |
| `IDENTITY_ENDPOINT` / `MSI_ENDPOINT` | App Service、Functions、Container Apps 向けのマネージド ID エンドポイント。VM はふつう代わりに IMDS を使うので、これらは設定しません |
| `HF_TOKEN` | Inference Providers 用の Hugging Face トークン（[huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)） |
| `HF_BASE_URL` | Hugging Face のベース URL を上書きします（既定値: `https://router.huggingface.co/v1`） |
| `GOOGLE_API_KEY` | Google AI Studio の API キー（[aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)） |
| `GEMINI_API_KEY` | `GOOGLE_API_KEY` の別名 |
| `GEMINI_BASE_URL` | Google AI Studio のベース URL を上書きします |
| `VERTEX_CREDENTIALS_PATH` | Vertex AI（Gemini）用の Google Cloud サービスアカウント JSON のパス。Vertex は静的な API キーではなく OAuth2 を使います。指定がなければ `GOOGLE_APPLICATION_CREDENTIALS`、さらに ADC（`gcloud auth application-default login`）の順に探します。プロジェクトとリージョンは `config.yaml` の `vertex:` の下に書きます |
| `ANTHROPIC_API_KEY` | Anthropic Console の API キー（[console.anthropic.com](https://console.anthropic.com/)） |
| `ANTHROPIC_BASE_URL` | Anthropic API のベース URL を上書きします |
| `ANTHROPIC_TOKEN` | Anthropic の OAuth / セットアップトークンを手動または旧方式で上書きします |
| `DASHSCOPE_API_KEY` | Qwen モデル向けの Qwen Cloud（Alibaba DashScope）API キー（[modelstudio.console.alibabacloud.com](https://modelstudio.console.alibabacloud.com/)） |
| `DASHSCOPE_BASE_URL` | DashScope のベース URL を独自に指定します（既定値: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`。中国本土のリージョンでは `https://dashscope.aliyuncs.com/compatible-mode/v1` を使います） |
| `DASHSCOPE_CN_BASE_URL` | `alibaba-cn`（中国本土）の DashScope ベース URL を上書きします |
| `ALIBABA_CODING_PLAN_API_KEY` | Qwen Coding Plan の API キー（`alibaba-coding-plan` / `alibaba-coding-plan-cn` プロバイダ） |
| `ALIBABA_CODING_PLAN_BASE_URL` | Qwen Coding Plan のベース URL を上書きします（国際版） |
| `ALIBABA_CODING_PLAN_CN_BASE_URL` | Qwen Coding Plan のベース URL を上書きします（中国本土） |
| `ALIBABA_TOKEN_PLAN_API_KEY` | Alibaba Model Studio Token Plan の API キー（`alibaba-token-plan` / `alibaba-token-plan-cn` プロバイダ） |
| `ALIBABA_TOKEN_PLAN_BASE_URL` | Token Plan のベース URL を上書きします（国際版） |
| `ALIBABA_TOKEN_PLAN_CN_BASE_URL` | Token Plan のベース URL を上書きします（中国本土） |
| `DEEPSEEK_API_KEY` | DeepSeek に直接つなぐための DeepSeek API キー（[platform.deepseek.com](https://platform.deepseek.com/api_keys)） |
| `DEEPSEEK_BASE_URL` | DeepSeek API のベース URL を独自に指定します |
| `DEEPINFRA_API_KEY` | DeepInfra の API キー（[deepinfra.com](https://deepinfra.com/dash/api_keys)） |
| `DEEPINFRA_BASE_URL` | DeepInfra のベース URL を上書きします |
| `NOVITA_API_KEY` | NovitaAI の API キー — Model API、Agent Sandbox、GPU Cloud を備えた AI 向けクラウド（[novita.ai/settings/key-management](https://novita.ai/settings/key-management)） |
| `NOVITA_BASE_URL` | NovitaAI のベース URL を上書きします（既定値: `https://api.novita.ai/openai/v1`） |
| `RAMP_ROUTER_API_KEY` | Ramp Router の API キー（[app.router.com/keys](https://app.router.com/keys)）。別名の `ROUTER_API_KEY` も使えます |
| `RAMP_ROUTER_BASE_URL` | Ramp Router のベース URL を上書きします（既定値: `https://api.router.com/v1`） |
| `NEBIUS_API_KEY` | Nebius Token Factory の API キー（[tokenfactory.nebius.com](https://tokenfactory.nebius.com/)）。`NEBIUS_TOKEN_FACTORY_API_KEY` も使えます |
| `NEBIUS_BASE_URL` | Nebius Token Factory のベース URL を上書きします（既定値: `https://api.tokenfactory.nebius.com/v1`） |
| `NVIDIA_API_KEY` | NVIDIA NIM の API キー — Nemotron とオープンモデル向け（[build.nvidia.com](https://build.nvidia.com)） |
| `NVIDIA_BASE_URL` | NVIDIA のベース URL を上書きします（既定値: `https://integrate.api.nvidia.com/v1`。ローカルの NIM エンドポイントを使うなら `http://localhost:8000/v1`） |
| `STEPFUN_API_KEY` | StepFun の API キー — Step 系のモデル向け（[platform.stepfun.com](https://platform.stepfun.com)） |
| `STEPFUN_BASE_URL` | StepFun のベース URL を上書きします（既定値: `https://api.stepfun.com/v1`） |
| `OLLAMA_API_KEY` | Ollama Cloud の API キー — ローカル GPU なしでマネージドの Ollama カタログを使えます（[ollama.com/settings/keys](https://ollama.com/settings/keys)） |
| `OLLAMA_BASE_URL` | Ollama Cloud のベース URL を上書きします（既定値: `https://ollama.com/v1`） |
| `XAI_API_KEY` | xAI（Grok）の API キー。チャットと TTS、ウェブ検索に使います（[console.x.ai](https://console.x.ai/)） |
| `XAI_BASE_URL` | xAI のベース URL を上書きします（既定値: `https://api.x.ai/v1`） |
| `MISTRAL_API_KEY` | Voxtral の TTS と STT に使う Mistral API キー（[console.mistral.ai](https://console.mistral.ai)） |
| `AWS_REGION` | Bedrock で推論するときの AWS リージョン（`us-east-1`、`eu-central-1` など）。boto3 が読み込みます。 |
| `AWS_PROFILE` | Bedrock 認証に使う AWS の名前付きプロファイル（`~/.aws/credentials` を読みます）。未設定のままにすると boto3 の既定の認証情報チェーンを使います。 |
| `BEDROCK_BASE_URL` | Bedrock ランタイムのベース URL を上書きします（既定値: `https://bedrock-runtime.us-east-1.amazonaws.com`。ふつうは未設定のままにして `AWS_REGION` を使います） |
| `HERMES_QWEN_BASE_URL` | Qwen Portal のベース URL を上書きします（既定値: `https://portal.qwen.ai/v1`） |
| `OPENCODE_ZEN_API_KEY` | OpenCode Zen の API キー — 厳選されたモデルを従量課金で使えます（[opencode.ai](https://opencode.ai/auth)） |
| `OPENCODE_ZEN_BASE_URL` | OpenCode Zen のベース URL を上書きします |
| `OPENCODE_GO_API_KEY` | OpenCode Go の API キー — オープンモデル向けの月額 10 ドルのサブスクリプション（[opencode.ai](https://opencode.ai/auth)） |
| `OPENCODE_GO_BASE_URL` | OpenCode Go のベース URL を上書きします |
| `CLAUDE_CODE_OAUTH_TOKEN` | 手動でトークンを書き出す場合に、Claude Code のトークンを明示的に上書きします |
| `HERMES_MODEL` | プロセス単位でモデル名を上書きします（cron のスケジューラが使います。ふだんは `config.yaml` のほうが向いています） |
| `VOICE_TOOLS_OPENAI_KEY` | OpenAI の音声認識と音声合成のプロバイダで優先して使われる OpenAI のキー |
| `HERMES_LOCAL_STT_COMMAND` | ローカルで音声認識を行うコマンドのテンプレート（任意）。`{input_path}`、`{output_dir}`、`{language}`、`{model}` のプレースホルダーが使えます |
| `HERMES_LOCAL_STT_LANGUAGE` | 音声認識で既定として使う言語のヒント。`config.yaml` にプロバイダごとの `language` が指定されていないとき、`local`（faster-whisper）プロバイダ、`HERMES_LOCAL_STT_COMMAND`、ローカルの `whisper` CLI へのフォールバック（既定値: `en`）、Groq、xAI で使われます |
| `HERMES_HOME` | Hermes の設定ディレクトリを上書きします（既定値: `~/.hermes`）。ゲートウェイの PID ファイルと systemd のサービス名の範囲も切り替わるので、複数のインストールを同時に動かせます |
| `HERMES_GIT_BASH_PATH` | **Windows 専用。** ターミナルツールが使う `bash.exe` の探索先を上書きします。Git for Windows のフルインストール、シンボリックリンク経由の WSL の bash、MSYS2、Cygwin など、どの bash でも指定できます。インストーラーは自分が用意した PortableGit を自動でここに設定します。[Windows（ネイティブ）ガイド](/hermes/docs/user-guide/windows-native/#how-hermes-runs-shell-commands-on-windows)を参照してください |
| `HERMES_DISABLE_WINDOWS_UTF8` | **Windows 専用。** `1` を設定すると UTF-8 の標準入出力シム（`configure_windows_stdio()`）を切り、コンソールのロケールのコードページに戻します。文字化けの原因を切り分けるときに役立ちますが、通常の運用でこれが正解になることはまれです |
| `HERMES_KANBAN_HOME` | かんばんボード（DB とワークスペース、ワーカーのログ）の基点となる共有の Hermes ルートを上書きします。指定がなければ `get_default_hermes_root()`（有効なプロファイルの親）にフォールバックします。テストや特殊な構成で役立ちます |
| `HERMES_KANBAN_BOARD` | このプロセスで使うかんばんボードを固定します。`~/.hermes/kanban/current` より優先されます。ディスパッチャーがワーカーのサブプロセスの環境にこれを注入するので、ワーカーは他のボードのタスクを物理的に見られません。既定値は `default` です。スラッグの検証条件は、小文字の英数字とハイフン、アンダースコアで 1〜64 文字です |
| `HERMES_KANBAN_DB` | かんばんのデータベースファイルのパスを直接固定します（最優先で、`HERMES_KANBAN_BOARD` と `HERMES_KANBAN_HOME` より強い）。ディスパッチャーがワーカーのサブプロセスの環境にこれを注入するので、プロファイルのワーカーはディスパッチャーのボードに揃います |
| `HERMES_KANBAN_WORKSPACES_ROOT` | かんばんのワークスペースのルートを直接固定します（ワークスペースについては最優先で、`HERMES_KANBAN_HOME` より強い）。ディスパッチャーがワーカーのサブプロセスの環境にこれを注入します |
| `HERMES_KANBAN_DISPATCH_IN_GATEWAY` | `kanban.dispatch_in_gateway` を実行時に上書きします。`0`、`false`、`no`、`off` のいずれかを設定するとゲートウェイが組み込みのかんばんディスパッチャーを起動しなくなります。空でない他の値なら有効になります。別のディスパッチャープロセスがボードを持っているときに役立ちます。 |

## プロバイダ認証（OAuth） {#provider-auth-oauth}

Anthropic のネイティブ認証では、Claude Code 自身の認証情報ファイルがあれば Hermes はそちらを優先します。その認証情報は自動で更新できるからです。**Anthropic に対する OAuth には、追加の利用クレジットを購入した Claude Max プランが必要です** — Hermes は Claude Code として経路をとるので、引き当てるのは Max プランの追加分・超過分のクレジットだけで、Max の基本枠は使いません。Claude Pro では動きません。Max と追加クレジットがない場合は API キーを使ってください。`ANTHROPIC_TOKEN` などの環境変数は手動の上書きとして今も役立ちますが、Claude Max のログインで推奨される経路ではなくなりました。

| 変数 | 説明 |
|----------|-------------|
| `HERMES_PORTAL_BASE_URL` | Nous Portal の URL を上書きします（開発・テスト用） |
| `NOUS_INFERENCE_BASE_URL` | Nous の推論 API の URL を上書きします |
| `HERMES_NOUS_MIN_KEY_TTL_SECONDS` | 再発行までのエージェントキーの最小 TTL（既定値: 1800 = 30 分） |
| `HERMES_NOUS_TIMEOUT_SECONDS` | Nous の認証情報・トークンのやり取りにおける HTTP タイムアウト |
| `HERMES_DUMP_REQUESTS` | API リクエストのペイロードをログファイルに書き出します（`true`/`false`） |
| `HERMES_PREFILL_MESSAGES_FILE` | API 呼び出し時に差し込む一時的なプリフィルメッセージの JSON ファイルのパス |
| `HERMES_TIMEZONE` | IANA のタイムゾーンで上書きします（たとえば `America/New_York`） |

## ツールの API {#tool-apis}

| 変数 | 説明 |
|----------|-------------|
| `PARALLEL_API_KEY` | AI 向けのウェブ検索（[parallel.ai](https://parallel.ai/)） |
| `FIRECRAWL_API_KEY` | ウェブスクレイピングとクラウドブラウザ（[firecrawl.dev](https://firecrawl.dev/)） |
| `FIRECRAWL_API_URL` | セルフホストの Firecrawl のエンドポイントを独自に指定します（任意） |
| `SEARXNG_URL` | セルフホストで無料のウェブ検索に使う SearXNG インスタンスの URL。API キーは要りません（[searxng.github.io](https://searxng.github.io/searxng/)） |
| `EXA_API_KEY` | AI 向けのウェブ検索と本文取得に使う Exa の API キー（[exa.ai](https://exa.ai/)） |
| `BRAVE_SEARCH_API_KEY` | ウェブ検索に使う Brave Search API のサブスクリプショントークン（無料枠あり）（[brave.com/search/api](https://brave.com/search/api/)） |
| `BROWSERBASE_API_KEY` | ブラウザの自動操作（[browserbase.com](https://browserbase.com/)） |
| `BROWSERBASE_PROJECT_ID` | Browserbase のプロジェクト ID |
| `BROWSER_USE_API_KEY` | Browser Use のクラウドブラウザの API キー（[browser-use.com](https://browser-use.com/)） |
| `FIRECRAWL_BROWSER_TTL` | Firecrawl のブラウザセッションの TTL（秒、既定値: 300） |
| `BROWSER_CDP_URL` | ローカルのブラウザ向けの Chrome DevTools Protocol の URL（`/browser connect` で設定します。たとえば `ws://localhost:9222`） |
| `CAMOFOX_URL` | ローカルの検知回避ブラウザ Camofox のサーバーアドレス（既定値: `http://localhost:9377`）。あくまでアドレスであって、これを設定しても Camofox がバックエンドとして選ばれるわけではありません。選択は `hermes tools` で行います（`browser.cloud_provider: camofox`） |
| `CAMOFOX_API_KEY` | リモートや認証付きの Camofox サーバーに Authorization ヘッダーとして送るベアラートークン（任意） |
| `CAMOFOX_USER_ID` | 共有された可視セッション向けに、外部で管理する Camofox のユーザー ID（任意） |
| `CAMOFOX_SESSION_KEY` | `CAMOFOX_USER_ID` 用のタブを作るときに使う Camofox のセッションキー（任意） |
| `CAMOFOX_ADOPT_EXISTING_TAB` | `true` にすると、新しいタブを作る前に既存の Camofox のタブを再利用します |
| `BROWSER_INACTIVITY_TIMEOUT` | ブラウザセッションの無操作タイムアウト（秒） |
| `AGENT_BROWSER_ARGS` | Chromium の起動フラグを追加します（カンマ区切りか改行区切り）。root で動かしている場合や、AppArmor で制限された非特権のユーザー名前空間（Ubuntu 23.10 以降、DGX Spark、多くのコンテナイメージ）では、Hermes が `--no-sandbox,--disable-dev-shm-usage` を自動で差し込みます。上書きしたいときや他のフラグを足したいときだけ手で設定してください。 |
| `AGENT_BROWSER_ENGINE` | ローカルのブラウザエンジン: `auto`（既定値 — CDP 経由の Chromium 系）、`lightpanda`（Browser Use モードでは `lightpanda serve` を起動し、組み込みのツールでは agent-browser に `--engine lightpanda` を渡します）、`chrome` のいずれか。config.yaml の `browser.engine` と同じです。 |
| `FAL_KEY` | 画像生成（[fal.ai](https://fal.ai/)） |
| `KREA_API_KEY` | Krea 2 の画像生成に使う Krea の API キー（[krea.ai](https://krea.ai/)） |
| `GROQ_API_KEY` | Groq Whisper の音声認識 API キー（[groq.com](https://groq.com/)） |
| `ELEVENLABS_API_KEY` | ElevenLabs の高品質な音声合成（[elevenlabs.io](https://elevenlabs.io/)） |
| `PORCUPINE_ACCESS_KEY` | Picovoice Porcupine のウェイクワードエンジン（[console.picovoice.ai](https://console.picovoice.ai/)） — `wake_word.provider: porcupine` のときだけ必要です。既定の openWakeWord と sherpa のエンジンではキーは要りません |
| `STT_GROQ_MODEL` | Groq の音声認識モデルを上書きします（既定値: `whisper-large-v3-turbo`） |
| `GROQ_BASE_URL` | Groq の OpenAI 互換の音声認識エンドポイントを上書きします |
| `STT_OPENAI_MODEL` | OpenAI の音声認識モデルを上書きします（既定値: `whisper-1`） |
| `STT_OPENAI_BASE_URL` | OpenAI 互換の音声認識エンドポイントを上書きします |
| `GITHUB_TOKEN` | Skills Hub 用の GitHub トークン（API のレート上限が上がり、スキルを公開できます） |
| `HONCHO_API_KEY` | セッションをまたいだユーザーモデリング（[honcho.dev](https://honcho.dev/)） |
| `HONCHO_BASE_URL` | セルフホストの Honcho インスタンス向けのベース URL（既定値: Honcho のクラウド）。ローカルのインスタンスなら API キーは要りません |
| `HINDSIGHT_API_KEY` | グラフを踏まえた永続メモリのための Hindsight API キー（[hindsight.vectorize.io](https://hindsight.vectorize.io)） |
| `HINDSIGHT_API_URL` | Hindsight API のベース URL（既定値: `https://api.hindsight.vectorize.io`） |
| `HINDSIGHT_TIMEOUT` | Hindsight のメモリプロバイダの API 呼び出しのタイムアウト（秒、既定値: `60`）。`/sync` や `on_session_switch` のときに Hindsight のインスタンスの応答が遅く、`errors.log` にタイムアウトが出るなら増やしてください。 |
| `MEM0_API_KEY` | 意味的な永続メモリのための Mem0 Platform の API キー（[app.mem0.ai](https://app.mem0.ai)） |
| `MEM0_MODE` | Mem0 のバックエンドのモード: `platform`（既定値）または `oss` — [メモリプロバイダ](/hermes/docs/user-guide/features/memory-providers/)を参照してください |
| `MEM0_HOST` | セルフホストの Mem0 サーバーのベース URL（プラグインが Platform API から切り替わります） |
| `MEM0_USER_ID` | Mem0 のメモリを保存するときのユーザー ID を上書きします |
| `MEM0_AGENT_ID` | Mem0 のメモリに付けるエージェント ID を上書きします |
| `RETAINDB_API_KEY` | 永続メモリのための RetainDB の API キー（[retaindb.com](https://retaindb.com)） |
| `RETAINDB_BASE_URL` | セルフホストの RetainDB インスタンス向けのベース URL（既定値: `https://api.retaindb.com`） |
| `OPENVIKING_API_KEY` | OpenViking の API キー（ローカルの開発モードでは空のままにします） |
| `OPENVIKING_ENDPOINT` | OpenViking サーバーの URL（既定値: `http://127.0.0.1:1933`） |
| `BRV_API_KEY` | ByteRover の API キー（任意。クラウド同期に使います。既定ではローカル優先です）（[app.byterover.dev](https://app.byterover.dev)） |
| `SUPERMEMORY_API_KEY` | プロフィールの想起とセッションの取り込みを備えた意味的な長期メモリ（[supermemory.ai](https://supermemory.ai)） |
| `DAYTONA_API_KEY` | Daytona のクラウドサンドボックス（[daytona.io](https://daytona.io/)） |
| `VERCEL_TOKEN` | Vercel Sandbox のアクセストークン（[vercel.com](https://vercel.com/)） |
| `VERCEL_PROJECT_ID` | Vercel のプロジェクト ID（`VERCEL_TOKEN` と一緒に必要です） |
| `VERCEL_TEAM_ID` | Vercel のチーム ID（`VERCEL_TOKEN` と一緒に必要です） |
| `VERCEL_OIDC_TOKEN` | Vercel の短命な OIDC トークン（開発時だけの代替手段です） |

### スキルの API キー {#skill-api-keys}

同梱・任意のスキルが個別に使う秘密情報です。対応するスキルを使うときだけ必要になります。

| 変数 | 使うスキル | 説明 |
|----------|---------------|-------------|
| `NOTION_API_KEY` | `notion` | Notion のインテグレーショントークン。 |
| `LINEAR_API_KEY` | `linear` | Linear の個人用 API キー。 |
| `AIRTABLE_API_KEY` | `airtable` | Airtable の個人用アクセストークン。 |
| `TENOR_API_KEY` | `gif-search` | GIF 検索に使う Tenor の API キー。 |

### Langfuse による可観測性 {#langfuse-observability}

同梱の [`observability/langfuse`](/hermes/docs/user-guide/features/built-in-plugins/#observabilitylangfuse) プラグイン向けの環境変数です。`~/.hermes/.env` に設定します。あわせてプラグインを有効にする必要があります（`hermes plugins enable observability/langfuse` を実行するか、`hermes plugins` でチェックを入れます）。有効にしないと、以下のどれも効きません。

| 変数 | 説明 |
|----------|-------------|
| `HERMES_LANGFUSE_PUBLIC_KEY` | Langfuse プロジェクトの公開キー（`pk-lf-...`）。必須です。 |
| `HERMES_LANGFUSE_SECRET_KEY` | Langfuse プロジェクトの秘密キー（`sk-lf-...`）。必須です。 |
| `HERMES_LANGFUSE_BASE_URL` | Langfuse サーバーの URL（既定値: `https://cloud.langfuse.com`）。セルフホストのときに設定します。 |
| `HERMES_LANGFUSE_ENV` | トレースに付ける環境タグ（`production`、`staging` など） |
| `HERMES_LANGFUSE_RELEASE` | トレースに付けるリリース・バージョンのタグ |
| `HERMES_LANGFUSE_SAMPLE_RATE` | SDK のサンプリング率 0.0〜1.0（既定値: `1.0`） |
| `HERMES_LANGFUSE_MAX_CHARS` | 直列化したペイロードのフィールドごとの切り詰め上限（既定値: `12000`） |
| `HERMES_LANGFUSE_DEBUG` | `true` にするとプラグインの詳細なログが `agent.log` に出ます |
| `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` / `LANGFUSE_BASE_URL` | Langfuse SDK の標準の名前です。対応する `HERMES_LANGFUSE_*` が未設定のときに代わりとして使われます。 |

### Nous Tool Gateway {#nous-tool-gateway}

これらは、Nous の有料プランの利用者やゲートウェイをセルフホストする場合に [Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/) を設定する変数です。ほとんどの人は設定する必要がありません。ゲートウェイは `hermes model` や `hermes tools` から自動で設定されます。

| 変数 | 説明 |
|----------|-------------|
| `TOOL_GATEWAY_DOMAIN` | Tool Gateway のルーティングに使うベースドメイン（既定値: `nousresearch.com`） |
| `TOOL_GATEWAY_SCHEME` | ゲートウェイの URL のスキーム（HTTP か HTTPS。既定値: `https`） |
| `TOOL_GATEWAY_USER_TOKEN` | Tool Gateway の認証トークン（ふつうは Nous の認証から自動で入ります） |
| `FIRECRAWL_GATEWAY_URL` | Firecrawl のゲートウェイエンドポイントだけを別の URL に上書きします |

## ターミナルのバックエンド {#terminal-backend}

| 変数 | 説明 |
|----------|-------------|
| `TERMINAL_ENV` | バックエンド: `local`、`docker`、`ssh`、`singularity`、`modal`、`daytona`、`vercel_sandbox` |
| `HERMES_DOCKER_BINARY` | Hermes が呼び出すコンテナのバイナリを上書きします（`podman`、`/usr/local/bin/docker` など）。未設定なら、`PATH` から `docker` か `podman` を自動で見つけます。両方入っていて既定でないほうを使いたいとき、あるいはバイナリが `PATH` の外にあるときに必要です。 |
| `TERMINAL_DOCKER_IMAGE` | Docker のイメージ（既定値: `nikolaik/python-nodejs:python3.11-nodejs20`） |
| `TERMINAL_DOCKER_FORWARD_ENV` | Docker のターミナルセッションに明示的に渡す環境変数名の JSON 配列。なお、スキルが宣言した `required_environment_variables` は自動で渡されるので、どのスキルも宣言していない変数のときだけ使えば足ります。 |
| `TERMINAL_DOCKER_VOLUMES` | Docker のボリュームマウントを追加します（`host:container` の組をカンマ区切りで） |
| `TERMINAL_DOCKER_ENV` | Docker のターミナルセッションの中で設定する追加の環境変数の JSON オブジェクト（たとえば `{"FOO":"bar"}`） |
| `TERMINAL_DOCKER_EXTRA_ARGS` | `docker run` に足す引数の JSON 配列（たとえば `["--memory","4g"]`） |
| `TERMINAL_DOCKER_MOUNT_CWD_TO_WORKSPACE` | 上級者向けのオプトイン: 起動時のカレントディレクトリを Docker の `/workspace` にマウントします（`true`/`false`、既定値: `false`） |
| `TERMINAL_SINGULARITY_IMAGE` | Singularity のイメージまたは `.sif` のパス |
| `TERMINAL_MODAL_IMAGE` | Modal のコンテナイメージ |
| `TERMINAL_DAYTONA_IMAGE` | Daytona のサンドボックスイメージ |
| `TERMINAL_VERCEL_RUNTIME` | Vercel Sandbox のランタイム（`node24`、`node22`、`python3.13`） |
| `TERMINAL_TIMEOUT` | コマンドのタイムアウト（秒） |
| `TERMINAL_LIFETIME_SECONDS` | ターミナルセッションの最大の寿命（秒） |
| `TERMINAL_CWD` | ゲートウェイと cron のターミナルセッション向けの直接の上書き（非推奨）。`config.yaml` の `terminal.cwd` のほうが向いています。CLI は今も起動時のディレクトリを使います。 |
| `SUDO_PASSWORD` | 対話的な入力なしで sudo を使えるようにします |

クラウドのサンドボックスをバックエンドにした場合、永続性はファイルシステム単位で考えます。`TERMINAL_LIFETIME_SECONDS` は Hermes がアイドル状態のターミナルセッションを片づけるタイミングを決めるもので、あとから再開したときは、同じプロセスが生き続けているのではなくサンドボックスが作り直されることがあります。

## SSH のバックエンド {#ssh-backend}

| 変数 | 説明 |
|----------|-------------|
| `TERMINAL_SSH_HOST` | リモートサーバーのホスト名 |
| `TERMINAL_SSH_USER` | SSH のユーザー名 |
| `TERMINAL_SSH_PORT` | SSH のポート（既定値: 22） |
| `TERMINAL_SSH_KEY` | 秘密鍵のパス |
| `TERMINAL_SSH_PERSISTENT` | SSH の常駐シェルの設定を上書きします（既定では `TERMINAL_PERSISTENT_SHELL` に従います） |

## コンテナのリソース（Docker、Singularity、Modal、Daytona） {#container-resources-docker-singularity-modal-daytona}

| 変数 | 説明 |
|----------|-------------|
| `TERMINAL_CONTAINER_CPU` | CPU のコア数（既定値: 1） |
| `TERMINAL_CONTAINER_MEMORY` | メモリ（MB、既定値: 5120） |
| `TERMINAL_CONTAINER_DISK` | ディスク（MB、既定値: 51200） |
| `TERMINAL_CONTAINER_PERSISTENT` | セッションをまたいでコンテナのファイルシステムを残します（既定値: `true`） |
| `TERMINAL_SANDBOX_DIR` | ワークスペースとオーバーレイを置くホスト側のディレクトリ（既定値: `~/.hermes/sandboxes/`） |

## 常駐シェル {#persistent-shell}

| 変数 | 説明 |
|----------|-------------|
| `TERMINAL_PERSISTENT_SHELL` | ローカル以外のバックエンドで常駐シェルを有効にします（既定値: `true`）。config.yaml の `terminal.persistent_shell` でも設定できます |
| `TERMINAL_LOCAL_PERSISTENT` | ローカルのバックエンドで常駐シェルを有効にします（既定値: `false`） |
| `TERMINAL_SSH_PERSISTENT` | SSH のバックエンドの常駐シェルの設定を上書きします（既定では `TERMINAL_PERSISTENT_SHELL` に従います） |

## 送信プロキシ（サンドボックスに注入されます） {#egress-proxy-sandbox-injected}

これらの環境変数はホストには設定されません。`proxy.enabled: true` のとき、[送信プロキシ](/hermes/docs/user-guide/egress/iron-proxy/)の連携が Docker のサンドボックスの中に注入します。このリリースで組み込まれているバックエンドは Docker だけです。

| 変数 | 説明 |
|----------|-------------|
| `HERMES_EGRESS_PROXY` | 送信プロキシが有効なとき、サンドボックスの中で `1` になります。エージェントのコードはこれを見れば、TLS を介在するプロキシの後ろで動いていることが分かります。 |
| プロバイダの環境変数（`OPENROUTER_API_KEY`、`OPENAI_API_KEY` など） | 本物の上流の秘密情報ではなく、中身の分からないプロキシ用のトークンが入ります。そのため既存の SDK は標準の環境変数名をそのまま読み続けられます。iron-proxy がネットワークの境界でそのトークンを本物の上流の秘密情報に差し替えます。 |
| `HERMES_PROXY_TOKEN_<ENV_NAME>` | 発行されたプロバイダごとの対応づけを確認するための別名です。たとえば `HERMES_PROXY_TOKEN_OPENROUTER_API_KEY=hermes-proxy-openrouter-…` のようになります。トークンの値は標準のプロバイダ用の環境変数と同じです。 |
| `HTTPS_PROXY` / `HTTP_PROXY` | `HTTPS_PROXY` は CONNECT / MITM 用に `http://host.docker.internal:<tunnel_port>` を指します。`HTTP_PROXY` は平文 HTTP の転送用に `<tunnel_port + 1>` を指します。 |
| `NO_PROXY` | `127.0.0.1,localhost,::1` です。サンドボックスの中のループバックの開発サーバーがプロキシを通らないようにします。 |
| `REQUESTS_CA_BUNDLE` / `SSL_CERT_FILE` / `CURL_CA_BUNDLE` / `NODE_EXTRA_CA_CERTS` | サンドボックスの中にマウントされた Hermes の送信用 CA 証明書のパス（`/etc/ssl/certs/hermes-egress-ca.crt`）です。各言語のランタイムが iron-proxy の MITM で発行された末端の証明書を信頼できるようになります。 |
| `NODE_OPTIONS` | 末尾に `--use-openssl-ca` が追加されます（既存のフラグは残ります）。Node.js が、他の CA バンドル用の変数が制御する OpenSSL のストアを通るようになります。[Node.js の CA が非対称になる注意点](/hermes/docs/user-guide/egress/iron-proxy/#nodejs-asymmetric-ca-caveat)の影響を狭められます。 |
| `HERMES_IRON_PROXY_NONCE` | iron-proxy のデーモンのプロセス自体に設定されます（サンドボックスの中ではありません）。PID が再利用されても候補の PID が*こちらが*管理しているバイナリを指しているかを `_pid_alive` が確かめるために使います。 |

これらは `proxy.enabled: true` かつデーモンが動いているとき、Docker のターミナルバックエンドが自動で設定します。自分で設定するものではありません。運用者が触るつまみは `~/.hermes/config.yaml` の `proxy:` セクションにあります。[送信プロキシ → 設定](/hermes/docs/user-guide/egress/iron-proxy/#configuration)を参照してください。

## メッセージング {#messaging}

| 変数 | 説明 |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Telegram のボットトークン（@BotFather から取得します） |
| `TELEGRAM_ALLOWED_USERS` | ボットを使えるユーザー ID をカンマ区切りで指定します（DM、グループ、フォーラムのすべてに適用されます） |
| `TELEGRAM_ALLOW_ALL_USERS` | どの Telegram ユーザーでもボットを動かせるようにします（開発時のみ）。 |
| `TELEGRAM_GROUP_ALLOWED_USERS` | グループとフォーラムでのみ許可する送信者のユーザー ID をカンマ区切りで指定します（DM のアクセス権は付きません）。チャット ID の形（`-` で始まる値）は #17686 より前の設定との互換のためチャット ID として今も受け付けますが、非推奨の警告が出ます。 |
| `TELEGRAM_GROUP_ALLOWED_CHATS` | グループ・フォーラムのチャット ID をカンマ区切りで指定します。そのメンバーは全員許可されます |
| `TELEGRAM_HOME_CHANNEL` | cron の配信先として既定で使う Telegram のチャット・チャンネル |
| `TELEGRAM_HOME_CHANNEL_NAME` | Telegram のホームチャンネルの表示名 |
| `TELEGRAM_CRON_THREAD_ID` | cron の配信を受け取るフォーラムのトピック ID。cron についてだけ `TELEGRAM_HOME_CHANNEL_THREAD_ID` を上書きします。トピックモードで使うと、cron のメッセージへの返信がシステムのロビーに落ちず新しいセッションを開きます（#24409）。 |
| `TELEGRAM_WEBHOOK_URL` | webhook モード用の公開 HTTPS URL（ポーリングではなく webhook が有効になります） |
| `TELEGRAM_WEBHOOK_PORT` | webhook サーバーがローカルで待ち受けるポート（既定値: `8443`） |
| `TELEGRAM_WEBHOOK_SECRET` | 検証のために Telegram が各更新で返してくる秘密トークン。**`TELEGRAM_WEBHOOK_URL` を設定したときは必須です** — これがないとゲートウェイは起動しません（GHSA-3vpc-7q5r-276h）。`openssl rand -hex 32` で生成します。 |
| `TELEGRAM_REACTIONS` | 処理中のメッセージに絵文字リアクションを付けます（既定値: `false`） |
| `TELEGRAM_REQUIRE_MENTION` | Telegram のグループで応答する前に明示的なきっかけを必須にします。`config.yaml` の `telegram.require_mention` と同じです。 |
| `TELEGRAM_MENTION_PATTERNS` | Telegram のグループでメンションによる制御を有効にしたときに受け付ける、ウェイクワードの正規表現。JSON 配列、改行区切り、カンマ区切りのいずれかで指定します。`telegram.mention_patterns` と同じです。 |
| `TELEGRAM_EXCLUSIVE_BOT_MENTIONS` | 有効にすると、Telegram のグループでの明示的な `@...bot` のメンションは、返信やウェイクワードのフォールバックが動く前に、名指しされたボットのユーザー名にだけ届きます。既定値: `true`。`telegram.exclusive_bot_mentions` と同じです。 |
| `TELEGRAM_REPLY_TO_MODE` | 返信の紐づけ方: `off`、`first`（既定値）、`all`。Discord と同じ仕組みです。 |
| `TELEGRAM_IGNORED_THREADS` | ボットが決して応答しない Telegram のフォーラムのトピック・スレッド ID をカンマ区切りで指定します |
| `TELEGRAM_PROXY` | Telegram への接続に使うプロキシ URL。`HTTPS_PROXY` を上書きします。`http://`、`https://`、`socks5://` に対応します |
| `DISCORD_BOT_TOKEN` | Discord のボットトークン |
| `DISCORD_ALLOWED_USERS` | ボットを使える Discord のユーザー ID をカンマ区切りで指定します |
| `DISCORD_ALLOW_ALL_USERS` | どの Discord ユーザーでもボットを動かせるようにします（開発時のみ）。 |
| `DISCORD_ALLOWED_ROLES` | ボットを使える Discord のロール ID をカンマ区切りで指定します（`DISCORD_ALLOWED_USERS` との OR 条件です）。Members インテントが自動で有効になります。モデレーションの担当者が入れ替わるときに便利で、ロールを付ければ権限が自動で伝わります。 |
| `DISCORD_ALLOWED_CHANNELS` | Discord のチャンネル ID をカンマ区切りで指定します。設定するとボットはこれらのチャンネル（および許可されていれば DM）でしか応答しません。`config.yaml` の `discord.allowed_channels` を上書きします。 |
| `DISCORD_PROXY` | Discord への接続に使うプロキシ URL。`HTTPS_PROXY` を上書きします。`http://`、`https://`、`socks5://` に対応します |
| `DISCORD_HOME_CHANNEL` | cron の配信先として既定で使う Discord のチャンネル |
| `DISCORD_HOME_CHANNEL_NAME` | Discord のホームチャンネルの表示名 |
| `DISCORD_COMMAND_SYNC_POLICY` | 起動時の Discord のスラッシュコマンドの同期方針: `safe`（差分を取って揃える）、`bulk`（従来の `tree.sync()`）、`off` |
| `DISCORD_REQUIRE_MENTION` | サーバーのチャンネルで応答する前に @メンションを必須にします |
| `DISCORD_FREE_RESPONSE_CHANNELS` | メンションが不要なチャンネル ID をカンマ区切りで指定します |
| `DISCORD_AUTO_THREAD` | 対応している場合、長い返信を自動でスレッドにします |
| `DISCORD_ALLOW_ANY_ATTACHMENT` | `true` にすると、どのファイル形式の添付も受け付けます（組み込みの PDF / テキスト / zip / Office の許可リストに限りません）。未知の形式はキャッシュされ、ローカルのパスとしてエージェントに渡されるので、`terminal` / `read_file` / `ffprobe` で中身を調べられます。既定値は `false` です。 |
| `DISCORD_MAX_ATTACHMENT_BYTES` | ゲートウェイがキャッシュする添付 1 件あたりの最大バイト数。既定値は `33554432`（32 MiB）です。`0` にすると上限なしになります（書き出しの間、添付はメモリ上に保持されます）。 |
| `DISCORD_REACTIONS` | 処理中のメッセージに絵文字リアクションを付けます（既定値: `true`） |
| `DISCORD_IGNORED_CHANNELS` | ボットが決して応答しないチャンネル ID をカンマ区切りで指定します |
| `DISCORD_NO_THREAD_CHANNELS` | ボットが自動スレッド化せずに応答するチャンネル ID をカンマ区切りで指定します |
| `DISCORD_REPLY_TO_MODE` | 返信の紐づけ方: `off`、`first`（既定値）、`all` |
| `DISCORD_ALLOW_MENTION_EVERYONE` | ボットが `@everyone`/`@here` を鳴らせるようにします（既定値: `false`）。[メンションの制御](/hermes/docs/user-guide/messaging/discord/#mention-control)を参照してください。 |
| `DISCORD_ALLOW_MENTION_ROLES` | ボットが `@role` のメンションを鳴らせるようにします（既定値: `false`）。 |
| `DISCORD_ALLOW_MENTION_USERS` | ボットが個々の `@user` のメンションを鳴らせるようにします（既定値: `true`）。 |
| `DISCORD_ALLOW_MENTION_REPLIED_USER` | メッセージに返信するとき、その投稿者に通知します（既定値: `true`）。 |
| `SLACK_BOT_TOKEN` | Slack のボットトークン（`xoxb-...`） |
| `SLACK_APP_TOKEN` | Slack のアプリレベルのトークン（`xapp-...`。ソケットモードに必要です） |
| `SLACK_ALLOWED_USERS` | Slack のユーザー ID をカンマ区切りで指定します |
| `SLACK_ALLOW_ALL_USERS` | どの Slack ユーザーでもボットを動かせるようにします（開発時のみ）。 |
| `SLACK_ALLOW_BOTS` | 他の Slack ボットからのメッセージを受け取ります: `none`（既定値）、`mentions`、`all`。自分自身のメッセージは常に無視します。 |
| `SLACK_THREAD_REQUIRE_MENTION` | Slack のスレッドの返信では明示的な @メンションを必須にしつつ、トップレベルの自由応答チャンネルはそのまま残します |
| `SLACK_HOME_CHANNEL` | cron の配信先として既定で使う Slack のチャンネル |
| `SLACK_HOME_CHANNEL_NAME` | Slack のホームチャンネルの表示名 |
| `GOOGLE_CHAT_PROJECT_ID` | Pub/Sub のトピックを置く GCP のプロジェクト（指定がなければ `GOOGLE_CLOUD_PROJECT` を使います） |
| `GOOGLE_CHAT_SUBSCRIPTION_NAME` | Pub/Sub のサブスクリプションのフルパス `projects/{proj}/subscriptions/{sub}`（旧名: `GOOGLE_CHAT_SUBSCRIPTION`） |
| `GOOGLE_CHAT_SERVICE_ACCOUNT_JSON` | サービスアカウント JSON のパス、または JSON をそのまま書いたもの（指定がなければ `GOOGLE_APPLICATION_CREDENTIALS` を使います） |
| `GOOGLE_CHAT_ALLOWED_USERS` | ボットと会話できるユーザーのメールアドレスをカンマ区切りで指定します |
| `GOOGLE_CHAT_ALLOW_ALL_USERS` | どの Google Chat ユーザーでもボットを動かせるようにします（開発時のみ） |
| `GOOGLE_CHAT_HOME_CHANNEL` | cron の配信先として既定で使うスペース（たとえば `spaces/AAAA...`） |
| `GOOGLE_CHAT_HOME_CHANNEL_NAME` | Google Chat のホームスペースの表示名 |
| `GOOGLE_CHAT_MAX_MESSAGES` | Pub/Sub の FlowControl で同時に処理する最大メッセージ数（既定値: `1`） |
| `GOOGLE_CHAT_MAX_BYTES` | Pub/Sub の FlowControl で同時に処理する最大バイト数（既定値: `16777216`、16 MiB） |
| `GOOGLE_CHAT_BOOTSTRAP_SPACES` | ボット自身の `users/{id}` を特定するために、起動時に追加で問い合わせるスペース ID をカンマ区切りで指定します |
| `GOOGLE_CHAT_DEBUG_RAW` | 何か値を設定すると、伏せ字化した Pub/Sub のエンベロープを DEBUG レベルで記録します（デバッグ用） |
| `GOOGLE_CHAT_HTTP_EVENTS_URL` | Chat のメッセージイベントを受け取る認証付きの HTTP エンドポイント（Pub/Sub の代わりに使えます） |
| `GOOGLE_CHAT_HTTP_EVENTS_AUDIENCE` | Google が署名した HTTP イベントのベアラートークンで期待する audience（既定では `GOOGLE_CHAT_HTTP_EVENTS_URL`） |
| `GOOGLE_CHAT_HTTP_EVENTS_SERVICE_ACCOUNT_EMAIL` | HTTP イベントのベアラートークンで期待する Google のサービスアカウントのメールアドレス |
| `WHATSAPP_ENABLED` | WhatsApp の橋渡しを有効にします（`true`/`false`） |
| `WHATSAPP_MODE` | `bot`（別の番号を使う）または `self-chat`（自分宛てにメッセージを送る） |
| `WHATSAPP_ALLOWED_USERS` | 電話番号をカンマ区切りで指定します（国番号あり、`+` なし）。`*` にするとすべての送信者を許可します |
| `WHATSAPP_ALLOW_ALL_USERS` | 許可リストなしで WhatsApp のすべての送信者を許可します（`true`/`false`） |
| `WHATSAPP_HOME_CHANNEL` | cron や通知の配信先として既定で使うチャット ID。 |
| `WHATSAPP_HOME_CHANNEL_NAME` | WhatsApp のホームチャンネルの表示名。 |
| `WHATSAPP_DEBUG` | 切り分けのために、橋渡しの中で生のメッセージイベントを記録します（`true`/`false`） |
| `WHATSAPP_CLOUD_PHONE_NUMBER_ID` | WhatsApp Business Cloud API の Meta の Phone Number ID（15〜17 桁。電話番号そのもの**ではありません**） |
| `WHATSAPP_CLOUD_ACCESS_TOKEN` | Meta のアクセストークン（`EAA` で始まります）。一時トークンは 24 時間で失効し、System User のトークンは無期限です |
| `WHATSAPP_CLOUD_APP_SECRET` | 受信 webhook の署名を検証するための 32 文字の 16 進数のアプリシークレット |
| `WHATSAPP_CLOUD_VERIFY_TOKEN` | Meta の webhook 検証のやり取りで使う共有の秘密（セットアップウィザードが自動生成します） |
| `WHATSAPP_CLOUD_ALLOWED_USERS` | ボットにメッセージを送れる `wa_id`（国番号ありの電話番号、`+` なし）をカンマ区切りで指定します |
| `WHATSAPP_CLOUD_ALLOW_ALL_USERS` | 許可リストなしで WhatsApp Cloud のすべての送信者を許可します（`true`/`false`） |
| `WHATSAPP_CLOUD_APP_ID` | Meta の App ID（任意。将来の分析連携のためのものです） |
| `WHATSAPP_CLOUD_WABA_ID` | WhatsApp Business Account の ID（任意。将来の分析連携のためのものです） |
| `WHATSAPP_CLOUD_WEBHOOK_HOST` | 受信 webhook のサーバーがバインドするインターフェース（既定値 `0.0.0.0`） |
| `WHATSAPP_CLOUD_WEBHOOK_PORT` | 受信 webhook のサーバーがバインドするポート（既定値 `8090`） |
| `WHATSAPP_CLOUD_WEBHOOK_PATH` | Meta が受信メッセージを POST する URL のパス（既定値 `/whatsapp/webhook`） |
| `WHATSAPP_CLOUD_API_VERSION` | 呼び出す Meta Graph API のバージョン（既定値 `v20.0`） |
| `WHATSAPP_CLOUD_HOME_CHANNEL` | ボットのホームチャンネルとして使う `wa_id`（cron ジョブなどのため） |
| `WHATSAPP_CLOUD_DM_POLICY` | Cloud アダプタの DM の制御（`open`/`allowlist`/`disabled`）。未設定なら `WHATSAPP_DM_POLICY` を使います |
| `WHATSAPP_CLOUD_ALLOW_FROM` | `dm_policy: allowlist` のときに許可する送信者をカンマ区切りで指定します（`wa_id` をそのまま書きます。Baileys 形式の JID は正規化されます） |
| `WHATSAPP_CLOUD_GROUP_POLICY` | Cloud アダプタのグループの制御（`open`/`allowlist`/`disabled`）。未設定なら `WHATSAPP_GROUP_POLICY` を使います |
| `WHATSAPP_CLOUD_GROUP_ALLOW_FROM` | `group_policy: allowlist` のときに許可するグループチャットの ID をカンマ区切りで指定します |
| `SIGNAL_HTTP_URL` | signal-cli のデーモンの HTTP エンドポイント（たとえば `http://127.0.0.1:8080`） |
| `SIGNAL_ACCOUNT` | E.164 形式のボットの電話番号 |
| `SIGNAL_ALLOWED_USERS` | E.164 形式の電話番号または UUID をカンマ区切りで指定します |
| `SIGNAL_GROUP_ALLOWED_USERS` | グループ ID をカンマ区切りで指定します。`*` ですべてのグループを許可します |
| `SIGNAL_HOME_CHANNEL_NAME` | Signal のホームチャンネルの表示名 |
| `SIGNAL_IGNORE_STORIES` | Signal のストーリー・ステータスの更新を無視します |
| `SIGNAL_ALLOW_ALL_USERS` | 許可リストなしですべての Signal ユーザーを許可します |
| `TWILIO_ACCOUNT_SID` | Twilio の Account SID（電話のスキルと共通です） |
| `TWILIO_AUTH_TOKEN` | Twilio の Auth Token（電話のスキルと共通で、webhook の署名検証にも使います） |
| `TWILIO_PHONE_NUMBER` | E.164 形式の Twilio の電話番号（電話のスキルと共通です） |
| `SMS_WEBHOOK_URL` | Twilio の署名検証に使う公開 URL。Twilio Console の webhook URL と一致している必要があります（必須） |
| `SMS_WEBHOOK_PORT` | SMS 受信の webhook を待ち受けるポート（既定値: `8080`） |
| `SMS_WEBHOOK_HOST` | webhook のバインドアドレス（既定値: `127.0.0.1`） |
| `SMS_INSECURE_NO_SIGNATURE` | `true` にすると Twilio の署名検証を切ります（ローカルの開発時のみ。本番では使わないでください） |
| `SMS_ALLOWED_USERS` | 会話できる E.164 形式の電話番号をカンマ区切りで指定します |
| `SMS_ALLOW_ALL_USERS` | 許可リストなしですべての SMS の送信者を許可します |
| `SMS_HOME_CHANNEL` | cron ジョブや通知の配信先の電話番号 |
| `SMS_HOME_CHANNEL_NAME` | SMS のホームチャンネルの表示名 |
| `EMAIL_ADDRESS` | メールのゲートウェイアダプタで使うメールアドレス |
| `EMAIL_PASSWORD` | そのメールアカウントのパスワードまたはアプリパスワード |
| `EMAIL_IMAP_HOST` | メールアダプタの IMAP のホスト名 |
| `EMAIL_IMAP_PORT` | IMAP のポート |
| `EMAIL_SMTP_HOST` | メールアダプタの SMTP のホスト名 |
| `EMAIL_SMTP_PORT` | SMTP のポート |
| `EMAIL_ALLOWED_USERS` | ボットにメッセージを送れるメールアドレスをカンマ区切りで指定します |
| `EMAIL_HOME_ADDRESS` | エージェントから送るメールの既定の宛先 |
| `EMAIL_HOME_ADDRESS_NAME` | メールのホームの宛先の表示名 |
| `EMAIL_POLL_INTERVAL` | メールを取りに行く間隔（秒） |
| `EMAIL_ALLOW_ALL_USERS` | 受信メールのすべての送信者を許可します |
| `DINGTALK_CLIENT_ID` | 開発者ポータルで取得した DingTalk のボットの AppKey（[open.dingtalk.com](https://open.dingtalk.com)） |
| `DINGTALK_CLIENT_SECRET` | 開発者ポータルで取得した DingTalk のボットの AppSecret |
| `DINGTALK_ALLOWED_USERS` | ボットにメッセージを送れる DingTalk のユーザー ID をカンマ区切りで指定します |
| `DINGTALK_WEBHOOK_URL` | プラットフォームをまたぐ配信や cron の配信に使う、固定のロボットの webhook URL。 |
| `DINGTALK_HOME_CHANNEL` | cron や通知の配信先として既定で使う会話 ID。 |
| `DINGTALK_HOME_CHANNEL_NAME` | DingTalk のホームチャンネルの表示名。 |
| `FEISHU_APP_ID` | [open.feishu.cn](https://open.feishu.cn/) で取得した Feishu/Lark のボットの App ID |
| `FEISHU_APP_SECRET` | Feishu/Lark のボットの App Secret |
| `FEISHU_DOMAIN` | `feishu`（中国）または `lark`（国際版）。既定値: `feishu` |
| `FEISHU_CONNECTION_MODE` | `websocket`（おすすめ）または `webhook`。既定値: `websocket` |
| `FEISHU_ENCRYPT_KEY` | webhook モード用の暗号化キー（任意） |
| `FEISHU_VERIFICATION_TOKEN` | webhook モード用の検証トークン（任意） |
| `FEISHU_ALLOWED_USERS` | ボットにメッセージを送れる Feishu のユーザー ID をカンマ区切りで指定します |
| `FEISHU_ALLOW_BOTS` | `none`（既定値） / `mentions` / `all` — 他のボットからの受信メッセージを受け取ります。[ボット同士のメッセージ](/hermes/docs/user-guide/messaging/feishu/#bot-to-bot-messaging)を参照してください |
| `FEISHU_REQUIRE_MENTION` | `true`（既定値） / `false` — グループのメッセージでボットへの @メンションを必須にするかどうか。チャットごとに `group_rules.<chat_id>.require_mention` で上書きできます。 |
| `FEISHU_HOME_CHANNEL` | cron の配信と通知に使う Feishu のチャット ID |
| `FEISHU_HOME_CHANNEL_NAME` | Feishu のホームチャンネルの表示名。 |
| `FEISHU_ALLOW_ALL_USERS` | どの Feishu ユーザーでもボットを動かせるようにします（開発時のみ）。 |
| `WECOM_BOT_ID` | 管理コンソールで取得した WeCom AI Bot の ID |
| `WECOM_SECRET` | WeCom AI Bot のシークレット |
| `WECOM_WEBSOCKET_URL` | WebSocket の URL を独自に指定します（既定値: `wss://openws.work.weixin.qq.com`） |
| `WECOM_ALLOWED_USERS` | ボットにメッセージを送れる WeCom のユーザー ID をカンマ区切りで指定します |
| `WECOM_HOME_CHANNEL` | cron の配信と通知に使う WeCom のチャット ID |
| `WECOM_CALLBACK_CORP_ID` | コールバックの自社アプリ向けの WeCom の企業 Corp ID |
| `WECOM_CALLBACK_CORP_SECRET` | その自社アプリの Corp シークレット |
| `WECOM_CALLBACK_AGENT_ID` | その自社アプリの Agent ID |
| `WECOM_CALLBACK_TOKEN` | コールバックの検証トークン |
| `WECOM_CALLBACK_ENCODING_AES_KEY` | コールバックの暗号化に使う AES キー |
| `WECOM_CALLBACK_HOST` | コールバックのサーバーのバインドアドレス（既定値: `0.0.0.0`） |
| `WECOM_CALLBACK_PORT` | コールバックのサーバーのポート（既定値: `8645`） |
| `WECOM_CALLBACK_ALLOWED_USERS` | 許可リストに載せるユーザー ID をカンマ区切りで指定します |
| `WECOM_CALLBACK_ALLOW_ALL_USERS` | `true` にすると許可リストなしですべてのユーザーを許可します |
| `WEIXIN_ACCOUNT_ID` | iLink Bot API の QR ログインで取得する Weixin のアカウント ID |
| `WEIXIN_TOKEN` | iLink Bot API の QR ログインで取得する Weixin の認証トークン |
| `WEIXIN_BASE_URL` | Weixin の iLink Bot API のベース URL を上書きします（既定値: `https://ilinkai.weixin.qq.com`） |
| `WEIXIN_CDN_BASE_URL` | メディア用の Weixin CDN のベース URL を上書きします（既定値: `https://novac2c.cdn.weixin.qq.com/c2c`） |
| `WEIXIN_DM_POLICY` | ダイレクトメッセージの方針: `open`、`allowlist`、`pairing`、`disabled`（既定値: `open`） |
| `WEIXIN_GROUP_POLICY` | グループメッセージの方針: `open`、`allowlist`、`disabled`（既定値: `disabled`） |
| `WEIXIN_ALLOWED_USERS` | ボットに DM を送れる Weixin のユーザー ID をカンマ区切りで指定します |
| `WEIXIN_GROUP_ALLOWED_USERS` | ボットとやり取りできる Weixin の**グループチャット ID**（メンバーのユーザー ID ではありません）をカンマ区切りで指定します。変数名は昔の名残で、実際に期待するのはグループ ID です。iLink が実際にグループのイベントを届ける場合にだけ効きます。QR ログインの iLink のボットの識別子（`...@im.bot`）は、ふつうの WeChat のグループメッセージをたいてい受け取りません。 |
| `WEIXIN_HOME_CHANNEL` | cron の配信と通知に使う Weixin のチャット ID |
| `WEIXIN_HOME_CHANNEL_NAME` | Weixin のホームチャンネルの表示名 |
| `WEIXIN_ALLOW_ALL_USERS` | 許可リストなしですべての Weixin ユーザーを許可します（`true`/`false`） |
| `BLUEBUBBLES_SERVER_URL` | BlueBubbles サーバーの URL（たとえば `http://192.168.1.10:1234`） |
| `BLUEBUBBLES_PASSWORD` | BlueBubbles サーバーのパスワード |
| `BLUEBUBBLES_WEBHOOK_HOST` | webhook を待ち受けるバインドアドレス（既定値: `127.0.0.1`） |
| `BLUEBUBBLES_WEBHOOK_PORT` | webhook を待ち受けるポート（既定値: `8645`） |
| `BLUEBUBBLES_HOME_CHANNEL` | cron や通知の配信先の電話番号・メールアドレス |
| `BLUEBUBBLES_ALLOWED_USERS` | 許可するユーザーをカンマ区切りで指定します |
| `BLUEBUBBLES_ALLOW_ALL_USERS` | すべてのユーザーを許可します（`true`/`false`） |
| `QQ_APP_ID` | [q.qq.com](https://q.qq.com) で取得した QQ Bot の App ID |
| `QQ_CLIENT_SECRET` | [q.qq.com](https://q.qq.com) で取得した QQ Bot の App Secret |
| `QQ_STT_API_KEY` | 外部の音声認識のフォールバックのプロバイダの API キー（任意。QQ 内蔵の ASR がテキストを返さないときに使います） |
| `QQ_STT_BASE_URL` | 外部の音声認識プロバイダのベース URL（任意） |
| `QQ_STT_MODEL` | 外部の音声認識プロバイダのモデル名（任意） |
| `QQ_ALLOWED_USERS` | ボットにメッセージを送れる QQ のユーザーの openID をカンマ区切りで指定します |
| `QQ_GROUP_ALLOWED_USERS` | グループでの @ メッセージを許可する QQ のグループ ID をカンマ区切りで指定します |
| `QQ_ALLOW_ALL_USERS` | すべてのユーザーを許可します（`true`/`false`。`QQ_ALLOWED_USERS` を上書きします） |
| `QQBOT_HOME_CHANNEL` | cron の配信と通知に使う QQ のユーザー・グループの openID |
| `QQBOT_HOME_CHANNEL_NAME` | QQ のホームチャンネルの表示名 |
| `QQ_PORTAL_HOST` | QQ のポータルのホストを上書きします（サンドボックスのゲートウェイを通すなら `sandbox.q.qq.com` を指定します。既定値: `q.qq.com`）。 |
| `QQ_SANDBOX` | 開発時のテスト向けに QQ のサンドボックスモードを有効にします（`true`/`false`） |
| `MATTERMOST_URL` | Mattermost サーバーの URL（たとえば `https://mm.example.com`） |
| `MATTERMOST_TOKEN` | Mattermost のボットトークンまたは個人用アクセストークン |
| `MATTERMOST_ALLOWED_USERS` | ボットにメッセージを送れる Mattermost のユーザー ID をカンマ区切りで指定します |
| `MATTERMOST_ALLOW_ALL_USERS` | どの Mattermost ユーザーでもボットを動かせるようにします（開発時のみ）。 |
| `MATTERMOST_ALLOWED_CHANNELS` | 設定すると、ボットはこれらのチャンネルでしか応答しません（ホワイトリスト）。 |
| `MATTERMOST_HOME_CHANNEL` | エージェントから送るメッセージ（cron、通知）の配信先のチャンネル ID |
| `MATTERMOST_REQUIRE_MENTION` | チャンネルで `@mention` を必須にします（既定値: `true`）。`false` にするとすべてのメッセージに応答します。 |
| `MATTERMOST_FREE_RESPONSE_CHANNELS` | `@mention` なしでもボットが応答するチャンネル ID をカンマ区切りで指定します |
| `MATTERMOST_REPLY_MODE` | 返信のスタイル: `thread`（スレッドで返信）または `off`（フラットなメッセージ、既定値） |
| `MATRIX_HOMESERVER` | Matrix のホームサーバーの URL（たとえば `https://matrix.org`） |
| `MATRIX_ACCESS_TOKEN` | ボットの認証に使う Matrix のアクセストークン |
| `MATRIX_USER_ID` | Matrix のユーザー ID（たとえば `@hermes:matrix.org`）。パスワードログインでは必須で、アクセストークンを使う場合は任意です |
| `MATRIX_PASSWORD` | Matrix のパスワード（アクセストークンの代わりに使えます） |
| `MATRIX_ALLOWED_USERS` | ボットにメッセージを送れる Matrix のユーザー ID をカンマ区切りで指定します（たとえば `@alice:matrix.org`） |
| `MATRIX_ALLOW_ALL_USERS` | どの Matrix ユーザーでもボットを動かせるようにします（開発時のみ）。 |
| `MATRIX_HOME_CHANNEL` | cron や通知の配信先として既定で使うルーム ID。 |
| `MATRIX_HOME_CHANNEL_NAME` | Matrix のホームルームの表示名。 |
| `MATRIX_ALLOWED_ROOMS` | ボットの応答を引き出せる Matrix のルーム ID をカンマ区切りで指定します |
| `MATRIX_HOME_ROOM` | エージェントから送るメッセージの配信先のルーム ID（たとえば `!abc123:matrix.org`） |
| `MATRIX_ENCRYPTION` | エンドツーエンド暗号化を有効にします（`true`/`false`、既定値: `false`） |
| `MATRIX_E2EE_MODE` | Matrix の E2EE の挙動: `off`、`optional`、`required`。設定すると `MATRIX_ENCRYPTION` を上書きします。 |
| `MATRIX_DEVICE_ID` | 再起動をまたいで E2EE を保つための固定の Matrix のデバイス ID（たとえば `HERMES_BOT`）。これがないと E2EE の鍵が起動のたびに入れ替わり、過去のルームの復号ができなくなります。 |
| `MATRIX_REACTIONS` | 受信メッセージに処理状況の絵文字リアクションを付けます（既定値: `true`）。`false` にすると無効になります。 |
| `MATRIX_REQUIRE_MENTION` | ルームで `@mention` を必須にします（既定値: `true`）。`false` にするとすべてのメッセージに応答します。 |
| `MATRIX_FREE_RESPONSE_ROOMS` | `@mention` なしでもボットが応答するルーム ID をカンマ区切りで指定します |
| `MATRIX_IGNORE_USER_PATTERNS` | 無視する Matrix のブリッジ・アプリサービスのゴーストユーザー ID の正規表現をカンマ区切りで指定します |
| `MATRIX_PROCESS_NOTICES` | 受信した Matrix の `m.notice` イベントを処理します（既定値: `false`） |
| `MATRIX_SESSION_SCOPE` | プロジェクトのルームでの Matrix のセッションの単位: `auto`、`room`、`thread`（既定値: `auto`） |
| `MATRIX_TOOLS_ALLOW_REDACTION` | Matrix のメッセージ削除ツールの実行を許可します（既定値: `false`） |
| `MATRIX_TOOLS_ALLOW_INVITES` | Matrix の招待ツールの実行を許可します（既定値: `false`） |
| `MATRIX_TOOLS_ALLOW_ROOM_CREATE` | Matrix のルーム作成ツールの実行を許可します（既定値: `false`） |
| `MATRIX_ALLOW_ROOM_MENTIONS` | ルームの全員に通知する `@room` のメンションの送信を許可します（既定値: `false`） |
| `MATRIX_AUTO_THREAD` | ルームのメッセージで自動的にスレッドを作ります（既定値: `true`） |
| `MATRIX_DM_AUTO_THREAD` | Matrix の DM のメッセージで自動的にスレッドを作ります（既定値: `false`） |
| `MATRIX_DM_MENTION_THREADS` | DM でボットが `@mentioned` されたときにスレッドを作ります（既定値: `false`） |
| `MATRIX_APPROVAL_REQUIRE_SENDER` | 承認やモデル選択のリアクションを、依頼した本人が分かっている場合はその人からのものに限ります（既定値: `true`） |
| `MATRIX_APPROVAL_TIMEOUT_SECONDS` | Matrix のリアクションによる承認・モデル選択の待ち時間（既定値: `300`） |
| `MATRIX_ALLOW_PUBLIC_ROOMS` | Matrix のルーム作成ツールが公開ルームを作れるようにします（既定値: `false`） |
| `MATRIX_MAX_MEDIA_BYTES` | Matrix のメディアのアップロード・ダウンロードの最大サイズ（バイト、既定値: `104857600`） |
| `MATRIX_RECOVERY_KEY` | デバイスの鍵が入れ替わったあとにクロス署名の検証を行うためのリカバリーキー。クロス署名を有効にした E2EE の構成ではおすすめです。 |
| `MATRIX_RECOVERY_KEY_OUTPUT_FILE` | 生成した Matrix のリカバリーキーを一度だけ書き出すパス（任意）。モード `0600` で作られ、上書きされることはありません。 |
| `HASS_TOKEN` | Home Assistant の長期アクセストークン（HA のプラットフォームとツールが使えるようになります） |
| `HASS_URL` | Home Assistant の URL（既定値: `http://homeassistant.local:8123`） |
| `WEBHOOK_ENABLED` | webhook のプラットフォームアダプタを有効にします（`true`/`false`） |
| `WEBHOOK_PORT` | webhook を受け取る HTTP サーバーのポート（既定値: `8644`） |
| `WEBHOOK_SECRET` | webhook の署名検証に使う全体共通の HMAC の秘密（ルートごとの指定がないときの代わりとして使われます） |
| `API_SERVER_ENABLED` | OpenAI 互換の API サーバーを有効にします（`true`/`false`）。他のプラットフォームと並行して動きます。 |
| `API_SERVER_KEY` | API サーバーの認証に使うベアラートークン。API サーバーを有効にするときは常に必須です。 |
| `API_SERVER_CORS_ORIGINS` | API サーバーを直接呼び出せるブラウザのオリジンをカンマ区切りで指定します（たとえば `http://localhost:3000,http://127.0.0.1:3000`）。既定は無効です。 |
| `API_SERVER_PORT` | API サーバーのポート（既定値: `8642`） |
| `API_SERVER_HOST` | API サーバーのホスト・バインドアドレス（既定値: `127.0.0.1`）。ループバックでも `API_SERVER_KEY` は必要です。ブラウザからアクセスするなら `API_SERVER_CORS_ORIGINS` を絞った許可リストにしてください。 |
| `API_SERVER_MODEL_NAME` | `/v1/models` で公開するモデル名。既定ではプロファイル名（既定のプロファイルなら `hermes-agent`）になります。Open WebUI のようなフロントエンドが接続ごとに別々のモデル名を必要とする、複数ユーザーの構成で役立ちます。 |
| `GATEWAY_PROXY_URL` | メッセージの転送先となるリモートの Hermes API サーバーの URL（[プロキシモード](/hermes/docs/user-guide/messaging/matrix/#proxy-mode-e2ee-on-macos)）。設定すると、ゲートウェイはプラットフォームの入出力だけを担当し、エージェントの処理はすべてリモートのサーバーに任せます。`config.yaml` の `gateway.proxy_url` でも設定できます。 |
| `GATEWAY_PROXY_KEY` | プロキシモードでリモートの API サーバーに認証するためのベアラートークン。リモート側の `API_SERVER_KEY` と一致している必要があります。 |
| `MESSAGING_CWD` | ゲートウェイの作業ディレクトリの互換用のフォールバック（非推奨）。`config.yaml` の `terminal.cwd` のほうが向いています。 |
| `GATEWAY_ALLOWED_USERS` | すべてのプラットフォームで許可するユーザー ID をカンマ区切りで指定します |
| `GATEWAY_ALLOW_ALL_USERS` | 許可リストなしですべてのユーザーを許可します（`true`/`false`、既定値: `false`） |

### ウェブダッシュボードと Hermes Desktop {#web-dashboard-hermes-desktop}

[ウェブダッシュボード](/hermes/docs/user-guide/features/web-dashboard/)の認証と、[Hermes Desktop をリモートのバックエンドにつなぐ](/hermes/docs/user-guide/features/web-dashboard/#connecting-hermes-desktop-to-a-remote-backend)ための設定です。秘密情報だけを置くという決まりに従い、認証情報は `~/.hermes/.env` に置きます。OAuth の `client_id` は `config.yaml` の `dashboard.oauth` の下に書くほうが向いています（環境変数を設定した場合はそちらが優先されます）。

ダッシュボードの認証プロバイダは 3 種類が同梱されています。Hermes Desktop のリモート接続や、インターネットに面したダッシュボードでは **OAuth（Nous Portal）** がおすすめです。`HERMES_DASHBOARD_OAUTH_CLIENT_ID` を設定してください（`hermes dashboard register` で発行できます）。同梱の**ユーザー名とパスワード**のプロバイダ（`HERMES_DASHBOARD_BASIC_AUTH_*`）は、信頼できる LAN や VPN の内側にあるバックエンドではいちばん手軽ですが、そのままインターネットに公開するのには向きません。自前の ID プロバイダで認証したい場合は、**セルフホストの OIDC** のプロバイダ（`HERMES_DASHBOARD_OIDC_*`）を使います。いずれの場合も、ループバック以外へのバインド（`hermes dashboard --host 0.0.0.0`）で認証のゲートが働きます。全体像は[ウェブダッシュボード → 認証](/hermes/docs/user-guide/features/web-dashboard/#authentication-gated-mode)を参照してください。

| 変数 | 説明 |
|----------|-------------|
| `HERMES_DASHBOARD_BASIC_AUTH_USERNAME` | 同梱のユーザー名・パスワード方式のダッシュボード認証プロバイダ（`plugins/dashboard_auth/basic`）のユーザー名。パスワードと一緒に設定するとこのプロバイダが有効になります。`dashboard.basic_auth.username` を上書きします。 |
| `HERMES_DASHBOARD_BASIC_AUTH_PASSWORD` | basic プロバイダの平文のパスワード（読み込み時にメモリ上でハッシュ化されます）。設定の `password_hash` より優先されるので、環境変数で入れ替えられます。`dashboard.basic_auth.password` を上書きします。 |
| `HERMES_DASHBOARD_BASIC_AUTH_PASSWORD_HASH` | basic プロバイダの scrypt のパスワードハッシュ（平文を残さずに済むのでこちらがおすすめです）。`python -c "from plugins.dashboard_auth.basic import hash_password; print(hash_password('PW'))"` で計算します。`dashboard.basic_auth.password_hash` を上書きします。 |
| `HERMES_DASHBOARD_BASIC_AUTH_SECRET` | basic プロバイダのステートレスなセッショントークンに署名する HMAC のキー（32 バイト以上、base64 / 16 進数 / 生のいずれか）。再起動をまたいでセッションを保ちたい、または複数のワーカーで共有したいなら明示的に設定してください。空だとプロセスごとにランダムになり、再起動のたびにログアウトします。`dashboard.basic_auth.secret` を上書きします。 |
| `HERMES_DASHBOARD_BASIC_AUTH_TTL_SECONDS` | basic プロバイダのアクセストークンの有効期間（既定は 12 時間）。`dashboard.basic_auth.session_ttl_seconds` を上書きします。 |
| `HERMES_DASHBOARD_OAUTH_CLIENT_ID` | 認証付き・公開のダッシュボード向けの OAuth のクライアント ID（`agent:{instance_id}`）。設定すると Nous のプロバイダ（`plugins/dashboard_auth/nous`）が有効になります。`dashboard.oauth.client_id` を上書きします。`hermes dashboard register` で発行します。 |
| `HERMES_DASHBOARD_PUBLIC_URL` | リバースプロキシの後ろでダッシュボードに到達するための完全な公開 URL。OAuth のコールバックの組み立てを決め、そのホスト名をそのまま HTTP の Host / WebSocket の Origin のチェックに加えます。またバックエンドがループバックにバインドしていても、公開ホストがループバック以外なら認証のゲートを必須にします。`dashboard.public_url` を上書きします。 |
| `HERMES_DASHBOARD_OIDC_ISSUER` | 同梱のセルフホスト OIDC プロバイダ（`plugins/dashboard_auth/self_hosted`）の issuer の URL。有効にするには必須です。`dashboard.oauth.self_hosted.issuer` を上書きします。 |
| `HERMES_DASHBOARD_OIDC_CLIENT_ID` | セルフホスト OIDC プロバイダの公開クライアント ID（認可コード + PKCE）。有効にするには必須です。`dashboard.oauth.self_hosted.client_id` を上書きします。 |
| `HERMES_DASHBOARD_OIDC_SCOPES` | セルフホスト OIDC プロバイダで要求する OIDC のスコープ（既定は `openid profile email`）。`dashboard.oauth.self_hosted.scopes` を上書きします。 |
| `HERMES_DESKTOP_REMOTE_URL` | （Desktop 側）リモートのバックエンドのベース URL。たとえば `http://host:9119`。設定するとアプリ内の Gateway URL を上書きします。サインインは Gateway の設定パネルから行います（バックエンドが提示する方式に応じて OAuth のリダイレクトかユーザー名・パスワードになります）。 |
| `HERMES_DESKTOP_HERMES` | Desktop のバックエンドのコマンドを上書きします。パッケージャーや Nix、切り分けのときに、バックエンドの探索後に Electron を特定の `hermes` の実行ファイルに向けるために使います。 |
| `HERMES_DESKTOP_HERMES_ROOT` | `hermes desktop --hermes-root` が使う Desktop のソースのチェックアウト先の上書き。パッケージ版の初回起動時のインストールや `PATH` 上の既存の `hermes` より先に参照されます。 |
| `HERMES_DESKTOP_IGNORE_EXISTING` | `1` にすると、バックエンドの解決時に Desktop が `PATH` 上の既存の `hermes` を無視します。`hermes desktop --ignore-existing` と同じです。 |
| `HERMES_DESKTOP_CWD` | Desktop のチャットセッションの最初のプロジェクトディレクトリ。`hermes desktop --cwd` が設定します。 |
| `HERMES_DESKTOP_PYTHON` | バックエンド用の Python インタプリタの絶対パス。ソースのチェックアウトで Electron が自動解決するより先に参照されます。共有の venv を使い回すために worktree の開発用ヘルパーが使います（[worktree から TUI と Desktop を動かす](/hermes/docs/developer-guide/worktree-ui-dev/)を参照）。 |
| `HERMES_DESKTOP_DEV_SERVER` | Electron のシェルがパッケージ済みのバンドルの代わりに読み込む Vite の開発サーバーの URL（たとえば `http://127.0.0.1:5174`）。`npm run dev` が自動で設定します。アプリ自体をいじるときにだけ関係します。 |
| `HERMES_DESKTOP_CDP_PORT` | DOM / CSS を調べるツール向けに、レンダラーが `127.0.0.1` で公開する Chrome DevTools Protocol のポートを上書きします（既定は `9222`）。開発サーバーでの実行（`npm run dev`、`hgui`）では自動で開きます。パッケージ済みのアプリでは決して開かず、ここに値を入れてもそれは変わりません。開発時の実行で無効にしたいときは `off` を設定します。このポートに届くものは何であれレンダラー内でコードを実行できます。 |

### Microsoft Graph（Teams の会議） {#microsoft-graph-teams-meetings}

Teams の会議の要約パイプライン（近日提供）で使う Microsoft Graph の REST クライアント向けの、アプリ単体の認証情報です。Azure ポータルでの手順と必要な API の権限は、[Microsoft Graph アプリケーションの登録](/hermes/docs/guides/microsoft-graph-app-registration/)を参照してください。

| 変数 | 説明 |
|----------|-------------|
| `MSGRAPH_TENANT_ID` | Graph のアプリ登録に使う Azure AD のテナント ID（ディレクトリの GUID）。 |
| `MSGRAPH_CLIENT_ID` | Azure のアプリ登録のアプリケーション（クライアント）ID。 |
| `MSGRAPH_CLIENT_SECRET` | アプリ登録のクライアントシークレットの値。`~/.hermes/.env` に `chmod 600` で置き、Azure ポータルから定期的に入れ替えてください。 |
| `MSGRAPH_SCOPE` | クライアント資格情報でトークンを要求するときの OAuth2 のスコープ（既定値: `https://graph.microsoft.com/.default`）。 |
| `MSGRAPH_AUTHORITY_URL` | Microsoft ID プラットフォームの authority（既定値: `https://login.microsoftonline.com`）。各国向け・ソブリンクラウドのときだけ上書きします（GCC High なら `https://login.microsoftonline.us` など）。 |

### Microsoft Graph の webhook リスナー {#microsoft-graph-webhook-listener}

Graph のイベント（Teams の会議、カレンダー、チャットなど）の変更通知を受け取るリスナーです。設定とセキュリティの強化については [Microsoft Graph の webhook リスナー](/hermes/docs/user-guide/messaging/msgraph-webhook/)を参照してください。

| 変数 | 説明 |
|----------|-------------|
| `MSGRAPH_WEBHOOK_ENABLED` | `msgraph_webhook` のゲートウェイプラットフォームを有効にします（`true`/`1`/`yes`）。 |
| `MSGRAPH_WEBHOOK_PORT` | リスナーがバインドするポート（既定値: `8646`）。 |
| `MSGRAPH_WEBHOOK_CLIENT_STATE` | Graph がすべての通知で返してくる共有の秘密。`hmac.compare_digest` で比較されます。`openssl rand -hex 32` で生成します。 |
| `MSGRAPH_WEBHOOK_ACCEPTED_RESOURCES` | 受け付ける Graph のリソースのパス・パターンの許可リストをカンマ区切りで指定します（たとえば `communications/onlineMeetings,chats/*/messages`）。末尾の `*` は前方一致です。空ならすべて受け付けます。 |
| `MSGRAPH_WEBHOOK_ALLOWED_SOURCE_CIDRS` | リスナーに POST できる CIDR の範囲をカンマ区切りで指定します（たとえば `52.96.0.0/14,52.104.0.0/14`）。空ならすべて許可します（既定）。本番では Microsoft Graph が公開している送信元の範囲に絞ってください。 |

### Teams の会議の要約の配信 {#teams-meeting-summary-delivery}

[`teams_pipeline` プラグイン](/hermes/docs/user-guide/messaging/msgraph-webhook/)を有効にしたときだけ使います。設定は `config.yaml` の `platforms.teams.extra` の下でも指定できます。両方に書いた場合は環境変数が優先されます。[Microsoft Teams → 会議の要約の配信](/hermes/docs/user-guide/messaging/teams/#meeting-summary-delivery-teams-meeting-pipeline)を参照してください。

| 変数 | 説明 |
|----------|-------------|
| `TEAMS_DELIVERY_MODE` | `graph` または `incoming_webhook`。 |
| `TEAMS_INCOMING_WEBHOOK_URL` | Teams が生成する webhook の URL。`TEAMS_DELIVERY_MODE=incoming_webhook` のときは必須です。 |
| `TEAMS_GRAPH_ACCESS_TOKEN` | Graph 経由の配信に使う、あらかじめ取得した委任アクセストークン。未設定なら書き込み側が `MSGRAPH_*` のアプリの認証情報にフォールバックするので、必要になることはまれです。 |
| `TEAMS_TEAM_ID` | チャンネルへ配信するときの対象の Team ID（`graph` モード）。 |
| `TEAMS_CHANNEL_ID` | 対象のチャンネル ID（`TEAMS_TEAM_ID` と組にして使います）。 |
| `TEAMS_CHAT_ID` | 対象の 1 対 1 またはグループのチャット ID（`graph` モードでチーム + チャンネルの代わりに使えます）。 |

### LINE Messaging API {#line-messaging-api}

同梱の LINE のプラットフォームプラグイン（`plugins/platforms/line/`）が使います。設定の全体は[メッセージングのゲートウェイ → LINE](/hermes/docs/user-guide/messaging/line/)を参照してください。

| 変数 | 説明 |
|----------|-------------|
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Developers コンソール（Messaging API のタブ）で取得する長期のチャネルアクセストークン。必須です。 |
| `LINE_CHANNEL_SECRET` | チャネルシークレット（Basic settings のタブ）。webhook の HMAC-SHA256 の署名検証に使います。必須です。 |
| `LINE_HOST` | webhook をバインドするホスト（既定値: `0.0.0.0`）。 |
| `LINE_PORT` | webhook をバインドするポート（既定値: `8646`）。 |
| `LINE_PUBLIC_URL` | 公開の HTTPS のベース URL（たとえば `https://my-tunnel.example.com`）。画像・音声・動画の送信には必須です。LINE は HTTPS で到達できる URL しか受け付けません。 |
| `LINE_ALLOWED_USERS` | ボットに DM を送れるユーザー ID をカンマ区切りで指定します（`U` で始まります）。 |
| `LINE_ALLOWED_GROUPS` | ボットが応答するグループ ID をカンマ区切りで指定します（`C` で始まります）。 |
| `LINE_ALLOWED_ROOMS` | ボットが応答するルーム ID をカンマ区切りで指定します（`R` で始まります）。 |
| `LINE_ALLOW_ALL_USERS` | 開発時だけの抜け道で、どの送信元も受け付けます。既定値: `false`。 |
| `LINE_HOME_CHANNEL` | `deliver: line` の cron ジョブの既定の配信先。 |
| `LINE_SLOW_RESPONSE_THRESHOLD` | LLM が遅いときに Template Buttons のポストバックが発火するまでの秒数（既定値: `45`）。`0` にすると無効になり、常に Push で代替します。 |
| `LINE_PENDING_TEXT` | ポストバックのボタンと一緒に表示される吹き出しのテキスト。 |
| `LINE_BUTTON_LABEL` | ポストバックのボタンのラベル（既定値: `Get answer`）。 |
| `LINE_DELIVERED_TEXT` | 配信済みのポストバックをもう一度タップしたときの返信（既定値: `Already replied ✅`）。 |
| `LINE_INTERRUPTED_TEXT` | `/stop` で取り残されたポストバックのボタンをタップしたときの返信（既定値: `Run was interrupted before completion.`）。 |

### ntfy（プッシュ通知） {#ntfy-push-notifications}

[ntfy](https://ntfy.sh/) は HTTP ベースの軽量なプッシュ通知のサービスです。[ntfy のモバイルアプリ](https://ntfy.sh/docs/subscribe/phone/)からトピックを購読し、そのトピックに投稿するとエージェントと会話できます。

| 変数 | 説明 |
|----------|-------------|
| `NTFY_TOPIC` | 購読するトピック（受信メッセージ用）。必須です。 |
| `NTFY_SERVER_URL` | サーバーの URL（既定値: `https://ntfy.sh`）。プライバシーを重視するならセルフホストの ntfy を指定します。 |
| `NTFY_TOKEN` | 認証トークン（任意）。ベアラートークン（たとえば `tk_xyz`）か、Basic 認証用の `user:pass` です。 |
| `NTFY_PUBLISH_TOPIC` | 返信を送るトピック（既定では `NTFY_TOPIC` と同じ）。 |
| `NTFY_MARKDOWN` | `true` にすると `X-Markdown: true` ヘッダーを付けて返信します。既定値: `false`。 |
| `NTFY_ALLOWED_USERS` | 許可リスト（ユーザー ID として扱われますが、ntfy ではトピック名です）。ふつうは `NTFY_TOPIC` と同じ値を設定します。 |
| `NTFY_ALLOW_ALL_USERS` | 開発時だけの抜け道で、アクセス制御された非公開のトピックでのみ安全です。既定値: `false`。 |
| `NTFY_HOME_CHANNEL` | `deliver: ntfy` の cron ジョブの既定の配信先。 |
| `NTFY_HOME_CHANNEL_NAME` | ホームチャンネルの人が読むラベル（既定ではトピック名）。 |

信頼できないトピックで運用する前に、[ntfy のメッセージングガイド](/hermes/docs/user-guide/messaging/ntfy/)、とくに **identity model** の節を読んでください。

### IRC {#irc}

Hermes を IRC サーバーにつなぎます。外部の依存はありません。[IRC のメッセージングガイド](/hermes/docs/user-guide/messaging/irc/)を参照してください。

| 変数 | 説明 |
|----------|-------------|
| `IRC_SERVER` | IRC サーバーのホスト名（たとえば `irc.libera.chat`）。必須です。 |
| `IRC_CHANNEL` | 参加するチャンネル（たとえば `#hermes`）。複数ならカンマ区切りにします。必須です。 |
| `IRC_NICKNAME` | ボットのニックネーム（既定値: `hermes-bot`）。必須です。 |
| `IRC_PORT` | サーバーのポート（既定値: TLS ありなら `6697`、なしなら `6667`）。 |
| `IRC_USE_TLS` | TLS を使います（`true`/`false`。ポート 6697 では既定で `true`）。 |
| `IRC_SERVER_PASSWORD` | `PASS` コマンド用のサーバーのパスワード（任意）。 |
| `IRC_NICKSERV_PASSWORD` | 接続時に自動で IDENTIFY するための NickServ のパスワード（任意）。 |
| `IRC_ALLOWED_USERS` | ボットと会話できるニックネームをカンマ区切りで指定します。 |
| `IRC_ALLOW_ALL_USERS` | チャンネルにいる誰でもボットと会話できるようにします（開発時のみ）。 |
| `IRC_HOME_CHANNEL` | cron や通知の配信に使うチャンネル（既定では `IRC_CHANNEL`）。 |

### SimpleX {#simplex}

ローカルの `simplex-chat` デーモン経由で Hermes を [SimpleX Chat](https://simplex.chat/) のネットワークにつなぎます。[SimpleX のメッセージングガイド](/hermes/docs/user-guide/messaging/simplex/)を参照してください。

| 変数 | 説明 |
|----------|-------------|
| `SIMPLEX_WS_URL` | simplex-chat デーモンの WebSocket の URL（たとえば `ws://127.0.0.1:5225`）。 |
| `SIMPLEX_ALLOWED_USERS` | ボットと会話できる SimpleX の連絡先 ID をカンマ区切りで指定します。 |
| `SIMPLEX_ALLOW_ALL_USERS` | どの連絡先でもボットと会話できるようにします（開発時のみ。許可リストが無効になります）。 |
| `SIMPLEX_AUTO_ACCEPT` | 届いた連絡先の申請を自動で承認します（既定値: `true`）。 |
| `SIMPLEX_GROUP_ALLOWED` | ボットが参加する SimpleX のグループ ID をカンマ区切りで指定します。`*` にするとどのグループも許可します。省略するとグループのメッセージを完全に無視します（グループにいるボットは全員のやり取りを処理してしまうので、こちらのほうが安全な既定です）。 |
| `SIMPLEX_HOME_CHANNEL` | cron や通知の配信先として既定で使う連絡先・グループの ID。 |
| `SIMPLEX_HOME_CHANNEL_NAME` | ホームチャンネルの人が読むラベル（既定では ID）。 |

### Photon {#photon}

Node のサイドカー経由で Hermes を [Photon](https://photon.codes/) / Spectrum（iMessage やその他の Spectrum のプラットフォーム）につなぎます。[Photon のメッセージングガイド](/hermes/docs/user-guide/messaging/photon/)を参照してください。

| 変数 | 説明 |
|----------|-------------|
| `PHOTON_PROJECT_ID` | Spectrum のプロジェクト ID（プロジェクトの `spectrumProjectId`。`hermes photon setup` が設定します）。 |
| `PHOTON_PROJECT_SECRET` | Spectrum のプロジェクト ID と組になるプロジェクトのシークレット（`hermes photon setup` が設定します）。 |
| `PHOTON_ALLOWED_USERS` | ボットと会話できる E.164 形式の電話番号をカンマ区切りで指定します。 |
| `PHOTON_ALLOW_ALL_USERS` | どの送信者でもボットを動かせるようにします（開発時のみ。許可リストが無効になります）。 |
| `PHOTON_REQUIRE_MENTION` | メンションのウェイクワードに一致しないグループチャットのメッセージを無視します（`true`/`false`、既定値 `false`）。 |
| `PHOTON_MENTION_PATTERNS` | グループチャット向けのメンションのウェイクワードの正規表現（JSON のリスト、またはカンマ・改行区切り。既定では Hermes のウェイクワード）。 |
| `PHOTON_HOME_CHANNEL` | cron や通知の配信先として既定で使う Photon の対象: Spectrum のスペース ID、DM の GUID、または E.164 形式の電話番号そのもの。 |
| `PHOTON_HOME_CHANNEL_NAME` | ホームチャンネルの人が読むラベル。 |
| `PHOTON_MARKDOWN` | エージェントの返信をマークダウンで送ります。iMessage はそのまま描画し、他の Spectrum のプラットフォームではプレーンテキストに落ちます（`true`/`false`、既定値 `true`）。 |
| `PHOTON_REACTIONS` | 処理状況として 👀/👍/👎 のタップバックをメッセージに付け、ボットのメッセージへのタップバックをエージェントに渡します（`true`/`false`、既定値 `false`）。 |
| `PHOTON_READ_RECEIPTS` | 受信した iMessage を Hermes に転送したあと既読にします（`true`/`false`、既定値 `true`）。 |
| `PHOTON_TELEMETRY` | サイドカーで Spectrum SDK のテレメトリを有効にします（`true`/`false`、既定値 `false`。`hermes photon telemetry on|off` で切り替えます）。 |
| `PHOTON_SIDECAR_PORT` | Node のサイドカーの制御と受信のためのループバックのポート（既定値 `8789`）。 |
| `PHOTON_SIDECAR_AUTOSTART` | 接続時に Node のサイドカーを起動します（`true`/`false`、既定値 `true`）。 |
| `PHOTON_NODE_BIN` | node のバイナリのパス（既定値: `shutil.which('node')`）。 |
| `PHOTON_DASHBOARD_HOST` | Photon Dashboard API のホスト（既定値 `https://app.photon.codes`）。 |
| `PHOTON_SPECTRUM_HOST` | Photon Spectrum API のホスト（既定値 `https://spectrum.photon.codes`）。 |

### Buzz（Nostr のコミュニティ） {#buzz-nostr-communities}

| 変数 | 説明 |
|----------|-------------|
| `BUZZ_RELAY_URL` | Buzz のコミュニティリレーのベース URL（たとえば `https://mycommunity.communities.buzz.xyz`） |
| `BUZZ_PRIVATE_KEY` | エージェントの Buzz の識別子に使う Nostr の秘密鍵（nsec または 16 進数）。Buzz で唯一の秘密情報です |
| `BUZZ_CREDENTIALS_FILE` | nsec を保持する JSON の認証情報ファイル（`BUZZ_PRIVATE_KEY` が未設定のときに使われます） |
| `BUZZ_CHANNELS` | 監視するチャンネルの UUID をカンマ区切りで指定します（既定では参加中のすべてのチャンネル） |
| `BUZZ_HOME_CHANNEL` | cron や通知の配信に使うチャンネルの UUID（既定では監視中の最初のチャンネル） |
| `BUZZ_ALLOWED_USERS` | エージェントと会話できる npub または 16 進数の公開鍵をカンマ区切りで指定します |
| `BUZZ_ALLOW_ALL_USERS` | コミュニティのメンバーなら誰でもエージェントと会話できるようにします（`true`/`false`） |
| `BUZZ_TRANSPORT` | 受信の経路: `auto`（WebSocket、失敗時はポーリング。既定値）、`websocket`、`poll` |
| `BUZZ_POLL_INTERVAL` | 受信をポーリングする間隔の秒数（既定値: `4`） |
| `BUZZ_AUTH_TAG` | NIP-42 の WebSocket 認証に使う NIP-OA の所有者証明の認証タグの JSON（任意） |
| `BUZZ_CLI_PATH` | buzz の CLI のバイナリのパス（既定値: PATH 上の `buzz`、次に `~/bin/buzz`） |

### Microsoft Teams（アダプタ） {#microsoft-teams-adapter}

Microsoft Teams のプラットフォームアダプタ（Bot Framework / Azure AD）です。上の [Microsoft Graph（Teams の会議）](#microsoft-graph-teams-meetings)の連携とは別物です。[Teams のメッセージングガイド](/hermes/docs/user-guide/messaging/teams/)を参照してください。

| 変数 | 説明 |
|----------|-------------|
| `TEAMS_CLIENT_ID` | Azure AD のアプリケーション（Bot Framework）のクライアント ID。 |
| `TEAMS_CLIENT_SECRET` | Azure AD のアプリケーションのクライアントシークレット。 |
| `TEAMS_TENANT_ID` | ボットのアプリケーションを置く Azure AD のテナント ID。 |
| `TEAMS_HOST` | webhook をバインドするホスト（既定値: 未設定 → デュアルスタックで IPv4 と IPv6 のすべてのインターフェース）。 |
| `TEAMS_PORT` | webhook を待ち受けるポート（Bot Framework の既定値: `3978`）。 |
| `TEAMS_ALLOWED_USERS` | ボットと会話できる Teams のユーザー ID / UPN をカンマ区切りで指定します。 |
| `TEAMS_ALLOW_ALL_USERS` | どの Teams ユーザーでもボットを動かせるようにします（開発時のみ）。 |
| `TEAMS_HOME_CHANNEL` | cron や通知の配信先として既定で使うチャット・チャンネルの ID。 |
| `TEAMS_HOME_CHANNEL_NAME` | Teams のホームチャンネルの表示名。 |

### Raft {#raft}

| 変数 | 説明 |
|----------|-------------|
| `RAFT_PROFILE` | Raft のエージェントのプロファイルのスラッグ。設定するとアダプタが自動で有効になります。 |

### メッセージングの詳細な調整 {#advanced-messaging-tuning}

送信メッセージのまとめ処理を絞るための、プラットフォームごとの細かいつまみです。ほとんどの人は触る必要がありません。既定値は、もたつきを感じさせずに各プラットフォームのレート制限を守れるように決めてあります。

| 変数 | 説明 |
|----------|-------------|
| `HERMES_TELEGRAM_TEXT_BATCH_DELAY_SECONDS` | 溜めた Telegram のテキストの断片を送り出すまでの待ち時間（既定値: `0.6`）。 |
| `HERMES_TELEGRAM_TEXT_BATCH_SPLIT_DELAY_SECONDS` | Telegram の 1 通が長さの上限を超えて分割されたとき、断片の間に入れる待ち時間（既定値: `2.0`）。 |
| `HERMES_SIMPLEX_TEXT_BATCH_DELAY` | 連続して届いたテキストメッセージを 1 つの MessageEvent にまとめるための静音時間の秒数（既定値: `0.8`）。Telegram のテキストのまとめ処理と同じ仕組みです。 |
| `HERMES_TELEGRAM_MEDIA_BATCH_DELAY_SECONDS` | 溜めた Telegram のメディアを送り出すまでの待ち時間（既定値: `0.6`）。 |
| `HERMES_TELEGRAM_FOLLOWUP_GRACE_SECONDS` | エージェントが終わったあと、追いかけのメッセージを送るまでの待ち時間。最後のストリームの断片と競合しないようにします。 |
| `HERMES_TELEGRAM_HTTP_CONNECT_TIMEOUT` / `_READ_TIMEOUT` / `_WRITE_TIMEOUT` / `_POOL_TIMEOUT` | 内部で使う `python-telegram-bot` の HTTP のタイムアウト（秒）を上書きします。 |
| `HERMES_TELEGRAM_INIT_TIMEOUT` | ゲートウェイの起動時に Telegram の `initialize()` が接続を試みる 1 回あたりの上限（秒）。到達できないフォールバック IP の連鎖で起動が止まり続けないようにします（既定値: `30`）。 |
| `HERMES_TELEGRAM_HTTP_POOL_SIZE` | Telegram API への同時 HTTP 接続の最大数。 |
| `HERMES_TELEGRAM_DISABLE_FALLBACK_IPS` | DNS が失敗したときに使う、埋め込みの Cloudflare のフォールバック IP を無効にします（`true`/`false`）。 |
| `HERMES_DISCORD_TEXT_BATCH_DELAY_SECONDS` | 溜めた Discord のテキストの断片を送り出すまでの待ち時間（既定値: `0.6`）。 |
| `HERMES_DISCORD_TEXT_BATCH_SPLIT_DELAY_SECONDS` | Discord の 1 通が長さの上限を超えて分割されたとき、断片の間に入れる待ち時間（既定値: `2.0`）。 |
| `HERMES_DISCORD_LIVENESS_INTERVAL_SECONDS` | `discord.websocket_liveness_interval_seconds` の互換用・手動の上書き。動作中の Discord Gateway の WebSocket を確認する間隔（既定値: `15`。`0` で無効）。`config.yaml` のキーのほうが向いています。 |
| `HERMES_DISCORD_LIVENESS_FAILURE_THRESHOLD` | `discord.websocket_liveness_failure_threshold` の互換用・手動の上書き。再接続を強制するまでに WebSocket が不健全と判定された連続回数（既定値: `2`）。`config.yaml` のキーのほうが向いています。 |
| `HERMES_MATRIX_TEXT_BATCH_DELAY_SECONDS` / `_SPLIT_DELAY_SECONDS` | Telegram のまとめ処理のつまみの Matrix 版です。 |
| `HERMES_FEISHU_TEXT_BATCH_DELAY_SECONDS` / `_SPLIT_DELAY_SECONDS` / `_MAX_CHARS` / `_MAX_MESSAGES` | Feishu のまとめ処理の調整 — 待ち時間、分割時の待ち時間、1 通あたりの最大文字数、1 回あたりの最大メッセージ数。 |
| `HERMES_FEISHU_MEDIA_BATCH_DELAY_SECONDS` | Feishu のメディアを送り出すまでの待ち時間。 |
| `HERMES_FEISHU_DEDUP_CACHE_SIZE` | Feishu の webhook の重複除去のキャッシュの大きさ（既定値: `1024`）。 |
| `HERMES_WECOM_TEXT_BATCH_DELAY_SECONDS` / `_SPLIT_DELAY_SECONDS` | WeCom のまとめ処理の調整。 |
| `HERMES_VISION_DOWNLOAD_TIMEOUT` | 画像を視覚モデルに渡す前にダウンロードするときのタイムアウト（秒、既定値: `30`）。 |
| `HERMES_VISION_MAX_CONCURRENCY` | プロセス全体での画像の**エンコード・リサイズ**の同時実行数の上限（`auxiliary.vision.max_concurrency` の上書き。既定値: ホストの CPU のコア数で、上限なし）。制限するのは CPU を使うエンコードの工程だけなので、動画のフレームを一気に処理してもすべてのコアを埋め尽くしてイベントループを止めることがありません。LLM の呼び出しはこれまでどおり完全に並行します。`< 1` の値は無視されます。 |
| `HERMES_RESTART_DRAIN_TIMEOUT` | ゲートウェイ: `/restart` のときに、実行中の処理が終わるのを待つ秒数。過ぎたら再起動を強行します（既定値: `900`）。 |
| `HERMES_GATEWAY_PLATFORM_CONNECT_TIMEOUT` | ゲートウェイの起動時と再接続時の、プラットフォームごとの接続のタイムアウト（秒。`0` や負の値なら無期限に待ちます）。接続の試行*と* Discord アダプタの ready 待ちの両方に効くので、同期するスラッシュコマンドが多いアカウントでも起動の途中で打ち切られません。`config.yaml` の `gateway.platform_connect_timeout`（既定値 `30`）から橋渡しされます。この環境変数は手動の上書きで、明示的に設定するとこちらが勝ちます。 |
| `HERMES_GATEWAY_BUSY_INPUT_MODE` | ゲートウェイが忙しいときの入力の扱いの既定: `queue`、`steer`、`interrupt`。有効なプロファイルについては `/busy` で上書きできます。 |
| `HERMES_GATEWAY_BUSY_ACK_ENABLED` | エージェントが忙しいときにユーザーが入力すると、ゲートウェイが受領のメッセージ（⚡/⏳/⏩）を送るかどうか（既定値: `true`）。`false` にするとこのメッセージだけを止められます。入力はこれまでどおりキューに入るか、方向づけに使われるか、割り込みになり、チャットへの返信だけが黙ります。`config.yaml` の `display.busy_ack_enabled` から橋渡しされます。 |
| `HERMES_GATEWAY_NO_SUPERVISE` | s6-overlay の Docker イメージの中で `hermes gateway run` を動かすとき、自動の監視を使わず s6 以前のフォアグラウンドの動きにします（自動再起動なし、ゲートウェイがコンテナのメインプロセスになります）。真とみなす値は `1`、`true`、`yes` です。CLI の `--no-supervise` フラグと同じです。s6 のイメージの外では何もしません。 |
| `HERMES_GATEWAY_BOOTSTRAP_STATE` | s6-overlay の Docker イメージの中で、まっさらなボリュームでのゲートウェイの**最初の**監視状態を宣言します。空のボリュームには保存済みの `gateway_state.json` がないため、起動時の調整処理は `gateway-default` の枠を登録しつつ**停止したまま**にします（最後に記録された状態が `running` のときだけ自動起動するからです）。これを `running` にしておくと、初回起動のセットアップフックが調整処理より*先に* `gateway_state.json` を用意するので、いちばん最初の起動からゲートウェイが立ち上がります。値として認められるのは `running` だけです。初回起動時のみで、既存の `gateway_state.json` が上書きされることはないので、意図して止めたゲートウェイは再起動をまたいでも止まったままです。s6 のイメージの外では何もしません。 |
| `GATEWAY_RELAY_URL` | 実験的なリレーのコネクタの WebSocket のベース URL。設定するとゲートウェイは汎用の `relay` アダプタを登録し、コネクタへ外向きに接続します。`config.yaml` の `gateway.relay_url` に対応します。 |
| `GATEWAY_RELAY_ID` | `hermes gateway enroll` または管理された自動発行で割り当てられるリレーのゲートウェイの識別子。`gateway.relay_id` に対応します。 |
| `GATEWAY_RELAY_SECRET` | WebSocket の認証に使うゲートウェイごとのリレーの秘密。すでに設定されていれば、管理された自動発行は省略されます。`gateway.relay_secret` に対応します。 |
| `GATEWAY_RELAY_DELIVERY_KEY` | リレー・パススルーの認証の互換のために残されている、コネクタが発行する配信キー。現在のリレーの受信メッセージは、ゲートウェイ側の HTTP の受け口ではなく外向きの WebSocket で届きます。 |
| `GATEWAY_RELAY_ENROLL_TOKEN` | `--token` を明示的に渡さなかったときに `hermes gateway enroll` が使う登録用のトークン。 |
| `GATEWAY_RELAY_PLATFORM` | リレーの機能記述子で公開するプラットフォーム名（任意）。 |
| `GATEWAY_RELAY_BOT_ID` | リレーの機能記述子で公開するボットの識別子（任意）。 |
| `GATEWAY_RELAY_ENDPOINT` | コールバックやパススルーの URL が必要なコネクタのモード向けに公開するゲートウェイのエンドポイント（任意）。既定の WebSocket のみで受信するリレーの経路では不要です。`gateway.relay_endpoint` に対応します。 |
| `GATEWAY_RELAY_ROUTE_KEYS` | コネクタに公開するリレーのルートキーをカンマ区切りで指定します。`gateway.relay_route_keys` に対応します。 |
| `HERMES_FILE_MUTATION_VERIFIER` | ターンごとのファイル変更の検証のフッターを有効にします（既定値: `true`）。有効にすると、そのターンで失敗し、あとから成功した書き込みで置き換えられなかった `write_file` / `patch` の呼び出しを Hermes が一覧にして添えます。`0`、`false`、`no`、`off` のいずれかで止められます。`config.yaml` の `display.file_mutation_verifier` に対応し、この環境変数を設定するとそちらが勝ちます。 |
| `HERMES_CRON_TIMEOUT` | cron ジョブのエージェントの実行の無操作タイムアウト（秒、既定値: `600`）。ツールを呼び出していたりストリームのトークンを受け取っていたりする間はいくらでも動けます。止まっているときだけ効きます。`0` にすると無制限です。 |
| `HERMES_CRON_SCRIPT_TIMEOUT` | cron ジョブに紐づく事前スクリプトのタイムアウト（秒、既定値: `3600`）。スクリプトだけが対象で、スキルやエージェントのジョブは別枠の `HERMES_CRON_TIMEOUT` の無操作の持ち時間を使います。`config.yaml` の `cron.script_timeout_seconds` でも設定できます。 |
| `HERMES_CRON_MEDIA_SEND_TIMEOUT` | cron の配信で、稼働中のゲートウェイのアダプタ経由でメディアの添付を 1 件送るごとのタイムアウト（秒、既定値: `300`）。長い TTS の音声や大きな書き出しなど、大きい添付のアップロードがタイムアウトするなら増やしてください。`config.yaml` の `cron.media_send_timeout_seconds` でも設定できます。 |
| `HERMES_CRON_MAX_PARALLEL` | 1 回のティックで並行して動かす cron ジョブの最大数（既定値: `4`）。 |

## NeMo Relay {#nemo-relay}

| 変数 | 説明 |
|----------|-------------|
| `HERMES_NEMO_RELAY_PLUGINS_TOML` | Hermes のコアがプロセス全体で読み込む、標準の NeMo Relay の `plugins.toml` の明示的なパス。未設定なら Hermes は Relay のミドルウェアや動的プラグイン、エクスポーターを初期化しません。廃止された `HERMES_NEMO_RELAY_ATOF_*` と `HERMES_NEMO_RELAY_ATIF_*` の変数は無視されます。それらの出力は、選んだファイルの中で設定してください。[NeMo Relay の可観測性の設定](https://docs.nvidia.com/nemo/relay/configure-plugins/observability/about)を参照してください。 |

## エージェントの挙動 {#agent-behavior}

| 変数 | 説明 |
|----------|-------------|
| `HERMES_MAX_ITERATIONS` | 1 つの会話でのツール呼び出しの繰り返しの上限（既定値: 500） |
| `HERMES_INFERENCE_MODEL` | プロセス単位でモデル名を上書きします（そのセッションでは `config.yaml` より優先されます）。`-m`/`--model` のフラグでも設定できます。 |
| `HERMES_YOLO_MODE` | `1` にすると、危険なコマンドの承認の確認を飛ばします。`--yolo` と同じです。 |
| `HERMES_ACCEPT_HOOKS` | `config.yaml` に書かれた、まだ確認していないシェルのフックを、TTY での確認なしに自動で承認します。`--accept-hooks` や `hooks_auto_accept: true` と同じです。 |
| `HERMES_IGNORE_USER_CONFIG` | `~/.hermes/config.yaml` を読み飛ばして組み込みの既定値を使います（`.env` の認証情報は読み込まれます）。`--ignore-user-config` と同じです。 |
| `HERMES_IGNORE_RULES` | `AGENTS.md`、`SOUL.md`、`.cursorrules`、メモリ、事前読み込みのスキルの自動注入を飛ばします。`--ignore-rules` と同じです。 |
| `HERMES_SAFE_MODE` | 切り分け用のモード: すべてのカスタマイズを無効にします。プラグインの探索、MCP サーバーの読み込み、シェルのフックの登録を飛ばします。`--safe-mode` が自動で設定します（このフラグは上の 2 つも設定します）。 |
| `HERMES_TOOL_PROGRESS` | config-v12 のサポートの下限以降はサポートされておらず、この変数は無視されます。`config.yaml` の `display.tool_progress` を使ってください。 |
| `HERMES_TOOL_PROGRESS_MODE` | ツールの進捗の表示モードの互換用の変数（非推奨。ゲートウェイは今も代替として読みます）。`config.yaml` の `display.tool_progress` のほうが向いています。 |
| `HERMES_HUMAN_DELAY_MODE` | 応答のテンポ: `off`/`natural`/`custom` |
| `HERMES_HUMAN_DELAY_MIN_MS` | 独自に指定する遅延の範囲の下限（ミリ秒） |
| `HERMES_HUMAN_DELAY_MAX_MS` | 独自に指定する遅延の範囲の上限（ミリ秒） |
| `HERMES_QUIET` | 重要でない出力を抑えます（`true`/`false`） |
| `CODEX_HOME` | [Codex app-server ランタイム](/hermes/docs/user-guide/features/codex-app-server-runtime/)を有効にしているとき、Codex CLI が設定と認証情報を読むディレクトリを上書きします（既定値: `~/.codex`）。Hermes の移行処理は管理下のブロックを `<CODEX_HOME>/config.toml` に書き込みます。 |
| `HERMES_KANBAN_TASK` | かんばんのディスパッチャーがワーカーを起動するときに設定します（タスクの UUID）。ワーカーと、そこから起動される `hermes-tools` の MCP のサブプロセスがこれを引き継ぐので、かんばんのツールが正しく制御されます。手動で設定しないでください。 |
| `HERMES_ACP_SKIP_CONFIGURED_MCP` | [ACP のホスト](/hermes/docs/user-guide/features/acp/#host-integration)が、自分で起動する Hermes のサブプロセスに設定します。`1` にすると、ACP の JSON-RPC のループを始める前に `config.yaml` で全体に設定された MCP サーバーを起動しません。セッションの MCP サーバーを `session/new` で自分で渡すホスト向けです。ACP のセッションが渡したサーバーはそのまま登録されます。それ以外の値なら既定の動きのままです。手動で設定しないでください。 |
| `HERMES_API_TIMEOUT` | LLM の API 呼び出しのタイムアウト（秒、既定値: `1800`） |
| `HERMES_API_CALL_STALE_TIMEOUT` | ストリームなしの呼び出しが停滞したと判断するまでのタイムアウト（秒、既定値: `90`）。未設定のままだとローカルのプロバイダでは自動で無効になり、非常に長い文脈では大きくなることがあります。`config.yaml` の `providers.<id>.stale_timeout_seconds` や `providers.<id>.models.<model>.stale_timeout_seconds` でも設定できます。 |
| `HERMES_STREAM_READ_TIMEOUT` | ストリームのソケットの読み取りのタイムアウト（秒、既定値: `120`）。ローカルのプロバイダでは自動で `HERMES_API_TIMEOUT` まで引き上げられます。ローカルの LLM が長いコード生成の途中でタイムアウトするなら増やしてください。 |
| `HERMES_STREAM_STALE_TIMEOUT` | ストリームの停滞を検知するタイムアウト（秒、既定値: `180`）。ローカルのプロバイダでは自動で無効になります。この時間内に断片が届かないと接続を切ります。 |
| `HERMES_LOCAL_STREAM_STALE_TIMEOUT` | ローカルのプロバイダ（Ollama、oMLX、llama-cpp）向けの停滞判定の上限（秒、既定値: `900`）。基本の停滞タイムアウトが既定値のままで、ローカルのエンドポイントが検出されたときは、これまでの「無効にして無限に待つ」の代わりにこの有限の上限が入るので、固まったローカルのサーバーもいずれ検知されます。`config.yaml` の `agent.local_stream_stale_timeout` でも設定できます。 |
| `HERMES_STREAM_RETRIES` | 一時的なネットワークのエラーでストリームの途中から再接続を試みる回数（既定値: `3`）。 |
| `HERMES_STREAM_STALE_GIVEUP` | ターンをまたぐサーキットブレーカー: 応答が完了しないまま停滞による切断（ストリームの有無を問わず）がこの回数だけ続いたら、停滞のタイムアウトをもう一度待たずに、対処の分かるエラーを出して即座に中断します（既定値: `5`。`0` で無効）。応答が完了したとき、`/model` を切り替えたとき、フォールバックが働いたとき、ターンの開始時に本来のモデルへ戻ったときにリセットされます。 |
| `HERMES_AGENT_TIMEOUT` | 動作中のエージェントに対するゲートウェイの無操作タイムアウト（秒、既定値: `1800`、30 分）。ツールの呼び出しやストリームのトークンのたびにリセットされます。`0` にすると無効になります。 |
| `HERMES_GATEWAY_MAX_STARTS` | 起動の暴走を止めるサーキットブレーカー: 一定の時間枠内でゲートウェイの（再）起動を許す最大回数。超えると指数的なバックオフのスリープを入れて暴走を断ち切ります（既定値: `5`。`0` で無効）。`config.yaml` の `gateway.respawn_storm.max_starts` でも設定できます。 |
| `HERMES_GATEWAY_START_WINDOW_S` | 起動の暴走のブレーカーの時間枠（秒、既定値: `120`）。`config.yaml` の `gateway.respawn_storm.window_seconds` でも設定できます。 |
| `HERMES_AGENT_TIMEOUT_WARNING` | ゲートウェイ: 無操作がこの秒数続いたら警告のメッセージを送ります（既定では `HERMES_AGENT_TIMEOUT` の 75%）。 |
| `HERMES_AGENT_NOTIFY_INTERVAL` | ゲートウェイ: 長く動いているエージェントのターンで、進捗の通知を送る間隔（秒）。 |
| `HERMES_CHECKPOINT_TIMEOUT` | ファイルシステムのチェックポイントを作るときのタイムアウト（秒、既定値: `30`）。 |
| `HERMES_EXEC_ASK` | ゲートウェイモードで実行の承認の確認を有効にします（`true`/`false`） |
| `HERMES_ENABLE_PROJECT_PLUGINS` | エージェントの読み込みとダッシュボードのウェブサーバーの両方で、リポジトリ内の `./.hermes/plugins/` にあるプラグインの自動探索を有効にします。真とみなす値は `1` / `true` / `yes` / `on`（大文字小文字は問いません）です。それ以外はすべて — `0`、`false`、`no`、`off`、空文字も含めて — **無効**として扱われます（既定）。なお GHSA-5qr3-c538-wm9j（#29156）以降、ダッシュボードのウェブサーバーは、この変数が有効でもプロジェクトのプラグインの Python の `api` ファイルを自動で読み込みません。プロジェクトのプラグインは静的な JS / CSS で UI を拡張できますが、バックエンドのルートは `~/.hermes/plugins/` の下に移したときにだけ読み込まれます。 |
| `HERMES_PLUGINS_DEBUG` | `1`/`true` にすると、プラグインの探索の詳細なログが標準エラー出力に出ます。走査したディレクトリ、解析したマニフェスト、飛ばした理由、解析や `register()` の失敗時の完全なトレースバックが出ます。プラグインの作者向けです。 |
| `HERMES_BACKGROUND_NOTIFICATIONS` | ゲートウェイでのバックグラウンドの処理の通知のモード: `concise`（既定値）、`all`、`result`、`error`、`off` |
| `HERMES_EPHEMERAL_SYSTEM_PROMPT` | API 呼び出し時に差し込む一時的なシステムプロンプト（セッションには保存されません） |
| `HERMES_PREFILL_MESSAGES_FILE` | API 呼び出し時に差し込む一時的なプリフィルメッセージの JSON ファイルのパス。 |
| `HERMES_ALLOW_PRIVATE_URLS` | `true`/`false` — ツールが localhost やプライベートネットワークの URL を取得できるようにします。ゲートウェイモードでは既定で無効です。 |
| `HERMES_REDACT_SECRETS` | `true`/`false` — ツールの出力、ログ、チャットの応答で秘密情報を伏せるかどうかを決めます（既定値: `true`）。 |
| `HERMES_WRITE_SAFE_ROOT` | 指定したルートの外への `write_file`/`patch` の書き込みを**強制的に止める**ディレクトリの接頭辞（任意。承認の確認は出ません）。`os.pathsep`（Unix なら `:`、Windows なら `;`）で区切って複数のディレクトリを指定できます。下の [HERMES_WRITE_SAFE_ROOT](#hermes_write_safe_root) を参照してください。 |
| `HERMES_DISABLE_LAZY_INSTALLS` | 公式の Docker イメージで自動的に設定される内部の橋渡し用の変数で、変更できない `/opt/hermes` のツリーに実行時の依存関係がインストールされるのを防ぎます。利用者向けの同等の設定は `config.yaml` の `security.allow_lazy_installs: false` です。これを `.env` に書かないでください。 |
| `HERMES_DISABLE_FILE_STATE_GUARD` | `1` にすると、`patch`/`write_file` での「読み込んだあとにファイルが変わっています」という保護を切ります。 |
| `HERMES_BUNDLED_SKILLS` | 起動時に読み込む同梱スキルの一覧を、カンマ区切りで上書きします。 |
| `HERMES_OPTIONAL_SKILLS` | 初回の起動時に自動でインストールする、任意のスキルの名前をカンマ区切りで指定します。 |
| `HERMES_DEBUG_INTERRUPT` | `1` にすると、割り込みやキャンセルの詳細な追跡を `agent.log` に記録します。 |
| `HERMES_DUMP_REQUESTS` | API リクエストのペイロードをログファイルに書き出します（`true`/`false`） |
| `HERMES_DUMP_REQUEST_STDOUT` | API リクエストのペイロードを、ログファイルではなく標準出力に書き出します。 |
| `HERMES_OAUTH_TRACE` | `1` にすると、OAuth のトークンの交換と更新の試行を記録します。伏せ字化した時間の情報も含みます。 |
| `HERMES_AGENT_HELP_GUIDANCE` | 独自の運用向けに、システムプロンプトへ案内の文章を追加します。 |
| `HERMES_AGENT_LOGO` | CLI の起動時のアスキーアートのロゴを差し替えます。 |
| `DELEGATION_MAX_CONCURRENT_CHILDREN` | `delegate_task` の 1 回のまとまりで並行して動かすサブエージェントの最大数（既定値: `3`、下限は 1、上限なし）。`config.yaml` の `delegation.max_concurrent_children` でも設定でき、設定ファイルの値が優先されます。 |

### HERMES_WRITE_SAFE_ROOT {#hermes_write_safe_root}

この変数を設定すると、`write_file` と `patch` は指定したディレクトリの接頭辞の内側だけを対象にできます。そこから外れたパスは**即座に拒否**されます。危険なコマンドの承認の仕組みには回らず、上書きするための確認も出ません。

公式の Docker イメージは、エージェントがマウントされたデータのボリュームから出られないように、`HERMES_HOME=/opt/data` と並べて `HERMES_WRITE_SAFE_ROOT=/opt/data` を設定しています。

**書き込みを閉じ込めるつもりがないなら、これを `~/.hermes/.env` に足さないでください。** よくある間違いは、プロジェクトのディレクトリを指定しておきながら、エージェントに `~/.hermes/cron/jobs.json` や `~/.hermes/skills/`、プロファイル配下のスクリプトを編集させようとすることです。それらのパスは囲いの外なので、`write_file`/`patch` はどれも `outside HERMES_WRITE_SAFE_ROOT` のエラーで失敗します。

作業場所と Hermes の状態の両方を許可したいときは、両方の接頭辞を並べます（順番は関係ありません）。

```bash
export HERMES_WRITE_SAFE_ROOT=/path/to/project:/home/you/.hermes
```

変数を消すか `.env` から取り除けば、通常どおり書き込めるようになります（それでも認証情報のパスの拒否リストは効きます。[ファイル書き込みの安全性](/hermes/docs/user-guide/security/#file-write-safety)を参照してください）。

## インターフェース {#interface}

| 変数 | 説明 |
|----------|-------------|
| `HERMES_TUI` | `1` にすると、従来の CLI ではなく [TUI](/hermes/docs/user-guide/tui/) を起動します。`--tui` を渡すのと同じです。 |
| `HERMES_TUI_DIR` | ビルド済みの `ui-tui/` ディレクトリのパス（`dist/entry.js` と中身の入った `node_modules` が必要です）。ディストリビューションや Nix が初回起動時の `npm install` を省くために使います。 |
| `HERMES_TUI_RESUME` | 起動時に特定の ID の TUI のセッションを再開します。設定すると `hermes --tui` は新しいセッションを作らず、指定したセッションを引き継ぎます。接続が切れたときやターミナルが落ちたあとに戻るのに便利です。 |
| `HERMES_TUI_THEME` | TUI の配色を固定します: `light`、`dark`、または背景色の 6 文字の 16 進数（`ffffff` や `1a1a2e` など）。未設定なら Hermes が `COLORFGBG` と端末への背景色の問い合わせで自動判定します。この変数は、`COLORFGBG` を設定しない端末（Ghostty、Warp、iTerm2 など）で自動判定を上書きします。 |
| `HERMES_INFERENCE_MODEL` | `config.yaml` を書き換えずに `hermes -z` / `hermes chat` のモデルを固定します。`--provider` のフラグと組み合わせて使います。実行ごとに既定のモデルを変えたいスクリプト（sweeper、CI、バッチの実行）から呼ぶときに役立ちます。 |

## セッションの設定 {#session-settings}

| 変数 | 説明 |
|----------|-------------|
| `SESSION_IDLE_MINUTES` | 無操作が N 分続いたらセッションをリセットします（既定値: 1440） |
| `SESSION_RESET_HOUR` | 毎日リセットする時刻を 24 時間表記で指定します（既定値: 4 = 午前 4 時） |
| `HERMES_SESSION_ID` | Hermes が起動する**すべてのツールのサブプロセスに自動で渡されます**（`terminal`、`execute_code`、常駐シェル、Docker / Singularity のバックエンド、委譲したサブエージェントの実行）。エージェントが現在のセッション ID を設定するので、ツールから呼ばれる利用者のスクリプトはこれを読んで、自分の出力や計測、副作用を元の Hermes のセッションと結び付けられます。**自分で設定しないでください** — 親のシェルから上書きしてもエージェントの実行の外でしか効かず、エージェントがセッションを始めた瞬間に上書きされます。 |
| `AI_AGENT` | **CLI とゲートウェイの入口が `hermes-agent` に設定し**（外側のハーネスがすでに設定している場合を除きます）、ターミナルツールのすべてのシェルに渡されます。リモートのバックエンド（Docker、SSH、Modal、Daytona、Singularity、Vercel）も含みます。子プロセスの帰属を示す、エージェント横断で広まりつつある標準です。汎用のツール（たとえば huggingface_hub のエージェント検出）はこれを読んで AI エージェントの下で動いていることを知ります。値は公開されているエージェントのハーネスのレジストリでの Hermes の ID と一致します。手動で設定しないでください。 |
| `HERMES_AGENT` | **CLI とゲートウェイの入口が `true` に設定し**、ターミナルツールのすべてのシェルに渡されるので、子プロセスは自分が Hermes の中で動いていると分かります。手動で設定しないでください。 |

## 文脈の圧縮（config.yaml のみ） {#context-compression-configyaml-only}

文脈の圧縮は `config.yaml` だけで設定します。対応する環境変数はありません。しきい値の設定は `compression:` のブロックにあり、要約に使うモデルとプロバイダは `auxiliary.compression:` の下にあります。

```yaml
compression:
  enabled: true
  threshold: 0.50
  target_ratio: 0.20         # fraction of threshold to preserve as recent tail
  protect_last_n: 20         # minimum recent messages to keep uncompressed
```

:::info 旧設定からの移行
`compression.summary_model`、`compression.summary_provider`、`compression.summary_base_url` を使っている古い設定は、最初の読み込み時に自動で `auxiliary.compression.*` へ移行されます。
:::

## 補助タスクの上書き {#auxiliary-task-overrides}

| 変数 | 説明 |
|----------|-------------|
| `AUXILIARY_VISION_PROVIDER` | 視覚のタスクのプロバイダを上書きします |
| `AUXILIARY_VISION_MODEL` | 視覚のタスクのモデルを上書きします |
| `AUXILIARY_VISION_BASE_URL` | 視覚のタスク向けの OpenAI 互換のエンドポイントを直接指定します |
| `AUXILIARY_VISION_API_KEY` | `AUXILIARY_VISION_BASE_URL` と組にして使う API キー |

:::note
`AUXILIARY_WEB_EXTRACT_*` の変数は使われなくなりました。`web_extract` とブラウザのスナップショットは補助の LLM を使いません。長いページやスナップショットは決まったやり方で切り詰められ、全文はディスクに保存されて `read_file` で読み進められます。
:::

タスクごとに直接のエンドポイントを使う場合、Hermes はそのタスクに設定された API キーか `OPENAI_API_KEY` を使います。独自のエンドポイントに `OPENROUTER_API_KEY` を使い回すことはありません。

## フォールバックのプロバイダ（config.yaml のみ） {#fallback-providers-configyaml-only}

主要なモデルのフォールバックの連鎖は `config.yaml` だけで設定します。対応する環境変数はありません。トップレベルに `fallback_providers` のリストを追加し、`provider` と `model` のキーを書くと、メインのモデルがエラーになったときに自動で切り替わります。プロバイダが `auto` の補助タスクも、Hermes の組み込みの補助の探索の連鎖より先にこのリストを参照します。

```yaml
fallback_providers:
  - provider: openrouter
    model: anthropic/claude-sonnet-4
```

トップレベルに 1 つだけプロバイダを書く古い `fallback_model` の形も後方互換のために読み込まれますが、新しく設定するなら `fallback_providers` を使ってください。タスクごとの補助の方針は `config.yaml` の `auxiliary.<task>.fallback_chain` で指定します。こちらに環境変数はありません。

詳しくは[フォールバックのプロバイダ](/hermes/docs/user-guide/features/fallback-providers/)を参照してください。

## プロバイダのルーティング（config.yaml のみ） {#provider-routing-configyaml-only}

これらは `~/.hermes/config.yaml` の `provider_routing` セクションに書きます。

| キー | 説明 |
|-----|-------------|
| `sort` | プロバイダの並べ方: `"price"`（既定値）、`"throughput"`、`"latency"` |
| `only` | 許可するプロバイダのスラッグのリスト（たとえば `["anthropic", "google"]`） |
| `ignore` | 飛ばすプロバイダのスラッグのリスト |
| `order` | 順番に試すプロバイダのスラッグのリスト |
| `require_parameters` | リクエストのすべてのパラメータに対応するプロバイダだけを使います（`true`/`false`） |
| `data_collection` | `"allow"`（既定値）か、データを保存するプロバイダを外す `"deny"` |

:::tip
環境変数の設定には `hermes config set` を使ってください。適切なファイル（秘密情報なら `.env`、それ以外は `config.yaml`）に自動で保存されます。
:::
