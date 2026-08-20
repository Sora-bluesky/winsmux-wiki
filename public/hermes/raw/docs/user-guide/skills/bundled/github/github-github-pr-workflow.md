---
title: "Github Pr Workflow — GitHub の PR の一生: ブランチ、コミット、作成、CI、マージ"
description: "GitHub の PR の一生: ブランチ、コミット、作成、CI、マージ"
upstream_path: user-guide/skills/bundled/github/github-github-pr-workflow.md
upstream_blob: 0536a0dd6a57cf0a35f4b3e4f85169908c0fa2fc
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/github/github-github-pr-workflow
---

# Github Pr Workflow {#github-pr-workflow}

GitHub の PR の一生をたどります。ブランチ、コミット、作成、CI、マージまでです。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/github/github-pr-workflow` |
| バージョン | `1.1.0` |
| 作者 | Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `GitHub`, `Pull-Requests`, `CI/CD`, `Git`, `Automation`, `Merge` |
| 関連 skill | [`github-auth`](/hermes/docs/user-guide/skills/bundled/github/github-github-auth/), [`github-code-review`](/hermes/docs/user-guide/skills/bundled/github/github-github-code-review/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# GitHub の Pull Request の進め方 {#github-pull-request-workflow}

PR の一生をひととおり管理するための手引きです。どの節も `gh` を使うやり方を先に示し、そのあとに `gh` が入っていない端末向けの `git` + `curl` のやり方を示します。

## 事前に必要なもの {#prerequisites}

- GitHub の認証が済んでいること（`github-auth` skill を参照してください）
- GitHub のリモートを持つ git リポジトリの中にいること

### 認証方法をすばやく見分ける {#quick-auth-detection}

```bash
# Determine which method to use throughout this workflow
if command -v gh &>/dev/null && gh auth status &>/dev/null; then
  AUTH="gh"
else
  AUTH="git"
  # Ensure we have a token for API calls
  if [ -z "$GITHUB_TOKEN" ]; then
    if _hermes_env="${HERMES_HOME:-$HOME/.hermes}/.env"; [ -f "$_hermes_env" ] && grep -q "^GITHUB_TOKEN=" "$_hermes_env"; then
      GITHUB_TOKEN=$(grep "^GITHUB_TOKEN=" "$_hermes_env" | head -1 | cut -d= -f2 | tr -d '\n\r')
    elif grep -q "github.com" ~/.git-credentials 2>/dev/null; then
      GITHUB_TOKEN=$(uv run python3 "${HERMES_HOME:-$HOME/.hermes}/skills/github/github-auth/scripts/git-credential-token.py")
    fi
  fi
fi
echo "Using: $AUTH"
```

### git のリモートから owner/repo を取り出す {#extracting-ownerrepo-from-the-git-remote}

`curl` を使うコマンドの多くは `owner/repo` を必要とします。git のリモートから取り出します。

```bash
# Works for both HTTPS and SSH remote URLs
REMOTE_URL=$(git remote get-url origin)
OWNER_REPO=$(echo "$REMOTE_URL" | sed -E 's|.*github\.com[:/]||; s|\.git$||')
OWNER=$(echo "$OWNER_REPO" | cut -d/ -f1)
REPO=$(echo "$OWNER_REPO" | cut -d/ -f2)
echo "Owner: $OWNER, Repo: $REPO"
```

---

## 1. ブランチを作る {#1-branch-creation}

ここは純粋な `git` だけで、どちらの方法でも同じです。

```bash
# Make sure you're up to date
git fetch origin
git checkout main && git pull origin main

# Create and switch to a new branch
git checkout -b feat/add-user-authentication
```

ブランチ名の付け方:
- `feat/description` — 新しい機能
- `fix/description` — バグ修正
- `refactor/description` — コードの整理
- `docs/description` — ドキュメント
- `ci/description` — CI/CD の変更

## 2. コミットする {#2-making-commits}

エージェントのファイル操作ツール（`write_file`、`patch`）で変更を加えてから、コミットします。

```bash
# Stage specific files
git add src/auth.py src/models/user.py tests/test_auth.py

# Commit with a conventional commit message
git commit -m "feat: add JWT-based user authentication

