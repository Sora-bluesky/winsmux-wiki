---
title: "Github Issues — GitHub の issue を gh または REST で作成・仕分け・ラベル付け・担当割り当てする"
description: "GitHub の issue を gh または REST で作成・仕分け・ラベル付け・担当割り当てする"
upstream_path: user-guide/skills/bundled/github/github-github-issues.md
upstream_blob: e25ceb4cb24e57cd90192588559c276674781b19
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/github/github-github-issues
---

# Github Issues {#github-issues}

GitHub の issue を gh または REST で作成・仕分け・ラベル付け・担当割り当てします。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/github/github-issues` |
| バージョン | `1.1.0` |
| 作者 | Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `GitHub`, `Issues`, `Project-Management`, `Bug-Tracking`, `Triage` |
| 関連 skill | [`github-auth`](/hermes/docs/user-guide/skills/bundled/github/github-github-auth/), [`github-pr-workflow`](/hermes/docs/user-guide/skills/bundled/github/github-github-pr-workflow/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# GitHub の issue 管理 {#github-issues-management}

GitHub の issue を作成し、検索し、仕分けし、管理します。どの節も `gh` を先に示し、そのあとに `curl` での代替を示します。

## 事前に必要なもの {#prerequisites}

- GitHub の認証が済んでいること（`github-auth` skill を参照してください）
- GitHub のリモートを持つ git リポジトリの中にいること。または対象リポジトリを明示すること

### 準備 {#setup}

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

## 1. issue を見る {#1-viewing-issues}

**gh を使う場合:**

```bash
gh issue list
gh issue list --state open --label "bug"
gh issue list --assignee @me
gh issue list --search "authentication error" --state all
gh issue view 42
```

**curl を使う場合:**

```bash
# List open issues
curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/$OWNER/$REPO/issues?state=open&per_page=20" \
  | python3 -c "

