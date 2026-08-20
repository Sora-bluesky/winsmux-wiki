---
title: "Google Workspace — Gmail、カレンダー、ドライブ、スプレッドシート、ドキュメント"
description: "メールの送信、カレンダーの予定の管理、ドライブの検索、スプレッドシートの読み書き、ドキュメントの参照を、OAuth2 で認証した Google の API からまとめて行います"
upstream_path: user-guide/skills/google-workspace.md
upstream_blob: 7248612c6bf3d6fa403b4302fba2b4ef66341b93
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/google-workspace
---

# Google Workspace の skill {#google-workspace-skill}

Gmail、カレンダー、ドライブ、連絡先、スプレッドシート、ドキュメントを Hermes からつなげます。認証は OAuth2 で、トークンは自動で更新されます。[Google Workspace CLI（`gws`）](https://github.com/googleworkspace/cli) が使える環境ではそちらを優先し（対応できる範囲が広いためです）、無い場合は Google の Python 用ライブラリに切り替わります。

**skill のパス:** `skills/productivity/google-workspace/`

## 導入 {#setup}

準備はすべてエージェントが進めます。Google Workspace の設定をお願いすると、Hermes が一段ずつ案内してくれます。流れはこうです。

1. **Google Cloud のプロジェクトを作り**、必要な API（Gmail、カレンダー、ドライブ、スプレッドシート、ドキュメント、People）を有効にします
2. **OAuth 2.0 の認証情報を作り**（種別はデスクトップアプリ）、クライアントシークレットの JSON をダウンロードします
3. **許可します** — Hermes が認可用の URL を出すので、ブラウザで承認し、戻り先の URL を貼り戻します
4. **完了です** — 以降、トークンは自動で更新されます

:::tip メールだけ使いたい方へ
必要なのがメールだけで、カレンダーやドライブ、スプレッドシートを使わないなら、**himalaya** の skill のほうが向いています。Gmail のアプリパスワードで動き、2 分で終わります。Google Cloud のプロジェクトも要りません。
:::

## Gmail {#gmail}

### 探す {#searching}

```bash
$GAPI gmail search "is:unread" --max 10
$GAPI gmail search "from:boss@company.com newer_than:1d"
$GAPI gmail search "has:attachment filename:pdf newer_than:7d"
```

見つかったメールごとに、`id`、`from`、`subject`、`date`、`snippet`、`labels` を JSON で返します。

### 読む {#reading}

```bash
$GAPI gmail get MESSAGE_ID
```

本文の全文をテキストで返します（プレーンテキストを優先し、無ければ HTML を使います）。

### 送る {#sending}

```bash
# Basic send
$GAPI gmail send --to user@example.com --subject "Hello" --body "Message text"

# HTML email
$GAPI gmail send --to user@example.com --subject "Report" \
  --body "<h1>Q4 Results</h1><p>Details here</p>" --html

# Custom From header (display name + email)
$GAPI gmail send --to user@example.com --subject "Hello" \
  --from '"Research Agent" <user@example.com>' --body "Message text"

# With CC
$GAPI gmail send --to user@example.com --cc "team@example.com" \
  --subject "Update" --body "FYI"
```

### 差出人の表示名を変える {#custom-from-header}

`--from` を付けると、送るメールの差出人の表示名を変えられます。ひとつの Gmail アカウントを複数のエージェントで使いながら、受け取る側には別々の名前を見せたいときに役立ちます。

```bash
# Agent 1
$GAPI gmail send --to client@co.com --subject "Research Summary" \
  --from '"Research Agent" <shared@company.com>' --body "..."

# Agent 2  
$GAPI gmail send --to client@co.com --subject "Code Review" \
  --from '"Code Assistant" <shared@company.com>' --body "..."
```

**仕組み:** `--from` に渡した値は、MIME メッセージの RFC 5322 の `From` ヘッダとして設定されます。Gmail では、自分が認証しているメールアドレスの表示名なら、追加の設定なしで変えられます。受け取る側には設定した表示名（たとえば "Research Agent"）が見え、メールアドレスは変わりません。

**注意:** `--from` に*別のメールアドレス*（認証したアカウント以外）を書く場合は、そのアドレスを Gmail の設定 → アカウント → 名前で、[別のアドレスから送信](https://support.google.com/mail/answer/22370)として登録しておく必要があります。

`--from` は `send` でも `reply` でも使えます。

```bash
$GAPI gmail reply MESSAGE_ID \
  --from '"Support Bot" <shared@company.com>' --body "We're on it"
```

### 返信する {#replying}

```bash
$GAPI gmail reply MESSAGE_ID --body "Thanks, that works for me."
```

スレッドは自動でつながります（`In-Reply-To` と `References` のヘッダを設定し、元のメールのスレッド ID を使います）。

### ラベル {#labels}

```bash
# List all labels
$GAPI gmail labels

# Add/remove labels
$GAPI gmail modify MESSAGE_ID --add-labels LABEL_ID
$GAPI gmail modify MESSAGE_ID --remove-labels UNREAD
```

## カレンダー {#calendar}

```bash
# List events (defaults to next 7 days)
$GAPI calendar list
$GAPI calendar list --start 2026-03-01T00:00:00Z --end 2026-03-07T23:59:59Z

# Create event (timezone required)
$GAPI calendar create --summary "Team Standup" \
  --start 2026-03-01T10:00:00-07:00 --end 2026-03-01T10:30:00-07:00

# With location and attendees
$GAPI calendar create --summary "Lunch" \
  --start 2026-03-01T12:00:00Z --end 2026-03-01T13:00:00Z \
  --location "Cafe" --attendees "alice@co.com,bob@co.com"

# Delete event
$GAPI calendar delete EVENT_ID
```

:::warning
カレンダーの日時には、時差（`-07:00` など）を**必ず**付けるか、UTC（`Z`）を使ってください。`2026-03-01T10:00:00` のように時差の無い書き方はどの時刻か決まらず、UTC として扱われます。
:::

## ドライブ {#drive}

```bash
$GAPI drive search "quarterly report" --max 10
$GAPI drive search "mimeType='application/pdf'" --raw-query --max 5
```

## スプレッドシート {#sheets}

```bash
# Read a range
$GAPI sheets get SHEET_ID "Sheet1!A1:D10"

# Write to a range
$GAPI sheets update SHEET_ID "Sheet1!A1:B2" --values '[["Name","Score"],["Alice","95"]]'

# Append rows
$GAPI sheets append SHEET_ID "Sheet1!A:C" --values '[["new","row","data"]]'
```

## ドキュメント {#docs}

```bash
$GAPI docs get DOC_ID
```

文書のタイトルと本文の全文を返します。

## 連絡先 {#contacts}

```bash
$GAPI contacts list --max 20
```

## 返ってくる形 {#output-format}

どのコマンドも JSON を返します。サービスごとの主な項目は次のとおりです。

| コマンド | 項目 |
|---------|--------|
| `gmail search` | `id`, `threadId`, `from`, `to`, `subject`, `date`, `snippet`, `labels` |
| `gmail get` | `id`, `threadId`, `from`, `to`, `subject`, `date`, `labels`, `body` |
| `gmail send/reply` | `status`, `id`, `threadId` |
| `calendar list` | `id`, `summary`, `start`, `end`, `location`, `description`, `htmlLink` |
| `calendar create` | `status`, `id`, `summary`, `htmlLink` |
| `drive search` | `id`, `name`, `mimeType`, `modifiedTime`, `webViewLink` |
| `contacts list` | `name`, `emails`, `phones` |
| `sheets get` | セルの値の 2 次元配列 |

## 困ったとき {#troubleshooting}

| 困りごと | 対処 |
|---------|-----|
| `NOT_AUTHENTICATED` | 準備を実行します（Google Workspace の設定を Hermes にお願いします） |
| `REFRESH_FAILED` | トークンが取り消されています。認可の手順をやり直します |
| `HttpError 403: Insufficient Permission` | 権限の範囲が足りません。認可を取り消し、必要なサービスを含めて許可し直します |
| `HttpError 403: Access Not Configured` | Google Cloud コンソールで、その API が有効になっていません |
| `ModuleNotFoundError` | 準備用のスクリプトを `--install-deps` を付けて実行します |
