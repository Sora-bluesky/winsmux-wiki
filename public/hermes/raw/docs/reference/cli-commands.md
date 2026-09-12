---
title: "CLI コマンド一覧"
description: "Hermes のターミナルコマンドとコマンド群の公式な早見表"
upstream_path: reference/cli-commands.md
upstream_blob: a76ba93fe3ba70fe4fb3987bba84095d9ef052af
sources:
  - https://hermes-agent.nousresearch.com/docs/reference/cli-commands
---

# CLI コマンド一覧 {#cli-commands-reference}

このページでは、シェルから実行する **ターミナルコマンド** を扱います。

チャットの中で使うスラッシュコマンドについては [スラッシュコマンド一覧](/hermes/docs/reference/slash-commands/) をご覧ください。

## 全体の入口 {#global-entrypoint}

```bash
hermes [global-options] <command> [subcommand/options]
```

### 全体オプション {#global-options}

| オプション | 説明 |
|--------|-------------|
| `--version`, `-V` | バージョンを表示して終了します。 |
| `--profile <name>`, `-p <name>` | この実行で使う Hermes プロファイルを選びます。`hermes profile use` で決めた既定より優先されます。 |
| `--resume <session>`, `-r <session>` | ID かタイトルを指定して以前のセッションを再開します。`latest` と書くといちばん新しいセッションを再開します（ワークスペース単位で、`-c` と同じ探し方をします）。 |
| `--continue [name]`, `-c [name]` | いちばん新しいセッション、またはタイトルが一致するもののうちいちばん新しいセッションを再開します。 |
| `--in <dir>` | 開始・再開の前に `<dir>` へ移動します。`--resume latest` / `-c` の検索範囲をそのディレクトリのワークスペースに絞り、セッションもそこに留めます（記録された作業ディレクトリへ戻す動作をしません）。 |
| `--worktree`, `-w` | 並列エージェント作業のために、独立した git worktree で開始します。 |
| `--yolo` | 危険なコマンドの承認確認を省きます。 |
| `--pass-session-id` | エージェントのシステムプロンプトにセッション ID を含めます。 |
| `--ignore-user-config` | `~/.hermes/config.yaml` を無視して組み込みの既定値に戻します。`.env` の認証情報は引き続き読み込まれます。 |
| `--ignore-rules` | `AGENTS.md`、`SOUL.md`、`.cursorrules`、メモリ、事前読み込みスキルの自動注入をやめます。 |
| `--tui` | 従来の CLI ではなく [TUI](/hermes/docs/user-guide/tui/) を起動します。`HERMES_TUI=1` と同じ意味です。`display.interface` より常に優先されます。 |
| `--cli` | 従来の prompt_toolkit の REPL を強制します。`display.interface: tui` をこの実行だけ上書きしたいときに使います。 |
| `--dev` | `--tui` と併用したとき、ビルド済みバンドルではなく TypeScript のソースを `tsx` で直接実行します（TUI の開発者向け）。 |

## トップレベルのコマンド {#top-level-commands}

