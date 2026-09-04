---
title: "アーキテクチャ"
description: "Hermes Agent の内部構造 — 主要なサブシステム、実行経路、データの流れ、次に読むべき場所"
upstream_path: developer-guide/architecture.md
upstream_blob: 3640103c3de97ed7c01a3862b76b35371f9d5f06
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/architecture
---

# アーキテクチャ {#architecture}

このページは Hermes Agent の内部構造を一枚にまとめた地図です。まずここでコードベースの中での現在地をつかみ、そのうえで実装の細部は各サブシステムのドキュメントへ降りていってください。

## 全体像 {#system-overview}

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        Entry Points                                  │
│                                                                      │
│  CLI (cli.py)    Gateway (gateway/run.py)    ACP (acp_adapter/)     │
│  Batch Runner    API Server                  Python Library          │
└──────────┬──────────────┬───────────────────────┬───────────────────┘
           │              │                       │
           ▼              ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     AIAgent (run_agent.py)                          │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ Prompt       │  │ Provider     │  │ Tool         │               │
│  │ Builder      │  │ Resolution   │  │ Dispatch     │               │
│  │ (prompt_     │  │ (runtime_    │  │ (model_      │               │
│  │  builder.py) │  │  provider.py)│  │  tools.py)   │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
│         │                 │                 │                       │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐               │
│  │ Compression  │  │ 3 API Modes  │  │ Tool Registry│               │
│  │ & Caching    │  │ chat_compl.  │  │ (registry.py)│               │
│  │              │  │ codex_resp.  │  │ 70+ tools    │               │
│  │              │  │ anthropic    │  │ 28 toolsets  │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
└─────────┴─────────────────┴─────────────────┴───────────────────────┘
           │                                    │
           ▼                                    ▼
┌───────────────────┐              ┌──────────────────────┐
│ Session Storage   │              │ Tool Backends         │
│ (SQLite + FTS5)   │              │ Terminal (6 backends) │
│ hermes_state.py   │              │ Browser (5 backends)  │
│ gateway/session.py│              │ Web (4 backends)      │
└───────────────────┘              │ MCP (dynamic)         │
                                   │ File, Vision, etc.    │
                                   └──────────────────────┘
