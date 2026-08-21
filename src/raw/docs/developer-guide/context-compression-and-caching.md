---
title: "コンテキストの圧縮とキャッシュ"
description: ""
upstream_path: developer-guide/context-compression-and-caching.md
upstream_blob: 31e3c9a0cb751f16a579a59c5fb0c5160e550fc3
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/context-compression-and-caching
---

# コンテキストの圧縮とキャッシュ {#context-compression-and-caching}

Hermes Agent は 2 段構えの圧縮のしくみと Anthropic のプロンプトキャッシュを使って、
長い会話でもコンテキストウィンドウを無駄なく使えるようにしています。

ソースファイル: `agent/context_engine.py`（抽象基底クラス）、`agent/context_compressor.py`（既定のエンジン）、
`agent/prompt_caching.py`、`gateway/run.py`（セッションの手入れ）、`run_agent.py`（`_compress_context` で検索）

## 差し替えできるコンテキストエンジン {#pluggable-context-engine}

コンテキストの管理は `ContextEngine` の抽象基底クラス（`agent/context_engine.py`）の上に組まれています。組み込みの `ContextCompressor` が既定の実装ですが、プラグインで別のエンジン（たとえば情報を落とさないコンテキスト管理）に差し替えられます。

```yaml
context:
  engine: "compressor"    # default — built-in lossy summarization
  engine: "lcm"           # example — plugin providing lossless context
```

エンジンが受け持つのは次のことです。
- いつ圧縮を始めるかを決める（`should_compress()`）
- 実際に圧縮する（`compress()`）
- 必要ならエージェントが呼べるツールを提供する（たとえば `lcm_grep`）
- API の応答からトークンの使用量を数える

どのエンジンを使うかは `config.yaml` の `context.engine` で決まります。解決される順番は次のとおりです。
1. `plugins/context_engine/<name>/` のディレクトリを調べる
2. 一般のプラグインのしくみを調べる（`register_context_engine()`）
3. 組み込みの `ContextCompressor` に落ちる

プラグインのエンジンが **ひとりでに有効になることはありません**。利用者が `context.engine` にプラグインの名前を明示する必要があります。既定の `"compressor"` は必ず組み込みのものを使います。

設定は `hermes plugins` → Provider Plugins → Context Engine から行うか、`config.yaml` を直接編集してください。

コンテキストエンジンのプラグインを作るときは、[コンテキストエンジンのプラグイン](/hermes/docs/developer-guide/context-engine-plugin/) を参照してください。

## 2 段構えの圧縮のしくみ {#dual-compression-system}

Hermes には、それぞれ独立して働く 2 つの圧縮の層があります。

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

### 1. ゲートウェイのセッションの手入れ（85% で作動） {#1-gateway-session-hygiene-85-threshold}

`gateway/run.py` にあります（`Session hygiene: auto-compress` で検索してください）。これは **安全網** で、
エージェントがメッセージを処理する前に走ります。ターンとターンの間にセッションが
大きくなりすぎたとき（Telegram や Discord で一晩たまった場合など）に、API が失敗するのを防ぎます。

- **作動の閾値**: モデルのコンテキスト長の 85% に固定
- **トークンの見方**: 直前のターンで API が実際に報告したトークン数を優先し、
  なければ文字数からのおおまかな見積もり（`estimate_messages_tokens_rough`）に落とす
- **作動する条件**: `len(history) >= 4` で、かつ圧縮が有効なときだけ
- **目的**: エージェント自身の圧縮をすり抜けたセッションを捕まえる

ゲートウェイの手入れの閾値は、エージェント側の圧縮よりわざと高くしてあります。
エージェントと同じ 50% にしたところ、長いゲートウェイのセッションでは毎ターン
早すぎる圧縮が起きてしまいました。

### 2. エージェントの ContextCompressor（50% で作動、変更可能） {#2-agent-contextcompressor-50-threshold-configurable}

