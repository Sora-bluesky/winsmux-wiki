---
title: "Simplify Code — 直近のコード変更を、4 つのエージェントで並行して片づけます"
description: "直近のコード変更を、4 つのエージェントで並行して片づけます"
upstream_path: user-guide/skills/bundled/software-development/software-development-simplify-code.md
upstream_blob: 59e22aa1f6a200394a20eb291103625945d0c680
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/software-development/software-development-simplify-code
---

# Simplify Code {#simplify-code}

直近のコード変更を、4 つのエージェントで並行して片づけます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/software-development\simplify-code` |
| バージョン | `1.1.0` |
| 作者 | Hermes Agent（Claude Code の /simplify に着想を得ています） |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `code-review`, `cleanup`, `refactor`, `delegation`, `subagent`, `parallel`, `simplify` |
| 関連 skill | [`requesting-code-review`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-requesting-code-review/), [`test-driven-development`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-test-driven-development/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Simplify Code — 並行レビューと片づけ {#simplify-code-parallel-review-cleanup}

観点を絞った 4 人のレビュー役を同時に走らせて直近のコード変更を見てもらい、出てきた指摘を
まとめて、直す価値のあるものを反映します。

**これはバグ探しではなく、片づけです。** すでに動いているコードの質を上げるのが目的で、
重複を取り除き、余計な複雑さをならし、無駄を削り、その場しのぎの修正をきちんとした形に
します。ここで正しさのバグを探しにいってはいけません。それは `requesting-code-review` の
役目です。

**大事な原則:** 観点の狭いレビュー役 4 人は、広く見る 1 人に勝ります。それぞれが、
再利用・品質・効率・修正の深さという 1 つの観点だけを、コードベースまで踏み込んで
深く追います。4 つの観点に注意を散らすことがありません。同時に走るので、待ち時間は
4 回分ではなく 1 回分で済みます。

## 使いどころ {#when-to-use}

利用者が次のように言ったら、この skill を呼びます。

- 「simplify」「変更を整理して」「この変更を簡潔にして」
- 「コードを見て」「直近の変更をレビューして」「変更を片づけて」
- 「/simplify」（Claude Code の習慣のまま言っている場合）

利用者が付け足すかもしれない指定は、そのとおりに扱います。

- **観点の指定:** 「simplify、効率だけ見て」→ 効率のレビュー役だけを走らせます
  （あるいは、まとめるときにその観点を重く見ます）。受け付ける観点は `reuse`、
  `quality`（`simplification` でも可）、`efficiency`、`altitude` です。
- **試すだけ:** 「simplify、でも何も変えないで」「報告だけして」→ 4 人のレビュー役は
  走らせ、指摘を伝えるだけで、何も反映しません。反映する前にひと言確認します。
- **範囲の指定:** 「直前のコミットを simplify」「staged を simplify」「src/foo.py を
  simplify」→ 差分の取り方をそれに合わせます（フェーズ 1 を参照）。

編集のたびに勝手に走らせたり、関係のない作業の締めくくりに付け足したりしないでください。
サブエージェント 4 人分のトークンがかかります。利用者がはっきり求めたときだけ呼びます。

## 進め方 {#the-process}

### フェーズ 1 — 変更を特定する {#phase-1-identify-the-changes}

レビュー対象の差分を取ります。利用者の言い方に応じて、既定では次の順に選びます。

```bash
# 1. Default: uncommitted working-tree changes (tracked files)
git diff

# 2. If that's empty, include staged changes
git diff HEAD

