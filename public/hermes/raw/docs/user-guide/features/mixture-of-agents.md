---
title: "Mixture of Agents"
description: "名前を付けた MoA プリセットを作ると、Mixture of Agents プロバイダの下に選べるモデルとして現れます"
upstream_path: user-guide/features/mixture-of-agents.md
upstream_blob: 55c6d23791f0ff961c2dd5bb56a71d1cd999d01e
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/mixture-of-agents
---

# Mixture of Agents {#mixture-of-agents}

Mixture of Agents は、仮想のモデルプロバイダです。名前を付けた MoA プリセットは、`moa` プロバイダの下に選べるモデルとして現れます。

MoA プリセットを選ぶと、そのプリセットの集約役（aggregator）が実際に動くモデルになります。アシスタントの返答を書き、ツールの呼び出しを出すのはこのモデルです。参照モデルは先に動いて、集約役が使うための分析を用意します。

難しい作業で複数のモデルの視点がほしい、でも Hermes のふだんのエージェントの流れ（ツールの呼び出し、続きの繰り返し、割り込み、会話の記録、ほかのメッセージと同じセッションのコンテキスト）はそのまま使いたい。そんなときに MoA を使ってください。

## MoA プリセットをモデルとして選ぶ {#select-a-moa-preset-as-your-model}

プリセットは、ふだんのモデル選択の画面から選べます。

```bash
/model default --provider moa
/model review --provider moa
```

MoA はモデルのしくみの中では普通のプロバイダなので、MoA プリセットは **Hermes のどの画面でも** 選べます。

- **CLI / ゲートウェイ / TUI の `/model`** — `/model <preset> --provider moa`、既定のプリセットなら `/model --provider moa`。名前が設定済みのプリセットと完全に一致していれば、`/model <preset>` だけでも動きます。
- **`hermes model`** と **ダッシュボードのモデル選択** — `Mixture of Agents` というプロバイダの行が現れ、その中のモデルとしてプリセット名が並びます。
- **デスクトップの GUI アプリ** — モデルのドロップダウンに `MoA presets` の節が出ます。そこから選ぶ（`MoA: <preset>`）と、使うモデルがそのプリセットに切り替わります。デスクトップの設定画面ではプリセットの作成と編集もできます。

つまり、設定したプリセットは、ほかのモデルを選ぶ場所ならどこにでも現れます。

## スラッシュコマンドの近道 {#slash-command-shortcut}

`/moa` は 1 回かぎりの手軽な書き方です。**既定の** MoA プリセットでプロンプトを 1 つ実行し、そのあと元のモデルに戻します。

```bash
/moa design and implement a migration plan for this flaky test cluster
```

Hermes はそのやり取りの間だけ既定の MoA プリセットに切り替えてプロンプトを送り、終わったら元のモデルに戻します。引数はすべてプロンプトとして扱われます。`/moa` はもう引数をプリセット名とは解釈しません。

```bash
/moa
```

プロンプトなしで `/moa` だけを打つと、使い方が表示されます。

セッションの残り全体で MoA プリセットに **切り替えたい** 場合は、モデル選択の画面から選んでください。MoA プリセットは、どのモデル選択の画面でも `Mixture of Agents` プロバイダの下に現れます（前述のとおり）。`/moa` があえてモデルの切り替えになっていないのは、ふだんのプロンプトでうっかりモデルが変わることを防ぐためです。

## エージェントの流れの中での動き {#how-it-works-in-the-agent-loop}

プロバイダ `moa` を選んでいるとき、メインのモデルを呼ぶたびに Hermes は次のように動きます。

1. 選ばれているプリセットを名前から解決します。
2. 設定された参照モデルを、ツールのスキーマなしで動かします（参照モデルが受け取るのは会話のユーザー／アシスタントのテキストだけで、Hermes のシステムプロンプトやツール呼び出しの記録は渡りません。そのため参照の呼び出しは安価に保たれ、厳格なプロバイダに拒否されることも避けられます）。
3. 参照モデルの出力を、集約役だけが見るコンテキストとして付け加えます。
4. 設定された集約役を、Hermes の通常のツールのスキーマとともに呼びます。
5. 集約役の応答を、そのままモデルの応答として扱います。
6. 集約役がツールを呼んだ場合、Hermes は通常どおりそのツールを実行します。
7. 次のモデルの繰り返しでは、ツールの結果を含む更新後の会話に対して、同じ MoA の流れがもう一度動きます。

