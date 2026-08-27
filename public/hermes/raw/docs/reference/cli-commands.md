---
title: "CLI コマンド一覧"
description: "Hermes のターミナルコマンドとコマンド群についての公式な一覧"
upstream_path: reference/cli-commands.md
upstream_blob: 6771a80d20761b502eb14f492013d778532b0b87
sources:
  - https://hermes-agent.nousresearch.com/docs/reference/cli-commands
---

# CLI コマンド一覧 {#cli-commands-reference}

このページでは、シェルから実行する**ターミナルコマンド**を扱います。

チャットの中で使うスラッシュコマンドについては、[スラッシュコマンド一覧](/hermes/docs/reference/slash-commands/)をご覧ください。

## グローバルな入口 {#global-entrypoint}

```bash
hermes [global-options] <command> [subcommand/options]
```

### グローバルオプション {#global-options}

| オプション | 説明 |
|--------|-------------|
| `--version`, `-V` | バージョンを表示して終了します。 |
| `--profile <name>`, `-p <name>` | この実行で使う Hermes のプロファイルを選びます。`hermes profile use` で設定した既定値より優先されます。 |
| `--resume <session>`, `-r <session>` | ID かタイトルを指定して、以前のセッションを再開します。`latest` と書くと直近のセッションを再開します（作業スペース単位で、`-c` と同じ探し方をします）。 |
| `--continue [name]`, `-c [name]` | 直近のセッション、またはタイトルが一致する直近のセッションを再開します。 |
| `--in <dir>` | 開始または再開の前に `<dir>` へ移動します。`--resume latest` や `-c` の検索範囲をそのディレクトリの作業スペースに絞り、セッションもそこに留めます（記録された作業ディレクトリへ戻す動作を行いません）。 |
| `--worktree`, `-w` | 複数のエージェントを並行して動かすために、独立した git worktree で開始します。 |
| `--yolo` | 危険なコマンドの承認プロンプトを省略します。 |
| `--pass-session-id` | セッション ID をエージェントのシステムプロンプトに含めます。 |
| `--ignore-user-config` | `~/.hermes/config.yaml` を無視して、組み込みの既定値を使います。`.env` の資格情報は読み込まれたままです。 |
| `--ignore-rules` | `AGENTS.md`、`SOUL.md`、`.cursorrules`、メモリ、事前読み込みするスキルの自動注入を省略します。 |
| `--tui` | 従来の CLI ではなく [TUI](/hermes/docs/user-guide/tui/) を起動します。`HERMES_TUI=1` と同じ意味です。`display.interface` より常に優先されます。 |
| `--cli` | 従来の prompt_toolkit の REPL を強制します。`display.interface: tui` をこの実行だけ打ち消したいときに使います。 |
| `--dev` | `--tui` と併用したとき、ビルド済みのバンドルではなく TypeScript のソースを `tsx` で直接実行します（TUI の開発に参加する方向けです）。 |

## トップレベルのコマンド {#top-level-commands}

