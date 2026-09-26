---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "環境変数"
description: "Hermes Agent が使うすべての環境変数をまとめた一覧"
upstream_path: reference/environment-variables.md
upstream_blob: 1e01e81322d73a5c4f93a020faf8461385e129f4
sources:
  - https://hermes-agent.nousresearch.com/docs/reference/environment-variables
---

# 環境変数の一覧 {#environment-variables-reference}

Hermes は環境変数をプロセスの環境から読み、利用者が管理する秘密については `~/.hermes/.env` からも読みます。API キー、ボットのトークン、OAuth の秘密といった資格情報は `.env` に置いてください。秘密でない振る舞いの設定は、設定キーがあるなら `config.yaml` のほうをおすすめします。以下にはプロセス限りの上書きや、内部の橋渡しに使う変数も含まれます。ここに載っているからというだけで `.env` に書き込むべきではありません。

## LLM の提供元 {#llm-providers}

| 変数 | 説明 |
|----------|-------------|
| `OPENROUTER_API_KEY` | OpenRouter の API キー（融通が利くのでおすすめ） |
| `OPENROUTER_BASE_URL` | OpenRouter 互換のベース URL を上書きします |
| `FIREWORKS_API_KEY` | Fireworks AI の API キー（[app.fireworks.ai](https://app.fireworks.ai/settings/users/api-keys)）。接続先の上書きは `config.yaml` の `model.base_url` で設定します。 |
| `HERMES_OPENROUTER_CACHE` | OpenRouter の応答キャッシュを有効にします（`1`/`true`/`yes`/`on`）。config.yaml の `openrouter.response_cache` より優先されます。[応答のキャッシュ](https://openrouter.ai/docs/guides/features/response-caching) を参照してください。 |
| `HERMES_OPENROUTER_CACHE_TTL` | キャッシュの保持時間（秒。1〜86400）。config.yaml の `openrouter.response_cache_ttl` より優先されます。 |
| `NOUS_BASE_URL` | Nous Portal のベース URL を上書きします（ふつうは不要。開発・検証用） |
| `NOUS_INFERENCE_BASE_URL` | Nous の推論エンドポイントを直接上書きします |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway の API キー（[ai-gateway.vercel.sh](https://ai-gateway.vercel.sh)） |
| `AI_GATEWAY_BASE_URL` | AI Gateway のベース URL を上書きします（既定: `https://ai-gateway.vercel.sh/v1`） |
| `OPENAI_API_KEY` | OpenAI 互換の独自エンドポイント用の API キー（`OPENAI_BASE_URL` と組みで使います） |
| `OPENAI_BASE_URL` | 独自エンドポイント（VLLM、SGLang など）のベース URL |
| `HERMES_CODEX_BASE_URL` | `openai-codex`（ChatGPT の契約）の提供元を、既定の Codex バックエンドではなくプロキシ経由にします。この資格情報を使うすべての場面、つまりプールの解決、補助・生のクライアント、401/429 での資格情報の切り替えに効きます。これを設定しない場合は、`model.provider: openai-codex` の下の `model.base_url` が次点の上書きになります。 |
| `LM_API_KEY` | LM Studio（`lmstudio` の提供元）の API キー。手元のサーバーでは形だけの値でかまわないことが多いです |
| `LM_BASE_URL` | LM Studio のベース URL（既定: `http://localhost:1234/v1`） |
| `COPILOT_GITHUB_TOKEN` | Copilot API 用の GitHub トークン — 最優先（OAuth の `gho_*` か、細かい権限の PAT `github_pat_*`。従来型の PAT `ghp_*` は**使えません**） |
| `GH_TOKEN` | GitHub のトークン — Copilot では 2 番目に参照されます（`gh` CLI も使います） |
| `GITHUB_TOKEN` | GitHub のトークン — Copilot では 3 番目に参照されます |
| `HERMES_COPILOT_ACP_COMMAND` | Copilot の ACP CLI のパスを上書きします（既定: `copilot`） |
| `COPILOT_CLI_PATH` | `HERMES_COPILOT_ACP_COMMAND` の別名 |
| `HERMES_COPILOT_ACP_ARGS` | Copilot の ACP 引数を上書きします（既定: `--acp --stdio`） |
| `COPILOT_ACP_BASE_URL` | Copilot ACP のベース URL を上書きします |
| `COPILOT_API_BASE_URL` | Copilot API（`copilot` の提供元）のベース URL を上書きします |
| `GLM_API_KEY` | z.ai / ZhipuAI GLM の API キー（[z.ai](https://z.ai)） |
| `ZAI_API_KEY` | `GLM_API_KEY` の別名 |
| `Z_AI_API_KEY` | `GLM_API_KEY` の別名 |
| `GLM_BASE_URL` | z.ai のベース URL を上書きします（既定: `https://api.z.ai/api/paas/v4`） |
| `KIMI_API_KEY` | Kimi / Moonshot AI の API キー（[moonshot.ai](https://platform.moonshot.ai)） |
| `KIMI_CODING_API_KEY` | `kimi-coding` の提供元で使える別名のキー（`KIMI_API_KEY` と並んで受け付けます） |
| `KIMI_BASE_URL` | Kimi のベース URL を上書きします（既定: `https://api.moonshot.ai/v1`） |
| `KIMI_CN_API_KEY` | Kimi / Moonshot 中国版の API キー（[moonshot.cn](https://platform.moonshot.cn)） |
| `ARCEEAI_API_KEY` | Arcee AI の API キー（[chat.arcee.ai](https://chat.arcee.ai/)） |
| `ARCEE_BASE_URL` | Arcee のベース URL を上書きします（既定: `https://api.arcee.ai/api/v1`） |
| `GMI_API_KEY` | GMI Cloud の API キー（[gmicloud.ai](https://www.gmicloud.ai/)） |
| `GMI_BASE_URL` | GMI Cloud のベース URL を上書きします（既定: `https://api.gmi-serving.com/v1`） |
| `ACTUAL_API_KEY` | Actual Computer の推論キー（`ac_...`、[actual.inc/user/keys](https://actual.inc/user/keys)）。手元のデーモンには不要です。 |
| `ACTUAL_BASE_URL` | Actual のベース URL を指定する古い方法です。代わりに `config.yaml` で `model.provider: actual` と `model.base_url` を設定してください。YAML 側の URL が優先されます。既定は `https://api.actual.inc/v1` です。 |
| `MINIMAX_API_KEY` | MiniMax の API キー — 国際版のエンドポイント（[minimax.io](https://www.minimax.io)）。**`minimax-oauth` では使いません**（OAuth ではブラウザでのログインを使います）。 |
| `MINIMAX_BASE_URL` | MiniMax のベース URL を上書きします（既定: `https://api.minimax.io/anthropic` — Hermes は MiniMax の Anthropic Messages 互換エンドポイントを使います）。**`minimax-oauth` では使いません**。 |
| `MINIMAX_CN_API_KEY` | MiniMax の API キー — 中国版のエンドポイント（[minimaxi.com](https://www.minimaxi.com)）。**`minimax-oauth` では使いません**（OAuth ではブラウザでのログインを使います）。 |
| `MINIMAX_CN_BASE_URL` | MiniMax 中国版のベース URL を上書きします（既定: `https://api.minimaxi.com/anthropic`）。**`minimax-oauth` では使いません**。 |
| `KILOCODE_API_KEY` | Kilo Code の API キー（[kilo.ai](https://kilo.ai)） |
| `KILOCODE_BASE_URL` | Kilo Code のベース URL を上書きします（既定: `https://api.kilo.ai/api/gateway`） |
| `XIAOMI_API_KEY` | Xiaomi MiMo の API キー（[platform.xiaomimimo.com](https://platform.xiaomimimo.com)） |
| `XIAOMI_BASE_URL` | Xiaomi MiMo のベース URL を上書きします（既定: `https://api.xiaomimimo.com/v1`） |
| `UPSTAGE_API_KEY` | Solar 系モデル向けの Upstage の API キー（[console.upstage.ai](https://console.upstage.ai/api-keys)） |
| `UPSTAGE_BASE_URL` | Upstage のベース URL を上書きします（既定: `https://api.upstage.ai/v1`） |
| `TOKENHUB_API_KEY` | テンセント TokenHub の API キー（[tokenhub.tencentmaas.com](https://tokenhub.tencentmaas.com)） |
| `TOKENHUB_BASE_URL` | テンセント TokenHub のベース URL を上書きします（既定: `https://tokenhub.tencentmaas.com/v1`） |
| `TOKENPLAN_API_KEY` | テンセント TokenPlan の API キー（LKEAP。Anthropic Messages のエンドポイント） |
| `TOKENPLAN_BASE_URL` | テンセント TokenPlan のベース URL を上書きします（既定: `https://api.lkeap.cloud.tencent.com/plan/anthropic`） |
| `AZURE_FOUNDRY_API_KEY` | Microsoft Foundry / Azure OpenAI の API キー（[ai.azure.com](https://ai.azure.com/)）。`model.auth_mode: entra_id` のときは不要です |
| `AZURE_FOUNDRY_BASE_URL` | Microsoft Foundry のエンドポイント URL（OpenAI 形式なら `https://<resource>.openai.azure.com/openai/v1`、Anthropic 形式なら `https://<resource>.services.ai.azure.com/anthropic` など） |
| `AZURE_ANTHROPIC_KEY` | `provider: anthropic` と、Microsoft Foundry の Claude デプロイを指す `base_url` を組み合わせるときの Azure Anthropic の API キー（Anthropic と Azure Anthropic の両方を設定している場合に `ANTHROPIC_API_KEY` の代わりとして使えます） |
| `AZURE_TENANT_ID` | Entra ID のテナント ID（サービスプリンシパルを使う流れ。`model.auth_mode: entra_id` のとき `azure-identity` が参照します） |
| `AZURE_CLIENT_ID` | Entra ID のクライアント ID（サービスプリンシパル、ワークロード ID、ユーザー割り当てのマネージド ID） |
| `AZURE_CLIENT_SECRET` | `EnvironmentCredential` が使うサービスプリンシパルの秘密 |
| `AZURE_CLIENT_CERTIFICATE_PATH` | サービスプリンシパルの証明書（`AZURE_CLIENT_SECRET` の代わりに使えます） |
| `AZURE_FEDERATED_TOKEN_FILE` | AKS のワークロード ID や OIDC の流れで使う、フェデレーショントークンのファイルパス |
| `AZURE_AUTHORITY_HOST` | 各国向けクラウドの認証局を上書きします（Azure Government なら `https://login.microsoftonline.us` など）。[Azure Foundry のガイド](/hermes/docs/guides/azure-foundry/#sovereign-clouds-government-china) を参照してください |
| `IDENTITY_ENDPOINT` / `MSI_ENDPOINT` | App Service、Functions、Container Apps でのマネージド ID のエンドポイント。仮想マシンではふつう IMDS を使うので、これらは設定しません |
| `HF_TOKEN` | Inference Providers 向けの Hugging Face のトークン（[huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)） |
| `HF_BASE_URL` | Hugging Face のベース URL を上書きします（既定: `https://router.huggingface.co/v1`） |
| `GOOGLE_API_KEY` | Google AI Studio の API キー（[aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)） |
| `GEMINI_API_KEY` | `GOOGLE_API_KEY` の別名 |
| `GEMINI_BASE_URL` | Google AI Studio のベース URL を上書きします |
| `VERTEX_CREDENTIALS_PATH` | Vertex AI（Gemini）で使う Google Cloud のサービスアカウント JSON のパス。Vertex は固定の API キーではなく OAuth2 を使います。見つからなければ `GOOGLE_APPLICATION_CREDENTIALS`、次に ADC（`gcloud auth application-default login`）を参照します。プロジェクトとリージョンは `config.yaml` の `vertex:` の下に設定します |
| `ANTHROPIC_API_KEY` | Anthropic Console の API キー（[console.anthropic.com](https://console.anthropic.com/)） |
| `ANTHROPIC_BASE_URL` | Anthropic API のベース URL を上書きします |
| `ANTHROPIC_TOKEN` | 手動指定や従来からある Anthropic の OAuth / セットアップトークンの上書き |
| `DASHSCOPE_API_KEY` | Qwen 系モデル向けの Qwen Cloud（Alibaba DashScope）の API キー（[modelstudio.console.alibabacloud.com](https://modelstudio.console.alibabacloud.com/)） |
| `DASHSCOPE_BASE_URL` | DashScope のベース URL を指定します（既定: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`。中国本土のリージョンでは `https://dashscope.aliyuncs.com/compatible-mode/v1` を使います） |
| `DASHSCOPE_CN_BASE_URL` | `alibaba-cn`（中国本土）の DashScope のベース URL を上書きします |
| `ALIBABA_CODING_PLAN_API_KEY` | Qwen Coding Plan の API キー（`alibaba-coding-plan`。`alibaba-coding-plan-cn` の予備としても使われます） |
| `ALIBABA_CODING_PLAN_CN_API_KEY` | 中国本土の `alibaba-coding-plan-cn` 用の Qwen Coding Plan の API キー（共通のキーより先に見るので、中国版の行だけが有効になります） |
| `ALIBABA_CODING_PLAN_BASE_URL` | Qwen Coding Plan のベース URL を上書きします（国際版） |
| `ALIBABA_CODING_PLAN_CN_BASE_URL` | Qwen Coding Plan のベース URL を上書きします（中国本土） |
| `ALIBABA_TOKEN_PLAN_API_KEY` | Alibaba Model Studio Token Plan の API キー（`alibaba-token-plan`。`alibaba-token-plan-cn` の予備としても使われます） |
| `ALIBABA_TOKEN_PLAN_CN_API_KEY` | 中国本土の `alibaba-token-plan-cn` 用の Token Plan の API キー（共通のキーより先に見ます） |
| `ALIBABA_TOKEN_PLAN_BASE_URL` | Token Plan のベース URL を上書きします（国際版） |
| `ALIBABA_TOKEN_PLAN_CN_BASE_URL` | Token Plan のベース URL を上書きします（中国本土） |
| `DEEPSEEK_API_KEY` | DeepSeek へ直接つなぐための API キー（[platform.deepseek.com](https://platform.deepseek.com/api_keys)） |
| `DEEPSEEK_BASE_URL` | DeepSeek API のベース URL を指定します |
| `DEEPINFRA_API_KEY` | DeepInfra の API キー（[deepinfra.com](https://deepinfra.com/dash/api_keys)） |
| `DEEPINFRA_BASE_URL` | DeepInfra のベース URL を上書きします |
| `NOVITA_API_KEY` | NovitaAI の API キー — Model API、Agent Sandbox、GPU Cloud を備えた AI 向けのクラウド（[novita.ai/settings/key-management](https://novita.ai/settings/key-management)） |
| `NOVITA_BASE_URL` | NovitaAI のベース URL を上書きします（既定: `https://api.novita.ai/openai/v1`） |
| `RAMP_ROUTER_API_KEY` | Ramp Router の API キー（[app.router.com/keys](https://app.router.com/keys)）。別名の `ROUTER_API_KEY` も使えます |
| `RAMP_ROUTER_BASE_URL` | Ramp Router のベース URL を上書きします（既定: `https://api.router.com/v1`） |
| `NEBIUS_API_KEY` | Nebius Token Factory の API キー（[tokenfactory.nebius.com](https://tokenfactory.nebius.com/)）。`NEBIUS_TOKEN_FACTORY_API_KEY` も使えます |
| `NEBIUS_BASE_URL` | Nebius Token Factory のベース URL を上書きします（既定: `https://api.tokenfactory.nebius.com/v1`） |
| `NVIDIA_API_KEY` | NVIDIA NIM の API キー — Nemotron とオープンなモデル向け（[build.nvidia.com](https://build.nvidia.com)） |
| `NVIDIA_BASE_URL` | NVIDIA のベース URL を上書きします（既定: `https://integrate.api.nvidia.com/v1`。手元の NIM につなぐなら `http://localhost:8000/v1`） |
| `STEPFUN_API_KEY` | StepFun の API キー — Step シリーズのモデル向け（[platform.stepfun.com](https://platform.stepfun.com)） |
| `STEPFUN_BASE_URL` | StepFun のベース URL を上書きします（既定: `https://api.stepfun.com/v1`） |
| `OLLAMA_API_KEY` | Ollama Cloud の API キー — 手元に GPU が無くても Ollama のカタログを使えます（[ollama.com/settings/keys](https://ollama.com/settings/keys)） |
| `OLLAMA_BASE_URL` | Ollama Cloud のベース URL を上書きします（既定: `https://ollama.com/v1`） |
| `XAI_API_KEY` | チャット・読み上げ・ウェブ検索に使う xAI（Grok）の API キー（[console.x.ai](https://console.x.ai/)） |
| `XAI_BASE_URL` | xAI のベース URL を上書きします（既定: `https://api.x.ai/v1`） |
| `MISTRAL_API_KEY` | Voxtral の読み上げと音声認識に使う Mistral の API キー（[console.mistral.ai](https://console.mistral.ai)） |
| `AWS_REGION` | Bedrock の推論に使う AWS のリージョン（`us-east-1`、`eu-central-1` など）。boto3 が読みます。 |
| `AWS_PROFILE` | Bedrock の認証に使う AWS の名前付きプロファイル（`~/.aws/credentials` を読みます）。設定しなければ boto3 の既定の資格情報の探索順に従います。 |
| `BEDROCK_BASE_URL` | Bedrock ランタイムのベース URL を上書きします（既定: `https://bedrock-runtime.us-east-1.amazonaws.com`。ふつうは設定せず `AWS_REGION` を使ってください） |
| `HERMES_QWEN_BASE_URL` | Qwen Portal のベース URL を上書きします（既定: `https://portal.qwen.ai/v1`） |
| `OPENCODE_ZEN_API_KEY` | OpenCode Zen の API キー — 厳選されたモデルを従量課金で使えます（[opencode.ai](https://opencode.ai/auth)） |
| `OPENCODE_ZEN_BASE_URL` | OpenCode Zen のベース URL を上書きします |
| `OPENCODE_GO_API_KEY` | OpenCode Go の API キー — 月 10 ドルでオープンなモデルを使える契約（[opencode.ai](https://opencode.ai/auth)） |
| `OPENCODE_GO_BASE_URL` | OpenCode Go のベース URL を上書きします |
| `CLAUDE_CODE_OAUTH_TOKEN` | Claude Code のトークンを手動で書き出している場合の明示的な上書き |
| `HERMES_MODEL` | プロセス単位でモデル名を上書きします（定時実行の仕組みが使います。ふだんは `config.yaml` のほうをおすすめします） |
| `VOICE_TOOLS_OPENAI_KEY` | OpenAI の音声認識・読み上げで優先して使われる OpenAI のキー |
| `HERMES_LOCAL_STT_COMMAND` | 手元で音声認識をするコマンドの雛形（任意）。`{input_path}`、`{output_dir}`、`{language}`、`{model}` を差し込めます |
| `HERMES_LOCAL_STT_LANGUAGE` | 音声認識で使う既定の言語のヒント。`config.yaml` に提供元ごとの `language` を設定していないとき、`local`（faster-whisper）の提供元、`HERMES_LOCAL_STT_COMMAND`、手元の `whisper` CLI への切り替え（既定: `en`）、Groq、xAI が使います |
| `HERMES_HOME` | 設定と利用者データを置くホームを選びます。値の中の `~` や `$VAR` は展開されるので（fish は `VAR=~/…` の中の `~` を展開しません）、現在のディレクトリからの相対にはなりません。既定は POSIX では `~/.hermes`、Windows では `%LOCALAPPDATA%\hermes` で、公式の Docker イメージは `/opt/data` を使います。プロファイルや実行時の状況によって、より個別のホームが選ばれることもあります。 |
| `HERMES_DISABLE_WINDOWS_UTF8` | **Windows 専用。** `1` にすると UTF-8 の入出力の下駄（`configure_windows_stdio()`）を切り、コンソールのロケールのコードページに戻します。文字化けの原因を切り分けるときには便利ですが、ふだんの運用で正しい設定であることはまずありません |
| `HERMES_KANBAN_HOME` | かんばんの盤（DB、作業場、ワーカーのログ）の土台になる共有の Hermes ルートを上書きします。指定が無ければ `get_default_hermes_root()`（有効なプロファイルの親）になります。テストや変わった構成で役に立ちます |
| `HERMES_KANBAN_BOARD` | このプロセスで使うかんばんの盤を固定します。`~/.hermes/kanban/current` より優先されます。ディスパッチャーはこれをワーカーの子プロセスの環境に入れるので、ワーカーは物理的に別の盤のタスクを見られません。既定は `default` です。slug の条件は、小文字の英数字とハイフンとアンダースコアで 1〜64 文字です |
| `HERMES_KANBAN_DB` | かんばんのデータベースファイルのパスを直接固定します（最優先。`HERMES_KANBAN_BOARD` と `HERMES_KANBAN_HOME` より強いです）。ディスパッチャーはこれをワーカーの子プロセスの環境に入れるので、プロファイルのワーカーもディスパッチャーの盤に揃います |
| `HERMES_KANBAN_WORKSPACES_ROOT` | かんばんの作業場のルートを直接固定します（作業場については最優先で、`HERMES_KANBAN_HOME` より強いです）。ディスパッチャーはこれをワーカーの子プロセスの環境に入れます |
| `HERMES_KANBAN_DISPATCH_IN_GATEWAY` | `kanban.dispatch_in_gateway` を実行時に上書きします。`0`、`false`、`no`、`off` のいずれかにすると、ゲートウェイが内蔵のかんばんディスパッチャーを起動しなくなります。空でない他の値では有効になります。別のディスパッチャーのプロセスが盤を持っているときに便利です。 |

## 提供元の認証（OAuth） {#provider-auth-oauth}

Anthropic の認証については、Claude Code 自身の資格情報ファイルがあればそちらを優先します。自動で更新できるからです。**Anthropic に対する OAuth には、追加の利用枠を購入した Claude Max の契約が必要です** — Hermes は Claude Code として接続し、Max の基本枠ではなく追加・超過分の枠だけを使うためで、Claude Pro では動きません。Max と追加枠が無い場合は、API キーを使ってください。`ANTHROPIC_TOKEN` のような環境変数は手動の上書きとしては今も役に立ちますが、Claude Max でログインするときの本筋ではなくなりました。

| 変数 | 説明 |
|----------|-------------|
| `HERMES_PORTAL_BASE_URL` | Nous Portal の URL を上書きします（開発・検証用）。多重化しているときはプロファイルごとに、対象プロファイルの `.env` に設定します。 |
| `NOUS_INFERENCE_BASE_URL` | Nous の推論 API の URL を上書きします。Portal の応答が名乗ってよい、本番以外の唯一のホストでもあります。Portal が返した推論 URL がこの上書きと一致すれば、本番へ直されずにそのまま受け入れて保存します。多重化しているときはプロファイルごとです。 |
| `HERMES_NOUS_MIN_KEY_TTL_SECONDS` | エージェントのキーを作り直すまでの最小の残り時間（既定: 1800 = 30 分） |
| `HERMES_NOUS_TIMEOUT_SECONDS` | Nous の資格情報・トークンのやり取りにおける HTTP のタイムアウト |
| `HERMES_DUMP_REQUESTS` | API リクエストの中身をログファイルへ書き出します（`true`/`false`） |
| `HERMES_PREFILL_MESSAGES_FILE` | API 呼び出し時に差し込む、一時的な前置きメッセージの JSON ファイルのパス |
| `HERMES_TIMEZONE` | IANA のタイムゾーンで上書きします（たとえば `America/New_York`）。Linux と macOS では `execute_code` の子プロセスへ `TZ` としても渡されます。Windows では子プロセスは OS のタイムゾーンのままになります。Windows の C ランタイムは POSIX 形式の `TZ` しか解釈せず、IANA の名前を誤って別の時差に読んでしまうためです |

## ツールの API {#tool-apis}

| 変数 | 説明 |
|----------|-------------|
| `PARALLEL_API_KEY` | AI 向けのウェブ検索（[parallel.ai](https://parallel.ai/)） |
| `FIRECRAWL_API_KEY` | ウェブページの取り込みとクラウドのブラウザ（[firecrawl.dev](https://firecrawl.dev/)） |
| `FIRECRAWL_API_URL` | 自前で立てた Firecrawl のエンドポイント（任意） |
| `TAVILY_API_KEY` | 検索・抽出の上限を上げるための Tavily の API キー（任意）。ウェブのバックエンドに Tavily を選べば、キーが無くても使えます（[app.tavily.com](https://app.tavily.com/home)、[キー無しでの利用](https://docs.tavily.com/documentation/keyless)） |
| `TAVILY_BASE_URL` | Tavily のエンドポイントを上書きします。社内プロキシや、自前で立てた Tavily 互換の検索バックエンドで役に立ちます。`GROQ_BASE_URL` と同じ考え方です。 |
| `PERPLEXITY_API_KEY` | `perplexity` のウェブバックエンド用の Perplexity Search の API キー — 順位付きの検索結果に加えて、抽出用に検索語と関係のあるページの抜粋が得られます（[perplexity.ai/account/api](https://www.perplexity.ai/account/api)） |
| `PERPLEXITY_BASE_URL` | プロキシ向けに Perplexity のエンドポイントを上書きします（既定 `https://api.perplexity.ai`。任意） |
| `SEARXNG_URL` | 自前で無料で立てられるウェブ検索、SearXNG のインスタンスの URL — API キーは不要です（[searxng.github.io](https://searxng.github.io/searxng/)） |
| `EXA_API_KEY` | AI 向けのウェブ検索と本文取得に使う Exa の API キー（[exa.ai](https://exa.ai/)） |
| `BRAVE_SEARCH_API_KEY` | ウェブ検索に使う Brave Search API の購読トークン（無料の枠があります）（[brave.com/search/api](https://brave.com/search/api/)） |
| `BROWSERBASE_API_KEY` | ブラウザの自動操作（[browserbase.com](https://browserbase.com/)） |
| `BROWSERBASE_PROJECT_ID` | Browserbase のプロジェクト ID |
| `BROWSER_USE_API_KEY` | Browser Use のクラウドブラウザの API キー（[browser-use.com](https://browser-use.com/)） |
| `FIRECRAWL_BROWSER_TTL` | Firecrawl のブラウザセッションの保持時間（秒。既定: 300） |
| `BROWSER_CDP_URL` | 手元のブラウザの Chrome DevTools Protocol の URL（`/browser connect` で設定します。たとえば `ws://localhost:9222`） |
| `CAMOFOX_URL` | 検知回避のためのブラウザサーバー Camofox の、手元でのアドレス（既定: `http://localhost:9377`）。アドレスを指すだけで、これで Camofox が選ばれるわけではありません。`hermes tools` から Camofox を選んでください（`browser.cloud_provider: camofox`） |
| `CAMOFOX_API_KEY` | 認証のある遠隔の Camofox サーバーへ Authorization ヘッダーとして送る bearer トークン（任意） |
| `CAMOFOX_USER_ID` | 共有の可視セッション向けに、外部で管理する Camofox のユーザー ID（任意） |
| `CAMOFOX_SESSION_KEY` | `CAMOFOX_USER_ID` でタブを作るときに使う Camofox のセッションキー（任意） |
| `CAMOFOX_ADOPT_EXISTING_TAB` | `true` にすると、新しいタブを作る前に既存の Camofox のタブを再利用します |
| `BROWSER_INACTIVITY_TIMEOUT` | ブラウザセッションを操作しないまま置いておける時間（秒） |
| `AGENT_BROWSER_ARGS` | Chromium を起動するときの追加の引数（カンマ区切りか改行区切り）。root で動かしている場合や、AppArmor で制限された非特権のユーザー名前空間（Ubuntu 23.10 以降、DGX Spark、多くのコンテナイメージ）では、Hermes が `--no-sandbox,--disable-dev-shm-usage` を自動で足します。これを手で設定するのは、それを上書きしたいときや、別の引数を足したいときだけにしてください。 |
| `AGENT_BROWSER_ENGINE` | 手元のブラウザのエンジン: `auto`（既定 — CDP 経由の Chromium 系）、`lightpanda`（Browser Use のモードでは `lightpanda serve` を起動し、組み込みのツールは agent-browser へ `--engine lightpanda` を渡します）、`chrome` のいずれか。config.yaml の `browser.engine` と同じです。 |
| `FAL_KEY` | 画像生成（[fal.ai](https://fal.ai/)） |
| `KREA_API_KEY` | Krea 2 での画像生成に使う Krea の API キー（[krea.ai](https://krea.ai/)） |
| `GROQ_API_KEY` | Groq の Whisper による音声認識の API キー（[groq.com](https://groq.com/)） |
| `ELEVENLABS_API_KEY` | ElevenLabs の上位の読み上げ音声（[elevenlabs.io](https://elevenlabs.io/)） |
| `PORCUPINE_ACCESS_KEY` | Picovoice Porcupine の呼びかけ語の認識エンジン（[console.picovoice.ai](https://console.picovoice.ai/)） — Porcupine を選んだときに必要で、openWakeWord と sherpa にはキーが要りません |
| `STT_GROQ_MODEL` | Groq の音声認識モデルを上書きします（既定: `whisper-large-v3-turbo`） |
| `GROQ_BASE_URL` | Groq の OpenAI 互換の音声認識エンドポイントを上書きします |
| `STT_OPENAI_MODEL` | OpenAI の音声認識モデルを上書きします（既定: `whisper-1`） |
| `STT_OPENAI_BASE_URL` | OpenAI 互換の音声認識エンドポイントを上書きします |
| `GITHUB_TOKEN` | Skills Hub（API の上限を上げる、スキルの公開）と、デスクトップアプリの更新確認に使う GitHub のトークン（`GH_TOKEN` も参照されます。どちらも無ければ、デスクトップは `gh` CLI のログイン、次に匿名の順で試します） |
| `HONCHO_API_KEY` | セッションをまたいだ利用者のモデル化（[honcho.dev](https://honcho.dev/)） |
| `HONCHO_BASE_URL` | 自前で立てた Honcho のベース URL（既定: Honcho のクラウド）。手元のインスタンスには API キーは不要です |
| `HINDSIGHT_API_KEY` | グラフを踏まえた永続的な記憶のための Hindsight の API キー（[hindsight.vectorize.io](https://hindsight.vectorize.io)） |
| `HINDSIGHT_API_URL` | Hindsight API のベース URL（既定: `https://api.hindsight.vectorize.io`） |
| `HINDSIGHT_TIMEOUT` | Hindsight のメモリープロバイダーへの API 呼び出しのタイムアウト（秒。既定: `60`）。`/sync` や `on_session_switch` のときに応答が遅く、`errors.log` にタイムアウトが出るようなら増やしてください。 |
| `MEM0_API_KEY` | 意味づけに基づく永続的な記憶のための Mem0 Platform の API キー（[app.mem0.ai](https://app.mem0.ai)） |
| `MEM0_MODE` | Mem0 のバックエンドの方式: `platform`（既定）か `oss` — [メモリープロバイダー](/hermes/docs/user-guide/features/memory-providers/) を参照してください |
| `MEM0_HOST` | 自前で立てた Mem0 サーバーのベース URL（プラグインが Platform API を使わなくなります） |
| `MEM0_USER_ID` | Mem0 の記憶をひも付けるユーザー ID を上書きします |
| `MEM0_AGENT_ID` | Mem0 の記憶に付けるエージェント ID を上書きします |
| `RETAINDB_API_KEY` | 永続的な記憶のための RetainDB の API キー（[retaindb.com](https://retaindb.com)） |
| `RETAINDB_BASE_URL` | 自前で立てた RetainDB のベース URL（既定: `https://api.retaindb.com`） |
| `OPENVIKING_API_KEY` | OpenViking の API キー（手元での開発では空のままでかまいません） |
| `OPENVIKING_ENDPOINT` | OpenViking のサーバー URL（既定: `http://127.0.0.1:1933`） |
| `BRV_API_KEY` | ByteRover の API キー（任意。クラウド同期用で、既定では手元優先です）（[app.byterover.dev](https://app.byterover.dev)） |
| `SUPERMEMORY_API_KEY` | プロフィールの呼び出しとセッションの取り込みを備えた、意味づけに基づく長期記憶（[supermemory.ai](https://supermemory.ai)） |
| `DAYTONA_API_KEY` | Daytona のクラウドのサンドボックス（[daytona.io](https://daytona.io/)） |
| `VERCEL_TOKEN` | Vercel Sandbox のアクセストークン（[vercel.com](https://vercel.com/)） |
| `VERCEL_PROJECT_ID` | Vercel のプロジェクト ID（`VERCEL_TOKEN` と一緒に必要です） |
| `VERCEL_TEAM_ID` | Vercel のチーム ID（`VERCEL_TOKEN` と一緒に必要です） |
| `VERCEL_OIDC_TOKEN` | Vercel の短命の OIDC トークン（開発時のみの代替手段） |

### スキル用の API キー {#skill-api-keys}

特定の同梱スキルや任意のスキルが使う秘密です。対応するスキルを使うときだけ必要になります。

| 変数 | 使うスキル | 説明 |
|----------|---------------|-------------|
| `NOTION_API_KEY` | `notion` | Notion の連携トークン。 |
| `LINEAR_API_KEY` | `linear` | Linear の個人用 API キー。 |
| `AIRTABLE_API_KEY` | `airtable` | Airtable の個人用アクセストークン。 |
| `TENOR_API_KEY` | `gif-search` | GIF 検索に使う Tenor の API キー。 |

### Langfuse による可観測性 {#langfuse-observability}

同梱の [`observability/langfuse`](/hermes/docs/user-guide/features/built-in-plugins/#observabilitylangfuse) プラグイン用の環境変数です。`~/.hermes/.env` に設定してください。効かせるには、プラグイン自体も有効にしておく必要があります（`hermes plugins enable observability/langfuse` を実行するか、`hermes plugins` でチェックを入れます）。

| 変数 | 説明 |
|----------|-------------|
| `HERMES_LANGFUSE_PUBLIC_KEY` | Langfuse のプロジェクトの公開キー（`pk-lf-...`）。必須です。 |
| `HERMES_LANGFUSE_SECRET_KEY` | Langfuse のプロジェクトの秘密キー（`sk-lf-...`）。必須です。 |
| `HERMES_LANGFUSE_BASE_URL` | Langfuse のサーバー URL（既定: `https://cloud.langfuse.com`）。自前で立てた場合に設定します。 |
| `HERMES_LANGFUSE_ENV` | 記録に付ける環境のタグ（`production`、`staging` など） |
| `HERMES_LANGFUSE_RELEASE` | 記録に付けるリリースや版のタグ |
| `HERMES_LANGFUSE_SAMPLE_RATE` | SDK の抽出率 0.0〜1.0（既定: `1.0`） |
| `HERMES_LANGFUSE_MAX_CHARS` | 直列化したデータの項目ごとの切り詰め長（既定: `12000`） |
| `HERMES_LANGFUSE_MAX_DEPTH` | 記録したツールの入出力で保つ入れ子の深さ。これを超えると値は `<max-depth>` になります（既定: `4`。おかしな値のときは警告して既定を使います） |
| `HERMES_LANGFUSE_DEBUG` | `true` にすると、プラグインの詳しいログを `agent.log` に出します |
| `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` / `LANGFUSE_BASE_URL` | Langfuse の SDK 標準の名前です。対応する `HERMES_LANGFUSE_*` が無いときの代わりとして受け付けます。 |

### Nous Tool Gateway {#nous-tool-gateway}

有料の Nous 契約者や、自前で立てたゲートウェイのために [Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/) を設定する変数です。ほとんどの利用者は設定の必要がありません。ゲートウェイは `hermes model` や `hermes tools` から自動で設定されます。

| 変数 | 説明 |
|----------|-------------|
| `TOOL_GATEWAY_DOMAIN` | Tool Gateway の振り分けに使うドメイン（既定: `nousresearch.com`） |
| `TOOL_GATEWAY_SCHEME` | ゲートウェイの URL で使うスキーム、HTTP か HTTPS（既定: `https`） |
| `TOOL_GATEWAY_USER_TOKEN` | Tool Gateway の認証トークン（ふつうは Nous の認証から自動で入ります） |
| `FIRECRAWL_GATEWAY_URL` | Firecrawl のゲートウェイのエンドポイントだけを上書きする URL |

## ターミナルのバックエンド {#terminal-backend}

| 変数 | 説明 |
|----------|-------------|
| `TERMINAL_ENV` | バックエンド: `local`、`docker`、`ssh`、`singularity`、`modal`、`daytona`、`vercel_sandbox` |
| `HERMES_DOCKER_BINARY` | Hermes が呼び出すコンテナのコマンドを上書きします（`podman`、`/usr/local/bin/docker` など）。設定しなければ `PATH` 上の `docker` か `podman` を自動で探します。両方入っていて既定でないほうを使いたいときや、コマンドが `PATH` の外にあるときに必要です。 |
| `TERMINAL_DOCKER_IMAGE` | Docker のイメージ（既定: `nikolaik/python-nodejs:python3.11-nodejs20`） |
| `TERMINAL_DOCKER_FORWARD_ENV` | Docker のターミナルセッションへ明示的に渡す環境変数名の JSON 配列。なお、スキルが宣言した `required_environment_variables` は自動で渡されるので、どのスキルも宣言していない変数のときだけ必要です。 |
| `TERMINAL_DOCKER_VOLUMES` | Docker に追加でマウントするボリューム（`host:container` の組をカンマ区切りで） |
| `TERMINAL_DOCKER_ENV` | Docker のターミナルセッション内に設定する追加の環境変数の JSON オブジェクト（たとえば `{"FOO":"bar"}`） |
| `TERMINAL_DOCKER_EXTRA_ARGS` | `docker run` へ渡す追加の引数の JSON 配列（たとえば `["--memory","4g"]`） |
| `TERMINAL_DOCKER_MOUNT_CWD_TO_WORKSPACE` | 上級者向けの任意設定: 起動時の作業ディレクトリを Docker の `/workspace` にマウントします（`true`/`false`。既定: `false`） |
| `TERMINAL_SINGULARITY_IMAGE` | Singularity のイメージか `.sif` のパス |
| `TERMINAL_MODAL_IMAGE` | Modal のコンテナイメージ |
| `TERMINAL_DAYTONA_IMAGE` | Daytona のサンドボックスのイメージ |
| `TERMINAL_VERCEL_RUNTIME` | Vercel Sandbox のランタイム（`node24`、`node22`、`python3.13`） |
| `TERMINAL_TIMEOUT` | コマンドのタイムアウト（秒） |
| `TERMINAL_LIFETIME_SECONDS` | ターミナルセッションを保つ最長の時間（秒） |
| `TERMINAL_CWD` | ゲートウェイや定時実行のターミナルセッションの作業ディレクトリを直接上書きする、古い方法です。`config.yaml` の `terminal.cwd` をおすすめします。CLI は今も起動時のディレクトリを使います。 |
| `SUDO_PASSWORD` | 対話の確認なしで sudo を使えるようにします |

クラウドのサンドボックスをバックエンドにする場合、残るのはファイルシステムの中身です。`TERMINAL_LIFETIME_SECONDS` は、使われていないターミナルセッションを Hermes がいつ片付けるかを決めます。あとから再開するときはサンドボックスを作り直すことがあり、動いていたプロセスがそのまま残るとは限りません。

## SSH のバックエンド {#ssh-backend}

| 変数 | 説明 |
|----------|-------------|
| `TERMINAL_SSH_HOST` | 接続先サーバーのホスト名 |
| `TERMINAL_SSH_USER` | SSH のユーザー名 |
| `TERMINAL_SSH_PORT` | SSH のポート（既定: 22） |
| `TERMINAL_SSH_KEY` | 秘密鍵のパス |
| `TERMINAL_SSH_PERSISTENT` | SSH での持続シェルを上書きします（既定: `TERMINAL_PERSISTENT_SHELL` に従います） |

## コンテナの資源（Docker、Singularity、Modal、Daytona） {#container-resources-docker-singularity-modal-daytona}

| 変数 | 説明 |
|----------|-------------|
| `TERMINAL_CONTAINER_CPU` | CPU のコア数（既定: 1） |
| `TERMINAL_CONTAINER_MEMORY` | メモリー（MB。既定: 5120） |
| `TERMINAL_CONTAINER_DISK` | ディスク（MB。既定: 51200） |
| `TERMINAL_CONTAINER_PERSISTENT` | コンテナのファイルシステムをセッションをまたいで残します（既定: `true`） |
| `TERMINAL_SANDBOX_DIR` | 作業場と重ね合わせを置くホスト側のディレクトリ（既定: `~/.hermes/sandboxes/`） |

## 持続シェル {#persistent-shell}

| 変数 | 説明 |
|----------|-------------|
| `TERMINAL_PERSISTENT_SHELL` | 手元以外のバックエンドで持続シェルを有効にします（既定: `true`）。config.yaml の `terminal.persistent_shell` でも設定できます |
| `TERMINAL_LOCAL_PERSISTENT` | 手元のバックエンドで持続シェルを有効にします（既定: `false`） |
| `TERMINAL_SSH_PERSISTENT` | SSH のバックエンドで持続シェルを上書きします（既定: `TERMINAL_PERSISTENT_SHELL` に従います） |

## 外向き通信のプロキシ（サンドボックスに注入されます） {#egress-proxy-sandbox-injected}

これらの環境変数はホスト側には設定されません。`proxy.enabled: true` のときに [外向き通信のプロキシ](/hermes/docs/user-guide/egress/iron-proxy/) の仕組みが Docker のサンドボックスへ注入します。この版で組み込まれているバックエンドは Docker だけです。

| 変数 | 説明 |
|----------|-------------|
| `HERMES_EGRESS_PROXY` | 外向きのプロキシが有効なとき、サンドボックスの中で `1` になります。エージェントのコードはこれを見て、TLS を仲介するプロキシの背後で動いていることを判断できます。 |
| 提供元の環境変数（`OPENROUTER_API_KEY`、`OPENAI_API_KEY` など） | 本物の上流の秘密ではなく、中身のわからないプロキシ用のトークンが入ります。そのため既存の SDK は標準の名前を読むだけで動きます。iron-proxy がネットワークの境界でそのトークンを本物の秘密に差し替えます。 |
| `HERMES_PROXY_TOKEN_<ENV_NAME>` | 発行した提供元ごとの対応関係を確かめるための別名です。たとえば `HERMES_PROXY_TOKEN_OPENROUTER_API_KEY=hermes-proxy-openrouter-…` のようになります。値は標準の提供元の環境変数と同じトークンです。 |
| `HTTPS_PROXY` / `HTTP_PROXY` | `HTTPS_PROXY` は CONNECT と仲介のために `http://host.docker.internal:<tunnel_port>` を指します。`HTTP_PROXY` は素の HTTP を転送するために `<tunnel_port + 1>` を指します。 |
| `NO_PROXY` | `127.0.0.1,localhost,::1` です。サンドボックス内のループバックの開発サーバーがプロキシを通らないようにします。 |
| `REQUESTS_CA_BUNDLE` / `SSL_CERT_FILE` / `CURL_CA_BUNDLE` / `NODE_EXTRA_CA_CERTS` | サンドボックス内にマウントされた Hermes の外向き通信用 CA 証明書のパス（`/etc/ssl/certs/hermes-egress-ca.crt`）。各言語のランタイムが、iron-proxy が仲介のために発行した証明書を信頼できるようになります。 |
| `NODE_OPTIONS` | `--use-openssl-ca` が追記されます（元からある指定は残ります）。これで Node.js も、ほかの CA の変数が指す OpenSSL の証明書置き場を通るようになり、[Node.js の CA の扱いの違いによる注意点](/hermes/docs/user-guide/egress/iron-proxy/#nodejs-asymmetric-ca-caveat) が小さくなります。 |
| `HERMES_IRON_PROXY_NONCE` | iron-proxy のデーモンのプロセス自身に設定されます（サンドボックスの中ではありません）。PID が使い回されたときでも、候補の PID が*こちらが管理している*実行ファイルを指しているかを `_pid_alive` が確かめるために使います。 |

これらは `proxy.enabled: true` かつデーモンが動いているときに、Docker のターミナルのバックエンドが自動で設定します。自分で設定するものではありません。運用者が触るつまみは `~/.hermes/config.yaml` の `proxy:` の下にあります。[外向き通信のプロキシ → 設定](/hermes/docs/user-guide/egress/iron-proxy/#configuration) を参照してください。

## メッセージング {#messaging}

| 変数 | 説明 |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Telegram のボットのトークン（@BotFather から取得します） |
| `TELEGRAM_ALLOWED_USERS` | ボットを使えるユーザー ID をカンマ区切りで（個別のチャット、グループ、フォーラムのすべてに効きます） |
| `TELEGRAM_ALLOW_ALL_USERS` | どの Telegram 利用者でもボットを動かせるようにします（開発時のみ）。 |
| `TELEGRAM_GROUP_ALLOWED_USERS` | グループやフォーラムでのみ許可する送信者のユーザー ID をカンマ区切りで（個別のチャットへの権限は与えません）。チャット ID の形（`-` で始まる値）も、#17686 より前の設定との互換のためにチャット ID として今も受け付けますが、非推奨の警告が出ます。 |
| `TELEGRAM_GROUP_ALLOWED_CHATS` | グループやフォーラムのチャット ID をカンマ区切りで。そこにいる人は誰でも使えます |
| `TELEGRAM_HOME_CHANNEL` | 定時実行の配信先になる既定の Telegram のチャットやチャンネル |
| `TELEGRAM_HOME_CHANNEL_NAME` | Telegram の既定チャンネルの表示名 |
| `TELEGRAM_CRON_THREAD_ID` | 定時実行の配信を受けるフォーラムのトピック ID。定時実行に限って `TELEGRAM_HOME_CHANNEL_THREAD_ID` より優先されます。トピックを使う運用ではこれを設定してください。定時実行のメッセージへの返信が、システムの入口ではなく新しいセッションを開くようになります（#24409）。 |
| `TELEGRAM_WEBHOOK_URL` | webhook 方式で使う公開の HTTPS URL（設定すると、問い合わせ方式ではなく webhook になります） |
| `TELEGRAM_WEBHOOK_PORT` | webhook のサーバーが待ち受ける手元のポート（既定: `8443`） |
| `TELEGRAM_WEBHOOK_SECRET` | 検証のために Telegram が更新のたびに返してくる秘密のトークン。**`TELEGRAM_WEBHOOK_URL` を設定するなら必須です** — 無いとゲートウェイが起動を拒みます（GHSA-3vpc-7q5r-276h）。`openssl rand -hex 32` で作ってください。 |
| `TELEGRAM_REACTIONS` | 処理中にメッセージへ絵文字のリアクションを付けます（既定: `false`） |
| `TELEGRAM_REQUIRE_MENTION` | Telegram のグループでは、はっきりした呼びかけがないと応答しないようにします。`config.yaml` の `telegram.require_mention` と同じです。 |
| `TELEGRAM_MENTION_PATTERNS` | Telegram のグループで呼びかけの判定を有効にしたときに受け付ける、呼びかけ語の正規表現。JSON の配列、改行区切り、カンマ区切りのいずれかで書けます。`telegram.mention_patterns` と同じです。 |
| `TELEGRAM_EXCLUSIVE_BOT_MENTIONS` | 有効にすると、Telegram のグループで `@...bot` と明示されたときは、返信や呼びかけ語による判定より先に、名指しされたボットにだけ届きます。既定: `true`。`telegram.exclusive_bot_mentions` と同じです。 |
| `TELEGRAM_BOTS_REQUIRE_MENTION` | 有効にすると、ほかのボットからのメッセージは `@thisbot` と明示しないと応答しません。引用の返信だけでは無視されるので、ボット同士が延々と返信し合うのを止められます。人からの返信には影響しません。既定: `false`。`telegram.bots_require_mention` と同じです。 |
| `TELEGRAM_REPLY_TO_MODE` | 返信を紐づける挙動: `off`、`first`（既定）、`all`。Discord と同じ考え方です。 |
| `TELEGRAM_IGNORED_THREADS` | ボットが決して応答しない Telegram のフォーラムのトピック / スレッド ID をカンマ区切りで |
| `TELEGRAM_PROXY` | Telegram への接続に使うプロキシの URL — `HTTPS_PROXY` より優先されます。`http://`、`https://`、`socks5://` に対応します |
| `DISCORD_BOT_TOKEN` | Discord のボットのトークン |
| `DISCORD_ALLOWED_USERS` | ボットを使える Discord のユーザー ID をカンマ区切りで |
| `DISCORD_ALLOW_ALL_USERS` | どの Discord 利用者でもボットを動かせるようにします（開発時のみ）。 |
| `DISCORD_ALLOWED_ROLES` | ボットを使える Discord のロール ID をカンマ区切りで（`DISCORD_ALLOWED_USERS` との「または」条件です）。Members の権限が自動で有効になります。運営チームの入れ替わりが多いときに便利で、ロールを付ければ自動で権限が行き渡ります。 |
| `DISCORD_ALLOWED_CHANNELS` | Discord のチャンネル ID をカンマ区切りで。設定すると、ボットはこれらのチャンネル（と、許可していれば個別のチャット）でだけ応答します。`config.yaml` の `discord.allowed_channels` より優先されます。 |
| `DISCORD_PROXY` | Discord への接続に使うプロキシの URL — `HTTPS_PROXY` より優先されます。`http://`、`https://`、`socks5://` に対応します |
| `DISCORD_HOME_CHANNEL` | 定時実行の配信先になる既定の Discord のチャンネル |
| `DISCORD_HOME_CHANNEL_NAME` | Discord の既定チャンネルの表示名 |
| `DISCORD_COMMAND_SYNC_POLICY` | 起動時にスラッシュコマンドを揃える方針: `safe`（差分を見て合わせる）、`bulk`（従来の `tree.sync()`）、`off` |
| `DISCORD_REQUIRE_MENTION` | サーバーのチャンネルでは @メンションがないと応答しないようにします |
| `DISCORD_FREE_RESPONSE_CHANNELS` | メンションなしでも応答するチャンネル ID をカンマ区切りで |
| `DISCORD_AUTO_THREAD` | 対応している場面で、長い返信を自動でスレッドにします |
| `DISCORD_ALLOW_ANY_ATTACHMENT` | `true` にすると、どんな種類の添付でも受け取ります（組み込みの PDF / テキスト / zip / オフィス文書の許可一覧に限りません）。知らない種類は保存され、手元のパスとしてエージェントに渡るので、`terminal` / `read_file` / `ffprobe` で中身を調べられます。既定は `false` です。 |
| `DISCORD_MAX_ATTACHMENT_BYTES` | ゲートウェイが保存する添付 1 つあたりの最大バイト数。既定は `33554432`（32 MiB）です。`0` にすると上限なしになります（書き出しのあいだ、添付はメモリー上に置かれます）。 |
| `DISCORD_FREE_RESPONSE_AUTO_THREAD` | `true` にすると、メンション不要のチャンネル（`DISCORD_FREE_RESPONSE_CHANNELS` に挙げたもの）でも、最上位のメッセージごとにスレッドを自動で作ります。既定は `false` で、そのままチャンネル内で返信します。`DISCORD_AUTO_THREAD=true` が必要で、`DISCORD_NO_THREAD_CHANNELS` のほうが依然として優先されます。 |
| `DISCORD_REACTIONS` | 処理中にメッセージへ絵文字のリアクションを付けます（既定: `true`） |
| `DISCORD_IGNORED_CHANNELS` | ボットが決して応答しないチャンネル ID をカンマ区切りで |
| `DISCORD_NO_THREAD_CHANNELS` | ボットが自動のスレッド化をせずに応答するチャンネル ID をカンマ区切りで |
| `DISCORD_REPLY_TO_MODE` | 返信を紐づける挙動: `off`、`first`（既定）、`all` |
| `DISCORD_ALLOW_MENTION_EVERYONE` | ボットが `@everyone`/`@here` で全員に通知するのを許します（既定: `false`）。[メンションの制御](/hermes/docs/user-guide/messaging/discord/#mention-control) を参照してください。 |
| `DISCORD_ALLOW_MENTION_ROLES` | ボットが `@role` のメンションで通知するのを許します（既定: `false`）。 |
| `DISCORD_ALLOW_MENTION_USERS` | ボットが個別の `@user` のメンションで通知するのを許します（既定: `true`）。 |
| `DISCORD_ALLOW_MENTION_REPLIED_USER` | 返信するときに、その投稿者へ通知します（既定: `true`）。 |
| `DISCORD_MISSED_MESSAGE_BACKFILL` | `discord.missed_message_backfill.enabled` の代わりに使える環境変数です。切断中に取りこぼしたメッセージを流し直します（既定: `false`）。[取りこぼしたメッセージの取り込み](/hermes/docs/user-guide/messaging/discord/#discordmissed_message_backfill) を参照してください。 |
| `DISCORD_MISSED_MESSAGE_BACKFILL_CHANNELS` | 調べるチャンネル ID をカンマ区切りで（`discord.missed_message_backfill.channels` の代わり。空なら `discord.free_response_channels`、`*` なら届く範囲のすべてのテキストチャンネル）。 |
| `DISCORD_MISSED_MESSAGE_BACKFILL_WINDOW_SECONDS` | どこまでさかのぼって調べるか（`window_seconds` の代わり。既定 `21600`、最小 `60`）。 |
| `DISCORD_MISSED_MESSAGE_BACKFILL_LIMIT` | 1 回の走査でチャンネルごとに取得する最大件数（`limit` の代わり。既定 `100`、1〜500）。 |
| `DISCORD_MISSED_MESSAGE_BACKFILL_MAX_DISPATCHES` | 1 回の走査で流し直す最大件数（`max_dispatches` の代わり。既定 `10`、1〜100）。 |
| `DISCORD_MISSED_MESSAGE_BACKFILL_MAX_ATTEMPTS` | 再接続をまたいで、同じメッセージを流し直す通算の上限（`max_attempts` の代わり。既定 `3`、1〜100）。 |
| `SLACK_BOT_TOKEN` | Slack のボットのトークン（`xoxb-...`） |
| `SLACK_APP_TOKEN` | Slack のアプリレベルのトークン（`xapp-...`。ソケットモードで必要です） |
| `SLACK_ALLOWED_USERS` | Slack のユーザー ID をカンマ区切りで |
| `SLACK_ALLOW_ALL_USERS` | どの Slack 利用者でもボットを動かせるようにします（開発時のみ）。 |
| `SLACK_ALLOW_BOTS` | ほかの Slack のボットからのメッセージを受け取るか: `none`（既定）、`mentions`、`all`。自分自身のメッセージは常に無視します。 |
| `SLACK_THREAD_REQUIRE_MENTION` | Slack のスレッドでの返信には @メンションを必須にしつつ、最上位でメンション不要のチャンネルはそのまま残します |
| `SLACK_HOME_CHANNEL` | 定時実行の配信先になる既定の Slack のチャンネル |
| `SLACK_HOME_CHANNEL_NAME` | Slack の既定チャンネルの表示名 |
| `GOOGLE_CHAT_PROJECT_ID` | Pub/Sub のトピックを置く GCP のプロジェクト（無ければ `GOOGLE_CLOUD_PROJECT` を見ます） |
| `GOOGLE_CHAT_SUBSCRIPTION_NAME` | Pub/Sub のサブスクリプションのフルパス、`projects/{proj}/subscriptions/{sub}`（古い別名: `GOOGLE_CHAT_SUBSCRIPTION`） |
| `GOOGLE_CHAT_SERVICE_ACCOUNT_JSON` | サービスアカウントの JSON のパス、または JSON そのもの（無ければ `GOOGLE_APPLICATION_CREDENTIALS` を見ます） |
| `GOOGLE_CHAT_ALLOWED_USERS` | ボットと話せる利用者のメールアドレスをカンマ区切りで |
| `GOOGLE_CHAT_ALLOW_ALL_USERS` | どの Google Chat 利用者でもボットを動かせるようにします（開発時のみ） |
| `GOOGLE_CHAT_HOME_CHANNEL` | 定時実行の配信先になる既定のスペース（`spaces/AAAA...` など） |
| `GOOGLE_CHAT_HOME_CHANNEL_NAME` | Google Chat の既定スペースの表示名 |
| `GOOGLE_CHAT_MAX_MESSAGES` | Pub/Sub の流量制御で、同時に処理する最大メッセージ数（既定: `1`） |
| `GOOGLE_CHAT_MAX_BYTES` | Pub/Sub の流量制御で、同時に処理する最大バイト数（既定: `16777216`、16 MiB） |
| `GOOGLE_CHAT_BOOTSTRAP_SPACES` | ボット自身の `users/{id}` を調べるとき、起動時に追加で当たるスペース ID をカンマ区切りで |
| `GOOGLE_CHAT_DEBUG_RAW` | 何か値を入れると、伏せ字にした Pub/Sub の受信内容を DEBUG の水準で記録します（不具合調査用） |
| `GOOGLE_CHAT_HTTP_EVENTS_URL` | Chat のメッセージイベントを受ける、認証付きの HTTP エンドポイント（Pub/Sub の代わり） |
| `GOOGLE_CHAT_HTTP_EVENTS_AUDIENCE` | Google が署名した HTTP イベントのトークンで期待する対象（既定は `GOOGLE_CHAT_HTTP_EVENTS_URL`） |
| `GOOGLE_CHAT_HTTP_EVENTS_SERVICE_ACCOUNT_EMAIL` | HTTP イベントのトークンで期待する Google のサービスアカウントのメールアドレス |
| `WHATSAPP_ENABLED` | WhatsApp の橋渡しを有効にします（`true`/`false`） |
| `WHATSAPP_MODE` | `bot`（別の番号を使う）か `self-chat`（自分宛てに送る） |
| `WHATSAPP_ALLOWED_USERS` | 電話番号をカンマ区切りで（国番号付き、`+` なし）。`*` にすると送信者を問いません |
| `WHATSAPP_ALLOW_ALL_USERS` | 許可一覧なしで、すべての WhatsApp の送信者を受け入れます（`true`/`false`） |
| `WHATSAPP_GROUP_POLICY` | グループの受け入れ方: `pairing`（既定。グループからは何も転送しません）、`allowlist`（下のグループ JID）、`open`（すべてのグループ。参加者は `WHATSAPP_ALLOWED_USERS`、ペアリング、`WHATSAPP_ALLOW_ALL_USERS` のいずれかが必要です）、`disabled` |
| `WHATSAPP_GROUP_ALLOWED_USERS` | `WHATSAPP_GROUP_POLICY=allowlist` のときに受け入れるグループ JID をカンマ区切りで（`120363001234567890@g.us` など） |
| `WHATSAPP_HOME_CHANNEL` | 定時実行や通知の配信先になる既定のチャット ID。 |
| `WHATSAPP_HOME_CHANNEL_NAME` | WhatsApp の既定チャンネルの表示名。 |
| `WHATSAPP_DEBUG` | 調査のために、橋渡しの中でメッセージのイベントをそのまま記録します（`true`/`false`） |
| `WHATSAPP_CLOUD_PHONE_NUMBER_ID` | WhatsApp Business Cloud API での Meta の電話番号 ID（15〜17 桁。電話番号そのものでは**ありません**） |
| `WHATSAPP_CLOUD_ACCESS_TOKEN` | Meta のアクセストークン（`EAA` で始まります）。一時のトークンは 24 時間で切れ、システムユーザーのトークンは期限がありません |
| `WHATSAPP_CLOUD_APP_SECRET` | 受信 webhook の署名を確かめるための、32 文字の 16 進のアプリの秘密 |
| `WHATSAPP_CLOUD_VERIFY_TOKEN` | Meta の webhook 検証のやり取りで使う共有の秘密（設定の案内が自動で作ります） |
| `WHATSAPP_CLOUD_ALLOWED_USERS` | ボットへ送れる `wa_id`（国番号付きの電話番号、`+` なし）をカンマ区切りで |
| `WHATSAPP_CLOUD_ALLOW_ALL_USERS` | 許可一覧なしで、すべての WhatsApp Cloud の送信者を受け入れます（`true`/`false`） |
| `WHATSAPP_CLOUD_APP_ID` | Meta のアプリ ID（任意。今後の分析機能との連携用） |
| `WHATSAPP_CLOUD_WABA_ID` | WhatsApp Business Account の ID（任意。今後の分析機能との連携用） |
| `WHATSAPP_CLOUD_WEBHOOK_HOST` | 受信 webhook のサーバーが待ち受けるインターフェース（既定 `0.0.0.0`） |
| `WHATSAPP_CLOUD_WEBHOOK_PORT` | 受信 webhook のサーバーが待ち受けるポート（既定 `8090`） |
| `WHATSAPP_CLOUD_WEBHOOK_PATH` | Meta が受信メッセージを送ってくる URL のパス（既定 `/whatsapp/webhook`） |
| `WHATSAPP_CLOUD_API_VERSION` | 呼び出す Meta Graph API の版（既定 `v20.0`） |
| `WHATSAPP_CLOUD_HOME_CHANNEL` | ボットの既定チャンネルとして使う `wa_id`（定時実行などで使います） |
| `WHATSAPP_CLOUD_DM_POLICY` | Cloud 版での個別メッセージの受け入れ方（`open`/`allowlist`/`disabled`）。設定しなければ `WHATSAPP_DM_POLICY` を見ます |
| `WHATSAPP_CLOUD_ALLOW_FROM` | `dm_policy: allowlist` のときに許可する送信者をカンマ区切りで（`wa_id` をそのまま。Baileys 形式の JID は正規化されます） |
| `WHATSAPP_CLOUD_GROUP_POLICY` | Cloud 版でのグループの受け入れ方（`open`/`allowlist`/`disabled`）。設定しなければ `WHATSAPP_GROUP_POLICY` を見ます |
| `WHATSAPP_CLOUD_GROUP_ALLOW_FROM` | `group_policy: allowlist` のときに許可するグループチャットの ID をカンマ区切りで |
| `SIGNAL_HTTP_URL` | signal-cli のデーモンの HTTP エンドポイント（たとえば `http://127.0.0.1:8080`） |
| `SIGNAL_ACCOUNT` | E.164 形式のボットの電話番号 |
| `SIGNAL_ALLOWED_USERS` | E.164 形式の電話番号か UUID をカンマ区切りで |
| `SIGNAL_GROUP_ALLOWED_USERS` | グループ ID をカンマ区切りで。`*` にするとすべてのグループが対象です |
| `SIGNAL_HOME_CHANNEL_NAME` | Signal の既定チャンネルの表示名 |
| `SIGNAL_IGNORE_STORIES` | Signal のストーリーや近況の更新を無視します |
| `SIGNAL_ALLOW_ALL_USERS` | 許可一覧なしで、すべての Signal 利用者を受け入れます |
| `TWILIO_ACCOUNT_SID` | Twilio のアカウント SID（電話のスキルと共通です） |
| `TWILIO_AUTH_TOKEN` | Twilio の認証トークン（電話のスキルと共通で、webhook の署名の検証にも使います） |
| `TWILIO_PHONE_NUMBER` | E.164 形式の Twilio の電話番号（電話のスキルと共通です） |
| `SMS_WEBHOOK_URL` | Twilio の署名の検証に使う公開 URL — Twilio のコンソールに登録した webhook の URL と一致させる必要があります（必須） |
| `SMS_WEBHOOK_PORT` | 受信 SMS の webhook を待ち受けるポート（既定: `8080`） |
| `SMS_WEBHOOK_HOST` | webhook が待ち受けるアドレス（既定: `127.0.0.1`） |
| `SMS_INSECURE_NO_SIGNATURE` | `true` にすると Twilio の署名の検証を切ります（手元の開発用で、本番向けではありません） |
| `SMS_ALLOWED_USERS` | やり取りを許す E.164 形式の電話番号をカンマ区切りで |
| `SMS_ALLOW_ALL_USERS` | 許可一覧なしで、すべての SMS の送信者を受け入れます |
| `SMS_HOME_CHANNEL` | 定時実行や通知の配信先になる電話番号 |
| `SMS_HOME_CHANNEL_NAME` | SMS の既定チャンネルの表示名 |
| `EMAIL_ADDRESS` | メール用のゲートウェイで使うメールアドレス |
| `EMAIL_PASSWORD` | そのメールアカウントのパスワード、またはアプリ用のパスワード |
| `EMAIL_IMAP_HOST` | メール用のアダプターが使う IMAP のホスト名 |
| `EMAIL_IMAP_PORT` | IMAP のポート |
| `EMAIL_SMTP_HOST` | メール用のアダプターが使う SMTP のホスト名 |
| `EMAIL_SMTP_PORT` | SMTP のポート |
| `EMAIL_ALLOWED_USERS` | ボットへ送れるメールアドレスをカンマ区切りで |
| `EMAIL_HOME_ADDRESS` | こちらから送るメールの既定の宛先 |
| `EMAIL_HOME_ADDRESS_NAME` | メールの既定の宛先の表示名 |
| `EMAIL_POLL_INTERVAL` | メールを確認しにいく間隔（秒） |
| `EMAIL_ALLOW_ALL_USERS` | 受信するメールの送信者をすべて受け入れます |
| `DINGTALK_CLIENT_ID` | 開発者ポータルで取得する DingTalk のボットの AppKey（[open.dingtalk.com](https://open.dingtalk.com)） |
| `DINGTALK_CLIENT_SECRET` | 開発者ポータルで取得する DingTalk のボットの AppSecret |
| `DINGTALK_ALLOWED_USERS` | ボットへ送れる DingTalk のユーザー ID をカンマ区切りで |
| `DINGTALK_WEBHOOK_URL` | 別のプラットフォームからの配信や定時実行に使う、固定のロボットの webhook URL。 |
| `DINGTALK_HOME_CHANNEL` | 定時実行や通知の配信先になる既定の会話 ID。 |
| `DINGTALK_HOME_CHANNEL_NAME` | DingTalk の既定チャンネルの表示名。 |
| `FEISHU_APP_ID` | [open.feishu.cn](https://open.feishu.cn/) で取得する Feishu / Lark のボットの App ID |
| `FEISHU_APP_SECRET` | Feishu / Lark のボットの App Secret |
| `FEISHU_DOMAIN` | `feishu`（中国）か `lark`（国際版）。既定: `feishu` |
| `FEISHU_CONNECTION_MODE` | `websocket`（おすすめ）か `webhook`。既定: `websocket` |
| `FEISHU_ENCRYPT_KEY` | webhook 方式で使う暗号化キー（任意） |
| `FEISHU_VERIFICATION_TOKEN` | webhook 方式で使う検証用のトークン（任意） |
| `FEISHU_ALLOWED_USERS` | ボットへ送れる Feishu のユーザー ID をカンマ区切りで |
| `FEISHU_ALLOW_BOTS` | `none`（既定）/ `mentions` / `all` — ほかのボットからのメッセージを受け取ります。[ボット同士のやり取り](/hermes/docs/user-guide/messaging/feishu/#bot-to-bot-messaging) を参照してください |
| `FEISHU_REQUIRE_MENTION` | `true`（既定）/ `false` — グループのメッセージでボットへの @メンションを必須にするか。チャットごとに `group_rules.<chat_id>.require_mention` で上書きできます。 |
| `FEISHU_HOME_CHANNEL` | 定時実行の配信と通知に使う Feishu のチャット ID |
| `FEISHU_HOME_CHANNEL_NAME` | Feishu の既定チャンネルの表示名。 |
| `FEISHU_ALLOW_ALL_USERS` | どの Feishu 利用者でもボットを動かせるようにします（開発時のみ）。 |
| `WECOM_BOT_ID` | 管理コンソールで取得する WeCom の AI ボットの ID |
| `WECOM_SECRET` | WeCom の AI ボットの秘密 |
| `WECOM_WEBSOCKET_URL` | WebSocket の URL を指定します（既定: `wss://openws.work.weixin.qq.com`） |
| `WECOM_ALLOWED_USERS` | ボットへ送れる WeCom のユーザー ID をカンマ区切りで |
| `WECOM_HOME_CHANNEL` | 定時実行の配信と通知に使う WeCom のチャット ID |
| `WECOM_CALLBACK_CORP_ID` | コールバック方式の自作アプリで使う WeCom の企業の Corp ID |
| `WECOM_CALLBACK_CORP_SECRET` | その自作アプリの Corp の秘密 |
| `WECOM_CALLBACK_AGENT_ID` | その自作アプリの Agent ID |
| `WECOM_CALLBACK_TOKEN` | コールバックの検証用トークン |
| `WECOM_CALLBACK_ENCODING_AES_KEY` | コールバックの暗号化に使う AES のキー |
| `WECOM_CALLBACK_HOST` | コールバックのサーバーが待ち受けるアドレス（既定: `0.0.0.0`） |
| `WECOM_CALLBACK_PORT` | コールバックのサーバーのポート（既定: `8645`） |
| `WECOM_CALLBACK_ALLOWED_USERS` | 許可一覧に入れるユーザー ID をカンマ区切りで |
| `WECOM_CALLBACK_ALLOW_ALL_USERS` | `true` にすると、許可一覧なしですべての利用者を受け入れます |
| `WEIXIN_ACCOUNT_ID` | iLink Bot API の QR コードのログインで取得する Weixin のアカウント ID |
| `WEIXIN_TOKEN` | iLink Bot API の QR コードのログインで取得する Weixin の認証トークン |
| `WEIXIN_BASE_URL` | Weixin の iLink Bot API のベース URL を上書きします（既定: `https://ilinkai.weixin.qq.com`） |
| `WEIXIN_CDN_BASE_URL` | メディア用の Weixin の CDN のベース URL を上書きします（既定: `https://novac2c.cdn.weixin.qq.com/c2c`） |
| `WEIXIN_DM_POLICY` | 個別メッセージの方針: `open`、`allowlist`、`pairing`、`disabled`（既定: `open`） |
| `WEIXIN_GROUP_POLICY` | グループのメッセージの方針: `open`、`allowlist`、`disabled`（既定: `disabled`） |
| `WEIXIN_ALLOWED_USERS` | ボットへ個別に送れる Weixin のユーザー ID をカンマ区切りで |
| `WEIXIN_GROUP_ALLOWED_USERS` | ボットとやり取りできる Weixin の**グループチャットの ID**（参加者のユーザー ID ではありません）をカンマ区切りで。変数名は昔の名残で、実際にはグループの ID を入れます。iLink が実際にグループのイベントを届ける場合にだけ効きます。QR コードでログインした iLink のボットの身元（`...@im.bot`）は、ふつうの WeChat のグループのメッセージを受け取らないのが一般的です。 |
| `WEIXIN_HOME_CHANNEL` | 定時実行の配信と通知に使う Weixin のチャット ID |
| `WEIXIN_HOME_CHANNEL_NAME` | Weixin の既定チャンネルの表示名 |
| `WEIXIN_ALLOW_ALL_USERS` | 許可一覧なしで、すべての Weixin 利用者を受け入れます（`true`/`false`） |
| `BLUEBUBBLES_SERVER_URL` | BlueBubbles のサーバー URL（たとえば `http://192.168.1.10:1234`） |
| `BLUEBUBBLES_PASSWORD` | BlueBubbles のサーバーのパスワード |
| `BLUEBUBBLES_WEBHOOK_HOST` | webhook が待ち受けるアドレス（既定: `127.0.0.1`） |
| `BLUEBUBBLES_WEBHOOK_PORT` | webhook が待ち受けるポート（既定: `8645`） |
| `BLUEBUBBLES_HOME_CHANNEL` | 定時実行や通知の配信先になる電話番号やメールアドレス |
| `BLUEBUBBLES_ALLOWED_USERS` | 許可する利用者をカンマ区切りで |
| `BLUEBUBBLES_ALLOW_ALL_USERS` | すべての利用者を受け入れます（`true`/`false`） |
| `QQ_APP_ID` | [q.qq.com](https://q.qq.com) で取得する QQ Bot の App ID |
| `QQ_CLIENT_SECRET` | [q.qq.com](https://q.qq.com) で取得する QQ Bot の App Secret |
| `QQ_STT_API_KEY` | 外部の音声認識に切り替えるときの API キー（任意。QQ の組み込みの音声認識が何も返さないときに使います） |
| `QQ_STT_BASE_URL` | 外部の音声認識のベース URL（任意） |
| `QQ_STT_MODEL` | 外部の音声認識のモデル名（任意） |
| `QQ_ALLOWED_USERS` | ボットへ送れる QQ の利用者の openID をカンマ区切りで |
| `QQ_GROUP_ALLOWED_USERS` | グループでの @ 付きメッセージを許す QQ のグループ ID をカンマ区切りで |
| `QQ_ALLOW_ALL_USERS` | すべての利用者を受け入れます（`true`/`false`。`QQ_ALLOWED_USERS` より優先されます） |
| `QQBOT_HOME_CHANNEL` | 定時実行の配信と通知に使う QQ の利用者やグループの openID |
| `QQBOT_HOME_CHANNEL_NAME` | QQ の既定チャンネルの表示名 |
| `QQ_PORTAL_HOST` | QQ のポータルのホストを上書きします（`sandbox.q.qq.com` にすると検証用のゲートウェイを通ります。既定: `q.qq.com`）。 |
| `QQ_SANDBOX` | 開発時の検証のために QQ の検証モードを有効にします（`true`/`false`） |
| `MATTERMOST_URL` | Mattermost のサーバー URL（たとえば `https://mm.example.com`） |
| `MATTERMOST_TOKEN` | Mattermost のボットのトークン、または個人のアクセストークン |
| `MATTERMOST_ALLOWED_USERS` | ボットへ送れる Mattermost のユーザー ID をカンマ区切りで |
| `MATTERMOST_ALLOW_ALL_USERS` | どの Mattermost 利用者でもボットを動かせるようにします（開発時のみ）。 |
| `MATTERMOST_ALLOWED_CHANNELS` | 設定すると、ボットはこれらのチャンネルでだけ応答します（許可一覧）。 |
| `MATTERMOST_HOME_CHANNEL` | こちらから送るメッセージ（定時実行、通知）の配信先になるチャンネル ID |
| `MATTERMOST_REQUIRE_MENTION` | チャンネルでは `@mention` を必須にします（既定: `true`）。`false` にするとすべてのメッセージに応答します。 |
| `MATTERMOST_FREE_RESPONSE_CHANNELS` | `@mention` なしでボットが応答するチャンネル ID をカンマ区切りで |
| `MATTERMOST_REPLY_MODE` | 返信の形式: `thread`（スレッドで返す）か `off`（並べて返す。既定） |
| `MATRIX_HOMESERVER` | Matrix のホームサーバーの URL（たとえば `https://matrix.org`） |
| `MATRIX_ACCESS_TOKEN` | ボットの認証に使う Matrix のアクセストークン |
| `MATRIX_USER_ID` | Matrix のユーザー ID（たとえば `@hermes:matrix.org`）— パスワードでログインするなら必須で、アクセストークンを使うなら任意です |
| `MATRIX_PASSWORD` | Matrix のパスワード（アクセストークンの代わり） |
| `MATRIX_ALLOWED_USERS` | ボットへ送れる Matrix のユーザー ID をカンマ区切りで（たとえば `@alice:matrix.org`） |
| `MATRIX_ALLOW_ALL_USERS` | どの Matrix 利用者でもボットを動かせるようにします（開発時のみ）。 |
| `MATRIX_HOME_CHANNEL` | 定時実行や通知の配信先になる既定のルーム ID。 |
| `MATRIX_HOME_CHANNEL_NAME` | Matrix の既定ルームの表示名。 |
| `MATRIX_ALLOWED_ROOMS` | ボットが応答してよい Matrix のルーム ID をカンマ区切りで。個別のやり取りと自動判定されたルーム（名前にかかわらず、参加者が 2 人以下のルーム）には適用されず、そちらは常に応答します。 |
| `MATRIX_HOME_ROOM` | こちらから送るメッセージの配信先になるルーム ID（たとえば `!abc123:matrix.org`） |
| `MATRIX_ENCRYPTION` | 端から端までの暗号化を有効にします（`true`/`false`。既定: `false`） |
| `MATRIX_E2EE_MODE` | Matrix の端から端までの暗号化の扱い: `off`、`optional`、`required`。設定すると `MATRIX_ENCRYPTION` より優先されます。 |
| `MATRIX_DEVICE_ID` | 再起動をまたいで暗号化の状態を保つための、固定の Matrix のデバイス ID（たとえば `HERMES_BOT`）。これが無いと起動のたびに鍵が変わり、過去のルームの復号ができなくなります。 |
| `MATRIX_REACTIONS` | 受信したメッセージに、処理の進み具合を示す絵文字のリアクションを付けます（既定: `true`）。`false` で切れます。 |
| `MATRIX_REQUIRE_MENTION` | ルームでは `@mention` を必須にします（既定: `true`）。`false` にするとすべてのメッセージに応答します。参加者が 2 人以下のルームは個別のやり取りと自動判定され、この設定にかかわらずメンションは不要になります。あえて 2 人のルームをふつうのルームとして扱いたいときは、3 人目を足してください。 |
| `MATRIX_FREE_RESPONSE_ROOMS` | `@mention` なしでボットが応答するルーム ID をカンマ区切りで。個別のやり取りと自動判定されたルーム（参加者 2 人以下）はもともとメンションなしで応答するので、この一覧を見ません。 |
| `MATRIX_IGNORE_USER_PATTERNS` | 無視する Matrix の橋渡し / アプリサービスの代理ユーザー ID の正規表現をカンマ区切りで |
| `MATRIX_PROCESS_NOTICES` | 受信した Matrix の `m.notice` のイベントを処理します（既定: `false`） |
| `MATRIX_SESSION_SCOPE` | プロジェクト用ルームでのセッションの単位: `auto`、`room`、`thread`（既定: `auto`） |
| `MATRIX_ALLOW_ROOM_MENTIONS` | ルーム全員へ通知する `@room` のメンションを送れるようにします（既定: `false`） |
| `MATRIX_AUTO_THREAD` | ルームのメッセージでスレッドを自動で作ります（既定: `true`）。個別のやり取りと自動判定されたルーム（参加者 2 人以下）には適用されず、そちらは `MATRIX_DM_AUTO_THREAD` に従います。 |
| `MATRIX_DM_AUTO_THREAD` | Matrix の個別のやり取りでスレッドを自動で作ります（既定: `false`） |
| `MATRIX_DM_MENTION_THREADS` | 個別のやり取りでボットが `@mentioned` されたときにスレッドを作ります（既定: `false`） |
| `MATRIX_APPROVAL_REQUIRE_SENDER` | 承認やモデル選択のリアクションを、依頼した本人からのものに限ります（分かる場合。既定: `true`） |
| `MATRIX_APPROVAL_TIMEOUT_SECONDS` | Matrix のリアクションによる承認・モデル選択の待ち時間（既定: `300`） |
| `MATRIX_ALLOW_PUBLIC_ROOMS` | Matrix のルーム作成のツールが公開ルームを作れるようにします（既定: `false`） |
| `MATRIX_MAX_MEDIA_BYTES` | Matrix のメディアの送受信の最大バイト数（既定: `104857600`） |
| `MATRIX_RECOVERY_KEY` | デバイスの鍵を入れ替えたあと、相互署名の検証に使う復旧キー。相互署名を有効にした暗号化の構成ではおすすめです。 |
| `MATRIX_RECOVERY_KEY_OUTPUT_FILE` | 生成した Matrix の復旧キーを一度だけ書き出すパス（任意）。`0600` の権限で作られ、上書きされることはありません。 |
| `HASS_TOKEN` | Home Assistant の長期有効なアクセストークン（HA のプラットフォームとツールが使えるようになります） |
| `HASS_URL` | Home Assistant の URL（既定: `http://homeassistant.local:8123`） |
| `WEBHOOK_ENABLED` | webhook のプラットフォーム用アダプターを有効にします（`true`/`false`） |
| `WEBHOOK_PORT` | webhook を受け取る HTTP サーバーのポート（既定: `8644`） |
| `WEBHOOK_SECRET` | webhook の署名の検証に使う共通の HMAC の秘密（経路ごとの指定が無いときに使われます） |
| `API_SERVER_ENABLED` | OpenAI 互換の API サーバーを有効にします（`true`/`false`）。ほかのプラットフォームと並べて動きます。 |
| `API_SERVER_KEY` | API サーバーの認証に使う bearer トークン。API サーバーを有効にするなら必須です。 |
| `API_SERVER_CORS_ORIGINS` | API サーバーをブラウザから直接呼べるようにするオリジンをカンマ区切りで（たとえば `http://localhost:3000,http://127.0.0.1:3000`）。既定は無効です。 |
| `API_SERVER_PORT` | API サーバーのポート（既定: `8642`） |
| `API_SERVER_HOST` | API サーバーが待ち受けるアドレス（既定: `127.0.0.1`）。ループバックでも `API_SERVER_KEY` は必要です。ブラウザから使うなら `API_SERVER_CORS_ORIGINS` を狭く絞ってください。 |
| `API_SERVER_MODEL_NAME` | `/v1/models` で名乗るモデル名。既定はプロファイル名（既定のプロファイルなら `hermes-agent`）です。Open WebUI のような画面が接続ごとに別々のモデル名を必要とする、複数人での構成で役に立ちます。 |
| `GATEWAY_PROXY_URL` | メッセージを転送する先の、遠隔の Hermes API サーバーの URL（[プロキシ方式](/hermes/docs/user-guide/messaging/matrix/#proxy-mode-e2ee-on-macos)）。設定すると、ゲートウェイはプラットフォームとの入出力だけを担い、エージェントの処理はすべて遠隔のサーバーに任せます。`config.yaml` の `gateway.proxy_url` でも設定できます。 |
| `GATEWAY_PROXY_KEY` | プロキシ方式で遠隔の API サーバーへ認証するための bearer トークン。遠隔側の `API_SERVER_KEY` と一致させる必要があります。 |
| `MESSAGING_CWD` | ゲートウェイの作業ディレクトリを指定する、互換のために残っている古い方法です。`config.yaml` の `terminal.cwd` をおすすめします。 |
| `GATEWAY_ALLOWED_USERS` | すべてのプラットフォームで共通して許可するユーザー ID をカンマ区切りで |
| `GATEWAY_ALLOW_ALL_USERS` | 許可一覧なしですべての利用者を受け入れます（`true`/`false`。既定: `false`）。`config.yaml` の `gateway.allow_all_users` でも設定でき、両方あれば環境変数が勝ちます。 |

### ウェブのダッシュボードと Hermes Desktop {#web-dashboard-hermes-desktop}

[ウェブのダッシュボード](/hermes/docs/user-guide/features/web-dashboard/) の認証と、[Hermes Desktop を遠隔のバックエンドにつなぐ](/hermes/docs/user-guide/features/web-dashboard/#connecting-hermes-desktop-to-a-remote-backend) ための設定です。秘密だけを環境変数に置くという決まりに従い、資格情報は `~/.hermes/.env` に置きます。OAuth の `client_id` は `config.yaml` の `dashboard.oauth` の下に書くほうが向いています（環境変数があればそちらが勝ちます）。

ダッシュボードの認証は 3 種類が同梱されています。Hermes Desktop を遠隔につなぐ場合や、インターネットに面したダッシュボードでは、**OAuth（Nous Portal）** がおすすめです。`HERMES_DASHBOARD_OAUTH_CLIENT_ID` を設定してください（`hermes dashboard register` で発行できます）。同梱の**ユーザー名とパスワード**の方式（`HERMES_DASHBOARD_BASIC_AUTH_*`）は、信頼できる LAN や VPN の内側にあるバックエンドに最も手早い選択肢ですが、そのままインターネットに公開するのには向きません。自前の認証基盤で認証したい場合は、**自前運用の OIDC**（`HERMES_DASHBOARD_OIDC_*`）を使ってください。いずれの場合も、ループバック以外に待ち受ける（`hermes dashboard --host 0.0.0.0`）と認証の関門が働きます。全体像は [ウェブのダッシュボード → 認証](/hermes/docs/user-guide/features/web-dashboard/#authentication-gated-mode) をご覧ください。

| 変数 | 説明 |
|----------|-------------|
| `HERMES_DASHBOARD_BASIC_AUTH_USERNAME` | 同梱のユーザー名 / パスワード方式（`plugins/dashboard_auth/basic`）で使うユーザー名。パスワードと一緒に設定すると、この方式が有効になります。`dashboard.basic_auth.username` より優先されます。 |
| `HERMES_DASHBOARD_BASIC_AUTH_PASSWORD` | この方式で使う平文のパスワード（読み込み時にメモリー上でハッシュ化されます）。設定の `password_hash` より優先されるので、環境変数で入れ替えられます。`dashboard.basic_auth.password` より優先されます。 |
| `HERMES_DASHBOARD_BASIC_AUTH_PASSWORD_HASH` | この方式で使う scrypt のパスワードハッシュ（平文が残らないのでこちらがおすすめ）。`python -c "from plugins.dashboard_auth.basic import hash_password; print(hash_password('PW'))"` で作れます。`dashboard.basic_auth.password_hash` より優先されます。 |
| `HERMES_DASHBOARD_BASIC_AUTH_SECRET` | この方式の、状態を持たないセッショントークンに署名する HMAC のキー（32 バイト以上。base64 / 16 進 / そのままの文字列）。再起動をまたいでセッションを保ちたい場合や、複数のワーカーで共有する場合は明示的に設定してください。空だとプロセスごとにランダムになり、再起動のたびにログアウトします。`dashboard.basic_auth.secret` より優先されます。 |
| `HERMES_DASHBOARD_BASIC_AUTH_TTL_SECONDS` | この方式のアクセストークンの有効時間（既定 12 時間）。`dashboard.basic_auth.session_ttl_seconds` より優先されます。 |
| `HERMES_DASHBOARD_OAUTH_CLIENT_ID` | 認証付き / 公開のダッシュボードで使う OAuth のクライアント ID（`agent:{instance_id}`）。設定すると Nous の方式（`plugins/dashboard_auth/nous`）が有効になります。`dashboard.oauth.client_id` より優先されます。`hermes dashboard register` で発行してください。 |
| `HERMES_DASHBOARD_SESSION_TOKEN` | ダッシュボードの取り扱いに注意が要る `/api` の経路で使う、プロセスごとのセッショントークン。`hermes dashboard` を起動した側（デスクトップの外枠、リンク型の連携）が発行します。親プロセスが渡した値はそのまま保たれ、`~/.hermes/.env` に `HERMES_DASHBOARD_SESSION_TOKEN` の行があっても置き換わりません。設定が無ければ、サーバーが起動のたびに新しいトークンを作ります。 |
| `HERMES_DASHBOARD_PUBLIC_URL` | リバースプロキシの背後で、ダッシュボードに実際にたどり着く完全な公開 URL。OAuth のコールバックの組み立てに使われ、そのホスト名が HTTP の Host と WebSocket の Origin の検査に加わります。バックエンドがループバックに待ち受けていても、ループバック以外の公開ホストでは認証の関門が必須になります。`dashboard.public_url` より優先されます。 |
| `HERMES_DASHBOARD_OIDC_ISSUER` | 同梱の自前運用の OIDC（`plugins/dashboard_auth/self_hosted`）で使う発行者の URL。有効にするには必須です。`dashboard.oauth.self_hosted.issuer` より優先されます。 |
| `HERMES_DASHBOARD_OIDC_CLIENT_ID` | 自前運用の OIDC で使う公開のクライアント ID（認可コード + PKCE）。有効にするには必須です。`dashboard.oauth.self_hosted.client_id` より優先されます。 |
| `HERMES_DASHBOARD_OIDC_SCOPES` | 自前運用の OIDC で要求するスコープ（既定 `openid profile email`）。`dashboard.oauth.self_hosted.scopes` より優先されます。 |
| `HERMES_DESKTOP_REMOTE_URL` | （デスクトップ側）遠隔のバックエンドのベース URL。たとえば `http://host:9119` です。設定するとアプリ内のゲートウェイの URL より優先されます。ログインは引き続きゲートウェイの設定画面から行います（バックエンドが示す方式に応じて、OAuth の転送かユーザー名 / パスワードになります）。 |
| `HERMES_DESKTOP_HERMES` | デスクトップのバックエンドのコマンドを上書きします。パッケージの作成者や Nix、あるいは不具合の調査で、書き換え可能な管理下のインストールを確かめる前に特定の `hermes` を Electron に指させたいときに使います。 |
| `HERMES_DESKTOP_HERMES_ROOT` | `hermes desktop --hermes-root` が使う、ソースを取得した場所の指定。同梱の初回起動時のインストールや、`PATH` 上の既存の `hermes` より先に見られます。 |
| `HERMES_DESKTOP_IGNORE_EXISTING` | `1` にすると、バックエンドを決めるときに `PATH` 上の既存の `hermes` を無視します。`hermes desktop --ignore-existing` と同じです。 |
| `HERMES_DESKTOP_CWD` | デスクトップのチャットのセッションで最初に使うプロジェクトのディレクトリ。`hermes desktop --cwd` が設定します。 |
| `HERMES_DESKTOP_PYTHON` | バックエンドで使う Python の絶対パス。ソースを取得した構成で Electron が自動で探すより先に見られます。作業ツリーの開発補助（[作業ツリーからの TUI / デスクトップ開発](/hermes/docs/developer-guide/worktree-ui-dev/) を参照）が、共有の仮想環境を使い回すために利用します。 |
| `HERMES_DESKTOP_DEV_SERVER` | Electron の外枠が、同梱のバンドルの代わりに読み込む Vite の開発サーバーの URL（たとえば `http://127.0.0.1:5174`）。`npm run dev` が自動で設定します。アプリ自体をいじるときだけ関係します。 |
| `HERMES_DESKTOP_CDP_PORT` | DOM や CSS を調べる道具のために、描画側が `127.0.0.1` で開ける Chrome DevTools Protocol のポートを上書きします（既定 `9222`）。開発サーバーでの実行（`npm run dev`、`hgui`）では自動で開きますが、パッケージ版では決して開かず、ここに何を書いても変わりません。開発時の実行で閉じたいときは `off` にしてください。このポートに届くものは、描画側でコードを実行できます。 |
| `HTTPS_PROXY` / `HTTP_PROXY` / `NO_PROXY` | （デスクトップ側）アプリ内の更新確認（`Help → Check for Updates…` と、控えめに出る更新の帯）は、これらの標準の変数が示すプロキシを通って `api.github.com` に届きます。`NO_PROXY` の除外も尊重され、`curl`、`npm`、`git` と同じ作法です。設定が無ければ直接つなぎます。 |

### Microsoft Graph（Teams の会議） {#microsoft-graph-teams-meetings}

近く提供される Teams の会議の要約の仕組みが使う、Microsoft Graph の REST クライアント向けのアプリ専用の資格情報です。Azure のポータルでの手順と、必要になる API の権限は [Microsoft Graph のアプリケーションを登録する](/hermes/docs/guides/microsoft-graph-app-registration/) をご覧ください。

| 変数 | 説明 |
|----------|-------------|
| `MSGRAPH_TENANT_ID` | Graph のアプリ登録に使う Azure AD のテナント ID（ディレクトリの GUID）。 |
| `MSGRAPH_CLIENT_ID` | Azure のアプリ登録のアプリケーション（クライアント）ID。 |
| `MSGRAPH_CLIENT_SECRET` | そのアプリ登録のクライアントシークレット。`~/.hermes/.env` に `chmod 600` で保存し、Azure のポータルから定期的に入れ替えてください。 |
| `MSGRAPH_SCOPE` | クライアント資格情報でトークンを取るときの OAuth2 のスコープ（既定: `https://graph.microsoft.com/.default`）。 |
| `MSGRAPH_AUTHORITY_URL` | Microsoft のアイデンティティ基盤の認証局（既定: `https://login.microsoftonline.com`）。各国向けクラウドのときだけ変えてください（GCC High なら `https://login.microsoftonline.us` など）。 |

### Microsoft Graph の webhook の受け口 {#microsoft-graph-webhook-listener}

Graph のイベント（Teams の会議、カレンダー、チャットなど）の変更通知を受け取る仕組みです。設定と安全面の強化は [Microsoft Graph の webhook の受け口](/hermes/docs/user-guide/messaging/msgraph-webhook/) をご覧ください。

| 変数 | 説明 |
|----------|-------------|
| `MSGRAPH_WEBHOOK_ENABLED` | `msgraph_webhook` のゲートウェイのプラットフォームを有効にします（`true`/`1`/`yes`）。 |
| `MSGRAPH_WEBHOOK_PORT` | 受け口が待ち受けるポート（既定: `8646`）。 |
| `MSGRAPH_WEBHOOK_CLIENT_STATE` | Graph が通知のたびに返してくる共有の秘密。`hmac.compare_digest` で照合します。`openssl rand -hex 32` で作ってください。 |
| `MSGRAPH_WEBHOOK_ACCEPTED_RESOURCES` | 受け入れる Graph のリソースのパスや形をカンマ区切りで（たとえば `communications/onlineMeetings,chats/*/messages`）。末尾の `*` は前方一致です。空ならすべて受け入れます。 |
| `MSGRAPH_WEBHOOK_ALLOWED_SOURCE_CIDRS` | 受け口へ POST できる CIDR の範囲をカンマ区切りで（たとえば `52.96.0.0/14,52.104.0.0/14`）。空ならすべて許可します（既定）。本番では Microsoft Graph が公開している送信元の範囲に絞ってください。 |

### Teams の会議の要約の配信 {#teams-meeting-summary-delivery}

[`teams_pipeline` プラグイン](/hermes/docs/user-guide/messaging/msgraph-webhook/) を有効にしたときだけ使われます。`config.yaml` の `platforms.teams.extra` の下でも設定でき、両方あれば環境変数が優先されます。[Microsoft Teams → 会議の要約の配信](/hermes/docs/user-guide/messaging/teams/#meeting-summary-delivery-teams-meeting-pipeline) をご覧ください。

| 変数 | 説明 |
|----------|-------------|
| `TEAMS_DELIVERY_MODE` | `graph` か `incoming_webhook`。 |
| `TEAMS_INCOMING_WEBHOOK_URL` | Teams が発行する webhook の URL。`TEAMS_DELIVERY_MODE=incoming_webhook` のときに必要です。 |
| `TEAMS_GRAPH_ACCESS_TOKEN` | Graph での配信のために、あらかじめ取得した委任のアクセストークン。設定が無ければ `MSGRAPH_*` のアプリの資格情報を使うので、必要になることはまずありません。 |
| `TEAMS_TEAM_ID` | チャンネルへ配信するときの対象の Team ID（`graph` の方式）。 |
| `TEAMS_CHANNEL_ID` | 対象のチャンネル ID（`TEAMS_TEAM_ID` と組みで使います）。 |
| `TEAMS_CHAT_ID` | 対象の 1 対 1 やグループのチャット ID（`graph` の方式で、チームとチャンネルの代わりに使えます）。 |

### LINE Messaging API {#line-messaging-api}

同梱の LINE のプラットフォーム用プラグイン（`plugins/platforms/line/`）が使います。設定のすべては [メッセージングのゲートウェイ → LINE](/hermes/docs/user-guide/messaging/line/) をご覧ください。

| 変数 | 説明 |
|----------|-------------|
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Developers コンソール（Messaging API のタブ）で取得する、長期有効なチャネルアクセストークン。必須です。 |
| `LINE_CHANNEL_SECRET` | チャネルシークレット（Basic settings のタブ）。webhook の HMAC-SHA256 の署名の検証に使います。必須です。 |
| `LINE_HOST` | webhook が待ち受けるホスト（既定: `0.0.0.0`）。 |
| `LINE_PORT` | webhook が待ち受けるポート（既定: `8646`）。 |
| `LINE_PUBLIC_URL` | 公開の HTTPS のベース URL（たとえば `https://my-tunnel.example.com`）。画像・音声・動画を送るには必須です。LINE は HTTPS で届く URL しか受け付けません。 |
| `LINE_ALLOWED_USERS` | ボットへ個別に送れるユーザー ID をカンマ区切りで（`U` で始まります）。 |
| `LINE_ALLOWED_GROUPS` | ボットが応答するグループ ID をカンマ区切りで（`C` で始まります）。 |
| `LINE_ALLOWED_ROOMS` | ボットが応答するルーム ID をカンマ区切りで（`R` で始まります）。 |
| `LINE_ALLOW_ALL_USERS` | 開発時だけの逃げ道で、送信元を問わず受け入れます。既定: `false`。 |
| `LINE_HOME_CHANNEL` | `deliver: line` を指定した定時実行の既定の配信先。 |
| `LINE_SLOW_RESPONSE_THRESHOLD` | 応答が遅いときにテンプレートのボタンを出すまでの秒数（既定: `45`）。`0` にすると切れて、常に push で送り直します。 |
| `LINE_PENDING_TEXT` | そのボタンと一緒に出す吹き出しの文言。 |
| `LINE_BUTTON_LABEL` | ボタンのラベル（既定: `Get answer`）。 |
| `LINE_DELIVERED_TEXT` | すでに届いたボタンをもう一度押したときの返事（既定: `Already replied ✅`）。 |
| `LINE_INTERRUPTED_TEXT` | `/stop` で取り残されたボタンを押したときの返事（既定: `Run was interrupted before completion.`）。 |
| `LINE_EXPIRED_TEXT` | 保存していた答えが無くなった（期限切れ、あるいはプロセスの状態とともに失われた）ボタンを押したときの返事（既定: `That request has expired — send your message again.`）。 |

### ntfy（プッシュ通知） {#ntfy-push-notifications}

[ntfy](https://ntfy.sh/) は HTTP を使った軽いプッシュ通知の仕組みです。[ntfy のモバイルアプリ](https://ntfy.sh/docs/subscribe/phone/) からトピックを購読し、そのトピックへ投稿するとエージェントと話せます。

| 変数 | 説明 |
|----------|-------------|
| `NTFY_TOPIC` | 購読するトピック（受信用）。必須です。 |
| `NTFY_SERVER_URL` | サーバーの URL（既定: `https://ntfy.sh`）。プライバシーを重視するなら自前で立てた ntfy を指してください。 |
| `NTFY_TOKEN` | 認証のトークン（任意）。bearer のトークン（たとえば `tk_xyz`）か、Basic 認証用の `user:pass` です。 |
| `NTFY_PUBLISH_TOPIC` | 返信を送るトピック（既定は `NTFY_TOPIC`）。 |
| `NTFY_MARKDOWN` | `true` にすると、返信に `X-Markdown: true` のヘッダーを付けて送ります。既定: `false`。 |
| `NTFY_ALLOWED_USERS` | 許可一覧（ユーザー ID として扱われますが、ntfy ではトピック名です）。ふつうは `NTFY_TOPIC` と同じ値にします。 |
| `NTFY_ALLOW_ALL_USERS` | 開発時だけの逃げ道で、アクセスを制限した非公開のトピックでのみ安全です。既定: `false`。 |
| `NTFY_HOME_CHANNEL` | `deliver: ntfy` を指定した定時実行の既定の配信先。 |
| `NTFY_HOME_CHANNEL_NAME` | 既定チャンネルの人が読むための名前（既定はトピック名）。 |

信頼できないトピックで運用する前に、[ntfy のメッセージングのガイド](/hermes/docs/user-guide/messaging/ntfy/) の、とくに**身元の考え方**の節を読んでください。

### IRC {#irc}

Hermes を IRC のサーバーにつなぎます。外部の依存はありません。[IRC のメッセージングのガイド](/hermes/docs/user-guide/messaging/irc/) をご覧ください。

| 変数 | 説明 |
|----------|-------------|
| `IRC_SERVER` | IRC サーバーのホスト名（たとえば `irc.libera.chat`）。必須です。 |
| `IRC_CHANNEL` | 参加するチャンネル（たとえば `#hermes`）。複数ならカンマ区切りです。必須です。 |
| `IRC_NICKNAME` | ボットのニックネーム（既定: `hermes-bot`）。必須です。 |
| `IRC_PORT` | サーバーのポート（既定: TLS ありで `6697`、なしで `6667`）。 |
| `IRC_USE_TLS` | TLS を使います（`true`/`false`。ポート 6697 では既定で `true`）。 |
| `IRC_SERVER_PASSWORD` | `PASS` コマンドで使うサーバーのパスワード（任意）。 |
| `IRC_NICKSERV_PASSWORD` | 接続時に自動で IDENTIFY するための NickServ のパスワード（任意）。 |
| `IRC_ALLOWED_USERS` | ボットと話せるニックネームをカンマ区切りで。 |
| `IRC_ALLOW_ALL_USERS` | チャンネルにいる人なら誰でもボットと話せるようにします（開発時のみ）。 |
| `IRC_HOME_CHANNEL` | 定時実行や通知の配信先になるチャンネル（既定は `IRC_CHANNEL`）。 |

### SimpleX {#simplex}

手元の `simplex-chat` のデーモンを通して、Hermes を [SimpleX Chat](https://simplex.chat/) のネットワークにつなぎます。[SimpleX のメッセージングのガイド](/hermes/docs/user-guide/messaging/simplex/) をご覧ください。

| 変数 | 説明 |
|----------|-------------|
| `SIMPLEX_WS_URL` | simplex-chat のデーモンの WebSocket の URL（たとえば `ws://127.0.0.1:5225`）。 |
| `SIMPLEX_ALLOWED_USERS` | ボットと話せる SimpleX の連絡先 ID をカンマ区切りで。 |
| `SIMPLEX_ALLOW_ALL_USERS` | どの連絡先でもボットと話せるようにします（開発時のみ。許可一覧が無効になります）。 |
| `SIMPLEX_AUTO_ACCEPT` | 届いた連絡先の申請を自動で受け入れます（既定: `true`）。 |
| `SIMPLEX_GROUP_ALLOWED` | ボットが参加する SimpleX のグループ ID をカンマ区切りで。`*` ならどのグループでもかまいません。省くとグループのメッセージを丸ごと無視します（こちらのほうが安全です。グループにいるボットは、そうでなければ全員分のやり取りを処理してしまいます）。 |
| `SIMPLEX_HOME_CHANNEL` | 定時実行や通知の配信先になる既定の連絡先 / グループの ID。 |
| `SIMPLEX_HOME_CHANNEL_NAME` | 既定チャンネルの人が読むための名前（既定は ID）。 |

### Photon {#photon}

Node のサイドカーを通して、Hermes を [Photon](https://photon.codes/) / Spectrum（iMessage やその他の Spectrum のプラットフォーム）につなぎます。[Photon のメッセージングのガイド](/hermes/docs/user-guide/messaging/photon/) をご覧ください。

| 変数 | 説明 |
|----------|-------------|
| `PHOTON_PROJECT_ID` | Spectrum のプロジェクト ID（プロジェクトの `spectrumProjectId`。`hermes photon setup` が設定します）。 |
| `PHOTON_PROJECT_SECRET` | その Spectrum のプロジェクト ID と組みになる秘密（`hermes photon setup` が設定します）。 |
| `PHOTON_ALLOWED_USERS` | ボットと話せる E.164 形式の電話番号をカンマ区切りで。 |
| `PHOTON_ALLOW_ALL_USERS` | 送信者を問わずボットを動かせるようにします（開発時のみ。許可一覧が無効になります）。 |
| `PHOTON_REQUIRE_MENTION` | グループチャットのメッセージは、呼びかけ語に当てはまらないかぎり無視します（`true`/`false`。既定 `false`）。 |
| `PHOTON_MENTION_PATTERNS` | グループチャット用の呼びかけ語の正規表現（JSON の配列か、カンマ / 改行区切り。既定は Hermes の呼びかけ語）。 |
| `PHOTON_HOME_CHANNEL` | 定時実行や通知の既定の配信先。Spectrum のスペース ID、個別チャットの GUID、E.164 形式の電話番号のいずれかです。 |
| `PHOTON_HOME_CHANNEL_NAME` | 既定チャンネルの人が読むための名前。 |
| `PHOTON_MARKDOWN` | エージェントの返信をマークダウンで送ります。iMessage はそのまま描画し、ほかの Spectrum のプラットフォームでは素の文字になります（`true`/`false`。既定 `true`）。 |
| `PHOTON_REACTIONS` | 処理の状況として 👀/👍/👎 のタップバックを付け、ボットのメッセージへのタップバックをエージェントへ渡します（`true`/`false`。既定 `false`）。 |
| `PHOTON_READ_RECEIPTS` | Hermes へ渡したあと、受信した iMessage を既読にします（`true`/`false`。既定 `true`）。 |
| `PHOTON_TELEMETRY` | サイドカーで Spectrum の SDK の計測を有効にします（`true`/`false`。既定 `false`。`hermes photon telemetry on|off` で切り替えられます）。 |
| `PHOTON_SIDECAR_PORT` | Node のサイドカーの制御と受信に使うループバックのポート（既定 `8789`）。 |
| `PHOTON_SIDECAR_AUTOSTART` | 接続時に Node のサイドカーを起動します（`true`/`false`。既定 `true`）。 |
| `PHOTON_DASHBOARD_HOST` | Photon Dashboard の API のホスト（既定 `https://app.photon.codes`）。 |
| `PHOTON_SPECTRUM_HOST` | Photon Spectrum の API のホスト（既定 `https://spectrum.photon.codes`）。 |

### Buzz（Nostr のコミュニティ） {#buzz-nostr-communities}

| 変数 | 説明 |
|----------|-------------|
| `BUZZ_RELAY_URL` | Buzz のコミュニティの中継のベース URL（たとえば `https://mycommunity.communities.buzz.xyz`） |
| `BUZZ_PRIVATE_KEY` | エージェントの Buzz での身元に使う Nostr の秘密鍵（nsec か 16 進）— Buzz で唯一の秘密です |
| `BUZZ_CREDENTIALS_FILE` | nsec を収めた JSON の資格情報ファイル（`BUZZ_PRIVATE_KEY` が無いときに使われます） |
| `BUZZ_CHANNELS` | 見にいくチャンネルの UUID をカンマ区切りで（既定: 参加しているすべてのチャンネル） |
| `BUZZ_HOME_CHANNEL` | 定時実行や通知の配信先になるチャンネルの UUID（既定は最初に見にいくチャンネル） |
| `BUZZ_ALLOWED_USERS` | エージェントと話せる npub か 16 進の公開鍵をカンマ区切りで |
| `BUZZ_ALLOW_ALL_USERS` | コミュニティの誰でもエージェントと話せるようにします（`true`/`false`） |
| `BUZZ_TRANSPORT` | 受信の経路: `auto`（WebSocket。だめなら問い合わせ方式。既定）、`websocket`、`poll` |
| `BUZZ_POLL_INTERVAL` | 受信を問い合わせる間隔（秒。既定: `4`） |
| `BUZZ_AUTH_TAG` | NIP-42 の WebSocket 認証で使う、NIP-OA の所有者証明の認証タグの JSON（任意） |
| `BUZZ_CLI_PATH` | buzz の CLI のパス（既定: PATH 上の `buzz`、次に `~/bin/buzz`） |

### Microsoft Teams（アダプター） {#microsoft-teams-adapter}

Microsoft Teams のプラットフォーム用アダプター（Bot Framework / Azure AD）で、上の [Microsoft Graph（Teams の会議）](#microsoft-graph-teams-meetings) の連携とは別物です。[Teams のメッセージングのガイド](/hermes/docs/user-guide/messaging/teams/) をご覧ください。

| 変数 | 説明 |
|----------|-------------|
| `TEAMS_CLIENT_ID` | Azure AD のアプリケーション（Bot Framework）のクライアント ID。 |
| `TEAMS_CLIENT_SECRET` | Azure AD のアプリケーションのクライアントシークレット。 |
| `TEAMS_TENANT_ID` | そのボットのアプリを置く Azure AD のテナント ID。 |
| `TEAMS_HOST` | webhook が待ち受けるホスト（既定: 未設定 — IPv4 と IPv6 の全インターフェース）。 |
| `TEAMS_PORT` | webhook が待ち受けるポート（Bot Framework の既定: `3978`）。 |
| `TEAMS_ALLOWED_USERS` | ボットと話せる Teams のユーザー ID / UPN をカンマ区切りで。 |
| `TEAMS_ALLOW_ALL_USERS` | どの Teams 利用者でもボットを動かせるようにします（開発時のみ）。 |
| `TEAMS_HOME_CHANNEL` | 定時実行や通知の配信先になる既定のチャット / チャンネルの ID。 |
| `TEAMS_HOME_CHANNEL_NAME` | Teams の既定チャンネルの表示名。 |

### Raft {#raft}

| 変数 | 説明 |
|----------|-------------|
| `RAFT_PROFILE` | Raft のエージェントのプロファイルの slug — 設定するとアダプターが自動で有効になります。 |

### メッセージングの細かい調整 {#advanced-messaging-tuning}

送信するメッセージのまとめ方を、プラットフォームごとに細かく調整するつまみです。ほとんどの利用者は触る必要がありません。既定値は、各プラットフォームの上限を守りつつもたつかない値になっています。

| 変数 | 説明 |
|----------|-------------|
| `HERMES_TELEGRAM_TEXT_BATCH_DELAY_SECONDS` | 溜めた Telegram の文章を送り出すまでの待ち時間（既定: `0.6`）。 |
| `HERMES_TELEGRAM_TEXT_BATCH_SPLIT_DELAY_SECONDS` | Telegram の 1 通が長さの上限を超えて分割されたとき、分割した塊のあいだに置く間隔（既定: `2.0`）。 |
| `HERMES_SIMPLEX_TEXT_BATCH_DELAY` | 立て続けに届いた文章を 1 つの MessageEvent にまとめるための静かな時間（秒。既定: `0.8`）。Telegram の文章のまとめ方と同じ考え方です。 |
| `HERMES_TELEGRAM_MEDIA_BATCH_DELAY_SECONDS` | 溜めた Telegram のメディアを送り出すまでの待ち時間（既定: `0.6`）。 |
| `HERMES_TELEGRAM_FOLLOWUP_GRACE_SECONDS` | エージェントが終わったあと、追いかけのメッセージを送るまでの待ち時間。最後の配信の塊と競合しないようにするためのものです。 |
| `HERMES_TELEGRAM_HTTP_CONNECT_TIMEOUT` / `_READ_TIMEOUT` / `_WRITE_TIMEOUT` / `_POOL_TIMEOUT` | 土台になっている `python-telegram-bot` の HTTP のタイムアウトを上書きします（秒）。 |
| `HERMES_TELEGRAM_INIT_TIMEOUT` | ゲートウェイの起動時、Telegram の `initialize()` の接続の試行 1 回あたりの上限（秒）。届かない予備の IP の連なりで起動が止まり続けるのを防ぎます（既定: `30`）。 |
| `HERMES_TELEGRAM_HTTP_POOL_SIZE` | Telegram の API への同時 HTTP 接続の上限。 |
| `HERMES_TELEGRAM_DISABLE_FALLBACK_IPS` | DNS が引けないときに使う、埋め込みの Cloudflare の予備の IP を無効にします（`true`/`false`）。 |
| `HERMES_DISCORD_TEXT_BATCH_DELAY_SECONDS` | 溜めた Discord の文章を送り出すまでの待ち時間（既定: `0.6`）。 |
| `HERMES_DISCORD_TEXT_BATCH_SPLIT_DELAY_SECONDS` | Discord の 1 通が長さの上限を超えて分割されたとき、分割した塊のあいだに置く間隔（既定: `2.0`）。 |
| `HERMES_DISCORD_LIVENESS_INTERVAL_SECONDS` | `discord.websocket_liveness_interval_seconds` を互換のために手で上書きするものです。動いている Discord のゲートウェイの WebSocket を確かめる間隔（既定: `15`。`0` で無効）。`config.yaml` のキーのほうをおすすめします。 |
| `HERMES_DISCORD_LIVENESS_FAILURE_THRESHOLD` | `discord.websocket_liveness_failure_threshold` を互換のために手で上書きするものです。つなぎ直す前に、不調と判定される確認が何回続いたら踏み切るか（既定: `2`）。これが効くのは弱い兆候だけで、接続が閉じている場合（`socket_closed` / `client_closed`）は 1 回目でつなぎ直します（#118487）。`config.yaml` のキーのほうをおすすめします。 |
| `HERMES_MATRIX_TEXT_BATCH_DELAY_SECONDS` / `_SPLIT_DELAY_SECONDS` | Telegram のまとめ方のつまみの Matrix 版です。 |
| `HERMES_FEISHU_TEXT_BATCH_DELAY_SECONDS` / `_SPLIT_DELAY_SECONDS` / `_MAX_CHARS` / `_MAX_MESSAGES` | Feishu のまとめ方の調整 — 待ち時間、分割の間隔、1 通あたりの最大文字数、1 回にまとめる最大の通数です。 |
| `HERMES_FEISHU_MEDIA_BATCH_DELAY_SECONDS` | Feishu のメディアを送り出すまでの待ち時間。 |
| `HERMES_FEISHU_DEDUP_CACHE_SIZE` | Feishu の webhook の重複を見分けるための保持数（既定: `1024`）。 |
| `HERMES_WECOM_TEXT_BATCH_DELAY_SECONDS` / `_SPLIT_DELAY_SECONDS` | WeCom のまとめ方の調整。 |
| `HERMES_VISION_DOWNLOAD_TIMEOUT` | 画像を視覚のモデルへ渡す前に、取得するのを待つ時間（秒。既定: `30`）。 |
| `HERMES_VISION_MAX_CONCURRENCY` | プロセス全体で、画像の**変換やサイズ変更**を同時に走らせる上限（`auxiliary.vision.max_concurrency` の上書き。既定: ホストの CPU のコア数で、上限なし）。CPU を使う変換の段だけを抑えるので、動画のコマを一気に展開してもすべてのコアを食い尽くしてイベントループを止めることがありません。LLM の呼び出し自体は同時に走ったままです。`< 1` の値は無視されます。 |
| `HERMES_RESTART_DRAIN_TIMEOUT` | ゲートウェイ: `/restart` のとき、動いている処理が終わるのを待つ秒数。過ぎたら再起動を強行します（既定: `900`）。 |
| `HERMES_GATEWAY_PLATFORM_CONNECT_TIMEOUT` | ゲートウェイの起動時と再接続時の、プラットフォームごとの接続の待ち時間（秒。`0` や負の値なら無制限に待ちます）。接続の試行*と*、Discord のアダプターの準備待ちの両方に効くので、同期するスラッシュコマンドが多いアカウントでも起動の途中で切られません。`config.yaml` の `gateway.platform_connect_timeout`（既定 `30`）から引き継がれ、この環境変数を明示すればそちらが勝ちます。 |
| `HERMES_GATEWAY_BUSY_INPUT_MODE` | 処理中に入力が来たときのゲートウェイの既定の振る舞い: `queue`、`steer`、`interrupt`。有効なプロファイルでは `/busy` で上書きできます。 |
| `HERMES_GATEWAY_BUSY_ACK_ENABLED` | エージェントが処理中に入力が来たとき、ゲートウェイが受け取りの合図（⚡/⏳/⏩）を送るか（既定: `true`）。`false` にするとこのメッセージだけを止められます。入力は従来どおり溜められ、向きを変え、割り込みます。黙るのはチャットへの返事だけです。`config.yaml` の `display.busy_ack_enabled` から引き継がれます。 |
| `HERMES_GATEWAY_NO_SUPERVISE` | s6-overlay の Docker イメージの中で、`hermes gateway run` のときの自動の見守りをやめ、s6 より前の前面での動き方（自動の再起動なし、ゲートウェイがコンテナの主プロセス）にします。有効な値は `1`、`true`、`yes` です。CLI の `--no-supervise` と同じです。s6 のイメージの外では何も起きません。 |
| `HERMES_GATEWAY_BOOTSTRAP_STATE` | s6-overlay の Docker イメージの中で、まっさらなボリュームでのゲートウェイの**最初の**状態を宣言します。空のボリュームには `gateway_state.json` が無いので、起動時の調停は `gateway-default` の枠を登録しつつ**止めたまま**にします（最後に記録された状態が `running` のときだけ自動で起動するためです）。これを `running` にすると、初回起動時の設定の処理が調停より*前*に `gateway_state.json` を用意するので、いちばん最初の起動からゲートウェイが立ち上がります。値は `running` という文字だけが効きます。初回だけのもので、すでにある `gateway_state.json` は決して上書きしないので、意図して止めたゲートウェイは再起動をまたいでも止まったままです。s6 のイメージの外では何も起きません。 |
| `GATEWAY_RELAY_URL` | 試験中の中継のつなぎ役の WebSocket のベース URL。設定するとゲートウェイは汎用の `relay` アダプターを登録し、こちらからつなぎにいきます。`config.yaml` の `gateway.relay_url` と同じです。 |
| `GATEWAY_RELAY_ID` | `hermes gateway enroll` か、管理された自動の登録で割り当てられる中継のゲートウェイの識別子。`gateway.relay_id` と同じです。 |
| `GATEWAY_RELAY_SECRET` | WebSocket の認証に使う、ゲートウェイごとの中継の秘密。すでに設定してあれば、管理された自動の登録は行われません。`gateway.relay_secret` と同じです。 |
| `GATEWAY_RELAY_DELIVERY_KEY` | 中継や素通しの認証との互換のために残している、つなぎ役が発行する配信キー。いまの中継の受信は、ゲートウェイ側の HTTP の受け口ではなく、こちらからつないだ WebSocket に届きます。 |
| `GATEWAY_RELAY_ENROLL_TOKEN` | `--token` を明示しなかったときに `hermes gateway enroll` が使う登録用のトークン。 |
| `GATEWAY_RELAY_PLATFORM` | 中継の能力の申告に載せるプラットフォーム名（任意）。 |
| `GATEWAY_RELAY_BOT_ID` | 中継の能力の申告に載せるボットの識別子（任意）。 |
| `GATEWAY_RELAY_ENDPOINT` | コールバックや素通しの URL が要る方式のために申告するゲートウェイの接続先（任意）。既定の WebSocket だけで受ける経路では不要です。`gateway.relay_endpoint` と同じです。 |
| `GATEWAY_RELAY_ROUTE_KEYS` | つなぎ役に申告する中継の経路のキーをカンマ区切りで。`gateway.relay_route_keys` と同じです。 |
| `HERMES_FILE_MUTATION_VERIFIER` | ターンごとに、ファイルの書き換えを確かめる注記を末尾に付けます（既定: `true`）。有効にすると、そのターンで失敗したまま成功した書き込みに置き換わらなかった `write_file` / `patch` の呼び出しを、Hermes が一覧にして添えます。`0`、`false`、`no`、`off` のいずれかで止められます。`config.yaml` の `display.file_mutation_verifier` と同じで、環境変数があればそちらが勝ちます。 |
| `HERMES_CRON_TIMEOUT` | 定時実行でエージェントが動くときの、無操作のタイムアウト（秒。既定: `600`）。ツールを呼んでいるあいだや、応答が流れてきているあいだはいくらでも動けます。止まっているときだけ働きます。`0` で無制限になります。 |
| `HERMES_CRON_SCRIPT_TIMEOUT` | 定時実行に付けた事前のスクリプトのタイムアウト（秒。既定: `3600`）。スクリプトだけを区切るもので、スキルやエージェントの仕事は別枠の `HERMES_CRON_TIMEOUT` に従います。`config.yaml` の `cron.script_timeout_seconds` でも設定できます。 |
| `HERMES_CRON_MEDIA_SEND_TIMEOUT` | 動いているゲートウェイのアダプターから定時実行の結果を配信するとき、添付 1 つあたりの送信のタイムアウト（秒。既定: `300`）。大きな添付（長い読み上げの音声、大きな書き出し）のアップロードが間に合わないなら増やしてください。`config.yaml` の `cron.media_send_timeout_seconds` でも設定できます。 |
| `HERMES_CRON_MAX_PARALLEL` | 1 回の実行で並行して動かす定時実行の上限（既定: `4`）。 |

## NeMo Relay {#nemo-relay}

| 変数 | 説明 |
|----------|-------------|
| `HERMES_NEMO_RELAY_PLUGINS_TOML` | Hermes の中核がプロセス全体で読み込む、標準の NeMo Relay の `plugins.toml` のパス。設定が無ければ、Relay の中間処理、動的なプラグイン、書き出しのいずれも初期化されません。廃止された `HERMES_NEMO_RELAY_ATOF_*` と `HERMES_NEMO_RELAY_ATIF_*` は無視されます（まだ書いてある `.env` があっても何も渡りません）。`hermes update` / `hermes migrate relay` がそれらを `<hermes home>/relay-plugins.toml` へ変換し、この変数を設定します。[移行の注記と全体の例](/hermes/docs/user-guide/features/built-in-plugins/#nemo-relay-native-integration-migration-note) を参照してください。[NeMo Relay の可観測性の設定](https://docs.nvidia.com/nemo/relay/configure-plugins/observability/about) もご覧ください。 |

## エージェントの振る舞い {#agent-behavior}

| 変数 | 説明 |
|----------|-------------|
| `HERMES_MAX_ITERATIONS` | 1 回の会話でツールを呼ぶ最大の回数（既定: 500） |
| `HERMES_INFERENCE_MODEL` | プロセス単位でモデル名を上書きします（そのセッションでは `config.yaml` より優先されます）。`-m`/`--model` でも指定できます。 |
| `HERMES_YOLO_MODE` | `1` にすると、危ないコマンドの確認をとばします。`--yolo` と同じです。 |
| `HERMES_ACCEPT_HOOKS` | `config.yaml` に書かれた未確認のシェルのフックを、端末での確認なしに自動で承認します。`--accept-hooks` や `hooks_auto_accept: true` と同じです。 |
| `HERMES_IGNORE_USER_CONFIG` | `~/.hermes/config.yaml` を読まず、組み込みの既定値を使います（`.env` の資格情報は読みます）。`--ignore-user-config` と同じです。 |
| `HERMES_IGNORE_RULES` | `AGENTS.md`、`SOUL.md`、`.cursorrules`、記憶、あらかじめ読み込むスキルの自動の差し込みをやめます。`--ignore-rules` と同じです。 |
| `HERMES_SAFE_MODE` | 切り分け用の方式で、あらゆる作り込みを無効にします。プラグインの探索、MCP サーバーの読み込み、シェルのフックの登録をとばします。`--safe-mode` が自動で設定します（こちらは上の 2 つも設定します）。 |
| `HERMES_TOOL_PROGRESS` | config-v12 を下限にして以降は使えません。この変数は無視されます。`config.yaml` の `display.tool_progress` を使ってください。 |
| `HERMES_TOOL_PROGRESS_MODE` | ツールの進み具合の表示を指定する、互換のために残っている変数です（ゲートウェイは今も予備として読みます）。`config.yaml` の `display.tool_progress` をおすすめします。 |
| `HERMES_HUMAN_DELAY_MODE` / `HERMES_HUMAN_DELAY_MIN_MS` / `HERMES_HUMAN_DELAY_MAX_MS` | もう読まれません。返事の間合いは、プロファイルごとの `config.yaml` の `human_delay`（`mode`、`min_ms`、`max_ms`）で決めるので、多重化したプロファイルはそれぞれ別の間合いを保てます。 |
| `HERMES_QUIET` | 必須でない出力を抑えます（`true`/`false`） |
| `CODEX_HOME` | [Codex app-server のランタイム](/hermes/docs/user-guide/features/codex-app-server-runtime/) を有効にしているとき、Codex CLI が設定と認証を読むディレクトリを上書きします（既定: `~/.codex`）。Hermes の移行処理は、管理する設定の塊を `<CODEX_HOME>/config.toml` へ書きます。 |
| `HERMES_KANBAN_TASK` | かんばんのディスパッチャーがワーカーを起動するときに設定します（タスクの UUID）。ワーカーと、そこから起動される `hermes-tools` の MCP の子プロセスが引き継ぐので、かんばんのツールが正しく制御されます。手で設定しないでください。 |
| `HERMES_ACP_SKIP_CONFIGURED_MCP` | [ACP のホスト](/hermes/docs/user-guide/features/acp/#host-integration) が、起動する Hermes の子プロセスに設定します。`1` にすると、ACP の JSON-RPC のやり取りを始める前に `config.yaml` の MCP サーバーを起動しなくなります。セッションの MCP サーバーを `session/new` で自分から渡すホスト向けです。ACP のセッションが渡したサーバーは従来どおり登録されます。ほかの値では既定のままです。手で設定しないでください。 |
| `HERMES_API_TIMEOUT` | LLM の API 呼び出しのタイムアウト（秒。既定: `1800`） |
| `HERMES_API_CALL_STALE_TIMEOUT` | 逐次配信でない呼び出しが固まったと見なすまでの時間（秒。既定: `90`）。設定しなければ手元の提供元では自動で無効になり、とても大きな文脈では長くなることがあります。`config.yaml` の `providers.<id>.stale_timeout_seconds` や `providers.<id>.models.<model>.stale_timeout_seconds` でも設定できます。 |
| `HERMES_STREAM_READ_TIMEOUT` | 逐次配信のソケットの読み取りのタイムアウト（秒。既定: `120`）。手元の提供元では自動で `HERMES_API_TIMEOUT` まで延びます。手元の LLM で長いコード生成が途切れるなら増やしてください。 |
| `HERMES_STREAM_STALE_TIMEOUT` | 逐次配信が固まったと見なすまでの時間（秒。既定: `180`）。手元の提供元では自動で無効になります。この時間内に何も届かなければ接続を切ります。 |
| `HERMES_LOCAL_STREAM_STALE_TIMEOUT` | 手元の提供元（Ollama、oMLX、llama-cpp）で、固まったと見なすまでの上限（秒。既定: `900`）。基本の時間が既定のままで手元の接続先を検出したとき、以前は無効にしていたところをこの有限の上限に置き換えるので、詰まった手元のサーバーが永遠に待たされず、いずれ検出されます。`config.yaml` の `agent.local_stream_stale_timeout` でも設定できます。 |
| `HERMES_STREAM_RETRIES` | 一時的なネットワークのエラーで、配信の途中からつなぎ直す回数（既定: `3`）。 |
| `HERMES_STREAM_STALE_GIVEUP` | ターンをまたぐ遮断の仕組みです。応答が 1 度も完了しないまま、固まったことによる切断（逐次配信でもそうでなくても）がこの回数続いたら、以降はまた待ち時間を使い切るのではなく、その場で対処のわかるエラーにして止めます（既定: `5`。`0` で無効）。応答がひとつでも完了したとき、`/model` で切り替えたとき、予備に切り替わったとき、ターンの開始で本来の設定に戻ったときに数え直します。 |
| `HERMES_AGENT_TIMEOUT` | 動いているエージェントに対する、ゲートウェイの無操作のタイムアウト（秒。既定: `1800`、30 分）。ツールの呼び出しや配信のたびに数え直します。`0` で無効になります。 |
| `HERMES_GATEWAY_MAX_STARTS` | 起動を繰り返してしまうのを止める仕組みです。一定の時間の中でゲートウェイの（再）起動がこの回数を超えると、間隔を延ばしながら待って連鎖を断ち切ります（既定: `5`。`0` で無効）。`config.yaml` の `gateway.respawn_storm.max_starts` でも設定できます。 |
| `HERMES_GATEWAY_START_WINDOW_S` | その仕組みで見る時間の幅（秒。既定: `120`）。`config.yaml` の `gateway.respawn_storm.window_seconds` でも設定できます。 |
| `HERMES_STARTUP_WATCHDOG` | `hermes gateway run` の起動の見張りです。決めた時間内に処理のループが動き出さず、進行中の印も持たず、CPU も動いていなければ、すべてのスレッドの状態を `logs/gateway-startup-watchdog.log` へ書き出し、終了コード `75` で終わります。これで監視の仕組み（systemd、s6、Windows のタスク）が起動し直します。`0` で切れます。`config.yaml` の読み込み自体が見張りの対象に入るので、この設定は環境変数だけです。設定が無ければ `config.yaml` の `gateway.startup_watchdog: false` がこの変数へ引き継がれます。 |
| `HERMES_STARTUP_WATCHDOG_TIMEOUT_S` | 起動の見張りの制限時間（秒。既定: `300`）。遅くても生きている段（state.db の構造の移行、修復、作成時の保管・整理・VACUUM）は自分で進行中の印を持つので、*それ以外*のところで大きな導入の起動が本当に 5 分を超えるとき（多数のプロファイルを多重化している、遅いディスクに何千ものスキルがある）にだけ延ばしてください。設定が無ければ `config.yaml` の `gateway.startup_watchdog_timeout_seconds` から引き継がれます。 |
| `HERMES_AGENT_TIMEOUT_WARNING` | ゲートウェイ: 何も動かない時間がこの秒数を超えたら警告を送ります（既定: `HERMES_AGENT_TIMEOUT` の 75%）。 |
| `HERMES_AGENT_NOTIFY_INTERVAL` | ゲートウェイ: 長くかかるエージェントのターンで、進み具合を知らせる間隔（秒）。 |
| `HERMES_CHECKPOINT_TIMEOUT` | ファイルシステムの控えを作るときのタイムアウト（秒。既定: `30`）。 |
| `HERMES_EXEC_ASK` | ゲートウェイで、実行の承認の確認を出します（`true`/`false`） |
| `HERMES_ENABLE_PROJECT_PLUGINS` | `./.hermes/plugins/` にあるリポジトリ内のプラグインの自動の読み込みを、エージェント側とダッシュボードのウェブサーバー側の両方で有効にします。有効な値は `1` / `true` / `yes` / `on`（大文字小文字は問いません）です。それ以外は — `0`、`false`、`no`、`off`、空文字も含めて — **無効**として扱います（既定）。なお GHSA-5qr3-c538-wm9j（#29156）以降、ダッシュボードのウェブサーバーは、この変数が有効でもプロジェクトのプラグインの Python の `api` ファイルを自動で読み込みません。プロジェクトのプラグインは静的な JS / CSS で画面を拡張できますが、その裏側の経路は `~/.hermes/plugins/` の下へ移したときだけ読み込まれます。 |
| `HERMES_PLUGINS_DEBUG` | `1`/`true` にすると、プラグインの探索の詳しいログを標準エラーへ出します。走査したディレクトリ、読み取った定義、とばした理由、読み取りや `register()` の失敗の全文が出ます。プラグインを作る人向けです。 |
| `HERMES_BACKGROUND_NOTIFICATIONS` | ゲートウェイでの、背後のプロセスの知らせ方: `concise`（既定）、`all`、`result`、`error`、`off` |
| `HERMES_EPHEMERAL_SYSTEM_PROMPT` | API の呼び出し時に差し込む一時のシステムプロンプト（セッションには残りません） |
| `HERMES_PREFILL_MESSAGES_FILE` | API の呼び出し時に差し込む、一時的な前置きメッセージの JSON ファイルのパス。 |
| `HERMES_ALLOW_PRIVATE_URLS` | `true`/`false` — ツールが localhost や内部ネットワークの URL を取得してよいかどうか。ゲートウェイでは既定で無効です。 |
| `HERMES_REDACT_SECRETS` | `true`/`false` — ツールの出力、ログ、チャットの返答で秘密を伏せるかどうか（既定: `true`）。 |
| `HERMES_WRITE_SAFE_ROOT` | 指定したディレクトリの外への `write_file`/`patch` を**問答無用で止める**、任意の接頭辞（承認の確認も出ません）。`os.pathsep`（Unix では `:`、Windows では `;`）で区切って複数指定できます。下の [HERMES_WRITE_SAFE_ROOT](#hermes_write_safe_root) を参照してください。 |
| `HERMES_DISABLE_LAZY_INSTALLS` | テストやインストールの検査で使う PM 内部のポリシーです。真とみなされる値を入れると、必要に応じたインストールを拒否します。利用者向けの設定 `security.allow_lazy_installs` より優先されます。`.env` には書かないでください。 |
| `HERMES_DISABLE_FILE_STATE_GUARD` | `1` にすると、`patch`/`write_file` の「読んだあとにファイルが変わっています」という保護を切ります。 |
| `HERMES_BUNDLED_SKILLS` | 起動時に読み込む同梱スキルの一覧を、カンマ区切りで上書きします。 |
| `HERMES_OPTIONAL_SKILLS` | 初回の実行で自動的に入れる、任意のスキル名をカンマ区切りで。 |
| `HERMES_DEBUG_INTERRUPT` | `1`/`true` にすると、割り込みや取り消しの詳しい記録を `agent.log` へ出します。`0`/`false`/`off`（または未設定）なら出ません。 |
| `HERMES_DUMP_REQUESTS` | API リクエストの中身をログファイルへ書き出します（`true`/`false`） |
| `HERMES_DUMP_REQUEST_STDOUT` | API リクエストの中身を、ログファイルではなく標準出力へ書き出します。 |
| `HERMES_OAUTH_TRACE` | `1` にすると、OAuth のトークンの交換と更新の試みを記録します。伏せ字にした時間の情報も含みます。 |
| `HERMES_AGENT_HELP_GUIDANCE` | 独自の運用向けに、システムプロンプトへ案内の文章を追記します。 |
| `HERMES_AGENT_LOGO` | CLI の起動時に出る ASCII のロゴを差し替えます。 |
| `DELEGATION_MAX_CONCURRENT_CHILDREN` | `delegate_task` のひとまとまりで、並行して動かすサブエージェントの上限（既定: `3`。下限は 1 で、上限はありません）。`config.yaml` の `delegation.max_concurrent_children` でも設定でき、そちらが優先されます。 |

### HERMES_WRITE_SAFE_ROOT {#hermes_write_safe_root}

この変数を設定すると、`write_file` と `patch` は指定したディレクトリの接頭辞の中しか書けなくなります。その外側のパスは**その場で拒まれます** — 危ないコマンドの承認の仕組みにも回らず、押し切るための確認も出ません。

公式の Docker イメージでは `HERMES_HOME=/opt/data` と並べて `HERMES_WRITE_SAFE_ROOT=/opt/data` が設定され、エージェントがマウントしたデータの領域から出られないようになっています。

**書き込みを閉じ込めるつもりがないなら、これを `~/.hermes/.env` に書かないでください。** よくある失敗は、プロジェクトのディレクトリを指しておきながら、エージェントに `~/.hermes/cron/jobs.json` や `~/.hermes/skills/`、プロファイルの下のスクリプトを直させようとすることです。それらは閉じ込めた範囲の外なので、`write_file`/`patch` はすべて `outside HERMES_WRITE_SAFE_ROOT` のエラーになります。

作業用のディレクトリと Hermes の状態の両方を許すには、どちらの接頭辞も並べてください（順番は問いません）。

```bash
export HERMES_WRITE_SAFE_ROOT=/path/to/project:/home/you/.hermes
```

変数を消すか `.env` から取り除けば、ふだんどおりの書き込みに戻ります（資格情報のパスの禁止一覧は引き続き効きます。[ファイル書き込みの安全](/hermes/docs/user-guide/security/#file-write-safety) を参照してください）。

### 内部の橋渡しの変数 {#internal-bridge-variables}

Hermes は、まだ `config.yaml` が存在しない境界や、2つのプロセスが値をそろえる必要がある場面で状態を受け渡すために、これらを自分で設定します。プロセスの環境変数やログで見かけたときに何なのか分かるよう載せています。自分では設定せず、`.env` にも決して書かないでください。

| 変数 | 説明 |
|----------|-------------|
| `HERMES_DATA_DIR_SUFFIX` | デスクトップのバンドルの環境に組み込まれ（`--bundle-env`、`HERMES_BUNDLE_ENV_JSON`、またはチャンネルごとのデータディレクトリを持つチャンネル版のビルド。この場合は `-channel-build-<channel>` を使います）、テスト用やチャンネル版のビルドが自分専用のデータを持てるようにします。既定の Hermes のホームと既定の Electron の `userData` ディレクトリの末尾に、区切り文字なしでそのまま付け足されます。たとえば `-channel-build-canary` なら、POSIX では `~/.hermes-channel-build-canary` になります。明示的に指定した `HERMES_HOME` と `HERMES_DESKTOP_USER_DATA_DIR` が優先され、接尾辞は付きません。`.env` と `config.yaml` を置くホームを決める値なので、起動前の環境に入っている必要があります。 |
| `HERMES_REPO_URL` | インストーラー（`scripts/install.sh`、`scripts/install.ps1`）が clone に使い、再実行時には `origin` の向け先にもする Git のリモートです。インストーラーは Hermes の設定がまだ無い段階で動くので、環境変数になっています。CI やリハーサル用のスクリプトが、fork やミラーからインストールするのに使います。設定しなければ公式のリポジトリを使います。 |
| `HERMES_UPDATE_STATUS_FILE` | デスクトップの更新用 shim（`scripts/desktop-update/posix.sh`）が、進捗ウィンドウに表示する状態の JSON のパスを入れて export します。`hermes update` の引き継ぎ先の子プロセスは、時間のかかる段階をこのファイルに書き出し、ウィンドウの表示が止まらないようにします。この変数が無い場合（古い shim）は、更新マーカーに記された shim の pid から決まる状態ファイルを使い、UI が見ていなければ何も書き出しません。 |
| `HERMES_UPDATE_UI_ACTIVE` | 自前のウィンドウを持たない古い shim のために、更新の子プロセスが macOS のネイティブの状態パネルを開いたあと `1` に設定します。子プロセスへ引き継がれるので、1回の更新の流れの中でパネルが開くのは多くても1回です。 |

## 画面 {#interface}

| 変数 | 説明 |
|----------|-------------|
| `HERMES_TUI` | `1` にすると、従来の CLI ではなく [TUI](/hermes/docs/user-guide/tui/) を起動します。`--tui` を付けるのと同じです。 |
| `HERMES_TUI_DIR` | 組み立て済みの `ui-tui/` ディレクトリのパス（`dist/entry.js` と、中身の入った `node_modules` が必要です）。ディストリビューションや Nix が、初回起動時の `npm install` をとばすために使います。 |
| `HERMES_TUI_RESUME` | 起動時に、指定した ID の TUI のセッションを再開します。設定すると `hermes --tui` は新しいセッションを作らず、その名前のセッションを引き継ぎます。切断やターミナルの異常終了のあと、つなぎ直すのに便利です。 |
| `HERMES_TUI_THEME` | TUI の配色を固定します: `light`、`dark`、または背景色の 6 桁の 16 進（たとえば `ffffff` や `1a1a2e`）。設定が無ければ `COLORFGBG` と端末への問い合わせから自動で判断しますが、`COLORFGBG` を設定しない端末（Ghostty、Warp、iTerm2 など）ではこの変数がその判断より優先されます。 |
| `HERMES_INFERENCE_MODEL` | `config.yaml` を書き換えずに、`hermes -z` / `hermes chat` で使うモデルを固定します。`--provider` と組みで使います。実行ごとに既定のモデルを変えたい、台本からの呼び出し（掃除の処理、CI、まとめて走らせる仕組み）で役に立ちます。 |

## セッションの設定 {#session-settings}

| 変数 | 説明 |
|----------|-------------|
| `HERMES_SESSION_ID` | **Hermes が起動するすべてのツールの子プロセスへ自動で渡されます**（`terminal`、`execute_code`、持続シェル、Docker / Singularity のバックエンド、委任したサブエージェントの実行）。エージェントがいまのセッション ID を入れるので、ツールから呼ばれた自作のスクリプトはこれを読んで、自分の出力・計測・副作用を元の Hermes のセッションと結び付けられます。**手で設定しないでください** — 親のシェルから上書きしても効くのはエージェントの実行の外だけで、エージェントがセッションを始めた瞬間に上書きされます。 |
| `AI_AGENT` | **CLI とゲートウェイの入口が `hermes-agent` に設定し**（外側の仕組みがすでに設定している場合を除きます）、ターミナルのツールのシェルすべてへ渡されます。遠隔のバックエンド（Docker、SSH、Modal、Daytona、Singularity、Vercel）も含みます。子プロセスに呼び出し元を伝えるための、エージェントをまたいで広まりつつある決まりで、一般的な道具（たとえば huggingface_hub のエージェント検出）がこれを読んで AI のエージェントの下で動いていることを知ります。値は、公開されているエージェントの仕組みの登録簿での Hermes の id と一致します。手で設定しないでください。 |
| `HERMES_AGENT` | **CLI とゲートウェイの入口が `true` に設定し**、ターミナルのツールのシェルすべてへ渡されるので、子プロセスは自分が Hermes の中で動いていることを判別できます。手で設定しないでください。 |

ターミナルのセッションのスナップショットには、注入されたセッションやエージェントの帰属を示す変数は残りません。
Hermes はコマンドごとに現在の値を渡すので、前のターミナルのコマンドの中で export しても、
次のセッションの識別情報は変わりません。

## 文脈の圧縮（config.yaml のみ） {#context-compression-configyaml-only}

文脈の圧縮は `config.yaml` だけで設定します。環境変数はありません。しきい値の設定は `compression:` の塊にあり、要約に使うモデルと提供元は `auxiliary.compression:` の下にあります。

```yaml
compression:
  enabled: true
  threshold: 0.50
  target_ratio: 0.20         # fraction of threshold to preserve as recent tail
  protect_last_n: 20         # minimum recent messages to keep uncompressed
```

:::info 古い設定からの移行
`compression.summary_model`、`compression.summary_provider`、`compression.summary_base_url` を持つ古い設定は、最初の読み込みのときに自動で `auxiliary.compression.*` へ移されます。
:::

## 補助の処理の上書き {#auxiliary-task-overrides}

| 変数 | 説明 |
|----------|-------------|
| `AUXILIARY_VISION_PROVIDER` | 視覚の処理で使う提供元を上書きします |
| `AUXILIARY_VISION_MODEL` | 視覚の処理で使うモデルを上書きします |
| `AUXILIARY_VISION_BASE_URL` | 視覚の処理で直接つなぐ OpenAI 互換のエンドポイント |
| `AUXILIARY_VISION_API_KEY` | `AUXILIARY_VISION_BASE_URL` と組みで使う API キー |

:::note
`AUXILIARY_WEB_EXTRACT_*` の変数はもう使いません。`web_extract` とブラウザのスナップショットは、補助の LLM を使わなくなりました。長いページやスナップショットは決まったやり方で切り詰められ、全文はディスクに保存されて `read_file` でページ送りできます。
:::

処理ごとに直接つなぐエンドポイントについては、Hermes はその処理に設定された API キーか `OPENAI_API_KEY` を使います。そうした独自のエンドポイントに `OPENROUTER_API_KEY` を使い回すことはありません。

## 予備の提供元（config.yaml のみ） {#fallback-providers-configyaml-only}

主モデルの予備の連なりは `config.yaml` だけで設定します。環境変数はありません。最上位に `fallback_providers` の一覧を作り、`provider` と `model` のキーを書けば、主モデルがエラーになったときに自動で切り替わります。提供元が `auto` の補助の処理も、Hermes 内蔵の補助の探索より先にこの連なりを見ます。

```yaml
fallback_providers:
  - provider: openrouter
    model: anthropic/claude-sonnet-4
```

最上位に 1 つだけ書く古い形の `fallback_model` も互換のために今も読まれますが、新しく書くなら `fallback_providers` を使ってください。処理ごとの補助の方針には `config.yaml` の `auxiliary.<task>.fallback_chain` を使います。これに相当する環境変数はありません。

詳しくは [予備の提供元](/hermes/docs/user-guide/features/fallback-providers/) をご覧ください。

## 提供元の振り分け（config.yaml のみ） {#provider-routing-configyaml-only}

これらは `~/.hermes/config.yaml` の `provider_routing` の節に書きます。

| キー | 説明 |
|-----|-------------|
| `sort` | 提供元の並べ方: `"price"`（既定）、`"throughput"`、`"latency"` |
| `only` | 許可する提供元の slug の一覧（たとえば `["anthropic", "google"]`） |
| `ignore` | とばす提供元の slug の一覧 |
| `order` | 順に試す提供元の slug の一覧 |
| `require_parameters` | 要求したすべての引数に対応する提供元だけを使います（`true`/`false`） |
| `data_collection` | `"allow"`（既定）か、データを保存する提供元を外す `"deny"` |

:::tip
環境変数の設定には `hermes config set` を使ってください。このページにある `UPPER_SNAKE` の名前（と、そのほか環境変数の形をした名前）はすべて `.env` に保存されます。設定の案内が書き込む先であり、動作中に読まれるのも同じファイルで、`config.yaml` に書かれることはありません。書き込みを断る一覧にある名前（`HERMES_HOME`、`HERMES_YOLO_MODE`、`PATH` など）は拒まれます。ドットでつないだ `config.yaml` の設定は `config.yaml` に入ります。
:::
