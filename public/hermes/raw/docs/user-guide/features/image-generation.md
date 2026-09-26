---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "画像生成"
description: "FAL.ai 経由で画像を生成します。FLUX 2、GPT Image（1.5 と 2）、Nano Banana Pro、Ideogram、Recraft V4 Pro、Krea 2 など 11 モデルに対応し、`hermes tools` で選べます。"
upstream_path: user-guide/features/image-generation.md
upstream_blob: 2c9bd620b39d213be70c3db55141e8277bf8f60a
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/image-generation
---

# 画像生成 {#image-generation}

Hermes Agent は FAL.ai を通して、文章のプロンプトから画像を作ります。最初から 11 のモデルが使えて、速さ・品質・料金のバランスがそれぞれ違います。どのモデルを使うかは `hermes tools` で選べて、選んだ内容は `config.yaml` に残ります。

## 対応モデル {#supported-models}

| モデル | 速さ | 得意なこと | 料金 |
|---|---|---|---|
| `fal-ai/flux-2/klein/9b` *(既定)* | `<1s` | 高速で、文字がくっきり出る | $0.006/MP |
| `fal-ai/flux-2-pro` | 約 6 秒 | スタジオ撮影のような写実性 | $0.03/MP |
| `fal-ai/z-image/turbo` | 約 2 秒 | 英語と中国語の二言語対応、60 億パラメータ | $0.005/MP |
| `fal-ai/nano-banana-pro` | 約 8 秒 | Gemini 3 Pro ベース。じっくり考えた構図と文字の描画 | $0.15/枚（1K） |
| `fal-ai/gpt-image-1.5` | 約 15 秒 | 指示への忠実さ | $0.034/枚 |
| `fal-ai/gpt-image-2` | 約 20 秒 | 最高水準の文字描画（日本語などの表意文字も）と、現実感のある写実表現 | $0.04〜0.06/枚 |
| `fal-ai/ideogram/v3` | 約 5 秒 | 文字組みが一番きれい | $0.03〜0.09/枚 |
| `fal-ai/recraft/v4/pro/text-to-image` | 約 8 秒 | デザイン、ブランドの統一、そのまま使える仕上がり | $0.25/枚 |
| `fal-ai/qwen-image` | 約 12 秒 | 大規模言語モデル方式。込み入った文字に強い | $0.02/MP |
| `fal-ai/krea/v2/medium/text-to-image` | 約 15〜25 秒 | イラスト、アニメ、絵画、表情豊かな画風 | $0.030〜0.035/枚 |
| `fal-ai/krea/v2/large/text-to-image` | 約 25〜60 秒 | 写実表現、質感を残した絵作り（ブレ、粒状感、フィルム調） | $0.060〜0.065/枚 |

