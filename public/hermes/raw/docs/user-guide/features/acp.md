---
title: "ACP ホスト連携"
description: "ACP に対応したエディタや共同作業ツールの中で Hermes Agent を使う"
upstream_path: user-guide/features/acp.md
upstream_blob: 1424c427f0418d6f0b6c109367a42c367bb79647
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/acp
---

# ACP ホスト連携 {#acp-host-integration}

Hermes Agent は ACP サーバーとして動かせます。ACP に対応したホストは、
標準入出力を通して Hermes とやり取りできます。エディタ側では次のものを表示できます。

- チャットのメッセージ
- ツールの動き
- ファイルの差分
- 端末で実行したコマンド
- 承認を求める画面
- 少しずつ流れてくる思考や返答

エディタ以外のホストも、同じ手順で共同作業のイベントを Hermes へ流し込めます。
会話のやり取り自体は別のアプリに任せつつ、Hermes 側の名義・プロバイダ設定・記憶・スキル・
ツールをそのまま保ちたいときに ACP が向いています。

## ACP モードで使えるもの {#what-hermes-exposes-in-acp-mode}

ACP モードの Hermes は、エディタ作業向けに選び抜いた `hermes-acp` ツールセットで動きます。中身は次のとおりです。

- ファイル系: `read_file`、`write_file`、`patch`、`search_files`
- 端末系: `terminal`、`process`
- Web / ブラウザ系
- 記憶、やることリスト、セッション検索
- スキル
- execute_code と delegate_task
- 画像認識

一方で、メッセージの配信や定期実行の管理など、エディタでの使い勝手に合わないものは意図的に外してあります。

## インストール {#installation}

Hermes を普通にインストールしたあと、インストール先のディレクトリで ACP 用の追加パッケージを入れます。

```bash
cd ~/.hermes/hermes-agent && uv pip install -e '.[acp]'
```

これで `agent-client-protocol` が入り、次のものが使えるようになります。

- `hermes acp`
- `hermes-acp`
- `python -m acp_adapter`

## ACP サーバーを起動する {#launching-the-acp-server}

次のどれを実行しても、Hermes が ACP モードで立ち上がります。

```bash
hermes acp
```

```bash
hermes-acp
```

```bash
python -m acp_adapter
```

Hermes はログを標準エラー出力へ書きます。標準出力は ACP の JSON-RPC 通信専用に空けてあるためです。

対話せずに状態だけ確かめたいときは次を使います。

```bash
hermes acp --version
hermes acp --check
```

### ブラウザ系ツール（任意） {#browser-tools-optional}

ブラウザ系のツール（`browser_navigate`、`browser_click` など）は npm パッケージの
`agent-browser` と Chromium に依存していて、Python のパッケージには含まれていません。
次のコマンドで入れてください。

```bash
hermes acp --setup-browser           # interactive (prompts before ~400 MB download)
hermes acp --setup-browser --yes     # accept the download non-interactively
```

これは単体で実行するコマンドです。端末での認証の流れ（`hermes acp --setup`）でも、モデルを選んだあとに続けてブラウザの導入を尋ねられるので、多くの場合は `--setup-browser` を直接実行する必要はありません。

このコマンドが行うことは次のとおりです。

- Node.js 26 が無ければ `~/.hermes/node/` に入れる
- そのディレクトリを指定して `npm install -g agent-browser @askjo/camofox-browser` を実行する（`npm` の `--prefix` が Hermes 管理下の書き込み可能な Node を指すため、管理者権限は要りません）
- Playwright の Chromium を入れる。システムに Chrome や Chromium が見つかればそれを使う

この処理は何度実行しても安全です。2 回目以降は済んでいる部分を飛ばすので短時間で終わります。

## ホスト側の設定 {#host-setup}

### Buzz のチャンネル（リレーによる橋渡し） {#buzz-channels-relay-bridge}

