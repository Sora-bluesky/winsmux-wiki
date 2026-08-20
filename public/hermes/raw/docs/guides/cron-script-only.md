---
title: "スクリプトだけの定期実行（LLM なし）"
description: "LLM をまったく使わない、昔ながらの見張り番の定期実行です。スクリプトが時間どおりに走り、その標準出力がメッセージアプリへ届きます。メモリの警告、ディスクの警告、CI の通知、定期的な状態確認に使えます。"
upstream_path: guides/cron-script-only.md
upstream_blob: ae3f1f0ae0e69435e2bafacaae472ca674818b5a
sources:
  - https://hermes-agent.nousresearch.com/docs/guides/cron-script-only
---

# スクリプトだけの定期実行 {#script-only-cron-jobs}

送りたいメッセージの中身が最初から決まっていることがあります。そういうときはエージェントに考えてもらう必要はありません。スクリプトを時間どおりに走らせて、出力があれば Telegram / Discord / Slack / Signal に届けばそれで足ります。

Hermes ではこれを **no-agent モード**と呼びます。定期実行のしくみから LLM を抜いたものです。

<!-- ascii-guard-ignore -->
```
   ┌──────────────────┐          ┌──────────────────┐
   │ scheduler tick   │  every   │ run script       │
   │ (every N minutes)│ ──────▶ │ (bash or python) │
   └──────────────────┘          └──────────────────┘
                                          │
                                          │ stdout
                                          ▼
                                 ┌──────────────────┐
                                 │ delivery router  │
                                 │ (telegram/disc…) │
                                 └──────────────────┘
```
<!-- ascii-guard-ignore-end -->

- **LLM を呼びません。** トークンもエージェントのループもモデルの費用もゼロです。
- **スクリプトそのものが仕事です。** 知らせるかどうかはスクリプトが決めます。出力を出せばメッセージが送られ、何も出さなければ静かに終わります。
- **Bash か Python です。** `.sh` / `.bash` のファイルは `PATH` にある `bash`（見つからないときは `/bin/bash`）で動き、それ以外の拡張子は今使っている Python インタプリタで動きます。パスは `~/.hermes/scripts/` の中に収まる必要があります（相対でも絶対でも `~` 付きでも、その中に収まっていれば大丈夫です）。定期実行のスクリプトは、Hermes 本体のプロセス環境からプロバイダの認証情報を**引き継ぎません**。
- **スケジューラは同じです。** LLM を使うジョブと並んで `cronjob` に置かれるので、一時停止も再開も一覧表示もログも配信先の指定も、すべて同じように使えます。

## こんなときに使います {#when-to-use-it}

no-agent モードが向いているのは次のような場面です。

- **メモリ / ディスク / GPU の見張り番。** 5 分ごとに走らせて、しきい値を超えたときだけ知らせます。
- **CI との連携。** デプロイが終わったらコミットの SHA を投稿する、ビルドが失敗したらログの末尾 100 行を送る、といった使い方です。
- **定期的な数値の取得。** 「毎朝 9 時に Stripe の売上を出す」なら、API を叩いて見やすく整えるだけで済みます。
- **外部のできごとの監視。** API を確認して、状態が変わったときだけ知らせます。
- **生存確認。** N 分ごとにダッシュボードへ合図を送り、そのホストが生きていることを示します。

何を言うかをエージェントに**判断**してほしいときは、通常の（LLM を使う）定期実行を選びます。長い文書を要約する、フィードから面白い項目を選ぶ、人が読みやすい文面を書く、といった仕事です。no-agent の道は、スクリプトの標準出力がそのままメッセージになる場合のためのものです。

## チャットから作る {#create-one-from-chat}

no-agent モードの本当にうれしいところは、見張り番の用意をエージェント自身に任せられる点です。エディタもシェルも要りませんし、CLI のオプションを覚えておく必要もありません。やりたいことを言葉で伝えると、Hermes がスクリプトを書き、予定に登録し、いつ動くかを教えてくれます。

### やり取りの例 {#example-transcript}

> **あなた:** 5 分ごとに見て、RAM が 85% を超えたら telegram に知らせて
>
> **Hermes:** *(`~/.hermes/scripts/memory-watchdog.sh` を書き、続けて `no_agent=true` を付けて `cronjob(...)` を呼びます)*
>
> 用意できました。5 分ごとに動いて、RAM が 85% を超えたときだけ Telegram に知らせます。スクリプトは `memory-watchdog.sh`、ジョブ ID は `abc123` です。

裏側では、エージェントが 2 つのツールを呼んでいます。

