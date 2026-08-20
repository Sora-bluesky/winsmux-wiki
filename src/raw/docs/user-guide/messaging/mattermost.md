---
title: "Mattermost"
description: "Hermes Agent を Mattermost のボットとして設定する"
upstream_path: user-guide/messaging/mattermost.md
upstream_blob: 5d86dc71c49abc3437dab1e8e40067dd306b0000
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/mattermost
---

# Mattermost の設定 {#mattermost-setup}

Hermes Agent は Mattermost にボットとして加わり、ダイレクトメッセージやチームのチャンネルから AI アシスタントと話せるようにします。Mattermost は自分のサーバーに置いて動かせるオープンソースの Slack 代替で、自前の設備で運用するぶん、データを最後まで自分の手に残せます。ボットは Mattermost の REST API（v4）でやり取りし、WebSocket でその場の出来事を受け取り、届いたメッセージを Hermes Agent の処理の流れ（ツールの利用、記憶、推論を含みます）に通して、すぐに返事を返します。文章、添付ファイル、画像、スラッシュコマンドに対応します。

Mattermost 用の外部ライブラリは要りません。アダプターが使う `aiohttp` は、すでに Hermes が依存しているものです。

設定の話に入る前に、多くの人が真っ先に知りたいところを見ておきます。Mattermost に入れたあと、Hermes がどう振る舞うかです。

## Hermes の振る舞い {#how-hermes-behaves}

| 場面 | 振る舞い |
|---------|----------|
| **DM** | Hermes はすべてのメッセージに返事をします。`@mention` は要りません。DM ごとに別のセッションになります。 |
| **公開／非公開チャンネル** | `@mention` を付けたときに Hermes が返事をします。付けないメッセージは無視します。 |
| **スレッド** | `MATTERMOST_REPLY_MODE=thread` にすると、Hermes は元のメッセージの下にスレッドで返します。スレッドの文脈は、親のチャンネルとは切り離されたままになります。 |
| **複数人がいる共有チャンネル** | 初期状態では、Hermes はチャンネルの中でも利用者ごとにセッションの履歴を分けます。同じチャンネルで話している二人が同じ記録を共有することはありません（自分で切らないかぎり）。 |

:::tip
返事を（元のメッセージの下にぶら下がる）スレッド形式にしたい場合は、`MATTERMOST_REPLY_MODE=thread` を設定してください。初期値は `off` で、チャンネルにそのままメッセージを流します。
:::

### Mattermost でのセッションの考え方 {#session-model-in-mattermost}

初期状態では、次のようになります。

- DM ごとに別のセッションになります
- スレッドごとに別のセッションの区画ができます
- 共有チャンネルでは、利用者ごとにそのチャンネル内で別のセッションを持ちます

これは `config.yaml` で決まります。

```yaml
group_sessions_per_user: true
```

チャンネル全体でひとつの会話を共有したいと明確に望むときだけ、`false` にしてください。

```yaml
group_sessions_per_user: false
```

共有セッションは共同作業のチャンネルでは便利ですが、次のことも意味します。

- 文脈の増え方とトークンの費用を、利用者どうしで分け合うことになります
- 誰かの長いツール中心の作業が、ほかの全員の文脈をふくらませます
- 誰かの実行中の処理が、同じチャンネルにいる別の人の追加の問いかけを遮ることがあります

このページでは、Mattermost でボットを作るところから最初のメッセージを送るところまで、設定の流れを一通りたどります。

## ステップ 1: ボットアカウントを有効にする {#step-1-enable-bot-accounts}

ボットを作るには、その前に Mattermost サーバー側でボットアカウントを有効にしておく必要があります。

1. **システム管理者** として Mattermost にログインします。
2. **システムコンソール** → **連携機能** → **ボットアカウント** を開きます。
3. **ボットアカウントの作成を有効にする** を **true** にします。
4. **保存** をクリックします。

:::info
システム管理者の権限がない場合は、Mattermost の管理者にボットアカウントの有効化と作成を頼んでください。
:::

## ステップ 2: ボットアカウントを作る {#step-2-create-a-bot-account}

1. Mattermost で **☰** メニュー（左上）→ **連携機能** → **ボットアカウント** をクリックします。
2. **ボットアカウントを追加** をクリックします。
3. 次の項目を埋めます。
   - **ユーザー名**: 例 `hermes`
   - **表示名**: 例 `Hermes Agent`
   - **説明**: 任意
   - **役割**: `Member` で足ります
