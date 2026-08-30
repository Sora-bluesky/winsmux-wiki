---
title: "コンテキストの圧縮とキャッシュ"
description: ""
upstream_path: developer-guide/context-compression-and-caching.md
upstream_blob: 2234289af44127404d060cb357c1f43efbcd6f6b
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/context-compression-and-caching
---

# コンテキストの圧縮とキャッシュ {#context-compression-and-caching}

Hermes Agent は、2層構成の圧縮と Anthropic のプロンプトキャッシュを使い、長い会話でも
コンテキストウィンドウの使用量を効率よく抑えます。

対象のソースファイル: `agent/context_engine.py`（抽象基底クラス）、`agent/context_compressor.py`（既定のエンジン）、
`agent/prompt_caching.py`、`gateway/run.py`（セッションの整理）、`run_agent.py`（`_compress_context` を検索してください）

## 差し替えできるコンテキストエンジン {#pluggable-context-engine}

コンテキストの管理は `ContextEngine` という抽象基底クラス（`agent/context_engine.py`）の上に作られています。組み込みの `ContextCompressor` が既定の実装ですが、プラグインで別のエンジン（例: 情報を失わないコンテキスト管理）に差し替えられます。

```yaml
context:
  engine: "compressor"    # default — built-in lossy summarization
  engine: "lcm"           # example — plugin providing lossless context
```

エンジンが担うのは次のことです。
- 圧縮をいつ実行するかの判断（`should_compress()`）
- 圧縮の実行（`compress()`）
- エージェントが呼べるツールの提供（任意。例: `lcm_grep`）
- API の応答からトークン使用量を記録すること

どれを使うかは `config.yaml` の `context.engine` で決まります。解決の順序は次のとおりです。
1. `plugins/context_engine/<name>/` ディレクトリを確認する
2. 一般のプラグインの仕組み（`register_context_engine()`）を確認する
3. 組み込みの `ContextCompressor` に戻す

プラグインのエンジンが**自動で有効になることはありません**。利用者が `context.engine` にプラグインの名前を明示的に設定する必要があります。既定の `"compressor"` は常に組み込みのものを使います。

設定は `hermes plugins` → Provider Plugins → Context Engine で行うか、`config.yaml` を直接編集します。

コンテキストエンジンのプラグインを作る方法は、[コンテキストエンジンのプラグイン](/hermes/docs/developer-guide/context-engine-plugin/)をご覧ください。

## 2層構成の圧縮 {#dual-compression-system}

Hermes には、それぞれ独立して動く2つの圧縮の層があります。

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

### 1. ゲートウェイでのセッションの整理（しきい値 85%） {#1-gateway-session-hygiene-85-threshold}

`gateway/run.py`（`Session hygiene: auto-compress` を検索してください）にあります。これは**安全網**で、
エージェントがメッセージを処理する前に動きます。応答と応答のあいだにセッションが大きくなりすぎたとき
（例: Telegram や Discord で一晩ぶんたまった場合）の API の失敗を防ぎます。

- **しきい値**: モデルのコンテキスト長の 85% で固定
- **トークンの数え方**: 前回の応答で API が実際に報告したトークン数を優先し、なければ
  文字数からのおおまかな見積もり（`estimate_messages_tokens_rough`）を使う
- **動く条件**: `len(history) >= 4` かつ圧縮が有効なときだけ
- **目的**: エージェント側の圧縮をすり抜けたセッションを拾うこと

ゲートウェイ側のしきい値は、エージェント側の圧縮より意図的に高くしてあります。
50%（エージェントと同じ）に設定したところ、長いゲートウェイのセッションでは
応答のたびに早すぎる圧縮が起きました。

### 2. エージェントの ContextCompressor（しきい値 50%、変更可） {#2-agent-contextcompressor-50-threshold-configurable}

`agent/context_compressor.py` にあります。これが**中心となる圧縮の仕組み**で、
エージェントのツール処理の中で動き、API が報告する正確なトークン数を
使えます。

## 設定 {#configuration}

