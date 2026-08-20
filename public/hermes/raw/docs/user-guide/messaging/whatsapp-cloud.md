---
title: "WhatsApp Business（Cloud API）"
description: "Meta 公式の Business Cloud API を使って Hermes Agent を WhatsApp のボットとして設定する"
upstream_path: user-guide/messaging/whatsapp-cloud.md
upstream_blob: dc07114df44f1882af12dbe3030277125db1b1de
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/whatsapp-cloud
---

# WhatsApp Business Cloud API の設定 {#whatsapp-business-cloud-api-setup}

Hermes は Meta の **公式** の WhatsApp Business Cloud API を通して WhatsApp につながります。本番の運用に耐える経路で、Node.js のブリッジの子プロセスも QR コードも要らず、アカウントが止められる心配もありません。

そのかわり、次の条件が付きます。

- **Meta の business アカウント** が必要です（個人の WhatsApp ではありません）。
- ボットは個人の番号ではなく、business 用に用意した電話番号で動きます。
- Meta が受信したメッセージを webhook で届けられるよう、Hermes のゲートウェイに **公開の HTTPS の URL** が必要です。
- 相手が最後に送ってから 24 時間を過ぎて返事をする場合は、あらかじめ承認された **テンプレート** が要ります（これは Meta の「カスタマーサービスの時間枠」の決まりで、Hermes 側の制限ではありません）。

この条件が合わない場合は、[Baileys ブリッジのつなぎ方](/hermes/docs/user-guide/messaging/whatsapp/) が代わりの手段です。個人のアカウントで使えて公開の URL も要りませんが、非公式でアカウントが止められやすくなります。

:::tip どちらを選べばよいですか
- **Cloud API（この手引き）** — business として本格的にボットを動かし、安定を求める場合。Meta の審査とテンプレートの手続きを受け入れられるとき
- **[Baileys ブリッジ](/hermes/docs/user-guide/messaging/whatsapp/)** — 個人の用途、手早い試用、一人で使う構成。ボット用の電話番号のアカウントが止められる危険を受け入れられるとき
:::

---

## すぐ始める {#quick-start}

```bash
hermes whatsapp-cloud
```

ウィザードは必要な資格情報を一つずつ案内し、貼り付けるたびに中身を確かめます（いちばん多いつまずき、つまり Phone Number ID の欄に電話番号を貼ってしまう間違いもここで見つかります）。ウィザードの外でやることについても（cloudflared の起動、Meta の webhook の画面での設定）、そのまま実行できる手順を表示します。

このページの残りは、手作業で設定するときの一覧です。

---

## 事前に必要なもの {#prerequisites}

