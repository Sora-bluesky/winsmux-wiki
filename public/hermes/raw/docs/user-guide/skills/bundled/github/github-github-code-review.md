---
title: "Github Code Review — PR をレビューする: 差分、gh または REST での行コメント"
description: "PR をレビューする: 差分、gh または REST での行コメント"
upstream_path: user-guide/skills/bundled/github/github-github-code-review.md
upstream_blob: 50418869999859c2ca3cddea37e3003dd0ba3274
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/github/github-github-code-review
---

# Github Code Review {#github-code-review}

PR をレビューします。差分の確認と、gh または REST を使った行コメントができます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/github/github-code-review` |
| バージョン | `1.1.0` |
| 作者 | Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `GitHub`, `Code-Review`, `Pull-Requests`, `Git`, `Quality` |
| 関連 skill | [`github-auth`](/hermes/docs/user-guide/skills/bundled/github/github-github-auth/), [`github-pr-workflow`](/hermes/docs/user-guide/skills/bundled/github/github-github-pr-workflow/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# GitHub のコードレビュー {#github-code-review}

push する前の手元の変更をレビューしたり、GitHub 上で開いている PR をレビューしたりします。この skill のほとんどは素の `git` で動きます。`gh` と `curl` の使い分けが効いてくるのは、PR そのものへのやり取りだけです。

## 事前に必要なもの {#prerequisites}

- GitHub の認証が済んでいること（`github-auth` skill を参照してください）
- git リポジトリの中にいること

### 準備（PR とやり取りする場合） {#setup-for-pr-interactions}

```bash
if command -v gh &>/dev/null && gh auth status &>/dev/null; then
  AUTH="gh"
else
  AUTH="git"
  if [ -z "$GITHUB_TOKEN" ]; then
    if _hermes_env="${HERMES_HOME:-$HOME/.hermes}/.env"; [ -f "$_hermes_env" ] && grep -q "^GITHUB_TOKEN=" "$_hermes_env"; then
      GITHUB_TOKEN=$(grep "^GITHUB_TOKEN=" "$_hermes_env" | head -1 | cut -d= -f2 | tr -d '\n\r')
    elif grep -q "github.com" ~/.git-credentials 2>/dev/null; then
      GITHUB_TOKEN=$(uv run python3 "${HERMES_HOME:-$HOME/.hermes}/skills/github/github-auth/scripts/git-credential-token.py")
    fi
  fi
fi

REMOTE_URL=$(git remote get-url origin)
OWNER_REPO=$(echo "$REMOTE_URL" | sed -E 's|.*github\.com[:/]||; s|\.git$||')
OWNER=$(echo "$OWNER_REPO" | cut -d/ -f1)
REPO=$(echo "$OWNER_REPO" | cut -d/ -f2)
```

---

## 1. 手元の変更をレビューする（push の前に） {#1-reviewing-local-changes-pre-push}

ここは純粋な `git` だけです。どこでも動きますし、API も要りません。

### 差分を取り出す {#get-the-diff}

```bash
# Staged changes (what would be committed)
git diff --staged

# All changes vs main (what a PR would contain)
git diff main...HEAD

# File names only
git diff main...HEAD --name-only

# Stat summary (insertions/deletions per file)
git diff main...HEAD --stat
```

### レビューの進め方 {#review-strategy}

1. **まず全体像をつかみます:**

```bash
git diff main...HEAD --stat
git log main..HEAD --oneline
```

2. **ファイルごとに見ていきます** — 変更されたファイルは `read_file` で前後の文脈ごと読み、差分で変更点を確かめます:

```bash
git diff main...HEAD -- src/auth/login.py
```

3. **よくある問題がないか調べます:**

```bash
# Debug statements, TODOs, console.logs left behind
git diff main...HEAD | grep -n "print(\|console\.log\|TODO\|FIXME\|HACK\|XXX\|debugger"

# Large files accidentally staged
git diff main...HEAD --stat | sort -t'|' -k2 -rn | head -10

# Secrets or credential patterns
git diff main...HEAD | grep -in "password\|secret\|api_key\|token.*=\|private_key"

