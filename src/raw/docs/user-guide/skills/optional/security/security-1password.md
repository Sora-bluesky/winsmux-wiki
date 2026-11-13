---
title: "1Password — op CLI を用意してサインインし、秘密の値を読み書きする"
description: "op CLI を用意してサインインし、秘密の値を読み書きする"
upstream_path: user-guide/skills/optional/security/security-1password.md
upstream_blob: 981271bf133b8465cf3116aac5381becc73fbf74
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
| バージョン | `1.1.0` |
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
- 次のいずれか: デスクトップアプリとの連携、または Hermes の端末で `op` を使うための Connect サーバー
- Hermes が端末を呼び出すあいだ、認証済みの状態を保つための `tmux`（デスクトップアプリと連携する場合のみ）

Hermes は `OP_SERVICE_ACCOUNT_TOKEN` を、端末にも `execute_code` にも決して渡しません。
`.env` や `terminal.env_passthrough` に入っている場合も同じです。このトークンがあれば、サービスアカウントが読めるすべての秘密の値を開けてしまうためです。
ただし、Hermes 自身にプロバイダーのキーを渡す方法としては、今もサービスアカウントが適しています（`hermes secrets onepassword setup`）。

## こんなときに使います {#when-to-use}

- 1Password の CLI を入れる、または設定する
- `op signin` でサインインする
- `op://Vault/Item/field` のような形で秘密の値を読み出す
- `op inject` で設定ファイルやひな形に秘密の値を差し込む
- `op run` で、秘密の値を環境変数に入れたままコマンドを実行する

## 認証のやり方 {#authentication-methods}

### サービスアカウント（Hermes 自身による秘密の値の解決、または自分のシェルで使う） {#service-account-hermess-own-secret-resolution-or-your-own-shell}

`${HERMES_HOME:-~/.hermes}/.env` にサービスアカウントのトークンを置いておくと、Hermes は起動時に、自分が使うプロバイダーのキーについて `op://` 形式の参照を解決できます（`hermes secrets onepassword setup`）。
このトークンはエージェントが起動するプロセスからは取り除かれるため、Hermes の端末から実行した `op` には見えません。
トークンを使って `op` を直接動かしたいときは、Hermes の外で、自分のシェルからコマンドを実行してください:

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

補足: サービスアカウントのトークンはここでは決して使えません（「必要なもの」を参照）。そのため、
Hermes の端末から `op` を対話なしで使うには、代わりに Connect サーバーが必要です。

```bash
SOCKET_DIR="${TMPDIR:-${HERMES_HOME:-$HOME/.hermes}/cache/scratch}/hermes-tmux-sockets"
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
export DB_PASSWORD="op://app-prod/db/password"  # example op:// reference, resolved by `op run`
op run -- sh -c '[ -n "$DB_PASSWORD" ] && echo "DB_PASSWORD is set" || echo "DB_PASSWORD missing"'
```

## 守ること {#guardrails}

- 値そのものをはっきり求められない限り、秘密の値をそのまま利用者に表示しないでください。
- 秘密の値をファイルに書くのではなく、`op run` / `op inject` を使ってください。
- 「account is not signed in」と出て失敗したら、同じ tmux セッションでもう一度 `op signin` を実行してください。
- デスクトップアプリとの連携が使えない環境（画面のない環境や CI）では、Hermes の端末からは Connect サーバーを使ってください。サービスアカウントのトークンが使えるのは、利用者自身のシェルの中か、Hermes 自身が `op://` 形式の参照を解決するときだけです。

## CI・画面のない環境について {#ci-headless-note}

Hermes の外で対話を挟めない使い方をするときは、`OP_SERVICE_ACCOUNT_TOKEN` で認証し、対話式の
`op signin` は避けてください。サービスアカウントには CLI の v2.18.0 以降が必要です。Hermes の端末の中では、Connect サーバーを使ってください。

## 参考 {#references}

- `references/get-started.md`
- `references/cli-examples.md`
- https://developer.1password.com/docs/cli/
- https://developer.1password.com/docs/service-accounts/
