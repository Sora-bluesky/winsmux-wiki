---
title: "コンテキストの圧縮とキャッシュ"
description: ""
upstream_path: developer-guide/context-compression-and-caching.md
upstream_blob: 1d006bf4b8913c35d41f4bd9dbfed1bdd9725575
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/context-compression-and-caching
---

# コンテキストの圧縮とキャッシュ {#context-compression-and-caching}

Hermes Agent は二重の圧縮システムと Anthropic のプロンプトキャッシュを使い、
長い会話でもコンテキストウィンドウの消費を効率よく管理します。

ソースファイル: `agent/context_engine.py`（ABC）、`agent/context_compressor.py`（既定のエンジン）、
`agent/prompt_caching.py`、`gateway/run_turn.py`（セッションの衛生管理）、`agent/compression_facade.py`（`_compress_context` を検索してください）

## 差し替え可能なコンテキストエンジン {#pluggable-context-engine}

コンテキスト管理は `ContextEngine` の ABC（`agent/context_engine.py`）の上に構築されています。組み込みの `ContextCompressor` が既定の実装ですが、プラグインで別のエンジン（たとえば Lossless Context Management）に差し替えられます。

```yaml
context:
  engine: "compressor"    # default — built-in lossy summarization
  engine: "lcm"           # example — plugin providing lossless context
```

エンジンが担うのは次の役割です。
- 圧縮をいつ実行するかの判断（`should_compress()`）
- 圧縮の実行（`compress()`）
- 必要に応じて、エージェントが呼び出せるツールの提供（たとえば `lcm_grep`）
- API レスポンスからのトークン使用量の追跡

どのエンジンを使うかは `config.yaml` の `context.engine` で設定します。解決の順序は次のとおりです。
1. `plugins/context_engine/<name>/` ディレクトリを確認する
2. 一般のプラグインシステムを確認する（`register_context_engine()`）
3. 組み込みの `ContextCompressor` にフォールバックする

プラグインのエンジンが**自動で有効になることはありません** — 利用者が `context.engine` にプラグイン名を明示的に設定する必要があります。既定の `"compressor"` は常に組み込みのものを使います。

設定は `hermes plugins` → Provider Plugins → Context Engine から行うか、`config.yaml` を直接編集してください。

コンテキストエンジンのプラグインを作る方法は [コンテキストエンジンプラグイン](/hermes/docs/developer-guide/context-engine-plugin/) を参照してください。

## 二重の圧縮システム {#dual-compression-system}

Hermes には、それぞれ独立して動く 2 つの圧縮の層があります。

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

`gateway/run_turn.py` にあります（`Session hygiene` を検索してください）。これは**安全網**にあたるもので、
エージェントがメッセージを処理する前に動きます。ターンとターンのあいだにセッションが
大きくなりすぎたとき（たとえば Telegram / Discord で夜のあいだに溜まった場合）に、API の失敗を防ぎます。

- **しきい値**: モデルのコンテキスト長の 85% で固定
- **トークンの取得元**: まず直前のターンで API が実際に報告したトークン数、次にセッション行に
  保存された使用量アンカー（実測値と、それ以降に追加された分の差分。ゲートウェイを
  再起動しても残ります）、そのうえでようやく文字数ベースの
  ざっくりした推定値（`estimate_messages_tokens_rough`）を使います
- **発動条件**: `len(history) >= 4` かつ圧縮が有効なときだけ
- **目的**: エージェント自身の圧縮機構をすり抜けたセッションを拾うこと

ゲートウェイ側の衛生管理のしきい値は、エージェントの圧縮機構より意図的に高く設定されています。
これを 50%（エージェントと同じ値）にしたところ、長いゲートウェイセッションでは
毎ターン早すぎる圧縮が起きてしまいました。

### 2. エージェントの ContextCompressor（しきい値 50%、設定可能） {#2-agent-contextcompressor-50-threshold-configurable}

`agent/context_compressor.py` にあります。これが**主となる圧縮システム**で、
エージェントのツールループの内側で動き、API が報告する正確な
トークン数を参照できます。

#### トークンの数え方: プロバイダーのアンカーと、明示的な推定値へのフォールバック {#token-accounting-provider-anchors-and-explicit-heuristic-fallbacks}

圧縮の判定を行う場所（ターン開始時の事前チェック、アイドル時、API 呼び出し前の圧力判定、ツール実行後）は
いずれもまず**使用量アンカー**（`agent/usage_anchor.py`）に問い合わせます。これはプロバイダーが最後に返した
プロンプトと出力のトークン数に、そのレスポンス以降に追加されたメッセージ「だけ」のざっくりした推定値を
足したものです。アンカーは内容のフィンガープリントで課金対象のやり取りを特定するため、ゲートウェイが毎ターン
DB から履歴を読み直しても壊れません。またセッション行に保存されるので、新しいプロセス（`--resume`、
デスクトップのターンごとの `serve`）でも、保存されたやり取りが一致しているかぎり復元されます。
圧縮、セッションのリセット、Codex ネイティブの圧縮では、このアンカーはクリアされます。

