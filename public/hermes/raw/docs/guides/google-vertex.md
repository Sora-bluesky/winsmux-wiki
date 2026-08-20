---
title: "Google Vertex AI"
description: "Hermes Agent を Google Cloud Vertex AI の Gemini で使う — OAuth2 のサービスアカウントまたは ADC、GCP の請求とクォータ、固定の API キーは不要"
upstream_path: guides/google-vertex.md
upstream_blob: 54923db967d5a5c1965a45badddc32ff4efc8cbb
sources:
  - https://hermes-agent.nousresearch.com/docs/guides/google-vertex
---

# Google Vertex AI {#google-vertex-ai}

Hermes Agent は、Vertex の OpenAI 互換エンドポイント経由で **Google Cloud Vertex AI 上の Gemini モデル**に対応しています。[Google AI Studio のプロバイダー](/hermes/docs/guides/google-gemini/)（`generativelanguage.googleapis.com` に対して固定の API キーを使うもの）と違い、Vertex では**企業向けのレート上限と GCP の請求・クレジット**が使えます。Gemini の利用分を AI Studio のキーではなく Google Cloud のアカウント側で扱いたいときは、こちらが適しています。

:::info Vertex は API キーではなく OAuth2 で認証します
Vertex の標準エンドポイントには**固定の API キーがありません**。リクエストのたびに、サービスアカウントの JSON かアプリケーションのデフォルト認証情報（ADC）から発行した、寿命の短い **OAuth2 アクセストークン**（有効期間はおよそ 1 時間）が必要です。Hermes がこのトークンの発行と**自動更新**を代わりに行うので、手でトークンを貼り付けることはありません。一時的なトークンをカスタムプロバイダーの `api_key` 欄に貼っても動かないのはこのためです。会話の途中で期限が切れてしまいます。
:::

## 事前に必要なもの {#prerequisites}

- **Google Cloud プロジェクト** — **Vertex AI API が有効**で、請求が有効になっているもの。
- **認証情報** — 次のどちらか。
  - `roles/aiplatform.user` ロールを持つ**サービスアカウントの JSON** キーファイル、または
  - `gcloud auth application-default login` で用意する**アプリケーションのデフォルト認証情報**（GCP の VM 上で動かす場合はメタデータサーバーでも構いません）。
- **`google-auth`** — Vertex を初めて選んだときに自動で入ります（遅延インストール）。うまくいかない場合は `hermes setup` を実行して、管理されたインストールを修復してください。

## すぐ使い始める {#quick-start}

```bash
# Option A — service account JSON (recommended for servers / gateways)
echo "VERTEX_CREDENTIALS_PATH=/path/to/service-account.json" >> ~/.hermes/.env

# Option B — Application Default Credentials (good for local dev)
gcloud auth application-default login

# Select Vertex as your provider
hermes model
# → Choose "More providers..." → "Google Vertex AI"
# → Enter your GCP project ID (or leave blank to use the one in your credentials)
# → Choose a region (default: global)
# → Select a Gemini model

# Start chatting
hermes chat
```

## 設定 {#configuration}

Vertex の設定は、秘密にすべきかどうかで置き場所が分かれます。

- **認証情報のパス**は秘密情報を指すものなので、`~/.hermes/.env` に置きます。
- **プロジェクト ID とリージョン**は秘密ではない経路の設定なので、`~/.hermes/config.yaml` に置きます。

`~/.hermes/.env`:

```bash
# One of these (checked in this order); omit both to use ADC:
VERTEX_CREDENTIALS_PATH=/path/to/service-account.json
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

`~/.hermes/config.yaml`:

```yaml
model:
  default: google/gemini-3-flash-preview
  provider: vertex

vertex:
  project_id: my-gcp-project   # blank → use the project embedded in the credentials
  region: global               # "global" is required for the Gemini 3.x previews
