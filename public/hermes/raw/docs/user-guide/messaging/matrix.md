---
title: "Matrix"
description: "Hermes Agent を Matrix のボットとして動かす"
upstream_path: user-guide/messaging/matrix.md
upstream_blob: 39124393ed3681e9b438b809f43efa9bd93017e9
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/matrix
---

# Matrix の設定 {#matrix-setup}

Hermes Agent は、オープンで分散型のメッセージングプロトコルである Matrix と連携します。Matrix では自分のホームサーバーを立てることも、matrix.org のような公開サーバーを使うこともできます。どちらを選んでも、やり取りは自分の手の内に残ります。ボットは `mautrix` の Python SDK 経由で接続し、Hermes Agent の処理の流れ（ツールの利用・記憶・推論を含みます）でメッセージを処理して、その場で返事をします。テキスト、添付ファイル、画像、音声、動画に対応し、必要に応じてエンドツーエンド暗号化（E2EE）も使えます。

Hermes は Matrix のホームサーバーなら何でも扱えます。Synapse、Conduit、Dendrite、matrix.org のいずれでも動きます。

設定の前に、多くの人がまず知りたいところ、つまりつないだあとに Hermes がどう振る舞うのかを見ておきます。

## Hermes の振る舞い {#how-hermes-behaves}

| 場面 | 振る舞い |
|---------|----------|
| **個人チャット** | Hermes はすべてのメッセージに返事をします。`@mention` は要りません。個人チャットごとに別々のセッションを持ちます。個人チャットで `@mentioned` されたときにスレッドを立てたい場合は `MATRIX_DM_MENTION_THREADS=true` にします。 |
| **ルーム** | 初期状態では、Hermes は `@mention` されたときだけ返事をします。`MATRIX_REQUIRE_MENTION=false` にするか、`MATRIX_FREE_RESPONSE_ROOMS` にルーム ID を足すと、メンションなしで返すルームにできます。ルームへの招待は自動で受け入れます。 |
| **スレッド** | Hermes は Matrix のスレッド（MSC3440）に対応しています。スレッド内で返信すると、Hermes はそのスレッドの文脈をルーム本体のタイムラインから切り離して保ちます。ボットがすでに参加しているスレッドでは、メンションは要りません。 |
| **自動でのスレッド作成** | 初期状態では、Hermes はルームで返事をするたびにスレッドを自動で作ります。こうして会話どうしが混ざらないようにします。やめたいときは `MATRIX_AUTO_THREAD=false` にします。個人チャットのメッセージでもスレッドを自動で作りたい場合は `MATRIX_DM_AUTO_THREAD=true`（初期値は false）にします。これは `MATRIX_DM_MENTION_THREADS` とは別のもので、後者は個人チャットで `@mentioned` されたときにだけスレッドを立てます。 |
| **コマンド** | Matrix のクライアントが送ってくれるなら、Hermes は通常の `/commands` を受け付けます。クライアントが `/` をローカルのコマンド用に押さえている場合は、代わりに `!commands` を使ってください。Hermes は既知の `!command` の別名を `/command` に読み替えます。 |
| **操作用のボタン代わり** | 危険なコマンドの承認や `/model` の選択には、Matrix のリアクションを使えます。承認のリアクションは、その操作を頼んだ本人だけに限ることもできます。 |
| **思考とツールの動き** | ゲートウェイの進捗表示を有効にしていると、Matrix では思考やツールの動きをスレッド内の編集可能な表示欄に出します。そのため、ルーム本体のタイムラインが更新であふれません。 |
| **複数人がいるルーム** | 初期状態では、Hermes はルームのなかでも利用者ごとにセッションの履歴を分けます。同じルームで話す 2 人が 1 つの記録を共有することはありません（意図して分離を切った場合は別です）。 |

:::tip
ボットは招待されたルームに自動で参加します。ボットの Matrix ユーザーを好きなルームに招待するだけで、参加して返事を始めます。
:::

## 対応状況の一覧 {#capability-matrix}

この表は、Matrix アダプターの機能宣言と Matrix のテストの内容にもとづいています。E2EE がモード別になっているのは、暗号化されたルームを無効にするか、可能なら使うか、必須にするかを運用側で選べるためです。

| 機能 | Matrix |
|------------|--------|
| テキスト | 対応 |
| スレッド | 対応 |
| リアクション | 対応 |
| 承認 | 対応 |
| モデルの選択 | 対応 |
| 思考の表示欄 | 対応 |
| 画像 | 対応 |
| 複数の画像 | 対応 |
| ファイル | 対応 |
| 音声 | 対応 |
| 動画 | 対応 |
| E2EE | 無効 / 任意 / 必須 |
| 診断 | 対応 |

### Matrix でのセッションの考え方 {#session-model-in-matrix}

初期状態では次のようになります。

- 個人チャットごとに専用のセッションを持ちます
- スレッドごとにセッションの領域が分かれます
- ルームを共有していても、利用者ごとにそのルーム内で自分のセッションを持ちます

この動きは `config.yaml` で決まります。

```yaml
group_sessions_per_user: true
```

ルーム全体で 1 つの会話を共有したいと明確に考えている場合だけ、`false` にします。

```yaml
group_sessions_per_user: false
```

共有のセッションは共同作業のルームで役に立ちますが、次の点にも注意が必要です。

- 文脈の膨らみとトークンの費用を全員で分け合うことになります
- 誰か 1 人のツールを多用する長い作業が、ほかの全員の文脈を膨らませます
- 誰か 1 人の実行中の処理が、同じルームにいる別の人の追加の質問をさえぎることがあります

### メンションとスレッドの設定 {#mention-and-threading-configuration}

メンションと自動でのスレッド作成の振る舞いは、環境変数か `config.yaml` で設定できます。

```yaml
matrix:
  require_mention: true           # Require @mention in rooms (default: true)
  allowed_users:                  # Matrix users allowed to trigger agent turns
    - "@alice:matrix.org"
  allowed_rooms:                  # Matrix rooms allowed to trigger agent turns
    - "!abc123:matrix.org"
  free_response_rooms:            # Rooms exempt from mention requirement
    - "!abc123:matrix.org"
  ignore_user_patterns:           # Bridge/appservice ghost users to ignore
    - "^@telegram_"
    - "^@whatsapp_"
  process_notices: false          # Ignore m.notice by default
  session_scope: room             # auto|room|thread; room is recommended for project rooms
  auto_thread: true               # Auto-create threads for responses (default: true)
  dm_mention_threads: false       # Create thread when @mentioned in DM (default: false)
  max_message_length: 16000       # Outbound chunk size in chars (default: 16000, max: 65535)
```

