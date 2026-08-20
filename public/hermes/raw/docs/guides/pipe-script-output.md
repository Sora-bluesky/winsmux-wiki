---
title: "スクリプトの出力をメッセージングプラットフォームへ流す"
description: "シェルスクリプト、cron ジョブ、CI のフック、監視デーモンなどのテキストを、`hermes send` で Telegram・Discord・Slack・Signal などへ送ります。"
upstream_path: guides/pipe-script-output.md
upstream_blob: a58f408260767b4e7bda30d775643baadc4765ce
sources:
  - https://hermes-agent.nousresearch.com/docs/guides/pipe-script-output
---

# スクリプトの出力をメッセージングプラットフォームへ流す {#pipe-script-output-to-messaging-platforms}

`hermes send` は、Hermes ですでに設定済みのメッセージングプラットフォームへ
メッセージを送るだけの、小さくてスクリプトから扱いやすいコマンドです。通知用の
プラットフォーム横断の `curl` だと思ってください。ゲートウェイを起動しておく
必要も、LLM を使う必要もありません。ボットのトークンをスクリプトごとに
貼り直す必要もありません。

こんな場面で使えます。

- システムの監視（メモリ、ディスク、GPU の温度、長時間ジョブの完了）
- CI/CD の通知（デプロイ完了、テスト失敗）
- 結果を知らせたい cron のスクリプト
- ターミナルから一度きりのメッセージを送りたいとき
- 任意のツールの出力をどこかへ流したいとき（`make | hermes send --to slack:#builds`）

このコマンドは `hermes gateway` がすでに使っているのと同じ認証情報と
プラットフォーム用のアダプターを流用するので、設定をもう一式抱える必要は
ありません。

---

## クイックスタート {#quick-start}

```bash
# Plain text to the home channel for a platform
hermes send --to telegram "deploy finished"

# Pipe in stdout from anything
echo "RAM 92%" | hermes send --to telegram:-1001234567890

# Send a file
hermes send --to discord:#ops --file /tmp/report.md

# Attach a subject/header line
hermes send --to slack:#eng --subject "[CI] build.log" --file build.log

# Thread target (Telegram topic, Discord thread)
hermes send --to telegram:-1001234567890:17585 "threaded reply"

# List every configured target
hermes send --list

# Filter by platform
hermes send --list telegram
```

---

## 引数の早見表 {#argument-reference}

