---
title: "Matrix"
description: "Hermes Agent を Matrix のボットとして設定する"
upstream_path: user-guide/messaging/matrix.md
upstream_blob: c5406c87b05fbc01a8fb3f625762f612afe9bd5a
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/matrix
---

# Matrix の設定 {#matrix-setup}

Hermes Agent は、開かれた分散型のメッセージング規格である Matrix につながります。Matrix は自分でホームサーバーを立てても、matrix.org のような公開のものを使ってもかまいません。どちらにしても、やり取りは自分の手の内に残ります。ボットは `mautrix` の Python SDK でつながり、届いたメッセージを Hermes Agent の処理の流れ（ツールの利用、記憶、推論を含みます）に通して、すぐに返事を返します。文章、添付ファイル、画像、音声、動画に対応し、必要なら端末間の暗号化（E2EE）も使えます。

Hermes は Matrix のホームサーバーなら何でも動きます。Synapse でも Conduit でも Dendrite でも matrix.org でもかまいません。

設定の話に入る前に、多くの人が真っ先に知りたいところを見ておきます。つないだあと、Hermes がどう振る舞うかです。

## Hermes の振る舞い {#how-hermes-behaves}

| 場面 | 振る舞い |
|---------|----------|
| **DM** | Hermes はすべてのメッセージに返事をします。`@mention` は要りません。DM ごとに別のセッションになります。DM で `@mentioned` されたときにスレッドを始めたい場合は、`MATRIX_DM_MENTION_THREADS=true` にします。 |
| **ルーム** | 初期状態では、Hermes は `@mention` されたときだけ返事をします。`MATRIX_REQUIRE_MENTION=false` にするか、ルーム ID を `MATRIX_FREE_RESPONSE_ROOMS` に足すと、メンションなしで返事をするルームになります。ルームへの招待は自動で受け入れます。 |
| **スレッド** | Hermes は Matrix のスレッド（MSC3440）に対応します。スレッドの中で返信すると、その文脈はルーム本体の流れとは切り離されたままになります。ボットがすでに参加しているスレッドでは、メンションは要りません。 |
| **自動スレッド** | 初期状態では、ルームで返事をするメッセージごとに Hermes がスレッドを自動で作ります。こうすると会話が混ざりません。やめたい場合は `MATRIX_AUTO_THREAD=false` にします。DM のメッセージでも自動でスレッドを作りたい場合は `MATRIX_DM_AUTO_THREAD=true`（初期値は false）にします。これは、DM で `@mentioned` されたときだけスレッドを始める `MATRIX_DM_MENTION_THREADS` とは別のものです。 |
| **コマンド** | Matrix のクライアントがそのまま送ってくれるなら、Hermes はふつうの `/commands` を受け取ります。クライアントが `/` を自分用のコマンドとして押さえている場合は、代わりに `!commands` を使ってください。Hermes は、知っている `!command` の別名を `/command` に読み替えます。 |
| **対話的な操作** | 危ないコマンドの承認や `/model` の選択には、Matrix のリアクションを使えます。承認のリアクションは、その操作を頼んだ本人だけに限ることもできます。 |
| **思考とツールの動き** | ゲートウェイの進捗表示を有効にしていると、Matrix では思考やツールの動きをスレッドの中の編集できるメッセージとして見せるので、ルーム本体の流れがあふれません。 |
| **複数人がいる共有ルーム** | 初期状態では、Hermes はルームの中でも利用者ごとにセッションの履歴を分けます。同じルームで話している二人が同じ記録を共有することはありません（自分で切らないかぎり）。 |

:::tip
招待されると、ボットは自動でルームに入ります。ボットの Matrix 利用者を好きなルームに招待すれば、そのまま参加して返事を始めます。
:::

## 対応状況の一覧 {#capability-matrix}

この表は、Matrix アダプターの機能の宣言と Matrix のテストに裏づけられたものです。E2EE だけが方式の選択になっているのは、暗号化されたルームを無効にするか、できるときだけ使うか、必須にするかを、運用ごとに選べるからです。

| 機能 | Matrix |
|------------|--------|
| 文章 | 対応 |
| スレッド | 対応 |
| リアクション | 対応 |
| 承認 | 対応 |
| モデルの選択 | 対応 |
| 思考の表示 | 対応 |
| 画像 | 対応 |
| 複数枚の画像 | 対応 |
| ファイル | 対応 |
| 音声・ボイス | 対応 |
| 動画 | 対応 |
| E2EE | 無効／できるときだけ／必須 |
| 診断 | 対応 |

### Matrix でのセッションの考え方 {#session-model-in-matrix}

初期状態では、次のようになります。

- DM ごとに別のセッションになります
- スレッドごとに別のセッションの区画ができます
- 共有ルームでは、利用者ごとにそのルーム内で別のセッションを持ちます

これは `config.yaml` で決まります。

```yaml
group_sessions_per_user: true
```

ルーム全体でひとつの会話を共有したいと明確に望むときだけ、`false` にしてください。

```yaml
group_sessions_per_user: false
```

共有セッションは共同作業のルームでは便利ですが、次のことも意味します。

- 文脈の増え方とトークンの費用を、利用者どうしで分け合うことになります
- 誰かの長いツール中心の作業が、ほかの全員の文脈をふくらませます
- 誰かの実行中の処理が、同じルームにいる別の人の追加の問いかけを遮ることがあります

### メンションとスレッドの設定 {#mention-and-threading-configuration}

メンションと自動スレッドの振る舞いは、環境変数でも `config.yaml` でも設定できます。

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

環境変数を使う場合は次のようになります。

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