圧縮の設定はすべて、`config.yaml` の `compression` キーの下から読み込まれます。

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
| `threshold` | `0.50` | 0.0-1.0 | プロンプトのトークン数が `threshold × context_length` 以上になると圧縮が動きます |
| `model_thresholds` | `{}` | 対応表 | モデルごとに `threshold` を上書きします。キーはモデル名との部分一致で照合し、いちばん長く一致したものが勝ちます。コンテキストが小さい場合の下限は、この上にさらに適用されます（後述） |
| `target_ratio` | `0.20` | 0.10-0.80 | 末尾を守るためのトークンの枠を決めます: `threshold_tokens × target_ratio`（legacy のときだけ。`lean` は独自の上下限を使います） |
| `tail_mode` | `lean` | `lean`, `legacy` | 末尾をどれだけ残すかの方針です。`legacy` は `target_ratio` の大きさぶんを原文のまま残します（ウィンドウの大きいモデルでは 10 万トークン超になります）。`lean` は`2.5% × context window` に収めた末尾を残し（下限 1 万、上限 2.5 万トークン）、代わりに要約側で話のつながりを持たせます。圧縮した範囲を、識別子を保ったまま分割して要約し、機械的に抜き出した目印の索引（PR 番号、SHA、パス、エラー文字列。正規表現で抜き出し、言い換えは一切しません）を付け、実際の利用者の発言はすべて原文のまま引用し（新しいものから枠のぶんだけ）、要約に丸められたものへ戻れるように `session_search` の手がかりを添えます。50 万トークン規模の実セッションでの結果は、保持がおよそ 16.2 万トークンに対しておよそ 4.9 万トークンで、復元の手段と組み合わせると取り出せる情報はむしろ増えました（`evals/compaction/results/` を参照）。圧縮の境目で要約用の呼び出しが数回ぶん増えます。lean の末尾に含まれる古いツールの結果は、復元の手がかりだけを持つ1行の控えに置き換えられます |
| `protect_last_n` | `20` | 1以上 | 直近のメッセージのうち、必ず残す最小の数です |
| `min_tail_user_messages` | `1` | 1以上 | 圧縮しない末尾に必ず残す、実際の（意味のある）利用者の発言の最小数です。`1` はこれまでどおり直近1件を目印として残す動き（既存の挙動を保つ既定値）です。たとえば `3` にすると、大きなツールの出力が末尾の枠を埋めていても、直近3回の実際の発言が原文のまま残ります。中身のないサービス側の反響、圧縮の引き継ぎ、機械的に補われた継続の行は N に数えません。この保証は末尾のトークンの枠より優先され、目印のために切り取り位置が戻るぶん、末尾が枠を超えることがあります |
| `protect_first_n` | `3` | （固定値） | システムプロンプトと最初のやりとりは常に残します |
| `idle_compact_after_seconds` | `0` | 0秒以上 | 任意の設定です。この秒数だけ間が空いたあとにセッションを再開したとき、先に圧縮します（0 で無効）。コンテキストが threshold × target_ratio 以下なら実行しません。連続実行の待ち時間、揺り戻しの防止、排他の仕組みはそのまま守ります |
| `codex_gpt55_autoraise` | `true` | 真偽値 | ChatGPT Codex の OAuth 経路で gpt-5.5 を使うとき、動き出す点を 85% に引き上げます（後述）。`false` にすると全体の `threshold` を使い続けます |
| `codex_gpt55_autoraise_notice` | `true` | 真偽値 | Codex の gpt-5.5 で引き上げが起きたときの一度きりのお知らせを表示します。`false` にすると 85% への引き上げは保ったまま、表示だけを止めます |
| `codex_app_server_auto` | `native` | `native`, `hermes`, `off` | Codex app-server のセッションでのスレッド圧縮の方式です（後述） |
| `codex_responses_native` | `false` | 真偽値 | OpenAI の Responses API によるサーバー側の圧縮を使います。OpenAI の API を直接使う場合か ChatGPT Codex の契約で、gpt-5.6 系のモデルのときだけ働きます（後述） |
| `codex_responses_compact_threshold` | `null` | `null` または正の整数 | `null` の場合は、手元で決まった圧縮の起動点から 8,192 トークンの余裕を引いた値に従います。正の整数を入れるとその値がそのまま使われ、必要なときだけ下方向に抑えられます。おかしな値を入れたときは自動の動きになります。自動のときに使える手元の起動点がなければ `200000` に戻ります |
| `in_place` | `true` | 真偽値 | 新しいセッション ID に移らず、同じセッション ID のまま圧縮します（後述） |

