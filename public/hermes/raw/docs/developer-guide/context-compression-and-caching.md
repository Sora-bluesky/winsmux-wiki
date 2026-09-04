---
title: "コンテキストの圧縮とキャッシュ"
description: ""
upstream_path: developer-guide/context-compression-and-caching.md
upstream_blob: a38a9cb5eb5c9d2875bbae38e1260cd87f0c89e0
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/context-compression-and-caching
---

# コンテキストの圧縮とキャッシュ {#context-compression-and-caching}

Hermes Agent は二層の圧縮の仕組みと Anthropic のプロンプトキャッシュを使って、
長い会話でもコンテキストウィンドウの使い方が無駄にならないようにしています。

該当するファイル: `agent/context_engine.py`（抽象基底クラス）、`agent/context_compressor.py`（既定のエンジン）、
`agent/prompt_caching.py`、`gateway/run_turn.py`（セッションの衛生管理）、`agent/compression_facade.py`（`_compress_context` で検索）

## 差し替えできるコンテキストエンジン {#pluggable-context-engine}

コンテキストの管理は `ContextEngine` という抽象基底クラス（`agent/context_engine.py`）の上に作られています。組み込みの `ContextCompressor` が既定の実装ですが、プラグインで別のエンジンに差し替えられます（たとえば情報を落とさない方式のコンテキスト管理）。

```yaml
context:
  engine: "compressor"    # default — built-in lossy summarization
  engine: "lcm"           # example — plugin providing lossless context
```

エンジンが受け持つのは次のことです。
- 圧縮をいつ走らせるかの判断（`should_compress()`）
- 圧縮の実行（`compress()`）
- エージェントが呼べるツールの提供（任意。たとえば `lcm_grep`）
- API の応答から得られるトークン使用量の記録

どれを使うかは `config.yaml` の `context.engine` で決まります。解決の順番は次のとおりです。
1. `plugins/context_engine/<name>/` ディレクトリを見る
2. 一般のプラグインの仕組みを見る（`register_context_engine()`）
3. 組み込みの `ContextCompressor` に落とす

プラグインのエンジンが**勝手に有効になることはありません**。利用者が `context.engine` にプラグイン名を明示する必要があります。既定の `"compressor"` は常に組み込みのものを使います。

設定は `hermes plugins` → Provider Plugins → Context Engine から行うか、`config.yaml` を直接編集します。

コンテキストエンジンのプラグインを作るときは、[コンテキストエンジンのプラグイン](/hermes/docs/developer-guide/context-engine-plugin/) を参照してください。

## 二層の圧縮の仕組み {#dual-compression-system}

Hermes には、それぞれ独立して働く二つの圧縮の層があります。

```
                     ┌──────────────────────────┐
  Incoming message   │   Gateway Session Hygiene │  Fires at 85% of context
  ─────────────────► │   (pre-agent, rough est.) │  Safety net for large sessions
                     └─────────────┬────────────┘
                                   │
                                   ▼
                     ┌──────────────────────────┐
                     │   Agent ContextCompressor │  Fires at 50% of context (default)
                     │   (in-loop, real tokens)  │  Normal context management
                     └──────────────────────────┘
```

### 1. ゲートウェイのセッション衛生管理（しきい値 85%） {#1-gateway-session-hygiene-85-threshold}

`gateway/run_turn.py` にあります（`Session hygiene` で検索）。これはエージェントがメッセージを処理する前に走る**安全網**です。
やり取りの合間にセッションが膨らみすぎて API が失敗するのを防ぎます（たとえば Telegram や Discord で一晩ぶんが溜まった場合）。

- **しきい値**: モデルのコンテキスト長の 85% に固定
- **トークンの取得元**: 直前のやり取りで API が実際に報告したトークン数を優先し、無ければ文字数からのおおまかな見積もり（`estimate_messages_tokens_rough`）に落とします
- **走る条件**: `len(history) >= 4` かつ圧縮が有効なときだけ
- **役目**: エージェント自身の圧縮をすり抜けたセッションを捕まえること

ゲートウェイ側のしきい値がエージェント側より高いのは意図的です。
エージェントと同じ 50% にしたところ、長いゲートウェイのセッションでは毎回のやり取りで早すぎる圧縮が起きました。

### 2. エージェントの ContextCompressor（しきい値 50%、変更可） {#2-agent-contextcompressor-50-threshold-configurable}