`agent/context_compressor.py` にあります。これが **本命の圧縮のしくみ** で、
エージェントのツールループの中で、API が報告する正確なトークン数を使って
動きます。

## 設定 {#configuration}

圧縮の設定はすべて `config.yaml` の `compression` キーの下から読まれます。

```yaml
compression:
  enabled: true              # Enable/disable compression (default: true)
  threshold: 0.50            # Fraction of context window (default: 0.50 = 50%)
  # model_thresholds:        # Per-model threshold overrides (substring match,
  #   "glm-5.2": 0.40        # longest key wins). See "Per-model threshold
  #   "claude-sonnet": 0.35  # overrides" below.
  target_ratio: 0.20         # How much of threshold to keep as tail (default: 0.20)
  tail_mode: legacy          # Tail retention policy: legacy | lean (default: legacy)
  protect_last_n: 20         # Minimum protected tail messages (default: 20)
  min_tail_user_messages: 1  # Real user messages guaranteed in the tail (default: 1)
  codex_gpt55_autoraise: true  # gpt-5.5 on Codex OAuth: raise trigger to 85% (default: true)
  codex_gpt55_autoraise_notice: true  # Show the one-time autoraise notice (default: true)
  codex_app_server_auto: native  # native|hermes|off for Codex app-server thread compaction
  codex_responses_native: false  # gpt-5.6 on direct OpenAI/Codex: server-side compaction (opt-in)
  codex_responses_compact_threshold: 200000  # Server-side compaction trigger (input tokens)
  in_place: true             # Compact on the same session id, no rotation (default: true)

# Summarization model/provider configured under auxiliary:
auxiliary:
  compression:
    model: null              # Override model for summaries (default: auto-detect)
    provider: auto           # Provider: "auto", "openrouter", "nous", "main", etc.
    base_url: null           # Custom OpenAI-compatible endpoint
```

### 各項目の詳しい説明 {#parameter-details}

