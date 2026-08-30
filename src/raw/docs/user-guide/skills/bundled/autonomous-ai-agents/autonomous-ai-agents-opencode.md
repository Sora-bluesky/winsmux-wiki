---
title: "Opencode — コーディングを OpenCode CLI に任せる（機能追加、PR レビュー）"
description: "コーディングを OpenCode CLI に任せる（機能追加、PR レビュー）"
upstream_path: user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-opencode.md
upstream_blob: e8a027d382ac4d40c6d520763873ac074e7aed68
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-opencode
---

# Opencode {#opencode}

コーディングを OpenCode CLI に任せます（機能追加、PR レビュー）。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/autonomous-ai-agents\opencode` |
| バージョン | `1.2.0` |
| 作者 | Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Coding-Agent`, `OpenCode`, `Autonomous`, `Refactoring`, `Code-Review` |
| 関連 skill | [`claude-code`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-claude-code/), [`codex`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-codex/), [`hermes-agent`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-hermes-agent/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこの内容を指示として見ています。
:::

# OpenCode CLI {#opencode-cli}

[OpenCode](https://opencode.ai) を、Hermes のターミナル系・プロセス系ツールから動かす自律的なコーディングの働き手として使います。OpenCode はプロバイダを選ばないオープンソースの AI コーディングエージェントで、TUI と CLI があります。

## こんなときに使う {#when-to-use}

- 利用者が OpenCode を使うようはっきり求めているとき
- 外部のコーディングエージェントに実装・整理・レビューをさせたいとき
- 長く動かして途中経過を確かめながら進めるコーディングをしたいとき
- 作業ディレクトリや worktree を分けて、作業を並行して走らせたいとき

## あらかじめ必要なもの {#prerequisites}

- OpenCode が入っていること: `npm i -g opencode-ai@latest` または `brew install anomalyco/tap/opencode`
- 認証が済んでいること: `opencode auth login`、またはプロバイダの環境変数（OPENROUTER_API_KEY など）を設定
- 確認: `opencode auth list` にプロバイダが少なくとも 1 つ出ること
- コードを扱う作業では git リポジトリがあること（推奨）
- 対話的な TUI セッションには `pty=true`

## バイナリの解決（重要） {#binary-resolution-important}

シェルの環境によっては、別の OpenCode バイナリが選ばれることがあります。自分のターミナルと Hermes とで挙動が違うときは、次を確かめてください。

```
terminal(command="which -a opencode")
terminal(command="opencode --version")
```

必要なら、バイナリのパスを直接指定します。

```
terminal(command="$HOME/.opencode/bin/opencode run '...'", workdir="~/project", pty=true)
```

## 一回きりの作業 {#one-shot-tasks}

区切りのはっきりした、対話の要らない作業には `opencode run` を使います。

```
terminal(command="opencode run 'Add retry logic to API calls and update tests'", workdir="~/project")
```

`-f` で参考にするファイルを添えられます。

```
terminal(command="opencode run 'Review this config for security issues' -f config.yaml -f .env.example", workdir="~/project")
```

`--thinking` を付けると、モデルの思考の過程が表示されます。

```
terminal(command="opencode run 'Debug why tests fail in CI' --thinking", workdir="~/project")
```

モデルを指定することもできます。

```
terminal(command="opencode run 'Refactor auth module' --model openrouter/anthropic/claude-sonnet-4", workdir="~/project")
```

## 対話的なセッション（バックグラウンド） {#interactive-sessions-background}

何度もやり取りしながら進めたいときは、TUI をバックグラウンドで立ち上げます。

```
terminal(command="opencode", workdir="~/project", background=true, pty=true)
# Returns session_id

# Send a prompt
process(action="submit", session_id="<id>", data="Implement OAuth refresh flow and add tests")

# Monitor progress
process(action="poll", session_id="<id>")
process(action="log", session_id="<id>")

# Send follow-up input
process(action="submit", session_id="<id>", data="Now add error handling for token expiry")

# Exit cleanly — Ctrl+C
process(action="write", session_id="<id>", data="\x03")
# Or just kill the process
process(action="kill", session_id="<id>")
```

**重要:** `/exit` は使わないでください。OpenCode のコマンドとしては存在せず、エージェントの選択ダイアログが開いてしまいます。終了するときは Ctrl+C（`\x03`）か `process(action="kill")` を使います。

### TUI のキーバインド {#tui-keybindings}

| キー | 動作 |
|-----|--------|
| `Enter` | メッセージを送る（必要なら 2 回押す） |
| `Tab` | エージェントを切り替える（build / plan） |
| `Ctrl+P` | コマンドパレットを開く |
| `Ctrl+X L` | セッションを切り替える |
| `Ctrl+X M` | モデルを切り替える |
| `Ctrl+X N` | 新しいセッションを始める |
| `Ctrl+X E` | エディタを開く |
| `Ctrl+C` | OpenCode を終了する |

### セッションを再開する {#resuming-sessions}

終了すると、OpenCode はセッション ID を表示します。次のように再開できます。

```
terminal(command="opencode -c", workdir="~/project", background=true, pty=true)  # Continue last session
terminal(command="opencode -s ses_abc123", workdir="~/project", background=true, pty=true)  # Specific session
```

## よく使うフラグ {#common-flags}

| フラグ | 用途 |
|------|-----|
| `run 'prompt'` | 一回だけ実行して終了する |
| `--continue` / `-c` | 直前の OpenCode セッションを続ける |
| `--session <id>` / `-s` | 特定のセッションを続ける |
| `--agent <name>` | OpenCode のエージェントを選ぶ（build か plan） |
| `--model provider/model` | モデルを指定する |
| `--format json` | 機械で読める形式で出力・イベントを返す |
| `--file <path>` / `-f` | メッセージにファイルを添える |
| `--thinking` | モデルの思考の過程を表示する |
| `--variant <level>` | 推論の深さ（high、max、minimal） |
| `--title <name>` | セッションに名前を付ける |
| `--attach <url>` | 動いている opencode サーバーに接続する |

## 進め方 {#procedure}

1. ツールが使える状態か確かめる:
   - `terminal(command="opencode --version")`
   - `terminal(command="opencode auth list")`
2. 区切りのはっきりした作業なら `opencode run '...'` を使う（pty は不要）。
3. 何度もやり取りする作業なら、`background=true, pty=true` を付けて `opencode` を起動する。
4. 長い作業は `process(action="poll"|"log")` で見守る。
5. OpenCode が入力を求めてきたら、`process(action="submit", ...)` で答える。
6. 終了は `process(action="write", data="\x03")` か `process(action="kill")` で行う。
7. 変わったファイル、テストの結果、次にやることを利用者にまとめて伝える。

## PR レビューの進め方 {#pr-review-workflow}

OpenCode には PR 用のコマンドが組み込まれています。

```
terminal(command="opencode pr 42", workdir="~/project", pty=true)
```

作業を切り離したいときは、一時的なクローンの中でレビューすることもできます。

```
terminal(command="REVIEW=$(mktemp -d) && git clone https://github.com/user/repo.git $REVIEW && cd $REVIEW && opencode run 'Review this PR vs main. Report bugs, security risks, test gaps, and style issues.' -f $(git diff origin/main --name-only | head -20 | tr '\n' ' ')", pty=true)
```

## 並行して進めるときの形 {#parallel-work-pattern}

ぶつからないように、作業ディレクトリや worktree を分けます。

```
terminal(command="opencode run 'Fix issue #101 and commit'", workdir="/tmp/issue-101", background=true, pty=true)
terminal(command="opencode run 'Add parser regression tests and commit'", workdir="/tmp/issue-102", background=true, pty=true)
process(action="list")
```

## セッションと費用の管理 {#session-cost-management}

これまでのセッションを一覧します。

```
terminal(command="opencode session list")
```

トークンの使用量と費用を確かめます。

```
terminal(command="opencode stats")
terminal(command="opencode stats --days 7 --models anthropic/claude-sonnet-4")
```

## つまずきやすいところ {#pitfalls}

- 対話的な `opencode`（TUI）のセッションには `pty=true` が要ります。`opencode run` に pty は要りません。
- `/exit` はコマンドとして存在せず、エージェントの選択画面が開きます。TUI を終了するには Ctrl+C を使います。
- PATH の食い違いで、意図しない OpenCode のバイナリやモデル設定が選ばれることがあります。
- OpenCode が止まっているように見えるときは、終了させる前にログを見てください:
  - `process(action="log", session_id="<id>")`
- 並行して動く OpenCode のセッションで、1 つの作業ディレクトリを共有しないでください。
- TUI では、送信に Enter を 2 回押す必要があることがあります（1 回目で文章を確定し、2 回目で送信）。

## 動作確認 {#verification}

軽い確認は次のとおりです。

```
terminal(command="opencode run 'Respond with exactly: OPENCODE_SMOKE_OK'")
```

うまくいっている条件:
- 出力に `OPENCODE_SMOKE_OK` が含まれる
- プロバイダやモデルのエラーなしにコマンドが終わる
- コードを扱う作業では、想定したファイルが変わり、テストが通る

## 決まりごと {#rules}

1. 一回きりの自動化には `opencode run` を優先します。単純で、pty も要りません。
2. 対話的なバックグラウンドのモードは、繰り返しやり取りする必要があるときだけ使います。
3. OpenCode のセッションは、常に 1 つのリポジトリ・作業ディレクトリに限定します。
4. 長い作業では、`process` のログから途中経過を伝えます。
5. 具体的な結果（変わったファイル、テスト、残っているリスク）を報告します。
6. 対話的なセッションは Ctrl+C か kill で終了します。`/exit` は使いません。
