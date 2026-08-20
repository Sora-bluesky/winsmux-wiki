---
title: "複数のゲートウェイを同時に動かす"
description: ""
upstream_path: user-guide/multi-profile-gateways.md
upstream_blob: 7feddd069a90e16db198363f5ffae115a9debcfe
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/multi-profile-gateways
---

# 複数のゲートウェイを同時に動かす {#running-many-gateways-at-once}

複数の [プロファイル](/hermes/docs/user-guide/profiles/) — それぞれ独自のボットトークン、
セッション、メモリーを持つ — を、1つの端末の中で管理されたサービスとして動かします。このページで扱うのは
運用まわりの話です。まとめて起動する方法、プロファイルをまたいでログを見る方法、端末が
スリープしないようにする方法、そして launchd / systemd でよくつまずく点からの
復帰方法を説明します。

Hermes エージェントを1つしか動かしていないなら、このページは不要です。基本は
[プロファイル](/hermes/docs/user-guide/profiles/) を参照してください。また、動かしたいものが
*別々の* 端末にあり、1つのデスクトップアプリから同時につなぎたい場合は
[デスクトップから複数の Hermes につなぐ](/hermes/docs/user-guide/multi-connection-desktop/) を参照してください。

## こんなときに使う {#when-to-use-this}

この構成が向いているのは、2つ以上の Hermes エージェントを同時にオンラインにしておきたい
ときです。よくある理由を挙げます。

- ある Telegram ボットに個人用の相棒、別のボットにコーディング用のエージェントを置きたい
- 家族ひとりにつき1つ、あるいは Slack ワークスペースごとに1つ動かしたい
- 同じ設定の検証用と本番用を並べたい
- リサーチ用と執筆用と cron 駆動のボットを、それぞれメモリーとスキルを分けて動かしたい

プロファイルはどれも、プラットフォームごとの LaunchAgent
（`ai.hermes.gateway-<name>.plist`）または systemd のユーザーサービス
（`hermes-gateway-<name>.service`）を最初から持っています。ここではそれらを
まとめて扱うためのやり方を足します。

## まずはこれだけ {#quick-start}

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

これだけです。独立した3つのエージェントが、それぞれ別のプロセスで動き、クラッシュしても
ログインし直しても自動で立ち上がります。

## 別のやり方: 全プロファイルを1つのゲートウェイでさばく（多重化） {#alternative-one-gateway-for-all-profiles-multiplexing}

上のやり方は **プロファイル1つにつきプロセス1つ** です。これが既定であり、
たいていの構成ではこちらが適切です。ただ、プロファイルが多い端末や、プロファイルごとに
プロセスを立てるのが運用上重いコンテナ環境では、代わりに
**多重化するゲートウェイを1つだけ** 動かせます。default プロファイルのゲートウェイが
唯一の受け口になり、その端末の *すべての* プロファイル宛のメッセージをさばきます。

これは **自分で有効にする** ものであり、**既定では無効** です。無効のあいだは、このページの
内容は何も変わりません。以降の挙動はすべて働きません。

### 多重化が向いている場合 {#when-to-prefer-multiplexing}

- コンテナや VPS で運用していて、N 個の管理ユニット、N 個のポート、N 個の PID ファイルが
  負担になる場合。
- 通信量の少ないプロファイルが多く、どれもプロセスを丸ごと1つ使うほどではない場合。
- 起動・監視・再起動の対象を1つにまとめたい場合。

プロファイル間をプロセスの単位でしっかり分けたい場合は、プロファイル1つにつきプロセス1つの
ままにしてください（メモリー使用が分かれる、クラッシュの影響範囲が独立する、ほかに触れずに
1つのプロファイルだけ再起動できる、といった利点があります）。

### 有効にする手順 {#how-to-opt-in}

**default プロファイル**（多重化の役目を持つのはここです）にフラグを立て、その
ゲートウェイを再起動します。

```bash
hermes config set gateway.multiplex_profiles true
hermes gateway restart
```

default プロファイルの `~/.hermes/config.yaml` に直接書いても同じです。

```yaml
gateway:
  multiplex_profiles: true
```

（このフラグは、書きやすさのためトップレベルの `multiplex_profiles: true` としても
受け付けます。）次の起動から、default のゲートウェイはすべてのプロファイルを列挙し、
各プロファイルで有効なプラットフォームをそのプロファイル自身の資格情報で立ち上げ、
届いたメッセージをそれぞれの持ち主のプロファイルへ振り分けます。1ターンごとに、
振り分け先プロファイルの設定・スキル・メモリー・SOUL、そして **プロバイダーのキー** まで
解決されます。資格情報がプロファイルをまたいで共有されることはありません。