| 項目 | 既定値 | 範囲 | 説明 |
|-----------|---------|-------|-------------|
| `threshold` | `0.50` | 0.0-1.0 | プロンプトのトークン数が `threshold × context_length` 以上になると圧縮が始まります |
| `model_thresholds` | `{}` | マップ | モデルごとに `threshold` を上書きします。キーはモデル名に対する部分一致で照合され、いちばん長く一致したものが勝ちます。その上で、小さいコンテキスト向けの下限が重ねて効きます（後述） |
| `target_ratio` | `0.20` | 0.10-0.80 | そのまま残す末尾のトークン予算を決めます: `threshold_tokens × target_ratio`（legacy のときだけ。`lean` は独自の上限・下限を使います） |
| `tail_mode` | `legacy` | `legacy`, `lean` | 末尾をどう残すかの方針です。`legacy` は `target_ratio` の大きさぶんの末尾をそのまま残します（大きなウィンドウのモデルでは 10 万トークン超になります）。`lean` は `2.5% × context window` に収めた末尾（下限 10K、上限 25K）だけを残し、代わりに要約のほうで話のつながりを運びます。圧縮した部分を、識別子を残したまま塊ごとにまとめた要約、機械的に抜き出した手がかりの索引（PR 番号、SHA、パス、エラー文字列。正規表現で抜き出し、決して言い換えません）、実際の利用者メッセージすべての原文引用（新しいものから予算の許すかぎり）、そして要約に畳み込んだ内容へ後から戻れるようにする `session_search` の手がかり、という形です。50 万トークンの実セッションでの結果は、残る量が約 162K に対して約 49K で、後から取り出す手段と組み合わせれば思い出せる率はむしろ上がりました（`evals/compaction/results/` を参照）。その分、圧縮の切れ目で要約の呼び出しが数回ぶん増えます。lean の末尾に残った古いツールの結果は、後から取り出すための手がかりを持つ 1 行の切り株に置き換えられます |
| `protect_last_n` | `20` | ≥1 | 必ず残される直近メッセージの最小件数 |
| `min_tail_user_messages` | `1` | ≥1 | 圧縮されない末尾に必ず生き残る、実際に指示となる利用者メッセージの最小件数。`1` は、これまでどおり直近の利用者メッセージ 1 件を錨にする挙動（既定のまま動きが変わりません）。たとえば `3` に上げると、かさばるツール出力が末尾のトークン予算を食っていても、直近 3 件の実際の利用者のやりとりが原文のまま残ります。中身のないプラットフォームの反響、圧縮の引き継ぎ、機械的に作られた継続の行は、この件数には数えません。この保証は末尾のトークン予算より優先され、錨が切れ目を押し戻すぶん、末尾が予算を超えることがあります |
| `protect_first_n` | `3` | （コードに固定） | システムプロンプトと最初のやりとりは常に残されます |
| `idle_compact_after_seconds` | `0` | ≥0 秒 | 任意設定: セッションがこの秒数だけ放置されたあとに再開したとき、先に圧縮しておきます（0 で無効）。コンテキストが threshold × target_ratio 以下なら見送り、待ち時間・連続作動防止・ロックの守りには従います |
| `codex_gpt55_autoraise` | `true` | 真偽値 | ChatGPT Codex OAuth 経由の gpt-5.5 について、作動の閾値を 85% に引き上げます（後述）。`false` にすると全体の `threshold` のままになります |
| `codex_gpt55_autoraise_notice` | `true` | 真偽値 | Codex の gpt-5.5 で閾値を引き上げたことを一度だけ知らせます。`false` にすると 85% への引き上げは残したまま、知らせだけを出さなくできます |
| `codex_app_server_auto` | `native` | `native`, `hermes`, `off` | Codex app-server のセッションでのスレッド圧縮のしかた（後述） |
| `codex_responses_native` | `false` | 真偽値 | Responses API での OpenAI 側の圧縮を使うかどうか。OpenAI の API を直接使う場合か ChatGPT Codex の契約経由で、gpt-5.6 系のモデルのときだけ働きます（後述） |
| `codex_responses_compact_threshold` | `200000` | ≥1 トークン | サーバー側の圧縮が始まる入力トークン数。リクエストのたびに手元の圧縮の閾値より下に抑えられ、サーバー側が先に圧縮するようになっています |
| `in_place` | `true` | 真偽値 | 新しいセッション ID に切り替えず、同じ ID のまま圧縮します（後述） |

### その場での圧縮（セッション ID を変えない） {#in-place-compaction-single-stable-session-id}

`compression.in_place: true`（既定）のとき、圧縮は **同じセッション ID のまま、その場のメッセージ一覧を書き換えます**。システムプロンプトが組み直され、要約された中ほどが差し込まれ、圧縮前のやりとりは同じ ID のもとで静かに保管されます（セッションの保管先では `active=0, compacted=1`）。それらは `session_search` で今も検索でき、取り戻すこともでき、消されることはありません。`parent_session_id` の連なりも `name #N` の番号振り直しもなく、1 つの会話は一生を通じて 1 つの変わらない ID を持ちます。これによって、セッションが切り替わることで起きていた不具合の一群（`/goal` の状態が消える、行き場のないセッションが残る、境目をまたいだ検索が抜ける）がなくなりました。

これを使う側は、セッション ID の差分を見るのではなく、どちらのやり方かを見ます。

- `session:compress` のイベントが `in_place: true/false` と `old_session_id` を運びます（その場で圧縮する場合は古い ID がないので空文字列です）。
- ゲートウェイは、ID の変化を見比べるのではなく、エージェントが持つ切り替えとは無関係な `_last_compaction_in_place` のフラグを見て、記録の扱いを引き直します。

`in_place: false` にすると、これまでの切り替え方式に戻ります。圧縮のたびに新しいセッション ID が作られ、`parent_session_id` で前のものにつながります。

### モデルごとの閾値の上書き {#per-model-threshold-overrides}

