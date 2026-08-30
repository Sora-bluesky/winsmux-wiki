---
title: "Claude Code — Claude Code CLI にコーディングを任せる（機能追加、PR）"
description: "Claude Code CLI にコーディングを任せる（機能追加、PR）"
upstream_path: user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-claude-code.md
upstream_blob: a46b7045def4678b993c3cb725874c47f20fe058
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-claude-code
---

# Claude Code {#claude-code}

Claude Code CLI にコーディングを任せます（機能追加、PR）。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/autonomous-ai-agents\claude-code` |
| バージョン | `2.2.1` |
| 作者 | Hermes Agent + Teknium |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Coding-Agent`, `Claude`, `Anthropic`, `Code-Review`, `Refactoring`, `PTY`, `Automation` |
| 関連 skill | [`codex`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-codex/), [`hermes-agent`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-hermes-agent/), [`opencode`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-opencode/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Claude Code — Hermes からの動かし方 {#claude-code-hermes-orchestration-guide}

Hermes のターミナル経由で、[Claude Code](https://code.claude.com/docs/en/cli-reference)（Anthropic が作った自律型のコーディングエージェント CLI）にコーディングを任せます。Claude Code v2.x は、ファイルを読み、コードを書き、シェルコマンドを実行し、サブエージェントを立ち上げ、git の作業まで自分で進められます。

## 事前に必要なもの {#prerequisites}

- **インストール:** `npm install -g @anthropic-ai/claude-code`
- **認証:** 一度 `claude` を実行してログインします（Pro / Max ならブラウザでの OAuth、そうでなければ `ANTHROPIC_API_KEY` を設定します）
- **コンソール経由の認証:** API キーで課金する場合は `claude auth login --console`
- **SSO 認証:** Enterprise では `claude auth login --sso`
- **状態の確認:** `claude auth status`（JSON で返ります）または `claude auth status --text`（人が読みやすい形）
- **健全性チェック:** `claude doctor` — 自動更新とインストール状態を確かめます
- **バージョンの確認:** `claude --version`（v2.x 以上が必要です）
- **更新:** `claude update` または `claude upgrade`

## 動かし方は 2 通り {#two-orchestration-modes}

Hermes から Claude Code を動かす方法は、根本的に異なる 2 通りがあります。作業の内容で選んでください。

### 方法 1: プリントモード（`-p`）— 対話なし（たいていの作業ではこちらがおすすめ） {#mode-1-print-mode--p-non-interactive-preferred-for-most-tasks}

プリントモードは、ひとつの作業を実行して結果を返し、そのまま終了します。PTY も対話的な確認も要りません。組み込むならこれがいちばん素直です。

```
terminal(command="claude -p 'Add error handling to all API calls in src/' --allowedTools 'Read,Edit' --max-turns 10", workdir="/path/to/project", timeout=120)
```

**プリントモードが向く場面:**
- 一回で終わる作業（バグ修正、機能追加、書き直し）
- CI/CD の自動化やスクリプト
- `--json-schema` を使った構造化データの取り出し
- パイプで渡した入力の処理（`cat file | claude -p "analyze this"`）
- 何往復もやり取りする必要がない作業すべて

**プリントモードでは対話的なダイアログがすべて出ません。** 作業ディレクトリを信頼するかの確認も、権限の確認も出ないので、自動化に向いています。

### 方法 2: tmux 越しの対話モード — 何往復もするセッション {#mode-2-interactive-pty-via-tmux-multi-turn-sessions}

対話モードでは会話型の REPL が立ち上がり、追加の指示を送り、スラッシュコマンドを使い、Claude の作業の様子をその場で見られます。**tmux での制御が必要です。**

```
# Start a tmux session
terminal(command="tmux new-session -d -s claude-work -x 140 -y 40")

# Launch Claude Code inside it
terminal(command="tmux send-keys -t claude-work 'cd /path/to/project && claude' Enter")

# Wait for startup, then send your task
# (after ~3-5 seconds for the welcome screen)
terminal(command="sleep 5 && tmux send-keys -t claude-work 'Refactor the auth module to use JWT tokens' Enter")

# Monitor progress by capturing the pane
terminal(command="sleep 15 && tmux capture-pane -t claude-work -p -S -50")

# Send follow-up tasks
terminal(command="tmux send-keys -t claude-work 'Now add unit tests for the new JWT code' Enter")

# Exit when done
terminal(command="tmux send-keys -t claude-work '/exit' Enter")
```

**対話モードが向く場面:**
- 何度も往復する作業（書き直す → 見直す → 直す → テストする、の繰り返し）
- 人の判断をはさむ必要がある作業
- 手探りで進めるコーディング
- Claude のスラッシュコマンド（`/compact`、`/review`、`/model`）を使いたいとき

## PTY のダイアログへの対処（対話モードでは特に重要） {#pty-dialog-handling-critical-for-interactive-mode}

Claude Code は最初の起動時に、最大 2 つの確認ダイアログを出します。これらは tmux の send-keys で処理する必要があります。

### ダイアログ 1: 作業ディレクトリの信頼（そのディレクトリで初回のみ） {#dialog-1-workspace-trust-first-visit-to-a-directory}
```
❯ 1. Yes, I trust this folder    ← DEFAULT (just press Enter)
  2. No, exit
```
**対処:** `tmux send-keys -t <session> Enter` — 最初から選ばれている項目で正解です。

### ダイアログ 2: 権限のスキップに関する警告（--dangerously-skip-permissions のときだけ） {#dialog-2-bypass-permissions-warning-only-with---dangerously-skip-permissions}
```
❯ 1. No, exit                    ← DEFAULT (WRONG choice!)
  2. Yes, I accept
```
**対処:** 先に下へ移動してから Enter を押します。
```
tmux send-keys -t <session> Down && sleep 0.3 && tmux send-keys -t <session> Enter
```

### 取りこぼしのないダイアログ処理 {#robust-dialog-handling-pattern}
```
# Launch with permissions bypass
terminal(command="tmux send-keys -t claude-work 'claude --dangerously-skip-permissions \"your task\"' Enter")

# Handle trust dialog (Enter for default "Yes")
terminal(command="sleep 4 && tmux send-keys -t claude-work Enter")

# Handle permissions dialog (Down then Enter for "Yes, I accept")
terminal(command="sleep 3 && tmux send-keys -t claude-work Down && sleep 0.3 && tmux send-keys -t claude-work Enter")

# Now wait for Claude to work
terminal(command="sleep 15 && tmux capture-pane -t claude-work -p -S -60")
```

**補足:** そのディレクトリで一度信頼を許可すれば、信頼のダイアログは二度と出ません。`--dangerously-skip-permissions` を使うときだけ、権限のダイアログが毎回出ます。

## CLI のサブコマンド {#cli-subcommands}

| サブコマンド | 用途 |
|------------|---------|
| `claude` | 対話的な REPL を起動します |
| `claude "query"` | 最初の指示を渡して REPL を起動します |
| `claude -p "query"` | プリントモード（対話なし。終わったら終了します） |
| `cat file \| claude -p "query"` | 標準入力から内容を渡します |
| `claude -c` | このディレクトリでの直近の会話を再開します |
| `claude -r "id"` | ID か名前を指定して特定のセッションを再開します |
| `claude auth login` | サインインします（API 課金なら `--console`、Enterprise なら `--sso` を足します） |
| `claude auth status` | ログイン状態を確認します（JSON で返ります。`--text` で人が読みやすい形になります） |
| `claude mcp add <name> -- <cmd>` | MCP サーバーを追加します |
| `claude mcp list` | 設定済みの MCP サーバーを一覧します |
| `claude mcp remove <name>` | MCP サーバーを削除します |
| `claude agents` | 設定済みのエージェントを一覧します |
| `claude doctor` | インストール状態と自動更新をチェックします |
| `claude update` / `claude upgrade` | Claude Code を最新版に更新します |
| `claude remote-control` | claude.ai やモバイルアプリから操作するためのサーバーを起動します |
| `claude install [target]` | ネイティブ版を入れます（stable、latest、バージョン指定） |
| `claude setup-token` | 長期間使える認証トークンを用意します（サブスクリプションが必要です） |
| `claude plugin` / `claude plugins` | Claude Code のプラグインを管理します |
| `claude auto-mode` | 自動モードの分類設定を確認します |

## プリントモードを詳しく {#print-mode-deep-dive}

### 構造化された JSON 出力 {#structured-json-output}
```
terminal(command="claude -p 'Analyze auth.py for security issues' --output-format json --max-turns 5", workdir="/project", timeout=120)
```

次のような JSON オブジェクトが返ります。
```json
{
  "type": "result",
  "subtype": "success",
  "result": "The analysis text...",
  "session_id": "75e2167f-...",
  "num_turns": 3,
  "total_cost_usd": 0.0787,
  "duration_ms": 10276,
  "stop_reason": "end_turn",
  "terminal_reason": "completed",
  "usage": { "input_tokens": 5, "output_tokens": 603, ... },
  "modelUsage": { "claude-sonnet-4-6": { "costUSD": 0.078, "contextWindow": 200000 } }
}
```

**主なフィールド:** 再開に使う `session_id`、エージェントのループ回数を示す `num_turns`、費用を追う `total_cost_usd`、成否を見分ける `subtype`（`success`、`error_max_turns`、`error_budget`）。

### JSON のストリーミング出力 {#streaming-json-output}
生成中のトークンをその場で受け取りたいときは、`stream-json` に `--verbose` を添えて使います。
```
terminal(command="claude -p 'Write a summary' --output-format stream-json --verbose --include-partial-messages", timeout=60)
```

改行区切りの JSON イベントが返ります。テキストだけを流したいときは jq で絞り込みます。
```
claude -p "Explain X" --output-format stream-json --verbose --include-partial-messages | \
  jq -rj 'select(.type == "stream_event" and .event.delta.type? == "text_delta") | .event.delta.text'
```

イベントには `system/api_retry` も含まれ、`attempt`、`max_retries`、`error`（`rate_limit` や `billing_error` など）が入ります。

### 双方向のストリーミング {#bidirectional-streaming}
入力と出力の両方をその場でやり取りしたいときは次のようにします。
```
claude -p "task" --input-format stream-json --output-format stream-json --replay-user-messages
```
`--replay-user-messages` は、受け取りを確認できるように、こちらのメッセージを標準出力へ返します。

### パイプで渡す入力 {#piped-input}
```
# Pipe a file for analysis
terminal(command="cat src/auth.py | claude -p 'Review this code for bugs' --max-turns 1", timeout=60)

# Pipe multiple files
terminal(command="cat src/*.py | claude -p 'Find all TODO comments' --max-turns 1", timeout=60)

# Pipe command output
terminal(command="git diff HEAD~3 | claude -p 'Summarize these changes' --max-turns 1", timeout=60)
```

### JSON スキーマで形を決めて取り出す {#json-schema-for-structured-extraction}
```
terminal(command="claude -p 'List all functions in src/' --output-format json --json-schema '{\"type\":\"object\",\"properties\":{\"functions\":{\"type\":\"array\",\"items\":{\"type\":\"string\"}}},\"required\":[\"functions\"]}' --max-turns 5", workdir="/project", timeout=90)
```

返ってきた JSON の `structured_output` を読み取ります。Claude は返す前に、出力がスキーマに合っているかを検証します。

### セッションの続き {#session-continuation}
```
# Start a task
terminal(command="claude -p 'Start refactoring the database layer' --output-format json --max-turns 10 > /tmp/session.json", workdir="/project", timeout=180)

# Resume with session ID
terminal(command="claude -p 'Continue and add connection pooling' --resume $(cat /tmp/session.json | python -c 'import json,sys; print(json.load(sys.stdin)[\"session_id\"])') --max-turns 5", workdir="/project", timeout=120)

# Or resume the most recent session in the same directory
terminal(command="claude -p 'What did you do last time?' --continue --max-turns 1", workdir="/project", timeout=30)

# Fork a session (new ID, keeps history)
terminal(command="claude -p 'Try a different approach' --resume <id> --fork-session --max-turns 10", workdir="/project", timeout=120)
```

### CI やスクリプト向けの bare モード {#bare-mode-for-ciscripting}
```
terminal(command="claude --bare -p 'Run all tests and report failures' --allowedTools 'Read,Bash' --max-turns 10", workdir="/project", timeout=180)
```

`--bare` はフック、プラグイン、MCP の探索、CLAUDE.md の読み込みをすべて飛ばします。起動がいちばん速いモードです。`ANTHROPIC_API_KEY` が必要です（OAuth を使いません）。

bare モードで必要なものだけ読み込みたいときは次のようにします。
| 読み込みたいもの | フラグ |
|---------|------|
| システムプロンプトへの追記 | `--append-system-prompt "text"` または `--append-system-prompt-file path` |
| 設定 | `--settings <file-or-json>` |
| MCP サーバー | `--mcp-config <file-or-json>` |
| 独自のエージェント | `--agents '<json>'` |

### 混み合ったときの代替モデル {#fallback-model-for-overload}
```
terminal(command="claude -p 'task' --fallback-model haiku --max-turns 5", timeout=90)
```
既定のモデルが混み合っているとき、指定したモデルへ自動的に切り替えます（プリントモードのみ）。

## CLI フラグ一覧 {#complete-cli-flags-reference}

### セッションと環境 {#session-environment}
| フラグ | はたらき |
|------|--------|
| `-p, --print` | 対話なしで一回だけ実行します（終わったら終了します） |
| `-c, --continue` | 現在のディレクトリでの直近の会話を再開します |
| `-r, --resume <id>` | ID か名前でセッションを再開します（ID を省くと選択画面が出ます） |
| `--fork-session` | 再開時に、元の ID を使わず新しいセッション ID を作ります |
| `--session-id <uuid>` | 会話に使う UUID を指定します |
| `--no-session-persistence` | セッションをディスクに保存しません（プリントモードのみ） |
| `--add-dir <paths...>` | 作業ディレクトリを追加で使えるようにします |
| `-w, --worktree [name]` | `.claude/worktrees/<name>` に隔離した git worktree を作って実行します |
| `--tmux` | worktree 用の tmux セッションを作ります（`--worktree` が必要です） |
| `--ide` | 起動時に、使える IDE へ自動接続します |
| `--chrome` / `--no-chrome` | Web の動作確認に使う Chrome 連携を有効・無効にします |
| `--from-pr [number]` | GitHub の特定の PR に紐づいたセッションを再開します |
| `--file <specs...>` | 起動時に取得するファイル（書式: `file_id:relative_path`） |

### モデルと性能 {#model-performance}
| フラグ | はたらき |
|------|--------|
| `--model <alias>` | 使うモデル: `sonnet`、`opus`、`haiku`、または `claude-sonnet-4-6` のような正式名 |
| `--effort <level>` | 推論の深さ: `low`、`medium`、`high`、`xhigh`、`max` |
| `--max-turns <n>` | エージェントのループ回数を制限します（プリントモードのみ。暴走を防ぎます） |
| `--max-budget-usd <n>` | API の利用額に上限をかけます（プリントモードのみ） |
| `--fallback-model <model>` | 既定のモデルが混み合ったときに自動で切り替えます（プリントモードのみ） |
| `--betas <betas...>` | API リクエストに付けるベータヘッダー（API キー利用時のみ） |

### 権限と安全 {#permission-safety}
| フラグ | はたらき |
|------|--------|
| `--dangerously-skip-permissions` | ツールの使用をすべて自動承認します（ファイル書き込み、bash、ネットワークなど） |
| `--allow-dangerously-skip-permissions` | スキップを *選択肢として* 使えるようにします。既定では有効にしません |
| `--permission-mode <mode>` | `default`、`acceptEdits`、`plan`、`auto`、`dontAsk`、`bypassPermissions` |
| `--allowedTools <tools...>` | 使ってよいツールを列挙します（カンマまたはスペース区切り） |
| `--disallowedTools <tools...>` | 使わせないツールを列挙します |
| `--tools <tools...>` | 組み込みのツール一式を差し替えます（`""` は無し、`"default"` は全部、あるいはツール名） |

### 入出力の形式 {#output-input-format}
| フラグ | はたらき |
|------|--------|
| `--output-format <fmt>` | `text`（既定）、`json`（結果がひとつのオブジェクト）、`stream-json`（改行区切り） |
| `--input-format <fmt>` | `text`（既定）または `stream-json`（入力をその場で流し込みます） |
| `--json-schema <schema>` | スキーマに合った JSON を出力させます |
| `--verbose` | やり取りを一往復ずつすべて出します |
| `--include-partial-messages` | 届いた分から部分的なメッセージも出します（stream-json とプリントモードの組み合わせ） |
| `--replay-user-messages` | こちらのメッセージを標準出力へ返します（stream-json の双方向利用） |

### システムプロンプトと文脈 {#system-prompt-context}
| フラグ | はたらき |
|------|--------|
| `--append-system-prompt <text>` | 既定のシステムプロンプトに **追記** します（組み込みの能力はそのまま残ります） |
| `--append-system-prompt-file <path>` | ファイルの中身を既定のシステムプロンプトに **追記** します |
| `--system-prompt <text>` | システムプロンプト全体を **置き換え** ます（ふだんは追記のほうを使ってください） |
| `--system-prompt-file <path>` | システムプロンプトをファイルの中身で **置き換え** ます |
| `--bare` | フック、プラグイン、MCP の探索、CLAUDE.md、OAuth を飛ばします（起動が最速です） |
| `--agents '<json>'` | 独自のサブエージェントを JSON でその場で定義します |
| `--mcp-config <path>` | JSON ファイルから MCP サーバーを読み込みます（複数回指定できます） |
| `--strict-mcp-config` | `--mcp-config` で指定した MCP サーバーだけを使い、他の設定を無視します |
| `--settings <file-or-json>` | JSON ファイルか、その場で書いた JSON から設定を追加で読み込みます |
| `--setting-sources <sources>` | 読み込む設定元をカンマ区切りで指定します: `user`、`project`、`local` |
| `--plugin-dir <paths...>` | このセッションに限り、指定ディレクトリからプラグインを読み込みます |
| `--disable-slash-commands` | skill とスラッシュコマンドをすべて無効にします |

### デバッグ {#debugging}
| フラグ | はたらき |
|------|--------|
| `-d, --debug [filter]` | デバッグログを出します。カテゴリで絞り込めます（例: `"api,hooks"`、`"!1p,!file"`） |
| `--debug-file <path>` | デバッグログをファイルに書き出します（指定するとデバッグモードになります） |

### エージェントチーム {#agent-teams}
| フラグ | はたらき |
|------|--------|
| `--teammate-mode <mode>` | エージェントチームの表示方法: `auto`、`in-process`、`tmux` |
| `--brief` | ユーザーへ話しかけるための `SendUserMessage` ツールを有効にします |

### --allowedTools / --disallowedTools でのツール名の書き方 {#tool-name-syntax-for---allowedtools---disallowedtools}
```
Read                    # All file reading
Edit                    # File editing (existing files)
Write                   # File creation (new files)
Bash                    # All shell commands
Bash(git *)             # Only git commands
Bash(git commit *)      # Only git commit commands
Bash(npm run lint:*)    # Pattern matching with wildcards
WebSearch               # Web search capability
WebFetch                # Web page fetching
mcp__<server>__<tool>   # Specific MCP tool
```

## 設定 {#settings-configuration}

### 設定の優先順位（高いものから） {#settings-hierarchy-highest-to-lowest-priority}
1. **CLI のフラグ** — すべてに優先します
2. **プロジェクト内の個人設定:** `.claude/settings.local.json`（個人用。git 管理外）
3. **プロジェクト:** `.claude/settings.json`（共有。git 管理下）
4. **ユーザー:** `~/.claude/settings.json`（全体）

### 設定ファイルでの権限指定 {#permissions-in-settings}
```json
{
  "permissions": {
    "allow": ["Bash(npm run lint:*)", "WebSearch", "Read"],
    "ask": ["Write(*.ts)", "Bash(git push*)"],
    "deny": ["Read(.env)", "Bash(rm -rf *)"]
  }
}
```

### メモリファイル（CLAUDE.md）の優先順位 {#memory-files-claudemd-hierarchy}
1. **全体:** `~/.claude/CLAUDE.md` — すべてのプロジェクトに効きます
2. **プロジェクト:** `./CLAUDE.md` — そのプロジェクト固有の文脈（git 管理下）
3. **個人:** `.claude/CLAUDE.local.md` — そのプロジェクトでの個人的な上書き（git 管理外）

対話モードでは、先頭に `#` を付けると手早くメモリへ追記できます（例: `# Always use 2-space indentation`）。

## 対話セッション: スラッシュコマンド {#interactive-session-slash-commands}

### セッションと文脈 {#session-context}
| コマンド | 用途 |
|---------|---------|
| `/help` | コマンドを一覧します（独自のものや MCP のものも含みます） |
| `/compact [focus]` | 文脈を圧縮してトークンを節約します。CLAUDE.md は圧縮後も残ります。例: `/compact focus on auth logic` |
| `/clear` | 会話の履歴を消して仕切り直します |
| `/context` | 文脈の使用量を色分けした格子で見せ、削るヒントを出します |
| `/cost` | トークンの使用量を、モデル別・キャッシュ命中別に見せます |
| `/resume` | 別のセッションに切り替える、または再開します |
| `/rewind` | 会話やコードを、前のチェックポイントまで巻き戻します |
| `/btw <question>` | 文脈のコストを増やさずに、脇道の質問をします |
| `/status` | バージョン、接続状態、セッションの情報を見せます |
| `/todos` | 会話から拾った作業項目を一覧します |
| `/exit` または `Ctrl+D` | セッションを終了します |

### 開発とレビュー {#development-review}
| コマンド | 用途 |
|---------|---------|
| `/review` | いまの変更にコードレビューを求めます |
| `/security-review` | いまの変更をセキュリティの観点で調べます |
| `/plan [description]` | 作業の計画を立てるため、自動開始つきの計画モードに入ります |
| `/loop [interval]` | セッション内で作業を定期的に繰り返します |
| `/batch` | 大きな並行作業のために worktree を自動で作ります（5〜30 個） |

### 設定とツール {#configuration-tools}
| コマンド | 用途 |
|---------|---------|
| `/model [model]` | セッションの途中でモデルを切り替えます（矢印キーで推論の深さも調整できます） |
| `/effort [level]` | 推論の深さを決めます: `low`、`medium`、`high`、`xhigh`、`max` |
| `/init` | プロジェクトのメモリとして CLAUDE.md を作ります |
| `/memory` | CLAUDE.md を編集用に開きます |
| `/config` | 設定画面を対話的に開きます |
| `/permissions` | ツールの権限を確認・変更します |
| `/agents` | 専門のサブエージェントを管理します |
| `/mcp` | MCP サーバーを対話的に管理します |
| `/add-dir` | 作業ディレクトリを追加します（monorepo で便利です） |
| `/usage` | プランの上限と、利用制限の状況を見せます |
| `/voice` | 押しながら話す音声入力を有効にします（20 言語。Space を押しているあいだ録音し、離すと送信します） |
| `/release-notes` | バージョンごとのリリースノートを対話的に選んで読みます |

### 独自のスラッシュコマンド {#custom-slash-commands}
`.claude/commands/<name>.md`（プロジェクトで共有）または `~/.claude/commands/<name>.md`（個人用）を作ります。

```markdown
# .claude/commands/deploy.md
Run the deploy pipeline:
1. Run all tests
2. Build the Docker image
3. Push to registry
4. Update the $ARGUMENTS environment (default: staging)
```

使い方は `/deploy production` です。`$ARGUMENTS` は入力した内容に置き換わります。

### skill（ふつうの言葉で呼び出す） {#skills-natural-language-invocation}
手で呼ぶスラッシュコマンドとは違い、`.claude/skills/` に置いた skill は Markdown の手引きで、作業の内容が合致したときに Claude が自分で呼び出します。

```markdown
# .claude/skills/database-migration.md
When asked to create or modify database migrations:
1. Use Alembic for migration generation
2. Always create a rollback function
3. Test migrations against a local database copy
```

## 対話セッション: キーボードショートカット {#interactive-session-keyboard-shortcuts}

### 基本の操作 {#general-controls}
| キー | はたらき |
|-----|--------|
| `Ctrl+C` | 入力中の内容や生成を取り消します |
| `Ctrl+D` | セッションを終了します |
| `Ctrl+R` | コマンド履歴をさかのぼって検索します |
| `Ctrl+B` | 実行中の作業を裏へ回します |
| `Ctrl+V` | 画像を会話に貼り付けます |
| `Ctrl+O` | 記録表示。Claude の思考の流れを見られます |
| `Ctrl+G` または `Ctrl+X Ctrl+E` | 入力中の内容を外部エディタで開きます |
| `Esc Esc` | 会話やコードの状態を巻き戻す / 要約します |

### モードの切り替え {#mode-toggles}
| キー | はたらき |
|-----|--------|
| `Shift+Tab` | 権限モードを順に切り替えます（通常 → 自動承認 → 計画） |
| `Alt+P` | モデルを切り替えます |
| `Alt+T` | 思考モードを切り替えます |
| `Alt+O` | 高速モードを切り替えます |

### 複数行の入力 {#multiline-input}
| キー | はたらき |
|-----|--------|
| `\` + `Enter` | 手早く改行します |
| `Shift+Enter` | 改行（別の押し方） |
| `Ctrl+J` | 改行（別の押し方） |

### 入力の先頭に付ける記号 {#input-prefixes}
| 記号 | はたらき |
|--------|--------|
| `!` | AI を通さず bash を直接実行します（例: `!npm test`）。`!` だけを入力すると、シェルモードを切り替えます。 |
| `@` | ファイルやディレクトリを補完付きで参照します（例: `@./src/api/`） |
| `#` | CLAUDE.md のメモリへ手早く追記します（例: `# Use 2-space indentation`） |
| `/` | スラッシュコマンド |

### コツ:「ultrathink」 {#pro-tip-ultrathink}
指示のなかに「ultrathink」という語を入れると、その一往復だけ推論をいちばん深くできます。いま設定している `/effort` に関係なく、最も深く考えるモードになります。

## PR レビューのやり方 {#pr-review-pattern}

### 手早いレビュー（プリントモード） {#quick-review-print-mode}
```
terminal(command="cd /path/to/repo && git diff main...feature-branch | claude -p 'Review this diff for bugs, security issues, and style problems. Be thorough.' --max-turns 1", timeout=60)
```

### じっくりしたレビュー（対話モード + worktree） {#deep-review-interactive-worktree}
```
terminal(command="tmux new-session -d -s review -x 140 -y 40")
terminal(command="tmux send-keys -t review 'cd /path/to/repo && claude -w pr-review' Enter")
terminal(command="sleep 5 && tmux send-keys -t review Enter")  # Trust dialog
terminal(command="sleep 2 && tmux send-keys -t review 'Review all changes vs main. Check for bugs, security issues, race conditions, and missing tests.' Enter")
terminal(command="sleep 30 && tmux capture-pane -t review -p -S -60")
```

### PR 番号を指定してレビューする {#pr-review-from-number}
```
terminal(command="claude -p 'Review this PR thoroughly' --from-pr 42 --max-turns 10", workdir="/path/to/repo", timeout=120)
```

### tmux つきの Claude worktree {#claude-worktree-with-tmux}
```
terminal(command="claude -w feature-x --tmux", workdir="/path/to/repo")
```
`.claude/worktrees/feature-x` に隔離した git worktree を作り、あわせて tmux セッションも用意します。iTerm2 が使える環境ではそのネイティブのペインを使います。従来どおりの tmux にしたいときは `--tmux=classic` を足してください。

## Claude を並行して動かす {#parallel-claude-instances}

独立した作業を同時に走らせられます。

```
# Task 1: Fix backend
terminal(command="tmux new-session -d -s task1 -x 140 -y 40 && tmux send-keys -t task1 'cd ~/project && claude -p \"Fix the auth bug in src/auth.py\" --allowedTools \"Read,Edit\" --max-turns 10' Enter")

# Task 2: Write tests
terminal(command="tmux new-session -d -s task2 -x 140 -y 40 && tmux send-keys -t task2 'cd ~/project && claude -p \"Write integration tests for the API endpoints\" --allowedTools \"Read,Write,Bash\" --max-turns 15' Enter")

# Task 3: Update docs
terminal(command="tmux new-session -d -s task3 -x 140 -y 40 && tmux send-keys -t task3 'cd ~/project && claude -p \"Update README.md with the new API endpoints\" --allowedTools \"Read,Edit\" --max-turns 5' Enter")

# Monitor all
terminal(command="sleep 30 && for s in task1 task2 task3; do echo '=== '$s' ==='; tmux capture-pane -t $s -p -S -5 2>/dev/null; done")
```

## CLAUDE.md — プロジェクトの文脈を書くファイル {#claudemd-project-context-file}

Claude Code は、プロジェクトの直下にある `CLAUDE.md` を自動で読み込みます。プロジェクトの前提を書き残しておく場所です。

```markdown
# Project: My API

## Architecture
- FastAPI backend with SQLAlchemy ORM
- PostgreSQL database, Redis cache
- pytest for testing with 90% coverage target

## Key Commands
- `make test` — run full test suite
- `make lint` — ruff + mypy
- `make dev` — start dev server on :8000

## Code Standards
- Type hints on all public functions
- Docstrings in Google style
- 2-space indentation for YAML, 4-space for Python
- No wildcard imports
```

**具体的に書いてください。** 「良いコードを書くこと」ではなく、「JS はインデント 2 スペース」「テストのファイル名は `.test.ts` で終える」のように書きます。具体的な指示ほど、あとから直す手間が減ります。

### rules ディレクトリ（CLAUDE.md を分割する） {#rules-directory-modular-claudemd}
ルールが多いプロジェクトでは、巨大な CLAUDE.md ひとつではなく rules ディレクトリを使ってください。
- **プロジェクトのルール:** `.claude/rules/*.md` — チームで共有。git 管理下
- **個人のルール:** `~/.claude/rules/*.md` — 個人用で、全体に効きます

rules ディレクトリの `.md` は、それぞれ追加の文脈として読み込まれます。ひとつの CLAUDE.md に詰め込むより見通しがよくなります。

### 自動メモリ {#auto-memory}
Claude は、覚えたプロジェクトの前提を `~/.claude/projects/<project>/memory/` に自動で保存します。
- **上限:** プロジェクトごとに 25KB または 200 行
- これは CLAUDE.md とは別物で、セッションをまたいで貯まっていく Claude 自身のメモです

## 独自のサブエージェント {#custom-subagents}

専門のエージェントは `.claude/agents/`（プロジェクト）、`~/.claude/agents/`（個人）、または `--agents` フラグ（そのセッションだけ）で定義します。

### エージェントの置き場所と優先順位 {#agent-location-priority}
1. `.claude/agents/` — プロジェクト単位。チームで共有
2. `--agents` フラグ — そのセッション限り。その場で定義
3. `~/.claude/agents/` — ユーザー単位。個人用

### エージェントを作る {#creating-an-agent}
```markdown
# .claude/agents/security-reviewer.md
---
name: security-reviewer
description: Security-focused code review
model: opus
tools: [Read, Bash]
---
You are a senior security engineer. Review code for:
- Injection vulnerabilities (SQL, XSS, command injection)
- Authentication/authorization flaws
- Secrets in code
- Unsafe deserialization
```

呼び出し方は `@security-reviewer review the auth module` です。

### CLI からその場で定義する {#dynamic-agents-via-cli}
```
terminal(command="claude --agents '{\"reviewer\": {\"description\": \"Reviews code\", \"prompt\": \"You are a code reviewer focused on performance\"}}' -p 'Use @reviewer to check auth.py'", timeout=120)
```

複数のエージェントを束ねて動かすこともできます。「@db-expert にクエリを最適化させて、そのあと @security に変更を監査させて」といった具合です。

## フック — できごとに合わせて自動で動かす {#hooks-automation-on-events}

`.claude/settings.json`（プロジェクト）か `~/.claude/settings.json`（全体）で設定します。

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Write(*.py)",
      "hooks": [{"type": "command", "command": "ruff check --fix $CLAUDE_FILE_PATHS"}]
    }],
    "PreToolUse": [{
      "matcher": "Bash",
      "hooks": [{"type": "command", "command": "if echo \"$CLAUDE_TOOL_INPUT\" | grep -q 'rm -rf'; then echo 'Blocked!' && exit 2; fi"}]
    }],
    "Stop": [{
      "hooks": [{"type": "command", "command": "echo 'Claude finished a response' >> /tmp/claude-activity.log"}]
    }]
  }
}
```

### 8 種類のフック {#all-8-hook-types}
| フック | 発火するとき | よくある使い道 |
|------|--------------|------------|
| `UserPromptSubmit` | Claude が入力を処理する前 | 入力の検査、記録 |
| `PreToolUse` | ツールを実行する前 | 安全のための関門。危ないコマンドを止めます（exit 2 で中止） |
| `PostToolUse` | ツールが終わったあと | コードの自動整形、リンターの実行 |
| `Notification` | 権限の確認や入力待ちのとき | デスクトップ通知 |
| `Stop` | Claude が応答を終えたとき | 完了の記録、状態の更新 |
| `SubagentStop` | サブエージェントが終わったとき | エージェントの取りまとめ |
| `PreCompact` | 文脈のメモリが消される前 | セッションの記録を退避します |
| `SessionStart` | セッションが始まるとき | 開発の前提を読み込みます（例: `git status`） |

### フックで使える環境変数 {#hook-environment-variables}
| 変数 | 中身 |
|----------|---------|
| `CLAUDE_PROJECT_DIR` | いまのプロジェクトのパス |
| `CLAUDE_FILE_PATHS` | 変更対象のファイル |
| `CLAUDE_TOOL_INPUT` | ツールに渡された値（JSON） |

### 安全のためのフックの例 {#security-hook-examples}
```json
{
  "PreToolUse": [{
    "matcher": "Bash",
    "hooks": [{"type": "command", "command": "if echo \"$CLAUDE_TOOL_INPUT\" | grep -qE 'rm -rf|git push.*--force|:(){ :|:& };:'; then echo 'Dangerous command blocked!' && exit 2; fi"}]
  }]
}
```

## MCP との連携 {#mcp-integration}

データベース、API、各種サービスを扱う外部のツールサーバーを追加します。

```
# GitHub integration
terminal(command="claude mcp add -s user github -- npx @modelcontextprotocol/server-github", timeout=30)

