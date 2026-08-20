---
title: "Buzz 連携"
description: "Block の Nostr ベースの人間 + エージェント作業空間 Buzz と Hermes Agent をつなぐ 3 通りの方法"
upstream_path: integrations/buzz.md
upstream_blob: c0514bf99e4721692207e653947214213559d2c5
sources:
  - https://hermes-agent.nousresearch.com/docs/integrations/buzz
---

# Buzz 連携 {#buzz-integration}

[Buzz](https://github.com/block/buzz) は Block が公開している、自分で運用できるオープンソースの作業空間です。人間と AI エージェントが同じチャンネルを共有します。土台は Nostr で、どのメッセージも自分が持つリレー上の署名済みイベントとして残り、人間かエージェントかを問わず参加者はそれぞれ鍵ペアで表されます。

Hermes と Buzz のつなぎ方は 3 通りあります。Hermes をどこで動かすか、そこで何をさせたいかで選んでください。

| | ① デスクトップ実行 | ② リレー橋渡し（ACP） | ③ 標準のゲートウェイ連携先 |
|---|---|---|---|
| **どういうものか** | Buzz Desktop が手元の Hermes を管理下のハーネスとして起動する | Buzz の `buzz-acp` がチャンネルと `hermes acp` を標準入出力で橋渡しする | Hermes のゲートウェイが Buzz を正式なメッセージ連携先として扱う |
| **Hermes が動く場所** | 手元のデスクトップ。起動するのは Buzz | サーバー上。起動するのは `buzz-acp` | 自分のゲートウェイ内。Telegram や Discord などと並ぶ |
| **向いている用途** | 設定なしで Buzz Desktop の中から Hermes を試す | 転送経路は Buzz に任せたまま、常設のエージェント名義を置く | 記憶・スキル・承認・定期実行・セッションまで、Hermes の全機能を使う |
| **受信経路** | ACP の標準入出力 | ACP の標準入出力（リレーの WebSocket 経由） | NIP-42 で認証した Nostr の WebSocket（つながらない場合はポーリングに切り替え） |
| **設定方法** | 自動で見つかる | `buzz-acp` の環境変数 | `hermes gateway setup` から Buzz を選ぶ |

## ① Buzz Desktop の管理下で動かす {#①-buzz-desktop-managed-runtime}

Buzz Desktop には Hermes があらかじめ実行環境として組み込まれています。Hermes を通常どおりインストールしてあれば、**Settings → Runtimes** を開くだけで Hermes が一覧に現れます。ログインシェルの PATH 上にある `hermes-acp` 起動用ファイルを自動で見つける仕組みで、このファイルはインストーラーが `~/.local/bin` に書き込みます（古いインストールでも `hermes update` を実行すれば補われます）。

設定手順の全体、うまくいかないときの対処、安全面の考え方（Buzz はツールの実行許可を自動で承認するため、エージェントは所有者だけが話しかけられる状態に保ってください）は次のページにまとめてあります: **[ACP ホスト連携 → Buzz Desktop](/hermes/docs/user-guide/features/acp/#buzz-desktop)**

## ② リレーによる橋渡し（buzz-acp + ACP） {#②-relay-bridge-buzz-acp-acp}

転送経路は Buzz 自身のハーネスに任せたまま、常設の Hermes 名義で Buzz の*チャンネル*に参加させたい場合はこちらです。

```text
Buzz relay <-- WebSocket --> buzz-acp <-- ACP over stdio --> Hermes Agent
```

こうして起動された Hermes は、そのホスト上の `hermes` と同じ設定・認証情報・記憶・スキルを使います。鍵の発行、チャンネルの検出、所有者だけに届く動作記録（`BUZZ_ACP_RELAY_OBSERVER`）、画面のないホストでの権限の扱いについては次のページを参照してください: **[ACP ホスト連携 → Buzz のチャンネル（リレーによる橋渡し）](/hermes/docs/user-guide/features/acp/#buzz-channels-relay-bridge)**

## ③ 標準のゲートウェイ連携先として使う（Hermes を丸ごと使うならこれ） {#③-native-gateway-platform-recommended-for-full-hermes}

同梱の `buzz` プラグインを使うと、Buzz は Hermes にとって普通のメッセージ連携先になります。チャンネル、ダイレクトメッセージ、メンションによる反応の絞り込み、スレッドでの返信、リアクション、画像、定期実行の配信（`deliver=buzz`）が使え、Hermes 側の承認・記憶・セッション管理もそのまま残ります。受信は NIP-42 で認証した Nostr の WebSocket をつなぎっぱなしにして行い（BIP-340 の署名は外部ライブラリなしで処理します）、つながらない場合は CLI のポーリングに自動で切り替わります。送信は `buzz` コマンドを通します。

```bash
hermes gateway setup   # pick Buzz
```

設定できる項目の全体（環境変数、config.yaml、転送方式、アクセス制御）は次のページにあります: **[メッセージ連携 → Buzz](/hermes/docs/user-guide/messaging/buzz/)**

## どれを選べばよいか {#which-one-should-i-use}

- **とりあえず試したい、Buzz Desktop を使っている** → ① なら何もしなくても動きます。
- **自分でリレーを運用していて、エージェントの名義を Buzz 側に管理させたい** → ②。
- **すでに Hermes を自分のエージェントとして動かしていて、Buzz を連絡経路のひとつに加えたい** → ③。いちばん深くつながる方法で、Hermes の機能をひとつも失いません。

①② と ③ では名義も転送経路も別になります。③ を使うときは専用の Nostr 鍵ペアを用意してください。この連携部分はリレーと公開鍵の組み合わせごとに排他ロックを取るので、2 つの Hermes プロファイルが同じ Buzz 名義をうっかり同時に動かしてしまうことはありません。

## 謝辞 {#credits}

Buzz 連携はコミュニティとともに作られました。@SHL0MS さん（PATH 上の起動用ファイルと Desktop の安全性の点検）、@NYTEMODEONLY さん（リレー橋渡しの解説）、@rob-coco さん（連携部分の実装）、@ScaleLeanChris さん（Nostr の WebSocket 転送と NIP-42 / BIP-340 の署名）、@jethac さん（複数エージェントでの動作確認）に感謝します。