`agent/context_compressor.py` にあります。これがエージェントのツールループの中で走る**主たる圧縮の仕組み**で、
API が報告する正確なトークン数を使えます。

#### 失敗後のクールダウンと、プロバイダが証明した溢れ {#failure-cooldown-and-provider-proven-overflow}

要約の試みが失敗したり止まったりすると、そのセッションに**失敗後のクールダウン**がかかります
（60 秒 → 300 秒 → 900 秒と伸び、`state.db` に保存されます）。かかっているあいだ、
しきい値による通常の圧縮は先送りされます。要約の裏側が壊れているときに、
毎回のやり取りで再点火しないようにするためです。それでも実際に試す経路が二つあります。

- 手動の `/compress`（`force=True`）— クールダウンを解いて再試行します。
- **プロバイダが証明した溢れ** — プロバイダ自身がコンテキスト長のエラーでリクエストを拒んだ場合、
  回復のための処理はクールダウンを解かないまま、回数を区切った一度の試行（`max_compression_attempts`）
  についてだけそれを無視します。ここで先送りするとセッションが詰まってしまいます。毎回のやり取りが
  プロバイダに跳ね返され、次の失敗が待ち時間の段をさらに伸ばすからです（#100661）。
  その試行も失敗した場合は、クールダウンは通常どおり記録されます。

## 設定 {#configuration}

圧縮に関する設定はすべて `config.yaml` の `compression` キーの下から読まれます。

```yaml
compression:
  enabled: true              # Enable/disable compression (default: true)
  threshold: 0.50            # Fraction of context window (default: 0.50 = 50%)
  # model_thresholds:        # Per-model threshold overrides (substring match,
  #   "glm-5.2": 0.40        # longest key wins). See "Per-model threshold
  #   "claude-sonnet": 0.35  # overrides" below.
  target_ratio: 0.20         # How much of threshold to keep as tail (default: 0.20)
  tail_mode: lean            # Tail retention policy: lean | legacy (default: lean)
  protect_last_n: 20         # Minimum protected tail messages (default: 20)
  min_tail_user_messages: 1  # Real user messages guaranteed in the tail (default: 1)
  codex_gpt55_autoraise: true  # gpt-5.5 on Codex OAuth: raise trigger to 85% (default: true)
  codex_gpt55_autoraise_notice: true  # Show the one-time autoraise notice (default: true)
  codex_app_server_auto: native  # native|hermes|off for Codex app-server thread compaction
  codex_responses_native: false  # gpt-5.6 on direct OpenAI/Codex: server-side compaction (opt-in)
  codex_responses_compact_threshold: null  # Automatic server compaction trigger
  in_place: true             # Compact on the same session id, no rotation (default: true)

# Summarization model/provider configured under auxiliary:
auxiliary:
  compression:
    model: null              # Override model for summaries (default: auto-detect)
    provider: auto           # Provider: "auto", "openrouter", "nous", "main", etc.
    base_url: null           # Custom OpenAI-compatible endpoint
```

### 各項目の詳細 {#parameter-details}

