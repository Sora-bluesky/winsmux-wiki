---
title: "Codex — OpenAI Codex CLI にコーディングを任せる（機能追加、PR）"
description: "OpenAI Codex CLI にコーディングを任せる（機能追加、PR）"
upstream_path: user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-codex.md
upstream_blob: 503774e55387d4d0db02749dc118426e1b39fcfb
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-codex
---

# Codex {#codex}

OpenAI Codex CLI にコーディングを任せます（機能追加、PR）。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/autonomous-ai-agents/codex` |
| バージョン | `1.0.1` |
| 作者 | Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Coding-Agent`, `Codex`, `OpenAI`, `Code-Review`, `Refactoring` |
| 関連 skill | [`claude-code`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-claude-code/), [`hermes-agent`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-hermes-agent/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Codex CLI {#codex-cli}

Hermes のターミナル経由で、[Codex](https://github.com/openai/codex) にコーディングを任せます。Codex は OpenAI が作った自律型のコーディングエージェント CLI です。

## こんなときに使います {#when-to-use}

- 機能を作るとき
- コードを書き直すとき
- PR をレビューするとき
- Issue をまとめて片付けるとき

codex CLI と git リポジトリが必要です。

## 事前に必要なもの {#prerequisites}

- Codex のインストール: `npm install -g @openai/codex`
- OpenAI の認証設定: `OPENAI_API_KEY` か、Codex CLI のログインで得た Codex の
  OAuth 認証情報のどちらか
- **git リポジトリのなかで実行する必要があります**。Codex はそれ以外の場所では動きません
- ターミナルの呼び出しでは `pty=true` を使ってください。Codex は対話型のターミナルアプリです

Hermes 自身については、`hermes auth add openai-codex` を実行したあと、
`model.provider: openai-codex` が `~/.hermes/auth.json` にある Hermes 管理の Codex
OAuth を使います。単独の Codex CLI については、CLI での OAuth セッションが
`~/.codex/auth.json` にある場合があります。`OPENAI_API_KEY` が無いというだけで、
Codex の認証が無いと判断しないでください。

## 一回で終わる作業 {#one-shot-tasks}

```
terminal(command="codex exec 'Add dark mode toggle to settings'", workdir="~/project", pty=true)
```

使い捨ての作業をするときは次のようにします（Codex には git リポジトリが必要です）。
```
terminal(command="cd $(mktemp -d) && git init && codex exec 'Build a snake game in Python'", pty=true)
```

## バックグラウンド実行（長い作業） {#background-mode-long-tasks}

```
# Start in background with PTY
terminal(command="codex exec --sandbox workspace-write 'Refactor the auth module'", workdir="~/project", background=true, pty=true)
# Returns session_id

# Monitor progress
process(action="poll", session_id="<id>")
process(action="log", session_id="<id>")

# Send input if Codex asks a question
process(action="submit", session_id="<id>", data="yes")

# Kill if needed
process(action="kill", session_id="<id>")
```

## 主なフラグ {#key-flags}

| フラグ | はたらき |
|------|--------|
| `exec "prompt"` | 一回だけ実行し、終わったら終了します |
| `--sandbox workspace-write`（`-s`） | サンドボックス内で動きつつ、作業ディレクトリへのファイル変更は自動で承認します（自動で作らせたいときはこれがおすすめです） |
| `--dangerously-bypass-approvals-and-sandbox` | サンドボックスも承認も無し（いちばん速く、いちばん危険です。隠しの別名として `--yolo` も使えます） |
| `--sandbox danger-full-access` | Codex のサンドボックスを使いません。ホスト側のサービス環境で bubblewrap が動かないときに役立ちます |

> **非推奨:** `--full-auto` はまだ動きますが、いまの CLI は `--sandbox workspace-write` を使うよう警告を出します。

## Hermes のゲートウェイでの注意 {#hermes-gateway-caveat}

Hermes のゲートウェイやサービスの環境（たとえば Telegram から動かすエージェントの
セッション）から Codex CLI を呼ぶと、同じコマンドが手元のシェルでは通るのに
`workspace-write` のサンドボックスだけ失敗することがあります。よくある症状は、
`setting up uid map: Permission denied` や
`loopback: Failed RTM_NEWADDR: Operation not permitted` といった bubblewrap や
ユーザー名前空間まわりのエラーです。

その環境では、次のほうを使ってください。

```
codex exec --sandbox danger-full-access "<task>"
```

代わりに、プロセスの外側で安全を確保します。`workdir` をはっきり指定し、実行前に git の
状態をきれいにし、作業の指示を絞り、`git diff` で確認し、対象を絞ったテストを走らせ、
広い範囲をコミットする前に人かエージェントの確認を挟んでください。

## PR レビュー {#pr-reviews}

安全にレビューするため、一時ディレクトリにクローンします。

```
terminal(command="REVIEW=$(mktemp -d) && git clone https://github.com/user/repo.git $REVIEW && cd $REVIEW && gh pr checkout 42 && codex review --base origin/main", pty=true)
```

## worktree で Issue を並行して片付ける {#parallel-issue-fixing-with-worktrees}

```
# Create worktrees
terminal(command="git worktree add -b fix/issue-78 /tmp/issue-78 main", workdir="~/project")
terminal(command="git worktree add -b fix/issue-99 /tmp/issue-99 main", workdir="~/project")

# Launch Codex in each
terminal(command="codex --sandbox workspace-write exec 'Fix issue #78: <description>. Commit when done.'", workdir="/tmp/issue-78", background=true, pty=true)
terminal(command="codex --sandbox workspace-write exec 'Fix issue #99: <description>. Commit when done.'", workdir="/tmp/issue-99", background=true, pty=true)

# Monitor
process(action="list")

# After completion, push and create PRs
terminal(command="cd /tmp/issue-78 && git push -u origin fix/issue-78")
terminal(command="gh pr create --repo user/repo --head fix/issue-78 --title 'fix: ...' --body '...'")

# Cleanup
terminal(command="git worktree remove /tmp/issue-78", workdir="~/project")
```

## PR をまとめてレビューする {#batch-pr-reviews}

```
# Fetch all PR refs
terminal(command="git fetch origin '+refs/pull/*/head:refs/remotes/origin/pr/*'", workdir="~/project")

# Review multiple PRs in parallel
terminal(command="codex exec 'Review PR #86. git diff origin/main...origin/pr/86'", workdir="~/project", background=true, pty=true)
terminal(command="codex exec 'Review PR #87. git diff origin/main...origin/pr/87'", workdir="~/project", background=true, pty=true)

# Post results
terminal(command="gh pr comment 86 --body '<review>'", workdir="~/project")
```

## ルール {#rules}

1. **必ず `pty=true` を使います** — Codex は対話型のターミナルアプリで、PTY が無いと止まったままになります
2. **git リポジトリが必要です** — git のディレクトリの外では動きません。使い捨ての作業には `mktemp -d && git init` を使ってください
3. **一回で終わる作業には `exec` を使います** — `codex exec "prompt"` は実行して素直に終了します
4. **作らせるときは `--sandbox workspace-write`** — サンドボックス内の変更を自動で承認します（この用途では `--full-auto` は非推奨です）
5. **長い作業はバックグラウンドで** — `background=true` を使い、`process` ツールで様子を見ます
6. **邪魔をしないこと** — `poll` / `log` で見守り、長い作業には辛抱強く付き合ってください
7. **並行実行して構いません** — まとめて片付けたいときは Codex を同時に複数動かせます
