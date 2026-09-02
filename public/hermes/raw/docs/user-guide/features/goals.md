---
title: "続いていく目的"
description: "立てた目的を預けておくと、Hermes が終わるまでターンをまたいで働き続けます。Ralph ループに対する私たちなりの答えです。"
upstream_path: user-guide/features/goals.md
upstream_blob: d187dd9befcd9a6c654853c77b9fccc8782c71f0
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/goals
---

# 続いていく目的（`/goal`） {#persistent-goals-goal}

`/goal` は、ターンをまたいで生き続ける目的を Hermes に預けます。ターンが終わるたびに、軽い判定役のモデルが、アシスタントの最後の返事でその目的が満たされたかを見ます。まだなら、Hermes は同じセッションに続きを促すプロンプトを自分で流し込み、仕事を進めます — 目的が達成されるか、こちらが一時停止するか消すか、ターンの予算が尽きるまで。

これは **Ralph ループ**に対する私たちなりの答えで、Eric Traut（OpenAI）による [Codex CLI 0.128.0 の `/goal`](https://github.com/openai/codex) から直接の影響を受けています。ターンをまたいで目的を生かし続け、達成するまで止まらない、という核の発想は向こうのものです。ここでの実装は独立に書かれ、Hermes の作りに合わせてあります。

## どんなときに使うか {#when-to-use-it}

`/goal` は、毎ターンこちらが促さなくても Hermes に自力で繰り返してほしい仕事に使います。

- 「`src/` の lint のエラーを全部直して、`ruff check` が通ることを確かめて」
- 「リポジトリ Y から機能 X をテストごと移植して、CI を緑にして」
- 「実行の途中で圧縮が起きるとセッション ID がときどきずれるのはなぜか調べて、報告書にまとめて」
- 「EXIF の日付でファイル名を付け替える小さな CLI を作って、photos/ フォルダで試して」

エージェントが1ターンで終える仕事に `/goal` は要りません。*こちらが「続けて」と3回言う羽目になるような*仕事でこそ、これは光ります。

## 目的とかんばん、どちらが欲しいか {#goals-vs-kanban-which-one-do-i-want}

`/goal` と[かんばん](/hermes/docs/user-guide/features/kanban/)は、どちらもこちらが促さなくても Hermes を働かせ続けるので、一方が他方に流れ込むと思いたくなります。そうはなっていません。境目ははっきりしています。

- **`/goal` は1つのセッションの中で完結します。** ループは判定役が終わりと言うまで、*この*会話に続きを促すプロンプトを流し込みます。目的を立ててもかんばんのカードは作られず、別のプロファイルに仕事が割り当てられることも、枝分かれすることもありません。板への引き渡しは、明示的にも暗黙にも起きません。
- **かんばんはたくさんの仕事を並べた板です。** カードはそれぞれ専用のワーカーのプロセスに、それぞれのセッションで送られます。カード、依存関係、担当、引き渡しは板の上のもので、`/goal` の中のものではありません。
- **重なっている部分は意図的で、そして小さいものです。** `--goal` を付けて作ったかんばんのカードは、`/goal` と同じ Ralph 風の継続の仕組みで動きます — ただし*そのカードのワーカーのセッションの中で*です。仕組みだけを借りていて、板は借りていません。[目的モードのカード](/hermes/docs/user-guide/features/kanban/#goal-mode-cards---goal)を見てください。

| やりたいこと | 使うもの |
|---|---|
| このチャットで1つの仕事を、終わるまで繰り返させたい | `/goal <text>` |
| 独立した仕事がたくさんあり、依存関係や引き渡し、複数のプロファイルが絡む | [かんばん](/hermes/docs/user-guide/features/kanban/) — `hermes kanban create …` |
| 板の上の1枚のカードを、受け入れの条件を満たすまで繰り返させたい | `--goal` を付けたかんばんのカード |

:::note
仕事を板に載せたいなら、自分で載せてください（`hermes kanban create …`）。`/goal` が代わりにやってくれることはありません。逆も同じで、このチャットで目的を一時停止したり、再開したり、消したりしても、かんばんのカードが作られたり、取られたり、動いたりすることはありません。
:::

## さっそく使う {#quick-start}

```
/goal Fix every failing test in tests/hermes_cli/ and make sure scripts/run_tests.sh passes for that directory
```

こう見えます。

1. **目的が受け付けられる** — `⊙ Goal set (20-turn budget): <your goal>`
2. **1ターン目が動く** — 目的を普通のメッセージとして送ったときと同じように、Hermes が働き始めます。
3. **判定役が動く** — ターンのあと、判定役のモデルが `done`、`continue`、`blocked` のどれかを決めます。
4. **必要ならループが発火する** — `continue` なら `↻ Continuing toward goal (1/20): <judge's reason>` と表示され、Hermes が自分で次の一歩を進めます。
5. **終わる** — やがて `✓ Goal achieved: <reason>` か `⏸ Goal paused — N/20 turns used` のどちらかが表示されます。

## コマンド {#commands}

| コマンド | 何をするか |
|---|---|
| `/goal <text>` | 預ける目的を立てます（すでにあれば置き換えます）。最初のターンをすぐ始めるので、別途メッセージを送る必要はありません。 |
| `/goal draft <text>` | 普通の言葉で書いた目的から、形の整った完了の約束ごとを起草し、そのうえで立てます。[完了の約束ごと](#completion-contracts)を見てください。 |
| `/goal show` | 動いている目的の完了の約束ごとを表示します。 |
| `/goal` または `/goal status` | 今の目的、その状態、使ったターン数を表示します。 |
| `/goal pause` | 目的は残したまま、自動で続ける動きを止めます。 |
| `/goal resume` | ループを再開します（ターンの数え直しは0に戻ります）。 |
| `/goal clear` | 目的をまるごと捨てます。 |
| `/goal wait <pid> [reason]` | 裏で動いているプロセスの前でループを停めます。そのプロセスが動いているあいだは毎ターンのつつき直しをやめ、終わったら自動で再開します。 |
| `/goal unwait` | 待ちの関所を外し、すぐにループを再開します。 |
| `/goal gate add <command>` | **品質の関所**を足します。目的が終わったと判定される前に必ず通らなければならないシェルのコマンドです。[品質の関所](#quality-gates)を見てください。 |
| `/goal gate` または `/goal gate list` | 目的に付いている関所と、その通過・不通過の状態を並べます。 |
| `/goal gate remove <N>` | N 番目の関所を外します（1から数えます）。 |
| `/goal gate clear` | 関所をすべて外します。 |

CLI でも、すべてのゲートウェイ（Telegram、Discord、Slack、Matrix、Signal、WhatsApp、SMS、iMessage、Webhook、API サーバー、そしてウェブのダッシュボード）でも、同じように動きます。

## 完了の約束ごと {#completion-contracts}

素の `/goal <text>` でも十分に動きますが、*あいまいな*目的はあいまいな判定を生みます。判定役は、こちらが望むと伝えたことしか見られません。Codex の `/goal` の手引きも同じことを言っています。長く生きる目的がいちばんうまく働くのは、**終わりとは何か、それをどう証明するか、何を壊してはいけないか、どこまでが範囲か、いつ止まるか**を書いたときです。Hermes はこれを、今ある目的のループの上に重ねる、任意の**完了の約束ごと**として取り入れています。

約束ごとには5つの項目があり、すべて任意です。

| 項目 | 意味 |
|---|---|
| `outcome` | 終わったときに成り立っていなければならない、ただ1つの最終状態。 |
| `verification` | その最終状態を*証明する*、具体的なテスト／コマンド／成果物。 |
| `constraints` | 変えてはいけない、後退させてはいけないもの。 |
| `boundaries` | どのファイル、ディレクトリ、道具、仕組みが範囲に入るか。 |
| `stop_when` | Hermes が止まってこちらの入力を仰ぐべき条件。 |

約束ごとが立っていると、2つのプロンプトが変わります。**続きを促すプロンプト**はエージェントに、証明の的を狙い、制約を守るよう伝えます。そして**判定役のプロンプト**は、*証明の条件が具体的な証拠（コマンドの結果、ファイルの抜粋、テストの出力）とともに満たされたときにだけ* `done` と決めます。「終わったように見える」という緩い言い分では決めません。これは `/goal` のいちばんよくある失敗（詰めの甘い目的での早すぎる完了、あるいは終わりのない続けすぎ）を、まっすぐ締め上げます。

### 約束ごとを立てる2つのやり方 {#two-ways-to-set-a-contract}

**1. Hermes に起草させる**（おすすめ。Codex の「目的はエージェントに起草させよ」という助言を取り入れたものです）。

```
/goal draft Migrate the auth service from session cookies to JWT
```

Hermes は `goal_judge` という補助のモデルを使って、こちらの1行を丸ごとの約束ごとに広げ、それを立て、結果を見せます。こちらはどの項目でも見直したり締め直したりできます。補助のモデルが使えないときは、素の自由な文章の目的に落ちます。起草につまずいて目的が立てられなくなることはありません。

**2. その場で書く。** `field: value` の行を並べます。

```
/goal Migrate auth to JWT
verify: pytest tests/auth passes
constraints: keep the /login response shape unchanged
boundaries: only touch services/auth and its tests
stop when: a DB schema migration is required
```

項目ではない最初の行が目的の見出しになり、決まった項目の頭書き（`verify:`、`verified by:`、`constraints:`、`preserve:`、`boundaries:`、`scope:`、`stop when:`、`blocked:`、…）が約束ごとを埋めます。たまたまコロンが入っているだけの素の目的（`Fix bug: the parser drops commas`）が**壊れることはありません**。取り出されるのは、知っている項目の頭書きだけです。

動いている約束ごとを見直すには `/goal show` を使います。約束ごとは目的と並んで `SessionDB.state_meta` に残るので、`/resume` を越えて生き残ります。この機能より前に立てた古い目的も、そのまま読み込まれます（約束ごとは付きません）。約束ごとと `/subgoal` の条件は組み合わせられます。下位の目的は、判定役が同じく満たさなければならない追加の条件として、約束ごとに畳み込まれます。

## 目的の途中で条件を足す: `/subgoal` {#adding-criteria-mid-goal-subgoal}

目的が動いているあいだ、ループを立て直すことなく `/subgoal <text>` で受け入れの条件を足せます。呼ぶたびに、目的の下位目的の一覧に番号付きの項目が1つ増えます。次のターンでエージェントが見る**続きを促すプロンプト**には、元の目的に加えて「ユーザーがループの途中で足した追加の条件」の塊が入り、**判定役のプロンプト**も、裁定がすべての下位目的を踏まえるように書き換わります。元の目的**と**すべての下位目的が満たされるまで、目的は終わったことになりません。

| コマンド | 何をするか |
|---|---|
| `/subgoal <text>` | 動いている目的に新しい条件を足します。動いている `/goal` が必要です。 |
| `/subgoal`（引数なし） | 今の番号付きの下位目的の一覧を表示します。 |
| `/subgoal remove <N>` | N 番目の下位目的を外します（1から数えます）。 |
| `/subgoal clear` | 下位目的をすべて捨て、元の目的はそのまま残します。 |

下位目的は目的と並んで `SessionDB.state_meta` に残るので、`/resume` を越えて生き残ります。新しく `/goal <text>` を立てると目的が置き換わり、下位目的の一覧は消えます。`/goal clear` も同じです。

これが効くのは、ループを始めたあと（「落ちているテストを直して」）、途中で「ついでに、いま直したバグの再発を捕まえるテストも足して」と思ったときです。`/subgoal add a regression test` と打てば、走っているループを壊さずに成功の条件を締められます。

## 品質の関所 {#quality-gates}

完了の約束ごとは判定役を厳しくしますが、判定役はやはり文章を読む LLM です。**品質の関所**はもっと強く、目的が完了できるようになる前に必ず終了コード0で通らなければならない、決定的なシェルのコマンドです。Prime-Agent の枠を決めた自律モード（`--autonomous-gate`）に着想を得ています。

```
/goal Fix the flaky session tests
/goal gate add scripts/run_tests.sh tests/hermes_cli/test_goals.py
```

毎ターン、こう動きます。

1. **関所は判定役より先に動きます。** どれか1つでも落ちれば、判定役は*呼ばれません*。赤い関所は、目的が終わっていないことの決定的な証拠だからです。関所の終了コードと出力の末尾（最後の 3 KB ほど）がそのまま続きを促すプロンプトになるので、エージェントは雰囲気ではなく実際の失敗を相手に繰り返します。
2. **関所が全部通ったら、いつもの判定へ。** そのあと LLM の判定役が、これまでどおり done／blocked／continue／wait を決めます。
3. **作業場が変わっていなければ、走らせ直しません。** 関所が落ちたあと、作業場に何も変化がなければ（HEAD と作業ツリーの状態から取る git の指紋で追っています）、関所は走らせ直されません。記録してある失敗をそのまま再生し、試行の数だけ進みます。行き詰まったエージェントが、同じ赤いテスト一式を回し直して時計を燃やすことはできません。git のリポジトリの外では、関所は単に毎回走ります。
4. **やり直しには上限があります。** 関所ごとに既定で3回のやり直しと5分の制限時間があります。やり直しを使い切ると、目的は（ターンの予算のときと同じように）自動で一時停止し、手で直すか、関所を外すか、`/goal resume` するように伝えるメッセージが出ます。

関所は目的と並んで `SessionDB.state_meta` に残り（`/resume` と文脈の圧縮を越えて生き残ります）、関所の管理（`/goal gate …`）はゲートウェイで実行中に触っても安全です。関所が動くのはターンの切れ目だけだからです。

関所と約束ごとは組み合わせられます。約束ごとで*エージェントが何を狙うか*を形づくり、関所で*「終わり」を機械的に確かめられる*ようにしてください。両方が立っているときは、関所が先に動きます。

## 裏で動くプロセスの前で停まる: 自動、ただし手で上書きもできる {#parking-on-a-background-process-automatic-with-a-manual-override}

目的の中には、数分かかって勝手に進む何か — 押した PR の CI、長いビルド、テストの組み合わせ、デプロイ、レート制限の冷却時間 — に縛られているものがあります。何もしなければ、目的のループは待っているあいだ毎ターン「もう終わった？」という空回りにエージェントをつつき込むことになります。

**これは自動で処理されます。** 毎ターン、判定役には、目的とエージェントの返事に並べて、エージェントが裏で動かしているプロセス（`terminal(background=true)` の登録簿 — pid、セッション ID、コマンド、稼働時間、最近の出力、そして `watch_patterns` や `notify_on_complete` の引き金）が見せられます。エージェントの進みが本当にそのどれかに縛られているとき、判定役は `continue` ではなく **`wait`** の裁定を返し、ループは**停まります**。待ちが満たされるまで、次のターンは飛ばされます（判定役の呼び出しなし、続きの促しなし、ターンの消費なし）。満たされたら、結果を手にしたまま普通に再開します。判定役は**時間**を基準に停まることもできます（`wait_for_seconds`。後退や冷却の待ちに使います）。停まっているあいだ、`/goal status` は `⏳ Goal (parked …)` と表示します。

判定役は、プロセス自身が出す合図から、どの種類の待ちが正しいかを選びます。

- **`wait_on_session <id>`** — プロセス*自身の引き金*が発火したときに解けます。プロセスが終わるか、**あるいは**（`watch_patterns` 付きで始めていれば）その模様に当たったときです。これは、長く生き続ける見張り／サーバー／巡回のように**途中で**合図を出し（たとえば `BUILD SUCCESSFUL` と表示してそのまま動き続けるビルドのプロセスや、`notify_on_complete` の見張り）、自分からは終わらないかもしれないものに使います。
- **`wait_on_pid <pid>`** — プロセスが終わったときにだけ解けます。
- **`wait_for_seconds <n>`** — 決まった時間が過ぎたら解けます。

このために何かを打つ必要はありません。ループが渡したプロセスの文脈から、判定役が決めることです。手で打つコマンドは、その上書きとしてあります。

| コマンド | 何をするか |
|---|---|
| `/goal wait <pid> [reason]` | その PID のプロセスが終わるまで、手でループを停めます。 |
| `/goal unwait` | 待ちの関所を（判定役が立てたものでも手で立てたものでも）外し、すぐに再開します。 |

関所（pid でも時間でも）は目的と並んで `SessionDB.state_meta` に残るので、`/resume` を越えて生き残ります。`/goal pause`、`/goal resume`、`/goal clear` はどれもこれを外します。関所を立てた時点で PID がすでに死んでいた場合（あるいは停まっているあいだに死んだ場合）や、時間の期限が過ぎた場合は、次の確認で関所が外れます。古びた関所がループを固めてしまうことはありません。

よくある流れはこうです。エージェントが PR を押し、`terminal(background=true, notify_on_complete=true)` で CI の見張りを始め、「CI を見ています」と報告します。判定役は見張りのプロセスがまだ動いているのを見て、その pid で `wait` を返し、ループは静かになります。そして CI が終わった瞬間に動き出し、実際の結果を相手に目的を判定します。

## ふるまいの細かいところ {#behavior-details}

### 判定役 {#the-judge}

ターンが終わるたびに、Hermes は補助のモデルを次のもので呼び出します。

- 預けてある目的の文章
- エージェントの最後の返事（末尾 4 KB ほどの文章）
- 判定役に、1行の厳密な JSON で答えるよう伝えるシステムプロンプト: `{"verdict": "done" | "blocked" | "continue" | "wait", "reason": "<one-sentence rationale>"}`（wait の裁定には `wait_on_session` / `wait_on_pid` / `wait_for_seconds` が足されます。昔からの `{"done": <bool>, "reason": "..."}` の形もまだ受け付けます）

判定役はわざと慎重に作ってあります。目的を `done` と印を付けるのは、返事が目的の完了を**はっきりと**認めていて、最後の成果物がはっきり出ているときだけです。エージェントが**達成できない**（無理、範囲の外、こちらの入力が要る）と説明した目的には、代わりに `blocked` の裁定が出ます。決して `done` にはなりません。目的は判定役の理由を添えて**一時停止**し（`🚫 Goal judged unachievable — paused`）、予算を燃やしたり、無理な仕事が完了として素通りしたりする代わりに、`/goal <text>` で範囲を引き直したり、`/goal resume` で上書きしたりできます。

### fail-open のふるまい {#fail-open-semantics}

判定役がエラーになったとき（回線の乱れ、形の崩れた返事、補助のクライアントが使えない）、Hermes はその裁定を `continue` として扱います。壊れた判定役が前進を固めてしまうことはありません。本当の歯止めは**ターンの予算**です。

### ターンの予算 {#turn-budget}

既定では続きのターンは20回です（`config.yaml` の `goals.max_turns`）。予算に達すると、Hermes は自動で一時停止し、次にどうすればいいかをそのまま伝えます。

```
⏸ Goal paused — 20/20 turns used. Use /goal resume to keep going, or /goal clear to stop.
```

`/goal resume` は数え直しを0に戻すので、区切りのよい塊で進め続けられます。

### こちらのメッセージが常に割り込む {#user-messages-always-preempt}

目的が動いているあいだにこちらが送った本物のメッセージは、続きのループより優先されます。CLI ではメッセージが待ち行列の続きより前の `_pending_input` に入り、ゲートウェイでもアダプタの先入れ先出しを同じように通ります。判定役はこちらのターンのあとにまた動くので、こちらのメッセージがたまたま目的を完了させたなら、判定役がそれを捕まえて止めます。

### 実行中の安全（ゲートウェイ） {#mid-run-safety-gateway}

エージェントがすでに動いているあいだでも、`/goal status`、`/goal pause`、`/goal clear`、`/goal wait`、`/goal unwait` は安全に実行できます。これらは制御側の状態に触れるだけで、今のターンを邪魔しません。実行中に**新しい**目的を立てること（`/goal <new text>`）は、先に `/stop` するよう伝えるメッセージとともに断られます。古い続きが新しいものと競り合わないためです。

### 残ること {#persistence}

目的の状態は `SessionDB.state_meta` に `goal:<session_id>` の鍵で置かれます。つまり `/resume` は、やめたところをそのまま拾い上げます。目的を立て、ノートパソコンを閉じ、明日戻ってきて `/resume` すれば、目的は置いていったとおりに（動いているか、一時停止しているか、終わっているか）そこに立っています。

### プロンプトのキャッシュ {#prompt-cache}

続きを促すプロンプトは、履歴に足される普通のユーザー役のメッセージです。システムプロンプトを書き換えたり、道具立てを差し替えたり、Hermes のプロンプトのキャッシュを無効にするような形で会話に触れたりは**しません**。20 ターンの目的を走らせても、キャッシュの上では普通の会話の 20 ターンと同じ費用です。

## 設定 {#configuration}

`~/.hermes/config.yaml` に足してください。

```yaml
goals:
  # Max continuation turns before Hermes auto-pauses and asks you to
  # /goal resume. Default 20. Lower this if you want tighter loops;
  # raise it for long-running refactors.
  max_turns: 20
```

### 判定役のモデルを選ぶ {#choosing-the-judge-model}

判定役は `goal_judge` という補助のタスクを使います。既定では主のモデルに解決されます（[補助のモデル](/hermes/docs/user-guide/configuration/#auxiliary-models)を見てください）。費用を抑えるために判定役を安くて速いモデルに回したいなら、上書きを足してください。

```yaml
auxiliary:
  goal_judge:
    provider: openrouter
    model: google/gemini-3-flash-preview
```

判定役の呼び出しは小さく（出力は 200 トークンほど）、1ターンに1回だけ動くので、たいていは安くて速いモデルが正解です。

## ひととおり見てみる {#example-walkthrough}

```
You: /goal Create four files /tmp/note_{1..4}.txt, one per turn, each containing its number as text

  ⊙ Goal set (20-turn budget): Create four files /tmp/note_{1..4}.txt, one per turn, each containing its number as text

Hermes: Creating /tmp/note_1.txt now.
  💻 echo "1" > /tmp/note_1.txt   (0.1s)
  I've created /tmp/note_1.txt with the content "1". I'll continue with the remaining files on the next turn as you specified.

  ↻ Continuing toward goal (1/20): Only 1 of 4 files has been created; 3 files remain.

Hermes: [Continuing toward your standing goal]
  💻 echo "2" > /tmp/note_2.txt   (0.1s)
  Created /tmp/note_2.txt. Two more to go.

  ↻ Continuing toward goal (2/20): 2 of 4 files created; 2 remain.

Hermes: [Continuing toward your standing goal]
  💻 echo "3" > /tmp/note_3.txt   (0.1s)
  Created /tmp/note_3.txt.

  ↻ Continuing toward goal (3/20): 3 of 4 files created; 1 remains.

Hermes: [Continuing toward your standing goal]
  💻 echo "4" > /tmp/note_4.txt   (0.1s)
  All four files have been created: /tmp/note_1.txt through /tmp/note_4.txt, each containing its number.

  ✓ Goal achieved: All four files were created with the specified content, completing the goal.

You: _
```

4ターン、`/goal` は1回、こちらからの「続けて」はゼロです。

## 判定役が外したとき {#when-the-judge-gets-it-wrong}

完璧な判定役はいません。気をつけたい外し方が2つあります。

**見落とし — 目的はもう終わっているのに、判定役が続けろと言う。** これはターンの予算が捕まえます。`⏸ Goal paused` と表示されるので、`/goal clear` するか、新しいメッセージを送るだけで済みます。

**早とちり — まだ仕事が残っているのに、判定役が終わったと言う。** `✓ Goal achieved` と表示されますが、こちらにはそうでないと分かっています。続きのメッセージを送るか、目的をもっと正確に立て直してください（`/goal <more specific text>`）。判定役のシステムプロンプトは、早とちりが見落としより少なくなるよう、わざと慎重にしてあります。

判定役の裁定に納得がいかないときは、`↻ Continuing toward goal` や `✓ Goal achieved` の行にある理由の文章が、判定役に何が見えていたかをそのまま教えてくれます。たいていはそれで、あいまいだったのは目的の文章のほうか、モデルの返事のほうかを見分けられます。

## 出どころ {#attribution}

`/goal` は **Ralph ループ**という型に対する Hermes なりの答えです。ターンをまたいで目的を生かし続け、達成するまで止まらず、作る／一時停止する／再開する／消すの操作を備える、という表向きの設計は、OpenAI の Codex チームの Eric Traut が [Codex CLI 0.128.0](https://github.com/openai/codex) で広め、世に出したものです。私たちの実装は独立に書かれていますが（中央の `CommandDef` の登録簿、`SessionDB.state_meta` での保存、補助のクライアントによる判定役、ゲートウェイ側でのアダプタの先入れ先出しによる継続）、発想は向こうのものです。功績はあるべきところへ。