:::tip リアクションを止める
`MATRIX_REACTIONS=false` にすると、届いたメッセージにボットが付ける処理中の絵文字リアクション（👀／✅／❌）が止まります。リアクションのイベントがうるさいルームや、参加しているクライアントの一部がリアクションに対応していないルームで役に立ちます。
:::

:::tip ルーム全体へのメンション
Hermes は、`@alice:example.org` のようにはっきりした Matrix ID には、Matrix の形式に沿った利用者メンションを送ります。ルーム全体に飛ばす `@room` の通知は初期状態では止めてあります。ボットが全員を呼び出してよいルームでだけ、`MATRIX_ALLOW_ROOM_MENTIONS=true` にしてください。
:::

:::note
`MATRIX_REQUIRE_MENTION` がなかった頃の版から上げてきた場合、以前のボットはルーム内のすべてのメッセージに返事をしていました。その振る舞いを保ちたいときは、`MATRIX_REQUIRE_MENTION=false` にしてください。
:::

### プロジェクトごとのルームを切り分ける {#project-room-isolation}

同じ Matrix のボットを複数のプロジェクトのルームで使う場合は、ルーム単位で安定したセッションになるよう設定します。

```bash
MATRIX_SESSION_SCOPE=room
MATRIX_AUTO_THREAD=false
```

`MATRIX_SESSION_SCOPE` には次の値を指定できます。

| 値 | 振る舞い |
|-------|----------|
| `auto` | これまでどおりの初期値です。スレッドを作るかどうかは、これまでの `MATRIX_AUTO_THREAD` の振る舞いで決まります。 |
| `room` | スレッドに入っていないルームのメッセージは、ひとつの安定したルームのセッションにまとまります。本物の Matrix のスレッドは、これまでどおりスレッドの起点を使います。 |
| `thread` | スレッドに入っていないルームのメッセージから、きっかけになったイベント ID を使ってスレッドとセッションを組み立てます。 |

Hermes は、いま話している Matrix のルーム名、ルーム ID、トピック、メッセージ ID と、ルームの境目についての注記を、エージェントへのプロンプトに含めるようになりました。`/status` でも、いまの Matrix のルームとセッションの範囲が見られます。また `/resume` は、別の Matrix ルームで名前を付けたセッションを黙って呼び戻すことはありません。呼び戻すには `/resume --cross-room <session name>` をはっきり指定します。

`MATRIX_SESSION_SCOPE=room` は、ルームとスレッドのどちらを単位にするかを決めます。そのルームの中で利用者どうしがひとつの流れを共有するかどうかは、これまでどおり `group_sessions_per_user` が決めます。`group_sessions_per_user: true`（初期値）なら、Alice と Bob はプロジェクト B のセッションを別々に持ちます。`group_sessions_per_user: false` なら、そのルームはプロジェクト B の記録をひとつだけ共有します。

このページでは、ボットのアカウントを作るところから最初のメッセージを送るところまで、設定の流れを一通りたどります。

## ステップ 1: ボットのアカウントを作る {#step-1-create-a-bot-account}

ボット用の Matrix の利用者アカウントが必要です。作り方はいくつかあります。

### やり方 A: 自分のホームサーバーで登録する（おすすめ） {#option-a-register-on-your-homeserver-recommended}

自分でホームサーバー（Synapse、Conduit、Dendrite）を動かしている場合です。

1. 管理用の API か登録ツールで、新しい利用者を作ります。

```bash
# Synapse example
register_new_matrix_user -c /etc/synapse/homeserver.yaml http://localhost:8008
```

2. ユーザー名は `hermes` のようなものにします。すると、利用者 ID の全体は `@hermes:your-server.org` になります。

### やり方 B: matrix.org などの公開ホームサーバーを使う {#option-b-use-matrixorg-or-another-public-homeserver}

