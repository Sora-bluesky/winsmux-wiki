---
title: "Discord"
description: "Hermes Agent を Discord のボットとして設定する"
upstream_path: user-guide/messaging/discord.md
upstream_blob: 609ab4391875888750ee0c334356efd9bb517a06
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/discord
---

# Discord の設定 {#discord-setup}

Hermes Agent はボットとして Discord と連携し、ダイレクトメッセージやサーバーのチャンネルから AI アシスタントと話せるようにします。ボットはメッセージを受け取り、Hermes Agent の処理（ツールの利用、記憶、推論を含みます）を通してその場で返答します。テキスト、音声メッセージ、添付ファイル、スラッシュコマンドに対応しています。

設定の前に、多くの人が知りたい点から説明します。サーバーに入れたあと、Hermes がどう振る舞うかです。

## Hermes の振る舞い {#how-hermes-behaves}

| 場面 | 振る舞い |
|---------|----------|
| **DM** | Hermes はすべてのメッセージに応答します。`@mention` は要りません。DM ごとに別のセッションになります。 |
| **サーバーのチャンネル** | 既定では、`@mention` されたときだけ応答します。メンションせずにチャンネルへ投稿しても、Hermes は無視します。 |
| **メンション不要のチャンネル** | `DISCORD_FREE_RESPONSE_CHANNELS` で特定のチャンネルをメンション不要にできますし、`DISCORD_REQUIRE_MENTION=false` で全体のメンション要求を切ることもできます。これらのチャンネルではその場で返信し、自動でのスレッド作成は行われないので、チャンネルは気軽な会話の場のままです。 |
| **スレッド** | Hermes は同じスレッドの中で返信します。そのスレッドか親のチャンネルをメンション不要に設定していないかぎり、メンションの規則は効きます。セッションの履歴という点で、スレッドは親のチャンネルから切り離されています。 |
| **複数人がいる共有のチャンネル** | 既定では、安全さとわかりやすさのために、チャンネルの中でもユーザーごとにセッションの履歴を分けます。同じチャンネルで話している 2 人は、明示的に切らないかぎり 1 つの記録を共有しません。 |
| **ほかのユーザーをメンションしたメッセージ** | `DISCORD_IGNORE_NO_MENTION` が `true`（既定）のとき、ほかのユーザーを @メンションしていてボットをメンションして**いない**メッセージには、Hermes は黙っています。ほかの人に向けられた会話にボットが割り込むのを防ぎます。誰がメンションされているかに関わらず応答させたい場合は `false` にします。これはサーバーのチャンネルにだけ効き、DM には効きません。 |

:::tip
毎回タグを付けずに Hermes と話せる、普通のボット用のチャンネルがほしいなら、そのチャンネルを `DISCORD_FREE_RESPONSE_CHANNELS` に追加してください。
:::

### Discord のゲートウェイの考え方 {#discord-gateway-model}

Discord での Hermes は、状態を持たずに返事をする Webhook ではありません。メッセージングゲートウェイをひととおり通るので、届いたメッセージはそれぞれ次を経由します。

1. 認可（`DISCORD_ALLOWED_USERS`）
2. メンションやメンション不要の判定
3. セッションの検索
4. セッションの記録の読み込み
5. ツール、記憶、スラッシュコマンドを含む、通常の Hermes のエージェントの実行
6. Discord への応答の送信

にぎやかなサーバーでの振る舞いが、Discord 側の振り分けと Hermes のセッションの方針の両方で決まるのは、このためです。

### Discord でのセッションの考え方 {#session-model-in-discord}

既定では次のとおりです。

- DM ごとに別のセッション
- サーバーのスレッドごとに別のセッションの名前空間
- 共有のチャンネルでは、そのチャンネルの中でユーザーごとに別のセッション

つまり、Alice と Bob がどちらも `#research` で Hermes と話している場合、見た目には同じ Discord のチャンネルでも、Hermes は既定では別々の会話として扱います。

これは `config.yaml` で制御します。

```yaml
group_sessions_per_user: true
```

部屋全体で 1 つの会話にしたいと明確に決めた場合だけ、`false` にしてください。

```yaml
group_sessions_per_user: false
```

共有のセッションは共同作業の部屋には便利ですが、次のことも意味します。

- 文脈の増え方とトークンの費用を全員で分け合う
- 誰か 1 人のツールを多用する長い作業が、ほかの全員の文脈を膨らませる
- 誰か 1 人の実行中の処理が、同じ部屋のほかの人の追加の質問に割り込む

### 割り込みと同時実行 {#interrupts-and-concurrency}

Hermes は実行中のエージェントをセッションのキーで管理します。

既定の `group_sessions_per_user: true` では次のとおりです。

- Alice が自分の実行中の依頼に割り込んでも、そのチャンネルでの Alice のセッションにしか影響しません
- Bob は Alice の履歴を引き継ぐことも、Alice の処理に割り込むこともなく、同じチャンネルで話し続けられます

`group_sessions_per_user: false` では次のとおりです。

- そのチャンネルやスレッドについて、部屋全体で 1 つの実行枠を共有します
- 別の人からの追加のメッセージが、互いに割り込んだり順番待ちになったりします

この解説では、Discord の開発者ポータルでボットを作るところから最初のメッセージを送るところまで、設定の流れをひととおり見ていきます。

### ゲートウェイの WebSocket の健全性 {#gateway-websocket-health}

Discord の REST と Gateway の WebSocket は別々の通信路です。REST の応答が成功しても（`fetch_user()` が HTTP 200 を返しても）、ボットが Gateway のイベントをまだ受け取れる証拠にはなりません。そこで Hermes は、準備完了の状態、クライアントとソケットの終了の状態、ソケットが開いているか、ハートビートの確認からの経過時間、そしてハートビートの遅延が有限かどうかを組み合わせて判断します。

設定した回数だけ連続して不健全と判定されると、アダプターはやり直し可能な致命的イベントを 1 回出します。既存のゲートウェイの再接続の監視が新しいアダプターを作るので、Discord のアダプター側が終わりのない再接続のループをもう 1 つ始めることはありません。

秘密ではない閾値は `config.yaml` で設定します。

```yaml
discord:
  websocket_liveness_interval_seconds: 15
  websocket_liveness_failure_threshold: 2
  websocket_heartbeat_ack_max_age_seconds: 60
  websocket_max_latency_seconds: 30
```

以前の `liveness_interval_seconds` と `liveness_failure_threshold` という名前は互換のための別名として残っているだけで、REST での確認を意味しなくなりました。

## 手順 1: Discord のアプリケーションを作る {#step-1-create-a-discord-application}

