---
title: "Mixture of Agents"
description: "名前を付けた MoA プリセットを作ると、Mixture of Agents プロバイダの下に選べるモデルとして現れます"
upstream_path: user-guide/features/mixture-of-agents.md
upstream_blob: 25b73724a162118ad72d257c8948233775ac83b5
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/mixture-of-agents
---

# Mixture of Agents {#mixture-of-agents}

Mixture of Agents は、仮想のモデルプロバイダです。名前を付けた MoA のプリセットは、それぞれ `moa` プロバイダの下に選べるモデルとして現れます。

MoA のプリセットを選ぶと、そのプリセットの取りまとめ役が実際に動くモデルになります。アシスタントの返答を書き、ツールの呼び出しを出すのはこのモデルです。参照用のモデルは先に走り、取りまとめ役が使うための分析を渡します。

:::info MoA の実行は誰が支払うのか
**取りまとめ役に、その実行の料金がまるごとかかります**。ツールの繰り返しのすべての段を走らせるのは取りまとめ役なので、プリセットの費用はほぼ全部が取りまとめ役のプロバイダに乗ります。参照用のモデルは、ユーザーのターンごとに 1 回助言するだけです（`fanout` が既定の場合）。主に使うモデルがサブスクリプションのプロバイダにあっても、取りまとめ役が別のところにいるなら、その実行はサブスクリプションではなく取りまとめ役のプロバイダに請求されます。`hermes moa configure` と `hermes moa list` は、取りまとめ役のプロバイダが `model.provider` と違うときに 1 行のお知らせを出しますし、デスクトップの編集画面、`hermes model`、`/model` は、取りまとめ役の枠を「実際に動き、料金のかかるモデル」として印を付けます。
:::

難しい作業で、複数のモデルの見方が効きそうで、それでいて Hermes の普段のエージェントの流れ — ツールの呼び出し、続きの繰り返し、割り込み、記録の保存、そして他のメッセージと同じセッションの文脈 — がそのまま必要なとき、MoA を使ってください。

## MoA のプリセットを自分のモデルとして選ぶ {#select-a-moa-preset-as-your-model}

プリセットは、普段のモデルの選び方でそのまま選べます。

```bash
/model default --provider moa
/model review --provider moa
```

MoA はモデルの仕組みの中では普通のプロバイダなので、MoA のプリセットは **Hermes のどの画面からでも**選べます。

- **CLI / ゲートウェイ / TUI の `/model`** — `/model <preset> --provider moa`、既定のプリセットなら `/model --provider moa` です。名前が設定済みのプリセットとぴったり一致するときは、`/model <preset>` だけでも通ります。
- **`hermes model`** と**ダッシュボードのモデル選択** — `Mixture of Agents` というプロバイダの行が現れ、その中のモデルとしてプリセットの名前が並びます。
- **デスクトップの GUI アプリ** — モデルの一覧に `MoA presets` の区画が出ます。ひとつ選ぶ（`MoA: <preset>`）と、動いているモデルがそのプリセットに切り替わります。デスクトップの設定パネルからは、プリセットの作成と編集もできます。

つまり設定したプリセットは、他のモデルを選ぶときと同じ場所ならどこにでも出てきます。

## スラッシュコマンドの近道 {#slash-command-shortcut}

`/moa` は、その場かぎりの便利な糖衣です。プロンプトを1つだけ**既定の** MoA のプリセットに通し、そのあと元のモデルに戻します。

```bash
/moa design and implement a migration plan for this flaky test cluster
```

Hermes はそのターンのあいだだけ既定の MoA のプリセットに切り替え、プロンプトを送り、終わったら元のモデルに戻します。引数はまるごとプロンプトとして扱われます — `/moa` はもう、それをプリセットの名前とは解釈しません。

```bash
/moa
```

`/moa` だけ（プロンプトなし）だと、使い方が表示されます。