```

## ディレクトリ構成 {#directory-structure}

```text
hermes-agent/
├── run_agent.py              # AIAgent facade — loop lives in agent/conversation_loop.py + agent/turn_*.py
├── cli.py                    # HermesCLI facade — mixins in hermes_cli/cli_*_mixin.py
├── model_tools.py            # Tool discovery, schema collection, dispatch
├── toolsets.py               # Tool groupings and platform presets
├── hermes_state.py           # SQLite session/state database facade (+ hermes_state_*.py siblings)
├── hermes_constants.py       # HERMES_HOME, profile-aware paths
├── batch_runner.py           # Batch trajectory generation
│
├── agent/                    # Agent internals
│   ├── prompt_builder.py     # System prompt assembly
│   ├── context_engine.py     # ContextEngine ABC (pluggable)
│   ├── context_compressor.py # Default engine — lossy summarization
│   ├── prompt_caching.py     # Anthropic prompt caching
│   ├── auxiliary_client.py   # Auxiliary LLM for side tasks (vision, summarization)
│   ├── model_metadata.py     # Model context lengths, token estimation
│   ├── models_dev.py         # models.dev registry integration
│   ├── anthropic_adapter.py  # Anthropic Messages API format conversion
│   ├── display.py            # KawaiiSpinner, tool preview formatting
│   ├── skill_commands.py     # Skill slash commands
│   ├── memory_manager.py    # Memory manager orchestration
│   ├── memory_provider.py   # Memory provider ABC
│   └── trajectory.py         # Trajectory saving helpers
│
├── hermes_cli/               # CLI subcommands and setup
│   ├── main.py               # Entry point — `hermes` subcommands (parsers in subcommands/, main_*.py)
│   ├── config.py             # DEFAULT_CONFIG, OPTIONAL_ENV_VARS, migration
│   ├── commands.py           # COMMAND_REGISTRY — central slash command definitions
│   ├── auth.py               # PROVIDER_REGISTRY, credential resolution (+ auth_*.py siblings)
│   ├── runtime_provider.py   # Provider → api_mode + credentials
│   ├── models.py             # Model catalog, provider model lists
│   ├── model_switch.py       # /model command logic (CLI + gateway shared)
│   ├── setup.py              # Interactive setup wizard (+ setup_*.py siblings)
│   ├── skin_engine.py        # CLI theming engine
│   ├── skills_config.py      # hermes skills — enable/disable per platform
│   ├── skills_hub.py         # /skills slash command
│   ├── tools_config.py       # hermes tools — enable/disable per platform
│   ├── plugins.py            # PluginManager — discovery, loading, hooks
│   ├── callbacks.py          # Terminal callbacks (clarify, sudo, approval)
│   └── gateway.py            # hermes gateway start/stop
│
├── tools/                    # Tool implementations (one file per tool)
│   ├── registry.py           # Central tool registry
│   ├── approval.py           # Dangerous command detection
│   ├── terminal_tool.py      # Terminal orchestration
│   ├── process_registry.py   # Background process management
│   ├── file_tools.py         # read_file, write_file, patch, search_files
│   ├── web_tools.py          # web_search, web_extract
│   ├── browser_tool.py       # Browser automation tools facade (+ browser_tool_*.py siblings)
│   ├── code_execution_tool.py # execute_code sandbox
│   ├── delegate_tool.py      # Subagent delegation
│   ├── mcp_tool.py           # MCP client facade (+ mcp_tool_*.py siblings)
│   ├── credential_files.py   # File-based credential passthrough
│   ├── env_passthrough.py    # Env var passthrough for sandboxes
│   ├── ansi_strip.py         # ANSI escape stripping
│   └── environments/         # Terminal backends (local, docker, ssh, modal, daytona, singularity)
│
├── gateway/                  # Messaging platform gateway
│   ├── run.py                # GatewayRunner facade — message dispatch (+ run_*.py siblings)
│   ├── session.py            # SessionStore — conversation persistence
│   ├── delivery.py           # Outbound message delivery
│   ├── pairing.py            # DM pairing authorization
│   ├── hooks.py              # Hook discovery and lifecycle events
│   ├── mirror.py             # Cross-session message mirroring
│   ├── status.py             # Token locks, profile-scoped process tracking
│   ├── builtin_hooks/        # Extension point for always-registered hooks (none shipped)
│   └── platforms/            # Built-in adapters: signal, weixin, bluebubbles,
│                             #   qqbot, whatsapp_cloud, yuanbao, webhook, api_server
│
├── plugins/platforms/        # Bundled platform plugins: telegram, discord, slack,
│                             #   whatsapp, matrix, mattermost, email, sms, dingtalk,
│                             #   feishu, wecom, homeassistant, irc, line, teams,
│                             #   google_chat, buzz, ntfy, photon, raft, simplex
│
├── acp_adapter/              # ACP server (VS Code / Zed / JetBrains)
├── cron/                     # Scheduler (jobs.py, scheduler.py)
├── plugins/memory/           # Memory provider plugins
├── plugins/context_engine/   # Context engine plugins
├── skills/                   # Bundled skills (always available)
├── optional-skills/          # Official optional skills (install explicitly)
├── website/                  # Docusaurus documentation site
└── tests/                    # Pytest suite (~25,000 tests across ~1,250 files)
```

## データの流れ {#data-flow}

### CLI のセッション {#cli-session}

```text
User input → HermesCLI.process_input()
  → AIAgent.run_conversation()
    → prompt_builder.build_system_prompt()
    → runtime_provider.resolve_runtime_provider()
    → API call (chat_completions / codex_responses / anthropic_messages)
    → tool_calls? → model_tools.handle_function_call() → loop
    → final response → display → save to SessionDB
```

### ゲートウェイのメッセージ {#gateway-message}

```text
Platform event → Adapter.on_message() → MessageEvent
  → GatewayRunner._handle_message()
    → authorize user
    → resolve session key
    → create AIAgent with session history
    → AIAgent.run_conversation()
    → deliver response back through adapter
```

### cron のジョブ {#cron-job}

```text
Scheduler tick → load due jobs from jobs.json
  → create fresh AIAgent (no history)
  → inject attached skills as context
  → run job prompt
  → deliver response to target platform
  → update job state and next_run
