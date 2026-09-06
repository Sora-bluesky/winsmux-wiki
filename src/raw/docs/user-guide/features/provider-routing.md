---
title: "提供元の振り分け"
description: "OpenRouter の提供元の優先設定を書いて、費用・速度・品質のどれを重く見るかを決めます。"
upstream_path: user-guide/features/provider-routing.md
upstream_blob: 3cd2c5c75c9a172705eb2fa46a1672fb0fd74ce9
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/provider-routing
---

# 提供元の振り分け {#provider-routing}

LLM の窓口に [OpenRouter](https://openrouter.ai) を使っているとき、Hermes Agent は**提供元の振り分け**に対応します。要求を実際にさばく AI の提供元をどれにするか、どの順で優先するかを細かく決められます。

OpenRouter は要求を多くの提供元（Anthropic、Google、AWS Bedrock、Together AI など）へ渡します。提供元の振り分けを使うと、費用・速度・品質のどれを重く見るかを決めたり、この提供元でなければならないという条件を通したりできます。

:::note
[Nous Portal](/hermes/docs/integrations/nous-portal/) は振り分けをモデルごとに自分の側で決めていて、呼び出し側から渡された提供元の希望を受け取りません。Hermes は Portal へ `provider` の項目を送らないので、`provider_routing` はそこでは単に無視されます。
:::

## 設定 {#configuration}

`~/.hermes/config.yaml` に `provider_routing` の節を足します。

```yaml
provider_routing:
  sort: "price"           # How to rank providers
  only: []                # Whitelist: only use these providers
  ignore: []              # Blacklist: never use these providers
  order: []               # Explicit provider priority order
  require_parameters: false  # Only use providers that support all parameters
  data_collection: null   # Control data collection ("allow" or "deny")
```

:::info
提供元の振り分けが効くのは OpenRouter を使うときだけです。Nous Portal や、提供元へ直接つなぐ場合（Anthropic の API に直接つなぐなど）には影響しません。
:::

## 設定項目 {#options}

### `sort` {#sort}

その要求について、OpenRouter が使える提供元をどの順で並べるかを決めます。

| 値 | 説明 |
|-------|-------------|
| `"price"` | 安い提供元から |
| `"throughput"` | 1 秒あたりのトークン数が多い提供元から |
| `"latency"` | 最初のトークンが返るまでが短い提供元から |

```yaml
provider_routing:
  sort: "price"
```

### `only` {#only}

使ってよい提供元の名前（slug）を並べます。指定すると、**ここに書いた提供元だけ**を使い、ほかはすべて外れます。名前は OpenRouter が提供元ごとに示している小文字の slug を使います。

```yaml
provider_routing:
  only:
    - "anthropic"
    - "google"
```

### `ignore` {#ignore}

使わない提供元の名前を並べます。ここに書いた提供元は、いちばん安くても速くても**使われません**。

```yaml
provider_routing:
  ignore:
    - "together"
    - "deepinfra"
```

### `order` {#order}

優先の順番をそのまま書きます。先に書いた提供元ほど優先され、書かなかった提供元は控えとして使われます。

```yaml
provider_routing:
  order:
    - "anthropic"
    - "google"
    - "amazon-bedrock"
```

### `require_parameters` {#requireparameters}

`true` にすると、OpenRouter は要求に含まれるパラメータ（`temperature`、`top_p`、`tools` など）を**すべて**扱える提供元にだけ渡します。パラメータが黙って落とされるのを防げます。

```yaml
provider_routing:
  require_parameters: true
```

### `data_collection` {#datacollection}

自分のプロンプトを提供元が学習に使ってよいかを決めます。値は `"allow"` か `"deny"` です。

```yaml
provider_routing:
  data_collection: "deny"
```

### モデルごとの上書き（`models`） {#per-model-overrides-models}

モデルごとに別の提供元の組み合わせを固定できます。`models` の下の鍵はモデル ID で、それぞれに
`sort` / `only` / `ignore` / `order` / `require_parameters` / `data_collection` を同じように書けて、そのモデルについてだけ
上の共通の値を上書きします。モデルごとに書かなかったものは、共通の既定値がそのまま使われます。

```yaml
provider_routing:
  sort: "price"                      # applies to every model
  models:
    "openai/gpt-6-astra":
      only: ["openai"]               # never let a reseller serve this one
    "anthropic/claude-fable-5.1":
      only: ["anthropic"]
    "moonshotai/kimi-k2.6":
      order: ["moonshotai", "together"]
      sort: "throughput"
```

名前の照合は `agent.reasoning_overrides` と同じく表記のゆれを吸収します（`claude-fable-5.1` と `claude-fable-5-1`、
`openrouter/` を付けても付けなくても構いません）。上書きは、エージェントが*そのとき*使っているモデルに付いていきます。つまり
`/model` での切り替え、控えのモデルへの切り替わり、cron ジョブ、別のモデルで動く委任先のエージェントは、それぞれ自分の
指定を受け取ります。これらの鍵は `config.yaml` を直に編集してください。モデル ID にはドットが入っていて、`hermes config set`
はドットを階層の区切りとして読んでしまいます。

## 実際の書き方 {#practical-examples}

### 費用を抑える {#optimize-for-cost}

使える中でいちばん安い提供元へ渡します。量を多く使うときや、開発中に向いています。

```yaml
provider_routing:
  sort: "price"
```

### 速さを優先する {#optimize-for-speed}

対話しながら使うために、返り始めるまでが短い提供元を優先します。

```yaml
provider_routing:
  sort: "latency"
```

### 出る量の多さを優先する {#optimize-for-throughput}

長い文章を書かせるなど、1 秒あたりのトークン数がものを言うときに向いています。

```yaml
provider_routing:
  sort: "throughput"
```

### 提供元を 1 つに固定する {#lock-to-specific-providers}

結果を揃えたいときに、すべての要求を決まった提供元に通します。

```yaml
provider_routing:
  only:
    - "anthropic"
```

### 特定の提供元を避ける {#avoid-specific-providers}

使いたくない提供元を外します（データの扱いが気になる場合など）。

```yaml
provider_routing:
  ignore:
    - "together"
    - "lepton"
  data_collection: "deny"
```

### 優先順を決めつつ、控えも用意する {#preferred-order-with-fallbacks}

まず希望の提供元を試して、使えなければほかへ回します。

```yaml
provider_routing:
  order:
    - "anthropic"
    - "google"
  require_parameters: true
```

## 仕組み {#how-it-works}

提供元の振り分けの設定は、エージェントとの会話の要求と、反復の上限に達したときの要約の要求に、`extra_body.provider` の項目として付いて OpenRouter へ渡ります。（`extra_body` は OpenAI の Python SDK の引数名で、JSON の要求では最上位の `provider` という項目になります。）圧縮やタイトル生成といった補助的な処理は、`auxiliary.<task>.extra_body` の下で別に設定します。

- **CLI で使うとき** — `~/.hermes/config.yaml` に書き、起動時に読み込まれます
- **ゲートウェイで使うとき** — 同じ設定ファイルを、ゲートウェイの起動時に読み込みます

振り分けの設定は `config.yaml` から読まれ、`AIAgent` を作るときの引数として渡されます。

```
providers_allowed  ← from provider_routing.only
providers_ignored  ← from provider_routing.ignore
providers_order    ← from provider_routing.order
provider_sort      ← from provider_routing.sort
provider_require_parameters ← from provider_routing.require_parameters
provider_data_collection    ← from provider_routing.data_collection
```

:::tip
いくつかの項目を組み合わせられます。たとえば、安い順に並べたうえで、ある提供元を外し、パラメータへの対応を必須にする、といった書き方です。

```yaml
provider_routing:
  sort: "price"
  ignore: ["together"]
  require_parameters: true
  data_collection: "deny"
```
:::

## 何も書かないときの動き {#default-behavior}

`provider_routing` の節を書かない場合（既定の状態）は、取りまとめ役が自前の振り分けの決まりを使い、だいたいのところ費用と使えるかどうかを自動で釣り合わせます。

:::tip 提供元の振り分けと、控えのモデルの違い
提供元の振り分けが決めるのは、**OpenRouter の後ろにいる提供元**のうちどれが要求をさばくかです。主に使うモデルが失敗したときに、まったく別の提供元へ自動で切り替えたい場合は、[控えの提供元](/hermes/docs/user-guide/features/fallback-providers/)をご覧ください。
:::