# Merge conflict markers
git diff main...HEAD | grep -n "<<<<<<\|>>>>>>\|======="
```

4. **整理したフィードバックを提示します。**

### レビュー結果の書き方 {#review-output-format}

手元の変更をレビューしたときは、この形で気づいた点をまとめます。

```
## Code Review Summary

### Critical
- **src/auth.py:45** — SQL injection: user input passed directly to query.
  Suggestion: Use parameterized queries.

### Warnings
- **src/models/user.py:23** — Password stored in plaintext. Use bcrypt or argon2.
- **src/api/routes.py:112** — No rate limiting on login endpoint.

### Suggestions
- **src/utils/helpers.py:8** — Duplicates logic in `src/core/utils.py:34`. Consolidate.
- **tests/test_auth.py** — Missing edge case: expired token test.

### Looks Good
- Clean separation of concerns in the middleware layer
- Good test coverage for the happy path
```

---

## 2. GitHub 上の Pull Request をレビューする {#2-reviewing-a-pull-request-on-github}

### PR の内容を見る {#view-pr-details}

**gh を使う場合:**

```bash
gh pr view 123
gh pr diff 123
gh pr diff 123 --name-only
```

**git + curl を使う場合:**

```bash
PR_NUMBER=123

# Get PR details
curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/pulls/$PR_NUMBER \
  | python3 -c "

