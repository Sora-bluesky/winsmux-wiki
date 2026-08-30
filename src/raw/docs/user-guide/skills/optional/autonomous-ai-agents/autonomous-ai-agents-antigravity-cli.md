---
title: "Antigravity Cli — Antigravity CLI（agy）を使いこなします。プラグイン、認証、サンドボックス"
description: "Antigravity CLI（agy）を使いこなします。プラグイン、認証、サンドボックス"
upstream_path: user-guide/skills/optional/autonomous-ai-agents/autonomous-ai-agents-antigravity-cli.md
upstream_blob: d4e2f48b971a0b05fe8e49c31f754bd46a50dad0
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/autonomous-ai-agents/autonomous-ai-agents-antigravity-cli
---

# Antigravity Cli {#antigravity-cli}

Antigravity CLI（agy）を使いこなします。プラグイン、認証、サンドボックス。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加で入れるもの — `hermes skills install official/autonomous-ai-agents/antigravity-cli` で導入します |
| パス | `optional-skills/autonomous-ai-agents\antigravity-cli` |
| バージョン | `0.2.0` |
| 作者 | Tony Simons（asimons81）、Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Coding-Agent`, `Antigravity`, `CLI`, `Auth`, `Plugins`, `Sandbox` |
| 関連 skill | [`grok`](/hermes/docs/user-guide/skills/optional/autonomous-ai-agents/autonomous-ai-agents-grok/), [`codex`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-codex/), [`claude-code`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-claude-code/), [`hermes-agent`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-hermes-agent/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Antigravity CLI（`agy`） {#antigravity-cli-agy}

`agy` として呼び出す Antigravity CLI の操作手引きです。`agy` のコマンドはすべて
Hermes の `terminal` ツールから実行し、設定やログは `read_file` で確かめます。
この skill は資料と手順をまとめたもので、通信を伴う API を包んでいるわけではないので、
Hermes 側で認証するものはありません。

## 使いどころ {#when-to-use}

- `agy` の実行ファイルを入れる、更新する、動作を軽く確かめる
- 対話なしの `agy --print` / `agy -p` を一回きりで走らせる
- Antigravity の認証、サンドボックス、権限、プラグインの状態を調べる
- Antigravity の設定、キー割り当て、会話、ログを読む

## 全体像 {#mental-model}

Antigravity には 2 つの層があります。ここを混ぜると案内そのものが間違ってしまいます。

1. **シェルから呼ぶコマンド** — `agy help`、`agy install`、`agy plugin`、
   `agy update`、`agy changelog`。これらは `terminal` ツールから実行します。
2. **セッション内で使うスラッシュコマンド** — `/config`、`/permissions`、
   `/skills`、`/agents` など。これらは動いている `agy` の TUI セッションの中にだけあり、
   シェルからは呼べません。

`agy help` が見せてくれるのはシェルから呼ぶ側だけで、セッション内のスラッシュコマンドは出てきません。

## 前提 {#prerequisites}

- `agy` の実行ファイルが PATH にあること。`terminal` ツールで確かめます。
  `command -v agy && agy --version`。
- この skill に必要な環境変数や API キーはありません。Antigravity は OS のキーリングや
  ブラウザでのサインインで、自前で認証を管理します（下の「認証のふるまい」を参照）。

## 実行のしかた {#how-to-run}

`agy` のコマンドは、すべて `terminal` ツールから呼びます。例を挙げます。

```
terminal(command="agy --version")
terminal(command="agy help")
terminal(command="agy plugin list")
terminal(command="agy --print 'Summarize the repo in 3 bullets'", workdir="/path/to/project")
```

何度もやり取りする対話セッションを開くときは、`pty=true` を付けて `agy` を起動します
（画面の取り込みや監視には tmux を併用します）。`codex` や `claude-code` の skill と同じやり方です。
動作確認や台本どおりのプロンプトを一回きりで流すなら、対話なしの
`agy --print` のほうが向いています。

Antigravity 自身のファイルを見るときは、下の「主なパス」にあるパスを `read_file` で読みます。
ターミナルから `cat` しないでください。

## 仕事の任せ方 {#delegation-patterns}

`agy` は `codex` や `claude-code` と同じ系統のコーディングエージェントの土台なので、
任せ方の型も同じです。動作確認ではなく実際の作業（機能追加、修正、レビュー、第二の意見）を
Antigravity に渡すときは、次の形を使います。

### 一回きり（台本どおりのプロンプトや第二の意見に向いています） {#one-shot-preferred-for-scripted-prompts-and-second-opinions}

```
terminal(command="agy -p 'Review this diff for bugs and security issues' --model 'Gemini 3.1 Pro (High)'", workdir="/path/to/repo", timeout=300)
```

`-p` は対話なしです。プロンプトを実行して終了します。使うモデルは
`--model` で選びます（表示名の正確な文字列は `agy models` で確かめます。たとえば
`'Gemini 3.1 Pro (High)'` や `'Claude Opus 4.6 (Thinking)'`）。参照させたい場所を増やすときは、
繰り返し指定できる `--add-dir` を使います。

### 長め・時間を区切った実行（テスト、ビルド、複数ファイルの変更） {#long-bounded-runs-tests-builds-multi-file-changes}

`codex` の skill と同じように、裏で走らせて終わったら知らせてもらいます。

```
terminal(command="agy -p 'Implement the change described in TASK.md and run the tests' --dangerously-skip-permissions", workdir="/path/to/repo", background=true, notify_on_complete=true)
# then: process(action="poll"/"log"/"wait", session_id=<id>)
```

### 何度もやり取りする対話（PTY と tmux） {#interactive-multi-turn-pty-tmux}

会話しながら進めるときは、`pty=true` のもとで `agy -i`（または引数なしの `agy`）を起動し、
tmux の `capture-pane` / `send-keys` を使います。`codex` や `claude-code` の skill に書かれているのと
まったく同じやり方です。あとで再開するには `--continue` / `-c` を使うか、
`--conversation <id>` で会話を指定します。

### 並べて動かす（サブ課題やワークツリーへの振り分け） {#parallel-instances-batch-sub-issue-worktree-fan-out}

作業ごとに git のワークツリーを 1 つ作り、それぞれで独立した `agy -p` を裏で起動して、
あとから結果を集めます。`codex` の skill が課題をまとめて片付けるときに使うのと同じ振り分け方です。
同時に走らせる数は、マシンの余力と、自分がレビューできる量に収めます。

### 出力と実行時間の注意点（Claude Code とは違います） {#output-bounding-caveat-differs-from-claude-code}

- `agy -p` が返すのは**ただのテキスト**です。**`--output-format json` はありません**。
  `session_id` や費用、ターン数を含む結果の入れ物も返りません。標準出力をそのまま読んでください。
  JSON のオブジェクトが返ることを期待しないでください。
- **`--max-turns` もありません。** 出力の実行は **`--print-timeout`**（既定は `5m`）で区切られます。
  長い作業では伸ばしてください。`--print-timeout 20m` のようにします。外側の呼び出しが先に切れないよう、
  `terminal` の `timeout=` も合わせて指定します。

### どこまでを任せるか {#orchestration-boundary}

Antigravity は**作業を実行する土台、あるいは第三の意見をくれるレビュー役**です。
作業を回しているエージェントやプロファイルが選ぶ実行手段であって、進行管理の一等地に置くものではありません。
`agy` をかんばんのカードとして立てたり、調整役の層として扱ったりしないでください。仕事はふだんの
タスクの流れに乗せ、割り当てられた担当が（codex や claude-code、直接のツールと並べて）`agy` を
手段として選ぶ形にします。名指しで使うのは、利用者から頼まれたとき、担当がそれを包むよう設定されているとき、
あるいは他のエージェントの計画や差分に Gemini 系から突き合わせをかけたいときだけです。

## 主なパス {#core-paths}

- 実行ファイル・入口: `agy`
- アプリのデータ置き場: `~/.gemini/antigravity-cli/`
- 設定ファイル: `~/.gemini/antigravity-cli/settings.json`
- キー割り当てのファイル: `~/.gemini/antigravity-cli/keybindings.json`
- ログ: `~/.gemini/antigravity-cli/log/cli-*.log`
- 会話: `~/.gemini/antigravity-cli/conversations/`
- brain の生成物: `~/.gemini/antigravity-cli/brain/`
- 履歴: `~/.gemini/antigravity-cli/history.jsonl`
- プラグインの置き場: `~/.gemini/antigravity-cli/plugins/<plugin_name>/`

## 早見表 {#quick-reference}

### シェルから呼ぶコマンド {#wrapper-commands}

- `agy changelog`
- `agy help`
- `agy install`
- `agy plugin` / `agy plugins`
- `agy update`

### よく使うフラグ {#useful-flags}

- `--add-dir`
- `--continue` / `-c`
- `--conversation`
- `--dangerously-skip-permissions`
- `--print` / `-p`
- `--print-timeout`
- `--prompt`
- `--prompt-interactive` / `-i`
- `--sandbox`
- `--log-file`
- `--version`

### プラグインのサブコマンド（`agy plugin --help`） {#plugin-subcommands-agy-plugin---help}

- `list`, `import [source]`, `install <target>`, `uninstall <name>`,
  `enable <name>`, `disable <name>`, `validate [path]`, `link <mp> <target>`,
  `help`

### 導入時のフラグ（`agy install --help`） {#install-flags-agy-install---help}

- `--dir`, `--skip-aliases`, `--skip-path`

### セッション内のスラッシュコマンド {#in-session-slash-commands}

- **会話の操作:** `/resume`（`/switch`）、`/rewind`（`/undo`）、
  `/rename <name>`、`/clear`、`/fork`、`/reset`、`/new`
- **設定とツール:** `/config`、`/settings`、`/permissions`、`/model`、
  `/keybindings`、`/statusline`、`/tasks`、`/skills`、`/mcp`、`/open <path>`、
  `/usage`、`/logout`、`/agents`
- **入力の補助:** `@` でパスを補完、`esc esc` で入力欄を消す（応答が流れていないとき）、
  `!` でターミナルのコマンドを直接実行、`?` でヘルプを開く

## 設定と権限 {#settings-and-permissions}

### よく使う設定キー（`settings.json`） {#common-settings-keys-settingsjson}

- `allowNonWorkspaceAccess`
- `colorScheme`
- `permissions.allow`
- `trustedWorkspaces`

### 権限のモード {#permission-modes}

`request-review`、`always-proceed`、`strict`、`proceed-in-sandbox` があります。

### サンドボックスのふるまい {#sandbox-behavior}

- `enableTerminalSandbox` は `settings.json` の真偽値で、既定は `false` です。
- 起動時に渡す指定（`--sandbox`、`--dangerously-skip-permissions`）は、
  そのセッションのあいだ、保存された設定より優先されます。

## 認証のふるまい {#authentication-behavior}

- CLI はまず OS の安全なキーリングを試します。
- 保存されたセッションが無ければ、ブラウザでの Google サインインに切り替わります。
- 手元では既定のブラウザが開きます。SSH 越しでは認可用の URL が表示され、
  認可コードを貼り戻す形になります。
- `/logout` で、保存された認証情報を消せます。

## プラグイン {#plugins}

- プラグインは `~/.gemini/antigravity-cli/plugins/<plugin_name>/` に置かれます。
- skill、エージェント、ルール、MCP サーバー、フックをまとめて持てます。
- `agy plugin list` に何も出ないのは、取り込み済みのプラグインが無いというだけで、問題ではありません。

## つまずきやすいところ {#pitfalls}

- `agy help` が見せるのはシェルから呼ぶコマンドで、対話中のスラッシュコマンドではありません。
- 版を確かめるなら、対話を伴わない `agy --version` が安全です。`agy version` は対話用で、
  本物の端末が無いと失敗することがあります。
- うまくいかないときにまず見るのは `~/.gemini/antigravity-cli/log/cli-*.log` です
  （`read_file` で読みます）。
- 保存される JSON の設定と、起動時に渡す指定を混同しないでください。
- `~/.gemini/antigravity-cli/bin/agentapi` は `agy agentapi` を呼ぶだけの薄い包みです。
- WSL ではトークンがファイルに保存されるので、認証の不調はたいてい手元のファイルや
  セッションの状態の問題で、ブラウザだけの問題ではありません。
- どのワークスペースとみなされるかは、起動したディレクトリと `.antigravitycli` という
  プロジェクトの目印に左右されることがあります。
- `agy -p` はただのテキストしか出しません。`--output-format json` も、結果を包むオブジェクトも
  ありません。（`claude-code` と違って）JSON を取り出そうとしないでください。
- 出力の実行時間は `--print-timeout`（既定は `5m`）で区切ります。`agy` に `--max-turns` は
  ありません。

## 確かめ方 {#verification}

導入が本当に済んでいて使える状態かを、`terminal` ツールから確かめます（ファイルは
`read_file` で読みます）。

1. `terminal(command="command -v agy")`
2. `terminal(command="agy --version")`
3. `terminal(command="agy help")`
4. `terminal(command="agy plugin list")`
5. `~/.gemini/antigravity-cli/settings.json` を `read_file` で読む
6. いちばん新しい `~/.gemini/antigravity-cli/log/cli-*.log` を `read_file` で読む
7. 必要なら `~/.gemini/antigravity-cli/keybindings.json` を `read_file` で読む

## 付属のファイル {#support-files}

- `references/cli-docs.md` — 導入、使い方、機能の各資料から要点をまとめたものです。
