---
title: "Microsoft Foundry"
description: "Hermes Agent を Microsoft Foundry で使う — OpenAI 形式と Anthropic 形式のエンドポイント、通信方式とデプロイ済みモデルの自動判別"
upstream_path: guides/azure-foundry.md
upstream_blob: 76412937b0da0a1b2f5e091ec38145055df5b917
sources:
  - https://hermes-agent.nousresearch.com/docs/guides/azure-foundry
---

# Microsoft Foundry {#microsoft-foundry}

Hermes Agent の `azure-foundry` プロバイダーは、Microsoft Foundry（旧 Azure AI Foundry）と Azure OpenAI に対応しています。1 つの Foundry リソースが、2 種類の通信形式でモデルを提供することがあります。

- **OpenAI 形式** — `https://<resource>.openai.azure.com/openai/v1` のようなエンドポイントに対する `POST /v1/chat/completions`。GPT-4.x、GPT-5.x、Llama、Mistral、そして多くのオープンウェイトモデルで使われます。
- **Anthropic 形式** — `https://<resource>.services.ai.azure.com/anthropic` のようなエンドポイントに対する `POST /v1/messages`。Microsoft Foundry が Anthropic Messages API の形式で Claude モデルを提供するときに使われます。

セットアップウィザードはエンドポイントを調べ、どちらの通信形式か、どのデプロイが使えるか、各モデルのコンテキスト長がいくつかを自動で判別します。

## 事前に必要なもの {#prerequisites}

- デプロイが 1 つ以上ある Microsoft Foundry または Azure OpenAI のリソース
- そのデプロイのエンドポイント URL
- API キー（Azure ポータルの「キーとエンドポイント」から取得）**か**、Microsoft Entra ID を使う場合は Foundry リソースに対する **Azure AI User** の RBAC ロール（Microsoft が推奨するキーなしの方式）。Microsoft の名称変更が進む途中のテナントでは、このロールが **Foundry User** と表示されることがあります。

## すぐ使い始める {#quick-start}

```bash
hermes model
# → Select "Azure Foundry"
# → Enter your endpoint URL
# → Choose Authentication:
#     1. API key
#     2. Microsoft Entra ID  (managed identity / workload identity / az login)
# → (Entra) Hermes probes DefaultAzureCredential; on success it never asks for a key
# → (API key) Enter your API key
# Hermes probes the endpoint and auto-detects transport + models
# → Pick a model from the list (or type a deployment name manually)
```

ウィザードは次のように動きます。

1. **URL のパスを見る** — `/anthropic` で終わる URL は、Microsoft Foundry の Claude 経路として認識されます。
2. **`GET <base>/models` を試す** — エンドポイントが OpenAI 形式のモデル一覧を返した場合、Hermes は `chat_completions` に切り替え、返ってきたデプロイ ID をピッカーにあらかじめ入れます。
3. **Anthropic Messages 形式を試す** — `/models` を持たないものの Anthropic Messages 形式は受け付けるエンドポイント向けの代替手段です。
4. **手入力に切り替える** — どの試行も拒否するプライベートなエンドポイントや制限付きのエンドポイントでも使えます。API のモードを自分で選び、デプロイ名を手で入力します。

選んだモデルのコンテキスト長は、Hermes の標準的なメタデータの経路（`models.dev`、プロバイダーのメタデータ、モデルファミリーごとの固定値）で解決され、`config.yaml` に保存されます。これによりモデルは自分のコンテキストウィンドウの大きさを正しく扱えます。

## Microsoft Entra ID（キーなし・RBAC）— おすすめ {#microsoft-entra-id-keyless-rbac-recommended}

