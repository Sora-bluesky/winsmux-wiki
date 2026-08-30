---
title: "CLI コマンド早見表"
description: "Hermes のターミナル コマンドとコマンド群をまとめた決定版の早見表"
upstream_path: reference/cli-commands.md
upstream_blob: 8a0fe76233a759526aa5f5d522b8364f8ea60d99
sources:
  - https://hermes-agent.nousresearch.com/docs/reference/cli-commands
---

# CLI コマンド早見表 {#cli-commands-reference}

このページでは、シェルから打つ**ターミナルのコマンド**をまとめています。

チャットの中で使うスラッシュコマンドは [スラッシュコマンド早見表](/hermes/docs/reference/slash-commands/) を参照してください。

## 全体の入口 {#global-entrypoint}

```bash
hermes [global-options] <command> [subcommand/options]
```

### 全体に効くオプション {#global-options}

| オプション | 説明 |
|--------|-------------|
| `--version`、`-V` | 版を表示して終了します。 |
| `--profile <name>`、`-p <name>` | この実行で使う Hermes のプロファイルを選びます。`hermes profile use` で決めた既定より優先されます。 |
| `--resume <session>`、`-r <session>` | 以前のセッションを ID か名前で再開します。`latest` と書くといちばん新しいセッションを再開します（ワークスペース単位で、`-c` と同じ探し方です）。 |
| `--continue [name]`、`-c [name]` | いちばん新しいセッション、または名前が一致するいちばん新しいセッションを再開します。 |
| `--in <dir>` | 起動や再開の前に `<dir>` へ移動します。`--resume latest` と `-c` の探索をそのディレクトリのワークスペースに絞り、セッションもそこに留めます（記録された作業ディレクトリへ戻しません）。 |
| `--worktree`、`-w` | 複数のエージェントを並行して動かすために、独立した git のワークツリーで始めます。 |
| `--yolo` | 危険なコマンドの承認を省きます。 |
| `--pass-session-id` | エージェントのシステム プロンプトにセッション ID を含めます。 |
| `--ignore-user-config` | `~/.hermes/config.yaml` を読まず、組み込みの既定値を使います。`.env` の認証情報は読み込まれます。 |
| `--ignore-rules` | `AGENTS.md`、`SOUL.md`、`.cursorrules`、記憶、あらかじめ読み込むスキルの自動注入をやめます。 |
| `--tui` | 従来型の CLI ではなく [TUI](/hermes/docs/user-guide/tui/) を起動します。`HERMES_TUI=1` と同じです。つねに `display.interface` より優先されます。 |
| `--cli` | 従来型の prompt_toolkit の対話画面を強制します。`display.interface: tui` をその 1 回だけ打ち消したいときに使います。 |
| `--dev` | `--tui` と一緒に使うと、できあがった束ではなく TypeScript のソースを `tsx` で直接動かします（TUI に手を入れる人向け）。 |

## 主なコマンド {#top-level-commands}

