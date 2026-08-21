---
title: "Photon の iMessage"
description: ""
upstream_path: user-guide/messaging/photon.md
upstream_blob: ee85f313e14d8532718d9c84411b1b60511234bc
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/photon
---

# Photon の iMessage {#photon-imessage}

[Photon][photon] を通して、Hermes を **iMessage** につなぎます。Photon は
Apple の回線の割り当てと迷惑行為の防止をまとめて引き受けてくれる
サービスなので、自分で Mac の中継機を用意する必要がありません。

無料の枠では、Photon が共有している iMessage の回線を使います。相手に
よって送信元の番号が違って見えることはありますが、同じ会話の中では
番号は変わりません。有料の Business の枠なら、全員に同じ専用番号が
割り当てられます。プラグインはどちらにも対応していて、まずは無料の枠から
試すのがおすすめです。

:::info 無料ではじめられます
Photon の共有回線は無料で使えます。Hermes から最初の iMessage を送るのに
定期契約は必要ありません。用意するのは、アカウントにひもづける電話番号
だけです。
:::

## 全体のつくり {#architecture}

Photon は Discord や Slack と同じく、**接続をつなぎっぱなしにする** 方式です。
**Webhook も、外から届く URL も、署名用の秘密の値も要りません。**

`spectrum-ts` という SDK が、送受信の両方で Photon への **gRPC の通信路** を
つなぎ続けます。この SDK は TypeScript でしか使えないため、Hermes は小さな
**Node のサイドカー** を見張りながら動かし、ループバック越しにやり取りします。

- **受信** — サイドカーが SDK の `app.messages` という gRPC の流れを受け取り、
  各メッセージをループバックの `GET /inbound`（NDJSON 形式）で Python の
  アダプターへ渡します。アダプターは重複を取り除いてエージェントへ回し、
  通信が切れたときは自動でつなぎ直します。
- **送信** — 返事はループバックの POST でサイドカーに渡され、サイドカーが
  SDK の `space.send(...)` を呼びます。

サイドカーの起動、見張り、終了は Python のプラグインが自動で行います。

## 事前に必要なもの {#prerequisites}

- Photon のアカウント — [app.photon.codes][app] で登録します
- PATH の通った **Node.js 18.17 以降**（`node --version` で確認できます）
- iMessage を受け取れる電話番号（アカウントとひもづけるために使います）

これだけです。外から届く URL やトンネルを用意する必要はありません。

## 最初の設定 {#first-time-setup}

ゲートウェイのウィザードを動かして **Photon iMessage** を選ぶか、

```bash
hermes gateway setup
```

…Photon の設定を直接動かします（ウィザードも同じ流れを呼んでいます）。

```bash
# Device-code login + project + user + sidecar deps, all in one
hermes photon setup --phone +15551234567
```

設定は次の順に進みます。

1. **端末でのログイン**（`client_id=photon-cli`） —
   `https://app.photon.codes/` が開くので承認すると、トークンが保存されます。
2. アカウントの中から `Hermes Agent` というプロジェクトを **探し、なければ作ります**。
3. **Spectrum を有効にし**、プロジェクトの Spectrum の ID を読み取って、
   プロジェクトの秘密の値を入れ替えます。
4. **電話番号を Spectrum の利用者として登録します**。同じ番号の利用者が
   すでにいる場合は飛ばすので、もう一度動かしても問題ありません。
5. **割り当てられた iMessage の回線を表示します** — エージェントに
   話しかけるときに宛先とする番号です。
6. プラグインのサイドカーのディレクトリで **`npm install` を動かします**。
   書き込みのできないインストール先（Docker の公開イメージ、Podman、
   Nix など）では、サイドカーが自動で `~/.hermes/photon/sidecar` の下の
   書き込める場所に切り替わります。場所を決め打ちしたいときは
   `PHOTON_SIDECAR_DIR` を設定してください。