# PostgreSQL queries
terminal(command="claude mcp add -s local postgres -- npx @anthropic-ai/server-postgres --connection-string postgresql://localhost/mydb", timeout=30)

# Puppeteer for web testing
terminal(command="claude mcp add puppeteer -- npx @anthropic-ai/server-puppeteer", timeout=30)
```

### MCP の適用範囲 {#mcp-scopes}
| フラグ | 適用範囲 | 保存先 |
|------|-------|---------|
| `-s user` | 全体（すべてのプロジェクト） | `~/.claude.json` |
| `-s local` | このプロジェクト（個人用） | `.claude/settings.local.json`（git 管理外） |
| `-s project` | このプロジェクト（チームで共有） | `.claude/settings.json`（git 管理下） |

### プリントモードや CI での MCP {#mcp-in-printci-mode}
```
terminal(command="claude --bare -p 'Query database' --mcp-config mcp-servers.json --strict-mcp-config", timeout=60)
```
`--strict-mcp-config` を付けると、`--mcp-config` で指定した以外の MCP サーバーをすべて無視します。

会話のなかから MCP のリソースを参照するときは `@github:issue://123` のように書きます。

### MCP の上限と調整 {#mcp-limits-tuning}
- **ツールの説明文:** サーバーごとに、ツールの説明とサーバーからの指示を合わせて 2KB まで
- **結果の大きさ:** 既定では上限があります。大きな出力が必要なときは `maxResultSizeChars` の注釈で **500K** 文字まで広げられます
- **出力トークン:** `export MAX_MCP_OUTPUT_TOKENS=50000` — MCP サーバーからの出力に上限をかけ、文脈があふれるのを防ぎます
- **通信方式:** `stdio`（ローカルのプロセス）、`http`（リモート）、`sse`（サーバー送信イベント）