```

:::tip 環境変数は config.yaml より優先されます
`VERTEX_PROJECT_ID` と `VERTEX_REGION` は、`config.yaml` の `vertex.project_id` / `vertex.region` の値を上書きします。シェルごとに一時的に切り替えたいときに使い、ふだん使う設定は `config.yaml` に置いてください。
:::

### 認証のしくみ {#how-authentication-works}

1. Hermes は認証情報を `VERTEX_CREDENTIALS_PATH` → `GOOGLE_APPLICATION_CREDENTIALS` → ADC の順に探します。
2. OAuth2 のアクセストークン（`cloud-platform` スコープ）を発行してキャッシュし、期限まで 5 分を切ると更新します。
3. トークンは、Vertex のエンドポイントを指した標準の OpenAI クライアントに渡されます。
   ```text
   https://aiplatform.googleapis.com/v1beta1/projects/{project}/locations/{region}/endpoints/openapi
   ```
   リージョン指定の場合は、代わりに `{region}-aiplatform.googleapis.com` のホストを使います。
4. 会話がトークンの寿命より長く続き、リクエストが `401` を返した場合は、Hermes がトークンを発行し直して自動で再試行します。長く動き続けるゲートウェイで ADC の更新トークン自体が期限切れになったときは、サービスアカウントの JSON が設定されていればそちらへ切り替えます。

## 使えるモデル {#available-models}

Vertex ではモデル ID に `google/` というベンダー接頭辞が必要です。`hermes model` のピッカーには次のものが並びます。

| モデル | ID |
|-------|----|
| Gemini 3.1 Pro Preview | `google/gemini-3.1-pro-preview` |
| Gemini 3 Pro Preview | `google/gemini-3-pro-preview` |
| Gemini 3 Flash Preview | `google/gemini-3-flash-preview` |
| Gemini 3.1 Flash Lite Preview | `google/gemini-3.1-flash-lite-preview` |
| Gemini 2.5 Pro | `google/gemini-2.5-pro` |
| Gemini 2.5 Flash | `google/gemini-2.5-flash` |

:::note Gemini 3.x には `global` リージョンを使います
Gemini 3.x のプレビューモデルは `global` のエンドポイントから提供されます。リージョン指定のエンドポイント（`us-central1` など）では 404 になることがあります。特別な理由がなければ `region: global` のままにしてください。
:::

## 会話の途中でモデルを切り替える {#switching-models-mid-session}

```text
/model google/gemini-3-pro-preview
/model google/gemini-3-flash-preview
```

`/model` は、すでに設定済みのプロバイダーとモデルの間で切り替えるものです。新しい認証情報を聞いてはくれません。先に `hermes model` で Vertex を設定しておいてください。

## 推論・思考 {#reasoning-thinking}

Vertex は Gemini の思考予算を OpenAI 互換の形で公開しています。Hermes は推論の強さの設定を `extra_body.google.thinking_config` へ自動的に対応づけるので、`reasoning_effort` はほかの Gemini 系と同じように働きます。

## 診断 {#diagnostics}

```bash
hermes doctor
```

doctor は、Vertex の認証情報（サービスアカウントのパスまたは ADC）を解決できるかどうかと、プロバイダーが設定済みかどうかを報告します。

## うまくいかないとき {#troubleshooting}

### 「Vertex AI credentials could not be resolved」と出る {#vertex-ai-credentials-could-not-be-resolved}

サービスアカウントの JSON も、動作する ADC も見つからなかった状態です。`~/.hermes/.env` に `VERTEX_CREDENTIALS_PATH` を設定するか、`gcloud auth application-default login` を実行してください。認証情報にプロジェクトが埋め込まれていない場合は、`config.yaml` に `vertex.project_id` を設定します。

### `google-auth` が入っていない {#google-auth-not-installed}

Vertex プロバイダーを初めて選んだときに、Hermes が遅延インストールします。それが失敗した場合は `hermes setup` を実行して、管理されたインストールを修復してください。

### Gemini 3.x のモデルで 404 になる {#404-on-gemini-3x-models}

おそらくリージョン指定のエンドポイントを使っています。`config.yaml` の `vertex:` の節で `region: global` を設定するか、`VERTEX_REGION` を解除してください。

### 403 や権限エラーになる {#403-permission-denied}

サービスアカウント（または ADC の ID）に、そのプロジェクトでの `roles/aiplatform.user` ロールが必要です。あわせて、そのプロジェクトで Vertex AI API が有効になっている必要があります。

## 関連ページ {#related}

- [Google Gemini（AI Studio）](/hermes/docs/guides/google-gemini/) — GCP なしで固定の API キーを使う Gemini
- [AWS Bedrock](/hermes/docs/guides/aws-bedrock/) — もう一つのクラウドプロバイダーとのネイティブ連携
- [AI プロバイダー](/hermes/docs/integrations/providers/)
- [設定](/hermes/docs/user-guide/configuration/)
