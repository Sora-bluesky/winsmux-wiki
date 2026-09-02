---
title: "コンテキストの圧縮とキャッシュ"
description: ""
upstream_path: developer-guide/context-compression-and-caching.md
upstream_blob: 223b802797a089e2e2dc51d99ea6ffbca1d7b664
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/context-compression-and-caching
---

# コンテキストの圧縮とキャッシュ {#context-compression-and-caching}

Hermes Agent は2段構えの圧縮と Anthropic のプロンプトキャッシュを組み合わせて、
長い会話でもコンテキストウィンドウを無駄なく使えるようにしています。

対象のソース: `agent/context_engine.py`（抽象基底クラス）、`agent/context_compressor.py`（既定のエンジン）、
`agent/prompt_caching.py`、`gateway/run.py`（セッションの衛生管理）、`run_agent.py`（`_compress_context` を検索）

## 差し替えできるコンテキストエンジン {#pluggable-context-engine}

コンテキストの管理は `ContextEngine` という抽象基底クラス（`agent/context_engine.py`）の上に成り立っています。組み込みの `ContextCompressor` が既定の実装ですが、プラグインで別のエンジンに置き換えられます（たとえば Lossless Context Management）。

```yaml
context:
  engine: "compressor"    # default — built-in lossy summarization
  engine: "lcm"           # example — plugin providing lossless context
```

エンジンが受け持つのは次の役割です。
- 圧縮をいつ実行するかの判断（`should_compress()`）
- 圧縮そのものの実行（`compress()`）
- 必要ならエージェントが呼べるツールの提供（たとえば `lcm_grep`）
- API のレスポンスから使用トークン数を記録すること

どれを使うかは `config.yaml` の `context.engine` で決まります。解決の順番は次のとおりです。
1. `plugins/context_engine/<name>/` ディレクトリを見る
2. 一般のプラグイン機構を見る（`register_context_engine()`）
3. 組み込みの `ContextCompressor` に戻る

プラグインのエンジンが**ひとりでに有効になることはありません**。利用者が `context.engine` にプラグインの名前を明示的に設定する必要があります。既定の `"compressor"` は常に組み込みのものを使います。

設定は `hermes plugins` → Provider Plugins → Context Engine から行うか、`config.yaml` を直接編集します。

コンテキストエンジンのプラグインを作る手順は [Context Engine Plugins](/hermes/docs/developer-guide/context-engine-plugin/) を参照してください。

## 2段構えの圧縮 {#dual-compression-system}

Hermes には、それぞれ独立して働く2つの圧縮層があります。

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

`gateway/run.py` にあります（`Session hygiene: auto-compress` で検索してください）。これは**最後の安全網**で、
エージェントがメッセージを処理する前に動きます。ターンとターンのあいだにセッションが
膨らみすぎたときの API エラーを防ぎます（たとえば Telegram や Discord で一晩のうちに溜まる場合）。

- **しきい値**: モデルのコンテキスト長の 85% で固定
- **トークンの数え方**: 直前のターンで API が実際に報告した値を優先し、なければ
  文字数からのおおまかな見積もり（`estimate_messages_tokens_rough`）に切り替える
- **動く条件**: `len(history) >= 4` かつ圧縮が有効なときだけ
- **目的**: エージェント側の圧縮をすり抜けたセッションを拾うこと

ゲートウェイ側のしきい値は、エージェント側の圧縮よりわざと高くしてあります。
エージェントと同じ 50% にしたところ、長いゲートウェイのセッションでは毎ターン
早すぎる圧縮が起きてしまいました。

### 2. エージェントの ContextCompressor（しきい値 50%・設定可能） {#2-agent-contextcompressor-50-threshold-configurable}

`agent/context_compressor.py` にあります。こちらが**本命の圧縮**で、
エージェントのツールループの内側で動き、API が報告した正確な
トークン数を使えます。

#### 失敗後のクールダウンと、プロバイダが証明した溢れ {#failure-cooldown-and-provider-proven-overflow}

要約の試みが失敗したり止まったりすると、そのセッションに**失敗クールダウン**が
入ります（60秒 → 300秒 → 900秒と延び、`state.db` に保存されます）。この状態のあいだは
しきい値による通常の圧縮を見送り、壊れた要約バックエンドが毎ターン動き直すのを防ぎます。
ただし次の2つの経路では、それでも実際に試みます。

