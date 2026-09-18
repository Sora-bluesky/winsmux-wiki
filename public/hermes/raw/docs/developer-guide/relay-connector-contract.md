---
title: "Relay ↔ Connector 契約"
description: "Hermes gateway の relay アダプターと外部コネクターのあいだの通信契約（実験的）"
upstream_path: developer-guide/relay-connector-contract.md
upstream_blob: 1a7552de68b36ca25401504c63266fc52021f5ea
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/relay-connector-contract
---

# Relay ↔ Connector 契約（v1、実験的） {#relay-connector-contract-v1-experimental}

> **ステータス:** 実験的です。実際の Class-1 プラットフォーム（Discord と Telegram）の少なくとも2つで
> 検証が済むまで、この契約は非推奨期間を設けずに変わることがあります。実験段階での変更は
> **追加のみ**で、`contract_version` によって区切られます。互換性を壊す変更では、両方のリポジトリを同時に更新します。

この文書は、**Hermes gateway**（Python、
`gateway/relay/`）と **connector**（Node/TypeScript、
`NousResearch/gateway-gateway`）のあいだの正式なインターフェースです。connector を実装する人は、まずこのファイルを
読んでください。

gateway は汎用の `RelayAdapter` を動かし、connector へ**外向きに**接続します。
ハンドシェイクで `CapabilityDescriptor` を受け取り、そのあとはターンごとの双方向
WebSocket 上で、正規化された `MessageEvent`（受信）とアクション（送信）をやり取りします。gateway は、自分の前段にどの具体的なプラットフォームがあるかを知りません。
プラットフォーム固有のソケットや ID の処理は、すべて connector が受け持ちます。

---

## 1. ハンドシェイク {#1-handshake}

1. gateway がトランスポートを開きます（`connect`）。
2. gateway が `handshake()` を呼び、connector が `CapabilityDescriptor`
   （2章）を返します。これは、このアダプターのインスタンスが前段に置くプラットフォームを説明するものです。
3. gateway は descriptor をもとにアダプターを設定し（文字数上限、長さの単位、
   ドラフト・編集・スレッド・markdown の対応状況）、受信ハンドラーを登録します。
4. その後、connector は受信イベントを流し、送信アクションを受け付けます。

`contract_version`（現在は `1`）は descriptor に含まれます。gateway は
descriptor の未知のフィールドを無視し（前方互換）、省略された任意フィールドは
既定値で埋めます。

---

## 2. CapabilityDescriptor（ハンドシェイクのペイロード） {#2-capabilitydescriptor-handshake-payload}

JSON オブジェクトです。正本は `gateway/relay/descriptor.py` です。

| フィールド | 型 | 必須 | 意味 |
| --- | --- | --- | --- |
| `contract_version` | int | はい | 契約のバージョン（同じバージョン内では追加のみ）。 |
| `platform` | string | はい | プラットフォーム名（例: `"discord"`、`"telegram"`）。 |
| `label` | string | はい | 人が読むためのラベル。 |
| `max_message_length` | int | はい | 文字数上限。gateway は `MAX_MESSAGE_LENGTH` として公開します。0 のときは 4096 として扱います。 |
| `supports_draft_streaming` | bool | はい | ネイティブのドラフトストリーミングによるプレビューに対応しているか。 |
| `supports_edit` | bool | はい | 編集によるストリーミングが可能か。false の場合、利用側は区切りごとに1メッセージを送る形に落とします。 |
| `supports_threads` | bool | はい | `create_handoff_thread` を使えるか。 |
| `markdown_dialect` | string | はい | `"plain"`、`"markdown_v2"`、`"discord"` など（`supports_code_blocks` を決めます）。 |
| `len_unit` | string | はい | `"chars"`（組み込みの len）か `"utf16"`（Telegram の UTF-16 コードユニット）。 |
| `emoji` | string | いいえ | 表示用の絵文字（既定は 🔌）。 |
| `platform_hint` | string | いいえ | システムプロンプトに入れるプラットフォームのヒント。 |
| `pii_safe` | bool | いいえ | セッションの説明から個人情報を伏せるか。 |
| `supports_context` | bool | いいえ | このプラットフォームで、宛てられたターンの周囲にあるチャンネルやグループの**文脈**を connector が提供できるか（Model A はオンデマンドで履歴を取得する方式 — Discord/Slack/Matrix。Model B は受動的にバッファーする方式 — Telegram/Signal/WhatsApp）。既定は false で、その場合は受信イベントに `context` が付きません。§3 を参照してください。 |
| `supports_inchannel_continuable` | bool | いいえ | プラットフォームが**フラットで続きを書ける cron の表示面**を持てるか（ネイティブ Slack の `cron_continuable_surface: in_channel`）。概要はチャンネルや DM のトップレベルに投稿され、普通に返信するとフラットな `(platform, chat_id, None)` セッションでジョブが続きます。既定は false で、その場合 gateway のスケジューラーは安全側のスレッドモードに倒れます（D6 ゲート）。古い connector では今までどおりスレッドで動きます。 |
| `supports_block_formatting` | bool | いいえ | gateway が `send`/`edit` フレームに `metadata.format_hints` を付けたとき、このプラットフォームの送信側が生の markdown から**ブロック単位の書式**を描画できるか（Slack では表・リスト・コードにネイティブの `markdown` ブロックを使い、mrkdwn テキストは代替として残します）。既定は false で、その場合 gateway はヒントを付けないので、古い connector にこのメタデータが届くことはありません。 |
| `supported_ops` | string[] | いいえ | op 単位の機能の申告です。このプラットフォームについて connector の送信側が実際に実装している送信 op の名前を並べます（例: `["send", "edit", "typing", "follow_up", "get_chat_info"]`）。無いか空なら、connector はこのフィールドより前のもので、gateway は従来の op の組（`send`/`edit`/`typing`/`follow_up`）を前提にします。新しい op は、明示的に申告されたときだけ使われます。 |

ほとんどのフィールドは gateway にある既存の `PlatformEntry` を写したものです。
実行時にしか決まらないフィールド（`len_unit`、`supports_*`、`markdown_dialect`）は、
動いているプラットフォームアダプターの機能メソッドから取ります。

---

## 3. 受信: `MessageEvent` のエンベロープ {#3-inbound-messageevent-envelope}

connector は、プラットフォームから届く各イベントを `MessageEvent`
（`gateway/platforms/base.py`）に正規化して gateway に渡します。**受信は、
gateway 側から張った外向きの `/relay` WebSocket 上で届きます**（下のトランスポートの
注記を参照）。connector は、gateway がすでに接続したソケットに `inbound` フレームを流し込みます。gateway は
埋め込まれた `SessionSource` から `build_session_key()` でセッションのキーを作ります。そのため、正しい識別子を埋めることが、
connector が負う正確性の責任の中でいちばん重いものです。

### 受信のトランスポート（HTTP ではなく WS の逆方向チャンネル） {#inbound-transport-ws-back-channel-not-http}

gateway は、ハンドシェイク、送信アクション（§4）、自身の `/stop` の送出（§5）のために、
connector の `/relay` WebSocket へ**外向きに**接続します。受信は
**同じソケット**を逆向きに流れます。connector は `inbound`
フレーム（§5 では `interrupt_inbound`）を gateway の外向き WS に流し込みます。
**gateway 側に受信用の HTTP エンドポイントはありません**。gateway は受信用のポートを公開する必要がなく、
ホスティング環境では公開すること自体ができません。すべてのやり取りは gateway が
始めた接続の上を流れます。

**複数インスタンスでのルーティング。** プラットフォームのソケットを持つ（つまり受信イベントを生み出す）connector のインスタンスは、
一般に gateway が外向き WS を接続したインスタンスとは**別**です。そこでイベントを生み出したインスタンスは、
テナントをキーにして connector 内部の **relay bus**（Redis pub/sub、
`src/core/relayBus.ts` の `RelayBus`）へイベントを流します。connector の各インスタンスはこれを購読し、
そのテナントについて自分の**ローカル**にあるセッションへメッセージを振り分けます
（`RelayServer.routeBusMessage`）。gateway のソケットを実際に持っている1つのインスタンスが届け、
そのテナントのローカルセッションを持たないインスタンスは何もしません。
つまりインスタンス間の配送はクラスター内の Redis を1回経由するだけで、公開された
HTTP 呼び出しではありません。

