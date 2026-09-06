---
title: "Google Gemini"
description: "Hermes Agent を Google Gemini で使う方法。ネイティブの AI Studio API、API キーの設定、ツール呼び出し、ストリーミング、割り当ての考え方まで"
upstream_path: guides/google-gemini.md
upstream_blob: 001c3cb7101744d3e7bb1fca66c46837bb97b4af
sources:
  - https://hermes-agent.nousresearch.com/docs/guides/google-gemini
---

# Google Gemini {#google-gemini}

Hermes Agent は Google Gemini をネイティブのプロバイダとして扱い、**Google AI Studio / Gemini API** を使います。OpenAI 互換のエンドポイントではありません。これにより Hermes は、内部で持っている OpenAI 形式のメッセージとツールのやり取りを Gemini ネイティブの `generateContent` API へ変換しつつ、ツール呼び出し、ストリーミング、画像などを含む入力、Gemini 固有の応答メタデータをそのまま活かせます。

## 事前に必要なもの {#prerequisites}

- **Google AI Studio の API キー** — [aistudio.google.com/apikey](https://aistudio.google.com/apikey) で作成します
- **課金を有効にした Google Cloud プロジェクト** — エージェントとして使うなら用意しておくことをおすすめします。Hermes はユーザーの 1 往復ごとに何度もモデルを呼ぶことがあるため、Gemini の無料枠では長時間のセッションには足りません。
- **Hermes のインストール** — ネイティブの Gemini プロバイダに追加の Python パッケージは要りません

:::tip API キーの置き場所
`GOOGLE_API_KEY` か `GEMINI_API_KEY` を設定します。`gemini` プロバイダでは Hermes がどちらの名前も見に行きます。
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

設定ファイルを直接書きたい場合は、Gemini ネイティブ API のベース URL を指定します。

```yaml
model:
  default: gemini-3.7-flash
  provider: gemini
  base_url: https://generativelanguage.googleapis.com/v1beta
```

## 設定 {#configuration}

`hermes model` を実行したあと、`~/.hermes/config.yaml` は次のような内容になります。

```yaml
model:
  default: gemini-3.7-flash
  provider: gemini
  base_url: https://generativelanguage.googleapis.com/v1beta
```

そして `~/.hermes/.env` はこうなります。

```bash
GOOGLE_API_KEY=...
```

### Gemini ネイティブ API {#native-gemini-api}

おすすめのエンドポイントはこちらです。

```text
https://generativelanguage.googleapis.com/v1beta
```

Hermes はこのエンドポイントを検出すると、ネイティブの Gemini アダプタを作ります。内部ではエージェントのやり取りを OpenAI 形式のメッセージのまま保持し、リクエストごとに Gemini ネイティブのスキーマへ変換します。

- `messages[]` → Gemini の `contents[]`
- システムプロンプト → Gemini の `systemInstruction`
- ツールのスキーマ → Gemini の `functionDeclarations`
- ツールの実行結果 → Gemini の `functionResponse` パート
- ストリーミング応答 → Hermes のやり取り用に OpenAI 形式のストリームチャンクへ

:::note Gemini 3 の thought signature
Gemini 3 でツールを使うとき、Hermes は関数呼び出しのパートに付く `thoughtSignature` の値を保持し、次のツール往復で送り直します。これにより、複数手順にわたるエージェントの流れで検証上どうしても必要になる経路をカバーします。

Gemini 3 は、ツール呼び出し以外の応答パートにも thought signature を付けることがあります。Hermes のネイティブアダプタは現時点ではエージェントのツール往復に最適化してあるため、ツール呼び出し以外の signature をパート単位で完全に再現して送り直すところまでは対応していません。
:::

### ネイティブのエンドポイントを使う {#prefer-the-native-endpoint}

Google は OpenAI 互換のエンドポイントも公開しています。

```text
https://generativelanguage.googleapis.com/v1beta/openai/
```

Hermes のエージェントセッションでは、上に挙げた Gemini ネイティブのエンドポイントを選んでください。Hermes にはネイティブの Gemini アダプタが入っているので、複数往復のツール利用、ツールの実行結果、ストリーミング、画像などを含む入力、Gemini の応答メタデータを、そのまま Gemini の `generateContent` API に対応づけられます。OpenAI 互換のエンドポイントは、どうしても OpenAI API との互換性が必要なときには役に立ちます。

以前に `GEMINI_BASE_URL` を `/openai` の URL に設定していた場合は、削除するか次のように書き換えます。

```bash
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
```

## 使えるモデル {#available-models}

`hermes model` の選択画面には、Hermes のプロバイダ登録簿で管理している Gemini モデルが並びます。よく選ばれるのは次のものです。

| モデル | ID | 補足 |
|-------|----|-------|
| Gemini 3.8 Flash | `gemini-3.8-flash` | 長い工程のエージェント作業やコーディングに強い、いちばん高性能な Flash |
| Gemini 3.7 Flash | `gemini-3.7-flash` | 速度・性能・画像などの理解のバランスが良い、おすすめの既定値 |
| Gemini 3.1 Pro Preview | `gemini-3.1-pro-preview` | 推論・数学・コーディングでいちばん高性能なモデル |
| Gemini 3.5 Flash Lite | `gemini-3.5-flash-lite` | 軽い作業向けの、いちばん速く安い選択肢 |
| Gemini 2.5 Flash | `gemini-2.5-flash` | 思考機能を持つ前世代の高速モデル |
| Gemini 2.5 Pro | `gemini-2.5-pro` | 込み入った推論向けの前世代モデル |

使えるモデルは時期によって変わります。モデルが消えていたり、手元のキーで有効になっていなかったりしたら、もう一度 `hermes model` を実行して、その時点の一覧から選び直してください。

:::info モデル ID
`provider: gemini` のときは、`google/gemini-3.7-flash` のような OpenRouter 形式の ID ではなく、`gemini-3.7-flash` のような Gemini ネイティブのモデル ID を使ってください。
:::

### latest のエイリアス {#latest-aliases}

Google は Gemini の Pro 系と Flash 系について、追従して動くエイリアスを公開しています。`gemini-pro-latest` と `gemini-flash-latest` は、Hermes の設定を書き換えずに Google 側でモデルを新しくしてほしいときに便利です。ただし、新しいモデルの料金が変わると、支払う金額にも影響することがあります。

| エイリアス | 現在指しているもの | 補足 |
|-------|------------------|-------|
| `gemini-pro-latest` | 最新の Gemini Pro モデル | Google が現時点で標準としている Pro を使いたいときに |
| `gemini-flash-latest` | 最新の Gemini Flash モデル | Google が現時点で標準としている Flash を使いたいときに |

```yaml
model:
  default: gemini-pro-latest
  provider: gemini
  base_url: https://generativelanguage.googleapis.com/v1beta
```

毎回きっちり同じ結果を再現したいなら、`gemini-3.1-pro-preview` や `gemini-3.7-flash` のように明示的なモデル ID を選んでください。

### Gemini API 経由の Gemma {#gemma-via-the-gemini-api}

Google は Gemma のモデルも Gemini API から公開しています。Hermes はこれらを Google のモデルとして認識しますが、処理量がとても小さい Gemma は既定の選択画面から隠しています。長く動かすエージェントのセッションに、評価用のモデルをうっかり選んでしまわないようにするためです。

評価に使いやすい ID には次のものがあります。

| モデル | ID | 補足 |
|-------|----|-------|
| Gemma 4 31B IT | `gemma-4-31b-it` | 大きめの Gemma。互換性や品質を確かめるのに向く |
| Gemma 4 26B A4B IT | `gemma-4-26b-a4b-it` | 使えるときは、動作パラメータの少ない小さめの派生版 |

これらは Gemini API のキーで試せる評価用の選択肢と考えるのが良いでしょう。Google の Gemma API は無料枠だけの提供で、上限も本番向けの Gemini モデルに比べて低いため、Hermes のエージェントを継続的に動かすなら、有料の Gemini モデル、自前で立てた環境、あるいは十分な割り当てのある別のプロバイダへ移るのが普通です。

選択画面に出てこない Gemma を使いたいときは、直接指定します。

```yaml
model:
  default: gemma-4-31b-it
  provider: gemini
  base_url: https://generativelanguage.googleapis.com/v1beta
```

## 会話の途中でモデルを切り替える {#switching-models-mid-session}

会話の最中に `/model` コマンドを使います。

```text
/model gemini-3.7-flash
/model gemini-flash-latest
/model gemini-3.1-pro-preview
/model gemini-pro-latest
/model gemma-4-31b-it
/model gemini-3.1-flash-lite-preview
```

Gemini をまだ設定していない場合は、いったんセッションを抜けて先に `hermes model` を実行してください。`/model` は設定済みのプロバイダとモデルのあいだで切り替えるだけで、新しい API キーを聞いてはくれません。

## 診断 {#diagnostics}

```bash
hermes doctor
```

doctor は次を確認します。

- `GOOGLE_API_KEY` または `GEMINI_API_KEY` が使える状態か
- 設定したプロバイダの認証情報を解決できるか

## ゲートウェイ（メッセージのやり取り） {#gateway-messaging-platforms}

Gemini は Hermes のゲートウェイが対応するすべてのサービス（Telegram、Discord、Slack、WhatsApp、LINE、Feishu など）で動きます。プロバイダとして Gemini を設定したら、あとはいつもどおりゲートウェイを起動します。

```bash
hermes gateway setup
hermes gateway start
```

ゲートウェイは `config.yaml` を読み、同じ Gemini の設定をそのまま使います。

## うまくいかないとき {#troubleshooting}

### 「Gemini native client requires an API key」と出る {#gemini-native-client-requires-an-api-key}

Hermes が使える API キーを見つけられませんでした。次のどちらかを `~/.hermes/.env` に追加してください。

```bash
GOOGLE_API_KEY=...
# or
GEMINI_API_KEY=...
```

そのあと、もう一度 `hermes model` を実行します。

### 「This Google API key is on the free tier」と出る {#this-google-api-key-is-on-the-free-tier}

Hermes は設定のときに Gemini の API キーを調べます。ツールの利用、やり直し、履歴の圧縮、補助的な処理などで何度もモデルを呼ぶことがあるため、無料枠の割り当てはエージェントの数往復で尽きてしまうことがあります。

キーがひもづいている Google Cloud プロジェクトで課金を有効にし、必要ならキーを作り直してから、次を実行します。

```bash
hermes model
```

### 「404 model not found」と出る {#404-model-not-found}

選んだモデルが、そのアカウント、地域、キーでは使えません。もう一度 `hermes model` を実行し、その時点の一覧から別の Gemini モデルを選んでください。

### `hermes model` に Gemma のモデルが出てこない {#gemma-model-is-not-shown-in-hermes-model}

Hermes は処理量の小さい Gemma を既定で選択画面から隠していることがあります。あえて試したい場合は、`~/.hermes/config.yaml` にモデル ID を直接書いてください。

### Gemma で「429 quota exceeded」と出る {#429-quota-exceeded-on-gemma}

Gemini API から使える Gemma は評価には便利ですが、Gemini API の無料枠の上限は低めです。互換性の確認までにとどめ、続けてエージェントを動かすなら有料の Gemini モデルか別のプロバイダに切り替えてください。

### OpenAI 互換のエンドポイントが設定されている {#openai-compatible-endpoint-is-configured}

`~/.hermes/.env` に次の行がないか確認します。

```bash
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
```

ネイティブのエンドポイントに書き換えるか、この上書き自体を消します。

```bash
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
```

### ツール呼び出しがスキーマのエラーで失敗する {#tool-calling-fails-with-schema-errors}

Hermes を新しくしてから `hermes model` を実行し直してください。ネイティブの Gemini アダプタは、Gemini の厳しめな関数宣言の形式に合わせてツールのスキーマを整えます。古いビルドや独自のエンドポイントでは、これが行われないことがあります。

## 関連 {#related}

- [AI プロバイダ](/hermes/docs/integrations/providers/)
- [設定](/hermes/docs/user-guide/configuration/)
- [予備のプロバイダ](/hermes/docs/user-guide/features/fallback-providers/)
- [AWS Bedrock](/hermes/docs/guides/aws-bedrock/) — AWS の認証情報を使ったクラウド側のネイティブ連携
