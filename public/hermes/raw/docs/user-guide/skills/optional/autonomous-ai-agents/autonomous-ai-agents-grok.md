---
title: "Grok — xAI の Grok Build CLI にコーディングを任せる（機能追加、PR）"
description: "xAI の Grok Build CLI にコーディングを任せる（機能追加、PR）"
upstream_path: user-guide/skills/optional/autonomous-ai-agents/autonomous-ai-agents-grok.md
upstream_blob: a51590f761ad635dcf30cfd0ee1cb2d1be19e023
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/autonomous-ai-agents/autonomous-ai-agents-grok
---

# Grok {#grok}

xAI の Grok Build CLI にコーディングを任せます（機能追加、PR）。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加 skill — `hermes skills install official/autonomous-ai-agents/grok` で入れます |
| パス | `optional-skills/autonomous-ai-agents/grok` |
| バージョン | `0.1.1` |
| 作者 | Matt Maximo (MattMaximo), Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Coding-Agent`, `Grok`, `xAI`, `Code-Review`, `Refactoring`, `Automation` |
| 関連 skill | [`codex`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-codex/), [`claude-code`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-claude-code/), [`hermes-agent`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-hermes-agent/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Grok Build CLI — Hermes からの動かし方 {#grok-build-cli-hermes-orchestration-guide}

Hermes のターミナル経由で、[Grok Build](https://docs.x.ai/build/overview)（xAI が
作った自律型のコーディングエージェント CLI、`grok` コマンド）にコーディングを
任せます。Grok はファイルを読み、コードを書き、シェルコマンドを実行し、サブ
エージェントを立ち上げ、git の作業も進められます。動かし方は三通りあります。
対話型の TUI、**ヘッドレス**（`-p`）、そして JSON-RPC 経由の **ACP エージェント** です。

これは `codex`、`claude-code` に続く三番目の兄弟にあたります。動かし方の型は
ほぼ同じで、**一回で終わる作業にはヘッドレスの `-p` が向いています**。対話が
続くセッションでは PTY を使ってください。

## こんなときに使います {#when-to-use}

- 機能を作るとき
- コードを書き直すとき
- PR をレビューするとき
- Issue をまとめて片付けるとき
- ふだんなら Codex や Claude Code に任せるところを、Grok にやらせたいとき

## 事前に必要なもの {#prerequisites}

- **インストール（推奨）:** `npm install -g @xai-official/grok`
  - 公式のインストーラ `curl -fsSL https://x.ai/cli/install.sh | bash` でも入りますが、
    環境によっては `x.ai` のホストが Cloudflare で遮られます。npm 経由なら
    そこに依存せずに済みます。
- **認証 — SuperGrok / X Premium+ の契約を使う方法（こちらが基本）:**
  - `grok login` を一度実行すると、ブラウザが開いて OAuth になり、トークンが
    `~/.grok/auth.json` に保存されます。ここでは **SuperGrok または X Premium+** の
    契約を使うので、トークン単位の API 課金は発生しません。
  - サインインできているかどうかは `~/.grok/auth.json` の有無で確認するか、
    軽いヘッドレスの動作確認を実行してください: `grok --no-auto-update -p "Say ok."`
  - TUI では `/logout` でサインアウト、`/login`（または起動しなおし）でサインインします。
- **git リポジトリは不要** — Codex とは違い、Grok は git ディレクトリの外でも
  問題なく動きます（使い捨ての作業に向いています）。
- **Claude Code / AGENTS.md と設定なしでそのまま噛み合います** — Grok は
  `CLAUDE.md`、`.claude/`（skill、エージェント、MCP、hook、ルール）、
  `AGENTS.md` 系のファイルを自動で読みます。既存のプロジェクトの前提が
  そのまま効きます。

> **API キーを使う代替手段（この利用者向けの既定ではありません）:** Grok は
> `XAI_API_KEY` 環境変数を設定して、`api.x.ai` 経由の従量課金で使うこともできます。
> ただしこれは
> `grok login` や SuperGrok の認証が使えないときだけにしてください。ここで
> 想定しているのは契約を使う方法（`grok login`）です。

## 二つの動かし方 {#two-orchestration-modes}

### 方法 1: ヘッドレス（`-p`）— 対話なしで動かす（おすすめ） {#mode-1-headless--p-non-interactive-preferred}

作業を一回だけ実行し、結果を表示して終了します。PTY も要らず、対話の画面を
操作する必要もありません。いちばん素直な使い方で、`claude -p` や `codex exec` に
あたります。