for i in json.load(sys.stdin):
    if 'pull_request' not in i:  # GitHub API returns PRs in /issues too
        labels = ', '.join(l['name'] for l in i['labels'])
        print(f\"#{i['number']:5}  {i['state']:6}  {labels:30}  {i['title']}\")"

# Filter by label
curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/$OWNER/$REPO/issues?state=open&labels=bug&per_page=20" \
  | python3 -c "

for i in json.load(sys.stdin):
    if 'pull_request' not in i:
        print(f\"#{i['number']}  {i['title']}\")"

# View a specific issue
curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/issues/42 \
  | python3 -c "

i = json.load(sys.stdin)
labels = ', '.join(l['name'] for l in i['labels'])
assignees = ', '.join(a['login'] for a in i['assignees'])
print(f\"#{i['number']}: {i['title']}\")
print(f\"State: {i['state']}  Labels: {labels}  Assignees: {assignees}\")
print(f\"Author: {i['user']['login']}  Created: {i['created_at']}\")
print(f\"\n{i['body']}\")"

# Search issues
curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/search/issues?q=authentication+error+repo:$OWNER/$REPO" \
  | python3 -c "

for i in json.load(sys.stdin)['items']:
    print(f\"#{i['number']}  {i['state']:6}  {i['title']}\")"
```

## 2. issue を作る {#2-creating-issues}

**gh を使う場合:**

```bash
gh issue create \
  --title "Login redirect ignores ?next= parameter" \
  --body "## Description
After logging in, users always land on /dashboard.

## Steps to Reproduce
1. Navigate to /settings while logged out
2. Get redirected to /login?next=/settings
3. Log in
4. Actual: redirected to /dashboard (should go to /settings)

## Expected Behavior
Respect the ?next= query parameter." \
  --label "bug,backend" \
  --assignee "username"
```

**curl を使う場合:**

```bash
curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/issues \
  -d '{
    "title": "Login redirect ignores ?next= parameter",
    "body": "## Description\nAfter logging in, users always land on /dashboard.\n\n## Steps to Reproduce\n1. Navigate to /settings while logged out\n2. Get redirected to /login?next=/settings\n3. Log in\n4. Actual: redirected to /dashboard\n\n## Expected Behavior\nRespect the ?next= query parameter.",
    "labels": ["bug", "backend"],
    "assignees": ["username"]
  }'
```

### バグ報告のひな形 {#bug-report-template}

```
## Bug Description
<What's happening>

## Steps to Reproduce
1. <step>
2. <step>

## Expected Behavior
<What should happen>

## Actual Behavior
<What actually happens>

## Environment
- OS: <os>
- Version: <version>
```

### 機能要望のひな形 {#feature-request-template}

```
## Feature Description
<What you want>

## Motivation
<Why this would be useful>

## Proposed Solution
<How it could work>

## Alternatives Considered
<Other approaches>
```

## 3. issue を管理する {#3-managing-issues}

### ラベルを付ける・外す {#addremove-labels}

**gh を使う場合:**

```bash
gh issue edit 42 --add-label "priority:high,bug"
gh issue edit 42 --remove-label "needs-triage"
```

**curl を使う場合:**

```bash
# Add labels
curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/issues/42/labels \
  -d '{"labels": ["priority:high", "bug"]}'

# Remove a label
curl -s -X DELETE \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/issues/42/labels/needs-triage

# List available labels in the repo
curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/labels \
  | python3 -c "

for l in json.load(sys.stdin):
    print(f\"  {l['name']:30}  {l.get('description', '')}\")"
```

### 担当者の割り当て {#assignment}

**gh を使う場合:**

```bash
gh issue edit 42 --add-assignee username
gh issue edit 42 --add-assignee @me
```

**curl を使う場合:**

```bash
curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/issues/42/assignees \
  -d '{"assignees": ["username"]}'
```

### コメントする {#commenting}

**gh を使う場合:**

```bash
gh issue comment 42 --body "Investigated — root cause is in auth middleware. Working on a fix."
```

**curl を使う場合:**

```bash
curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/issues/42/comments \
  -d '{"body": "Investigated — root cause is in auth middleware. Working on a fix."}'
```

### 閉じる・開き直す {#closing-and-reopening}

**gh を使う場合:**

```bash
gh issue close 42
gh issue close 42 --reason "not planned"
gh issue reopen 42
```

**curl を使う場合:**

```bash
# Close
curl -s -X PATCH \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/issues/42 \
  -d '{"state": "closed", "state_reason": "completed"}'

# Reopen
curl -s -X PATCH \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/issues/42 \
  -d '{"state": "open"}'
```

### issue と PR を結び付ける {#linking-issues-to-prs}

PR の本文に次のキーワードを書いておくと、マージされたときに issue が自動で閉じます。

```
Closes #42
Fixes #42
Resolves #42
```

issue からブランチを作るには、次のようにします。

**gh を使う場合:**

```bash
gh issue develop 42 --checkout
```

**git を使う場合（同じことを手で行う）:**

```bash
git checkout main && git pull origin main
git checkout -b fix/issue-42-login-redirect
```

## 4. issue の仕分けの流れ {#4-issue-triage-workflow}

issue の仕分けを頼まれたら、次のように進めます。

1. **未仕分けの issue を一覧にします:**

```bash
# With gh
gh issue list --label "needs-triage" --state open

# With curl
curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/$OWNER/$REPO/issues?labels=needs-triage&state=open" \
  | python3 -c "

for i in json.load(sys.stdin):
    if 'pull_request' not in i:
        print(f\"#{i['number']}  {i['title']}\")"
```

2. **1件ずつ読んで分類します**（内容を見て、バグか機能かを理解します）

3. **ラベルと優先度を付けます**（上の「issue を管理する」を参照してください）

4. 担当がはっきりしていれば **割り当てます**

5. 必要なら **仕分けの所見をコメントします**

## 5. まとめて処理する {#5-bulk-operations}

まとめて処理したいときは、API 呼び出しとシェルスクリプトを組み合わせます。

**gh を使う場合:**

```bash
# Close all issues with a specific label
gh issue list --label "wontfix" --json number --jq '.[].number' | \
  xargs -I {} gh issue close {} --reason "not planned"
```

**curl を使う場合:**

```bash
# List issue numbers with a label, then close each
curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/$OWNER/$REPO/issues?labels=wontfix&state=open" \
  | python3 -c "import sys,json; [print(i['number']) for i in json.load(sys.stdin)]" \
  | while read num; do
    curl -s -X PATCH \
      -H "Authorization: token $GITHUB_TOKEN" \
      https://api.github.com/repos/$OWNER/$REPO/issues/$num \
      -d '{"state": "closed", "state_reason": "not_planned"}'
    echo "Closed #$num"
  done
```

## 早見表 {#quick-reference-table}

| やりたいこと | gh | curl のエンドポイント |
|--------|-----|--------------|
| issue の一覧 | `gh issue list` | `GET /repos/{o}/{r}/issues` |
| issue を見る | `gh issue view N` | `GET /repos/{o}/{r}/issues/N` |
| issue を作る | `gh issue create ...` | `POST /repos/{o}/{r}/issues` |
| ラベルを付ける | `gh issue edit N --add-label ...` | `POST /repos/{o}/{r}/issues/N/labels` |
| 担当者を割り当てる | `gh issue edit N --add-assignee ...` | `POST /repos/{o}/{r}/issues/N/assignees` |
| コメントする | `gh issue comment N --body ...` | `POST /repos/{o}/{r}/issues/N/comments` |
| 閉じる | `gh issue close N` | `PATCH /repos/{o}/{r}/issues/N` |
| 検索する | `gh issue list --search "..."` | `GET /search/issues?q=...` |
