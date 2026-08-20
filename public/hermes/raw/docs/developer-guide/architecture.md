---
title: "アーキテクチャ"
description: "Hermes Agent の内部構造 — 主要なサブシステム、実行経路、データの流れ、次に読むべき場所"
upstream_path: developer-guide/architecture.md
upstream_blob: 6c1f6cafa412c399a73475da93127265b677f669
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/architecture
---

# アーキテクチャ {#architecture}

このページは、Hermes Agent の内部構造を上から見渡すための地図です。まずここでコードベースの中の位置関係をつかみ、そのうえで実装の詳細はサブシステムごとのドキュメントへ進んでください。

## システム全体像 {#system-overview}

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
├── run_agent.py              # AIAgent — core conversation loop (large file)
├── cli.py                    # HermesCLI — interactive terminal UI (large file)
├── model_tools.py            # Tool discovery, schema collection, dispatch
├── toolsets.py               # Tool groupings and platform presets
├── hermes_state.py           # SQLite session/state database with FTS5
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
│   ├── main.py               # Entry point — all `hermes` subcommands (large file)
│   ├── config.py             # DEFAULT_CONFIG, OPTIONAL_ENV_VARS, migration
│   ├── commands.py           # COMMAND_REGISTRY — central slash command definitions
│   ├── auth.py               # PROVIDER_REGISTRY, credential resolution
│   ├── runtime_provider.py   # Provider → api_mode + credentials
│   ├── models.py             # Model catalog, provider model lists
│   ├── model_switch.py       # /model command logic (CLI + gateway shared)
│   ├── setup.py              # Interactive setup wizard (large file)
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
│   ├── browser_tool.py       # 10 browser automation tools
│   ├── code_execution_tool.py # execute_code sandbox
│   ├── delegate_tool.py      # Subagent delegation
│   ├── mcp_tool.py           # MCP client (large file)
│   ├── credential_files.py   # File-based credential passthrough
│   ├── env_passthrough.py    # Env var passthrough for sandboxes
│   ├── ansi_strip.py         # ANSI escape stripping
│   └── environments/         # Terminal backends (local, docker, ssh, modal, daytona, singularity)
│
├── gateway/                  # Messaging platform gateway
│   ├── run.py                # GatewayRunner — message dispatch (large file)
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

1. **このページ** — 全体の位置関係をつかむ
2. **[エージェントループの内部](/hermes/docs/developer-guide/agent-loop/)** — AIAgent の動き方
3. **[プロンプトの組み立て](/hermes/docs/developer-guide/prompt-assembly/)** — システムプロンプトの作られ方
4. **[プロバイダーの実行時解決](/hermes/docs/developer-guide/provider-runtime/)** — プロバイダーの選ばれ方
5. **[プロバイダーを追加する](/hermes/docs/developer-guide/adding-providers/)** — 新しいプロバイダーを足すときの実践的な手引き
6. **[ツールのランタイム](/hermes/docs/developer-guide/tools-runtime/)** — ツールのレジストリ、振り分け、実行環境
7. **[セッションの保存](/hermes/docs/developer-guide/session-storage/)** — SQLite のスキーマ、FTS5、セッションの系譜
8. **[ゲートウェイの内部](/hermes/docs/developer-guide/gateway-internals/)** — メッセージングのゲートウェイ
9. **[コンテキストの圧縮とプロンプトのキャッシュ](/hermes/docs/developer-guide/context-compression-and-caching/)** — 圧縮とキャッシュ
10. **[ACP の内部](/hermes/docs/developer-guide/acp-internals/)** — IDE との連携

## 主なサブシステム {#major-subsystems}

### エージェントループ {#agent-loop}

同期的に処理を組み立てるエンジンです（`run_agent.py` の `AIAgent`）。プロバイダーの選択、プロンプトの構築、ツールの実行、再試行、フォールバック、コールバック、圧縮、保存までを担います。プロバイダーの実装の違いに応じて、3 つの API モードに対応しています。

→ [エージェントループの内部](/hermes/docs/developer-guide/agent-loop/)

### プロンプトの仕組み {#prompt-system}

会話の一生を通じて、プロンプトを組み立てて保守する部分です。

- **`system_prompt.py` と `prompt_builder.py`** — システムプロンプトを順序のある層（`stable` → `context` → `volatile`）として組み上げます。まず人格・ツールの案内・スキル、次にコンテキストファイル、最後に記憶・プロフィール・タイムスタンプのブロックです
- **`prompt_caching.py`** — 前方一致でキャッシュを効かせるため、Anthropic のキャッシュ区切りを入れます
- **`context_compressor.py`** — コンテキストがしきい値を超えたら、会話の途中のやり取りを要約します

→ [プロンプトの組み立て](/hermes/docs/developer-guide/prompt-assembly/)、[コンテキストの圧縮とプロンプトのキャッシュ](/hermes/docs/developer-guide/context-compression-and-caching/)

### プロバイダーの解決 {#provider-resolution}

CLI・ゲートウェイ・cron・ACP・補助的な呼び出しが共通して使う、実行時のリゾルバーです。`(provider, model)` の組を `(api_mode, api_key, base_url)` に対応づけます。18 種類以上のプロバイダー、OAuth の流れ、認証情報のプール、別名の解決に対応しています。

