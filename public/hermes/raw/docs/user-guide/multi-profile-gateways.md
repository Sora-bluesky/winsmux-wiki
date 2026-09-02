---
title: "user-guide/multi-profile-gateways"
description: ""
upstream_path: user-guide/multi-profile-gateways.md
upstream_blob: 9825f4d047840daaf3f703b6b1329a7f0a398428
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/multi-profile-gateways
---

# 複数のゲートウェイを同時に動かす {#running-many-gateways-at-once}

ボットトークン・セッション・記憶をそれぞれ別に持つ複数の[プロファイル](/hermes/docs/user-guide/profiles/)を、1
台の端末の中で管理下のサービスとして動かします。このページで扱うのは運用まわりの話です。まとめて起動する方法、プロファイルをまたいでログを見る方法、ホストを眠らせない方法、そして
launchd や systemd でよくあるつまずきからの立て直し方を説明します。

Hermes エージェントを 1 体しか動かさないなら、このページは要りません。基本は
[プロファイル](/hermes/docs/user-guide/profiles/)を参照してください。また、*別々の*端末にあるインスタンスへ 1
つのデスクトップアプリから同時につなぎたい場合は、[デスクトップから複数の Hermes インスタンスへつなぐ](/hermes/docs/user-guide/multi-connection-desktop/)を参照してください。

## こういうときに使います {#when-to-use-this}

この構成が向いているのは、2 体以上の Hermes エージェントを同時にオンラインにしておきたいときです。よくある理由を挙げます。

- 個人用のアシスタントを 1 つの Telegram ボットに、コーディング用のエージェントを別のボットに
- 家族ひとりにつき 1 体、あるいは Slack のワークスペースごとに 1 体
- 同じ設定のお試し用と本番用
- 調査エージェントと執筆エージェントと cron で動くボット。記憶とスキルはそれぞれ独立
  させる

プロファイルにはもともと、プラットフォームごとの LaunchAgent
（`ai.hermes.gateway-<name>.plist`）または systemd のユーザーサービス
（`hermes-gateway-<name>.service`）が 1 つずつ用意されています。このガイドは、それらをまとめて扱うための型を足すものです。

## クイックスタート {#quick-start}

```bash
# Create profiles (once)
hermes profile create coder
hermes profile create personal-bot
hermes profile create research

# Configure each
coder setup
personal-bot setup
research setup

# Install each gateway as a managed service
coder gateway install
personal-bot gateway install
research gateway install

# Start them all
coder gateway start
personal-bot gateway start
research gateway start
```

これで完了です。独立した 3 体のエージェントがそれぞれ別のプロセスで動き、落ちたときもログインしたときも自動で立ち上がります。

## もう 1 つの方法: すべてのプロファイルを 1 つのゲートウェイで（多重化） {#alternative-one-gateway-for-all-profiles-multiplexing}

ここまでの形は**プロファイル 1 つにつき 1 プロセス**です。これが既定で、ほとんどの構成ではこちらが正解です。ただし、プロファイルがたくさんあるホストや、プロセスをプロファイルの数だけ抱えるのが運用上つらいコンテナ環境では、代わりに**多重化ゲートウェイを 1
つだけ**動かせます。既定プロファイルのゲートウェイが唯一の受け口になり、その端末の*すべての*プロファイル宛のメッセージを引き受けます。

これは**自分で有効にする**もので、既定では**切**になっています。切のあいだは、このページの内容は何も変わりません。以下の挙動はすべて働きません。

### 多重化が向いている場面 {#when-to-prefer-multiplexing}

- コンテナや VPS での運用で、N 個の管理単位・N 個のポート・N 個の PID ファイルが負担になっている。
- 通信量の少ないプロファイルが多く、1 つずつにプロセスを割く必要がない。
- 起動・監視・再起動の対象を 1 つにまとめたい。

プロファイル同士をプロセスの水準できっちり隔てたいとき（メモリの使用量を分ける、落ちる範囲を独立させる、他に触らず 1 つだけ再起動できるようにする）は、1 プロファイル 1 プロセスのままにしてください。

### 有効にする方法 {#how-to-opt-in}

**既定プロファイル**（多重化の担い手です）にフラグを立て、そのゲートウェイを再起動します。

```bash
hermes config set gateway.multiplex_profiles true
hermes gateway restart
```

既定プロファイルの `~/.hermes/config.yaml` に直接書いても同じです。

```yaml
gateway:
  multiplex_profiles: true
```