セッションの残りのあいだ MoA のプリセットに**切り替える**には、モデルの選択画面から選んでください — MoA のプリセットは、どのモデル選択の画面でも `Mixture of Agents` というプロバイダの下に出てきます（上を参照）。`/moa` をモデルの切り替えにしていないのは意図的で、普通のプロンプトがうっかりモデルを変えてしまうことがないようにするためです。

## エージェントの流れの中での動き {#how-it-works-in-the-agent-loop}

プロバイダに `moa` を選んでいるとき、主モデルを呼ぶたびに Hermes は次のことをします。

1. 選ばれているプリセットを名前で解決する
2. 設定された参照用のモデルを、ツールの仕様なしで走らせる（渡されるのは会話のユーザーとアシスタントの文だけで、Hermes のシステムプロンプトやツール呼び出しの記録は渡りません。そのおかげで参照の呼び出しは安く済み、仕様に厳しいプロバイダにはねられることも避けられます）
3. 参照の出力を、取りまとめ役だけに見える文脈として後ろに足す
4. 設定された取りまとめ役を、Hermes の普段のツールの仕様とともに呼ぶ
5. 取りまとめ役の応答を、本物のモデルの応答として扱う
6. 取りまとめ役がツールを呼んだら、Hermes はそのツールを普通に実行する
7. 次のモデルの繰り返しでは、ツールの結果も含めて更新された会話に対して、同じ MoA の手順がもう一度走る

MoA は普段のモデルの仕組みを通して選ばれるので、`/goal`、ゲートウェイのセッション、TUI のセッション、デスクトップのチャットと自動で噛み合います。

## プリセットを設定する {#configure-presets}

名前を付けた MoA のプリセットは、次のところから設定できます。

- ダッシュボード → Models → Model Settings → Mixture of Agents
- デスクトップアプリ → Settings → Model → Mixture of Agents
- `hermes moa configure [name]`
- `config.yaml`

設定にはプロバイダとモデルの組をそのまま書くので、複数のプロバイダを混ぜることも、同じプロバイダから複数のモデルを使うこともできます。

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

      enabled: true
```

既定のプリセットはこうなっています。

- 参照: `openai-codex:gpt-5.5`
- 参照: `openrouter:deepseek/deepseek-v4-pro`
- 取りまとめ役 / 実際に動くモデル: `openrouter:anthropic/claude-opus-4.8`

### 助言役の出力 {#advisor-output}

MoA は、プロバイダ側が持つ出力の上限に従います。プリセットごと・枠ごとに出力トークンの上限を決める設定は、もう使えません。プロバイダの既定はまちまちで、書かなかったからといってつねにそのモデルの最大値になるとはかぎりません。出力の上限を必ず要求する形式のやり取りには、Hermes が内部の値を渡します。

### `fanout` で助言役の頻度を決める {#advisor-cadence-with-fanout}

既定では、助言役は**ユーザーのターンごとに1回**走ります（`fanout: user_turn`）。ターンの最初のメッセージで計画の水準の助言をまとめ、そのあとのツールのやり取りは、実際に動く取りまとめ役が一人で進めます。これがいちばん安い頻度です。助言役の費用が、ターンの中のツールの呼び出しの数だけ膨らむことがありません。ほかに2つ、費用と助言の新しさを引き換えにする頻度があります。

- `fanout: per_iteration` — 助言役が**ツールの繰り返しごとに**走り直すので、助言はつねに最新のツールの結果を追いかけます — その代わり、助言役にかかる待ち時間と費用が、ターンの中のツールの呼び出しの数だけ膨らみます。
- `fanout: every_n:3` — その中間です。助言役は各ユーザーのターンの**最初の**繰り返しで走り、そのあとは**3回に1回**のツールの繰り返しで走ります（`N >= 2` ならどの数でも動きます）。あいだの繰り返しは、直前に助言役が走ったときの案内を取っておいたものを使い回すので、取りまとめ役はどの段階でも助言を受け取れます — それが N 段階ごとに新しくなる、というだけです。数え直しは新しいユーザーのメッセージのたびに起きるので、どのターンも新しい助言から始まります。`fanout: {mode: every_n, n: 3}` という書き方も受け付けられ、文字列の形に直されます。

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

知らない値や形の壊れた値は、`user_turn` に落ちます。

:::note 既定が変わりました
2026年7月より前は、既定の頻度は `per_iteration` でした。いまの既定は `user_turn` — いちばん安く、影響のいちばん小さい頻度 — です。もっと高い既定を正当化できる、頻度ごとのベンチマークが出るまではこのままです。段階ごとの助言を取り戻したいプリセットは、`fanout: per_iteration` をはっきり書いてください。
:::

### 助言役の出力にかける秘匿の網 {#privacy-filter-for-advisor-outputs}

助言役の出力は、会話の中の機微なデータ — メールアドレス、書式の整った電話番号、API キー、JWT — を、画面に出る参照のブロック、保存された MoA の記録、そして取りまとめ役へのプロンプトへ、そのまま流してしまうことがあります。`moa.privacy_filter`（既定では切れています）は、それらを伏せます。

```yaml
moa:
  privacy_filter: display   # or: full
