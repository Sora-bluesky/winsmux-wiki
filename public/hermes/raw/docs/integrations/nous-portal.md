---
title: "Nous Portal"
description: "1 つの定額契約で 300 以上のフロンティアモデルと Tool Gateway が使える、Hermes Agent の推奨構成"
upstream_path: integrations/nous-portal.md
upstream_blob: b574213352c020c52a86212a9b52942d16f8ecf1
sources:
  - https://hermes-agent.nousresearch.com/docs/integrations/nous-portal
---

# Nous Portal {#nous-portal}

[Nous Portal](https://portal.nousresearch.com) は Nous Research が提供する定額の統合ゲートウェイで、**Hermes Agent を動かすうえで推奨される方法**です。OAuth で一度ログインするだけで済むので、モデル研究所・検索 API・画像生成・ブラウザ提供元ごとにアカウントと API キーと請求先を手作業でそろえる、あのやりくりから解放されます。

セットアップに割ける時間が 1 つ分しかないなら、これを選んでください。最短の手順はこうです。

```bash
hermes setup --portal
```

このコマンド 1 本で Portal の OAuth が走り、Nous のモデルを選び、`config.yaml` の推論プロバイダを Nous に設定し、Tool Gateway を有効にします。終わったらそのまま `hermes chat` を始められます。

まだ契約していない場合は [portal.nousresearch.com/manage-subscription](https://portal.nousresearch.com/manage-subscription) で申し込み、戻ってきて上のコマンドを実行してください。

## 契約に含まれるもの {#whats-in-the-subscription}

### 300 以上のフロンティアモデルを 1 つの請求で {#300-frontier-models-one-bill}

Portal はエコシステム全体から選ばれたエージェント向けモデルのカタログを中継します。研究所ごとに残高を持つのではなく、Nous の契約からまとめて請求されます。

| ファミリー | モデル |
|--------|--------|
| **Anthropic Claude** | Opus 4.7、Opus 4.6、Sonnet 4.6、Haiku 4.5 |
| **OpenAI** | GPT-5.5、GPT-5.5 Pro、GPT-5.4 Mini、GPT-5.4 Nano、GPT-5.3 Codex |
| **Google Gemini** | Gemini 3 Pro Preview、Gemini 3 Flash Preview、Gemini 3.1 Pro Preview、Gemini 3.1 Flash Lite Preview |
| **DeepSeek** | DeepSeek V4 Pro |
| **Qwen** | Qwen3.7-Max、Qwen3.6-35B-A3B |
| **Kimi / Moonshot** | Kimi K2.6 |
| **GLM / Zhipu** | GLM-5.1 |
| **MiniMax** | MiniMax M2.7 |
| **xAI** | Grok 4.3 |
| **NVIDIA** | Nemotron-3 Super 120B-A12B |
| **Tencent** | Hunyuan 3 Preview |
| **Xiaomi** | MiMo V2.5 Pro |
| **StepFun** | Step 3.5 Flash |
| **Hermes** | Hermes-4-70B、Hermes-4-405B（チャット向け。[下の注記](#a-note-on-hermes-4)を参照） |
| **+ その他すべて** | さらに 280 以上のモデル。エージェント向けフロンティアを丸ごと |

内部では、Portal がモデルごとに最適なバックエンドへ振り分けます。OpenRouter を通るモデルもあれば、独自の提供元や二次提供元を通るモデルもあり、あるモデルの経路は時期によって変わることがあります。どちらにしても請求は Nous の契約にまとまります。コードには Claude Sonnet 4.6、長い文脈には Gemini 3 Pro、といった切り替えもセッションの途中に `/model` で行えます。新しい認証情報も、追加のチャージも、残高ゼロで急に止まる事故もありません。

:::note
振り分けはモデル単位で、必ず OpenRouter を通るわけではありません。そのため OpenRouter 固有のリクエスト拡張（`provider` による経路指定、`session_id` による固定的な振り分け、トップレベルの `cache_control` など）は Portal の API 仕様には含まれず、そのモデルを実際に処理するバックエンド次第で無視されることがあります。
:::

### Nous Tool Gateway {#the-nous-tool-gateway}

同じ契約で [Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/) も使えるようになります。これは Hermes Agent のツール呼び出しを Nous が運用する基盤経由で流すしくみです。5 つのバックエンドが 1 回のログインでそろいます。

| ツール | 提携先 | できること |
|------|---------|--------------|
| **Web 検索と本文抽出** | Firecrawl | エージェント向けの検索とページ全文の抽出。Firecrawl の API キーも、レート制限の見張りも要りません。 |
| **画像生成** | FAL | 1 つのエンドポイントで 9 モデル。FLUX 2 Klein 9B、FLUX 2 Pro、Z-Image Turbo、Nano Banana Pro（Gemini 3 Pro Image）、GPT Image 1.5、GPT Image 2、Ideogram V3、Recraft V4 Pro、Qwen Image。 |
| **音声合成** | OpenAI TTS | OpenAI のキーを別に用意しなくても高品質な音声合成が使えます。各メッセージングサービスで[音声モード](/hermes/docs/user-guide/features/voice-mode/)が有効になります。 |
| **クラウドのブラウザ操作** | Browser Use | `browser_navigate`、`browser_click`、`browser_type`、`browser_vision` 用のヘッドレス Chromium セッション。Browserbase のアカウントは不要です。 |
| **クラウドの端末サンドボックス** | Modal | コード実行用のサーバーレス端末サンドボックス（任意の追加オプション）。 |

ゲートウェイを使わずに同じことをそろえるなら、Firecrawl のアカウント、FAL のアカウント、Browser Use のアカウント、OpenAI のキー、Modal のアカウントが必要です。登録が 5 回、管理画面が 5 つ、チャージの手続きが 5 通り。ゲートウェイなら、その全部が 1 つの契約を通ります。

ゲートウェイのツールを一部だけ有効にすることもできます（たとえば Web 検索は使うが画像生成は使わない、など）。下の[ゲートウェイと手持ちのバックエンドを混ぜる](#mixing-the-gateway-with-your-own-backends)を参照してください。

### 設定ファイルに認証情報を置かない {#no-credentials-in-your-dotfiles}

すべてが OAuth で認証された 1 つの Portal セッションを通るので、長期有効な API キーが十数個並んだ `.env` を抱え込まずに済みます。ディスク上に残る認証情報は `~/.hermes/auth.json` のリフレッシュトークンだけで、Hermes はそこからリクエストごとに短命な JWT を発行します。下の[トークンの扱い](#token-handling)を参照してください。

### どの OS でも同じ体験 {#cross-platform-parity}

[Windows ネイティブ版](/hermes/docs/user-guide/windows-native/)では、ツールごとに API キーをそろえる作業がいちばんの難所です。Firecrawl のアカウント、FAL のアカウント、Browser Use のアカウント、OpenAI のキーを Windows から用意するのは、使えるエージェントに仕上げるまでで最も手間のかかる部分でした。Portal を契約するとここが平らになります。1 回の OAuth でモデルもゲートウェイのツールも全部まかなえるので、Windows でも macOS / Linux と同じ体験になり、4 つのバックエンドを手で設定する必要はありません。

## Hermes 4 についての注記 {#a-note-on-hermes-4}

Nous Research 自身の **Hermes 4** ファミリー（Hermes-4-70B、Hermes-4-405B）も Portal 経由で大幅に割り引かれた料金で使えます。数学、科学、指示への追従、スキーマ遵守、ロールプレイ、長文執筆に強い、**推論とチャットを兼ねたフロンティアモデル**です。

ただし **Hermes Agent の中で使うことは推奨されていません**。Hermes 4 はチャットと推論に合わせて調整されたモデルで、エージェントが頼りにする高速なツール呼び出しのループ向けではないからです。調査の作業や、他のツールから[定額契約プロキシ](/hermes/docs/user-guide/features/subscription-proxy/)経由で使うぶんには向いています。エージェントの作業には、カタログからエージェント向けのフロンティアモデルを選んでください。

```bash
/model anthropic/claude-sonnet-4.6     # best general-purpose agentic model
/model openai/gpt-5.5-pro              # strong reasoning + tool calling
/model google/gemini-3-pro-preview     # huge context window
/model deepseek/deepseek-v4-pro        # cost-effective coder
```

Portal 自身の[モデル情報ページ](https://portal.nousresearch.com/info)にも同じ注意書きがあります。つまりこれは Hermes 側の意見ではなく、Nous Research の公式な案内です。

## セットアップ {#setup}

### 新規導入 — コマンド 1 本 {#fresh-install-one-command}

```bash
hermes setup --portal
```

これだけで一連の設定が終わります。

1. ブラウザで portal.nousresearch.com を開き、OAuth でログインします
2. リフレッシュトークンを `~/.hermes/auth.json` に保存します
3. 用意されたリストから Nous のモデルを選びます（そのままにしたい場合は飛ばせます）
4. `~/.hermes/config.yaml` の推論プロバイダを Nous に設定します（モデルを選んだ場合）
5. Tool Gateway（Web、画像、音声合成、ブラウザの振り分け）を有効にします
6. `hermes chat` をすぐ実行できる状態で端末に戻ります

まだ契約していない場合は、先に [portal.nousresearch.com/manage-subscription](https://portal.nousresearch.com/manage-subscription) で申し込んでください。

### 既存の環境 — 他のプロバイダと併用する {#existing-install-add-portal-alongside-other-providers}

すでに OpenRouter や Anthropic などのプロバイダで Hermes を設定していて、そこに Portal を足したい場合はこうします。

```bash
hermes model
# pick "Nous Portal" from the provider list
# browser opens, sign in, done
```

今までのプロバイダの設定はそのまま残ります。セッション中は `/model`、セッションの合間は `hermes model` で切り替えられます。Portal は使えるプロバイダの 1 つになるだけで、唯一の選択肢にはなりません。

### 画面のない環境・SSH・リモートでの設定 {#headless-ssh-remote-setup}

OAuth にはブラウザが要りますが、コールバックを受けるループバックの待ち受けは Hermes が動いている側の端末で開きます。リモートのホストについては [SSH 越しの OAuth / リモートホスト](/hermes/docs/guides/oauth-over-ssh/)を参照してください。他の OAuth 対応プロバイダと同じ手立て（`ssh -L` によるポート転送）がそのまま使えます。

### プロファイルでの設定 {#profile-setup}

[Hermes のプロファイル](/hermes/docs/user-guide/profiles/)を使っている場合、Portal のリフレッシュトークンは共有のトークン保管場所を通じて全プロファイルで自動的に共有されます。どれか 1 つのプロファイルでログインすれば残りも自動で引き継ぐので、プロファイルごとに OAuth をやり直す必要はありません。

## 日々の使い方 {#using-the-portal-day-to-day}

### 何がつながっているか確かめる {#inspecting-whats-wired-up}

```bash
hermes portal            # log in to Nous Portal + set it up (one-shot onboarding)
hermes portal info       # login status, subscription info, model + gateway routing
hermes portal status     # alias for `portal info`
hermes portal tools      # detailed Tool Gateway catalog with per-tool routing
hermes portal open       # open the subscription management page in your browser
```

サブコマンドなしの `hermes portal` は `hermes auth add nous --type oauth` を読みやすくした別名です。ログインし、Nous のモデルを選ばせ、推論プロバイダを Nous に設定し、Tool Gateway を使うかどうかを尋ねます（`hermes setup --portal` と同じ動きで、初回の簡易セットアップで通る Nous の流れとも同じです）。

`hermes portal info` は全体像を一目で見せてくれます。

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
  Cloud terminal        not configured
```

### モデルを切り替える {#switching-models}

セッションの中では次のように指定します。

```bash
/model anthropic/claude-sonnet-4.6
/model openai/gpt-5.5-pro
/model google/gemini-3-pro-preview
```

一覧から選ぶこともできます。

```bash
/model
# arrow keys, enter to select
```

セッションの外では、設定ウィザードを最初から通せます（新しいプロバイダを足すときに便利です）。

```bash
hermes model
```

### ゲートウェイと手持ちのバックエンドを混ぜる {#mixing-the-gateway-with-your-own-backends}

たとえばすでに Browserbase のアカウントがあり、それは使い続けたまま Web 検索と画像生成だけ Nous に流したい、という使い方もできます。`hermes tools` でツールごとにバックエンドを選んでください。

```bash
hermes tools
# → Web search       → "Nous Subscription"
# → Image generation → "Nous Subscription"
# → Browser          → "Browserbase"  (your existing key)
# → TTS              → "Nous Subscription"
```

Tool Gateway はツール単位で選ぶもので、全部か無かではありません。運用込みのバックエンドは Nous Portal にログインしていなくても `hermes tools` に並びます。認証前に "Nous Subscription" を選ぶと、Hermes がその場で Portal のログインを走らせます（推論プロバイダは変えず、他のツールにも触りません）。ツールごとの設定の組み合わせは [Tool Gateway のドキュメント](/hermes/docs/user-guide/features/tool-gateway/)にすべて載っています。

### 契約の管理 {#subscription-management}

プランの変更、使用量の確認、アップグレードや解約はいつでもできます。

- **Web:** [portal.nousresearch.com/manage-subscription](https://portal.nousresearch.com/manage-subscription)
- **CLI のショートカット:** `hermes portal open`（同じページを既定のブラウザで開きます）

## 設定の早見表 {#configuration-reference}

`hermes setup --portal` を実行したあと、`~/.hermes/config.yaml` はこうなります。

```yaml
model:
  provider: nous
  default: anthropic/claude-sonnet-4.6     # or whatever model you picked
  base_url: https://inference-api.nousresearch.com/v1
```

Tool Gateway の設定は、それぞれのツールの節に入ります。分類ごとに選択のキーが 1 つあり、`hermes tools`（または `hermes setup --portal`）で **Nous Subscription** を選ぶと値 `nous` が書き込まれます。

```yaml
web:
  backend: nous          # web search/extract routes through Tool Gateway

image_gen:
  provider: nous

tts:
  provider: nous

browser:
  cloud_provider: nous
```

実行時は常に保存された選択に従います。分類が `nous` になっている間、`.env` に残った直接の API キーは無視されます。直接の提供元（たとえば `image_gen.provider: fal`）を選んでキーがない場合は、黙ってゲートウェイに迂回せず、はっきりエラーになります。（古い設定では `use_gateway: true` という旧来のフラグを使っていました。これは `nous` と同じ意味として読まれますが、新たに書き出されることはありません。）

OAuth のリフレッシュトークンは `~/.hermes/auth.json` に別途保存されます（`config.yaml` には入りません。認証情報と設定を分けておく設計です）。

## トークンの扱い {#token-handling}

Hermes は長期有効な API キーを使い回すのではなく、保存された Portal のリフレッシュトークンから推論のたびに短命な JWT を発行します。更新・発行・一時的な 401 での再試行まで、トークンの一生はすべて自動で処理され、利用者の目に触れることはありません。

長時間動き続けるゲートウェイやダッシュボードのプロセスでは、期限が切れる前にトークンを更新する保守用の処理が背後で走ります。これにより、待機していたエージェントが認証情報の有効期間ごとに最初の 1 回だけ 401 の往復を負う、ということが起きません。この処理の間隔は Portal が実際に発行した有効期間から決まり（1 回の有効期間につき数回動きます）、上限は次の設定で決まります。

```yaml
nous:
  keepalive_interval_seconds: 900   # upper bound on the tick; 0 disables the keepalive
```

パスワードの変更、手動の失効、セッションの期限切れなどで Portal がリフレッシュトークンを無効にした場合、そのトークンは**ローカルで隔離**されます。Hermes が同じものを送り続けて同じ 401 が並ぶことはありません。次の呼び出しで「再認証が必要です」というはっきりしたメッセージが出ます。`hermes auth add nous` を実行して入り直してください。隔離は次にログインが成功した時点で解除されます。

## 困ったときは {#troubleshooting}

### `hermes portal info` に「not logged in」と出る {#hermes-portal-info-shows-not-logged-in}

OAuth の手続きが終わっていないか、リフレッシュトークンが消えています。次を実行してください。

```bash
hermes portal
```

または `hermes model` から Nous Portal を選び直します。

### セッションの途中で「re-authentication required」と出た {#got-a-re-authentication-required-message-mid-session}

Portal のリフレッシュトークンが無効になっています（パスワードの変更、手動の失効、セッションの期限切れ）。`hermes auth add nous` を実行すれば、次のリクエストから新しい認証情報が使われます。古いトークンの隔離は、ログインし直せば自動で解除されます。

### Portal に出ていない特定のモデルを使いたい {#want-to-use-a-specific-provider-model-that-the-portal-doesnt-expose}

Portal はモデルごとに適したバックエンドへ振り分けます（OpenRouter を通るものもあれば、独自や二次の提供元を通るものもあります）。そのため OpenRouter が対応しているモデルはたいてい使えます。特定のモデルが `/model` に出てこないときは、OpenRouter 形式の識別子を直接指定してみてください。

```bash
/model anthropic/claude-opus-4.6
```

本当に見当たらない場合は[イシューを立ててください](https://github.com/NousResearch/hermes-agent/issues)。Portal のカタログを Hermes 側に出しているだけなので、抜けているとしたら振り分けの設定の問題で、こちらで直せることがほとんどです。

### Portal のアカウントに請求が出てこない {#bills-not-appearing-on-my-portal-account}

まず `hermes portal info` を確認してください。`using Nous as inference provider` ではなく `Model: currently openrouter` のように別のプロバイダが表示されているなら、手元の設定がずれています。`hermes model` を実行して Nous Portal を選べば、次のリクエストから契約側を通ります。

## 関連ページ {#see-also}

- **[Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/)** — ゲートウェイの各ツール、ツールごとの設定、料金の詳細
- **[定額契約プロキシ](/hermes/docs/user-guide/features/subscription-proxy/)** — Portal の契約を Hermes 以外（他のエージェント、スクリプト、外部のクライアント）から使う
- **[音声モード](/hermes/docs/user-guide/features/voice-mode/)** — Portal の OpenAI TTS を使った音声での会話
- **[AI プロバイダ](/hermes/docs/integrations/providers/)** — 他の選択肢と比べたいときのプロバイダ一覧
- **[SSH 越しの OAuth](/hermes/docs/guides/oauth-over-ssh/)** — リモートのホストやブラウザしかない環境からログインする
- **[プロファイル](/hermes/docs/user-guide/profiles/)** — 1 つの Portal ログインを共有する複数の Hermes 設定
