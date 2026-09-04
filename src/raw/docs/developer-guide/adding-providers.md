---
title: "プロバイダーを追加する"
description: "Hermes Agent に新しい推論プロバイダーを追加する方法 — 認証、実行時の解決、CLI の導線、アダプター、テスト、ドキュメント"
upstream_path: developer-guide/adding-providers.md
upstream_blob: 5d11383b698f4d8fa2546fec77ada463ffaa147d
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/adding-providers
---

# プロバイダーを追加する {#adding-providers}

Hermes は、独自プロバイダーの経路を通せば、OpenAI 互換のエンドポイントならどれでもすでに話せます。次のような、そのサービス専用の使い心地を用意したいのでなければ、組み込みのプロバイダーを足す必要はありません。

- そのプロバイダー独自の認証やトークンの更新
- 選び抜いたモデルの一覧
- セットアップや `hermes model` のメニューへの項目追加
- `provider:model` の書き方で使えるプロバイダーの別名
- アダプターが要る、OpenAI とは違う形の API

「OpenAI 互換のベース URL と API キーがもう 1 つ増えるだけ」なら、名前を付けた独自プロバイダーで足りることもあります。

## 頭の中の見取り図 {#the-mental-model}

組み込みのプロバイダーは、いくつかの層で辻褄を合わせる必要があります。

1. `hermes_cli/auth.py` が、資格情報をどこから見つけるかを決めます。
2. `hermes_cli/runtime_provider.py` が、それを実行時のデータに変えます。
   - `provider`
   - `api_mode`
   - `base_url`
   - `api_key`
   - `source`
3. `run_agent.py` が `api_mode` を見て、リクエストの組み立て方と送り方を決めます。
4. `hermes_cli/models.py` と `hermes_cli/main.py` が、そのプロバイダーを CLI に出します。（`hermes_cli/setup.py` は `main.py` に自動で任せるので、そちらに手を入れる必要はありません。）
5. `agent/auxiliary_client.py` と `agent/model_metadata.py` が、脇で走る処理とトークンの残り勘定を保ちます。

肝心な考え方が `api_mode` です。

- たいていのプロバイダーは `chat_completions` を使います。
- Codex と Meta Model API（`api.meta.ai` — Muse Spark）は `codex_responses` を使います（プロンプトキャッシュのために `prompt_cache_retention: 24h` が自動で送られます。`api.meta.ai` で 93〜99% のキャッシュ命中が出るのは `/v1/responses` だけです）。
- Ramp Router（`api.router.com`）も `codex_responses` を使います。Router にとっては Responses が本来の通信路で（`/v1/chat/completions` は最小限の互換の受け皿にすぎません）、モデルごとに `reasoning.effort` を検査します。router のプロファイルは、生きた一覧からモデルごとの語彙を宣言することでこれに合わせています（`ProviderProfile.supported_reasoning_efforts`）。
- Anthropic は `anthropic_messages` を使います。
- OpenAI 系ではない新しい通信規約なら、たいていは新しいアダプターと新しい `api_mode` の枝を足すことになります。

### ツール呼び出しの通信形式 {#tool-call-wire-format}