[Buzz](https://github.com/block/buzz) は Nostr を土台にした、人とエージェントのための
共同作業ツールです。付属の `buzz-acp` というハーネスが、Buzz のチャンネルと任意の ACP
エージェントを標準入出力でつなぎます。

```text
Buzz relay <-- WebSocket --> buzz-acp <-- ACP over stdio --> Hermes Agent
```

これは通信経路をつなぐ仕組みであって、Hermes をもう 1 つ入れるわけではありません。
`buzz-acp` が起動する子プロセスは、そのホスト上の `hermes` と同じ設定・認証情報・記憶・
スキル・状態を使います。

（[Buzz Desktop の管理下で動かす方法](#buzz-desktop)とは別物です。あちらは手元の Hermes を
あらかじめ用意されたハーネスとして起動します。こちらのリレー橋渡しは、主にサーバー上で
エージェント名義として Buzz の*チャンネル*に参加するためのものです。）

事前に必要なもの:

- 上の ACP のインストールと `hermes acp --check` を済ませておく。
- [Buzz のリポジトリ](https://github.com/block/buzz)から `buzz-acp` と `buzz` コマンドを
  ビルドしておく（`cargo build --release -p buzz-acp`）。
- Hermes 専用の Nostr 鍵ペアを発行し（`buzz-admin generate-key`）、リレーのメンバーとして
  登録する（`buzz-admin add-member`）。エージェントにはそれぞれ固有の名義が必要です。
  人が使っている鍵ペアを使い回さないでください。
- 参加させたい Buzz のチャンネルに、その名義を追加する。

橋渡しは次のように起動します。

```bash
export BUZZ_RELAY_URL="wss://community.example.com"
export BUZZ_PRIVATE_KEY="..."
export BUZZ_API_TOKEN="..."
export BUZZ_ACP_AGENT_COMMAND="hermes"
export BUZZ_ACP_AGENT_ARGS="acp"

buzz-acp
```

`BUZZ_API_TOKEN` が要るのは、リレー側がトークン認証を必須にしている場合だけです。
秘密鍵や API トークンをコミットしたり、どこかに貼り付けたりしないでください。

サーバーに常駐させるなら、`buzz-acp` はサービス管理の仕組みで動かし、実行ユーザーは対象の
Hermes ホームを所有している OS ユーザーと同じにしてください。設定、鍵の生成、チャンネルの
検出、エージェントごとの選択肢については
[buzz-acp の README](https://github.com/block/buzz/tree/main/crates/buzz-acp) に説明があります。

橋渡しは Hermes の名義がメンバーになっている Buzz のチャンネルをすべて見つけ、新しい
チャンネルに追加されたときも自動で参加します。つまり、どこまで見えるかを決めるのは Buzz の
チャンネル参加状況であり、Hermes 側の設定にチャンネル一覧を別途書く必要はありません。

Hermes の ACP としての動きを所有者の Buzz Desktop に映したいときは、次を追加します。

```bash
export BUZZ_ACP_RELAY_OBSERVER="true"
```

これで、エージェントの所有者宛てに暗号化された種別 `24200` の観測フレームが送られます
（Buzz の NIP-AO）。Desktop 側では、起動から終了までの流れ、ツールの実行、返答、使用量が
エージェントの **Activity log** にそのまま流れます。リレーはこのフレームを一時的なものとして
扱うため、やり取りが始まる前に Desktop を起動しておく必要があります。所有者の手元に残る記録は
Desktop のローカル保存分です。

画面のない橋渡しでは、承認画面を出すエディタが存在しないため、ACP の権限要求には
橋渡し自身が答えます。詳しくは
[Buzz のエージェントは所有者だけが使える状態にする](#keep-buzz-agents-owner-only)を参照してください。
この橋渡しは強い権限を持つ自動処理だと考えてください。専用の OS アカウントを用意し、
エージェントに話しかけられる Buzz 利用者を制限し（`buzz-acp` には `BUZZ_ACP_AGENT_OWNER` に
よる所有者だけに応答する仕組みがあります）、Hermes に働いてほしいチャンネルにだけ参加させて
ください。

### VS Code {#vs-code}

[ACP Client](https://marketplace.visualstudio.com/items?itemName=formulahendry.acp-client) 拡張機能をインストールします。

つなぎ方は次のとおりです。

1. アクティビティバーから ACP Client のパネルを開きます。
2. 組み込みのエージェント一覧から **Hermes Agent** を選びます。
3. 接続してチャットを始めます。

自分で Hermes を定義したい場合は、VS Code の設定の `acp.agents` に次を追加します。

```json
{
  "acp.agents": {
    "Hermes Agent": {
      "command": "hermes",
      "args": ["acp"]
    }
  }
}
```

### Zed {#zed}

Zed の設定で、Hermes を独自のエージェントサーバーとして登録します。

1. Agent Panel を開きます。
2. 次の内容で独自のエージェントサーバーを追加します。

```json
{
  "agent_servers": {
    "hermes-agent": {
      "type": "custom",
      "command": "hermes",
      "args": ["acp"]
    }
  }
}
```

3. Hermes の外部エージェントスレッドを新しく開きます。

事前に必要なもの:

- 先に `hermes model` でプロバイダの認証情報を設定するか、`~/.hermes/.env` や `~/.hermes/config.yaml` に書いておいてください。

### JetBrains {#jetbrains}

ACP に対応したプラグインを使い、`hermes acp` または `hermes-acp` を指すように設定します。

### Buzz Desktop {#buzz-desktop}

[Buzz](https://github.com/block/buzz) には Hermes Agent があらかじめ実行環境として組み込まれています。
Hermes を通常どおりインストールしてあれば Buzz が自動で見つけるので、
**Settings → Runtimes** を開けば実行環境の一覧に Hermes が現れます。

古いインストールなどで見つからない場合は、ログインシェルの PATH 上に ACP の起動用ファイルが
あるかどうかを確かめてください。

```bash
command -v hermes-acp || command -v hermes
```

最近のインストールでは `hermes` と `hermes-acp` の両方の起動用ファイルが
`~/.local/bin` に書き込まれます。古いインストールでも `hermes update` を実行すれば
`hermes-acp` が追加されます。手動で対処するなら、Buzz 側のエージェント起動コマンドを
`hermes`、引数を `["acp"]` に設定してください。

#### モデルの選択 {#model-picker}

Buzz Desktop（v0.5.1 以降）では、エージェントの実行環境の設定画面に Hermes のモデル一覧が
そのまま表示されます。この一覧は ACP を通して Hermes 自身が渡すもので、Hermes 側で認証済みの
プロバイダのモデルがすべて並びます（`hermes model` や `/model` コマンドで見えるものと同じです）。
つまり、一覧に無いモデルは、そのプロバイダの認証情報が Hermes 側に設定されていないということです。

一覧の項目は `provider:model` の形（例: `openrouter:z-ai/glm-5.1`）か、`config.yaml` に定義した
OpenAI 互換の独自エンドポイントであれば `custom:<name>:<model>` の形になります。ここでモデルを
選ぶと、そのエージェントのセッションにだけ適用されます。Hermes 全体の既定は変わりません。
既定を変えるには `hermes model` を使ってください。

#### Buzz のエージェントは所有者だけが使える状態にする {#keep-buzz-agents-owner-only}

Buzz は新しいエージェントを作るとき、**Who can talk to this agent** を必ず `Owner only` にします。
実行環境が Hermes のときは、この設定のままにしてください。

この経路では 2 つの挙動が重なります。まず `hermes-acp` のツールセットには `terminal` と
`execute_code` が含まれます。そして Buzz の ACP 橋渡しは、Hermes からの権限要求を画面に出さず
自分で `allow_once` と答えます。つまり Buzz 上の Hermes エージェントは、確認なしでホスト上の
シェルコマンドを実行します。実際に、使い捨てのディレクトリに対して `rm -rf` を実行するよう
頼んでみたところ、そのまま削除されました。確認は一度も出ませんでした。

ここで `Anyone` を選ぶと、そのチャンネルに手が届く投稿者すべてに同じシェル権限を渡すことに
なります。Buzz は選んでも警告を出しません。

すぐ思いつく対策は、どちらも今のところ効きません。

- `approvals.mode: manual` にすると Hermes は確かに権限要求を出しますが、
  Buzz がそれを自動承認するのでコマンドは実行されます。
- `platform_toolsets.acp` では ACP のツールセットを絞り込めないため、
  `terminal` を外す用途には使えません。

所有者が `!shutdown` と送ればどのモードでもエージェントは停止します。Buzz は他の人からの
このコマンドを無視します。

## 設定と認証情報 {#configuration-and-credentials}

ACP モードは CLI と同じ Hermes の設定を使います。

- `~/.hermes/.env`
- `~/.hermes/config.yaml`
- `~/.hermes/skills/`
- `~/.hermes/state.db`

プロバイダの決定も Hermes の通常の仕組みどおりなので、ACP でも現在設定されているプロバイダと認証情報がそのまま引き継がれます。また Hermes は、初めて接続する ACP クライアント向けに端末での認証方法（`--setup`）を提示します。これを選ぶと Hermes の対話式のモデル・プロバイダ設定が開きます。

## ホスト側から渡される設定 {#host-integration}

ここで挙げる変数は、**ACP ホスト側のプロセス**（エディタや別のエージェントのハーネス）が、
起動した Hermes の子プロセスに対して設定するものです。利用者が設定するものではないので、
`.env` や `config.yaml` に自分で書かないでください。

| 変数 | 値 | 効果 |
|----------|-------|--------|
| `HERMES_ACP_SKIP_CONFIGURED_MCP` | `1` | ACP の JSON-RPC 通信を始める前に、`config.yaml` に書かれた**全体設定の** MCP サーバーを起動する処理を飛ばします。 |

Hermes は通常、ACP の JSON-RPC 通信に入る前に `config.yaml` の MCP サーバーをすべて起動します。
MCP を自分で管理するホスト（セッションで使うサーバーを `session/new` で明示的に渡すホスト）には
この全体起動が要らず、無関係で遅い、あるいは入力を求めてくる MCP サーバーがあると
`initialize` が待たされてしまいます。この目印をちょうど `1` にすると、そうしたホストは起動処理を
飛ばせます。

飛ばされるのは全体設定の `config.yaml` の検出だけです。**ACP セッションが `session/new` で
渡した MCP サーバーはこれまでどおり登録される**ので、ホストが求めた機能が失われることは
ありません。それ以外の値（未設定、空、`0`、`false`）では従来どおりの動きになります。
真っぽく見える無関係な文字列で MCP が黙って無効になることはありません。

## セッションの扱い {#session-behavior}

ACP のセッションは、サーバーが動いている間、ACP アダプタがメモリ上で管理します。

セッションごとに保持されるのは次のものです。

- セッション ID
- 作業ディレクトリ
- 選んだモデル
- 現在の会話履歴
- 中断用のイベント

内部の `AIAgent` は Hermes の通常の保存やログの仕組みをそのまま使いますが、ACP の
`list/load/resume/fork` が対象にするのは、いま動いている ACP サーバープロセスの分だけです。

## 作業ディレクトリの扱い {#working-directory-behavior}

ACP のセッションは、エディタの作業ディレクトリを Hermes のタスク ID に結びつけます。そのため、ファイル系や端末系のツールはサーバープロセスの場所ではなく、エディタで開いている作業場所を基準に動きます。

## 承認 {#approvals}

危険な端末コマンドは、承認を求める形でエディタ側に返せます。ACP の承認の選択肢は CLI より単純です。

- 今回だけ許可
- 常に許可
- 拒否

実際に確認画面が出るかどうかはホスト次第です。ホストは要求をプログラムで自動的に答えても
かまわず、その場合これらの選択肢は通信上は存在しても人の目には届きません。Buzz Desktop が
まさにこの動きをするので、`approvals` の設定にかかわらず、この経路は無人での実行だと考えて
ください。

制限時間を過ぎたときやエラーが起きたときは、承認の橋渡し部分が要求を拒否します。

### セッションの間だけ編集を自動承認する {#session-scoped-edit-auto-approval}

ACP には、*今回だけ許可*と*常に許可*の中間にもう一段あります。**このセッションの間は許可**です。エディタの確認画面でこれを選ぶと、承認は今の ACP セッションの中にだけ記録されます。以降そのセッションで同じ内容のコマンドが来ても確認なしで通りますが、ACP セッションを新しく始めたりエディタを再起動したりすると記録は消え、最初の 1 回はまた確認されます。

| 選択肢 | エディタでの表示 | 適用範囲 | 再起動後も残るか |
|---|---|---|---|
| `allow_once` | Allow once | このツール呼び出し 1 回だけ | 残りません |
| `allow_session` | Allow for session | この ACP セッション内で条件の合う呼び出しすべて | 残りません。セッションが終わると消えます |
| `allow_always` | Allow always | 今後のすべてのセッション | 残ります（Hermes の恒久的な許可リストに書かれます） |
| `deny` | Deny | このツール呼び出し 1 回だけ | 残りません |

作業のあいだだけエージェントを信用したいけれど、長く残る許可は与えたくない。エディタでの作業はたいていそういう形なので、既定としては `allow_session` が向いています。安全面の兼ね合いは分かりやすくて、範囲を広げるほどエディタに邪魔されなくなる一方、エージェントが誤動作したりプロンプトを乗っ取られたりしたときに、気づくまでに受ける被害も大きくなります。見慣れないコマンドはまず `allow_once` で始め、同じ動きを何度か問題なく確認できたら `allow_session` に上げ、`allow_always` は何度実行しても影響のない、ずっと信用できるコマンド（`git status` など）に絞ってください。

ACP の橋渡し部分は、これらの選択肢を Hermes 内部の承認の考え方に対応づけます。`allow_always` は CLI と同じように恒久的な許可リストへ書き込み、`allow_session` は今の ACP セッションのプロセス内にある承認の記録だけに影響します。

## うまくいかないとき {#troubleshooting}

### エディタにエージェントが出てこない {#acp-agent-does-not-appear-in-the-editor}

次を確認してください。

- 手動設定や開発中の環境なら、ホスト側の起動コマンドが `hermes acp` を指しているか。
- Hermes がインストールされていて、PATH 上にあるか。
- ACP 用の追加パッケージが入っているか（`cd ~/.hermes/hermes-agent && uv pip install -e '.[acp]'`）。

### 起動した直後にエラーで落ちる {#acp-starts-but-immediately-errors}

次のコマンドで状態を確かめてください。

```bash
hermes acp --version
hermes acp --check
hermes doctor
hermes status
```

### 認証情報が足りない {#missing-credentials}

ACP モードは Hermes に設定済みのプロバイダをそのまま使います。認証情報は次のコマンドで設定してください。

```bash
hermes model
```

`~/.hermes/.env` を直接編集してもかまいません。端末での認証の流れ（`hermes acp --setup`）から、対話式のプロバイダ・モデル設定を呼び出すこともできます。

## 関連ページ {#see-also}

- [Buzz の ACP ハーネス](https://github.com/block/buzz/tree/main/crates/buzz-acp)
- [ACP の内部構造](/hermes/docs/developer-guide/acp-internals/)
- [プロバイダの決定方法](/hermes/docs/developer-guide/provider-runtime/)
- [ツールの実行の仕組み](/hermes/docs/developer-guide/tools-runtime/)
