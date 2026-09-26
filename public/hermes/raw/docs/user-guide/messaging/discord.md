---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "Discord"
description: "Hermes Agent を Discord のボットとして設定する"
upstream_path: user-guide/messaging/discord.md
upstream_blob: d639cea111b76fcc3f248c4a18e8ae53de9af0ba
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/discord
---

# Discord の設定 {#discord-setup}

Hermes Agent は Discord にボットとして組み込めます。ダイレクトメッセージでも、サーバーのチャンネルでも、AI アシスタントと会話できるようになります。ボットはメッセージを受け取り、Hermes Agent のパイプライン（ツールの利用、記憶、推論を含む）で処理し、その場で返答します。テキスト、ボイスメッセージ、ファイルの添付、スラッシュコマンドに対応しています。

設定手順の前に、多くの人がまず知りたい部分から説明します。サーバーに入れた Hermes がどう振る舞うか、です。

## Hermes の振る舞い {#how-hermes-behaves}

| 場面 | 振る舞い |
|---------|----------|
| **DM** | Hermes はすべてのメッセージに応答します。`@mention` は不要です。DM ごとに独立したセッションを持ちます。 |
| **サーバーのチャンネル** | 既定では、`@mention` されたときだけ応答します。メンションせずにチャンネルへ投稿した場合、Hermes はそのメッセージを無視します。 |
| **自由応答チャンネル** | 特定のチャンネルを `DISCORD_FREE_RESPONSE_CHANNELS` でメンション不要にできます。`DISCORD_REQUIRE_MENTION=false` で全体的にメンションを不要にすることもできます。これらのチャンネルのメッセージには、既定ではその場で返信します。自動スレッド化は行われないので、チャンネルは気軽なチャットのまま保てます。`discord.free_response_auto_thread: true` を設定すると、メンション不要の応答と、トップレベルのメッセージごとのスレッド作成を両立できます。 |
| **スレッド** | Hermes は同じスレッド内で返信します。そのスレッドか親チャンネルが自由応答として設定されていない限り、メンションの規則はそのまま適用されます。セッション履歴の上では、スレッドは親チャンネルから切り離されたままになります。 |
| **複数の人がいる共有チャンネル** | 既定では、安全性と分かりやすさのために、チャンネル内でもセッション履歴を利用者ごとに分離します。同じチャンネルで 2 人が話していても、明示的に無効化しない限り 1 つの記録を共有することはありません。 |
| **他の人をメンションしたメッセージ** | `DISCORD_IGNORE_NO_MENTION` が `true`（既定）のとき、メッセージが他の利用者を @mention していてボット自身をメンションして**いない**場合、Hermes は黙ったままになります。他の人に向けられた会話にボットが割り込むのを防ぐためです。他の誰がメンションされていても応答させたい場合は `false` にします。これはサーバーのチャンネルにだけ適用され、DM には適用されません。 |

:::tip
毎回タグを付けなくても Hermes と話せる、ふつうのボット用チャンネルがほしい場合は、そのチャンネルを `DISCORD_FREE_RESPONSE_CHANNELS` に追加してください。
:::

### Discord のゲートウェイモデル {#discord-gateway-model}

Discord 上の Hermes は、状態を持たずに返すだけの Webhook ではありません。メッセージングゲートウェイを丸ごと通るので、受信したメッセージは次の流れを通過します。

1. 認可（`DISCORD_ALLOWED_USERS`）
2. メンション / 自由応答の判定
3. セッションの特定
4. セッション記録の読み込み
5. ツール、記憶、スラッシュコマンドを含む通常の Hermes エージェント実行
6. Discord への応答の送信

これが重要なのは、人の多いサーバーでの振る舞いが、Discord 側のルーティングと Hermes 側のセッション方針の両方で決まるからです。

### Discord でのセッションモデル {#session-model-in-discord}

既定では次のようになります。

- DM ごとに独立したセッションを持つ
- サーバーのスレッドごとに独立したセッションの名前空間を持つ
- 共有チャンネルでは、利用者ごとにそのチャンネル内で独立したセッションを持つ

つまり Alice と Bob が両方 `#research` で Hermes に話しかけた場合、見た目は同じ Discord チャンネルでも、既定では別々の会話として扱われます。

これは `config.yaml` で制御します。

```yaml
group_sessions_per_user: true
```

部屋全体で 1 つの会話を共有したいと明確に考えている場合にだけ、`false` にしてください。

```yaml
group_sessions_per_user: false
```

共有セッションは共同作業の部屋では役に立ちますが、次のことも意味します。

- 利用者どうしでコンテキストの増え方とトークン費用を共有することになる
- 誰か 1 人のツールを多用する長い作業が、他の全員のコンテキストを膨らませる
- 誰か 1 人の実行中の処理が、同じ部屋にいる別の人の追加の質問を中断させる

### 割り込みと同時実行 {#interrupts-and-concurrency}

Hermes は実行中のエージェントをセッションキーで管理しています。

既定の `group_sessions_per_user: true` では次のようになります。

- Alice が自分の実行中のリクエストに割り込んでも、そのチャンネルにある Alice のセッションにしか影響しない
- Bob は Alice の履歴を引き継ぐことも、Alice の実行を中断することもなく、同じチャンネルで話し続けられる

`group_sessions_per_user: false` では次のようになります。

- そのチャンネル / スレッドについて、部屋全体で実行中エージェントの枠を 1 つ共有する
- 別々の人からの追加メッセージが、互いに割り込んだり順番待ちになったりする

この手引きでは、Discord の開発者ポータルでボットを作るところから、最初のメッセージを送るところまで、設定の全工程を追っていきます。

### ゲートウェイ WebSocket の健全性 {#gateway-websocket-health}

Discord の REST とゲートウェイの WebSocket は別の通信路です。REST の応答が成功しても（`fetch_user()` が HTTP 200 を返す場合も含めて）、ボットがまだゲートウェイのイベントを受け取れている証拠にはなりません。そこで Hermes は、ready 状態、クライアント / ソケットの切断状態、ソケットが開いているか、ハートビート ACK の経過時間、ハートビート遅延が有限値かどうか、そして配信側の観点が加わってからは、最後にゲートウェイのイベントを解釈してからどれだけ経ったか、をまとめて見ています。

