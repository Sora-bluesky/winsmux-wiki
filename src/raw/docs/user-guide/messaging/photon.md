---
title: "user-guide/messaging/photon"
description: ""
upstream_path: user-guide/messaging/photon.md
upstream_blob: 04e79d5d4447267f4f34f3be80abd8dc9fee48a6
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/photon
---

# Photon iMessage {#photon-imessage}

[Photon][photon] を経由して、Hermes を **iMessage** につなぎます。Photon は
Apple 側の回線の割り当てと不正利用の防止を引き受けてくれる
サービスなので、自分で Mac の中継機を用意する必要がありません。

無料枠では Photon の共有 iMessage 回線を使います。相手によって
送信元の番号が違って見えることはありますが、ひとつの会話の中では
番号は変わりません。有料の Business プランなら、どのユーザーにも
同じ専用番号が割り当てられます。プラグインはどちらにも対応していて、
まずは無料枠から始めるのがおすすめです。

:::info 無料で使い始められます
Photon の共有回線は無料です。Hermes から最初の iMessage を送るのに
サブスクリプションは要りません。アカウントに紐づけられる電話番号が
1 つあれば十分です。
:::

## 構成 {#architecture}

Photon は Discord や Slack と同じ **接続を張りっぱなしにする** 種類のチャンネルです。
**webhook も、公開 URL も、管理する署名用の秘密鍵もありません。**

`spectrum-ts` の SDK が、送受信の両方向で Photon への長寿命の **gRPC ストリーム** を保持します。この SDK は TypeScript でしか使えないので、Hermes は小さな **Node のサイドカー** として監視付きで動かし、ループバック越しにやり取りします。

- **受信** — サイドカーが SDK の `app.messages` の gRPC
  ストリームを読み、ループバックの `GET /inbound`（NDJSON）で
  各メッセージを Python のアダプタへ渡します。アダプタは重複を取り除いて
  エージェントへ渡し、ストリームが切れたら自動でつなぎ直します。
- **送信** — 返信はループバックの POST でサイドカーに送られ、サイドカーが
  SDK の `space.send(...)` を呼びます。

サイドカーの起動・監視・終了は、Python のプラグインが自動で
面倒を見ます。

## 事前に必要なもの {#prerequisites}

- Photon のアカウント。登録は [app.photon.codes][app] から
- PATH の通った **Node.js 18.17 以降**（`node --version`）
- iMessage を受け取れる電話番号（アカウントとの紐づけに使います）

必要なのはこれだけです。公開 URL もトンネルも用意する必要はありません。

## 初回の設定 {#first-time-setup}

まとめて設定できるゲートウェイのウィザードを動かして **Photon iMessage** を選ぶか、

```bash
hermes gateway setup
```

…もしくは Photon の設定を直接動かします（ウィザードも同じ流れを呼んでいます）。

```bash
# Device-code login + project + user + sidecar deps, all in one
hermes photon setup --phone +15551234567
```

設定は次の順に進みます。

1. **デバイスによるログイン**（`client_id=photon-cli`）。承認のために
   `https://app.photon.codes/` が開き、ベアラートークンが保存されます。
2. アカウントの中の `Hermes Agent` プロジェクトを **探すか、なければ作ります**。
3. **Spectrum を有効にし**、プロジェクトの Spectrum の ID を読み取って、
   プロジェクトの秘密鍵を入れ替えます。
4. **電話番号を Spectrum のユーザーとして登録します**。同じ番号のユーザーが
   すでにあれば飛ばすので、やり直しても安全です。
5. **割り当てられた iMessage 回線を表示します**。エージェントに連絡するとき、
   ここに宛ててメッセージを送ります。
6. プラグインのサイドカーのディレクトリで **`npm install` を実行します**。
   書き込みできない、または変更できないインストール先（ホスティングされた Docker
   イメージ、Podman、Nix）では、サイドカーは自動的に
   `~/.hermes/photon/sidecar` の下の書き込める複製に切り替えます。場所を
   自分で決めたいときは `PHOTON_SIDECAR_DIR` を設定してください。

実行時の認証情報は `~/.hermes/.env`
（`PHOTON_PROJECT_ID` は Spectrum のプロジェクト ID、`PHOTON_PROJECT_SECRET`）に書かれます。
他のチャンネルがトークンを置いているのと同じ場所です。管理用の情報
（デバイストークン、ダッシュボードのプロジェクト ID）は `~/.hermes/auth.json` の
`credential_pool.photon` / `credential_pool.photon_project` の下にあります。

