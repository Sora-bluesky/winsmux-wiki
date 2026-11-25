---
title: "ゲートウェイの監視"
description: "ヘルス情報のエクスポート、構造化された診断、フリート全体のクエリ、監視の仕組みを拡張する方法"
upstream_path: developer-guide/gateway-monitoring.md
upstream_blob: 7f93bc354ea0821aa779cf80b99369f3d86a44f8
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/gateway-monitoring
---

# ゲートウェイの監視 {#gateway-monitoring}

Hermes ゲートウェイのデーモンについて、サービスの稼働状態の監視と構造化された運用診断を行い、
運用者が設定した送り先（OpenTelemetry Collector、DataDog、または任意の OTLP 受信側）へ
OTLP/HTTP でエクスポートします。

この監視の仕組みは、設計上コンテンツを一切含みません。エクスポートするのは、ゲートウェイと cron の
ライフサイクル状態、プラットフォーム接続のヘルス、コンテンツを含まない警告・エラーの
診断だけです。プロンプト、メッセージ、ツールの引数や結果、ジョブ名、配信先、スケジュール、
生のエラー、セッション履歴、利用状況の分析、監査ログ、詳細な実行トレースは決してエクスポートしません。
実行・モデル・ツールの軌跡の記録は別の仕組みで、Hermes にネイティブ統合された NeMo Relay SDK と、
明示的に設定した Relay のサブスクライバーやエクスポーターが担当します。

## エクスポートされるもの {#what-gets-exported}

| シグナル | OTLP のルート | 内容 |
| --- | --- | --- |
| ゲートウェイのゲージ | `/v1/metrics` | `hermes.gateway.up/state/busy/drainable/active_agents/background_work/background_delegations/restart_requested`、`hermes.platform.up/degraded`（値の種類が限られた `error_code` 属性付き） |
| ヘルス・ライフサイクルのイベント | `/v1/traces` | `gateway.lifecycle` の状態遷移（`starting -> running -> draining -> stopped`、`startup_failed`、終了）、`gateway.health_snapshot`、プラットフォームの状態変化 |
| 診断 | `/v1/logs` | ゲートウェイの警告・エラーのイベント。本文は固定で、サブシステム、深刻度、エラー分類、エラーコードの属性は値の種類が限られています。整形済みのログメッセージはエクスポートしません |
| ゲートウェイのメモリのゲージ | `/v1/metrics` | `hermes.gateway.previous_exit` = 1。`hermes.previous_exit` は `none`、`unclean`、`suspected_oom`、`oom_kill_host`、`watchdog`、`watchdog_memory_starved`、`oom_kill_cgroup`、`unknown` のいずれか（前回のゲートウェイがどう終わったかについて記録された最も強い証拠。起動ごとに 1 系列）。`hermes.gateway.memory_pressure` = 1。`hermes.memory_pressure` は `ok`、`elevated`、`critical`、`unknown` のいずれか（30 秒ごとの鼓動から取る、いまのホストのひっ迫） |
| cron スケジューラーのゲージ | `/v1/metrics` | ティッカーのハートビートと最終成功からの経過時間（取得できないときは省略）、スケジューラーの「期限切れ枠」分岐から数える単調増加の追いつき実行回数、有効なジョブ数と実行中のジョブ数、そして保存済みの `next_run_at` とスケジューラー既存の猶予ルールから求めた期限超過数 |
| cron 実行のライフサイクル | `/v1/traces` | 永続化された `claimed/running/completed/failed/unknown` の状態、値の種類が限られたソースとエラー分類、中身を推測できないハッシュ化済みのジョブキー、タイムスタンプがある場合の経過時間、スケジューラーが把握している場合の配信結果。終端状態では失敗しても処理を止めない（fail-open）フラッシュを1回試みるため、完了が最大1秒遅れることがあります |

各シグナルには `service.name`、バージョン、監視下での起動方式、インストール ID の
安定した一方向ハッシュが付きます。これで運用者は、アカウントやプロファイルの識別情報や
生のインストール ID をエクスポートせずに、インスタンスを見分けられます。

