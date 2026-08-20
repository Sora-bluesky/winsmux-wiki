---
title: "Weixin（微信）"
description: "iLink Bot API を使って Hermes Agent を個人の WeChat アカウントにつなぐ"
upstream_path: user-guide/messaging/weixin.md
upstream_blob: b38ee4a472da9e589ea45e357917dd1b8d093c37
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/weixin
---

# Weixin（微信） {#weixin-wechat}

Hermes を、テンセントの個人向けメッセージングサービス [WeChat](https://weixin.qq.com/)（微信）につなぎます。このアダプターは個人の WeChat アカウント向けにテンセントの **iLink Bot API** を使います。WeCom（企業向け WeChat）とは別物です。メッセージはロングポーリングで届くので、公開エンドポイントや Webhook を用意する必要はありません。

:::info
このアダプターは **個人の WeChat アカウント**（微信）向けです。企業向け・法人向けの WeChat が必要な場合は、代わりに [WeCom アダプター](/hermes/docs/user-guide/messaging/wecom/) を参照してください。
:::

:::warning iLink ボットという別人格 — 普通の WeChat グループでは動かないことがあります
QR ログインで Hermes につながるのは **iLink のボット人格**（例: `a5ace6fd482e@im.bot`）であって、自由にスクリプトから操作できる普通の個人 WeChat アカウントでは **ありません**。そのため次のようになります。

- iLink のボット人格は、通常の連絡先のように **普通の WeChat グループへ招待できません**。
- iLink は多くのボット種別のアカウントについて、**普通の WeChat グループのイベントをゲートウェイへ届けません**（QR ログインに使った個人アカウントへの `@` メンションも含みます）。
- QR コードを読み取った個人の WeChat アカウントに `@` を付けても、iLink ボットへの `@` メンションとは **別物** です。ボットは独立した人格です。
- 以下の `WEIXIN_GROUP_POLICY` / `WEIXIN_GROUP_ALLOWED_USERS` の設定が効くのは、そのアカウント種別で iLink が実際にグループのイベントを返す場合だけです。返さない場合は、方針をどう設定してもグループのメッセージが Hermes に届くことはありません。

実際のところ、ほとんどの環境で確実に動くのは iLink ボットへの DM だけです。設定してもグループでの受信が動かない場合、制約は iLink 側にあり、Hermes 側の問題ではありません。`WEIXIN_GROUP_POLICY` が `disabled` 以外に設定されていると、ゲートウェイは起動時に `WARNING` をログへ出します。
:::

## 事前に必要なもの {#prerequisites}

- 個人の WeChat アカウント
- Python パッケージ: `aiohttp` と `cryptography`
- Hermes を `messaging` エクストラ付きで入れると、ターミナルへの QR コード表示も一緒に入ります

必要な依存関係をインストールします。

```bash
pip install aiohttp cryptography
# Optional: for terminal QR code display
cd ~/.hermes/hermes-agent && uv pip install -e ".[messaging]"
```

## 設定 {#setup}

### 1. セットアップウィザードを実行する {#1-run-the-setup-wizard}

WeChat アカウントをつなぐいちばん簡単な方法は、対話式のセットアップです。

```bash
hermes gateway setup
```

選択肢が出たら **Weixin** を選びます。ウィザードは次の流れで進みます。

1. iLink Bot API に QR コードを要求する
2. ターミナルに QR コードを表示する（または URL を出す）
3. WeChat のスマホアプリで QR コードを読み取るのを待つ
4. スマホ側でログインを承認するよう促す
5. アカウントの認証情報を `~/.hermes/weixin/accounts/` へ自動保存する

承認が終わると、次のようなメッセージが出ます。

```
微信连接成功，account_id=your-account-id
```

ウィザードが `account_id`、`token`、`base_url` を保存するので、手作業で設定する必要はありません。

### 2. 環境変数を設定する {#2-configure-environment-variables}

最初の QR ログインが済んだら、少なくともアカウント ID を `~/.hermes/.env` に書きます。

```bash
WEIXIN_ACCOUNT_ID=your-account-id

# Optional: override the token (normally auto-saved from QR login)
# WEIXIN_TOKEN=your-bot-token

# Optional: restrict access
WEIXIN_DM_POLICY=open
WEIXIN_ALLOWED_USERS=user_id_1,user_id_2

# Optional: restore legacy multiline splitting behavior
# WEIXIN_SPLIT_MULTILINE_MESSAGES=true

# Optional: home channel for cron/notifications
WEIXIN_HOME_CHANNEL=chat_id
WEIXIN_HOME_CHANNEL_NAME=Home
```

### 3. ゲートウェイを起動する {#3-start-the-gateway}

```bash
hermes gateway
```

アダプターが保存済みの認証情報を読み戻し、iLink API に接続して、メッセージのロングポーリングを始めます。

## できること {#features}

- **ロングポーリング通信** — 公開エンドポイント、Webhook、WebSocket のいずれも不要
- **QR コードログイン** — `hermes gateway setup` で読み取るだけの接続手順
- **DM のやり取り** — アクセス方針を設定可能。グループでのやり取りは、つないだ人格に対して iLink が実際にグループのイベントを届けるかどうか次第です（iLink ボットのアカウントでは届かないことが多い。上の警告を参照）
- **メディア対応** — 画像、動画、ファイル、音声メッセージ
- **AES-128-ECB 暗号化 CDN** — すべてのメディア転送を自動で暗号化・復号
- **コンテキストトークンの永続化** — ディスクに保存し、再起動をまたいで返信のつながりを保つ
- **Markdown の書式** — 見出し、表、コードブロックを含めて Markdown をそのまま残すので、Markdown に対応した WeChat クライアントならそのまま表示できます
- **賢いメッセージ分割** — 上限内なら 1 つの吹き出しのまま。大きすぎるものだけを区切りのよい位置で分けます
- **入力中の表示** — エージェントが処理している間、WeChat クライアントに「入力中…」を表示します
- **SSRF 対策** — 送信するメディアの URL をダウンロード前に検証します
- **メッセージの重複排除** — 5 分間のスライディングウィンドウで二重処理を防ぎます
- **バックオフ付きの自動再試行** — 一時的な API エラーから復帰します

## 設定できる項目 {#configuration-options}

`config.yaml` の `platforms.weixin.extra` の下に書きます。

| キー | 既定値 | 説明 |
|-----|---------|-------------|
| `account_id` | — | iLink Bot のアカウント ID（必須） |
| `token` | — | iLink Bot のトークン（必須。QR ログイン時に自動保存） |
| `base_url` | `https://ilinkai.weixin.qq.com` | iLink API のベース URL |
| `cdn_base_url` | `https://novac2c.cdn.weixin.qq.com/c2c` | メディア転送用 CDN のベース URL |
| `dm_policy` | `open` | DM のアクセス: `open`、`allowlist`、`disabled`、`pairing` |
| `group_policy` | `disabled` | グループのアクセス: `open`、`allowlist`、`disabled` |
| `allow_from` | `[]` | DM を許可するユーザー ID（dm_policy=allowlist のとき） |
| `group_allow_from` | `[]` | 許可するグループ ID（group_policy=allowlist のとき） |
| `split_multiline_messages` | `false` | `true` にすると、複数行の返信を複数のメッセージに分けて送ります（従来の動き）。`false` なら、長さの上限を超えないかぎり複数行の返信を 1 通のままにします。 |
| `text_batch_delay_seconds` | `3.0` | 短時間に届いたテキストをまとめて 1 回のリクエストとして流すまでの待ち時間（秒）。iLink はメッセージを 1 通ずつ届けるため、この待ち時間があると断片ごとにエージェントが動くのを避けられます。`0` にすると 1 通ごとにすぐ処理します。 |
| `text_batch_split_delay_seconds` | `5.0` | 直近の断片が分割のしきい値に近いとき（iLink が長文を分けた可能性があるとき）に使う、長めの待ち時間。 |

## アクセス方針 {#access-policies}

### DM の方針 {#dm-policy}

だれがボットにダイレクトメッセージを送れるかを決めます。

| 値 | 動き |
|-------|----------|
| `open` | だれでもボットに DM を送れます（既定） |
| `allowlist` | `allow_from` にあるユーザー ID だけが DM を送れます |
| `disabled` | DM をすべて無視します |
| `pairing` | ペアリングモード（初回の設定用） |

```bash
WEIXIN_DM_POLICY=allowlist
WEIXIN_ALLOWED_USERS=user_id_1,user_id_2
```

`WEIXIN_ALLOWED_USERS` は **受信側のフィルター** であって、招待の仕組みではありません。QR
ログインで Hermes につながるのは 1 つの iLink ボット人格です。ほかの人が自分のアカウントで
Hermes の QR コードを読み取るわけではありません。つながっている iLink
のボット／連絡先へ WeChat から話しかけてもらう形になり、Hermes が DM を処理するのは送信者の
Weixin ユーザー ID が `WEIXIN_ALLOWED_USERS` にある場合だけです。

実際の手順は次のようになります。

1. `hermes gateway setup` で Hermes を一度ペアリングし、つながった iLink ボットの
   アカウントを控えます。
2. 許可したい人それぞれに、そのボット／連絡先へダイレクトメッセージを送ってもらいます。
3. ゲートウェイのログか、受信したイベントの中身から送信者のユーザー ID を読み取ります。
4. その ID を `WEIXIN_ALLOWED_USERS` に追加し、ゲートウェイを再起動します。

QR コードを読み取ったアカウントとしか会話できない場合は、ほかの人が QR ログインに使った個人の
WeChat アカウントではなく iLink のボット人格そのものへ話しかけているかを確認してください。iLink
ボットは独立した人格で、普通の WeChat の連絡先やグループの経路はテンセントの iLink の挙動によって
制限されることがあります。

### グループの方針 {#group-policy}

**つないだ人格に対して iLink がグループのイベントを届ける場合に**、ボットがどのグループで反応するかを決めます。QR ログインの iLink ボット人格（例: `...@im.bot`）では、そもそもグループのイベントが届かないのが普通なので、この方針が効かないことがあります。ページ冒頭の iLink ボットの制約に関する警告を参照してください。

| 値 | 動き |
|-------|----------|
| `open` | すべてのグループで反応します（イベントが届く場合） |
| `allowlist` | `group_allow_from` に並べたグループ ID でだけ反応します（イベントが届く場合） |
| `disabled` | グループのメッセージをすべて無視します（既定） |

```bash
WEIXIN_GROUP_POLICY=allowlist
# NOTE: this is a comma-separated list of group chat IDs, NOT member user IDs,
# despite the variable name containing "USERS". Keep this in mind when configuring.
WEIXIN_GROUP_ALLOWED_USERS=group_id_1,group_id_2
```

:::note
Weixin ではグループの方針の既定値が `disabled` です（既定が `open` の WeCom とは違います）。これは意図的な設計です。個人の WeChat アカウントは多くのグループに入っていることがあり、iLink ボットの人格はそもそも普通の WeChat グループのメッセージを受け取れないのが普通だからです。`WEIXIN_GROUP_POLICY` を `disabled` 以外にすると、ゲートウェイは起動時に `WARNING` をログへ出します。
:::

## メディアへの対応 {#media-support}

### 受信 {#inbound-receiving}

アダプターはユーザーからのメディア添付を受け取り、WeChat の CDN からダウンロードして復号し、エージェントが扱えるようローカルにキャッシュします。

| 種類 | 扱い方 |
|------|-----------------| 
| **画像** | ダウンロードして AES で復号し、JPEG としてキャッシュします。 |
| **動画** | ダウンロードして AES で復号し、MP4 としてキャッシュします。 |
| **ファイル** | ダウンロードして AES で復号し、キャッシュします。元のファイル名は保たれます。 |
| **音声** | テキストの書き起こしがあればそれをテキストとして取り出します。なければ音声（SILK 形式）をダウンロードしてキャッシュします。 |

**引用されたメッセージ:** 引用（返信元）のメッセージに含まれるメディアも取り出すので、ユーザーが何に返信しているかをエージェントが把握できます。

### AES-128-ECB で暗号化された CDN {#aes-128-ecb-encrypted-cdn}

WeChat のメディアファイルは暗号化された CDN を通ってやり取りされます。アダプターはこれを裏側で処理します。

- **受信:** 暗号化されたメディアを `encrypted_query_param` の URL で CDN からダウンロードし、メッセージに入っているファイルごとの鍵で AES-128-ECB を使って復号します。
- **送信:** ファイルをローカルでランダムな AES-128-ECB 鍵を使って暗号化し、CDN へアップロードして、暗号化された参照を送信メッセージに含めます。
- AES の鍵は 16 バイト（128 ビット）です。鍵は生の base64 で来ることも 16 進数で来ることもあり、アダプターはどちらの形式にも対応します。
- これには Python の `cryptography` パッケージが必要です。

設定は要りません。暗号化と復号は自動で行われます。

### 送信 {#outbound-sending}

| メソッド | 送るもの |
|--------|--------------|
| `send` | Markdown 書式のテキストメッセージ | 
| `send_image` / `send_image_file` | 画像そのものとして送るメッセージ（CDN へアップロード） |
| `send_document` | 添付ファイル（CDN へアップロード） |
| `send_video` | 動画メッセージ（CDN へアップロード） |

送信するメディアはすべて、暗号化された CDN へのアップロードの流れを通ります。

1. ランダムな AES-128 の鍵を作る
2. AES-128-ECB と PKCS#7 パディングでファイルを暗号化する
3. iLink API（`getuploadurl`）にアップロード先の URL を要求する
4. 暗号文を CDN へアップロードする
5. 暗号化されたメディアの参照を付けてメッセージを送る

## コンテキストトークンの永続化 {#context-token-persistence}

iLink Bot API は、相手ごとに送信メッセージへ `context_token` を付け返すことを求めます。アダプターはコンテキストトークンをディスクに保存して管理します。

- トークンはアカウントと相手の組ごとに `~/.hermes/weixin/accounts/<account_id>.context-tokens.json` へ保存されます
- 起動時に、保存済みのトークンを読み戻します
- メッセージを受け取るたびに、その送信者のトークンを更新します
- 送信メッセージには最新のコンテキストトークンが自動で付きます

これにより、ゲートウェイを再起動しても返信のつながりが保たれます。

## Markdown の書式 {#markdown-formatting}

iLink Bot API を通してつながる WeChat クライアントは Markdown をそのまま表示できるので、アダプターは Markdown を書き換えずに残します。

- **見出し** は Markdown の見出し（`#`、`##`、…）のまま
- **表** は Markdown の表のまま
- **コードフェンス** はフェンス付きコードブロックのまま
- **余分な空行** は、フェンス付きコードブロックの外では 2 つの改行にまとめられます

## メッセージの分割 {#message-chunking}

プラットフォームの上限に収まるかぎり、メッセージは 1 通として届きます。大きすぎるものだけが分割されます。

- メッセージの最大長: **4000 文字**
- 上限内なら、段落や改行が複数あっても 1 通のままです
- 大きすぎるメッセージは、区切りのよい位置（段落、空行、コードフェンス）で分かれます
- コードフェンスはできるかぎりそのまま保たれます（フェンス自体が上限を超えないかぎり、途中で分けません）
- 大きすぎる 1 ブロックは、基底アダプターの切り詰め処理に回ります
- 複数に分けて送るときは、WeChat のレート制限による取りこぼしを防ぐため、断片の間に 0.3 秒の間隔を置きます

## 入力中の表示 {#typing-indicators}

アダプターは WeChat クライアントに入力中の状態を出します。

1. メッセージが届くと、アダプターは `getconfig` API で `typing_ticket` を取得します
2. 入力中チケットはユーザーごとに 10 分間キャッシュされます
3. `send_typing` が入力開始の合図を、`stop_typing` が入力終了の合図を送ります
4. エージェントがメッセージを処理している間、ゲートウェイが自動で入力中の表示を出します

## ロングポーリング接続 {#long-poll-connection}

このアダプターは、メッセージの受信に WebSocket ではなく HTTP のロングポーリングを使います。

### 仕組み {#how-it-works}

1. **接続:** 認証情報を検証してポーリングのループを始めます
2. **ポーリング:** タイムアウト 35 秒で `getupdates` を呼びます。サーバーはメッセージが届くかタイムアウトするまでリクエストを保持します
3. **振り分け:** 受信したメッセージは `asyncio.create_task` で並行して処理されます
4. **同期バッファー:** 同期位置（`get_updates_buf`）をディスクへ保存するので、再起動しても正しい位置から再開できます

### 再試行の動き {#retry-behavior}

API エラーが起きたとき、アダプターは単純な再試行を行います。

| 状況 | 動き |
|-----------|----------|
| 一時的なエラー（1〜2 回目） | 2 秒後に再試行 |
| エラーが続く（3 回目以降） | 30 秒待ってからカウンターをリセット |
| セッション切れ（`errcode=-14`） | 10 分間停止（再ログインが必要な場合あり） |
| タイムアウト | すぐに再ポーリング（ロングポーリングの通常の動き） |

### 重複排除 {#deduplication}

受信メッセージはメッセージ ID を使って 5 分間の窓で重複排除されます。これにより、ネットワークの乱れやポーリング応答の重なりによる二重処理を防ぎます。

### トークンのロック {#token-lock}

1 つのトークンを同時に使える Weixin ゲートウェイは 1 つだけです。アダプターは起動時にスコープ付きのロックを取り、終了時に解放します。同じトークンを別のゲートウェイがすでに使っている場合、起動は失敗し、その旨のエラーメッセージが出ます。

## 環境変数の一覧 {#all-environment-variables}

| 変数 | 必須 | 既定値 | 説明 |
|----------|----------|---------|-------------|
| `WEIXIN_ACCOUNT_ID` | ✅ | — | iLink Bot のアカウント ID（QR ログインで取得） |
| `WEIXIN_TOKEN` | ✅ | — | iLink Bot のトークン（QR ログイン時に自動保存） |
| `WEIXIN_BASE_URL` | — | `https://ilinkai.weixin.qq.com` | iLink API のベース URL |
| `WEIXIN_CDN_BASE_URL` | — | `https://novac2c.cdn.weixin.qq.com/c2c` | メディア転送用 CDN のベース URL |
| `WEIXIN_DM_POLICY` | — | `open` | DM のアクセス方針: `open`、`allowlist`、`disabled`、`pairing` |
| `WEIXIN_GROUP_POLICY` | — | `disabled` | グループのアクセス方針: `open`、`allowlist`、`disabled` |
| `WEIXIN_ALLOWED_USERS` | — | _(空)_ | DM の許可リストに入れるユーザー ID をカンマ区切りで |
| `WEIXIN_GROUP_ALLOWED_USERS` | — | _(空)_ | グループの許可リストに入れる **グループチャットの ID**（メンバーのユーザー ID ではありません）をカンマ区切りで。変数名は昔の名残で、期待されるのはグループ ID であってユーザー ID ではありません。 |
| `WEIXIN_HOME_CHANNEL` | — | — | 定期実行や通知の出力先チャット ID |
| `WEIXIN_HOME_CHANNEL_NAME` | — | `Home` | ホームチャンネルの表示名 |
| `WEIXIN_ALLOW_ALL_USERS` | — | — | すべてのユーザーを許可するゲートウェイ側のフラグ（セットアップウィザードが使います） |

## 困ったときは {#troubleshooting}

| 症状 | 対処 |
|---------|-----|
| `Weixin startup failed: aiohttp and cryptography are required` | 両方をインストールします: `pip install aiohttp cryptography` |
| `Weixin startup failed: WEIXIN_TOKEN is required` | `hermes gateway setup` を実行して QR ログインを済ませるか、`WEIXIN_TOKEN` を手で設定します |
| `Weixin startup failed: WEIXIN_ACCOUNT_ID is required` | `.env` に `WEIXIN_ACCOUNT_ID` を設定するか、`hermes gateway setup` を実行します |
| `Another local Hermes gateway is already using this Weixin token` | 先に別のゲートウェイを止めてください。1 つのトークンにつきポーリングは 1 つだけです |
| セッション切れ（`errcode=-14`） | ログインのセッションが切れています。`hermes gateway setup` をもう一度実行して、新しい QR コードを読み取ってください |
| 設定中に QR コードの期限が切れた | QR コードは最大 3 回まで自動で更新されます。それでも切れ続ける場合はネットワーク接続を確認してください |
| ボットが DM に反応しない | `WEIXIN_DM_POLICY` を確認します。`allowlist` なら、送信者が `WEIXIN_ALLOWED_USERS` に入っている必要があります |
| ボットがグループのメッセージを無視する | グループの方針は既定で `disabled` です。`WEIXIN_GROUP_POLICY=open` か `allowlist` にします。ただし QR ログインの iLink ボット人格（`...@im.bot`）は、そもそも普通の WeChat グループのメッセージを受け取れないのが普通です。ゲートウェイのログにグループのメッセージの生イベントがまったく出ていない場合、制約は iLink 側にあり、Hermes 側の問題ではありません。 |
| メディアのダウンロードやアップロードが失敗する | `cryptography` が入っているか確認します。`novac2c.cdn.weixin.qq.com` へのネットワーク接続も確認してください |
| `Blocked unsafe URL (SSRF protection)` | 送信するメディアの URL が私設・内部のアドレスを指しています。公開 URL だけが許可されます |
| 音声メッセージがテキストで表示される | WeChat が書き起こしを返す場合、アダプターはそのテキストを使います。想定どおりの動きです |
| メッセージが重複して見える | アダプターはメッセージ ID で重複を除きます。重複が見える場合は、ゲートウェイが複数動いていないか確認してください |
| `iLink POST ... HTTP 4xx/5xx` | iLink 側の API エラーです。トークンが有効か、ネットワークがつながっているかを確認してください |
| ターミナルに QR コードが表示されない | messaging エクストラ付きで入れ直します: `cd ~/.hermes/hermes-agent && uv pip install -e ".[messaging]"`。あるいは QR コードの上に出力された URL を開いてください |
