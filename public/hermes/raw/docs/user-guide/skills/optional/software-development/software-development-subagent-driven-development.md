---
title: "Subagent Driven Development — delegate_task のサブエージェントで計画を実行する（2 段階レビュー）"
description: "delegate_task のサブエージェントで計画を実行する（2 段階レビュー）"
upstream_path: user-guide/skills/optional/software-development/software-development-subagent-driven-development.md
upstream_blob: 5e42f93712faf4aebf07e22df6e93b1cb11e6289
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/software-development/software-development-subagent-driven-development
---

# Subagent Driven Development {#subagent-driven-development}

delegate_task のサブエージェントで計画を実行します（2 段階レビュー）。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加で入れるもの — `hermes skills install official/software-development/subagent-driven-development` で導入します |
| パス | `optional-skills/software-development\subagent-driven-development` |
| バージョン | `1.1.0` |
| 作者 | Hermes Agent (adapted from obra/superpowers) |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `delegation`, `subagent`, `implementation`, `workflow`, `parallel` |
| 関連 skill | [`requesting-code-review`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-requesting-code-review/), [`test-driven-development`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-test-driven-development/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# サブエージェント主導の開発 {#subagent-driven-development}

## 概要 {#overview}

作業ごとに新しいサブエージェントを立て、2 段階のレビューを挟みながら、実装の計画を進めていきます。

**基本の考え方:** 作業ごとに新しいサブエージェント + 2 段階のレビュー（まず仕様、次に品質）= 高い品質と、速い反復。

## こんなときに使います {#when-to-use}

次のような場面で使います。
- 実装の計画がある（`plan` skill で作ったもの、あるいはユーザーの要望）
- 作業どうしがおおむね独立している
- 品質と仕様どおりであることが大事
- 作業と作業のあいだに、自動でレビューを入れたい

**手作業で進める場合との違い:**
- 作業ごとに文脈がまっさらになる（積み上がった状態に引きずられません）
- 自動のレビュー工程が、問題を早めに拾ってくれる
- どの作業にも同じ基準の確認が入る
- サブエージェントは着手前に質問できる

## 進め方 {#the-process}

### 1. 計画を読んで分解する {#1-read-and-parse-plan}

計画のファイルを読みます。すべての作業を、本文と前提ごと最初にまとめて取り出してください。そして、やることの一覧を作ります。

```python
# Read the plan
read_file("docs/plans/feature-plan.md")

# Create todo list with all tasks
todo([
    {"id": "task-1", "content": "Create User model with email field", "status": "pending"},
    {"id": "task-2", "content": "Add password hashing utility", "status": "pending"},
    {"id": "task-3", "content": "Create login endpoint", "status": "pending"},
])
```

**大事な点:** 計画を読むのは 1 回だけです。そこですべてを取り出します。サブエージェントに計画ファイルを読ませないでください。作業の本文をそのまま渡します。

### 2. 作業ごとの流れ {#2-per-task-workflow}

計画にあるすべての作業について、次を繰り返します。

#### ステップ 1: 実装役のサブエージェントを立てる {#step-1-dispatch-implementer-subagent}

`delegate_task` に、前提を漏らさず渡します。

```python
delegate_task(
    goal="Implement Task 1: Create User model with email and password_hash fields",
    context="""
    TASK FROM PLAN:
    - Create: src/models/user.py
    - Add User class with email (str) and password_hash (str) fields
    - Use bcrypt for password hashing
    - Include __repr__ for debugging

    FOLLOW TDD:
    1. Write failing test in tests/models/test_user.py
    2. Run: pytest tests/models/test_user.py -v (verify FAIL)
    3. Write minimal implementation
    4. Run: pytest tests/models/test_user.py -v (verify PASS)
    5. Run: pytest tests/ -q (verify no regressions)
    6. Commit: git add -A && git commit -m "feat: add User model with password hashing"

    PROJECT CONTEXT:
    - Python 3.11, Flask app in src/app.py
    - Existing models in src/models/
    - Tests use pytest, run from project root
    - bcrypt already in requirements.txt
    """,
    toolsets=['terminal', 'file']
)
```

#### ステップ 2: 仕様どおりかを見る役を立てる {#step-2-dispatch-spec-compliance-reviewer}

実装役が終わったら、もとの仕様と突き合わせます。

```python
delegate_task(
    goal="Review if implementation matches the spec from the plan",
    context="""
    ORIGINAL TASK SPEC:
    - Create src/models/user.py with User class
    - Fields: email (str), password_hash (str)
    - Use bcrypt for password hashing
    - Include __repr__

    CHECK:
    - [ ] All requirements from spec implemented?
    - [ ] File paths match spec?
    - [ ] Function signatures match spec?
    - [ ] Behavior matches expected?
    - [ ] Nothing extra added (no scope creep)?

    OUTPUT: PASS or list of specific spec gaps to fix.
    """,
    toolsets=['file']
)
```

**仕様との差が見つかったら:** 埋めてから、仕様の確認をやり直します。仕様どおりになるまで、先へ進みません。

#### ステップ 3: コードの品質を見る役を立てる {#step-3-dispatch-code-quality-reviewer}

仕様の確認が通ったあとで行います。

```python
delegate_task(
    goal="Review code quality for Task 1 implementation",
    context="""
    FILES TO REVIEW:
    - src/models/user.py
    - tests/models/test_user.py

    CHECK:
    - [ ] Follows project conventions and style?
    - [ ] Proper error handling?
    - [ ] Clear variable/function names?
    - [ ] Adequate test coverage?
    - [ ] No obvious bugs or missed edge cases?
    - [ ] No security issues?

    OUTPUT FORMAT:
    - Critical Issues: [must fix before proceeding]
    - Important Issues: [should fix]
    - Minor Issues: [optional]
    - Verdict: APPROVED or REQUEST_CHANGES
    """,
    toolsets=['file']
)
```

**品質の問題が見つかったら:** 直して、もう一度見てもらいます。承認が出るまで、先へ進みません。

#### ステップ 4: 完了にする {#step-4-mark-complete}

```python
todo([{"id": "task-1", "content": "Create User model with email field", "status": "completed"}], merge=True)
```

### 3. 最後のレビュー {#3-final-review}

すべての作業が終わったら、全体をまとめて見る役を立てます。

```python
delegate_task(
    goal="Review the entire implementation for consistency and integration issues",
    context="""
    All tasks from the plan are complete. Review the full implementation:
    - Do all components work together?
    - Any inconsistencies between tasks?
    - All tests passing?
    - Ready for merge?
    """,
    toolsets=['terminal', 'file']
)
```

### 4. 確認してコミットする {#4-verify-and-commit}

```bash
# Run full test suite
pytest tests/ -q

# Review all changes
git diff --stat

# Final commit if needed
git add -A && git commit -m "feat: complete [feature name] implementation"
```

## 作業の粒度 {#task-granularity}

**ひとつの作業は、集中して 2〜5 分で終わる大きさにします。**

**大きすぎる例:**
- 「ユーザー認証の仕組みを実装する」

**ちょうどよい例:**
- 「email と password の項目を持つ User モデルを作る」
- 「パスワードをハッシュ化する関数を足す」
- 「ログインの端点を作る」
- 「JWT トークンの発行を足す」
- 「登録の端点を作る」

## 危ない兆候 — やってはいけないこと {#red-flags-never-do-these}

- 計画がないまま実装を始める
- レビューを飛ばす（仕様の確認も、品質の確認も）
- 重大・重要な問題を残したまま進める
- 同じファイルに触る作業に、実装役を何人も同時に立てる
- サブエージェントに計画ファイルを読ませる（本文をそのまま渡してください）
- 前後関係の説明を省く（その作業がどこに位置するのかを、サブエージェントは知る必要があります）
- サブエージェントの質問を放っておく（先へ進ませる前に答えてください）
- 仕様どおりかどうかを「まあいいか」で済ませる
- レビューの繰り返しを飛ばす（指摘が出た → 実装役が直す → もう一度見てもらう）
- 実装役の自己点検を、本当のレビューの代わりにする（どちらも必要です）
- **仕様の確認が PASS になる前に、品質のレビューを始める**（順番が逆です）
- どちらかのレビューに未解決の指摘が残ったまま、次の作業に移る

## つまずいたときは {#handling-issues}

### サブエージェントから質問が来たら {#if-subagent-asks-questions}

- はっきりと、余さず答えます
- 必要なら前提を補います
- 実装を急がせないでください

### レビュー役が問題を見つけたら {#if-reviewer-finds-issues}

- 実装役（または新しいサブエージェント）が直します
- レビュー役がもう一度見ます
- 承認が出るまで繰り返します
- 見直しを飛ばさないでください

### サブエージェントが作業に失敗したら {#if-subagent-fails-a-task}

- 何がまずかったかを具体的に伝えて、修正役のサブエージェントを新しく立てます
- 取りまとめ側のセッションで手直ししようとしないでください（文脈が濁ります）

## 効率の話 {#efficiency-notes}

**作業ごとに新しいサブエージェントを立てる理由:**
- 積み上がった状態で文脈が濁るのを防げます
- サブエージェントごとに、きれいで絞られた前提が渡ります
- 前の作業のコードや考え方に引きずられません

**2 段階でレビューする理由:**
- 仕様のレビューが、作りすぎ・作り足りないを早めに拾います
- 品質のレビューが、きちんと作られているかを担保します
- 問題が作業をまたいで膨らむ前に捕まえられます

**費用との兼ね合い:**
- サブエージェントの呼び出しは増えます（作業ごとに実装役 1 人 + レビュー役 2 人）
- そのぶん問題を早く拾えます（あとで絡まった不具合を追うより安く済みます）

## ほかの skill との組み合わせ {#integration-with-other-skills}

### plan と {#with-plan}

この skill は、`plan` skill が作った計画を実行するものです。
1. ユーザーの要望 → plan → 実装の計画
2. 実装の計画 → subagent-driven-development → 動くコード

### test-driven-development と {#with-test-driven-development}

実装役のサブエージェントには TDD で進めてもらいます。
1. まず失敗するテストを書く
2. 最小限のコードを書く
3. テストが通ることを確かめる
4. コミットする

実装役に渡す前提には、毎回 TDD の手順を入れてください。

### requesting-code-review と {#with-requesting-code-review}

この 2 段階のレビューが、そのままコードレビューにあたります。最後にまとめて見るときは、requesting-code-review skill の観点を使ってください。

### systematic-debugging と {#with-systematic-debugging}

実装の途中でサブエージェントが不具合に当たったら、次のようにします。
1. systematic-debugging の手順に従う
2. 直す前に根本原因を突き止める
3. 再発防止のテストを書く
4. 実装に戻る

## 進め方の例 {#example-workflow}

```
[Read plan: docs/plans/auth-feature.md]
[Create todo list with 5 tasks]

--- Task 1: Create User model ---
[Dispatch implementer subagent]
  Implementer: "Should email be unique?"
  You: "Yes, email must be unique"
  Implementer: Implemented, 3/3 tests passing, committed.

[Dispatch spec reviewer]
  Spec reviewer: ✅ PASS — all requirements met

[Dispatch quality reviewer]
  Quality reviewer: ✅ APPROVED — clean code, good tests

[Mark Task 1 complete]

--- Task 2: Password hashing ---
[Dispatch implementer subagent]
  Implementer: No questions, implemented, 5/5 tests passing.

[Dispatch spec reviewer]
  Spec reviewer: ❌ Missing: password strength validation (spec says "min 8 chars")

[Implementer fixes]
  Implementer: Added validation, 7/7 tests passing.

[Dispatch spec reviewer again]
  Spec reviewer: ✅ PASS

[Dispatch quality reviewer]
  Quality reviewer: Important: Magic number 8, extract to constant
  Implementer: Extracted MIN_PASSWORD_LENGTH constant
  Quality reviewer: ✅ APPROVED

[Mark Task 2 complete]

... (continue for all tasks)

[After all tasks: dispatch final integration reviewer]
[Run full test suite: all passing]
[Done!]
```

## 覚えておくこと {#remember}

```
Fresh subagent per task
Two-stage review every time
Spec compliance FIRST
Code quality SECOND
Never skip reviews
Catch issues early
```

**品質は偶然の産物ではありません。手順を守った結果として生まれます。**

## さらに読むもの（必要なときに読み込みます） {#further-reading-load-when-relevant}

取りまとめの中で文脈をかなり使う、レビューの往復が長い、確認の関門が複雑、といった場合は、その分野の資料を読み込んでください。

- **`references/context-budget-discipline.md`** — 文脈の劣化を 4 段階（PEAK / GOOD / DEGRADING / POOR）でとらえるモデル、文脈の広さに応じた読み込みの深さの決め方、そして静かに劣化していくときの前兆。文脈をはっきり多く使うと分かっている場面（工程の多い計画、たくさんのサブエージェント、大きな成果物）で読み込みます。
- **`references/gates-taxonomy.md`** — 関門の 4 つの型（事前確認、差し戻し、上申、中止）を、ふるまい・立て直し方・例つきでまとめたもの。確認の関門がある流れを設計・点検するときに読み込み、この言葉をそのまま使って、関門ごとに入口・失敗したときのふるまい・再開の条件を決めてください。

どちらも gsd-build/get-shit-done（MIT © 2025 Lex Christopherson）をもとにしています。
