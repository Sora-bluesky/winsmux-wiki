---
title: "DingTalk"
description: "Hermes Agent を DingTalk のチャットボットとして設定する"
upstream_path: user-guide/messaging/dingtalk.md
upstream_blob: 72ec3f2eadc0a5c50b30fce8fc341157cda28df4
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/dingtalk
---

# DingTalk の設定 {#dingtalk-setup}

Hermes Agent は DingTalk（钉钉）とチャットボットとして連携し、ダイレクトメッセージやグループチャットから AI アシスタントと話せるようにします。ボットがつながるのは DingTalk の Stream Mode で、これは長くつなぎっぱなしにする WebSocket の接続です。公開 URL も webhook 用のサーバーも要りません。返事は DingTalk のセッション webhook API を通して、markdown で整形されたメッセージとして届きます。

設定に入る前に、たいていの人がまず知りたいところから見ていきます。DingTalk のワークスペースに入れたあと、Hermes がどう振る舞うかです。

## Hermes の振る舞い {#how-hermes-behaves}

| 場面 | 挙動 |
|---------|----------|
| **DM（1 対 1 のチャット）** | すべてのメッセージに応答します。`@mention` は不要です。DM ごとに別々のセッションになります。 |
| **グループチャット** | `@mention` されたときに応答します。メンションがなければ、そのメッセージは無視します。 |
| **複数の人がいる共有グループ** | 既定では、グループの中でも利用者ごとにセッション履歴を分けます。同じグループで話している 2 人の会話記録は、明示的に切らないかぎり混ざりません。 |

### DingTalk でのセッションの考え方 {#session-model-in-dingtalk}

既定では次のようになります。

- DM ごとに専用のセッションが作られます
- 共有グループチャットでは、その中で利用者ごとに専用のセッションが作られます

この挙動は `config.yaml` で決まります。

```yaml
group_sessions_per_user: true
```

グループ全体でひとつの会話にまとめたいと自分ではっきり決めたときだけ、`false` にしてください。

```yaml
group_sessions_per_user: false
```

このガイドでは、DingTalk のボットを作るところから最初のメッセージを送るところまで、設定の全体を順に見ていきます。

## 前提条件 {#prerequisites}

必要な Python パッケージをインストールします。

```bash
cd ~/.hermes/hermes-agent && uv pip install -e ".[dingtalk]"
```

個別に入れる場合は次のとおりです。

```bash
pip install dingtalk-stream httpx alibabacloud-dingtalk
```

- `dingtalk-stream` — Stream Mode（WebSocket によるリアルタイムのやり取り）のための DingTalk 公式 SDK
- `httpx` — セッション webhook 経由で返信を送るために使う、非同期の HTTP クライアント
- `alibabacloud-dingtalk` — AI カード、絵文字リアクション、メディアのダウンロードに使う DingTalk OpenAPI の SDK

## ステップ 1: DingTalk のアプリを作成する {#step-1-create-a-dingtalk-app}