設定した回数だけ連続して不健全と判定されると、アダプターは再試行可能な致命的イベントを 1 回発行します。通信路が閉じている場合（`socket_closed` / `client_closed`）は死亡が確定しているので、最初の不健全判定で再接続を強制します。しきい値が効くのは弱い兆候（古いハートビート ACK、遅延、イベントの沈黙）だけです — [#118487](https://github.com/NousResearch/hermes-agent/issues/118487) を参照してください。既存のゲートウェイ再接続ウォッチャーが新しいアダプターを作るので、Discord アダプターが際限のない再接続ループをもう 1 つ始めることはありません。

秘密情報ではないしきい値は `config.yaml` で設定します。

```yaml
discord:
  websocket_liveness_interval_seconds: 15
  websocket_liveness_failure_threshold: 2
  websocket_heartbeat_ack_max_age_seconds: 60
  websocket_max_latency_seconds: 30
  websocket_event_max_silence_seconds: 14400
```

古い `liveness_interval_seconds` と `liveness_failure_threshold` という名前は、互換のための別名として残っているだけです。REST への問い合わせという意味はもうありません。

どれか 1 つでも `0` にすると、WebSocket の生存確認そのものが無効になります。正の数として解釈できない値（`15s`、`nan`、`true`、`-1` など）でも無効になり、アダプターの起動のたびに警告が記録されます。確認が動いていないようなら `gateway.log` を見てください。

`websocket_event_max_silence_seconds` だけは例外です。これは 1 つの観点（イベントの配信）だけを守るので、`0` にすると**その検査だけ**を見送ります。ready / ACK / 遅延の監視は続きます。ソケットが ESTABLISHED のままハートビートに ACK を返し続けながら、ゲートウェイのイベントを 1 件も届けないことがあります。ハートビートの ACK はイベント種別を持たないフレームなので、通信路側のどの検査でもその状態は見えません。既定値（4 時間）は、運用者が現場で観測した障害の長さに合わせたものです。人の少ないサーバーでは何時間もゲートウェイのイベントが 1 件も来ないことが正常にあり得るので、自分のところの流量が分かっていない限り、この上限はゆとりを持たせておいてください。

## 手順 1: Discord アプリケーションを作る {#step-1-create-a-discord-application}

1. [Discord 開発者ポータル](https://discord.com/developers/applications) を開き、Discord アカウントでサインインします。
2. 右上の **New Application** をクリックします。
3. アプリケーションの名前（例: "Hermes Agent"）を入力し、開発者向け利用規約に同意します。
4. **Create** をクリックします。

**General Information** のページが表示されます。**Application ID** を控えておいてください。あとで招待 URL を組み立てるときに必要になります。

## 手順 2: ボットを作る {#step-2-create-the-bot}

1. 左側のサイドバーで **Bot** をクリックします。
2. Discord がアプリケーション用のボットユーザーを自動で作ります。ボットのユーザー名が表示され、変更もできます。
3. **Authorization Flow** の項目で次のように設定します。
   - **Public Bot** を **ON** にします。Discord が用意する招待リンクを使うために必要です（こちらを推奨します）。これにより Installation タブが既定の認可 URL を生成できるようになります。
   - **Require OAuth2 Code Grant** は **OFF** のままにします。

:::tip
このページでボットのアイコンとバナーを設定できます。Discord 上で利用者の目に入るのはこの見た目です。
:::

:::info[非公開ボットにする場合]
ボットを非公開にしたい場合（Public Bot = OFF）、手順 5 では Installation タブではなく **手動 URL** の方法を**必ず**使ってください。Discord が用意するリンクは Public Bot が有効であることを前提にしています。
:::

## 手順 3: 特権ゲートウェイインテントを有効にする {#step-3-enable-privileged-gateway-intents}

設定全体でいちばん重要な手順です。正しいインテントを有効にしていないと、ボットは Discord に接続できても**メッセージの本文を読めません**。

**Bot** のページで **Privileged Gateway Intents** までスクロールすると、3 つのトグルがあります。

| インテント | 用途 | 必須か |
|--------|---------|-----------| 
| **Presence Intent** | 利用者のオンライン / オフライン状態を見る | 任意 |
| **Server Members Intent** | メンバー一覧へのアクセス、ユーザー名の解決 | **必須** |
| **Message Content Intent** | メッセージの本文を読む | **必須** |

**Server Members Intent と Message Content Intent の両方**を **ON** にしてください。

- **Message Content Intent** がないと、ボットはメッセージのイベントを受け取っても本文が空になります。入力した内容が文字どおり見えません。
- **Server Members Intent** がないと、許可利用者の一覧に対してユーザー名を解決できず、誰が話しかけているのかを判別できないことがあります。

:::warning[Discord のボットが動かない原因の第 1 位はこれです]
ボットはオンラインなのにメッセージへ一切応答しない場合、ほぼ確実に **Message Content Intent** が無効です。[開発者ポータル](https://discord.com/developers/applications) に戻り、アプリケーション → Bot → Privileged Gateway Intents と進んで、**Message Content Intent** が ON になっていることを確かめてください。そのあと **Save Changes** をクリックします。
:::

**サーバー数について:**
- ボットが参加しているサーバーが **100 未満**なら、インテントは自由に切り替えられます。
- ボットが **100 以上**のサーバーに参加している場合、特権インテントを使うには Discord への申請と審査が必要です。個人利用であれば気にしなくて構いません。

ページ下部の **Save Changes** をクリックします。

## 手順 4: ボットトークンを取得する {#step-4-get-the-bot-token}

ボットトークンは、Hermes Agent がボットとしてログインするための認証情報です。**Bot** のページのまま次を行います。

1. **Token** の項目で **Reset Token** をクリックします。
2. Discord アカウントで二要素認証を有効にしている場合は、2FA のコードを入力します。
3. 新しいトークンが表示されます。**すぐにコピーしてください。**

:::warning[トークンは一度しか表示されません]
トークンが表示されるのは一度だけです。なくした場合はリセットして新しく発行し直すことになります。トークンを人目に触れる場所に出したり、Git にコミットしたりしないでください。これを持っている人はボットを完全に操作できます。
:::

トークンは安全な場所（パスワード管理ツールなど）に保管してください。手順 8 で使います。

## 手順 5: 招待 URL を生成する {#step-5-generate-the-invite-url}

ボットをサーバーに招待するには OAuth2 の URL が必要です。方法は 2 つあります。

### 方法 A: Installation タブを使う（推奨） {#option-a-using-the-installation-tab-recommended}

:::note[Public Bot が必要です]
この方法は、手順 2 で **Public Bot** を **ON** にしていることが前提です。OFF にした場合は、下の手動 URL の方法を使ってください。
:::

1. 左側のサイドバーで **Installation** をクリックします。
2. **Installation Contexts** で **Guild Install** を有効にします。
3. **Install Link** では **Discord Provided Link** を選びます。
4. Guild Install の **Default Install Settings** では次を設定します。
   - **Scopes**: `bot` と `applications.commands` を選ぶ
   - **Permissions**: 下に挙げる権限を選ぶ

### 方法 B: 手動で URL を作る {#option-b-manual-url}

次の形式で招待 URL を直接組み立てられます。

```
https://discord.com/oauth2/authorize?client_id=YOUR_APP_ID&scope=bot+applications.commands&permissions=274878286912
```

`YOUR_APP_ID` は手順 1 の Application ID に置き換えてください。

### 必要な権限 {#required-permissions}

ボットに最低限必要な権限は次のとおりです。

- **View Channels** — アクセスできるチャンネルを見る
- **Send Messages** — メッセージに応答する
- **Embed Links** — 内容を埋め込み形式で整える
- **Attach Files** — 画像、音声、ファイル出力を送る
- **Read Message History** — 会話の文脈を保つ

### 追加を推奨する権限 {#recommended-additional-permissions}

- **Send Messages in Threads** — スレッド内の会話で応答する
- **Add Reactions** — 受け取ったことを示すためにリアクションを付ける

### 権限の数値 {#permission-integers}

| 段階 | 権限の数値 | 含まれるもの |
|-------|-------------------|-----------------|
| 最小 | `117760` | View Channels、Send Messages、Read Message History、Attach Files |
| 推奨 | `274878286912` | 上記すべてに加えて Embed Links、Send Messages in Threads、Add Reactions |

## 手順 6: サーバーに招待する {#step-6-invite-to-your-server}

1. 招待 URL（Installation タブのもの、または自分で組み立てたもの）をブラウザーで開きます。
2. **Add to Server** のドロップダウンで自分のサーバーを選びます。
3. **Continue** をクリックし、続けて **Authorize** をクリックします。
4. CAPTCHA が表示されたら完了させます。

:::info
ボットを招待するには、その Discord サーバーで **Manage Server** の権限が必要です。ドロップダウンに自分のサーバーが出てこない場合は、サーバーの管理者に招待リンクを使ってもらってください。
:::

認可が終わると、ボットがサーバーのメンバー一覧に現れます（Hermes のゲートウェイを起動するまではオフライン表示のままです）。

## 手順 7: 自分の Discord ユーザー ID を調べる {#step-7-find-your-discord-user-id}

Hermes Agent は、誰がボットとやり取りできるかを Discord のユーザー ID で制御します。調べ方は次のとおりです。

1. Discord（デスクトップ版または Web 版）を開きます。
2. **設定** → **詳細設定** と進み、**開発者モード**を **ON** にします。
3. 設定を閉じます。
4. 自分のユーザー名（メッセージ、メンバー一覧、プロフィールのいずれか）を右クリックし、**ユーザー ID をコピー** を選びます。

ユーザー ID は `284102345871466496` のような長い数字です。

:::tip
開発者モードでは、同じ手順で**チャンネル ID** と**サーバー ID** もコピーできます。チャンネル名やサーバー名を右クリックして ID をコピーしてください。ホームチャンネルを手作業で設定する場合はチャンネル ID が必要になります。
:::

## 手順 8: Hermes Agent を設定する {#step-8-configure-hermes-agent}

### 方法 A: 対話形式の設定（推奨） {#option-a-interactive-setup-recommended}

案内付きの設定コマンドを実行します。

```bash
hermes gateway setup
```

尋ねられたら **Discord** を選び、ボットトークンとユーザー ID を貼り付けます。

### 方法 B: 手作業での設定 {#option-b-manual-configuration}

`~/.hermes/.env` に次の内容を追加します。

```bash
# Required
DISCORD_BOT_TOKEN=your-bot-token
DISCORD_ALLOWED_USERS=284102345871466496

# Multiple allowed users (comma-separated)
# DISCORD_ALLOWED_USERS=284102345871466496,198765432109876543
```

続いてゲートウェイを起動します。

```bash
hermes gateway
```

数秒のうちに Discord 上でボットがオンラインになります。DM でも、ボットから見えるチャンネルでも構わないので、メッセージを送って試してみてください。

:::tip
`hermes gateway` はバックグラウンドで動かすことも、systemd のサービスとして常駐させることもできます。詳しくはデプロイの文書を参照してください。
:::

## 設定の早見表 {#configuration-reference}

Discord の振る舞いは 2 つのファイルで制御します。認証情報と環境変数レベルの切り替えは **`~/.hermes/.env`**、構造のある設定は **`~/.hermes/config.yaml`** です。両方に設定がある場合、環境変数が必ず config.yaml より優先されます。

### 環境変数（`.env`） {#environment-variables-env}

| 変数 | 必須か | 既定値 | 説明 |
|----------|----------|---------|-------------|
| `DISCORD_BOT_TOKEN` | **はい** | — | [Discord 開発者ポータル](https://discord.com/developers/applications) で取得したボットトークン。 |
| `DISCORD_ALLOWED_USERS` | 条件付き | — | ボットとやり取りできる Discord ユーザー ID をカンマ区切りで指定します。これ**も** `DISCORD_ALLOWED_ROLES` も設定していない場合、`DISCORD_ALLOW_ALL_USERS=true`、`GATEWAY_ALLOW_ALL_USERS=true`、または `DISCORD_ALLOWED_CHANNELS` によるサーバーへのアクセス範囲の明示がない限り、ゲートウェイはすべての利用者を拒否します。 |
| `DISCORD_ALLOWED_ROLES` | いいえ | — | Discord のロール ID をカンマ区切りで指定します。いずれかのロールを持つメンバーが認可されます（`DISCORD_ALLOWED_USERS` とは OR の関係です）。接続時に **Server Members Intent** を自動で有効にします。管理役の入れ替わりが多い場面で便利で、ロールを付与した時点で新しい管理役にアクセス権が渡り、設定の配布は要りません。 |
| `DISCORD_ALLOW_ALL_USERS` | いいえ | `false` | ボットに到達できるすべての Discord 利用者を許可する、明示的な選択です。Discord についてだけ 0.18 以前の開放された振る舞いに戻します。信頼できる非公開サーバーか開発用途にだけ使ってください。 |
| `GATEWAY_ALLOW_ALL_USERS` | いいえ | `false` | すべてのゲートウェイのプラットフォームに対する全員許可の選択です。接続しているすべてのプラットフォームを意図的に開放したいのでなければ、プラットフォーム個別の `DISCORD_ALLOW_ALL_USERS` を使ってください。 |
| `DISCORD_HOME_CHANNEL` | いいえ | — | ボットが自発的なメッセージ（cron の出力、リマインダー、通知）を送るチャンネルの ID。 |
| `DISCORD_HOME_CHANNEL_NAME` | いいえ | `"Home"` | ログや状態表示に出るホームチャンネルの表示名。 |
| `DISCORD_COMMAND_SYNC_POLICY` | いいえ | `"safe"` | 起動時のネイティブなスラッシュコマンド同期を制御します。`"safe"` は既存のグローバルコマンドとの差分を取り、変わったものだけを更新します。Discord 側のメタデータの変更がパッチで適用できない場合はコマンドを作り直します。`"bulk"` は以前の `tree.sync()` の振る舞いをそのまま残します。`"off"` は起動時の同期を完全に見送ります。 |
| `DISCORD_REQUIRE_MENTION` | いいえ | `true` | `true` のとき、サーバーのチャンネルでは `@mentioned` されたときだけ応答します。すべてのチャンネルのすべてのメッセージに応答させるには `false` にします。 |
| `DISCORD_THREAD_REQUIRE_MENTION` | いいえ | `false` | `true` のとき、スレッド内でメンションを省略できる仕組みが無効になります。スレッドもチャンネルと同じ扱いになり、ボットがすでに参加していても `@mention` が必要になります。1 つのスレッドを複数のボットが共有していて、それぞれを明示的な `@mention` でだけ動かしたい場合に使います。 |
| `DISCORD_FREE_RESPONSE_CHANNELS` | いいえ | — | `DISCORD_REQUIRE_MENTION` が `true` でも `@mention` なしで応答するチャンネル ID を、カンマ区切りで指定します。 |
| `DISCORD_IGNORE_NO_MENTION` | いいえ | `true` | `true` のとき、メッセージが他の利用者を `@mentions` していてボット自身をメンションして**いない**場合、ボットは黙ったままになります。他の人に向けられた会話への割り込みを防ぎます。サーバーのチャンネルにだけ適用され、DM には適用されません。 |
| `DISCORD_AUTO_THREAD` | いいえ | `true` | `true` のとき、テキストチャンネルでの `@mention` ごとに新しいスレッドを自動で作り、会話を切り分けます（Slack に近い振る舞いです）。すでにスレッド内にあるメッセージや DM には影響しません。 |
| `DISCORD_FREE_RESPONSE_AUTO_THREAD` | いいえ | `false` | `true` のとき、`DISCORD_FREE_RESPONSE_CHANNELS` に挙げた自由応答チャンネルでも、トップレベルのメッセージごとにスレッドを自動作成します。メンション不要のままです。既定の `false` は、その場で返す軽いチャットの振る舞いを保ちます。`DISCORD_AUTO_THREAD=true` が必要です。`DISCORD_NO_THREAD_CHANNELS` が優先され、ボイスに紐づいたチャンネルでは常に無視されます。 |
| `DISCORD_ALLOW_BOTS` | いいえ | `"none"` | 他の Discord ボットからのメッセージの扱いを制御します。`"none"` は他のボットをすべて無視、`"mentions"` は Hermes を `@mention` したボットのメッセージだけ受け取る、`"all"` はすべてのボットのメッセージを受け取る、です。既定では、有効にしたどちらの方式でも本文中の実際のメンションが必要です。次の設定を参照してください。 |
| `DISCORD_BOTS_REQUIRE_INLINE_MENTION` | いいえ | `true` | ボット間の受け渡しを始めるのに、本文中の `<@BOT_ID>` / `<@!BOT_ID>` というトークンを必須にします。返信のメタデータだけでは始まりません。同じ送信者・同じチャンネルからの短い連投は、後述のとおり受け付けられます。以前の受け入れ方式が必要な、信頼できる中継のためだけに `false` にしてください。人が書いたメッセージには影響しません。 |
| `DISCORD_REACTIONS` | いいえ | `true` | `true` のとき、処理の進行に合わせてボットが絵文字のリアクションを付けます（開始時に 👀、成功時に ✅、エラー時に ❌）。リアクションを一切付けないようにするには `false` にします。 |
| `DISCORD_IGNORED_CHANNELS` | いいえ | — | `@mentioned` されても**決して**応答しないチャンネル ID を、カンマ区切りで指定します。他のどのチャンネル設定よりも優先されます。 |
| `DISCORD_ALLOWED_CHANNELS` | いいえ | — | チャンネル ID をカンマ区切りで指定します。設定すると、ボットはこれらのチャンネル（および許可されていれば DM）で**のみ**応答します。`config.yaml` の `discord.allowed_channels` より優先されます。`DISCORD_IGNORED_CHANNELS` と組み合わせて、許可と拒否の規則を表現できます。 |
| `DISCORD_NO_THREAD_CHANNELS` | いいえ | — | スレッドを作らず、チャンネル内で直接応答させるチャンネル ID を、カンマ区切りで指定します。`DISCORD_AUTO_THREAD` が `true` のときにだけ意味を持ちます。 |
| `DISCORD_HISTORY_BACKFILL` | いいえ | `true` | `true` のとき、ボットがメンションされた際に、直近のチャンネルの流れ（ボットの前回の応答以降）を利用者のメッセージの前に付け足します。`require_mention` では取りこぼしていた文脈を回収できます。DM と自由応答チャンネルでは行いません。止めるには `false` にします。 |
| `DISCORD_HISTORY_BACKFILL_LIMIT` | いいえ | `50` | 補完する内容を組み立てるときに、さかのぼって調べるメッセージ数の上限。実際には、そのチャンネルでのボット自身の最後のメッセージに当たった時点で、それより早く止まるのがふつうです。 |
| `DISCORD_REPLY_TO_MODE` | いいえ | `"first"` | 返信参照の付け方を制御します。`"off"` は元のメッセージへ返信しない、`"first"` は最初のメッセージの塊にだけ返信参照を付ける（既定）、`"all"` はすべての塊に付ける、です。 |
| `DISCORD_ALLOW_MENTION_EVERYONE` | いいえ | `false` | `false`（既定）のとき、応答に `@everyone` や `@here` が含まれていても通知は飛びません。戻したい場合は `true` にします。下の [メンションの制御](#mention-control) を参照してください。 |
| `DISCORD_ALLOW_MENTION_ROLES` | いいえ | `false` | `false`（既定）のとき、ボットは `@role` のメンションで通知を飛ばせません。許可するには `true` にします。 |
| `DISCORD_ALLOW_MENTION_USERS` | いいえ | `true` | `true`（既定）のとき、ボットは ID を指定して個別の利用者に通知を飛ばせます。 |
| `DISCORD_ALLOW_MENTION_REPLIED_USER` | いいえ | `true` | `true`（既定）のとき、メッセージへの返信で元の投稿者に通知が飛びます。 |
| `DISCORD_PROXY` | いいえ | — | Discord への接続（HTTP、WebSocket、REST）に使うプロキシの URL。`HTTPS_PROXY`/`ALL_PROXY` より優先されます。`http://`、`https://`、`socks5://` の形式に対応します。 |
| `DISCORD_ALLOW_ANY_ATTACHMENT` | いいえ | `false` | `true` のとき、どんな種類のファイルの添付も受け付けます（組み込みの PDF / テキスト / zip / オフィス文書の許可一覧に限りません）。判別できない種類はディスクに保存され、`application/octet-stream` の MIME を付けたローカルのパスとしてエージェントに渡されるので、`terminal` / `read_file` / `ffprobe` などで調べられます。 |
| `DISCORD_MAX_ATTACHMENT_BYTES` | いいえ | `33554432` | ゲートウェイがダウンロードして保存する添付 1 件あたりの最大バイト数。既定は 32 MiB です。上限をなくすには `0` にします（保存中の添付はメモリ上に保持されるので、無制限には実際のメモリ消費が伴います）。 |
| `HERMES_DISCORD_TEXT_BATCH_DELAY_SECONDS` | いいえ | `0.6` | 溜めたテキストの塊を送り出すまでにアダプターが待つ猶予時間。逐次生成される出力をなめらかに見せたいときに役立ちます。 |
| `HERMES_DISCORD_TEXT_BATCH_SPLIT_DELAY_SECONDS` | いいえ | `2.0` | 上限近くで分割された Discord のメッセージや、同じチャンネルで直前にタグを付けられたボットからの続きの塊に使う、より長い静穏期間。 |

### ボット間の受け渡し: 一度タグを付ければ、続く連投も拾う {#bot-to-bot-handoffs-tag-once-collect-the-burst}

ボットからの入力は、こちらから有効にしたときだけ受け付けます（既定は `DISCORD_ALLOW_BOTS=none`）。`mentions` か `all` で有効にした場合、**ボット間の受け渡しを始めるには、既定では本文中に `<@BOT_ID>` / `<@!BOT_ID>` そのものが必要です**。Discord が返信に自動で付ける通知だけでは始まりません。人が書いたメッセージのメンションの扱いは今までどおりです。

受け付けたボットのメンションのあと、Hermes は**同じボットから同じチャンネルまたはスレッドに届く**、メンションのない続きのメッセージを短い間だけ受け付けます。続きのテキストは既存のテキストまとめ機構に入るので、素早く分割された応答も、すべてにタグを付け直さなくてもまとまってエージェントに届きます。送信側に特別なプロトコルや分割の目印は要りません。

たとえば、ボット A が `<@BOT_B_ID> Here is the review …` を送り、続けて同じスレッドへタグなしのテキストを 2 つ送ったとします。ボット B は受け入れ期間の間それらを受け取り、タグ付きのテキストと一緒にまとめます。期間が過ぎたあとは、既定の方針では、タグなしのメッセージや返信の通知だけで新しい受け渡しを始めることはできません。互いに明示的にタグを付けるやり方は今までどおり使えます。これは返信のメタデータによる意図しないループを防ぐためのもので、意図して続けている会話を止めるものではありません。

#### タイミングと制限 {#timing-and-limits}

受け入れ期間は、受け付けたメンションから `max(HERMES_DISCORD_TEXT_BATCH_DELAY_SECONDS, HERMES_DISCORD_TEXT_BATCH_SPLIT_DELAY_SECONDS)` の長さ（既定では 2 秒）続きます。受け付けた続きのメッセージごとに期間が延びるので、Discord の送信速度に合わせた長い受け渡しも、まとまったまま届きます。これとは別に、溜められたテキストの塊ごとにまとめ待ちのタイマーが入り直します。タグ付きのボットのまとまりは、最初の塊が短くても分割用の静穏期間を使います。これらの設定は受信側のまとめ方を制御するもので、送信側の速度を制御するものではありません。テキストのまとめを無効にする（`HERMES_DISCORD_TEXT_BATCH_DELAY_SECONDS=0`）と、続きの受け入れも無効になります。

これは短い連投を拾うための経験的な仕組みであって、分割配信を保証するものではありません。期間の外に遅れて届いた塊は、既定の方針では自分でメンションを付ける必要があります。また、期間内であれば同じボット・同じチャンネルからの無関係なメッセージも受け入れられることがあります。この例外はテキストに限りません。添付やコマンドも受け入れを通ることはありますが、このまとめ機構に入るのはテキストだけで、他の種類のメッセージは通常どおり処理されます。チャンネルの制限や `DISCORD_ALLOW_BOTS=none` は変わらず効きます。履歴の補完の振る舞いも変わりません。ゲートウェイのボットループ対策も最後の砦として残っています。1 つのチャンネルで 5 分以内にボットが書いたメッセージが 20 件を超えると、そこでのボットのメッセージは 10 分間破棄されます（`config.yaml` の `gateway.bot_loop_guard` で調整できます。人のメッセージは数えられません）。

#### 信頼できる中継との互換性 {#compatibility-with-trusted-relays}

本文中のメンションを必須とする設定は、既定が **true** になりました（以前は false）。`DISCORD_ALLOW_BOTS=all` の場合も同様です。既存の中継が返信の通知やメンションのないボットのメッセージに意図的に頼っているなら、以前の受け入れの振る舞いを明示的に残してください。

```yaml
discord:
  bots_require_inline_mention: false
```

YAML の項目を設定していない場合は、これまでの `DISCORD_BOTS_REQUIRE_INLINE_MENTION=false` という環境変数での上書きも使えます。この例外を選ぶと、`mentions` では返信の通知を含めて Discord が解決したメンションを受け付け、`all` ではボット向けのメンション要件がなくなります。チャンネル側のメンションの規則は変わらず適用されます。この互換モードでは、受け付けた返信の通知が続きの受け入れ期間を開くこともできます。意図しない返信ループの危険が戻るので、信頼できる中継にだけ使ってください。

### 設定ファイル（`config.yaml`） {#config-file-configyaml}

`~/.hermes/config.yaml` の `discord` セクションは、上の環境変数と対応しています。config.yaml の設定は既定値として適用されるので、同じ意味の環境変数がすでに設定されていれば環境変数が勝ちます。

```yaml
# Discord-specific settings
discord:
  require_mention: true           # Require @mention in server channels
  thread_require_mention: false   # If true, require @mention in threads too (multi-bot threads)
  bots_require_inline_mention: true  # Bot authors must type a literal @mention (default: true)
  free_response_channels: ""      # Comma-separated channel IDs (or YAML list)
  auto_thread: true               # Auto-create threads on @mention
  free_response_auto_thread: false # If true, free_response_channels also auto-thread (default: inline)
  reactions: true                 # Add emoji reactions during processing
  ignored_channels: []            # Channel IDs where bot never responds
  no_thread_channels: []          # Channel IDs where bot responds without threading
  history_backfill: true          # Prepend recent channel scrollback on mention (default: true)
  history_backfill_limit: 50      # Max messages to scan backwards (default: 50)
  missed_message_backfill:        # Replay messages missed while disconnected (opt-in)
    enabled: false
    channels: []                  # Empty uses free_response_channels
    window_seconds: 21600         # Look back at most 6 hours
    limit: 100                    # Global scan cap per reconnect
    max_dispatches: 10            # Recovery dispatch cap per reconnect
    max_attempts: 3               # Lifetime re-dispatch cap per message
  channel_prompts: {}             # Per-channel ephemeral system prompts
  voice_channel_inactivity_timeout_seconds: 300  # Set 0 to stay in VC until explicit /voice leave
  voice_playback_timeout_seconds: 120             # Minimum playback watchdog; long clips get duration+padding
  allow_mentions:                 # What the bot is allowed to ping (safe defaults)
    everyone: false               # @everyone / @here pings (default: false)
    roles: false                  # @role pings (default: false)
    users: true                   # @user pings (default: true)
    replied_user: true            # reply-reference pings the author (default: true)

# Session isolation (applies to all gateway platforms, not just Discord)
group_sessions_per_user: true     # Isolate sessions per user in shared channels
```

#### `discord.require_mention` {#discordrequiremention}

**型:** 真偽値 — **既定値:** `true`

有効にすると、サーバーのチャンネルでは直接 `@mentioned` されたときだけ応答します。DM はこの設定に関係なく必ず応答します。

#### `discord.thread_require_mention` {#discordthreadrequiremention}

**型:** 真偽値 — **既定値:** `false`

既定では、ボットがいったんスレッドに参加すると（`@mention` で自動作成された場合も、一度返信した場合も）、それ以降そのスレッドのすべてのメッセージに、改めて `@mentioned` されなくても応答し続けます。一対一の会話ではこれが適切な既定値です。

一方、利用者が 1 回ごとに 1 つのボットへ話しかける**複数ボットのスレッド**では、この既定値が落とし穴になります。スレッドにいる他のボットもすべてのメッセージに反応してしまい、費用を消費しチャンネルを埋め尽くします。`thread_require_mention: true` を設定するとスレッド内でメンションを省略できる仕組みが無効になり、スレッドもチャンネルと同じように制御されます。明示的な `@mentions` はこれまでどおり効きます。

```yaml
discord:
  require_mention: true
  thread_require_mention: true    # multi-bot setup
```

#### `discord.free_response_channels` {#discordfreeresponsechannels}

**型:** 文字列またはリスト — **既定値:** `""`

`@mention` なしで、すべてのメッセージに応答するチャンネルの ID です。カンマ区切りの文字列でも、YAML のリストでも指定できます。

```yaml
# String format
discord:
  free_response_channels: "1234567890,9876543210"

# List format
discord:
  free_response_channels:
    - 1234567890
    - 9876543210
```

スレッドの親チャンネルがこの一覧にある場合、そのスレッドもメンション不要になります。

自由応答チャンネルでは、既定で**自動スレッド化も行いません**。メッセージごとに新しいスレッドを立てるのではなく、その場で返信します。これによりチャンネルを気軽なチャットの場として使い続けられます。

自由応答チャンネルでもスレッド化したい場合は、`discord.free_response_auto_thread: true`（または `DISCORD_FREE_RESPONSE_AUTO_THREAD=true`）を設定します。この場合、自由応答チャンネルの新しいトップレベルのメッセージごとにスレッドが作られますが、チャンネル自体は @mention 不要のままです。`discord.auto_thread: true` が必要です。

#### `discord.free_response_auto_thread` {#discordfreeresponseautothread}

**型:** 真偽値 — **既定値:** `false`

`true` のとき、`discord.free_response_channels` に挙げたチャンネルでも、その場で返す代わりにトップレベルのメッセージごとにスレッドを自動作成します。チャンネルはメンション不要のままで、変わるのは会話が置かれる場所だけです。

```yaml
discord:
  free_response_channels:
    - 1234567890
  auto_thread: true                # required — this flag refines it
  free_response_auto_thread: true  # thread every top-level message there
```

`discord.auto_thread: true` が必要です（これが無効だとどこでもスレッド化されません）。[`discord.no_thread_channels`](#discordno_thread_channels) が優先され、ボイスに紐づいたテキストチャンネルでは常にその場で返信し、返信の形のメッセージが自動でスレッド化されることはありません。

両方が設定されている場合は `DISCORD_FREE_RESPONSE_AUTO_THREAD` が `config.yaml` の項目より優先されます。他のすべての `discord.*` の橋渡しと同じく、YAML の値は環境変数が未設定のときにその初期値を与えるだけです。

#### `discord.auto_thread` {#discordautothread}

**型:** 真偽値 — **既定値:** `true`

有効にすると、通常のテキストチャンネルでの `@mention` ごとに、会話用の新しいスレッドを自動で作ります。メインのチャンネルが散らからず、会話ごとに独立したセッション履歴を持てます。スレッドが作られたあとは、そのスレッド内のメッセージに `@mention` は不要です。ボットは自分がすでに参加していることを分かっています。複数のボットを使う構成でこのスレッド内の省略をやめるには、[`thread_require_mention`](#discordthread_require_mention) を `true` にします。

既存のスレッドや DM に送られたメッセージは、この設定の影響を受けません。`discord.no_thread_channels` に挙げたチャンネルと、[`discord.free_response_auto_thread`](#discordfree_response_auto_thread) が `true` でない限り `discord.free_response_channels` に挙げたチャンネルも、自動スレッド化を通らずその場での返信になります。

#### `discord.reactions` {#discordreactions}

**型:** 真偽値 — **既定値:** `true`

見た目の合図として、ボットが絵文字のリアクションを付けるかどうかを制御します。
- 👀 メッセージの処理を開始したとき
- ✅ 応答を無事に送り終えたとき
- ❌ 処理の途中でエラーが起きたとき

リアクションが気になる場合や、ボットのロールに **Add Reactions** の権限がない場合は無効にしてください。

#### `discord.ignored_channels` {#discordignoredchannels}

**型:** 文字列またはリスト — **既定値:** `[]`

直接 `@mentioned` されても、ボットが**決して**応答しないチャンネルの ID です。これは最優先で扱われます。チャンネルがこの一覧にあれば、`require_mention` や `free_response_channels` をはじめどの設定にかかわらず、そこでのすべてのメッセージを黙って無視します。

```yaml
# String format
discord:
  ignored_channels: "1234567890,9876543210"

# List format
discord:
  ignored_channels:
    - 1234567890
    - 9876543210
```

スレッドの親チャンネルがこの一覧にある場合、そのスレッド内のメッセージも無視されます。

#### `discord.no_thread_channels` {#discordnothreadchannels}

**型:** 文字列またはリスト — **既定値:** `[]`

スレッドを自動作成せず、チャンネル内で直接応答するチャンネルの ID です。`auto_thread` が `true`（既定）のときにだけ効きます。これらのチャンネルでは、新しいスレッドを立てるのではなく、ふつうのメッセージのようにその場で返します。

```yaml
discord:
  no_thread_channels:
    - 1234567890  # Bot responds inline here
```

ボットとのやり取り専用のチャンネルなど、スレッドがかえって雑音になる場所に向いています。

#### `discord.channel_prompts` {#discordchannelprompts}

**型:** マッピング — **既定値:** `{}`

該当する Discord のチャンネルやスレッドでのやり取りのたびに差し込まれる、チャンネルごとの一時的なシステムプロンプトです。記録として履歴に残りません。

```yaml
discord:
  channel_prompts:
    "1234567890": |
      This channel is for research tasks. Prefer deep comparisons,
      citations, and concise synthesis.
    "9876543210": |
      This forum is for therapy-style support. Be warm, grounded,
      and non-judgmental.
```

振る舞いは次のとおりです。
- スレッド / チャンネルの ID が正確に一致するものが優先されます。
- メッセージがスレッドやフォーラムの投稿に届き、そのスレッドに該当する項目がない場合、Hermes は親のチャンネル / フォーラムの ID を参照します。
- プロンプトは実行時に一時的に適用されるので、書き換えれば過去のセッション履歴を手直しすることなく、以降のやり取りにすぐ反映されます。

#### `discord.history_backfill` {#discordhistorybackfill}

**型:** 真偽値 — **既定値:** `true`

有効にすると、`@mention` のたびに取りこぼしたチャンネルのメッセージを回収します。`require_mention: true` では、ボットは自分をタグ付けしたメッセージしか処理しないので、チャンネル内の他のやり取りはセッションの記録から見えません。履歴の補完は、呼ばれた時点で直近のチャンネル履歴をさかのぼり、ボットの前回の応答から今回のメンションまでのメッセージを集めて、文脈として添えます。

場面ごとの振る舞いは次のとおりです。

- **サーバーのチャンネル**（`require_mention: true` の場合）: ボットの前回の応答以降のチャンネルをさかのぼります。ボットが呼ばれていない間に他の参加者が投稿していた場合に役立ちます。
- **スレッド**: スレッドの中だけをさかのぼります。スレッドに対する Discord の `channel.history()` はそのスレッドのメッセージだけを返し、親チャンネルは返しません。スレッドはたいてい完結した会話なので、この範囲が適切です。
- **DM**: 行いません。DM ではすべてのメッセージがボットを動かすので、セッションの記録はすでに揃っており、埋めるべき隙間がありません。
- **自由応答チャンネル**と**ボットが自分で作ったスレッド**: 同じ理由で行いません。メンションによる制御がないので隙間が生じません。

利用者ごとのセッション（既定の `group_sessions_per_user: true`）でも効果があります。ある利用者のセッションには、チャンネルの他の参加者が書いた内容も、その人自身がボットをタグ付けする前に書いた内容も入っていません。補完はその両方の隙間を埋めます。

```yaml
discord:
  history_backfill: true   # default
```

止めるには次のようにします。

```yaml
discord:
  history_backfill: false
```

> **補足:** ボットが処理している*最中*に届いたメッセージ（きっかけとなったメッセージから応答までの間のもの）は取り込まれません。これは割り切りで、利用者が送り直すか、もう一度タグを付ければ済みます。

#### `discord.history_backfill_limit` {#discordhistorybackfilllimit}

**型:** 整数 — **既定値:** `50`

チャンネルの文脈を回収するときに、さかのぼって調べるメッセージ数の上限です。実際には、そのチャンネルでのボット自身の最後のメッセージ、つまりやり取りの自然な区切りに当たった時点で、これよりずっと早く止まるのがふつうです。この上限は、直近の履歴にボットのメッセージがない冷えた状態や、間隔が大きく空いた場合のための安全弁です。

```yaml
discord:
  history_backfill: true
  history_backfill_limit: 50
```

#### `discord.missed_message_backfill` {#discordmissedmessagebackfill}

**型:** オブジェクト — **既定値:** 無効

Discord の WebSocket の再開可能な期間は、再起動やネットワーク障害の間に切れることがあります。その隙間に送られたメッセージは、生のゲートウェイイベントとしては届きません。この項目を有効にすると、Discord への再接続後に、設定したチャンネルとスレッドの履歴を範囲を区切って調べ、まだ処理していないメッセージを、生のイベントと同じ認可・メンション・チャンネル・重複排除・振り分けの経路に流します。

```yaml
discord:
  missed_message_backfill:
    enabled: true
    channels: ["123456789012345678"]
    window_seconds: 3600
    limit: 100
    max_dispatches: 10
    max_attempts: 3
```

`channels` が空の場合、Hermes は `discord.free_response_channels` を使います。到達できるサーバーのテキストチャンネルをすべて調べさせたいときにだけ `"*"` を設定してください。回収の台帳はプロファイルごとに `gateway/discord_message_recovery.db` に保存され、いったん応答したメッセージがあとの再起動で再び流されることを防ぎます。あるメッセージは、そのやり取りが最終的な返信を届けた時点で応答済みとみなされます。その返信に Discord の返信参照が付いていたかどうかは問いません（`reply_to_mode: "off"` の場合、逐次生成された返信、メディアだけの返信も含みます）。

`max_dispatches` は 1 回の走査の上限で、`max_attempts`（既定 3）は 1 つのメッセージが再び流される回数の生涯の上限です。やり取りが失敗し続けるメッセージが再接続のたびに再実行されることはありません。`window_seconds` は常に守られます。チャンネルごとの走査位置は範囲を狭めることはあっても、この期間より過去にさかのぼることはありません。

#### `group_sessions_per_user` {#groupsessionsperuser}

**型:** 真偽値 — **既定値:** `true`

これは Discord に限らないゲートウェイ全体の設定で、同じチャンネルにいる利用者のセッション履歴を分離するかどうかを制御します。

`true` のとき、`#research` で話している Alice と Bob は、それぞれ Hermes と別々の会話を持ちます。`false` のとき、チャンネル全体で 1 つの会話の記録と 1 つの実行中エージェントの枠を共有します。

```yaml
group_sessions_per_user: true
```

それぞれのモードが何を意味するかは、上の [セッションモデル](#session-model-in-discord) の節を参照してください。

#### `display.tool_progress` {#displaytoolprogress}

**型:** 文字列 — **既定値:** `"all"` — **値:** `off`、`new`、`all`、`verbose`

処理中にボットがチャットへ進捗のメッセージ（「ファイルを読み込み中…」「ターミナルのコマンドを実行中…」など）を送るかどうかを制御します。これはすべてのプラットフォームに適用されるゲートウェイ全体の設定です。

```yaml
display:
  tool_progress: "all"    # off | new | all | verbose
```

- `off` — 進捗のメッセージを出さない
- `new` — 1 回のやり取りにつき最初のツール呼び出しだけを出す
- `all` — すべてのツール呼び出しを出す（ゲートウェイのメッセージでは 40 文字に切り詰めます）
- `verbose` — ツール呼び出しの詳細をすべて出す（長いメッセージになることがあります）

#### `display.tool_progress_command` {#displaytoolprogresscommand}

**型:** 真偽値 — **既定値:** `false`

有効にすると、ゲートウェイで `/verbose` のスラッシュコマンドが使えるようになり、config.yaml を編集しなくてもツール進捗のモードを順に切り替えられます（`off → new → all → verbose → off`）。

```yaml
display:
  tool_progress_command: true
```

#### `display.reasoning_style` {#displayreasoningstyle}

**型:** 文字列 — **既定値（Discord）:** `"subtext"` — **値:** `code`、`blockquote`、`subtext`

推論の表示を有効にしているときに、モデルの推論の部分をどう見せるかを制御します。Discord の既定は `subtext` で、Discord のネイティブな `-# ` による小さな灰色の補足表示を使うため、推論は答えより控えめに見えます。`blockquote` は `>` の引用として、`code`（他のプラットフォームでの既定）はコードブロックとして表示します。長い推論は先頭 15 行に畳まれます。

```yaml
display:
  platforms:
    discord:
      reasoning_style: subtext   # code | blockquote | subtext
```

## スラッシュコマンドのアクセス制御 {#slash-command-access-control}

既定では、許可されたすべての利用者がすべてのスラッシュコマンドを実行できます。許可一覧を、すべてのスラッシュコマンドを使える**管理者**と、明示的に有効にしたコマンドだけを使える**一般利用者**に分けるには、Discord プラットフォームの `extra` ブロックに `allow_admin_from` と `user_allowed_commands` を追加します。

```yaml
gateway:
  platforms:
    discord:
      extra:
        # Existing user allowlist (unchanged)
        allow_from:
          - "123456789012345678"  # admin user ID
          - "999888777666555444"  # regular user ID

        # NEW — admins get all slash commands (built-in + plugin)
        allow_admin_from:
          - "123456789012345678"

        # NEW — non-admin allowed users can only run these slash commands.
        # /help and /whoami are always allowed so users can see their access.
        user_allowed_commands:
          - status
          - model
          - history

        # Optional: separate admin / command lists for server channels
        group_allow_admin_from:
          - "123456789012345678"
        group_user_allowed_commands:
          - status
```

**振る舞い:**

- ある範囲（DM またはサーバーのチャンネル）の `allow_admin_from` に入っている利用者は、登録されている**すべて**のスラッシュコマンドを、組み込みのものもプラグインが登録したものも含めて、実行時のコマンド一覧を通じて実行できます。
- `allow_admin_from` に入っていない利用者が実行できるのは、`user_allowed_commands` に挙げたコマンドと、常に許可されている最低限の `/help` と `/whoami` だけです。
- ふつうの会話（スラッシュでないメッセージ）は影響を受けません。管理者でない利用者もこれまでどおりエージェントと会話できます。任意のコマンドを起動できないだけです。
- **以前との互換性:** ある範囲について `allow_admin_from` を設定していない場合、その範囲ではスラッシュコマンドの制御が無効になります。既存の環境は何も変えずに動き続けます。
- DM の管理者であることは、サーバーのチャンネルでの管理者であることを意味しません。範囲ごとに別の管理者一覧を持ちます。

`/whoami` を使うと、いまの範囲、自分の区分（管理者 / 利用者 / 制限なし）、実行できるスラッシュコマンドが分かります。

## 対話形式のモデル選択 {#interactive-model-picker}

Discord のチャンネルで引数なしの `/model` を送ると、ドロップダウン形式のモデル選択が開きます。

1. **プロバイダーの選択** — 利用できるプロバイダー（最大 25 件）を並べたドロップダウン。
2. **モデルの選択** — 選んだプロバイダーのモデルを並べた 2 つ目のドロップダウン（最大 25 件）。

この選択画面は 120 秒で時間切れになります。操作できるのは認可された利用者（`DISCORD_ALLOWED_USERS` に入っている人）だけです。モデル名が分かっているなら `/model <name>` と直接入力してください。

## スキルのネイティブなスラッシュコマンド {#native-slash-commands-for-skills}

Hermes は、導入済みのスキルを **Discord のネイティブなアプリケーションコマンド**として自動で登録します。つまりスキルは、組み込みのコマンドと並んで Discord の `/` の候補一覧に出てきます。

- スキルはそれぞれ Discord のスラッシュコマンドになります（`/code-review`、`/ascii-art` など）
- スキルは任意の `args` という文字列の引数を受け取れます
- Discord にはボット 1 つあたり 100 個というアプリケーションコマンドの上限があります。空きより多くのスキルがある場合、あふれた分は登録されず、ログに警告が残ります
- スキルは、`/model`、`/reset`、`/bg` といった組み込みのコマンドと一緒に、ボットの起動時に登録されます

追加の設定は要りません。`hermes skills install` で導入したスキルは、次回ゲートウェイを再起動したときに Discord のスラッシュコマンドとして自動登録されます。

### スラッシュコマンドの登録を止める {#disabling-slash-command-registration}

同じ Discord アプリケーションに対して複数の Hermes ゲートウェイを動かしている場合（検証用と本番用など）、グローバルなスラッシュコマンドの登録を持つのは 1 つだけにしてください。そうしないと最後に起動したものが勝ち、登録が行ったり来たりします。「追従する側」のゲートウェイではスラッシュの登録を無効にします。

```yaml
gateway:
  platforms:
    discord:
      extra:
        slash_commands: false   # default: true
```

「主となる」ゲートウェイでこれを `true` のままにしておけば、組み込みのコマンドと導入済みスキルのグローバルな `/` メニューという通常の振る舞いが保たれます。

## メディアの送信（本文中の `MEDIA:` タグ） {#sending-media-inline-media-tags}

Discord のアダプターは、エージェントの応答に書かれた `MEDIA:/path/to/file` というタグを通じて、よくあるメディア形式のネイティブなファイル送信に対応しています。アダプターはタグを取り除き、ファイルを自動で送信します。

| 種類 | 送られ方 |
|---|---|
| 画像（PNG/JPG/WebP） | Discord のネイティブな画像添付として、プレビュー付きで表示されます |
| アニメーション GIF | `send_animation` が `animation.gif` として送るので、静止画のサムネイルではなく Discord 上で動きます |
| 動画（MP4/MOV） | `send_video` — ネイティブの動画プレーヤー |
| 音声 / ボイス | `send_voice` — 可能ならネイティブのボイスメッセージ、難しければファイル添付 |
| 文書（PDF/ZIP/docx など） | `send_document` — ダウンロードボタン付きのネイティブな添付 |

Discord の 1 回あたりのアップロード上限は、サーバーのブースト段階によって変わります（無料で 25 MB、最大 500 MB）。HTTP 413 が返ってきた場合、Hermes は黙って失敗するのではなく、ローカルの保存先パスへのリンクを返します。

## あらゆる種類のファイルの受け取り {#receiving-arbitrary-file-types}

利用者がアップロードするファイルは、種類を問わず受け付けます。判断の基準はエージェントに話しかける権限があるかどうかであって、拡張子ではありません。アップロードされたものはすべてダウンロードされ、`~/.hermes/cache/documents/` に保存され、`DOCUMENT` 種別のメッセージイベントとしてエージェントに渡されるので、`terminal`（`ffprobe`、`unzip`、`file`、`strings` など）や `read_file` で中身を調べられます。

- 既知の種類（PDF、docx/xlsx/pptx、zip、画像 / 音声 / 動画など）は、正確な MIME を保ちます。
- 未知の種類は、アップロード時に申告された content type か、それがなければ `application/octet-stream` になります。
- UTF-8 として読める小さいファイル（テキスト、コード、設定、HTML、CSS、JSON、YAML など）は、100 KiB までなら内容がそのままプロンプトに差し込まれます。読めないバイナリのファイルは、パスを指し示す注記だけとして渡されるので（Docker / Modal のサンドボックス化されたターミナル向けには `to_agent_visible_cache_path` で自動的に変換されます）、コンテキストを膨らませることはありません。

受け取り側の制限は、1 ファイルあたりのサイズ上限（既定 32 MiB）だけです。

```yaml
discord:
  # Optional — raise/disable the per-file size cap. Default is 32 MiB.
  # The whole file is held in memory while being cached, so unlimited
  # uploads carry a real memory cost.
  max_attachment_bytes: 33554432   # bytes; 0 = unlimited
```

同じ意味の環境変数は `DISCORD_MAX_ATTACHMENT_BYTES=33554432`（上限なしは `0`）です。

以前の `discord.allow_any_attachment` という項目は、いまは何もしません。どんな種類のファイルも常に受け付けるためで、既存の設定がエラーにならないように残してあるだけです。

:::warning 上限なしのメモリ消費
サイズ上限を無効にする（`max_attachment_bytes: 0`）と、利用者が数 GB のファイルをボットに投げたとき、ゲートウェイはそれを律儀にメモリ経由で受け止めながらディスクへ保存します。信頼できる 1 人用の環境にだけ設定してください。共有のボットでは既定の 32 MiB のままにするか、上げるとしても控えめにしてください。
:::

## 対話形式の問い合わせ（clarify） {#interactive-prompts-clarify}

エージェントが `clarify` ツールを呼んだとき — どの進め方がよいか尋ねる、作業後の感想を聞く、判断の前に確認する、といった場面で — Discord では**選択肢ごとに 1 つのボタン**として質問が表示されます。

> ダッシュボードにはどのフレームワークを使いましょうか？
>
> [1. Next.js] [2. Remix] [3. Astro] [その他（自由に入力）]

番号の付いたボタンをクリックして答えるか、**その他** をクリックして自由に書いて答えます（そのチャンネルで次に送ったメッセージが答えになります）。選択肢のない自由形式の `clarify` では、ボタンは出ず、次のメッセージをそのまま受け取ります。

一度選ぶとボタンは無効になるので、二度押しで二重に確定することはありません。応答の制限時間は `~/.hermes/config.yaml` の `agent.clarify_timeout` で設定します（既定は `3600` 秒、`0` 以下で無制限）。制限時間内に答えないと、エージェントは所定の合図とともに待機を解き、止まったままにならずに進みます。

### 問い合わせの見た目 {#prompt-layout}

対話形式の問い合わせ（コマンドの承認、`clarify` の質問、スラッシュコマンドの確認）は、同じ見た目を共有します。**ふつうのメッセージ**が中身をすべて持ち — コマンドと、それが確認対象になった理由、承認の期限、あるいは質問と返信のしかた — その下の**埋め込みカード**は見出しだけで、ボタンはカードの下に並びます。判断に必要なものはすべて本文にあるので、埋め込みを隠したり切り離したりする環境でも問い合わせは正しく読めますし、埋め込みを表示する環境でも同じ内容が二度出ることはありません。

## ホームチャンネル {#home-channel}

ボットが自発的なメッセージ（cron ジョブの出力、リマインダー、通知など）を送る「ホームチャンネル」を指定できます。設定の方法は 2 つあります。

### スラッシュコマンドを使う {#using-the-slash-command}

ボットがいる任意の Discord チャンネルで `/sethome` と入力します。そのチャンネルがホームチャンネルになります。

### 手作業での設定 {#manual-configuration}

`~/.hermes/.env` に次を追加します。

```bash
DISCORD_HOME_CHANNEL=123456789012345678
DISCORD_HOME_CHANNEL_NAME="#bot-updates"
```

ID は実際のチャンネル ID に置き換えてください（開発者モードを有効にして右クリック → チャンネル ID をコピー）。

## ボイスメッセージ {#voice-messages}

Hermes Agent は Discord のボイスメッセージに対応しています。

- **受信したボイスメッセージ**は、設定した音声認識のプロバイダーで自動的に文字起こしされます。ローカルの `faster-whisper`（キー不要）、Groq Whisper（`GROQ_API_KEY`）、OpenAI Whisper（`VOICE_TOOLS_OPENAI_KEY`）が使えます。
- **読み上げ**: `/voice tts` を使うと、テキストの返信と一緒に音声での応答も送られます。
- **Discord のボイスチャンネル**: Hermes はボイスチャンネルに参加して、話している人の声を聞き、その場で話し返すこともできます。

設定と運用の詳しい手引きは次を参照してください。
- [音声モード](/hermes/docs/user-guide/features/voice-mode/)
- [Hermes で音声モードを使う](/hermes/docs/guides/use-voice-mode-with-hermes/)

### ボイスチャンネルの音の演出（環境音 + 音声での相づち） {#voice-channel-audio-effects-ambient-verbal-acks}

ボットがボイスチャンネルにいるとき、より会話らしい雰囲気を出せます。作業を始める前に短い相づち（「ちょっと調べてみますね」）を返し、ツールが動いている間はうっすらと「考え中」の環境音を流します。話すときは環境音が下がり、話し終えると戻ります。Grok の音声モードに似た感じです。

discord.py は 1 つの接続につき 1 つの音声ストリームしか再生しないので、Hermes は送出側のストリームにソフトウェアのミキサーを入れ、環境音のループ、相づち、読み上げの返答を 1 つのストリームにまとめます。互いを打ち切るのではなく重ねて流せます。

これは**既定では無効**です。`config.yaml` で有効にします。

```yaml
discord:
  voice_fx:
    enabled: true          # master switch
    ambient_enabled: true  # idle "thinking" bed while tools run
    ambient_path: ""       # custom loop file (any audio format); "" = built-in synthesised pad
    ambient_gain: 0.18     # idle bed loudness (0.0–1.0)
    duck_gain: 0.06        # ambient loudness while the bot is speaking
    speech_gain: 1.0       # TTS / acknowledgement loudness
    ack_enabled: true      # speak a short phrase before the first tool call of a turn
    ack_phrases:           # picked at random; set to [] to disable the spoken ack
      - "Let me look into that."
      - "One moment."
      - "Checking on that now."
```

補足:
- 明示的な `/voice leave` か手動での切断まで、ボットをボイスチャンネルに留まらせたい場合は `voice_channel_inactivity_timeout_seconds: 0` を設定します。既定値は、これまでどおり 300 秒で自動的に退出する動きを保ちます。
- `voice_playback_timeout_seconds` は下限であって、長い読み上げに対する上限ではありません。Hermes は生成した音声の長さを調べ、設定した下限より長ければ `duration + 30s` だけ待ちます。
- 相づちは 1 回のやり取りにつき最大 1 回、ボットがボイスチャンネルにいてミキサーが動いているときだけ流れます。設定済みの読み上げのプロバイダーを使います。
- `ambient_path` には `ffmpeg` が解釈できるファイルなら何でも指定でき、継ぎ目なく繰り返されます。空のままにすると、組み込みの合成音が使われます（素材の用意は不要です）。
- 設定はすべて `config.yaml` にあります（`.env` ではありません）。秘密情報ではなく振る舞いの設定だからです。
- `voice_fx.enabled` が `false` のときは、音声の再生は元の 1 回ごとの経路を使い、何も変わりません。

## フォーラムチャンネル {#forum-channels}

Discord のフォーラムチャンネル（種別 15）は直接のメッセージを受け付けません。フォーラムへの投稿はすべてスレッドである必要があります。Hermes はフォーラムチャンネルを自動で見分け、そこへ送る必要が生じるたびに新しいスレッドの投稿を作ります。そのため、テキストの返信、読み上げ、画像、ボイスメッセージ、ファイルの添付が、エージェント側で特別なことをしなくてもすべて動きます。

- **スレッド名**はメッセージの最初の行から作られます（Markdown の見出し記号は取り除き、100 文字で切ります）。添付だけのメッセージでは、ファイル名がスレッド名になります。
- **添付**は新しいスレッドの最初のメッセージに一緒に付きます。別途アップロードする手順も、途中まで送られる状態もありません。
- **1 回の送信につき 1 つのスレッド**: フォーラムへの送信ごとに新しいスレッドができます。同じフォーラムへ続けて送ると、それぞれ別のスレッドになります。
- **判別は 3 段構え**: まずチャンネル一覧のキャッシュ、次にプロセス内の判定キャッシュ、最後の手段として `GET /channels/{id}` の実際の問い合わせ（その結果はプロセスが動いている間は記憶されます）。

一覧を更新すると（対応しているプラットフォームでの `/channels refresh`、またはゲートウェイの再起動）、ボットの起動後に作られたフォーラムチャンネルもキャッシュに入ります。

## 困ったときは {#troubleshooting}

### ボットはオンラインなのにメッセージへ応答しない {#bot-is-online-but-not-responding-to-messages}

**原因**: Message Content Intent が無効になっているか、アクセス方針が何も設定されていないために Discord の認可が閉じる側へ倒れています。

**対処**:

1. [開発者ポータル](https://discord.com/developers/applications) → 対象のアプリ → Bot → Privileged Gateway Intents と進み、**Message Content Intent** を有効にして Save Changes をクリックします。
2. Discord のアクセス方針が少なくとも 1 つ設定されていることを確かめます。

   ```bash
   # recommended: allow specific users
   DISCORD_ALLOWED_USERS=284102345871466496

   # or allow a trusted guild/dev bot to behave like pre-0.18 Discord
   DISCORD_ALLOW_ALL_USERS=true
   ```

3. ゲートウェイを再起動します。

   ```bash
   hermes gateway restart
   ```

ゲートウェイのログでは Discord に接続済みと出ていて REST API の確認も通るのに、受信したメッセージがすべて無反応な場合は、`~/.hermes/logs/gateway.log` に次の警告がないか探してください。

```text
No Discord access policy configured; inbound Discord messages will be denied by default.
```

Hermes 0.18 は、外部から到達できるアダプターについて意図的に閉じる側へ倒します。`DISCORD_ALLOWED_USERS` も `DISCORD_ALLOWED_ROLES` も `DISCORD_ALLOWED_CHANNELS` もなく、全員許可の明示もない Discord ボットは、接続には成功しますが、通常のメッセージ処理の前に受信した利用者を拒否します。

### 起動時の「Privileged intents」/ `PrivilegedIntentsRequired` エラー {#privileged-intents-privilegedintentsrequired-error-on-startup}

**原因**: Hermes が要求した特権ゲートウェイインテントが、開発者ポータルでそのボットに対して有効になっていません。Discord はその場合 WebSocket の接続を拒否します。Hermes は常に **Message Content Intent** を要求します。許可一覧に（数値の ID ではなく）ユーザー名を使っている場合や `DISCORD_ALLOWED_ROLES` を設定している場合は、**Server Members Intent** も要求します。Presence Intent は不要です。

**対処**:

1. [開発者ポータル](https://discord.com/developers/applications) → 対象のアプリ → Bot → Privileged Gateway Intents と進みます。
2. **Message Content Intent** を有効にします（必須）。ユーザー名やロールの許可一覧を使っている場合は **Server Members Intent** も有効にします。
3. **Save Changes** をクリックし、ゲートウェイを再起動します（`hermes gateway restart`）。

ゲートウェイのログには、Hermes が要求したインテントの名前が出ているはずです。有効にするまで Discord は接続を拒否し続けます。これはポータル側の設定の誤りであって、ネットワークの不調ではありません。

### 特定のチャンネルでボットがメッセージを見られない {#bot-cant-see-messages-in-a-specific-channel}

**原因**: ボットのロールに、そのチャンネルを閲覧する権限がありません。

**対処**: Discord でそのチャンネルの設定 → 権限 と進み、**View Channel** と **Read Message History** を有効にしたボットのロールを追加します。

### 403 Forbidden のエラー {#403-forbidden-errors}

**原因**: ボットに必要な権限が足りていません。

**対処**: 手順 5 の URL を使って正しい権限でボットを招待し直すか、サーバー設定 → ロール でボットのロールの権限を手作業で調整します。

### ボットがオフラインのまま {#bot-is-offline}

**原因**: Hermes のゲートウェイが動いていないか、トークンが正しくありません。

**対処**: `hermes gateway` が動いていることを確かめます。`.env` の `DISCORD_BOT_TOKEN` を確認してください。最近トークンをリセットしたなら、更新してください。

### 「User not allowed」/ ボットに無視される {#user-not-allowed-bot-ignores-you}

**原因**: 自分のユーザー ID が `DISCORD_ALLOWED_USERS` に入っていません。

**対処**: `~/.hermes/.env` の `DISCORD_ALLOWED_USERS` に自分のユーザー ID を追加し、ゲートウェイを再起動します。

### 同じチャンネルの人どうしで、意図せず文脈が共有される {#people-in-the-same-channel-are-sharing-context-unexpectedly}

**原因**: `group_sessions_per_user` が無効になっているか、その場面のメッセージについてプラットフォームがユーザー ID を提供できていません。

**対処**: `~/.hermes/config.yaml` に次を設定し、ゲートウェイを再起動します。

```yaml
group_sessions_per_user: true
```

部屋全体で会話を共有したいと考えているなら、無効のままで構いません。ただし記録も割り込みの振る舞いも共有されることは見込んでおいてください。

## セキュリティ {#security}

:::warning
ボットとやり取りできる人を絞るために、`DISCORD_ALLOWED_USERS`（または `DISCORD_ALLOWED_ROLES`）を必ず設定してください。どちらもない場合、ゲートウェイは安全側に倒してすべての利用者を拒否します。認可するのは信頼できる人だけにしてください。認可された利用者は、ツールの利用やシステムへのアクセスを含め、エージェントの能力をすべて使えます。
:::

### ロールに基づくアクセス制御 {#role-based-access-control}

個々の利用者の一覧ではなくロールでアクセスを管理しているサーバー（モデレーターの集まり、サポート担当、社内ツールなど）では、`DISCORD_ALLOWED_ROLES` にロール ID をカンマ区切りで指定します。そのロールのいずれかを持つメンバーが認可されます。

```bash
# ~/.hermes/.env — works alongside or instead of DISCORD_ALLOWED_USERS
DISCORD_ALLOWED_ROLES=987654321098765432,876543210987654321
```

意味は次のとおりです。

- **利用者の許可一覧とは OR。** ID が `DISCORD_ALLOWED_USERS` にあるか、**または** `DISCORD_ALLOWED_ROLES` のいずれかのロールを持っていれば認可されます。
- **Server Members Intent が自動で有効になります。** `DISCORD_ALLOWED_ROLES` を設定すると、接続時に Members インテントを有効にします。Discord がメンバーの記録と一緒にロールの情報を送るために必要です。
- **名前ではなくロール ID です。** Discord から取得してください。**ユーザー設定 → 詳細設定 → 開発者モードを ON** にして、ロールを右クリック → **ロール ID をコピー** です。
- **DM での扱い。** DM ではロールの確認が共通のサーバーを調べます。共有しているどれかのサーバーで許可されたロールを持っていれば、DM でも認可されます。

モデレーターの入れ替わりが多いところでは、これが適した形です。ロールを付与した瞬間に新しいモデレーターがアクセスでき、`.env` の編集もゲートウェイの再起動も要りません。

### メンションの制御 {#mention-control}

既定では、返信に `@everyone`、`@here`、ロールのメンションが含まれていても、Hermes はボットがそれらで通知を飛ばすのを止めます。言い回しの拙いプロンプトや、そのまま反復された利用者の文言で、サーバー全体に通知が飛ぶのを防ぐためです。個別の `@user` への通知と、返信参照による通知（「〜に返信中」という小さな表示）はそのまま有効なので、ふつうの会話は成り立ちます。

この既定値は、環境変数でも `config.yaml` でも緩められます。

```yaml
# ~/.hermes/config.yaml
discord:
  allow_mentions:
    everyone: false      # allow the bot to ping @everyone / @here
    roles: false         # allow the bot to ping @role mentions
    users: true          # allow the bot to ping individual @users
    replied_user: true   # ping the author when replying to their message
```

```bash
# ~/.hermes/.env — env vars win over config.yaml
DISCORD_ALLOW_MENTION_EVERYONE=false
DISCORD_ALLOW_MENTION_ROLES=false
DISCORD_ALLOW_MENTION_USERS=true
DISCORD_ALLOW_MENTION_REPLIED_USER=true
```

:::tip
必要な理由がはっきり分かっているのでなければ、`everyone` と `roles` は `false` のままにしてください。LLM は、ごくふつうに見える応答の中に `@everyone` という文字列を混ぜてしまうことがよくあります。この保護がなければ、それだけでサーバーの全員に通知が飛びます。
:::

Hermes Agent の運用を安全にする方法の詳細は、[セキュリティの手引き](/hermes/docs/user-guide/security/) を参照してください。
