---
title: "同梱のプラグイン"
description: "Hermes Agent に最初から入っていて、節目ごとのフックで自動的に動くプラグイン群 — disk-cleanup とその仲間たち"
upstream_path: user-guide/features/built-in-plugins.md
upstream_blob: ac18d4c925358a704e606ba1e8502f93c7de75fd
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/built-in-plugins
---

# 同梱のプラグイン {#built-in-plugins}

Hermes には、リポジトリと一緒に配られる小さなプラグインの一式が入っています。置き場所は `<repo>/plugins/<name>/` で、`~/.hermes/plugins/` に自分で入れたプラグインと並んで自動的に読み込まれます。フック、ツール、スラッシュコマンドという仕組みは他社製のプラグインとまったく同じで、違いは Hermes 本体の中で手入れされている点だけです。

プラグインの仕組み全体は [プラグイン](/hermes/docs/user-guide/features/plugins/) のページを、自分で書きたいときは [Hermes プラグインを作る](/hermes/docs/developer-guide/plugins/) を見てください。

## 見つけ方の仕組み {#how-discovery-works}

`PluginManager` は次の4か所を、この順番で調べます。

1. **同梱** — `<repo>/plugins/<name>/`（このページで説明しているもの）
2. **利用者** — `~/.hermes/plugins/<name>/`
3. **プロジェクト** — `./.hermes/plugins/<name>/`（`HERMES_ENABLE_PROJECT_PLUGINS=1` が必要）
4. **pip のエントリーポイント** — `hermes_agent.plugins`

名前がぶつかったときは後から見つかったほうが勝ちます。つまり `disk-cleanup` という名前の利用者プラグインを置けば、同梱のものが差し替わります。

`plugins/memory/` と `plugins/context_engine/` は、同梱の探索対象からわざと外してあります。記憶の提供元と文脈エンジンは1つだけ選ぶ形の仕組みで、設定の `hermes memory setup` や `context.engine` から選ぶため、これらのディレクトリは別の経路で見つけられます。

## 同梱プラグインは自分で有効にする {#bundled-plugins-are-opt-in}

同梱プラグインは無効の状態で配られます。探索では見つかるので `hermes plugins list` や対話的な `hermes plugins` の画面には出てきますが、自分ではっきり有効にするまでは1つも読み込まれません。

```bash
hermes plugins enable disk-cleanup
```

`~/.hermes/config.yaml` から指定することもできます。

```yaml
plugins:
  enabled:
    - disk-cleanup
```

これは自分で入れたプラグインとまったく同じ仕組みです。同梱プラグインが勝手に有効になることはありません。新しく入れたときも、すでに使っている環境を新しい Hermes に上げたときもです。いつでも自分の意思で有効にします。

同梱プラグインをまた止めたいときはこうします。

```bash
hermes plugins disable disk-cleanup
# or: remove it from plugins.enabled in config.yaml
```

## 現在同梱されているもの {#currently-shipped}

リポジトリの `plugins/` には次の同梱プラグインが入っています。どれも自分で有効にする形なので、`hermes plugins enable <name>` で使えるようにしてください。