動かすときに使う資格情報は `~/.hermes/.env` に書き込まれます
（`PHOTON_PROJECT_ID` が Spectrum のプロジェクト ID、`PHOTON_PROJECT_SECRET`
がその秘密の値です）。ほかのすべての経路がトークンを置くのと同じ場所です。
管理のための情報（端末のトークン、ダッシュボードのプロジェクト ID）は
`~/.hermes/auth.json` の `credential_pool.photon` /
`credential_pool.photon_project` に入ります。

## 使える人を許可する {#authorizing-users}

Photon でも、Hermes のほかの経路とまったく同じ考え方で相手を許可します。
やり方は次のうちどれか一つを選びます。

**個別チャットでのペアリング（初期状態）。** 知らない番号から Photon の
回線にメッセージが届くと、Hermes がペアリングコードを返します。次の
コマンドで承認します。

```bash
hermes pairing approve photon <CODE>
```

`hermes pairing list` を使うと、承認待ちのコードと承認済みの相手を確認できます。

**特定の番号をあらかじめ許可する**（`~/.hermes/.env` に記述）:

```bash
PHOTON_ALLOWED_USERS=+15551234567,+15559876543
```

**誰でも使えるようにする**（開発時のみ。`~/.hermes/.env` に記述）:

```bash
PHOTON_ALLOW_ALL_USERS=true
```

`PHOTON_ALLOWED_USERS` を設定している場合、知らない相手にはペアリング
コードを返さず、そのまま黙って無視します（一覧を作った時点で、意図して
相手を絞ったと見なすためです）。

### グループチャットで呼びかけを必須にする {#require-mentions-in-group-chats}

初期状態では、Hermes は許可済みの個別チャットにもグループのメッセージにも
すべて返事をします。グループチャットだけは呼びかけられたときに限りたい
場合は、メンションによる制限を有効にします（個別のやり取りはこれまで
どおり動きます）。

```yaml
gateway:
  platforms:
    photon:
      enabled: true
      require_mention: true
```

`require_mention: true` にすると、グループチャットのメッセージは呼びかけ語の
パターンに合致しないかぎり無視されます。初期値は `Hermes` と
`@Hermes agent` の言い回しに合わせてあります。エージェントの名前を変えて
いるときは、正規表現でパターンを指定します。

```yaml
gateway:
  platforms:
    photon:
      require_mention: true
      mention_patterns:
        - '(?<![\w@])@?amos\b[,:\-]?'
```

どちらの項目も環境変数で指定できます（`PHOTON_REQUIRE_MENTION`、
`PHOTON_MENTION_PATTERNS`）。BlueBubbles の iMessage で使うメンションの
仕組みとまったく同じです。

## ゲートウェイを動かす {#start-the-gateway}

```bash
hermes gateway start
```

次のような表示が出ます。

```
[photon] connected — sidecar on 127.0.0.1:8789, streaming inbound over gRPC
```

割り当てられた番号に iMessage を送ると、Hermes が返事をします。

## 状態の確認と、困ったときは {#status-troubleshooting}

```bash
hermes photon status
```

保存されている資格情報、サイドカーの様子、登録した番号、そして Hermes が
使う iMessage の回線を表示します。Photon のトークンとダッシュボードの
プロジェクトがそろっていれば、`status` は足りない番号の情報を
ダッシュボードから補います。新しい回線を新たに用意することはありません。

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

よくあるつまずきです。

- **`sidecar deps : ✗ run hermes photon install-sidecar`** — Node は
  入っているのに `spectrum-ts` が入っていません。表示されたコマンドを動かします。
- **`device token : ✗ missing`** — `hermes photon setup` を動かしてログインします。
- **`No iMessage line assigned yet`** — Spectrum は有効になっていますが、
  回線がまだ用意されていません。`hermes photon setup` をもう一度動かすか、
  [ダッシュボード][app]を確認します。
- **サイドカーが起動しない** — `node --version` が 18.17 以降であることと、
  `hermes photon install-sidecar` がエラーなく終わったことを確かめます。

## いまのところできないこと {#limits-today}

- **受け取った添付は、中身までは読めません。** 受信のイベントに載るのは
  ファイル名と MIME タイプだけで、エージェントには印が見えるものの、
  中身はまだ読めません。SDK は `content.read()` で添付の中身を取り出せる
  ので、これはサイドカー側での今後の作業になります。
