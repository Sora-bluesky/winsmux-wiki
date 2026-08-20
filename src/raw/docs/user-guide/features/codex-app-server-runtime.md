---
title: "Codex App-Server ランタイム（任意）"
description: ""
upstream_path: user-guide/features/codex-app-server-runtime.md
upstream_blob: 51821278d77b9610ff08acf05cef07d26bb2d924
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/codex-app-server-runtime
---

# Codex App-Server ランタイム {#codex-app-server-runtime}

Hermes は、`openai/*` と `openai-codex/*` のターンを、自前のツールループで回す代わりに [Codex CLI app-server](https://github.com/openai/codex) へ任せることもできます。これを有効にすると、端末のコマンド、ファイルの編集、サンドボックス、MCP のツール呼び出しが、すべて Codex のランタイムの中で動きます。Hermes はその外側を包む殻になります（セッションの DB、スラッシュコマンド、ゲートウェイ、記憶とスキルの見直し）。

これは**自分で選んだときだけ有効になる**仕組みです。フラグを切り替えないかぎり、Hermes のふるまいはこれまでどおりです。Hermes が勝手にこのランタイムへ振り分けることはありません。

:::tip
OpenAI Codex は使っていないという場合、`hermes setup --portal` を使えば Claude や Gemini などを使う Codex 以外のバックエンドをひと息で用意できます。[Nous Portal](/hermes/docs/integrations/nous-portal/) をご覧ください。
:::

## なぜ使うのか {#why}

- OpenAI のエージェントのターンを、**ChatGPT のサブスクリプション**で動かせます（API キーは要りません）。Codex CLI と同じ認証の流れを使います。
- **Codex 自身のツール群とサンドボックス**を使えます。端末の操作・読み・書き・検索は `shell`、構造化された編集は `apply_patch`、段取りは `update_plan` が担当し、いずれも seatbelt や landlock のサンドボックスの中で動きます。
- **Codex 純正のプラグイン**（Linear、GitHub、Gmail、Calendar、Canva など）を `codex plugin` で入れてあれば、それがそのまま移され、Hermes のセッションでも有効になります。
- **Hermes 側の充実したツールも一緒についてきます。** web_search、web_extract、ブラウザの自動操作、画像の読み取り、画像生成、スキル、TTS が MCP のコールバック経由で動きます。Codex は自分が持っていないツールについて Hermes を呼び返します。
- **記憶とスキルの促しもそのまま働きます。** Codex のイベントは Hermes のメッセージの形へ投影されるので、自己改善のループから見ると、いつもどおりの会話ログに見えます。

## モデルが実際に持っているツール {#what-tools-the-model-actually-has}

多くの人が最初に知りたいのはここだと思います。このランタイムが有効なとき、ターンを動かしているモデルは、独立した三つの経路からツールを受け取っています。

### 1. Codex 内蔵のツール群（つねに有効） {#1-codexs-built-in-toolset-always-on}

これらは `codex app-server` 自体に付いてくるもので、Hermes も MCP もプラグインも関わりません。ランタイムが起動した時点で、次の五つがすぐ使えます。

- **`shell`** — サンドボックスの中で任意のシェルコマンドを実行します。モデルはこれでファイルを読み（`cat`、`head`、`tail`）、書き（`echo > foo`、ヒアドキュメント）、探し（`find`、`rg`、`grep`）、ディレクトリを行き来し（`ls`、`cd`）、ビルドを走らせ、プロセスを扱い、そのほか bash でやることは何でもやります。
- **`apply_patch`** — Codex の patch 形式で、複数ファイルにまたがる構造化された差分を当てます。関数を足す、複数ファイルにまたがって整理するといった、それなりの規模のコード編集ではこれを使います。一度きりの書き込みなら、シェルのヒアドキュメントも引き続き使えます。
- **`update_plan`** — Codex の中にある todo と段取りの管理です。Hermes の `todo` ツールに当たるものですが、管理は完全に Codex のランタイム側で行われます。
- **`view_image`** — 手元の画像ファイルを会話に読み込み、モデルが見られるようにします。
- **`web_search`** — 設定してあれば、Codex 自身の web 検索が使えます。Hermes 側も Firecrawl を使った `web_search` を後述のコールバック経由で出しているので、モデルは好きなほうを選びます。

つまり、**端末でやること（読む・書く・探す・見つける・走らせる）は、Codex がそのまま自前でこなします**。どこに書き込めるかは、サンドボックスのプロファイル（ランタイムを有効にしたときの既定は `:workspace`）が決めます。

### 2. Codex 純正のプラグイン（`codex plugin` で入れたものが自動で移されます） {#2-native-codex-plugins-auto-migrated-from-your-codex-plugin-install}

ランタイムを有効にすると、Hermes は Codex の `plugin/list` RPC に問い合わせ、入っているプラグインごとに `[plugins."<name>@openai-curated"]` の項目を書き込みます。プラグイン自体は Codex が管理していて、認可も Codex の画面で一度だけ済ませます。

例として、OpenClaw のスレッドで「動画にする価値がある」と挙がっていたものを並べます。

- **Linear** — 課題を探す・更新する
- **GitHub** — コードを検索する、PR を見る、コメントする
- **Gmail** — メールを読む・送る
- **Google Calendar** — 予定を作る・探す
- **Outlook のカレンダーとメール** — Microsoft のコネクタ経由で同じことができます
- **Canva** — デザインの生成
- ……そのほか `codex plugin marketplace add openai-curated` と `codex plugin install ...` で入れたもの

移されないものは次のとおりです。
- まだ入れていないプラグイン。先に Codex 側で入れてください。
- ChatGPT のアプリマーケットプレイスの項目（`app/list`）。これはアカウントの認証によって、すでに Codex の中で有効になっています。

### 3. Hermes のツールコールバック（`~/.codex/config.toml` に登録される MCP サーバー） {#3-hermes-tool-callback-mcp-server-registered-in-codexconfigtoml}

Codex に無いツールを呼び返せるように、Hermes は自分自身を MCP サーバーとして登録します。コールバック経由で使えるのは次のものです。

- **`web_search`** / **`web_extract`** — Firecrawl を使います。構造のある内容を取るときは、素朴な取得よりきれいに出ることが多いです。
- **`browser_navigate` / `browser_click` / `browser_type` / `browser_press` / `browser_snapshot` / `browser_scroll` / `browser_back` / `browser_get_images` / `browser_console` / `browser_vision`** — Camofox か Browserbase を使った、ひととおりのブラウザ自動操作です。
- **`vision_analyze`** — 画像を調べるために別の画像認識モデルを呼びます（画像を会話に読み込む Codex の `view_image` とは別のものです）。
- **`image_generate`** — Hermes の image_gen のプラグイン連携による画像生成です。
- **`skill_view` / `skills_list`** — Hermes のスキルの蔵書から読み出します。
- **`text_to_speech`** — Hermes で設定してある提供元による読み上げです。

モデルがこれらを使いたくなると、Codex は stdio の MCP で `hermes_tools_mcp_server` のサブプロセスを立ち上げ、呼び出しは `model_tools.handle_function_call()` を通って処理され（Hermes の既定ランタイムとまったく同じ経路です）、結果はほかの MCP の応答と同じように Codex へ返ります。

### このランタイムでは使えないもの {#whats-not-available-on-this-runtime}

次の四つの Hermes のツールは、動いている AIAgent の文脈（ループの途中の状態）がないと呼び出せず、状態を持たない MCP のコールバックでは動かせません。これらが必要になったら、既定のランタイムへ戻してください（`/codex-runtime auto`）。

- **`delegate_task`** — サブエージェントを立ち上げる
- **`memory`** — Hermes の記憶の保管庫
- **`session_search`** — セッションをまたいだ検索
- **`todo`** — Hermes の todo 置き場（Codex の `update_plan` がランタイム内の同等品です）

## 仕事の流れに関わる機能（`/goal`、かんばん、cron） {#workflow-features-goal-kanban-cron}

### `/goal`（Ralph ループ） {#goal-the-ralph-loop}

**このランタイムでも動きます。** 目標はセッション id をキーに `state_meta` へ残り、続きを促すプロンプトはふつうのユーザーメッセージとして `run_conversation()` に戻され、次のターンは Codex がそのまま実行します。目標の判定役は補助のクライアント（config.yaml の `auxiliary.goal_judge` で設定します）で動くので、どちらのランタイムが有効かに左右されません。判定役が出す「止まっている、人の入力が要る」という結論は、Codex が承認待ちで足踏みしたときのきれいな抜け道になります。

**ひとつ気に留めておきたいこと。** 続きを促すプロンプトは毎回あたらしい Codex のターンなので、Codex はコマンドの承認方針をそのつど一から見直します。書き込みの多い長丁場の目標では、ひとつのセッション内の作業よりも承認を聞かれる回数が増えると思ってください。`default_permissions = ":workspace"` を設定しておけば（ランタイムを有効にしたとき Hermes が自動でそうします）、作業場所へのふつうの書き込みでいちいち聞かれずに済みます。

### かんばん（複数エージェントの worktree への割り振り） {#kanban-multi-agent-worktree-dispatch}

**このランタイムでも動きますが、ひとつ細かい前提があります。** かんばんの割り振り役は、作業役をそれぞれ別の `hermes chat -q` のサブプロセスとして立ち上げ、そのサブプロセスは利用者の設定を読みます。つまり `model.openai_runtime: codex_app_server` を全体に設定していると、作業役も Codex のランタイムで立ち上がります。

Codex ランタイムの作業役の中で動くものは次のとおりです。
- Codex のツール一式（shell、apply_patch、update_plan、view_image、web_search）。実際の作業はここで自前にこなします
- 移された Codex のプラグイン（Linear、GitHub など）
- browser_*、画像の読み取り、image_gen、スキル、TTS のための Hermes のツールコールバック

MCP のコールバックが出しているおかげで、次のものも動きます。
- **`kanban_complete` / `kanban_block` / `kanban_comment` / `kanban_heartbeat`** — 作業役が結果を引き渡すためのツールです。割り振り役が設定した環境変数 `HERMES_KANBAN_TASK` を読み、正しく門を通し、`HERMES_KANBAN_DB` で指定されたボードごとの SQLite の DB へ書きます。これらがコールバックに無いと、このランタイムの作業役は作業自体はできても報告を返せず、割り振り役の待ち時間が尽きるまで止まったままになります。
- **`kanban_show` / `kanban_list`** — 作業役が自分の状況を確かめるための、読むだけのボード照会です。
- **`kanban_create` / `kanban_unblock` / `kanban_link`** — まとめ役だけが使う操作です。Codex ランタイムで動くまとめ役が、あたらしい作業を割り振る必要があるときに使えます。

かんばんのツールは、割り振り役が設定する環境変数 `HERMES_KANBAN_TASK` で門を通します。この変数は Codex のサブプロセスへ伝わり（Codex は環境を引き継ぎます）、そこから立ち上がる `hermes-tools` の MCP サーバーのサブプロセスへも伝わります。おかげでツールは正しい作業の id を見て、正しく門を通します。Codex app-server の作業役の場合、Hermes は `HERMES_KANBAN_TASK` があるときに app-server のサンドボックスへ狭い上書きも渡します。`workspace-write` のサンドボックスは保ったまま、**ボードの DB があるディレクトリと、割り振り役が指定したかんばんの場所すべて**を書き込み可能な場所として足し（`HERMES_KANBAN_WORKSPACES_ROOT`、`HERMES_KANBAN_WORKSPACE`、以前からの `HERMES_KANBAN_ROOT` を重複なくまとめ、DB のディレクトリを先頭に置きます）、ネットワークは既定で切ったままにします。これで `:danger-no-sandbox` という壊れやすい回避策を使わずに済み、`kanban_complete` や `kanban_block` がボードの DB を更新でき、**さらに**作業役が DB のディレクトリの外にある作業場所（別のドライブにある `/media/.../kanban-workspaces/...` など）へ報告や成果物を書けます（[issue #27941](https://github.com/NousResearch/hermes-agent/issues/27941)）。

### cron のジョブ {#cron-jobs}

**とくに検証はしていません。** cron のジョブは `cronjob` から `AIAgent.run_conversation` へ渡って動き、CLI と同じ経路をたどります。その cron のジョブの設定に `openai_runtime: codex_app_server` があれば、Codex で動きます。ツールが使えるかどうかの決まりも同じで、Codex 内蔵のツールとプラグインと MCP のコールバックは動き、エージェントループのツール（delegate_task、memory、session_search、todo）は動きません。cron のジョブがそれらに頼っているなら、既定のランタイムを使うプロファイルへ cron を寄せてください。

## それぞれの得手不得手 {#trade-offs}

|  | Hermes の既定ランタイム | Codex app-server（任意で有効化） |
|---|---|---|
| `delegate_task` のサブエージェント | あり | 使えません（エージェントループの文脈が要る） |
| `memory`、`session_search`、`todo` | あり | 使えません（エージェントループの文脈が要る） |
| `web_search`、`web_extract` | あり | あり（MCP のコールバック経由） |
| ブラウザの自動操作（Camofox / Browserbase） | あり | あり（MCP のコールバック経由） |
| `vision_analyze`、`image_generate` | あり | あり（MCP のコールバック経由） |
| `skill_view`、`skills_list` | あり | あり（MCP のコールバック経由） |
| `text_to_speech` | あり | あり（MCP のコールバック経由） |
| Codex の `shell`（端末・読み・書き・検索・探索・実行） | — | あり（Codex 内蔵） |
| Codex の `apply_patch`（複数ファイルの構造化された編集） | — | あり（Codex 内蔵） |
| Codex の `update_plan`（ランタイム内の todo） | — | あり（Codex 内蔵） |
| Codex の `view_image`（画像を会話に読み込む） | — | あり（Codex 内蔵） |
| Codex のサンドボックス（seatbelt / landlock、プロファイル） | — | あり（Codex 内蔵） |
| ChatGPT のサブスクリプションでの認証 | — | あり（`openai-codex` の提供元経由） |
| Codex 純正のプラグイン（Linear、GitHub など） | — | あり（自動で移されます） |
| 利用者の MCP サーバー | あり | あり（Codex へ自動で移されます） |
| 記憶とスキルの見直し（裏側で動きます） | あり | あり（項目の投影経由） |
| 何ターンにもわたる会話 | あり | あり |
| `/goal`（Ralph ループ） | あり | あり |
| かんばんの作業役の割り振り | あり | あり（コールバック経由） |
| かんばんのまとめ役のツール | あり | あり（コールバック経由） |
| すべてのゲートウェイの窓口 | あり | あり |
| OpenAI 以外の提供元 | あり | 該当なし（OpenAI と Codex 向けの仕組みです） |

### 実況の表示 {#live-display}

エージェントのループが Codex のサブプロセスの中で動いていても、このランタイムは
Codex のイベントの流れを、既定のランタイムと同じ表示の経路へ
橋渡しします。

- アシスタントの発話の差分、推論（要約の差分も含みます）、id が安定した
  ツールの開始と完了のイベントが、ターンの進行に合わせて TUI、デスクトップ、
  メッセージ系のゲートウェイに出ます。完了だけを扱う履歴の投影は
  別に動いているので、セッションを再開しても、そのターン中に見えていたのと
  同じツールのカードが復元されます。
- トークンの逐次表示を切っていてもゲートウェイの補足は見えたままで、
  承認の要求より先に吐き出された通知についても、実況のツールのイベントは
  転送されます。補足の表示は `display.show_commentary` に従います。

## 前もって用意するもの {#prerequisites}

1. **Codex CLI を入れておく:**
   ```bash
   npm i -g @openai/codex
   codex --version   # 0.130.0 or newer
   ```
2. **Codex の OAuth ログイン。** Codex のサブプロセスは `~/.codex/auth.json` を読みます。ここを埋める方法は二つあります。
   ```bash
   codex login                  # writes tokens to ~/.codex/auth.json
   ```
   Hermes 側の `hermes auth add openai-codex` が書くのは `~/.hermes/auth.json` で、これは別のセッションです。まだなら **`codex login` を別途実行してください**。

3. **（任意）使いたい Codex のプラグインを入れておく。** ランタイムを有効にすると、Codex CLI ですでに入れてある選りすぐりのプラグインを Hermes が自動で移します。
   ```bash
   codex plugin marketplace add openai-curated
   # then via codex's TUI, install Linear / GitHub / Gmail / etc.
   ```
   Hermes がそれらを見つけ、`~/.codex/config.toml` へ `[plugins."<name>@openai-curated"]` の項目を自動で書き込みます。

## 有効にする {#enabling}

Hermes のセッションで次のようにします。

```
/codex-runtime codex_app_server
```

このコマンドは次のことをします。

- `codex` の CLI が入っているかを確かめます（入っていなければ、入れ方を示して止まります）。
- `model.openai_runtime: codex_app_server` を config.yaml へ書き残します。
- 利用者の MCP サーバーを `~/.hermes/config.yaml` から `~/.codex/config.toml` へ移します。
- Codex の `plugin/list` RPC に問い合わせて、**入っている Codex 純正のプラグイン（Linear、GitHub、Gmail、Calendar、Canva など）を見つけて移します**。
- Codex のサブプロセスが Codex に無いツールを呼び返せるように、**Hermes 自身のツールを MCP サーバーとして登録します**。
- **`default_permissions = ":workspace"` を書きます。** これで、作業場所の中への書き込みは操作のたびに聞かれることなく通ります。
- 何を移したかを教えてくれます。効き始めるのは**次の**セッションからです。いま動いているエージェントは、プロンプトのキャッシュを生かすために前のランタイムのままにしておきます。

同じ意味で使えるもの: `/codex-runtime on`、`/codex-runtime off`、`/codex-runtime auto`。

何も変えずに今の状態だけ見たいときは次のようにします。
```
/codex-runtime
```

`~/.hermes/config.yaml` で手で設定することもできます。
```yaml
model:
  openai_runtime: codex_app_server   # default is "auto" (= Hermes runtime)
```

## 自己改善のループ（記憶とスキルの促し） {#self-improvement-loop-memory-skill-nudges}

Hermes の裏側の自己改善は、回数のしきい値で動きます。

- 利用者のプロンプト 10 回ごとに、分かれて動く見直し役が会話を眺め、記憶へ残すべきものがあるかを判断します。
- ひとつのターンの中でツールの繰り返しが 10 回に達するごとに、同じことをスキルについて行います（`skill_manage` への書き込みです）。

**どちらも Codex のランタイムで動きます。** Codex の経路では、完了した `commandExecution` / `fileChange` / `mcpToolCall` / `dynamicToolCall` の各項目が、合成された `assistant tool_call` と `tool` の結果メッセージへ投影されます。おかげで見直しが走るころには、既定の Hermes のランタイムで見えるのと同じ形になっています。

つなぎ方がどう同じなのかは次のとおりです。

| | 既定のランタイム | Codex のランタイム |
|---|---|---|
| `_turns_since_memory` の増加 | 利用者のプロンプトごと、run_conversation のループ前 | 同じ経路で、早期の return の前 |
| `_iters_since_skill` の増加 | chat-completions のループでツールの繰り返しごと | Codex のターンが返ったあと `turn.tool_iterations` で |
| 記憶の引き金（`_turns_since_memory >= _memory_nudge_interval`） | ループ前に計算し、応答のあとに発火 | ループ前に計算し、Codex の補助へ渡す |
| スキルの引き金（`_iters_since_skill >= _skill_nudge_interval`） | ループのあとに計算 | Codex のターンのあとに計算 |
| `_spawn_background_review(messages_snapshot=..., review_memory=..., review_skills=...)` | どちらかの引き金が引かれたら呼ばれる | どちらかの引き金が引かれたら同じように呼ばれる |

ひとつ細かい点があります。見直しのために分かれた側は、Hermes のエージェントループのツール（`memory`、`skill_manage`）を呼ぶ必要があり、これには Hermes 自身の呼び出しの仕組みが要ります。そこで、親のエージェントが `codex_app_server` にいるとき、見直し側は **`codex_responses` へ落として動かします**。OAuth の資格情報も `openai-codex` の提供元も同じですが、OpenAI の Responses API と直接やり取りするので、ループは Hermes が持ち、エージェントループのツールが動きます。これは利用者からは見えません。

まとめると、Codex のランタイムを有効にしても、記憶とスキルの促しはこれまでどおり発火します。

## 承認のしくみ {#how-approvals-work}

Codex は、コマンドを実行する前や patch を当てる前に承認を求めます。これは Hermes のいつもの「Dangerous Command」の確認へ翻訳されます。

```
╭───────────────────────────────────────╮
│ Dangerous Command                     │
│                                       │
│ /bin/bash -lc 'echo hello > foo.txt'  │
│                                       │
│ ❯ 1. Allow once                       │
│   2. Allow for this session           │
│   3. Deny                             │
│                                       │
│ Codex requests exec in /your/cwd      │
╰───────────────────────────────────────╯
```

- **Allow once** → このコマンド一回だけを許します。
- **Allow for this session** → 似たコマンドについて Codex は聞き直しません。
- **Deny** → コマンドは断られ、Codex は読むだけのやり方で続けます。

`apply_patch`（ファイルの編集）の承認では、Codex が対応する `fileChange` の項目でデータを渡してくれた場合、何が変わるのかの要約（`1 add, 1 update: /tmp/new.py, /tmp/old.py`）を Hermes が見せます。

## 権限のプロファイル {#permission-profiles}

Codex には権限のプロファイルが三つ内蔵されています。
- `:read-only` — 書き込みなし。シェルのコマンドはすべて承認が要ります
- `:workspace` — いまの作業場所の中への書き込みは確認なしで通ります（ランタイムを有効にしたときの Hermes の既定です）
- `:danger-no-sandbox` — サンドボックスをまったく使いません（意味が分かっているとき以外は使わないでください）

既定値は、Hermes が管理する範囲の外側で `~/.codex/config.toml` に書けば上書きできます。

```toml
default_permissions = ":read-only"
```

（`# managed by hermes-agent` の目印の外に置いてあるかぎり、移し替えをやり直しても Hermes はその上書きを残します。）

## 補助の処理と、ChatGPT サブスクリプションのトークンの消費 {#auxiliary-tasks-and-chatgpt-subscription-token-cost}

このランタイムを `openai-codex` の提供元で有効にしていると、**補助の処理（題名の生成、文脈の圧縮、画像の自動判定、裏で動く自己改善の見直し）も既定ではあなたの ChatGPT のサブスクリプションを通ります**。Hermes の補助クライアントは、処理ごとの上書きが無いかぎり主たる提供元とモデルを使うからです。

これは `codex_app_server` に限った話ではなく、これまでの `codex_responses` の経路でも同じです。ただ、サブスクリプションでの支払いを自分で選んで有効にしているぶん、こちらのほうが目につきやすくなります。

特定の補助の処理を、安いモデルや別のモデルへ振り分けたいときは、`~/.hermes/config.yaml` にはっきり上書きを書きます。

```yaml
auxiliary:
  title_generation:
    provider: openrouter
    model: google/gemini-3-flash-preview
  compression:
    provider: openrouter
    model: google/gemini-3-flash-preview
  vision:
    provider: openrouter
    model: google/gemini-3-flash-preview
  goal_judge:
    provider: openrouter
    model: google/gemini-3-flash-preview
```

自己改善の見直し側は `_current_main_runtime()` を通じて主たるランタイムを引き継ぎ、Hermes が自動で `codex_app_server` から `codex_responses` へ落とします（見直し側が実際に `memory` や `skill_manage`、つまり Hermes 自身のエージェントループのツールを呼べるようにするためです）。補助の処理をよそへ振り分けていなければ、この見直し側もあなたのサブスクリプションの認証を使います。

## `~/.codex/config.toml` を安全に編集する {#editing-codexconfigtoml-safely}

Hermes は、自分が管理するものを二つの目印のコメントで挟みます。

```toml
# managed by hermes-agent — `hermes codex-runtime migrate` regenerates this section
default_permissions = ":workspace"
[mcp_servers.filesystem]
...
[plugins."github@openai-curated"]
...
# end hermes-agent managed section
```

この範囲の**外**にあるものは、あなたのものです。移し替えをやり直しても（`/codex-runtime codex_app_server` を実行したときや、ランタイムを切り替えたときに走ります）、管理されている範囲だけがその場で置き換わり、その上下にある利用者の記述はそのまま残ります。つまり、次のことができます。

- Hermes が知らない自前の MCP サーバーを足す
- 確認を挟むほうがよければ `default_permissions` を `:read-only` へ上書きする
- Codex だけの設定（モデル、提供元、otel など）を書く
- 自分で決めた権限のプロファイルを `[permissions.<name>]` の表として足す

管理されている範囲の**中**に足したものは、次の移し替えで上書きされて消えます。管理されている範囲を編集しないと実現できない調整が必要なら、issue を立ててください。つまみを用意します。

## 複数プロファイル・複数テナントでの使い方 {#multi-profile-multi-tenant-setups}

既定では、Hermes はどの Hermes のプロファイルが有効かに関わらず、Codex のサブプロセスを `~/.codex/` に向けます。つまり `hermes -p work` と `hermes -p personal` は、Codex の認証、プラグイン、設定を共有します。ほとんどの場合これが望ましいふるまいで、`codex` の CLI を直に動かしたときと同じになります。

プロファイルごとに Codex を切り離したい（認証も、入れてあるプラグインも、設定も別にしたい）ときは、プロファイルごとに `CODEX_HOME` をはっきり指定します。いちばんすっきりするのは、`HERMES_HOME` の下のディレクトリを指す形です。

```bash
# Inside the work profile, you might wrap hermes:
CODEX_HOME=~/.hermes/profiles/work/codex hermes chat
```

その `CODEX_HOME` を設定した状態で `codex login` を一度やり直し、OAuth のトークンがプロファイルごとの場所に置かれるようにする必要があります。そのあとは `hermes -p work` が切り離された Codex の状態を扱います。

これを自動でやらないのは、すでにある `~/.codex/` を動かすと、その人の Codex CLI の認証を黙って無効にしてしまうからです。すでに `codex login` を済ませていた人は、認証をやり直すはめになります。驚かせるくらいなら、自分で選んでもらうほうが安全だと考えました。

## 環境変数 HOME の受け渡し {#home-environment-variable-passthrough}

Hermes は、Codex の app-server のサブプロセスを立ち上げるときに `HOME` を書き換えません（`os.environ.copy()` を使い、`CODEX_HOME` と `RUST_LOG` だけを上書きします）。これが意味するのは次のことです。

- Codex が `shell` ツールで走らせるコマンドは本物の利用者の `HOME` を見るので、`~/.gitconfig`、`~/.gh/`、`~/.aws/`、`~/.npmrc` などをきちんと見つけられます。
- Codex 自身の状態は `CODEX_HOME`（既定では `~/.codex/` を指します）で切り離されたままです。

これは、OpenClaw が初期のいろいろな試行のすえに落ち着いた線引きと同じです。Codex の状態は切り離し、利用者のホームには手を付けない、というものです（openclaw/openclaw#81562 を参照）。

## MCP サーバーの移し替え {#mcp-server-migration}

Hermes の `mcp_servers` の設定は、Codex が期待する TOML の形へ自動で書き換えられます。この移し替えはランタイムを有効にするたびに走り、何度やっても結果は同じです。やり直すと、管理されている範囲は置き換わりますが、利用者が手で書いた Codex の設定はそのまま残ります。

書き換わるものは次のとおりです。

| Hermes（`config.yaml`） | Codex（`config.toml`） |
|---|---|
| `command` と `args` と `env` | stdio の通信方式 |
| `url` と `headers` | streamable_http の通信方式 |
| `timeout` | `tool_timeout_sec` |
| `connect_timeout` | `startup_timeout_sec` |
| `enabled: false` | `enabled = false` |

移されないものは次のとおりです。
- `sampling` のような Hermes 固有のキー（Codex の MCP クライアントに対応するものが無いため、サーバーごとに注意を出したうえで落とされます）。

## Codex 純正のプラグインの移し替え {#native-codex-plugin-migration}

`codex plugin` で入れたプラグイン（Linear、GitHub、Gmail、Calendar、Canva など）は、Codex の `plugin/list` RPC を通じて見つかります。`installed: true` になっているプラグインごとに、Hermes は `[plugins."<name>@openai-curated"]` の塊を書き、あなたの Hermes のセッションでそれを有効にします。

つまり、友人が「Codex CLI には Calendar と GitHub を入れてある」と言っていて、その人が Hermes の Codex ランタイムを有効にすれば、Hermes がそれらを自動で有効にします。設定をやり直す必要はありません。

移されないものは次のとおりです。
- まだ入れていないプラグイン。先に Codex 側で入れてください。
- Codex が `availability != AVAILABLE` と報告するプラグイン（入れ方が壊れている、OAuth の期限切れ、マーケットプレイスから消えた、など）。有効にする段階で失敗するような設定を書かないよう、これらは飛ばされます。
- ChatGPT のアプリマーケットプレイスの項目（アカウントごとの `app/list` の結果です。これはアカウントの認証によって、すでに Codex の中で有効になっています）。
- プラグインの OAuth。プラグインごとの認可は Codex の中で一度だけ行い、Hermes は資格情報に触れません。

## Hermes のツールコールバック（あたらしい MCP サーバー） {#hermes-tool-callback-the-new-mcp-server}

Codex 内蔵のツールはシェル、ファイル操作、patch を担いますが、web 検索、ブラウザの自動操作、画像の読み取り、画像生成などは持っていません。Codex のターンでもそれらを使えるように、Hermes は自分自身を MCP サーバーとして `~/.codex/config.toml` に登録します。

```toml
[mcp_servers.hermes-tools]
command = "/path/to/python"
args = ["-m", "agent.transports.hermes_tools_mcp_server"]
env = { HERMES_HOME = "/your/.hermes", PYTHONPATH = "...", HERMES_QUIET = "1" }
startup_timeout_sec = 30.0
tool_timeout_sec = 600.0
```

モデルが `web_search`（またはほかの公開された Hermes のツール）を呼ぶと、Codex は stdio 経由で `hermes_tools_mcp_server` のサブプロセスを立ち上げ、要求は `model_tools.handle_function_call()` を通って処理され、結果はほかの MCP の応答と同じように Codex へ投影されます。

**コールバック経由で使えるツール:** `web_search`、`web_extract`、`browser_navigate`、`browser_click`、`browser_type`、`browser_press`、`browser_snapshot`、`browser_scroll`、`browser_back`、`browser_get_images`、`browser_console`、`browser_vision`、`vision_analyze`、`image_generate`、`skill_view`、`skills_list`、`text_to_speech`。

**使えないツール:** `delegate_task`、`memory`、`session_search`、`todo`。これらは動いている AIAgent の文脈（ループの途中の状態）がないと呼び出せず、状態を持たない MCP のコールバックでは動かせません。これらが必要なときは、既定の Hermes のランタイム（`/codex-runtime auto`）を使ってください。

## 無効にする {#disabling}

いつでも戻せます。

```
/codex-runtime auto
```

効き始めるのは次のセッションからです。Codex の管理されている範囲は `~/.codex/config.toml` に残るので、設定を失わずにあとで有効にし直せます。いらなければ手で消してもかまいません。

## できないこと {#limitations}

このランタイムは、**自分で選んで使うベータ版**です。Hermes Agent 2026.5 と Codex CLI 0.130.0 の組み合わせで、次のことは動いています。

- 何ターンにもわたる会話
- Hermes の画面での `commandExecution` と `fileChange`（apply_patch）の承認
- MCP のツール呼び出し（`@modelcontextprotocol/server-filesystem` と、あたらしい `hermes-tools` のコールバックで確認済み）
- Codex 純正のプラグインの移し替え（Linear / GitHub / Calendar の一覧で確認済み）
- 断る・取り消す経路
- 有効・無効の切り替えの一巡
- 記憶とスキルの促しの回数（結合テストで実際に確認済み）
- Codex を通した Hermes の web_search（実際に確認済み。「OpenAI Codex CLI – Getting Started」が最後まで返りました）

分かっている限界は次のとおりです。

- **Hermes の認証と Codex の認証は別のセッションです。** いちばん気持ちよく使うには `codex login` と `hermes auth add openai-codex` の両方が要ります（ランタイムは LLM の呼び出しに Codex 側のセッションを使います）。これは Hermes の `_import_codex_cli_tokens` での意図的な設計です。トークンの更新でお互いを壊さないよう、Hermes は OAuth の状態を Codex CLI と共有しません。
- **`delegate_task`、`memory`、`session_search`、`todo` はこのランタイムでは使えません。** 動いている AIAgent の文脈が要り、状態を持たない MCP のコールバックではそれを用意できません。これらが必要なときは `/codex-runtime auto` を使ってください。
- **Codex が変更の一式を持っていないとき、承認の確認に patch の中身が出ません。** Codex の `fileChange` の承認のパラメータには、変更の一式がいつも付いてくるとはかぎりません。Hermes は対応する `item/started` の通知からデータを拾って覚えておこうとしますが、項目が流れてくる前に承認が来た場合は、Codex が渡す `reason` の内容で代用します。
- **一秒未満での取り消しは保証されません。** 流れの途中での割り込み（Codex が応答している最中の Ctrl+C）は `turn/interrupt` で送られますが、Codex が最後のメッセージをすでに吐き出していた場合は、そのまま応答が返ってきます。

不具合を見つけたら、`hermes logs --since 5m` の出力を添えて [issue を立ててください](https://github.com/NousResearch/hermes-agent/issues)。仕分けしやすいよう、題名に `codex-runtime` と入れてもらえると助かります。

## 全体の作り {#architecture}

```
                ┌─── Hermes shell (CLI / TUI / gateway) ───┐
                │  sessions DB · slash commands · memory   │
                │  & skill review · cron · session pickers │
                └──┬──────────────────────────────────────┬┘
                   │ user_message               final     │
                   ▼                            text +    │
        ┌──────────────────────────────────┐   projected  │
        │  AIAgent.run_conversation()       │   messages   │
        │   if api_mode == codex_app_server │              │
        │     → CodexAppServerSession       │              │
        │   else: chat_completions / codex_responses (default)
        └────┬─────────────────────────────┘              │
             │ JSON-RPC over stdio                        │
             ▼                                            │
        ┌──────────────────────────────────┐              │
        │  codex app-server (subprocess)    │──────────────┘
        │   thread/start, turn/start        │
        │   item/* notifications            │
        │   shell + apply_patch + update_plan│
        │   view_image + sandbox            │
        │   ┌─────────────────────────┐     │
        │   │  MCP client             │     │
        │   │  ├─ user MCP servers    │     │
        │   │  ├─ native plugins      │     │
        │   │  │   (linear, github,   │     │
        │   │  │    gmail, calendar,  │     │
        │   │  │    canva, ...)       │     │
        │   │  └─ hermes-tools ───────┼─────────────────┐
        │   │       (callback to     │     │           │
        │   │        Hermes' richer  │     │           │
        │   │        tools)          │     │           │
        │   └─────────────────────────┘     │           │
        └──────────────────────────────────┘           │
                                                        │
                                                        ▼
        ┌──────────────────────────────────────────────────────────┐
        │  hermes_tools_mcp_server.py (subprocess on demand)        │
        │   web_search, web_extract, browser_*, vision_analyze,    │
        │   image_generate, skill_view, skills_list, text_to_speech│
        └──────────────────────────────────────────────────────────┘
```

実装の細かいところは、[PR #24182](https://github.com/NousResearch/hermes-agent/pull/24182) と [Codex app-server の通信仕様の README](https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md) をご覧ください。
