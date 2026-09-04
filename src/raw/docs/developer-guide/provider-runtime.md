---
title: "実行時のプロバイダー解決"
description: "Hermes が実行時にプロバイダー・資格情報・API モード・補助モデルをどう決めているか"
upstream_path: developer-guide/provider-runtime.md
upstream_blob: 3e2c723a6b96f35e088a6b2b8775fcbed83ee4bc
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/provider-runtime
---

# 実行時のプロバイダー解決 {#provider-runtime-resolution}

Hermes には、共通のプロバイダー解決処理があり、次のどこからでも使われます。

- CLI
- ゲートウェイ
- cron のジョブ
- ACP
- 補助モデルの呼び出し

主な実装は次のファイルです。

- `hermes_cli/runtime_provider.py` — 資格情報の解決、独自エンドポイントの実行時解決
- `hermes_cli/auth.py` — プロバイダーの登録簿と `resolve_provider()`
- `hermes_cli/model_switch.py` — CLI とゲートウェイで共通の `/model` 切り替え処理
- `agent/auxiliary_client.py` — 補助モデルの振り分け
- `providers/` — 抽象基底クラスと登録簿の入口 (`ProviderProfile`、`register_provider`、`get_provider_profile`、`list_providers`)
- `plugins/model-providers/<name>/` — プロバイダーごとのプラグイン (同梱)。`api_mode`、`base_url`、`env_vars`、`fallback_models` を宣言し、最初に使われた時点で自分を登録簿へ登録します。`$HERMES_HOME/plugins/model-providers/<name>/` に置いたユーザー側のプラグインは、同じ名前の同梱プラグインより優先されます。

`providers/` の `get_provider_profile()` は、プロバイダー ID を渡すと `ProviderProfile` を返します。`runtime_provider.py` は解決のたびにこれを呼び、正式な `base_url`、優先順つきの `env_vars`、`api_mode`、`fallback_models` を受け取ります。同じ情報をあちこちのファイルに書き写さずに済むわけです。`plugins/model-providers/<your-provider>/` (または `$HERMES_HOME/plugins/model-providers/<your-provider>/`) に新しいプラグインを置いて `register_provider()` を呼べば、それだけで `runtime_provider.py` が拾ってくれます。解決処理そのものに分岐を足す必要はありません。

新しいプロバイダーを一級市民として足したい場合は、このページと合わせて [プロバイダーを追加する](/hermes/docs/developer-guide/adding-providers/) と [モデルプロバイダープラグインの手引き](/hermes/docs/developer-guide/model-provider-plugin/) も読んでください。

## 解決の優先順位 {#resolution-precedence}

おおまかには、プロバイダーは次の順で決まります。

1. CLI や実行時に明示された指定
2. `config.yaml` のモデル・プロバイダー設定
3. 環境変数
4. プロバイダーごとの既定値、または自動解決

この順番には意味があります。ふだんの実行では、保存されたモデル・プロバイダーの選択こそが正しい値だ、と Hermes は考えるからです。こうしておけば、シェルに残った古い export が、`hermes model` で最後に選んだエンドポイントを黙って上書きしてしまうことがありません。

## プロバイダー {#providers}

いま扱えるプロバイダーの系統は次のとおりです (同梱されている全部は `plugins/model-providers/` を見てください)。

- AI Gateway (Vercel)
- OpenRouter
- Nous Portal
- OpenAI Codex
- Copilot / Copilot ACP
- Anthropic (ネイティブ)
- Google / Gemini (`gemini`)
- Alibaba / DashScope (`alibaba`、`alibaba-coding-plan`)
- DeepSeek
- Z.AI
- Kimi / Moonshot (`kimi-coding`、`kimi-coding-cn`)
- MiniMax (`minimax`、`minimax-cn`、`minimax-oauth`)
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
- Custom (`provider: custom`) — OpenAI 互換のエンドポイントなら何でも扱える、一級市民のプロバイダー
- 名前付きの独自プロバイダー (config.yaml の `providers:` 辞書。古い `custom_providers` のリストも、互換のためにいまも読まれます)

## 実行時解決が返すもの {#output-of-runtime-resolution}

