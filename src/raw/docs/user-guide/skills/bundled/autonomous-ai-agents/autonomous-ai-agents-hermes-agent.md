---
title: "Hermes Agent — Hermes Agent を使う、設定する、見た目を変える、拡張する、束ねる"
description: "Hermes Agent を使う、設定する、見た目を変える、拡張する、束ねる"
upstream_path: user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-hermes-agent.md
upstream_blob: 6e31b32dc99c0d93bdab14328544415ff8bac26d
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-hermes-agent
---

# Hermes Agent {#hermes-agent}

Hermes Agent を使う、設定する、見た目を変える、拡張する、束ねるための skill です。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/autonomous-ai-agents\hermes-agent` |
| バージョン | `3.2.0` |
| 作者 | Hermes Agent + Teknium |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `hermes`, `setup`, `configuration`, `multi-agent`, `spawning`, `cli`, `gateway`, `bots`, `bot-mode`, `features`, `themes`, `skins`, `desktop-plugins`, `tui-widgets`, `petdex`, `development` |
| 関連 skill | [`claude-code`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-claude-code/), [`codex`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-codex/), [`opencode`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-opencode/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこの内容を指示として見ています。
:::

# Hermes Agent {#hermes-agent}

Hermes Agent は Nous Research が開発したオープンソースの AI エージェント基盤で、ターミナル、ネイティブのデスクトップアプリ、メッセージ系のプラットフォーム、IDE の上で動きます。Claude Code（Anthropic）、Codex（OpenAI）、OpenClaw と同じ系統のもので、ツール呼び出しで自分の環境を操作しながら、コーディングや作業をこなす自律型のエージェントです。Hermes はどの LLM プロバイダとも組み合わせられ（OpenRouter、Anthropic、OpenAI、Google、DeepSeek、xAI、ローカルのモデル、そのほか 20 以上）、Linux、macOS、Windows、WSL で動きます。

Hermes ならではの点は次のとおりです。

- **skill を通じて自分で成長する** — 再利用できる手順を skill として保存し、それが次のセッションに読み込まれることで、Hermes は経験から学びます。
- **セッションをまたいで記憶が続く** — 利用者が誰か、好み、環境の詳細、学んだことを覚えています。記憶の保存先は差し替えられます。
- **複数のプラットフォームをつなぐゲートウェイ** — 同じエージェントが Telegram、Discord、Slack、WhatsApp、iMessage、Signal、Matrix、Teams、メール、そのほか十数のプラットフォームで、チャットだけでなくツールをすべて使える状態で動きます。
- **入口がたくさんある** — 同じエージェントの中核が、CLI、Ink の TUI、ネイティブの Electron デスクトップアプリ、Web のダッシュボード、IDE 向けの ACP サーバー（VS Code / Zed / JetBrains）を動かします。
- **プロバイダを選ばない** — 作業の途中でモデルもプロバイダも入れ替えられます。複数の API キーは資格情報のプールが自動で切り替えます。
- **プロファイル** — 設定、セッション、skill、記憶を分けたまま、複数の Hermes を独立して動かせます。
- **拡張も着せ替えも自由** — プラグイン、MCP サーバー、独自ツール、Webhook のトリガー、cron によるスケジュール実行、すべての画面の見た目を変えるスキン、デスクトップの UI プラグイン、TUI のウィジェット、ペットのマスコットがあります。

**この skill は入口です。** 本文が扱うのは、Hermes とは何か、使い始め方、子プロセスの起動と取りまとめ、そして絶対に破ってはいけない決まりごとです。それ以外は参照ファイルにあります。**答える前に、下の表から該当する参照ファイルを読み込んでください。** 細かい質問に本文だけで答えてはいけません。

**ドキュメント:** https://hermes-agent.nousresearch.com/docs/

## 扱う範囲と裏取り {#scope-verification}

この skill は簡潔な操作の手引きであって、Hermes のすべての機能についての完全な正本ではありません。ある機能・コマンド・設定がここにも参照ファイルにも書かれていなくても、それを「存在しない証拠」として扱わないでください。「ありません」と答える前に、動いているリポジトリと公式ドキュメントを確かめてください。

裏を取るのに向いている先を、手軽な順に挙げます。

- **出荷済みの機能を 1 行ずつ並べたもの: https://hermes-agent.nousresearch.com/docs/llms.txt。** 「Hermes で X はできるか」「X はどうやるのか」という問いは、まずここから始めてください。ドキュメント全体の索引になっていて、答えが載っているページへのリンクが付いています。ビルドのたびにドキュメントの木から生成されるので、製品の実態から遅れることがありません。取得には `web_extract` を使うか、Web 系のツールを切っているときは `curl -s https://hermes-agent.nousresearch.com/docs/llms.txt` を使ってください。ドキュメント全体を 1 つのファイルにまとめたものは `/docs/llms-full.txt` にあります。
- CLI のコマンド: `hermes --help`、`hermes <command> --help`、`hermes_cli/main.py`
- ソースツリー: https://github.com/NousResearch/hermes-agent

