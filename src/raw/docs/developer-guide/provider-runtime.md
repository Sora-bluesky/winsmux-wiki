---
title: "プロバイダの実行時解決"
description: "Hermes が実行時にプロバイダ、認証情報、API モード、補助モデルをどう決めるか"
upstream_path: developer-guide/provider-runtime.md
upstream_blob: 9cfd90097dda8272f727a97a82a271691b383ba0
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/provider-runtime
---

# プロバイダの実行時解決 {#provider-runtime-resolution}

Hermes には、次の場面で共通して使われるプロバイダの解決処理があります。

- CLI
- ゲートウェイ
- cron ジョブ
- ACP
- 補助モデルの呼び出し

主な実装は次のとおりです。

- `hermes_cli/runtime_provider.py` — 認証情報の解決、独自エンドポイントの実行時解決
- `hermes_cli/auth.py` — プロバイダのレジストリ、`resolve_provider()`
- `hermes_cli/model_switch.py` — CLI とゲートウェイで共通の `/model` 切り替え処理
- `agent/auxiliary_client.py` — 補助モデルの振り分け
- `providers/` — 抽象基底クラスとレジストリの入口（`ProviderProfile`、`register_provider`、`get_provider_profile`、`list_providers`）
- `plugins/model-providers/<name>/` — プロバイダごとのプラグイン（同梱）。`api_mode`、`base_url`、`env_vars`、`fallback_models` を宣言し、最初に参照されたときに自分をレジストリへ登録します。`$HERMES_HOME/plugins/model-providers/<name>/` にある利用者のプラグインは、同じ名前の同梱プラグインより優先されます。

`providers/` の `get_provider_profile()` は、プロバイダ ID に対応する `ProviderProfile` を返します。`runtime_provider.py` は解決の時点でこれを呼び、正式な `base_url`、優先順に並んだ `env_vars`、`api_mode`、`fallback_models` を得ます。同じ情報を複数のファイルに書き写す必要はありません。`plugins/model-providers/<your-provider>/`（または `$HERMES_HOME/plugins/model-providers/<your-provider>/`）に `register_provider()` を呼ぶプラグインを追加すれば、`runtime_provider.py` はそれを拾います。解決処理そのものに分岐を足す必要はありません。

新しくプロバイダを一級市民として追加したい場合は、このページと合わせて [プロバイダの追加](/hermes/docs/developer-guide/adding-providers/) と [モデルプロバイダのプラグインガイド](/hermes/docs/developer-guide/model-provider-plugin/) も読んでください。

## 解決の優先順位 {#resolution-precedence}

大まかには、プロバイダは次の順で決まります。

1. CLI や実行時に明示された指定
2. `config.yaml` のモデル・プロバイダ設定
3. 環境変数
4. プロバイダごとの既定値、または自動解決

この順序には意味があります。通常の実行では、Hermes は保存されたモデル・プロバイダの選択を正とみなします。こうしておけば、シェルに残った古い export が、利用者が `hermes model` で最後に選んだ接続先を黙って上書きすることはありません。

## プロバイダ {#providers}

現在のプロバイダの系統には次のものがあります（同梱されているものの全体は `plugins/model-providers/` を参照してください）。

- AI Gateway (Vercel)
- OpenRouter
- Nous Portal
- OpenAI Codex
- Copilot / Copilot ACP
- Anthropic（ネイティブ）
- Google / Gemini（`gemini`）
- Alibaba / DashScope（`alibaba`、`alibaba-coding-plan`）
- DeepSeek
- Z.AI
- Kimi / Moonshot（`kimi-coding`、`kimi-coding-cn`）
- MiniMax（`minimax`、`minimax-cn`、`minimax-oauth`）
- Kilo Code
- Hugging Face
- OpenCode Zen / OpenCode Go
- AWS Bedrock
- Azure Foundry
- NVIDIA NIM
- xAI (Grok)
- Arcee
- GMI Cloud
- StepFun
- Qwen OAuth
- Xiaomi
- Ollama Cloud
- LM Studio
- Tencent TokenHub
- 独自エンドポイント（`provider: custom`）— OpenAI 互換のあらゆるエンドポイントを一級のプロバイダとして扱えます
- 名前付きの独自プロバイダ（config.yaml の `providers:` 辞書。従来の `custom_providers` リストも後方互換のため読み込まれます）