```

## おすすめの読む順番 {#recommended-reading-order}

コードベースに触れるのが初めてなら、次の順で読んでください。

1. **このページ** — 現在地をつかむ
2. **[エージェントループの内部構造](/hermes/docs/developer-guide/agent-loop/)** — AIAgent の動き
3. **[プロンプトの組み立て](/hermes/docs/developer-guide/prompt-assembly/)** — システムプロンプトの作られ方
4. **[プロバイダのランタイム解決](/hermes/docs/developer-guide/provider-runtime/)** — プロバイダがどう選ばれるか
5. **[プロバイダを追加する](/hermes/docs/developer-guide/adding-providers/)** — 新しいプロバイダを足すときの実務的な手引き
6. **[ツールのランタイム](/hermes/docs/developer-guide/tools-runtime/)** — ツールの登録簿、振り分け、実行環境
7. **[セッションの保存](/hermes/docs/developer-guide/session-storage/)** — SQLite のスキーマ、FTS5、セッションの系譜
8. **[ゲートウェイの内部構造](/hermes/docs/developer-guide/gateway-internals/)** — メッセージングのゲートウェイ
9. **[コンテキストの圧縮とプロンプトキャッシュ](/hermes/docs/developer-guide/context-compression-and-caching/)** — 圧縮とキャッシュ
10. **[ACP の内部構造](/hermes/docs/developer-guide/acp-internals/)** — IDE 連携

## 主要なサブシステム {#major-subsystems}

### エージェントループ {#agent-loop}

同期的に全体を進行させるエンジンです（`AIAgent`。窓口は `run_agent.py` で、ループの本体は `agent/conversation_loop.py` と `agent/turn_*.py` にあります）。プロバイダの選択、プロンプトの組み立て、ツールの実行、リトライ、フォールバック、コールバック、圧縮、保存までを受け持ちます。プロバイダ側の違いに合わせて三つの API モードに対応します。

→ [エージェントループの内部構造](/hermes/docs/developer-guide/agent-loop/)

### プロンプトの仕組み {#prompt-system}

会話が続いていくあいだ、プロンプトを組み立てて保守し続ける部分です。

- **`system_prompt.py` + `prompt_builder.py`** — システムプロンプトを決まった順の層（`stable` → `context` → `volatile`）に組み上げます。まず人格・ツールの使い方・スキル、次にコンテキストファイル、最後に記憶・プロフィール・時刻のブロックです
- **`prompt_caching.py`** — Anthropic の前方一致キャッシュのために、キャッシュの区切り点を打ちます
- **`context_compressor.py`** — コンテキストがしきい値を超えたら、会話の中ほどのやり取りを要約します

→ [プロンプトの組み立て](/hermes/docs/developer-guide/prompt-assembly/), [コンテキストの圧縮とプロンプトキャッシュ](/hermes/docs/developer-guide/context-compression-and-caching/)

### プロバイダの解決 {#provider-resolution}

CLI・ゲートウェイ・cron・ACP・補助的な呼び出しが共通して使う、実行時の解決役です。`(provider, model)` の組を `(api_mode, api_key, base_url)` へ対応づけます。18 以上のプロバイダ、OAuth の流れ、資格情報のプール、別名の解決を扱います。

→ [プロバイダのランタイム解決](/hermes/docs/developer-guide/provider-runtime/)

### ツールの仕組み {#tool-system}

中央のツール登録簿（`tools/registry.py`）に、およそ 28 のツールセットにまたがる 70 以上のツールが登録されています。各ツールのファイルは読み込まれた時点で自分を登録します。登録簿はスキーマの収集、振り分け、利用可否の判定、エラーの包み込みを担当します。ターミナル系のツールは 7 つの実行基盤（ローカル、Docker、SSH、Daytona、Modal、Singularity、Vercel Sandbox）に対応します。

→ [ツールのランタイム](/hermes/docs/developer-guide/tools-runtime/)

### セッションの永続化 {#session-persistence}

FTS5 の全文検索を備えた SQLite ベースのセッション保存です。セッションには系譜（圧縮をまたいだ親子関係）の記録があり、プラットフォームごとに分離され、書き込みは競合を捌きながら不可分に行われます。

→ [セッションの保存](/hermes/docs/developer-guide/session-storage/)

### メッセージングのゲートウェイ {#messaging-gateway}

常駐して動き続けるプロセスです。25 以上のプラットフォーム用アダプタ（組み込みと同梱プラグイン）、セッションの一元的な振り分け、利用者の認可（許可リストと DM でのペアリング）、スラッシュコマンドの振り分け、フックの仕組み、cron の刻み、バックグラウンドの保守処理を持ちます。

→ [ゲートウェイの内部構造](/hermes/docs/developer-guide/gateway-internals/)

### プラグインの仕組み {#plugin-system}

見つけ方は三通りです。`~/.hermes/plugins/`（利用者ごと）、`.hermes/plugins/`（プロジェクトごと）、そして pip のエントリポイントです。プラグインはコンテキスト API を通じてツール・フック・CLI コマンドを登録します。専用の型が二つあり、記憶のプロバイダ（`plugins/memory/`）とコンテキストエンジン（`plugins/context_engine/`）です。どちらも単一選択で、同時に有効にできるのはそれぞれ一つだけです。設定は `hermes plugins` か `config.yaml` で行います。

→ [プラグインの手引き](/hermes/docs/developer-guide/plugins/), [記憶プロバイダのプラグイン](/hermes/docs/developer-guide/memory-provider-plugin/)

### cron {#cron}

シェルのタスクではなく、エージェントのタスクとして一級に扱われます。ジョブは JSON に保存され、複数のスケジュール記法に対応し、スキルやスクリプトを添付でき、どのプラットフォームにも結果を届けられます。

→ [cron の内部構造](/hermes/docs/developer-guide/cron-internals/)

### ACP 連携 {#acp-integration}

stdio と JSON-RPC を通じて、VS Code・Zed・JetBrains にとってエディタ標準のエージェントとして Hermes を見せます。

→ [ACP の内部構造](/hermes/docs/developer-guide/acp-internals/)

### 軌跡 {#trajectories}

エージェントのセッションから ShareGPT 形式の軌跡を作り、学習データの生成に使えるようにします。

→ [軌跡と学習用フォーマット](/hermes/docs/developer-guide/trajectory-format/)

## 設計の指針 {#design-principles}

| 指針 | 実際にどういうことか |
|-----------|--------------------------|
| **プロンプトを揺らさない** | システムプロンプトは会話の途中で変わりません。`/model` のような明示的な操作を除き、キャッシュを壊す書き換えは起きません。 |
| **実行が見えている** | どのツール呼び出しもコールバックを通じて利用者に見えます。進捗は CLI ではスピナー、ゲートウェイではチャットのメッセージとして流れます。 |
| **途中で止められる** | API の呼び出しもツールの実行も、利用者の入力やシグナルで途中で打ち切れます。 |
| **中核はプラットフォームに依存しない** | 一つの AIAgent クラスが CLI・ゲートウェイ・ACP・バッチ・API サーバのすべてを賄います。プラットフォームごとの違いは入口の側にあり、エージェントの中にはありません。 |
| **結合をゆるく保つ** | 任意のサブシステム（MCP、プラグイン、記憶のプロバイダ、RL 環境）は、固い依存ではなく登録簿の形と check_fn による出し分けで組み込まれます。 |
| **プロファイルごとに独立** | プロファイル（`hermes -p <name>`）ごとに、専用の HERMES_HOME・設定・記憶・セッション・ゲートウェイの PID を持ちます。複数のプロファイルを同時に走らせられます。 |

## ファイルの依存の連なり {#file-dependency-chain}

```text
tools/registry.py  (no deps — imported by all tool files)
       ↑
tools/*.py  (each calls registry.register() at import time)
       ↑
model_tools.py  (imports tools/registry + triggers tool discovery)
       ↑
run_agent.py, cli.py, batch_runner.py, environments/
```

この連なりが意味するのは、ツールの登録がエージェントの実体より前、読み込みの時点で済んでいるということです。トップレベルで `registry.register()` を呼んでいる `tools/*.py` は自動的に見つかります。取り込むファイルの一覧を手で書く必要はありません。