4. **ボットアカウントを作成** をクリックします。
5. Mattermost が **ボットトークン** を表示します。**すぐに控えてください。**

:::warning[トークンが表示されるのは一度だけです]
ボットトークンは、ボットアカウントを作った瞬間に一度だけ表示されます。なくした場合は、ボットアカウントの設定から作り直すことになります。トークンを人目に触れる場所へ出したり、Git にコミットしたりしないでください。これを持っている相手は、ボットを完全に操作できます。
:::

トークンは安全な場所（たとえばパスワード管理ソフト）に保管してください。ステップ 5 で使います。

:::tip
ボットアカウントの代わりに **パーソナルアクセストークン** を使うこともできます。**プロフィール** → **セキュリティ** → **パーソナルアクセストークン** → **トークンを作成** と進みます。ボット用の利用者ではなく自分自身の利用者として Hermes に発言させたいときに便利です。
:::

## ステップ 3: ボットをチャンネルに追加する {#step-3-add-the-bot-to-channels}

ボットに返事をさせたいチャンネルには、ボットを参加させておく必要があります。

1. ボットを入れたいチャンネルを開きます。
2. チャンネル名 → **メンバーを追加** をクリックします。
3. ボットのユーザー名（例 `hermes`）を探して追加します。

DM の場合は、ボットとのダイレクトメッセージを開くだけで、すぐに返事ができるようになります。

## ステップ 4: 自分の Mattermost ユーザー ID を調べる {#step-4-find-your-mattermost-user-id}

Hermes Agent は、誰がボットとやり取りできるかを Mattermost のユーザー ID で管理します。調べ方は次のとおりです。

1. **アバター**（左上）→ **プロフィール** をクリックします。
2. プロフィールのダイアログにユーザー ID が表示されます。クリックすると控えられます。

ユーザー ID は `3uo8dkh1p7g1mfk49ear5fzs5c` のような 26 文字の英数字です。

:::warning
ユーザー ID は、ユーザー名とは **別のもの** です。ユーザー名は `@` のあとに続くもの（例 `@alice`）です。ユーザー ID のほうは、Mattermost が内部で使う長い英数字の識別子です。
:::

**別のやり方**: API からユーザー ID を取ることもできます。

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-mattermost-server/api/v4/users/me | jq .id
```

:::tip
**チャンネル ID** を知りたいときは、チャンネル名 → **情報を表示** をクリックします。情報のパネルにチャンネル ID が出ます。ホームチャンネルを手で設定するときに必要になります。
:::

## ステップ 5: Hermes Agent を設定する {#step-5-configure-hermes-agent}

### やり方 A: 対話式の設定（おすすめ） {#option-a-interactive-setup-recommended}

案内に沿って進むコマンドを実行します。

```bash
hermes gateway setup
```

聞かれたら **Mattermost** を選び、続けてサーバーの URL、ボットトークン、ユーザー ID を入力します。

### やり方 B: 手で設定する {#option-b-manual-configuration}

`~/.hermes/.env` に次の内容を書き足します。

```bash
# Required
MATTERMOST_URL=https://mm.example.com
MATTERMOST_TOKEN=***
MATTERMOST_ALLOWED_USERS=3uo8dkh1p7g1mfk49ear5fzs5c

# Multiple allowed users (comma-separated)
# MATTERMOST_ALLOWED_USERS=3uo8dkh1p7g1mfk49ear5fzs5c,8fk2jd9s0a7bncm1xqw4tp6r3e

# Optional: reply mode (thread or off, default: off)
# MATTERMOST_REPLY_MODE=thread

# Optional: respond without @mention (default: true = require mention)
# MATTERMOST_REQUIRE_MENTION=false

