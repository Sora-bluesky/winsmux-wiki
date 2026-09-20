---
title: "Mixture of Agents"
description: "名前を付けた MoA プリセットを作り、Mixture of Agents プロバイダーの選べるモデルとして表示します"
upstream_path: user-guide/features/mixture-of-agents.md
upstream_blob: 18abd47e9e10e883e10e54d9755308d917af6e72
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/mixture-of-agents
---

# Mixture of Agents {#mixture-of-agents}

Mixture of Agents は仮想のモデルプロバイダーです。名前を付けた MoA プリセットは、それぞれ `moa` プロバイダーの下に選べるモデルとして並びます。

MoA プリセットを選ぶと、そのプリセットの集約役（aggregator）が実際に動くモデルになります。返答を書き、ツール呼び出しを出すのはこのモデルです。参照モデルは先に動き、集約役が使うための分析を返します。

:::info MoA の料金はどこに乗るか
**1回の実行分はまるごと集約役の側に請求されます**。ツールのループを最後まで回すのは集約役なので、プリセットのコストはほぼすべて集約役のプロバイダーに乗ります。参照モデルは（既定の `fanout` なら）ユーザーの発言1回につき一度助言するだけです。主モデルが定額契約のプロバイダーでも、集約役が別のところにあるなら、その実行は契約側ではなく集約役のプロバイダーに課金されます。集約役のプロバイダーが `model.provider` と違う場合、`hermes moa configure` と `hermes moa list` が1行の注意書きを出しますし、Desktop の編集画面・`hermes model`・`/model` でも、集約役の枠が「実際に動き、課金されるモデル」として示されます。
:::

MoA が向くのは、難しい仕事で複数のモデルの視点がほしいけれど、Hermes の通常のエージェントループ（ツール呼び出し、反復、割り込み、記録の保存、他のメッセージと同じセッション文脈）もそのまま必要な場面です。

## MoA プリセットをモデルとして選ぶ {#select-a-moa-preset-as-your-model}

プリセットは、通常のモデル選択の画面やコマンドから選べます。

```bash
/model default --provider moa
/model review --provider moa
```

MoA はモデルの仕組みの中では普通のプロバイダーなので、MoA プリセットは **Hermes のどの画面からでも**選べます。

- **CLI / ゲートウェイ / TUI の `/model`** — `/model <preset> --provider moa`、または既定のプリセットなら `/model --provider moa`。設定済みのプリセット名と完全に一致していれば、`/model <preset>` だけでも動きます。
- **`hermes model`** と**ダッシュボードのモデル選択** — `Mixture of Agents` というプロバイダーの行が現れ、プリセット名がそのモデルとして並びます。
- **Desktop アプリ** — モデルの一覧に `MoA presets` の区分が出ます。そこから選ぶ（`MoA: <preset>`）と、使用中のモデルがそのプリセットに切り替わります。Desktop の設定画面ではプリセットの作成と編集もできます。

つまり設定したプリセットは、他のモデルを選ぶのと同じ場所すべてに現れます。

## スラッシュコマンドの近道 {#slash-command-shortcut}

`/moa` は1回かぎりの便利な書き方です。**既定の** MoA プリセットでプロンプトを1回だけ実行し、そのあと元のモデルに戻します。

```bash
/moa design and implement a migration plan for this flaky test cluster
```

Hermes はそのターンのあいだだけ既定の MoA プリセットへ切り替えてプロンプトを送り、終わったら元のモデルに戻します。引数は全体がプロンプトとして扱われます。`/moa` はもう引数をプリセット名とは解釈しません。

```bash
/moa
```

プロンプトなしの `/moa` は使い方を表示するだけです。

そのセッションのあいだ MoA プリセットに**切り替えたい**場合は、モデル選択の画面から選んでください。MoA プリセットは、どのモデル選択画面でも `Mixture of Agents` プロバイダーの下に並びます（上記参照）。`/moa` をモデルの切り替えにしていないのは意図的で、普通のプロンプトで誤ってモデルが変わることがないようにするためです。

## エージェントループの中での動き {#how-it-works-in-the-agent-loop}

