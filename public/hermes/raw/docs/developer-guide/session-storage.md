---
title: "セッションの保存"
description: ""
upstream_path: developer-guide/session-storage.md
upstream_blob: 4627b0ffa640f07d32b9a82963bd1f46cc6ee096
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/session-storage
---

# セッションの保存 {#session-storage}

Hermes Agent は SQLite のデータベース（`~/.hermes/state.db`）を使って、セッションの
付随情報、メッセージの履歴、モデルの設定を、CLI とゲートウェイの両方にまたがって
残しています。以前はセッションごとの JSONL ファイルでしたが、それを置き換えたものです。

対象のソース: `hermes_state.py`

## 全体の構成 {#architecture-overview}

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
├── delivery_obligations  — Gateway outbox (owed replies); created lazily by gateway/delivery_ledger.py
└── schema_version        — Single-row table tracking migration state
```

`hermes sessions recover` は、上の行を持つテーブルを復旧先のデータベースへ写します
（全文検索の索引と `schema_version` は作り直されます）。必要になってから作られる
`delivery_obligations` の台帳も、元のデータベースにあれば一緒に写り、その行数は
`sessions` や `messages` と同じように検証されます。

設計上の要点は次のとおりです。
- 読み手が複数、書き手がひとつという形（基盤をまたぐゲートウェイ）のための **WAL モード**
- すべてのセッションのメッセージを素早く探すための **FTS5 の仮想テーブル**
- `parent_session_id` の連なりによる**セッションの系譜**（圧縮によって分かれた場合）
- 基盤で絞り込むための**出どころの記録**（`cli`、`telegram`、`discord` など）
- まとめて動かす仕組みと強化学習の記録は、ここには保存されません（別の仕組みです）

## SQLite の構造 {#sqlite-schema}

### sessions テーブル {#sessions-table}

抜粋です。現在の列の全体は `hermes_state.py` の `SCHEMA_SQL` を見てください
（`session_key`、`chat_id`、`chat_type`、`thread_id`、`display_name`、`origin_json`、
`expiry_finalized` といったゲートウェイの振り分けの情報、作業場所の
`cwd` / `git_branch` / `git_repo_root`、引き継ぎと圧縮の失敗に関する列、
`profile_name`、`rewind_count`、`archived`、`pinned` も含みます）。

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

抜粋です。実際の構造には `effect_disposition`、
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

補足です。
- `tool_calls` は JSON の文字列として保存されます（ツールの呼び出しを並べたものを直列化したもの）
- `reasoning_details`、`codex_reasoning_items`、`codex_message_items` も JSON の文字列として保存されます
- `reasoning` には、それを見せてくれるプロバイダの場合に、推論の生の文面が入ります
- `api_content` は、バイト単位で忠実に残すための控えです。そのメッセージについて API へ実際に送った文字列が `content` と違うとき（その場かぎりのメモリやプラグインの差し込み、保存内容の上書きなど）に入ります。プロンプトキャッシュを崩さずに再送できるよう、送ったときのバイトをそのまま保ちます。例外は対になっていないサロゲートで、これは sqlite3 が受け付けられず、会話のループもすべての送信内容から取り除いています。`NULL` は、`content` をそのまま送ったという意味です
- 時刻は Unix エポックの浮動小数点数です（`time.time()`）

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

FTS5 のテーブルは、`messages` テーブルの INSERT・UPDATE・DELETE で動く3つの
トリガーによって同期が保たれます。今のトリガーは `state_meta` にある
`fts_rebuild_high_water` / `fts_rebuild_progress` の印を見て働くので
（背後で索引を作り直しているあいだ、二重に索引されずに済みます）、索引の対象となる
3つの列すべてを扱います。実際の SQL は `hermes_state.py` の `SCHEMA_SQL` を見てください。

## 構造の版と移行 {#schema-version-and-migrations}

現在の構造の版: **23**

`schema_version` テーブルには整数がひとつだけ入っています。単純な列の追加は `_reconcile_columns()` が宣言的に扱います（実際の列と `SCHEMA_SQL` を突き合わせ、足りないものを ADD します）。版で区切られた移行の連なりは、宣言では書けないデータの移行や、索引・全文検索の変更のために取ってあります。

| 版 | 変更の内容 |
|---------|--------|
| 1 | 最初の構造（sessions、messages、FTS5） |
| 2 | messages に `finish_reason` の列を追加 |
| 3 | sessions に `title` の列を追加 |
| 4 | `title` に一意の索引を追加（NULL は許し、NULL でないものは重複させない） |
| 5 | 課金に関する列を追加: `cache_read_tokens`、`cache_write_tokens`、`reasoning_tokens`、`billing_provider`、`billing_base_url`、`billing_mode`、`estimated_cost_usd`、`actual_cost_usd`、`cost_status`、`cost_source`、`pricing_version` |
| 6 | messages に推論の列を追加: `reasoning`、`reasoning_details`、`codex_reasoning_items` |
| 7 | messages に `reasoning_content` の列を追加 |
| 8 | sessions に `api_call_count` の列を追加 |
| 9 | Codex の Responses でメッセージの ID と段階を再現するため、messages に `codex_message_items` の列を追加 |
| 10 | `messages_fts_trigram` の仮想テーブルを追加し（日本語などの言語や部分一致の検索のための trigram の区切り方）、既存の行を埋め直す |
| 11 | `messages_fts` と `messages_fts_trigram` の索引を作り直して `tool_name` と `tool_calls` を対象に加え、外部の内容を参照する方式から中に持つ方式へ切り替える。古いトリガーを捨て、すべてのメッセージの行を埋め直す |
| 16 | 委任した副エージェントの行に `model_config` で印を付け（`$._delegate_from`）、親が消えて迷子になってもセッションの選択画面が散らからないようにする |
| 18 | ゲートウェイの情報の集約 — `sessions.json` から `display_name` / `origin_json` / `expiry_finalized` を埋め直す |
| 20 | モデルごとの利用量の記録 — これまでのセッション単位の合計から `session_model_usage` の行を作る |
| 22 | 作業の種類も含めた利用量の記録 — `task` の列が主キーに加わるよう `session_model_usage` を作り直す |
| 23 | 全文検索の保存方法の見直し — v11 で中に持つ方式にした写しを、外部の内容を参照する方式のテーブルに置き換える（既存のデータベースでは任意で移ります） |
| 29 | cron のセッションを trigram（部分一致や日本語などの言語向け）の索引から外す。`messages_fts_trigram_src` のビューとトリガーが `sessions.source` で絞り込み、一度だけ索引を作り直して過去の行を取り除く |
| 30 | 委任した子（副エージェント）のセッションも trigram の索引から外す。判定は `source='subagent'` か `$._delegate_from` の印（`FTS_TRIGRAM_SESSION_SQL`）。行そのものは `messages` にも通常の単語索引 `messages_fts` にも残るので `session_search` では見つかり、およそ 2.6 倍の大きさになる trigram の陰のテーブルだけが小さくなる。v29 と同じく、作り直しは一度だけ |

上に挙がっていない版は、`_reconcile_columns()` が扱う宣言的な列の追加でした（版の番号が上がるだけで、データの移行はありません）。

宣言的な列の追加は `ALTER TABLE ADD COLUMN` を try/except で包み、すでにその列がある場合に備えます（何度実行しても同じ結果になります）。版の番号は、移行の各段落が成功するたびに上がります。

## 書き込みの競合への対処 {#write-contention-handling}

複数の hermes のプロセス（ゲートウェイ、CLI のセッション、worktree のエージェント）が
ひとつの `state.db` を共有します。`SessionDB` クラスは、書き込みの競合に次のように
対処します。

- **SQLite の待ち時間を短くする**（既定の30秒ではなく1秒）
- **アプリ側での再試行**を、ばらつきを持たせて行う（20〜150ミリ秒、最大15回）
- **BEGIN IMMEDIATE** のトランザクションで、ロックの競合を開始時に表に出す
- 書き込みが50回成功するたびに **WAL の点検**を行う（PASSIVE モード）

これによって、SQLite の内部の待ち時間が決まりきっているために、競合する書き手が
そろって同じ間隔で再試行してしまう「行列の効果」を避けられます。

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

### セッションを作る・管理する {#create-and-manage-sessions}

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

### メッセージを保存する {#store-messages}

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

### メッセージを取り出す {#retrieve-messages}

```python
# Raw messages with all metadata
messages = db.get_messages("sess_abc123")