フレーム（connector → gateway、WS 上）:

- `{"type":"inbound", "event": <MessageEvent>, "bufferId"?}`
- `{"type":"interrupt_inbound", "session_key", "chat_id"}`（§5）
- `{"type":"passthrough_forward", "forward": <PassthroughForward>, "bufferId"?}`（§5.1）

**受信に付くチャンネルの文脈（設計 relay-channel-context）。** 送信元プラットフォームの
descriptor が `supports_context`（§2）を申告していて、チャットが
複数人のもの（`chat_type` が group/channel/thread/forum のいずれかで、`dm` は含まない）なら、
connector は受信する `MessageEvent` に、任意で追加の2つのフィールドを付けてもかまいません。

- `context`: 周囲のメッセージを読み取り専用で並べた配列です（同じチャンネル、古い順から
  新しい順）。connector が取得した（Model A）か
  バッファーした（Model B）、近くにある宛先指定のない会話です。参照専用で、エージェントを起動することはありません（起動するかどうかは、
  宛てられたイベントだけをもとに connector 側ですでに決まっています）。
  gateway はこれを `MessageEvent.channel_context` に描画します（履歴の後埋めと同じ、読み取り専用の
  注入経路です）。
- `context_error`: bool です。プラットフォームは文脈に対応しているのに
  取得やバッファーに失敗し、connector が空の `context` で処理を続けたときに true になります
  （観測用の目印で、connector 側では配送の span に出ます）。

どちらも無ければ、今と1バイトも変わりません。これらを送らない connector、
`dm`、文脈に対応しないプラットフォームでは、`channel_context` は作られません。

`PassthroughForward` は、パススルー面へ転送されたリクエストの通信上の形です
（Class-2/3 の webhook — Discord のインタラクション、Twilio）: `{platform, botId, method, path, headers: [[k,v],…], bodyB64, profile?}`。`profile` は任意です。
Team-Gateway のインタラクションで NAS が対象のプロファイルを解決したときに connector が付けます。
省略すると（プロファイルが1つの gateway）、従来どおり既定の `agent:main` セッション名前空間へ
振り分けられます。これは
`inbound` フレームの `SessionSource` がすでに持っている `profile` フィールドと同じ扱いです（#60586）。本文は
base64 でエンコードされるので、任意のバイト列が改行区切り JSON のトランスポートを通っても壊れません。
gateway は base64 をデコードして、
connector が転送したバイト列そのままに戻します（connector は入口ですでに
プロバイダーの署名を検証し、共有 ID の認証情報を取り除いています —
§6。そのため gateway が処理し直すのはトークンを含まない無害化済みの本文で、それに対する動作は
トークンを使わない `follow_up` 経路で行います）。§3.1 を参照してください。

**信頼。** WS のアップグレードは gateway ごとのシークレットで認証されます
（§6.1）。そのためチャンネルは端から端まで信頼でき、受信フレームを個別に
HMAC 署名することはありません（認証済みのソケットが、古い HTTP 経路で必要だった
配送ごとの送信元の証明を兼ねます）。relay bus を経由する区間は connector の信頼範囲の中にあります
（lease、バッファー、capability の各ストアと同じです）。

> この契約の初期の草案では、受信を署名付きの **HTTP POST** で
> `gatewayEndpoint` に届けていました（`HttpGatewayDelivery` と gateway 側の
> `inbound_receiver`）。署名はテナントごとの配送キーによる HMAC でした。この方式では
> すべての gateway が到達可能な受信 URL を公開する必要があり、公開 IP を持たないホスティング型の
> gateway では不可能でした。上の WS 逆方向チャンネルがこれを置き換えます。
> テナントごとの配送キーは前方互換のためにプロビジョニング時に残していますが、受信にはもう
> 使っていません。**パススルー面**（Discord のインタラクションや Twilio のような Class-2/3 の webhook）は、
> ACK 後の転送にしばらく `gatewayEndpoint` を使い続けていました。Phase 5 §5.1 でその転送も WS に移るので（上の
> `passthrough_forward` フレーム）、ホスティング型の gateway が公開する受信面はゼロになり、切り替えが済んだ時点で
> `gatewayEndpoint` は廃止されます。

### 3.1 パススルー面の転送（§5.1） {#31-passthrough-plane-forward-51}

パススルー面は、プロバイダーが待つ遅延に厳しい ACK を connector の
入口で返し（例: Discord の遅延インタラクション応答は約3秒以内）、そのあと
本来のリクエストを gateway へ**投げっぱなし**で転送します。この
転送には返事が要らない（プロバイダーはすでに満足している）ので、HTTP POST ではなく、
`inbound` と同じ外向き WS 上を `passthrough_forward` フレームで流れます。gateway はデコードした
リクエストを通常のエージェント経路で処理します（Discord のインタラクションは `MessageEvent` にデコードされ、
メッセージと同じように扱われます。返信は送信経路または `follow_up` 経路から出ていきます）。`bufferId` は、
転送がバッファーされたとき（Phase 5 §5.3 のバッファー専用への切り替え）に付き、
gateway は確実に引き渡したあとでこれに ack を返します。

### SessionSource のフィールド（通信上の表面） {#sessionsource-fields-the-wire-surface}

正本は `gateway/session.py` の `SessionSource.to_dict()` です。以下が、
gateway が通信上で受け付けるすべてのキーです。`platform`、`chat_id`、`chat_type`、
`user_id`、`user_name`、`thread_id`、`chat_name`、`chat_topic` は常に
含まれます（`null` のこともあります）。それ以外は値があるときだけ含まれます。

| フィールド | 型 | 常に送る | 意味 |
| --- | --- | --- | --- |
| `platform` | string | はい | プラットフォーム名（descriptor の `platform` と一致します）。 |
| `chat_id` | string | はい | 会話の主 ID（チャンネルやチャット）。セッションキーの識別子です。 |
| `chat_type` | string | はい | `dm` / `group` / `channel` / `thread` / `forum`。 |
| `chat_name` | string\|null | はい | 人が読むためのチャット名。 |
| `user_id` | string\|null | はい | メッセージを書いた人の ID。セッションキーの識別子です。 |
| `user_name` | string\|null | はい | 書いた人の表示名。 |
| `thread_id` | string\|null | はい | スレッド内のときのスレッドまたはフォーラムトピックの ID。セッションキーの識別子です。 |
| `chat_topic` | string\|null | はい | チャンネルのトピックや説明（Discord、Slack）。 |
| `user_id_alt` | string | いいえ | プラットフォーム固有の安定した別 ID（Signal の UUID、Feishu の union_id）。 |
| `chat_id_alt` | string | いいえ | チャットの別 ID（例: Signal のグループ内部 ID）。 |
| `scope_id` | string | いいえ | プラットフォームに依存しない**スコープ**の識別子です。Discord のギルド、Slack のワークスペース、Matrix のサーバーにあたります。**Discord/Slack でスコープを分離するには必須です。** セッションキーの識別子です。（D-Q2.5 の通信移行で正式名になりました。） |
| `guild_id` | string | いいえ | **旧名の別名で、connector はもう読みません。** D-Q2.5c 以降、connector が読み書きするのは `scope_id` だけです。gateway のエージェント全体で使う `SessionSource.to_dict()` は、relay 以外のセッション保存のためにまだ `guild_id` を出力します（`scope_id` と同じ値）。そのため通信上に現れることはありますが、connector は無視します。これに頼らないでください。 |
| `parent_chat_id` | string | いいえ | `chat_id` がスレッドを指すときの親チャンネル。 |
| `message_id` | string | いいえ | きっかけになったメッセージの ID（ピン留め、返信、リアクション用）。 |

