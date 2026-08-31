---
title: "CLI コマンド早見表"
description: "Hermes のターミナルコマンドとコマンド群の公式な早見表"
upstream_path: reference/cli-commands.md
upstream_blob: 0d107524e73760fe36763fc1fbcf7a4f7ed242a2
sources:
  - https://hermes-agent.nousresearch.com/docs/reference/cli-commands
---

# CLI コマンド早見表 {#cli-commands-reference}

このページでは、シェルから実行する**ターミナルコマンド**をまとめています。

チャットの中で使うスラッシュコマンドについては、[スラッシュコマンド早見表](/hermes/docs/reference/slash-commands/)をご覧ください。

## 全体の入口 {#global-entrypoint}

```bash
hermes [global-options] <command> [subcommand/options]
```

### 全体オプション {#global-options}

| オプション | 説明 |
|--------|-------------|
| `--version`, `-V` | バージョンを表示して終了します。 |
| `--profile <name>`, `-p <name>` | この実行で使う Hermes プロファイルを選びます。`hermes profile use` で設定した既定のプロファイルより優先されます。 |
| `--resume <session>`, `-r <session>` | 以前のセッションを ID かタイトルで再開します。キーワード `latest` を指定すると直近のセッションを再開します(作業スペース単位で、`-c` と同じ探し方をします)。 |
| `--continue [name]`, `-c [name]` | 直近のセッション、またはタイトルが一致する直近のセッションを再開します。 |
| `--in <dir>` | 開始・再開の前に `<dir>` へ移動します。`--resume latest` / `-c` の検索範囲をそのディレクトリの作業スペースに絞り、セッションもそこに留めます(記録された作業ディレクトリへの復帰を行いません)。 |
| `--worktree`, `-w` | エージェントを並列で動かすために、隔離された git worktree で開始します。 |
| `--yolo` | 危険なコマンドの承認プロンプトを省略します。 |
| `--pass-session-id` | セッション ID をエージェントのシステムプロンプトに含めます。 |
| `--ignore-user-config` | `~/.hermes/config.yaml` を無視して組み込みの既定値を使います。`.env` の資格情報は読み込まれたままです。 |
| `--ignore-rules` | `AGENTS.md`、`SOUL.md`、`.cursorrules`、メモリ、事前ロードするスキルの自動注入を行いません。 |
| `--tui` | 従来の CLI ではなく [TUI](/hermes/docs/user-guide/tui/) を起動します。`HERMES_TUI=1` と同じ意味です。常に `display.interface` より優先されます。 |
| `--cli` | 従来の prompt_toolkit の REPL を強制します。`display.interface: tui` を今回の実行だけ上書きしたいときに使います。 |
| `--dev` | `--tui` と併用したとき、ビルド済みバンドルではなく TypeScript のソースを `tsx` で直接実行します(TUI の開発者向け)。 |

## トップレベルのコマンド {#top-level-commands}

