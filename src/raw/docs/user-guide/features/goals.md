---
title: "続く目標（Goal）"
description: "目標をひとつ立てておくと、Hermes が終わるまで応答をまたいで作業を続けます。Ralph ループの Hermes 版です。"
upstream_path: user-guide/features/goals.md
upstream_blob: cefadfff0bfa8f200fff932d56ca8f29a73153b6
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/goals
---

# 続く目標（`/goal`） {#persistent-goals-goal}

`/goal` は、応答をまたいで残り続ける目標を Hermes に持たせます。応答が終わるたびに、軽い判定用のモデルが「いまの返答で目標は満たされたか」を見ます。満たされていなければ、Hermes が同じセッションへ続きを促す指示を自分で送り、作業を続けます。目標が達成されるか、あなたが一時停止・取り消しをするか、応答の回数の上限に達するまで続きます。

これは **Ralph ループ**の Hermes 版で、Eric Traut 氏（OpenAI）による [Codex CLI 0.128.0 の `/goal`](https://github.com/openai/codex) をそのまま着想元にしています。「目標を応答をまたいで生かし、達成するまで止まらない」という中心の考えは向こうのものです。ここでの実装は独立に書いたもので、Hermes の作りに合わせてあります。

## どんなときに使うか {#when-to-use-it}

毎回こちらが指示を出し直さなくても、Hermes に自分で繰り返してほしい作業に `/goal` を使います。

- 「`src/` の lint エラーをすべて直して、`ruff check` が通ることを確かめて」
- 「リポジトリ Y から機能 X を移植して、テストも含めて CI を通して」
- 「実行の途中で圧縮が入るとセッション ID がずれることがある理由を調べて、報告にまとめて」
- 「EXIF の日付でファイル名を付け直す小さな CLI を作って、photos/ フォルダで試して」

1 回の応答で終わる作業に `/goal` は要りません。*そうでなければ「続けて」と 3 回言うことになる*ような作業でこそ効いてきます。

## goal とかんばんのどちらを使うか {#goals-vs-kanban-which-one-do-i-want}

`/goal` も [かんばん](/hermes/docs/user-guide/features/kanban/) も、こちらが指示を出し直さなくても Hermes が作業を続けます。そのため一方がもう一方につながっていそうに見えますが、そうではありません。境目ははっきりしています。

- **`/goal` はひとつのセッションの中だけ。** 判定が「終わった」と言うまで、*この*会話へ続きの指示を送り続けます。目標を立ててもかんばんのカードはできませんし、別のプロファイルへ作業が割り当てられることも、作業が枝分かれすることもありません。盤への受け渡しは、暗黙にも明示にも起きません。
- **かんばんは、たくさんの作業を並べた盤です。** カードはそれぞれ自分の作業プロセスと自分のセッションへ渡されます。カード、依存関係、担当、受け渡しは盤の側にあり、`/goal` の側にはありません。
- **重なっている部分は、意図してこれだけに絞ってあります。** `--goal` を付けて作ったかんばんのカードは、`/goal` と同じ Ralph 式の続行の仕組みで動きますが、動くのは*そのカードの作業セッションの中*です。借りているのは仕組みだけで、盤ではありません。[目標モードのカード](/hermes/docs/user-guide/features/kanban/#goal-mode-cards---goal)をご覧ください。

| したいこと | 使うもの |
|---|---|
| この会話の中で、ひとつの作業が終わるまで繰り返させたい | `/goal <text>` |
| 独立した作業がたくさんあり、依存関係や受け渡し、複数のプロファイルが要る | [かんばん](/hermes/docs/user-guide/features/kanban/) — `hermes kanban create …` |
| 盤の上の 1 枚のカードを、受け入れ条件が満たされるまで繰り返させたい | `--goal` を付けたかんばんのカード |

:::note
作業を盤に載せたいなら、自分で載せてください（`hermes kanban create …`）。`/goal` は代わりにやってくれません。逆も同じで、この会話で目標を一時停止・再開・取り消ししても、かんばんのカードができたり、取られたり、動いたりすることはありません。
:::

## 使い始める {#quick-start}

```
/goal Fix every failing test in tests/hermes_cli/ and make sure scripts/run_tests.sh passes for that directory
```

こう表示されます。

1. **目標を受け付けた** — `⊙ Goal set (20-turn budget): <your goal>`
2. **1 回目の応答が走る** — 目標をふつうのメッセージとして送ったときと同じように、Hermes が作業を始めます。
3. **判定が走る** — 応答のあと、判定用のモデルが `done`、`continue`、`blocked` のどれかを決めます。
4. **必要なら繰り返す** — `continue` なら `↻ Continuing toward goal (1/20): <judge's reason>` と表示され、Hermes が自分で次の手を打ちます。
5. **終わる** — 最後は `✓ Goal achieved: <reason>` か `⏸ Goal paused — N/20 turns used` のどちらかが出ます。

## コマンド {#commands}

| コマンド | 何をするか |
|---|---|
| `/goal <text>` | 目標を設定（または置き換え）します。1 回目の応答がすぐ始まるので、別途メッセージを送る必要はありません。 |
| `/goal draft <text>` | ふつうの言葉で書いた目的から、形の整った完了の取り決めを起こして設定します。[完了の取り決め](#completion-contracts)をご覧ください。 |
| `/goal show` | いま有効な目標の完了の取り決めを表示します。 |
| `/goal` または `/goal status` | いまの目標、その状態、使った応答の回数を表示します。 |
| `/goal pause` | 目標は残したまま、自動で続ける動きを止めます。 |
| `/goal resume` | 続ける動きを再開します（回数の数え直しが入り、ゼロに戻ります）。 |
| `/goal clear` | 目標をすべて取り消します。 |
| `/goal wait <pid> [reason]` | 裏で動いているプロセスの前で待たせます。そのプロセスが動いているあいだは毎回の催促をやめ、終わったら自動で再開します。 |
| `/goal unwait` | 待ちを外して、すぐに再開します。 |
| `/goal gate add <command>` | **品質の関門**を足します。目標が完了と判定される前に必ず通らなければならないシェルのコマンドです。[品質の関門](#quality-gates)をご覧ください。 |
| `/goal gate` または `/goal gate list` | 関門の一覧と、それぞれの合否を表示します。 |
| `/goal gate remove <N>` | N 番目（1 から数えます）の関門を外します。 |
| `/goal gate clear` | すべての関門を外します。 |

従来の CLI、TUI、デスクトップアプリ、ダッシュボードのチャット、メッセージ連携は、どれも同じ `/goal` の処理を共有しています。下書きと表示、その場で書く取り決め、待ちと待ちの解除、品質の関門、clear / stop / done の言い換えも同じです。デスクトップアプリの目標の操作も、同じ処理を使います。ACP は今のところ `/goal` を出しても実装してもいません。

`/goal draft <text>` は、目標を作るのと 1 回目の応答を始めるのを両方やります。下書きが使えず、Hermes がふつうの自由な形の目標に切り替えたときも同じです。`draft` は語として丸ごと一致したときだけ効きます。`/goal drafting docs` と書けば、`drafting docs` がそのまま目的の文になり、下書き用のモデルは呼ばれません。

メッセージ連携の側の権限の決まりはそのままです。`/goal gate add` を使えるのは、連携の管理者として明示的に設定された人だけです。関門の一覧、削除、全消しは、立て直しのためにいつでも使えます。画面への出し方や応答の回し方は入口ごとに違いますが、コマンドの読み取りと、保存される目標の変更は共通です。

## 完了の取り決め {#completion-contracts}

`/goal <text>` とだけ書いても動きますが、*あいまいな*目標はあいまいな判定になります。判定は、こちらが望むと伝えたことしか見られないからです。Codex の `/goal` の説明も同じことを言っています。長く続く目的は、**終わったとはどういうことか、それをどう証明するか、何を壊してはいけないか、どこまでが対象か、どこで止まるか**を書いたときにいちばんよく働きます。Hermes ではこれを、いまの目標の仕組みの上に載せる**完了の取り決め**として、使いたい人が使える形にしています。

取り決めには 5 つの項目があり、どれも省けます。

| 項目 | 意味 |
|---|---|
| `outcome` | 終わったときに成り立っていなければならない、ただひとつの状態。 |
| `verification` | その状態を*証明する*具体的なテスト・コマンド・成果物。 |
| `constraints` | 変えてはいけないもの、後退させてはいけないもの。 |
| `boundaries` | 対象に含めるファイル、ディレクトリ、ツール、システム。 |
| `stop_when` | Hermes が止まって、こちらに聞くべき条件。 |

取り決めを設定すると、2 つの指示文が変わります。**続きを促す指示**は、証明にあたる部分を狙い、制約を守るようにエージェントへ伝えます。**判定の指示**は、*証明の条件が具体的な証拠（コマンドの結果、ファイルの抜粋、テストの出力）とともに満たされたときにだけ* `done` を出すようになり、「終わったように見える」だけの主張では通しません。これは `/goal` でいちばんよくある失敗、つまり中身が定まっていない目的に対して早すぎる完了を出したり、いつまでも続けたりする形を、まっすぐ締めます。

### 取り決めの立て方は 2 通り {#two-ways-to-set-a-contract}

**1. Hermes に起こしてもらう**（おすすめ。Codex の「目標はエージェントに起こさせよ」という助言に倣ったものです）。

```
/goal draft Migrate the auth service from session cookies to JWT
```

Hermes が、一行の目的を `goal_judge` の補助モデルで完全な取り決めに広げ、それを設定して、内容を見せてくれます。あとから見直したり、項目を締め直したりできます。補助モデルが使えないときは、ふつうの自由記述の目標に落ちます。取り決めを起こせないことが、目標を立てられない理由になることはありません。

**2. その場で書く**。`field: value` の行を並べます。

```
/goal Migrate auth to JWT
verify: pytest tests/auth passes
constraints: keep the /login response shape unchanged
boundaries: only touch services/auth and its tests
stop when: a DB schema migration is required
```

項目の行でない最初の行が目標の見出しになり、決められた項目の書き出し（`verify:`、`verified by:`、`constraints:`、`preserve:`、`boundaries:`、`scope:`、`stop when:`、`blocked:` など）が取り決めを埋めます。たまたまコロンが入っただけのふつうの目標（`Fix bug: the parser drops commas`）が**壊されることはありません**。取り出されるのは、決められた書き出しだけです。

いま有効な取り決めは `/goal show` で確認できます。取り決めは目標と並んで `SessionDB.state_meta` に残るので、`/resume` をまたいでも消えません。この機能ができる前の古い目標も、そのまま（取り決めなしで）読み込まれます。取り決めと `/subgoal` の条件は重ねられます。追加の目標は、判定も満たさなければならない条件として取り決めに畳み込まれます。

## 途中で条件を足す `/subgoal` {#adding-criteria-mid-goal-subgoal}

目標が動いているあいだに、`/subgoal <text>` で受け入れの条件を足せます。繰り返しの動きは止まりません。1 回の呼び出しで、番号の付いた項目が目標の追加条件の一覧にひとつ増えます。次の応答でエージェントが見る**続きを促す指示**には、もとの目標に加えて「途中で足された追加の条件」の一かたまりが入ります。**判定の指示**も書き換えられ、すべての追加条件を踏まえて結論を出すようになります。もとの目的**と**すべての追加条件が満たされるまで、目標は完了になりません。

| コマンド | 何をするか |
|---|---|
| `/subgoal <text>` | いま有効な目標に条件をひとつ足します。`/goal` が動いていることが前提です。 |
| `/subgoal`（引数なし） | いまの追加条件の一覧を番号付きで表示します。 |
| `/subgoal remove <N>` | N 番目（1 から数えます）の追加条件を外します。 |
| `/subgoal clear` | 追加条件をすべて外し、もとの目標はそのまま残します。 |

追加条件は目標と並んで `SessionDB.state_meta` に残るので、`/resume` をまたいでも消えません。新しく `/goal <text>` を設定すると目標が置き換わり、追加条件の一覧は消えます。`/goal clear` も同じです。

「落ちているテストを直して」と繰り返しを始めたあとで、「ついでに、いま直したバグの再発を捕まえるテストも足してほしい」と気づいたときに使います。`/subgoal add a regression test` と書けば、動いている繰り返しを壊さずに合格の条件を締められます。

## 品質の関門 {#quality-gates}

完了の取り決めは判定を厳しくしますが、判定はやはり文章を読む LLM です。**品質の関門**はもっと強く、目標が完了になる前に必ず終了コード 0 で通らなければならないシェルのコマンドです。Prime-Agent の、範囲を区切った自動運転の仕組み（`--autonomous-gate`）に着想を得ています。

```
/goal Fix the flaky session tests
/goal gate add scripts/run_tests.sh tests/hermes_cli/test_goals.py
```

毎回の応答での動きはこうです。

1. **関門は判定より先に走ります。** どれかの関門が落ちたら、判定は*呼ばれません*。落ちた関門は、目標が終わっていないことの動かぬ証拠だからです。関門の終了コードと出力の末尾（およそ 3 KB）が続きを促す指示になるので、エージェントは雰囲気ではなく実際の失敗に向き合って繰り返します。
2. **すべての関門が通れば、いつもどおりの判定へ。** そのあと LLM の判定が、これまでと同じように done / blocked / continue / wait を決めます。
3. **区切りのたびに、落ちた関門を走らせ直します。** コマンドは毎回そのときの入力に対して実行され、古い結果をそのまま出すことはありません。なので、入力を直したばかりの関門は、次の区切りで通ります。本当に行き詰まって赤いままのテストは、やり直しの上限が歯止めになります。
4. **やり直しには上限があります。** 関門ごとに、既定でやり直し 3 回、制限時間 5 分です。やり直しを使い切ると、目標は（応答の回数の上限と同じように）自動で一時停止し、手で直すか、関門を外すか、`/goal resume` するかを促すメッセージが出ます。

関門は目標と並んで `SessionDB.state_meta` に残ります（`/resume` や文脈の圧縮をまたいでも消えません）。関門の操作（`/goal gate …`）は、プラットフォーム連携で実行中に行っても安全です。関門が走るのは応答の切れ目だけだからです。

関門と取り決めは重ねられます。取り決めで*エージェントが何を目指すか*を形づくり、関門で*「終わった」を機械的に確かめられる*ようにします。両方を設定した場合は、関門が先に走ります。

## 裏のプロセスの前で待つ。自動で、必要なら手動でも {#parking-on-a-background-process-automatic-with-a-manual-override}

目標によっては、何分もかかって自分で進むものを待つことになります。押した PR の CI、長いビルド、テストの組み合わせ、デプロイ、利用制限が明けるまでの待ちなどです。何もしなければ、待っているあいだも繰り返しの仕組みが毎回エージェントを突き、「もう終わった？」という無駄な作業を生んでしまいます。

**これは自動で扱われます。** 毎回、判定には目標とエージェントの返答に加えて、エージェント自身が動かしている裏のプロセスが見せられます（このセッションが起こした `terminal(background=true)` の登録内容、つまり pid、セッション ID、コマンド、経過時間、直近の出力、それに `watch_patterns` / `notify_on_complete` の合図です。委任先のエージェントが起こしたプロセスは見せないので、作業を配った親が働き手の監視プロセスの前で待たされることはありません）。エージェントの進みが本当にそのどれかで止まっているとき、判定は `continue` ではなく **`wait`** を返し、繰り返しは**待ちに入ります**。待ちが解けるまで次の応答は飛ばされ（判定も呼ばれず、続きも送られず、回数も減りません）、解けたところで結果を手に、いつもどおり再開します。pid とセッションによる待ちは 30 分が上限です。終わらないプロセス（監視役や、消し忘れたポーリング）が、目標をいつまでも止めることはできません。判定は**時間**を根拠に待つこと（`wait_for_seconds`）もできます。間隔を空けたいときや、制限が明けるのを待つときのためです。待ちのあいだ `/goal status` には `⏳ Goal (parked …)` と表示されます。

判定は、そのプロセス自身の合図から、どの待ち方をするかを選びます。

- **`wait_on_session <id>`** — そのプロセス*自身の合図*で解けます。プロセスが終わるか、（`watch_patterns` を付けて起こしていれば）その文字列が出たときです。長く生き続ける監視役・サーバー・ポーリングのように、**実行の途中**で合図を出し（たとえば `BUILD SUCCESSFUL` と表示してから動き続けるビルド、あるいは `notify_on_complete` の監視役）、自分では終わらないかもしれないものに使います。
- **`wait_on_pid <pid>`** — プロセスが終わったときにだけ解けます。
- **`wait_for_seconds <n>`** — 決めた時間が過ぎたら解けます。

これらを自分で打ち込む必要はありません。繰り返しの仕組みが渡すプロセスの情報をもとに、判定が決めます。手で打つコマンドは、その判断を上書きするためのものです。

| コマンド | 何をするか |
|---|---|
| `/goal wait <pid> [reason]` | その PID のプロセスが終わるまで、手動で待たせます。PID は Hermes の動いているホストで生きているプロセスでなければなりません。リモートの PID や、すでに終わった PID は受け付けません（判定が `wait_on_pid` でそうした PID を指定した場合も、待たずにそのまま続けます）。 |
| `/goal unwait` | 待ち（判定が付けたものも、手で付けたものも）を外して、すぐ再開します。 |

待ちは（pid によるものも時間によるものも）目標と並んで `SessionDB.state_meta` に残るので、`/resume` をまたいでも消えません。`/goal pause`、`/goal resume`、`/goal clear` はいずれも待ちを外します。待ちを付けた時点でその PID がすでに終わっていた場合、待っているあいだに終わった場合、時間が過ぎた場合は、次の確認のときに待ちが外れます。古い待ちが残って繰り返しを止めてしまうことはありません。

よくある流れはこうです。エージェントが PR を押し、`terminal(background=true, notify_on_complete=true)` で CI の監視を始め、「CI を見ています」と報告します。判定は監視のプロセスがまだ動いているのを見て、その pid で `wait` を返し、繰り返しは静かになります。そして CI が終わった瞬間に動き出し、実際の結果に照らして目標を判定します。

## 動きの詳細 {#behavior-details}

### 判定 {#the-judge}

応答が終わるたびに、Hermes は補助のモデルを次の材料で呼びます。

- 立てている目標の文
- エージェントの直近の最終返答（末尾およそ 4 KB 分）
- 1 行の厳密な JSON で答えるよう指示するシステムプロンプト。`{"verdict": "done" | "blocked" | "continue" | "wait", "reason": "<one-sentence rationale>"}` の形です（wait のときは `wait_on_session` / `wait_on_pid` / `wait_for_seconds` が加わります。古い `{"done": <bool>, "reason": "..."}` の形もまだ受け付けます）

判定は意図して控えめです。`done` を出すのは、返答が目標の完了を**はっきり**言っていて、最終的な成果物がきちんとできているときだけです。エージェントが**達成できない**（不可能、対象外、こちらの入力が要る）と説明した目標には、`done` ではなく `blocked` が返ります。目標は判定の理由とともに**一時停止**し（`🚫 Goal judged unachievable — paused`）、`/goal <text>` で範囲を切り直すか、`/goal resume` で押し切るかを選べます。回数を無駄に使ったり、できない作業が完了として通ってしまったりしません。

### 判定が落ちたときは通す側に倒す {#fail-open-semantics}

判定でエラーが起きたとき（通信の途切れ、形の壊れた返答、補助のクライアントが使えないなど）、Hermes はその結論を `continue` として扱います。判定が壊れたせいで前に進めなくなることはありません。本当の歯止めは**応答の回数の上限**です。

### 応答の回数の上限 {#turn-budget}

既定では続きの応答 20 回です（`config.yaml` の `goals.max_turns`）。上限に達すると、Hermes は自動で一時停止し、次にどうすればよいかをそのまま伝えます。

```
⏸ Goal paused — 20/20 turns used. Use /goal resume to keep going, or /goal clear to stop.
```

`/goal resume` で数え直しがゼロに戻るので、区切りながら進められます。

### ユーザーの発言がいつでも優先 {#user-messages-always-preempt}

目標が動いているあいだに送った実際のメッセージは、繰り返しの続きより優先されます。CLI では、待っている続きより前に `_pending_input` へ入ります。プラットフォーム連携では、同じように受け口の順番待ちを通ります。判定はあなたの応答のあとにもう一度走るので、送ったメッセージでたまたま目標が満たされれば、判定がそれを見つけて止めてくれます。

### 実行中の安全（プラットフォーム連携） {#mid-run-safety-gateway}

エージェントが動いているあいだでも、`/goal status`、`/goal pause`、`/goal clear`、`/goal wait`、`/goal unwait` は安全に実行できます。制御まわりの状態に触るだけで、いまの応答を止めないからです。実行中に**新しい**目標を設定すること（`/goal <new text>`）は断られ、先に `/stop` するよう伝えられます。古い続きと新しい続きがぶつからないようにするためです。

### 続きの応答は目標を立てたメッセージを引用しません（プラットフォーム連携） {#continuation-replies-do-not-quote-the-goal-message-gateway}

続きを促すプロンプトは、目標を立てたメッセージへの返信ではありません。そのため、返信先を引用して表示するプラットフォーム（Telegram）では、途中経過の吹き出しも最後の返答も、元のメッセージを引用せずにそのチャットやトピックへ投稿されます。返信の形で返ってくるのは、自分で送ったメッセージだけです。

### 保存のされ方 {#persistence}

目標の状態は `SessionDB.state_meta` に `goal:<session_id>` という鍵で入っています。ですから `/resume` すれば、やめたところからそのまま続けられます。目標を立て、ノートパソコンを閉じ、翌日戻って `/resume` すると、目標は残したときのまま（動いている・止めてある・終わっている）です。

### プロンプトキャッシュ {#prompt-cache}

続きを促す指示は、履歴に足されるふつうのユーザー発言です。システムプロンプトを書き換えたり、使えるツールを入れ替えたり、Hermes のプロンプトキャッシュを無効にするような触り方をしたりは**しません**。20 回の目標を回しても、キャッシュの面ではふつうの会話 20 回分と同じです。

## 設定 {#configuration}

`~/.hermes/config.yaml` に足します。

```yaml
goals:
  # Max continuation turns before Hermes auto-pauses and asks you to
  # /goal resume. Default 20. Lower this if you want tighter loops;
  # raise it for long-running refactors.
  max_turns: 20
```

### 判定に使うモデルを選ぶ {#choosing-the-judge-model}

判定は `goal_judge` という補助の役割を使います。既定では主に使っているモデルになります（[補助モデル](/hermes/docs/user-guide/configuration/#auxiliary-models)をご覧ください）。費用を抑えるために、安くて速いモデルへ判定を回したいなら、上書きを足します。

```yaml
auxiliary:
  goal_judge:
    provider: openrouter
    model: google/gemini-3-flash-preview
```

判定の呼び出しは小さく（出力はおよそ 200 トークン）、応答ごとに 1 回走るだけなので、たいていは安くて速いモデルが正解です。

## 動きの例 {#example-walkthrough}

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

応答 4 回、`/goal` は 1 回、こちらからの「続けて」はゼロです。

## 判定が外したとき {#when-the-judge-gets-it-wrong}

完璧な判定はありません。気をつけたい外し方が 2 つあります。

**取りこぼし — 実は終わっているのに continue と言う。** これは応答の回数の上限が受け止めます。`⏸ Goal paused` が出るので、`/goal clear` するか、新しいメッセージを送れば済みます。

**行きすぎ — 作業が残っているのに done と言う。** `✓ Goal achieved` が出ても、こちらには残っているとわかります。続きのメッセージを送るか、目標をより具体的に立て直してください（`/goal <more specific text>`）。判定のシステムプロンプトは意図して控えめに書いてあり、行きすぎのほうが取りこぼしより起きにくくしてあります。

判定の結論に納得できないときは、`↻ Continuing toward goal` や `✓ Goal achieved` の行にある理由の文が、判定が何を見たのかをそのまま教えてくれます。たいていはそれで、目標の文があいまいだったのか、モデルの返答があいまいだったのかを見分けられます。

## 出典 {#attribution}

`/goal` は、**Ralph ループ**という型の Hermes 版です。目標を応答をまたいで生かし、達成するまで止まらず、作成・一時停止・再開・取り消しの操作を備える、という利用者から見た形は、OpenAI の Codex チームの Eric Traut 氏が [Codex CLI 0.128.0](https://github.com/openai/codex) で広め、世に出したものです。こちらの実装は独立に書いたもの（中央の `CommandDef` の登録、`SessionDB.state_meta` への保存、補助クライアントによる判定、プラットフォーム連携側での順番待ちによる続行）ですが、考え自体は向こうのものです。功績はきちんと向こうにあります。