| 項目 | 既定値 | 範囲 | 説明 |
|-----------|---------|-------|-------------|
| `threshold` | `0.50` | 0.0-1.0 | プロンプトのトークン数が `threshold × context_length` 以上になったら圧縮が走ります |
| `model_thresholds` | `{}` | 対応表 | モデルごとに `threshold` を上書きします。キーはモデル名に対する部分一致で、最も長く一致したものが勝ちます。そのうえで小さなコンテキスト向けの下限が重ねてかかります（後述） |
| `target_ratio` | `0.20` | 0.10-0.80 | 末尾を守るためのトークン予算を決めます: `threshold_tokens × target_ratio`（legacy のときだけ。`lean` は独自の上下限を使います） |
| `tail_mode` | `lean` | `lean`, `legacy` | 末尾をどう残すかの方針です。`legacy` は `target_ratio` の大きさぶんの末尾をそのまま残します（大きなウィンドウのモデルではおよそ 10 万トークン超）。`lean` は上下限を効かせた末尾（`2.5% × context window`。下限 1 万、上限 2.5 万トークン）だけを残し、代わりに続きを要約の側で運びます。すなわち、識別子を保った詳しいセッションの記録（同じ一回の要約リクエストで作られます。lean の圧縮は一度の試行につき補助 LLM をちょうど一回しか呼びません）、機械的に抜き出した目印の索引（PR 番号・SHA・パス・エラー文字列。正規表現で拾い、言い換えは一切しません）、実際の利用者の発言すべての原文引用（新しいものから予算内で）、そして要約に畳まれたものへ後から辿り着くための `session_search` の手がかりです。大きすぎる範囲は追加の呼び出しを起こさず、要約への入力へ均等に間引いて渡します（省略の印を明示します）。50 万トークンの実セッションでの結果は、残す量がおよそ 16.2 万に対しておよそ 4.9 万で、後から辿る手段と組み合わせたときの再現率はより高くなります（`evals/compaction/results/` を参照）。lean の末尾に入った古いツールの結果は、辿るための手がかりだけを持つ 1 行の切り株に落とされます |
| `protect_last_n` | `20` | ≥1 | 常に残す直近メッセージの最小数 |
| `min_tail_user_messages` | `1` | ≥1 | 圧縮されない末尾に必ず残る、実際の（動きにつながる）利用者の発言の最小数です。`1` は従来どおり最後の発言だけを錨にする既定の挙動です。たとえば `3` に上げると、かさばるツールの出力が末尾のトークン予算を埋めていても、直近 3 回の実際の発言が原文のまま残ります。中身のないプラットフォームの反響、圧縮の引き継ぎ、機械的に足された継続の行は N には数えません。この保証は末尾のトークン予算より優先されるので、錨が切れ目を手前へ引き戻して予算を超えることがあります |
| `protect_first_n` | `3` | （固定値） | システムプロンプトと最初のやり取りは常に残します |
| `idle_compact_after_seconds` | `0` | 0 秒以上 | 任意で有効にします。この秒数だけ間が空いたセッションを再開したとき、先に圧縮しておきます（0 で無効）。コンテキストが threshold × target_ratio 以下なら飛ばし、クールダウン・連打防止・ロックの守りには従います |
| `codex_gpt55_autoraise` | `true` | 真偽値 | ChatGPT Codex の OAuth 経由で gpt-5.5 を使うとき、走り出す点を 85% へ引き上げます（後述）。`false` にすると全体の `threshold` のままになります |
| `codex_gpt55_autoraise_notice` | `true` | 真偽値 | Codex の gpt-5.5 で引き上げたことを一度だけ知らせます。`false` にすると 85% への引き上げは残したまま、この告知だけを止めます |
| `codex_app_server_auto` | `native` | `native`, `hermes`, `off` | Codex app-server のセッションでのスレッド圧縮の方式です（後述） |
| `codex_responses_native` | `false` | 真偽値 | Responses API でのサーバ側圧縮を使います。OpenAI の直接 API か ChatGPT Codex の契約で gpt-5.6 系のモデルを使うときだけ働きます（後述） |
| `codex_responses_compact_threshold` | `null` | `null` または正の整数 | `null` のときは、解決された手元の圧縮の走り出す点に 8,192 トークンの余裕を見て追随します。正の整数を書いた場合は絶対値として扱われ、必要なときだけ下へ丸められます。おかしな値は自動の挙動になります。自動のときに使える手元の値が無ければ `200000` を使います |
| `in_place` | `true` | 真偽値 | 新しいセッション ID へ移らず、同じ ID のまま圧縮します（後述） |

### 同じセッション ID のままの圧縮 {#in-place-compaction-single-stable-session-id}

`compression.in_place: true`（既定）のとき、圧縮は**同じセッション ID のまま、生きているメッセージ列を書き換えます**。システムプロンプトが作り直され、要約された中ほどが差し込まれ、圧縮前のやり取りは同じ ID の下でそっと保管されます（セッションの保管庫では `active=0, compacted=1`）。`session_search` で検索でき、取り戻すこともでき、消えることはありません。`parent_session_id` の連なりも `name #N` の番号の振り直しもありません。一つの会話は一生涯ひとつの ID を持ちます。これによって、セッションを回していたころの一連の不具合（`/goal` の状態が消える、迷子のセッションができる、境目をまたぐと検索が途切れる）が無くなりました。

これを使う側は、セッション ID の差ではなく方式そのものを見ます。