| フラグ | 説明 |
|------|-------------|
| `-t, --to TARGET` | 送り先です。[宛先の書き方](#target-formats) を参照してください。 |
| `message`（位置引数） | メッセージ本文です。省略すると `--file` か標準入力から読み込みます。 |
| `-f, --file PATH` | 本文をファイルから読み込みます。`--file -` で標準入力を明示できます。 |
| `-s, --subject LINE` | 本文の前に見出しの行を付けます。 |
| `-l, --list` | 使える宛先を一覧表示します。プラットフォーム名を位置引数で絞り込めます。 |
| `-q, --quiet` | 成功時に標準出力へ何も出しません（終了コードだけ。スクリプト向きです）。 |
| `--json` | 送信結果の JSON をそのまま出力します。 |
| `-h, --help` | 内蔵のヘルプを表示します。 |

### 宛先の書き方 {#target-formats}

| 書式 | 例 | 意味 |
|--------|---------|---------|
| `platform` | `telegram` | そのプラットフォームで設定済みの既定のチャンネルへ送ります |
| `platform:chat_id` | `telegram:-1001234567890` | 番号で指定したチャット・グループ・ユーザーへ送ります |
| `platform:chat_id:thread_id` | `telegram:-1001234567890:17585` | 特定のスレッド、または Telegram のフォーラムのトピックへ送ります |
| `platform:#channel` | `discord:#ops` | 人が読める形のチャンネル名（チャンネル一覧の情報から解決します） |
| `platform:+E164` | `signal:+15551234567` | 電話番号で宛先を指定するもの（Signal、SMS、WhatsApp） |

Hermes がアダプターを持つプラットフォームは、どれも宛先に指定できます。
`telegram`、`discord`、`slack`、`signal`、`sms`、`whatsapp`、`matrix`、
`mattermost`、`feishu`、`dingtalk`、`wecom`、`weixin`、`email` などです。

### 終了コード {#exit-codes}

| コード | 意味 |
|------|---------|
| `0` | 送信（または一覧表示）に成功しました |
| `1` | プラットフォーム側で配信に失敗しました（認証、権限、ネットワーク） |
| `2` | 使い方、引数、設定の誤りです |

終了コードは Unix の慣例どおりなので、`curl` や `grep` と同じ感覚で
スクリプトの分岐に使えます。

---

## 本文の決まり方 {#message-body-resolution}

`hermes send` は、次の順でメッセージの本文を決めます。

1. **位置引数** — `hermes send --to telegram "hi"`
2. **`--file PATH`** — `hermes send --to telegram --file msg.txt`
3. **パイプで渡した標準入力** — `echo hi | hermes send --to telegram`

標準入力が端末のとき（パイプでないとき）、Hermes は入力を**待ちません**。
代わりに使い方のエラーがはっきり出ます。本文をうっかり書き忘れたときに
スクリプトが止まったままにならないようにするためです。

---

## 実際の使いどころ {#real-world-examples}

### 監視: メモリやディスクの警告 {#monitoring-memory-disk-alerts}

監視スクリプトに書いていた場当たりな `curl https://api.telegram.org/...`
の呼び出しを、持ち運びの利く 1 行に置き換えられます。

```bash
#!/usr/bin/env bash
ram_pct=$(free | awk '/^Mem:/ {printf "%d", $3 * 100 / $2}')
if [ "$ram_pct" -ge 85 ]; then
  hermes send --to telegram --subject "⚠ MEMORY WARNING" \
    "RAM ${ram_pct}% on $(hostname)"
fi
```

`hermes send` は Hermes の設定を流用するので、Hermes が入っている端末なら
同じスクリプトがそのまま動きます。ボットのトークンを端末ごとに環境変数へ
書き出す手間はありません。

:::tip ゲートウェイ自身の異常をゲートウェイ経由で知らせない
ゲートウェイ自体が苦しいときに発火しうる監視（メモリ不足やディスク満杯の
警告）では、`hermes send` ではなく最小限の `curl` を使い続けてください。
負荷で Python の実行環境すら立ち上がらない状況でも、警告だけは飛んでほしい
はずです。
:::

### CI / CD: ビルドとテストの結果 {#ci-cd-build-and-test-results}

```bash
# In .github/workflows/deploy.yml or any CI script
if ./scripts/deploy.sh; then
  hermes send --to slack:#deploys "✅ ${CI_COMMIT_SHA:0:7} deployed"
else
  tail -n 100 deploy.log | hermes send \
    --to slack:#deploys --subject "❌ deploy failed"
  exit 1
fi
```

### cron: 日次のレポート {#cron-daily-report}

```bash
# Crontab entry
0 9 * * * /usr/local/bin/generate-metrics.sh \
  | /home/me/.hermes/bin/hermes send \
      --to telegram --subject "Daily metrics $(date +%Y-%m-%d)"
```

### 長時間の処理: 終わったら知らせる {#long-running-tasks-ping-when-done}

```bash
./train.py --epochs 200 && \
  hermes send --to telegram "training done" || \
  hermes send --to telegram "training failed (exit $?)"
```

### `--json` と `--quiet` を使ったスクリプト {#scripting-with---json-and---quiet}

```bash
# Hard-fail a script if delivery fails; don't clutter logs on success
hermes send --to telegram --quiet "keepalive" || {
  echo "Telegram delivery failed" >&2
  exit 1
}

# Capture the message ID for later editing / threading
msg_id=$(hermes send --to discord:#ops --json "build started" \
  | jq -r .message_id)
```

---

## `hermes send` にゲートウェイの起動は必要ですか {#does-hermes-send-need-the-gateway-running}

**たいていは不要です。** ボットのトークンで動くプラットフォーム（Telegram、
Discord、Slack、Signal、SMS、WhatsApp Cloud API、そのほかほとんど）では、
`hermes send` は `~/.hermes/.env` と `~/.hermes/config.yaml` の認証情報を使って
プラットフォームの REST エンドポイントを直接呼びます。単独で動くプロセスで、
メッセージを送り終えるとすぐ終了します。

ゲートウェイの起動が要るのは、接続を保ち続けるアダプターに依存する
**プラグイン型のプラットフォーム**だけです（たとえば WebSocket を張りっぱなしに
する独自プラグインなど）。その場合はゲートウェイを指すエラーがはっきり出るので、
`hermes gateway start` で起動してからやり直してください。

---

## 宛先を一覧して探す {#listing-and-discovering-targets}

特定のチャンネルへ送る前に、何が使えるかを確認できます。

```bash
# Every target across every configured platform
hermes send --list

# Just Telegram targets
hermes send --list telegram

# Machine-readable
hermes send --list --json
```

一覧は `~/.hermes/channel_directory.json` から作られます。このファイルは
ゲートウェイが動いている間、数分おきに更新されます。「no channels discovered
yet」と出る場合は、一度ゲートウェイを起動して（`hermes gateway start`）
情報を用意させてください。

`discord:#ops` や `slack:#engineering` のような人が読める名前は、送信時に
この情報から解決されます。番号の ID を覚えておく必要はありません。

---

## ほかのやり方との比較 {#comparison-with-other-approaches}

| やり方 | 複数プラットフォーム | Hermes の認証情報を流用 | ゲートウェイの要否 | 向いている用途 |
|----------|----------------|---------------------|---------------|----------|
| `hermes send` | ✅ | ✅ | 不要（ボットトークン型） | 下の用途すべて |
| プラットフォームごとに生の `curl` | それぞれ別に書く | 手作業 | 不要 | 重要な監視 |
| `--deliver` を使う `cron` ジョブ | ✅ | ✅ | 不要 | 定期実行のエージェント処理 |

`hermes send` は、できるだけ単純な入り口であることを意図しています。
何を言うかをエージェントに考えさせたいなら、cron ジョブを組んでください。
エージェントの最終応答は、設定した `deliver:` の宛先へ自動で配信されます
（エージェント自身がメッセージを送ることはもうありません）。定期実行に
LLM が生成した内容を載せたい場合は、`cronjob(action='create', prompt=...)` に
`deliver='telegram:...'` を添えて使います。文字列をそのまま流したいだけなら
`hermes send` の出番です。

---

## 関連ページ {#related}

- [cron で何でも自動化する](/hermes/docs/guides/automate-with-cron/) —
  出力が任意のプラットフォームへ自動配信される定期ジョブです。
- [ゲートウェイの内部構造](/hermes/docs/developer-guide/gateway-internals/) —
  `hermes send` が cron の配信と共有している配信ルーターです。
- [メッセージングプラットフォームの設定](/hermes/docs/user-guide/messaging/) —
  プラットフォームごとの初回設定です。
