---
title: "Google Chat"
description: "Cloud Pub/Sub を使って Hermes Agent を Google Chat のボットとして設定する"
upstream_path: user-guide/messaging/google_chat.md
upstream_blob: e47e5a495a1673d70125d3555348ad5246cc1866
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/google_chat
---

# Google Chat の設定 {#google-chat-setup}

Hermes Agent を Google Chat のボットとしてつなぎます。受け取り側は Cloud Pub/Sub の
プル型サブスクリプション、送り出し側は Chat の REST API を使います。
使い勝手は Slack のソケットモードや Telegram のロングポーリングと同じで、Hermes の
プロセスに公開 URL もトンネルも TLS 証明書も要りません。つないで、認証して、
サブスクリプションを聞いているだけです。Telegram のボットがトークンひとつで待ち受けるのと同じ形です。

> `hermes gateway setup` を実行して **Google Chat** を選ぶと、案内に沿って進められます。

:::note Workspace の種類について
Google Chat は Google Workspace の一部です。この連携は、個人で取った Workspace
（Google に登録した `@yourdomain.com`）でも、アプリを公開できる管理権限を持っている
仕事用の Workspace でも使えます。Gmail だけのアカウントでは Chat アプリを
動かせません。
:::

## 全体像 {#overview}

| 項目 | 内容 |
|-----------|-------|
| **ライブラリ** | `google-cloud-pubsub`、`google-api-python-client`、`google-auth` |
| **受け取りの経路** | Cloud Pub/Sub のプル型サブスクリプション（公開の受け口は不要） |
| **送り出しの経路** | Chat の REST API（`chat.googleapis.com`） |
| **認証** | サブスクリプションに `roles/pubsub.subscriber` を持つサービスアカウントの JSON |
| **利用者の見分け方** | Chat のリソース名（`users/{id}`）とメールアドレス |

---

## 手順 1: GCP のプロジェクトを作るか選ぶ {#step-1-create-or-pick-a-gcp-project}

