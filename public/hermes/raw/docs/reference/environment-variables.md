---
title: "環境変数"
description: "Hermes Agent が使うすべての環境変数の一覧"
upstream_path: reference/environment-variables.md
upstream_blob: a2069f5ae8448c29ed91a8aca20c16ec6ed2cdf9
sources:
  - https://hermes-agent.nousresearch.com/docs/reference/environment-variables
---

# 環境変数の一覧 {#environment-variables-reference}

Hermes は環境変数をプロセスの環境から読みます。利用者が管理する秘密の情報については、`~/.hermes/.env` からも読みます。API キー、ボットのトークン、OAuth の秘密の値、そのほかの認証情報は `.env` に置いてください。秘密ではない振る舞いの設定は、対応する設定の項目があるなら `config.yaml` のほうを使いましょう。下に挙げた変数の中には、そのプロセスだけの一時的な上書きや、内部の橋渡しのための変数もあります。ここに載っているというだけで `.env` に書き込むべきではありません。

## LLM のプロバイダー {#llm-providers}

| 変数 | 説明 |
|----------|-------------|
| `OPENROUTER_API_KEY` | OpenRouter の API キー（柔軟に使えるのでおすすめです） |
| `OPENROUTER_BASE_URL` | OpenRouter 互換のベース URL を上書きします |
| `FIREWORKS_API_KEY` | Fireworks AI の API キー（[app.fireworks.ai](https://app.fireworks.ai/settings/users/api-keys)）。接続先の上書きは `config.yaml` の `model.base_url` で設定します。 |
| `HERMES_OPENROUTER_CACHE` | OpenRouter の応答のキャッシュを有効にします（`1`/`true`/`yes`/`on`）。config.yaml の `openrouter.response_cache` を上書きします。[Response Caching](https://openrouter.ai/docs/guides/features/response-caching) を参照してください。 |
| `HERMES_OPENROUTER_CACHE_TTL` | キャッシュの有効期間を秒で指定します（1〜86400）。config.yaml の `openrouter.response_cache_ttl` を上書きします。 |
| `NOUS_BASE_URL` | Nous Portal のベース URL を上書きします（必要になることはまれです。開発と検証のためのものです） |
| `NOUS_INFERENCE_BASE_URL` | Nous の推論の接続先を直接上書きします |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway の API キー（[ai-gateway.vercel.sh](https://ai-gateway.vercel.sh)） |
| `AI_GATEWAY_BASE_URL` | AI Gateway のベース URL を上書きします（初期値: `https://ai-gateway.vercel.sh/v1`） |
| `OPENAI_API_KEY` | 独自の OpenAI 互換の接続先で使う API キー（`OPENAI_BASE_URL` と組み合わせます） |
| `OPENAI_BASE_URL` | 独自の接続先のベース URL（VLLM、SGLang など） |
| `LM_API_KEY` | LM Studio（`lmstudio` のプロバイダー）の API キー。手元のサーバーでは形だけの値で足りることが多いです |
| `LM_BASE_URL` | LM Studio のベース URL（初期値: `http://localhost:1234/v1`） |
| `COPILOT_GITHUB_TOKEN` | Copilot の API 用の GitHub のトークン — いちばん優先されます（OAuth の `gho_*` か、細かく権限を絞った PAT の `github_pat_*`。従来型の PAT `ghp_*` は**使えません**） |
| `GH_TOKEN` | GitHub のトークン — Copilot では2番目に優先されます（`gh` の CLI も使います） |
| `GITHUB_TOKEN` | GitHub のトークン — Copilot では3番目に優先されます |
| `HERMES_COPILOT_ACP_COMMAND` | Copilot の ACP の CLI のバイナリの場所を上書きします（初期値: `copilot`） |
| `COPILOT_CLI_PATH` | `HERMES_COPILOT_ACP_COMMAND` の別名 |
| `HERMES_COPILOT_ACP_ARGS` | Copilot の ACP に渡す引数を上書きします（初期値: `--acp --stdio`） |
| `COPILOT_ACP_BASE_URL` | Copilot の ACP のベース URL を上書きします |
| `COPILOT_API_BASE_URL` | Copilot の API のベース URL を上書きします（`copilot` のプロバイダー） |
| `GLM_API_KEY` | z.ai / ZhipuAI の GLM の API キー（[z.ai](https://z.ai)） |
| `ZAI_API_KEY` | `GLM_API_KEY` の別名 |
| `Z_AI_API_KEY` | `GLM_API_KEY` の別名 |
| `GLM_BASE_URL` | z.ai のベース URL を上書きします（初期値: `https://api.z.ai/api/paas/v4`） |
| `KIMI_API_KEY` | Kimi / Moonshot AI の API キー（[moonshot.ai](https://platform.moonshot.ai)） |
| `KIMI_CODING_API_KEY` | `kimi-coding` のプロバイダー用の別名のキー（`KIMI_API_KEY` と併せて受け付けます） |
| `KIMI_BASE_URL` | Kimi のベース URL を上書きします（初期値: `https://api.moonshot.ai/v1`） |
| `KIMI_CN_API_KEY` | Kimi / Moonshot の中国向けの API キー（[moonshot.cn](https://platform.moonshot.cn)） |
| `ARCEEAI_API_KEY` | Arcee AI の API キー（[chat.arcee.ai](https://chat.arcee.ai/)） |
| `ARCEE_BASE_URL` | Arcee のベース URL を上書きします（初期値: `https://api.arcee.ai/api/v1`） |
| `GMI_API_KEY` | GMI Cloud の API キー（[gmicloud.ai](https://www.gmicloud.ai/)） |
| `GMI_BASE_URL` | GMI Cloud のベース URL を上書きします（初期値: `https://api.gmi-serving.com/v1`） |
| `ACTUAL_API_KEY` | Actual Computer の推論のキー（`ac_...`、[actual.inc/user/keys](https://actual.inc/user/keys)）。手元のデーモンには不要です。 |
| `ACTUAL_BASE_URL` | Actual Computer のベース URL を上書きします（初期値: `https://api.actual.inc/v1`）。手元のオフラインのデーモンを使うときは `http://127.0.0.1:8080` にします。ループバックのホストには API キーは要りません。 |
| `MINIMAX_API_KEY` | MiniMax の API キー — 全世界向けの接続先（[minimax.io](https://www.minimax.io)）。**`minimax-oauth` では使いません**（OAuth の経路ではブラウザでのログインを使います）。 |
| `MINIMAX_BASE_URL` | MiniMax のベース URL を上書きします（初期値: `https://api.minimax.io/anthropic` — Hermes は MiniMax の Anthropic Messages 互換の接続先を使います）。**`minimax-oauth` では使いません**。 |
| `MINIMAX_CN_API_KEY` | MiniMax の API キー — 中国向けの接続先（[minimaxi.com](https://www.minimaxi.com)）。**`minimax-oauth` では使いません**（OAuth の経路ではブラウザでのログインを使います）。 |
| `MINIMAX_CN_BASE_URL` | MiniMax の中国向けのベース URL を上書きします（初期値: `https://api.minimaxi.com/anthropic`）。**`minimax-oauth` では使いません**。 |
| `KILOCODE_API_KEY` | Kilo Code の API キー（[kilo.ai](https://kilo.ai)） |
| `KILOCODE_BASE_URL` | Kilo Code のベース URL を上書きします（初期値: `https://api.kilo.ai/api/gateway`） |
| `XIAOMI_API_KEY` | Xiaomi MiMo の API キー（[platform.xiaomimimo.com](https://platform.xiaomimimo.com)） |
| `XIAOMI_BASE_URL` | Xiaomi MiMo のベース URL を上書きします（初期値: `https://api.xiaomimimo.com/v1`） |
| `UPSTAGE_API_KEY` | Solar のモデル向けの Upstage の API キー（[console.upstage.ai](https://console.upstage.ai/api-keys)） |
| `UPSTAGE_BASE_URL` | Upstage のベース URL を上書きします（初期値: `https://api.upstage.ai/v1`） |
| `TOKENHUB_API_KEY` | Tencent TokenHub の API キー（[tokenhub.tencentmaas.com](https://tokenhub.tencentmaas.com)） |
| `TOKENHUB_BASE_URL` | Tencent TokenHub のベース URL を上書きします（初期値: `https://tokenhub.tencentmaas.com/v1`） |
| `AZURE_FOUNDRY_API_KEY` | Microsoft Foundry / Azure OpenAI の API キー（[ai.azure.com](https://ai.azure.com/)）。`model.auth_mode: entra_id` のときは不要です |
| `AZURE_FOUNDRY_BASE_URL` | Microsoft Foundry の接続先の URL（OpenAI 形式なら `https://<resource>.openai.azure.com/openai/v1`、Anthropic 形式なら `https://<resource>.services.ai.azure.com/anthropic` のように書きます） |
| `AZURE_ANTHROPIC_KEY` | `provider: anthropic` と、Microsoft Foundry の Claude のデプロイを指す `base_url` を組み合わせるときの Azure Anthropic の API キー（Anthropic と Azure Anthropic の両方を設定しているとき、`ANTHROPIC_API_KEY` の代わりに使えます） |
| `AZURE_TENANT_ID` | Entra ID のテナント ID（サービスプリンシパルの経路で使います。`model.auth_mode: entra_id` のとき `azure-identity` が参照します） |
| `AZURE_CLIENT_ID` | Entra ID のクライアント ID（サービスプリンシパル、ワークロード ID、ユーザー割り当てのマネージド ID） |
| `AZURE_CLIENT_SECRET` | `EnvironmentCredential` が使うサービスプリンシパルの秘密の値 |
| `AZURE_CLIENT_CERTIFICATE_PATH` | サービスプリンシパルの証明書（`AZURE_CLIENT_SECRET` の代わりに使えます） |
| `AZURE_FEDERATED_TOKEN_FILE` | AKS の Workload Identity や OIDC の経路で使う、連携トークンのファイルの場所 |
| `AZURE_AUTHORITY_HOST` | 各国向けのクラウドの認証局を上書きします（Azure Government なら `https://login.microsoftonline.us` など）。[Azure Foundry の案内](/hermes/docs/guides/azure-foundry/#sovereign-clouds-government-china)を参照してください |
| `IDENTITY_ENDPOINT` / `MSI_ENDPOINT` | App Service、Functions、Container Apps でのマネージド ID の接続先。仮想マシンはふつう IMDS を使うので、これらは設定しません |
| `HF_TOKEN` | Inference Providers 向けの Hugging Face のトークン（[huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)） |
| `HF_BASE_URL` | Hugging Face のベース URL を上書きします（初期値: `https://router.huggingface.co/v1`） |
| `GOOGLE_API_KEY` | Google AI Studio の API キー（[aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)） |
| `GEMINI_API_KEY` | `GOOGLE_API_KEY` の別名 |
| `GEMINI_BASE_URL` | Google AI Studio のベース URL を上書きします |
| `VERTEX_CREDENTIALS_PATH` | Vertex AI（Gemini）向けの Google Cloud のサービスアカウントの JSON の場所。Vertex は固定の API キーではなく OAuth2 を使います。指定がなければ `GOOGLE_APPLICATION_CREDENTIALS`、それもなければ ADC（`gcloud auth application-default login`）に落ちます。プロジェクトとリージョンは `config.yaml` の `vertex:` の下で設定します |
| `ANTHROPIC_API_KEY` | Anthropic Console の API キー（[console.anthropic.com](https://console.anthropic.com/)） |
| `ANTHROPIC_BASE_URL` | Anthropic の API のベース URL を上書きします |
| `ANTHROPIC_TOKEN` | Anthropic の OAuth や設定用トークンを、手動または従来の形で上書きします |
| `DASHSCOPE_API_KEY` | Qwen のモデル向けの Qwen Cloud（Alibaba DashScope）の API キー（[modelstudio.console.alibabacloud.com](https://modelstudio.console.alibabacloud.com/)） |
| `DASHSCOPE_BASE_URL` | DashScope のベース URL を自分で指定します（初期値: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`。中国本土のリージョンでは `https://dashscope.aliyuncs.com/compatible-mode/v1` を使います） |
| `ALIBABA_CODING_PLAN_API_KEY` | Qwen Coding Plan の API キー（`alibaba-coding-plan` のプロバイダー） |
| `ALIBABA_CODING_PLAN_BASE_URL` | Qwen Coding Plan のベース URL を上書きします |
| `DEEPSEEK_API_KEY` | DeepSeek に直接つなぐための API キー（[platform.deepseek.com](https://platform.deepseek.com/api_keys)） |
| `DEEPSEEK_BASE_URL` | DeepSeek の API のベース URL を自分で指定します |
| `DEEPINFRA_API_KEY` | DeepInfra の API キー（[deepinfra.com](https://deepinfra.com/dash/api_keys)） |
| `DEEPINFRA_BASE_URL` | DeepInfra のベース URL の上書き |
| `NOVITA_API_KEY` | NovitaAI の API キー — Model API、Agent Sandbox、GPU Cloud を備えた AI 向けのクラウドです（[novita.ai/settings/key-management](https://novita.ai/settings/key-management)） |
| `NOVITA_BASE_URL` | NovitaAI のベース URL を上書きします（初期値: `https://api.novita.ai/openai/v1`） |
| `NVIDIA_API_KEY` | NVIDIA NIM の API キー — Nemotron と公開モデル向けです（[build.nvidia.com](https://build.nvidia.com)） |
| `NVIDIA_BASE_URL` | NVIDIA のベース URL を上書きします（初期値: `https://integrate.api.nvidia.com/v1`。手元の NIM の接続先を使うときは `http://localhost:8000/v1` にします） |
| `STEPFUN_API_KEY` | StepFun の API キー — Step 系列のモデル向けです（[platform.stepfun.com](https://platform.stepfun.com)） |
| `STEPFUN_BASE_URL` | StepFun のベース URL を上書きします（初期値: `https://api.stepfun.com/v1`） |
| `OLLAMA_API_KEY` | Ollama Cloud の API キー — 手元に GPU がなくても使える、運用込みの Ollama のモデル群です（[ollama.com/settings/keys](https://ollama.com/settings/keys)） |
| `OLLAMA_BASE_URL` | Ollama Cloud のベース URL を上書きします（初期値: `https://ollama.com/v1`） |
| `XAI_API_KEY` | xAI（Grok）の API キー。チャット、読み上げ、ウェブ検索に使います（[console.x.ai](https://console.x.ai/)） |
| `XAI_BASE_URL` | xAI のベース URL を上書きします（初期値: `https://api.x.ai/v1`） |
| `MISTRAL_API_KEY` | Voxtral の読み上げと文字起こしのための Mistral の API キー（[console.mistral.ai](https://console.mistral.ai)） |
| `AWS_REGION` | Bedrock で推論するときの AWS のリージョン（`us-east-1`、`eu-central-1` など）。boto3 が読みます。 |
| `AWS_PROFILE` | Bedrock の認証に使う AWS の名前付きプロファイル（`~/.aws/credentials` を読みます）。設定しなければ boto3 の既定の認証の流れを使います。 |
| `BEDROCK_BASE_URL` | Bedrock の実行環境のベース URL を上書きします（初期値: `https://bedrock-runtime.us-east-1.amazonaws.com`。ふつうは設定せず、`AWS_REGION` を使ってください） |
| `HERMES_QWEN_BASE_URL` | Qwen Portal のベース URL の上書き（初期値: `https://portal.qwen.ai/v1`） |
| `OPENCODE_ZEN_API_KEY` | OpenCode Zen の API キー — 選び抜かれたモデルを使った分だけ払う形で使えます（[opencode.ai](https://opencode.ai/auth)） |
| `OPENCODE_ZEN_BASE_URL` | OpenCode Zen のベース URL を上書きします |
| `OPENCODE_GO_API_KEY` | OpenCode Go の API キー — 公開モデルを月10ドルで使える形です（[opencode.ai](https://opencode.ai/auth)） |
| `OPENCODE_GO_BASE_URL` | OpenCode Go のベース URL を上書きします |
| `CLAUDE_CODE_OAUTH_TOKEN` | 自分で書き出した Claude Code のトークンで明示的に上書きします |
| `HERMES_MODEL` | モデル名をプロセスの単位で上書きします（cron の予定実行が使います。ふだんは `config.yaml` のほうを使ってください） |
| `VOICE_TOOLS_OPENAI_KEY` | OpenAI の文字起こしと読み上げのプロバイダーで優先して使う OpenAI のキー |
| `HERMES_LOCAL_STT_COMMAND` | 手元で文字起こしをするコマンドのひな形（任意）。`{input_path}`、`{output_dir}`、`{language}`、`{model}` の置き換えに対応します |
| `HERMES_LOCAL_STT_LANGUAGE` | 文字起こしの言語の既定の手がかり。`config.yaml` にプロバイダーごとの `language` が書かれていないとき、`local`（faster-whisper）のプロバイダー、`HERMES_LOCAL_STT_COMMAND`、手元の `whisper` の CLI への切り替え（初期値: `en`）、Groq、xAI が使います |
| `HERMES_HOME` | Hermes の設定のディレクトリを上書きします（初期値: `~/.hermes`）。ゲートウェイの PID のファイルや systemd のサービス名の範囲も分けるので、複数のインストールを同時に動かせます |
| `HERMES_GIT_BASH_PATH` | **Windows 専用。** ターミナルのツールが探す `bash.exe` を上書きします。どの bash でも指定できます — Git for Windows の完全な導入、シンボリックリンク経由の WSL の bash、MSYS2、Cygwin。インストーラーは、自分で用意した PortableGit をここに自動で設定します。[Windows（ネイティブ）の案内](/hermes/docs/user-guide/windows-native/#how-hermes-runs-shell-commands-on-windows)を参照してください |
| `HERMES_DISABLE_WINDOWS_UTF8` | **Windows 専用。** `1` にすると UTF-8 の標準入出力の下ごしらえ（`configure_windows_stdio()`）を止め、コンソールのロケールのコードページに戻します。文字化けの不具合を切り分けるときに役立ちますが、ふだんの運用で正しい設定であることはまずありません |
| `HERMES_KANBAN_HOME` | カンバンの盤（データベース、作業場所、ワーカーのログ）が置かれる、共有の Hermes の根元を上書きします。指定がなければ `get_default_hermes_root()`（動いているプロファイルの親）に落ちます。テストや変わった構成で役に立ちます |
| `HERMES_KANBAN_BOARD` | このプロセスで使うカンバンの盤を固定します。`~/.hermes/kanban/current` より優先されます。振り分け役はこれをワーカーの子プロセスの環境に差し込むので、ワーカーはほかの盤の作業を物理的に見られません。初期値は `default` です。名前の決まりは、小文字の英数字とハイフンとアンダースコアで1〜64文字です |
| `HERMES_KANBAN_DB` | カンバンのデータベースのファイルの場所を直接固定します（いちばん優先されます。`HERMES_KANBAN_BOARD` と `HERMES_KANBAN_HOME` より強いです）。振り分け役はこれをワーカーの子プロセスの環境に差し込むので、プロファイルのワーカーは振り分け役の盤に集まります |
| `HERMES_KANBAN_WORKSPACES_ROOT` | カンバンの作業場所の根元を直接固定します（作業場所についてはいちばん優先されます。`HERMES_KANBAN_HOME` より強いです）。振り分け役はこれをワーカーの子プロセスの環境に差し込みます |
| `HERMES_KANBAN_DISPATCH_IN_GATEWAY` | `kanban.dispatch_in_gateway` を実行時に上書きします。`0`、`false`、`no`、`off` にすると、ゲートウェイが組み込みのカンバンの振り分け役を起動しなくなります。それ以外の空でない値では有効になります。別の振り分け役のプロセスが盤を持っているときに役立ちます。 |

## プロバイダーの認証（OAuth） {#provider-auth-oauth}

Anthropic 本来の認証については、Claude Code 自身の認証情報のファイルがあれば Hermes はそちらを優先します。そのほうが自動で更新されるからです。**Anthropic に対する OAuth には、追加の利用枠を買った Claude Max のプランが必要です** — Hermes は Claude Code として通信し、Max のプランの基本の枠ではなく追加分・超過分の枠だけを使います。Claude Pro では動きません。Max と追加の枠がないなら、API キーを使ってください。`ANTHROPIC_TOKEN` のような環境変数は手動の上書きとして今も役に立ちますが、Claude Max でのログインについては、もう優先される道ではありません。

| 変数 | 説明 |
|----------|-------------|
| `HERMES_PORTAL_BASE_URL` | Nous Portal の URL を上書きします（開発と検証のためのものです） |
| `NOUS_INFERENCE_BASE_URL` | Nous の推論の API の URL を上書きします |
| `HERMES_NOUS_MIN_KEY_TTL_SECONDS` | エージェントのキーを作り直す前の、最短の有効期間（初期値: 1800 = 30分） |
| `HERMES_NOUS_TIMEOUT_SECONDS` | Nous の認証情報やトークンのやり取りの HTTP の待ち時間の上限 |
| `HERMES_DUMP_REQUESTS` | API のリクエストの中身をログのファイルへ書き出します（`true`/`false`） |
| `HERMES_PREFILL_MESSAGES_FILE` | API を呼ぶときに差し込む、その場かぎりの前置きのメッセージを収めた JSON ファイルの場所 |
| `HERMES_TIMEZONE` | IANA のタイムゾーンで上書きします（たとえば `America/New_York`） |

## ツールの API {#tool-apis}

| 変数 | 説明 |
|----------|-------------|
| `PARALLEL_API_KEY` | AI 向けに作られたウェブ検索（[parallel.ai](https://parallel.ai/)） |
| `FIRECRAWL_API_KEY` | ウェブページの取り込みと、クラウド上のブラウザ（[firecrawl.dev](https://firecrawl.dev/)） |
| `FIRECRAWL_API_URL` | 自分で立てた Firecrawl の接続先を指定します（任意） |
| `TAVILY_API_KEY` | 検索と抽出の上限を上げるための Tavily の API キー（任意）。ウェブのバックエンドとして Tavily を選んだあとは、キーなしでも使えます（[app.tavily.com](https://app.tavily.com/home)、[キーなしの説明](https://docs.tavily.com/documentation/keyless)） |
| `SEARXNG_URL` | 自分で立てて無料で使えるウェブ検索、SearXNG のインスタンスの URL — API キーは不要です（[searxng.github.io](https://searxng.github.io/searxng/)） |
| `TAVILY_BASE_URL` | Tavily の API の接続先を上書きします。会社のプロキシや、自分で立てた Tavily 互換の検索のバックエンドで役に立ちます。`GROQ_BASE_URL` と同じ考え方です。 |
| `EXA_API_KEY` | AI 向けに作られたウェブ検索と本文取得のための Exa の API キー（[exa.ai](https://exa.ai/)） |
| `BRAVE_SEARCH_API_KEY` | ウェブ検索のための Brave Search API の利用トークン（無料の枠があります）（[brave.com/search/api](https://brave.com/search/api/)） |
| `BROWSERBASE_API_KEY` | ブラウザの自動操作（[browserbase.com](https://browserbase.com/)） |
| `BROWSERBASE_PROJECT_ID` | Browserbase のプロジェクト ID |
| `BROWSER_USE_API_KEY` | Browser Use のクラウド上のブラウザの API キー（[browser-use.com](https://browser-use.com/)） |
| `FIRECRAWL_BROWSER_TTL` | Firecrawl のブラウザのセッションの有効期間を秒で指定します（初期値: 300） |
| `BROWSER_CDP_URL` | 手元のブラウザの Chrome DevTools Protocol の URL（`/browser connect` で設定します。たとえば `ws://localhost:9222`） |
| `CAMOFOX_URL` | 検出を避ける手元のブラウザのサーバー、Camofox のアドレス（初期値: `http://localhost:9377`）。あくまでアドレスの指定で、これで Camofox がバックエンドに選ばれるわけではありません。`hermes tools` で Camofox を選んでください（`browser.cloud_provider: camofox`） |
| `CAMOFOX_API_KEY` | リモートや認証つきの Camofox のサーバーへ Authorization ヘッダーとして送る、任意のトークン |
| `CAMOFOX_USER_ID` | 共有の見えるセッションのための、外部で管理する Camofox のユーザー ID（任意） |
| `CAMOFOX_SESSION_KEY` | `CAMOFOX_USER_ID` のためにタブを作るときに使う、Camofox のセッションのキー（任意） |
| `CAMOFOX_ADOPT_EXISTING_TAB` | `true` にすると、新しいタブを作る前に、すでにある Camofox のタブを使い回します |
| `BROWSER_INACTIVITY_TIMEOUT` | ブラウザのセッションが使われないまま終了するまでの秒数 |
| `AGENT_BROWSER_ARGS` | Chromium を起動するときの追加のフラグ（カンマか改行で区切ります）。root で動いている場合や、AppArmor が制限する非特権のユーザー名前空間（Ubuntu 23.10 以降、DGX Spark、多くのコンテナのイメージ）では、Hermes が `--no-sandbox,--disable-dev-shm-usage` を自動で足します。これを手で設定するのは、それを上書きしたいときや、ほかのフラグを足したいときだけにしてください。 |
| `AGENT_BROWSER_ENGINE` | 手元で動かすときのブラウザのエンジン。`auto`（初期値 — CDP 経由の Chromium 系）か、特定のエンジンの指定です。 |
| `FAL_KEY` | 画像の生成（[fal.ai](https://fal.ai/)） |
| `KREA_API_KEY` | Krea 2 で画像を生成するための Krea の API キー（[krea.ai](https://krea.ai/)） |
| `GROQ_API_KEY` | Groq の Whisper による文字起こしの API キー（[groq.com](https://groq.com/)） |
| `ELEVENLABS_API_KEY` | ElevenLabs の上位の読み上げの声（[elevenlabs.io](https://elevenlabs.io/)） |
| `PORCUPINE_ACCESS_KEY` | Picovoice Porcupine の呼びかけの言葉の認識エンジン（[console.picovoice.ai](https://console.picovoice.ai/)） — `wake_word.provider: porcupine` のときだけ必要です。初期値の openWakeWord と sherpa のエンジンにキーは要りません |
| `STT_GROQ_MODEL` | Groq の文字起こしのモデルを上書きします（初期値: `whisper-large-v3-turbo`） |
| `GROQ_BASE_URL` | Groq の OpenAI 互換の文字起こしの接続先を上書きします |
| `STT_OPENAI_MODEL` | OpenAI の文字起こしのモデルを上書きします（初期値: `whisper-1`） |
| `STT_OPENAI_BASE_URL` | OpenAI 互換の文字起こしの接続先を上書きします |
| `GITHUB_TOKEN` | Skills Hub 用の GitHub のトークン（API の回数の上限が上がり、スキルを公開できます） |
| `HONCHO_API_KEY` | セッションをまたいだ利用者の理解（[honcho.dev](https://honcho.dev/)） |
| `HONCHO_BASE_URL` | 自分で立てた Honcho のインスタンスのベース URL（初期値: Honcho のクラウド）。手元のインスタンスに API キーは要りません |
| `HINDSIGHT_API_KEY` | グラフを意識した、残り続ける記憶のための Hindsight の API キー（[hindsight.vectorize.io](https://hindsight.vectorize.io)） |
| `HINDSIGHT_API_URL` | Hindsight の API のベース URL（初期値: `https://api.hindsight.vectorize.io`） |
| `HINDSIGHT_TIMEOUT` | Hindsight の記憶のプロバイダーへの API の呼び出しの待ち時間の上限を秒で指定します（初期値: `60`）。`/sync` や `on_session_switch` のときに Hindsight のインスタンスの応答が遅く、`errors.log` に待ち時間切れが出ているなら、この値を上げてください。 |
| `MEM0_API_KEY` | 意味を捉えて残り続ける記憶のための Mem0 Platform の API キー（[app.mem0.ai](https://app.mem0.ai)） |
| `MEM0_MODE` | Mem0 のバックエンドの動き方: `platform`（初期値）か `oss` — [記憶のプロバイダー](/hermes/docs/user-guide/features/memory-providers/)を参照してください |
| `MEM0_HOST` | 自分で立てた Mem0 のサーバーのベース URL（これを設定すると、プラグインは Platform の API を使わなくなります） |
| `MEM0_USER_ID` | Mem0 の記憶を保存するときの利用者の id を上書きします |
| `MEM0_AGENT_ID` | Mem0 の記憶に付けるエージェントの id を上書きします |
| `RETAINDB_API_KEY` | 残り続ける記憶のための RetainDB の API キー（[retaindb.com](https://retaindb.com)） |
| `RETAINDB_BASE_URL` | 自分で立てた RetainDB のインスタンスのベース URL（初期値: `https://api.retaindb.com`） |
| `OPENVIKING_API_KEY` | OpenViking の API キー（手元の開発用の動きにするときは空のままにします） |
| `OPENVIKING_ENDPOINT` | OpenViking のサーバーの URL（初期値: `http://127.0.0.1:1933`） |
| `BRV_API_KEY` | ByteRover の API キー（任意。クラウドと同期するときに使います。初期状態では手元が中心です）（[app.byterover.dev](https://app.byterover.dev)） |
| `SUPERMEMORY_API_KEY` | 人物像の呼び出しとセッションの取り込みを備えた、意味を捉える長期の記憶（[supermemory.ai](https://supermemory.ai)） |
| `DAYTONA_API_KEY` | Daytona のクラウド上のサンドボックス（[daytona.io](https://daytona.io/)） |
| `VERCEL_TOKEN` | Vercel Sandbox の利用トークン（[vercel.com](https://vercel.com/)） |
| `VERCEL_PROJECT_ID` | Vercel のプロジェクト ID（`VERCEL_TOKEN` と一緒に必要です） |
| `VERCEL_TEAM_ID` | Vercel のチーム ID（`VERCEL_TOKEN` と一緒に必要です） |
| `VERCEL_OIDC_TOKEN` | Vercel の短命な OIDC のトークン（開発時にだけ使える代わりの手段） |

### スキルの API キー {#skill-api-keys}

同梱や任意のスキルが使う秘密の情報です。それぞれ、対応するスキルを使うときにだけ必要になります。

| 変数 | 使うスキル | 説明 |
|----------|---------------|-------------|
| `NOTION_API_KEY` | `notion` | Notion の連携用トークン。 |
| `LINEAR_API_KEY` | `linear` | Linear の個人の API キー。 |
| `AIRTABLE_API_KEY` | `airtable` | Airtable の個人用アクセストークン。 |
| `TENOR_API_KEY` | `gif-search` | GIF を検索するための Tenor の API キー。 |

### Langfuse による可観測性 {#langfuse-observability}

同梱の [`observability/langfuse`](/hermes/docs/user-guide/features/built-in-plugins/#observabilitylangfuse) プラグインのための環境変数です。`~/.hermes/.env` に設定してください。これらが効くようになるには、プラグインを有効にしておく必要もあります（`hermes plugins enable observability/langfuse` を実行するか、`hermes plugins` でチェックを入れます）。

| 変数 | 説明 |
|----------|-------------|
| `HERMES_LANGFUSE_PUBLIC_KEY` | Langfuse のプロジェクトの公開キー（`pk-lf-...`）。必須です。 |
| `HERMES_LANGFUSE_SECRET_KEY` | Langfuse のプロジェクトの秘密のキー（`sk-lf-...`）。必須です。 |
| `HERMES_LANGFUSE_BASE_URL` | Langfuse のサーバーの URL（初期値: `https://cloud.langfuse.com`）。自分で立てた場合に設定します。 |
| `HERMES_LANGFUSE_ENV` | 記録に付ける環境の名札（`production`、`staging` など） |
| `HERMES_LANGFUSE_RELEASE` | 記録に付ける版やバージョンの名札 |
| `HERMES_LANGFUSE_SAMPLE_RATE` | SDK の抽出の割合。0.0〜1.0（初期値: `1.0`） |
| `HERMES_LANGFUSE_MAX_CHARS` | 書き出す中身の、項目ごとの文字数の上限（初期値: `12000`） |
| `HERMES_LANGFUSE_DEBUG` | `true` にすると、プラグインの詳しいログが `agent.log` に出ます |
| `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` / `LANGFUSE_BASE_URL` | Langfuse の SDK が使う標準の名前です。`HERMES_LANGFUSE_*` のほうが設定されていないとき、代わりに受け付けます。 |

### Nous のツールのゲートウェイ {#nous-tool-gateway}

これらの変数は、Nous の有料の利用者や、自分で立てたゲートウェイのために [ツールのゲートウェイ](/hermes/docs/user-guide/features/tool-gateway/)を設定するものです。ほとんどの人には必要ありません — ゲートウェイは `hermes model` や `hermes tools` から自動で設定されます。

| 変数 | 説明 |
|----------|-------------|
| `TOOL_GATEWAY_DOMAIN` | ツールのゲートウェイの振り分けに使うドメイン（初期値: `nousresearch.com`） |
| `TOOL_GATEWAY_SCHEME` | ゲートウェイの URL のスキーム。HTTP か HTTPS です（初期値: `https`） |
| `TOOL_GATEWAY_USER_TOKEN` | ツールのゲートウェイの認証トークン（ふつうは Nous の認証から自動で入ります） |
| `FIRECRAWL_GATEWAY_URL` | Firecrawl のゲートウェイの接続先だけを上書きします |

## ターミナルのバックエンド {#terminal-backend}

| 変数 | 説明 |
|----------|-------------|
| `TERMINAL_ENV` | バックエンド: `local`、`docker`、`ssh`、`singularity`、`modal`、`daytona`、`vercel_sandbox` |
| `HERMES_DOCKER_BINARY` | Hermes が呼び出すコンテナのバイナリを上書きします（`podman`、`/usr/local/bin/docker` など）。設定しなければ、Hermes は `PATH` から `docker` か `podman` を自動で探します。両方入っていて既定でないほうを使いたいときや、バイナリが `PATH` の外にあるときに必要です。 |
| `TERMINAL_DOCKER_IMAGE` | Docker のイメージ（初期値: `nikolaik/python-nodejs:python3.11-nodejs20`） |
| `TERMINAL_DOCKER_FORWARD_ENV` | Docker のターミナルのセッションへ明示的に渡す環境変数の名前を並べた JSON の配列。なお、スキルが宣言した `required_environment_variables` は自動で渡されるので、どのスキルも宣言していない変数のときだけ必要です。 |
| `TERMINAL_DOCKER_VOLUMES` | Docker のボリュームの追加のマウント（`host:container` の組をカンマで区切ります） |
| `TERMINAL_DOCKER_ENV` | Docker のターミナルのセッションの中で設定する、追加の環境変数の JSON のオブジェクト（たとえば `{"FOO":"bar"}`） |
| `TERMINAL_DOCKER_EXTRA_ARGS` | `docker run` に足す引数の JSON の配列（たとえば `["--memory","4g"]`） |
| `TERMINAL_DOCKER_MOUNT_CWD_TO_WORKSPACE` | 分かったうえで有効にする設定です。起動したときの作業ディレクトリを Docker の `/workspace` にマウントします（`true`/`false`、初期値: `false`） |
| `TERMINAL_SINGULARITY_IMAGE` | Singularity のイメージか `.sif` の場所 |
| `TERMINAL_MODAL_IMAGE` | Modal のコンテナのイメージ |
| `TERMINAL_DAYTONA_IMAGE` | Daytona のサンドボックスのイメージ |
| `TERMINAL_VERCEL_RUNTIME` | Vercel Sandbox の実行環境（`node24`、`node22`、`python3.13`） |
| `TERMINAL_TIMEOUT` | コマンドの待ち時間の上限を秒で指定します |
| `TERMINAL_LIFETIME_SECONDS` | ターミナルのセッションが生きていられる最長の秒数 |
| `TERMINAL_CWD` | ゲートウェイや cron のターミナルのセッションを直接上書きする、非推奨の設定です。`config.yaml` の `terminal.cwd` を使ってください。CLI は今も起動したディレクトリを使います。 |
| `SUDO_PASSWORD` | 対話で聞かれることなく sudo を使えるようにします |

クラウドのサンドボックスのバックエンドでは、残るのはファイルシステムです。`TERMINAL_LIFETIME_SECONDS` は、使われていないターミナルのセッションを Hermes がいつ片付けるかを決めます。あとで再開したときは、同じプロセスが動き続けているのではなく、サンドボックスが作り直されることがあります。

## SSH のバックエンド {#ssh-backend}

| 変数 | 説明 |
|----------|-------------|
| `TERMINAL_SSH_HOST` | リモートのサーバーのホスト名 |
| `TERMINAL_SSH_USER` | SSH のユーザー名 |
| `TERMINAL_SSH_PORT` | SSH のポート（初期値: 22） |
| `TERMINAL_SSH_KEY` | 秘密鍵の場所 |
| `TERMINAL_SSH_PERSISTENT` | SSH で使うシェルを残す設定を上書きします（初期値: `TERMINAL_PERSISTENT_SHELL` に従います） |

## コンテナの資源（Docker、Singularity、Modal、Daytona） {#container-resources-docker-singularity-modal-daytona}

| 変数 | 説明 |
|----------|-------------|
| `TERMINAL_CONTAINER_CPU` | CPU のコア数（初期値: 1） |
| `TERMINAL_CONTAINER_MEMORY` | メモリ（MB 単位。初期値: 5120） |
| `TERMINAL_CONTAINER_DISK` | ディスク（MB 単位。初期値: 51200） |
| `TERMINAL_CONTAINER_PERSISTENT` | セッションをまたいでコンテナのファイルシステムを残します（初期値: `true`） |
| `TERMINAL_SANDBOX_DIR` | 作業場所と重ね合わせを置くホスト側のディレクトリ（初期値: `~/.hermes/sandboxes/`） |

## 残り続けるシェル {#persistent-shell}

| 変数 | 説明 |
|----------|-------------|
| `TERMINAL_PERSISTENT_SHELL` | 手元以外のバックエンドで、シェルを残したままにします（初期値: `true`）。config.yaml の `terminal.persistent_shell` でも設定できます |
| `TERMINAL_LOCAL_PERSISTENT` | 手元のバックエンドで、シェルを残したままにします（初期値: `false`） |
| `TERMINAL_SSH_PERSISTENT` | SSH のバックエンドで、シェルを残す設定を上書きします（初期値: `TERMINAL_PERSISTENT_SHELL` に従います） |

## 外向き通信のプロキシ（サンドボックスに差し込まれます） {#egress-proxy-sandbox-injected}

これらの環境変数はホストには設定されません。`proxy.enabled: true` のとき、[外向き通信のプロキシ](/hermes/docs/user-guide/egress/iron-proxy/)の連携が Docker のサンドボックスの中に差し込むものです。この版でつながっているバックエンドは Docker だけです。

| 変数 | 説明 |
|----------|-------------|
| `HERMES_EGRESS_PROXY` | 外向き通信のプロキシが働いているとき、サンドボックスの中で `1` になります。エージェントのコードは、これを見れば TLS を解いて中継するプロキシの後ろで動いていると分かります。 |
| プロバイダーの環境変数（`OPENROUTER_API_KEY`、`OPENAI_API_KEY` など） | 本物の上流の秘密の値ではなく、中身の見えないプロキシ用のトークンが入ります。そのため、既存の SDK は標準の環境変数の名前をそのまま読み続けられます。iron-proxy がネットワークの境界で、そのトークンを本物の上流の秘密の値に差し替えます。 |
| `HERMES_PROXY_TOKEN_<ENV_NAME>` | 作られたプロバイダーごとの対応を確かめるための別名です。たとえば `HERMES_PROXY_TOKEN_OPENROUTER_API_KEY=hermes-proxy-openrouter-…` のようになります。トークンの値は標準のプロバイダーの環境変数と同じです。 |
| `HTTPS_PROXY` / `HTTP_PROXY` | `HTTPS_PROXY` は CONNECT と中継のために `http://host.docker.internal:<tunnel_port>` を指します。`HTTP_PROXY` は、暗号化しない HTTP の転送のために `<tunnel_port + 1>` を指します。 |
| `NO_PROXY` | `127.0.0.1,localhost,::1` です。サンドボックスの中のループバックの開発用サーバーがプロキシを通らないようにします。 |
| `REQUESTS_CA_BUNDLE` / `SSL_CERT_FILE` / `CURL_CA_BUNDLE` / `NODE_EXTRA_CA_CERTS` | サンドボックスの中にマウントされた、Hermes の外向き通信の CA 証明書の場所です（`/etc/ssl/certs/hermes-egress-ca.crt`）。各言語の実行環境が、iron-proxy が中継のために発行した証明書を信頼できるようになります。 |
| `NODE_OPTIONS` | `--use-openssl-ca` が末尾に足されます（もともとのフラグは残ります）。これで Node.js は、ほかの CA の設定が効く OpenSSL の証明書の置き場を通るようになります。[Node.js で CA の扱いがそろわない点](/hermes/docs/user-guide/egress/iron-proxy/#nodejs-asymmetric-ca-caveat)の影響を小さくします。 |
| `HERMES_IRON_PROXY_NONCE` | iron-proxy のデーモンのプロセス自身に設定されます（サンドボックスの中ではありません）。PID が使い回されても、候補の PID が *こちらが管理している* バイナリを指していることを `_pid_alive` が確かめるために使います。 |

これらは `proxy.enabled: true` で、なおかつデーモンが動いているときに、Docker のターミナルのバックエンドが自動で設定します。自分で設定するものではありません。運用する人が触る設定は `~/.hermes/config.yaml` の `proxy:` の節にあります — [外向き通信のプロキシ → 設定](/hermes/docs/user-guide/egress/iron-proxy/#configuration)を参照してください。

## メッセージ {#messaging}

| 変数 | 説明 |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Telegram のボットのトークン（@BotFather から受け取ります） |
| `TELEGRAM_ALLOWED_USERS` | ボットを使えるユーザー ID をカンマで区切って並べます（1対1のやり取り、グループ、フォーラムのすべてに効きます） |
| `TELEGRAM_ALLOW_ALL_USERS` | どの Telegram の利用者でもボットを動かせるようにします（開発時のみ）。 |
| `TELEGRAM_GROUP_ALLOWED_USERS` | グループとフォーラムでだけ許可する送信者のユーザー ID をカンマで区切って並べます（1対1のやり取りは許可しません）。チャット ID の形（`-` で始まるもの）の値は、#17686 より前の設定との互換のために今もチャット ID として扱われますが、非推奨の警告が出ます。 |
| `TELEGRAM_GROUP_ALLOWED_CHATS` | グループやフォーラムのチャット ID をカンマで区切って並べます。そこにいる人は誰でも許可されます |
| `TELEGRAM_HOME_CHANNEL` | cron の配信で使う、既定の Telegram のチャットやチャンネル |
| `TELEGRAM_HOME_CHANNEL_NAME` | Telegram のホームのチャンネルの表示名 |
| `TELEGRAM_CRON_THREAD_ID` | cron の配信を受け取るフォーラムのトピック ID。cron についてだけ `TELEGRAM_HOME_CHANNEL_THREAD_ID` を上書きします。トピックの形で使うと、cron のメッセージへの返信がシステムの待合室ではなく新しいセッションを開きます（#24409）。 |
| `TELEGRAM_WEBHOOK_URL` | webhook で受け取るための公開 HTTPS の URL（問い合わせ続ける方式ではなく webhook になります） |
| `TELEGRAM_WEBHOOK_PORT` | webhook のサーバーが待ち受ける手元のポート（初期値: `8443`） |
| `TELEGRAM_WEBHOOK_SECRET` | 確認のために Telegram が更新ごとに返してくる秘密のトークンです。**`TELEGRAM_WEBHOOK_URL` を設定したときは必ず必要です** — これがないとゲートウェイは起動を断ります（GHSA-3vpc-7q5r-276h）。`openssl rand -hex 32` で作ってください。 |
| `TELEGRAM_REACTIONS` | 処理中のメッセージに絵文字の反応を付けます（初期値: `false`） |
| `TELEGRAM_REQUIRE_MENTION` | Telegram のグループで応答する前に、はっきりした呼びかけを求めます。`config.yaml` の `telegram.require_mention` と同じです。 |
| `TELEGRAM_MENTION_PATTERNS` | Telegram のグループでの呼びかけの確認が有効なときに受け付ける、呼びかけの言葉の正規表現です。JSON の配列、改行区切り、カンマ区切りのいずれかで書きます。`telegram.mention_patterns` と同じです。 |
| `TELEGRAM_EXCLUSIVE_BOT_MENTIONS` | 有効にすると、Telegram のグループでの明示的な `@...bot` の呼びかけは、返信や呼びかけの言葉での受け止めより先に、名指しされたボットの名前だけに届きます。初期値: `true`。`telegram.exclusive_bot_mentions` と同じです。 |
| `TELEGRAM_REPLY_TO_MODE` | 返信としてひも付ける動き: `off`、`first`（初期値）、`all`。Discord と同じ考え方です。 |
| `TELEGRAM_IGNORED_THREADS` | ボットが決して応答しない Telegram のフォーラムのトピックやスレッドの ID をカンマで区切って並べます |
| `TELEGRAM_PROXY` | Telegram への接続に使うプロキシの URL — `HTTPS_PROXY` を上書きします。`http://`、`https://`、`socks5://` に対応します |
| `DISCORD_BOT_TOKEN` | Discord のボットのトークン |
| `DISCORD_ALLOWED_USERS` | ボットを使える Discord のユーザー ID をカンマで区切って並べます |
| `DISCORD_ALLOW_ALL_USERS` | どの Discord の利用者でもボットを動かせるようにします（開発時のみ）。 |
| `DISCORD_ALLOWED_ROLES` | ボットを使える Discord のロール ID をカンマで区切って並べます（`DISCORD_ALLOWED_USERS` とはどちらかを満たせば許可です）。Members の権限が自動で有効になります。運営の顔ぶれが入れ替わるときに便利です — ロールを渡すだけで自動的に行き渡ります。 |
| `DISCORD_ALLOWED_CHANNELS` | Discord のチャンネル ID をカンマで区切って並べます。設定すると、ボットはこれらのチャンネル（と、許可されていれば1対1のやり取り）でしか応答しません。`config.yaml` の `discord.allowed_channels` を上書きします。 |
| `DISCORD_PROXY` | Discord への接続に使うプロキシの URL — `HTTPS_PROXY` を上書きします。`http://`、`https://`、`socks5://` に対応します |
| `DISCORD_HOME_CHANNEL` | cron の配信で使う、既定の Discord のチャンネル |
| `DISCORD_HOME_CHANNEL_NAME` | Discord のホームのチャンネルの表示名 |
| `DISCORD_COMMAND_SYNC_POLICY` | 起動時に Discord のスラッシュコマンドをそろえる方針: `safe`（差分を見てそろえる）、`bulk`（従来の `tree.sync()`）、`off` |
| `DISCORD_REQUIRE_MENTION` | サーバーのチャンネルで応答する前に @ での呼びかけを求めます |
| `DISCORD_FREE_RESPONSE_CHANNELS` | 呼びかけが要らないチャンネル ID をカンマで区切って並べます |
| `DISCORD_AUTO_THREAD` | 対応している場所では、長い返信を自動でスレッドにします |
| `DISCORD_ALLOW_ANY_ATTACHMENT` | `true` にすると、どんな種類の添付でも受け取ります（組み込みの PDF / テキスト / zip / オフィス文書の許可一覧だけに限りません）。知らない種類のものは一時保存され、手元の場所としてエージェントに渡されるので、`terminal` / `read_file` / `ffprobe` で中身を確かめられます。初期値は `false` です。 |
| `DISCORD_MAX_ATTACHMENT_BYTES` | ゲートウェイが一時保存する添付1件あたりの最大のバイト数です。初期値は `33554432`（32 MiB）です。`0` にすると上限がなくなります（書き出しているあいだ、添付はメモリの上に置かれます）。 |
| `DISCORD_REACTIONS` | 処理中のメッセージに絵文字の反応を付けます（初期値: `true`） |
| `DISCORD_IGNORED_CHANNELS` | ボットが決して応答しないチャンネル ID をカンマで区切って並べます |
| `DISCORD_NO_THREAD_CHANNELS` | ボットが自動でスレッドを作らずに応答するチャンネル ID をカンマで区切って並べます |
| `DISCORD_REPLY_TO_MODE` | 返信としてひも付ける動き: `off`、`first`（初期値）、`all` |
| `DISCORD_ALLOW_MENTION_EVERYONE` | ボットが `@everyone` や `@here` で全員に通知することを許します（初期値: `false`）。[呼びかけの制御](/hermes/docs/user-guide/messaging/discord/#mention-control)を参照してください。 |
| `DISCORD_ALLOW_MENTION_ROLES` | ボットが `@role` でロールに通知することを許します（初期値: `false`）。 |
| `DISCORD_ALLOW_MENTION_USERS` | ボットが `@user` で個人に通知することを許します（初期値: `true`）。 |
| `DISCORD_ALLOW_MENTION_REPLIED_USER` | 返信するとき、その書き手に通知します（初期値: `true`）。 |
| `SLACK_BOT_TOKEN` | Slack のボットのトークン（`xoxb-...`） |
| `SLACK_APP_TOKEN` | Slack のアプリ単位のトークン（`xapp-...`。Socket Mode に必要です） |
| `SLACK_ALLOWED_USERS` | Slack のユーザー ID をカンマで区切って並べます |
| `SLACK_ALLOW_ALL_USERS` | どの Slack の利用者でもボットを動かせるようにします（開発時のみ）。 |
| `SLACK_ALLOW_BOTS` | ほかの Slack のボットからのメッセージを受け取ります: `none`（初期値）、`mentions`、`all`。自分のメッセージは常に無視します。 |
| `SLACK_THREAD_REQUIRE_MENTION` | Slack のスレッドへの返信でははっきりした @ の呼びかけを求めつつ、いちばん上の階層で自由に応答するチャンネルはそのまま残します |
| `SLACK_HOME_CHANNEL` | cron の配信で使う、既定の Slack のチャンネル |
| `SLACK_HOME_CHANNEL_NAME` | Slack のホームのチャンネルの表示名 |
| `GOOGLE_CHAT_PROJECT_ID` | Pub/Sub のトピックを置く GCP のプロジェクト（指定がなければ `GOOGLE_CLOUD_PROJECT` に落ちます） |
| `GOOGLE_CHAT_SUBSCRIPTION_NAME` | Pub/Sub の購読の完全な場所。`projects/{proj}/subscriptions/{sub}` の形です（従来の別名: `GOOGLE_CHAT_SUBSCRIPTION`） |
| `GOOGLE_CHAT_SERVICE_ACCOUNT_JSON` | サービスアカウントの JSON の場所、または JSON そのもの（指定がなければ `GOOGLE_APPLICATION_CREDENTIALS` に落ちます） |
| `GOOGLE_CHAT_ALLOWED_USERS` | ボットと話せる利用者のメールアドレスをカンマで区切って並べます |
| `GOOGLE_CHAT_ALLOW_ALL_USERS` | どの Google Chat の利用者でもボットを動かせるようにします（開発時のみ） |
| `GOOGLE_CHAT_HOME_CHANNEL` | cron の配信で使う、既定のスペース（`spaces/AAAA...` など） |
| `GOOGLE_CHAT_HOME_CHANNEL_NAME` | Google Chat のホームのスペースの表示名 |
| `GOOGLE_CHAT_MAX_MESSAGES` | Pub/Sub の流量制御で、同時に処理中にできるメッセージの上限（初期値: `1`） |
| `GOOGLE_CHAT_MAX_BYTES` | Pub/Sub の流量制御で、同時に処理中にできるバイト数の上限（初期値: `16777216`、16 MiB） |
| `GOOGLE_CHAT_BOOTSTRAP_SPACES` | ボット自身の `users/{id}` を突き止めるとき、起動時に追加で調べるスペース ID をカンマで区切って並べます |
| `GOOGLE_CHAT_DEBUG_RAW` | 何か値を設定すると、伏せ字にした Pub/Sub の封筒を DEBUG のレベルで記録します（不具合を調べるときだけ） |
| `GOOGLE_CHAT_HTTP_EVENTS_URL` | Chat のメッセージのできごとを受け取る、認証つきの HTTP の接続先（Pub/Sub の代わりに使えます） |
| `GOOGLE_CHAT_HTTP_EVENTS_AUDIENCE` | Google が署名した HTTP のできごとのトークンで期待する宛先（指定がなければ `GOOGLE_CHAT_HTTP_EVENTS_URL` になります） |
| `GOOGLE_CHAT_HTTP_EVENTS_SERVICE_ACCOUNT_EMAIL` | HTTP のできごとのトークンで期待する Google のサービスアカウントのメールアドレス |
| `WHATSAPP_ENABLED` | WhatsApp の橋渡しを有効にします（`true`/`false`） |
| `WHATSAPP_MODE` | `bot`（別の番号を使う）か `self-chat`（自分あてに送る） |
| `WHATSAPP_ALLOWED_USERS` | 電話番号をカンマで区切って並べます（国番号つき、`+` なし）。`*` にするとすべての送信者を許可します |
| `WHATSAPP_ALLOW_ALL_USERS` | 許可一覧なしで、すべての WhatsApp の送信者を許可します（`true`/`false`） |
| `WHATSAPP_HOME_CHANNEL` | cron や通知の配信で使う、既定のチャット ID。 |
| `WHATSAPP_HOME_CHANNEL_NAME` | WhatsApp のホームのチャンネルの表示名。 |
| `WHATSAPP_DEBUG` | 不具合を調べるために、橋渡しの中で生のメッセージのできごとを記録します（`true`/`false`） |
| `WHATSAPP_CLOUD_PHONE_NUMBER_ID` | WhatsApp Business Cloud API の Meta の電話番号 ID（15〜17桁。電話番号そのものでは**ありません**） |
| `WHATSAPP_CLOUD_ACCESS_TOKEN` | Meta のアクセストークン（`EAA` で始まります）。一時的なトークンは24時間で切れ、System User のトークンはずっと使えます |
| `WHATSAPP_CLOUD_APP_SECRET` | 受け取った webhook の署名を確かめるための、32文字の16進のアプリの秘密の値 |
| `WHATSAPP_CLOUD_VERIFY_TOKEN` | Meta の webhook の確認のやり取りで使う共有の秘密の値（設定ウィザードが自動で作ります） |
| `WHATSAPP_CLOUD_ALLOWED_USERS` | ボットにメッセージを送れる `wa_id` をカンマで区切って並べます（国番号つきの電話番号、`+` なし） |
| `WHATSAPP_CLOUD_ALLOW_ALL_USERS` | 許可一覧なしで、すべての WhatsApp Cloud の送信者を許可します（`true`/`false`） |
| `WHATSAPP_CLOUD_APP_ID` | Meta のアプリ ID（任意。将来の分析との連携のためのものです） |
| `WHATSAPP_CLOUD_WABA_ID` | WhatsApp Business Account の ID（任意。将来の分析との連携のためのものです） |
| `WHATSAPP_CLOUD_WEBHOOK_HOST` | 受け取り側の webhook のサーバーが待ち受ける場所（初期値は `0.0.0.0`） |
| `WHATSAPP_CLOUD_WEBHOOK_PORT` | 受け取り側の webhook のサーバーが待ち受けるポート（初期値は `8090`） |
| `WHATSAPP_CLOUD_WEBHOOK_PATH` | Meta が受信メッセージを送ってくる URL のパス（初期値は `/whatsapp/webhook`） |
| `WHATSAPP_CLOUD_API_VERSION` | 呼び出す Meta Graph API のバージョン（初期値は `v20.0`） |
| `WHATSAPP_CLOUD_HOME_CHANNEL` | ボットのホームのチャンネルとして使う `wa_id`（cron のジョブなどで使います） |
| `WHATSAPP_CLOUD_DM_POLICY` | Cloud の連携での1対1のやり取りの絞り込み（`open`/`allowlist`/`disabled`）。設定しなければ `WHATSAPP_DM_POLICY` に落ちます |
| `WHATSAPP_CLOUD_ALLOW_FROM` | `dm_policy: allowlist` のときに許可する送信者をカンマで区切って並べます（`wa_id` そのまま。Baileys 形式の JID は整えられます） |
| `WHATSAPP_CLOUD_GROUP_POLICY` | Cloud の連携でのグループの絞り込み（`open`/`allowlist`/`disabled`）。設定しなければ `WHATSAPP_GROUP_POLICY` に落ちます |
| `WHATSAPP_CLOUD_GROUP_ALLOW_FROM` | `group_policy: allowlist` のときに許可するグループのチャット ID をカンマで区切って並べます |
| `SIGNAL_HTTP_URL` | signal-cli のデーモンの HTTP の接続先（たとえば `http://127.0.0.1:8080`） |
| `SIGNAL_ACCOUNT` | ボットの電話番号（E.164 の形式） |
| `SIGNAL_ALLOWED_USERS` | E.164 の電話番号か UUID をカンマで区切って並べます |
| `SIGNAL_GROUP_ALLOWED_USERS` | グループ ID をカンマで区切って並べます。`*` にするとすべてのグループが対象です |
| `SIGNAL_HOME_CHANNEL_NAME` | Signal のホームのチャンネルの表示名 |
| `SIGNAL_IGNORE_STORIES` | Signal のストーリーや近況の更新を無視します |
| `SIGNAL_ALLOW_ALL_USERS` | 許可一覧なしで、すべての Signal の利用者を許可します |
| `TWILIO_ACCOUNT_SID` | Twilio の Account SID（電話のスキルと共通です） |
| `TWILIO_AUTH_TOKEN` | Twilio の Auth Token（電話のスキルと共通です。webhook の署名の確認にも使います） |
| `TWILIO_PHONE_NUMBER` | Twilio の電話番号（E.164 の形式。電話のスキルと共通です） |
| `SMS_WEBHOOK_URL` | Twilio の署名の確認に使う公開 URL — Twilio Console の webhook の URL と一致していなければなりません（必須） |
| `SMS_WEBHOOK_PORT` | 受信する SMS のための webhook が待ち受けるポート（初期値: `8080`） |
| `SMS_WEBHOOK_HOST` | webhook が待ち受けるアドレス（初期値: `127.0.0.1`） |
| `SMS_INSECURE_NO_SIGNATURE` | `true` にすると Twilio の署名の確認を止めます（手元の開発時のみ。本番では使わないでください） |
| `SMS_ALLOWED_USERS` | 話しかけられる E.164 の電話番号をカンマで区切って並べます |
| `SMS_ALLOW_ALL_USERS` | 許可一覧なしで、すべての SMS の送信者を許可します |
| `SMS_HOME_CHANNEL` | cron のジョブや通知の配信に使う電話番号 |
| `SMS_HOME_CHANNEL_NAME` | SMS のホームのチャンネルの表示名 |
| `EMAIL_ADDRESS` | メールのゲートウェイの連携で使うメールアドレス |
| `EMAIL_PASSWORD` | そのメールのアカウントのパスワード、またはアプリ用のパスワード |
| `EMAIL_IMAP_HOST` | メールの連携で使う IMAP のホスト名 |
| `EMAIL_IMAP_PORT` | IMAP のポート |
| `EMAIL_SMTP_HOST` | メールの連携で使う SMTP のホスト名 |
| `EMAIL_SMTP_PORT` | SMTP のポート |
| `EMAIL_ALLOWED_USERS` | ボットにメッセージを送れるメールアドレスをカンマで区切って並べます |
| `EMAIL_HOME_ADDRESS` | こちらから送るメールの既定の宛先 |
| `EMAIL_HOME_ADDRESS_NAME` | メールのホームの宛先の表示名 |
| `EMAIL_POLL_INTERVAL` | メールを見に行く間隔を秒で指定します |
| `EMAIL_ALLOW_ALL_USERS` | 届いたメールの送信者をすべて許可します |
| `DINGTALK_CLIENT_ID` | 開発者向けポータルで取得する DingTalk のボットの AppKey（[open.dingtalk.com](https://open.dingtalk.com)） |
| `DINGTALK_CLIENT_SECRET` | 開発者向けポータルで取得する DingTalk のボットの AppSecret |
| `DINGTALK_ALLOWED_USERS` | ボットにメッセージを送れる DingTalk のユーザー ID をカンマで区切って並べます |
| `DINGTALK_WEBHOOK_URL` | プラットフォームをまたぐ配信や cron の配信で使う、固定のロボットの webhook の URL。 |
| `DINGTALK_HOME_CHANNEL` | cron や通知の配信で使う、既定の会話の ID。 |
| `DINGTALK_HOME_CHANNEL_NAME` | DingTalk のホームのチャンネルの表示名。 |
| `FEISHU_APP_ID` | [open.feishu.cn](https://open.feishu.cn/) で取得する Feishu / Lark のボットの App ID |
| `FEISHU_APP_SECRET` | Feishu / Lark のボットの App Secret |
| `FEISHU_DOMAIN` | `feishu`（中国）か `lark`（国際版）。初期値: `feishu` |
| `FEISHU_CONNECTION_MODE` | `websocket`（おすすめ）か `webhook`。初期値: `websocket` |
| `FEISHU_ENCRYPT_KEY` | webhook で使うときの暗号化のキー（任意） |
| `FEISHU_VERIFICATION_TOKEN` | webhook で使うときの確認用のトークン（任意） |
| `FEISHU_ALLOWED_USERS` | ボットにメッセージを送れる Feishu のユーザー ID をカンマで区切って並べます |
| `FEISHU_ALLOW_BOTS` | `none`（初期値）/ `mentions` / `all` — ほかのボットからのメッセージを受け取ります。[ボット同士のやり取り](/hermes/docs/user-guide/messaging/feishu/#bot-to-bot-messaging)を参照してください |
| `FEISHU_REQUIRE_MENTION` | `true`（初期値）/ `false` — グループのメッセージでボットへの @ の呼びかけを必須にするかどうか。チャットごとの上書きは `group_rules.<chat_id>.require_mention` で行います。 |
| `FEISHU_HOME_CHANNEL` | cron の配信と通知で使う Feishu のチャット ID |
| `FEISHU_HOME_CHANNEL_NAME` | Feishu のホームのチャンネルの表示名。 |
| `FEISHU_ALLOW_ALL_USERS` | どの Feishu の利用者でもボットを動かせるようにします（開発時のみ）。 |
| `WECOM_BOT_ID` | 管理画面で取得する WeCom の AI Bot の ID |
| `WECOM_SECRET` | WeCom の AI Bot の秘密の値 |
| `WECOM_WEBSOCKET_URL` | WebSocket の URL を自分で指定します（初期値: `wss://openws.work.weixin.qq.com`） |
| `WECOM_ALLOWED_USERS` | ボットにメッセージを送れる WeCom のユーザー ID をカンマで区切って並べます |
| `WECOM_HOME_CHANNEL` | cron の配信と通知で使う WeCom のチャット ID |
| `WECOM_CALLBACK_CORP_ID` | 自作アプリのコールバックで使う WeCom の企業の Corp ID |
| `WECOM_CALLBACK_CORP_SECRET` | 自作アプリの企業の秘密の値 |
| `WECOM_CALLBACK_AGENT_ID` | 自作アプリの Agent ID |
| `WECOM_CALLBACK_TOKEN` | コールバックの確認用のトークン |
| `WECOM_CALLBACK_ENCODING_AES_KEY` | コールバックの暗号化に使う AES の鍵 |
| `WECOM_CALLBACK_HOST` | コールバックのサーバーが待ち受けるアドレス（初期値: `0.0.0.0`） |
| `WECOM_CALLBACK_PORT` | コールバックのサーバーのポート（初期値: `8645`） |
| `WECOM_CALLBACK_ALLOWED_USERS` | 許可一覧に載せるユーザー ID をカンマで区切って並べます |
| `WECOM_CALLBACK_ALLOW_ALL_USERS` | `true` にすると、許可一覧なしですべての利用者を許可します |
| `WEIXIN_ACCOUNT_ID` | iLink Bot API の QR コードでのログインで取得する Weixin のアカウント ID |
| `WEIXIN_TOKEN` | iLink Bot API の QR コードでのログインで取得する Weixin の認証トークン |
| `WEIXIN_BASE_URL` | Weixin の iLink Bot API のベース URL を上書きします（初期値: `https://ilinkai.weixin.qq.com`） |
| `WEIXIN_CDN_BASE_URL` | 画像などのための Weixin の CDN のベース URL を上書きします（初期値: `https://novac2c.cdn.weixin.qq.com/c2c`） |
| `WEIXIN_DM_POLICY` | 1対1のやり取りの方針: `open`、`allowlist`、`pairing`、`disabled`（初期値: `open`） |
| `WEIXIN_GROUP_POLICY` | グループのメッセージの方針: `open`、`allowlist`、`disabled`（初期値: `disabled`） |
| `WEIXIN_ALLOWED_USERS` | ボットに1対1でメッセージを送れる Weixin のユーザー ID をカンマで区切って並べます |
| `WEIXIN_GROUP_ALLOWED_USERS` | ボットとやり取りできる Weixin の**グループのチャット ID**（そこにいる人のユーザー ID ではありません）をカンマで区切って並べます。名前は昔の名残で、実際に求めているのはグループの ID です。iLink がグループのできごとを実際に届けるときにだけ効きます。QR コードでログインした iLink のボットの身分（`...@im.bot`）は、ふつうの WeChat のグループのメッセージをたいてい受け取りません。 |
| `WEIXIN_HOME_CHANNEL` | cron の配信と通知で使う Weixin のチャット ID |
| `WEIXIN_HOME_CHANNEL_NAME` | Weixin のホームのチャンネルの表示名 |
| `WEIXIN_ALLOW_ALL_USERS` | 許可一覧なしで、すべての Weixin の利用者を許可します（`true`/`false`） |
| `BLUEBUBBLES_SERVER_URL` | BlueBubbles のサーバーの URL（たとえば `http://192.168.1.10:1234`） |
| `BLUEBUBBLES_PASSWORD` | BlueBubbles のサーバーのパスワード |
| `BLUEBUBBLES_WEBHOOK_HOST` | webhook を受け取るときに待ち受けるアドレス（初期値: `127.0.0.1`） |
| `BLUEBUBBLES_WEBHOOK_PORT` | webhook を受け取るときに待ち受けるポート（初期値: `8645`） |
| `BLUEBUBBLES_HOME_CHANNEL` | cron や通知の配信に使う電話番号かメールアドレス |
| `BLUEBUBBLES_ALLOWED_USERS` | 許可する利用者をカンマで区切って並べます |
| `BLUEBUBBLES_ALLOW_ALL_USERS` | すべての利用者を許可します（`true`/`false`） |
| `QQ_APP_ID` | [q.qq.com](https://q.qq.com) で取得する QQ Bot の App ID |
| `QQ_CLIENT_SECRET` | [q.qq.com](https://q.qq.com) で取得する QQ Bot の App Secret |
| `QQ_STT_API_KEY` | 外部の文字起こしのプロバイダーに切り替えるときの API キー（任意。QQ に組み込みの音声認識が何も返さなかったときに使います） |
| `QQ_STT_BASE_URL` | 外部の文字起こしのプロバイダーのベース URL（任意） |
| `QQ_STT_MODEL` | 外部の文字起こしのプロバイダーのモデル名（任意） |
| `QQ_ALLOWED_USERS` | ボットにメッセージを送れる QQ のユーザーの openID をカンマで区切って並べます |
| `QQ_GROUP_ALLOWED_USERS` | グループでの @ 付きメッセージを許可する QQ のグループ ID をカンマで区切って並べます |
| `QQ_ALLOW_ALL_USERS` | すべての利用者を許可します（`true`/`false`。`QQ_ALLOWED_USERS` を上書きします） |
| `QQBOT_HOME_CHANNEL` | cron の配信と通知で使う QQ の利用者やグループの openID |
| `QQBOT_HOME_CHANNEL_NAME` | QQ のホームのチャンネルの表示名 |
| `QQ_PORTAL_HOST` | QQ のポータルのホストを上書きします（`sandbox.q.qq.com` にすると試験用のゲートウェイを通ります。初期値: `q.qq.com`）。 |
| `QQ_SANDBOX` | 開発時の検証のために QQ の試験用の動きを有効にします（`true`/`false`） |
| `MATTERMOST_URL` | Mattermost のサーバーの URL（たとえば `https://mm.example.com`） |
| `MATTERMOST_TOKEN` | Mattermost のボットのトークン、または個人用のアクセストークン |
| `MATTERMOST_ALLOWED_USERS` | ボットにメッセージを送れる Mattermost のユーザー ID をカンマで区切って並べます |
| `MATTERMOST_ALLOW_ALL_USERS` | どの Mattermost の利用者でもボットを動かせるようにします（開発時のみ）。 |
| `MATTERMOST_ALLOWED_CHANNELS` | 設定すると、ボットはこれらのチャンネルでしか応答しません（許可一覧）。 |
| `MATTERMOST_HOME_CHANNEL` | こちらから送るメッセージ（cron、通知）の配信先のチャンネル ID |
| `MATTERMOST_REQUIRE_MENTION` | チャンネルで `@mention` を求めます（初期値: `true`）。`false` にすると、すべてのメッセージに応答します。 |
| `MATTERMOST_FREE_RESPONSE_CHANNELS` | ボットが `@mention` なしで応答するチャンネル ID をカンマで区切って並べます |
| `MATTERMOST_REPLY_MODE` | 返信の形: `thread`（スレッドで返す）か `off`（並べて返す。初期値） |
| `MATRIX_HOMESERVER` | Matrix のホームサーバーの URL（たとえば `https://matrix.org`） |
| `MATRIX_ACCESS_TOKEN` | ボットの認証に使う Matrix のアクセストークン |
| `MATRIX_USER_ID` | Matrix のユーザー ID（たとえば `@hermes:matrix.org`）。パスワードでログインするときは必須で、アクセストークンを使うなら任意です |
| `MATRIX_PASSWORD` | Matrix のパスワード（アクセストークンの代わりに使えます） |
| `MATRIX_ALLOWED_USERS` | ボットにメッセージを送れる Matrix のユーザー ID をカンマで区切って並べます（たとえば `@alice:matrix.org`） |
| `MATRIX_ALLOW_ALL_USERS` | どの Matrix の利用者でもボットを動かせるようにします（開発時のみ）。 |
| `MATRIX_HOME_CHANNEL` | cron や通知の配信で使う、既定の部屋の ID。 |
| `MATRIX_HOME_CHANNEL_NAME` | Matrix のホームの部屋の表示名。 |
| `MATRIX_ALLOWED_ROOMS` | ボットが応答できる Matrix の部屋の ID をカンマで区切って並べます |
| `MATRIX_HOME_ROOM` | こちらから送るメッセージの配信先の部屋の ID（たとえば `!abc123:matrix.org`） |
| `MATRIX_ENCRYPTION` | 端から端までの暗号化を有効にします（`true`/`false`、初期値: `false`） |
| `MATRIX_E2EE_MODE` | Matrix の端から端までの暗号化の動き: `off`、`optional`、`required`。設定すると `MATRIX_ENCRYPTION` を上書きします。 |
| `MATRIX_DEVICE_ID` | 再起動をまたいで暗号化の状態を保つための、変わらない Matrix のデバイス ID（たとえば `HERMES_BOT`）。これがないと、起動のたびに鍵が入れ替わり、過去の部屋の内容を読めなくなります。 |
| `MATRIX_REACTIONS` | 受け取ったメッセージに、処理の進み具合を表す絵文字の反応を付けます（初期値: `true`）。止めるには `false` にします。 |
| `MATRIX_REQUIRE_MENTION` | 部屋で `@mention` を求めます（初期値: `true`）。`false` にすると、すべてのメッセージに応答します。 |
| `MATRIX_FREE_RESPONSE_ROOMS` | ボットが `@mention` なしで応答する部屋の ID をカンマで区切って並べます |
| `MATRIX_IGNORE_USER_PATTERNS` | 無視する Matrix の橋渡しやアプリサービスの代理ユーザー ID の正規表現を、カンマで区切って並べます |
| `MATRIX_PROCESS_NOTICES` | 受け取った Matrix の `m.notice` のできごとを処理します（初期値: `false`） |
| `MATRIX_SESSION_SCOPE` | プロジェクトの部屋での Matrix のセッションの区切り方: `auto`、`room`、`thread`（初期値: `auto`） |
| `MATRIX_TOOLS_ALLOW_REDACTION` | Matrix のメッセージを取り消すツールの実行を許します（初期値: `false`） |
| `MATRIX_TOOLS_ALLOW_INVITES` | Matrix の招待のツールの実行を許します（初期値: `false`） |
| `MATRIX_TOOLS_ALLOW_ROOM_CREATE` | Matrix の部屋を作るツールの実行を許します（初期値: `false`） |
| `MATRIX_ALLOW_ROOM_MENTIONS` | 送信するメッセージの `@room` で、部屋にいる全員に通知することを許します（初期値: `false`） |
| `MATRIX_AUTO_THREAD` | 部屋のメッセージで自動的にスレッドを作ります（初期値: `true`） |
| `MATRIX_DM_AUTO_THREAD` | Matrix の1対1のメッセージで自動的にスレッドを作ります（初期値: `false`） |
| `MATRIX_DM_MENTION_THREADS` | 1対1のやり取りでボットが `@mentioned` されたときにスレッドを作ります（初期値: `false`） |
| `MATRIX_APPROVAL_REQUIRE_SENDER` | 承認やモデルの選択の反応を、それが分かる場合はもとの依頼者からのものに限ります（初期値: `true`） |
| `MATRIX_APPROVAL_TIMEOUT_SECONDS` | Matrix の反応による承認やモデルの選択を待つ時間の上限（初期値: `300`） |
| `MATRIX_ALLOW_PUBLIC_ROOMS` | Matrix の部屋を作るツールが公開の部屋を作ることを許します（初期値: `false`） |
| `MATRIX_MAX_MEDIA_BYTES` | Matrix でやり取りする画像などの最大のバイト数（初期値: `104857600`） |
| `MATRIX_RECOVERY_KEY` | デバイスの鍵が入れ替わったあと、相互署名の確認に使う回復用の鍵です。相互署名を有効にした暗号化の構成ではおすすめします。 |
| `MATRIX_RECOVERY_KEY_OUTPUT_FILE` | 作られた Matrix の回復用の鍵を一度だけ書き出す場所（任意）。`0600` で作られ、上書きされることはありません。 |
| `HASS_TOKEN` | Home Assistant の長期のアクセストークン（HA のプラットフォームとツールが使えるようになります） |
| `HASS_URL` | Home Assistant の URL（初期値: `http://homeassistant.local:8123`） |
| `WEBHOOK_ENABLED` | webhook のプラットフォームの連携を有効にします（`true`/`false`） |
| `WEBHOOK_PORT` | webhook を受け取る HTTP サーバーのポート（初期値: `8644`） |
| `WEBHOOK_SECRET` | webhook の署名を確かめるための全体の HMAC の秘密の値（経路ごとの指定がないときに使われます） |
| `API_SERVER_ENABLED` | OpenAI 互換の API サーバーを有効にします（`true`/`false`）。ほかのプラットフォームと並んで動きます。 |
| `API_SERVER_KEY` | API サーバーの認証に使うトークンです。API サーバーを有効にするときは必ず必要です。 |
| `API_SERVER_CORS_ORIGINS` | API サーバーを直接呼び出せるブラウザの接続元をカンマで区切って並べます（たとえば `http://localhost:3000,http://127.0.0.1:3000`）。初期状態では無効です。 |
| `API_SERVER_PORT` | API サーバーのポート（初期値: `8642`） |
| `API_SERVER_HOST` | API サーバーが待ち受けるアドレス（初期値: `127.0.0.1`）。ループバックでも `API_SERVER_KEY` は必要です。ブラウザから使うときは `API_SERVER_CORS_ORIGINS` を狭く絞ってください。 |
| `API_SERVER_MODEL_NAME` | `/v1/models` に載せるモデル名です。既定ではプロファイル名になります（既定のプロファイルなら `hermes-agent`）。Open WebUI のようなフロントエンドが接続ごとに別のモデル名を必要とする、複数人での構成で役に立ちます。 |
| `GATEWAY_PROXY_URL` | メッセージを転送する先の、リモートの Hermes の API サーバーの URL（[代理として動かす](/hermes/docs/user-guide/messaging/matrix/#proxy-mode-e2ee-on-macos)）。設定すると、ゲートウェイはプラットフォームとの入出力だけを担い、エージェントの仕事はすべてリモートのサーバーに任せます。`config.yaml` の `gateway.proxy_url` でも設定できます。 |
| `GATEWAY_PROXY_KEY` | 代理として動かすとき、リモートの API サーバーに対して使う認証のトークン。リモート側の `API_SERVER_KEY` と一致していなければなりません。 |
| `MESSAGING_CWD` | ゲートウェイの作業ディレクトリのための、互換のために残された非推奨の設定です。`config.yaml` の `terminal.cwd` を使ってください。 |
| `GATEWAY_ALLOWED_USERS` | すべてのプラットフォームで許可するユーザー ID をカンマで区切って並べます |
| `GATEWAY_ALLOW_ALL_USERS` | 許可一覧なしですべての利用者を許可します（`true`/`false`、初期値: `false`） |

### ウェブのダッシュボードと Hermes Desktop {#web-dashboard-hermes-desktop}

[ウェブのダッシュボード](/hermes/docs/user-guide/features/web-dashboard/)の認証と、[Hermes Desktop をリモートのバックエンドにつなぐ](/hermes/docs/user-guide/features/web-dashboard/#connecting-hermes-desktop-to-a-remote-backend)ときの認証です。秘密の情報だけを置くという決まりに従い、認証情報は `~/.hermes/.env` に置きます。OAuth の `client_id` は `config.yaml` の `dashboard.oauth` の下に書くほうがよいでしょう（環境変数があれば、そちらが勝ちます）。

ダッシュボードの認証のプロバイダーは、はじめから3つ用意されています。リモートの Hermes Desktop からつなぐ場合や、インターネットに面したダッシュボードでは、**OAuth（Nous Portal）**をおすすめします。`HERMES_DASHBOARD_OAUTH_CLIENT_ID` を設定してください（`hermes dashboard register` で用意できます）。同梱の**ユーザー名とパスワード**のプロバイダー（`HERMES_DASHBOARD_BASIC_AUTH_*`）は、信頼できる LAN の中や VPN の後ろにあるバックエンドにはいちばん手早い方法ですが、インターネットに直接さらす用途には向きません。自分の認証基盤で認証するなら、**自前の OIDC** のプロバイダー（`HERMES_DASHBOARD_OIDC_*`）を使ってください。どの場合も、ループバック以外に割り当てると（`hermes dashboard --host 0.0.0.0`）認証の関門が働きます。全体像は [ウェブのダッシュボード → 認証](/hermes/docs/user-guide/features/web-dashboard/#authentication-gated-mode)を参照してください。

| 変数 | 説明 |
|----------|-------------|
| `HERMES_DASHBOARD_BASIC_AUTH_USERNAME` | 同梱のユーザー名とパスワードによるダッシュボードの認証のプロバイダー（`plugins/dashboard_auth/basic`）で使うユーザー名。パスワードと一緒に設定すると、このプロバイダーが有効になります。`dashboard.basic_auth.username` を上書きします。 |
| `HERMES_DASHBOARD_BASIC_AUTH_PASSWORD` | このプロバイダーで使う平文のパスワード（読み込むときにメモリ上でハッシュ化されます）。設定の `password_hash` より優先されるので、環境変数で入れ替えられます。`dashboard.basic_auth.password` を上書きします。 |
| `HERMES_DASHBOARD_BASIC_AUTH_PASSWORD_HASH` | このプロバイダーで使う scrypt のパスワードのハッシュ（平文を残さずに済むので、こちらがおすすめです）。`python -c "from plugins.dashboard_auth.basic import hash_password; print(hash_password('PW'))"` で計算します。`dashboard.basic_auth.password_hash` を上書きします。 |
| `HERMES_DASHBOARD_BASIC_AUTH_SECRET` | このプロバイダーの、状態を持たないセッションのトークンに署名する HMAC の鍵（32バイト以上。base64、16進、生のいずれか）。再起動をまたいでセッションを保ち、複数のワーカーで共有するには、明示的に設定してください。空にするとプロセスごとにランダムになり、再起動のたびにログインし直しになります。`dashboard.basic_auth.secret` を上書きします。 |
| `HERMES_DASHBOARD_BASIC_AUTH_TTL_SECONDS` | このプロバイダーのアクセストークンの有効期間（初期値は12時間）。`dashboard.basic_auth.session_ttl_seconds` を上書きします。 |
| `HERMES_DASHBOARD_OAUTH_CLIENT_ID` | 関門つき・公開のダッシュボードで使う OAuth のクライアント id（`agent:{instance_id}`）。設定すると Nous のプロバイダー（`plugins/dashboard_auth/nous`）が有効になります。`dashboard.oauth.client_id` を上書きします。`hermes dashboard register` で用意してください。 |
| `HERMES_DASHBOARD_PUBLIC_URL` | リバースプロキシの後ろで、ダッシュボードに実際にたどり着く完全な公開 URL です。OAuth のコールバックの組み立てを決め、そのホスト名を HTTP の Host と WebSocket の Origin の確認に加えます。また、バックエンドがループバックに割り当てられていても、ループバック以外の公開ホストでは認証の関門を必須にします。`dashboard.public_url` を上書きします。 |
| `HERMES_DASHBOARD_OIDC_ISSUER` | 同梱の自前の OIDC のプロバイダー（`plugins/dashboard_auth/self_hosted`）の発行者の URL。有効にするには必須です。`dashboard.oauth.self_hosted.issuer` を上書きします。 |
| `HERMES_DASHBOARD_OIDC_CLIENT_ID` | 自前の OIDC のプロバイダーの公開のクライアント id（認可コードと PKCE を使います）。有効にするには必須です。`dashboard.oauth.self_hosted.client_id` を上書きします。 |
| `HERMES_DASHBOARD_OIDC_SCOPES` | 自前の OIDC のプロバイダーで要求する範囲（初期値は `openid profile email`）。`dashboard.oauth.self_hosted.scopes` を上書きします。 |
| `HERMES_DESKTOP_REMOTE_URL` | （デスクトップ側）リモートのバックエンドのベース URL です。たとえば `http://host:9119`。設定するとアプリ内の Gateway URL を上書きします。サインインは今までどおり Gateway の設定の画面から行います（OAuth の転送か、ユーザー名とパスワードか、バックエンドが示すほうです）。 |
| `HERMES_DESKTOP_HERMES` | デスクトップのバックエンドのコマンドを上書きします。バックエンドを探したあとで Electron に特定の `hermes` の実行ファイルを使わせたいとき、パッケージを作る人や Nix、不具合を調べるときに使います。 |
| `HERMES_DESKTOP_HERMES_ROOT` | `hermes desktop --hermes-root` が使う、デスクトップのソースの取得先の上書きです。パッケージ版の初回起動時の導入や、`PATH` にある既存の `hermes` より先に確かめられます。 |
| `HERMES_DESKTOP_IGNORE_EXISTING` | `1` にすると、バックエンドを決めるときにデスクトップが `PATH` にある既存の `hermes` を無視します。`hermes desktop --ignore-existing` と同じです。 |
| `HERMES_DESKTOP_CWD` | デスクトップのチャットのセッションで最初に使うプロジェクトのディレクトリ。`hermes desktop --cwd` で設定されます。 |
| `HERMES_DESKTOP_PYTHON` | バックエンドで使う Python の実行ファイルの絶対パスです。ソースの取得先について Electron が自動で決める前に確かめられます。共有の venv を使い回すため、worktree の開発用の補助が使います（[worktree からの TUI とデスクトップ](/hermes/docs/developer-guide/worktree-ui-dev/)を参照してください）。 |
| `HERMES_DESKTOP_DEV_SERVER` | Electron の外側が、パッケージ済みの一式の代わりに読み込む Vite の開発サーバーの URL です（たとえば `http://127.0.0.1:5174`）。`npm run dev` が自動で設定します。アプリ自体をいじるときにだけ関係します。 |
| `HERMES_DESKTOP_CDP_PORT` | 描画側が DOM や CSS を調べる道具のために `127.0.0.1` に出す Chrome DevTools Protocol のポートを上書きします（初期値は `9222`）。開発サーバーでの起動（`npm run dev`、`hgui`）では自動で開きます。パッケージ版のアプリでは決して開かず、ここに何を設定しても変わりません。開発時の起動で止めたいときは `off` にします。このポートに届くものは、描画側でコードを実行できてしまいます。 |

### Microsoft Graph（Teams の会議） {#microsoft-graph-teams-meetings}

これから入る Teams の会議のまとめの仕組みで使う、Microsoft Graph の REST のクライアントのための、アプリ単位の認証情報です。Azure のポータルでの手順と、必要になる API の権限については [Microsoft Graph のアプリケーションを登録する](/hermes/docs/guides/microsoft-graph-app-registration/)を参照してください。

| 変数 | 説明 |
|----------|-------------|
| `MSGRAPH_TENANT_ID` | Graph のアプリの登録に使う Azure AD のテナント ID（ディレクトリの GUID）。 |
| `MSGRAPH_CLIENT_ID` | Azure のアプリの登録のアプリケーション（クライアント）ID。 |
| `MSGRAPH_CLIENT_SECRET` | アプリの登録のクライアントの秘密の値。`~/.hermes/.env` に置き、`chmod 600` にしてください。Azure のポータルで定期的に入れ替えましょう。 |
| `MSGRAPH_SCOPE` | クライアント資格情報でトークンを取るときの OAuth2 の範囲（初期値: `https://graph.microsoft.com/.default`）。 |
| `MSGRAPH_AUTHORITY_URL` | Microsoft の認証基盤の認証局（初期値: `https://login.microsoftonline.com`）。各国向けのクラウドのときだけ上書きしてください（GCC High なら `https://login.microsoftonline.us` など）。 |

### Microsoft Graph の webhook の受け取り {#microsoft-graph-webhook-listener}

Graph のできごと（Teams の会議、予定表、チャットなど）の変更の通知を受け取る側です。設定と安全の強化については [Microsoft Graph の webhook の受け取り](/hermes/docs/user-guide/messaging/msgraph-webhook/)を参照してください。

| 変数 | 説明 |
|----------|-------------|
| `MSGRAPH_WEBHOOK_ENABLED` | `msgraph_webhook` のゲートウェイのプラットフォームを有効にします（`true`/`1`/`yes`）。 |
| `MSGRAPH_WEBHOOK_PORT` | 受け取り側が待ち受けるポート（初期値: `8646`）。 |
| `MSGRAPH_WEBHOOK_CLIENT_STATE` | Graph が通知のたびに返してくる共有の秘密の値。`hmac.compare_digest` で照合します。`openssl rand -hex 32` で作ってください。 |
| `MSGRAPH_WEBHOOK_ACCEPTED_RESOURCES` | 受け入れる Graph のリソースの場所や書き方をカンマで区切って並べます（たとえば `communications/onlineMeetings,chats/*/messages`）。末尾の `*` は前方一致です。空にするとすべて受け入れます。 |
| `MSGRAPH_WEBHOOK_ALLOWED_SOURCE_CIDRS` | 受け取り側へ POST できる CIDR の範囲をカンマで区切って並べます（たとえば `52.96.0.0/14,52.104.0.0/14`）。空にするとすべて許可します（初期値）。本番では Microsoft Graph が公開している送信元の範囲に絞ってください。 |

### Teams の会議のまとめの配信 {#teams-meeting-summary-delivery}

[`teams_pipeline` のプラグイン](/hermes/docs/user-guide/messaging/msgraph-webhook/)を有効にしたときにだけ使います。`config.yaml` の `platforms.teams.extra` の下でも設定できます。両方に書かれているときは環境変数が優先されます。[Microsoft Teams → 会議のまとめの配信](/hermes/docs/user-guide/messaging/teams/#meeting-summary-delivery-teams-meeting-pipeline)を参照してください。

| 変数 | 説明 |
|----------|-------------|
| `TEAMS_DELIVERY_MODE` | `graph` か `incoming_webhook`。 |
| `TEAMS_INCOMING_WEBHOOK_URL` | Teams が作る webhook の URL。`TEAMS_DELIVERY_MODE=incoming_webhook` のときに必要です。 |
| `TEAMS_GRAPH_ACCESS_TOKEN` | Graph で配信するために、あらかじめ取得した委任のアクセストークン。必要になることはまれです — 設定しなければ、書き出す側は `MSGRAPH_*` のアプリの認証情報に落ちます。 |
| `TEAMS_TEAM_ID` | チャンネルへ配信するときの宛先のチーム ID（`graph` のとき）。 |
| `TEAMS_CHANNEL_ID` | 宛先のチャンネル ID（`TEAMS_TEAM_ID` と組み合わせます）。 |
| `TEAMS_CHAT_ID` | 宛先の1対1またはグループのチャット ID（`graph` のとき、チームとチャンネルの代わりに使えます）。 |

### LINE Messaging API {#line-messaging-api}

同梱の LINE のプラットフォームのプラグイン（`plugins/platforms/line/`）が使います。設定の全体は [メッセージのゲートウェイ → LINE](/hermes/docs/user-guide/messaging/line/)を参照してください。

| 変数 | 説明 |
|----------|-------------|
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Developers Console（Messaging API のタブ）で取得する、長く使えるチャネルアクセストークン。必須です。 |
| `LINE_CHANNEL_SECRET` | チャネルシークレット（Basic settings のタブ）。webhook の HMAC-SHA256 の署名の確認に使います。必須です。 |
| `LINE_HOST` | webhook が待ち受けるホスト（初期値: `0.0.0.0`）。 |
| `LINE_PORT` | webhook が待ち受けるポート（初期値: `8646`）。 |
| `LINE_PUBLIC_URL` | 公開の HTTPS のベース URL（たとえば `https://my-tunnel.example.com`）。画像・音声・動画を送るには必須です — LINE は HTTPS で届く URL しか受け付けません。 |
| `LINE_ALLOWED_USERS` | ボットに1対1でメッセージを送れるユーザー ID をカンマで区切って並べます（`U` で始まります）。 |
| `LINE_ALLOWED_GROUPS` | ボットが応答するグループの ID をカンマで区切って並べます（`C` で始まります）。 |
| `LINE_ALLOWED_ROOMS` | ボットが応答するルームの ID をカンマで区切って並べます（`R` で始まります）。 |
| `LINE_ALLOW_ALL_USERS` | 開発時だけの抜け道です — どの送信元でも受け付けます。初期値: `false`。 |
| `LINE_HOME_CHANNEL` | `deliver: line` を指定した cron のジョブの、既定の配信先。 |
| `LINE_SLOW_RESPONSE_THRESHOLD` | 応答が遅いときに、テンプレートのボタンによる postback が出るまでの秒数（初期値: `45`）。`0` にすると止めて、常に Push で送るようになります。 |

| `LINE_PENDING_TEXT` | postback のボタンと並べて表示する吹き出しの文言。 |
| `LINE_BUTTON_LABEL` | postback のボタンのラベル（初期値: `Get answer`）。 |
| `LINE_DELIVERED_TEXT` | すでに届いた postback をもう一度押したときの返事（初期値: `Already replied ✅`）。 |
| `LINE_INTERRUPTED_TEXT` | `/stop` で行き場を失った postback のボタンを押したときの返事（初期値: `Run was interrupted before completion.`）。 |

### ntfy（プッシュ通知） {#ntfy-push-notifications}

[ntfy](https://ntfy.sh/) は HTTP を使った軽量のプッシュ通知のサービスです。[ntfy のスマホアプリ](https://ntfy.sh/docs/subscribe/phone/)からトピックを購読し、そのトピックへ投稿することでエージェントと話せます。

| 変数 | 説明 |
|----------|-------------|
| `NTFY_TOPIC` | 購読するトピック（受け取るメッセージ用）。必須です。 |
| `NTFY_SERVER_URL` | サーバーの URL（初期値: `https://ntfy.sh`）。人に見られたくないなら、自分で立てた ntfy を指してください。 |
| `NTFY_TOKEN` | 認証のトークン（任意）。ベアラートークン（`tk_xyz` など）か、Basic 認証用の `user:pass` です。 |
| `NTFY_PUBLISH_TOPIC` | 送り返す返事に使うトピック（指定がなければ `NTFY_TOPIC` になります）。 |
| `NTFY_MARKDOWN` | `true` にすると、返事に `X-Markdown: true` のヘッダーを付けて送ります。初期値: `false`。 |
| `NTFY_ALLOWED_USERS` | 許可一覧（ユーザー ID として扱われますが、ntfy ではトピック名にあたります）。ふつうは `NTFY_TOPIC` と同じ値にします。 |
| `NTFY_ALLOW_ALL_USERS` | 開発時だけの抜け道です — 権限を絞った非公開のトピックでしか安全ではありません。初期値: `false`。 |
| `NTFY_HOME_CHANNEL` | `deliver: ntfy` を指定した cron のジョブの、既定の配信先。 |
| `NTFY_HOME_CHANNEL_NAME` | ホームのチャンネルの分かりやすい名前（指定がなければトピック名になります）。 |

信頼できないトピックで使う前に、[ntfy でのやり取りの案内](/hermes/docs/user-guide/messaging/ntfy/) — とくに **identity model** の節 — を読んでください。

### IRC {#irc}

Hermes を IRC のサーバーにつなぎます。外部の依存はありません。[IRC でのやり取りの案内](/hermes/docs/user-guide/messaging/irc/)を参照してください。

| 変数 | 説明 |
|----------|-------------|
| `IRC_SERVER` | IRC のサーバーのホスト名（たとえば `irc.libera.chat`）。必須です。 |
| `IRC_CHANNEL` | 参加するチャンネル（たとえば `#hermes`）。複数ならカンマで区切ります。必須です。 |
| `IRC_NICKNAME` | ボットのニックネーム（初期値: `hermes-bot`）。必須です。 |
| `IRC_PORT` | サーバーのポート（初期値: TLS ありなら `6697`、なしなら `6667`）。 |
| `IRC_USE_TLS` | TLS を使います（`true`/`false`。6697 番ポートでは初期値が `true`）。 |
| `IRC_SERVER_PASSWORD` | `PASS` のコマンドで使うサーバーのパスワード（任意）。 |
| `IRC_NICKSERV_PASSWORD` | 接続時に自動で IDENTIFY するための NickServ のパスワード（任意）。 |
| `IRC_ALLOWED_USERS` | ボットと話せるニックネームをカンマで区切って並べます。 |
| `IRC_ALLOW_ALL_USERS` | そのチャンネルにいる誰でもボットと話せるようにします（開発時のみ）。 |
| `IRC_HOME_CHANNEL` | cron や通知の配信で使うチャンネル（指定がなければ `IRC_CHANNEL` になります）。 |

### SimpleX {#simplex}

手元の `simplex-chat` のデーモン経由で、Hermes を [SimpleX Chat](https://simplex.chat/) のネットワークにつなぎます。[SimpleX でのやり取りの案内](/hermes/docs/user-guide/messaging/simplex/)を参照してください。

| 変数 | 説明 |
|----------|-------------|
| `SIMPLEX_WS_URL` | simplex-chat のデーモンの WebSocket の URL（たとえば `ws://127.0.0.1:5225`）。 |
| `SIMPLEX_ALLOWED_USERS` | ボットと話せる SimpleX の連絡先の ID をカンマで区切って並べます。 |
| `SIMPLEX_ALLOW_ALL_USERS` | どの連絡先でもボットと話せるようにします（開発時のみ — 許可一覧を無効にします）。 |
| `SIMPLEX_AUTO_ACCEPT` | 届いた連絡先の申請を自動で受け入れます（初期値: `true`）。 |
| `SIMPLEX_GROUP_ALLOWED` | ボットが参加する SimpleX のグループ ID をカンマで区切って並べます。`*` にするとどのグループでも許可します。書かなければグループのメッセージを完全に無視します（安全側の初期値です — そうしないと、グループにいるボットは全員のやり取りを処理してしまいます）。 |
| `SIMPLEX_HOME_CHANNEL` | cron や通知の配信で使う、既定の連絡先やグループの ID。 |
| `SIMPLEX_HOME_CHANNEL_NAME` | ホームのチャンネルの分かりやすい名前（指定がなければ ID になります）。 |

### Photon {#photon}

Node の補助プロセス経由で、Hermes を [Photon](https://photon.codes/) / Spectrum（iMessage とそのほかの Spectrum のプラットフォーム）につなぎます。[Photon でのやり取りの案内](/hermes/docs/user-guide/messaging/photon/)を参照してください。

| 変数 | 説明 |
|----------|-------------|
| `PHOTON_PROJECT_ID` | Spectrum のプロジェクトの id（そのプロジェクトの `spectrumProjectId`。`hermes photon setup` が設定します）。 |
| `PHOTON_PROJECT_SECRET` | Spectrum のプロジェクトの id と対になる秘密の値（`hermes photon setup` が設定します）。 |
| `PHOTON_ALLOWED_USERS` | ボットと話せる E.164 の電話番号をカンマで区切って並べます。 |
| `PHOTON_ALLOW_ALL_USERS` | どの送信者でもボットを動かせるようにします（開発時のみ — 許可一覧を無効にします）。 |
| `PHOTON_REQUIRE_MENTION` | グループのチャットのメッセージは、呼びかけの言葉に当てはまらない限り無視します（`true`/`false`、初期値は `false`）。 |
| `PHOTON_MENTION_PATTERNS` | グループのチャットで使う呼びかけの言葉の正規表現（JSON の配列、またはカンマや改行で区切ります。指定がなければ Hermes の呼びかけの言葉になります）。 |
| `PHOTON_HOME_CHANNEL` | cron や通知の配信で使う、既定の Photon の宛先です。Spectrum のスペースの id、1対1のやり取りの GUID、E.164 の電話番号そのままのいずれかです。 |
| `PHOTON_HOME_CHANNEL_NAME` | ホームのチャンネルの分かりやすい名前。 |
| `PHOTON_MARKDOWN` | エージェントの返事をマークダウンで送ります — iMessage はそのまま表示し、ほかの Spectrum のプラットフォームでは素のテキストになります（`true`/`false`、初期値は `true`）。 |
| `PHOTON_REACTIONS` | 処理の状態としてメッセージに 👀/👍/👎 のタップバックを付け、ボットのメッセージへのタップバックをエージェントへ回します（`true`/`false`、初期値は `false`）。 |
| `PHOTON_TELEMETRY` | 補助プロセスで Spectrum の SDK の計測を有効にします（`true`/`false`、初期値は `false`。`hermes photon telemetry on|off` で切り替えます）。 |
| `PHOTON_SIDECAR_PORT` | Node の補助プロセスの制御と受け取りに使うループバックのポート（初期値は `8789`）。 |
| `PHOTON_SIDECAR_AUTOSTART` | 接続時に Node の補助プロセスを起動します（`true`/`false`、初期値は `true`）。 |
| `PHOTON_NODE_BIN` | node のバイナリの場所（初期値: `shutil.which('node')`）。 |
| `PHOTON_DASHBOARD_HOST` | Photon Dashboard の API のホスト（初期値は `https://app.photon.codes`）。 |
| `PHOTON_SPECTRUM_HOST` | Photon Spectrum の API のホスト（初期値は `https://spectrum.photon.codes`）。 |

### Buzz（Nostr のコミュニティ） {#buzz-nostr-communities}

| 変数 | 説明 |
|----------|-------------|
| `BUZZ_RELAY_URL` | Buzz のコミュニティのリレーのベース URL（たとえば `https://mycommunity.communities.buzz.xyz`） |
| `BUZZ_PRIVATE_KEY` | エージェントの Buzz での身分に使う Nostr の秘密鍵（nsec か16進） — Buzz で唯一の秘密の情報です |
| `BUZZ_CREDENTIALS_FILE` | nsec を収めた JSON の認証情報のファイル（`BUZZ_PRIVATE_KEY` がないときに使われます） |
| `BUZZ_CHANNELS` | 見張るチャンネルの UUID をカンマで区切って並べます（初期値: 参加しているすべてのチャンネル） |
| `BUZZ_HOME_CHANNEL` | cron や通知の配信で使うチャンネルの UUID（指定がなければ、見張っている最初のチャンネルになります） |
| `BUZZ_ALLOWED_USERS` | エージェントと話せる npub や16進の公開鍵をカンマで区切って並べます |
| `BUZZ_ALLOW_ALL_USERS` | コミュニティにいる誰でもエージェントと話せるようにします（`true`/`false`） |
| `BUZZ_TRANSPORT` | 受け取りの経路: `auto`（WebSocket で、だめなら問い合わせに切り替えます。初期値）、`websocket`、`poll` |
| `BUZZ_POLL_INTERVAL` | 受け取りのために問い合わせる間隔の秒数（初期値: `4`） |
| `BUZZ_AUTH_TAG` | NIP-42 の WebSocket の認証で使う、NIP-OA の所有者証明の認証タグの JSON（任意） |
| `BUZZ_CLI_PATH` | buzz の CLI のバイナリの場所（初期値: PATH 上の `buzz`、次に `~/bin/buzz`） |

### Microsoft Teams（連携） {#microsoft-teams-adapter}

Microsoft Teams のプラットフォームとの連携（Bot Framework / Azure AD）です。上の [Microsoft Graph（Teams の会議）](#microsoft-graph-teams-meetings)の連携とは別のものです。[Teams でのやり取りの案内](/hermes/docs/user-guide/messaging/teams/)を参照してください。

| 変数 | 説明 |
|----------|-------------|
| `TEAMS_CLIENT_ID` | Azure AD のアプリケーション（Bot Framework）のクライアント ID。 |
| `TEAMS_CLIENT_SECRET` | Azure AD のアプリケーションのクライアントの秘密の値。 |
| `TEAMS_TENANT_ID` | ボットのアプリケーションを置く Azure AD のテナント ID。 |
| `TEAMS_HOST` | webhook が待ち受けるホスト（初期値: 未設定 → IPv4 と IPv6 の両方で、すべてのインターフェース）。 |
| `TEAMS_PORT` | webhook が待ち受けるポート（Bot Framework の初期値: `3978`）。 |
| `TEAMS_ALLOWED_USERS` | ボットと話せる Teams のユーザー ID や UPN をカンマで区切って並べます。 |
| `TEAMS_ALLOW_ALL_USERS` | どの Teams の利用者でもボットを動かせるようにします（開発時のみ）。 |
| `TEAMS_HOME_CHANNEL` | cron や通知の配信で使う、既定のチャットやチャンネルの ID。 |
| `TEAMS_HOME_CHANNEL_NAME` | Teams のホームのチャンネルの表示名。 |

### Raft {#raft}

| 変数 | 説明 |
|----------|-------------|
| `RAFT_PROFILE` | Raft のエージェントのプロファイルの名前 — 設定すると連携が自動で有効になります。 |

### メッセージの細かな調整 {#advanced-messaging-tuning}

送信するメッセージのまとめ方を、プラットフォームごとに細かく調整する設定です。ほとんどの人が触ることはありません。初期値は、それぞれのプラットフォームの回数の上限を守りつつ、もたつかないように決めてあります。

| 変数 | 説明 |
|----------|-------------|
| `HERMES_TELEGRAM_TEXT_BATCH_DELAY_SECONDS` | 順番待ちの Telegram のテキストのかたまりを送り出すまでの、待ちの時間（初期値: `0.6`）。 |
| `HERMES_TELEGRAM_TEXT_BATCH_SPLIT_DELAY_SECONDS` | 1件の Telegram のメッセージが長さの上限を越えて分割されたとき、かたまりのあいだに置く待ち時間（初期値: `2.0`）。 |
| `HERMES_SIMPLEX_TEXT_BATCH_DELAY` | 立て続けに届いたテキストのメッセージを1つの MessageEvent にまとめるための、静かな時間の秒数（初期値: `0.8`）。Telegram のテキストのまとめ方と同じ考え方です。 |
| `HERMES_TELEGRAM_MEDIA_BATCH_DELAY_SECONDS` | 順番待ちの Telegram の画像などを送り出すまでの、待ちの時間（初期値: `0.6`）。 |
| `HERMES_TELEGRAM_FOLLOWUP_GRACE_SECONDS` | エージェントが話し終えたあと、続きのメッセージを送るまでの待ち時間です。最後の応答のかたまりと競り合わないようにします。 |
| `HERMES_TELEGRAM_HTTP_CONNECT_TIMEOUT` / `_READ_TIMEOUT` / `_WRITE_TIMEOUT` / `_POOL_TIMEOUT` | 土台になっている `python-telegram-bot` の HTTP の待ち時間の上限を上書きします（秒）。 |
| `HERMES_TELEGRAM_INIT_TIMEOUT` | ゲートウェイの起動時、Telegram の `initialize()` の接続の連なりについて、1回あたりに待つ上限の秒数です。届かない予備の IP の連なりのせいで起動がいつまでも進まなくなるのを防ぎます（初期値: `30`）。 |
| `HERMES_TELEGRAM_HTTP_POOL_SIZE` | Telegram の API への同時の HTTP 接続の上限。 |
| `HERMES_TELEGRAM_DISABLE_FALLBACK_IPS` | DNS が引けないときに使う、書き込まれた Cloudflare の予備の IP を止めます（`true`/`false`）。 |
| `HERMES_DISCORD_TEXT_BATCH_DELAY_SECONDS` | 順番待ちの Discord のテキストのかたまりを送り出すまでの、待ちの時間（初期値: `0.6`）。 |
| `HERMES_DISCORD_TEXT_BATCH_SPLIT_DELAY_SECONDS` | Discord のメッセージが長さの上限を越えて分割されたとき、かたまりのあいだに置く待ち時間（初期値: `2.0`）。 |
| `HERMES_DISCORD_LIVENESS_INTERVAL_SECONDS` | `discord.websocket_liveness_interval_seconds` を互換のために手で上書きするものです。動いている Discord のゲートウェイの WebSocket を見に行く間隔です（初期値: `15`。`0` にすると止まります）。`config.yaml` の項目のほうを使ってください。 |
| `HERMES_DISCORD_LIVENESS_FAILURE_THRESHOLD` | `discord.websocket_liveness_failure_threshold` を互換のために手で上書きするものです。つなぎ直すまでに、WebSocket が続けて不調と判定される回数です（初期値: `2`）。`config.yaml` の項目のほうを使ってください。 |
| `HERMES_MATRIX_TEXT_BATCH_DELAY_SECONDS` / `_SPLIT_DELAY_SECONDS` | Telegram のまとめ方の設定にあたる Matrix 版です。 |
| `HERMES_FEISHU_TEXT_BATCH_DELAY_SECONDS` / `_SPLIT_DELAY_SECONDS` / `_MAX_CHARS` / `_MAX_MESSAGES` | Feishu のまとめ方の調整 — 待ち時間、分割時の待ち時間、メッセージあたりの最大文字数、1回あたりの最大メッセージ数です。 |
| `HERMES_FEISHU_MEDIA_BATCH_DELAY_SECONDS` | Feishu の画像などを送り出すまでの待ち時間。 |
| `HERMES_FEISHU_DEDUP_CACHE_SIZE` | Feishu の webhook の重複除けのキャッシュの大きさ（初期値: `1024`）。 |
| `HERMES_WECOM_TEXT_BATCH_DELAY_SECONDS` / `_SPLIT_DELAY_SECONDS` | WeCom のまとめ方の調整。 |
| `HERMES_VISION_DOWNLOAD_TIMEOUT` | 画像を視覚のモデルへ渡す前に取ってくるときの、待ち時間の上限の秒数（初期値: `30`）。 |
| `HERMES_VISION_MAX_CONCURRENCY` | プロセス全体で同時に行える画像の**変換や縮小**の上限です（`auxiliary.vision.max_concurrency` の上書き。初期値: そのマシンの CPU のコア数で、上限なし）。CPU を使う変換の段だけを抑えるので、動画のコマを一気に処理してもすべてのコアが埋まってイベントループが止まることはありません — LLM の呼び出しはそのまま並行に走ります。`< 1` の値は無視されます。 |
| `HERMES_RESTART_DRAIN_TIMEOUT` | ゲートウェイ: `/restart` のとき、動いている処理が片付くのを待つ秒数です。これを過ぎると強制的に再起動します（初期値: `900`）。 |
| `HERMES_GATEWAY_PLATFORM_CONNECT_TIMEOUT` | ゲートウェイの起動時と接続し直すときの、プラットフォームごとの接続の待ち時間の上限（秒。`0` や負の値はいつまでも待ちます）。接続の試みだけでなく、Discord の連携が準備できるのを待つ時間にも効くので、そろえるスラッシュコマンドが多いアカウントでも起動の途中で打ち切られません。`config.yaml` の `gateway.platform_connect_timeout` から渡されます（初期値は `30`）。この環境変数は手動の上書きで、明示的に設定すればそちらが勝ちます。 |
| `HERMES_GATEWAY_BUSY_INPUT_MODE` | エージェントが取り込み中のときの、ゲートウェイの既定の受け止め方: `queue`、`steer`、`interrupt`。チャットごとに `/busy` で上書きできます。 |
| `HERMES_GATEWAY_BUSY_ACK_ENABLED` | エージェントが取り込み中に入力があったとき、ゲートウェイが受け取りの合図（⚡/⏳/⏩）を送るかどうか（初期値: `true`）。`false` にするとこれらのメッセージが出なくなります — 入力は今までどおり順番待ち・軌道修正・割り込みとして扱われ、チャットへの返事だけが静かになります。`config.yaml` の `display.busy_ack_enabled` から渡されます。 |
| `HERMES_GATEWAY_NO_SUPERVISE` | s6-overlay の Docker のイメージの中で、`hermes gateway run` のときの自動の見守りを使わず、s6 より前の前面での動き（自動の再起動なし、ゲートウェイがコンテナの主プロセス）に戻します。有効になる値は `1`、`true`、`yes` です。CLI の `--no-supervise` と同じです。s6 のイメージの外では何もしません。 |
| `HERMES_GATEWAY_BOOTSTRAP_STATE` | s6-overlay の Docker のイメージの中で、まっさらなボリュームでのゲートウェイの**最初の**状態を決めます。まっさらなボリュームには保存された `gateway_state.json` がないので、起動時の調整役は `gateway-default` の枠を登録するだけで、**止まったまま**にします（最後に記録された状態が `running` のときにだけ自動で起動するからです）。これを `running` にすると、初回起動の設定のフックが調整役より *先に* `gateway_state.json` の種を置くので、いちばん最初の起動からゲートウェイが立ち上がります。有効なのは `running` という値だけです。初回起動のときだけ働き、すでにある `gateway_state.json` を上書きすることはありません。ですから、意図して止めたゲートウェイは再起動をまたいでも止まったままです。s6 のイメージの外では何もしません。 |
| `GATEWAY_RELAY_URL` | 試験中のリレーの接続役の WebSocket のベース URL です。設定すると、ゲートウェイは汎用の `relay` の連携を登録し、こちらから接続役につなぎに行きます。`config.yaml` の `gateway.relay_url` と対応します。 |
| `GATEWAY_RELAY_ID` | `hermes gateway enroll` や運用側の自動登録で割り当てられる、リレーのゲートウェイの識別子。`gateway.relay_id` と対応します。 |
| `GATEWAY_RELAY_SECRET` | WebSocket の認証に使う、ゲートウェイごとのリレーの秘密の値です。すでに設定されていれば、運用側の自動登録は行われません。`gateway.relay_secret` と対応します。 |
| `GATEWAY_RELAY_DELIVERY_KEY` | リレーや素通しの認証との互換のために残されている、接続役が発行する配信のキーです。いまのリレーでは、届くメッセージはゲートウェイ側の HTTP の受け口ではなく、こちらからつないだ WebSocket に来ます。 |
| `GATEWAY_RELAY_ENROLL_TOKEN` | `--token` を明示的に渡さなかったとき、`hermes gateway enroll` が使う登録用のトークン。 |
| `GATEWAY_RELAY_PLATFORM` | リレーの能力の申告に載せるプラットフォーム名（任意）。 |
| `GATEWAY_RELAY_BOT_ID` | リレーの能力の申告に載せるボットの識別子（任意）。 |
| `GATEWAY_RELAY_ENDPOINT` | コールバックや素通しの URL を必要とする接続役のために申告する、ゲートウェイの接続先（任意）。WebSocket だけで受け取る既定の経路では必要ありません。`gateway.relay_endpoint` と対応します。 |
| `GATEWAY_RELAY_ROUTE_KEYS` | 接続役に申告するリレーの経路のキーをカンマで区切って並べます。`gateway.relay_route_keys` と対応します。 |
| `HERMES_FILE_MUTATION_VERIFIER` | やり取りごとに、ファイルの変更を確かめる注記を末尾に付けます（初期値: `true`）。有効にすると Hermes は、そのやり取りの中で失敗し、そのあと成功した書き込みで置き換えられなかった `write_file` や `patch` の呼び出しを並べて知らせます。止めるには `0`、`false`、`no`、`off` にします。`config.yaml` の `display.file_mutation_verifier` と対応し、環境変数があればそちらが勝ちます。 |
| `HERMES_CRON_TIMEOUT` | cron のジョブでエージェントを動かすときの、何もしていない時間の上限の秒数（初期値: `600`）。ツールを呼び続けていたり応答が届いていたりするあいだは、いつまでも動けます — これが効くのは止まっているときだけです。`0` にすると上限がなくなります。 |
| `HERMES_CRON_SCRIPT_TIMEOUT` | cron のジョブに付けた事前のスクリプトの待ち時間の上限の秒数（初期値: `3600`）。効くのはスクリプトだけで、スキルやエージェントのジョブは別枠の `HERMES_CRON_TIMEOUT` を使います。`config.yaml` の `cron.script_timeout_seconds` でも設定できます。 |
| `HERMES_CRON_MEDIA_SEND_TIMEOUT` | cron の配信で、動いているゲートウェイの連携を通して添付を1件送るときの、待ち時間の上限の秒数（初期値: `300`）。大きな添付（長い読み上げの音声、大きな書き出し）の送信が途中で切れるなら上げてください。`config.yaml` の `cron.media_send_timeout_seconds` でも設定できます。 |
| `HERMES_CRON_MAX_PARALLEL` | 1回のきっかけで並行して動かす cron のジョブの上限（初期値: `4`）。 |

## NeMo Relay {#nemo-relay}

| 変数 | 説明 |
|----------|-------------|
| `HERMES_NEMO_RELAY_PLUGINS_TOML` | Hermes の中核がプロセス全体で読み込む、標準の NeMo Relay の `plugins.toml` の場所をはっきり指定します。設定しなければ、Hermes は Relay のミドルウェア、動的なプラグイン、書き出しの仕組みを立ち上げません。廃止された `HERMES_NEMO_RELAY_ATOF_*` と `HERMES_NEMO_RELAY_ATIF_*` の変数は無視されます。それらの出力は、指定したファイルの中で設定してください。[NeMo Relay の可観測性の設定](https://docs.nvidia.com/nemo/relay/configure-plugins/observability/about)を参照してください。 |

## エージェントの振る舞い {#agent-behavior}

| 変数 | 説明 |
|----------|-------------|
| `HERMES_MAX_ITERATIONS` | 1つの会話で行えるツールの呼び出しの繰り返しの上限（初期値: 500） |
| `HERMES_INFERENCE_MODEL` | モデル名をプロセスの単位で上書きします（そのセッションでは `config.yaml` より優先されます）。`-m`/`--model` のフラグでも指定できます。 |
| `HERMES_YOLO_MODE` | `1` にすると、危険なコマンドの承認の確認を飛ばします。`--yolo` と同じです。 |
| `HERMES_ACCEPT_HOOKS` | `config.yaml` に書かれた、まだ確認していないシェルのフックを、端末で聞かずに自動で承認します。`--accept-hooks` や `hooks_auto_accept: true` と同じです。 |
| `HERMES_IGNORE_USER_CONFIG` | `~/.hermes/config.yaml` を読まず、組み込みの初期値を使います（`.env` の認証情報は読み込まれます）。`--ignore-user-config` と同じです。 |
| `HERMES_IGNORE_RULES` | `AGENTS.md`、`SOUL.md`、`.cursorrules`、記憶、先に読み込むスキルの自動の差し込みを飛ばします。`--ignore-rules` と同じです。 |
| `HERMES_SAFE_MODE` | 不具合を調べるための動き: すべての作り込みを止めます — プラグインの検出、MCP のサーバーの読み込み、シェルのフックの登録を飛ばします。`--safe-mode` が自動で設定します（そちらは上の2つのフラグも設定します）。 |
| `HERMES_TOOL_PROGRESS` | config-v12 を下限とする対応範囲では使えなくなり、この変数は無視されます。`config.yaml` の `display.tool_progress` を使ってください。 |
| `HERMES_TOOL_PROGRESS_MODE` | ツールの進み具合の表示についての、互換のために残された非推奨の変数です（ゲートウェイは今も予備として読みます）。`config.yaml` の `display.tool_progress` を使ってください。 |
| `HERMES_HUMAN_DELAY_MODE` | 返事の間合い: `off`/`natural`/`custom` |
| `HERMES_HUMAN_DELAY_MIN_MS` | 自分で決める待ち時間の下限（ミリ秒） |
| `HERMES_HUMAN_DELAY_MAX_MS` | 自分で決める待ち時間の上限（ミリ秒） |
| `HERMES_QUIET` | 必須ではない出力を抑えます（`true`/`false`） |
| `CODEX_HOME` | [Codex app-server の実行環境](/hermes/docs/user-guide/features/codex-app-server-runtime/)を有効にしているとき、Codex CLI が設定と認証を読むディレクトリを上書きします（初期値: `~/.codex`）。Hermes の移行処理は、管理された部分を `<CODEX_HOME>/config.toml` に書きます。 |
| `HERMES_KANBAN_TASK` | カンバンの振り分け役がワーカーを起動するときに設定します（作業の UUID）。ワーカーと、そこから起動する `hermes-tools` の MCP の子プロセスがこれを受け継ぐので、カンバンのツールが正しく働きます。手で設定しないでください。 |
| `HERMES_ACP_SKIP_CONFIGURED_MCP` | [ACP のホスト](/hermes/docs/user-guide/features/acp/#host-integration)が、起動する Hermes の子プロセスに設定します。`1` にすると、ACP の JSON-RPC のやり取りを始める前に、`config.yaml` に書かれた全体の MCP のサーバーを起動しません。セッションの MCP のサーバーを `session/new` で自分から渡すホストのためのものです。ACP のセッションが渡したサーバーは今までどおり登録されます。それ以外の値では既定のままです。手で設定しないでください。 |
| `HERMES_API_TIMEOUT` | LLM の API の呼び出しの待ち時間の上限の秒数（初期値: `1800`） |
| `HERMES_API_CALL_STALE_TIMEOUT` | 応答を少しずつ受け取らない呼び出しが、止まっていると判断されるまでの秒数（初期値: `90`）。設定しなければ、手元のプロバイダーでは自動で無効になります。とても大きな文脈では長くなることもあります。`config.yaml` の `providers.<id>.stale_timeout_seconds` や `providers.<id>.models.<model>.stale_timeout_seconds` でも設定できます。 |
| `HERMES_STREAM_READ_TIMEOUT` | 応答を少しずつ受け取るときの、ソケットの読み取りの待ち時間の上限の秒数（初期値: `120`）。手元のプロバイダーでは自動で `HERMES_API_TIMEOUT` まで伸びます。手元の LLM が長いコードを書いている途中で切れるなら、上げてください。 |
| `HERMES_STREAM_STALE_TIMEOUT` | 応答が止まったと判断するまでの秒数（初期値: `180`）。手元のプロバイダーでは自動で無効になります。この時間のあいだ何も届かなければ、接続を切ります。 |
| `HERMES_LOCAL_STREAM_STALE_TIMEOUT` | 手元のプロバイダー（Ollama、oMLX、llama-cpp）で、応答が止まったと判断するまでの上限の秒数（初期値: `900`）。基本の判断の時間が初期値のままで、手元の接続先だと分かったとき、以前のように完全に無効にするのではなく、この有限の上限を使います。ですから固まった手元のサーバーも、いつまでも待たされずにいずれ検出されます。`config.yaml` の `agent.local_stream_stale_timeout` でも設定できます。 |
| `HERMES_STREAM_RETRIES` | 一時的なネットワークの不調のとき、応答の途中でつなぎ直す回数（初期値: `3`）。 |
| `HERMES_STREAM_STALE_GIVEUP` | やり取りをまたぐ安全装置です。応答が1つも完結しないまま、止まったと判断して打ち切ることがこの回数続いたら、次からは待ち時間を待たずにその場で、手がかりのあるエラーで中止します（初期値: `5`。`0` で無効）。応答が1つでも完結するか、`/model` で切り替えるか、予備のモデルに移るか、やり取りの初めに本来のモデルへ戻ると、数え直しになります。 |
| `HERMES_AGENT_TIMEOUT` | 動いているエージェントについて、ゲートウェイが何もしていない時間の上限とする秒数（初期値: `1800`、30分）。ツールの呼び出しや応答が届くたびに数え直されます。`0` にすると止まります。 |
| `HERMES_GATEWAY_MAX_STARTS` | 起動が繰り返される事態への安全装置です。この時間の窓の中でゲートウェイの起動がこの回数を越えると、少しずつ長くなる待ち時間を挟んで連鎖を断ちます（初期値: `5`。`0` で無効）。`config.yaml` の `gateway.respawn_storm.max_starts` でも設定できます。 |
| `HERMES_GATEWAY_START_WINDOW_S` | その安全装置が見る時間の窓の秒数（初期値: `120`）。`config.yaml` の `gateway.respawn_storm.window_seconds` でも設定できます。 |
| `HERMES_AGENT_TIMEOUT_WARNING` | ゲートウェイ: 何もしていない時間がこの秒数を越えたら、警告のメッセージを送ります（初期値: `HERMES_AGENT_TIMEOUT` の75%）。 |
| `HERMES_AGENT_NOTIFY_INTERVAL` | ゲートウェイ: 長く続くエージェントのやり取りで、進み具合を知らせる間隔の秒数。 |
| `HERMES_CHECKPOINT_TIMEOUT` | ファイルの控えを作るときの待ち時間の上限の秒数（初期値: `30`）。 |
| `HERMES_EXEC_ASK` | ゲートウェイで動かすときに、実行の承認の確認を出します（`true`/`false`） |
| `HERMES_ENABLE_PROJECT_PLUGINS` | エージェントの読み込みとダッシュボードのウェブサーバーの両方で、`./.hermes/plugins/` にあるリポジトリの中のプラグインを自動で見つけるようにします。有効になる値は `1` / `true` / `yes` / `on` です（大文字と小文字は区別しません）。それ以外は — `0`、`false`、`no`、`off`、空の文字列も含めて — すべて**無効**として扱われます（初期状態）。なお GHSA-5qr3-c538-wm9j（#29156）以降、ダッシュボードのウェブサーバーは、この変数が有効でもプロジェクトのプラグインの Python の `api` のファイルを自動で読み込むことを断ります。プロジェクトのプラグインは静的な JS や CSS で画面を広げられますが、その裏側の経路が読み込まれるのは `~/.hermes/plugins/` の下へ移したときだけです。 |
| `HERMES_PLUGINS_DEBUG` | `1` か `true` にすると、プラグインを見つける過程の詳しいログが標準エラー出力に出ます — 調べたディレクトリ、読んだ宣言、飛ばした理由、読み込みや `register()` の失敗の全文です。プラグインを作る人のためのものです。 |
| `HERMES_BACKGROUND_NOTIFICATIONS` | ゲートウェイでの、裏で動く処理の知らせ方: `concise`（初期値）、`all`、`result`、`error`、`off` |
| `HERMES_EPHEMERAL_SYSTEM_PROMPT` | API を呼ぶときに差し込む、その場かぎりのシステムのプロンプト（セッションには残りません） |
| `HERMES_PREFILL_MESSAGES_FILE` | API を呼ぶときに差し込む、その場かぎりの前置きのメッセージを収めた JSON ファイルの場所。 |
| `HERMES_ALLOW_PRIVATE_URLS` | `true`/`false` — ツールが localhost や社内のネットワークの URL を取りに行くことを許します。ゲートウェイで動かすときは初期状態で無効です。 |
| `HERMES_REDACT_SECRETS` | `true`/`false` — ツールの出力、ログ、チャットの返事で、秘密の情報を伏せるかどうかを決めます（初期値: `true`）。 |
| `HERMES_WRITE_SAFE_ROOT` | 挙げたディレクトリの外への `write_file` や `patch` の書き込みを**きっぱり止める**、ディレクトリの接頭辞です（承認の確認は出ません）。`os.pathsep`（Unix なら `:`、Windows なら `;`）で区切って複数指定できます。下の [HERMES_WRITE_SAFE_ROOT](#hermes_write_safe_root) を参照してください。 |
| `HERMES_DISABLE_LAZY_INSTALLS` | 書き換えられない `/opt/hermes` へ実行時に依存が入るのを防ぐため、公式の Docker のイメージが自動で設定する内部の橋渡しの変数です。利用者が使う同じ意味の設定は `config.yaml` の `security.allow_lazy_installs: false` です。これを `.env` に書かないでください。 |
| `HERMES_DISABLE_FILE_STATE_GUARD` | `1` にすると、`patch` と `write_file` の「読んだあとにファイルが変わっています」という見張りを止めます。 |
| `HERMES_BUNDLED_SKILLS` | 起動時に読み込む同梱のスキルの一覧を、カンマで区切って上書きします。 |
| `HERMES_OPTIONAL_SKILLS` | 初回の起動時に自動で入れる、任意のスキルの名前をカンマで区切って並べます。 |
| `HERMES_DEBUG_INTERRUPT` | `1` にすると、割り込みと取り消しの詳しい経過を `agent.log` に記録します。 |
| `HERMES_DUMP_REQUESTS` | API のリクエストの中身をログのファイルへ書き出します（`true`/`false`） |
| `HERMES_DUMP_REQUEST_STDOUT` | API のリクエストの中身を、ログのファイルではなく標準出力へ書き出します。 |
| `HERMES_OAUTH_TRACE` | `1` にすると、OAuth のトークンの交換と更新の試みを記録します。伏せ字にした時間の情報も含みます。 |
| `HERMES_AGENT_HELP_GUIDANCE` | 独自の構成のために、システムのプロンプトへ案内の文章を書き足します。 |
| `HERMES_AGENT_LOGO` | CLI の起動時に出る、文字で描かれたロゴを差し替えます。 |
| `DELEGATION_MAX_CONCURRENT_CHILDREN` | `delegate_task` の1回のまとまりで並行して動かすサブエージェントの上限（初期値: `3`、下限は1、上限なし）。`config.yaml` の `delegation.max_concurrent_children` でも設定でき、そちらが優先されます。 |

### HERMES_WRITE_SAFE_ROOT {#hermes_write_safe_root}

この変数を設定すると、`write_file` と `patch` は、挙げたディレクトリの下にある場所しか対象にできなくなります。その外にある場所は**その場で断られます** — 危険なコマンドの承認の仕組みには回されず、押し切るための確認も出ません。

公式の Docker のイメージは `HERMES_HOME=/opt/data` と並べて `HERMES_WRITE_SAFE_ROOT=/opt/data` を設定しているので、エージェントはマウントされたデータのボリュームの外へ出られません。

**書き込みを閉じ込めるつもりがないなら、これを `~/.hermes/.env` に書かないでください。** よくある間違いは、プロジェクトのディレクトリを指しておきながら、エージェントに `~/.hermes/cron/jobs.json` や `~/.hermes/skills/`、プロファイルの下のスクリプトを直させようとすることです。それらは閉じ込めた場所の外なので、そこへの `write_file` や `patch` はすべて `outside HERMES_WRITE_SAFE_ROOT` のエラーで失敗します。

作業場所と Hermes の状態の両方を許すには、接頭辞を両方並べてください（順番は問いません）。

```bash
export HERMES_WRITE_SAFE_ROOT=/path/to/project:/home/you/.hermes
```

変数を消すか `.env` から取り除けば、ふつうの書き込みに戻ります（認証情報の場所を禁じる一覧は今までどおり効きます — [ファイルへの書き込みの安全](/hermes/docs/user-guide/security/#file-write-safety)を参照してください）。

## 画面まわり {#interface}

| 変数 | 説明 |
|----------|-------------|
| `HERMES_TUI` | `1` にすると、従来の CLI ではなく [TUI](/hermes/docs/user-guide/tui/) を起動します。`--tui` を渡すのと同じです。 |
| `HERMES_TUI_DIR` | できあがった `ui-tui/` のディレクトリの場所（`dist/entry.js` と中身の入った `node_modules` が必要です）。初回起動時の `npm install` を飛ばすために、ディストリビューションや Nix が使います。 |
| `HERMES_TUI_RESUME` | 起動時に、ID を指定して TUI のセッションを再開します。設定すると、`hermes --tui` は新しいセッションを作らずに、名指しされたセッションを引き継ぎます — 接続が切れたり端末が落ちたりしたあと、つなぎ直すのに便利です。 |
| `HERMES_TUI_THEME` | TUI の配色を固定します: `light`、`dark`、または背景色の6文字の16進の値（たとえば `ffffff` や `1a1a2e`）。設定しなければ、Hermes は `COLORFGBG` と端末への問い合わせで自動的に判断します。この変数は、`COLORFGBG` を設定しない端末（Ghostty、Warp、iTerm2 など）でその判断を上書きします。 |
| `HERMES_INFERENCE_MODEL` | `config.yaml` を書き換えずに、`hermes -z` や `hermes chat` のモデルを固定します。`--provider` のフラグと組み合わせて使います。実行のたびに既定のモデルを変えたい、スクリプトからの呼び出し（sweeper、CI、まとめて動かす仕組み）に便利です。 |

## セッションの設定 {#session-settings}

| 変数 | 説明 |
|----------|-------------|
| `SESSION_IDLE_MINUTES` | 何もしていない時間がこの分数を越えたら、セッションを作り直します（初期値: 1440） |
| `SESSION_RESET_HOUR` | 毎日作り直す時刻。24時間表記です（初期値: 4 = 午前4時） |
| `HERMES_SESSION_ID` | **Hermes が起動するすべてのツールの子プロセスへ自動的に渡されます**（`terminal`、`execute_code`、残り続けるシェル、Docker や Singularity のバックエンド、任せたサブエージェントの実行）。エージェントが、いまのセッションの ID を設定します。ツールから呼ばれる自作のスクリプトは、これを読むことで自分の出力や記録、副作用を、もとの Hermes のセッションと結び付けられます。**手で設定しないでください** — 親のシェルから上書きしても、効くのはエージェントの実行の外だけで、エージェントがセッションを始めた瞬間に上書きされます。 |
| `AI_AGENT` | **CLI とゲートウェイの入り口が `hermes-agent` に設定し**（外側の仕組みがすでに設定しているときは除きます）、ターミナルのツールのすべてのシェルへ渡されます — リモートのバックエンド（Docker、SSH、Modal、Daytona、Singularity、Vercel）も含みます。子プロセスに誰が動かしているかを伝えるための、エージェントをまたいだ新しい標準です。汎用の道具（たとえば huggingface_hub のエージェントの検出）は、これを読んで AI のエージェントの下で動いていることを知ります。値は、公開されているエージェントの仕組みの登録簿にある Hermes の id と同じです。手で設定しないでください。 |
| `HERMES_AGENT` | **CLI とゲートウェイの入り口が `true` に設定し**、ターミナルのツールのすべてのシェルへ渡されます。子プロセスが、自分は Hermes の中で動いていると判別できるようにするためです。手で設定しないでください。 |

## 文脈の圧縮（config.yaml のみ） {#context-compression-configyaml-only}

文脈の圧縮は `config.yaml` からだけ設定します — 対応する環境変数はありません。しきい値の設定は `compression:` のまとまりにあり、要約に使うモデルやプロバイダーは `auxiliary.compression:` の下にあります。

```yaml
compression:
  enabled: true
  threshold: 0.50
  target_ratio: 0.20         # fraction of threshold to preserve as recent tail
  protect_last_n: 20         # minimum recent messages to keep uncompressed
```

:::info 従来の設定からの移行
`compression.summary_model`、`compression.summary_provider`、`compression.summary_base_url` を使っていた古い設定は、最初に読み込むときに自動で `auxiliary.compression.*` へ移されます。
:::

## 補助的な作業の上書き {#auxiliary-task-overrides}

| 変数 | 説明 |
|----------|-------------|
| `AUXILIARY_VISION_PROVIDER` | 画像を見る作業のプロバイダーを上書きします |
| `AUXILIARY_VISION_MODEL` | 画像を見る作業のモデルを上書きします |
| `AUXILIARY_VISION_BASE_URL` | 画像を見る作業で直接つなぐ、OpenAI 互換の接続先 |
| `AUXILIARY_VISION_API_KEY` | `AUXILIARY_VISION_BASE_URL` と組み合わせて使う API キー |

:::note
`AUXILIARY_WEB_EXTRACT_*` の変数はもう使われません。`web_extract` とブラウザの画面の取り込みは、補助の LLM を使わなくなりました。長いページや取り込んだ画面は決まった規則で切り詰められ、全文はディスクに置かれるので、`read_file` でページをめくって読めます。
:::

作業ごとに直接の接続先を使う場合、Hermes はその作業に設定された API キーか `OPENAI_API_KEY` を使います。そうした独自の接続先に `OPENROUTER_API_KEY` を使い回すことはありません。

## 予備のプロバイダー（config.yaml のみ） {#fallback-providers-configyaml-only}

主となるモデルの予備の連なりは `config.yaml` からだけ設定します — 対応する環境変数はありません。いちばん上の階層に `fallback_providers` の並びを足し、`provider` と `model` の項目を書けば、主のモデルでエラーが出たときに自動で切り替わります。プロバイダーが `auto` の補助的な作業も、Hermes に組み込まれた補助の探索の連なりより先に、この連なりを見ます。

```yaml
fallback_providers:
  - provider: openrouter
    model: anthropic/claude-sonnet-4
```

いちばん上の階層に1つだけ書く従来の `fallback_model` の形も、互換のために今も読まれますが、新しく書くなら `fallback_providers` を使ってください。作業ごとの補助の方針は `config.yaml` の `auxiliary.<task>.fallback_chain` で決めます。こちらに対応する環境変数はありません。

詳しくは [予備のプロバイダー](/hermes/docs/user-guide/features/fallback-providers/)を参照してください。

## プロバイダーの振り分け（config.yaml のみ） {#provider-routing-configyaml-only}

これらは `~/.hermes/config.yaml` の `provider_routing` の節に書きます。

| 項目 | 説明 |
|-----|-------------|
| `sort` | プロバイダーの並べ方: `"price"`（初期値）、`"throughput"`、`"latency"` |
| `only` | 使ってよいプロバイダーの名前の並び（たとえば `["anthropic", "google"]`） |
| `ignore` | 飛ばすプロバイダーの名前の並び |
| `order` | 順番に試すプロバイダーの名前の並び |
| `require_parameters` | リクエストのすべての項目に対応しているプロバイダーだけを使います（`true`/`false`） |
| `data_collection` | `"allow"`（初期値）か、データを保存するプロバイダーを外す `"deny"` |

:::tip
環境変数の設定には `hermes config set` を使ってください。正しいファイルへ自動で書き分けてくれます（秘密の情報は `.env`、それ以外は `config.yaml`）。
:::