## ユーザーを許可する {#authorizing-users}

Photon の許可の仕組みは、他の Hermes のチャンネルとまったく同じです。
次のどれかを選びます。

**個人チャットでのペアリング（既定）。** 知らない番号から Photon の回線に
メッセージが来ると、Hermes はペアリング用のコードを返します。承認はこうします。

```bash
hermes pairing approve photon <CODE>
```

保留中のコードと承認済みのユーザーは `hermes pairing list` で確認できます。

**特定の番号をあらかじめ許可する**（`~/.hermes/.env` に書きます）。

```bash
PHOTON_ALLOWED_USERS=+15551234567,+15559876543
```

**誰でも受け付ける**（開発用途のみ。`~/.hermes/.env` に書きます）。

```bash
PHOTON_ALLOW_ALL_USERS=true
```

`PHOTON_ALLOWED_USERS` を設定していると、知らない送信者にはペアリングのコードを
出さず、黙って無視します（許可リストを書いた時点で、意図して
アクセスを絞ったと判断します）。

### グループチャットでは呼びかけを必須にする {#require-mentions-in-group-chats}

既定では、Hermes は許可された個人チャットとグループのメッセージすべてに応答します。
グループチャットでは呼ばれたときだけ動くようにしたい場合は、呼びかけの判定を
有効にします（個人チャットはこれまでどおり常に動きます）。

```yaml
gateway:
  platforms:
    photon:
      enabled: true
      require_mention: true
```

`require_mention: true` にすると、グループチャットのメッセージは
呼びかけの語に当てはまらない限り無視されます。既定では `Hermes` と
`@Hermes agent` の形が該当します。エージェントに独自の名前を付けている場合は、
正規表現のパターンを設定します。

```yaml
gateway:
  platforms:
    photon:
      require_mention: true
      mention_patterns:
        - '(?<![\w@])@?amos\b[,:\-]?'
```

どちらのキーも環境変数（`PHOTON_REQUIRE_MENTION`、
`PHOTON_MENTION_PATTERNS`）で設定できます。BlueBubbles の iMessage チャンネルと
同じ呼びかけ判定の仕組みです。

## ゲートウェイを起動する {#start-the-gateway}

```bash
hermes gateway start
```

こんな表示が出ます。

```
[photon] connected — sidecar on 127.0.0.1:8789, streaming inbound over gRPC
```

割り当てられた番号に iMessage を送れば、Hermes が返事をします。

## 状態の確認と困ったとき {#status-troubleshooting}

```bash
hermes photon status
```

保存されている認証情報、サイドカーの健全性、登録した番号、そして Hermes が使う
割り当て済みの iMessage 回線を表示します。Photon のトークンとダッシュボードの
プロジェクトが揃っていれば、`status` は新しい回線を用意することなく、
足りない番号の行をダッシュボードから取り直して埋めます。

```
Photon iMessage status
──────────────────────
  device token        : ✓ stored
  dashboard project   : 3c90c3cc-0d44-4b50-...
  spectrum project id : sp-...
  project secret      : ✓ stored
  my number           : +15551234567
  assigned number     : +16282679185
  node binary         : /usr/bin/node
  sidecar deps        : ✓ installed
```

よくあるつまずきは次のとおりです。

- **`sidecar deps : ✗ run hermes photon install-sidecar`** — Node は
  入っていますが `spectrum-ts` がありません。表示されたコマンドを実行してください。
- **`device token : ✗ missing`** — `hermes photon setup` を実行してログインしてください。
- **`No iMessage line assigned yet`** — Spectrum は有効ですが、回線が
  まだ用意されていません。`hermes photon setup` をやり直すか、
  [ダッシュボード][app] を確認してください。
- **サイドカーが起動しない** — `node --version` が 18.17 以降であること、そして
  `hermes photon install-sidecar` がエラーなく終わっていることを確かめてください。

## 今の時点での制限 {#limits-today}

- **受信した添付ファイルは、情報だけしか分かりません。** 受信のイベントには
  ファイル名と MIME タイプが入っており、エージェントには目印として見えますが、
  中身をまだ読めません。SDK は `content.read()` で添付ファイルの中身を
  取り出せるので、これはサイドカー側の今後の課題です。