1. **Meta の business アカウント**。 [business.facebook.com](https://business.facebook.com/) で作ります。
2. **WhatsApp を有効にした Meta のアプリ**。 下の「Meta のアプリを作る」を見てください。
3. **手元のポートを HTTPS で公開する手段**。 Cloudflare Tunnel（`cloudflared`）がおすすめです。無料で、ポートの転送もドメインも要りません。 ngrok、自前のドメインにリバースプロキシと TLS を組み合わせる方法、ゲートウェイを公開 IP に直接つないだ VPS でも構いません。
4. **必須ではありませんがおすすめ**: `PATH` の通った場所に ffmpeg があると、送り出す音声メッセージが MP3 の添付ではなく WhatsApp 本来のボイスメッセージ（緑の波形の吹き出し）として届きます。なくても Hermes はそのまま動きます。

---

## Meta のアプリを作る {#creating-the-meta-app}

1. [developers.facebook.com/apps](https://developers.facebook.com/apps) を開き、**アプリを作成** を選びます。
2. 用途は **「WhatsApp でお客様とつながる」** を選び、**次へ** に進みます。
3. business ポートフォリオを選ぶか、新しく作ります。 公開の条件に目を通します。 確認して **アプリを作成** を押します。
4. 作成が終わると **用途をカスタマイズ → WhatsApp で接続 → クイックスタート** の画面になります。 **API を使ってみる** を押すと **API Setup** のページに移ります。
5. WhatsApp ビジネスアカウント（WABA）がひもづいているか確かめます。 手順 3 で新しいポートフォリオを作った場合は自動で作られています。 API Setup のページで確認できます。

画面から次の値を控えます。ウィザードもこの順に聞いてきます。

| 値 | 画面での場所 | 形 | 補足 |
|---|---|---|---|
| **Phone Number ID** | アプリの画面 → WhatsApp → API Setup →「From」の選択欄の下 | 数字 15〜17 桁 | 電話番号そのものでは **ありません**。ここに実際の電話番号を貼ってしまうのが、いちばん多い間違いです。 |
| **Access Token** | アプリの画面 → WhatsApp → API Setup →「アクセストークンを生成」 | `EAA` で始まる 100 文字以上 | 一時的なトークンは 24 時間で切れます。本番では下の「期限のないトークン」を見てください。 |
| **App Secret** | アプリの画面 → 設定 → ベーシック → App secret の横の「表示」 | 小文字の 16 進数 32 文字 | 届いた webhook の署名を確かめるために使います。 これがないと、受信は 503 で拒まれます。 |
| **App ID**（任意） | アプリの画面 → 設定 → ベーシック | 数字 15〜16 桁 | メッセージのやり取りには要りませんが、分析に使えます。 |
| **WABA ID**（任意） | アプリの画面 → WhatsApp → API Setup → 上のほう | 数字 15 桁以上 | メッセージのやり取りには要りませんが、分析に使えます。 |

---

## 期限のないトークン（本番向け） {#permanent-token-production}

一時的なアクセストークンは **24 時間** で切れます。 つまり今日作ったトークンは明日には使えません。 本番で動かすなら **システムユーザーの期限なしトークン** を使います。

1. [business.facebook.com/latest/settings](https://business.facebook.com/latest/settings) を開き、左側の **システムユーザー** を選びます。
2. **追加** を押し、名前を付け（たとえば `hermes-bot`）、役割は **管理者** にします。
3. 作ったユーザーを選び、**アセットを割り当て** を押します。
   - アプリを選び、フルコントロールの下の **アプリの管理** を有効にします。
   - WhatsApp のアカウントを選び、フルコントロールの下の **WhatsApp ビジネスアカウントの管理** を有効にします。
   - **アセットを割り当て** を押します。
4. 次の権限を付けて **トークンを生成** します。
   - `business_management`
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
5. **トークンの有効期限: 無期限** にします。
6. トークンをコピーし、`~/.hermes/.env` の `WHATSAPP_CLOUD_ACCESS_TOKEN` を書き換えて、ゲートウェイを再起動します。

システムユーザーのトークンは、自分で取り消さないかぎり期限が切れません。

---

## Hermes をインターネットから届くようにする {#exposing-hermes-to-the-internet}

Cloud API は受信したメッセージを webhook の URL に HTTPS の POST で届けます。 つまり Hermes のゲートウェイに Meta のサーバーから届く必要があります。 よく使われる方法は三つです。

### Cloudflare Tunnel（おすすめ） {#cloudflare-tunnel-recommended}

無料で、ポートの転送も要らず、Windows / macOS / Linux のどれでも動きます。 ゲートウェイとは別のプロセスとして動かします。

**入れる:**

```bash
# Windows
winget install Cloudflare.cloudflared

# macOS
brew install cloudflared

# Linux
# Download the binary from https://github.com/cloudflare/cloudflared/releases
```

**手早いトンネルを動かす**（Cloudflare のアカウントは要りません。`https://<random>.trycloudflare.com` という URL がもらえます）

```bash
cloudflared tunnel --url http://localhost:8090
```

表示された URL を控えておきます。これを Meta に登録します。

:::warning 手早いトンネルの URL は変わります
無料の手早いトンネルの URL は、`cloudflared` を再起動するたびに変わります。 URL を固定したいときは `cloudflared tunnel login` でログインし、名前付きのトンネルを作ります。 無料の Cloudflare アカウントでも名前付きのトンネルは数に制限がありません。 手順は [Cloudflare のドキュメント](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/) を見てください。
:::

### ngrok {#ngrok}

```bash
ngrok http 8090
```

無料の枠では再起動のたびに URL が変わります。 有料の枠なら固定のサブドメインが使えます。

### 自前のドメイン + リバースプロキシ {#your-own-domain-reverse-proxy}

TLS の証明書を持つサーバー（Caddy、nginx など）がすでにあるなら、`localhost:8090` に転送する経路を作ります。 本番ではいちばん安定しますが、あらかじめ設備が要ります。

---

## Meta 側で webhook を設定する {#configuring-the-webhook-on-metas-side}

トンネルが動いたら、次のように進めます。

1. トンネルが表示した公開の URL を控えます。ここでは `https://abc123.trycloudflare.com` とします。
2. **Verify Token** を作ります。ウィザードは `secrets.token_urlsafe(32)` で自動的に作ります。手作業で設定するなら次を実行します。
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```
   できた文字列を `~/.hermes/.env` に `WHATSAPP_CLOUD_VERIFY_TOKEN` として保存します。
3. Hermes のゲートウェイを起動します: `hermes gateway`。
4. Meta のアプリの画面で **WhatsApp → 設定**（画面の版によっては **ユースケース → カスタマイズ → 設定**）を開き、Webhook の欄の **編集** を押します。
5. 次を入力します。
   - **コールバック URL**: `https://abc123.trycloudflare.com/whatsapp/webhook`
   - **Verify Token**: 手順 2 の文字列（一字一句そろえます）
6. **確認して保存** を押します。 Meta がその URL に GET を送り、ゲートウェイが受け取った文字列をそのまま返すと、Meta 側で webhook が確認済みになります。
7. **Webhook フィールド** の **管理** を押し、**messages** を購読します。 これで Meta が実際に受信メッセージを webhook に届けるようになります。

**やり取りを自分で確かめる**（三つ目の端末から）

```bash
TUNNEL="https://abc123.trycloudflare.com"
VERIFY="<your verify token>"

# Should print HTTP 200 with body "hello"
curl -i "$TUNNEL/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=$VERIFY&hub.challenge=hello"

# Health endpoint — should show verify_token_configured: true and app_secret_configured: true
curl "$TUNNEL/health"
```

---

## 送り先の許可リスト（Meta 側） {#recipient-whitelist-meta-side}

開発中（アプリが App Review を通る前）は、ボットがメッセージを送れる番号を Meta が制限します。

1. アプリの画面 → WhatsApp → API Setup → **To** の選択欄を開きます。
2. **電話番号リストを管理** を押します。
3. メッセージを送りたい番号（自分、同僚、協力してくれる試用者）を登録します。 Meta が SMS か WhatsApp で 6 桁の確認コードを送ります。

開発中は最大 5 件までです。 App Review を通すとこの上限はなくなります。

---

## 許可リスト（Hermes 側） {#allowlist-hermes-side}

Meta の送り先の許可リストとは別に、Hermes にもプラットフォームごとの許可リストがあり、**エージェントがどの受信メッセージを処理するか** を決めます。 `~/.hermes/.env` に次を書き足します。

```bash
# Comma-separated phone numbers, country code, no '+' / spaces / dashes
WHATSAPP_CLOUD_ALLOWED_USERS=15551234567,15557654321

# Or allow everyone (only safe in combination with Meta's recipient whitelist)
# WHATSAPP_CLOUD_ALLOW_ALL_USERS=true
```

ウィザードでは手順 6 でこれを設定します。 許可リストがないと **届いたメッセージはすべて拒まれます**。 これは意図した動きで、Meta 側の送り先の制限がゆるんだときにも、知らない番号からボットを動かされないようにするためです。

---

## ボットの WhatsApp のプロフィールを整える {#polishing-your-bots-whatsapp-profile}

WhatsApp は、チャットの見出しや連絡先の一覧にボットの **名前とプロフィール写真** を表示します。これらは Cloud API からは設定できず、Meta の Business Manager で決めます。

ボットが動くようになったら **[business.facebook.com/wa/manage/phone-numbers](https://business.facebook.com/wa/manage/phone-numbers/)** を開き、自分の電話番号を選びます。次の項目があります。

| 項目 | 場所 | 補足 |
|---|---|---|
| **表示名** | 電話番号のページの上部 | 変更は Meta の名前の審査を通ります（24〜48 時間ほど）。 |
| **プロフィール写真** | 電話番号のページの上部 | 正方形で 640×640 ピクセル以上がおすすめです。すぐ反映されます。 |
| **紹介文 / 説明 / ウェブサイト / メール / 営業時間 / カテゴリー** | 「プロフィールを編集」ボタン | 利用者がボットの名前をタップしたときの情報欄に出ます。見た目だけの項目です。 |
| **認証バッジ**（緑のチェックマーク） | Business Manager → セキュリティセンター → 認証を開始 | Meta の business の認証手続きが別に必要です。 |

`hermes whatsapp-cloud` のウィザードは、設定の最後にこれらのリンクを表示します。ボットを動かすだけならどれも必須ではなく、利用者からの見え方を整えるためのものです。

---

## 設定の一覧 {#configuration-reference}

設定はすべて `~/.hermes/.env` に書きます。 必須の項目は **太字** にしてあります。

| 変数 | 初期値 | 説明 |
|---|---|---|
| **`WHATSAPP_CLOUD_PHONE_NUMBER_ID`** | — | API Setup にある 15〜17 桁の ID です。 電話番号では **ありません**。 |
| **`WHATSAPP_CLOUD_ACCESS_TOKEN`** | — | Meta のアクセストークン（`EAA` で始まります）。 24 時間の一時的なものか、システムユーザーの期限なしのものです。 |
| **`WHATSAPP_CLOUD_APP_SECRET`** | — | 設定 → ベーシック にある 16 進数 32 文字。 これがないと受信は 503 で拒まれます。 |
| **`WHATSAPP_CLOUD_VERIFY_TOKEN`** | — | GET のやり取りで使う合言葉です。 ウィザードが自動で作ります。 |
| **`WHATSAPP_CLOUD_ALLOWED_USERS`** | — | ボットにメッセージを送れる wa_id をカンマ区切りで書きます。 |
| `WHATSAPP_CLOUD_ALLOW_ALL_USERS` | `false` | `true` にすると許可リストを使いません。 |
| `WHATSAPP_CLOUD_APP_ID` | — | 任意です。今後の分析との連携に使います。 |
| `WHATSAPP_CLOUD_WABA_ID` | — | 任意です。今後の分析との連携に使います。 |
| `WHATSAPP_CLOUD_WEBHOOK_HOST` | 未設定（IPv4 と IPv6 の両方で、すべての接続口） | webhook のサーバーが待ち受ける接続口です。 |
| `WHATSAPP_CLOUD_WEBHOOK_PORT` | `8090` | webhook のサーバーが待ち受けるポートです。 トンネルの転送先と合わせます。 |
| `WHATSAPP_CLOUD_WEBHOOK_PATH` | `/whatsapp/webhook` | Meta が POST を送る URL の経路です。 |
| `WHATSAPP_CLOUD_API_VERSION` | `v20.0` | Meta の Graph API の版です。Meta のドキュメントで新しい版がすすめられているときだけ変えてください。 |
| `WHATSAPP_CLOUD_HOME_CHANNEL` | — | ボットの既定の送り先にする wa_id です（cron ジョブなどで使います）。 |

Baileys（`whatsapp`）と Cloud（`whatsapp_cloud`）のアダプターは、別々の電話番号を相手にして **両方同時に** 動かせます。

---

## できること {#features}

### 受け取る側 {#inbound}

- **文章のメッセージ** — そのままエージェントに渡されます。
- **画像** — 自動で取り込まれ、エージェントへの入力に添えられます。画像を直接読めるモデル（Claude、GPT-4o、Gemini など）はそのまま見ます。読めないモデルには自動で作った説明文が渡ります。
- **ボイスメッセージ** — `.ogg` として取り込み、設定した音声認識の提供元（手元の faster-whisper、OpenAI/Nous、Groq など）で文字に起こしてからエージェントに渡します。
- **書類** — 自動で取り込みます。文字として読める小さなファイル（`.txt`、`.md`、`.json`、`.py`、`.csv` など）は 100KB までならエージェントへの入力に直接埋め込まれ、ツールを呼ばずに読めます。大きなファイルは手元に保存され、エージェントのほかのツールから使えます。
- **ボタンのタップ** — ボットが先に送ったボタン（選択肢の質問、コマンドの承認、スラッシュコマンドの確認）を利用者がタップすると、そのまま対応する処理へ渡されます。古くなったタップは、ふつうの文章の入力として扱われます。
- **返信の文脈** — 利用者がボットの以前のメッセージに返信すると、エージェントはもとのメッセージも文脈として受け取ります。

### 送る側 {#outbound}

- **文章** — マークダウンは WhatsApp 独自の書式に自動で置き換えられます（`**bold**` → `*bold*`、`~~strike~~` → `~strike~`、見出しは太字、`[link](/hermes/docs/user-guide/messaging/url/)` → `link (url)`）。長いメッセージは 4096 文字ごとに分けられます。
- **画像** — エージェントが作った画像も、手元の画像ファイルも送れます。写真の添付として届きます。
- **音声メッセージ** — 音声合成の出力を ffmpeg で変換し、WhatsApp 本来のボイスメッセージ（緑の波形）として送ります。ffmpeg がない場合は MP3 の音声の添付になります。下の「音声メッセージ」を見てください。
- **動画・書類** — どちらも送れます。そのままの形式の添付として届きます。

### タップで答えられるやり取り {#interactive-ux}

次の場面では、Hermes は WhatsApp が備えるやり取り用のメッセージを使います。「番号で返事してください」と頼む代わりに、タップして答えられるボタンが出ます。

- **`clarify` ツール** — 選択肢のある質問は、クイック返信のボタン（選択肢が 1〜3 個）か、タップで開く一覧（4 個以上）として表示されます。「✏️ Other」を選ぶと自由に入力でき、その内容が答えとしてエージェントに渡ります。
- **危険なコマンドの承認** — エージェントの端末操作やコード実行が制限のかかったコマンドに当たると、`/approve` や `/deny` と入力する代わりに `✅ Approve` / `❌ Deny` のボタンが出ます。
- **スラッシュコマンドの確認** — `/reload-mcp` のような特別なコマンドでは、`✅ Approve Once` / `🔒 Always` / `❌ Cancel` のボタンが出ます。

ボタンをうまく表示できないとき（古い WhatsApp のクライアントなど）は、どの場面でもふつうの文章に切り替わります。

### 既読と入力中の表示 {#read-receipts-and-typing-indicator}

Hermes は受け取ったメッセージにすぐ反応します。

- ゲートウェイがメッセージを受け取ると、そのメッセージに **青いチェックマーク二つ** が付きます。
- エージェントが返事を用意しているあいだ、WhatsApp のチャットではボットの名前の場所に **「入力中…」** と出ます。
- ボットの最初の返事が届くと、入力中の表示は自動で消えます。

これで、ボットがメッセージを見たのか、まだ返事を作っている途中なのかが見て分かります。

### 音声メッセージ {#voice-messages}

WhatsApp は「ボイスメッセージ」（緑の波形の吹き出し）と、ふつうの音声ファイルの添付を区別します。違いは形式だけで、ボイスメッセージには `audio/ogg` の `opus` が必要です。

Hermes の音声合成が作るのは MP3 です。そこで二つの道があります。

- **PATH に ffmpeg がある場合**（おすすめ） — 送り出す音声は変換され、正しくボイスメッセージとして届きます。入れ方は次のとおりです。
  - Windows: `winget install Gyan.FFmpeg`
  - macOS: `brew install ffmpeg`
  - Linux: パッケージ管理の仕組みから入れます
- **ffmpeg がない場合** — 送り出す音声は MP3 の添付として届きます。再生はできますが、ボイスメッセージの見た目にはなりません。ゲートウェイのログに一度だけ警告が出るので気づけます。

ゲートウェイが ffmpeg を見つけられたかどうかは、状態を返す窓口で確かめられます。

```bash
curl http://localhost:8090/health
# look for "ffmpeg_present": true
```

---

## できないこと {#known-limitations}

### 24 時間の会話の時間枠 {#24-hour-conversation-window}

Meta が **自由な文面のメッセージ** を認めるのは、利用者が最後にメッセージを送ってから 24 時間のあいだだけです。その時間を過ぎると、Meta の API が受け付けるのはあらかじめ承認された **メッセージのテンプレート** だけになります。

**実際に何が起きるか**

- 利用者から届く → ボットが 24 時間以内に返す → 利用者がまた送る、という往復のやり取りはずっと続けられます。ふだんの使い方の 95% 以上はこれで足ります。
- **WhatsApp に届ける cron ジョブ** は、24 時間を超える間があくと Graph のエラー `131047`（"Re-engagement message"）で失敗します。
- **時間のかかる `delegate_task` の非同期の結果** も、24 時間を超えると同じように失敗します。
- **webhook の購読者** から外部の出来事を WhatsApp に流す場合も、利用者が最近ボットにメッセージを送っていなければ失敗します。

Hermes はこの時間枠についてエージェントのシステムプロンプトで注意を与えるので、モデルは遅れて送るメッセージを計画するときにその点に触れられます。

メッセージのテンプレート（時間枠の外へ送るための回避策）への対応は、Hermes ではまだ実装されていません。必要な方は [issue を立ててください](https://github.com/NousResearch/hermes-agent/issues)。予定には入っていますが、はっきりした要望を待っている段階です。

### グループのチャット {#group-chats}

Cloud API のグループへの対応は限られています（Meta が段階ごとに機能を絞っています）。 Hermes の `whatsapp_cloud` アダプターは、いまの版では **個別のやり取りだけ** を扱います。 グループのチャットが必要なら Baileys ブリッジを使ってください。

### 送信の速さの上限 {#outbound-rate-limit}

Meta の初期値では、business の電話番号 1 件あたり **毎秒 80 通** まで送れます。 引き上げも申請できます。 Hermes は今のところこの上限を自分では抑えていないので、極端に大量に送ると Meta 側の上限に当たることがあります。

---

## 困ったときは {#troubleshooting}

### Meta の画面で確認に失敗する（"URL couldn't be validated"） {#setup-verification-fails-url-couldnt-be-validated-in-meta-dashboard}

ほとんどの場合、次のどれかです。

- **トンネルの URL が違うか古い** — cloudflared の手早いトンネルは URL が変わります。 新しい URL を取り、`.env` と Meta の画面の両方を書き換えます。
- **Verify Token が合っていない** — `~/.hermes/.env` の `WHATSAPP_CLOUD_VERIFY_TOKEN` と Meta の画面に入れた文字列は一字一句そろえます。 先に上の curl でゲートウェイ側の確認のやり取りが動くか確かめてください。
- **ゲートウェイが動いていない** — `hermes gateway` が起動しているか確かめます。
- **App Secret を設定していない** — これがないと Hermes は届いた POST を 503 で拒みます。 Meta はそれを「確認できない」と受け取ります。

### `graph error 100`: Object with ID '...' does not exist {#graph-error-100-object-with-id-does-not-exist}

`WHATSAPP_CLOUD_PHONE_NUMBER_ID` に、Phone Number ID（Meta 内部の 15〜17 桁の ID）ではなく電話番号（10〜11 桁）を貼っています。 API Setup のページを見直してください。Phone Number ID は「From」の選択欄の *下* に出ています。

いまはウィザードが入力を確かめて防ぎますが、手作業で設定するときのために覚えておく価値があります。

### `graph error 190`: Authentication Error {#graph-error-190-authentication-error}

アクセストークンが無効です。 細かい番号ごとに次の意味があります。

- `subcode 463` — トークンの期限切れです。 一時的なトークンは 24 時間で切れます。 作り直すか、システムユーザーの期限なしトークンに切り替えます（上を見てください）。
- `subcode 467` — トークンが無効にされました（取り消された、あるいはパスワードが変わった場合です）。
- そのほかの 190 — トークンを作ったときに必要な権限が付いていませんでした。 三つ（`business_management`、`whatsapp_business_messaging`、`whatsapp_business_management`）がすべて選ばれていたか確かめてください。

### `graph error 131047`: Re-engagement message {#graph-error-131047-re-engagement-message}

24 時間の会話の時間枠が過ぎています（「できないこと」を見てください）。 次のどちらかで対応します。

- 利用者に先にボットへメッセージを送ってもらい、時間枠を開き直します。
- Hermes がテンプレートに対応するのを待ちます。

### 受信時に `media metadata fetch failed (status=401)` と出る {#inbound-message-media-metadata-fetch-failed-status401}

送信側の `graph error 190` と原因は同じで、アクセストークンが無効か期限切れです。 トークンを直してください。

### ボットの返事が生の JSON になる、ツールの呼び出しがそのまま出る {#bot-replies-appear-as-raw-json-tool-call-leakage}

よくある原因は、`whatsapp_cloud` に設定したツールの組に、エージェントが呼びたいツールが入っていないことです。 `hermes tools list` を確かめ、このプラットフォームが `hermes-whatsapp`（Cloud のアダプターの既定のツールの組で、Baileys と同じものです）を使っているか見てください。

モデルが正しい形の呼び出しではなく、ツールの呼び出しに似た文章を出す場合、たいていツールの組が実質からっぽになっています。 プラットフォームごとの既定のツールの組の対応は `hermes_cli/platforms.py` にあります。

### 音声の文字起こしが空になる、"could not transcribe" と出る {#stt-voice-note-transcription-returns-empty-could-not-transcribe}

初期値の `stt.provider: local` を使うには `pip install faster-whisper` が要ります。 Nous の購読者なら、代わりに管理されたゲートウェイ経由で音声認識を動かせます。`hermes tools` の音声認識で **Nous Subscription** を選ぶか、次のように直接設定します。

```bash
hermes config set stt.provider nous
hermes gateway restart
```

これなら OpenAI のキーを別に用意せず、Nous Portal のアクセストークンを使えます。（古い説明にあった `stt.use_gateway true` は昔の設定です。いまは提供元の選択だけで経路が決まります。）

---

## セキュリティ上の注意 {#security-notes}

- **App Secret はパスワードと同じように扱ってください** — これを持つ相手は、Hermes が本物と受け取る webhook のデータを偽造できます。
- **Verify Token も合言葉です** — 漏れたときの影響はもう少し小さいものの（最悪の場合、Meta の webhook を別の URL に付け替えられます）、リポジトリに入れないようにしてください。
- **アクセストークンはボットの身分証です** — システムユーザーのトークンは、長く使える API キーと同じです。 動かしている環境が乗っ取られたら、すぐに作り直してください。
- **`WHATSAPP_CLOUD_APP_SECRET` を設定していると、webhook の窓口は署名のある依頼だけを受け付けます** — 開発中も設定したままにしてください。 これがないと、ゲートウェイは受信を HTTP 503 で拒みます。
- **`/health` の窓口には認証がありません** — 設定があるかどうかの真偽値だけを返し、値そのものは出さないので公開しても安全です。 それでも見せたくない場合は、リバースプロキシやトンネルの層で制限してください。

---

## Baileys ブリッジとの比べ方 {#comparison-to-the-baileys-bridge}

| | Baileys（`hermes whatsapp`） | Cloud API（`hermes whatsapp-cloud`） |
|---|---|---|
| アカウントの種類 | 個人 | business |
| 設定 | QR コードの読み取り | Meta のアプリ + WABA + トークン |
| 依存 | Node.js + npm | Python だけ（httpx + aiohttp） |
| 動き方 | Node の子プロセスを管理します | aiohttp の webhook のサーバー |
| 公開の URL は要る？ | いいえ | はい |
| アカウントが止められる危険 | あり（非公式の API） | なし（公式に認められています） |
| 受信 | Node のブリッジが取りにいきます | Meta からの webhook の POST |
| 送信 | 手元のブリッジ → Baileys | graph.facebook.com への HTTPS |
| グループ | 全面的に使えます | 個別のやり取りのみ（v1） |
| 24 時間の時間枠 | 制限なし | 厳密な決まり。過ぎるとテンプレートが必要 |
| ボイスメッセージ（送信） | そのまま送れます | ffmpeg があればそのまま、なければ MP3 |
| 既読 | なし | あり（青いチェックマーク二つ） |
| 入力中の表示 | なし | あり（返事が届くと自動で消えます） |
| タップできるボタン | 文章に切り替わるだけ | 使えます（選択肢の質問、承認、スラッシュコマンドの確認） |
| 本番での利用 | 危うい（Meta に止められることがあります） | そのために作られています |

Hermes を個人の用途で使う人の多くは Baileys を選び、お客さま向けのボットを動かす人の多くは Cloud API を選びます。

---

## あわせて読む {#see-also}

- [Meta 公式の WhatsApp Business Cloud API のドキュメント](https://developers.facebook.com/documentation/business-messaging/whatsapp/) — 土台となる仕組み、料金、App Review、Meta 側の速さの上限について、いちばん確かな情報源です。
- [WhatsApp（Baileys ブリッジ）の設定](/hermes/docs/user-guide/messaging/whatsapp/) — 個人の用途向けのもう一つのつなぎ方です。
- [メッセージのやり取りができる場所の概要](/hermes/docs/user-guide/messaging/) — 対応しているすべてのつなぎ方を見渡せます。