1. [Discord 開発者ポータル](https://discord.com/developers/applications) を開き、Discord のアカウントでサインインします。
2. 右上の **New Application** を押します。
3. アプリケーションの名前（例: 「Hermes Agent」）を入れ、開発者向けの利用規約に同意します。
4. **Create** を押します。

**General Information** のページが開きます。**Application ID** は、あとで招待用の URL を作るときに使うので控えておいてください。

## 手順 2: ボットを作る {#step-2-create-the-bot}

1. 左のサイドバーで **Bot** を押します。
2. Discord がアプリケーション用のボットのユーザーを自動で作ります。ボットのユーザー名が表示され、変更もできます。
3. **Authorization Flow** の下で次のようにします。
   - **Public Bot** を **ON** にします。Discord が用意する招待リンク（おすすめの方法）を使うのに必要です。これで Installation のタブから既定の認可 URL を作れます。
   - **Require OAuth2 Code Grant** は **OFF** のままにします。

:::tip
このページでボットのアイコンとバナーを設定できます。Discord のユーザーに見えるのはここで設定したものです。
:::

:::info[非公開のボットにする場合]
ボットを非公開にしたい場合（Public Bot = OFF）は、Installation のタブではなく、手順 5 の **手動の URL** の方法を使う**必要があります**。Discord が用意するリンクには Public Bot の有効化が必要です。
:::

## 手順 3: 特権 Gateway インテントを有効にする {#step-3-enable-privileged-gateway-intents}

設定全体でいちばん大事な手順です。正しいインテントを有効にしていないと、ボットは Discord につながるのに**メッセージの中身を読めません**。

**Bot** のページを下にたどると **Privileged Gateway Intents** があります。切り替えが 3 つ並んでいます。

| インテント | 用途 | 必須か |
|--------|---------|-----------| 
| **Presence Intent** | ユーザーのオンライン／オフラインの状態を見る | 任意 |
| **Server Members Intent** | メンバーの一覧にアクセスし、ユーザー名を解決する | **必須** |
| **Message Content Intent** | メッセージの本文を読む | **必須** |

**Server Members Intent と Message Content Intent の両方**を **ON** にしてください。

- **Message Content Intent** がないと、ボットはメッセージのイベントを受け取っても本文が空になります。入力した内容が文字どおり見えません。
- **Server Members Intent** がないと、許可ユーザーの一覧のためにユーザー名を解決できず、誰がメッセージを送ってきたのか判別できないことがあります。

:::warning[Discord のボットが動かない原因の第 1 位]
ボットはオンラインなのにメッセージへまったく反応しない場合、まず間違いなく **Message Content Intent** が無効です。[開発者ポータル](https://discord.com/developers/applications) に戻り、アプリケーション → Bot → Privileged Gateway Intents と進んで、**Message Content Intent** が ON になっているか確認してください。そのあと **Save Changes** を押します。
:::

**サーバー数について:**
- ボットが入っているサーバーが **100 未満**なら、インテントは自由に切り替えられます。
- **100 以上**のサーバーに入っている場合、特権インテントを使うには Discord への認証の申請が必要です。個人で使う分には関係ありません。

ページの下にある **Save Changes** を押します。

## 手順 4: ボットのトークンを取得する {#step-4-get-the-bot-token}

ボットのトークンは、Hermes Agent がボットとしてログインするための認証情報です。**Bot** のページのまま進めます。

1. **Token** の欄で **Reset Token** を押します。
2. Discord のアカウントで二要素認証を有効にしている場合は、2FA のコードを入れます。
3. 新しいトークンが表示されます。**すぐにコピーしてください。**

:::warning[トークンは一度しか表示されない]
トークンが表示されるのは一度きりです。失くしたら、リセットして新しく作り直す必要があります。トークンを人目に触れる場所に出したり、Git にコミットしたりしないでください。これを持っている人は、誰でもボットを完全に操作できます。
:::

トークンは安全な場所（パスワード管理ツールなど）に保管してください。手順 8 で使います。

## 手順 5: 招待用の URL を作る {#step-5-generate-the-invite-url}

ボットをサーバーに招待するには OAuth2 の URL が必要です。作り方は 2 通りあります。

### 方法 A: Installation のタブを使う（おすすめ） {#option-a-using-the-installation-tab-recommended}

:::note[Public Bot が必要]
この方法には、手順 2 で **Public Bot** を **ON** にしてあることが必要です。OFF にした場合は、下の手動の URL の方法を使ってください。
:::

1. 左のサイドバーで **Installation** を押します。
2. **Installation Contexts** で **Guild Install** を有効にします。
3. **Install Link** では **Discord Provided Link** を選びます。
4. Guild Install の **Default Install Settings** で次のようにします。
   - **Scopes**: `bot` と `applications.commands` を選ぶ
   - **Permissions**: 下に挙げた権限を選ぶ

### 方法 B: 手動の URL {#option-b-manual-url}

招待用の URL は、次の形で自分で組み立てられます。

```
https://discord.com/oauth2/authorize?client_id=YOUR_APP_ID&scope=bot+applications.commands&permissions=274878286912
```

`YOUR_APP_ID` は、手順 1 の Application ID に置き換えてください。

### 必要な権限 {#required-permissions}

ボットに最低限必要な権限は次のとおりです。

- **View Channels** — アクセスできるチャンネルを見る
- **Send Messages** — メッセージに返信する
- **Embed Links** — 内容の整った応答を作る
- **Attach Files** — 画像、音声、出力ファイルを送る
- **Read Message History** — 会話の文脈を保つ

### 追加でおすすめの権限 {#recommended-additional-permissions}

- **Send Messages in Threads** — スレッドの会話で返信する
- **Add Reactions** — 受け取ったことを示すリアクションを付ける

### 権限の数値 {#permission-integers}

| 段階 | 権限の数値 | 含まれるもの |
|-------|-------------------|-----------------|
| 最小 | `117760` | View Channels、Send Messages、Read Message History、Attach Files |
| おすすめ | `274878286912` | 上のすべてに加えて Embed Links、Send Messages in Threads、Add Reactions |

## 手順 6: サーバーに招待する {#step-6-invite-to-your-server}

1. 招待用の URL（Installation のタブから作ったもの、または自分で組み立てたもの）をブラウザで開きます。
2. **Add to Server** の一覧から自分のサーバーを選びます。
3. **Continue** を押し、続けて **Authorize** を押します。
4. 求められたら CAPTCHA に答えます。

:::info
ボットを招待するには、その Discord のサーバーで **Manage Server** の権限が必要です。一覧に自分のサーバーが出てこない場合は、サーバーの管理者に招待リンクを使ってもらってください。
:::

認可が終わると、ボットがサーバーのメンバー一覧に現れます（Hermes のゲートウェイを起動するまではオフラインの表示です）。

## 手順 7: 自分の Discord のユーザー ID を調べる {#step-7-find-your-discord-user-id}

Hermes Agent は、誰がボットとやり取りできるかを Discord のユーザー ID で制御します。調べ方は次のとおりです。

1. Discord（デスクトップ版か Web 版）を開きます。
2. **設定** → **詳細設定** と進み、**開発者モード**を **ON** にします。
3. 設定を閉じます。
4. 自分のユーザー名（メッセージ、メンバー一覧、プロフィールのどれでも）を右クリックし、**ユーザー ID をコピー**を選びます。

ユーザー ID は `284102345871466496` のような長い数字です。

:::tip
開発者モードにすると、同じやり方で**チャンネル ID** や**サーバー ID** もコピーできます。チャンネル名やサーバー名を右クリックして ID のコピーを選んでください。ホームチャンネルを手動で設定したいときにチャンネル ID が要ります。
:::

## 手順 8: Hermes Agent を設定する {#step-8-configure-hermes-agent}

### 方法 A: 対話式セットアップ（おすすめ） {#option-a-interactive-setup-recommended}

案内つきのセットアップのコマンドを実行します。

```bash
hermes gateway setup
```

聞かれたら **Discord** を選び、ボットのトークンとユーザー ID を貼り付けます。

### 方法 B: 手動で設定する {#option-b-manual-configuration}

`~/.hermes/.env` に次を追加します。

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

数秒で Discord 上のボットがオンラインになります。DM か、ボットが見えるチャンネルでメッセージを送って試してください。

:::tip
継続して動かすなら、`hermes gateway` をバックグラウンドで動かすか、systemd のサービスにできます。詳しくは配置の解説をご覧ください。
:::

## 設定の一覧 {#configuration-reference}

Discord の振る舞いは 2 つのファイルで決まります。認証情報と環境変数レベルの切り替えは **`~/.hermes/.env`**、構造のある設定は **`~/.hermes/config.yaml`** です。両方に書いた場合は、常に環境変数が優先されます。

### 環境変数（`.env`） {#environment-variables-env}

| 変数 | 必須 | 既定値 | 説明 |
|----------|----------|---------|-------------|
| `DISCORD_BOT_TOKEN` | **はい** | — | [Discord 開発者ポータル](https://discord.com/developers/applications) で取得したボットのトークン。 |
| `DISCORD_ALLOWED_USERS` | 場合による | — | ボットとやり取りできる Discord のユーザー ID をカンマ区切りで指定します。これも `DISCORD_ALLOWED_ROLES` も設定していない場合、`DISCORD_ALLOW_ALL_USERS=true`、`GATEWAY_ALLOW_ALL_USERS=true`、あるいは `DISCORD_ALLOWED_CHANNELS` でサーバーの範囲を明示していないかぎり、ゲートウェイはすべてのユーザーを拒否します。 |
| `DISCORD_ALLOWED_ROLES` | いいえ | — | Discord のロール ID をカンマ区切りで指定します。これらのロールを持つメンバーは許可されます。`DISCORD_ALLOWED_USERS` とは OR の関係です。接続時に **Server Members Intent** を自動で有効にします。運営チームの入れ替わりが多いときに便利で、ロールを与えた時点で新しいメンバーが使えるようになり、設定を配り直す必要がありません。 |
| `DISCORD_ALLOW_ALL_USERS` | いいえ | `false` | ボットに届く Discord のユーザーをすべて許可する、明示的な設定です。Discord についてのみ 0.18 より前の開かれた挙動に戻します。信頼できる非公開のサーバーや開発用にだけ使ってください。 |
| `GATEWAY_ALLOW_ALL_USERS` | いいえ | `false` | すべてのゲートウェイのプラットフォームでの全体的な許可の設定です。つないでいるすべてのプラットフォームを開放したいのでなければ、プラットフォームごとの `DISCORD_ALLOW_ALL_USERS` を使ってください。 |
| `DISCORD_HOME_CHANNEL` | いいえ | — | ボットが自発的なメッセージ（cron の出力、リマインダー、通知）を送るチャンネルの ID。 |
| `DISCORD_HOME_CHANNEL_NAME` | いいえ | `"Home"` | ログや状態表示で使うホームチャンネルの表示名。 |
| `DISCORD_COMMAND_SYNC_POLICY` | いいえ | `"safe"` | 起動時のネイティブのスラッシュコマンドの同期を制御します。`"safe"` は既存のグローバルなコマンドと比べて変わった分だけ更新し、Discord のメタデータの変更が部分更新で反映できない場合はコマンドを作り直します。`"bulk"` は以前の `tree.sync()` の挙動を保ちます。`"off"` は起動時の同期を行いません。 |
| `DISCORD_REQUIRE_MENTION` | いいえ | `true` | `true` のとき、サーバーのチャンネルでは `@mentioned` されたときだけ応答します。`false` にすると、どのチャンネルでもすべてのメッセージに応答します。 |
| `DISCORD_THREAD_REQUIRE_MENTION` | いいえ | `false` | `true` のとき、スレッド内でメンションを省ける仕組みが無効になります。スレッドもチャンネルと同じ扱いになり、ボットがすでに参加していても `@mention` が必要です。1 つのスレッドに複数のボットがいて、それぞれ明示的な `@mention` のときだけ動かしたい場合に使います。 |
| `DISCORD_FREE_RESPONSE_CHANNELS` | いいえ | — | `DISCORD_REQUIRE_MENTION` が `true` でも、`@mention` なしで応答するチャンネルの ID をカンマ区切りで指定します。 |
| `DISCORD_IGNORE_NO_MENTION` | いいえ | `true` | `true` のとき、ほかのユーザーを `@mentions` していてボットをメンションして**いない**メッセージには黙っています。ほかの人に向けられた会話にボットが割り込むのを防ぎます。サーバーのチャンネルにだけ効き、DM には効きません。 |
| `DISCORD_AUTO_THREAD` | いいえ | `true` | `true` のとき、テキストチャンネルでの `@mention` ごとに新しいスレッドを自動で作り、会話を切り分けます（Slack に近い挙動です）。すでにスレッドの中や DM のメッセージには影響しません。 |
| `DISCORD_ALLOW_BOTS` | いいえ | `"none"` | ほかの Discord のボットからのメッセージの扱いを決めます。`"none"` はほかのボットをすべて無視します。`"mentions"` は Hermes を `@mention` したボットのメッセージだけを受け付けます。`"all"` はボットのメッセージをすべて受け付けます。 |
| `DISCORD_REACTIONS` | いいえ | `true` | `true` のとき、処理中にメッセージへ絵文字のリアクションを付けます（開始時に 👀、成功で ✅、エラーで ❌）。`false` にするとリアクションを一切付けません。 |
| `DISCORD_IGNORED_CHANNELS` | いいえ | — | `@mentioned` されても**絶対に**応答しないチャンネルの ID をカンマ区切りで指定します。ほかのチャンネルの設定より優先されます。 |
| `DISCORD_ALLOWED_CHANNELS` | いいえ | — | チャンネル ID をカンマ区切りで指定します。設定すると、ボットはこれらのチャンネル（と、許可されていれば DM）で**だけ**応答します。`config.yaml` の `discord.allowed_channels` を上書きします。`DISCORD_IGNORED_CHANNELS` と組み合わせて、許可と拒否の規則を表せます。 |
| `DISCORD_NO_THREAD_CHANNELS` | いいえ | — | スレッドを作らずチャンネルの中で直接応答するチャンネルの ID をカンマ区切りで指定します。`DISCORD_AUTO_THREAD` が `true` のときにだけ意味があります。 |
| `DISCORD_HISTORY_BACKFILL` | いいえ | `true` | `true` のとき、メンションされた際に（ボットの最後の応答以降の）そのチャンネルの直近のやり取りをユーザーのメッセージの前に足します。`require_mention` では取りこぼす文脈を拾い直せます。DM とメンション不要のチャンネルでは行いません。`false` にすると無効になります。 |
| `DISCORD_HISTORY_BACKFILL_LIMIT` | いいえ | `50` | 補完する内容を組み立てるときに、さかのぼって調べるメッセージの最大数。実際には、そのチャンネルでのボット自身の最後のメッセージで、もっと手前で止まるのが普通です。 |
| `DISCORD_REPLY_TO_MODE` | いいえ | `"first"` | 返信の参照の付け方を決めます。`"off"` は元のメッセージへの返信にしない、`"first"` は最初の分割分にだけ返信の参照を付ける（既定）、`"all"` はすべての分割分に付ける、です。 |
| `DISCORD_ALLOW_MENTION_EVERYONE` | いいえ | `false` | `false`（既定）のとき、応答にその文字列が含まれていても、ボットは `@everyone` や `@here` に通知を飛ばせません。`true` にすると許可されます。下の [メンションの制御](#mention-control) を参照してください。 |
| `DISCORD_ALLOW_MENTION_ROLES` | いいえ | `false` | `false`（既定）のとき、ボットは `@role` のメンションで通知を飛ばせません。`true` にすると許可されます。 |
| `DISCORD_ALLOW_MENTION_USERS` | いいえ | `true` | `true`（既定）のとき、ボットは ID を指定して個々のユーザーに通知を飛ばせます。 |
| `DISCORD_ALLOW_MENTION_REPLIED_USER` | いいえ | `true` | `true`（既定）のとき、メッセージへの返信で元の投稿者に通知が飛びます。 |
| `DISCORD_PROXY` | いいえ | — | Discord への接続（HTTP、WebSocket、REST）に使うプロキシの URL。`HTTPS_PROXY` / `ALL_PROXY` より優先されます。`http://`、`https://`、`socks5://` に対応します。 |
| `DISCORD_ALLOW_ANY_ATTACHMENT` | いいえ | `false` | `true` のとき、どの種類のファイルの添付も受け付けます（組み込みの PDF／テキスト／zip／オフィス文書の許可リストに限りません）。知らない種類はディスクにキャッシュされ、MIME を `application/octet-stream` としてローカルのパスの形でエージェントに渡されるので、`terminal` / `read_file` / `ffprobe` などで中身を調べられます。 |
| `DISCORD_MAX_ATTACHMENT_BYTES` | いいえ | `33554432` | ゲートウェイがダウンロードしてキャッシュする、添付 1 つあたりの最大バイト数。既定は 32 MiB です。`0` にすると上限なしになります（書き込みの間ファイルはメモリに保持されるので、上限なしには相応のメモリの負担があります）。 |
| `HERMES_DISCORD_TEXT_BATCH_DELAY_SECONDS` | いいえ | `0.6` | 待たせているテキストの断片を送り出す前に、アダプターが待つ猶予。ストリーミングの出力をなめらかにするのに役立ちます。 |
| `HERMES_DISCORD_TEXT_BATCH_SPLIT_DELAY_SECONDS` | いいえ | `2.0` | 1 つのメッセージが Discord の長さの上限を超えて分割されたとき、断片どうしの間隔。 |

:::warning ボットどうしの会話には対応していません
`DISCORD_ALLOW_BOTS` は、信頼できる特定のボット（中継用や Webhook のボットなど）からの入力を受け付けるためのもので、2 つの Hermes のプロファイルを会話させるためのものではありません。既定の `"none"` はほかのボットをすべて無視する、安全な設定です。

複数の Hermes のプロファイルに `"mentions"` や `"all"` を設定して、共有のチャンネルで互いに返信させる構成は対応していません。Discord は返信のたびに返信先の投稿者を自動で `@mentions` するため、`"mentions"` では 2 つのボットが互いのメンションの条件をいつまでも満たし合い、応答が止まらなくなります。これを止める仕組みはありません。対応している設定は `DISCORD_ALLOW_BOTS` を `"none"` のままにしておくことだけだからです。どうしても特定のボットを受け付けるなら、対象を狭く絞り、自動で返信するエージェントは決して相手にしないでください。
:::

### 設定ファイル（`config.yaml`） {#config-file-configyaml}

`~/.hermes/config.yaml` の `discord` の節は、上の環境変数と同じ内容を扱います。config.yaml の設定は既定値として適用されるので、対応する環境変数がすでに設定されていればそちらが勝ちます。

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

**型:** 真偽値 — **既定:** `true`

有効なとき、ボットはサーバーのチャンネルでは直接 `@mentioned` されたときだけ応答します。DM はこの設定に関わらず必ず応答します。

#### `discord.thread_require_mention` {#discordthreadrequiremention}

**型:** 真偽値 — **既定:** `false`

既定では、ボットがいったんスレッドに参加すると（`@mention` で自動作成された、あるいは一度返信した）、そのスレッドではあらためて `@mentioned` されなくても以降のすべてのメッセージに応答し続けます。1 対 1 の会話にはこれが適切な既定です。

ただし、1 つのスレッドに**複数のボット**がいて、その都度どれか 1 つに話しかける使い方では、この既定が裏目に出ます。スレッドにいるほかのボットまでメッセージのたびに動き、費用がかさみ、チャンネルが騒がしくなります。`thread_require_mention: true` にすると、スレッド内でメンションを省ける仕組みが無効になり、スレッドもチャンネルと同じ扱いになります。明示的な `@mentions` はこれまでどおり効きます。

```yaml
discord:
  require_mention: true
  thread_require_mention: true    # multi-bot setup
```

#### `discord.free_response_channels` {#discordfreeresponsechannels}

**型:** 文字列またはリスト — **既定:** `""`

`@mention` なしですべてのメッセージに応答するチャンネルの ID です。カンマ区切りの文字列でも、YAML のリストでも書けます。

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

スレッドの親のチャンネルがこの一覧にあれば、そのスレッドもメンション不要になります。

メンション不要のチャンネルでは**自動でのスレッド作成も行いません**。メッセージごとに新しいスレッドを作るのではなく、その場で返信します。こうすることで、チャンネルを気軽な会話の場として使えます。スレッドにしたい場合は、そのチャンネルをメンション不要に含めず、通常の `@mention` の流れを使ってください。

#### `discord.auto_thread` {#discordautothread}

**型:** 真偽値 — **既定:** `true`

有効なとき、通常のテキストチャンネルでの `@mention` ごとに、会話用の新しいスレッドが自動で作られます。本体のチャンネルが散らからず、会話ごとに独立したセッションの履歴を持てます。スレッドができてしまえば、その中の以降のメッセージに `@mention` は要りません。ボットは自分が参加していることを知っています。複数のボットがいる構成でスレッド内のこの省略をやめたい場合は、[`thread_require_mention`](#discordthread_require_mention) を `true` にしてください。

すでにあるスレッドや DM に送ったメッセージは、この設定の影響を受けません。`discord.free_response_channels` や `discord.no_thread_channels` に挙げたチャンネルも自動でのスレッド作成を行わず、その場での返信になります。

#### `discord.reactions` {#discordreactions}

**型:** 真偽値 — **既定:** `true`

処理の状況を目で追えるように、ボットがメッセージへ絵文字のリアクションを付けるかどうかを決めます。
- 👀 メッセージの処理を始めたとき
- ✅ 応答が無事に届いたとき
- ❌ 処理の途中でエラーが起きたとき

リアクションが気になる場合や、ボットのロールに **Add Reactions** の権限がない場合は無効にしてください。

#### `discord.ignored_channels` {#discordignoredchannels}

**型:** 文字列またはリスト — **既定:** `[]`

直接 `@mentioned` されても**絶対に**応答しないチャンネルの ID です。これがいちばん優先されます。一覧にあるチャンネルでは、`require_mention` や `free_response_channels` などほかの設定に関わらず、すべてのメッセージが黙って無視されます。

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

スレッドの親のチャンネルがこの一覧にあれば、そのスレッドのメッセージも無視されます。

#### `discord.no_thread_channels` {#discordnothreadchannels}

**型:** 文字列またはリスト — **既定:** `[]`

スレッドを自動で作らず、チャンネルの中で直接応答するチャンネルの ID です。`auto_thread` が `true`（既定）のときにだけ効きます。これらのチャンネルでは、新しいスレッドを作らず普通のメッセージのようにその場で返信します。

```yaml
discord:
  no_thread_channels:
    - 1234567890  # Bot responds inline here
```

ボットとのやり取り専用のチャンネルで、スレッドがかえって邪魔になる場合に便利です。

#### `discord.channel_prompts` {#discordchannelprompts}

**型:** 対応表 — **既定:** `{}`

チャンネルごとの一時的なシステムプロンプトです。該当する Discord のチャンネルやスレッドでは毎ターン差し込まれ、会話の記録には残りません。

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

挙動:
- スレッドやチャンネルの ID がぴったり一致するものが優先されます。
- スレッドやフォーラムの投稿にメッセージが届き、そのスレッドに設定がない場合、Hermes は親のチャンネルやフォーラムの ID の設定に戻ります。
- プロンプトは実行時に一時的に適用されるので、変更すれば過去の記録を書き換えずに次のターンからすぐ反映されます。

#### `discord.history_backfill` {#discordhistorybackfill}

**型:** 真偽値 — **既定:** `true`

有効なとき、`@mention` のたびに、取りこぼしたチャンネルのメッセージを拾い直します。`require_mention: true` では、ボットは自分をタグ付けしたメッセージしか処理しないため、チャンネルのそれ以外のやり取りはセッションの記録から見えません。この補完は、呼ばれた時点でチャンネルの直近の履歴をさかのぼり、ボットの最後の応答から今回のメンションまでのメッセージを集めて文脈に含めます。

場面ごとの挙動は次のとおりです。

- **サーバーのチャンネル**（`require_mention: true` のとき）: ボットの最後の応答以降のチャンネルを調べます。ボットが呼ばれていない間にほかの人が書き込んでいた場合に役立ちます。
- **スレッド**: そのスレッドだけを調べます。Discord の `channel.history()` はスレッドに対してそのスレッドのメッセージだけを返し、親のチャンネルは含みません。スレッドはたいてい完結した会話なので、これで適切です。
- **DM**: 行いません。DM はすべてのメッセージがボットを動かすので、セッションの記録はすでに完全です。埋めるべき隙間がありません。
- **メンション不要のチャンネル**と**ボット自身が自動で作ったスレッド**: 同じ理由で行いません。メンションで絞っていないので隙間が生まれません。

ユーザーごとのセッション（既定の `group_sessions_per_user: true`）でも効きます。そのユーザーのセッションには、チャンネルのほかの参加者が書いた内容も、タグ付けする前の自分のメッセージも入っていません。補完はその両方を埋めます。

```yaml
discord:
  history_backfill: true   # default
```

無効にするには次のようにします。

```yaml
discord:
  history_backfill: false
```

> **補足:** ボットが処理している*最中*に届いたメッセージ（呼び出しから応答までの間のもの）は拾われません。これは割り切った仕様で、必要なら送り直すか、もう一度タグ付けしてください。

#### `discord.history_backfill_limit` {#discordhistorybackfilllimit}

**型:** 整数 — **既定:** `50`

チャンネルの文脈を拾い直すときに、さかのぼって調べるメッセージの最大数です。実際にはもっと手前で止まるのが普通で、そのチャンネルでのボット自身の最後のメッセージが、ターンとターンの自然な境目になります。この上限は、直近の履歴にボットのメッセージがない、起動直後や間隔が空いた場合のための安全弁です。

```yaml
discord:
  history_backfill: true
  history_backfill_limit: 50
```

#### `discord.missed_message_backfill` {#discordmissedmessagebackfill}

**型:** オブジェクト — **既定:** 無効

Discord の WebSocket の再開の猶予は、再起動やネットワークの障害の間に切れることがあります。その間に送られたメッセージは、その場のゲートウェイのイベントとしては届きません。この設定を有効にすると、Discord につなぎ直したあとに Hermes が設定したチャンネルとスレッドの履歴を範囲を限って調べ、まだ処理していないメッセージを、その場のイベントと同じ認可・メンション・チャンネル・重複除去・振り分けの経路に通します。

```yaml
discord:
  missed_message_backfill:
    enabled: true
    channels: ["123456789012345678"]
    window_seconds: 3600
    limit: 100
    max_dispatches: 10
```

`channels` が空のとき、Hermes は `discord.free_response_channels` を使います。`"*"` にするのは、到達できるサーバーのテキストチャンネルをすべて調べさせたいときだけにしてください。処理済みの記録はプロファイルごとに `gateway/discord_message_recovery.db` に保存され、いちど答えたメッセージがあとの再起動で再び処理されるのを防ぎます。

#### `group_sessions_per_user` {#groupsessionsperuser}

**型:** 真偽値 — **既定:** `true`

これは Discord に限らないゲートウェイ全体の設定で、同じチャンネルにいるユーザーどうしのセッションの履歴を分けるかどうかを決めます。

`true` のとき、`#research` で話している Alice と Bob は、それぞれ別々の会話を Hermes と持ちます。`false` のとき、チャンネル全体で 1 つの会話の記録と 1 つの実行枠を共有します。

```yaml
group_sessions_per_user: true
```

それぞれのモードの意味は、上の [セッションの考え方](#session-model-in-discord) の節をご覧ください。

#### `display.tool_progress` {#displaytoolprogress}

**型:** 文字列 — **既定:** `"all"` — **値:** `off`、`new`、`all`、`verbose`

処理中にチャットへ進捗のメッセージ（「Reading file...」「Running terminal command...」など）を送るかどうかを決めます。すべてのプラットフォームに効く、ゲートウェイ全体の設定です。

```yaml
display:
  tool_progress: "all"    # off | new | all | verbose
```

- `off` — 進捗のメッセージを出さない
- `new` — ターンごとに最初のツール呼び出しだけ出す
- `all` — すべてのツール呼び出しを出す（ゲートウェイのメッセージでは 40 文字に切り詰めます）
- `verbose` — ツール呼び出しの詳細をすべて出す（メッセージが長くなることがあります）

#### `display.tool_progress_command` {#displaytoolprogresscommand}

**型:** 真偽値 — **既定:** `false`

有効にすると、ゲートウェイで `/verbose` のスラッシュコマンドが使えるようになり、config.yaml を編集せずに進捗の表示モード（`off → new → all → verbose → off`）を切り替えられます。

```yaml
display:
  tool_progress_command: true
```

#### `display.reasoning_style` {#displayreasoningstyle}

**型:** 文字列 — **既定（Discord）:** `"subtext"` — **値:** `code`、`blockquote`、`subtext`

推論の表示を有効にしたとき、モデルの推論の部分をどう描くかを決めます。Discord の既定は `subtext` で、Discord 本来の `-# ` による小さな灰色の補助表示を使うため、推論は答えより控えめに見えます。`blockquote` は `>` の引用として、`code`（ほかのプラットフォームでの既定）はコードブロックとして描きます。長い推論は先頭 15 行にまとめられます。

```yaml
display:
  platforms:
    discord:
      reasoning_style: subtext   # code | blockquote | subtext
```

## スラッシュコマンドの権限管理 {#slash-command-access-control}

既定では、許可されたユーザーは全員がすべてのスラッシュコマンドを実行できます。許可リストを**管理者**（スラッシュコマンドをすべて使える）と**通常のユーザー**（明示的に許可したコマンドだけ）に分けるには、Discord のプラットフォームの `extra` に `allow_admin_from` と `user_allowed_commands` を追加します。

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

**挙動:**

- ある範囲（DM かサーバーのチャンネルか）で `allow_admin_from` に載っているユーザーは、稼働中のコマンドの登録簿を通じて、登録済みのスラッシュコマンドを**すべて**実行できます。組み込みのものも、プラグインが登録したものもです。
- `allow_admin_from` に載っていないユーザーは、`user_allowed_commands` に書いたコマンドと、常に許可される `/help`・`/whoami` だけを実行できます。
- 普通の会話（スラッシュでないメッセージ）には影響しません。管理者でないユーザーも、これまでどおりエージェントと話せます。任意のコマンドを実行できないだけです。
- **以前の設定との互換性:** ある範囲で `allow_admin_from` を設定していなければ、その範囲ではスラッシュコマンドの制限が無効になります。既存の環境は何も変えずにそのまま動きます。
- DM の管理者だからといってサーバーのチャンネルの管理者になるわけではありません。範囲ごとに別々の管理者リストがあります。

`/whoami` を使うと、現在の範囲、自分の段階（admin / user / unrestricted）、実行できるスラッシュコマンドがわかります。

## 対話式のモデル選択 {#interactive-model-picker}

Discord のチャンネルで引数なしの `/model` を送ると、ドロップダウン形式のモデル選択が開きます。

1. **プロバイダーの選択** — 利用できるプロバイダーを並べたドロップダウン（最大 25 件）。
2. **モデルの選択** — 選んだプロバイダーのモデルを並べた 2 つ目のドロップダウン（最大 25 件）。

選択画面は 120 秒で閉じます。操作できるのは許可されたユーザー（`DISCORD_ALLOWED_USERS` に載っている人）だけです。モデル名がわかっているなら、`/model <name>` と直接打ってください。

## スキルのネイティブなスラッシュコマンド {#native-slash-commands-for-skills}

Hermes は、導入済みのスキルを **Discord のネイティブなアプリケーションコマンド**として自動で登録します。つまり、Discord の `/` の入力補完に、組み込みのコマンドと並んでスキルが出てきます。

- スキルはそれぞれ Discord のスラッシュコマンドになります（例: `/code-review`、`/ascii-art`）
- スキルは任意の `args` という文字列の引数を受け取れます
- Discord のアプリケーションコマンドはボットごとに 100 件までです。スキルが枠より多い場合、あふれた分はログに警告を出して飛ばされます
- スキルは、`/model`、`/reset`、`/bg` などの組み込みコマンドと一緒に、ボットの起動時に登録されます

追加の設定は要りません。`hermes skills install` で入れたスキルは、次にゲートウェイを再起動したときに Discord のスラッシュコマンドとして自動で登録されます。

### スラッシュコマンドの登録を止める {#disabling-slash-command-registration}

同じ Discord のアプリケーションに対して複数の Hermes のゲートウェイを動かしている場合（検証用と本番など）、全体のスラッシュコマンドの登録を持つのは 1 つだけにすべきです。そうしないと、最後に起動したものが勝って登録が行ったり来たりします。追従する側のゲートウェイでは登録を切ってください。

```yaml
gateway:
  platforms:
    discord:
      extra:
        slash_commands: false   # default: true
```

主となるゲートウェイで `true` のままにしておけば、組み込みのコマンドと導入済みのスキルが `/` のメニューに出る、通常の挙動になります。

## メディアを送る（本文中の `MEDIA:` の印） {#sending-media-inline-media-tags}

Discord のアダプターは、エージェントの応答に書かれた `MEDIA:/path/to/file` の印を通じて、よく使うメディアの形式すべてをネイティブのファイルとしてアップロードできます。アダプターはその印を取り除き、ファイルを自動でアップロードします。

| 種類 | 届き方 |
|---|---|
| 画像（PNG/JPG/WebP） | Discord のネイティブな画像の添付として、その場でプレビュー付きで表示 |
| 動く GIF | `send_animation` が `animation.gif` としてアップロードするので、静止画のサムネイルではなく Discord がその場で再生します |
| 動画（MP4/MOV） | `send_video` — ネイティブの動画プレイヤー |
| 音声・ボイス | `send_voice` — 可能ならネイティブのボイスメッセージ、無理ならファイルの添付 |
| 文書（PDF/ZIP/docx など） | `send_document` — ダウンロードのボタンが付いたネイティブの添付 |

Discord の 1 回あたりのアップロードの上限は、サーバーのブーストの段階で変わります（無料で 25 MB、最大 500 MB）。Hermes が HTTP 413 を受け取った場合、黙って失敗するのではなく、ローカルのキャッシュのパスを指すリンクに切り替えます。

## どんな種類のファイルでも受け取る {#receiving-arbitrary-file-types}

ユーザーがアップロードするファイルは、種類を問わず受け付けます。関門になるのはエージェントへメッセージを送る権限であって、拡張子ではありません。アップロードはすべてダウンロードされて `~/.hermes/cache/documents/` にキャッシュされ、`DOCUMENT` 型のメッセージのイベントとしてエージェントに渡されるので、`terminal`（`ffprobe`、`unzip`、`file`、`strings` など）や `read_file` で中身を調べられます。

- 既知の種類（PDF、docx/xlsx/pptx、zip、画像・音声・動画など）は、正確な MIME のまま扱われます。
- 知らない種類は、アップロード時に申告された内容種別に、それもなければ `application/octet-stream` に落ちます。
- UTF-8 として読める小さいファイル（テキスト、コード、設定、HTML、CSS、JSON、YAML など）は、100 KiB までなら中身がプロンプトへ自動で差し込まれます。読み取れないバイナリは、文脈の窓を膨らませないように、パスを指す注記だけが渡されます（Docker や Modal のサンドボックスのターミナル向けには `to_agent_visible_cache_path` で自動的に読み替えられます）。

受け取る側の制限は、ファイル 1 つあたりのサイズの上限（既定は 32 MiB）だけです。

```yaml
discord:
  # Optional — raise/disable the per-file size cap. Default is 32 MiB.
  # The whole file is held in memory while being cached, so unlimited
  # uploads carry a real memory cost.
  max_attachment_bytes: 33554432   # bytes; 0 = unlimited
```

同じことを環境変数で書くと `DISCORD_MAX_ATTACHMENT_BYTES=33554432` です（上限なしにするなら `0`）。

以前からある `discord.allow_any_attachment` のフラグは何もしなくなりました。どの種類のファイルも常に受け付けるためで、既存の設定がエラーにならないように残してあるだけです。

:::warning 上限なしにしたときのメモリの負担
サイズの上限を外す（`max_attachment_bytes: 0`）と、数 GB のファイルをボットに投げられたとき、ゲートウェイはそれを律義にメモリに通しながらディスクへ書きます。信頼できる 1 人用の環境でだけ設定してください。共有のボットでは既定の 32 MiB のままにするか、控えめに引き上げてください。
:::

## 対話的な問いかけ（clarify） {#interactive-prompts-clarify}

どの方針がよいかをたずねる、作業後の感想を集める、判断の前に確認する、といった目的でエージェントが `clarify` ツールを呼ぶと、Discord では質問が**選択肢ごとのボタン**として表示されます。

> ダッシュボードにはどのフレームワークを使いましょうか?
>
> [1. Next.js] [2. Remix] [3. Astro] [その他（入力する）]

番号のボタンを押して答えるか、**その他**を押して自由に入力します（そのチャンネルで次に送ったメッセージが答えになります）。選択肢のない自由回答の `clarify` では、ボタンは出ず、次のメッセージがそのまま答えになります。

いちど選ぶとボタンは押せなくなるので、二重に押して二重に答えてしまうことはありません。回答の待ち時間は `~/.hermes/config.yaml` の `agent.clarify_timeout` で設定します（既定は `600` 秒）。時間内に答えないと、エージェントは待ち続けるのではなく、代わりの合図を受けて先へ進みます。

## ホームチャンネル {#home-channel}

ボットが自発的なメッセージ（cron ジョブの出力、リマインダー、通知など）を送る「ホームチャンネル」を指定できます。設定の方法は 2 つあります。

### スラッシュコマンドを使う {#using-the-slash-command}

ボットがいる Discord のチャンネルで `/sethome` と打ちます。そのチャンネルがホームチャンネルになります。

### 手動で設定する {#manual-configuration}

`~/.hermes/.env` に次を追加します。

```bash
DISCORD_HOME_CHANNEL=123456789012345678
DISCORD_HOME_CHANNEL_NAME="#bot-updates"
```

ID の部分は実際のチャンネル ID に置き換えてください（開発者モードを有効にして、右クリック → チャンネル ID をコピー）。

## 音声メッセージ {#voice-messages}

Hermes Agent は Discord の音声メッセージに対応しています。

- **受け取った音声メッセージ**は、設定した音声認識のプロバイダーで自動的に文字起こしされます。ローカルの `faster-whisper`（キー不要）、Groq Whisper（`GROQ_API_KEY`）、OpenAI Whisper（`VOICE_TOOLS_OPENAI_KEY`）が使えます。
- **音声合成**: `/voice tts` を使うと、テキストの返信と一緒に読み上げの音声も送られます。
- **Discord のボイスチャンネル**: Hermes はボイスチャンネルに入り、話している人の声を聞き、そのチャンネルで話し返すこともできます。

設定と運用の詳しい手順は次をご覧ください。
- [音声モード](/hermes/docs/user-guide/features/voice-mode/)
- [Hermes で音声モードを使う](/hermes/docs/guides/use-voice-mode-with-hermes/)

### ボイスチャンネルの音の演出（環境音と口頭の受け答え） {#voice-channel-audio-effects-ambient-verbal-acks}

ボットがボイスチャンネルにいるとき、もっと会話らしい雰囲気にできます。作業を始める前に短く「let me look into that」と口頭で受け答えし、ツールを動かしている間は控えめな「考え中」の環境音を下に流します。話し始めると環境音が下がり、話し終わると戻ります。Grok の音声モードに近い感じです。

discord.py は 1 つの接続につき 1 つの音声の流れしか再生できないので、Hermes は送信側にソフトウェアのミキサーを入れて、環境音のループ、受け答え、音声合成の返信を 1 つの流れにまとめます。互いを打ち消さず重なって聞こえます。

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
- 明示的な `/voice leave` か手動での切断まで、ボットをボイスチャンネルに残しておきたい場合は `voice_channel_inactivity_timeout_seconds: 0` を設定します。既定は従来どおり、300 秒の無操作で自動的に退出します。
- `voice_playback_timeout_seconds` は下限であって、長い音声合成に対する上限ではありません。Hermes は生成した音声の長さを調べ、設定した下限より長ければ `duration + 30s` だけ待ちます。
- 口頭の受け答えはターンにつき 1 回まで、ボットがボイスチャンネルにいてミキサーが動いているときだけ鳴ります。設定した音声合成のプロバイダーを使います。
- `ambient_path` には `ffmpeg` が読める形式のファイルを指定でき、切れ目なく繰り返されます。空のままにすると、組み込みの合成音が使われます（素材は不要です）。
- 設定はすべて `.env` ではなく `config.yaml` にあります。秘密ではなく振る舞いの設定だからです。
- `voice_fx.enabled` が `false` のときは、音声の再生は従来の一度きりの経路になり、何も変わりません。

## フォーラムチャンネル {#forum-channels}

Discord のフォーラムチャンネル（種別 15）はメッセージを直接受け付けません。フォーラムへの投稿はすべてスレッドである必要があります。Hermes はフォーラムチャンネルを自動で見分け、そこへ送る必要があるときは新しいスレッドの投稿を作ります。そのため、テキストの返信、音声合成、画像、音声メッセージ、添付ファイルはどれも、エージェント側で特別なことをせずに動きます。

- **スレッドの名前**はメッセージの 1 行目から作られます（マークダウンの見出しの記号は取り除き、100 文字で切ります）。添付だけのメッセージのときは、ファイル名がスレッド名になります。
- **添付**は新しいスレッドの最初のメッセージに一緒に載ります。別途アップロードする手順も、途中まで送られる状態もありません。
- **1 回の送信につき 1 つのスレッド**: フォーラムへの送信ごとに新しいスレッドができます。同じフォーラムに続けて送れば、別々のスレッドになります。
- **判別は 3 段構え**: まずチャンネルの一覧のキャッシュ、次にプロセス内の判定のキャッシュ、最後の手段として `GET /channels/{id}` の実際の問い合わせです（その結果はプロセスが生きている間は覚えておきます）。

一覧を更新すると（対応しているプラットフォームでの `/channels refresh`、またはゲートウェイの再起動）、ボットの起動後に作られたフォーラムチャンネルもキャッシュに入ります。

## うまくいかないとき {#troubleshooting}

### ボットはオンラインなのにメッセージへ反応しない {#bot-is-online-but-not-responding-to-messages}

**原因**: Message Content Intent が無効になっているか、アクセスの方針が何も設定されておらず Discord の認可が安全側に倒れて拒否しています。

**対処**:

1. [開発者ポータル](https://discord.com/developers/applications) → 自分のアプリ → Bot → Privileged Gateway Intents と進み、**Message Content Intent** を有効にして Save Changes を押します。
2. Discord のアクセスの方針が少なくとも 1 つ設定されているか確認します。

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

ゲートウェイのログでは Discord に接続できていて REST API の確認も通るのに、届いたメッセージがすべて無反応なら、`~/.hermes/logs/gateway.log` に次の警告が出ていないか探してください。

```text
No Discord access policy configured; inbound Discord messages will be denied by default.
```

Hermes 0.18 は、外から届く経路のアダプターでは意図的に安全側へ倒れます。`DISCORD_ALLOWED_USERS` も `DISCORD_ALLOWED_ROLES` も `DISCORD_ALLOWED_CHANNELS` も、明示的な全許可のフラグもない Discord のボットは、接続には成功しますが、通常のメッセージの処理より前に届いたユーザーを拒否します。

### 起動時の「Privileged intents」／`PrivilegedIntentsRequired` のエラー {#privileged-intents-privilegedintentsrequired-error-on-startup}

**原因**: 開発者ポータルで有効にしていない特権 Gateway インテントを Hermes が要求しています。Discord はそれを理由に WebSocket の接続を拒否します。Hermes は常に **Message Content Intent** を要求します。また、許可リストに（数値の ID ではなく）ユーザー名を使っている場合や `DISCORD_ALLOWED_ROLES` を設定している場合は **Server Members Intent** も要求します。Presence Intent は不要です。

**対処**:

1. [開発者ポータル](https://discord.com/developers/applications) → 自分のアプリ → Bot → Privileged Gateway Intents と進みます。
2. **Message Content Intent** を有効にします（必須）。ユーザー名やロールの許可リストを使っている場合は **Server Members Intent** も有効にします。
3. **Save Changes** を押し、ゲートウェイを再起動します（`hermes gateway restart`）。

ゲートウェイのログには、Hermes が要求したインテントの名前が出ます。有効にするまで Discord は接続を拒み続けます。これはポータルの設定の誤りであって、ネットワークが不安定なわけではありません。

### 特定のチャンネルでボットがメッセージを見られない {#bot-cant-see-messages-in-a-specific-channel}

**原因**: ボットのロールに、そのチャンネルを見る権限がありません。

**対処**: Discord でそのチャンネルの設定 → 権限 と進み、**View Channel** と **Read Message History** を有効にしたボットのロールを追加します。

### 403 Forbidden のエラー {#403-forbidden-errors}

**原因**: ボットに必要な権限が足りていません。

**対処**: 手順 5 の URL を使って正しい権限で招待し直すか、サーバー設定 → ロール でボットのロールの権限を手動で調整します。

### ボットがオフライン {#bot-is-offline}

**原因**: Hermes のゲートウェイが動いていないか、トークンが正しくありません。

**対処**: `hermes gateway` が動いているか確認します。`.env` の `DISCORD_BOT_TOKEN` も確かめてください。最近トークンをリセットしたなら、書き換えが必要です。

### 「User not allowed」／ボットに無視される {#user-not-allowed-bot-ignores-you}

**原因**: ユーザー ID が `DISCORD_ALLOWED_USERS` に入っていません。

**対処**: `~/.hermes/.env` の `DISCORD_ALLOWED_USERS` に自分のユーザー ID を追加し、ゲートウェイを再起動します。

### 同じチャンネルにいる人どうしで、意図せず文脈が共有される {#people-in-the-same-channel-are-sharing-context-unexpectedly}

**原因**: `group_sessions_per_user` が無効になっているか、その場面のメッセージについてプラットフォームがユーザー ID を出せていません。

**対処**: `~/.hermes/config.yaml` に次を設定し、ゲートウェイを再起動します。

```yaml
group_sessions_per_user: true
```

部屋で 1 つの会話を共有したいのであれば、無効のままで構いません。ただし、記録も割り込みの挙動も共有になることは想定しておいてください。

## セキュリティ {#security}

:::warning
ボットとやり取りできる相手を絞るために、必ず `DISCORD_ALLOWED_USERS`（または `DISCORD_ALLOWED_ROLES`）を設定してください。どちらもない場合、ゲートウェイは安全のため既定ですべてのユーザーを拒否します。許可するのは信頼できる人だけにしてください。許可されたユーザーは、ツールの利用やシステムへのアクセスを含め、エージェントの機能をすべて使えます。
:::

### ロールによる権限管理 {#role-based-access-control}

個々のユーザーの一覧ではなくロールで権限を管理しているサーバー（運営チーム、サポート担当、社内ツールなど）では、`DISCORD_ALLOWED_ROLES` にロール ID をカンマ区切りで指定します。そのロールを持つメンバーは許可されます。

```bash
# ~/.hermes/.env — works alongside or instead of DISCORD_ALLOWED_USERS
DISCORD_ALLOWED_ROLES=987654321098765432,876543210987654321
```

意味は次のとおりです。

- **ユーザーの許可リストとは OR。** ユーザーの ID が `DISCORD_ALLOWED_USERS` にある**か**、`DISCORD_ALLOWED_ROLES` のどれかのロールを持っていれば許可されます。
- **Server Members Intent が自動で有効になる。** `DISCORD_ALLOWED_ROLES` を設定すると、接続時に Members のインテントが有効になります。Discord がメンバーの記録にロールの情報を載せて送るのに必要です。
- **名前ではなくロール ID。** Discord で取得します。**ユーザー設定 → 詳細設定 → 開発者モードを ON** にして、ロールを右クリック → **ロール ID をコピー** です。
- **DM での判定。** DM では、共通して入っているサーバーを調べます。どこか 1 つでも共有するサーバーで許可されたロールを持っていれば、DM でも許可されます。

運営チームの入れ替わりが多いときは、この形がおすすめです。`.env` の編集もゲートウェイの再起動もなしに、ロールを与えた瞬間から新しい担当者が使えます。

### メンションの制御 {#mention-control}

既定では、返信にその文字列が含まれていても、Hermes はボットが `@everyone`、`@here`、ロールのメンションで通知を飛ばすのを止めます。書き方のまずいプロンプトや、ユーザーの発言をそのまま繰り返した文が、サーバー全体に通知を飛ばすのを防ぐためです。個々の `@user` への通知と、返信の参照による通知（「〜への返信」の小さな表示）は普通の会話に必要なので有効のままです。

この既定は、環境変数でも `config.yaml` でも緩められます。

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
必要な理由がはっきりしていないかぎり、`everyone` と `roles` は `false` のままにしてください。LLM が普通に見える応答の中に `@everyone` という文字列を出してしまうことは、とても簡単に起こります。この保護がないと、それだけでサーバーの全員に通知が飛びます。
:::

Hermes Agent の運用を安全にする方法については、[セキュリティの手引き](/hermes/docs/user-guide/security/) をご覧ください。
