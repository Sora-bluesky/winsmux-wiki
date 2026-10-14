---
title: "従来型のゲートウェイクライアント"
description: "hermes chat と --cli がゲートウェイの権限主体に接続するしくみ"
upstream_path: developer-guide/gateway-classic-cli.md
upstream_blob: 448b7e33b2fe0e87daea284b846d3e53f3bf5ff4
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/gateway-classic-cli
---

# 従来型のゲートウェイクライアント（初期移行） {#classic-gateway-client-initial-migration}

通常の `hermes --cli`、`hermes chat`、`hermes chat -q '…' -Q`、トップレベルの
`hermes -z '…'` は、ゲートウェイの権限主体（authority）を使います。`cli.main` から直接チャットを起動した場合も、
ローカルのエージェントを組み立てる前に処理を引き渡します。ローカルでの立ち上げは、正規の
ensure ライフサイクルと使い捨ての非公開制御チケットを使い、サービスのインストールは行いません。
`HERMES_TUI_GATEWAY_URL` を明示した場合はリモート専用のままです。接続や
認証に失敗しても、代わりにローカルのゲートウェイを起動することはありません。

クライアントは、保存された `Session:` の ID を stderr に出力します。再開するには
`hermes --cli chat --resume ID` を実行します。入力は新しい `input_id` を付けて受け付けられ、イベントと
最終的な返答は権限主体から届きます。`/quit`、`/exit`、`/detach`、EOF、
ターミナルを閉じる操作は、どれも切り離すだけです。`/stop` は実行世代で区切った（fenced）
中断を送ります。承認待ちがあると `/approve ID once|deny|…` が表示され、確認の質問には
`/answer ID TEXT` で答えます。クライアントは、表示されたプロンプト ID と、それを受け取ったときの
世代をそのまま使い、ローカルで待機処理を組み立て直すことはしません。`/discard ID` は、オーナーの再起動をまたいで失われた
受付を確認済みとして扱います（`prompt.resolve_unknown`）。`/branch [title]`、
`/model <model> [--provider name]`、`/compress [here [N] | <focus>] [--preview]`
は、リビジョンで区切った `session.mutate` 操作です（`hermes_cli/gateway_mutations.py`）。
`/yolo [on|off]` は、このセッションの承認スキップをオーナー側で切り替えます（`config.set`
のキー `yolo`）。`/title [name]`（`session.mutate rename`）、`/undo [N]` と `/retry`
（`session.mutate rewind`。`/undo` は取り消したメッセージを入力欄に戻します）、
`/new [title]` / `/reset`（このセッションで固定された起動リクエストを使う `session.create`）、`/usage`（オーナーのレポートと最後に確定したターン）、`/tools`
（起動時のツールセット）は、表示側で動きます（`hermes_cli/gateway_chat_commands.py`）。それ以外の
コマンドはすべて `slash.exec` としてオーナーに送られます。確認済みの読み取り系コマンドはそこで実行され、
残りは `/x is not available on the shared gateway yet` と表示し、
[コマンド対応表](/hermes/docs/developer-guide/gateway-command-parity/)へのリンクを添えます。この表には、ローカルの
各クライアントがそれぞれのコマンドをどう扱うかが載っています。

ワンショット実行の stdout は最終的な返答で終わります。`-Q` を付けないと、再開したセッションはまず
保存済みの履歴（`user:` / `assistant:` の行）を表示し、返答のあとに
`Resume this session with:` のブロックが続きます（「起動オプション」を参照）。`-Q` を付けると返答だけを
表示します。終了ステータスは、受付が完了したとき 0、
実行や接続に失敗したとき 1、フロントエンドが対応していないオプションのとき 2、
対話的に接続し直す必要がある制御待ちがあるとき、またはゲートウェイのクラッシュでターンが失われたときに 3
（`hermes sessions discard <id> --yes` で解消します）、キーボード操作で切り離したとき 130 です。
制御待ちがあっても、キャンセルされたことにはなりません。`-z` は、
承認ポリシーを暗黙にスキップしなくなりました。

## 起動オプション {#launch-options}

ゲートウェイは、受け付ける作成パラメーターを `runtime.describe` で公開しています
（`session_create.parameters`。元は `gateway.session_policy.CREATE_FIELDS`）。クライアントは、
公開されている作成オプションだけを送ります。指定されたオプションを古い
ゲートウェイが公開していなければ、拒否されます（`Gateway does not support creation options:
…`）。呼び出し元の cwd は、公開されていれば送ります。cwd に対応していない古いゲートウェイでは、
設定済みの実行ディレクトリを使うという警告が表示されます。ただし `--in` を明示した場合は
拒否されます。再開のときは、そのセッションが固定されたときとまったく同じ作成フラグを繰り返し指定できます
（スクリプトが同じコマンドラインを再実行できるようにするためです）。固定されたルートを変えてしまうフラグは
拒否されます。

