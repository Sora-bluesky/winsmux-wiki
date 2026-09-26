---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "CLIコマンド一覧"
description: "Hermes ターミナルコマンドとコマンドファミリーの正式な一覧"
upstream_path: reference/cli-commands.md
upstream_blob: a2f81b1724a8e4307972c21835413f24428152ec
sources:
  - https://hermes-agent.nousresearch.com/docs/reference/cli-commands
---

# CLIコマンド一覧 {#cli-commands-reference}

このページの Python の依存関係のコマンドは、
[PM で準備したソースのチェックアウト](/hermes/docs/reference/package-management/#developer-workflow)で実行する前提です。
依存関係を変えたら、チェックアウトを有効化し直して Hermes を再起動してください。

このページでは、シェルから実行する**ターミナルコマンド**について説明します。

チャット内で使うスラッシュコマンドについては、[スラッシュコマンド一覧](/hermes/docs/reference/slash-commands/)を参照してください。

## グローバルエントリポイント {#global-entrypoint}

```bash
hermes [global-options] <command> [subcommand/options]
```

### グローバルオプション {#global-options}

| オプション | 説明 |
|--------|-------------|
| `--version`, `-V` | バージョンを表示して終了します。 |
| `--profile <name>`, `-p <name>` | この呼び出しで使う Hermes プロファイルを選びます。`hermes profile use` で設定した既定値を上書きします。 |
| `--resume <session>`, `-r <session>` | ID またはタイトルで以前のセッションを再開します。キーワード `latest` は最新のセッションを再開します（ワークスペース単位で、`-c` と同じ検索方法です）。 |
| `--continue [name]`, `-c [name]` | 最新のセッション、またはタイトルが一致する最新のセッションを再開します。 |
| `--in <dir>` | 開始・再開の前に `<dir>` に移動します。`--resume latest` / `-c` の検索をそのディレクトリのワークスペースに絞り込み、セッションをそこに留めます（記録された cwd への復元をスキップします）。 |
| `--worktree`, `-w` | 並列エージェント運用向けに、独立した git worktree で開始します。 |
| `--yolo` | 危険なコマンドの承認プロンプトをバイパスします。 |
| `--pass-session-id` | エージェントのシステムプロンプトにセッション ID を含めます。 |
| `--ignore-user-config` | `~/.hermes/config.yaml` を無視し、組み込みの既定値にフォールバックします。`.env` の認証情報は読み込まれたままです。 |
| `--ignore-rules` | `AGENTS.md`、`SOUL.md`、`.cursorrules`、メモリ、プリロード済みスキルの自動注入をスキップします。 |
| `--tui` | 従来の CLI ではなく [TUI](/hermes/docs/user-guide/tui/) を起動します。`HERMES_TUI=1` と同等です。`display.interface` より常に優先されます。 |
| `--cli` | 従来の prompt_toolkit REPL を強制します。1回の実行だけ `display.interface: tui` を上書きするために使います。 |
| `--dev` | `--tui` と併用: プリビルドされたバンドルの代わりに `tsx` で TypeScript ソースを直接実行します（TUI 開発者向け）。 |

### `hermes-agent`（旧来の単発クエリ用ランナー） {#hermes-agent-legacy-single-query-runner}

インストールすると `hermes-agent` も入ります。クエリを 1 つ送って終了するだけの最小限のランナーで、`hermes-agent --query "summarize README.md"`（または `hermes-agent "summarize README.md"`）のように使います。`hermes-agent --help` はオプション（`--model`、`--base-url`、`--max-turns`、`--enabled-toolsets`、`--disabled-toolsets`、`--list-tools`、`--save-trajectories` など）を一覧表示し、`hermes-agent --version` はバージョンを表示します。どちらもエージェントは起動しません。クエリを付けずに実行すると、同じヘルプを表示して終了します。それ以外の用途には `hermes` を使ってください（スクリプトから単発で実行するなら `hermes -z <prompt>` です）。

## トップレベルコマンド {#top-level-commands}

| コマンド | 用途 |
|---------|------|
| `hermes chat` | エージェントとの対話または one-shot チャット。 |
| `hermes model` | デフォルトのプロバイダとモデルを対話的に選びます。 |
| `hermes moa` | モデルピッカーから選べる、名前付きの Mixture of Agents プリセットを設定します。 |
| `hermes fallback` | プライマリモデルがエラーになったときに試すフォールバックプロバイダを管理します。 |
| `hermes gateway` | メッセージングゲートウェイサービスを実行・管理します。 |
| `hermes proxy` | OAuth プロバイダの認証情報を付与するローカルの OpenAI 互換プロキシです。[Subscription Proxy](/hermes/docs/user-guide/features/subscription-proxy/) を参照してください。 |
| `hermes egress` | リモートのターミナルサンドボックス向けの、送信方向の認証情報注入ファイアウォール（iron-proxy）です。既定では無効です。[Egress proxy](/hermes/docs/user-guide/egress/iron-proxy/) を参照してください。 |
| `hermes lsp` | Language Server Protocol 連携を管理します（write_file/patch 用のセマンティック診断）。 |
| `hermes setup` | 設定の全部または一部を対話的に行うセットアップウィザードです。 |
| `hermes whatsapp` | WhatsApp ブリッジを設定・ペアリングします。 |
| `hermes whatsapp-cloud` | 公式の Meta WhatsApp Business Cloud API アダプタを設定します（Business アカウントと公開 webhook が必要）。`hermes whatsapp`（Baileys の個人アカウントブリッジ）とは別物です。 |
| `hermes slack` | Slack 用のヘルパー（現状: すべてのコマンドをネイティブなスラッシュコマンドとして持つ app manifest を生成）。 |
| `hermes auth` | 認証情報の管理 — 追加・一覧・削除・リセット・状態確認・ログアウト。Codex/Nous/Anthropic の OAuth フローを扱います。 |
| `hermes login` / `logout` | **非推奨** — 代わりに `hermes auth` を使ってください。 |
| `hermes send` | 設定済みのメッセージングプラットフォーム（Telegram, Discord, Slack, Signal, SMS など）へ one-shot メッセージを送信します。シェルスクリプト・cron ジョブ・CI フック・監視デーモンから便利に使えます — エージェントループも LLM も使いません。 |
| `hermes peer` | 他のマシンの peer Hermes ゲートウェイを登録し、そのエージェントの正規の Bot Chat に DM を送ります（`hermes peer dm <peer>[/<agent>] "…"`）。マシン間の bot-to-bot メッセージングを支える transport です。 |
| `hermes secrets` | `~/.hermes/.env` の代わりに、プロセス起動時に API キーを外部シークレットソース（現状 Bitwarden Secrets Manager）から取得できるよう管理します。 |
| `hermes migrate` | 廃止されたモデルや非推奨の設定への参照を診断し、（オプションで）`config.yaml` を書き換えます（例: `migrate xai`）。 |
| `hermes codex-runtime` | `/codex-runtime` の非対話版: `migrate [--dry-run] [--json]` は選択したプロファイル向けに `~/.codex/config.toml` の Hermes 管理ブロックを再生成します。[Codex app-server runtime](/hermes/docs/user-guide/features/codex-app-server-runtime/#running-the-migration-from-a-script) を参照してください。 |
| `hermes status` | エージェント・認証・プラットフォームの状態を表示します。 |
| `hermes usage` | セッションなしで、設定済みアカウントのレートリミットウィンドウ（`/usage` ブロック相当）を表示します。スクリプト向けの `--json` もあります。 |
| `hermes cron` | cron スケジューラを確認・実行します。 |
| `hermes pause` / `hermes resume` | グローバルな緊急停止です: resume するまで、新規の cron 発火（組み込みティッカー・管理 cron webhook・ミスファイア救済）・kanban ディスパッチ・ゲートウェイターンが一切開始しません。進行中の作業は決して強制終了されません。 |
| `hermes kanban` | マルチプロファイルのコラボレーションボード（タスク・リンク・ディスパッチャ）。 |
| `hermes project` | 名前付きのマルチフォルダワークスペース（プロジェクト）を管理します。デスクトップのセッショングルーピングの基点となり、kanban ボードに紐付いている場合はタスクに決定的な worktree + ブランチ規則を与えます。状態はプロファイル単位です。 |
| `hermes webhook` | イベント駆動での起動用に、動的な webhook サブスクリプションを管理します。 |
| `hermes hooks` | `config.yaml` で宣言されたシェルスクリプトフックを確認・承認・削除します。 |
| `hermes doctor` | 設定と依存関係の問題を診断します。 |
| `hermes security audit` | venv・プラグインの依存関係・ピン留めされた MCP サーバーに対するオンデマンドのサプライチェーン監査（OSV.dev）です。 |
| `hermes approvals` | 承認プロンプト用のツール — 承認履歴からアローリスト案を作ります。 |
| `hermes dump` | サポート/デバッグ用に、コピペできるセットアップ概要を出します。 |
| `hermes prompt-size` | システムプロンプト + ツールスキーマ（スキル索引・メモリ・プロファイル）のバイト内訳を表示します。オフラインで動作します。 |
| `hermes debug` | デバッグ用ツール — サポート向けにログとシステム情報をアップロードします。 |
| `hermes backup` | Hermes のホームディレクトリを zip ファイルにバックアップします。 |
| `hermes checkpoints` | `~/.hermes/checkpoints/`（`/rollback` が使うシャドウストア）を確認・整理・クリアします。引数なしで実行すると状態概要が出ます。 |
| `hermes import` | zip ファイルから Hermes のバックアップを復元します。 |
| `hermes logs` | エージェント/ゲートウェイ/エラーのログファイルを表示・追跡・フィルタします。 |
| `hermes config` | 設定ファイルの表示・編集・移行・照会を行います。 |
| `hermes skin` | 表示スキンを一覧・切り替え・調整します。 |
| `hermes console` | 安全な Hermes コマンドコンソールを開きます。 |
| `hermes pairing` | メッセージングのペアリングコードを承認・取り消しします。 |
| `hermes skills` | スキルの参照・インストール・公開・監査・設定を行います。 |
| `hermes bundles` | 複数のスキルを1つの `/<name>` スラッシュコマンドにまとめます。[Skill Bundles](/hermes/docs/user-guide/features/skills/#skill-bundles) を参照してください。 |
| `hermes curator` | バックグラウンドでのスキル整備 — 状態確認・実行・一時停止・ピン留め。[Curator](/hermes/docs/user-guide/features/curator/) を参照してください。 |
| `hermes journey`（別名 `learning`, `memory-graph`） | 学習したスキル + メモリの時系列タイムラインです。 |
| `hermes memory` | 外部メモリプロバイダを設定します。プラグイン固有のサブコマンド（例: `hermes honcho`）は、そのプロバイダが有効なときに自動的に登録されます。 |
| `hermes acp` | エディタ連携用に、Hermes を ACP サーバーとして実行します。 |
| `hermes mcp` | MCP サーバー設定を管理し、Hermes を MCP サーバーとして実行します。 |
| `hermes plugins` | Hermes Agent のプラグインを管理します（インストール・有効化・無効化・削除）。 |
| `hermes portal` | Nous Portal の状態・サブスクリプションリンク・Tool Gateway ルーティングです。[Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/) を参照してください。 |
| `hermes tools` | プラットフォームごとに有効なツールを設定します。 |
| `hermes computer-use` | Computer Use（cua-driver）バックエンドをインストールまたは確認します（macOS/Windows/Linux）。 |
| `hermes pets` | CLI・TUI・デスクトップアプリ全体に表示される [petdex](/hermes/docs/user-guide/features/pets/) のアニメーションペットを参照・インストール・選択します。サブコマンド: `list`, `install`, `select`, `show`, `off`, `scale`, `remove`, `doctor`。 |
| `hermes sessions` | セッションの参照・エクスポート・整理・リネーム・削除を行います。 |
| `hermes insights` | トークン/コスト/アクティビティの分析を表示します。 |
| `hermes claw` | OpenClaw 移行用のヘルパーです。 |
| `hermes import-agent` | Claude Code（`~/.claude`）または Codex CLI（`~/.codex`）のセットアップをインポートします。 |
| `hermes dashboard` | 設定・API キー・セッションを管理するための Web ダッシュボードを起動します。 |
| `hermes serve` | Hermes バックエンドサーバーを起動します（ヘッドレス。デスクトップアプリとリモートバックエンドを支えます）。 |
| `hermes desktop`（別名 `gui`） | ネイティブの Electron デスクトップアプリをビルド・起動します。 |
| `hermes profile` | プロファイルを管理します — 複数の独立した Hermes インスタンス。 |
| `hermes completion` | シェル補完スクリプトを表示します（bash/zsh/fish）。 |
| `hermes --version` | バージョン情報を表示します。 |
| `hermes update` | 最新のコードを取得して依存関係を再インストールします。`--check` はインストールせずに事前確認、`--backup` は pull 前の `HERMES_HOME` のスナップショットを取得します。 |
| `hermes uninstall` | システムから Hermes を削除します。 |

## `hermes chat` {#hermes-chat}

```bash
hermes chat [options]
```

共通オプション:

| オプション | 説明 |
|--------|-------------|
| `-q`, `--query "..."` | セッションにプロンプトを渡します。実際の TTY 上では、プロンプトは通常の対話セッションの最初のターンとして**そのまま**送信され（スラッシュコマンドや `!` シェルエスケープとして解釈されることはありません）、セッションは開いたままになります — OS のランチャーやデスクトップ連携に向いています。`--oneshot`、`-Q`、または非 TTY の標準入出力では、回答して終了します。 |
| `--query-file PATH` | クエリをファイルから読み込みます（`-` は stdin）。シェル展開が一切行われないため、引用符・`$(...)`・バッククォートはそのまま渡ります — プログラムからの呼び出しや信頼できないメッセージ本文にはこちらを使います（Bot Mode のチームメイト DM もこれを使います）。`-q` とは併用できません。 |
| `--oneshot` | `-q`/`--query-file` と併用: 対話セッションを開始する代わりに、クエリに回答して終了します（0.21 より前の単一クエリの挙動）。非 TTY の標準入出力と `-Q` では暗黙に有効になります。 |
| `-m`, `--model <model>` | この実行だけモデルを上書きします。 |
| `-t`, `--toolsets <csv>` | カンマ区切りのツールセットを有効にします。 |
| `--provider <provider>` | プロバイダを強制します: `auto`, `openrouter`, `nous`, `openai-codex`（別名 `chatgpt`, `chatgpt-codex`）, `copilot-acp`, `copilot`, `anthropic`, `gemini`, `huggingface`, `novita`（別名 `novita-ai`, `novitaai`）, `openai-api`, `zai`, `kimi-coding`, `kimi-coding-cn`, `minimax`, `minimax-cn`, `minimax-oauth`, `kilocode`, `xiaomi`, `arcee`, `gmi`, `upstage`（別名 `solar`）, `alibaba`, `alibaba-cn`, `alibaba-coding-plan`（別名 `alibaba_coding`）, `alibaba-coding-plan-cn`, `alibaba-token-plan`, `alibaba-token-plan-cn`, `deepseek`, `nvidia`, `ollama-cloud`, `xai`（別名 `grok`）, `xai-oauth`（別名 `grok-oauth`）, `qwen-oauth`, `bedrock`, `opencode-zen`, `opencode-go`, `commandcode`, `commandcode-anthropic`, `ai-gateway`, `azure-foundry`, `lmstudio`, `stepfun`, `tencent-tokenhub`（別名 `tencent`, `tokenhub`）, `router`（別名 `ramp-router`, `ramp`）, `nebius-token-factory`（別名 `nebius`, `nebius-tf`, `tokenfactory`）, `tencent-tokenplan`（別名 `tokenplan`, `tencent-lkeap`）。 |
| `-s`, `--skills <name>` | セッション用に1つ以上のスキルをプリロードします（繰り返し指定可、カンマ区切りも可）。 |
| `-v`, `--verbose` | 詳細な出力です。 |
| `-Q`, `--quiet` | プログラム向けモード: バナー/スピナー/ツールプレビューを抑制します。 |
| `--format stream-json` | `-q` / `--query` の呼び出しに対して構造化された JSONL を出力します。暗黙に `--quiet` になり、`--tui` とは併用できません。 |
| `--image <path>` | 1回のクエリにローカル画像を添付します。 |
| `--resume <session>` / `--continue [name]` | `chat` から直接セッションを再開します。 |
| `--worktree` | この実行用に独立した git worktree を作成します。 |
| `--checkpoints` | 破壊的なファイル変更の前にファイルシステムチェックポイントを有効にします。 |
| `--yolo` | 承認プロンプトをスキップします。 |
| `--pass-session-id` | システムプロンプトにセッション ID を渡します。 |
| `--ignore-user-config` | `~/.hermes/config.yaml` を無視し、組み込みの既定値を使います。`.env` の認証情報は読み込まれたままです。分離された CI 実行・再現可能なバグ報告・サードパーティ連携に便利です。 |
| `--ignore-rules` | `AGENTS.md`、`SOUL.md`、`.cursorrules`、永続メモリ、プリロード済みスキルの自動注入をスキップします。完全に分離された実行にするには `--ignore-user-config` と組み合わせます。 |
| `--safe-mode` | トラブルシューティングモード: すべてのカスタマイズ（ユーザー設定、ルール/メモリの注入、プラグイン、シェルフック、MCP サーバー）を無効化します（`--ignore-user-config` と `--ignore-rules` を暗黙に含みます）。問題が自分のセットアップ由来か Hermes 自体の問題かを切り分けるために使います。 |
| `--source <tag>` | フィルタ用のセッションソースタグ（既定: `cli`。one-shot 実行は既定で `oneshot` となり、ピッカーには表示されません）。ユーザーのセッション一覧に出したくないサードパーティ連携には `tool` を使います。明示的な `--source` は、TUI やデスクトップのセッション内から起動した one-shot 実行でも、指定どおりに保存されます。 |
| `--max-turns <N>` | 1つの会話ターンあたりの最大ツール呼び出し回数（既定: 500、または設定の `agent.max_turns`）。 |

例:

```bash
hermes
hermes chat -q "Summarize the latest PRs"          # seeds an interactive session
hermes chat --oneshot -q "Summarize the latest PRs"  # answer and exit
hermes chat --provider openrouter --model anthropic/claude-sonnet-4.6
hermes chat --toolsets web,terminal,skills
hermes chat --quiet -q "Return only JSON"
hermes chat -q "Inspect this repository" --format stream-json
hermes chat --worktree -q "Review this repo and open a PR"
hermes chat --ignore-user-config --ignore-rules -q "Repro without my personal setup"
hermes chat --safe-mode -q "Is this bug mine or Hermes'?"
```

### `--format stream-json` — 構造化 JSONL 出力 {#--format-stream-json-structured-jsonl-output}

プログラムが端末出力をスクレイピングせずに進捗を取得したいときは `--format stream-json` を使います。`-q` / `--query`（または `--query-file`）が必須で、暗黙に quiet な非対話 CLI モードになり、明示的な `--tui` 指定は拒否されます。stdout の各行は1つの JSON オブジェクトで、診断情報と `session_id:` 行は stderr に残ります。

```bash
hermes chat -q "Summarize this repository" --format stream-json
```

すべてのイベントは `timestamp`（Unix エポックミリ秒）を持ちます。

| イベント `type` | フィールド |
|---|---|
| `system` | `subtype: "init"`, `model`, `session_id` |
| `text` | `text` — ストリーミングされるアシスタントのテキスト差分 |
| `tool_use` | `name`；ツール引数が取得できたときは `input` |
| `tool_result` | `name`, `output`（5000 文字で上限）, `duration_ms`, `is_error` |
| `result` | `session_id`, `exit_code`, `text`, `tokens`（`input`, `output`, `total`, `cache_read`, `cache_write`）, `duration_ms`；ターンが失敗したときは `error` |

会話が始まると、その終端のレコードは常に `result` です — Ctrl-C で中断された場合の `exit_code: 130` も含みます。このレコードを完了信号として扱ってください。プロセスの終了コードはその `exit_code` と一致します。

#### one-shot 実行の終了コード {#exit-codes-for-one-shot-runs}

chat が回答して終了する場合（`-Q`、`chat --oneshot`、または非 TTY の標準入出力でのクエリ）、プロセスの終了コードは quiet／非 quiet のどちらの経路でもターンの結果を表します: `0` はターンが完了、`1` は失敗した・途中で止まった（`partial`）・イテレーション予算に達した・一度も実行されなかった（認証情報/エージェント初期化の失敗）、`130` は中断されたことを示します。Kanban ディスパッチャが起動したワーカー（`HERMES_KANBAN_TASK` が設定されている）のターンが、プロバイダのレートリミット・過負荷・5xx・タイムアウト・課金/クォータの上限だけを理由に失敗した場合は `75`（`EX_TEMPFAIL`）で終了し、ディスパッチャは失敗を数えずにタスクを再キューします。`--format stream-json` を使う場合、終端の `result` レコードも同じ `exit_code` を持ちます。

#### 有限の chat 実行での委任 {#delegation-in-finite-chat-runs}

chat が回答して終了する場合（`-Q`、`chat --oneshot`、または非 TTY の標準入出力でのクエリ）、`delegate_task` はその子タスクの完了を待ち、結果を同じターンで親に返します。バッチの子タスクは `delegation.max_concurrent_children` の範囲内で並列実行されたままです。親は CLI が終了する前の最終応答でその結果を使えます。

- **自動的な join:** オプトインや背景モードの上書きは不要です。対話的な TTY のチャットとメッセージングセッションは、これまでどおりバックグラウンドでの委任を維持します。
- **既存の安全策:** 委任の上限・タイムアウト・キャンセル・`approvals.single_query_mode` はそのまま適用されます。join してもコマンドが自動承認されるわけではなく、子タスクの成功も保証されません。結果とアーティファクトは確認してください。
- **ターミナル完了:** これはバックグラウンドのターミナル通知の挙動や、上限付きの `terminal.oneshot_completion_wait_seconds` の終了待機を変えません。この設定は委任のタイムアウトではありません。

委任はプロセスローカルのままです。親を中断・終了させると、未完了の子タスクはキャンセルされる場合があります。開始したプロセスより長く存続する必要がある作業には、永続的なスケジューラを使ってください。

### `hermes -z <prompt>` — スクリプト向け one-shot {#hermes--z-prompt-scripted-one-shot}

プログラムからの呼び出し（シェルスクリプト、CI、cron、プロンプトをパイプで渡す親プロセス）向けに、`hermes -z` は最も純粋な one-shot エントリポイントです。**1つのプロンプトを渡すと、最終的な応答テキストだけが返り、stdout・stderr にはそれ以外は何も出ません。** バナーもスピナーもツールプレビューも `Session:` 行もなく、エージェントの最終的な返答がプレーンテキストで返るだけです。

```bash
hermes -z "What's the capital of France?"
# → Paris.

# Parent scripts can cleanly capture the response:
answer=$(hermes -z "summarize this" < /path/to/file.txt)
```

実行ごとの上書き（`~/.hermes/config.yaml` への変更なし）:

| フラグ | 相当する環境変数 | 用途 |
|---|---|---|
| `-m` / `--model <model>` | `HERMES_INFERENCE_MODEL` | この実行だけモデルを上書き |
| `--provider <provider>` | _(なし)_ | この実行だけプロバイダを上書き |
| `--usage-file <path>` | _(なし)_ | 実行後に JSON の使用状況レポートを書き出す（下記参照） |

```bash
hermes -z "…" --provider openrouter --model openai/gpt-5.5
# or:
HERMES_INFERENCE_MODEL=anthropic/claude-sonnet-4.6 hermes -z "…"
```

同じエージェント、同じツール、同じスキル — 対話的・装飾的なレイヤーだけを取り除きます。トランスクリプトにツールの出力も残したい場合は、代わりに `hermes chat --oneshot -q` を使ってください。`-z` は明確に「最終的な回答だけが欲しい」ためのものです。

終了コード: `0` はターン完了。`2` は失敗または途中で止まった場合（`partial`、イテレーション予算、`completed: false`）— 説明が出力されていた場合も含みます。`130` は中断。`1` は完了したターンがテキストを一切生成しなかった場合。`2` は実行開始前の使用エラー（不正なフラグ）でも使われます。これらのコードは、上の `chat -q`/`-Q`（失敗/partial/予算超過で `1`、テキストなしの完了で `0` を返す）とは意図的に異なります: `-z` は「何も回答しなかった」ために `1` を予約しています。実行の判定は終了コード（または `--usage-file` のフラグ）で行い、stdout が空でないかどうかでは判定しないでください。

#### `--usage-file` — パイプライン向け JSON 使用状況レポート {#--usage-file-json-usage-report-for-pipelines}

`hermes -z "…" --usage-file /path/report.json` は、実行後に機械可読な使用状況レポートを書き出します: `estimated_cost_usd`、`input_tokens` / `output_tokens` / `cache_read_tokens` / `cache_write_tokens` / `reasoning_tokens` / `total_tokens`、`api_calls`、`model`、`provider`、`session_id`、`service_tier`、`completed` / `failed` / `partial` / `interrupted` の各フラグ、そして `turn_exit_reason`（`completed` が false になった理由、例: `max_iterations_reached(3/3)`）。これらのトップレベルのカウンタは**メインのエージェントループ**だけを対象にしています。同じ実行内で行われる補助的な LLM 呼び出し（タイトル生成、vision、コンテキスト圧縮、`web_extract`、バックグラウンドレビューなど）は `auxiliary` の下に別途レポートされます — 同じ合計値とタスク別の `by_task` マップです — そして `total_including_auxiliary`（`estimated_cost_usd`、`total_tokens`、`api_calls`）が課金対象の総計です。このレポートは**実行が失敗した場合でも**書き出されるため、バッチパイプラインは常に費用を追跡できます。`-z`/`--oneshot` の外では何も影響せず、使用状況の書き出しが壊れても実行自体の結果を隠すことはありません。

```bash
hermes -z "summarize this repo" --usage-file ~/.hermes/cache/scratch/usage.json
jq .total_including_auxiliary.estimated_cost_usd ~/.hermes/cache/scratch/usage.json
jq .auxiliary.by_task ~/.hermes/cache/scratch/usage.json      # what did title generation / vision cost?
```

## `hermes model` {#hermes-model}

プロバイダ + モデルの対話型セレクタです。**新しいプロバイダの追加、API キーのセットアップ、OAuth フローの実行を行うコマンドです。** 実行中の Hermes チャットセッションの中ではなく、ターミナルから実行してください。

```bash
hermes model
```

次のような場合に使います:
- **新しいプロバイダを追加する**（OpenRouter、Anthropic、Copilot、DeepSeek、カスタムなど）
- OAuth 対応のプロバイダにログインする（Anthropic、Copilot、Codex、Nous Portal）
- API キーを入力・更新する
- プロバイダ固有のモデル一覧から選ぶ
- カスタム/自前ホストのエンドポイントを設定する
- 新しい既定値を設定に保存する

:::warning hermes model と /model — 違いを知っておく
**`hermes model`**（Hermes セッションの外、ターミナルから実行）は**フルのプロバイダセットアップウィザード**です。新しいプロバイダの追加、OAuth フローの実行、API キーの入力、エンドポイントの設定ができます。

**`/model`**（Hermes チャットセッション内で入力）は、**すでに設定済みのプロバイダとモデルの間を切り替える**ことしかできません。新しいプロバイダの追加、OAuth の実行、API キーの入力はできません。

**新しいプロバイダを追加したい場合:** まず Hermes セッションを終了し（`Ctrl+C` または `/quit`）、ターミナルのプロンプトから `hermes model` を実行してください。
:::

### `/model` スラッシュコマンド（セッション中） {#model-slash-command-mid-session}

セッションを離れずに、設定済みのモデル間を切り替えます:

```
/model                              # Show current model and available options
/model claude-sonnet-4              # Switch model (auto-detects provider)
/model zai:glm-5                    # Switch provider and model
/model custom:qwen-2.5              # Use model on your custom endpoint
/model custom                       # Auto-detect model from custom endpoint
/model custom:local:qwen-2.5        # Use a named custom provider
/model openrouter:anthropic/claude-sonnet-4  # Switch back to cloud
```

既定では、`/model` の変更は**現在のセッションだけ**に適用されます。`--global` を付けると、変更を `config.yaml` に永続化できます（あるいは `model.persist_switch_by_default: true` を設定すると、すべての切り替えが永続化されます）:

```
/model claude-sonnet-4 --global     # Switch and save as new default
```

:::info OpenRouter のモデルしか見えない場合
OpenRouter しか設定していない場合、`/model` には OpenRouter のモデルしか表示されません。他のプロバイダ（Anthropic、DeepSeek、Copilot など）を追加するには、セッションを終了してターミナルから `hermes model` を実行してください。
:::

`--global` での切り替え時には、プロバイダとベース URL の変更もモデルとともに `config.yaml` に永続化されます。カスタムエンドポイントから切り替える際は、古くなったベース URL が消去され、他のプロバイダに漏れ込むのを防ぎます。

## `hermes gateway` {#hermes-gateway}

```bash
hermes gateway <subcommand>
```

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `run` | ゲートウェイをフォアグラウンドで実行します。WSL、Docker、Termux ではこちらを推奨します。 |
| `start` | インストール済みの systemd/launchd バックグラウンドサービスを起動します。 |
| `stop` | サービス（またはフォアグラウンドプロセス）を停止します。 |
| `restart` | サービスを再起動します。 |
| `status` | サービスの状態を表示します。 |
| `list` | **すべてのプロファイル**を一覧し、各プロファイルのゲートウェイが現在実行中かどうかを表示します（可能な場合は PID も）。複数のプロファイルを並行して動かし、一括で状況を確認したいときに便利です。 |
| `install` | systemd（Linux）または launchd（macOS）のバックグラウンドサービスとしてインストールします。 |
| `uninstall` | インストール済みのサービスを削除します。 |
| `setup` | メッセージングプラットフォームの対話的セットアップです。 |
| `migrate` | プロファイルごとの単独ゲートウェイを1つのホストゲートウェイに統合します（`--multiplex`、唯一のモードです — `hermes update` は実際の境界がブロックしない限り自動的に実行します）。再実行すると、途中まで移行済みのホストが収束します。ディスク上のマニフェストは再開用の記録であり、ロールバック用ではありません（`--standalone` はありません）。プリフライトチェック（bot トークンの重複、`/p/<profile>/` の ingress を持たないセカンダリのポートバインダー）を実行し、ブロックされた場合は何も変更しません。フラグ: `--dry-run`, `-y`/`--yes`。[Migrating from per-profile gateways](/hermes/docs/user-guide/multi-profile-gateways/#migrating-from-per-profile-gateways) を参照してください。 |
| `migrate-legacy` | リネーム前のインストールから残った古い `hermes.service` ユニットを削除します。プロファイル単位のユニット（`hermes-gateway-<profile>.service`）や関係のないサービスは一切触れません。フラグ: `--dry-run`, `-y`/`--yes`。 |
| `enroll` | 実験的機能: このゲートウェイを relay コネクタに登録し、コネクタ対応プラットフォーム用の relay 認証情報を保存します。[Hermes Relay](/hermes/docs/user-guide/messaging/relay/) を参照してください。 |

オプション:

| オプション | 説明 |
|--------|-------------|
| `--all` | `start` / `restart` / `stop` において: 現在アクティブな `HERMES_HOME` だけでなく、**すべてのプロファイル**のゲートウェイに対して操作します。複数のプロファイルを並行運用していて、`hermes update` の後にまとめて再起動したいときに便利です。 |
| `--no-supervise` | `run` において: s6-overlay の Docker イメージ内で、自動監視をオプトアウトし、s6 以前のフォアグラウンド動作にします — ゲートウェイはコンテナのメインプロセスとして動作し、自動再起動はありません。s6 イメージ以外では no-op です。`HERMES_GATEWAY_NO_SUPERVISE=1` を設定することと同等です。 |
| `--external-supervisor` | `run` において: ラッパー側が提供するプロセスマネージャがフォアグラウンドのゲートウェイを所有していることを宣言します。`sudo`、`env -i`、その他のラッパーが launchd/systemd のネイティブな環境マーカーを取り除いてしまう場合に使います。チャット内での再起動やアップデートは、独立したプロセスを立ち上げる代わりに、そのマネージャへ制御を戻して終了します。 |

`--external-supervisor` は再起動ポリシーの契約です: チャット内での再起動、`hermes gateway restart`、サービス再起動を伴うアップデートは、いずれもステータス `75` で終了します（その後 CLI は自前でフォアグラウンドのゲートウェイを実行する代わりに、スーパーバイザーが発行する新しい PID を待ちます）。そのため、ラッパー側のスーパーバイザーはその非ゼロ終了の後にゲートウェイを再起動する必要があります。systemd では `Restart=on-failure` または `Restart=always` を使い、`RestartPreventExitStatus` に `75` を含めないでください。launchd では、失敗した終了後に再起動するよう `KeepAlive` を設定してください。このポリシーがないと、要求された再起動でゲートウェイが停止したままになります。

`hermes gateway enroll` は `--token`、`--connector-url`、`--gateway-id`、`--wake-url` を受け付けます。登録トークンをコネクタと交換し、結果の `GATEWAY_RELAY_ID`、`GATEWAY_RELAY_SECRET`、`GATEWAY_RELAY_DELIVERY_KEY`、（あれば）`GATEWAY_RELAY_URL`、（`--wake-url` を指定した場合は）`GATEWAY_RELAY_WAKE_URL` の値を、アクティブなプロファイルの `.env` に書き込みます。

:::tip WSL ユーザーへ
`hermes gateway start` の代わりに `hermes gateway run` を使ってください — WSL の systemd サポートは不安定です。永続化するには tmux で包んでください: `tmux new -s hermes 'hermes gateway run'`。詳細は [WSL FAQ](/hermes/docs/reference/faq/#wsl-gateway-keeps-disconnecting-or-hermes-gateway-start-fails) を参照してください。
:::

## `hermes lsp` {#hermes-lsp}

```bash
hermes lsp <subcommand>
```

Language Server Protocol 連携を管理します。LSP は実際の言語サーバー（pyright、gopls、rust-analyzer など）をバックグラウンドで実行し、その診断結果を `write_file` と `patch` が使う post-write チェックに渡します。git ワークスペースの検出で制御されており — cwd または編集対象のファイルが git worktree 内にあるときだけ LSP が動作します。

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `status` | サービスの状態、設定済みサーバー、インストール状況を表示します。 |
| `list` | サポートされているサーバーの一覧を表示します。`--installed-only` を渡すと未インストールのものを省略します。 |
| `install <id>` | 指定したサーバーのバイナリを即座にインストールします。 |
| `install-all` | 既知の自動インストール手順を持つすべてのサーバーをインストールします。 |
| `restart` | 実行中のクライアントを停止し、次の編集で再起動させます。 |
| `which <id>` | 指定したサーバーの解決済みバイナリパスを表示します。 |

詳しいガイド、サポート言語、設定については [LSP — セマンティック診断](/hermes/docs/user-guide/features/lsp/) を参照してください。

## `hermes setup` {#hermes-setup}

```bash
hermes setup [model|tts|terminal|gateway|tools|agent] [--non-interactive] [--reset] [--quick] [--reconfigure] [--portal]
```

**最も簡単な方法:** `hermes setup --portal` — Nous Portal に OAuth でログインし、[Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/) を一度で有効にします。

**初回実行:** 初回セットアップウィザードが起動します。

**再訪ユーザー（設定済み）:** そのままフルの再設定ウィザードに入ります — すべてのプロンプトで現在の値がデフォルトとして表示され、Enter で維持、または新しい値を入力できます。メニューはありません。

ウィザード全体ではなく1つの区分だけを行う:

| 区分 | 説明 |
|---------|-------------|
| `model` | プロバイダとモデルの設定。 |
| `terminal` | ターミナルバックエンドとサンドボックスの設定。 |
| `gateway` | メッセージングプラットフォームの設定。 |
| `tools` | プラットフォームごとのツールの有効/無効。 |
| `agent` | エージェントの動作設定。 |

オプション:

| オプション | 説明 |
|--------|-------------|
| `--quick` | 再訪ユーザーの実行時: まだ未設定の項目だけを尋ねます。すでに設定済みの項目はスキップします。 |
| `--non-interactive` | プロンプトなしで既定値/環境変数の値を使います。 |
| `--reset` | セットアップの前に設定を既定値にリセットします。 |
| `--reconfigure` | 後方互換用の別名です — 既存インストールでの単独の `hermes setup` は、今はこれが既定の動作です。 |
| `--portal` | Nous Portal の one-shot セットアップです: OAuth でログインし、Nous を推論プロバイダに設定し、[Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/) を有効にします。残りのウィザードはスキップされます。 |

## `hermes portal` {#hermes-portal}

```bash
hermes portal [status|open|tools]
```

Nous Portal の認証、Tool Gateway のルーティングを確認し、サブスクリプションページへの到達手段を提供します。サブコマンドなしで呼び出すと `status` が実行されます。

| サブコマンド | 説明 |
|------------|-------------|
| `status`（既定） | Portal の認証状態 + ツールごとの Tool Gateway ルーティングの概要。サブコマンドを指定しなかった場合もこれが表示されます。 |
| `open` | 既定のブラウザで `portal.nousresearch.com/manage-subscription` を開きます。 |
| `tools` | すべての Tool Gateway パートナー（Firecrawl、FAL、OpenAI TTS、Browser Use、Modal）と、Nous 経由でルーティングされているものを一覧します。 |

ゲートウェイ自体の設定については [Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/) を、one-shot のセットアップ手順については上記の `hermes setup --portal` を参照してください。

## `hermes whatsapp` {#hermes-whatsapp}

```bash
hermes whatsapp
```

WhatsApp のペアリング/セットアップフローを実行します。モード選択や QR コードのペアリングも含みます。

## `hermes slack` {#hermes-slack}

```bash
hermes slack manifest              # print manifest to stdout
hermes slack manifest --write      # write to ~/.hermes/slack-manifest.json
hermes slack manifest --long-description-file AGENTS.md --write
hermes slack manifest --slashes-only  # just the features.slash_commands array
```

`COMMAND_REGISTRY`（`/btw`、`/stop`、`/model` など）に登録されているすべてのゲートウェイコマンドを、Discord や Telegram と同等の一級の Slack スラッシュコマンドとして登録する Slack app manifest を生成します。出力を、[https://api.slack.com/apps](https://api.slack.com/apps) の自分のアプリ設定 → **Features → App Manifest → Edit** に貼り付け、**Save** してください。スコープやスラッシュコマンドが変わった場合、Slack は再インストールを促します。

| フラグ | 既定値 | 用途 |
|------|---------|-------------|
| `--write [PATH]` | stdout | stdout の代わりにファイルへ書き込みます。単独の `--write` は `$HERMES_HOME/slack-manifest.json` に書き込みます。 |
| `--name NAME` | `Hermes` | Slack 上のボット表示名です。 |
| `--description DESC` | 既定の説明文 | Slack のアプリディレクトリに表示されるボットの説明です。 |
| `--long-description TEXT` | 未設定 | `display_information.long_description` を直接設定します（175〜4,000文字）。`--slashes-only` とは併用できません。 |
| `--long-description-file PATH` | 未設定 | UTF-8 のテキストファイルから、内容をそのまま保持して長い説明文を読み込みます。`--long-description` とは排他で、`--slashes-only` とも併用できません。 |
| `--slashes-only` | off | 手動管理している manifest に統合するため、`features.slash_commands` だけを出力します。 |

新しいコマンドを反映するには、`hermes update` の後に `hermes slack manifest --write` を再実行してください。

## `hermes send` {#hermes-send}

```bash
hermes send --to <target> "message text"
hermes send --to <target> --file <path>
echo "message" | hermes send --to <target>
hermes send --list [platform]
```

エージェントやゲートウェイのループを一切起動せずに、設定済みのメッセージングプラットフォームへ one-shot メッセージを送信します。ゲートウェイが設定済みの認証情報（`~/.hermes/.env` + `~/.hermes/config.yaml`）を再利用するので、運用スクリプト・cron ジョブ・CI フック・監視デーモンは、各プラットフォームの REST クライアントを再実装せずにステータス通知を投稿できます。

bot トークン型のプラットフォーム（Telegram、Discord、Slack、Signal、SMS、WhatsApp-CloudAPI）ではゲートウェイの起動は不要です — `hermes send` はプラットフォームの REST エンドポイントに直接話しかけます。永続的なアダプタを必要とするプラグイン型のプラットフォームは、稼働中のゲートウェイが必要です。

| オプション | 説明 |
|--------|-------------|
| `-t`, `--to <TARGET>` | 送信先。形式: `platform`（ホームチャンネルを使用）、`platform:chat_id`、`platform:chat_id:thread_id`、または `platform:#channel-name`。例: `telegram`, `telegram:-1001234567890`, `discord:#ops`, `slack:C0123ABCD`, `signal:+15551234567`。 |
| `-f`, `--file <PATH>` | メッセージ本文を `PATH` から読み込みます（テキストファイル限定 — ログ、レポート、markdown）。`-` を渡すと強制的に stdin から読み込みます。画像などのバイナリファイルを送るには `MEDIA:<path>`（下記参照）を使います。 |
| `-s`, `--subject <LINE>` | メッセージ本文の前に件名/ヘッダー行を追加します。 |
| `-l`, `--list [platform]` | すべてのプラットフォーム（または指定したプラットフォームのみ）の設定済みターゲットを一覧します。 |
| `-q`, `--quiet` | 成功時の stdout を抑制します — スクリプトで終了コードだけを見るときに便利です。 |
| `--json` | 人間向けの出力の代わりに、生の JSON 結果を出力します。 |

位置引数の `message` も `--file` も指定されない場合、`hermes send` は TTY でないときに stdin から読み込みます。終了コード: 成功時 `0`、配信/バックエンドの失敗時 `1`、使用エラー時 `2`。

### 画像などのメディアを送る {#sending-images-and-other-media}

`--file` は*テキスト*本文専用です。画像、ドキュメント、動画、音声ファイルをプラットフォームのネイティブな添付として届けるには、メッセージ本文に `MEDIA:<local_path>` ディレクティブを含めます:

```bash
hermes send --to telegram "MEDIA:~/.hermes/cache/scratch/screenshot.png"
hermes send --to telegram "Build chart for today MEDIA:~/.hermes/cache/scratch/chart.png"   # with caption
hermes send --to discord:#ops "MEDIA:~/.hermes/cache/scratch/report.pdf"
```

既定では、画像ファイルは写真として送信されます（Telegram などのプラットフォームはこれを再圧縮します）。メッセージに `[[as_document]]` を追加すると、非圧縮のファイル添付として届けられます:

```bash
hermes send --to telegram "[[as_document]] MEDIA:~/.hermes/cache/scratch/screenshot.png"
```

例:

```bash
hermes send --to telegram "deploy finished"
echo "RAM 92%" | hermes send --to telegram:-1001234567890
hermes send --to discord:#ops --file ~/.hermes/cache/scratch/report.md
hermes send --to slack:#eng --subject "[CI]" --file build.log
hermes send --list                  # all platforms
hermes send --list telegram         # filter by platform
```

## `hermes peer` {#hermes-peer}

```bash
hermes peer add <name> --url http://host:port --key <API_SERVER_KEY>
hermes peer list
hermes peer dm <peer>[/<agent>] "message"
hermes peer run <peer>[/<agent>] --idempotency-key <key> "message"
hermes peer status <peer>[/<agent>] <run_id>
hermes peer stop <peer>[/<agent>] <run_id>
hermes peer remove <name>
```

マシンを超えた bot-to-bot の DM です。他の Hermes ゲートウェイ（`api_server` プラットフォームを実行しているマシン）を*peer* として登録し、そのエージェントにメッセージを送ります: `hermes peer dm` は、peer の API サーバー経由でリモートエージェントの正規の **Bot Chat** セッションを解決し、そこで1回のエージェントターンを実行して、その返答を stdout に出力します — ローカルの `hermes -p <bot> chat --in ~ -c "Bot Chat" …` という bot メッセージングコマンドの、マシンを超えた双子です。

`<peer>` だけを指定すると peer ゲートウェイのメインエージェントを対象にします。
`<peer>/<agent>` は、多重化された peer 上の名前付きプロファイル（その `/p/<profile>/` ミラー経由でルーティングされる）を対象にします。

| サブコマンド | 説明 |
|--------|-------------|
| `add <name> --url <URL> [--key <KEY>] [--note TEXT]` | peer を登録または更新します。URL は `config.yaml`（`bot_peers`）に、キーは `~/.hermes/.env` の `HERMES_PEER_<NAME>_KEY` として保存されます。 |
| `list` | peer とキーが設定されているかどうかを一覧します。 |
| `dm <peer>[/<agent>] [message]` | peer エージェントの正規の Bot Chat にメッセージを送り、返答を表示します（機械可読な出力には `--json`。メッセージ省略時は stdin から読み込みます）。 |
| `run <peer>[/<agent>] [message]` | 長時間の正規 Bot Chat ターンを非同期に開始し、その `run_id`、セッション ID、冗等キーを返します（`--json` 対応）。同じリクエストを再試行する際は `--idempotency-key` を再利用してください。 |
| `status <peer>[/<agent>] <run_id>` | 非同期の peer 実行をポーリングし、完了したら最終出力を表示します（`--json` 対応）。 |
| `stop <peer>[/<agent>] <run_id>` | 他のターンに影響を与えず、指定した非同期 peer 実行だけを停止します（`--json` 対応）。 |
| `remove <name>` | レジストリから peer を削除します（`.env` のキーの項目はそのまま残ります）。 |

peer が1つ以上登録されると、すべての正規 Bot Chat に教え込まれる Bot Mode メッセージングプロトコル（`agent.bot_mode_protocol`）は、peer 一覧と `hermes peer dm` パターンを自動的に含むようになり、エージェントは SOUL の編集なしにマシンを超えたチームメイトを発見できます。[Bot Mode](/hermes/docs/user-guide/bot-mode/) を参照してください。

終了コード: 成功時 `0`、配信/peer の失敗時 `1`、使用エラー時 `2`。

## `hermes secrets` {#hermes-secrets}

```bash
hermes secrets bitwarden <subcommand>
hermes secrets bw <subcommand>          # short alias
```

`~/.hermes/.env` に保存する代わりに、プロセス起動時に外部のシークレットマネージャから API キーを取得します。現状サポートしているのは**Bitwarden Secrets Manager**です。詳しいガイド: [Bitwarden integration](/hermes/docs/user-guide/secrets/bitwarden/)。

`bitwarden`（別名 `bw`）のサブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `setup` | 対話型ウィザード: ピン留めされた `bws` バイナリをインストールし、アクセストークンを保存し、プロジェクトを選びます。非対話利用には `--project-id`、`--access-token`、`--server-url` を受け付けます。 |
| `status` | 現在の設定、バイナリのパス/バージョン、トークンの検証状態を表示します。 |
| `token` | アクセストークンをローテーションします: `.env` に保存する前に新しいトークンを Bitwarden に対して検証します（拒否されたトークンは何も変更しません）。非対話利用には `--access-token`、検証をスキップするには `--no-verify` を受け付けます。 |
| `sync` | 今すぐシークレットを取得し、変更内容を報告します。`--apply` を付けると、そのシークレットを実際に現在のシェルの環境変数へエクスポートします（既定は dry-run）。 |
| `install` | PM でピン留めされた `bws` バイナリをインストール、または修復します。`--force` は同じ整合性の確認と修復を求めるもので、無条件にダウンロードし直すわけではありません。 |
| `disable` | Bitwarden 連携を無効にします。 |

## `hermes migrate` {#hermes-migrate}

```bash
hermes migrate <type>
```

廃止されたモデルや非推奨の設定への参照を診断し、（オプションで）現在アクティブな `config.yaml` を書き換えます。書き換えの前には、元の `config.yaml` のタイムスタンプ付きバックアップが取られます（`--no-backup` でスキップ）。

| サブコマンド | 説明 |
|------------|-------------|
| `xai` | `config.yaml` を走査し、2026年5月15日に廃止予定の xAI モデルへの参照を検出し、（`--apply` 付きで）xAI の移行ガイドに沿った公式の後継モデルへ書き換えます。既定は dry-run です。 |

移行サブコマンド共通のフラグ:

| フラグ | 説明 |
|------|-------------|
| `--apply` | `config.yaml` をその場で書き換えます（既定: dry-run、書き込みなし）。 |
| `--no-backup` | 適用時の、`config.yaml` のタイムスタンプ付きバックアップをスキップします。 |

> `hermes claw migrate`（OpenClaw の設定を Hermes へ one-shot でインポートする機能）と混同しないでください — `hermes migrate` はトップレベルの設定書き換えコマンドです。

## `hermes codex-runtime` {#hermes-codex-runtime}

```bash
hermes codex-runtime migrate [--dry-run] [--json]
```

チャットセッションを介さずに `/codex-runtime codex_app_server` がトリガーする `~/.codex/config.toml` の移行を実行します: Hermes の `mcp_servers`（加えてインストール済みの codex プラグインと `default_permissions` の既定値）が、選択したプロファイル（`hermes -p <name> codex-runtime migrate`）向けの管理ブロックに投影されます。ブロック外のユーザーのテキストはそのまま保持され、Hermes のサーバーと同じ名前を持つユーザー所有の `[mcp_servers.<name>]` は保持され、その名前に対する Hermes の投影はスキップされます（`preserved_user_servers` として報告されます）。結果は、アトミックな書き込みの前に TOML として検証され、レポートにエラーが含まれる場合は終了コードが 1 になります。

| フラグ | 説明 |
|------|-------------|
| `--dry-run` | `config.toml` を書き込まずに移行内容を計算・報告します。 |
| `--json` | 移行レポート全体を JSON として出力します（`migrated`, `preserved_user_servers`, `skipped_keys_per_server`, `errors`, `target_path`, `written`）。 |

## `hermes proxy` {#hermes-proxy}

```bash
hermes proxy <subcommand>
```

OAuth 認証済みのアップストリームプロバイダ（Nous Portal、xAI など）へリクエストを転送するローカルの OpenAI 互換 HTTP サーバーを実行します。外部アプリはどのベアラートークンでもこのプロキシに向けられ、プロキシが送信時に実際の OAuth 認証情報を付与します。詳しいガイドは [Subscription Proxy](/hermes/docs/user-guide/features/subscription-proxy/) を参照してください。

| サブコマンド | 説明 |
|------------|-------------|
| `start` | プロキシをフォアグラウンドで実行します。フラグ: `--provider <nous\|xai>`（既定 `nous`）、`--host <addr>`（既定 `127.0.0.1`；LAN に公開するには `0.0.0.0`）、`--port <int>`（既定 `8645`）。 |
| `status` | どのプロキシのアップストリームが準備できているか（認証情報あり、OAuth 有効）を表示します。 |
| `providers` | 利用可能なプロキシのアップストリームプロバイダを一覧します。 |

## `hermes security` {#hermes-security}

```bash
hermes security <subcommand>
```

[OSV.dev](https://osv.dev) に対するオンデマンドの脆弱性スキャンです。Hermes の venv（インストール済みの PyPI ディストリビューション）、`~/.hermes/plugins/` 配下のプラグインが宣言する Python の依存関係、`config.yaml` にピン留めされた `npx`/`uvx` の MCP サーバーが対象です。グローバルにインストールされたパッケージやエディタ/ブラウザの拡張機能はスキャンしません。

| サブコマンド | 説明 |
|------------|-------------|
| `audit` | one-shot のサプライチェーン監査を実行します。 |

`audit` のフラグ:

| フラグ | 既定値 | 説明 |
|------|---------|-------------|
| `--json` | off | 人間向けのテキストの代わりに機械可読な JSON を出力します。 |
| `--fail-on <level>` | `critical` | 指定した深刻度（`low`, `moderate`, `high`, `critical`）以上の検出があったとき、非ゼロで終了します。 |
| `--skip-venv` | off | Hermes の Python venv のスキャンをスキップします。 |
| `--skip-plugins` | off | プラグインの requirements ファイルのスキャンをスキップします。 |
| `--skip-mcp` | off | `config.yaml` にピン留めされた MCP サーバーのスキャンをスキップします。 |

## `hermes login` / `hermes logout` *(非推奨)* {#hermes-login-hermes-logout-deprecated}

:::caution
`hermes login` は削除されました。OAuth 認証情報の管理には `hermes auth`、プロバイダの選択には `hermes model`、フルの対話セットアップには `hermes setup` を使ってください。
:::

## `hermes auth` {#hermes-auth}

同一プロバイダのキーローテーション用の認証情報プールを管理します。詳細は [Credential Pools](/hermes/docs/user-guide/features/credential-pools/) を参照してください。

```bash
hermes auth                                              # Interactive wizard
hermes auth list                                         # Show all pools
hermes auth list openrouter                              # Show specific provider
hermes auth add openrouter --api-key sk-or-v1-xxx        # Add API key
hermes auth add openrouter --type oauth                  # Browser login (OpenRouter PKCE) mints a key for you
hermes auth add anthropic --type oauth                   # Add OAuth credential
hermes auth add openai-codex --type oauth --priority 0   # Add an account and try it first
hermes auth add openai-codex --browser                   # Codex: browser auth-code + PKCE on localhost:1455 instead of device code
hermes auth remove openrouter 2                          # Remove by index
hermes auth priority openrouter backup-key 0             # Move a credential to the front of fill_first order
hermes auth reset openrouter                             # Clear cooldowns
hermes auth reset openrouter 2                           # Clear the cooldown on one credential
hermes auth refresh openai-codex work                    # Refresh one OAuth credential and clear its cooldown
hermes auth status anthropic                             # Show auth status for a provider
hermes auth logout anthropic                             # Log out and clear stored auth state
hermes auth spotify                                      # Authenticate Hermes with Spotify via PKCE
```

サブコマンド: `add`, `list`, `remove`, `reset`, `priority`, `refresh`, `status`, `logout`, `spotify`。サブコマンドなしで呼び出すと、対話型の管理ウィザードが起動します。

## `hermes usage` {#hermes-usage}

`/usage` スラッシュコマンドのアカウント上限ブロック — Codex の5時間/週次ウィンドウ、プランとバンクされたリセット、Anthropic OAuth のウィンドウ、OpenRouter のクレジット — をセッションを開始せずに取得できるので、シェルスクリプトや cron ジョブから読み取れます。

```bash
hermes usage                          # configured model provider, human-readable block
hermes usage --provider openai-codex  # a specific provider
hermes usage --json                   # one JSON document on stdout
```

| オプション | 説明 |
|--------|-------------|
| `--provider NAME` | 問い合わせるプロバイダ（既定: 設定済みの `model.provider`）。対応: `openai-codex`, `anthropic`, `openrouter`。 |
| `--json` | 人間向けのブロックの代わりに、1つの JSON ドキュメントを出力します。 |

認証情報は、稼働中のエージェントがないセッションでの `/usage` と全く同じ方法で解決されます（認証ストア、次に認証情報プール）。このコマンドは chat が使わないような認証情報を新たに追加・更新することはありません。終了コード: 成功時 `0`；プロバイダに認証情報が設定されていない、プロバイダに usage エンドポイントがない、または取得に失敗した場合は、stderr に1行だけ出して `1`（stdout は空のままです）。

`--json` のスキーマ（キーは安定しています。新しいキーが追加される場合があります）:

```json
{
  "provider": "openai-codex",
  "source": "usage_api",
  "title": "Account limits",
  "plan": "Plus",
  "fetched_at": "2026-09-19T07:58:55+00:00",
  "windows": [
    {"label": "Session", "used_percent": 37.0, "resets_at": "2026-09-19T21:00:00+00:00", "detail": null},
    {"label": "Weekly", "used_percent": 12.5, "resets_at": "2026-09-25T09:00:00+00:00", "detail": null}
  ],
  "details": ["You have 1 reset banked - use /usage reset to activate"],
  "unavailable_reason": null
}
```

`used_percent` は、プロバイダがそのウィンドウを報告しなかった場合 `null` になります。`resets_at` は ISO-8601 UTC または `null` です（一部のウィンドウは代わりに自由記述の `detail` を持ちます）。`plan` は不明な場合 `null` になります。

## `hermes status` {#hermes-status}

```bash
hermes status [--all] [--deep]
```

| オプション | 説明 |
|--------|-------------|
| `--all` | 共有可能な redaction 済みの形式で、すべての詳細を表示します。 |
| `--deep` | 時間がかかる可能性のある、より深いチェックを実行します。 |

## `hermes cron` {#hermes-cron}

```bash
hermes cron <list|create|edit|pause|resume|run|remove|status|runs|incidents|doctor|tick>
```

| サブコマンド | 説明 |
|------------|-------------|
| `list` | 予約されたジョブを表示します。 |
| `create` / `add` | プロンプトから予約ジョブを作成します。`--skill` を繰り返し指定して1つ以上のスキルを添付できます。ジョブ単位の推論エフォート固定には `--reasoning-effort <none\|minimal\|low\|medium\|high\|xhigh\|max\|ultra>` を使えます。 |
| `edit` | ジョブのスケジュール、プロンプト、名前、配信先、繰り返し回数、添付スキルを更新します。`--clear-skills`、`--add-skill`、`--remove-skill`、および `--reasoning-effort`（空文字列で固定を解除）に対応しています。 |
| `pause` | ジョブを削除せずに一時停止します。 |
| `resume` | 一時停止したジョブを再開します。停止中に到来した繰り返しのスロットは、到来したままとして扱われます（次回の tick で1回だけ追いつき実行するか、記録付きでスキップします）。それ以外は次回の未来の実行時刻が再計算されます。 |
| `run` | 次回のスケジューラの tick でジョブを実行します。 |
| `remove` | 予約ジョブを削除します。 |
| `status` | cron スケジューラが動作しているかを確認します。 |
| `doctor` | 読み取り専用のフリート健全性チェックです: 失敗した実行、失敗した配信、期限切れ/欠落している `next_run_at`、欠落しているスクリプトや作業ディレクトリを検出します。問題が見つかった場合は非ゼロで終了します。 |
| `tick` | 期限が来ているジョブを1回実行して終了します。 |

cron の**トリガー**は、`cron.provider` の設定キーで差し替えられます。空（既定）の場合は組み込みのプロセス内ティッカーが使われます。`chronos`（scale-to-zero なホスト型ゲートウェイ向けの NAS 管理プロバイダ）に設定する場合は、`cron.chronos.*` のキー（`portal_url`, `callback_url`, `expected_audience`, `nas_jwks_url`）で構成します。または `plugins/cron/<name>/` や `$HERMES_HOME/plugins/<name>/` の下にカスタムプロバイダを名付けます。未知の、または利用できないプロバイダは組み込みのものにフォールバックするため、cron がトリガーを持たない状態にはなりません。詳細は [cron internals](/hermes/docs/developer-guide/cron-internals/#gateway-integration) のドキュメントを参照してください。

## `hermes kanban` {#hermes-kanban}

```bash
hermes kanban [--board <slug>] <action> [options]
```

マルチプロファイル・マルチプロジェクトのコラボレーションボードです。1つのインストールで複数のボードをホストできます（プロジェクト、リポジトリ、ドメインごとに1つ）。各ボードは、専用の SQLite DB とディスパッチャのスコープを持つ独立したキューです。新規インストールは `default` という1つのボードから始まり、そのDBは後方互換のために `~/.hermes/kanban.db` になります。追加のボードは `~/.hermes/kanban/boards/<slug>/kanban.db` に置かれます。ゲートウェイに組み込まれたディスパッチャは、tick ごとにすべてのボードを掃きます。

**グローバルフラグ（以下すべてのアクションに適用）:**

| フラグ | 用途 |
|------|-------------|
| `--board <slug>` | 指定したボードに対して操作します。既定は現在のボードです（`hermes kanban boards switch`、`HERMES_KANBAN_BOARD` 環境変数、または `default` で設定）。 |

**これは人間 / スクリプト向けのインターフェースです。** ディスパッチャが起動するエージェントワーカーは、`hermes kanban` をシェル実行するのではなく、専用の `kanban_*` [ツールセット](/hermes/docs/user-guide/features/kanban/#how-workers-interact-with-the-board)（`kanban_show`、`kanban_complete`、`kanban_request_review`、`kanban_request_changes`、`kanban_block`、`kanban_create`、`kanban_link`、`kanban_comment`、`kanban_heartbeat`；オーケストレータ用プロファイルはさらに `kanban_list` と `kanban_unblock` も持ちます）を通じてボードを操作します。ワーカーは環境変数 `HERMES_KANBAN_BOARD` が固定されているため、物理的に他のボードを見ることができません。

| アクション | 用途 |
|--------|-------------|
| `init` | `kanban.db` がなければ作成します。冪等です。 |
| `boards list` / `boards ls` | タスク数付きで全ボードを一覧します。`--json`、`--all`（アーカイブ済みを含む）。 |
| `boards create <slug>` | 新しいボードを作成します。フラグ: `--name`、`--description`、`--icon`、`--color`、`--switch`（作成後にアクティブにする）。slug はケバブケースで、自動的に小文字化されます。 |
| `boards switch <slug>` / `boards use` | `<slug>` をアクティブなボードとして永続化します（`~/.hermes/kanban/current` に書き込み）。 |
| `boards show` / `boards current` | 現在アクティブなボードの名前、DB パス、タスク数を表示します。 |
| `boards rename <slug> "<name>"` | ボードの表示名を変更します。slug は不変です。 |
| `boards rm <slug>` | ボードをアーカイブ（既定）または完全に削除します。`--delete` はアーカイブ手順をスキップします。アーカイブされたボードは `boards/_archived/<slug>-<ts>/` に移動します。`default` では拒否されます。 |
| `create "<title>"` | アクティブなボードに新しいタスクを作成します。フラグ: `--body`、`--assignee`、`--parent`（繰り返し可）、`--workspace scratch\|worktree\|dir:<path>`、`--tenant`、`--priority`、`--triage`、`--idempotency-key`、`--max-runtime`、`--max-retries`、`--skill`（繰り返し可）。 |
| `list` / `ls` | アクティブなボードのタスクを一覧します。`--mine`、`--assignee`、`--status`、`--tenant`、`--archived`、`--json` でフィルタできます。 |
| `show <id>` | コメントとイベント付きでタスクを表示します。機械向けの出力には `--json`。 |
| `assign <id> <profile>` | 割り当て、または再割り当てします。割り当て解除には `none` を使います。タスクが実行中のときは拒否されます。 |
| `link <parent> <child>` | 依存関係を追加します。循環は検出されます。両タスクは同じボード上にある必要があります。 |
| `unlink <parent> <child>` | 依存関係を削除します。 |
| `claim <id>` | 実行可能なタスクをアトミックに取得します。解決済みのワークスペースパスを表示します。 |
| `comment <id> "<text>"` | コメントを追加します。次にそのタスクを claim するワーカーは、`kanban_show()` の応答の一部としてこれを読みます。 |
| `complete <id>` | タスクを完了にします。フラグ: `--result`、`--summary`、`--metadata`。 |
| `block <id> "<reason>"` | タスクを人間の対応待ちとしてブロック状態にします。その理由もコメントとして追加されます。 |
| `request-review <id>` | タスクをレビュアーへのハンドオフ付きで `review` に移動します — ブロックではありません。フラグ: `--summary`、`--metadata`、`--reviewer`（レビュー配送の前に再割り当て）。 |
| `request-changes <id> <reason>` | 実行中のレビューに対するレビュアーの判定です: レビューの試行を終了し、タスクを元の実装者に戻します。 |
| `reopen-review <id>...` | レビュー中のタスクを修正のために戻します（`review` → ready/todo）。フラグ: `--reason`（コメントとして追加）。 |
| `schedule <id> "<reason>"` | 時間差の作業やフォローアップ作業を、人間へのブロッカーとして表示されない `scheduled` に留めます。 |
| `unblock <id>` | ブロック中のタスクを、元の段階（`review` または `ready`）に戻します。依存関係が残っている場合は `todo` に戻ります。 |
| `archive <id>` | 既定の一覧から隠します。`gc` は scratch ワークスペースを削除します。 |
| `tail <id>` | タスクのイベントストリームを追跡します。 |
| `dispatch` | アクティブなボードでディスパッチャを1回実行します。フラグ: `--dry-run`、`--max N`、`--failure-limit N`、`--json`。 |
| `context <id>` | ワーカーが見る完全なコンテキスト（タイトル + 本文 + 親の結果 + コメント）を表示します。 |
| `specify <id>` / `specify --all` | triage 列のタスクを、補助 LLM を使って具体的な仕様（タイトル + 目的・アプローチ・受け入れ条件を含む本文）に肉付けし、`todo` へ引き上げます。フラグ: `--tenant`（`--all` を1つのテナントに絞る）、`--author`、`--json`。モデルは `config.yaml` の `auxiliary.triage_specifier` で設定します。 |
| `decompose <id>` / `decompose --all` | triage 列のタスクを、記述内容に応じて専門プロファイルにルーティングされる子タスクのグラフに分解します。LLM がファンアウトの利点がないと判断した場合は、specify と同様の単一タスク引き上げにフォールバックします。フラグは `specify` と同じです。デコンポーザのモデルは `config.yaml` の `auxiliary.kanban_decomposer` で設定します。`kanban.orchestrator_profile` は、ファンアウト後にルート/オーケストレーションタスクを誰が持つかだけを制御します。`kanban.auto_decompose: true`（既定）のときは、ディスパッチャの tick ごとに自動的にも実行されます。[Auto vs Manual orchestration](/hermes/docs/user-guide/features/kanban/#auto-vs-manual-orchestration) を参照してください。 |
| `gc` | アーカイブ済みタスクの scratch ワークスペースを削除します。 |

例:

```bash
# Create a second board and put a task on it without switching away.
hermes kanban boards create atm10-server --name "ATM10 Server" --icon 🎮
hermes kanban --board atm10-server create "Restart server" --assignee ops

# Switch the active board for subsequent calls.
hermes kanban boards switch atm10-server
hermes kanban list                  # shows atm10-server tasks

# Archive a board (recoverable) or hard-delete it.
hermes kanban boards rm atm10-server
hermes kanban boards rm atm10-server --delete
```

ボードの解決順序（優先度の高い順）: `--board <slug>` フラグ → `HERMES_KANBAN_BOARD` 環境変数 → `~/.hermes/kanban/current` ファイル → `default`。

すべてのアクションは、`boards` サブコマンドや `--board` フラグを含め、同じ引数の形でゲートウェイのスラッシュコマンド（`/kanban …`）としても利用できます。

Cline Kanban / Paperclip / NanoClaw / Gemini Enterprise との比較、8つのコラボレーションパターン、4つのユーザーストーリー、並行性の正しさの証明を含む全体のデザインについては、[Kanban user guide](/hermes/docs/user-guide/features/kanban/) を参照してください。

## `hermes egress` {#hermes-egress}

リモートのターミナルサンドボックス向けの、送信方向の認証情報注入ファイアウォールです。[iron-proxy](https://github.com/ironsh/iron-proxy) デーモンをラップしています — これは TLS を中間で解釈し、ネットワークの境界で不透明なプロキシトークンを実際のアップストリーム API 認証情報に差し替えるプロキシで、サンドボックスは本物のキーを一切保持しません。既定では無効です。セットアップとアーキテクチャの詳細は [Egress proxy](/hermes/docs/user-guide/egress/iron-proxy/) のページ全体を参照してください。

```bash
hermes egress install                  # download the pinned iron-proxy binary
hermes egress install --force          # check and repair the managed copy

hermes egress setup                    # interactive wizard: CA, mappings, config
hermes egress setup --tunnel-port N    # override the tunnel listener port (default 9090)
hermes egress setup --from-bitwarden   # use Bitwarden Secrets Manager as credential source
hermes egress setup --no-bitwarden     # explicitly switch back to env-based credentials
hermes egress setup --rotate-tokens    # mint fresh proxy tokens (default preserves existing)

hermes egress start                    # spawn the managed proxy daemon
hermes egress stop                     # SIGTERM (then SIGKILL after 5s grace)
hermes egress restart                  # stop (if running) then start — needed for secret changes
hermes egress reload                   # hot-reload the ruleset in-place (no restart, no dropped
                                       #   connections) via the loopback management API

hermes egress status                   # binary + config + pid + listening + mappings
hermes egress status --show-tokens     # print proxy tokens in full (default: redacted)

hermes egress disable                  # flip proxy.enabled = false (does not stop a running proxy)
hermes egress config                   # print the path to proxy.yaml for inspection
```

### 一般的なフロー {#common-flows}

```bash
# First-time setup
export OPENROUTER_API_KEY=…
hermes egress setup && hermes egress start
hermes config set terminal.backend docker   # if not already

# Switching credential source after the fact
hermes egress setup --from-bitwarden       # env → bitwarden
hermes egress setup --no-bitwarden         # bitwarden → env
# (just `setup` without either flag preserves the existing mode)

# Rotating all tokens (e.g. after a suspected token leak)
hermes egress setup --rotate-tokens    # setup offers to restart the running daemon for you
# (running sandboxes still hold old tokens; restart them too)

# Adding a new upstream
# Edit ~/.hermes/config.yaml proxy.extra_allowed_hosts: [api.example.com]
hermes egress setup
hermes egress restart                  # one-command apply (stop + start)
```

### 診断のショートカット {#diagnostic-shortcuts}

```bash
hermes egress status                     # current state in one view
cat ~/.hermes/proxy/proxy.yaml           # the rendered iron-proxy config
tail -20 ~/.hermes/proxy/iron-proxy.log  # daemon-level diagnostics
tail -f ~/.hermes/proxy/iron-proxy.log | jq  # daemon + per-request log (line-delimited JSON; v0.39 combines both streams)
```

よくある失敗パターンとその復旧方法は [Egress proxy → Troubleshooting](/hermes/docs/user-guide/egress/iron-proxy/#troubleshooting) にまとめています。

## `hermes project` {#hermes-project}

```bash
hermes project <create|list|show|add-folder|remove-folder|rename|set-primary|use|archive|restore|bind-board>
```

プロジェクトは、複数のフォルダ/リポジトリをまとめられる、人間が名付けたワークスペースです。デスクトップのセッショングルーピングの基点となり、kanban ボードに紐付いている場合は、タスクに決定的な worktree + ブランチ規則を与えます。状態はプロファイル単位です。

| サブコマンド | 説明 |
|------------|-------------|
| `create` | 新しいプロジェクトを作成します。 |
| `list`（別名 `ls`） | プロジェクトを一覧します。 |
| `show` | プロジェクトの詳細を表示します。 |
| `add-folder` | プロジェクトにフォルダ/リポジトリを追加します。 |
| `remove-folder` | プロジェクトからフォルダを削除します。 |
| `rename` | プロジェクトをリネームします。 |
| `set-primary` | プライマリフォルダを設定します。 |
| `use` | アクティブなプロジェクトを設定します。 |
| `archive` | プロジェクトをアーカイブします（復元可能）。 |
| `restore` | アーカイブされたプロジェクトを復元します。 |
| `bind-board` | このプロジェクトに kanban ボードを紐付けます。 |

## `hermes webhook` {#hermes-webhook}

```bash
hermes webhook <subscribe|list|remove|test>
```

イベント駆動でのエージェント起動用に、動的な webhook サブスクリプションを管理します。設定で webhook プラットフォームが有効になっている必要があります — 未設定の場合はセットアップ手順が表示されます。

| サブコマンド | 説明 |
|------------|-------------|
| `subscribe` / `add` | webhook のルートを作成します。設定するべき URL と HMAC シークレットを返します。 |
| `list` / `ls` | エージェントが作成したすべてのサブスクリプションを表示します。 |
| `remove` / `rm` | 動的なサブスクリプションを削除します。config.yaml の静的なルートには影響しません。 |
| `test` | テスト用の POST を送り、サブスクリプションが動作しているか確認します。 |

### `hermes webhook subscribe` {#hermes-webhook-subscribe}

```bash
hermes webhook subscribe <name> [options]
```

| オプション | 説明 |
|--------|-------------|
| `--prompt` | `{dot.notation}` によるペイロード参照を使ったプロンプトテンプレートです。 |
| `--events` | 受け付けるイベントタイプのカンマ区切りリスト（例: `issues,pull_request`）。空 = すべて。 |
| `--description` | 人間向けの説明です。 |
| `--skills` | エージェント実行にロードするスキル名のカンマ区切りリストです。 |
| `--deliver` | 配信先: `log`（既定）、`telegram`、`discord`、`slack`、`github_comment`。 |
| `--deliver-chat-id` | クロスプラットフォーム配信先のチャット/チャンネル ID です。 |
| `--secret` | カスタムの HMAC シークレットです。省略時は自動生成されます。 |
| `--deliver-only` | エージェントをスキップし、レンダリングした `--prompt` をそのままメッセージとして配信します。LLM のコストはゼロで、配信は1秒未満です。`--deliver` が実際のターゲット（`log` 以外）である必要があります。 |
| `--mirror-to-session` | 配信した各メッセージを、宛先チャットのセッションにも書き込みます。そのチャットで返信したとき、エージェントが文脈を踏まえて答えられるようになります。既定ではオフです。会話に取り込んでも信頼できる内容を送ってくる送信元に限って有効にしてください。 |
| `--script` | `~/.hermes/scripts/` 配下のフィルタ/変換スクリプトです。webhook のペイロードは stdin に JSON として渡され、JSON の stdout がペイロードを置き換えます。空の stdout、`[SILENT]`、非ゼロの終了コードは、その webhook を無視します。詳細は [Script Filters and Transforms](/hermes/docs/user-guide/messaging/webhooks/#script-filters-and-transforms) を参照してください。 |
| `--route-profile` | ルートを多重化されたプロファイルに紐付けます: そのルートは `/p/<profile>/webhooks/<name>` からのみ到達可能になり、エージェントはそのプロファイルとして動作します。既存のプロファイルに対して検証され、省略時は更新時にそのまま保持されます。サブスクリプションファイルを書き込むゲートウェイを選ぶグローバルな `-p/--profile` とは別物です。詳細は [Multi-profile gateways](/hermes/docs/user-guide/multi-profile-gateways/) を参照してください。 |

サブスクリプションは `~/.hermes/webhook_subscriptions.json` に永続化され、ゲートウェイを再起動せずに webhook アダプタによってホットリロードされます。既存の名前で `subscribe` を再実行すると、`--secret` / `--route-profile` を渡さない限り、そのシークレットとプロファイル紐付けが維持されます。

## `hermes doctor` {#hermes-doctor}

```bash
hermes doctor [--fix]
```

| オプション | 説明 |
|--------|-------------|
| `--fix` | 可能な場合、自動的に修復を試みます。 |

終了ステータス: レポートに未解決の問題がない場合は `0`、1つ以上残っている場合（`--fix` が修復できなかった問題を含む）は `1` です。そのため、ヘルスゲートや CI のステップは `hermes doctor` をチェックとして信頼できます。

**API Connectivity** の節には `IPv6 route` チェックが含まれます: 既知のデュアルスタックホストへ、短い（2秒の）IPv6 TCP 接続を1回開きます。ルートが広告されているのにタイムアウトするだけの場合（ブラックホール化した IPv6 プレフィックス）、対処法として `network.force_ipv4: true` を名指しした警告として報告されます。IPv6 ルートが全くないのは健全な状態として OK と報告されます。すでに `force_ipv4` が設定されている場合、このチェック自体がスキップされます。

カスタムエンドポイントの設定チェック（どちらも警告のみで、`--fix` はこれらを書き換えません）:

- `custom_providers` が YAML のリストでない場合（例: 不正な `config set` が残した文字列）は、そのキーと実際の型を名指ししたエラーとして報告されます — 再びリストに戻るまで、ランタイムはすべてのカスタムエンドポイントを無視します。
- 対応する `providers:` の項目（同じエンドポイント URL を持つもの）がない、古い形式の `custom_providers` リストの項目は、取るべき対処と共に報告されます: そのような項目は、モデルピッカーや Custom Endpoints ページが両方から読み取る廃止済みのリストストアからまだ配信されていて、リストを `providers:` へ移す one-shot の v12 マイグレーションは二度と実行されません。他のすべての画面が編集する `providers:` マップからではなく、廃止済みのリストストアから配信されているままです。

**Config Structure** も、1つのクォート済み文字列として保存されているリスト/マッピングの設定（`plugins.enabled: '["a","b"]'`、`model_catalog.excluded_providers: '["openai-api"]'` — 古いバージョンの `config set` が書いていた形）を検出します: すべての読み取り側はそのような文字列を無視するため、プラグインは静かにマウントされないままになり、除外設定も一切適用されません。この検出結果は、そのキー名と、実際のリストを保存する `hermes config set <key> '<literal>'` コマンドを名指しします。同じ警告は起動時のバナーにも表示されます。`--fix` はこのファイルを書き換えません。

## `hermes dump` {#hermes-dump}

```bash
hermes dump [--show-keys]
```

自分の Hermes セットアップ全体の、コンパクトなプレーンテキストの概要を出力します。Discord、GitHub の Issue、Telegram でサポートを求める際にコピペできるように設計されています — ANSI カラーも特殊な書式もなく、データだけです。

| オプション | 説明 |
|--------|-------------|
| `--show-keys` | `set`/`not set` の代わりに、redaction された API キーの接頭辞（先頭と末尾の4文字）を表示します。 |

### 含まれる内容 {#what-it-includes}

| 節 | 詳細 |
|---------|-------------|
| **Header** | Hermes のバージョン、リリース日、git コミットハッシュ |
| **Environment** | OS、Python のバージョン、OpenAI SDK のバージョン |
| **Identity** | アクティブなプロファイル名、HERMES_HOME のパス |
| **Model** | 設定済みの既定モデルとプロバイダ |
| **Terminal** | バックエンドの種類（local、docker、ssh など） |
| **API keys** | 22種のプロバイダ/ツール API キーの有無確認 |
| **Features** | 有効なツールセット、MCP サーバー数、メモリプロバイダ |
| **Services** | ゲートウェイの状態、設定済みのメッセージングプラットフォーム |
| **Workload** | cron ジョブ数、インストール済みスキル数 |
| **Config overrides** | 既定値と異なる設定値 |

### 出力例 {#example-output}

```
--- hermes dump ---
version:          0.8.0 (2026.4.8) [af4abd2f]
os:               Linux 6.14.0-37-generic x86_64
python:           3.11.14
openai_sdk:       2.24.0
profile:          default
hermes_home:      ~/.hermes
model:            anthropic/claude-opus-4.6
provider:         openrouter
terminal:         local

api_keys:
  openrouter           set
  openai               not set
  anthropic            set
  nous                 not set
  firecrawl            set
  ...

features:
  toolsets:           all
  mcp_servers:        0
  memory_provider:    built-in
  gateway:            running (systemd)
  platforms:          telegram, discord
  cron_jobs:          3 active / 5 total
  skills:             42

config_overrides:
  agent.max_turns: 250
  compression.threshold: 0.85
  display.streaming: True
--- end dump ---
```

### いつ使うか {#when-to-use}

- GitHub でバグを報告するとき — Issue にダンプを貼る
- Discord でヘルプを求めるとき — コードブロックで共有する
- 自分の設定を他の人のものと比較するとき
- 何かがうまく動かないときの簡単な健全性チェック

:::tip
`hermes dump` は共有することを前提に設計されています。対話的な診断には `hermes doctor` を、視覚的な概要には `hermes status` を使ってください。
:::

## `hermes debug` {#hermes-debug}

```bash
hermes debug share [options]
```

デバッグレポート（システム情報 + 直近のログ）をペーストサービスにアップロードし、共有可能な URL を取得します。素早いサポート依頼に便利です — 対応する側が問題を診断するために必要なものをすべて含みます。

| オプション | 説明 |
|--------|-------------|
| `--lines <N>` | ログファイルごとに含める行数（既定: 200）。 |
| `--expire <days>` | ペーストの有効期限（日数、既定: 7）。 |
| `--nous` | 公開のペーストサービスの代わりに、Nous 内部の診断ストレージにアップロードします。Nous サポートから非公開の診断バンドルを求められたときに使います。 |
| `--local` | アップロードせず、レポートをローカルに表示します。 |
| `--no-redact` | アップロード時のシークレットの redaction を無効にします。既定ではアップロードは redaction されます。 |

レポートには、システム情報（OS、Python のバージョン、Hermes のバージョン）、直近のエージェント・ゲートウェイ・GUI/ダッシュボード・デスクトップのログ（ファイルごとに 512 KB 上限）、redaction 済みの API キーの状態が含まれます。既定ではアップロードは redaction されるため、シークレットは含まれません。

既定のアップロードは、公開のペーストサービス（paste.rs、dpaste.com の順）を試します。`--nous` は同じデバッグバンドルを非公開の Nous 診断ストレージにアップロードします。返される viewer リンクは Nous チーム用で、14日後に自動削除されます。

### 例 {#examples}

```bash
hermes debug share              # Upload debug report, print URL
hermes debug share --lines 500  # Include more log lines
hermes debug share --expire 30  # Keep paste for 30 days
hermes debug share --nous       # Upload a private diagnostics bundle for Nous support
hermes debug share --local      # Print report to terminal (no upload)
```

## `hermes backup` {#hermes-backup}

```bash
hermes backup [options]
```

Hermes の設定、スキル、セッション、データの zip アーカイブを作成します。バックアップは hermes-agent のコードベース自体を除外し、以前のバックアップの成果物（`backups/`、`state-snapshots/`）を入れ子にしません — それぞれが既に `state.db` 自身のコピーを持っています。

| オプション | 説明 |
|--------|-------------|
| `-o`, `--output <path>` | zip ファイルの出力パス（既定: `~/hermes-backup-<timestamp>.zip`）。 |
| `-q`, `--quick` | クイックスナップショット: 重要な状態ファイル（config.yaml、state.db、.env、auth、cron ジョブ）だけを対象にします。フルバックアップより大幅に速いです。 |
| `-l`, `--label <name>` | スナップショットのラベル（`--quick` と併用時のみ）。 |
| `-k`, `--keep <N>` | フルバックアップの後、出力ディレクトリ内の古い `hermes-backup-*.zip` を、最新 N 個を残して削除します（既定 3、`0` はすべて保持）。カスタム名の zip は一切触れません。 |

バックアップは SQLite の `backup()` API を使って安全にコピーするため、Hermes が実行中でも正しく動作します（WAL モードでも安全です）。

**終了ステータス:** 選択したすべてのファイルがアーカイブに入った場合のみ `0`。一部のファイルを追加できなかった場合（`Backup incomplete: …`）、残りが復元できるよう zip はそのまま保持されますが、コマンドは `1` で終了します — cron や systemd タイマーが不完全なアーカイブを成功として報告することはなく、`--keep` による整理もスキップされ、既存の完全なアーカイブは残ります。`2` は、別のバックアップが既に実行中だったことを意味します。

**zip から除外されるもの:**

- `*.db-wal`、`*.db-shm`、`*.db-journal` — SQLite の WAL / 共有メモリ / journal のサイドカーです。`*.db` ファイル自体は `sqlite3.backup()` によって一貫したスナップショットを取得済みなので、稼働中のサイドカーを一緒に出荷すると、リストア時に半分だけコミットされた状態を見せてしまいます。
- `checkpoints/` — セッション単位の履歴キャッシュです。ハッシュキー付きでセッションごとに再生成されるため、他のインストールにそのまま移植する意味もありません。
- `~/.hermes` のルート（および各 `profiles/<name>/` のルート）にある `models/`、`runtimes/`、`node/` — 再生成可能なランタイムダウンロードで、数十 GB になることもあります。同名でも深い階層のディレクトリ（スキルの `models/` など）は保持されます。
- ブラウザプロファイル: `browser-profile/`（実プロファイルのスナップショット — コピーされた Cookies / Login Data）、`browser-profiles/`（生きている CDP プロファイル、深さを問わず）、そして `browser_profiles/`（Browser Use CLI バックエンドの Chromium ユーザーデータディレクトリで、独自の Login Data / Cookies を持つ。`~/.hermes` のルートおよび各 `profiles/<name>/` のルートにあるもの）。これらは決してアーカイブに入れてはならない認証情報ストアで、いずれも次回起動時に再生成されます。
- 同じルートにある `cache/` の再生成可能な項目 — モデル/プラグインのカタログ、スタンプ、ブラウザプロファイル、ツール出力の溢れ分です。永続的なアーティファクトは残ります: `cache/images`、`cache/audio`、`cache/videos`、`cache/documents`、`cache/screenshots`（あなたに配信された、またはあなたから受け取ったメディア）、そして `cache/citations`（根拠となる引用の記録）。スキル内などより深い階層の `cache/` はそのまま丸ごと保持されます。
- Unix ソケット、デバイス、シンボリックリンク — zip はこれらを保持できません。除外前は、迷い込んだ `gateway.sock` があるとフルバックアップが必ず `Backup incomplete` を報告していました。
- `hermes-agent` のコード自体（これはユーザーデータのバックアップであり、リポジトリのスナップショットではありません）。

### 例 {#examples}

```bash
hermes backup                           # Full backup to ~/hermes-backup-*.zip
hermes backup -o ~/backups/hermes.zip   # Full backup to specific path
hermes backup --quick                   # Quick state-only snapshot
hermes backup --quick --label "pre-upgrade"  # Quick snapshot with label
```

## `hermes checkpoints` {#hermes-checkpoints}

```bash
hermes checkpoints [COMMAND]
```

`~/.hermes/checkpoints/` にあるシャドウ git ストア — セッション内の `/rollback` コマンドを支えるストレージ層 — を確認・管理します。いつでも安全に実行でき、エージェントが動作中である必要はありません。

| サブコマンド | 説明 |
|------------|-------------|
| `status`（既定） | 総サイズ、プロジェクト数、プロジェクトごとの内訳を表示します。単独の `hermes checkpoints` はこれと同等です。 |
| `list` | `status` の別名です。 |
| `prune` | クリーンアップを強制実行します — 孤立したプロジェクトや古くなったプロジェクトを削除し、ストアを GC し、サイズ上限を強制します。24時間の冪等マーカーは無視されます。 |
| `clear` | チェックポイントのベース全体を削除します。取り消せません。`-f` がない場合は確認を求めます。 |
| `clear-legacy` | v1→v2 マイグレーションで生成された `legacy-<timestamp>/` アーカイブだけを削除します。アーカイブを削除できなかった場合（例: Windows での読み取り専用の git オブジェクト）、`Could not delete N archive(s)` を表示した上で `2` で終了します。 |

### オプション {#options}

| オプション | サブコマンド | 説明 |
|--------|------------|-------------|
| `--limit N` | `status`, `list` | 一覧するプロジェクトの最大数（既定 20）。 |
| `--retention-days N` | `prune` | `last_touch` が N 日より古いプロジェクトを削除します（既定 7）。 |
| `--max-size-mb N` | `prune` | 孤立/古いプロジェクトの整理後、ストアの合計サイズが N MB 以下になるまで、プロジェクトごとに古いコミットから削除します（既定 500）。 |
| `--keep-orphans` | `prune` | 作業ディレクトリが存在しなくなったプロジェクトの削除をスキップします。 |
| `-f`, `--force` | `clear`, `clear-legacy` | 確認プロンプトをスキップします。 |

### 例 {#examples}

```bash
hermes checkpoints                                  # status overview
hermes checkpoints prune --retention-days 3         # aggressive cleanup
hermes checkpoints prune --max-size-mb 200          # tighten size cap once
hermes checkpoints clear-legacy -f                  # drop v1 archive dirs
hermes checkpoints clear -f                         # wipe everything
```

アーキテクチャ全体とセッション内コマンドについては [Checkpoints and `/rollback`](/hermes/docs/user-guide/checkpoints-and-rollback/) を参照してください。

## `hermes import` {#hermes-import}

```bash
hermes import <zipfile> [options]
```

以前作成した Hermes のバックアップを、自分の Hermes ホームディレクトリに復元します。アーカイブ内のすべてのファイルが既存のファイルを上書きします。`--force` は、対象に既に Hermes のインストールがあるときに出る確認プロンプトだけをスキップします。

| オプション | 説明 |
|--------|-------------|
| `-f`, `--force` | 既存インストールの確認プロンプトをスキップします。 |

:::warning
実行中のプロセスとの競合を避けるため、インポート前にゲートウェイを停止してください。
:::

**終了ステータス:** アーカイブが壊れている場合は `1` です。何かを書き込む前に、すべてのメンバーを一度展開して CRC を確かめます。1 つでも失敗すると `Error: backup archive is damaged (N member(s) …)` と問題のメンバーを表示し、Hermes のホームには一切手を付けずに止まります。アーカイブ内のファイルを 1 つでも復元できなかった場合も `1` です（`Warnings (N files skipped)` の下に一覧が出て、`Import incomplete: …` とまとめて表示されます）。書き込めたファイルはそのまま残りますが、スクリプトやダッシュボードが途中までの復元を成功として扱うことはありません。インポートが意図してこの端末のものを残すランタイムファイル（`gateway.pid`、`gateway_state.json`、…）と、下で説明する古いバックアップのセッションに関する警告は、終了ステータスに影響しません。

### SQLite データベース {#sqlite-databases}

`.db` のメンバー（`state.db`、`kanban.db`、`response_store.db` など）は、通常のファイルのようなリネームでは配信されません。リネームは、ゲートウェイやダッシュボード、WebUI のプロセスがまだ古いファイルを開いたままの状態で、そのファイルの inode を差し替えてしまいます。そのプロセスは、インポート前の古いページを読み続け、他の誰にも見えないセッションを書き続けることになり、そのセッションは全員が次に開くデータベースから単純に欠落します — 何もログに残りません。代わりに、インポートされたページは、`/snapshot restore` が行うのと同じ方法で、**既存のデータベースファイルに直接書き込まれ**、開いているすべての接続がインポートされたデータへ収束します。

生きているデータベースを安全に差し替えられない場合（ページのコピーが失敗し、*かつ*他のプロセスがまだそのファイルを開いている場合）、インポートはそのデータベースに触れず、`Warnings (N files skipped)` の下に一覧します。ファイルを保持しているプロセスを停止し、再実行してください。

新しい作業を上書きする古いバックアップのインポートは今も許可されていますが、無音ではなくなりました。インポートされた `state.db` が、置き換える前より少ないメッセージ数しか持っていない場合、概要にその旨が報告されます:

```
  ⚠ Session data replaced by older backup contents:
    state.db: 12 session(s) / 8912 message(s) -> 3 / 24
    Anything recorded after the backup was taken is not in it.
    Recover from a newer backup or snapshot: hermes snapshot list
```

### 例 {#examples}
```bash
hermes import ~/hermes-backup-20260423.zip           # Prompts before overwriting existing config
hermes import ~/hermes-backup-20260423.zip --force   # Overwrite without prompting
```

## `hermes logs` {#hermes-logs}

```bash
hermes logs [log_name] [options]
```

Hermes のログファイルを表示・追跡・フィルタします。すべてのログは `~/.hermes/logs/`（デフォルト以外のプロファイルでは `<profile>/logs/`）に保存されます。

### ログファイル {#log-files}

| 名前 | ファイル | 記録される内容 |
|------|------|-----------------|
| `agent`（既定） | `agent.log` | すべてのエージェント活動 — API 呼び出し、ツールディスパッチ、セッションのライフサイクル（INFO 以上） |
| `errors` | `errors.log` | 警告とエラーのみ — agent.log のフィルタ済み部分集合 |
| `gateway` | `gateway.log` | メッセージングゲートウェイの活動 — プラットフォーム接続、メッセージディスパッチ、webhook イベント |
| `gui` | `gui.log` | ダッシュボード / TUI-ゲートウェイ / PTY ブリッジ / websocket のイベント |
| `desktop` | `desktop.log` | Electron デスクトップアプリ — 起動、バックエンド起動時の出力、直近の Python トレースバック |

### オプション {#options}

| オプション | 説明 |
|--------|-------------|
| `log_name` | 表示するログ: `agent`（既定）、`errors`、`gateway`、または利用可能なファイルをサイズ付きで表示する `list`。 |
| `-n`, `--lines <N>` | 表示する行数（既定: 50）。 |
| `-f`, `--follow` | `tail -f` のように、リアルタイムでログを追跡します。停止するには Ctrl+C を押してください。 |
| `--level <LEVEL>` | 表示する最小のログレベル: `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`。 |
| `--session <ID>` | セッション ID の部分文字列を含む行だけをフィルタします。 |
| `--since <TIME>` | 相対時間前からの行を表示します: `30m`、`1h`、`2d` など。`s`（秒）、`m`（分）、`h`（時間）、`d`（日）に対応しています。 |
| `--component <NAME>` | コンポーネントでフィルタします: `gateway`, `agent`, `tools`, `cli`, `cron`。 |

### 例 {#examples}

```bash
# View the last 50 lines of agent.log (default)
hermes logs

# Follow agent.log in real time
hermes logs -f

# View the last 100 lines of gateway.log
hermes logs gateway -n 100

# Show only warnings and errors from the last hour
hermes logs --level WARNING --since 1h

# Filter by a specific session
hermes logs --session abc123

# Follow errors.log, starting from 30 minutes ago
hermes logs errors --since 30m -f

# List all log files with their sizes
hermes logs list
```

### フィルタリング {#filtering}

フィルタは組み合わせられます。複数のフィルタが有効な場合、ログの行が表示されるには**すべて**のフィルタを通過する必要があります:

```bash
# WARNING+ lines from the last 2 hours containing session "tg-12345"
hermes logs --level WARNING --since 2h --session tg-12345
```

パースできるタイムスタンプを持たない行は、`--since` が有効な間は含まれます（複数行にわたるログエントリの継続行かもしれないためです）。検出可能なレベルを持たない行は、`--level` が有効な間は含まれます。

### ログローテーション {#log-rotation}

Hermes は Python の `RotatingFileHandler` を使います。古いログは自動的にローテーションされます — `agent.log.1`、`agent.log.2` などを探してください。`hermes logs list` サブコマンドは、ローテーションされたものを含むすべてのログファイルを表示します。

## `hermes prompt-size` {#hermes-prompt-size}

```bash
hermes prompt-size [--platform <name>] [--json]
```

新しいセッションの固定プロンプト予算 — どんな会話内容よりも*前*に、すべての API 呼び出しごとに送られるもの — を報告します。ダウンストリームのアダプタやプロキシが、モデルのコンテキストウィンドウより厳しいプロンプト予算を持つ場合、または、どのブロック（スキル索引、メモリ、プロファイル）が支配的かを知りたい場合に便利です。

エージェントが使うのと同じシステムプロンプトを組み立て、それを内訳に分解します:

- **System prompt total** — 組み立てられたプロンプト全体（identity、guidance、スキル索引、コンテキストファイル、メモリ、プロファイル、タイムスタンプ）。
- **Skills index** — `<available_skills>` ブロックです。多くのスキルをインストールしていると、これが最大のブロックになることがよくあります。
- **Memory** と **user profile** — あなたの `MEMORY.md` / `USER.md` のスナップショットです。
- **Prompt tiers** — stable / context / volatile。Hermes がキャッシュに優しい形でプロンプトを層に分けている方法と一致します。
- **Tool schemas** — 有効なすべてのツールの JSON です（固定ペイロードの残り半分です）。

完全にオフラインで動作します — API 呼び出しはなく、認証情報が一切設定されていなくても動作します。

```bash
# Human-readable breakdown for the CLI platform (default)
hermes prompt-size

# Simulate a messaging platform's prompt (different platform hint)
hermes prompt-size --platform telegram

# Machine-readable output for scripts
hermes prompt-size --json
```

:::tip
スキル索引とツールスキーマは、有効にしているスキルとツールの数に応じて大きくなります。プロンプトを縮めるには、使っていないツールセットを無効化（`hermes tools`）するか、不要なスキルをアンインストール（`hermes skills`）してください。現在のディレクトリにあるコンテキストファイル（AGENTS.md、.cursorrules）も合計に含まれます。
:::

## `hermes config` {#hermes-config}

```bash
hermes config <subcommand>
```

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `show` | 現在の設定値を表示します。 |
| `edit` | `config.yaml` をエディタで開きます。 |
| `get <key> [--json] [--raw]` | ドット区切りのキー（例: `hermes config get model.default`）で単一の設定値を表示します。`--json` は機械可読な出力を出します。認証情報らしき値（`api_key`、`*_TOKEN`、`*_SECRET`、`password` など）は、エージェントがトランスクリプトが永続化されるセッションからこれを実行するため、マスクされます（`sk-o...7890`）。実際の値を表示するには `--raw` を渡すか、`security.redact_secrets: false` を設定してください。既知の区分の下にある、スキーマが定義していないネストされたキー（`compression.compressor.enabled`）でも、そのファイルの値は表示されますが、Hermes がそれを読まない可能性があるという stderr の通知が付きます。stdout と終了コード（0）は変わりません。 |
| `set <key> <value> [--force]` | 設定値をセットします。ドット区切りのパスは `config.yaml` に、`UPPER_SNAKE` 形式のすべての名前（`OPENROUTER_API_KEY`、`DISCORD_HOME_CHANNEL`、`TELEGRAM_GROUP_ALLOWED_USERS`、`HERMES_TIMEZONE` など）は環境変数として `.env` に書き込まれます — これは、プラットフォームのセットアップフローや `/sethome` が書き込むのと同じファイルで、すべてのランタイムの読み取り側がそれに対して解決する対象です。`config set` は `--force` を付けても `UPPER_SNAKE` のキーを `config.yaml` に書き込むことは一切ありません。環境変数書き込み側の拒否リストにある名前（`HERMES_YOLO_MODE`、`PATH` など）は完全に拒否されます。それ以外の任意の `UPPER_SNAKE` 名は、そのまま `.env` に保存されます（プラグイン、スキル、外部ツールがプロセス環境からそれを読み取ります）。既知のキーが間違ったプレフィックス下に書かれた場合（`gateway.discord.foo`。ここで `discord.foo` 自体は既知のキー）は、did-you-mean と共に拒否され、何も書き込まれません。それ以外の、既知の区分下にある未知のパス（`agent.max_turnz`、あるいはシードされた既定値を持たないランタイム読み取りキー）は、did-you-mean の通知付きで書き込まれます。未知のトップレベルの小文字キーも、通知付きで書き込まれます（トップレベルのスカラーはスキルのために環境変数へブリッジされます）。`--force` は、拒否された間違ったプレフィックスのパスも書き込みます。値はスキーマに対して型チェックされます: リストまたはマッピングを保持するべきキー（`custom_providers`、`model.aliases`、`display.platforms`、`plugins.enabled`/`plugins.disabled`、`model_catalog.excluded_providers`、既にどれかを保持しているキー）は、単純な文字列や形の合わないリテラルを拒否し、リスト/マッピングのように見えて有効な YAML/JSON ではない値は、文字列として保存されるのではなく拒否されます — 何も書き込まれず、エラーは期待される型を名指しします。YAML/JSON のリテラルを渡してください（`hermes config set custom_providers '[{name: x, base_url: https://...}]'`）。単に `[` や `{` で始まる文字列を保存したい場合は、YAML でクォートしてください（`"'[text'"`）。`--force` は依然としてマッピングの区分全体を置き換えます。リストのスロットに非リストを渡すと上書きの手段はありません。ただし、緩く読まれるリスト（名前のリスト、`agent.disabled_toolsets`、`skills.disabled`）に対する裸の名前は、1項目のリストとして保存される例外があります。 |
| `unset <key>` | 設定キーを削除し、組み込みの既定値に戻します。`UPPER_SNAKE` の名前の場合は `.env` の項目を削除し、古い `config set` の実行が残した `config.yaml` のトップレベルの古いコピーも削除します（`get` はそのようなコピーを stale として報告します）。 |
| `path` | 設定ファイルのパスを表示します。 |
| `env-path` | `.env` ファイルのパスを表示します。 |
| `check` | 欠落または古い設定を確認します。 |
| `migrate` | 新しく導入されたオプションを対話的に追加します。 |

`config set model.provider <provider>` は `model:` ブロックを1つの経路にまとめます: 前のプロバイダから残った `model.base_url` / `model.api_mode` は、それが他のプロバイダのエンドポイントである場合、削除されます（かつ一覧に表示されます） — そうしないと、新しいプロバイダのキーが古いエンドポイントに送信され、間違ったプロバイダを名指しした認証情報エラーで失敗してしまいます。新しいプロバイダ自身のエンドポイントである URL、名前付きの `custom_providers` の項目のエンドポイント、`custom`/ローカルの別名の下にある URL はそのまま残ります。見覚えのないホスト（プロキシ、LAN サーバー）は、それでも適用され続けるという警告付きで残ります。

### キー名の中のドット {#dots-inside-key-names}

`hermes config set/get/unset` は `.` をネストの区切り文字として使いますが、実際のキー名には、モデル ID（`grok-4.6`、`glm-5.3-flash`）、Matrix のルーム ID（`!room:example.org`）、バージョン付きのプロバイダ名など、リテラルなドットを含むものが多くあります。次の2つのルールで、これらをアドレス可能にしています:

- **既存のキーはそのまま動きます。** 既存のマッピングをたどるとき、ドット区切りの残りの部分と一致する既存のリテラルキーは、分割よりも優先されます。`hermes config set providers.p.models.grok-4.6.supports_vision true` は、実際の `grok-4.6` の項目を更新します（`get`/`unset` も同じ方法で解決します）。
- **新しいドット付きキーの作成にはエスケープが必要です。** リテラルなドットはバックスラッシュでエスケープします: `hermes config set 'providers.p.models.grok-4\.7.context_length' 128000` はリテラルな `grok-4.7` キーを作成します（シェルがバックスラッシュを保持するよう、キーをクォートしてください）。

エスケープしない書き込みが、既存のドット付きの兄弟キーを隠してしまうネストされたマッピングを作ろうとする場合（例: 既存の `grok-4.6` の隣に `grok-4` を作る場合）、コマンドはエラーで失敗し、ランタイムが決して読まない幻の項目を無音で書き込むことはありません。

## `hermes pairing` {#hermes-pairing}

```bash
hermes pairing <list|approve|revoke|clear-pending>
```

| サブコマンド | 説明 |
|------------|-------------|
| `list` | 承認待ちと承認済みのユーザーを表示します。 |
| `approve <platform> <code>` | ペアリングコードを承認します。 |
| `revoke <platform> <user-id>` | ユーザーのアクセスを取り消します。 |
| `clear-pending` | 承認待ちのペアリングコードをクリアします。 |

## `hermes skills` {#hermes-skills}

```bash
hermes skills <subcommand>
```

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `browse` | スキルレジストリのページ付きブラウザです。 |
| `search` | スキルレジストリを検索します。 |
| `install` | スキルをインストールします。 |
| `inspect` | インストールせずにスキルをプレビューします。 |
| `list` | インストール済みのスキルを一覧します。 |
| `check` | インストール済みの hub スキルの upstream 更新を確認します。 |
| `update` | upstream に変更があった hub スキルを再インストールします。 |
| `audit` | インストール済みの hub スキルを再スキャンします。 |
| `uninstall` | hub からインストールしたスキルを削除します。 |
| `reset` | `user_modified` としてフラグ付けられたバンドルスキルの固定を解除し、そのマニフェスト項目をクリアします。`--restore` を付けると、ユーザーのコピーをバンドル版に置き換えます。 |
| `opt-out` | アクティブなプロファイルへのバンドルスキルのシード投入を停止します。`.no-bundled-skills` マーカーを書き込み、インストーラ、`hermes update`、その他の同期処理がバンドルスキルのシード投入をスキップするようにします。既定では安全です — ディスク上のものは何も変更されません。`--remove` を付けると、**未編集**の既存のバンドルスキル（ユーザーが編集したもの、hub からインストールしたもの、手書きのスキルは決して削除されません。まずプレビューして確認し、`--yes` でスキップ可能）も削除します。 |
| `opt-in` | `.no-bundled-skills` マーカーを削除して `opt-out` を取り消し、次回の `hermes update` でバンドルスキルが再びシード投入されるようにします。`--sync` を付けると、即座に再シード投入します。 |
| `publish` | スキルをレジストリに公開します。 |
| `snapshot` | スキルの設定をエクスポート/インポートします。 |
| `tap` | カスタムのスキルソースを管理します。 |
| `config` | プラットフォームごとの、スキルの対話的な有効/無効設定です。 |

よくある例:

```bash
hermes skills browse
hermes skills browse --source official
hermes skills search react --source skills-sh
hermes skills search https://mintlify.com/docs --source well-known
hermes skills inspect official/security/1password
hermes skills inspect skills-sh/vercel-labs/json-render/json-render-react
hermes skills install official/migration/openclaw-migration
hermes skills install skills-sh/anthropics/skills/pdf --force
hermes skills install https://sharethis.chat/SKILL.md                     # Direct URL (+ referenced support files)
hermes skills install https://example.com/SKILL.md --name my-skill        # Override name when frontmatter has none
hermes skills check
hermes skills update
hermes skills config
hermes skills reset google-workspace
hermes skills reset google-workspace --restore --yes
hermes skills opt-out                  # stop future bundled-skill seeding (nothing deleted)
hermes skills opt-out --remove --yes   # also delete UNMODIFIED bundled skills
hermes skills opt-in --sync            # undo: remove marker and re-seed now
```

補足:
- `--force` は、サードパーティ/コミュニティのスキルに対する、危険ではないポリシーブロックを上書きできます。
- `--force` は `dangerous` のスキャン判定を上書きしません。
- `--source skills-sh` は公開の `skills.sh` ディレクトリを検索します。
- `--source well-known` は、`/.well-known/skills/index.json` を公開しているサイトを Hermes に指定させます。
- `--source browse-sh` は、200以上のサイト固有ブラウザ自動化スキルを集めた [browse.sh](https://browse.sh) のカタログを検索します。識別子は `browse-sh/airbnb.com/search-listings-ddgioa` のような形になります。
- `http(s)://…/*.md` の URL を渡すと、`SKILL.md` に加えて、`references/`、`templates/`、`scripts/`、`assets/`、`examples/` の下で明示的に参照されているファイルもインストールされます。frontmatter に `name:` がなく、URL のスラッグが有効な識別子でない場合、対話的なターミナルでは名前の入力を求められます。非対話的な画面（TUI 内の `/skills install`、ゲートウェイのプラットフォーム）では代わりに `--name <x>` が必須です。

## `hermes bundles` {#hermes-bundles}

```bash
hermes bundles <subcommand>
```

スキルバンドルは、複数のスキルを1つの `/<bundle-name>` スラッシュコマンドにまとめます。バンドルを呼び出すと、参照されているすべてのスキルが1つの結合されたユーザーメッセージとしてロードされます。保存先: `~/.hermes/skill-bundles/<slug>.yaml`。YAML のスキーマと挙動については [Skill Bundles](/hermes/docs/user-guide/features/skills/#skill-bundles) を参照してください。

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `list` | インストール済みのバンドルを一覧します（サブコマンド未指定時の既定） |
| `show <name>` | 1つのバンドルの名前、説明、スキル、ファイルパスを表示します |
| `create <name>` | 新しいバンドルを作成します。`--skill <id>` を渡します（繰り返し可）。省略すると対話的に入力します。`--description`、`--instruction`、`--force` も使えます。 |
| `delete <name>` | バンドルファイルを削除します |
| `reload` | `~/.hermes/skill-bundles/` を再スキャンし、追加/削除されたバンドルを報告します |

例:

```bash
hermes bundles create backend-dev \
  --skill github-code-review \
  --skill test-driven-development \
  --skill github-pr-workflow \
  -d "Backend feature work"

hermes bundles list
hermes bundles show backend-dev
hermes bundles delete backend-dev
```

チャットセッション内では、`/bundles` がインストール済みのバンドルを一覧し、`/<bundle-name>` が1つをロードします。

## `hermes curator` {#hermes-curator}

```bash
hermes curator <subcommand>
```

curator は、エージェントが作成したスキルを定期的にレビューし、古くなったものを整理し、重複を統合し、使われなくなったスキルをアーカイブするバックグラウンドの補助モデルタスクです。バンドルスキルと hub からインストールしたスキルは決して触れられません。アーカイブは復元可能で、自動削除は起きません。

| サブコマンド | 説明 |
|------------|-------------|
| `status` | curator の状態とスキルの統計を表示します |
| `run` | 今すぐ curator のレビューを実行します（LLM のパスが終わるまでブロックします） |
| `run --background` | LLM のパスをバックグラウンドスレッドで開始し、即座に戻ります |
| `run --dry-run` | プレビューのみ — 変更なしでレビューレポートを作成します |
| `backup` | `~/.hermes/skills/` の手動 tar.gz スナップショットを取ります（curator も、実際の実行前に毎回自動的にスナップショットを取ります） |
| `rollback` | スナップショットから `~/.hermes/skills/` を復元します（既定は最新） |
| `rollback --list` | 利用可能なスナップショットを一覧します |
| `rollback --id <ts>` | ID で特定のスナップショットを復元します |
| `rollback -y` | 確認プロンプトをスキップします |
| `pause` | resume されるまで curator を一時停止します |
| `resume` | 一時停止した curator を再開します |
| `pin <skill>` | curator が自動的に遷移させないよう、スキルをピン留めします |
| `unpin <skill>` | スキルのピン留めを外します |
| `restore <skill>` | アーカイブされたスキルを復元します |
| `archive <skill>` | スキルを手動でアーカイブします |
| `prune` | curator が通常整理するスキルを手動で整理します |
| `list-archived` | アーカイブされたスキルを一覧します（`restore` で復元可能） |

新規インストールでは、最初の予約された実行は1回分の `interval_hours`（既定7日）だけ後ろにずれます — `hermes update` の後の最初の tick で、ゲートウェイが即座に整備を始めることはありません。この前に確認したい場合は `hermes curator run --dry-run` を使ってください。

挙動と設定については [Curator](/hermes/docs/user-guide/features/curator/) を参照してください。

## `hermes moa` {#hermes-moa}

名前付きの Mixture of Agents プリセットを設定します。プリセットは、すべてのモデルピッカーの `Mixture of Agents` プロバイダの下に選択可能なモデルとして表示されます。`/moa <prompt>` は1つのプロンプトを既定のプリセットで実行します。

```bash
hermes moa list
hermes moa configure [name]
hermes moa delete <name>
```

`hermes moa configure` は、参照モデルとアグリゲータそれぞれについて、Hermes のプロバイダ→モデルピッカーを再利用します。プリセットは実行モードの設定であり、プライマリのモデルやプロバイダではありません。

## `hermes fallback` {#hermes-fallback}

```bash
hermes fallback <subcommand>
```

フォールバックプロバイダのチェーンを管理します。フォールバックプロバイダは、プライマリモデルがレートリミット、過負荷、接続エラーで失敗したときに順に試されます。

| サブコマンド | 説明 |
|------------|-------------|
| `list`（別名: `ls`） | 現在のフォールバックチェーンを表示します（サブコマンド未指定時の既定） |
| `add` | プロバイダ + モデルを選び（`hermes model` と同じピッカー）、チェーンに追加します |
| `remove`（別名: `rm`） | チェーンから削除する項目を選びます |
| `clear` | フォールバックの項目をすべて削除します |

[Fallback Providers](/hermes/docs/user-guide/features/fallback-providers/) を参照してください。

## `hermes hooks` {#hermes-hooks}

```bash
hermes hooks <subcommand>
```

`~/.hermes/config.yaml` で宣言されたシェルスクリプトフックを確認し、合成ペイロードに対してテストし、`~/.hermes/shell-hooks-allowlist.json` にある初回使用時の同意アローリストを管理します。

| サブコマンド | 説明 |
|------------|-------------|
| `list`（別名: `ls`） | マッチャー、タイムアウト、同意状態付きで設定済みフックを一覧します |
| `test <event>` | `<event>` にマッチするすべてのフックを、合成ペイロードに対して発火します |
| `revoke`（別名: `remove`, `rm`） | コマンドのアローリスト項目を削除します（次回の再起動で反映されます） |
| `doctor` | 設定済みの各フックを確認します: 実行権限、アローリスト、mtime のずれ、JSON の妥当性、合成実行のタイミング |

イベントのシグネチャとペイロードの形については [Hooks](/hermes/docs/user-guide/features/hooks/) を参照してください。

## `hermes memory` {#hermes-memory}

```bash
hermes memory <subcommand>
```

外部メモリプロバイダのプラグインをセットアップ・管理します。同梱のプロバイダ: honcho、openviking、mem0、holographic、retaindb、byterover、supermemory。hindsight（プラグインカタログ）は `hermes plugins install hindsight` のあとで使えます。同時にアクティブにできる外部プロバイダは1つだけです。組み込みメモリ（MEMORY.md/USER.md）は常にアクティブです。

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `setup` | 対話的なプロバイダ選択と設定です。 |
| `status` | 現在のメモリプロバイダの設定を表示します。 |
| `off` | 外部プロバイダを無効化します（組み込みのみになります）。 |

:::info プロバイダ固有のサブコマンド
外部メモリプロバイダがアクティブなとき、そのプロバイダ固有の管理用に独自のトップレベル `hermes <provider>` コマンドが登録される場合があります（例: Honcho がアクティブなときの `hermes honcho`）。無効なプロバイダはそのサブコマンドを公開しません。現在何が組み込まれているかは `hermes --help` で確認してください。
:::

## `hermes acp` {#hermes-acp}

```bash
hermes acp
```

エディタ連携用に、Hermes を ACP（Agent Client Protocol）の stdio サーバーとして起動します。

関連するエントリポイント:

```bash
hermes-acp
python -m acp_adapter
```

先にサポートをインストールしてください:

```bash
cd ~/.hermes/hermes-agent && python -c "import pm; pm.sync_venv(['acp'], explicit=True)"
```

[ACP Editor Integration](/hermes/docs/user-guide/features/acp/) と [ACP Internals](/hermes/docs/developer-guide/acp-internals/) を参照してください。

## `hermes mcp` {#hermes-mcp}

```bash
hermes mcp <subcommand>
```

MCP（Model Context Protocol）サーバーの設定を管理し、Hermes を MCP サーバーとして実行します。

| サブコマンド | 説明 |
|------------|-------------|
| *(なし)* または `picker` | 対話的なカタログピッカー — Nous 承認済みの MCP を参照してインストール/有効化/無効化します。 |
| `catalog` | Nous 承認済みの MCP を一覧します（プレーンテキスト、スクリプト可）。 |
| `install <name>` | カタログの項目をインストールします（例: `hermes mcp install deepwiki`）。 |
| `serve [-v\|--verbose]` | Hermes を MCP サーバーとして実行します — 会話を他のエージェントに公開します。 |
| `add <name> [--url URL] [--command CMD] [--auth oauth\|header] [--args ...]` | 自動ツール検出付きで、カスタムの MCP サーバーを追加します。`--args` は残りの argv を stdio コマンドに渡すので、最後に置いてください。 |
| `remove <name>`（別名: `rm`） | 設定から MCP サーバーを削除します。 |
| `list`（別名: `ls`） | 設定済みの MCP サーバーを一覧します。 |
| `test <name>` | MCP サーバーへの接続をテストします。 |
| `configure <name>`（別名: `config`） | サーバーのツール選択を切り替えます。 |
| `login <name>` | OAuth ベースの MCP サーバーの再認証を強制します。 |

[MCP Config Reference](/hermes/docs/reference/mcp-config-reference/)、[Use MCP with Hermes](/hermes/docs/guides/use-mcp-with-hermes/)、[MCP Server Mode](/hermes/docs/user-guide/features/mcp/#running-hermes-as-an-mcp-server) を参照してください。

## `hermes plugins` {#hermes-plugins}

```bash
hermes plugins [subcommand]
```

一般的なプラグイン、メモリプロバイダ、コンテキストエンジンを1か所で統合管理します。サブコマンドなしで `hermes plugins` を実行すると、2つの区分を持つ複合的な対話画面が開きます:

- **General Plugins** — インストール済みプラグインを有効/無効にするマルチセレクトのチェックボックスです
- **Provider Plugins** — Memory Provider と Context Engine の単一選択の設定です。区分の上で ENTER を押すとラジオピッカーが開きます。

| サブコマンド | 説明 |
|------------|-------------|
| *(なし)* | 複合的な対話 UI — 一般プラグインの切り替え + プロバイダプラグインの設定です。 |
| `install <identifier> [--force] [--ref COMMIT_SHA] [--allow-removed]` | Hermes プラグインカタログ（そのままのエントリ名）、Git URL、または `owner/repo` の省略形からプラグインをインストールします。カタログ名は、レビュー済みの40桁の16進数コミット SHA に解決され、宣言された機能を表示します。ソース、チェックアウトしたリビジョン、入れ子になったカタログの出自のブロックは、インストーラの `plugins/.install-metadata.json` に記録されます。プラグインディレクトリ内の `.hermes-catalog.json` のコピーは利便性のためだけのもので、決して信頼されません。生の URL はカスタム（未レビュー）ソースとしてフラグ付けされます。`--ref` は完全な SHA でカスタムのピンを選び、実際にチェックアウトした SHA を記録します。`--allow-removed`（危険）は、インストール時に削除済みプラグインのブロックリストを回避し、そのインストールを更新・有効化・ロード時の kill-list チェックからも除外します。 |
| `search [term] [--json]` | Hermes プラグインカタログを検索します（エントリ名、説明、宣言されたツールにマッチします。`term` を省略するとすべて一覧します）。カタログはリポジトリ内（`plugin-catalog/`）でキュレーションされ、6時間キャッシュで生きているリポジトリから更新され、オフライン時はリポジトリ内のコピーにフォールバックします。カタログ化されている ≠ 監査済みです — 受け入れはエントリをレビューするもので、コードをレビューするものではありません。 |
| `update <name>` | カタログからのインストールは、レビュー済みのカタログの SHA にピンを付け直します。カスタムの Git インストールは、記録されたソースやフィードから更新します。PM は、コードを公開する前に有効なプラグインの依存関係を検証します。明示したカスタムのピンは、`install --force --ref <new-commit>` を使ったときだけ動きます。 |
| `remove <name>`（別名: `rm`, `uninstall`） | インストール済みのプラグインを削除します。 |
| `enable <name>` | 無効化されたプラグインを有効化します。 |
| `disable <name>` | プラグインを削除せずに無効化します。 |
| `list`（別名: `ls`） | インストール済みのプラグインを有効/無効状態付きで一覧します。 |
| `doctor [path-or-id] [--ci]` | 実際のマニフェストパーサ、ローダー、登録経路を通して、ネイティブなプラグインを検証します。`--ci` はエラーがあれば 1 で終了します。 |
| `pack install <path-or-url> [--force]` | プラグインパック（`hermes-pack.yaml`）をインストールします — それぞれが正確な40文字のコミット SHA にピン留めされた、宣言的なプラグイン群です。必須のレビュー画面（すべてのプラグイン、ソース、ピン留めされた ref、宣言された機能）を表示し、パックの内容に対して1回の確認を求め、その後は通常のピン留めインストールを実行します。各プラグインが宣言する機能は、それぞれ通常のプラグイン単位の同意を通ります — パックが一括で許可することはありません。部分的な失敗はプラグインごとに報告され、どれかが失敗すると非ゼロで終了します。対話モードのみです（`--yes` はありません）。 |
| `pack export [--enabled-only] [--name NAME]` | 現在のインストールから、stdout にパックの YAML を出力します: git でインストールされた各プラグインのリポジトリ + 正確な SHA と、機密情報を除いた `plugins.entries` の設定です。ローカルのみのプラグイン（git の出自がないもの）は、インストール可能な項目としてではなく、警告コメントとして一覧されます。シークレット、機能の許可、`allow_*` ゲートは常に取り除かれます。 |
| `pack show <path-or-url>` | dry-run: 何もインストールせずに、パックをパース・検証・表示します。 |

プロバイダプラグインの選択は `config.yaml` に保存されます:
- `memory.provider` — アクティブなメモリプロバイダ（空 = 組み込みのみ）
- `context.engine` — アクティブなコンテキストエンジン（`"compressor"` = 組み込みの既定値）

一般プラグインの無効化リストは `config.yaml` の `plugins.disabled` に保存されます。
Git によるインストールも、プロファイルローカルの `plugins/.install-metadata.json` サイドカーに、正規のソース、インストールされた正確なリビジョン、ピンの状態だけを記録します。プラグインの設定、環境変数の値、シークレット、機能の許可は含まれません。

[Plugins](/hermes/docs/user-guide/features/plugins/) と [Build a Hermes Plugin](/hermes/docs/developer-guide/plugins/) を参照してください。

## `hermes tools` {#hermes-tools}

```bash
hermes tools [--summary]
```

| オプション | 説明 |
|--------|-------------|
| `--summary` | 現在の有効ツールの概要を表示して終了します。 |

`--summary` を指定しない場合、プラットフォームごとの対話的なツール設定 UI が起動します。

## `hermes computer-use` {#hermes-computer-use}

```bash
hermes computer-use <subcommand>
```

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `install` | upstream の cua-driver インストーラを実行します（macOS、Windows、Linux）。 |
| `install --upgrade` | cua-driver がすでに PATH 上にあっても、インストーラを再実行します。upstream のスクリプトは常に最新のリリースを取得するため、これはその場でのアップグレードになります。 |
| `status` | `cua-driver` が `$PATH` 上にあるか、どのバージョンがインストールされているかを表示します。 |
| `doctor [--include CHECK] [--skip CHECK] [--json]` | cua-driver のヘルスレポートを実行し、そのプラットフォームチェックを表示します。 |
| `permissions status [--json]` | macOS の Accessibility と Screen Recording の許可状況を報告します。 |
| `permissions grant` | macOS に、Cua Driver への Accessibility と Screen Recording の許可を求めます。 |

`hermes computer-use install` は、`computer_use` ツールセットが使う [cua-driver](https://github.com/trycua/cua) バイナリをインストールする安定したエントリポイントです。`hermes tools` で初めて Computer Use を有効にしたときに実行されるのと同じ upstream のインストーラを実行するので、ツールトグルがそれをトリガーしなかった場合（例: 再訪ユーザーのセットアップ）に、インストールを再実行するために安全に使えます。

cua-driver が既に存在する場合、Hermes はそのバージョンとランタイムのマニフェストを確認します。0.20.0 以上と互換性のあるインストールはそのまま維持されます。古い、または不完全な標準インストールは、現行の upstream インストーラで修復されます。Hermes は `HERMES_CUA_DRIVER_CMD` で選ばれたカスタムバイナリを決して置き換えません。そのバイナリは直接更新するか、上書き設定を削除してください。修復が必要な場合、`hermes computer-use status` がそれを報告します。

組み込みの `computer_use` ツールセットが、推奨される Hermes の統合方法です。生の Cua MCP ツールを登録するのは、Cua の低レベルなツールの語彙が必要なときの代替手段です。`cua-driver skills install` は Hermes を検出し、Cua のスキルパックを Hermes のスキルディレクトリに自動的にリンクします。

権限モードとケーパビリティマニフェストの承認は、ランタイムの起動に属します。bounded モードでは、Hermes は Cua の正規の `--capability-manifest` と `--approve-capability-manifest` フラグを渡します。すべての MCP トランスポートは、そのランタイム内に専用のライフサイクルセッションを持ちます。公開されるセッション名は、カーソルとセッションの状態を表すラベルであり、ランタイムを所有したり共有したりするものではありません。

`hermes update` は、cua-driver が PATH 上にある場合、更新の最後に upstream のインストーラを自動的に再実行するため、ほとんどのユーザーは `--upgrade` を手動で呼ぶ必要はありません。次回の Hermes の更新を待たずに、upstream が出した修正を今すぐ使いたいときに使ってください。

## `hermes pets` {#hermes-pets}

```bash
hermes pets <list|install|select|show|off|scale|remove|doctor>
```

[Petdex](https://github.com/crafter-station/petdex) は、コーディングエージェント向けのアニメーションスプライトペットを集めた公開ギャラリーです。1つをインストールすると、Hermes は CLI、TUI、デスクトップアプリ全体で、エージェントの活動に反応するそのペットを表示します。

| サブコマンド | 説明 |
|------------|-------------|
| `list` | petdex ギャラリーを閲覧します。 |
| `install` | ギャラリーからペットをインストールします。 |
| `select` | アクティブなペットを設定します（`display.pet.*` に書き込みます）。 |
| `show` | アクティブなペットをターミナルでアニメーション表示します。 |
| `off` | ペット表示を無効化します。 |
| `scale` | ペットのサイズをどこでも変更します（`display.pet.scale`）。 |
| `remove` | インストール済みのペットを削除します。 |
| `doctor` | ペットの設定とターミナルのグラフィックスサポートを確認します。 |

テキストによる説明から全く新しいペットを生成することもできます。`/hatch` スラッシュコマンドを使ってください。[Pets](/hermes/docs/user-guide/features/pets/) を参照してください。

## `hermes sessions` {#hermes-sessions}

```bash
hermes sessions <subcommand>
```

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `list` | 直近のセッションを一覧します。 |
| `browse` | 検索・再開機能付きの対話的セッションピッカーです。各行には、セッションの最終メッセージから導かれるライフサイクルステータスタグ（`done` / `intr` / `err` / `empty`）とメッセージ数が表示されます。ハイライトされた行（検索フィルタが空のとき）で `d` を押すと、y/N の確認後にそのセッションを削除します。フィルタが有効なときは、`d` は検索に入力されます。 |
| `export <output> [--session-id ID]` | セッションを JSONL にエクスポートします。 |
| `delete <session-id>` | 1つのセッションを削除します。 |
| `prune` | フィルタに一致するセッションを削除します: 時間範囲 `--older-than`/`--newer-than`/`--before`/`--after`（`5h`/`2d` のような期間、裸の日数、または ISO タイムスタンプ）；属性 `--source`、`--title`、`--model`、`--provider`、`--branch`、`--end-reason`、`--user`、`--chat-id`、`--chat-type`、`--cwd`；数値範囲 `--min/--max-messages`、`--min/--max-tokens`、`--min/--max-cost`、`--min/--max-tool-calls`；加えて `--include-archived`、`--dry-run`、`--yes`。既定: 90日より古いもの。 |
| `archive` | `prune` と同じフィルタに一致するセッションを一括アーカイブします（削除せず、静かに隠すだけ）。少なくとも1つのフィルタが必要です。 |
| `stats` | セッションストアの統計を表示します。 |
| `rename <session-id> <title>` | セッションのタイトルを設定・変更します。 |
| `optimize` | ディスク容量を回収します: FTS5 インデックスのセグメントを統合 + VACUUM します。破壊的ではありません — セッションデータは変わりません。 |
| `optimize-storage` | 全文検索インデックスを、コンパクトな v23 の external-content レイアウトに移行します。大きなデータベースでは `state.db` の大部分を回収できます。 |
| `repair` | 壊れた `state.db` のスキーマを修復します（例: `table messages_fts already exists`）。これにより隠れていたセッションが再び現れます。先にバックアップが作られます。 |
| `repair-routing` | ルーティングの identity を失って、セッション行の中に取り残されたゲートウェイの会話を再接続します（再起動後にチャットが「時間を遡って」しまう現象）。既定では dry-run です。`--apply` で採用を実行します（先にゲートウェイを停止してください）。`--max-gap-seconds N` で連続性のウィンドウを調整できます。曖昧でないケースだけが修復されます。詳細は [Sessions → Repair Stranded Gateway Sessions](/hermes/docs/user-guide/sessions/#repair-stranded-gateway-sessions) を参照してください。 |
| `repair-profiles` | 間違ったプロファイルに紛れ込んだ、セッション・ルーティング・Telegram のトピック・音声モードの状態を整えます（別プロファイルのストアにある行、セッションキーと矛盾するラベル、プロファイルを跨いで参照している親リンク、削除済みプロファイルのインデックス行）。既定では dry-run です。`--apply` は、各ストアをスナップショットした後に修復を実行します（先にゲートウェイを停止してください）。`--legacy-main rekey\|move` は、名前付きプロファイルのストア内にある `agent:main` 行の扱いを決めます。自動化には `--json` を使います。詳細は [Sessions → Repair State Crossed Between Profiles](/hermes/docs/user-guide/sessions/#repair-state-crossed-between-profiles) を参照してください。 |
| `recover` | 壊れた `state.db` を、オフラインかつ非破壊的な方法で、別のクリーンなデータベースへ復旧します。 |
| `retitle-skills` | `/skill` で開いたセッションのタイトルを、ユーザーが実際に入力した内容に基づいて再生成します。`--apply` を渡さない限り、変更内容を一覧するだけです。 |

## `hermes insights` {#hermes-insights}

```bash
hermes insights [--days N] [--source platform]
```

| オプション | 説明 |
|--------|-------------|
| `--days <n>` | 直近 `n` 日を分析します（既定: 30）。 |
| `--source <platform>` | `cli`、`telegram`、`discord` などのソースでフィルタします。 |

## `hermes claw` {#hermes-claw}

```bash
hermes claw migrate [options]
```

OpenClaw のセットアップを Hermes に移行します。`~/.openclaw`（またはカスタムパス）から読み込み、`~/.hermes` に書き込みます。古いディレクトリ名（`~/.clawdbot`、`~/.moltbot`）や設定ファイル名（`clawdbot.json`、`moltbot.json`）も自動的に検出します。

| オプション | 説明 |
|--------|-------------|
| `--dry-run` | 何も書き込まずに、移行される内容をプレビューします。 |
| `--preset <name>` | 移行プリセット: `full`（互換性のあるすべての設定）または `user-data`（インフラ設定を除く）。どちらのプリセットもシークレットはインポートしません — `--migrate-secrets` を明示的に渡してください。 |
| `--overwrite` | 競合時に既存の Hermes のファイルを上書きします（既定: 計画に競合がある場合は適用を拒否します）。 |
| `--migrate-secrets` | 移行に API キーを含めます。`--preset full` でも必須です。 |
| `--no-backup` | 移行前の `~/.hermes/` の zip スナップショットをスキップします（既定では、適用前に単一の復元ポイント用アーカイブが `~/.hermes/backups/pre-migration-*.zip` に書き込まれ、`hermes import` で復元できます）。 |
| `--source <path>` | カスタムの OpenClaw ディレクトリ（既定: `~/.openclaw`）。 |
| `--workspace-target <path>` | ワークスペースの指示（AGENTS.md）の対象ディレクトリです。 |
| `--skill-conflict <mode>` | スキル名の衝突の扱い: `skip`（既定）、`overwrite`、または `rename`。 |
| `--yes` | 確認プロンプトをスキップします。 |

### 何が移行されるか {#what-gets-migrated}

移行は、persona、メモリ、スキル、モデルプロバイダ、メッセージングプラットフォーム、エージェントの動作、セッションポリシー、MCP サーバー、TTS など、30以上の区分をカバーします。項目は Hermes の相当物へ**直接インポート**されるか、手動レビュー用に**アーカイブ**されます。

**直接インポートされるもの:** SOUL.md、MEMORY.md、USER.md、AGENTS.md、スキル（4つのソースディレクトリ）、既定モデル、カスタムプロバイダ、MCP サーバー、メッセージングプラットフォームのトークンとアローリスト（Telegram、Discord、Slack、WhatsApp、Signal、Matrix、Mattermost）、エージェントの既定値（推論エフォート、圧縮、人間らしい遅延、タイムゾーン、サンドボックス）、承認ルール、TTS の設定、ブラウザ設定、ツール設定、実行タイムアウト、コマンドのアローリスト、ゲートウェイの設定、3つのソースからの API キー。

**手動レビュー用にアーカイブされるもの:** cron ジョブ、プラグイン、フック/webhook、メモリバックエンド（QMD）、スキルレジストリの設定、UI/identity、ロギング、マルチエージェントのセットアップ、チャンネルの紐付け、IDENTITY.md、TOOLS.md、HEARTBEAT.md、BOOTSTRAP.md。

**API キーの解決**は、優先順に3つのソースを確認します: 設定値 → `~/.openclaw/.env` → `auth-profiles.json`。すべてのトークンフィールドは、プレーンな文字列、環境変数テンプレート（`${VAR}`）、SecretRef オブジェクトのいずれにも対応します。

完全な設定キーの対応表、SecretRef の扱いの詳細、移行後のチェックリストについては **[full migration guide](/hermes/docs/guides/migrate-from-openclaw/)** を参照してください。

### 例 {#examples}

```bash
# Preview what would be migrated
hermes claw migrate --dry-run

# Full migration (all compatible settings, no secrets)
hermes claw migrate --preset full

# Full migration including API keys
hermes claw migrate --preset full --migrate-secrets

# Migrate user data only (no secrets), overwrite conflicts
hermes claw migrate --preset user-data --overwrite

# Migrate from a custom OpenClaw path
hermes claw migrate --source /home/user/old-openclaw
```

## `hermes import-agent` {#hermes-import-agent}

```bash
hermes import-agent [claude-code|codex] [options]
```

**Claude Code**（`~/.claude`）または **OpenAI Codex CLI**（`~/.codex`）のセットアップを Hermes にインポートします。`CLAUDE.md`/`AGENTS.md` の指示をメモリの項目に、`Bash(...)` 権限の許可/拒否ルールを `command_allowlist`/`approvals.deny` に、MCP サーバーを `config.yaml` の `mcp_servers` に、スキルディレクトリを `~/.hermes/skills/` にマッピングします。常に適用前にプレビューを表示し、API キーと認証情報は一切インポートされません。

| オプション | 説明 |
| --- | --- |
| `agent` | `claude-code` または `codex`（既定: 自動検出）。 |
| `--source <path>` | カスタムのソースディレクトリ（既定: `~/.claude` または `~/.codex`）。 |
| `--dry-run` | プレビューのみ — 何も書き込みません。 |
| `--overwrite` | 競合する MCP サーバー/スキルを置き換えます（既定: スキップ）。 |
| `--yes`, `-y` | 確認プロンプトをスキップします。 |
| `--sync` | 最後のインポート以降にファイルが変更された、以前インポート済みのすべてのソースを再インポートします。プロンプトは出ません。プレビューには `--dry-run` と組み合わせてください。 |

インポートが成功するたびに、そのソースが `~/.hermes/import-sync.json` に登録されます。`hermes import-agent --sync` は、その後、ファイルが変更された登録済みのソースを再インポートします（インポート済みの Claude Code / Codex のセットアップを最新に保つ、cron に適した方法です）。マッピング表の全体については **[import guide](/hermes/docs/user-guide/import-from-other-agents/)** を参照してください。

## `hermes serve` {#hermes-serve}

```bash
hermes serve [options]
```

Hermes の**バックエンドサーバー**を起動します — [デスクトップアプリ](/hermes/docs/user-guide/desktop/)やリモートクライアントが接続する JSON-RPC/WebSocket ゲートウェイです。これは `hermes dashboard` が実行するのと同じサーバーですが、**ヘッドレス**です: ブラウザ UI を一切開きません。デスクトップアプリは自前で `hermes serve` バックエンドを起動します。リモートホストでヘッドレスなバックエンドが欲しいときは、このコマンドを直接使ってください。下の `hermes dashboard` と同じ `--host` / `--port` / `--insecure` / `--skip-build` / `--stop` / `--status` のオプションを受け付けます（ループバック以外へのバインドは同じ認証ゲートを起動します）。`[web]` エクストラが必要です。埋め込みの Chat ソケットは、POSIX ホストではさらに `[pty]` を必要とします。

**ポートの競合:** 要求されたポート（既定 `9119`）が別のプロセス（例: 2つ目の `hermes serve` やゲートウェイ）に既に取られている場合、このコマンドは機械可読なセンチネル行 `BACKEND_PORT_IN_USE port=<port>` を stdout に、想定される保持者を名指しした人間向けのヒントを出力し、一般的なエラーの代わりにコード **75**（`EX_TEMPFAIL`）で終了します — スクリプトやデスクトップアプリが「ポートが使用中」と「バックエンドが壊れている」を区別できるようにするためです。`--port 0` を渡すと、空いているエフェメラルポートにバインドします（起動に成功すると、`HERMES_BACKEND_READY port=<port>` で選ばれたポートを知らせます）。

## `hermes dashboard` {#hermes-dashboard}

```bash
hermes dashboard [options]
```

Web ダッシュボードを起動し、設定、API キー、セッションを管理します。ヘッドレスなバックエンドが必要な場合は [`hermes serve`](#hermes-serve) を使ってください。FastAPI、Uvicorn、プラットフォームの PTY ヘルパーは中核の依存関係に含まれます。`web` の extra は HTTP スタックの厳密なバージョン制約を加えるもので、標準の PM のセットアップでは `all` を通して選ばれます。依存関係が壊れた場合は `hermes pm repair` を実行してください。埋め込みの Chat タブには、Linux、macOS、WSL2 のような POSIX の PTY 環境が必要です。[Web Dashboard](/hermes/docs/user-guide/features/web-dashboard/) を参照してください。

| オプション | 既定値 | 説明 |
|--------|---------|-------------|
| `--port` | `9119` | Web サーバーを実行するポートです |
| `--host` | `127.0.0.1` | バインドアドレスです |
| `--no-open` | — | ブラウザを自動的に開きません |
| `--insecure` | off | **非推奨 / no-op です。** かつてはループバック以外へのバインドで認証をバイパスしていました。2026年6月の強化以降、公開バインドは*常に*認証プロバイダ（パスワードまたは OAuth）を必要とします。ローカルに留めるには `127.0.0.1` にバインドしてトンネルしてください。 |
| `--skip-build` | off | Web UI のビルドステップをスキップし、既存の `dist` ディレクトリをそのまま配信します。npm が使えない非対話的な環境（Windows のスケジュールタスク、CI）に便利です。事前ビルドは `cd web && npm run build` で行ってください。 |
| `--isolated` | off | 名前付きプロファイル（`worker dashboard`）から起動した場合、マシンダッシュボードへルーティングする代わりに専用のプロファイル別サーバーを実行します。 |
| `--stop` | — | この Hermes ホームの、実行中の `hermes dashboard` / `hermes serve` バックエンドを停止して終了します（`-p <profile>` / `HERMES_HOME` がどれを選ぶか決めます。他のプロファイルのバックエンド、マシン上の他のインストール、そして自分がコマンドを入力したシェルは一切触れられません。所有者を読み取れないバックエンドはそのままにされます）。SIGTERM、10秒の猶予、その後 SIGKILL です。バックエンドより長生きするホスト型 Chat TUI も停止されます（そうしないと削除済みの `state.db-wal` を開いたままにし、次の起動をブロックしてしまいます）。ダッシュボードから起動したメッセージングゲートウェイの bot は触れられません。 |
| `--status` | — | 実行中の `hermes dashboard` プロセスを一覧して終了します。 |

### `hermes dashboard register` {#hermes-dashboard-register}

このインストールを、あなたの Nous Portal アカウントにセルフホストのダッシュボードとして登録します。OAuth クライアントを作成し、`HERMES_DASHBOARD_OAUTH_CLIENT_ID` を `~/.hermes/.env` に書き込み、ログインゲートを起動する方法を表示します。ログイン済み（`hermes setup`）である必要があります。

| オプション | 説明 |
|--------|-------------|
| `--name` | ダッシュボードの人間向けラベルです（既定: 自動生成）。 |
| `--redirect-uri` | 公開の HTTPS OAuth リダイレクト URI です（例: `https://hermes.example.com/auth/callback`）。localhost のみで使う場合は省略してください。 |
| `--portal-url` | 登録用の Nous Portal のベース URL を上書きします（既定: ログインした Portal）。`HERMES_DASHBOARD_PORTAL_URL` でも設定できます。 |

```bash
# Default — opens browser to http://127.0.0.1:9119
hermes dashboard

# Custom port, no browser
hermes dashboard --port 8080 --no-open

# From a profile alias — routes to the machine dashboard with the
# profile preselected in the sidebar switcher (attach if running)
worker dashboard
```

## `hermes profile` {#hermes-profile}

```bash
hermes profile <subcommand>
```

プロファイルを管理します — それぞれが独自の設定、セッション、スキル、ホームディレクトリを持つ、複数の独立した Hermes インスタンスです。

| サブコマンド | 説明 |
|------------|-------------|
| `list` | すべてのプロファイルを一覧します。 |
| `use <name>` | 既定のプロファイルを固定して設定します。 |
| `create <name> [--clone] [--clone-all] [--clone-from <source>] [--no-alias]` | 新しいプロファイルを作成します。`--clone` は、アクティブなプロファイルから設定、`.env`、`SOUL.md`、スキル、キュレーションされた `MEMORY.md`/`USER.md` のメモリファイルをコピーします。`--clone-all` はすべての状態をコピーします。`--clone-from` はソースのプロファイルを指定し、`--clone-all` と組み合わせない限り設定のクローンを暗黙に含みます。 |
| `delete <name> [-y]` | プロファイルを削除します。 |
| `show <name>` | プロファイルの詳細（ホームディレクトリ、設定など）を表示します。 |
| `alias <name> [--remove] [--name NAME]` | プロファイルへ素早くアクセスするためのラッパースクリプトを管理します。 |
| `rename <old> <new>` | プロファイルをリネームします。 |
| `export <name> [-o FILE]` | プロファイルを `.tar.gz` アーカイブにエクスポートします（ローカルバックアップ）。 |
| `import <archive> [--name NAME]` | `.tar.gz` アーカイブからプロファイルをインポートします（ローカルリストア）。 |
| `install <source> [--name N] [--alias] [--force] [-y]` | git URL またはローカルディレクトリから、プロファイルのディストリビューションをインストールします。 |
| `update <name> [--force-config] [-y]` | ディストリビューションを再取得します。ユーザーデータ（メモリ、セッション、認証情報）は保持されます。 |
| `info <name>` | プロファイルのディストリビューションマニフェスト（バージョン、要件、ソース）を表示します。 |

例:

```bash
hermes profile list
hermes profile create work --clone
hermes profile create work --clone --sync-imports   # also carry over the import-agent sync manifest
hermes profile use work
hermes profile alias work --name h-work
hermes profile export work -o work-backup.tar.gz
hermes profile import work-backup.tar.gz --name restored
hermes profile install github.com/user/my-distro --alias
hermes profile update work
hermes -p work chat -q "Hello from work profile"
```

## `hermes completion` {#hermes-completion}

```bash
hermes completion [bash|zsh|fish]
```

シェル補完スクリプトを stdout に出力します。Hermes のコマンド、サブコマンド、プロファイル名のタブ補完のために、その出力をシェルのプロファイルに読み込んでください。

例:

```bash
# Bash
hermes completion bash >> ~/.bashrc

# Zsh
hermes completion zsh >> ~/.zshrc

# Fish
hermes completion fish > ~/.config/fish/completions/hermes.fish
```

## `hermes pm` {#hermes-pm}

ピン留めしたツール、Python の依存関係の環境、そしてそれらの診断を管理します。
このコマンドは Hermes のアプリケーションそのものは更新しません。

```bash
hermes pm --help
hermes pm doctor
hermes pm status
hermes pm repair
hermes pm install
hermes pm install chromium
```

ソースから開発する場合は、セットアップのスクリプトを一度実行し、そのあと `source ./activate`、PowerShell なら `. .\activate.ps1` で
インストールした環境を有効化します。
`deactivate` で元のシェルの環境に戻せます。準備、日常のコマンド、依存関係の更新、テスト環境については、
[開発者向けのワークフロー](/hermes/docs/reference/package-management/#developer-workflow)を参照してください。

すべてのサブコマンド、ソース版とバンドル版の動きの違い、遅延インストールの方針、メンテナー向けのコマンドは、
[パッケージ管理](/hermes/docs/reference/package-management/)を参照してください。

## `hermes update` {#hermes-update}

```bash
hermes update [--gateway] [--check] [--plan] [--no-backup] [--backup] [--yes]
```

受け入れ済みのソースのチェックアウトを更新し、PM を通して依存関係を用意します。
更新を適用せずに、設定されたソースの対象と比べるには `--check` を使います。
デスクトップのバンドル、Docker、Nix、Termux のパッケージは、それぞれ外部の更新の仕組みが引き続き担当します。
[更新とアンインストール](/hermes/docs/getting-started/updating/) を参照してください。

`hermes update` は、設定された更新用ブランチ（既定: `main`）を pull します。チェックアウトが別のブランチにある場合、Hermes は pull の前に更新用ブランチをチェックアウトすることがあります。更新の自動 stash フローの外にブランチ上の作業を残しておきたい場合は、更新前にコミットしてください。

| オプション | 説明 |
|--------|-------------|
| `--install-id` | このインストールの識別子とパスを表示して終了します。 |
| `--set-channel CHANNEL` | 更新は適用せずに、このソースのインストールに `main`、`stable`、`canary` のいずれかを保存します。バンドル版のアプリケーションはビルドのチャンネルが固定なので、チャンネルの変更を拒否します。 |
| `--channel CHANNEL` | この実行に限ってソースのチャンネルを選びます。 |
| `--branch NAME` | この実行に使うソースのブランチを選びます。ソースのチャンネルの選択より優先されます。 |
| `--gateway` | メッセージングの `/update` コマンドが使う内部モードです。プロンプトと進捗のストリーミングに、ターミナルの stdin を読む代わりに、ファイルベースの IPC を使います。ゲートウェイの再起動フラグではありません。 |
| `--check` | pull・依存関係のインストール・何かの再起動をせずに、更新が利用可能かどうかを確認します。 |
| `--plan` | 何も変更せずに更新の計画を表示して終了します: インストールの種類（git/Docker/Nix/apt）、すべてのプロファイルで実行中のすべての Hermes サービスとそのスーパーバイザおよび実行中のコードバージョン、それぞれがどう再起動されるか。イメージ管理やパッケージ管理のインストールでは、代わりに正しい外部の更新コマンドが表示されます。読み取り専用です。 |
| `--no-backup` | この実行での、すべての更新前バックアップ（クイックな状態スナップショットとフル zip の両方）をスキップします。`updates.pre_update_backup` の設定に関わらずスキップします。 |
| `--backup` | この実行で**フル**の更新前バックアップを強制します: クイックな状態スナップショットに加え、`HERMES_HOME` 全体（設定、認証、セッション、スキル、ペアリングデータ）の完全な zip です。既定のモードは `quick` です — 軽量な状態スナップショットのみです。永続的なモードは `config.yaml` の `updates.pre_update_backup: quick | full | off` で設定してください。 |
| `--yes`, `-y` | 設定の移行やスタッシュの復元といった対話プロンプトに対して、yes を仮定します。API キーの入力はスキップされます。それらは別途 `hermes config migrate` を実行してください。 |

追加の挙動:

- **ゲートウェイの再起動。** 更新の成功後、Hermes は更新対象のホーム（そのルートと、配下のすべての `profiles/<name>`）で実行中のゲートウェイプロファイルをすべて自動的に再起動しようとし、新しいコードを反映させます。同じマシン上でも別の `HERMES_HOME` に属するゲートウェイや `hermes-gateway*` サービス（別のインストールや、`hermes update` を実行している一時的なホーム）は、出力に名前を示したうえで手を付けずに残します。更新を適用せずにゲートウェイだけ再起動したいときは `hermes gateway restart` を使ってください。
- **再起動フェーズの復旧。** 新しく取得したツリーをインポート中に、プロセス内の再起動フェーズが中断された場合、監視下にあるゲートウェイプロファイルは、クリーンな Python プロセスを通じて再試行されます。systemd（`systemctl --user is-active`）によって独立に確認された再起動だけが verified として報告されます。単に終了コード 0 を返しただけの再起動は `relaunch_attempted` として記録され、それでも更新は保守的に失敗として扱われます。手動のゲートウェイと serve/dashboard のランタイムは、再起動の権限なしに強制終了されることはありません。それらは理由付きでスキップとして記録され、正確な再起動コマンドと共に不完全な更新レポートに残ります。
- **更新レシート + フリートのバージョン確認。** 各実行は、`~/.hermes/logs/update_receipts/` に機械可読なレシートを書き込みます（更新前のフリート計画、各ステップ、理由付きのスキップ、再起動の結果。`latest.json` は最新のものを指します）。再起動フェーズの後、アップデータは各稼働中のゲートウェイの実行中コードを更新後のチェックアウトと照合し、プロファイルごとのバージョン行列を表示します。更新前のコードのままのゲートウェイがあると、正確な再起動コマンドと共に更新が失敗します（終了コード1）。
- **ローカルのソース変更。** git によるインストールでは、追跡中の汚れたファイルと未追跡のファイルは、ブランチのチェックアウトや pull の前に自動的にスタッシュされます（`git stash push --include-untracked`）。対話的なターミナルでの更新では、スタッシュを復元する前に確認を求めます。非対話的な更新では、既定でそれを復元します。管理されたインストールで、意図的なローカルのソース編集を成功した pull の後に破棄したい場合だけ `updates.non_interactive_local_changes: discard` を設定してください。スタッシュの復元が競合する、または pull が失敗した場合、手動での復旧のためにスタッシュはそのまま残されます。
- **npm のロックファイルの変動。** スタッシュやブランチの切り替えの前に、Hermes は npm の install/build ステップが生成した、追跡中の `package-lock.json` の差分をベストエフォートでクリーンアップします。意図的なロックファイルの編集は、`hermes update` を実行する前にコミットするか手動でスタッシュしてください。
- **ペアリングデータのスナップショット。** `--backup` が off でも、`hermes update` は `git pull` の前に `~/.hermes/pairing/` と Feishu のコメントルールの軽量なスナップショットを取ります。pull が編集中だったファイルを書き換えてしまった場合、`hermes backup restore --state pre-update` でロールバックできます。
- **古い `hermes.service` の警告。** Hermes が、リネーム前の `hermes.service` の systemd ユニット（現行の `hermes-gateway.service` ではなく）を検出した場合、フラップループの問題を避けられるよう、一度だけ移行のヒントを表示します。
- **終了コード。** 成功時 `0`、pull/install/post-install のエラー時 `1`、`git pull` をブロックする予期しない作業ツリーの変更があった場合は `2`。

## メンテナンスコマンド {#maintenance-commands}

| コマンド | 説明 |
|---------|------|
| `hermes --version` | バージョン情報を表示します。 |
| `hermes update` | 最新の変更を取得し、依存関係を再インストールします。 |

| `hermes uninstall [--full] [--gui] [--data] [--dry-run] [--yes]` | ソースからのインストールで Hermes が持つファイルを削除します。`--gui` はソースからビルドしたデスクトップの削除を選びます。`--full` はデータも削除します。`--data` は、パッケージが持つコードは消さずにユーザーのデータを削除します。封じられたインストールでは、アプリケーションの削除はそのパッケージの管理側が行います。`--dry-run` は削除の範囲を事前に表示し、`--yes` は確認を省きます。 |

## 関連 {#see-also}

- [スラッシュコマンド一覧](/hermes/docs/reference/slash-commands/)
- [CLI Interface](/hermes/docs/user-guide/cli/)
- [Sessions](/hermes/docs/user-guide/sessions/)
- [Skills System](/hermes/docs/user-guide/features/skills/)
- [Skins & Themes](/hermes/docs/user-guide/features/skins/)