- `session:compress` のイベントは `in_place: true/false` と `old_session_id` を運びます（同じ ID のままの方式では古い ID が存在しないので空文字列になります）。
- ゲートウェイは、ID が変わったかどうかではなく、エージェント側の `_last_compaction_in_place` フラグを見て記録の扱いを取り直します。

`in_place: false` にすると、従来どおり圧縮のたびに新しいセッション ID を作り、`parent_session_id` で前のものへつなぐ動きに戻ります。

### モデルごとのしきい値の上書き {#per-model-threshold-overrides}

`compression.model_thresholds` を使うと、使っているモデルに応じて圧縮が走り出す点を変えられます。
コンテキストウィンドウが大きく違うモデルを行き来するときに便利です
（たとえば 100 万トークンのモデルなら圧縮を遅らせてよく、12.8 万のモデルなら早めに圧縮すべきです）。

```yaml
compression:
  threshold: 0.50
  model_thresholds:
    "glm-5.2": 0.40
    "glm-5.2-1M": 0.25
    "claude-sonnet": 0.35
```

解決の決まりは次のとおりです。

- キーはモデル名に対する**部分一致**で、**最も長く一致したキーが勝ちます**
  （モデル `glm-5.2-1M` では `glm-5.2-1M` が `glm-5.2` に勝ちます）。
- どのキーも一致しないとき（対応表が空のときも）は、全体の `threshold` が使われます。
- 上書きは `/model` で切り替えるたびに解決し直されます。一致するキーの無いモデルへ切り替えると、
  全体の `threshold` に戻ります。
- **小さなコンテキスト向けの下限は、上書きの上から重ねてかかります**（引き上げ方向のみ）。
  コンテキストウィンドウが 512K に満たないモデルには `0.75` の下限があるので、
  それを下回る上書きは `0.75` へ引き上げられ、上回る上書き（たとえば `0.80`）はそのまま通ります。

プラグインのコンテキストエンジンも、
`from agent.context_compressor import resolve_model_threshold` で同じ解決の仕組みを再利用できます。
`update_model()` を上書きするエンジンは自前の圧縮の方針を持つので、この対応表を無視してかまいません。

### Codex の gpt-5.5 でのしきい値の自動引き上げ {#codex-gpt-55-threshold-autoraise}

ChatGPT Codex の OAuth 経由では、gpt-5.5 のコンテキストウィンドウが **272K** に固く抑えられています
（同じ名前でも OpenAI の直接 API と OpenRouter では 105 万、GitHub Copilot では 40 万です）。
既定の 50% で走らせると、圧縮はおよそ 13.6 万で起きてしまい、
モデルが実際に使える幅の半分しか使えません。経路が Codex の OAuth（`provider: openai-codex`）で
モデルが gpt-5.5 のとき、Hermes は走り出す点を **85%**（およそ 23.1 万）へ引き上げ、
やめ方のコマンドを添えた告知を出します。この告知はプロファイルごとに一度だけです。
`$HERMES_HOME` の下の目印（`.codex_gpt55_autoraise_notice`）に済んだことが記録されるので、
エージェントやセッションの初期化が繰り返されても（たとえばゲートウェイへの受信のたびに）
繰り返し出ることはありません。引き上げ後の値が後で変わったときは、もう一度だけ知らせます。
影響を受けるのはこの経路だけで、他のプロバイダの gpt-5.5 は全体の `threshold` のままです。
全体の値に戻したいときは次のようにします。

```bash
hermes config set compression.codex_gpt55_autoraise false
```

85% への引き上げは残したまま、一度きりの告知だけを消したいときは次のようにします。

```bash
hermes config set compression.codex_gpt55_autoraise_notice false
```

### Codex の大きなコンテキスト向け `-900k` の選択肢（任意） {#codex-large-context--900k-picker-variants-opt-in}

ChatGPT Codex の裏側は、gpt-5.4 と gpt-5.6（Sol / Terra / Luna）系について 272K のウィンドウを
*名乗って*いますが、ChatGPT の契約アカウントでは実際にはおよそ 91.1 万の入力トークンを受け付けます
（2026 年 8 月に実地で確認）。Hermes は、素の名前については**名乗られている 272K を既定のまま**にしています。
ウィンドウが大きいとリクエストごとのトークンが増え、契約ぶんの消費がずっと速く進むためで、
大きなウィンドウはあくまで自分で選ぶものにしてあります。