```python
# 1. Write the check script
write_file(
    path="~/.hermes/scripts/memory-watchdog.sh",
    content='''#!/usr/bin/env bash
ram_pct=$(free | awk '/^Mem:/ {printf "%d", $3 * 100 / $2}')
if [ "$ram_pct" -ge 85 ]; then
  echo "RAM ${ram_pct}% on $(hostname)"
fi
# Empty stdout = silent tick; no message sent.
''',
)

# 2. Schedule it — no_agent=True skips the LLM on every tick
cronjob(
    action="create",
    schedule="every 5m",
    script="memory-watchdog.sh",
    no_agent=True,
    deliver="telegram",
    name="memory-watchdog",
)
```

これ以降、動くたびの費用はゼロです。スケジューラがスクリプトを走らせ、標準出力が空でなければ Telegram に流すだけで、モデルには一切触れません。

### エージェントが代わりに決めてくれること {#what-the-agent-decides-for-you}

「X になったら知らせて」「N 分ごとに Y を見て Z なら教えて」といった頼み方をすると、Hermes の `cronjob` ツールの説明にしたがって、メッセージの中身がスクリプトだけで決まる場合には `no_agent=True` が選ばれます。考える必要がある依頼（*「新しい issue を要約して」*、*「いちばん面白い見出しを選んで」*、*「やわらかい調子でリマインドを書いて」*）のときは、通常の LLM を使う道に戻ります。

`--no-agent` を自分で指定する必要はありません。どう動いてほしいかを言葉にするだけで足ります。

### チャットから見張り番を管理する {#managing-watchdogs-from-chat}

作るときと同じように、エージェントは一時停止も再開も編集も削除もできます。

> **あなた:** 今夜はメモリの見張りを止めて
>
> **Hermes:** *(`cronjob(action='pause', job_id='abc123')` を呼びます)*
>
> 止めました。「また動かして」と言うか、`hermes cron resume abc123` で再開できます。

> **あなた:** 15 分ごとに変えて
>
> **Hermes:** *(`cronjob(action='update', job_id='abc123', schedule='every 15m')` を呼びます)*

作成 / 一覧 / 更新 / 一時停止 / 再開 / 今すぐ実行 / 削除という一通りの流れを、CLI のコマンドを覚えなくてもエージェントに任せられます。

## CLI から作る {#create-one-from-the-cli}

シェルのほうが好みですか。CLI からでも 3 つのコマンドで同じ結果になります。

```bash
# 1. Write your script
cat > ~/.hermes/scripts/memory-watchdog.sh <<'EOF'
#!/usr/bin/env bash
# Alert when RAM usage is over 85%. Silent otherwise.
RAM_PCT=$(free | awk '/^Mem:/ {printf "%d", $3 * 100 / $2}')
if [ "$RAM_PCT" -ge 85 ]; then
  echo "⚠ RAM ${RAM_PCT}% on $(hostname)"
fi
# Empty stdout = silent run; no message sent.
EOF
chmod +x ~/.hermes/scripts/memory-watchdog.sh

# 2. Schedule it
hermes cron create "every 5m" \
  --no-agent \
  --script memory-watchdog.sh \
  --deliver telegram \
  --name "memory-watchdog"

# 3. Verify
hermes cron list
hermes cron run <job_id>    # fire it once to test
```

これで全部です。プロンプトもスキルもモデルも要りません。

## スクリプトの出力が配信にどうつながるか {#how-script-output-maps-to-delivery}

| スクリプトのふるまい | 結果 |
|-----------------|--------|
| 終了コード 0、標準出力あり | 標準出力がそのまま届きます |
| 終了コード 0、標準出力が空 | 何も届きません（静かに終わります） |
| 終了コード 0、標準出力の最終行が `{"wakeAgent": false}` | 何も届きません（LLM ジョブと共通のしくみです） |
| 終了コードが 0 以外 | エラーの知らせが届きます（見張り番が壊れたまま黙り込まないようにするためです） |
| スクリプトが時間切れ | エラーの知らせが届きます |

「空なら黙る」というふるまいが、昔ながらの見張り番の要です。スクリプトは毎分でも気軽に走らせられますが、本当に気づいてほしいことが起きたときにだけメッセージが流れます。

## スクリプトの決まりごと {#script-rules}

スクリプトは `~/.hermes/scripts/` の中に置く必要があります。これはジョブを作るときと実際に走らせるときの両方で確認され、絶対パスや `~/` の展開、`../` を使った抜け道は拒否されます。このディレクトリは、LLM ジョブが使う事前チェック用スクリプトの置き場と共通です。

どのインタプリタで動くかは拡張子で決まります。

| 拡張子 | インタプリタ |
|-----------|-------------|
| `.sh`, `.bash` | `PATH` にある `bash`（見つからないときは `/bin/bash`） |
| それ以外 | `sys.executable`（今使っている Python） |

