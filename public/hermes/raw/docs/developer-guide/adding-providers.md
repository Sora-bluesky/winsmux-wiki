---
title: "プロバイダを追加する"
description: "Hermes Agent に新しい推論プロバイダを追加する手順。認証、ランタイム解決、CLI の導線、アダプター、テスト、ドキュメントまで"
upstream_path: developer-guide/adding-providers.md
upstream_blob: 203fd43d0e7d6a2e92b694a5cbfc378359f84d3c
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/adding-providers
---

# プロバイダを追加する {#adding-providers}

Hermes は、カスタムプロバイダの経路を使えば OpenAI 互換のエンドポイントならどれとでもすでにやり取りできます。組み込みプロバイダを足すのは、そのサービス向けに一段上の使い心地を用意したいときだけにしてください。

- プロバイダ固有の認証やトークン更新
- 選び抜いたモデルの一覧
- setup や `hermes model` メニューへの項目追加
- `provider:model` 記法で使えるプロバイダの別名
- アダプターが必要な、OpenAI とは違う API の形

そのプロバイダが「OpenAI 互換のベース URL と API キーがもう一組増えるだけ」なら、名前を付けたカスタムプロバイダで十分なこともあります。

## 全体像をつかむ {#the-mental-model}

組み込みプロバイダは、いくつかの層で足並みをそろえる必要があります。

1. `hermes_cli/auth.py` が、資格情報をどう見つけるかを決めます。
2. `hermes_cli/runtime_provider.py` が、それを実行時のデータに変換します。
   - `provider`
   - `api_mode`
   - `base_url`
   - `api_key`
   - `source`
3. `run_agent.py` が `api_mode` を見て、リクエストの組み立て方と送り方を決めます。
4. `hermes_cli/models.py` と `hermes_cli/main.py` が、そのプロバイダを CLI に登場させます。（`hermes_cli/setup.py` は自動で `main.py` に処理を任せるので、こちらに手を入れる必要はありません。）
5. `agent/auxiliary_client.py` と `agent/model_metadata.py` が、補助タスクとトークン配分を動き続けさせます。

肝心な抽象化は `api_mode` です。

- ほとんどのプロバイダは `chat_completions` を使います。
- Codex と Meta Model API（`api.meta.ai` — Muse Spark）は `codex_responses` を使います（プロンプトキャッシュのために `prompt_cache_retention: 24h` を自動で送ります。`api.meta.ai` で 93〜99% のキャッシュヒットが出るのは `/v1/responses` だけです）。
- Anthropic は `anthropic_messages` を使います。
- OpenAI 系ではない新しいプロトコルの場合、たいていは新しいアダプターと新しい `api_mode` の分岐を足すことになります。

### ツール呼び出しの通信フォーマット {#tool-call-wire-format}