解決処理は、たとえば次のような値を返します。

- `provider`
- `api_mode`
- `base_url`
- `api_key`
- `source`
- 有効期限や更新の情報など、プロバイダー固有の付帯情報

## これが効いてくる場面 {#why-this-matters}

この解決処理があるおかげで、Hermes は認証と実行時の判断を次のあいだで共有できます。

- `hermes chat`
- ゲートウェイでのメッセージ処理
- まっさらなセッションで動く cron のジョブ
- ACP のエディターセッション
- 補助モデルの仕事

## AI Gateway {#ai-gateway}

`~/.hermes/.env` に `AI_GATEWAY_API_KEY` を書き、`--provider ai-gateway` を付けて実行します。Hermes はゲートウェイの `/models` エンドポイントから使えるモデルを取ってきて、ツールを使える言語モデルだけに絞り込みます。

## OpenRouter・AI Gateway・OpenAI 互換の独自ベース URL {#openrouter-ai-gateway-and-custom-openai-compatible-base-urls}

複数のプロバイダーの鍵がある場合 (たとえば `OPENROUTER_API_KEY`、`AI_GATEWAY_API_KEY`、`OPENAI_API_KEY` が同居しているとき)、独自エンドポイントへ間違った鍵を送ってしまわないための処理が Hermes には入っています。

それぞれの API キーは、自分のベース URL だけに使われます。

- `OPENROUTER_API_KEY` は `openrouter.ai` のエンドポイントにしか送られません
- `AI_GATEWAY_API_KEY` は `ai-gateway.vercel.sh` のエンドポイントにしか送られません
- `OPENAI_API_KEY` は独自エンドポイント向け、および最後の受け皿として使われます

Hermes は次の 2 つも区別します。

- こちらが選んだ本物の独自エンドポイント
- 独自エンドポイントを設定していないときに使われる、OpenRouter への切り替え経路

この区別がとくに効くのは、次のような場面です。

- 手元で動かすモデルサーバー
- OpenRouter でも AI Gateway でもない、OpenAI 互換の API
- セットアップをやり直さずにプロバイダーを切り替えるとき
- 設定に保存した独自エンドポイントを、いまのシェルに `OPENAI_BASE_URL` が export されていなくても使い続けたいとき

## Anthropic のネイティブ経路 {#native-anthropic-path}

Anthropic はもう「OpenRouter 経由でだけ使うもの」ではありません。

解決の結果が `anthropic` になったとき、Hermes は次を使います。

- `api_mode = anthropic_messages`
- Anthropic の Messages API そのもの
- 変換のための `agent/anthropic_adapter.py`

ネイティブの Anthropic では、資格情報の解決は、更新できる Claude Code の資格情報を、環境変数へ写したトークンより優先するようになりました。実際には次のように動きます。

- 更新できる認証情報を含む Claude Code の資格情報ファイルがあれば、そちらを優先します
- 手で入れた `ANTHROPIC_TOKEN` や `CLAUDE_CODE_OAUTH_TOKEN` の値も、明示的な上書きとしていまも効きます
- ネイティブの Messages API を呼ぶ前に、Anthropic の資格情報の更新を先に済ませます
- 401 が返ったときは、Anthropic のクライアントを作り直して一度だけやり直す、という受け皿も残しています

## OpenAI Codex の経路 {#openai-codex-path}

Codex は Responses API を使う別経路です。

- `api_mode = codex_responses`
- 専用の資格情報の解決と、認証情報の保管への対応

## 補助モデルの振り分け {#auxiliary-model-routing}

次のような補助的な仕事は、

- 画像の読み取り
- Web から抜き出した内容の要約
- コンテキスト圧縮のための要約
- スキルハブの操作
- MCP の補助的な操作
- メモリーの書き出し

会話に使うメインのモデルとは別に、自前のプロバイダー・モデルを指定できます。

補助的な仕事にプロバイダー `main` を指定すると、Hermes はふだんのチャットと同じ共通経路でそれを解決します。実際には次のようになります。

- 環境変数で指定した独自エンドポイントがそのまま効きます
- `hermes model` や `config.yaml` で保存した独自エンドポイントも効きます
- 保存された本物の独自エンドポイントなのか、OpenRouter への切り替えなのかを、補助側でも見分けられます