`hermes.gateway.active_agents`、`hermes.gateway.background_work`、
`hermes.gateway.background_delegations` は互いに補い合う指標です。`active_agents` は、
フォアグラウンドのメッセージのやり取り、実行中の cron ジョブ、API 実行の合計で、
ゲートウェイが停止時に処理し終えるまで待つ作業にあたります。`background_work` は、
`active_agents` に決して含まれない切り離された作業を数えます。バックグラウンドに回した `delegate_task` のサブエージェント、
`terminal(background=true)` のプロセス、kanban のワーカーです。こちらは
**タスク単位**で数えるため、N 個のサブエージェントを一斉に起動したバッチは N と数えられ、
サブエージェントの実際の同時負荷を反映します。`background_delegations` は非同期の
委任の**単位**だけを数えます（`delegate_task` の呼び出し1回が1つ、一斉起動のバッチも1つ）。
これは非同期プールの容量の数え方と一致します。`delegation.max_concurrent_children` と比べて
アラートを設定すると、枠の逼迫具合がわかります。インスタンスごとの稼働中の作業の総量は
`active_agents` と `background_work` の合計で、プールの飽和は
`background_delegations` で見てください。

`hermes.gateway.previous_exit` と `hermes.gateway.memory_pressure` は、`/api/status` の `memory` の塊と同じ、
生存記録と鼓動のファイルから取ります。`previous_exit` は、前回の稼働について記録された最も強い証拠を、次の順で示します。

- `oom_kill_cgroup`: ゲートウェイが正しく終わらずに止まり、最後の鼓動から今回の起動までのあいだに、
  カーネルの OOM キラーがゲートウェイの cgroup 内のプロセス（ゲートウェイ自身か、そこで動くツールのサブプロセス。
  カウンターはどちらかまでは示しません）を止めた
- `watchdog_memory_starved`: ホストのメモリのひっ迫が `critical` のときに、監視役がゲートウェイを止めた
- `watchdog`
- `oom_kill_host`: ゲートウェイが正しく終わらずに止まり、そのあいだにカーネルの OOM キラーがホスト上のどこかのプロセス
  （どのプロセスでもよく、ゲートウェイとは限りません）を止めた
- `suspected_oom`: 正しく終わらずに止まり、最後の鼓動の時点ですでにひっ迫が深刻だった
- `unclean`
- `none`: 悪い証拠は記録されていない（初回の起動もここに入ります）
- `unknown`: 今回の稼働に生存記録の登録がない

OOM キラーの範囲は、カーネルの `oom_kill` カウンター（cgroup v2 の `memory.events`、`/proc/vmstat`）から取ります。
比べるのは、止まった稼働の最後の鼓動がその同じ稼働のもので、15 分以内のときだけです。systemd のユニットや
コンテナを再起動すると cgroup はカウンター 0 で作り直されるので、管理側による再起動のあとは、たいていホスト単位の比較
（`oom_kill_host`）になります。`oom_kill_cgroup` になるのは、残っている cgroup の中でゲートウェイが再起動したときだけです。
値が変わるのは次の起動のときだけです。監視役が発動したときは何もエクスポートしません。プロセスはその直後に強制終了し、
送り出す処理は非同期なので、記録が外に出ることがないからです。その内容は次の起動の `previous_exit` が運びます。
`memory_pressure` は、鼓動が 150 秒より古いと `unknown` になります。

## 有効にする {#enabling}

```yaml
# config.yaml
monitoring:
  gateway_health_export:
    enabled: true
  export:
    otlp:
      enabled: true
      endpoint: http://collector-host:4318/v1/traces   # metrics/logs derive
      headers_env: {}   # header name -> ENV VAR NAME (values never stored)
```

現在の設定状態は、いつでも次のコマンドで確認できます。

```bash
hermes monitoring status
```

