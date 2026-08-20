---
title: "Plan — .hermes/plans/ に markdown の計画書を書きます。実行はしません"
description: ".hermes/plans/ に markdown の計画書を書きます。実行はしません"
upstream_path: user-guide/skills/bundled/software-development/software-development-plan.md
upstream_blob: 2368cfc6d25940fafc8bae39adab7c42849def6e
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/software-development/software-development-plan
---

# Plan {#plan}

.hermes/plans/ に markdown の計画書を書きます。実行はしません。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/software-development/plan` |
| バージョン | `2.0.0` |
| 作者 | Hermes Agent（文章の作法は obra/superpowers から取り入れています） |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `planning`, `plan-mode`, `implementation`, `workflow`, `design`, `documentation` |
| 関連 skill | [`subagent-driven-development`](/hermes/docs/user-guide/skills/optional/software-development/software-development-subagent-driven-development/), [`test-driven-development`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-test-driven-development/), [`requesting-code-review`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-requesting-code-review/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# 計画モード {#plan-mode}

実行ではなく計画を求められたときに、この skill を使います。

## 基本のふるまい {#core-behavior}

このターンでは、計画を立てることだけを行います。

- コードは実装しません。
- 計画の markdown ファイル以外、プロジェクトのファイルは編集しません。
- 状態を変えるターミナルコマンドの実行、コミット、プッシュ、外部への操作は行いません。
- 必要に応じて、読み取りだけのコマンドやツールでリポジトリなどの状況を調べてかまいません。
- 成果物は、作業中のワークスペース内の `.hermes/plans/` に保存した markdown の計画書です。

## 書き出すもの {#output-requirements}

具体的で、そのまま動ける markdown の計画書を書きます。

関係する範囲で、次の項目を入れます。
- 目的
- 現状と前提
- 提案する進め方
- 手順を追った計画
- 変更しそうなファイル
- テストと検証
- リスク、トレードオフ、未確定の論点

コードに関わる作業なら、正確なファイルパス、対象になりそうなテスト、検証の手順を入れます。

## 保存先 {#save-location}

`write_file` を使い、次の場所に計画書を保存します。
- `.hermes/plans/YYYY-MM-DD_HHMMSS-<slug>.md`

このパスは、作業中のディレクトリ（バックエンドのワークスペース）からの相対パスとして扱います。Hermes のファイル操作ツールはバックエンドを意識して動くので、この相対パスのままにしておけば、local、docker、ssh、modal、daytona のどのバックエンドでも計画書がワークスペースと一緒に残ります。

実行環境から保存先が指定されている場合は、そのパスをそのまま使います。
指定がなければ、`.hermes/plans/` の下に日時入りのファイル名を自分で決めて作ります。

## 対話のしかた {#interaction-style}

- 依頼の内容がはっきりしていれば、そのまま計画書を書きます。
- `/plan` だけで指示が添えられていない場合は、そこまでの会話の流れから作業内容を読み取ります。
- 本当に情報が足りないときは、当て推量で進めず、短く一つだけ確認します。
- 保存し終えたら、何を計画したかと保存先のパスを簡潔に伝えます。

---

# よい計画書の書き方 {#writing-the-plan-well}

ここから先は、*よい*実装計画を書くための作法です。上で作る markdown ファイルの中身にあたります。

## 概要 {#overview}

実装する人はこのコードベースの前提知識がまったくなく、センスも当てにならない、という想定で計画書を書きます。必要なものはすべて書き残します。どのファイルに触るか、コードの全文、テストの実行コマンド、確認すべきドキュメント、動作の確かめ方。作業は小さく刻みます。DRY、YAGNI、TDD、こまめなコミット。

実装する人は開発者としては優秀だが、道具立てや対象領域についてはほとんど知らない、と考えてください。テストの設計にもあまり詳しくないものとします。

**大事な原則:** よい計画書は、実装のしかたを自明にします。誰かが推測しなければならないなら、その計画書はまだ不完全です。

## 実装計画をきちんと書くと効く場面 {#when-a-full-implementation-plan-helps}

**次の前には必ず書きます:**
- 手順の多い機能を実装するとき
- 複雑な要件を分解するとき
- subagent-driven-development でサブエージェントに任せるとき

**次の理由では省きません:**
- 簡単そうな機能に見える（思い込みがバグを生みます）
- 自分で実装するつもりだ（あとの自分に案内が要ります）
- 一人で作業している（記録は残す価値があります）

## ひと口サイズの粒度 {#bite-sized-task-granularity}

**1 タスク = 集中して 2〜5 分の作業。**

各ステップは 1 つの動作だけにします。
- 「失敗するテストを書く」— 1 ステップ
- 「実行して、確かに失敗することを確かめる」— 1 ステップ
- 「テストを通す最小限のコードを書く」— 1 ステップ
- 「テストを実行して、通ることを確かめる」— 1 ステップ
- 「コミットする」— 1 ステップ

**大きすぎる例:**
```markdown
### Task 1: Build authentication system
[50 lines of code across 5 files]
```

**ちょうどよい大きさ:**
```markdown
### Task 1: Create User model with email field
[10 lines, 1 file]

### Task 2: Add password hash field to User
[8 lines, 1 file]

### Task 3: Create password hashing utility
[15 lines, 1 file]
```

## 計画書の構成 {#plan-document-structure}

### 冒頭（必須） {#header-required}

すべての計画書は、次の形で始めます。

```markdown
# [Feature Name] Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

