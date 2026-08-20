---
title: "Google Chat"
description: "Cloud Pub/Sub を使って Hermes Agent を Google Chat のボットとして設定する"
upstream_path: user-guide/messaging/google_chat.md
upstream_blob: e613331a4de8aeb941e9ea0304579ab019232b6a
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/google_chat
---

# Google Chat の設定 {#google-chat-setup}

Hermes Agent を Google Chat のボットとしてつなぎます。受信には Cloud Pub/Sub の
プル型の購読を、送信には Chat の REST API を使います。使い勝手は Slack の Socket Mode や
Telegram のロングポーリングと同じで、Hermes を動かしている側に外から届く URL も、
トンネルも、TLS の証明書も要りません。接続して認証し、購読を待ち受けるだけです。
Telegram のボットがトークンで待ち受けるのと同じ考え方です。

> `hermes gateway setup` を動かして **Google Chat** を選ぶと、手順に沿って設定できます。

:::note Workspace の種類について
Google Chat は Google Workspace の一部です。この連携は、個人で契約した Workspace
（Google で登録した `@yourdomain.com` のもの）でも、アプリを公開できる管理者権限を
持っている職場の Workspace でも使えます。Gmail だけのアカウントでは Chat のアプリを
動かせません。
:::

## 全体像 {#overview}

| 構成要素 | 内容 |
|-----------|-------|
| **ライブラリ** | `google-cloud-pubsub`、`google-api-python-client`、`google-auth` |
| **受信の経路** | Cloud Pub/Sub のプル型の購読（外から届く受け口は不要） |
| **送信の経路** | Chat の REST API（`chat.googleapis.com`） |
| **認証** | 購読に対して `roles/pubsub.subscriber` を持つサービスアカウントの JSON |
| **相手の見分け方** | Chat のリソース名（`users/{id}`）とメールアドレス |

---

## ステップ 1: GCP のプロジェクトを作る、または選ぶ {#step-1-create-or-pick-a-gcp-project}

