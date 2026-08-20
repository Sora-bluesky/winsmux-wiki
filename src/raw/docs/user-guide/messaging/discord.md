---
title: "Discord"
description: "Hermes Agent を Discord ボットとして設定する"
upstream_path: user-guide/messaging/discord.md
upstream_blob: f6da7e0c4dfa6bddaf2f7da5e3f31f6f5cfc31b9
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/discord
---

# Discord の設定 {#discord-setup}

Hermes Agent は Discord にボットとして参加し、ダイレクトメッセージやサーバーのチャンネルから AI アシスタントと会話できるようにします。ボットは受け取ったメッセージを Hermes Agent のパイプライン（ツール実行・メモリ・推論を含む）に通し、その場で返答します。テキスト、ボイスメッセージ、ファイル添付、スラッシュコマンドに対応しています。

設定の前に、多くの人がまず知りたいところから説明します。サーバーに入れたあと、Hermes がどう振る舞うかです。

## Hermes の振る舞い {#how-hermes-behaves}

| 場面 | 振る舞い |
|---------|----------|
| **DM** | Hermes はすべてのメッセージに応答します。`@mention` は不要です。DM ごとに独立したセッションを持ちます。 |
| **サーバーのチャンネル** | 既定では、`@mention` されたときだけ応答します。メンションせずにチャンネルへ投稿しても、Hermes はそのメッセージを無視します。 |
| **自由応答チャンネル** | `DISCORD_FREE_RESPONSE_CHANNELS` で特定のチャンネルをメンション不要にできます。`DISCORD_REQUIRE_MENTION=false` にすれば全体でメンションを不要にできます。これらのチャンネルではメッセージにその場で返答し、自動スレッド化は行われないので、チャンネルは気軽なチャットのまま使えます。 |
| **スレッド** | Hermes は同じスレッド内で返答します。そのスレッドまたは親チャンネルが自由応答として設定されていない限り、メンションの規則はそのまま適用されます。セッション履歴の面では、スレッドは親チャンネルから切り離されています。 |
| **複数人がいる共有チャンネル** | 既定では、安全性と分かりやすさのために、チャンネル内でもユーザーごとにセッション履歴を分離します。同じチャンネルで話している 2 人が 1 つの記録を共有することは、明示的に無効化しない限りありません。 |
| **他のユーザーをメンションしたメッセージ** | `DISCORD_IGNORE_NO_MENTION` が `true`（既定）のとき、メッセージが他のユーザーを @メンションしていてボットには触れていない場合、Hermes は黙っています。他の人に向けられた会話にボットが割り込まないようにするためです。誰がメンションされていても応答してほしい場合は `false` にします。これはサーバーのチャンネルにだけ適用され、DM には適用されません。 |

:::tip
毎回タグを付けずに Hermes と話せる、ふつうのボット用チャンネルがほしいときは、そのチャンネルを `DISCORD_FREE_RESPONSE_CHANNELS` に追加してください。
:::

### Discord ゲートウェイのしくみ {#discord-gateway-model}

Discord 上の Hermes は、状態を持たずに返事を返す Webhook ではありません。メッセージングゲートウェイ全体を通るため、受信したメッセージは次の順に処理されます。

1. 認可（`DISCORD_ALLOWED_USERS`）
2. メンション／自由応答の判定
3. セッションの特定
4. セッション記録の読み込み
5. ツール・メモリ・スラッシュコマンドを含む、通常の Hermes エージェント実行
6. Discord への応答の送信

そのため、人の多いサーバーでの振る舞いは、Discord 側の配送とHermes 側のセッション方針の両方で決まります。

### Discord でのセッションのしくみ {#session-model-in-discord}

既定では次のようになります。

- DM ごとに独立したセッションを持つ
- サーバーのスレッドごとに独立したセッションの区画を持つ
- 共有チャンネルでは、そのチャンネル内でユーザーごとにセッションを持つ

つまり、Alice と Bob が `#research` で Hermes に話しかけた場合、見えているチャンネルは同じでも、Hermes は既定でそれらを別々の会話として扱います。

これは `config.yaml` で制御します。

```yaml
group_sessions_per_user: true
```

部屋全体で 1 つの会話を共有したいと明確に望むときだけ、`false` にします。

```yaml
group_sessions_per_user: false
```

共有セッションは共同作業の部屋では役に立ちますが、次のことも意味します。

- コンテキストの伸びとトークン費用を全員で分け合う
- 誰か 1 人のツールを多用する長い作業が、他の全員のコンテキストを膨らませる
- 誰か 1 人の実行中の処理が、同じ部屋にいる別の人の追加の問いかけを中断させる

### 割り込みと同時実行 {#interrupts-and-concurrency}

Hermes は実行中のエージェントをセッションキーで管理します。

既定の `group_sessions_per_user: true` の場合は次のとおりです。

- Alice が自分の実行中の依頼を止めても、影響を受けるのはそのチャンネルにおける Alice のセッションだけです
- Bob は同じチャンネルで話し続けられ、Alice の履歴を引き継ぐことも、Alice の実行を止めてしまうこともありません

`group_sessions_per_user: false` の場合は次のとおりです。

- そのチャンネル／スレッドの実行枠を部屋全体で 1 つ共有します
- 別々の人からの続きのメッセージが、互いを中断したり順番待ちになったりします

ここからは、Discord の開発者ポータルでボットを作るところから最初のメッセージを送るまで、設定の手順をひととおり案内します。

### ゲートウェイの WebSocket の健全性 {#gateway-websocket-health}

Discord の REST とゲートウェイの WebSocket は別々の通信路です。REST の応答が成功していても（`fetch_user()` が HTTP 200 を返していても）、ボットがゲートウェイのイベントをまだ受け取れる証拠にはなりません。そのため Hermes は、ready 状態、クライアント／ソケットの切断状態、ソケットが開いているか、ハートビート ACK の経過時間、ハートビート遅延が有限値かどうかを組み合わせて判断します。

設定した回数だけ連続して不健全と判定されると、アダプターは再試行可能な致命イベントを 1 回だけ出します。既存のゲートウェイ再接続ウォッチャーが新しいアダプターを作るため、Discord アダプター側で 2 つ目の無制限な再接続ループが走ることはありません。

秘密情報でないしきい値は `config.yaml` で設定します。

```yaml
discord:
  websocket_liveness_interval_seconds: 15
  websocket_liveness_failure_threshold: 2
  websocket_heartbeat_ack_max_age_seconds: 60
  websocket_max_latency_seconds: 30
```

以前の `liveness_interval_seconds` と `liveness_failure_threshold` という名前は互換のために残っているだけで、REST の疎通確認を意味するものではなくなりました。

## 手順 1: Discord アプリケーションを作る {#step-1-create-a-discord-application}