> `is_bot`（書いたのが bot や webhook かの分類）は gateway 側の
> dataclass にはありますが、v1 では**意図的に通信に載せていません**。
> `to_dict()` に含まれないためです。まずここと `to_dict()` に追加されるまで（追加によるバージョンアップ）、
> connector の `SessionSource` に加えないでください。

### プラットフォームごとの SessionSource の識別子 {#sessionsource-discriminators-per-platform}

| プラットフォーム | chat_id | chat_type | user_id | thread_id | scope_id |
| --- | --- | --- | --- | --- | --- |
| **Discord** | チャンネル ID | `dm`/`group`/`thread` | 書いた人の ID | スレッドのチャンネル ID（スレッドの場合） | **ギルド ID**（サーバーを分離するために必須） |
| **Telegram** | チャット ID | `dm`/`group`/`forum` | from の ID | フォーラムトピックの ID（フォーラムの場合） | — |

**Discord の `guild_id` を間違えると、2つのサーバーが1つのセッションに混ざります。**
これが深刻度 High のリスクの筆頭です。gateway の `build_session_key()` が
適合性の基準です。ある `SessionSource` に対して、connector の正規化は
Python のアダプターが作るのと同じキーを作らなければなりません。（Phase-1 のスタブテストは、
既知の入力から既知のキーが出ることを確かめています。）

### bot の ID とテナントの区別（単一 bot への集約、付録 A） {#bot-identity-vs-tenant-single-bot-consolidation-appendix-a}

エンベロープは、**発信元の bot の ID** を**テナントとは別の**
フィールドとして持ちます。テナントは、イベント自身の識別子（Discord の
`guild_id`、Telegram の `chat_id`、webhook のパスやサブドメイン）から決めます。
どのトークン、ソケット、プロセスが届けたかから決めることは**ありません**。これにより、共有する1つの bot が多数の
テナントの前段に立てます（Phase 6）。既存のフィールドに意味を詰め込む必要もありません。

### 書いた人を先に見る解決と、アカウント連携（DM）の経路（Phase 7） {#author-first-resolution-the-account-link-dm-path-phase-7}

Phase 7 では、**共有 bot に対してユーザーが自分で1人ずつ登録できる仕組み**が加わります。これにより、
振り分けられる受信メッセージのインスタンスを*どの*識別子で決めるかが変わり、
ユーザーが自分のアカウントを結び付けるための管理経路も加わります。

**書いた人を先に見る解決（複数テナントのギルドの規則、D-7.2）。** 1つの
Discord ギルドに**多数の**テナントが入ることがあります。メンバーがそれぞれ自分の
エージェントに連携している場合です。そのため connector は配送先のインスタンスを、
**認証済みの書いた人の結び付け**（`user_instance_binding`、`resolveByUser` により
`(tenant, platform, platform_user_id)` をキーにする）から決めます。ギルドからインスタンスへの
ルートでは**決めません**。具体的には次のとおりです。

- **連携済み**のユーザーが書いて振り分けられたメッセージは、**そのユーザーの**
  インスタンスに**だけ**届きます。**同じギルド**にいる2人目の連携済みユーザーが
  別のインスタンスで扱われていても同じです（それぞれ自分のインスタンスにだけ届きます）。
- **未連携**のユーザーが書いたメッセージは、**どの**インスタンスにも解決されず
  捨てられます（**安全側に閉じる** — ギルドにいる他のテナントへ一斉に流すことはありません）。
- 使う書いた人の ID は、**観測したイベントに載っている本物の `user_id`** です。
  上で説明した `SessionSource.user_id` と同じもので、
  gateway が主張した値や管理フレームに載った値を使うことはありません。

これは、connector が
`WsGatewayDelivery` で強制している `user_id` ごとの持ち主限定の振り分けです（gateway 側の複数テナントギルド E2E ドライバー
`gateway_multitenant_guild_driver.py` が、リポジトリをまたいだ基準になります）。

**アカウント連携（DM）の経路。** ユーザーは
使い捨てのコードでアカウントをインスタンスに結び付けます。コードは共有 bot に DM を送って使います。

1. 持ち主が Portal（またはセルフホストの CLI）から連携を始めます。
   connector は、**認証済みの**インスタンスに対して有効期間の短い**連携コード**を発行します
   （`POST /manage/link`。instanceId は呼び出し元の principal から取ります —
   NAS が署名した `aud=agent:{instanceId}` トークンか、インスタンス自身の gateway ごとの
   シークレットです。リクエスト本文から取ることは**ありません**）。
2. ユーザーは、結び付けたいアカウントから共有 bot に `/link <code>` を
   **ダイレクトメッセージ**で送ります。
3. connector の受信オブザーバーがその DM を**消費**し（どの
   エージェントにも振り分けません）、観測した DM イベントに載っている**本物の
   `user_id`** を使って `user_instance_binding` を書き込みます。それ以降は、書いた人を先に見る解決によって、
   そのユーザーのメッセージが結び付けたインスタンスへ振り分けられます。

**連携の解除は connector が決めます。** インスタンスのプロビジョニングを解除すると
（`POST /manage/deprovision`）、そのインスタンスへの書いた人の結び付けが消え（ユーザーがそこへ
解決されなくなります）、**さらに** gateway ごとのシークレットが失効します（そのソケットはもう
認証できず、次の WS アップグレードは **4401** で閉じられます）。**それまで成功していたハンドシェイクのあとで
4401 の切断**を受けた gateway は、これを最終的な失効として扱います。
再接続をやめ、relay プラットフォームを
**無効**として報告します（再試行できるエラーではありません）。一度もハンドシェイクに成功する*前*の 4401 は、
再試行できるものとして扱います（コールドスタートやまだプロビジョニングされていない競合であって、失効ではありません）。

### 3.2 アイドル移行とバッファー切り替えの基本機能（§5.3） {#32-going-idle-buffered-flip-primitive-53}

ゼロまでスケールするための基本機能です（振る舞いそのものではありません — ここには、スリープを決めたり
マシンを停止したりするものは何もありません。これらのフレームは、後の作業で使われます）。gateway が
いないあいだに届いた受信を失わずに、gateway が drain/アイドルへの移行に入れるようにするものです。
そのために connector がそのインスタンス分をバッファーし、再接続時に再送します。

フレームは3つあります（いずれも接続の**認証済み**インスタンス ID をキーにします —
WS アップグレード時に保存済みのシークレット記録から読み、フレームの中で主張されることはありません）。

- `{"type":"going_idle"}`（gateway → connector）— gateway の
  既存の drain への移行の一部として出します（アダプターがソケットを
  閉じる前に送ります）。connector に、このインスタンスを**バッファー専用**へ切り替えるよう求めます。
- `{"type":"going_idle_ack"}`（connector → gateway）— connector が切り替えを終えたことを示します。
  ライブ配送は止まり、以後このインスタンス宛ての受信は確実に
  バッファーされます。gateway は**この ack を受け取るまで処理を続けます**（切り替えの隙間に届いたイベントは
  失われずライブで届きます — bus と同じ、処理を始める前に SUBSCRIBE するという
  順序の規律です）。ack を受け取ってはじめて、閉じても安全になります。
- `{"type":"inbound_ack", "bufferId"}`（gateway → connector）— 再接続時に再送された、
  バッファー済みの `inbound` 配送（`bufferId` を持つ）を確実に受け取ったことを示します。
  connector はこれを受け取ってからバッファーのエントリーに ack します。これで
  **配送区間**で重複のない drain が成り立ちます。drain の途中で落ちたインスタンスには
  ack されていない末尾だけが再送され、ack 済みのエントリーが再送されることはありません。

