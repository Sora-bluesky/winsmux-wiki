---
title: "developer-guide/session-storage"
description: ""
upstream_path: developer-guide/session-storage.md
upstream_blob: 332cc4b618b2553050274e08d531a0729a8a0d67
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/session-storage
---

# セッションの保存領域 {#session-storage}

Hermes Agent は SQLite のデータベース（`~/.hermes/state.db`）を使い、セッションの
メタデータ、メッセージ履歴の全文、モデル設定を、CLI とゲートウェイの
どちらのセッションでも残し続けます。以前のセッションごとの JSONL ファイル方式を置き換えたものです。

ソースファイル: `hermes_state.py`（窓口）と、その兄弟にあたる `hermes_state_*.py` 群（スキーマ、fts、検索、圧縮、可搬性、ゲートウェイ、ほか）

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

`hermes sessions recover` を実行すると、上のうち行を持つテーブルが復旧先の
データベースへコピーされます（FTS の索引と `schema_version` は作り直されます）。
コピー元にあれば、必要になったときだけ作られる `delivery_obligations` の台帳も対象になり、
その行数は `sessions` や `messages` と同じように検証されます。

設計上の要点は次のとおりです。
- **WAL モード**により、読み手が複数いても書き手が 1 つなら並行して動きます（ゲートウェイの複数プラットフォーム対応）
- **FTS5 の仮想テーブル**で、全セッションのメッセージを高速に文字列検索できます
- **セッションの系譜**は `parent_session_id` の連なりで表します（圧縮をきっかけにセッションが分かれたとき）
- **発生元のタグ付け**（`cli`、`telegram`、`discord` など）により、プラットフォーム単位で絞り込めます
- バッチ実行と強化学習の軌跡はここには保存されません（別の仕組みです）

## SQLite のスキーマ {#sqlite-schema}

### sessions テーブル {#sessions-table}

以下は抜粋です。現行の列を全部見るには `hermes_state_common.py` の `SCHEMA_SQL`
（適用するのは `hermes_state_schema.py`）を参照してください。そちらにはゲートウェイの
経路情報である `session_key`、`chat_id`、`chat_type`、`thread_id`、`display_name`、
`origin_json`、`expiry_finalized`、作業環境の `cwd` / `git_branch` / `git_repo_root`、
引き継ぎと圧縮失敗に関する列、`profile_name`、`rewind_count`、`archived`、
`pinned` も含まれます。

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

以下は抜粋です。実際のスキーマには `effect_disposition`、
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
- `tool_calls` は JSON の文字列として保存されます（ツール呼び出しオブジェクトの配列を直列化したもの）
- `reasoning_details`、`codex_reasoning_items`、`codex_message_items` も JSON の文字列で保存されます
- `reasoning` には、生の推論テキストを出すプロバイダの場合にその本文が入ります
- `api_content` はバイト単位で忠実さを保つための控えです。このメッセージについて実際に API へ送った内容の文字列が `content` と食い違うとき（一時的なメモリやプラグインの差し込み、persist による上書きなど）に、送ったとおりの文字列を保持します。プロンプトキャッシュを崩さずに再生できるよう通信時のバイト列を残すもので、例外は単独のサロゲートだけです。これは sqlite3 がバインドできず、会話ループが送信内容から常に取り除いています。`NULL` なら `content` をそのまま送ったという意味です。
- タイムスタンプは Unix エポック秒の浮動小数点数です（`time.time()`）