OpenTelemetry SDK は追加パッケージ `otlp` に含まれ、ポリシーが許せば初めて使うときに
インストールされます。準備済みのチェックアウトから明示的に入れたい場合は
`python -c "import pm; pm.sync_venv(['otlp'], explicit=True)"` を実行します。SDK が無い場合や送り先が停止している場合でも、
ゲートウェイの動作には影響しません。メトリクスの収集と通常のイベントのエクスポートは
処理の中心経路から外れており、cron の終端イベントだけは最終状態を失いにくくするため、
最大1秒の fail-open なフラッシュを1回だけ試みます。

systemd・launchd・s6 による監視下、コンテナ、tmux、単純な `hermes gateway run` の
いずれでも同じように動きます。エクスポーターはゲートウェイのプロセス内にあるので、
ホスト側にサイドカー、エージェント、コレクターを置く必要はありません。

## DataDog に集める {#collecting-into-datadog}

利用者側で OpenTelemetry Collector を動かし、次のように転送します。

```yaml
# otel-collector config
receivers:
  otlp:
    protocols:
      http:
exporters:
  datadog:
    api:
      key: ${env:DD_API_KEY}
service:
  pipelines:
    metrics:   {receivers: [otlp], exporters: [datadog]}
    traces:    {receivers: [otlp], exporters: [datadog]}
    logs:      {receivers: [otlp], exporters: [datadog]}
```

`monitoring.export.otlp.endpoint` をそのコレクターに向けます。アラートは
`hermes.gateway.up`、`hermes.platform.up`、`hermes.platform.degraded` に設定してください。

## フリート全体の汎用クエリとアラート {#generic-fleet-queries-and-alerts}

正確な書き方は、利用者が使う監視基盤によって変わります。以下の例は
PromQL 風の式で書いており、特定ベンダーに依存する通知経路、送り先、利用者の機器構成には意図的に触れていません。

フリート全体の表示は、中身を推測できない `service.instance.id` リソース属性でグループ化します。
停止したプロセスは自分で 0 を送れないため、どの環境でも、明示的な状態の検知と
系列の欠落の検知の両方が必要です。

```promql
# Explicit gateway failure.
hermes_gateway_up == 0

# Box disappeared or stopped exporting. Choose a window longer than the
# configured export interval and collector retry allowance.
absent_over_time(hermes_gateway_up[5m])

# Locally owned bridge is explicitly down.
hermes_platform_up == 0

# Scheduler thread is stale even though the gateway may still be alive.
hermes_cron_scheduler_heartbeat_age_seconds > 180

# Ticker loops but has not completed a successful tick recently.
hermes_cron_scheduler_last_success_age_seconds > 300

# One or more jobs are beyond their existing scheduler grace window.
hermes_cron_jobs_overdue > 0

# Catch-up counter increased, proving at least one stale occurrence was
# collapsed and run once after a delay.
increase(hermes_cron_scheduler_catch_up_occurrences[15m]) > 0

# The previous gateway life died uncleanly while the kernel OOM-killed a process
# in its cgroup, or a watchdog killed it while the host was out of memory.
hermes_gateway_previous_exit{hermes_previous_exit=~"oom_kill_cgroup|watchdog_memory_starved"} == 1
```

メトリクス名の許可リストを置いてエクスポーターの前に立つコレクターでは、
`hermes.gateway.previous_exit` と `hermes.gateway.memory_pressure` を足す必要があります
（下の「新しいゲージ・メトリクスを追加する」の手順 4 を参照）。

cron 実行のライフサイクル記録は `hermes.cron_execution` スパンとして届きます。
次のような値の種類が限られた属性から、アラートを出したりイベントを導いたりします。

```text
hermes.status = failed|unknown
hermes.delivery_outcome = failed|not_configured
hermes.error_class = auth_failed|rate_limited|timeout|network_error|
                     dispatch_failed|interrupted|empty_response|
                     invalid_config|unknown
```

運用者向けに推奨する表示:

1. `service.instance.id` ごとに1行で、ゲートウェイと設定済みのローカルプラットフォームの
   状態を並べる