# 3. Scoped variants the user may request:
git diff --staged                 # "staged changes"
git diff HEAD~1                    # "the last commit"
git diff main...HEAD              # "this branch" / "my PR"
git diff -- src/foo.py            # specific file(s)
```

`git diff` も `git diff HEAD` も空で、git リポジトリでないか変更がない場合は、利用者が
名前を挙げたファイルか、このセッションで作った・編集したファイルに切り替えます。それでも
変更されたコードが本当に見つからないなら、その旨を伝えて止まります。片づける対象がありません。

差分は全文を取ります。大きさにも気を配ります。とても大きい場合（変更行が 2000 行を超える
くらい）は、4 人のサブエージェントがそれぞれ全文を抱えるとトークンを食うことを伝え、
先に範囲を絞る（ディレクトリ単位、コミット単位）ことを提案します。

### フェーズ 2 — 4 人のレビュー役を並行して立てる {#phase-2-launch-four-reviewers-in-parallel}

`delegate_task` の**バッチモード**を使い、4 つのタスクを 1 つの `tasks` 配列で渡して
同時に走らせます。この形では 4 人がちょうどよい数で、既定のまま入れた環境なら
`delegation.max_concurrent_children` の枠にも収まります。

**任せられない場合は?** この文脈で `delegate_task` を呼べないとき（自分が末端の
サブエージェントである、委任が無効になっている、枠を使い切っている）でも、レビューを
省いたり観点を落としたりしてはいけません。4 つの観点を自分で順に、同じ探索の水準と同じ
書式でやり切ります。そして最後のまとめで、これは並行ではなく一人での通しレビューだったと
はっきり書き、何が実際に走ったかを利用者に伝えます。

**全員に差分の全文**を渡します（切れ端では駄目です。ファイルをまたぐ問題は、その隙間に
隠れます）。あわせて、コードベース全体を検索できるようリポジトリの絶対パスも渡します。
各レビュー役には `terminal`、`file`、`search` のツール一式を持たせます（`git`、
`read_file`、`search_files` や grep が使えるようにするためです）。

各レビュー役には、次を伝えます。
- 差分だけで推測せず、既存のコードベースを検索して裏づけを取ること。
- **チェスタトンの垣根の考え方を守ること。** 削除の候補として挙げる前に、その行に
  `git blame` をかけ、なぜそこにあるのかを確かめます。元の意図がわからないときは
  `confidence: low` を付け、推測で断じないこと。
- 指摘は、それが招いている損失・確信度・危険度を添えた、決まった形で報告すること。
  ```
  file:line → problem → cost (what's duplicated/wasted/harder to maintain) → suggested fix | confidence: high/medium/low | risk: SAFE/CAREFUL/RISKY
  ```
  **cost** の欄は、その指摘に存在意義を説明させるためのものです。何が損なわれているかを
  言えない指摘は、たいてい些細な口出しです。
  - **SAFE** = ふるまいに影響しないと確かめられたもの（使われていない import、
    コメントアウトされたコード、素通しのラッパー）。これは自動で反映します。
  - **CAREFUL** = 意味を変えずに良くなるもの（ローカル変数の改名、入れ子の三項演算子を
    ならす、ヘルパーの切り出し）。テストで確かめながら反映します。
  - **RISKY** = ふるまいが変わりうる、または外向きの約束を壊すもの（N+1 の作り直し、
    公開 API の改名、メモリの寿命の変更）。人の判断に回し、自動では反映しません。
- 些細な口出しや、見た目だけの入れ替えは飛ばすこと。コードが実質的に良くなるものだけを
  挙げます。

次の 4 つの指示を渡します（利用者が観点を絞った場合は、外れるものを落とします）。

**レビュー役 1 — コードの再利用**
> Review this diff for code that duplicates functionality already in the
> codebase. Search utility modules, shared helpers, and adjacent files
> (use search_files / grep) for existing functions, constants, or patterns
> the new code could call instead of reimplementing. Flag: new functions
> that duplicate existing ones; hand-rolled logic that an existing utility
> already does (manual string/path manipulation, custom env checks, ad-hoc
> type guards, re-implemented parsing). For each, name the existing thing to
> use and where it lives.

**レビュー役 2 — コードの品質**
> Review this diff for quality problems. Look for: redundant state (values
> that duplicate or could be derived from existing state; caches that don't
> need to exist); parameter sprawl (new params bolted on where the function
> should have been restructured); copy-paste-with-variation (near-duplicate
> blocks that should share an abstraction); leaky abstractions (exposing
> internals, breaking an existing encapsulation boundary); stringly-typed
> code (raw strings where a constant/enum/registry already exists — check the
> canonical registries before flagging); deeply nested conditionals (ternary
> chains, 3+-level if/else pyramids — flatten with guard clauses, early
> returns, or a lookup table); AI-generated slop patterns (extra
> comments restating obvious code like `// increment counter` above `count++`;
> unnecessary defensive null-checks on already-validated inputs; `as any`
> casts that bypass the type system; patterns inconsistent with the rest of
> the file). For each, give the concrete refactor.

