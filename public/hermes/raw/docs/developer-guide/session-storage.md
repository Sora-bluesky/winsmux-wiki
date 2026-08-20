---
title: "developer-guide/session-storage"
description: ""
upstream_path: developer-guide/session-storage.md
upstream_blob: 0ff701d7f3c34d93df4cf97fb78bf27b14cb8382
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/session-storage
---

# セッションストレージ {#session-storage}

Hermes Agent は SQLite のデータベース（`~/.hermes/state.db`）を使って、セッションの
メタデータ、メッセージ履歴の全文、モデル設定を、CLI とゲートウェイのセッションを
またいで保存します。これは以前のセッションごとの JSONL ファイル方式に代わるものです。

ソースファイル: `hermes_state.py`

## アーキテクチャの全体像 {#architecture-overview}

```
~/.hermes/state.db (SQLite, WAL mode)
├── sessions              — Session metadata, token counts, billing
├── messages              — Full message history per session
├── session_model_usage   — Per-model/per-task usage attribution rows
├── messages_fts          — FTS5 virtual table (content + tool_name + tool_calls)
├── messages_fts_trigram  — FTS5 virtual table with trigram tokenizer (CJK / substring search)
├── messages_fts_cjk      — FTS5 virtual table with cjk_unicode61 tokenizer
├── state_meta            — Key/value metadata table
├── gateway_routing       — Gateway routing metadata
├── compression_locks     — Cross-process compression locking
├── async_delegations     — Async delegation bookkeeping
└── schema_version        — Single-row table tracking migration state
```

設計上の要点は次のとおりです。
- **WAL モード** により、読み手が複数いても書き手が 1 つなら同時に動けます（ゲートウェイの複数プラットフォーム運用向け）
- **FTS5 の仮想テーブル** により、全セッションのメッセージを高速に全文検索できます
- **セッションの系譜** を `parent_session_id` の連なりで表します（圧縮による分割で発生します）
- **送信元のタグ付け**（`cli`、`telegram`、`discord` など）でプラットフォーム別に絞り込めます
- バッチランナーと RL の軌跡はここには保存されません（別の仕組みです）

## SQLite のスキーマ {#sqlite-schema}

### sessions テーブル {#sessions-table}

抜粋です。現在の全カラムは `hermes_state.py` の `SCHEMA_SQL` を参照してください
（`session_key`、`chat_id`、`chat_type`、`thread_id`、`display_name`、`origin_json`、
`expiry_finalized` といったゲートウェイの経路情報、`cwd` / `git_branch` /
`git_repo_root` の作業環境フィールド、引き継ぎと圧縮失敗のフィールド、
`profile_name`、`rewind_count`、`archived`、`pinned` も含まれます）。

```sql
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    user_id TEXT,
    model TEXT,
    model_config TEXT,
    system_prompt TEXT,
    parent_session_id TEXT,
    started_at REAL NOT NULL,
    ended_at REAL,
    end_reason TEXT,
    message_count INTEGER DEFAULT 0,
    tool_call_count INTEGER DEFAULT 0,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cache_read_tokens INTEGER DEFAULT 0,
    cache_write_tokens INTEGER DEFAULT 0,
    reasoning_tokens INTEGER DEFAULT 0,
    billing_provider TEXT,
    billing_base_url TEXT,
    billing_mode TEXT,
    estimated_cost_usd REAL,
    actual_cost_usd REAL,
    cost_status TEXT,
    cost_source TEXT,
    pricing_version TEXT,
    title TEXT,
    api_call_count INTEGER DEFAULT 0,
    -- ... additional gateway/workspace/handoff/compression columns ...
    FOREIGN KEY (parent_session_id) REFERENCES sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_source ON sessions(source);
CREATE INDEX IF NOT EXISTS idx_sessions_parent ON sessions(parent_session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_title_unique
    ON sessions(title) WHERE title IS NOT NULL;
```

### messages テーブル {#messages-table}

抜粋です。実際のスキーマには `effect_disposition`、
`platform_message_id`、`observed`、`active`、`compacted`、`api_content`、
`display_kind`、`display_metadata` も含まれます。