Microsoft は、本番の Foundry 利用には [Microsoft Entra ID によるキーなし認証](https://learn.microsoft.com/azure/ai-foundry/foundry-models/how-to/configure-entra-id)を推奨しています。Hermes は**両方**の API 形式で Entra ID に対応しています。

- **OpenAI 形式**（`api_mode: chat_completions` / `codex_responses`）— GPT-4/5、Llama、Mistral、DeepSeek など。
- **Anthropic 形式**（`api_mode: anthropic_messages`）— Microsoft Foundry 上の Claude モデル。

Foundry の RBAC はリソース単位です（`Azure AI User` が両方の形式をカバーします。テナントによっては `Foundry User` と表示されます）。また Microsoft は、どちらにも同じ推論スコープ（`https://ai.azure.com/.default`）を使うと明記しています。内部では次のようになっています。

- OpenAI 形式は、OpenAI Python SDK が持つ呼び出し可能な `api_key=` の仕組みをそのまま使います。SDK がリクエストごとに新しい JWT を自動で発行します。
- Anthropic 形式は、`agent.azure_identity_adapter.build_bearer_http_client` が組み込むリクエストイベントフック付きの `httpx.Client` を使います。Anthropic SDK は呼び出し可能な `auth_token` をそのままでは受け付けないためです。このフックが、送信するリクエストごとに `Authorization: Bearer <fresh-jwt>` を書き換えます。Microsoft の RBAC も Foundry のスコープも同じで、違うのは SDK の仕組みだけです。

### Entra ID を使う理由 {#why-use-entra-id}

- 長く使う API キーを入れ替えたり失効させたりする手間がありません。
- アクセスは RBAC で決まります。Foundry リソースの `Azure AI User` を付け外しするだけで済み、設定を書き換える必要はありません。
- アクセスログや監査ログが割り当て先ごとに分かれます。全員が 1 つの固定キーを共有する形にはなりません。
- Azure VM、AKS のポッド、App Service、Functions、Container Apps、そして Foundry Agent Service まで、マネージド ID で認証の入口を 1 つにまとめられます。
- CI/CD のパイプラインではワークロード ID やサービスプリンシパルの方式が使えます。

### 一度だけの準備（Azure 側） {#one-time-setup-azure-side}

1. Azure ポータルで Foundry リソースを開き、**アクセス制御 (IAM)** → **追加 → ロールの割り当ての追加**へ進みます。
2. **Azure AI User** ロールを選びます（テナントで名称が変わっている場合は **Foundry User**）。
3. 次のいずれかに割り当てます。
   - `az login` を使うローカル開発なら、**自分のユーザーアカウント**。
   - Azure 上で動かす場合は、**マネージド ID またはワークロード ID**（本番にはこちらがおすすめです）。
   - Hermes をホスト型エージェントの中で動かす場合は、**Foundry Agent Service のホスト型エージェントのエージェント ID**。
   - ワークロード ID が使えない CI/CD では、**サービスプリンシパル**。
4. ロールが行き渡るまで 5 分ほど待ちます。

Azure CLI で同じことをする場合はこうです。

```bash
az role assignment create \
  --assignee <principal-or-agent-identity-client-id> \
  --role "Azure AI User" \
  --scope <foundry-resource-id>
```

### 一度だけの準備（Hermes 側） {#one-time-setup-hermes-side}

```bash
hermes model
# → Select "Azure Foundry"
# → Enter your endpoint URL
# → Authentication: 2 (Microsoft Entra ID)
# → (optional) user-assigned managed identity client ID
# → (optional) Azure tenant ID
# → Hermes probes DefaultAzureCredential() and reports which inner
#    credential succeeded (e.g. AzureCliCredential, ManagedIdentityCredential)
```

ウィザードは時間を区切った事前確認（10 秒でタイムアウト）を行います。失敗した場合は「このまま保存してあとで確認する」という選択肢が出ます。認証情報がまだ手元にないけれど実行時には用意される、といった状況（マネージド ID で動かす環境の設定をあらかじめ書いておく場合など）で役に立ちます。

`azure-identity` は初回利用時に Hermes の遅延インストールで自動的に入ります。先に入れておきたい場合はこうします。

```bash
pip install azure-identity
```

### `config.yaml` に書き込まれる設定 {#configuration-written-to-configyaml}

```yaml
model:
  provider: azure-foundry
  base_url: https://my-resource.openai.azure.com/openai/v1
  api_mode: chat_completions
  auth_mode: entra_id
  default: gpt-4o
  context_length: 128000
  entra:
    scope: https://ai.azure.com/.default        # only when overriding the default
```

Hermes が `config.yaml` で管理する Entra 固有の設定は 1 つだけです。

- **`scope`** — OAuth のリソーススコープ。既定値は Microsoft が示す推論スコープ（`https://ai.azure.com/.default`）です。標準とは違う対象でリソースを作った場合にだけ上書きしてください。

それ以外（テナント、サービスプリンシパルのシークレット、フェデレーショントークンのファイル、ソブリンクラウドの認証局、ブローカーの設定）はすべて、`azure-identity` が標準の `AZURE_*` 環境変数から直接読み取ります。下の[認証情報を探す順番](#credential-resolution-order)を参照してください。これらは Microsoft の SDK 資料が説明するとおりに、`~/.hermes/.env` か動かす環境側で設定します。

Entra モードでは `~/.hermes/.env` に秘密情報は入りません。`azure-identity` がプロセス内（環境によっては OS のキーチェーンや `~/.IdentityService`）にトークンをキャッシュします。

### 認証情報を探す順番 {#credential-resolution-order}

`azure-identity` の `DefaultAzureCredential` は、トークンを求められるたびに次の順で試し、最初にトークンを返したところで止まります。

1. **環境変数の認証情報** — `AZURE_TENANT_ID` + `AZURE_CLIENT_ID` + `AZURE_CLIENT_SECRET`（あるいは `AZURE_CLIENT_CERTIFICATE_PATH` / `AZURE_FEDERATED_TOKEN_FILE`）。
2. **ワークロード ID** — `AZURE_FEDERATED_TOKEN_FILE`（AKS のフェデレーショントークン / OIDC）。
3. **マネージド ID** — 仮想マシンでは IMDS のエンドポイント（`169.254.169.254`）、App Service・Functions・Container Apps では `IDENTITY_ENDPOINT`。Foundry Agent Service のホスト型エージェントは、そのエージェントのエージェント ID を使います。
4. **Visual Studio Code** — Azure アカウントの拡張機能。
5. **Azure CLI** — `az login` のセッション。
6. **Azure Developer CLI** — `azd auth login`。
7. **Azure PowerShell** — `Connect-AzAccount`。
8. **ブローカー**（Windows / WSL のみ）— Web Account Manager。

無人で動く Hermes のために、ブラウザを開く対話型の認証は既定で除外されています。代わりに Azure CLI、Azure Developer CLI、マネージド ID、ワークロード ID、サービスプリンシパルのいずれかを使ってください。

### 使い方のパターン {#deployment-patterns}

**ローカル開発:**
```bash
az login
hermes model   # pick Azure Foundry → Entra ID
hermes         # uses your az login token
```

**Azure VM / Functions / App Service / Container Apps（システム割り当てのマネージド ID）:**
1. その計算リソースでシステム割り当て ID を有効にします。
2. その ID に、Foundry リソースの `Azure AI User`（または `Foundry User`）を付与します。
3. config.yaml に `model.auth_mode: entra_id` を設定します。環境変数は不要です。

**Azure VM / Functions / App Service / Container Apps（ユーザー割り当てのマネージド ID）:**
- `DefaultAzureCredential` が正しい ID を選べるように、`AZURE_CLIENT_ID` にユーザー割り当て ID のクライアント ID を設定します。

**Foundry Agent Service のホスト型エージェント:**
- ホスト型エージェントを作り、そのエージェントの ID に Foundry リソースの `Azure AI User`（または `Foundry User`）を付与します。Hermes はホスト型エージェントの中から `ManagedIdentityCredential` を使うため、ロールは親プロジェクトや自分のユーザーではなく、エージェント ID に割り当てる必要があります。

**AKS のワークロード ID（AAD ポッド ID の後継）:**
- ポッドのサービスアカウントに、ワークロード ID のクライアント ID を注釈として付けます。
- ポッドのフェデレーショントークンのファイルは `AZURE_FEDERATED_TOKEN_FILE` から自動で見つかります。
- `model.auth_mode: entra_id` を設定すれば、ほかに設定を変える必要はありません。

**CI のサービスプリンシパル:**
- 実行環境に `AZURE_TENANT_ID`、`AZURE_CLIENT_ID`、`AZURE_CLIENT_SECRET` を設定します。

#### ソブリンクラウド（政府向け・中国） {#sovereign-clouds-government-china}

`AZURE_AUTHORITY_HOST` をエクスポートします（Azure Government なら `https://login.microsoftonline.us`、Azure China なら `https://login.partner.microsoftonline.cn` など）。`azure-identity` がこれを直接読み取ります。

### 状態を確認する {#health-checks}

`model.auth_mode: entra_id` のとき、`hermes doctor` は `DefaultAzureCredential` に対して 10 秒の確認を行い、どの認証情報が通ったか（環境変数があったか、マネージド ID のエンドポイントに届いたか、など）を報告します。

`hermes auth` は整理された状態表示を出します。

```
azure-foundry (Microsoft Entra ID):
  Endpoint: https://my-resource.openai.azure.com/openai/v1
  Scope: https://ai.azure.com/.default
  Status: configured; live token probe is skipped here
```

### 制約 {#limitations}

- **Anthropic 形式のエンドポイントは httpx のイベントフックを使います。** Anthropic Python SDK は呼び出し可能な `auth_token` をそのままでは受け付けません（0.86.0 以前）。そこで Hermes は独自の `httpx.Client` にリクエストイベントフックを組み込み、送信のたびに新しい JWT を発行して `Authorization: Bearer <jwt>` を書き換えます。OpenAI SDK の `Callable[[], str]` の仕組みと働きは同じですが、間に一段はさまる形になります。将来 Anthropic SDK が呼び出し可能な認証に正式対応したら、Hermes は気づかれない形でそちらへ切り替えます。
- **バッチ処理と `multiprocessing.Pool`。** Entra のトークン提供部分はクロージャなので、プロセスをまたいで受け渡すことができません。`batch_runner.py` はワーカーの設定からこの部分を自動的に外し、各ワーカープロセスが `config.yaml` から自前で組み立て直すようにします。利用者側の操作は不要ですが、ワーカーごとに起動時の認証情報探索が 1 回ぶん発生します。
- **ベアラー JWT は `auth.json` に保存されません。** Hermes は `azure-identity` の内部トークンキャッシュを二重に持ちません。そのため、起動直後の最初の推論では認証情報を順に探すところから始まります。

## 設定（`config.yaml` に書き込まれるもの） {#configuration-written-to-configyaml}

ウィザードを実行すると、次のような内容になります。

```yaml
model:
  provider: azure-foundry
  base_url: https://my-resource.openai.azure.com/openai/v1
  api_mode: chat_completions         # or "anthropic_messages"
  default: gpt-5.4-mini              # your deployment / model name
  context_length: 400000             # auto-detected
```

そして `~/.hermes/.env` にはこう入ります。

```
AZURE_FOUNDRY_API_KEY=<your-azure-key>
```

## OpenAI 形式のエンドポイント（GPT、Llama など） {#openai-style-endpoints-gpt-llama-etc}

Azure OpenAI の v1 正式版エンドポイントは、標準の `openai` Python クライアントをほぼそのまま受け付けます。

```yaml
model:
  provider: azure-foundry
  base_url: https://my-resource.openai.azure.com/openai/v1
  api_mode: chat_completions
  default: gpt-5.4
```

押さえておきたい動きは次のとおりです。

- **GPT-5.x、codex、o シリーズは自動的に Responses API へ回ります。** Microsoft Foundry は GPT-5 / codex / o1 / o3 / o4 のモデルを Responses API 専用としてデプロイするため、これらに `/chat/completions` を呼ぶと `400 "The requested operation is unsupported."` が返ります。Hermes は名前からこれらのモデルファミリーを見分け、`config.yaml` が `api_mode: chat_completions` のままでも、気づかれない形で `api_mode` を `codex_responses` へ引き上げます。GPT-4、GPT-4o、Llama、Mistral などのデプロイは `/chat/completions` のままです。
- **`max_completion_tokens` が自動で使われます。** Azure OpenAI は（本家 OpenAI と同じく）gpt-4o、o シリーズ、gpt-5.x のモデルで `max_completion_tokens` を要求します。Hermes はエンドポイントに応じて正しいパラメーターを送ります。
- **`api-version` が必要な v1 より前のエンドポイント。** `https://<resource>.openai.azure.com/openai?api-version=2025-04-01-preview` のような従来のベース URL を使っている場合、Hermes はクエリ文字列を取り出し、リクエストのたびに `default_query` で渡します（そうしないと OpenAI SDK がパスをつなぐときに落としてしまいます）。

## Anthropic 形式のエンドポイント（Microsoft Foundry 経由の Claude） {#anthropic-style-endpoints-claude-via-microsoft-foundry}

Claude のデプロイでは、Anthropic 形式の経路を使います。

```yaml
model:
  provider: azure-foundry
  base_url: https://my-resource.services.ai.azure.com/anthropic
  api_mode: anthropic_messages
  default: claude-sonnet-4-6
```

押さえておきたい動きは次のとおりです。

- **ベース URL から `/v1` が取り除かれます。** Anthropic SDK はリクエスト URL のたびに `/v1/messages` を付け足すため、Hermes は URL を SDK に渡す前に末尾の `/v1` を取り除き、`/v1` が二重になるのを防ぎます。
- **`api-version` は URL に足すのではなく `default_query` で送られます。** Azure の Anthropic 経路は `api-version` のクエリ文字列を必要とします。これをベース URL に埋め込むと `/anthropic?api-version=.../v1/messages` のような壊れたパスになり 404 が返ります。そこで Hermes は Anthropic SDK の `default_query` を使って `api-version=2025-04-15` を渡します。
- **`x-api-key` ではなくベアラー認証が使われます。** Azure の Anthropic 互換の経路は、Anthropic 本来の `x-api-key` ヘッダーではなく `Authorization: Bearer <key>` を要求します。Hermes はベース URL に `azure.com` が含まれていることを見分け、SDK の `auth_token` 欄に API キーを渡して、正しいヘッダーが送られるようにします。
- **100 万トークンのコンテキスト用ベータヘッダーは残されます。** Azure は 100 万トークンの Claude コンテキスト（Opus 4.6/4.7、Sonnet 4.6）を、いまも `anthropic-beta: context-1m-2025-08-07` ヘッダーの後ろに置いています。Hermes は Azure の経路ではこのベータヘッダーを残します（本家 Anthropic の OAuth リクエストでは、一部のサブスクリプションが拒否するため取り除いていますが、Azure では必要です）。
- **OAuth トークンの更新は無効になります。** Azure のデプロイは固定の API キーを使います。Anthropic Console 向けに動く `~/.claude/.credentials.json` の OAuth トークン更新処理は、Azure のエンドポイントでは明示的に飛ばされます。Claude Code の OAuth トークンが、会話の途中で Azure のキーを上書きしてしまうのを防ぐためです。

## 別のやり方: `provider: anthropic` と Azure のベース URL {#alternative-provider-anthropic-azure-base-url}

すでに `provider: anthropic` を設定していて、Claude のために Microsoft Foundry を指すだけにしたい場合は、`azure-foundry` プロバイダーを使わずに済ませられます。

```yaml
model:
  provider: anthropic
  base_url: https://my-resource.services.ai.azure.com/anthropic
  key_env: AZURE_ANTHROPIC_KEY
  default: claude-sonnet-4-6
```

このとき `~/.hermes/.env` に `AZURE_ANTHROPIC_KEY` を設定します。Hermes はベース URL に `azure.com` が含まれていることを見分け、Claude Code の OAuth トークンの流れを迂回して、Azure のキーを `x-api-key` 認証でそのまま使います。

`key_env` が正式なスネークケースの項目名で、`api_key_env`（およびキャメルケースの `keyEnv` / `apiKeyEnv`）も別名として受け付けられます。`key_env` と `AZURE_ANTHROPIC_KEY`／`ANTHROPIC_API_KEY` の両方が設定されている場合は、`key_env` で指定した環境変数が優先されます。

## モデルの自動検出 {#model-discovery}

Azure には、API キーだけで*デプロイ済み*のモデルを一覧できるエンドポイントが**ありません**。デプロイの一覧には、推論用の API キーではなく Azure AD のプリンシパルによる Azure Resource Manager の認証（`az cognitiveservices account deployment list`）が必要です。

Hermes にできるのは次のことです。

- Azure OpenAI の v1 エンドポイント（`<resource>.openai.azure.com/openai/v1`）は、そのリソースで**利用可能な**モデルのカタログを `GET /models` で公開しています。Hermes はこの一覧をモデルピッカーの初期表示に使います。
- Microsoft Foundry の `/anthropic` 経路は URL のパスから判別され、モデル名は手で入力します。
- プライベートなエンドポイントやファイアウォールの内側にあるものは、「調べられませんでした」という案内とともに手入力になります。

デプロイ名はいつでも直接入力できます。Hermes は返ってきた一覧と照合して弾いたりはしません。

## 環境変数 {#environment-variables}

| 変数 | 用途 |
|----------|---------|
| `AZURE_FOUNDRY_API_KEY` | Microsoft Foundry / Azure OpenAI の主 API キー（api_key モード） |
| `AZURE_FOUNDRY_BASE_URL` | エンドポイント URL（`hermes model` で設定します。環境変数は代替手段として使われます） |
| `AZURE_ANTHROPIC_KEY` | `provider: anthropic` と Azure のベース URL を組み合わせるときに使います（`ANTHROPIC_API_KEY` の代わり） |
| `AZURE_TENANT_ID` | サービスプリンシパル方式で使う Entra ID のテナント |
| `AZURE_CLIENT_ID` | Entra ID のクライアント ID（サービスプリンシパル、ワークロード ID、ユーザー割り当てのマネージド ID） |
| `AZURE_CLIENT_SECRET` | サービスプリンシパルのシークレット |
| `AZURE_CLIENT_CERTIFICATE_PATH` | サービスプリンシパルの証明書（シークレットの代わり） |
| `AZURE_FEDERATED_TOKEN_FILE` | ワークロード ID のフェデレーショントークンのパス（AKS） |
| `AZURE_AUTHORITY_HOST` | ソブリンクラウドの認証局ホストの上書き |
| `IDENTITY_ENDPOINT` / `MSI_ENDPOINT` | App Service・Functions・Container Apps のマネージド ID エンドポイント。VM では通常こちらではなく IMDS を使います |

`AZURE_*` の環境変数は Azure SDK が直接読み取ります。Hermes はこれらを、`hermes doctor` の出力でどの情報が揃っているかを示す以外には見ません。

## うまくいかないとき {#troubleshooting}

**gpt-5.x のデプロイで 401 Unauthorized になる。**
Azure は gpt-5.x を `/responses` ではなく `/chat/completions` で提供します。URL に `openai.azure.com` が含まれていれば Hermes が自動で処理しますが、`Invalid API key` という内容の 401 が出る場合は、`config.yaml` の `api_mode` が `chat_completions` になっているか確認してください。

**`/v1/messages?api-version=.../v1/messages` で 404 になる。**
これは修正前の Azure Anthropic 設定で起きていた URL 崩れです。Hermes を新しくしてください。`api-version` はベース URL に埋め込まず `default_query` 経由で渡すようになったので、SDK が URL をつなぐときに壊れることはありません。

**ウィザードが「Auto-detection incomplete」と言う。**
エンドポイントが `/models` の確認と Anthropic Messages の確認の両方を拒否した状態です。ファイアウォールの内側や IP 制限のあるプライベートなエンドポイントでは、これがふつうです。API のモードを自分で選び、デプロイ名を入力してください。動作そのものは問題なく、Hermes がピッカーをあらかじめ埋められないだけです。

**通信形式の判別を間違えた。**
`hermes model` をもう一度実行すると、ウィザードが調べ直します。それでも正しく判別されない場合は、`config.yaml` を直接編集できます。

```yaml
model:
  provider: azure-foundry
  api_mode: anthropic_messages   # or chat_completions
```

**Entra ID: `auth_mode: entra_id` に切り替えたあと「credential chain exhausted」や 401 Unauthorized が出る。**
- `az login` を実行して開発者向けのセッションを更新してください（キャッシュされたトークンが期限切れの可能性があります）。
- `Azure AI User`（または `Foundry User`）のロール割り当てが反映されているか確認します。`az role assignment list --assignee <user-or-identity-id>` を実行すると、Foundry リソースに対する割り当てが出るはずです。反映には 5 分ほどかかることがあります。
- ユーザー割り当てのマネージド ID では、`AZURE_CLIENT_ID` が計算リソースに紐づいた ID と一致しているか確認してください。
- `hermes doctor` を実行します。Azure Entra の確認が、トークンを取得できたかどうかと対処のヒントを教えてくれます。

**Entra ID: ウィザードの事前確認が止まる、またはタイムアウトする。**
10 秒の事前確認はあくまで補助的なものです。「このまま保存してあとで確認する」を選び、動かす環境へ配置してから `hermes doctor` を実行してください。よくある原因は、トークンのサービスに到達できないことと、ローカルのログイン状態が古いことです。CI ではワークロード ID を、サービスプリンシパルを使うなら `AZURE_TENANT_ID` と `AZURE_CLIENT_ID` と `AZURE_CLIENT_SECRET` の設定を、ローカル開発なら `az login` の実行をおすすめします。

**Entra ID を使う Anthropic 形式のエンドポイントで 401 になる。**
同じ `Azure AI User`（または `Foundry User`）ロールが Foundry リソースに割り当てられているか確認してください（このロールは `/openai/v1` と `/anthropic` の両方をカバーします）。ウィザードでは OpenAI 形式の確認が通るのに、実行時に `claude-*` のリクエストだけ失敗する場合、最も多い原因は以前のウィザード実行で残った古い `model.entra.scope` です。`config.yaml` から `entra.scope` の行を削除して、実行時に既定の `https://ai.azure.com/.default` スコープへ戻るようにしてください。

## 関連ページ {#related}

- [環境変数](/hermes/docs/reference/environment-variables/)
- [設定](/hermes/docs/user-guide/configuration/)
- [AWS Bedrock](/hermes/docs/guides/aws-bedrock/) — もう一つの主要なクラウドプロバイダーとの連携
- [Microsoft: Foundry で Entra ID を設定する](https://learn.microsoft.com/azure/ai-foundry/foundry-models/how-to/configure-entra-id) — キーなし方式についての本家の資料