**レビュー役 3 — 効率**
> Review this diff for efficiency problems. Look for: unnecessary work
> (redundant computation, repeated file reads, duplicate API calls, N+1
> access patterns); missed concurrency (independent ops run sequentially);
> hot-path bloat (heavy/blocking work on startup or per-request paths);
> TOCTOU anti-patterns (existence pre-checks before an op instead of doing
> the op and handling the error); memory issues (unbounded growth, missing
> cleanup, listener/handle leaks; long-lived callbacks or objects built as
> closures that capture the whole enclosing scope — everything captured
> stays alive as long as the object does, so prefer a small class or
> explicit-fields struct that copies only what it needs); overly broad reads
> (loading whole files when a slice would do); silent failures (empty catch
> blocks, ignored error returns, `except: pass`, `.catch(() => {})` with no
> handling, error propagation gaps — these hide bugs and should at minimum
> log before swallowing). For each, give the concrete fix and why it's
> faster or safer.

**レビュー役 4 — 修正の深さ**
> Review this diff for changes implemented at the wrong depth — band-aids
> layered on top of shared infrastructure instead of fixes to the
> infrastructure itself. Signs of a too-shallow fix: a special case added to
> a generic code path to handle one caller (an `if (caller == X)` branch, a
> type check, a magic-value escape hatch); a symptom patched at the call
> site while sibling call sites keep the same flaw; a workaround stacked on
> an earlier workaround; a wrapper added to avoid touching the thing that
> actually needs changing; configuration or flags introduced to route around
> a broken default instead of fixing the default. For each, identify the
> underlying mechanism the change is dodging and describe the deeper fix —
> generalize the shared path, fix the root default, or fix the whole bug
> class — and honestly note when the deeper fix is large enough that it
> should be its own task rather than part of this cleanup. Read the
> surrounding code and `git blame` first: what looks like a band-aid is
> sometimes a deliberate boundary (compat shims, staged migrations,
> vendored-code isolation). Don't flag those.

### フェーズ 3 — まとめて反映する {#phase-3-aggregate-and-apply}

4 人全員の結果を待ちます（バッチモードなら、まとめて返ってきます）。

1. 指摘を 1 つのリストに**まとめ**、重なっている分をならします。2 つの指摘が同じ行、
   または同じ仕組みを指しているなら、1 つに畳みます。
2. **誤検知は落とします。** いちばん文脈を知っているのはあなたです。レビュー役と議論する
   必要はなく、弱い指摘や的外れな指摘は黙って落としてかまいません。
3. **食い違いを裁きます。** レビュー役どうしが対立することがあります（レビュー役 1「既存の
   ユーティリティ X を使え」、レビュー役 3「X は遅いので展開しろ」）。既定の優先順は
   **正しさ > 利用者が挙げた観点 > 読みやすさ・再利用 > わずかな速度**です。
   本当に頻繁に通る経路でないかぎり、読みやすさを損なう速度の「改善」は入れません。
   2 つの案が両立せず、どちらにも理があるときは、触る範囲が小さいほうを選び、もう一方を
   書き添えます。
4. **危険度の順に反映します。**
   - **まず SAFE**（自動で反映）: 使われていない import、コメントアウトされたコード、
     素通しのラッパー、無駄な型アサーション。反映後にテストを走らせます。
   - **次に CAREFUL**（確かめながら、ファイル 1 つずつ反映）: ローカル変数の改名、
     三項演算子をならす、ヘルパーの切り出し、重複の統合。ファイルごとにテストを走らせ、
     壊れたものは戻します。
   - **最後に RISKY**（人の判断に回し、自動では反映しません）: N+1 の作り直し、
     公開 API の変更、並行処理の修正、エラー処理の変更。危険の中身と、テストで
     どこまで守られているかを添えて示します。修正の深さに関する指摘はたいていここに
     来ます。深く直すというのは共通の土台に手を入れることなので、深いほうの案を示し、
     いま進めるか後回しにするかは利用者に決めてもらいます。
   利用者が「試すだけ」を選んだ場合は、3 段階すべてを示して何も反映しません。