```sql
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    role TEXT NOT NULL,
    content TEXT,
    tool_call_id TEXT,
    tool_calls TEXT,
    tool_name TEXT,
    timestamp REAL NOT NULL,
    token_count INTEGER,
    finish_reason TEXT,
    reasoning TEXT,
    reasoning_content TEXT,
    reasoning_details TEXT,
    codex_reasoning_items TEXT,
    codex_message_items TEXT
    -- ... additional display/compaction columns ...
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id, id);
```

補足:
- `tool_calls` は JSON 文字列として保存されます（ツール呼び出しオブジェクトのリストを直列化したもの）
- `reasoning_details`、`codex_reasoning_items`、`codex_message_items` も JSON 文字列として保存されます
- `reasoning` には、推論内容を返すプロバイダの生テキストが入ります
- `api_content` はバイト単位で忠実さを保つための控えです。このメッセージで実際に API へ送られた内容が `content` と異なる場合（一時的なメモリやプラグインの差し込み、上書き保存など）に、その文字列を保持します。プロンプトキャッシュを崩さずに再送するために送信時のバイト列をそのまま残しますが、単独のサロゲートだけは例外です（sqlite3 がバインドできず、会話ループも送信内容から必ず取り除きます）。`NULL` は `content` がそのまま送られたことを意味します
- タイムスタンプは Unix エポック秒の浮動小数点値です（`time.time()`）

### FTS5 による全文検索 {#fts5-full-text-search}

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
    content,
    tool_name,
    tool_calls,
    content='messages',
    content_rowid='id'
);
```

FTS5 のテーブルは、`messages` テーブルの INSERT、UPDATE、DELETE で発火する
3 つのトリガーによって同期されます。現在のトリガーは `state_meta` にある
`fts_rebuild_high_water` / `fts_rebuild_progress` のマーカーで制御されており
（バックグラウンドで FTS を作り直しても二重に索引付けされないようにするためです）、
索引対象の 3 カラムすべてを扱います。正確な SQL は `hermes_state.py` の `SCHEMA_SQL` を参照してください。

## スキーマのバージョンと移行 {#schema-version-and-migrations}

現在のスキーマバージョン: **23**

`schema_version` テーブルには整数が 1 つだけ入っています。単純なカラム追加は `_reconcile_columns()` が宣言的に処理します（実際のカラムと `SCHEMA_SQL` を突き合わせ、足りないものを ADD します）。バージョンで管理する処理の連なりは、宣言的には表せないデータ移行や索引・FTS の変更のために取ってあります。

| バージョン | 変更内容 |
|---------|--------|
| 1 | 最初のスキーマ（sessions、messages、FTS5） |
| 2 | messages に `finish_reason` カラムを追加 |
| 3 | sessions に `title` カラムを追加 |
| 4 | `title` に一意索引を追加（NULL は許可、NULL 以外は一意） |
| 5 | 課金関連のカラムを追加: `cache_read_tokens`、`cache_write_tokens`、`reasoning_tokens`、`billing_provider`、`billing_base_url`、`billing_mode`、`estimated_cost_usd`、`actual_cost_usd`、`cost_status`、`cost_source`、`pricing_version` |
| 6 | messages に推論関連のカラムを追加: `reasoning`、`reasoning_details`、`codex_reasoning_items` |
| 7 | messages に `reasoning_content` カラムを追加 |
| 8 | sessions に `api_call_count` カラムを追加 |
| 9 | Codex Responses のメッセージ ID と段階を再現するため、messages に `codex_message_items` カラムを追加 |
| 10 | `messages_fts_trigram` の仮想テーブルを追加（CJK と部分一致検索のための trigram トークナイザ）し、既存の行を埋め直し |
| 11 | `messages_fts` と `messages_fts_trigram` を作り直して `tool_name` と `tool_calls` も対象に含め、外部コンテンツ方式からインライン方式へ変更。古いトリガーを削除し、全メッセージ行を埋め直し |
| 16 | 委任したサブエージェントの行に `model_config` でタグを付け（`$._delegate_from`）、親の削除で孤立した後もセッション選択の一覧が乱れないように |
| 18 | ゲートウェイのメタデータを統合 — `display_name` / `origin_json` / `expiry_finalized` を `sessions.json` から埋め直し |
| 20 | モデル別の使用量の集計 — 過去のセッションごとの合計値から `session_model_usage` の行を作成 |
| 22 | タスク軸での使用量の集計 — `task` カラムを PRIMARY KEY に含める形で `session_model_usage` を作り直し |
| 23 | FTS の保存方式の見直し — v11 のインライン方式の複製を外部コンテンツ方式の FTS テーブルに置き換え（既存 DB では任意で移行） |

上記に挙がっていないバージョンは、`_reconcile_columns()` が処理した宣言的なカラム追加です（バージョンを上げるだけで、データ移行はありません）。

宣言的なカラム追加では `ALTER TABLE ADD COLUMN` を try/except で囲み、すでにカラムがある場合にも対応します（何度実行しても同じ結果になります）。バージョン番号は、移行の処理が成功するたびに上がります。

## 書き込みの競合への対処 {#write-contention-handling}

複数の hermes プロセス（ゲートウェイ、CLI のセッション、worktree のエージェント）が
1 つの `state.db` を共有します。`SessionDB` クラスは書き込みの競合を次のように扱います。

- **SQLite のタイムアウトを短くする**（既定の 30 秒ではなく 1 秒）
- **アプリ側での再試行** をランダムな揺らぎ付きで行う（20〜150 ミリ秒、最大 15 回）
- **BEGIN IMMEDIATE** のトランザクションで、ロックの競合を開始時点で表面化させる
- **定期的な WAL のチェックポイント** を書き込み 50 回ごとに行う（PASSIVE モード）

これにより、SQLite の内部的な待ち時間が決まった値であるために競合する書き手が
同じ間隔で一斉に再試行してしまう「行列効果」を避けられます。

```
_WRITE_MAX_RETRIES = 15
_WRITE_RETRY_MIN_S = 0.020   # 20ms
_WRITE_RETRY_MAX_S = 0.150   # 150ms
_CHECKPOINT_EVERY_N_WRITES = 50
```

## よく使う操作 {#common-operations}

### 初期化 {#initialize}

```python
from hermes_state import SessionDB