大きなウィンドウを使うときは、`/model` で `-900k` の付いた名前を明示的に選びます（たとえば
`gpt-5.6-sol-900k`、`gpt-5.6-terra-900k`、`gpt-5.6-luna-900k`、
`gpt-5.4-900k`）。これらは Hermes 側の別名です。裏側へモデル ID を送る前に接尾辞は外され、
料金と使用量の計算では素のモデルとして扱われます。本当に 272K で頭打ちになる名前（gpt-5.5、gpt-5.4-mini）には
`-900k` の変種はありません。

圧縮のしきい値はウィンドウに従います。素の名前（272K）には上で説明した **85% の自動引き上げ**がかかり、
`-900k` の側は全体の `compression.threshold`（既定の 50%、およそ 45 万）のままです。
自動引き上げは小さなウィンドウを無駄にしないための仕掛けなので、90 万のウィンドウには要りません。

### Codex app-server でのスレッド圧縮 {#codex-app-server-thread-compaction}

Codex app-server のセッション（`api_mode: codex_app_server`。codex の CLI・エージェントの実行環境）は、
他のどの経路とも違います。裏にあるスレッドのコンテキストは codex のエージェントが持っているので、
Hermes の補助的な要約ではそれを縮められません。手元の記録の写しを書き換えても、
本当のスレッドはコンテキストが強制的に切り直されるまで際限なく育ち続けます。この実行環境では、
圧縮は app-server 自身の仕組みを通します。

- 手動の圧縮（`/compress`）は app-server にスレッドの圧縮を頼み（`thread/compact/start`）、
  その処理が終わるまで待ちます。
- 自動の圧縮は `compression.codex_app_server_auto` で決まります。
  既定の `native` では、いつ圧縮するかを app-server に任せ、Hermes はその結果として起きた
  圧縮のできごと（圧縮の回数、セッションのイベント）を記録します。`hermes` にすると
  Hermes 側のしきい値が app-server の圧縮を起こし、`off` にすると Hermes から起こす自動の
  圧縮を完全に止めます（codex 自身が独自に圧縮することはあります）。

この実行環境では Hermes の手元の記録が書き換えられることはありません。state.db に圧縮の境目が
記録される一方で、目に見える記録はそのまま残ります。それ以外の経路（Codex の OAuth によるチャットの
セッションを含む）は、これまでどおり Hermes の要約による圧縮を使います。

### Responses API のサーバ側圧縮（OpenAI 直接 / Codex 契約での gpt-5.6） {#native-responses-compaction-gpt-56-on-direct-openai-codex-subscription}

OpenAI の Responses API はサーバ側での圧縮に対応しています。リクエストに
`context_management: [{type: "compaction", compact_threshold: N}]` が入っていて、
組み立てられた入力が N トークンを超えると、サーバは古いコンテキストを削り、中身の見えない
暗号化された `compaction` という出力の項目にまとめます。Hermes はその項目を、アシスタントの
メッセージがもともと持っている再送用の付属領域へ取り込み、以降のやり取りで送り返して、
削られた履歴の代わりにします。手元で要約を作らずに長い射程の記憶が保て、ZDR とも相性がよい方式です
（`store: false` で、`previous_response_id` も使いません）。

使うときは `compression.codex_responses_native: true` にします。適用の条件は意図的に狭く、
リクエストのたびに確かめ直されます。

- **モデル:** gpt-5.6 系だけです。他のモデルではこの項目があるとサーバ側で失敗します
  （gpt-5.1 と 5.2 は HTTP 500 を返すか、ストリームが止まります。組み立て直しの判断に使える
  構造化された拒否は返ってきません。2026 年 8 月に実地で確認）。
- **経路:** `api.openai.com`（OpenAI の API キー）か ChatGPT Codex の裏側
  （Codex 契約の OAuth）だけです。xAI、GitHub と Copilot、OpenRouter、中継、
  手元のサーバへは、この項目は決して送られません。

圧縮のそれ以外の部分は変わりません。手元の圧縮は最後の受け皿として構えたままですし
（サーバ側が先に動くよう、サーバ側のしきい値は手元の走り出す点より 8K トークンほど下に丸められます）、
プロバイダがこの項目を構造化された形で拒んだ場合は、そのセッションではサーバ側圧縮を止めて、
項目を外してリクエストをやり直します。セッションを対象外のモデルや経路へ切り替えたときは、
単にこの項目が送られなくなるだけです。取り込んだ中間地点は、接続先が変わったときに既存の
発行元をまたがせない守りによって再送から外れます。