- Add login/register endpoints
- Add User model with password hashing
- Add auth middleware for protected routes
- Add unit tests for auth flow"
```

コミットメッセージの形（Conventional Commits）:
```
type(scope): short description

Longer explanation if needed. Wrap at 72 characters.
```

種類: `feat`, `fix`, `refactor`, `docs`, `test`, `ci`, `chore`, `perf`

## 3. push して PR を作る {#3-pushing-and-creating-a-pr}

### ブランチを push する（どちらの方法でも同じです） {#push-the-branch-same-either-way}

```bash
git push -u origin HEAD
```

### PR を作る {#create-the-pr}

**gh を使う場合:**

```bash
gh pr create \
  --title "feat: add JWT-based user authentication" \
  --body "## Summary
- Adds login and register API endpoints
- JWT token generation and validation

## Test Plan
- [ ] Unit tests pass

Closes #42"
```

指定できるもの: `--draft`、`--reviewer user1,user2`、`--label "enhancement"`、`--base develop`

**git + curl を使う場合:**

```bash
BRANCH=$(git branch --show-current)

curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/$OWNER/$REPO/pulls \
  -d "{
    \"title\": \"feat: add JWT-based user authentication\",
    \"body\": \"## Summary\nAdds login and register API endpoints.\n\nCloses #42\",
    \"head\": \"$BRANCH\",
    \"base\": \"main\"
  }"
```

返ってくる JSON には PR の `number` が含まれます。あとのコマンドで使うので控えておきます。

下書きとして作りたいときは、JSON の本文に `"draft": true` を足します。

## 4. CI の状態を見る {#4-monitoring-ci-status}

### CI の状態を確かめる {#check-ci-status}

**gh を使う場合:**

```bash
# One-shot check
gh pr checks

# Watch until all checks finish (polls every 10s)
gh pr checks --watch
```

**git + curl を使う場合:**

```bash
# Get the latest commit SHA on the current branch
SHA=$(git rev-parse HEAD)

# Query the combined status
curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/commits/$SHA/status \
  | python3 -c "