環境変数で書くこともできます。

```bash
MATRIX_REQUIRE_MENTION=true
MATRIX_ALLOWED_USERS=@alice:matrix.org
MATRIX_ALLOWED_ROOMS=!abc123:matrix.org
MATRIX_FREE_RESPONSE_ROOMS=!abc123:matrix.org,!def456:matrix.org
MATRIX_IGNORE_USER_PATTERNS='^@telegram_,^@whatsapp_'
MATRIX_PROCESS_NOTICES=false
MATRIX_SESSION_SCOPE=room       # recommended for stable project-room context
MATRIX_AUTO_THREAD=true
MATRIX_DM_MENTION_THREADS=false
MATRIX_REACTIONS=true          # default: true — emoji reactions during processing
MATRIX_ALLOW_ROOM_MENTIONS=false
```

:::tip リアクションを切る
`MATRIX_REACTIONS=false` にすると、届いたメッセージにボットが付ける処理状況の絵文字リアクション（👀 / ✅ / ❌）を止められます。リアクションのイベントがうるさいルームや、参加者のクライアントがそろって対応していないルームで役に立ちます。
:::

:::tip ルーム全体へのメンション
Hermes は、`@alice:example.org` のような具体的な Matrix ID に対しては、Matrix の正式なユーザーメンションを送ります。ルーム全体に届く `@room` の通知は初期状態で無効です。ボットが全員に通知してよいルームでだけ `MATRIX_ALLOW_ROOM_MENTIONS=true` にしてください。
:::

:::note
`MATRIX_REQUIRE_MENTION` がなかった頃のバージョンから上げてきた場合、以前のボットはルーム内のすべてのメッセージに返事をしていました。その動きのままにしたいときは `MATRIX_REQUIRE_MENTION=false` にします。
:::

### プロジェクトごとのルームを分ける {#project-room-isolation}

同じ Matrix のボットを複数のプロジェクトのルームで使うなら、ルーム単位で安定したセッションになるよう設定します。

```bash
MATRIX_SESSION_SCOPE=room
MATRIX_AUTO_THREAD=false
```

`MATRIX_SESSION_SCOPE` に指定できる値は次のとおりです。

| 指定 | 振る舞い |
|-------|----------|
| `auto` | これまでどおりの初期値。作られるスレッドは既存の `MATRIX_AUTO_THREAD` の設定で決まります。 |
| `room` | スレッドに属さないルームのメッセージは、1 つの安定したルームのセッションにまとまります。本物の Matrix スレッドは、これまでどおりスレッドの起点を使います。 |
| `thread` | スレッドに属さないルームのメッセージについて、きっかけとなったイベント ID からスレッドとセッションを作り出します。 |

Hermes はエージェントへの指示に、いま扱っている Matrix のルーム名・ルーム ID・トピック・メッセージ ID と、Matrix のルームの境界についての注記を含めるようになりました。`/status` でも今の Matrix のルームとセッションの範囲を確認できます。また `/resume` は、別の Matrix ルームの名前付きセッションを黙って呼び戻すことはありません。呼び戻すには `/resume --cross-room <session name>` と明示的に指定します。

`MATRIX_SESSION_SCOPE=room` はルームとスレッドの区切りを決めるものです。そのルームのなかで利用者どうしがその区切りを共有するかどうかは、これまでどおり `group_sessions_per_user` の設定で決まります。`group_sessions_per_user: true`（初期値）なら、Alice と Bob はプロジェクト B の別々のセッションを持ちます。`group_sessions_per_user: false` なら、そのルームにはプロジェクト B の記録が 1 つだけあることになります。

ここからは、ボットのアカウントを作るところから最初のメッセージを送るところまで、設定の流れをひととおり案内します。

## 手順 1: ボットのアカウントを作る {#step-1-create-a-bot-account}

ボット用の Matrix アカウントが必要です。作り方はいくつかあります。

### 方法 A: 自分のホームサーバーで登録する（おすすめ） {#option-a-register-on-your-homeserver-recommended}

自分でホームサーバー（Synapse、Conduit、Dendrite）を動かしている場合の手順です。

1. 管理者向けの API か登録用のツールで、新しい利用者を作ります。

```bash
# Synapse example
register_new_matrix_user -c /etc/synapse/homeserver.yaml http://localhost:8008
```

2. 利用者名は `hermes` のように決めます。完全なユーザー ID は `@hermes:your-server.org` の形になります。

### 方法 B: matrix.org などの公開ホームサーバーを使う {#option-b-use-matrixorg-or-another-public-homeserver}