## 対話セッションの様子を見る {#monitoring-interactive-sessions}

### 画面の状態を読む {#reading-the-tui-status}
```
# Periodic capture to check if Claude is still working or waiting for input
terminal(command="tmux capture-pane -t dev -p -S -10")
```

次の目印を見てください。
- 下部の `❯` = 入力待ちです（作業が終わったか、質問しています）
- `●` の行 = ツールを実行中です（読む、書く、コマンドを走らせる）
- `⏵⏵ bypass permissions on` = 権限モードを示す状態表示です
- `◐ medium · /effort` = 状態表示に出ている、いまの推論の深さです
- `ctrl+o to expand` = ツールの出力が省略されています（対話的に開けます）

### 文脈の余裕を見る {#context-window-health}
対話モードで `/context` を使うと、文脈の使用量が色分けされた格子で見られます。目安は次のとおりです。
- **&lt; 70%** — ふつうに動きます。精度も落ちません
- **70〜85%** — 精度が落ち始めます。`/compact` を検討してください
- **85% 超** — 事実に反する出力が出やすくなります。`/compact` か `/clear` を使ってください

## 環境変数 {#environment-variables}

| 変数 | はたらき |
|----------|--------|
| `ANTHROPIC_API_KEY` | 認証に使う API キー（OAuth の代わり） |
| `CLAUDE_CODE_EFFORT_LEVEL` | 既定の推論の深さ: `low`、`medium`、`high`、`max`、`auto` |
| `MAX_THINKING_TOKENS` | 思考に使うトークンの上限（`0` にすると思考を止めます） |
| `MAX_MCP_OUTPUT_TOKENS` | MCP サーバーからの出力の上限（既定は場合により異なります。例: `50000`） |
| `CLAUDE_CODE_NO_FLICKER=1` | 別画面での描画に切り替えて、ターミナルのちらつきをなくします |
| `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` | 安全のため、子プロセスから認証情報を取り除きます |