```

- `display` — **利用者の目に触れるところだけ**伏せます。画面に描かれる、名札の付いた参照のブロックと、`save_traces` が書き出す記録です。取りまとめ役には助言の生の文がそのまま渡るので、答えの質は落ちません。
- `full` — それに加えて、取りまとめ役へのプロンプトに差し込まれる助言の文（と、その場かぎりの `/moa` がまとめるときの入力）も伏せます。

資格情報の形（API キーの接頭辞、JWT、秘密鍵、DB の接続文字列）は、Hermes の中心にある秘密の伏せ字の仕組みが隠します。MoA の網は、その上にメールアドレスと、はっきり書式の整った電話番号の伏せ字を足します。コードレビューのような助言のために、当てはめ方はわざと控えめにしてあります。裸の数字の並び、行番号、時刻、git の SHA、IP アドレスには決して触れません — `(555) 123-4567` や `555-123-4567` のように区切りのある電話番号の形だけが当たります。

### 枠ごとの推論の強さ {#per-slot-reasoning-effort}

参照の枠と取りまとめ役の枠には、`reasoning_effort` も設定できます。同じモデルに違う深さで加わってほしいときや、取りまとめ役に助言役の参照より深く考えてほしいときに使います。使える値は Hermes の普段の推論の設定と同じで、`none`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max`、`ultra` です。

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

`reasoning_effort` を書かなければ、その枠にはプロバイダまたは Hermes の既定が使われます。

## ターミナルでのプリセットの管理 {#terminal-preset-management}

```bash
hermes moa list
hermes moa configure              # update the default preset
hermes moa configure review       # create or update a named preset
hermes moa delete review
```

`hermes moa list` は、取りまとめ役を「実際に動き、費用のほとんどを引き受けるモデル」として示し、参照は（既定では）ユーザーのターンごとに 1 回助言するものとして並べます。取りまとめ役のプロバイダが主に使う `model.provider` と違うときは、`list` も `configure` も次の行を足します。

```text
Aggregator is on nous; the whole tool loop will be billed there, not to openai-codex.
```

## ベンチマーク {#benchmarks}

HermesBench では、2つのモデルによる MoA のプリセット — `claude-opus-4.8` が `gpt-5.5` の参照を取りまとめる形 — が、どちらのモデルを単体で走らせたときよりも高い点を出しました。

| モデル | HermesBench の点 |
|---|---|
| **Opus が取りまとめ（opus-4.8 + gpt-5.5 の参照） — MoA** | **0.8202** |
| `anthropic/claude-opus-4.8` | 0.7607 |
| `openai/gpt-5.5` | 0.7412 |

MoA の構成は、その中でいちばん強い部品（opus-4.8）を約6ポイント上回りました。2つ目の見方を取りまとめることが、単に2つを平均するのではなく、難しい作業での質を押し上げていることの裏付けです。

## プロンプトのキャッシュ {#prompt-caching}

