---
title: "Nous Tool Gateway"
description: "サブスクリプション 1 つで、すべてのツールを。Web 検索、画像生成、音声読み上げ、クラウドブラウザーを、追加の API キー無しで Nous Portal 経由に束ねます。"
upstream_path: user-guide/features/tool-gateway.md
upstream_blob: 552135ce063987c571ef32c4f7a30abbbef1d3d4
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/tool-gateway
---

# Nous Tool Gateway {#nous-tool-gateway}

**サブスクリプションは 1 つ。ツールは全部入り。**

Tool Gateway は、有料の [Nous Portal](https://portal.nousresearch.com) サブスクリプションすべてに含まれています。Hermes のツール呼び出し（Web 検索、画像生成、音声読み上げ、クラウドブラウザーの自動操作）を、Nous がすでに運用している基盤へ通してくれます。エージェントを使いものにするためだけに、Web 検索のベンダーや FAL、OpenAI、Browser Use などへ個別に登録する必要はありません。

[サブスクリプションを始める・管理する →](https://portal.nousresearch.com/manage-subscription)

## 含まれるもの {#whats-included}

| | ツール | できること |
|---|---|---|
| 🔍 | **Web 検索と本文抽出** | Nous が運用する、エージェント向けの Web 検索と、ページ全文の抽出。スケーリングはゲートウェイ側が引き受けるので、レート制限を気にする必要はありません。 |
| 🎨 | **画像生成** | 1 つのエンドポイントに 9 つのモデル。**FLUX 2 Klein 9B**、**FLUX 2 Pro**、**Z-Image Turbo**、**Nano Banana Pro**（Gemini 3 Pro Image）、**GPT Image 1.5**、**GPT Image 2**、**Ideogram V3**、**Recraft V4 Pro**、**Qwen Image**。生成ごとにフラグで選ぶことも、Hermes の既定である FLUX 2 Klein に任せることもできます。 |
| 🔊 | **音声読み上げ** | OpenAI の TTS 音声が `text_to_speech` ツールにつながっています。Telegram にボイスメモを投げる、パイプライン用の音声を作る、何かを読み上げさせる、といった使い方ができます。 |
| 🌐 | **クラウドブラウザーの自動操作** | Browser Use 経由のヘッドレス Chromium セッション。`browser_navigate`、`browser_click`、`browser_type`、`browser_vision` といったエージェント操作の基本部品が、Browserbase のアカウント無しで使えます。 |

4 つとも、Nous のサブスクリプションに対する従量課金です。組み合わせは自由で、Web と画像はゲートウェイに任せつつ TTS だけ自前の ElevenLabs キーを使う、あるいは全部を Nous 経由にする、どちらもできます。

## なぜこれがあるのか {#why-its-here}

実際に*何かをこなせる*エージェントを組もうとすると、5 つ以上の API サブスクリプションをつなぎ合わせることになります。それぞれに登録があり、レート制限があり、請求があり、癖があります。ゲートウェイはそれをアカウント 1 つにまとめます。

- **請求は 1 つ。** Nous に払えば、あとはこちらで面倒を見ます。
- **登録は 1 回。** Web 検索も FAL も Browser Use も OpenAI の音声アカウントも、管理する必要がありません。
- **キーは 1 つ。** Nous Portal の OAuth が、すべてのツールをカバーします。
- **品質は同じ。** 直接キーを使う経路と同じバックエンドを、こちらが前面で受けているだけです。

自分のキーはいつでも持ち込めます。ツール単位で、好きなときに切り替えられます。ゲートウェイは囲い込みではなく、近道です。

## 使い始める {#get-started}

入り口は 3 つあります。今の状況に合うものを選んでください。

```bash
hermes setup --portal     # Fresh install: Nous OAuth + set Nous as provider + turn on the Tool Gateway in one go
```

```bash
hermes model              # Switch your inference provider to Nous Portal — Hermes then offers to turn on the gateway for all tools
```

```bash
hermes tools              # Enable the gateway per-tool — pick "Nous Subscription" for any tool you want
```

`hermes setup --portal` と `hermes model` は一気に済ませる経路です。一度ログインすれば、必要に応じてすべてのツールをゲートウェイへ切り替えられます。`hermes tools` は単品で選ぶ経路で、欲しいツールだけを 1 つずつ有効にします。

**先にログインしておく必要はありません。** `hermes tools` では、Nous が運用するバックエンド（Web 検索、画像、動画、TTS、ブラウザー）が常に一覧に出ます。Nous Portal に一度もサインインしたことがなくても表示されます。選んだ時点でまだ認証されていなければ、Hermes がその場で Portal のログインを走らせます。事前に `hermes model` を実行する必要はありません。Nous の OAuth がすでに有効なら、バックエンドを選んだ時点で追加のプロンプト無しに有効になります。この経路でログインと、選んだ 1 つのツールの有効化だけが行われます。推論プロバイダーは切り替わり**ませんし**、他のすべてのツールについてゲートウェイを有効にするかを聞かれることも**ありません**。

いま何が有効かは、いつでも確認できます。

```bash
hermes portal info        # Portal auth + Tool Gateway routing summary
hermes portal tools       # Gateway catalog with current routing per tool
hermes status             # Full system status (Tool Gateway is one section)
```

`hermes portal info` は次のような欄を表示します。

```
◆ Nous Tool Gateway
  Nous Portal     ✓ managed tools available
  Web tools       ✓ active via Nous subscription
  Image gen       ✓ active via Nous subscription
  TTS             ✓ active via Nous subscription
  Browser         ○ active via Browser Use key
```

「active via Nous subscription」と付いているツールがゲートウェイ経由です。それ以外は自分のキーを使っています。

## 利用条件 {#eligibility}

Tool Gateway は**有料サブスクリプション**の機能です。ゲートウェイを解放するには[プランをアップグレード](https://portal.nousresearch.com/manage-subscription)してください。

一部のアカウントには**無料のツール枠**も付いています。これは少量の運用ツール用の割り当てで、有料サブスクリプション無しでもゲートウェイのツール呼び出しをまかなえます。無料枠が使える場合、ゲートウェイがそれを提示し、初回利用時に設定のプロンプトを出すので、そのまま運用ツールを使い始められます。

## 有効化のチェックリスト {#the-enablement-checklist}

Nous のモデルを選ぶ（`hermes model`）と、ゲートウェイのバックエンドをツール単位で選ぶチェックリストが出ます。その動きは、いまの設定を尊重します。

- 別のバックエンドを明示的に指定してあるツール（例: `web.backend: searxng`、`browser.cloud_provider: camofox`）は**そもそも提示されません**。選択がうっかり上書きされることはありません。
- 環境変数だけで設定されているツール（例: `SEARXNG_URL`、`CAMOFOX_URL`）は、自分のバックエンドを保つという注記付きで、**チェックが外れた状態**で提示されます。
- 本当に未設定のツールだけが、あらかじめチェックされた状態になります。
- 断った選択は残ります。チェックを外したままチェックリストを確定すると、その後 Nous のモデルに切り替えたときにも、あらかじめチェックされることはありません（`config.yaml` の `tool_gateway_declined_tools` に保存されます。あとでチェックを入れれば、その記録は消えます）。

## 好きに組み合わせる {#mix-and-match}

ゲートウェイはツール単位です。欲しいところだけ有効にできます。

- **すべてを Nous 経由に** — いちばん簡単です。サブスクリプション 1 つで完了します。
- **Web と画像はゲートウェイ、TTS は自前** — ElevenLabs の声はそのままに、残りを Nous に任せます。
- **キーを持っていないものだけゲートウェイ経由に** — 「Browserbase にはすでに払っているが、Web 検索のアカウントは作りたくない」といった使い方もできます。

どのツールも、いつでも次のコマンドで切り替えられます。

```bash
hermes tools          # Interactive picker for each tool category
```

ツールを選び、プロバイダーとして **Nous Subscription**（または好みの直接プロバイダー）を選びます。設定ファイルを編集する必要はありません。まだ Nous Portal にログインしていない場合は、**Nous Subscription** を選んだ時点で Portal のログインがその場で始まります。先に `hermes model` で認証しておく必要はありません。

## 画像モデルを個別に使う {#using-individual-image-models}

画像生成は速さを優先して FLUX 2 Klein 9B を既定にしています。呼び出しごとに変えたい場合は、`image_generate` ツールにモデル ID を渡してください。

| モデル | ID | 向いている用途 |
|---|---|---|
| FLUX 2 Klein 9B | `fal-ai/flux-2/klein/9b` | 高速。既定として使いやすい |
| FLUX 2 Pro | `fal-ai/flux-2-pro` | より忠実度の高い FLUX |
| Z-Image Turbo | `fal-ai/z-image/turbo` | 様式的で高速 |
| Nano Banana Pro | `fal-ai/nano-banana-pro` | Google Gemini 3 Pro Image |
| GPT Image 1.5 | `fal-ai/gpt-image-1.5` | OpenAI の画像生成。テキストと画像の両方 |
| GPT Image 2 | `fal-ai/gpt-image-2` | OpenAI の最新版 |
| Ideogram V3 | `fal-ai/ideogram/v3` | プロンプトへの忠実さと文字組みに強い |
| Recraft V4 Pro | `fal-ai/recraft/v4/pro/text-to-image` | ベクター調、グラフィックデザイン向け |
| Qwen Image | `fal-ai/qwen-image` | Alibaba のマルチモーダル |

顔ぶれは移り変わります。`hermes tools` → Image Generation で、現在の一覧を確認できます。

**Krea 2**（Medium、Large、Medium Turbo — 画風の参考画像を最大 10 枚まで、任意で Enhance による高解像度化）と、Nous Portal の画像モデルは、それぞれ専用の行を持つのではなく、同じ **Nous Subscription** のモデル選択の中に並びます。どのモデルも 1 回だけ出てきて、Krea の ID（`krea-2-medium` など）を選ぶと、リクエストの宛先が FAL ではなく Krea のゲートウェイになります。設定としては、これまでどおり `image_gen.provider: nous` とモデルの ID を書くだけです。Krea と Portal のモデルには有料のサブスクリプションが必要で、無料のツール枠がまかなうのは FAL のモデルだけです。

---

## 設定の早見表 {#configuration-reference}

ほとんどの人はここを触る必要がありません。`hermes model` と `hermes tools` が、対話形式ですべての操作をカバーします。この節は、config.yaml を直接書く場合や、設定をスクリプト化する場合のためのものです。

### ツール分類ごとに選択キーは 1 つ {#one-selection-key-per-tool-category}

ツールの分類それぞれに、プロバイダーを選ぶキーが 1 つだけあります。書き込むのは `hermes tools` のピッカー（またはデスクトップアプリの画面）です。**Nous Subscription** の行を選ぶと値 `nous` が保存され、その分類は運用型の Tool Gateway 経由になります。自前キー（BYOK）の行を選ぶとベンダー名（`fal`、`openai`、`firecrawl`、`browser-use` など）が保存され、自分の認証情報で直接つながります。

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

実行時は**常に保存された選択が使われます**。認証情報があるかどうかで分類が選ばれたり、経路が変わったりすることはありません。`image_gen.provider: nous` のあいだ、`.env` に置かれた `FAL_KEY` は無視されます。逆に `image_gen.provider: fal` なのに `FAL_KEY` が設定されていなければ、黙ってゲートウェイへ落ちるのではなく、はっきりしたエラーが出ます。

```
image_gen is configured to use fal (set via hermes tools), but FAL_KEY is not set. Run 'hermes tools' to change it.
```

**一度も設定したことがない**分類（選択キーが書かれたことのない分類）は、これまでどおり利用できる認証情報から自動判定します。ただし選択がいったん存在すると、`.env` にキーを足しても経路は変わりません。変えられるのは `hermes tools`（または選択キーの編集）だけです。

### 自分のキーに戻す {#switching-back-to-your-own-keys}

```bash
hermes tools    # pick the tool → choose a direct provider (e.g. Firecrawl)
```

あるいは、選択キーを直接書きます。

```yaml
web:
  backend: firecrawl   # Hermes now uses FIRECRAWL_API_KEY from .env
```

### 旧来の `use_gateway` フラグ（非推奨） {#legacy-usegateway-flag-deprecated}

古い Hermes では、ツールごとの `use_gateway: true` という真偽値でゲートウェイ経由にしていました。このフラグは**旧来のもの**です。今は書き込まれることがなく、`hermes tools` のピッカーが選択を書き直すときに、その分類の設定から取り除きます。`use_gateway: true` がまだ残っている古い設定は、読み込み時に `nous` の選択として解釈されるので、既存の環境はそのまま動きます。新しい設定に `use_gateway` を書かないでください。代わりに `hermes tools` でプロバイダーを選んでください。

### 自前で動かすゲートウェイ（上級者向け） {#self-hosted-gateway-advanced}

Nous 互換のゲートウェイを自分で運用していますか。その場合は `~/.hermes/.env` でエンドポイントを上書きします。

```bash
TOOL_GATEWAY_DOMAIN=your-domain.example.com
TOOL_GATEWAY_SCHEME=https
TOOL_GATEWAY_USER_TOKEN=your-token        # normally auto-populated from Portal login
FIRECRAWL_GATEWAY_URL=https://...         # override one endpoint specifically
TOOL_GATEWAY_URL=http://127.0.0.1:3009    # pin the shared managed origin exactly
CONNECTOR_GATEWAY_URL=http://127.0.0.1:3009 # pin the connectors origin exactly
```

ホスト名はすべて `{label}-gateway.<domain>` の形で、`TOOL_GATEWAY_DOMAIN` と `TOOL_GATEWAY_SCHEME` は**そのすべて**を作り変えます。`{LABEL}_GATEWAY_URL` は 1 つのホストを厳密に固定し、この組み立てを飛ばします。

- `{vendor}-gateway.<domain>` — ベンダーごとの中継（Firecrawl、BFL など）。
- `tool-gateway.<domain>` — 共有の運用オリジン。ゲートウェイ自身でホストしているベンダーと、メディアのアップロードが通ります。
- `connector-gateway.<domain>` — コネクター API（`/v1/connectors/*`）。これ自体が別のデプロイです。[ツール検索 → コネクター](/hermes/docs/user-guide/features/tool-search/#connectors-remote-tools)を参照してください。

これらのつまみは、独自基盤（企業向けの配備や開発環境）のためにあります。通常の契約者が設定することはありません。

## よくある質問 {#faq}

### Telegram や Discord など、他のメッセージ連携でも動きますか {#does-it-work-with-telegram-discord-the-other-messaging-gateways}

動きます。Tool Gateway は CLI ではなく、ツール実行の層で働きます。ツールを呼べるすべての窓口（CLI、Telegram、Discord、Slack、IRC、Teams、API サーバー、そのほか何でも）が、意識しないまま恩恵を受けます。

### サブスクリプションが切れたらどうなりますか {#what-happens-if-my-subscription-expires}

ゲートウェイ経由のツールは、更新するか `hermes tools` で直接の API キーに差し替えるまで動かなくなります。Hermes はポータルを指し示す分かりやすいエラーを表示します。

### ツールごとの利用量やコストは見られますか {#can-i-see-usage-or-costs-per-tool}

見られます。[Nous Portal のダッシュボード](https://portal.nousresearch.com)が利用量をツール別に分解して表示するので、何が請求額を押し上げているのか分かります。

### Modal（サーバーレスのターミナル）は含まれますか {#is-modal-serverless-terminal-included}

Modal は Nous のサブスクリプションを通じた**任意の追加オプション**で、既定の Tool Gateway 一式には含まれません。シェル実行のためのリモートサンドボックスが欲しくなったら、`hermes setup terminal` か `config.yaml` を直接編集して設定してください。

### ゲートウェイを有効にしたら、いま持っている API キーは消すべきですか {#do-i-need-to-delete-my-existing-api-keys-when-i-enable-the-gateway}

いいえ、`.env` に残しておいてください。ツールの選択が **Nous Subscription** のあいだ、そのツールの直接キーはただ無視されます。`hermes tools` でもう一度直接プロバイダーを選べば、キーがまた使われるようになります。ゲートウェイは囲い込みではありません。