## 実行時解決が返すもの {#output-of-runtime-resolution}

実行時の解決処理は、次のような情報を返します。

- `provider`
- `api_mode`
- `base_url`
- `api_key`
- `source`
- 有効期限や更新情報など、プロバイダ固有のメタデータ

## なぜ重要か {#why-this-matters}

この解決処理があるおかげで、Hermes は次の場面で認証と実行時の処理を共有できます。

- `hermes chat`
- ゲートウェイでのメッセージ処理
- 新しいセッションで動く cron ジョブ
- ACP のエディタセッション
- 補助モデルの処理

## AI Gateway {#ai-gateway}

`~/.hermes/.env` に `AI_GATEWAY_API_KEY` を設定し、`--provider ai-gateway` を付けて実行します。Hermes はゲートウェイの `/models` エンドポイントから利用できるモデルを取得し、ツール呼び出しに対応した言語モデルだけに絞り込みます。

## OpenRouter、AI Gateway、OpenAI 互換の独自ベース URL {#openrouter-ai-gateway-and-custom-openai-compatible-base-urls}

複数のプロバイダのキー（`OPENROUTER_API_KEY`、`AI_GATEWAY_API_KEY`、`OPENAI_API_KEY` など）が同時に存在するとき、独自のエンドポイントに誤ったキーが漏れないようにする仕組みが Hermes にはあります。

各プロバイダの API キーは、それぞれのベース URL に限って使われます。

- `OPENROUTER_API_KEY` は `openrouter.ai` のエンドポイントにだけ送られます
- `AI_GATEWAY_API_KEY` は `ai-gateway.vercel.sh` のエンドポイントにだけ送られます
- `OPENAI_API_KEY` は独自エンドポイント向けと、最後の受け皿として使われます

Hermes は次の 2 つも区別します。

- 利用者が選んだ実際の独自エンドポイント
- 独自エンドポイントが設定されていないときに使われる OpenRouter への切り替え

この区別は、とくに次の場面で効いてきます。

- ローカルで動かすモデルのサーバー
- OpenRouter でも AI Gateway でもない OpenAI 互換の API
- セットアップをやり直さずにプロバイダを切り替える場合
- 現在のシェルで `OPENAI_BASE_URL` を export していなくても動き続けてほしい、設定に保存済みの独自エンドポイント

## Anthropic ネイティブの経路 {#native-anthropic-path}

Anthropic はもう「OpenRouter 経由でのみ」ではありません。

プロバイダの解決で `anthropic` が選ばれると、Hermes は次を使います。

- `api_mode = anthropic_messages`
- Anthropic の Messages API そのもの
- 変換のための `agent/anthropic_adapter.py`

Anthropic ネイティブの認証情報の解決では、更新可能な Claude Code の認証情報が、コピーした環境変数のトークンより優先されます（両方ある場合）。実際には次のようになります。

- 更新可能な認証を含む Claude Code の認証情報ファイルが、優先して使われます
- 手動で設定した `ANTHROPIC_TOKEN` / `CLAUDE_CODE_OAUTH_TOKEN` も、明示的な上書きとして引き続き機能します
- Hermes はネイティブの Messages API を呼ぶ前に、Anthropic の認証情報の更新を先回りして行います
- それでも 401 が返った場合は、Anthropic のクライアントを作り直して 1 度だけ再試行します

## OpenAI Codex の経路 {#openai-codex-path}

Codex は Responses API を使う別の経路を通ります。

- `api_mode = codex_responses`
- 専用の認証情報の解決と、認証情報ストアへの対応

## 補助モデルの振り分け {#auxiliary-model-routing}

次のような補助的な処理は、

- 画像の認識
- Web から抽出した内容の要約
- 文脈の圧縮のための要約
- スキルハブの操作
- MCP の補助的な操作
- メモリの書き出し

会話用のメインのモデルとは別に、独自のプロバイダやモデルを使えます。