MoA は通常のモデルのしくみを通して選ばれるので、`/goal`、ゲートウェイのセッション、TUI のセッション、デスクトップのチャットとも自動的に組み合わさります。

## プリセットを設定する {#configure-presets}

名前を付けた MoA プリセットは、次の場所から設定できます。

- ダッシュボード → Models → Model Settings → Mixture of Agents
- デスクトップアプリ → Settings → Model → Mixture of Agents
- `hermes moa configure [name]`
- `config.yaml`

設定にはプロバイダとモデルの組を明示して書くので、複数のプロバイダを混ぜることも、同じプロバイダの複数のモデルを使うこともできます。

```yaml
moa:
  default_preset: default
  presets:
    default:
      reference_models:
        - provider: openai-codex
          model: gpt-5.5
        - provider: openrouter
          model: deepseek/deepseek-v4-pro
      aggregator:
        provider: openrouter
        model: anthropic/claude-opus-4.8
      # Optional: pin sampling temperatures. When omitted (the default),
      # temperature is NOT sent and each model uses its provider default —
      # the same behavior as a single-model Hermes agent.
      # reference_temperature: 0.6
      # aggregator_temperature: 0.4
      max_tokens: 4096
      enabled: true
```

既定のプリセットは次のとおりです。

- 参照: `openai-codex:gpt-5.5`
- 参照: `openrouter:deepseek/deepseek-v4-pro`
- 集約役 / 実際に動くモデル: `openrouter:anthropic/claude-opus-4.8`

### `reference_max_tokens` で助言役の速さを調整する {#tuning-advisor-speed-with-referencemaxtokens}

MoA はやり取りのたびに、参照モデル（助言役）を並行して動かし、そのあとで
集約役が動きます。1 回のやり取りの時間を主に決めているのは助言役の生成で、
体感の待ち時間は助言役が書くトークンの量に強く連動します。いちばん遅い
助言役が書き終わるまで待つからです。既定では助言役に **上限がなく**
（`reference_max_tokens` が未設定）、長い論説のような助言を書くことがあります。

プリセットに `reference_max_tokens` を設定すると、助言役の出力に上限を設けて
簡潔な助言にできます。集約役に必要なのは各助言役の判断の要点だけなので、
上限（たとえば `600`）を設けると、質をほとんど落とさずに 1 回あたりの
待ち時間をはっきり縮められます。上限がかかるのは **助言役だけ** で、実際に
動く集約役の出力（利用者が読む答え）に上限がかかることはありません。

```yaml
moa:
  presets:
    fast:
      reference_models:
        - provider: openrouter
          model: anthropic/claude-opus-4.8
        - provider: openrouter
          model: openai/gpt-5.5
      aggregator:
        provider: openrouter
        model: anthropic/claude-opus-4.8
      reference_max_tokens: 600   # concise advice → faster turns
```

未設定のまま（あるいは `0` や空）にすれば、これまでどおり上限なしになります。

### `fanout` で助言役を動かす頻度を決める {#advisor-cadence-with-fanout}

既定では、助言役は **ユーザーのやり取りごとに 1 回** 動きます（`fanout: user_turn`）。
そのやり取りの最初のメッセージで計画レベルの助言をまとめ、あとは実際に動く
集約役がツールの繰り返しを 1 人で進めます。これがいちばん安上がりな頻度で、
助言役の費用がやり取り中のツール呼び出しの数だけ増えることがありません。
費用と引き換えに助言の新しさを取る、別の頻度も 2 つあります。