**バッファーと drain。** 切り替えているあいだ、connector は受信をライブで流す代わりに、
インスタンスごとの確実な配送区間バッファー（`delivery:<instanceId>`）に追記します。
gateway が**再接続**すると（新しく追加した再接続ループが、予期しない切断のあとに接続し直して
ハンドシェイクをやり直します）、新しいハンドシェイクをきっかけに
connector がその溜まった分を新しいソケットで**順番どおり、ack を待ちながら** drain し、
そのあと切り替えを解除してライブ配送を再開します。これは、Discord→connector の取り込み区間と同じ
`drainWithoutDup` の仕組みを、
connector→gateway の配送区間に使い回したものです。全体を通して connector が決めます。gateway が
切り替えや drain をできるのは自分のインスタンスだけです。

> 対象外（後回しの振る舞い）: drain を決める自律的なアイドルタイマー、
> 実際のマシン停止、NAS の停止中ヘルスモデル。この
> 基本機能は「gateway が drain したら、relay はバッファー専用に切り替え、再接続時に
> 欠落も重複もなく再送する」というものです。何が drain のきっかけになるかは対象外です。

### 3.3 起こすための通知（§5.2） {#33-wake-poke-52}

スリープと起床のループのもう半分で、停止中の gateway がバッファー済みの仕事が待っていることを
どう知るかを扱います。これも基本機能で、ここにはマシンを停止するものは何もありません。
起こすための合図だけをつなぎ、将来のゼロスケールの振る舞い層が「バッファーされた
⇒ 起こす通知が送られた」を前提にできるようにします。

- **登録。** gateway は enroll またはプロビジョニングのときに**起床 URL**を登録します。
  connector が GET で叩いて起こせる、到達可能な URL なら何でもかまいません（Fly の autostart のホスト名や、
  ダッシュボードのホスト）。セルフホストでは `hermes gateway enroll --wake-url <url>`（または
  `GATEWAY_RELAY_WAKE_URL` / `gateway.relay_wake_url`）で指定します。マネージド/NAS では、
  コンテナの環境変数として `GATEWAY_RELAY_URL` の横に書き込まれます。
  `/relay/provision` の本文で `wakeUrl` として送られ、connector の
  シークレット記録にインスタンスごとに保存されます（gateway が主張する値ですが、範囲は安全に限られています —
  `instanceId` と同じ扱いです。組織やテナントはトークンで検証されるので、gateway が
  起こす対象として登録できるのは自分のインスタンスだけです）。廃止された
  `gatewayEndpoint` とは別物で、配送先ではなく**通知先**です。
- **通知。** バッファー専用（アイドル移行済み）の宛先に、最初の
  バッファー済みイベントが届くと、connector はそのインスタンスが登録した `wakeUrl` に
  **ペイロードなし・署名なしの GET** を**直接**送ります（NAS を介しません — relay は
  NAS から独立したままです）。テナントのデータも受信内容も含まず、「バッファー済みの仕事があるので
  再接続してください」と伝えるだけです。テナントの権限は、gateway が接続し直したときに通常の方法
  （認証済みの WS アップグレード）で確立し直されます。そのため起床 URL が漏れたり
  推測されたりしても、最悪の場合に起きるのは、そのインスタンス自身の不要な再接続だけです。
  インスタンスごとに流量が制限され（イベントごとではなく、クールダウンの期間ごとに1回）、
  できる範囲での送信です。通知が失敗しても無視され、gateway は次に自分から
  再接続したときにいつでも drain します。新しいフレームはありません。起こす通知は帯域外の HTTP GET で、
  relay の WS メッセージではありません（そもそもソケットが落ちているからです）。

> 対象外（後回しの振る舞い）: 実際のマシン停止（Fly の
> `autostop:"suspend"`）と、スリープを決める自律的なアイドルタイマー。この
> 基本機能は「スリープ中のインスタンスにバッファー済みのイベントが来たら、その wakeUrl に通知する」というものです。
> 何がインスタンスをスリープさせるか（そして処理のために起こすか）は振る舞い層の役目です。

### 3.4 将来のゼロスケールの振る舞い層が負う義務 {#34-obligations-on-a-future-scale-to-zero-behaviour-layer}

§3.2 と §3.3 は**基本機能**を提供します。この節は、**別のゼロスケールの
振る舞いの作業が、それらを安全に使うために守らなければならない契約です。** その作業は
停止の*判断*、実際のマシン停止、プラットフォームとヘルスの
モデルを受け持ちます（どれもここにはありません）。ただし、基本機能が前提にしている次の保証は
必ず守らなければなりません。

1. **インスタンスが停止しうる状態になる前に `wakeUrl` を登録すること。**
   `wakeUrl` が登録されていない停止中のインスタンスは、何も返ってこない穴になります。バッファーされた
   受信が通知を起こさないので、ほかの何かが再接続させるまで、自分宛ての通信を寝過ごします。
   振る舞い層は、停止を許す前提条件として、到達可能な起床先が登録されていること
   （セルフホストは `--wake-url`、マネージドは書き込み済み）を必ず確かめます。
   マシンの停止中に到達できない起床 URL（例: 前段にプラットフォームの autostart がないまま、
   停止中のマシンそのものを指している）は、無いのと同じです。
2. **ソケットを閉じたり停止したりする前に、`going_idle` で drain し、`going_idle_ack` を待つこと。**
   ack されていない切り替えが進行中のまま停止してはいけません。
   ack は、このインスタンスへの配送がバッファー専用になったことを connector が確認したものです。
   `going_idle` を送ったあと、ack が来る前に停止したマシンは、
   切り替えと競合して届いた受信を落とすことがあります。gateway はすでに
   ソケットを閉じる処理を ack 待ちにしています（Q-5.3c）。停止の手順は、きれいな drain が
   終わった*あと*に置かなければならず、drain と競合させてはいけません。
3. **停止の前提条件として、新しく追加した再接続ループを動かしたままにすること。**
   起床から drain までの契約は「通知 ⇒ gateway が接続し直す ⇒ connector が
   再接続のハンドシェイクで drain する」です。再接続ループが無効だと、通知が届いても
   マシンは接続し直さず、バッファーは取り残されます。振る舞い層は、
   起床しても relay のトランスポートが再接続しないインスタンスを停止してはいけません。
4. **ヘルスモデルでは、停止中を故障と区別すること（Q-5.3b）。** 停止中のインスタンスは
   健全に眠っているのであって、壊れているのではありません。ヘルス監視の層は両者を必ず区別し
   （例: プラットフォームのマシン状態を使う）、停止中のインスタンスを不健全として
   再起動したり、警報を出したり、回収したりしないようにします。そうすると停止の意味がなくなり、
   起床や drain と競合することもあります。
5. **起こす通知はできる範囲での送信で、流量も制限されている — ちょうど1回届くことや、すぐ起きることを前提にしないこと。**
   インスタンスごとにクールダウンの期間あたり最大1回で、
   失敗した通知は無視されます。振る舞い層は、通知を
   確実で即時の合図として頼ってはいけません。正しさの根拠は、あくまで「gateway は
   次に再接続したときにいつでも drain する」ことです。念のための二重の起床（例: 定期的に
   再接続もするジョブ）を入れるかは、基本機能ではなく振る舞い層が決めることです。
6. **本当にアイドルなときだけ停止すること — アイドルかどうかは connector から観測できるもので決め、
   gateway の推測で決めない。** 何をアイドルとみなすか（進行中のターンがなく、N 分間受信がない）は
   振る舞い層の方針ですが、既存の drain の仕組み（`gateway_state` の running→draining）と
   組み合わせなければならず、relay だけの別のアイドル経路を作ってはいけません — §3.2 が
   `going_idle` に課しているのと同じ統合上の制約です。
7. **メッセージの接続がすべて relay 越しのときだけ停止すること — しかも起動時だけでなく、
   停止しようとするその時点で確かめ直すこと。** 直接つながっているプラットフォーム
   （Photon iMessage の gRPC ストリーム、BlueBubbles、gateway 自身から張ったボットトークン）は、
   connector が緩衝も起床もできないソケットを掴んでいるので、そのまま停止すると受信を失い、
   二度と起きません。この判定は、有効になっている起動プロファイルのプラットフォームと、
   受け持っているすべてのプロファイル（`gateway.multiplex_profiles` の従側も含む）の
   生きているアダプターを数えます。そしてアイドル監視は休止に入る前に毎回これを問い直すので、
   起動後に立ち上がった直接接続のアダプター（プロファイルの再調整）があれば、
   インスタンスは起きたままになります。

