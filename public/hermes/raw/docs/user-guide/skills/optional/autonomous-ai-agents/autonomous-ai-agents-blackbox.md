---
title: "Blackbox — 複数のモデルを扱う Blackbox AI の CLI にコーディング作業を任せます"
description: "複数のモデルを扱う Blackbox AI の CLI にコーディング作業を任せます"
upstream_path: user-guide/skills/optional/autonomous-ai-agents/autonomous-ai-agents-blackbox.md
upstream_blob: 822bb73de67848c602bf7c36f1e433eeacbb4f2a
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/autonomous-ai-agents/autonomous-ai-agents-blackbox
---

# Blackbox {#blackbox}

複数のモデルを扱う Blackbox AI の CLI にコーディング作業を任せます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加で入れるもの — `hermes skills install official/autonomous-ai-agents/blackbox` で導入します |
| パス | `optional-skills/autonomous-ai-agents/blackbox` |
| バージョン | `1.0.1` |
| 作者 | Hermes Agent（Nous Research） |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Coding-Agent`, `Blackbox`, `Multi-Agent`, `Judge`, `Multi-Model` |
| 関連 skill | [`claude-code`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-claude-code/), [`codex`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-codex/), [`hermes-agent`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-hermes-agent/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Blackbox CLI {#blackbox-cli}

Hermes のターミナルから [Blackbox AI](https://www.blackbox.ai/) にコーディング作業を任せます。Blackbox は複数のモデルを使うコーディングエージェントの CLI で、ひとつの作業を複数の LLM（Claude、Codex、Gemini、Blackbox Pro）に投げ、審判役がいちばんよい実装を選びます。

この CLI（npm の `@blackbox_ai/blackbox-cli`、実行ファイル名は `blackbox`）は TypeScript で書かれたコーディングエージェントで（Gemini CLI から分かれたものです）、対話セッション、対話なしの一回きりの実行、途中保存、MCP、画像を扱うモデルへの切り替えに対応しています。

## 前提 {#prerequisites}

- Node.js 20 以上が入っていること
- Blackbox CLI が入っていること: `npm install -g @blackbox_ai/blackbox-cli`（実行ファイル名は `blackbox`）
- [app.blackbox.ai/dashboard](https://app.blackbox.ai/dashboard) で API キーを取得していること
- 設定が済んでいること: `blackbox configure` を実行し、API キーを入力します
- ターミナルの呼び出しでは `pty=true` を使うこと。Blackbox CLI は対話前提の端末アプリです

## 一回きりの作業 {#one-shot-tasks}

```
terminal(command="blackbox --prompt 'Add JWT authentication with refresh tokens to the Express API'", workdir="/path/to/project", pty=true)
```

ちょっとした試し書きなら、次のようにします。

```
terminal(command="cd $(mktemp -d) && git init && blackbox --prompt 'Build a REST API for todos with SQLite'", pty=true)
```

## 裏で走らせる（長い作業） {#background-mode-long-tasks}

数分かかる作業では、裏で走らせて進み具合を見られるようにします。

```
# Start in background with PTY
terminal(command="blackbox --prompt 'Refactor the auth module to use OAuth 2.0'", workdir="~/project", background=true, pty=true)
# Returns session_id

# Monitor progress
process(action="poll", session_id="<id>")
process(action="log", session_id="<id>")

# Send input if Blackbox asks a question
process(action="submit", session_id="<id>", data="yes")

# Kill if needed
process(action="kill", session_id="<id>")
```

## 途中保存と再開 {#checkpoints-resume}

Blackbox CLI には、作業を止めて再開するための途中保存の仕組みがあります。

```
# After a task completes, Blackbox shows a checkpoint tag
# Resume with a follow-up task:
terminal(command="blackbox --resume-checkpoint 'task-abc123-2026-03-06' --prompt 'Now add rate limiting to the endpoints'", workdir="~/project", pty=true)
```

## セッション中のコマンド {#session-commands}

対話セッションの最中は、次のコマンドが使えます。

| コマンド | はたらき |
|---------|--------|
| `/compress` | 会話の履歴を縮めて、トークンを節約します |
| `/clear` | 履歴を消して、まっさらから始めます |
| `/stats` | 今のトークン使用量を見ます |
| `Ctrl+C` | 実行中の処理を取り消します |

## PR のレビュー {#pr-reviews}

作業中のツリーを触らないよう、一時ディレクトリにクローンします。

```
terminal(command="REVIEW=$(mktemp -d) && git clone https://github.com/user/repo.git $REVIEW && cd $REVIEW && gh pr checkout 42 && blackbox --prompt 'Review this PR against main. Check for bugs, security issues, and code quality.'", pty=true)
```

## 並べて動かす {#parallel-work}

互いに関係のない作業なら、Blackbox をいくつも同時に立ち上げられます。

```
terminal(command="blackbox --prompt 'Fix the login bug'", workdir="/tmp/issue-1", background=true, pty=true)
terminal(command="blackbox --prompt 'Add unit tests for auth'", workdir="/tmp/issue-2", background=true, pty=true)

# Monitor all
process(action="list")
```

## 複数モデルで動かす {#multi-model-mode}

Blackbox ならではの機能が、同じ作業を複数のモデルに走らせて結果を評価するやり方です。使うモデルは `blackbox configure` で選びます。提供元を複数選ぶと、CLI が各モデルの出力を見比べていちばんよいものを選ぶ、審判役（Chairman）の流れが有効になります。

## 主なフラグ {#key-flags}

| フラグ | はたらき |
|------|--------|
| `--prompt "task"`（`-p`） | 対話なしで、一回きり実行します |
| `--resume-checkpoint "tag"` | 保存した地点から再開します |
| `--yolo`（`-y`） | 操作もモデルの切り替えも、すべて自動で承認します |
| `--vlm-switch-mode <mode>` | 画像の扱い方を決めます: `once`、`session`、`persist` |
| `-c, --checkpointing` | ファイル編集の途中保存を有効にします |
| `blackbox configure` | 設定、提供元、モデルを変えます |
| `blackbox update` | CLI を最新版に更新します |
| `blackbox mcp` | MCP サーバーを管理します |
| `blackbox extensions` | CLI の拡張を管理します |
| `blackbox voice <action>` / `blackbox shortcut` | 音声入力や `b` のショートカットを設定します |

## 画像への対応 {#vision-support}

Blackbox は入力に画像があると自動で気づき、画像を読めるモデルに切り替えられます。切り替え方は次の 3 つです。

- `"once"` — 今の質問のあいだだけ切り替えます
- `"session"` — そのセッションのあいだ切り替えます
- `"persist"` — 今のモデルのままにします（切り替えません）

## トークンの上限 {#token-limits}

トークンの使用量は `.blackboxcli/settings.json` で調整します。

```json
{
  "sessionTokenLimit": 32000
}
```

## 決まりごと {#rules}

1. **必ず `pty=true` を使う** — Blackbox CLI は対話前提の端末アプリで、PTY が無いと固まります
2. **`workdir` を指定する** — エージェントの作業場所をはっきりさせます
3. **長い作業は裏で** — `background=true` で走らせ、`process` ツールで様子を見ます
4. **口を出しすぎない** — `poll` や `log` で見守り、遅いからといってセッションを止めないでください
5. **結果を伝える** — 終わったら何が変わったかを確かめ、利用者にまとめて伝えます
6. **クレジットは有料** — Blackbox はクレジット制で、複数モデルで動かすと消費が速くなります
7. **前提を確かめる** — 任せる前に、`blackbox` の CLI が入っているかを確かめます
