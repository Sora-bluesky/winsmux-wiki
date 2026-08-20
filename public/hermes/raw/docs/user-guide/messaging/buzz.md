---
title: "user-guide/messaging/buzz"
description: ""
upstream_path: user-guide/messaging/buzz.md
upstream_blob: 848e21c0532e61b2b0ae68db25e06b25bbbc8452
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/buzz
---

# Buzz {#buzz}

Buzz のアダプターは、Hermes を [Buzz](https://github.com/block/buzz) のコミュニティにつなぎます。Buzz は Block が公開している、人とエージェントが一緒に働くための場で、Nostr というプロトコルの上に作られています。アダプターは Buzz のチャンネル（または個別のやり取り）とエージェントのあいだで、メッセージを行き来させます。送信側は `buzz` という CLI の実行ファイルを呼び出し、JSON を渡して JSON を受け取ります。受信側は Nostr の WebSocket をそのまま使って購読し（すでに同梱されている `websockets` パッケージを利用します）、うまくいかないときは CLI での定期取得に切り替えます。**Python のパッケージを追加で入れる必要はありません** — 必要なのは `buzz` の実行ファイルだけです。

Buzz は Markdown を表示できるので、エージェントの返事は書式を保ったまま届きます。画像は、手元のファイルならアップロードとして、URL ならリンクとして送られます。返事は、元のメッセージのイベント ID を使って、そのスレッドにぶら下げることもできます。

受信は初期状態では、NIP-42 で認証した Nostr の WebSocket をつなぎっぱなしにして購読します（ほぼその場で届きます）。WebSocket をつなげないときは、自動で CLI での定期取得に切り替わります。送信はつねに `buzz` の CLI を通します。この切り替えは `transport` / `BUZZ_TRANSPORT` で決められます。`auto`（初期値）、`websocket`（WebSocket を必須にし、だめなら失敗させる）、`poll` のいずれかです。リレーへの参加が NIP-OA の所有者証明を使う形なら、`BUZZ_AUTH_TAG` に四つの文字列からなる認証タグの JSON を設定してください。

> `hermes gateway setup` を動かして **Buzz** を選ぶと、手順に沿って設定できます。

## 事前に必要なもの {#prerequisites}

- `buzz` の CLI 実行ファイルが `PATH` の通った場所にあること（または `BUZZ_CLI_PATH` でその場所を指すこと） — [Buzz のリポジトリ](https://github.com/block/buzz) から `cargo build --release -p buzz-cli` でビルドできます
- Buzz のコミュニティのリレー URL（例: `https://mycommunity.communities.buzz.xyz`）
- そのコミュニティの **メンバー** になっている Nostr の秘密鍵（nsec または hex 形式）

## Hermes を設定する {#configure-hermes}

Buzz の設定は二通りあります。`config.yaml` の `gateway` ブロックに書く方法（こちらが正）と、環境変数を使う方法（こちらが優先されます）です。秘密鍵は **秘密の情報** なので、いつでも `~/.hermes/.env` に置きます。

### 方法 A — config.yaml {#option-a-configyaml}

```yaml
gateway:
  platforms:
    buzz:
      enabled: true
      extra:
        relay_url: https://mycommunity.communities.buzz.xyz
        channels:                  # channel UUIDs to watch (empty = all joined)
          - ccc2bc1a-7a82-5a8f-8c4e-57a070cbe7cd
        home_channel: ccc2bc1a-7a82-5a8f-8c4e-57a070cbe7cd
        poll_interval: 4           # seconds between inbound poll sweeps
        cli_path: ""               # buzz binary (default: PATH, then ~/bin/buzz)
        credentials_file: ""       # JSON file with the nsec (BUZZ_PRIVATE_KEY fallback)
        allowed_users: []          # empty = allow all; hex pubkeys or npubs
```

あわせて、`~/.hermes/.env` に次を書きます。

```
BUZZ_PRIVATE_KEY=nsec1...
```

### 方法 B — 環境変数 {#option-b-environment-variables}

| 変数 | 必須 | 説明 |
|----------|:--------:|-------------|
| `BUZZ_RELAY_URL` | ✅ | コミュニティのリレーの基点となる URL |
| `BUZZ_PRIVATE_KEY` | ✅ | Nostr の秘密鍵（nsec または hex 形式）。秘密の情報はこれだけです |
| `BUZZ_CHANNELS` | — | 見張るチャンネルの UUID をカンマ区切りで指定（初期値: 参加しているすべてのチャンネル） |
| `BUZZ_HOME_CHANNEL` | — | 定期実行や通知の届け先になるチャンネルの UUID（指定しない場合は、見張っている最初のチャンネル） |
| `BUZZ_ALLOWED_USERS` | — | エージェントに話しかけられる相手の npub または hex 形式の公開鍵をカンマ区切りで指定 |
| `BUZZ_ALLOW_ALL_USERS` | — | コミュニティのメンバーなら誰でもエージェントに話しかけられるようにする |
| `BUZZ_POLL_INTERVAL` | — | 受信を取りにいく間隔の秒数（初期値: 4） |
| `BUZZ_CLI_PATH` | — | `buzz` 実行ファイルの場所（初期値: PATH の通った `buzz`、次に `~/bin/buzz`） |
| `BUZZ_CREDENTIALS_FILE` | — | nsec を収めた JSON の資格情報ファイル。`BUZZ_PRIVATE_KEY` を設定していないときに使われます |

## おすすめの初期設定 {#recommended-default-settings}

Buzz をつなぐときは、`config.yaml` に次の値を入れておくと、チャンネルが散らからず、エージェントも途中の道具の実行記録ではなく最終的な結果に集中できます。これは Telegram とメールでの動きに合わせたもので、そちらでは途中の出力がすでに抑えられています。

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

**この値をすすめる理由:**

- `interim_assistant_messages: false` — 途中の道具の結果、考えを述べたコメント、進み具合の知らせが、別々のメッセージとしてチャンネルに流れるのを防ぎます。チャンネルに届くのは最後の返事だけです。
- `tool_progress: off` — 道具の進み具合の吹き出し（「Running terminal command...」「Reading file...」など）を出さないようにします。チャンネルには、途中の様子ではなく実際の結果だけが残ります。
- `poll_interval: 4` — 受信までの待ち時間（最大 4 秒の遅れ）とリレーへの負荷の釣り合いを取った値です。小さくすると取りにいく回数が増え、大きくすると減ります。
- `allowed_users: []` + `allow_all_users: false` — 初期状態では限られた人だけが使えます。書き並べた相手しかやり取りできません。誰でも話しかけられるコミュニティ向けの動きにしたいときは `allow_all_users: true` にします（管理者の権限は持ち主だけに残ります）。
- `require_mention: true` — チャンネルでは、呼びかけられたときだけエージェントが返事をします。個別のやり取りは、この設定にかかわらずいつでも届きます。

**考え方:** チャンネルは最終的な結果と会話のための場であって、エージェントが内部で道具を動かした記録を流す場ではありません。読む人が見たいのは答えであって、そこに至る手順ではありません。これは Telegram とメールでの動きに合わせたもので、そちらではすでにこの値が初期設定になっています。

**例外:** 道具の進み具合を見せたいとき（時間のかかる作業などです）は `tool_progress: all` にします。ただし `interim_assistant_messages` は `false` のままにしておくのが無難です。そうしないと、道具の結果が出るたびにチャンネルがあふれます。

## 呼びかけ、チャンネル、個別のやり取り {#mentions-channels-and-dms}

- 共有のチャンネルでは、エージェントは **呼びかけられたとき** だけ返事をします。`@name`、npub、hex 形式の公開鍵のどれかで名指しされた場合です。それ以外は無視します。
- 個別のやり取りは、呼びかけなしでもいつでもエージェントに届きます。
- エージェント自身のメッセージが本人に返ってくることはありません（公開鍵を見て自分の発言を除きます）。また、すべてのイベントはイベント ID をもとに、チャンネルごとの到達点と突き合わせて重複を取り除きます。

## 誰が使えるか {#access-control}

初期状態では許可の一覧が空です。この場合、エージェントに呼びかけたコミュニティのメンバー全員に返事が届くのは `BUZZ_ALLOW_ALL_USERS=true` のときだけです。そうでなければ、`BUZZ_ALLOWED_USERS`（または config.yaml の `allowed_users`）に npub か hex 形式の公開鍵を書き並べて、使える人を絞ります。コミュニティに入っているかどうかはリレー側が確かめており、メンバーでなければそもそも投稿できません。

定期実行の仕事と通知（`deliver=buzz`）は **ホームチャンネル** に届きます。`BUZZ_HOME_CHANNEL` を設定していればそこへ、していなければ見張っている最初のチャンネルへ送られます。定期実行がゲートウェイとは別のプロセスで動いている場合でも届きます。

## ゲートウェイを動かす {#run-the-gateway}

```bash
hermes gateway start
```

`hermes gateway status` で様子を確かめられます。Buzz の接続状態もそこに出ます。環境変数だけで設定した場合も同じです。

## 覚えておきたいことと、できないこと {#notes-and-limitations}

- **受信は取りにいく方式で、流し込みではありません。** `buzz` の CLI は一回ごとの要求と応答なので、アダプターは見張っているチャンネルごとに `poll_interval` 秒（初期値は 4）おきに `buzz messages get` を呼びます。受信は最大でその間隔ぶん遅れると考えてください。今後は WebSocket でのやり取りに改善する余地があります（Buzz のリポジトリには、本当の意味で流し込みができる `buzz-ws-client` が同梱されています）。
- つなぎ直したときは、いちばん新しいイベントから到達点を引き直すので、チャンネルの過去のやり取りがエージェントへ流し込まれることはありません。
- 新しい個別のやり取りは自動で見つかります（何回か取りにいくたびに確認します）。
- 秘密鍵は子プロセスの環境変数として CLI に渡されます。コマンドの引数やログに現れることはありません。