二次的なプロファイルに対して `hermes gateway start` を実行する必要は **ありません**。
default のゲートウェイがそれらをさばきます。以下の約束事の変更を参照してください。

### 多重化を有効にすると何が変わるか {#what-changes-when-multiplexing-is-on}

フラグを立てると、いくつかの挙動が変わります。ここに挙げたものはすべて、フラグを外した
時点で元に戻ります。

#### 1. 二次的なプロファイルは自分のゲートウェイを起動してはいけない {#1-secondary-profiles-must-not-start-their-own-gateway}

多重化が動いている状態では、名前付きプロファイルの `hermes gateway start` / `run` は
**エラーで止まり**、多重化のほうを見るよう促されます。

```
The default gateway is running as a profile multiplexer and already serves
profile 'coder'. ...
```

受け口となるプロセスは多重化の1つだけです。2つ目のプロファイルのゲートウェイを立てると、
そのプロファイルのプラットフォームを二重に掴んでしまいます。そのプロファイルだけ別プロセスに
したいと意図的に判断した場合にかぎり `--force` を付けてください（多重化が動いているあいだは
おすすめしません）。したがって、このページの前半にあるプロファイル横断の管理スクリプトは
多重化のモードでは **使いません**。管理するのは default のゲートウェイだけです。

#### 2. HTTP で受けるプラットフォームには `/p/<profile>/` の接頭辞でつなぐ {#2-http-inbound-platforms-are-reached-via-a-pprofile-url-prefix}

二次的なプロファイル宛の Webhook（ほか HTTP で受けるもの）は、2つ目のポートでは **なく**、
default のリスナーにプロファイルの接頭辞付きで届きます。

```
# default profile
POST http://host:8644/webhooks/<route>
# the "coder" profile, same listener
POST http://host:8644/p/coder/webhooks/<route>
```

接頭辞に未知のプロファイルや設定されていないプロファイルを指定すると `404` が返ります。
共有のリスナー1つがこの形ですべてのプロファイルをさばくので、**二次的なプロファイルが
自分でポートを掴むプラットフォームを有効にしてはいけません**。有効にすると設定エラーとなり、
その二次的なプロファイル全体が飛ばされます。default とほかの健全なプロファイルは動き続けます。
警告には、飛ばされたプロファイル名と、ぶつかっているプラットフォームがすべて出ます。

```
Skipping secondary profile 'coder' due to port-binding config error: Profile
'coder' enables port-binding platform(s) webhook, but gateway.multiplex_profiles
is on. ... Remove these platform entries from profile 'coder's config.yaml or
configure them only on the default profile.
```

この決まりの対象になるポートを掴むプラットフォームは、`webhook`、`api_server`、
`msgraph_webhook`、`feishu`、`wecom_callback`、`bluebubbles`、`sms`、
`whatsapp_cloud`、`line` です。これらの設定は **default プロファイルにだけ** 置いてください。
どのプロファイルにも `/p/<profile>/` の接頭辞から届きます。

認証は URL に書かれたプロファイルに従います。接頭辞のないエンドポイントは、これまでどおり
default のリスナーの資格情報を使います。

- `/p/coder/...` への API サーバーのリクエストには
  `~/.hermes/profiles/coder/.env` の `API_SERVER_KEY` を使う必要があります。default の
  リスナーのキーは拒否されます。
- `coder` を対象にする Webhook のルートは、default プロファイルの
  `config.yaml` にある、そのルート固有の `secret` の隣に `profile: coder` を
  書く必要があります。その secret は
  `/p/coder/webhooks/<route>` でだけ通り、ほかのプロファイルの接頭辞では拒否されます。
- `profile` を書いていない Webhook のルートは default プロファイルのルートのままで、
  名前付きプロファイルの接頭辞からは届きません。

二次的なプロファイルの設定では、ポートを掴むプラットフォームは無効のままにしてください。
共有のリスナーとそのルート定義は default プロファイルに置いたままにし、認証を通った
Webhook のルートをどのプロファイルで実行してよいかは、プロファイルの紐づけで決めます。
名前付きのリクエストは、対象のプロファイルに `API_SERVER_KEY` がなければ拒否されます。

