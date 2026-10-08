---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "First Task — セットアップから引き継いだ最初のタスクのチャットを進める"
description: "セットアップから引き継いだ最初のタスクのチャットを進める"
upstream_path: user-guide/skills/optional/productivity/productivity-first-task.md
upstream_blob: 9153daa48b2bc88a21d7ceb9956a8709951c6060
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/productivity/productivity-first-task
---

# First Task {#first-task}

セットアップから引き継いだ最初のタスクのチャットを進めます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/productivity/first-task` で入れます |
| パス | `optional-skills/productivity/first-task` |
| バージョン | `0.3.0` |
| 作者 | Siddharth Balyan (alt-glitch) + Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `onboarding`, `first-run`, `desktop`, `handoff` |
| 関連 skill | [`initiate-setup`](/hermes/docs/user-guide/skills/optional/productivity/productivity-initiate-setup/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# First Task skill {#first-task-skill}

セットアップのあとの最初のチャットを進めます。このメッセージには、ユーザーの依頼、続いて「What setup learned about me」（ユーザーが選んだものと、この端末の基本情報）、そしてこのルールと JSON ブロックが入っています。目標は、1 分以内に作業が目に見えて動き出し、5 分以内に役に立つ結果が仕上がることです。

## 使う場面 {#when-to-use}

- このメッセージが、セットアップからの引き継ぎとしてこの skill を運んできたとき。
- 最初の結果が出るまで。そのあとは普通のチャットです。

## 前提 {#prerequisites}

ツール: `manage_connections`、`manage_catalog`、`clarify`、`terminal`、ファイル系のツール、ブラウザ、`tool_search`、`skill_view`、そしてデスクトップアプリでは `desktop_preview`。ここに名前があるのに手元のツール一覧に無いツール（`manage_catalog` が多いです）は遅延読み込みになっています。素の名前で呼ばず、必ず `tool_call` 経由で実行してください。

## 進め方 {#how-to-run}

次の制限を守ってください。ほかのどの行よりも優先します。

1. 最初の返答は、短い 1 行のテキストとツール呼び出しを、同じ返答の中で出します。
2. JSON ブロックには `connect`（コネクタの id）と `install`（プラグインの id）が入っています。id は正確な値です。下の形をそのまま実行し、その前に検索・説明・状態確認の手順を挟まないでください。
3. 確認とは、読み取りだけのコマンド（`ls`、`which`、`find`、`cat`、存在確認）かファイルの読み込みのことです。何かを作る前の確認は 2 回まで。複数の確認は 1 つのコマンドにまとめます。
4. ディスク全体を検索しない（`find /`）、タスクのフォルダの外にあるファイルを読まない。「What setup learned」がすでに調査結果です。
5. 作業前の質問は 1 回まで、それも依頼があいまいなときだけです。
6. 同じ呼び出しを 2 回実行しない。失敗した呼び出しは 1 回だけ変えて試します。それでも失敗したら、そう伝えて先へ進みます。
7. 最初のひと区切りでは、必ず何かを作ります。ファイル、プレビューに出すページ、インストール、実データからの要約のどれかです。見たものをチャットでまとめるだけでは結果になりません。
8. 最初のひと区切りは、早見表にある締めのカードをそのまま写して終えます。失敗したときも同じです。
9. 何が失敗したか、何を試していないかをはっきり伝えます。データをまねたり作り上げたりしないでください。

## 早見表 {#quick-reference}

| 手順 | 内容 | 呼び出し |
|---|---|---|
| 1 | 何から始めるかを 1 行で伝える | なし |
| 2 | 選ばれたアプリをつなぐ | `manage_connections` の connect。`connect` のすべての id を 1 回で |
| 3 | 選ばれたプラグインを入れる | `manage_catalog` の install（遅延読み込みなら `tool_call` 経由）。`install` のすべての id を 1 回で |
| 4 | 依頼が具体的なら着手する。あいまいなら選択肢 3 つのカードを 1 枚 | `clarify` |
| 5 | 最初のひと区切りを 5 分で仕上げる | そのタスク自身のツール |
| 6 | 結果を 1 行で伝え、締めのカードを出す | `clarify`、下の締めのカード |

```
manage_connections  {"action":"connect","connectors":["<id>", ...]}
manage_catalog      {"action":"install","items":[{"kind":"plugin","id":"<id>"}, ...],"reason":"<one line>"}
tool_call           {"calls":[{"name":"manage_catalog","arguments":{"action":"install","items":[{"kind":"plugin","id":"<id>"}],"reason":"<one line>"}}]}   (when manage_catalog is deferred)
clarify             {"questions":[{"question":"<short question>","choices":["<option>","<option>","<option>"]}]}
close card          {"questions":[{"question":"How does this look?","choices":["Looks right","Change something","Take it further"]}]}
```

`tool_call` 1 回ごとに、`calls` に入れる項目は 1 つです。締めのカードはそのまま写してください。選択肢の名前を変えたり、足したり、印を付けたりしないこと。次の一手の案はテキストの行に書きます。

## 手順 {#procedure}

### 1. まずつなぐ {#1-connect-first}

最初の 1 行のすぐあとに、手順 2 と 3 を続けて実行します。リストが空の手順は飛ばします。

各手順は 1 回だけ実行します。前の手順をやり直さないでください。つなぐカードへの回答は、このチャットのあいだは確定です。つながったアプリを使い、ほかのアプリをつなぎ直したり、それについて尋ねたりしないこと。Continue のあとにつながっていないアプリは、飛ばしたものとして扱います。残りは Connections メニューからあとでつなげる、と締めのときに 1 回だけ伝えます。

### 2. 依頼ごとの最初の一手 {#2-first-move-for-each-ask}

| 依頼 | 最初の一手 |
|---|---|
| 毎日の要約 / 仕事のアプリ | つなぐ。つながったアプリのツールを `tool_search` で見つけ、チャットに要約を書く。どれもつながらなければ手順 3。 |
| この端末のセットアップ / アプリを入れる | アプリのカードを `clarify` で 1 枚出し、手順 4 へ。 |
| プラグインのアプリで何か作る（Blender） | インストールする。続いてプラグインの skill を id で `skill_view` し、小さなものを 1 つ作る。インストールが `connected` にならなければ手順 3。 |
| 何かを自動化する / スクリプト | 手順 5。依頼にタスクの名前が無ければ、先にカードを 1 枚:「Rename my screenshots by date」「Sort my Downloads by type」「Clear old files off my Desktop」。 |
| あいまい（「I have something in mind」「Let's figure it out」） | 下の候補から選択肢 3 つの `clarify` カードを 1 枚出す。選ばれたものに着手する。 |

あいまいな依頼に出す候補です。どれも 5 分で何かを作れます。アプリの名前は、ユーザーが選んだものだけを出します。「find」「review」「audit」「clean up my &lt;app>」は出さないでください。これらは調査になるだけで、ものが作られません。

- 仕事のアプリを選んでいる場合:「A daily brief from Linear and Slack」「A summary of my week」。
- NVIDIA や Spark の端末の場合:「Install a few apps for this &lt;machine>」。&lt;machine> には、セットアップの「This …:」の行がその端末に使っている語（Spark、PC、Mac）を入れます。
- プラグインを選んでいる場合:「A simple scene in Blender」。
- それ以外:「A small HTML page about &lt;something they picked or said>」「A start page with links to my apps」「A quick script that tidies my Downloads」。

最初の選択肢は、必ずページかファイルを作るものにします。選択肢を選ばずにテキストを打ち込んできたら、それが選んだものです。「surprise me」「idk」「any」と返ってきたら、確認を挟まずに最初の選択肢にすぐ着手します。ファイルを書いて開いてください。

### 3. つなぐのやインストールに失敗したとき {#3-when-a-connect-or-an-install-fails}

何も出さずに止まらないでください。

1. 要約を頼まれたのにアプリが 1 つもつながらなかった場合: そのことを 1 行で伝えます。確認を 1 回だけ、`gh auth status` を実行します。ログインしていれば、GitHub から要約（開いている PR、レビューの依頼、割り当てられた issue）を書き、GitHub から取ったものだと伝えます。ログインしていなければ、アカウントの要らないスタートページかスクリプトを作ります。
2. インストールの状態が `connected` にならない、またはエラーになった場合: そのことを 1 行で伝えます。ディスク上でプラグインを探したり、そのソースを読んだり、自前のクライアントを書いたりしないでください。それなしで作れるいちばん近いものを作ります。Blender なら、シーンを組み立てるスクリプト `~/hermes-first-task/first_scene.py` を書き、コマンド `blender --python <path>` を伝えます。
3. 締めのカードで終えます。もう一度試せることをテキストの行で申し出ます。

### 4. 端末のセットアップ {#4-machine-setup}

「What setup learned」の行にある OS 向けのコマンドを使います。

1. アプリのカードを `clarify` で 1 枚。使い方に合う普段使いのアプリを 3〜5 個、複数選べる形で出します。
2. 確認 1 回目、コマンドは 1 つ。macOS: `which brew && ls -d "/Applications/Slack.app" "/Applications/Zoom.app" 2>&1`。Windows: `winget list --accept-source-agreements`。Linux: `which <app> ...`。flatpak があれば `flatpak list` も足します。
3. 選ばれたもののうち、確認で見つからなかったものだけを、1 コマンドに 1 アプリずつ入れます。macOS: `brew install --cask <app>`。Windows: `winget install --id <id> -e --source winget --accept-source-agreements --accept-package-agreements`（付けないと、新しいプロファイルでは端末から答えられない同意の確認で止まります）。Linux: `flatpak install -y flathub <id>`。`sudo` の要るパッケージは、入れずに手順 5 のリストへ回します。ほかのものには「already installed」と伝えます。入れ直しはしません。
4. Arm の端末では、インストールのあとで、x64 専用のアプリがあればそう伝えます。macOS: 新しく入れたアプリに `lipo -archs` のコマンドを 1 回。Windows: winget が選んだインストーラーについて、インストールの出力に表示されるアーキテクチャ（arm64、またはエミュレーションで動く x64）を読みます。マニフェストから推測しないでください。
5. パスワード、ライセンス、支払いが要るものは、ユーザー向けにリストにして伝えます。セキュリティの設定は決して無効にしないでください。
6. 何が変わったかと次のひと区切り（開発ツール、ドライバー）を 1 行で伝え、締めのカードを出します。

### 5. 自動化 {#5-automations}

1. `~/hermes-first-task/` に `write_file` でスクリプトをすぐ書きます。確認は先にしません。
2. 既定では、スクリプトは何をするかを表示するだけにします。`--apply` のようなフラグを付けたときだけ実際に変更します。
3. 本物のフォルダに対して、プレビューの形で 1 回実行し、出力を見せます。たとえば `python3 ~/hermes-first-task/tidy_downloads.py ~/Downloads` です。実行できなかったら、試していないと伝えます。
4. フォルダが無い、または空なら、そう伝えます。テスト用のファイルやフォルダは作らないでください（`mkdir`、`touch`、`SetFile`）。
5. 実際に変更するためのコマンドを 1 つ伝えます。頼まれていなければ、定期実行のジョブは設定しません。

### 6. 作るときのルール {#6-build-rules}

- 使うのは本物のデータだけです。つながったアプリか、この端末でサインイン済みのツール（ログイン済みの `gh` など。その旨を伝えます）から取ります。コネクタを迂回しないこと。IMAP、アプリパスワード、スクレイピングは使いません。
- 送信、削除、予約の前には必ず確認を取ります。
- ローカルモデルはアプリが設定するもので、エージェントが設定するものではありません。モデルのメニューの Run locally か、Settings の Providers の Local Models を案内します。モデルのランタイムを入れたり、モデルを自分でダウンロードしたりしないでください。
- 作るページは、それ単体で完結した HTML ファイル 1 つにし、`desktop_preview` で開きます。
- 新しいファイルはすべて `~/hermes-first-task/` に保存し、現在のフォルダには置きません。ファイルをあちこちにコピーしないこと。それぞれのファイルの場所を伝えます。
- プラグインのツールは、インストールのあとに `tool_search` で見つけます。そのアプリが起動していなければ、そう伝えます。
- 大きな依頼は最初のひと区切りまで切り詰め、そのことを 1 行で伝えます。時間のかかる手順（大きなダウンロード、フルビルド）を最初のひと区切りにはしません。
- AI エージェントのアプリに慣れていない人には、機能が初めて関係してきたときに、平易な 1 文で説明します。実行の前に許可を求めること、断ってもかまわないことを 1 回伝えます。

### 7. 最初のひと区切りを締める {#7-close-the-first-slice}

何を作り、どこにあるかを短い 1 行で伝え、締めのカードを出します。選ばれたものに沿って動きます。

## 落とし穴 {#pitfalls}

- ファイル、ページ、インストールの代わりに、チャットで報告だけしてしまう。
- 硬い言葉づかい。短く、平易で、温かみのある文で書きます。つなぎの言葉、em ダッシュ、感嘆符は使いません。

## 確かめること {#verification}

- 最初の返答が、1 行のテキストとツール呼び出しになっている。カードを出したのは、あいまいな依頼のときだけ。
- 最初のひと区切りが、決まったとおりの締めのカードで終わっている。失敗したときも同じ。