記憶だけを頼りに「Hermes にそれはできません」と答えてはいけません。Hermes には、この skill の本文が書いている以上のものがずっと多く入っています。否定の答えをいつでも確かめられるように、あの索引があります。

## 使い始める {#quick-start}

```bash
# Install (shell installer — sets up uv, Python, the venv, and the launcher)
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash

# Interactive chat (default surface; set display.interface: tui to launch the Ink TUI instead)
hermes

# Single query
hermes chat -q "What is the capital of France?"

# Setup wizard  /  pick model+provider  /  health check
hermes setup
hermes model
hermes doctor

# Other surfaces
hermes desktop                 # launch the native desktop app (alias: hermes gui)
hermes dashboard               # web admin panel + embedded chat
hermes proxy                   # OpenAI-compatible local proxy backed by your OAuth provider
```

## 主なファイルの場所 {#key-paths}

```
~/.hermes/config.yaml       Main configuration (settings — never secrets)
~/.hermes/.env              API keys and secrets ONLY (under $HERMES_HOME if set)
$HERMES_HOME/skills/        Installed skills
~/.hermes/skins/            Custom themes (see references/themes.md)
~/.hermes/desktop-plugins/  Desktop app UI plugins (see references/desktop-plugins.md)
~/.hermes/tui-widgets/      TUI widget apps (see references/tui-widgets.md)
~/.hermes/pets/             Installed pet mascots (see references/petdex.md)
~/.hermes/state.db          Canonical session store (SQLite + FTS5)
~/.hermes/sessions/         Gateway routing index, request dumps, *.jsonl transcripts
~/.hermes/logs/             Gateway and error logs
~/.hermes/auth.json         OAuth tokens and credential pools
~/.hermes/hermes-agent/     Source code (if git-installed)
```

プロファイルは `~/.hermes/profiles/<name>/` の下に同じ構成で置かれます。プロファイルが有効なときは、本当のホームを `$HERMES_HOME` から解決してください。`~/.hermes` を直接書かないこと。

## 振り分け表 — 作業に合った参照ファイルを読み込む {#routing-table-load-the-reference-for-the-task}

| 利用者が知りたいこと | 読み込むもの |
|---|---|
| **下に載っていないこと全部 — 「Hermes で X はできるか」「X はどう設定するのか」** | **https://hermes-agent.nousresearch.com/docs/llms.txt** |
| 会話したり、決まった処理を回したり、互いにやり取りしたりするボット。Bots タブ | docs: `/user-guide/bot-mode` |
| CLI のコマンド、サブコマンド、フラグ、「X はどう実行するのか」 | `references/cli-reference.md` |
| セッション中に使うスラッシュコマンド | `references/slash-commands.md` |
| プロバイダの設定、API キー、OAuth | `references/providers-and-models.md` |
| config.yaml の各セクション、ツールセット、音声 / STT / TTS | `references/configuration.md` |
| AGENTS.md / .hermes.md / CLAUDE.md といったプロジェクトの決まりごと | `references/project-context-files.md` |
| 秘密情報の伏せ字化、個人情報、承認モード、「権限をリセットしたい」 | `references/security-privacy.md` |
| 委任、cron、キュレーター、かんばん | `references/background-systems.md` |
| MCP サーバー（追加、カタログ、`hermes mcp`） | `references/native-mcp.md` |
| Webhook の経路とイベント起点の実行 | `references/webhooks.md` |
| 独自のテーマ / スキン（「synthwave のテーマ」「金色の ● を変えたい」） | `references/themes.md` + `templates/skin.yaml` |
| デスクトップアプリの UI 要素（ペイン、ウィジェット、⌘K のコマンド、ページ） | `references/desktop-plugins.md` + `templates/plugin.js` |
| TUI の常設パネルやモーダルのウィジェット（ティッカー、時計、ダッシュボード） | `references/tui-widgets.md` + `templates/clock.mjs` |
| ペットのマスコット — 導入、選択、大きさ、不具合の切り分け | `references/petdex.md` |
| Windows 固有の問題（キーバインド、WinError 10106、BOM） | `references/windows-quirks.md` |
| 不具合の切り分け: 音声、ツールが出てこない、ゲートウェイ、補助モデル | `references/troubleshooting.md` |
| コードで貢献する: ツール、スラッシュコマンド、テストの追加 | `references/contributor-guide.md` |
| delegate_task が「N 件で頭打ちになる」という報告 | `references/delegate-task-concurrency-diagnosis.md` |
| 「アプリ X から Nous Portal のサブスクや OAuth を使えるか」 | `references/portal-auth-for-third-party-apps.md` |
| メッセージ系のプラットフォームをつなぐ（Telegram、Discord、Slack、WhatsApp など） | docs: `/user-guide/messaging` |

