---
title: "画像を作る"
description: "FAL.ai を通して画像を作ります。FLUX 2、GPT Image（1.5 と 2）、Nano Banana Pro、Ideogram、Recraft V4 Pro、Krea 2 など11のモデルから、`hermes tools` で選べます。"
upstream_path: user-guide/features/image-generation.md
upstream_blob: 33c4abc7477c3d826b8c7baa64337d4247f51891
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/image-generation
---

# 画像を作る {#image-generation}

Hermes Agent は、FAL.ai を通して文章から画像を作ります。最初から11のモデルが使えて、それぞれ速さ・仕上がり・値段の釣り合いが違います。どれを使うかは `hermes tools` で選べて、選んだ内容は `config.yaml` に残ります。

## 使えるモデル {#supported-models}

| モデル | 速さ | 得意なこと | 値段 |
|---|---|---|---|
| `fal-ai/flux-2/klein/9b` *(既定)* | `<1s` | 速い。文字がくっきり出る | $0.006/MP |
| `fal-ai/flux-2-pro` | 約6秒 | スタジオ撮影のような写実 | $0.03/MP |
| `fal-ai/z-image/turbo` | 約2秒 | 英語と中国語の両対応、60億パラメータ | $0.005/MP |
| `fal-ai/nano-banana-pro` | 約8秒 | Gemini 3 Pro。考える深さ、文字の描き込み | $0.15/image (1K) |
| `fal-ai/gpt-image-1.5` | 約15秒 | 指示のとおりに描く | $0.034/image |
| `fal-ai/gpt-image-2` | 約20秒 | 文字と CJK の描き込みが最高水準。実世界に沿った写実 | $0.04–0.06/image |
| `fal-ai/ideogram/v3` | 約5秒 | 文字組みが最良 | $0.03–0.09/image |
| `fal-ai/recraft/v4/pro/text-to-image` | 約8秒 | デザイン、ブランドの体系、そのまま使える仕上がり | $0.25/image |
| `fal-ai/qwen-image` | 約12秒 | 言語モデル由来。込み入った文字に強い | $0.02/MP |
| `fal-ai/krea/v2/medium/text-to-image` | 約15〜25秒 | イラスト、アニメ、絵画、表情豊かな作風 | $0.030–0.035/image |
| `fal-ai/krea/v2/large/text-to-image` | 約25〜60秒 | 写実、ざらつきのある質感（ぶれ、粒子、フィルム調） | $0.060–0.065/image |

