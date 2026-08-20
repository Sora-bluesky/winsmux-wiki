---
title: "Feishu / Lark"
description: "Hermes Agent を Feishu または Lark の Bot として設定します"
upstream_path: user-guide/messaging/feishu.md
upstream_blob: 1c5a66543e4318f20cc38e404b3cabf32850520b
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/feishu
---

# Feishu / Lark の設定 {#feishu-lark-setup}

Hermes Agent は、Feishu と Lark に本格的な Bot として組み込めます。つないでしまえば、個別のチャットでもグループチャットでもエージェントと会話でき、定期タスクの結果をホームチャットで受け取り、テキスト・画像・音声・ファイルの添付を通常のゲートウェイの流れでやり取りできます。

接続方式は 2 通りに対応しています。

- `websocket` — おすすめの方式です。Hermes 側から外向きに接続を張るので、公開された Webhook のエンドポイントを用意する必要がありません
- `webhook` — Feishu / Lark から HTTP でゲートウェイにイベントを送り込みたいときに使います

## Hermes の振る舞い {#how-hermes-behaves}

| 場面 | 振る舞い |
|---------|----------|
| 個別のチャット | すべてのメッセージに応答します。 |
| グループチャット | チャット内で Bot が @メンションされたときだけ応答します。 |
| 共有のグループチャット | 既定では、共有チャットの中でも会話履歴は利用者ごとに分けて保持します。 |

この共有チャットでの振る舞いは `config.yaml` で切り替えます。

```yaml
group_sessions_per_user: true
```

チャットごとに 1 本の会話を共有したいと明確に決めている場合だけ、`false` にしてください。

## 手順 1: Feishu / Lark のアプリを作る {#step-1-create-a-feishu-lark-app}

### おすすめ: スキャンして作成する（コマンド 1 つ） {#recommended-scan-to-create-one-command}

```bash
hermes gateway setup
```

**Feishu / Lark** を選び、Feishu または Lark のスマートフォンアプリで QR コードを読み取ります。Hermes が必要な権限を備えた Bot アプリケーションを自動で作り、認証情報を保存します。

### 別のやり方: 手動で設定する {#alternative-manual-setup}

スキャンでの作成が使えない場合、ウィザードは手入力に切り替わります。

