---
title: "コードベース所有マップ"
description: "どのディレクトリがどのサブシステムに属し、それぞれの正しいドキュメント入口はどこにあるか"
upstream_path: developer-guide/codebase-ownership.md
upstream_blob: 5507aafef6ff08406f247ec3ff99d215cfa87c71
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/codebase-ownership
---

# コードベース所有マップ {#codebase-ownership-map}

Hermes は大きなリポジトリですが、たいていの変更はちょうど一つのサブシステムだけに触れます。このページは、各サブシステムがどのソースディレクトリを持ち、それを変更する前にどのドキュメントを読めばよいかを対応づけたものです。読み始めるべきドキュメント、変更を入れるべき場所、そして対応するテストディレクトリを探すのに使ってください（テストはソースと同じ形に並んでいます。`tools/` のコードは `tests/tools/` で、プラグインは `tests/plugins/<type>/` でテストされます）。

| サブシステム | ソースディレクトリ | ドキュメントの入口 |
|-----------|-------------------|------------------|
| エージェントの中核（ループ、トランスポート、圧縮） | `agent/`, `run_agent.py` | [エージェントループ](/hermes/docs/developer-guide/agent-loop/), [コンテキストの圧縮とキャッシュ](/hermes/docs/developer-guide/context-compression-and-caching/) |
| プロンプトの組み立て | `agent/prompt_builder.py`, `agent/system_prompt.py` | [プロンプトの組み立て](/hermes/docs/developer-guide/prompt-assembly/) |
| モデルプロバイダとトランスポート | `agent/transports/`, `plugins/model-providers/`, `hermes_cli/models.py` | [プロバイダを追加する](/hermes/docs/developer-guide/adding-providers/), [モデルプロバイダプラグイン](/hermes/docs/developer-guide/model-provider-plugin/), [プロバイダのランタイム](/hermes/docs/developer-guide/provider-runtime/) |
| 組み込みツール | `tools/` | [ツールを追加する](/hermes/docs/developer-guide/adding-tools/), [ツールのランタイム](/hermes/docs/developer-guide/tools-runtime/) |
| メッセージングのゲートウェイ | `gateway/`, `plugins/platforms/` | [ゲートウェイの内部構造](/hermes/docs/developer-guide/gateway-internals/), [プラットフォームアダプタを追加する](/hermes/docs/developer-guide/adding-platform-adapters/) |
| CLI | `hermes_cli/` | [CLI を拡張する](/hermes/docs/developer-guide/extending-the-cli/) |
| プラグインの仕組み | `plugins/` | [Hermes プラグインを作る](/hermes/docs/developer-guide/plugins/) |
| スキル（同梱・追加） | `skills/`, `optional-skills/` | [スキルを作る](/hermes/docs/developer-guide/creating-skills/) |
| cron / 定時実行のジョブ | `cron/` | [cron の内部構造](/hermes/docs/developer-guide/cron-internals/) |
| セッションの保存 | `hermes_state.py`, `hermes_state_*.py` | [セッションの保存](/hermes/docs/developer-guide/session-storage/) |
| ブラウザまわり一式 | `tools/browser_tool.py`, `tools/browser_supervisor.py`, `tools/browser_cdp_tool.py` | [ブラウザのスーパーバイザ](/hermes/docs/developer-guide/browser-supervisor/) |
| 送信ファイアウォール | `agent/proxy_sources/iron_proxy.py` | [送信プロキシの内部構造](/hermes/docs/developer-guide/egress-internals/) |
| ACP（IDE 連携） | `acp_adapter/` | [ACP の内部構造](/hermes/docs/developer-guide/acp-internals/) |
| デスクトップアプリ | `apps/desktop/` | [デスクトップ用プラグイン SDK](/hermes/docs/developer-guide/desktop-plugin-sdk/), [worktree UI の開発](/hermes/docs/developer-guide/worktree-ui-dev/) |
| TUI | `ui-tui/`, `tui_gateway/` | [worktree UI の開発](/hermes/docs/developer-guide/worktree-ui-dev/) |
| ドキュメントサイト | `website/` | [開発に参加する](/hermes/docs/developer-guide/contributing/) |
| テスト | `tests/`, `tests-js/` | [開発に参加する → 提出の前に](/hermes/docs/developer-guide/contributing/#before-submitting) |

このマップから自然に導かれる決まりがいくつかあります。

- **変更はそのサブシステムの中で完結させます。** 中核のファイルを書き換えないと成り立たないプラグインは、設計が怪しいというサインです。代わりに、汎用のプラグイン用インターフェースのほうを広げてください（リポジトリの `AGENTS.md` にある変更の評価基準を参照）。
- **触ったソースディレクトリに対応するテストディレクトリを、そのつど丸ごと走らせます。** `plugins/platforms/telegram/` を変更したら、たまたま思いついたテストファイルだけでなく `tests/plugins/platforms/` 全体が緑になっている必要があります。
- **二つのサブシステムにまたがるときは、狭いほうが変更を引き受けます。** エージェントの中核に分岐を足すより、アダプタやプラグインの側で直すほうを選んでください。中核は細くくびれた部分であり、そこへ足したものの代金は API 呼び出しのたびに支払うことになります。