### FTS5 の全文検索 {#fts5-full-text-search}

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
    content,
    tool_name,
    tool_calls,
    content='messages',
    content_rowid='id'
);
```

FTS5 のテーブルは、`messages` テーブルへの INSERT、UPDATE、DELETE で動く 3 つの
トリガーによって同期されます。現在のトリガーは `state_meta` にある
`fts_rebuild_high_water` / `fts_rebuild_progress` の目印で制御されており（背後で
FTS の作り直しが進んでいても二重に索引されません）、索引対象の 3 列すべてを
扱います。正確な SQL は `hermes_state_common.py` の `SCHEMA_SQL` にあります。

## スキーマのバージョンと移行 {#schema-version-and-migrations}

現在のスキーマバージョン: **23**

`schema_version` テーブルには整数が 1 つだけ入ります。単純な列の追加は `_reconcile_columns()` が宣言的に処理します（実際の列と `SCHEMA_SQL` を突き合わせ、足りない列を ADD します）。バージョンで段階を切る移行の連なりは、宣言的に書けないデータ移行や索引・FTS の変更のために取ってあります。

| バージョン | 変更内容 |
|---------|--------|
| 1 | 最初のスキーマ（sessions、messages、FTS5） |
| 2 | messages に `finish_reason` 列を追加 |
| 3 | sessions に `title` 列を追加 |
| 4 | `title` に一意索引を追加（NULL は許可、NULL 以外は重複不可） |
| 5 | 課金まわりの列を追加: `cache_read_tokens`、`cache_write_tokens`、`reasoning_tokens`、`billing_provider`、`billing_base_url`、`billing_mode`、`estimated_cost_usd`、`actual_cost_usd`、`cost_status`、`cost_source`、`pricing_version` |
| 6 | messages に推論の列を追加: `reasoning`、`reasoning_details`、`codex_reasoning_items` |
| 7 | messages に `reasoning_content` 列を追加 |
| 8 | sessions に `api_call_count` 列を追加 |
| 9 | Codex Responses のメッセージ id とフェーズを再生するため、messages に `codex_message_items` 列を追加 |
| 10 | `messages_fts_trigram` の仮想テーブルを追加（CJK と部分一致の検索向けトライグラム分割器）し、既存の行を埋め直し |
| 11 | `messages_fts` と `messages_fts_trigram` を作り直して `tool_name` と `tool_calls` も対象にし、外部コンテンツ方式からインライン方式へ変更。古いトリガーを落とし、全メッセージ行を入れ直し |
| 16 | 委任した副エージェントの行を `model_config` 内で印付け（`$._delegate_from`）し、親の削除で孤児になってもセッション選択画面が散らからないように |
| 18 | ゲートウェイのメタデータを一本化。`display_name` / `origin_json` / `expiry_finalized` を `sessions.json` から埋め直し |
| 20 | モデル別の使用量の割り当て。過去のセッションごとの合計値から `session_model_usage` の行を作成 |
| 22 | タスクの軸を加えた使用量の割り当て。`task` 列が PRIMARY KEY に加わるように `session_model_usage` を作り直し |
| 23 | FTS の保存方式の見直し。v11 のインライン方式の複製を外部コンテンツ方式の FTS テーブルに置き換え（既存のデータベースは希望した場合のみ移行） |
| 29 | cron のセッションをトライグラム（部分一致・CJK）索引から外す。`messages_fts_trigram_src` ビューとトリガーが `sessions.source` で絞り込み、一度だけの作り直しで過去の行を掃除 |
| 30 | 委任先（副エージェント）のセッションもトライグラム索引から外す。判定は `source='subagent'` か `$._delegate_from` の印（`FTS_TRIGRAM_SESSION_SQL`）。行は `messages` と通常の単語索引 `messages_fts` に残るので `session_search` では見つかり、約 2.6 倍に膨らむトライグラムの影テーブルだけが小さくなる。作り直しは v29 と同じく一度だけ |

上の表に出てこないバージョンは、`_reconcile_columns()` が処理した宣言的な列追加です（バージョンを上げるだけで、データ移行はありません）。

宣言的な列追加では `ALTER TABLE ADD COLUMN` を try/except で包み、列がすでにある場合に備えています（何度実行しても同じ結果になります）。移行の各段階が成功するたびにバージョン番号が上がります。

## 書き込み競合の扱い {#write-contention-handling}

hermes のプロセスが複数（ゲートウェイ、CLI のセッション、worktree のエージェント）あっても、
`state.db` は 1 つを共有します。`SessionDB` クラスは書き込みの競合を次のように処理します。

- **SQLite のタイムアウトを短く**（既定の 30 秒ではなく 1 秒）
- **アプリ側での再試行**にランダムな揺らぎを持たせる（20〜150 ミリ秒、最大 15 回）
- **BEGIN IMMEDIATE** のトランザクションで、ロックの競合をトランザクション開始時に表面化させる
- **WAL のチェックポイント**を書き込み 50 回成功ごとに実行（PASSIVE モード）

これにより、SQLite の内部的な待ち時間が決まりきっているせいで競合する書き手が
同じ間隔でいっせいに再試行してしまう「行列効果」を避けられます。

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

`search_messages()` メソッドは FTS5 のクエリ構文に対応しており、利用者が
入力した文字列は自動で無害化されます。

### 基本の検索 {#basic-search}

```python
results = db.search_messages("docker deployment")
```

### FTS5 のクエリ構文 {#fts5-query-syntax}

| 書き方 | 例 | 意味 |
|--------|---------|---------|
| キーワード | `docker deployment` | 両方の語を含む（暗黙の AND） |
| 引用符で囲む | `"exact phrase"` | その語順どおりに一致 |
| 論理和の OR | `docker OR kubernetes` | どちらかの語を含む |
| 否定の NOT | `python NOT java` | その語を除く |
| 前方一致 | `deploy*` | 先頭が一致 |

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

結果には次が含まれます。
- `id`、`session_id`、`role`、`timestamp`
- `snippet` — FTS5 が作る抜粋。一致部分に `>>>match<<<` の印が付きます
- `context` — 一致した前後 1 件ずつのメッセージ（本文は 200 文字で切られます）
- `source`、`model`、`session_started` — 親セッションから取得

`_sanitize_fts5_query()` メソッドは、次のような際どい入力を処理します。
- 対になっていない引用符や特殊文字を取り除く
- ハイフンを含む語を引用符で囲む（`chat-send` → `"chat-send"`）
- 末尾に残った論理演算子を取り除く（`hello AND` → `hello`）

## セッションの系譜 {#session-lineage}

セッションは `parent_session_id` によって連なりを作れます。ゲートウェイで
文脈の圧縮が起きてセッションが分かれたときにこうなります。

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

### クエリ: 直近のセッションと冒頭の抜粋 {#query-recent-sessions-with-preview}

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

## 書き出しと後始末 {#export-and-cleanup}

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

これは `hermes_constants.get_hermes_home()` から導かれます。既定では `~/.hermes/`
を指し、環境変数 `HERMES_HOME` があればその値になります。

データベース本体、WAL ファイル（`state.db-wal`）、共有メモリのファイル
（`state.db-shm`）は、いずれも同じディレクトリに作られます。