`compression.model_thresholds` を使うと、いま使っているモデルによって
圧縮が始まる位置を変えられます。コンテキストウィンドウの大きさが
まるで違うモデルを行き来するときに便利です（たとえば 100 万コンテキストの
モデルは遅めに圧縮してよく、128K のモデルは早めに圧縮したい、というように）。

```yaml
compression:
  threshold: 0.50
  model_thresholds:
    "glm-5.2": 0.40
    "glm-5.2-1M": 0.25
    "claude-sonnet": 0.35
```

決まり方は次のとおりです。

- キーはモデル名に対して **部分一致** で照合され、**いちばん長く一致した
  キーが勝ちます**（モデル `glm-5.2-1M` では `glm-5.2-1M` が `glm-5.2` に勝ちます）。
- どのキーにも当たらないとき（あるいはマップが空のとき）は、全体の `threshold` が使われます。
- この上書きは `/model` で切り替えるたびに引き直されます。当たるキーのない
  モデルに切り替えると、全体の `threshold` に戻ります。
- **小さいコンテキスト向けの下限は、上書きの上に重ねて効きます**（上げる方向のみ）。
  コンテキストウィンドウが 512K に満たないモデルは `0.75` が下限になるので、
  それより小さい上書きは `0.75` まで引き上げられ、それより大きい上書き
  （たとえば `0.80`）はそのまま通ります。

プラグインのコンテキストエンジンも、
`from agent.context_compressor import resolve_model_threshold` で同じ解決の
しくみを使い回せます。`update_model()` を自前で持つエンジンは圧縮の方針も
自分で決めるので、このマップを無視してかまいません。

### Codex の gpt-5.5 で閾値を自動で引き上げる {#codex-gpt-55-threshold-autoraise}

ChatGPT Codex の OAuth 経由では、gpt-5.5 のコンテキストウィンドウが **272K** に
制限されています（同じ名前のモデルでも、OpenAI の直接の API と OpenRouter では
1.05M、GitHub Copilot では 400K あります）。既定の 50% では圧縮が約 136K で
始まってしまい、モデルが実際に使える窓の半分しか使えません。使っている経路が
Codex の OAuth（`provider: openai-codex`）で、モデルが gpt-5.5 のとき、Hermes は
作動の閾値を **85%**（約 231K）に引き上げ、元に戻すコマンドを添えた知らせを
出します。この知らせはプロファイルごとに一度だけです。`$HERMES_HOME` の下の
印（`.codex_gpt55_autoraise_notice`）が実行済みであることを覚えているので、
エージェントやセッションの初期化が繰り返されても（ゲートウェイに届く
メッセージごとなど）二度は出ません。引き上げ後の閾値があとで変わったときは、
もう一度だけ知らせます。影響を受けるのはこの経路だけで、ほかのプロバイダの
gpt-5.5 は全体の `threshold` のままです。全体の値に戻すには、次のようにします。

```bash
hermes config set compression.codex_gpt55_autoraise false
```

85% への引き上げは残したまま、一度きりの知らせだけを消したい場合は、次のようにします。

```bash
hermes config set compression.codex_gpt55_autoraise_notice false
```

### Codex app-server のスレッド圧縮 {#codex-app-server-thread-compaction}

Codex app-server のセッション（`api_mode: codex_app_server` — codex の CLI と
エージェントのランタイム）は、ほかのどの経路とも違います。裏側のスレッドの
コンテキストを持っているのは codex のエージェントのほうなので、Hermes の補助
要約モデルではそれを縮められません。手元の記録の写しを書き換えても、本物の
スレッドはコンテキストが強制的にリセットされるまで際限なく育ち続けます。
このランタイムでは、圧縮は app-server 自身のしくみを通して行われます。

- 手動の圧縮（`/compress`）は、app-server にスレッドの圧縮を依頼し
  （`thread/compact/start`）、その圧縮のターンが終わるまで待ちます。
