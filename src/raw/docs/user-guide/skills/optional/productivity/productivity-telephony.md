---
title: "Telephony — Twilio の電話番号の取得、SMS / MMS、AI による発信"
description: "Twilio の電話番号の取得、SMS / MMS、AI による発信"
upstream_path: user-guide/skills/optional/productivity/productivity-telephony.md
upstream_blob: d3f6b81adaf806f5d3896fb7ebb51ae101dc7170
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/productivity/productivity-telephony
---

# Telephony {#telephony}

Twilio の電話番号の取得、SMS / MMS、AI による発信をあつかいます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加で入れるもの — `hermes skills install official/productivity/telephony` で導入します |
| パス | `optional-skills/productivity/telephony` |
| バージョン | `1.0.0` |
| 作者 | Nous Research |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `telephony`, `phone`, `sms`, `mms`, `voice`, `twilio`, `bland.ai`, `vapi`, `calling`, `texting` |
| 関連 skill | [`maps`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-maps/), [`google-workspace`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-google-workspace/), [`agentmail`](/hermes/docs/user-guide/skills/optional/email/email-agentmail/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Telephony — 中核のツールを変えずに電話番号・通話・SMS を使う {#telephony-numbers-calls-and-texts-without-core-tool-changes}

この追加 skill は、電話まわりを中核のツール一覧に入れないまま、Hermes に実用的な電話の機能を持たせます。

補助スクリプト `scripts/telephony.py` が同梱されていて、次のことができます。
- 各サービスの認証情報を `${HERMES_HOME:-~/.hermes}/.env` に保存する
- Twilio の電話番号を探して購入する
- 手に入れた番号を覚えて、後のセッションでも使う
- 自分の番号から SMS / MMS を送る
- webhook のサーバーを立てずに、その番号あての SMS を取りに行く
- TwiML の `<Say>` や `<Play>` を使って Twilio から直接発信する
- 手に入れた Twilio の番号を Vapi に取り込む
- Bland.ai や Vapi を通じて AI に発信させる

## これで何ができるようになるか {#what-this-solves}

この skill は、電話まわりで実際に求められる作業をひととおり用意しています。
- 発信する
- SMS を送る
- 使い回せるエージェント用の番号を持つ
- 後から届いたメッセージを確かめる
- その番号や関連する ID をセッションをまたいで残す
- 受信 SMS の取得やその他の自動化に向けて、電話まわりの持ち主情報を先々まで残す

Hermes をリアルタイムの着信ゲートウェイに変えるものではありません。受信 SMS は Twilio の REST API を定期的に見に行くことで扱います。webhook の仕組みを中核に足さなくても、通知やワンタイムコードの受け取りなど、多くの用途にはこれで足ります。

## 安全のための決まり — 必ず守ってください {#safety-rules-mandatory}

1. 発信や SMS の送信の前には、必ず相手に確認を取ってください。
2. 緊急通報の番号にはかけないでください。
3. 嫌がらせ、迷惑行為、なりすまし、その他の違法な行為に電話の機能を使わないでください。
4. 第三者の電話番号は、取り扱いに注意が要る運用データとして扱ってください。
   - Hermes のメモリーに保存しないでください
   - skill のドキュメント、要約、後続のメモに書かないでください（相手がはっきり望んだ場合を除きます）
5. **エージェントが持っている Twilio の番号** は残してかまいません。利用者の設定の一部だからです。
6. VoIP の番号は、第三者の 2 要素認証に必ず使えるとは限りません。慎重に使い、できることとできないことを相手にはっきり伝えてください。

## どのサービスを使うかの見分け方 {#decision-tree-which-service-to-use}

サービスを決め打ちにせず、次の考え方で選んでください。

### 1）「Hermes に本物の電話番号を持たせたい」 {#1-i-want-hermes-to-own-a-real-phone-number}
**Twilio** を使います。

理由:
- 番号を買って持ち続けるのがいちばん簡単です
- SMS / MMS の対応がいちばん良いです
- 受信 SMS を取りに行く仕組みがいちばん素直です
- あとから着信の webhook や通話の処理に広げやすいです

こんなときに使います:
- 後から SMS を受け取りたい
- デプロイの通知や定期実行の知らせを送りたい
- エージェントの電話番号を固定して使い回したい
- あとで電話を使った認証の流れを試したい

### 2）「いますぐ AI に発信させたいだけ」 {#2-i-only-need-the-easiest-outbound-ai-phone-call-right-now}
**Bland.ai** を使います。

理由:
- 準備がいちばん速いです
- API キーが 1 つで済みます
- 先に自分で番号を買ったり取り込んだりせずに使えます

引き換えになるもの:
- 融通は利きません
- 音声は悪くありませんが、いちばん良いわけでもありません

### 3）「対話する AI の音声品質をいちばん良くしたい」 {#3-i-want-the-best-conversational-ai-voice-quality}
**Twilio + Vapi** を使います。

理由:
- Twilio で自分の番号を持てます
- Vapi のほうが対話の通話品質が高く、音声やモデルの選択肢も多いです

おすすめの手順:
1. Twilio の番号を買って保存します
2. その番号を Vapi に取り込みます
3. 返ってきた `VAPI_PHONE_NUMBER_ID` を保存します
4. `ai-call --provider vapi` を使います

### 4）「あらかじめ録音した音声で発信したい」 {#4-i-want-to-call-with-a-custom-prerecorded-voice-message}
**Twilio から直接発信** して、公開された音声ファイルの URL を指定します。

理由:
- 自前の MP3 を鳴らすのがいちばん簡単です
- Hermes の `text_to_speech` に、公開できるファイル置き場やトンネルを組み合わせると相性が良いです

## ファイルと残る情報 {#files-and-persistent-state}

この skill は電話まわりの情報を 2 か所に残します。

### `${HERMES_HOME:-~/.hermes}/.env` {#hermeshome-hermesenv}
長く使う認証情報と、自分の番号の ID を置きます。たとえば次のものです。
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `TWILIO_PHONE_NUMBER_SID`
- `BLAND_API_KEY`
- `VAPI_API_KEY`
- `VAPI_PHONE_NUMBER_ID`
- `PHONE_PROVIDER`（AI に発信させるときのサービス。bland か vapi です）

### `~/.hermes/telephony_state.json` {#hermestelephonystatejson}
この skill だけが使う、セッションをまたいで残したい情報を置きます。たとえば次のものです。
- 既定として覚えている Twilio の番号 / SID
- 覚えている Vapi の電話番号 ID
- 受信の確認位置として使う、最後に見たメッセージの SID / 日付

つまり、次のようになります。
- 次にこの skill を読み込んだとき、`diagnose` でどの番号が設定済みかがわかります
- `twilio-inbox --since-last --mark-seen` が前回の続きから読めます

## 補助スクリプトの場所を調べる {#locate-the-helper-script}

この skill を入れたら、次のようにしてスクリプトの場所を調べます。

```bash
SCRIPT="$(find ~/.hermes/skills -path '*/telephony/scripts/telephony.py' -print -quit)"
```

`SCRIPT` が空なら、まだ skill が入っていません。

## 導入 {#install}

これは公式の追加 skill なので、Skills Hub から入れます。

```bash
hermes skills search telephony
hermes skills install official/productivity/telephony
```

## 各サービスの準備 {#provider-setup}

### Twilio — 自分の番号、SMS / MMS、直接の発信、受信 SMS の取得 {#twilio-owned-number-smsmms-direct-calls-inbound-sms-polling}

登録はこちらです。
- https://www.twilio.com/try-twilio

そのうえで、認証情報を Hermes に保存します。

```bash
python3 "$SCRIPT" save-twilio ACXXXXXXXXXXXXXXXXXXXXXXXXXXXX your_auth_token_here
```

空いている番号を探します。

```bash
python3 "$SCRIPT" twilio-search --country US --area-code 702 --limit 5
```

番号を買って覚えさせます。

```bash
python3 "$SCRIPT" twilio-buy "+17025551234" --save-env
```

持っている番号を一覧します。

```bash
python3 "$SCRIPT" twilio-owned
```

あとから、そのうちの 1 つを既定にします。

```bash
python3 "$SCRIPT" twilio-set-default "+17025551234" --save-env
# or
python3 "$SCRIPT" twilio-set-default PNXXXXXXXXXXXXXXXXXXXXXXXXXXXX --save-env
```

### Bland.ai — AI に発信させるいちばん簡単な方法 {#blandai-easiest-outbound-ai-calling}

登録はこちらです。
- https://app.bland.ai

設定を保存します。

```bash
python3 "$SCRIPT" save-bland your_bland_api_key --voice mason
```

### Vapi — 対話の音声品質が高い方法 {#vapi-better-conversational-voice-quality}

登録はこちらです。
- https://dashboard.vapi.ai

まず API キーを保存します。

```bash
python3 "$SCRIPT" save-vapi your_vapi_api_key
```

持っている Twilio の番号を Vapi に取り込み、返ってきた電話番号 ID を保存します。

```bash
python3 "$SCRIPT" vapi-import-twilio --save-env
```

Vapi の電話番号 ID がすでにわかっているなら、そのまま保存します。

```bash
python3 "$SCRIPT" save-vapi your_vapi_api_key --phone-number-id vapi_phone_number_id_here
```

## いまの状態を調べる {#diagnose-current-state}

いつでも、この skill が把握している内容を確かめられます。

```bash
python3 "$SCRIPT" diagnose
```

日をあらためて作業を再開するときは、まずこれを実行してください。

## よくある使い方 {#common-workflows}

### A. エージェント用の番号を買って、あとも使い続ける {#a-buy-an-agent-number-and-keep-using-it-later}

1. Twilio の認証情報を保存します。
```bash
python3 "$SCRIPT" save-twilio AC... auth_token_here
```

2. 番号を探します。
```bash
python3 "$SCRIPT" twilio-search --country US --area-code 702 --limit 10
```

3. 買って、`${HERMES_HOME:-~/.hermes}/.env` と状態ファイルに保存します。
```bash
python3 "$SCRIPT" twilio-buy "+17025551234" --save-env
```

4. 次のセッションで、次を実行します。
```bash
python3 "$SCRIPT" diagnose
```
覚えている既定の番号と、受信の確認位置が表示されます。

### B. エージェントの番号から SMS を送る {#b-send-a-text-from-the-agent-number}

```bash
python3 "$SCRIPT" twilio-send-sms "+15551230000" "Your deployment completed successfully."
```

画像などを添える場合は次のとおりです。

```bash
python3 "$SCRIPT" twilio-send-sms "+15551230000" "Here is the chart." --media-url "https://example.com/chart.png"
```

### C. webhook のサーバーなしで、あとから受信 SMS を確かめる {#c-check-inbound-texts-later-with-no-webhook-server}

既定の Twilio の番号あてに届いたものを取りに行きます。

```bash
python3 "$SCRIPT" twilio-inbox --limit 20
```

前回の確認位置より後に届いたものだけを表示し、読み終えたら位置を進めます。

```bash
python3 "$SCRIPT" twilio-inbox --since-last --mark-seen
```

「次にこの skill を読み込んだとき、その番号に届いたメッセージをどう見るのか」への答えが、これです。

### D. Twilio 内蔵の読み上げで直接発信する {#d-make-a-direct-twilio-call-with-built-in-tts}

```bash
python3 "$SCRIPT" twilio-call "+15551230000" --message "Hello! This is Hermes calling with your status update." --voice Polly.Joanna
```

### E. 録音済みの音声で発信する {#e-call-with-a-prerecorded-custom-voice-message}

Hermes に元からある `text_to_speech` を使い回すなら、これが本筋です。

こんなときに使います:
- Twilio の `<Say>` ではなく、Hermes に設定した音声で話させたい
- 一方通行の音声（連絡、警告、冗談、リマインド、状況の報告）を届けたい
- その場でやり取りする通話は **必要ない**

音声は別に用意して置いておき、そのうえで次のようにします。

```bash
python3 "$SCRIPT" twilio-call "+155****0000" --audio-url "https://example.com/briefing.mp3"
```

Hermes の読み上げから Twilio の Play につなぐ、おすすめの流れは次のとおりです。

1. Hermes の `text_to_speech` で音声を作ります。
2. できた MP3 を、外から取りに行ける場所に置きます。
3. `--audio-url` を付けて Twilio から発信します。

エージェントの動きの例です。
- Hermes に `text_to_speech` でメッセージの音声を作らせます
- 必要なら、一時的な静的ホスト / トンネル / オブジェクトストレージの URL でファイルを公開します
- `twilio-call --audio-url ...` で電話として届けます

MP3 の置き場所としては、次が向いています。
- 一時的に公開できるオブジェクトストレージの URL
- 手元の静的ファイルサーバーへ短時間だけ通すトンネル
- 電話のサービスが直接取りに行ける、すでにある HTTPS の URL

大事な補足です。
- Hermes の読み上げは、録音して流す発信にはとても向いています
- **その場でやり取りする AI の通話** には Bland / Vapi のほうが向いています。リアルタイムの音声のやり取りを自前で受け持ってくれるからです
- ここでは、Hermes の音声認識・読み上げだけで双方向の通話をまかなうことは考えていません。それには、この skill が持ち込もうとしているよりずっと重い、ストリーミングや webhook の作り込みが要ります

### F. Twilio の直接発信で自動音声（IVR）をたどる {#f-navigate-a-phone-tree-ivr-with-twilio-direct-calling}

つながった後に番号を押す必要があるなら、`--send-digits` を使います。
Twilio では `w` が短い待ち時間になります。

```bash
python3 "$SCRIPT" twilio-call "+18005551234" --message "Connecting to billing now." --send-digits "ww1w2w3"
```

人につないだり短い連絡を届けたりする前に、目当てのメニューまで進みたいときに役立ちます。

### G. Bland.ai で AI に発信させる {#g-outbound-ai-phone-call-with-blandai}

```bash
python3 "$SCRIPT" ai-call "+15551230000" "Call the dental office, ask for a cleaning appointment on Tuesday afternoon, and if they do not have Tuesday availability, ask for Wednesday or Thursday instead." --provider bland --voice mason --max-duration 3
```

状況を確かめます。

```bash
python3 "$SCRIPT" ai-status <call_id> --provider bland
```

終わったあと、Bland に内容を尋ねます。

```bash
python3 "$SCRIPT" ai-status <call_id> --provider bland --analyze "Was the appointment confirmed?,What date and time?,Any special instructions?"
```

### H. 自分の番号を使って Vapi で AI に発信させる {#h-outbound-ai-phone-call-with-vapi-on-your-owned-number}

1. Twilio の番号を Vapi に取り込みます。
```bash
python3 "$SCRIPT" vapi-import-twilio --save-env
```

2. 発信します。
```bash
python3 "$SCRIPT" ai-call "+15551230000" "You are calling to make a dinner reservation for two at 7:30 PM. If that is unavailable, ask for the nearest time between 6:30 and 8:30 PM." --provider vapi --max-duration 4
```

3. 結果を確かめます。
```bash
python3 "$SCRIPT" ai-status <call_id> --provider vapi
```

## エージェントに勧める進め方 {#suggested-agent-procedure}

電話や SMS を頼まれたときは、次のように進めます。

1. 見分け方に沿って、どの道筋が合うかを決めます。
2. 設定の状態がはっきりしないなら `diagnose` を実行します。
3. 用件の中身をひととおり聞き取ります。
4. 発信や送信の前に、相手に確認を取ります。
5. 適切なコマンドを使います。
6. 必要なら結果を確かめに行きます。
7. 第三者の番号を Hermes のメモリーに残さないまま、結果をまとめます。

## この skill でもできないこと {#what-this-skill-still-does-not-do}

- 着信にその場で応答すること
- webhook で受信 SMS をエージェントの処理に直接流し込むこと
- 任意の第三者の 2 要素認証で必ず使えること

これらには、追加 skill だけでまかなえる範囲を超えた仕組みが要ります。

## つまずきやすいところ {#pitfalls}

- Twilio の試用アカウントや地域ごとの決まりによって、かけられる相手・送れる相手が制限されることがあります。
- VoIP の番号を 2 要素認証で受け付けないサービスもあります。
- `twilio-inbox` は REST API を見に行く方式で、届いた瞬間に押し出されるものではありません。
- Vapi からの発信には、取り込み済みの有効な番号が必要です。
- Bland はいちばん手軽ですが、音声がいちばん良いとは限りません。
- 第三者の電話番号を、むやみに Hermes のメモリーへ保存しないでください。

## 確認しておくこと {#verification-checklist}

準備が済んだら、この skill だけで次のことがひととおりできるはずです。

1. `diagnose` で、各サービスの準備状況と覚えている内容が表示される
2. Twilio の番号を探して買える
3. その番号を `${HERMES_HOME:-~/.hermes}/.env` に残せる
4. 自分の番号から SMS を送れる
5. あとから、自分の番号あての SMS を取りに行ける
6. Twilio から直接発信できる
7. Bland か Vapi を通して AI に発信させられる

## 参考 {#references}

- Twilio の電話番号: https://www.twilio.com/docs/phone-numbers/api
- Twilio のメッセージ: https://www.twilio.com/docs/messaging/api/message-resource
- Twilio の音声通話: https://www.twilio.com/docs/voice/api/call-resource
- Vapi のドキュメント: https://docs.vapi.ai/
- Bland.ai: https://app.bland.ai/
