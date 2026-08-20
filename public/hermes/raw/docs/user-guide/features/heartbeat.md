---
title: "セッションの鼓動"
description: "今のセッションが手空きになるたび、そこへ戻ってくる繰り返しのプロンプト — /heartbeat every 10m Check the deployment"
upstream_path: user-guide/features/heartbeat.md
upstream_blob: 69984a3d7fae5eeda2ff647efbb4435cd38bf03b
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/heartbeat
---

# セッションの鼓動（`/heartbeat`） {#session-heartbeats-heartbeat}

`/heartbeat` は、**今のセッション**に繰り返しの指示を1つ持たせます。セッションが手空きで、決めた間隔が過ぎていれば、そのプロンプトが普通の利用者のターンとして流れます。同じ会話、同じ文脈、同じプロンプトのキャッシュのままです。

```
/heartbeat every 10m Check the deployment and report meaningful changes
```

Prime-Agent の `/heartbeat` から着想を得ています。Hermes 版は、メッセージの流れについての厳しい決まりを守ります。鼓動が差し込まれるのはターンとターンの間だけで（動作の途中には入りません）、ただの利用者役のメッセージとして入ります。

## 鼓動と cron、どちらを使うか {#heartbeat-vs-cron-which-one-do-i-want}

見た目は似ていますが、務めが違います。

| | `/heartbeat` | [`hermes cron`](/hermes/docs/user-guide/features/cron/) |
|---|---|---|
| 動く場所 | **この会話の中** — 文脈がそろっていて、これまでの話も覚えています | 1回ごとに新しく切り離されたセッション |
| 処理を再起動しても残るか | 状態は残ります（SessionDB）。次にそのセッションが動かされたときから再び流れます | はい。完全に永続する予定表です |
| いくつ持てるか | セッションにつき1つ | いくつでも |
| 向いていること | 「作業しながら*このやり取りの中で* X を見ていて」 | 常設の仕事、定期の報告、見張り、定期の配信 |

目安はこうです。繰り返したいプロンプトが会話の文脈を必要とするなら `/heartbeat`。それ自体で完結する仕事なら cron を使います。

## コマンド {#commands}

| コマンド | 働き |
|---|---|
| `/heartbeat every <interval> <prompt>` | セッションの鼓動を設定します（すでにあれば置き換えます）。間隔は `90s`、`10m`、`2h`、`1d` のように書きます（最短60秒）。 |
| `/heartbeat` または `/heartbeat status` | 鼓動の内容・間隔・次に流れるまでの時間を表示します。 |
| `/heartbeat pause` | 消さずに、流れるのだけ止めます。 |
| `/heartbeat resume` | 再開します（時計を取り直すので、いきなり古い分が流れることはありません）。 |
| `/heartbeat clear` | 鼓動を取り除きます。 |

`/hb` は同じものの短い呼び方です。CLI でも各窓口でも動きます（Slack では `/hermes heartbeat …` を使います）。

## 動きの細部 {#behavior-details}

- **手空きのときだけ。** 鼓動が動作中のターンを中断することはありません。時間が来たときにエージェントが働いていれば、次に手空きを確かめたときに流れます。
- **逃した分はまとめられます。** セッションが忙しかった（あるいは処理が動いていなかった）せいで何回分か過ぎてしまっても、たまった分ではなく**1回**の鼓動のターンになります。時計は流れるたびに取り直されます。
- **利用者のメッセージが勝ちます。** 待ち行列にあるあなたのメッセージが常に優先され、鼓動は入力の待ち行列が空くのを待ちます。
- **キャッシュに優しい。** 差し込まれるプロンプトはただの利用者のメッセージです。システムプロンプトを書き換えることも、道具立てを入れ替えることもありません。
- **保存のされ方。** 状態は `SessionDB.state_meta` に `heartbeat:<session_id>` の鍵で入っていて、`/resume` をまたいでも、文脈の圧縮でセッションが入れ替わっても生き続けます。流れるには持ち主の処理（CLI のセッションか窓口）が動いている必要があります。何があっても続いてほしい予定には cron を使ってください。
- **余計な仕事を作らせない歯止め。** 差し込まれるプロンプトは、意味のある変化がなければ短く答えて止まるようエージェントに伝えるので、静かなときの鼓動が無駄な作業を生むことはありません。

## 例 {#example}

```
You: /heartbeat every 15m Check whether the CI run for PR #1234 finished; summarize the result when it does

  ♥ Heartbeat set (every 15m): Check whether the CI run for PR #1234 finished; ...

[15 minutes of you working on other things in the same session]

Hermes: [Heartbeat — recurring instruction, fires every 15m]
  💻 gh pr checks 1234   (1.2s)
  CI is still running (14/37 checks complete). Nothing to report yet.
```

答えが変わらなくなったら `/heartbeat clear` で片づけてください。そのまま見張らせておいても構いません。