- 手動の `/compress`（`force=True`）— クールダウンを解除して再試行します。
- **プロバイダが証明した溢れ** — プロバイダ自身がコンテキスト長のエラーで
  リクエストを拒否した場合、復旧処理はクールダウンを解除しないまま、回数を区切って
  1回だけ無視します（`max_compression_attempts`）。ここで見送るとセッションが行き詰まります。
  毎ターン、プロバイダに跳ね返されては次の失敗で待ち時間が延びていくからです（#100661）。
  その試みも失敗したら、クールダウンは通常どおり記録されます。

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

### 各パラメータの説明 {#parameter-details}

| パラメータ | 既定値 | 範囲 | 説明 |
|-----------|---------|-------|-------|
| `threshold` | `0.50` | 0.0-1.0 | プロンプトのトークン数が `threshold × context_length` 以上になると圧縮が動きます |
| `model_thresholds` | `{}` | マップ | モデルごとに `threshold` を上書きします。キーはモデル名との部分一致で照合し、いちばん長く一致したものが勝ちます。小さいコンテキストに対する下限はその上からさらに効きます（後述） |
| `target_ratio` | `0.20` | 0.10-0.80 | 末尾を守るためのトークン予算を決めます。`threshold_tokens × target_ratio` です（legacy モードのみ。`lean` は独自の上限を使います） |
| `tail_mode` | `lean` | `lean`, `legacy` | 末尾をどう残すかの方針です。`legacy` は `target_ratio` の大きさぶん、そのままの末尾を残します（大きなウィンドウのモデルでは10万トークンを超えます）。`lean` は `2.5% × context window`（下限1万、上限2万5千）に切り詰めた末尾だけを残し、代わりに要約側で話のつながりを保ちます。具体的には、識別子をそのまま残した詳しいセッションの記録（同じ1回の要約リクエストで作られます。lean の圧縮では1回の試みにつき補助 LLM の呼び出しはちょうど1回です）、機械的に抜き出したアンカーの索引（PR 番号、SHA、パス、エラー文字列。正規表現で拾い、言い換えは一切しません）、実際の利用者の発言をすべて原文のまま引用したもの（新しいものから予算の許すかぎり）、そして要約で消えた内容にエージェントが後から手を伸ばせるようにする `session_search` への案内です。大きすぎる範囲は追加の呼び出しを起こさず、間引きの印を明示したうえで均等に間引いて要約の入力に混ぜます。50万トークン規模の実際のセッションでの結果は、残る量が約16万2千に対して約4万9千で、復旧の仕組みと組み合わせると取りこぼしはむしろ減りました（`evals/compaction/results/` を参照）。lean の末尾に含まれる古いツールの実行結果は、復旧の案内を持つ1行の切り株に落とされます |
| `protect_last_n` | `20` | ≥1 | 直近のメッセージのうち、必ず残す最小の数 |
| `min_tail_user_messages` | `1` | ≥1 | 圧縮されない末尾に必ず生き残る、実質的な（対応の必要がある）利用者の発言の最小数です。`1` はこれまでどおり、最後の1件だけを軸にする挙動です。たとえば `3` に上げると、かさばるツールの出力が末尾の予算を埋めていても、直近3回の実際のやりとりが原文のまま残ります。中身のないプラットフォームの反響、圧縮の引き継ぎ、機械的に足された継続行は N に数えません。この保証は末尾のトークン予算より優先され、軸が切れ目を手前に引き戻したときは予算を超えることがあります |
| `protect_first_n` | `3` | （固定値） | システムプロンプトと最初のやりとりは必ず残ります |
| `idle_compact_after_seconds` | `0` | 0以上の秒数 | 任意で有効にします。この秒数だけ間が空いたあとにセッションを再開したとき、先に圧縮します（0 で無効）。コンテキストが threshold × target_ratio 以下なら飛ばし、クールダウン・連続実行の抑止・ロックの各条件は守ります |
| `codex_gpt55_autoraise` | `true` | 真偽値 | ChatGPT Codex の OAuth 経由で gpt-5.5 を使うとき、動き出す点を 85% に引き上げます（後述）。`false` にすると全体の `threshold` のままになります |
| `codex_gpt55_autoraise_notice` | `true` | 真偽値 | Codex の gpt-5.5 で引き上げたことを1度だけ知らせます。`false` にすると 85% への引き上げは残したまま、案内だけを止めます |
| `codex_app_server_auto` | `native` | `native`, `hermes`, `off` | Codex app-server のセッションでスレッドをどう圧縮するかを決めます（後述） |
| `codex_responses_native` | `false` | 真偽値 | Responses API のサーバー側圧縮を使うかどうかです。OpenAI の API を直接使う場合か ChatGPT Codex のサブスクリプションで、gpt-5.6 系のモデルのときだけ働きます（後述） |
| `codex_responses_compact_threshold` | `null` | `null` または正の整数 | `null` のときは、ローカルで決まった圧縮の起点から 8,192 トークンの余裕を引いた値に従います。正の整数を書くとその値が絶対の基準になり、必要なときだけ下方向へ丸められます。おかしな値を書いた場合は自動の挙動になります。使えるローカルの起点がないときは、自動の挙動が `200000` を使います |
| `in_place` | `true` | 真偽値 | 新しいセッション ID へ移らず、同じセッション ID のまま圧縮します（後述） |

