---
title: "Google Gemini"
description: "Hermes Agent を Google Gemini で使う方法。ネイティブの AI Studio API、API キーの設定、ツール呼び出し、ストリーミング、割り当ての考え方を扱います"
upstream_path: guides/google-gemini.md
upstream_blob: 7a00eabf8dff2950d79df3a9a6fc2a8826b87be1
sources:
  - https://hermes-agent.nousresearch.com/docs/guides/google-gemini
---

# Google Gemini {#google-gemini}

Hermes Agent は Google Gemini をネイティブのプロバイダーとして扱えます。使うのは **Google AI Studio / Gemini API** で、OpenAI 互換のエンドポイントではありません。これにより Hermes は、内部で持っている OpenAI 形式のメッセージとツールのやりとりを Gemini ネイティブの `generateContent` API へ変換しながら、ツール呼び出し、ストリーミング、マルチモーダル入力、Gemini 固有のレスポンス情報をそのまま活かせます。

## 事前に必要なもの {#prerequisites}

- **Google AI Studio の API キー** — [aistudio.google.com/apikey](https://aistudio.google.com/apikey) で作成します
- **課金を有効にした Google Cloud プロジェクト** — エージェント用途では推奨です。Hermes はユーザーの 1 ターンごとに何度もモデルを呼ぶことがあるため、Gemini の無料枠は長時間のエージェントセッションには足りません。
- **Hermes のインストール** — ネイティブの Gemini プロバイダーに追加の Python パッケージは不要です。

:::tip API キーの置き場所
`GOOGLE_API_KEY` か `GEMINI_API_KEY` を設定してください。Hermes は `gemini` プロバイダーについて、この両方の名前を確認します。
:::

## クイックスタート {#quick-start}

```bash
# Add your Gemini API key
echo "GOOGLE_API_KEY=..." >> ~/.hermes/.env

# Select Gemini as your provider
hermes model
# → Choose "More providers..." → "Google AI Studio"
# → Hermes checks your key tier and shows Gemini models
# → Select a model

# Start chatting
hermes chat
```

設定ファイルを直接編集したい場合は、ネイティブの Gemini API のベース URL を指定します。

```yaml
model:
  default: gemini-3-flash-preview
  provider: gemini
  base_url: https://generativelanguage.googleapis.com/v1beta
```

## 設定 {#configuration}

`hermes model` を実行すると、`~/.hermes/config.yaml` は次のような内容になります。

```yaml
model:
  default: gemini-3-flash-preview
  provider: gemini
  base_url: https://generativelanguage.googleapis.com/v1beta
```

そして `~/.hermes/.env` には次が入ります。

```bash
GOOGLE_API_KEY=...
```

### ネイティブの Gemini API {#native-gemini-api}

推奨のエンドポイントはこちらです。

```text
https://generativelanguage.googleapis.com/v1beta
```

Hermes はこのエンドポイントを検出すると、ネイティブの Gemini アダプターを作ります。内部ではエージェントのやりとりを OpenAI 形式のメッセージのまま保持し、リクエストごとに Gemini ネイティブのスキーマへ変換します。

- `messages[]` → Gemini の `contents[]`
- システムプロンプト → Gemini の `systemInstruction`
- ツールのスキーマ → Gemini の `functionDeclarations`
- ツールの実行結果 → Gemini の `functionResponse` パート
- ストリーミング応答 → Hermes 内部のやりとり用に OpenAI 形式のストリームチャンクへ

:::note Gemini 3 の思考シグネチャー
Gemini 3 でツールを使う場合、Hermes は関数呼び出しのパートに付く `thoughtSignature` の値を保持し、次のツールのターンで送り直します。これにより、複数ステップのエージェント処理で検証上とくに重要な経路をカバーできます。

Gemini 3 は、関数呼び出し以外のパートにも思考シグネチャーを付けることがあります。Hermes のネイティブアダプターは現時点でエージェントのツール利用に最適化されているため、関数呼び出し以外のシグネチャーすべてをパート単位で完全に再現するところまでは対応していません。
:::

### ネイティブのエンドポイントを選ぶ {#prefer-the-native-endpoint}

Google は OpenAI 互換のエンドポイントも公開しています。

```text
https://generativelanguage.googleapis.com/v1beta/openai/
```

Hermes のエージェントセッションでは、上に挙げたネイティブの Gemini エンドポイントを選んでください。Hermes にはネイティブの Gemini アダプターが入っているので、複数ターンにわたるツール利用、ツールの実行結果、ストリーミング、マルチモーダル入力、Gemini のレスポンス情報を、Gemini の `generateContent` API へそのまま対応づけられます。OpenAI 互換のエンドポイントは、OpenAI API との互換性がどうしても必要な場面で役に立ちます。

以前に `GEMINI_BASE_URL` を `/openai` の URL に設定していた場合は、削除するか次のように変更してください。

```bash
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
```

## 使えるモデル {#available-models}

`hermes model` の選択画面には、Hermes のプロバイダー登録情報で管理している Gemini モデルが並びます。よく使われるのは次のあたりです。

| モデル | ID | 備考 |
|-------|----|-------|
| Gemini 3.1 Pro Preview | `gemini-3.1-pro-preview` | 利用できる場合、いちばん高性能なプレビュー版 |
| Gemini 3 Pro Preview | `gemini-3-pro-preview` | 推論とコーディングに強いモデル |
| Gemini 3 Flash Preview | `gemini-3-flash-preview` | 速度と性能のバランスがよく、既定として推奨 |
| Gemini 3.1 Flash Lite Preview | `gemini-3.1-flash-lite-preview` | 利用できる場合、いちばん速く費用も抑えられる選択肢 |

どのモデルが使えるかは時期によって変わります。モデルが一覧から消えた、あるいはお使いのキーで有効になっていない場合は、あらためて `hermes model` を実行し、そのときの一覧から選んでください。

:::info モデル ID について
`provider: gemini` を使うときは、`google/gemini-3-flash-preview` のような OpenRouter 形式ではなく、`gemini-3-flash-preview` のような Gemini ネイティブのモデル ID を指定してください。
:::

### latest エイリアス {#latest-aliases}

Google は Gemini の Pro 系と Flash 系について、指し先が移動するエイリアスを公開しています。Hermes の設定を変えずに Google 側の更新へ自動で追随したいときは、`gemini-pro-latest` と `gemini-flash-latest` が便利です。

| エイリアス | 現在の指し先 | 備考 |
|-------|------------------|-------|
| `gemini-pro-latest` | 最新の Gemini Pro モデル | Google の現行 Pro を既定にしたいときに |
| `gemini-flash-latest` | 最新の Gemini Flash モデル | Google の現行 Flash を既定にしたいときに |

```yaml
model:
  default: gemini-pro-latest
  provider: gemini
  base_url: https://generativelanguage.googleapis.com/v1beta
```

結果を厳密に再現したい場合は、`gemini-3.1-pro-preview` や `gemini-3-flash-preview` のように明示的なモデル ID を指定してください。

### Gemini API 経由の Gemma {#gemma-via-the-gemini-api}

Google は Gemma のモデルも Gemini API から公開しています。Hermes はこれらを Google のモデルとして認識しますが、処理量がごく小さい Gemma のエントリーは既定の選択画面から隠しています。長時間のエージェントセッションに、評価向けのモデルをうっかり選んでしまわないようにするためです。

評価に使える ID には次のものがあります。

| モデル | ID | 備考 |
|-------|----|-------|
| Gemma 4 31B IT | `gemma-4-31b-it` | 大きめの Gemma。互換性や品質の評価に向きます |
| Gemma 4 26B A4B IT | `gemma-4-26b-a4b-it` | 利用できる場合、有効パラメーターが少ない小型版 |

これらは Gemini API のキーで使える評価用の選択肢と考えるのがよいでしょう。Google の Gemma API の料金は無料枠のみで、利用上限も本番向けの Gemini モデルに比べると低めです。そのため Hermes をエージェントとして継続的に使うなら、通常は有料の Gemini モデル、自前でホストした環境、あるいは十分な割り当てのある別のプロバイダーへ移すことになります。

選択画面に出てこない Gemma モデルを使いたいときは、直接指定してください。

```yaml
model:
  default: gemma-4-31b-it
  provider: gemini
  base_url: https://generativelanguage.googleapis.com/v1beta
```

## セッションの途中でモデルを切り替える {#switching-models-mid-session}

会話の途中では `/model` コマンドを使います。

```text
/model gemini-3-flash-preview
/model gemini-flash-latest
/model gemini-3-pro-preview
/model gemini-pro-latest
/model gemma-4-31b-it
/model gemini-3.1-flash-lite-preview
```

まだ Gemini を設定していない場合は、いったんセッションを終了して先に `hermes model` を実行してください。`/model` は設定済みのプロバイダーとモデルを切り替えるためのもので、新しい API キーを受け付けることはありません。

## 診断 {#diagnostics}

```bash
hermes doctor
```

doctor は次を確認します。

- `GOOGLE_API_KEY` または `GEMINI_API_KEY` が使える状態か
- 設定したプロバイダーの認証情報を解決できるか

## ゲートウェイ（メッセージングプラットフォーム） {#gateway-messaging-platforms}

Gemini は Hermes のゲートウェイが対応するすべてのプラットフォーム（Telegram、Discord、Slack、WhatsApp、LINE、Feishu など）で使えます。Gemini をプロバイダーとして設定したうえで、いつもどおりゲートウェイを起動してください。

```bash
hermes gateway setup
hermes gateway start
```

ゲートウェイは `config.yaml` を読み、同じ Gemini プロバイダーの設定をそのまま使います。

## 困ったときは {#troubleshooting}

### 「Gemini native client requires an API key」と出る {#gemini-native-client-requires-an-api-key}

Hermes が使える API キーを見つけられませんでした。`~/.hermes/.env` に、次のどちらかを追加してください。

```bash
GOOGLE_API_KEY=...
# or
GEMINI_API_KEY=...
```

そのうえで、あらためて `hermes model` を実行します。

### 「This Google API key is on the free tier」と出る {#this-google-api-key-is-on-the-free-tier}

Hermes はセットアップ時に Gemini の API キーを調べます。ツールの利用、リトライ、圧縮、補助的な処理でモデルを何度も呼ぶことがあるため、無料枠の割り当てはエージェントの数ターンで尽きてしまうことがあります。

キーに紐づく Google Cloud プロジェクトで課金を有効にし、必要ならキーを作り直したうえで、次を実行してください。

```bash
hermes model
```

### 「404 model not found」と出る {#404-model-not-found}

選んだモデルが、そのアカウント、地域、キーでは利用できません。あらためて `hermes model` を実行し、そのときの一覧から別の Gemini モデルを選んでください。

### `hermes model` に Gemma モデルが出てこない {#gemma-model-is-not-shown-in-hermes-model}

Hermes は、処理量の小さい Gemma モデルを既定で選択画面から隠すことがあります。あえて評価したい場合は、`~/.hermes/config.yaml` にモデル ID を直接書いてください。

### Gemma で「429 quota exceeded」と出る {#429-quota-exceeded-on-gemma}

Gemini API から使える Gemma モデルは評価には便利ですが、Gemini API の無料枠の上限は低めです。互換性の確認に使い、継続的なエージェントセッションには有料の Gemini モデルか別のプロバイダーへ切り替えてください。

### OpenAI 互換のエンドポイントが設定されている {#openai-compatible-endpoint-is-configured}

`~/.hermes/.env` に次の行がないか確認してください。

```bash
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
```

ネイティブのエンドポイントに変更するか、この上書き設定そのものを削除します。

```bash
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
```

### ツール呼び出しがスキーマのエラーで失敗する {#tool-calling-fails-with-schema-errors}

Hermes を更新し、あらためて `hermes model` を実行してください。ネイティブの Gemini アダプターは、Gemini の厳しめの関数宣言の形式に合わせてツールのスキーマを整えます。古いビルドや独自のエンドポイントでは、この処理が入りません。

## 関連ページ {#related}

- [AI プロバイダー](/hermes/docs/integrations/providers/)
- [設定](/hermes/docs/user-guide/configuration/)
- [フォールバックプロバイダー](/hermes/docs/user-guide/features/fallback-providers/)
- [AWS Bedrock](/hermes/docs/guides/aws-bedrock/) — AWS の認証情報を使う、クラウド事業者ネイティブの連携です