プロバイダーに `moa` を選んでいるとき、主モデルを呼ぶたびに Hermes は次のように動きます。

1. 選ばれているプリセットを名前から解決する
2. 設定された参照モデルをツールの定義なしで動かす（渡すのは会話中のユーザーとアシスタントの文章だけで、Hermes のシステムプロンプトやツール呼び出しの記録は渡しません。そのぶん参照モデルの呼び出しは安く済み、入力に厳しいプロバイダーに弾かれることも避けられます）
3. 参照モデルの出力を、集約役だけに見える文脈として追加する
4. 設定された集約役を、Hermes の通常のツール定義付きで呼ぶ
5. 集約役の返答を、そのままモデルの返答として扱う
6. 集約役がツールを呼んだら、Hermes は通常どおりそのツールを実行する
7. 次のモデル呼び出しでは、ツールの結果を含む更新後の会話に対して、同じ MoA の流れをもう一度回す

MoA は通常のモデルの仕組みを通して選ばれるので、`/goal`、ゲートウェイのセッション、TUI のセッション、Desktop のチャットとも自動で組み合わさります。

## プリセットを設定する {#configure-presets}

名前を付けた MoA プリセットは、次の場所から設定できます。

- ダッシュボード → Models → Model Settings → Mixture of Agents
- Desktop アプリ → Settings → Model → Mixture of Agents
- `hermes moa configure [name]`
- `config.yaml`

設定にはプロバイダーとモデルの組み合わせをそのまま書くので、複数のプロバイダーを混ぜることも、同じプロバイダーから複数のモデルを使うこともできます。

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

既定のプリセットの中身です。

- 参照モデル: `openai-codex:gpt-5.5`
- 参照モデル: `openrouter:deepseek/deepseek-v4-pro`
- 集約役（実際に動くモデル）: `openrouter:anthropic/claude-opus-4.8`

### 助言側の出力 {#advisor-output}

MoA では、出力の上限はプロバイダー側のものに従います。プリセット単位・枠単位で
出力トークンの上限を設定する仕組みはもうありません。プロバイダーの既定値はまちまちで、
指定しないことが必ずしもモデルの最大値を意味するわけではありません。出力上限が必須の
プロトコルには、Hermes が内部の値を渡します。

### `fanout` による助言の頻度 {#advisor-cadence-with-fanout}

既定では、助言役は**ユーザーの発言1回につき一度**動きます（`fanout: user_turn`）。
そのターンの最初のメッセージに対して方針レベルの助言をまとめ、あとは実際に動く
集約役がツールのループを1人で進めます。これがいちばん安い頻度で、助言のコストが
そのターンのツール呼び出し回数に比例して増えることがありません。コストと助言の
新しさを引き換えにする頻度が、ほかに2つあります。

- `fanout: per_iteration` — 助言役が**ツールの反復ごとに**動き直すので、助言は
  常に最新のツール結果を踏まえたものになります。そのぶん助言の待ち時間と費用が、
  そのターンのツール呼び出し回数だけ増えます。
- `fanout: every_n:3` — その中間です。助言役は各ターンの**最初**の反復と、
  そこから**3回**ごとの反復で動きます（`N >= 2` なら何でも指定できます）。
  あいだの反復では、直近の助言をそのまま使い回すので、集約役はどの段階でも
  助言を受け取れます。更新が毎回ではなく N 回ごとになるだけです。カウンターは
  新しいユーザーの発言ごとに戻るので、どのターンも新しい助言から始まります。
  `fanout: {mode: every_n, n: 3}` という書き方も受け付け、内部で文字列の形に
  そろえられます。

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

知らない値や書式の壊れた値は `user_turn` として扱われます。

:::note 既定値の変更
2026年7月より前は、既定の頻度が `per_iteration` でした。現在の既定は
`user_turn` です。モードごとのベンチマークで高いコストが正当化されるまでは、
いちばん安く影響の小さい頻度を既定とします。毎回の助言を取り戻したい
プリセットは、`fanout: per_iteration` を明示してください。
:::