5. 壊していないことを**確かめます。** 触ったファイルに対応するテストを走らせ（全部では
   ありません）、リポジトリで使っている lint や型検査もかけ直します。修正がテストを
   壊したら、その修正だけ戻して報告します。
6. 変えたことを**まとめます。** 反映した修正を、レビュー役の観点と危険度で分けた短い
   リストにし、あえて見送った指摘とその理由も添えます。委任せず自分で通した場合は、
   ここでそう書きます。

## つまずきやすいところ {#pitfalls}

- **4 人より増やさないこと。** レビュー役を増やしても、費用と、突き合わせるべき対立が
  増えるだけで、見える範囲は広がりません。この 4 つの観点で足ります。
- **差分は全員に全文を渡すこと。** 差分を分担させると、この仕組みの意味がなくなります。
  ファイルをまたぐ重複や N+1 は、全体が見えて初めて浮かびます。
- **レビュー役は検索するのであって、推測はしません。** 既存のユーティリティを指し示せない
  再利用の指摘（「たぶんヘルパーがあるはず」）は雑音です。`file:line` の裏づけを求め、
  それがない指摘は落とします。
- **反映は書き直しではありません。** これは利用者の直近の変更を片づける作業であって、
  モジュール全体を作り直してよいという意味ではありません。編集は、差分が触れた範囲と、
  修正に最低限必要な周辺にとどめます。修正の深さに関する指摘だけは例外です。正しい修正が
  差分より深いところにあるなら、それは**印を付けて示す**ものであって、片づけのついでに
  共通の仕組みを勝手に作り直してよいわけではありません。
- **バグ探しに流れないこと。** レビュー役が本物の正しさのバグを見つけたら目立つように
  報告します。ただし片づけの修正に混ぜず、「バグを見つけた」という別の項目にします。
  正しさのレビューは別の作業で、確かめ方の基準も違います。
- **プロジェクトの決まりに従うこと。** リポジトリに AGENTS.md / CLAUDE.md / HERMES.md や
  lint の設定があるなら、その内容をレビュー役への指示に織り込み、提案がその家の流儀に
  沿うようにします。逆らってはいけません。
- **大きい差分は文脈を食いつぶします。** 差分が巨大なら、任せる前に範囲を絞ります。
  5000 行の差分を 4 人のサブエージェントがそれぞれ抱えるのは高くつきますし、
  途中で切れることもあります。
- **未使用コード検出ツールを信じすぎないこと。** `knip`、`ts-prune`、`depcheck` は、
  動的に使われている export（文字列での import、リフレクション）も未使用として挙げます。
  消す前に必ずシンボル名を grep してください。ツールの結果がきれいでも、証拠にはなりません。
- **外向きの約束を確かめずに改名しないこと。** export の名前、API のルート、DB の列名、
  設定のキーは約束事です。名前が悪くても、変えれば使う側が壊れます。外向きの約束に
  関わる変更は RISKY として扱い、自動で改名してはいけません。
- **「不要な」エラー処理を消さないこと。** 空の catch や無視されたエラーは、意図してそう
  している場合があります。その場面ではエラーが起こる前提で、害もない、ということです。
  印は付けても、消さないでください。判断は人に委ねます。
- **特別扱いのすべてが、その場しのぎとはかぎりません。** 互換のためのつなぎ、段階を踏んだ
  移行、外部から取り込んだコードを隔てる層は、修正の深さの問題に見えて、意図した設計です。
  印を付ける前に `git blame` と周辺のコメントを読み、意図がはっきりしないときは
  `confidence: low` にします。

## 関連 {#related}

`subagent-driven-development` skill（任意で入れるもの）が入っているなら、そちらは
補い合う場面を受け持ちます。実装の*最中*に、タスクごとに並行レビューを行うものです。
この skill は、*終わったあと*に単独で行う片づけです。コミット前のセキュリティと品質の
関門には `requesting-code-review` を使ってください。あちらがバグ探しで、こちらが片づけです。