MoA は、**主となる会話のプロンプトのキャッシュを決して壊さない**ように作られています。MoA のプリセットを選ぶのは普通のモデルの選択で、過去の文脈を書き換えることも、ツールの組を入れ替えることも、会話の途中でシステムプロンプトを組み直すこともありません。会話の履歴、システムプロンプト、ツールの仕様はバイト単位で安定したままなので、他のどのモデルも頼りにしているキャッシュ済みの先頭部分は、普通のモデルのときとまったく同じように保たれます。MoA のプリセットへの切り替えも、そこからの切り替えも、キャッシュが無効になる度合いは他の `/model` の切り替えと同じです — それ以上ではありません。

内部の2種類の呼び出しは、どちらも普通にキャッシュが効きます。

- **参照用のモデル**には、会話を切り詰めた、いつも同じ形の眺めが渡ります（システムプロンプトとツールの記録は取り除かれます — 上の流れを参照）。その眺めは安定した履歴から決まる安定した関数なので、参照用モデルのプロンプトの先頭部分は繰り返しのたびに同じになり、普通にキャッシュが効きます。参照はツールを持たない、短い助言のための呼び出しです。
- **取りまとめ役**は、実際に動くモデルです。参照の出力は、内輪の案内だけを載せた*それ自身の*末尾のユーザーメッセージとして足されます — 利用者のメッセージに混ぜ込まれることはありません。その塊は末尾に置かれる — 安定した先頭部分（システムプロンプト + 利用者のメッセージ + それまでのツールの履歴）より下にある — ので、キャッシュ済みの先頭部分を無効にしません。OpenAI 互換の取りまとめ役では、ツールの繰り返しの中のどのリクエストも、案内の塊を除けば直前のリクエストをバイト単位でそのまま延ばした形になるため、取りまとめ役は差し込みより上のすべてでキャッシュに当たり、新しく足された末尾だけが新しい分になります。これは普通のターンのふるまいそのもので、新しいユーザーのメッセージもまた、キャッシュに載っていない末尾のトークンです。（Anthropic Messages、Bedrock Converse、Gemini 純正の通信形式にいる取りまとめ役では、ターンの最初の繰り返しで案内が利用者のメッセージに畳み込まれます。これらの変換は隣り合うユーザーのターンをまとめるためで、その場合もキャッシュに当たる範囲は利用者のメッセージより上から始まります。）

というわけで MoA は、どちらの呼び出しでもプロンプトのキャッシュを犠牲にしません。実際の費用は参照の呼び出しが増えることだけです（`fanout` が既定なら、ユーザーのターンごとに 1 回）— 払っているのは複数のモデルの見方の分であって、壊れたキャッシュの分ではありません。Hermes の他の部分と共有している、長く生きる会話の先頭部分は、そのまま無傷です。

## 覚えておきたいこと {#notes}

- MoA はもう `hermes tools` の一覧には出ません。有効にすべき `moa` のツールの組はありません。
- プリセットに `enabled: false` を設定すると、そのプリセットの参照への広がりが切れます。取りまとめ役が一人で動き、それを普通のモデルとして選んだのとまったく同じになります。これがダッシュボードとデスクトップの設定に出ている、プリセットごとの切り替えです。
- プリセットの取りまとめ役に、別の MoA のプリセットを指定することはできません。MoA が入れ子になる形は、意図して止めてあります。
- 参照用モデルのひとつで資格情報の問題が起きても、そのターンは中断しません。Hermes はその失敗を参照の文脈に含めたうえで、返ってきたモデルの分で先へ進みます。
- MoA はモデルの呼び出しの回数を増やします。モデルの繰り返し1回に、複数の参照の呼び出しと取りまとめ役の呼び出しが入ることがあります。
- プリセットはフォールバックの項目にもできます（`fallback_providers: [{provider: moa, model: <preset>}]`）。主となるモデルが失敗すると、Hermes はそのプリセットそのものを立ち上げます — 参照と取りまとめ役を、`moa://local` を仮のエンドポイントとして走らせる形で、`/model <preset> --provider moa` を実行したときとまったく同じです。プリセットが見つからないときや、その取りまとめ役に認証情報がないときは、この項目は飛ばされます。