### 同じセッション ID のまま圧縮する {#in-place-compaction-single-stable-session-id}

`compression.in_place: true`（既定）では、圧縮は**同じセッション ID のまま、生きているメッセージ列を書き換えます**。システムプロンプトを組み直し、要約された中間部分を差し込み、圧縮前のやりとりは同じ ID の下に静かに保管されます（セッションの保管場所では `active=0, compacted=1`）。これらは `session_search` で今も検索でき、取り戻すこともでき、消えることはありません。`parent_session_id` の連なりも `name #N` の付け直しもなく、ひとつの会話は生涯ひとつの ID を持ち続けます。これによって、セッションが入れ替わることに由来する不具合の一群（`/goal` の状態が消える、迷子のセッションができる、境目をまたいだ検索が抜ける）がなくなりました。

これを使う側は、セッション ID の差分を見るのではなく、どちらのモードかを見ます。

- `session:compress` イベントには `in_place: true/false` と `old_session_id` が入ります（同じ ID のまま圧縮する場合、古い ID は存在しないので空文字列です）。
- ゲートウェイは、ID が変わったかどうかではなく、エージェント側の `_last_compaction_in_place` フラグを見て会話記録の扱いを引き直します。

`in_place: false` にすると、圧縮のたびに新しいセッション ID を作り、`parent_session_id` で前のものとつなぐ従来の動きに戻ります。

### モデルごとにしきい値を変える {#per-model-threshold-overrides}

`compression.model_thresholds` を使うと、いま動いているモデルによって圧縮の
起きる位置を変えられます。コンテキストウィンドウの大きく異なるモデルを
行き来するときに便利です（100万トークンのモデルは遅らせてよく、
128K のモデルは早めに圧縮したい、というように）。

```yaml
compression:
  threshold: 0.50
  model_thresholds:
    "glm-5.2": 0.40
    "glm-5.2-1M": 0.25
    "claude-sonnet": 0.35
```

解決の規則は次のとおりです。

- キーはモデル名との**部分一致**で照合し、**いちばん長く一致したものが勝ちます**
  （モデル `glm-5.2-1M` に対しては `glm-5.2-1M` が `glm-5.2` に勝ちます）。
- どのキーも一致しないとき（またはマップが空のとき）は、全体の `threshold` が使われます。
- `/model` で切り替えるたびに引き直されます。一致するキーのないモデルへ
  切り替えると、全体の `threshold` に戻ります。
- **小さいコンテキストに対する下限は、上書きの上からさらに効きます**（上げる方向にのみ）。
  コンテキストウィンドウが 512K 未満のモデルは `0.75` を下限とするので、
  それより低い上書きは `0.75` へ引き上げられ、それより高い上書き
  （たとえば `0.80`）はそのまま通ります。

