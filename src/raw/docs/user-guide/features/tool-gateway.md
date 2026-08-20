---
title: "Nous Tool Gateway"
description: "契約はひとつ、ツールはひとそろい。ウェブ検索・画像生成・TTS・クラウドのブラウザを、追加の API キーなしで Nous Portal 経由で使えます。"
upstream_path: user-guide/features/tool-gateway.md
upstream_blob: 247b4ed383b757b515c5e9020e9b259562a90224
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/tool-gateway
---

# Nous Tool Gateway {#nous-tool-gateway}

**契約はひとつ。ツールはすべて内蔵。**

Tool Gateway は、有料の [Nous Portal](https://portal.nousresearch.com) 契約すべてに含まれています。Hermes のツール呼び出し（ウェブ検索、画像生成、読み上げ音声、クラウドのブラウザ自動操作）を Nous がすでに運用している基盤へ通すので、エージェントを使いものにするためだけに Firecrawl、FAL、OpenAI、Browser Use などへ個別に登録する必要がなくなります。

[契約の開始・管理はこちら →](https://portal.nousresearch.com/manage-subscription)

## 含まれるもの {#whats-included}

| | ツール | できること |
|---|---|---|
| 🔍 | **ウェブ検索と抽出** | Firecrawl による、エージェント向けのウェブ検索とページ全文の抽出です。レート制限を気にする必要はありません。規模の調整はゲートウェイ側が引き受けます。 |
| 🎨 | **画像生成** | ひとつの窓口で9つのモデルを使えます。**FLUX 2 Klein 9B**、**FLUX 2 Pro**、**Z-Image Turbo**、**Nano Banana Pro**（Gemini 3 Pro Image）、**GPT Image 1.5**、**GPT Image 2**、**Ideogram V3**、**Recraft V4 Pro**、**Qwen Image**。生成のたびにフラグで選ぶことも、Hermes の既定である FLUX 2 Klein に任せることもできます。 |
| 🔊 | **読み上げ音声** | OpenAI TTS の声が `text_to_speech` ツールにつながっています。Telegram にボイスメモを投げる、処理の流れに音声を組み込む、文章を読み上げさせる、といった使い方ができます。 |
| 🌐 | **クラウドのブラウザ自動操作** | Browser Use による画面表示なしの Chromium セッションです。`browser_navigate`、`browser_click`、`browser_type`、`browser_vision` といったエージェントが操作するための基本動作がひととおりそろい、Browserbase のアカウントは要りません。 |

4つとも、使った分だけ Nous の契約に請求されます。組み合わせは自由です。ウェブと画像はゲートウェイに任せつつ TTS だけ手持ちの ElevenLabs のキーを使う、あるいはすべてを Nous 経由にする、どちらもできます。

## なぜこれがあるのか {#why-its-here}

実際に*手を動かせる*エージェントを組もうとすると、5つ以上の API 契約をつなぎ合わせることになります。それぞれに登録手続き、レート制限、請求、そして独自の癖があります。ゲートウェイはこれをひとつのアカウントにまとめます。

- **請求はひとつ。** Nous に支払えば、あとはこちらで処理します。
- **登録はひとつ。** Firecrawl、FAL、Browser Use、OpenAI の音声のアカウントを管理する必要はありません。
- **キーはひとつ。** Nous Portal の OAuth がすべてのツールをまかないます。
- **品質はそのまま。** キーを直接使う場合と同じ裏側を、こちらが前面で受けているだけです。

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

`hermes setup --portal` と `hermes model` は、まとめて片づける道です。一度ログインすれば、必要に応じてすべてのツールをゲートウェイに切り替えられます。`hermes tools` は選び取る道で、使いたいツールだけをひとつずつ有効にします。

**先にログインしておく必要はありません。** `hermes tools` では、Nous が運用する裏側（ウェブ検索、画像、動画、TTS、ブラウザ）が常に一覧に出ます。Nous Portal に一度もログインしたことがなくても表示されます。選んだ時点でまだ認証されていなければ、Hermes がその場で Portal のログインを始めるので、あらかじめ `hermes model` を実行しておく必要はありません。Nous の OAuth がすでに有効なら、選んだ瞬間に追加の確認なしで有効になります。この道でログインして有効になるのは選んだそのツールだけで、推論の提供元は切り替わりませんし、他のツールについてゲートウェイを有効にするか尋ねられることもありません。

いま何が動いているかは、いつでも確認できます。

```bash
hermes portal info        # Portal auth + Tool Gateway routing summary
hermes portal tools       # Gateway catalog with current routing per tool
hermes status             # Full system status (Tool Gateway is one section)
```

`hermes portal info` は次のような一節を表示します。

```
◆ Nous Tool Gateway
  Nous Portal     ✓ managed tools available
  Web tools       ✓ active via Nous subscription
  Image gen       ✓ active via Nous subscription
  TTS             ✓ active via Nous subscription
  Browser         ○ active via Browser Use key
```

「active via Nous subscription」と出ているツールはゲートウェイを通っています。それ以外は自分のキーを使っています。

## 使える条件 {#eligibility}

Tool Gateway は**有料契約**の機能です。無料枠の Nous アカウントでも Portal を推論には使えますが、運用込みのツールは含まれません。ゲートウェイを使うには[プランの変更](https://portal.nousresearch.com/manage-subscription)が必要です。

アカウントによっては、**無料のツール枠**が付いていることもあります。これは有料契約なしでゲートウェイのツール呼び出しをまかなえる、少量の利用枠です。無料枠が使える場合はゲートウェイがそれを知らせ、最初に使うときに設定の案内が出るので、その場で受け取ってすぐ使い始められます。

## 組み合わせて使う {#mix-and-match}

ゲートウェイはツール単位です。使いたいものだけ有効にしてください。

- **すべてのツールを Nous 経由に** — いちばん簡単です。契約ひとつで終わります。
- **ウェブと画像はゲートウェイ、TTS は自前** — ElevenLabs の声はそのまま使い、残りを Nous に任せます。
- **キーを持っていないものだけゲートウェイ** — 「Browserbase にはすでに払っているが、Firecrawl のアカウントは作りたくない」という使い方も問題ありません。

どのツールも、次のコマンドでいつでも切り替えられます。

```bash
hermes tools          # Interactive picker for each tool category
```

ツールを選び、提供元として **Nous Subscription**（または好みの直接の提供元）を選ぶだけです。設定ファイルを書き換える必要はありません。まだ Nous Portal にログインしていない場合は、**Nous Subscription** を選んだ時点で Portal のログインがその場で始まります。先に `hermes model` で認証しておく必要はありません。

## 画像モデルを個別に使う {#using-individual-image-models}

画像生成は速さを優先して FLUX 2 Klein 9B を既定にしています。呼び出しごとに変えたいときは、`image_generate` ツールにモデル ID を渡してください。

| モデル | ID | 向いている用途 |
|---|---|---|
| FLUX 2 Klein 9B | `fal-ai/flux-2/klein/9b` | 速く、既定として扱いやすい |
| FLUX 2 Pro | `fal-ai/flux-2-pro` | より描き込みの細かい FLUX |
| Z-Image Turbo | `fal-ai/z-image/turbo` | 様式的で速い |
| Nano Banana Pro | `fal-ai/nano-banana-pro` | Google Gemini 3 Pro Image |
| GPT Image 1.5 | `fal-ai/gpt-image-1.5` | OpenAI の画像生成、文字と画像に強い |
| GPT Image 2 | `fal-ai/gpt-image-2` | OpenAI の最新 |
| Ideogram V3 | `fal-ai/ideogram/v3` | 指示への忠実さと文字組み |
| Recraft V4 Pro | `fal-ai/recraft/v4/pro/text-to-image` | ベクター調、グラフィックデザイン |
| Qwen Image | `fal-ai/qwen-image` | Alibaba のマルチモーダル |

顔ぶれは移り変わります。`hermes tools` → Image Generation で、その時点の一覧を確認できます。

---

## 設定の早見表 {#configuration-reference}

ここに手を入れる場面はほとんどありません。`hermes model` と `hermes tools` の対話画面だけで、どの使い方もまかなえます。この節は config.yaml を直接書く場合や、設定を自動化する場合のためのものです。

### ツールの分類ごとに選択キーはひとつ {#one-selection-key-per-tool-category}

ツールの分類ごとに、提供元を決めるキーがひとつあります。書き込むのは `hermes tools` の選択画面（またはデスクトップの GUI）です。**Nous Subscription** の行を選ぶと値 `nous` が保存され、その分類は運用込みの Tool Gateway を通ります。自前のキーを使う行を選ぶと提供元の名前（`fal`、`openai`、`firecrawl`、`browser-use` など）が保存され、自分の認証情報で直接つながります。

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

実行時は**必ず保存された選択に従います**。認証情報があるかどうかで分類の行き先が決まったり、勝手に切り替わったりすることはありません。`image_gen.provider: nous` のあいだは `.env` に置かれた `FAL_KEY` は無視されます。逆に `image_gen.provider: fal` なのに `FAL_KEY` が設定されていない場合は、黙ってゲートウェイに逃げるのではなく、はっきりとしたエラーが出ます。

```
image_gen is configured to use fal (set via hermes tools), but FAL_KEY is not set. Run 'hermes tools' to change it.
```

**一度も設定していない**分類（選択キーが書かれたことのない分類）は、これまでどおり手元の認証情報から自動で判別します。ただし選択がいったん保存されたあとは、`.env` にキーを足しても行き先は変わりません。変えられるのは `hermes tools`（または選択キーの直接編集）だけです。

### 自分のキーに戻す {#switching-back-to-your-own-keys}

```bash
hermes tools    # pick the tool → choose a direct provider (e.g. Firecrawl)
```

あるいは、選択キーを直接書いてもかまいません。

```yaml
web:
  backend: firecrawl   # Hermes now uses FIRECRAWL_API_KEY from .env
```

### 旧来の `use_gateway` フラグ（非推奨） {#legacy-usegateway-flag-deprecated}

古い版の Hermes では、ツールごとの真偽値 `use_gateway: true` でゲートウェイに通していました。このフラグは**旧来のもの**です。もう書き込まれることはなく、`hermes tools` の選択画面が分類の設定を書き直すときに取り除きます。`use_gateway: true` が残っている古い設定は、読み込むときに `nous` の選択として解釈されるので、これまでの環境はそのまま動きます。新しい設定に `use_gateway` を書くのはやめて、`hermes tools` で提供元を選んでください。

### 自前で運用するゲートウェイ（上級者向け） {#self-hosted-gateway-advanced}

Nous 互換のゲートウェイを自分で動かしている場合は、`~/.hermes/.env` で接続先を上書きできます。

```bash
TOOL_GATEWAY_DOMAIN=your-domain.example.com
TOOL_GATEWAY_SCHEME=https
TOOL_GATEWAY_USER_TOKEN=your-token        # normally auto-populated from Portal login
FIRECRAWL_GATEWAY_URL=https://...         # override one endpoint specifically
```

これらのつまみは、独自の基盤（企業内での運用、開発環境）のためにあります。普通に契約して使う分には触ることはありません。

## よくある質問 {#faq}

### Telegram や Discord など、他のメッセージングの窓口でも使えますか {#does-it-work-with-telegram-discord-the-other-messaging-gateways}

使えます。Tool Gateway が働くのはツールを実行する層で、CLI に限った仕組みではありません。ツールを呼べる窓口であれば、CLI、Telegram、Discord、Slack、IRC、Teams、API サーバー、どれでも意識せずに恩恵を受けられます。

### 契約が切れたらどうなりますか {#what-happens-if-my-subscription-expires}

ゲートウェイを通っていたツールは、更新するか `hermes tools` で自分の API キーに差し替えるまで使えなくなります。Hermes は portal を案内するはっきりしたエラーを表示します。

### ツールごとの使用量や費用は見られますか {#can-i-see-usage-or-costs-per-tool}

見られます。[Nous Portal のダッシュボード](https://portal.nousresearch.com)がツールごとに使用量を分けて表示するので、何が請求額を押し上げているか分かります。

### Modal（サーバーレスのターミナル）は含まれますか {#is-modal-serverless-terminal-included}

Modal は Nous の契約に対する**追加オプション**で、Tool Gateway の標準の組み合わせには入っていません。シェルの実行を離れた場所のサンドボックスで行いたいときは、`hermes setup terminal` か `config.yaml` を直接編集して設定してください。

### ゲートウェイを有効にしたら、手持ちの API キーは消すべきですか {#do-i-need-to-delete-my-existing-api-keys-when-i-enable-the-gateway}

いいえ、`.env` に残しておいてかまいません。そのツールの選択が **Nous Subscription** のあいだは、直接つなぐためのキーは単に無視されます。`hermes tools` でもう一度その提供元を選べば、自分のキーが再び使われます。ゲートウェイは囲い込みではありません。