```
terminal(command="grok --no-auto-update -p 'Add a dark mode toggle to settings'", workdir="/path/to/project", timeout=180)
```

自動実行では常に `--no-auto-update` を付けて、裏側の更新チェックを止めてください。

**ヘッドレスが向く場面:**
- 一回で終わるコーディング作業（バグ修正、機能追加、書き直し）
- CI/CD の自動化やスクリプト
- `--output-format json` で構造化された出力を受け取って処理するとき
- 何度もやりとりする必要がない作業

### 方法 2: 対話型の PTY — TUI で何度もやりとりする {#mode-2-interactive-pty-multi-turn-tui-sessions}

TUI は画面全体を使う、マウス操作もできるアプリです。`pty=true` で動かします。
安定して監視・入力するには tmux を使ってください（`claude-code` skill と同じ型です）。

```
# Launch in a tmux session for capture-pane monitoring
terminal(command="tmux new-session -d -s grok-work -x 140 -y 40")
terminal(command="tmux send-keys -t grok-work 'cd /path/to/project && grok' Enter")

# Wait for startup, then send a task
terminal(command="sleep 5 && tmux send-keys -t grok-work 'Refactor the auth module to use JWT' Enter")

# Monitor progress
terminal(command="sleep 15 && tmux capture-pane -t grok-work -p -S -50")

# Exit when done
terminal(command="tmux send-keys -t grok-work '/quit' Enter && sleep 1 && tmux kill-session -t grok-work")
```

**TUI の見た目のまま行内に出したいとき:** 画面全体を乗っ取る表示なしで TUI 風の
出力がほしい場合（ログを読みやすくしたいときなど）は `--no-alt-screen` を付けます。
純粋な自動化であれば、やはりヘッドレスの `-p` のほうがすっきりします。

## ヘッドレスをもう少し詳しく {#headless-deep-dive}

### よく使うフラグ {#common-flags}

| フラグ | 効果 |
|------|------|
| `-p, --single <PROMPT>` | プロンプトを一つ送り、ヘッドレスで実行して終了します |
| `-m, --model <MODEL>` | モデルを選びます |
| `-s, --session-id <UUID>` | 新しい会話に **新規の** 有効な UUID を割り当てます（既存のものは使えません）。再開は**しません** — 再開には `--resume` / `--continue` を使ってください。`--resume` / `--continue` と一緒に使えるのは `--fork-session` を付けたときだけです |
| `-r, --resume [<UUID>]` | 既存のセッションを UUID で再開します（省略すると直近のもの） |
| `-c, --continue` | 現在のディレクトリで直近のセッションを続けます |
| `--fork-session` | 再開するときに、元の ID を使わず新しいセッション ID を作ります |
| `--max-turns <N>` | エージェントのターン数に上限を設けます |
| `--cwd <PATH>` | 作業ディレクトリを指定します |
| `--output-format <FMT>` | `plain`（既定）、`json`、`streaming-json` |
| `--always-approve` | ツールの実行をすべて自動で承認します（`--full-auto` / `--yolo` にあたります） |
| `--no-alt-screen` | 行内で実行し、画面全体を使う TUI にしません |
| `--no-auto-update` | 裏側の更新チェックを止めます（自動実行では必ず付けてください。`--help` には出ませんが動きます） |

### 出力の形式 {#output-formats}

- `plain` — 人が読む形のテキスト（既定）
- `json` — 実行の最後に JSON オブジェクトを一つ出します（結果をきれいに処理できます）
- `streaming-json` — 改行区切りの JSON イベントを、届いた順に出します

```
# Structured result for parsing
terminal(command="grok --no-auto-update -p 'List all TODO comments in src/' --output-format json", workdir="/project", timeout=120)

# Auto-approve for autonomous building
terminal(command="grok --no-auto-update --always-approve -p 'Refactor the database layer and run the tests'", workdir="/project", timeout=300)
```

### バックグラウンド実行（長い作業） {#background-mode-long-tasks}

```
# Start headless in background
terminal(command="grok --no-auto-update --always-approve -p 'Refactor the auth module'", workdir="/project", background=true, notify_on_complete=true)
# Returns session_id

# Monitor
process(action="poll", session_id="<id>")
process(action="log", session_id="<id>")

# Kill if needed
process(action="kill", session_id="<id>")
```

対話型（TUI）のままバックグラウンドで動かしたいときは、`claude-code` や `codex`
skill とまったく同じように `pty=true` と tmux を使い、`tmux capture-pane` で
様子を見てください。

### セッションの続きから {#session-continuation}