プラグインのコンテキストエンジンも、
`from agent.context_compressor import resolve_model_threshold` で同じ解決の処理を使えます。
`update_model()` を独自に実装するエンジンは自前の圧縮方針を持つので、
このマップを無視してもかまいません。

### Codex の gpt-5.5 でしきい値が自動で上がる {#codex-gpt-55-threshold-autoraise}

ChatGPT Codex の OAuth 経由のバックエンドは、gpt-5.5 のコンテキストウィンドウを
**272K** に固定しています（同じ名前でも、OpenAI の直接 API と OpenRouter では 1.05M、
GitHub Copilot では 400K です）。既定の 50% では約 136K で圧縮が動くことになり、
モデルが実際に使えるウィンドウの半分で切ってしまいます。そこで、経路が Codex の
OAuth（`provider: openai-codex`）でモデルが gpt-5.5 のとき、Hermes は動き出す点を
**85%**（約 231K）へ引き上げ、やめ方のコマンドを添えて知らせます。この案内は
プロファイルごとに1度だけ出ます。`$HERMES_HOME` の下の印
（`.codex_gpt55_autoraise_notice`）が実行済みであることを記録するので、
エージェントやセッションの初期化が繰り返されても（たとえばゲートウェイに届く
メッセージのたびに）出し直しません。引き上げ後のしきい値があとで変われば、また1度だけ知らせます。
影響を受けるのはこの経路だけで、他のプロバイダの gpt-5.5 は全体の `threshold` のままです。
元の値に戻すには次のようにします。

```bash
hermes config set compression.codex_gpt55_autoraise false
```

85% への引き上げは残し、1度だけの案内を出さないようにするには次のようにします。

```bash
hermes config set compression.codex_gpt55_autoraise_notice false
```

### Codex の大きなコンテキスト向け `-900k` 版（任意） {#codex-large-context--900k-picker-variants-opt-in}

ChatGPT Codex のバックエンドは、gpt-5.4 と gpt-5.6（Sol / Terra / Luna）の系統について
272K のウィンドウを*名乗って*いますが、ChatGPT のサブスクリプション契約では実際には
約 911K の入力トークンを受け付けます（2026年8月に実機で確認）。Hermes は元の名前に対して
**名乗りどおりの 272K を既定のまま**にしています。ウィンドウが大きいほど1回の
リクエストで送るトークンが増え、サブスクリプションの利用枠の減りがずっと速くなるためで、
大きなウィンドウはあくまで任意で選ぶものです。

大きなウィンドウを使うには、`/model` で `-900k` の付いた版をはっきり選びます（たとえば
`gpt-5.6-sol-900k`、`gpt-5.6-terra-900k`、`gpt-5.6-luna-900k`、
`gpt-5.4-900k`）。これらは Hermes 側の別名で、モデル ID をバックエンドへ送る前に
接尾辞は取り除かれ、料金と利用量の計算では元のモデルとして扱われます。本当に 272K で
止まる名前（gpt-5.5、gpt-5.4-mini）には `-900k` の版がありません。

圧縮のしきい値はウィンドウに合わせます。元の名前（272K）は上で説明した
**85% への自動引き上げ**が効き、`-900k` の版は全体の
`compression.threshold`（既定 50%、約 450K）のままです。自動引き上げは狭いウィンドウを
無駄にしないための仕組みで、900K のウィンドウには要らないからです。

### Codex app-server でのスレッド圧縮 {#codex-app-server-thread-compaction}

Codex app-server のセッション（`api_mode: codex_app_server`。codex の CLI とエージェントの
実行環境です）は、他のどの経路とも違います。裏にあるスレッドのコンテキストを持っているのは
codex のエージェント側なので、Hermes の補助的な要約では縮められません。手元にある会話の
写しを書き換えても、本物のスレッドは強制的なコンテキストの初期化まで際限なく伸び続けます。
この実行環境では、圧縮を app-server 自身の仕組みに任せます。

- 手動の圧縮（`/compress`）は、app-server にスレッドの圧縮を依頼し
  （`thread/compact/start`）、その圧縮のターンが終わるまで待ちます。
