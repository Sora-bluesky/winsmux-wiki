---
title: "プロバイダールーティング"
description: "OpenRouter や Nous Portal のプロバイダー優先順位を設定し、コスト・速度・品質のどれを重視するか決めます。"
upstream_path: user-guide/features/provider-routing.md
upstream_blob: ff8a9ef56ccc23709cbf4ff900e82560332b350d
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/provider-routing
---

# プロバイダールーティング {#provider-routing}

LLM プロバイダーとして [OpenRouter](https://openrouter.ai) や [Nous Portal](/hermes/docs/integrations/nous-portal/) を使っているとき、Hermes Agent は **プロバイダールーティング** に対応します。リクエストを実際に処理する AI プロバイダーはどれか、どういう優先順位で選ぶかを細かく指定できる仕組みです。

OpenRouter は多数のプロバイダー（Anthropic、Google、AWS Bedrock、Together AI など）へリクエストを振り分けます。プロバイダールーティングを使えば、コスト重視・速度重視・品質重視に寄せたり、特定のプロバイダーだけを使う条件を強制したりできます。

:::tip
Nous Portal を経由するトラフィックにも同じプロバイダー設定が効きます。しかも Portal の契約者は、トークン課金のプロバイダーが 10% 割引になります。
:::

## 設定 {#configuration}

`~/.hermes/config.yaml` に `provider_routing` セクションを追加します。

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
プロバイダールーティングが効くのは OpenRouter か Nous Portal を使うときだけです。プロバイダーへ直接つなぐ場合（Anthropic の API に直結する場合など）には何の影響もありません。
:::

## オプション {#options}

### `sort` {#sort}

リクエストに対して、利用できるプロバイダーを OpenRouter がどう並べるかを決めます。

| 値 | 説明 |
|-------|-------------|
| `"price"` | 最も安いプロバイダーを先に使う |
| `"throughput"` | 毎秒のトークン数が最も速いプロバイダーを先に使う |
| `"latency"` | 最初のトークンが返るまでが最も短いプロバイダーを先に使う |

```yaml
provider_routing:
  sort: "price"
```

### `only` {#only}

プロバイダー識別子（slug）のホワイトリストです。指定すると、ここに挙げたプロバイダー **だけ** を使い、それ以外はすべて除外します。各プロバイダーについて OpenRouter が表示する小文字の slug を書いてください。

```yaml
provider_routing:
  only:
    - "anthropic"
    - "google"
```

### `ignore` {#ignore}

プロバイダー名のブラックリストです。ここに挙げたプロバイダーは、たとえ最も安くても最も速くても **絶対に** 使われません。

```yaml
provider_routing:
  ignore:
    - "together"
    - "deepinfra"
```

### `order` {#order}

優先順位を明示的に指定します。先に書いたプロバイダーほど優先されます。書かなかったプロバイダーは、行き先がないときの受け皿として使われます。

```yaml
provider_routing:
  order:
    - "anthropic"
    - "google"
    - "amazon-bedrock"
```

### `require_parameters` {#requireparameters}

`true` にすると、OpenRouter はリクエストに含まれるパラメーター（`temperature`、`top_p`、`tools` など）を **すべて** サポートするプロバイダーにしか振り分けません。パラメーターが黙って捨てられるのを防げます。

```yaml
provider_routing:
  require_parameters: true
```

### `data_collection` {#datacollection}

プロバイダーがあなたのプロンプトを学習に使ってよいかどうかを決めます。値は `"allow"` か `"deny"` です。

```yaml
provider_routing:
  data_collection: "deny"
```

## 実用的な例 {#practical-examples}

### コスト重視にする {#optimize-for-cost}

そのとき利用できる最安のプロバイダーへ振り分けます。大量に使う場合や開発中に向いています。

```yaml
provider_routing:
  sort: "price"
```

### 速度重視にする {#optimize-for-speed}

対話的に使う場面で、応答が返り始めるまでの短いプロバイダーを優先します。

```yaml
provider_routing:
  sort: "latency"
```

### スループット重視にする {#optimize-for-throughput}

長い文章を生成させるときなど、毎秒のトークン数が効いてくる場面に向いています。

```yaml
provider_routing:
  sort: "throughput"
```

### 特定のプロバイダーに固定する {#lock-to-specific-providers}

結果を安定させたいときに、すべてのリクエストを特定のプロバイダーだけに通します。

```yaml
provider_routing:
  only:
    - "anthropic"
```

### 特定のプロバイダーを避ける {#avoid-specific-providers}

使いたくないプロバイダーを外します（データの取り扱いが気になる場合など）。

```yaml
provider_routing:
  ignore:
    - "together"
    - "lepton"
  data_collection: "deny"
```

### 優先順位を決めつつ受け皿も残す {#preferred-order-with-fallbacks}

まず好みのプロバイダーを試し、使えないときは他のプロバイダーに回します。

```yaml
provider_routing:
  order:
    - "anthropic"
    - "google"
  require_parameters: true
```

## 仕組み {#how-it-works}

プロバイダールーティングの設定は、エージェントのチャットリクエストと、繰り返し上限に達したときの要約リクエストで、`extra_body.provider` フィールドを通じて OpenRouter や Nous Portal へ渡されます（`extra_body` は OpenAI Python SDK の引数名で、JSON リクエストでは最上位の `provider` オブジェクトになります）。圧縮やタイトル生成といった補助タスクは、`auxiliary.<task>.extra_body` の下で個別に設定します。

- **CLI モード** — `~/.hermes/config.yaml` で設定し、起動時に読み込まれます
- **ゲートウェイモード** — 同じ設定ファイルを、ゲートウェイの起動時に読み込みます

ルーティング設定は `config.yaml` から読み込まれ、`AIAgent` を作るときのパラメーターとして渡されます。

```
providers_allowed  ← from provider_routing.only
providers_ignored  ← from provider_routing.ignore
providers_order    ← from provider_routing.order
provider_sort      ← from provider_routing.sort
provider_require_parameters ← from provider_routing.require_parameters
provider_data_collection    ← from provider_routing.data_collection
```

:::tip
複数のオプションを組み合わせられます。たとえば、値段の安い順に並べつつ、特定のプロバイダーを除外し、パラメーターへの対応を必須にする、といった設定です。

```yaml
provider_routing:
  sort: "price"
  ignore: ["together"]
  require_parameters: true
  data_collection: "deny"
```
:::

## 何も設定しないときの動き {#default-behavior}

`provider_routing` セクションを書かない場合（既定の状態）は、集約側が持つ独自のルーティング処理が働き、だいたいコストと空き具合のバランスを自動で取ってくれます。

:::tip プロバイダールーティングとフォールバックモデルの違い
プロバイダールーティングが決めるのは、**OpenRouter や Nous Portal の裏側にいるプロバイダー** のうちどれがリクエストを処理するか、です。メインのモデルが失敗したときに、まったく別のプロバイダーへ自動で切り替えたい場合は、[フォールバックプロバイダー](/hermes/docs/user-guide/features/fallback-providers/) を参照してください。
:::