| コマンド | 用途 |
|---------|---------|
| `hermes chat` | エージェントと対話する、または 1 回だけやり取りします。 |
| `hermes model` | 既定のプロバイダーとモデルを対話的に選びます。 |
| `hermes moa` | モデル選択画面から選べる、名前を付けた Mixture of Agents のプリセットを設定します。 |
| `hermes fallback` | 主なモデルがエラーになったときに試す、代替のプロバイダーを管理します。 |
| `hermes gateway` | メッセージングのゲートウェイのサービスを動かす・管理します。 |
| `hermes proxy` | OAuth のプロバイダーの認証情報を付ける、手元の OpenAI 互換プロキシです。[サブスクリプション プロキシ](/hermes/docs/user-guide/features/subscription-proxy/) を参照してください。 |
| `hermes egress` | 離れた場所のターミナルのサンドボックス向けに、送信時に認証情報を差し込むファイアウォール（iron-proxy）です。既定では無効です。[送信プロキシ](/hermes/docs/user-guide/egress/iron-proxy/) を参照してください。 |
| `hermes lsp` | Language Server Protocol の連携を管理します（write_file と patch のための意味的な診断）。 |
| `hermes setup` | 設定の全体、または一部を対話的に用意するウィザードです。 |
| `hermes whatsapp` | WhatsApp の橋渡しを設定し、端末を紐づけます。 |
| `hermes whatsapp-cloud` | Meta 公式の WhatsApp Business Cloud API のアダプターを設定します（ビジネス アカウントと公開の webhook が必要です）。`hermes whatsapp`（Baileys による個人アカウントの橋渡し）とは別ものです。 |
| `hermes slack` | Slack 向けの補助です（現時点では、すべてのコマンドをネイティブのスラッシュとして登録するアプリのマニフェストを生成します）。 |
| `hermes auth` | 認証情報を管理します（追加、一覧、削除、初期化、状態、ログアウト）。Codex / Nous / Anthropic の OAuth のやり取りも扱います。 |
| `hermes login` / `logout` | **非推奨** — 代わりに `hermes auth` を使ってください。 |
| `hermes send` | 設定済みのメッセージング プラットフォーム（Telegram、Discord、Slack、Signal、SMS、…）へ 1 回だけメッセージを送ります。シェルのスクリプト、cron の作業、CI のフック、監視の常駐プロセスから便利に使えます。エージェントも LLM も動きません。 |
| `hermes peer` | ほかの端末にある Hermes のゲートウェイを相手として登録し、そのエージェントの標準の Bot Chat に直接話しかけます（`hermes peer dm <peer>[/<agent>] "…"`）。端末をまたぐボット同士のやり取りを支える経路です。 |
| `hermes secrets` | 外部の秘密の保管先（現時点では Bitwarden Secrets Manager）を管理し、`~/.hermes/.env` の代わりにプロセスの起動時に API キーを取ってきます。 |
| `hermes migrate` | `config.yaml` を調べ、必要なら書き換えて、廃止されたモデルや非推奨の設定への参照を置き換えます（たとえば `migrate xai`）。 |
| `hermes status` | エージェント、認証、プラットフォームの状態を表示します。 |
| `hermes cron` | cron のスケジューラーを確認し、実行させます。 |
| `hermes kanban` | 複数プロファイルの共同作業ボード（作業、依存関係、ディスパッチャー）です。 |
| `hermes project` | 名前を付けた、複数フォルダーにまたがるワークスペース（プロジェクト）を管理します。デスクトップでのセッションのまとまりの土台になり、かんばんのボードと結び付けると、作業に決まった形のワークツリーとブランチが割り当てられます。状態はプロファイルごとに持ちます。 |
| `hermes webhook` | 出来事をきっかけに動かすための、動的な webhook の登録を管理します。 |
| `hermes hooks` | `config.yaml` に書いたシェル スクリプトのフックを確認、承認、削除します。 |
| `hermes doctor` | 設定や依存関係の問題を調べます。 |
| `hermes security audit` | 仮想環境、プラグインの依存、固定した MCP サーバーについて、供給網の点検（OSV.dev）をその場で行います。 |
| `hermes approvals` | 承認まわりの道具です。承認の履歴を掘って、許可リストの案を作ります。 |
| `hermes dump` | サポートや調査のために、貼り付けられる形で設定の要約を出します。 |
| `hermes prompt-size` | システム プロンプトとツールのスキーマ（スキルの索引、記憶、利用者像）のバイト数の内訳を表示します。ネットにつながずに動きます。 |
| `hermes debug` | 調査用の道具です。ログとシステム情報をサポート向けに送ります。 |
| `hermes backup` | Hermes のホーム ディレクトリを zip ファイルに保存します。 |
| `hermes checkpoints` | `~/.hermes/checkpoints/`（`/rollback` が使う裏の保管場所）を確認・整理・消去します。引数なしで実行すると全体の状態が出ます。 |
| `hermes import` | zip ファイルから Hermes のバックアップを復元します。 |
| `hermes logs` | エージェント、ゲートウェイ、エラーのログを見る・追う・絞り込みます。 |
| `hermes config` | 設定ファイルを表示、編集、移行、問い合わせします。 |
| `hermes skin` | 表示のスキンを一覧、切り替え、調整します。 |
| `hermes console` | 安全な Hermes のコマンド コンソールを開きます。 |
| `hermes pairing` | メッセージングの紐づけコードを承認・取り消しします。 |
| `hermes skills` | スキルを閲覧、導入、公開、点検、設定します。 |
| `hermes bundles` | 複数のスキルを 1 つの `/<name>` スラッシュコマンドにまとめます。[スキル束](/hermes/docs/user-guide/features/skills/#skill-bundles) を参照してください。 |
| `hermes curator` | スキルをバックグラウンドで手入れします（状態、実行、一時停止、固定）。[キュレーター](/hermes/docs/user-guide/features/curator/) を参照してください。 |
| `hermes journey`（別名 `learning`、`memory-graph`） | 覚えたスキルと記憶の移り変わりを時系列で表示します。 |
| `hermes memory` | 外部の記憶の提供元を設定します。提供元ごとのサブコマンド（たとえば `hermes honcho`）は、その提供元が有効なときに自動で登録されます。 |
| `hermes acp` | エディター連携のために、Hermes を ACP のサーバーとして動かします。 |
| `hermes mcp` | MCP サーバーの設定を管理し、Hermes を MCP サーバーとして動かします。 |
| `hermes plugins` | Hermes Agent のプラグインを管理します（導入、有効化、無効化、削除）。 |
| `hermes portal` | Nous Portal の状態、契約へのリンク、Tool Gateway の経路を表示します。[Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/) を参照してください。 |
| `hermes tools` | プラットフォームごとに使うツールを設定します。 |
| `hermes computer-use` | Computer Use（cua-driver）のバックエンドを導入・確認します（macOS / Windows / Linux）。 |
| `hermes pets` | CLI、TUI、デスクトップ アプリに出てくる [petdex](/hermes/docs/user-guide/features/pets/) のペットを閲覧、導入、選択します。サブコマンドは `list`、`install`、`select`、`show`、`off`、`scale`、`remove`、`doctor` です。 |
| `hermes sessions` | セッションを閲覧、書き出し、整理、改名、削除します。 |
| `hermes insights` | トークン、費用、活動の統計を表示します。 |
| `hermes claw` | OpenClaw からの移行を助けます。 |
| `hermes import-agent` | Claude Code（`~/.claude`）や Codex CLI（`~/.codex`）の設定を取り込みます。 |
| `hermes dashboard` | 設定、API キー、セッションを管理するウェブ ダッシュボードを起動します。 |
| `hermes serve` | Hermes のバックエンド サーバーを起動します（画面なし。デスクトップ アプリと離れた場所のバックエンドを支えます）。 |
| `hermes desktop`（別名 `gui`） | ネイティブの Electron のデスクトップ アプリを組み立てて起動します。 |
| `hermes profile` | プロファイル（互いに独立した複数の Hermes）を管理します。 |
| `hermes completion` | シェルの補完スクリプトを出力します（bash / zsh / fish）。 |
| `hermes --version` | 版の情報を表示します。 |
| `hermes update` | 最新のコードを取得して依存関係を入れ直します。`--check` は導入せずに下見をし、`--backup` は取得の前に `HERMES_HOME` のスナップショットを取ります。 |
| `hermes uninstall` | Hermes をシステムから取り除きます。 |

## `hermes chat` {#hermes-chat}

```bash
hermes chat [options]
```

よく使うオプション:

| オプション | 説明 |
|--------|-------------|
| `-q`、`--query "..."` | セッションの最初にプロンプトを渡します。本物の端末では、その文章が**そのまま**ふつうの対話セッションの最初のターンとして送られ（スラッシュコマンドや `!` によるシェルの呼び出しとしては解釈されません）、セッションはそのまま続きます。OS のランチャーやデスクトップ連携に向いています。`--oneshot`、`-Q`、あるいは端末でない入出力のときは、答えて終了します。 |
| `--query-file PATH` | 質問をファイルから読みます（`-` は標準入力）。シェルの解釈がまったく入らないので、引用符や `$(...)`、バッククォートもそのまま届きます。プログラムから渡す本文や、信頼できない本文にはこちらを使ってください（ボット モードの仲間同士のやり取りもこれを使います）。`-q` とは同時に使えません。 |
| `--oneshot` | `-q` や `--query-file` と一緒に使うと、対話セッションを始めずに答えて終了します（0.21 より前の 1 回だけの動きです）。端末でない入出力のときと `-Q` のときは自動でこうなります。 |
| `-m`、`--model <model>` | この実行のモデルを上書きします。 |
| `-t`、`--toolsets <csv>` | カンマ区切りで指定したツールセットを有効にします。 |
| `--provider <provider>` | プロバイダーを指定します。`auto`、`openrouter`、`nous`、`openai-codex`、`copilot-acp`、`copilot`、`anthropic`、`gemini`、`huggingface`、`novita`（別名 `novita-ai`、`novitaai`）、`openai-api`、`zai`、`kimi-coding`、`kimi-coding-cn`、`minimax`、`minimax-cn`、`minimax-oauth`、`kilocode`、`xiaomi`、`arcee`、`gmi`、`upstage`（別名 `solar`）、`alibaba`、`alibaba-cn`、`alibaba-coding-plan`（別名 `alibaba_coding`）、`alibaba-coding-plan-cn`、`alibaba-token-plan`、`alibaba-token-plan-cn`、`deepseek`、`nvidia`、`ollama-cloud`、`xai`（別名 `grok`）、`xai-oauth`（別名 `grok-oauth`）、`qwen-oauth`、`bedrock`、`opencode-zen`、`opencode-go`、`opencode-free`（別名 `free`、`opencode_free`。キー不要）、`commandcode`、`commandcode-anthropic`、`ai-gateway`、`azure-foundry`、`lmstudio`、`stepfun`、`tencent-tokenhub`（別名 `tencent`、`tokenhub`）、`router`（別名 `ramp-router`、`ramp`）、`nebius-token-factory`（別名 `nebius`、`nebius-tf`、`tokenfactory`）、`tencent-tokenplan`（別名 `tokenplan`、`tencent-lkeap`）。 |
| `-s`、`--skills <name>` | このセッションであらかじめ読み込むスキルを指定します（繰り返しでも、カンマ区切りでも書けます）。 |
| `-v`、`--verbose` | 詳しく表示します。 |
| `-Q`、`--quiet` | プログラム向けのモード。見出し、待機表示、ツールの下見を出しません。 |
| `--image <path>` | 1 回の質問に、手元の画像を添えます。 |
| `--resume <session>` / `--continue [name]` | `chat` から直接セッションを再開します。 |
| `--worktree` | この実行のために、独立した git のワークツリーを作ります。 |
| `--checkpoints` | ファイルを壊す変更の前に、ファイルのチェックポイントを取ります。 |
| `--yolo` | 承認の確認を省きます。 |
| `--pass-session-id` | セッション ID をシステム プロンプトに渡します。 |
| `--ignore-user-config` | `~/.hermes/config.yaml` を読まず、組み込みの既定値を使います。`.env` の認証情報は読み込まれます。独立した CI の実行、再現性のある不具合報告、他社との連携に向いています。 |
| `--ignore-rules` | `AGENTS.md`、`SOUL.md`、`.cursorrules`、残っている記憶、あらかじめ読み込むスキルの自動注入をやめます。`--ignore-user-config` と組み合わせると、完全に独立した実行になります。 |
| `--safe-mode` | 不具合を調べるためのモード。ユーザーの設定、ルールと記憶の注入、プラグイン、シェルのフック、MCP サーバーといったカスタマイズをすべて無効にします（`--ignore-user-config` と `--ignore-rules` を含みます）。問題が自分の環境のものか Hermes 自体のものかを切り分けるのに使います。 |
| `--source <tag>` | 絞り込み用のセッションの出どころの札（既定: `cli`）。ユーザーのセッション一覧に出したくない他社との連携には `tool` を使ってください。 |
| `--max-turns <N>` | 会話の 1 ターンでツールを呼ぶ回数の上限（既定は 500、または設定の `agent.max_turns`）。 |

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

### `hermes -z <prompt>` — スクリプトからの 1 回きりの実行 {#hermes--z-prompt-scripted-one-shot}

プログラムから呼ぶとき（シェルのスクリプト、CI、cron、プロンプトを流し込む親プロセス）、`hermes -z` がいちばん素直な 1 回きりの入口です。**プロンプトを 1 つ渡すと、最後の返答の文章だけが返り、標準出力にも標準エラーにもほかは何も出ません。** 見出しも、待機表示も、ツールの下見も、`Session:` の行もなく、エージェントの最終的な返事だけが素の文字として出ます。

```bash
hermes -z "What's the capital of France?"
# → Paris.

# Parent scripts can cleanly capture the response:
answer=$(hermes -z "summarize this" < /path/to/file.txt)
```

その実行だけの上書き（`~/.hermes/config.yaml` は変わりません）:

| オプション | 対応する環境変数 | 用途 |
|---|---|---|
| `-m` / `--model <model>` | `HERMES_INFERENCE_MODEL` | この実行のモデルを上書きします |
| `--provider <provider>` | _(なし)_ | この実行のプロバイダーを上書きします |
| `--usage-file <path>` | _(なし)_ | 実行のあとに JSON の利用状況の報告を書き出します（下記参照） |

```bash
hermes -z "…" --provider openrouter --model openai/gpt-5.5
# or:
HERMES_INFERENCE_MODEL=anthropic/claude-sonnet-4.6 hermes -z "…"
```

エージェントもツールもスキルも同じで、対話や見た目のための層をすべて剥がしただけです。記録にツールの出力も残したいなら `hermes chat --oneshot -q` を使ってください。`-z` は「最終的な答えだけほしい」という用途のためのものです。

#### `--usage-file` — パイプライン向けの JSON の利用状況報告 {#--usage-file-json-usage-report-for-pipelines}

`hermes -z "…" --usage-file /path/report.json` と書くと、実行のあとに機械が読める利用状況の報告を書き出します。`estimated_cost_usd`、`input_tokens` / `output_tokens` / `cache_read_tokens` / `cache_write_tokens` / `reasoning_tokens` / `total_tokens`、`api_calls`、`model`、`provider`、`session_id`、`service_tier`、それに `completed` / `failed` の印が入ります。**実行が失敗したときも書き出される**ので、まとめて処理するパイプラインでもつねに費用を把握できます。`-z` と `--oneshot` の外では何も起きず、報告の書き出しに失敗しても、実行そのものの結果が覆い隠されることはありません。

```bash
hermes -z "summarize this repo" --usage-file /tmp/usage.json
jq .estimated_cost_usd /tmp/usage.json
```

## `hermes model` {#hermes-model}

対話的にプロバイダーとモデルを選ぶコマンドです。**新しいプロバイダーの追加、API キーの設定、OAuth のやり取りはこのコマンドで行います。** 動いている Hermes のチャット セッションの中ではなく、ターミナルから実行してください。

```bash
hermes model
```

次のようなときに使います。
- **新しいプロバイダーを足す**（OpenRouter、Anthropic、Copilot、DeepSeek、独自のものなど）
- OAuth を使うプロバイダーにログインする（Anthropic、Copilot、Codex、Nous Portal）
- API キーを入力・更新する
- プロバイダーごとのモデル一覧から選ぶ
- 独自や自前のエンドポイントを設定する
- 新しい既定値を設定に保存する

:::warning hermes model と /model の違い
**`hermes model`**（Hermes のセッションの外、ターミナルから実行）は、**プロバイダーを一から用意するウィザード**です。新しいプロバイダーを足し、OAuth のやり取りを行い、API キーを尋ね、エンドポイントを設定できます。

**`/model`**（動いている Hermes のチャット セッションの中で打つ）は、**すでに用意してあるプロバイダーとモデルの間を切り替える**ことしかできません。新しいプロバイダーの追加も、OAuth も、API キーの入力もできません。

**新しいプロバイダーを足したいときは:** まず Hermes のセッションを抜けて（`Ctrl+C` か `/quit`）、ターミナルから `hermes model` を実行してください。
:::

### `/model` スラッシュコマンド（セッションの途中） {#model-slash-command-mid-session}

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

既定では、`/model` の変更は**いまのセッションだけ**に効きます。`--global` を足すと `config.yaml` に保存されます（`model.persist_switch_by_default: true` にすれば、すべての切り替えが保存されます）。

```
/model claude-sonnet-4 --global     # Switch and save as new default
```

:::info OpenRouter のモデルしか出てこないときは
OpenRouter しか設定していなければ、`/model` には OpenRouter のモデルしか出ません。別のプロバイダー（Anthropic、DeepSeek、Copilot など）を足すには、セッションを抜けてターミナルから `hermes model` を実行してください。
:::

`--global` で切り替えると、モデルと一緒にプロバイダーとベース URL の変更も `config.yaml` に保存されます。独自のエンドポイントから離れるときは、古いベース URL がほかのプロバイダーに漏れないように消されます。

## `hermes gateway` {#hermes-gateway}

```bash
hermes gateway <subcommand>
```

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `run` | ゲートウェイを前面で動かします。WSL、Docker、Termux ではこちらをおすすめします。 |
| `start` | 導入済みの systemd / launchd のバックグラウンドのサービスを起動します。 |
| `stop` | サービス（または前面のプロセス）を止めます。 |
| `restart` | サービスを再起動します。 |
| `status` | サービスの状態を表示します。 |
| `list` | **すべてのプロファイル**と、それぞれのゲートウェイが動いているかどうかを一覧します（分かる場合は PID も出ます）。複数のプロファイルを並べて動かしていて、まとめて見たいときに便利です。 |
| `install` | systemd（Linux）か launchd（macOS）のバックグラウンドのサービスとして導入します。 |
| `uninstall` | 導入したサービスを取り除きます。 |
| `setup` | メッセージング プラットフォームを対話的に設定します。 |
| `migrate-legacy` | 名前を変える前の導入で残った、古い `hermes.service` のユニットを取り除きます。プロファイルのユニット（`hermes-gateway-<profile>.service`）や無関係なサービスには決して触れません。オプションは `--dry-run`、`-y`/`--yes`。 |
| `enroll` | 実験的な機能です。このゲートウェイをリレーのコネクターに登録し、コネクター経由のプラットフォーム向けにリレーの認証情報を保存します。[Hermes リレー](/hermes/docs/user-guide/messaging/relay/) を参照してください。 |

オプション:

| オプション | 説明 |
|--------|-------------|
| `--all` | `start` / `restart` / `stop` のときに、いま使っている `HERMES_HOME` だけでなく**すべてのプロファイル**のゲートウェイを操作します。複数のプロファイルを並べて動かしていて、`hermes update` のあとにまとめて再起動したいときに便利です。 |
| `--no-supervise` | `run` のときに、s6-overlay の Docker イメージの中で自動監視をやめ、s6 より前の前面実行の動きにします。ゲートウェイがコンテナーの主プロセスになり、自動再起動はしません。s6 のイメージの外では何も起きません。`HERMES_GATEWAY_NO_SUPERVISE=1` と同じです。 |
| `--external-supervisor` | `run` のときに、外側の仕組みが用意したプロセス管理が前面のゲートウェイを受け持つと宣言します。`sudo` や `env -i` などの外側の仕組みが launchd や systemd の環境の印を落としてしまうときに使います。チャットからの再起動や更新は、別プロセスを切り離して立てるのではなく、その管理側へ戻る形で終了します。 |

`--external-supervisor` は再起動の取り決めです。チャットからの再起動や、サービスの
再起動を伴う更新は終了コード `75` で終わるので、外側の仕組みの監視役が、その
0 でない終了のあとにゲートウェイを立て直す必要があります。systemd なら
`Restart=on-failure` か `Restart=always` を使い、`RestartPreventExitStatus` に
`75` を入れないでください。launchd なら、うまくいかなかった終了のあとに立て直すよう
`KeepAlive` を設定します。この取り決めがないと、再起動を頼んでもゲートウェイは
止まったままになります。

`hermes gateway enroll` は `--token`、`--connector-url`、`--gateway-id`、`--wake-url` を受け付けます。登録用のトークンをコネクターと交換し、返ってきた `GATEWAY_RELAY_ID`、`GATEWAY_RELAY_SECRET`、`GATEWAY_RELAY_DELIVERY_KEY`、必要なら `GATEWAY_RELAY_URL`、そして（`--wake-url` を渡した場合は）`GATEWAY_RELAY_WAKE_URL` の値を、使っているプロファイルの `.env` に書きます。

:::tip WSL を使っている場合
`hermes gateway start` ではなく `hermes gateway run` を使ってください。WSL の systemd の対応は当てになりません。動かし続けるには tmux でくるみます（`tmux new -s hermes 'hermes gateway run'`）。詳しくは [WSL のよくある質問](/hermes/docs/reference/faq/#wsl-gateway-keeps-disconnecting-or-hermes-gateway-start-fails) を参照してください。
:::

## `hermes lsp` {#hermes-lsp}

```bash
hermes lsp <subcommand>
```

Language Server Protocol の連携を管理します。LSP は本物の
言語サーバー（pyright、gopls、rust-analyzer、…）をバックグラウンドで
動かし、その診断結果を `write_file` と `patch` のあとの
確認に流し込みます。git のワークスペースを見つけたときだけ働きます。
作業ディレクトリか編集するファイルが git のワークツリーの中に
あるときにしか LSP は動きません。

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `status` | サービスの状態、設定済みのサーバー、導入の状況を表示します。 |
| `list` | 対応しているサーバーの一覧を表示します。`--installed-only` を付けると、入っていないものを飛ばします。 |
| `install <id>` | 1 つのサーバーの実行ファイルを先に導入します。 |
| `install-all` | 自動導入の手順が分かっているサーバーをすべて導入します。 |
| `restart` | 動いているクライアントを畳んで、次の編集で立ち上げ直させます。 |
| `which <id>` | 1 つのサーバーについて、実際に使う実行ファイルのパスを表示します。 |

対応言語や設定のつまみを含めたひととおりの説明は
[LSP — 意味的な診断](/hermes/docs/user-guide/features/lsp/) にあります。

## `hermes setup` {#hermes-setup}

```bash
hermes setup [model|tts|terminal|gateway|tools|agent] [--non-interactive] [--reset] [--quick] [--reconfigure] [--portal]
```

**いちばん手軽な道:** `hermes setup --portal` — Nous Portal に OAuth でログインし、[Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/) を一度に有効にします。

**初回:** 初めての人向けのウィザードが立ち上がります。

**すでに設定済みの場合:** そのまま全項目を見直すウィザードに入ります。どの質問にも今の値が既定として出るので、Enter でそのまま、変えたいときだけ入力します。メニューは出ません。

ウィザード全体ではなく、一部だけを直したいとき:

| 節 | 説明 |
|---------|-------------|
| `model` | プロバイダーとモデルの設定。 |
| `terminal` | ターミナルのバックエンドとサンドボックスの設定。 |
| `gateway` | メッセージング プラットフォームの設定。 |
| `tools` | プラットフォームごとのツールの有効・無効。 |
| `agent` | エージェントの振る舞いの設定。 |

オプション:

| オプション | 説明 |
|--------|-------------|
| `--quick` | すでに設定済みの人が実行したときに、まだ決まっていない項目だけを尋ねます。設定済みの項目は飛ばします。 |
| `--non-interactive` | 尋ねずに、既定値や環境の値を使います。 |
| `--reset` | 設定を既定値に戻してから始めます。 |
| `--reconfigure` | 互換のために残された別名です。すでに導入済みの環境では、素の `hermes setup` が既定でこの動きをします。 |
| `--portal` | Nous Portal を一度に用意します。OAuth でログインし、推論のプロバイダーを Nous にして、[Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/) を有効にします。ウィザードの残りは飛ばします。 |

## `hermes portal` {#hermes-portal}

```bash
hermes portal [status|open|tools]
```

Nous Portal の認証と Tool Gateway の経路を確認し、契約のページを開きます。サブコマンドなしで実行すると `status` になります。

| サブコマンド | 説明 |
|------------|-------------|
| `status`（既定） | ポータルの認証の状態と、ツールごとの Tool Gateway の経路のまとめ。サブコマンドなしのときもこれが出ます。 |
| `open` | 既定のブラウザーで `portal.nousresearch.com/manage-subscription` を開きます。 |
| `tools` | Tool Gateway の提携先（Firecrawl、FAL、OpenAI TTS、Browser Use、Modal）を並べ、どれが Nous を経由しているかを表示します。 |

ゲートウェイそのものの設定は [Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/) を参照してください。一度に用意する道は、上の `hermes setup --portal` です。

## `hermes whatsapp` {#hermes-whatsapp}

```bash
hermes whatsapp
```

WhatsApp の紐づけと設定の流れを実行します。動かし方の選択と QR コードでの紐づけも含みます。

## `hermes slack` {#hermes-slack}

```bash
hermes slack manifest              # print manifest to stdout
hermes slack manifest --write      # write to ~/.hermes/slack-manifest.json
hermes slack manifest --long-description-file AGENTS.md --write
hermes slack manifest --slashes-only  # just the features.slash_commands array
```

`COMMAND_REGISTRY` にあるゲートウェイのコマンド（`/btw`、`/stop`、`/model`、…）を
すべて、Slack の正式なスラッシュコマンドとして登録するアプリの
マニフェストを作ります。Discord や Telegram と同じ使い心地になります。出力を
Slack のアプリの設定
（[https://api.slack.com/apps](https://api.slack.com/apps) → 自分のアプリ →
**Features → App Manifest → Edit**）に貼り付けて **Save** します。権限や
スラッシュコマンドが変わった場合、Slack は入れ直しを求めてきます。

| オプション | 既定 | 用途 |
|------|---------|---------|
| `--write [PATH]` | 標準出力 | 標準出力ではなくファイルに書きます。`--write` だけなら `$HERMES_HOME/slack-manifest.json` に書きます。 |
| `--name NAME` | `Hermes` | Slack でのボットの表示名。 |
| `--description DESC` | 既定の紹介文 | Slack のアプリ一覧に出るボットの説明。 |
| `--long-description TEXT` | 未設定 | `display_information.long_description` をその場で指定します（175〜4,000 文字）。`--slashes-only` とは併用できません。 |
| `--long-description-file PATH` | 未設定 | UTF-8 のテキスト ファイルから長い説明を読み、中身をそのまま使います。`--long-description` とは同時に使えず、`--slashes-only` とも併用できません。 |
| `--slashes-only` | オフ | 手で管理しているマニフェストに混ぜられるよう、`features.slash_commands` だけを出力します。 |

`hermes update` のあとにもう一度 `hermes slack manifest --write` を実行すると、
新しいコマンドを取り込めます。

## `hermes send` {#hermes-send}

```bash
hermes send --to <target> "message text"
hermes send --to <target> --file <path>
echo "message" | hermes send --to <target>
hermes send --list [platform]
```

エージェントやゲートウェイの処理を立ち上げずに、設定済みのメッセージング プラットフォームへ 1 回だけメッセージを送ります。ゲートウェイがすでに持っている認証情報（`~/.hermes/.env` と `~/.hermes/config.yaml`）を使い回すので、運用のスクリプト、cron の作業、CI のフック、監視の常駐プロセスから、プラットフォームごとの REST クライアントを書き直さずに状況を知らせられます。

ボットのトークンで動くプラットフォーム（Telegram、Discord、Slack、Signal、SMS、WhatsApp Cloud API）では、ゲートウェイが動いている必要はありません。`hermes send` がプラットフォームの REST のエンドポイントに直接話しかけます。常駐のアダプターが要るプラグイン型のプラットフォームでは、動いているゲートウェイが必要です。

| オプション | 説明 |
|--------|-------------|
| `-t`、`--to <TARGET>` | 送り先。書き方は `platform`（ホーム チャンネルを使います）、`platform:chat_id`、`platform:chat_id:thread_id`、`platform:#channel-name` です。例: `telegram`、`telegram:-1001234567890`、`discord:#ops`、`slack:C0123ABCD`、`signal:+15551234567`。 |
| `-f`、`--file <PATH>` | メッセージの本文を `PATH` から読みます（テキスト ファイルのみ。ログ、報告、マークダウンなど）。`-` を渡すと標準入力から読みます。画像などのバイナリを送るときは `MEDIA:<path>` を使ってください（後述）。 |
| `-s`、`--subject <LINE>` | 本文の前に見出しの行を足します。 |
| `-l`、`--list [platform]` | すべてのプラットフォーム（または指定したプラットフォーム）の送り先を一覧します。 |
| `-q`、`--quiet` | 成功時の標準出力を抑えます。スクリプトの中で終了コードだけを見たいときに便利です。 |
| `--json` | 人が読む形ではなく、素の JSON の結果を出します。 |

`message` の引数も `--file` も渡さなかった場合、`hermes send` は標準入力が端末でないときにそこから読みます。終了コードは、成功なら `0`、配信やバックエンドの失敗なら `1`、使い方の誤りなら `2` です。

### 画像などの添付を送る {#sending-images-and-other-media}

`--file` は*テキスト*の本文専用です。画像、書類、動画、音声をプラットフォームの添付として届けるには、メッセージの文章の中で `MEDIA:<local_path>` と書いて指し示します。

```bash
hermes send --to telegram "MEDIA:/tmp/screenshot.png"
hermes send --to telegram "Build chart for today MEDIA:/tmp/chart.png"   # with caption
hermes send --to discord:#ops "MEDIA:/tmp/report.pdf"
```

既定では、画像ファイルは写真として送られます（Telegram などはこれを圧縮し直します）。メッセージに `[[as_document]]` を足すと、圧縮されないファイルの添付として届きます。

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

端末をまたいだボット同士のやり取りです。別の Hermes のゲートウェイ（`api_server`
のプラットフォームを動かしている端末なら何でも）を*相手*として登録し、そこのエージェントに
話しかけます。`hermes peer dm` は相手の API サーバー越しにそのエージェントの標準の
**Bot Chat** のセッションを見つけ、そこでエージェントのターンを 1 回動かし、返事を
標準出力に出します。手元での
`hermes -p <bot> chat --in ~ -c "Bot Chat" …` によるボットへの呼びかけの、端末をまたぐ版です。

`<peer>` だけなら相手のゲートウェイの主となるエージェントに、
`<peer>/<agent>` なら多重化した相手の中の名前付きプロファイルに届きます（その
`/p/<profile>/` の写しを経由します）。

| サブコマンド | 説明 |
|--------|-------------|
| `add <name> --url <URL> [--key <KEY>] [--note TEXT]` | 相手を登録・更新します。URL は `config.yaml`（`bot_peers`）に入り、キーは `~/.hermes/.env` に `HERMES_PEER_<NAME>_KEY` として保存されます。 |
| `list` | 相手の一覧と、それぞれキーが設定されているかを表示します。 |
| `dm <peer>[/<agent>] [message]` | 相手のエージェントの標準の Bot Chat に話しかけ、返事を表示します（機械が読む形にするなら `--json`。メッセージを省くと標準入力から読みます）。 |
| `remove <name>` | 相手を登録から外します（`.env` のキーはそのまま残ります）。 |

相手を 1 つでも登録すると、標準の Bot Chat すべてに教えられるボット モードのやり取りの決まり
（`agent.bot_mode_protocol`）に、相手の一覧と `hermes peer dm` の書き方が自動で
含まれます。SOUL を書き換えなくても、エージェントは端末をまたいだ仲間を
見つけられます。
[ボット モード](/hermes/docs/user-guide/bot-mode/) を参照してください。

終了コードは、成功なら `0`、配信や相手側の失敗なら `1`、使い方の誤りなら `2` です。

## `hermes secrets` {#hermes-secrets}

```bash
hermes secrets bitwarden <subcommand>
hermes secrets bw <subcommand>          # short alias
```

API キーを `~/.hermes/.env` に置く代わりに、プロセスの起動時に外部の秘密の保管先から取ってきます。いまのところ **Bitwarden Secrets Manager** に対応しています。ひととおりの説明は [Bitwarden 連携](/hermes/docs/user-guide/secrets/bitwarden/) にあります。

`bitwarden`（別名 `bw`）のサブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `setup` | 対話的なウィザードです。固定した `bws` の実行ファイルを導入し、アクセス トークンを保存し、プロジェクトを選びます。尋ねずに済ませたいときは `--project-id`、`--access-token`、`--server-url` を渡せます。 |
| `status` | いまの設定、実行ファイルのパスと版、トークンの検証の結果を表示します。 |
| `token` | アクセス トークンを入れ替えます。`.env` に保存する前に Bitwarden で新しいトークンを検証します（弾かれたトークンでは何も変わりません）。尋ねずに済ませたいときは `--access-token`、検証を飛ばすなら `--no-verify` を渡せます。 |
| `sync` | いますぐ秘密を取ってきて、何が変わったかを報告します。`--apply` を足すと、実際にいまのシェルの環境へ書き出します（既定は下見だけです）。 |
| `install` | 固定した `bws` の実行ファイルを取得して検証します。`--force` を付けると、すでにあっても取り直します。 |
| `disable` | Bitwarden の連携をやめます。 |

## `hermes migrate` {#hermes-migrate}

```bash
hermes migrate <type>
```

使っている `config.yaml` を調べ、必要なら書き換えて、廃止されたモデルや非推奨の設定への参照を置き換えます。書き換えの前には、元の `config.yaml` の控えが日時付きで取られます（`--no-backup` で省けます）。

| サブコマンド | 説明 |
|------------|-------------|
| `xai` | 2026 年 5 月 15 日に廃止予定の xAI のモデルへの参照を `config.yaml` から探し、（`--apply` を付けると）xAI の移行案内どおりの正式な置き換え先へその場で書き換えます。既定では下見だけです。 |

移行のサブコマンドで共通のオプション:

| オプション | 説明 |
|------|-------------|
| `--apply` | `config.yaml` をその場で書き換えます（既定は下見だけで、書き込みません）。 |
| `--no-backup` | 適用するときに、`config.yaml` の日時付きの控えを取りません。 |

> `hermes claw migrate`（OpenClaw の設定を Hermes に一度だけ取り込むもの）とは別ものです。`hermes migrate` は設定を書き換えるための最上位のコマンドです。

## `hermes proxy` {#hermes-proxy}

```bash
hermes proxy <subcommand>
```

OAuth で認証した上流のプロバイダー（Nous Portal、xAI など）へ要求を転送する、OpenAI 互換の HTTP サーバーを手元で動かします。外部のアプリはどんなベアラー トークンでもこのプロキシを指すことができ、プロキシが送り出すときに本物の OAuth の認証情報を付けます。ひととおりの説明は [サブスクリプション プロキシ](/hermes/docs/user-guide/features/subscription-proxy/) にあります。

| サブコマンド | 説明 |
|------------|-------------|
| `start` | プロキシを前面で動かします。オプションは `--provider <nous\|xai>`（既定 `nous`）、`--host <addr>`（既定 `127.0.0.1`。LAN に出すなら `0.0.0.0`）、`--port <int>`（既定 `8645`）。 |
| `status` | どの上流が使える状態か（認証情報があり、OAuth が有効か）を表示します。 |
| `providers` | 使える上流のプロバイダーを一覧します。 |

## `hermes security` {#hermes-security}

```bash
hermes security <subcommand>
```

[OSV.dev](https://osv.dev) に照らして脆弱性をその場で調べます。Hermes の仮想環境（入っている PyPI の配布物）、`~/.hermes/plugins/` の下のプラグインが宣言した Python の依存、`config.yaml` で固定した `npx` / `uvx` の MCP サーバーが対象です。システム全体に入れたパッケージや、エディター・ブラウザーの拡張は対象外です。

| サブコマンド | 説明 |
|------------|-------------|
| `audit` | 供給網の点検を 1 回だけ行います。 |

`audit` のオプション:

| オプション | 既定 | 説明 |
|------|---------|-------------|
| `--json` | オフ | 人が読む文章ではなく、機械が読む JSON を出します。 |
| `--fail-on <level>` | `critical` | この深刻度に達する指摘が 1 つでもあれば、0 でない終了コードで終わります（`low`、`moderate`、`high`、`critical`）。 |
| `--skip-venv` | オフ | Hermes の Python の仮想環境を調べません。 |
| `--skip-plugins` | オフ | プラグインの依存のファイルを調べません。 |
| `--skip-mcp` | オフ | `config.yaml` で固定した MCP サーバーを調べません。 |

## `hermes login` / `hermes logout` *(非推奨)* {#hermes-login-hermes-logout-deprecated}

:::caution
`hermes login` は廃止されました。OAuth の認証情報を管理するには `hermes auth`、プロバイダーを選ぶには `hermes model`、対話的にひととおり設定するには `hermes setup` を使ってください。
:::

## `hermes auth` {#hermes-auth}

同じプロバイダーの中でキーを回すための、認証情報のまとまりを管理します。詳しい説明は [認証情報のまとまり](/hermes/docs/user-guide/features/credential-pools/) にあります。

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

サブコマンドは `add`、`list`、`remove`、`reset`、`status`、`logout`、`spotify` です。サブコマンドなしで実行すると、対話的な管理のウィザードが立ち上がります。

## `hermes status` {#hermes-status}

```bash
hermes status [--all] [--deep]
```

| オプション | 説明 |
|--------|-------------|
| `--all` | すべての詳細を、そのまま人に見せられる伏せ字入りの形で表示します。 |
| `--deep` | 時間はかかりますが、より深く調べます。 |

## `hermes cron` {#hermes-cron}

```bash
hermes cron <list|create|edit|pause|resume|run|remove|status|tick>
```

| サブコマンド | 説明 |
|------------|-------------|
| `list` | 予定した作業を一覧します。 |
| `create` / `add` | プロンプトから予定の作業を作ります。`--skill` を繰り返せば、スキルを 1 つ以上つけられます。`--reasoning-effort <none\|minimal\|low\|medium\|high\|xhigh\|max\|ultra>` で作業ごとに推論の深さを固定できます。 |
| `edit` | 作業の予定、プロンプト、名前、届け先、繰り返し回数、つけたスキルを変えます。`--clear-skills`、`--add-skill`、`--remove-skill` と、`--reasoning-effort`（空文字で固定を解除）が使えます。 |
| `pause` | 作業を消さずに止めます。 |
| `resume` | 止めていた作業を再開し、次の実行時刻を計算します。 |
| `run` | 次のスケジューラーの巡回で作業を動かします。 |
| `remove` | 予定した作業を削除します。 |
| `status` | cron のスケジューラーが動いているかを確認します。 |
| `tick` | 実行時刻を過ぎた作業を 1 回動かして終了します。 |

cron の**きっかけ**は `cron.provider` の設定キーで差し替えられます。空
（既定）なら、プロセスに内蔵された時計を使います。`chronos`（規模を 0 まで落とせる
ホスト型ゲートウェイ向けの NAS 管理の提供元）にすると、`cron.chronos.*` のキー
（`portal_url`、`callback_url`、`expected_audience`、`nas_jwks_url`）で設定します。
あるいは `plugins/cron/<name>/` や `$HERMES_HOME/plugins/<name>/` に置いた独自の
提供元の名前を書きます。分からない提供元や使えない提供元を指定した場合は内蔵のものに
戻るので、cron がきっかけを失うことはありません。
[cron の内部](/hermes/docs/developer-guide/cron-internals/#gateway-integration) も参照してください。

## `hermes kanban` {#hermes-kanban}

```bash
hermes kanban [--board <slug>] <action> [options]
```

複数プロファイル・複数プロジェクトの共同作業ボードです。1 つの導入でいくつものボードを持てます（プロジェクト、リポジトリ、領域ごとに 1 つ）。それぞれのボードは、自分の SQLite のデータベースとディスパッチャーの担当範囲を持つ独立した待ち行列です。新しく導入すると `default` という 1 つのボードから始まり、そのデータベースは以前との互換のため `~/.hermes/kanban.db` になります。追加のボードは `~/.hermes/kanban/boards/<slug>/kanban.db` に置かれます。ゲートウェイに組み込まれたディスパッチャーは、1 回の巡回ですべてのボードを見ます。

**全体に効くオプション（以下のすべての操作に適用されます）:**

| オプション | 用途 |
|------|---------|
| `--board <slug>` | 指定したボードを操作します。省くと、いま選んでいるボード（`hermes kanban boards switch`、`HERMES_KANBAN_BOARD` 環境変数、または `default`）になります。 |

**これは人が使う・スクリプトから使うための入口です。** ディスパッチャーが起こすエージェントのワーカーは、`hermes kanban` をシェルから呼ぶのではなく、専用の `kanban_*` [ツールセット](/hermes/docs/user-guide/features/kanban/#how-workers-interact-with-the-board)（`kanban_show`、`kanban_complete`、`kanban_request_review`、`kanban_request_changes`、`kanban_block`、`kanban_create`、`kanban_link`、`kanban_comment`、`kanban_heartbeat`。取りまとめ役のプロファイルには `kanban_list` と `kanban_unblock` も付きます）でボードを動かします。ワーカーの環境には `HERMES_KANBAN_BOARD` が固定されているので、仕組みのうえでほかのボードを見られません。

| 操作 | 用途 |
|--------|---------|
| `init` | `kanban.db` がなければ作ります。何度実行しても同じ結果になります。 |
| `boards list` / `boards ls` | すべてのボードを作業数つきで一覧します。`--json`、`--all`（保管済みも含める）。 |
| `boards create <slug>` | 新しいボードを作ります。オプションは `--name`、`--description`、`--icon`、`--color`、`--switch`（作ったボードに切り替える）。識別名はハイフン区切りで、自動的に小文字になります。 |
| `boards switch <slug>` / `boards use` | `<slug>` を使うボードとして保存します（`~/.hermes/kanban/current` に書きます）。 |
| `boards show` / `boards current` | いま使っているボードの名前、データベースのパス、作業数を表示します。 |
| `boards rename <slug> "<name>"` | ボードの表示名を変えます。識別名は変えられません。 |
| `boards rm <slug>` | ボードを保管（既定）するか、完全に削除します。`--delete` を付けると保管の段を飛ばします。保管したボードは `boards/_archived/<slug>-<ts>/` へ移ります。`default` には使えません。 |
| `create "<title>"` | 使っているボードに新しい作業を作ります。オプションは `--body`、`--assignee`、`--parent`（繰り返し可）、`--workspace scratch\|worktree\|dir:<path>`、`--tenant`、`--priority`、`--triage`、`--idempotency-key`、`--max-runtime`、`--max-retries`、`--skill`（繰り返し可）。 |
| `list` / `ls` | 使っているボードの作業を一覧します。`--mine`、`--assignee`、`--status`、`--tenant`、`--archived`、`--json` で絞り込めます。 |
| `show <id>` | 作業をコメントと出来事つきで表示します。機械が読む形にするなら `--json`。 |
| `assign <id> <profile>` | 担当を決める・変えます。`none` で担当を外します。作業が動いている間は受け付けません。 |
| `link <parent> <child>` | 依存関係を足します。循環は検出されます。両方の作業が同じボードにある必要があります。 |
| `unlink <parent> <child>` | 依存関係を外します。 |
| `claim <id>` | 準備できた作業を取り違えなく確保します。使うワークスペースのパスを表示します。 |
| `comment <id> "<text>"` | コメントを足します。次にその作業を確保したワーカーが、`kanban_show()` の結果の一部として読みます。 |
| `complete <id>` | 作業を完了にします。オプションは `--result`、`--summary`、`--metadata`。 |
| `block <id> "<reason>"` | 人の判断待ちとして作業を止めます。理由はコメントとしても残ります。 |
| `request-review <id>` | 作業をレビュー担当へ引き継いで `review` に移します。止めるわけではありません。オプションは `--summary`、`--metadata`、`--reviewer`（レビューに回す前に担当を変えます）。 |
| `request-changes <id> <reason>` | 動いているレビューに対するレビュー担当の判断です。そのレビューを閉じ、作業をもとの実装担当へ戻します。 |
| `reopen-review <id>...` | レビュー中の作業を修正のために差し戻します（`review` → ready / todo）。オプションは `--reason`（コメントとして残ります）。 |
| `schedule <id> "<reason>"` | 時間待ちや追いかけの作業を `scheduled` に置いて、人の判断待ちとして表示されないようにします。 |
| `unblock <id>` | 止まっている作業を元の段階（`review` か `ready`）に戻します。依存関係が残っているなら `todo` に戻します。 |
| `archive <id>` | 既定の一覧から隠します。`gc` で一時的なワークスペースが消えます。 |
| `tail <id>` | 作業の出来事の流れを追いかけます。 |
| `dispatch` | 使っているボードでディスパッチャーを 1 回動かします。オプションは `--dry-run`、`--max N`、`--failure-limit N`、`--json`。 |
| `context <id>` | ワーカーが見ることになる情報の全体（表題、本文、親の結果、コメント）を表示します。 |
| `specify <id>` / `specify --all` | 仕分け中の作業を、補助の LLM で具体的な仕様（表題と、目的・進め方・受け入れ条件を書いた本文）に膨らませ、`todo` へ進めます。オプションは `--tenant`（`--all` を 1 つのテナントに絞る）、`--author`、`--json`。モデルは `config.yaml` の `auxiliary.triage_specifier` で設定します。 |
| `decompose <id>` / `decompose --all` | 仕分け中の作業を、内容から専門のプロファイルへ割り振った子の作業の集まりに広げます。LLM が分ける必要はないと判断したときは、specify と同じやり方で 1 つの作業として進めます。オプションは `specify` と同じです。分解に使うモデルは `config.yaml` の `auxiliary.kanban_decomposer` で設定します。`kanban.orchestrator_profile` は、分けたあとの大元・取りまとめの作業を誰が持つかを決めるだけです。`kanban.auto_decompose: true`（既定）なら、ディスパッチャーの巡回のたびに自動でも動きます。[自動と手動の取りまとめ](/hermes/docs/user-guide/features/kanban/#auto-vs-manual-orchestration) を参照してください。 |
| `gc` | 保管した作業の一時的なワークスペースを消します。 |

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

ボードの決まり方は、強いものから順に `--board <slug>` → `HERMES_KANBAN_BOARD` 環境変数 → `~/.hermes/kanban/current` のファイル → `default` です。

すべての操作は、ゲートウェイのスラッシュコマンド（`/kanban …`）としても同じ引数で使えます。`boards` のサブコマンドや `--board` も含みます。

設計の全体（Cline Kanban / Paperclip / NanoClaw / Gemini Enterprise との比較、8 つの共同作業の型、4 つの利用場面、同時実行の正しさの証明）は、リポジトリの `docs/hermes-kanban-v1-spec.pdf` か [かんばんの利用ガイド](/hermes/docs/user-guide/features/kanban/) にあります。

## `hermes egress` {#hermes-egress}

離れた場所のターミナルのサンドボックス向けに、送信時に認証情報を差し込むファイアウォールです。[iron-proxy](https://github.com/ironsh/iron-proxy) のデーモンを包んでいます。これは TLS を解いて中継するプロキシで、ネットワークの境目で意味を持たないプロキシ用のトークンを本物の上流の API の認証情報に差し替えるため、サンドボックスは本物のキーを持ちません。既定では無効です。設定と仕組みは [送信プロキシ](/hermes/docs/user-guide/egress/iron-proxy/) のページを参照してください。

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

よくある失敗と立て直し方は [送信プロキシ → 困ったときは](/hermes/docs/user-guide/egress/iron-proxy/#troubleshooting) にまとめてあります。

## `hermes project` {#hermes-project}

```bash
hermes project <create|list|show|add-folder|remove-folder|rename|set-primary|use|archive|restore|bind-board>
```

プロジェクトは、複数のフォルダーやリポジトリにまたがれる、人が名前を付けたワークスペースです。デスクトップでのセッションのまとまりの土台になり、かんばんのボードと結び付けると、作業に決まった形のワークツリーとブランチが割り当てられます。状態はプロファイルごとに持ちます。

| サブコマンド | 説明 |
|------------|-------------|
| `create` | 新しいプロジェクトを作ります。 |
| `list`（別名 `ls`） | プロジェクトを一覧します。 |
| `show` | プロジェクトの詳細を表示します。 |
| `add-folder` | プロジェクトにフォルダーやリポジトリを足します。 |
| `remove-folder` | プロジェクトからフォルダーを外します。 |
| `rename` | プロジェクトの名前を変えます。 |
| `set-primary` | 主となるフォルダーを決めます。 |
| `use` | 使うプロジェクトを決めます。 |
| `archive` | プロジェクトを保管します（元に戻せます）。 |
| `restore` | 保管したプロジェクトを戻します。 |
| `bind-board` | かんばんのボードをこのプロジェクトに結び付けます。 |

## `hermes webhook` {#hermes-webhook}

```bash
hermes webhook <subscribe|list|remove|test>
```

出来事をきっかけにエージェントを動かすための、動的な webhook の登録を管理します。設定で webhook のプラットフォームを有効にしておく必要があります。設定していない場合は、その手順が表示されます。

| サブコマンド | 説明 |
|------------|-------------|
| `subscribe` / `add` | webhook の受け口を作ります。自分のサービスに設定するための URL と HMAC の秘密鍵が返ります。 |
| `list` / `ls` | エージェントが作った登録をすべて表示します。 |
| `remove` / `rm` | 動的な登録を削除します。config.yaml に書いた固定の受け口には影響しません。 |
| `test` | 試しに POST を送って、登録が動いているかを確かめます。 |

### `hermes webhook subscribe` {#hermes-webhook-subscribe}

```bash
hermes webhook subscribe <name> [options]
```

| オプション | 説明 |
|--------|-------------|
| `--prompt` | `{dot.notation}` で受信内容を参照できるプロンプトのひな形。 |
| `--events` | 受け付ける出来事の種類をカンマ区切りで並べます（例: `issues,pull_request`）。空ならすべてです。 |
| `--description` | 人が読むための説明。 |
| `--skills` | エージェントの実行時に読み込むスキルの名前をカンマ区切りで並べます。 |
| `--deliver` | 届け先: `log`（既定）、`telegram`、`discord`、`slack`、`github_comment`。 |
| `--deliver-chat-id` | プラットフォームをまたいで届けるときの、宛先のチャットやチャンネルの ID。 |
| `--secret` | HMAC の秘密鍵を自分で決めます。省くと自動で作られます。 |
| `--deliver-only` | エージェントを動かさず、組み立てた `--prompt` をそのままメッセージとして届けます。LLM の費用はゼロで、1 秒もかかりません。`--deliver` に本物の届け先（`log` 以外）を指定する必要があります。 |
| `--script` | `~/.hermes/scripts/` に置いた、選り分けや変換のスクリプト。webhook の内容が JSON として標準入力に渡され、標準出力の JSON が内容を置き換えます。標準出力が空、`[SILENT]`、または 0 でない終了コードなら、その webhook は無視されます。[スクリプトによる選り分けと変換](/hermes/docs/user-guide/messaging/webhooks/#script-filters-and-transforms) を参照してください。 |

登録の内容は `~/.hermes/webhook_subscriptions.json` に残り、ゲートウェイを再起動しなくても webhook のアダプターがその場で読み直します。

## `hermes doctor` {#hermes-doctor}

```bash
hermes doctor [--fix]
```

| オプション | 説明 |
|--------|-------------|
| `--fix` | 直せるところは自動で直します。 |

## `hermes dump` {#hermes-dump}

```bash
hermes dump [--show-keys]
```

Hermes の設定の全体を、短い素の文字でまとめて出します。困ったときに Discord、GitHub の issue、Telegram へそのまま貼り付けられるように作られていて、色も飾りもなく、中身だけが並びます。

| オプション | 説明 |
|--------|-------------|
| `--show-keys` | `set` / `not set` だけでなく、API キーの一部（最初と最後の 4 文字）を伏せ字つきで表示します。 |

### 何が入るか {#what-it-includes}

| 節 | 内容 |
|---------|---------|
| **Header** | Hermes の版、公開日、git のコミット ハッシュ |
| **Environment** | OS、Python の版、OpenAI SDK の版 |
| **Identity** | 使っているプロファイル名、HERMES_HOME のパス |
| **Model** | 設定した既定のモデルとプロバイダー |
| **Terminal** | バックエンドの種類（local、docker、ssh など） |
| **API keys** | 22 種類すべてのプロバイダー・ツールの API キーがあるかどうか |
| **Features** | 有効なツールセット、MCP サーバーの数、記憶の提供元 |
| **Services** | ゲートウェイの状態、設定済みのメッセージング プラットフォーム |
| **Workload** | cron の作業の数、導入済みのスキルの数 |
| **Config overrides** | 既定値と違う設定の値 |

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

- GitHub に不具合を報告するとき — issue にそのまま貼り付ける
- Discord で助けを求めるとき — コード ブロックに入れて共有する
- 自分の環境を誰かのものと見比べるとき
- 何かうまくいかないときの手早い確認

:::tip
`hermes dump` は共有のために作られています。対話的に調べたいときは `hermes doctor` を、ひと目で見渡したいときは `hermes status` を使ってください。
:::

## `hermes debug` {#hermes-debug}

```bash
hermes debug share [options]
```

調査用の報告（システム情報と直近のログ）を貼り付けサービスに送り、共有できる URL を受け取ります。手早く助けを求めたいときに便利で、助ける側が原因を探るのに必要なものがひととおり入っています。

| オプション | 説明 |
|--------|-------------|
| `--lines <N>` | ログ ファイル 1 つあたりに含める行数（既定: 200）。 |
| `--expire <days>` | 貼り付けが消えるまでの日数（既定: 7）。 |
| `--nous` | 公開の貼り付けサービスではなく、Nous 内部の診断用の保管先へ送ります。Nous のサポートから非公開の診断一式を求められたときに使ってください。 |
| `--local` | 送らずに、手元で報告を表示します。 |
| `--no-redact` | 送信時に秘密の情報を伏せる処理をやめます。既定では伏せて送ります。 |

報告には、システム情報（OS、Python の版、Hermes の版）、直近のエージェント・ゲートウェイ・GUI とダッシュボード・デスクトップのログ（1 ファイルあたり 512 KB まで）、そして伏せ字にした API キーの状況が入ります。既定では伏せて送られるので、秘密の情報は含まれません。

既定の送信先は公開の貼り付けサービスで、paste.rs、dpaste.com の順に試します。`--nous` を付けると、同じ一式を非公開の Nous の診断用の保管先へ送ります。返ってくる閲覧用のリンクは Nous のチーム向けで、14 日後に自動で消えます。

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

Hermes の設定、スキル、セッション、データを zip にまとめます。hermes-agent のコードそのものは含まず、以前のバックアップの成果物（`backups/`、`state-snapshots/`）を入れ子にすることもありません。それらはすでに自分の `state.db` の写しを持っているからです。

| オプション | 説明 |
|--------|-------------|
| `-o`、`--output <path>` | zip ファイルの出力先（既定: `~/hermes-backup-<timestamp>.zip`）。 |
| `-q`、`--quick` | 手早いスナップショット。要となる状態のファイル（config.yaml、state.db、.env、認証、cron の作業）だけを取ります。全体のバックアップよりずっと速いです。 |
| `-l`、`--label <name>` | スナップショットに付ける名前（`--quick` のときだけ使います）。 |

バックアップは SQLite の `backup()` API で安全に写すので、Hermes が動いている最中でも正しく取れます（WAL モードでも安全です）。

**zip に入らないもの:**

- `*.db-wal`、`*.db-shm`、`*.db-journal` — SQLite の WAL・共有メモリ・ジャーナルの付属ファイル。`*.db` は `sqlite3.backup()` で一貫したスナップショットになっているので、動いている付属ファイルを一緒に入れると、復元したときに中途半端な状態が見えてしまいます。
- `checkpoints/` — セッションごとの経過のキャッシュ。ハッシュで鍵付けされていてセッションごとに作り直されるので、どのみち別の導入先へ持っていっても使えません。
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

`~/.hermes/checkpoints/` にある裏の git の保管場所を確認・管理します。セッション中の `/rollback` を支えている保管の層です。いつ実行しても安全で、エージェントが動いている必要もありません。

| サブコマンド | 説明 |
|------------|-------------|
| `status`（既定） | 合計の大きさ、プロジェクトの数、プロジェクトごとの内訳を表示します。`hermes checkpoints` だけでも同じです。 |
| `list` | `status` の別名です。 |
| `prune` | 掃除を強制します。行き場のないものや古いプロジェクトを消し、保管場所を整理し、大きさの上限を守らせます。24 時間の重複防止の印は無視します。 |
| `clear` | チェックポイントの土台をすべて消します。元に戻せません。`-f` がなければ確認します。 |
| `clear-legacy` | v1 から v2 への移行で作られた `legacy-<timestamp>/` の保管分だけを消します。 |

### オプション {#options}

| オプション | サブコマンド | 説明 |
|--------|------------|-------------|
| `--limit N` | `status`、`list` | 一覧に出すプロジェクトの上限（既定 20）。 |
| `--retention-days N` | `prune` | `last_touch` が N 日より古いプロジェクトを消します（既定 7）。 |
| `--max-size-mb N` | `prune` | 行き場のないもの・古いものを消したあと、合計が N MB 以下になるまでプロジェクトごとにいちばん古いコミットを消します（既定 500）。 |
| `--keep-orphans` | `prune` | 作業ディレクトリがもうないプロジェクトは消しません。 |
| `-f`、`--force` | `clear`、`clear-legacy` | 確認を省きます。 |

### 例 {#examples}

```bash
hermes checkpoints                                  # status overview
hermes checkpoints prune --retention-days 3         # aggressive cleanup
hermes checkpoints prune --max-size-mb 200          # tighten size cap once
hermes checkpoints clear-legacy -f                  # drop v1 archive dirs
hermes checkpoints clear -f                         # wipe everything
```

仕組みの全体とセッション中のコマンドは [チェックポイントと `/rollback`](/hermes/docs/user-guide/checkpoints-and-rollback/) を参照してください。

## `hermes import` {#hermes-import}

```bash
hermes import <zipfile> [options]
```

前に作った Hermes のバックアップを、Hermes のホーム ディレクトリに戻します。書庫の中のファイルはすべて既存のファイルを上書きします。`--force` は、すでに Hermes が入っているときに出る確認を省くだけです。

| オプション | 説明 |
|--------|-------------|
| `-f`、`--force` | すでに導入済みのときの確認を省きます。 |

:::warning
動いているプロセスとぶつからないよう、取り込む前にゲートウェイを止めてください。
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

Hermes のログを見る・追う・絞り込みます。ログはすべて `~/.hermes/logs/`（既定以外のプロファイルなら `<profile>/logs/`）にあります。

### ログ ファイル {#log-files}

| 名前 | ファイル | 記録される内容 |
|------|------|-----------------|
| `agent`（既定） | `agent.log` | エージェントの動き全般 — API の呼び出し、ツールの実行、セッションの移り変わり（INFO 以上） |
| `errors` | `errors.log` | 警告とエラーだけ — agent.log から絞ったもの |
| `gateway` | `gateway.log` | メッセージング ゲートウェイの動き — プラットフォームへの接続、メッセージの受け渡し、webhook の出来事 |
| `gui` | `gui.log` | ダッシュボード、TUI とゲートウェイ、PTY の橋渡し、WebSocket の出来事 |
| `desktop` | `desktop.log` | Electron のデスクトップ アプリ — 起動、バックエンドの立ち上げの出力、直近の Python のトレース |

### オプション {#options}

| オプション | 説明 |
|--------|-------------|
| `log_name` | 見るログ: `agent`（既定）、`errors`、`gateway`。`list` にすると、使えるファイルを大きさつきで表示します。 |
| `-n`、`--lines <N>` | 表示する行数（既定: 50）。 |
| `-f`、`--follow` | `tail -f` のように、実時間で追いかけます。Ctrl+C で止まります。 |
| `--level <LEVEL>` | 表示する最低のログの水準: `DEBUG`、`INFO`、`WARNING`、`ERROR`、`CRITICAL`。 |
| `--session <ID>` | セッション ID の一部を含む行に絞ります。 |
| `--since <TIME>` | いまから遡った時間より新しい行を表示します: `30m`、`1h`、`2d` など。`s`（秒）、`m`（分）、`h`（時）、`d`（日）が使えます。 |
| `--component <NAME>` | 部位で絞ります: `gateway`、`agent`、`tools`、`cli`、`cron`。 |

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

絞り込みは組み合わせられます。複数を指定したときは、**すべて**を満たす行だけが表示されます。

```bash
# WARNING+ lines from the last 2 hours containing session "tg-12345"
hermes logs --level WARNING --since 2h --session tg-12345
```

時刻を読み取れない行は、`--since` を使っているときも表示されます（複数行のログの続きであることがあるためです）。水準を判別できない行も、`--level` を使っているときに表示されます。

### ログの入れ替え {#log-rotation}

Hermes は Python の `RotatingFileHandler` を使います。古いログは自動で入れ替わるので、`agent.log.1`、`agent.log.2` なども探してみてください。`hermes logs list` は、入れ替わったものも含めてすべてのログ ファイルを表示します。

## `hermes prompt-size` {#hermes-prompt-size}

```bash
hermes prompt-size [--platform <name>] [--json]
```

新しいセッションで固定的にかかるプロンプトの量、つまり会話の中身が乗る*前*に
毎回の API 呼び出しで送られるものを報告します。下流のアダプターや
プロキシがモデルの文脈の窓より狭いときや、どのかたまり（スキルの索引、記憶、
利用者像）が場所を取っているかを見たいときに役立ちます。

エージェントが使うのと同じシステム プロンプトを組み立て、内訳を出します。

- **システム プロンプトの合計** — 組み上がったプロンプト全体（身元、案内、スキルの
  索引、文脈のファイル、記憶、利用者像、時刻）。
- **スキルの索引** — `<available_skills>` のかたまり。スキルをたくさん入れていると、
  ここがいちばん大きくなりがちです。
- **記憶**と**利用者像** — `MEMORY.md` と `USER.md` の写し。
- **プロンプトの段** — stable / context / volatile。Hermes がキャッシュを効かせるために
  プロンプトを重ねている順そのものです。
- **ツールのスキーマ** — 有効なすべてのツールの JSON（毎回かかる固定分の
  もう半分です）。

すべてネットにつながずに動きます。API も呼ばず、認証情報がなくても使えます。

```bash
# Human-readable breakdown for the CLI platform (default)
hermes prompt-size

# Simulate a messaging platform's prompt (different platform hint)
hermes prompt-size --platform telegram

# Machine-readable output for scripts
hermes prompt-size --json
```

:::tip
スキルの索引とツールのスキーマは、有効にしているスキルとツールの数に応じて
大きくなります。減らしたいときは、使っていないツールセットを外す（`hermes tools`）か、
要らないスキルを消してください（`hermes skills`）。いまのディレクトリにある
文脈のファイル（AGENTS.md、.cursorrules）も合計に入ります。
:::

## `hermes config` {#hermes-config}

```bash
hermes config <subcommand>
```

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `show` | いまの設定の値を表示します。 |
| `edit` | `config.yaml` をエディターで開きます。 |
| `get <key> [--json]` | ドットでつないだキーで設定の値を 1 つ表示します（例: `hermes config get model.default`）。`--json` を付けると機械が読む形になります。 |
| `set <key> <value>` | 設定の値を決めます。 |
| `unset <key>` | 設定のキーを消して、組み込みの既定値に戻します。 |
| `path` | 設定ファイルのパスを表示します。 |
| `env-path` | `.env` のパスを表示します。 |
| `check` | 足りない設定や古い設定がないか調べます。 |
| `migrate` | 新しく増えた項目を対話的に足します。 |

## `hermes pairing` {#hermes-pairing}

```bash
hermes pairing <list|approve|revoke|clear-pending>
```

| サブコマンド | 説明 |
|------------|-------------|
| `list` | 承認待ちと承認済みのユーザーを表示します。 |
| `approve <platform> <code>` | 紐づけコードを承認します。 |
| `revoke <platform> <user-id>` | ユーザーの権限を取り消します。 |
| `clear-pending` | 承認待ちの紐づけコードを消します。 |

## `hermes skills` {#hermes-skills}

```bash
hermes skills <subcommand>
```

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `browse` | スキルのレジストリをページ送りで見ます。 |
| `search` | スキルのレジストリを検索します。 |
| `install` | スキルを導入します。 |
| `inspect` | 導入せずにスキルの中身を見ます。 |
| `list` | 導入済みのスキルを一覧します。 |
| `check` | 導入済みのハブのスキルに、提供元の更新がないか調べます。 |
| `update` | 提供元に変更があったハブのスキルを入れ直します。 |
| `audit` | 導入済みのハブのスキルを調べ直します。 |
| `uninstall` | ハブから入れたスキルを消します。 |
| `reset` | `user_modified` の印が付いて動かなくなった同梱スキルについて、マニフェストの記録を消して元に戻します。`--restore` を付けると、手元の写しも同梱の版に置き換えます。 |
| `opt-out` | 同梱スキルが、使っているプロファイルに自動で入るのをやめます。`.no-bundled-skills` の印を書き、インストーラー、`hermes update`、同期の処理がすべて同梱スキルの配置を飛ばすようにします。既定では安全で、ディスク上のものには触れません。`--remove` を付けると、すでに入っている**手を加えていない**同梱スキルも消します（自分で編集したもの、ハブから入れたもの、手で書いたものは決して消しません。先に一覧を見せて確認します。`--yes` で省けます）。 |
| `opt-in` | `.no-bundled-skills` の印を消して `opt-out` を取り消し、次の `hermes update` から同梱スキルがまた入るようにします。`--sync` を付けると、その場で入れ直します。 |
| `publish` | スキルをレジストリに公開します。 |
| `snapshot` | スキルの設定を書き出す・取り込みます。 |
| `tap` | 独自のスキルの入手先を管理します。 |
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
- `--force` は、他社やコミュニティのスキルについて、危険でない方針上の制限を押し切れます。
- `--force` でも `dangerous` という検査結果は押し切れません。
- `--source skills-sh` は公開されている `skills.sh` の一覧を検索します。
- `--source well-known` を使うと、`/.well-known/skills/index.json` を公開しているサイトを Hermes に見に行かせられます。
- `--source browse-sh` は [browse.sh](https://browse.sh) の、サイトごとのブラウザー自動操作のスキル 200 件以上のカタログを検索します。識別子は `browse-sh/airbnb.com/search-listings-ddgioa` のような形です。
- `http(s)://…/*.md` の URL を渡すと、`SKILL.md` に加えて、その中ではっきり参照されている `references/`、`templates/`、`scripts/`、`assets/`、`examples/` の下のファイルも入ります。冒頭の情報に `name:` がなく、URL の末尾も名前として使えないときは、対話的な端末なら名前を尋ねます。対話できない場所（TUI の中の `/skills install`、メッセージング プラットフォーム）では代わりに `--name <x>` が必要です。

## `hermes bundles` {#hermes-bundles}

```bash
hermes bundles <subcommand>
```

スキル束は、複数のスキルを 1 つの `/<bundle-name>` スラッシュコマンドにまとめるものです。束を呼ぶと、参照しているすべてのスキルが 1 つのメッセージにまとめて読み込まれます。保存先は `~/.hermes/skill-bundles/<slug>.yaml` です。YAML の書き方と動きは [スキル束](/hermes/docs/user-guide/features/skills/#skill-bundles) を参照してください。

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `list` | 導入済みの束を一覧します（サブコマンドを省いたときの既定） |
| `show <name>` | 束の名前、説明、スキル、ファイルのパスを表示します |
| `create <name>` | 新しい束を作ります。`--skill <id>` を繰り返すか、省くと対話的に入力できます。`--description`、`--instruction`、`--force` も使えます。 |
| `delete <name>` | 束のファイルを消します |
| `reload` | `~/.hermes/skill-bundles/` を調べ直し、増えた束と減った束を報告します |

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

チャットのセッションでは、`/bundles` で導入済みの束を一覧し、`/<bundle-name>` で 1 つ読み込みます。

## `hermes curator` {#hermes-curator}

```bash
hermes curator <subcommand>
```

キュレーターは、補助のモデルがバックグラウンドで動く仕組みです。エージェントが作ったスキルを定期的に見直し、古くなったものを整理し、重なっているものをまとめ、要らなくなったものを保管します。同梱のスキルとハブから入れたスキルには決して触れません。保管したものは元に戻せて、自動で削除されることはありません。

| サブコマンド | 説明 |
|------------|-------------|
| `status` | キュレーターの状態とスキルの統計を表示します |
| `run` | いますぐ見直しを走らせます（LLM の処理が終わるまで待ちます） |
| `run --background` | LLM の処理をバックグラウンドで始めて、すぐ戻ります |
| `run --dry-run` | 下見だけ。何も変えずに見直しの報告を作ります |
| `backup` | `~/.hermes/skills/` の tar.gz のスナップショットを手動で取ります（キュレーターは本番の実行前にも自動で取ります） |
| `rollback` | スナップショットから `~/.hermes/skills/` を戻します（既定はいちばん新しいもの） |
| `rollback --list` | 使えるスナップショットを一覧します |
| `rollback --id <ts>` | id を指定して、特定のスナップショットから戻します |
| `rollback -y` | 確認を省きます |
| `pause` | 再開するまでキュレーターを止めます |
| `resume` | 止めていたキュレーターを再開します |
| `pin <skill>` | スキルを固定し、キュレーターが勝手に動かさないようにします |
| `unpin <skill>` | スキルの固定を外します |
| `restore <skill>` | 保管したスキルを戻します |
| `archive <skill>` | スキルを手動で保管します |
| `prune` | キュレーターがふだん整理するスキルを、手動で整理します |
| `list-archived` | 保管したスキルを一覧します（`restore` で戻せます） |

新しく導入した直後は、最初の定期実行が `interval_hours` 1 回分（既定では 7 日）だけ後ろにずれます。`hermes update` のあとの最初の巡回で、ゲートウェイがすぐに手入れを始めることはありません。それより前に様子を見たいときは `hermes curator run --dry-run` を使ってください。

動きと設定は [キュレーター](/hermes/docs/user-guide/features/curator/) を参照してください。

## `hermes moa` {#hermes-moa}

名前を付けた Mixture of Agents のプリセットを設定します。プリセットは、どのモデル選択画面でも `Mixture of Agents` というプロバイダーの下に選べるモデルとして出てきます。`/moa <prompt>` は、既定のプリセットでプロンプトを 1 つ処理します。

```bash
hermes moa list
hermes moa configure [name]
hermes moa delete <name>
```

`hermes moa configure` は、参照するモデルと取りまとめ役のそれぞれについて、Hermes のプロバイダー → モデルの選択画面を使い回します。プリセットは動かし方の設定であって、主となるモデルやプロバイダーではありません。

## `hermes fallback` {#hermes-fallback}

```bash
hermes fallback <subcommand>
```

代替のプロバイダーの連なりを管理します。主なモデルが回数制限、過負荷、接続のエラーで失敗したとき、代替のプロバイダーが順に試されます。

| サブコマンド | 説明 |
|------------|-------------|
| `list`（別名: `ls`） | いまの代替の連なりを表示します（サブコマンドを省いたときの既定） |
| `add` | プロバイダーとモデルを選んで（`hermes model` と同じ選択画面です）、連なりの末尾に足します |
| `remove`（別名: `rm`） | 連なりから消す項目を選びます |
| `clear` | 代替の項目をすべて消します |

[代替のプロバイダー](/hermes/docs/user-guide/features/fallback-providers/) も参照してください。

## `hermes hooks` {#hermes-hooks}

```bash
hermes hooks <subcommand>
```

`~/.hermes/config.yaml` に書いたシェル スクリプトのフックを確認し、作った入力で試し、`~/.hermes/shell-hooks-allowlist.json` にある初回の同意の許可リストを管理します。

| サブコマンド | 説明 |
|------------|-------------|
| `list`（別名: `ls`） | 設定済みのフックを、条件、制限時間、同意の状態つきで一覧します |
| `test <event>` | `<event>` に当てはまるすべてのフックを、作った入力で動かします |
| `revoke`（別名: `remove`、`rm`） | あるコマンドの許可リストの記録を消します（次の再起動から効きます） |
| `doctor` | 設定済みのフックそれぞれについて、実行の許可、許可リスト、更新時刻のずれ、JSON の正しさ、試しに動かしたときの所要時間を調べます |

出来事の種類と受け取る内容の形は [フック](/hermes/docs/user-guide/features/hooks/) を参照してください。

## `hermes memory` {#hermes-memory}

```bash
hermes memory <subcommand>
```

外部の記憶の提供元のプラグインを用意し、管理します。使える提供元は honcho、openviking、mem0、hindsight、holographic、retaindb、byterover、supermemory です。外部の提供元は一度に 1 つだけ有効にできます。組み込みの記憶（MEMORY.md と USER.md）はつねに動いています。

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `setup` | 提供元を対話的に選んで設定します。 |
| `status` | いまの記憶の提供元の設定を表示します。 |
| `off` | 外部の提供元をやめます（組み込みだけになります）。 |

:::info 提供元ごとのサブコマンド
外部の記憶の提供元が有効なとき、その提供元が自分の管理のために `hermes <provider>` という最上位のコマンドを登録することがあります（Honcho が有効なら `hermes honcho` など）。有効でない提供元のサブコマンドは出てきません。いま何が使えるかは `hermes --help` で確認してください。
:::

## `hermes acp` {#hermes-acp}

```bash
hermes acp
```

エディター連携のために、Hermes を ACP（Agent Client Protocol）の標準入出力のサーバーとして起動します。

関連する入口:

```bash
hermes-acp
python -m acp_adapter
```

先に対応する部品を入れてください。

```bash
cd ~/.hermes/hermes-agent && uv pip install -e '.[acp]'
```

[ACP によるエディター連携](/hermes/docs/user-guide/features/acp/) と [ACP の内部](/hermes/docs/developer-guide/acp-internals/) を参照してください。

## `hermes mcp` {#hermes-mcp}

```bash
hermes mcp <subcommand>
```

MCP（Model Context Protocol）のサーバーの設定を管理し、Hermes を MCP のサーバーとして動かします。

| サブコマンド | 説明 |
|------------|-------------|
| *(なし)* または `picker` | 対話的なカタログの選択画面。Nous が認めた MCP を見て、導入・有効化・無効化します。 |
| `catalog` | Nous が認めた MCP を一覧します（素の文字で、スクリプトから使えます）。 |
| `install <name>` | カタログの項目を導入します（例: `hermes mcp install n8n`）。 |
| `serve [-v\|--verbose]` | Hermes を MCP のサーバーとして動かし、会話をほかのエージェントに開きます。 |
| `add <name> [--url URL] [--command CMD] [--auth oauth\|header] [--args ...]` | 独自の MCP サーバーを足し、ツールを自動で見つけます。`--args` は残りの引数を標準入出力のコマンドへ渡すので、最後に書いてください。 |
| `remove <name>`（別名: `rm`） | MCP サーバーを設定から外します。 |
| `list`（別名: `ls`） | 設定済みの MCP サーバーを一覧します。 |
| `test <name>` | MCP サーバーへの接続を試します。 |
| `configure <name>`（別名: `config`） | サーバーごとに、使うツールを切り替えます。 |
| `login <name>` | OAuth を使う MCP サーバーで、認証をやり直させます。 |

[MCP の設定の早見表](/hermes/docs/reference/mcp-config-reference/)、[Hermes で MCP を使う](/hermes/docs/guides/use-mcp-with-hermes/)、[MCP サーバー モード](/hermes/docs/user-guide/features/mcp/#running-hermes-as-an-mcp-server) を参照してください。

## `hermes plugins` {#hermes-plugins}

```bash
hermes plugins [subcommand]
```

プラグインをまとめて管理します。一般のプラグイン、記憶の提供元、文脈のエンジンを 1 か所で扱えます。サブコマンドなしで `hermes plugins` を実行すると、2 つの節を持つ対話画面が開きます。

- **General Plugins** — 導入済みのプラグインを、チェックボックスで有効・無効にします
- **Provider Plugins** — 記憶の提供元と文脈のエンジンを 1 つずつ選びます。分類の上で ENTER を押すと選択肢が開きます。

| サブコマンド | 説明 |
|------------|-------------|
| *(なし)* | 一体型の対話画面。一般のプラグインの切り替えと、提供元のプラグインの設定ができます。 |
| `install <identifier> [--force] [--ref COMMIT_SHA]` | Git の URL、`owner/repo`、または索引の名前だけからプラグインを導入します。スラッシュのない名前は、コミュニティのプラグイン索引を通して `owner/repo` と索引が固定したコミットに解決されます。あいまいな名前のときは候補を並べて終了します。`--ref` は 40 文字のコミット SHA だけを受け付け、その不変の版をそのまま導入し、索引の固定より優先されます。 |
| `search [term] [--json] [--capability CAP] [--refresh]` | コミュニティのプラグイン索引を検索します（名前・説明・タグへのあいまい一致。`term` を省くと全体を見られます）。`plugins.index_url`（既定は NousResearch のプラグイン索引）から取得し、`~/.hermes/cache/` に 24 時間貯めます。取れないときは古いキャッシュ、さらに同梱の初期データへ落ちます。載っていること ≠ 監査済みで、載せる判断は説明の確認だけです。 |
| `update <name>` | 固定していない導入済みのプラグインを最新にします。固定したプラグインを動かすには `--force --ref <new-commit>` で入れ直す必要があります。 |
| `remove <name>`（別名: `rm`、`uninstall`） | 導入済みのプラグインを消します。 |
| `enable <name>` | 無効にしていたプラグインを有効にします。 |
| `disable <name>` | プラグインを消さずに無効にします。 |
| `list`（別名: `ls`） | 導入済みのプラグインを、有効・無効の状態つきで一覧します。 |
| `doctor [path-or-id] [--ci]` | ネイティブのプラグインを、本物のマニフェストの読み取り・読み込み・登録の道筋で検証します。`--ci` を付けると、エラーがあれば 1 で終了します。 |
| `pack install <path-or-url> [--force]` | プラグインの詰め合わせ（`hermes-pack.yaml`）を導入します。これは、それぞれを 40 文字のコミット SHA で固定したプラグインの一覧です。必ず確認の画面（すべてのプラグイン、入手元、固定した版、宣言された権限）が出て、詰め合わせの中身について 1 回だけ確認を求め、そのあとふつうの固定導入を行います。それぞれのプラグインが宣言した権限は、これまでどおりプラグインごとの同意を通ります。詰め合わせがまとめて権限を与えることはありません。一部が失敗した場合はプラグインごとに報告し、1 つでも失敗すれば 0 でない終了コードになります。対話的な実行だけで、`--yes` はありません。 |
| `pack export [--enabled-only] [--name NAME]` | いまの導入内容から、詰め合わせの YAML を標準出力に書き出します。git から入れた各プラグインのリポジトリと正確な SHA に加えて、秘密を除いた `plugins.entries` の設定が入ります。git の出どころがない手元だけのプラグインは、導入できる項目としてではなく、注意書きのコメントとして並びます。秘密、与えた権限、`allow_*` の関門はつねに取り除かれます。 |
| `pack show <path-or-url>` | 下見です。何も導入せずに、詰め合わせを読んで検証し、内容を表示します。 |

提供元のプラグインの選択は `config.yaml` に保存されます。
- `memory.provider` — 有効な記憶の提供元（空なら組み込みだけ）
- `context.engine` — 有効な文脈のエンジン（`"compressor"` が組み込みの既定）

一般のプラグインの無効一覧は、`config.yaml` の `plugins.disabled` に入ります。
git から入れたものについては、正式な入手元、実際に入った版、固定の有無だけを
プロファイルごとの `plugins/.install-metadata.json` に記録します。ここに
プラグインの設定、環境の値、秘密、与えた権限は入りません。

[プラグイン](/hermes/docs/user-guide/features/plugins/) と [Hermes のプラグインを作る](/hermes/docs/developer-guide/plugins/) を参照してください。

## `hermes tools` {#hermes-tools}

```bash
hermes tools [--summary]
```

| オプション | 説明 |
|--------|-------------|
| `--summary` | いま有効なツールのまとめを表示して終了します。 |

`--summary` を付けなければ、プラットフォームごとにツールを設定する対話画面が開きます。

## `hermes computer-use` {#hermes-computer-use}

```bash
hermes computer-use <subcommand>
```

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `install` | 提供元の cua-driver のインストーラーを実行します（macOS、Windows、Linux）。 |
| `install --upgrade` | cua-driver がすでに PATH にあってもインストーラーを走らせ直します。提供元のスクリプトはつねに最新版を取ってくるので、その場での更新になります。 |
| `status` | `cua-driver` が `$PATH` にあるか、どの版が入っているかを表示します。 |
| `doctor [--include CHECK] [--skip CHECK] [--json]` | cua-driver の健康診断を走らせ、環境ごとの確認結果を表示します。 |
| `permissions status [--json]` | macOS のアクセシビリティと画面収録の許可の状態を報告します。 |
| `permissions grant` | Cua Driver にアクセシビリティと画面収録の許可を与えるよう macOS に求めます。 |

`hermes computer-use install` は、`computer_use` のツールセットが使う
[cua-driver](https://github.com/trycua/cua) の実行ファイルを入れるための、
安定した入口です。Computer Use を初めて有効にしたときに `hermes tools` が呼ぶ
のと同じ提供元のインストーラーを実行するので、ツールセットの切り替えで
うまく走らなかったとき（たとえば、すでに設定済みの人が実行したとき）に、
入れ直しの手段として安心して使えます。

cua-driver がすでにあるときは、Hermes がその版と実行時のマニフェストを確認します。
0.20.0 以降の使える導入はそのまま残します。古かったり足りなかったりする標準の導入は、
いまの提供元のインストーラーで直します。`HERMES_CUA_DRIVER_CMD` で選んだ独自の
実行ファイルを Hermes が置き換えることはありません。その実行ファイルを自分で更新するか、
上書きの設定を外してください。直す必要があるかどうかは
`hermes computer-use status` が報告します。

Hermes との連携としておすすめなのは、組み込みの `computer_use` のツールセットです。
Cua の生の MCP ツールを登録するのは、Cua の低い水準の道具立てが必要なときの
代わりの手です。`cua-driver skills install` は Hermes を見つけて、Cua の
スキル一式を Hermes のスキルのディレクトリへ自動でつなぎます。

権限の扱い方と権限のマニフェストの承認は、実行時の
起動に属します。範囲を絞ったモードでは、Hermes が Cua の正式な
`--capability-manifest` と `--approve-capability-manifest` を渡します。どの MCP の
経路も、自分の実行環境の中に専用の生存期間のセッションを持ちます。公開のセッション名は
カーソルとセッションの状態を示す札で、実行環境を持つわけでも共有するわけでもありません。

cua-driver が PATH にあれば、`hermes update` は更新の最後に提供元の
インストーラーを自動で走らせ直すので、たいていの人が自分で `--upgrade` を
使う必要はありません。次の Hermes の更新を待たずに、提供元の修正を
いますぐ取り込みたいときに使ってください。

## `hermes pets` {#hermes-pets}

```bash
hermes pets <list|install|select|show|off|scale|remove|doctor>
```

[Petdex](https://github.com/crafter-station/petdex) は、コーディングのエージェント向けに動くドット絵のペットを集めた公開の展示場です。1 匹入れると、CLI、TUI、デスクトップ アプリで、エージェントの動きに反応する様子が見られます。

| サブコマンド | 説明 |
|------------|-------------|
| `list` | petdex の展示場を見ます。 |
| `install` | 展示場からペットを入れます。 |
| `select` | 表に出すペットを決めます（`display.pet.*` に書きます）。 |
| `show` | 表に出しているペットをターミナルで動かします。 |
| `off` | ペットの表示をやめます。 |
| `scale` | ペットの大きさをどこでも変えます（`display.pet.scale`）。 |
| `remove` | 入れたペットを消します。 |
| `doctor` | ペットの設定と、ターミナルの画像表示への対応を確認します。 |

`/hatch` スラッシュコマンドを使えば、文章での説明からまったく新しいペットを作れます。[ペット](/hermes/docs/user-guide/features/pets/) を参照してください。

## `hermes sessions` {#hermes-sessions}

```bash
hermes sessions <subcommand>
```

サブコマンド:

| サブコマンド | 説明 |
|------------|-------------|
| `list` | 最近のセッションを一覧します。 |
| `browse` | 検索と再開ができる対話的なセッションの選択画面です。各行には、セッションの最後のメッセージから導いた状態の札（`done` / `intr` / `err` / `empty`）とメッセージ数が出ます。選んだ行で `d` を押すと（検索の絞り込みが空のとき）、y/N の確認のあとそのセッションを消せます。絞り込み中は、`d` は検索への入力になります。 |
| `export <output> [--session-id ID]` | セッションを JSONL に書き出します。 |
| `delete <session-id>` | セッションを 1 つ消します。 |
| `prune` | 条件に合うセッションを消します。時間の条件は `--older-than`/`--newer-than`/`--before`/`--after`（`5h`/`2d` のような長さ、日数だけの数、ISO の時刻）、属性は `--source`、`--title`、`--model`、`--provider`、`--branch`、`--end-reason`、`--user`、`--chat-id`、`--chat-type`、`--cwd`、数の条件は `--min/--max-messages`、`--min/--max-tokens`、`--min/--max-cost`、`--min/--max-tool-calls`、それに `--include-archived`、`--dry-run`、`--yes` があります。既定は 90 日より古いものです。 |
| `archive` | `prune` と同じ条件に合うセッションをまとめて保管します（隠すだけで、消しません）。条件を 1 つ以上指定する必要があります。 |
| `stats` | セッションの保管場所の統計を表示します。 |
| `rename <session-id> <title>` | セッション名を決める・変えます。 |
| `optimize` | ディスクを空けます。FTS5 の索引の断片をまとめ、VACUUM を実行します。セッションのデータは変えません。 |
| `optimize-storage` | 全文検索の索引を、中身を外に持つ小さな v23 の形へ移します。大きなデータベースでは `state.db` がかなり小さくなります。 |
| `repair` | 壊れた `state.db` のスキーマ（たとえば `table messages_fts already exists`）を直して、隠れていたセッションを戻します。先に控えを取ります。 |
| `repair-routing` | 経路の情報を失ったセッションの行に取り残された、ゲートウェイの会話をつなぎ直します（再起動のあとにチャットが「時間を巻き戻した」ように見える現象です）。既定では下見だけで、`--apply` を付けると実際につなぎ直します（先にゲートウェイを止めてください）。`--max-gap-seconds N` でつながりとみなす幅を調整できます。まぎれのない場合だけ直します。[セッション → 取り残されたゲートウェイのセッションを直す](/hermes/docs/user-guide/sessions/#repair-stranded-gateway-sessions) を参照してください。 |
| `recover` | 壊れた `state.db` を、ネットにつながずに、元を傷つけない形で別のきれいなデータベースへ救い出します。 |
| `retitle-skills` | `/skill` で開いたセッションの名前を、実際に打った内容から付け直します。`--apply` を付けない限り、変更の一覧を出すだけです。 |

## `hermes insights` {#hermes-insights}

```bash
hermes insights [--days N] [--source platform]
```

| オプション | 説明 |
|--------|-------------|
| `--days <n>` | 直近 `n` 日を分析します（既定: 30）。 |
| `--source <platform>` | `cli`、`telegram`、`discord` などの出どころで絞ります。 |

## `hermes claw` {#hermes-claw}

```bash
hermes claw migrate [options]
```

OpenClaw の設定を Hermes へ移します。`~/.openclaw`（または指定したパス）から読み、`~/.hermes` へ書きます。古いディレクトリ名（`~/.clawdbot`、`~/.moltbot`）や設定ファイル名（`clawdbot.json`、`moltbot.json`）も自動で見つけます。

| オプション | 説明 |
|--------|-------------|
| `--dry-run` | 何も書かずに、何が移るかを下見します。 |
| `--preset <name>` | 移行の型: `full`（互換のある設定すべて）か `user-data`（基盤まわりの設定を除く）。どちらの型でも秘密の情報は移しません。移すなら `--migrate-secrets` を明示してください。 |
| `--overwrite` | ぶつかったときに既存の Hermes のファイルを上書きします（既定は、ぶつかる計画なら適用を拒みます）。 |
| `--migrate-secrets` | API キーも移します。`--preset full` のときも必ず必要です。 |
| `--no-backup` | 移行前の `~/.hermes/` の zip のスナップショットを取りません（既定では、適用の前に復元用の書庫を 1 つ `~/.hermes/backups/pre-migration-*.zip` に書きます。`hermes import` で戻せます）。 |
| `--source <path>` | OpenClaw のディレクトリを指定します（既定: `~/.openclaw`）。 |
| `--workspace-target <path>` | ワークスペース向けの指示（AGENTS.md）を置くディレクトリ。 |
| `--skill-conflict <mode>` | スキル名がぶつかったときの扱い: `skip`（既定）、`overwrite`、`rename`。 |
| `--yes` | 確認を省きます。 |

### 何が移るか {#what-gets-migrated}

移行の対象は、人格、記憶、スキル、モデルのプロバイダー、メッセージング プラットフォーム、エージェントの振る舞い、セッションの方針、MCP サーバー、読み上げなど 30 を超える分類にわたります。それぞれは、Hermes の同等のものへ**そのまま取り込まれる**か、あとで自分で見直すために**保管される**かのどちらかです。

**そのまま取り込まれるもの:** SOUL.md、MEMORY.md、USER.md、AGENTS.md、スキル（4 つの元ディレクトリ）、既定のモデル、独自のプロバイダー、MCP サーバー、メッセージング プラットフォームのトークンと許可リスト（Telegram、Discord、Slack、WhatsApp、Signal、Matrix、Mattermost）、エージェントの既定値（推論の深さ、圧縮、人らしい間、タイムゾーン、サンドボックス）、セッションの作り直しの方針、承認の規則、読み上げの設定、ブラウザーの設定、ツールの設定、実行の制限時間、コマンドの許可リスト、ゲートウェイの設定、3 つの出どころからの API キー。

**あとで見直すために保管されるもの:** cron の作業、プラグイン、フックと webhook、記憶のバックエンド（QMD）、スキルのレジストリの設定、画面と身元、ログ、複数エージェントの構成、チャンネルの結び付け、IDENTITY.md、TOOLS.md、HEARTBEAT.md、BOOTSTRAP.md。

**API キーの解決**は 3 つの出どころを優先度の順に見ます。設定の値 → `~/.openclaw/.env` → `auth-profiles.json`。トークンの項目はすべて、素の文字列、環境変数のひな形（`${VAR}`）、SecretRef のオブジェクトのいずれにも対応します。

設定キーの完全な対応表、SecretRef の扱いの詳細、移行後の確認事項は、**[移行ガイドの全体](/hermes/docs/guides/migrate-from-openclaw/)** を参照してください。

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

**Claude Code**（`~/.claude`）や **OpenAI Codex CLI**（`~/.codex`）の設定を Hermes へ取り込みます。`CLAUDE.md` と `AGENTS.md` の指示は記憶の項目へ、`Bash(...)` の許可・拒否の規則は `command_allowlist` と `approvals.deny` へ、MCP サーバーは `config.yaml` の `mcp_servers` へ、スキルのディレクトリは `~/.hermes/skills/` へ移します。適用の前に必ず下見が出ます。API キーと認証情報は決して取り込みません。

| オプション | 説明 |
| --- | --- |
| `agent` | `claude-code` か `codex`（既定は自動判別）。 |
| `--source <path>` | 元のディレクトリを指定します（既定: `~/.claude` か `~/.codex`）。 |
| `--dry-run` | 下見だけで、何も書きません。 |
| `--overwrite` | ぶつかった MCP サーバーやスキルを置き換えます（既定は飛ばします）。 |
| `--yes`、`-y` | 確認を省きます。 |

対応表の全体は **[取り込みガイド](/hermes/docs/user-guide/import-from-other-agents/)** を参照してください。

## `hermes serve` {#hermes-serve}

```bash
hermes serve [options]
```

Hermes の**バックエンド サーバー**を起動します。[デスクトップ アプリ](/hermes/docs/user-guide/desktop/) や離れた場所のクライアントがつなぐ、JSON-RPC と WebSocket の窓口です。`hermes dashboard` が動かすのと同じサーバーですが、**画面がありません**。ブラウザーの UI を開くことは決してありません。デスクトップ アプリは自分で `hermes serve` のバックエンドを立ち上げます。離れた場所のホストに画面なしのバックエンドを置きたいときは、このコマンドを直接使ってください。下の `hermes dashboard` と同じ `--host` / `--port` / `--insecure` / `--skip-build` / `--stop` / `--status` を受け付けます（ループバック以外に結び付けると、同じ認証の関門が働きます）。`[web]` の追加部品が必要で、組み込みのチャットの接続には POSIX のホストで `[pty]` も要ります。

**ポートがぶつかったとき:** 指定したポート（既定は `9119`）を別のプロセス（2 つ目の `hermes serve` やゲートウェイなど）が使っている場合、機械が読める目印の行 `BACKEND_PORT_IN_USE port=<port>` を標準出力に出し、掴んでいそうな相手を人向けに知らせ、ありきたりのエラーではなく終了コード **75**（`EX_TEMPFAIL`）で終わります。スクリプトやデスクトップ アプリが「ポートがふさがっている」と「バックエンドが壊れている」を区別できるようにするためです。`--port 0` を渡すと、空いているポートを自動で使います（起動に成功すると、選んだポートを `HERMES_BACKEND_READY port=<port>` で知らせます）。

## `hermes dashboard` {#hermes-dashboard}

```bash
hermes dashboard [options]
```

ウェブ ダッシュボードを起動します。設定や API キーの管理、セッションの様子を見るための、ブラウザーで使う画面です。（デスクトップ アプリが立ち上げるような、ブラウザーの画面を持たないバックエンドがほしいときは、上の [`hermes serve`](#hermes-serve) を使ってください。）`cd ~/.hermes/hermes-agent && uv pip install -e ".[web]"`（FastAPI と Uvicorn）が必要です。組み込みのブラウザーのチャットのタブはいつでも使えますが、`pty` の追加部品（`cd ~/.hermes/hermes-agent && uv pip install -e ".[web,pty]"`）と、Linux、macOS、WSL2 のような POSIX の PTY の環境も必要です。詳しい説明は [ウェブ ダッシュボード](/hermes/docs/user-guide/features/web-dashboard/) にあります。

| オプション | 既定 | 説明 |
|--------|---------|-------------|
| `--port` | `9119` | ウェブ サーバーを動かすポート |
| `--host` | `127.0.0.1` | 結び付けるアドレス |
| `--no-open` | — | ブラウザーを自動で開きません |
| `--insecure` | オフ | **非推奨で、何も起きません。** 以前はループバック以外に結び付けたときに認証を省くものでした。2026 年 6 月の強化以降、公開の結び付けでは*つねに*認証の仕組み（パスワードか OAuth）が必要です。手元だけで使うなら `127.0.0.1` に結び付けてトンネルを掘ってください。 |
| `--skip-build` | オフ | ウェブ UI の組み立てを飛ばし、すでにある `dist` をそのまま配ります。npm が使えない、人の操作を伴わない場面（Windows のタスク スケジューラー、CI）に向いています。先に `cd web && npm run build` で組み立てておいてください。 |
| `--isolated` | オフ | 名前付きのプロファイルから起動したとき（`worker dashboard`）、端末のダッシュボードへ流さずに、そのプロファイル専用のサーバーを動かします。 |
| `--stop` | — | 動いている `hermes dashboard` のプロセスを止めて終了します。 |
| `--status` | — | 動いている `hermes dashboard` のプロセスを一覧して終了します。 |

### `hermes dashboard register` {#hermes-dashboard-register}

この導入を、自前で立てたダッシュボードとして Nous Portal のアカウントに登録します。OAuth のクライアントを作り、`HERMES_DASHBOARD_OAUTH_CLIENT_ID` を `~/.hermes/.env` に書き、ログインの関門を有効にする方法を表示します。あらかじめログインしておく必要があります（`hermes setup`）。

| オプション | 説明 |
|--------|-------------|
| `--name` | ダッシュボードの分かりやすい名前（既定は自動で作られます）。 |
| `--redirect-uri` | 公開の HTTPS の OAuth のリダイレクト先（例: `https://hermes.example.com/auth/callback`）。手元だけで使うなら省いてください。 |
| `--portal-url` | 登録に使う Nous Portal のベース URL を上書きします（既定はログインしたポータル）。`HERMES_DASHBOARD_PORTAL_URL` でも設定できます。 |

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

プロファイル（設定、セッション、スキル、ホーム ディレクトリをそれぞれ別に持つ、互いに独立した複数の Hermes）を管理します。

| サブコマンド | 説明 |
|------------|-------------|
| `list` | すべてのプロファイルを一覧します。 |
| `use <name>` | 既定で使うプロファイルを決めます。 |
| `create <name> [--clone] [--clone-all] [--clone-from <source>] [--no-alias]` | 新しいプロファイルを作ります。`--clone` は、使っているプロファイルから設定、`.env`、`SOUL.md`、スキルを写します。`--clone-all` は状態をすべて写します。`--clone-from` は写す元を指定し、`--clone-all` と一緒でなければ設定の複製を意味します。 |
| `delete <name> [-y]` | プロファイルを消します。 |
| `show <name>` | プロファイルの詳細（ホーム ディレクトリ、設定など）を表示します。 |
| `alias <name> [--remove] [--name NAME]` | プロファイルへ手早く入るためのラッパーのスクリプトを管理します。 |
| `rename <old> <new>` | プロファイルの名前を変えます。 |
| `export <name> [-o FILE]` | プロファイルを `.tar.gz` の書庫に書き出します（手元での控え）。 |
| `import <archive> [--name NAME]` | `.tar.gz` の書庫からプロファイルを取り込みます（手元での復元）。 |
| `install <source> [--name N] [--alias] [--force] [-y]` | git の URL か手元のディレクトリから、配布されたプロファイルを導入します。 |
| `update <name> [--force-config] [-y]` | 配布されたプロファイルを取り直します。ユーザーのデータ（記憶、セッション、認証）は残ります。 |
| `info <name>` | プロファイルの配布のマニフェスト（版、必要なもの、入手元）を表示します。 |

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

シェルの補完スクリプトを標準出力に出します。シェルの設定でこの出力を読み込めば、Hermes のコマンド、サブコマンド、プロファイル名を Tab キーで補完できます。

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

`hermes-agent` の最新のコードを取得し、管理下の仮想環境に依存関係を入れ直したうえで、導入後の処理（MCP サーバー、スキルの同期、補完の導入）をやり直します。動いている環境でも安全に実行できます。導入せずに、自分の手元が `origin/main` より遅れているかを見たいときは `--check` を使ってください。

`hermes update` は設定された更新用のブランチ（既定: `main`）を取得します。別のブランチにいる場合、Hermes が取得の前に更新用のブランチへ切り替えることがあります。ブランチでの作業を更新時の自動退避の流れの外に置いておきたいときは、更新の前にコミットしてください。

| オプション | 説明 |
|--------|-------------|
| `--gateway` | メッセージングの `/update` が使う内部向けのモードです。端末の標準入力ではなく、ファイル経由のやり取りで確認と進み具合を伝えます。ゲートウェイの再起動を指示するものではありません。 |
| `--check` | 取得も、依存関係の導入も、再起動もせずに、更新があるかどうかだけを調べます。 |
| `--plan` | 何も変えずに更新の計画を表示して終了します。導入の種類（git / Docker / Nix / apt）、すべてのプロファイルで動いている Hermes のサービスとその監視役・動いているコードの版、そしてそれぞれをどう再起動するかが出ます。イメージやパッケージで管理している導入では、代わりに正しい外部の更新コマンドを知らせます。読み取りだけです。 |
| `--no-backup` | `updates.pre_update_backup` の設定にかかわらず、この実行では更新前の控え（手早い状態のスナップショットと全体の zip の両方）を取りません。 |
| `--backup` | この実行では更新前に**全体**の控えを取ります。手早い状態のスナップショットに加えて、`HERMES_HOME`（設定、認証、セッション、スキル、紐づけの情報）の完全な zip を作ります。既定は `quick` で、軽い状態のスナップショットだけです。恒久的な設定は `config.yaml` の `updates.pre_update_backup: quick | full | off` で決めます。 |
| `--yes`、`-y` | 設定の移行や退避したものの復元といった確認に、すべて「はい」と答えます。API キーの入力は飛ばされるので、それらは `hermes config migrate` を別に実行してください。 |

そのほかの動き:

- **ゲートウェイの再起動。** 更新に成功すると、新しいコードを使うために、Hermes は動いているすべてのゲートウェイのプロファイルを自動で再起動しようとします。更新せずにゲートウェイだけ再起動したいときは `hermes gateway restart` を使ってください。
- **再起動の段の立て直し。** 取得したばかりのツリーを読み込む途中で再起動の段が止まった場合、監視下のゲートウェイのプロファイルはきれいな Python のプロセスでやり直されます。systemd（`systemctl --user is-active`）が独立に確かめた再起動だけが「確認済み」として報告され、単に 0 で終わっただけの立て直しは `relaunch_attempted` として記録され、更新は安全側に倒して失敗になります。手動で動かしているゲートウェイや serve / dashboard の実行は、立て直す権限がない限り決して止めません。理由つきで飛ばしたと記録され、正確な再起動のコマンドとともに未完了の報告に残ります。
- **更新の控えと全台の版の確認。** 実行のたびに、機械が読める控えが `~/.hermes/logs/update_receipts/` に書かれます（更新前の全体の計画、手順、飛ばした理由、再起動の結果。`latest.json` がいちばん新しいものを指します）。再起動の段のあと、動いている各ゲートウェイのコードを更新後のツリーと突き合わせ、プロファイルごとの版の表を出します。更新前のコードのままのゲートウェイがあれば、正確な再起動のコマンドとともに更新は失敗（終了コード 1）になります。
- **手元のソースの変更。** git での導入では、追跡しているファイルの変更と追跡していないファイルが、ブランチの切り替えや取得の前に自動で退避されます（`git stash push --include-untracked`）。対話的な端末での更新では、戻すかどうかを尋ねます。対話がない更新では既定で戻します。取得に成功したあと手元のソースの変更を捨ててよい管理下の導入でだけ、`updates.non_interactive_local_changes: discard` を設定してください。戻すときにぶつかった場合や取得に失敗した場合は、手で回収できるよう退避したまま残します。
- **npm のロック ファイルの揺れ。** 退避やブランチの切り替えの前に、Hermes は npm の導入・組み立てで生じた `package-lock.json` の差分をできる範囲で片付けます。意図して変えたロック ファイルは、`hermes update` の前にコミットするか自分で退避してください。
- **紐づけ情報のスナップショット。** `--backup` を付けていなくても、`hermes update` は `git pull` の前に `~/.hermes/pairing/` と Feishu のコメントの規則の軽いスナップショットを取ります。編集中のファイルが取得で書き換わってしまったときは、`hermes backup restore --state pre-update` で戻せます。
- **古い `hermes.service` の注意。** 名前を変える前の `hermes.service` の systemd のユニット（いまの `hermes-gateway.service` ではないもの）を見つけると、行き来を繰り返す問題を避けるために移行の案内を一度だけ表示します。
- **終了コード。** 成功なら `0`、取得・導入・導入後の処理のエラーなら `1`、`git pull` を妨げる予期しない作業ツリーの変更があれば `2` です。

## 保守のコマンド {#maintenance-commands}

| コマンド | 説明 |
|---------|-------------|
| `hermes --version` | 版の情報を表示します。 |
| `hermes update` | 最新の変更を取得して依存関係を入れ直します。 |

| `hermes uninstall [--full] [--gui] [--dry-run] [--yes]` | Hermes を取り除きます。必要なら設定とデータもすべて消します。`--gui` はデスクトップのチャットの画面だけを取り除き、エージェントはそのまま残します。`--full` は設定とデータも消します。`--dry-run` は何も変えずに、消される対象を表示します。`--yes` は確認を省きます。 |

## 関連ページ {#see-also}

- [スラッシュコマンド早見表](/hermes/docs/reference/slash-commands/)
- [CLI の使い方](/hermes/docs/user-guide/cli/)
- [セッション](/hermes/docs/user-guide/sessions/)
- [スキルの仕組み](/hermes/docs/user-guide/features/skills/)
- [スキンとテーマ](/hermes/docs/user-guide/features/skins/)