- 自動の圧縮は `compression.codex_app_server_auto` で決めます。既定の
  `native` は、いつ圧縮するかを app-server に任せ、Hermes はその結果として
  起きた圧縮の出来事を記録します（圧縮の回数、セッションの出来事）。`hermes` に
  すると Hermes のしきい値が app-server の圧縮を起こし、`off` にすると
  Hermes 発の自動圧縮を完全に止めます（codex 側が自分で圧縮することはあります）。

この実行環境では、Hermes 側の会話の写しが書き換えられることはありません。state.db に
圧縮の境目が記録され、目に見える会話はそのまま残ります。それ以外のすべての経路
（Codex の OAuth によるチャットのセッションを含む）では、Hermes の要約による圧縮が働きます。

### Responses API 側での圧縮（OpenAI 直接 / Codex サブスクリプションの gpt-5.6） {#native-responses-compaction-gpt-56-on-direct-openai-codex-subscription}

OpenAI の Responses API はサーバー側での圧縮に対応しています。リクエストに
`context_management: [{type: "compaction", compact_threshold: N}]` が含まれ、組み立てられた
入力が N トークンを超えると、サーバーは古いコンテキストを刈り取り、中身の見えない
暗号化された `compaction` という出力項目にまとめます。Hermes はその項目を、アシスタントの
メッセージがすでに持っている再生用の付属データへ取り込み、次のターン以降に送り返して
刈り取られた履歴の代わりにします。クライアント側で要約せずに長い流れを覚えていられて、
ZDR とも相性がよい方法です（`store: false`、`previous_response_id` なし）。

使うには `compression.codex_responses_native: true` にします。適用の条件はわざと狭くしてあり、
リクエストのたびに確かめ直されます。

- **モデル**: gpt-5.6 系だけです。他のモデルでこの項目が付いているとサーバー側で失敗します
  （gpt-5.1 と gpt-5.2 は HTTP 500 を返すか、応答の流れが止まります。段階的に切り下げるための
  構造化された拒否が返ってこないためです。2026年8月に実機で確認）。
- **経路**: `api.openai.com`（OpenAI の API キー）か、ChatGPT Codex のバックエンド
  （Codex サブスクリプションの OAuth）だけです。xAI、GitHub / Copilot、OpenRouter、中継、
  ローカルのサーバーへは、この項目が送られることはありません。

圧縮のそれ以外の部分は変わりません。手元の圧縮は受け皿として構えたままで
（サーバー側が先に動くよう、サーバー側のしきい値は手元の起点より約 8K トークン低く
抑えられます）、この項目が構造化された形で拒否されたら、そのセッションではサーバー側の
圧縮をやめて、項目を外してリクエストをやり直します。条件に合わないモデルや経路へ
切り替えた場合は、単にこの項目が送られなくなります。取り込んだ途中経過は、送り先が
変わった時点で、発行元をまたがせないための既存の仕組みによって再生から外れます。

既定の `compression.codex_responses_compact_threshold: null` では、サーバー側の
しきい値を、手元で決まった起点から導きます。たとえば手元の起点が 765,000 なら 756,808 が
選ばれます。200,000 のような絶対値で固定したいときは正の整数を書きます。おかしな値を
書いた場合は自動の挙動になります。使える手元の起点がなければ、自動の挙動は 200,000 を
使います。プロバイダ側の最小値は 1,024 トークンなので、手元の起点がそれ以下という
極端に小さい場合には、サーバー側を必ず先に動かすという順序を守れません。

### 実際の数値（コンテキスト 200K のモデルを既定値で使う場合） {#computed-values-for-a-200k-context-model-at-defaults}

```
context_length       = 200,000
threshold_tokens     = 200,000 × 0.50 = 100,000
tail_token_budget    = 100,000 × 0.20 = 20,000
max_summary_tokens   = min(200,000 × 0.05, 12,000) = 10,000
```

:::note しきい値は主モデルのコンテキストウィンドウから決まります
`threshold_tokens` は常に `threshold × context_length` で、この `context_length` は
**主となるエージェントのモデル**のコンテキストウィンドウです。補助（要約）のモデルの
ものではありません。262,144 トークンのモデルを既定の `0.50` で使うと、しきい値は
`262,144 × 0.50 = 131,072` になります。この数字がよくある「128K のコンテキスト」に
近いのは割合から出た偶然であって、補助モデルのウィンドウが引き金になっている印では
ありません。補助モデルのコンテキストウィンドウは別の話です。要約を作れるかどうかに
どう影響するかは、後述の「要約モデルのコンテキスト長」の注意書きを参照してください。
圧縮がいつ動くかとは関係ありません。
:::