内蔵エンジンの**ターン開始時と API 呼び出し前のしきい値判定**では、アンカーがない場合（最初のリクエスト、
巻き戻しや編集後の再送信）に、コンテキスト全体のざっくりした推定値がしきい値を超えていると、プロバイダーの
証拠を**1 リクエストだけ待ちます**（`should_defer_preflight_to_real_usage`）。これはコンテキストウィンドウ
全体以上の推定値になった場合も同じです。推定値が大きいことは、そのリクエストが失敗する証拠にはなりません。
モデルを切り替えた直後は古い使用量が破棄され、最初のリクエストも新しいプロバイダーが判定します。本当に
大きすぎるリクエストであれば、反応的な復旧に入る前に 1 回だけ拒否されることがあります。

待つことは、機能を止めることではありません。レスポンスが使用量を返さなければ、これまでどおり推定値による
フォールバックが使えます。すでにしきい値を超えている実測値や、プロバイダーが実際にあふれを示した場合も、
これまでどおり圧縮できます。圧縮直後のラッチは 1 回のレスポンスを待ち、そのレスポンスが使用量を含まなくても
解除されます。復旧の回数は圧縮の試行回数の上限と進捗なしの検査で抑えられていて、いつまでも再送信を
繰り返すことはありません。

これは**実測値だけを使う方針**ではありませんし、#104462 が求めた「推定値を一切使わない」という文字どおりの
受け入れ条件を満たすものでもありません。次の方針はこれまでと変わりません。

- アンカーには、プロバイダーが返したプロンプトと出力のトークン数に加えて、**追加されたメッセージの
  ざっくりした差分**が入ります（最初に追加されるアシスタントの発言は、すでに出力側の使用量に含まれています）。
  そのため、大きなツール実行結果があると、推定した差分だけでしきい値を越えることは今もあります。境界の
  フィンガープリントは、前半全体・モデル・ツール・システムプロンプトまでを対象にはしていません。
- 任意で有効にするアイドル時の圧縮は、独自の下限とクールダウンを持ち、アンカーのない圧力に対しても動きます。
  しきい値判定の「1 リクエストだけ待つ」仕組みとは別物です。
- エージェント手前のゲートウェイ衛生管理は、履歴のざっくりした推定によるフォールバックと、メッセージ数の
  安全弁を持ち続けます。再生ハーネスの `gateway` の形はやり取りの辞書を読み直すだけで、この別建ての
  衛生管理の方針を動かすわけでは**ありません**。
- ツール実行後に使用量が得られなかった場合のフォールバック、細かい圧縮、要約と末尾の大きさの決定、刈り込み、
  あふれの進捗確認は、今もローカルの推定値を使います。ネイティブの圧縮は、プロバイダー固有の担当範囲と
  チェックポイントのラッチをそのまま持ちます。

プロバイダーのトークン数え上げ用エンドポイントの利用は、引き続き見送っています。ここに残る推定値をなくすには、
方針としての決断が要ります。ここに書いたフォールバックを動き続けるための仕組みとして受け入れるか、
プロバイダーの証拠に置き換えたうえで、使用量を返さないプロバイダーでの振る舞いを決めるかです。アンカーのない
保守処理をすべて止めれば同じことになる、というわけではありません。

`evals/token_accounting/replay_gates.py` は、ウィンドウ内とウィンドウ超過での水増し、実測値がしきい値を
超えたときの制御、再読み込みと復元でのアンカー、ローカル HTTP でのあふれと使用量なしからの復旧を、実際に
圧縮を走らせつつ要約文だけは固定して確認します。これは処理の流れを台本どおりに確かめるもので、ベンダーの
トークナイザーや課金の裏付けではありません。

プロバイダー側の不透明なデータ（Codex の推論項目や圧縮項目にある `encrypted_content`）は、ローカルの推定では
すべて 0 として扱われます。値段が付くのは実際の使用量が判明したときだけです。

画像のトークン数は、ベンダーの計算式ではなく**プロバイダーの使用量から学習した**1 枚あたりのコスト
（`agent/image_token_cost.py`）で計算します。直前のアンカーからの差分に N 枚の画像が入っているレスポンスでは、
実際の `prompt_tokens` とテキストのみの見積もりとの差が N × そのプロバイダーの単価にあたります。
この値は `model@host` ごとに `~/.hermes/cache/image_token_costs.json` に保存され、ターンごとに固定されるので、
発動判定の推定、末尾の予算の計算、ゲートウェイの衛生管理がすべて同じ数字を使います。画像を含む最初のターンより前は、
一律 1,500 という既定値を使います。