| コマンド | 目的 |
|---------|---------|
| `hermes chat` | エージェントと対話、または 1 回だけのやり取りをします。 |
| `hermes model` | 既定のプロバイダとモデルを対話的に選びます。 |
| `hermes moa` | モデル選択画面から選べる、名前付きの Mixture of Agents プリセットを設定します。 |
| `hermes fallback` | 主モデルがエラーになったときに試すフォールバックプロバイダを管理します。 |
| `hermes gateway` | メッセージングのゲートウェイサービスを実行・管理します。 |
| `hermes proxy` | OAuth プロバイダの資格情報を付与するローカルの OpenAI 互換プロキシです。[サブスクリプションプロキシ](/hermes/docs/user-guide/features/subscription-proxy/)をご覧ください。 |
| `hermes egress` | リモートのターミナルサンドボックス向けの、外向き資格情報注入ファイアウォール(iron-proxy)です。既定では無効です。[送信プロキシ](/hermes/docs/user-guide/egress/iron-proxy/)をご覧ください。 |
| `hermes lsp` | Language Server Protocol の連携(write_file / patch 向けの意味解析による診断)を管理します。 |
| `hermes setup` | 設定の全体または一部を対話的に進めるセットアップウィザードです。 |
| `hermes whatsapp` | WhatsApp ブリッジを設定してペアリングします。 |
| `hermes whatsapp-cloud` | Meta 公式の WhatsApp Business Cloud API アダプタを設定します(ビジネスアカウントと公開 Webhook が必要です)。`hermes whatsapp`(Baileys による個人アカウントのブリッジ)とは別物です。 |
| `hermes slack` | Slack 向けの補助機能です(現時点では、全コマンドをネイティブのスラッシュコマンドとして持つアプリマニフェストを生成します)。 |
| `hermes auth` | 資格情報を管理します(追加・一覧・削除・リセット・状態表示・ログアウト)。Codex / Nous / Anthropic の OAuth フローもここで扱います。 |
| `hermes login` / `logout` | **非推奨** — 代わりに `hermes auth` を使ってください。 |
| `hermes send` | 設定済みのメッセージングプラットフォーム(Telegram、Discord、Slack、Signal、SMS など)へ 1 通だけメッセージを送ります。シェルスクリプト、cron ジョブ、CI フック、監視デーモンから使えます — エージェントのループも LLM も動きません。 |
| `hermes peer` | 別の端末で動く Hermes ゲートウェイをピアとして登録し、そのエージェントの正規の Bot Chat に DM を送ります(`hermes peer dm <peer>[/<agent>] "…"`)。端末をまたいだボット同士のやり取りを支える通信路です。 |
| `hermes secrets` | 外部のシークレット供給元(現時点では Bitwarden Secrets Manager)を管理し、`~/.hermes/.env` ではなくプロセス起動時に API キーを取り込みます。 |
| `hermes migrate` | `config.yaml` を診断し、必要なら書き換えて、廃止されたモデルや非推奨の設定への参照を置き換えます(例: `migrate xai`)。 |
| `hermes status` | エージェント・認証・プラットフォームの状態を表示します。 |
| `hermes cron` | cron スケジューラを確認し、手動で 1 回動かします。 |
| `hermes kanban` | 複数プロファイルで共同作業するためのボードです(タスク、依存関係、ディスパッチャ)。 |
| `hermes project` | 名前を付けた、複数フォルダにまたがる作業スペース(プロジェクト)を管理します。デスクトップのセッションのまとまりを決め、かんばんボードに紐づけるとタスクに worktree とブランチの決まった規約を与えます。状態はプロファイルごとに保持されます。 |
| `hermes webhook` | イベント起動のための動的な Webhook 購読を管理します。 |
| `hermes hooks` | `config.yaml` で宣言したシェルスクリプトのフックを確認・承認・削除します。 |
| `hermes doctor` | 設定と依存関係の問題を診断します。 |
| `hermes security audit` | venv、プラグインの依存関係、固定した MCP サーバーを対象に、必要なときサプライチェーン監査(OSV.dev)を行います。 |
| `hermes approvals` | 承認プロンプトの道具立てです — 承認の履歴から許可リストの案を掘り出します。 |
| `hermes dump` | サポートやデバッグ用に、そのままコピーして貼れる設定の要約を出します。 |
| `hermes prompt-size` | システムプロンプトとツールスキーマ(スキル索引、メモリ、プロフィール)のバイト内訳を表示します。オフラインで動きます。 |
| `hermes debug` | デバッグ用の道具立てです — サポート向けにログとシステム情報をアップロードします。 |
| `hermes backup` | Hermes のホームディレクトリを zip ファイルにバックアップします。 |
| `hermes checkpoints` | `~/.hermes/checkpoints/`(`/rollback` が使うシャドウ保管庫)を確認・整理・全消去します。引数なしで実行すると状態の概要が出ます。 |
| `hermes import` | zip ファイルから Hermes のバックアップを復元します。 |
| `hermes logs` | エージェント / ゲートウェイ / エラーのログファイルを表示・追尾・絞り込みします。 |
| `hermes config` | 設定ファイルの表示・編集・移行・問い合わせを行います。 |
| `hermes skin` | 表示スキンの一覧・切り替え・微調整を行います。 |
| `hermes console` | 安全な Hermes コマンドコンソールを開きます。 |
| `hermes pairing` | メッセージングのペアリングコードを承認・取り消しします。 |
| `hermes skills` | スキルの閲覧・インストール・公開・監査・設定を行います。 |
| `hermes bundles` | 複数のスキルを 1 つの `/<name>` スラッシュコマンドにまとめます。[スキルバンドル](/hermes/docs/user-guide/features/skills/#skill-bundles)をご覧ください。 |
| `hermes curator` | スキルを裏で保守します — 状態表示、実行、一時停止、固定。[キュレーター](/hermes/docs/user-guide/features/curator/)をご覧ください。 |
| `hermes journey`(別名 `learning`、`memory-graph`) | 学んだスキルとメモリの移り変わりを時系列で表示します。 |
| `hermes memory` | 外部のメモリプロバイダを設定します。プロバイダ固有のサブコマンド(例: `hermes honcho`)は、そのプロバイダが有効なとき自動で登録されます。 |
| `hermes acp` | エディタ連携のために Hermes を ACP サーバーとして動かします。 |
| `hermes mcp` | MCP サーバーの設定を管理し、Hermes を MCP サーバーとして動かします。 |
| `hermes plugins` | Hermes Agent のプラグインを管理します(インストール、有効化、無効化、削除)。 |
| `hermes portal` | Nous Portal の状態、サブスクリプションへのリンク、Tool Gateway の経路を確認します。[Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/)をご覧ください。 |
| `hermes tools` | プラットフォームごとに有効なツールを設定します。 |
| `hermes computer-use` | Computer Use(cua-driver)のバックエンドをインストール、または状態を確認します(macOS / Windows / Linux)。 |
| `hermes pets` | CLI・TUI・デスクトップアプリに表示される [petdex](/hermes/docs/user-guide/features/pets/) のアニメーションペットを閲覧・インストール・選択します。サブコマンド: `list`、`install`、`select`、`show`、`off`、`scale`、`remove`、`doctor`。 |
| `hermes sessions` | セッションの閲覧・書き出し・整理・改名・削除を行います。 |
| `hermes insights` | トークン・コスト・活動量の分析を表示します。 |
| `hermes claw` | OpenClaw からの移行を助けます。 |
| `hermes import-agent` | Claude Code(`~/.claude`)や Codex CLI(`~/.codex`)の設定を取り込みます。 |
| `hermes dashboard` | 設定・API キー・セッションを管理する Web ダッシュボードを起動します。 |
| `hermes serve` | Hermes のバックエンドサーバーを起動します(画面なし。デスクトップアプリやリモートのバックエンドを支えます)。 |
| `hermes desktop`(別名 `gui`) | ネイティブの Electron デスクトップアプリをビルドして起動します。 |
| `hermes profile` | プロファイル(互いに隔離された複数の Hermes)を管理します。 |
| `hermes completion` | シェル補完スクリプトを出力します(bash / zsh / fish)。 |
| `hermes --version` | バージョン情報を表示します。 |
| `hermes update` | 最新のコードを取得して依存関係を入れ直します。`--check` はインストールせずに確認だけ、`--backup` は取得前に `HERMES_HOME` のスナップショットを取ります。 |
| `hermes uninstall` | Hermes をシステムから削除します。 |

## `hermes chat` {#hermes-chat}

```bash
hermes chat [options]
```

よく使うオプション:

| オプション | 説明 |
|--------|-------------|
| `-q`, `--query "..."` | 最初のプロンプトを与えてセッションを始めます。本物の TTY では、そのプロンプトは通常の対話セッションの最初のやり取りとして**そのまま**送られ(スラッシュコマンドや `!` のシェルエスケープとして解釈されることはありません)、セッションは開いたままになります — OS のランチャーやデスクトップ連携に向いています。`--oneshot`、`-Q`、または TTY でない標準入出力のときは、答えて終了します。 |
| `--query-file PATH` | ファイル(`-` は標準入力)からプロンプトを読み込みます。シェルによる解釈が一切入らないので、引用符・`$(...)`・バッククォートがそのまま届きます — プログラムから渡す本文や、信頼できない本文にはこちらを使ってください(Bot モードの仲間同士の DM もこれを使います)。`-q` とは同時に使えません。 |
| `--oneshot` | `-q` / `--query-file` と併用したとき、対話セッションを始めずに問いに答えて終了します(0.21 より前の 1 問 1 答の挙動です)。TTY でない標準入出力と `-Q` では自動的にこの動きになります。 |
| `-m`, `--model <model>` | この実行だけモデルを上書きします。 |
| `-t`, `--toolsets <csv>` | カンマ区切りで指定したツールセットを有効にします。 |
| `--provider <provider>` | プロバイダを強制します: `auto`, `openrouter`, `nous`, `openai-codex`, `copilot-acp`, `copilot`, `anthropic`, `gemini`, `huggingface`, `novita`(別名 `novita-ai`、`novitaai`), `openai-api`, `zai`, `kimi-coding`, `kimi-coding-cn`, `minimax`, `minimax-cn`, `minimax-oauth`, `kilocode`, `xiaomi`, `arcee`, `gmi`, `upstage`(別名 `solar`), `alibaba`, `alibaba-cn`, `alibaba-coding-plan`(別名 `alibaba_coding`), `alibaba-coding-plan-cn`, `alibaba-token-plan`, `alibaba-token-plan-cn`, `deepseek`, `nvidia`, `ollama-cloud`, `xai`(別名 `grok`), `xai-oauth`(別名 `grok-oauth`), `qwen-oauth`, `bedrock`, `opencode-zen`, `opencode-go`, `opencode-free`(別名 `free`、`opencode_free`。キー不要), `commandcode`, `commandcode-anthropic`, `ai-gateway`, `azure-foundry`, `lmstudio`, `stepfun`, `tencent-tokenhub`(別名 `tencent`、`tokenhub`), `router`(別名 `ramp-router`、`ramp`), `nebius-token-factory`(別名 `nebius`、`nebius-tf`、`tokenfactory`), `tencent-tokenplan`(別名 `tokenplan`、`tencent-lkeap`)。 |
| `-s`, `--skills <name>` | このセッションで使うスキルを先に読み込みます(繰り返し指定、またはカンマ区切りが使えます)。 |
| `-v`, `--verbose` | 詳しい出力を表示します。 |
| `-Q`, `--quiet` | プログラム向けのモードです。バナー・スピナー・ツールのプレビューを出しません。 |
| `--image <path>` | 1 回の問いかけにローカルの画像を添えます。 |
| `--resume <session>` / `--continue [name]` | `chat` から直接セッションを再開します。 |
| `--worktree` | この実行のために隔離された git worktree を作ります。 |
| `--checkpoints` | ファイルを壊す変更の前に、ファイルシステムのチェックポイントを取ります。 |
| `--yolo` | 承認プロンプトを省略します。 |
| `--pass-session-id` | セッション ID をシステムプロンプトに渡します。 |
| `--ignore-user-config` | `~/.hermes/config.yaml` を無視して組み込みの既定値を使います。`.env` の資格情報は読み込まれたままです。隔離した CI の実行、再現可能なバグ報告、他社製の連携に便利です。 |
| `--ignore-rules` | `AGENTS.md`、`SOUL.md`、`.cursorrules`、永続メモリ、事前ロードするスキルの自動注入を行いません。完全に隔離した実行にしたいときは `--ignore-user-config` と組み合わせてください。 |
| `--safe-mode` | 切り分け用のモードです。ユーザー設定、ルール / メモリの注入、プラグイン、シェルフック、MCP サーバーといった独自要素をすべて無効にします(`--ignore-user-config` と `--ignore-rules` を含みます)。問題が自分の設定側なのか Hermes 側なのかを切り分けるときに使います。 |
| `--source <tag>` | 絞り込み用のセッション元タグです(既定: `cli`)。ユーザーのセッション一覧に出したくない他社製連携には `tool` を使ってください。 |
| `--max-turns <N>` | 1 回のやり取りで許すツール呼び出しの最大回数です(既定: 500、または設定の `agent.max_turns`)。 |

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

### `hermes -z <prompt>` — スクリプト向けの 1 回きりの実行 {#hermes--z-prompt-scripted-one-shot}

プログラムから呼ぶ場合(シェルスクリプト、CI、cron、プロンプトを流し込む親プロセス)、`hermes -z` がもっとも素直な 1 回きりの入口です。**プロンプトを 1 つ渡すと、最終的な応答テキストだけが返り、標準出力にも標準エラー出力にもそれ以外は出ません。** バナーもスピナーもツールのプレビューも `Session:` の行もなく、エージェントの最終的な返答がプレーンテキストで出るだけです。

```bash
hermes -z "What's the capital of France?"
# → Paris.

# Parent scripts can cleanly capture the response:
answer=$(hermes -z "summarize this" < /path/to/file.txt)
```

実行ごとの上書き(`~/.hermes/config.yaml` は書き換わりません):

| フラグ | 対応する環境変数 | 目的 |
|---|---|---|
| `-m` / `--model <model>` | `HERMES_INFERENCE_MODEL` | この実行だけモデルを上書きします |
| `--provider <provider>` | _(なし)_ | この実行だけプロバイダを上書きします |
| `--usage-file <path>` | _(なし)_ | 実行後に JSON の使用量レポートを書き出します(下記参照) |

```bash
hermes -z "…" --provider openrouter --model openai/gpt-5.5
# or:
HERMES_INFERENCE_MODEL=anthropic/claude-sonnet-4.6 hermes -z "…"
```

エージェントもツールもスキルも同じで、対話や装飾の層をすべて取り除いただけです。記録にツールの出力まで残したいときは `hermes chat --oneshot -q` を使ってください。`-z` は「最終的な答えだけが欲しい」ときのための入口です。

#### `--usage-file` — パイプライン向けの JSON 使用量レポート {#--usage-file-json-usage-report-for-pipelines}

`hermes -z "…" --usage-file /path/report.json` は、実行後に機械が読める使用量レポートを書き出します。内容は `estimated_cost_usd`、`input_tokens` / `output_tokens` / `cache_read_tokens` / `cache_write_tokens` / `reasoning_tokens` / `total_tokens`、`api_calls`、`model`、`provider`、`session_id`、`service_tier`、そして `completed` / `failed` のフラグです。レポートは**実行が失敗したときでも**書き出されるので、まとめて処理するパイプラインでも支出を必ず把握できます。`-z` / `--oneshot` の外では効果がなく、レポートの書き出しに失敗しても実行そのものの結果が覆い隠されることはありません。

```bash
hermes -z "summarize this repo" --usage-file /tmp/usage.json
jq .estimated_cost_usd /tmp/usage.json
```

## `hermes model` {#hermes-model}

プロバイダとモデルを対話的に選ぶコマンドです。**新しいプロバイダの追加、API キーの設定、OAuth フローの実行は、このコマンドで行います。** Hermes のチャットセッションの中ではなく、ターミナルから実行してください。

```bash
hermes model
```

次のようなときに使います。
- **新しいプロバイダを追加する**(OpenRouter、Anthropic、Copilot、DeepSeek、独自のものなど)
- OAuth を使うプロバイダ(Anthropic、Copilot、Codex、Nous Portal)にログインする
- API キーを入力・更新する
- プロバイダごとのモデル一覧から選ぶ
- 独自の / 自前で立てたエンドポイントを設定する
- 新しい既定値を設定に保存する

:::warning hermes model と /model の違い
**`hermes model`**(Hermes のセッションの外、ターミナルから実行)は**プロバイダ設定の完全なウィザード**です。新しいプロバイダの追加、OAuth フローの実行、API キーの入力、エンドポイントの設定ができます。

**`/model`**(動いている Hermes のチャットセッションの中で入力)は、**すでに設定済みのプロバイダとモデルを切り替えること**しかできません。新しいプロバイダの追加、OAuth の実行、API キーの入力はできません。

**新しいプロバイダを追加したいときは:** まず Hermes のセッションを終了し(`Ctrl+C` または `/quit`)、ターミナルのプロンプトから `hermes model` を実行してください。
:::

### `/model` スラッシュコマンド(セッションの途中で) {#model-slash-command-mid-session}

セッションを離れずに、設定済みのモデルを切り替えます。

```
/model                              # Show current model and available options
/model claude-sonnet-4              # Switch model (auto-detects provider)
/model zai:glm-5                    # Switch provider and model
/model custom:qwen-2.5              # Use model on your custom endpoint
/model custom                       # Auto-detect model from custom endpoint
/model custom:local:qwen-2.5        # Use a named custom provider
/model openrouter:anthropic/claude-sonnet-4  # Switch back to cloud
```

既定では、`/model` の変更は**今のセッションだけ**に効きます。`--global` を付けると変更が `config.yaml` に保存されます(`model.persist_switch_by_default: true` にすると、すべての切り替えが保存されるようになります)。

```
/model claude-sonnet-4 --global     # Switch and save as new default
```

:::info OpenRouter のモデルしか出てこないときは
OpenRouter しか設定していない場合、`/model` には OpenRouter のモデルしか出ません。別のプロバイダ(Anthropic、DeepSeek、Copilot など)を追加するには、セッションを終了してターミナルから `hermes model` を実行してください。
:::

`--global` で切り替えると、モデルと一緒にプロバイダとベース URL の変更も `config.yaml` に保存されます。独自のエンドポイントから切り替えたときは、古いベース URL が消され、他のプロバイダに漏れないようになっています。

## `hermes gateway` {#hermes-gateway}

```bash
hermes gateway <subcommand>
```

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `run` | ゲートウェイをフォアグラウンドで動かします。WSL、Docker、Termux ではこちらをおすすめします。 |
| `start` | インストール済みの systemd / launchd のバックグラウンドサービスを起動します。 |
| `stop` | サービス(またはフォアグラウンドのプロセス)を止めます。 |
| `restart` | サービスを再起動します。 |
| `status` | サービスの状態を表示します。 |
| `list` | **すべてのプロファイル**と、それぞれのゲートウェイが動いているかどうかを一覧します(分かる場合は PID も表示します)。複数のプロファイルを並行して動かしていて、全体をひと目で見たいときに便利です。 |
| `install` | systemd(Linux)または launchd(macOS)のバックグラウンドサービスとしてインストールします。 |
| `uninstall` | インストール済みのサービスを削除します。 |
| `setup` | メッセージングプラットフォームを対話的に設定します。 |
| `migrate-legacy` | 名称変更前のインストールで残った、古い `hermes.service` ユニットを削除します。プロファイルのユニット(`hermes-gateway-<profile>.service`)や無関係なサービスには触れません。フラグ: `--dry-run`、`-y` / `--yes`。 |
| `enroll` | 試験的な機能です。このゲートウェイをリレーコネクタに登録し、コネクタ経由のプラットフォーム向けにリレーの資格情報を保存します。[Hermes リレー](/hermes/docs/user-guide/messaging/relay/)をご覧ください。 |

オプション:

| オプション | 説明 |
|--------|-------------|
| `--all` | `start` / `restart` / `stop` のとき、今の `HERMES_HOME` だけでなく**すべてのプロファイル**のゲートウェイを対象にします。複数のプロファイルを並行して動かしていて、`hermes update` のあとにまとめて再起動したいときに便利です。 |
| `--no-supervise` | `run` のとき、s6-overlay の Docker イメージの中で自動監視をやめ、s6 導入前のフォアグラウンドの挙動にします — ゲートウェイがコンテナの主プロセスになり、自動再起動はありません。s6 イメージの外では何も起きません。`HERMES_GATEWAY_NO_SUPERVISE=1` を設定するのと同じです。 |
| `--external-supervisor` | `run` のとき、フォアグラウンドのゲートウェイをラッパー側のプロセス管理が受け持つと宣言します。`sudo`、`env -i`、その他のラッパーが launchd / systemd の環境マーカーを取り除いてしまう場合に使ってください。チャットからの再起動や更新は、切り離した代わりのプロセスを起こすのではなく、その管理側へ戻る形で終了します。 |

`--external-supervisor` は再起動の方針についての取り決めです。チャットからの再起動や、サービス再起動を伴う更新は終了ステータス `75` で終わるので、ラッパー側の監視プロセスがその非ゼロ終了のあとゲートウェイを起こし直す必要があります。systemd なら `Restart=on-failure` か `Restart=always` を使い、`RestartPreventExitStatus` に `75` を含めないでください。launchd なら、失敗して終了したあと起こし直すよう `KeepAlive` を設定してください。この方針がないと、再起動を頼んでもゲートウェイは止まったままになります。

`hermes gateway enroll` は `--token`、`--connector-url`、`--gateway-id`、`--wake-url` を受け取ります。登録トークンをコネクタと交換し、その結果得られる `GATEWAY_RELAY_ID`、`GATEWAY_RELAY_SECRET`、`GATEWAY_RELAY_DELIVERY_KEY`、任意で `GATEWAY_RELAY_URL`、そして(`--wake-url` を指定したときは)`GATEWAY_RELAY_WAKE_URL` の値を、今のプロファイルの `.env` に書き込みます。

:::tip WSL をお使いの方へ
`hermes gateway start` ではなく `hermes gateway run` を使ってください — WSL の systemd 対応は不安定です。動かし続けるには tmux で包みます: `tmux new -s hermes 'hermes gateway run'`。詳しくは [WSL のよくある質問](/hermes/docs/reference/faq/#wsl-gateway-keeps-disconnecting-or-hermes-gateway-start-fails)をご覧ください。
:::

## `hermes lsp` {#hermes-lsp}

```bash
hermes lsp <subcommand>
```

Language Server Protocol の連携を管理します。LSP は本物の言語サーバー(pyright、gopls、rust-analyzer など)をバックグラウンドで動かし、その診断結果を `write_file` と `patch` が使う書き込み後のチェックへ流し込みます。git の作業スペースかどうかで動作が決まります — 作業ディレクトリまたは編集対象のファイルが git の worktree の中にあるときだけ LSP が動きます。

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `status` | サービスの状態、設定されたサーバー、インストール状況を表示します。 |
| `list` | 対応しているサーバーの一覧を表示します。`--installed-only` を付けると未インストールのものを飛ばします。 |
| `install <id>` | サーバーのバイナリを 1 つ、先んじてインストールします。 |
| `install-all` | 自動インストールの手順が分かっているサーバーをすべてインストールします。 |
| `restart` | 動いているクライアントを片付け、次の編集で立ち上げ直させます。 |
| `which <id>` | サーバー 1 つについて、解決されたバイナリのパスを表示します。 |

全体の案内、対応言語、設定項目については [LSP — 意味解析による診断](/hermes/docs/user-guide/features/lsp/)をご覧ください。

## `hermes setup` {#hermes-setup}

```bash
hermes setup [model|tts|terminal|gateway|tools|agent] [--non-interactive] [--reset] [--quick] [--reconfigure] [--portal]
```

**いちばん簡単な道:** `hermes setup --portal` — Nous Portal に OAuth でログインし、[Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/) の利用を一度に済ませます。

**初回の実行:** 初回向けのウィザードが立ち上がります。

**設定済みの方が実行したとき:** 設定をひととおり見直すウィザードにそのまま入ります。どの項目も今の値が既定として表示され、Enter でそのまま、入力すれば変更できます。メニューは出ません。

ウィザード全体ではなく、1 つの区画だけに入ることもできます。

| 区画 | 説明 |
|---------|-------------|
| `model` | プロバイダとモデルの設定。 |
| `terminal` | ターミナルのバックエンドとサンドボックスの設定。 |
| `gateway` | メッセージングプラットフォームの設定。 |
| `tools` | プラットフォームごとのツールの有効・無効。 |
| `agent` | エージェントの振る舞いの設定。 |

オプション:

| オプション | 説明 |
|--------|-------------|
| `--quick` | 設定済みの方が実行したとき、未設定・空欄の項目だけを尋ねます。すでに設定済みの項目は飛ばします。 |
| `--non-interactive` | 質問せずに既定値や環境変数の値を使います。 |
| `--reset` | セットアップの前に設定を既定値へ戻します。 |
| `--reconfigure` | 後方互換のための別名です。今は、設定済みの環境で `hermes setup` を引数なしで実行すると既定でこの動きになります。 |
| `--portal` | Nous Portal の設定を一度に行います。OAuth でログインし、Nous を推論プロバイダに設定し、[Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/) の利用を有効にします。ウィザードの残りは飛ばします。 |

## `hermes portal` {#hermes-portal}

```bash
hermes portal [status|open|tools]
```

Nous Portal の認証状態、Tool Gateway の経路を確認し、サブスクリプションのページへ移動します。サブコマンドを付けずに実行すると `status` が動きます。

| サブコマンド | 説明 |
|------------|-------------|
| `status`(既定) | Portal の認証状態と、ツールごとの Tool Gateway の経路の概要です。サブコマンドを省いたときもこれが表示されます。 |
| `open` | 既定のブラウザで `portal.nousresearch.com/manage-subscription` を開きます。 |
| `tools` | Tool Gateway の提携先(Firecrawl、FAL、OpenAI TTS、Browser Use、Modal)をすべて挙げ、どれが Nous 経由になっているかを示します。 |

ゲートウェイそのものの設定については [Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/) をご覧ください。一度に済ませる設定手順は、上の `hermes setup --portal` をご覧ください。

## `hermes whatsapp` {#hermes-whatsapp}

```bash
hermes whatsapp
```

モードの選択と QR コードによるペアリングを含む、WhatsApp のペアリング / 設定の流れを実行します。

## `hermes slack` {#hermes-slack}

```bash
hermes slack manifest              # print manifest to stdout
hermes slack manifest --write      # write to ~/.hermes/slack-manifest.json
hermes slack manifest --long-description-file AGENTS.md --write
hermes slack manifest --slashes-only  # just the features.slash_commands array
```

`COMMAND_REGISTRY` に登録されたゲートウェイのコマンド(`/btw`、`/stop`、`/model` など)を、すべて Slack の正式なスラッシュコマンドとして登録するマニフェストを生成します — Discord や Telegram と同じ使い勝手になります。出力した内容を [https://api.slack.com/apps](https://api.slack.com/apps) → 対象のアプリ → **Features → App Manifest → Edit** に貼り付けて、**Save** してください。スコープやスラッシュコマンドが変わった場合、Slack が再インストールを求めます。

| フラグ | 既定 | 目的 |
|------|---------|---------|
| `--write [PATH]` | 標準出力 | 標準出力ではなくファイルに書き出します。`--write` だけを付けると `$HERMES_HOME/slack-manifest.json` に書き出します。 |
| `--name NAME` | `Hermes` | Slack でのボットの表示名です。 |
| `--description DESC` | 既定の紹介文 | Slack のアプリ一覧に出るボットの説明です。 |
| `--long-description TEXT` | 未設定 | `display_information.long_description` をその場で指定します(175〜4,000 文字)。`--slashes-only` とは併用できません。 |
| `--long-description-file PATH` | 未設定 | UTF-8 のテキストファイルから長い説明を読み込み、その中身をそのまま使います。`--long-description` とは同時に使えず、`--slashes-only` とも併用できません。 |
| `--slashes-only` | off | 手で管理しているマニフェストに差し込むために、`features.slash_commands` だけを出力します。 |

`hermes update` のあとは `hermes slack manifest --write` をもう一度実行して、新しいコマンドを取り込んでください。

## `hermes send` {#hermes-send}

```bash
hermes send --to <target> "message text"
hermes send --to <target> --file <path>
echo "message" | hermes send --to <target>
hermes send --list [platform]
```

エージェントやゲートウェイのループを立ち上げずに、設定済みのメッセージングプラットフォームへ 1 通だけメッセージを送ります。ゲートウェイが設定済みの資格情報(`~/.hermes/.env` と `~/.hermes/config.yaml`)をそのまま使うので、運用スクリプト、cron ジョブ、CI フック、監視デーモンから、プラットフォームごとの REST クライアントを作り直さずに状況を投稿できます。

ボットトークンを使うプラットフォーム(Telegram、Discord、Slack、Signal、SMS、WhatsApp Cloud API)では、ゲートウェイを動かしておく必要はありません — `hermes send` がプラットフォームの REST エンドポイントに直接話しかけます。常駐するアダプタが必要なプラグイン型のプラットフォームでは、引き続きゲートウェイを動かしておく必要があります。

| オプション | 説明 |
|--------|-------------|
| `-t`, `--to <TARGET>` | 送り先です。書き方は `platform`(ホームチャンネルを使います)、`platform:chat_id`、`platform:chat_id:thread_id`、`platform:#channel-name` のいずれかです。例: `telegram`、`telegram:-1001234567890`、`discord:#ops`、`slack:C0123ABCD`、`signal:+15551234567`。 |
| `-f`, `--file <PATH>` | 本文を `PATH` から読み込みます(テキストファイルのみ — ログ、レポート、markdown)。`-` を渡すと標準入力から読みます。画像などのバイナリファイルを送るときは `MEDIA:<path>` を使ってください(下記参照)。 |
| `-s`, `--subject <LINE>` | 本文の前に見出しの行を付けます。 |
| `-l`, `--list [platform]` | 全プラットフォーム(またはプラットフォームを指定した場合はその分)の設定済みの送り先を一覧します。 |
| `-q`, `--quiet` | 成功したとき標準出力へ何も出しません — スクリプト向けです(終了コードだけで判断してください)。 |
| `--json` | 人が読む形式ではなく、生の JSON の結果を出力します。 |

位置引数の `message` も `--file` も渡さなかった場合、標準入力が TTY でなければ `hermes send` はそこから読み込みます。終了コード: 成功は `0`、送信 / バックエンドの失敗は `1`、使い方の誤りは `2` です。

### 画像などのメディアを送る {#sending-images-and-other-media}

`--file` は*テキスト*の本文専用です。画像・文書・動画・音声をプラットフォームの正式な添付として届けたいときは、メッセージ本文の中で `MEDIA:<local_path>` という指示子を使って参照してください。

```bash
hermes send --to telegram "MEDIA:/tmp/screenshot.png"
hermes send --to telegram "Build chart for today MEDIA:/tmp/chart.png"   # with caption
hermes send --to discord:#ops "MEDIA:/tmp/report.pdf"
```

既定では、画像ファイルは写真として送られます(Telegram などのプラットフォームは再圧縮します)。圧縮しないファイル添付として届けたい場合は、メッセージに `[[as_document]]` を加えてください。

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

端末をまたいだボット同士の DM です。別の Hermes ゲートウェイ(`api_server` プラットフォームを動かしている端末なら何でも)を*ピア*として登録すると、そのエージェントにメッセージを送れます。`hermes peer dm` は、ピアの API サーバー越しに相手のエージェントの正規の **Bot Chat** セッションを見つけ、そこでエージェントのやり取りを 1 回行い、返答を標準出力に表示します — ローカルで使う `hermes -p <bot> chat --in ~ -c "Bot Chat" …` というボット宛メッセージのコマンドの、端末をまたぐ版です。

`<peer>` だけを指定するとピアのゲートウェイの主エージェントが相手になります。`<peer>/<agent>` は、複数のプロファイルを多重化しているピアの中の、名前付きプロファイルを相手にします(そのピアの `/p/<profile>/` のミラー経由で届きます)。

| サブコマンド | 説明 |
|--------|-------------|
| `add <name> --url <URL> [--key <KEY>] [--note TEXT]` | ピアを登録・更新します。URL は `config.yaml`(`bot_peers`)に入り、キーは `~/.hermes/.env` に `HERMES_PEER_<NAME>_KEY` として保存されます。 |
| `list` | ピアの一覧と、それぞれにキーが設定されているかどうかを表示します。 |
| `dm <peer>[/<agent>] [message]` | ピアのエージェントの正規の Bot Chat にメッセージを送り、返答を表示します(機械が読める出力には `--json`。メッセージは標準入力からも渡せます)。 |
| `run <peer>[/<agent>] [message]` | 正規の Bot Chat で長めのやり取りを非同期に始め、その `run_id`、セッション ID、冪等キーを返します(`--json` に対応)。同じ要求を送り直すときは `--idempotency-key` を使い回してください。 |
| `status <peer>[/<agent>] <run_id>` | 非同期のピア実行の状態を問い合わせ、完了していれば最終的な出力を表示します(`--json` に対応)。 |
| `stop <peer>[/<agent>] <run_id>` | 他のやり取りに影響を与えず、その非同期のピア実行だけを止めます(`--json` に対応)。 |
| `remove <name>` | ピアを登録から外します(`.env` のキーはそのまま残ります)。 |

ピアが 1 つでも登録されていると、すべての正規の Bot Chat に教えられる Bot モードのメッセージング手順(`agent.bot_mode_protocol`)に、ピアの一覧と `hermes peer dm` の使い方が自動で含まれます。おかげでエージェントは SOUL を書き換えなくても、端末をまたいだ仲間を見つけられます。[Bot モード](/hermes/docs/user-guide/bot-mode/)をご覧ください。

終了コード: 成功は `0`、送信 / ピアの失敗は `1`、使い方の誤りは `2` です。

## `hermes secrets` {#hermes-secrets}

```bash
hermes secrets bitwarden <subcommand>
hermes secrets bw <subcommand>          # short alias
```

API キーを `~/.hermes/.env` に保存する代わりに、プロセスの起動時に外部のシークレット管理から取り込みます。今のところ **Bitwarden Secrets Manager** に対応しています。詳しくは [Bitwarden 連携](/hermes/docs/user-guide/secrets/bitwarden/)をご覧ください。

`bitwarden`(別名 `bw`)のサブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `setup` | 対話形式のウィザードです。固定バージョンの `bws` バイナリを入れ、アクセストークンを保存し、プロジェクトを選びます。対話せずに使うために `--project-id`、`--access-token`、`--server-url` を受け取ります。 |
| `status` | 今の設定、バイナリのパスとバージョン、トークンの検証結果を表示します。 |
| `token` | アクセストークンを入れ替えます。新しいトークンを Bitwarden に対して検証してから `.env` に保存します(拒否されたトークンでは何も変わりません)。対話せずに使うために `--access-token`、確認を省くために `--no-verify` を受け取ります。 |
| `sync` | 今すぐシークレットを取得し、何が変わったかを報告します。`--apply` を付けると、実際に今のシェルの環境にシークレットを書き出します(既定は確認のみです)。 |
| `install` | 固定バージョンの `bws` バイナリをダウンロードして検証します。`--force` を付けると、管理下のコピーがすでにあっても取り直します。 |
| `disable` | Bitwarden 連携を止めます。 |

## `hermes migrate` {#hermes-migrate}

```bash
hermes migrate <type>
```

今の `config.yaml` を診断し、必要なら書き換えて、廃止されたモデルや非推奨の設定への参照を置き換えます。書き換えの前に、元の `config.yaml` のタイムスタンプ付きバックアップを取ります(`--no-backup` で省けます)。

| サブコマンド | 説明 |
|------------|-------------|
| `xai` | 2026 年 5 月 15 日に廃止予定の xAI モデルへの参照を `config.yaml` の中から探し、(`--apply` を付けると)xAI の移行案内に沿って公式の置き換え先へその場で書き換えます。既定では確認のみです。 |

移行サブコマンドに共通のフラグ:

| フラグ | 説明 |
|------|-------------|
| `--apply` | `config.yaml` をその場で書き換えます(既定は確認のみで、書き込みません)。 |
| `--no-backup` | 書き換えるとき、`config.yaml` のタイムスタンプ付きバックアップを取りません。 |

> `hermes claw migrate`(OpenClaw の設定を Hermes に一度だけ取り込むコマンド)とは別物です — `hermes migrate` はトップレベルの設定書き換えコマンドです。

## `hermes proxy` {#hermes-proxy}

```bash
hermes proxy <subcommand>
```

OAuth で認証したアップストリームのプロバイダ(Nous Portal、xAI など)へリクエストを転送する、ローカルの OpenAI 互換 HTTP サーバーを動かします。外部のアプリは任意のベアラートークンでこのプロキシを指せばよく、送り出す際にプロキシが本物の OAuth 資格情報を付けます。詳しくは[サブスクリプションプロキシ](/hermes/docs/user-guide/features/subscription-proxy/)をご覧ください。

| サブコマンド | 説明 |
|------------|-------------|
| `start` | プロキシをフォアグラウンドで動かします。フラグ: `--provider <nous\|xai>`(既定 `nous`)、`--host <addr>`(既定 `127.0.0.1`。LAN に公開するなら `0.0.0.0`)、`--port <int>`(既定 `8645`)。 |
| `status` | どのプロキシのアップストリームが使える状態か(資格情報があり、OAuth が有効か)を表示します。 |
| `providers` | 使えるプロキシのアップストリームのプロバイダを一覧します。 |

## `hermes security` {#hermes-security}

```bash
hermes security <subcommand>
```

[OSV.dev](https://osv.dev) に照らして、必要なときに脆弱性を調べます。対象は Hermes の venv(インストール済みの PyPI の配布物)、`~/.hermes/plugins/` 配下のプラグインが宣言する Python の依存関係、`config.yaml` に固定した `npx` / `uvx` の MCP サーバーです。グローバルに入れたパッケージや、エディタ / ブラウザの拡張は対象外です。

| サブコマンド | 説明 |
|------------|-------------|
| `audit` | サプライチェーン監査を 1 回実行します。 |

`audit` のフラグ:

| フラグ | 既定 | 説明 |
|------|---------|-------------|
| `--json` | off | 人が読む文章ではなく、機械が読める JSON を出力します。 |
| `--fail-on <level>` | `critical` | この深刻度に達する指摘が 1 つでもあれば、非ゼロで終了します(`low`、`moderate`、`high`、`critical`)。 |
| `--skip-venv` | off | Hermes の Python venv の走査を飛ばします。 |
| `--skip-plugins` | off | プラグインの依存関係ファイルの走査を飛ばします。 |
| `--skip-mcp` | off | `config.yaml` に固定した MCP サーバーの走査を飛ばします。 |

## `hermes login` / `hermes logout` *(非推奨)* {#hermes-login-hermes-logout-deprecated}

:::caution
`hermes login` は削除されました。OAuth の資格情報を管理するには `hermes auth`、プロバイダを選ぶには `hermes model`、対話で全体を設定するには `hermes setup` を使ってください。
:::

## `hermes auth` {#hermes-auth}

同じプロバイダのキーを順に使い回すための資格情報プールを管理します。詳しくは[資格情報プール](/hermes/docs/user-guide/features/credential-pools/)をご覧ください。

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

サブコマンド: `add`、`list`、`remove`、`reset`、`status`、`logout`、`spotify`。サブコマンドなしで実行すると、対話形式の管理ウィザードが立ち上がります。

## `hermes status` {#hermes-status}

```bash
hermes status [--all] [--deep]
```

| オプション | 説明 |
|--------|-------------|
| `--all` | 秘密を伏せた、共有できる形式ですべての詳細を表示します。 |
| `--deep` | 時間はかかりますが、より踏み込んだ確認を行います。 |

## `hermes cron` {#hermes-cron}

```bash
hermes cron <list|create|edit|pause|resume|run|remove|status|runs|incidents|doctor|tick>
```

| サブコマンド | 説明 |
|------------|-------------|
| `list` | 予約されたジョブを表示します。 |
| `create` / `add` | プロンプトから予約ジョブを作ります。`--skill` を繰り返し指定して、スキルを付けることもできます。`--reasoning-effort <none\|minimal\|low\|medium\|high\|xhigh\|max\|ultra>` でジョブごとに推論の強さを固定できます。 |
| `edit` | ジョブの予定、プロンプト、名前、配信先、繰り返し回数、付けたスキルを変更します。`--clear-skills`、`--add-skill`、`--remove-skill` と、`--reasoning-effort`(空文字を渡すと固定を解除)に対応します。 |
| `pause` | ジョブを消さずに一時停止します。 |
| `resume` | 一時停止したジョブを再開し、次の実行時刻を計算し直します。 |
| `run` | 次のスケジューラの周期でジョブを走らせます。 |
| `remove` | 予約ジョブを削除します。 |
| `status` | cron スケジューラが動いているかどうかを確認します。 |
| `doctor` | 読み取り専用の健康診断です。失敗した実行、失敗した配信、遅れている / 欠けている `next_run_at`、見つからないスクリプトや作業ディレクトリを調べます。問題が見つかると非ゼロで終了します。 |
| `tick` | 実行時刻が来たジョブを 1 回動かして終了します。 |

cron の**起動役**は `cron.provider` の設定キーで差し替えられます。空(既定)ならプロセス内蔵のタイマーを使います。`chronos`(ゼロまでスケールするホスト型ゲートウェイ向けの、NAS が管理するプロバイダ)を指定することもでき、その場合は `cron.chronos.*` のキー(`portal_url`、`callback_url`、`expected_audience`、`nas_jwks_url`)で設定します。あるいは `plugins/cron/<name>/` か `$HERMES_HOME/plugins/<name>/` に置いた独自のプロバイダ名を指定します。知らないプロバイダや使えないプロバイダを指定した場合は組み込みに戻るので、cron が起動役を失うことはありません。[cron の内部構造](/hermes/docs/developer-guide/cron-internals/#gateway-integration)をご覧ください。

## `hermes kanban` {#hermes-kanban}

```bash
hermes kanban [--board <slug>] <action> [options]
```

複数のプロファイル、複数のプロジェクトで共同作業するためのボードです。1 つのインストールで多くのボード(プロジェクト、リポジトリ、領域ごとに 1 つ)を持てます。各ボードは独立した待ち行列で、専用の SQLite の DB とディスパッチャの担当範囲を持ちます。新しくインストールすると `default` という名前のボードが 1 つでき、その DB は後方互換のため `~/.hermes/kanban.db` です。追加のボードは `~/.hermes/kanban/boards/<slug>/kanban.db` に置かれます。ゲートウェイに組み込まれたディスパッチャが、周期ごとにすべてのボードを見て回ります。

**全体フラグ(下記のすべての操作に効きます):**

| フラグ | 目的 |
|------|---------|
| `--board <slug>` | 指定したボードを対象にします。既定では今のボード(`hermes kanban boards switch`、`HERMES_KANBAN_BOARD` 環境変数、または `default` で決まります)です。 |

**これは人が使う / スクリプトから使う面です。** ディスパッチャが起こしたエージェントの作業者は、`hermes kanban` を呼び出すのではなく、専用の `kanban_*` [ツールセット](/hermes/docs/user-guide/features/kanban/#how-workers-interact-with-the-board)(`kanban_show`、`kanban_complete`、`kanban_request_review`、`kanban_request_changes`、`kanban_block`、`kanban_create`、`kanban_link`、`kanban_comment`、`kanban_heartbeat`。まとめ役のプロファイルはさらに `kanban_list` と `kanban_unblock`)を通じてボードを動かします。作業者は環境に `HERMES_KANBAN_BOARD` が固定されているので、他のボードは物理的に見えません。

| 操作 | 目的 |
|--------|---------|
| `init` | `kanban.db` がなければ作ります。何度実行しても同じ結果になります。 |
| `boards list` / `boards ls` | すべてのボードをタスク数とともに一覧します。`--json`、`--all`(アーカイブ済みも含む)。 |
| `boards create <slug>` | 新しいボードを作ります。フラグ: `--name`、`--description`、`--icon`、`--color`、`--switch`(作ったボードを今のボードにする)。slug はケバブケースで、自動的に小文字になります。 |
| `boards switch <slug>` / `boards use` | `<slug>` を今のボードとして保存します(`~/.hermes/kanban/current` に書き込みます)。 |
| `boards show` / `boards current` | 今のボードの名前、DB のパス、タスク数を表示します。 |
| `boards rename <slug> "<name>"` | ボードの表示名を変えます。slug は変えられません。 |
| `boards rm <slug>` | ボードをアーカイブ(既定)または完全に削除します。`--delete` を付けるとアーカイブせずに消します。アーカイブしたボードは `boards/_archived/<slug>-<ts>/` へ移ります。`default` に対しては拒否されます。 |
| `create "<title>"` | 今のボードに新しいタスクを作ります。フラグ: `--body`、`--assignee`、`--parent`(繰り返し可)、`--workspace scratch\|worktree\|dir:<path>`、`--tenant`、`--priority`、`--triage`、`--idempotency-key`、`--max-runtime`、`--max-retries`、`--skill`(繰り返し可)。 |
| `list` / `ls` | 今のボードのタスクを一覧します。`--mine`、`--assignee`、`--status`、`--tenant`、`--archived`、`--json` で絞り込めます。 |
| `show <id>` | タスクをコメントとイベントとともに表示します。機械向けの出力には `--json`。 |
| `assign <id> <profile>` | 担当を割り当て・変更します。`none` で担当を外します。タスクの実行中は拒否されます。 |
| `link <parent> <child>` | 依存関係を追加します。循環は検出されます。両方のタスクが同じボードにある必要があります。 |
| `unlink <parent> <child>` | 依存関係を外します。 |
| `claim <id>` | 着手できるタスクを不可分に取得します。解決された作業スペースのパスを表示します。 |
| `comment <id> "<text>"` | コメントを追加します。次にそのタスクを取った作業者が、`kanban_show()` の応答の一部として読みます。 |
| `complete <id>` | タスクを完了にします。フラグ: `--result`、`--summary`、`--metadata`。 |
| `block <id> "<reason>"` | 人の判断待ちとしてタスクをブロック状態にします。理由はコメントとしても追加されます。 |
| `request-review <id>` | タスクをレビュー担当への引き継ぎとともに `review` へ移します — ブロックではありません。フラグ: `--summary`、`--metadata`、`--reviewer`(レビューの割り当て前に担当を変更します)。 |
| `request-changes <id> <reason>` | 進行中のレビュー実行に対する、レビュー担当の判断です。そのレビューの試行を終わらせ、タスクを元の実装担当へ戻します。 |
| `reopen-review <id>...` | レビュー中のタスクを修正のために差し戻します(`review` → ready / todo)。フラグ: `--reason`(コメントとして追加されます)。 |
| `schedule <id> "<reason>"` | 時間待ちや後追いの作業を `scheduled` に置き、人が対応すべきブロックとして表示されないようにします。 |
| `unblock <id>` | ブロック状態のタスクを元の段階(`review` または `ready`)へ戻します。依存関係が残っている場合は `todo` へ戻します。 |
| `archive <id>` | 既定の一覧から隠します。`gc` が一時作業スペースを片付けます。 |
| `tail <id>` | タスクのイベントの流れを追尾します。 |
| `dispatch` | 今のボードでディスパッチャを 1 回動かします。フラグ: `--dry-run`、`--max N`、`--failure-limit N`、`--json`。 |
| `context <id>` | 作業者が見ることになる文脈をすべて表示します(タイトル + 本文 + 親タスクの結果 + コメント)。 |
| `specify <id>` / `specify --all` | triage 列のタスクを、補助 LLM を使って具体的な仕様(タイトルと、目的・進め方・受け入れ条件を含む本文)に膨らませ、`todo` へ進めます。フラグ: `--tenant`(`--all` を 1 つのテナントに絞る)、`--author`、`--json`。モデルは `config.yaml` の `auxiliary.triage_specifier` で設定します。 |
| `decompose <id>` / `decompose --all` | triage 列のタスクを、説明に応じて専門のプロファイルへ振り分けた子タスクの集まりに展開します。LLM が展開しても利点がないと判断した場合は、specify と同じく 1 つのタスクとして進める形に落ちます。フラグは `specify` と同じです。分解に使うモデルは `config.yaml` の `auxiliary.kanban_decomposer` で設定します。`kanban.orchestrator_profile` は、展開後に根本 / まとめ役のタスクを誰が持つかだけを決めます。`kanban.auto_decompose: true`(既定)なら、ディスパッチャの周期ごとに自動でも動きます。[自動と手動のまとめ役](/hermes/docs/user-guide/features/kanban/#auto-vs-manual-orchestration)をご覧ください。 |
| `gc` | アーカイブしたタスクの一時作業スペースを削除します。 |

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

ボードの決まり方(優先度の高い順): `--board <slug>` フラグ → `HERMES_KANBAN_BOARD` 環境変数 → `~/.hermes/kanban/current` ファイル → `default`。

すべての操作はゲートウェイのスラッシュコマンド(`/kanban …`)としても使え、引数の書き方も同じです — `boards` サブコマンドや `--board` フラグも含みます。

設計の全体像(Cline Kanban / Paperclip / NanoClaw / Gemini Enterprise との比較、8 つの共同作業パターン、4 つのユーザーストーリー、同時実行の正しさの証明)については、リポジトリの `docs/hermes-kanban-v1-spec.pdf` か[かんばんの案内](/hermes/docs/user-guide/features/kanban/)をご覧ください。

## `hermes egress` {#hermes-egress}

リモートのターミナルサンドボックス向けの、外向き資格情報注入ファイアウォールです。[iron-proxy](https://github.com/ironsh/iron-proxy) というデーモンを包んでいます — TLS を復号して中身を見るプロキシで、ネットワークの境界で不透明なプロキシトークンを本物のアップストリームの API 資格情報に差し替えるため、サンドボックスが本物のキーを持つことはありません。既定では無効です。設定と構成については[送信プロキシ](/hermes/docs/user-guide/egress/iron-proxy/)のページをご覧ください。
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

よくある失敗の形と復旧の手順は[送信プロキシ → 困ったときは](/hermes/docs/user-guide/egress/iron-proxy/#troubleshooting)にまとめてあります。

## `hermes project` {#hermes-project}

```bash
hermes project <create|list|show|add-folder|remove-folder|rename|set-primary|use|archive|restore|bind-board>
```

プロジェクトは、複数のフォルダやリポジトリにまたがれる、人が名前を付けた作業スペースです。デスクトップのセッションのまとまりを決め、かんばんボードに紐づけるとタスクに worktree とブランチの決まった規約を与えます。状態はプロファイルごとに保持されます。

| サブコマンド | 説明 |
|------------|-------------|
| `create` | 新しいプロジェクトを作ります。 |
| `list`(別名 `ls`) | プロジェクトを一覧します。 |
| `show` | プロジェクトの詳細を表示します。 |
| `add-folder` | プロジェクトにフォルダ / リポジトリを追加します。 |
| `remove-folder` | プロジェクトからフォルダを外します。 |
| `rename` | プロジェクトの名前を変えます。 |
| `set-primary` | 主となるフォルダを設定します。 |
| `use` | 今のプロジェクトを設定します。 |
| `archive` | プロジェクトをアーカイブします(元に戻せます)。 |
| `restore` | アーカイブしたプロジェクトを戻します。 |
| `bind-board` | かんばんボードをこのプロジェクトに紐づけます。 |

## `hermes webhook` {#hermes-webhook}

```bash
hermes webhook <subscribe|list|remove|test>
```

イベントでエージェントを起こすための、動的な Webhook 購読を管理します。設定で Webhook のプラットフォームを有効にしておく必要があります — 未設定の場合は設定の手順が表示されます。

| サブコマンド | 説明 |
|------------|-------------|
| `subscribe` / `add` | Webhook の経路を作ります。サービス側に設定する URL と HMAC のシークレットを返します。 |
| `list` / `ls` | エージェントが作った購読をすべて表示します。 |
| `remove` / `rm` | 動的な購読を削除します。config.yaml に書いた固定の経路には影響しません。 |
| `test` | テスト用の POST を送り、購読が働いているか確かめます。 |

### `hermes webhook subscribe` {#hermes-webhook-subscribe}

```bash
hermes webhook subscribe <name> [options]
```

| オプション | 説明 |
|--------|-------------|
| `--prompt` | `{dot.notation}` でペイロードを参照できるプロンプトのひな形です。 |
| `--events` | 受け付けるイベント種別をカンマ区切りで指定します(例: `issues,pull_request`)。空ならすべてです。 |
| `--description` | 人が読むための説明です。 |
| `--skills` | エージェントの実行時に読み込むスキル名をカンマ区切りで指定します。 |
| `--deliver` | 配信先です: `log`(既定)、`telegram`、`discord`、`slack`、`github_comment`。 |
| `--deliver-chat-id` | 他のプラットフォームへ配信するときの、宛先のチャット / チャンネル ID です。 |
| `--secret` | 独自の HMAC シークレットです。省くと自動生成されます。 |
| `--deliver-only` | エージェントを動かさず、`--prompt` を展開した文字列をそのままメッセージとして配信します。LLM の費用はゼロで、1 秒もかからず届きます。`--deliver` に `log` 以外の実際の宛先を指定する必要があります。 |
| `--script` | `~/.hermes/scripts/` 配下の絞り込み / 変換スクリプトです。Webhook のペイロードが JSON として標準入力に渡され、標準出力の JSON がペイロードを置き換えます。標準出力が空、`[SILENT]`、または終了コードが非ゼロの場合、その Webhook は無視されます。[スクリプトによる絞り込みと変換](/hermes/docs/user-guide/messaging/webhooks/#script-filters-and-transforms)をご覧ください。 |

購読は `~/.hermes/webhook_subscriptions.json` に保存され、ゲートウェイを再起動しなくても Webhook のアダプタが読み直します。

## `hermes doctor` {#hermes-doctor}

```bash
hermes doctor [--fix]
```

| オプション | 説明 |
|--------|-------------|
| `--fix` | 直せるものは自動で直そうとします。 |

## `hermes dump` {#hermes-dump}

```bash
hermes dump [--show-keys]
```

Hermes の設定全体を、短いプレーンテキストの要約として出力します。助けを求めるときに Discord、GitHub の issue、Telegram へそのまま貼り付けられるように作られています — ANSI の色も特別な書式もなく、データだけです。

| オプション | 説明 |
|--------|-------------|
| `--show-keys` | `set` / `not set` だけでなく、伏せ字にした API キーの一部(先頭と末尾の 4 文字)を表示します。 |

### 含まれる内容 {#what-it-includes}

| 区分 | 中身 |
|---------|---------|
| **ヘッダー** | Hermes のバージョン、リリース日、git のコミットハッシュ |
| **環境** | OS、Python のバージョン、OpenAI SDK のバージョン |
| **識別情報** | 今のプロファイル名、HERMES_HOME のパス |
| **モデル** | 設定された既定のモデルとプロバイダ |
| **ターミナル** | バックエンドの種類(local、docker、ssh など) |
| **API キー** | 22 個のプロバイダ / ツールの API キーがあるかどうかの確認 |
| **機能** | 有効なツールセット、MCP サーバーの数、メモリプロバイダ |
| **サービス** | ゲートウェイの状態、設定済みのメッセージングプラットフォーム |
| **作業量** | cron ジョブの数、インストール済みのスキル数 |
| **設定の上書き** | 既定と異なる設定値 |

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

- GitHub にバグを報告するとき — issue に貼り付けます
- Discord で助けを求めるとき — コードブロックで共有します
- 自分の設定を他の人のものと比べるとき
- うまく動かないときの、ざっとした確認

:::tip
`hermes dump` は共有のために作られたコマンドです。対話的に診断したいときは `hermes doctor`、見た目で全体をつかみたいときは `hermes status` を使ってください。
:::

## `hermes debug` {#hermes-debug}

```bash
hermes debug share [options]
```

デバッグ用のレポート(システム情報と直近のログ)をペーストサービスにアップロードし、共有できる URL を受け取ります。手早く助けを求めたいときに便利です — 助ける側が問題を診断するのに必要なものが揃っています。

| オプション | 説明 |
|--------|-------------|
| `--lines <N>` | ログファイルごとに含める行数です(既定: 200)。 |
| `--expire <days>` | ペーストの保存日数です(既定: 7)。 |
| `--nous` | 公開のペーストサービスではなく、Nous 内部の診断用ストレージへアップロードします。Nous のサポートから非公開の診断データを求められたときに使ってください。 |
| `--local` | アップロードせずに、レポートをその場で表示します。 |
| `--no-redact` | アップロード時の秘密情報の伏せ字を無効にします。既定ではアップロード内容は伏せ字になります。 |

レポートにはシステム情報(OS、Python のバージョン、Hermes のバージョン)、直近のエージェント・ゲートウェイ・GUI / ダッシュボード・デスクトップのログ(ファイルあたり 512 KB まで)、伏せ字にした API キーの状態が含まれます。既定ではアップロード内容は伏せ字になっているので、秘密情報は含まれません。

既定のアップロード先は公開のペーストサービスで、paste.rs、dpaste.com の順に試します。`--nous` は同じデバッグ内容を Nous の非公開の診断用ストレージへアップロードします。返ってくる閲覧用リンクは Nous のチームのためのもので、14 日後に自動で消えます。

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

設定、スキル、セッション、データを zip にまとめます。hermes-agent のコード自体は含めず、以前のバックアップの成果物(`backups/`、`state-snapshots/`)を入れ子にすることもありません — それらはすでにそれぞれ `state.db` のコピーを持っているためです。

| オプション | 説明 |
|--------|-------------|
| `-o`, `--output <path>` | zip ファイルの出力先です(既定: `~/hermes-backup-<timestamp>.zip`)。 |
| `-q`, `--quick` | 手早いスナップショットです。重要な状態ファイル(config.yaml、state.db、.env、認証、cron ジョブ)だけを対象にします。完全なバックアップよりずっと速く終わります。 |
| `-l`, `--label <name>` | スナップショットのラベルです(`--quick` のときだけ使われます)。 |

バックアップは SQLite の `backup()` API を使って安全にコピーするので、Hermes が動いている最中でも正しく動きます(WAL モードでも安全です)。

**zip に含めないもの:**

- `*.db-wal`、`*.db-shm`、`*.db-journal` — SQLite の WAL / 共有メモリ / ジャーナルの補助ファイルです。`*.db` は `sqlite3.backup()` で一貫したスナップショットを取っているので、動作中の補助ファイルを一緒に入れると、復元したときに中途半端な状態が見えてしまいます。
- `checkpoints/` — セッションごとの軌跡のキャッシュです。ハッシュを鍵に持ち、セッションごとに作り直されるもので、そもそも別のインストールにきれいには移せません。
- `hermes-agent` のコード自体(これはユーザーのデータのバックアップであって、リポジトリのスナップショットではありません)。

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

`~/.hermes/checkpoints/` にあるシャドウ git の保管庫 — セッション中の `/rollback` コマンドを支える保存層 — を確認・管理します。いつ実行しても安全で、エージェントが動いている必要もありません。

| サブコマンド | 説明 |
|------------|-------------|
| `status`(既定) | 全体の容量、プロジェクト数、プロジェクトごとの内訳を表示します。`hermes checkpoints` を引数なしで実行したときと同じです。 |
| `list` | `status` の別名です。 |
| `prune` | 掃除を強制的に実行します — 迷子になったものと古くなったプロジェクトを削除し、保管庫を整理し、容量の上限を守らせます。24 時間の重複実行防止マーカーは無視します。 |
| `clear` | チェックポイントの保管場所ごと削除します。元には戻せません。`-f` を付けない限り確認を求めます。 |
| `clear-legacy` | v1 → v2 の移行で作られた `legacy-<timestamp>/` のアーカイブだけを削除します。 |

### オプション {#options}

| オプション | サブコマンド | 説明 |
|--------|------------|-------------|
| `--limit N` | `status`、`list` | 一覧するプロジェクトの最大数です(既定 20)。 |
| `--retention-days N` | `prune` | `last_touch` が N 日より古いプロジェクトを削除します(既定 7)。 |
| `--max-size-mb N` | `prune` | 迷子 / 古いものの掃除のあと、保管庫全体の容量が N MB 以下になるまで、プロジェクトごとに古いコミットから削除します(既定 500)。 |
| `--keep-orphans` | `prune` | 作業ディレクトリがもう存在しないプロジェクトを削除しません。 |
| `-f`, `--force` | `clear`、`clear-legacy` | 確認のプロンプトを省略します。 |

### 例 {#examples}

```bash
hermes checkpoints                                  # status overview
hermes checkpoints prune --retention-days 3         # aggressive cleanup
hermes checkpoints prune --max-size-mb 200          # tighten size cap once
hermes checkpoints clear-legacy -f                  # drop v1 archive dirs
hermes checkpoints clear -f                         # wipe everything
```

構成の全体像とセッション中のコマンドについては[チェックポイントと `/rollback`](/hermes/docs/user-guide/checkpoints-and-rollback/)をご覧ください。

## `hermes import` {#hermes-import}

```bash
hermes import <zipfile> [options]
```

以前に作った Hermes のバックアップを、Hermes のホームディレクトリへ復元します。アーカイブの中のファイルは、ホームディレクトリの既存のファイルをすべて上書きします。`--force` は、対象にすでに Hermes がインストールされているときに出る確認のプロンプトを省くだけです。

| オプション | 説明 |
|--------|-------------|
| `-f`, `--force` | 既存のインストールについての確認のプロンプトを省略します。 |

:::warning
動いているプロセスとぶつからないよう、取り込みの前にゲートウェイを止めてください。
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

Hermes のログファイルを表示・追尾・絞り込みします。ログはすべて `~/.hermes/logs/`(既定以外のプロファイルでは `<profile>/logs/`)に保存されます。

### ログファイル {#log-files}

| 名前 | ファイル | 記録される内容 |
|------|------|-----------------|
| `agent`(既定) | `agent.log` | エージェントの活動すべて — API 呼び出し、ツールの振り分け、セッションの始まりと終わり(INFO 以上) |
| `errors` | `errors.log` | 警告とエラーだけ — agent.log を絞り込んだもの |
| `gateway` | `gateway.log` | メッセージングのゲートウェイの活動 — プラットフォームへの接続、メッセージの振り分け、Webhook のイベント |
| `gui` | `gui.log` | ダッシュボード / TUI ゲートウェイ / PTY ブリッジ / websocket のイベント |
| `desktop` | `desktop.log` | Electron のデスクトップアプリ — 起動、バックエンドを起こしたときの出力、直近の Python のトレースバック |

### オプション {#options}

| オプション | 説明 |
|--------|-------------|
| `log_name` | どのログを見るか: `agent`(既定)、`errors`、`gateway`、または `list` で使えるファイルを容量とともに表示します。 |
| `-n`, `--lines <N>` | 表示する行数です(既定: 50)。 |
| `-f`, `--follow` | `tail -f` のように、ログをその場で追い続けます。止めるには Ctrl+C を押します。 |
| `--level <LEVEL>` | 表示するログレベルの下限です: `DEBUG`、`INFO`、`WARNING`、`ERROR`、`CRITICAL`。 |
| `--session <ID>` | セッション ID の一部を含む行だけに絞ります。 |
| `--since <TIME>` | どれだけ前からの行を表示するかを相対時間で指定します: `30m`、`1h`、`2d` など。`s`(秒)、`m`(分)、`h`(時)、`d`(日)が使えます。 |
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

絞り込みは組み合わせられます。複数の条件を指定したとき、ログの行は**すべて**を満たしたときだけ表示されます。

```bash
# WARNING+ lines from the last 2 hours containing session "tg-12345"
hermes logs --level WARNING --since 2h --session tg-12345
```

タイムスタンプを読み取れない行は、`--since` を使っているとき表示されます(複数行にわたるログの続きの行であることがあるためです)。レベルを判別できない行も、`--level` を使っているとき表示されます。

### ログの世代交代 {#log-rotation}

Hermes は Python の `RotatingFileHandler` を使います。古いログは自動的に切り替わります — `agent.log.1`、`agent.log.2` などを探してみてください。`hermes logs list` のサブコマンドは、切り替わったものも含めてすべてのログファイルを表示します。

## `hermes prompt-size` {#hermes-prompt-size}

```bash
hermes prompt-size [--platform <name>] [--json]
```

新しいセッションで固定的に使われるプロンプトの量 — 会話の中身が入る*前*に、毎回の API 呼び出しで送られるもの — を報告します。下流のアダプタやプロキシがモデルのコンテキストより厳しい上限を持っているとき、あるいはどの部分(スキル索引、メモリ、プロフィール)が大きいのかを見たいときに便利です。

エージェントが組み立てるのと同じシステムプロンプトを作り、内訳を出します。

- **システムプロンプトの合計** — 組み上がったプロンプト全体(識別情報、案内、スキル索引、コンテキストファイル、メモリ、プロフィール、タイムスタンプ)。
- **スキル索引** — `<available_skills>` のかたまり。スキルを多く入れていると、たいていここが一番大きくなります。
- **メモリ**と**ユーザープロフィール** — `MEMORY.md` / `USER.md` の内容。
- **プロンプトの層** — stable / context / volatile。Hermes がキャッシュを効かせるためにプロンプトを重ねる仕組みに対応しています。
- **ツールスキーマ** — 有効なすべてのツールの JSON(毎回送られる固定分のもう半分です)。

すべてオフラインで動きます — API を呼ばないので、資格情報が何も設定されていなくても使えます。

```bash
# Human-readable breakdown for the CLI platform (default)
hermes prompt-size

# Simulate a messaging platform's prompt (different platform hint)
hermes prompt-size --platform telegram

# Machine-readable output for scripts
hermes prompt-size --json
```

:::tip
スキル索引とツールスキーマは、有効にしているスキルとツールの数に応じて大きくなります。プロンプトを小さくするには、使っていないツールセットを無効にするか(`hermes tools`)、要らないスキルを削除してください(`hermes skills`)。今いるディレクトリのコンテキストファイル(AGENTS.md、.cursorrules)も合計に含まれます。
:::

## `hermes config` {#hermes-config}

```bash
hermes config <subcommand>
```

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `show` | 今の設定値を表示します。 |
| `edit` | エディタで `config.yaml` を開きます。 |
| `get <key> [--json]` | ドットでつないだキーで設定値を 1 つ表示します(例: `hermes config get model.default`)。`--json` を付けると機械が読める形で出力します。 |
| `set <key> <value>` | 設定値を書き換えます。 |
| `unset <key>` | 設定のキーを削除し、組み込みの既定値に戻します。 |
| `path` | 設定ファイルのパスを表示します。 |
| `env-path` | `.env` ファイルのパスを表示します。 |
| `check` | 足りない設定や古い設定がないか確認します。 |
| `migrate` | 新しく増えた項目を対話形式で追加します。 |

### キー名の中にドットがあるとき {#dots-inside-key-names}

`hermes config set/get/unset` は `.` を階層の区切りとして使いますが、実際のキー名にはドットがそのまま入っているものが多くあります — モデルの ID(`grok-4.6`、`glm-5.3-flash`)、Matrix のルーム ID(`!room:example.org`)、バージョン付きのプロバイダ名などです。次の 2 つのきまりで、こうしたキーも指定できます。

- **すでにあるキーはそのまま指定できます。** 既存の階層をたどるとき、ドットで区切るよりも、残りの文字列にそのまま一致する既存のキーが優先されます。`hermes config set providers.p.models.grok-4.6.supports_vision true` は本物の `grok-4.6` の項目を更新します(`get` / `unset` も同じように解決します)。
- **新しくドット入りのキーを作るときはエスケープが必要です。** ドットはバックスラッシュでエスケープします: `hermes config set 'providers.p.models.grok-4\.7.context_length' 128000` は文字どおりの `grok-4.7` というキーを作ります。(シェルがバックスラッシュを残すよう、キーを引用符で囲んでください。)

エスケープなしの書き込みが、既存のドット入りの兄弟キーを覆い隠す階層を作ってしまう場合(たとえば既存の `grok-4.6` の隣に `grok-4` を作ろうとした場合)、実行時に決して読まれない幻の項目を黙って書く代わりに、コマンドはエラーで失敗します。

## `hermes pairing` {#hermes-pairing}

```bash
hermes pairing <list|approve|revoke|clear-pending>
```

| サブコマンド | 説明 |
|------------|-------------|
| `list` | 承認待ちと承認済みのユーザーを表示します。 |
| `approve <platform> <code>` | ペアリングコードを承認します。 |
| `revoke <platform> <user-id>` | ユーザーのアクセスを取り消します。 |
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
| `install` | スキルをインストールします。 |
| `inspect` | インストールせずにスキルの中身を確かめます。 |
| `list` | インストール済みのスキルを一覧します。 |
| `check` | インストール済みのハブのスキルに、配布元の更新がないか確認します。 |
| `update` | 配布元に変更があったハブのスキルを入れ直します。 |
| `audit` | インストール済みのハブのスキルを調べ直します。 |
| `uninstall` | ハブから入れたスキルを削除します。 |
| `reset` | `user_modified` の印が付いて固定された同梱スキルを、マニフェストの項目を消して解放します。`--restore` を付けると、ユーザーの手元のコピーも同梱版で置き換えます。 |
| `opt-out` | 同梱スキルが今のプロファイルに置かれないようにします。`.no-bundled-skills` という印を書き、インストーラ、`hermes update`、各種の同期が同梱スキルの配置を飛ばすようにします。既定では安全で、ディスク上の何にも触れません。`--remove` を付けると、すでに置かれている同梱スキルのうち**手を加えていないもの**も削除します(ユーザーが編集したもの、ハブから入れたもの、自分で書いたものは決して削除されません。先に内容を示して確認します。`--yes` で確認を省けます)。 |
| `opt-in` | `.no-bundled-skills` の印を消して `opt-out` を取り消し、次の `hermes update` で同梱スキルがまた置かれるようにします。`--sync` を付けるとすぐに置き直します。 |
| `publish` | スキルを配布元に公開します。 |
| `snapshot` | スキルの設定を書き出し / 読み込みします。 |
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
- `--force` は、他社製 / コミュニティのスキルに対する、危険ではない方針上の制限を越えられます。
- `--force` は `dangerous` という検査結果を覆せません。
- `--source skills-sh` は公開の `skills.sh` のディレクトリを検索します。
- `--source well-known` を使うと、`/.well-known/skills/index.json` を公開しているサイトを Hermes に指させられます。
- `--source browse-sh` は [browse.sh](https://browse.sh) の、サイトごとのブラウザ操作スキル 200 件以上のカタログを検索します。識別子は `browse-sh/airbnb.com/search-listings-ddgioa` のような形です。
- `http(s)://…/*.md` の URL を渡すと、`SKILL.md` と、そこから明示的に参照されている `references/`、`templates/`、`scripts/`、`assets/`、`examples/` 配下のファイルをインストールします。frontmatter に `name:` がなく、URL のスラッグも識別子として使えない場合、対話的なターミナルでは名前を尋ねます。対話できない場面(TUI の中の `/skills install`、ゲートウェイのプラットフォーム)では代わりに `--name <x>` が必要です。

## `hermes bundles` {#hermes-bundles}

```bash
hermes bundles <subcommand>
```

スキルバンドルは、複数のスキルを 1 つの `/<bundle-name>` スラッシュコマンドにまとめたものです。バンドルを呼ぶと、参照しているすべてのスキルが 1 つのユーザーメッセージにまとめて読み込まれます。保存場所は `~/.hermes/skill-bundles/<slug>.yaml` です。YAML の書き方と挙動については[スキルバンドル](/hermes/docs/user-guide/features/skills/#skill-bundles)をご覧ください。

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `list` | インストール済みのバンドルを一覧します(サブコマンドを省いたときの既定) |
| `show <name>` | バンドル 1 つの名前、説明、スキル、ファイルのパスを表示します |
| `create <name>` | 新しいバンドルを作ります。`--skill <id>` を繰り返し渡すか、省くと対話形式で入力できます。`--description`、`--instruction`、`--force` も使えます。 |
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

チャットのセッションでは、`/bundles` がインストール済みのバンドルを一覧し、`/<bundle-name>` がそのバンドルを読み込みます。

## `hermes curator` {#hermes-curator}

```bash
hermes curator <subcommand>
```

キュレーターは補助モデルによる裏の処理で、エージェントが作ったスキルを定期的に見直し、古いものを整理し、重なっているものをまとめ、使われなくなったものをアーカイブします。同梱のスキルとハブから入れたスキルには決して触れません。アーカイブは元に戻せますし、自動で削除されることはありません。

| サブコマンド | 説明 |
|------------|-------------|
| `status` | キュレーターの状態とスキルの統計を表示します |
| `run` | 見直しを今すぐ実行します(LLM の処理が終わるまで戻りません) |
| `run --background` | LLM の処理を裏のスレッドで始め、すぐ戻ります |
| `run --dry-run` | 確認だけです — 何も書き換えずに見直しのレポートを作ります |
| `backup` | `~/.hermes/skills/` の tar.gz スナップショットを手動で取ります(キュレーターは実際の実行の前にも自動でスナップショットを取ります) |
| `rollback` | スナップショットから `~/.hermes/skills/` を復元します(既定は最新のもの) |
| `rollback --list` | 使えるスナップショットを一覧します |
| `rollback --id <ts>` | id を指定してスナップショットを復元します |
| `rollback -y` | 確認のプロンプトを省略します |
| `pause` | 再開するまでキュレーターを止めます |
| `resume` | 止めていたキュレーターを再開します |
| `pin <skill>` | スキルを固定し、キュレーターが自動で移動させないようにします |
| `unpin <skill>` | スキルの固定を外します |
| `restore <skill>` | アーカイブしたスキルを戻します |
| `archive <skill>` | スキルを手動でアーカイブします |
| `prune` | キュレーターが普段片付けるスキルを、手動で片付けます |
| `list-archived` | アーカイブしたスキルを一覧します(`restore` で戻せます) |

入れたばかりの環境では、最初の定期実行が `interval_hours` 1 回分(既定では 7 日)だけ先送りされます — `hermes update` のあと最初の周期でいきなり手入れが始まることはありません。それより前に内容を見たいときは `hermes curator run --dry-run` を使ってください。

挙動と設定については[キュレーター](/hermes/docs/user-guide/features/curator/)をご覧ください。

## `hermes moa` {#hermes-moa}

名前を付けた Mixture of Agents のプリセットを設定します。プリセットは、どのモデル選択画面でも `Mixture of Agents` というプロバイダの下に選べるモデルとして現れます。`/moa <prompt>` は、既定のプリセットでプロンプトを 1 回流します。

```bash
hermes moa list
hermes moa configure [name]
hermes moa delete <name>
```

`hermes moa configure` は、参照モデルとまとめ役のそれぞれについて、Hermes のプロバイダ → モデルの選択画面をそのまま使います。プリセットは実行のしかたの設定であって、主となるモデルやプロバイダではありません。

## `hermes fallback` {#hermes-fallback}

```bash
hermes fallback <subcommand>
```

フォールバックのプロバイダの並びを管理します。主モデルがレート制限、過負荷、接続のエラーで失敗したとき、フォールバックのプロバイダが順に試されます。

| サブコマンド | 説明 |
|------------|-------------|
| `list`(別名: `ls`) | 今のフォールバックの並びを表示します(サブコマンドを省いたときの既定) |
| `add` | プロバイダとモデルを選び(`hermes model` と同じ選択画面です)、並びの末尾に加えます |
| `remove`(別名: `rm`) | 並びから消す項目を選びます |
| `clear` | フォールバックの項目をすべて消します |

[フォールバックのプロバイダ](/hermes/docs/user-guide/features/fallback-providers/)をご覧ください。

## `hermes hooks` {#hermes-hooks}

```bash
hermes hooks <subcommand>
```

`~/.hermes/config.yaml` で宣言したシェルスクリプトのフックを確認し、作った入力で試し、`~/.hermes/shell-hooks-allowlist.json` にある初回の同意の許可リストを管理します。

| サブコマンド | 説明 |
|------------|-------------|
| `list`(別名: `ls`) | 設定済みのフックを、対象条件、制限時間、同意の状態とともに一覧します |
| `test <event>` | `<event>` に一致するすべてのフックを、作った入力に対して実行します |
| `revoke`(別名: `remove`、`rm`) | あるコマンドの許可リストの項目を削除します(次の再起動から効きます) |
| `doctor` | 設定された各フックを調べます。実行権限、許可リスト、更新時刻のずれ、JSON の妥当性、試し実行の所要時間を確認します |

イベントの形と入力の構造については[フック](/hermes/docs/user-guide/features/hooks/)をご覧ください。

## `hermes memory` {#hermes-memory}

```bash
hermes memory <subcommand>
```

外部のメモリプロバイダのプラグインを設定・管理します。使えるプロバイダ: honcho、openviking、mem0、hindsight、holographic、retaindb、byterover、supermemory。外部のプロバイダは同時に 1 つだけ有効にできます。組み込みのメモリ(MEMORY.md / USER.md)は常に有効です。

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `setup` | プロバイダの選択と設定を対話的に行います。 |
| `status` | 今のメモリプロバイダの設定を表示します。 |
| `off` | 外部のプロバイダを無効にします(組み込みのみになります)。 |

:::info プロバイダ固有のサブコマンド
外部のメモリプロバイダが有効なとき、そのプロバイダ固有の管理のために `hermes <provider>` というトップレベルのコマンドが登録されることがあります(例: Honcho が有効なときの `hermes honcho`)。有効でないプロバイダのサブコマンドは現れません。今つながっているものを見るには `hermes --help` を実行してください。
:::

## `hermes acp` {#hermes-acp}

```bash
hermes acp
```

エディタ連携のために、Hermes を ACP(Agent Client Protocol)の標準入出力サーバーとして起動します。

関連する入口:

```bash
hermes-acp
python -m acp_adapter
```

先に対応する部品を入れてください:

```bash
cd ~/.hermes/hermes-agent && uv pip install -e '.[acp]'
```

[ACP によるエディタ連携](/hermes/docs/user-guide/features/acp/)と [ACP の内部構造](/hermes/docs/developer-guide/acp-internals/)をご覧ください。

## `hermes mcp` {#hermes-mcp}

```bash
hermes mcp <subcommand>
```

MCP(Model Context Protocol)サーバーの設定を管理し、Hermes を MCP サーバーとして動かします。

| サブコマンド | 説明 |
|------------|-------------|
| *(なし)* または `picker` | 対話形式のカタログ選択画面です — Nous が承認した MCP を見て回り、インストール / 有効化 / 無効化します。 |
| `catalog` | Nous が承認した MCP を一覧します(プレーンテキストで、スクリプトから扱えます)。 |
| `install <name>` | カタログの項目をインストールします(例: `hermes mcp install n8n`)。 |
| `serve [-v\|--verbose]` | Hermes を MCP サーバーとして動かします — 会話を他のエージェントに開きます。 |
| `add <name> [--url URL] [--command CMD] [--auth oauth\|header] [--args ...]` | 独自の MCP サーバーを追加し、ツールを自動で見つけます。`--args` は残りの引数をそのまま標準入出力のコマンドへ渡すので、最後に置いてください。 |
| `remove <name>`(別名: `rm`) | 設定から MCP サーバーを削除します。 |
| `list`(別名: `ls`) | 設定済みの MCP サーバーを一覧します。 |
| `test <name>` | MCP サーバーへの接続を試します。 |
| `configure <name>`(別名: `config`) | サーバーごとに使うツールを切り替えます。 |
| `login <name>` | OAuth を使う MCP サーバーの再認証を行います。 |

[MCP 設定の一覧](/hermes/docs/reference/mcp-config-reference/)、[Hermes で MCP を使う](/hermes/docs/guides/use-mcp-with-hermes/)、[MCP サーバーモード](/hermes/docs/user-guide/features/mcp/#running-hermes-as-an-mcp-server)をご覧ください。

## `hermes plugins` {#hermes-plugins}

```bash
hermes plugins [subcommand]
```

プラグインの管理をひとつにまとめたコマンドです — 一般のプラグイン、メモリプロバイダ、コンテキストエンジンをここで扱います。`hermes plugins` をサブコマンドなしで実行すると、2 つの区画を持つ対話画面が開きます。

- **一般のプラグイン** — インストール済みのプラグインを、チェックボックスで複数まとめて有効・無効にします
- **プロバイダのプラグイン** — メモリプロバイダとコンテキストエンジンを 1 つずつ選んで設定します。区分の上で ENTER を押すとラジオ選択が開きます。

| サブコマンド | 説明 |
|------------|-------------|
| *(なし)* | 対話画面をまとめて開きます — 一般プラグインの切り替えと、プロバイダのプラグインの設定。 |
| `install <identifier> [--force] [--ref COMMIT_SHA]` | Git の URL、`owner/repo`、または索引に載っている名前だけからプラグインをインストールします。スラッシュを含まない名前は、コミュニティのプラグイン索引を通じて `owner/repo` と索引が固定するコミットに解決されます。名前が複数に当てはまる場合は候補を並べて終了します。`--ref` は 40 文字のコミット SHA だけを受け取り、その不変のリビジョンをインストールし、索引の固定より優先されます。 |
| `search [term] [--json] [--capability CAP] [--refresh]` | コミュニティのプラグイン索引を検索します(名前 / 説明 / タグへのあいまい一致。`term` を省くと一覧できます)。索引は `plugins.index_url`(既定: NousResearch のプラグイン索引)から取得し、`~/.hermes/cache/` に 24 時間キャッシュします。取得できないときは古いキャッシュ、さらに同梱の初期データに戻ります。索引に載っていることは監査を通ったことを意味しません — メタデータの確認だけです。 |
| `update <name>` | 固定していないインストール済みのプラグインを、最新の内容に更新します。固定したプラグインを動かすには `--force --ref <new-commit>` で入れ直す必要があります。 |
| `remove <name>`(別名: `rm`、`uninstall`) | インストール済みのプラグインを削除します。 |
| `enable <name>` | 無効にしたプラグインを有効にします。 |
| `disable <name>` | プラグインを削除せずに無効にします。 |
| `list`(別名: `ls`) | インストール済みのプラグインを、有効 / 無効の状態とともに一覧します。 |
| `doctor [path-or-id] [--ci]` | ネイティブのプラグインを、本物のマニフェスト解析・読み込み・登録の経路に通して検証します。`--ci` はエラーがあると 1 で終了します。 |
| `pack install <path-or-url> [--force]` | プラグインパック(`hermes-pack.yaml`)をインストールします — 40 文字のコミット SHA でそれぞれ固定した、宣言的なプラグインの一式です。必ず確認画面(プラグイン、供給元、固定した参照、宣言された権限)を出し、パックの中身について 1 回確認を求めたうえで、通常の固定インストールを実行します。各プラグインの宣言する権限は引き続きプラグインごとの通常の同意を通ります — パックがまとめて権限を与えることはありません。一部が失敗した場合はプラグインごとに報告し、1 つでも失敗すると非ゼロで終了します。対話でのみ使えます(`--yes` はありません)。 |
| `pack export [--enabled-only] [--name NAME]` | 今のインストール内容からパックの YAML を標準出力に出します。git から入れた各プラグインのリポジトリと厳密な SHA、それに秘密を含まない `plugins.entries` の設定を含みます。ローカルにしかないプラグイン(git の出所がないもの)は、インストールできる項目ではなく警告のコメントとして並べます。秘密、権限の許可、`allow_*` の制限は常に取り除かれます。 |
| `pack show <path-or-url>` | 確認のみです。パックを解析・検証して表示し、何もインストールしません。 |

プロバイダのプラグインの選択は `config.yaml` に保存されます。
- `memory.provider` — 有効なメモリプロバイダ(空なら組み込みのみ)
- `context.engine` — 有効なコンテキストエンジン(`"compressor"` が組み込みの既定)

一般のプラグインの無効リストは `config.yaml` の `plugins.disabled` に保存されます。
git から入れたものは、正規の供給元、実際に入れたリビジョン、固定の有無だけを、プロファイルごとの `plugins/.install-metadata.json` に記録します。プラグインの設定、環境の値、秘密、権限の許可は含まれません。

[プラグイン](/hermes/docs/user-guide/features/plugins/)と [Hermes のプラグインを作る](/hermes/docs/developer-guide/plugins/)をご覧ください。

## `hermes tools` {#hermes-tools}

```bash
hermes tools [--summary]
```

| オプション | 説明 |
|--------|-------------|
| `--summary` | 今有効なツールの要約を表示して終了します。 |

`--summary` を付けない場合は、プラットフォームごとにツールを設定する対話画面が開きます。

## `hermes computer-use` {#hermes-computer-use}

```bash
hermes computer-use <subcommand>
```

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `install` | 上流の cua-driver のインストーラを実行します(macOS、Windows、Linux)。 |
| `install --upgrade` | cua-driver がすでに PATH にあってもインストーラを実行し直します。上流のスクリプトは常に最新のリリースを取得するので、その場での更新になります。 |
| `status` | `cua-driver` が `$PATH` にあるかどうかと、入っているバージョンを表示します。 |
| `doctor [--include CHECK] [--skip CHECK] [--json]` | cua-driver の健康診断を実行し、プラットフォームごとの確認結果を表示します。 |
| `permissions status [--json]` | macOS のアクセシビリティと画面収録の許可の状態を報告します。 |
| `permissions grant` | Cua Driver にアクセシビリティと画面収録を許可するよう macOS に求めます。 |

`hermes computer-use install` は、`computer_use` ツールセットが使う [cua-driver](https://github.com/trycua/cua) のバイナリを入れるための、安定した入口です。Computer Use を初めて有効にしたときに `hermes tools` が呼ぶのと同じ上流のインストーラを実行するので、ツールセットの切り替えでインストールが走らなかったとき(たとえば、設定済みの環境で使い始めるとき)に入れ直すのにも安心して使えます。

cua-driver がすでに入っている場合、Hermes はそのバージョンと実行時のマニフェストを確認します。0.20.0 以降の互換性のあるインストールはそのまま残します。古い、または不完全な標準のインストールは、今の上流のインストーラで直します。`HERMES_CUA_DRIVER_CMD` で選んだ独自のバイナリを Hermes が置き換えることはありません。そのバイナリを直接更新するか、指定を外してください。修復が必要かどうかは `hermes computer-use status` が教えてくれます。

組み込みの `computer_use` ツールセットが、Hermes での使い方としておすすめです。Cua の生の MCP ツールを登録するのは、Cua の低水準のツールの語彙が必要なときの代わりの手段です。`cua-driver skills install` は Hermes を見つけると、Cua のスキル一式を Hermes のスキルのディレクトリへ自動で結び付けます。

権限のモードと権限マニフェストの承認は、実行時の起動に属します。制限付きのモードでは、Hermes は Cua の正式な `--capability-manifest` と `--approve-capability-manifest` のフラグを渡します。MCP の通信路はそれぞれ、実行環境の中に自分だけの生存期間のセッションを持ちます。公開のセッション名はカーソルとセッションの状態に付く名札であって、実行環境を所有したり共有したりはしません。

`hermes update` は、cua-driver が PATH にあれば更新の最後に上流のインストーラを自動で実行し直します。そのため、ほとんどの方は `--upgrade` を手で使う必要はありません。上流が出した修正を、次の Hermes の更新を待たずに今すぐ取り込みたいときに使ってください。

## `hermes pets` {#hermes-pets}

```bash
hermes pets <list|install|select|show|off|scale|remove|doctor>
```

[Petdex](https://github.com/crafter-station/petdex) は、コーディングのエージェント向けに作られたアニメーションのスプライトのペットを集めた公開ギャラリーです。1 匹入れると、Hermes が CLI・TUI・デスクトップアプリでエージェントの動きに反応するペットを表示します。

| サブコマンド | 説明 |
|------------|-------------|
| `list` | petdex のギャラリーを見て回ります。 |
| `install` | ギャラリーからペットを入れます。 |
| `select` | 今のペットを設定します(`display.pet.*` に書き込みます)。 |
| `show` | 今のペットをターミナルで動かして見せます。 |
| `off` | ペットの表示をやめます。 |
| `scale` | ペットの大きさをすべての画面で変えます(`display.pet.scale`)。 |
| `remove` | 入れたペットを削除します。 |
| `doctor` | ペットの設定と、ターミナルの画像表示への対応を確認します。 |

`/hatch` スラッシュコマンドを使えば、文章での説明からまったく新しいペットを作ることもできます。[ペット](/hermes/docs/user-guide/features/pets/)をご覧ください。

## `hermes sessions` {#hermes-sessions}

```bash
hermes sessions <subcommand>
```

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `list` | 最近のセッションを一覧します。 |
| `browse` | 検索と再開ができる、対話形式のセッション選択画面です。各行には状態を示す札(`done` / `intr` / `err` / `empty`。セッションの最後のメッセージから決まります)とメッセージ数が出ます。検索の絞り込みが空のとき、選んだ行で `d` を押すと y/N の確認のあとそのセッションを削除します。絞り込みが効いている間は、`d` は検索への文字入力になります。 |
| `export <output> [--session-id ID]` | セッションを JSONL に書き出します。 |
| `delete <session-id>` | セッションを 1 つ削除します。 |
| `prune` | 条件に合うセッションを削除します。期間は `--older-than` / `--newer-than` / `--before` / `--after`(`5h` / `2d` のような長さ、数字だけの日数、ISO のタイムスタンプ)、属性は `--source`、`--title`、`--model`、`--provider`、`--branch`、`--end-reason`、`--user`、`--chat-id`、`--chat-type`、`--cwd`、数値の範囲は `--min/--max-messages`、`--min/--max-tokens`、`--min/--max-cost`、`--min/--max-tool-calls`、さらに `--include-archived`、`--dry-run`、`--yes` が使えます。既定は 90 日より古いものです。 |
| `archive` | `prune` と同じ条件に合うセッションをまとめてアーカイブします(隠すだけで削除しません)。条件を 1 つ以上指定する必要があります。 |
| `stats` | セッションの保存状況の統計を表示します。 |
| `rename <session-id> <title>` | セッションのタイトルを設定・変更します。 |
| `optimize` | ディスクの空きを取り戻します。FTS5 の索引の断片をまとめ、VACUUM します。中身は変わらないので、セッションのデータには影響しません。 |
| `optimize-storage` | 全文検索の索引を、内容を外に持つ小さな v23 の形式へ移します。大きなデータベースでは `state.db` のかなりの割合を取り戻せます。 |
| `repair` | 壊れた `state.db` のスキーマ(例: `table messages_fts already exists`)を直し、見えなくなっていたセッションを戻します。先にバックアップを取ります。 |
| `repair-routing` | 経路の情報を失ったセッションの行に取り残された、ゲートウェイの会話をつなぎ直します(再起動のあとチャットが「時間を巻き戻したように見える」現象です)。既定では確認のみで、`--apply` を付けると実際につなぎ直します(先にゲートウェイを止めてください)。`--max-gap-seconds N` で連続とみなす幅を調整できます。取り違えの余地がない場合だけ直します。[セッション → 取り残されたゲートウェイのセッションを直す](/hermes/docs/user-guide/sessions/#repair-stranded-gateway-sessions)をご覧ください。 |
| `recover` | 壊れた `state.db` を、オフラインで中身を変えずに、別のきれいなデータベースへ救い出します。 |
| `retitle-skills` | `/skill` で始めたセッションのタイトルを、ユーザーが実際に入力した内容から付け直します。`--apply` を付けない限り、変更の一覧を表示するだけです。 |

## `hermes insights` {#hermes-insights}

```bash
hermes insights [--days N] [--source platform]
```

| オプション | 説明 |
|--------|-------------|
| `--days <n>` | 直近 `n` 日分を集計します(既定: 30)。 |
| `--source <platform>` | `cli`、`telegram`、`discord` などの発生元で絞り込みます。 |

## `hermes claw` {#hermes-claw}

```bash
hermes claw migrate [options]
```

OpenClaw の設定を Hermes へ移します。`~/.openclaw`(または指定したパス)から読み、`~/.hermes` へ書きます。古いディレクトリ名(`~/.clawdbot`、`~/.moltbot`)と設定ファイル名(`clawdbot.json`、`moltbot.json`)は自動で見つけます。

| オプション | 説明 |
|--------|-------------|
| `--dry-run` | 何も書かずに、移す内容を確認します。 |
| `--preset <name>` | 移行の型です: `full`(互換性のあるすべての設定)または `user-data`(基盤まわりの設定を除く)。どちらの型でも秘密は移しません — 明示的に `--migrate-secrets` を渡してください。 |
| `--overwrite` | ぶつかったとき、既存の Hermes のファイルを上書きします(既定では、ぶつかりがある計画は実行を拒否します)。 |
| `--migrate-secrets` | API キーも移します。`--preset full` のときでも必要です。 |
| `--no-backup` | 移行前に取る `~/.hermes/` の zip スナップショットを省きます(既定では、実行の前に復元用のアーカイブを 1 つ `~/.hermes/backups/pre-migration-*.zip` に書きます。`hermes import` で戻せます)。 |
| `--source <path>` | OpenClaw のディレクトリを指定します(既定: `~/.openclaw`)。 |
| `--workspace-target <path>` | 作業スペースの指示書(AGENTS.md)を置く先のディレクトリです。 |
| `--skill-conflict <mode>` | スキル名がぶつかったときの扱いです: `skip`(既定)、`overwrite`、`rename`。 |
| `--yes` | 確認のプロンプトを省略します。 |

### 何が移るか {#what-gets-migrated}

移行は、人格、メモリ、スキル、モデルのプロバイダ、メッセージングのプラットフォーム、エージェントの振る舞い、セッションの方針、MCP サーバー、TTS など 30 以上の区分をカバーします。項目は Hermes の対応するものへ**そのまま取り込まれる**か、手で見直すために**保管される**かのどちらかです。

**そのまま取り込まれるもの:** SOUL.md、MEMORY.md、USER.md、AGENTS.md、スキル(4 つの供給元ディレクトリ)、既定のモデル、独自のプロバイダ、MCP サーバー、メッセージングのプラットフォームのトークンと許可リスト(Telegram、Discord、Slack、WhatsApp、Signal、Matrix、Mattermost)、エージェントの既定値(推論の強さ、圧縮、人らしい遅延、タイムゾーン、サンドボックス)、セッションのリセット方針、承認のルール、TTS の設定、ブラウザの設定、ツールの設定、実行の制限時間、コマンドの許可リスト、ゲートウェイの設定、3 つの供給元からの API キー。

**手で見直すために保管されるもの:** cron ジョブ、プラグイン、フック / Webhook、メモリのバックエンド(QMD)、スキルの配布元の設定、UI / 識別情報、ログ、複数エージェントの構成、チャンネルの割り当て、IDENTITY.md、TOOLS.md、HEARTBEAT.md、BOOTSTRAP.md。

**API キーの解決**は 3 つの供給元を優先度順に見ます: 設定の値 → `~/.openclaw/.env` → `auth-profiles.json`。トークンの項目はすべて、素の文字列、環境変数のひな形(`${VAR}`)、SecretRef のオブジェクトを扱えます。

設定キーの対応表の全体、SecretRef の扱いの詳細、移行後の確認事項については、**[移行の案内](/hermes/docs/guides/migrate-from-openclaw/)**をご覧ください。

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

**Claude Code**(`~/.claude`)または **OpenAI Codex CLI**(`~/.codex`)の設定を Hermes へ取り込みます。`CLAUDE.md` / `AGENTS.md` の指示をメモリの項目へ、`Bash(...)` の許可 / 拒否のルールを `command_allowlist` / `approvals.deny` へ、MCP サーバーを `config.yaml` の `mcp_servers` へ、スキルのディレクトリを `~/.hermes/skills/` へ対応付けます。実行の前に必ず内容を示します。API キーと資格情報は決して取り込みません。

| オプション | 説明 |
| --- | --- |
| `agent` | `claude-code` または `codex`(既定: 自動判別)。 |
| `--source <path>` | 取り込み元のディレクトリを指定します(既定: `~/.claude` または `~/.codex`)。 |
| `--dry-run` | 確認のみです — 何も書きません。 |
| `--overwrite` | ぶつかった MCP サーバー / スキルを置き換えます(既定: 飛ばします)。 |
| `--yes`, `-y` | 確認のプロンプトを省略します。 |

対応表の全体は**[取り込みの案内](/hermes/docs/user-guide/import-from-other-agents/)**をご覧ください。

## `hermes serve` {#hermes-serve}

```bash
hermes serve [options]
```

Hermes の**バックエンドサーバー**を起動します — [デスクトップアプリ](/hermes/docs/user-guide/desktop/)やリモートのクライアントがつなぐ、JSON-RPC / WebSocket の窓口です。`hermes dashboard` が動かすのと同じサーバーですが、**画面がありません**。ブラウザの UI を開くことは決してありません。デスクトップアプリは自分で `hermes serve` のバックエンドを起こすので、このコマンドを直接使うのは、リモートのホストで画面なしのバックエンドを動かしたいときです。下記の `hermes dashboard` と同じ `--host` / `--port` / `--insecure` / `--skip-build` / `--stop` / `--status` のオプションを受け取ります(ループバック以外に開くと、同じ認証の関門が働きます)。`[web]` の追加部品が必要で、組み込みのチャットの通信路は POSIX のホストでさらに `[pty]` を必要とします。

**ポートのぶつかり:** 指定したポート(既定 `9119`)がすでに別のプロセス(2 つめの `hermes serve` やゲートウェイなど)に使われている場合、このコマンドは機械が読める目印の行 `BACKEND_PORT_IN_USE port=<port>` を標準出力に出し、使っていそうな相手を示す説明を添えて、汎用のエラーではなく終了コード **75**(`EX_TEMPFAIL`)で終わります — おかげでスクリプトやデスクトップアプリは「ポートがふさがっている」と「バックエンドが壊れている」を見分けられます。`--port 0` を渡すと空いているポートを自動で使います(起動に成功すると、選ばれたポートを `HERMES_BACKEND_READY port=<port>` で知らせます)。

## `hermes dashboard` {#hermes-dashboard}

```bash
hermes dashboard [options]
```

Web ダッシュボードを起動します — 設定や API キーを管理し、セッションを見守るブラウザの UI です。(ブラウザの UI がない画面なしのバックエンド — デスクトップアプリが起こすもの — が欲しいときは、上の [`hermes serve`](#hermes-serve) を使ってください。)`cd ~/.hermes/hermes-agent && uv pip install -e ".[web]"`(FastAPI + Uvicorn)が必要です。ブラウザに組み込まれたチャットのタブはいつでも使えますが、さらに `pty` の追加部品(`cd ~/.hermes/hermes-agent && uv pip install -e ".[web,pty]"`)と、Linux・macOS・WSL2 のような POSIX の PTY 環境が必要です。詳しくは [Web ダッシュボード](/hermes/docs/user-guide/features/web-dashboard/)をご覧ください。

| オプション | 既定 | 説明 |
|--------|---------|-------------|
| `--port` | `9119` | Web サーバーを動かすポート |
| `--host` | `127.0.0.1` | 待ち受けるアドレス |
| `--no-open` | — | ブラウザを自動で開きません |
| `--insecure` | off | **非推奨で、何も起きません。** かつてはループバック以外に開いたとき認証を省くものでした。2026 年 6 月の強化以降、公開のアドレスに開く場合は*常に*認証の仕組み(パスワードまたは OAuth)が必要です。手元だけで使うなら `127.0.0.1` に開いてトンネルしてください。 |
| `--skip-build` | off | Web UI のビルドを飛ばし、すでにある `dist` をそのまま配信します。npm が使えない、対話しない場面(Windows のタスクスケジューラ、CI)で便利です。あらかじめ `cd web && npm run build` でビルドしておいてください。 |
| `--isolated` | off | 名前付きのプロファイルから起動したとき(`worker dashboard`)、端末のダッシュボードへ回さず、そのプロファイル専用のサーバーを動かします。 |
| `--stop` | — | 動いている `hermes dashboard` のプロセスを止めて終了します。 |
| `--status` | — | 動いている `hermes dashboard` のプロセスを一覧して終了します。 |

### `hermes dashboard register` {#hermes-dashboard-register}

このインストールを、自分で運用するダッシュボードとして Nous Portal のアカウントに登録します。OAuth のクライアントを作り、`~/.hermes/.env` に `HERMES_DASHBOARD_OAUTH_CLIENT_ID` を書き込み、ログインの関門を有効にする方法を表示します。あらかじめログインしておく必要があります(`hermes setup`)。

| オプション | 説明 |
|--------|-------------|
| `--name` | ダッシュボードの、人が読むための名前です(既定: 自動生成)。 |
| `--redirect-uri` | 公開の HTTPS の OAuth リダイレクト URI です(例: `https://hermes.example.com/auth/callback`)。localhost だけで使うなら省いてください。 |
| `--portal-url` | 登録に使う Nous Portal のベース URL を上書きします(既定: ログインした Portal)。`HERMES_DASHBOARD_PORTAL_URL` でも指定できます。 |

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

プロファイル — 互いに隔離された複数の Hermes で、それぞれが自分の設定、セッション、スキル、ホームディレクトリを持ちます — を管理します。

| サブコマンド | 説明 |
|------------|-------------|
| `list` | すべてのプロファイルを一覧します。 |
| `use <name>` | 既定として使い続けるプロファイルを設定します。 |
| `create <name> [--clone] [--clone-all] [--clone-from <source>] [--no-alias]` | 新しいプロファイルを作ります。`--clone` は今のプロファイルから設定、`.env`、`SOUL.md`、スキルをコピーします。`--clone-all` は状態をすべてコピーします。`--clone-from` はコピー元のプロファイルを指定し、`--clone-all` と併用しない限り設定のコピーを行います。 |
| `delete <name> [-y]` | プロファイルを削除します。 |
| `show <name>` | プロファイルの詳細(ホームディレクトリ、設定など)を表示します。 |
| `alias <name> [--remove] [--name NAME]` | プロファイルに手早く入るためのラッパースクリプトを管理します。 |
| `rename <old> <new>` | プロファイルの名前を変えます。 |
| `export <name> [-o FILE]` | プロファイルを `.tar.gz` のアーカイブに書き出します(手元のバックアップ)。 |
| `import <archive> [--name NAME]` | `.tar.gz` のアーカイブからプロファイルを取り込みます(手元からの復元)。 |
| `install <source> [--name N] [--alias] [--force] [-y]` | git の URL か手元のディレクトリから、配布されたプロファイルを入れます。 |
| `update <name> [--force-config] [-y]` | 配布物を取り直します。ユーザーのデータ(メモリ、セッション、認証)は保たれます。 |
| `info <name>` | プロファイルの配布マニフェスト(バージョン、必要なもの、供給元)を表示します。 |

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

シェルの補完スクリプトを標準出力に出します。出力をシェルの設定ファイルで読み込むと、Hermes のコマンド、サブコマンド、プロファイル名がタブで補完できるようになります。

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

最新の `hermes-agent` のコードを取得し、管理下の venv に依存関係を入れ直したうえで、インストール後の処理(MCP サーバー、スキルの同期、補完の設定)を実行し直します。動いているインストールに対して実行しても安全です。インストールせずに `origin/main` より遅れているかどうかだけ見たいときは `--check` を使ってください。

`hermes update` は設定された更新用のブランチ(既定: `main`)を取得します。手元が別のブランチにある場合、Hermes は取得の前に更新用のブランチへ切り替えることがあります。ブランチでの作業を更新時の一時退避の流れの外に置いておきたいときは、更新の前にコミットしておいてください。

| オプション | 説明 |
|--------|-------------|
| `--gateway` | メッセージングの `/update` コマンドが使う内部向けのモードです。ターミナルの標準入力を読む代わりに、ファイル経由のやり取りで確認と進み具合を伝えます。ゲートウェイを再起動するためのフラグではありません。 |
| `--check` | 取得もインストールも再起動もせずに、更新があるかどうかだけ確認します。 |
| `--plan` | 何も変えずに更新の計画を表示して終了します。インストールの種類(git / Docker / Nix / apt)、すべてのプロファイルで動いている Hermes のサービスと、その監視のしかたおよび動いているコードのバージョン、そしてそれぞれをどう再起動するかを示します。イメージやパッケージで管理されているインストールでは、代わりに正しい外部の更新コマンドを教えます。読むだけで、何も変えません。 |
| `--no-backup` | `updates.pre_update_backup` の設定にかかわらず、この実行では更新前のバックアップ(手早い状態のスナップショットも、完全な zip も)をすべて省きます。 |
| `--backup` | この実行では更新前に**完全な**バックアップを取ります。手早い状態のスナップショットに加えて、`HERMES_HOME` 全体(設定、認証、セッション、スキル、ペアリングのデータ)の zip を作ります。既定のモードは `quick` — 軽い状態のスナップショットだけです。恒久的なモードは `config.yaml` の `updates.pre_update_backup: quick | full | off` で設定します。 |
| `--yes`, `-y` | 設定の移行や退避の復元といった、対話の確認にすべて「はい」と答えます。API キーの入力は飛ばされるので、それらは `hermes config migrate` を別に実行してください。 |

そのほかの挙動:

- **ゲートウェイの再起動。** 更新に成功したあと、新しいコードを使うよう、Hermes は動いているすべてのゲートウェイのプロファイルを自動で再起動しようとします。更新せずにゲートウェイだけ再起動したいときは `hermes gateway restart` を使ってください。
- **再起動の段階からの復旧。** プロセス内での再起動の段階が、取得したばかりのツリーを読み込む途中で止まった場合、監視下のゲートウェイのプロファイルはきれいな Python のプロセスで再試行されます。systemd(`systemctl --user is-active`)が独立に確認した再起動だけを成功と報告し、単に 0 で終了しただけの起こし直しは `relaunch_attempted` として記録し、安全側に倒して更新を失敗扱いにします。手動で動かしているゲートウェイや serve / dashboard の実行環境は、起こし直す責任者がいない状態で終了させられることは決してありません。理由付きで「飛ばした」と記録され、正確な再起動コマンドとともに未完了の更新の報告に残ります。
- **更新の控えと、まとめてのバージョン確認。** 実行のたびに、機械が読める控えが `~/.hermes/logs/update_receipts/` に書かれます(更新前の全体の計画、手順、飛ばしたものとその理由、再起動の結果。`latest.json` が最新を指します)。再起動の段階のあと、更新の仕組みは動いている各ゲートウェイのコードを更新後のツリーと照らし合わせ、プロファイルごとのバージョンの一覧を表示します。更新前のコードのままのゲートウェイがあると、正確な再起動コマンドを添えて更新は失敗します(終了コード 1)。
- **手元のソースの変更。** git のインストールでは、追跡中の変更のあるファイルと未追跡のファイルは、ブランチの切り替えや取得の前に自動で退避されます(`git stash push --include-untracked`)。対話的なターミナルでの更新は、退避を戻す前に確認します。対話しない更新は既定で戻します。取得に成功したあと手元のソースの編集を捨ててよい、管理された環境でだけ `updates.non_interactive_local_changes: discard` を設定してください。退避を戻すときにぶつかった場合や、取得に失敗した場合は、手で復旧できるよう退避はそのまま残ります。
- **npm のロックファイルの揺れ。** 退避やブランチの切り替えの前に、Hermes は npm の install / build の手順で生じた、追跡中の `package-lock.json` の差分をできる範囲で片付けます。意図してロックファイルを編集した場合は、`hermes update` の前にコミットするか手動で退避してください。
- **ペアリングのデータのスナップショット。** `--backup` が off でも、`hermes update` は `git pull` の前に `~/.hermes/pairing/` と Feishu のコメントのルールの軽いスナップショットを取ります。編集中だったファイルが取得で書き換わってしまった場合は、`hermes backup restore --state pre-update` で戻せます。
- **古い `hermes.service` の警告。** 名称変更前の `hermes.service` の systemd ユニット(今の `hermes-gateway.service` ではないもの)を見つけると、起動を繰り返す不具合を避けられるよう、一度だけ移行の案内を表示します。
- **終了コード。** 成功は `0`、取得 / インストール / インストール後の処理の失敗は `1`、`git pull` を妨げる予期しない作業ツリーの変更は `2` です。

## 保守のためのコマンド {#maintenance-commands}

| コマンド | 説明 |
|---------|-------------|
| `hermes --version` | バージョン情報を表示します。 |
| `hermes update` | 最新の変更を取得して依存関係を入れ直します。 |

| `hermes uninstall [--full] [--gui] [--dry-run] [--yes]` | Hermes を削除します。設定やデータもすべて消すかどうかを選べます。`--gui` はデスクトップのチャット GUI だけを削除し、エージェントはそのまま残します。`--full` は設定やデータも消します。`--dry-run` は何も変えずに削除されるものを表示します。`--yes` は確認を省きます。 |

## 関連するページ {#see-also}

- [スラッシュコマンド早見表](/hermes/docs/reference/slash-commands/)
- [CLI の使い方](/hermes/docs/user-guide/cli/)
- [セッション](/hermes/docs/user-guide/sessions/)
- [スキルの仕組み](/hermes/docs/user-guide/features/skills/)
- [スキンとテーマ](/hermes/docs/user-guide/features/skins/)