これらは振る舞い層が基本機能に対して負う保証です。基本機能が振る舞い層に対して
負うのは、§3.2/§3.3 ですでに定めたものだけです（going_idle による切り替え、
インスタンスごとの確実なバッファーと ack を待つ再接続時の drain、そして切り替え済みインスタンスの
最初のバッファー済みイベントでの通知）。

---

## 4. 送信: アクションの一覧 {#4-outbound-action-set}

gateway はアクションの辞書を渡してトランスポートを呼びます。正本は
`gateway/relay/transport.py` と `gateway/relay/adapter.py` です。

| `op` | フィールド | 結果 |
| --- | --- | --- |
| `send` | `chat_id`、`content`、`reply_to?`、`metadata?` | `{success: bool, message_id?, error?}` |
| `edit` | `chat_id`、`message_id`、`content`、`metadata?` | `{success: bool, error?}` |
| `typing` | `chat_id`、`content?`、`metadata?` | `{success: bool}` |
| `follow_up` | `session_key`、`kind`、`content`、`metadata?` | `{success: bool, message_id?, error?}` |
| `send_media` | `chat_id`、`media_kind`、`source_url`、`content?`（キャプション）、`filename?`、`reply_to?`、`metadata?` | `{success: bool, message_id?, error?}` |
| `prompt` | `chat_id`、`prompt_kind`、`prompt_id`、`content`（質問文）、`options[]{id,label,style?}`、`timeout_s?`、`reply_to?`、`metadata?` | `{success: bool, message_id?, error?}` |
| `react` | `chat_id`、`message_id`、`emoji`、`remove?`、`metadata?` | `{success: bool, error?}` |
| `thread_create` | `chat_id`（親）、`thread_name`、`message_id?`（起点）、`metadata?` | `{success: bool, thread_id?, error?}` |
| `thread_rename` | `chat_id`（親）、`message_id`（スレッドの ID）、`thread_name`、`only_if_current_name?`、`metadata?` | `{success: bool, error?}` |

`get_chat_info(chat_id)` は別に中継される呼び出しで、少なくとも
`{name, type}` を返します。

**`send_media`（Phase 2 のメディア送信）。** メディアは参照の形で通信を渡ります。
`source_url` は、(a) gateway が事前に `POST {connector}/relay/media` でアップロードした
**connector 上の再ホスト**（本文は生のバイト列、ヘッダーは `Content-Type` と
任意の `X-Media-Filename`、認証は gateway ごとの HMAC bearer — WS アップグレードと同じトークンの
方式です。応答の `{id, size}` から参照
`{connector}/relay/media/{id}` を作ります）か、(b) connector が直接ダウンロードする**公開の http(s) URL**（例:
fal.media で生成したもの）のどちらかです。`media_kind` は
`image` / `voice` / `audio` / `video` / `document` のいずれかで、
プラットフォームごとのネイティブなアップロード経路を選びます（Telegram の `sendPhoto`/`sendVoice`/…、Discord の
multipart の添付、Slack の外部アップロード、WhatsApp のメディアアップロードとメディア
メッセージ）。キャプションは `content` に載り、プラットフォームの
通常の markdown の経路で描画されます。ネイティブのキャプションがないプラットフォームでは、続けてテキストを
送ります（connector 側で行います）。両方のルートとこの op は、`supported_ops` が
`send_media` を申告しているときだけ有効です。古い connector にこの op が届くことはありません（gateway の
メディア送信は、メディア対応以前のテキストでの代替に落ちます）。サイズ上限は 25 MB です
（connector の `mediaStore.ts` の MEDIA_MAX_BYTES。超えたアップロードは 413 で拒否されます）。

**受信メディア（Phase 2 のメディア受信）。** 受信イベントの `media_urls` には、
取得できる参照が入ります。プラットフォームで公開されている URL はそのまま通します（Discord CDN）。
認証が必要だったり期限があったりするプラットフォームの URL（Telegram のファイル API、Slack の `url_private`、
WhatsApp Graph のメディア）は、connector 側でプラットフォームの
認証情報を使ってダウンロードし、`{connector}/relay/media/{id}` として再ホストします。プラットフォームの
認証情報が通信を渡ることはありません。再ホストの参照は、認証済みのどの gateway からも読めます
（capability URL の考え方です。ID は 128 ビットの乱数で、
受け入れられたすべての受信者にすでに届けられています）。gateway は各
参照を gateway ごとの bearer でダウンロードし、ネイティブのアダプターと同じように、
エージェントにはローカルのファイルパスを渡します。再ホストには期限があります（TTL は約1時間）。遅延させず、
受け取ったらすぐにダウンロードしてください。並行する `media` 配列（同じ順序）が `kind`、`mime`、
`size`、`filename`、`caption` のメタデータを加えます。`message_type` は最初の
添付の種類（`image`/`audio`/`document`）を表します。

**`prompt`（Phase 3 の対話）。** プラットフォームに依存しない1つの op で、
gateway でもっとも重要なやり取り（実行の承認、スラッシュコマンドの確認、
確認のための選択肢）をネイティブのコントロールで描画します。Discord のボタンコンポーネント、Telegram の
インラインキーボード、Slack の Block Kit のアクション、WhatsApp のボタンメッセージ（選択肢が3つ以下）/
リストメッセージ（4〜10。10を超えると番号付きテキストの代替に落ちます）です。
`prompt_kind`（`approval`/`clarify`/`choice`）は見た目のヒントにすぎません。
`prompt_id` は gateway が発行し、connector からは中身の見えない値です。各
選択肢のコールバックのペイロードには、トークン `hp1:<prompt_id>:<option_id>` が入ります
（64 バイト以下 — Telegram の `callback_data` の上限がすべての経路を縛ります。選択肢の ID は
`[A-Za-z0-9_.-]` で 32 文字以下）。gateway は prompt の ID を、同じ文字種と長さの範囲で
`<per-process nonce>.<8 hex>` として発行します。
メッセージの場合、connector は受け入れたインスタンスの組に絞って届けますが、パススルーの転送（Discord のボタン押下）は
そのテナントの動いているすべての gateway セッションに送ります。そのため、gateway が自分の prompt を
兄弟の gateway のものと見分けるのに nonce を使います。`style` はプラットフォームごとに対応付けられます
（primary/success/danger/secondary）。`timeout_s` は通信上は参考値で、
期限切れの判定は gateway 側で行います（保留中の prompt の登録簿が期限切れの
エントリーを捨て、持ち主の gateway が「もう待っていません」という短い
お知らせを返します）。

**`prompt_response`（Phase 3 の受信）。** ユーザーのボタン押下は、
`prompt_response: {prompt_id, option_id, label?, prompt_message_id?}` を持つ
通常の受信 MessageEvent として戻ってきます。プラットフォームの `custom_id` がそのまま来ることは
ありません。イベントの `text` は `/{option_id}` と同じ内容で、
`message_type: "command"` が付きます。そのため、このフィールドより前の gateway でも、押下を
捨てずに入力された返信として扱えます。このフィールドを理解する gateway は、
押下を必ず自分で消費します。自分が発行していない prompt の ID は、
同じ一斉送信が届いた兄弟の gateway のものです。
`/{option_id}` のテキストをチャットの経路に流すと、持ち主が1回 ack しただけなのに、兄弟の gateway がすべて
「Unknown command」と答えていました。送信元は、実際に
クリックした本物のユーザーです（connector が観測したもの: Telegram の `callback_query.from`、Slack の
`block_actions.user`、WhatsApp の `messages[].from`、Discord のインタラクションの
member/user）。そのため gateway 側の認可のゲートは、入力された `/approve` と
まったく同じようにボタン押下にもかかります。取り込みの経路は、Telegram の `callback_query`
（ポーリング、`allowed_updates` を広げています。できる範囲で `answerCallbackQuery` を呼んで
スピナーを止めます）、Slack の `POST /slack/interactions`（生のバイト列に対する HMAC とリプレイ
ウィンドウ。`/slack/commands` と同じ扱い）、WhatsApp の対話型
`button_reply`/`list_reply`（webhook の正規化の分岐）、Discord の type-3 の
コンポーネントインタラクション（パススルー §5.1 の無害化した転送。type-3 の入口での
ack は `DEFERRED_UPDATE` なので、「thinking…」の返信は表示されません）です。ほかの
連携のボタンなど、無関係なコールバックのペイロードが prompt のイベントになることはありません。
Telegram/Slack/WhatsApp では connector で捨てられ、Discord の type-3 の
転送は従来どおり custom_id をテキストにした形のままです。

