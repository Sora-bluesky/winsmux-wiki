---
title: "SimpleX Chat"
description: ""
upstream_path: user-guide/messaging/simplex.md
upstream_blob: cffff51fe0ad10a22492cef4288b599f02bd14b5
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/simplex
---

# SimpleX Chat {#simplex-chat}

[SimpleX Chat](https://simplex.chat/) は、連絡先もグループも自分の手元に置いておける、プライバシー重視の分散型のメッセージングです。ほかの経路と違い、SimpleX には持ち主を示す固定の ID がありません。連絡先はつながった時点で作られる、中身のわからない内部の ID で区別されます。いま使えるメッセンジャーの中でも、とりわけプライバシーに寄ったつくりです。

> `hermes gateway setup` を動かして **SimpleX** を選ぶと、手順に沿って設定できます。

## 事前に必要なもの {#prerequisites}

- **simplex-chat** の CLI を入れて、常駐させておくこと
- Python のパッケージ **websockets**（`pip install websockets`）

## simplex-chat を入れる {#install-simplex-chat}

[simplex-chat の GitHub リリース](https://github.com/simplex-chat/simplex-chat/releases) のページから、最新版をダウンロードします。

```bash
# Linux / macOS binary
curl -L https://github.com/simplex-chat/simplex-chat/releases/latest/download/simplex-chat-ubuntu-22_04-x86_64 -o simplex-chat
chmod +x simplex-chat
```

SimpleX Chat のプロジェクトは、チャットのクライアント用に組み立て済みの Docker のイメージを配っていません。Docker で動かしたい場合は、[simplex-chat のリポジトリ](https://github.com/simplex-chat/simplex-chat) からソースを取ってきて自分でビルドしてください。

## 常駐させる {#start-the-daemon}

```bash
simplex-chat -p 5225
```

初期状態では、`ws://127.0.0.1:5225` の WebSocket で待ち受けます。

## Hermes を設定する {#configure-hermes}

### セットアップウィザードから {#via-setup-wizard}

```bash
hermes gateway setup
```

**SimpleX Chat** を選び、表示に従って進めます。

### 環境変数から {#via-environment-variables}

`~/.hermes/.env` に次を書き足します。

```
SIMPLEX_WS_URL=ws://127.0.0.1:5225
SIMPLEX_ALLOWED_USERS=<contact-id-1>,<contact-id-2>
SIMPLEX_HOME_CHANNEL=<contact-id>
```

| 変数 | 必須 | 説明 |
|---|---|---|
| `SIMPLEX_WS_URL` | はい | simplex-chat の常駐プロセスの WebSocket の URL |
| `SIMPLEX_ALLOWED_USERS` | 入れておくのがおすすめ | 許可する相手をカンマ区切りで指定します。一つずつ、数字の `contactId` でも表示名でも書けます。 |
| `SIMPLEX_ALLOW_ALL_USERS` | 任意 | `true` にすると、すべての連絡先を許可します（扱いに注意してください） |
| `SIMPLEX_AUTO_ACCEPT` | 任意 | 届いた連絡先の申請を自動で受け入れます（初期値: `true`） |
| `SIMPLEX_GROUP_ALLOWED` | 任意 | ボットが参加するグループの ID をカンマ区切りで指定します。どのグループでもよければ `*` にします。書かない場合、グループのメッセージはすべて無視します |
| `SIMPLEX_HOME_CHANNEL` | 任意 | 定期実行の仕事の届け先になる、連絡先またはグループの ID |
| `SIMPLEX_HOME_CHANNEL_NAME` | 任意 | ホームチャンネルにつける、人が読むための名前 |
| `HERMES_SIMPLEX_TEXT_BATCH_DELAY` | 任意 | 続けざまに届いた文字のメッセージを一つのできごとにまとめるための、静かになるまで待つ秒数（初期値: `0.8`） |

## 連絡先の ID や表示名を調べる {#find-your-contact-id-or-display-name}

常駐させたあと、エージェントの連絡先との会話を開きます。数字の `contactId` は、セッションの記録に出てきます。SimpleX の画面に出ている表示名のほうが使いやすければ、それでもかまいません。`SIMPLEX_ALLOWED_USERS` はどちらの書き方も受け付けます。

## 誰が使えるか {#authorization}

初期状態では **すべての連絡先が拒否** されます。次のどちらかを行ってください。

1. `SIMPLEX_ALLOWED_USERS` に、`contactId` や表示名をカンマ区切りで並べます（たとえば `SIMPLEX_ALLOWED_USERS=4,alice` なら、contactId が 4 の相手か、表示名が「alice」の相手のどちらにも当てはまります）。
2. **個別チャットでのペアリング** を使います。ボットに何かメッセージを送るとペアリングコードが返ってくるので、そのコードを `hermes pairing approve simplex <CODE>` で入力します。

## グループでのやり取り {#group-chats}

初期状態では、アダプターはグループのメッセージを無視します。そうしないと、グループに
入れたボットが全員のやり取りを処理してしまうからです。使いたいときは、はっきり指定します。

```
SIMPLEX_GROUP_ALLOWED=12,34          # specific group IDs
# or
SIMPLEX_GROUP_ALLOWED=*              # any group the bot is in
```

グループを宛先にするときは、チャットの ID の前に `group:` を付けます。たとえば
定期実行の `deliver=` の宛先や `hermes send` の呼び出しでは `simplex:group:12` と書きます。

## `hermes send` で送る {#sending-with-hermes-send}

SimpleX は単体の送信先としても使えます。常駐プロセスは動いている必要がありますが、
文字だけを送るならゲートウェイが動いていなくてもかまいません。

```bash
hermes send --to simplex:alice "hello"          # DM by contact display name
hermes send --to simplex:group:12 "hello"       # group by numeric ID
hermes send --to simplex "hello"                # SIMPLEX_HOME_CHANNEL
```

ゲートウェイが動いているあいだ、アダプターは連絡先と許可したグループを数え上げて
届け先の一覧に載せるので（5 分ごとに更新されます）、`hermes send --list` に名前が
出てきます。ゲートウェイを一度も動かしていないうちは、この経路は `--list` に
「no channels discovered yet」という案内つきで出ます。上のような直接の宛先は、
それとは関係なく使えます。

## 添付ファイル {#attachments}

アダプターは、SimpleX そのものの添付を送受信のどちらにも対応しています。

- **受信** — 届いた画像、音声メモ、ファイルは、常駐プロセスの XFTP の流れ
  （`rcvFileDescrReady` → `/freceive` → `rcvFileComplete` を待つ）で受け取り、
  ふさわしい `MessageType`（`PHOTO`、`VOICE`、`TEXT` と書類）を付けて
  `MessageEvent.media_urls` として渡されます。
- **送信** — `send_image_file`、`send_voice`、`send_document`、`send_video` は
  いずれも `filePath` を含む `/_send` の形を使います。そのため、受け取った側の
  SimpleX のクライアントでは、画像がその場に表示され、音声メモもその場で再生でき、
  ダウンロードを促されることはありません。

エージェントの返事には、文章の中に `MEDIA:/path/to/file` という印を書くこともできます。
アダプターはその印を本文から取り除き、ファイルを音声メモ（音声の拡張子の場合）か
書類として送ります。

## SimpleX を定期実行の仕事で使う {#using-simplex-with-cron-jobs}

```python
cronjob(
    action="create",
    schedule="every 1h",
    deliver="simplex",          # uses SIMPLEX_HOME_CHANNEL
    prompt="Check for alerts and summarise."
)
```

定期実行の仕事の `deliver:` で相手を名指しすることもできますし、シェルのスクリプトから [`hermes send` の CLI](/hermes/docs/guides/pipe-script-output/) を使うこともできます。

```bash
hermes send simplex:<contact-id> "Done!"
```

## プライバシーについて {#privacy-notes}

- SimpleX は電話番号もメールアドレスも明かしません。連絡先は中身のわからない ID で扱われます
- Hermes と常駐プロセスのあいだは手元の WebSocket（`ws://127.0.0.1:5225`）でつながっており、データが端末の外へ出ることはありません
- メッセージは常駐プロセスに届く前に、SimpleX のプロトコルによって端末どうしのあいだだけで暗号化されています

## 困ったときは {#troubleshooting}

**「Cannot reach daemon」と出る** — `simplex-chat -p 5225` が動いていることと、ポートが `SIMPLEX_WS_URL` と合っていることを確かめます。

**「websockets not installed」と出る** — `pip install websockets` を動かします。

**メッセージが届かない** — その相手の ID が `SIMPLEX_ALLOWED_USERS` に入っているかを確かめるか、個別チャットでのペアリングで承認します。