## 圧縮の手順 {#compression-algorithm}

`ContextCompressor.compress()` は4つの段階で進みます。

### 段階1: 古いツールの結果を刈り取る（安価・LLM を呼ばない） {#phase-1-prune-old-tool-results-cheap-no-llm-call}

守られた末尾の外にある古いツールの結果（200文字を超えるもの）は、次の文言に置き換えられます。
```
[Old tool output cleared to save context space]
```

これは安価な下準備で、長くなりがちなツールの出力（ファイルの中身、端末の出力、
検索結果）から大きなトークンを削れます。

### 段階2: 区切りを決める {#phase-2-determine-boundaries}

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

末尾を守るかどうかは**トークンの予算**で決まります。末尾から前へ向かって
トークンを積み上げ、予算が尽きたところで止めます。予算で守れるメッセージの数が
固定値より少なくなる場合は、`protect_last_n` の数に切り替えます。

区切りは、tool_call と tool_result の組を分断しないように調整されます。
`_align_boundary_backward()` は連続するツールの結果をさかのぼって親のアシスタントの
メッセージを探し、組をひとまとまりのまま保ちます。

### 段階3: 構造化された要約を作る {#phase-3-generate-structured-summary}

:::warning 要約モデルのコンテキスト長
要約に使うモデルのコンテキストウィンドウは、主となるエージェントのモデルと**同じかそれ以上**でなければいけません。中間部分は丸ごと、1回の `call_llm(task="compression")` で要約モデルへ送られます。要約モデルのコンテキストのほうが小さいと、API はコンテキスト長のエラーを返します。`_generate_summary()` はそれを捕まえて警告を記録し、`None` を返します。すると圧縮は中間のやりとりを**要約なしで**捨てるので、会話の文脈が静かに失われます。圧縮の質が落ちる原因として、これがいちばんよくあるものです。
:::

中間のやりとりは、補助の LLM を使って次の型に沿って要約されます。

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

要約に使える量は、圧縮する内容の量に応じて増減します。
- 計算式: `content_tokens × 0.20`（定数 `_SUMMARY_RATIO`）
- 下限: 2,000 トークン
- 上限: `min(context_length × 0.05, 12,000)` トークン

### 段階4: 圧縮後のメッセージを組み立てる {#phase-4-assemble-compressed-messages}

圧縮後のメッセージ列は次のようになります。
1. 先頭のメッセージ（初回の圧縮のときは、システムプロンプトに注記が足されます）
2. 要約のメッセージ（同じ役割が連続してしまわないよう、役割を選びます）
3. 末尾のメッセージ（手を加えません）

宙に浮いた tool_call と tool_result の組は `_sanitize_tool_pairs()` が始末します。
- 消えた呼び出しを指しているツールの結果 → 取り除く
- 結果が取り除かれたツールの呼び出し → 代わりの結果を差し込む

### 2回目以降の圧縮 {#iterative-re-compression}

2回目以降の圧縮では、前回の要約を LLM に渡し、一から作り直すのではなく
**更新する**よう指示します。こうすることで、何度圧縮しても情報が残ります。
項目は「In Progress」から「Done」へ移り、新しい進み具合が足され、古くなった
情報は取り除かれます。

そのために、圧縮の処理が持つ `_previous_summary` という項目に前回の要約の
文面を保存しています。

## 圧縮の前後の例 {#beforeafter-example}

### 圧縮の前（45メッセージ・約95Kトークン） {#before-compression-45-messages-95k-tokens}

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

### 圧縮の後（25メッセージ・約45Kトークン） {#after-compression-25-messages-45k-tokens}

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

対象のソース: `agent/prompt_caching.py`

会話の前半をキャッシュすることで、何往復もするやりとりの入力トークンの費用を
およそ75%減らします。Anthropic の `cache_control` の区切りを使います。

### 方式: system_and_3 {#strategy-systemand3}