2. スケジューラーのハートビート、最終成功からの経過時間、実行中の数、期限超過数、
   追いつき実行の増加
3. 中身を推測できない `hermes.job_key` だけをキーにした cron のライフサイクルのフィード
4. 次を個別のアラートにする: 機器の不在、ローカルのブリッジの停止、スケジューラーの停滞、cron の
   failed/unknown、配信の失敗、期限超過・追いつき実行の発生

アラートのしきい値と通知経路は、環境側が持つ設定に置いてください。ダッシュボードを
読みやすくするためだけに、ジョブ名、プロンプト、出力、スケジュール、配信先、生のエラー、プロファイル名、
アカウントの識別情報を追加してはいけません。

## リリース検証のシナリオ {#release-validation-scenarios}

デプロイを受け入れる前に、実際のコレクターと監視基盤を通して、次の5つのケースを
すべて意図的に起こして確認します。

1. **cron の成功:** `claimed -> running -> completed`、所要時間、実態どおりの
   配信結果が観測できること。
2. **cron の失敗:** `failed` と値の種類が限られたエラー分類が観測でき、デコードした OTLP ペイロードに
   生の例外やコンテンツが含まれないこと。
3. **cron の中断:** 実行中に担当のゲートウェイを止めて再起動し、
   `unknown` への回復が観測できること。
4. **ローカルで持つブリッジの障害:** ネイティブ接続を1つ壊し、その接続の
   値の種類が限られた down/retrying/fatal 状態と回復が観測でき、影響を受けない機器は
   健全なままであること。
5. **ゲートウェイの強制終了:** カナリアを1台終了させて系列の欠落検知を確認し、
   再起動して同じ中身を推測できないインスタンス ID が戻ってくること。

Hermes Agent が持つ Relay の通信経路のヘルスは、引き続き対象に含まれます。別のゲートウェイや
接続サービスが持つ、共有された接続先プラットフォームの状態は、そのサービスが正本であり、
そのサービス自身のテレメトリ経路でエクスポートすべきです。

どのシナリオでも、回復時にシグナルとアラートが解消されること、他の機器が
影響を受けないこと、コレクターの障害時も fail-open のままであること、デコードしたメトリクス、
スパン、ログ、リソース属性にコンテンツが含まれないことを確認します。

## ローカルでの簡易テスト（Docker なし） {#local-smoke-test-no-docker}

```bash
# terminal 1: capture collector on :4318
python scripts/observability/otel_capture_collector.py \
  --host 127.0.0.1 --port 4318 --log ~/.hermes/cache/scratch/hermes_otel_capture.jsonl

# terminal 2: drive the real exporter through lifecycle transitions,
# a fatal platform, and a structured warning event, then flush
python scripts/observability/gateway_health_export_probe.py \
  --endpoint http://127.0.0.1:4318/v1/traces \
  --log ~/.hermes/cache/scratch/hermes_otel_capture.jsonl --wait 8
# exit 0 prints: {"requests": 6, "paths": ["/v1/logs", "/v1/metrics", "/v1/traces"]}
```

## この仕組みの保守と拡張 {#maintaining-and-extending-this-plane}

この仕組みは、設計上**固定され、列挙済みで、コンテンツを含まない語彙**です。シグナルの追加は
「新しいメトリクスを出す」だけでは済みません。新しい名前や属性はすべて、
値の種類を限定している各層で宣言する必要があり、宣言が漏れると下流で無言のまま捨てられます。
行う変更に合ったチェックリストに従ってください。大原則は次のとおりです。
**出力しているのに全層で宣言していない新しいシグナルは、コードのバグに見えますが、実際は語彙の登録漏れです。
エラーは何も出ず、シグナルが届かないだけです。**

### コンテンツを含まないという不変条件（すべての変更に適用） {#content-free-invariant-applies-to-every-change}