- 自動の圧縮は `compression.codex_app_server_auto` で決まります。
  既定の `native` は、いつ圧縮するかを app-server に任せ、Hermes は起きた
  圧縮の出来事を記録します（圧縮の回数、セッションの出来事）。`hermes` に
  すると Hermes 側の圧縮の閾値で app-server の圧縮を始めさせ、`off` に
  すると Hermes からの自動の圧縮を完全にやめます（codex が自分の判断で
  圧縮することはあります）。

このランタイムでは、Hermes の手元の記録が書き換えられることはありません。
state.db が圧縮の切れ目を記録し、目に見える記録はそのまま残ります。ほかの
経路（Codex OAuth のチャットのセッションを含む）は、これまでどおり Hermes の
要約による圧縮を使います。

### Responses の純正の圧縮（OpenAI 直接 / Codex 契約での gpt-5.6） {#native-responses-compaction-gpt-56-on-direct-openai-codex-subscription}

OpenAI の Responses API には、サーバー側の圧縮があります。リクエストに
`context_management: [{type: "compaction", compact_threshold: N}]` が含まれていて、
組み上がった入力が N トークンを超えると、サーバーが古いコンテキストを刈り取り、
中身の見えない暗号化された `compaction` の出力項目にまとめます。Hermes はその
項目を、assistant メッセージがもともと持っている再生用の付属データに取り込み、
以降のターンで送り返します。これが刈り取られた履歴の代わりを務めるので、
手元で要約を作らなくても長い見通しが保てますし、ZDR とも相性がよい形です
（`store: false` で、`previous_response_id` を使いません）。

使うには `compression.codex_responses_native: true` にします。この関門は
わざと狭くしてあり、リクエストのたびに確かめられます。

- **モデル**: gpt-5.6 系のみ。ほかのモデルでは、この項目があるとサーバー側で
  失敗します（gpt-5.1 や 5.2 では HTTP 500 が返るか、ストリームが止まります。
  段階的に諦めるための構造化された拒否応答が返らないためです。2026 年 8 月に
  実機で確認）。
- **経路**: `api.openai.com`（OpenAI の API キー）か ChatGPT Codex のバックエンド
  （Codex 契約の OAuth）のみ。xAI、GitHub や Copilot、OpenRouter、中継、
  手元のサーバーには、この項目が送られることはありません。

圧縮のほかの部分は変わりません。手元の圧縮は控えの担い手として構えたままですし
（サーバー側が先に圧縮するよう、純正側の閾値は手元の作動点より 8K トークンほど
低く抑えられます）、この項目がプロバイダから構造化された形で拒否された場合は、
そのセッションでは純正の圧縮を無効にして、項目なしでリクエストをやり直します。
セッションを対象外のモデルや経路に切り替えたときは、単にこの項目が送られなく
なるだけです。取り込んだ途中経過は、接続先が変わったときに既存の発行元またぎの
守りによって再生から外されます。

### 実際の値（20 万コンテキストのモデル、既定値の場合） {#computed-values-for-a-200k-context-model-at-defaults}

```
context_length       = 200,000
threshold_tokens     = 200,000 × 0.50 = 100,000
tail_token_budget    = 100,000 × 0.20 = 20,000
max_summary_tokens   = min(200,000 × 0.05, 12,000) = 10,000
```

:::note 閾値は「主となるモデル」のコンテキストウィンドウから決まります
`threshold_tokens` は必ず `threshold × context_length` で、この `context_length`
は **主となるエージェントのモデル** のコンテキストウィンドウです。補助や要約の
モデルのものではありません。262,144 トークンのモデルで既定の `0.50` なら、閾値は
`262,144 × 0.50 = 131,072` です。この数がよく聞く「128K コンテキスト」に近いのは
割合の計算がたまたまそうなっただけで、補助モデルの窓が引き金になっている
わけではありません。補助モデルのコンテキストウィンドウは別の話で、要約を作れるか
どうかに関わります。圧縮がいつ始まるかではありません。詳しくは後述の
「要約モデルのコンテキスト長」の注意を参照してください。
:::

## 圧縮のアルゴリズム {#compression-algorithm}

`ContextCompressor.compress()` のメソッドは、4 つの段階で進みます。

