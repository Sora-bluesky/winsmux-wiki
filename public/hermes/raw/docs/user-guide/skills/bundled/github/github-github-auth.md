---
title: "Github Auth — GitHub の認証設定: HTTPS トークン、SSH 鍵、gh CLI ログイン"
description: "GitHub の認証設定: HTTPS トークン、SSH 鍵、gh CLI ログイン"
upstream_path: user-guide/skills/bundled/github/github-github-auth.md
upstream_blob: ba58277c4e96419f0f634c4ddbce1115d96ac853
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/github/github-github-auth
---

# Github Auth {#github-auth}

GitHub の認証を設定します。HTTPS トークン、SSH 鍵、gh CLI ログインの3通りを扱います。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/github/github-auth` |
| バージョン | `1.1.0` |
| 作者 | Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `GitHub`, `Authentication`, `Git`, `gh-cli`, `SSH`, `Setup` |
| 関連 skill | [`github-pr-workflow`](/hermes/docs/user-guide/skills/bundled/github/github-github-pr-workflow/), [`github-code-review`](/hermes/docs/user-guide/skills/bundled/github/github-github-code-review/), [`github-issues`](/hermes/docs/user-guide/skills/bundled/github/github-github-issues/), [`github-repo-management`](/hermes/docs/user-guide/skills/bundled/github/github-github-repo-management/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# GitHub の認証設定 {#github-authentication-setup}

この skill は、エージェントが GitHub のリポジトリ・PR・issue・CI を扱えるように認証を設定します。方法は2通りあります。

- **`git`（どの環境にもあります）** — HTTPS のパーソナルアクセストークン、または SSH 鍵を使います
- **`gh` CLI（入っている場合）** — GitHub API をより広く使えて、認証の手順も簡単です

## 判定の流れ {#detection-flow}

GitHub まわりの作業を頼まれたら、まず次を実行して状況を確かめます。

```bash
# Check what's available
git --version
gh --version 2>/dev/null || echo "gh not installed"

# Check if already authenticated
gh auth status 2>/dev/null || echo "gh not authenticated"
git config --global credential.helper 2>/dev/null || echo "no git credential helper"
```

**判断の分かれ道:**
1. `gh auth status` が認証済みと表示する → そのままで大丈夫です。すべて `gh` で進めます
2. `gh` は入っているが未認証 → 後述の「gh auth」の方法を使います
3. `gh` が入っていない → 後述の「git だけ」の方法を使います（sudo は不要です）

---

## 方法1: git だけで認証する（gh も sudo も使わない） {#method-1-git-only-authentication-no-gh-no-sudo}

`git` さえ入っていればどの端末でも使えます。管理者権限は必要ありません。

### 選択肢 A: HTTPS とパーソナルアクセストークン（おすすめ） {#option-a-https-with-personal-access-token-recommended}

いちばん持ち運びやすい方法です。どこでも使えて、SSH の設定も要りません。

**手順1: パーソナルアクセストークンを作る**

ユーザーに **https://github.com/settings/tokens** を開いてもらいます。

- 「Generate new token (classic)」をクリックします
- 「hermes-agent」のような名前を付けます
- スコープを選びます:
  - `repo`（リポジトリへの完全なアクセス — 読み取り、書き込み、push、PR）
  - `workflow`（GitHub Actions の実行と管理）
  - `read:org`（組織のリポジトリを扱う場合）
- 有効期限を設定します（90日が手ごろです）
- トークンをコピーします — 二度と表示されません

**手順2: トークンを保存するよう git を設定する**

```bash
# Set up the credential helper to cache credentials
# "store" saves to ~/.git-credentials in plaintext (simple, persistent)
git config --global credential.helper store

# Now do a test operation that triggers auth — git will prompt for credentials
# Username: <their-github-username>
# Password: <paste the personal access token, NOT their GitHub password>
git ls-remote https://github.com/<their-username>/<any-repo>.git
```

一度入力すれば保存され、以降の操作ではそのまま使い回されます。

**別の手: cache ヘルパー（メモリ上の資格情報はいずれ消えます）**

```bash
# Cache in memory for 8 hours (28800 seconds) instead of saving to disk
git config --global credential.helper 'cache --timeout=28800'
```

**別の手: リモート URL にトークンを直接書く（リポジトリごと）**

```bash
# Embed token in the remote URL (avoids credential prompts entirely)
git remote set-url origin https://<username>:<token>@github.com/<owner>/<repo>.git
```

**手順3: git の名前とメールアドレスを設定する**

```bash
# Required for commits — set name and email
git config --global user.name "Their Name"
git config --global user.email "their-email@example.com"
```

**手順4: 確認する**

```bash
# Test push access (this should work without any prompts now)
git ls-remote https://github.com/<their-username>/<any-repo>.git

# Verify identity
git config --global user.name
git config --global user.email
```

### 選択肢 B: SSH 鍵で認証する {#option-b-ssh-key-authentication}

SSH が好みの方や、すでに鍵を用意してある方に向いています。

**手順1: 既存の SSH 鍵を確認する**

```bash
ls -la ~/.ssh/id_*.pub 2>/dev/null || echo "No SSH keys found"
```

**手順2: 必要なら鍵を作る**

```bash
# Generate an ed25519 key (modern, secure, fast)
ssh-keygen -t ed25519 -C "their-email@example.com" -f ~/.ssh/id_ed25519 -N ""