既定の `compression.codex_responses_compact_threshold: null` では、サーバ側のしきい値を
解決された手元の走り出す点から導きます。たとえば手元の走り出す点が 765,000 なら 756,808 を選びます。
200,000 のような絶対値で固定したいときは正の整数を書きます。おかしな値のときは自動の挙動になります。
使える手元の値が無ければ、自動のときは 200,000 を使います。プロバイダ側の下限は
1,024 トークンなので、手元の走り出す点が異常に小さくてこの下限以下になる場合は、
サーバ側を必ず先に動かすという順序は保てません。

### 計算される値（20 万トークンのモデルを既定値で使った場合） {#computed-values-for-a-200k-context-model-at-defaults}

```
context_length       = 200,000
threshold_tokens     = 200,000 × 0.50 = 100,000
tail_token_budget    = 100,000 × 0.20 = 20,000
max_summary_tokens   = min(200,000 × 0.05, 12,000) = 10,000
```

:::note しきい値は主モデルのコンテキストウィンドウから決まります
`threshold_tokens` は常に `threshold × context_length` であり、この `context_length` は
**エージェントの主モデル**のコンテキストウィンドウです。補助モデルや要約モデルのものでは
決してありません。262,144 トークンのモデルを既定の `0.50` で使うなら、しきい値は
`262,144 × 0.50 = 131,072` です。この数字がよくある「128K のコンテキスト」に近いのは
割合の偶然であって、補助モデルのウィンドウが引き金になっているという意味ではありません。
補助モデルのコンテキストウィンドウは別の話で、圧縮がいつ走るかではなく、要約が作れるかどうかに
効いてきます。下にある「要約モデルのコンテキスト長」の注意を参照してください。
:::

## 圧縮のアルゴリズム {#compression-algorithm}

`ContextCompressor.compress()` は 4 つの段階で進みます。

### 段階 1: 古いツールの結果を刈る（安価。LLM を呼びません） {#phase-1-prune-old-tool-results-cheap-no-llm-call}

守られた末尾の外にある古いツールの結果（200 文字超）は、次の文字列に置き換えられます。
```
[Old tool output cleared to save context space]
```

これは安価な前処理で、量の多いツールの出力（ファイルの中身、ターミナルの出力、検索の結果）から
まとまったトークンを取り戻します。

### 段階 2: 切れ目を決める {#phase-2-determine-boundaries}

```
┌─────────────────────────────────────────────────────────────┐
│  Message list                                               │
│                                                             │
│  [0..2]  ← protect_first_n (system + first exchange)        │
│  [3..N]  ← middle turns → SUMMARIZED                        │
│  [N..end] ← tail (by token budget OR protect_last_n)        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

末尾を守る基準は**トークンの予算**です。末尾から前へ辿りながらトークンを積み上げ、
予算を使い切ったところで止めます。予算で守れるメッセージ数のほうが少なくなる場合は、
固定値の `protect_last_n` に切り替えます。

切れ目は、tool_call と tool_result の組を割らないように揃えられます。
`_align_boundary_backward()` は連続するツールの結果をさかのぼって親のアシスタントメッセージを
見つけ、組をまとまりのまま保ちます。

### 段階 3: 構造化された要約を作る {#phase-3-generate-structured-summary}

:::warning 要約モデルのコンテキスト長
要約に使うモデルのコンテキストウィンドウは、エージェントの主モデル**と同じかそれ以上**である必要があります。中ほどの部分はまるごと、一度の `call_llm(task="compression")` で要約モデルへ送られるからです。要約モデルのほうが小さいと API がコンテキスト長のエラーを返し、`_generate_summary()` がそれを受け止めて警告を記録し、`None` を返します。すると圧縮の処理は中ほどのやり取りを**要約なしで**捨ててしまい、会話の文脈が黙って失われます。圧縮の質が落ちる原因として、これがいちばん多いものです。
:::

中ほどのやり取りは、決まった型に沿って補助 LLM で要約されます。

```
## Goal
[What the user is trying to accomplish]

## Constraints & Preferences
[User preferences, coding style, constraints, important decisions]

