---
title: "画像生成"
description: "FAL.ai を通じて画像を生成します。FLUX 2、GPT Image（1.5 と 2）、Nano Banana Pro、Ideogram、Recraft V4 Pro、Krea 2 など 11 モデルに対応していて、`hermes tools` で切り替えられます。"
upstream_path: user-guide/features/image-generation.md
upstream_blob: f9ad545524938f9b56bea4a1acd2f7ef25f44ecf
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/image-generation
---

# 画像生成 {#image-generation}

Hermes Agent は FAL.ai を通じて、文章の指示から画像を作ります。最初から 11 のモデルが使えて、速度・品質・料金の兼ね合いがそれぞれ違います。どのモデルを使うかは `hermes tools` で選べて、選んだ内容は `config.yaml` に残ります。

## 対応モデル {#supported-models}

| モデル | 速度 | 得意なこと | 価格 |
|---|---|---|---|
| `fal-ai/flux-2/klein/9b` *(既定)* | `<1s` | 速く、文字がくっきり出ます | $0.006/MP |
| `fal-ai/flux-2-pro` | 約6秒 | スタジオ撮影のような写実性 | $0.03/MP |
| `fal-ai/z-image/turbo` | 約2秒 | 英語と中国語の二言語対応、6B パラメータ | $0.005/MP |
| `fal-ai/nano-banana-pro` | 約8秒 | Gemini 3 Pro ベース、考えの深さ、文字の描画 | $0.15/画像（1K） |
| `fal-ai/gpt-image-1.5` | 約15秒 | 指示への忠実さ | $0.034/画像 |
| `fal-ai/gpt-image-2` | 約20秒 | 最高水準の文字描画と日中韓文字、現実を踏まえた写実性 | $0.04〜0.06/画像 |
| `fal-ai/ideogram/v3` | 約5秒 | 文字組みが最も得意 | $0.03〜0.09/画像 |
| `fal-ai/recraft/v4/pro/text-to-image` | 約8秒 | デザイン、ブランドの体系、そのまま使える仕上がり | $0.25/画像 |
| `fal-ai/qwen-image` | 約12秒 | LLM ベース、込み入った文字 | $0.02/MP |
| `fal-ai/krea/v2/medium/text-to-image` | 約15〜25秒 | イラスト、アニメ、絵画、表情豊かで芸術的な作風 | $0.030〜0.035/画像 |
| `fal-ai/krea/v2/large/text-to-image` | 約25〜60秒 | 写実性、粗い質感（ブレ、粒状感、フィルム調） | $0.060〜0.065/画像 |