Hermes は会話の履歴を、内部では OpenAI の chat-completions の形で持っています。そのため `chat_completions` の通信路にある `convert_messages` と `convert_tools`（`agent/transports/chat_completions.py`）はほぼ素通しで、ほかの通信路はどれもその形*から*それぞれの規約へ変換します。この形の正本 — JSON スキーマの `parameters` を持つ `tools` の定義、`function.arguments` を文字列にした assistant の `tool_calls` の項目、`tool_call_id` で対応づけられる `role: "tool"` の結果メッセージ — は [OpenAI chat completions API の仕様書](https://platform.openai.com/docs/api-reference/chat/create)にあります。独自のアダプターを書くときは、そのページが変換元の形を定め、追加するプロバイダーのドキュメントが変換先の形を定めます。

## まず実装の道筋を決める {#choose-the-implementation-path-first}

### 道筋 A — OpenAI 互換のプロバイダー {#path-a-openai-compatible-provider}

プロバイダーが標準的な chat-completions 形式のリクエストを受け付けるなら、こちらです。

やることは、だいたい次のとおりです。

- 認証のメタデータを足す
- モデルの一覧と別名を足す
- 実行時の解決を足す
- CLI のメニューにつなぐ
- 補助モデルの既定値を足す
- テストと利用者向けドキュメントを足す

新しいアダプターや新しい `api_mode` は、たいてい要りません。

### 道筋 B — 独自形式のプロバイダー {#path-b-native-provider}

プロバイダーの振る舞いが OpenAI の chat completions と違うなら、こちらです。

現在リポジトリにある例は次のとおりです。

- `codex_responses`（OpenAI Codex、xAI Grok、`api.meta.ai` 経由の Meta Muse Spark — 最後のものは `prompt_cache_retention: 24h` を自動で送ります — そして `api.router.com` 経由の Ramp Router）
- `anthropic_messages`

この道筋では、道筋 A の全部に加えて次が必要です。

- `agent/` に置くプロバイダーのアダプター
- リクエストの組み立て、振り分け、使用量の取り出し、中断の処理、応答の正規化にあたる `run_agent.py` の枝
- アダプターのテスト

## ファイルのチェックリスト {#file-checklist}

### すべての組み込みプロバイダーに必要なもの {#required-for-every-built-in-provider}

1. `hermes_cli/auth.py`
2. `hermes_cli/models.py`
3. `hermes_cli/runtime_provider.py`
4. `hermes_cli/main.py`
5. `agent/auxiliary_client.py`
6. `agent/model_metadata.py`
7. テスト
8. `website/docs/` 以下の利用者向けドキュメント

:::tip
`hermes_cli/setup.py` に手を入れる必要は**ありません**。セットアップウィザードは、プロバイダーとモデルの選択を `main.py` の `select_provider_and_model()` に任せています。そこに追加したプロバイダーは、`hermes setup` でも自動的に使えるようになります。
:::

### 独自形式（OpenAI 系でない）プロバイダーに追加で必要なもの {#additional-for-native-non-openai-providers}

10. `agent/<provider>_adapter.py`
11. `run_agent.py`
12. プロバイダーの SDK が要るなら `pyproject.toml`

## 近道: API キーだけの単純なプロバイダー {#fast-path-simple-api-key-providers}

追加したいプロバイダーが、API キー 1 つで認証する OpenAI 互換のエンドポイントにすぎないなら、`auth.py`、`runtime_provider.py`、`main.py` をはじめ、以下の長いチェックリストにあるファイルには触らなくて済みます。

必要なのはこれだけです。

1. `plugins/model-providers/<your-provider>/` の下に置くプラグインのディレクトリ。中身は次の 2 つです。
   - `__init__.py` — モジュールの階層で `register_provider(profile)` を呼ぶ
   - `plugin.yaml` — 目録（name、kind: model-provider、version、description）
2. これで終わりです。プロバイダーのプラグインは、`get_provider_profile()` か `list_providers()` が最初に呼ばれたときに自動で読み込まれます。同梱のプラグイン（このリポジトリのもの）も、`$HERMES_HOME/plugins/model-providers/` に置いた自前のプラグインも、どちらも拾われます。

プラグインを追加して `register_provider()` が呼ばれると、次のものが自動でつながります。

1. `auth.py` の `PROVIDER_REGISTRY` の項目（資格情報の解決、環境変数の参照）
2. `api_mode` が `chat_completions` に設定される
3. `base_url` が、設定または宣言した環境変数から取られる
4. API キーを探すとき、`env_vars` が優先順に調べられる
5. そのプロバイダーの `fallback_models` の一覧が登録される
6. CLI の `--provider` フラグがそのプロバイダー ID を受け付ける
7. `hermes model` のメニューにそのプロバイダーが並ぶ
8. `hermes setup` のウィザードが `main.py` に自動で任せる
9. `provider:model` の別名の書き方が使える
10. 実行時の解決役が、正しい `base_url` と `api_key` を返す
11. CLI の `--provider <name>` フラグがそのプロバイダー ID を受け付ける
12. フォールバックのモデルに切り替わるとき、そのプロバイダーへきれいに移れる

`$HERMES_HOME/plugins/model-providers/<name>/` に置いた自前のプラグインは、同じ名前の同梱プラグインより優先されます（`register_provider()` は後から書いたほうが勝ちます）。そのため、第三者はリポジトリに手を入れずに、どの組み込みプロファイルでも上書きしたり差し替えたりできます。

雛形としては `plugins/model-providers/nvidia/` か `plugins/model-providers/gmi/` を見てください。項目の説明、フックの書き方の型、端から端までの実例は[モデルプロバイダープラグインの手引き](/hermes/docs/developer-guide/model-provider-plugin/)にあります。

## 本道: OAuth や込み入ったプロバイダー {#full-path-oauth-and-complex-providers}

次のどれかが必要なプロバイダーでは、以下の長いチェックリストを使ってください。

- OAuth やトークンの更新（Nous Portal、Codex、Qwen Portal、Copilot）
- 新しいアダプターが要る、OpenAI とは違う形の API（Anthropic Messages、Codex Responses）
- 独自のエンドポイント判定や、複数の地域への接続試行（z.ai、Kimi）
- 選び抜いた固定のモデル一覧、または `/models` からの取得
- 独自の認証の流れを持つ、`hermes model` メニューのプロバイダー専用項目

## ステップ 1: 正式なプロバイダー ID を 1 つ決める {#step-1-pick-one-canonical-provider-id}

プロバイダー ID を 1 つ決めて、どこでもそれを使ってください。

リポジトリにある例です。

- `openai-codex`
- `kimi-coding`
- `minimax-cn`

同じ ID を、次の場所すべてに出します。

- `hermes_cli/auth.py` の `PROVIDER_REGISTRY`
- `hermes_cli/models_catalog_static.py` の `_PROVIDER_LABELS`（`hermes_cli/models.py` から再公開されています）
- `hermes_cli/auth.py` と `hermes_cli/models_catalog_static.py` の両方にある `_PROVIDER_ALIASES`
- `hermes_cli/main.py` の CLI `--provider` の選択肢
- セットアップとモデル選択の枝
- 補助モデルの既定値
- テスト

これらのファイルで ID が食い違うと、プロバイダーは中途半端につながった状態になります。認証は通るのに、`/model`、セットアップ、実行時の解決だけが黙って取りこぼす、という形です。

## ステップ 2: `hermes_cli/auth.py` に認証のメタデータを足す {#step-2-add-auth-metadata-in-hermescliauthpy}

API キーを使うプロバイダーなら、`PROVIDER_REGISTRY` に `ProviderConfig` の項目を足します。中身は次のとおりです。

- `id`
- `name`
- `auth_type="api_key"`
- `inference_base_url`
- `api_key_env_vars`
- 任意で `base_url_env_var`

`_PROVIDER_ALIASES` にも別名を足します。

雛形には、すでにあるプロバイダーを使ってください。

- API キーだけの単純な形: Z.AI、MiniMax
- エンドポイント判定つきの API キーの形: Kimi、Z.AI
- 独自のトークン解決: Anthropic
- OAuth と資格情報の保管を使う形: Nous、OpenAI Codex

ここで答えを決めておく問いです。

- Hermes はどの環境変数を、どの優先順で調べるべきか
- ベース URL の上書きが要るか
- エンドポイントの接続試行やトークンの更新が要るか
- 資格情報が見つからないとき、認証のエラーには何と出すべきか

「API キーを探す」以上のことが必要なら、関係のない枝にロジックを押し込まず、専用の資格情報の解決役を足してください。

## ステップ 3: `hermes_cli/models.py` にモデルの一覧と別名を足す {#step-3-add-model-catalog-and-aliases-in-hermesclimodelspy}

メニューと `provider:model` の書き方で使えるように、プロバイダーの一覧を更新します。

よく手を入れるのはこのあたりです。

- `_PROVIDER_MODELS`
- `_PROVIDER_LABELS`
- `_PROVIDER_ALIASES`
- `list_available_providers()` の中でのプロバイダーの表示順
- プロバイダーが `/models` からの取得に対応しているなら `provider_model_ids()`

プロバイダーが最新のモデル一覧を公開しているなら、まずそちらを使い、`_PROVIDER_MODELS` は固定の予備として残します。

このファイルは、次のような入力を通すためのものでもあります。

```text
anthropic:claude-sonnet-4-6
kimi:model-name
```

ここに別名がないと、認証はうまくいくのに `/model` の読み取りで失敗する、ということが起こります。

## ステップ 4: `hermes_cli/runtime_provider.py` で実行時のデータを解決する {#step-4-resolve-runtime-data-in-hermescliruntimeproviderpy}

`resolve_runtime_provider()` は、CLI、ゲートウェイ、cron、ACP、補助のクライアントが共通で通る道です。

少なくとも次の内容を持つ dict を返す枝を足します。

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

プロバイダーが OpenAI 互換なら、`api_mode` はふつう `chat_completions` のままにします。

API キーの優先順位には気をつけてください。Hermes には、OpenRouter のキーが関係のないエンドポイントへ漏れないようにする仕組みがすでに入っています。新しいプロバイダーでも、どのキーをどのベース URL に渡すのかを同じくらいはっきりさせてください。

## ステップ 5: `hermes_cli/main.py` で CLI につなぐ {#step-5-wire-the-cli-in-hermesclimainpy}

対話的な `hermes model` の流れに出てくるまで、そのプロバイダーは見つけてもらえません。

`hermes_cli/main.py` の次の箇所を更新します。

- `provider_labels` の dict
- `select_provider_and_model()` の中の `providers` の一覧
- プロバイダーの振り分け（`if selected_provider == ...`）
- `--provider` 引数の選択肢
- ログインとログアウトの流れに対応しているなら、その選択肢
- `_model_flow_<provider>()` の関数。合うなら `_model_flow_api_key_provider()` を使い回してもかまいません

:::tip
`hermes_cli/setup.py` に手を入れる必要はありません。`main.py` の `select_provider_and_model()` を呼んでいるので、新しく足したプロバイダーは `hermes model` と `hermes setup` の両方に自動で出てきます。
:::

## ステップ 6: 脇で走る呼び出しを保つ {#step-6-keep-auxiliary-calls-working}

ここで関わるのは 2 つのファイルです。

### `agent/auxiliary_client.py` {#agentauxiliaryclientpy}

API キーを直接使うプロバイダーなら、安くて速い補助モデルの既定値を `_API_KEY_PROVIDER_AUX_MODELS` に足します。

脇で走る処理には、次のようなものがあります。

- 画像の内容のまとめ
- Web から抜き出した本文のまとめ
- 文脈の圧縮のためのまとめ
- セッション検索のまとめ
- メモリの書き出し

そのプロバイダーに手頃な補助の既定値がないと、脇の処理がよくない形で切り替わったり、思いがけず高価な主モデルを使ってしまったりします。

### `agent/model_metadata.py` {#agentmodelmetadatapy}

トークンの残り勘定、圧縮の始まる目安、上限が正しく働くように、そのプロバイダーのモデルのコンテキスト長を足します。

## ステップ 7: 独自形式なら、アダプターと `run_agent.py` の対応を足す {#step-7-if-the-provider-is-native-add-an-adapter-and-runagentpy-support}

素の chat completions ではないプロバイダーなら、そのプロバイダー独自の処理は `agent/<provider>_adapter.py` に閉じ込めます。

`run_agent.py` は取りまとめに専念させてください。アダプターの補助関数を呼ぶ形にして、ファイルのあちこちでプロバイダーの送信内容を手組みしないようにします。

独自形式のプロバイダーでは、たいてい次の場所に手が要ります。

### 新しいアダプターのファイル {#new-adapter-file}

受け持つのは、だいたい次のことです。

- SDK や HTTP クライアントを作る
- トークンを解決する
- OpenAI 形式の会話メッセージを、そのプロバイダーのリクエスト形式に変換する
- 必要ならツールのスキーマを変換する
- プロバイダーの応答を、`run_agent.py` が期待する形に戻す
- 使用量と終了理由のデータを取り出す

### `run_agent.py` {#runagentpy}

`api_mode` を検索して、分岐しているところをすべて点検します。少なくとも次を確かめてください。

- `__init__` が新しい `api_mode` を選ぶ
- そのプロバイダー向けにクライアントを作れる
- `_build_api_kwargs()` がリクエストの整え方を知っている
- `_interruptible_api_call()` が正しいクライアント呼び出しに振り分ける
- 中断とクライアントの作り直しの経路が動く
- 応答の検査が、そのプロバイダーの形を受け付ける
- 終了理由の取り出しが正しい
- トークン使用量の取り出しが正しい
- フォールバックのモデルに切り替わるとき、新しいプロバイダーへきれいに移れる
- まとめの生成とメモリの書き出しの経路が、これまでどおり動く

`run_agent.py` の中を `self.client.` でも検索してください。標準の OpenAI クライアントがあることを前提にしているコードは、独自形式のプロバイダーが別のクライアントを使ったり `self.client = None` になったりすると壊れることがあります。

### プロンプトキャッシュと、プロバイダー独自のリクエスト項目 {#prompt-caching-and-provider-specific-request-fields}

プロンプトキャッシュや、プロバイダーごとの細かい設定は、うっかり壊しやすいところです。

すでにリポジトリにある例です。

- Anthropic には独自のプロンプトキャッシュの経路がある
- OpenRouter にはプロバイダーの振り分け用の項目が渡る
- どのプロバイダーにも、リクエスト側の設定を全部渡してよいわけではない

独自形式のプロバイダーを足すときは、そのプロバイダーが実際に理解できる項目だけを Hermes が送っているか、あらためて確かめてください。

## ステップ 8: テスト {#step-8-tests}

少なくとも、プロバイダーのつなぎ込みを守っているテストには手を入れます。

よく触るのは次のあたりです。

- `tests/hermes_cli/test_runtime_provider_resolution.py`
- `tests/cli/test_cli_provider_resolution.py`
- `tests/hermes_cli/test_model_switch_custom_providers.py`（および隣にある `tests/hermes_cli/test_model_switch_*.py`）
- `tests/hermes_cli/test_setup_model_provider.py`
- `tests/run_agent/test_provider_parity.py`
- `tests/run_agent/test_run_agent.py`
- 独自形式のプロバイダーなら `tests/test_<provider>_adapter.py`

ドキュメント上の例なので、実際に触るファイルは違うかもしれません。大事なのは、次を押さえることです。

- 認証の解決
- CLI のメニューとプロバイダーの選択
- 実行時のプロバイダーの解決
- エージェントの実行経路
- provider:model の読み取り
- アダプター独自のメッセージ変換があれば、それ

対象を絞ったテストを走らせます（ファイルごとに別プロセスで走らせる `scripts/run_tests.sh` を使ってもかまいません）。

```bash
source venv/bin/activate
python -m pytest tests/hermes_cli/test_runtime_provider_resolution.py tests/cli/test_cli_provider_resolution.py tests/hermes_cli/test_setup_model_provider.py tests/run_agent/test_provider_parity.py -q
```

変更が深いところに及ぶなら、push の前に全体を走らせます。

```bash
source venv/bin/activate
python -m pytest tests/ -n0 -q
```

## ステップ 9: 実際に動かして確かめる {#step-9-live-verification}

テストのあとは、本物で軽く動かしてみます。

```bash
source venv/bin/activate
python -m hermes_cli.main chat -q "Say hello" --provider your-provider --model your-model
```

メニューを変えたなら、対話的な流れも試します。

```bash
source venv/bin/activate
python -m hermes_cli.main model
python -m hermes_cli.main setup
```

独自形式のプロバイダーでは、ただの文章の応答だけでなく、ツール呼び出しも最低 1 回は確かめてください。

## ステップ 10: 利用者向けドキュメントを更新する {#step-10-update-user-facing-docs}

そのプロバイダーを正式な選択肢として配るつもりなら、利用者向けのドキュメントも更新します。

- `website/docs/getting-started/quickstart.md`
- `website/docs/user-guide/configuration.md`
- `website/docs/reference/environment-variables.md`

開発者側で完璧につないでも、必要な環境変数やセットアップの流れを利用者が見つけられないままになることがあります。

## OpenAI 互換プロバイダーのチェックリスト {#openai-compatible-provider-checklist}

標準の chat completions のプロバイダーなら、こちらを使ってください。

- [ ] `hermes_cli/auth.py` に `ProviderConfig` を追加した
- [ ] `hermes_cli/auth.py` と `hermes_cli/models.py` に別名を追加した
- [ ] `hermes_cli/models.py` にモデルの一覧を追加した
- [ ] `hermes_cli/runtime_provider.py` に実行時の枝を追加した
- [ ] `hermes_cli/main.py` に CLI のつなぎ込みを追加した（setup.py は自動で引き継ぎます）
- [ ] `agent/auxiliary_client.py` に補助モデルを追加した
- [ ] `agent/model_metadata.py` にコンテキスト長を追加した
- [ ] 実行時と CLI のテストを更新した
- [ ] 利用者向けドキュメントを更新した

## 独自形式プロバイダーのチェックリスト {#native-provider-checklist}

新しい通信規約の経路が必要なプロバイダーなら、こちらを使ってください。

- [ ] OpenAI 互換のチェックリストの全項目
- [ ] `agent/<provider>_adapter.py` にアダプターを追加した
- [ ] `run_agent.py` が新しい `api_mode` に対応した
- [ ] 中断と作り直しの経路が動く
- [ ] 使用量と終了理由の取り出しが動く
- [ ] フォールバックの経路が動く
- [ ] アダプターのテストを追加した
- [ ] 実際に動かした確認が通る

## つまずきやすいところ {#common-pitfalls}

### 1. 認証には足したのに、モデルの読み取りに足していない {#1-adding-the-provider-to-auth-but-not-to-model-parsing}

資格情報はきちんと解決されるのに、`/model` や `provider:model` の入力が通らなくなります。

### 2. `config["model"]` が文字列にも dict にもなり得ることを忘れる {#2-forgetting-that-configmodel-can-be-a-string-or-a-dict}

プロバイダー選択のコードの多くは、どちらの形も揃えて扱う必要があります。

### 3. 組み込みのプロバイダーが必要だと思い込む {#3-assuming-a-built-in-provider-is-required}

そのサービスが OpenAI 互換なだけなら、独自プロバイダーのほうが手間なく困りごとを解けているかもしれません。

### 4. 脇で走る経路を忘れる {#4-forgetting-auxiliary-paths}

補助側の振り分けを更新し忘れると、ふだんの会話は動くのに、まとめ、メモリの書き出し、画像の処理だけが失敗する、ということが起こります。

### 5. 独自形式の枝が `run_agent.py` に隠れている {#5-native-provider-branches-hiding-in-runagentpy}

`api_mode` と `self.client.` で検索してください。目につくリクエストの経路だけが唯一だと思い込まないことです。

### 6. OpenRouter だけの設定を、ほかのプロバイダーに送ってしまう {#6-sending-openrouter-only-knobs-to-other-providers}

プロバイダーの振り分けのような項目は、それに対応しているプロバイダーにだけ付けます。

### 7. `hermes model` は直したのに、`hermes setup` を直していない {#7-updating-hermes-model-but-not-hermes-setup}

どちらの流れも、そのプロバイダーを知っている必要があります。

## 作業中に検索するとよい語 {#good-search-targets-while-implementing}

プロバイダーが関わる箇所をすべて洗い出したいときは、次の名前で検索してください。

- `PROVIDER_REGISTRY`
- `_PROVIDER_ALIASES`
- `_PROVIDER_MODELS`
- `resolve_runtime_provider`
- `_model_flow_`
- `select_provider_and_model`
- `api_mode`
- `_API_KEY_PROVIDER_AUX_MODELS`
- `self.client.`

## 関連するドキュメント {#related-docs}

- [プロバイダーの実行時の解決](/hermes/docs/developer-guide/provider-runtime/)
- [アーキテクチャ](/hermes/docs/developer-guide/architecture/)
- [開発に参加する](/hermes/docs/developer-guide/contributing/)
