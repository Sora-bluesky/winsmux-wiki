---
title: "ゲートウェイをいくつも同時に動かす"
description: ""
upstream_path: user-guide/multi-profile-gateways.md
upstream_blob: a3b45cb85de0975fb2473b802414aee43bf08dea
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/multi-profile-gateways
---

# ゲートウェイをいくつも同時に動かす {#running-many-gateways-at-once}

複数の[プロファイル](/hermes/docs/user-guide/profiles/)を、1 台の端末のなかで管理下の
サービスとして動かします。プロファイルごとにボットトークンもセッションも記憶も
別々です。このページでは運用まわり、つまりまとめて起動する方法、プロファイルを
またいでログを見る方法、ホストを眠らせない方法、そして launchd や systemd に
ありがちな引っかかりからの復帰を扱います。

Hermes のエージェントを 1 つしか動かさないなら、このページは要りません。基本は
[プロファイル](/hermes/docs/user-guide/profiles/)を見てください。また、動かす先が
*別々の* 端末にあり、1 つのデスクトップアプリからまとめてつなぎたい場合は
[デスクトップから複数の Hermes につなぐ](/hermes/docs/user-guide/multi-connection-desktop/)を
見てください。

## こんなときに使う {#when-to-use-this}

Hermes のエージェントを 2 つ以上、同時に立ち上げておきたいときの構成です。
よくある理由は次のようなものです。

- 秘書役を 1 つの Telegram のボットに、コーディング役を別のボットに置く
- 家族ひとりにつき 1 つ、あるいは Slack のワークスペースごとに 1 つ
- 同じ設定の試用版と本番版
- 調べ役 + 書き役 + cron で動くボット — それぞれ記憶とスキルを切り離して持つ

プロファイルにはもともと、プラットフォームごとの LaunchAgent
（`ai.hermes.gateway-<name>.plist`）か systemd のユーザーサービス
（`hermes-gateway-<name>.service`）が 1 つずつ付きます。この案内はそれらを
まとめて扱うための型を足すものです。

## すぐ試す {#quick-start}

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

これだけです。独立した 3 つのエージェントがそれぞれ自分のプロセスで動き、
落ちたときとログインしたときに自動で立ち上がります。

## もうひとつの形: 全プロファイルを 1 つのゲートウェイで（多重化） {#alternative-one-gateway-for-all-profiles-multiplexing}

ここまでの形は **プロファイル 1 つにつきプロセス 1 つ** です。これが既定で、
たいていの構成ではこれが正解です。ただしプロファイルが多いホストや、
プロファイルごとにプロセスを立てるのが運用上重たいコンテナ環境では、
代わりに **多重化するゲートウェイを 1 つだけ** 動かせます。既定プロファイルの
ゲートウェイが唯一の受け口になり、その端末上の *すべての* プロファイル宛ての
メッセージをさばきます。

これは **自分で選んで有効にするもの** で、**既定では無効** です。無効の間は
このページの内容は何も変わりません。以下の挙動はすべて効きません。

### 多重化が向く場面 {#when-to-prefer-multiplexing}

- コンテナや VPS の環境で、管理単位が N 個、ポートが N 個、PID ファイルが N 個に
  なるのが負担なとき。
- 通信量の少ないプロファイルが多数あり、1 つずつプロセスを立てるほどではないとき。
- 起動・監視・再起動の対象を 1 つにまとめたいとき。

プロファイル同士をプロセスの水準できっちり切り離したいとき（メモリの使用量が別、
落ちる範囲が別、ほかに触れずに 1 つだけ再起動できる）は、プロファイルごとに
1 プロセスのままにしてください。

### 有効にする手順 {#how-to-opt-in}

**既定プロファイル** にフラグを立て（多重化の親はここです）、そのゲートウェイを
再起動します。

```bash
hermes config set gateway.multiplex_profiles true
hermes gateway restart
```

既定プロファイルの `~/.hermes/config.yaml` に書いても同じです。

```yaml
gateway:
  multiplex_profiles: true
```

（手軽さのため、最上位に `multiplex_profiles: true` と書く形も受け付けます。）
次の起動で、既定のゲートウェイはすべてのプロファイルを数え上げ、各プロファイルで
有効になっているプラットフォームをそのプロファイル自身の認証情報で立ち上げ、
届いたメッセージを持ち主のプロファイルへ振り分けます。1 回のやり取りごとに、
振り分け先のプロファイルの設定・スキル・記憶・SOUL、**そしてプロバイダーの鍵** が
解決されます。認証情報がプロファイル間で共有されることはありません。

従属側のプロファイルで `hermes gateway start` を実行する必要は **ありません**。
既定のゲートウェイがそれらを受け持ちます。下にある取り決めの変更点を見てください。

### 多重化を有効にすると変わること {#what-changes-when-multiplexing-is-on}

フラグを立てると、いくつかの挙動が変わります。フラグを下ろせば、どれもその場で
元に戻ります。

#### 1. 従属側のプロファイルは自前のゲートウェイを起動してはいけない {#1-secondary-profiles-must-not-start-their-own-gateway}

多重化が動いている間、プロファイルを指定した `hermes gateway run`、`start`、
`install`、`restart` は **明確なエラー**（終了コード 78）になり、多重化のほうを
使うよう案内されます。

```
The default gateway is running as a profile multiplexer and already serves
profile 'coder'. ...
```

この拒否はサービス管理のしくみに触れる前に CLI のなかで起きるので、受け持たれて
いるプロファイルが systemd の失敗した単位を抱え込んだり、launchd の再起動の輪に
はまったりすることはありません。coder が自前のゲートウェイを持たないときは、
`hermes -p coder gateway stop` も同じように断られます（終了コード 78）。止める対象は
多重化のプロセスしかなく、それを止めるのは既定プロファイルでの
`hermes gateway stop` で、受け持っているすべてのプロファイルがまとめて止まります。
ダッシュボードとデスクトップアプリも CLI に従います。受け持たれているプロファイルでは、
ゲートウェイの「Start」と「Stop」は同じ説明を添えて `409` を返し（System のページに
その場の知らせとして表示されます）、「Restart」は失敗するしかない
`-p coder gateway restart` を立ち上げるのではなく、多重化のプロセス（実際にその
プロファイルを受け持っているプロセス）を再起動します。この再起動はその端末のすべての
ボットをつなぎ直すので、どちらのアプリも先に *"Restart the shared gateway? All bots on this device reconnect: default,
coder, research"* と確認し（並ぶのは動いているゲートウェイの `served_profiles` です）、
終わると *"Shared gateway restarted (3 bots)"* と知らせます。単独のプロファイルは
これまでどおりの再起動のままです。`/api/status?profile=coder` も同じ一覧を
`gateway_shared_with` として持ちます（単独のゲートウェイなら null）。
「受け持っている」かどうかは動いている
ゲートウェイ自身の記録（既定のホームの `gateway_state.json` にある
`served_profiles`）から読むので、多重化を既定プロファイルの環境変数
`GATEWAY_MULTIPLEX_PROFILES` だけで有効にした場合や、ゲートウェイの起動後に
プロファイルが足された場合でも正しいままです。

多重化は唯一の受け口です。2 つめのプロファイルのゲートウェイが立つと、その
プロファイルのプラットフォームを二重に掴んでしまいます。`--force`（`run`、
`start`、`install`、`restart` が受け付けます）は、そのプロファイルだけあえて別の
プロセスにしたいときにだけ使ってください（多重化が動いている間は勧めません）。
そのため、このページの前のほうにあるプロファイル横断の起動停止をまとめる
スクリプトは、多重化のときは **使いません**。管理するのは既定のゲートウェイだけです。