db = SessionDB()                           # Default: ~/.hermes/state.db
db = SessionDB(db_path=Path("/tmp/test.db"))  # Custom path
```

### セッションの作成と管理 {#create-and-manage-sessions}

```python
# Create a new session
db.create_session(
    session_id="sess_abc123",
    source="cli",
    model="anthropic/claude-sonnet-4.6",
    user_id="user_1",
    parent_session_id=None,  # or previous session ID for lineage
)

# End a session
db.end_session("sess_abc123", end_reason="user_exit")

# Reopen a session (clear ended_at/end_reason)
db.reopen_session("sess_abc123")
```

### メッセージの保存 {#store-messages}

```python
msg_id = db.append_message(
    session_id="sess_abc123",
    role="assistant",
    content="Here's the answer...",
    tool_calls=[{"id": "call_1", "function": {"name": "terminal", "arguments": "{}"}}],
    token_count=150,
    finish_reason="stop",
    reasoning="Let me think about this...",
)
```

### メッセージの取り出し {#retrieve-messages}

```python
# Raw messages with all metadata
messages = db.get_messages("sess_abc123")

# OpenAI conversation format (for API replay)
conversation = db.get_messages_as_conversation("sess_abc123")
# Returns: [{"role": "user", "content": "..."}, {"role": "assistant", ...}]
```

### セッションのタイトル {#session-titles}

```python
# Set a title (must be unique among non-NULL titles)
db.set_session_title("sess_abc123", "Fix Docker Build")

# Resolve by title (returns most recent in lineage)
session_id = db.resolve_session_by_title("Fix Docker Build")

# Auto-generate next title in lineage
next_title = db.get_next_title_in_lineage("Fix Docker Build")
# Returns: "Fix Docker Build #2"
```

## 全文検索 {#full-text-search}

`search_messages()` メソッドは FTS5 のクエリ構文に対応しており、利用者の入力は
自動的に無害化されます。

### 基本の検索 {#basic-search}

```python
results = db.search_messages("docker deployment")
```

### FTS5 のクエリ構文 {#fts5-query-syntax}

| 構文 | 例 | 意味 |
|--------|---------|---------|
| キーワード | `docker deployment` | 両方の語を含む（暗黙の AND） |
| 引用符で囲んだ語句 | `"exact phrase"` | 語句がそのまま一致 |
| 論理和 OR | `docker OR kubernetes` | どちらかの語 |
| 否定 NOT | `python NOT java` | その語を除く |
| 前方一致 | `deploy*` | 前方一致 |

### 絞り込み検索 {#filtered-search}

```python
# Search only CLI sessions
results = db.search_messages("error", source_filter=["cli"])