- `fanout: per_iteration` — 助言役が **ツールの繰り返しのたびに** 動き直すので、
  助言は常に最新のツールの結果を踏まえたものになります。その代わり、助言役の
  待ち時間と費用が、そのやり取り中のツール呼び出しの数だけ増えます。
- `fanout: every_n:3` — 中間の選択肢です。助言役は各やり取りの **最初の**
  繰り返しで動き、そのあとは **3 回目ごと** のツールの繰り返しで動きます
  （`N >= 2` なら何でも使えます）。その間の繰り返しでは、直前に助言役が
  動いたときの助言を再利用するので、集約役はどの段階でも助言を受け取れます。
  ただしその中身が新しくなるのは、毎回ではなく N 回ごとです。数え直しは
  新しいユーザーのメッセージごとに行われるので、どのやり取りも新しい助言から
  始まります。`fanout: {mode: every_n, n: 3}` という書き方も受け付けられ、
  文字列の形に直されます。

```yaml
moa:
  presets:
    fresh:
      reference_models:
        - provider: openrouter
          model: anthropic/claude-opus-4.8
      aggregator:
        provider: openrouter
        model: openai/gpt-5.5
      fanout: per_iteration   # advisors refresh on every tool iteration
```

知らない値や書式の壊れた値は、`user_turn` として扱われます。

:::note 既定値の変更
2026 年 7 月より前は、既定の頻度は `per_iteration` でした。いまの既定は
`user_turn` です。モードごとのベンチマークが高くつく既定を正当化するまでは、
いちばん安く影響の小さい頻度にしてあります。段階ごとの助言を取り戻したい
プリセットは、`fanout: per_iteration` を明示的に設定してください。
:::

### 助言役の出力に対するプライバシーフィルタ {#privacy-filter-for-advisor-outputs}

助言役の出力は、会話に含まれる機微な情報（メールアドレス、書式の整った
電話番号、API キー、JWT）を、UI に表示される参照ブロック、保存された MoA の
記録、集約役へのプロンプトにそのまま持ち出してしまうことがあります。
`moa.privacy_filter`（既定では無効）は、こうした場所を伏せ字にします。

```yaml
moa:
  privacy_filter: display   # or: full
```

- `display` — **利用者の目に触れる場所だけ** を伏せ字にします。UI に描かれる
  ラベル付きの参照ブロックと、`save_traces` が書き出す記録が対象です。集約役に
  渡るのは元のままの助言のテキストなので、答えの質は変わりません。
- `full` — さらに、集約役へのプロンプトに差し込まれる助言のテキスト（および
  1 回かぎりの `/moa` の統合入力）も伏せ字にします。

認証情報らしい形（API キーの接頭辞、JWT、秘密鍵、データベースの接続文字列）は
Hermes 全体で使われる秘密情報の伏せ字処理が隠します。MoA のフィルタは、その上に
メールアドレスと、はっきりした書式の電話番号の伏せ字を加えます。パターンは
コードレビューのような助言のために、あえて控えめにしてあります。単なる数字の
並び、行番号、時刻、git の SHA、IP アドレスには手を付けません。`(555) 123-4567`
や `555-123-4567` のように区切りのある電話番号の書式だけが対象です。

### スロットごとの推論の深さ {#per-slot-reasoning-effort}

参照と集約役のスロットには、`reasoning_effort` も設定できます。同じモデルに
違う深さで参加してほしいときや、助言役の参照より集約役に深く考えてほしいときに
使ってください。指定できる値は、Hermes のふだんの推論の設定と同じで、`none`、
`minimal`、`low`、`medium`、`high`、`xhigh`、`max`、`ultra` です。

```yaml
moa:
  presets:
    deep_review:
      reference_models:
        - provider: openai-codex
          model: gpt-5.6-sol
          reasoning_effort: low
        - provider: openai-codex
          model: gpt-5.6-sol
          reasoning_effort: xhigh
        - provider: xai-oauth
          model: grok-4.5
      aggregator:
        provider: openai-codex
        model: gpt-5.6-sol
        reasoning_effort: high
```

`reasoning_effort` を書かなければ、そのスロットではプロバイダまたは Hermes の既定が使われます。

