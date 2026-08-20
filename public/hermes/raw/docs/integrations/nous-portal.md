---
title: "Nous Portal"
description: "ひとつの契約で 300 以上のフロンティアモデルと Tool Gateway が使える、Hermes Agent の推奨構成"
upstream_path: integrations/nous-portal.md
upstream_blob: ffcbe49409bda3d58d89734ea58371842f6681e5
sources:
  - https://hermes-agent.nousresearch.com/docs/integrations/nous-portal
---

# Nous Portal {#nous-portal}

[Nous Portal](https://portal.nousresearch.com) は Nous Research が提供する契約の統合窓口で、**Hermes Agent を動かすうえで推奨される方法**です。OAuth で一度ログインすれば、モデルの開発元・検索 API・画像生成・ブラウザ提供元ごとに別々のアカウントと API キーと支払いを抱える手間が、まるごと不要になります。

ひとつだけ設定する時間しかないなら、これにしてください。いちばん早い手順はこうです。

```bash
hermes setup --portal
```

このコマンドひとつで、Portal の OAuth が走り、Nous のモデルを選び、`config.yaml` の推論プロバイダーを Nous に設定し、Tool Gateway を有効にするところまで終わります。直後にそのまま `hermes chat` を始められます。

まだ契約していない場合は [portal.nousresearch.com/manage-subscription](https://portal.nousresearch.com/manage-subscription) で申し込み、戻ってきて上のコマンドを実行してください。

## 契約に含まれるもの {#whats-in-the-subscription}

### 300 以上のフロンティアモデルを、ひとつの請求で {#300-frontier-models-one-bill}

Portal は業界各所から選び抜いたエージェント向けモデルを中継します。開発元ごとに残高を持つのではなく、Nous の契約にまとめて請求されます。

| 系統 | モデル |
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
| **Hermes** | Hermes-4-70B、Hermes-4-405B（チャット向け。[後述の注意](#a-note-on-hermes-4)を参照） |
| **+ そのほかすべて** | 280 以上のモデル。エージェント分野の最前線がひととおり揃っています |

内部では、Portal がモデルごとに最適なバックエンドへ振り分けています。OpenRouter を経由するモデルもあれば、独自の提供元や二次的な提供元を通るモデルもあり、あるモデルの振り分け先は時期によって変わることもあります。どの経路でも請求先は Nous の契約です。セッションの途中で `/model` を打てば、コードには Claude Sonnet 4.6、長い文脈には Gemini 3 Pro、といった具合に切り替えられます。認証情報の追加も、残高の入金も、突然の残高ゼロエラーもありません。

:::note
振り分けはモデルごとに決まり、必ずしも OpenRouter を通るわけではありません。そのため OpenRouter 固有のリクエスト拡張（`provider` による振り分け指定、`session_id` による固定振り分け、トップレベルの `cache_control` など）は Portal の API の取り決めに含まれておらず、そのモデルを処理するバックエンド次第では無視されます。
:::

### Nous Tool Gateway {#the-nous-tool-gateway}

同じ契約で [Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/) も使えるようになります。これは Hermes Agent のツール呼び出しを Nous が運用する基盤経由で処理する仕組みです。5 つのバックエンドが、ログイン 1 回でまとまります。

| ツール | 提供元 | できること |
|------|---------|--------------|
| **ウェブ検索と本文抽出** | Firecrawl | エージェント向けの検索と、ページ全文の抽出。Firecrawl の API キーも、利用制限の見張りも要りません。 |
| **画像生成** | FAL | ひとつの窓口で 9 つのモデル。FLUX 2 Klein 9B、FLUX 2 Pro、Z-Image Turbo、Nano Banana Pro（Gemini 3 Pro Image）、GPT Image 1.5、GPT Image 2、Ideogram V3、Recraft V4 Pro、Qwen Image。 |
| **音声合成** | OpenAI TTS | OpenAI のキーを別に用意せずに、質の高い音声合成が使えます。各メッセージングプラットフォームでの [音声モード](/hermes/docs/user-guide/features/voice-mode/) が有効になります。 |
| **クラウドのブラウザ操作** | Browser Use | `browser_navigate`、`browser_click`、`browser_type`、`browser_vision` のための、画面を出さない Chromium のセッション。Browserbase のアカウントは要りません。 |
| **クラウドのターミナル環境** | Modal | コード実行のためのサーバーレスなターミナル環境（追加オプション）。 |

このゲートウェイがないと、Firecrawl のアカウント、FAL のアカウント、Browser Use のアカウント、OpenAI のキー、Modal のアカウントを、それぞれ用意することになります。登録が 5 回、管理画面が 5 つ、入金の手続きが 5 通りです。ゲートウェイを使えば、そのすべてがひとつの契約を通ります。

ゲートウェイのツールを一部だけ有効にすることもできます（たとえばウェブ検索は使い、画像生成は使わない）。後述の [ゲートウェイと自前のバックエンドを混ぜる](#mixing-the-gateway-with-your-own-backends) を参照してください。

### 設定ファイルに認証情報を残さない {#no-credentials-in-your-dotfiles}

すべてが OAuth で認証された Portal のセッションを通るので、長く使い回す API キーが `.env` に何本もたまることがありません。ディスク上に置かれる認証情報は `~/.hermes/auth.json` のリフレッシュトークンだけで、Hermes はそこからリクエストごとに寿命の短い JWT を発行します。後述の [トークンの扱い](#token-handling) を参照してください。

### どの OS でも同じ使い勝手 {#cross-platform-parity}

[Windows ネイティブ](/hermes/docs/user-guide/windows-native/) では、ツールごとに API キーを用意する作業がいちばんの難所です。Firecrawl のアカウント、FAL のアカウント、Browser Use のアカウント、OpenAI のキーを Windows から揃えるのは、使えるエージェントに仕上げるまでで最も骨が折れます。Portal の契約はそこをならしてくれます。OAuth ひとつでモデルもゲートウェイのツールも賄えるので、Windows でも 4 つのバックエンドを手作業で設定することなく、macOS や Linux と同じ体験になります。

## Hermes 4 についての注意 {#a-note-on-hermes-4}

Nous Research 自身の **Hermes 4** 系（Hermes-4-70B、Hermes-4-405B）は、Portal から大幅に安い価格で使えます。これらは**推論も併せ持つ最前線のチャットモデル**で、数学、科学、指示の遵守、決められた形式での出力、ロールプレイ、長文の執筆に強みがあります。

ただし、**Hermes Agent の中で使うことは推奨されていません**。Hermes 4 はチャットと推論に向けて調整されており、エージェントが頼りにする、次々とツールを呼び出していく動き方には向いていません。研究のような使い方や、[契約プロキシ](/hermes/docs/user-guide/features/subscription-proxy/) を通してほかのツールから使うのが向いています。エージェントとして働かせるなら、カタログの中から最前線のエージェント向けモデルを選んでください。

```bash
/model anthropic/claude-sonnet-4.6     # best general-purpose agentic model
/model openai/gpt-5.5-pro              # strong reasoning + tool calling
/model google/gemini-3-pro-preview     # huge context window
/model deepseek/deepseek-v4-pro        # cost-effective coder
```

Portal 自身の [モデル情報ページ](https://portal.nousresearch.com/info) にも同じ注意が載っています。つまりこれは Hermes 側の見解ではなく、Nous Research の公式な案内です。

## 設定 {#setup}

### 新規に入れる場合 — コマンドひとつ {#fresh-install-one-command}

```bash
hermes setup --portal
```

これで、次の流れが一気に終わります。

1. ブラウザで portal.nousresearch.com を開き、OAuth でログインします
2. リフレッシュトークンを `~/.hermes/auth.json` に保存します
3. 用意されたモデルの一覧から Nous のモデルを選びます（今のままにしたければ飛ばせます）
4. `~/.hermes/config.yaml` の推論プロバイダーを Nous に設定します（モデルを選んだ場合）
5. Tool Gateway（ウェブ、画像、音声合成、ブラウザの振り分け）を有効にします
6. `hermes chat` をすぐ始められる状態で、ターミナルに戻ります

まだ契約していない場合は、先に [portal.nousresearch.com/manage-subscription](https://portal.nousresearch.com/manage-subscription) で申し込んでください。

### すでに使っている場合 — 既存のプロバイダーに Portal を足す {#existing-install-add-portal-alongside-other-providers}

OpenRouter や Anthropic など、すでに何らかのプロバイダーで Hermes を設定していて、そこへ Portal を加えたい場合はこうします。

```bash
hermes model
# pick "Nous Portal" from the provider list
# browser opens, sign in, done
```

いま使っているプロバイダーの設定はそのまま残ります。セッション中は `/model`、セッションの合間は `hermes model` で切り替えられます。Portal は選べるプロバイダーのひとつになるだけで、唯一の選択肢になるわけではありません。

### 画面のない環境・SSH 越し・遠隔のホストでの設定 {#headless-ssh-remote-setup}

OAuth にはブラウザが要りますが、ログイン後に戻ってくる先は Hermes を動かしている端末です。遠隔のホストについては [SSH 越しの OAuth と遠隔ホスト](/hermes/docs/guides/oauth-over-ssh/) を参照してください。ほかの OAuth 方式のプロバイダーと同じ手口（`ssh -L` によるポート転送）がそのまま使えます。

### プロファイルでの設定 {#profile-setup}

[Hermes のプロファイル](/hermes/docs/user-guide/profiles/) を使っている場合、Portal のリフレッシュトークンは共有のトークン保管場所を通じて、すべてのプロファイルで自動的に共有されます。どれかひとつのプロファイルでログインすれば、ほかも自動的に引き継ぐので、プロファイルごとに OAuth をやり直す必要はありません。

## Portal を日々使う {#using-the-portal-day-to-day}

### 何がつながっているかを確かめる {#inspecting-whats-wired-up}

```bash
hermes portal            # log in to Nous Portal + set it up (one-shot onboarding)
hermes portal info       # login status, subscription info, model + gateway routing
hermes portal status     # alias for `portal info`
hermes portal tools      # detailed Tool Gateway catalog with per-tool routing
hermes portal open       # open the subscription management page in your browser
```

サブコマンドなしの `hermes portal` は、`hermes auth add nous --type oauth` を人にわかりやすく言い換えたものです。ログインし、Nous のモデルを選ばせ、推論プロバイダーを Nous に設定し、Tool Gateway を使うかどうかを尋ねます（`hermes setup --portal` と同じ内容で、初回の簡易設定で通る Nous の流れとも同じです）。

`hermes portal info` は全体像を見せてくれます。

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

セッションの中で切り替えるなら、こうします。

```bash
/model anthropic/claude-sonnet-4.6
/model openai/gpt-5.5-pro
/model google/gemini-3-pro-preview
```

選択画面を開くこともできます。

```bash
/model
# arrow keys, enter to select
```

セッションの外から変えるなら、設定ウィザードを使います（新しいプロバイダーを足すときに便利です）。

```bash
hermes model
```

### ゲートウェイと自前のバックエンドを混ぜる {#mixing-the-gateway-with-your-own-backends}

たとえば Browserbase のアカウントをすでに持っていて、それは使い続けたまま、ウェブ検索と画像生成だけ Nous を通したい、という使い方もできます。`hermes tools` でツールごとにバックエンドを選んでください。

```bash
hermes tools
# → Web search       → "Nous Subscription"
# → Image generation → "Nous Subscription"
# → Browser          → "Browserbase"  (your existing key)
# → TTS              → "Nous Subscription"
```

Tool Gateway はツール単位で選ぶものであり、全部か無かではありません。Nous Portal にログインしているかどうかにかかわらず、これらのバックエンドは `hermes tools` に出てきます。認証前に「Nous Subscription」を選んだ場合は、その場で Portal のログインが走ります（推論プロバイダーが変わったり、ほかのツールの設定が書き換わったりはしません）。ツールごとの設定の全体像は [Tool Gateway のドキュメント](/hermes/docs/user-guide/features/tool-gateway/) を参照してください。

### 契約の管理 {#subscription-management}

プランの変更、使用量の確認、アップグレードや解約は、いつでもここからできます。

- **ウェブ:** [portal.nousresearch.com/manage-subscription](https://portal.nousresearch.com/manage-subscription)
- **CLI からの近道:** `hermes portal open`（同じページを既定のブラウザで開きます）

## 設定の一覧 {#configuration-reference}

`hermes setup --portal` を実行したあと、`~/.hermes/config.yaml` はこうなります。

```yaml
model:
  provider: nous
  default: anthropic/claude-sonnet-4.6     # or whatever model you picked
  base_url: https://inference-api.nousresearch.com/v1
```

Tool Gateway の設定は、それぞれのツールの節に入ります。分野ごとに選択用のキーがひとつあり、`hermes tools`（あるいは `hermes setup --portal`）で **Nous Subscription** を選ぶと、値として `nous` が書き込まれます。

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

実行時は常に保存された選択に従います。ある分野が `nous` になっている間は、`.env` に残った直接の API キーは無視されます。また、直接のプロバイダー（たとえば `image_gen.provider: fal`）をキーなしで選ぶと、黙ってゲートウェイに回されるのではなく、はっきりしたエラーが出ます。（古い設定では `use_gateway: true` という旧来のフラグが使われていました。これは `nous` と同じ意味として読まれますが、新しく書き込まれることはありません。）

OAuth のリフレッシュトークンは `~/.hermes/auth.json` に分けて保存されます（`config.yaml` には入りません。認証情報と設定は意図的に分けてあります）。

## トークンの扱い {#token-handling}

Hermes は、長く使い回す API キーを持ち歩くのではなく、保存された Portal のリフレッシュトークンから推論のたびに寿命の短い JWT を発行します。更新、発行、一時的な 401 での再試行まで完全に自動で行われ、その存在を意識することはありません。

Portal 側でリフレッシュトークンが無効にされた場合（パスワード変更、手動での失効、セッションの期限切れ）、無効なトークンは**手元で隔離され**、Hermes がそれを送り続けて同じ 401 が延々と返る状態になりません。次の呼び出しで「再認証が必要です」というはっきりしたメッセージが出ます。`hermes auth add nous` でログインし直すと、次に成功した時点で隔離は解けます。

## 困ったときは {#troubleshooting}

### `hermes portal info` が「not logged in」と表示する {#hermes-portal-info-shows-not-logged-in}

OAuth の手続きが終わっていないか、リフレッシュトークンが消えています。これを実行してください。

```bash
hermes portal
```

あるいは `hermes model` を使って、Nous Portal を選び直します。

### セッションの途中で「re-authentication required」と出た {#got-a-re-authentication-required-message-mid-session}

Portal のリフレッシュトークンが無効になっています（パスワード変更、手動での失効、セッションの期限切れ）。`hermes auth add nous` を実行すれば、次のリクエストから新しい認証情報が使われます。古いトークンにかかっていた隔離は、ログインに成功した時点で自動的に解けます。

### Portal に出てこない特定のモデルを使いたい {#want-to-use-a-specific-provider-model-that-the-portal-doesnt-expose}

Portal はモデルごとに適したバックエンドへ振り分けており、OpenRouter を通るものもあれば、独自の提供元や二次的な提供元を通るものもあります。そのため OpenRouter で使えるモデルはたいてい利用できます。特定のモデルが `/model` に出てこない場合は、OpenRouter 形式の識別子をそのまま指定してみてください。

```bash
/model anthropic/claude-opus-4.6
```

本当に見当たらない場合は [issue を立ててください](https://github.com/NousResearch/hermes-agent/issues)。Portal のカタログを Hermes 側に出しているだけなので、抜けているときはたいてい振り分けの設定を直せば済みます。

### Portal のアカウントに請求が上がってこない {#bills-not-appearing-on-my-portal-account}

まず `hermes portal info` を見てください。別のプロバイダーを使っている表示（`using Nous as inference provider` ではなく `Model: currently openrouter`）になっていれば、手元の設定がずれています。`hermes model` を実行して Nous Portal を選び直せば、次のリクエストから契約を通るようになります。

## 関連ページ {#see-also}

- **[Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/)** — ゲートウェイの各ツール、ツールごとの設定、料金の詳細
- **[契約プロキシ](/hermes/docs/user-guide/features/subscription-proxy/)** — Portal の契約を Hermes 以外（ほかのエージェント、スクリプト、他社のクライアント）から使う
- **[音声モード](/hermes/docs/user-guide/features/voice-mode/)** — Portal の OpenAI TTS を使った音声での会話
- **[AI プロバイダー](/hermes/docs/integrations/providers/)** — ほかの選択肢と比べたいときの、プロバイダー一覧
- **[SSH 越しの OAuth](/hermes/docs/guides/oauth-over-ssh/)** — 遠隔のホストやブラウザしかない環境からログインする
- **[プロファイル](/hermes/docs/user-guide/profiles/)** — ひとつの Portal ログインを複数の Hermes 設定で共有する