価格は執筆時点の FAL のものです。最新の数字は [fal.ai](https://fal.ai/) で確かめてください。

## 設定 {#setup}

:::tip Nous の購読者の方へ
有料の [Nous Portal](https://portal.nousresearch.com) を購読していれば、FAL の API キーがなくても **[ツールゲートウェイ](/hermes/docs/user-guide/features/tool-gateway/)** から画像生成を使えます。選んだモデルはどちらの経路でも共通で残ります。新しく入れる場合は `hermes setup --portal` でログインすれば、ゲートウェイのツールをまとめて有効にできます。すでに入れてある場合は `hermes tools` で画像生成のバックエンドとして **Nous Subscription** を選んでください。

managed ゲートウェイが特定のモデルで `HTTP 4xx` を返したときは、そのモデルがまだポータル側で中継されていないということです。エージェントがその旨と対処法（`hermes tools` で FAL.ai に切り替えて自分の `FAL_KEY` で直接つなぐか、別のモデルを選ぶ）を教えてくれます。
:::

### FAL の API キーを取得する {#get-a-fal-api-key}

1. [fal.ai](https://fal.ai/) で登録します
2. ダッシュボードから API キーを発行します

### 設定してモデルを選ぶ {#configure-and-pick-a-model}

ツールのコマンドを実行します。

```bash
hermes tools
```

**🎨 Image Generation** に進んでバックエンド（Nous Subscription か FAL.ai）を選ぶと、対応モデルが列の揃った表で並びます。矢印キーで移動し、Enter で決定します。

```
  Model                          Speed    Strengths                    Price
  fal-ai/flux-2/klein/9b         <1s      Fast, crisp text             $0.006/MP   ← currently in use
  fal-ai/flux-2-pro              ~6s      Studio photorealism          $0.03/MP
  fal-ai/z-image/turbo           ~2s      Bilingual EN/CN, 6B          $0.005/MP
  ...
```

選んだ内容は `config.yaml` に保存されます。

```yaml
image_gen:
  provider: fal                 # `nous` if you picked Nous Subscription
  model: fal-ai/flux-2/klein/9b
  max_parallel_requests: 4      # concurrent images in one tool-call batch
```

選択を決めているのは `image_gen.provider` の一箇所だけです。`nous` なら managed のツールゲートウェイ経由、ベンダー名（`fal`、`openai`、`xai`、`krea` など）なら自分のキーで直接つなぎます。実行時は必ずこの保存された選択に従います。`provider: nous` のあいだは `.env` の `FAL_KEY` は読まれませんし、`provider: fal` なのに `FAL_KEY` がなければ黙って別経路に回すことはせず、`image_gen is configured to use fal (set via hermes tools), but FAL_KEY is not set. Run 'hermes tools' to change it.` というエラーになります。切り替えはキーを足したり消したりするのではなく、`hermes tools` から行ってください。（古い `use_gateway` の真偽値は名残です。`true` のときは `nous` として読みますが、もう書き込まれることはありません。）

`max_parallel_requests` の既定は `4` です。Hermes はこの値を最低 1 に、上はツールワーカー全体の上限に収めます。おかげで画像の生成先には限度のある数の並列リクエストだけが届き、画像のまとめ生成がエージェント全体の同時実行の上限を飛び越えることもありません。

### OpenRouter：Image API のカタログ全部 {#openrouter-the-full-image-api-catalog}

`image_gen.provider: openrouter` にすると、モデル選択の画面に OpenRouter の
画像カタログが丸ごと並びます。専用の
[Image API](https://openrouter.ai/docs/guides/overview/multimodal/image-generation)
のモデル（Seedream、FLUX.2、Recraft、Qwen Image、MAI、Krea、Riverflow、Grok
Imagine ほか 40 以上）と、チャット補完側の画像モデルを合わせたものです。
カタログは `GET /images/models` と `GET /models` からその場で取ってくるので、
OpenRouter が新しいモデルを出せばすぐ画面に現れます。Hermes を更新する必要は
ありません。生成のときは、そのモデルを提供している側（専用の
`POST /images/generations` か、チャット補完か）へ自動で振り分けます。
Nous Portal が中継するのはチャット補完の方式だけなので、こちらの選択画面には
チャット経由のモデルが並びます。

Image API のモデルにリクエストごとの細かい指定をしたいときは、専用の設定欄
（または `OPENROUTER_IMAGE_API_*` の環境変数）に書きます。

```yaml
image_gen:
  provider: openrouter
  model: bytedance-seed/seedream-4.5
  openrouter:
    resolution: 2K        # model-dependent: 1K / 2K / 4K
    quality: high         # gpt-image models
    output_format: png
```

### GPT-Image の品質 {#gpt-image-quality}

`fal-ai/gpt-image-1.5` と `fal-ai/gpt-image-2` へのリクエストは、品質を `medium` に固定しています（1024×1024 でおよそ $0.034〜$0.06/画像）。`low` と `high` の段階を選べるようにしていないのは、Nous Portal の請求額を誰にとっても見通しやすく保つためです。段階ごとの費用差は 3〜22 倍にもなります。もっと安く済ませたいなら Klein 9B か Z-Image Turbo を、もっと品質を上げたいなら Nano Banana Pro か Recraft V4 Pro を選んでください。

### Meta Model API：Muse Image {#meta-model-api-muse-image}

`image_gen.provider: meta-ai` にすると、画像は
[Meta Model API](https://api.meta.ai)（`https://api.meta.ai/v1`）で生成されます。
Muse Spark のチャットモデルを提供しているのと同じ、OpenAI 互換の
エンドポイントです。同梱の `meta-ai` チャットプロバイダの、画像生成版にあたります。

| モデル | 速度 | 得意なこと | 価格 |
|---|---|---|---|
| `muse-image-1.0` *(既定)* | 約10秒 | Meta Model API による画像生成 | $0.01/画像 |

```yaml
image_gen:
  provider: meta-ai
  model: muse-image-1.0
```

認証は Meta のチャットプロバイダと同じ環境変数を使い回します。Meta が文書で挙げている名前は
`MODEL_API_KEY` で、別名として `META_API_KEY` と `META_MODEL_API_KEY` も受け付けます。
プロキシや別のホストに向けたいときは `META_BASE_URL` を設定します。いまのところ
文章からの画像生成のみで、返ってきた画像は `$HERMES_HOME/cache/images/` に保存されます。

## 使い方 {#usage}

エージェントから見えるスキーマは、あえて最小限にしてあります。設定した内容はモデル側が拾ってくれます。

```
Generate an image of a serene mountain landscape with cherry blossoms
```

```
Create a square portrait of a wise old owl — use the typography model
```

```
Make me a futuristic cityscape, landscape orientation
```

## 画像から画像へ（編集） {#image-to-image-editing}

同じ `image_generate` ツールは、選んでいるモデルが対応していれば**すでにある画像を編集**もします。
元になる画像を渡せば、バックエンドが編集用のエンドポイントへ自動で振り分けます
（`video_generate` が画像から動画を作るときと同じ考え方です）。
元画像を渡さなければ、ふつうの文章からの画像生成になります。

```
Take this photo and make it a rainy Tokyo street at night → <image>
```

```
Blend these two product shots into one hero image → <image1> <image2>
```

編集を動かすのは、次の 2 つの入力です。

- **`image_url`** — 編集・変換のもとになる主な画像です（公開 URL かローカルのパス）。
- **`reference_image_urls`** — 作風や構図の参考にする追加の画像です（上限はモデルごとに決まっています）。

### 編集に対応しているバックエンド {#which-backends-support-editing}

| バックエンド | 画像から画像へ | 参考画像の上限 | やり方 |
|---|---|---|---|
| **FAL.ai**（下に挙げた編集対応モデル） | ✓ | 9 枚まで | そのモデルの `/edit` エンドポイントへ回します |
| **OpenAI**（`gpt-image-2`） | ✓ | 16 枚まで | `images.edit()` |
| **xAI**（Grok Imagine） | ✓ | 1 | `/v1/images/edits`（`grok-imagine-image-quality`） |
| **Krea**（`Krea 2`） | ✓ | 10 枚まで | 参考画像に沿った生成（`image_style_references`） |
| **OpenAI（Codex 認証）** | ✓ | 16 枚まで | Codex Responses の `image_generation` ツールに `input_image` の内容部分を渡します |
| **OpenRouter**（Image API のモデル） | ✓ | 14〜16 枚まで（モデルによる） | `POST /images/generations` の `input_references`。チャット経由のモデルは `image_url` の内容部分を使います（3 枚まで） |

編集エンドポイントを持つ FAL のモデルは `flux-2/klein/9b`、`flux-2-pro`、
`nano-banana-pro`、`gpt-image-1.5`、`gpt-image-2`、`ideogram/v3`、
`qwen-image` です。文章から画像を作るだけの FAL のモデル（`z-image/turbo`、`recraft`、
`krea/*`）は画像の入力を受け付けず、編集できるモデルを案内するはっきりした
エラーを返します。

:::note OpenAI（Codex 認証）はうまくいけば動く、という位置づけです

Codex 側（`chatgpt.com/backend-api/codex`）は `image_generation` を
チャットモデルが呼べるツールとして持っていますが、Hermes からその呼び出しを
強制はできません。ホストされたツールに対しては、バックエンドがどんな形の
`tool_choice` も受け付けないためで、指示によってモデルを誘導するしかありません。
ホスト側のモデルがツールを呼ばないと判断した場合、その呼び出しは
`empty_response` で失敗します。そもそもホストされた画像ツールに届くかどうかも、
アカウントによって違うという報告があります。画像生成を確実に動かしたいなら、
**OpenAI**（API キー）、**FAL**、**xAI** のいずれかを設定してください。

:::

いま選んでいるモデルが編集できるかどうかは、実行時のツール説明に出ます。
だからエージェントは、ツールを呼ぶ前に `image_url` が効くかどうかを知っています。

## 縦横比 {#aspect-ratios}

エージェントから見ると、どのモデルも同じ 3 つの縦横比を受け付けます。内部では、モデルごとの本来のサイズ指定が自動で埋められます。

| エージェントの入力 | image_size（flux/z-image/qwen/recraft/ideogram） | aspect_ratio（nano-banana-pro） | image_size（gpt-image-1.5） | image_size（gpt-image-2） |
|---|---|---|---|---|
| `landscape` | `landscape_16_9` | `16:9` | `1536x1024` | `landscape_4_3`（1024×768） |
| `square` | `square_hd` | `1:1` | `1024x1024` | `square_hd`（1024×1024） |
| `portrait` | `portrait_16_9` | `9:16` | `1024x1536` | `portrait_4_3`（768×1024） |

GPT Image 2 が 16:9 ではなく 4:3 の設定に対応づけられているのは、最小の画素数が 655,360 だからです。`landscape_16_9`（1024×576 = 589,824）では拒否されてしまいます。

この読み替えは `_build_fal_payload()` の中で起こります。エージェント側のコードは、モデルごとのスキーマの違いを知らずに済みます。

## 拡大 {#upscaling}

### 頼んだときだけ動きます {#opt-in-only}

既定で拡大するモデルはありません。いまどきの画像モデルはそのままでも最良の品質を
出しますし、使える拡大処理はどれも*創作寄り*の加工（拡散モデルによる描き直し）で、
中身をわずかに描き変えてしまうことがあります。描かれた文字や顔、細かいところが
損なわれるのはそのためです。拡大は、エージェントがはっきり求めたときだけ走ります。

### `upscale` パラメータ（呼び出しごとに指定します） {#the-upscale-parameter-per-call-opt-in}

- `upscale: true` — 生成のあとに高解像度化の工程をつなげます。

| バックエンド | 拡大処理 |
|---|---|
| **FAL.ai** | Clarity Upscaler（2 倍、+$0.03/MP） |
| **Krea** | Krea Enhance（2 倍、上限は 8K） |
| その他のバックエンド | 拡大処理なし。そのままの解像度で返ります |

- `upscale: false` または省略 — そのままの解像度です（既定）

`video_generate` も FAL のバックエンドで `upscale: true` を受け付け、生成のあとに
ByteDance の **SeedVR2** という動画の拡大処理（2 倍、出力動画の $0.001/MP）をつなげます。

FAL の画像拡大が走るときは、次の設定を使います。

| 設定 | 値 |
|---|---|
| 拡大倍率 | 2 倍 |
| Creativity | 0.35 |
| Resemblance | 0.6 |
| Guidance scale | 4 |
| 推論ステップ数 | 18 |

拡大に失敗したとき（通信の不調やレート制限）は、もとの画像がそのまま返ります。応答には `upscaled: true/false` が入るので、エージェントはどちらの解像度を受け取ったか分かります。

## 内部での動き {#how-it-works-internally}

1. **モデルの決定** — `_resolve_fal_model()` が `config.yaml` の `image_gen.model` を読み、なければ環境変数 `FAL_IMAGE_MODEL`、それもなければ `fal-ai/flux-2/klein/9b` に落ちます。
2. **リクエストの組み立て** — `_build_fal_payload()` が指定された `aspect_ratio` をモデル本来の形式（プリセットの列挙値、縦横比の列挙値、GPT のリテラル）に読み替え、モデルの既定パラメータを混ぜ、呼び出し側の上書きを当て、最後にモデルの `supports` の許可一覧で絞り込みます。対応していないキーが送られることはありません。
3. **送信** — `_submit_fal_request()` が、保存されている `image_gen.provider` の選択に従って、FAL の資格情報で直接つなぐか managed の Nous ゲートウェイを通すかを決めます。
4. **拡大** — エージェントが `upscale: true` を渡したときだけ走ります。カタログ上の既定は全モデルで無効です。
5. **受け渡し** — 最終的な画像 URL がエージェントに返り、エージェントは `MEDIA:<url>` というタグを出します。これを各プラットフォームのアダプタが、その場に合った形のメディアに変換します。

## デバッグ {#debugging}

デバッグログを有効にします。

```bash
export IMAGE_TOOLS_DEBUG=true
```

デバッグログは `./logs/image_tools_debug_<session_id>.json` に出て、呼び出しごとの詳細（モデル、パラメータ、所要時間、エラー）が記録されます。

## プラットフォームごとの届き方 {#platform-delivery}

| プラットフォーム | 届き方 |
|---|---|
| **CLI** | 画像 URL がマークダウンの `![](url)` として表示されます。クリックで開きます |
| **Telegram** | 指示文をキャプションに付けた写真メッセージ |
| **Discord** | メッセージに埋め込まれます |
| **Slack** | Slack が URL を展開します |
| **WhatsApp** | メディアメッセージ |
| **その他** | ただの文字列としての URL |

## 制限 {#limitations}

- 選んでいるバックエンドの**資格情報が要ります**（FAL の `FAL_KEY` か Nous のサブスクリプション、`OPENAI_API_KEY`、xAI の OAuth、`KREA_API_KEY`）
- **編集できるかはモデル次第です** — 画像から画像への変換は編集に対応したモデルでしか動きません（上の表を参照）。文章から画像を作るだけのモデルは、画像の入力をはっきりしたエラーで断ります
- **URL は一時的です** — バックエンドが返す URL は数時間から数日で切れます。Hermes はそれをローカルのキャッシュに落とすので、期限が切れたあとでも届けられます
- **モデルごとの制約があります** — `seed` や `num_inference_steps` などに対応していないモデルもあります。`supports` と `edit_supports` の絞り込みが、対応していないパラメータを黙って落とします。これは想定どおりの動きです