### 同じ場所での圧縮（セッション ID をひとつに保つ） {#in-place-compaction-single-stable-session-id}

`compression.in_place: true`（既定）のとき、圧縮は**同じセッション ID のまま、現在のメッセージ一覧を書き換えます**。システムプロンプトを組み直し、要約した中間部分を差し込み、圧縮前のやりとりは同じ ID の下でそっと保管します（セッションの保存領域で `active=0, compacted=1` になります）。保管されたものは `session_search` で検索でき、取り出すこともでき、消されることはありません。`parent_session_id` の連なりも、`name #N` の番号の振り直しもありません。ひとつの会話は、最初から最後までひとつの ID を持ち続けます。これによって、セッションが切り替わることで起きていた不具合の一群（`/goal` の状態が失われる、孤立したセッションができる、境目をまたいだ検索が抜ける）がなくなりました。

利用する側は、セッション ID を見比べるのではなく、この方式そのものを見ます。

- `session:compress` イベントは `in_place: true/false` と `old_session_id` を持ちます（同じ場所での圧縮では古い ID が存在しないため、空の文字列になります）。
- ゲートウェイは、ID の変化を見比べるのではなく、エージェントが持つ切り替えに依存しない `_last_compaction_in_place` の値をもとに、記録の扱いを組み直します。

`in_place: false` にすると、以前の切り替え方式に戻ります。この場合、圧縮のたびに新しいセッション ID が作られ、`parent_session_id` で前のものとつながります。

### モデルごとのしきい値の上書き {#per-model-threshold-overrides}

`compression.model_thresholds` を使うと、使っているモデルに応じて圧縮が動き出す点を
変えられます。コンテキストウィンドウの大きさがかなり違うモデルを行き来する場合に
役立ちます（たとえば 100 万トークンのモデルは遅らせてよく、
12.8 万トークンのモデルは早めに圧縮すべきです）。

```yaml
compression:
  threshold: 0.50
  model_thresholds:
    "glm-5.2": 0.40
    "glm-5.2-1M": 0.25
    "claude-sonnet": 0.35
```

解決の規則は次のとおりです。

- キーはモデル名と**部分一致**で照合し、**いちばん長く一致したキー**が
  勝ちます（モデル `glm-5.2-1M` では `glm-5.2-1M` が `glm-5.2` に勝ちます）。
- どのキーにも一致しない場合（または対応表が空の場合）は、全体の `threshold` を使います。
- 上書きは `/model` で切り替えるたびに解決し直されます。一致するキーのないモデルへ
  切り替えると、全体の `threshold` に戻ります。
- **コンテキストが小さい場合の下限は、上書きの上にさらに適用されます**（引き上げのみ）。
  コンテキストウィンドウが 51.2 万トークン未満のモデルは `0.75` を下限とするので、
  下限より小さい上書きは `0.75` に引き上げられます。下限より大きい上書き
  （たとえば `0.80`）はそのまま使われます。

プラグインのコンテキストエンジンも、
`from agent.context_compressor import resolve_model_threshold` で同じ解決処理を使えます。
`update_model()` を上書きしているエンジンは自前の圧縮の方針を持つので、
この対応表を無視して構いません。

### Codex の gpt-5.5 でしきい値を自動で引き上げる {#codex-gpt-55-threshold-autoraise}