## Progress
### Done
[Completed work — specific file paths, commands run, results]
### In Progress
[Work currently underway]
### Blocked
[Any blockers or issues encountered]

## Key Decisions
[Important technical decisions and why]

## Relevant Files
[Files read, modified, or created — with brief note on each]

## Next Steps
[What needs to happen next]

## Critical Context
[Specific values, error messages, configuration details]
```

要約に使えるトークンは、圧縮する量に応じて増減します。
- 計算式: `content_tokens × 0.20`（定数 `_SUMMARY_RATIO`）
- 下限: 2,000 トークン
- 上限: `min(context_length × 0.05, 12,000)` トークン

### 段階 4: 圧縮後のメッセージを組み立てる {#phase-4-assemble-compressed-messages}

圧縮後のメッセージ列は次のようになります。
1. 先頭のメッセージ（最初の圧縮のときだけ、システムプロンプトに但し書きが足されます）
2. 要約のメッセージ（同じ役割が連続してしまわないよう役割を選びます）
3. 末尾のメッセージ（そのまま）

宙に浮いた tool_call と tool_result の組は `_sanitize_tool_pairs()` が整えます。
- 消えた呼び出しを指しているツールの結果 → 取り除きます
- 結果が取り除かれたツールの呼び出し → 代わりの短い結果を差し込みます

### 繰り返しの再圧縮 {#iterative-re-compression}

二度目以降の圧縮では、前回の要約を LLM に渡し、一から要約し直すのではなく**更新する**よう
指示します。これによって、何度圧縮しても情報が引き継がれます。項目は「In Progress」から「Done」へ移り、
新しい進み具合が足され、古くなったものが落ちていきます。

そのために、圧縮を担うインスタンスの `_previous_summary` フィールドが直前の要約の文面を保持しています。

## 前後の例 {#beforeafter-example}

### 圧縮前（45 メッセージ、およそ 9.5 万トークン） {#before-compression-45-messages-95k-tokens}

```
[0] system:    "You are a helpful assistant..." (system prompt)
[1] user:      "Help me set up a FastAPI project"
[2] assistant: <tool_call> terminal: mkdir project </tool_call>
[3] tool:      "directory created"
[4] assistant: <tool_call> write_file: main.py </tool_call>
[5] tool:      "file written (2.3KB)"
    ... 30 more turns of file editing, testing, debugging ...
[38] assistant: <tool_call> terminal: pytest </tool_call>
[39] tool:      "8 passed, 2 failed\n..."  (5KB output)
[40] user:      "Fix the failing tests"
[41] assistant: <tool_call> read_file: tests/test_api.py </tool_call>
[42] tool:      "import pytest\n..."  (3KB)
[43] assistant: "I see the issue with the test fixtures..."
[44] user:      "Great, also add error handling"
```

### 圧縮後（25 メッセージ、およそ 4.5 万トークン） {#after-compression-25-messages-45k-tokens}

```
[0] system:    "You are a helpful assistant...
               [Note: Some earlier conversation turns have been compacted...]"
[1] user:      "Help me set up a FastAPI project"
[2] assistant: "[CONTEXT COMPACTION] Earlier turns were compacted...

               ## Goal
               Set up a FastAPI project with tests and error handling

               ## Progress
               ### Done
               - Created project structure: main.py, tests/, requirements.txt
               - Implemented 5 API endpoints in main.py
               - Wrote 10 test cases in tests/test_api.py
               - 8/10 tests passing

               ### In Progress
               - Fixing 2 failing tests (test_create_user, test_delete_user)

               ## Relevant Files
               - main.py — FastAPI app with 5 endpoints
               - tests/test_api.py — 10 test cases
               - requirements.txt — fastapi, pytest, httpx

               ## Next Steps
               - Fix failing test fixtures
               - Add error handling"