| コマンド | 用途 |
|---------|---------|
| `hermes chat` | エージェントと対話的に、または一度きりのやり取りで話します。 |
| `hermes model` | 既定のプロバイダとモデルを対話的に選びます。 |
| `hermes moa` | モデル選択画面から選べる Mixture of Agents のプリセットに名前を付けて設定します。 |
| `hermes fallback` | 主モデルがエラーになったときに試すフォールバックプロバイダを管理します。 |
| `hermes gateway` | メッセージングのゲートウェイサービスを実行・管理します。 |
| `hermes proxy` | OAuth のプロバイダ認証情報を付けてくれる、ローカルの OpenAI 互換プロキシです。[サブスクリプションプロキシ](/hermes/docs/user-guide/features/subscription-proxy/) をご覧ください。 |
| `hermes egress` | リモートのターミナルサンドボックス向けに、認証情報を差し込む送信方向のファイアウォール（iron-proxy）です。既定では無効です。[送信プロキシ](/hermes/docs/user-guide/egress/iron-proxy/) をご覧ください。 |
| `hermes lsp` | Language Server Protocol 連携（write_file / patch のための意味解析による診断）を管理します。 |
| `hermes setup` | 設定の全体または一部を対話的に進めるセットアップウィザードです。 |
| `hermes whatsapp` | WhatsApp ブリッジの設定とペアリングを行います。 |
| `hermes whatsapp-cloud` | Meta 公式の WhatsApp Business Cloud API アダプタを設定します（Business アカウントと公開 webhook が必要）。`hermes whatsapp`（Baileys による個人アカウントのブリッジ）とは別物です。 |
| `hermes slack` | Slack 向けの補助機能です（現在は、全コマンドをネイティブのスラッシュコマンドとして含むアプリマニフェストの生成）。 |
| `hermes auth` | 認証情報の管理 — 追加・一覧・削除・リセット・状態確認・ログアウト。Codex / Nous / Anthropic の OAuth もここで扱います。 |
| `hermes login` / `logout` | **非推奨** — 代わりに `hermes auth` を使ってください。 |
| `hermes send` | 設定済みのメッセージング先（Telegram、Discord、Slack、Signal、SMS など）へ一度きりのメッセージを送ります。シェルスクリプト、cron、CI フック、監視デーモンから使うと便利です。エージェントのループも LLM も動きません。 |
| `hermes peer` | 別の端末にある Hermes ゲートウェイをピアとして登録し、そのエージェントの正規の Bot Chat に DM を送ります（`hermes peer dm <peer>[/<agent>] "…"`）。端末をまたいだボット同士のやり取りを支える経路です。 |
| `hermes secrets` | 外部のシークレット提供元（現在は Bitwarden Secrets Manager）を管理し、`~/.hermes/.env` ではなくプロセス起動時に API キーを取得します。 |
| `hermes migrate` | 廃止されたモデルや非推奨の設定への参照を見つけ、必要なら `config.yaml` を書き換えます（例: `migrate xai`）。 |
| `hermes status` | エージェント、認証、プラットフォームの状態を表示します。 |
| `hermes cron` | cron スケジューラの中身を確認し、手動で進めます。 |
| `hermes kanban` | 複数プロファイルで共同作業するためのボードです（タスク、依存関係、ディスパッチャ）。 |
| `hermes project` | 複数フォルダにまたがる名前付きワークスペース（プロジェクト）を管理します。デスクトップのセッションをまとめる基準になり、かんばんボードと結び付けるとタスクに決まった worktree とブランチの規則を与えます。状態はプロファイルごとに保持されます。 |
| `hermes webhook` | イベント起動のための動的な webhook 登録を管理します。 |
| `hermes hooks` | `config.yaml` に書かれたシェルスクリプトのフックを確認・承認・削除します。 |
| `hermes doctor` | 設定や依存関係の問題を診断します。 |
| `hermes security audit` | venv、プラグインの依存、バージョン固定した MCP サーバーを対象に、必要なときだけサプライチェーン監査（OSV.dev）を実行します。 |
| `hermes approvals` | 承認確認まわりの道具です。承認の履歴から許可リストの案を作ります。 |
| `hermes dump` | サポートやデバッグ用に、そのまま貼り付けられる設定の要約を出します。 |
| `hermes prompt-size` | システムプロンプトとツール定義（スキル索引、メモリ、プロファイル）のバイト内訳を表示します。オフラインで動きます。 |
| `hermes debug` | デバッグ用の道具です。サポート向けにログとシステム情報をアップロードします。 |
| `hermes backup` | Hermes のホームディレクトリを zip ファイルにバックアップします。 |
| `hermes checkpoints` | `~/.hermes/checkpoints/`（`/rollback` が使う影の保管場所）を確認・整理・全消去します。引数なしで実行すると状態の概要が出ます。 |
| `hermes import` | zip ファイルから Hermes のバックアップを復元します。 |
| `hermes logs` | エージェント / ゲートウェイ / エラーのログファイルを表示・追尾・絞り込みします。 |
| `hermes config` | 設定ファイルの表示・編集・移行・問い合わせを行います。 |
| `hermes skin` | 表示スキンの一覧・切り替え・微調整を行います。 |
| `hermes console` | 安全な Hermes コマンドコンソールを開きます。 |
| `hermes pairing` | メッセージングのペアリングコードを承認・失効させます。 |
| `hermes skills` | スキルの閲覧・インストール・公開・監査・設定を行います。 |
| `hermes bundles` | 複数のスキルを 1 つの `/<name>` スラッシュコマンドにまとめます。[スキルバンドル](/hermes/docs/user-guide/features/skills/#skill-bundles) をご覧ください。 |
| `hermes curator` | スキルを裏で手入れする仕組みです — 状態確認、実行、一時停止、固定。[Curator](/hermes/docs/user-guide/features/curator/) をご覧ください。 |
| `hermes journey`（別名 `learning`、`memory-graph`） | 学んだスキルとメモリの移り変わりを時系列で見せます。 |
| `hermes memory` | 外部メモリの提供元を設定します。提供元が有効なとき、そのプラグイン固有のサブコマンド（例: `hermes honcho`）が自動で登録されます。 |
| `hermes acp` | エディタ連携のために Hermes を ACP サーバーとして動かします。 |
| `hermes mcp` | MCP サーバーの設定を管理し、Hermes 自体を MCP サーバーとして動かします。 |
| `hermes plugins` | Hermes Agent のプラグインを管理します（インストール、有効化、無効化、削除）。 |
| `hermes portal` | Nous Portal の状態、サブスクリプションのリンク、Tool Gateway の振り分けを扱います。[Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/) をご覧ください。 |
| `hermes tools` | プラットフォームごとに有効なツールを設定します。 |
| `hermes computer-use` | Computer Use（cua-driver）のバックエンドを導入または確認します（macOS / Windows / Linux）。 |
| `hermes pets` | CLI・TUI・デスクトップアプリに登場する [petdex](/hermes/docs/user-guide/features/pets/) のアニメーションペットを閲覧・導入・選択します。サブコマンド: `list`、`install`、`select`、`show`、`off`、`scale`、`remove`、`doctor`。 |
| `hermes sessions` | セッションの閲覧・書き出し・整理・改名・削除を行います。 |
| `hermes insights` | トークン・費用・活動量の分析を表示します。 |
| `hermes claw` | OpenClaw からの移行を助けます。 |
| `hermes import-agent` | Claude Code（`~/.claude`）または Codex CLI（`~/.codex`）の設定を取り込みます。 |
| `hermes dashboard` | 設定・API キー・セッションを管理する Web ダッシュボードを起動します。 |
| `hermes serve` | Hermes のバックエンドサーバーを起動します（画面なし。デスクトップアプリやリモートのバックエンドを支えます）。 |
| `hermes desktop`（別名 `gui`） | ネイティブの Electron デスクトップアプリをビルドして起動します。 |
| `hermes profile` | プロファイル（互いに独立した複数の Hermes）を管理します。 |
| `hermes completion` | シェル補完スクリプトを出力します（bash / zsh / fish）。 |
| `hermes --version` | バージョン情報を表示します。 |
| `hermes update` | 最新のコードを取得して依存関係を入れ直します。`--check` はインストールせずに内容だけ確認し、`--backup` は取得前に `HERMES_HOME` のスナップショットを取ります。 |
| `hermes uninstall` | Hermes をシステムから削除します。 |

## `hermes chat` {#hermes-chat}

```bash
hermes chat [options]
```

よく使うオプション:

| オプション | 説明 |
|--------|-------------|
| `-q`, `--query "..."` | プロンプトを与えてセッションを始めます。実際の TTY 上では、そのプロンプトは通常の対話セッションの最初の発言として **そのまま** 送られ（スラッシュコマンドや `!` のシェル脱出としては解釈されません）、セッションはそのまま開いたままになります。OS のランチャーやデスクトップ連携に向いています。`--oneshot`、`-Q`、あるいは TTY でない入出力のときは、答えを返して終了します。 |
| `--query-file PATH` | ファイルから問い合わせを読みます（`-` は標準入力）。シェルによる解釈が一切ないので、引用符や `$(...)`、バッククォートがそのまま届きます。プログラムから渡す本文や、信頼できない本文にはこちらを使ってください（Bot Mode の同僚 DM がこれを使っています）。`-q` とは同時に使えません。 |
| `--oneshot` | `-q` / `--query-file` と併用したとき、対話セッションを始めるのではなく、答えを返して終了します（0.21 より前の 1 問 1 答の動作）。TTY でない入出力と `-Q` では自動的にこの動きになります。 |
| `-m`, `--model <model>` | この実行だけモデルを変更します。 |
| `-t`, `--toolsets <csv>` | ツールセットをカンマ区切りで有効にします。 |
| `--provider <provider>` | プロバイダを指定します: `auto`, `openrouter`, `nous`, `openai-codex`, `copilot-acp`, `copilot`, `anthropic`, `gemini`, `huggingface`, `novita`（別名 `novita-ai`、`novitaai`）, `openai-api`, `zai`, `kimi-coding`, `kimi-coding-cn`, `minimax`, `minimax-cn`, `minimax-oauth`, `kilocode`, `xiaomi`, `arcee`, `gmi`, `upstage`（別名 `solar`）, `alibaba`, `alibaba-cn`, `alibaba-coding-plan`（別名 `alibaba_coding`）, `alibaba-coding-plan-cn`, `alibaba-token-plan`, `alibaba-token-plan-cn`, `deepseek`, `nvidia`, `ollama-cloud`, `xai`（別名 `grok`）, `xai-oauth`（別名 `grok-oauth`）, `qwen-oauth`, `bedrock`, `opencode-zen`, `opencode-go`, `opencode-free`（別名 `free`、`opencode_free`。キー不要）, `commandcode`, `commandcode-anthropic`, `ai-gateway`, `azure-foundry`, `lmstudio`, `stepfun`, `tencent-tokenhub`（別名 `tencent`、`tokenhub`）, `router`（別名 `ramp-router`、`ramp`）, `nebius-token-factory`（別名 `nebius`、`nebius-tf`、`tokenfactory`）, `tencent-tokenplan`（別名 `tokenplan`、`tencent-lkeap`）。 |
| `-s`, `--skills <name>` | セッションで使うスキルを前もって読み込みます（繰り返し指定、またはカンマ区切りが使えます）。 |
| `-v`, `--verbose` | 詳しい出力を出します。 |
| `-Q`, `--quiet` | プログラム向けの動作です。バナー・回転表示・ツールの下見表示を出しません。 |
| `--image <path>` | 1 回の問い合わせにローカルの画像を添えます。 |
| `--resume <session>` / `--continue [name]` | `chat` から直接セッションを再開します。 |
| `--worktree` | この実行のために独立した git worktree を作ります。 |
| `--checkpoints` | ファイルを壊す変更の前に、ファイルシステムのチェックポイントを作ります。 |
| `--yolo` | 承認確認を省きます。 |
| `--pass-session-id` | セッション ID をシステムプロンプトに渡します。 |
| `--ignore-user-config` | `~/.hermes/config.yaml` を無視して組み込みの既定値を使います。`.env` の認証情報は引き続き読み込まれます。独立した CI 実行、再現できる不具合報告、他社製の連携に便利です。 |
| `--ignore-rules` | `AGENTS.md`、`SOUL.md`、`.cursorrules`、永続メモリ、事前読み込みスキルの自動注入をやめます。`--ignore-user-config` と組み合わせると完全に独立した実行になります。 |
| `--safe-mode` | 切り分け用のモードです。ユーザー設定、ルール／メモリの注入、プラグイン、シェルフック、MCP サーバーなど、あらゆる独自設定を無効にします（`--ignore-user-config` と `--ignore-rules` を含みます）。問題が自分の環境由来か Hermes 本体由来かを見分けるのに使います。 |
| `--source <tag>` | 絞り込み用のセッション種別タグです（既定: `cli`）。利用者のセッション一覧に出したくない他社製の連携には `tool` を使ってください。 |
| `--max-turns <N>` | 1 回のやり取りで許すツール呼び出しの最大回数です（既定: 500、または設定の `agent.max_turns`）。 |

例:

```bash
hermes
hermes chat -q "Summarize the latest PRs"          # seeds an interactive session
hermes chat --oneshot -q "Summarize the latest PRs"  # answer and exit
hermes chat --provider openrouter --model anthropic/claude-sonnet-4.6
hermes chat --toolsets web,terminal,skills
hermes chat --quiet -q "Return only JSON"
hermes chat --worktree -q "Review this repo and open a PR"
hermes chat --ignore-user-config --ignore-rules -q "Repro without my personal setup"
hermes chat --safe-mode -q "Is this bug mine or Hermes'?"
```

#### 答えて終わるチャットでの委任 {#delegation-in-finite-chat-runs}

チャットが答えを返してそのまま終了する場合（`-Q`、`chat --oneshot`、または
標準入出力が TTY でない状態での問いかけ）、`delegate_task` は子のエージェントの終了を待ち、
その結果を同じターンのうちに親へ返します。まとめて渡した子は、これまでどおり並行して動き、
同時に動く数は `delegation.max_concurrent_children` の上限に従います。親はその結果を
使って最終的な応答を組み立ててから、CLI を終了できます。

- **自動で合流します:** 事前の有効化も、バックグラウンド動作の上書きも要りません。
  TTY で対話するチャットとメッセージングのセッションでは、これまでどおり委任はバックグラウンドで動きます。
- **既存の安全策はそのままです:** 委任の上限、タイムアウト、取り消し、
  `approvals.single_query_mode` は引き続き効きます。合流したからといってコマンドが自動で承認されるわけでも、
  子の処理が必ず成功するわけでもありません。結果を確かめ、できあがったものを検証してください。
- **ターミナルの完了通知:** バックグラウンドのターミナルの通知の動きは変わりません。
  終了前に上限つきで待つ `terminal.oneshot_completion_wait_seconds` も同じです。
  この設定は委任のタイムアウトではありません。

委任は、あくまで同じプロセスの中で完結します。親を中断したり終了させたりすると、
終わっていない子も取り消されることがあります。起動したプロセスが終わっても残す必要のある作業には、
永続的なスケジューラーを使ってください。

### `hermes -z <prompt>` — スクリプト向けの一問一答 {#hermes--z-prompt-scripted-one-shot}

プログラムから呼ぶ側（シェルスクリプト、CI、cron、プロンプトを流し込む親プロセス）にとって、`hermes -z` はもっとも素直な一問一答の入口です。**プロンプトを 1 つ渡すと、最終的な応答テキストだけが返り、標準出力にも標準エラーにも他は何も出ません。** バナーも回転表示もツールの下見表示も `Session:` の行もなく、エージェントの最終返答がそのままプレーンテキストで出ます。

```bash
hermes -z "What's the capital of France?"
# → Paris.

# Parent scripts can cleanly capture the response:
answer=$(hermes -z "summarize this" < /path/to/file.txt)
```

実行ごとの上書き（`~/.hermes/config.yaml` は書き換えません）:

| フラグ | 対応する環境変数 | 用途 |
|---|---|---|
| `-m` / `--model <model>` | `HERMES_INFERENCE_MODEL` | この実行だけモデルを変える |
| `--provider <provider>` | _(なし)_ | この実行だけプロバイダを変える |
| `--usage-file <path>` | _(なし)_ | 実行後に JSON の利用状況レポートを書き出す（後述） |

```bash
hermes -z "…" --provider openrouter --model openai/gpt-5.5
# or:
HERMES_INFERENCE_MODEL=anthropic/claude-sonnet-4.6 hermes -z "…"
```

エージェントもツールもスキルも同じで、対話用・見た目のための層をすべて剥がしただけです。やり取りの記録にツールの出力も欲しいときは、代わりに `hermes chat --oneshot -q` を使ってください。`-z` は「最終的な答えだけが欲しい」場合のためのものです。

#### `--usage-file` — パイプライン向けの JSON 利用状況レポート {#--usage-file-json-usage-report-for-pipelines}

`hermes -z "…" --usage-file /path/report.json` は、実行後に機械で読める利用状況レポートを書き出します。中身は `estimated_cost_usd`、`input_tokens` / `output_tokens` / `cache_read_tokens` / `cache_write_tokens` / `reasoning_tokens` / `total_tokens`、`api_calls`、`model`、`provider`、`session_id`、`service_tier`、そして `completed` / `failed` のフラグです。**実行が失敗したときにも書き出される** ので、まとめて処理するパイプラインでも支出を必ず把握できます。`-z` / `--oneshot` 以外では何も起きず、レポートの書き出しに失敗しても実行そのものの結果が隠れることはありません。

```bash
hermes -z "summarize this repo" --usage-file /tmp/usage.json
jq .estimated_cost_usd /tmp/usage.json
```

## `hermes model` {#hermes-model}

プロバイダとモデルを対話的に選ぶコマンドです。**新しいプロバイダを追加したり、API キーを設定したり、OAuth を通したりするのはこのコマンドです。** Hermes のチャットセッションの中ではなく、ターミナルから実行してください。

```bash
hermes model
```

次のようなときに使います。
- **新しいプロバイダを追加する**（OpenRouter、Anthropic、Copilot、DeepSeek、独自エンドポイントなど）
- OAuth を使うプロバイダにログインする（Anthropic、Copilot、Codex、Nous Portal）
- API キーを入力または更新する
- プロバイダごとのモデル一覧から選ぶ
- 独自ホストのエンドポイントを設定する
- 新しい既定値を設定に保存する

:::warning hermes model と /model の違い
**`hermes model`**（Hermes のセッション外、ターミナルから実行）は **プロバイダ設定のフルウィザード** です。新しいプロバイダの追加、OAuth の実行、API キーの入力、エンドポイントの設定ができます。

**`/model`**（動作中の Hermes チャットセッションの中で入力）は、**すでに設定済みのプロバイダとモデルを切り替える** ことしかできません。新しいプロバイダの追加も、OAuth も、API キーの入力もできません。

**新しいプロバイダを追加したいときは:** まず Hermes のセッションを終了し（`Ctrl+C` か `/quit`）、ターミナルのプロンプトから `hermes model` を実行してください。
:::

### `/model` スラッシュコマンド（セッションの途中で） {#model-slash-command-mid-session}

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

既定では、`/model` の変更は **そのセッションの中だけ** に効きます。`--global` を付けると変更が `config.yaml` に残ります（`model.persist_switch_by_default: true` にすると、切り替えのたびに残ります）。

```
/model claude-sonnet-4 --global     # Switch and save as new default
```

:::info OpenRouter のモデルしか出てこないときは
OpenRouter しか設定していない場合、`/model` には OpenRouter のモデルしか出ません。別のプロバイダ（Anthropic、DeepSeek、Copilot など）を追加するには、セッションを終了してターミナルから `hermes model` を実行してください。
:::

`--global` で切り替えると、モデルと一緒にプロバイダとベース URL の変更も `config.yaml` に保存されます。独自エンドポイントから離れるときは、古いベース URL が他のプロバイダに紛れ込まないよう消されます。

## `hermes gateway` {#hermes-gateway}

```bash
hermes gateway <subcommand>
```

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `run` | ゲートウェイを前面で動かします。WSL、Docker、Termux ではこちらをおすすめします。 |
| `start` | インストール済みの systemd / launchd のバックグラウンドサービスを起動します。 |
| `stop` | サービス（または前面で動くプロセス）を止めます。 |
| `restart` | サービスを再起動します。 |
| `status` | サービスの状態を表示します。 |
| `list` | **すべてのプロファイル** を並べ、それぞれのゲートウェイが動いているかを表示します（分かる場合は PID も）。複数のプロファイルを並行して動かしていて、全体を一目で見たいときに便利です。 |
| `install` | systemd（Linux）または launchd（macOS）のバックグラウンドサービスとして導入します。 |
| `uninstall` | 導入したサービスを削除します。 |
| `setup` | メッセージングのプラットフォーム設定を対話的に行います。 |
| `migrate` | プロファイルごとに独立して動いているゲートウェイを、多重化した既定のゲートウェイ 1 つに移します（`--multiplex`、既定）。記録済みのマニフェストから元に戻すこともできます（`--standalone`）。事前確認（重複した Bot トークン、`/p/<profile>/` の受け口を持たずにポートを使っている 2 番目以降のプロファイル）を行い、妨げがあれば何も変更しません。フラグ: `--dry-run`、`-y` / `--yes`。詳しくは [プロファイルごとのゲートウェイからの移行](/hermes/docs/user-guide/multi-profile-gateways/#migrating-from-per-profile-gateways) をご覧ください。 |
| `migrate-legacy` | 改名前のインストールが残した古い `hermes.service` ユニットを削除します。プロファイル用のユニット（`hermes-gateway-<profile>.service`）や無関係なサービスには一切触れません。フラグ: `--dry-run`、`-y` / `--yes`。 |
| `enroll` | 試験的な機能です。このゲートウェイをリレーコネクタに登録し、コネクタ経由のプラットフォーム向けにリレーの認証情報を保存します。[Hermes Relay](/hermes/docs/user-guide/messaging/relay/) をご覧ください。 |

オプション:

| オプション | 説明 |
|--------|-------------|
| `--all` | `start` / `restart` / `stop` のとき、いま有効な `HERMES_HOME` だけでなく **すべてのプロファイル** のゲートウェイを対象にします。複数のプロファイルを並行して動かしていて、`hermes update` のあとにまとめて再起動したいときに便利です。 |
| `--no-supervise` | `run` のとき、s6-overlay の Docker イメージの中で自動監視を使わず、s6 導入前の前面動作にします。ゲートウェイがコンテナの主プロセスになり、自動再起動はしません。s6 イメージの外では何も起きません。`HERMES_GATEWAY_NO_SUPERVISE=1` を設定するのと同じです。 |
| `--external-supervisor` | `run` のとき、前面のゲートウェイをラッパー側のプロセス管理が持つことを宣言します。`sudo` や `env -i`、その他のラッパーが launchd / systemd の環境目印を落としてしまう場合に使ってください。チャット内からの再起動や更新は、切り離した別プロセスを立てるのではなく、その管理側へ戻る形で終了します。 |

`--external-supervisor` は再起動の取り決めそのものです。チャット内からの再起動やサービス再起動を伴う更新は終了ステータス `75` で抜けるので、ラッパー側の監視プロセスがそのゼロ以外の終了のあとでゲートウェイを立て直す必要があります。systemd なら
`Restart=on-failure` か `Restart=always` を使い、`RestartPreventExitStatus` に `75` を含めないでください。launchd なら、失敗終了のあとに立て直すよう `KeepAlive` を設定します。この設定がないと、再起動を頼んでもゲートウェイは止まったままになります。

`hermes gateway enroll` は `--token`、`--connector-url`、`--gateway-id`、`--wake-url` を受け取ります。登録用トークンをコネクタと交換し、得られた `GATEWAY_RELAY_ID`、`GATEWAY_RELAY_SECRET`、`GATEWAY_RELAY_DELIVERY_KEY`、任意の `GATEWAY_RELAY_URL`、そして（`--wake-url` を指定した場合は）`GATEWAY_RELAY_WAKE_URL` の値を、いま有効なプロファイルの `.env` に書き込みます。

:::tip WSL をお使いの方へ
`hermes gateway start` ではなく `hermes gateway run` を使ってください。WSL の systemd 対応は当てになりません。動かし続けたいときは tmux で包みます: `tmux new -s hermes 'hermes gateway run'`。詳しくは [WSL のよくある質問](/hermes/docs/reference/faq/#wsl-gateway-keeps-disconnecting-or-hermes-gateway-start-fails) をご覧ください。
:::

## `hermes lsp` {#hermes-lsp}

```bash
hermes lsp <subcommand>
```

Language Server Protocol 連携を管理します。LSP は本物の言語サーバー（pyright、gopls、rust-analyzer など）を裏で動かし、その診断結果を `write_file` と `patch` の書き込み後チェックに流し込みます。git のワークスペース判定が前提で、作業ディレクトリまたは編集対象のファイルが git の worktree の中にあるときだけ動きます。

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `status` | サービスの状態、設定済みサーバー、導入状況を表示します。 |
| `list` | 対応しているサーバーの一覧を出します。`--installed-only` を付けると未導入のものを飛ばします。 |
| `install <id>` | 指定したサーバーのバイナリを先に導入します。 |
| `install-all` | 自動導入の手順が分かっているサーバーをすべて導入します。 |
| `restart` | 動作中のクライアントを畳み、次の編集で立ち上げ直させます。 |
| `which <id>` | 指定したサーバーの解決済みバイナリのパスを表示します。 |

詳しい手引き、対応言語、設定項目については [LSP — 意味解析による診断](/hermes/docs/user-guide/features/lsp/) をご覧ください。

## `hermes setup` {#hermes-setup}

```bash
hermes setup [model|tts|terminal|gateway|tools|agent] [--non-interactive] [--reset] [--quick] [--reconfigure] [--portal]
```

**いちばん簡単な道:** `hermes setup --portal` — Nous Portal に OAuth でログインし、[Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/) の利用を一度に済ませます。

**初回:** 初回向けのウィザードが立ち上がります。

**設定済みの方が再び実行した場合:** 設定し直すフルウィザードにそのまま入ります。どの項目も現在の値が既定として表示され、Enter でそのまま、入力すれば新しい値になります。メニューは出ません。

フルウィザードではなく、ひとつの区画だけを開くこともできます。

| 区画 | 説明 |
|---------|-------------|
| `model` | プロバイダとモデルの設定。 |
| `terminal` | ターミナルのバックエンドとサンドボックスの設定。 |
| `gateway` | メッセージングのプラットフォーム設定。 |
| `tools` | プラットフォームごとのツールの有効・無効。 |
| `agent` | エージェントの振る舞いの設定。 |

オプション:

| オプション | 説明 |
|--------|-------------|
| `--quick` | 設定済みの方が再び実行したとき、未設定・空の項目だけを尋ねます。すでに設定済みの項目は飛ばします。 |
| `--non-interactive` | 質問せずに既定値や環境変数の値を使います。 |
| `--reset` | セットアップの前に設定を既定へ戻します。 |
| `--reconfigure` | 後方互換のための別名です。導入済みの環境で `hermes setup` を素で実行すると、いまはこの動きが既定になっています。 |
| `--portal` | Nous Portal を一度に設定します。OAuth でログインし、Nous を推論プロバイダに設定し、[Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/) の利用を有効にします。ウィザードの残りは飛ばします。 |

## `hermes portal` {#hermes-portal}

```bash
hermes portal [status|open|tools]
```

Nous Portal の認証状態、Tool Gateway の振り分けを確認し、サブスクリプションのページを開きます。サブコマンドなしで実行すると `status` が動きます。

| サブコマンド | 説明 |
|------------|-------------|
| `status`（既定） | Portal の認証状態と、ツールごとの Tool Gateway 振り分けのまとめ。サブコマンドを省いたときもこれが出ます。 |
| `open` | 既定のブラウザで `portal.nousresearch.com/manage-subscription` を開きます。 |
| `tools` | Tool Gateway の提携先（Firecrawl、FAL、OpenAI TTS、Browser Use、Modal）を並べ、どれが Nous 経由になっているかを示します。 |

ゲートウェイ自体の設定については [Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/) をご覧ください。一度に済ませる設定手順は、上の `hermes setup --portal` をご覧ください。

## `hermes whatsapp` {#hermes-whatsapp}

```bash
hermes whatsapp
```

モード選択と QR コードによるペアリングを含む、WhatsApp のペアリング／設定の流れを実行します。

## `hermes slack` {#hermes-slack}

```bash
hermes slack manifest              # print manifest to stdout
hermes slack manifest --write      # write to ~/.hermes/slack-manifest.json
hermes slack manifest --long-description-file AGENTS.md --write
hermes slack manifest --slashes-only  # just the features.slash_commands array
```

`COMMAND_REGISTRY` にあるゲートウェイのコマンド（`/btw`、`/stop`、`/model` など）をすべて、一級の Slack スラッシュコマンドとして登録する Slack アプリマニフェストを生成します。Discord や Telegram と同じ使い勝手になります。出力した内容を
[https://api.slack.com/apps](https://api.slack.com/apps) → 自分のアプリ →
**Features → App Manifest → Edit** に貼り付けて **Save** してください。スコープやスラッシュコマンドが変わっていれば、Slack が入れ直しを求めてきます。

| フラグ | 既定 | 用途 |
|------|---------|---------|
| `--write [PATH]` | 標準出力 | 標準出力ではなくファイルに書き出します。`--write` を素で使うと `$HERMES_HOME/slack-manifest.json` に書きます。 |
| `--name NAME` | `Hermes` | Slack でのボットの表示名。 |
| `--description DESC` | 既定の説明文 | Slack のアプリ一覧に出るボットの説明。 |
| `--long-description TEXT` | 未設定 | `display_information.long_description` をその場で指定します（175〜4,000 文字）。`--slashes-only` とは併用できません。 |
| `--long-description-file PATH` | 未設定 | UTF-8 のテキストファイルから長い説明を読み、中身をそのまま使います。`--long-description` とは同時に使えず、`--slashes-only` とも併用できません。 |
| `--slashes-only` | 無効 | 手で管理しているマニフェストに混ぜ込むため、`features.slash_commands` だけを出力します。 |

`hermes update` のあとに `hermes slack manifest --write` をもう一度実行すると、新しいコマンドを取り込めます。

## `hermes send` {#hermes-send}

```bash
hermes send --to <target> "message text"
hermes send --to <target> --file <path>
echo "message" | hermes send --to <target>
hermes send --list [platform]
```

エージェントもゲートウェイのループも立ち上げずに、設定済みのメッセージング先へ一度きりのメッセージを送ります。ゲートウェイがすでに持っている認証情報（`~/.hermes/.env` と `~/.hermes/config.yaml`）をそのまま使うので、運用スクリプト、cron、CI フック、監視デーモンは、各プラットフォームの REST クライアントを作り直さずに状況を投稿できます。

ボットトークンを使うプラットフォーム（Telegram、Discord、Slack、Signal、SMS、WhatsApp-CloudAPI）ではゲートウェイを動かしておく必要はありません。`hermes send` がプラットフォームの REST エンドポイントと直接やり取りします。常駐アダプタが必要なプラグイン系のプラットフォームでは、ゲートウェイが動いている必要があります。

| オプション | 説明 |
|--------|-------------|
| `-t`, `--to <TARGET>` | 配信先。書き方は `platform`（ホームのチャンネルを使う）、`platform:chat_id`、`platform:chat_id:thread_id`、`platform:#channel-name` です。例: `telegram`、`telegram:-1001234567890`、`discord:#ops`、`slack:C0123ABCD`、`signal:+15551234567`。 |
| `-f`, `--file <PATH>` | メッセージ本文を `PATH` から読みます（テキストファイル専用 — ログ、レポート、マークダウン）。`-` を渡すと標準入力から読みます。画像やその他のバイナリを送るには `MEDIA:<path>` を使ってください（後述）。 |
| `-s`, `--subject <LINE>` | 本文の前に件名・見出しの行を付けます。 |
| `-l`, `--list [platform]` | すべてのプラットフォーム（または指定したプラットフォームのみ）の設定済み送信先を並べます。 |
| `-q`, `--quiet` | 成功時に標準出力へ何も出しません。スクリプトで終了コードだけを見たいときに便利です。 |
| `--json` | 人が読む形式ではなく、生の JSON の結果を出します。 |

位置引数の `message` も `--file` も指定しなかった場合、`hermes send` は標準入力が TTY でなければそこから読みます。終了コードは、成功が `0`、配信やバックエンドの失敗が `1`、使い方の誤りが `2` です。

### 画像やその他のメディアを送る {#sending-images-and-other-media}

`--file` は *テキスト* 本文専用です。画像・文書・動画・音声をプラットフォームのネイティブな添付として届けるには、メッセージ本文の中で `MEDIA:<local_path>` と書いて指定します。

```bash
hermes send --to telegram "MEDIA:/tmp/screenshot.png"
hermes send --to telegram "Build chart for today MEDIA:/tmp/chart.png"   # with caption
hermes send --to discord:#ops "MEDIA:/tmp/report.pdf"
```

既定では、画像ファイルは写真として送られます（Telegram などのプラットフォームは再圧縮します）。圧縮しないファイル添付として届けたいときは、メッセージに `[[as_document]]` を足してください。

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

端末をまたいだボット同士の DM です。別の Hermes ゲートウェイ（`api_server` プラットフォームを動かしている端末なら何でも）を *ピア* として登録すると、そのエージェントにメッセージを送れます。`hermes peer dm` は、ピアの API サーバー越しに相手側エージェントの正規の **Bot Chat** セッションを見つけ、そこでエージェントを 1 ターン動かし、返答を標準出力に表示します。ローカルで使う
`hermes -p <bot> chat --in ~ -c "Bot Chat" …` の、端末をまたぐ版にあたります。

`<peer>` だけを指定すると、そのピアのゲートウェイの主エージェントが相手になります。
`<peer>/<agent>` は、多重化されたピアの中の名前付きプロファイルを指します（その `/p/<profile>/` のミラー経由でつながります）。

| サブコマンド | 説明 |
|--------|-------------|
| `add <name> --url <URL> [--key <KEY>] [--note TEXT]` | ピアを登録または更新します。URL は `config.yaml`（`bot_peers`）に入り、キーは `~/.hermes/.env` に `HERMES_PEER_<NAME>_KEY` として保存されます。 |
| `list` | ピアと、それぞれにキーが設定されているかを並べます。 |
| `dm <peer>[/<agent>] [message]` | ピアのエージェントの正規 Bot Chat にメッセージを送り、返答を表示します（機械向けの出力は `--json`。メッセージは標準入力からも読めます）。 |
| `run <peer>[/<agent>] [message]` | 長くかかる正規 Bot Chat のターンを非同期で始め、その `run_id`、セッション ID、冪等キーを返します（`--json` に対応）。同じ要求をやり直すときは `--idempotency-key` を使い回してください。 |
| `status <peer>[/<agent>] <run_id>` | 非同期のピア実行の様子を確認し、完了していれば最終出力を表示します（`--json` に対応）。 |
| `stop <peer>[/<agent>] <run_id>` | 別のターンを巻き込まずに、その非同期のピア実行だけを止めます（`--json` に対応）。 |
| `remove <name>` | ピアを登録から外します（`.env` のキーはそのまま残ります）。 |

ピアが 1 つでも登録されていると、すべての正規 Bot Chat に教えられる Bot Mode のやり取りの決まり（`agent.bot_mode_protocol`）に、ピアの一覧と `hermes peer dm` の使い方が自動で含まれます。SOUL を書き換えなくても、エージェントは端末をまたいだ相棒を見つけられます。
[Bot Mode](/hermes/docs/user-guide/bot-mode/) をご覧ください。

終了コードは、成功が `0`、配信やピアの失敗が `1`、使い方の誤りが `2` です。

## `hermes secrets` {#hermes-secrets}

```bash
hermes secrets bitwarden <subcommand>
hermes secrets bw <subcommand>          # short alias
```

API キーを `~/.hermes/.env` に置く代わりに、プロセス起動時に外部のシークレット管理から取得します。いまは **Bitwarden Secrets Manager** に対応しています。詳しい手引きは [Bitwarden 連携](/hermes/docs/user-guide/secrets/bitwarden/) をご覧ください。

`bitwarden`（別名 `bw`）のサブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `setup` | 対話ウィザードです。バージョン固定した `bws` バイナリを導入し、アクセストークンを保存し、プロジェクトを選びます。対話なしで使うために `--project-id`、`--access-token`、`--server-url` を受け取ります。 |
| `status` | 現在の設定、バイナリのパスとバージョン、トークンの検証結果を表示します。 |
| `token` | アクセストークンを入れ替えます。`.env` に保存する前に新しいトークンを Bitwarden で検証します（弾かれたトークンでは何も変わりません）。対話なし用に `--access-token`、確認を省く `--no-verify` を受け取ります。 |
| `sync` | いますぐシークレットを取得し、何が変わったかを報告します。`--apply` を付けると、実際にいまのシェルの環境変数へ書き出します（既定は下見だけです）。 |
| `install` | バージョン固定した `bws` バイナリを取得して検証します。`--force` を付けると、管理下の写しがすでにあっても取り直します。 |
| `disable` | Bitwarden 連携を無効にします。 |

## `hermes migrate` {#hermes-migrate}

```bash
hermes migrate <type>
```

いま有効な `config.yaml` を調べ、廃止されたモデルや非推奨の設定への参照を（必要なら）書き換えます。書き換える前に、元の `config.yaml` の控えを日時付きで取ります（`--no-backup` で省けます）。

| サブコマンド | 説明 |
|------------|-------------|
| `xai` | 2026 年 5 月 15 日に廃止予定の xAI モデルへの参照を `config.yaml` から探し、（`--apply` を付けると）xAI の移行案内に沿った公式の置き換え先へその場で書き換えます。既定は下見だけです。 |

移行サブコマンドに共通のフラグ:

| フラグ | 説明 |
|------|-------------|
| `--apply` | `config.yaml` をその場で書き換えます（既定は下見だけで、書き込みません）。 |
| `--no-backup` | 適用時に `config.yaml` の日時付きの控えを取りません。 |

> `hermes claw migrate`（OpenClaw の設定を Hermes へ一度だけ取り込むもの）とは別物です。`hermes migrate` はトップレベルの設定書き換えコマンドです。

## `hermes proxy` {#hermes-proxy}

```bash
hermes proxy <subcommand>
```

OAuth で認証済みの上流プロバイダ（Nous Portal、xAI など）へ要求を転送する、ローカルの OpenAI 互換 HTTP サーバーを動かします。外部のアプリは任意のベアラートークンでこのプロキシを指せばよく、外へ出るときにプロキシが本物の OAuth 認証情報を付け直します。詳しい手引きは [サブスクリプションプロキシ](/hermes/docs/user-guide/features/subscription-proxy/) をご覧ください。

| サブコマンド | 説明 |
|------------|-------------|
| `start` | プロキシを前面で動かします。フラグ: `--provider <nous\|xai>`（既定 `nous`）、`--host <addr>`（既定 `127.0.0.1`。LAN に出すなら `0.0.0.0`）、`--port <int>`（既定 `8645`）。 |
| `status` | どの上流が使える状態か（認証情報があり、OAuth が有効か）を表示します。 |
| `providers` | 使える上流プロバイダを並べます。 |

## `hermes security` {#hermes-security}

```bash
hermes security <subcommand>
```

[OSV.dev](https://osv.dev) を使って、必要なときだけ脆弱性を調べます。対象は Hermes の venv（導入済みの PyPI 配布物）、`~/.hermes/plugins/` 以下のプラグインが宣言する Python の依存、そして `config.yaml` でバージョン固定された `npx` / `uvx` の MCP サーバーです。システム全体に入れたパッケージや、エディタ・ブラウザの拡張は調べません。

| サブコマンド | 説明 |
|------------|-------------|
| `audit` | サプライチェーン監査を一度だけ実行します。 |

`audit` のフラグ:

| フラグ | 既定 | 説明 |
|------|---------|-------------|
| `--json` | 無効 | 人が読む文章ではなく、機械で読める JSON を出します。 |
| `--fail-on <level>` | `critical` | この深刻度に達する検出があったとき、ゼロ以外で終了します（`low`、`moderate`、`high`、`critical`）。 |
| `--skip-venv` | 無効 | Hermes の Python venv を調べません。 |
| `--skip-plugins` | 無効 | プラグインの依存ファイルを調べません。 |
| `--skip-mcp` | 無効 | `config.yaml` でバージョン固定された MCP サーバーを調べません。 |

## `hermes login` / `hermes logout` *(非推奨)* {#hermes-login-hermes-logout-deprecated}

:::caution
`hermes login` は削除されました。OAuth の認証情報の管理には `hermes auth`、プロバイダの選択には `hermes model`、対話でひととおり設定するには `hermes setup` を使ってください。
:::

## `hermes auth` {#hermes-auth}

同じプロバイダのキーを順番に使い回すための、認証情報のプールを管理します。詳しくは [認証情報プール](/hermes/docs/user-guide/features/credential-pools/) をご覧ください。

```bash
hermes auth                                              # Interactive wizard
hermes auth list                                         # Show all pools
hermes auth list openrouter                              # Show specific provider
hermes auth add openrouter --api-key sk-or-v1-xxx        # Add API key
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

サブコマンド: `add`、`list`、`remove`、`reset`、`priority`、`refresh`、`status`、`logout`、`spotify`。サブコマンドなしで実行すると、対話式の管理ウィザードが立ち上がります。

## `hermes status` {#hermes-status}

```bash
hermes status [--all] [--deep]
```

| オプション | 説明 |
|--------|-------------|
| `--all` | 秘密を伏せた、そのまま共有できる形ですべての詳細を表示します。 |
| `--deep` | 時間はかかりますが、より深いところまで調べます。 |

## `hermes cron` {#hermes-cron}

```bash
hermes cron <list|create|edit|pause|resume|run|remove|status|runs|incidents|doctor|tick>
```

| サブコマンド | 説明 |
|------------|-------------|
| `list` | 予約された仕事を並べます。 |
| `create` / `add` | プロンプトから予約の仕事を作ります。`--skill` を繰り返して、スキルを 1 つ以上ひも付けることもできます。`--reasoning-effort <none\|minimal\|low\|medium\|high\|xhigh\|max\|ultra>` で仕事ごとに推論の強さを固定できます。 |
| `edit` | 仕事の予定・プロンプト・名前・配信先・繰り返し回数・ひも付いたスキルを更新します。`--clear-skills`、`--add-skill`、`--remove-skill` に加えて `--reasoning-effort` にも対応します（空文字を渡すと固定を解除します）。 |
| `pause` | 仕事を消さずに一時停止します。 |
| `resume` | 停止中の仕事を再開し、次の実行時刻を計算し直します。 |
| `run` | 次のスケジューラの刻みで仕事を動かします。 |
| `remove` | 予約された仕事を削除します。 |
| `status` | cron スケジューラが動いているかを確認します。 |
| `doctor` | 読むだけの全体健康診断です。失敗した実行、失敗した配信、期限切れや欠けた `next_run_at`、見当たらないスクリプトや作業ディレクトリを調べます。問題が見つかるとゼロ以外で終了します。 |
| `tick` | 期限が来た仕事を一度だけ実行して終了します。 |

cron の **起動役** は `cron.provider` の設定で差し替えられます。空（既定）
なら、プロセス内の組み込みの刻みを使います。`chronos`（ゼロまで縮む
ホスト型ゲートウェイのための、NAS が管理する提供元）を指定すると、
`cron.chronos.*` のキー（`portal_url`、`callback_url`、`expected_audience`、
`nas_jwks_url`）で設定します。あるいは `plugins/cron/<name>/` や
`$HERMES_HOME/plugins/<name>/` に置いた独自の提供元の名前を書きます。知らない提供元や使えない提供元を指定した場合は組み込みに戻るので、cron が起動役を失うことはありません。
[cron の内部](/hermes/docs/developer-guide/cron-internals/#gateway-integration) の文書もご覧ください。

## `hermes kanban` {#hermes-kanban}

```bash
hermes kanban [--board <slug>] <action> [options]
```

複数のプロファイル・複数のプロジェクトで共同作業するボードです。1 つの導入環境でいくつものボードを持てます（プロジェクト、リポジトリ、領域ごとに 1 つ）。各ボードは独立した待ち行列で、専用の SQLite の DB とディスパッチャの範囲を持ちます。新しく導入すると `default` という名前のボードが 1 つあり、その DB は後方互換のため `~/.hermes/kanban.db` です。追加のボードは `~/.hermes/kanban/boards/<slug>/kanban.db` に置かれます。ゲートウェイに組み込まれたディスパッチャは、刻みごとにすべてのボードを見て回ります。

**全体フラグ（以下のどの操作にも効きます）:**

| フラグ | 用途 |
|------|---------|
| `--board <slug>` | 特定のボードを対象にします。省略すると現在のボード（`hermes kanban boards switch`、環境変数 `HERMES_KANBAN_BOARD`、または `default`）になります。 |

**これは人が使う、あるいはスクリプトから使うための入口です。** ディスパッチャが立ち上げるエージェントの作業役は、`hermes kanban` をシェルから呼ぶのではなく、専用の `kanban_*` [ツールセット](/hermes/docs/user-guide/features/kanban/#how-workers-interact-with-the-board)（`kanban_show`、`kanban_complete`、`kanban_request_review`、`kanban_request_changes`、`kanban_block`、`kanban_create`、`kanban_link`、`kanban_comment`、`kanban_heartbeat`。まとめ役のプロファイルはさらに `kanban_list` と `kanban_unblock` も使えます）でボードを操作します。作業役の環境には `HERMES_KANBAN_BOARD` が固定されているので、物理的に他のボードは見えません。

| 操作 | 用途 |
|--------|---------|
| `init` | `kanban.db` が無ければ作ります。何度実行しても同じ結果になります。 |
| `boards list` / `boards ls` | すべてのボードをタスク数とともに並べます。`--json`、`--all`（保管済みも含める）。 |
| `boards create <slug>` | 新しいボードを作ります。フラグ: `--name`、`--description`、`--icon`、`--color`、`--switch`（作ってすぐ有効にする）。slug はケバブケースで、自動的に小文字になります。 |
| `boards switch <slug>` / `boards use` | `<slug>` を有効なボードとして保存します（`~/.hermes/kanban/current` に書きます）。 |
| `boards show` / `boards current` | いま有効なボードの名前、DB のパス、タスク数を表示します。 |
| `boards rename <slug> "<name>"` | ボードの表示名を変えます。slug は変えられません。 |
| `boards rm <slug>` | ボードを保管（既定）するか、完全に削除します。`--delete` を付けると保管せずに消します。保管したボードは `boards/_archived/<slug>-<ts>/` へ移ります。`default` に対しては拒否されます。 |
| `create "<title>"` | 有効なボードに新しいタスクを作ります。フラグ: `--body`、`--assignee`、`--parent`（繰り返し可）、`--workspace scratch\|worktree\|dir:<path>`、`--tenant`、`--priority`、`--triage`、`--idempotency-key`、`--max-runtime`、`--max-retries`、`--skill`（繰り返し可）。 |
| `list` / `ls` | 有効なボードのタスクを並べます。`--mine`、`--assignee`、`--status`、`--tenant`、`--archived`、`--json` で絞り込めます。 |
| `show <id>` | タスクをコメントと出来事つきで表示します。機械向けの出力は `--json`。 |
| `assign <id> <profile>` | 担当を決める、または変えます。`none` で担当を外します。タスクの実行中は拒否されます。 |
| `link <parent> <child>` | 依存関係を足します。循環は検出されます。両方のタスクが同じボードにある必要があります。 |
| `unlink <parent> <child>` | 依存関係を外します。 |
| `claim <id>` | 着手できるタスクを不可分に取ります。解決されたワークスペースのパスを表示します。 |
| `comment <id> "<text>"` | コメントを足します。次にそのタスクを取った作業役が、`kanban_show()` の応答の一部として読みます。 |
| `complete <id>` | タスクを完了にします。フラグ: `--result`、`--summary`、`--metadata`。 |
| `block <id> "<reason>"` | 人の判断待ちとしてタスクを止めます。理由はコメントとしても残ります。 |
| `request-review <id>` | タスクを `review` に移し、レビュー役へ引き渡します。止めるのとは違います。フラグ: `--summary`、`--metadata`、`--reviewer`（レビューを割り当てる前に担当を変えます）。 |
| `request-changes <id> <reason>` | 実行中のレビューに対するレビュー役の判断です。そのレビューの試行を閉じ、タスクを元の実装者へ戻します。 |
| `reopen-review <id>...` | レビュー中のタスクを差し戻します（`review` → ready / todo）。フラグ: `--reason`（コメントとして残ります）。 |
| `schedule <id> "<reason>"` | 時間待ちや後追いの作業を `scheduled` に置いて、人が対応すべき止まりとして表示されないようにします。 |
| `unblock <id>` | 止まったタスクを元の段階（`review` か `ready`）へ戻します。依存が残っていれば `todo` へ戻します。 |
| `archive <id>` | 既定の一覧から隠します。`gc` が一時作業用のワークスペースを消します。 |
| `tail <id>` | タスクの出来事の流れを追いかけます。 |
| `dispatch` | 有効なボードでディスパッチャを 1 巡させます。フラグ: `--dry-run`、`--max N`、`--failure-limit N`、`--json`。 |
| `context <id>` | 作業役が見ることになる文脈をすべて表示します（タイトル + 本文 + 親タスクの結果 + コメント）。 |
| `specify <id>` / `specify --all` | 仕分け列にあるタスクを、補助 LLM を使って具体的な仕様（タイトル + 目的・進め方・受け入れ条件を含む本文）に肉付けし、`todo` へ進めます。フラグ: `--tenant`（`--all` を 1 つのテナントに限定）、`--author`、`--json`。モデルは `config.yaml` の `auxiliary.triage_specifier` で設定します。 |
| `decompose <id>` / `decompose --all` | 仕分け列のタスクを、説明文をもとに専門プロファイルへ割り振った子タスクの網に展開します。展開しても得がないと LLM が判断した場合は、specify と同じやり方で 1 つのタスクとして進めます。フラグは `specify` と同じです。展開のモデルは `config.yaml` の `auxiliary.kanban_decomposer` で設定します。`kanban.orchestrator_profile` は、展開後に根のタスク（まとめ役のタスク）を誰が持つかだけを決めます。`kanban.auto_decompose: true`（既定）のときは、ディスパッチャの刻みごとに自動でも実行されます。[自動と手動のまとめ方](/hermes/docs/user-guide/features/kanban/#auto-vs-manual-orchestration) をご覧ください。 |
| `gc` | 保管済みタスクの一時作業用ワークスペースを削除します。 |

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

ボードの決まり方（優先度の高い順）: `--board <slug>` フラグ → 環境変数 `HERMES_KANBAN_BOARD` → `~/.hermes/kanban/current` ファイル → `default`。

どの操作もゲートウェイのスラッシュコマンド（`/kanban …`）として使えます。引数の書き方も同じで、`boards` サブコマンドと `--board` フラグも含みます。

設計の全体像 — Cline Kanban / Paperclip / NanoClaw / Gemini Enterprise との比較、8 つの共同作業の型、4 つのユーザーストーリー、同時実行の正しさの証明 — については、リポジトリの `docs/hermes-kanban-v1-spec.pdf` か [かんばんの手引き](/hermes/docs/user-guide/features/kanban/) をご覧ください。

## `hermes egress` {#hermes-egress}

リモートのターミナルサンドボックス向けに、認証情報を差し込む送信方向のファイアウォールです。[iron-proxy](https://github.com/ironsh/iron-proxy) というデーモン — TLS を中継し、ネットワークの境目で不透明なプロキシトークンを本物の上流 API 認証情報と入れ替えるプロキシ — を包んでいるので、サンドボックスが本物のキーを持つことはありません。既定では無効です。設定と仕組みについては [送信プロキシ](/hermes/docs/user-guide/egress/iron-proxy/) のページをご覧ください。

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

よくある失敗のしかたと直し方は [送信プロキシ → トラブルシューティング](/hermes/docs/user-guide/egress/iron-proxy/#troubleshooting) にまとめてあります。

## `hermes project` {#hermes-project}

```bash
hermes project <create|list|show|add-folder|remove-folder|rename|set-primary|use|archive|restore|bind-board>
```

プロジェクトは、複数のフォルダやリポジトリにまたがれる、人が名前を付けたワークスペースです。デスクトップのセッションをまとめる基準になり、かんばんボードと結び付けるとタスクに決まった worktree とブランチの規則を与えます。状態はプロファイルごとに保持されます。

| サブコマンド | 説明 |
|------------|-------------|
| `create` | 新しいプロジェクトを作ります。 |
| `list`（別名 `ls`） | プロジェクトを並べます。 |
| `show` | プロジェクトの詳細を表示します。 |
| `add-folder` | フォルダやリポジトリをプロジェクトに足します。 |
| `remove-folder` | フォルダをプロジェクトから外します。 |
| `rename` | プロジェクトの名前を変えます。 |
| `set-primary` | 主となるフォルダを決めます。 |
| `use` | 有効なプロジェクトを切り替えます。 |
| `archive` | プロジェクトを保管します（あとで戻せます）。 |
| `restore` | 保管したプロジェクトを戻します。 |
| `bind-board` | かんばんボードをこのプロジェクトに結び付けます。 |

## `hermes webhook` {#hermes-webhook}

```bash
hermes webhook <subscribe|list|remove|test>
```

出来事をきっかけにエージェントを動かすための、動的な webhook 登録を管理します。設定で webhook のプラットフォームが有効になっている必要があります。未設定の場合は、設定手順を表示します。

| サブコマンド | 説明 |
|------------|-------------|
| `subscribe` / `add` | webhook の経路を作ります。サービス側に設定する URL と HMAC の秘密鍵を返します。 |
| `list` / `ls` | エージェントが作った登録をすべて表示します。 |
| `remove` / `rm` | 動的な登録を削除します。config.yaml に書かれた固定の経路には影響しません。 |
| `test` | テスト用の POST を送り、登録が働いているかを確かめます。 |

### `hermes webhook subscribe` {#hermes-webhook-subscribe}

```bash
hermes webhook subscribe <name> [options]
```

| オプション | 説明 |
|--------|-------------|
| `--prompt` | `{dot.notation}` でペイロードを参照できるプロンプトのひな形。 |
| `--events` | 受け付ける出来事の種類をカンマ区切りで指定します（例: `issues,pull_request`）。空にするとすべて受け付けます。 |
| `--description` | 人が読むための説明。 |
| `--skills` | エージェントの実行で読み込むスキル名をカンマ区切りで指定します。 |
| `--deliver` | 配信先: `log`（既定）、`telegram`、`discord`、`slack`、`github_comment`。 |
| `--deliver-chat-id` | 他のプラットフォームへ配信するときの、相手のチャット / チャンネル ID。 |
| `--secret` | 独自の HMAC の秘密鍵。省略すると自動生成されます。 |
| `--deliver-only` | エージェントを動かさず、組み立てた `--prompt` をそのままメッセージとして配信します。LLM の費用はゼロで、1 秒未満で届きます。`--deliver` に `log` 以外の実際の配信先を指定する必要があります。 |
| `--script` | `~/.hermes/scripts/` に置いた絞り込み・変換用のスクリプト。webhook のペイロードが JSON として標準入力に渡され、標準出力の JSON がペイロードを置き換えます。標準出力が空、`[SILENT]`、または終了コードがゼロ以外の場合、その webhook は無視されます。[スクリプトによる絞り込みと変換](/hermes/docs/user-guide/messaging/webhooks/#script-filters-and-transforms) をご覧ください。 |

登録内容は `~/.hermes/webhook_subscriptions.json` に保存され、ゲートウェイを再起動しなくても webhook のアダプタが読み直します。

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

Hermes の設定全体を、短いプレーンテキストにまとめて出力します。助けを求めるときに Discord や GitHub の issue、Telegram へそのまま貼り付けられるよう作られています。ANSI の色も特別な書式もなく、データだけが並びます。

| オプション | 説明 |
|--------|-------------|
| `--show-keys` | `set` / `not set` だけでなく、伏せ字にした API キーの前後（先頭と末尾の 4 文字）を表示します。 |

### 何が含まれるか {#what-it-includes}

| 区画 | 内容 |
|---------|---------|
| **ヘッダー** | Hermes のバージョン、公開日、git のコミットハッシュ |
| **環境** | OS、Python のバージョン、OpenAI SDK のバージョン |
| **識別情報** | 有効なプロファイル名、HERMES_HOME のパス |
| **モデル** | 設定されている既定のモデルとプロバイダ |
| **ターミナル** | バックエンドの種類（local、docker、ssh など） |
| **API キー** | 22 種類のプロバイダ / ツールの API キーがあるかどうか |
| **機能** | 有効なツールセット、MCP サーバーの数、メモリの提供元 |
| **サービス** | ゲートウェイの状態、設定済みのメッセージングのプラットフォーム |
| **仕事量** | cron の仕事の数、導入済みスキルの数 |
| **設定の上書き** | 既定と違う設定値 |

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

### どんなときに使うか {#when-to-use}

- GitHub に不具合を報告するとき — 出力を issue に貼り付ける
- Discord で助けを求めるとき — コードブロックで共有する
- 自分の設定を誰かのものと見比べるとき
- うまく動かないときの手早い確認

:::tip
`hermes dump` は共有のために作られています。対話的に診断したいときは `hermes doctor`、見た目で全体を把握したいときは `hermes status` を使ってください。
:::

## `hermes debug` {#hermes-debug}

```bash
hermes debug share [options]
```

デバッグ用のレポート（システム情報と最近のログ）をペーストサービスにアップロードし、共有できる URL を受け取ります。手早く助けを求めたいときに便利で、相手が問題を切り分けるのに必要なものが揃っています。

| オプション | 説明 |
|--------|-------------|
| `--lines <N>` | ログファイルごとに含めるログの行数（既定: 200）。 |
| `--expire <days>` | ペーストの有効期限を日数で指定します（既定: 7）。 |
| `--nous` | 公開のペーストサービスではなく、Nous 内部の診断用の保管場所へアップロードします。Nous のサポートから非公開の診断一式を求められたときに使ってください。 |
| `--local` | アップロードせず、レポートを手元に表示します。 |
| `--no-redact` | アップロード時の秘密の伏せ字を無効にします。既定ではアップロードは伏せ字になります。 |

レポートには、システム情報（OS、Python のバージョン、Hermes のバージョン）、最近のエージェント・ゲートウェイ・GUI / ダッシュボード・デスクトップのログ（1 ファイルあたり 512 KB まで）、伏せ字にした API キーの状態が含まれます。既定ではアップロードは伏せ字になるので、秘密が含まれることはありません。

既定では、公開のペーストサービスを paste.rs、dpaste.com の順に試します。`--nous` を付けると同じデバッグ一式を Nous の非公開の診断用保管場所へアップロードします。返される閲覧用リンクは Nous のチームのためのもので、14 日後に自動で消えます。

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

Hermes の設定、スキル、セッション、データを zip にまとめます。hermes-agent のコード自体は含めず、以前のバックアップの成果物（`backups/`、`state-snapshots/`）を入れ子にすることもありません。それぞれがすでに自分用の `state.db` の写しを持っているからです。

| オプション | 説明 |
|--------|-------------|
| `-o`, `--output <path>` | zip ファイルの出力先（既定: `~/hermes-backup-<timestamp>.zip`）。 |
| `-q`, `--quick` | 手早いスナップショット。重要な状態ファイル（config.yaml、state.db、.env、認証情報、cron の仕事）だけを対象にします。完全なバックアップよりずっと速く終わります。 |
| `-l`, `--label <name>` | スナップショットのラベル（`--quick` のときだけ使われます）。 |
| `-k`, `--keep <N>` | 完全なバックアップのあと、出力先ディレクトリにある `hermes-backup-*.zip` を新しいものから N 個だけ残し、それより古いものを削除します（既定は 3。`0` ならすべて残します）。自分で名前を付けた zip には手を付けません。 |

バックアップは SQLite の `backup()` API を使って安全に写すので、Hermes が動いている最中でも正しく動きます（WAL モードでも大丈夫です）。

**zip に入らないもの:**

- `*.db-wal`、`*.db-shm`、`*.db-journal` — SQLite の WAL / 共有メモリ / ジャーナルの付随ファイル。`*.db` 本体は `sqlite3.backup()` で一貫したスナップショットを取っているので、動作中の付随ファイルを一緒に持っていくと、復元したときに中途半端な状態が見えてしまいます。
- `checkpoints/` — セッションごとの経過のキャッシュ。ハッシュを鍵にしてセッションごとに作り直されるもので、そもそも別の環境へきれいに移せません。
- `~/.hermes` 直下（および各 `profiles/<name>/` 直下）の `models/`、`runtimes/`、`node/` — 作り直せる実行用のダウンロードで、数十 GB になることもよくあります。もっと深い場所にある同じ名前のディレクトリ（スキルの `models/` など）は残します。
- 同じ直下にある `cache/` のうち、作り直せる項目 — モデルやプラグインの一覧、スタンプ、ブラウザのプロファイル、ツール出力のあふれ分などです。残しておくべき成果物は含めます: `cache/images`、`cache/audio`、`cache/videos`、`cache/documents`、`cache/screenshots`（届けたメディアや受け取ったメディア）と `cache/citations`（根拠付き引用の台帳）。もっと深い場所にある `cache/`（スキルの中など）は丸ごと残します。
- Unix ソケット、デバイス、シンボリックリンク — zip には入れられません。除外される前は、紛れ込んだ `gateway.sock` のせいで、フルバックアップのたびに `Backup incomplete` と報告されていました。
- `hermes-agent` のコード自体（これは利用者のデータのバックアップであって、リポジトリのスナップショットではありません）。

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

`~/.hermes/checkpoints/` にある影の git 保管場所 — セッション内の `/rollback` コマンドを支える保存層 — を確認・管理します。いつ実行しても安全で、エージェントが動いている必要もありません。

| サブコマンド | 説明 |
|------------|-------------|
| `status`（既定） | 全体の容量、プロジェクト数、プロジェクトごとの内訳を表示します。`hermes checkpoints` を素で実行するのと同じです。 |
| `list` | `status` の別名です。 |
| `prune` | 掃除を強制的に一巡させます。行き場を失ったプロジェクトや古いプロジェクトを削除し、保管場所を整理し、容量の上限を守らせます。24 時間の重複防止の印は無視します。 |
| `clear` | チェックポイントの土台をまるごと削除します。元に戻せません。`-f` がなければ確認を求めます。 |
| `clear-legacy` | v1 から v2 への移行で作られた `legacy-<timestamp>/` の保管分だけを削除します。 |

### オプション {#options}

| オプション | サブコマンド | 説明 |
|--------|------------|-------------|
| `--limit N` | `status`, `list` | 並べるプロジェクトの最大数（既定 20）。 |
| `--retention-days N` | `prune` | `last_touch` が N 日より古いプロジェクトを捨てます（既定 7）。 |
| `--max-size-mb N` | `prune` | 行き場を失ったものと古いものを片付けたあと、保管場所全体が N MB 以下になるまで、プロジェクトごとにいちばん古いコミットを捨てます（既定 500）。 |
| `--keep-orphans` | `prune` | 作業ディレクトリが無くなったプロジェクトを削除しません。 |
| `-f`, `--force` | `clear`, `clear-legacy` | 確認を省きます。 |

### 例 {#examples}

```bash
hermes checkpoints                                  # status overview
hermes checkpoints prune --retention-days 3         # aggressive cleanup
hermes checkpoints prune --max-size-mb 200          # tighten size cap once
hermes checkpoints clear-legacy -f                  # drop v1 archive dirs
hermes checkpoints clear -f                         # wipe everything
```

仕組みの全体像とセッション内のコマンドについては [チェックポイントと `/rollback`](/hermes/docs/user-guide/checkpoints-and-rollback/) をご覧ください。

## `hermes import` {#hermes-import}

```bash
hermes import <zipfile> [options]
```

以前に作った Hermes のバックアップを、Hermes のホームディレクトリへ復元します。書庫の中のファイルはすべて、ホームにある既存のファイルを上書きします。`--force` は、対象にすでに Hermes が入っているときに出る確認を省くだけのものです。

| オプション | 説明 |
|--------|-------------|
| `-f`, `--force` | 既存の導入環境についての確認を省きます。 |

:::warning
動作中のプロセスとぶつからないよう、取り込む前にゲートウェイを止めてください。
:::

### SQLite のデータベース {#sqlite-databases}

`.db` のファイル（`state.db`、`kanban.db`、`response_store.db` など）は、普通のファイルのように名前の付け替えで置き換えたりはしません。名前を付け替えるとファイルの inode が入れ替わりますが、ゲートウェイやダッシュボード、WebUI のプロセスがまだ古いほうを開いたままだと、そのプロセスは取り込み前のページを読み続け、誰にも見えないセッションを書き続けます。そしてそれらのセッションは、次に誰かが開くデータベースには単に存在しません — しかも何のログも残りません。そこで、取り込んだページは `/snapshot restore` と同じやり方で **既存のデータベースファイルの中へ** 書き込まれ、開いているすべての接続が取り込んだデータに揃います。

動作中のデータベースを安全に置き換えられない場合 — ページの写しに失敗し、*かつ* 別のプロセスがそのファイルを開いたままの場合 — 取り込みはそのデータベースに手を付けず、`Warnings (N files skipped)` として並べます。掴んでいるプロセスを止めて、もう一度実行してください。

新しい作業の上に古いバックアップを取り込むこともできますが、もう黙って行われることはありません。取り込んだ `state.db` に含まれるメッセージが、置き換えられるほうより少ない場合は、まとめにこう表示されます。

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

Hermes のログファイルを表示・追尾・絞り込みします。ログはすべて `~/.hermes/logs/`（既定以外のプロファイルでは `<profile>/logs/`）に置かれます。

### ログファイル {#log-files}

| 名前 | ファイル | 何が記録されるか |
|------|------|-----------------|
| `agent`（既定） | `agent.log` | エージェントの活動すべて — API 呼び出し、ツールの割り当て、セッションの一生（INFO 以上） |
| `errors` | `errors.log` | 警告とエラーだけ — agent.log を絞り込んだもの |
| `gateway` | `gateway.log` | メッセージングのゲートウェイの活動 — プラットフォームへの接続、メッセージの割り当て、webhook の出来事 |
| `gui` | `gui.log` | ダッシュボード / TUI ゲートウェイ / PTY ブリッジ / websocket の出来事 |
| `desktop` | `desktop.log` | Electron のデスクトップアプリ — 起動、バックエンド立ち上げの出力、最近の Python のトレースバック |

### オプション {#options}

| オプション | 説明 |
|--------|-------------|
| `log_name` | 見たいログ: `agent`（既定）、`errors`、`gateway`。`list` と書くと、使えるファイルを容量つきで並べます。 |
| `-n`, `--lines <N>` | 表示する行数（既定: 50）。 |
| `-f`, `--follow` | `tail -f` のように、ログを実時間で追いかけます。Ctrl+C で止まります。 |
| `--level <LEVEL>` | 表示する最低のログ水準: `DEBUG`、`INFO`、`WARNING`、`ERROR`、`CRITICAL`。 |
| `--session <ID>` | セッション ID の一部を含む行だけに絞ります。 |
| `--since <TIME>` | いまから遡った時間の行を表示します: `30m`、`1h`、`2d` など。`s`（秒）、`m`（分）、`h`（時間）、`d`（日）が使えます。 |
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

絞り込みは組み合わせられます。複数の条件が効いているときは、**すべて** を満たした行だけが表示されます。

```bash
# WARNING+ lines from the last 2 hours containing session "tg-12345"
hermes logs --level WARNING --since 2h --session tg-12345
```

時刻として読み取れない行は、`--since` が効いているときも表示されます（複数行にまたがるログの続きの行かもしれないからです）。水準を判別できない行も、`--level` が効いているときは表示されます。

### ログの入れ替え {#log-rotation}

Hermes は Python の `RotatingFileHandler` を使っています。古いログは自動で入れ替わるので、`agent.log.1`、`agent.log.2` などを探してください。`hermes logs list` は、入れ替わったものも含めてすべてのログファイルを表示します。

## `hermes prompt-size` {#hermes-prompt-size}

```bash
hermes prompt-size [--platform <name>] [--json]
```

新しいセッションで固定的にかかるプロンプトの量 — 会話の中身が入る *前* に、毎回の API 呼び出しで送られるもの — を報告します。下流のアダプタやプロキシがモデルの文脈長より厳しい上限を持っている場合や、どの塊（スキル索引、メモリ、プロフィール）が大きいのかを見たい場合に便利です。

エージェントが作るのと同じシステムプロンプトを組み立て、それを分解して見せます。

- **システムプロンプト全体** — 組み立て終わったプロンプト全部（人格、指針、スキル
  索引、文脈ファイル、メモリ、プロフィール、時刻）。
- **スキル索引** — `<available_skills>` の塊。スキルをたくさん入れていると、たいてい
  ここがいちばん大きくなります。
- **メモリ** と **ユーザープロフィール** — `MEMORY.md` / `USER.md` の写し。
- **プロンプトの層** — stable / context / volatile。Hermes がキャッシュを効かせるために
  プロンプトを層に分ける区切りに対応します。
- **ツール定義** — 有効なすべてのツールの JSON（毎回送られる固定分のもう半分）。

すべてオフラインで動きます。API 呼び出しはなく、認証情報が無くても使えます。

```bash
# Human-readable breakdown for the CLI platform (default)
hermes prompt-size

# Simulate a messaging platform's prompt (different platform hint)
hermes prompt-size --platform telegram

# Machine-readable output for scripts
hermes prompt-size --json
```

:::tip
スキル索引とツール定義は、有効にしているスキルとツールの数に比例して大きくなります。
プロンプトを小さくするには、使っていないツールセットを無効にするか（`hermes tools`）、
要らないスキルを外してください（`hermes skills`）。いまいるディレクトリにある文脈ファイル
（AGENTS.md、.cursorrules）も全体の量に含まれます。
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
| `get <key> [--json]` | ドット区切りのキーで設定値を 1 つ表示します（例: `hermes config get model.default`）。`--json` を付けると機械で読める形になります。 |
| `set <key> <value>` | 設定値を書き込みます。 |
| `unset <key>` | 設定のキーを削除し、組み込みの既定値に戻します。 |
| `path` | 設定ファイルのパスを表示します。 |
| `env-path` | `.env` ファイルのパスを表示します。 |
| `check` | 足りない設定や古い設定を調べます。 |
| `migrate` | 新しく追加されたオプションを対話的に足します。 |

### キー名の中のドット {#dots-inside-key-names}

`hermes config set/get/unset` は `.` を入れ子の区切りとして扱いますが、実際のキー名には
ドットがそのまま入っているものが少なくありません — モデル ID（`grok-4.6`、`glm-5.3-flash`）、
Matrix の部屋 ID（`!room:example.org`）、版が付いたプロバイダ名などです。次の 2 つの決まりで
これらを指定できます。

- **すでにあるキーはそのまま扱えます。** 既存の対応表をたどるとき、ドットを含む残りの部分に
  そのまま一致する既存のキーがあれば、分割よりそちらが優先されます。
  `hermes config set providers.p.models.grok-4.6.supports_vision true` は
  本物の `grok-4.6` の項目を更新します（`get` / `unset` も同じように解決されます）。
- **ドットを含む新しいキーを作るときはエスケープが要ります。** ドットそのものはバックスラッシュで
  エスケープします: `hermes config set 'providers.p.models.grok-4\.7.context_length' 128000`
  と書くと、`grok-4.7` というキーがそのまま作られます。（シェルにバックスラッシュを残させるため、
  キーは引用符で囲んでください。）

エスケープせずに書き込んだ結果、既存のドット入りの兄弟キーを隠す入れ子の対応表ができてしまう場合（たとえば既存の `grok-4.6` の隣に `grok-4` を作る場合）、コマンドはエラーで失敗します。実行時に決して読まれない幽霊のような項目を黙って書き込むことはありません。

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
| `browse` | スキルの登録簿をページ送りで眺めます。 |
| `search` | スキルの登録簿を検索します。 |
| `install` | スキルを導入します。 |
| `inspect` | 導入せずにスキルの中身を下見します。 |
| `list` | 導入済みのスキルを並べます。 |
| `check` | 導入済みのハブのスキルに上流の更新がないか調べます。 |
| `update` | 上流に変更があれば、ハブのスキルを入れ直します。 |
| `audit` | 導入済みのハブのスキルを調べ直します。 |
| `uninstall` | ハブから導入したスキルを削除します。 |
| `reset` | `user_modified` と印が付いて固まった同梱スキルを、マニフェストの項目を消して元に戻します。`--restore` を付けると、利用者側の写しも同梱版で置き換えます。 |
| `opt-out` | 同梱スキルが、有効なプロファイルへ配られないようにします。`.no-bundled-skills` という印を書き込むので、インストーラも `hermes update` も同期処理も、同梱スキルを配りません。既定では安全で、ディスク上のものには何も触りません。`--remove` を付けると、すでに置かれている同梱スキルのうち **変更されていないもの** も削除します（利用者が編集したもの、ハブから入れたもの、手書きのスキルは決して削除されません。先に内容を見せて確認を求めます。`--yes` で省けます）。 |
| `opt-in` | `.no-bundled-skills` の印を消して `opt-out` を取り消し、次の `hermes update` で同梱スキルがまた配られるようにします。`--sync` を付けるとすぐ配り直します。 |
| `publish` | スキルを登録簿へ公開します。 |
| `snapshot` | スキルの設定を書き出し / 取り込みします。 |
| `tap` | 独自のスキルの取得元を管理します。 |
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
- `--force` は、他者製 / コミュニティのスキルに対する、危険ではない方針上の差し止めを越えられます。
- `--force` は `dangerous` という検査結果を越えることはできません。
- `--source skills-sh` は公開の `skills.sh` の一覧を検索します。
- `--source well-known` を使うと、`/.well-known/skills/index.json` を公開しているサイトを Hermes に指定できます。
- `--source browse-sh` は、サイトごとのブラウザ操作スキルを 200 以上そろえた [browse.sh](https://browse.sh) の目録を検索します。識別子は `browse-sh/airbnb.com/search-listings-ddgioa` のような形です。
- `http(s)://…/*.md` の URL を渡すと、`SKILL.md` と、`references/`、`templates/`、`scripts/`、`assets/`、`examples/` の下で明示的に参照されているファイルが導入されます。フロントマターに `name:` が無く、URL の末尾も識別子として使えない場合、対話的な端末では名前を尋ねます。対話できない場面（TUI の中の `/skills install`、ゲートウェイのプラットフォーム）では代わりに `--name <x>` が必要です。

## `hermes bundles` {#hermes-bundles}

```bash
hermes bundles <subcommand>
```

スキルバンドルは、複数のスキルを 1 つの `/<bundle-name>` スラッシュコマンドにまとめます。バンドルを呼ぶと、参照しているスキルがすべて 1 つの利用者メッセージにまとめて読み込まれます。保存先は `~/.hermes/skill-bundles/<slug>.yaml` です。YAML の書き方と振る舞いについては [スキルバンドル](/hermes/docs/user-guide/features/skills/#skill-bundles) をご覧ください。

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `list` | 導入済みのバンドルを並べます（サブコマンドを省いたときの既定） |
| `show <name>` | バンドル 1 つの名前・説明・スキル・ファイルのパスを表示します |
| `create <name>` | 新しいバンドルを作ります。`--skill <id>`（繰り返し可）を渡すか、省略して対話的に入力します。`--description`、`--instruction`、`--force` が使えます。 |
| `delete <name>` | バンドルのファイルを削除します |
| `reload` | `~/.hermes/skill-bundles/` を調べ直し、増えたバンドルと減ったバンドルを報告します |

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

チャットセッションでは、`/bundles` が導入済みのバンドルを並べ、`/<bundle-name>` が 1 つを読み込みます。

## `hermes curator` {#hermes-curator}

```bash
hermes curator <subcommand>
```

curator は補助モデルによる裏方の仕事で、エージェントが作ったスキルを定期的に見直し、古びたものを整理し、重なっているものをまとめ、要らなくなったものを保管します。同梱スキルとハブから導入したスキルには決して触れません。保管したものは戻せますし、自動で削除されることもありません。

| サブコマンド | 説明 |
|------------|-------------|
| `status` | curator の状態とスキルの統計を表示します |
| `run` | いますぐ見直しを実行します（LLM の処理が終わるまで待ちます） |
| `run --background` | LLM の処理を裏のスレッドで始め、すぐに戻ります |
| `run --dry-run` | 下見だけです。何も変えずに見直しのレポートだけを作ります |
| `backup` | `~/.hermes/skills/` の tar.gz スナップショットを手動で取ります（curator も、実際に動かす前には毎回自動でスナップショットを取ります） |
| `rollback` | スナップショットから `~/.hermes/skills/` を戻します（既定はいちばん新しいもの） |
| `rollback --list` | 使えるスナップショットを並べます |
| `rollback --id <ts>` | ID を指定してスナップショットを戻します |
| `rollback -y` | 確認を省きます |
| `pause` | 再開するまで curator を止めます |
| `resume` | 止めていた curator を再開します |
| `pin <skill>` | スキルを固定し、curator が自動で状態を変えないようにします |
| `unpin <skill>` | スキルの固定を外します |
| `restore <skill>` | 保管したスキルを戻します |
| `archive <skill>` | スキルを手動で保管します |
| `prune` | curator が普段片付けるスキルを、手動で整理します |
| `list-archived` | 保管済みのスキルを並べます（`restore` で戻せます） |

新しく導入した直後は、最初の定期実行が `interval_hours` 1 回分（既定では 7 日）だけ先送りされます。`hermes update` のあと、最初の刻みでゲートウェイがすぐに整理を始めることはありません。そうなる前に様子を見たいときは `hermes curator run --dry-run` を使ってください。

振る舞いと設定については [Curator](/hermes/docs/user-guide/features/curator/) をご覧ください。

## `hermes moa` {#hermes-moa}

名前を付けた Mixture of Agents のプリセットを設定します。プリセットは、どのモデル選択画面でも `Mixture of Agents` というプロバイダの下に選べるモデルとして現れます。`/moa <prompt>` は、既定のプリセットでプロンプトを 1 つ実行します。

```bash
hermes moa list
hermes moa configure [name]
hermes moa delete <name>
```

`hermes moa configure` は、参照モデルとまとめ役のそれぞれについて、Hermes のプロバイダ → モデルの選択画面をそのまま使います。プリセットは実行のしかたの設定であって、主モデルやプロバイダではありません。

## `hermes fallback` {#hermes-fallback}

```bash
hermes fallback <subcommand>
```

フォールバックのプロバイダの並びを管理します。主モデルがレート制限・過負荷・接続のエラーで失敗したとき、フォールバックのプロバイダが順番に試されます。

| サブコマンド | 説明 |
|------------|-------------|
| `list`（別名: `ls`） | 現在のフォールバックの並びを表示します（サブコマンドを省いたときの既定） |
| `add` | プロバイダとモデルを選び（`hermes model` と同じ選択画面）、並びの末尾に足します |
| `remove`（別名: `rm`） | 並びから消す項目を選びます |
| `clear` | フォールバックの項目をすべて消します |

[フォールバックプロバイダ](/hermes/docs/user-guide/features/fallback-providers/) をご覧ください。

## `hermes hooks` {#hermes-hooks}

```bash
hermes hooks <subcommand>
```

`~/.hermes/config.yaml` に書かれたシェルスクリプトのフックを確認し、作り物のペイロードで試し、`~/.hermes/shell-hooks-allowlist.json` にある初回利用の同意リストを管理します。

| サブコマンド | 説明 |
|------------|-------------|
| `list`（別名: `ls`） | 設定済みのフックを、対象条件・制限時間・同意状況とともに並べます |
| `test <event>` | `<event>` に一致するすべてのフックを、作り物のペイロードで動かします |
| `revoke`（別名: `remove`、`rm`） | あるコマンドの許可リストの項目を消します（次の再起動から効きます） |
| `doctor` | 設定済みのフックを 1 つずつ調べます。実行ビット、許可リスト、更新時刻のずれ、JSON の正しさ、作り物のペイロードで動かしたときの所要時間を見ます |

出来事の種類とペイロードの形については [フック](/hermes/docs/user-guide/features/hooks/) をご覧ください。

## `hermes memory` {#hermes-memory}

```bash
hermes memory <subcommand>
```

外部メモリの提供元プラグインを設定・管理します。使える提供元は honcho、openviking、mem0、hindsight、holographic、retaindb、byterover、supermemory です。外部の提供元は一度に 1 つしか使えません。組み込みのメモリ（MEMORY.md / USER.md）は常に有効です。

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `setup` | 提供元を対話的に選んで設定します。 |
| `status` | 現在のメモリ提供元の設定を表示します。 |
| `off` | 外部の提供元を無効にします（組み込みだけになります）。 |

:::info 提供元ごとのサブコマンド
外部メモリの提供元が有効なとき、その提供元が固有の管理用として `hermes <provider>` というトップレベルのコマンドを登録することがあります（Honcho が有効なときの `hermes honcho` など）。有効でない提供元はサブコマンドを出しません。いま何が組み込まれているかは `hermes --help` で確認できます。
:::

## `hermes acp` {#hermes-acp}

```bash
hermes acp
```

エディタ連携のため、Hermes を ACP（Agent Client Protocol）の stdio サーバーとして起動します。

関連する入口:

```bash
hermes-acp
python -m acp_adapter
```

先に対応する部品を入れてください:

```bash
cd ~/.hermes/hermes-agent && uv pip install -e '.[acp]'
```

[ACP によるエディタ連携](/hermes/docs/user-guide/features/acp/) と [ACP の内部](/hermes/docs/developer-guide/acp-internals/) をご覧ください。

## `hermes mcp` {#hermes-mcp}

```bash
hermes mcp <subcommand>
```

MCP（Model Context Protocol）サーバーの設定を管理し、Hermes 自体を MCP サーバーとして動かします。

| サブコマンド | 説明 |
|------------|-------------|
| *(なし)* または `picker` | 対話的な目録の選択画面です。Nous が承認した MCP を眺め、導入・有効化・無効化します。 |
| `catalog` | Nous が承認した MCP を並べます（プレーンテキストで、スクリプトから扱えます）。 |
| `install <name>` | 目録の項目を導入します（例: `hermes mcp install n8n`）。 |
| `serve [-v\|--verbose]` | Hermes を MCP サーバーとして動かし、会話を他のエージェントへ見せます。 |
| `add <name> [--url URL] [--command CMD] [--auth oauth\|header] [--args ...]` | 独自の MCP サーバーを足します。ツールは自動で見つかります。`--args` は残りの引数を stdio のコマンドへ渡すので、いちばん最後に置いてください。 |
| `remove <name>`（別名: `rm`） | MCP サーバーを設定から外します。 |
| `list`（別名: `ls`） | 設定済みの MCP サーバーを並べます。 |
| `test <name>` | MCP サーバーへの接続を試します。 |
| `configure <name>`（別名: `config`） | サーバーごとに使うツールを切り替えます。 |
| `login <name>` | OAuth を使う MCP サーバーの認証をやり直させます。 |

[MCP 設定の早見表](/hermes/docs/reference/mcp-config-reference/)、[Hermes で MCP を使う](/hermes/docs/guides/use-mcp-with-hermes/)、[MCP サーバーモード](/hermes/docs/user-guide/features/mcp/#running-hermes-as-an-mcp-server) をご覧ください。

## `hermes plugins` {#hermes-plugins}

```bash
hermes plugins [subcommand]
```

プラグイン管理をひとつにまとめたものです。一般のプラグイン、メモリの提供元、文脈エンジンをここで扱います。サブコマンドなしで `hermes plugins` を実行すると、2 つの区画からなる対話画面が開きます。

- **General Plugins** — 導入済みプラグインの有効・無効を、複数選択のチェックボックスで切り替えます
- **Provider Plugins** — メモリ提供元と文脈エンジンを 1 つずつ選んで設定します。項目の上で ENTER を押すとラジオ選択が開きます。

| サブコマンド | 説明 |
|------------|-------------|
| *(なし)* | 合わせ技の対話画面です。一般プラグインの切り替えと、提供元プラグインの設定を行います。 |
| `install <identifier> [--force] [--ref COMMIT_SHA] [--allow-removed]` | Hermes のプラグイン目録（項目名だけを書く）、Git の URL、または `owner/repo` の短縮形からプラグインを導入します。目録の名前は、その項目のリポジトリを 40 桁 16 進のコミット SHA で固定した状態に解決され、宣言されている機能の要約を表示し、`.hermes-catalog.json` という付随ファイルに目録の出どころを記録します。生の URL は独自（未審査）の取得元として印が付き、`--ref`（40 文字のコミット SHA 全体）で固定できます。`--allow-removed`（危険）は、削除済みプラグインの禁止リストを迂回します。 |
| `search [term] [--json]` | Hermes のプラグイン目録を検索します（項目名・説明・宣言されたツールに一致します。`term` を省くとすべて並びます）。目録はリポジトリ内（`plugin-catalog/`）で手入れされ、6 時間のキャッシュで実物のリポジトリから更新され、オフラインではツリー内の写しに戻ります。目録に載っている＝監査済み、ではありません。受け入れで見ているのは項目であって、コードではありません。 |
| `update <name>` | 固定していない導入済みプラグインの最新の変更を取得します。固定したプラグインを動かすには、`--force --ref <new-commit>` で入れ直す必要があります。 |
| `remove <name>`（別名: `rm`、`uninstall`） | 導入済みのプラグインを削除します。 |
| `enable <name>` | 無効なプラグインを有効にします。 |
| `disable <name>` | プラグインを削除せずに無効にします。 |
| `list`（別名: `ls`） | 導入済みのプラグインを、有効・無効とともに並べます。 |
| `doctor [path-or-id] [--ci]` | ネイティブのプラグインを、本物のマニフェスト解析・読み込み・登録の経路に通して検証します。`--ci` はエラー時に 1 で終了します。 |
| `pack install <path-or-url> [--force]` | プラグインパック（`hermes-pack.yaml`）を導入します。これは、それぞれが 40 文字のコミット SHA で正確に固定されたプラグインの宣言的な一式です。必ず確認画面（すべてのプラグイン、取得元、固定した参照、宣言された機能）を表示し、パックの中身についての確認を 1 回求めたうえで、普通の固定つき導入を実行します。各プラグインが宣言する機能は、これまでどおりプラグインごとの同意を通ります。パックがまとめて権限を与えることはありません。一部が失敗した場合はプラグインごとに報告し、1 つでも失敗すればゼロ以外で終了します。対話専用です（`--yes` はありません）。 |
| `pack export [--enabled-only] [--name NAME]` | いまの導入内容からパックの YAML を標準出力に出します。git から入れた各プラグインのリポジトリと正確な SHA に加え、秘密を除いた `plugins.entries` の設定が含まれます。手元だけのプラグイン（git の出どころが無いもの）は警告のコメントとして並び、導入できる項目にはなりません。秘密、機能の許可、`allow_*` の関門は必ず取り除かれます。 |
| `pack show <path-or-url>` | 下見です。何も導入せずにパックを解析・検証して表示します。 |

提供元プラグインの選択は `config.yaml` に保存されます。
- `memory.provider` — 有効なメモリ提供元（空なら組み込みのみ）
- `context.engine` — 有効な文脈エンジン（`"compressor"` が組み込みの既定）

一般プラグインの無効リストは `config.yaml` の `plugins.disabled` に置かれます。
git からの導入では、プロファイル内の `plugins/.install-metadata.json` という付随ファイルに、
正式な取得元、実際に入れた版、固定の有無だけを記録します。ここに
プラグインの設定、環境の値、秘密、機能の許可は含まれません。

[プラグイン](/hermes/docs/user-guide/features/plugins/) と [Hermes のプラグインを作る](/hermes/docs/developer-guide/plugins/) をご覧ください。

## `hermes tools` {#hermes-tools}

```bash
hermes tools [--summary]
```

| オプション | 説明 |
|--------|-------------|
| `--summary` | いま有効なツールのまとめを表示して終了します。 |

`--summary` を付けない場合は、プラットフォームごとのツール設定を対話的に行う画面が開きます。

## `hermes computer-use` {#hermes-computer-use}

```bash
hermes computer-use <subcommand>
```

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `install` | 上流の cua-driver のインストーラを実行します（macOS、Windows、Linux）。 |
| `install --upgrade` | cua-driver がすでに PATH にあってもインストーラを実行し直します。上流のスクリプトは常に最新版を取ってくるので、これはその場での更新になります。 |
| `status` | `cua-driver` が `$PATH` にあるか、どの版が入っているかを表示します。 |
| `doctor [--include CHECK] [--skip CHECK] [--json]` | cua-driver の健康診断を実行し、環境ごとの確認結果を表示します。 |
| `permissions status [--json]` | macOS のアクセシビリティと画面収録の許可状況を報告します。 |
| `permissions grant` | Cua Driver にアクセシビリティと画面収録の許可を与えるよう macOS に求めます。 |

`hermes computer-use install` は、`computer_use` ツールセットが使う
[cua-driver](https://github.com/trycua/cua) のバイナリを入れるための安定した入口です。
Computer Use を最初に有効にしたときに `hermes tools` が呼ぶのと同じ上流のインストーラを
実行するので、ツールセットの切り替えでインストールが動かなかった場合（たとえば
設定済みの方が改めて設定するときなど）に、入れ直す用途で安心して使えます。

cua-driver がすでにある場合、Hermes はその版と実行時のマニフェストを確認します。
0.20.0 以上の互換性のある導入はそのまま残します。古かったり足りていない標準の導入は、
いまの上流のインストーラで直します。`HERMES_CUA_DRIVER_CMD` で選んだ独自のバイナリを
Hermes が置き換えることはありません。そのバイナリを直接更新するか、上書き設定を外してください。
直す必要があるときは `hermes computer-use status` が知らせます。

組み込みの `computer_use` ツールセットが、おすすめの Hermes 連携です。
Cua の低水準のツール語彙が必要なときは、生の Cua MCP ツールを登録するという手もあります。
`cua-driver skills install` は Hermes を見つけると、Cua のスキル一式を
Hermes のスキルディレクトリへ自動でつなぎます。

権限のモードと機能マニフェストの承認は、実行時の起動に属します。制限つきのモードでは、Hermes は Cua の正式な
`--capability-manifest` と `--approve-capability-manifest` のフラグを渡します。どの MCP の
経路も、自分の実行環境の中に専用の一生分のセッションを持ちます。公開されるセッション名は
カーソルとセッションの状態に名前を付けるだけで、実行環境を所有も共有もしません。

cua-driver が PATH にあれば、`hermes update` は更新の最後に上流のインストーラを
自動で実行し直します。ですから多くの方は `--upgrade` を手で呼ぶ必要はありません。
上流が出した修正を、次の Hermes の更新を待たずにいますぐ取り込みたいときに使ってください。

## `hermes pets` {#hermes-pets}

```bash
hermes pets <list|install|select|show|off|scale|remove|doctor>
```

[Petdex](https://github.com/crafter-station/petdex) は、コーディングエージェント向けのアニメーションするドット絵ペットを集めた公開ギャラリーです。1 匹入れると、Hermes は CLI・TUI・デスクトップアプリでエージェントの動きに反応するペットを見せてくれます。

| サブコマンド | 説明 |
|------------|-------------|
| `list` | petdex のギャラリーを眺めます。 |
| `install` | ギャラリーからペットを入れます。 |
| `select` | 使うペットを決めます（`display.pet.*` に書き込みます）。 |
| `show` | 使っているペットを端末でアニメーションさせます。 |
| `off` | ペットの表示をやめます。 |
| `scale` | ペットの大きさをどこでも変えます（`display.pet.scale`）。 |
| `remove` | 入れたペットを削除します。 |
| `doctor` | ペットの設定と、端末のグラフィック対応を調べます。 |

`/hatch` スラッシュコマンドを使うと、文章での説明からまったく新しいペットを生み出すこともできます。[ペット](/hermes/docs/user-guide/features/pets/) をご覧ください。

## `hermes sessions` {#hermes-sessions}

```bash
hermes sessions <subcommand>
```

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `list` | 最近のセッションを並べます。 |
| `browse` | 検索と再開ができる対話的なセッション選択画面です。各行には、そのセッションの最後のメッセージから導いた状態のタグ（`done` / `intr` / `err` / `empty`）とメッセージ数が出ます。検索の絞り込みが空のときに選択中の行で `d` を押すと、y/N の確認のあとそのセッションを削除します。絞り込みが効いているときの `d` は検索文字列への入力になります。 |
| `export <output> [--session-id ID]` | セッションを JSONL に書き出します。 |
| `delete <session-id>` | セッションを 1 つ削除します。 |
| `prune` | 条件に合うセッションを削除します。時間の範囲は `--older-than` / `--newer-than` / `--before` / `--after`（`5h` / `2d` のような長さ、日数だけの指定、ISO 形式の時刻）。属性は `--source`、`--title`、`--model`、`--provider`、`--branch`、`--end-reason`、`--user`、`--chat-id`、`--chat-type`、`--cwd`。数値の範囲は `--min/--max-messages`、`--min/--max-tokens`、`--min/--max-cost`、`--min/--max-tool-calls`。さらに `--include-archived`、`--dry-run`、`--yes` があります。既定は 90 日より古いものです。 |
| `archive` | `prune` と同じ条件に合うセッションをまとめて保管します（隠すだけで、削除はしません）。条件を最低 1 つ指定する必要があります。 |
| `stats` | セッションの保管に関する統計を表示します。 |
| `rename <session-id> <title>` | セッションのタイトルを付ける、または変えます。 |
| `optimize` | ディスクの空きを取り戻します。FTS5 の索引の断片をまとめ、VACUUM します。何も壊さず、セッションのデータは変わりません。 |
| `optimize-storage` | 全文検索の索引を、中身を外に持つ小さな v23 の配置へ移します。大きなデータベースでは `state.db` のかなりの部分が空きます。 |
| `repair` | 壊れた `state.db` のスキーマ（`table messages_fts already exists` など）を直し、隠れていたセッションが再び見えるようにします。先に控えを取ります。 |
| `repair-routing` | 経路の識別情報を失ったセッション行に取り残された、ゲートウェイの会話をつなぎ直します（再起動のあとチャットが「時間を巻き戻したように見える」現象）。既定は下見だけで、`--apply` を付けると引き取りを実行します（先にゲートウェイを止めてください）。`--max-gap-seconds N` で連続とみなす幅を調整します。曖昧さのない場合だけを直します。[セッション → 取り残されたゲートウェイセッションを直す](/hermes/docs/user-guide/sessions/#repair-stranded-gateway-sessions) をご覧ください。 |
| `recover` | 壊れた `state.db` を、オフラインかつ何も壊さない形で別のきれいなデータベースへ救い出します。 |
| `retitle-skills` | `/skill` で始めたセッションのタイトルを、利用者が実際に入力した内容をもとに付け直します。`--apply` を付けない限り、変更点を並べるだけです。 |

## `hermes insights` {#hermes-insights}

```bash
hermes insights [--days N] [--source platform]
```

| オプション | 説明 |
|--------|-------------|
| `--days <n>` | 直近 `n` 日を分析します（既定: 30）。 |
| `--source <platform>` | `cli`、`telegram`、`discord` などの発生元で絞ります。 |

## `hermes claw` {#hermes-claw}

```bash
hermes claw migrate [options]
```

OpenClaw の設定を Hermes へ移します。`~/.openclaw`（または指定したパス）から読み、`~/.hermes` へ書きます。古いディレクトリ名（`~/.clawdbot`、`~/.moltbot`）や設定ファイル名（`clawdbot.json`、`moltbot.json`）も自動で見つけます。

| オプション | 説明 |
|--------|-------------|
| `--dry-run` | 何も書かずに、何が移されるかを下見します。 |
| `--preset <name>` | 移行のひな形: `full`（互換性のある設定すべて）または `user-data`（基盤まわりの設定を除く）。どちらのひな形も秘密は取り込みません。`--migrate-secrets` を明示してください。 |
| `--overwrite` | ぶつかったときに既存の Hermes のファイルを上書きします（既定では、計画に衝突があれば適用を拒みます）。 |
| `--migrate-secrets` | API キーも移します。`--preset full` のときでも必要です。 |
| `--no-backup` | 移行前に `~/.hermes/` の zip スナップショットを取りません（既定では、適用前に復元用の書庫を 1 つ `~/.hermes/backups/pre-migration-*.zip` に書きます。`hermes import` で戻せます）。 |
| `--source <path>` | OpenClaw のディレクトリを指定します（既定: `~/.openclaw`）。 |
| `--workspace-target <path>` | ワークスペースの指示（AGENTS.md）の書き込み先ディレクトリ。 |
| `--skill-conflict <mode>` | スキル名がぶつかったときの扱い: `skip`（既定）、`overwrite`、`rename`。 |
| `--yes` | 確認を省きます。 |

### 何が移るのか {#what-gets-migrated}

移行は、人格、メモリ、スキル、モデルの提供元、メッセージングのプラットフォーム、エージェントの振る舞い、セッションの方針、MCP サーバー、TTS など 30 以上の分野に及びます。各項目は、Hermes の対応物へ **そのまま取り込まれる** か、手で見直すために **保管される** かのどちらかです。

**そのまま取り込まれるもの:** SOUL.md、MEMORY.md、USER.md、AGENTS.md、スキル（4 つの取得元ディレクトリ）、既定のモデル、独自のプロバイダ、MCP サーバー、メッセージングのプラットフォームのトークンと許可リスト（Telegram、Discord、Slack、WhatsApp、Signal、Matrix、Mattermost）、エージェントの既定値（推論の強さ、圧縮、人らしい間、タイムゾーン、サンドボックス）、承認のルール、TTS の設定、ブラウザの設定、ツールの設定、実行の制限時間、コマンドの許可リスト、ゲートウェイの設定、3 つの取得元からの API キー。

**手で見直すために保管されるもの:** cron の仕事、プラグイン、フック / webhook、メモリのバックエンド（QMD）、スキル登録簿の設定、UI / 識別情報、ログ、複数エージェントの構成、チャンネルの結び付け、IDENTITY.md、TOOLS.md、HEARTBEAT.md、BOOTSTRAP.md。

**API キーの解決** は、3 つの取得元を優先順に見ます: 設定の値 → `~/.openclaw/.env` → `auth-profiles.json`。トークンの項目はどれも、素の文字列、環境変数のひな形（`${VAR}`）、SecretRef オブジェクトのいずれにも対応します。

設定キーの対応表、SecretRef の扱いの詳細、移行後の確認事項については、**[移行の手引き全文](/hermes/docs/guides/migrate-from-openclaw/)** をご覧ください。

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

**Claude Code**（`~/.claude`）または **OpenAI Codex CLI**（`~/.codex`）の設定を Hermes へ取り込みます。`CLAUDE.md` / `AGENTS.md` の指示はメモリの項目へ、`Bash(...)` の許可・拒否ルールは `command_allowlist` / `approvals.deny` へ、MCP サーバーは `config.yaml` の `mcp_servers` へ、スキルのディレクトリは `~/.hermes/skills/` へ対応づけられます。適用の前に必ず下見を出します。API キーや認証情報は決して取り込みません。

| オプション | 説明 |
| --- | --- |
| `agent` | `claude-code` または `codex`（既定: 自動判別）。 |
| `--source <path>` | 取得元のディレクトリを指定します（既定: `~/.claude` または `~/.codex`）。 |
| `--dry-run` | 下見だけで、何も書きません。 |
| `--overwrite` | ぶつかった MCP サーバーやスキルを置き換えます（既定は飛ばします）。 |
| `--yes`, `-y` | 確認を省きます。 |

対応表の全体は **[取り込みの手引き](/hermes/docs/user-guide/import-from-other-agents/)** をご覧ください。

## `hermes serve` {#hermes-serve}

```bash
hermes serve [options]
```

Hermes の **バックエンドサーバー** を起動します。[デスクトップアプリ](/hermes/docs/user-guide/desktop/) やリモートのクライアントがつなぐ、JSON-RPC / WebSocket の入口です。`hermes dashboard` が動かすのと同じサーバーですが、**画面がありません**。ブラウザの UI を開くことは決してありません。デスクトップアプリは自分で `hermes serve` のバックエンドを立ち上げます。リモートのホストで画面なしのバックエンドが欲しいときに、このコマンドを直接使ってください。下の `hermes dashboard` と同じ `--host` / `--port` / `--insecure` / `--skip-build` / `--stop` / `--status` を受け取ります（ループバック以外に割り当てると、同じ認証の関門が働きます）。`[web]` の追加部品が必要で、組み込みのチャットのソケットには POSIX のホストで `[pty]` も要ります。

**ポートのぶつかり:** 指定したポート（既定 `9119`）を別のプロセス（もう 1 つの `hermes serve` やゲートウェイなど）が使っている場合、このコマンドは機械で読める合図の行 `BACKEND_PORT_IN_USE port=<port>` を標準出力に出し、掴んでいそうな相手を人向けに示し、汎用のエラーではなくコード **75**（`EX_TEMPFAIL`）で終了します。こうすることで、スクリプトやデスクトップアプリが「ポートが埋まっている」と「バックエンドが壊れている」を区別できます。空いている一時的なポートに割り当てるには `--port 0` を渡してください（起動に成功すると、選ばれたポートを `HERMES_BACKEND_READY port=<port>` で知らせます）。

## `hermes dashboard` {#hermes-dashboard}

```bash
hermes dashboard [options]
```

Web ダッシュボードを起動します。設定や API キーの管理、セッションの監視をブラウザで行う画面です。（ブラウザの UI を持たない画面なしのバックエンド — デスクトップアプリが立ち上げるようなもの — が欲しいときは、上の [`hermes serve`](#hermes-serve) を使ってください。）`cd ~/.hermes/hermes-agent && uv pip install -e ".[web]"`（FastAPI と Uvicorn）が必要です。ブラウザに組み込まれたチャットのタブはいつでも使えますが、加えて `pty` の追加部品（`cd ~/.hermes/hermes-agent && uv pip install -e ".[web,pty]"`）と、Linux・macOS・WSL2 のような POSIX の PTY 環境が必要です。詳しくは [Web ダッシュボード](/hermes/docs/user-guide/features/web-dashboard/) をご覧ください。

| オプション | 既定 | 説明 |
|--------|---------|-------------|
| `--port` | `9119` | Web サーバーを動かすポート |
| `--host` | `127.0.0.1` | 割り当てるアドレス |
| `--no-open` | — | ブラウザを自動で開きません |
| `--insecure` | 無効 | **非推奨で、何も起きません。** 以前はループバック以外に割り当てたときに認証を省くものでした。2026 年 6 月の強化以降、外部に開く割り当てでは *必ず* 認証の仕組み（パスワードか OAuth）が要ります。手元だけで使いたいときは `127.0.0.1` に割り当ててトンネルしてください。 |
| `--skip-build` | 無効 | Web UI のビルド手順を飛ばし、すでにある `dist` をそのまま配ります。npm が使えない、対話できない場面（Windows のタスクスケジューラ、CI）で便利です。`cd web && npm run build` で先にビルドしておいてください。 |
| `--isolated` | 無効 | 名前付きプロファイル（`worker dashboard`）から起動したとき、端末全体のダッシュボードへ回さず、そのプロファイル専用のサーバーを動かします。 |
| `--stop` | — | 動いている `hermes dashboard` のプロセスを止めて終了します。 |
| `--status` | — | 動いている `hermes dashboard` のプロセスを並べて終了します。 |

### `hermes dashboard register` {#hermes-dashboard-register}

この導入環境を、自分で立てたダッシュボードとして Nous Portal のアカウントに登録します。OAuth のクライアントを作り、`~/.hermes/.env` に `HERMES_DASHBOARD_OAUTH_CLIENT_ID` を書き込み、ログインの関門を働かせる方法を表示します。ログイン済み（`hermes setup`）である必要があります。

| オプション | 説明 |
|--------|-------------|
| `--name` | ダッシュボードにつける人向けの名札（既定: 自動生成）。 |
| `--redirect-uri` | 公開の HTTPS の OAuth リダイレクト URI（例: `https://hermes.example.com/auth/callback`）。localhost だけで使うなら省いてください。 |
| `--portal-url` | 登録に使う Nous Portal のベース URL を上書きします（既定: ログインした Portal）。`HERMES_DASHBOARD_PORTAL_URL` でも設定できます。 |

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

プロファイル — 設定・セッション・スキル・ホームディレクトリをそれぞれ別に持つ、互いに独立した複数の Hermes — を管理します。

| サブコマンド | 説明 |
|------------|-------------|
| `list` | すべてのプロファイルを並べます。 |
| `use <name>` | 既定のプロファイルを決めて、そのまま使い続けます。 |
| `create <name> [--clone] [--clone-all] [--clone-from <source>] [--no-alias]` | 新しいプロファイルを作ります。`--clone` は、いま有効なプロファイルから設定・`.env`・`SOUL.md`・スキル、そして手入れされた記憶ファイルの `MEMORY.md`/`USER.md` を写します。`--clone-all` は状態をすべて写します。`--clone-from` は写し元のプロファイルを指定し、`--clone-all` と併用しない限り設定の複製を含みます。 |
| `delete <name> [-y]` | プロファイルを削除します。 |
| `show <name>` | プロファイルの詳細（ホームディレクトリ、設定など）を表示します。 |
| `alias <name> [--remove] [--name NAME]` | プロファイルへ手早く入るためのラッパースクリプトを管理します。 |
| `rename <old> <new>` | プロファイルの名前を変えます。 |
| `export <name> [-o FILE]` | プロファイルを `.tar.gz` の書庫へ書き出します（手元のバックアップ）。 |
| `import <archive> [--name NAME]` | `.tar.gz` の書庫からプロファイルを取り込みます（手元での復元）。 |
| `install <source> [--name N] [--alias] [--force] [-y]` | git の URL か手元のディレクトリから、配布されたプロファイルを導入します。 |
| `update <name> [--force-config] [-y]` | 配布物を取得し直します。利用者のデータ（メモリ、セッション、認証情報）は残します。 |
| `info <name>` | プロファイルの配布マニフェスト（版、必要なもの、取得元）を表示します。 |

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

シェル補完のスクリプトを標準出力に出します。出力をシェルのプロファイルで読み込むと、Hermes のコマンド・サブコマンド・プロファイル名がタブで補完できるようになります。

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

最新の `hermes-agent` のコードを取得し、管理下の venv に依存関係を入れ直したうえで、導入後のフック（MCP サーバー、スキルの同期、補完の導入）を実行し直します。動いている環境で実行しても安全です。インストールせずに `origin/main` より遅れているかどうかだけを見たいときは `--check` を使ってください。

`hermes update` は、設定された更新用のブランチ（既定: `main`）を取得します。作業中のチェックアウトが別のブランチにある場合、Hermes は取得の前に更新用のブランチへ切り替えることがあります。ブランチでの作業を更新時の自動退避の流れの外に置いておきたいときは、更新の前にコミットしてください。

| オプション | 説明 |
|--------|-------------|
| `--gateway` | メッセージングの `/update` コマンドが使う内部用のモードです。端末の標準入力からではなく、ファイル経由のやり取りで確認と進捗を扱います。ゲートウェイを再起動するためのフラグではありません。 |
| `--check` | 取得もインストールも再起動もせずに、更新があるかどうかだけを調べます。 |
| `--plan` | 更新の計画を表示して、何も変えずに終了します。導入の種類（git / Docker / Nix / apt）、すべてのプロファイルで動いている Hermes のサービスとその監視役・動作中のコードの版、そしてそれぞれをどう再起動するかを示します。イメージやパッケージで管理された導入では、代わりに正しい外部の更新コマンドを教えます。読むだけです。 |
| `--no-backup` | `updates.pre_update_backup` の設定にかかわらず、この実行では更新前のバックアップ（手早い状態のスナップショットと完全な zip の両方）をすべて省きます。 |
| `--backup` | この実行で **完全な** 更新前バックアップを強制します。手早い状態のスナップショットに加えて、`HERMES_HOME` 全体の zip（設定、認証情報、セッション、スキル、ペアリングのデータ）を取ります。既定は `quick` — 軽い状態のスナップショットだけです。恒久的な動作は `config.yaml` の `updates.pre_update_backup: quick | full | off` で決めます。 |
| `--yes`, `-y` | 設定の移行や退避の復元といった確認に、すべて「はい」と答えます。API キーの入力は飛ばされるので、それらについては別途 `hermes config migrate` を実行してください。 |

そのほかの振る舞い:

- **ゲートウェイの再起動。** 更新に成功すると、Hermes は動いているすべてのゲートウェイのプロファイルを自動で再起動し、新しいコードを読ませようとします。更新を伴わずにゲートウェイだけ再起動したいときは `hermes gateway restart` を使ってください。
- **再起動の段階からの立て直し。** 取得したばかりのツリーを読み込んでいる最中に、プロセス内の再起動の段階が中断した場合、監視下のゲートウェイのプロファイルはきれいな Python のプロセスで試し直されます。systemd が独立に確認した再起動（`systemctl --user is-active`）だけが「検証済み」として報告されます。単に 0 で終了しただけの立ち上げ直しは `relaunch_attempted` として記録され、安全側に倒して更新は失敗扱いになります。手動のゲートウェイや serve / dashboard の実行は、立て直す権限が無いまま止められることはありません。理由を添えて「飛ばした」と記録され、正確な再起動のコマンドとともに未完了の更新の報告に残ります。
- **更新の控えと全体の版の確認。** 実行のたびに、機械で読める控えが `~/.hermes/logs/update_receipts/` に書かれます（更新前の全体計画、手順、飛ばした理由、再起動の結果。`latest.json` がいちばん新しいものを指します）。再起動の段階のあと、更新の仕組みは動いている各ゲートウェイのコードを更新後のチェックアウトと照らし合わせ、プロファイルごとの版の一覧を表示します。更新前のコードのままのゲートウェイがあれば、正確な再起動のコマンドとともに更新は失敗します（終了コード 1）。
- **手元のソースの変更。** git からの導入では、追跡されている変更済みファイルと未追跡のファイルが、ブランチの切り替えや取得の前に自動で退避されます（`git stash push --include-untracked`）。対話的な端末での更新では、退避を戻す前に確認します。対話できない更新では既定で戻します。取得に成功したあとで手元のソースの変更を捨ててよい管理下の環境でだけ、`updates.non_interactive_local_changes: discard` に設定してください。退避を戻すときに衝突したり、取得に失敗したりした場合、退避はそのまま残るので手で回収できます。
- **npm のロックファイルの揺れ。** 退避やブランチ切り替えの前に、Hermes は npm の install / build で生じた、追跡されている `package-lock.json` の差分をできる範囲で片付けます。意図してロックファイルを編集した場合は、`hermes update` の前にコミットするか手で退避してください。
- **ペアリングのデータのスナップショット。** `--backup` が無効でも、`hermes update` は `git pull` の前に `~/.hermes/pairing/` と Feishu のコメントのルールについて軽いスナップショットを取ります。編集していたファイルが取得で書き換えられた場合は、`hermes backup restore --state pre-update` で戻せます。
- **古い `hermes.service` の警告。** いまの `hermes-gateway.service` ではなく、改名前の `hermes.service` という systemd のユニットを見つけると、Hermes は移行の助言を一度だけ表示します。再起動が繰り返される問題を避けるためです。
- **終了コード。** 成功は `0`、取得 / インストール / 導入後の処理のエラーは `1`、`git pull` を妨げる予期しない作業ツリーの変更は `2` です。

## 保守のためのコマンド {#maintenance-commands}

| コマンド | 説明 |
|---------|-------------|
| `hermes --version` | バージョン情報を表示します。 |
| `hermes update` | 最新の変更を取得し、依存関係を入れ直します。 |

| `hermes uninstall [--full] [--gui] [--dry-run] [--yes]` | Hermes を削除します。必要なら設定やデータもすべて消せます。`--gui` はデスクトップのチャット GUI だけを削除し、エージェントは残します。`--full` は設定とデータも消します。`--dry-run` は何も変えずに削除される内容を表示します。`--yes` は確認を省きます。 |

## 関連 {#see-also}

- [スラッシュコマンド一覧](/hermes/docs/reference/slash-commands/)
- [CLI の使い方](/hermes/docs/user-guide/cli/)
- [セッション](/hermes/docs/user-guide/sessions/)
- [スキルの仕組み](/hermes/docs/user-guide/features/skills/)
- [スキンとテーマ](/hermes/docs/user-guide/features/skins/)
