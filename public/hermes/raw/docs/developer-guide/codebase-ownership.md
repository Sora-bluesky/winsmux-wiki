---
title: "コードベース所有マップ"
description: "どのディレクトリがどのサブシステムに属し、それぞれの正しいドキュメント入口はどこにあるか"
upstream_path: developer-guide/codebase-ownership.md
upstream_blob: c6f85d7e1f81314183ef2c0191c62b43dc8c3c34
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/codebase-ownership
---

# コードベース所有マップ {#codebase-ownership-map}

Hermes は大きなリポジトリですが、たいていの貢献はちょうど 1 つのサブシステムにしか触れません。このページでは、それぞれのサブシステムを、そのソースディレクトリと、変更する前に読んでおきたいドキュメントの入口に対応づけます。正しい出発点のドキュメント、変更を置くべき場所、そして正しいテストディレクトリを見つけるために使ってください（テストはソースと同じ構造になっています。`tools/` のコードは `tests/tools/` で、プラグインは `tests/plugins/<type>/` で、といった具合です）。

| サブシステム | ソースディレクトリ | ドキュメントの入口 |
|-----------|-------------------|------------------|
| エージェントの中核（ループ、トランスポート、圧縮） | `agent/`, `run_agent.py` | [エージェントループ](/hermes/docs/developer-guide/agent-loop/), [コンテキスト圧縮とキャッシュ](/hermes/docs/developer-guide/context-compression-and-caching/) |
| プロンプトの組み立て | `agent/prompt_builder.py`, `agent/system_prompt.py` | [プロンプトの組み立て](/hermes/docs/developer-guide/prompt-assembly/) |
| モデルプロバイダとトランスポート | `agent/transports/`, `plugins/model-providers/`, `hermes_cli/models.py` | [プロバイダの追加](/hermes/docs/developer-guide/adding-providers/), [モデルプロバイダプラグイン](/hermes/docs/developer-guide/model-provider-plugin/), [プロバイダのランタイム](/hermes/docs/developer-guide/provider-runtime/) |
| 組み込みツール | `tools/` | [ツールの追加](/hermes/docs/developer-guide/adding-tools/), [ツールのランタイム](/hermes/docs/developer-guide/tools-runtime/) |
| メッセージングのゲートウェイ | `gateway/`, `plugins/platforms/` | [ゲートウェイの内部構造](/hermes/docs/developer-guide/gateway-internals/), [プラットフォームアダプタの追加](/hermes/docs/developer-guide/adding-platform-adapters/) |
| CLI | `hermes_cli/` | [CLI を拡張する](/hermes/docs/developer-guide/extending-the-cli/) |
| プラグインの仕組み | `plugins/` | [Hermes プラグインを作る](/hermes/docs/developer-guide/plugins/) |
| スキル（同梱・任意） | `skills/`, `optional-skills/` | [スキルを作る](/hermes/docs/developer-guide/creating-skills/) |
| cron / 定期実行ジョブ | `cron/` | [cron の内部構造](/hermes/docs/developer-guide/cron-internals/) |
| セッションの保存 | `hermes_state.py` | [セッションの保存](/hermes/docs/developer-guide/session-storage/) |
| ブラウザ関連 | `tools/browser_tool.py`, `tools/browser_supervisor.py`, `tools/browser_cdp_tool.py` | [ブラウザスーパーバイザ](/hermes/docs/developer-guide/browser-supervisor/) |
| 送信ファイアウォール | `agent/proxy_sources/iron_proxy.py` | [送信制御の内部構造](/hermes/docs/developer-guide/egress-internals/) |
| ACP（IDE 連携） | `acp_adapter/` | [ACP の内部構造](/hermes/docs/developer-guide/acp-internals/) |
| デスクトップアプリ | `apps/desktop/` | [デスクトッププラグイン SDK](/hermes/docs/developer-guide/desktop-plugin-sdk/), [ワークツリー UI の開発](/hermes/docs/developer-guide/worktree-ui-dev/) |
| TUI | `ui-tui/`, `tui_gateway/` | [ワークツリー UI の開発](/hermes/docs/developer-guide/worktree-ui-dev/) |
| ドキュメントサイト | `website/` | [貢献の手引き](/hermes/docs/developer-guide/contributing/) |
| テスト | `tests/`, `tests-js/` | [貢献の手引き → 提出する前に](/hermes/docs/developer-guide/contributing/#before-submitting) |

このマップから自然に導かれる決まりごとがいくつかあります。

- **変更はそのサブシステムの内側に収めます。** 中核のファイルを書き換えないと成立しないプラグインは、設計が怪しいサインです。代わりに汎用のプラグイン面を広げてください（リポジトリの `AGENTS.md` にある貢献の評価基準を参照）。
- **触ったソースディレクトリごとに、対応するテストディレクトリを走らせます。** `plugins/platforms/telegram/` を変更したなら、たまたま思いついたテストファイルだけでなく `tests/plugins/platforms/` 全体が緑になっている必要があります。
- **2 つのサブシステムがからむときは、狭いほうがその変更を持ちます。** エージェントの中核に分岐を足すより、アダプタやプラグイン側で直すほうを選んでください。中核はくびれの部分であり、そこへの追加はすべての API 呼び出しで代償を払うことになります。
