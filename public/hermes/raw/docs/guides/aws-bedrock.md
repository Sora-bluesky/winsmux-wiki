---
title: "AWS Bedrock"
description: "Hermes Agent を Amazon Bedrock で使う — ネイティブの Converse API、IAM 認証、Guardrails、クロスリージョン推論"
upstream_path: guides/aws-bedrock.md
upstream_blob: ec7b1224fce534945ed289321fd19cfae4221147
sources:
  - https://hermes-agent.nousresearch.com/docs/guides/aws-bedrock
---

# AWS Bedrock {#aws-bedrock}

Hermes Agent は Amazon Bedrock をネイティブのプロバイダーとして扱い、**Converse API** を使って接続します。OpenAI 互換エンドポイント経由ではありません。そのため Bedrock のエコシステムをそのまま使えます。IAM 認証、Guardrails、クロスリージョン推論プロファイル、そしてすべての基盤モデルが対象です。

## 事前に必要なもの {#prerequisites}

- **AWS の認証情報** — [boto3 の認証情報チェーン](https://boto3.amazonaws.com/v1/documentation/api/latest/guide/credentials.html)が対応しているものならどれでも使えます。
  - IAM インスタンスロール（EC2・ECS・Lambda なら設定は不要です）
  - `AWS_ACCESS_KEY_ID` と `AWS_SECRET_ACCESS_KEY` の環境変数
  - SSO や名前付きプロファイルを使う場合の `AWS_PROFILE`
  - ローカル開発なら `aws configure`
- **boto3** — `cd ~/.hermes/hermes-agent && uv pip install -e ".[bedrock]"` を実行すると入ります。
- **IAM の権限** — 最低限、次のものが必要です。
  - 推論のための `bedrock:InvokeModel` と `bedrock:InvokeModelWithResponseStream`
  - モデル検出のための `bedrock:ListFoundationModels` と `bedrock:ListInferenceProfiles`

:::tip EC2 / ECS / Lambda
AWS 上で動かすなら、`AmazonBedrockFullAccess` を付けた IAM ロールをアタッチするだけで済みます。API キーも `.env` の設定も要りません。Hermes がインスタンスロールを自動で見つけます。
:::

## すぐ使い始める {#quick-start}

```bash
# Install with Bedrock support
cd ~/.hermes/hermes-agent && uv pip install -e ".[bedrock]"

# Select Bedrock as your provider
hermes model
# → Choose "More providers..." → "AWS Bedrock"
# → Select your region and model

# Start chatting
hermes chat
```

## 設定 {#configuration}

`hermes model` を実行したあと、`~/.hermes/config.yaml` は次のような内容になります。

```yaml
model:
  default: us.anthropic.claude-sonnet-4-6
  provider: bedrock
  base_url: https://bedrock-runtime.us-east-2.amazonaws.com

bedrock:
  region: us-east-2
```

### リージョン {#region}

AWS のリージョンは次のいずれかの方法で指定します（上にあるものほど優先されます）。

1. `config.yaml` の `bedrock.region`
2. 環境変数 `AWS_REGION`
3. 環境変数 `AWS_DEFAULT_REGION`
4. 既定値の `us-east-1`

### Guardrails {#guardrails}

すべてのモデル呼び出しに [Amazon Bedrock Guardrails](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html) を適用するには、次のように書きます。

```yaml
bedrock:
  region: us-east-2
  guardrail:
    guardrail_identifier: "abc123def456"  # From the Bedrock console
    guardrail_version: "1"                # Version number or "DRAFT"
    stream_processing_mode: "async"       # "sync" or "async"
    trace: "disabled"                     # "enabled", "disabled", or "enabled_full"
```

### モデルの自動検出 {#model-discovery}

Hermes は Bedrock のコントロールプレーン経由で、使えるモデルを自動的に見つけます。この動きは次のように調整できます。

```yaml
bedrock:
  discovery:
    enabled: true
    provider_filter: ["anthropic", "amazon"]  # Only show these providers
    refresh_interval: 3600                     # Cache for 1 hour
```

### プロンプトキャッシュ（cachePoint） {#prompt-caching-cachepoint}

Hermes は Bedrock の **Converse API** 経路で、システムプロンプト・ツール定義・最新メッセージのあとに `cachePoint` マーカーを差し込み、プロンプトキャッシュを自動で効かせます。ただし `cachePoint` ブロックに対応していないモデルへ送ると `ValidationException` が返るため、マーカーを付けるのは動作が確認済みの許可リストにあるモデル（Anthropic Claude と Amazon Nova のモデル ID）だけです。知らないモデルにはキャッシュマーカーを付けません。Claude のモデルは通常 AnthropicBedrock SDK の経路を通り、そちらは独自のプロンプトキャッシュを持っています。Converse の `cachePoint` 経路が受け持つのは Nova と、ベアラートークンを使う Claude のフォールバックです。設定は不要で、キャッシュの読み書きは使用量の集計に現れます。

### コンテキストウィンドウの実測 {#context-window-probing}

コンテキストウィンドウが Hermes の静的な一覧に載っていないモデルについては、わざと大きすぎるリクエストを決まった段階（およそ 130 万トークンと 220 万トークン）で送り、Bedrock の長さ検証エラーに含まれる `maximum` の値を読み取って、実際の上限を調べられます。こうして得た値は静的な一覧と同じメタデータキャッシュに入ります。古いキャッシュがモデルの実際のウィンドウより小さい値を報告している場合（たとえば 100 万トークンのウィンドウが正式提供される前に作られた項目など）は、自動的に破棄されて大きいほうの既知の値が使われます。

## 使えるモデル {#available-models}

Bedrock のモデルは、オンデマンド呼び出しでは**推論プロファイル ID** を使います。`hermes model` のピッカーがこれを自動で表示し、おすすめのモデルが上に並びます。

| モデル | ID | 備考 |
|-------|-----|-------|
| Claude Sonnet 4.6 | `us.anthropic.claude-sonnet-4-6` | おすすめ。速度と能力のバランスが最も良い |
| Claude Opus 4.6 | `us.anthropic.claude-opus-4-6-v1` | 最も高性能 |
| Claude Haiku 4.5 | `us.anthropic.claude-haiku-4-5-20251001-v1:0` | Claude の中で最速 |
| Amazon Nova Pro | `us.amazon.nova-pro-v1:0` | Amazon の主力 |
| Amazon Nova Micro | `us.amazon.nova-micro-v1:0` | 最速・最安 |
| DeepSeek V3.2 | `deepseek.v3.2` | 性能の高いオープンモデル |
| Llama 4 Scout 17B | `us.meta.llama4-scout-17b-instruct-v1:0` | Meta の最新モデル |

:::info クロスリージョン推論
`us.` で始まるモデルはクロスリージョン推論プロファイルを使い、AWS の複数リージョンにまたがって容量に余裕を持たせ、障害時は自動で切り替わります。`global.` で始まるモデルは、世界中の利用可能なリージョンへ振り分けられます。
:::

## 会話の途中でモデルを切り替える {#switching-models-mid-session}

会話中に `/model` コマンドを使います。

```
/model us.amazon.nova-pro-v1:0
/model deepseek.v3.2
/model us.anthropic.claude-opus-4-6-v1
```

## 診断 {#diagnostics}

```bash
hermes doctor
```

doctor は次の点を調べます。

- AWS の認証情報が使える状態か（環境変数・IAM ロール・SSO）
- `boto3` が入っているか
- Bedrock API に到達できるか（ListFoundationModels）
- 自分のリージョンで使えるモデルがいくつあるか

## ゲートウェイ（メッセージングの各サービス） {#gateway-messaging-platforms}

Bedrock は Hermes のゲートウェイが対応するすべてのサービス（Telegram・Discord・Slack・Feishu など）で使えます。プロバイダーとして Bedrock を設定したうえで、いつもどおりゲートウェイを起動してください。

```bash
hermes gateway setup
hermes gateway start
```

ゲートウェイは `config.yaml` を読み、同じ Bedrock プロバイダーの設定を使います。

## うまくいかないとき {#troubleshooting}

### 「No API key found」「No AWS credentials」と出る {#no-api-key-found-no-aws-credentials}

Hermes は次の順に認証情報を探します。

1. `AWS_BEARER_TOKEN_BEDROCK`
2. `AWS_ACCESS_KEY_ID` と `AWS_SECRET_ACCESS_KEY`
3. `AWS_PROFILE`
4. EC2 のインスタンスメタデータ（IMDS）
5. ECS のコンテナ認証情報
6. Lambda の実行ロール

どれも見つからない場合は、`aws configure` を実行するか、実行中のインスタンスに IAM ロールをアタッチしてください。

### 「Invocation of model ID ... with on-demand throughput isn't supported」と出る {#invocation-of-model-id-with-on-demand-throughput-isnt-supported}

素の基盤モデル ID ではなく、**推論プロファイル ID**（`us.` または `global.` で始まるもの）を使ってください。たとえば次のようになります。

- ❌ `anthropic.claude-sonnet-4-6`
- ✅ `us.anthropic.claude-sonnet-4-6`

### 「ThrottlingException」と出る {#throttlingexception}

Bedrock のモデルごとのレート上限に達しています。Hermes は間隔を空けながら自動で再試行します。上限を上げたい場合は、[AWS Service Quotas コンソール](https://console.aws.amazon.com/servicequotas/)から引き上げを申請してください。

## AWS へのワンクリック展開 {#one-click-aws-deployment}

CloudFormation を使って EC2 上に自動で構築したい場合はこちらです。

**[sample-hermes-agent-on-aws-with-bedrock](https://github.com/JiaDe-Wu/sample-hermes-agent-on-aws-with-bedrock)** — VPC・IAM ロール・EC2 インスタンスを作り、Bedrock の設定まで自動で済ませます。どのリージョンにもワンクリックで展開できます。