何かを追加する前に、それがコンテンツを運べないことを確認します。数値、真偽値、
経過時間、所要時間、単調増加のカウント、一方向ハッシュは安全です。ジョブ名、プロンプト、出力、
スケジュール、配信先、生の例外テキスト、ファイルパス、プロファイル名、アカウント ID、自由形式の文字列を
保持できる属性は**決して**追加しないでください。記録をジョブや対象にひも付ける必要があるときは、
ハッシュ化します（`sha256(...)[:24]`、`agent/monitoring/cron_health.py` の `_job_key` を参照）。
生の ID は決して出力しません。ユーザー入力に触れる可能性のある文字列属性は、すべて
`redaction.redact_for_export` を通してから切り詰めます（`agent/monitoring/otlp_exporter.py` の
`_span_attrs` を参照）。

### 新しいゲージ・メトリクスを追加する {#adding-a-new-gaugemetric}

1. スナップショットを作る処理で出力します（`agent/monitoring/gateway_health.py` の
   `build_gateway_health_snapshot`、`cron_health.py` の `build_cron_health_snapshot`、
   または `gateway_health_export.py` の `_read_runtime_snapshot` に組み込んだ同種の読み取り処理）。
   ベストエフォートで扱い、読み取り処理の例外を収集ループへ持ち込まないでください。
   包み込んで、**例外の型名だけを含む、コンテンツを含まない WARNING** をログに出します
   （cron とバックグラウンド作業の読み取り処理が使っている形です）。こうすると、将来の不具合で
   シグナルが無言で消えるのではなく、目に見える形になります。
2. ドット区切りのメトリクス名を、`gateway_health_export.py::_start_metric_provider` にある
   observable gauge の `metric_names` リストに登録します。**スナップショットで出力していても、
   ここに登録していないゲージは観測されません。**
3. このファイルのエクスポート表に行を足し、アラートの例を追加します。
4. エクスポーターの前段に、メトリクス名の許可リストを使う OpenTelemetry Collector を置いている環境
   （`name != "..."` の条件を持つ `filter/...` プロセッサー）では、そこにも新しい名前を追加します。
   追加しないと、監視基盤に届く前にコレクターが捨ててしまいます。これはリポジトリのコードではありませんが、
   正しく出力した新しいメトリクスが表示されない理由として最も多いものです。デプロイする運用者が
   コレクターの設定を更新できるよう、PR で明記してください。

### 新しいサブシステム（新しいシグナルの系統）を追加する {#adding-a-new-subsystem-a-new-family-of-signals}

cron の形（`cron_health.py` とその組み込み）を真似します。読み取りと変換の処理は
独自のモジュールに置き、値の種類が限られた `GatewayMetric`（イベントがあればそれも）を返す
`build_<subsystem>_health_snapshot()` を1つ公開して、同じベストエフォートの try/except と WARNING の
ガードを付けて `_read_runtime_snapshot` に組み込みます。
そのうえで、新しい名前ごとに「メトリクスを追加する」チェックリストを、新しいイベント属性ごとに
「属性を追加する」チェックリストを実施します。そのサブシステムの障害パターンについて、
下のリリース検証のシナリオを追加します。

### エラー分類・状態・ソース・ステートの語彙を拡張する {#extending-the-error-class-status-source-state-vocabularies}

これらは、この仕組みの値の種類を限定する閉じた列挙型です。集合を拡張し、次に
分類処理を拡張します。どちらか片方だけを変えてはいけません。

- **cron**（`agent/monitoring/cron_health.py`）: `_KNOWN_STATUSES`、
  `_KNOWN_SOURCES`、`_KNOWN_DELIVERY_OUTCOMES`、そして `classify_cron_error` の
  キーワードによる振り分け。集合に無い値は出力時に `unknown` へ置き換えられるため、
  集合に追加していない新しい値は見えません。
- **ゲートウェイ・プラットフォーム**（`agent/monitoring/gateway_health.py`）:
  `_KNOWN_GATEWAY_STATES`、`_KNOWN_PLATFORM_STATES`、`classify_gateway_error`。