上の参照ファイルの一覧は、機能の一覧ではありません。それぞれのドキュメントのページだけでは
足りない話題を集めたものです。Hermes が備えるそのほかのものについては、
`llms.txt` を取ってくれば、問いから答えの載ったページへたどり着けます。

見た目まわりには、参照ファイルを読み込まなくても常に成り立つ決まりが 2 つあります。**スキンはエージェント自身が適用します**（`hermes config set display.skin <name>`。すべての画面が 1 秒ほどで塗り替わります。`/skin` を実行するよう利用者に言わないでください）。そして **色を 1 つだけ変えたいときは、いま有効なスキンを編集します**（`hermes skin set <key> <hex>`）。`default` を複製して作り直してはいけません。配色が失われ、背景も初期状態に戻ります。

## Hermes をもう 1 つ立ち上げる {#spawning-additional-hermes-instances}

Hermes のプロセスを、完全に独立した子プロセスとして追加で動かせます。セッションもツールも環境も別になります。

### delegate_task とどう使い分けるか {#when-to-use-this-vs-delegatetask}

| | `delegate_task` | `hermes` プロセスの起動 |
|-|-----------------|--------------------------|
| 分離 | 会話は別、プロセスは同じ | プロセスごと完全に独立 |
| 続く時間 | 数分（親のループの中で終わる） | 数時間から数日 |
| 使えるツール | 親のツールの一部 | すべてのツール |
| 対話 | できない | できる（PTY モード） |
| 向く用途 | 手早く並行させる小さな作業 | 長く自律的に進める作業 |

### 一回きりで動かす {#one-shot-mode}

```
terminal(command="hermes chat -q 'Research GRPO papers and write summary to ~/research/grpo.md'", timeout=300)

# Background for long tasks:
terminal(command="hermes chat -q 'Set up CI/CD for ~/myapp'", background=true)
```

### 対話的な PTY モード（tmux 経由） {#interactive-pty-mode-via-tmux}

Hermes は prompt_toolkit を使っており、本物の端末を必要とします。対話的に立ち上げるときは tmux を使ってください。

```
# Start
terminal(command="tmux new-session -d -s agent1 -x 120 -y 40 'hermes'", timeout=10)

# Wait for startup, then send a message
terminal(command="sleep 8 && tmux send-keys -t agent1 'Build a FastAPI auth service' Enter", timeout=15)

# Read output
terminal(command="sleep 20 && tmux capture-pane -t agent1 -p", timeout=5)

# Send follow-up
terminal(command="tmux send-keys -t agent1 'Add rate limiting middleware' Enter", timeout=5)

# Exit
terminal(command="tmux send-keys -t agent1 '/exit' Enter && sleep 2 && tmux kill-session -t agent1", timeout=10)
```

### 複数のエージェントを組み合わせる {#multi-agent-coordination}

```
# Agent A: backend
terminal(command="tmux new-session -d -s backend -x 120 -y 40 'hermes -w'", timeout=10)
terminal(command="sleep 8 && tmux send-keys -t backend 'Build REST API for user management' Enter", timeout=15)

# Agent B: frontend
terminal(command="tmux new-session -d -s frontend -x 120 -y 40 'hermes -w'", timeout=10)
terminal(command="sleep 8 && tmux send-keys -t frontend 'Build React dashboard for user management' Enter", timeout=15)

# Check progress, relay context between them
terminal(command="tmux capture-pane -t backend -p | tail -30", timeout=5)
terminal(command="tmux send-keys -t frontend 'Here is the API schema from the backend agent: ...' Enter", timeout=5)
```