# Exclude gateway sessions
results = db.search_messages("bug", exclude_sources=["telegram", "discord"])

# Search only user messages
results = db.search_messages("help", role_filter=["user"])
```

### 検索結果の形式 {#search-results-format}

各結果には次が含まれます。
- `id`、`session_id`、`role`、`timestamp`
- `snippet` — FTS5 が生成した抜粋で、一致箇所が `>>>match<<<` で囲まれます
- `context` — 一致した前後 1 件ずつのメッセージ（本文は 200 文字で切られます）
- `source`、`model`、`session_started` — 親セッションの情報

`_sanitize_fts5_query()` メソッドは、次のような際どい入力を整えます。
- 対になっていない引用符や特殊文字を取り除きます
- ハイフンを含む語を引用符で囲みます（`chat-send` → `"chat-send"`）
- 宙に浮いた論理演算子を取り除きます（`hello AND` → `hello`）

## セッションの系譜 {#session-lineage}

セッションは `parent_session_id` によって連なりを作れます。これは文脈の圧縮が
ゲートウェイでセッションの分割を引き起こしたときに起こります。

### クエリ: セッションの系譜をたどる {#query-find-session-lineage}

```sql
-- Find all ancestors of a session
WITH RECURSIVE lineage AS (
    SELECT * FROM sessions WHERE id = ?
    UNION ALL
    SELECT s.* FROM sessions s
    JOIN lineage l ON s.id = l.parent_session_id
)
SELECT id, title, started_at, parent_session_id FROM lineage;

-- Find all descendants of a session
WITH RECURSIVE descendants AS (
    SELECT * FROM sessions WHERE id = ?
    UNION ALL
    SELECT s.* FROM sessions s
    JOIN descendants d ON s.parent_session_id = d.id
)
SELECT id, title, started_at FROM descendants;
```

### クエリ: 最近のセッションと冒頭の抜粋 {#query-recent-sessions-with-preview}

```sql
SELECT s.*,
    COALESCE(
        (SELECT SUBSTR(m.content, 1, 63)
         FROM messages m
         WHERE m.session_id = s.id AND m.role = 'user' AND m.content IS NOT NULL
         ORDER BY m.timestamp, m.id LIMIT 1),
        ''
    ) AS preview,
    COALESCE(
        (SELECT MAX(m2.timestamp) FROM messages m2 WHERE m2.session_id = s.id),
        s.started_at
    ) AS last_active
FROM sessions s
ORDER BY s.started_at DESC
LIMIT 20;
```

### クエリ: トークン使用量の統計 {#query-token-usage-statistics}

```sql
-- Total tokens by model
SELECT model,
       COUNT(*) as session_count,
       SUM(input_tokens) as total_input,
       SUM(output_tokens) as total_output,
       SUM(estimated_cost_usd) as total_cost
FROM sessions
WHERE model IS NOT NULL
GROUP BY model
ORDER BY total_cost DESC;

-- Sessions with highest token usage
SELECT id, title, model, input_tokens + output_tokens AS total_tokens,
       estimated_cost_usd
FROM sessions
ORDER BY total_tokens DESC
LIMIT 10;
```

## 書き出しと後片付け {#export-and-cleanup}

```python
# Export a single session with messages
data = db.export_session("sess_abc123")

# Export all sessions (with messages) as list of dicts
all_data = db.export_all(source="cli")

# Delete old sessions (only ended sessions)
deleted_count = db.prune_sessions(older_than_days=90)
deleted_count = db.prune_sessions(older_than_days=30, source="telegram")

# Clear messages but keep the session record
db.clear_messages("sess_abc123")

# Delete session and all messages
db.delete_session("sess_abc123")
```

## データベースの場所 {#database-location}

既定のパス: `~/.hermes/state.db`

これは `hermes_constants.get_hermes_home()` から導かれ、既定では `~/.hermes/`、
環境変数 `HERMES_HOME` が設定されていればその値になります。

データベース本体、WAL ファイル（`state.db-wal`）、共有メモリのファイル
（`state.db-shm`）は、いずれも同じディレクトリに作られます。