#### 失敗後のクールダウンと、プロバイダーが示したあふれ {#failure-cooldown-and-provider-proven-overflow}

要約の試行が失敗したり止まったりすると、そのセッションに**失敗クールダウン**が設定されます
（60 秒 → 300 秒 → 900 秒と段階的に伸び、`compression.context_timeout_seconds` より
短くなることはありません。`state.db` に保存されます）。クールダウン中は、
しきい値による通常の圧縮は先送りされます。要約のバックエンドが壊れているときに、
毎ターン再実行してしまわないためです。ただし次の 3 つの経路は、それでも実際に試行します。

- 手動の `/compress`（`force=True`） — クールダウンを解除して再試行します。
- 主経路が止まったあと、同じターンのうちに `fallback_chain` が行う再試行 —
  取り消された主経路自身の停止クールダウンで、これを止めてしまってはいけません（`bypass_cooldown`）。
- **プロバイダーが示したあふれ** — プロバイダー自身がコンテキスト長のエラーでリクエストを拒否した場合、
  復旧の処理はクールダウンを解除しないまま、回数を区切って 1 回だけ無視します
  （`max_compression_attempts`）。ここで先送りするとセッションが行き詰まります。毎ターン
  プロバイダーに跳ね返され、次の失敗でクールダウンがさらに伸びてしまうからです（#100661）。
  その試行も失敗した場合は、通常どおりクールダウンが記録されます。

## 設定 {#configuration}

圧縮に関する設定はすべて、`config.yaml` の `compression` キーの下から読み込まれます。

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

### 各パラメータの詳細 {#parameter-details}

| パラメータ | 既定値 | 範囲 | 説明 |
|-----------|---------|-------|-------------|
| `threshold` | `0.50` | 0.0-1.0 | プロンプトのトークン数が `threshold × context_length` 以上になると圧縮が発動します |
| `model_thresholds` | `{}` | マップ | モデルごとに `threshold` を上書きします。キーはモデル名に対する部分一致で判定され、最も長く一致したものが勝ちます。`"<provider>:<substring>"` の形のキーは、そのプロバイダーのときだけ効きます。さらに小さいコンテキスト向けの下限がその上に適用されます（後述） |
| `target_ratio` | `0.20` | 0.10-0.80 | 末尾を保護するためのトークン予算を決めます: `threshold_tokens × target_ratio`（legacy モードのみ。`lean` は独自の上限を使います） |
| `tail_mode` | `lean` | `lean`, `legacy` | 末尾をどれだけ残すかの方針です。`legacy` は `target_ratio` の大きさの末尾をそのまま残します（大きなウィンドウのモデルでは 10 万トークン以上になります）。`lean` は`2.5% × context window` を上限つきで残し（下限 1 万、上限 2 万 5 千）、代わりに要約の側で話の続きを引き継ぎます。具体的には、識別子を保った詳しいセッションログ（同じ 1 回の要約リクエストで生成されます。lean の圧縮は 1 回の試行につき補助 LLM をちょうど 1 回だけ呼びます）、機械的に抽出したアンカーの索引（PR 番号、SHA、パス、エラー文字列 — 正規表現で取り出し、言い換えは一切しません）、実際の利用者のメッセージをすべて原文のまま引用したもの（新しいものから予算の範囲で）、そして要約で消えた内容にエージェントが再びアクセスできる `session_search` の復元ポインタです。大きすぎる領域は追加の呼び出しを起こさず、要約への入力へ均等にサンプリングされます（省略箇所には明示的な印が入ります）。50 万トークンの実セッションでの結果は、残るのが約 16 万 2 千に対して約 4 万 9 千で、復元と組み合わせたときの再現率はより高くなりました（`evals/compaction/results/` を参照）。lean の末尾に含まれる古いツール結果は、復元ポインタだけを持つ 1 行のスタブに縮められます |
| `protect_last_n` | `20` | ≥1 | 常に保持される直近メッセージの最小数 |
| `min_tail_user_messages` | `1` | ≥1 | 圧縮されない末尾に必ず残る、実際の（対応が必要な）利用者メッセージの最小数です。`1` は従来どおり直近の利用者メッセージ 1 件をアンカーにする挙動で、既定値は動作を変えません。たとえば `3` に上げると、かさばるツール出力が末尾のトークン予算を埋めていても、直近 3 回分の実際の利用者のやり取りが原文のまま残ります。中身のないプラットフォームの反響、圧縮の引き継ぎ、合成された継続の行は N に数えません。この保証は末尾のトークン予算より優先され、アンカーが区切り位置を手前に引き戻した結果、末尾が予算を超えることがあります |
| `protect_first_n` | `3` | （ハードコード） | システムプロンプトと最初のやり取りは常に保持されます |
| `idle_compact_after_seconds` | `0` | ≥0 秒 | 任意設定: この秒数だけ間が空いたあとにセッションを再開したとき、先に圧縮します（0 で無効）。コンテキストが threshold × target_ratio 以下ならスキップし、クールダウン・連続実行防止・ロックの各ガードには従います |
| `codex_gpt55_autoraise` | `true` | bool | ChatGPT Codex の OAuth 経路で gpt-5.5 を使うとき、発動点を 85% に引き上げます（後述）。`false` にすると全体の `threshold` のままになります |
| `codex_gpt55_autoraise_notice` | `true` | bool | Codex の gpt-5.5 で自動引き上げが起きたときの一度きりの通知を表示します。`false` にすると 85% への引き上げは残したまま、案内だけを出さなくなります |
| `codex_app_server_auto` | `native` | `native`, `hermes`, `off` | Codex app-server のセッションにおけるスレッド圧縮のモードです（後述） |
| `codex_responses_native` | `false` | bool | Responses API でのサーバー側圧縮を利用します。OpenAI の直接 API か ChatGPT Codex のサブスクリプションで、gpt-5.6 系のモデルを使う場合にのみ有効になります（後述） |
| `codex_responses_compact_threshold` | `null` | `null` または正の整数 | `null` の場合は、解決済みのローカルの圧縮発動点に 8,192 トークンの余裕を持たせた値に従います。正の整数を指定すると絶対値として扱われ、必要なときだけ下方向に丸められます。不正な値は自動の挙動になります。使えるローカルの発動点がない場合、自動モードは `200000` にフォールバックします |
| `in_place` | `true` | bool | 新しいセッションに切り替えず、同じセッション ID のまま圧縮します（後述） |

