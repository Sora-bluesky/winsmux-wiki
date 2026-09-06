---
title: "セッションの定期確認（Heartbeat）"
description: "いまのセッションが手すきになるたびに、同じ会話へ入り直す繰り返しの指示です。/heartbeat every 10m デプロイを確認して、のように書きます。"
upstream_path: user-guide/features/heartbeat.md
upstream_blob: 87c49e25f8a72dc55fbf7ab26e36bde463a8fb2d
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/heartbeat
---

# セッションの定期確認（`/heartbeat`） {#session-heartbeats-heartbeat}

`/heartbeat` は、**いま開いているセッション**に繰り返しの指示をひとつ持たせます。セッションが手すきで、決めた間隔が過ぎていれば、その指示がふつうのユーザー発言として流れます。同じ会話、同じ文脈、同じプロンプトキャッシュのままです。

```
/heartbeat every 10m Check the deployment and report meaningful changes
```

Prime-Agent の `/heartbeat` に着想を得たものです。Hermes 版は、メッセージの流れに関する厳しい決まりを守っています。定期確認が差し込まれるのは応答と応答のあいだだけで（実行の途中には割り込みません）、形もふつうのユーザー発言そのものです。

## heartbeat と cron のどちらを使うか {#heartbeat-vs-cron-which-one-do-i-want}

見た目は似ていますが、役割が違います。

| | `/heartbeat` | [`hermes cron`](/hermes/docs/user-guide/features/cron/) |
|---|---|---|
| 走る場所 | **この会話の中**。文脈も、ここまでのやり取りの記憶もそのまま | 実行のたびに、独立した新しいセッション |
| プロセスを再起動しても残るか | 状態は残ります（SessionDB）。次にそのセッションが動いたときから、また流れます | はい。予定を持つ仕組みそのものが残ります |
| いくつ持てるか | 1 セッションにつき 1 つ | ジョブ数の上限なし |
| 向いていること | 「作業しながら、*このやり取りの中で* X を見張っておきたい」 | 定型のジョブ、報告、見張り、配信 |

目安として、繰り返したい指示にこの会話の文脈が要るなら `/heartbeat`、それだけで完結するジョブなら cron を使います。

## コマンド {#commands}

| コマンド | 何をするか |
|---|---|
| `/heartbeat every <interval> <prompt>` | そのセッションの定期確認を設定（または置き換え）します。間隔は `90s`、`10m`、`2h`、`1d` のように書きます（最短 60 秒）。 |
| `/heartbeat` または `/heartbeat status` | 設定されている指示、間隔、次に流れるまでの時間を表示します。 |
| `/heartbeat pause` | 設定を消さずに、流れるのを止めます。 |
| `/heartbeat resume` | 再開します（タイマーを取り直すので、止めていた分がいきなり流れることはありません）。 |
| `/heartbeat clear` | 定期確認を取り消します。 |

`/hb` は同じ意味の短い書き方です。CLI、TUI・デスクトップアプリ、各プラットフォーム連携で使えます（Slack では `/hermes heartbeat …` の形になります）。

## 動きの詳細 {#behavior-details}

- **手すきのときだけ。** 実行中の応答に割り込むことはありません。時間が来たときにエージェントが動いていれば、次に手すきになったときに流れます。
- **飛ばした分はまとめて 1 回。** セッションが忙しかったり、プロセスが動いていなかったりして何回分か過ぎていても、流れるのは**1 回**だけで、たまった分が押し寄せることはありません。タイマーは流れるたびに取り直します。
- **ユーザーの発言が優先。** 待っているユーザーの発言があれば必ずそちらが先で、定期確認は入力の列が空くまで待ちます。
- **キャッシュを壊さない。** 差し込まれるのはふつうのユーザー発言です。システムプロンプトも、使えるツールの構成も変わりません。
- **保存のされ方。** 状態は `SessionDB.state_meta` に `heartbeat:<session_id>` という鍵で入っていて、`/resume` をまたいでも、文脈の圧縮でセッションが入れ替わっても残ります。実際に流れるには、持ち主のプロセス（CLI のセッションか、プラットフォーム連携）が動いている必要があります。何があっても動いてほしい予定は cron を使ってください。
- **仕事を作り出さないための歯止め。** 差し込まれる指示には、めぼしい変化がなければ短く答えて終わるように書いてあります。何も起きていないときに無駄な作業が生まれません。

## 例 {#example}

```
You: /heartbeat every 15m Check whether the CI run for PR #1234 finished; summarize the result when it does

  ♥ Heartbeat set (every 15m): Check whether the CI run for PR #1234 finished; ...

[15 minutes of you working on other things in the same session]

Hermes: [Heartbeat — recurring instruction, fires every 15m]
  💻 gh pr checks 1234   (1.2s)
  CI is still running (14/37 checks complete). Nothing to report yet.
```

答えが変わらなくなったら `/heartbeat clear` で外します。そのまま見張らせておいても構いません。