（手軽さのため、トップレベルに `multiplex_profiles: true` と書いても受け付けます。）次の起動から、既定のゲートウェイはすべてのプロファイルを数え上げ、各プロファイルで有効になっているプラットフォームをそのプロファイル自身の資格情報で立ち上げ、受け取ったメッセージを持ち主のプロファイルへ振り分けます。1
回のやり取りごとに、振り分け先のプロファイルの設定・スキル・記憶・SOUL・**そしてプロバイダのキー**が解決されます。資格情報がプロファイルをまたいで共有されることはありません。

副となるプロファイルで `hermes gateway start` を実行する必要は**ありません**。既定のゲートウェイが引き受けます。下の「約束事の変化」を参照してください。

### 多重化を入れると何が変わるか {#what-changes-when-multiplexing-is-on}

フラグを立てると、いくつかの振る舞いが変わります。フラグを外せば、どれもすぐ元に戻ります。

#### 1. 副プロファイルは自前のゲートウェイを起動してはいけません {#1-secondary-profiles-must-not-start-their-own-gateway}

多重化が動いている状態で、名前付きプロファイルの `hermes gateway start` / `run` を実行すると**エラーで止まり**、多重化のほうを見るよう促されます。

```
The default gateway is running as a profile multiplexer and already serves
profile 'coder'. ...
```

受け口は多重化の 1 プロセスだけです。2 つ目のプロファイルゲートウェイを立てると、そのプロファイルのプラットフォームを二重に掴んでしまいます。`--force`
は、そのプロファイルに意図して別プロセスを与えたいときにだけ使ってください（多重化が動いているあいだは勧めません）。したがって、このページの前半にあるプロファイル横断のラッパースクリプトは、多重化モードでは**使いません**。管理するのは既定のゲートウェイだけです。

#### 2. HTTP を受けるプラットフォームには `/p/<profile>/` の接頭辞で届きます {#2-http-inbound-platforms-are-reached-via-a-pprofile-url-prefix}

副プロファイル宛の Webhook（およびその他 HTTP
で受ける通信）は、2 つ目のポートではなく、既定のリスナー上のプロファイル接頭辞に届きます。

```
# default profile
POST http://host:8644/webhooks/<route>
# the "coder" profile, same listener
POST http://host:8644/p/coder/webhooks/<route>
```

接頭辞に知らないプロファイル名や未設定のプロファイル名が入っていると `404` を返します。1
つのリスナーがこの形ですべてのプロファイルを引き受けているので、**副プロファイルの側でポートを掴むプラットフォームを有効にしてはいけません**。有効にすると設定の誤りとして扱われ、その副プロファイル全体が飛ばされます。既定のプロファイルや他の健全なプロファイルはそのまま動き続けます。警告には、飛ばしたプロファイル名と衝突しているプラットフォームがすべて出ます。

```
Skipping secondary profile 'coder' due to port-binding config error: Profile
'coder' enables port-binding platform(s) webhook, but gateway.multiplex_profiles
is on. ... Remove these platform entries from profile 'coder's config.yaml or
configure them only on the default profile.
```

この決まりの対象になる、ポートを掴むプラットフォームは次のとおりです。`webhook`、`api_server`、
`msgraph_webhook`、`feishu`、`wecom_callback`、`bluebubbles`、`sms`、
`whatsapp_cloud`、`line`、`teams`。これらは**既定のプロファイルにだけ**設定してください。どのプロファイルへも `/p/<profile>/` の接頭辞で届きます。

認証は URL に書かれたプロファイルに従います。接頭辞のないエンドポイントは、これまでどおり既定のリスナーの資格情報を使います。

- `/p/coder/...` への API サーバーへの要求では、`~/.hermes/profiles/coder/.env` の
  `API_SERVER_KEY` を使う必要があります。既定のリスナーのキーは拒否されます。
- `coder` を宛先にする Webhook のルートは、既定プロファイルの
  `config.yaml` の中で、そのルート固有の `secret` と並べて `profile: coder` を宣言します。その
  secret は `/p/coder/webhooks/<route>` でだけ通り、他のプロファイル接頭辞では拒否されます。
- `profile` のない Webhook のルートは既定プロファイルのルートのままで、名前付きプロファイルの接頭辞からは届きません。

副プロファイルの設定では、ポートを掴むプラットフォームを無効のままにしておいてください。共有のリスナーとそのルートの定義は既定プロファイルに置き、認証を通った各 Webhook ルートをどのプロファイルで実行してよいかは、プロファイルの結び付けが決めます。名前付きのプロファイルへの API 要求は、宛先のプロファイルに
`API_SERVER_KEY` がなければ拒否されます。

