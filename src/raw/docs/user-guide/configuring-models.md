---
title: "モデルの設定"
description: ""
upstream_path: user-guide/configuring-models.md
upstream_blob: 0456c391e4ab837d3c795fb2057b00ee6998cafe
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/configuring-models
---

# モデルの設定 {#configuring-models}

Hermes には、モデルを割り当てる枠が 2 種類あります。

- **メインモデル** — エージェントが考えるのに使うモデルです。利用者のメッセージ、ツール呼び出しの繰り返し、逐次表示される応答は、すべてこのモデルを通ります。
- **補助モデル** — エージェントが脇に逃がす、小さめの仕事です。コンテキストの圧縮、画像の解析、Web ページの要約、承認の判定、MCP のツール振り分け、セッション名の生成、スキルの検索が該当します。それぞれに専用の枠があり、個別に上書きできます。

このページでは、その両方をダッシュボードから設定する方法を説明します。設定ファイルや CLI のほうがよければ、末尾の[別のやり方](#alternative-methods)へ飛んでください。クラウドの提供元ではなく自分の端末でモデルを動かしたい場合は、[ローカルモデル](/hermes/docs/user-guide/local-models/)をご覧ください。

:::tip いちばん手早い道: Nous Portal
[Nous Portal](/hermes/docs/user-guide/features/tool-gateway/) では、1 つの契約で 300 を超えるモデルが使えます。まっさらな環境なら `hermes setup --portal` を実行すれば、ログインと Nous のプロバイダ設定が 1 つのコマンドで済みます。何がつながったかは `hermes portal info` で確認できます。

- Portal の契約者は、**トークン課金のプロバイダが 10% 引き** になります。
:::

:::note `model:` の書式 — 空文字列とマッピング
入れたばかりの環境では、同梱の既定の設定が `model: ""` になっています（「まだ設定していない」という意味の空文字列の目印です）。`hermes setup` か `hermes model` を初めて実行すると、このキーはその場で `provider`・`default`・`base_url`・`api_mode` を子に持つマッピングへ書き換えられます。これがこのページや [`profiles.md`](/hermes/docs/user-guide/profiles/) / [`configuration.md`](/hermes/docs/user-guide/configuration/) で示している形です。`config.yaml` に空文字列が残っているのを見かけたら、`hermes model` を実行する（あるいはダッシュボードの **Change** を押す）と、Hermes が辞書の形に書き直してくれます。
:::

## Models のページ {#the-models-page}

ダッシュボードを開き、サイドバーの **Models** をクリックします。画面は 2 つに分かれています。

1. **Model Settings** — 上のパネルで、ここで各枠にモデルを割り当てます。
2. **Usage analytics** — 選んだ期間にセッションを動かしたモデルを順位付きのカードで並べ、トークン数・費用・対応機能のバッジを表示します。

![Models page overview](https://hermes-agent.nousresearch.com/img/docs/dashboard-models/overview.png)

いちばん上のカードが **Model Settings** のパネルです。メインの行には、新しいセッションでエージェントが立ち上げるモデルが常に表示されます。**Change** をクリックすると選択画面が開きます。

## メインモデルを決める {#setting-the-main-model}

Main model の行で **Change** をクリックします。

![Model picker dialog](https://hermes-agent.nousresearch.com/img/docs/dashboard-models/picker-dialog.png)

選択画面は 2 列になっています。

- **左** — 認証が通っているプロバイダです。設定済みのプロバイダ（API キーを入れた、OAuth を済ませた、独自のエンドポイントとして定義した）だけが並びます。使いたいプロバイダが見当たらない場合は、**Keys** に行って認証情報を追加してください。
- **右** — 選んだプロバイダ向けに厳選したモデルの一覧です。ここに並ぶのは Hermes がそのプロバイダで推奨するエージェント向けのモデルで、`/models` の生の一覧ではありません（OpenRouter だと 400 以上のモデルが並び、音声合成・画像生成・並べ替え用のものまで混ざります）。

絞り込みの入力欄に文字を入れると、プロバイダ名・スラッグ・モデル ID で絞れます。

モデルを選んで **Switch** を押すと、Hermes が `~/.hermes/config.yaml` の `model` の節に書き込みます。**これが効くのは新しいセッションだけ** で、すでに開いているチャットのタブは、始めたときのモデルのまま動き続けます。いま開いているチャットをその場で切り替えたい場合は、その中で `/model` スラッシュコマンドを使ってください。

### セッションの途中での切り替えと、コンテキストの警告 {#mid-session-switches-and-context-warnings}

**動いているセッションの中で** モデルを切り替えると（Herm の TUI のモデル選択、`hermes` CLI、Telegram / Discord の `/model`）、Hermes は **次のメッセージ** が新しいモデルのウィンドウに対して **事前のコンテキスト圧縮** を走らせることになるかを見積もります。そのセッションがすでにモデルの圧縮しきい値に近い、または超えている場合（[コンテキストの圧縮](/hermes/docs/user-guide/configuration/#context-compression)を参照）、切り替えの応答に警告が付きます。高価なモデルの通知に使われるのと同じ `warning_message` の経路です。切り替え自体はすぐ反映され、圧縮は **切り替えたあとの最初の利用者メッセージ** で、モデルが答える前に走ります。

:::warning 途中で切り替えるとプロンプトキャッシュが失われます
プロンプトのキャッシュはリクエストを処理するモデルに紐づいています。そのため会話の途中でモデルが変わると — 明示的な `/model` での切り替えでも、[自動の切り替え](/hermes/docs/user-guide/features/fallback-providers/)でも、[認証情報プール](/hermes/docs/user-guide/features/credential-pools/)による別アカウントへの持ち回りでも — 次のメッセージは会話全体を、キャッシュ時の割引価格（およそ 75〜90% 引き）ではなく、入力トークンの正規料金で読み直すことになります。長いセッションでは、この一度きりの読み直しが、2 つのモデルのトークン単価の差をはるかに上回ることがあります。必要なときは切り替えて構いませんが、会話の早いうちか、新しいセッションを始めた直後にするのがおすすめです。
:::

### 無人運転とデータ学習の料金帯 {#unattended-data-training-tiers}

末尾に `-contributor` が付いたモデル（たとえば `muse-spark-1.2-contributor`、`muse-spark-1.3-contributor`）が安いのは、提供元があなたのプロンプトと応答を学習に使う可能性があるからです。対話的にモデルを選ぶときは、必ず確認の問いかけが出ます。Kanban のワーカーや cron のエージェントのように、対話しない起動経路では、その問いかけができないため、安全側に倒して起動を止めます。

無人で動かす仕事のデータが学習に使われても構わないなら、了解した旨を残しておきます。

```bash
hermes config set security.allow_data_training_tiers_noninteractive true
```

それでも Hermes は、無人で起動するたびにデータ方針の警告全文と、了解を示すキーの名前を出力します。ワーカーのログに記録が残るようにするためです。この設定は、高価なモデルの警告やプロバイダの経路に関する警告を承認するものではありませんし、対話時の確認の代わりにもなりません。取り消すには `hermes config unset security.allow_data_training_tiers_noninteractive` を実行します。

## 補助モデルを決める {#setting-auxiliary-models}

**Show auxiliary** をクリックすると、11 個の仕事の枠が現れます。

![Auxiliary panel expanded](https://hermes-agent.nousresearch.com/img/docs/dashboard-models/auxiliary-expanded.png)

補助の仕事はどれも既定が `auto` で、Hermes はその仕事にもメインモデルを使おうとします。その経路が使えない場合や、容量に類する失敗が起きた場合、`auto` はまず仕事ごとの `auxiliary.<task>.fallback_chain` をたどり、次にメインの `fallback_providers` / `fallback_model` の連鎖、最後に Hermes 組み込みの補助モデル探索の連鎖をたどります。脇の仕事に安いモデルや速いモデルを使いたいときは、その仕事だけ上書きしてください。

### よくある上書きの型 {#common-override-patterns}

| 仕事 | 上書きしたくなる場面 |
|---|---|
| **Title Gen** | セッション名を付ける速さや費用のほうが、メインモデルとそろえることより大事なとき。実績のある軽量モデルを固定するか、`auxiliary.title_generation.prefer_fast_model: true` にして、プロバイダの高速な料金帯を Hermes に選ばせます。 |
| **Vision** | メインモデルが画像に対応していないとき。`google/gemini-2.5-flash` や `gpt-4o-mini` を指定します。 |
| **Compression** | コンテキストをまとめるだけのために Opus や M2.7 で推論トークンを燃やしているとき。速いチャットモデルなら 50 分の 1 の費用で同じ仕事をこなします。 |
| **Approval** | `approval_mode: smart` のとき。速くて安いモデル（haiku、flash、gpt-5-mini）が、危険の少ないコマンドを自動承認してよいか判断します。ここに高価なモデルを置くのは無駄です。 |
| **Web Extract** | `web_extract` をよく使うとき。圧縮と同じ理屈で、要約に推論は要りません。 |
| **Skills Hub** | `hermes skills search` が使います。たいてい `auto` のままで十分です。 |
| **MCP** | MCP のツールの振り分けです。たいてい `auto` のままで十分です。 |
| **Triage Specifier** | Kanban の仕分け役（`hermes kanban specify`）を担当します。ざっくり 1 行で書かれた話を、具体的な仕様に膨らませます。安くて有能なモデルが向いています。 |
| **Kanban Decomposer** | Kanban のタスク分解を担当します。仕分けされたタスクを、専門プロファイル向けの子タスクの網に分けます。 |
| **Profile Describer** | プロファイルの説明文の生成（`hermes profile describe --auto` やダッシュボードの自動生成ボタン）を担当します。短く安く済む呼び出しです。 |
| **Curator** | スキルの使われ方を見直す curator の処理を担当します。推論モデルだと数分かかることがあるので、安めの補助モデルにする価値がしばしばあります。 |

### 仕事ごとの上書き {#per-task-override}

補助の行で **Change** をクリックします。同じ選択画面が開き、動きも同じです。プロバイダとモデルを選んで Switch を押します。行の表示が `auto (use main model)` から `provider · model` に変わります。

### すべて auto に戻す {#reset-all-to-auto}

いじりすぎてやり直したくなったら、補助の欄の上にある **Reset all to auto** をクリックします。すべての枠がメインモデルを使う状態に戻ります。

## 「Use as」のショートカット {#the-use-as-shortcut}

このページのモデルカードには、どれにも **Use as** のドロップダウンが付いています。これがいちばん速い道で、利用状況の欄で見かけたモデルを選び、**Use as** をクリックすれば、メインの枠か特定の補助の仕事にワンクリックで割り当てられます。

![Use as dropdown](https://hermes-agent.nousresearch.com/img/docs/dashboard-models/use-as-dropdown.png)

ドロップダウンの中身は次のとおりです。

- **Main model** — メインの行で Change をクリックするのと同じです。
- **All auxiliary tasks** — このモデルを 11 個の補助の枠すべてに一度で割り当てます。脇の仕事を全部まとめて安い軽量モデルに寄せたいときに便利です。
- **仕事ごとの項目** — Vision、Web Extract、Compression などです。それぞれの仕事にいま割り当てられているモデルには `current` の印が付きます。

いま何かに割り当てられているカードには `main` または `aux · <task>` のバッジが付くので、過去に使ったモデルのどれがどこで使われているか、ひと目で分かります。

## `config.yaml` に何が書かれるか {#what-gets-written-to-configyaml}

ダッシュボードから保存すると、Hermes は `~/.hermes/config.yaml` に次のように書き込みます。

**メインモデル:**
```yaml
model:
  provider: openrouter
  default: anthropic/claude-opus-4.7
  base_url: ''        # cleared on provider switch
  api_mode: chat_completions
```

**補助の上書き（例 — 画像解析を gemini-flash にする）:**
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

**補助が auto のとき（既定）:**
```yaml
auxiliary:
  compression:
    provider: auto
    model: ''
    base_url: ''
    # ... other fields unchanged
```

`provider: auto` と `model: ''` の組み合わせは、その仕事にメインモデルを使うよう Hermes に伝えます。それでいて、メインの経路が補助の呼び出しをさばけない場合は、切り替えの方針にきちんと従います。

仕事ごとの切り替え連鎖は任意で、同じ補助の仕事の下に書きます。

```yaml
auxiliary:
  title_generation:
    provider: auto
    model: ''
    fallback_chain:
      - provider: openrouter
        model: inclusionai/ring-2.6-1t:free
```

`fallback_chain` がない場合、`auto` は組み込みの補助モデル探索の連鎖より先に、最上位の `fallback_providers` の連鎖を使います。

## プロバイダごとのリクエストの調整 {#per-provider-request-options}

プロバイダの項目（`providers:` の辞書の中の `providers.<name>`、あるいは以前の形式である `custom_providers` の一覧の要素）には、Hermes とエンドポイントのやり取りを調整する設定を書けます。

**`extra_headers`** — そのプロバイダのベース URL へ向かうすべての LLM リクエストに付ける、追加の HTTP ヘッダーのマッピングです。URL やプロファイルの既定値、利用者によるヘッダーの上書きよりもあとに適用されるので、認証情報の入れ替えやクライアントの作り直しをまたいでも残ります。Cloudflare Access のサービストークン、プロキシの認証、独自のベアラー方式などに使えます。

```yaml
providers:
  my-gateway:
    api: https://llm.internal.example.com/v1
    api_key: sk-...
    extra_headers:
      CF-Access-Client-Id: "xxxx.access"
      CF-Access-Client-Secret: "yyyy"
```

ヘッダーの値は認証情報を含むのが普通なので、Hermes は決してログに残しません。`extra_headers` が効くのは OpenAI 互換の経路です。`anthropic_messages` と `bedrock_converse` の API モードでは使われません。

**`discover_models`** — `false` にすると（既定は `true`）、エンドポイントの `/models` 一覧への問い合わせを省き、その項目に書いた `models` だけを使います。モデル一覧の応答が遅い、当てにならない、余計なものが多いゲートウェイで便利です。

```yaml
providers:
  my-gateway:
    api: https://llm.internal.example.com/v1
    discover_models: false
    models:
      - my-finetune-v2
      - my-finetune-v1
```

探索を切ると、モデルの選択画面（`hermes model`、`/model`）は、その場で問い合わせる代わりに、設定に書いた一覧を表示します。

**`openai_native_compaction`** — この機能は、会話の内容を預けても構わないと信頼できる OpenAI 互換のエンドポイントに対してだけ `true` にしてください。ネイティブの圧縮は、そのプロバイダに設定された `base_url` へ内容を送ります。

```yaml
providers:
  trusted-proxy:
    api: https://llm.internal.example.com/v1
    capabilities:
      openai_native_compaction: true
```

リクエストを受け取ってから初めて素のモデル名を解決するゲートウェイでは、
モデルごとの `prompt_caching` の設定で、その名前にプロンプトキャッシュの
目印を付けるよう指定します。

```yaml
providers:
  model-proxy:
    api: https://gateway.example.com/v1
    transport: openai_chat  # or anthropic_messages
    models:
      fable:
        context_length: 1000000
        prompt_caching: true
```

Hermes はこの宣言を、プロバイダの経路と実行時のモデル ID に厳密に突き合わせます。
名前を書き換えたり、プロバイダ名・ホスト名・モデルの系統から対応可否を推測したり
することはありません。目印の書き方は、設定した transport に従います。
`openai_chat` は OpenAI 互換の外側に置く形、`anthropic_messages` はネイティブの
ブロック内に置く形です。あるモデルでキャッシュの目印を明示的に切りたい場合は
`prompt_caching: false` を指定します。省いた場合、Hermes は通常どおり
プロバイダとモデルの対応状況を自分で判定します。

:::note 以前の形式
古い設定では、最上位に `custom_providers:` の一覧を使っていました（`api` ではなく `base_url` を書く形です）。いまも動きますし、`hermes update` の際に `providers:` の辞書へ自動で移行されます（設定の v12）。
:::

## いつ反映されるか {#when-does-it-take-effect}

- **CLI**（`hermes chat`）: 次に `hermes chat` を実行したときです。
- **ゲートウェイ**（Telegram、Discord、Slack など）: 次の *新しい* セッションからです。既存のセッションはモデルを保ちます。すべてのセッションに反映させたい場合は、ゲートウェイを再起動してください（`hermes gateway restart`）。
- **ダッシュボードのチャットタブ**（`/chat`）: 次に新しい PTY を開いたときです。いま開いているチャットはモデルを保つので、その中で `/model` を使ってその場で切り替えてください。

設定の変更が、動いているセッションのプロンプトキャッシュを無効にすることはありません。これは意図した動作です。セッションの中でメインモデルを入れ替えるとキャッシュの作り直しが必要になるため（システムプロンプトにモデル固有の内容が含まれます）、それはチャット内の `/model` スラッシュコマンドを明示的に使ったときだけに限っています。

## 困ったときは {#troubleshooting}

### 選択画面に「No authenticated providers」と出る {#no-authenticated-providers-in-the-picker}

Hermes は、使える認証情報があるプロバイダしか一覧に出しません。サイドバーの **Keys** を確認してください。API キー、成功した OAuth、独自エンドポイントの URL のいずれかが見えるはずです。使いたいプロバイダがなければ、`hermes setup` を実行してつなぐか、**Keys** で環境変数を追加してください。

### 動いているチャットでメインモデルが変わらない {#main-model-didnt-change-in-my-running-chat}

そういう動作です。ダッシュボードが書くのは `config.yaml` で、これを読むのは新しいセッションです。いま開いているチャットは生きているエージェントのプロセスなので、起動時のモデルのまま動き続けます。そのセッションだけを切り替えたい場合は、チャット内で `/model <name>` を使ってください。

### 補助の上書きが「効いていない」 {#auxiliary-override-didnt-take-effect}

確認する点が 3 つあります。

1. **新しいセッションを始めましたか?** 既存のチャットは設定を読み直しません。
2. **`provider` が `auto` 以外になっていますか?** 欄が `auto` のままなら、その仕事はまだメインモデルを使っています。**Change** をクリックして、実在のプロバイダを選んでください。
3. **そのプロバイダの認証は通っていますか?** ある仕事に `minimax` を割り当てても MiniMax の API キーがなければ、その仕事は openrouter の既定に戻り、`agent.log` に警告が記録されます。

### モデルを選んだのに、プロバイダまで変わってしまった {#i-picked-a-model-but-hermes-switched-providers-on-me}

OpenRouter（や、そうしたまとめ役のサービス）では、素のモデル名はまずそのサービスの *中で* 解決されます。そのため OpenRouter 上の `claude-sonnet-4` は `anthropic/claude-sonnet-4.6` になり、認証は OpenRouter のままです。一方、Anthropic の認証で `claude-sonnet-4` と打った場合は `claude-sonnet-4-6` のままです。思いがけずプロバイダが変わったように見えたら、いまのプロバイダが想定どおりか確かめてください。選択画面では、ダイアログの上部に現在のメインが必ず表示されます。

## 別のやり方 {#alternative-methods}

### CLI のスラッシュコマンド {#cli-slash-command}

`hermes chat` のセッションの中で使います。

```
/model gpt-5.4 --provider openrouter             # session-only
/model gpt-5.4 --provider openrouter --global    # also persists to config.yaml
/model claude-opus-4.6 --once                    # next turn only, then auto-restores
```

`--global` は、ダッシュボードの **Change** ボタンと同じことをしたうえで、動いているセッションもその場で切り替えます。

`--once` は 1 ターンだけ切り替え、そのあと元のモデルに戻します。成功しても、失敗しても、途中で中断しても同じです。何も保存されないので、ターンの途中でゲートウェイを再起動すると元のモデルで戻ってきます。難しい問いを 1 回だけ高価なモデルに投げたいとき（「ここだけ Opus に聞く」）や、使い捨ての質問を安いモデルに落としたいときに便利です。

:::note プロンプトキャッシュの費用
1 ターンだけの切り替えは、プロバイダのプロンプトキャッシュの前置き部分を 2 回壊します（切り替えるときと、戻すときです）。前置きをキャッシュするプロバイダ（Anthropic、OpenAI）で長いセッションを続けていると、次のターンで入力の料金を丸ごと払い直すことになります。`--once` が得なのは短いセッションや、安いモデルから高価なモデルへ上げる場合です。長く高価なセッションの中でちょっと脇道の質問をすると、節約分より高くつくことがあります。
:::

### 独自の別名 {#custom-aliases}

よく使うモデルに自分で短い名前を付けておき、動いているセッションのなかで `/model <alias>` と打つか、起動時に `hermes chat --model <alias>` と指定して呼び出せます。書き方は 2 通りあり、どちらでも同じことができるので、自分のやり方に合うほうを選んでください。

**正式な書き方（最上位の `model_aliases:`）** — プロバイダと base_url まで細かく指定できます。

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

独自のエンドポイントを指す別名には、そのエンドポイントの認証情報も持たせられます。
`api_key`（値をそのまま書くか、`"${VAR}"` の形で参照します）か `key_env`
（環境変数の名前）のどちらかを使います。両方を書いた場合は `api_key` が勝ちます。

```yaml
model_aliases:
  theta:
    model: theta-1
    provider: custom
    base_url: "https://theta.example.com/v1"
    key_env: THETA_API_KEY        # or: api_key: "${THETA_API_KEY}"
```

どちらも書かなかった場合、キーは別名の **ホスト名** から決まります。
`ollama.com` のエンドポイントなら `OLLAMA_API_KEY`、`api.deepseek.com` なら
`DEEPSEEK_API_KEY`、という具合です。切り替える前にたまたま有効だった
プロバイダから引き継ぐことは決してないので、別名に切り替えたせいで、ある
プロバイダの秘密が別のプロバイダのホストへ送られることはありません。

**短い文字列の書き方（`model.aliases.<name>: provider/model`）** — `hermes config set` はスカラー値を書き込むほか、いまでは 1 行で書いた一覧やマッピングも解釈できるため、シェルから扱いやすい形です。ただしこの短い書き方では、独自の `base_url` は持たせられません。

```bash
hermes config set model.aliases.fav anthropic/claude-opus-4.6
hermes config set model.aliases.grok x-ai/grok-4
```

> `hermes config set` は、1 行で書いた **一覧やマッピング**（JSON / YAML のフロー形式）も受け付けます。シェルがそのまま渡せるように引用符で囲んでください。
>
> ```bash
> hermes config set platform_toolsets.line '["clarify", "file", "web"]'
> hermes config set display.tool_progress_overrides '{"terminal": "off"}'
> ```

どちらの書き方も、同じ読み込み処理（`hermes_cli/model_switch.py`）に渡ります。同じ名前がある場合、`model_aliases:` に書いた項目が `model.aliases:` の項目より優先されます。

あとはチャットで `/model fav` や `/model grok` と打つだけです。利用者が付けた別名は、組み込みの短い名前（`sonnet`、`kimi`、`opus` など）を覆い隠します。詳しくは[独自のモデル別名](/hermes/docs/reference/slash-commands/#custom-model-aliases)の一覧を参照してください。

### `hermes model` のサブコマンド {#hermes-model-subcommand}

```bash
hermes model            # Interactive provider + model picker (the canonical way to switch defaults)
```

`hermes model` は、プロバイダを選び、認証を済ませ（OAuth ならブラウザが開き、API キーのプロバイダならキーの入力を求められます）、そのプロバイダの厳選された一覧から具体的なモデルを選ぶまでを案内します。選んだ内容は `~/.hermes/config.yaml` の `model.provider` と `model.default` に書かれます。

選択画面を出さずにプロバイダやモデルを一覧したい場合は、ダッシュボードか、後述の REST エンドポイントを使ってください。いま CLI が実際に使う設定を確かめるには `hermes config get model --json` と `hermes status` を実行します。

### 設定ファイルを直接編集する {#direct-config-edit}

`~/.hermes/config.yaml` を編集して、それを読むものを再起動します。設定の全体像は[設定の一覧](/hermes/docs/user-guide/configuration/)を参照してください。

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

セッショントークンは起動時にダッシュボードの HTML へ埋め込まれ、サーバーを再起動するたびに新しくなります。動いているダッシュボードに対してスクリプトを書く場合は、ブラウザの開発者ツールから取り出してください（`window.__HERMES_SESSION_TOKEN__`）。