# Display the public key for them to add to GitHub
cat ~/.ssh/id_ed25519.pub
```

公開鍵は **https://github.com/settings/keys** で登録してもらいます。
- 「New SSH key」をクリックします
- 公開鍵の中身を貼り付けます
- 「hermes-agent-&lt;machine-name>」のようなタイトルを付けます

**手順3: 接続を試す**

```bash
ssh -T git@github.com
# Expected: "Hi <username>! You've successfully authenticated..."
```

**手順4: GitHub には SSH を使うよう git を設定する**

```bash
# Rewrite HTTPS GitHub URLs to SSH automatically
git config --global url."git@github.com:".insteadOf "https://github.com/"
```

**手順5: git の名前とメールアドレスを設定する**

```bash
git config --global user.name "Their Name"
git config --global user.email "their-email@example.com"
```

---

## 方法2: gh CLI で認証する {#method-2-gh-cli-authentication}

`gh` が入っていれば、API のアクセスと git の資格情報をまとめて設定できます。

### ブラウザで対話的にログインする（デスクトップ） {#interactive-browser-login-desktop}

```bash
gh auth login
# Select: GitHub.com
# Select: HTTPS
# Authenticate via browser
```

### トークンでログインする（画面のない環境 / SSH 越しのサーバー） {#token-based-login-headless-ssh-servers}

```bash
echo "<THEIR_TOKEN>" | gh auth login --with-token

# Set up git credentials through gh
gh auth setup-git
```

### 確認する {#verify}

```bash
gh auth status
```

---

## gh なしで GitHub API を使う {#using-the-github-api-without-gh}

`gh` が使えない環境でも、`curl` とパーソナルアクセストークンがあれば GitHub API のすべてを呼び出せます。ほかの GitHub 系 skill も、この形で代替手段を用意しています。

### API 呼び出し用にトークンを設定する {#setting-the-token-for-api-calls}

```bash
# Option 1: Export as env var (preferred — keeps it out of commands)
export GITHUB_TOKEN="<token>"

# Then use in curl calls:
curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/user
```

### git の資格情報からトークンを取り出す {#extracting-the-token-from-git-credentials}

credential.helper store で git の資格情報をすでに設定してあれば、そこからトークンを取り出せます。

```bash
# Read from git credential store
uv run python3 "${HERMES_HOME:-$HOME/.hermes}/skills/github/github-auth/scripts/git-credential-token.py"
```

### 補助: 認証方法を自動で見分ける {#helper-detect-auth-method}

GitHub まわりの作業を始めるときは、この形を使います。

```bash
# Try gh first, fall back to git + curl
if command -v gh &>/dev/null && gh auth status &>/dev/null; then
  echo "AUTH_METHOD=gh"
elif [ -n "$GITHUB_TOKEN" ]; then
  echo "AUTH_METHOD=curl"
elif _hermes_env="${HERMES_HOME:-$HOME/.hermes}/.env"; [ -f "$_hermes_env" ] && grep -q "^GITHUB_TOKEN=" "$_hermes_env"; then
  export GITHUB_TOKEN=$(grep "^GITHUB_TOKEN=" "$_hermes_env" | head -1 | cut -d= -f2 | tr -d '\n\r')
  echo "AUTH_METHOD=curl"
elif grep -q "github.com" ~/.git-credentials 2>/dev/null; then
  export GITHUB_TOKEN=$(uv run python3 "${HERMES_HOME:-$HOME/.hermes}/skills/github/github-auth/scripts/git-credential-token.py")
  echo "AUTH_METHOD=curl"
else
  echo "AUTH_METHOD=none"
  echo "Need to set up authentication first"
fi
```

---

## 困ったとき {#troubleshooting}

| 症状 | 対処 |
|---------|----------|
| `git push` でパスワードを聞かれる | GitHub はパスワード認証を廃止しました。パスワード欄にパーソナルアクセストークンを入れるか、SSH に切り替えてください |
| `remote: Permission to X denied` | トークンに `repo` スコープが足りていない可能性があります。正しいスコープで作り直してください |
| `fatal: Authentication failed` | 保存済みの資格情報が古くなっているかもしれません。`git credential reject` を実行してから認証をやり直してください |
| `ssh: connect to host github.com port 22: Connection refused` | SSH を HTTPS のポートで通します。`~/.ssh/config` に `Host github.com` を追加し、`Port 443` と `Hostname ssh.github.com` を書きます |
| 資格情報が保存されない | `git config --global credential.helper` を確認します。`store` か `cache` になっている必要があります |
| GitHub のアカウントが複数ある | `~/.ssh/config` でホスト別名ごとに鍵を分けて SSH を使うか、リポジトリごとに資格情報入りの URL を使います |
| `gh: command not found` で sudo も使えない | 上の方法1（git だけ）を使ってください。何もインストールせずに済みます |