**`react`（Phase 3 の ack のライフサイクル）。** bot 自身の `emoji`
リアクションを `message_id` に付けたり外したりします。ネイティブのアダプターにある 👀→✅/❌ の
処理状況を示す ack を、relay 越しでも使えるようにするものです。通信上は Unicode の絵文字で、
Slack の送信側は Slack の名前の語彙（`eyes`、`white_check_mark`、…）に対応付け、
`already_reacted`/`no_reaction` を成功として扱います（冪等）。Telegram は
`setMessageReaction` を使います（空の組 = 外す。Telegram は使える絵文字が決められているので、
文字によっては拒否されます — その失敗は構造化されて返り、gateway は
リアクションを見た目だけのものとして扱います）。WhatsApp はリアクションのメッセージを送ります（空の
絵文字 = 外す）。契約上、リアクションはできる範囲での処理です。`react` が失敗しても、
ターンを失敗させてはいけません。

**`thread_create` / `thread_rename`（Phase 4 のスレッドのライフサイクル）。** プラットフォームに依存しない
1組の op で、引き継ぎのスレッド、Telegram の DM/フォーラムのトピック、
LLM が付けるタイトルによる意味に沿った名前の変更をまとめて扱います。`thread_create` では、Discord はチャンネルのスレッド
（type 11）を作るか、`message_id` があればメッセージを起点にしたスレッドを作ります。Telegram は
`createForumTopic` を使います（トピックの ID が返ります）。Slack は名前付きの起点になる親
メッセージを投稿してその `ts` を返します（Slack のスレッドはメッセージを起点にします —
明示的に `message_id` の起点を渡すと、そのまま返されます）。作られた ID は
`SendResult.thread_id` に載ります。`thread_rename` では、Discord はスレッドのチャンネルを PATCH し、
Telegram は `editForumTopic` を使います。**`only_if_current_name` による上書き防止のガード**は、
ネイティブのアダプターにある「人が付けた名前を優先する」という挙動で、
connector 側で強制します。Discord は先に今の名前を読み、一致しなければ何もしません（構造化された
`success:false`）。Telegram にはトピック名を読む手段がないので、ガード付きの
名前変更は満たせず、安全側に失敗します（ガードなしの名前変更は実行されます）。Slack は
`thread_rename` を申告しません（親メッセージのテキストは内容であって、
名前ではないためです）。WhatsApp はどちらも申告しません（スレッドがありません）。

**自動スレッドの目印と、gateway が申告するコマンド一覧（Phase 4 の
受信/ハンドシェイク）。** connector の自動スレッド化の送信方針が
Discord のスレッドを作ると、そのスレッドから後で届く受信イベントには
`source.auto_thread_created: true` と `source.auto_thread_initial_name` が付きます。これは
connector が観測した証拠で、gateway の意味に沿った名前変更の経路を有効にします
（LLM のセッションタイトルが、ガード付きの `thread_rename` でスレッド名を変えます。
記憶はインスタンスごとなので、N>1 の構成で取りこぼしても、その経路が有効にならないだけです）。
gateway は、Discord の
`hello` フレームで自分のスラッシュコマンドの組を申告することもできます（`command_manifest: [{name, description, options?}]`）。
connector は Discord のグローバルなアプリケーションコマンドの登録を、
これに合わせて調整します（GET → 差分 → 一括 PUT で上書き。冪等で、間引きされ、
できる範囲での処理です — 登録に失敗してもハンドシェイクには影響しません）。コマンドは
これまでどおりパススルー面から配送されます。一覧は、
Discord の登録内容を gateway の dispatcher が扱えるものと揃えておくためだけのものです。

**受信の `reply_to` の補足情報（Phase 4）。** プラットフォームの返信は、
`reply_to_message_id` と一緒に `reply_to: {text?, author?, is_own?}` を持つことがあります。
ユーザーが引用したものを表し、connector がすでに手元に持っていたデータだけから埋めます
（Discord のインラインの `referenced_message`、Telegram のインラインの
`reply_to_message`、WhatsApp の `context.from` と、テキスト部分についてはインスタンスごとの
上限付きの受信テキストのキャッシュ）。フィールドがなければ、プラットフォームがそのデータを
持っていなかったということです。そのためにプラットフォームの API を追加で呼ぶことはありません。`is_own` は、
引用されたメッセージを前段の bot が書いたことを示します（
`is_reply_to_bot` の関連性の目印と同じ証拠です）。gateway はこれらを、
ネイティブのアダプターが埋めるのと同じ MessageEvent の返信文脈のフィールドに対応付けます。

**`typing` の `content?`（Slack のステータスの消去）。** `typing` フレームは通常
`content` を省きます。connector はプラットフォームの入力中の表示（Slack では
「is typing…」の Assistant ステータス、それ以外では1回きりの入力中表示）を出します。
`content` が**空文字列**のときは、明示的な*消去*の要求です。Slack では connector が
Assistant のスレッドのステータスを `""` にして消します。gateway は
Slack（ステータスが残り続ける）に対してだけ消去を送り、1回きりの表示のプラットフォームには送りません。
`contract_version` 1 の範囲内での追加ですが、デプロイの順番に注意してください。
gateway-gateway #154 より前の connector は `content` を無視し、消去のフレームで逆に「is typing…」を
*表示*してしまいます — connector を先にデプロイしてください。

**`follow_up`（A2 の capability アクション）。** 受信ペイロードの中には、
**共有**の bot の ID として動く認証情報を持つものがあります（例: Discord のインタラクションの follow-up
トークン）。§6 のとおり、connector はそれを入口で取り除き、セッションをキーにして
capability の保管庫に結び付けます。それが **gateway に届くことはありません**。これを
使うには、gateway は**すでに入っているセッション**（`session_key`）と
capability の `kind`（例: `discord.interaction_token`）を指定して `follow_up` を出します。
**トークンは渡しません**。connector は保管庫から実際の値を取り出し、
テナントが一致するかを強制し（テナント B がテナント A の capability を使うことはできません）、
送出します。capability が無いか期限切れのとき、またはテナントが
一致しないときは `success: false` になります。gateway には再試行に使えるものが何もありませんが、これは設計どおりです（漏えいした
gateway は capability の材料を何も持っていません）。正本は
`gateway/relay/transport.py`（`send_follow_up`）と `gateway/relay/adapter.py` です。

---

## 5. 割り込み（`/stop`）のルーティング {#5-interrupt-stop-routing}

- **gateway → connector:** `send_interrupt(session_key, reason?)` は、ターンの途中の
  `/stop` を外向き WS で送出します。connector は、その `session_key` を動かしている
  gateway のインスタンスへ必ず転送します（ルーティングの不変条件）。
- **connector → gateway:** ある `session_key` への受信の割り込みは、
  gateway の外向き WS に `interrupt_inbound` フレームとして届きます（§3 のトランスポートの
  注記）。relay bus を通って、ソケットを持っているインスタンスへインスタンスをまたいで振り分けられ、
  アダプターの `on_interrupt(session_key, chat_id)` によって
  既存のセッションごとの割り込みの仕組みにつながり、そのターンだけを取り消します
  （ほかのターンには触れません）。