プロファイルが飛ばされるだけで済むのは、この共有リスナーの衝突だけです。安全に関わる
設定の誤りは、これまでどおり致命的です。たとえば own-policy が `open` のプラットフォームで
`GATEWAY_ALLOW_ALL_USERS` やそのプラットフォーム固有の全許可設定がない場合は、危険な
プロファイルを黙って落とすのではなく、ゲートウェイの起動そのものを中止します。

#### 3. 資格情報がプラットフォームごとに要るものは、プロファイルごとにトークンが必要 {#3-per-credential-platforms-still-need-their-own-token-per-profile}

ポーリングや常時接続で受けるプラットフォーム（Telegram、Discord、Slack、Matrix、Signal など）は
多重化しても問題なく動きますが、それを有効にするプロファイルはそれぞれ **自前の** ボット
トークンを用意する必要があります。同じトークンを2つのプロファイルから同時にポーリングは
できません。2つのプロファイルが同じ `(platform, token)` を設定すると、起動時に両方の
プロファイル名を挙げて即座に失敗します（[トークン衝突の安全装置](#token-conflict-safety) を
参照。決まり自体は変わっておらず、1つのプロセスの中で確かめるようになっただけです）。

#### 4. セッションのキーはプロファイルごとに分かれる {#4-session-keys-are-namespaced-by-profile}

各プロファイルのセッションは `agent:<profile>:…` という名前空間の下に置かれるので、
同じプラットフォームの同じチャットにいる2つのプロファイルが、共有のセッション保管庫で
ぶつかることはありません。**default** プロファイルは従来の `agent:main:…` の名前空間を
そのまま保つので、既存の default プロファイルのセッションは影響を受けません。移行作業も、
迷子になる履歴もありません。

#### 5. PID とロックが1つ、状態の見え方も1つ {#5-one-pidlock-and-one-status-surface}

プロセスとしての PID とロックは1つだけです（多重化のもので、default のホーム配下に
置かれます）。`hermes status` は多重化とそれがさばいているプロファイルを表示し、
`hermes status -p <name>` は1つのプロファイルだけに絞ります。各プロファイルは
これまでどおり自分のホームに `runtime_status.json` を書くので、プロファイルごとに
それを読んでいた仕組みはそのまま動きます。

#### 変わらないもの {#what-does-not-change}

プロファイルごとの `.env` による資格情報の分離は保たれ、むしろ厳しくなります。あるプロファイルの
キーはそのプロファイルの範囲から解決され、共有の環境変数へまとめられることはありません
（つまり MCP サーバーや Kanban のワーカーのような子プロセスも、自分のプロファイルの秘密情報しか
見えません）。Kanban、プロファイル単位のスキル・メモリー・SOUL、モデルの振り分けも、
ゲートウェイを分けていたときとまったく同じくプロファイル単位で働きます。

### さばくプロファイルを選ぶ {#serving-selected-profiles}

`gateway.multiplex_profiles: true` は、既定ではその端末にある有効な名前付きプロファイルを
すべてさばきます。関係のないプロファイルを入れたままアダプターや cron ジョブを動かしたくない
場合は、`gateway.multiplex_profile_allowlist` を設定します。

```yaml
gateway:
  multiplex_profiles: true
  multiplex_profile_allowlist:
    - worker
    - guest
```

default プロファイルは常にさばかれるので、書く必要はありません。この設定を書かない場合は
従来どおり全部をさばきます。空のリストにすると default プロファイルだけをさばきます。
名前は正規化され、重複は取り除かれます。無効な項目や、入っていない名前は警告付きで
飛ばされます。リストでない壊れた値を書いた場合は、安全側に倒れて default だけになります。

こうして決まった対象は、`/p/<profile>/` の API と Webhook の接頭辞、稼働状態の表示、
ルートの振り分け先として選べるかどうか、そしてプロセス内の cron スケジューラーがどの
プロファイルを動かすかにも効きます。許可リストの外にある名前付きプロファイルでも、自分だけの
単独のゲートウェイを動かすことはできます。

### 共有ボットのチャットをプロファイルへ振り分ける（`profile_routes`） {#routing-shared-bot-chats-to-profiles-profileroutes}

多重化は **資格情報ごと**（プロファイル自身のボットトークン）か、**URL の接頭辞ごと**
（HTTP のプラットフォームなら `/p/<profile>/`）にプロファイルを選びます。複数のコミュニティが
**1つの** ボットトークンを共有している場合 — たとえば1つの Discord ボットが多くのサーバーを
まわっている場合 — は、`gateway.profile_routes` で特定のサーバー・チャンネル・スレッドを
別々のプロファイルへ振り分けられます。

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
```

振り分けは細かいものから順に照合され（`thread_id` > `chat_id` > `guild_id`）、
書いた項目はすべて満たされている必要があります（AND 条件）。チャンネルを指定した振り分けは、
そのチャンネルを親に持つスレッドやフォーラムの投稿にも当たります。どの振り分けにも当たらない
メッセージは、default または現在のプロファイルのままです。振り分け先のプロファイルは、
上で説明した分離（設定、スキル、メモリー、資格情報、セッションの名前空間）をすべて受け取ります。
この振り分けは Discord だけでなく、すべてのプラットフォームのアダプターで働きます。

`profile_routes` を使うには `gateway.multiplex_profiles: true` が必要です。多重化が
無効なら、書いた振り分けは無視されます。明示した振り分けに当たったのに、対象のプロファイルが
入っていない、あるいは `multiplex_profile_allowlist` の外にある場合、ゲートウェイはその受信を
拒否し、振り分けと対象をログに残します。default プロファイルで代わりに動かすことはしません。
どの振り分けにも当たらなかった通信は、これまでどおり default プロファイルが受け持ちます。

## すべてのゲートウェイをまとめて起動・停止・再起動する {#start-stop-or-restart-all-gateways-at-once}

CLI に付いてくるのは、プロファイル1つ分の起動・停止のコマンドです。すべてのプロファイルに
対して実行するには、シェルのループで包みます。次の内容を
`~/.local/bin/hermes-gateways` に置き、`chmod +x` してください。

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

あとはこう使います。

```bash
hermes-gateways start      # start every configured profile
hermes-gateways stop       # stop every configured profile
hermes-gateways restart    # restart all
hermes-gateways status     # status across all
hermes-gateways list       # delegates to `hermes gateway list`
```

:::tip
`default` プロファイルを指すときは `hermes gateway <action>`（`-p` なし）を使います。
`hermes -p default gateway <action>` ではありません。上のスクリプトは両方の形を面倒みています。
:::

## プロファイルを1つだけ操作する {#manage-one-profile}

どのプロファイルも、次のショートカットのコマンドを用意します。

```bash
coder gateway run        # foreground (Ctrl-C to stop)
coder gateway start      # start the managed service
coder gateway stop       # stop the managed service
coder gateway restart    # restart
coder gateway status     # status
coder gateway install    # create the LaunchAgent / systemd unit
coder gateway uninstall  # remove the service file
```

これらは `hermes -p coder gateway <action>` と同じです。プロファイルの別名が `PATH` に
ない場合や、スクリプトからプロファイルを動的に指定したい場合に役立ちます。

## サービスのファイル {#service-files}

プロファイルはそれぞれ固有の名前でサービスを登録するので、導入がぶつかることは
ありません。

| プラットフォーム | パス                                                              |
| -------- | ----------------------------------------------------------------- |
| macOS    | `~/Library/LaunchAgents/ai.hermes.gateway-<profile>.plist`        |
| Linux    | `~/.config/systemd/user/hermes-gateway-<profile>.service`         |

default プロファイルは従来の名前のままです。`ai.hermes.gateway.plist` /
`hermes-gateway.service` です。

## ログを見る {#viewing-logs}

プロファイルはそれぞれ自分のログファイルに書きます。

```bash
# Default profile
tail -f ~/.hermes/logs/gateway.log
tail -f ~/.hermes/logs/gateway.error.log

# Named profile
tail -f ~/.hermes/profiles/<name>/logs/gateway.log
tail -f ~/.hermes/profiles/<name>/logs/gateway.error.log
```

すべてのプロファイルのログを同時に流し見るには、こうします。

```bash
tail -f ~/.hermes/logs/gateway.log ~/.hermes/profiles/*/logs/gateway.log
```

CLI には構造化されたログの表示機能もあります。

```bash
hermes logs -f                  # follow default profile
hermes -p coder logs -f         # follow one profile
hermes logs --help              # filters, levels, JSON output
```

## 実際に何が動いているか確かめる {#identify-whats-actually-running}

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

default プロファイルは `~/.hermes/` を直接使い、同じ3つのファイルを置きます。

好きなエディタで編集しても、CLI から変えても構いません。

```bash
hermes config set model.model anthropic/claude-sonnet-4    # default profile
coder config set model.model openai/gpt-5                  # named profile
```

`.env` や `config.yaml` を書き換えたら、対象のゲートウェイを再起動します。

```bash
coder gateway restart
# or, for everything:
hermes-gateways restart
```

## 端末をスリープさせない {#keeping-the-host-awake}

ゲートウェイのプロセスは一日中動き続けられますが、OS のほうは何もしていないと判断すれば
スリープしようとします。やり方は2つあります。

### macOS — `caffeinate` {#macos-caffeinate}

`caffeinate` は macOS に最初から入っていて、動いているあいだスリープを止めます。導入作業は要りません。

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

| オプション   | はたらき                                            |
| ------ | ------------------------------------------------- |
| `-d`   | ディスプレイのスリープを止める                               |
| `-i`   | 無操作によるシステムのスリープを止める（既定）                 |
| `-m`   | ディスクのスリープを止める                                |
| `-s`   | システムのスリープを止める（電源につないだ Mac のみ）         |
| `-u`   | 操作があったことにする（画面ロックを防ぐ）     |
| `-t N` | `N` 秒後に自動で終了する                       |
| `-w P` | PID が `P` のプロセスが終わったら終了する                           |

:::warning ふたを閉じれば Mac はやはりスリープする
`caffeinate` は、MacBook のふたを閉じたときにハードウェア側で起きるスリープまでは止められません。
ふたを閉じたまま動かしたい場合は、省エネルギー / バッテリーの設定を変えるか、
別のツールを使ってください。
:::

### Linux — `systemd-inhibit` か `loginctl` {#linux-systemd-inhibit-or-loginctl}

```bash
# Inhibit suspend while a command runs
systemd-inhibit --what=idle:sleep --who=hermes --why="gateways running" \
  sleep infinity &

# Allow user services to keep running after logout (recommended)
sudo loginctl enable-linger "$USER"
```

lingering を有効にすると、systemd のユーザーユニット（`hermes-gateway-<profile>.service`
を含む）が SSH の切断や再起動をまたいで動き続けます。

## トークン衝突の安全装置 {#token-conflict-safety}

プロファイルはそれぞれ、プラットフォームごとに固有のボットトークンを使う必要があります。
2つのプロファイルが Telegram、Discord、Slack、WhatsApp、Signal のトークンを共有していると、
2つ目のゲートウェイは、ぶつかっているプロファイル名を挙げたエラーを出して起動しません。

確かめるには、こうします。

```bash
grep -H 'TELEGRAM_BOT_TOKEN\|DISCORD_BOT_TOKEN' \
     ~/.hermes/.env ~/.hermes/profiles/*/.env
```

## コードを更新する {#updating-the-code}

`hermes update` は最新のコードを一度取ってきて、新しく同梱されたスキルを
すべてのプロファイルへ反映します。

```bash
hermes update
hermes-gateways restart
```

自分で手を入れたスキルが上書きされることはありません。

## 困ったときは {#troubleshooting}

### 「Could not find service in domain for user gui: 501」と出る {#could-not-find-service-in-domain-for-user-gui-501}

`hermes gateway stop` のあとに `hermes gateway start` を実行した場合です。CLI の
`stop` は `launchctl unload` を丸ごと行うため、サービスが launchd の登録から消えます。
CLI は `start` のときにこのエラーだけを拾って、自動で plist を読み込み直します（`↻ launchd job was unloaded; reloading
service definition` と表示されます）。そのままサービスは起動します。直すことは何も
ありません。

### クラッシュ後に PID が残っている {#stale-pid-after-a-crash}

あるプロファイルのゲートウェイが `not running` と表示されるのに、プロセスがまだ生きている場合は、
こうします。

```bash
ps -ef | grep "hermes_cli.*-p <profile>"
cat ~/.hermes/profiles/<profile>/gateway.pid
kill -TERM <pid>          # graceful
kill -KILL <pid>          # if that fails after a few seconds
<profile> gateway start
```

### サービスを1つだけ強制的にリセットする {#forcing-a-hard-reset-of-one-service}

```bash
# macOS
launchctl unload ~/Library/LaunchAgents/ai.hermes.gateway-<profile>.plist
launchctl load   ~/Library/LaunchAgents/ai.hermes.gateway-<profile>.plist

# Linux
systemctl --user restart hermes-gateway-<profile>.service
```

### 状態を診断する {#health-check}

```bash
hermes doctor                  # default profile
hermes -p <profile> doctor     # one profile
```