1. [Element Web](https://app.element.io) を開き、新しいアカウントを作ります。
2. ボットのユーザー名を決めます（例 `hermes-bot`）。

### やり方 C: 自分のアカウントを使う {#option-c-use-your-own-account}

自分自身の利用者として Hermes を動かすこともできます。この場合、ボットは自分の名前で発言します。個人用のアシスタントには向いています。

## ステップ 2: アクセストークンを手に入れる {#step-2-get-an-access-token}

Hermes がホームサーバーに認めてもらうには、アクセストークンが要ります。方法は二つあります。

### やり方 A: アクセストークン（おすすめ） {#option-a-access-token-recommended}

いちばん確実に手に入れる方法です。

**Element から取る:**
1. ボットのアカウントで [Element](https://app.element.io) にログインします。
2. **Settings** → **Help & About** を開きます。
3. 下までたどって **Advanced** を開くと、アクセストークンが出ています。
4. **すぐに控えてください。**

**API から取る:**

```bash
curl -X POST https://your-server/_matrix/client/v3/login \
  -H "Content-Type: application/json" \
  -d '{
    "type": "m.login.password",
    "user": "@hermes:your-server.org",
    "password": "your-password"
  }'
```

返ってきた内容に `access_token` の項目があるので、それを控えます。

:::warning[アクセストークンは大切に扱ってください]
アクセストークンがあれば、ボットの Matrix アカウントを何でも操作できます。人目に触れる場所に出したり、Git にコミットしたりしないでください。漏れてしまったときは、その利用者のセッションをすべてログアウトさせて無効にします。
:::

### やり方 B: パスワードでログインする {#option-b-password-login}

アクセストークンを渡す代わりに、ボットの利用者 ID とパスワードを Hermes に教えることもできます。Hermes は起動のときに自分でログインします。こちらのほうが簡単ですが、パスワードが `.env` に置かれることになります。

```bash
MATRIX_USER_ID=@hermes:your-server.org
MATRIX_PASSWORD=your-password
```

## ステップ 3: 自分の Matrix 利用者 ID を調べる {#step-3-find-your-matrix-user-id}

Hermes Agent は、誰がボットとやり取りできるかを Matrix の利用者 ID で管理します。Matrix の利用者 ID は `@username:server` という形です。

自分のものを調べるには、次のようにします。

1. [Element](https://app.element.io)（あるいはお使いの Matrix クライアント）を開きます。
2. アバター → **Settings** をクリックします。
3. プロフィールの上のほうに利用者 ID が出ています（例 `@alice:matrix.org`）。

:::tip
Matrix の利用者 ID は必ず `@` で始まり、`:` のあとにサーバー名が続きます。たとえば `@alice:matrix.org` や `@bob:your-server.com` です。
:::

## ステップ 4: Hermes Agent を設定する {#step-4-configure-hermes-agent}

### やり方 A: 対話式の設定（おすすめ） {#option-a-interactive-setup-recommended}

案内に沿って進むコマンドを実行します。

```bash
hermes gateway setup
```

聞かれたら **Matrix** を選び、続けてホームサーバーの URL、アクセストークン（またはユーザー ID とパスワード）、許可する利用者 ID を入力します。

### やり方 B: 手で設定する {#option-b-manual-configuration}

`~/.hermes/.env` に次の内容を書き足します。

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

## 内輪の運用を固める {#private-deployment-hardening}

内輪で使う Matrix の運用では、利用者とルームの両方に許可リストを設けてください。`MATRIX_ALLOWED_USERS` を設定していないと、ボットが入っているルームで話しかけられる人は誰でもエージェントを動かせます。`MATRIX_ALLOWED_ROOMS` を設定していないと、ボットが参加しているルームならどこからでもエージェントを動かせます。しっかり締めるなら、両方を設定します。

```bash
MATRIX_ALLOWED_USERS=@alice:matrix.example.org,@bob:matrix.example.org
MATRIX_ALLOWED_ROOMS=!ops:matrix.example.org,!dmroom:matrix.example.org
```

ブリッジや appservice を使う運用では、堂々巡りを防ぐ手当てがもう少し要ります。Hermes は、自分自身のイベント、localpart が `_` で始まる Matrix の appservice 風の利用者、重複したイベント ID、起動前の古いイベント、編集による差し替えのイベント、そして `m.notice` のイベントを、初期状態でつねに無視します。お使いのブリッジが別の命名を使っているなら、その分身の利用者に合う書き方を足してください。

```bash
MATRIX_IGNORE_USER_PATTERNS='^@telegram_,^@slack_,^@whatsapp_'
```

`m.notice` を本当に送っているのが信頼できる人の流れである場合だけ、通知を受け取るようにしてください。

```bash
MATRIX_PROCESS_NOTICES=true
```

ルーム全体に飛ばす通知は、初期状態では止めてあります。ボットが `@room` で全員を呼び起こしてよいとはっきり決めていないかぎり、`MATRIX_ALLOW_ROOM_MENTIONS=false` のままにしてください。

診断やデバッグの出力では、Matrix のアクセストークン、リカバリーキー、端末の識別子、メッセージの本文が伏せられます。メディアの取得は Matrix の `mxc://` のコンテンツ URI に限られ、`MATRIX_MAX_MEDIA_BYTES` を超えるものは断ります。連合しているルームや信用できないホームサーバーは、信用できない入力として扱ってください。ルームの許可リストは狭く保ち、ツールを多く使う作業は DM か非公開のルームで行い、ブリッジの分身や appservice の身代わりを許可された利用者にしないようにします。

`~/.hermes/config.yaml` で調整できる、任意の振る舞いの設定です。

```yaml
group_sessions_per_user: true
```

- `group_sessions_per_user: true` にすると、共有ルームの中でも参加者ごとに文脈が分かれたままになります

### ゲートウェイを起動する {#start-the-gateway}

設定が終わったら、Matrix のゲートウェイを起動します。

```bash
hermes gateway
```

数秒のうちに、ボットがホームサーバーにつながって同期を始めるはずです。DM でも、ボットが参加しているルームでもかまわないので、メッセージを送って試してみてください。

:::tip
`hermes gateway` は、背後で動かしたり systemd のサービスにしたりして、動かし続けることもできます。詳しくは配備のドキュメントを見てください。
:::

## 端末間の暗号化（E2EE） {#end-to-end-encryption-e2ee}

Hermes は Matrix の端末間の暗号化に対応しているので、暗号化されたルームでもボットと話せます。

### 必要なもの {#requirements}

E2EE には、暗号化の追加機能つきの `mautrix` と、C で書かれた `libolm` が要ります。

```bash
# Install mautrix with E2EE support
pip install 'mautrix[encryption]'

# Or install with hermes extras
cd ~/.hermes/hermes-agent && uv pip install -e ".[matrix]"
```

さらに、`libolm` をシステムに入れておく必要があります。

```bash
# Debian/Ubuntu
sudo apt install libolm-dev

# macOS
brew install libolm

# Fedora
sudo dnf install libolm-devel
```

### E2EE を有効にする {#enable-e2ee}

`~/.hermes/.env` に次の行を足します。

```bash
MATRIX_E2EE_MODE=required
```

`MATRIX_E2EE_MODE` には次の値を指定できます。

| 値 | 振る舞い |
|------|----------|
| `off` | Matrix の E2EE を用意しません。 |
| `optional` | 必要なものがそろっていれば E2EE を試しますが、暗号まわりの用意ができなくても、暗号化していないルームはそのまま動かします。 |
| `required` | E2EE に必要なものや暗号まわりの用意がそろわないときは、動かさずに止まります。 |

できるときだけ使う方式では、暗号まわりの用意ができないときに E2EE なしの動作に落ちることがあります。必須の方式は、黙って弱いほうへ落ちるのではなく、止まることを選びます。

これまでとの互換のため、`MATRIX_ENCRYPTION=true` でも必須の E2EE と同じ振る舞いになります。

E2EE を有効にすると、Hermes は次のように動きます。

- 暗号の鍵を `~/.hermes/platforms/matrix/store/` に保管します（古い導入では `~/.hermes/matrix/store/`）
- 最初につないだときに端末の鍵を送ります
- 受け取ったメッセージを自動で復号し、送るメッセージを自動で暗号化します
- 招待されると、暗号化されたルームにも自動で入ります

### Matrix のツールと操作 {#matrix-tools-and-controls}

Matrix での会話では、Hermes が Matrix 専用のツールをエージェントに渡します。

- `matrix_send_reaction`
- `matrix_redact_message`
- `matrix_create_room`
- `matrix_invite_user`
- `matrix_fetch_history`
- `matrix_set_presence`

これらのツールは Matrix の場面に限られ、Matrix 以外の道具立てには出てきません。管理者向けのツールは初期状態では使えません。メッセージの取り消しには `MATRIX_TOOLS_ALLOW_REDACTION=true`、招待には `MATRIX_TOOLS_ALLOW_INVITES=true`、ルームの作成には `MATRIX_TOOLS_ALLOW_ROOM_CREATE=true` が必要です。公開ルームを作るには、さらに `MATRIX_ALLOW_PUBLIC_ROOMS=true` も要ります。
`MATRIX_ALLOWED_ROOMS` を設定している場合、Matrix のツールが触れるのはそのルームだけになります。

リアクションによる操作は次のとおりです。

- ✅ 今回だけ認める
- ♾️ 今後もずっと認める
- ❌ 断る
- 数字のリアクションは `/model` の選択に使います

そのルームにいる許可された Matrix 利用者なら誰でも承認やモデル選択の画面を操作してよい、と考えているなら、`MATRIX_APPROVAL_REQUIRE_SENDER=false` にしてください。初期状態では、誰が頼んだかを Hermes が把握できているときは、その本人に限られます。

### メディアの上限 {#media-limits}

Hermes は、Matrix の画像、ファイル、音声、動画を Matrix のメディア API でやり取りします。作った画像が複数あるときは、順序のあるひとまとまりとして送り、説明文とスレッドの文脈をまとまり全体で保ちます。

初期状態では、100 MB を超える Matrix のメディアは、送受信の前に断ります。変えるには次のようにします。

```bash
MATRIX_MAX_MEDIA_BYTES=104857600
```

受け取るメディアは Matrix の `mxc://` のコンテンツ URI である必要があります。連合したルームが何でも落としてくる入り口に変わってしまわないよう、Hermes は Matrix のイベントに紛れ込んだ任意の HTTP(S) のメディア URL を断ります。

### クロス署名による確認（おすすめ） {#cross-signing-verification-recommended}

Matrix のアカウントでクロス署名を使っている場合（Element では初期状態でそうなっています）、リカバリーキーを設定しておくと、ボットが起動のたびに自分の端末へ署名できます。これがないと、端末の鍵が入れ替わったあと、ほかの Matrix のクライアントが暗号のセッションをボットと共有してくれなくなることがあります。

```bash
MATRIX_RECOVERY_KEY=EsT... your recovery key here
```

**どこにあるか:** Element では、**Settings** → **Security & Privacy** → **Encryption** と進んだ先のリカバリーキー（「Security Key」とも呼ばれます）です。クロス署名を初めて設定したときに、保存しておくよう促されたあの鍵です。

`MATRIX_RECOVERY_KEY` が設定されていると、Hermes は起動のたびに、ホームサーバーの安全な保管場所からクロス署名の鍵を読み込み、いまの端末に署名します。何度やっても結果は同じなので、ずっと有効にしたままでも大丈夫です。

Hermes が新しい Matrix のリカバリーキーを作った場合でも、その鍵そのものをログに残すことはありません。起動の前に `MATRIX_RECOVERY_KEY_OUTPUT_FILE=/secure/path/matrix-recovery-key.txt` を設定しておくと、作った鍵をファイルの権限 `0600` で一度だけ書き出します。すでにファイルがある場合は上書きしません。

:::warning[暗号の保管場所を消したとき]
`~/.hermes/platforms/matrix/store/crypto.db` を消すと、ボットは暗号のうえでの身元を失います。同じ端末 ID で起動しなおしても、それだけでは元に戻り **ません**。古い身元の鍵で署名された使い捨ての鍵がホームサーバーに残っているので、相手側が新しい Olm のセッションを結べないからです。

Hermes は起動のときにこの状態に気づき、E2EE を有効にせず、`device XXXX has stale one-time keys on the server signed with a previous identity key` とログに残します。

**いちばん簡単な立て直し方は、アクセストークンを作り直すこと** です（新しい端末 ID になり、古い鍵の履歴も付いてきません）。下の「E2EE を使っていた以前の版から上げる」の節を見てください。これがいちばん確実で、ホームサーバーのデータベースに手を入れずに済みます。

**手作業での立て直し**（上級者向け。端末 ID はそのままです）:

1. Synapse を止めて、データベースから古い端末を消します。
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
   Synapse の管理 API を使う手もあります（利用者 ID が URL 用に符号化されている点に注意してください）。
   ```bash
   curl -X DELETE -H "Authorization: Bearer ADMIN_TOKEN" \
     'https://your-server/_synapse/admin/v2/users/%40hermes%3Ayour-server/devices/DEVICE_ID'
   ```
   なお、管理 API で端末を消すと、それに結びついたアクセストークンも無効になることがあります。そのあとで新しいトークンを作る必要が出るかもしれません。

2. 手元の暗号の保管場所を消して、Hermes を起動しなおします。
   ```bash
   rm -f ~/.hermes/platforms/matrix/store/crypto.db*
   # restart hermes
   ```

ほかの Matrix のクライアント（Element、matrix-commander）は、古い端末の鍵を持ったままのことがあります。立て直したあと、Element で `/discardsession` と打つと、ボットとのあいだで新しい暗号のセッションを結び直せます。
:::

:::info
`mautrix[encryption]` が入っていない、または `libolm` が見つからない場合、ボットは暗号化しないふつうのクライアントとして自動的に動きます。ログに警告が出ます。
:::

## ホームルーム {#home-room}

ボットが自分から送るメッセージ（cron の実行結果、リマインダー、通知など）の届け先として、「ホームルーム」を決められます。設定の仕方は二つあります。

### スラッシュコマンドで設定する {#using-the-slash-command}

ボットがいる Matrix のルームで `/sethome` と打ちます。そのルームがホームルームになります。
お使いの Matrix のクライアントがスラッシュコマンドを横取りしてしまう場合は、代わりに `!sethome` と打ってください。

### 手で設定する {#manual-configuration}

`~/.hermes/.env` に次の行を足します。

```bash
MATRIX_HOME_ROOM=!abc123def456:matrix.example.org
```

## ルームの許可リスト（`allowed_rooms`） {#room-allowlist-allowedrooms}

ボットが動く Matrix のルームを、決まったいくつかに絞ります。設定すると、ボットが返事をするのはリストに ID があるルーム **だけ** になります。ほかのルームから来たメッセージは、メンションされていても黙って捨てられます。

**DM（一対一のルーム）はこの絞り込みの対象外** なので、許可された利用者はいつでも一対一でボットに届きます。

```yaml
matrix:
  allowed_rooms:
    - "!abc123def456:matrix.example.org"
    - "!opsroom789:matrix.example.org"
```

環境変数（カンマ区切り）でも設定できます。

```bash
MATRIX_ALLOWED_ROOMS="!abc123def456:matrix.example.org,!opsroom789:matrix.example.org"
```

振る舞いは次のとおりです。

- 空、または未設定 → 制限なし（初期状態）。
- 中身がある → ルーム ID がリストにあることが必要です。この確認は、ほかのどの判定（メンションの要否、送信者の許可リストなど）よりも **先** に走ります。
- 使うのはルームの **内部 ID**（`!abc...:server`）で、別名（`#room:server`）ではありません。内部 ID は Element なら ルーム → Settings → Advanced で見られます。

あわせて読む: [管理者用と利用者用に分かれたスラッシュコマンド](/hermes/docs/reference/slash-commands/#permissions-and-adminuser-split)。

:::tip
ルーム ID を調べるには、Element でそのルームを開き、**Settings** → **Advanced** と進みます。そこに **Internal room ID** が出ています（`!` で始まります）。
:::

## Matrix でのコマンド {#commands-in-matrix}

Hermes は、ほかのメッセージングの場と同じゲートウェイのコマンドを Matrix でも使えます。`/commands`、`/model`、`/stop`、`/queue`、`/steer`、`/goal`、`/subgoal`、`/background`、`/bg`、`/btw`、`/tasks`、`/yolo` などです。

Matrix のクライアントの中には、先頭の `/` を自分用のコマンドとして押さえていて、知らないスラッシュコマンドをルームに送ってくれないものがあります。その場合は、Matrix でも通る別名として `!` を使ってください。

```text
!commands
!model
!model gpt-5.5 --provider openrouter
!queue continue with the next task
!stop
```

Hermes が `!command` を読み替えるのは、そのコマンドをゲートウェイが知っているか、登録されたプラグインのコマンドか、入れてあるスキルのコマンドである場合だけです。`!important` のようなふつうの感嘆は、そのままの会話のメッセージとして扱われます。

## 困ったときは {#troubleshooting}

### ボットがメッセージに返事をしない {#bot-is-not-responding-to-messages}

**原因**: ボットがそのルームに入っていない、`MATRIX_ALLOWED_USERS` に自分のユーザー ID がない、`MATRIX_ALLOWED_ROOMS` にそのルームがない、あるいはルームのメッセージがボットをメンションしていません。

**対処**: ボットをルームに招待します（招待すると自動で入ります）。自分のユーザー ID が `MATRIX_ALLOWED_USERS` にあるか（`@user:server` の形で全体を書きます）、許可リストを使っているならルーム ID が `MATRIX_ALLOWED_ROOMS` にあるかを確かめます。ルームでは、ボットをメンションするか、そのルームを `MATRIX_FREE_RESPONSE_ROOMS` に足します。そのうえでゲートウェイを起動しなおします。

### ルームには入るのに、すべてのメッセージを黙って捨てる（時計のずれ） {#bot-joins-rooms-but-silently-drops-every-message-clock-skew}

**原因**: そのマシンの時計が実際より先に進んでいます。Matrix のアダプターは、最初の同期で流れてくる過去のイベントを無視するために、起動時から 5 秒の猶予の判定（`event_ts < startup_ts - 5`）を使っています。時計が進んでいると、届くイベントがすべて「起動より古い」ように見えてしまい、メッセージの処理にたどり着く前に捨てられます。つながっているように見えるのに、いつまでも返事が来ません。[#12614](https://github.com/NousResearch/hermes-agent/issues/12614) を見てください。

**症状**: ゲートウェイのログに `Matrix: dropped N live events as 'too old' more than 30s after startup` と出ます。

**対処**: マシンの時計を NTP に合わせて、ボットを起動しなおします。

```bash
# Debian/Ubuntu
sudo timedatectl set-ntp true
timedatectl status   # confirm "System clock synchronized: yes"

# macOS
sudo sntp -sS time.apple.com
```

### 起動時に "Failed to authenticate" や "whoami failed" が出る {#failed-to-authenticate-whoami-failed-on-startup}

**原因**: アクセストークンかホームサーバーの URL が違います。

**対処**: `MATRIX_HOMESERVER` が自分のホームサーバーを指しているか確かめます（`https://` を付け、末尾のスラッシュは付けません）。`MATRIX_ACCESS_TOKEN` が有効かは curl で試せます。

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-server/_matrix/client/v3/account/whoami
```

自分の利用者情報が返ってくればトークンは有効です。エラーが返るなら、新しいトークンを作ってください。

### "mautrix not installed" というエラーが出る {#mautrix-not-installed-error}

**原因**: Python の `mautrix` が入っていません。

**対処**: 入れてください。

```bash
pip install 'mautrix[encryption]'
```

Hermes の追加機能から入れる手もあります。

```bash
cd ~/.hermes/hermes-agent && uv pip install -e ".[matrix]"
```

### 暗号のエラー／"could not decrypt event" が出る {#encryption-errors-could-not-decrypt-event}

**原因**: 暗号の鍵が足りない、`libolm` が入っていない、あるいはボットの端末が信用されていません。

**対処**:
1. `libolm` がシステムに入っているか確かめます（上の E2EE の節を見てください）。
2. `.env` に `MATRIX_ENCRYPTION=true` があることを確かめます。
3. Matrix のクライアント（Element）で、ボットのプロフィール -> Sessions と進み、ボットの端末を確認して信用します。
4. ボットが暗号化されたルームに入ったばかりのときは、入った *あと* のメッセージしか復号できません。それより前のものは読めません。

### E2EE を使っていた以前の版から上げる {#upgrading-from-a-previous-version-with-e2ee}

:::tip
`crypto.db` を手で消してもいる場合は、上の E2EE の節にある「暗号の保管場所を消したとき」の注意を見てください。ホームサーバーに残った古い使い捨ての鍵を片づける手順が別に要ります。
:::

以前に `MATRIX_ENCRYPTION=true` で Hermes を使っていて、SQLite を使う新しい暗号の保管方式の版に上げた場合、ボットの暗号のうえでの身元が変わっています。お使いの Matrix のクライアント（Element）が古い端末の鍵を持ったままで、暗号のセッションをボットと共有してくれないことがあります。

**症状**: ボットはつながり、ログには「E2EE enabled」と出るのに、メッセージがすべて「could not decrypt event」になり、ボットが何も返しません。

**何が起きているか**: 以前の `matrix-nio` や、直列化して保存する `mautrix` の仕組みで作られた古い暗号の状態は、新しい SQLite の保管方式と噛み合いません。ボットは新しい身元を作りますが、お使いの Matrix のクライアントは古い鍵を持ったままで、鍵が変わった端末にはルームの暗号のセッションを渡しません。これは Matrix の安全のためのつくりで、同じ端末なのに身元の鍵が変わったものを、クライアントは怪しいものとして扱います。

**対処**（移行のときに一度だけ）:

1. **アクセストークンを作り直して**、新しい端末 ID を得ます。いちばん簡単なやり方は次のとおりです。

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

   新しい `access_token` を控えて、`~/.hermes/.env` の `MATRIX_ACCESS_TOKEN` を書き換えます。

2. **古い暗号の状態を消します**。

   ```bash
   rm -f ~/.hermes/platforms/matrix/store/crypto.db
   rm -f ~/.hermes/platforms/matrix/store/crypto_store.*
   ```

3. **リカバリーキーを設定します**（クロス署名を使っている場合。Element の利用者はたいてい使っています）。`~/.hermes/.env` に次の行を足します。

   ```bash
   MATRIX_RECOVERY_KEY=EsT... your recovery key here
   ```

   こうしておくと、ボットが起動のときにクロス署名の鍵で自分に署名できるので、Element が新しい端末をすぐ信用します。これがないと、Element には確認されていない端末に見えてしまい、暗号のセッションを渡してくれないことがあります。リカバリーキーは Element の **Settings** → **Security & Privacy** → **Encryption** にあります。

4. **Matrix のクライアント側で暗号のセッションを入れ替えさせます**。Element では、ボットとの DM のルームを開いて `/discardsession` と打ちます。これで Element が新しい暗号のセッションを作り、ボットの新しい端末と共有します。

5. **ゲートウェイを起動しなおします**。

   ```bash
   hermes gateway run
   ```

   `MATRIX_RECOVERY_KEY` を設定していれば、ログに `Matrix: cross-signing verified via recovery key` と出るはずです。

6. **もう一度メッセージを送ります**。ボットが復号して、ふつうに返事をするはずです。

:::note
移行のあとは、上げる *前* に送られたメッセージは復号できません。古い暗号の鍵がもうないからです。影響があるのはこの切り替えのときだけで、新しいメッセージはふつうに動きます。
:::

:::tip
**新しく入れた場合は関係ありません。** この移行が要るのは、以前の版の Hermes で E2EE を動かしていて、そこから上げる場合だけです。

**なぜ新しいアクセストークンが要るのか。** Matrix のアクセストークンは、それぞれ特定の端末 ID に結びついています。同じ端末 ID のまま暗号の鍵だけを入れ替えると、ほかの Matrix のクライアントがその端末を信用しなくなります（身元の鍵が変わったのを、破られたかもしれない兆しと見るためです）。新しいアクセストークンなら、古い鍵の履歴のない新しい端末 ID になるので、ほかのクライアントもすぐに信用します。
:::

## プロキシ方式（macOS で E2EE を使う） {#proxy-mode-e2ee-on-macos}

Matrix の E2EE には `libolm` が要りますが、これは macOS の ARM64（Apple Silicon）ではビルドできません。`hermes-agent[matrix]` の追加機能は Linux だけに限られています。macOS を使っているなら、プロキシ方式を使うと、E2EE の部分だけを Linux の仮想マシンの Docker コンテナで動かしつつ、エージェント本体は macOS でそのまま動かせます。手元のファイル、記憶、スキルにもふつうに触れます。

### 仕組み {#how-it-works}

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

Docker のコンテナが受け持つのは、Matrix のやり取りと E2EE だけです。メッセージが届くとコンテナがそれを復号し、文章を標準的な HTTP のリクエストでホストへ渡します。ホスト側でエージェントが動き、ツールを呼び、返事を組み立てて、そのまま流し返します。コンテナはその返事を暗号化して Matrix に送ります。セッションはすべてひとつにまとまっているので、CLI でも Matrix でも Telegram でも、ほかのどの場でも、同じ記憶と会話の履歴を共有します。

### ステップ 1: ホスト側（macOS）を設定する {#step-1-configure-the-host-macos}

Docker のコンテナから来るリクエストをホストが受け取れるように、API サーバーを有効にします。

`~/.hermes/.env` に次の内容を足します。

```bash
API_SERVER_ENABLED=true
API_SERVER_KEY=your-secret-key-here
API_SERVER_HOST=0.0.0.0
```

- `API_SERVER_HOST=0.0.0.0` にすると、すべての接続口で待ち受けるので、Docker のコンテナから届きます。
- ループバック以外で待ち受けるには `API_SERVER_KEY` が必要です。推測されにくい長い文字列にしてください。
- API サーバーは初期状態でポート 8642 を使います（変えたいときは `API_SERVER_PORT` で指定します）。

ゲートウェイを起動します。

```bash
hermes gateway
```

ほかに設定している場と並んで、API サーバーが立ち上がるはずです。仮想マシンから届くかどうかを確かめます。

```bash
# From the Linux VM
curl http://<mac-ip>:8642/health
```

### ステップ 2: Docker のコンテナ（Linux の仮想マシン）を設定する {#step-2-configure-the-docker-container-linux-vm}

コンテナに要るのは Matrix の資格情報と、渡し先の URL です。LLM の API キーは要りません。

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

コンテナの中身はこれだけです。OpenRouter、Anthropic、その他の推論の提供元の API キーは、ひとつも要りません。

### ステップ 3: 両方を起動する {#step-3-start-both}

1. まずホスト側のゲートウェイを起動します。
   ```bash
   hermes gateway
   ```

2. 次に Docker のコンテナを起動します。
   ```bash
   docker compose up -d
   ```

3. 暗号化された Matrix のルームでメッセージを送ります。コンテナがそれを復号してホストへ渡し、返事がそのまま流れて戻ってきます。

### 設定の早見表 {#configuration-reference}

プロキシ方式の設定は **コンテナ側**（薄いゲートウェイ）で行います。

| 設定 | 説明 |
|---------|-------------|
| `GATEWAY_PROXY_URL` | 向こう側の Hermes の API サーバーの URL（例 `http://192.168.1.100:8642`） |
| `GATEWAY_PROXY_KEY` | 認証に使うトークン（ホスト側の `API_SERVER_KEY` と同じ値にします） |
| `gateway.proxy_url` | `GATEWAY_PROXY_URL` と同じものを `config.yaml` で書く場合 |

ホスト側には次の設定が要ります。

| 設定 | 説明 |
|---------|-------------|
| `API_SERVER_ENABLED` | `true` にします |
| `API_SERVER_KEY` | 認証に使うトークン（コンテナと同じ値にします） |
| `API_SERVER_HOST` | ネットワークから届くように `0.0.0.0` にします |
| `API_SERVER_PORT` | ポート番号（初期値は `8642`） |

### どの場でも使えます {#works-for-any-platform}

プロキシ方式は Matrix だけのものではありません。どの場のアダプターでも使えます。ゲートウェイのどれかに `GATEWAY_PROXY_URL` を設定すれば、自前でエージェントを動かす代わりに、向こう側のエージェントへ渡すようになります。ネットワークを切り分けたい、E2EE の都合がある、動かす資源が足りないなど、場のアダプターをエージェントとは別の環境で動かしたいときに役立ちます。

:::tip
会話の続きは `X-Hermes-Session-Id` のヘッダーで保たれます。ホスト側の API サーバーがこの ID でセッションを見分けるので、手元でエージェントを動かしているときと同じように、やり取りが続きます。
:::

:::note
**いまの版での制約:** 向こう側のエージェントから来るツールの進捗のメッセージは、そのままは戻ってきません。利用者に見えるのは流れてくる最後の返事だけで、ひとつひとつのツールの呼び出しは見えません。危ないコマンドの承認のやり取りもホスト側で処理され、Matrix の利用者には届きません。これらは今後の更新で手が入る見込みです。
:::

### つながって送れるのに、届いたメッセージを無視する {#bot-connects-and-sends-but-ignores-inbound-messages}

**原因**: Matrix のイベントの受け口は、同期の中身が mautrix の `handle_sync()` の仕組みを通ったときにだけ動きます。`handle_sync()` を呼ばずに `client.sync()` だけを回していると、アダプターはつながったまま（送るほうは動く）でも、届いたメッセージが `_on_room_message` にたどり着きません。

**対処**: Hermes は、最初の同期でも、そのあとの差分の同期でも `client.handle_sync()` を呼ぶ、はっきりした同期の流れを使っています。これは上流の issue #7914 と閉じられた PR #37807 で示された見立てと同じですが、`client.start()` にすべてを任せるのではなく、Hermes 自身の裏方の作業（参加中のルームの把握、招待への対応、E2EE の鍵の共有）を残しています。ゲートウェイを起動しなおしても届いたメッセージが処理されないなら、最初の同期より前に受け口が登録されているかを確かめ、ログに `sync event dispatch error` が出ていないか見てください。

### 同期がうまくいかない／ボットが遅れる {#sync-issues-bot-falls-behind}

**原因**: 長く走るツールの実行が同期の流れを遅らせているか、ホームサーバーが遅くなっています。

**対処**: 同期の流れは、エラーが出ても 5 秒ごとに自動でやり直します。Hermes のログに同期まわりの警告が出ていないか見てください。いつも遅れているようなら、ホームサーバーの資源が足りているかを確かめます。

### ボットがオフラインになっている {#bot-is-offline}

**原因**: Hermes のゲートウェイが動いていないか、接続に失敗しています。

**対処**: `hermes gateway` が動いているか確かめます。端末の出力にエラーが出ていないか見てください。よくあるのは、ホームサーバーの URL の間違い、期限切れのアクセストークン、ホームサーバーに届かない、といったところです。

### "User not allowed" と出る／ボットに無視される {#user-not-allowed-bot-ignores-you}

**原因**: 自分のユーザー ID が `MATRIX_ALLOWED_USERS` に入っていません。

**対処**: `~/.hermes/.env` の `MATRIX_ALLOWED_USERS` に自分のユーザー ID を足して、ゲートウェイを起動しなおします。`@user:server` の形で全体を書いてください。

### ルームまるごと無視される {#bot-ignores-an-entire-room}

**原因**: `MATRIX_ALLOWED_ROOMS` を設定していて、いまのルーム ID がそこにないか、そのルームがメンションを必要としていて、メッセージがボットをメンションしていません。

**対処**: そのルーム ID を `MATRIX_ALLOWED_ROOMS` に足すか、個人で使っているだけならルームの許可リストをやめます。Element でルーム ID を調べるには、ルームの設定を開いて **Advanced** を見ます。

### ブリッジのメッセージが堂々巡りする／こだまする {#bridge-messages-loop-or-echo}

**原因**: ブリッジや appservice の身代わりが、ボットの発言を新しい利用者のメッセージとして送り返しているか、ブリッジがふつうと違う分身の利用者 ID を使っています。

**対処**: ブリッジの分身を `MATRIX_ALLOWED_USERS` に入れないようにし、当てはまる書き方を `MATRIX_IGNORE_USER_PATTERNS` に足して、通知が信頼できる流れの一部でないかぎり `MATRIX_PROCESS_NOTICES=false` のままにします。

## セキュリティ {#security}

:::warning
`MATRIX_ALLOWED_USERS` は必ず設定してください。共有や内輪の運用では `MATRIX_ALLOWED_ROOMS` も設定します。設定しないと、ボットが入っているルームで話しかけられる人なら誰でもエージェントを動かせてしまいます。信頼できる人とルームだけを許可してください。許可された利用者は、ツールの利用やシステムへの接触を含め、エージェントの機能をすべて使えます。
:::

Hermes Agent を安全に運用する方法については、[セキュリティのご案内](/hermes/docs/user-guide/security/)も見てください。

## 補足 {#notes}

- **どのホームサーバーでも**: Synapse、Conduit、Dendrite、matrix.org のほか、仕様に沿った Matrix のホームサーバーなら何でも動きます。特定のソフトウェアは要りません。
- **連合**: 連合しているホームサーバーを使っているなら、ボットはほかのサーバーの利用者ともやり取りできます。`@user:server` の形で全体を `MATRIX_ALLOWED_USERS` に足すだけです。
- **自動で参加**: ボットはルームへの招待を自動で受け入れて参加します。入ったらすぐに返事を始めます。
- **メディアへの対応**: Hermes は画像、音声、動画、添付ファイルを送受信できます。メディアは Matrix のコンテンツ保管用の API を使って、お使いのホームサーバーに送られます。
- **そのままのボイスメッセージ（MSC3245）**: Matrix のアダプターは、送り出すボイスメッセージに `org.matrix.msc3245.voice` の印を自動で付けます。そのため、TTS の返事やボイスの音声は、ただの音声ファイルの添付ではなく、Element をはじめ MSC3245 に対応したクライアントで **そのままのボイスの吹き出し** として表示されます。MSC3245 の印が付いた受信のボイスメッセージも正しく見分けて、音声から文章への書き起こしに回します。設定は要らず、自動で動きます。
