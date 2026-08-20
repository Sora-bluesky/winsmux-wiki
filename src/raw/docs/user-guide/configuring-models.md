---
title: "モデルを設定する"
description: ""
upstream_path: user-guide/configuring-models.md
upstream_blob: 422cdc57a3ba2a5acef53717a654d294f2c8c624
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/configuring-models
---

# モデルを設定する {#configuring-models}

Hermes には 2 種類のモデル枠があります。

- **メインモデル** — エージェントが考えるために使うモデルです。ユーザーからのメッセージ、ツール呼び出しのループ、ストリーミングで返る応答は、すべてこのモデルを通ります。
- **補助モデル** — エージェントが脇の仕事として切り出す、小さめのモデルです。コンテキストの圧縮、画像を読む処理（ビジョン）、Web ページの要約、承認の判定、MCP ツールの振り分け、セッション名の生成、スキル検索が該当します。それぞれ専用の枠を持っていて、個別に上書きできます。

このページでは、その両方をダッシュボードから設定する方法を説明します。設定ファイルや CLI で操作したい場合は、末尾の [別のやり方](#alternative-methods) へ進んでください。

:::tip いちばん速いのは Nous Portal
[Nous Portal](https://hermes-agent.nousresearch.com/user-guide/features/tool-gateway) なら、1 つのサブスクリプションで 300 以上のモデルを使えます。入れたばかりの環境では `hermes setup --portal` を実行すると、ログインと Nous をプロバイダーに設定する作業がコマンド 1 つで済みます。何がつながっているかは `hermes portal info` で確認できます。

- Portal の契約者は、トークン課金型のプロバイダーが **10% 割引**になります。
:::

:::note `model:` の書式 — 空文字と辞書形式
入れたばかりの環境では、同梱の既定設定が `model: ""`（まだ設定されていないことを示す空文字）になっています。`hermes setup` か `hermes model` を最初に実行した時点で、このキーはその場で `provider`、`default`、`base_url`、`api_mode` を子キーに持つ辞書形式へ書き換わります。このページや [`profiles.md`](/hermes/docs/user-guide/profiles/) / [`configuration.md`](/hermes/docs/user-guide/configuration/) で示している形です。`config.yaml` に空文字が残っているのを見かけたら、`hermes model` を実行する（またはダッシュボードで **Change** を押す）と、Hermes が辞書形式に書き直してくれます。
:::

## Models ページ {#the-models-page}

ダッシュボードを開き、サイドバーの **Models** を押します。画面は 2 つの部分に分かれています。

1. **Model Settings** — 上のパネルで、モデルを各枠に割り当てます。
2. **利用状況の分析** — 選んだ期間にセッションを動かしたモデルを、トークン数・費用・対応機能のバッジ付きで順位表示するカード群です。

![Models ページの全体](https://hermes-agent.nousresearch.com/img/docs/dashboard-models/overview.png)

いちばん上のカードが **Model Settings** パネルです。メインの行には、新しいセッションでエージェントが起動するモデルが常に表示されます。**Change** を押すと選択画面が開きます。

## メインモデルを設定する {#setting-the-main-model}

Main model の行にある **Change** を押します。

![モデル選択のダイアログ](https://hermes-agent.nousresearch.com/img/docs/dashboard-models/picker-dialog.png)

選択画面は 2 列構成です。

- **左** — 認証済みのプロバイダーです。設定を済ませたもの（API キーを登録した、OAuth を通した、独自エンドポイントとして定義した）だけが並びます。使いたいプロバイダーが見当たらないときは、**Keys** へ移動して認証情報を追加してください。
- **右** — 選んだプロバイダーについて、Hermes が厳選したモデル一覧です。エージェント用途に向くモデルだけを載せており、`/models` の生の一覧ではありません（OpenRouter の場合、生の一覧には音声合成や画像生成、再ランキング用まで含めて 400 以上が並びます）。

絞り込み欄に入力すると、プロバイダー名・スラッグ・モデル ID で絞り込めます。

モデルを選んで **Switch** を押すと、Hermes が `~/.hermes/config.yaml` の `model` セクションに書き込みます。**反映されるのは新しいセッションだけ**で、すでに開いているチャットのタブは、始めたときのモデルのまま動き続けます。今のチャットをその場で入れ替えたいときは、中で `/model` スラッシュコマンドを使ってください。

### セッション途中での切り替えとコンテキストの警告 {#mid-session-switches-and-context-warnings}

**動いているセッションの中で**モデルを切り替えると（Herm TUI のモデル選択画面、`hermes` CLI、Telegram / Discord での `/model`）、Hermes は**次のメッセージ**で新しいモデルのコンテキスト長に対する**送信前のコンテキスト圧縮**が走るかどうかを見積もります。そのモデルの圧縮しきい値（[コンテキストの圧縮](/hermes/docs/user-guide/configuration/#context-compression) を参照）にすでに近い、または超えている場合は、切り替えの応答に警告が付きます。高価なモデルを知らせるときと同じ `warning_message` の経路です。切り替え自体はすぐ反映され、圧縮は**切り替え後の最初のユーザーメッセージ**でモデルが答える前に走ります。

:::warning セッション途中の切り替えはプロンプトキャッシュを捨てる
プロンプトキャッシュはリクエストを処理したモデルごとに持たれるため、会話の途中でモデルが変わると、つまり明示的な `/model` での切り替えでも、[自動フォールバック](/hermes/docs/user-guide/features/fallback-providers/) でも、[認証情報プール](/hermes/docs/user-guide/features/credential-pools/) が別アカウントへ回った場合でも、次のメッセージは会話全体を入力トークンの正規料金で読み直します。キャッシュが効いていれば 75〜90% ほど安く済んでいた分がなくなるということです。長いセッションでは、この 1 回の読み直しが 2 つのモデルの単価差より大きくなることもあります。必要なときに切り替えるのは構いませんが、会話の早い段階か、新しいセッションを始めた直後にするのが得です。
:::

### 無人実行とデータ学習ありのティア {#unattended-data-training-tiers}

`muse-spark-1.2-contributor` のようなモデルが安いのは、送ったプロンプトと応答を提供元が学習に使う場合があるからです。対話的にモデルを選ぶときは、必ず確認のプロンプトが出ます。カンバンのワーカーや cron エージェントのように対話できない起動経路では、確認できないため実行を止めます。

無人で動かす作業のデータが学習に使われても構わないなら、了承した記録を残しておけます。

```bash
hermes config set security.allow_data_training_tiers_noninteractive true
```

この設定をしても、Hermes は無人起動のたびにデータの扱いに関する警告全文と了承のキー名を出力するので、ワーカーのログには記録が残ります。この設定は高価なモデルの警告やプロバイダー振り分けの警告までは承認しませんし、対話時の確認プロンプトの代わりにもなりません。取り消すときは `hermes config unset security.allow_data_training_tiers_noninteractive` を使います。

## 補助モデルを設定する {#setting-auxiliary-models}

**Show auxiliary** を押すと、11 個のタスク枠が表示されます。

![補助モデルのパネルを開いたところ](https://hermes-agent.nousresearch.com/img/docs/dashboard-models/auxiliary-expanded.png)

補助タスクはすべて既定で `auto` です。つまり、その仕事にもまずメインモデルを試します。その経路が使えない、あるいは容量不足のような失敗になった場合、`auto` はまずタスクごとの `auxiliary.<task>.fallback_chain` をたどり、次にメインの `fallback_providers` / `fallback_model` の連鎖、最後に Hermes 内蔵の補助モデル探索の連鎖へ進みます。脇の仕事にもっと安い、あるいは速いモデルを使いたいときに、個別のタスクを上書きしてください。

### よくある上書きのパターン {#common-override-patterns}

| タスク | どういうときに上書きするか |
|---|---|
| **Title Gen** | セッション名を付ける速さや費用のほうが、メインモデルと揃えることより大事なとき。実績のある軽量モデルを固定するか、`auxiliary.title_generation.prefer_fast_model: true` を設定して、そのプロバイダーの高速モデルを Hermes に選ばせます。 |
| **Vision** | メインモデルが画像を扱えないとき。`google/gemini-2.5-flash` や `gpt-4o-mini` に向けます。 |
| **Compression** | コンテキストを要約するだけのために Opus や M2.7 で推論トークンを燃やしているとき。速いチャットモデルなら 50 分の 1 の費用で同じ仕事をこなします。 |
| **Approval** | `approval_mode: smart` のとき。速くて安いモデル（haiku、flash、gpt-5-mini）が、危険度の低いコマンドを自動承認してよいか判断します。ここに高価なモデルを置くのは無駄です。 |
| **Web Extract** | `web_extract` をよく使うとき。圧縮と同じ理屈で、要約に推論力は要りません。 |
| **Skills Hub** | `hermes skills search` が使います。たいていは `auto` のままで問題ありません。 |
| **MCP** | MCP ツールの振り分けです。たいていは `auto` のままで問題ありません。 |
| **Triage Specifier** | カンバンの仕分け担当（`hermes kanban specify`）を振り分けます。ざっくり 1 行で書いた依頼を、具体的な仕様へ広げる役です。安くて能力のあるモデルが向きます。 |
| **Kanban Decomposer** | カンバンのタスク分解を振り分けます。仕分け済みのタスクを、専門プロファイル向けの子タスクのグラフに分けます。 |
| **Profile Describer** | プロファイルの説明文の生成（`hermes profile describe --auto` やダッシュボードの自動生成ボタン）を振り分けます。短くて安い呼び出しです。 |
| **Curator** | スキルの使われ方を見直すキュレーター処理を振り分けます。推論モデルだと数分かかることもあるので、安い補助モデルにする価値が出やすい枠です。 |

### タスクごとの上書き {#per-task-override}

補助タスクの行で **Change** を押します。開くのは同じ選択画面で、動きも同じです。プロバイダーとモデルを選び、Switch を押します。行の表示が `auto (use main model)` から `provider · model` に変わります。

### すべて auto に戻す {#reset-all-to-auto}

細かく調整しすぎてやり直したくなったら、補助タスク欄の上にある **Reset all to auto** を押します。すべての枠がメインモデルを使う状態へ戻ります。

## 「Use as」ショートカット {#the-use-as-shortcut}

このページのモデルカードには、どれにも **Use as** のドロップダウンが付いています。これがいちばん手早い経路で、利用状況に出ているモデルを選んで **Use as** を押せば、メインの枠や特定の補助タスクへ 1 クリックで割り当てられます。

![Use as のドロップダウン](https://hermes-agent.nousresearch.com/img/docs/dashboard-models/use-as-dropdown.png)

ドロップダウンの中身は次のとおりです。

- **Main model** — メインの行で Change を押すのと同じです。
- **All auxiliary tasks** — このモデルを 11 個の補助枠すべてに一度に割り当てます。脇の仕事は全部まとめて安い軽量モデルに寄せたいときに便利です。
- **個別のタスク** — Vision、Web Extract、Compression などです。それぞれ現在割り当てられているモデルには `current` の印が付きます。

カードには、今どこかに割り当てられている場合に `main` や `aux · <task>` のバッジが付きます。これまで使ってきたモデルのうち、どれがどこに組み込まれているかがひと目で分かります。

## `config.yaml` に書き込まれる内容 {#what-gets-written-to-configyaml}

ダッシュボードから保存すると、Hermes は `~/.hermes/config.yaml` に次のように書き込みます。

**メインモデル:**
```yaml
model:
  provider: openrouter
  default: anthropic/claude-opus-4.7
  base_url: ''        # cleared on provider switch
  api_mode: chat_completions
```

**補助モデルの上書き（例 — ビジョンを gemini-flash にする）:**
```yaml
auxiliary:
  vision:
    provider: openrouter
    model: google/gemini-2.5-flash
    base_url: ''
    api_key: ''
    timeout: 120
    extra_body: {}
    download_timeout: 30
```

**補助モデルが auto のとき（既定）:**
```yaml
auxiliary:
  compression:
    provider: auto
    model: ''
    base_url: ''
    # ... other fields unchanged
```

`provider: auto` と `model: ''` の組み合わせは、そのタスクにメインモデルを使うという指定です。ただし、メインの経路が補助の呼び出しをさばけない場合は、フォールバックの方針も引き続き働きます。

タスクごとのフォールバック連鎖は、同じ補助タスクの下に任意で書けます。

```yaml
auxiliary:
  title_generation:
    provider: auto
    model: ''
    fallback_chain:
      - provider: openrouter
        model: inclusionai/ring-2.6-1t:free
```

`fallback_chain` がない場合、`auto` は内蔵の補助モデル探索の連鎖より先に、最上位の `fallback_providers` の連鎖を使います。

## プロバイダーごとのリクエスト設定 {#per-provider-request-options}

プロバイダーの項目（`providers:` 辞書の中の `providers.<name>`、または旧形式の `custom_providers` リストの各項目）では、Hermes がそのエンドポイントとどう話すかを決める設定を 2 つ指定できます。

**`extra_headers`** — そのプロバイダーのベース URL へ向かうすべての LLM リクエストに付ける、追加の HTTP ヘッダーの対応表です。URL やプロファイル由来の既定値、ユーザーによるヘッダー上書きよりも後に適用されるので、認証情報を差し替えてもクライアントを作り直しても残ります。Cloudflare Access のサービストークン、プロキシの認証、独自のベアラー方式などに使えます。

```yaml
providers:
  my-gateway:
    api: https://llm.internal.example.com/v1
    api_key: sk-...
    extra_headers:
      CF-Access-Client-Id: "xxxx.access"
      CF-Access-Client-Secret: "yyyy"
```

ヘッダーの値には認証情報が入るのが普通なので、Hermes は決してログへ出しません。`extra_headers` が効くのは OpenAI 互換の経路で、`anthropic_messages` と `bedrock_converse` の API モードでは使われません。

**`discover_models`** — `false` にすると（既定は `true`）、エンドポイントの `/models` 一覧への問い合わせを飛ばし、その項目に自分で書いた `models` だけを使います。モデル一覧が遅い、当てにならない、雑多すぎるゲートウェイで便利です。

```yaml
providers:
  my-gateway:
    api: https://llm.internal.example.com/v1
    discover_models: false
    models:
      - my-finetune-v2
      - my-finetune-v1
```

探索を切ると、モデル選択画面（`hermes model`、`/model`）は実際に問い合わせた結果ではなく、設定に書いた一覧を表示します。

Anthropic 互換のゲートウェイで、素のモデル別名をリクエストを受け取ってから
解決するタイプの場合は、モデルごとの `prompt_caching` 機能で
その別名をネイティブのプロンプトキャッシュ指定の対象にできます。

```yaml
providers:
  anthropic-proxy:
    api: https://gateway.example.com/anthropic
    transport: anthropic_messages
    models:
      fable:
        context_length: 1000000
        prompt_caching: true
```

Hermes はこの宣言を、プロバイダーの経路と実行時のモデル ID に正確に
突き合わせます。別名を書き換えることはありません。`prompt_caching: false` にすれば、
そのモデルでキャッシュ指定を明示的に切れます。書かなかった場合、Hermes は
いつもどおりプロバイダーとモデルの対応機能を自動判別します。

:::note 旧形式について
古い設定では、最上位に `custom_providers:` のリストを使っていました（`api` ではなく `base_url` を書く形です）。今も動きますし、`hermes update` の際に `providers:` 辞書へ自動で移行されます（設定バージョン v12）。
:::

## 設定はいつ反映されるか {#when-does-it-take-effect}

- **CLI**（`hermes chat`）: 次に `hermes chat` を実行したときです。
- **ゲートウェイ**（Telegram、Discord、Slack など）: 次に*新しく*始まるセッションからです。すでにあるセッションはモデルを変えません。すべてのセッションに反映させたいなら、ゲートウェイを再起動してください（`hermes gateway restart`）。
- **ダッシュボードのチャットタブ**（`/chat`）: 次に立ち上がる PTY からです。今開いているチャットはモデルを変えないので、その中で `/model` を使って入れ替えてください。

設定を変えても、動いているセッションのプロンプトキャッシュが無効になることはありません。これは意図的です。セッションの中でメインモデルを入れ替えるとキャッシュの作り直しが必要になる（システムプロンプトにモデル固有の内容が含まれるため）ので、その操作はチャット内で明示的に打つ `/model` スラッシュコマンドのために取ってあります。

## うまくいかないとき {#troubleshooting}

### 選択画面に「No authenticated providers」と出る {#no-authenticated-providers-in-the-picker}

Hermes は、使える認証情報があるプロバイダーだけを一覧に出します。サイドバーの **Keys** を確認してください。API キー、成功した OAuth、独自エンドポイントの URL のいずれかが登録されているはずです。使いたいプロバイダーが無ければ、`hermes setup` を実行して設定するか、**Keys** から環境変数を追加します。

### 実行中のチャットでメインモデルが変わらない {#main-model-didnt-change-in-my-running-chat}

そういう仕様です。ダッシュボードが書き換えるのは `config.yaml` で、それを読むのは新しいセッションです。今開いているチャットは動いているエージェントのプロセスなので、起動したときのモデルを使い続けます。そのセッションだけ入れ替えたいときは、チャットの中で `/model <name>` を使ってください。

### 補助モデルの上書きが「反映されない」 {#auxiliary-override-didnt-take-effect}

確認するところは 3 つです。

1. **新しいセッションを始めましたか。** すでにあるチャットは設定を読み直しません。
2. **`provider` が `auto` 以外になっていますか。** 欄が `auto` のままなら、そのタスクはまだメインモデルを使っています。**Change** を押して、実在のプロバイダーを選んでください。
3. **そのプロバイダーの認証は通っていますか。** MiniMax の API キーが無いのにタスクへ `minimax` を割り当てた場合、そのタスクは openrouter の既定へ落ち、`agent.log` に警告が残ります。

### モデルを選んだのに Hermes がプロバイダーを切り替えた {#i-picked-a-model-but-hermes-switched-providers-on-me}

OpenRouter のような集約サービスでは、素のモデル名はまずその集約サービスの*内側*で解決されます。そのため OpenRouter 上の `claude-sonnet-4` は `anthropic/claude-sonnet-4.6` になり、OpenRouter の認証のまま動きます。一方、Anthropic 直の認証で `claude-sonnet-4` と打ったなら `claude-sonnet-4-6` のままです。思っていないプロバイダーへ移っていたら、今のプロバイダーが意図どおりか確認してください。選択画面では、ダイアログの先頭に現在のメインが必ず表示されます。

## 別のやり方 {#alternative-methods}

### CLI のスラッシュコマンド {#cli-slash-command}

`hermes chat` のセッションの中で使います。

```
/model gpt-5.4 --provider openrouter             # session-only
/model gpt-5.4 --provider openrouter --global    # also persists to config.yaml
/model claude-opus-4.6 --once                    # next turn only, then auto-restores
```

`--global` はダッシュボードの **Change** ボタンと同じことをした上で、動いているセッションもその場で切り替えます。

`--once` は 1 ターンだけ切り替えて、その後は元のモデルへ戻します。成功しても、エラーになっても、中断しても同じです。保存は一切されないので、ターンの途中でゲートウェイを再起動すると元のモデルで戻ってきます。難しい質問を 1 回だけ高価なモデルに投げたい（「ここだけ Opus に聞く」）ときや、使い捨ての質問を安いモデルへ落としたいときに便利です。

:::note プロンプトキャッシュの費用
1 ターンだけの切り替えは、プロバイダー側のプロンプトキャッシュの前置き部分を出入りの 2 回分壊します。キャッシュの効くプロバイダー（Anthropic、OpenAI）で長いセッションを続けている場合、次のターンで入力費用を丸ごと払い直すことになります。`--once` が得なのは短いセッションか、安いモデルから高価なモデルへ引き上げるときで、長く高価なセッションの途中にちょっとした質問を挟むと、節約分より高くつくことがあります。
:::

### 独自のエイリアス {#custom-aliases}

よく使うモデルに自分用の短い名前を付けておくと、CLI でもメッセージアプリでも `/model <alias>` で呼べます。書き方は 2 通りあり、どちらでも同じように動くので、自分の使い方に合うほうを選んでください。

**正式な書き方（最上位の `model_aliases:`）** — プロバイダーと base_url まで細かく指定できます。

```yaml
# ~/.hermes/config.yaml
model_aliases:
  fav:
    model: claude-sonnet-4.6
    provider: anthropic
  grok:
    model: grok-4
    provider: x-ai
```

**短い文字列の書き方（`model.aliases.<name>: provider/model`）** — `hermes config set` はスカラー値を書き込めますし、今はインラインのリストや辞書の記法も解釈できるので、シェルから扱うのに便利です。ただし、この短い書き方では独自の `base_url` を持たせられません。

```bash
hermes config set model.aliases.fav anthropic/claude-opus-4.6
hermes config set model.aliases.grok x-ai/grok-4
```

> `hermes config set` は、インラインの**リストや辞書**（JSON / YAML のフロー記法）も受け付けます。シェルがそのまま渡すよう、引用符で囲んでください。
>
> ```bash
> hermes config set platform_toolsets.line '["clarify", "file", "web"]'
> hermes config set display.tool_progress_overrides '{"terminal": "off"}'
> ```

どちらの書き方も、読み込むのは同じ処理（`hermes_cli/model_switch.py`）です。同じ名前があった場合は、`model_aliases:` に書いたほうが `model.aliases:` より優先されます。

あとはチャットで `/model fav` や `/model grok` と打つだけです。ユーザーが定義したエイリアスは、組み込みの短い名前（`sonnet`、`kimi`、`opus` など）より優先されます。詳しくは [独自のモデルエイリアス](https://hermes-agent.nousresearch.com/reference/slash-commands#custom-model-aliases) の一覧をご覧ください。

### `hermes model` サブコマンド {#hermes-model-subcommand}

```bash
hermes model            # Interactive provider + model picker (the canonical way to switch defaults)
```

`hermes model` は、プロバイダーを選び、認証し（OAuth ならブラウザが開き、API キー方式ならキーの入力を求められます）、そのプロバイダーの厳選カタログから具体的なモデルを選ぶところまで案内します。選んだ内容は `~/.hermes/config.yaml` の `model.provider` と `model.default` に書き込まれます。

選択画面を開かずにプロバイダーやモデルを一覧したいときは、ダッシュボードか、下に挙げる REST エンドポイントを使ってください。今この瞬間に CLI が実際に使う設定を確かめるには、`hermes config get model --json` と `hermes status` が使えます。

### 設定ファイルを直接編集する {#direct-config-edit}

`~/.hermes/config.yaml` を編集して、それを読むものを再起動します。項目の全体像は [設定の早見表](/hermes/docs/user-guide/configuration/) をご覧ください。

### REST API {#rest-api}

ダッシュボードは 3 つのエンドポイントを使っています。スクリプトから操作したいときに便利です。

```bash
# List authenticated providers + curated model lists
curl -H "X-Hermes-Session-Token: $TOKEN" http://localhost:PORT/api/model/options

# Read current main + auxiliary assignments
curl -H "X-Hermes-Session-Token: $TOKEN" http://localhost:PORT/api/model/auxiliary

# Set the main model
curl -X POST -H "Content-Type: application/json" -H "X-Hermes-Session-Token: $TOKEN" \
  -d '{"scope":"main","provider":"openrouter","model":"anthropic/claude-opus-4.7"}' \
  http://localhost:PORT/api/model/set

# Override a single auxiliary task
curl -X POST -H "Content-Type: application/json" -H "X-Hermes-Session-Token: $TOKEN" \
  -d '{"scope":"auxiliary","task":"vision","provider":"openrouter","model":"google/gemini-2.5-flash"}' \
  http://localhost:PORT/api/model/set

# Assign one model to every auxiliary task
curl -X POST -H "Content-Type: application/json" -H "X-Hermes-Session-Token: $TOKEN" \
  -d '{"scope":"auxiliary","task":"","provider":"openrouter","model":"google/gemini-2.5-flash"}' \
  http://localhost:PORT/api/model/set

# Reset all auxiliary tasks to auto
curl -X POST -H "Content-Type: application/json" -H "X-Hermes-Session-Token: $TOKEN" \
  -d '{"scope":"auxiliary","task":"__reset__","provider":"","model":""}' \
  http://localhost:PORT/api/model/set
```

セッショントークンは起動時にダッシュボードの HTML へ埋め込まれ、サーバーを再起動するたびに変わります。動いているダッシュボードに対してスクリプトを書くなら、ブラウザの開発者ツールから取得してください（`window.__HERMES_SESSION_TOKEN__`）。