値段は執筆時点の FAL のものです。最新の数字は [fal.ai](https://fal.ai/) で確かめてください。

## 準備 {#setup}

:::tip Nous を契約している方へ
[Nous Portal](https://portal.nousresearch.com) の有料の契約があれば、FAL の API キーなしで **[道具のゲートウェイ](/hermes/docs/user-guide/features/tool-gateway/)** を通して画像を作れます。選んだモデルは、どちらの経路でも同じものが使われます。新しく入れる場合は `hermes setup --portal` でログインすれば、ゲートウェイの道具をまとめて有効にできます。すでに入れてある場合は、`hermes tools` で画像作成の送り先として **Nous Subscription** を選びます。

管理されたゲートウェイが特定のモデルで `HTTP 4xx` を返したら、そのモデルはまだ Portal 側で中継されていません。その場合は、どう直せばよいかを添えて知らせてくれます（`hermes tools` で FAL.ai に切り替えて自分の `FAL_KEY` で直につなぐか、別のモデルを選ぶか）。
:::

### FAL の API キーを取る {#get-a-fal-api-key}

1. [fal.ai](https://fal.ai/) で登録します
2. ダッシュボードから API キーを作ります

### 設定してモデルを選ぶ {#configure-and-pick-a-model}

道具のコマンドを走らせます。

```bash
hermes tools
```

**🎨 Image Generation** に進んで送り先（Nous Subscription か FAL.ai）を選ぶと、使えるモデルが桁のそろった表で出てきます。矢印キーで動かし、Enter で決めます。

```
  Model                          Speed    Strengths                    Price
  fal-ai/flux-2/klein/9b         <1s      Fast, crisp text             $0.006/MP   ← currently in use
  fal-ai/flux-2-pro              ~6s      Studio photorealism          $0.03/MP
  fal-ai/z-image/turbo           ~2s      Bilingual EN/CN, 6B          $0.005/MP
  ...
```

選んだ内容は `config.yaml` に残ります。

```yaml
image_gen:
  provider: fal                 # `nous` if you picked Nous Subscription
  model: fal-ai/flux-2/klein/9b
  max_parallel_requests: 4      # concurrent images in one tool-call batch
```

送り先を決めるのは `image_gen.provider` の一箇所だけです。`nous` なら管理された道具のゲートウェイを通り、提供元の名前（`fal`、`openai`、`xai`、`krea` など）なら自分のキーで直につなぎます。実行時は必ずこの設定に従います。`provider: nous` のあいだは `.env` の `FAL_KEY` は見ませんし、`provider: fal` なのに `FAL_KEY` がなければ、黙って別の経路に回すのではなく `image_gen is configured to use fal (set via hermes tools), but FAL_KEY is not set. Run 'hermes tools' to change it.` と伝えて止まります。送り先を変えるときは、キーを足したり消したりするのではなく `hermes tools` で変えてください。（昔の `use_gateway` という真偽値は名残です。`true` なら `nous` として読みますが、もう書き込まれることはありません。）

`max_parallel_requests` の既定は `4` です。Hermes は最低でも1、上は全体の道具の同時実行数の上限までに収めます。そのため、画像の提供元へは限られた数だけ同時に頼みが飛び、まとめて画像を作るときでも全体の上限を飛び越えません。

### OpenRouter を使うと画像の一覧をまるごと選べます {#openrouter-the-full-image-api-catalog}

`image_gen.provider: openrouter` にすると、モデルの選択画面に OpenRouter で今使える画像モデルが全部並びます。画像専用の
[Image API](https://openrouter.ai/docs/guides/overview/multimodal/image-generation)
のモデル（Seedream、FLUX.2、Recraft、Qwen Image、MAI、Krea、Riverflow、Grok
Imagine など40以上）に、会話の仕組みで画像を作るモデルを合わせたものです。
一覧は `GET /images/models` と `GET /models` からその都度取ってくるので、
OpenRouter が新しいモデルを出せばそのまま選べるようになります。Hermes を更新する必要はありません。作るときは、そのモデルを扱っている側（画像専用の `POST /images/generations` か、会話の仕組みか）へ自動で振り分けられます。
Nous Portal が中継するのは会話の仕組みだけなので、そちらの選択画面には会話で扱えるモデルだけが出ます。

Image API のモデルには、1回ごとの細かい指定を設定の下位の節（または `OPENROUTER_IMAGE_API_*` という環境変数）で渡せます。

```yaml
image_gen:
  provider: openrouter
  model: bytedance-seed/seedream-4.5
  openrouter:
    resolution: 2K        # model-dependent: 1K / 2K / 4K
    quality: high         # gpt-image models
    output_format: png
```

### GPT-Image の画質 {#gpt-image-quality}

`fal-ai/gpt-image-1.5` と `fal-ai/gpt-image-2` に頼むときの画質は `medium` に固定しています（1024×1024 でおよそ $0.034〜$0.06/image）。`low` や `high` を選べるようにしていないのは、Nous Portal の請求額を誰にとっても読みやすく保つためです。段階ごとの値段の開きが3倍から22倍もあるからです。もっと安くしたいなら Klein 9B か Z-Image Turbo を、もっと良い仕上がりが欲しいなら Nano Banana Pro か Recraft V4 Pro を選んでください。

## 使い方 {#usage}

指示できる形はあえて簡素にしてあります。設定しておいた内容をそのまま使うからです。

```
Generate an image of a serene mountain landscape with cherry blossoms
```

```
Create a square portrait of a wise old owl — use the typography model
```

```
Make me a futuristic cityscape, landscape orientation
```

## 画像から画像を作る・手を入れる {#image-to-image-editing}

同じ `image_generate` は、使っているモデルが対応していれば**すでにある画像に手を入れる**こともできます。元になる画像を渡せば、送り先が自動でその編集用の口へ振り分けます（`video_generate` が画像から動画を作るときと同じ考え方です）。元の画像を渡さなければ、ただの文章からの画像作成になります。

```
Take this photo and make it a rainy Tokyo street at night → <image>
```

```
Blend these two product shots into one hero image → <image1> <image2>
```

手を入れるときの入り口は2つです。

- **`image_url`** — 手を入れたい、元になる画像そのもの（公開の URL か、手元の場所）。
- **`reference_image_urls`** — 作風や構図の参考にする画像を足すもの（枚数の上限はモデルごとに違います）。

### どの送り先が編集に対応しているか {#which-backends-support-editing}

| 送り先 | 画像から画像 | 参考画像の上限 | どうやって |
|---|---|---|---|
| **FAL.ai**（下に挙げた編集できるモデル） | ✓ | 9枚まで | そのモデルの `/edit` の口へ振り分けます |
| **OpenAI**（`gpt-image-2`） | ✓ | 16枚まで | `images.edit()` |
| **xAI**（Grok Imagine） | ✓ | 1枚 | `/v1/images/edits`（`grok-imagine-image-quality`） |
| **Krea**（`Krea 2`） | ✓ | 10枚まで | 参考画像に沿った作成（`image_style_references`） |
| **OpenAI（Codex の認証）** | ✓ | 16枚まで | Codex の Responses にある `image_generation` を、`input_image` の内容として使います |
| **OpenRouter**（Image API のモデル） | ✓ | 14〜16枚まで（モデルによる） | `POST /images/generations` の `input_references`。会話の仕組みで動くモデルは `image_url` の内容として渡します（3枚まで） |

FAL のモデルのうち編集の口を持つのは `flux-2/klein/9b`、`flux-2-pro`、
`nano-banana-pro`、`gpt-image-1.5`、`gpt-image-2`、`ideogram/v3`、
`qwen-image` です。文章からしか画像を作れない FAL のモデル（`z-image/turbo`、`recraft`、
`krea/*`）は、画像を渡すと、編集できるモデルを使うようはっきり伝えて断ります。

:::note OpenAI（Codex の認証）は当てにしきれません

Codex の側（`chatgpt.com/backend-api/codex`）は `image_generation` を、会話モデルが呼ぶかもしれない道具として置いています。Hermes からその呼び出しを強いることはできません。備え付けの道具に対しては `tool_choice` のどの書き方も拒まれるので、指示の文面でモデルを促すしかないからです。モデルが呼ばないと決めた場合、その頼みは `empty_response` として失敗します。そもそもこの備え付けの画像の道具に届くかどうかも、アカウントによって違うという報告があります。確実に画像を作りたいなら、**OpenAI**（API キー）、**FAL**、**xAI** のいずれかを設定してください。

:::

いま使っているモデルが編集に対応しているかどうかは、実行時に道具の説明として渡ります。そのため、呼ぶ前に `image_url` が効くかどうかが分かります。

## 画像の縦横比 {#aspect-ratios}

どのモデルでも、指示する側から見た縦横比は同じ3つです。内側では、モデルごとの本来の指定に自動で置き換わります。

| 指示する言葉 | image_size（flux/z-image/qwen/recraft/ideogram） | aspect_ratio（nano-banana-pro） | image_size（gpt-image-1.5） | image_size（gpt-image-2） |
|---|---|---|---|---|
| `landscape` | `landscape_16_9` | `16:9` | `1536x1024` | `landscape_4_3`（1024×768） |
| `square` | `square_hd` | `1:1` | `1024x1024` | `square_hd`（1024×1024） |
| `portrait` | `portrait_16_9` | `9:16` | `1024x1536` | `portrait_4_3`（768×1024） |

GPT Image 2 が 16:9 ではなく 4:3 の型に割り当てられているのは、画素数の下限が 655,360 だからです。`landscape_16_9`（1024×576 = 589,824）では断られてしまいます。

この置き換えは `_build_fal_payload()` の中で起きます。指示する側が、モデルごとの違いを知る必要はありません。

## 引き伸ばし {#upscaling}

### 頼んだときだけ {#opt-in-only}

どのモデルも、黙って引き伸ばすことはしません。今どきの画像モデルはそのままの大きさでいちばん良い絵を出しますし、使える引き伸ばしの道具は*描き足す*たぐいのもので、中身をわずかに描き変えてしまいます。描かれた文字や顔、細かいところが崩れる原因になります。引き伸ばしは、はっきり頼まれたときにだけ動きます。

### `upscale` の指定（呼ぶたびに頼む） {#the-upscale-parameter-per-call-opt-in}

- `upscale: true` — 作ったあとに、大きくする処理をつなげます。

| 送り先 | 引き伸ばしに使うもの |
|---|---|
| **FAL.ai** | Clarity Upscaler（2倍、+$0.03/MP） |
| **Krea** | Krea Enhance（2倍、8K まで） |
| そのほかの送り先 | 引き伸ばしはありません。そのままの大きさで返ります |

- `upscale: false`／書かない — そのままの大きさです（既定）

`video_generate` も FAL では `upscale: true` を受け取り、作ったあとに ByteDance の **SeedVR2** という動画の引き伸ばし（2倍、出来上がった動画の $0.001/MP）をつなげます。

FAL で画像を引き伸ばすときは、次の値が使われます。

| 項目 | 値 |
|---|---|
| 拡大の倍率 | 2倍 |
| 描き足しの強さ | 0.35 |
| 元の絵への忠実さ | 0.6 |
| 誘導の強さ | 4 |
| 処理の回数 | 18 |

引き伸ばしに失敗したら（通信の不調や回数の制限など）、元の画像がそのまま返ります。返事には `upscaled: true/false` が入るので、どちらの大きさで返ってきたかが分かります。

## 内側でどう動いているか {#how-it-works-internally}

1. **モデルを決める** — `_resolve_fal_model()` が `config.yaml` の `image_gen.model` を読み、なければ環境変数 `FAL_IMAGE_MODEL`、それもなければ `fal-ai/flux-2/klein/9b` を使います。
2. **頼みを組み立てる** — `_build_fal_payload()` が `aspect_ratio` をモデル本来の書き方（決まった名前、縦横比の名前、GPT の文字列）に置き換え、そのモデルの既定の値を混ぜ、呼び出し側の指定で上書きし、最後にそのモデルの `supports` に載っているものだけに絞ります。対応していない項目が送られることはありません。
3. **送る** — `_submit_fal_request()` が、残してある `image_gen.provider` の設定に従って、FAL の認証情報で直につなぐか、管理された Nous のゲートウェイを通すかを決めます。
4. **引き伸ばす** — `upscale: true` が渡されたときだけ動きます。一覧に載っているどのモデルも、既定では止まっています。
5. **届ける** — 出来上がった画像の URL が返り、`MEDIA:<url>` という印が付きます。各サービスの受け口が、これをその場に合った形の画像に変えます。

## 不具合を調べる {#debugging}

詳しい記録を出します。

```bash
export IMAGE_TOOLS_DEBUG=true
```

記録は `./logs/image_tools_debug_<session_id>.json` に残り、呼び出しごとの中身（モデル、指定、かかった時間、失敗の内容）が入ります。

## どこにどう届くか {#platform-delivery}

| つなぎ先 | 届き方 |
|---|---|
| **CLI** | 画像の URL が markdown の `![](url)` として出ます。押せば開きます |
| **Telegram** | 写真として届き、指示した文が説明文になります |
| **Discord** | メッセージの中に埋め込まれます |
| **Slack** | Slack が URL を展開して見せます |
| **WhatsApp** | 画像のメッセージとして届きます |
| **そのほか** | ただの文字として URL が出ます |

## できないこと {#limitations}

- 使っている送り先の**認証情報が要ります**（FAL の `FAL_KEY`／Nous Subscription、`OPENAI_API_KEY`、xAI の OAuth、`KREA_API_KEY`）
- **編集はモデルによります** — 画像から画像を作れるのは編集に対応したモデルだけです（上の表を参照）。文章からしか作れないモデルは、画像を渡すとはっきり伝えて断ります
- **URL は一時的です** — 送り先が返す URL は数時間から数日で切れます。Hermes は手元の置き場に写しを取るので、切れたあとも届けられます
- **モデルごとの制約** — `seed` や `num_inference_steps` などに対応していないモデルもあります。`supports` と `edit_supports` の絞り込みが、対応していない項目を黙って落とします。これはそういうものです