#### 2. HTTP で受けるプラットフォームは `/p/<profile>/` の接頭辞で届く {#2-http-inbound-platforms-are-reached-via-a-pprofile-url-prefix}

従属側のプロファイル宛ての HTTP で受ける通信は、2 つめのポート **ではなく**、
既定プロファイルの **1 つの** 待ち受けにプロファイルの接頭辞を付けて届きます。

```
# default profile
POST http://host:8644/webhooks/<route>
# the "coder" profile, same listener
POST http://host:8644/p/coder/webhooks/<route>
```

接頭辞に知らないプロファイルや未設定のプロファイルを書くと `404` が返ります。
共有の待ち受けは既定プロファイルの `api_server` のポート（API サーバーが有効で
なければ `webhook` のポート）で、プロファイルの接頭辞付きの宛先を 3 種類受け持ちます。

- **`api_server` と `webhook` は映し出されるだけで**、二重には立ちません。
  `/p/coder/v1/...` と `/p/coder/webhooks/<route>` には、既定プロファイル自身の
  アダプタが coder の範囲で応えます。そのため従属側は `api_server` や `webhook` を
  自分で有効にしては **いけません**（ダッシュボードは `409` で断ります。従属側の
  `.env` にある `API_SERVER_KEY` や `WEBHOOK_ENABLED` は、待ち受けを立てずに
  認証情報だけを結び付けます）。
