---
title: "Canvas — API トークンで Canvas LMS の講座と課題を取得する"
description: "API トークンで Canvas LMS の講座と課題を取得する"
upstream_path: user-guide/skills/optional/productivity/productivity-canvas.md
upstream_blob: 90f44f1a61895e171d45d07300e7d6f8e2144106
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/productivity/productivity-canvas
---

# Canvas {#canvas}

API トークンで Canvas LMS の講座と課題を取得します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/productivity/canvas` で入れます |
| パス | `optional-skills/productivity/canvas` |
| バージョン | `1.0.0` |
| 作者 | community |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Canvas`, `LMS`, `Education`, `Courses`, `Assignments` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Canvas LMS — 講座と課題の取得 {#canvas-lms-course-assignment-access}

Canvas LMS に読み取り専用でつなぎ、講座と課題を一覧します。

## スクリプト {#scripts}

- `scripts/canvas_api.py` — Canvas API を呼ぶための Python CLI

## 設定 {#setup}

1. ブラウザで自分の Canvas にログインします
2. **Account → Settings** を開きます（プロフィールのアイコンをクリックして Settings）
3. **Approved Integrations** まで下げて、**+ New Access Token** をクリックします
4. トークンに名前を付け（例:「Hermes Agent」）、必要なら期限を設定して、**Generate Token** をクリックします
5. トークンをコピーして `${HERMES_HOME:-~/.hermes}/.env` に追記します:

```
CANVAS_API_TOKEN=your_token_here
CANVAS_BASE_URL=https://yourschool.instructure.com
```

ベース URL は、Canvas にログインしているときにブラウザに表示されているものです（末尾のスラッシュは付けません）。

## 使い方 {#usage}

```bash
CANVAS="python $HERMES_HOME/skills/productivity/canvas/scripts/canvas_api.py"

# List all active courses
$CANVAS list_courses --enrollment-state active

# List all courses (any state)
$CANVAS list_courses

# List assignments for a specific course
$CANVAS list_assignments 12345

# List assignments ordered by due date
$CANVAS list_assignments 12345 --order-by due_at
```

## 出力の形式 {#output-format}

**list_courses** が返すもの:
```json
[{"id": 12345, "name": "Intro to CS", "course_code": "CS101", "workflow_state": "available", "start_at": "...", "end_at": "..."}]
```

**list_assignments** が返すもの:
```json
[{"id": 67890, "name": "Homework 1", "due_at": "2025-02-15T23:59:00Z", "points_possible": 100, "submission_types": ["online_upload"], "html_url": "...", "description": "...", "course_id": 12345}]
```

補足: 課題の説明は 500 文字で切られます。`html_url` は Canvas 上の課題ページ全体へのリンクです。

## API の早見表（curl） {#api-reference-curl}

```bash
# List courses
curl -s -H "Authorization: Bearer $CANVAS_API_TOKEN" \
  "$CANVAS_BASE_URL/api/v1/courses?enrollment_state=active&per_page=10"

# List assignments for a course
curl -s -H "Authorization: Bearer $CANVAS_API_TOKEN" \
  "$CANVAS_BASE_URL/api/v1/courses/COURSE_ID/assignments?per_page=10&order_by=due_at"
```

Canvas はページ送りに `Link` ヘッダーを使います。Python スクリプトのほうは、ページ送りを自動で処理します。

## ルール {#rules}

- この skill は**読み取り専用**です。データを取ってくるだけで、講座や課題を書き換えることはありません
- 最初に使うときは `$CANVAS list_courses` を実行して認証を確かめます。401 で失敗したら、設定の手順を案内してください
- Canvas には 10 分あたり 700 リクエスト程度の制限があります。上限に当たりそうなら `X-Rate-Limit-Remaining` ヘッダーを見てください

## 困ったとき {#troubleshooting}

| 症状 | 対処 |
|---------|-----|
| 401 Unauthorized | トークンが無効か期限切れです。Canvas の Settings で作り直してください |
| 403 Forbidden | その講座に対する権限がトークンにありません |
| 講座が空で返る | `--enrollment-state active` を付けるか、逆にフラグを外して全状態を見てください |
| 学校が違う | `CANVAS_BASE_URL` がブラウザの URL と一致しているか確かめてください |
| タイムアウトする | 自分の Canvas への通信ができているか確かめてください |