飛ばされるのは、この共有リスナーの衝突だけです。セキュリティ設定の誤りは、これまでどおり致命的な扱いです。たとえば `GATEWAY_ALLOW_ALL_USERS` も、そのプラットフォーム固有の全員許可の指定もないまま `open` の方針を持つプラットフォームがあれば、危ないプロファイルを黙って落とすのではなく、ゲートウェイの起動そのものを中止します。

#### 3. 資格情報ごとのプラットフォームは、プロファイルごとに専用のトークンが必要です {#3-per-credential-platforms-still-need-their-own-token-per-profile}

ポーリングや接続でつながるプラットフォーム（Telegram、Discord、Slack、Matrix、Signal など）は多重化しても問題なく動きますが、有効にするプロファイルはそれぞれ**専用の**ボットトークンを用意しなければなりません。同じトークンを 2
つのプロファイルで同時にポーリングすることはできません。2 つのプロファイルが同じ `(platform, token)` を設定していると、起動時に両方のプロファイル名を挙げてすぐ失敗します（[トークン衝突の安全装置](#token-conflict-safety)を参照してください。決まり自体は変わらず、1 つのプロセスの中で守られるようになっただけです）。

#### 4. セッションキーはプロファイルごとに名前空間が分かれます {#4-session-keys-are-namespaced-by-profile}

プロファイルのセッションは `agent:<profile>:…` という名前空間に入るので、同じプラットフォーム・同じチャットで 2
つのプロファイルが共有のセッション置き場でぶつかることはありません。**既定**のプロファイルはこれまでどおり `agent:main:…` の名前空間を 1
バイトも変えずに使うため、既存の既定プロファイルのセッションは影響を受けません。移行も要らず、行き場を失う履歴も出ません。

#### 5. PID とロックは 1 つ、状態を見る場所も 1 つ {#5-one-pidlock-and-one-status-surface}

プロセスの水準の PID とロックは 1 つだけです（既定のホームの下にある多重化のものです）。`hermes status`
は多重化の状態と、引き受けているプロファイルを表示します。`hermes status -p <name>` を使えば 1 つのプロファイルに絞れます。各プロファイルは今も自分のホームの下に `runtime_status.json` を書くので、既存のプロファイル単位の読み取りはそのまま使えます。

#### 変わらないこと {#what-does-not-change}

プロファイルごとの `.env`
による資格情報の隔離は保たれ、むしろ厳しくなります。プロファイルのキーはそのプロファイルの範囲から解決され、共有の環境変数へ寄せ集められることはありません（つまり MCP サーバーやカンバンのワーカーのようなサブプロセスも、自分のプロファイルの秘密しか見られません）。ターミナルの設定
（`terminal.backend`、`terminal.cwd`、`terminal.docker_volumes`、
`terminal.docker_shared_container_key`、SSH の接続先など）も、振り分けが起きるたびにプロファイルごとに解決されます。ターミナルの項目を書いていないプロファイルは、起動したプロファイルの値ではなく、文書どおりの既定値を受け取ります。`config.yaml` や `.env`
を読めないプロファイルは、他のプロファイルのサンドボックス方針で動かされるのではなく、ターミナルの実行そのものを拒まれます。カンバン、プロファイル単位のスキル・記憶・SOUL、モデルの振り分けは、どれもゲートウェイを分けたときとまったく同じくプロファイルごとに働きます。

### 引き受けるプロファイルを選ぶ {#serving-selected-profiles}

`gateway.multiplex_profiles: true` は既定で、そのホストにある有効な名前付きプロファイルをすべて引き受けます。入れてはあるが関係のないプロファイルのアダプタや cron
ジョブを立ち上げたくないときは、`gateway.multiplex_profile_allowlist` を設定します。

```yaml
gateway:
  multiplex_profiles: true
  multiplex_profile_allowlist:
    - worker
    - guest
```

既定のプロファイルは常に引き受けられるので、書き並べる必要はありません。この設定がなければ従来どおり全部を引き受け、空のリストにすると既定のプロファイルだけになります。名前は正規化され、重複は取り除かれます。リストとして不正な項目や、入っていないプロファイル名は警告を出して飛ばします。リストになっていない壊れた値のときは、安全側に倒して既定のプロファイルだけになります。

こうして決まった引き受けの範囲は、`/p/<profile>/` の API と Webhook の接頭辞、実行時の状態表示、プロファイルへの振り分けの可否、そしてプロセス内の cron
スケジューラがどのプロファイルを刻むかも決めます。許可リストの外にある名前付きプロファイルも、自前の独立したゲートウェイなら動かせます。

### ボットを共有するチャットをプロファイルへ振り分ける（`profile_routes`） {#routing-shared-bot-chats-to-profiles-profileroutes}

多重化は**資格情報**ごと（プロファイル専用のボットトークン）、または **URL の接頭辞**ごと（HTTP のプラットフォームなら
`/p/<profile>/`）にプロファイルを選びます。複数のコミュニティが**1 つの**ボットトークンを共有する場合（たとえば
1 つの Discord ボットが多くのサーバーで働く場合）には、`gateway.profile_routes` を使って、特定のサーバー・チャンネル・スレッドを別々のプロファイルへ振り分けることもできます。

```yaml
gateway:
  multiplex_profiles: true
  profile_routes:
    # An entire Discord server → one profile
    - name: acme-server
      platform: discord
      guild_id: "1234567890"
      profile: acme

    # One channel in that server → a different profile
    - name: acme-support
      platform: discord
      guild_id: "1234567890"
      chat_id: "9876543210"
      profile: acme-support

    # A Telegram group (no guild concept — chat_id only)
    - name: tg-group
      platform: telegram
      chat_id: "-1001234567890"
      profile: tg-profile

    # A WhatsApp DM — write the phone number; JID and LID forms also match
    - name: owner-whatsapp
      platform: whatsapp
      chat_id: "15551234567"
      profile: owner
```

振り分けは細かいものから順に照合され（`thread_id` > `chat_id` > `guild_id`）、書いた項目はすべて満たされる必要があり（AND）、チャンネルを指定した振り分けは、そのチャンネルを親に持つスレッドやフォーラムの投稿にも当たります。どの振り分けにも当たらなかったメッセージは、既定（有効な）プロファイルのまま扱われます。振り分けられたプロファイルは、上に書いたプロファイル単位の隔離（設定、スキル、記憶、資格情報、セッションの名前空間）を丸ごと受け取ります。振り分けは Discord に限らず、すべてのプラットフォームのアダプタで働きます。

WhatsApp と WhatsApp Cloud では、`chat_id`
の振り分けが利用者の識別子の形をまたいで当たります。裸の電話番号（`15551234567`）、JID
（`15551234567@s.whatsapp.net`）、LID（`…@lid`）は、ブリッジが対応付けを済ませていれば同じ人を指します（セッションキーやアダプタの許可リストがすでに使っているのと同じ正規化です）。`profile_routes`
に電話番号を書いておけば、WhatsApp が JID を渡してきても LID を渡してきても、受信した個人宛のメッセージは当たります。LID
の対応付けがまだないうちは、番号の形でも JID には当たりますが（末尾が取り除かれます）、未知の LID は解決できません。そのメッセージは対応付けができるまで既定のプロファイルへ落ちます。グループのチャット
（`…@g.us`）は送信者の識別子ではないので、これまでどおり完全一致で当たります。Telegram の数値の
id は変わりません。

`profile_routes` には `gateway.multiplex_profiles: true` が必要です。多重化が切のときは無視されます。明示した振り分けに当たったのに、その宛先のプロファイルが入っていない、あるいは
`multiplex_profile_allowlist` の外にある場合、ゲートウェイはその受信を拒み、振り分けと宛先をログに残します。既定のプロファイルで代わりに動かすことはしません。どの振り分けにも当たらない通信は、これまでどおり既定のプロファイルで扱われます。

振り分け先のプロファイルが持つ cron ジョブも共有のボットを通して届きますが、届くのは
`chat_id` か `thread_id` を持つ有効な振り分けがそのプロファイルへ結び付けている宛先だけです。振り分けのないチャット（や別のプロファイルへ振り分けられているチャット）を宛先にしたジョブが、共有のボットから送られることはありません。サーバーだけを指定した振り分けは cron
の宛先の条件を満たしません。配信先のチャンネルには `chat_id` の振り分けを足してください。

## すべてのゲートウェイをまとめて起動・停止・再起動する {#start-stop-or-restart-all-gateways-at-once}

CLI に付いてくるのはプロファイル 1 つ分の操作コマンドです。すべてのプロファイルに対して動かすには、シェルのループで包みます。下のひな形を
`~/.local/bin/hermes-gateways` に置き、`chmod +x` を付けてください。

```sh
#!/bin/sh
set -eu

# Add or remove profile names here as you create / delete profiles.
profiles="default coder personal-bot research"

usage() {
  echo "Usage: hermes-gateways {start|stop|restart|status|list}"
}

run_for_profile() {
  profile="$1"
  action="$2"
  if [ "$profile" = "default" ]; then
    hermes gateway "$action"
  else
    hermes -p "$profile" gateway "$action"
  fi
}

action="${1:-}"
case "$action" in
  start|stop|restart|status)
    for profile in $profiles; do
      echo "==> $action $profile"
      run_for_profile "$profile" "$action"
    done
    ;;
  list)
    hermes gateway list
    ;;
  *)
    usage
    exit 2
    ;;
esac
```

そのうえで、次のように使います。

```bash
hermes-gateways start      # start every configured profile
hermes-gateways stop       # stop every configured profile
hermes-gateways restart    # restart all
hermes-gateways status     # status across all
hermes-gateways list       # delegates to `hermes gateway list`
```

:::tip
`default` プロファイルを指すときは `hermes -p default gateway <action>` ではなく、`-p` を付けない
`hermes gateway <action>` です。上のラッパーは両方の形をうまく扱います。
:::

## プロファイルを 1 つだけ操作する {#manage-one-profile}

どのプロファイルにも入る近道のコマンドです。

```bash
coder gateway run        # foreground (Ctrl-C to stop)
coder gateway start      # start the managed service
coder gateway stop       # stop the managed service
coder gateway restart    # restart
coder gateway status     # status
coder gateway install    # create the LaunchAgent / systemd unit
coder gateway uninstall  # remove the service file
```

これらは `hermes -p coder gateway <action>` と同じです。プロファイルの別名が `PATH` にないときや、スクリプトから動的にプロファイルを指定したいときに役立ちます。

## サービスのファイル {#service-files}

プロファイルはそれぞれ、名前の重ならない専用のサービスを作るので、導入がぶつかることはありません。

| プラットフォーム | パス                                                              |
| -------- | ----------------------------------------------------------------- |
| macOS    | `~/Library/LaunchAgents/ai.hermes.gateway-<profile>.plist`        |
| Linux    | `~/.config/systemd/user/hermes-gateway-<profile>.service`         |

既定のプロファイルは従来の名前のままです。`ai.hermes.gateway.plist` /
`hermes-gateway.service` です。

## ログを見る {#viewing-logs}

プロファイルはそれぞれ専用のログファイルに書き込みます。

```bash
# Default profile
tail -f ~/.hermes/logs/gateway.log
tail -f ~/.hermes/logs/gateway.error.log

# Named profile
tail -f ~/.hermes/profiles/<name>/logs/gateway.log
tail -f ~/.hermes/profiles/<name>/logs/gateway.error.log
```

すべてのプロファイルのログを同時に流したいときはこうします。

```bash
tail -f ~/.hermes/logs/gateway.log ~/.hermes/profiles/*/logs/gateway.log
```

CLI には構造化されたログの閲覧機能もあります。

```bash
hermes logs -f                  # follow default profile
hermes -p coder logs -f         # follow one profile
hermes logs --help              # filters, levels, JSON output
```

## 実際に動いているものを確かめる {#identify-whats-actually-running}

```bash
hermes profile list             # profiles + model + gateway state
hermes-gateways status          # full status across every profile
launchctl list | grep hermes    # macOS — PIDs and labels
systemctl --user list-units 'hermes-gateway-*'   # Linux — units
```

## 設定を書き換える {#editing-configuration}

プロファイルはそれぞれ、自分のディレクトリの中に設定を持っています。

```
~/.hermes/profiles/<name>/
├── .env              # API keys, bot tokens (chmod 600)
├── config.yaml       # model, provider, toolsets, gateway settings
└── SOUL.md           # personality / system prompt
```

既定のプロファイルは、同じ 3 つのファイルを `~/.hermes/` に直接置いています。

好きなエディタで編集しても、CLI から変えても構いません。

```bash
hermes config set model.model anthropic/claude-sonnet-4    # default profile
coder config set model.model openai/gpt-5                  # named profile
```

`.env` や `config.yaml` を書き換えたら、そのゲートウェイを再起動してください。

```bash
coder gateway restart
# or, for everything:
hermes-gateways restart
```

## ホストを眠らせない {#keeping-the-host-awake}

ゲートウェイのプロセスは一日中動き続けられますが、OS
のほうは何もしていないと眠ろうとします。やり方は 2 つあります。

### macOS — `caffeinate` {#macos-caffeinate}

`caffeinate` は macOS に最初から入っていて、動いているあいだスリープを防ぎます。導入の作業は要りません。

```bash
caffeinate -dis                    # block display, idle, and system sleep
caffeinate -dis -t 28800           # same, auto-exit after 8 hours
caffeinate -i -w $(cat ~/.hermes/gateway.pid) &   # awake while default gateway runs

# Persistent: run in background and forget
nohup caffeinate -dis >/dev/null 2>&1 &
disown

# Inspect / stop
pmset -g assertions | grep -iE 'caffeinate|prevent|user is active'
pkill caffeinate
```

| フラグ   | はたらき                                            |
| ------ | ------------------------------------------------- |
| `-d`   | ディスプレイのスリープを止める                               |
| `-i`   | 無操作によるシステムのスリープを止める（既定）                 |
| `-m`   | ディスクのスリープを止める                               |
| `-s`   | システムのスリープを止める（電源につないだ Mac のみ）         |
| `-u`   | 操作があったように見せる（画面ロックを防ぐ）     |
| `-t N` | `N` 秒後に自動で終了する                       |
| `-w P` | PID `P` が終わったら終了する                           |

:::warning ふたを閉じれば Mac は眠ります
`caffeinate` は、MacBook のふたを閉じたときにハードウェア側で起きるスリープを止められません。ふたを閉じたまま動かしたいときは、省エネルギーやバッテリーの設定を変えるか、別のツールを使ってください。
:::

### Linux — `systemd-inhibit` または `loginctl` {#linux-systemd-inhibit-or-loginctl}

```bash
# Inhibit suspend while a command runs
systemd-inhibit --what=idle:sleep --who=hermes --why="gateways running" \
  sleep infinity &

# Allow user services to keep running after logout (recommended)
sudo loginctl enable-linger "$USER"
```

lingering を有効にすると、systemd のユーザーユニット（`hermes-gateway-<profile>.service`
を含みます）が SSH の切断や再起動をまたいで動き続けます。

## トークン衝突の安全装置 {#token-conflict-safety}

プロファイルは、プラットフォームごとに重ならないボットトークンを使う必要があります。2
つのプロファイルが Telegram、Discord、Slack、WhatsApp、Signal のトークンを共有していると、2
つ目のゲートウェイは衝突しているプロファイル名を挙げたエラーを出して起動を拒みます。

確かめるにはこうします。

```bash
grep -H 'TELEGRAM_BOT_TOKEN\|DISCORD_BOT_TOKEN' \
     ~/.hermes/.env ~/.hermes/profiles/*/.env
```

## コードを更新する {#updating-the-code}

`hermes update` は最新のコードを一度だけ取得し、新しい同梱スキルをすべてのプロファイルへ反映します。

```bash
hermes update
hermes-gateways restart
```

自分で書き換えたスキルが上書きされることはありません。

## 困ったときは {#troubleshooting}

### 「Could not find service in domain for user gui: 501」と出る {#could-not-find-service-in-domain-for-user-gui-501}

`hermes gateway stop` のあとに `hermes gateway start` を実行した場合に出ます。CLI の
`stop` は `launchctl unload` を丸ごと行うので、launchd
の登録簿からサービスが消えます。CLI は `start` のときにこのエラーだけを捕まえ、plist
を自動で読み直します（`↻ launchd job was unloaded; reloading
service definition`）。サービスは普通に起動します。直すことは何もありません。

### 落ちたあとに PID が残っている {#stale-pid-after-a-crash}

あるプロファイルのゲートウェイが `not running` と出るのに、プロセスがまだ生きている場合はこうします。

```bash
ps -ef | grep "hermes_cli.*-p <profile>"
cat ~/.hermes/profiles/<profile>/gateway.pid
kill -TERM <pid>          # graceful
kill -KILL <pid>          # if that fails after a few seconds
<profile> gateway start
```

### サービスを 1 つだけ強制的に入れ直す {#forcing-a-hard-reset-of-one-service}

```bash
# macOS
launchctl unload ~/Library/LaunchAgents/ai.hermes.gateway-<profile>.plist
launchctl load   ~/Library/LaunchAgents/ai.hermes.gateway-<profile>.plist

# Linux
systemctl --user restart hermes-gateway-<profile>.service
```

### 健康診断 {#health-check}

```bash
hermes doctor                  # default profile
hermes -p <profile> doctor     # one profile
```