| プラグイン | 種類 | できること |
|---|---|---|
| `disk-cleanup` | フック＋スラッシュコマンド | その場限りのファイルを自動で覚えておき、セッションの終わりに片づける |
| `security-guidance` | フック | `write_file`／`patch` の中身から危ないコードの型を見つけ、警告を書き添える（あるいは書き込みを止める） — 全25ルール（Anthropic の `claude-plugins-official` にある型を Apache-2.0 のまま取り込んだもの） |
| `observability/langfuse` | フック | ターン・LLM 呼び出し・ツールの動きを [Langfuse](https://langfuse.com) に記録する |
| `teams_pipeline` | 単体 | Microsoft Teams の会議向けの一連の処理 — Graph を使い、書き起こしを起点に会議をまとめる |
| `spotify` | バックエンド（ツール7個） | Spotify の再生・再生待ち・検索・プレイリスト・アルバム・ライブラリをそのまま扱う |
| `google_meet` | 単体 | Meet の通話に参加し、字幕をその場で書き起こし、必要なら音声で双方向にやり取りする |
| `image_gen/openai` | 画像バックエンド | OpenAI の `gpt-image-2` による画像生成のバックエンド（FAL の代わり） |
| `image_gen/openai-codex` | 画像バックエンド | Codex の OAuth を通した OpenAI の画像生成 |
| `image_gen/xai` | 画像バックエンド | xAI の `grok-2-image` バックエンド |
| `hermes-achievements` | ダッシュボードのタブ | 実際の Hermes のセッション履歴から作られる、Steam 風の収集バッジ |
| `kanban/dashboard` | ダッシュボードのタブ | 複数エージェントの振り分け役のためのカンバン画面 — タスク、コメント、並列展開、ボードの切り替え。[カンバンで複数エージェント](/hermes/docs/user-guide/features/kanban/) を見てください。 |

記憶の提供元（`plugins/memory/*`）と文脈エンジン（`plugins/context_engine/*`）は [記憶の提供元](/hermes/docs/user-guide/features/memory-providers/) に別立てで載せてあります。前者は `hermes memory`、後者は `hermes plugins` から扱います。ここから先は、長く動き続けるフック型の2つについて、プラグインごとに詳しく見ていきます。

### disk-cleanup {#disk-cleanup}

セッション中にできたその場限りのファイル — 試し書きのスクリプト、一時的な出力、定期実行のログ、古くなった chrome のプロファイル — を自動で覚えておき、消してくれます。エージェントが「片づけのツールを呼ぶ」ことを覚えておかなくても済みます。

**動き方:**

| フック | ふるまい |
|---|---|
| `post_tool_call` | `write_file`／`terminal`／`patch` が `HERMES_HOME` か `/tmp/hermes-*` の中に `test_*`、`tmp_*`、`*.test.*` に当てはまるファイルを作ったとき、それを `test`／`temp`／`cron-output` として黙って覚えておきます。 |
| `on_session_end` | そのターンで試し書きのファイルを自動で覚えた場合だけ、安全な `quick` の片づけを走らせ、結果を1行だけ記録します。それ以外は何も言いません。 |

**消す条件:**

| 区分 | 目安 | 確認 |
|---|---|---|
| `test` | セッションが終わるたび | しない |
| `temp` | 覚えてから7日を超えたもの | しない |
| `cron-output` | 覚えてから14日を超えたもの | しない |
| HERMES_HOME の下の空のディレクトリ | 常に | しない |
| `research` | 30日を超え、新しいほうから10件を外れたもの | 必ずする（deep のときだけ） |
| `chrome-profile` | 覚えてから14日を超えたもの | 必ずする（deep のときだけ） |
| 500 MB を超えるファイル | 自動では消さない | 必ずする（deep のときだけ） |

**スラッシュコマンド** — `/disk-cleanup` は CLI とゲートウェイのどちらのセッションでも使えます。

```
/disk-cleanup status                     # breakdown + top-10 largest
/disk-cleanup dry-run                    # preview without deleting
/disk-cleanup quick                      # run safe cleanup now
/disk-cleanup deep                       # quick + list items needing confirmation
/disk-cleanup track <path> <category>    # manual tracking
/disk-cleanup forget <path>              # stop tracking (does not delete)
```

**状態** — すべて `$HERMES_HOME/disk-cleanup/` の下にあります。

| ファイル | 中身 |
|---|---|
| `tracked.json` | 覚えているパスと、その区分・大きさ・時刻 |
| `tracked.json.bak` | 上のファイルを安全に書き換えるための控え |
| `cleanup.log` | 記録・見送り・却下・削除のすべてを追記していく監査の記録 |

**安全のために** — 片づけが手をつけるのは `HERMES_HOME` か `/tmp/hermes-*` の下だけです。Windows のマウント先（`/mnt/c/...`）は受け付けません。よく知られた最上位の状態ディレクトリ（`logs/`、`memories/`、`sessions/`、`cron/`、`cache/`、`skills/`、`plugins/`、そして `disk-cleanup/` 自身）は、たとえ空でも消しません。入れたばかりの環境が最初のセッションの終わりに中身をさらわれることはありません。

**有効にする:** `hermes plugins enable disk-cleanup`（`hermes plugins` の画面でチェックを入れても構いません）。

**また止める:** `hermes plugins disable disk-cleanup`。

### security-guidance {#security-guidance}

ファイルの書き込みに対して、型の照合で素早くセキュリティの注意を出します。エージェントの `write_file`／`patch`／`skill_manage` が運ぶ中身に、危ないと分かっているコードの型 — `pickle.load`、`SafeLoader` なしの `yaml.load`、`eval(`、`os.system`、`subprocess(...,  shell=True)`、JavaScript の `child_process.exec`、React の `dangerouslySetInnerHTML`、生の `.innerHTML =`／`.outerHTML =`／`document.write`、Node の `crypto.createCipher`、AES の ECB モード、TLS の検証を切っているもの、XXE を招きやすい `xml.etree`／`minidom` の解析器、SRI のない `<script src="//..." >`、`weights_only=True` のない `torch.load`、GitHub Actions の `${{ github.event.* }}` の差し込み — が含まれていると、ツールの結果に `⚠️ Security guidance` の一節を書き足します。

ファイル自体は書き込まれます。モデルは次のターンでツールのメッセージとしてその警告を読み、コードを直すか、その書き方がこの場面では安全である理由を書き残すかを選べます。型の照合はどうしても見当違いの警告が出ることがあり、だからこそ既定は「止める」ではなく「知らせる」になっています。

**守備範囲:** 全25ルール。安全でない復元、コマンドの差し込み、XSS の出口、暗号の落とし穴、XXE、供給網（SRI）、CI/CD のワークフローへの差し込みをまかないます。型のデータは [Anthropic の `claude-plugins-official`](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/security-guidance/hooks) を Apache-2.0 のまま丸ごと取り込んだもので、出どころの表示はプラグインの `LICENSE` と `NOTICE` を見てください。

**動き方の切り替え:**

| 環境変数 | はたらき |
|---|---|
| （設定しない） | **知らせる（既定）** — ファイルは書き込まれ、結果に警告が付く |
| `SECURITY_GUIDANCE_BLOCK=1` | **止める** — 書き込みを断り、警告をその理由として返す |
| `SECURITY_GUIDANCE_DISABLE=1` | 切るためのスイッチ — 読み込まれはするが何もしない |

**有効にする:** `hermes plugins enable security-guidance`（`hermes plugins` の画面でチェックを入れても構いません）。

**また止める:** `hermes plugins disable security-guidance`。

**まだできないこと:** 元になった Anthropic のプラグインには、さらに2つの層があります。ファイルに触れたエージェントのターンごとに差分を LLM が見直す層と、コミットの時点でファイルをまたいでデータの流れを追う層です。どちらもまだ移していません。エージェント自身は `delegate_task` を使って、必要なときにその見直しを走らせられます。

### observability/langfuse {#observabilitylangfuse}

Hermes のターン、LLM の呼び出し、ツールの実行を [Langfuse](https://langfuse.com) に記録します。Langfuse は LLM の様子を見るためのオープンソースの基盤です。1ターンにつき1つの区間、API 呼び出しごとに1つの生成、ツール呼び出しごとに1つの観測が残ります。使用量の合計、種類ごとのトークン数、費用の見積もりは Hermes 本来の `agent.usage_pricing` の数字をそのまま使うので、Langfuse の画面には `hermes logs` と同じ内訳（入力／出力／`cache_read_input_tokens`／`cache_creation_input_tokens`／`reasoning_tokens`）が出ます。

このプラグインは、うまくいかないときは黙って通す作りです。SDK が入っていない、資格情報がない、Langfuse が一時的に不調 — どの場合もフックの中で何もせずに終わります。エージェントの動きが妨げられることはありません。

**設定（対話的に進める。こちらがおすすめです）:**

```bash
hermes tools          # → Langfuse Observability → Cloud or Self-Hosted
```

案内役が鍵を聞き取り、`langfuse` の SDK を `pip install` し、`plugins.enabled` に `observability/langfuse` を書き加えてくれます。Hermes を立ち上げ直せば、次のターンから記録が送られます。

**設定（自分で進める）:**

```bash
pip install langfuse
hermes plugins enable observability/langfuse
```

続いて `~/.hermes/.env` に資格情報を書きます。

```bash
HERMES_LANGFUSE_PUBLIC_KEY=pk-lf-...
HERMES_LANGFUSE_SECRET_KEY=sk-lf-...
HERMES_LANGFUSE_BASE_URL=https://cloud.langfuse.com   # or your self-hosted URL
```

**動き方:**

| フック | ふるまい |
|---|---|
| `pre_api_request`／`pre_llm_call` | ターンごとの親となる区間「Hermes turn」を開きます（すでにあればそれを使います）。この API 呼び出しのために `generation` の子となる観測を始め、直近のやり取りを文字にしたものを入力として渡します。 |
| `post_api_request`／`post_llm_call` | 生成を閉じ、`usage_details`、`cost_details`、`finish_reason`、応答の出力とツール呼び出しを添えます。ツール呼び出しがなく中身が空でなければ、そのターンも閉じます。 |
| `pre_tool_call` | 中身を整えた `args` を添えて、`tool` の子となる観測を始めます。 |
| `post_tool_call` | 中身を整えた `result` を添えてツールの観測を閉じます。`read_file` の中身は要約されます（先頭と末尾、それに省いた行数）。大きなファイルを読んでも `HERMES_LANGFUSE_MAX_CHARS` に収まるようにするためです。 |

セッションのまとめ方は、`langfuse.propagate_attributes` を通して Hermes のセッション ID（下請けのエージェントならタスク ID）に合わせてあります。おかげで `hermes chat` の1回のセッションで起きたことは、Langfuse でも1つのセッションの下に集まります。

**確かめる:**

```bash
hermes plugins list                 # observability/langfuse should show "enabled"
hermes chat -q "hello"              # check the Langfuse UI for a "Hermes turn" trace
```

**細かい調整（`.env` に書きます）:**

| 変数 | 既定値 | はたらき |
|---|---|---|
| `HERMES_LANGFUSE_ENV` | — | 記録に付ける環境の目印（`production`、`staging` など） |
| `HERMES_LANGFUSE_RELEASE` | — | 版の目印 |
| `HERMES_LANGFUSE_SAMPLE_RATE` | `1.0` | SDK に渡す抽出の割合（0.0〜1.0） |
| `HERMES_LANGFUSE_MAX_CHARS` | `12000` | やり取りの中身・ツールの引数・ツールの結果を項目ごとに切り詰める長さ |
| `HERMES_LANGFUSE_DEBUG` | `false` | プラグインの詳しい記録を `agent.log` に出す |

Hermes を頭に付けた名前と、SDK が本来使う名前（`LANGFUSE_PUBLIC_KEY`、`LANGFUSE_SECRET_KEY`、`LANGFUSE_BASE_URL`）のどちらも使えます。両方あるときは Hermes を頭に付けたほうが優先されます。

**速さについて:** Langfuse の接続先は最初のフック呼び出しのあと使い回されます。資格情報や SDK がないと分かった場合も、その判断が覚えられます。以降のフックは環境変数を調べ直したり設定を読み直したりせず、すぐに戻ります。

**止める:** `hermes plugins disable observability/langfuse`。プラグイン自体は見つかったままですが、また有効にするまで中のコードは1行も動きません。

### NeMo Relay の本体組み込み（移行にあたって） {#nemo-relay-native-integration-migration-note}

NeMo Relay は、もう Hermes に同梱されるプラグインではありません。`hermes plugins enable observability/nemo_relay` は実行しないでください。Relay のセッション、ターン、LLM、ツールの流れは Hermes 本体が受け持つようになりました。

Relay の中間処理や書き出しを使いたいときは、Relay の標準的な `plugins.toml` を作り、Hermes を立ち上げる前に `HERMES_NEMO_RELAY_PLUGINS_TOML` でそのファイルを指してください。この決まりは、その Hermes のプロセスが抱えるすべてのプロファイルに一括で効きます。ATOF、ATIF、OpenTelemetry の選び方は [NeMo Relay observability configuration](https://docs.nvidia.com/nemo/relay/configure-plugins/observability/about) を見てください。

以前の `HERMES_NEMO_RELAY_ATOF_*` と `HERMES_NEMO_RELAY_ATIF_*` の設定では、もう書き出しは始まりません。代わりの `plugins.toml` が選ばれていない場合、`hermes doctor` がこの古い設定を知らせます。

#### セッションの区間を区切る（ずっと続くセッション向け） {#session-span-segmentation-continuous-sessions}

Relay は、区間の範囲が閉じたときにそれを書き出します。ゲートウェイのセッションはずっと続くことがあり、ターンごとの区間は普通に書き出されても、セッションの区間だけが何日も開いたままになりがちです。区切りの設定を使うと、ターンの切れ目でセッションの範囲だけを入れ替えられます。

```yaml
gateway:
  telemetry:
    session_segments:
      on_compaction: false  # rotate after context compaction
      max_turns: 0          # 0 = unlimited; N = turns per segment
```

| 設定名 | 既定値 | ふるまい |
|---|---:|---|
| `on_compaction` | `false` | 文脈の圧縮が終わったあと、次のターンの切れ目で入れ替えます。 |
| `max_turns` | `0` | ターンが N 回終わるたびに入れ替えます。`0` なら上限なしです。 |

どちらの既定値でも、セッションの範囲はまるごと1つのままです。入れ替わった区間は同じ `session_id` を保ったまま、`hermes.session.segment` と `hermes.session.segment_reason`（`compaction` か `max_turns`）が加わります。

### google_meet {#googlemeet}

エージェントが **Google Meet の通話に参加し、書き起こし、話に加わる** ためのものです。会議の内容を書き留め、終わったあとにやり取りをまとめ、気になった点を追いかけ、さらに望むなら TTS で通話に声を返すこともできます。

**加わるもの:**

- ブラウザの自動操作で Meet の URL に入る、画面を持たない仮想の参加者
- 設定された音声認識の提供元による、会議の音声のその場での書き起こし
- 通話に入り、書き起こしを随時取り出し、聞いた内容をもとに動くための `meet_join`／`meet_status`／`meet_transcript`／`meet_leave`／`meet_say` の道具立て
- 会議のあとに残る成果物（書き起こし、状態）。`~/.hermes/workspace/meetings/<meeting_id>/` に保存されます

**設定:**

```bash
hermes plugins enable google_meet
hermes meet setup   # preflight: playwright, chromium, auth file
hermes meet auth    # opens a browser to sign into Google and saves session state —
                    # needs a Google account with Meet access. Host approval may be
                    # required if the meeting enforces "only invited participants can join".
```

チャットからはこう頼みます。

> 「meet.google.com/abc-defg-hij に入って内容を書き留めておいて。終わったら、やることの一覧を付けてまとめを送って。」

エージェントは会議への参加を始め、通話が進むあいだ書き起こしを自分の文脈へ取り込み続け、会議が終わったとき（あるいは止めるように言われたとき）に整ったまとめを作ります。

**どんなときに使うか:** 参加できなかった人のために、定例の進捗確認を書き起こしてまとめておきたいとき。聞き取り調査のように、整った記録がほしいとき。そのほか Fireflies や Otter、Grain を使うことになりそうな場面です。AI に聞かれたくない場では、有効にしないでください。

**止める:** `hermes plugins disable google_meet`。保存された書き起こしは、自分で消すまで `~/.hermes/workspace/meetings/` に残ります。

### hermes-achievements {#hermes-achievements}

**Steam 風の実績タブをダッシュボードに足します**。実際の Hermes のセッション履歴から作られる、段位付きの収集バッジが60種類以上あります。ツールの連携技、デバッグの型、勢いに乗ったコーディングの連続記録、スキルや記憶の使い方、モデルや提供元の幅広さ、生活のくせ（週末や夜のセッション）まで。もとは [@PCinkusz](https://github.com/PCinkusz) さんが外部のプラグインとして作ったもので、Hermes の機能の変化と足並みをそろえるために本体へ取り込まれました。

**動き方:**

- ダッシュボードの裏側で `~/.hermes/state.db` のセッション履歴をすべて調べます
- セッションごとの集計は `(started_at, last_active)` の指紋で覚えておくので、次に調べるときは新しいものと変わったものだけを見直します
- 初めての集計は裏の処理として走ります。セッションが何千件ある場合でも、ダッシュボードがそれを待って止まることはありません
- 解放した記録は `$HERMES_HOME/plugins/hermes-achievements/state.json` に残ります

**段位の進み方:** Copper → Silver → Gold → Diamond → Olympian。それぞれのカードには「What counts」という欄があり、何を数えているのかがそのまま書いてあります。

**実績の状態:**

| 状態 | 意味 |
|---|---|
| Unlocked | 少なくとも1段は達成した |
| Discovered | 存在が分かっていて進み具合も見えるが、まだ達成していない |
| Secret | 履歴の中に手がかりを Hermes が初めて見つけるまで隠れている |

**API** — 経路は `/api/plugins/hermes-achievements/` の下にあります。

| エンドポイント | はたらき |
|---|---|
| `GET /achievements` | バッジごとの解放状態を添えた一覧（最初の集計が走っている間は、待機中を示す仮の応答を返します） |
| `GET /scan-status` | 裏で走る集計の状態: `idle`／`running`／`failed`、前回の所要時間、実行回数 |
| `GET /recent-unlocks` | 直近で解放したバッジ20件を、新しい順に |
| `GET /sessions/{id}/badges` | 主にその1回のセッションで得たバッジ |
| `POST /rescan` | 手動でその場で調べ直す（終わるまで待ちます。再集計のボタンが押されたときに使います） |
| `POST /reset-state` | 解放の記録と覚えておいた集計結果を消す |

**状態のファイル** — `$HERMES_HOME/plugins/hermes-achievements/` の下にあります。

| ファイル | 中身 |
|---|---|
| `state.json` | 解放の記録: どのバッジをいつ得たか。Hermes を新しくしても引き継がれます。 |
| `scan_snapshot.json` | 最後まで終わった集計の中身（ダッシュボードを開いた瞬間に出せます） |
| `scan_checkpoint.json` | 指紋を鍵にしたセッションごとの集計の控え（2回目以降の調べ直しが速くなります） |

**速さについて:**

- 8,000 件ほどのセッションを初めて調べると数分かかります。ダッシュボードへの最初の要求で裏の処理として走り、画面は待機中の表示を出しながら `/scan-status` を見に行きます。
- **初回の集計中も途中経過が出ます** — 250 件ほど進むごとに途中までの結果が公開されるので、画面を更新するたびに解放済みのバッジが増えていきます。何分もゼロを眺めることはありません。
- 2回目以降は、`started_at` と `last_active` の指紋が控えと一致するセッションの集計を使い回すので、履歴が大きくても数秒で終わります。
- 手元に持っている結果の有効期間は120秒です。過ぎていても古い結果をすぐ返し、裏で新しくします。期限が切れたというだけで待たされることはありません。

**有効にする:** 何もしません。`hermes-achievements` はダッシュボードだけのプラグインで、節目のフックもモデルから見えるツールも持ちません。`hermes dashboard` を最初に立ち上げたときに、自分でタブとして登録します。`plugins.enabled` の設定が効くのは節目やツールを持つプラグインだけで、ダッシュボードのプラグインは `dashboard/manifest.json` だけを頼りに見つけられます。

**使わないようにする:** `plugins/hermes-achievements/dashboard/manifest.json` を消すか名前を変えるか、`~/.hermes/plugins/hermes-achievements/` に同じ名前でダッシュボードを持たない利用者プラグインを置いて上書きしてください。`$HERMES_HOME/plugins/hermes-achievements/` の状態のファイルは残るので、入れ直せば解放の記録もそのままです。

## 同梱プラグインを足すには {#adding-a-bundled-plugin}

同梱プラグインの書き方は、ほかの Hermes プラグインとまったく同じです — [Hermes プラグインを作る](/hermes/docs/developer-guide/plugins/) を見てください。違うのは次の点だけです。

- 置き場所が `~/.hermes/plugins/<name>/` ではなく `<repo>/plugins/<name>/` になる
- `hermes plugins list` では、出どころが `bundled` と表示される
- 同じ名前の利用者プラグインがあれば、そちらが同梱のものより優先される

同梱にふさわしいのは、こんなプラグインです。

- 追加の依存がない（あっても `pip install .[all]` にすでに含まれている）
- そのふるまいが多くの人の役に立ち、止めたい人だけが止める形になっている
- エージェントがいちいち呼ぶことを覚えておかないといけない処理を、節目のフックに任せられる
- モデルから見えるツールを増やさずに、本体の機能を補える

反対に、同梱にせず自分で入れてもらうべきものもあります。API キーが要る他社サービスとの連携、限られた場面でしか使わない流れ、依存が大きく膨らむもの、そして既定のままでエージェントのふるまいを大きく変えてしまうものです。
