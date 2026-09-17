---
title: "環境変数"
description: "Hermes Agent が使うすべての環境変数の一覧"
upstream_path: reference/environment-variables.md
upstream_blob: b616f3fdd39b1eb670fc3cd02ad530f92d90721c
sources:
  - https://hermes-agent.nousresearch.com/docs/reference/environment-variables
---

# 環境変数一覧 {#environment-variables-reference}

Hermes は、プロセスの環境変数と、利用者が管理する秘密については `~/.hermes/.env` から値を読みます。API キー、ボットのトークン、OAuth の秘密など認証情報は `.env` に置いてください。秘密でない振る舞いの設定は、設定キーがあるなら `config.yaml` のほうをおすすめします。以下にはプロセス限りの上書きや、内部の橋渡しのための変数も含まれます。ここに載っているというだけで `.env` に書き込むべきではありません。

## LLM のプロバイダ {#llm-providers}

| 変数 | 説明 |
|----------|-------------|
| `OPENROUTER_API_KEY` | OpenRouter の API キー（融通が利くのでおすすめです） |
| `OPENROUTER_BASE_URL` | OpenRouter 互換のベース URL を上書きします |
| `FIREWORKS_API_KEY` | Fireworks AI の API キー（[app.fireworks.ai](https://app.fireworks.ai/settings/users/api-keys)）。エンドポイントの上書きは `config.yaml` の `model.base_url` で設定します。 |
| `HERMES_OPENROUTER_CACHE` | OpenRouter の応答キャッシュを有効にします（`1` / `true` / `yes` / `on`）。config.yaml の `openrouter.response_cache` より優先されます。[応答キャッシュ](https://openrouter.ai/docs/guides/features/response-caching) をご覧ください。 |
| `HERMES_OPENROUTER_CACHE_TTL` | キャッシュの保持時間（秒。1〜86400）。config.yaml の `openrouter.response_cache_ttl` より優先されます。 |
| `NOUS_BASE_URL` | Nous Portal のベース URL を上書きします（ふだんは不要。開発や検証のためのものです） |
| `NOUS_INFERENCE_BASE_URL` | Nous の推論エンドポイントを直接上書きします |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway の API キー（[ai-gateway.vercel.sh](https://ai-gateway.vercel.sh)） |
| `AI_GATEWAY_BASE_URL` | AI Gateway のベース URL を上書きします（既定: `https://ai-gateway.vercel.sh/v1`） |
| `OPENAI_API_KEY` | OpenAI 互換の独自エンドポイント向けの API キー（`OPENAI_BASE_URL` と一緒に使います） |
| `OPENAI_BASE_URL` | 独自エンドポイントのベース URL（VLLM、SGLang など） |
| `LM_API_KEY` | LM Studio（`lmstudio` プロバイダ）の API キー。手元のサーバーでは形だけの値であることが多いです |
| `LM_BASE_URL` | LM Studio のベース URL（既定: `http://localhost:1234/v1`） |
| `COPILOT_GITHUB_TOKEN` | Copilot API 用の GitHub トークン。優先順位は 1 番目です（OAuth の `gho_*` か、細かい権限の PAT `github_pat_*`。従来型の PAT `ghp_*` には **対応していません**） |
| `GH_TOKEN` | GitHub のトークン。Copilot では優先順位 2 番目です（`gh` CLI も使います） |
| `GITHUB_TOKEN` | GitHub のトークン。Copilot では優先順位 3 番目です |
| `HERMES_COPILOT_ACP_COMMAND` | Copilot ACP の CLI バイナリのパスを上書きします（既定: `copilot`） |
| `COPILOT_CLI_PATH` | `HERMES_COPILOT_ACP_COMMAND` の別名 |
| `HERMES_COPILOT_ACP_ARGS` | Copilot ACP の引数を上書きします（既定: `--acp --stdio`） |
| `COPILOT_ACP_BASE_URL` | Copilot ACP のベース URL を上書きします |
| `COPILOT_API_BASE_URL` | Copilot API のベース URL を上書きします（`copilot` プロバイダ） |
| `GLM_API_KEY` | z.ai / ZhipuAI GLM の API キー（[z.ai](https://z.ai)） |
| `ZAI_API_KEY` | `GLM_API_KEY` の別名 |
| `Z_AI_API_KEY` | `GLM_API_KEY` の別名 |
| `GLM_BASE_URL` | z.ai のベース URL を上書きします（既定: `https://api.z.ai/api/paas/v4`） |
| `KIMI_API_KEY` | Kimi / Moonshot AI の API キー（[moonshot.ai](https://platform.moonshot.ai)） |
| `KIMI_CODING_API_KEY` | `kimi-coding` プロバイダ用の別名キー（`KIMI_API_KEY` と並んで受け付けられます） |
| `KIMI_BASE_URL` | Kimi のベース URL を上書きします（既定: `https://api.moonshot.ai/v1`） |
| `KIMI_CN_API_KEY` | Kimi / Moonshot 中国版の API キー（[moonshot.cn](https://platform.moonshot.cn)） |
| `ARCEEAI_API_KEY` | Arcee AI の API キー（[chat.arcee.ai](https://chat.arcee.ai/)） |
| `ARCEE_BASE_URL` | Arcee のベース URL を上書きします（既定: `https://api.arcee.ai/api/v1`） |
| `GMI_API_KEY` | GMI Cloud の API キー（[gmicloud.ai](https://www.gmicloud.ai/)） |
| `GMI_BASE_URL` | GMI Cloud のベース URL を上書きします（既定: `https://api.gmi-serving.com/v1`） |
| `ACTUAL_API_KEY` | Actual Computer の推論キー（`ac_...`。[actual.inc/user/keys](https://actual.inc/user/keys)）。手元のデーモンには不要です。 |
| `ACTUAL_BASE_URL` | Actual のベース URL を指定する、旧来の予備の手段です。代わりに `config.yaml` で `model.provider: actual` と `model.base_url` を設定してください。YAML に書いた URL のほうが優先されます。既定は `https://api.actual.inc/v1` です。 |
| `MINIMAX_API_KEY` | MiniMax の API キー（全世界向けエンドポイント。[minimax.io](https://www.minimax.io)）。**`minimax-oauth` では使いません**（OAuth ではブラウザでのログインを使います）。 |
| `MINIMAX_BASE_URL` | MiniMax のベース URL を上書きします（既定: `https://api.minimax.io/anthropic` — Hermes は MiniMax の Anthropic Messages 互換エンドポイントを使います）。**`minimax-oauth` では使いません**。 |
| `MINIMAX_CN_API_KEY` | MiniMax の API キー（中国向けエンドポイント。[minimaxi.com](https://www.minimaxi.com)）。**`minimax-oauth` では使いません**（OAuth ではブラウザでのログインを使います）。 |
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
| `AZURE_FOUNDRY_BASE_URL` | Microsoft Foundry のエンドポイント URL（OpenAI 形式なら `https://<resource>.openai.azure.com/openai/v1`、Anthropic 形式なら `https://<resource>.services.ai.azure.com/anthropic` など） |
| `AZURE_ANTHROPIC_KEY` | `provider: anthropic` と、Microsoft Foundry の Claude デプロイを指す `base_url` を使うときの Azure Anthropic の API キー（Anthropic と Azure Anthropic の両方を設定しているときに `ANTHROPIC_API_KEY` の代わりに使います） |
| `AZURE_TENANT_ID` | Entra ID のテナント ID（サービスプリンシパルの流れで使います。`model.auth_mode: entra_id` のとき `azure-identity` が参照します） |
| `AZURE_CLIENT_ID` | Entra ID のクライアント ID（サービスプリンシパル、ワークロード ID、利用者が割り当てたマネージド ID） |
| `AZURE_CLIENT_SECRET` | `EnvironmentCredential` が使うサービスプリンシパルの秘密 |
| `AZURE_CLIENT_CERTIFICATE_PATH` | サービスプリンシパルの証明書（`AZURE_CLIENT_SECRET` の代わり） |
| `AZURE_FEDERATED_TOKEN_FILE` | AKS のワークロード ID / OIDC の流れで使う、連携トークンのファイルのパス |
| `AZURE_AUTHORITY_HOST` | 国家向けクラウドの認証局の上書き（Azure Government なら `https://login.microsoftonline.us` など）。[Azure Foundry の手引き](/hermes/docs/guides/azure-foundry/#sovereign-clouds-government-china) をご覧ください |
| `IDENTITY_ENDPOINT` / `MSI_ENDPOINT` | App Service、Functions、Container Apps でのマネージド ID のエンドポイント。VM はふつう代わりに IMDS を使い、これらは設定しません |
| `HF_TOKEN` | Inference Providers 向けの Hugging Face のトークン（[huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)） |
| `HF_BASE_URL` | Hugging Face のベース URL を上書きします（既定: `https://router.huggingface.co/v1`） |
| `GOOGLE_API_KEY` | Google AI Studio の API キー（[aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)） |
| `GEMINI_API_KEY` | `GOOGLE_API_KEY` の別名 |
| `GEMINI_BASE_URL` | Google AI Studio のベース URL を上書きします |
| `VERTEX_CREDENTIALS_PATH` | Vertex AI（Gemini）向けの Google Cloud サービスアカウント JSON のパス。Vertex は固定の API キーではなく OAuth2 を使います。指定が無ければ `GOOGLE_APPLICATION_CREDENTIALS`、それも無ければ ADC（`gcloud auth application-default login`）に落ちます。プロジェクトとリージョンは `config.yaml` の `vertex:` の下に書きます |
| `ANTHROPIC_API_KEY` | Anthropic Console の API キー（[console.anthropic.com](https://console.anthropic.com/)） |
| `ANTHROPIC_BASE_URL` | Anthropic API のベース URL を上書きします |
| `ANTHROPIC_TOKEN` | 手動または旧来の Anthropic の OAuth / セットアップトークンの上書き |
| `DASHSCOPE_API_KEY` | Qwen のモデル向けの Qwen Cloud（Alibaba DashScope）の API キー（[modelstudio.console.alibabacloud.com](https://modelstudio.console.alibabacloud.com/)） |
| `DASHSCOPE_BASE_URL` | DashScope の独自ベース URL（既定: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`。中国本土のリージョンでは `https://dashscope.aliyuncs.com/compatible-mode/v1` を使います） |
| `DASHSCOPE_CN_BASE_URL` | `alibaba-cn`（中国本土）の DashScope のベース URL を上書きします |
| `ALIBABA_CODING_PLAN_API_KEY` | Qwen Coding Plan の API キー（`alibaba-coding-plan`。`alibaba-coding-plan-cn` の予備にもなります） |
| `ALIBABA_CODING_PLAN_CN_API_KEY` | 中国本土の `alibaba-coding-plan-cn` プロバイダ向けの Qwen Coding Plan の API キー（共通のキーより先に見られるので、CN の行だけが点灯します） |
| `ALIBABA_CODING_PLAN_BASE_URL` | Qwen Coding Plan のベース URL を上書きします（国際版） |
| `ALIBABA_CODING_PLAN_CN_BASE_URL` | Qwen Coding Plan のベース URL を上書きします（中国本土） |
| `ALIBABA_TOKEN_PLAN_API_KEY` | Alibaba Model Studio Token Plan の API キー（`alibaba-token-plan`。`alibaba-token-plan-cn` の予備にもなります） |
| `ALIBABA_TOKEN_PLAN_CN_API_KEY` | 中国本土の `alibaba-token-plan-cn` プロバイダ向けの Token Plan の API キー（共通のキーより先に見られます） |
| `ALIBABA_TOKEN_PLAN_BASE_URL` | Token Plan のベース URL を上書きします（国際版） |
| `ALIBABA_TOKEN_PLAN_CN_BASE_URL` | Token Plan のベース URL を上書きします（中国本土） |
| `DEEPSEEK_API_KEY` | DeepSeek へ直接つなぐための API キー（[platform.deepseek.com](https://platform.deepseek.com/api_keys)） |
| `DEEPSEEK_BASE_URL` | DeepSeek API の独自ベース URL |
| `DEEPINFRA_API_KEY` | DeepInfra の API キー（[deepinfra.com](https://deepinfra.com/dash/api_keys)） |
| `DEEPINFRA_BASE_URL` | DeepInfra のベース URL の上書き |
| `NOVITA_API_KEY` | NovitaAI の API キー — Model API、Agent Sandbox、GPU Cloud を備えた AI 向けのクラウドです（[novita.ai/settings/key-management](https://novita.ai/settings/key-management)） |
| `NOVITA_BASE_URL` | NovitaAI のベース URL を上書きします（既定: `https://api.novita.ai/openai/v1`） |
| `RAMP_ROUTER_API_KEY` | Ramp Router の API キー（[app.router.com/keys](https://app.router.com/keys)）。別名の `ROUTER_API_KEY` も受け付けます |
| `RAMP_ROUTER_BASE_URL` | Ramp Router のベース URL を上書きします（既定: `https://api.router.com/v1`） |
| `NEBIUS_API_KEY` | Nebius Token Factory の API キー（[tokenfactory.nebius.com](https://tokenfactory.nebius.com/)）。`NEBIUS_TOKEN_FACTORY_API_KEY` も受け付けます |
| `NEBIUS_BASE_URL` | Nebius Token Factory のベース URL を上書きします（既定: `https://api.tokenfactory.nebius.com/v1`） |
| `NVIDIA_API_KEY` | NVIDIA NIM の API キー — Nemotron と公開モデル向け（[build.nvidia.com](https://build.nvidia.com)） |
| `NVIDIA_BASE_URL` | NVIDIA のベース URL を上書きします（既定: `https://integrate.api.nvidia.com/v1`。手元の NIM エンドポイントなら `http://localhost:8000/v1`） |
| `STEPFUN_API_KEY` | StepFun の API キー — Step 系のモデル向け（[platform.stepfun.com](https://platform.stepfun.com)） |
| `STEPFUN_BASE_URL` | StepFun のベース URL を上書きします（既定: `https://api.stepfun.com/v1`） |
| `OLLAMA_API_KEY` | Ollama Cloud の API キー — 手元に GPU が無くても使える、管理された Ollama の目録（[ollama.com/settings/keys](https://ollama.com/settings/keys)） |
| `OLLAMA_BASE_URL` | Ollama Cloud のベース URL を上書きします（既定: `https://ollama.com/v1`） |
| `XAI_API_KEY` | チャット・TTS・Web 検索のための xAI（Grok）の API キー（[console.x.ai](https://console.x.ai/)） |
| `XAI_BASE_URL` | xAI のベース URL を上書きします（既定: `https://api.x.ai/v1`） |
| `MISTRAL_API_KEY` | Voxtral の TTS と STT のための Mistral の API キー（[console.mistral.ai](https://console.mistral.ai)） |
| `AWS_REGION` | Bedrock の推論に使う AWS のリージョン（`us-east-1`、`eu-central-1` など）。boto3 が読みます。 |
| `AWS_PROFILE` | Bedrock の認証に使う AWS の名前付きプロファイル（`~/.aws/credentials` を読みます）。設定しなければ boto3 の既定の認証の流れを使います。 |
| `BEDROCK_BASE_URL` | Bedrock ランタイムのベース URL を上書きします（既定: `https://bedrock-runtime.us-east-1.amazonaws.com`。ふつうは設定せず、代わりに `AWS_REGION` を使ってください） |
| `HERMES_QWEN_BASE_URL` | Qwen Portal のベース URL の上書き（既定: `https://portal.qwen.ai/v1`） |
| `OPENCODE_ZEN_API_KEY` | OpenCode Zen の API キー — 厳選されたモデルへの従量課金でのアクセス（[opencode.ai](https://opencode.ai/auth)） |
| `OPENCODE_ZEN_BASE_URL` | OpenCode Zen のベース URL を上書きします |
| `OPENCODE_GO_API_KEY` | OpenCode Go の API キー — 公開モデル向けの月額 10 ドルの契約（[opencode.ai](https://opencode.ai/auth)） |
| `OPENCODE_GO_BASE_URL` | OpenCode Go のベース URL を上書きします |
| `CLAUDE_CODE_OAUTH_TOKEN` | 手動で書き出す場合の、明示的な Claude Code のトークンの上書き |
| `HERMES_MODEL` | プロセスの水準でモデル名を上書きします（cron のスケジューラが使います。ふだんは `config.yaml` をおすすめします） |
| `VOICE_TOOLS_OPENAI_KEY` | OpenAI の音声認識・音声合成の提供元で優先して使う OpenAI のキー |
| `HERMES_LOCAL_STT_COMMAND` | 手元の音声認識コマンドのひな形（任意）。`{input_path}`、`{output_dir}`、`{language}`、`{model}` の差し込みが使えます |
| `HERMES_LOCAL_STT_LANGUAGE` | 音声認識の既定の言語の手がかり。`config.yaml` に提供元ごとの `language` が無いとき、`local`（faster-whisper）の提供元、`HERMES_LOCAL_STT_COMMAND`、手元の `whisper` CLI の予備（既定: `en`）、Groq、xAI が使います |
| `HERMES_HOME` | Hermes の設定ディレクトリを上書きします（既定: `~/.hermes`）。ゲートウェイの PID ファイルと systemd のサービス名もここに合わせて分かれるので、複数の導入環境を同時に動かせます |
| `HERMES_GIT_BASH_PATH` | **Windows 専用。** ターミナルのツールが探す `bash.exe` を上書きします。どの bash でも指せます — Git for Windows のフル導入、シンボリックリンク経由の WSL の bash、MSYS2、Cygwin。インストーラは、自分で用意した PortableGit をここに自動で設定します。[Windows（ネイティブ）の手引き](/hermes/docs/user-guide/windows-native/#how-hermes-runs-shell-commands-on-windows) をご覧ください |
| `HERMES_DISABLE_WINDOWS_UTF8` | **Windows 専用。** `1` にすると UTF-8 の標準入出力の仲介（`configure_windows_stdio()`）を無効にし、コンソールのロケールのコードページに戻します。文字化けの原因を切り分けるときに便利ですが、通常の運用で正解になることはまずありません |
| `HERMES_KANBAN_HOME` | かんばんボード（DB とワークスペースと作業役のログ）の土台になる、共有の Hermes のルートを上書きします。指定が無ければ `get_default_hermes_root()`（有効なプロファイルの親）に落ちます。テストや特殊な構成で便利です |
| `HERMES_KANBAN_BOARD` | このプロセスで有効なかんばんボードを固定します。`~/.hermes/kanban/current` より優先されます。ディスパッチャは作業役の子プロセスの環境にこれを差し込むので、作業役は物理的に他のボードのタスクを見られません。既定は `default` です。slug の条件は、小文字の英数字とハイフンとアンダースコアで 1〜64 文字です |
| `HERMES_KANBAN_DB` | かんばんのデータベースファイルのパスを直接固定します（いちばん強く、`HERMES_KANBAN_BOARD` と `HERMES_KANBAN_HOME` を上回ります）。ディスパッチャは作業役の子プロセスの環境にこれを差し込むので、プロファイルの作業役はディスパッチャのボードに揃います |
| `HERMES_KANBAN_WORKSPACES_ROOT` | かんばんのワークスペースのルートを直接固定します（ワークスペースについてはいちばん強く、`HERMES_KANBAN_HOME` を上回ります）。ディスパッチャは作業役の子プロセスの環境にこれを差し込みます |
| `HERMES_KANBAN_DISPATCH_IN_GATEWAY` | `kanban.dispatch_in_gateway` を実行時に上書きします。`0`、`false`、`no`、`off` にすると、ゲートウェイが組み込みのかんばんのディスパッチャを起動しなくなります。空でない他の値なら有効になります。別のディスパッチャのプロセスがボードを持っているときに便利です。 |

## プロバイダの認証（OAuth） {#provider-auth-oauth}

Anthropic のネイティブな認証では、Claude Code 自身の認証情報ファイルがあれば Hermes はそちらを優先します。それらは自動で更新できるからです。**Anthropic に対する OAuth には、追加の利用クレジットを購入した Claude Max プランが必要です** — Hermes は Claude Code として通信し、Max プランの基本の割り当てではなく追加・超過分のクレジットだけを使うため、Claude Pro では動きません。Max と追加クレジットが無い場合は、代わりに API キーを使ってください。`ANTHROPIC_TOKEN` などの環境変数は手動での上書きとして今も役立ちますが、Claude Max のログインでおすすめの道ではなくなりました。

| 変数 | 説明 |
|----------|-------------|
| `HERMES_PORTAL_BASE_URL` | Nous Portal の URL を上書きします（開発・検証用）。多重化しているときはプロファイルごとの設定になるので、受け持たれているプロファイルの `.env` に書きます。 |
| `NOUS_INFERENCE_BASE_URL` | Nous の推論 API の URL を上書きします。また、Portal の応答が指してよい本番以外のホストはこれだけです。Portal が返した推論 URL がこの上書き値と一致すれば、本番へ戻されずにそのまま受け入れられ、保存されます。多重化しているときはプロファイルごとの設定です。 |
| `HERMES_NOUS_MIN_KEY_TTL_SECONDS` | エージェントのキーを作り直すまでの最小の残り時間（既定: 1800 = 30 分） |
| `HERMES_NOUS_TIMEOUT_SECONDS` | Nous の認証情報・トークンのやり取りの HTTP の制限時間 |
| `HERMES_DUMP_REQUESTS` | API 要求の中身をログファイルに書き出します（`true` / `false`） |
| `HERMES_PREFILL_MESSAGES_FILE` | API 呼び出し時に差し込む、その場限りの先出しメッセージの JSON ファイルのパス |
| `HERMES_TIMEZONE` | IANA のタイムゾーンの上書き（たとえば `America/New_York`）。Linux と macOS では `execute_code` の子プロセスにも `TZ` として渡されます。Windows の子プロセスは OS のタイムゾーンのままです。Windows の C ランタイムは POSIX 形式の `TZ` 文字列しか解釈できず、IANA 形式の名前を渡すと誤った時差として読み取ってしまうためです |

## ツールの API {#tool-apis}

| 変数 | 説明 |
|----------|-------------|
| `PARALLEL_API_KEY` | AI 向けの Web 検索（[parallel.ai](https://parallel.ai/)） |
| `FIRECRAWL_API_KEY` | Web の取得とクラウドのブラウザ（[firecrawl.dev](https://firecrawl.dev/)） |
| `FIRECRAWL_API_URL` | 自分で立てた環境向けの、独自の Firecrawl API エンドポイント（任意） |
| `TAVILY_API_KEY` | 検索・抽出の上限を上げるための Tavily の API キー（任意）。Web のバックエンドに Tavily を選んだあとは、キー無しでも使えます（[app.tavily.com](https://app.tavily.com/home)、[キー不要の説明](https://docs.tavily.com/documentation/keyless)） |
| `TAVILY_BASE_URL` | Tavily の API エンドポイントを上書きします。社内のプロキシや、自分で立てた Tavily 互換の検索バックエンドで便利です。`GROQ_BASE_URL` と同じ考え方です。 |
| `PERPLEXITY_API_KEY` | `perplexity` の Web バックエンド用の Perplexity Search の API キー — 順位付けされた検索結果と、抽出のための問いに関係するページの断片が得られます（[perplexity.ai/account/api](https://www.perplexity.ai/account/api)） |
| `PERPLEXITY_BASE_URL` | プロキシのために Perplexity の API エンドポイントを上書きします（既定 `https://api.perplexity.ai`。任意） |
| `SEARXNG_URL` | 無料で自分で立てられる Web 検索のための SearXNG の URL — API キーは要りません（[searxng.github.io](https://searxng.github.io/searxng/)） |
| `EXA_API_KEY` | AI 向けの Web 検索と本文取得のための Exa の API キー（[exa.ai](https://exa.ai/)） |
| `BRAVE_SEARCH_API_KEY` | Web 検索のための Brave Search API の購読トークン（無料枠あり）（[brave.com/search/api](https://brave.com/search/api/)） |
| `BROWSERBASE_API_KEY` | ブラウザの自動操作（[browserbase.com](https://browserbase.com/)） |
| `BROWSERBASE_PROJECT_ID` | Browserbase のプロジェクト ID |
| `BROWSER_USE_API_KEY` | Browser Use のクラウドブラウザの API キー（[browser-use.com](https://browser-use.com/)） |
| `FIRECRAWL_BROWSER_TTL` | Firecrawl のブラウザセッションの保持時間（秒。既定: 300） |
| `BROWSER_CDP_URL` | 手元のブラウザ向けの Chrome DevTools Protocol の URL（`/browser connect` で設定します。例: `ws://localhost:9222`） |
| `CAMOFOX_URL` | 手元の検出回避ブラウザ Camofox のサーバーのアドレス（既定: `http://localhost:9377`）。アドレスを指すだけで、Camofox をバックエンドに選ぶわけではありません。`hermes tools` で Camofox を選んでください（`browser.cloud_provider: camofox`） |
| `CAMOFOX_API_KEY` | リモートや認証つきの Camofox サーバーへ Authorization ヘッダーとして送るベアラートークン（任意） |
| `CAMOFOX_USER_ID` | 共有の見えるセッション向けに、外部で管理する Camofox のユーザー ID（任意） |
| `CAMOFOX_SESSION_KEY` | `CAMOFOX_USER_ID` のためにタブを作るときに使う Camofox のセッションキー（任意） |
| `CAMOFOX_ADOPT_EXISTING_TAB` | `true` にすると、新しいタブを作る前に既存の Camofox のタブを使い回します |
| `BROWSER_INACTIVITY_TIMEOUT` | ブラウザセッションが使われないまま終了するまでの秒数 |
| `AGENT_BROWSER_ARGS` | Chromium を起動するときの追加のフラグ（カンマ区切りまたは改行区切り）。root で動かしているときや、AppArmor で制限された非特権のユーザー名前空間（Ubuntu 23.10 以降、DGX Spark、多くのコンテナイメージ）では、Hermes が `--no-sandbox,--disable-dev-shm-usage` を自動で足します。上書きしたい場合や他のフラグを足したい場合にだけ、自分で設定してください。 |
| `AGENT_BROWSER_ENGINE` | 手元のブラウザのエンジン: `auto`（既定 — CDP 経由の Chromium 系）、`lightpanda`（Browser Use のモードでは `lightpanda serve` を立ち上げ、組み込みのツールは agent-browser に `--engine lightpanda` を渡します）、または `chrome`。config.yaml の `browser.engine` と同じです。 |
| `FAL_KEY` | 画像生成（[fal.ai](https://fal.ai/)） |
| `KREA_API_KEY` | Krea 2 の画像生成のための Krea の API キー（[krea.ai](https://krea.ai/)） |
| `GROQ_API_KEY` | Groq Whisper の音声認識の API キー（[groq.com](https://groq.com/)） |
| `ELEVENLABS_API_KEY` | ElevenLabs の上位の合成音声（[elevenlabs.io](https://elevenlabs.io/)） |
| `PORCUPINE_ACCESS_KEY` | Picovoice Porcupine のウェイクワードのエンジン（[console.picovoice.ai](https://console.picovoice.ai/)） — `wake_word.provider: porcupine` のときだけ必要です。既定の openWakeWord と sherpa のエンジンにキーは要りません |
| `STT_GROQ_MODEL` | Groq の音声認識モデルを上書きします（既定: `whisper-large-v3-turbo`） |
| `GROQ_BASE_URL` | Groq の OpenAI 互換の音声認識のエンドポイントを上書きします |
| `STT_OPENAI_MODEL` | OpenAI の音声認識モデルを上書きします（既定: `whisper-1`） |
| `STT_OPENAI_BASE_URL` | OpenAI 互換の音声認識のエンドポイントを上書きします |
| `GITHUB_TOKEN` | Skills Hub 向けの GitHub のトークン（API の上限が上がり、スキルを公開できます）。デスクトップアプリの更新確認にも使われます（`GH_TOKEN` も受け付けます。どちらも無い場合、デスクトップは `gh` CLI のログイン、次いで匿名のアクセスへ切り替えます） |
| `HONCHO_API_KEY` | セッションをまたいだ利用者のモデル化（[honcho.dev](https://honcho.dev/)） |
| `HONCHO_BASE_URL` | 自分で立てた Honcho のベース URL（既定: Honcho のクラウド）。手元の環境に API キーは要りません |
| `HINDSIGHT_API_KEY` | グラフを意識した永続メモリのための Hindsight の API キー（[hindsight.vectorize.io](https://hindsight.vectorize.io)） |
| `HINDSIGHT_API_URL` | Hindsight API のベース URL（既定: `https://api.hindsight.vectorize.io`） |
| `HINDSIGHT_TIMEOUT` | Hindsight のメモリ提供元の API 呼び出しの制限時間（秒。既定: `60`）。`/sync` や `on_session_switch` のときに Hindsight の応答が遅く、`errors.log` に時間切れが出ているなら、この値を上げてください。 |
| `MEM0_API_KEY` | 意味を捉えた永続メモリのための Mem0 Platform の API キー（[app.mem0.ai](https://app.mem0.ai)） |
| `MEM0_MODE` | Mem0 のバックエンドのモード: `platform`（既定）または `oss` — [メモリの提供元](/hermes/docs/user-guide/features/memory-providers/) をご覧ください |
| `MEM0_HOST` | 自分で立てた Mem0 サーバーのベース URL（プラグインが Platform API から切り替わります） |
| `MEM0_USER_ID` | Mem0 のメモリを保存する利用者 ID を上書きします |
| `MEM0_AGENT_ID` | Mem0 のメモリに付けるエージェント ID を上書きします |
| `RETAINDB_API_KEY` | 永続メモリのための RetainDB の API キー（[retaindb.com](https://retaindb.com)） |
| `RETAINDB_BASE_URL` | 自分で立てた RetainDB のベース URL（既定: `https://api.retaindb.com`） |
| `OPENVIKING_API_KEY` | OpenViking の API キー（手元の開発モードでは空のままで構いません） |
| `OPENVIKING_ENDPOINT` | OpenViking のサーバーの URL（既定: `http://127.0.0.1:1933`） |
| `BRV_API_KEY` | ByteRover の API キー（任意。クラウド同期のためのもので、既定では手元を優先します）（[app.byterover.dev](https://app.byterover.dev)） |
| `SUPERMEMORY_API_KEY` | プロフィールの想起とセッションの取り込みを備えた、意味を捉えた長期メモリ（[supermemory.ai](https://supermemory.ai)） |
| `DAYTONA_API_KEY` | Daytona のクラウドサンドボックス（[daytona.io](https://daytona.io/)） |
| `VERCEL_TOKEN` | Vercel Sandbox のアクセストークン（[vercel.com](https://vercel.com/)） |
| `VERCEL_PROJECT_ID` | Vercel のプロジェクト ID（`VERCEL_TOKEN` と一緒に必要です） |
| `VERCEL_TEAM_ID` | Vercel のチーム ID（`VERCEL_TOKEN` と一緒に必要です） |
| `VERCEL_OIDC_TOKEN` | Vercel の短命な OIDC トークン（開発時のみの代替） |

### スキルの API キー {#skill-api-keys}

同梱・任意のスキルが使う秘密です。それぞれ、対応するスキルを使うときにだけ必要になります。

| 変数 | 使うスキル | 説明 |
|----------|---------------|-------------|
| `NOTION_API_KEY` | `notion` | Notion の連携トークン。 |
| `LINEAR_API_KEY` | `linear` | Linear の個人 API キー。 |
| `AIRTABLE_API_KEY` | `airtable` | Airtable の個人アクセストークン。 |
| `TENOR_API_KEY` | `gif-search` | GIF 検索のための Tenor の API キー。 |

### Langfuse による可観測性 {#langfuse-observability}

同梱の [`observability/langfuse`](/hermes/docs/user-guide/features/built-in-plugins/#observabilitylangfuse) プラグインのための環境変数です。`~/.hermes/.env` に書いてください。これらが効くには、プラグインを有効にしておく必要もあります（`hermes plugins enable observability/langfuse`、または `hermes plugins` でチェックを入れる）。

| 変数 | 説明 |
|----------|-------------|
| `HERMES_LANGFUSE_PUBLIC_KEY` | Langfuse のプロジェクトの公開キー（`pk-lf-...`）。必須です。 |
| `HERMES_LANGFUSE_SECRET_KEY` | Langfuse のプロジェクトの秘密キー（`sk-lf-...`）。必須です。 |
| `HERMES_LANGFUSE_BASE_URL` | Langfuse のサーバーの URL（既定: `https://cloud.langfuse.com`）。自分で立てた場合に設定します。 |
| `HERMES_LANGFUSE_ENV` | 記録に付ける環境のタグ（`production`、`staging` など） |
| `HERMES_LANGFUSE_RELEASE` | 記録に付ける公開・版のタグ |
| `HERMES_LANGFUSE_SAMPLE_RATE` | SDK の抽出率 0.0〜1.0（既定: `1.0`） |
| `HERMES_LANGFUSE_MAX_CHARS` | 直列化した中身の、項目ごとの切り詰め（既定: `12000`） |
| `HERMES_LANGFUSE_DEBUG` | `true` にすると、プラグインの詳しいログが `agent.log` に出ます |
| `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` / `LANGFUSE_BASE_URL` | Langfuse の SDK の標準の名前です。対応する `HERMES_LANGFUSE_*` が未設定のときの予備として受け付けられます。 |

### Nous Tool Gateway {#nous-tool-gateway}

これらは、Nous の有料の購読者や、自分で立てたゲートウェイのために [Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/) を設定する変数です。多くの方は設定する必要がありません。ゲートウェイは `hermes model` か `hermes tools` で自動的に設定されます。

| 変数 | 説明 |
|----------|-------------|
| `TOOL_GATEWAY_DOMAIN` | Tool Gateway の振り分けのベースになるドメイン（既定: `nousresearch.com`） |
| `TOOL_GATEWAY_SCHEME` | ゲートウェイの URL の HTTP / HTTPS の別（既定: `https`） |
| `TOOL_GATEWAY_USER_TOKEN` | Tool Gateway の認証トークン（ふつうは Nous の認証から自動で入ります） |
| `FIRECRAWL_GATEWAY_URL` | Firecrawl のゲートウェイのエンドポイントだけを上書きする URL |

## ターミナルのバックエンド {#terminal-backend}

| 変数 | 説明 |
|----------|-------------|
| `TERMINAL_ENV` | バックエンド: `local`、`docker`、`ssh`、`singularity`、`modal`、`daytona`、`vercel_sandbox` |
| `HERMES_DOCKER_BINARY` | Hermes が呼び出すコンテナのバイナリを上書きします（`podman`、`/usr/local/bin/docker` など）。未設定なら、Hermes が `PATH` 上の `docker` か `podman` を自動で見つけます。両方入っていて既定でないほうを使いたいとき、あるいはバイナリが `PATH` の外にあるときに必要です。 |
| `TERMINAL_DOCKER_IMAGE` | Docker のイメージ（既定: `nikolaik/python-nodejs:python3.11-nodejs20`） |
| `TERMINAL_DOCKER_FORWARD_ENV` | Docker のターミナルセッションへ明示的に渡す環境変数名の JSON 配列。補足: スキルが宣言した `required_environment_variables` は自動で渡されるので、どのスキルも宣言していない変数のときだけ必要です。 |
| `TERMINAL_DOCKER_VOLUMES` | Docker のボリュームを追加でマウントします（`host:container` の組をカンマ区切りで） |
| `TERMINAL_DOCKER_ENV` | Docker のターミナルセッションの中で設定する追加の環境変数の JSON オブジェクト（例: `{"FOO":"bar"}`） |
| `TERMINAL_DOCKER_EXTRA_ARGS` | `docker run` に渡す追加の引数の JSON 配列（例: `["--memory","4g"]`） |
| `TERMINAL_DOCKER_MOUNT_CWD_TO_WORKSPACE` | 上級者向けの任意設定です。起動時の作業ディレクトリを Docker の `/workspace` にマウントします（`true` / `false`、既定: `false`） |
| `TERMINAL_SINGULARITY_IMAGE` | Singularity のイメージ、または `.sif` のパス |
| `TERMINAL_MODAL_IMAGE` | Modal のコンテナイメージ |
| `TERMINAL_DAYTONA_IMAGE` | Daytona のサンドボックスのイメージ |
| `TERMINAL_VERCEL_RUNTIME` | Vercel Sandbox の実行環境（`node24`、`node22`、`python3.13`） |
| `TERMINAL_TIMEOUT` | コマンドの制限時間（秒） |
| `TERMINAL_LIFETIME_SECONDS` | ターミナルセッションの最大の寿命（秒） |
| `TERMINAL_CWD` | ゲートウェイや cron のターミナルセッションを直接上書きする、非推奨の設定です。`config.yaml` の `terminal.cwd` をおすすめします。CLI は引き続き起動時のディレクトリを使います。 |
| `SUDO_PASSWORD` | 対話的な確認なしで sudo を使えるようにします |

クラウドのサンドボックスのバックエンドでは、残るのはファイルシステムです。`TERMINAL_LIFETIME_SECONDS` は、使われていないターミナルセッションを Hermes が片付ける時期を決めるもので、あとで再開したときには、同じプロセスが生き続けているのではなくサンドボックスが作り直されることがあります。

## SSH のバックエンド {#ssh-backend}

| 変数 | 説明 |
|----------|-------------|
| `TERMINAL_SSH_HOST` | リモートのサーバーのホスト名 |
| `TERMINAL_SSH_USER` | SSH のユーザー名 |
| `TERMINAL_SSH_PORT` | SSH のポート（既定: 22） |
| `TERMINAL_SSH_KEY` | 秘密鍵のパス |
| `TERMINAL_SSH_PERSISTENT` | SSH で常駐シェルを使うかを上書きします（既定: `TERMINAL_PERSISTENT_SHELL` に従います） |

## コンテナの資源（Docker、Singularity、Modal、Daytona） {#container-resources-docker-singularity-modal-daytona}

| 変数 | 説明 |
|----------|-------------|
| `TERMINAL_CONTAINER_CPU` | CPU のコア数（既定: 1） |
| `TERMINAL_CONTAINER_MEMORY` | メモリ（MB。既定: 5120） |
| `TERMINAL_CONTAINER_DISK` | ディスク（MB。既定: 51200） |
| `TERMINAL_CONTAINER_PERSISTENT` | コンテナのファイルシステムをセッションをまたいで残します（既定: `true`） |
| `TERMINAL_SANDBOX_DIR` | ワークスペースと重ね合わせのためのホスト側のディレクトリ（既定: `~/.hermes/sandboxes/`） |

## 常駐シェル {#persistent-shell}

| 変数 | 説明 |
|----------|-------------|
| `TERMINAL_PERSISTENT_SHELL` | ローカル以外のバックエンドで常駐シェルを使います（既定: `true`）。config.yaml の `terminal.persistent_shell` でも設定できます |
| `TERMINAL_LOCAL_PERSISTENT` | ローカルのバックエンドで常駐シェルを使います（既定: `false`） |
| `TERMINAL_SSH_PERSISTENT` | SSH のバックエンドで常駐シェルを使うかを上書きします（既定: `TERMINAL_PERSISTENT_SHELL` に従います） |

## 送信プロキシ（サンドボックスに差し込まれるもの） {#egress-proxy-sandbox-injected}

これらの環境変数はホスト側には設定されません。`proxy.enabled: true` のとき、[送信プロキシ](/hermes/docs/user-guide/egress/iron-proxy/) の連携が Docker のサンドボックスの中へ差し込みます。この版で組み込まれているバックエンドは Docker だけです。

| 変数 | 説明 |
|----------|-------------|
| `HERMES_EGRESS_PROXY` | 送信プロキシが働いているとき、サンドボックスの中で `1` に設定されます。エージェント側のコードは、これを見て TLS を中継するプロキシの後ろにいると分かります。 |
| プロバイダの環境変数（`OPENROUTER_API_KEY`、`OPENAI_API_KEY` など） | 本物の上流の秘密ではなく、中身の分からないプロキシのトークンが入ります。既存の SDK はそのまま標準の名前を読み続けられます。iron-proxy が、ネットワークの境目でそのトークンを本物の上流の秘密と入れ替えます。 |
| `HERMES_PROXY_TOKEN_<ENV_NAME>` | 発行されたプロバイダごとの対応の、診断用の別名です。例: `HERMES_PROXY_TOKEN_OPENROUTER_API_KEY=hermes-proxy-openrouter-…`。標準のプロバイダの環境変数と同じトークンの値です。 |
| `HTTPS_PROXY` / `HTTP_PROXY` | `HTTPS_PROXY` は CONNECT / 中継のために `http://host.docker.internal:<tunnel_port>` を指します。`HTTP_PROXY` は素の HTTP の転送のために `<tunnel_port + 1>` を指します。 |
| `NO_PROXY` | `127.0.0.1,localhost,::1` です。サンドボックスの中のループバックの開発サーバーがプロキシを通らないようにします。 |
| `REQUESTS_CA_BUNDLE` / `SSL_CERT_FILE` / `CURL_CA_BUNDLE` / `NODE_EXTRA_CA_CERTS` | サンドボックスの中にマウントされた Hermes の送信用 CA 証明書のパス（`/etc/ssl/certs/hermes-egress-ca.crt`）。各言語の実行環境が、iron-proxy が中継のために発行する末端の証明書を信頼できるようになります。 |
| `NODE_OPTIONS` | `--use-openssl-ca` が末尾に足されます（すでにあるフラグは残ります）。これで Node.js が、他の CA の変数が制御する OpenSSL の証明書置き場を通るようになります。[Node.js の CA が非対称になる注意点](/hermes/docs/user-guide/egress/iron-proxy/#nodejs-asymmetric-ca-caveat) を狭められます。 |
| `HERMES_IRON_PROXY_NONCE` | iron-proxy のデーモンのプロセス自身に設定されます（サンドボックスの中ではありません）。PID が使い回されても、候補の PID が *こちらの* 管理下のバイナリを指しているかを `_pid_alive` が確かめるために使います。 |

これらは、`proxy.enabled: true` で、なおかつデーモンが動いているときに、Docker のターミナルのバックエンドが自動で設定します。自分で設定するものではありません。運用者が触るつまみは `~/.hermes/config.yaml` の `proxy:` の下にあります。[送信プロキシ → 設定](/hermes/docs/user-guide/egress/iron-proxy/#configuration) をご覧ください。

## メッセージング {#messaging}

| 変数 | 説明 |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Telegram のボットのトークン（@BotFather から取得） |
| `TELEGRAM_ALLOWED_USERS` | ボットを使えるユーザー ID をカンマ区切りで指定します（DM、グループ、フォーラムに効きます） |
| `TELEGRAM_ALLOW_ALL_USERS` | どの Telegram の利用者でもボットを動かせるようにします（開発時のみ）。 |
| `TELEGRAM_GROUP_ALLOWED_USERS` | グループ・フォーラムでのみ許可する送信者のユーザー ID をカンマ区切りで指定します（DM のアクセスは与えません）。チャット ID の形（`-` で始まる値）は、#17686 より前の設定との互換のためチャット ID として今も受け付けられますが、非推奨の警告が出ます。 |
| `TELEGRAM_GROUP_ALLOWED_CHATS` | グループ・フォーラムのチャット ID をカンマ区切りで指定します。そのメンバーは全員許可されます |
| `TELEGRAM_HOME_CHANNEL` | cron の配信に使う既定の Telegram のチャット・チャンネル |
| `TELEGRAM_HOME_CHANNEL_NAME` | Telegram のホームチャンネルの表示名 |
| `TELEGRAM_CRON_THREAD_ID` | cron の配信を受け取るフォーラムの話題 ID。cron についてのみ `TELEGRAM_HOME_CHANNEL_THREAD_ID` より優先されます。話題モードで使うと、cron のメッセージへの返信が system のロビーではなく新しいセッションを開きます（#24409）。 |
| `TELEGRAM_WEBHOOK_URL` | webhook モード用の公開 HTTPS の URL（設定すると、ポーリングではなく webhook になります） |
| `TELEGRAM_WEBHOOK_PORT` | webhook のサーバーが待ち受けるローカルのポート（既定: `8443`） |
| `TELEGRAM_WEBHOOK_SECRET` | 検証のために Telegram が更新ごとに返す秘密のトークン。**`TELEGRAM_WEBHOOK_URL` を設定したときは必須です** — これが無いとゲートウェイは起動しません（GHSA-3vpc-7q5r-276h）。`openssl rand -hex 32` で作ってください。 |
| `TELEGRAM_REACTIONS` | 処理中にメッセージへ絵文字のリアクションを付けます（既定: `false`） |
| `TELEGRAM_REQUIRE_MENTION` | Telegram のグループで応答する前に、明示的なきっかけを必要とします。`config.yaml` の `telegram.require_mention` と同じです。 |
| `TELEGRAM_MENTION_PATTERNS` | Telegram のグループでのメンションの関門が有効なときに受け付ける、ウェイクワードの正規表現の並びです。JSON 配列、改行区切り、カンマ区切りが使えます。`telegram.mention_patterns` と同じです。 |
| `TELEGRAM_EXCLUSIVE_BOT_MENTIONS` | 有効にすると、Telegram のグループでの明示的な `@...bot` のメンションは、返信やウェイクワードの予備が働く前に、名指しされたボットのユーザー名だけへ届きます。既定: `true`。`telegram.exclusive_bot_mentions` と同じです。 |
| `TELEGRAM_BOTS_REQUIRE_MENTION` | 有効にすると、別のボットが送ったメッセージは、明示的に `@thisbot` と書かないと応答を引き起こしません。引用返信だけでは無視されるので、2 つのボットが延々と返信し合うのを止められます。人からの返信は影響を受けません。既定: `false`。`telegram.bots_require_mention` と同じです。 |
| `TELEGRAM_REPLY_TO_MODE` | 返信の参照のしかた: `off`、`first`（既定）、`all`。Discord と同じ考え方です。 |
| `TELEGRAM_IGNORED_THREADS` | ボットが決して応答しない Telegram のフォーラムの話題・スレッド ID をカンマ区切りで指定します |
| `TELEGRAM_PROXY` | Telegram への接続に使うプロキシの URL。`HTTPS_PROXY` より優先されます。`http://`、`https://`、`socks5://` に対応します |
| `DISCORD_BOT_TOKEN` | Discord のボットのトークン |
| `DISCORD_ALLOWED_USERS` | ボットを使える Discord のユーザー ID をカンマ区切りで指定します |
| `DISCORD_ALLOW_ALL_USERS` | どの Discord の利用者でもボットを動かせるようにします（開発時のみ）。 |
| `DISCORD_ALLOWED_ROLES` | ボットを使える Discord のロール ID をカンマ区切りで指定します（`DISCORD_ALLOWED_USERS` との「または」条件）。Members のインテントを自動で有効にします。運営チームの入れ替わりが多いときに便利で、ロールを与えれば自動で行き渡ります。 |
| `DISCORD_ALLOWED_CHANNELS` | Discord のチャンネル ID をカンマ区切りで指定します。設定すると、ボットはこれらのチャンネル（と、許可されていれば DM）でのみ応答します。`config.yaml` の `discord.allowed_channels` より優先されます。 |
| `DISCORD_PROXY` | Discord への接続に使うプロキシの URL。`HTTPS_PROXY` より優先されます。`http://`、`https://`、`socks5://` に対応します |
| `DISCORD_HOME_CHANNEL` | cron の配信に使う既定の Discord のチャンネル |
| `DISCORD_HOME_CHANNEL_NAME` | Discord のホームチャンネルの表示名 |
| `DISCORD_COMMAND_SYNC_POLICY` | 起動時の Discord のスラッシュコマンドの同期のしかた: `safe`（差分を見て揃える）、`bulk`（従来の `tree.sync()`）、`off` |
| `DISCORD_REQUIRE_MENTION` | サーバーのチャンネルで応答する前に @メンションを必要とします |
| `DISCORD_FREE_RESPONSE_CHANNELS` | メンションが要らないチャンネル ID をカンマ区切りで指定します |
| `DISCORD_AUTO_THREAD` | 対応している場面で、長い返信を自動でスレッドにします |
| `DISCORD_ALLOW_ANY_ATTACHMENT` | `true` にすると、どんな種類の添付も受け取ります（組み込みの PDF / テキスト / zip / オフィス文書の許可リストに限りません）。分からない種類のものは手元に保存され、エージェントにはローカルのパスとして渡されるので、`terminal` / `read_file` / `ffprobe` で調べられます。既定は `false`。 |
| `DISCORD_MAX_ATTACHMENT_BYTES` | ゲートウェイが保存する添付 1 つあたりの最大バイト数。既定は `33554432`（32 MiB）。`0` にすると上限なしになります（書き出しの間、添付はメモリ上に保持されます）。 |
| `DISCORD_REACTIONS` | 処理中にメッセージへ絵文字のリアクションを付けます（既定: `true`） |
| `DISCORD_IGNORED_CHANNELS` | ボットが決して応答しないチャンネル ID をカンマ区切りで指定します |
| `DISCORD_NO_THREAD_CHANNELS` | ボットが自動でスレッドを作らずに応答するチャンネル ID をカンマ区切りで指定します |
| `DISCORD_REPLY_TO_MODE` | 返信の参照のしかた: `off`、`first`（既定）、`all` |
| `DISCORD_ALLOW_MENTION_EVERYONE` | ボットが `@everyone` / `@here` を鳴らせるようにします（既定: `false`）。[メンションの制御](/hermes/docs/user-guide/messaging/discord/#mention-control) をご覧ください。 |
| `DISCORD_ALLOW_MENTION_ROLES` | ボットが `@role` のメンションを鳴らせるようにします（既定: `false`）。 |
| `DISCORD_ALLOW_MENTION_USERS` | ボットが個別の `@user` のメンションを鳴らせるようにします（既定: `true`）。 |
| `DISCORD_ALLOW_MENTION_REPLIED_USER` | メッセージに返信するとき、その書き手を鳴らします（既定: `true`）。 |
| `SLACK_BOT_TOKEN` | Slack のボットのトークン（`xoxb-...`） |
| `SLACK_APP_TOKEN` | Slack のアプリ水準のトークン（`xapp-...`。Socket Mode に必要です） |
| `SLACK_ALLOWED_USERS` | Slack のユーザー ID をカンマ区切りで指定します |
| `SLACK_ALLOW_ALL_USERS` | どの Slack の利用者でもボットを動かせるようにします（開発時のみ）。 |
| `SLACK_ALLOW_BOTS` | 他の Slack のボットからのメッセージを受け取ります: `none`（既定）、`mentions`、`all`。自分のメッセージは常に無視します。 |
| `SLACK_THREAD_REQUIRE_MENTION` | Slack のスレッドへの返信では明示的な @メンションを必要とし、トップレベルの自由に応答するチャンネルはそのまま残します |
| `SLACK_HOME_CHANNEL` | cron の配信に使う既定の Slack のチャンネル |
| `SLACK_HOME_CHANNEL_NAME` | Slack のホームチャンネルの表示名 |
| `GOOGLE_CHAT_PROJECT_ID` | Pub/Sub の話題を置く GCP のプロジェクト（無ければ `GOOGLE_CLOUD_PROJECT` に落ちます） |
| `GOOGLE_CHAT_SUBSCRIPTION_NAME` | Pub/Sub の購読のフルパス `projects/{proj}/subscriptions/{sub}`（旧名: `GOOGLE_CHAT_SUBSCRIPTION`） |
| `GOOGLE_CHAT_SERVICE_ACCOUNT_JSON` | サービスアカウント JSON のパス、または JSON をそのまま（無ければ `GOOGLE_APPLICATION_CREDENTIALS` に落ちます） |
| `GOOGLE_CHAT_ALLOWED_USERS` | ボットと会話できる利用者のメールアドレスをカンマ区切りで指定します |
| `GOOGLE_CHAT_ALLOW_ALL_USERS` | どの Google Chat の利用者でもボットを動かせるようにします（開発時のみ） |
| `GOOGLE_CHAT_HOME_CHANNEL` | cron の配信に使う既定のスペース（例: `spaces/AAAA...`） |
| `GOOGLE_CHAT_HOME_CHANNEL_NAME` | Google Chat のホームのスペースの表示名 |
| `GOOGLE_CHAT_MAX_MESSAGES` | Pub/Sub の FlowControl の、処理中メッセージの最大数（既定: `1`） |
| `GOOGLE_CHAT_MAX_BYTES` | Pub/Sub の FlowControl の、処理中バイト数の最大（既定: `16777216`、16 MiB） |
| `GOOGLE_CHAT_BOOTSTRAP_SPACES` | ボット自身の `users/{id}` を解決するとき、起動時に追加で調べるスペース ID をカンマ区切りで指定します |
| `GOOGLE_CHAT_DEBUG_RAW` | 何か値を入れると、伏せ字にした Pub/Sub の封筒を DEBUG の水準でログに出します（デバッグ用） |
| `GOOGLE_CHAT_HTTP_EVENTS_URL` | チャットのメッセージの出来事を受ける、認証つきの HTTP エンドポイント（Pub/Sub の代わり） |
| `GOOGLE_CHAT_HTTP_EVENTS_AUDIENCE` | Google が署名した HTTP の出来事のベアラートークンに期待する対象（既定は `GOOGLE_CHAT_HTTP_EVENTS_URL`） |
| `GOOGLE_CHAT_HTTP_EVENTS_SERVICE_ACCOUNT_EMAIL` | HTTP の出来事のベアラートークンに期待する Google のサービスアカウントのメールアドレス |
| `WHATSAPP_ENABLED` | WhatsApp のブリッジを有効にします（`true` / `false`） |
| `WHATSAPP_MODE` | `bot`（別の番号）または `self-chat`（自分あてに送る） |
| `WHATSAPP_ALLOWED_USERS` | 電話番号をカンマ区切りで指定します（国番号つき、`+` は不要）。`*` にすると全員を許可します |
| `WHATSAPP_ALLOW_ALL_USERS` | 許可リストなしで WhatsApp のすべての送信者を許可します（`true` / `false`） |
| `WHATSAPP_HOME_CHANNEL` | cron や通知の配信に使う既定のチャット ID。 |
| `WHATSAPP_HOME_CHANNEL_NAME` | WhatsApp のホームチャンネルの表示名。 |
| `WHATSAPP_DEBUG` | 切り分けのため、ブリッジで生のメッセージの出来事をログに出します（`true` / `false`） |
| `WHATSAPP_CLOUD_PHONE_NUMBER_ID` | WhatsApp Business Cloud API の Meta の電話番号 ID（15〜17 桁。電話番号そのものでは **ありません**） |
| `WHATSAPP_CLOUD_ACCESS_TOKEN` | Meta のアクセストークン（`EAA` で始まります）。一時的なトークンは 24 時間で切れ、System User のトークンは期限がありません |
| `WHATSAPP_CLOUD_APP_SECRET` | 受信した webhook の署名を確かめるための、32 文字の 16 進のアプリの秘密 |
| `WHATSAPP_CLOUD_VERIFY_TOKEN` | Meta の webhook の確認のやり取りで使う共有の秘密（セットアップのウィザードが自動生成します） |
| `WHATSAPP_CLOUD_ALLOWED_USERS` | ボットにメッセージを送れる `wa_id`（国番号つきの電話番号、`+` は不要）をカンマ区切りで指定します |
| `WHATSAPP_CLOUD_ALLOW_ALL_USERS` | 許可リストなしで WhatsApp Cloud のすべての送信者を許可します（`true` / `false`） |
| `WHATSAPP_CLOUD_APP_ID` | Meta のアプリ ID（任意。今後の分析機能の連携用） |
| `WHATSAPP_CLOUD_WABA_ID` | WhatsApp Business アカウント ID（任意。今後の分析機能の連携用） |
| `WHATSAPP_CLOUD_WEBHOOK_HOST` | 受信用の webhook サーバーが待ち受けるインターフェース（既定 `0.0.0.0`） |
| `WHATSAPP_CLOUD_WEBHOOK_PORT` | 受信用の webhook サーバーが待ち受けるポート（既定 `8090`） |
| `WHATSAPP_CLOUD_WEBHOOK_PATH` | Meta が受信メッセージを送ってくる URL のパス（既定 `/whatsapp/webhook`） |
| `WHATSAPP_CLOUD_API_VERSION` | 呼び出す Meta Graph API の版（既定 `v20.0`） |
| `WHATSAPP_CLOUD_HOME_CHANNEL` | ボットのホームチャンネルとして使う `wa_id`（cron の仕事などのため） |
| `WHATSAPP_CLOUD_DM_POLICY` | Cloud のアダプタでの DM の扱い（`open` / `allowlist` / `disabled`）。未設定なら `WHATSAPP_DM_POLICY` に落ちます |
| `WHATSAPP_CLOUD_ALLOW_FROM` | `dm_policy: allowlist` のときに許可する送信者をカンマ区切りで指定します（素の `wa_id`。Baileys 形式の JID は正規化されます） |
| `WHATSAPP_CLOUD_GROUP_POLICY` | Cloud のアダプタでのグループの扱い（`open` / `allowlist` / `disabled`）。未設定なら `WHATSAPP_GROUP_POLICY` に落ちます |
| `WHATSAPP_CLOUD_GROUP_ALLOW_FROM` | `group_policy: allowlist` のときに許可するグループのチャット ID をカンマ区切りで指定します |
| `SIGNAL_HTTP_URL` | signal-cli のデーモンの HTTP エンドポイント（たとえば `http://127.0.0.1:8080`） |
| `SIGNAL_ACCOUNT` | E.164 形式のボットの電話番号 |
| `SIGNAL_ALLOWED_USERS` | E.164 形式の電話番号か UUID をカンマ区切りで指定します |
| `SIGNAL_GROUP_ALLOWED_USERS` | グループ ID をカンマ区切りで指定します。`*` にするとすべてのグループが対象です |
| `SIGNAL_HOME_CHANNEL_NAME` | Signal のホームチャンネルの表示名 |
| `SIGNAL_IGNORE_STORIES` | Signal のストーリー・ステータスの更新を無視します |
| `SIGNAL_ALLOW_ALL_USERS` | 許可リストなしで Signal のすべての利用者を許可します |
| `TWILIO_ACCOUNT_SID` | Twilio のアカウント SID（電話のスキルと共通） |
| `TWILIO_AUTH_TOKEN` | Twilio の認証トークン（電話のスキルと共通。webhook の署名の検証にも使います） |
| `TWILIO_PHONE_NUMBER` | E.164 形式の Twilio の電話番号（電話のスキルと共通） |
| `SMS_WEBHOOK_URL` | Twilio の署名の検証に使う公開の URL。Twilio Console の webhook の URL と一致している必要があります（必須） |
| `SMS_WEBHOOK_PORT` | 受信 SMS の webhook が待ち受けるポート（既定: `8080`） |
| `SMS_WEBHOOK_HOST` | webhook が待ち受けるアドレス（既定: `127.0.0.1`） |
| `SMS_INSECURE_NO_SIGNATURE` | `true` にすると Twilio の署名の検証を無効にします（手元の開発専用。本番では使わないでください） |
| `SMS_ALLOWED_USERS` | 会話できる E.164 形式の電話番号をカンマ区切りで指定します |
| `SMS_ALLOW_ALL_USERS` | 許可リストなしで SMS のすべての送信者を許可します |
| `SMS_HOME_CHANNEL` | cron の仕事や通知の配信に使う電話番号 |
| `SMS_HOME_CHANNEL_NAME` | SMS のホームチャンネルの表示名 |
| `EMAIL_ADDRESS` | メールのゲートウェイのアダプタが使うメールアドレス |
| `EMAIL_PASSWORD` | そのメールアカウントのパスワード、またはアプリパスワード |
| `EMAIL_IMAP_HOST` | メールのアダプタの IMAP のホスト名 |
| `EMAIL_IMAP_PORT` | IMAP のポート |
| `EMAIL_SMTP_HOST` | メールのアダプタの SMTP のホスト名 |
| `EMAIL_SMTP_PORT` | SMTP のポート |
| `EMAIL_ALLOWED_USERS` | ボットにメッセージを送れるメールアドレスをカンマ区切りで指定します |
| `EMAIL_HOME_ADDRESS` | こちらから送るメールの既定の宛先 |
| `EMAIL_HOME_ADDRESS_NAME` | メールのホームの宛先の表示名 |
| `EMAIL_POLL_INTERVAL` | メールを見に行く間隔（秒） |
| `EMAIL_ALLOW_ALL_USERS` | 受信メールのすべての送信者を許可します |
| `DINGTALK_CLIENT_ID` | 開発者ポータルで取得する DingTalk のボットの AppKey（[open.dingtalk.com](https://open.dingtalk.com)） |
| `DINGTALK_CLIENT_SECRET` | 開発者ポータルで取得する DingTalk のボットの AppSecret |
| `DINGTALK_ALLOWED_USERS` | ボットにメッセージを送れる DingTalk のユーザー ID をカンマ区切りで指定します |
| `DINGTALK_WEBHOOK_URL` | 他のプラットフォームへの配信や cron の配信に使う、固定のロボットの webhook の URL。 |
| `DINGTALK_HOME_CHANNEL` | cron や通知の配信に使う既定の会話 ID。 |
| `DINGTALK_HOME_CHANNEL_NAME` | DingTalk のホームチャンネルの表示名。 |
| `FEISHU_APP_ID` | [open.feishu.cn](https://open.feishu.cn/) で取得する Feishu / Lark のボットの App ID |
| `FEISHU_APP_SECRET` | Feishu / Lark のボットの App Secret |
| `FEISHU_DOMAIN` | `feishu`（中国）または `lark`（国際）。既定: `feishu` |
| `FEISHU_CONNECTION_MODE` | `websocket`（おすすめ）または `webhook`。既定: `websocket` |
| `FEISHU_ENCRYPT_KEY` | webhook モード用の暗号鍵（任意） |
| `FEISHU_VERIFICATION_TOKEN` | webhook モード用の検証トークン（任意） |
| `FEISHU_ALLOWED_USERS` | ボットにメッセージを送れる Feishu のユーザー ID をカンマ区切りで指定します |
| `FEISHU_ALLOW_BOTS` | `none`（既定） / `mentions` / `all` — 他のボットからの受信メッセージを受け取ります。[ボット同士のやり取り](/hermes/docs/user-guide/messaging/feishu/#bot-to-bot-messaging) をご覧ください |
| `FEISHU_REQUIRE_MENTION` | `true`（既定） / `false` — グループのメッセージがボットへの @メンションを必要とするかどうか。チャットごとに `group_rules.<chat_id>.require_mention` で上書きできます。 |
| `FEISHU_HOME_CHANNEL` | cron の配信と通知に使う Feishu のチャット ID |
| `FEISHU_HOME_CHANNEL_NAME` | Feishu のホームチャンネルの表示名。 |
| `FEISHU_ALLOW_ALL_USERS` | どの Feishu の利用者でもボットを動かせるようにします（開発時のみ）。 |
| `WECOM_BOT_ID` | 管理コンソールで取得する WeCom AI Bot の ID |
| `WECOM_SECRET` | WeCom AI Bot の秘密 |
| `WECOM_WEBSOCKET_URL` | 独自の WebSocket の URL（既定: `wss://openws.work.weixin.qq.com`） |
| `WECOM_ALLOWED_USERS` | ボットにメッセージを送れる WeCom のユーザー ID をカンマ区切りで指定します |
| `WECOM_HOME_CHANNEL` | cron の配信と通知に使う WeCom のチャット ID |
| `WECOM_CALLBACK_CORP_ID` | コールバック方式の自社アプリ向けの WeCom の企業の Corp ID |
| `WECOM_CALLBACK_CORP_SECRET` | 自社アプリの Corp の秘密 |
| `WECOM_CALLBACK_AGENT_ID` | 自社アプリのエージェント ID |
| `WECOM_CALLBACK_TOKEN` | コールバックの検証トークン |
| `WECOM_CALLBACK_ENCODING_AES_KEY` | コールバックの暗号化に使う AES の鍵 |
| `WECOM_CALLBACK_HOST` | コールバックのサーバーが待ち受けるアドレス（既定: `0.0.0.0`） |
| `WECOM_CALLBACK_PORT` | コールバックのサーバーのポート（既定: `8645`） |
| `WECOM_CALLBACK_ALLOWED_USERS` | 許可リストに載せるユーザー ID をカンマ区切りで指定します |
| `WECOM_CALLBACK_ALLOW_ALL_USERS` | `true` にすると、許可リストなしですべての利用者を許可します |
| `WEIXIN_ACCOUNT_ID` | iLink Bot API の QR ログインで得た Weixin のアカウント ID |
| `WEIXIN_TOKEN` | iLink Bot API の QR ログインで得た Weixin の認証トークン |
| `WEIXIN_BASE_URL` | Weixin の iLink Bot API のベース URL を上書きします（既定: `https://ilinkai.weixin.qq.com`） |
| `WEIXIN_CDN_BASE_URL` | メディア用の Weixin の CDN のベース URL を上書きします（既定: `https://novac2c.cdn.weixin.qq.com/c2c`） |
| `WEIXIN_DM_POLICY` | ダイレクトメッセージの扱い: `open`、`allowlist`、`pairing`、`disabled`（既定: `open`） |
| `WEIXIN_GROUP_POLICY` | グループのメッセージの扱い: `open`、`allowlist`、`disabled`（既定: `disabled`） |
| `WEIXIN_ALLOWED_USERS` | ボットに DM を送れる Weixin のユーザー ID をカンマ区切りで指定します |
| `WEIXIN_GROUP_ALLOWED_USERS` | ボットとやり取りできる Weixin の **グループのチャット ID**（メンバーのユーザー ID ではありません）をカンマ区切りで指定します。名前は昔の名残で、実際に期待されるのはグループの ID です。iLink がグループの出来事を実際に届けるときにだけ効きます。QR ログインの iLink のボットの身元（`...@im.bot`）は、ふつうの WeChat のグループのメッセージをたいてい受け取りません。 |
| `WEIXIN_HOME_CHANNEL` | cron の配信と通知に使う Weixin のチャット ID |
| `WEIXIN_HOME_CHANNEL_NAME` | Weixin のホームチャンネルの表示名 |
| `WEIXIN_ALLOW_ALL_USERS` | 許可リストなしで Weixin のすべての利用者を許可します（`true` / `false`） |
| `BLUEBUBBLES_SERVER_URL` | BlueBubbles のサーバーの URL（例: `http://192.168.1.10:1234`） |
| `BLUEBUBBLES_PASSWORD` | BlueBubbles のサーバーのパスワード |
| `BLUEBUBBLES_WEBHOOK_HOST` | webhook が待ち受けるアドレス（既定: `127.0.0.1`） |
| `BLUEBUBBLES_WEBHOOK_PORT` | webhook が待ち受けるポート（既定: `8645`） |
| `BLUEBUBBLES_HOME_CHANNEL` | cron や通知の配信に使う電話番号・メールアドレス |
| `BLUEBUBBLES_ALLOWED_USERS` | 許可する利用者をカンマ区切りで指定します |
| `BLUEBUBBLES_ALLOW_ALL_USERS` | すべての利用者を許可します（`true` / `false`） |
| `QQ_APP_ID` | [q.qq.com](https://q.qq.com) で取得する QQ Bot の App ID |
| `QQ_CLIENT_SECRET` | [q.qq.com](https://q.qq.com) で取得する QQ Bot の App Secret |
| `QQ_STT_API_KEY` | 外部の音声認識の予備の提供元の API キー（任意。QQ の組み込みの音声認識が何も返さないときに使います） |
| `QQ_STT_BASE_URL` | 外部の音声認識の提供元のベース URL（任意） |
| `QQ_STT_MODEL` | 外部の音声認識の提供元のモデル名（任意） |
| `QQ_ALLOWED_USERS` | ボットにメッセージを送れる QQ の利用者の openID をカンマ区切りで指定します |
| `QQ_GROUP_ALLOWED_USERS` | グループでの @ メッセージを許可する QQ のグループ ID をカンマ区切りで指定します |
| `QQ_ALLOW_ALL_USERS` | すべての利用者を許可します（`true` / `false`。`QQ_ALLOWED_USERS` より優先されます） |
| `QQBOT_HOME_CHANNEL` | cron の配信と通知に使う QQ の利用者・グループの openID |
| `QQBOT_HOME_CHANNEL_NAME` | QQ のホームチャンネルの表示名 |
| `QQ_PORTAL_HOST` | QQ のポータルのホストを上書きします（サンドボックスのゲートウェイを通すなら `sandbox.q.qq.com`。既定: `q.qq.com`）。 |
| `QQ_SANDBOX` | 開発時の検証のために QQ のサンドボックスのモードを有効にします（`true` / `false`） |
| `MATTERMOST_URL` | Mattermost のサーバーの URL（例: `https://mm.example.com`） |
| `MATTERMOST_TOKEN` | Mattermost のボットのトークン、または個人アクセストークン |
| `MATTERMOST_ALLOWED_USERS` | ボットにメッセージを送れる Mattermost のユーザー ID をカンマ区切りで指定します |
| `MATTERMOST_ALLOW_ALL_USERS` | どの Mattermost の利用者でもボットを動かせるようにします（開発時のみ）。 |
| `MATTERMOST_ALLOWED_CHANNELS` | 設定すると、ボットはこれらのチャンネルでのみ応答します（許可リスト）。 |
| `MATTERMOST_HOME_CHANNEL` | こちらから送るメッセージ（cron、通知）の配信に使うチャンネル ID |
| `MATTERMOST_REQUIRE_MENTION` | チャンネルで `@mention` を必要とします（既定: `true`）。`false` にするとすべてのメッセージに応答します。 |
| `MATTERMOST_FREE_RESPONSE_CHANNELS` | `@mention` なしでボットが応答するチャンネル ID をカンマ区切りで指定します |
| `MATTERMOST_REPLY_MODE` | 返信のしかた: `thread`（スレッドで返す）または `off`（並べて返す。既定） |
| `MATRIX_HOMESERVER` | Matrix のホームサーバーの URL（例: `https://matrix.org`） |
| `MATRIX_ACCESS_TOKEN` | ボットの認証に使う Matrix のアクセストークン |
| `MATRIX_USER_ID` | Matrix のユーザー ID（例: `@hermes:matrix.org`）。パスワードでログインするときは必須で、アクセストークンを使うときは任意です |
| `MATRIX_PASSWORD` | Matrix のパスワード（アクセストークンの代わり） |
| `MATRIX_ALLOWED_USERS` | ボットにメッセージを送れる Matrix のユーザー ID をカンマ区切りで指定します（例: `@alice:matrix.org`） |
| `MATRIX_ALLOW_ALL_USERS` | どの Matrix の利用者でもボットを動かせるようにします（開発時のみ）。 |
| `MATRIX_HOME_CHANNEL` | cron や通知の配信に使う既定の部屋 ID。 |
| `MATRIX_HOME_CHANNEL_NAME` | Matrix のホームの部屋の表示名。 |
| `MATRIX_ALLOWED_ROOMS` | ボットの応答を引き起こせる Matrix の部屋 ID をカンマ区切りで指定します |
| `MATRIX_HOME_ROOM` | こちらから送るメッセージの配信に使う部屋 ID（例: `!abc123:matrix.org`） |
| `MATRIX_ENCRYPTION` | 端末間の暗号化を有効にします（`true` / `false`。既定: `false`） |
| `MATRIX_E2EE_MODE` | Matrix の端末間暗号化の扱い: `off`、`optional`、`required`。設定すると `MATRIX_ENCRYPTION` より優先されます。 |
| `MATRIX_DEVICE_ID` | 再起動をまたいで端末間暗号化を保つための、変わらない Matrix のデバイス ID（例: `HERMES_BOT`）。これが無いと、起動のたびに鍵が入れ替わり、過去の部屋の復号ができなくなります。 |
| `MATRIX_REACTIONS` | 受信したメッセージに、処理の進み具合を示す絵文字のリアクションを付けます（既定: `true`）。`false` にすると無効になります。 |
| `MATRIX_REQUIRE_MENTION` | 部屋で `@mention` を必要とします（既定: `true`）。`false` にするとすべてのメッセージに応答します。 |
| `MATRIX_FREE_RESPONSE_ROOMS` | `@mention` なしでボットが応答する部屋 ID をカンマ区切りで指定します |
| `MATRIX_IGNORE_USER_PATTERNS` | 無視する Matrix のブリッジ / アプリサービスの分身のユーザー ID の正規表現をカンマ区切りで指定します |
| `MATRIX_PROCESS_NOTICES` | 受信した Matrix の `m.notice` の出来事を処理します（既定: `false`） |
| `MATRIX_SESSION_SCOPE` | プロジェクトの部屋での Matrix のセッションの区切り: `auto`、`room`、`thread`（既定: `auto`） |
| `MATRIX_ALLOW_ROOM_MENTIONS` | 部屋のメンバー全員に知らせる `@room` のメンションの送信を許可します（既定: `false`） |
| `MATRIX_AUTO_THREAD` | 部屋のメッセージで自動的にスレッドを作ります（既定: `true`） |
| `MATRIX_DM_AUTO_THREAD` | Matrix の DM のメッセージで自動的にスレッドを作ります（既定: `false`） |
| `MATRIX_DM_MENTION_THREADS` | DM でボットが `@mentioned` されたときにスレッドを作ります（既定: `false`） |
| `MATRIX_APPROVAL_REQUIRE_SENDER` | 承認やモデル選択のリアクションを、分かっている場合は元の依頼者からのものに限ります（既定: `true`） |
| `MATRIX_APPROVAL_TIMEOUT_SECONDS` | Matrix のリアクションによる承認・モデル選択の制限時間（既定: `300`） |
| `MATRIX_ALLOW_PUBLIC_ROOMS` | Matrix の部屋を作るツールが公開の部屋を作れるようにします（既定: `false`） |
| `MATRIX_MAX_MEDIA_BYTES` | Matrix のメディアの送受信の最大バイト数（既定: `104857600`） |
| `MATRIX_RECOVERY_KEY` | デバイスの鍵が入れ替わったあと、相互署名の検証に使う復旧キー。相互署名を有効にした端末間暗号化の構成でおすすめです。 |
| `MATRIX_RECOVERY_KEY_OUTPUT_FILE` | 生成した Matrix の復旧キーを一度だけ書き出すパス（任意）。モード `0600` で作られ、上書きされることはありません。 |
| `HASS_TOKEN` | Home Assistant の長期アクセストークン（HA のプラットフォームとツールが有効になります） |
| `HASS_URL` | Home Assistant の URL（既定: `http://homeassistant.local:8123`） |
| `WEBHOOK_ENABLED` | webhook のプラットフォームのアダプタを有効にします（`true` / `false`） |
| `WEBHOOK_PORT` | webhook を受け取る HTTP サーバーのポート（既定: `8644`） |
| `WEBHOOK_SECRET` | webhook の署名の検証に使う全体の HMAC の秘密（経路ごとに指定が無いときの予備として使われます） |
| `API_SERVER_ENABLED` | OpenAI 互換の API サーバーを有効にします（`true` / `false`）。他のプラットフォームと並行して動きます。 |
| `API_SERVER_KEY` | API サーバーの認証に使うベアラートークン。API サーバーを有効にしているときは必ず必要です。 |
| `API_SERVER_CORS_ORIGINS` | API サーバーを直接呼べるブラウザの生成元をカンマ区切りで指定します（たとえば `http://localhost:3000,http://127.0.0.1:3000`）。既定: 無効。 |
| `API_SERVER_PORT` | API サーバーのポート（既定: `8642`） |
| `API_SERVER_HOST` | API サーバーが待ち受けるホスト・アドレス（既定: `127.0.0.1`）。ループバックでも `API_SERVER_KEY` は必要です。ブラウザからのアクセスには、狭く絞った `API_SERVER_CORS_ORIGINS` の許可リストを使ってください。 |
| `API_SERVER_MODEL_NAME` | `/v1/models` で名乗るモデル名。既定はプロファイル名（既定のプロファイルなら `hermes-agent`）です。Open WebUI のようなフロントエンドが接続ごとに別のモデル名を必要とする、複数人での構成で役立ちます。 |
| `GATEWAY_PROXY_URL` | メッセージを転送する先の、リモートの Hermes API サーバーの URL（[プロキシモード](/hermes/docs/user-guide/messaging/matrix/#proxy-mode-e2ee-on-macos)）。設定すると、ゲートウェイはプラットフォームの入出力だけを担い、エージェントの仕事はすべてリモートのサーバーに任されます。`config.yaml` の `gateway.proxy_url` でも設定できます。 |
| `GATEWAY_PROXY_KEY` | プロキシモードでリモートの API サーバーに認証してもらうためのベアラートークン。リモート側の `API_SERVER_KEY` と一致している必要があります。 |
| `MESSAGING_CWD` | ゲートウェイの作業ディレクトリのための、互換性のための非推奨の予備です。`config.yaml` の `terminal.cwd` をおすすめします。 |
| `GATEWAY_ALLOWED_USERS` | すべてのプラットフォームで許可するユーザー ID をカンマ区切りで指定します |
| `GATEWAY_ALLOW_ALL_USERS` | 許可リストなしで（`true` / `false`。既定: `false`）。`config.yaml` の `gateway.allow_all_users` でも設定できます。両方あるときは環境変数が優先されます。 |

### Web ダッシュボードと Hermes Desktop {#web-dashboard-hermes-desktop}

[Web ダッシュボード](/hermes/docs/user-guide/features/web-dashboard/) と、[Hermes Desktop をリモートのバックエンドにつなぐ](/hermes/docs/user-guide/features/web-dashboard/#connecting-hermes-desktop-to-a-remote-backend) ための認証です。秘密だけを置くという決まりに従い、認証情報は `~/.hermes/.env` に入れてください。OAuth の `client_id` は `config.yaml` の `dashboard.oauth` の下に書くほうが向いています（環境変数を設定した場合はそちらが優先されます）。

ダッシュボードの認証の仕組みは 3 つ同梱されています。リモートの Hermes Desktop からつなぐ場合や、インターネットに面したダッシュボードでは、**OAuth（Nous Portal）** をおすすめします。`HERMES_DASHBOARD_OAUTH_CLIENT_ID` を設定してください（`hermes dashboard register` で用意できます）。同梱の **ユーザー名とパスワード** の仕組み（`HERMES_DASHBOARD_BASIC_AUTH_*`）は、信頼できる LAN の中や VPN の後ろにあるバックエンドではいちばん手早い選択ですが、インターネットに直接さらすのには向きません。自前の ID 基盤で認証したいときは、**自分で立てた OIDC** の仕組み（`HERMES_DASHBOARD_OIDC_*`）を使ってください。いずれの場合も、ループバック以外への割り当て（`hermes dashboard --host 0.0.0.0`）で認証の関門が働きます。全体像は [Web ダッシュボード → 認証](/hermes/docs/user-guide/features/web-dashboard/#authentication-gated-mode) をご覧ください。

| 変数 | 説明 |
|----------|-------------|
| `HERMES_DASHBOARD_BASIC_AUTH_USERNAME` | 同梱のユーザー名・パスワードによるダッシュボード認証（`plugins/dashboard_auth/basic`）のユーザー名。パスワードと一緒に設定すると、この仕組みが有効になります。`dashboard.basic_auth.username` より優先されます。 |
| `HERMES_DASHBOARD_BASIC_AUTH_PASSWORD` | 基本の仕組みの平文のパスワード（読み込み時にメモリ上でハッシュ化されます）。設定の `password_hash` より優先されるので、環境変数で入れ替えられます。`dashboard.basic_auth.password` より優先されます。 |
| `HERMES_DASHBOARD_BASIC_AUTH_PASSWORD_HASH` | 基本の仕組みの scrypt のパスワードハッシュ（こちらがおすすめです。平文が残りません）。`python -c "from plugins.dashboard_auth.basic import hash_password; print(hash_password('PW'))"` で計算します。`dashboard.basic_auth.password_hash` より優先されます。 |
| `HERMES_DASHBOARD_BASIC_AUTH_SECRET` | 基本の仕組みの、状態を持たないセッショントークンに署名する HMAC の鍵（32 バイト以上。base64 / 16 進 / 生のいずれか）。再起動をまたいでセッションを保ちたい、複数のワーカーにまたがらせたい場合は明示的に設定してください。空にするとプロセスごとにランダムになり、再起動のたびにログアウトします。`dashboard.basic_auth.secret` より優先されます。 |
| `HERMES_DASHBOARD_BASIC_AUTH_TTL_SECONDS` | 基本の仕組みのアクセストークンの寿命（既定 12 時間）。`dashboard.basic_auth.session_ttl_seconds` より優先されます。 |
| `HERMES_DASHBOARD_OAUTH_CLIENT_ID` | 関門つき・公開のダッシュボード向けの OAuth のクライアント ID（`agent:{instance_id}`）。Nous の仕組み（`plugins/dashboard_auth/nous`）が有効になります。`dashboard.oauth.client_id` より優先されます。`hermes dashboard register` で用意してください。 |
| `HERMES_DASHBOARD_PUBLIC_URL` | リバースプロキシの後ろでダッシュボードに届く、公開の URL 全体です。OAuth のコールバックの組み立てを決め、そのホスト名を HTTP の Host / WebSocket の Origin の防御に足し、バックエンドがループバックに割り当てられていても、ループバック以外の公開ホストには認証の関門を要求します。`dashboard.public_url` より優先されます。 |
| `HERMES_DASHBOARD_OIDC_ISSUER` | 同梱の自前 OIDC の仕組み（`plugins/dashboard_auth/self_hosted`）の OIDC の発行元の URL。有効にするには必須です。`dashboard.oauth.self_hosted.issuer` より優先されます。 |
| `HERMES_DASHBOARD_OIDC_CLIENT_ID` | 自前 OIDC の仕組みの公開のクライアント ID（認可コード + PKCE）。有効にするには必須です。`dashboard.oauth.self_hosted.client_id` より優先されます。 |
| `HERMES_DASHBOARD_OIDC_SCOPES` | 自前 OIDC の仕組みで要求する OIDC のスコープ（既定 `openid profile email`）。`dashboard.oauth.self_hosted.scopes` より優先されます。 |
| `HERMES_DESKTOP_REMOTE_URL` | （デスクトップ側）リモートのバックエンドのベース URL（例: `http://host:9119`）。設定すると、アプリ内のゲートウェイの URL より優先されます。サインインは引き続きゲートウェイの設定画面から行います（バックエンドが示す方式に応じて、OAuth のリダイレクトかユーザー名とパスワードです）。 |
| `HERMES_DESKTOP_HERMES` | デスクトップのバックエンドのコマンドの上書き。パッケージ作成者や Nix、切り分けのために、バックエンドの探索のあと Electron に特定の `hermes` の実行ファイルを指させるときに使います。 |
| `HERMES_DESKTOP_HERMES_ROOT` | `hermes desktop --hermes-root` が使う、デスクトップのソースのチェックアウトの上書き。同梱の初回起動時の導入や、`PATH` にある既存の `hermes` より先に見られます。 |
| `HERMES_DESKTOP_IGNORE_EXISTING` | `1` にすると、バックエンドの解決のときに `PATH` にある既存の `hermes` をデスクトップが無視します。`hermes desktop --ignore-existing` と同じです。 |
| `HERMES_DESKTOP_CWD` | デスクトップのチャットセッションの最初のプロジェクトのディレクトリ。`hermes desktop --cwd` が設定します。 |
| `HERMES_DESKTOP_PYTHON` | バックエンド用の Python インタプリタの絶対パス。ソースのチェックアウトのために Electron が自動で見つけるより先に見られます。共有の venv を使い回すため、worktree の開発用の補助が使います（[worktree からの TUI とデスクトップ](/hermes/docs/developer-guide/worktree-ui-dev/) をご覧ください）。 |
| `HERMES_DESKTOP_DEV_SERVER` | Electron のシェルが、同梱のバンドルの代わりに読み込む Vite の開発サーバーの URL（例: `http://127.0.0.1:5174`）。`npm run dev` が自動で設定します。アプリ自体をいじるときだけ関係します。 |
| `HERMES_DESKTOP_CDP_PORT` | DOM / CSS を調べる道具のために、描画側が `127.0.0.1` に開く Chrome DevTools Protocol のポートを上書きします（既定 `9222`）。開発サーバーでの実行（`npm run dev`、`hgui`）では自動で開きますが、パッケージ済みのアプリでは決して開かず、ここに何を設定しても変わりません。開発時の実行で閉じたいときは `off` にしてください。このポートに届くものは何であれ、描画側でコードを実行できます。 |

### Microsoft Graph（Teams の会議） {#microsoft-graph-teams-meetings}

これから入る Teams の会議のまとめの仕組みが使う、Microsoft Graph の REST クライアント向けのアプリ単位の認証情報です。Azure ポータルでの手順と、必要な API の権限については [Microsoft Graph のアプリケーションを登録する](/hermes/docs/guides/microsoft-graph-app-registration/) をご覧ください。

| 変数 | 説明 |
|----------|-------------|
| `MSGRAPH_TENANT_ID` | Graph のアプリ登録の Azure AD のテナント ID（ディレクトリの GUID）。 |
| `MSGRAPH_CLIENT_ID` | Azure のアプリ登録のアプリケーション（クライアント）ID。 |
| `MSGRAPH_CLIENT_SECRET` | アプリ登録のクライアントシークレットの値。`~/.hermes/.env` に `chmod 600` で保存し、Azure ポータルで定期的に入れ替えてください。 |
| `MSGRAPH_SCOPE` | クライアント資格情報でトークンを要求するときの OAuth2 のスコープ（既定: `https://graph.microsoft.com/.default`）。 |
| `MSGRAPH_AUTHORITY_URL` | Microsoft ID プラットフォームの認証局（既定: `https://login.microsoftonline.com`）。国家向け・独立系のクラウドのときだけ上書きしてください（GCC High なら `https://login.microsoftonline.us` など）。 |

### Microsoft Graph の webhook の受け口 {#microsoft-graph-webhook-listener}

Graph の出来事（Teams の会議、カレンダー、チャットなど）の変更通知を受け取る仕組みです。設定と安全性の強化については [Microsoft Graph の webhook の受け口](/hermes/docs/user-guide/messaging/msgraph-webhook/) をご覧ください。

| 変数 | 説明 |
|----------|-------------|
| `MSGRAPH_WEBHOOK_ENABLED` | `msgraph_webhook` のゲートウェイのプラットフォームを有効にします（`true` / `1` / `yes`）。 |
| `MSGRAPH_WEBHOOK_PORT` | 受け口が待ち受けるポート（既定: `8646`）。 |
| `MSGRAPH_WEBHOOK_CLIENT_STATE` | Graph が通知のたびに返す共有の秘密。`hmac.compare_digest` で比べられます。`openssl rand -hex 32` で作ってください。 |
| `MSGRAPH_WEBHOOK_ACCEPTED_RESOURCES` | 受け付ける Graph の資源のパスや形をカンマ区切りで指定します（例: `communications/onlineMeetings,chats/*/messages`）。末尾の `*` は前方一致です。空ならすべて受け付けます。 |
| `MSGRAPH_WEBHOOK_ALLOWED_SOURCE_CIDRS` | 受け口へ POST できる CIDR の範囲をカンマ区切りで指定します（例: `52.96.0.0/14,52.104.0.0/14`）。空ならすべて許可します（既定）。本番では Microsoft Graph が公開している送信元の範囲に絞ってください。 |

### Teams の会議のまとめの配信 {#teams-meeting-summary-delivery}

[`teams_pipeline` プラグイン](/hermes/docs/user-guide/messaging/msgraph-webhook/) が有効なときにだけ使われます。設定は `config.yaml` の `platforms.teams.extra` の下でも書けます。両方に設定した場合は環境変数が優先されます。[Microsoft Teams → 会議のまとめの配信](/hermes/docs/user-guide/messaging/teams/#meeting-summary-delivery-teams-meeting-pipeline) をご覧ください。

| 変数 | 説明 |
|----------|-------------|
| `TEAMS_DELIVERY_MODE` | `graph` または `incoming_webhook`。 |
| `TEAMS_INCOMING_WEBHOOK_URL` | Teams が生成する webhook の URL。`TEAMS_DELIVERY_MODE=incoming_webhook` のときに必要です。 |
| `TEAMS_GRAPH_ACCESS_TOKEN` | Graph への配信のために先に取得しておく委任アクセストークン。ほとんど不要です。未設定なら、書き込み側は `MSGRAPH_*` のアプリの認証情報に落ちます。 |
| `TEAMS_TEAM_ID` | チャンネルへ配信するときの対象のチーム ID（`graph` モード）。 |
| `TEAMS_CHANNEL_ID` | 対象のチャンネル ID（`TEAMS_TEAM_ID` と組で使います）。 |
| `TEAMS_CHAT_ID` | 対象の 1 対 1 またはグループのチャット ID（`graph` モードでチーム + チャンネルの代わりに使えます）。 |

### LINE Messaging API {#line-messaging-api}

同梱の LINE のプラットフォームのプラグイン（`plugins/platforms/line/`）が使います。設定の全体は [メッセージングのゲートウェイ → LINE](/hermes/docs/user-guide/messaging/line/) をご覧ください。

| 変数 | 説明 |
|----------|-------------|
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Developers Console（Messaging API のタブ）で取得する長期のチャネルアクセストークン。必須です。 |
| `LINE_CHANNEL_SECRET` | チャネルシークレット（Basic settings のタブ）。webhook の HMAC-SHA256 の署名の検証に使います。必須です。 |
| `LINE_HOST` | webhook が待ち受けるホスト（既定: `0.0.0.0`）。 |
| `LINE_PORT` | webhook が待ち受けるポート（既定: `8646`）。 |
| `LINE_PUBLIC_URL` | 公開の HTTPS のベース URL（例: `https://my-tunnel.example.com`）。画像・音声・動画を送るには必須です。LINE は HTTPS で届く URL しか受け付けません。 |
| `LINE_ALLOWED_USERS` | ボットに DM を送れるユーザー ID をカンマ区切りで指定します（`U` で始まります）。 |
| `LINE_ALLOWED_GROUPS` | ボットが応答するグループ ID をカンマ区切りで指定します（`C` で始まります）。 |
| `LINE_ALLOWED_ROOMS` | ボットが応答するルーム ID をカンマ区切りで指定します（`R` で始まります）。 |
| `LINE_ALLOW_ALL_USERS` | 開発時だけの逃げ道です。どの送信元も受け付けます。既定: `false`。 |
| `LINE_HOME_CHANNEL` | `deliver: line` の cron の仕事の既定の配信先。 |
| `LINE_SLOW_RESPONSE_THRESHOLD` | LLM が遅いときにテンプレートボタンのポストバックが出るまでの秒数（既定: `45`）。`0` にすると無効になり、常に Push で返します。 |
| `LINE_PENDING_TEXT` | ポストバックのボタンと一緒に表示される吹き出しの文章。 |
| `LINE_BUTTON_LABEL` | ポストバックのボタンの表示名（既定: `Get answer`）。 |
| `LINE_DELIVERED_TEXT` | すでに届いたポストバックをもう一度押したときの返答（既定: `Already replied ✅`）。 |
| `LINE_INTERRUPTED_TEXT` | `/stop` で取り残されたポストバックのボタンを押したときの返答（既定: `Run was interrupted before completion.`）。 |
| `LINE_EXPIRED_TEXT` | 保存していた答えが無くなった（期限切れ、またはプロセスの状態とともに失われた）ポストバックのボタンを押したときの返答（既定: `That request has expired — send your message again.`）。 |

### ntfy（プッシュ通知） {#ntfy-push-notifications}

[ntfy](https://ntfy.sh/) は HTTP を使った軽いプッシュ通知のサービスです。[ntfy のモバイルアプリ](https://ntfy.sh/docs/subscribe/phone/) から話題を購読し、その話題に投稿するとエージェントと話せます。

| 変数 | 説明 |
|----------|-------------|
| `NTFY_TOPIC` | 購読する話題（受信メッセージ用）。必須です。 |
| `NTFY_SERVER_URL` | サーバーの URL（既定: `https://ntfy.sh`）。プライバシーを重んじるなら、自分で立てた ntfy を指してください。 |
| `NTFY_TOKEN` | 認証トークン（任意）。ベアラートークン（`tk_xyz` など）か、Basic 認証用の `user:pass` です。 |
| `NTFY_PUBLISH_TOPIC` | 送信する返信の話題（既定は `NTFY_TOPIC`）。 |
| `NTFY_MARKDOWN` | `true` にすると、返信に `X-Markdown: true` のヘッダーを付けて送ります。既定: `false`。 |
| `NTFY_ALLOWED_USERS` | 許可リスト（ユーザー ID として扱われますが、ntfy では話題の名前です）。ふつうは `NTFY_TOPIC` と同じ値にします。 |
| `NTFY_ALLOW_ALL_USERS` | 開発時だけの逃げ道です。アクセスが制御された非公開の話題でのみ安全です。既定: `false`。 |
| `NTFY_HOME_CHANNEL` | `deliver: ntfy` の cron の仕事の既定の配信先。 |
| `NTFY_HOME_CHANNEL_NAME` | ホームチャンネルの人向けの名札（既定は話題の名前）。 |

信頼できない話題で使う前に、[ntfy のメッセージングの手引き](/hermes/docs/user-guide/messaging/ntfy/) — とくに **identity model** の節 — をご覧ください。

### IRC {#irc}

Hermes を IRC のサーバーにつなぎます。外部の依存はありません。[IRC のメッセージングの手引き](/hermes/docs/user-guide/messaging/irc/) をご覧ください。

| 変数 | 説明 |
|----------|-------------|
| `IRC_SERVER` | IRC のサーバーのホスト名（例: `irc.libera.chat`）。必須です。 |
| `IRC_CHANNEL` | 参加するチャンネル（例: `#hermes`）。複数はカンマ区切りです。必須です。 |
| `IRC_NICKNAME` | ボットのニックネーム（既定: `hermes-bot`）。必須です。 |
| `IRC_PORT` | サーバーのポート（既定: TLS ありなら `6697`、なしなら `6667`）。 |
| `IRC_USE_TLS` | TLS を使います（`true` / `false`。ポート 6697 では既定で `true`）。 |
| `IRC_SERVER_PASSWORD` | `PASS` コマンド用のサーバーのパスワード（任意）。 |
| `IRC_NICKSERV_PASSWORD` | 接続時に自動で IDENTIFY するための NickServ のパスワード（任意）。 |
| `IRC_ALLOWED_USERS` | ボットと話せるニックネームをカンマ区切りで指定します。 |
| `IRC_ALLOW_ALL_USERS` | チャンネルにいる誰でもボットと話せるようにします（開発時のみ）。 |
| `IRC_HOME_CHANNEL` | cron や通知の配信に使うチャンネル（既定は `IRC_CHANNEL`）。 |

### SimpleX {#simplex}

手元の `simplex-chat` のデーモン経由で、Hermes を [SimpleX Chat](https://simplex.chat/) のネットワークにつなぎます。[SimpleX のメッセージングの手引き](/hermes/docs/user-guide/messaging/simplex/) をご覧ください。

| 変数 | 説明 |
|----------|-------------|
| `SIMPLEX_WS_URL` | simplex-chat のデーモンの WebSocket の URL（例: `ws://127.0.0.1:5225`）。 |
| `SIMPLEX_ALLOWED_USERS` | ボットと話せる SimpleX の連絡先 ID をカンマ区切りで指定します。 |
| `SIMPLEX_ALLOW_ALL_USERS` | どの連絡先でもボットと話せるようにします（開発時のみ。許可リストが無効になります）。 |
| `SIMPLEX_AUTO_ACCEPT` | 届いた連絡先の申請を自動で受け入れます（既定: `true`）。 |
| `SIMPLEX_GROUP_ALLOWED` | ボットが参加する SimpleX のグループ ID をカンマ区切りで指定します。`*` にするとどのグループでも許可します。省くとグループのメッセージを完全に無視します（こちらのほうが安全です。グループにいるボットは、そうでなければメンバー全員のやり取りを処理してしまいます）。 |
| `SIMPLEX_HOME_CHANNEL` | cron や通知の配信に使う既定の連絡先・グループの ID。 |
| `SIMPLEX_HOME_CHANNEL_NAME` | ホームチャンネルの人向けの名札（既定は ID）。 |

### Photon {#photon}

Node の補助プロセス経由で、Hermes を [Photon](https://photon.codes/) / Spectrum（iMessage やその他の Spectrum のプラットフォーム）につなぎます。[Photon のメッセージングの手引き](/hermes/docs/user-guide/messaging/photon/) をご覧ください。

| 変数 | 説明 |
|----------|-------------|
| `PHOTON_PROJECT_ID` | Spectrum のプロジェクト ID（そのプロジェクトの `spectrumProjectId`。`hermes photon setup` が設定します）。 |
| `PHOTON_PROJECT_SECRET` | Spectrum のプロジェクト ID と組になるプロジェクトの秘密（`hermes photon setup` が設定します）。 |
| `PHOTON_ALLOWED_USERS` | ボットと話せる E.164 形式の電話番号をカンマ区切りで指定します。 |
| `PHOTON_ALLOW_ALL_USERS` | どの送信者でもボットを動かせるようにします（開発時のみ。許可リストが無効になります）。 |
| `PHOTON_REQUIRE_MENTION` | ウェイクワードに一致しない限り、グループチャットのメッセージを無視します（`true` / `false`。既定 `false`）。 |
| `PHOTON_MENTION_PATTERNS` | グループチャット用のウェイクワードの正規表現（JSON の並び、またはカンマ / 改行区切り。既定は Hermes のウェイクワード）。 |
| `PHOTON_HOME_CHANNEL` | cron や通知の配信に使う既定の Photon の宛先。Spectrum のスペース ID、DM の GUID、素の E.164 形式の電話番号のいずれかです。 |
| `PHOTON_HOME_CHANNEL_NAME` | ホームチャンネルの人向けの名札。 |
| `PHOTON_MARKDOWN` | エージェントの返信をマークダウンで送ります。iMessage はそのまま表示し、他の Spectrum のプラットフォームではプレーンテキストになります（`true` / `false`。既定 `true`）。 |
| `PHOTON_REACTIONS` | 処理の状態としてメッセージに 👀 / 👍 / 👎 のタップバックを付け、ボットのメッセージへのタップバックをエージェントへ渡します（`true` / `false`。既定 `false`）。 |
| `PHOTON_READ_RECEIPTS` | Hermes へ渡したあと、受信した iMessage を既読にします（`true` / `false`。既定 `true`）。 |
| `PHOTON_TELEMETRY` | 補助プロセスで Spectrum SDK の計測を有効にします（`true` / `false`。既定 `false`。`hermes photon telemetry on|off` で切り替えます）。 |
| `PHOTON_SIDECAR_PORT` | Node の補助プロセスの制御と受信のためのループバックのポート（既定 `8789`）。 |
| `PHOTON_SIDECAR_AUTOSTART` | 接続時に Node の補助プロセスを立ち上げます（`true` / `false`。既定 `true`）。 |
| `PHOTON_NODE_BIN` | node のバイナリのパス（既定: `shutil.which('node')`）。 |
| `PHOTON_DASHBOARD_HOST` | Photon のダッシュボードの API のホスト（既定 `https://app.photon.codes`）。 |
| `PHOTON_SPECTRUM_HOST` | Photon の Spectrum の API のホスト（既定 `https://spectrum.photon.codes`）。 |

### Buzz（Nostr のコミュニティ） {#buzz-nostr-communities}

| 変数 | 説明 |
|----------|-------------|
| `BUZZ_RELAY_URL` | Buzz のコミュニティのリレーのベース URL（例: `https://mycommunity.communities.buzz.xyz`） |
| `BUZZ_PRIVATE_KEY` | エージェントの Buzz での身元のための Nostr の秘密鍵（nsec か 16 進）。Buzz で唯一の秘密です |
| `BUZZ_CREDENTIALS_FILE` | nsec を持つ JSON の認証情報ファイル（`BUZZ_PRIVATE_KEY` が未設定のときの予備） |
| `BUZZ_CHANNELS` | 見張るチャンネルの UUID をカンマ区切りで指定します（既定: 参加しているすべてのチャンネル） |
| `BUZZ_HOME_CHANNEL` | cron や通知の配信に使うチャンネルの UUID（既定は最初に見張っているチャンネル） |
| `BUZZ_ALLOWED_USERS` | エージェントと話せる npub か 16 進の公開鍵をカンマ区切りで指定します |
| `BUZZ_ALLOW_ALL_USERS` | コミュニティのメンバーなら誰でもエージェントと話せるようにします（`true` / `false`） |
| `BUZZ_TRANSPORT` | 受信の経路: `auto`（WebSocket を使い、だめならポーリング。既定）、`websocket`、`poll` |
| `BUZZ_POLL_INTERVAL` | 受信のポーリングの間隔（秒。既定: `4`） |
| `BUZZ_AUTH_TAG` | NIP-42 の WebSocket 認証のための、NIP-OA の所有者証明の認証タグの JSON（任意） |
| `BUZZ_CLI_PATH` | buzz の CLI のバイナリのパス（既定: PATH 上の `buzz`、次に `~/bin/buzz`） |

### Microsoft Teams（アダプタ） {#microsoft-teams-adapter}

Microsoft Teams のプラットフォームのアダプタ（Bot Framework / Azure AD）です。上の [Microsoft Graph（Teams の会議）](#microsoft-graph-teams-meetings) の連携とは別物です。[Teams のメッセージングの手引き](/hermes/docs/user-guide/messaging/teams/) をご覧ください。

| 変数 | 説明 |
|----------|-------------|
| `TEAMS_CLIENT_ID` | Azure AD のアプリケーション（Bot Framework）のクライアント ID。 |
| `TEAMS_CLIENT_SECRET` | Azure AD のアプリケーションのクライアントシークレット。 |
| `TEAMS_TENANT_ID` | ボットのアプリケーションを置く Azure AD のテナント ID。 |
| `TEAMS_HOST` | webhook が待ち受けるホスト（既定: 未設定 → IPv4 と IPv6 の全インターフェース）。 |
| `TEAMS_PORT` | webhook が待ち受けるポート（Bot Framework の既定: `3978`）。 |
| `TEAMS_ALLOWED_USERS` | ボットと話せる Teams のユーザー ID / UPN をカンマ区切りで指定します。 |
| `TEAMS_ALLOW_ALL_USERS` | どの Teams の利用者でもボットを動かせるようにします（開発時のみ）。 |
| `TEAMS_HOME_CHANNEL` | cron や通知の配信に使う既定のチャット・チャンネル ID。 |
| `TEAMS_HOME_CHANNEL_NAME` | Teams のホームチャンネルの表示名。 |

### Raft {#raft}

| 変数 | 説明 |
|----------|-------------|
| `RAFT_PROFILE` | Raft のエージェントのプロファイルの slug。設定するとアダプタが自動で有効になります。 |

### メッセージングの細かい調整 {#advanced-messaging-tuning}

送信メッセージをまとめる仕組みの流量を、プラットフォームごとに調整する上級者向けのつまみです。ほとんどの方は触る必要がありません。既定値は、もたつきを感じさせずに各プラットフォームの上限を守るように決めてあります。

| 変数 | 説明 |
|----------|-------------|
| `HERMES_TELEGRAM_TEXT_BATCH_DELAY_SECONDS` | 溜めた Telegram のテキストの断片を送り出すまでの猶予（既定: `0.6`）。 |
| `HERMES_TELEGRAM_TEXT_BATCH_SPLIT_DELAY_SECONDS` | Telegram のメッセージ 1 通が長さの上限を超えて分割されたとき、断片の間に置く間隔（既定: `2.0`）。 |
| `HERMES_SIMPLEX_TEXT_BATCH_DELAY` | 立て続けに届くテキストのメッセージを 1 つの MessageEvent にまとめるための、静かになるまでの秒数（既定: `0.8`）。Telegram のテキストのまとめ方と同じ考え方です。 |
| `HERMES_TELEGRAM_MEDIA_BATCH_DELAY_SECONDS` | 溜めた Telegram のメディアを送り出すまでの猶予（既定: `0.6`）。 |
| `HERMES_TELEGRAM_FOLLOWUP_GRACE_SECONDS` | エージェントが終えたあと、追いかけのメッセージを送るまでの間隔。最後のストリームの断片と競合しないようにします。 |
| `HERMES_TELEGRAM_HTTP_CONNECT_TIMEOUT` / `_READ_TIMEOUT` / `_WRITE_TIMEOUT` / `_POOL_TIMEOUT` | 下地の `python-telegram-bot` の HTTP の制限時間を上書きします（秒）。 |
| `HERMES_TELEGRAM_INIT_TIMEOUT` | ゲートウェイの起動時、Telegram の `initialize()` の接続の連なりの 1 回あたりの上限（秒）。届かない予備 IP の連なりが起動を延々と止めないようにします（既定: `30`）。 |
| `HERMES_TELEGRAM_HTTP_POOL_SIZE` | Telegram API への同時 HTTP 接続の最大数。 |
| `HERMES_TELEGRAM_DISABLE_FALLBACK_IPS` | DNS が失敗したときに使う、埋め込みの Cloudflare の予備 IP を無効にします（`true` / `false`）。 |
| `HERMES_DISCORD_TEXT_BATCH_DELAY_SECONDS` | 溜めた Discord のテキストの断片を送り出すまでの猶予（既定: `0.6`）。 |
| `HERMES_DISCORD_TEXT_BATCH_SPLIT_DELAY_SECONDS` | Discord のメッセージが長さの上限を超えて分割されたとき、断片の間に置く間隔（既定: `2.0`）。 |
| `HERMES_DISCORD_LIVENESS_INTERVAL_SECONDS` | `discord.websocket_liveness_interval_seconds` の互換・手動での上書き。動いている Discord のゲートウェイの WebSocket を調べる間隔です（既定: `15`。`0` で無効）。`config.yaml` のキーのほうをおすすめします。 |
| `HERMES_DISCORD_LIVENESS_FAILURE_THRESHOLD` | `discord.websocket_liveness_failure_threshold` の互換・手動での上書き。つなぎ直しを強いるまでに、WebSocket の不調が何回続いたら判断するかです（既定: `2`）。`config.yaml` のキーのほうをおすすめします。 |
| `HERMES_MATRIX_TEXT_BATCH_DELAY_SECONDS` / `_SPLIT_DELAY_SECONDS` | Telegram のまとめのつまみの Matrix 版です。 |
| `HERMES_FEISHU_TEXT_BATCH_DELAY_SECONDS` / `_SPLIT_DELAY_SECONDS` / `_MAX_CHARS` / `_MAX_MESSAGES` | Feishu のまとめの調整 — 猶予、分割の間隔、1 通あたりの最大文字数、1 まとまりあたりの最大メッセージ数。 |
| `HERMES_FEISHU_MEDIA_BATCH_DELAY_SECONDS` | Feishu のメディアを送り出すまでの猶予。 |
| `HERMES_FEISHU_DEDUP_CACHE_SIZE` | Feishu の webhook の重複除けのキャッシュの大きさ（既定: `1024`）。 |
| `HERMES_WECOM_TEXT_BATCH_DELAY_SECONDS` / `_SPLIT_DELAY_SECONDS` | WeCom のまとめの調整。 |
| `HERMES_VISION_DOWNLOAD_TIMEOUT` | 画像を視覚モデルへ渡す前に取得するときの制限時間（秒。既定: `30`）。 |
| `HERMES_VISION_MAX_CONCURRENCY` | プロセス全体での、画像の **符号化・拡大縮小** の同時実行の最大数（`auxiliary.vision.max_concurrency` の上書き。既定: ホストの CPU のコア数で、上限はありません）。CPU を使う符号化の段階だけを抑えるので、動画のフレームを一気に処理しても全コアが埋まってイベントループが飢えることはありません。LLM の呼び出しは完全に並行のままです。`< 1` の値は無視されます。 |
| `HERMES_RESTART_DRAIN_TIMEOUT` | ゲートウェイ: `/restart` のとき、動いている処理が終わるのを待つ秒数。これを超えると再起動を強行します（既定: `900`）。 |
| `HERMES_GATEWAY_PLATFORM_CONNECT_TIMEOUT` | ゲートウェイの起動時とつなぎ直しのときの、プラットフォームごとの接続の制限時間（秒。`0` や負の値なら無期限に待ちます）。接続の試行 *と* Discord のアダプタの準備待ちの両方に効くので、同期するスラッシュコマンドが多いアカウントでも起動の途中で打ち切られません。`config.yaml` の `gateway.platform_connect_timeout`（既定 `30`）から渡されます。この環境変数は手動での上書きで、明示的に設定すればこちらが優先されます。 |
| `HERMES_GATEWAY_BUSY_INPUT_MODE` | ゲートウェイが取り込み中に入力を受けたときの既定の扱い: `queue`、`steer`、`interrupt`。有効なプロファイルについては `/busy` で上書きできます。 |
| `HERMES_GATEWAY_BUSY_ACK_ENABLED` | エージェントが取り込み中に利用者が入力したとき、ゲートウェイが受け取りの合図（⚡ / ⏳ / ⏩）を送るかどうか（既定: `true`）。`false` にするとこのメッセージを一切出しません。入力は今までどおり待ち行列に入るか、方向づけになるか、割り込みになります。チャットへの返事だけが静かになります。`config.yaml` の `display.busy_ack_enabled` から渡されます。 |
| `HERMES_GATEWAY_NO_SUPERVISE` | s6-overlay の Docker イメージの中で `hermes gateway run` を動かすとき、自動監視を使わず s6 導入前の前面動作にします（自動再起動なし。ゲートウェイがコンテナの主プロセスになります）。真とみなす値: `1`、`true`、`yes`。CLI の `--no-supervise` フラグと同じです。s6 イメージの外では何も起きません。 |
| `HERMES_GATEWAY_BOOTSTRAP_STATE` | s6-overlay の Docker イメージの中で、まっさらなボリュームでのゲートウェイの **最初の** 監視状態を宣言します。空のボリュームには `gateway_state.json` が残っていないので、起動時の調整役は `gateway-default` の枠を登録しつつ **止まったまま** にします（最後に記録された状態が `running` のときだけ自動で立ち上がります）。ここに `running` を入れると、調整役が動く *前* に初回起動の仕込みが `gateway_state.json` を書くので、いちばん最初の起動からゲートウェイが立ち上がります。`running` という値そのものだけが効きます。初回起動のときだけで、すでにある `gateway_state.json` を上書きすることはないので、意図して止めたゲートウェイは再起動をまたいでも止まったままです。s6 イメージの外では何も起きません。 |
| `GATEWAY_RELAY_URL` | 試験的なリレーコネクタの WebSocket のベース URL。設定すると、ゲートウェイは汎用の `relay` アダプタを登録し、コネクタへ外向きに接続します。`config.yaml` の `gateway.relay_url` に対応します。 |
| `GATEWAY_RELAY_ID` | `hermes gateway enroll` や管理された自己登録で割り当てられる、リレーのゲートウェイの識別子。`gateway.relay_id` に対応します。 |
| `GATEWAY_RELAY_SECRET` | WebSocket の認証に使う、ゲートウェイごとのリレーの秘密。すでに設定してあれば、管理された自己登録は飛ばされます。`gateway.relay_secret` に対応します。 |
| `GATEWAY_RELAY_DELIVERY_KEY` | リレーや素通しの認証の互換のために残してある、コネクタが発行した配信キー。いまのリレーでは、受信メッセージはゲートウェイ側の HTTP の受け口ではなく、外向きの WebSocket に届きます。 |
| `GATEWAY_RELAY_ENROLL_TOKEN` | `--token` を明示しなかったときに `hermes gateway enroll` が使う登録用トークン。 |
| `GATEWAY_RELAY_PLATFORM` | リレーの能力の申告に載せるプラットフォーム名（任意）。 |
| `GATEWAY_RELAY_BOT_ID` | リレーの能力の申告に載せるボットの識別子（任意）。 |
| `GATEWAY_RELAY_ENDPOINT` | コールバックや素通しの URL が必要なコネクタのために申告する、ゲートウェイのエンドポイント（任意）。既定の WebSocket だけで受ける経路では不要です。`gateway.relay_endpoint` に対応します。 |
| `GATEWAY_RELAY_ROUTE_KEYS` | コネクタへ申告するリレーの経路のキーをカンマ区切りで指定します。`gateway.relay_route_keys` に対応します。 |
| `HERMES_FILE_MUTATION_VERIFIER` | ターンごとのファイル変更の確認の脚注を有効にします（既定: `true`）。有効にすると、そのターンで失敗し、あとで成功した書き込みに置き換えられなかった `write_file` / `patch` の呼び出しを Hermes が知らせます。`0`、`false`、`no`、`off` にすると出なくなります。`config.yaml` の `display.file_mutation_verifier` に対応し、環境変数を設定した場合はそちらが優先されます。 |
| `HERMES_CRON_TIMEOUT` | cron の仕事でのエージェントの実行が、何も起きないまま終了するまでの秒数（既定: `600`）。ツールを呼び続けたり、ストリームのトークンを受け取り続けたりしている間は無期限に動けます。止まったときだけ効きます。`0` にすると無制限です。 |
| `HERMES_CRON_SCRIPT_TIMEOUT` | cron の仕事にひも付いた、実行前のスクリプトの制限時間（秒。既定: `3600`）。スクリプトだけを縛るもので、スキルやエージェントの仕事には別枠の `HERMES_CRON_TIMEOUT` が効きます。`config.yaml` の `cron.script_timeout_seconds` でも設定できます。 |
| `HERMES_CRON_MEDIA_SEND_TIMEOUT` | 動いているゲートウェイのアダプタ経由で cron が配信するとき、メディアの添付 1 つあたりの送信の制限時間（秒。既定: `300`）。大きな添付（長い音声、大きな書き出し）のアップロードが間に合わないときは上げてください。`config.yaml` の `cron.media_send_timeout_seconds` でも設定できます。 |
| `HERMES_CRON_MAX_PARALLEL` | 1 回の刻みで並行して動かす cron の仕事の最大数（既定: `4`）。 |

## NeMo Relay {#nemo-relay}

| 変数 | 説明 |
|----------|-------------|
| `HERMES_NEMO_RELAY_PLUGINS_TOML` | Hermes の中核がプロセス全体で読み込む、標準の NeMo Relay の `plugins.toml` の明示的なパス。未設定なら、Hermes は Relay のミドルウェア、動的なプラグイン、書き出しの仕組みを初期化しません。削除された `HERMES_NEMO_RELAY_ATOF_*` と `HERMES_NEMO_RELAY_ATIF_*` は無視されます（これらが残った `.env` からは何も書き出されません）。`hermes update` / `hermes migrate relay` がこれらを `<hermes home>/relay-plugins.toml` へ変換し、この変数を設定します。[移行の注意と完全な例](/hermes/docs/user-guide/features/built-in-plugins/#nemo-relay-native-integration-migration-note) を参照してください。[NeMo Relay の可観測性の設定](https://docs.nvidia.com/nemo/relay/configure-plugins/observability/about) をご覧ください。 |

## エージェントの振る舞い {#agent-behavior}

| 変数 | 説明 |
|----------|-------------|
| `HERMES_MAX_ITERATIONS` | 1 回の会話で許すツール呼び出しの最大回数（既定: 500） |
| `HERMES_INFERENCE_MODEL` | プロセスの水準でモデル名を上書きします（そのセッションでは `config.yaml` より優先されます）。`-m` / `--model` フラグでも設定できます。 |
| `HERMES_YOLO_MODE` | `1` にすると危険なコマンドの承認確認を省きます。`--yolo` と同じです。 |
| `HERMES_ACCEPT_HOOKS` | `config.yaml` に書かれた、まだ見ていないシェルフックを、端末での確認なしに自動で承認します。`--accept-hooks` や `hooks_auto_accept: true` と同じです。 |
| `HERMES_IGNORE_USER_CONFIG` | `~/.hermes/config.yaml` を飛ばして組み込みの既定値を使います（`.env` の認証情報は読み込まれます）。`--ignore-user-config` と同じです。 |
| `HERMES_IGNORE_RULES` | `AGENTS.md`、`SOUL.md`、`.cursorrules`、メモリ、事前読み込みスキルの自動注入をやめます。`--ignore-rules` と同じです。 |
| `HERMES_SAFE_MODE` | 切り分け用のモードです。あらゆる独自設定を無効にし、プラグインの探索、MCP サーバーの読み込み、シェルフックの登録を飛ばします。`--safe-mode`（上の 2 つのフラグも一緒に設定します）が自動で設定します。 |
| `HERMES_TOOL_PROGRESS` | config-v12 を下限とする対応範囲では使えません。この変数は無視されます。`config.yaml` の `display.tool_progress` を使ってください。 |
| `HERMES_TOOL_PROGRESS_MODE` | ツールの進み具合の表示のための、互換性のための非推奨の変数です（ゲートウェイは今も予備として読みます）。`config.yaml` の `display.tool_progress` をおすすめします。 |
| `HERMES_HUMAN_DELAY_MODE` | 応答の間の取り方: `off` / `natural` / `custom` |
| `HERMES_HUMAN_DELAY_MIN_MS` | 独自に決める間の最小値（ミリ秒） |
| `HERMES_HUMAN_DELAY_MAX_MS` | 独自に決める間の最大値（ミリ秒） |
| `HERMES_QUIET` | 必須でない出力を抑えます（`true` / `false`） |
| `CODEX_HOME` | [Codex app-server の実行環境](/hermes/docs/user-guide/features/codex-app-server-runtime/) が有効なとき、Codex CLI が設定と認証情報を読むディレクトリを上書きします（既定: `~/.codex`）。Hermes の移行は、管理下の設定の塊を `<CODEX_HOME>/config.toml` に書きます。 |
| `HERMES_KANBAN_TASK` | かんばんのディスパッチャが作業役を立ち上げるときに設定します（タスクの UUID）。作業役と、そこから立ち上がる `hermes-tools` の MCP の子プロセスがこれを受け継ぐので、かんばんのツールが正しく働きます。手で設定しないでください。 |
| `HERMES_ACP_SKIP_CONFIGURED_MCP` | [ACP のホスト](/hermes/docs/user-guide/features/acp/#host-integration) が、自分で立ち上げる Hermes の子プロセスに設定します。`1` にすると、ACP の JSON-RPC のループに入る前に `config.yaml` で全体に設定された MCP サーバーを起動しません。セッションの MCP サーバーを `session/new` で自分から渡すホストのためのものです。ACP のセッションが渡したサーバーは今までどおり登録されます。他の値なら既定のままです。手で設定しないでください。 |
| `HERMES_API_TIMEOUT` | LLM の API 呼び出しの制限時間（秒。既定: `1800`） |
| `HERMES_API_CALL_STALE_TIMEOUT` | ストリームを使わない呼び出しが止まったとみなすまでの秒数（既定: `90`）。未設定のとき、手元の提供元では自動で無効になり、とても大きな文脈では上へ伸びることがあります。`config.yaml` の `providers.<id>.stale_timeout_seconds` や `providers.<id>.models.<model>.stale_timeout_seconds` でも設定できます。 |
| `HERMES_STREAM_READ_TIMEOUT` | ストリームのソケットの読み取りの制限時間（秒。既定: `120`）。手元の提供元では自動で `HERMES_API_TIMEOUT` まで伸びます。手元の LLM が長いコード生成の途中で切れるなら上げてください。 |
| `HERMES_STREAM_STALE_TIMEOUT` | ストリームが止まったと判断するまでの秒数（既定: `180`）。手元の提供元では自動で無効になります。この時間の間に断片が届かないと接続を切ります。 |
| `HERMES_LOCAL_STREAM_STALE_TIMEOUT` | 手元の提供元（Ollama、oMLX、llama-cpp）で、ストリームが止まったと判断する上限（秒。既定: `900`）。基本の判定が既定のままで、手元のエンドポイントが見つかったときは、これまでの「無期限に無効」の代わりにこの有限の上限が入ります。詰まった手元のサーバーが、永遠に待たされるのではなく、いつかは検出されるようになります。`config.yaml` の `agent.local_stream_stale_timeout` でも設定できます。 |
| `HERMES_STREAM_RETRIES` | 一時的なネットワークのエラーで、ストリームの途中でつなぎ直す回数（既定: `3`）。 |
| `HERMES_STREAM_STALE_GIVEUP` | ターンをまたいだ遮断の仕組みです。応答が 1 つも完了しないまま、止まったとみなす打ち切り（ストリームの有無を問わず）がこの回数続いたら、以後は毎回また待つのではなく、手が打てるエラーを添えてすぐ中断します（既定: `5`。`0` で無効）。応答が完了する、`/model` で切り替える、フォールバックが働く、ターンの初めに主モデルへ戻る、のいずれかで数えは戻ります。 |
| `HERMES_AGENT_TIMEOUT` | ゲートウェイで、動いているエージェントが何もしないまま終了するまでの秒数（既定: `1800`、30 分）。ツールを呼ぶたび、ストリームのトークンが来るたびに数え直します。`0` で無効になります。 |
| `HERMES_GATEWAY_MAX_STARTS` | 立ち上げの嵐を止める仕組みです。この時間の枠の中でゲートウェイの起動が許される最大回数で、超えると指数的に間を空けて嵐を止めます（既定: `5`。`0` で無効）。`config.yaml` の `gateway.respawn_storm.max_starts` でも設定できます。 |
| `HERMES_GATEWAY_START_WINDOW_S` | 立ち上げの嵐を見る時間の枠（秒。既定: `120`）。`config.yaml` の `gateway.respawn_storm.window_seconds` でも設定できます。 |
| `HERMES_STARTUP_WATCHDOG` | `hermes gateway run` の起動時の生存監視。タイムアウトまでにプロセスがイベントループの稼働に達せず、進捗のリースも持たず、CPU の進み具合も見えないときは、全スレッドのスタックを `logs/gateway-startup-watchdog.log` に書き出し、終了コード `75` で終了します。これでサービスの監督役（systemd、s6、Windows のタスク）が再起動します。`0` にすると使いません。`config.yaml` の読み込み自体が監視の時間内に入るため、環境変数でだけ設定します。未設定のときは、`config.yaml` の `gateway.startup_watchdog: false` がこの変数へ橋渡しされます。 |
| `HERMES_STARTUP_WATCHDOG_TIMEOUT_S` | 起動時の生存監視のタイムアウト（秒。既定: `300`）。遅くても生きている段階（state.db のスキーマ移行、修復、構築時のアーカイブ・削除・VACUUM）は自分で進捗のリースを持つので、大きな環境の起動がそれらの段階の *外で* 本当に5分を超える場合（多重化したプロファイルが多い、遅いディスクに数千のスキルがある など）にだけ値を上げてください。未設定のときは、`config.yaml` の `gateway.startup_watchdog_timeout_seconds` から橋渡しされます。 |
| `HERMES_AGENT_TIMEOUT_WARNING` | ゲートウェイ: 何も起きないまま、この秒数が過ぎたら警告のメッセージを送ります（既定: `HERMES_AGENT_TIMEOUT` の 75%）。 |
| `HERMES_AGENT_NOTIFY_INTERVAL` | ゲートウェイ: 長く続くエージェントのターンで、進み具合を知らせる間隔（秒）。 |
| `HERMES_CHECKPOINT_TIMEOUT` | ファイルシステムのチェックポイントを作るときの制限時間（秒。既定: `30`）。 |
| `HERMES_EXEC_ASK` | ゲートウェイのモードで実行の承認確認を有効にします（`true` / `false`） |
| `HERMES_ENABLE_PROJECT_PLUGINS` | エージェントの読み込みとダッシュボードの Web サーバーの両方で、リポジトリ内の `./.hermes/plugins/` にあるプラグインを自動で見つけるようにします。真とみなす値は `1` / `true` / `yes` / `on`（大文字小文字は問いません）です。それ以外は — `0`、`false`、`no`、`off`、空文字も含めて — すべて **無効** として扱われます（既定）。補足: GHSA-5qr3-c538-wm9j（#29156）以降、この変数を有効にしていても、ダッシュボードの Web サーバーはプロジェクトのプラグインの Python の `api` ファイルを自動で読み込みません。プロジェクトのプラグインは静的な JS / CSS で UI を拡張できますが、そのバックエンドの経路は `~/.hermes/plugins/` の下に移したときだけ読み込まれます。 |
| `HERMES_PLUGINS_DEBUG` | `1` / `true` にすると、プラグインの探索の詳しいログが標準エラーに出ます。走査したディレクトリ、解析したマニフェスト、飛ばした理由、解析や `register()` の失敗のトレースバック全文が見えます。プラグインの作者向けです。 |
| `HERMES_BACKGROUND_NOTIFICATIONS` | ゲートウェイでの、裏で動くプロセスの通知の出し方: `concise`（既定）、`all`、`result`、`error`、`off` |
| `HERMES_EPHEMERAL_SYSTEM_PROMPT` | API 呼び出し時に差し込む、その場限りのシステムプロンプト（セッションには残りません） |
| `HERMES_PREFILL_MESSAGES_FILE` | API 呼び出し時に差し込む、その場限りの先出しメッセージの JSON ファイルのパス。 |
| `HERMES_ALLOW_PRIVATE_URLS` | `true` / `false` — ツールが localhost や社内ネットワークの URL を取得できるようにします。ゲートウェイのモードでは既定で無効です。 |
| `HERMES_REDACT_SECRETS` | `true` / `false` — ツールの出力、ログ、チャットの応答での秘密の伏せ字を制御します（既定: `true`）。 |
| `HERMES_WRITE_SAFE_ROOT` | 指定したルートの外への `write_file` / `patch` の書き込みを **完全に止める** ディレクトリの接頭辞（任意。承認の確認は出ません）。`os.pathsep`（Unix なら `:`、Windows なら `;`）で区切って複数のディレクトリを指定できます。下の [HERMES_WRITE_SAFE_ROOT](#hermes_write_safe_root) をご覧ください。 |
| `HERMES_DISABLE_LAZY_INSTALLS` | 公式の Docker イメージで自動的に設定される、内部の橋渡しの変数です。書き換えられない `/opt/hermes` のツリーへ、実行時に依存関係が入るのを防ぎます。利用者向けの同等の設定は `config.yaml` の `security.allow_lazy_installs: false` です。`.env` には書かないでください。 |
| `HERMES_DISABLE_FILE_STATE_GUARD` | `1` にすると、`patch` / `write_file` の「読んだあとにファイルが変わっています」という防御を切ります。 |
| `HERMES_BUNDLED_SKILLS` | 起動時に読み込む同梱スキルの並びを上書きします（カンマ区切り）。 |
| `HERMES_OPTIONAL_SKILLS` | 初回の実行で自動的に入れる、任意のスキルの名前をカンマ区切りで指定します。 |
| `HERMES_DEBUG_INTERRUPT` | `1` か `true` にすると、割り込みと取り消しの詳しい追跡が `agent.log` に出ます。`0`・`false`・`off`（または未設定）なら出力しません。 |
| `HERMES_DUMP_REQUESTS` | API 要求の中身をログファイルに書き出します（`true` / `false`） |
| `HERMES_DUMP_REQUEST_STDOUT` | API 要求の中身を、ログファイルではなく標準出力に書き出します。 |
| `HERMES_OAUTH_TRACE` | `1` にすると、OAuth のトークンの交換と更新の試みがログに出ます。伏せ字にした時間の情報も含みます。 |
| `HERMES_AGENT_HELP_GUIDANCE` | 独自の環境向けに、システムプロンプトへ追加の案内文を足します。 |
| `HERMES_AGENT_LOGO` | CLI の起動時のアスキーアートのロゴを差し替えます。 |
| `DELEGATION_MAX_CONCURRENT_CHILDREN` | `delegate_task` 1 回あたりの並行する子エージェントの最大数（既定: `3`。下限は 1 で、上限はありません）。`config.yaml` の `delegation.max_concurrent_children` でも設定でき、設定ファイルの値が優先されます。 |

### HERMES_WRITE_SAFE_ROOT {#hermes_write_safe_root}

この変数を設定すると、`write_file` と `patch` は、指定したディレクトリの接頭辞の中のパスしか対象にできなくなります。そのルートの外にあるパスは **その場で拒否されます** — 危険なコマンドの承認の仕組みを通らず、上書きするための確認も出ません。

公式の Docker イメージでは `HERMES_HOME=/opt/data` と並べて `HERMES_WRITE_SAFE_ROOT=/opt/data` を設定してあり、エージェントがマウントされたデータのボリュームから出られないようにしています。

**書き込みをサンドボックスに閉じ込めるつもりでない限り、`~/.hermes/.env` に書かないでください。** よくある間違いは、プロジェクトのディレクトリを指しておきながら、エージェントに `~/.hermes/cron/jobs.json` や `~/.hermes/skills/`、プロファイルの下のスクリプトを編集させようとすることです。それらはサンドボックスの外なので、そこへの `write_file` / `patch` はすべて `outside HERMES_WRITE_SAFE_ROOT` のエラーで失敗します。

作業場所と Hermes の状態の両方を許すには、両方の接頭辞を並べてください（順番は問いません）。

```bash
export HERMES_WRITE_SAFE_ROOT=/path/to/project:/home/you/.hermes
```

この変数を消すか `.env` から外すと、ふつうの書き込みに戻ります（認証情報のパスの禁止リストは引き続き効きます。[ファイル書き込みの安全](/hermes/docs/user-guide/security/#file-write-safety) をご覧ください）。

## 画面まわり {#interface}

| 変数 | 説明 |
|----------|-------------|
| `HERMES_TUI` | `1` にすると、従来の CLI ではなく [TUI](/hermes/docs/user-guide/tui/) を起動します。`--tui` を渡すのと同じです。 |
| `HERMES_TUI_DIR` | ビルド済みの `ui-tui/` ディレクトリのパス（`dist/entry.js` と中身の入った `node_modules` が必要です）。ディストリビューションや Nix が、初回起動時の `npm install` を飛ばすために使います。 |
| `HERMES_TUI_RESUME` | 起動時に、ID を指定して TUI のセッションを再開します。設定すると、`hermes --tui` は新しいセッションを作らず、指定されたセッションを引き継ぎます。接続が切れたときや端末が落ちたときに、つなぎ直すのに便利です。 |
| `HERMES_TUI_THEME` | TUI の配色を固定します: `light`、`dark`、または背景色の 6 文字の 16 進そのもの（`ffffff` や `1a1a2e` など）。未設定なら、Hermes は `COLORFGBG` と端末への背景の問い合わせで自動判別します。この変数は、`COLORFGBG` を設定しない端末（Ghostty、Warp、iTerm2 など）での判別を上書きします。 |
| `HERMES_INFERENCE_MODEL` | `config.yaml` を書き換えずに、`hermes -z` / `hermes chat` のモデルを固定します。`--provider` フラグと組で使います。実行ごとに既定のモデルを変える必要のある、スクリプトからの呼び出し（掃除役、CI、まとめ処理）で便利です。 |

## セッションの設定 {#session-settings}

| 変数 | 説明 |
|----------|-------------|
| `HERMES_SESSION_ID` | Hermes が立ち上げる **すべてのツールの子プロセスへ自動的に渡されます**（`terminal`、`execute_code`、常駐シェル、Docker / Singularity のバックエンド、委任した子エージェントの実行）。エージェントがいまのセッション ID を設定するので、ツールから呼ばれる利用者のスクリプトは、自分の出力や計測、副作用を、もとの Hermes のセッションと結び付けられます。**手で設定するべきではありません** — 親のシェルから上書きしても、エージェントの実行の外でしか効かず、エージェントがセッションを始めた瞬間に上書きされます。 |
| `AI_AGENT` | **CLI とゲートウェイの入口が `hermes-agent` に設定し**（外側の仕組みがすでに設定していない場合だけ）、ターミナルのツールのすべてのシェルへ渡されます。リモートのバックエンド（Docker、SSH、Modal、Daytona、Singularity、Vercel）も含みます。子プロセスの帰属を示す、エージェント横断の新しい標準です。汎用の道具（たとえば huggingface_hub のエージェント判定）がこれを読んで、AI エージェントの下で動いていると分かります。値は、公開されているエージェントの仕組みの登録簿にある Hermes の ID と一致します。手で設定しないでください。 |
| `HERMES_AGENT` | **CLI とゲートウェイの入口が `true` に設定し**、ターミナルのツールのすべてのシェルへ渡されるので、子プロセスは自分が Hermes の中で動いていると分かります。手で設定しないでください。 |

## 文脈の圧縮（config.yaml のみ） {#context-compression-configyaml-only}

文脈の圧縮は `config.yaml` だけで設定します。環境変数はありません。しきい値の設定は `compression:` の塊に、要約に使うモデルと提供元は `auxiliary.compression:` の下にあります。

```yaml
compression:
  enabled: true
  threshold: 0.50
  target_ratio: 0.20         # fraction of threshold to preserve as recent tail
  protect_last_n: 20         # minimum recent messages to keep uncompressed
```

:::info 古い設定の移行
`compression.summary_model`、`compression.summary_provider`、`compression.summary_base_url` を持つ古い設定は、最初に読み込まれたときに自動で `auxiliary.compression.*` へ移されます。
:::

## 補助的な処理の上書き {#auxiliary-task-overrides}

| 変数 | 説明 |
|----------|-------------|
| `AUXILIARY_VISION_PROVIDER` | 視覚の処理の提供元を上書きします |
| `AUXILIARY_VISION_MODEL` | 視覚の処理のモデルを上書きします |
| `AUXILIARY_VISION_BASE_URL` | 視覚の処理のための、OpenAI 互換のエンドポイントを直接指定します |
| `AUXILIARY_VISION_API_KEY` | `AUXILIARY_VISION_BASE_URL` と組で使う API キー |

:::note
`AUXILIARY_WEB_EXTRACT_*` の変数はもう使いません。`web_extract` とブラウザの写しは、補助の LLM を使わなくなりました。長いページや写しは決まったやり方で切り詰められ、全文はディスクに置かれて `read_file` でページ送りできます。
:::

処理ごとに直接エンドポイントを指定する場合、Hermes はその処理に設定された API キーか `OPENAI_API_KEY` を使います。独自エンドポイントのために `OPENROUTER_API_KEY` を流用することはありません。

## フォールバックのプロバイダ（config.yaml のみ） {#fallback-providers-configyaml-only}

主モデルのフォールバックの並びは `config.yaml` だけで設定します。環境変数はありません。トップレベルに `provider` と `model` のキーを持つ `fallback_providers` の並びを足すと、主モデルがエラーになったときに自動で切り替わります。提供元が `auto` の補助的な処理も、Hermes の組み込みの補助の探索の並びより先にこの並びを見ます。

```yaml
fallback_providers:
  - provider: openrouter
    model: anthropic/claude-sonnet-4
```

トップレベルに 1 つだけ書く古い `fallback_model` の書き方も後方互換のために読まれますが、新しく書くなら `fallback_providers` を使ってください。処理ごとの補助の方針は `config.yaml` の `auxiliary.<task>.fallback_chain` を使います。こちらに対応する環境変数はありません。

詳しくは [フォールバックプロバイダ](/hermes/docs/user-guide/features/fallback-providers/) をご覧ください。

## プロバイダの振り分け（config.yaml のみ） {#provider-routing-configyaml-only}

これらは `~/.hermes/config.yaml` の `provider_routing` の節に書きます。

| キー | 説明 |
|-----|-------------|
| `sort` | プロバイダの並べ方: `"price"`（既定）、`"throughput"`、`"latency"` |
| `only` | 許可するプロバイダの slug の並び（例: `["anthropic", "google"]`） |
| `ignore` | 飛ばすプロバイダの slug の並び |
| `order` | 順番に試すプロバイダの slug の並び |
| `require_parameters` | 要求のすべての引数に対応しているプロバイダだけを使います（`true` / `false`） |
| `data_collection` | `"allow"`（既定）、またはデータを保存するプロバイダを外すなら `"deny"` |

:::tip
環境変数の設定には `hermes config set` を使ってください。このページにある `UPPER_SNAKE` 形式の名前（ほかの環境変数らしい名前も同じ）はすべて `.env` に保存されます。セットアップの手順が書き込み、実行時に読まれるのと同じファイルで、`config.yaml` に書き込まれることはありません。環境変数の書き込みの拒否リストにある名前（`HERMES_HOME`、`HERMES_YOLO_MODE`、`PATH` など）は受け付けません。ドットで区切った `config.yaml` の設定は `config.yaml` に保存されます。
:::