## 予備のモデル {#fallback-models}

Hermes では、予備のプロバイダーの連なりを設定できます。`(provider, model)` を並べたリストで、メインのモデルがエラーになったときに上から順に試されます。古い形式である 1 組だけの `fallback_model` 辞書も、互換のためにいまも受け付けます (最初の書き込み時に新しい形式へ移ります)。

### 内部ではどう動くか {#how-it-works-internally}

1. **保存**: `AIAgent.__init__` が `fallback_model` の辞書を保持し、`_fallback_activated = False` にします。

2. **切り替わるきっかけ**: `_try_activate_fallback()` (中身は `agent/chat_completion_helpers.py` の `try_activate_fallback()` に渡されます) が、ターン処理の 3 か所 (`agent/turn_api_error.py`、`agent/turn_response_check.py`、`agent/turn_recovery.py`) から呼ばれます。
   - API の応答が壊れていて (choices が None、本文が無いなど)、やり直しの上限に達したとき
   - やり直しても意味のないクライアント側のエラー (HTTP 401、403、404) が出たとき
   - 一時的なエラー (HTTP 429、500、502、503) でやり直しの上限に達したとき

3. **切り替えの流れ** (`_try_activate_fallback`):
   - すでに切り替え済み、または設定が無ければ、その場で `False` を返します
   - `auxiliary_client.py` の `resolve_provider_client()` を呼び、認証まで整えた新しいクライアントを作ります
   - `api_mode` を決めます。openai-codex なら `codex_responses`、anthropic なら `anthropic_messages`、それ以外は `chat_completions` です
   - その場で差し替えます。対象は `self.model`、`self.provider`、`self.base_url`、`self.api_mode`、`self.client`、`self._client_kwargs` です
   - anthropic に切り替える場合は、OpenAI 互換ではなく Anthropic のネイティブクライアントを作ります
   - プロンプトキャッシュを使うかどうかを判断し直します (OpenRouter 上の Claude 系モデルでは有効になります)
   - `_fallback_activated = True` にして、二度目が起きないようにします
   - やり直し回数を 0 に戻し、処理を続けます

4. **設定の読み込み**:
   - CLI: `hermes_cli/fallback_config.get_fallback_chain()` で予備の連なりを読み、`AIAgent(fallback_model=...)` に渡します
   - ゲートウェイ: `gateway/run_config_loaders.py._load_fallback_model()` が `config.yaml` を読み、`AIAgent` に渡します
   - 検証: `provider` と `model` の両方が空でないことが条件で、そうでなければ予備の仕組みは無効になります

### 予備が働かないもの {#what-does-not-support-fallback}

- **サブエージェントへの委任** (`tools/delegate_tool.py`): サブエージェントは親のプロバイダーは受け継ぎますが、予備の設定は受け継ぎません
- **補助的な仕事**: 自前のプロバイダー自動判定の連なりを使います (上の「補助モデルの振り分け」を参照)

cron のジョブでは予備が **働きます**。`run_job()` が `config.yaml` から `fallback_providers` (または古い `fallback_model`) を読み、`AIAgent(fallback_model=...)` に渡します。ゲートウェイの `_load_fallback_model()` と同じやり方です。[cron の内部](/hermes/docs/developer-guide/cron-internals/) も参照してください。

### テストの範囲 {#test-coverage}

予備の動きは、いくつかのテスト一式で確かめています。

- `tests/run_agent/test_fallback_credential_isolation.py` — メインと予備のあいだで資格情報が混ざらないこと
- `tests/hermes_cli/test_fallback_cmd.py` — CLI の `/fallback` コマンド
- `tests/gateway/test_fallback_eviction.py` — ゲートウェイが失敗したプロバイダーを外すこと

## 関連ページ {#related-docs}

- [エージェントループの内部](/hermes/docs/developer-guide/agent-loop/)
- [ACP の内部](/hermes/docs/developer-guide/acp-internals/)
- [コンテキスト圧縮とプロンプトキャッシュ](/hermes/docs/developer-guide/context-compression-and-caching/)
