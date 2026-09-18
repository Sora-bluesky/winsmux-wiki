---
title: "CLI コマンド早見表"
description: "Hermes のターミナルコマンドとコマンド群についての公式な早見表"
upstream_path: reference/cli-commands.md
upstream_blob: f9a9089cf81e2b777c7938cb745d1b2d4905456a
sources:
  - https://hermes-agent.nousresearch.com/docs/reference/cli-commands
---

# CLI コマンド早見表 {#cli-commands-reference}

このページでは、シェルから実行する**ターミナルコマンド**を扱います。

チャットの中で使うスラッシュコマンドについては、[スラッシュコマンド早見表](/hermes/docs/reference/slash-commands/) を参照してください。

## 共通の入口 {#global-entrypoint}

```bash
hermes [global-options] <command> [subcommand/options]
```

### 共通オプション {#global-options}

| オプション | 説明 |
|--------|-------------|
| `--version`, `-V` | バージョンを表示して終了します。 |
| `--profile <name>`, `-p <name>` | この実行で使う Hermes のプロファイルを選びます。`hermes profile use` で設定した既定のプロファイルより優先されます。 |
| `--resume <session>`, `-r <session>` | 過去のセッションを ID かタイトルで再開します。`latest` と書くといちばん新しいセッションを再開します（ワークスペース単位で、`-c` と同じ探し方をします）。 |
| `--continue [name]`, `-c [name]` | いちばん新しいセッション、またはタイトルが一致するもののうちいちばん新しいセッションを再開します。 |
| `--in <dir>` | 起動または再開の前に `<dir>` へ移動します。`--resume latest` / `-c` の探索をそのディレクトリのワークスペースに絞り、セッションもそこで動かします（記録された作業ディレクトリへ戻す処理は行いません）。 |
| `--worktree`, `-w` | エージェントを並行して動かすために、独立した git の worktree で起動します。 |
| `--yolo` | 危険なコマンドの承認プロンプトを出さずに進めます。 |
| `--pass-session-id` | エージェントのシステムプロンプトにセッション ID を含めます。 |
| `--ignore-user-config` | `~/.hermes/config.yaml` を読まず、組み込みの既定値で動かします。`.env` の認証情報は今までどおり読み込まれます。 |
| `--ignore-rules` | `AGENTS.md`、`SOUL.md`、`.cursorrules`、メモリ、事前読み込みスキルの自動注入を行いません。 |
| `--tui` | 従来の CLI ではなく [TUI](/hermes/docs/user-guide/tui/) を起動します。`HERMES_TUI=1` と同じです。`display.interface` の設定より常に優先されます。 |
| `--cli` | 従来の prompt_toolkit の REPL を強制します。`display.interface: tui` をこの一回だけ上書きしたいときに使います。 |
| `--dev` | `--tui` と併用したとき、ビルド済みのバンドルではなく `tsx` で TypeScript のソースを直接実行します（TUI の開発に参加する人向け）。 |

## トップレベルのコマンド {#top-level-commands}

