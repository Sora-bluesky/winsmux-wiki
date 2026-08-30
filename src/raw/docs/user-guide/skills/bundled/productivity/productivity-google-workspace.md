---
title: "Google Workspace — gws CLI か Python で Gmail・Calendar・Drive・Docs・Sheets を扱う"
description: "gws CLI か Python で Gmail・Calendar・Drive・Docs・Sheets を扱う"
upstream_path: user-guide/skills/bundled/productivity/productivity-google-workspace.md
upstream_blob: 9e8c327674b13178149dd86b2413ef68b0d9573e
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/productivity/productivity-google-workspace
---

# Google Workspace {#google-workspace}

gws CLI か Python で Gmail・Calendar・Drive・Docs・Sheets を扱います。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/productivity\google-workspace` |
| バージョン | `1.2.0` |
| 作者 | Nous Research |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Google`, `Gmail`, `Calendar`, `Drive`, `Sheets`, `Docs`, `Contacts`, `Email`, `OAuth` |
| 関連 skill | [`himalaya`](/hermes/docs/user-guide/skills/bundled/email/email-himalaya/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Google Workspace {#google-workspace}

Gmail、Calendar、Drive、Contacts、Sheets、Docs を、Hermes が管理する OAuth と薄い CLI のラッパー越しに扱います。`gws` が入っていれば、この skill はそれを実行の土台として使い、Google Workspace のより広い範囲をカバーします。入っていない場合は、同梱の Python 実装に切り替わります。

## 参考資料 {#references}

- `references/gmail-search-syntax.md`（Gmail の検索演算子。is:unread、from:、newer_than: など）
- `references/daily-brief.md`（毎日・朝のブリーフの手順。予定と重複の確認、会議の準備、Gmail と Calendar から拾う急ぎのメール）。朝のブリーフや会議の準備、「予定と、対応が要るメールを教えて」といった依頼が来たら読み込んでください。

## スクリプト {#scripts}

- `scripts/setup.py`（OAuth2 の初期設定。一度だけ実行して認可します）
- `scripts/google_api.py`（互換ラッパーの CLI）。使える場面では `gws` を優先しつつ、Hermes 側のこれまでの JSON 出力の形をそのまま保ちます。

## 最初の設定 {#first-time-setup}

設定は最初から最後まで対話なしで進みます。エージェントが一段ずつ進める形なので、
CLI でも Telegram でも Discord でも、どの経路からでも動きます。

まず短縮名を決めておきます。

```bash
GSETUP="python ${HERMES_HOME:-$HOME/.hermes}/skills/productivity/google-workspace/scripts/setup.py"
```

### Step 0: 設定済みかどうかを確認する {#step-0-check-if-already-set-up}

```bash
$GSETUP --check
```

`AUTHENTICATED` と出たら設定はすでに済んでいるので、「使い方」まで飛ばしてください。

### Step 1: 何が必要かを利用者に聞く {#step-1-triage-ask-the-user-what-they-need}

OAuth の設定を始める前に、利用者に 2 つ質問します。

**質問 1: 「Google のどのサービスが必要ですか。メールだけですか、それとも Calendar / Drive / Sheets / Docs も使いますか」**

- **メールだけ** → この skill は必要ありません。代わりに `himalaya` skill を
  使ってください。Gmail のアプリパスワード（設定 → セキュリティ → アプリ
  パスワード）で動き、設定は 2 分で終わります。Google Cloud のプロジェクトも
  要りません。himalaya skill を読み込んで、その設定手順に従ってください。

- **メールと Calendar** → この skill を続けて使いますが、認可のときに
  `--services email,calendar` を指定して、同意画面で本当に必要な権限だけを
  求めるようにします。

- **Calendar / Drive / Sheets / Docs だけ** → この skill を続けて使い、
  `calendar,drive,sheets,docs` のように `--services` を絞ります。

- **Workspace 全体** → この skill を続けて使い、既定の `all` の組み合わせを
  そのまま指定します。

**質問 2: 「その Google アカウントは高度な保護機能プログラム（ログインにハードウェアのセキュリティキーが要るもの）を使っていますか。よくわからない場合はおそらく使っていません。使うには自分で明示的に登録している必要があるからです」**

- **いいえ / わからない** → 通常どおりの設定です。このまま進めてください。
- **はい** → Step 4 を通すには、Workspace の管理者が OAuth クライアント ID を
  組織の許可アプリ一覧に追加しておく必要があります。先に伝えておいてください。

### Step 2: OAuth の認証情報を作る（一度だけ、5 分ほど） {#step-2-create-oauth-credentials-one-time-5-minutes}

利用者にこう伝えます。

> Google Cloud の OAuth クライアントが必要です。これは一度だけの設定です。
>
> 1. プロジェクトを作るか選びます:
>    https://console.cloud.google.com/projectselector2/home/dashboard
> 2. API ライブラリから必要な API を有効にします:
>    https://console.cloud.google.com/apis/library
>    有効にするもの: Gmail API、Google Calendar API、Google Drive API、
>    Google Sheets API、Google Docs API、People API
> 3. ここで OAuth クライアントを作ります:
>    https://console.cloud.google.com/apis/credentials
>    「認証情報」→「認証情報を作成」→「OAuth 2.0 クライアント ID」
> 4. アプリケーションの種類は「デスクトップ アプリ」を選んで「作成」
> 5. アプリがまだテスト中なら、ここで自分の Google アカウントをテストユーザーとして追加します:
>    https://console.cloud.google.com/auth/audience
>    「対象」→「テストユーザー」→「ユーザーを追加」
> 6. JSON ファイルをダウンロードして、そのファイルの場所を教えてください
>
> Hermes CLI での注意: ファイルの場所が `/` で始まる場合、そのパスだけを単独のメッセージとして CLI に送らないでください。スラッシュコマンドと取り違えられることがあります。次のように文の中に入れて送ってください。
> `The JSON file path is: ~/Downloads/client_secret_....json`

場所を教えてもらったら、こう実行します。

```bash
$GSETUP --client-secret /path/to/client_secret.json
```

ファイルの場所ではなくクライアント ID とクライアントシークレットの値をそのまま
貼られた場合は、こちらで正しい形のデスクトップ用 OAuth の JSON ファイルを書き、
はっきりした場所（たとえば `~/Downloads/hermes-google-client-secret.json`）に
保存してから、そのファイルに対して `--client-secret` を実行してください。

### Step 3: 認可用の URL を取得する {#step-3-get-authorization-url}

Step 1 で決めたサービスの組み合わせを使います。例:

```bash
$GSETUP --auth-url --services email,calendar --format json
$GSETUP --auth-url --services calendar,drive,sheets,docs --format json
$GSETUP --auth-url --services all --format json
```

`auth_url` フィールドを含む JSON が返り、同じ URL が
`~/.hermes/google_oauth_last_url.txt` にも保存されます。

この段階でのエージェント側の決まりごと:
- `auth_url` フィールドを取り出し、その URL をそのまま 1 行で利用者に送ります。
- 承認したあと、ブラウザーは `http://localhost:1` でエラーになるはずだと伝えます。それが正常な動きです。
- ブラウザーのアドレス欄にある、リダイレクト後の URL を丸ごとコピーしてもらってください。
- `Error 403: access_denied` が出た場合は、`https://console.cloud.google.com/auth/audience` へ直接案内して、自分をテストユーザーに追加してもらいます。

### Step 4: コードを交換する {#step-4-exchange-the-code}

利用者が返してくるのは、`http://localhost:1/?code=4/0A...&scope=...` のような URL か、
コードの文字列だけのどちらかです。どちらでも動きます。`--auth-url` の段階で、
処理中の OAuth セッションが一時的に手元に保存されるので、あとから
`--auth-code` で PKCE の交換を終えられます。画面のない環境でも同じです。

```bash
$GSETUP --auth-code "THE_URL_OR_CODE_THE_USER_PASTED" --format json
```

コードの期限切れ、使用済み、古いブラウザーのタブから取ったものなどが原因で
`--auth-code` が失敗した場合は、新しい `fresh_auth_url` が返るようになりました。
そのときは、新しい URL をすぐ利用者に送り、いちばん新しいリダイレクト先だけを
使ってやり直してもらってください。

### Step 5: 確認する {#step-5-verify}

```bash
$GSETUP --check
```

`AUTHENTICATED` と出るはずです。これで設定は完了で、以降はトークンが自動で更新されます。

### 補足 {#notes}

- トークンは `~/.hermes/google_token.json` に保存され、自動で更新されます。
- 処理中の OAuth セッションの state と verifier は、交換が終わるまで一時的に `~/.hermes/google_oauth_pending.json` に置かれます。
- `gws` が入っている場合、`google_api.py` は同じ `~/.hermes/google_token.json` の認証情報をそちらに渡します。利用者が別途 `gws auth login` を実行する必要はありません。
- 取り消すには `$GSETUP --revoke` を実行します。

## 使い方 {#usage}

コマンドはすべて API のスクリプト経由です。`GAPI` を短縮名として決めておきます。

```bash
GAPI="python ${HERMES_HOME:-$HOME/.hermes}/skills/productivity/google-workspace/scripts/google_api.py"
```

### Gmail {#gmail}

```bash
# Search (returns JSON array with id, from, subject, date, snippet)
$GAPI gmail search "is:unread" --max 10
$GAPI gmail search "from:boss@company.com newer_than:1d"
$GAPI gmail search "has:attachment filename:pdf newer_than:7d"

# Read full message (returns JSON with body text)
$GAPI gmail get MESSAGE_ID

# Send
$GAPI gmail send --to user@example.com --subject "Hello" --body "Message text"
$GAPI gmail send --to user@example.com --subject "Report" --body "<h1>Q4</h1><p>Details...</p>" --html
$GAPI gmail send --to user@example.com --subject "Hello" --from '"Research Agent" <user@example.com>' --body "Message text"

# Reply (automatically threads and sets In-Reply-To)
$GAPI gmail reply MESSAGE_ID --body "Thanks, that works for me."
$GAPI gmail reply MESSAGE_ID --from '"Support Bot" <user@example.com>' --body "Thanks"

# Labels
$GAPI gmail labels
$GAPI gmail modify MESSAGE_ID --add-labels LABEL_ID
$GAPI gmail modify MESSAGE_ID --remove-labels UNREAD
```

### Calendar {#calendar}

```bash
# List events (defaults to next 7 days)
$GAPI calendar list
$GAPI calendar list --start 2026-03-01T00:00:00Z --end 2026-03-07T23:59:59Z

# Create event (ISO 8601 with timezone required)
$GAPI calendar create --summary "Team Standup" --start 2026-03-01T10:00:00-06:00 --end 2026-03-01T10:30:00-06:00
$GAPI calendar create --summary "Lunch" --start 2026-03-01T12:00:00Z --end 2026-03-01T13:00:00Z --location "Cafe"
$GAPI calendar create --summary "Review" --start 2026-03-01T14:00:00Z --end 2026-03-01T15:00:00Z --attendees "alice@co.com,bob@co.com"

# Delete event
$GAPI calendar delete EVENT_ID
```

### Drive {#drive}

```bash
# Search existing files
$GAPI drive search "quarterly report" --max 10
$GAPI drive search "mimeType='application/pdf'" --raw-query --max 5

# Get metadata for a single file
$GAPI drive get FILE_ID

# Upload a local file (auto-detects MIME type)
$GAPI drive upload /path/to/report.pdf
$GAPI drive upload /path/to/image.png --name "Logo.png" --parent FOLDER_ID

# Download (binary files download as-is; Google-native files export to a
# sensible default — Docs→pdf, Sheets→csv, Slides→pdf, Drawings→png)
$GAPI drive download FILE_ID
$GAPI drive download DOC_ID --output ~/doc.pdf
$GAPI drive download DOC_ID --export-mime text/plain --output ~/doc.txt

# Create a folder
$GAPI drive create-folder "Reports"
$GAPI drive create-folder "Q4" --parent FOLDER_ID

# Share
$GAPI drive share FILE_ID --email alice@example.com --role reader
$GAPI drive share FILE_ID --email alice@example.com --role writer --notify
$GAPI drive share FILE_ID --type anyone --role reader        # anyone with link
$GAPI drive share FILE_ID --type domain --domain example.com --role reader

# Delete — defaults to trash (reversible). Use --permanent to skip the trash.
$GAPI drive delete FILE_ID
$GAPI drive delete FILE_ID --permanent
```

### Contacts {#contacts}

```bash
$GAPI contacts list --max 20
```

### Sheets {#sheets}

```bash
# Create a new spreadsheet
$GAPI sheets create --title "Q4 Budget"
$GAPI sheets create --title "Inventory" --sheet-name "Stock"

# Read
$GAPI sheets get SHEET_ID "Sheet1!A1:D10"

# Write
$GAPI sheets update SHEET_ID "Sheet1!A1:B2" --values '[["Name","Score"],["Alice","95"]]'

# Append rows
$GAPI sheets append SHEET_ID "Sheet1!A:C" --values '[["new","row","data"]]'
```

### Docs {#docs}

```bash
# Read
$GAPI docs get DOC_ID

# Create a new Doc (optionally seeded with body text)
$GAPI docs create --title "Meeting Notes"
$GAPI docs create --title "Draft" --body "First paragraph..."

# Append text to the end of an existing Doc
$GAPI docs append DOC_ID --text "Additional content to append"
```

## 出力の形式 {#output-format}

コマンドはすべて JSON を返します。`jq` で処理してもそのまま読んでもかまいません。主なフィールドは次のとおりです。

- **Gmail search**: `[{id, threadId, from, to, subject, date, snippet, labels}]`
- **Gmail get**: `{id, threadId, from, to, subject, date, labels, body}`
- **Gmail send/reply**: `{status: "sent", id, threadId}`
- **Calendar list**: `[{id, summary, start, end, location, description, htmlLink}]`
- **Calendar create**: `{status: "created", id, summary, htmlLink}`
- **Drive search**: `[{id, name, mimeType, modifiedTime, webViewLink}]`
- **Drive get**: `{id, name, mimeType, modifiedTime, size, webViewLink, parents, owners}`
- **Drive upload**: `{status: "uploaded", id, name, mimeType, webViewLink}`
- **Drive download**: `{status: "downloaded", id, name, path, mimeType}`
- **Drive create-folder**: `{status: "created", id, name, webViewLink}`
- **Drive share**: `{status: "shared", permissionId, fileId, role, type}`
- **Drive delete**: `{status: "trashed" | "deleted", fileId, permanent}`
- **Contacts list**: `[{name, emails: [...], phones: [...]}]`
- **Sheets get**: `[[cell, cell, ...], ...]`
- **Sheets create**: `{status: "created", spreadsheetId, title, spreadsheetUrl}`
- **Docs create**: `{status: "created", documentId, title, url}`
- **Docs append**: `{status: "appended", documentId, inserted_at, characters}`

## ルール {#rules}

1. **メールの送信、予定の作成と削除、Drive のファイルの削除、ファイルの共有、Docs や Sheets の変更は、必ず先に利用者に確認してから行ってください。** 何をするのか（宛先、ファイル ID、内容、共有の権限）を示して、承認をもらいます。`drive delete` は、`--permanent` より、元に戻せる既定のゴミ箱行きを選んでください。
2. **最初に使う前に認証を確認する。** `setup.py --check` を実行し、通らなければ利用者を設定の手順に案内します。
3. **込み入った検索には Gmail の検索構文の参考資料を使う。** `skill_view("google-workspace", file_path="references/gmail-search-syntax.md")` で読み込めます。
4. **Calendar の時刻にはタイムゾーンを必ず入れる。** ISO 8601 のオフセット付き（例: `2026-03-01T10:00:00-06:00`）か UTC（`Z`）で書いてください。
5. **レート制限を守る。** API を立て続けに呼ぶのは避けます。読み取りはできるだけまとめてください。

## 困ったとき {#troubleshooting}

| 症状 | 対処 |
|---------|-----|
| `NOT_AUTHENTICATED` | 上の設定の Step 2〜5 を実行します |
| `REFRESH_FAILED` | トークンが取り消されたか期限切れです。Step 3〜5 をやり直します |
| `HttpError 403: Insufficient Permission` | API の権限が足りません。`$GSETUP --revoke` してから Step 3〜5 をやり直します |
| `AUTHENTICATED (partial)` または "Token missing scopes" | 新しく増えた書き込み機能（Drive の書き込みと削除、Docs の作成と編集）には認可のやり直しが要ります。`$GSETUP --revoke` してから Step 3〜5 をやり直し、追加された権限を許可してください。 |
| `HttpError 403: Access Not Configured` | API が有効になっていません。利用者が Google Cloud Console で有効にする必要があります |
| `ModuleNotFoundError` | `$GSETUP --install-deps` を実行します |
| 高度な保護機能で認証が止まる | Workspace の管理者が OAuth クライアント ID を許可一覧に入れる必要があります |

## 権限を取り消す {#revoking-access}

```bash
$GSETUP --revoke
```