[3] user:      "Fix the failing tests"
[4] assistant: <tool_call> read_file: tests/test_api.py </tool_call>
[5] tool:      "import pytest\n..."
[6] assistant: "I see the issue with the test fixtures..."
[7] user:      "Great, also add error handling"
```

## プロンプトキャッシュ（Anthropic） {#prompt-caching-anthropic}

該当するファイル: `agent/prompt_caching.py`

会話の前半部分をキャッシュすることで、何度もやり取りする会話での入力トークンの費用をおよそ 75% 減らします。
Anthropic の `cache_control` による区切り点を使います。

### 方式: system_and_3 {#strategy-systemand3}

Anthropic では 1 リクエストにつき `cache_control` の区切り点を最大 4 つまで置けます。Hermes は
「system_and_3」という方式を取っています。

```
Breakpoint 1: System prompt           (stable across all turns)
Breakpoint 2: 3rd-to-last non-system message  ─┐
Breakpoint 3: 2nd-to-last non-system message   ├─ Rolling window
Breakpoint 4: Last non-system message          ─┘
```

### 仕組み {#how-it-works}

`apply_anthropic_cache_control()` はメッセージを深くコピーしたうえで、
`cache_control` の印を差し込みます。

```python
# Cache marker format
marker = {"type": "ephemeral"}
# Or for 1-hour TTL:
marker = {"type": "ephemeral", "ttl": "1h"}
```

印の付け方は、中身の型によって変わります。

| 中身の型 | 印の付き先 |
|-------------|-------------------|
| 文字列 | `[{"type": "text", "text": ..., "cache_control": ...}]` に変換されます |
| リスト | 最後の要素の辞書に足されます |
| None または空 | `msg["cache_control"]` として足されます |
| ツールのメッセージ | `msg["cache_control"]` として足されます（Anthropic の API を直接使うときだけ） |

### キャッシュを意識した設計の型 {#cache-aware-design-patterns}

1. **システムプロンプトを揺らさない**: システムプロンプトは区切り点 1 で、すべてのやり取りを通じて
   キャッシュされます。会話の途中で書き換えないでください（圧縮が但し書きを足すのは最初の一回だけです）。

2. **メッセージの並び順が効く**: キャッシュが当たるには前半部分が一致している必要があります。
   途中でメッセージを足したり抜いたりすると、それ以降のキャッシュがすべて無効になります。

3. **圧縮とキャッシュの関係**: 圧縮の後、圧縮された範囲のキャッシュは無効になりますが、
   システムプロンプトのキャッシュは残ります。移動する 3 件の窓のおかげで、1 回か 2 回のやり取りで
   キャッシュが効く状態に戻ります。

4. **TTL の選び方**: 既定は `5m`（5 分）です。やり取りの合間に間が空く長時間のセッションでは
   `1h` を使ってください。

5. **どのモデルかもキャッシュのキーの一部です**: プロバイダ側のキャッシュは、そのリクエストを
   処理するモデル（およびアカウントや API キー）ごとに分かれています。会話の途中でモデルが
   変わること——`/model` での明示的な切り替え、主モデルからの切り替わり、資格情報のプールが
   別のアカウントへ回ること——はどれも、次のリクエストでキャッシュが一切当たらず、会話全体を
   割引のない入力価格で読み直すことを意味します。これはプロバイダ側のキャッシュの性質であって
   Hermes に避けられるものではありません。`/model`・フォールバック先のプロバイダ・資格情報の
   プールについての利用者向けドキュメントに費用の注意が書かれているのはこのためです。
   セッションの途中でモデルや資格情報が黙って入れ替わるような機能は足さないでください。

### プロンプトキャッシュを有効にする {#enabling-prompt-caching}

プロンプトキャッシュは、次の条件がそろうと自動で有効になります。
- モデルが Anthropic の Claude 系である（モデル名で判定します）
- プロバイダが `cache_control` に対応している（Anthropic の API を直接使うか、OpenRouter 経由）

```yaml
# config.yaml — TTL is configurable (must be "5m" or "1h")
prompt_caching:
  cache_ttl: "5m"
```

CLI は起動時にキャッシュの状態を表示します。
```
💾 Prompt caching: ENABLED (Claude via OpenRouter, 5m TTL)
```

## コンテキストの逼迫の警告 {#context-pressure-warnings}

途中経過としてのコンテキスト逼迫の警告は廃止されました（`agent/turn_iteration_prep.py` の反復回数の予算の箇所に、「途中の逼迫の警告は入れない。込み入った作業でモデルが早々に投げ出す原因になった」と書かれています）。圧縮は、プロンプトのトークン数が設定した `compression.threshold`（既定 50%）に達した時点で、前触れなく走ります。ゲートウェイのセッション衛生管理は二段目の安全網として、モデルのコンテキストウィンドウの 85% で走ります。