### その場での圧縮（安定した単一のセッション ID） {#in-place-compaction-single-stable-session-id}

`compression.in_place: true`（既定値）では、圧縮は**同じセッション ID の上で、生きているメッセージ一覧を書き換えます**。システムプロンプトが組み直され、要約された中間部分が差し込まれ、圧縮前のやり取りは同じ ID のもとでソフトにアーカイブされます（セッションストア上は `active=0, compacted=1`）。これらは `session_search` から引き続き検索でき、復元も可能で、削除されることはありません。`parent_session_id` の連鎖も `name #N` の番号の振り直しもなく、1 つの会話は生涯を通じて 1 つの永続的な ID を保ちます。これによって、セッションのローテーションに起因する不具合の一群（`/goal` の状態が失われる、セッションが孤立する、境界をまたいだ検索が抜ける）が解消しました。

利用する側は、セッション ID の差分を見るのではなくモードを見ます。

- `session:compress` イベントは `in_place: true/false` と `old_session_id` を持ちます（その場での圧縮では古い ID が存在しないため、空文字列になります）。
- ゲートウェイは ID の変化の差分ではなく、エージェント側のローテーションに依存しない `_last_compaction_in_place` フラグを見て、やり取りの扱いを引き直します。

`in_place: false` にすると、従来のローテーションする経路に戻ります。この場合、圧縮のたびに新しいセッション ID が作られ、`parent_session_id` で前のものとつながります。

### 補助モデルでの実現可能性と、末尾をどれだけ残すか {#auxiliary-feasibility-and-tail-retention}

補助側の圧縮モデルが小さいと、実際に圧縮が始まる点は下がりますが、選ばれる末尾の方針そのものは変わりません。`lean` モードでは、末尾を選ぶための予算は**メインモデルのコンテキストウィンドウ**を基準にしたままです。その 2.5% を取り、10K〜25K トークンの範囲に収めます。たとえばメインが 1M、補助が 512K のモデルなら、実現可能性の判定で発動点が 850K から 512K へ下がっても、末尾の予算は 25K のままです。明示的に `legacy` を指定した場合は、代わりに `threshold_tokens × target_ratio` を計算し直します（512K × 0.20 で 102,400 トークン）。これらは末尾を選ぶための予算であって、圧縮後のコンテキスト全体に対する厳密な上限ではありません。保護されたメッセージ、境界の位置合わせ、要約、アンカーの分だけトークンが増えることがあります。

### モデルごとのしきい値の上書き {#per-model-threshold-overrides}

`compression.model_thresholds` を使うと、いま動いているモデルに応じて
圧縮の発動点を変えられます。コンテキストウィンドウが大きく異なるモデルを
切り替えて使うときに便利です（たとえば 1M のモデルは遅めに圧縮してよく、
128K のモデルは早めに圧縮すべきです）。

```yaml
compression:
  threshold: 0.50
  model_thresholds:
    "glm-5.2": 0.40
    "glm-5.2-1M": 0.25
    "claude-sonnet": 0.35
    "openai-codex:astra": 0.85   # only on the Codex OAuth route (272K cap)
```