**受け付けられ、作成時にセッションへ固定されるもの**（`hermes_cli/gateway_chat.py` の
`_POLICY`）: `--model`、`--provider`、`--base-url`、`--api-key`
（メモリ上だけで保持し、保存しません）、`--reasoning`、`--toolsets`、`--max-turns`、
`--skills`（固定されるプロンプトに一度だけ展開されます）、`--checkpoints`、`--yolo`、
`--accept-hooks`（`HERMES_ACCEPT_HOOKS=1` も可）、`--pass-session-id`、
`--ignore-rules`、`--ignore-user-config` と `--safe-mode`（どちらも `--model` の明示が必要です。
セーフモードでは、プロファイルを一切読まない隔離ワーカーでターンを実行します）。ほかに受け付けるもの: `--source <label>`、`--resume <id-or-title>`、`-c <title>`、
`-c <title> --create-if-missing`、`--in <dir>`、`--query-file`、`--format
stream-json`、`-z ... --usage-file`、値なしの `-c`（このターミナルが最後に使ったセッション、
なければ最新の CLI セッション）、`--resume latest`（最新の CLI セッション。このワークスペースのものを優先。
どちらもオーナー側で解決され、`session.resume latest='cli'` になります）、
`--list-tools` / `--list-toolsets`（一覧を表示して終了し、セッションは作りません）。`-Q` なしの `chat -q`
は、main と同じ `Resume this session with: hermes --resume <id>` のブロックで終わります。

**終了ステータス 2 で拒否されるもの**（`_UNSUPPORTED` と、
`validate_options` の選択チェック）。エラーメッセージには、それぞれの機能がいまどこにあるかが示されます。

| オプション | 理由 | 代わりに使うもの |
|---|---|---|
| `-w` / `--worktree` | ワークツリーの作成は起動側の処理で、権限主体は公開していません | `hermes --tui -w` |
| `--image` | この経路には、クライアント側で添付ファイルを準備するしくみがありません | `hermes --tui` か Desktop で添付します |
| `--run-budget` | 作成時の取り決めに、起動ごとの実行予算がありません | config.yaml の `agent.run_budget_seconds` |
| `-v` / `--verbose` | 表示専用のオプションで、クライアントには詳細表示の仕組みがありません | `hermes logs --follow`（拒否メッセージは `hermes chat --tui -v` も挙げますが、正規の Ink 経路はまだこのフラグを引き継ぎません） |
| `--no-restore-cwd` | ゲートウェイはセッションに固定された cwd を保ちます | `--in <dir>` |
| `-c <name>` なしの `--create-if-missing` | 名前で作成する対象がありません | `-c <name> --create-if-missing` |

`--compact` は `hermes chat` のオプションではありません（argparse が拒否します）。`cli.main` から直接
引き渡した場合も拒否され、代わりに `display.compact` が示されます。

## 現時点での対応の限界 — 従来の CLI とは完全には同等でありません {#current-parity-limits-not-full-classic-cli-parity}

従来どおりの表示の完全な再現、スラッシュコマンド登録の同等性、対話的な
履歴編集、自動再接続、ACK を失ったときに備えるクライアント側の永続ジャーナル、リモートログインの
立ち上げ、停止中のオーナーからの再開、Windows/macOS のネイティブ QA は、まだ残っています。
クライアントは、明示されたリモート URL がもともと使っている認証方式をそのまま保ちます。
リモートの認証情報を取得したり発行したりはしません。

`tests/hermes_cli/test_gateway_chat_native.py` は、ネイティブの tmux/PTY 上で、従来型クライアントの
新規入力、切り離し、保存済み ID での再開、ワンショット実行を、通常のデーモン経由で確かめます。
その際、ループバックのモデル、隔離した HOME/HERMES_HOME、呼び出し元の cwd を使います。コンストラクターの
計測では、クライアント側に AIAgent、SessionDB、GatewayRunner が作られないことを記録します。このテストでは
さらに、無効な承認の選択を拒否したあと、接続し直して同意し、テスト用に用意した対象に対して実際の
ターミナル操作を起こします。古い制御・実行中の Stop のネイティブなテストと、
ネイティブな確認の質問のやり取りは、別の受け入れ作業として残っています。

2 つのチェックアウトの互換性を試すときは、対象を絞った pytest のオプション
プラグインを読み込み、使い捨てのゲートウェイ側のチェックアウトを指定します（通常のランナーの
密閉された環境は、任意の環境変数による上書きを意図的に取り除くためです）。

```sh
scripts/run_tests.sh -j 1 --file-retries 0 tests/hermes_cli/test_gateway_chat_native.py \
  -p tests.hermes_cli.gateway_client_options --client-test-runtime-root=/path/to/runtime-checkout
```

レシートには `caller_cwd_effect_verified` が明示的に出力されます。cwd に対応した
ランタイムでは、ネイティブクライアントがモデル・ツールセット・cwd を送信し、実際のターミナルが
実行ディレクトリを、テスト用に用意した一時的なレシートに書き込みます。古い
ランタイムでは、`--in` を明示するとその効果なしに拒否されなければなりません。後者を
cwd の同等性として数えないでください。クライアントとデーモンはどちらも隔離したテスト用ホームを使い、このオプションは
サービスをインストールしたり、選んだチェックアウトを変更したりしません。