Pub/Sub のトピックを置くために、Google Cloud のプロジェクトが必要です。まだなければ
[console.cloud.google.com](https://console.cloud.google.com) で作ります。
個人のアカウントにも無料枠があり、ボットの通信量なら十分まかなえます。

プロジェクト ID（例: `my-chat-bot-123`）を控えておきます。このあとの手順でずっと
使います。

---

## ステップ 2: 二つの API を有効にする {#step-2-enable-two-apis}

コンソールで **APIとサービス → ライブラリ** を開き、次を有効にします。

- **Google Chat API**
- **Cloud Pub/Sub API**

個人のボットが出すくらいの量なら、どちらも無料の範囲に収まります。

---

## ステップ 3: サービスアカウントを作る {#step-3-create-a-service-account}

**IAM と管理 → サービス アカウント → サービス アカウントを作成** と進みます。

- 名前: `hermes-chat-bot`
- 「このサービス アカウントにプロジェクトへのアクセスを許可する」の手順は飛ばします。
  必要なのは特定の購読に対する IAM の権限だけです。プロジェクト全体に Pub/Sub の役割を
  与えては **いけません**。

作成できたらそのサービスアカウントを開き、**キー → 鍵を追加 → 新しい鍵を作成 → JSON**
からファイルをダウンロードします。Hermes だけが読める場所に保存してください（例:
`~/.hermes/google-chat-sa.json` に置き、`chmod 600` を設定）。

:::caution 「Chat Bot Caller」という役割は存在しません
よくある間違いは、Chat 専用の IAM の役割を探してプロジェクト全体に与えてしまうことです。
そんな役割はありません。Chat のボットとしての権限は、IAM ではなく space に導入されている
ことから来ます。サービスアカウントに要るのは、次の手順で作る購読に対する Pub/Sub の
購読者の権限だけです。
:::

---

## ステップ 4: Pub/Sub のトピックと購読を作る {#step-4-create-the-pubsub-topic-and-subscription}

**Pub/Sub → トピック → トピックを作成** と進みます。

- トピック ID: `hermes-chat-events`
- ほかはすべて初期値のままにします。

作成すると、トピックの詳細ページに **サブスクリプション** のタブが出ます。ここで一つ作ります。

- サブスクリプション ID: `hermes-chat-events-sub`
- 配信タイプ: **プル**
- メッセージの保持期間: **7 日**（Hermes を再起動しても、たまった分が残ります）
- ほかは初期値のままにします。

---

## ステップ 5: トピックへの IAM の設定（ここが要です） {#step-5-iam-binding-on-the-topic-critical}

購読ではなく **トピック** のほうに、IAM のプリンシパルを追加します。

- プリンシパル: `chat-api-push@system.gserviceaccount.com`
- ロール: `Pub/Sub Publisher`

これがないと、Google Chat はトピックにイベントを流せず、ボットには何も届きません。

---

## ステップ 6: 購読への IAM の設定 {#step-6-iam-binding-on-the-subscription}

**購読** のほうに、自分のサービスアカウントをプリンシパルとして追加します。

- プリンシパル: `hermes-chat-bot@<your-project>.iam.gserviceaccount.com`
- ロール: `Pub/Sub Subscriber`

同じ購読に `Pub/Sub Viewer` も与えてください。Hermes は起動時に
`subscription.get()` を呼んで、そこへ届くかを確かめます。

---

## ステップ 7: Chat のアプリを設定する {#step-7-configure-the-chat-app}

**APIとサービス → Google Chat API → 構成** を開きます。

- **アプリ名**: 相手に見せたい名前を入れます（「Hermes」あたりが無難です）。
- **アバターの URL**: 公開されている PNG なら何でもかまいません（Google が用意したものもあります）。
- **説明**: アプリの一覧に出る短い一文です。
- **機能**: **1:1 のメッセージを受信する** と **スペースとグループの会話に参加する** を有効にします。
- **接続設定**: **Cloud Pub/Sub** を選び、トピック名
  `projects/<your-project>/topics/hermes-chat-events` を入れます。
- **公開設定**: 自分の Workspace（または特定の相手）に限定します。試している最中に
  全員へ公開しないでください。

保存します。

---

## ステップ 8: 試す space にボットを入れる {#step-8-install-the-bot-in-a-test-space}

ブラウザで Google Chat を開きます。**+ 新しいチャット** のメニューでアプリの名前を
検索し、個別のやり取りを始めます。最初にメッセージを送ると、Google から
`ADDED_TO_SPACE` というイベントが届きます。Hermes はこれを使ってボット自身の
`users/{id}` を覚え、自分の発言を取り除くのに使います。

---

## ステップ 9: Hermes を設定する {#step-9-configure-hermes}

`~/.hermes/.env` に Google Chat の項目を書き足します。

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

プロジェクト ID は `GOOGLE_CLOUD_PROJECT` からも読み取れますし、サービスアカウントの
ファイルの場所は `GOOGLE_APPLICATION_CREDENTIALS` からも読み取れます。使い慣れたほうを
選んでください。

Google Chat のアダプターが必要とするものは、専用のインストーラーから入れます。
実行時の確認と同じく、安全のために決めたバージョンの下限がそのまま適用されます。

```bash
python -m plugins.platforms.google_chat.oauth --install-deps
```

ゲートウェイを動かします。

```bash
hermes gateway
```

次のような記録が出るはずです。

```
[GoogleChat] Connected; project=my-chat-bot-123, subscription=<redacted>,
             bot_user_id=users/XXXX, flow_control(msgs=1, bytes=16777216)
```

試しているやり取りで「hola」と送ってみてください。ボットはまず
「Hermes is thinking…」という目印を出し、そのメッセージ自体を本当の返事に
書き換えます。「メッセージが削除されました」の跡は残りません。

### 考え中の目印を変える {#customizing-the-working-state-marker}

目印の文章は、`~/.hermes/config.yaml` の `typing_status_text` で変えられます。
たとえば Ada という名前の子猫のアシスタントなら、こうなります。

```yaml
platforms:
  google_chat:
    # Custom working-state marker text (default: "Hermes is thinking…").
    typing_status_text: "is pouncing… 🐾"
```

Slack のようにその人にだけ見える一行ではなく、これは **実際に投稿されるメッセージ** で、
あとから返事に書き換えられます。ここに書いた文章は、ふつうのメッセージとして
少しのあいだチャットに現れます。目印そのものをやめたいときは
`typing_indicator: false` にします。

---

## 表示のしかたと、できること {#formatting-and-capabilities}

Google Chat が表示できる Markdown は限られています。

| 使えるもの | 使えないもの |
|-----------|---------------|
| `*bold*`, `_italic_`, `~strike~`, `` `code` `` | 見出し、箇条書き |
| URL による画像の埋め込み | 対話できる Card v2 のボタン（このゲートウェイの v1 では未対応） |
| Chat そのもののファイル添付（`/setup-files` のあと。ステップ 10 を参照） | 音声メモや丸い動画メモ |

エージェントのシステムプロンプトには Google Chat 向けの案内が入っているので、
この制限を踏まえ、表示できない書き方を避けるようになっています。

一通あたりの長さの上限は 4000 文字です。長い返事は自動で複数のメッセージに分けて
送られます。

スレッドにも対応しています。スレッドの中で返信すると、Hermes は `thread.name` を
見て同じスレッドに返事を投稿します。スレッドごとに別の Hermes のセッションになります。

### 聞き返しを対話できるカードで出す {#clarify-questions-as-interactive-cards}

エージェントが選択肢つきで聞き返すとき、アダプターはそれを番号つきの文字の一覧では
なく、Chat の **Card v2** として表示します。選択肢ごとのボタンに加えて
**「Other / type answer」** のボタンも並びます。ボタンを押せばそのまま答えになります
（`CARD_CLICKED` のイベントが、待っているセッションへ選んだ内容を返します）。
カードを送れなかったときや、決まった選択肢がない質問のときは、これまでどおり文字での
聞き返しに戻ります。設定は要りません。

---

## ステップ 10: Chat そのもののファイル添付（任意） {#step-10-native-attachment-delivery-optional}

そのままでもボットは、文章、URL による画像の埋め込み、音声・動画・書類のダウンロード
カードを投稿できます。人がファイルをドラッグして落としたときと同じ **Chat そのものの**
添付として届けたい場合は、利用者ごとに一度だけ OAuth の認可をしてもらいます。

### なぜ別の手続きが要るのか {#why-a-separate-flow}

Google Chat の `media.upload` は、サービスアカウントでの認証をはっきり断ります。

> This method doesn't support app authentication with a service account.
> Authenticate with a user account.

これを回避できる IAM の役割やスコープはありません。この受け口は利用者本人の資格情報
しか受け付けないのです。そのためボットは、ファイルをアップロードするときだけ
*利用者として* ふるまう必要があります。具体的には、そのファイルを頼んだ本人としてです。

### 一度だけの設定（プロファイルごと） {#one-time-setup-per-profile}

1. 同じ GCP のプロジェクトで **APIとサービス → 認証情報** を開きます。
2. **認証情報を作成 → OAuth クライアント ID → デスクトップ アプリ** と進みます。
3. JSON をダウンロードし、Hermes を動かしているホストへ移します。
4. そのクライアントを Hermes に登録します（登録したいプロファイルで動かします）。

```bash
# Default profile:
python -m plugins.platforms.google_chat.oauth \
    --client-secret /path/to/client_secret.json

# A named profile gets its own separate registration:
hermes -p <profile> python -m plugins.platforms.google_chat.oauth \
    --client-secret /path/to/client_secret.json
```

これで、いま使っているプロファイルの Hermes のホームにクライアントの秘密の値が
書き込まれます（初期のプロファイルなら `~/.hermes/google_chat_user_client_secret.json`
です）。この値は **プロファイルごとに分かれていて、共有されません**。プロファイルごとに
登録します。これは意図した作りで、プロファイルは認証の境界として切り離されており、
二つのプロファイルが別々の Google の OAuth アプリやアカウントを向けます。Google Chat の
ファイル添付を使うプロファイルごとに、一度ずつ登録してください。

### 利用者ごとの認可（チャットの中で行います） {#per-user-authorization-in-chat}

それぞれの利用者が、ボットとの個別のやり取りの中で一度だけ手続きをします。

1. ボットに `/setup-files` と送ります。いまの状態と次にすることが返ってきます。
2. `/setup-files start` と送ります。ボットが OAuth の URL を返します。
3. その URL を開いて **許可** を押すと、ブラウザが
   `http://localhost:1/?...&code=...` を開こうとして失敗します。これは想定どおりで、
   認可コードはアドレス欄に入っています。
4. 失敗した URL（あるいは `code=...` の値だけ）をコピーして、
   `/setup-files <PASTED_URL>` の形でチャットに貼り付けます。ボットがそれを
   引き換えてリフレッシュトークンを受け取ります。

トークンは `~/.hermes/google_chat_user_tokens/<sanitized_email>.json` に保存されます。
以降、その人との個別のやり取りでファイルを頼まれたときは *その人の* トークンを使うので、
ボットはその人としてアップロードし、ファイルはその人の space に届きます。

あとで取り消すには `/setup-files revoke` と送ります。消えるのはその人のトークンだけで、
ほかの人のものはそのまま残ります。

### スコープ {#scope}

この手続きで求めるスコープは `chat.messages.create` の一つだけです。これで
`media.upload` と、アップロードした `attachmentDataRef` を指す `messages.create` の
両方をまかなえます。Drive も、Chat の広いスコープも使いません。必要最小限にとどめる
ための作りです。

### 複数の利用者がいるとき {#multi-user-behavior}

頼んだ人のトークンがまだない場合、ボットは以前の作りで使っていた一人ぶんのトークン
`~/.hermes/google_chat_user_token.json` に戻ります（複数の利用者に対応する前から
入っていた場合です）。どちらもないときは、`/setup-files` を実行するよう伝える
はっきりした文章を投稿します。

誰かが取り消しても、消えるのはその人のぶんだけです。ある人のトークンで 401 や 403 が
返っても、消えるのはその人ぶんの保持だけです。利用者どうしが邪魔をすることはありません。

---

## 困ったときは {#troubleshooting}

**「hola」と送ってもボットが黙ったままです。**

1. コンソールで、Pub/Sub の購読に未配信のメッセージがたまっていないか確かめます。
   たまっているなら Hermes の認証が通っていません。`GOOGLE_CHAT_SERVICE_ACCOUNT_JSON`
   と、そのサービスアカウントが購読の `Pub/Sub Subscriber` に入っているかを見直します。
2. 購読にメッセージが一件もないなら、Google Chat 側が流せていません。
   **トピック** の IAM をもう一度確かめてください。
   `chat-api-push@system.gserviceaccount.com` に `Pub/Sub Publisher` が要ります。
3. `hermes gateway` の記録に `[GoogleChat] Connected` が出ているかを見ます。
   `[GoogleChat] Config validation failed` と出ていれば、直すべき環境変数が
   そのメッセージに書かれています。

**返事は来るのに、エージェントの答えではなくエラーが出ます。**

記録に `[GoogleChat] Pub/Sub stream died` がないか確かめます。これが繰り返し出るなら、
サービスアカウントの資格情報が入れ替わったか、購読が消えている可能性があります。
10 回試してだめだと、アダプターは自分を停止と見なします。

**送るたびに「403 Forbidden」になります。**

ボットが space から外されたか、Chat API のコンソールで取り消されています。もう一度
space に入れてください（次の `ADDED_TO_SPACE` のイベントで、自動的にまた送れるようになります）。

**「Rate limit hit」の警告が多すぎます。**

Chat API の初期の上限は、space ごとに一分あたり 60 通です。エージェントが長い返事を
流し続けてこれを超えると、アダプターは間隔を空けながらやり直しますが、その分だけ
相手を待たせることになります。返事を短くするか、GCP のコンソールで上限を上げることを
検討してください。

**ファイルではなく「/setup-files」の案内ばかり返ってきます。**

頼んだ人の OAuth のトークンがなく、以前の作りのトークンもありません。その人との
個別のやり取りで `/setup-files` を実行し、ステップ 10 に従ってもらってください。
引き換えが終われば、次に頼まれたときからゲートウェイを再起動せずに添付できます。

**`/setup-files start` が「No client credentials stored.」と返します。**

一度だけの設定が *このプロファイルでは* 済んでいません（クライアントの秘密の値は
プロファイルごとなので、別のプロファイルで登録しても見えません）。端末から、
ゲートウェイが使っているプロファイルで動かします。

```bash
# Default profile:
python -m plugins.platforms.google_chat.oauth \
    --client-secret /path/to/client_secret.json

# Named profile:
hermes -p <profile> python -m plugins.platforms.google_chat.oauth \
    --client-secret /path/to/client_secret.json
```

そのうえで、もう一度 `/setup-files start` と送ります。

**`/setup-files <PASTED_URL>` が「Token exchange failed.」と返します。**

認可コードは一度きりで、有効な時間も短めです（ふつうは数分）。`/setup-files start` で
新しい URL を出し直して、やり直してください。

---

## 安全のための覚え書き {#security-notes}

- **サービスアカウントのスコープ**: アダプターは `chat.bot` と `pubsub` のスコープを
  求めます。実際に効かせるのは IAM のほうにしてください。サービスアカウントには
  最小限（購読に対する `roles/pubsub.subscriber` と `roles/pubsub.viewer`）だけを
  与え、プロジェクト全体や組織全体の Pub/Sub の役割は与えないでください。
- **添付をダウンロードするときの守り**: Hermes がサービスアカウントのトークンを付けて
  取りにいくのは、Google が持つ短い許可の一覧に載ったホストだけです
  （`googleapis.com`、`drive.google.com`、`lh[3-6].googleusercontent.com` など）。
  それ以外のホストは HTTP の要求を出す前にはねます。細工したイベントでトークンを
  GCE のメタデータの受け口へ向けさせる、といった攻撃を防ぐためです。
- **伏せ字**: サービスアカウントのメールアドレス、購読のパス、トピックのパスは
  `agent/redact.py` が記録から取り除きます。中身をそのまま出す確認用の表示
  （`GOOGLE_CHAT_DEBUG_RAW=1`）も同じ伏せ字の仕組みを通り、DEBUG の水準で記録されます。
- **社内規程**: 決まりのある Workspace（データの置き場所や AI の扱いに方針がある職場）に
  このボットをつなぐつもりなら、最初に入れる前に承認を取ってください。
- **利用者ごとの OAuth のスコープ**: 添付のための手続きが求めるのは
  `chat.messages.create` *だけ* です。`media.upload` とそれに続く `messages.create` を
  まかなう最小限です。トークンはそのままの JSON として
  `~/.hermes/google_chat_user_tokens/<sanitized_email>.json` に保存されます
  （守りはファイルの権限で、サービスアカウントの鍵ファイルと同じ考え方です）。
  それぞれのトークンの持ち主はただ一人で、取り消しもその人だけに効きます。