1. [DingTalk 開発者コンソール](https://open-dev.dingtalk.com/)を開きます。
2. DingTalk の管理者アカウントでログインします。
3. **Application Development** → **Custom Apps** → **Create App via H5 Micro-App**（コンソールの版によっては **Robot**）をクリックします。
4. 次を入力します。
   - **App Name**: 例として `Hermes Agent`
   - **Description**: 任意です
5. 作成が終わったら **Credentials & Basic Info** へ進み、**Client ID**（AppKey）と **Client Secret**（AppSecret）を見つけます。両方をコピーしておきます。

:::warning[認証情報は一度しか表示されません]
Client Secret はアプリを作ったときに一度だけ表示されます。なくしてしまったら作り直すしかありません。この認証情報は絶対に公開したり Git にコミットしたりしないでください。
:::

## ステップ 2: ロボット機能を有効にする {#step-2-enable-the-robot-capability}

1. アプリの設定ページで **Add Capability** → **Robot** へ進みます。
2. ロボット機能を有効にします。
3. **Message Reception Mode** で **Stream Mode** を選びます（公開 URL が要らないので、こちらがおすすめです）。

:::tip
Stream Mode がおすすめの構成です。自分のマシンから張る、長くつなぎっぱなしの WebSocket 接続を使うので、グローバル IP もドメイン名も webhook のエンドポイントも要りません。NAT やファイアウォールの内側でも、手元のマシンでも動きます。
:::

## ステップ 3: 自分の DingTalk ユーザー ID を調べる {#step-3-find-your-dingtalk-user-id}

Hermes Agent は、誰がボットを使えるかを DingTalk のユーザー ID で管理します。DingTalk のユーザー ID は、組織の管理者が決める英数字の文字列です。

自分の ID を調べるには次のようにします。

1. DingTalk の組織管理者に尋ねます。ユーザー ID は DingTalk の管理コンソールの **Contacts** → **Members** で設定されています。
2. あるいは、ボットは受信したメッセージごとに `sender_id` をログに残します。ゲートウェイを起動してボットにメッセージを送り、ログから自分の ID を探してください。

## ステップ 4: Hermes Agent を設定する {#step-4-configure-hermes-agent}

### 方法 A: 対話式のセットアップ（おすすめ） {#option-a-interactive-setup-recommended}

案内付きのセットアップコマンドを実行します。

```bash
hermes gateway setup
```

聞かれたら **DingTalk** を選びます。セットアップウィザードでは、2 つの経路のどちらかで認可できます。

- **QR コードによるデバイスフロー（おすすめ）。** 端末に表示される QR を DingTalk のモバイルアプリで読み取ると、Client ID と Client Secret が自動で返ってきて `~/.hermes/.env` に書き込まれます。開発者コンソールへ行く必要はありません。
- **手で貼り付ける。** すでに認証情報がある場合や、QR を読み取るのが面倒な場合は、Client ID、Client Secret、許可するユーザー ID を聞かれた順に貼り付けます。

:::note openClaw の表示について
DingTalk の `verification_uri_complete` は API の層で openClaw の名義に固定されているため、Alibaba / DingTalk-Real-AI がサーバー側に Hermes 専用のテンプレートを登録するまで、QR は `openClaw` という送信元の文字列で認可されます。これは DingTalk が同意画面をどう見せるかという話だけで、作られるボットは完全にあなたのもので、自分のテナントの中に閉じています。
:::

### 方法 B: 手で設定する {#option-b-manual-configuration}

`~/.hermes/.env` ファイルに次を追記します。

```bash
# Required
DINGTALK_CLIENT_ID=your-app-key
DINGTALK_CLIENT_SECRET=your-app-secret

# Security: restrict who can interact with the bot
DINGTALK_ALLOWED_USERS=user-id-1

# Multiple allowed users (comma-separated)
# DINGTALK_ALLOWED_USERS=user-id-1,user-id-2

# Optional: group-chat gating (mirrors Slack/Telegram/Discord/WhatsApp)
# DINGTALK_REQUIRE_MENTION=true
# DINGTALK_FREE_RESPONSE_CHATS=cidABC==,cidDEF==
# DINGTALK_MENTION_PATTERNS=^小马
# DINGTALK_HOME_CHANNEL=cidXXXX==
# DINGTALK_ALLOW_ALL_USERS=true
```

`~/.hermes/config.yaml` で設定できる、任意の振る舞いの調整は次のとおりです。

```yaml
group_sessions_per_user: true

gateway:
  platforms:
    dingtalk:
      extra:
        # Require @mention in groups before the bot replies (parity with Slack/Telegram/Discord).
        # DMs ignore this — the bot always replies in 1:1 chats.
        require_mention: true

        # Per-platform allowlist. When set, only these DingTalk user IDs can interact with the bot
        # (same semantics as DINGTALK_ALLOWED_USERS, but scoped here instead of in .env).
        allowed_users:
          - user-id-1
          - user-id-2
```

- `group_sessions_per_user: true` にすると、共有グループチャットの中でも参加者ごとに文脈が分かれたままになります
- `require_mention: true` にすると、ボットがグループのすべてのメッセージに反応しなくなり、@ で名前を呼ばれたときだけ答えます
- `dingtalk.extra` の下の `allowed_users` は `DINGTALK_ALLOWED_USERS` の代わりに使えます。どちらか一方を設定してください（両方を設定した場合、認可されるのは両方の一覧に入っている利用者だけです）

### ゲートウェイを起動する {#start-the-gateway}

設定が終わったら、DingTalk のゲートウェイを起動します。

```bash
hermes gateway
```

数秒のうちに DingTalk の Stream Mode へつながるはずです。DM か、ボットを追加したグループでメッセージを送って試してみてください。

:::tip
`hermes gateway` はバックグラウンドで動かしたり、systemd のサービスとして常時稼働させたりできます。詳しくはデプロイのドキュメントを見てください。
:::

## 機能 {#features}

### AI カード {#ai-cards}

Hermes は素の markdown メッセージの代わりに、DingTalk の AI カードで返事をすることもできます。カードは表示が豊かで構造も整っていて、エージェントが答えを組み立てていく途中の更新も流せます。

AI カードを使うには、`config.yaml` にカードテンプレートの ID を設定します。

```yaml
platforms:
  dingtalk:
    enabled: true
    extra:
      card_template_id: "your-card-template-id"
```

カードテンプレートの ID は、DingTalk 開発者コンソールのアプリの AI カード設定にあります。AI カードを有効にすると、すべての返信がカードとして送られ、本文が少しずつ更新されていきます。

### 絵文字リアクション {#emoji-reactions}

Hermes は処理の状況を示すために、あなたのメッセージへ自動で絵文字リアクションを付けます。

- 🤔Thinking — ボットがメッセージの処理を始めたときに付きます
- 🥳Done — 返答が終わったときに付きます（Thinking のリアクションと入れ替わります）

このリアクションは DM でもグループチャットでも働きます。

### 表示の設定 {#display-settings}

DingTalk の表示のしかたは、ほかのプラットフォームとは切り離して調整できます。

```yaml
display:
  platforms:
    dingtalk:
      show_reasoning: false   # Show model reasoning/thinking in replies
      streaming: true         # Enable streaming responses (works with AI Cards)
      tool_progress: all      # Show tool execution progress (all/new/off)
      interim_assistant_messages: true  # Show intermediate commentary messages
```

ツールの進捗や途中のメッセージを消して、すっきり見せたい場合は次のようにします。

```yaml
display:
  platforms:
    dingtalk:
      tool_progress: off
      interim_assistant_messages: false
```

## 困ったときは {#troubleshooting}

### ボットがメッセージに応答しない {#bot-is-not-responding-to-messages}

**原因**: ロボット機能が有効になっていないか、`DINGTALK_ALLOWED_USERS` に自分のユーザー ID が入っていません。

**対処**: アプリの設定でロボット機能が有効か、Stream Mode が選ばれているかを確かめます。自分のユーザー ID が `DINGTALK_ALLOWED_USERS` にあるかも確認して、ゲートウェイを再起動してください。

### 「dingtalk-stream not installed」というエラー {#dingtalk-stream-not-installed-error}

**原因**: Python パッケージの `dingtalk-stream` が入っていません。

**対処**: インストールします。

```bash
pip install dingtalk-stream httpx
```

### 「DINGTALK_CLIENT_ID and DINGTALK_CLIENT_SECRET required」 {#dingtalkclientid-and-dingtalkclientsecret-required}

**原因**: 認証情報が環境や `.env` ファイルに設定されていません。

**対処**: `~/.hermes/.env` の `DINGTALK_CLIENT_ID` と `DINGTALK_CLIENT_SECRET` が正しく設定されているか確かめます。Client ID は DingTalk 開発者コンソールの AppKey、Client Secret は AppSecret です。

### 接続が切れる / 再接続を繰り返す {#stream-disconnects-reconnection-loops}

**原因**: ネットワークが不安定、DingTalk 側のメンテナンス、あるいは認証情報の問題です。

**対処**: アダプターは待ち時間を延ばしながら自動で再接続します（2 秒 → 5 秒 → 10 秒 → 30 秒 → 60 秒）。認証情報が有効か、アプリが無効化されていないかを確かめてください。外向きの WebSocket 接続がネットワークで許可されているかも見ておきます。

### ボットがオフラインになっている {#bot-is-offline}

**原因**: Hermes のゲートウェイが動いていないか、接続に失敗しています。

**対処**: `hermes gateway` が動いているか確かめ、端末の出力にエラーが出ていないか見てください。よくある原因は、認証情報の誤り、アプリの無効化、`dingtalk-stream` や `httpx` の入れ忘れです。

### 「No session_webhook available」 {#no-sessionwebhook-available}

**原因**: ボットが返事をしようとしたのに、セッション webhook の URL を持っていません。webhook の有効期限が切れたときや、メッセージを受け取ってから返事を送るまでの間にボットが再起動したときに起こりがちです。

**対処**: ボットにもう一度メッセージを送ってください。受信するメッセージごとに、返信用の新しいセッション webhook が渡されます。これは DingTalk の仕様上の制約で、ボットは最近受け取ったメッセージにしか返事ができません。

## セキュリティ {#security}

:::warning
`DINGTALK_ALLOWED_USERS` は必ず設定して、ボットを使える人を絞ってください。設定がない場合、ゲートウェイは安全側に倒してすべての利用者を拒否します。信頼できる人のユーザー ID だけを追加してください。許可された利用者は、ツールの実行やシステムへのアクセスを含め、エージェントのすべての能力を使えます。
:::

Hermes Agent の運用を安全にする方法については、[セキュリティガイド](/hermes/docs/user-guide/security/)を見てください。

## 補足 {#notes}

- **Stream Mode**: 公開 URL もドメイン名も webhook サーバーも要りません。接続は自分のマシンから WebSocket で張るので、NAT やファイアウォールの内側でも動きます。
- **AI カード**: 素の markdown の代わりに、内容の豊かな AI カードで返すこともできます。`card_template_id` で設定します。
- **絵文字リアクション**: 処理の状況を示す 🤔Thinking / 🥳Done のリアクションが自動で付きます。
- **markdown の返答**: 返信は DingTalk の markdown 形式で整形され、装飾付きで表示されます。
- **メディアへの対応**: 受信したメッセージの画像やファイルは自動で解決され、画像を扱うツールで処理できます。
- **メッセージの重複排除**: アダプターは 5 分間の窓で重複を判定し、同じメッセージを二重に処理しないようにします。
- **自動再接続**: 接続が切れた場合、アダプターは待ち時間を延ばしながら自動で再接続します。
- **メッセージの長さの上限**: 返答は 1 通あたり 20,000 文字までです。それより長い場合は切り詰められます。