### セッションを再開する {#session-resume}

```
# Resume most recent session
terminal(command="tmux new-session -d -s resumed 'hermes --continue'", timeout=10)

# Resume specific session
terminal(command="tmux new-session -d -s resumed 'hermes --resume 20260225_143052_a1b2c3'", timeout=10)
```

### こつ {#tips}

- **小さい作業には `delegate_task` を優先する** — プロセスをまるごと立ち上げるより負担が軽くて済みます
- **コードを編集させるエージェントを立ち上げるときは `-w`（worktree モード）を使う** — git の衝突を防げます
- **一回きりのモードではタイムアウトを設定する** — 込み入った作業は 5〜10 分かかることがあります
- **投げっぱなしでよいときは `hermes chat -q` を使う** — PTY は要りません
- **対話的なセッションには tmux を使う** — 生の PTY モードだと、prompt_toolkit との間で `\r` と `\n` の食い違いが起きます
- **決まった時刻に動かしたいとき**は、プロセスを立ち上げるのではなく `cronjob` ツールを使ってください。配信と再試行まで面倒を見てくれます
- **「delegate_task が N 件で頭打ちになる」という報告** — `references/delegate-task-concurrency-diagnosis.md` を参照してください。Hermes には頭打ちになる経路が実際に 3 つあります。そのどれも起きていないなら、モデルが自分で手加減したうえで「ランタイムの上限だ」と理由づけしています。
- **「外部のアプリから Nous Portal のサブスクや OAuth を使えるか」** — `references/portal-auth-for-third-party-apps.md` を参照してください。3 つの層（プラグインなのかアプリなのか、Portal が実際に何を公開しているのか、ローカルの仲介プロキシという選択肢）を順に説明してください。

## 入口の一覧（ざっくり把握するために） {#surfaces-quick-orientation}

- **デスクトップアプリ**（`hermes desktop` / `hermes gui`）— macOS / Linux / Windows 向けのネイティブな Electron アプリです。逐次表示されるチャット、セッションの一覧、Cmd+K のパレット、ファイルのドラッグ & ドロップ、OS の通知、プロファイルごとのリモートゲートウェイへのログインに対応します。UI プラグインで拡張できます — `references/desktop-plugins.md`。
- **Web ダッシュボード**（`hermes dashboard`）— 管理画面の全部入りです。メッセージのチャンネル、MCP のカタログ、Webhook、記憶、プロファイルの作成、それに `hermes --tui` を埋め込んだチャットが使えます。OAuth かトークンの認証で守られています。
- **Ink の TUI**（`hermes --tui` または `display.interface: tui`）— ウィジェットを常設できるターミナル UI です — `references/tui-widgets.md`。
- **OpenAI 互換のプロキシ**（`hermes proxy`）— ログイン中の OAuth プロバイダをそのまま使える、ローカルの OpenAI API です。Codex CLI、Aider、Cline、あるいは自作のスクリプトをここに向ければ、API キーは要りません。

## 絶対の決まりごと（何を読み込んでいようと破らないこと） {#hard-invariants-never-violate-regardless-of-what-you-loaded}

- **プロンプトのキャッシュを壊さないこと** — 会話の途中で、過去のやり取り、ツールセット、システムプロンプトを変えてはいけません。例外は文脈の圧縮だけです。
- **メッセージの役割は交互に** — assistant が 2 回続いたり、user が 2 回続いたりしてはいけません。繰り返してよいのは `tool` の結果だけです。
- **秘密情報は `.env`、設定は `config.yaml`** — 資格情報でない設定を `.env` に書くよう利用者に言ってはいけません。
- **プロファイルを壊さないパスの解決** — コードの中では `get_hermes_home()`、セッションの中でパスを解決するときは `$HERMES_HOME` を使います。
- **`config.yaml` を利用者の代わりに手で編集しないこと** — `hermes config set KEY VAL` を使ってください。インデントが 1 つずれただけでファイルが壊れ、動いているゲートウェイが止まります。