### 段階 1: 古いツールの結果を刈り取る（安上がりで、LLM を呼ばない） {#phase-1-prune-old-tool-results-cheap-no-llm-call}

守られている末尾の外にある、200 文字を超える古いツールの結果は、次の文言に置き換えられます。
```
[Old tool output cleared to save context space]
```

これは安上がりな下ごしらえで、長々としたツールの出力（ファイルの中身、端末の
出力、検索結果）からかなりのトークンを取り戻せます。

### 段階 2: 境目を決める {#phase-2-determine-boundaries}

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

末尾をどこまで守るかは **トークンの予算で決まります**。末尾から前へ向かって
トークンを積み上げ、予算を使い切ったところで止めます。その予算で守れる件数が
少なすぎる場合は、固定の `protect_last_n` の件数に切り替えます。

境目は、ツール呼び出しと結果の組を割らないように整えられます。
`_align_boundary_backward()` のメソッドが、連なるツールの結果をさかのぼって
親の assistant メッセージを見つけ、組をまとめたまま保ちます。

### 段階 3: 型のある要約を作る {#phase-3-generate-structured-summary}

:::warning 要約モデルのコンテキスト長
要約に使うモデルのコンテキストウィンドウは、主となるエージェントのモデル **と同じか、それ以上** の大きさが必要です。中ほどの部分はまるごと、1 回の `call_llm(task="compression")` の呼び出しで要約モデルに送られます。要約モデルのコンテキストのほうが小さいと、API はコンテキスト長のエラーを返します。`_generate_summary()` はそれを捕まえて警告を残し、`None` を返します。すると圧縮の処理は、中ほどのやりとりを **要約なしで** 捨ててしまい、会話の文脈が静かに失われます。圧縮の質が落ちる原因として、これがいちばんよくあるものです。
:::

中ほどのやりとりは、補助の LLM を使い、次の型に沿って要約されます。

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

要約に使えるトークンは、圧縮する分量に応じて伸び縮みします。
- 計算式: `content_tokens × 0.20`（`_SUMMARY_RATIO` の定数）
- 下限: 2,000 トークン
- 上限: `min(context_length × 0.05, 12,000)` トークン

### 段階 4: 圧縮後のメッセージを組み立てる {#phase-4-assemble-compressed-messages}

圧縮後のメッセージ一覧は、次のようになります。
1. 先頭のメッセージ（初回の圧縮のときだけ、システムプロンプトに注記が足されます）
2. 要約のメッセージ（同じ役割が続いてしまわないように役割が選ばれます）
3. 末尾のメッセージ（手を加えません）

行き場をなくしたツール呼び出しと結果の組は、`_sanitize_tool_pairs()` が整えます。
- 消えた呼び出しを指しているツールの結果 → 取り除かれます
- 結果が取り除かれたツール呼び出し → 差し障りのない結果が差し込まれます

### 繰り返しの再圧縮 {#iterative-re-compression}

2 回目以降の圧縮では、前回の要約が LLM に渡され、一から作り直すのではなく
**更新する** よう指示されます。これによって何度圧縮しても情報が引き継がれます。
項目が「In Progress」から「Done」に移り、新しい進み具合が足され、古くなった
情報が落とされていきます。

そのために、圧縮を行うオブジェクトの `_previous_summary` のフィールドに、
直前の要約の文章が保持されます。

## 圧縮の前後の例 {#beforeafter-example}

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

出どころ: `agent/prompt_caching.py`

会話の前半部分をキャッシュすることで、何往復もするやりとりでの入力トークンの
費用を 75% ほど減らします。Anthropic の `cache_control` の区切りを使います。

### 方式: system_and_3 {#strategy-systemand3}

Anthropic では 1 回のリクエストにつき `cache_control` の区切りを最大 4 つまで
置けます。Hermes は「system_and_3」の方式を採っています。