→ [プロバイダーの実行時解決](/hermes/docs/developer-guide/provider-runtime/)

### ツールの仕組み {#tool-system}

中心となるツールのレジストリ（`tools/registry.py`）には、約 28 のツールセットにまたがる 70 以上のツールが登録されています。各ツールのファイルは、読み込まれた時点で自分自身を登録します。レジストリはスキーマの収集、振り分け、利用可否の判定、エラーの包み込みを担当します。ターミナル系のツールは 7 つの実行環境に対応しています（local、Docker、SSH、Daytona、Modal、Singularity、Vercel Sandbox）。

→ [ツールのランタイム](/hermes/docs/developer-guide/tools-runtime/)

### セッションの永続化 {#session-persistence}

SQLite を使ったセッションの保存で、FTS5 による全文検索が付いています。セッションには系譜の追跡（圧縮をまたいだ親子関係）、プラットフォームごとの分離、競合を扱うアトミックな書き込みがあります。

→ [セッションの保存](/hermes/docs/developer-guide/session-storage/)

### メッセージングのゲートウェイ {#messaging-gateway}

25 以上のプラットフォームのアダプター（組み込みと同梱プラグイン）を抱えて動き続けるプロセスです。セッションの振り分けの一本化、ユーザーの認可（許可リストと DM のペアリング）、スラッシュコマンドの振り分け、フックの仕組み、cron の刻み、そしてバックグラウンドの保守を行います。

→ [ゲートウェイの内部](/hermes/docs/developer-guide/gateway-internals/)

### プラグインの仕組み {#plugin-system}

読み込み元は 3 か所です。`~/.hermes/plugins/`（ユーザー）、`.hermes/plugins/`（プロジェクト）、そして pip のエントリーポイントです。プラグインはコンテキスト API を通じて、ツール・フック・CLI コマンドを登録します。専用のプラグインの型が 2 つあります。記憶のプロバイダー（`plugins/memory/`）とコンテキストエンジン（`plugins/context_engine/`）です。どちらも単一選択で、同時に有効にできるのはそれぞれ 1 つだけです。設定は `hermes plugins` か `config.yaml` で行います。

→ [プラグインの手引き](/hermes/docs/developer-guide/plugins/)、[記憶プロバイダーのプラグイン](/hermes/docs/developer-guide/memory-provider-plugin/)

### cron {#cron}

シェルのタスクではなく、エージェントのタスクとして一級に扱われます。ジョブは JSON に保存され、複数のスケジュール形式に対応し、スキルやスクリプトを紐づけられ、どのプラットフォームにも結果を届けられます。

→ [cron の内部](/hermes/docs/developer-guide/cron-internals/)

### ACP との連携 {#acp-integration}

Hermes を、stdio と JSON-RPC 越しにエディターへ組み込めるエージェントとして公開します。対応するのは VS Code、Zed、JetBrains です。

→ [ACP の内部](/hermes/docs/developer-guide/acp-internals/)

### トラジェクトリ {#trajectories}

エージェントのセッションから、学習データ用に ShareGPT 形式のトラジェクトリを生成します。

→ [トラジェクトリと学習用フォーマット](/hermes/docs/developer-guide/trajectory-format/)

## 設計の原則 {#design-principles}

| 原則 | 実際にどういうことか |
|-----------|--------------------------|
| **プロンプトを揺らさない** | システムプロンプトは会話の途中で変わりません。利用者が明示的に操作した場合（`/model`）を除き、キャッシュを壊す書き換えは行いません。 |
| **実行が見えている** | すべてのツールの呼び出しが、コールバックを通じて利用者に見えます。進行状況は CLI ではスピナー、ゲートウェイではチャットのメッセージで伝わります。 |
| **中断できる** | API の呼び出しもツールの実行も、利用者の入力やシグナルで途中で止められます。 |
| **コアはプラットフォームを選ばない** | ひとつの AIAgent クラスが、CLI・ゲートウェイ・ACP・バッチ・API サーバーのすべてを支えます。プラットフォームごとの違いはエントリーポイント側にあり、エージェントの中にはありません。 |
| **結合をゆるく保つ** | 任意のサブシステム（MCP、プラグイン、記憶のプロバイダー、強化学習の環境）は、固い依存ではなくレジストリのパターンと check_fn による切り替えでつながっています。 |
| **プロファイルの分離** | プロファイル（`hermes -p <name>`）ごとに、独立した HERMES_HOME・設定・記憶・セッション・ゲートウェイの PID を持ちます。複数のプロファイルを同時に動かせます。 |

## ファイルの依存関係 {#file-dependency-chain}

```text
tools/registry.py  (no deps — imported by all tool files)
       ↑
tools/*.py  (each calls registry.register() at import time)
       ↑
model_tools.py  (imports tools/registry + triggers tool discovery)
       ↑
run_agent.py, cli.py, batch_runner.py, environments/
```

この並びが意味するのは、ツールの登録がエージェントのインスタンスを作るより前、読み込みの時点で終わっているということです。トップレベルで `registry.register()` を呼んでいる `tools/*.py` のファイルは自動的に見つかるので、import の一覧を手で管理する必要はありません。