- **送信する添付ファイルには対応しています。** Hermes は画像、音声メモ、
  動画、書類を、spectrum-ts の `attachment()` / `voice()` という
  コンテンツの組み立てを通し、サイドカーの `/send-attachment`
  エンドポイント経由で送ります。説明文はメディアの後に、別の iMessage の
  吹き出しとして届きます。
- **iMessage 本来の投票にも対応しています。** Hermes は spectrum-ts の
  `poll()` を使い、サイドカーの `/send-poll` エンドポイント経由で投票を送ります。
- **開封通知にも対応しています。** サイドカーは受信した iMessage を Hermes へ
  渡した時点で既読にするので、送った相手はモデルやツールのターンを待たずに
  `Read` を見られます。Hermes が送ったメッセージに対する受信側の通知は
  存在確認の情報として処理され、エージェントのターンにはなりません。
  `PHOTON_READ_RECEIPTS=false` にすると `Delivered` のままにできます。
- **メッセージのエフェクトにも対応しています。** Hermes は spectrum-ts の
  iMessage 用の `effect()` を使い、サイドカーの `/send-effect` エンドポイント
  経由で、iMessage 本来の吹き出し・画面のエフェクト付きのテキストを送ります。
- **Photon の無料枠の上限:** サーバーあたり 1 日 5,000 通、
  共有回線あたり 1 日 50 件の新規の会話の開始まで。引き上げも
  できます。`help@photon.codes` にメールしてください。
- **cron や単独での送信には、ゲートウェイが動いている必要があります。** プロセスの外からの
  送信（cron のジョブ、`hermes send`、ダッシュボード）は、ゲートウェイが
  立ち上げたサイドカーを使い回します。ポートとトークンは
  `<hermes-home>/runtime/photon-sidecar.json` から読みます。このファイルはサイドカーが
  健全性の確認を通った時点で書かれ、止まると消えます。単独での送信が
  ゲートウェイは動いていないようだと言ってきたら、まずゲートウェイを起動（または再起動）してください。
- **共有回線・無料枠の回線からは、新しい相手に会話を始められません。**
  Photon 側の方針で、共有回線がある番号にメッセージを送れるのは、
  その番号から先に連絡が来たあとだけです。まったく新しい相手への
  cron や単独での送信は、Hermes が正しく設定されていても Photon に
  断られます。相手から一度メッセージを送ってもらうか、
  専用回線に移ってください。

## 環境変数 {#env-vars}

| 変数                  | 既定            | 備考                                      |
|---------------------------|--------------------|--------------------------------------------|
| `PHOTON_PROJECT_ID`       | `.env` から        | Spectrum のプロジェクト ID（SDK でいう `projectId`）。設定時に書き込まれます |
| `PHOTON_PROJECT_SECRET`   | `.env` から        | プロジェクトの秘密鍵。設定時に書き込まれます               |
| `PHOTON_SIDECAR_PORT`     | `8789`             | サイドカーの操作と受信に使うループバックのポート |
| `PHOTON_SIDECAR_AUTOSTART`| `true`             | アダプタがサイドカーを立ち上げるかどうか     |
| `PHOTON_NODE_BIN`         | `which node`       | Node の実行ファイルのパスを上書きします              |
| `PHOTON_HOME_CHANNEL`     | （未設定）            | cron や通知の既定の space の ID  |
| `PHOTON_HOME_CHANNEL_NAME`| （未設定）            | ホームチャンネルの表示名           |
| `PHOTON_ALLOWED_USERS`    | （未設定）            | カンマ区切りの E.164 形式の許可リスト            |
| `PHOTON_ALLOW_ALL_USERS`  | `false`            | 開発用途のみ。どの送信者も受け付けます               |
| `PHOTON_REQUIRE_MENTION`  | `false`            | グループで応答する前に呼びかけの語を必須にします |
| `PHOTON_MENTION_PATTERNS` | Hermes の呼びかけの語  | グループでの呼びかけを判定する正規表現。JSON の配列、カンマ区切り、改行区切りで書けます |
| `PHOTON_DASHBOARD_HOST`   | `app.photon.codes` | ダッシュボードとデバイスログインのホストを上書きします |
| `PHOTON_SPECTRUM_HOST`    | `spectrum.photon.codes` | Spectrum の API のホストを上書きします |

[photon]: https://photon.codes/
[app]: https://app.photon.codes/