---
```

### タスクの書式 {#task-structure}

各タスクは、次の形にそろえます。

````markdown
### Task N: [Descriptive Name]

**Objective:** What this task accomplishes (one sentence)

**Files:**
- Create: `exact/path/to/new_file.py`
- Modify: `exact/path/to/existing.py:45-67` (line numbers if known)
- Test: `tests/path/to/test_file.py`

**Step 1: Write failing test**

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

**Step 2: Run test to verify failure**

Run: `pytest tests/path/test.py::test_specific_behavior -v`
Expected: FAIL — "function not defined"

**Step 3: Write minimal implementation**

```python
def function(input):
    return expected
```

**Step 4: Run test to verify pass**

Run: `pytest tests/path/test.py::test_specific_behavior -v`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
```
````

## Writing Process

### Step 1: Understand Requirements

Read and understand:
- Feature requirements
- Design documents or user description
- Acceptance criteria
- Constraints

### Step 2: Explore the Codebase

Use Hermes tools to understand the project:

```python
# Understand project structure
search_files("*.py", target="files", path="src/")

# Look at similar features
search_files("similar_pattern", path="src/", file_glob="*.py")

# Check existing tests
search_files("*.py", target="files", path="tests/")

# Read key files
read_file("src/app.py")
```

### ステップ 3: 進め方を決める {#step-3-design-approach}

決めること。
- どの設計パターンにするか
- ファイルをどう分けるか
- 必要になる依存関係
- テストの方針

### ステップ 4: タスクを書く {#step-4-write-tasks}

次の順にタスクを並べます。
1. 下ごしらえ、土台づくり
2. 中心となる機能（それぞれ TDD で）
3. 例外的なケース
4. 結合
5. 後片づけと記録

### ステップ 5: 細部まで書き込む {#step-5-add-complete-details}

各タスクに、次を入れます。
- **正確なファイルパス**（「設定ファイル」ではなく `src/config/settings.py`）
- **省略のないコード例**（「バリデーションを足す」ではなく、実際のコードそのもの）
- **正確なコマンド**と、期待される出力
- そのタスクが本当に動いたことを示す**確認手順**

### ステップ 6: 計画書を見直す {#step-6-review-the-plan}

確かめること。
- [ ] タスクが順を追っていて、筋が通っている
- [ ] 各タスクがひと口サイズ（2〜5 分）になっている
- [ ] ファイルパスが正確である
- [ ] コード例がそのまま貼り付けられる形になっている
- [ ] コマンドが正確で、期待される出力が書いてある
- [ ] 抜けている前提がない
- [ ] DRY、YAGNI、TDD の考え方が行き渡っている

## 原則 {#principles}

### DRY（繰り返さない） {#dry-dont-repeat-yourself}

**よくない例:** 同じバリデーションを 3 か所にコピーする
**よい例:** バリデーションを関数にまとめ、どこからもそれを呼ぶ

### YAGNI（今要らないものは作らない） {#yagni-you-arent-gonna-need-it}

**よくない例:** 将来の要件に備えて「柔軟さ」を足しておく
**よい例:** いま必要なものだけを実装する

```python
# Bad — YAGNI violation
class User:
    def __init__(self, name, email):
        self.name = name
        self.email = email
        self.preferences = {}  # Not needed yet!
        self.metadata = {}     # Not needed yet!

# Good — YAGNI
class User:
    def __init__(self, name, email):
        self.name = name
        self.email = email
```

### TDD（テスト駆動開発） {#tdd-test-driven-development}

コードを生むタスクには、TDD のひと回りをすべて入れます。
1. 失敗するテストを書く
2. 実行して、失敗することを確かめる
3. 最小限のコードを書く
4. 実行して、通ることを確かめる

詳しくは `test-driven-development` skill を見てください。

### こまめなコミット {#frequent-commits}

タスクが 1 つ終わるたびにコミットします。
```bash
git add [files]
git commit -m "type: description"
```

## よくある失敗 {#common-mistakes}

### あいまいなタスク {#vague-tasks}

**よくない例:** 「認証を追加する」
**よい例:** 「email と password_hash を持つ User モデルを作る」

### コードが途中までしかない {#incomplete-code}

**よくない例:** 「Step 1: バリデーション関数を足す」
**よい例:** 「Step 1: バリデーション関数を足す」に続けて、その関数の全文を書く

### 確認手順がない {#missing-verification}

**よくない例:** 「Step 3: 動くか試す」
**よい例:** 「Step 3: `pytest tests/test_auth.py -v` を実行する。期待される結果: 3 passed」

### ファイルパスがない {#missing-file-paths}

**よくない例:** 「モデルのファイルを作る」
**よい例:** 「Create: `src/models/user.py`」

## 実行への引き継ぎ {#execution-handoff}

計画書を保存したら、実行のしかたを提案します。

**「計画がまとまり、保存しました。subagent-driven-development で実行できます。タスクごとに新しいサブエージェントを立て、2 段階のレビュー（まず仕様どおりか、次にコードの質）を通します。進めてよいですか?」**

実行するときは `subagent-driven-development` skill を使います。
- タスクごとに、文脈をすべて渡した新しい `delegate_task` を立てる
- 各タスクのあとに、仕様どおりかのレビュー
- それが通ったら、コードの質のレビュー
- 両方のレビューが通ってから次へ進む

## 覚えておくこと {#remember}

```
Bite-sized tasks (2-5 min each)
Exact file paths
Complete code (copy-pasteable)
Exact commands with expected output
Verification steps
DRY, YAGNI, TDD
Frequent commits
```

**よい計画書は、実装のしかたを自明にします。**
