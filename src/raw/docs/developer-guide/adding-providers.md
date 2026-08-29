---
title: "プロバイダーの追加"
description: "Hermes Agent に新しい推論プロバイダーを追加する方法 — 認証、実行時の解決、CLI の流れ、アダプター、テスト、ドキュメント"
upstream_path: developer-guide/adding-providers.md
upstream_blob: ede1f622fd7a93921bb71ccb8e09bf30ab962f4e
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/adding-providers
---

# プロバイダーの追加 {#adding-providers}

Hermes は独自プロバイダーの経路を使って、OpenAI 互換のエンドポイントならすでに何とでも話せます。組み込みのプロバイダーを追加するのは、そのサービスに一級の使い心地を用意したいときだけにしてください。

- そのプロバイダー固有の認証やトークン更新がある
- 厳選したモデルの一覧を持たせたい
- セットアップや `hermes model` のメニューに項目を出したい
- `provider:model` の書き方で使えるプロバイダーの別名を用意したい
- OpenAI とは違う API の形をしていて、アダプターが必要

そのプロバイダーが「OpenAI 互換のベース URL と API キーがもう 1 つあるだけ」なら、名前を付けた独自プロバイダーで足りるかもしれません。

## 全体像 {#the-mental-model}

組み込みのプロバイダーは、いくつかの層にまたがって辻褄を合わせる必要があります。

1. `hermes_cli/auth.py` が、認証情報をどう見つけるかを決めます。
2. `hermes_cli/runtime_provider.py` が、それを実行時のデータに変えます。
   - `provider`
   - `api_mode`
   - `base_url`
   - `api_key`
   - `source`
3. `run_agent.py` が `api_mode` を見て、リクエストの組み立て方と送り方を決めます。
4. `hermes_cli/models.py` と `hermes_cli/main.py` が、そのプロバイダーを CLI に出します（`hermes_cli/setup.py` は自動的に `main.py` へ委譲するので、こちらの変更は不要です）。
5. `agent/auxiliary_client.py` と `agent/model_metadata.py` が、脇のタスクとトークンの見積もりを動かし続けます。

肝になる抽象は `api_mode` です。

- ほとんどのプロバイダーは `chat_completions` を使います。
- Codex と Meta Model API（`api.meta.ai` — Muse Spark）は `codex_responses` を使います（プロンプトキャッシュのために `prompt_cache_retention: 24h` を自動で送ります。`api.meta.ai` が 93〜99% のキャッシュヒットを出せるのは `/v1/responses` だけです）。
- Ramp Router（`api.router.com`）も `codex_responses` を使います。Responses が Router の本来の通信路で（`/v1/chat/completions` は最小限の互換層にすぎません）、しかもモデルごとに `reasoning.effort` を検証します。router のプロファイルは、稼働中のカタログから各モデルの語彙を宣言することでこれに対応しています（`ProviderProfile.supported_reasoning_efforts`）。
- Anthropic は `anthropic_messages` を使います。
- OpenAI 以外の新しいプロトコルを足す場合はたいてい、新しいアダプターと新しい `api_mode` の分岐を追加することになります。

### ツール呼び出しの通信形式 {#tool-call-wire-format}