1. [Element Web](https://app.element.io) を開いて、新しいアカウントを作ります。
2. ボット用の利用者名を決めます（たとえば `hermes-bot`）。

### 方法 C: 自分のアカウントを使う {#option-c-use-your-own-account}

自分のアカウントのまま Hermes を動かすこともできます。この場合、ボットは自分名義で発言することになります。個人用の助手として使うときに便利です。

## 手順 2: アクセストークンを取得する {#step-2-get-an-access-token}

Hermes がホームサーバーで認証するには、アクセストークンが必要です。方法は 2 つあります。

### 方法 A: アクセストークン（おすすめ） {#option-a-access-token-recommended}

トークンを手に入れるいちばん確実なやり方です。

**Element から取得する:**
1. ボットのアカウントで [Element](https://app.element.io) にログインします。
2. **Settings** → **Help & About** を開きます。
3. 下までスクロールして **Advanced** を開くと、アクセストークンが表示されます。
4. **その場で控えておきます。**

**API から取得する:**

```bash
curl -X POST https://your-server/_matrix/client/v3/login \
  -H "Content-Type: application/json" \
  -d '{
    "type": "m.login.password",
    "user": "@hermes:your-server.org",
    "password": "your-password"
  }'
```

応答に `access_token` の項目が含まれているので、それを控えます。

:::warning[アクセストークンは厳重に扱う]
アクセストークンがあれば、ボットの Matrix アカウントに何でもできてしまいます。人目に触れる場所に出したり、Git にコミットしたりしないでください。漏れてしまったときは、その利用者の全セッションからログアウトして無効にします。
:::

### 方法 B: パスワードでログインする {#option-b-password-login}

アクセストークンを渡す代わりに、ボットのユーザー ID とパスワードを Hermes に教える方法もあります。この場合、Hermes は起動時に自動でログインします。手軽ですが、パスワードが `.env` ファイルに残ることになります。

```bash
MATRIX_USER_ID=@hermes:your-server.org
MATRIX_PASSWORD=your-password
```

## 手順 3: 自分の Matrix ユーザー ID を調べる {#step-3-find-your-matrix-user-id}

Hermes Agent は、誰がボットを使えるかを Matrix のユーザー ID で判定します。Matrix のユーザー ID は `@username:server` の形をしています。

自分のものを調べる手順です。

1. [Element](https://app.element.io)（または普段使いの Matrix クライアント）を開きます。
2. 自分のアイコン → **Settings** の順に選びます。
3. プロフィールの先頭にユーザー ID が出ています（たとえば `@alice:matrix.org`）。

:::tip
Matrix のユーザー ID は必ず `@` で始まり、途中に `:` とサーバー名が入ります。たとえば `@alice:matrix.org` や `@bob:your-server.com` です。
:::

## 手順 4: Hermes Agent を設定する {#step-4-configure-hermes-agent}

### 方法 A: 対話式の設定（おすすめ） {#option-a-interactive-setup-recommended}

案内に沿って進む設定コマンドを実行します。

```bash
hermes gateway setup
```

聞かれたら **Matrix** を選び、続けてホームサーバーの URL、アクセストークン（またはユーザー ID とパスワード）、利用を許可するユーザー ID を答えます。

### 方法 B: 手で設定する {#option-b-manual-configuration}

`~/.hermes/.env` ファイルに次の内容を書き足します。

**アクセストークンを使う場合:**

```bash
# Required
MATRIX_HOMESERVER=https://matrix.example.org
MATRIX_ACCESS_TOKEN=***

# Optional: user ID (auto-detected from token if omitted)
# MATRIX_USER_ID=@hermes:matrix.example.org

# Security: restrict who can interact with the bot
MATRIX_ALLOWED_USERS=@alice:matrix.example.org

# Optional: restrict which rooms can trigger the bot
MATRIX_ALLOWED_ROOMS=!abc123:matrix.example.org

# Multiple allowed users (comma-separated)
# MATRIX_ALLOWED_USERS=@alice:matrix.example.org,@bob:matrix.example.org
```

**パスワードでログインする場合:**

```bash
# Required
MATRIX_HOMESERVER=https://matrix.example.org
MATRIX_USER_ID=@hermes:matrix.example.org
MATRIX_PASSWORD=***

# Security
MATRIX_ALLOWED_USERS=@alice:matrix.example.org
```

## 非公開の環境での安全対策 {#private-deployment-hardening}

非公開の Matrix 環境では、利用者とルームの両方に許可リストを設定します。`MATRIX_ALLOWED_USERS` が未設定だと、ボットが参加しているルームで話しかけられる人は誰でもエージェントを動かせてしまいます。`MATRIX_ALLOWED_ROOMS` が未設定だと、ボットが参加したどのルームからでもエージェントを動かせます。しっかり閉じた運用では、両方を設定します。

```bash
MATRIX_ALLOWED_USERS=@alice:matrix.example.org,@bob:matrix.example.org
MATRIX_ALLOWED_ROOMS=!ops:matrix.example.org,!dmroom:matrix.example.org
```

ブリッジやアプリサービスを組み合わせた環境では、堂々巡りを防ぐ手当てがもう一段必要です。Hermes は初期状態で、自分自身のイベント、ローカル部分が `_` で始まる Matrix のアプリサービス風の利用者、重複したイベント ID、起動前の古いイベント、編集による差し替えのイベント、そして `m.notice` のイベントを常に無視します。使っているブリッジが別の命名規則を採っているなら、その環境に合わせたゴーストユーザーの書き方を足します。

```bash
MATRIX_IGNORE_USER_PATTERNS='^@telegram_,^@slack_,^@whatsapp_'
```

通知（notice）を有効にするのは、信頼できる人の手順が本当に `m.notice` を送る場合だけにします。

```bash
MATRIX_PROCESS_NOTICES=true
```

ルーム全体に届く外向きの通知は、初期状態で無効です。ボットが `@room` で全員を呼び出してよいと決めているのでない限り、`MATRIX_ALLOW_ROOM_MENTIONS=false` のままにしておきます。

診断やデバッグ用の情報では、Matrix のアクセストークン、リカバリーキー、デバイスの識別子、メッセージ本文が伏せられます。メディアのダウンロードは Matrix の `mxc://` のコンテンツ URI に限られ、`MATRIX_MAX_MEDIA_BYTES` を超えるものは拒否されます。連合しているルームや信頼していないホームサーバーからの入力は、信用できないものとして扱ってください。ルームの許可リストは絞り込み、ツールを多用する作業は個人チャットか非公開のルームで行い、ブリッジのゴーストユーザーやアプリサービスの分身を許可利用者に入れないようにします。

`~/.hermes/config.yaml` で設定できる、動きに関する任意の項目です。

```yaml
group_sessions_per_user: true
```

- `group_sessions_per_user: true` にすると、共有のルームのなかでも参加者ごとに文脈が分かれたままになります

### ゲートウェイを起動する {#start-the-gateway}

設定が終わったら、Matrix のゲートウェイを起動します。

```bash
hermes gateway
```

数秒のうちにボットがホームサーバーにつながり、同期を始めるはずです。個人チャットでも参加しているルームでもよいので、メッセージを送って動きを確かめてください。

:::tip
`hermes gateway` はバックグラウンドで動かすことも、systemd のサービスとして常時動かすこともできます。詳しくは配備のドキュメントを見てください。
:::

## エンドツーエンド暗号化（E2EE） {#end-to-end-encryption-e2ee}

Hermes は Matrix のエンドツーエンド暗号化に対応しているので、暗号化されたルームでもボットと会話できます。

### 必要なもの {#requirements}

E2EE には、暗号化のオプション付きの `mautrix` ライブラリと、C 言語のライブラリ `libolm` が必要です。

```bash
# Install mautrix with E2EE support
pip install 'mautrix[encryption]'

# Or install with hermes extras
cd ~/.hermes/hermes-agent && uv pip install -e ".[matrix]"
```

あわせて、`libolm` をシステムに入れておく必要があります。

```bash
# Debian/Ubuntu
sudo apt install libolm-dev

# macOS
brew install libolm

# Fedora
sudo dnf install libolm-devel
```

### E2EE を有効にする {#enable-e2ee}

`~/.hermes/.env` に次を書き足します。

```bash
MATRIX_E2EE_MODE=required
```

`MATRIX_E2EE_MODE` に指定できる値は次のとおりです。

| モード | 振る舞い |
|------|----------|
| `off` | Matrix の E2EE を初期化しません。 |
| `optional` | 必要なものがそろっていれば E2EE を試し、暗号の初期化に失敗しても暗号化していないルームはそのまま使えるようにします。 |
| `required` | E2EE に必要なものや暗号の準備がそろっていなければ、動かさずに止めます。 |

optional では、暗号の準備ができないときに E2EE なしの動作に落ちることがあります。required は黙って下位互換に落ちるのではなく、そこで止まります。

以前のバージョンとの互換のため、`MATRIX_ENCRYPTION=true` でも required と同じ振る舞いになります。

E2EE を有効にすると、Hermes は次のことを行います。

- 暗号鍵を `~/.hermes/platforms/matrix/store/` に保存します（古い環境では `~/.hermes/matrix/store/`）
- 初回の接続時にデバイスの鍵をアップロードします
- 受け取ったメッセージの復号と、送るメッセージの暗号化を自動で行います
- 招待された暗号化ルームに自動で参加します

### Matrix 向けのツールと操作 {#matrix-tools-and-controls}

Matrix での会話では、Hermes は Matrix 専用のツールをエージェントに渡します。

- `matrix_send_reaction`
- `matrix_redact_message`
- `matrix_create_room`
- `matrix_invite_user`
- `matrix_fetch_history`
- `matrix_set_presence`

これらのツールは Matrix の場面に限られ、Matrix 以外のツール一式には入りません。管理者寄りのツールは初期状態で無効です。メッセージの取り消しには `MATRIX_TOOLS_ALLOW_REDACTION=true`、招待には `MATRIX_TOOLS_ALLOW_INVITES=true`、ルームの作成には `MATRIX_TOOLS_ALLOW_ROOM_CREATE=true` が必要です。公開ルームを作るには、さらに `MATRIX_ALLOW_PUBLIC_ROOMS=true` も必要です。
`MATRIX_ALLOWED_ROOMS` を設定している場合、Matrix のツールが対象にできるのはそのルームだけです。

リアクションによる操作は次のとおりです。

- ✅ 一度だけ承認する
- ♾️ 以降つねに承認する
- ❌ 拒否する
- 数字のリアクションは `/model` の選択肢に対応します

ルームにいる許可済みの Matrix 利用者なら誰でも承認やモデル選択の操作をしてよい、と考えている場合は `MATRIX_APPROVAL_REQUIRE_SENDER=false` にします。初期状態では、Hermes がその操作を頼んだ人を把握しているときは、その本人だけが操作できます。

### メディアの上限 {#media-limits}

Hermes は Matrix のメディア API を通じて、画像・ファイル・音声・動画をやり取りします。生成した画像が複数あるときは、順序を保った 1 つのまとまりとして送るので、説明文とスレッドの文脈がまとまりの全体で保たれます。

初期状態では、100 MB を超える Matrix のメディアは送受信の前に拒否されます。変えたいときは次のようにします。

```bash
MATRIX_MAX_MEDIA_BYTES=104857600
```

受け取るメディアは Matrix の `mxc://` のコンテンツ URI でなければなりません。Hermes は Matrix のイベントに含まれる任意の HTTP(S) のメディア URL を拒否します。連合しているルームが、何でも取ってくるダウンローダーに変わってしまわないようにするためです。

### クロス署名による検証（おすすめ） {#cross-signing-verification-recommended}

Matrix のアカウントでクロス署名が有効なら（Element では初期状態で有効です）、リカバリーキーを設定しておくと、ボットが起動時に自分のデバイスへ署名できます。これがないと、デバイスの鍵が入れ替わったあとに、ほかの Matrix クライアントがボットと暗号セッションを共有してくれないことがあります。

```bash
MATRIX_RECOVERY_KEY=EsT... your recovery key here
```

**どこにあるか:** Element では **Settings** → **Security & Privacy** → **Encryption** と進んだ先のリカバリーキー（「セキュリティキー」とも呼ばれます）です。クロス署名を最初に設定したときに、保存するよう促された鍵がこれにあたります。

`MATRIX_RECOVERY_KEY` が設定してあると、Hermes は起動のたびにホームサーバーの安全な保管領域からクロス署名の鍵を読み込み、いま使っているデバイスに署名します。何度実行しても結果は同じなので、ずっと有効にしておいて構いません。

Hermes が Matrix のリカバリーキーを新しく作る場合でも、その鍵そのものをログに出すことはありません。起動の前に `MATRIX_RECOVERY_KEY_OUTPUT_FILE=/secure/path/matrix-recovery-key.txt` を設定しておくと、作られた鍵がファイルモード `0600` で一度だけ書き出されます。すでにファイルがある場合は上書きしません。

:::warning[暗号の保存領域を消したとき]
`~/.hermes/platforms/matrix/store/crypto.db` を消すと、ボットは暗号上の身元を失います。同じデバイス ID のまま起動し直しても、それだけでは**元どおりになりません**。ホームサーバー側には古い身元鍵で署名されたワンタイムキーが残っており、相手側は新しい Olm のセッションを作れないからです。

Hermes は起動時にこの状態を見つけると E2EE を有効にせず、次のようなログを出します: `device XXXX has stale one-time keys on the server signed with a previous identity key`。

**いちばん簡単な立て直し方は、アクセストークンを作り直すことです**（新しいデバイス ID が割り当てられ、古い鍵の履歴が付いてきません）。下の「E2EE を使っていた以前のバージョンから上げる」の節を見てください。この方法がいちばん確実で、ホームサーバーのデータベースに触らずに済みます。

**手作業での立て直し**（上級者向け。デバイス ID を変えずに済みます）:

1. Synapse を止めて、古いデバイスをデータベースから消します。
   ```bash
   sudo systemctl stop matrix-synapse
   sudo sqlite3 /var/lib/matrix-synapse/homeserver.db "
     DELETE FROM e2e_device_keys_json WHERE device_id = 'DEVICE_ID' AND user_id = '@hermes:your-server';
     DELETE FROM e2e_one_time_keys_json WHERE device_id = 'DEVICE_ID' AND user_id = '@hermes:your-server';
     DELETE FROM e2e_fallback_keys_json WHERE device_id = 'DEVICE_ID' AND user_id = '@hermes:your-server';
     DELETE FROM devices WHERE device_id = 'DEVICE_ID' AND user_id = '@hermes:your-server';
   "
   sudo systemctl start matrix-synapse
   ```
   Synapse の管理者向け API を使う手もあります（ユーザー ID が URL エンコードされている点に注意してください）。
   ```bash
   curl -X DELETE -H "Authorization: Bearer ADMIN_TOKEN" \
     'https://your-server/_synapse/admin/v2/users/%40hermes%3Ayour-server/devices/DEVICE_ID'
   ```
   注意: 管理者向け API でデバイスを消すと、それに結び付いたアクセストークンも無効になることがあります。あとでトークンを作り直す必要が出るかもしれません。

2. ローカルの暗号の保存領域を消して、Hermes を起動し直します。
   ```bash
   rm -f ~/.hermes/platforms/matrix/store/crypto.db*
   # restart hermes
   ```

ほかの Matrix クライアント（Element、matrix-commander）が古いデバイスの鍵を覚えていることがあります。立て直したあと、Element で `/discardsession` と打てば、ボットとの暗号セッションを新しく作り直せます。
:::

:::info
`mautrix[encryption]` が入っていない、あるいは `libolm` が見つからない場合、ボットは暗号化なしの通常のクライアントとして自動的に動きます。ログに警告が出ます。
:::

## ホームルーム {#home-room}

ボットが自分から送るメッセージ（定期実行の結果、リマインダー、通知など）の届け先として「ホームルーム」を決められます。指定の仕方は 2 つあります。

### スラッシュコマンドで指定する {#using-the-slash-command}

ボットがいる Matrix のルームで `/sethome` と打つと、そのルームがホームルームになります。
Matrix のクライアントがスラッシュコマンドを横取りしてしまう場合は、代わりに `!sethome` と打ってください。

### 手で設定する {#manual-configuration}

`~/.hermes/.env` に次を書き足します。

```bash
MATRIX_HOME_ROOM=!abc123def456:matrix.example.org
```

## ルームの許可リスト（`allowed_rooms`） {#room-allowlist-allowedrooms}

ボットが動くルームを、決められたものだけに絞れます。設定すると、ボットは一覧にある ID のルームで**しか**返事をしません。ほかのルームのメッセージは、たとえボットをメンションしていても黙って無視されます。

**個人チャット（1 対 1 のルーム）はこの絞り込みの対象外です**。許可された利用者はいつでもボットと 1 対 1 でやり取りできます。

```yaml
matrix:
  allowed_rooms:
    - "!abc123def456:matrix.example.org"
    - "!opsroom789:matrix.example.org"
```

環境変数（カンマ区切り）で書くこともできます。

```bash
MATRIX_ALLOWED_ROOMS="!abc123def456:matrix.example.org,!opsroom789:matrix.example.org"
```

振る舞いは次のとおりです。

- 空、または未設定 → 制限なし（初期値）。
- 中身がある → ルーム ID が一覧に載っている必要があります。この判定は、ほかのどの関門（メンションの要否、送信者の許可リストなど）よりも**先に**行われます。
- ルームの**内部 ID**（`!abc...:server`）を使ってください。別名（`#room:server`）ではありません。内部 ID は Element の Room → Settings → Advanced で調べられます。

あわせて読む: [管理者用と利用者用のスラッシュコマンドの分け方](/hermes/docs/reference/slash-commands/#permissions-and-adminuser-split)。

:::tip
ルーム ID の調べ方: Element でそのルームを開き、**Settings** → **Advanced** と進むと **Internal room ID** が表示されます（`!` で始まります）。
:::

## Matrix でのコマンド {#commands-in-matrix}

Hermes は、ほかのメッセージングサービスで使えるゲートウェイのコマンドを Matrix でも同じように使えます。`/commands`、`/model`、`/stop`、`/queue`、`/steer`、`/goal`、`/subgoal`、`/bg`、`/btw`、`/tasks`、`/yolo` などです。

Matrix のクライアントによっては先頭の `/` を自分のローカルコマンド用に押さえていて、知らないスラッシュコマンドをルームに送ってくれないことがあります。その場合は、Matrix でも安全に使える別名として `!` を使います。

```text
!commands
!model
!model gpt-5.5 --provider openrouter
!queue continue with the next task
!stop
```

Hermes が `!command` を読み替えるのは、それがゲートウェイの知っているコマンド、登録済みのプラグインのコマンド、または導入済みのスキルのコマンドである場合だけです。`!important` のようなふつうの感嘆表現は、そのままチャットのメッセージとして扱われます。

## 困ったときは {#troubleshooting}

### ボットがメッセージに反応しない {#bot-is-not-responding-to-messages}

**原因**: ボットがそのルームに参加していない、`MATRIX_ALLOWED_USERS` に自分のユーザー ID が入っていない、`MATRIX_ALLOWED_ROOMS` にそのルームが入っていない、あるいはルームのメッセージがボットをメンションしていない、のいずれかです。

**対処**: ボットをそのルームに招待します（招待されると自動で参加します）。自分のユーザー ID が `MATRIX_ALLOWED_USERS` に入っているか（`@user:server` の完全な形で書きます）、許可リストを使っているならルーム ID が `MATRIX_ALLOWED_ROOMS` に入っているかを確かめます。ルームではボットをメンションするか、そのルームを `MATRIX_FREE_RESPONSE_ROOMS` に足します。そのうえでゲートウェイを起動し直します。

### ルームには参加するのに、すべてのメッセージを黙って捨ててしまう（時計のずれ） {#bot-joins-rooms-but-silently-drops-every-message-clock-skew}

**原因**: 動かしている機械のシステム時計が、実際の時刻より進んでいます。Matrix のアダプターは、最初の同期で流れてくる過去のイベントを無視するため、起動から 5 秒の猶予をみた絞り込み（`event_ts < startup_ts - 5`）をかけています。時計が進んでいると、届いたイベントがすべて「起動より古い」と見なされ、メッセージの処理に届く前に捨てられます。つながっているように見えるのに、ボットが一度も返事をしない状態です。[#12614](https://github.com/NousResearch/hermes-agent/issues/12614) を見てください。

**症状**: ゲートウェイのログに `Matrix: dropped N live events as 'too old' more than 30s after startup` が出ます。

**対処**: NTP で機械の時計を合わせて、ボットを起動し直します。

```bash
# Debian/Ubuntu
sudo timedatectl set-ntp true
timedatectl status   # confirm "System clock synchronized: yes"

# macOS
sudo sntp -sS time.apple.com
```

### 起動時に「Failed to authenticate」「whoami failed」が出る {#failed-to-authenticate-whoami-failed-on-startup}

**原因**: アクセストークンかホームサーバーの URL が間違っています。

**対処**: `MATRIX_HOMESERVER` が自分のホームサーバーを指しているか確かめます（`https://` を付け、末尾のスラッシュは付けません）。`MATRIX_ACCESS_TOKEN` が有効かどうかは curl で試せます。

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-server/_matrix/client/v3/account/whoami
```

自分の利用者情報が返ってくればトークンは有効です。エラーが返るなら、トークンを作り直します。

### 「mautrix not installed」のエラーが出る {#mautrix-not-installed-error}

**原因**: Python のパッケージ `mautrix` が入っていません。

**対処**: 入れます。

```bash
pip install 'mautrix[encryption]'
```

Hermes の追加パッケージから入れる方法もあります。

```bash
cd ~/.hermes/hermes-agent && uv pip install -e ".[matrix]"
```

### 暗号まわりのエラー、「could not decrypt event」が出る {#encryption-errors-could-not-decrypt-event}

**原因**: 暗号鍵が足りない、`libolm` が入っていない、あるいはボットのデバイスが信頼されていません。

**対処**:
1. `libolm` がシステムに入っているか確かめます（上の E2EE の節を見てください）。
2. `.env` に `MATRIX_ENCRYPTION=true` が入っているか確かめます。
3. Matrix のクライアント（Element）でボットのプロフィール → Sessions と進み、ボットのデバイスを検証して信頼します。
4. 暗号化されたルームにボットが参加したばかりの場合、復号できるのは参加した *あと* に送られたメッセージだけです。それより前のメッセージは読めません。

### E2EE を使っていた以前のバージョンから上げる {#upgrading-from-a-previous-version-with-e2ee}

:::tip
あわせて `crypto.db` を手で消してしまった場合は、上の E2EE の節にある「暗号の保存領域を消したとき」の警告を見てください。ホームサーバー側に残った古いワンタイムキーを片づける手順が別に必要です。
:::

以前に `MATRIX_ENCRYPTION=true` で Hermes を使っていて、SQLite ベースの新しい暗号の保存領域を使うバージョンに上げた場合、ボットの暗号上の身元が変わっています。Matrix のクライアント（Element）が古いデバイスの鍵を覚えていて、ボットと暗号セッションを共有してくれないことがあります。

**症状**: ボットはつながり、ログにも「E2EE enabled」と出るのに、メッセージがすべて「could not decrypt event」になり、ボットが一度も返事をしません。

**何が起きているか**: 以前の `matrix-nio` や、直列化にもとづく `mautrix` のバックエンドが持っていた暗号の状態は、新しい SQLite の保存領域とは互換性がありません。ボットは暗号上の身元を新しく作り直しますが、Matrix のクライアント側には古い鍵が残っていて、鍵が変わったデバイスにはルームの暗号セッションを渡してくれません。これは Matrix の安全のための仕組みで、同じデバイスなのに身元鍵が変わった状態を、クライアントは怪しいものとして扱います。

**対処**（一度きりの移行作業）:

1. **アクセストークンを作り直して**、新しいデバイス ID を割り当てます。いちばん簡単なやり方は次のとおりです。

   ```bash
   curl -X POST https://your-server/_matrix/client/v3/login \
     -H "Content-Type: application/json" \
     -d '{
       "type": "m.login.password",
       "identifier": {"type": "m.id.user", "user": "@hermes:your-server.org"},
       "password": "***",
       "initial_device_display_name": "Hermes Agent"
     }'
   ```

   返ってきた新しい `access_token` を控え、`~/.hermes/.env` の `MATRIX_ACCESS_TOKEN` を書き換えます。

2. **古い暗号の状態を消します**。

   ```bash
   rm -f ~/.hermes/platforms/matrix/store/crypto.db
   rm -f ~/.hermes/platforms/matrix/store/crypto_store.*
   ```

3. **リカバリーキーを設定します**（クロス署名を使っている場合。Element の利用者はたいてい使っています）。`~/.hermes/.env` に次を書き足します。

   ```bash
   MATRIX_RECOVERY_KEY=EsT... your recovery key here
   ```

   こうしておくと、ボットが起動時にクロス署名の鍵で自分に署名するので、Element が新しいデバイスをすぐ信頼してくれます。これがないと、Element は新しいデバイスを未検証と見なし、暗号セッションを共有しないことがあります。リカバリーキーは Element の **Settings** → **Security & Privacy** → **Encryption** で確認できます。

4. **Matrix のクライアント側で暗号セッションを作り直させます**。Element でボットとの個人チャットのルームを開き、`/discardsession` と打ちます。これで Element が新しい暗号セッションを作り、ボットの新しいデバイスに渡してくれます。

5. **ゲートウェイを起動し直します**。

   ```bash
   hermes gateway run
   ```

   `MATRIX_RECOVERY_KEY` を設定していれば、ログに `Matrix: cross-signing verified via recovery key` が出るはずです。

6. **あらためてメッセージを送ります**。ボットが復号して、いつもどおり返事をするはずです。

:::note
移行のあとは、上げる *前* に送られたメッセージは復号できません。古い暗号鍵はもう残っていないためです。影響があるのはこの切り替えの前後だけで、新しいメッセージはふつうに扱えます。
:::

:::tip
**新しく入れる場合は関係ありません。** この移行が必要なのは、以前のバージョンの Hermes で E2EE を動かしていて、そこからバージョンを上げるときだけです。

**なぜアクセストークンを作り直すのか:** Matrix のアクセストークンは、特定のデバイス ID に結び付いています。同じデバイス ID のまま暗号鍵だけを新しくすると、ほかの Matrix クライアントがそのデバイスを信用しなくなります（身元鍵が変わったことを、安全上の問題の兆しと見なすためです）。新しいアクセストークンなら、古い鍵の履歴が付かない新しいデバイス ID になるので、ほかのクライアントもすぐに信頼してくれます。
:::

## プロキシモード（macOS での E2EE） {#proxy-mode-e2ee-on-macos}

Matrix の E2EE には `libolm` が必要ですが、これは macOS の ARM64（Apple Silicon）ではビルドできません。`hermes-agent[matrix]` の追加パッケージも Linux 限定になっています。macOS を使っているなら、プロキシモードを使うことで、E2EE の部分だけを Linux の仮想マシン上の Docker コンテナで動かしつつ、エージェント本体は macOS でそのまま動かし、手元のファイル・記憶・スキルにフルにアクセスできます。

### しくみ {#how-it-works}

```
macOS (Host):
  └─ hermes gateway
       ├─ api_server adapter ← listens on 0.0.0.0:8642
       ├─ AIAgent ← single source of truth
       ├─ Sessions, memory, skills
       └─ Local file access (Obsidian, projects, etc.)

Linux VM (Docker):
  └─ hermes gateway (proxy mode)
       ├─ Matrix adapter ← E2EE decryption/encryption
       └─ HTTP forward → macOS:8642/v1/chat/completions
           (no LLM API keys, no agent, no inference)
```

Docker のコンテナが受け持つのは Matrix のプロトコルと E2EE だけです。メッセージが届くとコンテナがそれを復号し、本文を通常の HTTP リクエストでホストへ渡します。ホスト側がエージェントを動かし、ツールを呼び、応答を作って流し返します。コンテナはその応答を暗号化して Matrix へ送ります。セッションはすべて 1 つにまとまるので、コマンドライン・Matrix・Telegram、ほかのどのサービスでも同じ記憶と会話の履歴を共有します。

### 手順 1: ホスト（macOS）を設定する {#step-1-configure-the-host-macos}

Docker のコンテナから届くリクエストをホストが受け取れるように、API サーバーを有効にします。

`~/.hermes/.env` に次を書き足します。

```bash
API_SERVER_ENABLED=true
API_SERVER_KEY=your-secret-key-here
API_SERVER_HOST=0.0.0.0
```

- `API_SERVER_HOST=0.0.0.0` にすると、すべてのネットワークインターフェースで待ち受けるので、Docker のコンテナから届きます。
- ループバック以外で待ち受ける場合、`API_SERVER_KEY` は必須です。推測されにくいランダムな文字列にしてください。
- API サーバーは初期状態でポート 8642 を使います（変えたいときは `API_SERVER_PORT` を指定します）。

ゲートウェイを起動します。

```bash
hermes gateway
```

設定済みのほかのサービスとあわせて、API サーバーが立ち上がるのが見えるはずです。仮想マシンから届くか確かめます。

```bash
# From the Linux VM
curl http://<mac-ip>:8642/health
```

### 手順 2: Docker のコンテナ（Linux の仮想マシン）を設定する {#step-2-configure-the-docker-container-linux-vm}

コンテナに必要なのは Matrix の資格情報と転送先の URL です。LLM の API キーは要りません。

**`docker-compose.yml`:**

```yaml
services:
  hermes-matrix:
    build: .
    environment:
      # Matrix credentials
      MATRIX_HOMESERVER: "https://matrix.example.org"
      MATRIX_ACCESS_TOKEN: "syt_..."
      MATRIX_ALLOWED_USERS: "@you:matrix.example.org"
      MATRIX_ENCRYPTION: "true"
      MATRIX_DEVICE_ID: "HERMES_BOT"

      # Proxy mode — forward to host agent
      GATEWAY_PROXY_URL: "http://192.168.1.100:8642"
      GATEWAY_PROXY_KEY: "your-secret-key-here"
    volumes:
      - ./matrix-store:/root/.hermes/platforms/matrix/store
```

**`Dockerfile`:**

```dockerfile
FROM python:3.11-slim

RUN apt-get update && apt-get install -y libolm-dev && rm -rf /var/lib/apt/lists/*
RUN cd ~/.hermes/hermes-agent && uv pip install -e ".[matrix]"

CMD ["hermes", "gateway"]
```

コンテナの中身はこれだけです。OpenRouter や Anthropic をはじめ、推論を提供するサービスの API キーは一切要りません。

### 手順 3: 両方を起動する {#step-3-start-both}

1. まずホスト側のゲートウェイを起動します。
   ```bash
   hermes gateway
   ```

2. 続いて Docker のコンテナを起動します。
   ```bash
   docker compose up -d
   ```

3. 暗号化された Matrix のルームでメッセージを送ります。コンテナがそれを復号してホストへ渡し、応答を流し返します。

### 設定項目の早見表 {#configuration-reference}

プロキシモードは **コンテナ側**（軽量なゲートウェイ）で設定します。

| 設定 | 説明 |
|---------|------|
| `GATEWAY_PROXY_URL` | 転送先の Hermes API サーバーの URL（たとえば `http://192.168.1.100:8642`） |
| `GATEWAY_PROXY_KEY` | 認証用のトークン（ホスト側の `API_SERVER_KEY` と同じ値にします） |
| `gateway.proxy_url` | `GATEWAY_PROXY_URL` と同じものを `config.yaml` に書く場合の書き方 |

ホスト側に必要な設定です。

| 設定 | 説明 |
|---------|------|
| `API_SERVER_ENABLED` | `true` にします |
| `API_SERVER_KEY` | 認証用のトークン（コンテナと共有します） |
| `API_SERVER_HOST` | ネットワーク越しに使うため `0.0.0.0` にします |
| `API_SERVER_PORT` | ポート番号（初期値は `8642`） |

### どのサービスでも使える {#works-for-any-platform}

プロキシモードは Matrix 専用ではありません。どのサービスのアダプターでも使えます。ゲートウェイのどのインスタンスでも `GATEWAY_PROXY_URL` を設定すれば、手元でエージェントを動かす代わりに、離れたところのエージェントへ転送します。ネットワークの分離、E2EE の要件、機械の資源の都合など、アダプターをエージェントとは別の環境で動かしたいときに便利です。

:::tip
セッションのつながりは `X-Hermes-Session-Id` ヘッダーで保たれます。ホスト側の API サーバーはこの ID でセッションを追いかけるので、手元でエージェントを動かしているときと同じように、メッセージをまたいで会話が続きます。
:::

:::note
**今の版での制限:** 離れたところのエージェントからのツールの進捗のメッセージは中継されません。利用者に見えるのは流れてくる最終的な応答だけで、個々のツールの呼び出しは見えません。危険なコマンドの承認のやり取りはホスト側で処理され、Matrix の利用者には渡りません。これらは今後の更新で扱えるようになる見込みです。
:::

### つながって送信もできるのに、届いたメッセージを無視する {#bot-connects-and-sends-but-ignores-inbound-messages}

**原因**: Matrix のイベントの処理は、同期の内容が mautrix の `handle_sync()` のしくみを通して渡されたときにだけ動きます。`handle_sync()` を呼ばないまま生の `client.sync()` を回していると、アダプターはつながったまま（送信はできる）なのに、届いたメッセージが `_on_room_message` に到達しないことがあります。

**対処**: Hermes は、最初の同期と、そのあとの差分の同期の応答のどちらでも `client.handle_sync()` を呼ぶ、明示的な同期のループを使っています。これは上流の issue #7914 とクローズされた PR #37807 での見立てと同じ考え方ですが、`client.start()` に全体の面倒を任せてしまうのではなく、Hermes 自身のバックグラウンドの保守処理（参加しているルームの把握、招待の処理、E2EE の鍵の共有）を残しています。ゲートウェイを起動し直しても届いたメッセージが処理されないときは、最初の同期の前に処理が登録されているかを確かめ、ログに `sync event dispatch error` が出ていないか見てください。

### 同期がうまくいかない、ボットが遅れる {#sync-issues-bot-falls-behind}

**原因**: 時間のかかるツールの実行で同期のループが遅れているか、ホームサーバーが遅くなっています。

**対処**: 同期のループはエラーのたびに 5 秒ごとに自動で再試行します。Hermes のログに同期まわりの警告が出ていないか見てください。いつも遅れるようなら、ホームサーバーの資源が足りているか確かめます。

### ボットがオフラインになっている {#bot-is-offline}

**原因**: Hermes のゲートウェイが動いていないか、接続に失敗しています。

**対処**: `hermes gateway` が動いているか確かめます。ターミナルの出力にエラーが出ていないか見てください。よくある原因は、ホームサーバーの URL の間違い、アクセストークンの期限切れ、ホームサーバーにつながらないことです。

### 「User not allowed」が出る、ボットに無視される {#user-not-allowed-bot-ignores-you}

**原因**: 自分のユーザー ID が `MATRIX_ALLOWED_USERS` に入っていません。

**対処**: `~/.hermes/.env` の `MATRIX_ALLOWED_USERS` に自分のユーザー ID を足して、ゲートウェイを起動し直します。`@user:server` の完全な形で書いてください。

### ルームまるごと無視される {#bot-ignores-an-entire-room}

**原因**: `MATRIX_ALLOWED_ROOMS` を設定していて、今いるルームの ID が載っていません。または、そのルームではメンションが必要なのに、メッセージがボットをメンションしていません。

**対処**: そのルームの ID を `MATRIX_ALLOWED_ROOMS` に足すか、個人利用の環境ならルームの許可リストごと外します。Element でルーム ID を調べるには、ルームの設定を開いて **Advanced** を見ます。

### ブリッジ経由のメッセージが堂々巡りする、こだまする {#bridge-messages-loop-or-echo}

**原因**: ブリッジやアプリサービスの分身が、ボットの発言を新しい利用者のメッセージとして送り返しています。あるいは、ブリッジが標準的でないゴーストユーザーの ID を使っています。

**対処**: ブリッジのゴーストユーザーを `MATRIX_ALLOWED_USERS` に入れないようにし、`MATRIX_IGNORE_USER_PATTERNS` に合致する書き方を足します。通知が信頼できる手順の一部でない限り、`MATRIX_PROCESS_NOTICES=false` のままにしておきます。

## 安全に使うために {#security}

:::warning
`MATRIX_ALLOWED_USERS` は必ず設定してください。共有の環境や非公開の環境では `MATRIX_ALLOWED_ROOMS` も設定します。設定しないと、ボットが参加しているルームで話しかけられる人なら誰でもエージェントを動かせてしまいます。信頼できる相手とルームだけを許可してください。許可された利用者は、ツールの実行やシステムへのアクセスを含め、エージェントのできることすべてを使えます。
:::

Hermes Agent の環境を安全に保つ方法については、[セキュリティガイド](/hermes/docs/user-guide/security/)を見てください。

## 補足 {#notes}

- **どのホームサーバーでも動く**: Synapse、Conduit、Dendrite、matrix.org のほか、仕様に沿った Matrix のホームサーバーなら何でも使えます。特定のサーバーソフトウェアは要りません。
- **連合**: 連合しているホームサーバーを使っているなら、ボットは別のサーバーの利用者ともやり取りできます。`@user:server` の完全な ID を `MATRIX_ALLOWED_USERS` に足すだけです。
- **自動での参加**: ボットはルームへの招待を自動で受け入れて参加します。参加するとすぐに返事を始めます。
- **メディア対応**: Hermes は画像・音声・動画・添付ファイルを送受信できます。メディアは Matrix のコンテンツリポジトリ API を使ってホームサーバーにアップロードされます。
- **本物のボイスメッセージ（MSC3245）**: Matrix のアダプターは、送り出すボイスメッセージに `org.matrix.msc3245.voice` の印を自動で付けます。そのため、読み上げの応答や音声は、MSC3245 に対応した Element などのクライアントで、ただの音声ファイルの添付ではなく **本物のボイスメッセージの吹き出し** として表示されます。MSC3245 の印が付いた受信のボイスメッセージも正しく判別され、音声からテキストへの書き起こしに回されます。設定は要らず、自動で動きます。