ルール: 語彙は**小さく**、運用上の意味があるものに保ちます（エラー分類は例外のサブクラスではなく、
運用者の対処に対応させます）。新しい振り分けは、変わりうるメッセージ文ではなく
安定したキーワードで一致させます。このファイルのアラート節にある
`hermes.error_class = ...` の一覧と、列挙型の単体テストを更新し、件数を固定するのではなく契約を検証する形にします。

### 既存のイベント・スパンにコンテンツを含まない属性を追加する {#adding-a-content-free-attribute-to-an-existing-eventspan}

`agent/monitoring/otlp_exporter.py::_span_attrs` にある出力処理の、種類ごとの `keep_by_kind` 許可リストに
キーを追加します（載っていないキーは捨てられます）。文字列になる可能性があれば
マスク処理を通します。そしてメトリクスと同じく、環境のコレクターにスパン属性の `keep_keys(...)` 許可リストがあるなら、
そこにも属性を追加します。追加しないと、途中で取り除かれます。

### 出力だけでなく経路全体を確認する {#verify-the-whole-chain-not-just-emission}

出力は必要ですが、それだけでは足りません。シグナルが監視基盤まで最後まで届くことを
確認してください。列挙型、`metric_names` への登録、
出力処理の属性許可リスト、コレクターの許可リストは、どれも載っていない値を
エラーなしで捨てるからです。

```bash
hermes monitoring status                 # posture
python scripts/observability/gateway_health_export_probe.py \
  --endpoint http://127.0.0.1:4318/v1/traces \
  --log ~/.hermes/cache/scratch/cap.jsonl --wait 8          # drive the real exporter
```

キャプチャした OTLP ペイロードをデコードし、新しい名前や属性が存在すること、
そしてコンテンツが漏れていないことを確認します。実際のコレクターを前段に置いている場合は、
その許可リストに項目を追加し、ローカルのキャプチャだけでなく監視基盤で再確認します。

## デプロイ先の URL への状態報告 {#status-reports-to-a-deployment-url}

上の OTLP エクスポートとは別の仕組みで、ホストしている環境が有効にしない限りオフです。
ゲートウェイをポーリングせずに稼働しているかを知りたい環境は、
ゲートウェイの起動時の環境に `GATEWAY_STATUS_REPORT_URL` を設定します。すると
ゲートウェイは、約2分ごとにその URL へ小さな報告を POST します（`beat`）。
scale-to-zero で自分のマシンを一時停止するときは、一時停止を要求する直前にもう1件
（`goodbye`）の送信を始め、その完了は待ちません。

- **有効にできるのはデプロイ環境だけです。** 既定の URL も
  `config.yaml` のキーもありません。この変数は起動時にだけ有効で、プロファイルの `.env` や
  シークレットの取得元にある値は無視され、`.env` を書き込む処理もこの変数を受け付けません。
- **URL の形式。** `t` クエリパラメーターに認証情報を持つ絶対 `https` URL で、
  `GATEWAY_RELAY_SLEEP_URL` と同じ形です。ゲートウェイは
  認証情報を `Authorization: Bearer` に移し、認証情報を取り除いた URL へ送信します。
  URL と認証情報がログに記録されることはありません。
- **送信元はマシンと報告先 URL ごとに1つ。** 報告するのは既定プロファイルのゲートウェイだけで、
  報告している間はその URL に対するマシン内のロックを保持します。そのため、
  プロファイルごとにゲートウェイを1つずつ動かすホストでも、送られる報告の流れは1本になります。
- **引き継がれません。** この URL は `GATEWAY_RELAY_SLEEP_URL` と同じく、
  ゲートウェイがエージェントのために起動するプロセス（terminal ツール、エージェントや
  配信のワーカー）の環境から取り除かれます。ゲートウェイが起動・再起動するゲートウェイは、
  自分が起動されたときの値を引き継ぎます。ゲートウェイを再起動する `hermes update` も同様です。
  プロファイル自身の `GATEWAY_RELAY_SLEEP_URL` があれば、そのプロファイルのゲートウェイでは
  そちらが優先されます。terminal ツールから手動で起動したゲートウェイはどちらも
  引き継ぎませんが、プロファイルの `.env` に設定したスリープ用の URL は読み込みます。