1. [Discord Developer Portal](https://discord.com/developers/applications) を開き、Discord アカウントでサインインします。
2. 右上の **New Application** をクリックします。
3. アプリケーションの名前（例: 「Hermes Agent」）を入力し、開発者向け利用規約に同意します。
4. **Create** をクリックします。

**General Information** のページが開きます。**Application ID** を控えておいてください。あとで招待 URL を組み立てるときに使います。

## 手順 2: ボットを作る {#step-2-create-the-bot}

1. 左のサイドバーで **Bot** をクリックします。
2. Discord がアプリケーション用のボットユーザーを自動で作ります。表示されるボットのユーザー名は変更できます。
3. **Authorization Flow** の下で次のように設定します。
   - **Public Bot** を **ON** にします。Discord が用意する招待リンクを使うために必要です（こちらを推奨します）。これで Installation タブが既定の認可 URL を生成できるようになります。
   - **Require OAuth2 Code Grant** は **OFF** のままにします。

:::tip
このページではボットのアイコンとバナーも設定できます。Discord 上でユーザーに見えるのはここで設定したものです。
:::

:::info[非公開ボットにする場合]
ボットを非公開のままにしたい場合（Public Bot = OFF）、Installation タブではなく手順 5 の **手動 URL** の方法を使う**必要があります**。Discord が用意するリンクは Public Bot が有効であることを前提にしています。
:::

## 手順 3: 特権ゲートウェイインテントを有効にする {#step-3-enable-privileged-gateway-intents}

ここが設定全体でいちばん重要な手順です。正しいインテントを有効にしないと、ボットは Discord に接続できても**メッセージの本文を読めません**。

**Bot** のページを下にスクロールして **Privileged Gateway Intents** を開きます。3 つのトグルがあります。

| インテント | 用途 | 必須か |
|--------|---------|-----------| 
| **Presence Intent** | ユーザーのオンライン／オフライン状態を見る | 任意 |
| **Server Members Intent** | メンバー一覧の取得、ユーザー名の解決 | **必須** |
| **Message Content Intent** | メッセージの本文を読む | **必須** |

**Server Members Intent と Message Content Intent の両方を** **ON** に切り替えてください。

- **Message Content Intent** がないと、ボットはメッセージのイベントを受け取っても本文が空になります。入力した内容がまったく見えない状態です。
- **Server Members Intent** がないと、許可ユーザー一覧のユーザー名を解決できず、誰がメッセージを送っているのか特定できないことがあります。

:::warning[Discord ボットが動かない原因の第 1 位]
ボットはオンラインなのにメッセージへまったく反応しないなら、まず **Message Content Intent** が無効になっていると考えてほぼ間違いありません。[Developer Portal](https://discord.com/developers/applications) に戻り、アプリケーション → Bot → Privileged Gateway Intents を開いて、**Message Content Intent** が ON になっていることを確かめてください。そのあと **Save Changes** をクリックします。
:::

**サーバー数について:**
- ボットが参加しているサーバーが **100 未満**なら、インテントは自由に切り替えられます。
- ボットが **100 以上**のサーバーに参加している場合、特権インテントを使うには Discord への審査申請が必要です。個人利用なら気にする必要はありません。

ページ下部の **Save Changes** をクリックします。

## 手順 4: ボットトークンを取得する {#step-4-get-the-bot-token}

ボットトークンは、Hermes Agent がボットとしてログインするための認証情報です。**Bot** のページを開いたまま進めます。

1. **Token** の欄で **Reset Token** をクリックします。
2. Discord アカウントで二要素認証を有効にしている場合は、2FA のコードを入力します。
3. 新しいトークンが表示されます。**すぐにコピーしてください。**

:::warning[トークンは一度しか表示されません]
トークンが表示されるのは 1 回だけです。紛失した場合はリセットして作り直す必要があります。トークンを公開したり Git にコミットしたりしないでください。これを手にした人はボットを完全に操作できます。
:::

トークンはパスワード管理ツールなど安全な場所に保管してください。手順 8 で使います。

## 手順 5: 招待 URL を作る {#step-5-generate-the-invite-url}

ボットをサーバーに招待するには OAuth2 の URL が必要です。方法は 2 つあります。

### 方法 A: Installation タブを使う（推奨） {#option-a-using-the-installation-tab-recommended}

:::note[Public Bot が必要です]
この方法は、手順 2 で **Public Bot** を **ON** にしていることが前提です。OFF にした場合は、下の手動 URL の方法を使ってください。
:::

1. 左のサイドバーで **Installation** をクリックします。
2. **Installation Contexts** で **Guild Install** を有効にします。
3. **Install Link** では **Discord Provided Link** を選びます。
4. Guild Install の **Default Install Settings** で次を設定します。
   - **Scopes**: `bot` と `applications.commands` を選ぶ
   - **Permissions**: 下に挙げた権限を選ぶ

### 方法 B: 手動 URL {#option-b-manual-url}

次の形式で招待 URL を直接組み立てられます。

```
https://discord.com/oauth2/authorize?client_id=YOUR_APP_ID&scope=bot+applications.commands&permissions=274878286912
```

`YOUR_APP_ID` は手順 1 の Application ID に置き換えてください。

### 必要な権限 {#required-permissions}

ボットに最低限必要な権限は次のとおりです。

- **View Channels** — アクセスできるチャンネルを見る
- **Send Messages** — メッセージに返答する
- **Embed Links** — 装飾のある応答を整形する
- **Attach Files** — 画像・音声・生成したファイルを送る
- **Read Message History** — 会話の流れを保つ

### 追加で推奨する権限 {#recommended-additional-permissions}

- **Send Messages in Threads** — スレッド内の会話で返答する
- **Add Reactions** — 受け取ったことを示すリアクションを付ける

### 権限の数値 {#permission-integers}

| 段階 | 権限の数値 | 含まれる権限 |
|-------|-------------------|-----------------|
| 最小 | `117760` | View Channels、Send Messages、Read Message History、Attach Files |
| 推奨 | `274878286912` | 上記すべてに加えて Embed Links、Send Messages in Threads、Add Reactions |

## 手順 6: サーバーに招待する {#step-6-invite-to-your-server}

1. 招待 URL（Installation タブのもの、または自分で組み立てた手動 URL）をブラウザーで開きます。
2. **Add to Server** のドロップダウンで自分のサーバーを選びます。
3. **Continue** をクリックし、続いて **Authorize** をクリックします。
4. CAPTCHA が表示されたら完了させます。

:::info
ボットを招待するには、その Discord サーバーで **Manage Server** の権限が必要です。ドロップダウンに自分のサーバーが出てこない場合は、サーバー管理者に招待リンクを使ってもらってください。
:::

認可が済むと、ボットがサーバーのメンバー一覧に現れます（Hermes のゲートウェイを起動するまではオフライン表示です）。

## 手順 7: 自分の Discord ユーザー ID を調べる {#step-7-find-your-discord-user-id}

Hermes Agent は、誰がボットとやり取りできるかを Discord のユーザー ID で管理します。調べ方は次のとおりです。

1. Discord（デスクトップ版または Web 版）を開きます。
2. **Settings** → **Advanced** と進み、**Developer Mode** を **ON** にします。
3. 設定を閉じます。
4. 自分のユーザー名（メッセージ、メンバー一覧、プロフィールのいずれか）を右クリックし、**Copy User ID** を選びます。

ユーザー ID は `284102345871466496` のような長い数字です。

:::tip
Developer Mode を有効にすると、同じ手順で**チャンネル ID** や**サーバー ID** もコピーできます。チャンネル名やサーバー名を右クリックして Copy ID を選ぶだけです。ホームチャンネルを手動で設定したいときはチャンネル ID が必要になります。
:::

## 手順 8: Hermes Agent を設定する {#step-8-configure-hermes-agent}

### 方法 A: 対話式のセットアップ（推奨） {#option-a-interactive-setup-recommended}

案内に従って進むセットアップコマンドを実行します。

```bash
hermes gateway setup
```

選択肢が出たら **Discord** を選び、聞かれたところでボットトークンとユーザー ID を貼り付けます。

### 方法 B: 手動で設定する {#option-b-manual-configuration}

`~/.hermes/.env` ファイルに次を追記します。

```bash
# Required
DISCORD_BOT_TOKEN=your-bot-token
DISCORD_ALLOWED_USERS=284102345871466496

# Multiple allowed users (comma-separated)
# DISCORD_ALLOWED_USERS=284102345871466496,198765432109876543
```

そのうえでゲートウェイを起動します。

```bash
hermes gateway
```

数秒でボットが Discord 上でオンラインになります。DM でも、ボットが見えるチャンネルでもかまわないので、メッセージを送って動作を確かめてください。

:::tip
`hermes gateway` はバックグラウンドで動かすことも、systemd のサービスとして常駐させることもできます。詳しくはデプロイ関連の文書を参照してください。
:::

## 設定一覧 {#configuration-reference}

Discord の振る舞いは 2 つのファイルで制御します。認証情報と環境変数レベルの切り替えは **`~/.hermes/.env`**、構造化した設定は **`~/.hermes/config.yaml`** です。両方に指定がある場合は、常に環境変数が config.yaml の値より優先されます。

### 環境変数（`.env`） {#environment-variables-env}

| 変数 | 必須 | 既定値 | 説明 |
|----------|----------|---------|-------------|
| `DISCORD_BOT_TOKEN` | **はい** | — | [Discord Developer Portal](https://discord.com/developers/applications) で取得したボットトークン。 |
| `DISCORD_ALLOWED_USERS` | 条件付き | — | ボットとやり取りできる Discord ユーザー ID をカンマ区切りで指定します。これと `DISCORD_ALLOWED_ROLES` のどちらも設定していない場合、`DISCORD_ALLOW_ALL_USERS=true`、`GATEWAY_ALLOW_ALL_USERS=true`、または `DISCORD_ALLOWED_CHANNELS` によるサーバー範囲の明示がない限り、ゲートウェイはすべてのユーザーを拒否します。 |
| `DISCORD_ALLOWED_ROLES` | いいえ | — | Discord のロール ID をカンマ区切りで指定します。ここに挙げたロールを持つメンバーは許可されます。`DISCORD_ALLOWED_USERS` とは OR の関係です。接続時に **Server Members Intent** を自動で有効にします。モデレーターの入れ替わりが多い場ではとくに便利で、ロールを付与した時点で新しいモデレーターがアクセスできるようになり、設定の配布は要りません。 |
| `DISCORD_ALLOW_ALL_USERS` | いいえ | `false` | ボットに到達できるすべての Discord ユーザーを許可する、明示的な設定です。Discord に限って 0.18 より前の開かれた振る舞いに戻します。信頼できる非公開サーバーか開発用途にだけ使ってください。 |
| `GATEWAY_ALLOW_ALL_USERS` | いいえ | `false` | すべてのゲートウェイプラットフォームを対象にした、全体的な許可設定です。接続しているすべてのプラットフォームを意図的に開放したいのでなければ、プラットフォーム別の `DISCORD_ALLOW_ALL_USERS` を使ってください。 |
| `DISCORD_HOME_CHANNEL` | いいえ | — | ボットが自発的なメッセージ（cron の出力、リマインダー、通知）を送るチャンネルの ID。 |
| `DISCORD_HOME_CHANNEL_NAME` | いいえ | `"Home"` | ログや状態表示で使うホームチャンネルの表示名。 |
| `DISCORD_COMMAND_SYNC_POLICY` | いいえ | `"safe"` | 起動時のネイティブスラッシュコマンド同期の方式を決めます。`"safe"` は既存のグローバルコマンドとの差分を取り、変わったものだけを更新します。Discord のメタデータの変更をパッチで適用できない場合はコマンドを作り直します。`"bulk"` は従来の `tree.sync()` の振る舞いをそのまま使います。`"off"` は起動時の同期を行いません。 |
| `DISCORD_REQUIRE_MENTION` | いいえ | `true` | `true` のとき、サーバーのチャンネルでは `@mentioned` されたときだけ応答します。すべてのチャンネルのすべてのメッセージに応答させたい場合は `false` にします。 |
| `DISCORD_THREAD_REQUIRE_MENTION` | いいえ | `false` | `true` のとき、スレッド内でのメンション省略が無効になり、スレッドもチャンネルと同じように扱われます。ボットがすでに会話へ参加していても `@mention` が必要です。複数のボットが同じスレッドにいて、それぞれを明示的な `@mention` でだけ動かしたいときに使います。 |
| `DISCORD_FREE_RESPONSE_CHANNELS` | いいえ | — | `DISCORD_REQUIRE_MENTION` が `true` でも `@mention` なしで応答するチャンネル ID を、カンマ区切りで指定します。 |
| `DISCORD_IGNORE_NO_MENTION` | いいえ | `true` | `true` のとき、メッセージが他のユーザーを `@mentions` していてボットには触れていない場合、ボットは黙っています。他の人へ向けられた会話にボットが割り込むのを防ぎます。サーバーのチャンネルにだけ適用され、DM には適用されません。 |
| `DISCORD_AUTO_THREAD` | いいえ | `true` | `true` のとき、テキストチャンネルでの `@mention` ごとに新しいスレッドを自動で作り、会話を切り分けます（Slack に似た振る舞いです）。すでにスレッド内にあるメッセージや DM は影響を受けません。 |
| `DISCORD_ALLOW_BOTS` | いいえ | `"none"` | 他の Discord ボットからのメッセージの扱いを決めます。`"none"` は他のボットをすべて無視します。`"mentions"` は Hermes を `@mention` したボットのメッセージだけを受け取ります。`"all"` はすべてのボットのメッセージを受け取ります。 |
| `DISCORD_REACTIONS` | いいえ | `true` | `true` のとき、処理中のメッセージに絵文字のリアクションを付けます（開始時に 👀、成功時に ✅、エラー時に ❌）。リアクションを一切付けたくない場合は `false` にします。 |
| `DISCORD_IGNORED_CHANNELS` | いいえ | — | `@mentioned` されても**決して**応答しないチャンネル ID を、カンマ区切りで指定します。ほかのどのチャンネル設定よりも優先されます。 |
| `DISCORD_ALLOWED_CHANNELS` | いいえ | — | チャンネル ID をカンマ区切りで指定します。設定すると、ボットはここに挙げたチャンネル（と、許可されていれば DM）で**のみ**応答します。`config.yaml` の `discord.allowed_channels` を上書きします。`DISCORD_IGNORED_CHANNELS` と組み合わせて、許可と拒否の規則を表現できます。 |
| `DISCORD_NO_THREAD_CHANNELS` | いいえ | — | スレッドを作らず、チャンネル内にそのまま応答するチャンネル ID を、カンマ区切りで指定します。`DISCORD_AUTO_THREAD` が `true` のときにだけ意味があります。 |
| `DISCORD_HISTORY_BACKFILL` | いいえ | `true` | `true` のとき、ボットがメンションされた際に、直近のチャンネルの流れ（ボットの前回の応答以降）をユーザーのメッセージの前に付け足します。`require_mention` のままだと取りこぼす文脈を拾い直せます。DM と自由応答チャンネルでは行われません。止めたい場合は `false` にします。 |
| `DISCORD_HISTORY_BACKFILL_LIMIT` | いいえ | `50` | 補完のためにさかのぼって読むメッセージの上限数。実際には、そのチャンネルでのボット自身の最後のメッセージに当たった時点で、それより手前で止まるのがふつうです。 |
| `DISCORD_REPLY_TO_MODE` | いいえ | `"first"` | 返信先の参照の付け方を決めます。`"off"` は元のメッセージへの返信参照を付けません。`"first"` は最初の分割メッセージにだけ付けます（既定）。`"all"` はすべての分割メッセージに付けます。 |
| `DISCORD_ALLOW_MENTION_EVERYONE` | いいえ | `false` | `false`（既定）のとき、応答の中に `@everyone` や `@here` の文字列が含まれていても通知は飛びません。許可したい場合は `true` にします。下の [メンションの制御](#mention-control) を参照してください。 |
| `DISCORD_ALLOW_MENTION_ROLES` | いいえ | `false` | `false`（既定）のとき、ボットは `@role` のメンションで通知を飛ばせません。許可したい場合は `true` にします。 |
| `DISCORD_ALLOW_MENTION_USERS` | いいえ | `true` | `true`（既定）のとき、ボットは個々のユーザーを ID で指定して通知を飛ばせます。 |
| `DISCORD_ALLOW_MENTION_REPLIED_USER` | いいえ | `true` | `true`（既定）のとき、メッセージに返信すると元の投稿者に通知が飛びます。 |
| `DISCORD_PROXY` | いいえ | — | Discord への接続（HTTP、WebSocket、REST）で使うプロキシ URL。`HTTPS_PROXY`／`ALL_PROXY` より優先されます。`http://`、`https://`、`socks5://` の形式に対応します。 |
| `DISCORD_ALLOW_ANY_ATTACHMENT` | いいえ | `false` | `true` のとき、ボットはあらゆる種類のファイルを添付として受け取ります（組み込みの PDF／テキスト／zip／オフィス文書の許可一覧に限りません）。未知の種類はディスクに保存され、MIME を `application/octet-stream` としたローカルのパスでエージェントに渡されるので、`terminal` や `read_file`、`ffprobe` などで中身を調べられます。 |
| `DISCORD_MAX_ATTACHMENT_BYTES` | いいえ | `33554432` | ゲートウェイが取得して保存する、添付 1 件あたりの最大バイト数。既定は 32 MiB です。`0` にすると上限がなくなります（保存中の添付はメモリ上に保持されるので、上限なしには相応のメモリ負荷が伴います）。 |
| `HERMES_DISCORD_TEXT_BATCH_DELAY_SECONDS` | いいえ | `0.6` | 待機中のテキストの断片を送り出すまでにアダプターが置く猶予時間。少しずつ届く出力をなめらかに見せたいときに役立ちます。 |
| `HERMES_DISCORD_TEXT_BATCH_SPLIT_DELAY_SECONDS` | いいえ | `2.0` | 1 つのメッセージが Discord の文字数上限を超えて分割されたときの、断片どうしの間隔。 |

:::warning ボット同士の会話には対応していません
`DISCORD_ALLOW_BOTS` は、信頼できる特定のボット（中継用のボットや Webhook 用のボットなど）からの入力を受け取るためのものであり、2 つの Hermes プロファイルを会話させるためのものではありません。既定の `"none"` は他のボットをすべて無視する、安全な設定です。

複数の Hermes プロファイルに `"mentions"` や `"all"` を設定して、共有チャンネルで互いに返答させる構成には対応していません。Discord は返信のたびに返信先の投稿者を自動で `@mentions` するため、`"mentions"` の下では 2 つのボットが互いのメンション条件を満たし続け、応答の往復が止まらなくなります。これを止める仕組みは用意していません。対応している構成は、`DISCORD_ALLOW_BOTS` を `"none"` のままにすることだからです。どうしても特定のボットを受け入れる必要があるなら、その範囲をできるだけ狭くし、自動で返答する別のエージェントは決して対象にしないでください。
:::

### 設定ファイル（`config.yaml`） {#config-file-configyaml}

`~/.hermes/config.yaml` の `discord` セクションは、上の環境変数と対応しています。config.yaml の設定は既定値として適用されるので、同じ意味の環境変数がすでに設定されていれば環境変数が優先されます。

```yaml
# Discord-specific settings
discord:
  require_mention: true           # Require @mention in server channels
  thread_require_mention: false   # If true, require @mention in threads too (multi-bot threads)
  free_response_channels: ""      # Comma-separated channel IDs (or YAML list)
  auto_thread: true               # Auto-create threads on @mention
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

**型:** boolean — **既定値:** `true`

有効にすると、ボットはサーバーのチャンネルで直接 `@mentioned` されたときだけ応答します。DM ではこの設定にかかわらず常に応答します。

#### `discord.thread_require_mention` {#discordthreadrequiremention}

**型:** boolean — **既定値:** `false`

既定では、ボットが一度スレッドに参加すると（`@mention` で自動作成された、あるいは一度返答した）、以後そのスレッド内のすべてのメッセージに、改めて `@mentioned` されなくても応答し続けます。1 対 1 の会話ではこれが望ましい既定値です。

一方、ユーザーが 1 回ごとに相手のボットを指定する**複数のボットがいるスレッド**では、この既定値が落とし穴になります。スレッド内の他のボットもすべてのメッセージに反応してしまい、費用がかさみチャンネルも荒れます。`thread_require_mention: true` にすると、スレッド内でのメンション省略が無効になり、スレッドもチャンネルと同じ条件で扱われます。明示的な `@mentions` はこれまでどおり動きます。

```yaml
discord:
  require_mention: true
  thread_require_mention: true    # multi-bot setup
```

#### `discord.free_response_channels` {#discordfreeresponsechannels}

**型:** string または list — **既定値:** `""`

`@mention` なしですべてのメッセージに応答するチャンネル ID です。カンマ区切りの文字列でも、YAML のリストでも指定できます。

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

スレッドの親チャンネルがこの一覧に含まれていれば、そのスレッドもメンション不要になります。

自由応答チャンネルでは**自動スレッド化も行われません**。メッセージごとに新しいスレッドを立てるのではなく、その場で返答します。これによりチャンネルを気軽なチャットの場として使えます。スレッド化してほしい場合は、そのチャンネルを自由応答として指定せず、通常の `@mention` の流れを使ってください。

#### `discord.auto_thread` {#discordautothread}

**型:** boolean — **既定値:** `true`

有効にすると、通常のテキストチャンネルでの `@mention` ごとに、会話用の新しいスレッドを自動で作ります。メインのチャンネルが散らからず、会話ごとに独立したセッション履歴を持てます。スレッドができたあとは、そのスレッド内の続きのメッセージに `@mention` は要りません。ボットは自分がすでに参加していると分かっているからです。複数のボットがいる構成でこのスレッド内の省略を無効にしたい場合は、[`thread_require_mention`](#discordthread_require_mention) を `true` にします。

すでにあるスレッドや DM でのメッセージは、この設定の影響を受けません。`discord.free_response_channels` や `discord.no_thread_channels` に挙げたチャンネルも自動スレッド化を通らず、その場での返答になります。

#### `discord.reactions` {#discordreactions}

**型:** boolean — **既定値:** `true`

ボットが処理状況を目で分かるようにするため、メッセージに絵文字のリアクションを付けるかどうかを決めます。
- 👀 メッセージの処理を始めたときに付きます
- ✅ 応答を無事に送れたときに付きます
- ❌ 処理中にエラーが起きたときに付きます

リアクションが気になる場合や、ボットのロールに **Add Reactions** の権限がない場合は無効にしてください。

#### `discord.ignored_channels` {#discordignoredchannels}

**型:** string または list — **既定値:** `[]`

直接 `@mentioned` されても**決して**応答しないチャンネル ID です。これがもっとも優先度が高く、ここに挙げたチャンネルでは、`require_mention` や `free_response_channels` などほかのどの設定にかかわらず、すべてのメッセージを黙って無視します。

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

スレッドの親チャンネルがこの一覧に含まれていれば、そのスレッド内のメッセージも無視されます。

#### `discord.no_thread_channels` {#discordnothreadchannels}

**型:** string または list — **既定値:** `[]`

スレッドを自動で作らず、チャンネル内にそのまま応答するチャンネル ID です。`auto_thread` が `true`（既定）のときにだけ効きます。これらのチャンネルでは、新しいスレッドを立てずに、ふつうのメッセージとしてその場で返答します。

```yaml
discord:
  no_thread_channels:
    - 1234567890  # Bot responds inline here
```

ボットとのやり取り専用のチャンネルなど、スレッドがかえって邪魔になる場合に便利です。

#### `discord.channel_prompts` {#discordchannelprompts}

**型:** mapping — **既定値:** `{}`

該当する Discord のチャンネルやスレッドでのやり取りごとに差し込まれる、チャンネル別の一時的なシステムプロンプトです。会話の記録には残りません。

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
- スレッド／チャンネル ID の完全一致が優先されます。
- スレッドやフォーラムの投稿にメッセージが届き、そのスレッドに個別の指定がない場合は、親のチャンネル／フォーラムの ID にさかのぼって適用されます。
- プロンプトは実行時に一時的に適用されるので、書き換えれば過去のセッション履歴を直さなくても、次のやり取りからすぐに反映されます。

#### `discord.history_backfill` {#discordhistorybackfill}

**型:** boolean — **既定値:** `true`

有効にすると、`@mention` のたびに、ボットが取りこぼしたチャンネルのメッセージを拾い直します。`require_mention: true` の場合、ボットは自分を直接タグ付けしたメッセージしか処理しないため、チャンネル内のそれ以外のやり取りはセッションの記録に残りません。履歴の補完は、呼び出された時点で直近のチャンネル履歴をさかのぼり、ボットの前回の応答から今回のメンションまでのメッセージを集めて、文脈として一緒に渡します。

場面ごとの振る舞いは次のとおりです。

- **サーバーのチャンネル**（`require_mention: true` のとき）: ボットの前回の応答以降のチャンネルをさかのぼります。ボットが呼ばれていない間に他の参加者が投稿していた場合に役立ちます。
- **スレッド**: そのスレッドの中だけをさかのぼります。Discord のスレッドに対する `channel.history()` は、親チャンネルではなくそのスレッドのメッセージだけを返すためです。スレッドはたいてい完結した会話なので、この範囲が適切です。
- **DM**: 行いません。DM ではすべてのメッセージがボットを動かすので、セッションの記録はすでに完全であり、埋めるべき隙間がありません。
- **自由応答チャンネル**と**ボットが自動で作ったスレッド**: 同じ理由で行いません。メンションで絞り込んでいないので隙間ができないためです。

ユーザーごとのセッション（`group_sessions_per_user: true`、既定）でも効果があります。あるユーザーのセッションには、チャンネルの他の参加者の投稿も、ボットをタグ付けする前の本人の投稿も入っていません。履歴の補完はその両方を埋めます。

```yaml
discord:
  history_backfill: true   # default
```

止めたい場合は次のようにします。

```yaml
discord:
  history_backfill: false
```

> **注意:** ボットが処理している*最中*に届いたメッセージ（呼び出しから応答までの間のもの）は取り込まれません。これは割り切った仕様です。ユーザーは送り直すか、もう一度タグ付けすれば済みます。

#### `discord.history_backfill_limit` {#discordhistorybackfilllimit}

**型:** integer — **既定値:** `50`

チャンネルの文脈を拾い直すときに、さかのぼって読むメッセージの上限数です。実際にはもっと手前で止まるのがふつうで、そのチャンネルでのボット自身の最後のメッセージ、つまりやり取りの自然な区切りが終点になります。この上限は、直近の履歴にボットのメッセージがまだ存在しない初回や、間が長く空いた場合に備えた安全策です。

```yaml
discord:
  history_backfill: true
  history_backfill_limit: 50
```

#### `discord.missed_message_backfill` {#discordmissedmessagebackfill}

**型:** object — **既定値:** 無効

Discord の WebSocket の再開可能な時間枠は、再起動やネットワークの断絶の間に切れてしまうことがあります。その間に送られたメッセージは、ゲートウェイのイベントとしては届きません。この設定を有効にすると、Discord への再接続後に、指定したチャンネルとスレッドの履歴を限られた範囲で走査し、まだ処理していないメッセージを、通常のイベントと同じ認可・メンション判定・チャンネル判定・重複排除・振り分けの経路に流します。

```yaml
discord:
  missed_message_backfill:
    enabled: true
    channels: ["123456789012345678"]
    window_seconds: 3600
    limit: 100
    max_dispatches: 10
```

`channels` が空の場合、Hermes は `discord.free_response_channels` を使います。`"*"` を指定するのは、到達できるサーバーのテキストチャンネルをすべて調べさせたいときだけにしてください。復旧の記録はプロファイルごとに `gateway/discord_message_recovery.db` に保存され、一度きちんと応答したメッセージが、後日の再起動で再び処理されることを防ぎます。

#### `group_sessions_per_user` {#groupsessionsperuser}

**型:** boolean — **既定値:** `true`

これは Discord に限らないゲートウェイ全体の設定で、同じチャンネルにいるユーザーどうしのセッション履歴を分けるかどうかを決めます。

`true` のとき、`#research` で話している Alice と Bob は、それぞれ独立した会話を Hermes と持ちます。`false` のとき、チャンネル全体で 1 つの会話記録と 1 つの実行枠を共有します。

```yaml
group_sessions_per_user: true
```

それぞれの動作の影響については、上の [セッションのしくみ](#session-model-in-discord) の節を参照してください。

#### `display.tool_progress` {#displaytoolprogress}

**型:** string — **既定値:** `"all"` — **値:** `off`、`new`、`all`、`verbose`

処理中にボットが進捗のメッセージ（「ファイルを読んでいます…」「ターミナルのコマンドを実行しています…」など）をチャットへ送るかどうかを決めます。これはすべてのプラットフォームに適用されるゲートウェイ全体の設定です。

```yaml
display:
  tool_progress: "all"    # off | new | all | verbose
```

- `off` — 進捗のメッセージを送りません
- `new` — 1 回のやり取りにつき最初のツール呼び出しだけを表示します
- `all` — すべてのツール呼び出しを表示します（ゲートウェイのメッセージでは 40 文字に切り詰められます）
- `verbose` — ツール呼び出しの詳細をすべて表示します（メッセージが長くなることがあります）

#### `display.tool_progress_command` {#displaytoolprogresscommand}

**型:** boolean — **既定値:** `false`

有効にすると、ゲートウェイで `/verbose` スラッシュコマンドが使えるようになり、config.yaml を編集しなくても進捗の表示方法（`off → new → all → verbose → off`）を順に切り替えられます。

```yaml
display:
  tool_progress_command: true
```

#### `display.reasoning_style` {#displayreasoningstyle}

**型:** string — **既定値（Discord）:** `"subtext"` — **値:** `code`、`blockquote`、`subtext`

推論の表示を有効にしているとき、モデルの推論部分をどう描くかを決めます。Discord の既定は `subtext` で、Discord 独自の `-# ` による小さな灰色の補足表示を使うため、推論は答えより控えめに見えます。`blockquote` は `>` の引用として、`code`（他のプラットフォームでの既定）はコードブロックとして表示します。長い推論は先頭 15 行にまとめられます。

```yaml
display:
  platforms:
    discord:
      reasoning_style: subtext   # code | blockquote | subtext
```

## スラッシュコマンドのアクセス制御 {#slash-command-access-control}

既定では、許可されたユーザーは全員がすべてのスラッシュコマンドを実行できます。許可一覧を**管理者**（スラッシュコマンドをすべて使える）と**一般ユーザー**（明示的に許可したコマンドだけ使える）に分けるには、Discord プラットフォームの `extra` ブロックに `allow_admin_from` と `user_allowed_commands` を追加します。

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

- ある範囲（DM またはサーバーのチャンネル）の `allow_admin_from` に入っているユーザーは、登録済みのスラッシュコマンドを**すべて**実行できます。組み込みのものもプラグインが登録したものも、実行時のコマンド登録内容を通してそのまま使えます。
- `allow_admin_from` に入っていないユーザーは、`user_allowed_commands` に挙げたコマンドと、常に使える最低限の `/help` と `/whoami` だけを実行できます。
- ふつうのチャット（スラッシュコマンド以外のメッセージ）には影響しません。管理者でないユーザーもこれまでどおりエージェントと会話できます。任意のコマンドを実行できなくなるだけです。
- **以前の設定との互換:** ある範囲で `allow_admin_from` を設定していない場合、その範囲ではスラッシュコマンドの制限が無効になります。既存の環境は何も変えずにそのまま動きます。
- DM での管理者権限は、サーバーのチャンネルでの管理者権限を意味しません。範囲ごとに別々の管理者一覧を持ちます。

`/whoami` を使うと、現在の範囲、自分の区分（管理者／一般ユーザー／制限なし）、実行できるスラッシュコマンドを確認できます。

## 対話式のモデル選択 {#interactive-model-picker}

Discord のチャンネルで引数なしの `/model` を送ると、ドロップダウン形式のモデル選択が開きます。

1. **プロバイダーの選択** — 利用できるプロバイダー（最大 25 件）を表示するドロップダウンです。
2. **モデルの選択** — 選んだプロバイダーのモデルを表示する 2 つ目のドロップダウンです（最大 25 件）。

この選択画面は 120 秒で時間切れになります。操作できるのは許可されたユーザー（`DISCORD_ALLOWED_USERS` に入っている人）だけです。モデル名が分かっている場合は `/model <name>` と直接入力してください。

## スキル用のネイティブスラッシュコマンド {#native-slash-commands-for-skills}

Hermes は、導入済みのスキルを **Discord のアプリケーションコマンド**として自動で登録します。つまりスキルは、組み込みのコマンドと並んで Discord の `/` の候補一覧に現れます。

- スキルはそれぞれ Discord のスラッシュコマンドになります（例: `/code-review`、`/ascii-art`）
- スキルは省略可能な `args` という文字列パラメーターを受け取れます
- Discord ではボット 1 つあたり 100 個までというアプリケーションコマンドの上限があります。スキルの数が枠を超えると、あふれた分は登録されず、ログに警告が残ります
- スキルは、`/model`、`/reset`、`/background` などの組み込みコマンドと一緒に、ボットの起動時に登録されます

追加の設定は要りません。`hermes skills install` で導入したスキルは、次にゲートウェイを起動したときに自動で Discord のスラッシュコマンドとして登録されます。

### スラッシュコマンドの登録を止める {#disabling-slash-command-registration}

同じ Discord アプリケーションに対して複数の Hermes ゲートウェイを動かしている場合（検証用と本番用など）、グローバルなスラッシュコマンドの登録を持つのは 1 つだけにしてください。そうしないと最後に起動したものが勝ち、登録内容が行ったり来たりします。従属側のゲートウェイではスラッシュコマンドの登録を止めます。

```yaml
gateway:
  platforms:
    discord:
      extra:
        slash_commands: false   # default: true
```

主となるゲートウェイでこれを `true` のままにしておけば、組み込みコマンドと導入済みスキルがグローバルな `/` メニューに出る、通常どおりの振る舞いになります。

## メディアを送る（インラインの `MEDIA:` タグ） {#sending-media-inline-media-tags}

Discord アダプターは、エージェントの応答に書かれたインラインの `MEDIA:/path/to/file` タグを通して、よくあるメディア形式すべてをそのままファイルとして送れます。アダプターがタグを取り除き、ファイルを自動で送信します。

| 種類 | 送られ方 |
|---|---|
| 画像（PNG／JPG／WebP） | Discord の画像添付として、その場でプレビュー表示されます |
| アニメーション GIF | `send_animation` が `animation.gif` として送るので、静止画のサムネイルではなく Discord 上で動いて再生されます |
| 動画（MP4／MOV） | `send_video` — 標準の動画プレーヤーで再生されます |
| 音声／ボイス | `send_voice` — 可能なら標準のボイスメッセージとして、難しければファイル添付として送られます |
| 文書（PDF／ZIP／docx など） | `send_document` — ダウンロードボタン付きの添付として送られます |

Discord の 1 回あたりのアップロード上限は、サーバーのブースト段階によって変わります（無料で 25 MB、最大 500 MB）。HTTP 413 が返ってきた場合、Hermes は黙って失敗するのではなく、ローカルの保存先のパスを指すリンクを返します。

## あらゆる種類のファイルを受け取る {#receiving-arbitrary-file-types}

ユーザーがアップロードしたファイルは、種類を問わず受け取ります。判断の分かれ目はエージェントにメッセージを送れるかどうかであって、拡張子ではありません。アップロードされたものはすべて取得され、`~/.hermes/cache/documents/` に保存され、`DOCUMENT` 型のメッセージイベントとしてエージェントに渡されます。エージェントは `terminal`（`ffprobe`、`unzip`、`file`、`strings` など）や `read_file` で中身を調べられます。

- 既知の種類（PDF、docx／xlsx／pptx、zip、画像・音声・動画など）は、正確な MIME を保ちます。
- 未知の種類は、アップロード時に申告された content type にさかのぼり、それもない場合は `application/octet-stream` になります。
- UTF-8 として読める小さなファイル（テキスト、コード、設定、HTML、CSS、JSON、YAML など）は、100 KiB を上限に中身がそのままプロンプトへ差し込まれます。読み取れないバイナリはパスを指し示す注記としてだけ渡されるので（Docker／Modal のサンドボックス化されたターミナル向けには `to_agent_visible_cache_path` が自動で変換します）、コンテキストがあふれることはありません。

受け取り側の制限はファイル 1 件あたりのサイズ上限（既定 32 MiB）だけです。

```yaml
discord:
  # Optional — raise/disable the per-file size cap. Default is 32 MiB.
  # The whole file is held in memory while being cached, so unlimited
  # uploads carry a real memory cost.
  max_attachment_bytes: 33554432   # bytes; 0 = unlimited
```

同じ意味の環境変数は `DISCORD_MAX_ATTACHMENT_BYTES=33554432` です（上限をなくす場合は `0`）。

以前の `discord.allow_any_attachment` は現在は何もしません。あらゆる種類のファイルを常に受け取るためで、既存の設定がエラーにならないように残してあるだけです。

:::warning 上限をなくしたときのメモリ負荷
サイズ上限を外す（`max_attachment_bytes: 0`）と、ユーザーが数 GB のファイルをボットに投げたとき、ゲートウェイはそれをメモリに通しながらディスクへ保存し続けます。信頼できる 1 人だけの環境でのみ設定してください。共有のボットでは既定の 32 MiB のままにするか、上げるとしても控えめにしてください。
:::

## 対話式の問いかけ（clarify） {#interactive-prompts-clarify}

エージェントが `clarify` ツールを呼ぶとき、つまりどの進め方がよいかを尋ねる、作業後の感想を聞く、判断の前に確認するといった場面で、Discord は質問を**選択肢ごとのボタン**として表示します。

> ダッシュボードにはどのフレームワークを使いましょうか？
>
> [1. Next.js] [2. Remix] [3. Astro] [Other (type answer)]

番号のボタンをクリックして答えるか、**Other** をクリックして自由に書いて答えます（そのチャンネルで次に送ったメッセージが答えになります）。選択肢のない自由回答の `clarify` ではボタンは出ず、次のメッセージがそのまま答えになります。

一度選ぶとボタンは押せなくなるので、続けてクリックしても二重に確定することはありません。応答の待ち時間は `~/.hermes/config.yaml` の `agent.clarify_timeout` で設定します（既定は `600` 秒）。時間内に答えなかった場合、エージェントは合図となるメッセージを受け取って先へ進むので、止まったままにはなりません。

## ホームチャンネル {#home-channel}

ボットが自発的なメッセージ（cron ジョブの出力、リマインダー、通知など）を送る「ホームチャンネル」を決められます。設定方法は 2 つあります。

### スラッシュコマンドで設定する {#using-the-slash-command}

ボットがいる任意の Discord チャンネルで `/sethome` と入力します。そのチャンネルがホームチャンネルになります。

### 手動で設定する {#manual-configuration}

`~/.hermes/.env` に次を追記します。

```bash
DISCORD_HOME_CHANNEL=123456789012345678
DISCORD_HOME_CHANNEL_NAME="#bot-updates"
```

ID の部分は実際のチャンネル ID に置き換えてください（Developer Mode を有効にして右クリック → Copy Channel ID）。

## ボイスメッセージ {#voice-messages}

Hermes Agent は Discord のボイスメッセージに対応しています。

- **受け取ったボイスメッセージ**は、設定した音声認識の提供元を使って自動で文字に起こされます。ローカルの `faster-whisper`（キー不要）、Groq Whisper（`GROQ_API_KEY`）、OpenAI Whisper（`VOICE_TOOLS_OPENAI_KEY`）が使えます。
- **読み上げ**: `/voice tts` を使うと、テキストの返答に加えて音声でも返してくれます。
- **Discord のボイスチャンネル**: Hermes はボイスチャンネルに参加し、話している内容を聞き取り、その場で声で返すこともできます。

設定と運用の詳しい手順は次を参照してください。
- [ボイスモード](/hermes/docs/user-guide/features/voice-mode/)
- [Hermes でボイスモードを使う](/hermes/docs/guides/use-voice-mode-with-hermes/)

### ボイスチャンネルの音響効果（環境音と相づち） {#voice-channel-audio-effects-ambient-verbal-acks}

ボットがボイスチャンネルにいるとき、より会話らしい雰囲気にできます。作業を始める前に短い相づち（「ちょっと調べてみますね」）を返し、ツールが動いている間は控えめな「考え中」の環境音を下に流します。話し始めると環境音は小さくなり、話し終えるとまた戻ります。Grok のボイスモードに似た感じです。

discord.py は 1 つの接続につき 1 つの音声しか流せないため、Hermes は送出する音声にソフトウェアのミキサーを入れ、環境音のループ、相づち、読み上げの返答を 1 本にまとめます。互いを打ち消し合わず、重なって聞こえます。

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
- 明示的な `/voice leave` や手動の切断があるまでボイスチャンネルに留まらせたい場合は、`voice_channel_inactivity_timeout_seconds: 0` にします。既定値は従来どおり 300 秒の無操作で自動退出します。
- `voice_playback_timeout_seconds` は下限であって、長い読み上げに対する上限ではありません。Hermes は生成した音声の長さを調べ、それが設定した下限より長ければ `duration + 30s` まで待ちます。
- 相づちは 1 回のやり取りにつき最大 1 回、ボットがボイスチャンネルにいてミキサーが動いているときにだけ流れます。設定した読み上げの提供元を使います。
- `ambient_path` には `ffmpeg` が読める形式のファイルを指定でき、途切れなく繰り返し再生されます。空のままにすると、組み込みの合成音が使われます（素材を用意する必要はありません）。
- これらの設定はすべて `config.yaml` にあり、`.env` にはありません。秘密情報ではなく振る舞いの設定だからです。
- `voice_fx.enabled` が `false` のときは、従来どおり 1 本ずつ再生する経路が使われ、何も変わりません。

## フォーラムチャンネル {#forum-channels}

Discord のフォーラムチャンネル（種別 15）は、直接のメッセージを受け付けません。フォーラムへの投稿はすべてスレッドである必要があります。Hermes はフォーラムチャンネルを自動で見分け、そこへ送るときは新しいスレッドの投稿を作るので、テキストの返答、読み上げ、画像、ボイスメッセージ、ファイル添付のいずれも、エージェント側で特別な扱いをせずに動きます。

- **スレッド名**はメッセージの 1 行目から作られます（markdown の見出し記号は取り除かれ、100 文字で切られます）。添付だけのメッセージのときは、ファイル名がスレッド名になります。
- **添付**は新しいスレッドの最初のメッセージに一緒に載ります。別途のアップロードも、途中まで送られる状態も起きません。
- **1 回の送信につき 1 つのスレッド**: フォーラムへの送信ごとに新しいスレッドができます。同じフォーラムへ続けて送ると、その分だけ別々のスレッドができます。
- **判別は三段構え**: まずチャンネル一覧のキャッシュ、次にプロセス内の判定キャッシュ、最後の手段として `GET /channels/{id}` の実際の問い合わせを行います（その結果はプロセスが終わるまで記憶されます）。

一覧を更新すると（それを備えているプラットフォームでは `/channels refresh`、あるいはゲートウェイの再起動）、ボットの起動後に作られたフォーラムチャンネルもキャッシュに取り込まれます。

## うまくいかないとき {#troubleshooting}

### ボットはオンラインなのにメッセージへ応答しない {#bot-is-online-but-not-responding-to-messages}

**原因**: Message Content Intent が無効になっているか、アクセス方針が何も設定されていないために Discord の認可が拒否側に倒れています。

**対処**:

1. [Developer Portal](https://discord.com/developers/applications) → 自分のアプリ → Bot → Privileged Gateway Intents と進み、**Message Content Intent** を有効にして Save Changes をクリックします。
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

ゲートウェイのログでは Discord に接続できていて REST API の確認も通るのに、届くメッセージがすべて無反応な場合は、`~/.hermes/logs/gateway.log` に次の警告が出ていないか探してください。

```text
No Discord access policy configured; inbound Discord messages will be denied by default.
```

Hermes 0.18 は、外部から到達できるアダプターについて意図的に拒否側へ倒れます。`DISCORD_ALLOWED_USERS` も `DISCORD_ALLOWED_ROLES` も `DISCORD_ALLOWED_CHANNELS` もなく、全員許可の明示もない Discord ボットは、接続には成功しますが、通常のメッセージ処理に入る前に届いたユーザーを拒否します。

### 起動時に「Privileged intents」／`PrivilegedIntentsRequired` のエラーが出る {#privileged-intents-privilegedintentsrequired-error-on-startup}

**原因**: Hermes が要求している特権ゲートウェイインテントが、Developer Portal でそのボットに対して有効になっていません。すると Discord は WebSocket の接続を拒否します。Hermes は常に **Message Content Intent** を要求します。加えて、許可一覧に数値の ID ではなくユーザー名を使っている場合や `DISCORD_ALLOWED_ROLES` を設定している場合は **Server Members Intent** も要求します。Presence Intent は不要です。

**対処**:

1. [Developer Portal](https://discord.com/developers/applications) → 自分のアプリ → Bot → Privileged Gateway Intents と進みます。
2. **Message Content Intent** を有効にします（必須）。ユーザー名やロールの許可一覧を使っている場合は **Server Members Intent** も有効にします。
3. **Save Changes** をクリックし、ゲートウェイを再起動します（`hermes gateway restart`）。

ゲートウェイのログには、Hermes が要求したインテントの名前が出ているはずです。それらを有効にするまで Discord は接続を拒否し続けます。これはポータル側の設定の誤りであって、ネットワークの不調ではありません。

### 特定のチャンネルでボットがメッセージを見られない {#bot-cant-see-messages-in-a-specific-channel}

**原因**: ボットのロールに、そのチャンネルを見る権限がありません。

**対処**: Discord でそのチャンネルの設定 → Permissions と進み、ボットのロールを追加して **View Channel** と **Read Message History** を有効にします。

### 403 Forbidden のエラーが出る {#403-forbidden-errors}

**原因**: ボットに必要な権限が足りていません。

**対処**: 手順 5 の URL を使って正しい権限でボットを招待し直すか、Server Settings → Roles でボットのロールの権限を手動で調整します。

### ボットがオフラインのまま {#bot-is-offline}

**原因**: Hermes のゲートウェイが動いていないか、トークンが間違っています。

**対処**: `hermes gateway` が動いているか確かめてください。`.env` ファイルの `DISCORD_BOT_TOKEN` も確認します。最近トークンをリセットしたのなら、新しいものに更新してください。

### 「User not allowed」と出る／ボットに無視される {#user-not-allowed-bot-ignores-you}

**原因**: 自分のユーザー ID が `DISCORD_ALLOWED_USERS` に入っていません。

**対処**: `~/.hermes/.env` の `DISCORD_ALLOWED_USERS` に自分のユーザー ID を追加し、ゲートウェイを再起動します。

### 同じチャンネルにいる人どうしで、意図せず文脈が共有されている {#people-in-the-same-channel-are-sharing-context-unexpectedly}

**原因**: `group_sessions_per_user` が無効になっているか、その場面のメッセージについてプラットフォームがユーザー ID を返せていません。

**対処**: `~/.hermes/config.yaml` に次を設定し、ゲートウェイを再起動します。

```yaml
group_sessions_per_user: true
```

意図して部屋全体で会話を共有したいのであれば、無効のままでかまいません。ただし、会話の記録も割り込みの挙動も共有されることは織り込んでおいてください。

## セキュリティ {#security}

:::warning
ボットとやり取りできる相手を絞るため、必ず `DISCORD_ALLOWED_USERS`（または `DISCORD_ALLOWED_ROLES`）を設定してください。どちらもない場合、安全側の措置としてゲートウェイは既定ですべてのユーザーを拒否します。許可するのは信頼できる人だけにしてください。許可されたユーザーは、ツールの実行やシステムへのアクセスを含め、エージェントの機能をすべて使えます。
:::

### ロールに基づくアクセス制御 {#role-based-access-control}

個々のユーザー一覧ではなくロールでアクセスを管理しているサーバー（モデレーターのチーム、サポート担当、社内向けの仕組みなど）では、`DISCORD_ALLOWED_ROLES` にロール ID をカンマ区切りで指定します。それらのロールを持つメンバーは許可されます。

```bash
# ~/.hermes/.env — works alongside or instead of DISCORD_ALLOWED_USERS
DISCORD_ALLOWED_ROLES=987654321098765432,876543210987654321
```

意味は次のとおりです。

- **ユーザー許可一覧との OR。** ユーザーの ID が `DISCORD_ALLOWED_USERS` に入っているか、**または** `DISCORD_ALLOWED_ROLES` のいずれかのロールを持っていれば許可されます。
- **Server Members Intent が自動で有効になります。** `DISCORD_ALLOWED_ROLES` を設定すると、接続時に Members インテントが有効になります。Discord がメンバーの情報にロールを含めて送るために必要だからです。
- **名前ではなくロール ID を使います。** Discord で **User Settings → Advanced → Developer Mode を ON** にしてから、ロールを右クリックして **Copy Role ID** を選びます。
- **DM での扱い。** DM でのロール判定は、共通で参加しているサーバーを調べます。共有しているどれかのサーバーで許可ロールを持っていれば、DM でも許可されます。

モデレーターの入れ替わりが多い場では、これがいちばん向いた方法です。ロールを付与した瞬間に新しいモデレーターがアクセスできるようになり、`.env` の編集もゲートウェイの再起動も要りません。

### メンションの制御 {#mention-control}

既定では、返答に `@everyone`、`@here`、ロールのメンションが含まれていても、Hermes はボットからそれらの通知が飛ばないようにしています。言い回しの拙いプロンプトや、ユーザーの発言をそのまま返した内容が、サーバー全体に通知をまき散らすのを防ぐためです。個別の `@user` への通知と、返信参照の通知（「〜に返信しています」の小さな表示）は有効なままなので、ふつうの会話はそのまま成り立ちます。

この既定値は、環境変数か `config.yaml` のどちらでも緩められます。

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
必要な理由がはっきりしていない限り、`everyone` と `roles` は `false` のままにしてください。ふつうに見える応答の中に `@everyone` という文字列が紛れ込むことは、大規模言語モデルにとってごく起こりやすいことです。この保護がなければ、それだけでサーバーの全員に通知が飛びます。
:::

Hermes Agent の運用を安全に保つための詳しい情報は、[セキュリティガイド](/hermes/docs/user-guide/security/) を参照してください。