- **送る側の添付は使えます。** Hermes は spectrum-ts の `attachment()` /
  `voice()` という組み立て機能を使い、サイドカーの `/send-attachment`
  を通して画像、音声メモ、動画、書類を送ります。説明文はメディアのあとに、
  別の iMessage の吹き出しとして届きます。
- **iMessage のアンケートを使えます。** Hermes は spectrum-ts の `poll()` を
  使い、サイドカーの `/send-poll` を通してアンケートを送ります。
- **メッセージの演出を使えます。** Hermes は spectrum-ts の iMessage 向けの
  `effect()` を使い、サイドカーの `/send-effect` を通して、吹き出しや画面の
  演出付きの文章を送ります。
- **Photon の無料枠の上限:** サーバーごとに一日 5,000 通、共有回線ごとに
  一日 50 件の新しい会話の開始まで。引き上げもできます。
  `help@photon.codes` にメールしてください。
- **定期実行や単発の送信には、ゲートウェイが動いている必要があります。**
  ゲートウェイの外から送る側（定期実行の仕事、`hermes send`、ダッシュボード）は、
  ゲートウェイが起こしたサイドカーを使い回します。そのポートとトークンは
  `<hermes-home>/runtime/photon-sidecar.json` から読み取ります。この
  ファイルはサイドカーが正常だと確かめられた時点で書かれ、止まると消えます。
  単発の送信が「ゲートウェイが止まっているようだ」と言ってきたら、まず
  ゲートウェイを起動（または再起動）してください。
- **共有回線と無料枠の回線からは、まだ知らない相手に話しかけられません。**
  これは Photon 側の決まりで、共有回線から番号にメッセージを送れるのは、
  その番号から先に連絡があったあとだけです。まったく新しい相手への定期実行や
  単発の送信は、Hermes を正しく設定していても Photon 側で断られます。相手から
  一度その回線に連絡してもらうか、専用回線に移ってください。

## 環境変数 {#env-vars}

| 変数                  | 初期値            | 補足                                      |
|---------------------------|--------------------|--------------------------------------------|
| `PHOTON_PROJECT_ID`       | `.env` から        | Spectrum のプロジェクト ID（SDK の `projectId`）。設定時に書き込まれます |
| `PHOTON_PROJECT_SECRET`   | `.env` から        | プロジェクトの秘密の値。設定時に書き込まれます |
| `PHOTON_SIDECAR_PORT`     | `8789`             | サイドカーの制御と受信に使うループバックのポート |
| `PHOTON_SIDECAR_AUTOSTART`| `true`             | アダプターがサイドカーを起こすかどうか     |
| `PHOTON_NODE_BIN`         | `which node`       | Node の実行ファイルの場所を上書きします    |
| `PHOTON_HOME_CHANNEL`     | （未設定）            | 定期実行や通知の届け先になる space の ID  |
| `PHOTON_HOME_CHANNEL_NAME`| （未設定）            | ホームチャンネルにつける、人が読むための名前 |
| `PHOTON_ALLOWED_USERS`    | （未設定）            | E.164 形式の番号をカンマ区切りで並べた許可の一覧 |
| `PHOTON_ALLOW_ALL_USERS`  | `false`            | 開発時のみ。どの相手からの連絡も受け付けます |
| `PHOTON_REQUIRE_MENTION`  | `false`            | グループでは呼びかけ語があるときだけ返事をします |
| `PHOTON_MENTION_PATTERNS` | Hermes の呼びかけ語  | グループでの呼びかけ判定に使う正規表現。JSON の配列、カンマ区切り、改行区切りで指定 |
| `PHOTON_DASHBOARD_HOST`   | `app.photon.codes` | ダッシュボードと端末ログインの接続先を上書きします |
| `PHOTON_SPECTRUM_HOST`    | `spectrum.photon.codes` | Spectrum の API の接続先を上書きします |

[photon]: https://photon.codes/
[app]: https://app.photon.codes/
