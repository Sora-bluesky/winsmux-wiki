---
title: "1Password — op CLI を用意してサインインし、秘密の値を読み書きする"
description: "op CLI を用意してサインインし、秘密の値を読み書きする"
upstream_path: user-guide/skills/optional/security/security-1password.md
upstream_blob: 4b9697bacf6a384df9697285c7a3f7d5c8b099de
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/security/security-1password
---

# 1Password {#1password}

op CLI を用意してサインインし、秘密の値を読み書きします。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加の skill です。`hermes skills install official/security/1password` で入れられます |
| パス | `optional-skills/security/1password` |
| バージョン | `1.0.0` |
| 作者 | arceus77-7, enhanced by Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `security`, `secrets`, `1password`, `op`, `cli` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が動き出したときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# 1Password CLI {#1password-cli}

環境変数やファイルに秘密の値をそのまま置くのではなく、1Password で管理したいときに、この skill を使います。

## 必要なもの {#requirements}

- 1Password のアカウント
- 1Password の CLI（`op`）が入っていること
- 次のいずれか: デスクトップアプリとの連携、サービスアカウントのトークン（`OP_SERVICE_ACCOUNT_TOKEN`）、Connect サーバー
- Hermes が端末を呼び出すあいだ、認証済みの状態を保つための `tmux`（デスクトップアプリと連携する場合のみ）

## こんなときに使います {#when-to-use}

- 1Password の CLI を入れる、または設定する
- `op signin` でサインインする
- `op://Vault/Item/field` のような形で秘密の値を読み出す
- `op inject` で設定ファイルやひな形に秘密の値を差し込む
- `op run` で、秘密の値を環境変数に入れたままコマンドを実行する

## 認証のやり方 {#authentication-methods}

### サービスアカウント（Hermes ではこれがおすすめ） {#service-account-recommended-for-hermes}

`${HERMES_HOME:-~/.hermes}/.env` に `OP_SERVICE_ACCOUNT_TOKEN` を設定します（この skill が最初に読み込まれるときに入力を求めます）。
デスクトップアプリは要りません。`op read`、`op inject`、`op run` が使えます。

```bash
export OP_SERVICE_ACCOUNT_TOKEN="your-token-here"
op whoami  # verify — should show Type: SERVICE_ACCOUNT
```

### デスクトップアプリとの連携（対話が要ります） {#desktop-app-integration-interactive}

1. 1Password のデスクトップアプリで有効にします: 設定 → 開発者 → 1Password CLI と連携する
2. アプリのロックが解除されていることを確かめます
3. `op signin` を実行し、生体認証の確認に応じます

### Connect サーバー（自分で立てる場合） {#connect-server-self-hosted}

```bash
export OP_CONNECT_HOST="http://localhost:8080"
export OP_CONNECT_TOKEN="your-connect-token"
```

## 準備 {#setup}

1. CLI を入れます:

```bash
# macOS
brew install 1password-cli

# Linux (official package/install docs)
# See references/get-started.md for distro-specific links.

# Windows (winget)
winget install AgileBits.1Password.CLI
```

2. 確かめます:

```bash
op --version
```

3. 上の認証のやり方から 1 つ選んで設定します。

## Hermes での実行のしかた（デスクトップアプリ連携の場合） {#hermes-execution-pattern-desktop-app-flow}

Hermes の端末コマンドは既定で対話を挟まないため、呼び出しをまたぐと認証の状態が失われることがあります。
デスクトップアプリ連携で `op` を安定して使うには、サインインと秘密の値の操作を専用の tmux セッションの中で実行してください。

補足: `OP_SERVICE_ACCOUNT_TOKEN` を使う場合、これは要りません。トークンは端末の呼び出しをまたいで自動的に保たれます。

```bash
SOCKET_DIR="${TMPDIR:-/tmp}/hermes-tmux-sockets"
mkdir -p "$SOCKET_DIR"
SOCKET="$SOCKET_DIR/hermes-op.sock"
SESSION="op-auth-$(date +%Y%m%d-%H%M%S)"

tmux -S "$SOCKET" new -d -s "$SESSION" -n shell

# Sign in (approve in desktop app when prompted)
tmux -S "$SOCKET" send-keys -t "$SESSION":0.0 -- "eval \"\$(op signin --account my.1password.com)\"" Enter

# Verify auth
tmux -S "$SOCKET" send-keys -t "$SESSION":0.0 -- "op whoami" Enter

# Example read
tmux -S "$SOCKET" send-keys -t "$SESSION":0.0 -- "op read 'op://Private/Npmjs/one-time password?attribute=otp'" Enter

# Capture output when needed
tmux -S "$SOCKET" capture-pane -p -J -t "$SESSION":0.0 -S -200

# Cleanup
tmux -S "$SOCKET" kill-session -t "$SESSION"
```

## よく使う操作 {#common-operations}

### 秘密の値を読む {#read-a-secret}

```bash
op read "op://app-prod/db/password"
```

### ワンタイムパスワードを取り出す {#get-otp}

```bash
op read "op://app-prod/npm/one-time password?attribute=otp"
```

### ひな形に差し込む {#inject-into-template}

```bash
echo "db_password: {{ op://app-prod/db/password }}" | op inject
```

### 秘密の値を環境変数に入れてコマンドを実行する {#run-a-command-with-secret-env-var}

```bash
export DB_PASSWORD="op://app-prod/db/password"
op run -- sh -c '[ -n "$DB_PASSWORD" ] && echo "DB_PASSWORD is set" || echo "DB_PASSWORD missing"'
```

## 守ること {#guardrails}

- 値そのものをはっきり求められない限り、秘密の値をそのまま利用者に表示しないでください。
- 秘密の値をファイルに書くのではなく、`op run` / `op inject` を使ってください。
- 「account is not signed in」と出て失敗したら、同じ tmux セッションでもう一度 `op signin` を実行してください。
- デスクトップアプリとの連携が使えない環境（画面のない環境や CI）では、サービスアカウントのトークンを使ってください。

## CI・画面のない環境について {#ci-headless-note}

対話を挟めない場面では、`OP_SERVICE_ACCOUNT_TOKEN` で認証し、対話式の `op signin` は避けてください。
サービスアカウントには CLI の v2.18.0 以降が必要です。

## 参考 {#references}

- `references/get-started.md`
- `references/cli-examples.md`
- https://developer.1password.com/docs/cli/
- https://developer.1password.com/docs/service-accounts/