data = json.load(sys.stdin)
print(f\"Overall: {data['state']}\")
for s in data.get('statuses', []):
    print(f\"  {s['context']}: {s['state']} - {s.get('description', '')}\")"

# Also check GitHub Actions check runs (separate endpoint)
curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/commits/$SHA/check-runs \
  | python3 -c "

data = json.load(sys.stdin)
for cr in data.get('check_runs', []):
    print(f\"  {cr['name']}: {cr['status']} / {cr['conclusion'] or 'pending'}\")"
```

### 終わるまで繰り返し確かめる（git + curl） {#poll-until-complete-git-curl}

```bash
# Simple polling loop — check every 30 seconds, up to 10 minutes
SHA=$(git rev-parse HEAD)
for i in $(seq 1 20); do
  STATUS=$(curl -s \
    -H "Authorization: token $GITHUB_TOKEN" \
    https://api.github.com/repos/$OWNER/$REPO/commits/$SHA/status \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['state'])")
  echo "Check $i: $STATUS"
  if [ "$STATUS" = "success" ] || [ "$STATUS" = "failure" ] || [ "$STATUS" = "error" ]; then
    break
  fi
  sleep 30
done
```

## 5. CI の失敗を自動で直す {#5-auto-fixing-ci-failures}

CI が失敗したら、原因を調べて直します。この繰り返しは、どちらの認証方法でも同じように使えます。

### 手順1: 失敗の内容を取り出す {#step-1-get-failure-details}

**gh を使う場合:**

```bash
# List recent workflow runs on this branch
gh run list --branch $(git branch --show-current) --limit 5

# View failed logs
gh run view <RUN_ID> --log-failed
```

**git + curl を使う場合:**

```bash
BRANCH=$(git branch --show-current)

# List workflow runs on this branch
curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/$OWNER/$REPO/actions/runs?branch=$BRANCH&per_page=5" \
  | python3 -c "

runs = json.load(sys.stdin)['workflow_runs']
for r in runs:
    print(f\"Run {r['id']}: {r['name']} - {r['conclusion'] or r['status']}\")"

# Get failed job logs (download as zip, extract, read)
RUN_ID=<run_id>
curl -s -L \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/actions/runs/$RUN_ID/logs \
  -o /tmp/ci-logs.zip
cd /tmp && unzip -o ci-logs.zip -d ci-logs && cat ci-logs/*.txt
```

### 手順2: 直して push する {#step-2-fix-and-push}

原因が分かったら、ファイル操作ツール（`patch`、`write_file`）で直します。

```bash
git add <fixed_files>
git commit -m "fix: resolve CI failure in <check_name>"
git push
```

### 手順3: 確認する {#step-3-verify}

第4節のコマンドで CI の状態をもう一度確かめます。

### 自動で直すときの繰り返し方 {#auto-fix-loop-pattern}

CI の自動修正を頼まれたら、次を繰り返します。

1. CI の状態を確かめ、失敗している箇所を見つけます
2. 失敗ログを読み、エラーの内容を理解します
3. `read_file` と `patch`/`write_file` でコードを直します
4. `git add . && git commit -m "fix: ..." && git push`
5. CI を待って、状態をもう一度確かめます
6. まだ失敗するなら繰り返します（3回まで。それでも駄目ならユーザーに相談します）

## 6. マージする {#6-merging}

**gh を使う場合:**

```bash
# Squash merge + delete branch (cleanest for feature branches)
gh pr merge --squash --delete-branch

# Enable auto-merge (merges when all checks pass)
gh pr merge --auto --squash --delete-branch
```

**git + curl を使う場合:**

```bash
PR_NUMBER=<number>

# Merge the PR via API (squash)
curl -s -X PUT \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/pulls/$PR_NUMBER/merge \
  -d "{
    \"merge_method\": \"squash\",
    \"commit_title\": \"feat: add user authentication (#$PR_NUMBER)\"
  }"

# Delete the remote branch after merge
BRANCH=$(git branch --show-current)
git push origin --delete $BRANCH

# Switch back to main locally
git checkout main && git pull origin main
git branch -d $BRANCH
```

マージの方式: `"merge"`（マージコミット）、`"squash"`、`"rebase"`

### 自動マージを有効にする（curl） {#enable-auto-merge-curl}

```bash
# Auto-merge requires the repo to have it enabled in settings.
# This uses the GraphQL API since REST doesn't support auto-merge.
PR_NODE_ID=$(curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/pulls/$PR_NUMBER \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['node_id'])")

curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/graphql \
  -d "{\"query\": \"mutation { enablePullRequestAutoMerge(input: {pullRequestId: \\\"$PR_NODE_ID\\\", mergeMethod: SQUASH}) { clientMutationId } }\"}"
```

## 7. ひととおりの流れの例 {#7-complete-workflow-example}

```bash
# 1. Start from clean main
git checkout main && git pull origin main

# 2. Branch
git checkout -b fix/login-redirect-bug

# 3. (Agent makes code changes with file tools)

# 4. Commit
git add src/auth/login.py tests/test_login.py
git commit -m "fix: correct redirect URL after login

Preserves the ?next= parameter instead of always redirecting to /dashboard."

# 5. Push
git push -u origin HEAD

# 6. Create PR (picks gh or curl based on what's available)
# ... (see Section 3)

# 7. Monitor CI (see Section 4)

# 8. Merge when green (see Section 6)
```

## よく使う PR コマンドの早見表 {#useful-pr-commands-reference}

| やりたいこと | gh | git + curl |
|--------|-----|-----------|
| 自分の PR の一覧 | `gh pr list --author @me` | `curl -s -H "Authorization: token $GITHUB_TOKEN" "https://api.github.com/repos/$OWNER/$REPO/pulls?state=open"` |
| PR の差分を見る | `gh pr diff` | `git diff main...HEAD`（手元で）または `curl -H "Accept: application/vnd.github.diff" ...` |
| コメントを付ける | `gh pr comment N --body "..."` | `curl -X POST .../issues/N/comments -d '{"body":"..."}'` |
| レビューを依頼する | `gh pr edit N --add-reviewer user` | `curl -X POST .../pulls/N/requested_reviewers -d '{"reviewers":["user"]}'` |
| PR を閉じる | `gh pr close N` | `curl -X PATCH .../pulls/N -d '{"state":"closed"}'` |
| 他の人の PR を手元に取り出す | `gh pr checkout N` | `git fetch origin pull/N/head:pr-N && git checkout pr-N` |
