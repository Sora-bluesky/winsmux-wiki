---
title: "NeMo Relay"
description: "Hermes のモデル呼び出しとツール呼び出しを記録し、トレースをエクスポートして、NeMo Relay プラグインを設定します"
upstream_path: integrations/nemo-relay.md
upstream_blob: 3ebdc819fecbd0c4aa9766e970be0b3424dbbf85
sources:
  - https://hermes-agent.nousresearch.com/docs/integrations/nemo-relay
---

# NeMo Relay {#nemo-relay}

[NeMo Relay](https://docs.nvidia.com/nemo/relay/v0.11.1/about-nemo-relay/overview) を使うと、Hermes の会話を、モデルへのリクエスト、ツール呼び出し、委任先のエージェントまでたどって追跡できます。どのコマンドが実行されて何が返されたか、どのモデルリクエストが再試行されたか、実行のどこで時間がかかったかを確認できます。

Hermes は Relay に直接対応しています。Hermes はいつもどおり起動するだけでよく、別の Relay デーモンや `nemo-relay run` コマンド、Hermes の可観測性プラグインは必要ありません。

まずはローカルのトレースファイルから試し、そのうえでファイルとして残すか、トレースをダッシュボードへ送るか、完了した軌跡（trajectory）を分析用に保存するかを選びます。Relay プラグインを使えば、エクスポートするデータの墨消し（redaction）や、コストとリソースの計測値の追加もできます。

可観測性だけでなく、Hermes はモデル呼び出しとツール呼び出しを Relay の[ミドルウェア](https://docs.nvidia.com/nemo/relay/v0.11.1/about-nemo-relay/concepts/middleware)（非同期ミドルウェアを含む）に通して実行します。設定したプラグインは、リクエストや結果を検査・変更したり、ポリシーチェックを適用したり、キャッシュ済みの応答を返したりできます。可観測性の墨消しはこれとは別の機能で、エクスポートされるコピーだけを変更し、実際にモデルやツールへ渡るペイロードは変更しません。

:::note Hermes Relay とは別物です
NeMo Relay はエージェントの可観測性とミドルウェアを担当します。[Hermes Relay](/hermes/docs/user-guide/messaging/relay/) は、Hermes ゲートウェイをメッセージングプラットフォームに接続するものです。
:::

## 記録される内容 {#what-gets-recorded}

Relay は、Hermes の `AIAgent` 会話経路を通る処理を記録します。CLI、TUI、Desktop、ダッシュボード、ACP、メッセージングゲートウェイ、API サーバー、スケジュールジョブやバッチジョブ、Python ライブラリからの会話も、この経路を使っていれば記録の対象になります。

| 動作 | 確認できる内容 |
|---|---|
| セッションとターン | 開始・終了時刻、親子関係、ターンの結果、作業ディレクトリ（わかる場合）。 |
| モデルのリクエストとレスポンス | プロバイダーとモデル、保持されたメッセージとリクエストのフィールド、モデルの出力、所要時間、結果。 |
| 再試行とフォールバック | 同じ論理的なモデル呼び出しの下に、プロバイダーへの試行が個別に記録されます。ユーザーから見た 1 回の呼び出しと、それを完了させるための複数回の試行を区別するのに役立ちます。 |
| トークン使用量とコスト | プロバイダーが報告した使用量。任意の pricing プラグインを使うと、該当するモデルの価格と利用できる使用量データがある場合に、推定コストが追加されます。 |
| ツール呼び出し | ツール名、呼び出し ID、引数、返された結果、所要時間、管理された呼び出しの結果。ターミナルコマンドの場合は、返された出力と終了ステータスもあわせて確認してください。データとして返されたエラーでは、スパンが失敗扱いにならないことがあります。 |
| ストリーミング | ストリームのライフサイクル、チャンク受信時のメタデータ、取得できた使用量と終了情報、さらにプロバイダーの形式が対応していれば再構成された最終応答。 |
| 委任先のエージェント | Hermes がその関係を把握している場合、子の Hermes セッションが、それを開始したターンの下に記録されます。 |
| スキル、メモリ、MCP | Hermes のツール経由で行われた呼び出しと、その引数・結果。これらは通常のツール記録であり、各システムの内部で起きたことをすべて個別にトレースするものではありません。 |

取得できるフィールドは、プロバイダー、コーデック、プラグイン、エクスポート形式によって異なります。OpenAI Chat Completions、OpenAI Responses、Anthropic Messages では[プロバイダー対応のコーデック](https://docs.nvidia.com/nemo/relay/v0.11.1/integrate-into-frameworks/provider-codecs)が使われます。それ以外の経路では汎用の JSON 射影が使われるため、正規化されたモデルのフィールドが欠けることがあります。

### 1 回の実行を読み解く {#reading-one-run}

たとえば、失敗しているテストの調査を Hermes に頼んだとします。トレースでは次の点を確認します。

1. 会話を表す **`hermes.session`** と、あなたのリクエストを表す **`hermes.turn`**。
2. モデル呼び出しを表す **`hermes.logical_llm_call`**。その子として、`openai.chat_completions` のようなプロバイダーへの試行が 1 回ごとに記録されます。
3. Hermes が実行したコマンドを表す **`terminal`** などのツールスコープ。引数、結果、所要時間が含まれます。
4. Hermes が回答に向けて作業を進めるにつれて、ターンの下にさらにモデル呼び出しやツールが続きます。委任先の Hermes エージェントは、独自の子セッションを持つことがあります。

これにより、遅いのがプロバイダーへのリクエストなのかツールなのか、あるいはツールは正常に動いたのにモデルリクエストで何度も試行が必要だったのかを見分けられます。

### 自動では記録されないもの {#what-is-not-automatically-recorded}

Relay は、Hermes やお使いのマシンのすべてを記録するわけではありません。スラッシュコマンド、メッセージの配信、音声の文字起こし、スケジューラーの内部管理処理は、この会話経路の外にあります。外部の MCP サーバーへの呼び出しでは、Hermes 側のリクエストと結果は記録されますが、サーバー内部のツール、サブプロセス、ネットワーク通信は記録されません。

ストリーミングのチャンクマークに含まれるのは受信時のメタデータで、生のテキスト断片がすべて入るわけではありません。リソースの計測は任意です。resource-metrics プラグインはホストやプロセスの計測値を追加するもので、ツールごとやサンドボックスごとの集計を自動で行うものではありません。[利用できるプラグイン](#available-relay-plugins)を参照してください。

## 出力形式を選ぶ {#choose-an-output}

1 つの可観測性コンポーネントから、同じ実行を複数の形式でエクスポートできます。形式ごとに用途が異なり、細部の残り方も同じではありません。

| 出力 | 含まれる内容 | 向いている用途 |
|---|---|---|
| [ATOF](https://docs.nvidia.com/nemo/relay/v0.11.1/configure-plugins/observability/atof) | 個々のスコープの開始・終了イベントとマーク。JSONL として逐次書き出されます。 | 記録されたフィールドの確認、実行のデバッグ、独自のコレクターへのイベント送信。 |
| [ATIF](https://docs.nvidia.com/nemo/relay/v0.11.1/configure-plugins/observability/atif) | 完了した軌跡をまとめた JSON で、会話のステップとツールのステップに整理されています。最上位のエージェントスコープが閉じたときに書き出されます。 | オフラインでの分析や、評価用・学習用データセットの準備。 |
| [OpenTelemetry / OTLP](https://docs.nvidia.com/nemo/relay/v0.11.1/configure-plugins/observability/opentelemetry) | OTLP コレクターへ送られるトレース。ログとメトリクスは別途設定します。完了したスパンは、セッション全体が終わる前に表示されることがあります。 | Phoenix などの可観測性バックエンドで、所要時間、失敗、入れ子になった呼び出しを確認する。 |

Hermes が何を記録しているかを正確に確かめたい場合は、**まず ATOF** を使ってください。トレースのダッシュボードには **OpenTelemetry** を、完了した軌跡のファイルには **ATIF** を使います。ATIF は、外部のツール呼び出しやモデル呼び出しをすべて自動で再現できる記録ではありません。

[クイックスタート](#quick-start-write-a-local-trace)では ATOF を書き出します。以降の例では、[Phoenix](#arize-phoenix)、[その他の OpenTelemetry コレクター](#other-opentelemetry-collectors)、[ATIF](#atif-trajectories) を追加します。

## クイックスタート: ローカルにトレースを書き出す {#quick-start-write-a-local-trace}

### 始める前に {#before-you-start}

通常の Hermes のセットアップを済ませ、お使いのモデルプロバイダーで会話を実行できることを確認してください。

Hermes は `nemo-relay>=0.11,<0.12` を使います。Hermes の依存関係の設定では、次のプラットフォームの **Python 3.14** 上に Relay がインストールされます。

| OS | アーキテクチャ |
|---|---|
| macOS | Apple シリコン |
| Linux（glibc 系と musl 系のディストリビューションを含む） | x86_64 または ARM64 |
| Windows | x86_64 または ARM64 |

Intel Mac と Android/Termux は、この連携ではサポートされていません。Relay のバインディングがなくても Hermes 自体は動きますが、Relay による記録とミドルウェアは使えません。Hermes が管理する環境のパッケージを直接変更せず、通常の Hermes のインストール手順や更新手順を使ってください。Relay の[サポート状況の一覧](https://docs.nvidia.com/nemo/relay/v0.11.1/reference/support-matrix)も参照してください。

`hermes doctor` を実行すると、そのマシンにすでに Relay の設定が適用されているかを確認できます。Hermes は Relay のユーザー設定ファイルとシステム設定ファイルを読み込みます。後述する任意のオーバーライドが置き換えるのは、ユーザー設定ファイルだけです。また、有効になっている可観測性コンポーネントが、継承された OTLP エンドポイントの設定を拾うこともあります。テストの出力先はローカルファイルだけだと思い込む前に、[設定](#how-configuration-is-applied)を確認してください。

### 1. 設定ファイルを作成する {#1-create-the-configuration-file}

Hermes を起動するディレクトリに、次の内容を `relay-plugins.toml` として保存します。

```toml
version = 1

[[components]]
kind = "observability"
enabled = true

[components.config]
version = 4
enable_full_payloads = false

[components.config.atof]
enabled = true

[[components.config.atof.sinks]]
type = "file"
output_directory = "./hermes-relay"
filename = "events.jsonl"
mode = "append"
```

これで、[ATOF イベント](https://docs.nvidia.com/nemo/relay/v0.11.1/configure-plugins/observability/atof)が `./hermes-relay/events.jsonl` に書き出されます。出力先の相対パスは、設定ファイルのディレクトリではなく、Hermes の作業ディレクトリが基準になります。サービスとして動かす場合は、出力先に絶対パスを指定してください。

`enable_full_payloads = false` は、繰り返し含まれるモデルの履歴を減らす設定ですが、プロンプト、レスポンス、ツールの引数、ツールの結果を取り除くわけでは**ありません**。このファイルは機密情報として扱ってください。

### 2. ファイルを指定して Hermes を実行する {#2-select-the-file-and-run-hermes}

macOS または Linux の場合:

```bash
export HERMES_NEMO_RELAY_PLUGINS_TOML="$PWD/relay-plugins.toml"
hermes chat --oneshot -q "Use the terminal tool to run pwd, then report the result."
```

Windows PowerShell の場合:

```powershell
$env:HERMES_NEMO_RELAY_PLUGINS_TOML = Join-Path (Get-Location) "relay-plugins.toml"
hermes chat --oneshot -q "Use the terminal tool to run pwd, then report the result."
```

このオーバーライドは、そのシェルから起動した Hermes プロセスにだけ適用されます。普段使いでは、代わりに Relay のユーザー設定ファイルを編集するか、Hermes サービスを起動する環境でオーバーライドを設定してください。Relay の設定を変更したら、Hermes を再起動します。

### 3. 出力を確認する {#3-check-the-output}

macOS または Linux の場合:

```bash
wc -l ./hermes-relay/events.jsonl
tail -n 1 ./hermes-relay/events.jsonl | python3 -m json.tool
```

Windows PowerShell の場合:

```powershell
(Get-Content .\hermes-relay\events.jsonl).Count
Get-Content .\hermes-relay\events.jsonl -Tail 1
```

`hermes.session`、`hermes.turn`、モデル操作という名前のレコードを探してください。Hermes が指示どおりにツールを実行していれば、`terminal` のレコードもあります。各スコープには通常、同じ `uuid` を持つ開始レコードと終了レコードがあり、`parent_uuid` によって親スコープとつながっています。レコードの数は実行内容によって変わります。また、追記モード（append）では過去の実行も同じファイルに残ります。

ファイルが作成されない場合は、`hermes doctor` を実行し、`hermes logs --level WARNING` で警告ログを確認してください。Relay の初期化に失敗しても、Hermes が応答を返さなくなるとは限りません。

オーバーライドを外すと通常の Relay の設定探索に戻りますが、ユーザー設定やシステム設定にあるエクスポーターが止まるわけでは**ありません**。エクスポートを止めるには、その出力先を有効にしている設定を変更し、Hermes を再起動してください。`OTEL_SDK_DISABLED=true` を設定すると Relay の OTLP エクスポーターは無効になりますが、ATOF と ATIF は無効になりません。

## コレクターへエクスポートする {#export-to-a-collector}

リモートの出力先を設定している間も、ローカルの ATOF ファイルは残しておいてください。問題が Hermes の記録側にあるのか、エクスポーターやコレクター側にあるのかを切り分けるのに役立ちます。

### Arize Phoenix {#arize-phoenix}

[Phoenix のインストール手順](https://arize.com/docs/phoenix/self-hosting)に従って、ローカルの Phoenix インスタンスを起動します。ローカルで Docker を使って試す場合は、次のとおりです。

```bash
docker run -d --rm --name hermes-relay-phoenix \
  -p 127.0.0.1:6006:6006 \
  arizephoenix/phoenix:latest
```

`relay-plugins.toml` の既存の可観測性コンポーネントの下に、次のブロックを追加します。

```toml
[components.config.opentelemetry]
enabled = true

[[components.config.opentelemetry.endpoints]]
type = "openinference"
endpoint = "http://127.0.0.1:6006/v1/traces"
transport = "http_binary"
service_name = "hermes-agent"

[components.config.opentelemetry.endpoints.resource_attributes]
"openinference.project.name" = "hermes-relay"
```

新しく Hermes プロセスを起動し、リクエストを 1 つ最後まで実行します。[http://127.0.0.1:6006](http://127.0.0.1:6006) を開き、`hermes-relay` プロジェクトを選択してください。エクスポートはまとめて送られるため、表示まで数秒待ってください。ローカルでのテストを終えるときは、`docker stop hermes-relay-phoenix` でコンテナを停止します。

この例では Phoenix を自分のマシンだけにバインドしており、認証はかかっていません。共有環境に導入する場合は、コレクターの認証とデプロイの手順に従ってください。エクスポートされるフィールドについては、Relay の [OpenInference の解説](https://docs.nvidia.com/nemo/relay/v0.11.1/configure-plugins/observability/openinference)を参照してください。

### その他の OpenTelemetry コレクター {#other-opentelemetry-collectors}

Relay には、OpenTelemetry のトレース射影（projection）が 3 種類あります。射影とは、Relay のイベントをどのようにスパンや属性に変換するかを決めるもので、別のファイル形式ではありません。

| 射影 | 用途 |
|---|---|
| `openinference` | OpenInference 互換のエージェント、モデル、ツールのスパン。上記の Phoenix の例もこれを使います。 |
| `gen_ai` | 標準の OpenTelemetry GenAI フィールド。その規約を前提とするコレクター向けです。Relay 固有の属性や、メトリクス以外のマークはトレースに含まれません。 |
| `full` | Relay のスコープ階層、メタデータ、メトリクス以外のマーク。OTLP バックエンドで Relay の詳細なイベントビューが必要な場合に使います。 |

お使いのコレクターが対応している射影を選んでください。射影が異なる場合は出力先を分ける必要があり、同じエンドポイントに異なる射影を指定すると Relay はその設定を拒否します。ログやメトリクスも必要な場合は、それぞれのパイプラインを別途設定してください。

Relay の可観測性コンポーネントが有効になっていると、明示的なエンドポイントのブロックがなくても、標準の OTLP エンドポイント用の環境変数によって自動エクスポートが設定されることがあります。明示的に設定したエンドポイントと自動エクスポーターは併存できます。出力先を追加する前に、継承されているエンドポイントやヘッダーの変数を確認してください。[OpenTelemetry の設定](https://docs.nvidia.com/nemo/relay/v0.11.1/configure-plugins/observability/opentelemetry)を参照してください。

### ATIF の軌跡 {#atif-trajectories}

完了した軌跡を書き出すには、次を追加します。

```toml
[components.config.atif]
enabled = true
agent_name = "Hermes Agent"
model_name = "unknown"
output_directory = "./hermes-relay"
filename_template = "trajectory-{session_id}.json"
```

[ATIF](https://docs.nvidia.com/nemo/relay/v0.11.1/configure-plugins/observability/atif) は、最上位のエージェントスコープが閉じたときに軌跡を書き出します。そのため、長時間動き続けるゲートウェイのセッションでは、セッション全体の軌跡が完成する前に、ターンのスパンだけが表示されることがあります。[継続的なゲートウェイセッション](#continuous-gateway-sessions)を参照してください。

ファイル名には Relay の軌跡識別子が使われるため、`hermes sessions` で表示される ID と一致するとは限りません。ATIF ファイルとトレースを突き合わせる必要がある場合は、Relay の[相関付けの解説](https://docs.nvidia.com/nemo/relay/v0.11.1/configure-plugins/observability/about#correlating-trajectories-and-traces)を参照してください。

## 利用できる Relay プラグイン {#available-relay-plugins}

Relay プラグインは、[Hermes プラグイン](/hermes/docs/user-guide/features/plugins/)とは別物です。`hermes plugins enable` ではなく、Relay の `plugins.toml` で設定します。Hermes が使う Relay の Python パッケージには、次のコンポーネントが含まれています。

| プラグイン | 追加される機能 | 実際の呼び出しを変更するか |
|---|---|---|
| [`observability`](https://docs.nvidia.com/nemo/relay/v0.11.1/configure-plugins/observability/about) | ATOF・ATIF ファイルの出力、または OpenTelemetry へのエクスポート。 | いいえ。記録した動作をエクスポートするだけです。 |
| [`pii_redaction`](https://docs.nvidia.com/nemo/relay/v0.11.1/configure-plugins/pii-redaction/about) | 検出した機密性の高い値を、エクスポート前に可観測性用のコピーから取り除きます。 | いいえ。モデルやツールへのペイロードは変更されません。 |
| [`pricing`](https://docs.nvidia.com/nemo/relay/v0.11.1/configure-plugins/model-pricing) | 設定した価格と報告された使用量から、モデル呼び出しのコストを推定します。 | いいえ。推定には、該当する価格と利用できる使用量データが必要です。 |
| [`resource_metrics`](https://docs.nvidia.com/nemo/relay/v0.11.1/configure-plugins/resource-metrics) | CPU、メモリ、プロセス、ディスク、ネットワーク、および対応する GPU の計測値を、ポーリングまたはスナップショットで取得します。ポーリングは有効にするまでオフです。 | 呼び出しの書き換えは行いません。一部の計測値はシステム全体やデバイス全体のものです。取得できるかどうかはプラットフォームとドライバーによって異なります。 |
| [`adaptive`](https://docs.nvidia.com/nemo/relay/v0.11.1/configure-plugins/adaptive/about) | プロンプトキャッシュの計画、レスポンスのキャッシュ、その他の適応機能。 | 変更することがあります。キャッシュにヒットすると、実際のプロバイダー呼び出しやツール呼び出しが省略されることがあります。 |
| [`nemo_guardrails`](https://docs.nvidia.com/nemo/relay/v0.11.1/configure-plugins/nemo-guardrails/about) | 従来の Guardrails によるポリシーチェック。**非推奨です。新しく設定する場合は選ばないでください。** | はい。ポリシーチェックが実際の実行に影響することがあります。 |

[NeMo Switchyard](https://docs.nvidia.com/nemo/relay/v0.11.1/configure-plugins/switchyard) は、モデルのルーティング用に別途インストールする NVIDIA 製のプラグインです。Hermes には同梱されていません。お使いの Relay のバージョンと互換性のあるリリースを使い、そのインストール手順に従ってください。

可観測性を目的とする場合は、まず `observability` から始め、必要に応じて `pii_redaction` を追加し、そのうえで pricing やリソース計測を検討してください。実行内容を変えるプラグインは、実際に使うプロバイダーとツールで検証する必要があります。可観測性の墨消しでは、レスポンスキャッシュの内容は無害化されません。

## Relay プラグインを設定する {#configure-relay-plugins}

以下の例は、クイックスタートの `relay-plugins.toml` を拡張したものです。その他のコンポーネントについては、上の一覧にある設定へのリンクを参照してください。ファイルの構造は、Relay の[設定ファイルの解説](https://docs.nvidia.com/nemo/relay/v0.11.1/configure-plugins/plugin-configuration-files)に記載されています。

### エクスポートから一般的な値を墨消しする {#redact-common-values-from-exports}

同じファイルに 2 つ目のコンポーネントを追加します。

```toml
[[components]]
kind = "pii_redaction"
enabled = true

[components.config]
version = 1

[[components.config.profiles]]
mode = "builtin"
priority = 80

[components.config.profiles.builtin]
action = "redact"
detector = "email"

[[components.config.profiles]]
mode = "builtin"
priority = 90

[components.config.profiles.builtin]
action = "redact"
detector = "api_key"
```

これにより、コピーされた可観測性データから、検出されたメールアドレスと API キーが墨消しされます。実際にツールやモデルへ渡るペイロードは墨消しされず、あらゆる種類の機密データに対応するわけでもありません。検出器（detector）と設定については、[PII の墨消し](https://docs.nvidia.com/nemo/relay/v0.11.1/configure-plugins/pii-redaction/configuration)を参照してください。

### 動的プラグインを読み込む {#load-a-dynamic-plugin}

プラグインの作者が示す手順に従ってプラグインとその依存関係をインストールし、Relay の設定にそのマニフェストを追加します。

```toml
[[plugins.dynamic]]
manifest = "./plugins/example/relay-plugin.toml"
```

マニフェストのパスは、設定ファイルからの相対パスです。プラグインのドキュメントに設定項目が記載されている場合は、`[plugins.dynamic.config]` の下に記述してください。

Hermes は設定を Relay のプラグインホストに渡し、プラグインホストが検証、互換性、完全性、信頼に関するルールを適用します。マニフェストを記載しただけでは、これらのチェックは省略されません。お使いの Relay のバージョンと互換性のあるプラグインのリリースを使い、Relay の[インストールと検証の手順](https://docs.nvidia.com/nemo/relay/v0.11.1/configure-plugins/discoverable-plugins)に従ってください。

Hermes は、会話の開始時に成果物をダウンロードしたり、依存関係をインストールしたりはしません。ネイティブプラグインは Hermes のプロセス内で動作します。ワーカープラグインは別のプロセスで動作しますが、セキュリティ上のサンドボックスではありません。設定を変更したら Hermes を再起動し、プラグインのドキュメントに書かれた動作を実際に試して、正しく動くことを確認してください。

:::caution 適用範囲について
Hermes は、初期化に失敗した場合でも Relay プラグインなしで動作を続けることがあります。また、1 つのセッション内で後から重なって始まったターンや、実行中の管理されたコールバックの内側で入れ子になったモデル呼び出し・ツール呼び出しについては、管理された記録とミドルウェアを省略します。すべての操作を確実にチェックする必要がある場合は、この連携を唯一のセキュリティ境界として扱わないでください。
:::

## 設定の適用のされ方 {#how-configuration-is-applied}

- オーバーライドがない場合、Relay はユーザー設定ファイルを読み込み、次にシステム設定ファイルを読み込みます。
- `HERMES_NEMO_RELAY_PLUGINS_TOML` を指定すると、選択したファイルがユーザー設定ファイルの代わりになります。システム設定ファイルは引き続き優先されます。
- 動的プラグインの記述は、Hermes 独自のローダーではなく、Relay の設定とポリシーのルールに従って扱われます。
- 最初にホストされたプロファイルが、そのプロセスに 1 つの Relay プラグインホストを初期化します。同じプロセス内の他のプロファイルは、そのミドルウェア、エクスポーターの出力先、プラグインのコード、プラグインの認証情報を共有します。
- セッションはそれぞれ別のスコープとして扱われますが、プラグインのポリシーまで分かれるわけではありません。プロファイルごとに出力先や信頼設定を変える必要がある場合は、Hermes のプロセスを分けてください。
- 変更はプロセスを再起動した後に反映されます。有効なコンポーネントも選択された動的プラグインもないファイルを読み込んだだけでは、管理されたミドルウェアは有効になりません。

`hermes doctor` を実行すると、実際に使われているファイルのパスと検証結果を確認できます。設定ファイルの探索場所とマージのルールについては、[Relay の設定ファイルの解説](https://docs.nvidia.com/nemo/relay/v0.11.1/configure-plugins/plugin-configuration-files)を参照してください。

## 継続的なゲートウェイセッション {#continuous-gateway-sessions}

ゲートウェイのセッションは、何日も開いたままになることがあります。セッション単位のスパンや軌跡を定期的に閉じるには、Hermes の `config.yaml` で分割（segmentation）を設定します。

```yaml
gateway:
  telemetry:
    session_segments:
      on_compaction: false
      max_turns: 0
```

`on_compaction: true` にすると、コンパクション（会話の圧縮）の後に Relay のセッションスコープを切り替えます。`max_turns` に正の数を設定すると、その数のターンが完了するごとに切り替えます。切り替えはターンの区切りで行われ、Hermes の会話がリセットされることはありません。上記のデフォルト値では、分割は無効のままです。

## データとプライバシー {#data-and-privacy}

ATOF、ATIF、OpenTelemetry には、プロンプト、レスポンス、ツールの引数と結果、作業ディレクトリ、メタデータ、エラーの詳細が含まれることがあります。エクスポートする前に、出力先とデータの内容を確認してください。

- `enable_full_payloads = false` で減らせるのは繰り返される履歴であり、機密性の高い内容すべてではありません。
- マシン全体に適用される Relay の設定と、継承された OTLP エンドポイントの変数を確認してください。明示的なファイルのオーバーライドを外しても、エクスポートを停止したことにはなりません。
- モデルプロバイダーの認証には、SDK または環境変数による認証を使うことをおすすめします。独自のリクエストフィールドや `extra_headers` は、コピーされたペイロードに含まれることがあります。独自の認証情報が取り除かれるとは考えないでください。
- 必要に応じて、可観測性用のサニタイザーを設定してテストしてください。サニタイザーが変更するのはエクスポートされるコピーであり、モデルやツールに送られるデータではありません。
- 通常どおり終了すれば、Relay はキューに残った処理を完了させます。クラッシュや強制終了の場合は、バッファ内のレコードが失われることがあります。配信の挙動はリモートのエクスポーターごとに異なります。

### 共有メトリクスは別の仕組みです {#shared-metrics-are-separate}

Hermes の任意機能である[共有メトリクス](/hermes/docs/developer-guide/relay-shared-metrics/)は、会話全体ではなく、範囲を限定した使用量カウンターを収集します。収集とリモート送信は別々に設定します。

```yaml
telemetry:
  shared_metrics:
    enabled: true
    send: false
```

この例では、ローカルでの収集は有効になりますが、共有メトリクスの送信機能によるリモート送信は行われません。`send: false` を設定しても、Relay のエクスポーター（継承された OTLP 設定による自動エクスポートを含む）は無効になりません。また、Relay のエクスポーターを設定しても、共有メトリクスは有効になりません。両方を有効にすると、共有メトリクスのレコードが、Relay に設定されたサブスクライバーにも届くことがあります。スキルのライフサイクルや読み込み回数を数える専用のカウンターは、この任意モードに属します。通常のスキルツールの引数や結果は、あくまで一般的なツールのデータとして扱われます。

## 以前の設定から移行する {#migrate-an-older-setup}

以前の Hermes の `observability/nemo_relay` プラグインと、古い `HERMES_NEMO_RELAY_ATOF_*` / `HERMES_NEMO_RELAY_ATIF_*` のエクスポーター用変数は、現在の設定方法ではなくなりました。

`hermes update` を実行すると、Hermes の `.env` にある、サポート対象の旧エクスポーター変数が移行されます。移行を自分で実行するには、次のコマンドを使います。

```bash
hermes migrate relay
```

すべてのプロファイルのホームを対象にするには、`hermes migrate relay --all-profiles` を使います。明示的なオーバーライドがまだ設定されていなければ、移行処理は生成した設定を検証し、`<hermes home>/relay-plugins.toml` を書き出し、そのプロファイルの `.env` にオーバーライドを設定して、古い変数をコメントアウトします。生成されたファイルはユーザー設定ファイルの代わりになりますが、システム設定は引き続き適用されます。Hermes を再起動して、出力を確認してください。

以前の Hermes プラグインのエントリーも `plugins.enabled` から削除してください。エクスポーターの移行では、この作業は行われません。手動で移行する場合は、エクスポーターの設定を `plugins.toml` に移します。[組み込みプラグインの移行に関する注記](/hermes/docs/user-guide/features/built-in-plugins/#nemo-relay-native-integration-migration-note)に、移行後の設定の完全な例が載っています。

## トラブルシューティング {#troubleshooting}

| 症状 | 確認すること |
|---|---|
| トレースファイルがない | `hermes doctor` を実行し、Relay の初期化に関する警告を確認したうえで、出力ディレクトリに書き込めることを確かめてください。オーバーライドを使っている場合は、指定したファイルが存在するかを確認してください。 |
| ファイルが想定外のディレクトリにある | 出力先の相対パスは、Hermes の作業ディレクトリが基準になります。サービスでは絶対パスを使ってください。 |
| レコードが重複している | 同じ UUID を持つ開始・終了のペアは正常です。開始や終了そのものが重複している場合は、追記モードで残った古い出力がないか、複数のエクスポーターが同じ出力先を指していないかを確認してください。 |
| Hermes は動くが Relay プラグインが動かない | 初期化に失敗しても、Hermes は止まらないことがあります。検証結果、プラグインの互換性、完全性、信頼ポリシー、起動時の警告を確認してください。 |
| 設定の変更が反映されない | その設定を使っている Hermes プロセスを再起動してください。あわせて、システム設定と、最初のプロファイルによるプロセス全体の設定も確認してください。 |
| ターンは表示されるが親セッションが表示されない | セッションスコープがまだ開いたままの可能性があります。セッションを通常どおり終了させるか、分割を設定してください。 |
| モデル呼び出しやツール呼び出しが記録されていない | 重なったターン、入れ子になった管理されたコールバック、エージェントのターン外で行われた処理、選択したプロバイダーのコーデック対応状況を確認してください。 |
| 想定外のリモートエクスポートが行われる | ユーザー設定・システム設定と、継承された `OTEL_EXPORTER_OTLP_*ENDPOINT` 変数を確認してください。Relay で明示的に指定したエンドポイントと自動エクスポートは併存できます。 |

さらに詳しく調べるには、新しい Hermes プロセスを起動する前に [Relay の運用ログ](https://docs.nvidia.com/nemo/relay/v0.11.1/reference/operational-logging)を有効にしてください。Relay の運用ログは、Relay がエクスポートする OpenTelemetry のログとは別のものです。

## 関連ドキュメント {#related-documentation}

- [Relay の可観測性](https://docs.nvidia.com/nemo/relay/v0.11.1/configure-plugins/observability/about)
- [Relay プラグインの開発](https://docs.nvidia.com/nemo/relay/v0.11.1/build-plugins/about)
- [Hermes の環境変数](/hermes/docs/reference/environment-variables/#nemo-relay)
- [Hermes のセッション](/hermes/docs/user-guide/sessions/)
- [Hermes の委任](/hermes/docs/user-guide/features/delegation/)