Anthropic は1回のリクエストにつき `cache_control` の区切りを最大4つまで認めています。Hermes は
「system_and_3」という方式を採っています。

```
Breakpoint 1: System prompt           (stable across all turns)
Breakpoint 2: 3rd-to-last non-system message  ─┐
Breakpoint 3: 2nd-to-last non-system message   ├─ Rolling window
Breakpoint 4: Last non-system message          ─┘
```

### 仕組み {#how-it-works}

`apply_anthropic_cache_control()` はメッセージを丸ごと複製したうえで、
`cache_control` の印を差し込みます。

```python
# Cache marker format
marker = {"type": "ephemeral"}
# Or for 1-hour TTL:
marker = {"type": "ephemeral", "ttl": "1h"}
```

印の付け方は、中身の形によって変わります。

| 中身の形 | 印を付ける場所 |
|-------------|-------------------|
| 文字列 | `[{"type": "text", "text": ..., "cache_control": ...}]` に変換します |
| リスト | 最後の要素の辞書に足します |
| なし・空 | `msg["cache_control"]` として足します |
| ツールのメッセージ | `msg["cache_control"]` として足します（Anthropic の API を直接使う場合のみ） |

### キャッシュを意識した設計の勘どころ {#cache-aware-design-patterns}

1. **システムプロンプトを動かさない**: システムプロンプトは1つ目の区切りで、
   すべてのターンでキャッシュされます。会話の途中で書き換えないでください
   （圧縮が注記を足すのは初回の1度だけです）。

2. **メッセージの並び順が効いてきます**: キャッシュが当たるには、前方が一致している
   必要があります。途中でメッセージを足したり消したりすると、そこから後ろの
   キャッシュがすべて無効になります。

3. **圧縮とキャッシュの関係**: 圧縮のあと、圧縮された範囲のキャッシュは
   無効になりますが、システムプロンプトのキャッシュは生き残ります。移動していく
   3メッセージの窓のおかげで、1〜2ターンでキャッシュが効き直します。

4. **有効期間の選び方**: 既定は `5m`（5分）です。ターンとターンのあいだに間の空く
   長丁場のセッションでは `1h` を使います。

5. **どのモデルかもキャッシュの鍵の一部です**: プロバイダ側のキャッシュは、リクエストを
   処理するモデル（そしてアカウントや API キー）ごとに分かれています。会話の途中で
   モデルが変わること — `/model` による明示的な切り替え、主モデルからの切り戻し、
   認証情報のプールが別のアカウントへ回ること — はどれも、次のリクエストで
   キャッシュがまったく当たらず、会話の全体を割引なしの入力価格で読み直すことを
   意味します。これはプロバイダ側のキャッシュの仕組みそのものに由来するもので、
   Hermes の側で避けられるものではありません。`/model`、切り戻し先のプロバイダ、
   認証情報のプールについての利用者向けの説明に費用の注意書きがあるのはこのためです。
   セッションの途中で黙ってモデルや認証情報を差し替えるような機能を足さないでください。

### プロンプトキャッシュを有効にする {#enabling-prompt-caching}

プロンプトキャッシュは、次の条件がそろうと自動的に有効になります。
- モデルが Anthropic の Claude 系である（モデル名から判定します）
- プロバイダが `cache_control` に対応している（Anthropic の API を直接使う場合か OpenRouter）

```yaml
# config.yaml — TTL is configurable (must be "5m" or "1h")
prompt_caching:
  cache_ttl: "5m"
```

CLI は起動時にキャッシュの状態を表示します。
```
💾 Prompt caching: ENABLED (Claude via OpenRouter, 5m TTL)
```

## コンテキストが詰まってきたときの警告 {#context-pressure-warnings}

途中段階での「コンテキストが詰まってきた」という警告は廃止されました（`run_agent.py` の反復回数の予算に関する部分に、途中の警告は複雑な作業でモデルを早々に「あきらめ」させてしまった、と書かれています）。圧縮は、プロンプトのトークン数が設定した `compression.threshold`（既定 50%）に達したところで、事前の警告なしに動きます。ゲートウェイのセッション衛生管理は、モデルのコンテキストウィンドウの 85% で二の矢として動きます。