補助的な処理にプロバイダ `main` が設定されている場合、Hermes は通常のチャットと同じ共通の実行時解決を通します。実際には次のようになります。

- 環境変数で指定した独自エンドポイントも使えます
- `hermes model` や `config.yaml` で保存した独自エンドポイントも使えます
- 補助の振り分けは、保存済みの実際の独自エンドポイントと OpenRouter への切り替えを区別できます

## 予備のモデル {#fallback-models}

Hermes は予備のプロバイダの連なりを設定できます。`(provider, model)` の組を並べたリストで、主モデルがエラーになったときに順に試されます。従来の 1 組だけの `fallback_model` 辞書も後方互換のために受け付けます（最初の書き込み時に移行されます）。

### 内部の動き {#how-it-works-internally}

1. **保持**: `AIAgent.__init__` が `fallback_model` の辞書を保持し、`_fallback_activated = False` を設定します。

2. **発火する箇所**: `_try_activate_fallback()` は、`run_agent.py` のメインの再試行ループの 3 か所から呼ばれます:
   - API の応答が不正（choices が None、内容が欠落）なまま再試行の上限に達したとき
   - 再試行しても意味のないクライアントエラー（HTTP 401、403、404）のとき
   - 一時的なエラー（HTTP 429、500、502、503）で再試行の上限に達したとき

3. **切り替えの流れ**（`_try_activate_fallback`）:
   - すでに切り替え済み、または未設定なら、ただちに `False` を返します
   - `auxiliary_client.py` の `resolve_provider_client()` を呼び、正しい認証情報を持つ新しいクライアントを作ります
   - `api_mode` を決めます: openai-codex なら `codex_responses`、anthropic なら `anthropic_messages`、それ以外はすべて `chat_completions`
   - その場で差し替えます: `self.model`、`self.provider`、`self.base_url`、`self.api_mode`、`self.client`、`self._client_kwargs`
   - anthropic に切り替える場合は、OpenAI 互換ではなく Anthropic ネイティブのクライアントを作ります
   - プロンプトキャッシュの可否を評価し直します（OpenRouter 上の Claude 系モデルでは有効になります）
   - `_fallback_activated = True` を設定します — 二度目の発火を防ぎます
   - 再試行の回数を 0 に戻し、ループを続けます

4. **設定の流れ**:
   - CLI: `hermes_cli/fallback_config.get_fallback_chain()` で予備の連なりを読み、`AIAgent(fallback_model=...)` に渡します
   - ゲートウェイ: `gateway/run.py._load_fallback_model()` が `config.yaml` を読み、`AIAgent` に渡します
   - 検証: `provider` と `model` の両方が空でない必要があります。そうでなければ予備は無効になります

### 予備が働かないもの {#what-does-not-support-fallback}

- **サブエージェントへの委任**（`tools/delegate_tool.py`）: サブエージェントは親のプロバイダを引き継ぎますが、予備の設定は引き継ぎません
- **補助的な処理**: 独自のプロバイダ自動判定の流れを使います（上の「補助モデルの振り分け」を参照）

cron ジョブは予備に **対応しています**。`run_job()` が `config.yaml` から `fallback_providers`（または従来の `fallback_model`）を読み、`AIAgent(fallback_model=...)` に渡します。ゲートウェイの `_load_fallback_model()` と同じ形です。[cron の内部構造](/hermes/docs/developer-guide/cron-internals/) を参照してください。

### テストでの確認 {#test-coverage}

予備の挙動は、いくつかのテストで確認されています。

- `tests/run_agent/test_fallback_credential_isolation.py` — 主モデルと予備モデルの認証情報が混ざらないこと
- `tests/hermes_cli/test_fallback_cmd.py` — CLI の `/fallback` コマンド
- `tests/gateway/test_fallback_eviction.py` — ゲートウェイが失敗したプロバイダを外すこと

## 関連ドキュメント {#related-docs}

- [エージェントループの内部構造](/hermes/docs/developer-guide/agent-loop/)
- [ACP の内部構造](/hermes/docs/developer-guide/acp-internals/)
- [文脈の圧縮とプロンプトキャッシュ](/hermes/docs/developer-guide/context-compression-and-caching/)
