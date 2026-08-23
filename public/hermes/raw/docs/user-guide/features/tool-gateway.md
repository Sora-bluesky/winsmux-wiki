---
title: "Nous Tool Gateway"
description: "契約はひとつで、ツールはひとそろい。ウェブ検索・画像生成・読み上げ音声・クラウドのブラウザを、追加の API キーなしで Nous Portal 経由で使えます。"
upstream_path: user-guide/features/tool-gateway.md
upstream_blob: ee828cbb46631b0a782bcd7701f479a3f7757b68
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/tool-gateway
---

# Nous Tool Gateway {#nous-tool-gateway}

**契約はひとつ。ツールはすべて内蔵。**

Tool Gateway は、有料の [Nous Portal](https://portal.nousresearch.com) 契約すべてに含まれています。Hermes のツール呼び出し（ウェブ検索、画像生成、読み上げ音声、クラウドのブラウザ自動操作）を Nous がすでに運用している基盤へ通すので、エージェントを使いものにするためだけに Firecrawl、FAL、OpenAI、Browser Use などへ個別に登録する必要がありません。

[契約の開始・管理はこちら →](https://portal.nousresearch.com/manage-subscription)

## 含まれるもの {#whats-included}

| | ツール | できること |
|---|---|---|
| 🔍 | **ウェブ検索と抽出** | Firecrawl による、エージェント向けのウェブ検索とページ全文の抽出です。レート制限を気にする必要はありません。規模の調整はゲートウェイ側が引き受けます。 |
| 🎨 | **画像生成** | ひとつの窓口で9つのモデルを使えます。**FLUX 2 Klein 9B**、**FLUX 2 Pro**、**Z-Image Turbo**、**Nano Banana Pro**（Gemini 3 Pro Image）、**GPT Image 1.5**、**GPT Image 2**、**Ideogram V3**、**Recraft V4 Pro**、**Qwen Image**。生成のたびにフラグで選ぶことも、Hermes の既定である FLUX 2 Klein に任せることもできます。 |
| 🔊 | **読み上げ音声** | OpenAI TTS の声が `text_to_speech` ツールにつながっています。Telegram にボイスメモを投げる、処理の流れに音声を組み込む、文章を読み上げさせる、といった使い方ができます。 |
| 🌐 | **クラウドのブラウザ自動操作** | Browser Use による画面表示なしの Chromium セッションです。`browser_navigate`、`browser_click`、`browser_type`、`browser_vision` といった、エージェントがブラウザを動かすための基本動作がひととおりそろい、Browserbase のアカウントは要りません。 |

4つとも、使った分だけ Nous の契約に請求されます。組み合わせは自由です。ウェブと画像はゲートウェイに任せつつ TTS だけ手持ちの ElevenLabs のキーを使う、あるいはすべてを Nous 経由にする、どちらもできます。

## なぜこれがあるのか {#why-its-here}

実際に*仕事をする*エージェントを作ろうとすると、5つ以上の API 契約をつなぎ合わせることになります。それぞれに登録手続き、レート制限、請求、そして独自のクセがあります。ゲートウェイは、それをアカウントひとつにまとめます。

- **請求はひとつ。** Nous に支払えば、あとはこちらで処理します。
- **登録はひとつ。** Firecrawl、FAL、Browser Use、OpenAI の音声アカウントを個別に管理する必要はありません。
- **キーはひとつ。** Nous Portal の OAuth がすべてのツールをまかないます。
- **品質は同じ。** キーを直接使う場合と同じ基盤を、こちらが前面で受けているだけです。

自分のキーはいつでも持ち込めます。ツール単位で、好きなときに切り替えられます。ゲートウェイは囲い込みではなく、近道です。

## 使い始める {#get-started}

入り口は3つあります。いまの状況に合うものを選んでください。

```bash
hermes setup --portal     # Fresh install: Nous OAuth + set Nous as provider + turn on the Tool Gateway in one go
```

```bash
hermes model              # Switch your inference provider to Nous Portal — Hermes then offers to turn on the gateway for all tools
```

```bash
hermes tools              # Enable the gateway per-tool — pick "Nous Subscription" for any tool you want
```

`hermes setup --portal` と `hermes model` は一度にまとめて済ませる道です。一度ログインすれば、必要に応じてすべてのツールをゲートウェイ経由に切り替えられます。`hermes tools` は選び取る道で、使いたいツールだけをひとつずつ有効にします。

**先にログインしておく必要はありません。** `hermes tools` では、Nous が管理する基盤（ウェブ検索、画像、動画、TTS、ブラウザ）が常に一覧に出ます。Nous Portal に一度もログインしたことがなくても表示されます。選ぶとその場で Portal のログインが走り、まだ認証していなければそこで済ませられます。事前に `hermes model` を実行する必要はありません。Nous の OAuth がすでに有効なら、基盤を選んだ時点で追加の確認なしに有効になります。この道で行われるのはログインと、選んだツール1つを有効にすることだけです。推論の提供元は切り替わりませんし、ほかのツールについてゲートウェイを有効にするか尋ねられることもありません。

いまどれが有効かは、いつでも確認できます。

```bash
hermes portal info        # Portal auth + Tool Gateway routing summary
hermes portal tools       # Gateway catalog with current routing per tool
hermes status             # Full system status (Tool Gateway is one section)
```

`hermes portal info` は、次のような一節を表示します。

```
◆ Nous Tool Gateway
  Nous Portal     ✓ managed tools available
  Web tools       ✓ active via Nous subscription
  Image gen       ✓ active via Nous subscription
  TTS             ✓ active via Nous subscription
  Browser         ○ active via Browser Use key
```

「active via Nous subscription」と付いているツールは、ゲートウェイを通っています。それ以外は自分のキーを使っています。

## 使える条件 {#eligibility}

Tool Gateway は**有料契約**向けの機能です。無料枠の Nous アカウントでも Portal を推論に使えますが、管理されたツールは含まれません。ゲートウェイを使うには[プランをアップグレード](https://portal.nousresearch.com/manage-subscription)してください。

アカウントによっては、**無料のツール枠**が付いていることもあります。これは管理されたツールを少しだけ使える枠で、有料契約がなくてもゲートウェイのツール呼び出しをまかないます。無料枠がある場合、ゲートウェイがそれを知らせ、最初に使うときに設定の案内を出すので、その場で受け取ってすぐ使い始められます。

## 有効化のチェックリスト {#the-enablement-checklist}

Nous のモデルを選ぶ（`hermes model`）と、ゲートウェイの基盤をツールごとに選ぶチェックリストが出ます。その動きは、いまの設定を尊重します。

- 別の基盤を明示的に指定してあるツール（例: `web.backend: searxng`、`browser.cloud_provider: camofox`）は**一覧に出ません**。自分の選択がうっかり上書きされることはありません。
- 環境変数だけで設定してあるツール（例: `SEARXNG_URL`、`CAMOFOX_URL`）は**チェックを外した状態**で出ます。自分の基盤をそのまま使う旨の説明が付きます。
- 何も設定していないツールだけが、最初からチェック済みで出ます。
- 断った選択は残ります。チェックを外したままチェックリストを確定すると、次回以降 Nous のモデルへ切り替えたときも最初からチェックされません（`config.yaml` の `tool_gateway_declined_tools` に記録されます。あとでチェックを入れれば、この記録は消えます）。

## 組み合わせて使う {#mix-and-match}

ゲートウェイはツール単位です。使いたいものだけ有効にできます。

- **すべてのツールを Nous 経由にする** — いちばん簡単です。契約ひとつで完了します。
- **ウェブと画像はゲートウェイ、TTS は自前** — ElevenLabs の声はそのままに、残りを Nous に任せます。
- **キーを持っていないものだけゲートウェイ** — 「Browserbase にはすでに払っているが、Firecrawl のアカウントは作りたくない」といった使い方ができます。

どのツールも、次のコマンドでいつでも切り替えられます。

```bash
hermes tools          # Interactive picker for each tool category
```

ツールを選び、提供元として **Nous Subscription**（あるいは好みの直接の提供元）を選びます。設定ファイルを編集する必要はありません。まだ Nous Portal にログインしていない場合、**Nous Subscription** を選んだ時点で Portal のログインがその場で始まります。先に `hermes model` で認証しておく必要はありません。

## 画像モデルを個別に使う {#using-individual-image-models}

画像生成は速度を優先して FLUX 2 Klein 9B を既定にしています。呼び出しごとに変えたい場合は、`image_generate` ツールにモデル ID を渡します。

| モデル | ID | 向いている用途 |
|---|---|---|
| FLUX 2 Klein 9B | `fal-ai/flux-2/klein/9b` | 速く、既定として扱いやすい |
| FLUX 2 Pro | `fal-ai/flux-2-pro` | より緻密な FLUX |
| Z-Image Turbo | `fal-ai/z-image/turbo` | 様式化された絵を速く |
| Nano Banana Pro | `fal-ai/nano-banana-pro` | Google Gemini 3 Pro Image |
| GPT Image 1.5 | `fal-ai/gpt-image-1.5` | OpenAI の画像生成、文字と画像 |
| GPT Image 2 | `fal-ai/gpt-image-2` | OpenAI の最新版 |
| Ideogram V3 | `fal-ai/ideogram/v3` | 指示への忠実さと文字組み |
| Recraft V4 Pro | `fal-ai/recraft/v4/pro/text-to-image` | ベクター調、グラフィックデザイン |
| Qwen Image | `fal-ai/qwen-image` | Alibaba のマルチモーダル |

顔ぶれは移り変わります。`hermes tools` から Image Generation を開くと、そのときの一覧が出ます。

---

## 設定の早見表 {#configuration-reference}

ほとんどの人はここに触れずに済みます。`hermes model` と `hermes tools` が、対話形式であらゆる手順をまかないます。この節は、config.yaml を直接書く場合や、設定を自動化する場合のためのものです。

### ツール分類ごとに選択キーはひとつ {#one-selection-key-per-tool-category}

ツールの分類ごとに、提供元を選ぶキーがひとつあります。書き込むのは `hermes tools` の選択画面（またはデスクトップの画面）です。**Nous Subscription** の行を選ぶと値 `nous` が保存され、その分類は管理された Tool Gateway を通ります。自分のキーを使う行を選ぶと提供元の名前（`fal`、`openai`、`firecrawl`、`browser-use` など）が保存され、自分の資格情報で直接つながります。

```yaml
web:
  backend: nous          # web search/extract via the Tool Gateway

image_gen:
  provider: nous         # image generation via the Tool Gateway

tts:
  provider: nous         # TTS via the Tool Gateway

stt:
  provider: nous         # speech-to-text via the Tool Gateway

browser:
  cloud_provider: nous   # cloud browser via the Tool Gateway
```

実行時は**保存された選択を常に使います**。資格情報があるかどうかで分類の経路が選ばれたり、切り替わったりすることはありません。`image_gen.provider: nous` のあいだ、`.env` に置かれた `FAL_KEY` は無視されます。逆に `image_gen.provider: fal` なのに `FAL_KEY` がない場合は、黙ってゲートウェイに戻るのではなく、はっきりしたエラーが出ます。

```
image_gen is configured to use fal (set via hermes tools), but FAL_KEY is not set. Run 'hermes tools' to change it.
```

**一度も設定していない**分類（選択キーがまだ書かれていないもの）は、これまでどおり、使える資格情報から自動で判別します。ただし選択がいったん保存されると、`.env` にキーを足しても経路は変わりません。変えられるのは `hermes tools`（または選択キーの編集）だけです。

### 自分のキーに戻す {#switching-back-to-your-own-keys}

```bash
hermes tools    # pick the tool → choose a direct provider (e.g. Firecrawl)
```

選択キーを直接書いても構いません。

```yaml
web:
  backend: firecrawl   # Hermes now uses FIRECRAWL_API_KEY from .env
```

### 古い `use_gateway` フラグ（非推奨） {#legacy-usegateway-flag-deprecated}

以前の Hermes は、ゲートウェイを通すためにツールごとの `use_gateway: true` という真偽値を使っていました。このフラグは**過去のもの**です。もう書き込まれることはなく、`hermes tools` の選択画面が選択を書き直す際に、その分類の設定から取り除きます。`use_gateway: true` が残っている古い設定は、読み込み時に `nous` の選択として解釈されるので、いまの環境はそのまま動きます。新しい設定に `use_gateway` を書かないでください。代わりに `hermes tools` で提供元を選びます。

### 自前で動かすゲートウェイ（上級者向け） {#self-hosted-gateway-advanced}

Nous 互換のゲートウェイを自分で動かしていますか。その場合は `~/.hermes/.env` で接続先を上書きします。

```bash
TOOL_GATEWAY_DOMAIN=your-domain.example.com
TOOL_GATEWAY_SCHEME=https
TOOL_GATEWAY_USER_TOKEN=your-token        # normally auto-populated from Portal login
FIRECRAWL_GATEWAY_URL=https://...         # override one endpoint specifically
```

これらのつまみは、独自の基盤を組む場合（企業での導入、開発環境など）のためにあります。通常の契約者が設定することはありません。

## よくある質問 {#faq}

### Telegram や Discord など、ほかのメッセージ連携でも使えますか {#does-it-work-with-telegram-discord-the-other-messaging-gateways}

使えます。Tool Gateway が働くのはツールを実行する層で、CLI に限りません。ツールを呼べる窓口であれば、CLI、Telegram、Discord、Slack、IRC、Teams、API サーバーなど、どれでもそのまま恩恵を受けられます。

### 契約が切れたらどうなりますか {#what-happens-if-my-subscription-expires}

ゲートウェイ経由のツールは、更新するか、`hermes tools` で直接の API キーに差し替えるまで動かなくなります。Hermes は Portal を案内する、わかりやすいエラーを表示します。

### ツールごとの使用量や費用は見られますか {#can-i-see-usage-or-costs-per-tool}

見られます。[Nous Portal のダッシュボード](https://portal.nousresearch.com)が使用量をツール別に分けて示すので、何が費用を押し上げているかがわかります。

### Modal（サーバーレスの端末）は含まれますか {#is-modal-serverless-terminal-included}

Modal は Nous の契約を通じた**追加オプション**で、既定の Tool Gateway の組み合わせには入っていません。シェルの実行を離れた場所の隔離環境で行いたいときは、`hermes setup terminal` か `config.yaml` で直接設定します。

### ゲートウェイを有効にしたら、いまある API キーは消すべきですか {#do-i-need-to-delete-my-existing-api-keys-when-i-enable-the-gateway}

消す必要はありません。`.env` に置いたままで構いません。そのツールの選択が **Nous Subscription** のあいだ、直接のキーは単に無視されます。`hermes tools` で直接の提供元を選び直せば、また自分のキーが使われます。ゲートウェイは囲い込みではありません。