ChatGPT Codex の OAuth 経路では、gpt-5.5 のコンテキストウィンドウが **27.2 万トークン**に
制限されています（同じ名前のモデルでも、OpenAI の直接の API と OpenRouter では 105 万、
GitHub Copilot では 40 万です）。既定の 50% で動かすと、圧縮はおよそ 13.6 万で始まり、
モデルが実際に使える幅の半分になってしまいます。経路が Codex の OAuth
（`provider: openai-codex`）で、モデルが gpt-5.5 のとき、Hermes はこの点を
**85%**（およそ 23.1 万）へ引き上げ、無効にする方法を添えたお知らせを表示します。
このお知らせはプロファイルごとに一度だけ出ます。`$HERMES_HOME` の下の印
（`.codex_gpt55_autoraise_notice`）に実行済みであることが記録されるので、
エージェントやセッションの初期化が繰り返されても（たとえばゲートウェイに
メッセージが届くたびに）再表示されません。引き上げ後の値があとから変わった場合は、
もう一度だけ知らせます。影響を受けるのはこの経路だけで、
ほかの提供元での gpt-5.5 は全体の `threshold` のままです。全体の値に戻すには、
次のようにします。

```bash
hermes config set compression.codex_gpt55_autoraise false
```

85% への引き上げは保ったまま、一度きりのお知らせだけを隠すには次のようにします。

```bash
hermes config set compression.codex_gpt55_autoraise_notice false
```

### Codex の大きなコンテキスト用 `-900k` 変種（任意） {#codex-large-context--900k-picker-variants-opt-in}

ChatGPT Codex の基盤は、gpt-5.4 と gpt-5.6（Sol / Terra / Luna）の系列について
27.2 万トークンのウィンドウを*表向きに示して*いますが、実際には ChatGPT の契約の
アカウントでおよそ 91.1 万トークンの入力を受け付けます（2026年8月に実機で確認）。
Hermes は、基本の名前については**表向きの 27.2 万を既定のまま**にしています。
ウィンドウが大きいほど1回のリクエストで送るトークンが増え、契約の利用枠を
はるかに速く使い切るので、大きなウィンドウはあくまで任意です。

大きなウィンドウを使うには、`/model` で `-900k` の付いた変種を明示的に選びます（例:
`gpt-5.6-sol-900k`、`gpt-5.6-terra-900k`、`gpt-5.6-luna-900k`、
`gpt-5.4-900k`）。これらは Hermes 側の別名です。モデル ID を基盤へ送る前に接尾辞は
取り除かれ、料金や使用量の集計でも基本のモデルとして扱われます。実際に 27.2 万に
制限されている名前（gpt-5.5、gpt-5.4-mini）には `-900k` の変種がありません。

圧縮のしきい値はウィンドウに従います。基本の名前（27.2 万）は上で説明した
**85% への自動引き上げ**が効き、`-900k` の変種は全体の
`compression.threshold`（既定は 50%、およそ 45 万）のままです。自動引き上げは
小さなウィンドウを持て余さないためのもので、90 万トークンのウィンドウには要りません。

### Codex app-server でのスレッドの圧縮 {#codex-app-server-thread-compaction}

Codex app-server のセッション（`api_mode: codex_app_server`。codex の CLI や
エージェントの実行環境）は、ほかのどの経路とも違います。裏側のスレッドの
コンテキストは codex のエージェントが持っているので、Hermes の補助の要約役では
小さくできません。手元の記録の写しを書き換えても、本体のスレッドは
コンテキストが強制的に初期化されるまで際限なく大きくなり続けます。この実行環境では、
圧縮を app-server 側の仕組みに任せます。

- 手動の圧縮（`/compress`）は、app-server にスレッドの圧縮を依頼し
  （`thread/compact/start`）、その処理が終わるのを待ちます。
- 自動の圧縮は `compression.codex_app_server_auto` で決まります。
  既定の `native` では、いつ圧縮するかを app-server が判断し、Hermes は
  その結果として起きた圧縮の出来事（回数の集計、セッションの記録）を残します。
  `hermes` にすると Hermes の圧縮のしきい値で app-server の圧縮を始めさせ、
  `off` にすると Hermes 側から始める自動の圧縮を完全に止めます
  （codex 自身が圧縮することはあります）。