## ターミナルからプリセットを管理する {#terminal-preset-management}

```bash
hermes moa list
hermes moa configure              # update the default preset
hermes moa configure review       # create or update a named preset
hermes moa delete review
```

## ベンチマーク {#benchmarks}

HermesBench では、2 つのモデルを使う MoA プリセット（`claude-opus-4.8` が `gpt-5.5` の参照をまとめる構成）が、どちらのモデルを単独で動かすよりも高い成績を出しました。

| モデル | HermesBench のスコア |
|---|---|
| **Opus が集約（opus-4.8 + gpt-5.5 を参照）— MoA** | **0.8202** |
| `anthropic/claude-opus-4.8` | 0.7607 |
| `openai/gpt-5.5` | 0.7412 |

この MoA の構成は、いちばん強い構成要素（opus-4.8）を約 6 ポイント上回りました。2 つ目の視点をまとめることが、単に 2 つを平均するのではなく、難しい作業での質を押し上げていることがわかります。

## プロンプトキャッシュ {#prompt-caching}

MoA は、**メインの会話のプロンプトキャッシュを決して壊さない** ように作られています。MoA プリセットを選ぶことは、普通のモデル選択と変わりません。過去のコンテキストを書き換えたり、ツール一式を入れ替えたり、会話の途中でシステムプロンプトを組み直したりはしません。会話の履歴、システムプロンプト、ツールのスキーマはバイト単位で安定したままなので、ほかのモデルが頼りにしているキャッシュ済みの前半部分もそのまま保たれます。MoA プリセットへの切り替えや、そこからの切り替えでキャッシュが無効になる量は、ほかの `/model` の切り替えとまったく同じで、それ以上ではありません。

内部で行われる 2 種類の呼び出しは、どちらも通常どおりキャッシュされます。

- **参照モデル** は、会話を切り詰めた、決まった形の内容を受け取ります（システムプロンプトとツールの記録は取り除かれます。前述の流れを参照）。その内容は安定した履歴から決まる形なので、参照モデルのプロンプトの前半部分は繰り返しのたびに同じになり、通常どおりキャッシュされます。参照はツールを使わない短い助言の呼び出しです。
- **集約役** が、実際に動くモデルです。参照モデルの出力は、直近のユーザーのやり取りの *末尾* に、集約役だけが見る手引きとして付け加えられます。そのテキストは末尾、つまり安定した前半部分（システムプロンプト + それまでの履歴）のすべてより後ろにあるので、キャッシュ済みの前半部分を無効にしません。集約役は差し込みより上の部分すべてでキャッシュに当たり、新しく足された末尾だけが新規になります。これは、新しいユーザーのメッセージがキャッシュされていない末尾のトークンになる、ふだんのやり取りとまったく同じ動きです。

つまり MoA は、どちらの呼び出しでもプロンプトキャッシュを犠牲にしません。本当の費用は、繰り返しごとに増える参照の呼び出しだけです。払っているのは複数のモデルの視点への対価であって、壊れたキャッシュへの対価ではありません。Hermes のほかの部分と共有される、長く生きる会話の前半部分は、そっくりそのまま残ります。

## 補足 {#notes}

- MoA はもう `hermes tools` に載っていません。有効にすべき `moa` のツール一式はありません。
- プリセットに `enabled: false` を設定すると、そのプリセットでは参照への分散が止まります。集約役が単独で動き、それを普通のモデルとして選んだ場合とまったく同じになります。これが、ダッシュボードとデスクトップの設定に出ている、プリセットごとの切り替えスイッチです。
- プリセットの集約役に、別の MoA プリセットを指定することはできません。MoA が入れ子になることは意図的に防いであります。
- 1 つの参照モデルで認証情報の不備があっても、そのやり取りが中断することはありません。Hermes は失敗したことを参照のコンテキストに含めて、返ってきたモデルの分だけで続けます。
- MoA はモデルの呼び出し回数を増やします。モデルの繰り返し 1 回に、複数の参照の呼び出しと集約役の呼び出しが含まれることがあります。
