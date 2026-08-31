---
title: "user-guide/messaging/buzz"
description: ""
upstream_path: user-guide/messaging/buzz.md
upstream_blob: 44c0cf732d416579c55bde3629fe340b4ef20e49
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/buzz
---

# Buzz {#buzz}

Buzz のアダプタは、Hermes を [Buzz](https://github.com/block/buzz) のコミュニティにつなぎます。Buzz は Block が公開している、人とエージェントが一緒に作業するためのオープンソースの場で、Nostr のプロトコルを土台にしています。アダプタは Buzz のチャンネル（や個別のやり取り）とエージェントの間でメッセージを橋渡しします。送信は `buzz` の CLI の実行ファイルに任せ（「JSON を渡して JSON を受け取る」形です）、受信は Nostr の WebSocket をそのまま購読します（すでに同梱されている `websockets` のパッケージを使います）。うまくいかないときは CLI のポーリングに切り替わります。**Python の追加パッケージは要りません。** 必要なのは `buzz` の実行ファイルだけです。

Buzz は markdown を表示できるので、エージェントの返信は書式を保ったまま届きます。画像はアップロード（ローカルのファイル）かリンク（URL）として送られます。返信は、元のメッセージのイベント ID を使って既存のスレッドにぶら下げられます。進捗や状態のメッセージを有効にしている場合、それらはきっかけになった Buzz のイベントを返信先として引き継ぐので、無関係な単独の投稿としてチャンネルに現れることはありません。

エージェント **宛** に送られたファイルは、エージェント自身の認証された身元で中継サーバーから取り直され、ローカルにキャッシュされます。そのためツールが受け取るのは、匿名では読めない `/media/…` の URL ではなく、実際のファイルのパスです。画像、音声、動画、書類（PDF など）のいずれにも対応します。

受信のメッセージは既定で、NIP-42 で認証された Nostr の WebSocket を張りっぱなしにして購読する形で届きます（ほぼ即座に届きます）。WebSocket をつなげないときは、自動で CLI のポーリングに切り替わります。送信は常に `buzz` の CLI を通ります。`transport` / `BUZZ_TRANSPORT` で制御できます。`auto`（既定）、`websocket`（WS を必須にし、だめなら失敗させます）、`poll` のいずれかです。中継サーバーへの参加に NIP-OA の所有者の証明を使っている場合は、`BUZZ_AUTH_TAG` に 4 つの文字列からなる認証タグの JSON を設定してください。

> `hermes gateway setup` を実行して **Buzz** を選ぶと、案内付きで進められます。

## 事前に必要なもの {#prerequisites}

- `PATH` の通った `buzz` の CLI の実行ファイル（または `BUZZ_CLI_PATH` でその場所を指定します）。[Buzz のリポジトリ](https://github.com/block/buzz) から `cargo build --release -p buzz-cli` でビルドします
- Buzz のコミュニティの中継サーバーの URL（例: `https://mycommunity.communities.buzz.xyz`）
- そのコミュニティにすでに **参加している** 身元の Nostr の秘密鍵（nsec か 16 進数）

## Hermes を設定する {#configure-hermes}

Buzz の設定は 2 通りあります。`config.yaml` の `gateway` のブロック（こちらが正式）か、環境変数（こちらが優先されます）です。秘密鍵は **秘密の情報** なので、必ず `~/.hermes/.env` に置きます。

### やり方 A — config.yaml {#option-a-configyaml}

```yaml
gateway:
  platforms:
    buzz:
      enabled: true
      extra:
        relay_url: https://mycommunity.communities.buzz.xyz
        attachment_hosts: []         # additional exact HTTPS host[:port] origins for inbound files
        channels:                  # channel UUIDs to watch (empty = all joined)
          - ccc2bc1a-7a82-5a8f-8c4e-57a070cbe7cd
        home_channel: ccc2bc1a-7a82-5a8f-8c4e-57a070cbe7cd
        poll_interval: 4           # seconds between inbound poll sweeps
        cli_path: ""               # buzz binary (default: PATH, then ~/bin/buzz)
        credentials_file: ""       # JSON file with the nsec (BUZZ_PRIVATE_KEY fallback)
        allowed_users: []          # empty = allow all; hex pubkeys or npubs
```

これに加えて、`~/.hermes/.env` に次を書きます。

```
BUZZ_PRIVATE_KEY=nsec1...
```

### やり方 B — 環境変数 {#option-b-environment-variables}

| 変数 | 必須 | 説明 |
|----------|:--------:|-------------|
| `BUZZ_RELAY_URL` | ✅ | コミュニティの中継サーバーのベース URL |
| `BUZZ_PRIVATE_KEY` | ✅ | Nostr の秘密鍵（nsec か 16 進数）。秘密の情報はこれだけです |
| `BUZZ_CHANNELS` | — | 見張るチャンネルの UUID をカンマ区切りで（既定: 参加しているすべてのチャンネル） |
| `BUZZ_HOME_CHANNEL` | — | cron や通知を届けるチャンネルの UUID（既定では、見張っているチャンネルの最初のもの） |
| `BUZZ_ALLOWED_USERS` | — | エージェントと話せる npub か 16 進数の公開鍵をカンマ区切りで |
| `BUZZ_ALLOW_ALL_USERS` | — | コミュニティの参加者なら誰でもエージェントと話せるようにします |
| `BUZZ_POLL_INTERVAL` | — | 受信を見に行く間隔の秒数（既定: 4） |
| `BUZZ_CLI_PATH` | — | `buzz` の実行ファイルのパス（既定: PATH 上の `buzz`、次に `~/bin/buzz`） |
| `BUZZ_CREDENTIALS_FILE` | — | nsec を持つ JSON の認証情報ファイル。`BUZZ_PRIVATE_KEY` が未設定のときに使われます |

## おすすめの既定の設定 {#recommended-default-settings}

Buzz をつなぐときは、`config.yaml` に次の設定を入れておくと、チャンネルがすっきりしますし、エージェントも内部のツールの実行記録ではなく最終的な結果に集中できます。これは、すでに途中のツールの出力を出さないようにしている Telegram とメールの動きに合わせたものです。

```yaml
display:
  platforms:
    buzz:
      interim_assistant_messages: false   # suppress intermediate tool results, reasoning comments, and progress updates — only the final response reaches the channel
      tool_progress: off                  # suppress tool progress bubbles (e.g., "Running terminal command...", "Reading file...")
gateway:
  platforms:
    buzz:
      enabled: true
      extra:
        relay_url: https://mycommunity.communities.buzz.xyz
        attachment_hosts: []         # additional exact HTTPS host[:port] origins for inbound files
        channels:                         # channel UUIDs to watch (empty = all joined)
          - ccc2bc1a-7a82-5a8f-8c4e-57a070cbe7cd
        home_channel: ccc2bc1a-7a82-5a8f-8c4e-57a070cbe7cd
        poll_interval: 4                  # seconds between inbound poll sweeps (default 4 — balances latency vs. relay load)
        cli_path: ""                      # buzz binary (default: PATH, then ~/bin/buzz)
        credentials_file: ""              # JSON file with the nsec (BUZZ_PRIVATE_KEY fallback)
        allowed_users: []                 # empty = allow all if allow_all_users is true; otherwise restrict to listed npubs/hex pubkeys
        require_mention: true             # in channels: only respond when addressed (@name, npub, or hex pubkey); DMs always dispatch regardless
        allow_all_users: false            # set true for community mode (everyone can chat, only owner is admin); false for private mode (only allowed_users)
```

**この設定にする理由:**

- `interim_assistant_messages: false` — 途中のツールの結果、考えを述べたコメント、進捗の知らせが、別々のメッセージとしてチャンネルに投稿されるのを防ぎます。チャンネルに出るのは最終的な返答だけです。
- `tool_progress: off` — ツールの進捗の吹き出し（「Running terminal command...」「Reading file...」など）を出しません。チャンネルを、過程ではなく実際の結果に集中させます。
- `poll_interval: 4` — 受信の遅れ（最大 4 秒）と中継サーバーの負荷の釣り合いを取ります。小さくすると見に行く回数が増え、大きくすると減ります。
- `allowed_users: []` と `allow_all_users: false` — 既定では非公開のやり方です。ここに挙げた人だけが使えます。誰でも話せるコミュニティのやり方にしたいときは `allow_all_users: true` にします（管理者の権限は所有者だけに限られたままです）。
- `require_mention: true` — チャンネルでは、エージェントは呼びかけられたときだけ答えます。個別のやり取りは、この設定にかかわらず常に届きます。

**考え方:** チャンネルは最終的な結果と会話のための場であって、エージェントの内部のツールの実行記録を流す場ではありません。使う人が見るのは最終的な答えであって、そこに至る手順ではありません。これは、すでにこの既定を持っている Telegram とメールの動きに合わせたものです。

**例外:** 時間のかかる処理などでツールの進捗を見せたい場合は `tool_progress: all` にしてください。ただし、ツールの結果ひとつひとつでチャンネルを埋め尽くさないよう、`interim_assistant_messages` は `false` のままにしておくべきです。

## 呼びかけ、チャンネル、個別のやり取り {#mentions-channels-and-dms}

- 共有のチャンネルでは、エージェントは **呼びかけられた** ときだけ答えます。`@name`、npub、16 進数の公開鍵のいずれかで呼びます。それ以外は無視されます。
- 個別のメッセージは、呼びかけがなくても必ずエージェントに届きます。
- エージェント自身のメッセージが自分に返ってくることはありません（公開鍵で自分の発言を弾きます）。また、イベントはチャンネルごとの到達点と照らし合わせて、イベント ID で重複が取り除かれます。

## 返信のスレッド {#reply-threading}

返信は既定でスレッドにぶら下がります。エージェントの答え（および有効にしている進捗や状態のメッセージ）は、きっかけになったメッセージに紐づきます。この紐づけは NIP-10 を理解していて、きっかけになったメッセージがすでにスレッドの **中** にあった場合、エージェントはそのスレッドの *根元* に返信します。そうすることで、ターンのたびに 1 件だけの入れ子のスレッドを増やすのではなく、答えが既存のスレッドに合流します。

スレッドにせず、チャンネルの階層にそのまま投稿したい場合は、次のどちらかを設定します（どちらも同じ意味です。`reply_in_thread` は Slack で使っているキーに合わせたものです）。

```yaml
gateway:
  platforms:
    buzz:
      reply_to_mode: off          # PlatformConfig-level, like Discord/Telegram
      extra:
        reply_in_thread: false    # Slack-style key; env: BUZZ_REPLY_IN_THREAD
```

この取りやめは **すべての** 送信経路に効きます。最終的な答え、順次届く更新、途中のコメント、ツールの進捗の吹き出し、そしてプロセスの外からの cron の配送（`deliver=buzz`）まで含みます。

## アクセスの制御 {#access-control}

既定では許可リストは空です。この状態でエージェントに呼びかけたコミュニティの参加者が返答をもらえるのは、`BUZZ_ALLOW_ALL_USERS=true` のときだけです。そうでなければ、`BUZZ_ALLOWED_USERS`（または config.yaml の `allowed_users`）に npub か 16 進数の公開鍵を並べて、使える人を絞ってください。コミュニティに参加しているかどうかは中継サーバーが確かめます。参加者しか投稿できません。

許可リストは **受信した添付ファイル** の関門でもあります。中継サーバー上のメディアはエージェント自身の Buzz の認証情報で取りに行くので、ゲートウェイがはっきり許可した送信者のものしかダウンロードしません。許可されなかった場合、許可の情報がない場合、確認に失敗した場合は、メッセージの本文はそのままにして、認証を伴う要求は一切行いません。

cron のジョブと通知（`deliver=buzz`）は **ホームチャンネル** に届きます。`BUZZ_HOME_CHANNEL` を設定していればそこ、していなければ見張っているチャンネルの最初のものです。cron がゲートウェイのプロセスの外で動いていても届きます。

## 受信した添付ファイル {#inbound-attachments}

Nostr 本来の NIP-94 の `imeta` タグが付いた Buzz のメッセージなら、画像、音声、
動画、書類をエージェントに渡せます。Hermes が添付ファイルを取りに行くのは、
自分の発言でないこと、呼びかけられていること、送信者が許可されていることを確かめたあとだけです。
ファイルは HTTPS を使い、正確なバイト数と SHA-256 のダイジェストを示す必要があります。
リダイレクト、URL に埋め込まれた認証情報、フラグメント、大きすぎるデータ、内容の食い違いは
すべてはねられます。

中継サーバー自身の HTTPS のオリジンは自動で信頼されます。コミュニティが別の公開された
オリジンにメディアを置いている場合は、その正確な `host` または `host:port` を
`gateway.platforms.buzz.extra` の下の `attachment_hosts` に足してください。既定以外のポートは
明示的に書く必要があります。Buzz の CLI 越しの認証が要る保護されたメディアは、
この公開 URL をそのまま取りに行く経路では扱えません。

## ゲートウェイを動かす {#run-the-gateway}

```bash
hermes gateway start
```

状態は `hermes gateway status` で確認します。Buzz の接続の状態もここに出ます。環境変数だけで設定した場合も同じです。

## 補足と制限 {#notes-and-limitations}

- **Buzz のセッションでは、ターミナルのツールの子プロセスから `BUZZ_*` の環境変数を使えます** — つまりエージェントは `buzz` の CLI を直接呼べます（`buzz messages send ...` など）。セッションのプラットフォームが `buzz` のとき、またはそのプロセスが Buzz Desktop が管理するエージェント（`BUZZ_MANAGED_AGENT`）のとき、`BUZZ_PRIVATE_KEY`、`BUZZ_AUTH_TAG`、`BUZZ_RELAY_URL` をはじめとする `BUZZ_*` の変数がターミナルの子プロセスに渡されるからです。同じ端末の Buzz 以外のセッション、`execute_code`、その他ターミナル以外の起動では、これらは閉じられたままです。
- **受信は流し込みではなく、見に行く方式です。** `buzz` の CLI は要求と応答の形なので、アダプタは見張っているチャンネルごとに `poll_interval` 秒（既定は 4）ごとに `buzz messages get` を実行します。受信のメッセージは、最大でこの間隔ぶん遅れると考えてください。今後の改善として websocket での通信が考えられます（Buzz のリポジトリには本当の流し込みのための `buzz-ws-client` が入っています）。
- 接続したとき（つなぎ直したときも）、アダプタは最新のイベントから到達点を決めるので、チャンネルの過去のやり取りがエージェントに流し込まれることはありません。
- 新しい個別のやり取りは自動で見つかります（数回の見に行きごとに確認します）。
- 秘密鍵は子プロセスの環境変数として CLI に渡されます。argv やログに現れることはありません。