解決のルールは次のとおりです。

- キーはモデル名に対して**部分一致**で判定され、**最も長く一致したキーが勝ちます**
  （モデル `glm-5.2-1M` では `glm-5.2-1M` が `glm-5.2` に勝ちます）。
- キーは `"<provider>:<substring>"` の形で**プロバイダーを限定**できます
  （たとえば `"openai-codex:astra": 0.85`）。限定付きのキーは、そのセッションの
  プロバイダーがその経路のときだけ一致します。したがって、同じ名前のモデルが別の場所
  （OpenRouter、Nous、OpenAI 直結）で違うウィンドウとして提供されている場合は、全体の `threshold` のままです。
  長さの比較にはモデル名の部分だけを使うので、900K のモデルを選ぶ場面では `"astra-900k"` が
  `"openai-codex:astra"` に勝ちます。部分が同じ文字列なら、限定付きのキーが限定なしのキーに勝ちます。
- どのキーも一致しない場合（またはマップが空の場合）は、全体の `threshold` が使われます。
- 上書きは `/model` で切り替えるたびに再判定されます。一致するキーのないモデルに切り替えると、
  全体の `threshold` に戻ります。
- **小さいコンテキスト向けの下限は、上書きの上にさらに適用されます**（引き上げ方向のみ）。
  コンテキストウィンドウが 512K 未満のモデルには `0.75` の下限がかかるため、下限より低い
  上書きは `0.75` まで引き上げられます。一方、下限より高い上書き（たとえば `0.80`）は
  そのまま採用されます。

プラグインのコンテキストエンジンも、同じ解決ロジックを
`from agent.context_compressor import resolve_model_threshold` で再利用できます。
`update_model()` を上書きするエンジンは自前の圧縮方針を持つため、
このマップを無視してもかまいません。

### Codex の gpt-5.x / Astra におけるしきい値の自動引き上げ {#codex-gpt-5x-astra-threshold-autoraise}

ChatGPT Codex の OAuth バックエンドは、gpt-5.4 / 5.5 / 5.6 と gpt-6 Astra のコンテキストウィンドウを
**272K** に固定しています（同じ名前でも、OpenAI の直接 API と OpenRouter では 1.05M、
GitHub Copilot では 400K になります）。既定の 50% で発動させると、圧縮は約 136K で走ることになり、
モデルが実際に使えるウィンドウの半分しか活かせません。経路が Codex の
OAuth（`provider: openai-codex`）で、モデルがこれらの系統のとき（Astra は名前に `astra` を含むものが
すべて当てはまります。任意で選ぶ `-900k` の選択肢は、すでに広いウィンドウが開いているので対象外です）、
Hermes は発動点を **85%**（約 231K）へ引き上げ、無効化のコマンドを添えた案内を表示します。
案内はプロファイルごとに 1 回だけ表示されます。`$HERMES_HOME` の下のマーカー
（`.codex_gpt55_autoraise_notice`）に実行済みであることが記録されるため、エージェントやセッションの
初期化が繰り返されても（たとえばゲートウェイへの受信メッセージごとに）再表示されません。引き上げ後の
しきい値があとで変わった場合は、もう一度だけ通知します。影響を受けるのはこの経路だけで、
他のプロバイダーの同じモデルは全体の `threshold` のままです。全体の値に戻すには次のようにします。

```bash
hermes config set compression.codex_gpt55_autoraise false
```

85% への引き上げは残したまま、一度きりの案内だけを隠すには次のようにします。

```bash
hermes config set compression.codex_gpt55_autoraise_notice false
```

### Codex の大きなコンテキスト向け `-900k` 選択肢（任意） {#codex-large-context--900k-picker-variants-opt-in}

ChatGPT Codex のバックエンドは、gpt-5.4 と gpt-5.6（Sol / Terra / Luna）系について
272K のウィンドウを*表向きには*示していますが、実際には ChatGPT のサブスクリプション
アカウントで約 911K の入力トークンを受け付けます（2026 年 8 月に実地で確認）。Hermes は
基本の名前については**表向きの 272K を既定のまま**にしています。ウィンドウが大きいと
1 リクエストあたりのトークンが増え、サブスクリプションの利用枠を大きく消費するため、
大きいウィンドウはあくまで任意で選ぶものとしています。

大きいウィンドウを使うには、`/model` で `-900k` の付いた選択肢を明示的に選んでください
（たとえば `gpt-5.6-sol-900k`、`gpt-5.6-terra-900k`、`gpt-5.6-luna-900k`、
`gpt-5.4-900k`）。これらは Hermes 側の別名で、バックエンドへモデル ID を送る前に接尾辞は
取り除かれ、料金と使用量の計算では元のモデルとして扱われます。本当に 272K で固定されている
名前（gpt-5.5、gpt-5.4-mini）には `-900k` の選択肢はありません。