# Optional: channels where bot responds without @mention (comma-separated channel IDs)
# MATTERMOST_FREE_RESPONSE_CHANNELS=channel_id_1,channel_id_2
```

`~/.hermes/config.yaml` で調整できる、任意の振る舞いの設定です。

```yaml
group_sessions_per_user: true
```

- `group_sessions_per_user: true` にすると、共有チャンネルやスレッドの中でも参加者ごとに文脈が分かれたままになります

### ゲートウェイを起動する {#start-the-gateway}

設定が終わったら、Mattermost のゲートウェイを起動します。

```bash
hermes gateway
```

数秒のうちに、ボットが Mattermost サーバーにつながるはずです。DM でも、ボットを追加したチャンネルでもかまわないので、メッセージを送って試してみてください。

:::tip
`hermes gateway` は、背後で動かしたり systemd のサービスにしたりして、動かし続けることもできます。詳しくは配備のドキュメントを見てください。
:::

## ホームチャンネル {#home-channel}

ボットが自分から送るメッセージ（cron の実行結果、リマインダー、通知など）の届け先として、「ホームチャンネル」を決められます。設定の仕方は二つあります。

### スラッシュコマンドで設定する {#using-the-slash-command}

ボットがいる Mattermost のチャンネルで `/sethome` と打ちます。そのチャンネルがホームチャンネルになります。

### 手で設定する {#manual-configuration}

`~/.hermes/.env` に次の行を足します。

```bash
MATTERMOST_HOME_CHANNEL=abc123def456ghi789jkl012mn
```

ID の部分は、実際のチャンネル ID に置き換えてください（チャンネル名 → 情報を表示 → ID を控える）。

## 返信の形式 {#reply-mode}

`MATTERMOST_REPLY_MODE` は、Hermes が返事をどう投稿するかを決めます。

| 形式 | 振る舞い |
|------|----------|
| `off`（初期値） | ふつうの利用者と同じように、チャンネルにそのままメッセージを流します。 |
| `thread` | 元のメッセージの下にスレッドで返します。やり取りが多いときでもチャンネルが散らかりません。 |

`~/.hermes/.env` で設定します。

```bash
MATTERMOST_REPLY_MODE=thread
```

## メンションの扱い {#mention-behavior}

初期状態では、チャンネルの中でボットが返事をするのは `@mentioned` されたときだけです。これは変えられます。

| 変数 | 初期値 | 説明 |
|----------|---------|-------------|
| `MATTERMOST_REQUIRE_MENTION` | `true` | `false` にすると、チャンネル内のすべてのメッセージに返事をします（DM はいつでも動きます）。 |
| `MATTERMOST_FREE_RESPONSE_CHANNELS` | _(なし)_ | `@mention` なしでもボットが返事をするチャンネル ID を、カンマ区切りで並べます。require_mention が true でも、ここに挙げたチャンネルでは返事をします。 |

Mattermost でチャンネル ID を調べるには、そのチャンネルを開き、見出しのチャンネル名をクリックして、URL かチャンネルの詳細に出ている ID を探します。

ボットが `@mentioned` されたとき、メンションの部分は処理に入る前に自動で取り除かれます。

## チャンネルの許可リスト（`allowed_channels`） {#channel-allowlist-allowedchannels}

ボットが動く Mattermost のチャンネルを、決まったいくつかに絞ります。設定すると、ボットが返事をするのはリストに ID があるチャンネル **だけ** になります。ほかのチャンネルから来たメッセージは、`@mentioned` されていても黙って捨てられます。

**DM はこの絞り込みの対象外** なので、許可された利用者はいつでもダイレクトメッセージでボットに届きます。

```yaml
mattermost:
  allowed_channels:
    - "abc123def456ghi789jkl012mno"   # #ops
    - "xyz987uvw654rst321opq098nml"   # #incident-response