どちらの向きも gateway の外向き WS を使います。gateway→connector の `/stop` は
その上で送出され、connector→gateway の割り込みは、正規化されたイベントとして同じ `inbound` の
逆方向チャンネルを流れます。

---

## 6. 信頼の境界と署名付き本文の扱い（A2） {#6-trust-boundary-signed-body-handling-a2}

**暗号と ID の境界は connector だけです。gateway は何も検証し直しません。**

webhook の署名（Discord の ed25519、Twilio の HMAC、WeCom の BizMsgCrypt）は
生のバイト列そのものに対して計算され、ペイロードによっては共有
シークレットで*暗号化*されています。connector は多数のテナントのために**共有**の bot の前段に立ち、すべての
テナントのプラットフォームのシークレットを持っているので、次のことを行います。

- **入口で検証・復号します**（シークレットがあるのはそこだけです）。
- ペイロードをテナント単位の `MessageEvent` に**正規化します**（§3）。
- **共有 ID として動く capability を**ペイロードから**取り除き**、セッションをキーにして
  capability の保管庫に結び付けます（§4 の `follow_up` を参照）。
- **無害化した `MessageEvent` だけを転送します**。生の署名付き本文は転送しません。

そのため gateway は、relay の経路ではプラットフォームの署名や暗号の検証を**一切**行わず、
正規化されたイベントを信頼します。これは gateway 側で強制された不変条件です
（`tests/gateway/relay/test_relay_sheds_crypto.py`: relay の
パッケージはプラットフォームの暗号処理を import も呼び出しもしません）。

**なぜ「署名付き本文を1バイトも変えずに転送し、gateway に検証し直させる」方式にしないのか？**
その以前のモデルは、信頼できず使い捨てにされるテナントの gateway という前提では成り立ちません。

- Twilio の HMAC や WeCom の暗号を検証し直すには、gateway に
  **共有の署名シークレット**を渡す必要があります。それ自体が漏えいであり、共有 bot では
  *テナントをまたいだ*漏えいになります。
- WeCom のペイロードは共有シークレットで暗号化されています。connector は振り分けるだけでも入口で
  復号しなければならず、暗号文を転送すれば、やはり gateway にシークレットを
  渡す必要が出てきます。
- Discord のインタラクションのトークンは、署名付き JSON 本文の**中に**あります。バイト列を保ったまま
  認証情報だけを取り除くことはできません。両者は同じバイト列だからです。

そこで、バイト列の保存は意図的にやめています。connector は無害化したイベントを
シリアライズし直し、gateway はそれを信頼します。これによりパススルー面と
relay 面も一本化されます。どちらも「入口で検証する → 正規化したイベントを出す」で、違うのは
トランスポートだけです。A2 の考え方の全体と connector 側の保管庫については、`docs/capability-trust-boundary.md`（connector のリポジトリ:
`gateway-gateway`）を参照してください。

### 6.1 チャンネルの認証（connector⇄gateway のリンクそのもの） {#61-channel-authentication-the-connectorgateway-link-itself}

A2 では connector だけがプラットフォームのシークレットを持ちますが、gateway は
**顧客が管理し、インターネットに公開されている**こともあります。そのため connector⇄gateway のチャンネル
自体も認証します。gateway は、enroll またはプロビジョニングで発行された
**gateway ごとのシークレット**（`hermes gateway enroll` → connector の `/relay/enroll`、または
マネージドのセルフプロビジョニング → `/relay/provision`）を持ち、これで外向き WS の
アップグレードを認証します。複数のシークレットを検証リストに並べてローテーションできる HMAC-SHA256 の方式です
（gateway 側: `gateway/relay/auth.py`、connector 側:
`src/core/relayAuthToken.ts`）。

| 区間 | 認証情報 | 仕組み |
|-----|-----------|-----------|
| gateway → connector の WS アップグレード | gateway ごとのシークレット | `/relay` のアップグレードに付ける `Authorization` の bearer ヘッダーです。トークンは `base64url(payload:exp:sig)` で、`payload = gatewayId`、`sig = HMAC(payload:exp, secret)` です。connector はこれを検証し、不一致・欠落・失効のときはアップグレードを拒否します（**close 4401**）。認証されたテナントは connector のストアから取り、`hello` フレームからは取りません。 |
| connector → gateway の受信（`inbound` / `interrupt_inbound` フレーム） | —（認証済みの WS に乗ります） | 受信は gateway がすでに認証を済ませた外向きソケットに流し込まれるので（§3）、メッセージごとの署名は要りません。**テナントごとの配送キー**は今も enroll/プロビジョニングの時に発行され、前方互換のために残していますが、受信の署名にはもう使っていません。 |

これは**チャンネル**の認証で、プラットフォームの暗号とは別物です。プラットフォームの暗号は、
relay の経路では今もすべて外しています（§6）。gateway はプラットフォームのシークレットを何も持たず、
gateway ごとのシークレットが認証するのは connector とのリンクだけです。脅威モデルの全体と、
enroll・ローテーション・緊急停止の設計は `docs/connector-gateway-auth-design.md`
（connector のリポジトリ）にあります。

---

## 7. インスタンスごとの配送と管理面（Phase 6） {#7-per-instance-delivery-the-management-plane-phase-6}

Phase 1〜5 では、connector を単一テナントの前段として扱います。あるテナント宛ての受信イベントは、
そのテナントの gateway のソケットへ広がって届きます。**Phase 6 では配送を
インスタンスごとにします**。共有の bot が、1つのテナント（1つの
Discord ギルド、1つの Telegram bot）の中で多数のユーザーやエージェントの前段に立っても、別の宛先に誤って届かないようにするものです。あわせて、エージェント（またはマネージドの Portal）が
誰が何を見られるか、何が関係あるかを申告するための小さな**管理面**が加わります。
これらはすべて **connector 側**にあります。gateway に新しく加わる
責任は、起動時に**関連性の方針を申告すること**だけです（§7.3）。

### 7.1 配送のゲート（connector 側、参考情報） {#71-the-delivery-gate-connector-side-informational}

connector は、受信イベントごとに、3つのフィルターを AND で組み合わせてどのインスタンスが受け取るかを決めます。
gateway はこれらを実装しません（connector の中で動きます）が、
gateway が前提にする配送の意味を定めるものです。

| 層 | 問い | 正本 |
| --- | --- | --- |
| **持ち主 / スコープ ∧ principal** | このインスタンスは、ここでこの書いた人を*見て*よいか？ | ユーザーごとの `user_id → instance` の結び付け（持ち主の床）と、インスタンスごとの `(guild, channel)` のスコープ付与、そして `owner-only` / `allow-list` / `any` の principal の方針。 |
| **可視性の床** | インスタンスに結び付いた持ち主は、Discord でこれを実際に `VIEW_CHANNEL` できるか？ | Discord のライブの ACL（実効権限）で、安全側に閉じます。広すぎるスコープ付与を下方向に絞ります。 |
| **関連性** | 見てよい*として*、エージェントは反応すべきか？ | §7.3 で申告する関連性の方針（宛先指定の要否、自由に応答するスコープ、bot の許可）。 |

この組み合わせは配送を**絞る**方向にしか働きません（`deliver ⇔ authorized ∧ visible
∧ relevant`）。**持ち主の床は関連性の層を通りません**（書いた人自身の
メッセージは、必ずその人のインスタンスに届きます — 自分のエージェントに @メンションはしないからです）。
結び付けのないユーザーが書いたメッセージは、どのインスタンスにも届きません（安全側に閉じる）。
設計と不変条件の全体は connector のリポジトリ
（`NousResearch/gateway-gateway`）にあります。この節は gateway から見た要約です。

### 7.2 管理用のルート（connector 側、認証あり） {#72-management-routes-connector-side-authenticated}