圧縮のしきい値はウィンドウに従います。基本の名前（272K）には上で説明した **85% の
自動引き上げ**が適用され、`-900k` の選択肢では全体の
`compression.threshold`（既定の 50%、約 450K）がそのまま使われます。自動引き上げは
小さいウィンドウを無駄にしないための仕組みなので、900K のウィンドウには必要ありません。

### Codex app-server のスレッド圧縮 {#codex-app-server-thread-compaction}

Codex app-server のセッション（`api_mode: codex_app_server` — codex の CLI / エージェントの
実行環境）は、他のどの経路とも異なります。codex のエージェント側が背後のスレッドの
コンテキストを持っているため、Hermes の補助的な要約機構ではそれを縮められません。
ローカルの写しを書き換えても、実際のスレッドはコンテキストの強制リセットまで
際限なく伸び続けます。この実行環境では、代わりに app-server 自身の仕組みを通して圧縮します。

- 手動の圧縮（`/compress`）は app-server にスレッドの圧縮を依頼し
  （`thread/compact/start`）、圧縮のターンが終わるまで待ちます。
- 自動の圧縮は `compression.codex_app_server_auto` で制御します。既定の `native` では
  app-server がいつ圧縮するかを決め、Hermes はその結果として起きた圧縮のイベント
  （圧縮回数のカウンタ、セッションのイベント）を記録します。`hermes` に設定すると
  Hermes の圧縮しきい値が app-server の圧縮を起動し、`off` にすると Hermes からの
  自動圧縮を完全に止めます（codex 自身がネイティブに圧縮することはあります）。

この実行環境では Hermes のローカルのやり取りが書き換えられることはありません。state.db には
圧縮の境界が記録され、見えているやり取りはそのまま残ります。これ以外のすべての経路
（Codex OAuth のチャットセッションを含む）では、Hermes の要約による圧縮機構が使われます。

### Responses のネイティブ圧縮（OpenAI 直接 / Codex サブスクリプションでの gpt-5.6） {#native-responses-compaction-gpt-56-on-direct-openai-codex-subscription}

OpenAI の Responses API はサーバー側での圧縮に対応しています。リクエストに
`context_management: [{type: "compaction", compact_threshold: N}]` が含まれていて、
組み立てられた入力が N トークンを超えると、サーバーは古いコンテキストを不透明で
暗号化された `compaction` の出力項目にまとめます。Hermes はその項目を、
アシスタントメッセージがもともと持っている再送用の付随データに取り込み、以降の
ターンで送り返して、削られた履歴の代わりにします。クライアント側で要約を作らずに
長い文脈を思い出せるうえ、ZDR とも相性がよい方式です（`store: false` で、
`previous_response_id` を使いません）。

利用するには `compression.codex_responses_native: true` を設定します。適用の条件は
意図的に狭く、リクエストごとに毎回確認されます。

- **モデル**: gpt-5.6 系のみ。他のモデルではこのフィールドがあるとサーバー側で失敗します
  （gpt-5.1 / 5.2 は HTTP 500 を返すかストリームが止まってしまい、機能を落として
  再試行できるような構造化された拒否は返ってきません。2026 年 8 月に実地で確認）。
- **経路**: `api.openai.com`（OpenAI の API キー）か ChatGPT Codex のバックエンド
  （Codex サブスクリプションの OAuth）のみ。xAI、GitHub / Copilot、OpenRouter、中継、
  ローカルのサーバーにはこのフィールドは送られません。

圧縮に関するそれ以外の点は変わりません。ローカルの圧縮機構は最後の受け皿として
待機したままです（サーバーが先に圧縮するよう、ネイティブのしきい値はローカルの発動点より
約 8K トークン低く抑えられます）。またプロバイダーがこのフィールドを構造化された形で拒否した場合、
そのセッションではネイティブ圧縮を無効にし、フィールドなしでリクエストを再試行します。
条件に合わないモデルや経路へ切り替えた場合は、単にフィールドが送られなくなるだけです。
取り込んだチェックポイントは、接続先が変わったときに既存の発行元チェックによって
再送の対象から外されます。

既定では `compression.codex_responses_compact_threshold: null` となっていて、
ネイティブのしきい値は解決済みのローカルの発動点から導かれます。たとえばローカルの発動点が
765,000 なら 756,808 が選ばれます。200,000 のように絶対値で固定したい場合は正の整数を
設定してください。不正な値の場合は自動の挙動になります。使えるローカルの発動点がない場合、
自動モードは 200,000 を使います。プロバイダー側の最小値は 1,024 トークンなので、
ローカルの発動点が極端に小さくこの下限以下になる場合は、ネイティブが必ず先に走るという
順序を保てません。

