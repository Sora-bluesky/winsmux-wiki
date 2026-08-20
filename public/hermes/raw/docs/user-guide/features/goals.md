---
title: "持続する目標"
description: "立てた目標を預けておくと、Hermes が終わるまでターンをまたいで動き続けます。Ralph ループに対する私たちなりの答えです。"
upstream_path: user-guide/features/goals.md
upstream_blob: b4a9f315858409f0432eff323fb377fbd8e95d0f
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/goals
---

# 持続する目標（`/goal`） {#persistent-goals-goal}

`/goal` は、ターンをまたいで生き続ける目標を Hermes に持たせます。1ターンごとに、軽い判定役のモデルが、直前の応答で目標が満たされたかどうかを確かめます。まだなら、Hermes が同じセッションに続きを促すプロンプトを自動で送り、作業を続けます。目標が達成されるか、あなたが一時停止か取り消しをするか、ターンの持ち分が尽きるまでです。

これは **Ralph ループ**に対する私たちなりの答えで、OpenAI の Eric Traut による [Codex CLI 0.128.0 の `/goal`](https://github.com/openai/codex) から直接の着想を得ています。ターンをまたいで目標を生かし、達成するまで止めないという核となる発想は彼らのものです。ここでの実装は独立に書かれ、Hermes の作りに合わせてあります。

## どんなときに使うか {#when-to-use-it}

`/goal` は、毎ターン言い直さなくても Hermes に自分で繰り返してほしい仕事に向いています。

- 「`src/` の lint のエラーを全部直して、`ruff check` が通ることを確かめて」
- 「リポジトリ Y の機能 X を、テストごと移植して、CI を緑にして」
- 「実行の途中で圧縮したときにセッション ID がときどきずれる原因を調べて、報告にまとめて」
- 「EXIF の日付でファイル名を付け替える小さな CLI を作って、photos/ フォルダで試して」

エージェントが1ターンで終える仕事に `/goal` は要りません。*ほうっておくと「続けて」を3回言うはめになる*ような仕事でこそ生きます。

## 目標とカンバン、どちらを使うか {#goals-vs-kanban-which-one-do-i-want}

`/goal` も[カンバン](/hermes/docs/user-guide/features/kanban/)も、言い直さなくても Hermes が動き続ける点は同じなので、片方がもう片方につながっていると思いたくなります。実際はつながっておらず、境目ははっきりしています。

- **`/goal` は1つのセッションの中だけです。** ループは判定役が終わりと言うまで、続きのプロンプトを*この*会話に送ります。目標を立ててもカンバンのカードは作られませんし、別のプロファイルに仕事が割り当てられることも、仕事が枝分かれすることもありません。盤への引き継ぎは、明示的にも暗黙にも起きません。
- **カンバンは多くの仕事を並べた盤です。** カードはそれぞれ専用の作業役の処理に振られ、専用のセッションを持ちます。カード・依存関係・担当者・引き継ぎは盤の上にあり、`/goal` の中にはありません。
- **重なりは意図的で、しかも小さいものです。** `--goal` を付けて作ったカンバンのカードは、`/goal` と同じ Ralph 風の継続のしくみで動きます。ただし*そのカードの作業役のセッションの中だけ*です。借りているのはしくみであって、盤ではありません。[目標モードのカード](/hermes/docs/user-guide/features/kanban/#goal-mode-cards---goal)を参照してください。

| やりたいこと | 使うもの |
|---|---|
| このチャットの中で、1つの仕事を終わるまで繰り返させたい | `/goal <text>` |
| 独立した仕事がたくさんあり、依存関係・引き継ぎ・複数のプロファイルが要る | [カンバン](/hermes/docs/user-guide/features/kanban/) — `hermes kanban create …` |
| 盤の上の1枚のカードを、受け入れの条件を満たすまで繰り返させたい | `--goal` を付けたカンバンのカード |

:::note
仕事を盤に載せたいなら、自分で載せてください（`hermes kanban create …`）。`/goal` が代わりにやってくれることはありません。逆も同じで、このチャットで目標を止めたり、再開したり、消したりしても、カンバンのカードが作られたり、取得されたり、動いたりすることはありません。
:::

## さっそく使う {#quick-start}

```
/goal Fix every failing test in tests/hermes_cli/ and make sure scripts/run_tests.sh passes for that directory
```

こう見えます。

1. **目標が受け付けられる** — `⊙ Goal set (20-turn budget): <your goal>`
2. **1ターン目が動く** — 目標を普通のメッセージとして送ったのと同じように Hermes が動き出します。
3. **判定役が動く** — ターンのあと、判定役のモデルが `done` か `continue` かを決めます。
4. **必要ならループが回る** — `continue` なら `↻ Continuing toward goal (1/20): <judge's reason>` が出て、Hermes が自動で次の一歩を踏みます。
5. **終わる** — いずれ `✓ Goal achieved: <reason>` か `⏸ Goal paused — N/20 turns used` のどちらかが出ます。

## コマンド {#commands}

| コマンド | 働き |
|---|---|
| `/goal <text>` | 目標を立てます（すでにあれば置き換えます）。1ターン目をその場で始めるので、別にメッセージを送る必要はありません。 |
| `/goal draft <text>` | 普通の言葉で書いた目的から、構造のある完了の取り決めを起草して立てます。[完了の取り決め](#completion-contracts)を参照してください。 |
| `/goal show` | いま有効な目標の完了の取り決めを表示します。 |
| `/goal` または `/goal status` | 今の目標・その状態・使ったターン数を表示します。 |
| `/goal pause` | 目標を消さずに、自動で続ける動きだけ止めます。 |
| `/goal resume` | ループを再開します（ターンの数え直しが0に戻ります）。 |
| `/goal clear` | 目標をまるごと捨てます。 |
| `/goal wait <pid> [reason]` | 裏で動いている処理の上にループを停めます。その処理が動いている間はエージェントを毎ターンつつくのをやめ、終わったら自動で再開します。 |
| `/goal unwait` | 待ちの関門を外し、ただちにループを再開します。 |
| `/goal gate add <command>` | **品質の関門**を足します。目標が完了と判定される前に必ず通らなければならないシェルのコマンドです。[品質の関門](#quality-gates)を参照してください。 |
| `/goal gate` または `/goal gate list` | 目標の関門と、その通過・失敗の状態を並べます。 |
| `/goal gate remove <N>` | N 番目の関門を外します（1から数えます）。 |
| `/goal gate clear` | すべての関門を外します。 |

CLI でも、どの窓口（Telegram、Discord、Slack、Matrix、Signal、WhatsApp、SMS、iMessage、Webhook、API サーバー、Web の画面）でも、まったく同じように動きます。

## 完了の取り決め {#completion-contracts}

素の `/goal <text>` でも十分働きますが、*ぼんやりした*目標はぼんやりした判定を招きます。判定役は、あなたが望むと伝えたことしか確かめられません。Codex の `/goal` の案内も同じことを言っています。長く生きる目的は、**何をもって終わりとするか、それをどう証明するか、何を壊してはいけないか、どこまでが範囲か、いつ止まるか**を名指ししたときにいちばんよく働きます。Hermes はこれを、既存の目標のループの上に重ねる任意の**完了の取り決め**として取り入れました。

取り決めには5つの項目があり、どれも任意です。

| 項目 | 意味 |
|---|---|
| `outcome` | 終わったときに成り立っていなければならない、ただ1つの状態。 |
| `verification` | その状態を*証明する*具体的なテスト／コマンド／成果物。 |
| `constraints` | 変えてはいけない、あるいは後退させてはいけないもの。 |
| `boundaries` | 手を触れてよいファイル・ディレクトリ・ツール・システム。 |
| `stop_when` | Hermes が止まって指示を仰ぐべき条件。 |

取り決めがあると、2つのプロンプトが変わります。**続きを促すプロンプト**は、証明の対象を狙い、制約を守るようにエージェントへ伝えます。**判定役のプロンプト**は、*証明の条件が具体的な証拠（コマンドの結果、ファイルの抜粋、テストの出力）とともに満たされたときにだけ* `done` と決めるようになります。ゆるい「できていそう」では通りません。これは `/goal` でいちばんよくある失敗のかたち、つまり書き足りない目的に対する早すぎる完了や、いつまでも続く繰り返しを、まっすぐ締め上げます。

### 取り決めを立てる2つの方法 {#two-ways-to-set-a-contract}

**1. Hermes に起草させる**（おすすめ。Codex の「目標はエージェントに書かせよう」という助言を取り入れたものです）

```
/goal draft Migrate the auth service from session cookies to JWT
```

Hermes は一行の指示を `goal_judge` の補助モデルでひととおりの取り決めに広げ、それを立て、結果を見せてくれるので、どの項目でも見直したり締めたりできます。補助モデルが使えないときは、素の自由記述の目標に落ちます。起草に失敗しても目標を立てられなくなることはありません。

**2. その場で書く。** `field: value` の行を並べます。

```
/goal Migrate auth to JWT
verify: pytest tests/auth passes
constraints: keep the /login response shape unchanged
boundaries: only touch services/auth and its tests
stop when: a DB schema migration is required
```

項目でない最初の行が目標の見出しになり、決まった項目の書き出し（`verify:`、`verified by:`、`constraints:`、`preserve:`、`boundaries:`、`scope:`、`stop when:`、`blocked:` など）が取り決めを埋めます。たまたまコロンが入っただけの普通の目標（`Fix bug: the parser drops commas`）が**壊されることはありません**。取り出されるのは、知っている項目の書き出しだけです。

いま有効な取り決めは `/goal show` で見直せます。取り決めは目標と並んで `SessionDB.state_meta` に残るので、`/resume` をまたいでも生きています。この機能より前の古い目標は、そのまま（取り決めなしで）読み込まれます。取り決めと `/subgoal` の条件は組み合わせられます。副目標は、判定役が同時に満たすべき追加の条件として取り決めに畳み込まれます。

## 途中で条件を足す: `/subgoal` {#adding-criteria-mid-goal-subgoal}

目標が動いている間に、ループを止めずに `/subgoal <text>` で受け入れの条件を足せます。1回呼ぶごとに、目標の副目標の一覧に番号付きの項目が1つ増えます。次のターンでエージェントが見る**続きを促すプロンプト**には、元の目標に加えて「途中で利用者が足した条件」の塊が入り、**判定役のプロンプト**も、すべての副目標を踏まえて結論を出すように書き換わります。元の目的**と**すべての副目標が満たされるまで、目標は完了になりません。

| コマンド | 働き |
|---|---|
| `/subgoal <text>` | いま有効な目標に条件を1つ足します。動いている `/goal` が必要です。 |
| `/subgoal`（引数なし） | 今の副目標の一覧を番号付きで表示します。 |
| `/subgoal remove <N>` | N 番目の副目標を外します（1から数えます）。 |
| `/subgoal clear` | 元の目標はそのままに、副目標をすべて捨てます。 |

副目標は目標と並んで `SessionDB.state_meta` に残るので、`/resume` をまたいでも生きています。新しく `/goal <text>` を立てると目標が置き換わり、副目標の一覧は消えます。`/goal clear` も同じです。

これが効くのは、ループを始めたあと（「落ちているテストを直して」）で、途中から「ついでに、いま直したバグの再発を防ぐテストも足して」と思ったときです。`/subgoal add a regression test` と打てば、動いているループを壊さずに成功の条件を締められます。

## 品質の関門 {#quality-gates}

完了の取り決めは判定役を厳しくしますが、判定役は結局のところ文章を読む LLM です。**品質の関門**はもっと強く、目標が完了になる前に必ず終了コード0で終わらなければならない、決定的なシェルのコマンドです。Prime-Agent の枠をはめた自律モード（`--autonomous-gate`）から着想を得ています。

```
/goal Fix the flaky session tests
/goal gate add scripts/run_tests.sh tests/hermes_cli/test_goals.py
```

毎ターン、こう動きます。

1. **関門は判定役より先に走ります。** どれか1つでも落ちれば、判定役は*呼ばれません*。赤い関門は、目標が終わっていないという決定的な証拠だからです。関門の終了コードと出力の末尾（およそ3 KB）が続きを促すプロンプトになるので、エージェントは雰囲気ではなく実際の失敗に向かって繰り返せます。
2. **関門が全部通れば、いつもどおりの判定です。** そのあと LLM の判定役が、これまでどおり done / continue / wait を決めます。
3. **作業場所が変わっていなければ、走らせ直しません。** 関門が落ちたあと、作業場所に何も変化がなければ（HEAD と作業ツリーの状態を git で指紋にして追っています）関門は走らせ直されず、記録された失敗がそのまま再生され、試行の回数だけが進みます。行き詰まったエージェントが、同じ赤いテスト一式を回し続けて時間を溶かすことはありません。git のリポジトリの外では、関門は常に走ります。
4. **やり直しには上限があります。** 関門ごとに、既定でやり直し3回、制限時間5分です。やり直しを使い切ると、目標はターンの持ち分と同じように自動で一時停止し、手で直すか、関門を外すか、`/goal resume` するように伝えるメッセージが出ます。

関門は目標と一緒に `SessionDB.state_meta` に残り（`/resume` と文脈の圧縮をまたいで生きます）、窓口の側では動作の途中でも関門の操作（`/goal gate …`）が安全です。関門はターンの切れ目でしか走らないからです。

関門と取り決めは組み合わせて使えます。取り決めで*エージェントが何を目指すか*を形づくり、関門で*「終わり」を機械的に確かめられるもの*にします。両方を立てた場合、関門が先に走ります。

## 裏で動く処理の上で停まる: 自動、ただし手動で上書きもできる {#parking-on-a-background-process-automatic-with-a-manual-override}

目標によっては、何分もかかって勝手に進むものに結果が握られています。push した PR の CI、長いビルド、テストの組み合わせ、デプロイ、レート制限の待ち時間などです。何もしなければ、目標のループは待っている間じゅう「もう終わった？」という無駄な問いかけでエージェントをつつき続けてしまいます。

**これは自動で処理されます。** 毎ターン、判定役には、目標とエージェントの応答に加えて、エージェントが裏で動かしている処理の一覧（`terminal(background=true)` の登録簿。pid、セッション id、コマンド、経過時間、直近の出力、`watch_patterns` や `notify_on_complete` の合図）が渡されます。エージェントの進みが本当にそのどれかに握られているとき、判定役は `continue` ではなく **`wait`** の結論を返し、ループは**停まります**。待ちが満たされるまでの数ターンは飛ばされ（判定役も呼ばれず、続きも送られず、ターンも消費されません）、満たされたら結果を手にした状態で普通に再開します。判定役は**時間**を基準に停めることもできます（`wait_for_seconds`。待ち時間や冷却のためです）。停まっている間、`/goal status` には `⏳ Goal (parked …)` と出ます。

判定役は、処理そのものが出す合図から、どの待ち方が適切かを選びます。

- **`wait_on_session <id>`** — その処理*自身の合図*で解けます。処理が終了するか、（`watch_patterns` 付きで始まっていれば）その模様に一致したときです。長く生き続ける監視役・サーバー・巡回役のように、**動作の途中で**合図を出し（たとえば `BUILD SUCCESSFUL` と表示してから走り続けるビルドや、`notify_on_complete` の監視役）、自分から終了しないかもしれないものに使います。
- **`wait_on_pid <pid>`** — 処理の終了だけで解けます。
- **`wait_for_seconds <n>`** — 決まった時間が過ぎたら解けます。

これらのために何かを打ち込む必要はありません。ループが渡した処理の情報をもとに、判定役が決めます。手動のコマンドは上書きのために用意されています。

| コマンド | 働き |
|---|---|
| `/goal wait <pid> [reason]` | その PID の処理が終わるまで、手動でループを停めます。 |
| `/goal unwait` | 待ちの関門を（判定役が立てたものも手で立てたものも）外し、ただちに再開します。 |

関門は（pid によるものも時間によるものも）目標と一緒に `SessionDB.state_meta` に残るので、`/resume` をまたいでも生きています。`/goal pause`・`/goal resume`・`/goal clear` はいずれも関門を落とします。関門を立てたときすでに PID が死んでいた場合（あるいは停まっている間に死んだ場合）、または期限が過ぎた場合、関門は次の確認で外れます。古くなった関門がループを詰まらせることはありません。

よくある流れはこうです。エージェントが PR を push し、`terminal(background=true, notify_on_complete=true)` で CI の監視役を立ち上げ、「CI を見ています」と報告します。判定役は監視役の処理がまだ動いているのを見て、その pid で `wait` を返し、ループは静かになります。そして CI が終わった瞬間に動き出し、実際の結果に照らして目標を判定します。

## 動きの細部 {#behavior-details}

### 判定役 {#the-judge}

毎ターンのあと、Hermes は補助モデルを次の材料で呼びます。

- 立てられている目標の文
- エージェントの直近の最終応答（末尾およそ4 KB の文字）
- 厳密な1行の JSON で答えるよう指示するシステムプロンプト: `{"verdict": "done" | "continue" | "wait", "reason": "<one-sentence rationale>"}`（wait の結論には `wait_on_session` / `wait_on_pid` / `wait_for_seconds` が加わります。古い形の `{"done": <bool>, "reason": "..."}` も引き続き受け付けます）

判定役はわざと控えめに作ってあります。応答が目標の完了を**はっきり**認めているとき、最終的な成果物が明らかにできあがっているとき、あるいは目標が達成不能か止まっているとき（不可能な仕事に持ち分を使わないよう、停止の理由付きで DONE として扱います）にだけ `done` にします。

### 失敗しても止めない作り {#fail-open-semantics}

判定役がエラーになったとき（通信の途切れ、壊れた応答、補助のクライアントが使えないなど）、Hermes は結論を `continue` として扱います。壊れた判定役が前進を詰まらせることはありません。本当の歯止めは**ターンの持ち分**です。

### ターンの持ち分 {#turn-budget}

既定では続きのターンは20回です（`config.yaml` の `goals.max_turns`）。使い切ると Hermes は自動で一時停止し、次にどうすればよいかをそのまま伝えます。

```
⏸ Goal paused — 20/20 turns used. Use /goal resume to keep going, or /goal clear to stop.
```

`/goal resume` は数え直しを0に戻すので、区切りをつけながら進められます。

### 利用者のメッセージが常に割り込む {#user-messages-always-preempt}

目標が動いている間にあなたが送った本当のメッセージは、続きのループより優先されます。CLI ではあなたのメッセージが待ち行列の続きより先に `_pending_input` に入り、窓口では同じように受け渡しの順番待ちを通ります。判定役はあなたのターンのあとにもう一度動くので、あなたのメッセージでたまたま目標が達成されたなら、判定役がそれを捉えて止まります。

### 動作中の安全（窓口） {#mid-run-safety-gateway}

エージェントがすでに動いている間でも、`/goal status`・`/goal pause`・`/goal clear`・`/goal wait`・`/goal unwait` は安全に実行できます。制御のための状態にしか触れず、動いているターンを邪魔しないからです。動作中に**新しい**目標を立てる（`/goal <new text>`）のは断られ、まず `/stop` するよう促されます。古い続きが新しいものと競らないようにするためです。

### 保存のされ方 {#persistence}

目標の状態は `SessionDB.state_meta` に `goal:<session_id>` の鍵で入っています。つまり `/resume` は中断したところから拾い直します。目標を立て、ノートパソコンを閉じ、翌日戻ってきて `/resume` すれば、目標は残したとおりの姿（動作中、一時停止、達成済みのいずれか）でそこにあります。

### プロンプトのキャッシュ {#prompt-cache}

続きを促すプロンプトは、履歴に足されるただの利用者役のメッセージです。システムプロンプトを書き換えることも、道具立てを入れ替えることも、Hermes のプロンプトのキャッシュを無効にするような形で会話に触れることも**ありません**。20ターンの目標を走らせても、キャッシュの面では普通の会話20ターンと同じ費用です。

## 設定 {#configuration}

`~/.hermes/config.yaml` に足します。

```yaml
goals:
  # Max continuation turns before Hermes auto-pauses and asks you to
  # /goal resume. Default 20. Lower this if you want tighter loops;
  # raise it for long-running refactors.
  max_turns: 20
```

### 判定役のモデルを選ぶ {#choosing-the-judge-model}

判定役は `goal_judge` という補助の役目を使います。既定ではあなたの主モデルに解決されます（[補助モデル](/hermes/docs/user-guide/configuration/#auxiliary-models)を参照）。費用を抑えるために安くて速いモデルへ振り向けたいなら、上書きを足します。

```yaml
auxiliary:
  goal_judge:
    provider: openrouter
    model: google/gemini-3-flash-preview
```

判定役の呼び出しは小さく（出力はおよそ200トークン）、1ターンに1回だけ走るので、たいていは安くて速いモデルが正解です。

## 例をひととおり {#example-walkthrough}

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

4ターン、`/goal` の呼び出しは1回、あなたからの「続けて」はゼロです。

## 判定役が外したとき {#when-the-judge-gets-it-wrong}

完璧な判定役はいません。気をつけたい失敗が2つあります。

**見落とし — 実は終わっているのに continue と言う。** これはターンの持ち分が受け止めます。`⏸ Goal paused` が出るので、`/goal clear` するか、新しいメッセージを送るだけで済みます。

**早合点 — 作業が残っているのに done と言う。** `✓ Goal achieved` と出ても、あなたにはそうでないと分かります。続きのメッセージを送るか、目標をもっと正確に立て直してください（`/goal <more specific text>`）。判定役のシステムプロンプトはわざと控えめに書いてあるので、早合点は見落としより起きにくくなっています。

判定役の結論に納得できないときは、`↻ Continuing toward goal` や `✓ Goal achieved` の行に出ている理由の文が、判定役に何が見えていたかをそのまま教えてくれます。たいていはそれだけで、目標の文が曖昧だったのか、モデルの応答のほうが曖昧だったのかを見分けられます。

## 出どころ {#attribution}

`/goal` は **Ralph ループ**という型に対する Hermes なりの答えです。ターンをまたいで目標を生かし、達成するまで止めず、作成・一時停止・再開・取り消しの操作を備える、という利用者から見た設計は、OpenAI の Codex チームの Eric Traut が [Codex CLI 0.128.0](https://github.com/openai/codex) で広め、世に出したものです。私たちの実装は独立していますが（中央の `CommandDef` の登録簿、`SessionDB.state_meta` への保存、補助クライアントによる判定役、窓口側での受け渡しの順番待ちによる継続）、発想は彼らのものです。称えるべきものは称えます。
