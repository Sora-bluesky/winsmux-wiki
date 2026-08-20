---
title: "Nous Portal で Hermes Agent を動かす"
description: "契約から設定、モデルの切り替え、ゲートウェイのツール有効化、経路の確認まで一通りの手順"
upstream_path: guides/run-hermes-with-nous-portal.md
upstream_blob: e4928ef6df3a612a04c8133b34bb01ba96d0cc4b
sources:
  - https://hermes-agent.nousresearch.com/docs/guides/run-hermes-with-nous-portal
---

# Nous Portal で Hermes Agent を動かす {#run-hermes-agent-with-nous-portal}

このページでは、[Nous Portal](https://portal.nousresearch.com) の契約で Hermes Agent を動かす手順を、申し込みからすべてのツールが正しい経路を通っていることの確認まで、順を追って説明します。Portal がそもそも何なのか、契約に何が含まれるのかという概要を知りたい場合は、[Nous Portal 連携のページ](/hermes/docs/integrations/nous-portal/) を見てください。こちらは実際に手を動かすための台本です。

## 前提 {#prerequisites}

- Hermes Agent がインストール済みであること（[クイックスタート](/hermes/docs/getting-started/quickstart/)）
- 設定する端末で使えるウェブブラウザー（または SSH のポート転送。[SSH 越しの OAuth](/hermes/docs/guides/oauth-over-ssh/) を参照）
- 5 分ほどの時間

必要 **ない** ものもあります。OpenAI のキー、Anthropic のキー、Firecrawl のアカウント、FAL のアカウント、Browser Use のアカウント、その他ベンダーごとの認証情報はどれもいりません。それこそがこの仕組みの狙いです。

## 1. 契約する {#1-get-a-subscription}

[portal.nousresearch.com/manage-subscription](https://portal.nousresearch.com/manage-subscription) を開いて登録し、プランを選びます。

すでに契約済みなら、手順 2 へ進んでください。

## 2. 一発で終わるセットアップを実行する {#2-run-the-one-shot-setup}

```bash
hermes setup --portal
```

このコマンド 1 つで、次の 5 つが行われます。

1. ブラウザーで portal.nousresearch.com を開き、OAuth でログインする
2. 更新用トークンを `~/.hermes/auth.json` に保存する
3. `~/.hermes/config.yaml` に `model.provider: nous` を設定する
4. 既定のエージェント向けモデルを選ぶ（`anthropic/claude-sonnet-4.6` など）
5. ウェブ検索、画像生成、音声合成、ブラウザー操作のために Tool Gateway を有効にする

終わるとターミナルに戻り、そのまま会話を始められます。

### サーバーに SSH でつないでいる場合は？ {#what-if-im-sshd-into-a-server}

OAuth にはブラウザーが必要ですが、折り返しを受け取るループバックの口は Hermes が動いている側の端末で開きます。方法は 2 つあります。

```bash
# Option A: SSH port forwarding (preferred)
ssh -N -L 8642:127.0.0.1:8642 user@remote-host    # in a local terminal
hermes setup --portal                              # on the remote, open the printed URL in your local browser

# Option B: device-code login (works from Cloud Shell, Codespaces, EC2 Instance Connect)
hermes auth add nous --type oauth
# Then re-run `hermes setup --portal` to wire the provider + gateway
```

ProxyJump の多段接続、mosh / tmux、ControlMaster の落とし穴まで含めた詳しい手順は [SSH 越し・リモートホストでの OAuth](/hermes/docs/guides/oauth-over-ssh/) にあります。

## 3. うまくいったか確かめる {#3-verify-it-worked}

```bash
hermes portal info
```

こう表示されるはずです。

```
  Nous Portal
  ───────────
  Auth:    ✓ logged in
  Portal:  https://portal.nousresearch.com
  Model:   ✓ using Nous as inference provider

  Tool Gateway
  ────────────
  Web search & extract  via Nous Portal
  Image generation      via Nous Portal
  Text-to-speech        via Nous Portal
  Browser automation    via Nous Portal
```

どこかの行が「via Nous Portal」以外になっていたり、認証の行が「not logged in」になっていたりする場合は、下の [困ったときは](#troubleshooting) へ飛んでください。

## 4. 最初の会話をしてみる {#4-run-your-first-conversation}

```bash
hermes chat
```

モデルと Tool Gateway の両方を使う内容を投げてみましょう。

```
Hey, search the web for "Hermes Agent release notes" and summarize the top 3 hits.
```

Hermes が（ゲートウェイ経由で Firecrawl を使う）`web_search` を呼び出し、要約を返すはずです。検索が走って、返ってきた内容に筋が通っていれば完了です。Portal が端から端までつながっています。

## 5. 本当に使いたいモデルを選ぶ {#5-pick-the-model-you-actually-want}

`hermes setup --portal` の途中でもモデルを選べますが、この契約の値打ちはカタログ全体を使えることにあります。セッションの途中でも `/model` でいつでも切り替えられます。

```bash
/model anthropic/claude-sonnet-4.6     # best general-purpose agentic
/model openai/gpt-5.4                  # strong reasoning + tool calling
/model google/gemini-2.5-pro           # huge context window
/model deepseek/deepseek-v3.2          # cost-effective coder
/model anthropic/claude-opus-4.6       # heavyweight for hard problems
```

選択画面を開いて眺めたい場合はこうします。

```bash
/model
```

既定のモデルそのものを変えたい場合はこうします。

```bash
# in your terminal, outside any session
hermes config set model.default anthropic/claude-sonnet-4.6
```

### エージェントの仕事に Hermes-4 は選ばないこと {#dont-pick-hermes-4-for-agent-work}

Hermes-4-70B と Hermes-4-405B は Portal で大幅に安く使えますが、これらは **会話・推論向けのモデル** であって、ツール呼び出しに合わせて調整されたものではありません。何段階も続くエージェントの処理では苦戦します。会話や調査の用途では、エージェント以外のツールから [契約プロキシ](/hermes/docs/user-guide/features/subscription-proxy/) を通して使ってください。Hermes Agent 自体には、上に挙げた最前線のエージェント向けモデルを使いましょう。

Portal 自身の [案内ページ](https://portal.nousresearch.com/info) にも同じ注意が書かれています。Hermes 側の意見ではなく、Nous の公式な案内です。

## 6.（任意）Tool Gateway の経路を調整する {#6-optional-customize-tool-gateway-routing}

ゲートウェイは全部まとめて有効・無効ではなく、ツールごとに選べます。すでに Browserbase のアカウントがあってそちらを使い続けたい、でもウェブ検索と画像生成は Nous を通したい、という使い方もできます。

```bash
hermes tools
# → Web search       → "Nous Subscription"     (recommended)
# → Image generation → "Nous Subscription"     (recommended)
# → Browser          → "Browserbase"           (your existing key)
# → TTS              → "Nous Subscription"     (recommended)
```

これらの行は、Nous Portal にログインする前から `hermes tools` に出てきます。ログインしていない状態で「Nous Subscription」を選んだ場合は、Hermes がその場で Portal のログインを走らせます（推論のプロバイダーや他のツールの設定はそのままです）。

組み合わせを確認するには次を実行します。

```bash
hermes portal tools
```

ツールごとの経路が表示されます。契約を通しているものは `via Nous Portal`、自前のキーを使っているものは提携先の名前（`browserbase`、`firecrawl` など）になります。

## 7.（任意）音声モードを有効にする {#7-optional-enable-voice-mode}

Tool Gateway には OpenAI の音声合成が含まれているので、[音声モード](/hermes/docs/user-guide/features/voice-mode/) を OpenAI のキーなしで使えます。

```bash
hermes setup tts
# → pick "Nous Subscription" for TTS
# → pick a speech-to-text backend (local faster-whisper is free, no setup)
```

あとはメッセージングのセッション（Telegram、Discord、Signal など）で音声メッセージを送れば、Hermes がそれを書き起こし、答えを返し、合成した音声で返事をします。すべて Portal の契約の中で動きます。

## 8.（任意）定期実行と常時稼働の使い方 {#8-optional-cron-always-on-workflows}

Portal の契約は、[定期実行のジョブ](/hermes/docs/user-guide/features/cron/) や [まとめて処理する使い方](/hermes/docs/user-guide/features/batch-processing/) でも、対話的な会話とまったく同じように使えます。OAuth の更新用トークンが自動的に再利用されるためです。追加の設定はいりません。ジョブを登録すれば、その分は契約に対して計上されます。

```bash
hermes cron create "0 9 * * *" \
  "Search the web for top AI news and summarize the 5 most important stories" \
  --name "Daily AI news"
```

このジョブは人が見ていなくても走り、モデルの呼び出しもウェブ検索も要約も、すべて Portal の契約を通して行われます。

## プロフィールと複数人での利用 {#profiles-and-multi-user-setups}

[Hermes のプロフィール](/hermes/docs/user-guide/profiles/) を使っている場合（プロジェクトごとに設定を分けているときなど）、Portal の更新用トークンは共有のトークン置き場を通じて、すべてのプロフィールで自動的に共有されます。どれか 1 つのプロフィールで一度サインインすれば、残りは自動で引き継ぎます。

複数の人が 1 台の端末を共有するチームでは、各自が自分の Portal アカウントを持ち、各自のホームディレクトリにそれぞれの `~/.hermes/auth.json` があるので、利用者をまたいでトークンが共有されることはありません。これが正しい線の引き方です。

## 困ったときは {#troubleshooting}

### `hermes setup --portal` のあとで `hermes portal info` が「not logged in」と出る {#hermes-portal-info-shows-not-logged-in-after-hermes-setup---portal}

OAuth の手続きが最後まで終わっていません。やり直します。

```bash
hermes portal
```

ブラウザーが開かない、または折り返しが失敗する場合は、リモートや画面のない端末で作業している可能性が高いです。ポート転送での回避方法は [SSH 越しの OAuth](/hermes/docs/guides/oauth-over-ssh/) にあります。

### 「using Nous as inference provider」ではなく「Model: currently openrouter」（あるいは別のプロバイダー）と出る {#model-currently-openrouter-or-some-other-provider-instead-of-using-nous-as-inference-provider}

手元の設定がずれています。OAuth 自体は成功したものの、`model.provider` が別のプロバイダーを指したままです。こう直します。

```bash
hermes config set model.provider nous
```

対話形式で直すならこうです。

```bash
hermes model
# pick Nous Portal
```

`hermes portal info` でもう一度確認してください。

### Tool Gateway のツールが「via Nous Portal」ではなく提携先の名前になっている {#tool-gateway-tools-showing-partner-names-instead-of-via-nous-portal}

ツールごとの設定がゲートウェイより優先されています。次を実行します。

```bash
hermes tools
# pick "Nous Subscription" for any tool you want gateway-routed
```

ウェブは Nous に通しつつ、ブラウザーだけは自前の Browserbase のキーを使う、というように意図的に混ぜている人もいます。そのつもりならそのままで構いません。そうでなければ、このコマンドで直せます。

### セッションの途中で「Re-authentication required」と出る {#re-authentication-required-mid-session}

Portal の更新用トークンが無効になっています（パスワードの変更、手動での取り消し、期限切れなど）。Hermes がそのトークンを延々と送り続けないよう、手元では隔離された状態になっています。もう一度ログインするだけで直ります。

```bash
hermes auth add nous
```

ログインし直せば、隔離は自動的に解除されます。

### 使いたいモデルが `/model` の選択画面に出てこない {#model-i-want-isnt-in-the-model-picker}

Portal のカタログは OpenRouter のモデル一覧（300 以上）に、独自のプロバイダーや二次的なプロバイダーが提供するモデルを加えたものです。目当てのモデルが見当たらない場合は、OpenRouter 形式の識別子を直接打ち込んでみてください。

```bash
/model anthropic/claude-opus-4.6
/model openai/o1-2025-12-17
```

本当に提供されていない場合は、[issue を立ててください](https://github.com/NousResearch/hermes-agent/issues)。抜けのほとんどは、こちらで直せる経路の設定です。

### Portal のアカウントに利用分が計上されない {#billing-not-appearing-on-my-portal-account}

`hermes portal info` を見れば、本当に Portal を通っているのか、別のプロバイダーを通っているのかが分かります。よくある原因はこれらです。

- `model.provider` が `nous` ではなく `openrouter` や `anthropic` などになっている
- OAuth の更新に失敗して、別の設定済みプロバイダーに落ちている
- Hermes のプロフィールが複数あって、違うほうを使っている（`hermes profile list` で確認してください）

### 取り消してまっさらから始めたい {#want-to-revoke-and-start-clean}

```bash
hermes auth logout nous       # wipes the local refresh token
# Then re-run setup or remove the subscription from the Portal web UI
```

## 具体的な数字で見ると {#what-this-gets-you-in-plain-numbers}

| Portal を使わない場合 | Portal を使う場合 |
|----------------|-------------|
| `.env` に OpenRouter / Anthropic / OpenAI のキーを 1 本 | OAuth の更新用トークンを 1 つ。`.env` にキーは不要 |
| ウェブ用に Firecrawl のキーを 1 本 | ウェブはゲートウェイ経由 |
| 画像生成用に FAL のキーを 1 本 | 画像生成はゲートウェイ経由 |
| ブラウザー用に Browser Use / Browserbase のキーを 1 本 | ブラウザーはゲートウェイ経由 |
| 音声合成・音声モード用に OpenAI のキーを 1 本 | 音声合成はゲートウェイ経由 |
| 5 つの管理画面、5 回の入金、5 通の請求書 | 契約 1 つ、請求書 1 通 |
| 端末を増やすたびに 5 本のキーを複製 | 端末を増やしたら OAuth をもう一度するだけ |

これが取り引きの中身です。ここに挙げた基盤を 2 つ以上使っているなら、契約したほうが元は取れます。

## 関連ページ {#see-also}

- **[Nous Portal 連携のページ](/hermes/docs/integrations/nous-portal/)** — 契約に何が含まれるかの概要
- **[Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/)** — ゲートウェイを通るツールすべての詳細
- **[契約プロキシ](/hermes/docs/user-guide/features/subscription-proxy/)** — Portal の契約を Hermes 以外のツールから使う
- **[音声モード](/hermes/docs/user-guide/features/voice-mode/)** — Portal の契約で音声の会話を設定する
- **[SSH 越しの OAuth](/hermes/docs/guides/oauth-over-ssh/)** — リモートや画面のない環境でのログイン方法
- **[プロフィール](/hermes/docs/user-guide/profiles/)** — 1 つの Portal ログインを複数の Hermes 設定で共有する