| コマンド | 用途 |
|---------|---------|
| `hermes chat` | エージェントと対話する、または一度きりのやり取りをします。 |
| `hermes model` | 既定のプロバイダとモデルを対話的に選びます。 |
| `hermes moa` | モデル選択画面から選べる Mixture of Agents のプリセットに名前を付けて設定します。 |
| `hermes fallback` | 主モデルがエラーになったときに試すフォールバック先のプロバイダを管理します。 |
| `hermes gateway` | メッセージングのゲートウェイサービスを起動・管理します。 |
| `hermes proxy` | OAuth のプロバイダ認証情報を付与する、ローカルの OpenAI 互換プロキシです。[サブスクリプションプロキシ](/hermes/docs/user-guide/features/subscription-proxy/) を参照してください。 |
| `hermes egress` | リモートのターミナルサンドボックス向けに、外向き通信へ認証情報を差し込むファイアウォール（iron-proxy）です。既定では無効です。[Egress プロキシ](/hermes/docs/user-guide/egress/iron-proxy/) を参照してください。 |
| `hermes lsp` | Language Server Protocol の連携（write_file / patch に対する意味的な診断）を管理します。 |
| `hermes setup` | 設定の全体または一部を対話的に進めるセットアップウィザードです。 |
| `hermes whatsapp` | WhatsApp ブリッジの設定とペアリングを行います。 |
| `hermes whatsapp-cloud` | Meta 公式の WhatsApp Business Cloud API アダプタを設定します（ビジネスアカウントと公開 webhook が必要）。`hermes whatsapp`（Baileys による個人アカウントのブリッジ）とは別物です。 |
| `hermes slack` | Slack 向けの補助コマンドです（現在は、全コマンドをネイティブのスラッシュコマンドとして並べたアプリマニフェストの生成）。 |
| `hermes auth` | 認証情報の管理 — 追加・一覧・削除・リセット・状態表示・ログアウト。Codex / Nous / Anthropic の OAuth の流れもここで扱います。 |
| `hermes login` / `logout` | **非推奨** — 代わりに `hermes auth` を使ってください。 |
| `hermes send` | 設定済みのメッセージングプラットフォーム（Telegram、Discord、Slack、Signal、SMS など）へ、一度きりのメッセージを送ります。シェルスクリプト、cron、CI のフック、監視デーモンから使えます — エージェントのループも LLM も動きません。 |
| `hermes peer` | 別の端末にある Hermes ゲートウェイを peer として登録し、そのエージェントの正式な Bot Chat へ DM します（`hermes peer dm <peer>[/<agent>] "…"`）。端末をまたいだボット同士のやり取りを支える転送路です。 |
| `hermes secrets` | 外部のシークレット供給元（現在は Bitwarden Secrets Manager）を管理し、API キーを `~/.hermes/.env` からではなくプロセス起動時に取り込みます。 |
| `hermes migrate` | 引退したモデルや非推奨の設定への参照を調べ、必要なら `config.yaml` を書き換えます（例: `migrate xai`）。 |
| `hermes status` | エージェント・認証・プラットフォームの状態を表示します。 |
| `hermes cron` | cron スケジューラの状態確認と実行を行います。 |
| `hermes pause` / `hermes resume` | 全体の緊急停止です。再開するまで、新しい cron の発火（組み込みのティッカー、管理された cron の webhook、取りこぼしの追い実行）も、kanban のディスパッチも、ゲートウェイのターンも始まりません。実行中の作業が止められることはありません。 |
| `hermes kanban` | 複数プロファイルで共同作業するためのボードです（タスク、リンク、ディスパッチャ）。 |
| `hermes project` | 名前を付けた複数フォルダのワークスペース（プロジェクト）を管理します。デスクトップのセッションのまとまりの基準になり、kanban のボードと結び付ければ、タスクに worktree とブランチの命名規則が自動で決まります。状態はプロファイルごとに持ちます。 |
| `hermes webhook` | イベント駆動で起動するための、動的な webhook 購読を管理します。 |
| `hermes hooks` | `config.yaml` に書かれたシェルスクリプトのフックを確認・承認・削除します。 |
| `hermes doctor` | 設定と依存関係の問題を診断します。 |
| `hermes security audit` | venv、プラグインの依存、バージョン固定した MCP サーバーを対象に、その場でサプライチェーン監査（OSV.dev）を実行します。 |
| `hermes approvals` | 承認プロンプト向けの道具です — 承認履歴を掘り起こして許可リストの案を作ります。 |
| `hermes dump` | サポートやデバッグのために、そのまま貼り付けられる設定の要約を出します。 |
| `hermes prompt-size` | システムプロンプトとツールスキーマ（スキル索引、メモリ、プロフィール）のバイト数の内訳を表示します。オフラインで動きます。 |
| `hermes debug` | デバッグ用の道具です — サポート向けにログとシステム情報をアップロードします。 |
| `hermes backup` | Hermes のホームディレクトリを zip ファイルにバックアップします。 |
| `hermes checkpoints` | `~/.hermes/checkpoints/`（`/rollback` が使う影の保管庫）を確認・整理・削除します。引数なしで実行すると状態の概要が出ます。 |
| `hermes import` | zip ファイルから Hermes のバックアップを復元します。 |
| `hermes logs` | エージェント・ゲートウェイ・エラーのログファイルを表示・追尾・絞り込みします。 |
| `hermes config` | 設定ファイルの表示・編集・移行・問い合わせを行います。 |
| `hermes skin` | 表示のスキンを一覧・切り替え・微調整します。 |
| `hermes console` | 安全な Hermes コマンドコンソールを開きます。 |
| `hermes pairing` | メッセージングのペアリングコードを承認または取り消します。 |
| `hermes skills` | スキルの閲覧・インストール・公開・監査・設定を行います。 |
| `hermes bundles` | 複数のスキルを 1 つの `/<name>` スラッシュコマンドにまとめます。[スキルバンドル](/hermes/docs/user-guide/features/skills/#skill-bundles) を参照してください。 |
| `hermes curator` | スキルの裏方メンテナンスです — 状態表示、実行、一時停止、固定。[キュレーター](/hermes/docs/user-guide/features/curator/) を参照してください。 |
| `hermes journey`（別名 `learning`、`memory-graph`） | 学んだスキルと記憶の移り変わりを時系列で見せます。 |
| `hermes memory` | 外部のメモリプロバイダを設定します。プロバイダ固有のサブコマンド（例: `hermes honcho`）は、そのプロバイダが有効なときに自動で登録されます。 |
| `hermes acp` | エディタ連携のために Hermes を ACP サーバーとして動かします。 |
| `hermes mcp` | MCP サーバーの設定を管理し、Hermes 自体を MCP サーバーとして動かします。 |
| `hermes plugins` | Hermes Agent のプラグインを管理します（インストール、有効化、無効化、削除）。 |
| `hermes portal` | Nous Portal の状態、サブスクリプションへのリンク、Tool Gateway の経路を扱います。[Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/) を参照してください。 |
| `hermes tools` | プラットフォームごとに有効なツールを設定します。 |
| `hermes computer-use` | Computer Use（cua-driver）のバックエンドを導入または確認します（macOS / Windows / Linux）。 |
| `hermes pets` | CLI・TUI・デスクトップアプリに表示される [petdex](/hermes/docs/user-guide/features/pets/) のアニメーションペットを閲覧・導入・選択します。サブコマンド: `list`、`install`、`select`、`show`、`off`、`scale`、`remove`、`doctor`。 |
| `hermes sessions` | セッションの閲覧・書き出し・整理・名前変更・削除を行います。 |
| `hermes insights` | トークン・費用・活動の分析を表示します。 |
| `hermes claw` | OpenClaw からの移行を助けるコマンドです。 |
| `hermes import-agent` | Claude Code（`~/.claude`）または Codex CLI（`~/.codex`）の設定を取り込みます。 |
| `hermes dashboard` | 設定・API キー・セッションを管理する Web ダッシュボードを起動します。 |
| `hermes serve` | Hermes のバックエンドサーバーを起動します（画面なし。デスクトップアプリやリモートのバックエンドを支えます）。 |
| `hermes desktop`（別名 `gui`） | ネイティブの Electron デスクトップアプリをビルドして起動します。 |
| `hermes profile` | プロファイルを管理します — 互いに独立した複数の Hermes を持てます。 |
| `hermes completion` | シェルの補完スクリプトを出力します（bash / zsh / fish）。 |
| `hermes --version` | バージョン情報を表示します。 |
| `hermes update` | 最新のコードを取得して依存関係を入れ直します。`--check` は入れずに内容だけ見せ、`--backup` は取得前に `HERMES_HOME` のスナップショットを取ります。 |
| `hermes uninstall` | Hermes をシステムから削除します。 |

## `hermes chat` {#hermes-chat}

```bash
hermes chat [options]
```

よく使うオプション:

| オプション | 説明 |
|--------|-------------|
| `-q`, `--query "..."` | セッションの最初にプロンプトを流し込みます。本物の TTY では、そのプロンプトは通常の対話セッションの第一ターンとして**そのまま**送られ（スラッシュコマンドや `!` のシェル脱出として解釈されることはありません）、セッションは開いたままになります — OS のランチャーやデスクトップ連携に向いています。`--oneshot`、`-Q`、または TTY でない入出力の場合は、答えて終了します。 |
| `--query-file PATH` | ファイルからプロンプトを読みます（`-` は標準入力）。シェルによる解釈が一切入らないので、引用符や `$(...)`、バッククォートもそのまま届きます — プログラムが作った本文や、信用できない本文にはこちらを使ってください（Bot Mode の相手からの DM もこれを使います）。`-q` とは同時に使えません。 |
| `--oneshot` | `-q` / `--query-file` と併用したとき、対話セッションを始めるのではなく、問いに答えて終了します（0.21 より前の単発の挙動）。TTY でない入出力のときと `-Q` を付けたときは自動でこうなります。 |
| `-m`, `--model <model>` | この実行だけモデルを差し替えます。 |
| `-t`, `--toolsets <csv>` | カンマ区切りで指定したツールセットを有効にします。 |
| `--provider <provider>` | プロバイダを指定します: `auto`, `openrouter`, `nous`, `openai-codex`, `copilot-acp`, `copilot`, `anthropic`, `gemini`, `huggingface`, `novita`（別名 `novita-ai`, `novitaai`）, `openai-api`, `zai`, `kimi-coding`, `kimi-coding-cn`, `minimax`, `minimax-cn`, `minimax-oauth`, `kilocode`, `xiaomi`, `arcee`, `gmi`, `upstage`（別名 `solar`）, `alibaba`, `alibaba-cn`, `alibaba-coding-plan`（別名 `alibaba_coding`）, `alibaba-coding-plan-cn`, `alibaba-token-plan`, `alibaba-token-plan-cn`, `deepseek`, `nvidia`, `ollama-cloud`, `xai`（別名 `grok`）, `xai-oauth`（別名 `grok-oauth`）, `qwen-oauth`, `bedrock`, `opencode-zen`, `opencode-go`, `commandcode`, `commandcode-anthropic`, `ai-gateway`, `azure-foundry`, `lmstudio`, `stepfun`, `tencent-tokenhub`（別名 `tencent`, `tokenhub`）, `router`（別名 `ramp-router`, `ramp`）, `nebius-token-factory`（別名 `nebius`, `nebius-tf`, `tokenfactory`）, `tencent-tokenplan`（別名 `tokenplan`, `tencent-lkeap`）。 |
| `-s`, `--skills <name>` | このセッションで使うスキルを事前に読み込みます（繰り返し指定、またはカンマ区切りで複数可）。 |
| `-v`, `--verbose` | 詳しい出力を出します。 |
| `-Q`, `--quiet` | プログラム向けのモードです。バナー・スピナー・ツールの下見表示を出しません。 |
| `--format stream-json` | `-q` / `--query` で呼んだときに、構造化された JSONL を出力します。`--quiet` を含み、`--tui` とは併用できません。 |
| `--image <path>` | 1 回の問い合わせにローカルの画像を添えます。 |
| `--resume <session>` / `--continue [name]` | `chat` から直接セッションを再開します。 |
| `--worktree` | この実行のために独立した git の worktree を作ります。 |
| `--checkpoints` | ファイルを壊しうる変更の前に、ファイルシステムのチェックポイントを取ります。 |
| `--yolo` | 承認プロンプトを省略します。 |
| `--pass-session-id` | セッション ID をシステムプロンプトに渡します。 |
| `--ignore-user-config` | `~/.hermes/config.yaml` を読まず、組み込みの既定値で動かします。`.env` の認証情報は今までどおり読み込まれます。CI での独立した実行、再現できるバグ報告、第三者との連携に便利です。 |
| `--ignore-rules` | `AGENTS.md`、`SOUL.md`、`.cursorrules`、永続メモリ、事前読み込みスキルの自動注入を行いません。`--ignore-user-config` と合わせると、完全に切り離した状態で実行できます。 |
| `--safe-mode` | 切り分け用のモードです。ユーザー設定、ルールやメモリの注入、プラグイン、シェルフック、MCP サーバーといったカスタマイズを**すべて**無効にします（`--ignore-user-config` と `--ignore-rules` を含みます）。問題が自分の環境由来か Hermes 自体かを見分けるために使います。 |
| `--source <tag>` | 絞り込み用のセッション種別タグです（既定: `cli`。一度きりの実行は `oneshot` が既定で、選択画面には出ません）。利用者のセッション一覧に出したくない外部連携では `tool` を使います。`--source` を明示したときは、TUI やデスクトップのセッションから始めた一度きりの実行でも、指定したとおりに記録されます。 |
| `--max-turns <N>` | 1 ターンあたりのツール呼び出しの上限回数です（既定: 500、または設定の `agent.max_turns`）。 |

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

### `--format stream-json` — 構造化された JSONL 出力 {#--format-stream-json-structured-jsonl-output}

ターミナルの表示を掻き集めることなく、プログラムから進行状況を受け取りたいときは
`--format stream-json` を使います。`-q` / `--query`（または `--query-file`）が必要で、
対話しない静かな CLI モードになり、`--tui` を明示すると拒否されます。標準出力の 1 行が
1 つの JSON オブジェクトで、診断メッセージと `session_id:` の行は標準エラー側に出ます。

```bash
hermes chat -q "Summarize this repository" --format stream-json
```

どのイベントにも `timestamp`（Unix エポックのミリ秒）が付きます。

| イベントの `type` | フィールド |
|---|---|
| `system` | `subtype: "init"`, `model`, `session_id` |
| `text` | `text` — 逐次届くアシスタントのテキストの断片 |
| `tool_use` | `name`。ツールの引数が分かるときは `input` も |
| `tool_result` | `name`, `output`（5000 文字で打ち切り）, `duration_ms`, `is_error` |
| `result` | `session_id`, `exit_code`, `text`, `tokens`（`input`, `output`, `total`, `cache_read`, `cache_write`）, `duration_ms`。ターンが失敗したときは `error` も |

会話が始まったあと、最後に必ず記録されるのは `result` です — Ctrl-C で中断したときの
`exit_code: 130` も含みます。この記録を完了の合図として扱ってください。プロセスの終了コードは
その `exit_code` と一致します。

#### 一度きりの実行での終了コード {#exit-codes-for-one-shot-runs}

chat が答えて終了するとき（`-Q`、`chat --oneshot`、または TTY でない入出力での問い合わせ）は、
静かなモードでもそうでなくても、プロセスの終了コードがそのターンの結末を表します。`0` は
ターンが完了、`1` は失敗・途中で止まった（`partial`）・繰り返しの上限に達した・そもそも実行
されなかった（認証情報やエージェントの初期化に失敗）、`130` は中断されたことを意味します。
Kanban のディスパッチャが起動したワーカー（`HERMES_KANBAN_TASK` が設定されている）は、
プロバイダのレート制限・過負荷・5xx・タイムアウト、あるいは請求や割り当ての上限だけが
原因で失敗した場合、
`75`（`EX_TEMPFAIL`）で終了します。こうするとディスパッチャは失敗として数えずにタスクを
キューへ戻します。`--format stream-json` を使っていれば、最後の `result` の記録にも同じ
`exit_code` が載ります。

#### 終わりのある chat 実行での委譲 {#delegation-in-finite-chat-runs}

chat が答えて終了するとき（`-Q`、`chat --oneshot`、または TTY でない入出力での問い合わせ）、
`delegate_task` は子の完了を待ち、同じターンの中でその結果を親へ返します。まとめて動かす子は
`delegation.max_concurrent_children` の範囲で並行して動きます。親は CLI が終了する前に、
最終回答の中でその結果を使えます。

- **自動で合流します:** 事前の設定も、バックグラウンド動作の上書きも要りません。
  対話的な TTY の chat とメッセージングのセッションでは、これまでどおり委譲は裏で動き続けます。
- **既存の安全装置はそのままです:** 委譲の上限、タイムアウト、キャンセル、
  `approvals.single_query_mode` は引き続き効きます。合流するからといってコマンドが自動承認
  されるわけでも、子の成功が保証されるわけでもありません。結果を確かめ、成果物を検証してください。
- **ターミナルの完了通知:** バックグラウンドのターミナル通知の挙動や、
  `terminal.oneshot_completion_wait_seconds` による有限の終了待ちは変わりません。
  この設定は委譲のタイムアウトではありません。

委譲はプロセスの中に閉じたままです。親を中断したり終了させたりすると、終わっていない子は
打ち切られることがあります。起動元のプロセスより長く生き延びる必要がある作業には、
永続するスケジューラを使ってください。

### `hermes -z <prompt>` — スクリプト向けの一度きりの実行 {#hermes--z-prompt-scripted-one-shot}

プログラムから呼ぶ場合（シェルスクリプト、CI、cron、プロンプトを流し込む親プロセス）、`hermes -z` がいちばん素直な入口です。**プロンプトを 1 つ渡すと、最終的な回答のテキストだけが返り、標準出力にも標準エラーにも他は何も出ません。** バナーもスピナーもツールの下見表示も `Session:` の行もなく、エージェントの最後の返事がそのままのテキストで出ます。

```bash
hermes -z "What's the capital of France?"
# → Paris.

# Parent scripts can cleanly capture the response:
answer=$(hermes -z "summarize this" < /path/to/file.txt)
```

その実行だけの上書き（`~/.hermes/config.yaml` は書き換えません）:

| フラグ | 対応する環境変数 | 用途 |
|---|---|---|
| `-m` / `--model <model>` | `HERMES_INFERENCE_MODEL` | この実行だけモデルを差し替えます |
| `--provider <provider>` | _(なし)_ | この実行だけプロバイダを差し替えます |
| `--usage-file <path>` | _(なし)_ | 実行後に JSON の利用状況レポートを書き出します（後述） |

```bash
hermes -z "…" --provider openrouter --model openai/gpt-5.5
# or:
HERMES_INFERENCE_MODEL=anthropic/claude-sonnet-4.6 hermes -z "…"
```

エージェントもツールもスキルも同じで、対話的な飾りをすべて剥がしただけです。会話の記録にツールの出力も欲しいときは、代わりに `hermes chat --oneshot -q` を使ってください。`-z` は「最終的な答えだけが欲しい」ときのためのものです。

終了コード: `0` はターンが完了、`2` は失敗または途中で止まった（`partial`、繰り返しの上限、
`completed: false`）ことを表します。説明が印字されていても同じです。`130` は中断、`1` は完了した
ターンがテキストを一切出さなかった場合です。実行が始まる前の使い方の誤り（不正なフラグ）も `2`
になります。これらは上の `chat -q`/`-Q`（失敗・途中終了・上限は `1`、テキストなしで完了した
ターンは `0`）とわざと違えてあります。`-z` は `1` を「何も答えなかった」に充てているからです。
実行の良し悪しは、標準出力が空かどうかではなく、終了コード（または `--usage-file` のフラグ）で
判断してください。

#### `--usage-file` — パイプライン向けの JSON 利用状況レポート {#--usage-file-json-usage-report-for-pipelines}

`hermes -z "…" --usage-file /path/report.json` は、実行後に機械で読める利用状況レポートを書き出します。内容は `estimated_cost_usd`、`input_tokens` / `output_tokens` / `cache_read_tokens` / `cache_write_tokens` / `reasoning_tokens` / `total_tokens`、`api_calls`、`model`、`provider`、`session_id`、`service_tier`、`completed` / `failed` / `partial` / `interrupted` のフラグ、そして `turn_exit_reason`（`completed` が偽になった理由。例: `max_iterations_reached(3/3)`）です。この最上位の数字が指すのは**エージェント本体のループ**だけです。同じ実行の中で行われた補助的な LLM 呼び出し（タイトル生成、画像認識、文脈の圧縮、`web_extract`、裏でのレビューなど）は `auxiliary` の下にまとめて報告され、同じ項目に加えて処理ごとの `by_task` が付きます。請求の対象となる総額は `total_including_auxiliary`（`estimated_cost_usd`、`total_tokens`、`api_calls`）です。このレポートは**実行が失敗したときにも**書かれるので、まとめて処理するパイプラインでも支出をいつでも把握できます。`-z`/`--oneshot` 以外では効かず、レポートの書き出しに失敗しても実行自体の結末が隠れることはありません。

```bash
hermes -z "summarize this repo" --usage-file /tmp/usage.json
jq .total_including_auxiliary.estimated_cost_usd /tmp/usage.json
jq .auxiliary.by_task /tmp/usage.json      # what did title generation / vision cost?
```

## `hermes model` {#hermes-model}

プロバイダとモデルを対話的に選ぶコマンドです。**新しいプロバイダの追加、API キーの設定、OAuth の手続きは、このコマンドで行います。** 動いている Hermes のチャットセッションの中からではなく、ターミナルから実行してください。

```bash
hermes model
```

次のようなときに使います:
- **新しいプロバイダを追加する**（OpenRouter、Anthropic、Copilot、DeepSeek、独自のものなど）
- OAuth で認証するプロバイダにログインする（Anthropic、Copilot、Codex、Nous Portal）
- API キーを入力または更新する
- プロバイダごとのモデル一覧から選ぶ
- 自前・自己ホストのエンドポイントを設定する
- 新しい既定値を設定に保存する

:::warning hermes model と /model の違い
**`hermes model`**（Hermes のセッションの外、ターミナルから実行）は**プロバイダ設定の全部入りウィザード**です。新しいプロバイダの追加、OAuth の実行、API キーの入力、エンドポイントの設定ができます。

**`/model`**（動いている Hermes のチャットセッションの中で入力）は、**すでに設定済みのプロバイダとモデルを切り替える**ことしかできません。新しいプロバイダの追加も、OAuth も、API キーの入力もできません。

**新しいプロバイダを追加したいときは:** まず Hermes のセッションを終了し（`Ctrl+C` か `/quit`）、ターミナルのプロンプトから `hermes model` を実行してください。
:::

### `/model` スラッシュコマンド（セッションの途中で） {#model-slash-command-mid-session}

セッションを抜けずに、設定済みのモデルを切り替えます:

```
/model                              # Show current model and available options
/model claude-sonnet-4              # Switch model (auto-detects provider)
/model zai:glm-5                    # Switch provider and model
/model custom:qwen-2.5              # Use model on your custom endpoint
/model custom                       # Auto-detect model from custom endpoint
/model custom:local:qwen-2.5        # Use a named custom provider
/model openrouter:anthropic/claude-sonnet-4  # Switch back to cloud
```

既定では、`/model` の変更は**今のセッションにだけ**効きます。`--global` を付けると `config.yaml` に保存されます（`model.persist_switch_by_default: true` にすれば、切り替えが毎回保存されます）:

```
/model claude-sonnet-4 --global     # Switch and save as new default
```

:::info OpenRouter のモデルしか出てこないときは
OpenRouter しか設定していなければ、`/model` には OpenRouter のモデルしか出ません。別のプロバイダ（Anthropic、DeepSeek、Copilot など）を追加するには、セッションを終了してターミナルから `hermes model` を実行してください。
:::

`--global` で切り替えると、モデルと一緒にプロバイダとベース URL の変更も `config.yaml` に保存されます。自前のエンドポイントから別のプロバイダへ移るときは、古いベース URL が他のプロバイダに漏れないよう消されます。

## `hermes gateway` {#hermes-gateway}

```bash
hermes gateway <subcommand>
```

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `run` | ゲートウェイを前面で動かします。WSL、Docker、Termux ではこちらを勧めます。 |
| `start` | インストール済みの systemd / launchd のバックグラウンドサービスを起動します。 |
| `stop` | サービス（または前面のプロセス）を止めます。 |
| `restart` | サービスを再起動します。 |
| `status` | サービスの状態を表示します。 |
| `list` | **すべてのプロファイル**と、それぞれのゲートウェイが動いているかどうかを一覧します（分かる場合は PID も）。複数のプロファイルを並べて運用していて、まとめて把握したいときに便利です。 |
| `install` | systemd（Linux）または launchd（macOS）のバックグラウンドサービスとして導入します。 |
| `uninstall` | 導入済みのサービスを削除します。 |
| `setup` | メッセージングプラットフォームを対話的に設定します。 |
| `migrate` | プロファイルごとに独立していたゲートウェイを、多重化された 1 つの既定ゲートウェイへまとめます（`--multiplex`。これが既定）。記録しておいた一覧から元へ戻すこともできます（`--standalone`）。事前確認（ボットトークンの重複、`/p/<profile>/` の入口を持たないままポートを掴んでいる二次プロセス）を行い、問題があれば何も変更しません。フラグ: `--dry-run`、`-y`/`--yes`。[プロファイルごとのゲートウェイからの移行](/hermes/docs/user-guide/multi-profile-gateways/#migrating-from-per-profile-gateways) を参照してください。 |
| `migrate-legacy` | 名前変更より前の導入で残った、古い `hermes.service` のユニットを削除します。プロファイルのユニット（`hermes-gateway-<profile>.service`）や無関係なサービスには手を触れません。フラグ: `--dry-run`、`-y`/`--yes`。 |
| `enroll` | 試験的な機能です。このゲートウェイをリレーのコネクタに登録し、コネクタ経由のプラットフォーム向けにリレーの認証情報を保存します。[Hermes Relay](/hermes/docs/user-guide/messaging/relay/) を参照してください。 |

オプション:

| オプション | 説明 |
|--------|-------------|
| `--all` | `start` / `restart` / `stop` で、いま有効な `HERMES_HOME` だけでなく**すべてのプロファイル**のゲートウェイを対象にします。複数のプロファイルを並べて動かしていて、`hermes update` のあとにまとめて再起動したいときに便利です。 |
| `--no-supervise` | `run` で、s6-overlay の Docker イメージ内において自動監視をやめ、s6 より前の前面実行の挙動にします — ゲートウェイがコンテナの主プロセスになり、自動再起動はしません。s6 イメージの外では何も起きません。`HERMES_GATEWAY_NO_SUPERVISE=1` と同じです。 |
| `--external-supervisor` | `run` で、前面のゲートウェイをラッパー側のプロセス管理が所有していると宣言します。`sudo`、`env -i`、その他のラッパーが launchd / systemd の環境マーカーを落としてしまう場合に使います。チャット内での再起動や更新は、自前で別プロセスを立ち上げるのではなく、その管理側へ制御を返して終了します。 |

`--external-supervisor` は再起動の約束事です。チャット内での再起動、
`hermes gateway restart`、サービス再起動を伴う更新は、いずれも終了コード `75` で終わります
（CLI は自前で前面のゲートウェイを動かす代わりに、管理側が作る新しい PID を待ちます）。
そのためラッパーの管理側は、この非ゼロ終了のあとでゲートウェイを立ち上げ直す必要があります。
systemd なら `Restart=on-failure` か `Restart=always` を使い、`RestartPreventExitStatus` に
`75` を含めないでください。launchd なら、失敗した終了のあとに立ち上げ直すよう `KeepAlive` を
設定します。この設定がないと、再起動を頼んでもゲートウェイは止まったままになります。

`hermes gateway enroll` は `--token`、`--connector-url`、`--gateway-id`、`--wake-url` を受け取ります。登録用のトークンをコネクタと引き換え、得られた `GATEWAY_RELAY_ID`、`GATEWAY_RELAY_SECRET`、`GATEWAY_RELAY_DELIVERY_KEY`、任意の `GATEWAY_RELAY_URL`、そして（`--wake-url` を渡した場合は）`GATEWAY_RELAY_WAKE_URL` の値を、いま有効なプロファイルの `.env` に書き込みます。

:::tip WSL を使っている方へ
`hermes gateway start` ではなく `hermes gateway run` を使ってください — WSL の systemd はあてになりません。動かし続けるには tmux で包みます: `tmux new -s hermes 'hermes gateway run'`。詳しくは [WSL の FAQ](/hermes/docs/reference/faq/#wsl-gateway-keeps-disconnecting-or-hermes-gateway-start-fails) を参照してください。
:::

## `hermes lsp` {#hermes-lsp}

```bash
hermes lsp <subcommand>
```

Language Server Protocol の連携を管理します。LSP は本物の言語サーバー
（pyright、gopls、rust-analyzer など）を裏で動かし、その診断結果を
`write_file` と `patch` のあとに走るチェックへ渡します。git のワークスペース
かどうかで動作が決まります — 作業ディレクトリか編集するファイルが git の
worktree の中にあるときだけ LSP は動きます。

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `status` | サービスの状態、設定されたサーバー、導入状況を表示します。 |
| `list` | 対応しているサーバーの一覧を表示します。`--installed-only` を付けると未導入のものを省きます。 |
| `install <id>` | 指定したサーバーのバイナリを先に導入します。 |
| `install-all` | 自動導入の手順が分かっているサーバーをすべて導入します。 |
| `restart` | 動いているクライアントを終了させ、次の編集で立ち上げ直します。 |
| `which <id>` | 指定したサーバーについて、解決されたバイナリのパスを表示します。 |

対応言語や設定項目を含む案内は
[LSP — 意味的な診断](/hermes/docs/user-guide/features/lsp/) を参照してください。

## `hermes setup` {#hermes-setup}

```bash
hermes setup [model|tts|terminal|gateway|tools|agent] [--non-interactive] [--reset] [--quick] [--reconfigure] [--portal]
```

**いちばん楽な道:** `hermes setup --portal` — Nous Portal に OAuth でログインし、[Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/) の利用開始まで一度に済ませます。

**初回の実行:** 初回向けのウィザードが立ち上がります。

**設定済みの人が再び実行したとき:** 設定し直すウィザードにそのまま入ります。どの項目も今の値が既定として表示され、Enter で維持するか、新しい値を入力します。メニューは出ません。

ウィザード全体ではなく、一部分だけを実行することもできます:

| 区分 | 説明 |
|---------|-------------|
| `model` | プロバイダとモデルの設定。 |
| `terminal` | ターミナルのバックエンドとサンドボックスの設定。 |
| `gateway` | メッセージングプラットフォームの設定。 |
| `tools` | プラットフォームごとのツールの有効・無効。 |
| `agent` | エージェントの振る舞いの設定。 |

オプション:

| オプション | 説明 |
|--------|-------------|
| `--quick` | すでに設定済みの人が実行したとき、未設定の項目だけを尋ねます。設定済みの項目は飛ばします。 |
| `--non-interactive` | 何も尋ねず、既定値や環境変数の値を使います。 |
| `--reset` | セットアップの前に、設定を既定値へ戻します。 |
| `--reconfigure` | 後方互換のための別名です。導入済みの環境で `hermes setup` をそのまま実行すると、今はこの動きが既定になっています。 |
| `--portal` | Nous Portal を一度に設定します。OAuth でログインし、推論のプロバイダを Nous にし、[Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/) の利用を始めます。ウィザードの残りは飛ばします。 |

## `hermes portal` {#hermes-portal}

```bash
hermes portal [status|open|tools]
```

Nous Portal の認証状態、Tool Gateway の経路を確認し、サブスクリプションのページへ移動します。サブコマンドなしで実行すると `status` が動きます。

| サブコマンド | 説明 |
|------------|-------------|
| `status`（既定） | Portal の認証状態と、ツールごとの Tool Gateway の経路の要約。サブコマンドを付けなかったときもこれが出ます。 |
| `open` | 既定のブラウザで `portal.nousresearch.com/manage-subscription` を開きます。 |
| `tools` | Tool Gateway の提携先（Firecrawl、FAL、OpenAI TTS、Browser Use、Modal）を一覧し、どれが Nous 経由になっているかを示します。 |

ゲートウェイ自体の設定については [Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/) を参照してください。一度に済ませる導入手順については、上の `hermes setup --portal` を参照してください。

## `hermes whatsapp` {#hermes-whatsapp}

```bash
hermes whatsapp
```

モードの選択と QR コードでのペアリングを含む、WhatsApp のペアリング・設定の流れを実行します。

## `hermes slack` {#hermes-slack}

```bash
hermes slack manifest              # print manifest to stdout
hermes slack manifest --write      # write to ~/.hermes/slack-manifest.json
hermes slack manifest --long-description-file AGENTS.md --write
hermes slack manifest --slashes-only  # just the features.slash_commands array
```

`COMMAND_REGISTRY` にあるゲートウェイのコマンド（`/btw`、`/stop`、`/model` など）を
すべて、Slack の一級のスラッシュコマンドとして登録するアプリマニフェストを生成します。
Discord や Telegram と同じ使い勝手になります。出力した内容を Slack アプリの設定
（[https://api.slack.com/apps](https://api.slack.com/apps) → 対象のアプリ →
**Features → App Manifest → Edit**）に貼り付けて **Save** してください。スコープや
スラッシュコマンドが変わっていると、Slack は入れ直しを求めます。

| フラグ | 既定 | 用途 |
|------|---------|---------|
| `--write [PATH]` | 標準出力 | 標準出力ではなくファイルへ書き出します。`--write` だけなら `$HERMES_HOME/slack-manifest.json` へ書きます。 |
| `--name NAME` | `Hermes` | Slack に表示されるボットの名前。 |
| `--description DESC` | 既定の紹介文 | Slack のアプリ一覧に表示されるボットの説明。 |
| `--long-description TEXT` | 未設定 | `display_information.long_description` をその場で指定します（175〜4,000 文字）。`--slashes-only` とは併用できません。 |
| `--long-description-file PATH` | 未設定 | UTF-8 のテキストファイルから長い説明を読み、その内容をそのまま使います。`--long-description` とは同時に使えず、`--slashes-only` とも併用できません。 |
| `--slashes-only` | 無効 | 手で管理しているマニフェストに混ぜ込むために、`features.slash_commands` だけを出力します。 |

`hermes update` のあとにもう一度 `hermes slack manifest --write` を実行すると、
新しく増えたコマンドを取り込めます。

## `hermes send` {#hermes-send}

```bash
hermes send --to <target> "message text"
hermes send --to <target> --file <path>
echo "message" | hermes send --to <target>
hermes send --list [platform]
```

エージェントもゲートウェイのループも立ち上げずに、設定済みのメッセージングプラットフォームへ一度きりのメッセージを送ります。ゲートウェイがすでに持っている認証情報（`~/.hermes/.env` と `~/.hermes/config.yaml`）をそのまま使うので、運用スクリプト、cron、CI のフック、監視デーモンから、プラットフォームごとの REST クライアントを書き直さずに状況を投稿できます。

ボットトークンを使うプラットフォーム（Telegram、Discord、Slack、Signal、SMS、WhatsApp-CloudAPI）では、ゲートウェイが動いている必要はありません — `hermes send` がプラットフォームの REST エンドポイントへ直接話しかけます。常駐のアダプタが必要なプラグイン方式のプラットフォームでは、動いているゲートウェイが引き続き要ります。

| オプション | 説明 |
|--------|-------------|
| `-t`, `--to <TARGET>` | 送り先です。書き方は `platform`（ホームのチャンネルを使う）、`platform:chat_id`、`platform:chat_id:thread_id`、`platform:#channel-name`。例: `telegram`、`telegram:-1001234567890`、`discord:#ops`、`slack:C0123ABCD`、`signal:+15551234567`。 |
| `-f`, `--file <PATH>` | 本文を `PATH` から読みます（ログ、レポート、マークダウンなどのテキストファイルのみ）。`-` を渡すと標準入力から読みます。画像やその他のバイナリを送るときは `MEDIA:<path>` を使ってください（後述）。 |
| `-s`, `--subject <LINE>` | 本文の前に見出しの行を付けます。 |
| `-l`, `--list [platform]` | すべてのプラットフォーム（またはプラットフォームを指定すればそれだけ）の送り先を一覧します。 |
| `-q`, `--quiet` | 成功時に標準出力へ何も出しません — スクリプトで終了コードだけを見たいときに便利です。 |
| `--json` | 人が読む形ではなく、生の JSON を出力します。 |

位置引数の `message` も `--file` も渡さなかったときは、標準入力が TTY でなければ `hermes send` はそこから読みます。終了コードは、成功が `0`、送信やバックエンドの失敗が `1`、使い方の誤りが `2` です。

### 画像やその他のメディアを送る {#sending-images-and-other-media}

`--file` は*テキスト*の本文専用です。画像、文書、動画、音声をプラットフォームの添付ファイルとして届けるには、本文の中で `MEDIA:<local_path>` と書いて参照します:

```bash
hermes send --to telegram "MEDIA:/tmp/screenshot.png"
hermes send --to telegram "Build chart for today MEDIA:/tmp/chart.png"   # with caption
hermes send --to discord:#ops "MEDIA:/tmp/report.pdf"
```

既定では画像は写真として送られます（Telegram などは再圧縮します）。圧縮されないファイル添付として届けたいときは、本文に `[[as_document]]` を加えます:

```bash
hermes send --to telegram "[[as_document]] MEDIA:/tmp/screenshot.png"
```

例:

```bash
hermes send --to telegram "deploy finished"
echo "RAM 92%" | hermes send --to telegram:-1001234567890
hermes send --to discord:#ops --file /tmp/report.md
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

端末をまたいだボット同士の DM です。別の Hermes ゲートウェイ（`api_server` の
プラットフォームを動かしている端末なら何でも）を *peer* として登録すると、そのエージェントに
メッセージを送れます。`hermes peer dm` は相手側の API サーバー経由で、そのエージェントの
正式な **Bot Chat** のセッションを見つけ、そこで 1 ターン実行し、返事を標準出力に出します。
ローカルで使う
`hermes -p <bot> chat --in ~ -c "Bot Chat" …` の、端末をまたいだ版にあたります。

`<peer>` だけを指定すると相手のゲートウェイの主エージェントに届きます。
`<peer>/<agent>` は、多重化された相手側の名前付きプロファイル（`/p/<profile>/` の写しを
経由）に届きます。

| サブコマンド | 説明 |
|--------|-------------|
| `add <name> --url <URL> [--key <KEY>] [--note TEXT]` | peer を登録または更新します。URL は `config.yaml`（`bot_peers`）へ、キーは `~/.hermes/.env` に `HERMES_PEER_<NAME>_KEY` として保存されます。 |
| `list` | peer と、それぞれにキーが設定されているかを一覧します。 |
| `dm <peer>[/<agent>] [message]` | 相手のエージェントの正式な Bot Chat へ送り、返事を表示します（機械で読む形なら `--json`。メッセージは標準入力からでも渡せます）。 |
| `run <peer>[/<agent>] [message]` | 正式な Bot Chat の長いターンを非同期で始め、その `run_id`、セッション ID、冪等キーを返します（`--json` に対応）。同じ依頼を再送するときは `--idempotency-key` を使い回してください。 |
| `status <peer>[/<agent>] <run_id>` | 非同期で動いている相手側の実行を確認し、終わっていれば最終出力を表示します（`--json` に対応）。 |
| `stop <peer>[/<agent>] <run_id>` | 別のターンに触れることなく、その非同期の実行だけを止めます（`--json` に対応）。 |
| `remove <name>` | peer を登録から外します（`.env` のキーはそのまま残ります）。 |

peer を 1 つでも登録すると、すべての正式な Bot Chat に教えられる Bot Mode の
やり取りの作法（`agent.bot_mode_protocol`）に、peer の一覧と `hermes peer dm` の書き方が
自動で含まれます。SOUL を編集しなくても、エージェントは端末をまたいだ仲間を見つけられます。
[Bot Mode](/hermes/docs/user-guide/bot-mode/) を参照してください。

終了コードは、成功が `0`、送信や peer の失敗が `1`、使い方の誤りが `2` です。

## `hermes secrets` {#hermes-secrets}

```bash
hermes secrets bitwarden <subcommand>
hermes secrets bw <subcommand>          # short alias
```

API キーを `~/.hermes/.env` に置く代わりに、外部のシークレット管理から起動時に取り込みます。今のところ **Bitwarden Secrets Manager** に対応しています。詳しい案内は [Bitwarden との連携](/hermes/docs/user-guide/secrets/bitwarden/) を参照してください。

`bitwarden`（別名 `bw`）のサブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `setup` | 対話的なウィザードです。バージョンを固定した `bws` のバイナリを導入し、アクセストークンを保存し、プロジェクトを選びます。対話せずに使うときは `--project-id`、`--access-token`、`--server-url` を渡せます。 |
| `status` | 今の設定、バイナリのパスとバージョン、トークンの検証結果を表示します。 |
| `token` | アクセストークンを入れ替えます。新しいトークンを Bitwarden で検証してから `.env` に保存します（拒否されたトークンでは何も変わりません）。対話せずに使うときは `--access-token`、検査を省くときは `--no-verify` を渡します。 |
| `sync` | いますぐシークレットを取得し、何が変わったかを報告します。`--apply` を付けると、実際に今のシェルの環境へ書き出します（既定は下見だけ）。 |
| `install` | バージョンを固定した `bws` のバイナリをダウンロードして検証します。`--force` を付けると、管理下の写しがすでにあっても取り直します。 |
| `disable` | Bitwarden との連携を止めます。 |

## `hermes migrate` {#hermes-migrate}

```bash
hermes migrate <type>
```

いま有効な `config.yaml` を調べ、引退したモデルや非推奨の設定への参照を（必要なら）書き換えます。書き換える前に、元の `config.yaml` の控えが日時付きで保存されます（`--no-backup` で省けます）。

| サブコマンド | 説明 |
|------------|-------------|
| `xai` | `config.yaml` から、2026 年 5 月 15 日に引退予定の xAI モデルへの参照を探し、（`--apply` を付ければ）xAI の移行案内に沿って公式の後継へその場で書き換えます。既定は下見だけです。 |

移行のサブコマンドに共通のフラグ:

| フラグ | 説明 |
|------|-------------|
| `--apply` | `config.yaml` をその場で書き換えます（既定は下見のみで、書き込みません）。 |
| `--no-backup` | 適用時に `config.yaml` の日時付きの控えを取りません。 |

> `hermes claw migrate`（OpenClaw の設定を一度だけ Hermes へ取り込むコマンド）と混同しないでください — `hermes migrate` は設定を書き換えるトップレベルのコマンドです。

## `hermes proxy` {#hermes-proxy}

```bash
hermes proxy <subcommand>
```

OAuth で認証した上流のプロバイダ（Nous Portal、xAI など）へ転送する、ローカルの OpenAI 互換 HTTP サーバーを動かします。外部のアプリは任意のベアラートークンでこのプロキシを向けばよく、プロキシが外へ出るときに本物の OAuth の認証情報を付けます。詳しい案内は [サブスクリプションプロキシ](/hermes/docs/user-guide/features/subscription-proxy/) を参照してください。

| サブコマンド | 説明 |
|------------|-------------|
| `start` | プロキシを前面で動かします。フラグ: `--provider <nous\|xai>`（既定 `nous`）、`--host <addr>`（既定 `127.0.0.1`。LAN へ出すなら `0.0.0.0`）、`--port <int>`（既定 `8645`）。 |
| `status` | どの上流が使える状態か（認証情報があり、OAuth が有効か）を表示します。 |
| `providers` | 上流として使えるプロバイダを一覧します。 |

## `hermes security` {#hermes-security}

```bash
hermes security <subcommand>
```

[OSV.dev](https://osv.dev) を使って、その場で脆弱性を調べます。対象は Hermes の venv（導入済みの PyPI 配布物）、`~/.hermes/plugins/` 以下のプラグインが宣言した Python の依存、そして `config.yaml` でバージョンを固定した `npx`/`uvx` の MCP サーバーです。システム全体に入れたパッケージや、エディタ・ブラウザの拡張は対象外です。

| サブコマンド | 説明 |
|------------|-------------|
| `audit` | サプライチェーンの監査を一度だけ実行します。 |

`audit` のフラグ:

| フラグ | 既定 | 説明 |
|------|---------|-------------|
| `--json` | 無効 | 人が読む形ではなく、機械で読める JSON を出力します。 |
| `--fail-on <level>` | `critical` | この深刻度以上の指摘が 1 つでもあれば、非ゼロで終了します（`low`、`moderate`、`high`、`critical`）。 |
| `--skip-venv` | 無効 | Hermes の Python の venv を調べません。 |
| `--skip-plugins` | 無効 | プラグインの依存ファイルを調べません。 |
| `--skip-mcp` | 無効 | `config.yaml` でバージョンを固定した MCP サーバーを調べません。 |

## `hermes login` / `hermes logout` *(非推奨)* {#hermes-login-hermes-logout-deprecated}

:::caution
`hermes login` は廃止されました。OAuth の認証情報の管理には `hermes auth`、プロバイダの選択には `hermes model`、対話的な設定一式には `hermes setup` を使ってください。
:::

## `hermes auth` {#hermes-auth}

同じプロバイダでキーを回して使うための、認証情報のプールを管理します。詳しくは [認証情報プール](/hermes/docs/user-guide/features/credential-pools/) を参照してください。

```bash
hermes auth                                              # Interactive wizard
hermes auth list                                         # Show all pools
hermes auth list openrouter                              # Show specific provider
hermes auth add openrouter --api-key sk-or-v1-xxx        # Add API key
hermes auth add openrouter --type oauth                  # Browser login (OpenRouter PKCE) mints a key for you
hermes auth add anthropic --type oauth                   # Add OAuth credential
hermes auth add openai-codex --type oauth --priority 0   # Add an account and try it first
hermes auth remove openrouter 2                          # Remove by index
hermes auth priority openrouter backup-key 0             # Move a credential to the front of fill_first order
hermes auth reset openrouter                             # Clear cooldowns
hermes auth reset openrouter 2                           # Clear the cooldown on one credential
hermes auth refresh openai-codex work                    # Refresh one OAuth credential and clear its cooldown
hermes auth status anthropic                             # Show auth status for a provider
hermes auth logout anthropic                             # Log out and clear stored auth state
hermes auth spotify                                      # Authenticate Hermes with Spotify via PKCE
```

サブコマンド: `add`、`list`、`remove`、`reset`、`priority`、`refresh`、`status`、`logout`、`spotify`。サブコマンドなしで呼ぶと、対話的な管理ウィザードが立ち上がります。

## `hermes status` {#hermes-status}

```bash
hermes status [--all] [--deep]
```

| オプション | 説明 |
|--------|-------------|
| `--all` | 共有できるよう伏せ字にした形で、すべての詳細を表示します。 |
| `--deep` | 時間のかかる、より踏み込んだ検査を行います。 |

## `hermes cron` {#hermes-cron}

```bash
hermes cron <list|create|edit|pause|resume|run|remove|status|runs|incidents|doctor|tick>
```

| サブコマンド | 説明 |
|------------|-------------|
| `list` | 予約された仕事を表示します。 |
| `create` / `add` | プロンプトから予約の仕事を作ります。`--skill` を繰り返して、スキルを 1 つ以上付けられます。`--reasoning-effort <none\|minimal\|low\|medium\|high\|xhigh\|max\|ultra>` で、その仕事だけ推論の深さを固定できます。 |
| `edit` | 仕事のスケジュール、プロンプト、名前、配信先、繰り返し回数、付けたスキルを変更します。`--clear-skills`、`--add-skill`、`--remove-skill` に加えて `--reasoning-effort`（空文字で固定を解除）が使えます。 |
| `pause` | 仕事を消さずに一時停止します。 |
| `resume` | 止めていた仕事を再開します。止めているあいだに繰り返しの実行時刻が来ていた場合、それは来たままの扱いで残ります（次のティックで 1 回だけ追いかけて実行するか、飛ばしたことが記録されます）。それ以外のときは、次の実行時刻を計算し直します。 |
| `run` | 次のスケジューラのティックで仕事を動かします。 |
| `remove` | 予約された仕事を削除します。 |
| `status` | cron のスケジューラが動いているかを確認します。 |
| `doctor` | 読み取りだけの健康診断です。失敗した実行、失敗した配信、期限切れや欠けている `next_run_at`、見つからないスクリプトや作業ディレクトリを調べます。問題があれば非ゼロで終了します。 |
| `tick` | 期限の来た仕事を一度だけ実行して終了します。 |

cron の**きっかけ**は `cron.provider` の設定キーで差し替えられます。空
（既定）なら、プロセス内蔵のティッカーを使います。`chronos`（ゼロまでスケールする
ホスト型ゲートウェイ向けの、NAS が管理するプロバイダ）を指定して `cron.chronos.*` の
キー（`portal_url`、`callback_url`、`expected_audience`、`nas_jwks_url`）で設定するか、
`plugins/cron/<name>/` または `$HERMES_HOME/plugins/<name>/` に置いた独自のプロバイダを
名前で指定します。知らないプロバイダや使えないプロバイダを指定した場合は組み込みへ戻るので、
cron がきっかけを失うことはありません。
[cron の内部](/hermes/docs/developer-guide/cron-internals/#gateway-integration) の文書も参照してください。

## `hermes kanban` {#hermes-kanban}

```bash
hermes kanban [--board <slug>] <action> [options]
```

複数のプロファイル・複数のプロジェクトで使える共同作業のボードです。1 つの導入で多くのボードを持てます（プロジェクト単位、リポジトリ単位、領域単位）。ボードはそれぞれ独立した待ち行列で、自分の SQLite の DB とディスパッチャの範囲を持ちます。新しく導入すると `default` というボードが 1 つでき、その DB は後方互換のため `~/.hermes/kanban.db` です。追加のボードは `~/.hermes/kanban/boards/<slug>/kanban.db` に置かれます。ゲートウェイに組み込まれたディスパッチャは、ティックごとにすべてのボードを見て回ります。

**共通のフラグ（以下のすべての操作に効きます）:**

| フラグ | 用途 |
|------|---------|
| `--board <slug>` | 指定したボードを対象にします。省略すると今のボード（`hermes kanban boards switch`、環境変数 `HERMES_KANBAN_BOARD`、または `default`）になります。 |

**これは人間やスクリプトのための入口です。** ディスパッチャが起動するエージェントのワーカーは、`hermes kanban` をシェルから呼ぶのではなく、専用の `kanban_*` [ツールセット](/hermes/docs/user-guide/features/kanban/#how-workers-interact-with-the-board)（`kanban_show`、`kanban_complete`、`kanban_request_review`、`kanban_request_changes`、`kanban_block`、`kanban_create`、`kanban_link`、`kanban_comment`、`kanban_heartbeat`。まとめ役のプロファイルにはさらに `kanban_list` と `kanban_unblock`）でボードを操作します。ワーカーの環境には `HERMES_KANBAN_BOARD` が固定されているので、他のボードは物理的に見えません。

| 操作 | 用途 |
|--------|---------|
| `init` | `kanban.db` が無ければ作ります。何度実行しても同じ結果です。 |
| `boards list` / `boards ls` | すべてのボードをタスク数とともに一覧します。`--json`、`--all`（保管済みも含む）。 |
| `boards create <slug>` | 新しいボードを作ります。フラグ: `--name`、`--description`、`--icon`、`--color`、`--switch`（そのまま今のボードにする）。slug はケバブケースで、自動的に小文字になります。 |
| `boards switch <slug>` / `boards use` | `<slug>` を今のボードとして保存します（`~/.hermes/kanban/current` に書きます）。 |
| `boards show` / `boards current` | 今のボードの名前、DB のパス、タスク数を表示します。 |
| `boards rename <slug> "<name>"` | ボードの表示名を変えます。slug は変えられません。 |
| `boards rm <slug>` | ボードを保管（既定）するか、完全に削除します。`--delete` は保管をせずに消します。保管したボードは `boards/_archived/<slug>-<ts>/` へ移ります。`default` に対しては拒否されます。 |
| `create "<title>"` | 今のボードに新しいタスクを作ります。フラグ: `--body`、`--assignee`、`--parent`（繰り返し可）、`--workspace scratch\|worktree\|dir:<path>`、`--tenant`、`--priority`、`--triage`、`--idempotency-key`、`--max-runtime`、`--max-retries`、`--skill`（繰り返し可）。 |
| `list` / `ls` | 今のボードのタスクを一覧します。`--mine`、`--assignee`、`--status`、`--tenant`、`--archived`、`--json` で絞り込めます。 |
| `show <id>` | タスクをコメントと出来事とともに表示します。機械で読むなら `--json`。 |
| `assign <id> <profile>` | 担当を決める・付け替えます。`none` で担当を外します。実行中のタスクには拒否されます。 |
| `link <parent> <child>` | 依存関係を追加します。循環は検出されます。両方のタスクが同じボードにある必要があります。 |
| `unlink <parent> <child>` | 依存関係を外します。 |
| `claim <id>` | 着手できるタスクを不可分に取得します。解決されたワークスペースのパスを表示します。 |
| `comment <id> "<text>"` | コメントを追加します。次にそのタスクを取ったワーカーが、`kanban_show()` の応答の一部として読みます。 |
| `complete <id>` | タスクを完了にします。フラグ: `--result`、`--summary`、`--metadata`。 |
| `block <id> "<reason>"` | 人の判断待ちとしてタスクを止めます。理由はコメントとしても残ります。 |
| `request-review <id>` | タスクを `review` へ移し、レビュー担当へ引き継ぎます — 停止ではありません。フラグ: `--summary`、`--metadata`、`--reviewer`（レビューを割り振る前に担当を付け替えます）。 |
| `request-changes <id> <reason>` | 進行中のレビューに対するレビュー担当の判断です。そのレビューの試行を閉じ、タスクを元の実装者へ戻します。 |
| `reopen-review <id>...` | レビュー中のタスクを修正のために差し戻します（`review` → ready / todo）。フラグ: `--reason`（コメントとして残ります）。 |
| `schedule <id> "<reason>"` | 時間待ちや後追いの作業を `scheduled` へ寄せて、人が止めている案件として表示されないようにします。 |
| `unblock <id>` | 止まっていたタスクを元の段階（`review` か `ready`）へ戻します。依存がまだ残っていれば `todo` へ戻します。 |
| `archive <id>` | 既定の一覧から隠します。`gc` が使い捨てのワークスペースを片付けます。 |
| `tail <id>` | タスクの出来事の流れを追いかけます。 |
| `dispatch` | 今のボードに対してディスパッチャを 1 回走らせます。フラグ: `--dry-run`、`--max N`、`--failure-limit N`、`--json`。 |
| `context <id>` | ワーカーが目にする文脈をすべて表示します（タイトル + 本文 + 親の結果 + コメント）。 |
| `specify <id>` / `specify --all` | 仕分け列にあるタスクを、補助の LLM を使って具体的な仕様（タイトルと、目的・進め方・受け入れ条件を書いた本文）に膨らませ、`todo` へ上げます。フラグ: `--tenant`（`--all` を 1 つのテナントに絞る）、`--author`、`--json`。モデルは `config.yaml` の `auxiliary.triage_specifier` で設定します。 |
| `decompose <id>` / `decompose --all` | 仕分け列のタスクを、説明の内容に応じて専門のプロファイルへ割り振りながら、子タスクの連なりへ展開します。LLM が展開する意味がないと判断した場合は、specify と同じく 1 つのタスクとして昇格させます。フラグは `specify` と同じです。展開に使うモデルは `config.yaml` の `auxiliary.kanban_decomposer` で設定します。`kanban.orchestrator_profile` は、展開後に根のタスク（まとめ役のタスク）を誰が持つかだけを決めます。`kanban.auto_decompose: true`（既定）のときは、ディスパッチャのティックごとに自動でも走ります。[自動と手動のまとめ方](/hermes/docs/user-guide/features/kanban/#auto-vs-manual-orchestration) を参照してください。 |
| `gc` | 保管済みタスクの使い捨てワークスペースを削除します。 |

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

ボードの決まり方（優先度の高い順）: `--board <slug>` のフラグ → 環境変数 `HERMES_KANBAN_BOARD` → `~/.hermes/kanban/current` のファイル → `default`。

すべての操作は、ゲートウェイのスラッシュコマンド（`/kanban …`）としても同じ引数で使えます — `boards` のサブコマンドや `--board` のフラグも含みます。

設計の全体像 — Cline Kanban / Paperclip / NanoClaw / Gemini Enterprise との比較、8 つの共同作業の型、4 つの利用場面、同時実行の正しさの証明 — は [Kanban の案内](/hermes/docs/user-guide/features/kanban/) を参照してください。

## `hermes egress` {#hermes-egress}

リモートのターミナルサンドボックス向けに、外向き通信へ認証情報を差し込むファイアウォールです。[iron-proxy](https://github.com/ironsh/iron-proxy) のデーモンを包んでいます — TLS を中継するプロキシで、ネットワークの境界で、意味を持たないプロキシ用トークンを本物の上流の認証情報に差し替えます。そのためサンドボックス側が本物のキーを持つことはありません。既定では無効です。導入方法と仕組みは [Egress プロキシ](/hermes/docs/user-guide/egress/iron-proxy/) のページを参照してください。

```bash
hermes egress install                  # download the pinned iron-proxy binary
hermes egress install --force          # re-download even if already installed

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

### よくある流れ {#common-flows}

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

### 調べるときの近道 {#diagnostic-shortcuts}

```bash
hermes egress status                     # current state in one view
cat ~/.hermes/proxy/proxy.yaml           # the rendered iron-proxy config
tail -20 ~/.hermes/proxy/iron-proxy.log  # daemon-level diagnostics
tail -f ~/.hermes/proxy/iron-proxy.log | jq  # daemon + per-request log (line-delimited JSON; v0.39 combines both streams)
```

よくある不具合とその直し方は [Egress プロキシ → トラブルシューティング](/hermes/docs/user-guide/egress/iron-proxy/#troubleshooting) にまとめてあります。

## `hermes project` {#hermes-project}

```bash
hermes project <create|list|show|add-folder|remove-folder|rename|set-primary|use|archive|restore|bind-board>
```

プロジェクトは、複数のフォルダやリポジトリにまたがれる、人が名前を付けたワークスペースです。デスクトップでセッションをまとめる基準になり、kanban のボードと結び付ければ、タスクに worktree とブランチの命名規則が自動で決まります。状態はプロファイルごとに持ちます。

| サブコマンド | 説明 |
|------------|-------------|
| `create` | 新しいプロジェクトを作ります。 |
| `list`（別名 `ls`） | プロジェクトを一覧します。 |
| `show` | プロジェクトの詳細を表示します。 |
| `add-folder` | フォルダやリポジトリをプロジェクトに追加します。 |
| `remove-folder` | フォルダをプロジェクトから外します。 |
| `rename` | プロジェクトの名前を変えます。 |
| `set-primary` | 主となるフォルダを決めます。 |
| `use` | 今のプロジェクトを設定します。 |
| `archive` | プロジェクトを保管します（元に戻せます）。 |
| `restore` | 保管したプロジェクトを戻します。 |
| `bind-board` | kanban のボードをこのプロジェクトに結び付けます。 |

## `hermes webhook` {#hermes-webhook}

```bash
hermes webhook <subscribe|list|remove|test>
```

イベントをきっかけにエージェントを動かすための、動的な webhook 購読を管理します。設定で webhook のプラットフォームが有効になっている必要があります — 未設定なら、設定方法を表示します。

| サブコマンド | 説明 |
|------------|-------------|
| `subscribe` / `add` | webhook の経路を作ります。サービス側に設定する URL と HMAC のシークレットを返します。 |
| `list` / `ls` | エージェントが作った購読をすべて表示します。 |
| `remove` / `rm` | 動的な購読を削除します。config.yaml に書いた固定の経路には影響しません。 |
| `test` | テストの POST を送り、購読が働いているか確かめます。 |

### `hermes webhook subscribe` {#hermes-webhook-subscribe}

```bash
hermes webhook subscribe <name> [options]
```

| オプション | 説明 |
|--------|-------------|
| `--prompt` | `{dot.notation}` でペイロードを参照できるプロンプトのひな形。 |
| `--events` | 受け付けるイベント種別をカンマ区切りで指定します（例: `issues,pull_request`）。空ならすべて。 |
| `--description` | 人が読むための説明。 |
| `--skills` | エージェントの実行時に読み込むスキル名をカンマ区切りで指定します。 |
| `--deliver` | 配信先: `log`（既定）、`telegram`、`discord`、`slack`、`github_comment`。 |
| `--deliver-chat-id` | 別のプラットフォームへ配信するときの、宛先のチャットやチャンネルの ID。 |
| `--secret` | HMAC のシークレットを自分で指定します。省略すると自動生成されます。 |
| `--deliver-only` | エージェントを動かさず、`--prompt` を展開したものをそのままメッセージとして配信します。LLM の費用はゼロで、1 秒もかかりません。`--deliver` に `log` 以外の実際の宛先が必要です。 |
| `--script` | `~/.hermes/scripts/` 以下に置く、絞り込み・変換のスクリプト。webhook のペイロードは JSON として標準入力に渡されます。標準出力に出した JSON がペイロードを置き換え、標準出力が空のとき、`[SILENT]` のとき、終了コードが非ゼロのときは、その webhook を無視します。[スクリプトによる絞り込みと変換](/hermes/docs/user-guide/messaging/webhooks/#script-filters-and-transforms) を参照してください。 |
| `--route-profile` | 経路を、多重化されたプロファイルに結び付けます。以後その経路は `/p/<profile>/webhooks/<name>` でだけ届き、エージェントもそのプロファイルとして動きます。既存のプロファイルと照合され、更新時に省略すればそのまま保たれます。全体の `-p/--profile`（購読ファイルを書くゲートウェイを選ぶもの）とは別物です。[複数プロファイルのゲートウェイ](/hermes/docs/user-guide/multi-profile-gateways/) を参照してください。 |

購読の内容は `~/.hermes/webhook_subscriptions.json` に保存され、ゲートウェイを再起動しなくても webhook のアダプタが読み直します。すでにある名前で `subscribe` をやり直しても、`--secret` / `--route-profile` を渡さない限り、シークレットとプロファイルの結び付きはそのまま残ります。

## `hermes doctor` {#hermes-doctor}

```bash
hermes doctor [--fix]
```

| オプション | 説明 |
|--------|-------------|
| `--fix` | 直せるところは自動で直そうとします。 |

**API Connectivity** の項目には `IPv6 route` の検査が入っています。両方のプロトコルに対応した既知のホストへ、短い（2 秒）IPv6 の TCP 接続を 1 回だけ開いてみるものです。経路は知らされているのに時間切れになるだけの状態（行き止まりの IPv6 のアドレス帯）は、直し方である `network.force_ipv4: true` を挙げた注意として報告されます。IPv6 の経路がまったく無いのは健全な状態で、OK と報告されます。すでに `force_ipv4` が設定されているときは、この検査は飛ばされます。

自分で足した接続先の設定についての検査（どちらも注意だけで、`--fix` は書き換えません）:

- `custom_providers` が YAML のリストになっていないとき（たとえば誤った `config set` が残した文字列）は、そのキーと受け取った型を挙げたエラーとして報告されます。リストに戻すまで、実行時は自分で足した接続先をすべて無視します。
- 古い形の `custom_providers` のリストの項目で、対応する `providers:` の項目（同じ接続先の URL）が無いものは、どう移せばよいかを添えて報告されます。そうした項目は、他のどの画面も編集する `providers:` の対応表ではなく、役目を終えたリストの保管場所から読まれ続けます（モデルの選択画面と Custom Endpoints のページは両方を読みます）。リストを `providers:` へ移す 1 回きりの v12 の移行は、二度と走りません。

## `hermes dump` {#hermes-dump}

```bash
hermes dump [--show-keys]
```

Hermes の設定全体を、短いプレーンテキストの要約として出力します。助けを求めるときに Discord、GitHub の issue、Telegram へそのまま貼り付けられるよう作られています — ANSI の色も特別な装飾もなく、データだけです。

| オプション | 説明 |
|--------|-------------|
| `--show-keys` | `set`/`not set` だけでなく、伏せ字にした API キーの一部（先頭と末尾の 4 文字）を表示します。 |

### 何が含まれるか {#what-it-includes}

| 区分 | 内容 |
|---------|---------|
| **ヘッダー** | Hermes のバージョン、公開日、git のコミットハッシュ |
| **環境** | OS、Python のバージョン、OpenAI SDK のバージョン |
| **識別情報** | 有効なプロファイル名、HERMES_HOME のパス |
| **モデル** | 設定された既定のモデルとプロバイダ |
| **ターミナル** | バックエンドの種類（local、docker、ssh など） |
| **API キー** | 22 のプロバイダ／ツールの API キーがあるかどうか |
| **機能** | 有効なツールセット、MCP サーバーの数、メモリのプロバイダ |
| **サービス** | ゲートウェイの状態、設定済みのメッセージングプラットフォーム |
| **作業量** | cron の仕事の数、導入済みスキルの数 |
| **設定の上書き** | 既定と違う値になっている設定 |

### 出力の例 {#example-output}

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

### 使いどころ {#when-to-use}

- GitHub にバグを報告するとき — issue に貼り付ける
- Discord で助けを求めるとき — コードブロックに入れて共有する
- 自分の環境を他の人のものと見比べるとき
- うまく動かないときに、ひととおり確かめたいとき

:::tip
`hermes dump` は共有するためのものです。対話的に調べたいときは `hermes doctor`、見た目で全体を掴みたいときは `hermes status` を使ってください。
:::

## `hermes debug` {#hermes-debug}

```bash
hermes debug share [options]
```

デバッグ用のレポート（システム情報と最近のログ）をペーストサービスへ上げ、共有できる URL を受け取ります。手早く助けを求めたいときに便利で、相手が原因を探るのに必要なものがひととおり入っています。

| オプション | 説明 |
|--------|-------------|
| `--lines <N>` | ログファイルごとに含める行数（既定: 200）。 |
| `--expire <days>` | ペーストの有効日数（既定: 7）。 |
| `--nous` | 公開のペーストサービスではなく、Nous 内部の診断用ストレージへ上げます。Nous のサポートから非公開の診断一式を求められたときに使ってください。 |
| `--local` | アップロードせず、レポートをその場に表示します。 |
| `--no-redact` | アップロード時の伏せ字処理を止めます。既定では伏せ字にしてから上げます。 |

レポートには、システム情報（OS、Python のバージョン、Hermes のバージョン）、最近のエージェント・ゲートウェイ・GUI／ダッシュボード・デスクトップのログ（ファイルごとに 512 KB まで）、伏せ字にした API キーの状態が入ります。既定ではアップロード時に伏せ字にするので、秘密の値は含まれません。

既定のアップロードは、公開のペーストサービスを paste.rs、dpaste.com の順に試します。`--nous` を付けると、同じ一式を非公開の Nous の診断用ストレージへ上げます。返ってくる閲覧リンクは Nous のチームのためのもので、14 日で自動的に消えます。

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

設定、スキル、セッション、データを zip にまとめます。hermes-agent のコード本体は含みません。また、以前のバックアップの成果物（`backups/`、`state-snapshots/`）を入れ子にすることもしません — それぞれがすでに自前の `state.db` の写しを持っているからです。

| オプション | 説明 |
|--------|-------------|
| `-o`, `--output <path>` | zip ファイルの出力先（既定: `~/hermes-backup-<timestamp>.zip`）。 |
| `-q`, `--quick` | 手早いスナップショットです。重要な状態ファイル（config.yaml、state.db、.env、認証、cron の仕事）だけを取ります。全体のバックアップよりずっと速く終わります。 |
| `-l`, `--label <name>` | スナップショットのラベル（`--quick` のときだけ使われます）。 |
| `-k`, `--keep <N>` | 全体のバックアップのあと、出力先にある古い `hermes-backup-*.zip` を、新しいものから N 個を残して削除します（既定 3。`0` ならすべて残します）。名前を自分で付けた zip には手を触れません。 |

バックアップは SQLite の `backup()` API を使って安全に写すので、Hermes が動いている最中でも正しく取れます（WAL モードでも安全です）。

**終了コード:** 選ばれたファイルがすべて書庫に入ったときだけ `0` です。入れられなかったファイルがある場合（`Backup incomplete: …`）、残りは復元できるよう zip 自体は残しますが、コマンドは `1` で終わります。cron や systemd のタイマーが、欠けのある書庫を成功として報告しないためです。`--keep` による古い分の削除も飛ばされるので、完全な過去の書庫は残ります。`2` は、別のバックアップがすでに動いていたという意味です。

**zip に含まれないもの:**

- `*.db-wal`、`*.db-shm`、`*.db-journal` — SQLite の WAL・共有メモリ・ジャーナルの付随ファイル。`*.db` 自体は `sqlite3.backup()` で一貫した状態を写してあるので、生きた付随ファイルを一緒に入れると、復元したときに書きかけの状態が見えてしまいます。
- `checkpoints/` — セッションごとの軌跡のキャッシュ。ハッシュで管理され、セッションごとに作り直されるので、他の環境へ持っていっても意味がありません。
- `~/.hermes` の直下（および各 `profiles/<name>/` の直下）の `models/`、`runtimes/`、`node/` — 作り直せる実行時のダウンロードで、数十 GB になることもあります。同じ名前でも、もっと深い階層にあるもの（スキルの `models/`）は残します。
- 同じ直下にある `cache/` のうち、作り直せるもの — モデルやプラグインの目録、印、ブラウザのプロファイル、ツール出力の退避。残るのは長持ちする成果物です: `cache/images`、`cache/audio`、`cache/videos`、`cache/documents`、`cache/screenshots`（届けた、あるいは受け取ったメディア）と `cache/citations`（根拠付きの引用の台帳）。もっと深い階層の `cache/`（スキルの中のもの）は丸ごと残します。
- Unix のソケット、デバイス、シンボリックリンク — zip には入れられません。これらを除外する前は、置き去りの `gateway.sock` があるだけで、全体のバックアップが毎回 `Backup incomplete` と報告していました。
- `hermes-agent` のコード本体（これは利用者のデータのバックアップであって、リポジトリの写しではありません）。

### 例 {#examples}

```bash
hermes backup                           # Full backup to ~/hermes-backup-*.zip
hermes backup -o /tmp/hermes.zip        # Full backup to specific path
hermes backup --quick                   # Quick state-only snapshot
hermes backup --quick --label "pre-upgrade"  # Quick snapshot with label
```

## `hermes checkpoints` {#hermes-checkpoints}

```bash
hermes checkpoints [COMMAND]
```

`~/.hermes/checkpoints/` にある影の git の保管庫 — セッション内の `/rollback` を支えている保存層 — を確認・管理します。いつ実行しても安全で、エージェントが動いている必要もありません。

| サブコマンド | 説明 |
|------------|-------------|
| `status`（既定） | 全体の容量、プロジェクト数、プロジェクトごとの内訳を表示します。`hermes checkpoints` だけでも同じです。 |
| `list` | `status` の別名です。 |
| `prune` | 片付けを強制します — 孤立したものや古いプロジェクトを削除し、保管庫を整理し、容量の上限を守らせます。24 時間の重複実行防止の印は無視します。 |
| `clear` | チェックポイントの保管場所をまるごと削除します。元に戻せません。`-f` がなければ確認を求めます。 |
| `clear-legacy` | v1 から v2 への移行で作られた `legacy-<timestamp>/` の書庫だけを削除します。削除できない書庫があった場合は、`Could not delete N archive(s)` と表示してから `2` で終了します（例: Windows で読み取り専用になった git のオブジェクト）。 |

### オプション {#options}

| オプション | サブコマンド | 説明 |
|--------|------------|-------------|
| `--limit N` | `status`, `list` | 一覧するプロジェクトの上限（既定 20）。 |
| `--retention-days N` | `prune` | `last_touch` が N 日より古いプロジェクトを削除します（既定 7）。 |
| `--max-size-mb N` | `prune` | 孤立・古いものを片付けたあと、保管庫全体が N MB 以下になるまで、プロジェクトごとに古いコミットから削除します（既定 500）。 |
| `--keep-orphans` | `prune` | 作業ディレクトリがもう存在しないプロジェクトを削除しません。 |
| `-f`, `--force` | `clear`, `clear-legacy` | 確認のプロンプトを出しません。 |

### 例 {#examples}

```bash
hermes checkpoints                                  # status overview
hermes checkpoints prune --retention-days 3         # aggressive cleanup
hermes checkpoints prune --max-size-mb 200          # tighten size cap once
hermes checkpoints clear-legacy -f                  # drop v1 archive dirs
hermes checkpoints clear -f                         # wipe everything
```

仕組みの全体と、セッション内で使うコマンドについては [チェックポイントと `/rollback`](/hermes/docs/user-guide/checkpoints-and-rollback/) を参照してください。

## `hermes import` {#hermes-import}

```bash
hermes import <zipfile> [options]
```

前に取った Hermes のバックアップを、Hermes のホームディレクトリへ復元します。書庫の中のファイルは、ホームにある同名のファイルをすべて上書きします。`--force` は、すでに Hermes が入っている場所へ復元するときの確認プロンプトを省くだけです。

| オプション | 説明 |
|--------|-------------|
| `-f`, `--force` | 既存の導入に対する確認プロンプトを出しません。 |

:::warning
動いているプロセスとぶつからないよう、復元の前にゲートウェイを止めてください。
:::

### SQLite のデータベース {#sqlite-databases}

`.db` のファイル（`state.db`、`kanban.db`、`response_store.db` など）は、ふつうのファイルのように名前の付け替えで置き換えることはしません。名前を付け替えるとファイルの inode が入れ替わり、ゲートウェイやダッシュボード、WebUI のプロセスが古い方を開いたままになります。そのプロセスは復元前のページを読み続け、誰にも見えないセッションを書き続け、そのセッションは次に誰かが開くデータベースには存在しない — しかも何も記録されない、ということが起こります。そこで、`/snapshot restore` と同じやり方で、取り込んだページを**既存のデータベースファイルの中へ**書き込みます。こうすれば、開いているすべての接続が取り込んだデータに揃います。

生きたデータベースを安全に置き換えられない場合 — ページの複写に失敗し、*かつ*別のプロセスがそのファイルを開いたままの場合 — そのデータベースには手を触れず、`Warnings (N files skipped)` として一覧します。掴んでいるプロセスを止めてから、やり直してください。

新しい作業の上に古いバックアップを復元すること自体は今でもできますが、黙って行われることはなくなりました。取り込んだ `state.db` のメッセージ数が、置き換えられる側より少ないときは、要約にその旨が出ます:

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

Hermes のログファイルを表示・追尾・絞り込みします。ログはすべて `~/.hermes/logs/`（既定以外のプロファイルでは `<profile>/logs/`）に保存されます。

### ログファイル {#log-files}

| 名前 | ファイル | 記録される内容 |
|------|------|-----------------|
| `agent`（既定） | `agent.log` | エージェントの活動すべて — API の呼び出し、ツールの実行、セッションの一生（INFO 以上） |
| `errors` | `errors.log` | 警告とエラーだけ — agent.log を絞り込んだもの |
| `gateway` | `gateway.log` | メッセージングのゲートウェイの活動 — プラットフォームへの接続、メッセージの送受信、webhook の出来事 |
| `gui` | `gui.log` | ダッシュボード／TUI ゲートウェイ／PTY ブリッジ／WebSocket の出来事 |
| `desktop` | `desktop.log` | Electron のデスクトップアプリ — 起動、バックエンドの立ち上げ出力、最近の Python のトレースバック |

### オプション {#options}

| オプション | 説明 |
|--------|-------------|
| `log_name` | 見るログを指定します: `agent`（既定）、`errors`、`gateway`、あるいは `list` で使えるファイルとその大きさを表示します。 |
| `-n`, `--lines <N>` | 表示する行数（既定: 50）。 |
| `-f`, `--follow` | `tail -f` のように、ログをその場で追い続けます。Ctrl+C で止まります。 |
| `--level <LEVEL>` | 表示する最低のログレベル: `DEBUG`、`INFO`、`WARNING`、`ERROR`、`CRITICAL`。 |
| `--session <ID>` | セッション ID の一部を含む行だけに絞ります。 |
| `--since <TIME>` | いまから遡った時間で絞ります: `30m`、`1h`、`2d` など。`s`（秒）、`m`（分）、`h`（時）、`d`（日）が使えます。 |
| `--component <NAME>` | 構成要素で絞ります: `gateway`、`agent`、`tools`、`cli`、`cron`。 |

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

### 絞り込み {#filtering}

絞り込みは組み合わせられます。複数を指定したときは、**すべて**を満たした行だけが表示されます:

```bash
# WARNING+ lines from the last 2 hours containing session "tg-12345"
hermes logs --level WARNING --since 2h --session tg-12345
```

時刻を読み取れない行は、`--since` を使っているときも表示されます（複数行にわたるログの続きの行かもしれないからです）。レベルを判別できない行も、`--level` を使っているときは表示されます。

### ログの入れ替え {#log-rotation}

Hermes は Python の `RotatingFileHandler` を使っています。古いログは自動で入れ替わるので、`agent.log.1`、`agent.log.2` などを探してください。`hermes logs list` は、入れ替わったものも含めてすべてのログファイルを表示します。

## `hermes prompt-size` {#hermes-prompt-size}

```bash
hermes prompt-size [--platform <name>] [--json]
```

新しいセッションで固定的にかかるプロンプトの量 — 会話の中身が乗る*前*に、
毎回の API 呼び出しで送られるもの — を報告します。下流のアダプタやプロキシが
モデルの文脈長より厳しい上限を持っているときや、どの部分（スキル索引、メモリ、
プロフィール）が大きいのかを見たいときに役立ちます。

エージェントが組み立てるのと同じシステムプロンプトを作り、内訳を出します:

- **システムプロンプトの合計** — 組み上がったプロンプト全体（人格、案内、スキル
  索引、文脈ファイル、メモリ、プロフィール、時刻）。
- **スキル索引** — `<available_skills>` の部分。スキルをたくさん入れていると、
  ここが単独でいちばん大きくなりがちです。
- **メモリ**と**ユーザープロフィール** — `MEMORY.md` / `USER.md` の写し。
- **プロンプトの層** — stable / context / volatile。キャッシュが効きやすいよう、
  Hermes がプロンプトを重ねている構造に対応します。
- **ツールのスキーマ** — 有効なすべてのツールの JSON（毎回の呼び出しで固定的に
  乗るもう半分）。

完全にオフラインで動きます — API を呼ばないので、認証情報が無くても使えます。

```bash
# Human-readable breakdown for the CLI platform (default)
hermes prompt-size

# Simulate a messaging platform's prompt (different platform hint)
hermes prompt-size --platform telegram

# Machine-readable output for scripts
hermes prompt-size --json
```

:::tip
スキル索引とツールのスキーマは、有効にしているスキルとツールの数に比例して大きくなります。
プロンプトを小さくしたいときは、使っていないツールセットを切る（`hermes tools`）か、
要らないスキルを外してください（`hermes skills`）。今いるディレクトリにある文脈ファイル
（AGENTS.md、.cursorrules）も合計に効いてきます。
:::

## `hermes config` {#hermes-config}

```bash
hermes config <subcommand>
```

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `show` | 今の設定値を表示します。 |
| `edit` | `config.yaml` をエディタで開きます。 |
| `get <key> [--json] [--raw]` | ドットでつないだキーで、設定値を 1 つ表示します（例: `hermes config get model.default`）。`--json` は機械で読める形で出します。認証情報らしい値（`api_key`、`*_TOKEN`、`*_SECRET`、`password` など）は伏せ字になります（`sk-o...7890`）。エージェントがこれを、記録が残るセッションから実行するためです。`--raw` を付けると本当の値を表示します（`security.redact_secrets: false` にしても同じです）。既知の区分の下にある、スキーマが定義していない入れ子のキー（`compression.compressor.enabled`）も、ファイルにある値を表示します。加えて、Hermes がそれを読まないかもしれないという注意が標準エラーに出ます。標準出力と終了コード（0）は変わりません。 |
| `set <key> <value> [--force]` | 設定値を書き込みます。ドットでつないだパスは `config.yaml` へ、`UPPER_SNAKE` の名前（`OPENROUTER_API_KEY`、`DISCORD_HOME_CHANNEL`、`TELEGRAM_GROUP_ALLOWED_USERS`、`HERMES_TIMEZONE` など）はすべて環境変数とみなされ `.env` へ入ります — プラットフォームの設定の流れや `/sethome` が書くのと同じファイルで、実行時に値を読む側もここを見ます。`config set` が `UPPER_SNAKE` のキーを `config.yaml` に書くことは、`--force` を付けてもありません。環境変数の書き込みで禁止されている名前（`HERMES_YOLO_MODE`、`PATH` など）はその場で拒否されます。それ以外の `UPPER_SNAKE` の名前は、そのまま `.env` に保存されます（プラグインやスキル、外部のツールがプロセスの環境から読みます）。既知のキーを誤った接頭辞の下に書いた場合（`gateway.discord.foo`。`discord.foo` 自体は既知のキーです）は、候補を示して拒否され、何も書かれません。既知の区分の下にあるそれ以外の知らないパス（`agent.max_turnz` や、実行時に読まれるだけで既定値が用意されていないキー）は、候補を示す注意とともに書かれます。トップレベルにある知らない小文字のキーも、注意を出したうえで書かれます（トップレベルの値はスキル向けに環境へ橋渡しされるためです）。`--force` を付ければ、拒否された誤った接頭辞のパスも書き込めます。値はスキーマに照らして型が確かめられます。リストや対応表でなければならないキー（`custom_providers`、`model.aliases`、`display.platforms`、すでにそれらを持っているキー）は、素の文字列や形の合わない書き方を拒みます。また、リストや対応表に見えるのに YAML / JSON として正しくない値も、文字列として保存されるのではなく拒まれます。どちらの場合も何も書かれず、エラーが期待する型を教えます。YAML / JSON の書き方で渡してください（`hermes config set custom_providers '[{name: x, base_url: https://...}]'`）。`[` や `{` で始まるだけの文字列を保存したいときは、YAML として引用符で包みます（`"'[text'"`）。`--force` は、これまでどおり対応表の区分をまるごと置き換えます。リストの場所に入れたリスト以外の値は上書きになりません。ただし、名前のリストを緩く読むキー（`agent.disabled_toolsets`、`skills.disabled`）については、名前を 1 つ書くと 1 項目のリストとして保存されます。 |
| `unset <key>` | 設定のキーを消し、組み込みの既定値へ戻します。`UPPER_SNAKE` の名前では `.env` の項目を消し、さらに古い `config set` が残したトップレベルの写しが `config.yaml` にあれば、それも落とします（`get` はそうした写しを古いものとして報告します）。 |
| `path` | 設定ファイルのパスを表示します。 |
| `env-path` | `.env` ファイルのパスを表示します。 |
| `check` | 足りない設定や古い設定がないか調べます。 |
| `migrate` | 新しく増えた項目を対話的に追加します。 |

`config set model.provider <provider>` は、`model:` の区分の行き先を 1 つに保ちます。前のプロバイダから残った
`model.base_url` や `model.api_mode` が別のプロバイダの接続先だった場合は、取り除かれ（取り除いたことも表示され）
ます。そのままだと、新しいプロバイダのキーを古い接続先へ送ってしまい、別のプロバイダの名前を挙げた認証のエラーで
失敗するからです。新しいプロバイダ自身の接続先、名前を付けた `custom_providers` の項目の接続先、`custom` や
ローカルの別名の下にある URL は、そのまま残ります。見覚えのないホスト（プロキシ、LAN のサーバー）は、
それが今も効いているという注意とともに残ります。

### キー名の中にあるドット {#dots-inside-key-names}

`hermes config set/get/unset` は `.` を入れ子の区切りとして使いますが、実際のキー名には
ドットがそのまま入っていることがよくあります — モデルの ID（`grok-4.6`、`glm-5.3-flash`）、
Matrix の部屋の ID（`!room:example.org`）、版のついたプロバイダ名などです。次の 2 つの
決まりで、こうしたキーも指定できます:

- **すでにあるキーはそのまま動きます。** 既存の対応表をたどるとき、ドットを含む残りの
  部分にそのまま一致する既存のキーがあれば、分割するよりそちらが優先されます。
  `hermes config set providers.p.models.grok-4.6.supports_vision true` は
  実在する `grok-4.6` の項目を更新します（`get`/`unset` も同じたどり方をします）。
- **ドット入りのキーを新しく作るときはエスケープが要ります。** ドットはバックスラッシュで
  逃がします: `hermes config set 'providers.p.models.grok-4\.7.context_length' 128000`
  と書けば、`grok-4.7` というキーがそのまま作られます。（シェルがバックスラッシュを
  食べないよう、キーを引用符で囲んでください。）

エスケープしないまま書くと、既存のドット入りの兄弟キーを覆い隠す入れ子ができてしまう場合
（例: 既存の `grok-4.6` の隣に `grok-4` を作ろうとした場合）、実行時には決して読まれない
幻の項目を黙って書く代わりに、エラーで失敗します。

## `hermes pairing` {#hermes-pairing}

```bash
hermes pairing <list|approve|revoke|clear-pending>
```

| サブコマンド | 説明 |
|------------|-------------|
| `list` | 承認待ちと承認済みの利用者を表示します。 |
| `approve <platform> <code>` | ペアリングコードを承認します。 |
| `revoke <platform> <user-id>` | 利用者のアクセスを取り消します。 |
| `clear-pending` | 承認待ちのペアリングコードを消します。 |

## `hermes skills` {#hermes-skills}

```bash
hermes skills <subcommand>
```

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `browse` | スキルの配布元をページ送りで見て回ります。 |
| `search` | スキルの配布元を検索します。 |
| `install` | スキルを導入します。 |
| `inspect` | 導入せずにスキルの中身を見ます。 |
| `list` | 導入済みのスキルを一覧します。 |
| `check` | 導入済みのハブのスキルに、上流の更新がないか調べます。 |
| `update` | 上流に変更のあるハブのスキルを入れ直します。 |
| `audit` | 導入済みのハブのスキルを調べ直します。 |
| `uninstall` | ハブから入れたスキルを削除します。 |
| `reset` | `user_modified` の印が付いて動かせなくなった同梱スキルを、目録の項目を消して元に戻します。`--restore` を付けると、利用者の写しも同梱版に置き換えます。 |
| `opt-out` | 同梱スキルが、いま有効なプロファイルへ配られるのを止めます。`.no-bundled-skills` という印を書き、導入処理・`hermes update`・各種の同期が同梱スキルの配布を飛ばすようにします。既定では安全で、ディスク上のものには手を触れません。`--remove` を付けると、すでにある同梱スキルのうち**変更されていないもの**も削除します（利用者が編集したもの、ハブから入れたもの、手書きのものは決して削除しません。先に内容を見せて確認を取ります。`--yes` で確認を省けます）。 |
| `opt-in` | `.no-bundled-skills` の印を消して `opt-out` を取り消し、次の `hermes update` で同梱スキルがまた配られるようにします。`--sync` を付けるとすぐに配り直します。 |
| `publish` | スキルを配布元へ公開します。 |
| `snapshot` | スキルの設定を書き出し・読み込みします。 |
| `tap` | 独自のスキルの供給元を管理します。 |
| `config` | プラットフォームごとに、スキルの有効・無効を対話的に設定します。 |

よく使う例:

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
- `--force` は、第三者やコミュニティのスキルに対する、危険でない方針上のブロックを越えられます。
- `--force` でも、`dangerous` という走査の判定は越えられません。
- `--source skills-sh` は、公開されている `skills.sh` の一覧を検索します。
- `--source well-known` を使うと、`/.well-known/skills/index.json` を公開しているサイトを Hermes に見させられます。
- `--source browse-sh` は、[browse.sh](https://browse.sh) が持つ 200 以上のサイト別ブラウザ操作スキルの目録を検索します。識別子は `browse-sh/airbnb.com/search-listings-ddgioa` のような形です。
- `http(s)://…/*.md` の URL を渡すと、`SKILL.md` と、そこから明示的に参照されている `references/`、`templates/`、`scripts/`、`assets/`、`examples/` 以下のファイルを導入します。frontmatter に `name:` が無く、URL の末尾も識別子として使えない場合、対話的なターミナルなら名前を尋ねます。対話できない入口（TUI の中の `/skills install`、ゲートウェイのプラットフォーム）では、代わりに `--name <x>` が必要です。

## `hermes bundles` {#hermes-bundles}

```bash
hermes bundles <subcommand>
```

スキルバンドルは、複数のスキルを 1 つの `/<bundle-name>` スラッシュコマンドにまとめるものです。バンドルを呼ぶと、参照しているスキルがすべて 1 つのメッセージにまとめて読み込まれます。保存先は `~/.hermes/skill-bundles/<slug>.yaml` です。YAML の書き方と挙動は [スキルバンドル](/hermes/docs/user-guide/features/skills/#skill-bundles) を参照してください。

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `list` | 入っているバンドルを一覧します（サブコマンドを付けなかったときの既定） |
| `show <name>` | バンドル 1 つの名前、説明、スキル、ファイルのパスを表示します |
| `create <name>` | 新しいバンドルを作ります。`--skill <id>` を繰り返して渡すか、省略すると対話的に入力できます。`--description`、`--instruction`、`--force` も使えます。 |
| `delete <name>` | バンドルのファイルを削除します |
| `reload` | `~/.hermes/skill-bundles/` を読み直し、増えたバンドルと減ったバンドルを報告します |

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

チャットのセッションでは、`/bundles` で入っているバンドルを一覧し、`/<bundle-name>` で 1 つを読み込みます。

## `hermes curator` {#hermes-curator}

```bash
hermes curator <subcommand>
```

キュレーターは、補助のモデルが裏で動かす仕事です。エージェントが作ったスキルを定期的に見直し、古くなったものを整理し、重なっているものをまとめ、要らなくなったものを保管します。同梱のスキルとハブから入れたスキルには手を触れません。保管したものは元に戻せますし、自動で削除されることはありません。

| サブコマンド | 説明 |
|------------|-------------|
| `status` | キュレーターの状態とスキルの統計を表示します |
| `run` | いますぐ見直しを実行します（LLM の処理が終わるまで待ちます） |
| `run --background` | LLM の処理を裏のスレッドで始め、すぐに戻ります |
| `run --dry-run` | 下見だけです — 何も変えずに見直しのレポートを作ります |
| `backup` | `~/.hermes/skills/` の tar.gz のスナップショットを手動で取ります（キュレーターは実際に動く前にも自動で取ります） |
| `rollback` | スナップショットから `~/.hermes/skills/` を戻します（既定はいちばん新しいもの） |
| `rollback --list` | 使えるスナップショットを一覧します |
| `rollback --id <ts>` | id を指定してスナップショットを戻します |
| `rollback -y` | 確認のプロンプトを出しません |
| `pause` | 再開するまでキュレーターを止めます |
| `resume` | 止めていたキュレーターを再開します |
| `pin <skill>` | スキルを固定し、キュレーターが自動で状態を変えないようにします |
| `unpin <skill>` | 固定を外します |
| `restore <skill>` | 保管したスキルを戻します |
| `archive <skill>` | スキルを手動で保管します |
| `prune` | キュレーターがふだん片付けるスキルを、手動で片付けます |
| `list-archived` | 保管したスキルを一覧します（`restore` で戻せます） |

入れたばかりのときは、最初の定期実行が `interval_hours` 1 回分（既定で 7 日）だけ先送りされます — `hermes update` のあと、最初のティックでいきなり整理が始まることはありません。その前に様子を見たいときは `hermes curator run --dry-run` を使ってください。

挙動と設定は [キュレーター](/hermes/docs/user-guide/features/curator/) を参照してください。

## `hermes moa` {#hermes-moa}

名前を付けた Mixture of Agents のプリセットを設定します。プリセットは、どのモデル選択画面でも `Mixture of Agents` というプロバイダの下に、選べるモデルとして現れます。`/moa <prompt>` は、既定のプリセットでプロンプトを 1 回流します。

```bash
hermes moa list
hermes moa configure [name]
hermes moa delete <name>
```

`hermes moa configure` は、参照する各モデルと集約役のモデルを選ぶのに、Hermes のプロバイダ → モデルの選択画面をそのまま使います。プリセットは実行のしかたの設定であって、主モデルやプロバイダそのものではありません。

## `hermes fallback` {#hermes-fallback}

```bash
hermes fallback <subcommand>
```

フォールバック先のプロバイダの並びを管理します。主モデルがレート制限・過負荷・接続のエラーで失敗したとき、並べた順に試されます。

| サブコマンド | 説明 |
|------------|-------------|
| `list`（別名: `ls`） | 今のフォールバックの並びを表示します（サブコマンドなしのときの既定） |
| `add` | プロバイダとモデルを選び（`hermes model` と同じ選択画面）、並びの末尾に足します |
| `remove`（別名: `rm`） | 並びから消す項目を選びます |
| `clear` | フォールバックの項目をすべて消します |

[フォールバックのプロバイダ](/hermes/docs/user-guide/features/fallback-providers/) を参照してください。

## `hermes hooks` {#hermes-hooks}

```bash
hermes hooks <subcommand>
```

`~/.hermes/config.yaml` に書かれたシェルスクリプトのフックを確認し、作り物のペイロードで試し、`~/.hermes/shell-hooks-allowlist.json` にある初回利用の同意リストを管理します。

| サブコマンド | 説明 |
|------------|-------------|
| `list`（別名: `ls`） | 設定されたフックを、対象の条件・制限時間・同意の状態とともに一覧します |
| `test <event>` | `<event>` に当てはまるフックを、作り物のペイロードですべて動かします |
| `revoke`（別名: `remove`、`rm`） | あるコマンドの許可リストの項目を消します（次の再起動から効きます） |
| `doctor` | 設定された各フックを検査します。実行権限、許可リスト、更新時刻のずれ、JSON の妥当性、作り物での実行時間を見ます |

イベントの形やペイロードの中身は [フック](/hermes/docs/user-guide/features/hooks/) を参照してください。

## `hermes memory` {#hermes-memory}

```bash
hermes memory <subcommand>
```

外部のメモリプロバイダのプラグインを設定・管理します。使えるプロバイダは honcho、openviking、mem0、hindsight、holographic、retaindb、byterover、supermemory です。外部プロバイダは同時に 1 つだけ有効にできます。組み込みのメモリ（MEMORY.md / USER.md）は常に働いています。

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `setup` | プロバイダを対話的に選んで設定します。 |
| `status` | 今のメモリプロバイダの設定を表示します。 |
| `off` | 外部プロバイダを切ります（組み込みのみになります）。 |

:::info プロバイダごとのサブコマンド
外部のメモリプロバイダが有効なとき、そのプロバイダが自前のトップレベルのコマンド `hermes <provider>` を登録することがあります（例: Honcho が有効なときの `hermes honcho`）。有効でないプロバイダのサブコマンドは現れません。今つながっているものを見るには `hermes --help` を実行してください。
:::

## `hermes acp` {#hermes-acp}

```bash
hermes acp
```

エディタ連携のために、Hermes を ACP（Agent Client Protocol）の標準入出力サーバーとして起動します。

関連する入口:

```bash
hermes-acp
python -m acp_adapter
```

先に対応部分を入れてください:

```bash
cd ~/.hermes/hermes-agent && uv pip install -e '.[acp]'
```

[ACP でのエディタ連携](/hermes/docs/user-guide/features/acp/) と [ACP の内部](/hermes/docs/developer-guide/acp-internals/) を参照してください。

## `hermes mcp` {#hermes-mcp}

```bash
hermes mcp <subcommand>
```

MCP（Model Context Protocol）サーバーの設定を管理し、Hermes 自身を MCP サーバーとして動かします。

| サブコマンド | 説明 |
|------------|-------------|
| *(なし)* または `picker` | 対話的な目録の選択画面です — Nous が認めた MCP を見て回り、導入・有効化・無効化します。 |
| `catalog` | Nous が認めた MCP を一覧します（プレーンテキストで、スクリプトから扱えます）。 |
| `install <name>` | 目録の項目を導入します（例: `hermes mcp install n8n`）。 |
| `serve [-v\|--verbose]` | Hermes を MCP サーバーとして動かします — 会話を他のエージェントへ開きます。 |
| `add <name> [--url URL] [--command CMD] [--auth oauth\|header] [--args ...]` | 独自の MCP サーバーを追加し、ツールを自動で見つけます。`--args` は残りの引数を標準入出力のコマンドへ渡すので、最後に置いてください。 |
| `remove <name>`（別名: `rm`） | MCP サーバーを設定から外します。 |
| `list`（別名: `ls`） | 設定済みの MCP サーバーを一覧します。 |
| `test <name>` | MCP サーバーへの接続を試します。 |
| `configure <name>`（別名: `config`） | サーバーごとに、使うツールを切り替えます。 |
| `login <name>` | OAuth を使う MCP サーバーの認証をやり直します。 |

[MCP 設定の早見表](/hermes/docs/reference/mcp-config-reference/)、[Hermes で MCP を使う](/hermes/docs/guides/use-mcp-with-hermes/)、[MCP サーバーモード](/hermes/docs/user-guide/features/mcp/#running-hermes-as-an-mcp-server) を参照してください。

## `hermes plugins` {#hermes-plugins}

```bash
hermes plugins [subcommand]
```

プラグインをまとめて管理します — 一般のプラグイン、メモリのプロバイダ、文脈エンジンを 1 か所で扱います。サブコマンドなしで `hermes plugins` を実行すると、2 つの区画からなる対話画面が開きます:

- **一般のプラグイン** — 導入済みのプラグインを、チェックボックスで複数選んで有効・無効にします
- **プロバイダのプラグイン** — メモリプロバイダと文脈エンジンを 1 つずつ選んで設定します。区分の上で ENTER を押すと、ラジオボタンの選択画面が開きます。

| サブコマンド | 説明 |
|------------|-------------|
| *(なし)* | 2 つの区画からなる対話 UI — 一般のプラグインの切り替えと、プロバイダのプラグインの設定。 |
| `install <identifier> [--force] [--ref COMMIT_SHA] [--allow-removed]` | Hermes のプラグイン目録（項目名だけ）、Git の URL、あるいは `owner/repo` の短い書き方から、プラグインを導入します。目録の名前は、その項目のリポジトリを固定された 40 桁の 16 進のコミット SHA で解決し、宣言された機能の要約を表示し、目録からの導入であることを `.hermes-catalog.json` の付随ファイルに記録します。生の URL は独自（未審査）の供給元として印が付き、`--ref`（40 文字のコミット SHA 全体）で固定できます。`--allow-removed`（危険）は、削除されたプラグインの禁止リストを迂回します。 |
| `search [term] [--json]` | Hermes のプラグイン目録を検索します（項目名、説明、宣言されたツールに一致します。`term` を省くとすべて一覧します）。目録はリポジトリ内（`plugin-catalog/`）で整えられ、6 時間のキャッシュで本物のリポジトリから更新され、オフラインではリポジトリ内の写しへ戻ります。目録に載っていること ≠ 監査済み — 受け入れの審査は項目を見るものであって、コードを見るものではありません。 |
| `update <name>` | 固定していない導入済みのプラグインについて、最新の変更を取り込みます。固定したプラグインを動かすには `--force --ref <new-commit>` で入れ直す必要があります。 |
| `remove <name>`（別名: `rm`、`uninstall`） | 導入済みのプラグインを削除します。 |
| `enable <name>` | 無効にしたプラグインを有効にします。 |
| `disable <name>` | プラグインを削除せずに無効にします。 |
| `list`（別名: `ls`） | 導入済みのプラグインを、有効・無効の別とともに一覧します。 |
| `doctor [path-or-id] [--ci]` | ネイティブのプラグインを、本物のマニフェスト解析・読み込み・登録の経路で検証します。`--ci` はエラーがあれば 1 で終了します。 |
| `pack install <path-or-url> [--force]` | プラグインパック（`hermes-pack.yaml`）を導入します — それぞれが 40 文字のコミット SHA で固定された、宣言的なプラグインの集まりです。必ず確認画面（すべてのプラグイン、供給元、固定された参照、宣言された機能）を表示し、パックの中身についてまとめて 1 回だけ確認を取ってから、通常の固定導入を順に実行します。各プラグインが宣言する機能は、これまでどおりプラグインごとの同意を通ります — パックがまとめて権限を与えることはありません。一部が失敗した場合はプラグインごとに報告し、1 つでも失敗すれば非ゼロで終了します。対話でのみ使えます（`--yes` はありません）。 |
| `pack export [--enabled-only] [--name NAME]` | 今の導入状態から、パックの YAML を標準出力へ書き出します。git から入れた各プラグインのリポジトリと正確な SHA、そして秘密を含まない `plugins.entries` の設定が入ります。git の来歴がないローカルだけのプラグインは、導入できる項目としてではなく、注意のコメントとして並びます。秘密、機能の許可、`allow_*` のゲートは常に取り除かれます。 |
| `pack show <path-or-url>` | 下見です。パックを解析・検証して表示し、何も導入しません。 |

プロバイダのプラグインの選択は `config.yaml` に保存されます:
- `memory.provider` — 有効なメモリプロバイダ（空なら組み込みのみ）
- `context.engine` — 有効な文脈エンジン（`"compressor"` が組み込みの既定）

一般のプラグインの無効リストは、`config.yaml` の `plugins.disabled` に保存されます。
git から入れた場合は、正式な供給元、入れた正確な版、固定の有無だけを、
プロファイル内の `plugins/.install-metadata.json` に記録します。プラグインの設定、
環境の値、秘密、機能の許可は含まれません。

[プラグイン](/hermes/docs/user-guide/features/plugins/) と [Hermes のプラグインを作る](/hermes/docs/developer-guide/plugins/) を参照してください。

## `hermes tools` {#hermes-tools}

```bash
hermes tools [--summary]
```

| オプション | 説明 |
|--------|-------------|
| `--summary` | 今どのツールが有効かの要約を表示して終了します。 |

`--summary` を付けなければ、プラットフォームごとにツールを設定する対話 UI が立ち上がります。

## `hermes computer-use` {#hermes-computer-use}

```bash
hermes computer-use <subcommand>
```

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `install` | 上流の cua-driver の導入スクリプトを実行します（macOS、Windows、Linux）。 |
| `install --upgrade` | cua-driver がすでに PATH にあっても、導入スクリプトを実行し直します。上流のスクリプトは常に最新版を取ってくるので、その場で更新されます。 |
| `status` | `cua-driver` が `$PATH` にあるか、どの版が入っているかを表示します。 |
| `doctor [--include CHECK] [--skip CHECK] [--json]` | cua-driver の健康診断を実行し、環境ごとの検査結果を表示します。 |
| `permissions status [--json]` | macOS のアクセシビリティと画面収録の許可状況を報告します。 |
| `permissions grant` | Cua Driver にアクセシビリティと画面収録の許可を与えるよう macOS に求めます。 |

`hermes computer-use install` は、`computer_use` のツールセットが使う
[cua-driver](https://github.com/trycua/cua) のバイナリを入れるための、安定した入口です。
Computer Use を初めて有効にしたときに `hermes tools` が呼ぶのと同じ上流の導入スクリプトを
実行するので、ツールセットの切り替えでうまく動かなかったとき（たとえば、すでに設定済みの
環境で使い始めたとき）に入れ直すのにも安心して使えます。

cua-driver がすでにある場合、Hermes はその版と実行時の目録を確認します。0.20.0 以降の
互換性のある導入はそのまま残します。古かったり不完全だったりする標準の導入は、今の上流の
スクリプトで修復します。`HERMES_CUA_DRIVER_CMD` で選んだ独自のバイナリを Hermes が
置き換えることはありません。そのバイナリを自分で更新するか、上書きの設定を外してください。
修復が必要なときは `hermes computer-use status` が知らせます。

組み込みの `computer_use` のツールセットが、Hermes で勧められる連携方法です。
Cua の生の MCP ツールを登録するのは、Cua の低水準のツール語彙が必要なときの
代替手段です。`cua-driver skills install` は Hermes を見つけると、Cua のスキル一式を
Hermes のスキルのディレクトリへ自動でつなぎます。

許可の扱いと機能の目録の承認は、実行時の起動に属します。
範囲を絞ったモードでは、Hermes が Cua の正式なフラグである
`--capability-manifest` と `--approve-capability-manifest` を渡します。MCP の
転送はそれぞれ、自分の実行環境の中に専用の一生を持ちます。公開されるセッション名は
カーソルとセッションの状態に付けられた名札であって、実行環境を所有したり共有したり
するものではありません。

cua-driver が PATH にあれば、`hermes update` の最後に上流の導入スクリプトが
自動でもう一度走るので、たいていの人は `--upgrade` を自分で呼ぶ必要はありません。
次の Hermes の更新を待たず、上流の修正をすぐ取り込みたいときに使ってください。

## `hermes pets` {#hermes-pets}

```bash
hermes pets <list|install|select|show|off|scale|remove|doctor>
```

[Petdex](https://github.com/crafter-station/petdex) は、コーディングエージェント向けのアニメーションするドット絵のペットを集めた公開の展示場です。1 匹入れると、CLI・TUI・デスクトップアプリで、エージェントの動きに反応するペットが表示されます。

| サブコマンド | 説明 |
|------------|-------------|
| `list` | petdex の展示場を見て回ります。 |
| `install` | 展示場からペットを入れます。 |
| `select` | 表示するペットを決めます（`display.pet.*` に書きます）。 |
| `show` | 今のペットをターミナルで動かします。 |
| `off` | ペットの表示を止めます。 |
| `scale` | どこでもペットの大きさを変えます（`display.pet.scale`）。 |
| `remove` | 入れたペットを削除します。 |
| `doctor` | ペットの設定と、ターミナルの画像表示の対応状況を調べます。 |

`/hatch` のスラッシュコマンドを使えば、文章で説明して新しいペットを作ることもできます。[ペット](/hermes/docs/user-guide/features/pets/) を参照してください。

## `hermes sessions` {#hermes-sessions}

```bash
hermes sessions <subcommand>
```

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `list` | 最近のセッションを一覧します。 |
| `browse` | 検索と再開ができる対話的なセッション選択画面です。各行には、最後のメッセージから決まる状態の札（`done` / `intr` / `err` / `empty`）とメッセージ数が出ます。選んだ行で `d` を押すと（検索の絞り込みが空のとき）、y/N の確認のうえでそのセッションを削除します。絞り込みが効いているときの `d` は検索文字列として入力されます。 |
| `export <output> [--session-id ID]` | セッションを JSONL へ書き出します。 |
| `delete <session-id>` | セッションを 1 つ削除します。 |
| `prune` | 条件に合うセッションを削除します。期間は `--older-than`/`--newer-than`/`--before`/`--after`（`5h`/`2d` のような長さ、日数だけの数字、ISO の時刻）、属性は `--source`、`--title`、`--model`、`--provider`、`--branch`、`--end-reason`、`--user`、`--chat-id`、`--chat-type`、`--cwd`、数値の範囲は `--min/--max-messages`、`--min/--max-tokens`、`--min/--max-cost`、`--min/--max-tool-calls`。さらに `--include-archived`、`--dry-run`、`--yes` が使えます。既定は 90 日より古いものです。 |
| `archive` | `prune` と同じ条件に合うセッションをまとめて保管します（削除せず、隠すだけ）。条件を 1 つ以上指定する必要があります。 |
| `stats` | セッションの保存状況の統計を表示します。 |
| `rename <session-id> <title>` | セッションのタイトルを付ける・変えます。 |
| `optimize` | ディスクの空きを取り戻します。FTS5 の索引の断片をまとめ、VACUUM を実行します。セッションのデータは変わりません。 |
| `optimize-storage` | 全文検索の索引を、内容を外に置くコンパクトな v23 の形式へ移します。大きなデータベースでは `state.db` がかなり小さくなります。 |
| `repair` | 壊れた `state.db` のスキーマ（例: `table messages_fts already exists`）を直し、見えなくなっていたセッションを戻します。先に控えを取ります。 |
| `repair-routing` | 経路の情報を失ったセッションの行に取り残された、ゲートウェイの会話をつなぎ直します（再起動のあとチャットが「時間を遡る」現象）。既定は下見で、`--apply` で実際に引き取ります（先にゲートウェイを止めてください）。`--max-gap-seconds N` で連続とみなす幅を調整します。曖昧さのない場合だけ直します。[セッション → 取り残されたゲートウェイのセッションを直す](/hermes/docs/user-guide/sessions/#repair-stranded-gateway-sessions) を参照してください。 |
| `recover` | 壊れた `state.db` を、別のきれいなデータベースへオフラインで救い出します（元には手を触れません）。 |
| `retitle-skills` | `/skill` で始めたセッションのタイトルを、利用者が実際に入力した内容から付け直します。`--apply` を付けない限り、変更の内容を並べるだけです。 |

## `hermes insights` {#hermes-insights}

```bash
hermes insights [--days N] [--source platform]
```

| オプション | 説明 |
|--------|-------------|
| `--days <n>` | 直近 `n` 日を分析します（既定: 30）。 |
| `--source <platform>` | `cli`、`telegram`、`discord` などの種別で絞ります。 |

## `hermes claw` {#hermes-claw}

```bash
hermes claw migrate [options]
```

OpenClaw の環境を Hermes へ移します。`~/.openclaw`（または指定したパス）から読み、`~/.hermes` へ書きます。古いディレクトリ名（`~/.clawdbot`、`~/.moltbot`）や設定ファイル名（`clawdbot.json`、`moltbot.json`）も自動で見つけます。

| オプション | 説明 |
|--------|-------------|
| `--dry-run` | 何も書かずに、何が移るかを見せます。 |
| `--preset <name>` | 移行のひな形です: `full`（互換性のある設定すべて）または `user-data`（基盤まわりの設定を除く）。どちらのひな形でも秘密は移しません — `--migrate-secrets` を明示してください。 |
| `--overwrite` | ぶつかったときに既存の Hermes のファイルを上書きします（既定では、ぶつかりがあると適用を拒否します）。 |
| `--migrate-secrets` | API キーも移します。`--preset full` でもこの指定が要ります。 |
| `--no-backup` | 移行前に `~/.hermes/` の zip を取りません（既定では、適用の前に `~/.hermes/backups/pre-migration-*.zip` へ復元用の書庫を 1 つ書きます。`hermes import` で戻せます）。 |
| `--source <path>` | OpenClaw のディレクトリを指定します（既定: `~/.openclaw`）。 |
| `--workspace-target <path>` | ワークスペース向けの指示（AGENTS.md）の置き場所。 |
| `--skill-conflict <mode>` | スキル名がぶつかったときの扱い: `skip`（既定）、`overwrite`、`rename`。 |
| `--yes` | 確認のプロンプトを出しません。 |

### 何が移るのか {#what-gets-migrated}

移行の対象は、人格、メモリ、スキル、モデルのプロバイダ、メッセージングプラットフォーム、エージェントの振る舞い、セッションの方針、MCP サーバー、TTS など 30 以上の区分にわたります。項目は Hermes の相当するものへ**そのまま取り込まれる**か、手で見直すために**保管される**かのどちらかです。

**そのまま取り込まれるもの:** SOUL.md、MEMORY.md、USER.md、AGENTS.md、スキル（4 つの供給元ディレクトリ）、既定のモデル、独自のプロバイダ、MCP サーバー、メッセージングプラットフォームのトークンと許可リスト（Telegram、Discord、Slack、WhatsApp、Signal、Matrix、Mattermost）、エージェントの既定値（推論の深さ、圧縮、人らしい間、タイムゾーン、サンドボックス）、承認の規則、TTS の設定、ブラウザの設定、ツールの設定、実行の制限時間、コマンドの許可リスト、ゲートウェイの設定、そして 3 か所からの API キー。

**手で見直すために保管されるもの:** cron の仕事、プラグイン、フックや webhook、メモリのバックエンド（QMD）、スキルの配布元の設定、UI や識別情報、ログ、複数エージェントの構成、チャンネルの結び付け、IDENTITY.md、TOOLS.md、HEARTBEAT.md、BOOTSTRAP.md。

**API キーの解決**は、3 か所を優先順に確かめます: 設定の値 → `~/.openclaw/.env` → `auth-profiles.json`。トークンの項目はどれも、素の文字列、環境変数のひな形（`${VAR}`）、SecretRef のオブジェクトに対応します。

設定キーの対応表、SecretRef の扱いの詳細、移行後の確認事項は **[移行の案内](/hermes/docs/guides/migrate-from-openclaw/)** を参照してください。

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

**Claude Code**（`~/.claude`）または **OpenAI Codex CLI**（`~/.codex`）の環境を Hermes へ取り込みます。`CLAUDE.md`/`AGENTS.md` の指示はメモリの項目へ、`Bash(...)` の許可・拒否の規則は `command_allowlist`/`approvals.deny` へ、MCP サーバーは `config.yaml` の `mcp_servers` へ、スキルのディレクトリは `~/.hermes/skills/` へ対応させます。適用の前に必ず内容を見せます。API キーや認証情報は取り込みません。

| オプション | 説明 |
| --- | --- |
| `agent` | `claude-code` か `codex`（既定: 自動判別）。 |
| `--source <path>` | 取り込み元のディレクトリを指定します（既定: `~/.claude` または `~/.codex`）。 |
| `--dry-run` | 下見だけで、何も書きません。 |
| `--overwrite` | ぶつかった MCP サーバーやスキルを置き換えます（既定: 飛ばす）。 |
| `--yes`, `-y` | 確認のプロンプトを出しません。 |
| `--sync` | 前に取り込んだ供給元のうち、そのあとファイルが変わったものをすべて取り込み直します。確認は出ません。`--dry-run` と合わせれば下見できます。 |

取り込みに成功すると、その供給元は `~/.hermes/import-sync.json` に登録されます。以後 `hermes import-agent --sync` を実行すると、登録済みの供給元のうちファイルが変わったものを取り込み直します（取り込んだ Claude Code / Codex の環境を最新に保つのに、cron と相性のよいやり方です）。対応表の全体は **[取り込みの案内](/hermes/docs/user-guide/import-from-other-agents/)** を参照してください。

## `hermes serve` {#hermes-serve}

```bash
hermes serve [options]
```

Hermes の**バックエンドサーバー**を起動します — [デスクトップアプリ](/hermes/docs/user-guide/desktop/) やリモートのクライアントがつなぐ、JSON-RPC / WebSocket のゲートウェイです。`hermes dashboard` が動かすのと同じサーバーですが、**画面はありません**。ブラウザの UI を開くことは決してありません。デスクトップアプリは自分で `hermes serve` のバックエンドを起動します。このコマンドを直接使うのは、リモートのホストで画面なしのバックエンドを動かしたいときです。下の `hermes dashboard` と同じ `--host` / `--port` / `--insecure` / `--skip-build` / `--stop` / `--status` を受け取ります（ループバック以外に開くと、同じ認証の関門が働きます）。`[web]` の追加パッケージが必要で、組み込みの Chat のソケットは POSIX のホストでさらに `[pty]` を要します。

**ポートのぶつかり:** 指定したポート（既定 `9119`）を別のプロセス（2 つめの `hermes serve` やゲートウェイなど）がすでに掴んでいる場合、機械で読める合図の行 `BACKEND_PORT_IN_USE port=<port>` を標準出力に出し、掴んでいそうな相手を人向けに示したうえで、一般的なエラーではなく終了コード **75**（`EX_TEMPFAIL`）で終わります — スクリプトやデスクトップアプリが「ポートが埋まっている」と「バックエンドが壊れている」を区別できるようにするためです。`--port 0` を渡すと空いている一時ポートを使います（起動に成功すると `HERMES_BACKEND_READY port=<port>` で選んだポートを知らせます）。

## `hermes dashboard` {#hermes-dashboard}

```bash
hermes dashboard [options]
```

Web ダッシュボードを起動します — 設定や API キーの管理、セッションの監視をブラウザから行う UI です。（ブラウザの UI を持たない画面なしのバックエンド — たとえばデスクトップアプリが立ち上げるもの — が欲しいときは、上の [`hermes serve`](#hermes-serve) を使ってください。）`cd ~/.hermes/hermes-agent && uv pip install -e ".[web]"`（FastAPI と Uvicorn）が必要です。ブラウザに組み込まれた Chat のタブはいつでも使えますが、加えて `pty` の追加パッケージ（`cd ~/.hermes/hermes-agent && uv pip install -e ".[web,pty]"`）と、Linux・macOS・WSL2 のような POSIX の PTY 環境が要ります。詳しくは [Web ダッシュボード](/hermes/docs/user-guide/features/web-dashboard/) を参照してください。

| オプション | 既定 | 説明 |
|--------|---------|-------------|
| `--port` | `9119` | Web サーバーを動かすポート |
| `--host` | `127.0.0.1` | 待ち受けるアドレス |
| `--no-open` | — | ブラウザを自動で開きません |
| `--insecure` | 無効 | **非推奨で、何もしません。** 以前は、ループバック以外に開いたときの認証を迂回するものでした。2026 年 6 月の強化以降、公開して待ち受ける場合は*必ず*認証の仕組み（パスワードか OAuth）が要ります。手元だけで使うなら `127.0.0.1` で待ち受けてトンネルしてください。 |
| `--skip-build` | 無効 | Web UI のビルドを飛ばし、すでにある `dist` をそのまま配ります。npm が使えない、対話しない場面（Windows のタスクスケジューラ、CI）で便利です。先に `cd web && npm run build` でビルドしておいてください。 |
| `--isolated` | 無効 | 名前付きのプロファイル（`worker dashboard`）から起動したとき、端末共通のダッシュボードへ回すのではなく、そのプロファイル専用のサーバーを動かします。 |
| `--stop` | — | **この Hermes のホームの**、動いている `hermes dashboard` / `hermes serve` のバックエンドを止めて終了します（`-p <profile>` や `HERMES_HOME` でどれかが決まります。他のプロファイルのバックエンド、その端末にある別のインストール、コマンドを打ち込んだシェル自体には決して触れません。持ち主を読み取れないバックエンドもそのままにします）。SIGTERM を送り、10 秒待ってから SIGKILL を送ります。バックエンドより長く残ってしまった同居のチャット TUI も止めます（そのままだと削除済みの `state.db-wal` を開いたままにして、次回の起動を妨げるためです）。ダッシュボードから起動したメッセージ連携のボットには手を触れません。 |
| `--status` | — | 動いている `hermes dashboard` のプロセスを一覧して終了します。 |

### `hermes dashboard register` {#hermes-dashboard-register}

この導入を、自分で持つダッシュボードとして Nous Portal のアカウントに登録します。OAuth のクライアントを作り、`HERMES_DASHBOARD_OAUTH_CLIENT_ID` を `~/.hermes/.env` に書き、ログインの関門を働かせる方法を表示します。事前にログインしている必要があります（`hermes setup`）。

| オプション | 説明 |
|--------|-------------|
| `--name` | ダッシュボードにつける、人が読むための名札（既定: 自動生成）。 |
| `--redirect-uri` | 公開の HTTPS の OAuth のリダイレクト先（例: `https://hermes.example.com/auth/callback`）。localhost だけで使うなら省いてください。 |
| `--portal-url` | 登録に使う Nous Portal のベース URL を差し替えます（既定: ログインした Portal）。`HERMES_DASHBOARD_PORTAL_URL` でも設定できます。 |

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

プロファイルを管理します — 互いに独立した複数の Hermes で、それぞれが自分の設定、セッション、スキル、ホームディレクトリを持ちます。

| サブコマンド | 説明 |
|------------|-------------|
| `list` | すべてのプロファイルを一覧します。 |
| `use <name>` | 既定のプロファイルを固定します。 |
| `create <name> [--clone] [--clone-all] [--clone-from <source>] [--no-alias]` | 新しいプロファイルを作ります。`--clone` は今のプロファイルから設定、`.env`、`SOUL.md`、スキル、整えた `MEMORY.md`/`USER.md` を写します。`--clone-all` は状態をすべて写します。`--clone-from` は写し元のプロファイルを指定し、`--clone-all` と併用しない限り設定の複製を含みます。 |
| `delete <name> [-y]` | プロファイルを削除します。 |
| `show <name>` | プロファイルの詳細（ホームディレクトリ、設定など）を表示します。 |
| `alias <name> [--remove] [--name NAME]` | プロファイルへ手早く入るためのラッパースクリプトを管理します。 |
| `rename <old> <new>` | プロファイルの名前を変えます。 |
| `export <name> [-o FILE]` | プロファイルを `.tar.gz` の書庫へ書き出します（手元での控え）。 |
| `import <archive> [--name NAME]` | `.tar.gz` の書庫からプロファイルを取り込みます（手元での復元）。 |
| `install <source> [--name N] [--alias] [--force] [-y]` | git の URL かローカルのディレクトリから、配布されたプロファイルを導入します。 |
| `update <name> [--force-config] [-y]` | 配布物を取り直します。利用者のデータ（メモリ、セッション、認証）は残ります。 |
| `info <name>` | プロファイルの配布情報（版、要件、供給元）を表示します。 |

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

シェルの補完スクリプトを標準出力に書き出します。シェルの設定ファイルでその出力を読み込めば、Hermes のコマンド、サブコマンド、プロファイル名をタブで補完できます。

例:

```bash
# Bash
hermes completion bash >> ~/.bashrc

# Zsh
hermes completion zsh >> ~/.zshrc

# Fish
hermes completion fish > ~/.config/fish/completions/hermes.fish
```

## `hermes update` {#hermes-update}

```bash
hermes update [--gateway] [--check] [--plan] [--no-backup] [--backup] [--yes]
```

`hermes-agent` の最新のコードを取得し、管理下の venv に依存関係を入れ直してから、導入後の処理（MCP サーバー、スキルの同期、補完の導入）をやり直します。動いている環境でも安全に実行できます。自分の作業ツリーが `origin/main` より遅れているかどうかだけ知りたいときは `--check` を使ってください。

`hermes update` は、設定された更新用のブランチ（既定: `main`）を取得します。別のブランチにいる場合、Hermes が取得の前に更新用のブランチへ切り替えることがあります。ブランチでの作業を更新の自動退避の流れの外に置きたいときは、更新の前にコミットしておいてください。

| オプション | 説明 |
|--------|-------------|
| `--gateway` | メッセージングの `/update` コマンドが使う内部用のモードです。ターミナルの標準入力から読む代わりに、ファイルを介して問い合わせと進行状況をやり取りします。ゲートウェイを再起動するためのフラグではありません。 |
| `--check` | 取得も依存関係の導入も再起動もせずに、更新があるかだけを確認します。 |
| `--plan` | 更新の計画を表示して、何も変えずに終了します。導入の形態（git / Docker / Nix / apt）、すべてのプロファイルで動いている Hermes のサービスとその管理方法・動いているコードの版、そしてそれぞれをどう再起動するかを示します。イメージやパッケージで管理された環境では、正しい外部の更新コマンドを代わりに知らせます。読み取りだけです。 |
| `--no-backup` | この実行では、更新前の控えを一切取りません（手早い状態のスナップショットも、全体の zip も）。`updates.pre_update_backup` の設定にかかわらず効きます。 |
| `--backup` | この実行で、更新前に**全体の**控えを取ります。手早い状態のスナップショットに加えて、`HERMES_HOME` 全体（設定、認証、セッション、スキル、ペアリングのデータ）の zip を作ります。既定は `quick` — 軽い状態のスナップショットだけです。ふだんの動きは `config.yaml` の `updates.pre_update_backup: quick | full | off` で決めます。 |
| `--yes`, `-y` | 設定の移行や退避したものの復元といった問い合わせに、すべて「はい」で答えます。API キーの入力は飛ばされるので、それらは別途 `hermes config migrate` を実行してください。 |

そのほかの挙動:

- **ゲートウェイの再起動。** 更新に成功すると、新しいコードを読み込ませるために、動いているすべてのゲートウェイのプロファイルを自動で再起動しようとします。更新せずにゲートウェイだけ再起動したいときは `hermes gateway restart` を使ってください。
- **再起動の途中で失敗したとき。** 取得したばかりのツリーを読み込む途中で再起動の段階が止まった場合、管理下のゲートウェイのプロファイルは、きれいな Python のプロセスで試し直します。systemd が独立に確認できた再起動（`systemctl --user is-active`）だけを確認済みとして報告します。単に 0 で終了しただけの起動は `relaunch_attempted` として記録され、更新は安全側に倒して失敗扱いになります。手で動かしているゲートウェイや serve / dashboard の実行は、立ち上げ直す権限がない限り決して止めません。理由を添えて飛ばしたものとして記録し、正確な再起動のコマンドとともに未完了の報告に残します。
- **更新の控えと、全体の版の確認。** 実行のたびに、機械で読める控えが `~/.hermes/logs/update_receipts/` に書かれます（更新前の全体の計画、手順、飛ばしたものとその理由、再起動の結果。`latest.json` がいちばん新しいものを指します）。再起動の段階のあと、更新処理は生きている各ゲートウェイが動かしているコードを更新後のツリーと突き合わせ、プロファイルごとの版の一覧を表示します。更新前のコードのままのゲートウェイが 1 つでもあれば、正確な再起動のコマンドを添えて更新は失敗します（終了コード 1）。
- **手元のソースの変更。** git で導入している場合、ブランチの切り替えや取得の前に、変更された追跡中のファイルと追跡外のファイルを自動で退避します（`git stash push --include-untracked`）。対話的なターミナルでの更新は、退避したものを戻す前に尋ねます。対話しない更新は既定で戻します。手元のソースの編集を取得の成功後に捨ててよい管理された環境でだけ、`updates.non_interactive_local_changes: discard` を設定してください。復元がぶつかったり取得に失敗したりした場合、退避はそのまま残るので手で回収できます。
- **npm のロックファイルの揺れ。** 退避やブランチの切り替えの前に、Hermes は npm の導入・ビルドで生じた追跡中の `package-lock.json` の差分を、できる範囲で片付けます。意図してロックファイルを変えた場合は、`hermes update` の前にコミットするか手で退避してください。
- **ペアリングのデータのスナップショット。** `--backup` を付けていなくても、`hermes update` は `git pull` の前に `~/.hermes/pairing/` と Feishu のコメント規則の軽いスナップショットを取ります。取得で編集中のファイルが書き換わってしまったときは、`hermes backup restore --state pre-update` で戻せます。
- **古い `hermes.service` への警告。** 名前変更より前の `hermes.service` という systemd のユニット（今の `hermes-gateway.service` ではないもの）を見つけると、行ったり来たりの不具合を避けられるよう、移行の案内を一度だけ表示します。
- **終了コード。** 成功が `0`、取得・導入・導入後の処理のエラーが `1`、`git pull` を妨げる想定外の作業ツリーの変更が `2` です。

## 保守のコマンド {#maintenance-commands}

| コマンド | 説明 |
|---------|-------------|
| `hermes --version` | バージョン情報を表示します。 |
| `hermes update` | 最新の変更を取得し、依存関係を入れ直します。 |

| `hermes uninstall [--full] [--gui] [--dry-run] [--yes]` | Hermes を削除します。設定やデータもまとめて消せます。`--gui` はデスクトップの Chat の GUI だけを消し、エージェントは残します。`--full` は設定やデータも消します。`--dry-run` は何も変えずに、消されるものを表示します。`--yes` は確認を出しません。 |

## 関連 {#see-also}

- [スラッシュコマンド早見表](/hermes/docs/reference/slash-commands/)
- [CLI の使い方](/hermes/docs/user-guide/cli/)
- [セッション](/hermes/docs/user-guide/sessions/)
- [スキルの仕組み](/hermes/docs/user-guide/features/skills/)
- [スキンとテーマ](/hermes/docs/user-guide/features/skins/)