セッションは名前ではなく **UUID** で管理されます。`--session-id` は新しい実行に
*新規の* UUID を割り当てるもので、再開は**しません**。`--resume` には既存の
セッションの UUID を渡します（値を省略すると直近のものを再開します）。

```
# Start a session with a self-assigned UUID (must be a valid, unused UUID)
SID=$(uuidgen)
terminal(command="grok --no-auto-update -s $SID -p 'Start refactoring the database layer' --always-approve", workdir="/project", timeout=240)

# Resume that exact session later by its UUID
terminal(command="grok --no-auto-update -r $SID -p 'Now add connection pooling' --always-approve", workdir="/project", timeout=180)

# Or just continue the most recent session in this directory (no UUID needed)
terminal(command="grok --no-auto-update -c -p 'What did you change last time?'", workdir="/project", timeout=60)
```

## 読むだけの点検から markdown のノートを作る型 {#read-only-audit-markdown-note-pattern}

手元のファイルを Grok に見てもらい、何も書き換えずにきれいな markdown の
ノートだけを受け取りたいとき（Obsidian やリポジトリに置く用）は次のようにします。

1. まず Hermes のツール（`read_file`、`write_file`）で、入力になるファイルを
   固めておきます。パスをそのまま渡すのではなく、関係する内容だけを一時
   ファイルに切り出してください。
2. `--always-approve` を **付けずに** ヘッドレスで実行して、勝手に書き込めない
   ようにし、`markdown only, no preamble` と指示します。
3. Grok の標準出力をそのまま `write_file()` で目的のノートに保存します。

```
grok --no-auto-update -p "Read /tmp/current.md and /tmp/inventory.md. Produce markdown only, no preamble. Output a clean note titled 'Cleanup Review'." --output-format plain
```

**気をつける点（Claude Code と同じです）:** 文書を書き直させるとき、「これを
書き直して」という緩い指示だと、全文ではなく変更点の要約が返ってくることが
あります。そうではなく、ファイルの中身を渡したうえで
`Return ONLY the full revised markdown document. No intro,
no explanation, no code fences. Start immediately with '# Title'.` と指示してください。
書き出し先を上書きする前に、`read_file()` で先頭の数行を確認しましょう。

## PR レビューの型 {#pr-review-patterns}

### さっと見てもらう（ヘッドレス） {#quick-review-headless}

```
terminal(command="cd /path/to/repo && git diff main...feature-branch | grok --no-auto-update -p 'Review this diff for bugs, security issues, and style problems. Be thorough.'", timeout=120)
```

### 一時ディレクトリに clone してレビューする（リポジトリを触らない安全な方法） {#clone-to-temp-review-safe-no-repo-mutation}

```
terminal(command="REVIEW=$(mktemp -d) && git clone https://github.com/user/repo.git $REVIEW && cd $REVIEW && gh pr checkout 42 && grok --no-auto-update -p 'Review the changes vs origin/main. Check bugs, security, race conditions, missing tests.'", pty=true, timeout=300)
```

### レビュー結果を投稿する {#post-the-review}

```
terminal(command="gh pr comment 42 --body '<review text>'", workdir="/path/to/repo")
```

## worktree を使って Issue を並行して直す {#parallel-issue-fixing-with-worktrees}

```
# Create worktrees
terminal(command="git worktree add -b fix/issue-78 /tmp/issue-78 main", workdir="~/project")
terminal(command="git worktree add -b fix/issue-99 /tmp/issue-99 main", workdir="~/project")

# Launch Grok headless in each (background)
terminal(command="grok --no-auto-update --always-approve -p 'Fix issue #78: <description>. Commit when done.'", workdir="/tmp/issue-78", background=true, notify_on_complete=true)
terminal(command="grok --no-auto-update --always-approve -p 'Fix issue #99: <description>. Commit when done.'", workdir="/tmp/issue-99", background=true, notify_on_complete=true)

# Monitor
process(action="list")

# After completion: push and open PRs
terminal(command="cd /tmp/issue-78 && git push -u origin fix/issue-78")
terminal(command="gh pr create --repo user/repo --head fix/issue-78 --title 'fix: ...' --body '...'")

# Cleanup
terminal(command="git worktree remove /tmp/issue-78", workdir="~/project")
```

## 便利なサブコマンドと TUI のコマンド {#useful-subcommands-tui-commands}