```
Breakpoint 1: System prompt           (stable across all turns)
Breakpoint 2: 3rd-to-last non-system message  ─┐
Breakpoint 3: 2nd-to-last non-system message   ├─ Rolling window
Breakpoint 4: Last non-system message          ─┘
```

### どう動くか {#how-it-works}

`apply_anthropic_cache_control()` はメッセージを深く複製してから、
`cache_control` の目印を差し込みます。

```python
# Cache marker format
marker = {"type": "ephemeral"}
# Or for 1-hour TTL:
marker = {"type": "ephemeral", "ttl": "1h"}
```

目印の付け方は、中身の型によって変わります。

| 中身の型 | 目印を置く場所 |
|-------------|-------------------|
| 文字列 | `[{"type": "text", "text": ..., "cache_control": ...}]` に変換されます |
| リスト | 最後の要素の辞書に足されます |
| None または空 | `msg["cache_control"]` として足されます |
| ツールのメッセージ | `msg["cache_control"]` として足されます（Anthropic 純正のときだけ） |

### キャッシュを意識した設計の型 {#cache-aware-design-patterns}

1. **システムプロンプトを動かさない**: システムプロンプトは 1 つ目の区切りで、
   すべてのターンでキャッシュされます。会話の途中で書き換えないでください
   （圧縮が注記を足すのは、初回の圧縮のときだけです）。

2. **メッセージの並び順が効いてくる**: キャッシュが当たるには、前半部分が
   一致している必要があります。途中でメッセージを足したり消したりすると、
   それ以降のキャッシュがすべて無効になります。

3. **圧縮とキャッシュの関わり**: 圧縮のあと、圧縮された範囲のキャッシュは
   無効になりますが、システムプロンプトのキャッシュは生き残ります。動いていく
   3 メッセージの窓は、1〜2 ターンでキャッシュを取り戻します。

4. **TTL の選び方**: 既定は `5m`（5 分）です。ターンとターンの間に利用者が
   席を外すような長丁場のセッションでは `1h` を使ってください。

5. **どのモデルかもキャッシュの鍵の一部です**: プロバイダ側のキャッシュは、
   リクエストを処理するモデル（およびアカウントや API キー）ごとに分かれて
   います。会話の途中でモデルが変わること — `/model` での明示的な切り替え、
   主モデルからのフォールバック、資格情報のプールが別アカウントに回ること —
   はどれも、次のリクエストでキャッシュがまったく当たらず、会話全体を割引なしの
   入力価格で読み直すことを意味します。これはプロバイダのキャッシュのしくみ
   そのものから来るもので、Hermes に避けようがありません。`/model`、
   フォールバックのプロバイダ、資格情報のプールについての利用者向け
   ドキュメントに費用の注意が書かれているのはこのためです。セッションの途中で
   黙ってモデルや資格情報を入れ替えるような機能は足さないでください。

### プロンプトキャッシュを有効にする {#enabling-prompt-caching}

プロンプトキャッシュは、次の条件がそろうと自動で有効になります。
- モデルが Anthropic の Claude 系である（モデル名で判定します）
- プロバイダが `cache_control` に対応している（Anthropic 純正の API か OpenRouter）

```yaml
# config.yaml — TTL is configurable (must be "5m" or "1h")
prompt_caching:
  cache_ttl: "5m"
```

CLI は起動時にキャッシュの状態を表示します。
```
💾 Prompt caching: ENABLED (Claude via OpenRouter, 5m TTL)
```

## コンテキストの逼迫を知らせるしくみ {#context-pressure-warnings}

途中でコンテキストの逼迫を知らせるしくみは取り除かれました（`run_agent.py` の反復回数の予算のあたりに、「途中の逼迫の警告はなし。難しいタスクの途中でモデルが早々に『あきらめる』原因になっていた」という趣旨の注記があります）。圧縮は、プロンプトのトークン数が設定した `compression.threshold`（既定は 50%）に達した時点で、前触れなく始まります。ゲートウェイのセッションの手入れは、モデルのコンテキストウィンドウの 85% で働く二の矢の安全網です。