## 費用と速さのコツ {#cost-performance-tips}

1. **`--max-turns` を使う。** プリントモードで暴走を防ぎます。たいていの作業は 5〜10 から始めてください。
2. **`--max-budget-usd` を使う。** 費用の上限になります。ただしシステムプロンプトのキャッシュ生成だけで最低 $0.05 ほどかかります。
3. **簡単な作業には `--effort low` を使う**（速くて安く済みます）。込み入った推論には `high` か `max` を使います。
4. **CI やスクリプトでは `--bare` を使う。** プラグインやフックの探索にかかる時間を省けます。
5. **`--allowedTools` で必要なものだけに絞る**（レビューなら `Read` だけ、など）。
6. **対話セッションで文脈が大きくなったら `/compact` を使う。**
7. **内容が分かっているファイルを分析させるだけなら、Claude に読ませずパイプで渡す。**
8. **簡単な作業には `--model haiku`**（安く済みます）、**込み入った多段の作業には `--model opus`** を使います。
9. **プリントモードでは `--fallback-model haiku` を使う。** モデルが混み合ったときも止まらずに済みます。
10. **別の作業は別のセッションで始める。** セッションは 5 時間もつので、文脈が新しいほうが効率的です。
11. **CI では `--no-session-persistence` を使う。** 保存されたセッションがディスクに溜まるのを防げます。