### 計算される値（200K のコンテキストのモデルを既定値で使う場合） {#computed-values-for-a-200k-context-model-at-defaults}

```
context_length       = 200,000
threshold_tokens     = 200,000 × 0.50 = 100,000
tail_token_budget    = 100,000 × 0.20 = 20,000
max_summary_tokens   = min(200,000 × 0.05, 12,000) = 10,000
```

:::note しきい値はメインのモデルのコンテキストウィンドウから決まります
`threshold_tokens` は常に `threshold × context_length` であり、この `context_length` は
**メインのエージェントのモデル**のコンテキストウィンドウです。補助モデルや要約モデルのものでは
決してありません。262,144 トークンのモデルで既定の `0.50` を使うと、しきい値は
`262,144 × 0.50 = 131,072` になります。この数字がよくある「128K コンテキスト」に近いのは
割合から生じた偶然であって、補助モデルのウィンドウが発動点になっているわけではありません。
補助モデルのコンテキストウィンドウは別の話です。それが要約を作れるかどうかにどう影響するかは、
後述の「要約モデルのコンテキスト長」の注意を参照してください。圧縮がいつ走るかとは関係ありません。
:::

## 圧縮のアルゴリズム {#compression-algorithm}

`ContextCompressor.compress()` メソッドは、4 つの段階からなるアルゴリズムで進みます。

### 段階 1: 古いツール結果の削除（安価で、LLM を呼びません） {#phase-1-prune-old-tool-results-cheap-no-llm-call}

保護対象の末尾の外にある古いツール結果（200 文字を超えるもの）は、次の文字列に置き換えられます。
```
[Old tool output cleared to save context space]
```

これは安価な下準備で、冗長なツールの出力（ファイルの中身、ターミナルの出力、検索結果）から
かなりのトークンを節約できます。

### 段階 2: 境界の決定 {#phase-2-determine-boundaries}

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

末尾の保護は**トークン予算に基づきます**。末尾から前へたどりながらトークンを積み上げ、
予算を使い切った時点で止めます。予算で保護できるメッセージ数のほうが少ない場合は、
固定値の `protect_last_n` にフォールバックします。

境界は tool_call と tool_result の組を分断しないように調整されます。
`_align_boundary_backward()` メソッドが連続するツール結果をさかのぼって
親のアシスタントメッセージを探し、組をひとまとまりのまま保ちます。

### 段階 3: 構造化された要約の生成 {#phase-3-generate-structured-summary}

:::warning 要約モデルのコンテキスト長
要約に使うモデルのコンテキストウィンドウは、メインのエージェントのモデルと**同じか、それ以上**の大きさが必要です。中間部分は丸ごと、1 回の `call_llm(task="compression")` の呼び出しで要約モデルへ送られます。要約モデルのコンテキストのほうが小さいと、API はコンテキスト長のエラーを返します。`_generate_summary()` がそれを捕まえ、警告を記録して `None` を返します。すると圧縮機構は中間のやり取りを**要約なしで**捨ててしまい、会話の文脈が黙って失われます。圧縮の質が落ちる原因としては、これが最もよくあるものです。
:::

中間のやり取りは、構造化されたテンプレートを使って補助の LLM で要約されます。

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

要約に使える分量は、圧縮する内容の量に応じて増減します。
- 計算式: `content_tokens × 0.20`（`_SUMMARY_RATIO` という定数）
- 最小: 2,000 トークン
- 最大: `min(context_length × 0.05, 12,000)` トークン

### 段階 4: 圧縮後のメッセージの組み立て {#phase-4-assemble-compressed-messages}

圧縮後のメッセージ一覧は次のようになります。
1. 先頭のメッセージ（初回の圧縮時は、システムプロンプトに注記が追加されます）
2. 要約のメッセージ（同じ役割が連続してしまわないよう、role を選びます）
3. 末尾のメッセージ（そのまま）

対応相手を失った tool_call と tool_result の組は、`_sanitize_tool_pairs()` が整理します。
- 削除された呼び出しを参照しているツール結果 → 削除されます
- 結果が削除されてしまったツール呼び出し → スタブの結果が差し込まれます

### 繰り返しの再圧縮 {#iterative-re-compression}

2 回目以降の圧縮では、前回の要約が LLM に渡され、ゼロから要約し直すのではなく
**更新する**よう指示されます。これによって、複数回の圧縮をまたいでも情報が保たれます。
項目は「In Progress」から「Done」へ移り、新しい進捗が追加され、
古くなった情報は取り除かれます。

このために、圧縮機構のインスタンスの `_previous_summary` フィールドが
直前の要約の文面を保持しています。

## 圧縮前後の例 {#beforeafter-example}