# OpenAI conversation format (for API replay)
conversation = db.get_messages_as_conversation("sess_abc123")
# Returns: [{"role": "user", "content": "..."}, {"role": "assistant", ...}]
```

### セッションの題名 {#session-titles}

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

`search_messages()` は FTS5 の書き方に対応していて、利用者の入力は自動的に
安全な形へ整えられます。

### 基本の検索 {#basic-search}

```python
results = db.search_messages("docker deployment")
```

### FTS5 の書き方 {#fts5-query-syntax}

| 書き方 | 例 | 意味 |
|--------|---------|---------|
| 語を並べる | `docker deployment` | どちらの語も含む（暗黙の AND） |
| 引用符で囲む | `"exact phrase"` | その並びのまま一致する |
| OR | `docker OR kubernetes` | どちらかの語を含む |
| NOT | `python NOT java` | その語を除く |
| 前方一致 | `deploy*` | 先頭が一致する |

### 絞り込んだ検索 {#filtered-search}

```python
# Search only CLI sessions
results = db.search_messages("error", source_filter=["cli"])

# Exclude gateway sessions
results = db.search_messages("bug", exclude_sources=["telegram", "discord"])

# Search only user messages
results = db.search_messages("help", role_filter=["user"])
```

### 検索結果の形 {#search-results-format}

結果にはそれぞれ次のものが入ります。
- `id`、`session_id`、`role`、`timestamp`
- `snippet` — FTS5 が作る抜粋。一致した箇所に `>>>match<<<` の印が付きます
- `context` — 一致した前後1件ずつのメッセージ（中身は200文字までに切られます）
- `source`、`model`、`session_started` — 親のセッションから取ったもの

`_sanitize_fts5_query()` は、扱いに困る入力を次のように始末します。
- 対になっていない引用符と特殊な文字を取り除く
- ハイフンを含む語を引用符で包む（`chat-send` → `"chat-send"`）
- 宙に浮いた論理演算子を取り除く（`hello AND` → `hello`）

## セッションの系譜 {#session-lineage}

セッションは `parent_session_id` でつながり、連なりを作れます。ゲートウェイで
コンテキストの圧縮がセッションを分けたときに、これが起きます。

### 問い合わせ: セッションの系譜をたどる {#query-find-session-lineage}

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

### 問い合わせ: 最近のセッションと冒頭の抜粋 {#query-recent-sessions-with-preview}

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

### 問い合わせ: トークンの使用量の集計 {#query-token-usage-statistics}

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

## 書き出しと片づけ {#export-and-cleanup}

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

## データベースの置き場所 {#database-location}

既定のパス: `~/.hermes/state.db`

これは `hermes_constants.get_hermes_home()` から決まります。既定では
`~/.hermes/` に、あるいは環境変数 `HERMES_HOME` の値に解決されます。

データベースのファイル、WAL のファイル（`state.db-wal`）、共有メモリのファイル
（`state.db-shm`）は、すべて同じディレクトリに作られます。