```

環境変数（カンマ区切り）でも設定できます。

```bash
MATTERMOST_ALLOWED_CHANNELS="abc123def456ghi789jkl012mno,xyz987uvw654rst321opq098nml"
```

振る舞いは次のとおりです。

- 空、または未設定 → 制限なし（これまでどおり動きます）。
- 中身がある → チャンネル ID がリストにあることが必要です。なければ、ほかの判定（メンションの要否、`MATTERMOST_FREE_RESPONSE_CHANNELS` など）に進む前にメッセージが捨てられます。
- チャンネル ID は Mattermost の画面 → チャンネルの見出し → 「情報を表示」から調べるか、チャンネルの URL から読み取ります。

あわせて読む: [管理者用と利用者用に分かれたスラッシュコマンド](/hermes/docs/reference/slash-commands/#permissions-and-adminuser-split)。

## 困ったときは {#troubleshooting}

### ボットがメッセージに返事をしない {#bot-is-not-responding-to-messages}

**原因**: ボットがそのチャンネルに参加していないか、`MATTERMOST_ALLOWED_USERS` に自分のユーザー ID が入っていません。

**対処**: ボットをチャンネルに追加します（チャンネル名 → メンバーを追加 → ボットを探す）。自分のユーザー ID が `MATTERMOST_ALLOWED_USERS` にあるか確かめます。そのうえでゲートウェイを起動しなおします。

### 403 Forbidden が出る {#403-forbidden-errors}

**原因**: ボットトークンが無効か、そのチャンネルに投稿する権限がボットにありません。

**対処**: `.env` の `MATTERMOST_TOKEN` が正しいか確かめます。ボットアカウントが無効化されていないかも見てください。ボットがチャンネルに追加されているかも確かめます。パーソナルアクセストークンを使っている場合は、自分のアカウントに必要な権限があるかを確かめてください。

### WebSocket が切れる／つなぎ直しを繰り返す {#websocket-disconnects-reconnection-loops}

**原因**: 回線が不安定、Mattermost サーバーの再起動、あるいはファイアウォールやプロキシが WebSocket をうまく通していません。

**対処**: アダプターは待ち時間を延ばしながら自動でつなぎ直します（2 秒 → 60 秒）。サーバー側の WebSocket まわりの設定も見てください。リバースプロキシ（nginx、Apache）には WebSocket の upgrade ヘッダーの設定が必要です。Mattermost サーバーで WebSocket の通信がファイアウォールに止められていないかも確かめます。

nginx なら、設定に次の内容が入っていることを確かめてください。

```nginx
location /api/v4/websocket {
    proxy_pass http://mattermost-backend;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 600s;
}
```

### 起動時に "Failed to authenticate" が出る {#failed-to-authenticate-on-startup}

**原因**: トークンかサーバーの URL が違います。

**対処**: `MATTERMOST_URL` が自分の Mattermost サーバーを指しているか確かめます（`https://` を付け、末尾のスラッシュは付けません）。`MATTERMOST_TOKEN` が有効かは curl で試せます。

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-server/api/v4/users/me
```

ボットの利用者情報が返ってくればトークンは有効です。エラーが返るなら、トークンを作り直してください。

### ボットがオフラインになっている {#bot-is-offline}

**原因**: Hermes のゲートウェイが動いていないか、接続に失敗しています。

**対処**: `hermes gateway` が動いているか確かめます。端末の出力にエラーが出ていないか見てください。よくあるのは、URL の間違い、期限切れのトークン、Mattermost サーバーに届かない、といったところです。

### "User not allowed" と出る／ボットに無視される {#user-not-allowed-bot-ignores-you}

**原因**: 自分のユーザー ID が `MATTERMOST_ALLOWED_USERS` に入っていません。

**対処**: `~/.hermes/.env` の `MATTERMOST_ALLOWED_USERS` に自分のユーザー ID を足して、ゲートウェイを起動しなおします。ユーザー ID は `@username` ではなく 26 文字の英数字であることを忘れないでください。

## チャンネルごとのプロンプト {#per-channel-prompts}

特定の Mattermost チャンネルに、その場かぎりのシステムプロンプトを割り当てられます。プロンプトは毎回のやり取りのときに差し込まれ、会話の記録には残らないので、変更はすぐに効きます。

```yaml
mattermost:
  channel_prompts:
    "channel_id_abc123": |
      You are a research assistant. Focus on academic sources,
      citations, and concise synthesis.
    "channel_id_def456": |
      Code review mode. Be precise about edge cases and
      performance implications.
```

キーは Mattermost のチャンネル ID です（チャンネルの URL か API から調べられます）。当てはまるチャンネルのすべてのメッセージに、その場かぎりのシステム指示としてプロンプトが差し込まれます。

## セキュリティ {#security}

:::warning
`MATTERMOST_ALLOWED_USERS` は必ず設定して、ボットとやり取りできる相手を絞ってください。設定しない場合、ゲートウェイは安全のためにすべての利用者を拒みます。信頼できる人のユーザー ID だけを足してください。許可された利用者は、ツールの利用やシステムへの接触を含め、エージェントの機能をすべて使えます。
:::

Hermes Agent を安全に運用する方法については、[セキュリティのご案内](/hermes/docs/user-guide/security/)も見てください。

## 補足 {#notes}

- **自前のサーバーと相性がよい**: 自分で立てた Mattermost なら、どれでも動きます。Mattermost Cloud のアカウントや契約は要りません。
- **追加の依存関係なし**: アダプターは HTTP と WebSocket に `aiohttp` を使いますが、これは Hermes Agent にすでに入っています。
- **Team Edition でも動く**: Mattermost の Team Edition（無償）でも Enterprise Edition でも動きます。
