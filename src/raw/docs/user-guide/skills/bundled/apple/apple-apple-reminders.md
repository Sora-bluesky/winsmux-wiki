---
title: "Apple Reminders — remindctl で Apple リマインダーを操作する: 追加・一覧・完了"
description: "remindctl で Apple リマインダーを操作する: 追加・一覧・完了"
upstream_path: user-guide/skills/bundled/apple/apple-apple-reminders.md
upstream_blob: 9ab15d6b54785575a74314c816d585475cae2a3f
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/apple/apple-apple-reminders
---

# Apple Reminders {#apple-reminders}

remindctl で Apple リマインダーを操作します。追加・一覧・完了ができます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/apple/apple-reminders` |
| バージョン | `1.0.0` |
| 作者 | Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | macos |
| タグ | `Reminders`, `tasks`, `todo`, `macOS`, `Apple` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Apple Reminders {#apple-reminders}

`remindctl` を使うと、ターミナルから Apple リマインダーを直接操作できます。タスクは iCloud 経由ですべての Apple 製端末に同期されます。

## 事前に必要なもの {#prerequisites}

- **macOS** とリマインダー.app
- インストール: `brew install steipete/tap/remindctl`
- 確認を求められたら、リマインダーへのアクセス権限を許可してください
- 状態の確認: `remindctl status` / 権限の要求: `remindctl authorize`

## こんなときに使います {#when-to-use}

- 「リマインダー」「リマインダーアプリ」と言われたとき
- iOS に同期される個人的な ToDo を、期限つきで作りたいとき
- Apple リマインダーのリストを整理したいとき
- タスクを iPhone / iPad にも表示させたいとき

## 使わないほうがよい場面 {#when-not-to-use}

- エージェントからの通知を予約したい場合 → 代わりに cronjob ツールを使ってください
- カレンダーの予定 → Apple カレンダーか Google カレンダーを使ってください
- プロジェクトのタスク管理 → GitHub Issues や Notion などを使ってください
- 「リマインドして」と言われても、それがエージェントからの通知を指している場合 → 先に意図を確認してください

## 早見表 {#quick-reference}

### リマインダーを見る {#view-reminders}

```bash
remindctl                    # Today's reminders
remindctl today              # Today
remindctl tomorrow           # Tomorrow
remindctl week               # This week
remindctl overdue            # Past due
remindctl all                # Everything
remindctl 2026-01-04         # Specific date
```

### リストを管理する {#manage-lists}

```bash
remindctl list               # List all lists
remindctl list Work          # Show specific list
remindctl list Projects --create    # Create list
remindctl list Work --delete        # Delete list
```

### リマインダーを作る {#create-reminders}

```bash
remindctl add "Buy milk"
remindctl add --title "Call mom" --list Personal --due tomorrow
remindctl add --title "Meeting prep" --due "2026-02-15 09:00"
```

### 期限とアラーム（早めの通知）の違い {#due-time-vs-alarm-early-nudge}

`--due` と `--alarm` は別のフィールドです。

- `--due` はそのリマインダーの期限（日付・時刻）を設定します。
- `--alarm` は EventKit のアラーム、つまり通知が鳴るタイミングを設定します。時刻つきの期限を指定すると、その期限どおりにアラームが設定されることがありますが、早めに知らせてほしいと言われたときは `--alarm` を明示的に渡してください。

期限が 14:00 で、その 30 分前に通知したい場合は次のようにします。

```bash
remindctl add --title "Hairdresser" --due "2026-05-15 14:00" --alarm "2026-05-15 13:30"
```

すでにあるリマインダーを編集する場合は次のようにします。

```bash
remindctl edit 87354 --due "2026-05-15 14:00" --alarm "2026-05-15 13:30"
```

リマインダーの画面では、通知が鳴る時刻を基準に表示・グループ分けされることがあります。期限そのものが動いたと思い込まず、JSON で確かめてください。

```bash
remindctl today --json
```

返ってくる形は次のとおりです。

- `dueDate`: 実際の期限
- `alarmDate`: 通知、つまり早めに知らせるための時刻

Apple が公開している `EKReminder` のドキュメントには、リマインダー固有のプロパティしか載っていません。アラームは継承元の `EKCalendarItem` の挙動によるもので、remindctl の `--alarm` フラグがそれを表に出しています。

### 完了 / 削除 {#complete-delete}

```bash
remindctl complete 1 2 3          # Complete by ID
remindctl delete 4A83 --force     # Delete by ID
```

### 出力の形式 {#output-formats}

```bash
remindctl today --json       # JSON for scripting
remindctl today --plain      # TSV format
remindctl today --quiet      # Counts only
```

## 日付の書き方 {#date-formats}

`--due` と日付での絞り込みで使えます。
- `today`, `tomorrow`, `yesterday`
- `YYYY-MM-DD`
- `YYYY-MM-DD HH:mm`
- ISO 8601（`2026-01-04T12:34:56Z`）

## ルール {#rules}

1. 「リマインドして」と言われたら、Apple リマインダー（スマートフォンに同期される）か、エージェントの cronjob 通知かを確認します
2. 作成する前に、内容と期限を必ず確認します
3. プログラムから読み取るときは `--json` を使います
