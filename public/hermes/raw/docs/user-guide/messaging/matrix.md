---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "Matrix"
description: "Hermes Agent を Matrix のボットとして設定する"
upstream_path: user-guide/messaging/matrix.md
upstream_blob: a4ba1c86a8b03d946e22236fdbc38f6151e098f7
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/matrix
---

# Matrix の設定 {#matrix-setup}

このページにある Python の依存パッケージのコマンドは、
[PM で準備したソースのチェックアウト](/hermes/docs/reference/package-management/#developer-workflow)を前提にしています。
依存パッケージを変えたあとは、チェックアウトを有効にし直して Hermes を再起動してください。

Hermes Agent は、オープンで連合型のメッセージ規格である Matrix と連携します。Matrix では自分でホームサーバーを立てることも、matrix.org のような公開サーバーを使うこともできます。どちらを選んでも、やり取りの主導権は自分の手に残ります。ボットは `mautrix` の Python SDK で接続し、受け取ったメッセージを Hermes Agent の処理の流れ（ツールの利用・記憶・推論を含みます）に通して、その場で返答します。テキスト・添付ファイル・画像・音声・動画に対応し、必要ならエンドツーエンド暗号化（E2EE）も使えます。

Hermes は Synapse・Conduit・Dendrite・matrix.org など、どの Matrix ホームサーバーでも動きます。

設定の前に、多くの人がまず知りたいところから見ていきます。つないだあと Hermes がどう振る舞うか、です。

## Hermes の振る舞い {#how-hermes-behaves}

| 状況 | 動作 |
|---------|----------|
| **DM** | Hermes はすべてのメッセージに応答します。`@mention` は要りません。DM ごとに別々のセッションを持ちます。DM で `@mentioned` されたときにスレッドを開きたい場合は `MATRIX_DM_MENTION_THREADS=true` を設定します。参加者が 2 人以下のルームは、はっきり名前が付いていても同じように DM として扱われます。Matrix のクライアントは 1 対 1 のチャットに自動で名前を付けるので、名前だけでは見分けがつかないからです。 |
| **ルーム** | 既定では、Hermes は `@mention` されたときだけ応答します。`MATRIX_REQUIRE_MENTION=false` を設定するか、`MATRIX_FREE_RESPONSE_ROOMS` にルーム ID を足すと、メンションなしで応答するルームになります。ルームへの招待は自動で受け入れます。あえて 2 人で作ったルームも DM として扱われるので（上を参照）、`MATRIX_ALLOWED_ROOMS`、`MATRIX_REQUIRE_MENTION`、`MATRIX_FREE_RESPONSE_ROOMS` を黙って素通りします。普通のルームとして動かしたい場合は、3 人目を入れてください。 |
| **スレッド** | Hermes は Matrix のスレッド（MSC3440）に対応します。スレッド内で返信すると、Hermes はそのスレッドの文脈をルーム本体の流れから切り離して保ちます。ボットがすでに参加しているスレッドでは、メンションは要りません。 |
| **自動スレッド化** | 既定では、Hermes はルームで応答するたびにスレッドを自動で作ります。会話が混ざらないようにするためです。`MATRIX_AUTO_THREAD=false` で無効にできます。DM のメッセージでもスレッドを自動で作りたい場合は `MATRIX_DM_AUTO_THREAD=true`（既定は false）を設定します。これは、DM で `@mentioned` されたときだけスレッドを開く `MATRIX_DM_MENTION_THREADS` とは別物です。参加者が 2 人以下のルームは DM として扱われるので（上を参照）、`MATRIX_AUTO_THREAD` ではなく `MATRIX_DM_AUTO_THREAD` に従います。 |
| **コマンド** | Matrix のクライアントが送ってくれるなら、Hermes は通常の `/commands` を受け付けます。クライアントが `/` をローカルのコマンド用に押さえている場合は、代わりに `!commands` を使ってください。Hermes は既知の `!command` の別名を `/command` として扱います。 |
| **操作用のボタン代わり** | 危険なコマンドの承認と `/model` の選択には、Matrix のリアクションを使えます。承認のリアクションは、その操作を求めた本人だけに限ることもできます。 |
| **思考とツールの動き** | ゲートウェイの進捗表示を有効にすると、Matrix ではスレッド内の編集できる欄で思考とツールの動きを見せます。ルーム本体の流れが更新であふれません。 |
| **複数人がいるルーム** | 既定では、Hermes はルームの中でも利用者ごとにセッションの履歴を分けます。同じルームで話す 2 人が 1 つの記録を共有することは、明示的に切り替えないかぎりありません。 |
| **LaTeX の数式** | 返信中の `$...$`（行内）と `$$...$$`（別行）は Element の `data-mx-maths` マークアップとして送られるので、**Settings → Labs → Render LaTeX maths in messages** を有効にしたクライアントでは KaTeX で組版されます。対になっていないドル記号（`$5 or $10`）はそのままの文字として残り、プレーンテキストの `body` には他のクライアント向けに元の TeX が入ります。 |

:::tip
ボットは招待されると自動でルームに参加します。ボットの Matrix ユーザーを好きなルームに招待するだけで、参加して応答を始めます。
:::

## 対応表 {#capability-matrix}

この表は、Matrix アダプターが宣言している対応機能と Matrix のテストの
範囲にもとづいています。E2EE がモード別なのは、暗号化されたルームを
無効にするか、可能なら使うか、必須にするかを構成ごとに選べるためです。

| 機能 | Matrix |
|------------|--------|
| テキスト | 対応 |
| スレッド | 対応 |
| リアクション | 対応 |
| 承認 | 対応 |
| モデル選択 | 対応 |
| 思考の表示欄 | 対応 |
| 画像 | 対応 |
| 複数の画像 | 対応 |
| ファイル | 対応 |
| 音声 | 対応 |
| 動画 | 対応 |
| E2EE | 無効 / 任意 / 必須 |
| 診断 | 対応 |

### Matrix でのセッションの区切り方 {#session-model-in-matrix}

既定では次のようになります。

- DM ごとに 1 つのセッション
- スレッドごとに 1 つのセッションの区画
- 共有ルームでは、利用者ごとにそのルームの中で別のセッション

これは `config.yaml` で切り替えます。

```yaml
group_sessions_per_user: true
```

ルーム全体で 1 本の会話を共有したいと明確に決めている場合だけ、`false` にします。

```yaml
group_sessions_per_user: false
```

共有セッションは共同作業のルームでは便利ですが、次の点も伴います。

- 文脈の増え方とトークンの費用を全員で共有する
- 誰か 1 人のツールを多用する長い作業が、ほかの全員の文脈を膨らませる
- 誰か 1 人の実行中の処理が、同じルームの別の人の続きの質問を妨げる

### メンションとスレッド化の設定 {#mention-and-threading-configuration}

メンションと自動スレッド化の挙動は、環境変数か `config.yaml` で設定できます。

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

環境変数で書く場合は次のようになります。

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
`MATRIX_REACTIONS=false` にすると、受信したメッセージに対してボットが付ける処理状況の絵文字リアクション（👀/✅/❌）が止まります。リアクションのイベントがうるさいルームや、参加しているクライアントの一部が対応していない場合に役立ちます。
:::

:::tip ルーム全体への呼びかけ
Hermes は `@alice:example.org` のような明示的な Matrix ID に対して、Matrix の構造化されたユーザーメンションを送ります。ルーム全体への `@room` 通知は既定で無効です。全員に通知してよいと決めたルームでだけ `MATRIX_ALLOW_ROOM_MENTIONS=true` を設定してください。
:::

:::note
`MATRIX_REQUIRE_MENTION` が無かった版から上げてきた場合、以前のボットはルーム内のすべてのメッセージに応答していました。その挙動を保ちたいときは `MATRIX_REQUIRE_MENTION=false` を設定します。
:::

### プロジェクトごとのルームを分ける {#project-room-isolation}

同じ Matrix のボットを複数のプロジェクトのルームで使う場合は、ルーム単位の
安定したセッションになるよう設定します。

```bash
MATRIX_SESSION_SCOPE=room
MATRIX_AUTO_THREAD=false
```

`MATRIX_SESSION_SCOPE` には次の値を指定できます。

| 値 | 動作 |
|-------|----------|
| `auto` | 従来どおりの既定値。これまでの `MATRIX_AUTO_THREAD` の挙動が、擬似的なスレッドを制御します。 |
| `room` | スレッド外のルームのメッセージは、1 つの安定したルームのセッションにまとまります。本物の Matrix のスレッドは、これまでどおりスレッドの起点を使います。 |
| `thread` | スレッド外のルームのメッセージから、きっかけとなったイベント ID をもとにスレッドとセッションを作ります。 |

Hermes は現在の Matrix のルーム名・ルーム ID・トピック・メッセージ ID と、
Matrix のルームの境界についての注記をエージェントのプロンプトに含めます。`/status` は
現在の Matrix のルームとセッションの区切り方も表示します。`/resume` は、
`/resume --cross-room <session name>` を明示して使わないかぎり、別の Matrix のルームの
名前付きセッションを黙って再開することはありません。

`MATRIX_SESSION_SCOPE=room` はルームとスレッドの区切りを決めます。従来からある
`group_sessions_per_user` の設定は、そのルームの中で利用者どうしが同じ区切りを
共有するかどうかを決めます。`group_sessions_per_user: true`（既定）なら、Alice と Bob は
別々の Project B のセッションを持ちます。`group_sessions_per_user: false` なら、その
ルームには Project B の記録が 1 本だけあります。

ここからは、ボットのアカウントを作るところから最初のメッセージを送るところまで、設定の流れを順に見ていきます。

## 手順 1: ボットのアカウントを作る {#step-1-create-a-bot-account}

ボット用の Matrix のユーザーアカウントが要ります。作り方はいくつかあります。

### 方法 A: 自分のホームサーバーで登録する（おすすめ） {#option-a-register-on-your-homeserver-recommended}

自分でホームサーバー（Synapse・Conduit・Dendrite）を動かしている場合です。

1. 管理 API か登録用のツールで新しいユーザーを作ります。

```bash
# Synapse example
register_new_matrix_user -c /etc/synapse/homeserver.yaml http://localhost:8008
```

2. ユーザー名は `hermes` のように決めます。完全なユーザー ID は `@hermes:your-server.org` になります。

### 方法 B: matrix.org などの公開ホームサーバーを使う {#option-b-use-matrixorg-or-another-public-homeserver}

1. [Element Web](https://app.element.io) で新しいアカウントを作ります。
2. ボット用のユーザー名を決めます（たとえば `hermes-bot`）。

### 方法 C: 自分のアカウントをそのまま使う {#option-c-use-your-own-account}

自分のユーザーとして Hermes を動かすこともできます。この場合、ボットは自分名義で発言します。個人用のアシスタントとして使うときに向いています。

## 手順 2: アクセストークンを手に入れる {#step-2-get-an-access-token}

Hermes がホームサーバーで認証するには、アクセストークンが要ります。方法は 2 つあります。

### 方法 A: アクセストークン（おすすめ） {#option-a-access-token-recommended}

もっとも確実な取り方です。

**Element を使う場合:**
1. ボットのアカウントで [Element](https://app.element.io) にログインします。
2. **Settings** → **Help & About** を開きます。
3. 下までスクロールして **Advanced** を開くと、アクセストークンが表示されます。
4. **その場でコピーします。**

**API を使う場合:**

```bash
curl -X POST https://your-server/_matrix/client/v3/login \
  -H "Content-Type: application/json" \
  -d '{
    "type": "m.login.password",
    "user": "@hermes:your-server.org",
    "password": "your-password"
  }'
```

応答に `access_token` の項目が入っています。それをコピーします。

:::warning[アクセストークンは厳重に扱う]
アクセストークンがあれば、ボットの Matrix アカウントを丸ごと操作できます。公開したり Git にコミットしたりしないでください。漏れたときは、そのユーザーの全セッションからログアウトして無効にします。
:::

### 方法 B: パスワードでログインする {#option-b-password-login}

アクセストークンを渡す代わりに、ボットのユーザー ID とパスワードを Hermes に教える方法もあります。Hermes は起動時に自動でログインします。手順は簡単ですが、パスワードが `.env` ファイルに残ります。

```bash
MATRIX_USER_ID=@hermes:your-server.org
MATRIX_PASSWORD=your-password
```

## 手順 3: 自分の Matrix ユーザー ID を調べる {#step-3-find-your-matrix-user-id}

Hermes Agent は、誰がボットとやり取りできるかを Matrix のユーザー ID で制御します。Matrix のユーザー ID は `@username:server` の形です。

自分の ID を調べる手順です。

1. [Element](https://app.element.io)（または普段使っている Matrix のクライアント）を開きます。
2. 自分のアイコン → **Settings** を選びます。
3. プロフィールの一番上にユーザー ID が表示されています（たとえば `@alice:matrix.org`）。

:::tip
Matrix のユーザー ID は必ず `@` で始まり、途中に `:` とサーバー名が入ります。たとえば `@alice:matrix.org`、`@bob:your-server.com` です。
:::

## 手順 4: Hermes Agent を設定する {#step-4-configure-hermes-agent}

### 方法 A: 対話形式で設定する（おすすめ） {#option-a-interactive-setup-recommended}

案内付きの設定コマンドを実行します。

```bash
hermes gateway setup
```

聞かれたら **Matrix** を選び、続けてホームサーバーの URL、アクセストークン（またはユーザー ID とパスワード）、許可するユーザー ID を入力します。

### 方法 B: 手で設定する {#option-b-manual-configuration}

`~/.hermes/.env` ファイルに次を足します。

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

## 非公開で運用するときの守り {#private-deployment-hardening}

非公開の Matrix で運用する場合は、ユーザーとルームの両方に許可リストを設定します。
`MATRIX_ALLOWED_USERS` が未設定だと、ボットが参加しているルームで話しかけられる人は
誰でもエージェントを動かせます。`MATRIX_ALLOWED_ROOMS` が未設定だと、ボットが参加している
どのルームからでもエージェントを動かせます。しっかり閉じた構成では、両方を設定します。

```bash
MATRIX_ALLOWED_USERS=@alice:matrix.example.org,@bob:matrix.example.org
MATRIX_ALLOWED_ROOMS=!ops:matrix.example.org,!dmroom:matrix.example.org
```

ブリッジや appservice を使う構成では、無限ループへの備えがもう一段要ります。Hermes は
自分自身のイベント、ローカル部分が `_` で始まる Matrix の appservice 形式のユーザー、
重複したイベント ID、起動前の古いイベント、編集による差し替えのイベント、そして
`m.notice` のイベントを、既定で常に無視します。ブリッジが別の命名規則を使っている場合は、
その構成に合わせたゴーストユーザーのパターンを足します。

```bash
MATRIX_IGNORE_USER_PATTERNS='^@telegram_,^@slack_,^@whatsapp_'
```

`m.notice` を本当に送る、信頼できる人の運用がある場合にだけ通知を有効にします。

```bash
MATRIX_PROCESS_NOTICES=true
```

ルーム全体への通知の送信は既定で無効です。`@room` で全員を呼び出してよいとはっきり
決めたボットでないかぎり、`MATRIX_ALLOW_ROOM_MENTIONS=false` のままにしてください。

診断とデバッグ用のデータでは、Matrix のアクセストークン・リカバリーキー・
端末の識別子・メッセージ本文は伏せられます。メディアのダウンロードは Matrix の
`mxc://` コンテンツ URI に限られ、`MATRIX_MAX_MEDIA_BYTES` を超えるものは拒否されます。
連合したルームや信頼していないホームサーバーは、信頼できない入力として扱ってください。
ルームの許可リストは絞り、ツールを多用する作業は DM か非公開のルームで行い、
ブリッジのゴーストや appservice の代理ユーザーを許可ユーザーにしないことです。

`~/.hermes/config.yaml` で任意に設定できる項目です。

```yaml
group_sessions_per_user: true
```

- `group_sessions_per_user: true` は、共有ルームの中でも参加者ごとに文脈を分けたままにします

### ゲートウェイを起動する {#start-the-gateway}

設定できたら、Matrix のゲートウェイを起動します。

```bash
hermes gateway
```

数秒でホームサーバーに接続し、同期が始まるはずです。DM でも、参加済みのルームでも構わないので、メッセージを送って試してください。

:::tip
`hermes gateway` はバックグラウンドでも、常時動かすなら systemd のサービスとしても実行できます。詳しくは配備の説明を見てください。
:::

## エンドツーエンド暗号化（E2EE） {#end-to-end-encryption-e2ee}

Hermes は Matrix のエンドツーエンド暗号化に対応しているので、暗号化されたルームでもボットと話せます。

### 必要なもの {#requirements}

E2EE には、暗号化用の追加をそろえた `mautrix` ライブラリと、C 言語のライブラリ `libolm` が要ります。

```bash
# Request the declared Matrix dependencies
python -c "import pm; pm.sync_venv(['matrix'], explicit=True)"
```

`libolm` もシステムに入れておく必要があります。

```bash
# Debian/Ubuntu
sudo apt install libolm-dev

# macOS
brew install libolm

# Fedora
sudo dnf install libolm-devel
```

### E2EE を有効にする {#enable-e2ee}

`~/.hermes/.env` に次を足します。

```bash
MATRIX_E2EE_MODE=required
```

`MATRIX_E2EE_MODE` には次の値を指定できます。

| モード | 動作 |
|------|----------|
| `off` | Matrix の E2EE を初期化しません。 |
| `optional` | 必要なものがそろっていれば E2EE を試し、暗号処理を初期化できなくても暗号化していないルームは動かし続けます。 |
| `required` | E2EE に必要なものや暗号処理の準備が整わないときは、動かさずに止まります。 |

optional モードは、暗号処理の準備ができないときに E2EE なしの動作へ戻ることがあります。required モードは黙って格下げせず、動かさずに止まります。

以前との互換のため、`MATRIX_ENCRYPTION=true` でも required と同じ E2EE の動作になります。

E2EE が有効なとき、Hermes は次のように動きます。

- 暗号鍵を `~/.hermes/platforms/matrix/store/` に保存します（古い構成では `~/.hermes/matrix/store/`）
- 最初の接続時に端末の鍵をアップロードします
- 受信したメッセージを復号し、送信するメッセージを自動で暗号化します
- 招待されたら、暗号化されたルームにも自動で参加します

### Matrix 用のツールと操作 {#matrix-tools-and-controls}

Hermes は Matrix 専用のエージェント用ツール（ルームの作成、招待、メッセージの取り消しなど）を渡しません。エージェントは通常のメッセージの配信を通して Matrix とやり取りします。アダプターは内部でリアクションと取り消しを使い、承認の確認や選択肢の表示を実現しています。

`MATRIX_ALLOWED_ROOMS` を設定している場合、Hermes はそのルームでだけ応答します（DM は対象外です）。

リアクションによる操作は次のとおりです。

- ✅ 今回だけ許可
- ♾️ 以後はいつも許可
- ❌ 拒否
- `/model` の選択肢には数字のリアクション

ルームにいる許可済みの Matrix ユーザーなら誰でも承認やモデル選択の画面を操作してよい、と意図して決めた場合は `MATRIX_APPROVAL_REQUIRE_SENDER=false` を設定します。既定では、誰がその操作を求めたか Hermes が分かっている場合、その本人に限られます。

### メディアの上限 {#media-limits}

Hermes は Matrix のメディア API を通じて、画像・ファイル・音声・動画をアップロードし、ダウンロードします。生成した画像が複数あるときは、順序を保った 1 つのまとまりとして送り、まとまり全体で説明文とスレッドの文脈を保ちます。

既定では、100 MB を超える Matrix のメディアはアップロードやダウンロードの前に拒否されます。変えたいときは次のようにします。

```bash
MATRIX_MAX_MEDIA_BYTES=104857600
```

受信するメディアは Matrix の `mxc://` コンテンツ URI である必要があります。連合したルームが
何でも落としてくる装置に変わってしまわないよう、Hermes は Matrix のイベントに含まれる
任意の HTTP(S) のメディア URL を拒否します。

### クロス署名による確認（おすすめ） {#cross-signing-verification-recommended}

Matrix のアカウントでクロス署名が有効な場合（Element では既定で有効です）、リカバリーキーを設定しておくと、ボットが起動時に自分の端末へ署名できます。これをしないと、端末の鍵が入れ替わったあと、ほかの Matrix のクライアントがボットと暗号セッションを共有してくれないことがあります。

```bash
MATRIX_RECOVERY_KEY=EsT... your recovery key here
```

**どこにあるか:** Element では **Settings** → **Security & Privacy** → **Encryption** と進んだ先のリカバリーキー（「Security Key」とも呼ばれます）です。クロス署名を最初に設定したときに、保存するよう促されたあの鍵です。

`MATRIX_RECOVERY_KEY` が設定されていると、Hermes は起動のたびにホームサーバーの安全な保管領域からクロス署名の鍵を取り込み、いま使っている端末に署名します。何度実行しても結果は同じなので、常に有効にしたままで問題ありません。

Hermes が新しい Matrix のリカバリーキーを作る場合でも、鍵そのものをログに出すことはありません。
起動前に `MATRIX_RECOVERY_KEY_OUTPUT_FILE=/secure/path/matrix-recovery-key.txt` を設定すると、
生成した鍵をファイルモード `0600` で一度だけ書き出します。すでにファイルがある場合は上書きしません。

:::warning[暗号ストアを消してしまったとき]
`~/.hermes/platforms/matrix/store/crypto.db` を消すと、ボットは暗号上の身元を失います。同じ端末 ID のまま再起動しても、それだけでは**元に戻りません**。ホームサーバー側には古い身元鍵で署名されたワンタイムキーが残っており、相手は新しい Olm セッションを張れないからです。

Hermes は起動時にこの状態を見つけると E2EE を有効にせず、`device XXXX has stale one-time keys on the server signed with a previous identity key` とログに出します。

**いちばん簡単な戻し方は、新しいアクセストークンを発行することです**（古い鍵の履歴を持たない新しい端末 ID が割り当てられます）。後述の「E2EE を使っていた前の版から上げる」の節を見てください。これがもっとも確実で、ホームサーバーのデータベースに触らずに済みます。

**手作業で戻す方法**（上級者向け。端末 ID はそのままです）:

1. Synapse を止め、データベースから古い端末を消します。
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
   Synapse の管理 API を使う方法もあります（ユーザー ID が URL エンコードされている点に注意してください）。
   ```bash
   curl -X DELETE -H "Authorization: Bearer ADMIN_TOKEN" \
     'https://your-server/_synapse/admin/v2/users/%40hermes%3Ayour-server/devices/DEVICE_ID'
   ```
   注意: 管理 API で端末を消すと、結び付いていたアクセストークンも無効になることがあります。そのあと新しいトークンを発行する必要が出るかもしれません。

2. ローカルの暗号ストアを消して Hermes を再起動します。
   ```bash
   rm -f ~/.hermes/platforms/matrix/store/crypto.db*
   # restart hermes
   ```

ほかの Matrix のクライアント（Element、matrix-commander）は古い端末の鍵を持ち続けていることがあります。復旧したあと、Element で `/discardsession` と入力すると、ボットとの暗号セッションを張り直せます。
:::

:::info
`mautrix[encryption]` が入っていない、または `libolm` が見当たらない場合、ボットは自動で暗号化なしのクライアントに切り替わります。ログに警告が出ます。
:::

## ホームルーム {#home-room}

ボットが自分から送るメッセージ（cron ジョブの結果・リマインダー・通知など）の宛先として、「ホームルーム」を決められます。設定の仕方は 2 つあります。

### スラッシュコマンドを使う {#using-the-slash-command}

ボットがいる Matrix のルームで `/sethome` と入力します。そのルームがホームルームになります。
Matrix のクライアントがスラッシュコマンドを横取りする場合は、代わりに `!sethome` と入力します。

### 手で設定する {#manual-configuration}

`~/.hermes/.env` に次を足します。

```bash
MATRIX_HOME_ROOM=!abc123def456:matrix.example.org
```

## ルームの許可リスト（`allowed_rooms`） {#room-allowlist-allowedrooms}

ボットが応答する Matrix のルームを、決まった集合に絞ります。設定すると、ボットは ID がリストにあるルームで**だけ**応答します。ほかのルームからのメッセージは、たとえメンションされていても黙って無視されます。

**DM（1 対 1 のルーム）はこの絞り込みの対象外**なので、許可されている利用者はいつでも 1 対 1 でボットに届きます。

```yaml
matrix:
  allowed_rooms:
    - "!abc123def456:matrix.example.org"
    - "!opsroom789:matrix.example.org"
```

環境変数で書く場合はカンマ区切りです。

```bash
MATRIX_ALLOWED_ROOMS="!abc123def456:matrix.example.org,!opsroom789:matrix.example.org"
```

動作は次のとおりです。

- 空、または未設定 → 制限なし（既定）。
- 中身がある → ルーム ID がリストにある必要があります。この確認は、ほかのどの条件（メンションの要否、送信者の許可リストなど）よりも**先に**行われます。
- ルームの別名（`#room:server`）ではなく、**内部 ID**（`!abc...:server`）を使います。内部 ID は Element の ルーム → Settings → Advanced で確認できます。

あわせて読む: [管理者と利用者のスラッシュコマンドの分け方](/hermes/docs/reference/slash-commands/#permissions-and-adminuser-split)。

:::tip
ルーム ID の調べ方: Element でそのルームを開き、**Settings** → **Advanced** と進むと **Internal room ID** が表示されます（`!` で始まります）。
:::

## Matrix でのコマンド {#commands-in-matrix}

Hermes は、ほかのメッセージ用のプラットフォームで使えるゲートウェイのコマンドを
Matrix でも同じように使えます。`/commands`・`/model`・`/stop`・`/queue`・
`/steer`・`/goal`・`/subgoal`・`/bg`・`/btw`・`/tasks`・
`/yolo` などです。

Matrix のクライアントによっては、先頭の `/` を自分のローカルなコマンド用に押さえていて、
知らないスラッシュコマンドをルームへ送ってくれないことがあります。その場合は、Matrix でも
安全な別名として `!` を使います。

```text
!commands
!model
!model gpt-5.5 --provider openrouter
!queue continue with the next task
!stop
```

Hermes が `!command` を読み替えるのは、そのコマンドがゲートウェイの既知のもの、
登録済みのプラグインのコマンド、または導入済みのスキルのコマンドである場合だけです。
`!important` のような普通の感嘆表現は、そのまま普通のメッセージとして扱われます。

## うまくいかないとき {#troubleshooting}

### ボットがメッセージに応答しない {#bot-is-not-responding-to-messages}

**原因**: ボットがルームに参加していない、`MATRIX_ALLOWED_USERS` に自分のユーザー ID が入っていない、`MATRIX_ALLOWED_ROOMS` にそのルームが入っていない、またはルームのメッセージでボットをメンションしていない、のいずれかです。

**対処**: ボットをルームに招待します。招待すれば自動で参加します。自分のユーザー ID が `MATRIX_ALLOWED_USERS` にあるか（`@user:server` の完全な形で）、許可リストを使っているならルーム ID が `MATRIX_ALLOWED_ROOMS` にあるかを確かめます。ルームではボットをメンションするか、そのルームを `MATRIX_FREE_RESPONSE_ROOMS` に足します。そのうえでゲートウェイを再起動します。

### ルームには参加するのに、すべてのメッセージを黙って捨てる（時計のずれ） {#bot-joins-rooms-but-silently-drops-every-message-clock-skew}

**原因**: 動かしている機械のシステム時計が実際の時刻より進んでいます。Matrix のアダプターは、最初の同期で再送されるイベントを無視するために、起動時から 5 秒の猶予による絞り込み（`event_ts < startup_ts - 5`）をかけます。時計が進んでいると、受信するイベントがすべて「起動より古い」と見えてしまい、メッセージの処理に届く前に捨てられます。ボットはつながっているのに、いつまでも返事をしません。[#12614](https://github.com/NousResearch/hermes-agent/issues/12614) を見てください。

**現れ方**: ゲートウェイのログに `Matrix: dropped N live events as 'too old' more than 30s after startup` が出ます。

**対処**: NTP で機械の時計を合わせ、ボットを再起動します。

```bash
# Debian/Ubuntu
sudo timedatectl set-ntp true
timedatectl status   # confirm "System clock synchronized: yes"

# macOS
sudo sntp -sS time.apple.com
```

### 起動時に "Failed to authenticate" や "whoami failed" が出る {#failed-to-authenticate-whoami-failed-on-startup}

**原因**: アクセストークンかホームサーバーの URL が間違っています。

**対処**: `MATRIX_HOMESERVER` が自分のホームサーバーを指しているか確かめます（`https://` を付け、末尾のスラッシュは付けません）。`MATRIX_ACCESS_TOKEN` が有効かどうかは curl で試せます。

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-server/_matrix/client/v3/account/whoami
```

自分のユーザー情報が返れば、トークンは有効です。エラーが返るなら、新しいトークンを発行します。

### "mautrix not installed" というエラー {#mautrix-not-installed-error}

**原因**: Python のパッケージ `mautrix` が入っていません。

**対処**: 入れます。

```bash
python -c "import pm; pm.sync_venv(['matrix'], explicit=True)"
```

Hermes の追加としてまとめて入れる方法もあります。

```bash
cd ~/.hermes/hermes-agent && python -c "import pm; pm.sync_venv(['matrix'], explicit=True)"
```

### 暗号化のエラー、または "could not decrypt event" {#encryption-errors-could-not-decrypt-event}

**原因**: 暗号鍵が足りない、`libolm` が入っていない、またはボットの端末が信頼されていません。

**対処**:
1. `libolm` がシステムに入っているか確かめます（前述の E2EE の節を見てください）。
2. `.env` に `MATRIX_ENCRYPTION=true` が設定されているか確かめます。
3. Matrix のクライアント（Element）でボットのプロフィール → Sessions と進み、ボットの端末を確認・信頼します。
4. ボットが暗号化されたルームに参加したばかりの場合、復号できるのは参加した*あと*のメッセージだけです。それより前のものは読めません。

### E2EE を使っていた前の版から上げる {#upgrading-from-a-previous-version-with-e2ee}

:::tip
`crypto.db` も手で消してしまった場合は、前述の E2EE の節にある「暗号ストアを消してしまったとき」の警告を見てください。ホームサーバーに残った古いワンタイムキーを片づける手順が追加で要ります。
:::

以前 `MATRIX_ENCRYPTION=true` で Hermes を使っていて、SQLite ベースの新しい暗号ストアを
使う版に上げた場合、ボットの暗号上の身元が変わっています。Matrix のクライアント（Element）は
古い端末の鍵を持ち続けていて、ボットと暗号セッションを共有してくれないことがあります。

**現れ方**: ボットは接続し、ログには "E2EE enabled" と出るのに、すべての
メッセージが "could not decrypt event" になり、ボットはいつまでも応答しません。

**何が起きているか**: 以前の `matrix-nio` や、直列化にもとづく `mautrix` のバックエンドが
持っていた古い暗号の状態が、新しい SQLite の暗号ストアと噛み合っていません。ボットは
新しい暗号上の身元を作りますが、Matrix のクライアント側には古い鍵が残っており、鍵が
変わった端末にはルームの暗号セッションを渡しません。これは Matrix の安全のための
仕組みです。同じ端末なのに身元鍵が変わることを、クライアントは怪しい兆候として扱います。

**対処**（一度きりの移行作業）:

1. **新しいアクセストークンを発行して**、新しい端末 ID を得ます。いちばん簡単なのは次の方法です。

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

   返ってきた `access_token` をコピーし、`~/.hermes/.env` の `MATRIX_ACCESS_TOKEN` を書き換えます。

2. **古い暗号の状態を消します**。

   ```bash
   rm -f ~/.hermes/platforms/matrix/store/crypto.db
   rm -f ~/.hermes/platforms/matrix/store/crypto_store.*
   ```

3. **リカバリーキーを設定します**（クロス署名を使っている場合。Element の利用者はたいてい使っています）。`~/.hermes/.env` に次を足します。

   ```bash
   MATRIX_RECOVERY_KEY=EsT... your recovery key here
   ```

   これでボットは起動時にクロス署名の鍵で自分に署名でき、Element は新しい端末をすぐ信頼します。これがないと、Element は新しい端末を未確認と見なし、暗号セッションを共有しないことがあります。リカバリーキーは Element の **Settings** → **Security & Privacy** → **Encryption** で確認できます。

4. **Matrix のクライアント側で暗号セッションを張り直させます**。Element では、
   ボットとの DM のルームを開いて `/discardsession` と入力します。これで Element は
   新しい暗号セッションを作り、ボットの新しい端末と共有します。

5. **ゲートウェイを再起動します**。

   ```bash
   hermes gateway run
   ```

   `MATRIX_RECOVERY_KEY` を設定していれば、ログに `Matrix: cross-signing verified via recovery key` と出るはずです。

6. **新しいメッセージを送ります**。ボットが復号して、いつもどおり応答するはずです。

:::note
移行のあとは、上げる*前*に送られたメッセージは復号できません。古い暗号鍵が
なくなっているためです。影響を受けるのは移行の前後だけで、新しいメッセージは
これまでどおり動きます。
:::

:::tip
**新しく入れた場合は関係ありません。** この移行が要るのは、前の版の Hermes で E2EE を
動かしていて、そこから上げる場合だけです。

**なぜ新しいアクセストークンが要るのか。** Matrix のアクセストークンは、それぞれ特定の
端末 ID に結び付いています。同じ端末 ID のまま暗号鍵だけ新しくすると、ほかの Matrix の
クライアントはその端末を信頼しなくなります（身元鍵が変わることを、安全を脅かす兆候と
見なすためです）。新しいアクセストークンなら、古い鍵の履歴を持たない新しい端末 ID が
割り当てられるので、ほかのクライアントはすぐに信頼してくれます。
:::

## プロキシモード（macOS での E2EE） {#proxy-mode-e2ee-on-macos}

`matrix` の追加は Linux 限定になっています。macOS や Windows では、Matrix の
アダプターと暗号化の依存パッケージを Linux のコンテナで動かし、リクエストを
その端末で直接動くエージェントへ転送します。下の例は macOS をホストにしたものです。Windows でも、
対応するホストのアドレスと認証を使えば、同じように分けて動かせます。

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

Docker のコンテナが担うのは Matrix のやり取りと E2EE だけです。メッセージが届くと復号し、その本文を普通の HTTP リクエストでホストへ渡します。ホスト側でエージェントが動き、ツールを呼び、応答を作って流し返します。コンテナはそれを暗号化して Matrix へ送ります。セッションはすべて 1 つにまとまっているので、CLI・Matrix・Telegram など、どのプラットフォームからでも同じ記憶と会話の履歴を共有します。

### 手順 1: ホスト側（macOS）を設定する {#step-1-configure-the-host-macos}

Docker のコンテナからの要求をホストが受け取れるよう、API サーバーを有効にします。

`~/.hermes/.env` に次を足します。

```bash
API_SERVER_ENABLED=true
API_SERVER_KEY=your-secret-key-here
API_SERVER_HOST=0.0.0.0
```

- `API_SERVER_HOST=0.0.0.0` は全インターフェースで待ち受けるので、Docker のコンテナから届きます。
- ループバック以外で待ち受けるには `API_SERVER_KEY` が要ります。推測されにくい長い文字列にしてください。
- API サーバーは既定でポート 8642 を使います（変えたいときは `API_SERVER_PORT` で指定します）。

ゲートウェイを起動します。

```bash
hermes gateway
```

設定済みのほかのプラットフォームと並んで、API サーバーが立ち上がるのが見えるはずです。仮想マシンから届くか確かめます。

```bash
# From the Linux VM
curl http://<mac-ip>:8642/health
```

### 手順 2: Docker のコンテナ（Linux の仮想マシン）を設定する {#step-2-configure-the-docker-container-linux-vm}

コンテナに要るのは Matrix の認証情報と転送先の URL です。LLM の API キーは要りません。

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

リポジトリの [Docker ビルド](/hermes/docs/user-guide/docker/)を使ってください。対応する Linux の環境では、
Matrix の追加と必要なネイティブライブラリが含まれています。
封をしたイメージに、実行中に依存パッケージを入れないでください。コンテナに要るのは
Matrix の認証情報とプロキシへのアクセスで、推論を提供するサービスの API キーは要りません。

### 手順 3: 両方を起動する {#step-3-start-both}

1. 先にホスト側のゲートウェイを起動します。
   ```bash
   hermes gateway
   ```

2. 次に Docker のコンテナを起動します。
   ```bash
   docker compose up -d
   ```

3. 暗号化された Matrix のルームでメッセージを送ります。コンテナが復号してホストへ渡し、応答を流し返します。

### 設定の早見表 {#configuration-reference}

プロキシモードは**コンテナ側**（薄いゲートウェイ）で設定します。

| 設定 | 説明 |
|---------|-------------|
| `GATEWAY_PROXY_URL` | 転送先の Hermes API サーバーの URL（たとえば `http://192.168.1.100:8642`） |
| `GATEWAY_PROXY_KEY` | 認証に使うベアラートークン（ホスト側の `API_SERVER_KEY` と一致させます） |
| `gateway.proxy_url` | `GATEWAY_PROXY_URL` と同じものを `config.yaml` に書く場合 |

ホスト側に要るのは次の設定です。

| 設定 | 説明 |
|---------|-------------|
| `API_SERVER_ENABLED` | `true` にします |
| `API_SERVER_KEY` | ベアラートークン（コンテナと共有します） |
| `API_SERVER_HOST` | ネットワークから届くようにするには `0.0.0.0` にします |
| `API_SERVER_PORT` | ポート番号（既定は `8642`） |

### どのプラットフォームでも使える {#works-for-any-platform}

プロキシモードは Matrix だけのものではありません。どのプラットフォームのアダプターでも使えます。任意のゲートウェイで `GATEWAY_PROXY_URL` を設定すれば、手元でエージェントを動かす代わりに、離れたエージェントへ転送します。ネットワークの分離・E2EE の都合・資源の制約など、プラットフォームのアダプターをエージェントとは別の環境で動かしたいときに役立ちます。

:::tip
セッションのつながりは `X-Hermes-Session-Id` ヘッダーで保たれます。ホスト側の API サーバーはこの ID でセッションを見分けるので、手元でエージェントを動かしているときと同じように、メッセージをまたいで会話が続きます。
:::

:::note
**できないこと（v1）:** 離れたエージェント側のツールの進捗メッセージは中継されません。利用者に見えるのは流れてくる最終的な応答だけで、個々のツールの呼び出しは見えません。危険なコマンドの承認を求める画面はホスト側で処理され、Matrix の利用者には渡りません。これらは今後の更新で扱えるようにできます。
:::

### 接続して送信もできるのに、受信したメッセージを無視する {#bot-connects-and-sends-but-ignores-inbound-messages}

**原因**: Matrix のイベント処理は、同期のデータが mautrix の `handle_sync()` の仕組みを
通って配られたときにだけ動きます。`handle_sync()` を呼ばないまま素の `client.sync()` で
問い合わせ続けると、アダプターはつながったまま（送信はできる）なのに、受信した
メッセージが `_on_room_message` まで届かない、という状態になります。

**対処**: Hermes は明示的な同期のループを使い、最初の同期でも、その後の差分の同期でも
`client.handle_sync()` を呼びます。これは上流の issue #7914 とクローズされた PR #37807 の
診断に沿ったものですが、全体の管理を `client.start()` に任せてしまうのではなく、Hermes 自身の
裏方の処理（参加中のルームの把握・招待の処理・E2EE の鍵の共有）は残しています。ゲートウェイを
再起動しても受信がうまくいかない場合は、最初の同期より前に処理が登録されているかを確かめ、
ログに `sync event dispatch error` が出ていないか見てください。

### 同期がうまくいかない、ボットが遅れる {#sync-issues-bot-falls-behind}

**原因**: 時間のかかるツールの実行が同期のループを遅らせているか、ホームサーバーが遅くなっています。

**対処**: 同期のループはエラーが起きると 5 秒ごとに自動でやり直します。Hermes のログで同期まわりの警告を確かめてください。いつも遅れるようなら、ホームサーバーの資源が足りているか見直します。

### ボットがオフラインになっている {#bot-is-offline}

**原因**: Hermes のゲートウェイが動いていないか、接続に失敗しています。

**対処**: `hermes gateway` が動いているか確かめます。端末の出力にエラーが出ていないか見てください。よくあるのは、ホームサーバーの URL の誤り、アクセストークンの期限切れ、ホームサーバーに届かない、といったところです。

### "User not allowed" と言われる、またはボットに無視される {#user-not-allowed-bot-ignores-you}

**原因**: 自分のユーザー ID が `MATRIX_ALLOWED_USERS` に入っていません。

**対処**: `~/.hermes/.env` の `MATRIX_ALLOWED_USERS` に自分のユーザー ID を足し、ゲートウェイを再起動します。`@user:server` の完全な形で書いてください。

### ルームごと無視される {#bot-ignores-an-entire-room}

**原因**: `MATRIX_ALLOWED_ROOMS` が設定されていて今のルーム ID が入っていないか、そのルームがメンションを必要としていてメッセージがボットをメンションしていません。

**対処**: そのルーム ID を `MATRIX_ALLOWED_ROOMS` に足すか、個人で使っているなら許可リスト自体を外します。Element でルーム ID を調べるには、ルームの設定を開いて **Advanced** を見てください。

### ブリッジ経由のメッセージがループする、こだまする {#bridge-messages-loop-or-echo}

**原因**: ブリッジや appservice の代理ユーザーが、ボットの出力を新しい利用者のメッセージとして送り返しているか、ブリッジが標準的でないゴーストユーザーの ID を使っています。

**対処**: ブリッジのゴーストを `MATRIX_ALLOWED_USERS` に入れないこと、合致する `MATRIX_IGNORE_USER_PATTERNS` を足すこと、そして通知が信頼できる運用の一部でないかぎり `MATRIX_PROCESS_NOTICES=false` のままにすることです。

## 安全のために {#security}

:::warning
`MATRIX_ALLOWED_USERS` は必ず設定してください。共有や非公開の構成では `MATRIX_ALLOWED_ROOMS` も設定します。これらがないと、ボットが参加しているルームで話しかけられる人は誰でもエージェントを動かせてしまいます。許可するのは信頼できる人とルームだけにしてください。許可された利用者は、ツールの実行やシステムへの操作を含め、エージェントのできることすべてに手が届きます。
:::

Hermes Agent の構成をより安全にする方法は、[安全のための手引き](/hermes/docs/user-guide/security/)を見てください。

## 覚えておくこと {#notes}

- **どのホームサーバーでも**: Synapse・Conduit・Dendrite・matrix.org のほか、仕様に沿った Matrix のホームサーバーなら何でも動きます。特定のホームサーバーのソフトウェアは要りません。
- **連合**: 連合したホームサーバーを使っているなら、ボットは別のサーバーの利用者ともやり取りできます。`@user:server` の完全な ID を `MATRIX_ALLOWED_USERS` に足すだけです。
- **自動参加**: ボットはルームへの招待を自動で受け入れて参加します。参加した直後から応答を始めます。
- **メディアへの対応**: Hermes は画像・音声・動画・添付ファイルを送受信できます。メディアは Matrix のコンテンツリポジトリ API を使って、自分のホームサーバーへアップロードされます。
- **本来の音声メッセージ（MSC3245）**: Matrix のアダプターは、送信する音声メッセージに `org.matrix.msc3245.voice` の印を自動で付けます。そのため、読み上げの応答や音声は、Element をはじめ MSC3245 に対応するクライアントでは、ただの音声ファイルの添付ではなく**本来の音声メッセージの吹き出し**として表示されます。MSC3245 の印が付いた受信の音声メッセージも正しく見分けられ、音声から文字起こしする処理へ回されます。設定は要りません。自動でそう動きます。ただし、`MEDIA:` タグで添付した音声ファイル（エージェントが作った `.mp3`/`.wav` で、`[[audio_as_voice]]` の印がないもの）は、音声メッセージの吹き出しではなく、元の形式のままふつうの `m.audio` の添付として送られます。