Pub/Sub のトピックを置くために Google Cloud のプロジェクトが要ります。まだなければ
[console.cloud.google.com](https://console.cloud.google.com) で作ってください。
個人のアカウントにも無料枠があり、ボット程度の通信量なら十分まかなえます。

プロジェクト ID（例: `my-chat-bot-123`）を控えておきます。これ以降のすべての手順で使います。

---

## 手順 2: 二つの API を有効にする {#step-2-enable-two-apis}

コンソールで **APIs & Services → Library** を開き、次を有効にします。

- **Google Chat API**
- **Cloud Pub/Sub API**

個人のボットが出す程度の量なら、どちらも無料です。

---

## 手順 3: サービスアカウントを作る {#step-3-create-a-service-account}

**IAM & Admin → Service Accounts → Create Service Account** と進みます。

- 名前: `hermes-chat-bot`
- 「このサービスアカウントにプロジェクトへのアクセスを許可する」の手順は飛ばします。必要なのは
  個別のサブスクリプションに対する IAM だけです。プロジェクト全体の Pub/Sub 権限は**与えないでください**。

作成したらそのサービスアカウントを開き、**Keys → Add Key → Create new key → JSON** から
ファイルをダウンロードします。Hermes だけが読める場所に保存してください（例:
`~/.hermes/google-chat-sa.json` に置いて `chmod 600`）。

:::caution 「Chat Bot Caller」という役割は存在しません
よくある勘違いが、Chat 専用の IAM 役割を探してプロジェクト全体に付けようとすることです。
そんな役割はありません。Chat のボットとしての権限は IAM ではなく、スペースに
導入されていることから来ます。サービスアカウントに要るのは、次の手順で作る
サブスクリプションに対する Pub/Sub の購読権限だけです。
:::

---

## 手順 4: Pub/Sub のトピックとサブスクリプションを作る {#step-4-create-the-pubsub-topic-and-subscription}

**Pub/Sub → Topics → Create topic** と進みます。

- トピック ID: `hermes-chat-events`
- ほかはすべて既定のままにします。

作成すると、トピックの詳細ページに **Subscriptions** のタブが出ます。ここで一つ作ります。

- サブスクリプション ID: `hermes-chat-events-sub`
- 配信の方式: **Pull**
- メッセージの保持期間: **7 日**（hermes を再起動しても溜まった分が残ります）
- ほかは既定のままにします。

---

## 手順 5: トピック側の IAM 設定（ここが要です） {#step-5-iam-binding-on-the-topic-critical}

サブスクリプションではなく**トピック**の方に、IAM のプリンシパルを足します。

- プリンシパル: `chat-api-push@system.gserviceaccount.com`
- 役割: `Pub/Sub Publisher`

これがないと Google Chat はトピックにイベントを流せず、ボットには何も届きません。

---

## 手順 6: サブスクリプション側の IAM 設定 {#step-6-iam-binding-on-the-subscription}

**サブスクリプション**の方に、自分のサービスアカウントをプリンシパルとして足します。

- プリンシパル: `hermes-chat-bot@<your-project>.iam.gserviceaccount.com`
- 役割: `Pub/Sub Subscriber`

同じサブスクリプションに `Pub/Sub Viewer` も付けてください。Hermes は起動時に
`subscription.get()` を呼んで、そこへ届くかどうかを確かめます。

---

## 手順 7: Chat アプリを設定する {#step-7-configure-the-chat-app}

**APIs & Services → Google Chat API → Configuration** を開きます。

- **App name**: 利用者に見せたい名前を入れます（「Hermes」で十分です）。
- **Avatar URL**: 公開されている PNG なら何でも構いません（Google が用意した既定のものもあります）。
- **Description**: アプリの一覧に出る短い説明文です。
- **Functionality**: **Receive 1:1 messages** と **Join spaces and group
  conversations** を有効にします。
- **Connection settings**: **Cloud Pub/Sub** を選び、トピック名
  `projects/<your-project>/topics/hermes-chat-events` を入れます。
- **Visibility**: 自分の Workspace（または特定の利用者）に限定します。試している間は
  全員に公開しないでください。

保存します。

---

## 手順 8: 試し用のスペースにボットを入れる {#step-8-install-the-bot-in-a-test-space}

ブラウザで Google Chat を開きます。**+ New Chat** のメニューでアプリ名を検索し、
そのアプリとの DM を始めます。最初にメッセージを送ったとき、Google が
`ADDED_TO_SPACE` というイベントを送ってきて、Hermes はそこからボット自身の `users/{id}` を
覚えます。これで自分の発言を拾わずに済みます。

---

## 手順 9: Hermes を設定する {#step-9-configure-hermes}

`~/.hermes/.env` に Google Chat の項目を足します。

```bash
# Required
GOOGLE_CHAT_PROJECT_ID=my-chat-bot-123
GOOGLE_CHAT_SUBSCRIPTION_NAME=projects/my-chat-bot-123/subscriptions/hermes-chat-events-sub
GOOGLE_CHAT_SERVICE_ACCOUNT_JSON=/home/you/.hermes/google-chat-sa.json

# Authorization — paste the emails of people allowed to talk to the bot
GOOGLE_CHAT_ALLOWED_USERS=you@yourdomain.com,coworker@yourdomain.com

# Optional
GOOGLE_CHAT_HOME_CHANNEL=spaces/AAAA...         # default delivery destination for cron jobs
GOOGLE_CHAT_MAX_MESSAGES=1                      # Pub/Sub FlowControl; 1 serializes commands per session
GOOGLE_CHAT_MAX_BYTES=16777216                  # 16 MiB — cap on in-flight message bytes
```

プロジェクト ID は `GOOGLE_CLOUD_PROJECT` からも読めます。サービスアカウントの置き場所も
`GOOGLE_APPLICATION_CREDENTIALS` から読めます。好きな書き方を選んでください。

[複数プロファイルのゲートウェイ](/hermes/docs/user-guide/multi-profile-gateways/) では、
`GOOGLE_CHAT_*` の設定はすべて振り分け先のプロファイル自身の `.env` から読まれます。
二つめ以降のプロファイルが既定プロファイルのプロジェクト・サブスクリプション・
サービスアカウントを受け継ぐことはありません。あるプロファイルにサービスアカウントの設定がなく、
プロセスの環境変数には別プロファイル用のものが入っている場合、アダプターは
アプリケーションのデフォルト認証情報に頼ることを拒み（それでは別のプロファイルとして
認証してしまうためです）、はっきりとエラーを記録します。そのプロファイルの `.env` に
`GOOGLE_CHAT_SERVICE_ACCOUNT_JSON` を書いてください。

Google Chat のアダプターが必要とするものは、専用の導入コマンドから入れます。
実行時の検査と同じく、安全のために固定した下限のバージョンが適用されます。

```bash
python -m plugins.platforms.google_chat.oauth --install-deps
```

ゲートウェイを起動します。

```bash
hermes gateway
```

次のようなログが出れば成功です。

```
[GoogleChat] Connected; project=my-chat-bot-123, subscription=<redacted>,
             bot_user_id=users/XXXX, flow_control(msgs=1, bytes=16777216)
```

試し用の DM に「hola」と送ってみてください。ボットはまず「Hermes is thinking…」という
目印を投稿し、その同じメッセージを実際の返答で書き換えます。「メッセージは削除されました」の
痕跡は残りません。

### 考え中の目印を変える {#customizing-the-working-state-marker}

目印の文言は `~/.hermes/config.yaml` の `typing_status_text` で変えられます。
たとえば Ada という名前の子猫のアシスタントならこうです。

```yaml
platforms:
  google_chat:
    # Custom working-state marker text (default: "Hermes is thinking…").
    typing_status_text: "is pouncing… 🐾"
```

Slack の一時的なステータス行とは違い、これは**実際に投稿されるメッセージ**で、
あとから返答に書き換えられます。ここに設定した文言は、ふつうのメッセージとして
一瞬チャットに現れます。目印そのものをやめたいときは `typing_indicator: false` にします。

---

## 表示のしかたとできること {#formatting-and-capabilities}

Google Chat が解釈できるマークダウンは限られています。

| 使えるもの | 使えないもの |
|-----------|---------------|
| `*bold*`、`_italic_`、`~strike~`、`` `code` `` | 見出し、箇条書き |
| URL で貼る画像 | 操作できる Card v2 のボタン（このゲートウェイの v1 では未対応） |
| Chat 本来のファイル添付（`/setup-files` のあと。手順 10 を参照） | Chat 本来の音声メモや丸い動画メモ |

エージェントのシステムプロンプトには Google Chat 向けの注意書きが入っていて、
表示されない書式を避けるようになっています。

1 通あたりの文字数の上限は 4000 文字です。返答がこれより長いときは、
自動的に複数のメッセージに分けて送られます。

スレッドにも対応しています。利用者がスレッドの中で返信すると、Hermes は
`thread.name` を見て同じスレッドに返します。スレッドごとに別々の Hermes のセッションになります。

### 聞き返しを操作できるカードで出す {#clarify-questions-as-interactive-cards}

エージェントが選択肢つきの聞き返しをするとき、アダプターは番号付きの文字列ではなく、
Chat 本来の **Card v2** として表示します。選択肢ごとにボタンが並び、
**「Other / type answer」** のボタンも付きます。
ボタンを押せばそのまま答えになります（`CARD_CLICKED` のイベントが、待っているセッションへ
選択内容を返します）。カードの送信に失敗したときや、決まった選択肢がない質問のときは、
これまでどおり文字での聞き返しに戻ります。設定は要りません。

---

## 手順 10: Chat 本来の添付で届ける（任意） {#step-10-native-attachment-delivery-optional}

そのままでもボットは文字を投稿し、URL で画像を貼り、音声・動画・書類のダウンロード用カードを
出せます。人がファイルをドラッグして貼ったときと同じ **Chat 本来の**添付として届けたい場合は、
利用者ごとに一度だけ OAuth の許可をします。

### なぜ別の手続きが要るのか {#why-a-separate-flow}

Google Chat の `media.upload` は、サービスアカウントでの認証をはっきり拒みます。

> This method doesn't support app authentication with a service account.
> Authenticate with a user account.

これを解決する IAM の役割やスコープはありません。この受け口は利用者本人の認証情報しか
受け付けないのです。そのためファイルを送るときだけ、ボットは*利用者として*ふるまう必要があります。
具体的には、そのファイルを頼んだ本人としてです。

### 一度だけの準備（プロファイルごと） {#one-time-setup-per-profile}

1. 同じ GCP プロジェクトで **APIs & Services → Credentials** を開きます。
2. **Create credentials → OAuth client ID → Desktop app** と進みます。
3. JSON をダウンロードし、Hermes を動かしている端末へ移します。
4. そのクライアントを Hermes に登録します（対象にしたいプロファイルで実行します）。

```bash
# Default profile:
python -m plugins.platforms.google_chat.oauth \
    --client-secret /path/to/client_secret.json

# A named profile gets its own separate registration:
hermes -p <profile> python -m plugins.platforms.google_chat.oauth \
    --client-secret /path/to/client_secret.json
```

これで、いま使っているプロファイルの Hermes ホームにクライアントシークレットが書き込まれます
（既定のプロファイルなら `~/.hermes/google_chat_user_client_secret.json` です）。
クライアントシークレットは**プロファイルごとに分かれていて、共有されません**。
それぞれのプロファイルが自分の分を登録します。これは意図した設計です。プロファイルは
認証の境界として切り離されているので、二つのプロファイルが別々の Google の OAuth アプリや
アカウントを向けます。Google Chat の添付を使うプロファイルごとに、一度ずつ登録してください。

### 利用者ごとの許可（チャットの中で） {#per-user-authorization-in-chat}

利用者はそれぞれ、ボットとの DM で一度だけこの手続きをします。

1. ボットに `/setup-files` と送ります。いまの状態と次にすることが返ってきます。
2. `/setup-files start` と送ります。ボットが OAuth の URL を返します。
3. その URL を開いて **Allow** を押すと、ブラウザは
   `http://localhost:1/?...&code=...` を読み込めずに失敗します。これは想定どおりで、
   必要な認証コードはアドレス欄の中にあります。
4. 失敗した URL（または `code=...` の値だけ）をコピーし、
   `/setup-files <PASTED_URL>` の形でチャットに貼り戻します。ボットがそれを
   リフレッシュトークンと引き換えます。

トークンは `~/.hermes/google_chat_user_tokens/<sanitized_email>.json` に置かれます。
以降、その利用者の DM でファイルを頼むと*その人の*トークンが使われるので、
ボットはその人として送り、メッセージもその人のスペースに届きます。

あとで取り消したいときは `/setup-files revoke` を使います。消えるのはその人のトークンだけで、
ほかの利用者のものはそのままです。

### 求める権限の範囲 {#scope}

この手続きが求めるスコープはただ一つ、`chat.messages.create` です。これで
`media.upload` と、送ったファイルの `attachmentDataRef` を参照する `messages.create` の
両方をまかなえます。Drive も、より広い Chat のスコープも求めません。
必要最小限にとどめる、という考えでこうしてあります。

### 複数の利用者がいるとき {#multi-user-behavior}

頼んだ人のトークンがまだないときは、以前の一人用のトークン
`~/.hermes/google_chat_user_token.json` に頼ります（複数利用者に対応する前の状態から
残っていた場合です）。どちらもないときは、ボットが `/setup-files` を実行するよう
はっきり文字で知らせます。

誰かが取り消しても、消えるのはその人の分だけです。ある利用者のトークンで 401 や 403 が
返ってきたときも、その人の分だけが破棄されます。利用者どうしが互いの邪魔をすることはありません。

---

## うまくいかないとき {#troubleshooting}

**「hola」と送ってもボットが黙ったまま。**

1. コンソールで、Pub/Sub のサブスクリプションに未配信のメッセージが溜まっていないか見ます。
   溜まっているなら Hermes 側の認証が通っていません。`GOOGLE_CHAT_SERVICE_ACCOUNT_JSON` と、
   そのサービスアカウントがサブスクリプションの `Pub/Sub Subscriber` に入っているかを確かめます。
2. サブスクリプションが空なら、Google Chat 側が流していません。
   **トピック**側の IAM 設定をもう一度見てください。
   `chat-api-push@system.gserviceaccount.com` に `Pub/Sub Publisher` が要ります。
3. `hermes gateway` のログに `[GoogleChat] Connected` があるか見ます。
   `[GoogleChat] Config validation failed` が出ていれば、どの環境変数を直せばよいかが
   メッセージに書かれています。

**返事は来るが、エージェントの答えではなくエラーが出る。**

ログに `[GoogleChat] Pub/Sub stream died` がないか見てください。繰り返し出ているなら、
サービスアカウントの認証情報が入れ替わったか、サブスクリプションが消されています。
10 回試して駄目なら、アダプターは自分を致命的な状態として扱います。

**送るメッセージがすべて「403 Forbidden」になる。**

ボットがスペースから外されたか、Chat API のコンソールで無効にされています。
スペースに入れ直してください（次の `ADDED_TO_SPACE` のイベントで送信が自動的に戻ります）。

**「Rate limit hit」の警告が多すぎる。**

Chat API の既定の上限は、スペースごとに 1 分あたり 60 通です。エージェントが長い返答を
少しずつ送ってこれを超えると、アダプターは間隔を空けながら送り直しますが、
利用者から見て遅くはなります。返答を短くするか、GCP のコンソールで上限を引き上げてください。

**ファイルではなく「/setup-files」の案内ばかり出る。**

頼んだ人の OAuth トークンがなく、以前の一人用のトークンもない状態です。
その人の DM で `/setup-files` を実行し、手順 10 に沿って進めてください。
引き換えが終われば、ゲートウェイを再起動しなくても次からは Chat 本来の添付で送られます。

**`/setup-files start` が「No client credentials stored.」と返す。**

一度だけの準備が*このプロファイルでは*済んでいません（クライアントシークレットは
プロファイルごとなので、別のプロファイルでの登録は見えません）。
ターミナルから、ゲートウェイが使っているプロファイルで実行してください。

```bash
# Default profile:
python -m plugins.platforms.google_chat.oauth \
    --client-secret /path/to/client_secret.json

# Named profile:
hermes -p <profile> python -m plugins.platforms.google_chat.oauth \
    --client-secret /path/to/client_secret.json
```

そのうえで、もう一度 `/setup-files start` と送ります。

**`/setup-files <PASTED_URL>` が「Token exchange failed.」と返す。**

認証コードは一度きりで、有効な時間も短めです（たいてい数分）。
`/setup-files start` で新しい URL を出し直してからやり直してください。

---

## 安全に使うために {#security-notes}

- **サービスアカウントのスコープ**: アダプターは `chat.bot` と `pubsub` のスコープを求めます。
  実際に効かせる仕組みは IAM の側に置いてください。サービスアカウントには最小限
  （サブスクリプションに対する `roles/pubsub.subscriber` と `roles/pubsub.viewer`）だけを与え、
  プロジェクト全体や組織全体の Pub/Sub 権限は与えないでください。
- **添付を取ってくるときの守り**: Hermes がサービスアカウントのトークンを添えるのは、
  Google が持つドメインの短い許可リストに一致するホストだけです
  （`googleapis.com`、`drive.google.com`、`lh[3-6].googleusercontent.com` など）。
  それ以外のホストは HTTP の通信をする前にはじかれます。細工されたイベントで
  トークンが GCE のメタデータサービスへ送られてしまう、といった事態を防ぐためです。
- **記録からの伏せ字**: サービスアカウントのメールアドレス、サブスクリプションのパス、
  トピックのパスは `agent/redact.py` によってログから取り除かれます。
  デバッグ用の生データの書き出し（`GOOGLE_CHAT_DEBUG_RAW=1`）も同じ伏せ字の処理を通り、
  DEBUG のレベルで記録されます。
- **社内規定との兼ね合い**: 規制のかかった Workspace（データの保管場所や AI の扱いに
  方針があるところ）につなぐつもりなら、最初に導入する前に承認を取ってください。
- **利用者側の OAuth スコープ**: 利用者ごとの添付の手続きが求めるのは
  `chat.messages.create` *だけ*です。`media.upload` と、そのあとの `messages.create` を
  まかなう最小限です。トークンは
  `~/.hermes/google_chat_user_tokens/<sanitized_email>.json` にそのままの JSON で保存されます
  （守っているのはファイルの権限です。サービスアカウントの鍵ファイルと同じ考え方です）。
  トークンはちょうど一人の利用者のものであり、取り消しもその人の範囲にとどまります。