Hermes は会話の履歴を内部的に OpenAI の chat-completions の形で保持しています。そのため `chat_completions` トランスポートの `convert_messages` / `convert_tools`（`agent/transports/chat_completions.py`）はほぼ恒等変換で、ほかのトランスポートはすべてこの形*から*それぞれのプロトコルへ変換します。この形の正典 — JSON スキーマの `parameters` を持つ `tools` の定義、`function.arguments` を文字列化して持つアシスタントの `tool_calls` の項目、`tool_call_id` を鍵にした `role: "tool"` の結果メッセージ — は [OpenAI chat completions API 早見表](https://platform.openai.com/docs/api-reference/chat/create)にあります。ネイティブのアダプターを書くときは、そのページが変換の入力側を定め、プロバイダーのドキュメントが出力側を定めることになります。

## まず実装の道筋を決める {#choose-the-implementation-path-first}

### 道筋 A — OpenAI 互換のプロバイダー {#path-a-openai-compatible-provider}

プロバイダーが標準的な chat-completions 形式のリクエストを受け付ける場合は、こちらです。

よくある作業:

- 認証のメタデータを足す
- モデルの一覧と別名を足す
- 実行時の解決を足す
- CLI のメニューにつなぐ
- 補助モデルの既定値を足す
- テストと利用者向けドキュメントを足す

たいていの場合、新しいアダプターや新しい `api_mode` は不要です。

### 道筋 B — ネイティブのプロバイダー {#path-b-native-provider}

プロバイダーが OpenAI の chat completions と同じようには振る舞わない場合は、こちらです。

いまツリーにある例:

- `codex_responses`（OpenAI Codex、xAI Grok、`api.meta.ai` 経由の Meta Muse Spark — こちらは `prompt_cache_retention: 24h` を自動で送ります — および `api.router.com` 経由の Ramp Router）
- `anthropic_messages`

この道筋では、道筋 A のすべてに加えて次が必要です。

- `agent/` 配下のプロバイダー用アダプター
- リクエストの組み立て、送出、使用量の取り出し、割り込みの処理、応答の正規化についての `run_agent.py` の分岐
- アダプターのテスト

## ファイルのチェックリスト {#file-checklist}

### 組み込みプロバイダーすべてに必要 {#required-for-every-built-in-provider}

1. `hermes_cli/auth.py`
2. `hermes_cli/models.py`
3. `hermes_cli/runtime_provider.py`
4. `hermes_cli/main.py`
5. `agent/auxiliary_client.py`
6. `agent/model_metadata.py`
7. テスト
8. `website/docs/` 配下の利用者向けドキュメント

:::tip
`hermes_cli/setup.py` に変更は**不要**です。セットアップウィザードはプロバイダーとモデルの選択を `main.py` の `select_provider_and_model()` へ委譲するので、そこに追加したプロバイダーは `hermes setup` でも自動的に使えるようになります。
:::

### ネイティブ / OpenAI 以外のプロバイダーで追加が必要なもの {#additional-for-native-non-openai-providers}

10. `agent/<provider>_adapter.py`
11. `run_agent.py`
12. プロバイダーの SDK が必要なら `pyproject.toml`

## 近道: 単純な API キー方式のプロバイダー {#fast-path-simple-api-key-providers}

追加したいプロバイダーが、API キー 1 本で認証する OpenAI 互換のエンドポイントにすぎない場合、`auth.py`、`runtime_provider.py`、`main.py` をはじめ、下の完全なチェックリストにあるファイルには一切触れる必要がありません。

必要なのは次だけです。

1. `plugins/model-providers/<your-provider>/` 配下のプラグインディレクトリ。中身は次の 2 つです。
   - `__init__.py` — モジュールの階層で `register_provider(profile)` を呼びます
   - `plugin.yaml` — マニフェスト（name、kind: model-provider、version、description）
2. 以上です。プロバイダーのプラグインは、何かが最初に `get_provider_profile()` か `list_providers()` を呼んだ時点で自動的に読み込まれます。同梱のプラグイン（このリポジトリ）も、`$HERMES_HOME/plugins/model-providers/` にある利用者のプラグインも、どちらも拾われます。

プラグインを追加してそれが `register_provider()` を呼ぶと、次の項目が自動的につながります。

1. `auth.py` の `PROVIDER_REGISTRY` の項目（認証情報の解決、環境変数の参照）
2. `api_mode` が `chat_completions` に設定される
3. `base_url` が設定か、宣言された環境変数から取られる
4. `env_vars` が API キーを探すときの優先順位どおりに調べられる
5. そのプロバイダー用の `fallback_models` の一覧が登録される
6. CLI の `--provider` フラグがそのプロバイダー ID を受け付ける
7. `hermes model` のメニューにそのプロバイダーが並ぶ
8. `hermes setup` のウィザードが自動的に `main.py` へ委譲する
9. `provider:model` という別名の書き方が使える
10. 実行時の解決器が正しい `base_url` と `api_key` を返す
11. CLI の `--provider <name>` フラグがそのプロバイダー ID を受け付ける
12. フォールバックモデルの起動が、そのプロバイダーへきれいに切り替わる

`$HERMES_HOME/plugins/model-providers/<name>/` にある利用者のプラグインは、同じ名前の同梱プラグインを上書きします（`register_provider()` は後勝ちです）。そのため第三者は、リポジトリを編集しなくても組み込みのプロファイルに手を入れたり、丸ごと差し替えたりできます。

雛形としては `plugins/model-providers/nvidia/` や `plugins/model-providers/gmi/` を見てください。項目の一覧、フックの書き方、通しの例は[モデルプロバイダープラグインのガイド](/hermes/docs/developer-guide/model-provider-plugin/)にあります。

## 本道: OAuth や込み入ったプロバイダー {#full-path-oauth-and-complex-providers}

プロバイダーに次のどれかが必要な場合は、下の完全なチェックリストを使ってください。

- OAuth やトークンの更新（Nous Portal、Codex、Qwen Portal、Copilot）
- 新しいアダプターが要る、OpenAI とは違う API の形（Anthropic Messages、Codex Responses）
- 独自のエンドポイント判定や、複数リージョンの探索（z.ai、Kimi）
- 厳選した静的なモデル一覧、または稼働中の `/models` の取得
- 独自の認証フローを持つ、プロバイダー固有の `hermes model` メニュー項目

## 手順 1: 正典となるプロバイダー ID を 1 つ決める {#step-1-pick-one-canonical-provider-id}

プロバイダー ID を 1 つ選び、どこでもそれを使います。

リポジトリにある例:

- `openai-codex`
- `kimi-coding`
- `minimax-cn`

その同じ ID が、次の場所すべてに現れるはずです。

- `hermes_cli/auth.py` の `PROVIDER_REGISTRY`
- `hermes_cli/models.py` の `_PROVIDER_LABELS`
- `hermes_cli/auth.py` と `hermes_cli/models.py` 両方の `_PROVIDER_ALIASES`
- `hermes_cli/main.py` の CLI の `--provider` の選択肢
- セットアップ / モデル選択の分岐
- 補助モデルの既定値
- テスト

これらのファイルの間で ID が食い違っていると、プロバイダーは中途半端につながった状態になります。認証は通るのに、`/model` やセットアップ、実行時の解決が黙って取りこぼす、といった具合です。

## 手順 2: `hermes_cli/auth.py` に認証のメタデータを足す {#step-2-add-auth-metadata-in-hermescliauthpy}

API キー方式のプロバイダーなら、`PROVIDER_REGISTRY` に `ProviderConfig` の項目を追加します。中身は次のとおりです。

- `id`
- `name`
- `auth_type="api_key"`
- `inference_base_url`
- `api_key_env_vars`
- 任意で `base_url_env_var`

あわせて `_PROVIDER_ALIASES` に別名も足します。

既存のプロバイダーを雛形として使ってください。

- 単純な API キーの道筋: Z.AI、MiniMax
- エンドポイント判定つきの API キーの道筋: Kimi、Z.AI
- ネイティブのトークン解決: Anthropic
- OAuth / 認証情報ストアの道筋: Nous、OpenAI Codex

ここで答えを出しておきたい問いは次のとおりです。

- Hermes はどの環境変数を、どの優先順位で調べるべきか？
- そのプロバイダーにはベース URL の上書きが必要か？
- エンドポイントの探索やトークンの更新は要るか？
- 認証情報がないとき、エラーは何と言うべきか？

「API キーを探す」だけでは済まないプロバイダーなら、関係のない分岐にロジックを押し込まず、専用の認証情報の解決処理を追加してください。

## 手順 3: `hermes_cli/models.py` にモデルの一覧と別名を足す {#step-3-add-model-catalog-and-aliases-in-hermesclimodelspy}

メニューと `provider:model` の書き方でそのプロバイダーが使えるように、プロバイダーの一覧を更新します。

よくある編集箇所:

- `_PROVIDER_MODELS`
- `_PROVIDER_LABELS`
- `_PROVIDER_ALIASES`
- `list_available_providers()` の中のプロバイダーの表示順
- 稼働中の `/models` の取得に対応するなら `provider_model_ids()`

プロバイダーがモデルの一覧を稼働中に返せるなら、そちらを優先し、`_PROVIDER_MODELS` は静的な受け皿として残しておきます。

このファイルは、次のような入力を成立させているものでもあります。

```text
anthropic:claude-sonnet-4-6
kimi:model-name
```

ここに別名がないと、認証は正しく通るのに `/model` の解釈で失敗する、ということが起こります。

## 手順 4: `hermes_cli/runtime_provider.py` で実行時のデータを解決する {#step-4-resolve-runtime-data-in-hermescliruntimeproviderpy}

`resolve_runtime_provider()` は、CLI、ゲートウェイ、cron、ACP、補助クライアントが共通して通る経路です。

少なくとも次を含む dict を返す分岐を追加します。

```python
{
    "provider": "your-provider",
    "api_mode": "chat_completions",  # or your native mode
    "base_url": "https://...",
    "api_key": "...",
    "source": "env|portal|auth-store|explicit",
    "requested_provider": requested_provider,
}
```

プロバイダーが OpenAI 互換なら、`api_mode` はたいてい `chat_completions` のままにしておきます。

API キーの優先順位には注意してください。Hermes には、OpenRouter のキーが無関係なエンドポイントへ漏れるのを防ぐ処理がすでに入っています。新しいプロバイダーも同じように、どのキーをどのベース URL へ渡すのかをはっきりさせるべきです。

## 手順 5: `hermes_cli/main.py` で CLI につなぐ {#step-5-wire-the-cli-in-hermesclimainpy}

対話式の `hermes model` の流れに出てくるまで、そのプロバイダーは見つけてもらえません。

`hermes_cli/main.py` で次を更新します。

- `provider_labels` の dict
- `select_provider_and_model()` の中の `providers` の一覧
- プロバイダーの振り分け（`if selected_provider == ...`）
- `--provider` 引数の選択肢
- そのプロバイダーがログイン・ログアウトに対応するなら、その選択肢
- `_model_flow_<provider>()` の関数。当てはまるなら `_model_flow_api_key_provider()` を使い回してもかまいません

:::tip
`hermes_cli/setup.py` に変更は要りません。`main.py` の `select_provider_and_model()` を呼んでいるので、新しいプロバイダーは `hermes model` と `hermes setup` の両方に自動的に現れます。
:::

## 手順 6: 補助的な呼び出しを動かし続ける {#step-6-keep-auxiliary-calls-working}

ここで関わるファイルは 2 つです。

### `agent/auxiliary_client.py` {#agentauxiliaryclientpy}

直接 API キーを使うプロバイダーなら、安くて速い補助モデルの既定値を `_API_KEY_PROVIDER_AUX_MODELS` に追加します。

補助タスクには次のようなものがあります。

- 画像の要約
- Web 抽出の要約
- コンテキスト圧縮の要約
- セッション検索の要約
- メモリの書き出し

そのプロバイダーに妥当な補助の既定値がないと、脇のタスクがまずい受け皿に落ちたり、思いがけず高価なメインのモデルを使ったりします。

### `agent/model_metadata.py` {#agentmodelmetadatapy}

トークンの見積もり、圧縮のしきい値、各種の上限が正気を保てるように、そのプロバイダーのモデルのコンテキスト長を追加します。

## 手順 7: ネイティブのプロバイダーなら、アダプターと `run_agent.py` の対応を足す {#step-7-if-the-provider-is-native-add-an-adapter-and-runagentpy-support}

素の chat completions でないプロバイダーなら、固有のロジックは `agent/<provider>_adapter.py` に閉じ込めます。

`run_agent.py` は取りまとめ役に徹させてください。アダプターの補助関数を呼ぶべきであって、ファイルのあちこちでプロバイダー用のペイロードを手組みするべきではありません。

ネイティブのプロバイダーではたいてい、次の場所に手が必要になります。

### 新しいアダプターのファイル {#new-adapter-file}

よくある役割:

- SDK / HTTP クライアントを組み立てる
- トークンを解決する
- OpenAI 形式の会話メッセージを、そのプロバイダーのリクエスト形式へ変換する
- 必要ならツールのスキーマを変換する
- プロバイダーの応答を、`run_agent.py` が期待する形へ戻す
- 使用量と終了理由のデータを取り出す

### `run_agent.py` {#runagentpy}

`api_mode` を検索して、分岐点をひとつ残らず点検します。最低限、次を確かめてください。

- `__init__` が新しい `api_mode` を選ぶこと
- そのプロバイダーでクライアントの構築が動くこと
- `_build_api_kwargs()` がリクエストの整え方を知っていること
- `_interruptible_api_call()` が正しいクライアント呼び出しへ振り分けること
- 割り込みとクライアントの作り直しの経路が動くこと
- 応答の検証がそのプロバイダーの形を受け入れること
- 終了理由の取り出しが正しいこと
- トークン使用量の取り出しが正しいこと
- フォールバックモデルの起動が、新しいプロバイダーへきれいに切り替わること
- 要約の生成とメモリの書き出しの経路がなお動くこと

あわせて `run_agent.py` の `self.client.` も検索してください。標準の OpenAI クライアントがある前提のコード経路は、ネイティブのプロバイダーが別のクライアントオブジェクトを使ったり `self.client = None` になったりすると壊れます。

### プロンプトキャッシュとプロバイダー固有のリクエスト項目 {#prompt-caching-and-provider-specific-request-fields}

プロンプトキャッシュとプロバイダー固有のつまみは、壊れやすい部分です。

すでにツリーにある例:

- Anthropic にはネイティブのプロンプトキャッシュの経路がある
- OpenRouter にはプロバイダー振り分けの項目が渡される
- リクエスト側の選択肢を、すべてのプロバイダーに渡してよいわけではない

ネイティブのプロバイダーを追加するときは、そのプロバイダーが実際に理解できる項目だけを Hermes が送っているかを、念入りに確かめてください。

## 手順 8: テスト {#step-8-tests}

最低限、プロバイダーの結線を守っているテストには手を入れます。

よくある場所:

- `tests/hermes_cli/test_runtime_provider_resolution.py`
- `tests/cli/test_cli_provider_resolution.py`
- `tests/hermes_cli/test_model_switch_custom_providers.py`（および隣接する `tests/hermes_cli/test_model_switch_*.py`）
- `tests/hermes_cli/test_setup_model_provider.py`
- `tests/run_agent/test_provider_parity.py`
- `tests/run_agent/test_run_agent.py`
- ネイティブのプロバイダーなら `tests/test_<provider>_adapter.py`

ドキュメント上の例なので、実際のファイルの顔ぶれは違うかもしれません。大事なのは次を押さえることです。

- 認証の解決
- CLI のメニュー / プロバイダーの選択
- 実行時のプロバイダーの解決
- エージェントの実行経路
- provider:model の解釈
- アダプター固有のメッセージ変換があるならそれ

対象を絞ったテストを実行します（各ファイルを別々のサブプロセスで走らせる `scripts/run_tests.sh` を使ってもかまいません）。

```bash
source venv/bin/activate
python -m pytest tests/hermes_cli/test_runtime_provider_resolution.py tests/cli/test_cli_provider_resolution.py tests/hermes_cli/test_setup_model_provider.py tests/run_agent/test_provider_parity.py -q
```

もっと踏み込んだ変更なら、push の前に全体を走らせます。

```bash
source venv/bin/activate
python -m pytest tests/ -n0 -q
```

## 手順 9: 実物での確認 {#step-9-live-verification}

テストのあとは、本物で軽く動かしてみます。

```bash
source venv/bin/activate
python -m hermes_cli.main chat -q "Say hello" --provider your-provider --model your-model
```

メニューを変えたなら、対話式の流れも試してください。

```bash
source venv/bin/activate
python -m hermes_cli.main model
python -m hermes_cli.main setup
```

ネイティブのプロバイダーでは、ただのテキスト応答だけでなく、ツール呼び出しも最低 1 回は確かめます。

## 手順 10: 利用者向けドキュメントを更新する {#step-10-update-user-facing-docs}

そのプロバイダーを一級の選択肢として出すつもりなら、利用者向けドキュメントも更新します。

- `website/docs/getting-started/quickstart.md`
- `website/docs/user-guide/configuration.md`
- `website/docs/reference/environment-variables.md`

開発者がプロバイダーを完璧に結線しても、利用者が必要な環境変数やセットアップの流れにたどり着けないまま、ということは起こり得ます。

## OpenAI 互換プロバイダーのチェックリスト {#openai-compatible-provider-checklist}

標準の chat completions のプロバイダーなら、こちらを使ってください。

- [ ] `hermes_cli/auth.py` に `ProviderConfig` を追加した
- [ ] `hermes_cli/auth.py` と `hermes_cli/models.py` に別名を追加した
- [ ] `hermes_cli/models.py` にモデルの一覧を追加した
- [ ] `hermes_cli/runtime_provider.py` に実行時の分岐を追加した
- [ ] `hermes_cli/main.py` に CLI の結線を追加した（setup.py は自動的に引き継ぎます）
- [ ] `agent/auxiliary_client.py` に補助モデルを追加した
- [ ] `agent/model_metadata.py` にコンテキスト長を追加した
- [ ] 実行時 / CLI のテストを更新した
- [ ] 利用者向けドキュメントを更新した

## ネイティブプロバイダーのチェックリスト {#native-provider-checklist}

新しいプロトコルの経路が要るプロバイダーなら、こちらを使ってください。

- [ ] OpenAI 互換のチェックリストの全項目
- [ ] `agent/<provider>_adapter.py` にアダプターを追加した
- [ ] `run_agent.py` で新しい `api_mode` に対応した
- [ ] 割り込み / 作り直しの経路が動く
- [ ] 使用量と終了理由の取り出しが動く
- [ ] フォールバックの経路が動く
- [ ] アダプターのテストを追加した
- [ ] 実物での軽い動作確認が通る

## つまずきやすいところ {#common-pitfalls}

### 1. 認証には追加したのに、モデルの解釈に追加していない {#1-adding-the-provider-to-auth-but-not-to-model-parsing}

認証情報は正しく解決されるのに、`/model` や `provider:model` の入力が失敗します。

### 2. `config["model"]` が文字列にも dict にもなり得ることを忘れる {#2-forgetting-that-configmodel-can-be-a-string-or-a-dict}

プロバイダー選択のコードの多くは、その両方の形を揃える必要があります。

### 3. 組み込みプロバイダーが必要だと思い込む {#3-assuming-a-built-in-provider-is-required}

そのサービスが単に OpenAI 互換なだけなら、独自プロバイダーで利用者の問題は解決していて、保守の手間も少なくて済むかもしれません。

### 4. 補助の経路を忘れる {#4-forgetting-auxiliary-paths}

補助側の振り分けを更新し忘れると、メインのチャットは動くのに要約やメモリの書き出し、画像の補助処理だけが失敗する、ということが起こります。

### 5. `run_agent.py` にネイティブプロバイダーの分岐が隠れている {#5-native-provider-branches-hiding-in-runagentpy}

`api_mode` と `self.client.` を検索してください。目に付くリクエストの経路が唯一のものだとは考えないでください。

### 6. OpenRouter だけのつまみを他のプロバイダーへ送る {#6-sending-openrouter-only-knobs-to-other-providers}

プロバイダー振り分けのような項目は、それに対応したプロバイダーにだけ渡すべきものです。

### 7. `hermes model` は更新したのに `hermes setup` は更新していない {#7-updating-hermes-model-but-not-hermes-setup}

どちらの流れも、そのプロバイダーを知っている必要があります。

## 実装中に検索するとよい語 {#good-search-targets-while-implementing}

プロバイダーが触れている箇所をすべて洗い出したいときは、次のシンボルを検索してください。

- `PROVIDER_REGISTRY`
- `_PROVIDER_ALIASES`
- `_PROVIDER_MODELS`
- `resolve_runtime_provider`
- `_model_flow_`
- `select_provider_and_model`
- `api_mode`
- `_API_KEY_PROVIDER_AUX_MODELS`
- `self.client.`

## 関連ドキュメント {#related-docs}

- [プロバイダーの実行時解決](/hermes/docs/developer-guide/provider-runtime/)
- [アーキテクチャ](/hermes/docs/developer-guide/architecture/)
- [コントリビュート](/hermes/docs/developer-guide/contributing/)