- **ほかの受信ポート型のプラットフォームは、すべて共有の待ち受けの形で動きます。**
  Twilio SMS、LINE、Teams、BlueBubbles、Microsoft Graph、WhatsApp Cloud、WeCom の
  呼び返し、飛書の Webhook の形を設定した従属側は、ポートを持たずに作られた **自分の**
  アダプタを持ちます。既定の待ち受けは
  `/p/<profile>/<the adapter's usual path>` をそのアダプタへ渡します。
  [多重化のもとでの受信ポート型のプラットフォーム](#inbound-port-platforms-under-the-multiplexer)を見てください。

認証は URL に書かれたプロファイルに従います。接頭辞のない宛先は、これまでどおり
既定の待ち受けの認証情報を使います。

- `/p/coder/...` への API サーバーの要求では、`~/.hermes/profiles/coder/.env` の
  `API_SERVER_KEY` を使う必要があります。既定の待ち受けの鍵は拒否されます。
  多重化のもとでは、この鍵は接頭辞の認証にだけ効きます。従属側で 2 つめの
  `api_server` の待ち受けが立つわけではないので、従属側の `config.yaml` に
  `platforms.api_server.enabled: false` を書いて押さえておく必要はありません。
- `coder` 宛ての Webhook の経路は、既定プロファイルの `config.yaml` で、経路ごとの
  `secret` の隣に `profile: coder` と書く必要があります。その合言葉は
  `/p/coder/webhooks/<route>` でだけ通り、ほかのプロファイルの接頭辞では拒否されます。
- `profile` の書かれていない Webhook の経路は既定プロファイルの経路のままで、
  プロファイル名付きの接頭辞からは届きません。動的な登録も同じように結び付きます。
  `hermes webhook subscribe <name> --route-profile coder` を実行すると、既定のゲートウェイの
  `webhook_subscriptions.json` に `profile: coder` が書き込まれ、`/p/coder/webhooks/<name>` の
  URL が表示されます（結び付きは `hermes webhook ls` で確かめられます）。全体オプションの
  `-p coder` ではなく `--route-profile` を使ってください。`-p` を使うと、登録は coder 自身の
  登録ファイルに書き込まれますが、既定のゲートウェイの Webhook アダプタはそのファイルを読みません。
- 送り返しも同じ結び付きに従います。`profile: coder` の経路の返信（または
  `deliver_only` のメッセージ）は、`deliver` のプラットフォームについて **coder の**
  アダプタから出ていき、`deliver_extra.chat_id` が未設定なら **coder の** 定位置の
  チャンネルへ落ち、`github_comment` での送付は `profiles/coder/.env` の
  `GH_TOKEN` / `GITHUB_TOKEN` で `gh` を走らせます。coder にそのプラットフォームの
  アダプタが無ければ、ほかのプロファイルのボットとして投稿するのではなく、送付が
  失敗します（502）。同じように、既定の経路が従属側でだけ有効なプラットフォームを
  借りることもありません。
- `/p/coder/api/platforms/<platform>/events` への呼び返しは coder のアダプタが検証し、
  さばきます。coder にアダプタが無ければ、その呼び返しは 503 になります。

プロファイル名付きの API の要求は、宛先のプロファイルに
`API_SERVER_KEY` が無ければ、通さない側に倒れます。安全にかかわる設定の誤りは、
これまでどおり致命的です。たとえば、方針が `open` の
プラットフォームに `GATEWAY_ALLOW_ALL_USERS` もプラットフォーム固有の全員許可の
指定も無い場合は、危うい設定のプロファイルを黙って落とすのではなく、ゲートウェイの
起動そのものを中止します。

#### 多重化のもとでの受信ポート型のプラットフォーム {#inbound-port-platforms-under-the-multiplexer}

単独の `hermes -p coder gateway run` は、coder の Twilio、LINE、Teams などの Webhook の
サーバーをそれぞれ自分のポートで立てます。多重化のもとでも、それらのアダプタは
coder のものです。`profiles/coder/.env` の同じ認証情報、同じ `config.yaml` を使い、
返信も coder のチャンネルから出ますが、ポートは **1 つも** 掴みません。
既定プロファイルの共有の待ち受けが `/p/coder/<path>` をそれらへ渡します。
`<path>` は、そのアダプタが単独で受け持つときとまったく同じ宛先です。要求は
**coder の** アダプタが **coder の** 合言葉（Twilio の認証トークン、LINE のチャンネルの
シークレット、Teams のアプリの認証情報、BlueBubbles のパスワードなど）で検証し、
coder の実行時の範囲で動きます。既定プロファイル自身の `/path` には影響がなく、
その宛先のアダプタを持たないプロファイルには `404` が返ります。ほかのプロファイルの
ボットに届くことはありません。

| プラットフォーム | 共有の待ち受けでの従属側プロファイルの呼び返し URL | 名指しされたプロファイルの何で検証するか |
|---|---|---|
| Twilio SMS（`sms`） | `https://<host>/p/<profile>/webhooks/twilio` | `TWILIO_AUTH_TOKEN` の署名（`SMS_WEBHOOK_URL` はこの URL にする） |
| LINE（`line`） | `https://<host>/p/<profile>/line/webhook`（メディア: `/p/<profile>/line/media/...`） | `LINE_CHANNEL_SECRET` |
| Microsoft Teams（`teams`） | `https://<host>/p/<profile>/api/messages` | `TEAMS_CLIENT_ID` の Bot Framework のトークン |
| BlueBubbles（`bluebubbles`） | `http://<host>/p/<profile>/bluebubbles-webhook`（サーバーへ自動で登録される） | `BLUEBUBBLES_PASSWORD` |
| Microsoft Graph（`msgraph_webhook`） | `https://<host>/p/<profile>/msgraph/webhook` | `extra.client_state` |
| WhatsApp Cloud（`whatsapp_cloud`） | `https://<host>/p/<profile>/whatsapp/webhook` | `WHATSAPP_CLOUD_APP_SECRET` / 検証トークン |
| WeCom の呼び返し（`wecom_callback`） | `https://<host>/p/<profile>/wecom/callback` | アプリの呼び返しのトークン / AES の鍵 |
| 飛書の Webhook の形（`feishu`） | `https://<host>/p/<profile>/feishu/webhook` | `FEISHU_VERIFICATION_TOKEN` / `FEISHU_ENCRYPT_KEY` |

`<host>` は、既定プロファイルの待ち受けの前に置いた公開のホスト名（トンネルや
リバースプロキシ）です。プロファイルの設定で `webhook_path` を独自に書くと、
`/p/<profile>` のあとの宛先もそれに合わせて変わります。ゲートウェイは起動時に
正確な URL を記録します。

```
[sms] profile 'coder' is served on the default profile's shared listener:
http://127.0.0.1:8642/p/coder/webhooks/twilio (point the vendor's callback URL at this path ...)
```

状態を見せるどの画面も同じ URL を繰り返すので、提供元の管理画面に何を貼ればよいかが
わかります。

```
$ hermes -p coder gateway status
✓ Gateway is running via the default-profile multiplexer
  Manage it from the default profile: hermes gateway status

Inbound callback URLs on the shared listener:
  line: http://127.0.0.1:8642/p/coder/line/webhook
  sms: http://127.0.0.1:8642/p/coder/webhooks/twilio
```

既定プロファイルでの `hermes gateway status` と `hermes status` は、受け持っている
プロファイルごとに同じ URL を並べます。ダッシュボードの Channels のページと
デスクトップの Messaging のページも、そのプロファイルを見ているときは各プラット
フォームの `ingress_url` として表示します。既定プロファイル自身の `api_server` と
`webhook` も、受け持たれているプロファイルについては同じように報告されます。
`ingress_url` が
`http://127.0.0.1:8642/p/coder/v1`（後者なら `.../p/coder/webhooks/<route>`）の
**接続済み** として出ます。そのプロファイルはそれらのアダプタを自分では持たず、
`/p/coder/` の接頭辞で応えているのは既定の待ち受けだからです。従属側の `.env` に
プロファイルごとの `SMS_WEBHOOK_PORT`、`LINE_PORT`、`TEAMS_PORT` などを書いても、
多重化のもとでは無視されます（何も掴まないからです）。そのプロファイルが自前の
ゲートウェイを単独で動かした時点で、また効くようになります。

#### 3. 認証情報ごとのプラットフォームは、プロファイルごとにトークンが要る {#3-per-credential-platforms-still-need-their-own-token-per-profile}

問い合わせ型・接続型のプラットフォーム（Telegram、Discord、Slack、Matrix、Signal
など）は多重化しても問題なく動きますが、それを有効にするプロファイルはそれぞれ
**自分の** ボットトークンを用意しなければなりません。同じトークンを 2 つの
プロファイルが同時に使うことはできないからです。2 つのプロファイルが同じ
`(platform, token)` を設定すると、ゲートウェイは両方のプロファイル名を挙げた
エラーを記録し、**重複したほう** のアダプタを止め置きます（実行中の状態では
`fatal / duplicate_credential` と表示されます）。先に名乗ったほうとほかの
プロファイルは動き続け、ゲートウェイ自体は終了しません。既定プロファイルの
アダプタが先につないで認証情報を取るので、止め置かれるのは必ず従属側です
（[トークンのぶつかりを防ぐしくみ](#token-conflict-safety)も見てください。決まりは
変わっておらず、1 つのプロセスのなかで効くようになっただけです）。

#### 4. セッションの鍵はプロファイルごとに名前空間が分かれる {#4-session-keys-are-namespaced-by-profile}

各プロファイルのセッションは `agent:<profile>:…` という名前空間の下に置かれるので、
同じプラットフォームの同じチャットにいる 2 つのプロファイルが、共有の保管庫で
ぶつかることはありません。**既定** プロファイルは従来の `agent:main:…` を 1 バイトも
変えずに保つので、既存の既定プロファイルのセッションには影響がありません。移行も
不要で、行き場を失う履歴もありません。鍵を読み戻すゲートウェイの経路はすべて
—— 再起動後の委任の完了通知、停止のお知らせ、利用者ごとのスレッドで兄弟の実行を
`/stop` すること、`/undo`、QQ の承認ボタン —— `agent:<profile>:…` の形も受け付けるので、
従属側のプロファイルも既定と同じように振る舞います。既定の名前空間とぶつかる
唯一のプロファイル名、つまり文字どおり `main` という名前のプロファイルは、`agent:main~:…` を
鍵にするので、自分のセッションと自分の `profiles/main/state.db` を保ちます。

各プロファイルの行は **それぞれの** `state.db` に入ります。名前付きプロファイルは
`profiles/<name>/state.db`、既定プロファイルは起動時のホームの下です。ほかの
プロファイルに振り分けられたやり取りや裏で動く定期処理のなかで書き込みが起きた
ときも同じです。デスクトップや TUI の裏側が持つ保管庫も、起動したホームに
固定されます。Bot Chat の脇役のエージェント（`prompt.background`）は、親の会話の
隣に保存されます。

#### 5. PID と錠は 1 つ、状態の見え方も 1 つ {#5-one-pidlock-and-one-status-surface}

プロセスの水準での PID と錠は 1 つだけです（既定のホームの下にある、多重化の
プロセスのもの）。既定プロファイルでの `hermes status` は多重化のプロセスを報告し、
受け持っているプロファイルを並べます（`Serves: coder, research`）。
`hermes -p coder status`、`hermes -p coder gateway status`、`hermes -p coder cron status`
はいずれも「停止中」ではなく「既定プロファイルの多重化を通して動作中」と報告し、
ダッシュボードの `/api/status?profile=coder` と Channels のページは、多重化のプロセスを
coder の動いているゲートウェイとして報告します（プラットフォームには coder 自身の
アダプタが並びます）。
唯一の `gateway_state.json` は既定のホームの下にあり、従属側のアダプタはそこに
`served_profiles` と並んで `<profile>:<platform>` の項目として現れます。従属側の
プロファイルのホームには何も書かれません。

#### 変わら **ない** こと {#what-does-not-change}

プロファイルごとの `.env` による認証情報の切り離しはそのままで、むしろ厳しく
なります。プロファイルの鍵はそれぞれの範囲から解決され、共有の環境にまとめて
流し込まれることはありません。MCP サーバーやかんばんの作業役のような子プロセスが
見るのは、自分のプロファイルの秘密情報だけです。外部の秘密情報の供給元
（1Password、Bitwarden など）から入る認証情報も同様で、プロファイル B のために
起動した stdio の MCP サーバーは、その名前について B の値を受け取るか、B に無ければ
何も受け取りません。既定プロファイルの値が渡ることはありません。MCP サーバーは
**プロファイルごとに** つながります。2 つのプロファイルがどちらも `github` という
名前のサーバーを自分のトークンで持っていれば接続は 2 本になり、それぞれ自分の
道具しか見えません。`mcp_servers` の項目が同一（経路 *も* 認証情報も同じ。mTLS の
`client_cert`/`client_key` も含みます）のプロファイル同士は 1 本の接続を分け合い、持ち主が
`/reload-mcp` すると、相乗りしている側は読み直さずに道具が登録し直されます。`auth: oauth`
のサーバーは、プロファイルをまたいで分け合うことがありません。プロファイルごとに自分の
`mcp-tokens/` の下へ自分のトークンを持ち、自分の接続を開きます。信頼の方針はプロファイルごとのままです。
`trust: full` のプロファイルの接続を相乗りしている `trust: untrusted` のプロファイルは、書き込みのできる
呼び出しのたびに引き続き確認を求められ、`supports_parallel_tool_calls` もそれを設定したプロファイルにだけ効きます。端末まわりの設定（`terminal.backend`、
`terminal.cwd`、`terminal.docker_volumes`、`terminal.docker_shared_container_key`、
SSH の接続先など）も、振り分けられたやり取りごとにプロファイル単位で解決されます。
端末の設定を書いていないプロファイルには文書どおりの既定が使われ、起動元の
プロファイルの値が使われることはありません。`config.yaml` や `.env` を読み取れない
プロファイルは、ほかのプロファイルの隔離方針で動かすのではなく、端末での実行を
断られます。メディアの送付にかかる認証情報の守り（`MEDIA:` の添付の裏にある拒否
一覧 —— `.env`、`auth.json`、`config.yaml`、`state.db`、セッションの記録、OAuth の
トークンの保管庫）は `profiles/` の下のすべてのプロファイルを覆うので、どの
プロファイルのやり取りでも、ほかのプロファイルの秘密情報やチャットの履歴を返信に
添えることはできません。権限もプロファイルごとです。`GATEWAY_ALLOW_ALL_USERS`、
`GATEWAY_ALLOWED_USERS`、そしてプラットフォームごとの許可一覧や全員許可の指定は、
持ち主のプロファイルの `.env` から読まれます。既定プロファイルが全員に開いても
従属側のボットが開くことはなく、従属側が自分の `.env` だけで開いた指定はきちんと
効きます。プロファイルの `config.yaml` に書いたボットごとの挙動（`require_mention`、
`mention_patterns`、`allow_bots`、`reactions`、`auto_thread`、`dm_policy`、
`ignored_channels`、Matrix の `session_scope` など）も同じです。従属側の YAML が
共有のプロセスの環境に入り込むことはないので、それが既定プロファイルの方針になる
ことはありませんし、既定プロファイルの YAML が従属側のボットを支配することも
ありません。`terminal.env_passthrough` の許可一覧、元宝が自動で決める定位置の
チャンネル、各プロファイルの `config.yaml` を守る書き込みの制限も、プロファイル
ごとに解決されます。かんばん、プロファイル単位のスキル・記憶・SOUL、モデルの
振り分けは、どれもゲートウェイを分けたときとまったく同じようにプロファイル単位で
振る舞います。

外向きの名乗りもプロファイルごとです。プロファイル `P` のために動いている
やり取りが `send_message` の道具（送信、反応、メディア）を呼べば、投稿は `P` 自身の
ボットから出ます。`P` のセッション宛ての「Gateway shutting down/restarted」や
`/update` のお知らせ、`P` のチャットから仕掛けた `/loop` の呼び出し、`P` の Discord の
ボットで権限のないスラッシュコマンドが使われたときの運用者への知らせ（`P` の
定位置のチャンネルへ）も同じです。`P` にそのプラットフォームのボットがつながって
いなければ、送信ははっきりしたエラーで失敗します。既定プロファイルのボットに
落ちることはありません。

道具と記憶の供給元の認証情報も同じ決まりに従います。外部の OCR
（`FIRECRAWL_API_KEY`）、Modal や Browser Use のクラウドの入口、mem0 OSS の OpenAI の
鍵、xAI の動画、そして記憶の供給元ごとの識別情報（`MEM0_USER_ID`、
`SUPERMEMORY_CONTAINER_TAG`、`RETAINDB_PROJECT`、`OPENVIKING_ACCOUNT/USER`、
`HINDSIGHT_BANK_ID`、`HERMES_HONCHO_HOST`）は、振り分け先のプロファイルの `.env` から
読まれます。ですから従属側のプロファイルの記憶は **そのプロファイルの**
アカウント・保管先・プロジェクト（または供給元のプロファイルごとの既定）に入り、
既定プロファイルのものに混じることはありません。独自のエンドポイントも鍵と一緒に
動きます —— `OPENAI_BASE_URL`、`XAI_BASE_URL`、`NOUS_INFERENCE_BASE_URL`、
`GATEWAY_PROXY_URL`、Firecrawl や Browserbase や RetainDB や Supermemory や Honcho や
Hindsight の URL —— なので、あるプロファイルの鍵がほかのプロファイルの中継役や
自前のサーバーに送られることはありません。`WEIXIN_HOME_CHANNEL`、
`HERMES_LANGUAGE` と `display.language`、`hooks.outbound[].secret_env` も同じく
プロファイルごとで、追い出された従属側のセッションの終わりに走る記憶の抽出も、
そのプロファイルの範囲で動きます。

やり取りごとの実行時の設定も、振り分け先のプロファイルに従います。
`agent.max_turns`、`fallback_providers`、`file_read_max_chars`、`tool_output.*`、
`browser.*` の待ち時間、`timezone`（`execute_code` の隔離環境に渡す `TZ` を含む）、
メディアの送付の方針（`gateway.strict`、`media_delivery_allow_dirs`、
`trust_recent_files*`）、補助的な呼び出しに使う Nous の `auth.json` は、すべてその
やり取りを受け持つプロファイルから読まれます。ゲートウェイを起動したときの
プロファイルから読まれることはありません。プロファイルごとの状態のファイル
（`processes.json`、`checkpoints/`、隔離環境の控えの保管庫、飛書のコメントの
規則と紐付け）とゲートウェイのフックも同じです。フックは各プロファイルの
`hooks/` ディレクトリが個別に読み込まれ、そのプロファイルの出来事にだけ反応します。
シェルのフックは振り分け先のプロファイルの `HERMES_HOME` で動き、環境に既定
プロファイルの秘密情報は入りません。標準入力で渡される中身には、どのプロファイルが
発火させたかを示す `profile` の欄が入ります。

#### プロファイルごとに切り離されるもの {#what-is-isolated-per-profile}

多重化されたやり取りが **自分の** プロファイルから解決し、既定やほかのプロファイルと
決して共有しないものの早見表です。

| 対象 | どこから解決するか | そのプロファイルに無いときの振る舞い |
|---|---|---|
| プロバイダーの鍵、ボットトークン、`config.yaml` の `${VAR}` 参照 | そのプロファイル自身の `.env`（自分の秘密情報の範囲） | 未解決、またはアダプタ無し。既定プロファイルの値が使われることはない |
| 権限（`GATEWAY_ALLOW_ALL_USERS`、`GATEWAY_ALLOWED_USERS`、プラットフォームごとの許可一覧と全員許可の指定） | 持ち主のプロファイルの `.env` と `config.yaml` | 閉じたまま。既定プロファイルで開いても従属側のボットは開かない |
| HTTP の宛先（`/p/<profile>/api/...`、`/p/<profile>/webhooks/...`、プラットフォームの出来事の呼び返し） | 名指しされたプロファイルの `API_SERVER_KEY`、`profile:` で結び付けた Webhook の経路、そのプロファイル自身のアダプタ | `401` か `404`。アダプタが無いままの送付は `502` か `503` で、ほかのプロファイルのボットは使われない |
| 受信ポート型のプラットフォーム（`/p/<profile>/webhooks/twilio`、`/p/<profile>/line/webhook`、`/p/<profile>/api/messages` など） | 名指しされたプロファイル自身のアダプタとその合言葉（Twilio の認証トークン、LINE のチャンネルのシークレット、Teams のアプリ、BlueBubbles のパスワードなど）。返信もそのアダプタから出る | 合言葉が違えば `401` か `403`、そのアダプタを持たないプロファイルなら `404`。既定プロファイルのアダプタが使われることはない |
| アダプタの設定（`*_REQUIRE_MENTION`、`*_REACTIONS`、`*_ALLOW_BOTS`、`*_PROXY`、Discord の `allow_mentions`、Matrix の `allowed_users` / `ignore_user_patterns`、Webhook のホスト・ポート・URL、Matrix のスレッド・セッション・E2EE の方針、Discord の遡り取得と添付の上限、Buzz の返信の形、A2A のエージェントカードと公開 URL、WhatsApp のブリッジの方針、Yuanbao のホームチャンネル） | 持ち主のプロファイル。明示した `.env` の値 → そのプロファイルの `config.yaml` → アダプタの既定、の順 | そのアダプタの文書どおりの既定。既定プロファイルの設定が使われることはない。プロファイルが 1 つだけの環境では、各プラットフォームのページに書かれているとおり、環境変数が YAML より勝つ決まりがそのまま保たれる |
| `MEDIA:` の添付の拒否一覧 | `profiles/` の下のすべてのホームと既定のホーム（確認のたびに数え上げる） | どのやり取りも、ほかのプロファイルの `.env`、`auth.json`、`state.db`、セッション、トークンの保管庫を添付できない |
| stdio の MCP の子プロセスの環境 | 安全な土台 + 秘密情報の供給元の名前についてそのプロファイルの範囲の値 + サーバー自身の `env:` | そのプロファイルに無い名前は子プロセスにも無い。既定プロファイルへ落ちることはない |
| 外向きの送信（`send_message`、停止・再起動・`/update` のお知らせ、`/loop` の呼び出し、`profile:` で結び付けた Webhook の送付、`github_comment` のトークン） | そのプロファイル自身のつながっているアダプタと `.env` | はっきり失敗する。既定プロファイルのボットから投稿されることはない |
| セッションの名前空間 | `agent:<profile>:…`（既定は `agent:main:…` のまま） | 同じチャットにいる 2 つのプロファイルが履歴を共有することはない |
| ログ | そのプロファイル自身のホームの下の `agent.log` / `errors.log` / `gateway.log` | — |
| 端末の隔離の設定（`terminal.*`、SSH の接続先） | そのプロファイルの `config.yaml` | 文書どおりの既定。読み取れない設定なら実行を断る |
| やり取りの作業ディレクトリ（`terminal.cwd` が未設定のとき） | 単独のゲートウェイと同じ決まり。ローカルの実行先なら `$HOME`、それ以外は隔離環境の既定 | 多重化のプロセスを起動したディレクトリになることはない |
| コマンドの承認（`command_allowlist`、「always」の選択） | そのプロファイル自身の `config.yaml` | 既定プロファイルの「always」が従属側のコマンドを前もって承認することはない。従属側の選択はその自分の設定に保存される |
| 隔離環境への認証情報ファイルのマウント（`terminal.credential_files`）、`security.redact_secrets`、`browser.*` のエンジンと画面表示の指定、`lsp.*`、補助のプロバイダーの健康状態の印、`logs/mcp-stderr.log` | そのプロファイル自身の `config.yaml` / `.env` | 文書どおりの既定。起動元のプロファイルでキャッシュした値が使われることはない |
| クラウド SDK の認証情報のクライアント（Bedrock の boto3 クライアントとモデルの探索、Azure Entra の認証情報）、認証情報で取ってくる一覧（DeepInfra、Copilot の文脈の上限、Nous の推論の上限、Ramp Router の effort、xAI / OpenRouter の画像モデル、独自エンドポイントの `/models`）、Camofox の VNC のアドレス、computer-use の補助の視覚の振り分け、スキルの同期の送り出し、リモートの実行先の確認の文面、学習した画像のトークンの費用、`display.skin`、ゲストの発行の待ち、バナーのスキル、元宝の「使用中」のアダプタ、Langfuse のクライアント | そのプロファイル自身の `.env` / `config.yaml` / `<home>/cache` | 文書どおりの既定。起動元のプロファイルでキャッシュした値やその認証情報が使われることはない |
| セッション検索のつまみ（`sessions.cjk_fts`、`sessions.search_slow_ms`） | そのプロファイルの `config.yaml` | 文書どおりの既定。既定プロファイルから橋渡しされた値が使われることはない |
| プラットフォームのプロキシ（`TELEGRAM_PROXY`、`DISCORD_PROXY`、`HTTPS_PROXY` など） | そのプロファイル自身の `.env` | 直接つなぐ。既定プロファイルのプロキシが使われることはない |
| デスクトップやダッシュボードの裏側での MCP の探索 | 受け持つプロファイルのホームごとに 1 回 | ほかのプロファイルがすでにエージェントを作ったあとで選ばれたプロファイルも、自分の `mcp_servers` を探索する |
| ダッシュボードの操作（デスクトップやダッシュボードが立ち上げる `hermes -p <name> …`） | そのプロファイルの `HERMES_HOME` に固定した、掃除済みの子プロセスの環境 | 子プロセスは自分の `.env` を読む。ダッシュボードのプロファイルのトークンやポートは引き継がれない |
| cron の `.env` での調整（`HERMES_CRON_TIMEOUT`、`HERMES_MODEL` の代替、`HERMES_CRON_MAX_PARALLEL`、事前入力のファイル）、作業役や Bot Chat の子プロセスの環境 | そのプロファイル自身の `.env`。子プロセスが既定プロファイルの `.env` の設定や橋渡しされた `TERMINAL_*` の方針を引き継ぐことはない | cron の既定、またはモデルの拒否。単独の `hermes -p <name> gateway run` とまったく同じ |
| プロファイルのタスクのかんばんの作業役と知らせ | 担当者の `.env` + `config.yaml`（道具一式の固定、端末の実行先、メディアの方針、表示の言語） | — |
| `/loop` の刻み、`background_process_notifications` の関門、`notice_delivery`、裏で動くプロセスのチェックポイントからの復帰 | 持ち主のプロファイルの `state.db` / `config.yaml` / `processes.json` | — |

設計上 **共有される** もの: プロセス本体、その PID と錠と `gateway_state.json`
（既定のホーム）、1 つの HTTP の待ち受け、そして `profile_routes` の表
（既定プロファイルで宣言します）。

### どのプロファイルが受け持たれるか {#which-profiles-are-served}

`gateway.multiplex_profiles: true` は、既定プロファイルに加えて `profiles/` の下にある
生きている名前付きプロファイルを **すべて** 受け持ちます。プロファイルごとに外す
一覧はありません。（以前の `gateway.multiplex_profile_allowlist` の設定は廃止されました。
設定の移行で `config.yaml` から取り除かれます。受け持たせたくないプロファイルは、
代わりに保管へ回すか削除します。`hermes profile delete <name>` を使うか、そのディレクトリを
`profiles/` の外へ移してください。）削除したプロファイルは墓標を残し、数え上げられる
ことはありません。ディレクトリの無くなったプロファイルが、受け持ちのやり取り、
cron の刻み役、ログの振り分けによって作り直されることもありません。

受け持ちの範囲は、`/p/<profile>/` の API と Webhook の接頭辞、実行中の状態表示、
プロファイルへの振り分けの対象、そしてプロセス内の cron の並べ役がどのプロファイルを
刻むかを決めます（デスクトップの裏側の刻み役も同じ範囲を数え上げ、動いている多重化か
そのプロファイル自前のゲートウェイがすでに受け持っているプロファイルからは手を引きます）。
`hermes -p <name> gateway run` として起動した多重化は、自分のプロファイルの cron の
保管庫も必ず刻みます。

受け持ちの範囲は **その場で追随** します。多重化が動いている間に作られたプロファイル
（`hermes profile create`、ダッシュボード、デスクトップ、TUI のどれで作っても）は、
すぐに受け持たれます。作る側が制御用のソケットで多重化に知らせ、多重化のほうも
念のため 30 秒ごとに `profiles/` を見直すからです。新しいプロファイルのアダプタは、
その `config.yaml` か `.env` にボットトークンが入った時点で作られます（作る側はたいてい、
先にプロファイルを作ってからトークンを足します）。既定プロファイルの
`gateway_state.json` の `served_profiles` が更新され、`hermes -p <name> gateway
status` は受け持ち中と報告します。再起動は要らず、ほかのプロファイルのアダプタや
進行中のやり取りにも影響しません。プロファイルを削除すると、同じようにそのアダプタが
止まり、振り分けからも外れます。`hermes profile rename` では、ディレクトリを動かす前に
古い名前を振り分けから外し、新しい名前を再起動なしで受け持ちます（古い名前に結び付いたままだった
アダプタや cron の刻み役が、その名前を生き返らせることはありません）。認証情報 1 つにつき問い合わせ役は 1 つ、という決まりは
変わりません。ほかのプロファイルのトークンを使い回して後から足されたプロファイルは、
`duplicate_credential` のエラーで止め置かれ、2 つめの問い合わせ役として動き出すことは
ありません。

### 共有のボットのチャットをプロファイルへ振り分ける（`profile_routes`） {#routing-shared-bot-chats-to-profiles-profileroutes}

多重化は **認証情報ごと**（プロファイル自身のボットトークン）か、**URL の接頭辞ごと**
（HTTP のプラットフォームなら `/p/<profile>/`）にプロファイルを選びます。複数の
コミュニティが **1 つの** ボットトークンを分け合う場合、たとえば 1 つの Discord の
ボットが多くのサーバーを受け持つ場合には、`gateway.profile_routes` で特定の
サーバー・チャンネル・スレッドを別々のプロファイルへ振り分けることもできます。

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

振り分けは細かいものから順に照合され（`thread_id` > `chat_id` > `guild_id`）、
書いた条件はすべて満たす必要があります（かつ、の関係です）。チャンネルを鍵にした
振り分けは、そのチャンネルを親に持つスレッドやフォーラムの投稿にも当たります。
どの振り分けにも当たらないメッセージは、既定の（いま動いている）プロファイルに
残ります。振り分けられたプロファイルには、上で説明したプロファイル単位の切り離しが
すべて効きます（設定、スキル、記憶、認証情報、セッションの名前空間）。振り分けは
Discord だけでなく、すべてのプラットフォームのアダプタで働きます。

振り分けは、`bot_profile: <profile>` でほかのボットを名指ししない限り、**既定
プロファイルのボット** が受け取ったメッセージにだけ効きます。Telegram の個別の
やり取りはどのボットでも同じ `chat_id`（利用者の id）になるので、これが無いと、
共有のボット向けに書いた `chat_id` の振り分けが、その利用者と従属側の専用ボットとの
個別のやり取りまで拾ってしまいます。従属側のプロファイル自身のボットに届いた
メッセージは、そのプロファイルに留まります。

```yaml
    # Pin one user's DM with team_b's OWN bot to a third profile
    - name: teamb-owner-dm
      platform: telegram
      bot_profile: team_b
      chat_id: "72719239"
      profile: ops-for-team-b
```

振り分けられたメッセージの権限は、常に **受け取ったボットのプロファイル**（その
トークンと許可一覧）で決まります。エージェントが手一杯のときに送られた追加の
メッセージや、`/topic` や `/stop` のようなやり取りの途中の確認も同じです。
振り分け先のプロファイル自身に許可一覧の写しは要りません。自分のボットを持たない
振り分け先のプロファイルも、ゲートウェイの再起動後は共有のボットを通して裏からの
知らせ（処理の完了、生存の合図、非同期の委任の結果）を受け取ります。

WhatsApp と WhatsApp Cloud では、`chat_id` の振り分けは利用者の識別の書き方をまたいで
当たります。素の電話番号（`15551234567`）、JID（`15551234567@s.whatsapp.net`）、
LID（`…@lid`）は、橋渡しがそれらを結び付けたあとは同じ人を指します（セッションの鍵や
アダプタの許可一覧がすでに使っているのと同じ正規化です）。`profile_routes` に電話番号を
書いておけば、WhatsApp が JID を届けても LID を届けても、受信した個別のやり取りは
当たります。LID の対応付けがまだ無いうちも、番号の書き方は JID には当たりますが
（末尾が取り除かれます）、知らない LID は解決できません。その受信は、対応付けが
できるまで既定プロファイルへ流れます。グループのチャット（`…@g.us`）は送り手の
識別ではないので、これまでどおり厳密に一致したときだけ当たります。Telegram の
数字の id は変わりません。

`profile_routes` には `gateway.multiplex_profiles: true` が要ります。多重化が無効なら
振り分けは無視されます。明示した振り分けに当たったものの、その宛先のプロファイルが
入っていない（または削除された）場合、ゲートウェイは
その受信を拒否し、振り分けと宛先を記録に残します。既定プロファイルで動かすことは
しません。どの振り分けにも当たらない通信は、これまでどおり既定プロファイルの
振る舞いのままです。

振り分けられたプロファイルが持つ cron の仕事も共有のボットから送られますが、送り先は、
有効な振り分けの `chat_id` か `thread_id` によってそのプロファイルに結び付いている
ものに限られます（`guild_id + chat_id` の振り分けは、そのチャンネルを
対象として認めます）。振り分けられたプロファイルの仕事が、振り分けのないチャットや
別のプロファイルに振り分けられたチャットを宛先にしている場合、共有のボットから
送られることはありません。サーバーだけを書いた振り分けは cron の宛先として認められない
ので、送り先のチャンネルについて `chat_id` の振り分けを足してください。このとき、
振り分けられたプロファイル側に `platforms.<platform>` のブロックは要りません。共有の
ボットの権限は、衛星側の設定ではなく振り分けから来るからです。

## すべてのゲートウェイをまとめて起動・停止・再起動する {#start-stop-or-restart-all-gateways-at-once}

CLI にはプロファイル 1 つ分の起動停止のコマンドが付いています。全プロファイルに
効かせたいときは、シェルの繰り返しで包みます。下の断片を
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

そのうえで、次のように使います。

```bash
hermes-gateways start      # start every configured profile
hermes-gateways stop       # stop every configured profile
hermes-gateways restart    # restart all
hermes-gateways status     # status across all
hermes-gateways list       # delegates to `hermes gateway list`
```

:::tip
`default` のプロファイルは `hermes gateway <action>`（`-p` なし）で指定します。
`hermes -p default gateway <action>` ではありません。上の包みはどちらの書き方も
面倒を見ます。
:::

## プロファイルを 1 つだけ操作する {#manage-one-profile}

プロファイルを作ると入る近道のコマンドは次のとおりです。

```bash
coder gateway run        # foreground (Ctrl-C to stop)
coder gateway start      # start the managed service
coder gateway stop       # stop the managed service
coder gateway restart    # restart
coder gateway status     # status
coder gateway install    # create the LaunchAgent / systemd unit
coder gateway uninstall  # remove the service file
```

これらは `hermes -p coder gateway <action>` と同じです。プロファイルの別名が
`PATH` に無いときや、スクリプトのなかで宛先を動的に変えたいときに役立ちます。

## サービスのファイル {#service-files}

プロファイルはそれぞれ固有の名前で自分のサービスを入れるので、ぶつかることは
ありません。

| プラットフォーム | 置き場所                                                              |
| -------- | ----------------------------------------------------------------- |
| macOS    | `~/Library/LaunchAgents/ai.hermes.gateway-<profile>.plist`        |
| Linux    | `~/.config/systemd/user/hermes-gateway-<profile>.service`         |

既定プロファイルは従来の名前のままです。`ai.hermes.gateway.plist` と
`hermes-gateway.service` です。

## ログを見る {#viewing-logs}

プロファイルはそれぞれ自分のログのファイルに書きます。

```bash
# Default profile
tail -f ~/.hermes/logs/gateway.log
tail -f ~/.hermes/logs/gateway.error.log

# Named profile
tail -f ~/.hermes/profiles/<name>/logs/gateway.log
tail -f ~/.hermes/profiles/<name>/logs/gateway.error.log
```

すべてのプロファイルのログを同時に流すには、次のようにします。

```bash
tail -f ~/.hermes/logs/gateway.log ~/.hermes/profiles/*/logs/gateway.log
```

CLI には構造化されたログの閲覧機能もあります。

```bash
hermes logs -f                  # follow default profile
hermes -p coder logs -f         # follow one profile
hermes logs --help              # filters, levels, JSON output
```

## 実際に何が動いているかを確かめる {#identify-whats-actually-running}

```bash
hermes profile list             # profiles + model + gateway state
hermes-gateways status          # full status across every profile
launchctl list | grep hermes    # macOS — PIDs and labels
systemctl --user list-units 'hermes-gateway-*'   # Linux — units
```

## 設定を編集する {#editing-configuration}

プロファイルは自分のディレクトリのなかに設定を持ちます。

```
~/.hermes/profiles/<name>/
├── .env              # API keys, bot tokens (chmod 600)
├── config.yaml       # model, provider, toolsets, gateway settings
└── SOUL.md           # personality / system prompt
```

既定プロファイルは `~/.hermes/` を直接使い、同じ 3 つのファイルを持ちます。

好きなエディタでも、CLI でも編集できます。

```bash
hermes config set model.model anthropic/claude-sonnet-4    # default profile
coder config set model.model openai/gpt-5                  # named profile
```

`.env` や `config.yaml` を編集したら、対象のゲートウェイを再起動してください。

```bash
coder gateway restart
# or, for everything:
hermes-gateways restart
```

## ホストを眠らせない {#keeping-the-host-awake}

ゲートウェイのプロセスは一日中動けますが、OS のほうは手すきになると眠ろうとします。
やり方は 2 つあります。

### macOS — `caffeinate` {#macos-caffeinate}

`caffeinate` は macOS に最初から入っていて、動いている間はスリープを止めます。
入れる作業は要りません。

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

| オプション   | 効果                                            |
| ------ | ------------------------------------------------- |
| `-d`   | 画面のスリープを止める                               |
| `-i`   | 手すきのときのシステムのスリープを止める（既定）                 |
| `-m`   | ディスクのスリープを止める                               |
| `-s`   | システムのスリープを止める（電源につないだ Mac のみ）         |
| `-u`   | 利用者の操作があるように見せる（画面のロックを防ぐ）     |
| `-t N` | `N` 秒後に自動で終了する                       |
| `-w P` | PID が `P` のプロセスが終わったら終了する                           |

:::warning ふたを閉じれば Mac は眠る
`caffeinate` は、MacBook のふたを閉じたときのハードウェア側のスリープまでは
止められません。ふたを閉じたまま動かしたい場合は、省エネルギーやバッテリーの
設定を変えるか、別のツールを使ってください。
:::

### Linux — `systemd-inhibit` か `loginctl` {#linux-systemd-inhibit-or-loginctl}

```bash
# Inhibit suspend while a command runs
systemd-inhibit --what=idle:sleep --who=hermes --why="gateways running" \
  sleep infinity &

# Allow user services to keep running after logout (recommended)
sudo loginctl enable-linger "$USER"
```

居残りを有効にすると、systemd のユーザー単位（`hermes-gateway-<profile>.service` を
含む）は SSH が切れても再起動をまたいでも動き続けます。

## トークンのぶつかりを防ぐしくみ {#token-conflict-safety}

プロファイルは、プラットフォームごとに固有のボットトークンを使わなければなりません。
2 つのプロファイルが Telegram、Discord、Slack、WhatsApp、Signal のトークンを
分け合っていると、2 つめのゲートウェイはぶつかっているプロファイル名を挙げた
エラーを出して起動を断ります。[多重化](#alternative-one-gateway-for-all-profiles-multiplexing)の
もとでは、同じ決まりが重複したプロファイルのアダプタだけを止め置き、共有の
ゲートウェイは動き続けます。

確かめるには、次のようにします。

```bash
grep -H 'TELEGRAM_BOT_TOKEN\|DISCORD_BOT_TOKEN' \
     ~/.hermes/.env ~/.hermes/profiles/*/.env
```

## プロファイルごとのゲートウェイから移行する {#migrating-from-per-profile-gateways}

いまプロファイルごとに自前のゲートウェイを動かしている（プロファイル 1 つにつき
systemd の単位か launchd のエージェントが 1 つ）なら、コマンド 1 つでそれらを多重化した
既定のゲートウェイ 1 つにまとめられ、別のコマンド 1 つで元に戻せます。プロファイルごとの
単独のゲートウェイも引き続き完全に使えます。これは選んで行う移行で、廃止ではありません。

```bash
hermes gateway migrate --multiplex --dry-run   # print the plan and any blockers; changes nothing
hermes gateway migrate --multiplex             # apply (asks for confirmation on a TTY; -y skips)
hermes gateway migrate --standalone            # roll back to per-profile gateways
```

### `hermes update` がすること {#what-hermes-update-does}

更新がうまくいったあと、プロファイルが 2 つ以上あり、少なくとも 1 つの従属側
プロファイルが自前のゲートウェイ（動いているプロセスか、入っているサービス）を持ち、
`gateway.multiplex_profiles` が無効なら、`hermes update` は同じ事前確認を走らせます。

- **妨げるものが無い** → 移行が自動で走り（`hermes gateway migrate --multiplex --yes` と
  同じ処理の道筋です）、何をしたかを表示します。結果は決まっていて確認を求めることも
  ないので、画面の無い環境や cron での更新でも走ります。
- **妨げるものがある** → 警告の欄に、妨げるものそれぞれの正確な直し方と、あとで
  実行する 1 行のコマンドが並びます。何も変更されません。

プロファイルが 1 つだけの環境は移行されません（得るものが無いからです）。すでに
多重化している環境もそのままです。ほかのプロファイルが自分のゲートウェイを動かしていないときも、
`hermes update` は何もしません。何も動いていなかった環境でモードを切り替えることはありません。

### `hermes update` が自分からは越えない境目 {#boundaries-hermes-update-never-crosses-on-its-own}

無人で動くフックがまとめるのは、**UNIX ユーザーが 1 つ、サービスの管理範囲が 1 つ、`profiles/` の
ツリーが 1 つ** のプロファイルだけです。`hermes profile create` で作るとこの形になります。
独立して動くほかのプロファイルが、次のいずれかの境目の向こうにあると、自動の移行は止まります。

| 境目 | 例 |
|---|---|
| サービスの管理役や範囲が違う | 既定はユーザーの systemd、ほかのプロファイルは**システム**の systemd（または launchd）。あるいは既定は切り離して動かし、ほかのプロファイルはサービスの管理下 |
| UNIX ユーザーが違う | 自分の `User=` を持つシステムのユニット、または別の uid が持ち主の動いているゲートウェイ |
| `HERMES_HOME` が `<default home>/profiles/` の外にある | `HERMES_HOME=/opt/hermes/profiles/emma` を固定したユニット |

この場合、`hermes update` は見つけた境目と `hermes gateway migrate --multiplex` を表示するだけで、
何も変えません。ユニットは消されず、`gateway.multiplex_profiles` も切られたままです。こうした構成を
ひとつにまとめると、カーネルが守る境目（ファイルの持ち主、`User=`）を、プロセスの中での分離に
置き換えることになります。それを決めるのは運用する人です。はっきりしたコマンドなら、それでも移行できます。
同じ発見は `hermes gateway migrate --multiplex --dry-run` に**注意**として出るので、先に読めます。
確認したうえで `--multiplex` を実行すれば進みます。

### 自動の移行を断る {#opting-out-of-the-automatic-migration}

この環境で自動のまとめを一切走らせたくないときは、**既定の**プロファイルで
`gateway.auto_multiplex_migration: false` を設定します。

```bash
hermes config set gateway.auto_multiplex_migration false
```

こうすると `hermes update` は、環境がどれほど移行の条件に合って見えても、プロファイルごとの
ゲートウェイをそのまま残し、何も表示せず、何も変えません。この設定は config に残るので、
更新しても消えません。決めるのは一度きりで、リリースのたびに蒸し返されることはありません。
効くのは**自動の**経路だけです。`hermes gateway migrate --multiplex` ははっきりした依頼なので、
それでも移行します（断ったあとで改めて移行するときも、これを使うのが正式なやり方です）。
設定が無いか `true` なら、上で説明した既定のふるまいのままです。

はっきりしたコマンドのほうは違います。プロファイルが 2 つ以上あり、独立して動くほかのゲートウェイが
**1 つも無い**ときに `hermes gateway migrate --multiplex` を実行すると、残っているひと手間だけを
行います。`gateway.multiplex_profiles: true` を設定し、既定のゲートウェイを（再）起動し、同じ
巻き戻し用の記録（`secondaries` の一覧は空）を書き出すので、`--standalone` で元に戻せます。
多重化を頼んだのだから、多重化になる、ということです。

:::tip 複製はチャンネルを持ち込みません
`hermes profile create --clone` は、元のプロファイルのボットトークンと許可リストを置いていきます
（[プロファイル → メッセージのチャンネルは複製されません](/hermes/docs/user-guide/profiles/#messaging-channels-are-never-cloned---clone-channels-to-opt-in) を見てください）。
そのため、複製をいくつ並べても、下で説明する「認証情報の重複」の足止めには引っかからなくなりました。
まだそれらを持っている以前の複製は、`hermes profile list` が指摘します。
:::

### 移行ですること {#what-the-migration-does}

1. 従属側のプロファイルそれぞれの単独のゲートウェイを止め、そのサービス（systemd の
   ユーザー単位かシステム単位、または launchd のエージェント）を外します。外したものは、
   元に戻すために `~/.hermes/gateway_migration.json` に記録されます。
2. **既定** プロファイルの `config.yaml` に `gateway.multiplex_profiles: true` を設定します。
3. 既定のゲートウェイを再起動します。あるいは従属側が使っていたのと同じサービス管理の
   しくみに入れて起動するので、systemd で管理していた一式は systemd の管理のままです。
4. 既定のゲートウェイがすべてのプロファイルを含む `served_profiles` を記録するまで待ち、
   まとめを表示します。

### 妨げるものと直し方 {#blockers-and-fixes}

| 妨げるもの | 理由 | 直し方 |
|---|---|---|
| 2 つのプロファイルが同じプラットフォームの認証情報を設定している（たとえば同じ `TELEGRAM_BOT_TOKEN`） | 1 つのプロセスのなかでは、ボットトークン 1 つにつき問い合わせは 1 回しかできません。多重化は重複したほうを止め置き、そのプロファイルのボットは黙ってしまいます | 2 つめのプロファイルからトークンを外すか、`default` に置いたまま、そのプロファイルのチャットを [`profile_routes`](#routing-shared-bot-chats-to-profiles-profile_routes) で振り分けます |
| 従属側のプロファイルが、既定の待ち受けに `/p/<profile>/` の入口を **持たない**、ポートを掴むプラットフォームを有効にしている | 多重化はそのプロファイル全体を飛ばします（[決まり 2](#2-http-inbound-platforms-are-reached-via-a-pprofile-url-prefix) を見てください） | そのプロファイルでプラットフォームを無効にする（`platforms.<name>.enabled: false`）か、`hermes -p <name> gateway start --force` でそのプロファイルを単独のゲートウェイのままにします |

認証情報の確認はゲートウェイ自身のぶつかりの検出を使い回すので、その判定は多重化が
起動時にすることと一致します。どのポートを掴むプラットフォームが `/p/<profile>/` の
入口を持つかはアダプタ自身から読み取る（それぞれが `serves_profile_prefix` を
宣言します）ので、HTTP で受ける新しいアダプタが接頭辞に対応しても、事前確認は
正しいままです。

### 受信ポート型のプロファイルで変わること {#what-changes-for-inbound-port-profiles}

`api_server` や `webhook` を自分のポートで使っていた従属側のプロファイルは、移行を
**妨げません**。ただし URL が変わります。事前確認は新しい正確な URL を表示します。
たとえば次のとおりです。

```
Profile 'coder': api_server moves onto the default listener at
http://127.0.0.1:8642/p/coder/v1/... (its key/secret is unchanged; update
clients that call the old per-profile port).
```

そのプロファイル自身の `API_SERVER_KEY` や Webhook の合言葉は、接頭辞付きの URL でも
引き続き認証に使えます。鍵について変わることはほかにありません。

### 移行後に作ったプロファイル {#profiles-created-after-the-migration}

多重化が動いている間に作ったプロファイルは、再起動なしで受け持たれます（上を見て
ください）。`hermes profile create` は、動いている多重化がプロファイルを拾ったときは
そのことを確かめて伝えます。`hermes gateway restart` を促す表示が出るのは、多重化に
届かなかったとき（たとえば古い版から起動したゲートウェイ）だけです。

### 元に戻す {#rollback}

```bash
hermes gateway migrate --standalone
```

は `gateway_migration.json` を読み、`gateway.multiplex_profiles` を前の値に戻し、既定の
ゲートウェイを再起動し、記録されたプロファイルごとのサービスをすべて入れ直して起動します。
すべて戻ると、記録のファイルは消されます。記録のファイルが無い（多重化を手で有効にした）
場合は、`hermes config set gateway.multiplex_profiles false && hermes gateway restart`
で多重化を抜け、必要なプロファイルごとのサービスを入れ直してください。

自動では扱わないもの: s6 で監督しているコンテナ（既定プロファイルでフラグを設定して
コンテナを再起動します）と、Windows のタスク スケジューラのタスク（フラグを設定し、
プロファイルごとのタスクを止めて、`hermes gateway restart`）。事前確認で移行できる環境と
わかったときは、ダッシュボードの System のページにも同じ移行がボタンとして出ます。

## コードを更新する {#updating-the-code}

`hermes update` は最新のコードを 1 回取ってきて、新しく同梱されたスキルを
すべてのプロファイルへ配ります。

```bash
hermes update
hermes-gateways restart
```

動いているゲートウェイは更新そのものが再起動します。まだプロファイルごとに
ゲートウェイを 1 つずつ動かしている環境では、続けて更新が
[多重化したゲートウェイ 1 つへの移行](#migrating-from-per-profile-gateways)を持ちかけます。
妨げるものが無ければ自動で行い、あれば直し方を添えた警告として出します。

手を入れたスキルが上書きされることはありません。

## 困ったときは {#troubleshooting}

### 「Could not find service in domain for user gui: 501」と出る {#could-not-find-service-in-domain-for-user-gui-501}

`hermes gateway stop` のあとに `hermes gateway start` を実行しています。CLI の
`stop` は `launchctl unload` まで行うので、サービスが launchd の登録簿から消えます。
CLI は `start` のときにこのエラーだけを捕まえて、plist を自動で読み込み直します
（`↻ launchd job was unloaded; reloading service definition`）。サービスはそのまま
起動します。直す必要はありません。

### 落ちたあとに PID が残っている {#stale-pid-after-a-crash}

プロファイルのゲートウェイが `not running` と出ているのに、プロセスがまだ生きて
いる場合は、次のようにします。

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