この実行環境では、Hermes の手元の記録が書き換えられることはありません。state.db に
圧縮の境目が記録され、目に見える記録はそのまま残ります。それ以外の経路
（Codex の OAuth によるチャットのセッションを含む）は、Hermes の要約による圧縮を使います。

### Responses API による標準の圧縮（OpenAI 直接、または Codex の契約での gpt-5.6） {#native-responses-compaction-gpt-56-on-direct-openai-codex-subscription}

OpenAI の Responses API はサーバー側の圧縮に対応しています。リクエストに
`context_management: [{type: "compaction", compact_threshold: N}]` が含まれ、
組み上げた入力が N トークンを超えると、サーバーが古いコンテキストを整理し、
中身の見えない暗号化された `compaction` という出力の項目にまとめます。Hermes はその項目を、
アシスタントのメッセージがすでに持っている再送用の付随データに取り込み、次以降の
応答で送り返します。これが整理された履歴の代わりになるので、手元で要約を作ることなく
長い文脈を保てます。データを保存しない運用とも相性がよく（`store: false`、
`previous_response_id` も使いません）。

有効にするには `compression.codex_responses_native: true` を設定します。適用の条件は
意図的に狭くしてあり、リクエストのたびに確認されます。

- **モデル:** gpt-5.6 系のみ。ほかのモデルでは、この項目があるとサーバー側で
  失敗します（gpt-5.1 と 5.2 は HTTP 500 を返すか、応答の流れが止まります。
  段階的に切り替えるための構造化された拒否は返らないことを 2026年8月に実機で確認しました）。
- **経路:** `api.openai.com`（OpenAI の API キー）か、ChatGPT Codex の基盤
  （Codex の契約による OAuth）のみ。xAI、GitHub や Copilot、OpenRouter、中継、
  手元のサーバーには、この項目は決して送られません。

圧縮のそれ以外の点は変わりません。手元の圧縮は控えの担い手として構えたままで
（サーバー側のしきい値は手元の起動点よりおよそ 8 千トークン低く抑えられ、
サーバーが先に圧縮します）、提供元がこの項目を構造化された形で拒否した場合は、
そのセッションでの標準の圧縮を止め、項目を外してリクエストをやり直します。
セッションを対象外のモデルや経路に切り替えた場合は、単に項目が送られなくなります。
取り込んだ途中経過は、接続先が変わった時点で、発行元をまたぐことを防ぐ既存の仕組みによって再送から外されます。

既定では `compression.codex_responses_compact_threshold: null` になっていて、
サーバー側のしきい値は手元で決まった起動点から導かれます。たとえば手元の起動点が
76 万 5000 なら 75 万 6808 が選ばれます。20 万のような決まった値をそのまま使いたい
ときは、正の整数を設定します。おかしな値を入れたときは自動の動きになります。
使える手元の起動点がなければ、自動のときは 20 万を使います。提供元が受け付ける
最小は 1,024 トークンなので、手元の起動点がその下限と同じか下回るほど小さい場合は、
サーバー側を必ず先に動かす順序を保てません。

### 計算された値（既定の設定で、コンテキストが 20 万トークンのモデルの場合） {#computed-values-for-a-200k-context-model-at-defaults}

```
context_length       = 200,000
threshold_tokens     = 200,000 × 0.50 = 100,000
tail_token_budget    = 100,000 × 0.20 = 20,000
max_summary_tokens   = min(200,000 × 0.05, 12,000) = 10,000
```

:::note しきい値は主となるモデルのコンテキストウィンドウから決まります
`threshold_tokens` は常に `threshold × context_length` です。ここでの `context_length` は
**主となるエージェントのモデル**のコンテキストウィンドウで、補助や要約に使うモデルの
ものではありません。26 万 2144 トークンのモデルで既定の `0.50` を使うと、しきい値は
`262,144 × 0.50 = 131,072` です。この数字がよく聞く「12.8 万コンテキスト」に近いのは
割合から出た偶然であって、補助のモデルのウィンドウが引き金になっている
わけではありません。補助のモデルのコンテキストウィンドウは別の話です。これは要約を
作れるかどうかに関わるもので、圧縮がいつ動くかとは関係ありません。詳しくは
後述の「要約に使うモデルのコンテキスト長」の注意をご覧ください。
:::