pr = json.load(sys.stdin)
print(f\"Title: {pr['title']}\")
print(f\"Author: {pr['user']['login']}\")
print(f\"Branch: {pr['head']['ref']} -> {pr['base']['ref']}\")
print(f\"State: {pr['state']}\")
print(f\"Body:\n{pr['body']}\")"

# List changed files
curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/pulls/$PR_NUMBER/files \
  | python3 -c "

for f in json.load(sys.stdin):
    print(f\"{f['status']:10} +{f['additions']:-4} -{f['deletions']:-4}  {f['filename']}\")"
```

### PR を手元に取り出してじっくり見る {#check-out-pr-locally-for-full-review}

素の `git` だけでできます。`gh` は要りません。

```bash
# Fetch the PR branch and check it out
git fetch origin pull/123/head:pr-123
git checkout pr-123

# Now you can use read_file, search_files, run tests, etc.

# View diff against the base branch
git diff main...pr-123
```

**gh を使う場合（近道）:**

```bash
gh pr checkout 123
```

### PR にコメントする {#leave-comments-on-a-pr}

**PR 全体へのコメント — gh を使う場合:**

```bash
gh pr comment 123 --body "Overall looks good, a few suggestions below."
```

**PR 全体へのコメント — curl を使う場合:**

```bash
curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/issues/$PR_NUMBER/comments \
  -d '{"body": "Overall looks good, a few suggestions below."}'
```

### 行単位のレビューコメントを付ける {#leave-inline-review-comments}

**1件だけ付ける — gh を使う場合（API 経由）:**

```bash
HEAD_SHA=$(gh pr view 123 --json headRefOid --jq '.headRefOid')

gh api repos/$OWNER/$REPO/pulls/123/comments \
  --method POST \
  -f body="This could be simplified with a list comprehension." \
  -f path="src/auth/login.py" \
  -f commit_id="$HEAD_SHA" \
  -f line=45 \
  -f side="RIGHT"
```

**1件だけ付ける — curl を使う場合:**

```bash
# Get the head commit SHA
HEAD_SHA=$(curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/pulls/$PR_NUMBER \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['head']['sha'])")

curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/pulls/$PR_NUMBER/comments \
  -d "{
    \"body\": \"This could be simplified with a list comprehension.\",
    \"path\": \"src/auth/login.py\",
    \"commit_id\": \"$HEAD_SHA\",
    \"line\": 45,
    \"side\": \"RIGHT\"
  }"
```

### 正式なレビューを送る（承認 / 変更依頼） {#submit-a-formal-review-approve-request-changes}

**gh を使う場合:**

```bash
gh pr review 123 --approve --body "LGTM!"
gh pr review 123 --request-changes --body "See inline comments."
gh pr review 123 --comment --body "Some suggestions, nothing blocking."
```

**curl を使う場合 — 複数のコメントをまとめて1回で送ります:**

```bash
HEAD_SHA=$(curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/pulls/$PR_NUMBER \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['head']['sha'])")

curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/pulls/$PR_NUMBER/reviews \
  -d "{
    \"commit_id\": \"$HEAD_SHA\",
    \"event\": \"COMMENT\",
    \"body\": \"Code review from Hermes Agent\",
    \"comments\": [
      {\"path\": \"src/auth.py\", \"line\": 45, \"body\": \"Use parameterized queries to prevent SQL injection.\"},
      {\"path\": \"src/models/user.py\", \"line\": 23, \"body\": \"Hash passwords with bcrypt before storing.\"},
      {\"path\": \"tests/test_auth.py\", \"line\": 1, \"body\": \"Add test for expired token edge case.\"}
    ]
  }"
```

イベントに指定できる値は `"APPROVE"`、`"REQUEST_CHANGES"`、`"COMMENT"` です。

`line` はファイルの *新しい* 側の行番号を指します。削除された行に付けたいときは `"side": "LEFT"` を使います。

---

## 3. レビューの確認項目 {#3-review-checklist}

コードレビューをするときは（手元の変更でも PR でも）、次を順に確かめます。

### 正しさ {#correctness}
- 説明どおりに動くコードになっていますか
- 端の条件（空の入力、null、大きなデータ、同時アクセス）は扱えていますか
- エラーの経路もきちんと処理されていますか

### セキュリティ {#security}
- 秘密の値、資格情報、API キーを直接書いていないこと
- 利用者からの入力を検証していること
- SQL インジェクション、XSS、パストラバーサルがないこと
- 必要な箇所で認証・認可を確認していること

### コードの品質 {#code-quality}
- 名前が分かりやすいこと（変数、関数、クラス）
- 不要な複雑さや、早すぎる抽象化がないこと
- DRY — 切り出すべき重複した処理が残っていないこと
- 関数の役割が1つに絞られていること

### テスト {#testing}
- 新しく通る経路にテストがありますか
- うまくいく場合とエラーの場合の両方を押さえていますか
- テスト自体が読みやすく、直しやすいですか

### 性能 {#performance}
- N+1 クエリや無駄なループがないこと
- 効果のある場所ではキャッシュを使っていること
- 非同期の経路で処理を止める操作をしていないこと

### ドキュメント {#documentation}
- 公開する API に説明があること
- 一見して分かりにくい処理には「なぜ」を説明するコメントがあること
- 振る舞いが変わったなら README も更新されていること

---

## 4. push 前のレビューの流れ {#4-pre-push-review-workflow}

「コードをレビューして」「push する前に確認して」と頼まれたら、次の順で進めます。

1. `git diff main...HEAD --stat` — 変更の範囲を把握します
2. `git diff main...HEAD` — 差分を全部読みます
3. 変更されたファイルごとに、文脈が要るときは `read_file` を使います
4. 上の確認項目を当てはめます
5. 決まった形（Critical / Warnings / Suggestions / Looks Good）で結果をまとめます
6. 重大な問題が見つかったら、push の前に直しましょうかと提案します

---

## 5. PR レビューの流れ（最初から最後まで） {#5-pr-review-workflow-end-to-end}

「PR #N をレビューして」「この PR を見て」と言われたり、PR の URL を渡されたりしたら、次の手順で進めます。

### 手順1: 環境を整える {#step-1-set-up-environment}

```bash
source "${HERMES_HOME:-$HOME/.hermes}/skills/github/github-auth/scripts/gh-env.sh"
# Or run the inline setup block from the top of this skill
```

### 手順2: PR の状況を集める {#step-2-gather-pr-context}

コードを読み始める前に、PR のメタデータ・説明文・変更されたファイルの一覧を取り、範囲をつかみます。

**gh を使う場合:**
```bash
gh pr view 123
gh pr diff 123 --name-only
gh pr checks 123
```

**curl を使う場合:**
```bash
PR_NUMBER=123

# PR details (title, author, description, branch)
curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$GH_OWNER/$GH_REPO/pulls/$PR_NUMBER

# Changed files with line counts
curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$GH_OWNER/$GH_REPO/pulls/$PR_NUMBER/files
```

### 手順3: PR を手元に取り出す {#step-3-check-out-the-pr-locally}

こうすると `read_file` や `search_files` が使えるようになり、テストも走らせられます。

```bash
git fetch origin pull/$PR_NUMBER/head:pr-$PR_NUMBER
git checkout pr-$PR_NUMBER
```

### 手順4: 差分を読んで変更内容を理解する {#step-4-read-the-diff-and-understand-changes}

```bash
# Full diff against the base branch
git diff main...HEAD

# Or file-by-file for large PRs
git diff main...HEAD --name-only
# Then for each file:
git diff main...HEAD -- path/to/file.py
```

変更されたファイルは `read_file` で周辺のコードごと読みます。差分だけでは、まわりのコードを見ないと気づけない問題を見落とすことがあります。

### 手順5: 自動チェックを手元で走らせる（あれば） {#step-5-run-automated-checks-locally-if-applicable}

```bash
# Run tests if there's a test suite
python -m pytest 2>&1 | tail -20
# or: npm test, cargo test, go test ./..., etc.

# Run linter if configured
ruff check . 2>&1 | head -30
# or: eslint, clippy, etc.
```

### 手順6: 確認項目（第3節）を当てはめる {#step-6-apply-the-review-checklist-section-3}

正しさ、セキュリティ、コードの品質、テスト、性能、ドキュメントの順に見ていきます。

### 手順7: レビューを GitHub に投稿する {#step-7-post-the-review-to-github}

気づいた点をまとめ、行コメント付きの正式なレビューとして送ります。

**gh を使う場合:**
```bash
# If no issues — approve
gh pr review $PR_NUMBER --approve --body "Reviewed by Hermes Agent. Code looks clean — good test coverage, no security concerns."

# If issues found — request changes with inline comments
gh pr review $PR_NUMBER --request-changes --body "Found a few issues — see inline comments."
```

**curl を使う場合 — 複数の行コメントを1回のレビューにまとめます:**
```bash
HEAD_SHA=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$GH_OWNER/$GH_REPO/pulls/$PR_NUMBER \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['head']['sha'])")

# Build the review JSON — event is APPROVE, REQUEST_CHANGES, or COMMENT
curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$GH_OWNER/$GH_REPO/pulls/$PR_NUMBER/reviews \
  -d "{
    \"commit_id\": \"$HEAD_SHA\",
    \"event\": \"REQUEST_CHANGES\",
    \"body\": \"## Hermes Agent Review\n\nFound 2 issues, 1 suggestion. See inline comments.\",
    \"comments\": [
      {\"path\": \"src/auth.py\", \"line\": 45, \"body\": \"🔴 **Critical:** User input passed directly to SQL query — use parameterized queries.\"},
      {\"path\": \"src/models.py\", \"line\": 23, \"body\": \"⚠️ **Warning:** Password stored without hashing.\"},
      {\"path\": \"src/utils.py\", \"line\": 8, \"body\": \"💡 **Suggestion:** This duplicates logic in core/utils.py:34.\"}
    ]
  }"
```

### 手順8: まとめのコメントも投稿する {#step-8-also-post-a-summary-comment}

行コメントに加えて、全体をまとめたコメントも残します。そうすると PR の作成者が一目で状況をつかめます。書き方は `references/review-output-template.md` のレビュー結果の形に従います。

**gh を使う場合:**
```bash
gh pr comment $PR_NUMBER --body "$(cat <<'EOF'
## Code Review Summary

**Verdict: Changes Requested** (2 issues, 1 suggestion)

### 🔴 Critical
- **src/auth.py:45** — SQL injection vulnerability

### ⚠️ Warnings
- **src/models.py:23** — Plaintext password storage

### 💡 Suggestions
- **src/utils.py:8** — Duplicated logic, consider consolidating

### ✅ Looks Good
- Clean API design
- Good error handling in the middleware layer

---
*Reviewed by Hermes Agent*
EOF
)"
```

### 手順9: 後片付け {#step-9-clean-up}

```bash
git checkout main
git branch -D pr-$PR_NUMBER
```

### 判断: 承認 / 変更依頼 / コメントのどれにするか {#decision-approve-vs-request-changes-vs-comment}

- **承認** — 重大な問題も警告もなく、細かい提案だけ、または何も問題がない場合
- **変更依頼** — マージ前に直すべき重大な問題や警告がある場合
- **コメント** — 気づいた点や提案はあるが、止めるほどではない場合（迷ったときや、下書きの PR にも使います）
