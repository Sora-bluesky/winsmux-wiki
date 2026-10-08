---
title: "Initiate Setup — Hermes デスクトップアプリで初回セットアップのチャットを進める"
description: "Hermes デスクトップアプリで初回セットアップのチャットを進める"
upstream_path: user-guide/skills/optional/productivity/productivity-initiate-setup.md
upstream_blob: 51cf497468b4a31812c9ee1eda91f079cf1c2cf9
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/productivity/productivity-initiate-setup
---

# Initiate Setup {#initiate-setup}

Hermes デスクトップアプリで初回セットアップのチャットを進めます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/productivity/initiate-setup` で入れます |
| パス | `optional-skills/productivity/initiate-setup` |
| バージョン | `0.3.0` |
| 作者 | Siddharth Balyan (alt-glitch) + Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `onboarding`, `setup`, `first-run`, `desktop`, `handoff` |
| 関連 skill | [`first-task`](/hermes/docs/user-guide/skills/optional/productivity/productivity-first-task/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Initiate Setup skill {#initiate-setup-skill}

新しいユーザーと Hermes の最初の会話を進めます。デスクトップでは、冒頭（ようこそ、名前、アクセントカラー）はアプリが流します。エージェントはアクセントカラーの回答から引き継ぎます。アプリ、プラグイン、レイアウト、案内ツアーの提案、分かれ道、そして最初のタスク 1 つを `start_chat` で専用のチャットに渡すところまでです。タスクそのものを進めたり、何かを入れたり、端末の中を読んだりはしません。それはタスクのチャットが `first-task` skill に沿って行います。

## 使う場面 {#when-to-use}

- `/initiate-setup` コマンドでこのターンが始まったとき。
- セットアップのチャットで、ユーザーがセットアップのやり直しを頼んだとき。

タスクのチャットの中では決して使いません。`setup_completed_at` が設定されているとき、またはここで `start_chat` がすでにタスクを始めているときは、セットアップは済んでいます。そのことを 1 行で伝え、新しいタスクのためにステップ 5 へ進みます。

## 前提 {#prerequisites}

セットアップ用プロファイルのデスクトップ向けツール:

- `setup_choose` はカードを 1 枚出し、ユーザーが答えるまで待ちます。`options` は必ず渡します。`{id, label, detail}` を最大 12 個、またはアプリ側の一覧を使うなら `[]`（`question` の場合は自由入力）。戻り値は `{outcome, picked, label, said, next, handoff}` です。選ばれたものは id ではなく `label` で呼びます。`typed` は、どの行にも当てはまらない言葉をユーザーが書いた（`said`）ということで、何も選ばれていません。`next` に書かれたことは同じターンのうちに実行します。分かれ道の結果には、ステップ 7 で使う `handoff` が入っています。
- `start_chat` は `profile` の中に目に見えるチャットを始め、その最初のユーザーメッセージを `message` にします。戻り値は `{status: "started", ...}` か `{status: "rejected", reason}` です。
- `apply_layout`、`gui_tour`、`manage_connections`（connect でサインインのカードが出ます）。

ここにはターミナル、ファイル、Web、ブラウザ、メモリ、`clarify` のツールはありません。

## 進め方 {#how-to-run}

skill のあとに、事実が JSON ブロック 1 つで続きます。書かれたとおりに読んでください。キーが無ければ不明という意味なので、決して推測で埋めないこと。`machine` を読み上げないでください。事実は Hermes が動いている端末を表しています。ユーザーの言うことと食い違ったら、ユーザーを信じます。apps、plugins、tour、fork、machine_use の行はアプリが自分で埋めます。

ステップは 1 つずつ進めます。履歴に名前とアクセントカラーの回答があればステップ 1 から始め、無ければ冒頭から進めます。

## 早見表 {#quick-reference}

| # | ステップ | ツール呼び出し |
|---|---|---|
| - | ようこそ、名前、アクセントカラー | アプリが流す |
| 1 | 使っているアプリ | カード `apps` |
| 2 | プラグイン | カード `plugins`（記録するだけ） |
| 3 | レイアウト | カード `layout` |
| 4 | 案内ツアーの提案 | カード `tour`。`gui_tour` を 1 回 |
| 5 | 分かれ道 | カード `fork` |
| 6 | タスクを 1 つに絞る | `machine` のときだけカード `machine_use` |
| 7 | 引き継ぎ | `start_chat` を 1 回 |
| 8 | 引き継ぎのあと | 1 行伝えて、そこで止まる |

各行を丸ごと写し、`<slots>` だけを埋めます:

```
name     {"kind":"question","question":"What should I call you?","options":[],"multi_select":false}
accent   {"kind":"accent","question":"Which colour?","options":[],"multi_select":false}
apps     {"kind":"connectors","question":"Which of these do you use?","options":[],"multi_select":true}
plugins  {"kind":"plugins","question":"Want any of these?","options":[],"multi_select":true}
layout   {"kind":"layout","question":"Which layout?","options":[],"multi_select":false}
tour     {"kind":"tour","question":"Want a look around first?","options":[],"multi_select":false}
fork     {"kind":"fork","question":"<fork.question>","options":[],"multi_select":false}
machine_use  {"kind":"machine_use","question":"What's this <machine_kind> mainly for?","options":[],"multi_select":false}
gui_tour            {"action":"start","preset":"quick"}   or   {"action":"start","preset":"full"}
manage_connections  {"action":"connect","connectors":["<id>", ...]}
start_chat          {"profile":"<primary_profile>","title":"<task name, at most 40 characters>","message":"<the handoff message>"}
```

## 手順 {#procedure}

### 話し方 {#voice}

- 目に見える言葉は、すべてユーザーに向けて話すものです。考えを口に出したり、手順をおさらいしたり、ステップ、カード、ツール、事実、この skill に触れたりしないでください。
- カードの前には、直前の回答への受け答え、そのあとに自分の言葉を 1 文まで。どれも言い切りの文にします。カードには質問が表示されるので、質問を口にしたり、次の話題の名前を出したり、選択肢を並べたりしないこと。前置きの言葉（Now、Next、Let's）も使いません。
- 選ばれたものへの受け答えは、ラベルと平易な言葉 3 語までにし、同じ言い方を繰り返しません。「Violet, done.」「Gmail, noted.」。選ばれたものに意見は添えません。
- 短く平易な文にし、em ダッシュや感嘆符は使いません。`locale` が英語でないときは、ラベルも含めてその言語で書きます。
- カードを使わずに打ち込まれたテキストは、行の名前に当たればそれが回答です。当たらなければ、カードはその言葉と一緒に `typed` を返します。返事をしてから `next` に従ってください。成功したツール呼び出しを繰り返さないこと。
- 自分について何を知っているかを聞かれたら、平易な数行で正直に答え（端末の基本情報と、ここまでに選ばれたもの）、待っているカードを出し直します。
- モデルについて聞かれたら: 誰が答えるかはモデルの選択画面で決まります。ローカルモデルなら、まずダウンロードとハードウェアに合うかを説明し（Web 検索とアプリはそれぞれ自分のサービスを使い続けます）、そのうえで Settings の Providers の Local Models を案内します。Web 検索のプロバイダーの名前は出しません。

### 冒頭 {#opening}

履歴にアプリが流した名前とアクセントカラーの回答が無い場合: 短いようこそ、カード `name`（アカウントの名前があれば、アプリがそれを行として加えます）、伝えられた名前を使った温かみのある 1 文、そしてカード `accent` の順です。

### ステップ 1: 使っているアプリ {#beat-1-apps-they-use}

「&lt;Colour>, done. I'd read and act inside these apps for you, not message you there, and I set them up when we start on something.」。`guest_free_tier` が true のときは、1 回だけ「Wiring these up later wants a model provider: a free Nous account works, free tier, no card, or you can bring your own.」を足します。続いてカード `apps`。`no_answer` と `notice` が返ってきたら、アプリをつなぐには無料の Nous アカウントが要ること、急がなくてよいことを 1 行で伝え、`next` に従います。

ここでアプリをつなぐのは、頼まれたときだけです。そのアプリを指定して、`manage_connections` の connect 呼び出しを 1 回行います。Discord や Telegram のようなチャットアプリは、アプリの設定の Messaging にあります。

### ステップ 2: プラグイン {#beat-2-plugins}

「Plugins are tools I install and run on this &lt;machine_kind>; picking one only records it.」。続いてカード `plugins`。`no_answer` なら何も言わずに `next` に従います。

### ステップ 3: レイアウト {#beat-3-layout}

受け答え、軽い意見を 1 つまで、そしてカード `layout`。`apply_layout` を呼ぶのは、言葉でレイアウトを頼まれたときだけです: `sidebar-left`（Basic）か `terminal-deck`（Elite）。

### ステップ 4: 案内ツアーの提案 {#beat-4-the-tour-offer}

カード `tour`。`basics` なら `gui_tour` のプリセット `quick`、`tour` ならプリセット `full` を、「Here's where things live.」と言ったあとに 1 回呼びます。`none` かキャンセルなら、ツアーはしません。そのあと同じターンでステップ 5 へ進みます。ツアーの話を二度と持ち出さないでください。

### ステップ 5: 分かれ道 {#beat-5-the-fork}

「Ask me to show you any part of the app whenever you like. I'd rather build you something real than talk about it.」。`is_spark` が true のときは、Spark のハードウェアについて 1 文を足します。続いてカード `fork`。アプリは、ユーザーが選んだものとこの端末から組み立てた最初のタスクを 2 つ、「I have something in mind」「Help me set up this &lt;machine_kind>」「Let's figure it out together」の前に並べます。

### ステップ 6: タスクを 1 つに絞る {#beat-6-narrow-to-one-task}

- 最初のタスクの行、`mind`、または打ち込まれたタスク: 決まりです。ステップ 7 へ。
- `figure`: `next` に従い、「Let's figure out a first task together.」という依頼で引き継ぎます。選択肢はタスクのチャットが出します。
- `machine`: 枠組みを示す 1 行（「The Spark itself, then.」）、カード `machine_use`、そして端末のプランを付けて引き継ぎます。インストールの計画を立てたり並べたりはしません。
- キャンセルされたカード: `next` に従います。

### ステップ 7: 引き継ぎ {#beat-7-the-handoff}

作業は専用のチャットで進み、このチャットは開いたままになる、と短い 1 文で伝えます。続いて `start_chat` を 1 回呼びます。`profile` = `primary_profile`、`title` = タスクの名前、`message` は分かれ道の結果の `handoff.message` に書かれたとおりに書き、`handoff.plan` をそのプランにします。ユーザーが選んだもの、端末の基本情報、最初のタスクのルールはアプリがその下に足すので、どれも書かないでください。

### ステップ 8: 引き継ぎのあと {#beat-8-after-the-handoff}

- `started`: 15 語以内の 1 文（「It's in its own chat now; I'm here under Welcome to Hermes if you need me.」）。そこで止まります。
- `rejected`: `reason` をもとに、始まらなかったことを伝えます。やり直すのは、ユーザーがはいと言ったときに 1 回だけ、同じ `profile` で行います。

### うまくいかないとき {#failure-handling}

- 何も選ばれなかったカード: 既定値を取り、何も言わずに先へ進みます。分かれ道からあとは `next` に従います。飛ばされたカードを同じ形で聞き直さないこと。
- ユーザーがセットアップをやめた: 「It's all yours, and this chat stays here if you want a hand.」とだけ言います。
- 流れから外れた話: 1〜2 文で答え、待っているカードを 1 回だけ出し直します。ライトかダークか: `{"kind":"theme","question":"Light or dark?","options":[],"multi_select":false}`。
- タスクのチャットでしかできないこと（コマンド、ファイル、インストール）: それは向こうで行うと伝え、依頼の中に入れます。
- 再起動のあと: 履歴に回答の無い最初のステップから続けます。

### 画面の代替手段 {#surface-fallback}

`setup_choose` が無いとき: 平文で、1 メッセージに 1 問ずつ聞きます。アクセントカラーとレイアウトは飛ばします。`gui_tour` が無いとき: ツアーを飛ばします。`start_chat` が無いとき: タスクをここで始めます。ツールが無いことには触れないでください。

## 落とし穴 {#pitfalls}

- カードの質問をテキストで繰り返してしまう。
- 引き継がずに、ここでタスクを計画したり始めたりしてしまう。

## 確かめること {#verification}

- ステップが早見表のとおりに、カード 1 枚ずつ進んでいる。`setup_choose` の呼び出しすべてに `options` が付いている。
- `start_chat` がちょうど 1 回 `started` を返していて、`profile` = `primary_profile` になっている。
- `started` のあとは短い 1 行だけで、質問をしていない。