## 圧縮の手順 {#compression-algorithm}

`ContextCompressor.compress()` は、4つの段階からなる手順で進みます。

### 段階1: 古いツールの結果を落とす（安価、LLM の呼び出しなし） {#phase-1-prune-old-tool-results-cheap-no-llm-call}

守られている末尾の外にある古いツールの結果（200 文字超）は、次の文字列に置き換えられます。
```
[Old tool output cleared to save context space]
```

これは安価な前処理で、量の多いツールの出力（ファイルの中身、端末の出力、
検索結果）から、まとまったトークンを節約できます。

### 段階2: 境目を決める {#phase-2-determine-boundaries}

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

末尾を守る範囲は**トークンの枠で決まります**。末尾から前へたどりながら
トークンを積み上げ、枠を使い切ったところで止めます。枠で守れるメッセージ数のほうが
少なくなる場合は、固定値の `protect_last_n` を使います。

境目は、tool_call と tool_result の組を分断しないように調整されます。
`_align_boundary_backward()` は、連続するツールの結果をさかのぼって
親にあたるアシスタントのメッセージを探し、組をまとまりのまま保ちます。

### 段階3: 決まった形の要約を作る {#phase-3-generate-structured-summary}

:::warning 要約に使うモデルのコンテキスト長
要約に使うモデルのコンテキストウィンドウは、主となるエージェントのモデル**と同じ以上**の大きさが必要です。中間部分は丸ごと、`call_llm(task="compression")` の1回の呼び出しで要約用のモデルへ送られます。要約用のモデルのコンテキストが小さいと、API はコンテキスト長のエラーを返します。`_generate_summary()` がそれを受け止めて警告を記録し、`None` を返します。すると圧縮の処理は**要約のないまま**中間部分を捨てるので、会話の文脈が黙って失われます。圧縮の質が落ちる原因として、これがいちばん多いものです。
:::

中間部分のやりとりは、補助の LLM を使い、決まった形の型に沿って
要約されます。

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

要約に使えるトークンの枠は、圧縮する内容の量に応じて決まります。
- 計算式: `content_tokens × 0.20`（`_SUMMARY_RATIO` という定数）
- 下限: 2,000 トークン
- 上限: `min(context_length × 0.05, 12,000)` トークン

### 段階4: 圧縮後のメッセージを組み立てる {#phase-4-assemble-compressed-messages}

圧縮後のメッセージの一覧は、次の順になります。
1. 先頭のメッセージ（最初の圧縮のときだけ、システムプロンプトに注記が足されます）
2. 要約のメッセージ（同じ役割が続く並びにならないよう、役割が選ばれます）
3. 末尾のメッセージ（手を加えません）

宙に浮いた tool_call と tool_result の組は、`_sanitize_tool_pairs()` が整理します。
- 取り除かれた呼び出しを指すツールの結果 → 取り除きます
- 結果が取り除かれたツールの呼び出し → 代わりの結果を差し込みます

### 繰り返しの再圧縮 {#iterative-re-compression}

2回目以降の圧縮では、前回の要約を LLM に渡し、一から作り直すのではなく
**更新する**ように指示します。これによって、複数回の圧縮をまたいで情報が保たれます。
項目は「In Progress」から「Done」へ移り、新しい進み具合が足され、
古くなった情報は取り除かれます。

このために、圧縮を担う側の `_previous_summary` という項目が、
前回の要約の文章を保持しています。

## 圧縮前と圧縮後の例 {#beforeafter-example}

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

## プロンプトのキャッシュ（Anthropic） {#prompt-caching-anthropic}

対象のソース: `agent/prompt_caching.py`

会話の前半部分をキャッシュすることで、何度もやりとりする会話の入力トークンの費用を
およそ 75% 減らします。Anthropic の `cache_control` の区切りを使います。

### 方式: system_and_3 {#strategy-systemand3}

Anthropic では、1回のリクエストにつき `cache_control` の区切りは最大4つです。Hermes は
「system_and_3」という方式を使います。