### 助言の出力に対する秘匿フィルター {#privacy-filter-for-advisor-outputs}

助言役の出力には、会話の中の機微な情報（メールアドレス、整った形式の電話番号、
API キー、JWT）がそのまま出てしまうことがあります。それが UI に表示される参照ブロック、
保存された MoA の記録、集約役へのプロンプトに入り込みます。`moa.privacy_filter`
（既定は無効）は、それらを伏せ字にします。

```yaml
moa:
  privacy_filter: display   # or: full
```

- `display` — **利用者から見える場所だけ**を伏せ字にします。UI に表示される
  ラベル付きの参照ブロックと、`save_traces` が書き出す記録が対象です。集約役には
  助言の文章がそのまま渡るので、回答の質には影響しません。
- `full` — 加えて、集約役へのプロンプトに差し込まれる助言の文章（および
  1回かぎりの `/moa` でまとめる際の入力）も伏せ字にします。

認証情報らしい形（API キーの接頭辞、JWT、秘密鍵、DB の接続文字列）は、Hermes 共通の
伏せ字処理でマスクされます。MoA のフィルターは、そこにメールアドレスと明確な形式の
電話番号を足すものです。コードレビューのような助言を壊さないよう、パターンは
控えめにしてあります。数字の並び、行番号、日時、git の SHA、IP アドレスには
いっさい触れません。`(555) 123-4567` や `555-123-4567` のように区切り付きの
電話番号だけが対象です。

### 枠ごとの推論の深さ {#per-slot-reasoning-effort}

参照モデルと集約役の枠には、`reasoning_effort` も指定できます。同じモデルに
違う深さで参加させたいとき、あるいは助言役より集約役に深く考えさせたいときに使います。
指定できる値は Hermes の通常の推論設定と同じで、`none`、`minimal`、`low`、`medium`、`high`、
`xhigh`、`max`、`ultra` です。

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

`reasoning_effort` を省くと、その枠はプロバイダーまたは Hermes の既定値になります。

## ターミナルからのプリセット管理 {#terminal-preset-management}

```bash
hermes moa list
hermes moa configure              # update the default preset
hermes moa configure review       # create or update a named preset
hermes moa delete review
```

`hermes moa list` は、集約役を「実際に動き、コストのほとんどを負担するモデル」として示し、参照モデルは（既定では）ユーザーの発言1回につき一度助言するものとして並べます。集約役のプロバイダーが主モデルの `model.provider` と違う場合、`list` と `configure` のどちらも次の1行を足します。

```text
Aggregator is on nous; the whole tool loop will be billed there, not to openai-codex.
```

## ベンチマーク {#benchmarks}

HermesBench では、2モデル構成の MoA プリセット（`gpt-5.5` の参照を `claude-opus-4.8` が集約するもの）が、どちらのモデルを単独で動かした場合よりも高い点数を出しました。

| モデル | HermesBench のスコア |
|---|---|
| **Opus を集約役にした構成（opus-4.8 + gpt-5.5 の参照）— MoA** | **0.8202** |
| `anthropic/claude-opus-4.8` | 0.7607 |
| `openai/gpt-5.5` | 0.7412 |

MoA の構成は、いちばん強い単体（opus-4.8）を約6ポイント上回っています。2つ目の視点を集約することが、単に両者を平均するのではなく、難しい仕事の質を押し上げていると言えます。

## プロンプトキャッシュ {#prompt-caching}

MoA は、**主たる会話のプロンプトキャッシュを壊さない**ように作られています。MoA プリセットを選ぶのは普通のモデル選択であり、過去の文脈を書き換えたり、ツールの組み合わせを差し替えたり、会話の途中でシステムプロンプトを組み直したりはしません。会話の履歴、システムプロンプト、ツールの定義はバイト単位で安定したままなので、他のモデルが頼りにしているキャッシュ済みの前半部分もそのまま保たれます。MoA プリセットに切り替える、あるいはそこから離れるときのキャッシュの無効化は、他の `/model` の切り替えと同じ程度で、それ以上ではありません。

内部の2種類の呼び出しは、どちらも普通にキャッシュが効きます。