connector は認証付きの管理用ルートを持ちます。これらは WS アップグレードと**同じ
2通りの認証**を使います。マネージドの NAS が署名した `aud=agent:{instanceId}`
RS256 JWT か、gateway 自身の gateway ごとのシークレットによる bearer（§6.1 の
`make_upgrade_token`）の**どちらか**です。どちらの場合も、connector は正式な
`{tenant, instanceId}` を**保存済み**の記録から決め、リクエストの
本文からは**決めません**（本文で主張された `instanceId` は無視されます）。

| ルート | 目的 |
| --- | --- |
| `POST /manage/link` | プラットフォームのアカウントを認証済みのインスタンスに結び付けるための、有効期間の短いコードを発行します（`/link <code>` の流れ。connector は本物の `user_id` を受信イベントから読みます）。 |
| `POST /manage/scope`、`/manage/scope/release` | 認証済みのインスタンスについて `(guild, channel)` のスコープを取得・解放します。1つのチャンネルを持てるインスタンスは最大1つです（重複しないことは主キーの制約で保証します）。 |
| `POST /manage/principal` | インスタンスの principal の方針（`owner-only` \| `allow-list` \| `any`）を設定します。 |
| `POST /manage/dm-default` | ユーザーの DM の既定のインスタンスを設定します（ユーザーが複数のインスタンスに連携しているときの DM の決め手）。 |
| `POST /relay/policy` | インスタンスの**関連性の方針**を申告します（§7.3）。 |

これらは connector が持つもので（管理面は gateway の
エージェントの経路には含まれません）、gateway が呼ぶのは `POST /relay/policy`（§7.3）だけです。ほかは
マネージドの Portal や `hermes` CLI から使います。

### 7.3 関連性の方針の申告（gateway の責任） {#73-relevance-policy-declaration-the-gateways-responsibility}

関連性の層（§7.1）は、gateway 自身の振る舞いの設定
（`require_mention`、`free_response_channels`、
`{PLATFORM}_ALLOW_BOTS`）とテナント単位で同じ働きをするものです。relay の配送にも**同じ**振る舞いが効くように、
gateway はそれらの設定を**プラットフォームに依存しない**方針に写し、
起動時に（gateway ごとのシークレットが解決されたあとで）`POST /relay/policy` に POST します。

本文（`gateway/relay/__init__.py` の `relay_relevance_policy()` → `send_relay_policy()`）:

| フィールド | 型 | 写し元 | 意味 |
| --- | --- | --- | --- |
| `platform` | string | 前段のプラットフォーム（`relay_platform_identity`） | この方針を適用するプラットフォーム。 |
| `requireAddress` | bool | `require_mention` | 持ち主以外のメッセージは、bot に @メンションするか返信しないと関係ありと扱われません。 |
| `freeResponseScopes` | string[] | `free_response_channels` | `requireAddress` を免除するスコープ（チャンネル）の ID。§7.1 のスコープ付与と同じスコープの語彙です。 |
| `allowOtherBots` | bool | `{PLATFORM}_ALLOW_BOTS ∈ {mentions, all}` | bot が書いたメッセージを受け入れるか（既定はオフ）。 |

認証は gateway ごとのアップグレードトークン（§6.1）なので、connector は
方針を認証済みのインスタンスに結び付けます。gateway が**正本**で、
**起動のたびに**申告し直します（丸ごとの置き換えで、プロビジョニング時の `routeKeys` の upsert と
同じく、自己修復します）。写した方針がすべて既定値なら、gateway は
何も送りません（connector で行が無いときの既定値とすでに一致するためです）。この POST は
**失敗しても止まりません**。失敗はログに残り、起動はそのまま進みます。関連性は
認可のゲート（§7.1）の上に重ねた最適化であって、起動の依存関係ではありません。
**gateway に新しい受信面は加わらず**、**新しい認証情報もありません**。
gateway ごとのシークレットと、`/relay/provision` と同じホストを使い回します。

> 関連性による破棄は、connector がゼロまでスケールしたエージェントを起こす**前に**行われます
> （Phase 5）。そのため除外された会話でエージェントが起動することはありません。関連性は
> 正確性のフィルターであると同時に、ゼロスケールのための主要な手段でもあります。

---

## 8. gateway 側のプラットフォームの振る舞いの設定（エンタープライズ） {#8-gateway-side-platform-behavior-controls-enterprise}

エンタープライズ環境では、前段のプラットフォームの振る舞いを gateway
側の `platforms.relay.extra.<platform>` で設定します。そのプラットフォームの
ネイティブな設定のうち、対応している一部です。ネイティブのプラットフォームのブロック（例: `platforms.slack`）は
relay の経路では読まれません。connector はこれらの設定の*結果*を
フレームのメタデータ（§4）として受け取り、機械的に実行するだけで、
プラットフォームの振る舞いの方針を自分では持ちません。

```yaml
platforms:
  relay:
    extra:
      slack:
        reply_in_thread: true   # default
```

解決の順番: 入れ子の `extra.<platform>` オブジェクトが優先 →
`extra` 直下の旧来のフラットなキーを代替として参照 → 既定値。正本は
`RelayAdapter._effective_reply_in_thread`（`gateway/relay/adapter.py`）です。
値の変換はネイティブの Slack アダプターとまったく同じで、`1/true/yes/on`
（大文字小文字を区別せず、前後の空白を除く）がオン、それ以外はすべてオフです。そのため
YAML で引用符付きにした `"false"` は、真とみなされる文字列として読まれず、ちゃんと設定をオフにします。

現在の設定（Slack）:

| キー | 既定値 | 効果 |
| --- | --- | --- |
| `reply_in_thread` | `true` | `true`: メッセージごとにスレッドを作ります。DM のトップレベルのメッセージごとに、それを起点にしたスレッドができます（ステータス、進捗、prompt、最終的な返信はすべてその `metadata.thread_id` を持ちます）。`false`: 流れていくフラットな DM です。送信経路のフレームはスレッドの起点を持たず（省略ではなく取り除かれます）、DM ごとに1つのセッションを共有します。 |
| `dm_top_level_threads_as_sessions` | `true` | ネイティブと同じ挙動にするための逃げ道です（`platforms.slack.extra.dm_top_level_threads_as_sessions` と同じ）。`true`: メッセージごとにスレッドを作るモードで、DM のトップレベルのメッセージごとに別のセッションになるので、同時に来たメッセージが並列に処理されます。`false`: 返信はスレッドに置いたまま、セッションの区切りだけを省きます — DM 全体で1つの流れていくセッションになります（従来の steer/queue の扱い）。フラットモードでは効果がなく、常に1つの流れていくセッションのままです。 |

入力中表示やステータスのフレームは、きっかけのメッセージの ts の起点がわかっていれば常にそれを持ちます
（動いていることの表示は、どちらのモードでも無条件です）。Slack のステータス行は
スレッド単位で表示されるためです。フラットモードでは、送信側で起点を取り除くので、
ステータスの起点が返信の置き場所に漏れることはありません。ネイティブの
キーの意味については [Slack](/hermes/docs/user-guide/messaging/slack/) を参照してください。

スレッドの起点の解決は、テキスト（`send`）でもメディア
（`send_media`）でも、すべての送信経路に1か所の関門
（`RelayAdapter._apply_slack_thread_anchor`）を通して適用されます。メディアのフレームは、
`metadata.thread_id` だけを見てスレッドに置く connector 側の同じ Slack 送信側から出ていくので、
添付の起点もテキストの返信とまったく同じように解決されます。
メッセージごとにスレッドを作るモードではメタデータに持ち上げられ、フラットモードでは取り除かれます。

変更は gateway の再起動で反映されます。connector 側での作業は要りません。

---

## 9. バージョン管理の方針 {#9-versioning-policy}

- `contract_version` は int です。実験段階では、追加の変更（新しい任意フィールド、新しい `op`）の
  ときに**だけ**上げます。
- 互換性を壊す変更（フィールドの名前変更や削除、意味の変更）では、
  両方のリポジトリを揃えて更新し、バージョンを上げる必要があります。
- connector の最初の PR には、実装の基準にしたこのファイルのコミット SHA を
  記載します。