料金は執筆時点の FAL のものです。最新の数字は [fal.ai](https://fal.ai/) で確かめてください。

## 準備 {#setup}

:::tip Nous のサブスク利用者へ
有料の [Nous Portal](https://portal.nousresearch.com) サブスクリプションを使っている場合は、FAL の API キーがなくても **[Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/)** 経由で画像生成が使えます。選んだモデルはどちらの経路でも共通で保たれます。新しく入れる場合は `hermes setup --portal` でログインすれば、ゲートウェイの道具をまとめて有効にできます。すでに入れてある場合は `hermes tools` で画像生成の接続先として **Nous Subscription** を選んでください。

管理型の行は **Nous Subscription** の 1 つだけです。この行のモデル選択には、サブスクリプションが動かしているすべてのゲートウェイのモデルが並びます。上に挙げた FAL のモデル一覧、Krea 2 のネイティブ版（`krea-2-medium`、`krea-2-large`、`krea-2-medium-turbo`）、そして Nous Portal の画像モデルです。同じモデルが重複して出ることはなく、選んだモデルによってどのゲートウェイが処理するかが決まります。無料の道具プールのアカウントでは FAL のモデルだけが見えます。Krea と Portal のモデルは有料のサブスクリプション向けです。

管理型のゲートウェイが特定のモデルで `HTTP 4xx` を返すときは、そのモデルがまだポータル側で中継されていないということです。その場合はエージェントがそう伝えたうえで、直す手順も示します（`hermes tools` で FAL.ai に切り替えて自分の `FAL_KEY` で直接つなぐか、別のモデルを選ぶ）。
:::

### FAL の API キーを取る {#get-a-fal-api-key}

1. [fal.ai](https://fal.ai/) で登録します
2. ダッシュボードから API キーを発行します

### 設定してモデルを選ぶ {#configure-and-pick-a-model}

道具の設定コマンドを実行します。

```bash
hermes tools
```

**🎨 Image Generation** を開いて接続先（Nous Subscription か FAL.ai）を選ぶと、対応モデルが桁のそろった表で並びます。矢印キーで移動し、Enter で決定します。

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

接続先を決めるのは `image_gen.provider` だけです。`nous` なら管理型の Tool Gateway を通り、事業者名（`fal`、`openai`、`xai`、`krea` など）なら自分のキーで直接つながります。実行時は常にこの保存された選択に従います。`provider: nous` のあいだは `.env` の `FAL_KEY` は無視されますし、`provider: fal` なのに `FAL_KEY` がないときは黙って別の経路に回さず、`image_gen is configured to use fal (set via hermes tools), but FAL_KEY is not set. Run 'hermes tools' to change it.` というエラーで止まります。接続先を変えるときはキーを足したり消したりせず、`hermes tools` で切り替えてください。（古い `use_gateway` の真偽値は過去の名残です。`true` のときは今も `nous` として読みますが、新しく書き込まれることはありません。）

`max_parallel_requests` の既定値は `4` です。Hermes はこの値を最低 1 に、
上限は全体の道具ワーカー数に収めます。画像の事業者に送る同時リクエスト数が
青天井にならず、まとめて画像を作るときもエージェント全体の同時実行の上限を
すり抜けないようにするためです。

### OpenRouter: 画像 API のカタログを丸ごと {#openrouter-the-full-image-api-catalog}

`image_gen.provider: openrouter` にすると、モデルの選択画面に OpenRouter の
画像カタログが丸ごと出てきます。専用の
[Image API](https://openrouter.ai/docs/guides/overview/multimodal/image-generation)
のモデル（Seedream、FLUX.2、Recraft、Qwen Image、MAI、Krea、Riverflow、Grok
Imagine など 40 種類以上の ID）と、チャット補完で動く画像モデルが一緒に並びます。
カタログは `GET /images/models` と `GET /models` からその場で取ってくるので、
OpenRouter が新しいモデルを出せばすぐ選択肢に現れます。Hermes の更新は要りません。
生成のときは、そのモデルを扱う窓口（専用の `POST /images/generations` か、
チャット補完か）へ自動で振り分けます。
Nous Portal が中継するのはチャット補完の方式だけなので、そちらの選択画面には
チャット経由で動くモデルが並びます。

Image API のモデル向けに、リクエストごとの細かい調整をしたいときは、
専用の設定欄（または `OPENROUTER_IMAGE_API_*` の環境変数）を使います。

```yaml
image_gen:
  provider: openrouter
  model: bytedance-seed/seedream-4.5
  openrouter:
    resolution: 2K        # model-dependent: 1K / 2K / 4K
    quality: high         # gpt-image models
    output_format: png
```

### GPT Image の品質 {#gpt-image-quality}

`fal-ai/gpt-image-1.5` と `fal-ai/gpt-image-2` のリクエスト品質は `medium` に固定しています（1024×1024 で 1 枚あたり約 $0.034〜$0.06）。`low` と `high` を利用者が選べるようにしていないのは、Nous Portal の請求額が誰にとっても予測できる範囲に収まるようにするためです。段階の間で費用が 3〜22 倍も開いてしまいます。もっと安く済ませたいときは Klein 9B か Z-Image Turbo を、もっと品質を上げたいときは Nano Banana Pro か Recraft V4 Pro を選んでください。

### Meta Model API: Muse Image {#meta-model-api-muse-image}

`image_gen.provider: meta-ai` にすると、画像は
[Meta Model API](https://api.meta.ai)（`https://api.meta.ai/v1`）で作られます。
Muse Spark のチャットモデルを提供しているのと同じ、OpenAI 互換の窓口です。
同梱の `meta-ai` チャット事業者と対になる、画像生成側の入口にあたります。

| モデル | 速さ | 得意なこと | 料金 |
|---|---|---|---|
| `muse-image-1.0` *(既定)* | 約 10 秒 | Meta Model API による画像生成 | $0.01/枚 |

```yaml
image_gen:
  provider: meta-ai
  model: muse-image-1.0
```

認証には Meta のチャット事業者と同じ環境変数を使い回します。`MODEL_API_KEY`
（Meta の資料に載っている名前）が基本で、`META_API_KEY` と `META_MODEL_API_KEY`
も別名として受け付けます。プロキシや別のホストにつなぐときは `META_BASE_URL` を
指定します。今のところ文章から画像を作る方向だけで、できあがったものは
`$HERMES_HOME/cache/images/` に保存されます。

## FAL: GPT Image 2.5 {#fal-gpt-image-25}

`hermes tools` → Image Generation → FAL.ai から **GPT Image 2.5 Flare** か
**GPT Image 2.5 Sunburst** を選びます。モデル ID は次のとおりです。

- `openai/gpt-image-2.5/flare/text-to-image`
- `openai/gpt-image-2.5/sunburst/text-to-image`

たとえば次のように設定します。

```bash
hermes config set image_gen.provider fal
hermes config set image_gen.model openai/gpt-image-2.5/flare/text-to-image
```

`image_url` や参考画像を渡すと、対応する
`openai/gpt-image-2.5/flare/edit` または `openai/gpt-image-2.5/sunburst/edit` の窓口が自動で選ばれます。
どちらも元になる画像を 16 枚まで受け取れます。Hermes は品質を `medium` に固定していて、
FAL の既定である高価な `high` ではなく、これまでの FAL GPT Image の方針に合わせています。
横長と縦長は、必要な画素数の下限を満たすために 4:3 のプリセットを使います。
正方形は `square_hd` です。拡大処理は、頼まれない限り動きません。

FAL の請求は 1 枚いくらではなくトークン単位です。文章の入力が 100 万トークンあたり $5、
キャッシュ済みの文章入力が $1.25、文章の出力が $10、画像の入力が $8、
キャッシュ済みの画像入力が $2、画像の出力が $30 で、リクエストごとに $0.0001 単位で
切り上げられます。
[Flare](https://fal.ai/models/openai/gpt-image-2.5/flare/text-to-image) と
[Sunburst](https://fal.ai/models/openai/gpt-image-2.5/sunburst/text-to-image)
のページも見てください。FAL に直接つなぐ場合は残高のある `FAL_KEY` が必要です。
管理型ゲートウェイで使えるかどうかはそのゲートウェイ側の許可一覧しだいで、FAL で使えることが
そのまま保証にはなりません。今までの事業者とモデルの既定値は変わっていません。

## OpenAI API: GPT Image 2.5 {#openai-api-gpt-image-25}

**OpenAI** の事業者では、GPT Image 2.5 Flare（日常づかいの速い生成）と
Sunburst（緻密な生成と編集）を `OPENAI_API_KEY` で使えます。
`hermes tools` → Image Generation → OpenAI から選ぶか、次のように設定します。

```bash
hermes config set image_gen.provider openai
hermes config set image_gen.openai.model gpt-image-2.5-flare
```

`gpt-image-2.5-flare` と `gpt-image-2.5-sunburst` は品質を自動で決めます。
品質を固定したいときは `-low`、`-medium`、`-high`、`-xhigh`、`-max` を後ろに付けます。
たとえば `gpt-image-2.5-sunburst-high` です。どちらも生成と編集の両方に対応し、
参考画像を 16 枚まで使えます。今までの GPT Image 2 の選択と、既定の
`gpt-image-2-medium` は変わりません。

これは ChatGPT や Codex のサブスクリプションとは別枠の、有料 API の利用です。
どちらのモデルも文章の入力が 100 万トークンあたり $5、画像の入力が $8、
画像の出力が $30 です（キャッシュ済みの入力はそれぞれ $1.25 と $2）。
1 枚あたりの費用は使い方で変わります。GPT Image 2 の計算機では 2.5 のトークン消費は
見積もれません。公式の
[Flare](https://developers.openai.com/api/docs/models/gpt-image-2.5-flare) と
[Sunburst](https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst) の資料を見てください。

**OpenAI (Codex auth)** の事業者では 2.5 を選べません。Codex の裏側は、どんな `model` の値でも
（存在しない ID でさえ）受け付けたうえで、サーバー側が管理する自前の仕組みで画像を作ります。
そのため Flare や Sunburst を「選んだ」としても、名前が付くだけで何の効果もありません。
2.5 を使うなら、OpenAI API 直結の事業者か FAL を選んでください。

### OpenAI 互換の独自エンドポイント {#custom-openai-compatible-image-endpoint}

**OpenAI** の事業者は、チャットの事業者とは切り離して、OpenAI 互換の `/v1/images/generations`
のエンドポイントなら何にでも向けられます（手元のゲートウェイ、用途を絞ったプロキシ、他社の API
ゲートウェイなど）。キーを読み込む変数も、好きなものを指定できます。

```yaml
image_gen:
  provider: openai
  openai:
    model: gpt-image-2-medium
    base_url: http://localhost:18081/v1   # → OPENAI_BASE_URL → api.openai.com
    key_env: IMAGE_GATEWAY_TOKEN          # → OPENAI_API_KEY
```

`config.yaml` に残るのは変数の*名前*だけで、秘密の値そのものは `.env` かプロセスの環境変数に
置いたままです。使えるかどうかの確認も生成も同じ解決のしかたを通るので、`key_env` を設定して
あればそれで足ります。`OPENAI_API_KEY` は要りません。リクエストは Hermes 自身の HTTP
クライアントを通ります。こちらは `HTTP(S)_PROXY` と `NO_PROXY` には従いますが、macOS の
システム側のプロキシ設定は無視するので（その除外リストは Python からは見えません）、`localhost`
のエンドポイントには直接つながります。画像のリクエストでは `OpenAI-Project` ヘッダを空にして
送ります。チャット用に `OPENAI_PROJECT_ID` を設定していると、モデルの許可リストがある
プロジェクトでは画像のエンドポイントが 403 の `model_not_found` を返してしまいますし、キー自体が
すでにプロジェクトの情報を持っているためです。

**ゲートウェイでのモデル名。** カタログの ID は OpenAI 向けに読み替えられます。`gpt-image-2-medium`
は `model: gpt-image-2` と `quality: medium` として送られます。`image_gen.openai.model`
（または `OPENAI_IMAGE_MODEL`）にそれ以外の値を書くと、そのまま `model` として送られ、`quality`
のフィールドは**付きません**。そのため、独自の画像モデル名（`custom-image-model`、
`grok-imagine-image` など）を出すゲートウェイには、その ID がそのまま届き、受け付けないかもしれない
quality の列挙値を見ずに済みます。全体で共有している `image_gen.model` は素通しされません。前に
選んだ別の事業者の ID（たとえば FAL のパス）が入っていることがあるからです。

**名前を付けた独自エンドポイントを使い回す。** そのゲートウェイをチャット用に `providers:` の下で
すでに宣言してあるなら、URL とキーを書き直さずに、画像の事業者を*名前*で指せます。

```yaml
providers:
  my-gateway:
    name: My Gateway
    api: https://gateway.example.com/v1
    key_env: MY_GATEWAY_KEY

image_gen:
  provider: openai
  openai:
    provider: my-gateway        # inherits api + key_env from providers.my-gateway
    model: grok-imagine-image   # sent verbatim, no quality
```

解決の順番は、`image_gen.openai.base_url` → 名前で指したエンドポイントの URL →
`OPENAI_BASE_URL` で、キーは `image_gen.openai.key_env` が指す変数 → 名前で指した
エンドポイントの `api_key` か `key_env` → `OPENAI_API_KEY` の順です。ですから `provider` の
隣に `base_url` や `key_env` を書くと、その部分だけエンドポイント側の設定を上書きします。
`providers:` のどの項目にも当たらない名前は、警告に記録したうえで無視されます。

## 使い方 {#usage}

エージェントから見える指定はあえて最小限にしてあります。設定した内容はモデルの側が読み取ります。

```
Generate an image of a serene mountain landscape with cherry blossoms
```

```
Create a square portrait of a wise old owl — use the typography model
```

```
Make me a futuristic cityscape, landscape orientation
```

## 画像から画像へ / 編集 {#image-to-image-editing}

同じ `image_generate` の道具は、使っているモデルが対応していれば
**すでにある画像を編集**もします。元になる画像を渡せば、裏側で編集用の
窓口に自動で振り分けられます（`video_generate` が画像から動画を作るときと同じ流れです）。
元画像を渡さなければ、ふつうの文章から画像を作る動きになります。

```
Take this photo and make it a rainy Tokyo street at night → <image>
```

```
Blend these two product shots into one hero image → <image1> <image2>
```

編集を動かす入力は 2 つあります。

- **`image_url`** — 編集・変換のもとになる主役の画像です（公開 URL か、手元のファイルの場所）。
- **`reference_image_urls`** — 画風や構図の参考に足す画像です（枚数の上限はモデルごとに決まっています）。

### どの接続先が編集に対応しているか {#which-backends-support-editing}

| 接続先 | 画像から画像へ | 参考画像の上限 | 仕組み |
|---|---|---|---|
| **FAL.ai**（下に挙げた編集対応モデル） | ✓ | 最大 16 枚（モデルによる） | そのモデルの `/edit` の窓口に振り分けます |
| **OpenAI**（GPT Image 2 / 2.5 Flare / Sunburst） | ✓ | 最大 16 枚 | `images.edit()` |
| **xAI**（Grok Imagine） | ✓ | 1 枚 | `/v1/images/edits`（`grok-imagine-image-quality`） |
| **Krea**（`Krea 2`） | ✓ | 最大 10 枚 | 参考画像にならった生成（`image_style_references`） |
| **OpenAI (Codex auth)** | ✓ | 最大 16 枚 | `POST /backend-api/codex/images/edits` に、`images[]` の data URL を直接埋め込んで送ります（リモートの URL は手元で取得してから渡します） |
| **OpenRouter**（Image API のモデル） | ✓ | 最大 14〜16 枚（モデルによる） | `POST /images/generations` の `input_references`。チャット経由のモデルは `image_url` の内容を使います（3 枚まで） |

編集の窓口を持つ FAL のモデルは `flux-2/klein/9b`、`flux-2-pro`、
`nano-banana-pro`、`gpt-image-1.5`、`gpt-image-2`、`ideogram/v3`、
`qwen-image` に、上で触れた GPT Image 2.5 Flare と Sunburst を加えたものです。文章から画像を作ることしかできない FAL のモデル（`z-image/turbo`、`recraft`、
`krea/*`）は画像の入力を受け付けず、編集できるモデルを使うよう
はっきり示すエラーを返します。

:::note OpenAI (Codex auth): 画質とサイズは裏側が決めます

Hermes は Codex の裏側にある専用の
`images/generations` / `images/edits` の窓口へ直接送ります（公式の Codex クライアントと同じ経路です）。
そのためチャットモデルは間に入らず、ChatGPT のプランでいまどのチャットモデルが使えるかにも左右されません。
ただし裏側は `model`、`quality`、`size` を目安としてしか扱わず、頼んだものとは違う画質の段階や
縦横の形で返してくることがあります（縦長を頼んでも正方形で返ることがあります）。結果には、頼んだ値と並べて
`reported_quality`、`reported_size`、`pixel_size` が入り、OpenAI のサポートに問い合わせるための
`imagegen_request_id` も付きます。画質とサイズをきっちり決めたいなら、
**OpenAI**（API キー）、**FAL**、**xAI** のいずれかを設定してください。

:::

いま使っているモデルが編集に対応しているかどうかは、実行時に道具の説明文へ
書き出されます。エージェントは道具を呼ぶ前に `image_url` が効くかどうかを知ることができます。

## 縦横比 {#aspect-ratios}

エージェントから見ると、どのモデルでも同じ 3 つの縦横比を指定できます。裏側では、モデルごとの本来のサイズ指定が自動で埋められます。

| エージェントの指定 | image_size（flux/z-image/qwen/recraft/ideogram） | aspect_ratio（nano-banana-pro） | image_size（gpt-image-1.5） | image_size（gpt-image-2） |
|---|---|---|---|---|
| `landscape` | `landscape_16_9` | `16:9` | `1536x1024` | `landscape_4_3`（1024×768） |
| `square` | `square_hd` | `1:1` | `1024x1024` | `square_hd`（1024×1024） |
| `portrait` | `portrait_16_9` | `9:16` | `1024x1536` | `portrait_4_3`（768×1024） |

GPT Image 2 で 16:9 ではなく 4:3 のプリセットに割り当てているのは、必要な画素数の下限が 655,360 だからです。`landscape_16_9` のプリセット（1024×576 = 589,824）では受け付けてもらえません。

この読み替えは `_build_fal_payload()` の中で起きます。エージェント側のコードは、モデルごとの指定の違いを知らずに済みます。

## 拡大 {#upscaling}

### 頼んだときだけ動く {#opt-in-only}

どのモデルも、黙って拡大することはありません。最近の画像モデルはそのままの解像度で
いちばん良い絵を出しますし、用意されている拡大処理は*創作寄り*の
仕上げ（拡散処理をもう一度かけるもの）なので、描かれた内容がわずかに書き換わり、
文字や顔、細かい部分がかえって崩れることがあります。拡大はエージェントが
はっきり頼んだときだけ動きます。

### `upscale` の指定（呼び出しごとの申し込み） {#the-upscale-parameter-per-call-opt-in}

- `upscale: true` — 生成のあとに高解像度化をつなげます。

| 接続先 | 拡大処理 |
|---|---|
| **FAL.ai** | Clarity Upscaler（2 倍、+$0.03/MP） |
| **Krea** | Krea Enhance（2 倍、上限 8K まで） |
| その他の接続先 | 拡大処理なし。そのままの解像度で返ります |

- `upscale: false` / 指定なし — そのままの解像度です（既定）

`video_generate` も FAL の接続先で `upscale: true` を受け付けます。生成のあとに
ByteDance の **SeedVR2** という動画の拡大処理（2 倍、出力動画の $0.001/MP）をつなげます。

FAL の画像の拡大処理が動くときは、次の設定が使われます。

| 項目 | 値 |
|---|---|
| 拡大の倍率 | 2 倍 |
| Creativity | 0.35 |
| Resemblance | 0.6 |
| Guidance scale | 4 |
| Inference steps | 18 |

拡大に失敗したとき（通信の不調や利用制限）は、もとの画像が自動で返ります。応答には `upscaled: true/false` が入るので、エージェントはどちらの解像度を受け取ったか分かります。

## 内部でどう動いているか {#how-it-works-internally}

1. **モデルの決定** — `_resolve_fal_model()` が `config.yaml` の `image_gen.model` を読み、なければ環境変数 `FAL_IMAGE_MODEL`、それもなければ `fal-ai/flux-2/klein/9b` を使います。
2. **リクエストの組み立て** — `_build_fal_payload()` が `aspect_ratio` の指定をモデル本来の書き方（プリセットの列挙、縦横比の列挙、GPT のリテラル）に置き換え、そのモデルの既定値をまとめ、呼び出し側の上書きを反映してから、モデルの `supports` の一覧で絞り込みます。対応していない項目が送られることはありません。
3. **送信** — `_submit_fal_request()` が、保存された `image_gen.provider` の選択に従って、FAL の資格情報で直接送るか、管理型の Nous ゲートウェイを通すかを決めます。
4. **拡大** — エージェントが `upscale: true` を渡したときだけ動きます。どのモデルもカタログ上の既定は「切」です。
5. **受け渡し** — できあがった画像の URL がエージェントに返り、エージェントが `MEDIA:<url>` というタグを出します。各サービスのつなぎ役が、それをそのサービスのメディア表示に変えます。
6. **利用状況の集計** — トークンで課金する画像モデル（OpenRouter のチャット画像モデルや、`google/gemini-3.1-flash-lite-image` のような Image API のモデル、OpenAI の `gpt-image`）は実際のトークン数を返します。そのため呼び出しごとに、課金元の事業者とモデルのもとで `image_generation` というタスクとして `session_model_usage` に記録され、`hermes insights` やダッシュボードの利用状況の分析にも、ほかのモデルの呼び出しと並んで出てきます。1 枚ごとに課金する接続先（FAL、xAI、Krea など）はトークンの使用量を返さないので、そこには記録されません。

## 不具合を調べる {#debugging}

デバッグ用のログを有効にします。

```bash
export IMAGE_TOOLS_DEBUG=true
```

デバッグのログは `./logs/image_tools_debug_<session_id>.json` に出て、呼び出しごとの詳細（モデル、指定した値、所要時間、エラー）が残ります。

## サービスごとの届き方 {#platform-delivery}

| サービス | 届き方 |
|---|---|
| **CLI** | 画像の URL がマークダウンの `![](url)` として表示されます。押すと開きます |
| **Telegram** | プロンプトを説明文にした写真メッセージとして届きます |
| **Discord** | メッセージに埋め込まれます |
| **Slack** | Slack が URL を展開して表示します |
| **WhatsApp** | メディアのメッセージとして届きます |
| **その他** | ただの文字列として URL が届きます |

## できないこと {#limitations}

- 使っている接続先の**資格情報が必要です**（FAL の `FAL_KEY` か Nous Subscription、`OPENAI_API_KEY`、xAI の OAuth、`KREA_API_KEY`）
- **編集はモデルしだいです** — 画像から画像への変換は、編集に対応したモデルでしか動きません（上の表を見てください）。文章から画像を作るだけのモデルは、画像の入力をはっきりしたエラーで断ります
- **URL は一時的です** — 接続先が返す URL は数時間から数日で切れます。Hermes は手元のキャッシュに実体を落とすので、切れたあとでも届けられます
- **モデルごとの制約** — `seed` や `num_inference_steps` などに対応していないモデルもあります。`supports` と `edit_supports` の絞り込みが、対応していない項目を黙って落とします。これは想定どおりの動きです