| コマンド | 用途 |
|---------|------|
| `grok` | 対話型の TUI を起動します |
| `grok -p "query"` | ヘッドレスで一回だけ実行します |
| `grok login` / `grok logout` | サインイン / サインアウト（SuperGrok / X Premium+ の OAuth） |
| `grok inspect` | Grok が作業ディレクトリで見つけたものを表示します。設定の出どころ、指示、skill、プラグイン、hook、MCP サーバー |
| `grok agent stdio` | JSON-RPC 経由の ACP エージェントとして動かします（IDE やツールとの連携用） |
| `grok update` | CLI を更新します（`x.ai` のホストが必要です。自動実行では使わないでください） |

TUI のスラッシュコマンド（対話時のみ）: `/model <name>`、`/always-approve`、
`/plan`、`/context`、`/compact`、`/resume`、`/sessions`、`/fork`、`/usage`、
`/quit`。`Shift+Tab` でセッションのモードを切り替えます（セッションの計画
ファイル以外への書き込みを止める Plan モードも含みます）。

## 設定（`~/.grok/config.toml`） {#config-grokconfigtoml}

```toml
[cli]
auto_update = false          # skip background update checks persistently

[ui]
permission_mode = "ask"      # or "always-approve" to skip tool prompts by default

[models]
default = "grok-build-0.1"
```

全体に効かせたい設定は、プロジェクトごとの `.grok/config.toml` ではなく
`~/.grok/config.toml` に置いてください。`permission_mode` は、古い
`approval_mode` / `yolo = true` より優先されます。

## つまずきやすいところ {#pitfalls-gotchas}

1. **認証には契約が要ります。** `grok login` には SuperGrok または X Premium+ の
   契約が必要です。ログインに失敗する、あるいは `~/.grok/auth.json` が無い
   場合は、`XAI_API_KEY` に切り替える前に契約が有効かどうかを確かめてください。
2. **Hermes 側の xAI 認証と `grok` CLI の認証を混同しないでください。** Hermes の
   `x_search` は Hermes 自身の xAI OAuth で動きます。単独の `grok` CLI は
   `~/.grok/auth.json` に別のトークンを持ちます。`x_search` が動いているからと
   いって、`grok` がログイン済みだとは限りません。
3. **自動実行では必ず `--no-auto-update` を付けてください** — 付けないと Grok が
   更新チェックのために外へ通信します（`x.ai` や `storage.googleapis.com` に
   つながらないこともあります）。
4. **curl のインストーラより npm を使ってください** — `npm install -g
   @xai-official/grok` なら、Cloudflare で遮られる `x.ai` のホストを避けられます。
5. **`--always-approve` が自律的に作らせるためのスイッチです。** これが無いと、
   ヘッドレスの実行がツールの承認待ちで止まることがあります。読むだけの
   レビューや点検では、Grok がファイルを書き換えられないよう、あえて外して
   ください。
6. **ヘッドレスの `-p` は TUI の画面を出しません**。TUI を使うときは
   `pty=true`（監視するなら tmux も）が要ります。Claude Code と同じです。
7. TUI を行内で動かしていて、画面全体を使う表示のせいで取得した出力が
   崩れるときは **`--no-alt-screen`** を使ってください。
8. **git リポジトリは不要**ですが、PR やコミットの作業では結局あったほうが
   よいので、使い捨てのコミット作業には `mktemp -d && git init` を使ってください。
9. 終わったら `tmux kill-session -t <name>` で **tmux のセッションを片付けて**ください。

## Hermes のエージェント向けのルール {#rules-for-hermes-agents}

1. 一つの作業なら **ヘッドレスの `-p` を選んでください** — いちばん素直で、
   `--output-format json` で構造化された出力も受け取れます。
2. Grok が正しいプロジェクトを見るよう、**`workdir`（または `--cwd`）を必ず
   指定してください**。
3. 自動で呼び出すときは毎回 **`--no-auto-update` を付けてください**。
4. **`--always-approve` は、Grok に自分で書き込ませたいときだけ使ってください**。
   読むだけのレビューや点検では外します。
5. 長い作業は `background=true, notify_on_complete=true` で **バックグラウンドに
   回し**、`process` ツールで様子を見てください。
6. 何度もやりとりする作業では **tmux を使い**、
   `tmux capture-pane -t <session> -p -S -50` で監視してください。
7. **頼る前に認証を確かめてください** — `~/.grok/auth.json` を見るか、
   軽く `grok -p "Say ok."` を実行して確認します。Hermes 側の xAI 認証が
   引き継がれると思い込まないでください。
8. **結果を利用者に伝えてください** — Grok が何を変えて、何が残っているかを
   まとめます。