## つまずきやすいところ {#pitfalls-gotchas}

1. **対話モードには tmux が必須です。** Claude Code は全画面の TUI アプリです。Hermes のターミナルで `pty=true` だけでも動きますが、tmux なら `capture-pane` で様子を見られ、`send-keys` で入力を送れます。制御にはこれが欠かせません。
2. **`--dangerously-skip-permissions` のダイアログは「No, exit」が最初に選ばれています。** 受け入れるには下へ移動してから Enter を送ってください。プリントモード（`-p`）ならこのダイアログ自体が出ません。
3. **`--max-budget-usd` の下限はおよそ $0.05 です。** システムプロンプトのキャッシュ生成だけでこれくらいかかるため、それより低くするとすぐエラーになります。
4. **`--max-turns` はプリントモード専用です。** 対話セッションでは無視されます。
5. **Claude が `python` ではなく `python` を使うことがあります。** `python` へのシンボリックリンクがない環境では、Claude の bash コマンドが最初は失敗しますが、Claude が自分で直します。
6. **セッションを再開するには同じディレクトリにいる必要があります。** `--continue` は、いまの作業ディレクトリでの直近のセッションを探します。
7. **`--json-schema` には十分な `--max-turns` が要ります。** 構造化された出力を作る前にファイルを読む必要があり、何往復かかかるためです。
8. **信頼のダイアログはディレクトリごとに一度だけです。** 初回のあとは記録され、二度と出ません。
9. **裏で動く tmux セッションは残り続けます。** 終わったら `tmux kill-session -t <name>` で必ず片付けてください。
10. **`/commit` のようなスラッシュコマンドは対話モードでしか動きません。** `-p` では、やりたいことをふつうの言葉で書いてください。
11. **`--bare` は OAuth を飛ばします。** `ANTHROPIC_API_KEY` の環境変数か、設定の `apiKeyHelper` が必要です。
12. **文脈が増えると質は本当に落ちます。** 文脈の使用量が 7 割を超えたあたりから、出力の質は測れるほど下がります。`/context` で見ながら、早めに `/compact` してください。

## Hermes のエージェント向けのルール {#rules-for-hermes-agents}

1. **単発の作業にはプリントモード（`-p`）を優先します** — 素直で、ダイアログの処理も要らず、出力の形も決まります
2. **何往復もする作業には tmux を使います** — TUI を確実に制御できる唯一の方法です
3. **`workdir` を必ず指定します** — Claude を正しいプロジェクトのディレクトリに留めます
4. **プリントモードでは `--max-turns` を設定します** — 無限ループと費用の暴走を防ぎます
5. **tmux セッションの様子を見ます** — `tmux capture-pane -t <session> -p -S -50` で進み具合を確認します
6. **`❯` のプロンプトを探します** — Claude が入力待ちであること（終わったか、質問していること）を示します
7. **tmux セッションを片付けます** — 終わったら終了させ、資源の残留を防ぎます
8. **結果をユーザーに報告します** — 終わったら、Claude が何をして何が変わったかをまとめます
9. **遅いセッションを止めないでください** — 多段の作業をしている最中かもしれません。まず進み具合を見てください
10. **`--allowedTools` を使います** — その作業に本当に必要な範囲だけに絞ります