| コマンド | 用途 |
|---------|---------|
| `hermes chat` | エージェントと対話形式、または一回きりの形式で会話します。 |
| `hermes model` | 既定のプロバイダとモデルを対話的に選びます。 |
| `hermes moa` | モデル選択画面から選べる、名前付きの Mixture of Agents プリセットを設定します。 |
| `hermes fallback` | 主モデルがエラーになったときに試すフォールバックのプロバイダを管理します。 |
| `hermes gateway` | メッセージングのゲートウェイサービスを実行・管理します。 |
| `hermes proxy` | OAuth のプロバイダ資格情報を付与する、ローカルの OpenAI 互換プロキシです。[サブスクリプションプロキシ](/hermes/docs/user-guide/features/subscription-proxy/)をご覧ください。 |
| `hermes egress` | リモートのターミナルサンドボックス向けに、外向き通信へ資格情報を差し込むファイアウォールです（iron-proxy）。既定では無効です。[Egress プロキシ](/hermes/docs/user-guide/egress/iron-proxy/)をご覧ください。 |
| `hermes lsp` | Language Server Protocol の連携を管理します（write_file / patch に対する意味解析の診断）。 |
| `hermes setup` | 設定の全体または一部を対話的に整えるウィザードです。 |
| `hermes whatsapp` | WhatsApp ブリッジの設定とペアリングを行います。 |
| `hermes whatsapp-cloud` | Meta 公式の WhatsApp Business Cloud API アダプタを設定します（ビジネスアカウントと公開された Webhook が必要です）。`hermes whatsapp`（Baileys による個人アカウントのブリッジ）とは別物です。 |
| `hermes slack` | Slack 向けの補助機能です（現在は、全コマンドをネイティブのスラッシュコマンドとして含むアプリマニフェストの生成）。 |
| `hermes auth` | 資格情報を管理します — 追加、一覧、削除、リセット、状態表示、ログアウト。Codex / Nous / Anthropic の OAuth の流れも扱います。 |
| `hermes login` / `logout` | **非推奨** — 代わりに `hermes auth` を使ってください。 |
| `hermes send` | 設定済みのメッセージングプラットフォーム（Telegram、Discord、Slack、Signal、SMS など）へ、一回きりのメッセージを送ります。シェルスクリプト、cron ジョブ、CI のフック、監視デーモンから使うと便利です。エージェントのループも LLM も動きません。 |
| `hermes peer` | 他の端末で動く Hermes ゲートウェイをピアとして登録し、そのエージェントの正規の Bot Chat に DM を送ります（`hermes peer dm <peer>[/<agent>] "…"`）。端末をまたいだボット同士のやり取りを支える通信路です。 |
| `hermes secrets` | 外部のシークレット供給元（現在は Bitwarden Secrets Manager）を管理し、`~/.hermes/.env` からではなくプロセス起動時に API キーを取得できるようにします。 |
| `hermes migrate` | `config.yaml` を診断し、必要に応じて書き換えて、廃止されたモデルや非推奨の設定への参照を置き換えます（例: `migrate xai`）。 |
| `hermes status` | エージェント、認証、プラットフォームの状態を表示します。 |
| `hermes cron` | cron スケジューラの中身を確認し、実行を進めます。 |
| `hermes kanban` | 複数プロファイルで共同作業するためのボードです（タスク、リンク、ディスパッチャ）。 |
| `hermes project` | 複数フォルダにまたがる、名前付きの作業スペース（プロジェクト）を管理します。デスクトップのセッションのまとまりの基準になり、かんばんボードと結び付けるとタスクに worktree とブランチの決まった命名規則を与えます。状態はプロファイルごとに保持されます。 |
| `hermes webhook` | イベント起動のための動的な Webhook 購読を管理します。 |
| `hermes hooks` | `config.yaml` に宣言されたシェルスクリプトのフックを確認・承認・削除します。 |
| `hermes doctor` | 設定や依存関係の問題を診断します。 |
| `hermes security audit` | venv、プラグインの依存要件、バージョン固定した MCP サーバーについて、供給網の監査（OSV.dev）をその場で実行します。 |
| `hermes approvals` | 承認プロンプト用の道具です — 承認の履歴から許可リストの案を掘り出します。 |
| `hermes dump` | サポートやデバッグのために、そのままコピーして貼れる設定の要約を出します。 |
| `hermes prompt-size` | システムプロンプトとツールスキーマ（スキルの索引、メモリ、プロファイル）のバイト数の内訳を表示します。オフラインで動きます。 |
| `hermes debug` | デバッグ用の道具です — サポート向けにログとシステム情報をアップロードします。 |
| `hermes backup` | Hermes のホームディレクトリを zip ファイルにバックアップします。 |
| `hermes checkpoints` | `~/.hermes/checkpoints/`（`/rollback` が使う影の保管場所）を確認・整理・消去します。引数なしで実行すると状態の概要が出ます。 |
| `hermes import` | zip ファイルから Hermes のバックアップを復元します。 |
| `hermes logs` | エージェントやゲートウェイ、エラーのログファイルを表示・追尾・絞り込みします。 |
| `hermes config` | 設定ファイルを表示・編集・移行し、値を問い合わせます。 |
| `hermes skin` | 表示用のスキンを一覧・切り替え・微調整します。 |
| `hermes console` | 安全な Hermes コマンドコンソールを開きます。 |
| `hermes pairing` | メッセージングのペアリングコードを承認または取り消します。 |
| `hermes skills` | スキルを閲覧・インストール・公開・監査・設定します。 |
| `hermes bundles` | 複数のスキルをひとつの `/<name>` スラッシュコマンドにまとめます。[スキルバンドル](/hermes/docs/user-guide/features/skills/#skill-bundles)をご覧ください。 |
| `hermes curator` | 裏側でスキルを手入れします — 状態表示、実行、一時停止、固定。[Curator](/hermes/docs/user-guide/features/curator/)をご覧ください。 |
| `hermes journey`（別名 `learning`、`memory-graph`） | 覚えたスキルとメモリの移り変わりを時系列で表示します。 |
| `hermes memory` | 外部のメモリプロバイダを設定します。プロバイダが有効なときは、そのプラグイン固有のサブコマンド（例: `hermes honcho`）が自動で登録されます。 |
| `hermes acp` | エディタ連携のために Hermes を ACP サーバーとして実行します。 |
| `hermes mcp` | MCP サーバーの設定を管理し、Hermes を MCP サーバーとして実行します。 |
| `hermes plugins` | Hermes Agent のプラグインを管理します（インストール、有効化、無効化、削除）。 |
| `hermes portal` | Nous Portal の状態、サブスクリプションのリンク、Tool Gateway のルーティングを扱います。[Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/)をご覧ください。 |
| `hermes tools` | プラットフォームごとに有効なツールを設定します。 |
| `hermes computer-use` | Computer Use（cua-driver）のバックエンドをインストール、または状態を確認します（macOS / Windows / Linux）。 |
| `hermes pets` | CLI、TUI、デスクトップアプリに表示される [petdex](/hermes/docs/user-guide/features/pets/) のアニメーションするペットを閲覧・インストール・選択します。サブコマンド: `list`、`install`、`select`、`show`、`off`、`scale`、`remove`、`doctor`。 |
| `hermes sessions` | セッションを閲覧・書き出し・整理・改名・削除します。 |
| `hermes insights` | トークン、費用、活動の分析を表示します。 |
| `hermes claw` | OpenClaw からの移行を助けます。 |
| `hermes import-agent` | Claude Code（`~/.claude`）または Codex CLI（`~/.codex`）の設定を取り込みます。 |
| `hermes dashboard` | 設定・API キー・セッションを管理する Web ダッシュボードを起動します。 |
| `hermes serve` | Hermes のバックエンドサーバーを起動します（画面なしで動き、デスクトップアプリとリモートのバックエンドを支えます）。 |
| `hermes desktop`（別名 `gui`） | ネイティブの Electron デスクトップアプリをビルドして起動します。 |
| `hermes profile` | プロファイル（独立した複数の Hermes 環境）を管理します。 |
| `hermes completion` | シェルの補完スクリプトを出力します（bash / zsh / fish）。 |
| `hermes --version` | バージョン情報を表示します。 |
| `hermes update` | 最新のコードを取得して依存関係を入れ直します。`--check` はインストールせずに内容を確認し、`--backup` は取得前に `HERMES_HOME` のスナップショットを取ります。 |
| `hermes uninstall` | Hermes をシステムから削除します。 |

## `hermes chat` {#hermes-chat}

```bash
hermes chat [options]
```

よく使うオプション:

| オプション | 説明 |
|--------|-------------|
| `-q`, `--query "..."` | 対話せずに一回だけ実行するプロンプトです。 |
| `--query-file PATH` | 一回きりのプロンプトをファイルから読みます（`-` は標準入力）。シェルによる解釈が一切入らないので、引用符や `$(...)`、バッククォートがそのまま届きます。プログラムから渡す本文や、信用できない本文にはこちらを使ってください（Bot モードのチームメイト DM もこれを使います）。`-q` とは併用できません。 |
| `-m`, `--model <model>` | この実行で使うモデルを上書きします。 |
| `-t`, `--toolsets <csv>` | ツールセットをカンマ区切りで有効にします。 |
| `--provider <provider>` | プロバイダを固定します: `auto`, `openrouter`, `nous`, `openai-codex`, `copilot-acp`, `copilot`, `anthropic`, `gemini`, `huggingface`, `novita`（別名 `novita-ai`、`novitaai`）, `openai-api`, `zai`, `kimi-coding`, `kimi-coding-cn`, `minimax`, `minimax-cn`, `minimax-oauth`, `kilocode`, `xiaomi`, `arcee`, `gmi`, `upstage`（別名 `solar`）, `alibaba`, `alibaba-coding-plan`（別名 `alibaba_coding`）, `deepseek`, `nvidia`, `ollama-cloud`, `xai`（別名 `grok`）, `xai-oauth`（別名 `grok-oauth`）, `qwen-oauth`, `bedrock`, `opencode-zen`, `opencode-go`, `opencode-free`（別名 `free`、`opencode_free`。キーは要りません）, `commandcode`, `commandcode-anthropic`, `ai-gateway`, `azure-foundry`, `lmstudio`, `stepfun`, `tencent-tokenhub`（別名 `tencent`、`tokenhub`）。 |
| `-s`, `--skills <name>` | セッション開始時にスキルを読み込みます（繰り返し指定、またはカンマ区切りで複数指定できます）。 |
| `-v`, `--verbose` | 詳しい出力を表示します。 |
| `-Q`, `--quiet` | プログラムから使うためのモードです。バナー、スピナー、ツールの下準備表示を出しません。 |
| `--image <path>` | ひとつの問い合わせにローカルの画像を添えます。 |
| `--resume <session>` / `--continue [name]` | `chat` から直接セッションを再開します。 |
| `--worktree` | この実行のために独立した git worktree を作ります。 |
| `--checkpoints` | ファイルを壊す変更の前に、ファイルシステムのチェックポイントを取ります。 |
| `--yolo` | 承認プロンプトを省略します。 |
| `--pass-session-id` | セッション ID をシステムプロンプトへ渡します。 |
| `--ignore-user-config` | `~/.hermes/config.yaml` を無視して組み込みの既定値を使います。`.env` の資格情報は読み込まれたままです。隔離された CI の実行、再現しやすいバグ報告、他社製の連携に便利です。 |
| `--ignore-rules` | `AGENTS.md`、`SOUL.md`、`.cursorrules`、永続メモリ、事前読み込みするスキルの自動注入を省略します。`--ignore-user-config` と組み合わせると、完全に隔離した実行になります。 |
| `--safe-mode` | 問題を切り分けるためのモードです。ユーザー設定、ルールやメモリの注入、プラグイン、シェルのフック、MCP サーバーなど、すべてのカスタマイズを無効にします（`--ignore-user-config` と `--ignore-rules` を含みます）。問題の原因が自分の環境なのか Hermes 自体なのかを見分けるために使います。 |
| `--source <tag>` | 絞り込み用のセッション出所タグです（既定は `cli`）。ユーザーのセッション一覧に出したくない他社製の連携には `tool` を使ってください。 |
| `--max-turns <N>` | 会話の 1 ターンあたりでツールを呼び出す繰り返しの上限です（既定は 500、または設定の `agent.max_turns`）。 |

例:

```bash
hermes
hermes chat -q "Summarize the latest PRs"
hermes chat --provider openrouter --model anthropic/claude-sonnet-4.6
hermes chat --toolsets web,terminal,skills
hermes chat --quiet -q "Return only JSON"
hermes chat --worktree -q "Review this repo and open a PR"
hermes chat --ignore-user-config --ignore-rules -q "Repro without my personal setup"
hermes chat --safe-mode -q "Is this bug mine or Hermes'?"
```

### `hermes -z <prompt>` — スクリプト向けの一回きり実行 {#hermes--z-prompt-scripted-one-shot}

プログラムから呼び出す場面（シェルスクリプト、CI、cron、プロンプトを流し込む親プロセス）では、`hermes -z` がもっとも素直な一回きりの入口です。**プロンプトをひとつ渡すと、最終的な応答テキストだけが返り、標準出力にも標準エラー出力にもそれ以外は出ません。** バナーもスピナーもツールの下準備表示も `Session:` の行もなく、エージェントの最終的な返事がそのままのテキストで出てきます。

```bash
hermes -z "What's the capital of France?"
# → Paris.

# Parent scripts can cleanly capture the response:
answer=$(hermes -z "summarize this" < /path/to/file.txt)
```

実行ごとの上書き（`~/.hermes/config.yaml` は書き換わりません）:

| フラグ | 対応する環境変数 | 用途 |
|---|---|---|
| `-m` / `--model <model>` | `HERMES_INFERENCE_MODEL` | この実行で使うモデルを上書きします |
| `--provider <provider>` | _(なし)_ | この実行で使うプロバイダを上書きします |
| `--usage-file <path>` | _(なし)_ | 実行後に JSON の利用状況レポートを書き出します（後述） |

```bash
hermes -z "…" --provider openrouter --model openai/gpt-5.5
# or:
HERMES_INFERENCE_MODEL=anthropic/claude-sonnet-4.6 hermes -z "…"
```

エージェントもツールもスキルも同じで、対話的な部分や見た目の飾りを取り除いただけです。会話の記録にツールの出力も残したいときは `hermes chat -q` を使ってください。`-z` は「最終的な答えだけがほしい」場面のためのものです。

#### `--usage-file` — パイプライン向けの JSON 利用状況レポート {#--usage-file-json-usage-report-for-pipelines}

`hermes -z "…" --usage-file /path/report.json` は、実行後に機械が読める利用状況レポートを書き出します。内容は `estimated_cost_usd`、`input_tokens` / `output_tokens` / `cache_read_tokens` / `cache_write_tokens` / `reasoning_tokens` / `total_tokens`、`api_calls`、`model`、`provider`、`session_id`、`service_tier`、そして `completed` / `failed` のフラグです。このレポートは**実行が失敗したときも**書き出されるので、まとめて処理するパイプラインでも支出を必ず把握できます。`-z`/`--oneshot` 以外では効果がなく、レポートの書き出しに失敗しても実行そのものの結果が覆い隠されることはありません。

```bash
hermes -z "summarize this repo" --usage-file /tmp/usage.json
jq .estimated_cost_usd /tmp/usage.json
```

## `hermes model` {#hermes-model}

プロバイダとモデルを対話的に選ぶ画面です。**新しいプロバイダの追加、API キーの設定、OAuth の手続きは、このコマンドで行います。** 実行はターミナルから行ってください。Hermes のチャットセッションの中からではありません。

```bash
hermes model
```

次のようなことをしたいときに使います。
- **新しいプロバイダを追加する**（OpenRouter、Anthropic、Copilot、DeepSeek、独自のものなど）
- OAuth を使うプロバイダにログインする（Anthropic、Copilot、Codex、Nous Portal）
- API キーを入力・更新する
- プロバイダごとのモデル一覧から選ぶ
- 独自エンドポイントや自前で立てたエンドポイントを設定する
- 新しい既定値を設定に保存する

:::warning hermes model と /model の違いを押さえる
**`hermes model`**（Hermes のセッションの外、ターミナルから実行します）は**プロバイダ設定の完全なウィザード**です。新しいプロバイダの追加、OAuth の手続き、API キーの入力、エンドポイントの設定ができます。

**`/model`**（動作中の Hermes のチャットセッションの中で入力します）は、**すでに設定済みのプロバイダとモデルを切り替えることしかできません**。新しいプロバイダの追加も、OAuth も、API キーの入力もできません。

**新しいプロバイダを追加したいときは:** まず Hermes のセッションを終了し（`Ctrl+C` または `/quit`）、ターミナルのプロンプトから `hermes model` を実行してください。
:::

### `/model` スラッシュコマンド（セッションの途中で使う） {#model-slash-command-mid-session}

セッションを抜けずに、設定済みのモデルを切り替えます。

```
/model                              # Show current model and available options
/model claude-sonnet-4              # Switch model (auto-detects provider)
/model zai:glm-5                    # Switch provider and model
/model custom:qwen-2.5              # Use model on your custom endpoint
/model custom                       # Auto-detect model from custom endpoint
/model custom:local:qwen-2.5        # Use a named custom provider
/model openrouter:anthropic/claude-sonnet-4  # Switch back to cloud
```

既定では、`/model` による変更は**今のセッションだけ**に効きます。`--global` を付けると `config.yaml` に保存されて残ります（`model.persist_switch_by_default: true` を設定すれば、すべての切り替えが残るようになります）。

```
/model claude-sonnet-4 --global     # Switch and save as new default
```

:::info OpenRouter のモデルしか出てこないときは
OpenRouter だけを設定している場合、`/model` には OpenRouter のモデルしか表示されません。別のプロバイダ（Anthropic、DeepSeek、Copilot など）を追加するには、セッションを終了してターミナルから `hermes model` を実行してください。
:::

`--global` を付けて切り替えると、モデルと一緒にプロバイダとベース URL の変更も `config.yaml` に保存されます。独自エンドポイントから別のものへ切り替えるときは、古いベース URL が他のプロバイダに紛れ込まないように消去されます。

## `hermes gateway` {#hermes-gateway}

```bash
hermes gateway <subcommand>
```

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `run` | ゲートウェイを前面で実行します。WSL、Docker、Termux ではこちらをおすすめします。 |
| `start` | インストール済みの systemd / launchd のバックグラウンドサービスを開始します。 |
| `stop` | サービス（または前面のプロセス）を停止します。 |
| `restart` | サービスを再起動します。 |
| `status` | サービスの状態を表示します。 |
| `list` | **すべてのプロファイル**と、それぞれのゲートウェイが今動いているかどうかを一覧にします（分かる場合は PID も出ます）。複数のプロファイルを並べて動かしていて、全体をひと目で見たいときに便利です。 |
| `install` | systemd（Linux）または launchd（macOS）のバックグラウンドサービスとしてインストールします。 |
| `uninstall` | インストール済みのサービスを削除します。 |
| `setup` | メッセージングプラットフォームの設定を対話的に行います。 |
| `migrate-legacy` | 改名前のインストールから残っている旧 `hermes.service` のユニットを削除します。プロファイルのユニット（`hermes-gateway-<profile>.service`）や無関係なサービスには一切触れません。フラグ: `--dry-run`、`-y`/`--yes`。 |
| `enroll` | 実験的機能: このゲートウェイをリレーのコネクタに登録し、コネクタ経由のプラットフォーム向けにリレーの資格情報を保存します。[Hermes Relay](/hermes/docs/user-guide/messaging/relay/)をご覧ください。 |

オプション:

| オプション | 説明 |
|--------|-------------|
| `--all` | `start` / `restart` / `stop` に付けると、現在の `HERMES_HOME` だけでなく**すべてのプロファイル**のゲートウェイを対象にします。複数のプロファイルを並べて動かしていて、`hermes update` のあとにまとめて再起動したいときに便利です。 |
| `--no-supervise` | `run` に付けると、s6-overlay の Docker イメージの中で自動監視をやめ、s6 導入前と同じ前面実行の動きにします。ゲートウェイはコンテナの主プロセスとして動き、自動再起動はしません。s6 イメージの外では何もしません。`HERMES_GATEWAY_NO_SUPERVISE=1` を設定するのと同じです。 |
| `--external-supervisor` | `run` に付けると、ラッパー側のプロセス管理が前面のゲートウェイを管理していることを宣言します。`sudo` や `env -i`、その他のラッパーが launchd / systemd 由来の環境の目印を取り除いてしまう場合に使ってください。チャットからの再起動や更新は、別プロセスを切り離して立ち上げるのではなく、その管理側へ戻る形で終了します。 |

`--external-supervisor` は再起動の方針についての取り決めです。チャットからの再起動やサービス再起動を伴う更新は終了コード `75` で終わるので、ラッパー側の監視プロセスがその非ゼロ終了のあとにゲートウェイを立ち上げ直す必要があります。systemd なら `Restart=on-failure` か `Restart=always` を使い、`RestartPreventExitStatus` に `75` を含めないでください。launchd なら、失敗終了のあとに再起動するよう `KeepAlive` を設定します。この方針がないと、再起動を求めてもゲートウェイは止まったままになります。

`hermes gateway enroll` は `--token`、`--connector-url`、`--gateway-id`、`--wake-url` を受け取ります。登録用のトークンをコネクタと交換し、その結果得られた `GATEWAY_RELAY_ID`、`GATEWAY_RELAY_SECRET`、`GATEWAY_RELAY_DELIVERY_KEY`、任意の `GATEWAY_RELAY_URL`、そして（`--wake-url` を渡した場合は）`GATEWAY_RELAY_WAKE_URL` の値を、現在のプロファイルの `.env` に書き込みます。

:::tip WSL をお使いの方へ
`hermes gateway start` ではなく `hermes gateway run` を使ってください。WSL の systemd 対応は当てになりません。動かし続けるには tmux で包みます: `tmux new -s hermes 'hermes gateway run'`。詳しくは [WSL の FAQ](/hermes/docs/reference/faq/#wsl-gateway-keeps-disconnecting-or-hermes-gateway-start-fails) をご覧ください。
:::

## `hermes lsp` {#hermes-lsp}

```bash
hermes lsp <subcommand>
```

Language Server Protocol の連携を管理します。LSP は本物の言語サーバー（pyright、gopls、rust-analyzer など）を裏側で動かし、その診断結果を `write_file` と `patch` の書き込み後チェックに流し込みます。git の作業スペースが見つかったときだけ動く仕組みで、作業ディレクトリまたは編集対象のファイルが git の worktree の中にある場合にのみ LSP が動きます。

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `status` | サービスの状態、設定済みのサーバー、インストール状況を表示します。 |
| `list` | 対応しているサーバーの一覧を出力します。`--installed-only` を付けると、未インストールのものを省きます。 |
| `install <id>` | サーバーの実行ファイルを先回りしてインストールします。 |
| `install-all` | 自動インストールの手順が分かっているサーバーをすべてインストールします。 |
| `restart` | 動作中のクライアントを片付けて、次の編集で立ち上げ直させます。 |
| `which <id>` | あるサーバーについて、解決された実行ファイルのパスを出力します。 |

対応言語や設定項目を含む詳しい案内は [LSP — 意味解析による診断](/hermes/docs/user-guide/features/lsp/) をご覧ください。

## `hermes setup` {#hermes-setup}

```bash
hermes setup [model|tts|terminal|gateway|tools|agent] [--non-interactive] [--reset] [--quick] [--reconfigure] [--portal]
```

**いちばん簡単な道:** `hermes setup --portal` — Nous Portal に OAuth でログインし、[Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/) の利用を一度に済ませます。

**初回の実行:** 初めての方向けのウィザードが立ち上がります。

**すでに設定済みの方:** 設定し直すウィザードにそのまま入ります。どの項目も今の値が既定として表示されるので、Enter を押せばそのまま、変えたいときは新しい値を入力します。メニューは出ません。

ウィザード全体ではなく、ひとつの区分だけを開くこともできます。

| 区分 | 説明 |
|---------|-------------|
| `model` | プロバイダとモデルの設定です。 |
| `terminal` | ターミナルのバックエンドとサンドボックスの設定です。 |
| `gateway` | メッセージングプラットフォームの設定です。 |
| `tools` | プラットフォームごとにツールを有効・無効にします。 |
| `agent` | エージェントの振る舞いに関する設定です。 |

オプション:

| オプション | 説明 |
|--------|-------------|
| `--quick` | 設定済みの方が実行したとき、抜けている項目や未設定の項目だけを尋ねます。すでに設定済みの項目は飛ばします。 |
| `--non-interactive` | 質問せずに、既定値や環境変数の値を使います。 |
| `--reset` | 設定を始める前に、設定を既定値へ戻します。 |
| `--reconfigure` | 過去との互換のための別名です。インストール済みの環境では、引数なしの `hermes setup` が今はこの動きになります。 |
| `--portal` | Nous Portal の設定を一度に済ませます。OAuth でログインし、推論のプロバイダを Nous にして、[Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/) の利用を有効にします。ウィザードの残りは飛ばします。 |

## `hermes portal` {#hermes-portal}

```bash
hermes portal [status|open|tools]
```

Nous Portal の認証状態、Tool Gateway のルーティングを確認し、サブスクリプションのページを開きます。サブコマンドなしで実行すると `status` が動きます。

| サブコマンド | 説明 |
|------------|-------------|
| `status`（既定） | Portal の認証状態と、ツールごとの Tool Gateway ルーティングの要約です。サブコマンドを付けなかったときにも表示されます。 |
| `open` | 既定のブラウザで `portal.nousresearch.com/manage-subscription` を開きます。 |
| `tools` | Tool Gateway の提携先（Firecrawl、FAL、OpenAI TTS、Browser Use、Modal）をすべて挙げ、どれが Nous 経由で流れているかを示します。 |

ゲートウェイそのものの設定については [Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/) をご覧ください。一度で済ませる設定の道筋は、上の `hermes setup --portal` をご覧ください。

## `hermes whatsapp` {#hermes-whatsapp}

```bash
hermes whatsapp
```

モードの選択と QR コードによるペアリングを含む、WhatsApp のペアリング／設定の流れを実行します。

## `hermes slack` {#hermes-slack}

```bash
hermes slack manifest              # print manifest to stdout
hermes slack manifest --write      # write to ~/.hermes/slack-manifest.json
hermes slack manifest --long-description-file AGENTS.md --write
hermes slack manifest --slashes-only  # just the features.slash_commands array
```

`COMMAND_REGISTRY` にあるゲートウェイのコマンド（`/btw`、`/stop`、`/model` など）を、すべて Slack 本来のスラッシュコマンドとして登録する Slack アプリのマニフェストを生成します。Discord や Telegram と同じ使い勝手にそろえるためのものです。出力された内容を [https://api.slack.com/apps](https://api.slack.com/apps) → 自分のアプリ → **Features → App Manifest → Edit** に貼り付け、**Save** を押してください。スコープやスラッシュコマンドが変わっていると、Slack が入れ直しを求めてきます。

| フラグ | 既定値 | 用途 |
|------|---------|---------|
| `--write [PATH]` | 標準出力 | 標準出力ではなくファイルに書き出します。`--write` だけを付けると `$HERMES_HOME/slack-manifest.json` に書き出します。 |
| `--name NAME` | `Hermes` | Slack で表示されるボットの名前です。 |
| `--description DESC` | 既定の紹介文 | Slack のアプリディレクトリに表示されるボットの説明です。 |
| `--long-description TEXT` | 未設定 | `display_information.long_description` をその場で指定します（175〜4,000 文字）。`--slashes-only` とは併用できません。 |
| `--long-description-file PATH` | 未設定 | UTF-8 のテキストファイルから長い説明を読み込み、中身をそのまま保ちます。`--long-description` とは同時に使えず、`--slashes-only` とも併用できません。 |
| `--slashes-only` | 無効 | 手作業で管理しているマニフェストに取り込めるよう、`features.slash_commands` だけを出力します。 |

`hermes update` のあとは、新しいコマンドを取り込むためにもう一度 `hermes slack manifest --write` を実行してください。

## `hermes send` {#hermes-send}

```bash
hermes send --to <target> "message text"
hermes send --to <target> --file <path>
echo "message" | hermes send --to <target>
hermes send --list [platform]
```

エージェントやゲートウェイのループを立ち上げずに、設定済みのメッセージングプラットフォームへ一回きりのメッセージを送ります。ゲートウェイがすでに持っている資格情報（`~/.hermes/.env` と `~/.hermes/config.yaml`）を使い回すので、運用スクリプト、cron ジョブ、CI のフック、監視デーモンから、プラットフォームごとの REST クライアントを書き直さずに状況を投稿できます。

ボットトークンを使うプラットフォーム（Telegram、Discord、Slack、Signal、SMS、WhatsApp-CloudAPI）では、ゲートウェイが動いている必要はありません。`hermes send` がプラットフォームの REST エンドポイントへ直接話しかけます。常駐アダプタが必要なプラグイン方式のプラットフォームでは、今も動作中のゲートウェイが要ります。

| オプション | 説明 |
|--------|-------------|
| `-t`, `--to <TARGET>` | 送り先です。書き方は `platform`（ホームチャンネルを使います）、`platform:chat_id`、`platform:chat_id:thread_id`、`platform:#channel-name` のいずれかです。例: `telegram`、`telegram:-1001234567890`、`discord:#ops`、`slack:C0123ABCD`、`signal:+15551234567`。 |
| `-f`, `--file <PATH>` | メッセージ本文を `PATH` から読み込みます（テキストファイルのみ — ログ、レポート、マークダウンなど）。`-` を渡すと標準入力から読みます。画像などのバイナリファイルを送りたいときは `MEDIA:<path>` を使ってください（後述）。 |
| `-s`, `--subject <LINE>` | メッセージ本文の前に、件名や見出しの行を付けます。 |
| `-l`, `--list [platform]` | すべてのプラットフォーム（または指定したプラットフォームだけ）について、設定済みの送り先を一覧にします。 |
| `-q`, `--quiet` | 成功したときに標準出力へ何も出しません。スクリプトで終了コードだけを見たいときに便利です。 |
| `--json` | 人が読む形式ではなく、生の JSON の結果を出力します。 |

位置引数の `message` も `--file` も指定しなかった場合、標準入力が端末でなければ `hermes send` はそこから読み込みます。終了コードは、成功が `0`、配信やバックエンドの失敗が `1`、使い方の誤りが `2` です。

### 画像やその他のメディアを送る {#sending-images-and-other-media}

`--file` は*テキスト*の本文専用です。画像、文書、動画、音声のファイルをプラットフォーム本来の添付として届けるには、メッセージ本文の中で `MEDIA:<local_path>` という指示を使って参照します。

```bash
hermes send --to telegram "MEDIA:/tmp/screenshot.png"
hermes send --to telegram "Build chart for today MEDIA:/tmp/chart.png"   # with caption
hermes send --to discord:#ops "MEDIA:/tmp/report.pdf"
```

既定では、画像ファイルは写真として送られます（Telegram のようなプラットフォームでは再圧縮されます）。メッセージに `[[as_document]]` を加えると、圧縮されないファイル添付として届けられます。

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
hermes peer remove <name>
```

端末をまたいだボット同士の DM です。別の Hermes ゲートウェイ（`api_server` プラットフォームを動かしている端末ならどれでも）を*ピア*として登録し、そのエージェントにメッセージを送ります。`hermes peer dm` は、ピアの API サーバー越しに相手のエージェントの正規の **Bot Chat** セッションを見つけ、そこでエージェントの 1 ターンを実行し、返事を標準出力に出します。ローカルで使う `hermes -p <bot> chat --in ~ -c "Bot Chat" …` というボット向けメッセージ送信コマンドの、端末をまたいだ版にあたります。

`<peer>` だけを書くとピアのゲートウェイの主エージェントが相手になります。`<peer>/<agent>` は、多重化されたピア上の名前付きプロファイルを指します（そのプロファイルの `/p/<profile>/` の写しを経由します）。

| サブコマンド | 説明 |
|--------|-------------|
| `add <name> --url <URL> [--key <KEY>] [--note TEXT]` | ピアを登録または更新します。URL は `config.yaml`（`bot_peers`）へ、キーは `~/.hermes/.env` に `HERMES_PEER_<NAME>_KEY` として保存されます。 |
| `list` | ピアと、それぞれにキーが設定されているかどうかを一覧にします。 |
| `dm <peer>[/<agent>] [message]` | ピアのエージェントの正規の Bot Chat にメッセージを送り、返事を出力します（機械が読める出力にするには `--json`。メッセージを省くと標準入力から読みます）。 |
| `remove <name>` | ピアを登録簿から削除します（`.env` のキーの項目はそのまま残ります）。 |

ピアがひとつ以上登録されていると、すべての正規の Bot Chat に教えられる Bot モードのメッセージング手順（`agent.bot_mode_protocol`）に、ピアの名簿と `hermes peer dm` の使い方が自動で含まれます。そのため、SOUL を書き換えなくてもエージェントが端末をまたいだ仲間を見つけられます。[Bot モード](/hermes/docs/user-guide/bot-mode/)をご覧ください。

終了コードは、成功が `0`、配信やピアの失敗が `1`、使い方の誤りが `2` です。

## `hermes secrets` {#hermes-secrets}

```bash
hermes secrets bitwarden <subcommand>
hermes secrets bw <subcommand>          # short alias
```

API キーを `~/.hermes/.env` に置かず、プロセスの起動時に外部のシークレット管理から取得します。現在は **Bitwarden Secrets Manager** に対応しています。詳しい案内は [Bitwarden 連携](/hermes/docs/user-guide/secrets/bitwarden/)をご覧ください。

`bitwarden`（別名 `bw`）のサブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `setup` | 対話的なウィザードです。バージョン固定した `bws` の実行ファイルをインストールし、アクセストークンを保存し、プロジェクトを選びます。対話なしで使う場合は `--project-id`、`--access-token`、`--server-url` を受け取ります。 |
| `status` | 現在の設定、実行ファイルのパスとバージョン、トークンの検証状態を表示します。 |
| `token` | アクセストークンを入れ替えます。新しいトークンを Bitwarden で検証してから `.env` に保存します（拒否されたトークンでは何も変わりません）。対話なしで使う場合は `--access-token`、検証を省くには `--no-verify` を受け取ります。 |
| `sync` | いますぐシークレットを取得し、何が変わったかを報告します。`--apply` を付けると、実際にシークレットを現在のシェルの環境に書き出します（既定は変更を伴わない確認だけです）。 |
| `install` | バージョン固定した `bws` の実行ファイルをダウンロードして検証します。`--force` を付けると、管理下の複製がすでにあっても取得し直します。 |
| `disable` | Bitwarden 連携を無効にします。 |

## `hermes migrate` {#hermes-migrate}

```bash
hermes migrate <type>
```

現在の `config.yaml` を診断し、必要に応じて書き換えて、廃止されたモデルや非推奨の設定への参照を置き換えます。書き換えの前には、元の `config.yaml` の日時付きバックアップが取られます（`--no-backup` で省けます）。

| サブコマンド | 説明 |
|------------|-------------|
| `xai` | 2026 年 5 月 15 日に廃止予定の xAI のモデルへの参照が `config.yaml` にないか調べ、（`--apply` を付ければ）xAI の移行案内に沿って公式の置き換え先へその場で書き換えます。既定では書き換えずに確認だけを行います。 |

移行系サブコマンド共通のフラグ:

| フラグ | 説明 |
|------|-------------|
| `--apply` | `config.yaml` をその場で書き換えます（既定は確認だけで、書き込みません）。 |
| `--no-backup` | 適用時に `config.yaml` の日時付きバックアップを取りません。 |

> `hermes claw migrate`（OpenClaw の設定を Hermes へ一度だけ取り込むもの）とは別物です。`hermes migrate` はトップレベルにある、設定書き換えのためのコマンドです。

## `hermes proxy` {#hermes-proxy}

```bash
hermes proxy <subcommand>
```

OAuth で認証した上流プロバイダ（Nous Portal、xAI など）へリクエストを転送する、ローカルの OpenAI 互換 HTTP サーバーを動かします。外部のアプリは任意のベアラートークンでこのプロキシを指せばよく、送出時にプロキシが本物の OAuth 資格情報を付け足します。詳しい案内は[サブスクリプションプロキシ](/hermes/docs/user-guide/features/subscription-proxy/)をご覧ください。

| サブコマンド | 説明 |
|------------|-------------|
| `start` | プロキシを前面で実行します。フラグ: `--provider <nous\|xai>`（既定は `nous`）、`--host <addr>`（既定は `127.0.0.1`。LAN に公開するなら `0.0.0.0`）、`--port <int>`（既定は `8645`）。 |
| `status` | どの上流プロキシが使える状態か（資格情報があり、OAuth が有効か）を表示します。 |
| `providers` | 利用できる上流のプロキシプロバイダを一覧にします。 |

## `hermes security` {#hermes-security}

```bash
hermes security <subcommand>
```

[OSV.dev](https://osv.dev) に照らして、その場で脆弱性を調べます。対象は Hermes の venv（インストール済みの PyPI 配布物）、`~/.hermes/plugins/` 配下のプラグインが宣言する Python の依存関係、そして `config.yaml` でバージョン固定された `npx`/`uvx` の MCP サーバーです。システム全体にインストールされたパッケージや、エディタ／ブラウザの拡張は対象外です。

| サブコマンド | 説明 |
|------------|-------------|
| `audit` | 供給網の監査を一度だけ実行します。 |

`audit` のフラグ:

| フラグ | 既定値 | 説明 |
|------|---------|-------------|
| `--json` | 無効 | 人が読む文章ではなく、機械が読める JSON を出力します。 |
| `--fail-on <level>` | `critical` | この深刻度に達する検出があったとき、終了コードを非ゼロにします（`low`、`moderate`、`high`、`critical`）。 |
| `--skip-venv` | 無効 | Hermes の Python の venv を調べません。 |
| `--skip-plugins` | 無効 | プラグインの依存要件ファイルを調べません。 |
| `--skip-mcp` | 無効 | `config.yaml` でバージョン固定された MCP サーバーを調べません。 |

## `hermes login` / `hermes logout` *(非推奨)* {#hermes-login-hermes-logout-deprecated}

:::caution
`hermes login` は削除されました。OAuth の資格情報を管理するには `hermes auth`、プロバイダを選ぶには `hermes model`、対話的な設定をひととおり行うには `hermes setup` を使ってください。
:::

## `hermes auth` {#hermes-auth}

同じプロバイダでキーを入れ替えて使うための、資格情報のまとまりを管理します。詳しい説明は[資格情報プール](/hermes/docs/user-guide/features/credential-pools/)をご覧ください。

```bash
hermes auth                                              # Interactive wizard
hermes auth list                                         # Show all pools
hermes auth list openrouter                              # Show specific provider
hermes auth add openrouter --api-key sk-or-v1-xxx        # Add API key
hermes auth add anthropic --type oauth                   # Add OAuth credential
hermes auth remove openrouter 2                          # Remove by index
hermes auth reset openrouter                             # Clear cooldowns
hermes auth status anthropic                             # Show auth status for a provider
hermes auth logout anthropic                             # Log out and clear stored auth state
hermes auth spotify                                      # Authenticate Hermes with Spotify via PKCE
```

サブコマンド: `add`、`list`、`remove`、`reset`、`status`、`logout`、`spotify`。サブコマンドなしで呼び出すと、対話的な管理ウィザードが立ち上がります。

## `hermes status` {#hermes-status}

```bash
hermes status [--all] [--deep]
```

| オプション | 説明 |
|--------|-------------|
| `--all` | 人に見せられるよう伏せ字にした形で、すべての詳細を表示します。 |
| `--deep` | 時間がかかることのある、より踏み込んだ検査を実行します。 |

## `hermes cron` {#hermes-cron}

```bash
hermes cron <list|create|edit|pause|resume|run|remove|status|tick>
```

| サブコマンド | 説明 |
|------------|-------------|
| `list` | 予約されたジョブを表示します。 |
| `create` / `add` | プロンプトから予約ジョブを作ります。`--skill` を繰り返し指定して、スキルを付けることもできます。ジョブごとに推論の深さを固定する `--reasoning-effort <none\|minimal\|low\|medium\|high\|xhigh\|max\|ultra>` にも対応します。 |
| `edit` | ジョブの予定、プロンプト、名前、配信先、繰り返し回数、付けたスキルを変更します。`--clear-skills`、`--add-skill`、`--remove-skill` に加えて `--reasoning-effort` にも対応します（空の文字列を渡すと固定を解除します）。 |
| `pause` | ジョブを削除せずに一時停止します。 |
| `resume` | 停止中のジョブを再開し、次の実行時刻を計算します。 |
| `run` | 次のスケジューラの刻みでジョブを実行させます。 |
| `remove` | 予約ジョブを削除します。 |
| `status` | cron のスケジューラが動いているかどうかを確認します。 |
| `tick` | 実行時刻になったジョブを一度だけ動かして終了します。 |

cron の**起動役**は、設定の `cron.provider` キーで差し替えられます。空（既定）ならプロセス内蔵の刻み役を使います。`chronos`（ゼロまで縮む、ホスト型ゲートウェイ向けの NAS 管理のプロバイダ）を指定することもでき、その場合は `cron.chronos.*` のキー（`portal_url`、`callback_url`、`expected_audience`、`nas_jwks_url`）で設定します。あるいは `plugins/cron/<name>/` や `$HERMES_HOME/plugins/<name>/` に置いた独自プロバイダの名前を書きます。知らないプロバイダや使えないプロバイダを指定した場合は内蔵のものに戻るので、cron が起動役を失うことはありません。[cron の内部構造](/hermes/docs/developer-guide/cron-internals/#gateway-integration)の文書をご覧ください。

## `hermes kanban` {#hermes-kanban}

```bash
hermes kanban [--board <slug>] <action> [options]
```

複数のプロファイル、複数のプロジェクトで共同作業するためのボードです。ひとつのインストールで多くのボード（プロジェクトごと、リポジトリごと、領域ごと）を抱えられます。各ボードは独立した待ち行列で、それぞれ専用の SQLite データベースとディスパッチャの担当範囲を持ちます。新しくインストールすると `default` というボードがひとつでき、そのデータベースは過去との互換のため `~/.hermes/kanban.db` です。追加のボードは `~/.hermes/kanban/boards/<slug>/kanban.db` に置かれます。ゲートウェイに組み込まれたディスパッチャは、刻みごとにすべてのボードを見て回ります。

**全体に効くフラグ（下のすべての操作に適用されます）:**

| フラグ | 用途 |
|------|---------|
| `--board <slug>` | 特定のボードを操作します。既定では現在のボード（`hermes kanban boards switch`、環境変数 `HERMES_KANBAN_BOARD`、または `default` で決まります）が対象です。 |

**これは人が使う、あるいはスクリプトから使うための入口です。** ディスパッチャが立ち上げるエージェントのワーカーは、`hermes kanban` をシェルから呼ぶのではなく、専用の `kanban_*` [ツールセット](/hermes/docs/user-guide/features/kanban/#how-workers-interact-with-the-board)（`kanban_show`、`kanban_complete`、`kanban_request_review`、`kanban_request_changes`、`kanban_block`、`kanban_create`、`kanban_link`、`kanban_comment`、`kanban_heartbeat`。まとめ役のプロファイルにはさらに `kanban_list` と `kanban_unblock`）でボードを操作します。ワーカーの環境には `HERMES_KANBAN_BOARD` が固定されているので、他のボードは物理的に見えません。

| 操作 | 用途 |
|--------|---------|
| `init` | `kanban.db` がなければ作ります。何度実行しても同じ結果になります。 |
| `boards list` / `boards ls` | すべてのボードをタスク数と一緒に一覧にします。`--json`、`--all`（保管済みも含めます）。 |
| `boards create <slug>` | 新しいボードを作ります。フラグ: `--name`、`--description`、`--icon`、`--color`、`--switch`（作ったボードを現在のものにします）。slug はケバブケースで、自動的に小文字になります。 |
| `boards switch <slug>` / `boards use` | `<slug>` を現在のボードとして保存します（`~/.hermes/kanban/current` に書き込みます）。 |
| `boards show` / `boards current` | 現在のボードの名前、データベースのパス、タスク数を出力します。 |
| `boards rename <slug> "<name>"` | ボードの表示名を変えます。slug は変えられません。 |
| `boards rm <slug>` | ボードを保管（既定）するか、完全に削除します。`--delete` を付けると保管の段階を飛ばします。保管されたボードは `boards/_archived/<slug>-<ts>/` へ移ります。`default` に対しては拒否されます。 |
| `create "<title>"` | 現在のボードに新しいタスクを作ります。フラグ: `--body`、`--assignee`、`--parent`（繰り返し可）、`--workspace scratch\|worktree\|dir:<path>`、`--tenant`、`--priority`、`--triage`、`--idempotency-key`、`--max-runtime`、`--max-retries`、`--skill`（繰り返し可）。 |
| `list` / `ls` | 現在のボードのタスクを一覧にします。`--mine`、`--assignee`、`--status`、`--tenant`、`--archived`、`--json` で絞り込めます。 |
| `show <id>` | タスクをコメントと出来事と一緒に表示します。機械向けの出力には `--json`。 |
| `assign <id> <profile>` | 担当を割り当て、または割り当て直します。`none` を指定すると担当を外します。タスクの実行中は拒否されます。 |
| `link <parent> <child>` | 依存関係を追加します。循環は検出されます。両方のタスクが同じボードにある必要があります。 |
| `unlink <parent> <child>` | 依存関係を外します。 |
| `claim <id>` | 準備の整ったタスクを、他と衝突しない形で受け持ちます。解決された作業スペースのパスを出力します。 |
| `comment <id> "<text>"` | コメントを追記します。次にそのタスクを受け持ったワーカーが、`kanban_show()` の応答の一部として読みます。 |
| `complete <id>` | タスクを完了にします。フラグ: `--result`、`--summary`、`--metadata`。 |
| `block <id> "<reason>"` | 人の判断待ちとしてタスクを止めます。理由はコメントとしても追記されます。 |
| `request-review <id>` | タスクを `review` へ移し、レビュー担当へ引き継ぎます。止めるわけではありません。フラグ: `--summary`、`--metadata`、`--reviewer`（レビューの割り振り前に担当を変更します）。 |
| `request-changes <id> <reason>` | 進行中のレビューに対するレビュー担当の判断です。そのレビューの試行を終え、タスクを元の実装担当へ戻します。 |
| `reopen-review <id>...` | レビュー中のタスクを修正のために差し戻します（`review` → ready/todo）。フラグ: `--reason`（コメントとして追記されます）。 |
| `schedule <id> "<reason>"` | 時間待ちや後追いの作業を `scheduled` に置いて、人が止めている案件として表示されないようにします。 |
| `unblock <id>` | 止まっているタスクを元の段階（`review` か `ready`）へ戻します。依存関係が未解決なら `todo` へ戻します。 |
| `archive <id>` | 既定の一覧から隠します。`gc` を実行すると、使い捨ての作業スペースが削除されます。 |
| `tail <id>` | タスクの出来事の流れを追い続けます。 |
| `dispatch` | 現在のボードに対してディスパッチャを一巡させます。フラグ: `--dry-run`、`--max N`、`--failure-limit N`、`--json`。 |
| `context <id>` | ワーカーが目にする文脈をすべて出力します（タイトル、本文、親タスクの結果、コメント）。 |
| `specify <id>` / `specify --all` | 仕分け列にあるタスクを、補助 LLM を使って具体的な仕様（目的・進め方・受け入れ条件を含むタイトルと本文）に膨らませ、`todo` へ進めます。フラグ: `--tenant`（`--all` の範囲をひとつのテナントに絞ります）、`--author`、`--json`。モデルは `config.yaml` の `auxiliary.triage_specifier` で設定します。 |
| `decompose <id>` / `decompose --all` | 仕分け列にあるタスクを、内容に応じて専門のプロファイルへ振り分けた子タスクの集まりへ広げます。分割しても得るものがないと LLM が判断した場合は、specify と同じ形で単一タスクのまま進めます。フラグは `specify` と同じです。分割用のモデルは `config.yaml` の `auxiliary.kanban_decomposer` で設定します。`kanban.orchestrator_profile` は、分割後に根となるまとめ役のタスクを誰が持つかだけを決めます。`kanban.auto_decompose: true`（既定）のときは、ディスパッチャの刻みごとに自動でも実行されます。[自動と手動のまとめ役](/hermes/docs/user-guide/features/kanban/#auto-vs-manual-orchestration)をご覧ください。 |
| `gc` | 保管済みタスクの使い捨て作業スペースを削除します。 |

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

ボードの決まり方は、優先度の高い順に `--board <slug>` フラグ → 環境変数 `HERMES_KANBAN_BOARD` → `~/.hermes/kanban/current` ファイル → `default` です。

すべての操作は、ゲートウェイのスラッシュコマンド（`/kanban …`）としても同じ引数の形で使えます。`boards` のサブコマンドや `--board` フラグも同じです。

設計の全体像 — Cline Kanban / Paperclip / NanoClaw / Gemini Enterprise との比較、8 つの共同作業のかたち、4 つの利用場面、同時実行の正しさの証明 — については、リポジトリの `docs/hermes-kanban-v1-spec.pdf` か[かんばんの利用案内](/hermes/docs/user-guide/features/kanban/)をご覧ください。

## `hermes egress` {#hermes-egress}

リモートのターミナルサンドボックス向けに、外向き通信へ資格情報を差し込むファイアウォールです。[iron-proxy](https://github.com/ironsh/iron-proxy) のデーモンを包んで使います。これは TLS を仲介するプロキシで、ネットワークの境目で中身の分からないプロキシ用トークンを本物の上流 API の資格情報と入れ替えるため、サンドボックス側が本物のキーを持つことがありません。既定では無効です。設定と構成については[Egress プロキシ](/hermes/docs/user-guide/egress/iron-proxy/)のページをご覧ください。

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

### 診断の近道 {#diagnostic-shortcuts}

```bash
hermes egress status                     # current state in one view
cat ~/.hermes/proxy/proxy.yaml           # the rendered iron-proxy config
tail -20 ~/.hermes/proxy/iron-proxy.log  # daemon-level diagnostics
tail -f ~/.hermes/proxy/iron-proxy.log | jq  # daemon + per-request log (line-delimited JSON; v0.39 combines both streams)
```

よくある不具合の出方と立て直し方は [Egress プロキシ → 困ったときは](/hermes/docs/user-guide/egress/iron-proxy/#troubleshooting)で扱っています。

## `hermes project` {#hermes-project}

```bash
hermes project <create|list|show|add-folder|remove-folder|rename|set-primary|use|archive|restore|bind-board>
```

プロジェクトは、人が名前を付けた作業スペースで、複数のフォルダやリポジトリにまたがることができます。デスクトップのセッションのまとまりの基準になり、かんばんボードと結び付けるとタスクに worktree とブランチの決まった命名規則を与えます。状態はプロファイルごとに保持されます。

| サブコマンド | 説明 |
|------------|-------------|
| `create` | 新しいプロジェクトを作ります。 |
| `list`（別名 `ls`） | プロジェクトを一覧にします。 |
| `show` | プロジェクトの詳細を表示します。 |
| `add-folder` | プロジェクトにフォルダやリポジトリを追加します。 |
| `remove-folder` | プロジェクトからフォルダを外します。 |
| `rename` | プロジェクトの名前を変えます。 |
| `set-primary` | 主となるフォルダを設定します。 |
| `use` | 現在のプロジェクトを設定します。 |
| `archive` | プロジェクトを保管します（元に戻せます）。 |
| `restore` | 保管したプロジェクトを元に戻します。 |
| `bind-board` | かんばんボードをこのプロジェクトに結び付けます。 |

## `hermes webhook` {#hermes-webhook}

```bash
hermes webhook <subscribe|list|remove|test>
```

出来事をきっかけにエージェントを動かすための、動的な Webhook 購読を管理します。設定で webhook プラットフォームを有効にしておく必要があります。設定されていない場合は、設定手順が表示されます。

| サブコマンド | 説明 |
|------------|-------------|
| `subscribe` / `add` | Webhook の経路を作ります。サービス側に設定するための URL と HMAC のシークレットが返ります。 |
| `list` / `ls` | エージェントが作った購読をすべて表示します。 |
| `remove` / `rm` | 動的な購読を削除します。config.yaml に書かれた固定の経路には影響しません。 |
| `test` | 購読が働いているかを確かめるために、テスト用の POST を送ります。 |

### `hermes webhook subscribe` {#hermes-webhook-subscribe}

```bash
hermes webhook subscribe <name> [options]
```

| オプション | 説明 |
|--------|-------------|
| `--prompt` | `{dot.notation}` でペイロードを参照できるプロンプトのひな形です。 |
| `--events` | 受け付ける出来事の種類をカンマ区切りで指定します（例: `issues,pull_request`）。空にするとすべてを受け付けます。 |
| `--description` | 人が読むための説明です。 |
| `--skills` | エージェントの実行時に読み込むスキル名をカンマ区切りで指定します。 |
| `--deliver` | 届け先です: `log`（既定）、`telegram`、`discord`、`slack`、`github_comment`。 |
| `--deliver-chat-id` | プラットフォームをまたいで届けるときの、チャットやチャンネルの ID です。 |
| `--secret` | 独自の HMAC シークレットです。省くと自動生成されます。 |
| `--deliver-only` | エージェントを動かさず、`--prompt` を展開した内容をそのままメッセージとして届けます。LLM の費用はかからず、1 秒足らずで届きます。`--deliver` に実際の届け先（`log` 以外）を指定する必要があります。 |
| `--script` | `~/.hermes/scripts/` にある、絞り込みや変換のためのスクリプトです。Webhook のペイロードは JSON として標準入力に渡され、標準出力に出した JSON がペイロードを置き換えます。標準出力が空、`[SILENT]`、または終了コードが非ゼロのときは、その Webhook を無視します。[スクリプトによる絞り込みと変換](/hermes/docs/user-guide/messaging/webhooks/#script-filters-and-transforms)をご覧ください。 |

購読の内容は `~/.hermes/webhook_subscriptions.json` に保存され、ゲートウェイを再起動しなくても webhook のアダプタが読み直します。

## `hermes doctor` {#hermes-doctor}

```bash
hermes doctor [--fix]
```

| オプション | 説明 |
|--------|-------------|
| `--fix` | 直せるところは自動で直そうとします。 |

## `hermes dump` {#hermes-dump}

```bash
hermes dump [--show-keys]
```

Hermes の環境全体を、短いプレーンテキストの要約として出力します。サポートを求めるときに Discord、GitHub の issue、Telegram へそのまま貼り付けられるように作られています。ANSI の色付けも特別な装飾もなく、データだけが並びます。

| オプション | 説明 |
|--------|-------------|
| `--show-keys` | `set`／`not set` だけでなく、伏せ字にした API キーの一部（先頭と末尾の 4 文字）を表示します。 |

### 含まれるもの {#what-it-includes}

| 区分 | 内容 |
|---------|---------|
| **ヘッダー** | Hermes のバージョン、公開日、git のコミットハッシュ |
| **環境** | OS、Python のバージョン、OpenAI SDK のバージョン |
| **識別情報** | 現在のプロファイル名、HERMES_HOME のパス |
| **モデル** | 設定されている既定のモデルとプロバイダ |
| **ターミナル** | バックエンドの種類（local、docker、ssh など） |
| **API キー** | プロバイダとツールの 22 個の API キーについて、設定の有無 |
| **機能** | 有効なツールセット、MCP サーバーの数、メモリのプロバイダ |
| **サービス** | ゲートウェイの状態、設定済みのメッセージングプラットフォーム |
| **作業量** | cron ジョブの数、インストール済みのスキル数 |
| **設定の上書き** | 既定値と異なる設定値 |

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

- GitHub にバグを報告するとき — 出力を issue に貼り付けます
- Discord で助けを求めるとき — コードブロックに入れて共有します
- 自分の環境を誰かの環境と見比べるとき
- うまく動かないときの手早い確認

:::tip
`hermes dump` は共有するために作られたものです。対話的に調べたいときは `hermes doctor`、見た目で全体をつかみたいときは `hermes status` を使ってください。
:::

## `hermes debug` {#hermes-debug}

```bash
hermes debug share [options]
```

デバッグ用のレポート（システム情報と直近のログ）をペーストサービスへアップロードし、共有できる URL を受け取ります。手早くサポートを求めたいときに便利で、助けてくれる人が問題を切り分けるのに必要なものがひととおり入っています。

| オプション | 説明 |
|--------|-------------|
| `--lines <N>` | ログファイルごとに含める行数です（既定は 200）。 |
| `--expire <days>` | ペーストの有効日数です（既定は 7）。 |
| `--nous` | 公開のペーストサービスではなく、Nous 社内の診断用ストレージへアップロードします。Nous のサポートから非公開の診断一式を求められたときに使ってください。 |
| `--local` | アップロードせずに、レポートを手元に出力します。 |
| `--no-redact` | アップロード時のシークレットの伏せ字化を無効にします。既定ではアップロード内容は伏せ字になります。 |

レポートにはシステム情報（OS、Python のバージョン、Hermes のバージョン）、直近のエージェント・ゲートウェイ・GUI／ダッシュボード・デスクトップのログ（ファイルごとに 512 KB まで）、そして伏せ字化した API キーの状態が含まれます。既定ではアップロード時に伏せ字化されるので、シークレットは含まれません。

既定のアップロードでは、公開のペーストサービスを paste.rs、dpaste.com の順に試します。`--nous` を付けると、同じデバッグ一式を Nous の非公開の診断用ストレージへアップロードします。返される閲覧用のリンクは Nous のチーム向けで、14 日後に自動で消えます。

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

Hermes の設定、スキル、セッション、データを zip 書庫にまとめます。hermes-agent のコード本体は含みません。また、以前のバックアップの成果物（`backups/`、`state-snapshots/`）を入れ子にすることもありません。どちらにもすでに `state.db` の写しが入っているためです。

| オプション | 説明 |
|--------|-------------|
| `-o`, `--output <path>` | zip ファイルの出力先です（既定は `~/hermes-backup-<timestamp>.zip`）。 |
| `-q`, `--quick` | 手早いスナップショットです。要となる状態ファイル（config.yaml、state.db、.env、認証情報、cron ジョブ）だけを保存します。すべてを取るより大幅に速く終わります。 |
| `-l`, `--label <name>` | スナップショットに付ける名札です（`--quick` と一緒に使うときだけ効きます）。 |

バックアップは SQLite の `backup()` API を使って安全に複製するので、Hermes が動いている最中でも正しく動きます（WAL モードでも安全です）。

**zip に含まれないもの:**

- `*.db-wal`、`*.db-shm`、`*.db-journal` — SQLite の WAL・共有メモリ・ジャーナルの付属ファイルです。`*.db` は `sqlite3.backup()` によって一貫したスナップショットが取られており、そこに動作中の付属ファイルを一緒に入れると、復元したときに中途半端な状態が見えてしまいます。
- `checkpoints/` — セッションごとの経路のキャッシュです。ハッシュを鍵にしてセッションごとに作り直されるもので、別のインストール先へ持っていっても正しく働きません。
- `hermes-agent` のコード本体（これはユーザーのデータのバックアップであって、リポジトリのスナップショットではありません）。

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

`~/.hermes/checkpoints/` にある影の git 保管場所 — セッション中の `/rollback` コマンドを支える保存層 — を確認・管理します。いつ実行しても安全で、エージェントが動いている必要はありません。

| サブコマンド | 説明 |
|------------|-------------|
| `status`（既定） | 全体の容量、プロジェクト数、プロジェクトごとの内訳を表示します。`hermes checkpoints` だけを実行したときと同じです。 |
| `list` | `status` の別名です。 |
| `prune` | 片付けを強制的に一巡させます。行き場のないプロジェクトや古いプロジェクトを削除し、保管場所を整理し、容量の上限を守らせます。24 時間の重複実行防止の目印は無視します。 |
| `clear` | チェックポイントの土台をまるごと削除します。元に戻せません。`-f` がなければ確認を求めます。 |
| `clear-legacy` | v1 から v2 への移行で作られた `legacy-<timestamp>/` の書庫だけを削除します。 |

### オプション {#options}

| オプション | サブコマンド | 説明 |
|--------|------------|-------------|
| `--limit N` | `status`, `list` | 一覧に出すプロジェクトの上限です（既定は 20）。 |
| `--retention-days N` | `prune` | `last_touch` が N 日より前のプロジェクトを削除します（既定は 7）。 |
| `--max-size-mb N` | `prune` | 行き場のないものと古いものを片付けたあと、保管場所全体が N MB 以下になるまで、プロジェクトごとに最も古いコミットから削っていきます（既定は 500）。 |
| `--keep-orphans` | `prune` | 作業ディレクトリがすでに存在しないプロジェクトを削除しません。 |
| `-f`, `--force` | `clear`, `clear-legacy` | 確認のプロンプトを省きます。 |

### 例 {#examples}

```bash
hermes checkpoints                                  # status overview
hermes checkpoints prune --retention-days 3         # aggressive cleanup
hermes checkpoints prune --max-size-mb 200          # tighten size cap once
hermes checkpoints clear-legacy -f                  # drop v1 archive dirs
hermes checkpoints clear -f                         # wipe everything
```

構成の全体像とセッション中のコマンドについては、[チェックポイントと `/rollback`](/hermes/docs/user-guide/checkpoints-and-rollback/)をご覧ください。

## `hermes import` {#hermes-import}

```bash
hermes import <zipfile> [options]
```

以前に作った Hermes のバックアップを、Hermes のホームディレクトリへ復元します。書庫に入っているファイルは、ホームにある同名のファイルをすべて上書きします。`--force` は、復元先にすでに Hermes がインストールされているときに出る確認のプロンプトを省くだけです。

| オプション | 説明 |
|--------|-------------|
| `-f`, `--force` | 既存のインストールについての確認プロンプトを省きます。 |

:::warning
動作中のプロセスとぶつからないように、取り込む前にゲートウェイを止めてください。
:::

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
| `agent`（既定） | `agent.log` | エージェントの動きすべて — API の呼び出し、ツールの振り分け、セッションの一生（INFO 以上） |
| `errors` | `errors.log` | 警告とエラーだけ — agent.log を絞り込んだもの |
| `gateway` | `gateway.log` | メッセージングゲートウェイの動き — プラットフォームへの接続、メッセージの振り分け、Webhook の出来事 |
| `gui` | `gui.log` | ダッシュボード／TUI ゲートウェイ／PTY ブリッジ／WebSocket の出来事 |
| `desktop` | `desktop.log` | Electron のデスクトップアプリ — 起動、バックエンド立ち上げの出力、直近の Python のトレースバック |

### オプション {#options}

| オプション | 説明 |
|--------|-------------|
| `log_name` | 見たいログを指定します: `agent`（既定）、`errors`、`gateway`、または `list` で利用できるファイルを容量と一緒に表示します。 |
| `-n`, `--lines <N>` | 表示する行数です（既定は 50）。 |
| `-f`, `--follow` | `tail -f` のように、ログを実時間で追い続けます。止めるには Ctrl+C を押します。 |
| `--level <LEVEL>` | 表示するログの下限のレベルです: `DEBUG`、`INFO`、`WARNING`、`ERROR`、`CRITICAL`。 |
| `--session <ID>` | セッション ID の一部を含む行だけを表示します。 |
| `--since <TIME>` | いまからさかのぼった時間の分だけ表示します: `30m`、`1h`、`2d` など。`s`（秒）、`m`（分）、`h`（時）、`d`（日）が使えます。 |
| `--component <NAME>` | 部品で絞り込みます: `gateway`、`agent`、`tools`、`cli`、`cron`。 |

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

絞り込みは組み合わせられます。複数の条件が効いているときは、**すべて**を満たした行だけが表示されます。

```bash
# WARNING+ lines from the last 2 hours containing session "tg-12345"
hermes logs --level WARNING --since 2h --session tg-12345
```

`--since` が効いているとき、時刻として読み取れない行も表示されます（複数行にわたるログの続きの行かもしれないためです）。`--level` が効いているとき、レベルを判別できない行も表示されます。

### ログの入れ替え {#log-rotation}

Hermes は Python の `RotatingFileHandler` を使います。古いログは自動で入れ替えられるので、`agent.log.1`、`agent.log.2` などを探してください。`hermes logs list` は、入れ替え済みのものも含めてすべてのログファイルを表示します。

## `hermes prompt-size` {#hermes-prompt-size}

```bash
hermes prompt-size [--platform <name>] [--json]
```

新しいセッションで固定的に消費されるプロンプトの量 — 会話の中身が入る*前*に、API 呼び出しのたびに送られる分 — を報告します。下流のアダプタやプロキシが、モデルのコンテキスト長より厳しいプロンプトの上限を持っている場合や、どの塊（スキルの索引、メモリ、プロファイル）が大部分を占めているかを見たいときに便利です。

エージェントが組み立てるのと同じシステムプロンプトを作り、その内訳を出します。

- **システムプロンプト全体** — 組み上がったプロンプトのすべて（人格、指針、スキルの索引、コンテキストファイル、メモリ、プロファイル、時刻）。
- **スキルの索引** — `<available_skills>` の塊です。スキルをたくさん入れていると、ここが単独で最大になりがちです。
- **メモリ**と**ユーザープロファイル** — `MEMORY.md` / `USER.md` の写しです。
- **プロンプトの層** — stable / context / volatile の 3 層で、Hermes がキャッシュを効かせるためにプロンプトを重ねている構造と対応します。
- **ツールのスキーマ** — 有効なすべてのツールの JSON です（呼び出しごとに固定で送られるもう半分にあたります）。

すべてオフラインで動きます。API を呼ばないので、資格情報を何も設定していなくても使えます。

```bash
# Human-readable breakdown for the CLI platform (default)
hermes prompt-size

# Simulate a messaging platform's prompt (different platform hint)
hermes prompt-size --platform telegram

# Machine-readable output for scripts
hermes prompt-size --json
```

:::tip
スキルの索引とツールのスキーマは、有効にしているスキルとツールの数に応じて増えます。プロンプトを小さくするには、使っていないツールセットを無効にする（`hermes tools`）か、要らないスキルを削除してください（`hermes skills`）。現在のディレクトリにあるコンテキストファイル（AGENTS.md、.cursorrules）も全体の量に加算されます。
:::

## `hermes config` {#hermes-config}

```bash
hermes config <subcommand>
```

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `show` | 現在の設定値を表示します。 |
| `edit` | エディタで `config.yaml` を開きます。 |
| `get <key> [--json]` | ドットで区切ったキーを指定して、設定値をひとつ出力します（例: `hermes config get model.default`）。`--json` を付けると機械が読める形式で出ます。 |
| `set <key> <value>` | 設定値を書き換えます。 |
| `unset <key>` | 設定のキーを削除し、組み込みの既定値に戻します。 |
| `path` | 設定ファイルのパスを出力します。 |
| `env-path` | `.env` ファイルのパスを出力します。 |
| `check` | 抜けている設定や古くなった設定がないか調べます。 |
| `migrate` | 新しく追加された項目を対話的に足します。 |

## `hermes pairing` {#hermes-pairing}

```bash
hermes pairing <list|approve|revoke|clear-pending>
```

| サブコマンド | 説明 |
|------------|-------------|
| `list` | 承認待ちのユーザーと承認済みのユーザーを表示します。 |
| `approve <platform> <code>` | ペアリングコードを承認します。 |
| `revoke <platform> <user-id>` | ユーザーの利用を取り消します。 |
| `clear-pending` | 承認待ちのペアリングコードを消します。 |

## `hermes skills` {#hermes-skills}

```bash
hermes skills <subcommand>
```

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `browse` | スキルの登録簿をページ送りで眺めます。 |
| `search` | スキルの登録簿を検索します。 |
| `install` | スキルをインストールします。 |
| `inspect` | インストールせずにスキルの中身を確認します。 |
| `list` | インストール済みのスキルを一覧にします。 |
| `check` | インストール済みのハブ由来のスキルに、上流の更新がないか調べます。 |
| `update` | 上流に変更があるハブ由来のスキルを入れ直します。 |
| `audit` | インストール済みのハブ由来のスキルを調べ直します。 |
| `uninstall` | ハブからインストールしたスキルを削除します。 |
| `reset` | `user_modified` の印が付いて固まってしまった同梱スキルについて、マニフェストの項目を消して元に戻します。`--restore` を付けると、ユーザーの複製を同梱版で置き換えます。 |
| `opt-out` | 同梱スキルが現在のプロファイルに配られないようにします。`.no-bundled-skills` という目印を書き込むので、インストーラも `hermes update` も同期処理も同梱スキルの配布を飛ばします。既定では安全で、ディスク上のものには何も触れません。`--remove` を付けると、すでにある同梱スキルのうち**手を加えていないもの**も削除します（ユーザーが編集したもの、ハブからインストールしたもの、手書きのスキルは決して削除されません。先に内容を示して確認を求めます。`--yes` で確認を省けます）。 |
| `opt-in` | `.no-bundled-skills` の目印を消して `opt-out` を取り消し、次の `hermes update` で同梱スキルが再び配られるようにします。`--sync` を付けるとその場で配り直します。 |
| `publish` | スキルを登録簿へ公開します。 |
| `snapshot` | スキルの設定を書き出し・取り込みします。 |
| `tap` | 独自のスキル供給元を管理します。 |
| `config` | プラットフォームごとにスキルの有効・無効を対話的に設定します。 |

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
- `--force` を付けると、他社製やコミュニティのスキルに対する、危険度の低い方針上の制止を越えられます。
- `--force` を付けても、`dangerous` という検査結果は越えられません。
- `--source skills-sh` は公開されている `skills.sh` のディレクトリを検索します。
- `--source well-known` を使うと、`/.well-known/skills/index.json` を公開しているサイトを Hermes に見に行かせられます。
- `--source browse-sh` は [browse.sh](https://browse.sh) の目録を検索します。サイトごとのブラウザ自動操作のスキルが 200 以上あります。識別子は `browse-sh/airbnb.com/search-listings-ddgioa` のような形です。
- `http(s)://…/*.md` の URL を渡すと、`SKILL.md` に加えて、`references/`、`templates/`、`scripts/`、`assets/`、`examples/` の下で明示的に参照されているファイルもインストールされます。フロントマターに `name:` がなく、URL の末尾も識別子として使えない場合、対話的な端末では名前の入力を求められます。対話できない場面（TUI 内の `/skills install` やゲートウェイのプラットフォーム）では、代わりに `--name <x>` が必要です。

## `hermes bundles` {#hermes-bundles}

```bash
hermes bundles <subcommand>
```

スキルバンドルは、複数のスキルをひとつの `/<bundle-name>` スラッシュコマンドにまとめるものです。バンドルを呼ぶと、参照しているスキルがすべてひとつのユーザーメッセージにまとめて読み込まれます。保存場所は `~/.hermes/skill-bundles/<slug>.yaml` です。YAML の書式と振る舞いは[スキルバンドル](/hermes/docs/user-guide/features/skills/#skill-bundles)をご覧ください。

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `list` | インストール済みのバンドルを一覧にします（サブコマンドを付けなかったときの既定） |
| `show <name>` | バンドルひとつについて、名前、説明、スキル、ファイルのパスを表示します |
| `create <name>` | 新しいバンドルを作ります。`--skill <id>` を繰り返して指定するか、省略して対話的に入力します。`--description`、`--instruction`、`--force` も使えます。 |
| `delete <name>` | バンドルのファイルを削除します |
| `reload` | `~/.hermes/skill-bundles/` を調べ直し、増えたバンドルと消えたバンドルを報告します |

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

チャットのセッションでは、`/bundles` でインストール済みのバンドルが一覧され、`/<bundle-name>` でひとつを読み込めます。

## `hermes curator` {#hermes-curator}

```bash
hermes curator <subcommand>
```

curator は補助モデルによる裏方の仕事で、エージェントが作ったスキルを定期的に見直し、古びたものを整理し、重なっているものをまとめ、使わなくなったスキルを保管します。同梱スキルとハブからインストールしたスキルには決して触れません。保管したものは元に戻せますし、自動で削除されることはありません。

| サブコマンド | 説明 |
|------------|-------------|
| `status` | curator の状態とスキルの統計を表示します |
| `run` | いますぐ見直しを実行します（LLM の処理が終わるまで待ちます） |
| `run --background` | LLM の処理を裏のスレッドで始め、すぐに戻ります |
| `run --dry-run` | 確認のみ — 変更を加えずに見直しのレポートだけを作ります |
| `backup` | `~/.hermes/skills/` の tar.gz のスナップショットを手動で取ります（curator も実際に動かす前には毎回自動でスナップショットを取ります） |
| `rollback` | スナップショットから `~/.hermes/skills/` を復元します（既定はいちばん新しいもの） |
| `rollback --list` | 使えるスナップショットを一覧にします |
| `rollback --id <ts>` | id を指定してスナップショットを復元します |
| `rollback -y` | 確認のプロンプトを省きます |
| `pause` | 再開するまで curator を止めます |
| `resume` | 止まっている curator を再開します |
| `pin <skill>` | スキルを固定して、curator が自動で状態を移さないようにします |
| `unpin <skill>` | スキルの固定を外します |
| `restore <skill>` | 保管したスキルを元に戻します |
| `archive <skill>` | スキルを手動で保管します |
| `prune` | 通常なら curator が片付けるスキルを、手動で片付けます |
| `list-archived` | 保管したスキルを一覧にします（`restore` で元に戻せます） |

インストール直後は、最初の定期実行が `interval_hours` ひとつ分（既定では 7 日）先送りされます。`hermes update` のあとの最初の刻みで、ゲートウェイがいきなり手入れを始めることはありません。その前に様子を見たいときは `hermes curator run --dry-run` を使ってください。

振る舞いと設定については [Curator](/hermes/docs/user-guide/features/curator/) をご覧ください。

## `hermes moa` {#hermes-moa}

名前付きの Mixture of Agents プリセットを設定します。プリセットは、どのモデル選択画面でも `Mixture of Agents` というプロバイダの下に選べるモデルとして現れます。`/moa <prompt>` は、既定のプリセットでプロンプトを 1 回流します。

```bash
hermes moa list
hermes moa configure [name]
hermes moa delete <name>
```

`hermes moa configure` は、参照する各モデルと集約役のモデルを選ぶのに、Hermes のプロバイダ → モデルの選択画面をそのまま使います。プリセットは実行のしかたの設定であって、主となるモデルやプロバイダではありません。

## `hermes fallback` {#hermes-fallback}

```bash
hermes fallback <subcommand>
```

フォールバックのプロバイダの連なりを管理します。主モデルがレート制限、過負荷、接続のエラーで失敗したとき、フォールバックのプロバイダが順に試されます。

| サブコマンド | 説明 |
|------------|-------------|
| `list`（別名: `ls`） | 現在のフォールバックの連なりを表示します（サブコマンドを付けなかったときの既定） |
| `add` | プロバイダとモデルを選び（`hermes model` と同じ選択画面です）、連なりの末尾に足します |
| `remove`（別名: `rm`） | 連なりから消す項目を選びます |
| `clear` | フォールバックの項目をすべて削除します |

[フォールバックのプロバイダ](/hermes/docs/user-guide/features/fallback-providers/)をご覧ください。

## `hermes hooks` {#hermes-hooks}

```bash
hermes hooks <subcommand>
```

`~/.hermes/config.yaml` に宣言されたシェルスクリプトのフックを確認し、作り物のペイロードで試し、`~/.hermes/shell-hooks-allowlist.json` にある初回利用の同意リストを管理します。

| サブコマンド | 説明 |
|------------|-------------|
| `list`（別名: `ls`） | 設定済みのフックを、対象条件・制限時間・同意の状態と一緒に一覧にします |
| `test <event>` | `<event>` に一致するフックを、作り物のペイロードですべて実行します |
| `revoke`（別名: `remove`、`rm`） | あるコマンドの同意リストの項目を削除します（次回の再起動から効きます） |
| `doctor` | 設定済みのフックそれぞれについて、実行ビット、同意リスト、更新時刻のずれ、JSON の妥当性、作り物のペイロードでの実行時間を調べます |

出来事の形とペイロードの構造については[フック](/hermes/docs/user-guide/features/hooks/)をご覧ください。

## `hermes memory` {#hermes-memory}

```bash
hermes memory <subcommand>
```

外部のメモリプロバイダのプラグインを設定・管理します。使えるプロバイダは honcho、openviking、mem0、hindsight、holographic、retaindb、byterover、supermemory です。外部のプロバイダは同時にひとつだけ有効にできます。組み込みのメモリ（MEMORY.md / USER.md）は常に有効です。

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `setup` | プロバイダを対話的に選んで設定します。 |
| `status` | 現在のメモリプロバイダの設定を表示します。 |
| `off` | 外部のプロバイダを無効にします（組み込みのみになります）。 |

:::info プロバイダ固有のサブコマンド
外部のメモリプロバイダが有効なとき、そのプロバイダ固有の管理のために `hermes <provider>` というトップレベルのコマンドが登録されることがあります（Honcho が有効なときの `hermes honcho` など）。有効でないプロバイダのサブコマンドは現れません。いま何が組み込まれているかは `hermes --help` で確認してください。
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

先に対応部分をインストールしてください。

```bash
cd ~/.hermes/hermes-agent && uv pip install -e '.[acp]'
```

[ACP によるエディタ連携](/hermes/docs/user-guide/features/acp/)と [ACP の内部構造](/hermes/docs/developer-guide/acp-internals/)をご覧ください。

## `hermes mcp` {#hermes-mcp}

```bash
hermes mcp <subcommand>
```

MCP（Model Context Protocol）サーバーの設定を管理し、Hermes を MCP サーバーとして実行します。

| サブコマンド | 説明 |
|------------|-------------|
| *(なし)* または `picker` | 対話的な目録の選択画面です。Nous が確認済みの MCP を眺め、インストール・有効化・無効化ができます。 |
| `catalog` | Nous が確認済みの MCP を一覧にします（プレーンテキストで、スクリプトから扱えます）。 |
| `install <name>` | 目録の項目をインストールします（例: `hermes mcp install n8n`）。 |
| `serve [-v\|--verbose]` | Hermes を MCP サーバーとして実行し、会話を他のエージェントへ公開します。 |
| `add <name> [--url URL] [--command CMD] [--auth oauth\|header] [--args ...]` | 独自の MCP サーバーを追加し、ツールを自動で見つけさせます。`--args` は残りの引数を標準入出力のコマンドへそのまま渡すので、最後に置いてください。 |
| `remove <name>`（別名: `rm`） | MCP サーバーを設定から削除します。 |
| `list`（別名: `ls`） | 設定済みの MCP サーバーを一覧にします。 |
| `test <name>` | MCP サーバーへの接続を試します。 |
| `configure <name>`（別名: `config`） | サーバーごとに、使うツールの選択を切り替えます。 |
| `login <name>` | OAuth を使う MCP サーバーに対して、認証をやり直させます。 |

[MCP 設定の早見表](/hermes/docs/reference/mcp-config-reference/)、[Hermes で MCP を使う](/hermes/docs/guides/use-mcp-with-hermes/)、[MCP サーバーモード](/hermes/docs/user-guide/features/mcp/#running-hermes-as-an-mcp-server)をご覧ください。

## `hermes plugins` {#hermes-plugins}

```bash
hermes plugins [subcommand]
```

プラグインの管理をひとつにまとめたものです。一般のプラグイン、メモリのプロバイダ、コンテキストエンジンをここで扱えます。サブコマンドなしで `hermes plugins` を実行すると、2 つの区分からなる対話画面が開きます。

- **一般のプラグイン** — インストール済みのプラグインを、チェックボックスで複数選んで有効・無効にします
- **プロバイダのプラグイン** — メモリプロバイダとコンテキストエンジンを、それぞれひとつだけ選んで設定します。区分の上で ENTER を押すと選択画面が開きます。

| サブコマンド | 説明 |
|------------|-------------|
| *(なし)* | 一般のプラグインの切り替えと、プロバイダのプラグインの設定をまとめた対話画面です。 |
| `install <identifier> [--force] [--ref COMMIT_SHA]` | Git の URL、`owner/repo`、または索引上の名前だけを指定してプラグインをインストールします。スラッシュのない名前は、コミュニティのプラグイン索引を通して `owner/repo` と索引で固定されたコミットに解決されます。名前があいまいなときは候補を並べて終了します。`--ref` は 40 文字のコミット SHA だけを受け付け、その不変のリビジョンをそのままインストールし、索引による固定より優先します。 |
| `search [term] [--json] [--capability CAP] [--refresh]` | コミュニティのプラグイン索引を検索します（名前・説明・タグへのあいまい一致。`term` を省くと一覧を眺められます）。索引は `plugins.index_url`（既定は NousResearch のプラグイン索引）から取得し、`~/.hermes/cache/` に 24 時間キャッシュします。オフラインのときは古いキャッシュ、さらに同梱の初期データへと順に戻ります。索引に載っていることは監査を意味しません。掲載はメタデータの確認のみです。 |
| `update <name>` | 固定していないインストール済みプラグインについて、最新の変更を取得します。固定されたプラグインを動かすには `--force --ref <new-commit>` で入れ直す必要があります。 |
| `remove <name>`（別名: `rm`、`uninstall`） | インストール済みのプラグインを削除します。 |
| `enable <name>` | 無効になっているプラグインを有効にします。 |
| `disable <name>` | プラグインを削除せずに無効にします。 |
| `list`（別名: `ls`） | インストール済みのプラグインを、有効・無効の状態と一緒に一覧にします。 |
| `doctor [path-or-id] [--ci]` | ネイティブのプラグインを、本物のマニフェスト解析・読み込み・登録の経路に通して検証します。`--ci` を付けるとエラー時に終了コード 1 になります。 |
| `pack install <path-or-url> [--force]` | プラグインパック（`hermes-pack.yaml`）をインストールします。これは、それぞれが 40 文字のコミット SHA で固定されたプラグインの集まりを宣言したものです。必ず確認画面（すべてのプラグイン、供給元、固定された参照、宣言された権限）を出し、パックの中身について一度だけ確認を求めてから、通常の固定インストールを実行します。各プラグインが宣言する権限は、これまでどおりプラグインごとの同意を通ります。パックがまとめて権限を与えることはありません。一部が失敗した場合はプラグインごとに報告され、ひとつでも失敗すると終了コードは非ゼロになります。対話的な実行専用です（`--yes` はありません）。 |
| `pack export [--enabled-only] [--name NAME]` | 現在のインストール状態からパックの YAML を標準出力に書き出します。git でインストールした各プラグインのリポジトリと正確な SHA に加え、秘密を取り除いた `plugins.entries` の設定が入ります。git の出所がないローカル限定のプラグインは、インストール対象ではなく警告のコメントとして並びます。シークレット、権限の付与、`allow_*` の関門は必ず取り除かれます。 |
| `pack show <path-or-url>` | 実行せずに確認します。パックを読み取り、検証し、内容を表示するだけでインストールはしません。 |

プロバイダのプラグインの選択は `config.yaml` に保存されます。
- `memory.provider` — 有効なメモリプロバイダ（空なら組み込みのみ）
- `context.engine` — 有効なコンテキストエンジン（`"compressor"` が組み込みの既定）

一般のプラグインで無効にしたものの一覧は、`config.yaml` の `plugins.disabled` に保存されます。git でのインストールは、プロファイルごとの `plugins/.install-metadata.json` という付属ファイルに、正規の供給元、実際にインストールしたリビジョン、固定の有無だけを記録します。プラグインの設定、環境の値、シークレット、権限の付与は含まれません。

[プラグイン](/hermes/docs/user-guide/features/plugins/)と [Hermes のプラグインを作る](/hermes/docs/developer-guide/plugins/)をご覧ください。

## `hermes tools` {#hermes-tools}

```bash
hermes tools [--summary]
```

| オプション | 説明 |
|--------|-------------|
| `--summary` | 現在有効なツールの要約を出力して終了します。 |

`--summary` を付けずに実行すると、プラットフォームごとのツール設定を対話的に行う画面が開きます。

## `hermes computer-use` {#hermes-computer-use}

```bash
hermes computer-use <subcommand>
```

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `install` | 上流の cua-driver のインストーラを実行します（macOS、Windows、Linux）。 |
| `install --upgrade` | cua-driver がすでに PATH にあってもインストーラを実行し直します。上流のスクリプトは常に最新の版を取得するので、その場での更新になります。 |
| `status` | `cua-driver` が `$PATH` にあるかどうかと、入っているバージョンを出力します。 |
| `doctor [--include CHECK] [--skip CHECK] [--json]` | cua-driver の健康診断を実行し、プラットフォームごとの検査結果を表示します。 |
| `permissions status [--json]` | macOS のアクセシビリティと画面収録の許可状況を報告します。 |
| `permissions grant` | Cua Driver にアクセシビリティと画面収録を許可するよう macOS に求めます。 |

`hermes computer-use install` は、`computer_use` ツールセットが使う [cua-driver](https://github.com/trycua/cua) の実行ファイルをインストールするための、安定した入口です。Computer Use を初めて有効にしたときに `hermes tools` が呼ぶのと同じ上流のインストーラを実行するので、ツールセットの切り替えでインストールが始まらなかったとき（たとえば、すでに設定済みの環境での実行時）にやり直しても安全です。

cua-driver がすでにある場合、Hermes はそのバージョンと実行環境のマニフェストを確認します。0.20.0 以上で互換性のあるインストールならそのまま残します。古かったり不完全だったりする通常のインストールは、現在の上流のインストーラで直します。`HERMES_CUA_DRIVER_CMD` で指定した独自の実行ファイルを、Hermes が置き換えることは決してありません。その実行ファイルは直接更新するか、上書き指定を外してください。修復が必要なときは `hermes computer-use status` が知らせます。

組み込みの `computer_use` ツールセットが、Hermes での推奨の連携方法です。Cua の低水準なツールの語彙が必要なときは、Cua の MCP ツールをそのまま登録する道もあります。`cua-driver skills install` は Hermes を見つけると、Cua のスキル一式を Hermes のスキルディレクトリへ自動でつなぎます。

権限のモード、権限マニフェストの承認、既存プロファイルへの付与は、実行時の起動に属します。制限付きのモードでは、Hermes が Cua 本来の `--capability-manifest` と `--approve-capability-manifest` のフラグを渡します。MCP の通信路はそれぞれ、自分の実行環境の中に非公開の一生を持つセッションを抱えます。公開されるセッション名は、カーソルとセッションの状態に名前を付けるためのもので、実行環境を所有したり共有したりはしません。

cua-driver が PATH にある場合、`hermes update` は更新の最後に上流のインストーラを自動で実行し直します。そのため、多くの方は `--upgrade` を自分で呼ぶ必要はありません。上流が出した修正を、次の Hermes の更新を待たずにいま取り込みたいときに使ってください。

## `hermes pets` {#hermes-pets}

```bash
hermes pets <list|install|select|show|off|scale|remove|doctor>
```

[Petdex](https://github.com/crafter-station/petdex) は、コーディングエージェント向けのアニメーションするスプライトのペットを集めた公開のギャラリーです。ひとつ入れると、CLI・TUI・デスクトップアプリのどこでも、エージェントの動きに反応するペットが表示されます。

| サブコマンド | 説明 |
|------------|-------------|
| `list` | petdex のギャラリーを眺めます。 |
| `install` | ギャラリーからペットをインストールします。 |
| `select` | 表示するペットを決めます（`display.pet.*` に書き込みます）。 |
| `show` | 選んだペットをターミナルで動かします。 |
| `off` | ペットの表示をやめます。 |
| `scale` | ペットの大きさをどこでも変えます（`display.pet.scale`）。 |
| `remove` | インストール済みのペットを削除します。 |
| `doctor` | ペットの設定と、ターミナルの画像表示への対応を確認します。 |

`/hatch` スラッシュコマンドを使えば、文章で説明してまったく新しいペットを作ることもできます。[ペット](/hermes/docs/user-guide/features/pets/)をご覧ください。

## `hermes sessions` {#hermes-sessions}

```bash
hermes sessions <subcommand>
```

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `list` | 最近のセッションを一覧にします。 |
| `browse` | 検索と再開ができる、対話的なセッションの選択画面です。各行には、セッションの最後のメッセージから導かれた状態の札（`done` / `intr` / `err` / `empty`）とメッセージ数が表示されます。検索の絞り込みが空の状態で、選んだ行の上で `d` を押すと、y/N の確認のあとそのセッションを削除します。絞り込み中は、`d` は検索欄への入力になります。 |
| `export <output> [--session-id ID]` | セッションを JSONL に書き出します。 |
| `delete <session-id>` | セッションをひとつ削除します。 |
| `prune` | 条件に当てはまるセッションを削除します。時間の範囲は `--older-than`/`--newer-than`/`--before`/`--after`（`5h`/`2d` のような長さ、日数だけの数値、ISO 形式の時刻）、属性は `--source`、`--title`、`--model`、`--provider`、`--branch`、`--end-reason`、`--user`、`--chat-id`、`--chat-type`、`--cwd`、数値の範囲は `--min/--max-messages`、`--min/--max-tokens`、`--min/--max-cost`、`--min/--max-tool-calls`、さらに `--include-archived`、`--dry-run`、`--yes` が使えます。既定は 90 日より古いものです。 |
| `archive` | `prune` と同じ条件に当てはまるセッションをまとめて保管します（隠すだけで、削除はしません）。条件を最低ひとつ指定する必要があります。 |
| `stats` | セッションの保管場所についての統計を表示します。 |
| `rename <session-id> <title>` | セッションのタイトルを設定・変更します。 |
| `optimize` | ディスクの空きを取り戻します。FTS5 の索引の断片をまとめ、VACUUM を実行します。セッションのデータは変わらず、何も壊しません。 |
| `optimize-storage` | 全文検索の索引を、外部コンテンツを使う小さな v23 の構造へ移します。大きなデータベースでは `state.db` のかなりの部分を取り戻せます。 |
| `repair` | 壊れた `state.db` のスキーマ（`table messages_fts already exists` など）を直し、隠れてしまったセッションを再び見えるようにします。先にバックアップを取ります。 |
| `repair-routing` | 経路の識別情報を失ったセッションの行に取り残された、ゲートウェイの会話をつなぎ直します（再起動後にチャットが「時間をさかのぼる」現象です）。既定では変更せずに確認だけを行い、`--apply` で実際につなぎ直します（先にゲートウェイを止めてください）。`--max-gap-seconds N` でつながりとみなす時間の幅を調整できます。判断に迷いのない場合だけ直します。[セッション → 取り残されたゲートウェイのセッションを直す](/hermes/docs/user-guide/sessions/#repair-stranded-gateway-sessions)をご覧ください。 |
| `recover` | 壊れた `state.db` を、オフラインで、何も壊さずに別のきれいなデータベースへ救い出します。 |
| `retitle-skills` | `/skill` で始まったセッションのタイトルを、ユーザーが実際に入力した内容をもとに付け直します。`--apply` を付けない限り、変更内容を並べるだけです。 |

## `hermes insights` {#hermes-insights}

```bash
hermes insights [--days N] [--source platform]
```

| オプション | 説明 |
|--------|-------------|
| `--days <n>` | 直近 `n` 日を分析します（既定は 30）。 |
| `--source <platform>` | `cli`、`telegram`、`discord` などの出所で絞り込みます。 |

## `hermes claw` {#hermes-claw}

```bash
hermes claw migrate [options]
```

OpenClaw の環境を Hermes へ移します。`~/.openclaw`（または指定したパス）から読み取り、`~/.hermes` へ書き込みます。古いディレクトリ名（`~/.clawdbot`、`~/.moltbot`）や設定ファイル名（`clawdbot.json`、`moltbot.json`）も自動で見つけます。

| オプション | 説明 |
|--------|-------------|
| `--dry-run` | 何も書き込まずに、何が移されるかを確認します。 |
| `--preset <name>` | 移行のプリセットです: `full`（互換性のある設定すべて）または `user-data`（基盤側の設定を除きます）。どちらのプリセットでもシークレットは取り込まれません。取り込むには `--migrate-secrets` を明示してください。 |
| `--overwrite` | 衝突したときに、既存の Hermes のファイルを上書きします（既定では、計画に衝突があれば適用を拒みます）。 |
| `--migrate-secrets` | API キーも移行に含めます。`--preset full` のときでも必要です。 |
| `--no-backup` | 移行前に `~/.hermes/` の zip スナップショットを取りません（既定では、適用の前に復元用の書庫が `~/.hermes/backups/pre-migration-*.zip` にひとつ書き出され、`hermes import` で戻せます）。 |
| `--source <path>` | OpenClaw のディレクトリを指定します（既定は `~/.openclaw`）。 |
| `--workspace-target <path>` | 作業スペースの指示書（AGENTS.md）の置き先です。 |
| `--skill-conflict <mode>` | スキル名がぶつかったときの扱いです: `skip`（既定）、`overwrite`、`rename`。 |
| `--yes` | 確認のプロンプトを省きます。 |

### 移行されるもの {#what-gets-migrated}

移行は、人格、メモリ、スキル、モデルのプロバイダ、メッセージングのプラットフォーム、エージェントの振る舞い、セッションの方針、MCP サーバー、TTS など 30 を超える区分をカバーします。それぞれの項目は、Hermes の対応するものへ**そのまま取り込まれる**か、手で確認するために**保管される**かのどちらかです。

**そのまま取り込まれるもの:** SOUL.md、MEMORY.md、USER.md、AGENTS.md、スキル（4 つの供給元ディレクトリ）、既定のモデル、独自のプロバイダ、MCP サーバー、メッセージングプラットフォームのトークンと許可リスト（Telegram、Discord、Slack、WhatsApp、Signal、Matrix、Mattermost）、エージェントの既定値（推論の強さ、圧縮、人らしい間、タイムゾーン、サンドボックス）、セッションのリセット方針、承認のルール、TTS の設定、ブラウザの設定、ツールの設定、実行の制限時間、コマンドの許可リスト、ゲートウェイの設定、そして 3 つの供給元から集めた API キー。

**手で確認するために保管されるもの:** cron ジョブ、プラグイン、フックや Webhook、メモリのバックエンド（QMD）、スキル登録簿の設定、UI と識別情報、ログ、複数エージェントの構成、チャンネルの結び付け、IDENTITY.md、TOOLS.md、HEARTBEAT.md、BOOTSTRAP.md。

**API キーの解決**は、3 つの供給元を優先度の順に調べます。設定の値 → `~/.openclaw/.env` → `auth-profiles.json`。トークンの項目はすべて、素の文字列、環境変数のひな形（`${VAR}`）、SecretRef のオブジェクトに対応します。

設定キーの対応表の全体、SecretRef の扱いの詳細、移行後の確認事項については、**[移行の詳しい案内](/hermes/docs/guides/migrate-from-openclaw/)**をご覧ください。

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

**Claude Code**（`~/.claude`）または **OpenAI Codex CLI**（`~/.codex`）の設定を Hermes へ取り込みます。`CLAUDE.md`／`AGENTS.md` の指示をメモリの項目へ、`Bash(...)` の許可・拒否のルールを `command_allowlist`／`approvals.deny` へ、MCP サーバーを `config.yaml` の `mcp_servers` へ、スキルのディレクトリを `~/.hermes/skills/` へ対応付けます。適用の前に必ず内容を示します。API キーや資格情報は取り込まれません。

| オプション | 説明 |
| --- | --- |
| `agent` | `claude-code` または `codex`（既定は自動判別）。 |
| `--source <path>` | 取り込み元のディレクトリを指定します（既定は `~/.claude` または `~/.codex`）。 |
| `--dry-run` | 確認のみ — 何も書き込みません。 |
| `--overwrite` | ぶつかった MCP サーバーやスキルを置き換えます（既定は飛ばします）。 |
| `--yes`, `-y` | 確認のプロンプトを省きます。 |

対応表の全体は**[取り込みの案内](/hermes/docs/user-guide/import-from-other-agents/)**をご覧ください。

## `hermes serve` {#hermes-serve}

```bash
hermes serve [options]
```

Hermes の**バックエンドサーバー**を起動します。これは[デスクトップアプリ](/hermes/docs/user-guide/desktop/)やリモートのクライアントが接続する JSON-RPC / WebSocket のゲートウェイです。`hermes dashboard` が動かすのと同じサーバーですが、**画面を持たず**、ブラウザの UI を開くことはありません。デスクトップアプリは自前の `hermes serve` のバックエンドを立ち上げます。このコマンドは、リモートのホストで画面なしのバックエンドを動かしたいときに直接使ってください。下の `hermes dashboard` と同じ `--host` / `--port` / `--insecure` / `--skip-build` / `--stop` / `--status` のオプションを受け付けます（ループバック以外に割り当てると、同じ認証の関門が働きます）。`[web]` の追加インストールが必要で、組み込みのチャットのソケットは POSIX のホストでさらに `[pty]` を必要とします。

**ポートの取り合い:** 指定したポート（既定は `9119`）を別のプロセスがすでに握っている場合（たとえば二つ目の `hermes serve` やゲートウェイ）、このコマンドは機械が読み取れる目印の行 `BACKEND_PORT_IN_USE port=<port>` を標準出力に出し、握っていそうな相手を名指しする案内を添えたうえで、ありきたりのエラーではなく終了コード **75**（`EX_TEMPFAIL`）で終わります。これにより、スクリプトやデスクトップアプリは「ポートがふさがっている」のか「バックエンドが壊れている」のかを見分けられます。`--port 0` を渡すと、空いている一時的なポートに割り当てます（起動に成功すると、選ばれたポートを `HERMES_BACKEND_READY port=<port>` で知らせます）。

## `hermes dashboard` {#hermes-dashboard}

```bash
hermes dashboard [options]
```

Web ダッシュボードを起動します。設定や API キーの管理、セッションの監視をブラウザから行う画面です。（ブラウザ UI を持たない画面なしのバックエンド — デスクトップアプリが立ち上げるようなもの — が欲しいときは、上の [`hermes serve`](#hermes-serve) を使ってください。）`cd ~/.hermes/hermes-agent && uv pip install -e ".[web]"`（FastAPI と Uvicorn）が必要です。ブラウザに組み込まれたチャットのタブは常に使えますが、そのためには `pty` の追加インストール（`cd ~/.hermes/hermes-agent && uv pip install -e ".[web,pty]"`）と、Linux・macOS・WSL2 のような POSIX の PTY 環境も必要です。詳しい説明は [Web ダッシュボード](/hermes/docs/user-guide/features/web-dashboard/)をご覧ください。

| オプション | 既定値 | 説明 |
|--------|---------|-------------|
| `--port` | `9119` | Web サーバーを動かすポートです |
| `--host` | `127.0.0.1` | 割り当てるアドレスです |
| `--no-open` | — | ブラウザを自動で開きません |
| `--insecure` | 無効 | **非推奨で、何もしません。** かつては、ループバック以外に割り当てたときに認証を省くためのものでした。2026 年 6 月の強化以降、外部に公開して割り当てる場合は*必ず*認証の仕組み（パスワードか OAuth）が必要です。手元だけで使うなら `127.0.0.1` に割り当ててトンネルを張ってください。 |
| `--skip-build` | 無効 | Web の UI をビルドする手順を飛ばし、すでにある `dist` をそのまま配ります。npm が使えない、対話できない場面（Windows のタスクスケジューラ、CI）で便利です。事前に `cd web && npm run build` でビルドしておいてください。 |
| `--isolated` | 無効 | 名前付きのプロファイル（`worker dashboard`）から起動したとき、端末共通のダッシュボードへ回すのではなく、そのプロファイル専用のサーバーを動かします。 |
| `--stop` | — | 動作中の `hermes dashboard` のプロセスを止めて終了します。 |
| `--status` | — | 動作中の `hermes dashboard` のプロセスを一覧にして終了します。 |

### `hermes dashboard register` {#hermes-dashboard-register}

このインストールを、自分の Nous Portal アカウントに自前運用のダッシュボードとして登録します。OAuth のクライアントを作り、`~/.hermes/.env` に `HERMES_DASHBOARD_OAUTH_CLIENT_ID` を書き込み、ログインの関門を有効にする方法を表示します。あらかじめログインしておく必要があります（`hermes setup`）。

| オプション | 説明 |
|--------|-------------|
| `--name` | ダッシュボードに付ける、人が読むための名札です（既定は自動生成）。 |
| `--redirect-uri` | 公開された HTTPS の OAuth リダイレクト URI です（例: `https://hermes.example.com/auth/callback`）。localhost だけで使うなら省いてください。 |
| `--portal-url` | 登録に使う Nous Portal のベース URL を上書きします（既定はログインした Portal）。`HERMES_DASHBOARD_PORTAL_URL` でも設定できます。 |

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

プロファイル — それぞれが独自の設定、セッション、スキル、ホームディレクトリを持つ、独立した複数の Hermes 環境 — を管理します。

| サブコマンド | 説明 |
|------------|-------------|
| `list` | すべてのプロファイルを一覧にします。 |
| `use <name>` | 既定のプロファイルを設定して固定します。 |
| `create <name> [--clone] [--clone-all] [--clone-from <source>] [--no-alias]` | 新しいプロファイルを作ります。`--clone` は現在のプロファイルから設定、`.env`、`SOUL.md`、スキルを複製します。`--clone-all` は状態をすべて複製します。`--clone-from` は複製元のプロファイルを指定し、`--clone-all` と併用しない限り設定の複製を意味します。 |
| `delete <name> [-y]` | プロファイルを削除します。 |
| `show <name>` | プロファイルの詳細（ホームディレクトリ、設定など）を表示します。 |
| `alias <name> [--remove] [--name NAME]` | プロファイルへ手早く入るためのラッパースクリプトを管理します。 |
| `rename <old> <new>` | プロファイルの名前を変えます。 |
| `export <name> [-o FILE]` | プロファイルを `.tar.gz` の書庫に書き出します（手元へのバックアップ）。 |
| `import <archive> [--name NAME]` | `.tar.gz` の書庫からプロファイルを取り込みます（手元での復元）。 |
| `install <source> [--name N] [--alias] [--force] [-y]` | git の URL か手元のディレクトリから、配布されたプロファイルをインストールします。 |
| `update <name> [--force-config] [-y]` | 配布物を取得し直します。ユーザーのデータ（メモリ、セッション、認証情報）は残ります。 |
| `info <name>` | プロファイルの配布マニフェスト（バージョン、必要要件、供給元）を表示します。 |

例:

```bash
hermes profile list
hermes profile create work --clone
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

シェルの補完スクリプトを標準出力に書き出します。その出力をシェルのプロファイルで読み込むと、Hermes のコマンド、サブコマンド、プロファイル名がタブで補完できるようになります。

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

`hermes-agent` の最新のコードを取得し、管理下の venv に依存関係を入れ直したあと、インストール後のフック（MCP サーバー、スキルの同期、補完のインストール）を実行し直します。動作中のインストールに対して実行しても安全です。インストールせずに、手元が `origin/main` より遅れているかどうかだけを見たいときは `--check` を使ってください。

`hermes update` は、設定された更新用のブランチ（既定は `main`）を取得します。手元が別のブランチにある場合、Hermes は取得の前に更新用のブランチへ切り替えることがあります。ブランチでの作業を更新時の自動退避の流れから外しておきたいときは、更新の前にコミットしてください。

| オプション | 説明 |
|--------|-------------|
| `--gateway` | メッセージング側の `/update` コマンドが使う内部向けのモードです。端末の標準入力を読む代わりに、ファイルを介したやり取りでプロンプトと進捗を流します。ゲートウェイを再起動するためのフラグではありません。 |
| `--check` | 取得もインストールも再起動もせずに、更新があるかどうかだけを確認します。 |
| `--plan` | 更新の計画を表示して、何も変えずに終了します。インストールの種類（git／Docker／Nix／apt）、すべてのプロファイルにまたがる動作中の Hermes のサービスとその管理役および動いているコードの版、そしてそれぞれをどう再起動するかがわかります。イメージやパッケージで管理されているインストールでは、代わりに外部で実行すべき正しい更新コマンドを知らせます。読み取りのみです。 |
| `--no-backup` | `updates.pre_update_backup` の設定にかかわらず、この実行では更新前のバックアップ（手早い状態のスナップショットと、すべてを含む zip の両方）を取りません。 |
| `--backup` | この実行では更新前の**すべてを含む**バックアップを必ず取ります。手早い状態のスナップショットに加えて、`HERMES_HOME`（設定、認証情報、セッション、スキル、ペアリングのデータ）まるごとの zip を作ります。既定は `quick` で、軽い状態のスナップショットだけです。恒久的な設定は `config.yaml` の `updates.pre_update_backup: quick | full | off` で決めます。 |
| `--yes`, `-y` | 設定の移行や退避したものの復元といった、対話的なプロンプトにすべて「はい」と答えます。API キーの入力は飛ばされるので、それらは別途 `hermes config migrate` を実行してください。 |

そのほかの振る舞い:

- **ゲートウェイの再起動。** 更新に成功すると、新しいコードを取り込ませるために、Hermes は動作中のすべてのゲートウェイのプロファイルを自動で再起動しようとします。更新を伴わずにゲートウェイだけを再起動したいときは `hermes gateway restart` を使ってください。
- **再起動の段階からの復帰。** 取得したばかりのツリーを読み込む途中で、プロセス内で行う再起動の段階が中断した場合、常駐の仕組みが面倒を見ているゲートウェイのプロファイルは、まっさらな Python のプロセスを通じて再度試されます。systemd（`systemctl --user is-active`）が独立に確かめられた再起動だけが、確認済みとして報告されます。終了コードが 0 だっただけの起動し直しは `relaunch_attempted` として記録され、更新はあくまで安全側に倒して失敗の扱いになります。手動で動かしているゲートウェイや、serve / dashboard の実行環境は、起動し直す権限がないかぎり止められることはありません。理由を添えて飛ばした旨が記録され、実行すべき再起動のコマンドとともに、未完了の更新の報告に残ります。
- **更新の控えと、端末全体の版の確認。** 実行のたびに、機械で読める控えが `~/.hermes/logs/update_receipts/` に書き出されます（更新前の端末全体の計画、実行した手順、飛ばした項目とその理由、再起動の結果が入り、`latest.json` が最新のものを指します）。再起動の段階のあと、更新するものは動作中の各ゲートウェイで動いているコードを更新後の手元のものと突き合わせて確かめ、プロファイルごとの版の一覧を表示します。更新前のコードのままのゲートウェイが残っていると更新は失敗し（終了コード 1）、実行すべき再起動のコマンドをそのまま示します。
- **手元のソースの変更。** git でインストールしている場合、追跡中の変更済みファイルと未追跡のファイルは、ブランチの切り替えや取得の前に自動で退避されます（`git stash push --include-untracked`）。対話的な端末での更新では、退避したものを戻す前に確認します。対話できない更新では既定で戻します。取得に成功したあと、手元のソースの編集を捨ててよい管理下のインストールに限り、`updates.non_interactive_local_changes: discard` を設定してください。退避を戻す際に衝突した場合や取得に失敗した場合は、手で復旧できるよう退避したものはそのまま残ります。
- **npm のロックファイルの揺れ。** 退避やブランチの切り替えの前に、Hermes は npm のインストールやビルドの手順で生じた、追跡中の `package-lock.json` の差分をできる範囲で片付けます。意図してロックファイルを編集した場合は、`hermes update` の前にコミットするか手動で退避してください。
- **ペアリングのデータのスナップショット。** `--backup` が無効なときでも、`hermes update` は `git pull` の前に `~/.hermes/pairing/` と Feishu のコメントのルールについて軽いスナップショットを取ります。編集中だったファイルが取得によって書き換わった場合は、`hermes backup restore --state pre-update` で戻せます。
- **旧 `hermes.service` についての警告。** 改名前の `hermes.service` という systemd のユニット（現在の `hermes-gateway.service` ではないもの）を見つけると、起動と停止を繰り返す不具合を避けられるように、移行のための案内を一度だけ表示します。
- **終了コード。** 成功が `0`、取得・インストール・インストール後の処理でのエラーが `1`、`git pull` を妨げる予期しない作業ツリーの変更が `2` です。

## 保守用のコマンド {#maintenance-commands}

| コマンド | 説明 |
|---------|-------------|
| `hermes --version` | バージョン情報を出力します。 |
| `hermes update` | 最新の変更を取得し、依存関係を入れ直します。 |

| `hermes uninstall [--full] [--gui] [--dry-run] [--yes]` | Hermes を削除します。必要に応じて設定やデータもすべて消せます。`--gui` はデスクトップのチャット GUI だけを削除し、エージェント本体は残します。`--full` は設定とデータも削除します。`--dry-run` は何も変えずに削除対象を表示します。`--yes` は確認を省きます。 |

## 関連ページ {#see-also}

- [スラッシュコマンド一覧](/hermes/docs/reference/slash-commands/)
- [CLI の使い方](/hermes/docs/user-guide/cli/)
- [セッション](/hermes/docs/user-guide/sessions/)
- [スキルの仕組み](/hermes/docs/user-guide/features/skills/)
- [スキンとテーマ](/hermes/docs/user-guide/features/skins/)