`#!/...` のシェバンはあえて見ていません。使うインタプリタをはっきり少なく保つことで、スケジューラが信頼する範囲を狭くしています。

## 予定の書き方 {#schedule-syntax}

ほかの定期実行と同じです。

```bash
hermes cron create "every 5m"        # interval
hermes cron create "every 2h"
hermes cron create "0 9 * * *"       # standard cron: 9am daily
hermes cron create "30m"             # one-shot: run once in 30 minutes
```

書き方の全体は [定期実行の機能一覧](/hermes/docs/user-guide/features/cron/) を見てください。

## 配信先 {#delivery-targets}

`--deliver` には、ゲートウェイが知っている宛先をすべて指定できます。よく使う形を挙げます。

```bash
--deliver telegram                       # platform home channel
--deliver telegram:-1001234567890        # specific chat
--deliver telegram:-1001234567890:17585  # specific Telegram forum topic
--deliver discord:#ops
--deliver slack:#engineering
--deliver signal:+15551234567
--deliver local                          # just save to ~/.hermes/cron/output/
```

ボットのトークンを使うサービス（Telegram、Discord、Slack、Signal、SMS、WhatsApp）なら、スクリプトが動く時点でゲートウェイが立ち上がっている必要はありません。`~/.hermes/.env` や `~/.hermes/config.yaml` にある認証情報を使って、各サービスの REST エンドポイントを直接呼びます。

## 編集と一生のあつかい {#editing-and-lifecycle}

```bash
hermes cron list                                    # see all jobs
hermes cron pause <job_id>                          # stop firing, keep definition
hermes cron resume <job_id>
hermes cron edit <job_id> --schedule "every 10m"    # adjust cadence
hermes cron edit <job_id> --agent                   # flip to LLM mode
hermes cron edit <job_id> --no-agent --script …     # flip back
hermes cron remove <job_id>                         # delete it
```

一時停止、再開、手動での実行、配信先の変更など、LLM ジョブでできることは no-agent のジョブでも同じようにできます。

## 実例: ディスクの空き容量を見張る {#worked-example-disk-space-alert}

```bash
cat > ~/.hermes/scripts/disk-alert.sh <<'EOF'
#!/usr/bin/env bash
# Alert when / or /home is over 90% full.
THRESHOLD=90
df -h / /home 2>/dev/null | awk -v t="$THRESHOLD" '
  NR > 1 && $5+0 >= t {
    printf "⚠ Disk %s full on %s\n", $5, $6
  }
'
EOF
chmod +x ~/.hermes/scripts/disk-alert.sh

hermes cron create "*/15 * * * *" \
  --no-agent \
  --script disk-alert.sh \
  --deliver telegram \
  --name "disk-alert"
```

どちらのファイルシステムも 90% 未満のあいだは何も言わず、いっぱいになったときにしきい値を超えたファイルシステムごとにちょうど 1 行だけ知らせます。

## ほかのやり方との比べ方 {#comparison-with-other-patterns}

| やり方 | 何が動くか | どんなときに選ぶか |
|----------|-----------|-------------|
| `cronjob --no-agent`（このページ） | Hermes の予定にしたがって動く自分のスクリプト | 考える必要のない見張り番・通知・数値の取得をくり返すとき |
| `cronjob`（既定の LLM 版） | エージェント（事前チェック用スクリプトを付けることも可能） | メッセージの中身にデータの読み解きが要るとき |
| OS の cron から [Webhook 購読](/hermes/docs/user-guide/messaging/webhooks/) へ `curl` | OS の予定にしたがって動く自分のスクリプト | Hermes 自身が不調かもしれないとき（それが監視の対象のとき） |

ゲートウェイが落ちていても*必ず*動いてほしい、システムの健康状態を見張る仕組みには、OS の cron から Hermes の Webhook 購読（あるいは外部の通知サービス）へ素朴に `curl` する形を使ってください。OS のプロセスとして独立して動くので、Hermes が動いているかどうかに左右されません。ゲートウェイの中のスケジューラが向いているのは、見張る対象が外側にある場合です。

## 関連 {#related}

- [cron で何でも自動化する](/hermes/docs/guides/automate-with-cron/) — LLM を使う定期実行の型。
- [定期実行（cron）の一覧](/hermes/docs/user-guide/features/cron/) — 予定の書き方、一生のあつかい、配信の振り分けまで。
- [Webhook 購読](/hermes/docs/user-guide/messaging/webhooks/) — 外部のスケジューラから叩ける、投げっぱなしの HTTP 入口。
- [ゲートウェイの内部](/hermes/docs/developer-guide/gateway-internals/) — 配信ルータの内側。
