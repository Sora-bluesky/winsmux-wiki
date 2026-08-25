---
title: "Google Gemini"
description: "Hermes Agent を Google Gemini で使う — ネイティブの AI Studio API、API キーの設定、ツール呼び出し、ストリーミング、利用枠の考え方"
upstream_path: guides/google-gemini.md
upstream_blob: c5d57fe40df15b43885d42b778c470117515804e
sources:
  - https://hermes-agent.nousresearch.com/docs/guides/google-gemini
---

# Google Gemini {#google-gemini}

Hermes Agent は Google Gemini を、**Google AI Studio / Gemini API** を使ったネイティブのプロバイダとして扱います。OpenAI 互換のエンドポイントではありません。これによって Hermes は、内部で使っている OpenAI 形式のメッセージとツールのやり取りを Gemini 本来の `generateContent` API へ変換しつつ、ツール呼び出し、ストリーミング、画像などの入力、Gemini 独自の応答情報をそのまま活かせます。

## 事前に必要なもの {#prerequisites}

- **Google AI Studio の API キー** — [aistudio.google.com/apikey](https://aistudio.google.com/apikey) で作成します
- **課金を有効にした Google Cloud プロジェクト** — エージェント用途ではこちらをおすすめします。Hermes は利用者の 1 回の発言に対してモデルを何度も呼ぶことがあるため、Gemini の無料枠では長く続くセッションには足りません。
- **Hermes の導入** — ネイティブの Gemini プロバイダに、追加の Python パッケージは要りません。

:::tip API キーの置き場所
`GOOGLE_API_KEY` か `GEMINI_API_KEY` を設定してください。`gemini` プロバイダでは、Hermes はどちらの名前も見にいきます。
:::

## すぐ試す {#quick-start}

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

設定ファイルを直接書くほうがよければ、ネイティブの Gemini API のベース URL を指定します。

```yaml
model:
  default: gemini-3.7-flash
  provider: gemini
  base_url: https://generativelanguage.googleapis.com/v1beta
```

## 設定 {#configuration}

`hermes model` を実行したあと、`~/.hermes/config.yaml` は次のようになります。

```yaml
model:
  default: gemini-3.7-flash
  provider: gemini
  base_url: https://generativelanguage.googleapis.com/v1beta
```

そして `~/.hermes/.env` には次が入ります。

```bash
GOOGLE_API_KEY=...
```

### ネイティブの Gemini API {#native-gemini-api}

おすすめのエンドポイントはこちらです。

```text
https://generativelanguage.googleapis.com/v1beta
```

Hermes はこのエンドポイントを見分けて、ネイティブの Gemini アダプタを用意します。内部ではエージェントのやり取りを OpenAI 形式のメッセージのまま保ちつつ、リクエストのたびに Gemini 本来の形へ変換します。

- `messages[]` → Gemini の `contents[]`
- システムプロンプト → Gemini の `systemInstruction`
- ツールの定義 → Gemini の `functionDeclarations`
- ツールの実行結果 → Gemini の `functionResponse` パート
- ストリーミングの応答 → Hermes の処理用に OpenAI 形式のチャンクへ

:::note Gemini 3 の思考署名
Gemini 3 でツールを使う場合、Hermes は function-call のパートに付いてくる `thoughtSignature` の値を保持し、次のツールのターンで送り返します。これにより、複数の手順を踏むエージェントの動作で検証上どうしても必要になる経路は押さえられています。

Gemini 3 は、ツール呼び出し以外の応答パートにも思考署名を付けることがあります。Hermes のネイティブアダプタは今のところエージェントのツール呼び出しに最適化されているため、ツール呼び出し以外の署名までパート単位で完全に送り返すわけではありません。
:::

### ネイティブのエンドポイントを選ぶ {#prefer-the-native-endpoint}

Google は OpenAI 互換のエンドポイントも公開しています。

```text
https://generativelanguage.googleapis.com/v1beta/openai/
```

Hermes のエージェントとして使うなら、上のネイティブの Gemini エンドポイントを選んでください。Hermes にはネイティブの Gemini アダプタが入っていて、複数ターンにわたるツールの利用、ツールの実行結果、ストリーミング、画像などの入力、Gemini の応答情報を、Gemini の `generateContent` API へ直接対応づけられます。OpenAI 互換のエンドポイントが役に立つのは、OpenAI の API との互換性そのものが必要な場面です。

以前に `GEMINI_BASE_URL` を `/openai` の URL にしていた場合は、削除するか書き換えてください。

```bash
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
```

## 使えるモデル {#available-models}

`hermes model` の選択画面には、Hermes のプロバイダ登録簿にある Gemini のモデルが並びます。よく使われるのは次のあたりです。

| モデル | ID | 補足 |
|-------|----|-------|
| Gemini 3.7 Flash | `gemini-3.7-flash` | 速さ、性能、画像などの理解のバランスが良く、既定としておすすめ |
| Gemini 3.1 Pro Preview | `gemini-3.1-pro-preview` | 推論、数学、コーディングがもっとも得意 |
| Gemini 3.5 Flash Lite | `gemini-3.5-flash-lite` | 軽い作業向けに、もっとも速く、もっとも安い |
| Gemini 2.5 Flash | `gemini-2.5-flash` | 前の世代の高速モデル。思考する機能あり |
| Gemini 2.5 Pro | `gemini-2.5-pro` | 前の世代の、複雑な推論向けモデル |

どのモデルが使えるかは時期によって変わります。モデルが見当たらない、あるいは手元のキーで有効になっていない場合は、`hermes model` をもう一度実行して、そのときの一覧から選んでください。

:::info モデル ID について
`provider: gemini` のときは、`google/gemini-3.7-flash` のような OpenRouter 式の ID ではなく、`gemini-3.7-flash` のような Gemini 本来の ID を使ってください。
:::

### latest 系の別名 {#latest-aliases}

Google は Gemini の Pro 系と Flash 系に、指す先が移り変わる別名を用意しています。`gemini-pro-latest` と `gemini-flash-latest` は、Hermes の設定を書き換えずに Google 側でモデルを新しくしてほしいときに便利です。ただし、新しいモデルの料金が違えば、支払う金額も変わる点には注意してください。

| 別名 | 現在指しているもの | 補足 |
|-------|------------------|-------|
| `gemini-pro-latest` | 最新の Gemini Pro モデル | Google が今すすめている Pro を使いたいときに |
| `gemini-flash-latest` | 最新の Gemini Flash モデル | Google が今すすめている Flash を使いたいときに |

```yaml
model:
  default: gemini-pro-latest
  provider: gemini
  base_url: https://generativelanguage.googleapis.com/v1beta
```

毎回きっちり同じ結果を求めるなら、`gemini-3.1-pro-preview` や `gemini-3.7-flash` のように、モデル ID を明示するほうが向いています。

### Gemini API 経由の Gemma {#gemma-via-the-gemini-api}

Google は Gemma のモデルも Gemini API から公開しています。Hermes はこれらを Google のモデルとして認識しますが、処理量がごく限られる Gemma の項目は既定の選択画面から隠します。使い始めたばかりの人が、長く続くエージェントのセッションに評価用のモデルをうっかり選んでしまわないようにするためです。

評価に使える ID には次のようなものがあります。

| モデル | ID | 補足 |
|-------|----|-------|
| Gemma 4 31B IT | `gemma-4-31b-it` | 大きめの Gemma。互換性や品質の評価に向く |
| Gemma 4 26B A4B IT | `gemma-4-26b-a4b-it` | 有効パラメータの少ない小型版。使える場合に |

これらは、Gemini API のキーで試せる評価用の選択肢と考えるのがよいでしょう。Google の Gemma API の料金は無料枠だけで、使用量の上限も実運用向けの Gemini モデルに比べて低めです。エージェントとして継続的に使うなら、有料の Gemini モデル、自前で立てた環境、あるいは十分な枠のある別のプロバイダへ移るのが普通です。

選択画面に出てこない Gemma を使いたいときは、直接指定します。

```yaml
model:
  default: gemma-4-31b-it
  provider: gemini
  base_url: https://generativelanguage.googleapis.com/v1beta
```

## 会話の途中でモデルを切り替える {#switching-models-mid-session}

会話中に `/model` コマンドを使います。

```text
/model gemini-3.7-flash
/model gemini-flash-latest
/model gemini-3.1-pro-preview
/model gemini-pro-latest
/model gemma-4-31b-it
/model gemini-3.1-flash-lite-preview
```

まだ Gemini を設定していない場合は、いったんセッションを終了して `hermes model` を先に実行してください。`/model` は設定済みのプロバイダとモデルの間で切り替えるだけで、新しい API キーを受け取ることはありません。

## 状態を調べる {#diagnostics}

```bash
hermes doctor
```

このコマンドが確認するのは次の点です。

- `GOOGLE_API_KEY` または `GEMINI_API_KEY` が使える状態にあるか
- 設定したプロバイダの認証情報を解決できるか

## ゲートウェイ（メッセージングのサービス） {#gateway-messaging-platforms}

Gemini は Hermes のゲートウェイが対応するすべてのサービス（Telegram、Discord、Slack、WhatsApp、LINE、Feishu など）で使えます。Gemini をプロバイダとして設定したら、あとは普段どおりゲートウェイを起動します。

```bash
hermes gateway setup
hermes gateway start
```

ゲートウェイは `config.yaml` を読み、同じ Gemini の設定をそのまま使います。

## 困ったときは {#troubleshooting}

### 「Gemini native client requires an API key」と出る {#gemini-native-client-requires-an-api-key}

Hermes が使える API キーを見つけられませんでした。次のどちらかを `~/.hermes/.env` に追加してください。

```bash
GOOGLE_API_KEY=...
# or
GEMINI_API_KEY=...
```

そのうえで `hermes model` をもう一度実行します。

### 「This Google API key is on the free tier」と出る {#this-google-api-key-is-on-the-free-tier}

Hermes は初期設定のときに Gemini の API キーを調べます。ツールの利用、やり直し、圧縮、補助的な処理でモデルを何度も呼ぶことがあるため、無料枠だと数ターンで使い切ってしまうことがあります。

キーに紐づく Google Cloud プロジェクトで課金を有効にし、必要ならキーを作り直してから、次を実行してください。

```bash
hermes model
```

### 「404 model not found」と出る {#404-model-not-found}

選んだモデルが、そのアカウント、地域、またはキーでは使えません。`hermes model` をもう一度実行して、そのときの一覧から別の Gemini モデルを選んでください。

### `hermes model` に Gemma のモデルが出てこない {#gemma-model-is-not-shown-in-hermes-model}

Hermes は、処理量の少ない Gemma のモデルを既定で選択画面から隠すことがあります。あえて評価したい場合は、`~/.hermes/config.yaml` にモデル ID を直接書いてください。

### Gemma で「429 quota exceeded」と出る {#429-quota-exceeded-on-gemma}

Gemini API から使える Gemma のモデルは評価には便利ですが、Gemini API の無料枠の上限は低めです。互換性の確認に使ったら、継続的に動かすときは有料の Gemini モデルか別のプロバイダに切り替えてください。

### OpenAI 互換のエンドポイントが設定されている {#openai-compatible-endpoint-is-configured}

`~/.hermes/.env` に次の行がないか確認してください。

```bash
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
```

ネイティブのエンドポイントに書き換えるか、この上書き設定を削除します。

```bash
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
```

### ツール呼び出しがスキーマのエラーで失敗する {#tool-calling-fails-with-schema-errors}

Hermes を新しくして、`hermes model` をやり直してください。ネイティブの Gemini アダプタは、Gemini の厳しめな関数定義の形式に合わせてツールのスキーマを整えます。古い版や独自のエンドポイントでは、この処理が入っていないことがあります。

## 関連ページ {#related}

- [AI プロバイダ](/hermes/docs/integrations/providers/)
- [設定](/hermes/docs/user-guide/configuration/)
- [予備のプロバイダ](/hermes/docs/user-guide/features/fallback-providers/)
- [AWS Bedrock](/hermes/docs/guides/aws-bedrock/) — AWS の認証情報を使う、クラウド事業者ネイティブの連携