- **参照モデル**には、会話を削った決まった形の内容が渡ります（システムプロンプトとツールの記録は取り除かれます。上のループを参照してください）。この内容は安定した履歴から一意に決まるので、参照モデルへのプロンプトの前半は反復をまたいで同じものになり、普通にキャッシュされます。参照モデルの呼び出しは短い助言用で、ツールは使いません。
- **集約役**が実際に動くモデルです。参照モデルの出力は、*それ自体が*末尾のユーザーメッセージとして、助言の形で追加されます。あなたのメッセージに混ぜられることはありません。このブロックは末尾、つまり安定した前半部分（システムプロンプト＋あなたのメッセージ＋それまでのツールの記録）より後ろに置かれるので、キャッシュ済みの前半を無効にしません。ツールのループの中では、どのリクエストも直前のものから助言ブロックを除いた内容とバイト単位で一致する延長になっているため、集約役は差し込みより上の部分すべてでキャッシュが効き、新しく足された末尾だけが新規になります。これは、新しいユーザーメッセージが毎回キャッシュされていない末尾になるという、通常のターンとまったく同じ振る舞いです。Anthropic Messages、Bedrock Converse、Gemini の独自形式では、集約役が隣り合う2つのユーザーターンを1つのメッセージにまとめますが、中身は別々のブロックのままです。あなたのメッセージのブロックは後の反復で再生されるものとバイト単位で一致し、その後ろに助言のブロックが続くので、キャッシュ済みの前半はあなたのメッセージまで通ります。

  OpenAI 互換の形式では、ターンの最初の反復でリクエストの末尾が `user(your message), user(guidance)` になります。ユーザーとアシスタントが必ず交互に並ぶことを求める一部のチャットテンプレート（llama.cpp や vLLM の Jinja テンプレート、一部の OpenRouter の経路）は、これを `Conversation roles must alternate` のような 400 で拒否します。Hermes はこれを自力で立て直します。隣り合う2つのユーザーメッセージをまとめてそのリクエストだけ再送し、その集約役の宛先（エンドポイントとモデル）をセッションのあいだ覚えておき、以降のターンは最初からまとめた形で送ります。それ以外の宛先は、分けたままのキャッシュに優しい形を保ちます。まとめる処理を要求された宛先にだけ適用するのは、どこでもまとめてしまうと、先に書いた前半部分のずれが再び起きるからです。

このように MoA は、どちらの呼び出しでもプロンプトキャッシュを犠牲にしません。実際のコストは参照モデルの追加呼び出しだけ（既定の `fanout` ならユーザーの発言1回につき一度）です。払っているのは複数のモデルの視点に対してであって、壊れたキャッシュに対してではありません。Hermes の他の部分と共有する長寿命の会話の前半部分は、まるごと無傷のままです。

## 補足 {#notes}

- MoA は `hermes tools` の一覧には載らなくなりました。有効にすべき `moa` のツール群はありません。
- プリセットに `enabled: false` を設定すると、そのプリセットの参照モデルへの展開が止まります。集約役が単独で動き、それを普通のモデルとして選んだのとまったく同じ状態になります。これがダッシュボードと Desktop の設定に出ている、プリセットごとのオフの切り替えです。
- プリセットの集約役に、別の MoA プリセットを指定することはできません。MoA を入れ子にすることは意図的に禁じています。
- 参照モデルの1つで認証に失敗しても、そのターンは中断しません。Hermes は失敗した事実を参照の文脈に含めたうえで、返答のあったモデルで先へ進みます。
- MoA はモデルの呼び出し回数を増やします。モデルの反復1回に、複数の参照モデルの呼び出しと集約役の呼び出しが含まれることがあります。
- プリセットはフォールバック先にも指定できます（`fallback_providers: [{provider: moa, model: <preset>}]`）。主たる指定が失敗すると、Hermes はそのプリセット自体（参照モデルと集約役、仮想のエンドポイントは `moa://local`）を起動します。これは `/model <preset> --provider moa` と同じ動きです。プリセットが解決できない場合や、その集約役に認証情報がない場合、この指定は読み飛ばされます。