1. Feishu または Lark の開発者コンソールを開きます。
   - Feishu: [https://open.feishu.cn/](https://open.feishu.cn/)
   - Lark: [https://open.larksuite.com/](https://open.larksuite.com/)
2. 新しいアプリを作ります。
3. **Credentials & Basic Info** で **App ID** と **App Secret** をコピーします。
4. そのアプリで **Bot** の機能を有効にします。
5. `hermes gateway setup` を実行し、**Feishu / Lark** を選んで、聞かれたら認証情報を入力します。

:::warning
App Secret は外に出さないでください。手に入れた相手は、あなたのアプリになりすませます。
:::

### 権限を設定する {#configure-permissions}

Feishu の開発者コンソールで **Permission Management** を開き、次のスコープを追加します。権限のページでまとめて取り込めます。

**必須の権限:**

| スコープ | 目的 |
|-------|---------|
| `im:message` | メッセージを受け取り、読む |
| `im:message:send_as_bot` | Bot としてメッセージを送る |
| `im:resource` | 利用者が送った画像・ファイル・音声にアクセスする |
| `im:chat` | チャットやグループの情報にアクセスする |
| `im:chat:readonly` | チャットの一覧と参加者を読む |

**おすすめの権限（機能を一通り使う場合）:**

| スコープ | 目的 |
|-------|---------|
| `im:message.reactions:readonly` | 絵文字リアクションのイベントを受け取る |
| `admin:app.info:readonly` | @メンション判定のために Bot 自身の識別情報を自動で取得する |
| `contact:user.id:readonly` | 許可リストの照合のために利用者 ID を解決する |

### イベントを設定する {#configure-events}

**Events and Callbacks** で次のように設定します。

1. 接続方式を **Long Connection (WebSocket)**（おすすめ）にするか、Webhook の URL を設定します
2. **Event Configuration** の欄で、次のイベントを購読します。
   - `im.message.receive_v1` — メッセージを受け取るために必須です

### アプリを公開する {#publish-the-app}

権限とイベントを設定したら、**Version Management** で新しいバージョンを公開します。バージョンが公開されて承認されるまで権限は効きません（企業向けアプリの場合、管理者の承認が要ることがあります）。

## 手順 2: 接続方式を選ぶ {#step-2-choose-a-connection-mode}

### おすすめ: WebSocket 方式 {#recommended-websocket-mode}

ノート PC やワークステーション、あるいは外部に公開していないサーバーで Hermes を動かすなら WebSocket 方式を使います。公開 URL は要りません。公式の Lark SDK が外向きの WebSocket 接続を張り続け、切れたら自動でつなぎ直します。

```bash
FEISHU_CONNECTION_MODE=websocket
```

**必要なもの:** Python パッケージの `websockets` をインストールしておく必要があります。接続の維持、ハートビート、自動再接続は SDK が内部で面倒を見ます。

**仕組み:** アダプターは Lark SDK の WebSocket クライアントを、裏側のスレッドで動かします。受け取ったイベント（メッセージ、リアクション、カード操作）は本体の asyncio ループへ渡されます。接続が切れたときは、SDK が自動で再接続を試みます。

### 任意: Webhook 方式 {#optional-webhook-mode}

Webhook 方式は、Hermes をすでに外から到達できる HTTP エンドポイントの後ろで動かしている場合だけ使ってください。

```bash
FEISHU_CONNECTION_MODE=webhook
```

Webhook 方式では、Hermes が（`aiohttp` を使って）HTTP サーバーを立ち上げ、次の場所で Feishu 向けのエンドポイントを提供します。

```text
/feishu/webhook
```

**必要なもの:** Python パッケージの `aiohttp` をインストールしておく必要があります。

Webhook サーバーの待ち受けアドレスとパスは変更できます。

```bash
FEISHU_WEBHOOK_HOST=127.0.0.1   # default: 127.0.0.1
FEISHU_WEBHOOK_PORT=8765         # default: 8765
FEISHU_WEBHOOK_PATH=/feishu/webhook  # default: /feishu/webhook
```

Feishu から URL 検証のチャレンジ（`type: url_verification`）が届くと、Webhook が自動で応答するので、Feishu の開発者コンソールで購読の設定を完了できます。このチャレンジへの応答は `FEISHU_VERIFICATION_TOKEN` を設定してある場合はその値で守られ、トークンが無いか一致しないチャレンジ要求は拒否されます。認証されていない相手が、攻撃者側が用意したチャレンジの値を返すだけで、エンドポイントを支配していると見せかけられないようにするためです。

## 手順 3: Hermes を設定する {#step-3-configure-hermes}

### 方法 A: 対話式の設定 {#option-a-interactive-setup}

```bash
hermes gateway setup
```

**Feishu / Lark** を選び、聞かれた内容を埋めていきます。

### 方法 B: 手動で設定する {#option-b-manual-configuration}

`~/.hermes/.env` に次の内容を書き足します。

```bash
FEISHU_APP_ID=cli_xxx
FEISHU_APP_SECRET=secret_xxx
FEISHU_DOMAIN=feishu
FEISHU_CONNECTION_MODE=websocket

# Optional but strongly recommended
FEISHU_ALLOWED_USERS=ou_xxx,ou_yyy
FEISHU_HOME_CHANNEL=oc_xxx
```

`FEISHU_DOMAIN` に指定できるのは次の値です。

- 中国国内向けの Feishu なら `feishu`
- 国際版の Lark なら `lark`

## 手順 4: ゲートウェイを起動する {#step-4-start-the-gateway}

```bash
hermes gateway
```

起動したら Feishu / Lark から Bot にメッセージを送り、つながっているか確かめます。

## ホームチャット {#home-chat}

Feishu / Lark のチャットで `/set-home` を実行すると、そのチャットが定期タスクの結果やプラットフォームをまたいだ通知の届け先になります。

あらかじめ設定しておくこともできます。

```bash
FEISHU_HOME_CHANNEL=oc_xxx
```

## セキュリティ {#security}

### 利用者の許可リスト {#user-allowlist}

実運用では、Feishu の Open ID による許可リストを設定してください。

```bash
FEISHU_ALLOWED_USERS=ou_xxx,ou_yyy
```

許可リストを空のままにすると、Bot に届く相手なら誰でも使えてしまう可能性があります。グループチャットでは、メッセージを処理する前に送信者の open_id が許可リストと照合されます。

### Webhook の暗号化キー {#webhook-encryption-key}

Webhook 方式で動かすときは、受け取った Webhook の中身に対する署名検証を有効にするため、暗号化キーを設定します。

```bash
FEISHU_ENCRYPT_KEY=your-encrypt-key
```

このキーは、Feishu アプリ設定の **Event Subscriptions** の欄にあります。設定すると、アダプターは届いた Webhook 要求をすべて次の署名アルゴリズムで検証します。

```
SHA256(timestamp + nonce + encrypt_key + body)
```

計算したハッシュは `x-lark-signature` ヘッダーの値と、処理時間の差が出ない方法で突き合わせます。署名が不正か無い要求は HTTP 401 で拒否されます。

:::tip
WebSocket 方式では署名の検証を SDK 自身が行うため、`FEISHU_ENCRYPT_KEY` は任意です。Webhook 方式では、実運用なら設定を強くおすすめします。
:::

### 検証トークン {#verification-token}

Webhook の中身に含まれる `token` フィールドを確かめる、もう一段の認証です。

```bash
FEISHU_VERIFICATION_TOKEN=your-verification-token
```

このトークンも、Feishu アプリの **Event Subscriptions** の欄にあります。設定すると、届いた Webhook の中身はすべて `header` オブジェクトに一致する `token` を持っている必要があります。一致しないトークンは HTTP 401 で拒否されます。

`FEISHU_ENCRYPT_KEY` と `FEISHU_VERIFICATION_TOKEN` は、守りを重ねる目的で両方いっしょに使えます。

## グループメッセージの方針 {#group-message-policy}

環境変数 `FEISHU_GROUP_POLICY` は、グループチャットで Hermes が応答するかどうか、どう応答するかを決めます。

```bash
FEISHU_GROUP_POLICY=allowlist   # default
```

| 値 | 振る舞い |
|-------|----------|
| `open` | どのグループでも、誰からの @メンションにも応答します。 |
| `allowlist` | `FEISHU_ALLOWED_USERS` に載っている利用者からの @メンションだけに応答します。 |
| `disabled` | グループのメッセージをすべて無視します。 |

どの方式でも、メッセージが処理されるにはグループ内で Bot が明示的に @メンション（または @all）されている必要があります。個別のチャットは、この関門を常に通り抜けます。

`FEISHU_REQUIRE_MENTION=false` にすると、@メンションを求めずにグループの発言をすべて読むようになります。

```bash
FEISHU_REQUIRE_MENTION=false
```

チャットごとに切り替えたい場合は、`group_rules` の項目に `require_mention` を設定します。後述の[グループごとのアクセス制御](#per-group-access-control)を参照してください。

### Bot 自身の識別情報 {#bot-identity}

Hermes は起動時に Bot 自身の `open_id` と表示名を自動で取得します。手動で設定する必要があるのは、Feishu の API に届かず自動取得ができないときか、アプリがテナント単位の利用者 ID を使っているときだけです。

```bash
FEISHU_BOT_OPEN_ID=ou_xxx     # only when auto-detection fails
FEISHU_BOT_USER_ID=xxx        # required if your app uses sender_id_type=user_id
FEISHU_BOT_NAME=MyBot         # only when auto-detection fails
```

## Bot 同士のやり取り {#bot-to-bot-messaging}

既定では、他の Bot が送ったメッセージは無視します。A2A の連携に Hermes を参加させたいときや、同じグループにいる他の Bot からの通知を受け取りたいときに、Bot 同士のやり取りを有効にしてください。

```bash
FEISHU_ALLOW_BOTS=mentions   # default: none
```

| 値 | 振る舞い |
|-------|----------|
| `none` | 他の Bot からのメッセージをすべて無視します（既定）。 |
| `mentions` | 相手の Bot が Hermes を @メンションしたときだけ受け付けます。 |
| `all` | 相手の Bot のメッセージをすべて受け付けます。 |

`config.yaml` の `feishu.allow_bots` でも設定できます（両方に指定した場合は環境変数が優先します）。

相手の Bot を `FEISHU_ALLOWED_USERS` に加える必要はありません。この許可リストは人の送信者にだけ適用されます。

相手の Bot の名前を表示するには `application:bot.basic_info:read` のスコープを与えてください。無くても振り分けは正しく動きますが、相手の Bot は `open_id` のまま表示されます。

## 対話型カードの操作 {#interactive-card-actions}

Bot が送った対話型カードのボタンを押すなどの操作があると、アダプターはそれを `/card` コマンドのイベントに変換して流します。

- ボタンを押すと `/card button {"key": "value", ...}` になります
- カードの定義にある操作の `value` の中身が JSON として含まれます
- カードの操作は 15 分の枠で重複を除き、二重に処理されないようにします

ゲートウェイからの更新確認は、素のテキスト返信に落とさず、Feishu の `Yes` / `No` カードで出します。`hermes update --gateway` が確認を求めるとき、アダプターは選ばれた答えを Hermes の `.update_response` ファイルに記録し、カードをその場で確定後の表示に差し替えます。

カードの操作イベントは `MessageType.COMMAND` として送られるので、通常のコマンド処理の流れをそのまま通ります。

**コマンドの承認**もこの仕組みで動きます。エージェントが危険なコマンドを実行しようとすると、Allow Once / Session / Always / Deny のボタンが付いた対話型カードを送ります。利用者がボタンを押すと、カード操作のコールバックが承認の判断をエージェントへ返します。

### Feishu アプリ側で必要な設定 {#required-feishu-app-configuration}

対話型カードには、Feishu Developer Console で **3 つ**の設定が要ります。どれか 1 つでも欠けていると、カードのボタンを押したときにエラー **200340** が出ます。

1. **カード操作のイベントを購読する:**
   **Event Subscriptions** で、購読するイベントに `card.action.trigger` を追加します。

2. **対話型カードの機能を有効にする:**
   **App Features > Bot** で **Interactive Card** のスイッチが入っていることを確かめます。これで、アプリがカード操作のコールバックを受け取れると Feishu に伝わります。

3. **カードのリクエスト URL を設定する（Webhook 方式のみ）:**
   **App Features > Bot > Message Card Request URL** に、イベント用の Webhook と同じエンドポイント（例: `https://your-server:8765/feishu/webhook`）を設定します。WebSocket 方式では SDK が自動で処理します。

:::warning
この 3 つが揃っていなくても、Feishu は対話型カードの*送信*には成功します（送るだけなら `im:message:send` の権限で足ります）。ただし、ボタンを押すとエラー 200340 が返ります。見た目には動いているようで、利用者が触った瞬間に初めてエラーが表に出ます。
:::

## ドキュメントのコメントへの自動返信 {#document-comment-intelligent-reply}

チャットだけでなく、**Feishu / Lark のドキュメント**に付いた `@` メンションにも答えられます。利用者がドキュメントにコメントし（本文の一部を選んだコメントでも、ドキュメント全体へのコメントでも）Bot を @ メンションすると、Hermes はドキュメント本体とそのコメントの流れを読み、LLM による返信をそのコメントの中に投稿します。

この機能は `drive.notice.comment_add_v1` イベントで動き、処理は次のとおりです。

- ドキュメントの中身とコメントの履歴を並行して取得します（ドキュメント全体へのコメントは 20 件、一部を選んだコメントは 12 件）。
- そのコメントのセッションだけに絞った `feishu_doc` と `feishu_drive` のツール群でエージェントを実行します。
- 返信は 4000 文字ごとに区切り、コメントへの返信として投稿します。
- ドキュメントごとのセッションを 1 時間、最大 50 メッセージまで保持するので、同じドキュメントに続けてコメントしても文脈が残ります。

### 3 段階のアクセス制御 {#3-tier-access-control}

ドキュメントのコメントへの返信は**明示的に許可した場合のみ**動きます。暗黙に全員を許可する設定はありません。権限は次の順で解決し、項目ごとに最初に一致したものが使われます。

1. **特定のドキュメント** — 個別のドキュメントトークンに絞った規則。
2. **ワイルドカード** — ドキュメントのパターンに一致する規則。
3. **最上位** — ワークスペース全体の既定の規則。

規則ごとに 2 つの方針を選べます。

- **`allowlist`** — 固定の利用者 / テナントの一覧。
- **`pairing`** — 固定の一覧に、実行中に承認された分を足したもの。管理役がその場で許可を出しながら広げていく展開に向きます。

規則は `~/.hermes/feishu_comment_rules.json`（pairing の許可は `~/.hermes/feishu_comment_pairing.json`）に置かれ、更新時刻を見て自動で読み直します。編集した内容は、ゲートウェイを再起動しなくても次のコメントのイベントから効きます。

コマンド:

```bash
# Inspect current rules and pairing state
python -m gateway.platforms.feishu_comment_rules status

# Simulate an access check for a specific doc + user
python -m gateway.platforms.feishu_comment_rules check <fileType:fileToken> <user_open_id>

# Manage pairing grants at runtime
python -m gateway.platforms.feishu_comment_rules pairing list
python -m gateway.platforms.feishu_comment_rules pairing add <user_open_id>
python -m gateway.platforms.feishu_comment_rules pairing remove <user_open_id>
```

### Feishu アプリ側で必要な設定 {#required-feishu-app-configuration}

チャットとカードのためにすでに与えた権限に加えて、ドライブのコメントのイベントを足します。

- **Event Subscriptions** で `drive.notice.comment_add_v1` を購読します。
- ドキュメントの中身を読めるように、`docs:doc:readonly` と `drive:drive:readonly` のスコープを与えます。

## 会議への招待イベント {#meeting-invitation-events}

Hermes の Feishu / Lark Bot は、人を招くのと同じやり方でビデオ会議に招待できます。Bot が会議への招待イベントを受け取ると、Hermes は会議に参加しようとするエージェントの処理を自動で始められます。

この機能は `vc.bot.meeting_invited_v1` イベントで動き、流れは次のとおりです。

- 利用者が Bot を Feishu / Lark のビデオ会議に招待します。
- Feishu / Lark が Hermes に会議の招待イベントを送ります。
- Hermes が招待した人、会議の題名、会議番号を取り出します。
- 招待した人が通常のゲートウェイの許可リストまたは pairing の方針で認められていれば、エージェントが会議番号を受け取り、自動で参加を試みます。
- 招待の内容が壊れている場合や、エージェントが参加できない場合は、Hermes はそのイベントを捨てるか、招待した人に短く事情を返します。

招待した人と `meeting_no` の両方が入っていない不正な招待は無視されます。

### Feishu アプリ側で必要な設定 {#required-feishu-app-configuration}

チャットとカードのためにすでに与えた権限に加えて、ビデオ会議の招待イベントを足します。

- **Event Subscriptions** で `vc.bot.meeting_invited_v1` を購読します。
- そのイベントに対して Feishu / Lark の開発者コンソールが求めるビデオ会議の権限スコープを有効にします。
- 招待した人に返信できるよう、`im:message` と `im:message:send_as_bot` を有効なままにしておきます。
- ゲートウェイの利用者許可リストか pairing の方針で、招待した人が認められていることを確かめます。会議への招待だからといって、通常のゲートウェイのアクセス確認を飛ばすことはありません。

## メディアへの対応 {#media-support}

### 受信 {#inbound-receiving}

アダプターは、利用者から次の種類のメディアを受け取り、手元に保存します。

| 種類 | 拡張子 | 処理のされ方 |
|------|-----------|-------------------|
| **画像** | .jpg, .jpeg, .png, .gif, .webp, .bmp | Feishu の API 経由でダウンロードし、手元に保存します |
| **音声** | .ogg, .mp3, .wav, .m4a, .aac, .flac, .opus, .webm | ダウンロードして保存します。小さなテキストファイルは中身を自動で取り出します |
| **動画** | .mp4, .mov, .avi, .mkv, .webm, .m4v, .3gp | ダウンロードし、文書として保存します |
| **ファイル** | .pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx ほか | ダウンロードし、文書として保存します |

リッチテキスト（post）メッセージに含まれるメディアも、本文中の画像や添付ファイルを含めて取り出して保存します。

小さなテキスト形式の文書（.txt、.md）については、中身がメッセージ本文へ自動で差し込まれるので、エージェントはツールを使わずそのまま読めます。

### 送信 {#outbound-sending}

| メソッド | 送るもの |
|--------|--------------|
| `send` | テキスト、またはリッチな post メッセージ（マークダウンの有無で自動判定します） |
| `send_image` / `send_image_file` | 画像を Feishu にアップロードし、画像の吹き出しとして送ります（説明文を添えられます） |
| `send_document` | ファイルを Feishu の API にアップロードし、添付ファイルとして送ります |
| `send_voice` | 音声ファイルを Feishu の添付ファイルとしてアップロードします |
| `send_video` | 動画をアップロードし、メディアのメッセージとして送ります |
| `send_animation` | GIF は添付ファイルに落として送ります（Feishu には GIF 用の吹き出しがありません） |

ファイルのアップロード方法は、拡張子で自動的に決まります。

- `.ogg`、`.opus` → `opus` の音声としてアップロード
- `.mp4`、`.mov`、`.avi`、`.m4v` → `mp4` のメディアとしてアップロード
- `.pdf`、`.doc(x)`、`.xls(x)`、`.ppt(x)` → それぞれの文書の種類としてアップロード
- それ以外 → 一般的なストリームのファイルとしてアップロード

## マークダウンの表示と post への切り替え {#markdown-rendering-and-post-fallback}

送信するテキストにマークダウンの書式（見出し、太字、箇条書き、コードブロック、リンクなど）が含まれる場合、アダプターは素のテキストではなく、`md` タグを埋め込んだ Feishu の **post** メッセージとして自動的に送ります。これで Feishu のクライアント側で見栄えよく表示されます。

Feishu の API が post の中身を受け付けなかった場合（対応していないマークダウンの書き方が原因など）、アダプターはマークダウンを取り除いた素のテキストへ自動的に切り替えて送ります。この二段構えにより、メッセージは必ず届きます。

マークダウンが見つからない素のテキストは、単純な `text` のメッセージ種別で送ります。

## 処理状況を表すリアクション {#processing-status-reactions}

エージェントが作業している間、Bot はあなたのメッセージに `Typing` のリアクションを付けます。返信が届くと消え、処理に失敗した場合は `CrossMark` に置き換わります。

止めたいときは `FEISHU_REACTIONS=false` を設定します。

## 連投への備えとまとめ処理 {#burst-protection-and-batching}

エージェントに負荷が集中しないよう、アダプターは短時間に連続したメッセージをまとめて扱います。

### テキストのまとめ {#text-batching}

利用者が短い間隔でテキストを何通も送った場合、1 つのイベントに束ねてから処理へ渡します。

| 設定 | 環境変数 | 既定値 |
|---------|---------|---------|
| 待ち時間 | `HERMES_FEISHU_TEXT_BATCH_DELAY_SECONDS` | 0.6 秒 |
| 1 回にまとめる最大件数 | `HERMES_FEISHU_TEXT_BATCH_MAX_MESSAGES` | 8 |
| 1 回にまとめる最大文字数 | `HERMES_FEISHU_TEXT_BATCH_MAX_CHARS` | 4000 |

### メディアのまとめ {#media-batching}

短い間隔で送られた複数の添付メディア（画像を何枚もドラッグした場合など）も、1 つのイベントに束ねます。

| 設定 | 環境変数 | 既定値 |
|---------|---------|---------|
| 待ち時間 | `HERMES_FEISHU_MEDIA_BATCH_DELAY_SECONDS` | 0.8 秒 |

### チャットごとの順番待ち {#per-chat-serialization}

同じチャットの中のメッセージは、会話の筋を保つために 1 通ずつ順番に処理します。チャットごとに別の錠を持つので、違うチャットのメッセージは同時に処理されます。

## 流量の制限（Webhook 方式） {#rate-limiting-webhook-mode}

Webhook 方式では、悪用を防ぐために送信元 IP ごとの流量制限をかけます。

- **区間:** 60 秒のスライディングウィンドウ
- **上限:** （app_id、パス、IP）の組み合わせごとに 1 区間あたり 120 回
- **追跡の上限:** 最大 4096 個の組み合わせまで追跡します（メモリが際限なく増えるのを防ぎます）

上限を超えた要求には HTTP 429（Too Many Requests）を返します。

### Webhook の異常の追跡 {#webhook-anomaly-tracking}

アダプターは、IP アドレスごとに連続したエラー応答を数えています。同じ IP から 6 時間のうちに 25 回続けてエラーが出ると、警告をログに残します。設定を誤ったクライアントや、探りを入れる動きに気づく助けになります。

Webhook にはほかにも次の備えがあります。
- **本文の大きさの上限:** 最大 1 MB
- **本文の読み取りの制限時間:** 30 秒
- **Content-Type の強制:** `application/json` だけを受け付けます

## WebSocket の調整 {#websocket-tuning}

`websocket` 方式を使うときは、再接続と ping の動きを変えられます。

```yaml
platforms:
  feishu:
    extra:
      ws_reconnect_interval: 120   # Seconds between reconnect attempts (default: 120)
      ws_ping_interval: 30         # Seconds between WebSocket pings (optional; SDK default if unset)
```

| 設定 | 設定キー | 既定値 | 説明 |
|---------|-----------|---------|-------------|
| 再接続の間隔 | `ws_reconnect_interval` | 120 秒 | 再接続を試みるまでどれだけ待つか |
| ping の間隔 | `ws_ping_interval` | _(SDK の既定値)_ | 接続維持のための WebSocket ping の頻度 |

## グループごとのアクセス制御 {#per-group-access-control}

全体に効く `FEISHU_GROUP_POLICY` とは別に、config.yaml の `group_rules` でグループチャットごとに細かい規則を決められます。

```yaml
platforms:
  feishu:
    extra:
      default_group_policy: "open"     # Default for groups not in group_rules
      admins:                          # Users who can manage bot settings
        - "ou_admin_open_id"
      group_rules:
        "oc_group_chat_id_1":
          policy: "allowlist"          # open | allowlist | blacklist | admin_only | disabled
          allowlist:
            - "ou_user_open_id_1"
            - "ou_user_open_id_2"
        "oc_group_chat_id_2":
          policy: "admin_only"
        "oc_group_chat_id_3":
          policy: "blacklist"
          blacklist:
            - "ou_blocked_user"
        "oc_free_chat":
          policy: "open"
          require_mention: false       # overrides FEISHU_REQUIRE_MENTION for this chat
```

| 方針 | 説明 |
|--------|-------------|
| `open` | グループにいる誰でも Bot を使えます |
| `allowlist` | そのグループの `allowlist` に載っている利用者だけが Bot を使えます |
| `blacklist` | そのグループの `blacklist` に載っている利用者以外は Bot を使えます |
| `admin_only` | 全体の `admins` の一覧に載っている利用者だけが、このグループで Bot を使えます |
| `disabled` | このグループのメッセージをすべて無視します |

`group_rules` の項目に `require_mention: false` を設定すると、そのチャットだけ @ メンションを求めなくなります。書かなかった場合は、全体の `FEISHU_REQUIRE_MENTION` の値を引き継ぎます。

`group_rules` に載っていないグループは `default_group_policy` に従います（既定値は `FEISHU_GROUP_POLICY` の値です）。

## 重複の除去 {#deduplication}

受け取ったメッセージは、メッセージ ID をもとに 24 時間の保持期間で重複を除きます。この重複除去の状態は `~/.hermes/feishu_seen_message_ids.json` に保存され、再起動しても引き継がれます。

| 設定 | 環境変数 | 既定値 |
|---------|---------|---------|
| キャッシュの大きさ | `HERMES_FEISHU_DEDUP_CACHE_SIZE` | 2048 件 |

## 環境変数の一覧 {#all-environment-variables}

| 変数 | 必須 | 既定値 | 説明 |
|----------|----------|---------|-------------|
| `FEISHU_APP_ID` | ✅ | — | Feishu / Lark の App ID |
| `FEISHU_APP_SECRET` | ✅ | — | Feishu / Lark の App Secret |
| `FEISHU_DOMAIN` | — | `feishu` | `feishu`（中国国内）または `lark`（国際版） |
| `FEISHU_CONNECTION_MODE` | — | `websocket` | `websocket` または `webhook` |
| `FEISHU_ALLOWED_USERS` | — | _(空)_ | 利用者の許可リストに使う open_id のカンマ区切りの一覧 |
| `FEISHU_ALLOW_BOTS` | — | `none` | 他の Bot からのメッセージを受け付けるか: `none`、`mentions`、`all` |
| `FEISHU_REQUIRE_MENTION` | — | `true` | グループのメッセージで Bot への @ メンションを必須にするか |
| `FEISHU_HOME_CHANNEL` | — | — | 定期タスクや通知の出力先となるチャット ID |
| `FEISHU_ENCRYPT_KEY` | — | _(空)_ | Webhook の署名検証に使う暗号化キー |
| `FEISHU_VERIFICATION_TOKEN` | — | _(空)_ | Webhook の中身を認証するための検証トークン |
| `FEISHU_GROUP_POLICY` | — | `allowlist` | グループメッセージの方針: `open`、`allowlist`、`disabled` |
| `FEISHU_BOT_OPEN_ID` | — | _(空)_ | Bot の open_id（@ メンションの判定用） |
| `FEISHU_BOT_USER_ID` | — | _(空)_ | Bot の user_id（@ メンションの判定用） |
| `FEISHU_BOT_NAME` | — | _(空)_ | Bot の表示名（@ メンションの判定用） |
| `FEISHU_WEBHOOK_HOST` | — | `127.0.0.1` | Webhook サーバーの待ち受けアドレス |
| `FEISHU_WEBHOOK_PORT` | — | `8765` | Webhook サーバーのポート |
| `FEISHU_WEBHOOK_PATH` | — | `/feishu/webhook` | Webhook のエンドポイントのパス |
| `HERMES_FEISHU_DEDUP_CACHE_SIZE` | — | `2048` | 重複除去のために覚えておくメッセージ ID の最大数 |
| `HERMES_FEISHU_TEXT_BATCH_DELAY_SECONDS` | — | `0.6` | テキストの連投をまとめるための待ち時間 |
| `HERMES_FEISHU_TEXT_BATCH_MAX_MESSAGES` | — | `8` | テキスト 1 回分にまとめる最大件数 |
| `HERMES_FEISHU_TEXT_BATCH_MAX_CHARS` | — | `4000` | テキスト 1 回分にまとめる最大文字数 |
| `HERMES_FEISHU_MEDIA_BATCH_DELAY_SECONDS` | — | `0.8` | メディアの連投をまとめるための待ち時間 |

WebSocket とグループごとのアクセス制御の設定は、`config.yaml` の `platforms.feishu.extra` の下で行います（上の [WebSocket の調整](#websocket-tuning) と[グループごとのアクセス制御](#per-group-access-control)を参照してください）。

## 困ったときは {#troubleshooting}

| 症状 | 対処 |
|---------|-----|
| `lark-oapi not installed` | SDK を入れます: `pip install lark-oapi` |
| `websockets not installed; websocket mode unavailable` | websockets を入れます: `pip install websockets` |
| `aiohttp not installed; webhook mode unavailable` | aiohttp を入れます: `pip install aiohttp` |
| `FEISHU_APP_ID or FEISHU_APP_SECRET not set` | 両方の環境変数を設定するか、`hermes gateway setup` で設定します |
| `Another local Hermes gateway is already using this Feishu app_id` | 同じ app_id を同時に使える Hermes は 1 つだけです。先に別のゲートウェイを止めてください。 |
| グループで Bot が応答しない | Bot が @ メンションされているか確かめ、`FEISHU_GROUP_POLICY` を見直し、方針が `allowlist` なら送信者が `FEISHU_ALLOWED_USERS` に入っているか確かめます |
| `Webhook rejected: invalid verification token` | `FEISHU_VERIFICATION_TOKEN` が、Feishu アプリの Event Subscriptions の設定にあるトークンと一致しているか確かめます |
| `Webhook rejected: invalid signature` | `FEISHU_ENCRYPT_KEY` が、Feishu アプリの設定にある暗号化キーと一致しているか確かめます |
| post のメッセージが素のテキストで表示される | Feishu の API が post の中身を受け付けなかった場合の、正常な切り替え動作です。詳しくはログを確認してください。 |
| 画像やファイルが Bot に届かない | Feishu アプリに `im:message` と `im:resource` の権限スコープを与えます |
| Bot 自身の識別情報が自動取得できない | たいていは Feishu の Bot 情報のエンドポイントに届かない一時的なネットワークの問題です。当面の対処として `FEISHU_BOT_OPEN_ID` と `FEISHU_BOT_NAME` を手で設定してください。 |
| `FEISHU_ALLOW_BOTS` を有効にしても相手の Bot のメッセージが無視される | Hermes がまだ自分を識別できていません。`FEISHU_BOT_OPEN_ID`（アプリが `sender_id_type=user_id` を使うなら `FEISHU_BOT_USER_ID` も）を設定してください。 |
| 相手の Bot が名前でなく `ou_xxxxxx` と表示される | `application:bot.basic_info:read` のスコープを与えます。 |
| 承認のボタンを押すとエラー 200340 が出る | Feishu Developer Console で **Interactive Card** の機能を有効にし、**Card Request URL** を設定します。上の [Feishu アプリ側で必要な設定](#required-feishu-app-configuration)を参照してください。 |
| `Webhook rate limit exceeded` | 同じ IP から 1 分あたり 120 回を超えています。たいていは設定の誤りか、処理が回り続けているのが原因です。 |

## ツール群 {#toolset}

Feishu / Lark は `hermes-feishu` のプラットフォーム設定を使います。ここには、Telegram をはじめとするゲートウェイ経由の他のメッセージングプラットフォームと同じ中核のツールが含まれます。
