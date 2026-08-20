---
title: "Himalaya — Himalaya CLI: ターミナルから IMAP/SMTP のメールを扱う"
description: "Himalaya CLI: ターミナルから IMAP/SMTP のメールを扱う"
upstream_path: user-guide/skills/bundled/email/email-himalaya.md
upstream_blob: 38768284682fc3f05188508ca21d6ca610091e37
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/email/email-himalaya
---

# Himalaya {#himalaya}

Himalaya CLI です。ターミナルから IMAP/SMTP のメールを扱います。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/email/himalaya` |
| バージョン | `1.1.0` |
| 作者 | community |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Email`, `IMAP`, `SMTP`, `CLI`, `Communication` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Himalaya Email CLI {#himalaya-email-cli}

Himalaya はコマンドライン用のメールクライアントで、IMAP・SMTP・Notmuch・Sendmail のいずれかを使い、ターミナルからメールを扱えます。

この skill は、Hermes の Email ゲートウェイアダプターとは別物です。ゲートウェイ
アダプターは、人がエージェントにメールを送れるようにするもので、Hermes に内蔵の
IMAP/SMTP アダプターを使います。この skill は、エージェントがターミナルの道具で
メールボックスを操作するためのもので、外部の `himalaya` CLI が必要です。

## 参考資料 {#references}

- `references/configuration.md`（設定ファイルの作り方と IMAP/SMTP の認証）
- `references/message-composition.md`（メールを組み立てる MML の書き方）

## 事前に必要なもの {#prerequisites}

1. Himalaya CLI が入っていること（`himalaya --version` で確認します）
2. `~/.config/himalaya/config.toml` に設定ファイルがあること
3. IMAP/SMTP の認証情報が設定されていること（パスワードは安全な場所に置きます）

### 導入 {#installation}

```bash
# Pre-built binary (Linux/macOS — recommended)
curl -sSL https://raw.githubusercontent.com/pimalaya/himalaya/master/install.sh | PREFIX=~/.local sh

# macOS via Homebrew
brew install himalaya

# Or via cargo (any platform with Rust)
cargo install himalaya --locked
```

## 設定 {#configuration-setup}

対話形式のウィザードでアカウントを設定します。

```bash
himalaya account configure
```

あるいは `~/.config/himalaya/config.toml` を自分で書きます。

```toml
[accounts.personal]
email = "you@example.com"
display-name = "Your Name"
default = true

backend.type = "imap"
backend.host = "imap.example.com"
backend.port = 993
backend.encryption.type = "tls"
backend.login = "you@example.com"
backend.auth.type = "password"
backend.auth.cmd = "pass show email/imap"  # or use keyring

message.send.backend.type = "smtp"
message.send.backend.host = "smtp.example.com"
message.send.backend.port = 587
message.send.backend.encryption.type = "start-tls"
message.send.backend.login = "you@example.com"
message.send.backend.auth.type = "password"
message.send.backend.auth.cmd = "pass show email/smtp"

# Folder aliases (himalaya v1.2.0+ syntax). Required whenever the
# server's folder names don't match himalaya's canonical names
# (inbox/sent/drafts/trash). Gmail is the common case — see
# `references/configuration.md` for the `[Gmail]/Sent Mail` mapping.
folder.aliases.inbox = "INBOX"
folder.aliases.sent = "Sent"
folder.aliases.drafts = "Drafts"
folder.aliases.trash = "Trash"
```

> **エイリアスの書き方に注意してください。** v1.2.0 より前のドキュメントでは
> `[accounts.NAME.folder.alias]` という下位セクション（単数形の `alias`）を
> 使っていました。v1.2.0 はこの形を黙って無視します。TOML としては読めるのに、
> エイリアスを解決する処理がそこを見ないため、どの参照も正式な名前のほうへ
> 素通りします。Gmail ではこれが原因で、SMTP の送信が成功した*あとに*
> 送信済みへの保存が失敗し、`himalaya message send` がゼロ以外で終了します。
> その終了コードを見て再実行する側（エージェント、スクリプト、人）は、SMTP を
> 含めて送信全体をやり直すので、宛先には同じメールが二重に届きます。必ず
> `folder.aliases.X`（複数形、ドット区切りのキー、`[accounts.NAME]` の直下）を
> 使ってください。

## Hermes と組み合わせるときの注意 {#hermes-integration-notes}

- **読む・一覧する・検索する・移動する・削除する** は、いずれもターミナルのツールからそのまま使えます
- **作成・返信・転送** は、標準入力に流し込む形（`cat << EOF | himalaya template send`）が確実です。対話的な `$EDITOR` モードも `pty=true` とバックグラウンド実行、プロセス操作のツールを組み合わせれば動きますが、エディターの種類とその操作方法を知っている必要があります
- `--output json` を付けると、プログラムから扱いやすい構造化された出力になります
- `himalaya account configure` のウィザードは対話入力を求めるので、PTY モードを使ってください: `terminal(command="himalaya account configure", pty=true)`

## よく使う操作 {#common-operations}

### フォルダーの一覧 {#list-folders}

```bash
himalaya folder list
```

### メールの一覧 {#list-emails}

INBOX のメールを一覧します（既定）。

```bash
himalaya envelope list
```

フォルダーを指定して一覧します。

```bash
himalaya envelope list --folder "Sent"
```

ページを区切って一覧します。

```bash
himalaya envelope list --page 1 --page-size 20
```

### メールの検索 {#search-emails}

```bash
himalaya envelope list from john@example.com subject meeting
```

### メールを読む {#read-an-email}

ID を指定して読みます（プレーンテキストで表示されます）。

```bash
himalaya message read 42
```

生の MIME を書き出します。

```bash
himalaya message export 42 --full
```

### メールに返信する {#reply-to-an-email}

Hermes から対話なしで返信するには、元のメールを読み、返信を組み立てて、標準入力に流し込みます。

```bash
# Get the reply template, edit it, and send
himalaya template reply 42 | sed 's/^$/\nYour reply text here\n/' | himalaya template send
```

返信を自分で組み立てることもできます。

```bash
cat << 'EOF' | himalaya template send
From: you@example.com
To: sender@example.com
Subject: Re: Original Subject
In-Reply-To: <original-message-id>

Your reply here.
EOF
```

全員に返信します（対話式で $EDITOR が必要なので、上のテンプレートを使う方法をおすすめします）。

```bash
himalaya message reply 42 --all
```

### メールを転送する {#forward-an-email}

```bash
# Get forward template and pipe with modifications
himalaya template forward 42 | sed 's/^To:.*/To: newrecipient@example.com/' | himalaya template send
```

### 新しいメールを書く {#write-a-new-email}

**対話なしの方法（Hermes からはこちらを使ってください）** — メールを標準入力に流し込みます。

```bash
cat << 'EOF' | himalaya template send
From: you@example.com
To: recipient@example.com
Subject: Test Message

Hello from Himalaya!
EOF
```

ヘッダーのオプションを使う方法もあります。

```bash
himalaya message write -H "To:recipient@example.com" -H "Subject:Test" "Message body here"
```

補足: `himalaya message write` は、標準入力に何も渡さないと `$EDITOR` を開きます。これも `pty=true` とバックグラウンド実行で動きますが、流し込むほうが単純で確実です。

### メールを移動・コピーする {#movecopy-emails}

フォルダーへ移動します（先に移動先のフォルダー、次にメールの ID を書きます）。

```bash
himalaya message move "Archive" 42
```

フォルダーへコピーします（先にコピー先のフォルダー、次にメールの ID を書きます）。

```bash
himalaya message copy "Important" 42
```

### メールを削除する {#delete-an-email}

```bash
himalaya message delete 42
```

### フラグを操作する {#manage-flags}

フラグを付けます。

```bash
himalaya flag add 42 --flag seen
```

フラグを外します。

```bash
himalaya flag remove 42 --flag seen
```

## 複数のアカウント {#multiple-accounts}

アカウントを一覧します。

```bash
himalaya account list
```

アカウントを指定して使います。

```bash
himalaya --account work envelope list
```

## 添付ファイル {#attachments}

メールの添付ファイルを保存します。

```bash
himalaya attachment download 42
```

保存先を指定します。

```bash
himalaya attachment download 42 --downloads-dir ~/Downloads
```

## 出力の形式 {#output-formats}

ほとんどのコマンドは、構造化された出力のために `--output` を受け付けます。

```bash
himalaya envelope list --output json
himalaya envelope list --output plain
```

## デバッグ {#debugging}

デバッグログを有効にします。

```bash
RUST_LOG=debug himalaya envelope list
```

バックトレース付きで全部の記録を出します。

```bash
RUST_LOG=trace RUST_BACKTRACE=1 himalaya envelope list
```

## コツ {#tips}

- 詳しい使い方は `himalaya --help` か `himalaya <command> --help` で見られます。
- メールの ID は今いるフォルダーのなかでの番号です。フォルダーを移ったら一覧し直してください。
- 添付付きの凝ったメールを作るときは MML の書き方を使います（`references/message-composition.md` を参照）。
- パスワードは `pass`、システムのキーリング、またはパスワードを出力するコマンドを使って安全に保管してください。