Hermes は会話履歴を内部で OpenAI の chat completions 形式のまま保持しています。そのため `chat_completions` トランスポートの `convert_messages` / `convert_tools`（`agent/transports/chat_completions.py`）はほぼ素通しで、それ以外のトランスポートはすべて、この形式*から*各自のプロトコルへ変換します。この形式の正典 — JSON スキーマの `parameters` を持つ `tools` 定義、`function.arguments` を文字列化して持つアシスタントの `tool_calls` エントリ、`tool_call_id` で対応づける `role: "tool"` の結果メッセージ — は [OpenAI chat completions API の公式仕様](https://platform.openai.com/docs/api-reference/chat/create) にあります。ネイティブのアダプターを書くときは、そのページが変換元の側を定義し、プロバイダ側のドキュメントが変換先の側を定義します。

## まず実装の道筋を選ぶ {#choose-the-implementation-path-first}

### 道筋 A — OpenAI 互換のプロバイダ {#path-a-openai-compatible-provider}

プロバイダが標準的な chat completions 形式のリクエストを受け付ける場合は、こちらを使います。

よくある作業は次のとおりです。

- 認証のメタデータを足す
- モデルの一覧と別名を足す
- ランタイム解決を足す
- CLI メニューへの結線を足す
- 補助モデルの既定値を足す
- テストと利用者向けドキュメントを足す

たいていは新しいアダプターも新しい `api_mode` も必要ありません。

### 道筋 B — ネイティブのプロバイダ {#path-b-native-provider}

プロバイダが OpenAI の chat completions のようには振る舞わない場合は、こちらを使います。

現在ツリーにある例は次のとおりです。

- `codex_responses`（OpenAI Codex、xAI Grok、そして `api.meta.ai` 経由の Meta Muse Spark。最後のものは `prompt_cache_retention: 24h` を自動で送ります）
- `anthropic_messages`

この道筋では、道筋 A の作業すべてに加えて次が必要です。

- `agent/` に置くプロバイダのアダプター
- リクエストの組み立て、振り分け、使用量の取り出し、割り込み処理、レスポンスの正規化のための `run_agent.py` の分岐
- アダプターのテスト

## ファイルの一覧 {#file-checklist}

### 組み込みプロバイダすべてで必要なもの {#required-for-every-built-in-provider}

1. `hermes_cli/auth.py`
2. `hermes_cli/models.py`
3. `hermes_cli/runtime_provider.py`
4. `hermes_cli/main.py`
5. `agent/auxiliary_client.py`
6. `agent/model_metadata.py`
7. テスト
8. `website/docs/` 以下の利用者向けドキュメント

:::tip
`hermes_cli/setup.py` に変更は**不要**です。セットアップウィザードはプロバイダとモデルの選択を `main.py` の `select_provider_and_model()` に任せているので、そこに足したプロバイダは `hermes setup` でも自動的に使えるようになります。
:::

### ネイティブ / 非 OpenAI のプロバイダで追加が必要なもの {#additional-for-native-non-openai-providers}

10. `agent/<provider>_adapter.py`
11. `run_agent.py`
12. プロバイダの SDK が必要なら `pyproject.toml`

## 近道: API キーだけの単純なプロバイダ {#fast-path-simple-api-key-providers}

追加したいプロバイダが、単一の API キーで認証する OpenAI 互換のエンドポイントにすぎないなら、`auth.py`、`runtime_provider.py`、`main.py` をはじめ、下の完全な一覧に出てくるファイルには一切触る必要がありません。

必要なのは次だけです。

1. `plugins/model-providers/<your-provider>/` 以下に置くプラグインのディレクトリ。中身は次の2つです。
   - `__init__.py` — モジュールの読み込み時に `register_provider(profile)` を呼びます
   - `plugin.yaml` — マニフェスト（name、kind: model-provider、version、description）
2. 以上です。プロバイダのプラグインは、`get_provider_profile()` か `list_providers()` が最初に呼ばれた時点で自動的に読み込まれます。同梱のプラグイン（このリポジトリのもの）も、`$HERMES_HOME/plugins/model-providers/` に置いた利用者のプラグインも、どちらも拾われます。

プラグインを追加して `register_provider()` が呼ばれると、次の結線が自動で行われます。

1. `auth.py` の `PROVIDER_REGISTRY` への登録（資格情報の解決、環境変数の参照）
2. `api_mode` は `chat_completions` に設定されます
3. `base_url` は設定ファイルか、宣言した環境変数から取られます
4. `env_vars` が優先順に API キーとして参照されます
5. そのプロバイダの `fallback_models` の一覧が登録されます
6. `--provider` の CLI フラグがそのプロバイダ ID を受け付けます
7. `hermes model` のメニューにそのプロバイダが並びます
8. `hermes setup` ウィザードは自動で `main.py` に処理を任せます
9. `provider:model` の別名記法が使えます
10. ランタイムの解決処理が正しい `base_url` と `api_key` を返します
11. `--provider <name>` の CLI フラグがそのプロバイダ ID を受け付けます
12. フォールバックモデルの切り替えが、そのプロバイダへ問題なく移れます

`$HERMES_HOME/plugins/model-providers/<name>/` に置いた利用者のプラグインは、同名の同梱プラグインを上書きします（`register_provider()` は後に書いたものが勝ちます）。つまり第三者は、リポジトリを編集しなくても組み込みのプロフィールを差し替えたり手直ししたりできます。

雛形としては `plugins/model-providers/nvidia/` か `plugins/model-providers/gmi/` を、項目の一覧・フックの書き方・通しの例については [Model Provider プラグインガイド](/hermes/docs/developer-guide/model-provider-plugin/) を見てください。

## 完全版: OAuth や複雑なプロバイダ {#full-path-oauth-and-complex-providers}

プロバイダに次のどれかが必要なときは、下の完全な一覧に従ってください。

- OAuth やトークン更新（Nous Portal、Codex、Qwen Portal、Copilot）
- 新しいアダプターが要る、OpenAI とは違う API の形（Anthropic Messages、Codex Responses）
- 独自のエンドポイント検出や複数リージョンの探索（z.ai、Kimi）
- 選び抜いた静的なモデル一覧、あるいは `/models` の実時間取得
- 独自の認証フローを持つ、プロバイダ固有の `hermes model` メニュー項目

## 手順1: 正典となるプロバイダ ID をひとつ決める {#step-1-pick-one-canonical-provider-id}

プロバイダ ID をひとつ選び、どこでもそれを使います。

リポジトリにある例です。

- `openai-codex`
- `kimi-coding`
- `minimax-cn`

同じ ID が次のすべてに現れるようにします。

- `hermes_cli/auth.py` の `PROVIDER_REGISTRY`
- `hermes_cli/models.py` の `_PROVIDER_LABELS`
- `hermes_cli/auth.py` と `hermes_cli/models.py` 両方の `_PROVIDER_ALIASES`
- `hermes_cli/main.py` の CLI `--provider` の選択肢
- setup / モデル選択の分岐
- 補助モデルの既定値
- テスト

これらのファイルで ID が食い違うと、プロバイダは中途半端に結線された状態になります。認証は通るのに、`/model` や setup、ランタイム解決が黙って取りこぼす、といったことが起きます。

## 手順2: `hermes_cli/auth.py` に認証のメタデータを足す {#step-2-add-auth-metadata-in-hermescliauthpy}

API キー方式のプロバイダなら、次を持つ `ProviderConfig` を `PROVIDER_REGISTRY` に足します。

- `id`
- `name`
- `auth_type="api_key"`
- `inference_base_url`
- `api_key_env_vars`
- 任意で `base_url_env_var`

あわせて `_PROVIDER_ALIASES` に別名も足します。

既存のプロバイダを雛形として使ってください。

- 単純な API キーの経路: Z.AI、MiniMax
- エンドポイント検出付きの API キーの経路: Kimi、Z.AI
- ネイティブなトークン解決: Anthropic
- OAuth / 認証ストアの経路: Nous、OpenAI Codex

ここで答えを出しておきたい問いは次のとおりです。

- Hermes はどの環境変数を、どの優先順位で見るべきか
- そのプロバイダにベース URL の上書きは要るか
- エンドポイントの探索やトークン更新は要るか
- 資格情報が見つからないとき、認証エラーは何と伝えるべきか

「API キーを引く」以上のことが必要なプロバイダなら、関係のない分岐にロジックを押し込まず、専用の資格情報リゾルバを足してください。

## 手順3: `hermes_cli/models.py` にモデル一覧と別名を足す {#step-3-add-model-catalog-and-aliases-in-hermesclimodelspy}

メニューと `provider:model` 記法の両方でそのプロバイダが使えるよう、プロバイダの一覧を更新します。

よくある編集箇所です。

- `_PROVIDER_MODELS`
- `_PROVIDER_LABELS`
- `_PROVIDER_ALIASES`
- `list_available_providers()` の中のプロバイダの表示順
- そのプロバイダが `/models` の実時間取得に対応しているなら `provider_model_ids()`

プロバイダがモデル一覧を実時間で公開しているなら、そちらを優先して使い、`_PROVIDER_MODELS` は静的なフォールバックとして残してください。

このファイルは、次のような入力を成立させているものでもあります。

```text
anthropic:claude-sonnet-4-6
kimi:model-name
```

ここに別名がないと、認証はきちんと通るのに `/model` の解釈で失敗する、ということが起こります。

## 手順4: `hermes_cli/runtime_provider.py` で実行時のデータを解決する {#step-4-resolve-runtime-data-in-hermescliruntimeproviderpy}

`resolve_runtime_provider()` は、CLI、ゲートウェイ、cron、ACP、補助クライアントが共通で通る経路です。

少なくとも次を含む辞書を返す分岐を足します。

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

プロバイダが OpenAI 互換なら、`api_mode` はふつう `chat_completions` のままにします。

API キーの優先順位には気をつけてください。Hermes には、OpenRouter のキーが無関係なエンドポイントへ漏れるのを防ぐロジックがすでに入っています。新しいプロバイダも同じくらい明確に、どのキーをどのベース URL に渡すのかを決めておくべきです。

## 手順5: `hermes_cli/main.py` で CLI に結線する {#step-5-wire-the-cli-in-hermesclimainpy}

対話的な `hermes model` の流れに出てくるまで、そのプロバイダは見つけてもらえません。

`hermes_cli/main.py` の次を更新します。

- `provider_labels` の辞書
- `select_provider_and_model()` の中の `providers` の一覧
- プロバイダの振り分け（`if selected_provider == ...`）
- `--provider` 引数の選択肢
- そのプロバイダがログイン / ログアウトに対応しているなら、その選択肢
- `_model_flow_<provider>()` 関数。合うなら `_model_flow_api_key_provider()` の使い回しでも構いません

:::tip
`hermes_cli/setup.py` に変更は要りません。`main.py` の `select_provider_and_model()` を呼んでいるので、新しいプロバイダは `hermes model` と `hermes setup` の両方に自動で現れます。
:::

## 手順6: 補助的な呼び出しを動く状態に保つ {#step-6-keep-auxiliary-calls-working}

ここで関係するファイルは2つです。

### `agent/auxiliary_client.py` {#agentauxiliaryclientpy}

API キーを直接使うプロバイダなら、安くて速い補助モデルの既定値を `_API_KEY_PROVIDER_AUX_MODELS` に足します。

補助タスクには次のようなものがあります。

- 画像の要約
- Web から抜き出した内容の要約
- コンテキスト圧縮の要約
- セッション検索の要約
- メモリの書き出し

そのプロバイダに妥当な補助モデルの既定値がないと、補助タスクがまずいフォールバックをしたり、思いがけず高価な主モデルを使ったりすることがあります。

### `agent/model_metadata.py` {#agentmodelmetadatapy}

トークン配分、圧縮のしきい値、各種の上限が正気を保つよう、そのプロバイダのモデルのコンテキスト長を足します。

## 手順7: ネイティブのプロバイダなら、アダプターと `run_agent.py` の対応を足す {#step-7-if-the-provider-is-native-add-an-adapter-and-runagentpy-support}

プロバイダが素の chat completions でないなら、プロバイダ固有のロジックは `agent/<provider>_adapter.py` に閉じ込めます。

`run_agent.py` は全体の進行役に徹させてください。アダプターの補助関数を呼ぶべきで、ファイルのあちこちでプロバイダのペイロードを直に組み立てるべきではありません。

ネイティブのプロバイダでは、たいてい次の場所に手が要ります。

### 新しいアダプターのファイル {#new-adapter-file}

よくある役割です。

- SDK / HTTP クライアントを組み立てる
- トークンを解決する
- OpenAI 形式の会話メッセージを、そのプロバイダのリクエスト形式へ変換する
- 必要ならツールのスキーマを変換する
- プロバイダの応答を、`run_agent.py` が期待する形へ正規化する
- 使用量と終了理由のデータを取り出す

### `run_agent.py` {#runagentpy}

`api_mode` を検索して、分岐点をひとつ残らず点検します。少なくとも次を確かめてください。

- `__init__` が新しい `api_mode` を選ぶこと
- そのプロバイダでクライアントの生成が動くこと
- `_build_api_kwargs()` がリクエストの整え方を知っていること
- `_interruptible_api_call()` が正しいクライアント呼び出しへ振り分けること
- 割り込みとクライアント再生成の経路が動くこと
- 応答の検証がそのプロバイダの形を受け入れること
- 終了理由の取り出しが正しいこと
- トークン使用量の取り出しが正しいこと
- フォールバックモデルの切り替えが、新しいプロバイダへ問題なく移れること
- 要約の生成とメモリの書き出しの経路がこれまでどおり動くこと

あわせて `run_agent.py` の中を `self.client.` でも検索してください。標準の OpenAI クライアントが存在する前提のコード経路は、ネイティブのプロバイダが別のクライアントオブジェクトを使ったり `self.client = None` だったりすると壊れます。

### プロンプトキャッシュとプロバイダ固有のリクエスト項目 {#prompt-caching-and-provider-specific-request-fields}

プロンプトキャッシュとプロバイダ固有のつまみは、簡単に壊れて戻ってしまう部分です。

すでにツリーにある例です。

- Anthropic にはネイティブなプロンプトキャッシュの経路があります
- OpenRouter にはプロバイダのルーティング用の項目が付きます
- すべてのプロバイダがすべてのリクエスト側オプションを受け取るべきではありません

ネイティブのプロバイダを足すときは、そのプロバイダが実際に理解できる項目だけを Hermes が送っているか、念入りに確かめてください。

## 手順8: テスト {#step-8-tests}

最低限、プロバイダの結線を守っているテストには手を入れます。

よくある場所です。

- `tests/hermes_cli/test_runtime_provider_resolution.py`
- `tests/cli/test_cli_provider_resolution.py`
- `tests/hermes_cli/test_model_switch_custom_providers.py`（および隣接する `tests/hermes_cli/test_model_switch_*.py`）
- `tests/hermes_cli/test_setup_model_provider.py`
- `tests/run_agent/test_provider_parity.py`
- `tests/run_agent/test_run_agent.py`
- ネイティブのプロバイダなら `tests/test_<provider>_adapter.py`

ドキュメント上の例なので、実際のファイルの組み合わせは違うかもしれません。大事なのは、次を覆うことです。

- 認証の解決
- CLI メニュー / プロバイダの選択
- ランタイムのプロバイダ解決
- エージェントの実行経路
- provider:model の解釈
- アダプター固有のメッセージ変換

対象を絞ってテストを走らせます（各ファイルを別々の子プロセスで実行する `scripts/run_tests.sh` を使っても構いません）。

```bash
source venv/bin/activate
python -m pytest tests/hermes_cli/test_runtime_provider_resolution.py tests/cli/test_cli_provider_resolution.py tests/hermes_cli/test_setup_model_provider.py tests/run_agent/test_provider_parity.py -q
```

もっと踏み込んだ変更をしたなら、push する前に全体を走らせます。

```bash
source venv/bin/activate
python -m pytest tests/ -n0 -q
```

## 手順9: 実際に動かして確かめる {#step-9-live-verification}

テストのあとは、本物のスモークテストを走らせます。

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

ネイティブのプロバイダでは、ただのテキスト応答だけでなく、ツール呼び出しも最低ひとつは確かめてください。

## 手順10: 利用者向けドキュメントを更新する {#step-10-update-user-facing-docs}

そのプロバイダを第一級の選択肢として出すつもりなら、利用者向けのドキュメントも更新します。

- `website/docs/getting-started/quickstart.md`
- `website/docs/user-guide/configuration.md`
- `website/docs/reference/environment-variables.md`

開発者が完璧に結線しても、必要な環境変数やセットアップの流れを利用者が見つけられないまま、ということは起こり得ます。

## OpenAI 互換プロバイダの確認項目 {#openai-compatible-provider-checklist}

標準の chat completions なら、こちらを使います。

- [ ] `hermes_cli/auth.py` に `ProviderConfig` を追加した
- [ ] `hermes_cli/auth.py` と `hermes_cli/models.py` に別名を追加した
- [ ] `hermes_cli/models.py` にモデル一覧を追加した
- [ ] `hermes_cli/runtime_provider.py` にランタイムの分岐を追加した
- [ ] `hermes_cli/main.py` に CLI の結線を追加した（setup.py は自動で引き継ぎます）
- [ ] `agent/auxiliary_client.py` に補助モデルを追加した
- [ ] `agent/model_metadata.py` にコンテキスト長を追加した
- [ ] ランタイム / CLI のテストを更新した
- [ ] 利用者向けドキュメントを更新した

## ネイティブプロバイダの確認項目 {#native-provider-checklist}

新しいプロトコルの経路が要るときは、こちらを使います。

- [ ] OpenAI 互換の確認項目をすべて満たした
- [ ] `agent/<provider>_adapter.py` にアダプターを追加した
- [ ] `run_agent.py` で新しい `api_mode` に対応した
- [ ] 割り込み / 再生成の経路が動く
- [ ] 使用量と終了理由の取り出しが動く
- [ ] フォールバックの経路が動く
- [ ] アダプターのテストを追加した
- [ ] 実機のスモークテストが通る

## よくあるつまずき {#common-pitfalls}

### 1. 認証には足したのに、モデルの解釈に足していない {#1-adding-the-provider-to-auth-but-not-to-model-parsing}

資格情報はきちんと解決されるのに、`/model` や `provider:model` の入力が失敗します。

### 2. `config["model"]` が文字列にも辞書にもなり得ることを忘れる {#2-forgetting-that-configmodel-can-be-a-string-or-a-dict}

プロバイダ選択まわりのコードの多くは、その両方の形をならす必要があります。

### 3. 組み込みプロバイダが必須だと思い込む {#3-assuming-a-built-in-provider-is-required}

そのサービスが単に OpenAI 互換なだけなら、カスタムプロバイダのほうが少ない手間で利用者の困りごとを解決できているかもしれません。

### 4. 補助的な経路を忘れる {#4-forgetting-auxiliary-paths}

補助側の振り分けを更新し忘れたせいで、主な対話の経路は動くのに、要約やメモリの書き出し、画像まわりの補助が落ちる、ということがあります。

### 5. ネイティブのプロバイダの分岐が `run_agent.py` に埋もれている {#5-native-provider-branches-hiding-in-runagentpy}

`api_mode` と `self.client.` を検索してください。目につくリクエストの経路だけが唯一の経路だとは考えないことです。

### 6. OpenRouter 専用のつまみを他のプロバイダに送る {#6-sending-openrouter-only-knobs-to-other-providers}

プロバイダのルーティングのような項目は、それに対応しているプロバイダにだけ付けるものです。

### 7. `hermes model` は更新したが `hermes setup` は更新していない {#7-updating-hermes-model-but-not-hermes-setup}

どちらの流れも、そのプロバイダを知っている必要があります。

## 実装中に検索すると役立つ手がかり {#good-search-targets-while-implementing}

プロバイダが関わる場所を洗い出したいときは、次のシンボルを検索してください。

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

- [プロバイダのランタイム解決](/hermes/docs/developer-guide/provider-runtime/)
- [アーキテクチャ](/hermes/docs/developer-guide/architecture/)
- [コントリビュート](/hermes/docs/developer-guide/contributing/)