### 圧縮前（45 メッセージ、約 95K トークン） {#before-compression-45-messages-95k-tokens}

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

### 圧縮後（25 メッセージ、約 45K トークン） {#after-compression-25-messages-45k-tokens}

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

ソース: `agent/prompt_caching.py`

会話の前半部分をキャッシュすることで、複数ターンの会話における入力トークンの費用を
約 75% 削減します。Anthropic の `cache_control` のブレークポイントを使います。

### 方式: system_and_3 {#strategy-systemand3}

Anthropic は 1 リクエストあたり最大 4 つの `cache_control` ブレークポイントを認めています。Hermes は
「system_and_3」という方式を使います。

```
Breakpoint 1: System prompt           (stable across all turns)
Breakpoint 2: 3rd-to-last non-system message  ─┐
Breakpoint 3: 2nd-to-last non-system message   ├─ Rolling window
Breakpoint 4: Last non-system message          ─┘
```

### 仕組み {#how-it-works}

`apply_anthropic_cache_control()` はメッセージをディープコピーしたうえで、
`cache_control` の目印を差し込みます。

```python
# Cache marker format
marker = {"type": "ephemeral"}
# Or for 1-hour TTL:
marker = {"type": "ephemeral", "ttl": "1h"}
```

目印の付け方は、内容の種類によって変わります。

| 内容の種類 | 目印を置く場所 |
|-------------|-------------------|
| 文字列の内容 | `[{"type": "text", "text": ..., "cache_control": ...}]` に変換されます |
| リストの内容 | 最後の要素の辞書に追加されます |
| None / 空 | `msg["cache_control"]` として追加されます |
| ツールのメッセージ | `msg["cache_control"]` として追加されます（Anthropic のネイティブ API のみ） |

### キャッシュを意識した設計の指針 {#cache-aware-design-patterns}

1. **システムプロンプトを安定させる**: システムプロンプトはブレークポイント 1 にあたり、
   すべてのターンでキャッシュされます。会話の途中で書き換えないでください（圧縮が注記を追加するのは
   初回の圧縮のときだけです）。

2. **メッセージの順序が効いてくる**: キャッシュに当たるには先頭からの一致が必要です。途中で
   メッセージを追加したり削除したりすると、それ以降のキャッシュがすべて無効になります。

3. **圧縮とキャッシュの関係**: 圧縮したあと、圧縮された領域のキャッシュは無効になりますが、
   システムプロンプトのキャッシュは残ります。3 件の移動窓によって、1〜2 ターンで
   キャッシュが効く状態に戻ります。

4. **TTL の選び方**: 既定は `5m`（5 分）です。ターンの合間に利用者が離席するような
   長時間のセッションでは `1h` を使ってください。

5. **モデルの同一性もキャッシュのキーの一部です**: プロバイダー側のキャッシュは、リクエストを
   処理するモデル（およびアカウント / API キー）に紐づいています。会話の途中でモデルが変わると
   — 明示的な `/model` の切り替え、主モデルからのフォールバック、資格情報プールが別のアカウントへ
   切り替わった場合など — 次のリクエストはキャッシュに一切当たらず、会話全体を割引のない
   入力価格で読み直すことになります。これはプロバイダーのキャッシュの仕組みそのものによるもので、
   Hermes 側で避けられるものではありません。`/model`、フォールバックのプロバイダー、
   資格情報プールについての利用者向けドキュメントに費用の注意があるのはこのためです。
   セッションの途中でモデルや資格情報を黙って入れ替えるような機能は追加しないでください。

### プロンプトキャッシュを有効にする {#enabling-prompt-caching}

プロンプトキャッシュは、次の条件がそろうと自動的に有効になります。
- モデルが Anthropic の Claude 系である（モデル名から判定します）
- プロバイダーが `cache_control` に対応している（Anthropic のネイティブ API か OpenRouter）

```yaml
# config.yaml — TTL is configurable (must be "5m" or "1h")
prompt_caching:
  cache_ttl: "5m"
```

CLI は起動時にキャッシュの状態を表示します。
```
💾 Prompt caching: ENABLED (Claude via OpenRouter, 5m TTL)
```

## コンテキストの逼迫に関する警告 {#context-pressure-warnings}

途中段階でコンテキストの逼迫を知らせる警告は廃止されました（`agent/turn_iteration_prep.py` の反復回数の予算に関する箇所を参照してください。そこには「途中段階の逼迫の警告は出さない — 複雑な作業でモデルが早々に『あきらめる』原因になったため」と記されています）。圧縮は、プロンプトのトークン数が設定された `compression.threshold`（既定 50%）に達した時点で、事前の警告なしに走ります。ゲートウェイのセッション衛生管理は、モデルのコンテキストウィンドウの 85% で二次的な安全網として働きます。