```
Breakpoint 1: System prompt           (stable across all turns)
Breakpoint 2: 3rd-to-last non-system message  ─┐
Breakpoint 3: 2nd-to-last non-system message   ├─ Rolling window
Breakpoint 4: Last non-system message          ─┘
```

### 仕組み {#how-it-works}

`apply_anthropic_cache_control()` はメッセージを丸ごと複製し、
`cache_control` の目印を差し込みます。

```python
# Cache marker format
marker = {"type": "ephemeral"}
# Or for 1-hour TTL:
marker = {"type": "ephemeral", "ttl": "1h"}
```

目印の付け方は、中身の種類によって変わります。

| 中身の種類 | 目印を付ける場所 |
|-------------|-------------------|
| 文字列 | `[{"type": "text", "text": ..., "cache_control": ...}]` に変換します |
| 一覧 | 最後の要素の辞書に足します |
| なし、または空 | `msg["cache_control"]` として足します |
| ツールのメッセージ | `msg["cache_control"]` として足します（Anthropic の API を直接使う場合のみ） |

### キャッシュを意識した設計の型 {#cache-aware-design-patterns}

1. **システムプロンプトを動かさない**: システムプロンプトは1つ目の区切りで、
   すべてのやりとりでキャッシュされます。会話の途中で書き換えないようにします
   （圧縮が注記を足すのは、最初の圧縮のときだけです）。

2. **メッセージの並び順が効きます**: キャッシュに当てるには前半部分の一致が必要です。
   途中でメッセージを足したり取り除いたりすると、それ以降のキャッシュが無効になります。

3. **圧縮とキャッシュの関わり**: 圧縮のあと、圧縮した範囲のキャッシュは無効になりますが、
   システムプロンプトのキャッシュは残ります。直近3件をたどる窓は、
   1〜2回のやりとりでキャッシュを取り戻します。

4. **保持時間の選び方**: 既定は `5m`（5分）です。やりとりのあいだに間が空く
   長時間のセッションでは `1h` を使います。

5. **どのモデルかもキャッシュの鍵の一部です**: 提供元側のキャッシュは、リクエストを
   処理するモデル（およびアカウントや API キー）ごとに分かれています。会話の途中で
   モデルが変わると、つまり `/model` による明示的な切り替え、主のモデルからの切り替え、
   別のアカウントへの資格情報の入れ替えが起きると、次のリクエストではキャッシュに
   まったく当たらず、会話全体を割引のない入力の価格で読み直すことになります。これは
   提供元のキャッシュの仕組みそのものによるもので、Hermes の側で避けられるものでは
   ありません。`/model`、控えの提供元、資格情報のまとまりについての利用者向けの説明に
   費用の注意が書かれているのは、このためです。会話の途中でモデルや資格情報を
   黙って入れ替える機能は足さないでください。

### プロンプトのキャッシュを有効にする {#enabling-prompt-caching}

プロンプトのキャッシュは、次の条件で自動的に有効になります。
- モデルが Anthropic の Claude 系である（モデル名から判定します）
- 提供元が `cache_control` に対応している（Anthropic の API を直接使う場合か OpenRouter）

```yaml
# config.yaml — TTL is configurable (must be "5m" or "1h")
prompt_caching:
  cache_ttl: "5m"
```

CLI は起動時にキャッシュの状態を表示します。
```
💾 Prompt caching: ENABLED (Claude via OpenRouter, 5m TTL)
```

## コンテキストの逼迫を知らせる仕組みについて {#context-pressure-warnings}

途中でコンテキストの逼迫を知らせる仕組みは取り除かれました（`run_agent.py` の繰り返し回数の枠を扱う箇所に、「途中で逼迫を知らせない。難しい作業でモデルが早々にあきらめる原因になった」という注記があります）。圧縮は、プロンプトのトークン数が設定した `compression.threshold`（既定は 50%）に達した時点で、事前の知らせなしに動きます。ゲートウェイでのセッションの整理は、モデルのコンテキストウィンドウの 85% で働く二次的な安全網です。