- **間隔。** 受信側が別の値を指定しない限り、2分に10%のゆらぎ（ジッター）を加えた間隔です。
  報告の保存を示す応答には `Report-Interval: <seconds>`（正の整数）を
  含められます。その場合ゲートウェイは、60〜600秒の範囲に収めたその間隔で、
  同じジッターを加えて報告します。保存を示す応答に有効な値が無ければ間隔は
  2分に戻り、それ以外の応答に付いたこのヘッダーは無視されます。
  間隔はメモリ上にだけ保持し、ファイル、`config.yaml`、環境変数には決して書きません。
  ゲートウェイのプロセスはどれも2分の間隔から始まり、最初の報告はすぐに送ります。
- **応答。** `2xx` は報告が保存されたことを示します。`429`/`503` は `Retry-After` の分だけ待ちます（最大10
  分）。`401`/`403` は、再び報告が保存されるまで 2、4、8、16、32 分、その後は 60 分と間隔を空けます。
  ネットワークエラーやその他の `5xx` は、数秒後に1回だけ再試行します。
  goodbye は再試行しませんが、その応答で待機を求められた場合は次の beat を
  その分待たせます。応答の本文は読みません。受信側にできるのは間隔の設定と
  待機の要求だけで、それ以外の方法でゲートウェイを操作することはできません。

報告に含まれるのは次の内容だけです。

| フィールド | 内容 |
| --- | --- |
| `v`, `kind`, `seq`, `boot_id` | 契約のバージョン `1`、`beat` または `goodbye`、プロセスごとのカウンター、ゲートウェイの起動ごとのランダムな ID |
| `status.gateway_running` | `true` |
| `status.gateway_state` | ライフサイクルの状態コード |
| `status.gateway_exit_reason` | 値の種類が限られたコード、または `null`。自由記述のテキストは入りません |
| `status.gateway_platforms` | プラットフォームのキーごとに `state` と、設定されている場合は `error_code` |
| `status.nous_session_valid` | `valid`、`terminal`、`unknown` のいずれか。ゲートウェイが読み取れなかった場合は含まれません |

`status` は、認証していない `/api/status` の呼び出し元がすでに受け取っている形を、
これらのフィールドだけに絞ったものです。プラットフォームのキーはそのエンドポイントが示すものと同じで、`<platform>`、
またはゲートウェイが別のプロファイルのために提供しているプラットフォームでは `<profile>:<platform>` です。
インストール ID、プロファイルの一覧、セッション数、メッセージ、プロンプト、設定、エラーの
文章、パス、バージョンは送信しません。

契約とそのテストベクターは `tests/fixtures/status_report/v1/` にあり、
コードは `gateway/status_report/` にあります。

## 対象範囲と今後の予定 {#boundaries-and-roadmap}

`hermes monitoring` CLI は、意図的に `status` だけを公開しています。この最初の
リリースが扱うのは、Hermes Agent が持つサービスのヘルスと運用診断のシグナルだけで、
Hermes Agent が持つ Relay の通信経路のヘルスもこれに含まれます。Team Gateway が正本として持つ
共有の接続・プラットフォームの状態は明示的に対象外で、
製品の利用分析、監査・品質のレポート、詳細な実行トレースも同様に対象外です。
共有クライアントの利用メトリクスと企業向けのトレース・テレメトリは、NeMo Relay 統合の上で、
それぞれ独自の同意、ポリシー、エクスポートの境界を持つ形で設計が進んでいます。
この監視の仕組みは範囲を狭く保ち、運用者がコンテンツを運ぶシグナルに一切触れずに
有効にできるようにしています。それらが実装されるにつれて、テレメトリの構成は
再編されることがあります。
