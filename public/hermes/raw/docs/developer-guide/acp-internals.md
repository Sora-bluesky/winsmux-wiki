---
title: "ACP の内部"
description: "ACP アダプタのしくみ — 起動から終了まで、セッション、イベントの橋渡し、承認、ツールの表示"
upstream_path: developer-guide/acp-internals.md
upstream_blob: e739d808711894e590d3c1fce02ff1472050611e
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/acp-internals
---

# ACP の内部 {#acp-internals}

ACP アダプタは、Hermes の同期で動く `AIAgent` を、非同期の JSON-RPC stdio サーバーで包んだものです。

実装の中心となるファイルは次のとおりです。

- `acp_adapter/entry.py`
- `acp_adapter/server.py`
- `acp_adapter/session.py`
- `acp_adapter/events.py`
- `acp_adapter/permissions.py`
- `acp_adapter/tools.py`
- `acp_adapter/auth.py`

## 起動の流れ {#boot-flow}

```text
hermes acp / hermes-acp / python -m acp_adapter
  -> acp_adapter.entry.main()
  -> parse --version / --check / --setup before server startup
  -> load ~/.hermes/.env
  -> configure stderr logging
  -> construct HermesACPAgent
  -> acp.run_agent(agent, use_unstable_protocol=True)
```

標準出力は ACP の JSON-RPC のやり取り専用です。人が読むログは標準エラー出力へ送られます。

## 主な構成要素 {#major-components}

### `HermesACPAgent` {#hermesacpagent}

`acp_adapter/server.py` が ACP のエージェントプロトコルを実装しています。

役割は次のとおりです。

- 初期化と認証
- セッションの新規作成・読み込み・再開・分岐・一覧・中止の各メソッド
- プロンプトの実行
- セッションのモデル切り替え
- 同期で動く AIAgent のコールバックを、ACP の非同期の通知につなぐこと

### `SessionManager` {#sessionmanager}

`acp_adapter/session.py` が、動いている ACP のセッションを管理します。

セッションごとに次を持ちます。

- `session_id`
- `agent`
- `cwd`
- `model`
- `history`
- `cancel_event`

このマネージャはスレッドセーフで、次の操作に対応します。

- 作成
- 取得
- 削除
- 分岐
- 一覧
- 片づけ
- 作業ディレクトリの更新

### イベントの橋渡し {#event-bridge}

`acp_adapter/events.py` が、AIAgent のコールバックを ACP の `session_update` イベントに変換します。

橋渡しされるコールバックは次のとおりです。

- `tool_progress_callback`
- `thinking_callback`（ACP の橋渡しでは今のところ `None` に設定されていて、推論の内容は `step_callback` を通して送られます）
- `step_callback`

`AIAgent` はワーカースレッドで動く一方、ACP の入出力はメインのイベントループにあるため、橋渡しには次を使います。

```python
asyncio.run_coroutine_threadsafe(...)
```

### 承認の橋渡し {#permission-bridge}

`acp_adapter/permissions.py` が、危険なターミナル操作の承認の問いかけを、ACP の許可の要求に合わせます。

対応は次のとおりです。

- `allow_once` -> Hermes の `once`
- `allow_always` -> Hermes の `always`
- 拒否の選択肢 -> Hermes の `deny`

待ち時間切れと橋渡しの失敗は、既定で拒否になります。

### ツールの表示を助けるしくみ {#tool-rendering-helpers}

`acp_adapter/tools.py` が、Hermes のツールを ACP のツールの種類に対応づけ、エディタに見せる内容を組み立てます。

例を挙げます。

- `patch` / `write_file` -> ファイルの差分
- `terminal` -> シェルのコマンドの文字列
- `read_file` / `search_files` -> テキストの下読み
- 大きな結果 -> 画面が壊れないよう切り詰めたテキストの塊

## セッションの一生 {#session-lifecycle}

```text
new_session(cwd)
  -> create SessionState
  -> create AIAgent(platform="acp", enabled_toolsets=["hermes-acp"])
  -> bind task_id/session_id to cwd override

prompt(..., session_id)
  -> extract text from ACP content blocks
  -> reset cancel event
  -> install callbacks + approval bridge
  -> run AIAgent in ThreadPoolExecutor
  -> update session history
  -> emit final agent message chunk
```

### 中止 {#cancelation}

`cancel(session_id)` は次のように動きます。

- セッションの中止イベントを立てる
- 使えるときは `agent.interrupt()` を呼ぶ
- プロンプトの応答が `stop_reason="cancelled"` を返すようにする

### 分岐 {#forking}

`fork_session()` は、メッセージの履歴を深くコピーして新しいセッションを作ります。会話の状態はそのまま引き継ぎつつ、分岐した側には独自のセッション ID と作業ディレクトリを与えます。

## プロバイダと認証の扱い {#providerauth-behavior}

ACP は独自の認証情報の保管場所を持ちません。

代わりに、Hermes の実行時の解決のしくみをそのまま使います。

- `acp_adapter/auth.py`
- `hermes_cli/runtime_provider.py`

そのため ACP は、今 Hermes に設定されているプロバイダと認証情報を、そのまま告知して使います。加えて、ターミナルでのセットアップという認証方法（`hermes-setup`、引数は `--setup`）を常に告知するので、初めて使う ACP のクライアントは、通常の ACP セッションを始める前に Hermes の対話式のモデル・プロバイダ設定を開けます。

## 作業ディレクトリの結びつけ {#working-directory-binding}

ACP のセッションは、エディタ側の作業ディレクトリを持ちます。

セッションマネージャは、その作業ディレクトリを、タスク単位のターミナル・ファイルの上書き設定を通して ACP のセッション ID に結びつけます。これにより、ファイルとターミナルのツールはエディタの作業場所を基準に動きます。

## 同じ名前のツールが重なって呼ばれるとき {#duplicate-same-name-tool-calls}

イベントの橋渡しは、ツール ID をツール名ごとに先入れ先出しで管理します。名前ごとに 1 つだけ持つのではありません。これは次の場合に効いてきます。

- 同じ名前のツールが並行して呼ばれるとき
- 1 つのステップで同じ名前のツールが繰り返し呼ばれるとき

先入れ先出しの待ち行列がないと、完了のイベントが別の呼び出しに結び付いてしまいます。

## 承認コールバックの復元 {#approval-callback-restoration}

ACP は、プロンプトの実行中だけターミナルのツールに承認のコールバックを差し込み、終わったら元のコールバックに戻します。これにより、ACP のセッション固有の承認の処理が、いつまでも全体に居座ることを防ぎます。

## 今のところの制限 {#current-limitations}

- ACP のセッションは共有の `~/.hermes/state.db`（SessionDB）に保存され、プロセスを再起動しても自動で戻ります。`session_search` にも出てきます
- テキスト以外のプロンプトの塊は、今のところ本文の取り出しでは無視されます
- エディタごとの使い勝手は、ACP クライアントの実装によって変わります

## 関連するファイル {#related-files}

- `tests/acp/` — ACP のテスト一式
- `toolsets.py` — `hermes-acp` ツールセットの定義
- `hermes_cli/main.py` — `hermes acp` のサブコマンド
- `pyproject.toml` — `[acp]` の追加依存と `hermes-acp` のスクリプト
