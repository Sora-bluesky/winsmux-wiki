---
title: "ゲートウェイのセッションライフサイクル"
description: "ゲートウェイにおける SessionSource・SessionEntry・SessionStore、セッションキーの規則、マルチユーザーの分離"
upstream_path: developer-guide/gateway-session-lifecycle.md
upstream_blob: 21c78aa6a09dec00c6a6bace5ff5912f5b672686
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/gateway-session-lifecycle
---

# セッションのライフサイクル {#session-lifecycle}

> **対象読者:** ゲートウェイの開発者とメンテナー
> **ソースファイル:** `gateway/session.py`（約1200行 + 兄弟ファイルの `session_*.py`）、`gateway/run.py`（約5500行のファサード + 各フェーズの `run_*.py`）、`gateway/config.py`
> **最終更新:** 2026-06-16

## 概要 {#overview}

**セッション**とは、メッセージングプラットフォーム上でエージェントと1人以上のユーザーが続けている、ひと続きの会話のことです。
セッションのライフサイクルは、会話をいつ保持し、いつリセットするか、
ゲートウェイの再起動をどう乗り越えるか、同時に処理が走っているあいだメッセージをどうキューに積むかを決めています。

セッションの仕組みは主に2つのモジュールにあります。

- `gateway/session.py` — データモデル（`SessionSource`、`SessionEntry`、`SessionContext`）、
  キーの生成（`build_session_key`）、メインのストア（`SessionStore`）。
- `gateway/run.py` — ゲートウェイランナー（`GatewayRunner`）のファサードで、セッションをメッセージ処理の
  パイプラインにつなぎます。各フェーズは兄弟ファイルの `run_*.py` にあります。セッションの定期整理
  （`run_watchers.py`）、エージェントのキャッシュ（`run_agent_cache.py`）、再起動からの復旧
  （`session_recovery.py`）、メッセージのキューイング（`run_busy.py`）です。

---

## 1. SessionSource — メッセージの出どころを表す記述子 {#1-sessionsource-message-origin-descriptor}

`SessionSource` は、*メッセージがどこから来たか*を記録した変更不可のレコードです。受信するすべての
`MessageEvent` に付与され、ルーティング、分離、コンテキストの注入に使われます。

### フィールド {#fields}

| フィールド | 型 | 既定値 | 説明 |
|---|---|---|---|
| `platform` | `Platform` | *（必須）* | メッセージングプラットフォームを識別する列挙型（telegram、discord、slack、signal、whatsapp、matrix、local など）。 |
| `chat_id` | `str` | *（必須）* | プラットフォーム側のチャット／グループ／チャンネルの識別子。アダプターの `chat_id_key` 変換を通して扱われます。 |
| `chat_name` | `Optional[str]` | `None` | チャットやグループの、人が読める名前。 |
| `chat_type` | `str` | `"dm"` | `"dm"`、`"group"`、`"channel"`、`"thread"` のいずれか。セッションキーの生成と分離の方法を決めます。 |
| `user_id` | `Optional[str]` | `None` | プラットフォーム固有のユーザー識別子。認可と、ユーザーごとのセッション分離に使われます。 |
| `user_name` | `Optional[str]` | `None` | メッセージ送信者の表示名。システムプロンプトに注入されます。 |
| `thread_id` | `Optional[str]` | `None` | フォーラムのトピック／Discord のスレッド／Slack のスレッドの識別子。スレッド内の会話を区別します。 |
| `chat_topic` | `Optional[str]` | `None` | チャンネルのトピックや説明（Discord のチャンネルトピック、Slack のチャンネルの目的）。 |
| `user_id_alt` | `Optional[str]` | `None` | プラットフォーム固有の、変わらない代替 ID（Signal の UUID、Feishu の union_id）。`user_id` が一時的なものの場合に使われます。 |
| `chat_id_alt` | `Optional[str]` | `None` | Signal グループの内部 ID。Signal グループ V2 の識別子を正規の形に対応づけます。 |
| `is_bot` | `bool` | `False` | メッセージの送信者がボットや Webhook（Discord のボット）のとき True。 |
| `guild_id` | `Optional[str]` | `None` | Discord のギルド／Slack のワークスペース／Matrix のサーバーという範囲を示す識別子。 |
| `parent_chat_id` | `Optional[str]` | `None` | `chat_id` がスレッドを指すときの、親チャンネル。 |
| `message_id` | `Optional[str]` | `None` | きっかけになったメッセージの ID。ピン留め／返信／リアクションの操作と、Discord の ID 注入に使われます（注入される `[Triggering message id: …]` の注記が乗るのは API へ送るメッセージだけで、保存される user の行は書かれたままの本文を保ちます）。 |
| `role_authorized` | `bool` | `False` | アダプターが（個々のユーザー ID ではなく）プラットフォームのロールによってアクセスを許可したとき True。 |

### 主なメソッド {#key-methods}

- **`description`**（プロパティ: `str`）— 人が読める要約。例: `"DM with Alice"`、
  `"group: My Group, thread: 12345"`。
- **`to_dict()` / `from_dict()`** — `sessions.json` に保存するためのシリアライズと復元の往復。

---

## 2. SessionEntry — 有効なセッションの記録 {#2-sessionentry-active-session-record}

`SessionEntry` はセッションごとのメタデータの記録で、メモリ上に置かれ、
`{sessions_dir}/sessions.json` に保存されます。各エントリーは `session_key` を、そのときの `session_id` に対応づけます。

### フィールド {#fields}

| フィールド | 型 | 既定値 | 説明 |
|---|---|---|---|
| `session_key` | `str` | *（必須）* | 会話のレーンを識別する、決定的なキー（§4 を参照）。 |
| `session_id` | `str` | *（必須）* | この会話の、この回の実体を表す一意の識別子。形式: `YYYYMMDD_HHMMSS_<8hex>`。 |
| `created_at` | `datetime` | *（必須）* | この回のセッションが作られた日時。 |
| `updated_at` | `datetime` | *（必須）* | 最後に動きがあった日時。リソースの定期整理に使われます。 |
| `origin` | `Optional[SessionSource]` | `None` | このセッションを作った出どころ。配信先のルーティングに使われます。 |
| `display_name` | `Optional[str]` | `None` | チャットの表示名（`SessionSource.chat_name` から取得）。 |
| `platform` | `Optional[Platform]` | `None` | 再起動をまたいでルーティングできるよう保存される、プラットフォームの列挙値。 |
| `chat_type` | `str` | `"dm"` | チャットの種類。ポリシーの参照用にこれも保存されます。 |
| `input_tokens` | `int` | `0` | 消費した LLM の入力（プロンプト）トークンの累計。 |
| `output_tokens` | `int` | `0` | 消費した LLM の出力（補完）トークンの累計。 |
| `cache_read_tokens` | `int` | `0` | プロンプトキャッシュの読み取りトークンの累計。 |
| `cache_write_tokens` | `int` | `0` | プロンプトキャッシュの書き込みトークンの累計。 |
| `total_tokens` | `int` | `0` | 全ターンを通したトークンの合計数。 |
| `estimated_cost_usd` | `float` | `0.0` | 推定の累計コスト（USD）。 |
| `cost_status` | `str` | `"unknown"` | コスト追跡の状態を表すラベル。 |
| `last_prompt_tokens` | `int` | `0` | API が最後に報告したプロンプトのトークン数。圧縮の事前チェックを正確に行うために使われます。 |

### 真偽値フラグ（状態機械） {#boolean-flags-state-machine}

SessionEntry にはいくつかの真偽値フラグがあり、次にアクセスされたときのセッションの
振る舞いを決める、簡単な状態機械になっています。

| フラグ | 型 | 既定値 | 説明 |
|---|---|---|---|
| `was_auto_reset` | `bool` | `False` | 明示的な一時停止によって代わりのセッションが作られたときに立ちます。過去の記録のためにも残されています。 |
| `auto_reset_reason` | `Optional[str]` | `None` | 明示的な一時停止なら `"suspended"`。古い行には過去のリセット理由が残っていることがあります。 |
| `reset_had_activity` | `bool` | `False` | 置き換えられたセッションに、それまでの動きがあったかどうか。 |
| `is_fresh_reset` | `bool` | `False` | 明示的な `/new` や `/reset` で立ちます。最初のメッセージで、トピック／チャンネルのスキルを再注入するきっかけになります。紛らわしい「セッションの期限が切れました」という通知を避けるため、`was_auto_reset` とは区別されています。 |
| `expiry_finalized` | `bool` | `False` | 復旧のために残されている、過去の確定済みの境界。タイマーがこれを書き込むことはありません。 |
| `suspended` | `bool` | `False` | 強制的に消去するための強いシグナル。`/stop` か、ループが止まらないときのエスカレーション（再起動の失敗が3回以上連続）で立ちます。次の `get_or_create_session()` で、`resume_pending` にかかわらず新しい `session_id` を強制します。 |
| `resume_pending` | `bool` | `False` | 穏やかな復旧のためのマーカー。`suspend_recently_active()`（クラッシュからの復旧）か、ドレインのタイムアウトで立ちます。次にアクセスされたとき、既存の `session_id` を保ち、ユーザーは同じトランスクリプトのまま続けられます。次のターンが無事に終わった後に解除されます。 |
| `resume_reason` | `Optional[str]` | `None` | 再開の印を付けた理由: `"restart_timeout"`、`"shutdown_timeout"`、`"restart_interrupted"`。 |
| `last_resume_marked_at` | `Optional[datetime]` | `None` | 最後に再開待ちの印を付けた日時。 |

### 状態遷移のロジック（get_or_create_session） {#state-transition-logic-getorcreatesession}

```
                    ┌──────────┐
                    │  Incoming │
                    │  Message  │
                    └────┬─────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  session_key exists  │──── No ──► Create fresh SessionEntry
              │  AND !force_new      │
              └──────────┬───────────┘
                         │ Yes
                         ▼
              ┌──────────────────────┐
              │  entry.suspended?    │──── Yes ──► Auto-reset: new session_id
              └──────────┬───────────┘           (reason="suspended")
                         │ No
                         ▼
              ┌──────────────────────┐
              │ entry.resume_pending?│──── Yes ──► Return existing entry
              └──────────┬───────────┘           (preserve session_id)
                         │ No                     Clear flag on next successful turn
                         ▼
              ┌──────────────────────┐
              │   Policy says reset? │──── Yes ──► Auto-reset: new session_id
              └──────────┬───────────┘           (reason="idle"/"daily")
                         │ No
                         ▼
              ┌──────────────────────┐
              │  Return existing     │
              │  entry, bump         │
              │  updated_at          │
              └──────────────────────┘
```

**`get_or_create_session()` での優先順位:**
1. `suspended=True` → 常に強制リセット（強い消去）
2. `resume_pending=True` → session_id を保つ（穏やかな復旧）
3. きっかけなし → 既存のエントリーを返す（`updated_at` を更新）

---

## 3. SessionStore — 保存と操作 {#3-sessionstore-storage-and-operations}

`SessionStore` はメインの保存層です。メモリ上の辞書（`_entries`）を持って
`sessions.json` に保存し、セッションのメタデータとメッセージのトランスクリプトについては
SQLite（`SessionDB`）を正本のストアにしています。

### コンストラクター {#constructor}

```python
SessionStore(sessions_dir: Path, config: GatewayConfig, has_active_processes_fn=None)
```

- `sessions_dir` — `sessions.json` を置くディレクトリ。
- `config` — ルーティングと定期整理の設定を持つ `GatewayConfig` のインスタンス。
- `has_active_processes_fn` — 動いているバックグラウンドプロセスがあるかを `session_key` ごとに確かめる、
  任意のコールバック。プロセスが動いているセッションは、ルーティングエントリーの削除から守られます。

### 操作（メソッド） {#operations-methods}

| メソッド | 説明 |
|---|---|
| `get_or_create_session(source, force_new=False)` | 中核の入口。既存の `SessionEntry` を返すか、新しく作ります。明示的な一時停止と、再起動からの復旧の状態を評価します。SQLite のレコードを作成／終了します。 |
| `update_session(session_key, last_prompt_tokens=None)` | やり取りの後に行う、軽いメタデータの更新。`updated_at` を更新し、必要に応じて `last_prompt_tokens` を記録します。 |
| `reset_session(session_key, display_name=None)` | 明示的なリセット（`/new` や `/reset` から）。新しい `session_id` を作り、`is_fresh_reset=True` を立てます。古い SQLite セッションを終えて、新しいものを作ります。 |
| `switch_session(session_key, target_session_id, *, expected_session_id=None)` | 別の既存セッション ID に切り替えます（`/resume` から）。現在の SQLite セッションを終え、切り替え先を開き直します。`expected_session_id=` を付けると、向き先の付け替えは比較してから入れ替える形になります。キーがそのセッションを指さなくなっていた場合は、切り替えずに `None` を返します。これにより、`await` をまたいで古い写しを元に解決した呼び出し側（非同期の委任による付け直し、Telegram のトピック結び付けの修復）が、同時に走った `/new` や `/resume` を上書きできないようにします。 |
| `suspend_session(session_key)` | セッションに `suspended=True` の印を付けます（`/stop` から）。次のアクセスで自動リセットを強制します。 |
| `mark_resume_pending(session_key, reason)` | セッションに `resume_pending=True` の印を付けます（ドレインのタイムアウトから）。次のアクセスで session_id を保ちます。`suspended=True` を上書きすることは**ありません**。 |
| `clear_resume_pending(session_key)` | 再開したターンが無事に終わった後、`resume_pending` を解除します。`run_conversation()` が戻った後にゲートウェイから呼ばれます。 |
| `suspend_recently_active(max_age_seconds=120)` | クラッシュからの復旧: 最近動きのあったセッションに `resume_pending=True` の印を付けます。すでに再開待ちのものと、すでに一時停止中のエントリーは飛ばします。正常に終了しなかった後の起動時に呼ばれます。 |
| `prune_old_entries(max_age_days)` | `max_age_days` より古いエントリー（`updated_at` を基準）を削除します。`suspended` のエントリーと、プロセスが動いているセッションは飛ばします。 |
| `list_sessions(active_minutes=None)` | すべてのセッションを返します。最近の動きで絞り込むこともできます。`updated_at` の降順で並びます。 |
| `lookup_by_session_id(session_id)` | 保存されているセッション ID に対応する、有効な `SessionEntry` を探します。 |
| `has_any_sessions()` | これまでにセッションが1つでも作られたかを確かめます（メモリ上の辞書だけでなく、履歴として SQLite も使います）。 |
| `append_to_transcript(session_id, message, skip_db=False)` | SQLite のトランスクリプトにメッセージを追記します。`skip_db=True` にすると、エージェントがすでに保存済みの場合の二重書き込みを防ぎます。 |
| `rewrite_transcript(session_id, messages)` | セッションのトランスクリプトを丸ごと置き換えます（`/retry`、`/undo`、`/compress` で使われます）。 |
| `load_transcript(session_id)` | セッションの SQLite トランスクリプトから、すべてのメッセージを読み込みます。 |
| `rewind_session(session_id, n=1)` | 論理削除（監査の記録は残ります）で、ユーザーのターンを `n` 回分さかのぼります。`SessionDB.rewind_user_turn`（`hermes_state_rewind.py`）の薄いラッパーで、CLI の `/undo`/`/retry` や TUI と共通の、ただ1つの巻き戻し処理です。`{rewound_count, turns_undone, target_text}` を返します。 |

### 内部ヘルパー {#internal-helpers}

- `_ensure_loaded()` / `_ensure_loaded_locked()` — `sessions.json` を `_entries` 辞書に読み込みます。
- `_save()` — 一時ファイルと `atomic_replace` を使い、`sessions.json` に原子的に書き込みます。
- `_generate_session_key(source)` — 設定のパラメーターを付けて `build_session_key()` に処理を任せます。

### 保存のレイアウト {#storage-layout}

```
{sessions_dir}/
  sessions.json          # In-memory _entries dict, persisted as JSON
                           Maps session_key → SessionEntry (metadata only)
  {session_id}.jsonl     # (Legacy, removed in spec 002)
```

トランスクリプトの正本のストアは、`SessionDB`（`hermes_state` から）経由の SQLite です。
`sessions.json` ファイルには、`session_key → session_id` の対応と、エントリーのメタデータ
（フラグ、日時、トークン数）が保存されます。SQLite が使えないときストアは
JSONL に切り替えますが、これは機能を落として動かすための経路です。

---

## 4. セッションキーの生成規則 {#4-sessionkey-generation-rules}

セッションキーは、会話のレーンを識別する決定的な文字列です。
`build_session_key(source, group_sessions_per_user, thread_sessions_per_user)` によって生成されます。

### キーの形式 {#key-format}

```
agent:main:{platform}:{chat_type}[:{chat_id}][:{thread_id}][:{participant_id}]
```

### DM の規則 {#dm-rules}

| 場面 | キー |
|---|---|
| chat_id がある DM | `agent:main:telegram:dm:12345` |
| chat_id とスレッドがある DM | `agent:main:telegram:dm:12345:thread_678` |
| chat_id がなく、participant_id がある DM | `agent:main:signal:dm:user_abc` |
| chat_id も participant_id もない DM | `agent:main:telegram:dm` |
| WhatsApp の DM（正規化済み） | `agent:main:whatsapp:dm:{canonical_number}` |

- DM では `chat_id` があれば必ずキーに含め、個々の非公開の会話を分けます。
- 同じ DM チャットの中でスレッドに分かれた DM は、`thread_id` でさらに区別します。
- `chat_id` がない場合は、`user_id_alt` か `user_id` を participant_id として代わりに使います。
- 識別子がまったくない場合、そのプラットフォームのすべての DM が1つの共有セッションにまとまります。

### グループ／チャンネルの規則 {#groupchannel-rules}

| 場面 | キー |
|---|---|
| グループチャット | `agent:main:telegram:group:-10012345` |
| グループチャット、ユーザーごとに分離 | `agent:main:telegram:group:-10012345:user_abc` |
| グループ内のスレッド、共有 | `agent:main:discord:group:12345:thread_678` |
| グループ内のスレッド、ユーザーごと | `agent:main:discord:group:12345:thread_678:user_abc` |
| チャンネル | `agent:main:slack:channel:C12345` |
| WhatsApp のグループ（正規化済み） | `agent:main:whatsapp:group:{canonical_id}:{participant}` |

- `chat_id` は親のグループ／チャンネルを識別します。
- `thread_id` は、その親の中のスレッドを区別します。
- **ユーザーごとの分離**（`participant_id` を末尾に付ける）は、次の設定で決まります。
  - `group_sessions_per_user`（既定: `True`）— グループ／チャンネルのセッションは分離されます。
  - `thread_sessions_per_user`（既定: `False`）— スレッドは既定で**共有**されます
    （Telegram のフォーラムトピック、Discord のスレッド、Slack のスレッドは、どれもスレッドごとに1つのセッションを共有します）。
- `participant_id` = `user_id_alt` または `user_id`（この優先順）。
- WhatsApp の識別子は、JID と LID の別名が入れ替わっても扱えるよう正規化されます。

### 特殊なケース: WhatApp {#special-case-whatapp}

WhatsApp の電話番号は `canonical_whatsapp_identifier()` を通り、
`@s.whatsapp.net` という接尾辞を取り除いたうえで E.164 形式にそろえられます。これにより、ブリッジが
同じ電話番号を別名の形で返したときに、セッションがばらばらに分かれるのを防ぎます。

---

## 5. マルチユーザーの分離方針 {#5-multi-user-isolation-strategy}

マルチユーザーの分離は、同じチャットにいる複数のユーザーが1つの会話を共有するか、
それぞれが自分専用のセッションを持つかを決めるものです。

### 判定ロジック（`is_shared_multi_user_session`） {#decision-logic-issharedmultiusersession}

```python
def is_shared_multi_user_session(source, *, group_sessions_per_user, thread_sessions_per_user):
    if source.chat_type == "dm":
        return False  # DMs are always private
    if source.thread_id:
        return not thread_sessions_per_user  # Threads: shared unless per-user
    return not group_sessions_per_user       # Groups: isolated unless shared
```

### まとめ {#summary}

| チャットの種類 | 既定 | 設定での制御 |
|---|---|---|
| DM | 非公開（共有されない） | なし |
| グループ／チャンネル | ユーザーごとに分離 | `group_sessions_per_user`（既定: True） |
| スレッド（フォーラム、discord） | 共有（参加者全員が同じコンテキストを見る） | `thread_sessions_per_user`（既定: False） |

### システムプロンプトへの影響 {#impact-on-system-prompt}

`shared_multi_user_session=True` のとき、システムプロンプトには決まったユーザー名を入れず、代わりに
*「マルチユーザーの \{thread|session\} です。メッセージの先頭には [送信者名] が付きます。複数の
ユーザーが参加することがあります。」*という内容を書きます。個々の送信者名は、ゲートウェイが実行時に
各ユーザーメッセージの先頭に付けるので、プロンプトキャッシュは保たれます（システムプロンプトはターンごとに変わりません）。

---

## 6. 会話の明示的な区切り {#6-explicit-conversation-boundaries}

動きがない時間や時計の時刻によって、会話が切り替わることはありません。`/new` と `/reset` が
明示的な区切りを作り、長い履歴は引き続きコンテキストの圧縮が管理します。
古いタイマーの設定は無視されます。既存の `SessionResetPolicy` というデータ型は、
互換性のために残された効力のないデータで、実行時のポリシーではありません。

明示的な一時停止は、今も次に届いたターンで区切りを作ります。復旧処理は、
明示的な区切りと過去に確定済みの区切りを尊重し、それらを開き直すことはしません。
リソースだけを解放する退避や、WebSocket の孤立した接続の回収では、会話は再開できる状態のまま残ります。

---

## 7. 再起動からの復旧の流れ {#7-restart-recovery-flow}

再起動からの復旧の仕組みは、処理の途中にあるセッションを、ゲートウェイの
再起動、クラッシュ、ドレインのタイムアウトをまたいで保つためのものです。issue #7536 への解決策です。

### 起動時の復旧手順 {#startup-recovery-sequence}

```
Gateway starts
       │
       ▼
┌───────────────────────────────┐
│ Check for .clean_shutdown     │── Exists? ──► Skip suspension (clean exit)
│ marker                        │
└───────────────────────────────┘
       │ Missing
       ▼
┌───────────────────────────────┐
│ session_store                 │── Marks sessions updated within
│ .suspend_recently_active()    │   last 120 seconds as resume_pending
└───────────────────────────────┘
       │
       ▼
┌───────────────────────────────┐
│ _suspend_stuck_loop_sessions()│── Suspends sessions that have been
│                               │   active across 3+ restarts
└───────────────────────────────┘
       │
       ▼
┌───────────────────────────────┐
│ Queue inbound messages while  │
│ startup restore runs          │
│ (_startup_restore_in_progress)│
└───────────────────────────────┘
       │
       ▼
┌───────────────────────────────┐
│ For each adapter, find        │
│ resume_pending sessions →     │
│ synthesize MessageEvent and   │
│ run _handle_message to let    │
│ the agent auto-continue       │
└───────────────────────────────┘
```

### suspend_recently_active(max_age_seconds=120) {#suspendrecentlyactivemaxageseconds120}

`.clean_shutdown` マーカーがない（クラッシュや予期しない終了があったことを示す）とき、
ゲートウェイの起動時に呼ばれます。直近120秒以内に更新されたセッションそれぞれについて、次のことを行います。

- `resume_pending=True`、`resume_reason="restart_interrupted"`、
  `last_resume_marked_at=now` を設定します。
- すでに `resume_pending=True` のエントリーは飛ばします（二重に印を付けません）。
- 明示的に `suspended=True` になっているエントリーは飛ばします（強い消去はそのまま残すべきだからです）。

### 止まらないループの検出（`_suspend_stuck_loop_sessions`） {#stuck-loop-detection-suspendstuckloopsessions}

連続した再起動の回数を JSON ファイル（`{HERMES_HOME}/restart_counts.json`）で数えます。
あるセッションが3回以上連続した再起動をまたいで動いていた場合、自動的に一時停止され、ユーザーは
まっさらな状態からやり直せます。

### ドレインのタイムアウト時の印付け {#drain-timeout-marking}

正常なシャットダウン／再起動のとき、ドレインのタイムアウトが来た時点でターンの途中だったセッションには、
ドレインの仕組みが `mark_resume_pending()` を呼びます。理由は次のとおりです。

- `"restart_timeout"` — 再起動のドレイン中に強制終了された
- `"shutdown_timeout"` — シャットダウンのドレイン中に強制終了された
- `"restart_interrupted"` — クラッシュからの復旧（`suspend_recently_active` から）

3つの理由はすべて `_AUTO_RESUME_REASONS` に含まれ、起動時の自動再開の対象になります。

### 次のアクセスでの自動再開 {#auto-resume-on-next-access}

`get_or_create_session()` が `resume_pending=True` に出会ったときの動きです。

1. 新しい `session_id` を作ら**ずに**、既存のエントリーを返します。
2. 既存のトランスクリプトがそのまま読み込まれます。
3. 印はここでは解除されません。次のターンが無事に終わるまで残ります
   （`run_conversation()` が実際の応答を返した後に、ゲートウェイから `clear_resume_pending()` が
   呼ばれます）。
4. 再開したターンがまた中断された場合、`resume_pending` フラグは立ったまま残り、
   次の再起動で再試行されます。最終的なエスカレーションは、止まらないループのカウンターが担います
   （3回の再試行 → 一時停止）。

### 正常終了のマーカー（`.clean_shutdown`） {#clean-shutdown-marker-cleanshutdown}

正常なシャットダウンの最後に書き込まれます。次の起動時の動きは次のとおりです。

- あれば: `suspend_recently_active()` をまるごと飛ばします。動いていたエージェントはすでに
  ドレイン済みなので、止まったままのセッションはありません。
- そのあとマーカーを削除します。

これにより、`hermes update`、`hermes gateway restart`、
`/restart` の後に、意図しない自動リセットが起きるのを防ぎます。

---

## 8. メッセージのキューイングの流れ {#8-message-queuing-flow}

メッセージのキューイングの仕組みは、2つの場面を扱います。

1. **割り込みの続きのメッセージ** — エージェントが処理しているあいだにユーザーが複数のメッセージを
   送ると、後続のメッセージは1枠だけの保留メッセージとしてキューに積まれます。
2. **`/queue` の FIFO** — 明示的な `/queue` コマンド。それぞれが、まとめられることなく順番どおりに、
   エージェントの完全なターンを1回ずつ生む必要があります。

### データ構造 {#data-structures}

```
adapter._pending_messages: Dict[session_key, MessageEvent]
    └── Single "next-up" slot per session. Overwritten on repeat sends
        (burst collapse). Shared with photo-burst follow-ups.

self._queued_events: Dict[session_key, List[MessageEvent]]
    └── Overflow buffer. Each /queue invocation appends here when the
        slot is occupied. Promoted one-at-a-time after each drain.
```

### キューへの追加（`_enqueue_fifo`） {#enqueue-enqueuefifo}

```
_enqueue_fifo(session_key, event, adapter)
       │
       ▼
┌───────────────────────────────────────┐
│ Is slot free?                         │
│ (session_key NOT in _pending_messages)│── Yes ──► Place event in slot
└───────────────────────────────────────┘
       │ No
       ▼
Append to _queued_events[session_key] (overflow tail)
```

### キューからの取り出し／繰り上げ（`_promote_queued_event`） {#dequeue-promotion-promotequeuedevent}

枠が消費された後、ドレインの箇所で呼ばれます。あふれた分の項目がある場合の動きです。

- `pending_event is None`（枠が空だった）のときは、あふれた分の先頭を新しいイベントとして返します。
- `pending_event` があるときは、あふれた分の先頭を次の再帰のために枠へ置いておきます。
- 使えるアダプターがない場合は、`_queued_events` に戻します（黙って捨てません）。

### キューの深さ {#queue-depth}

`_queue_depth(session_key, adapter)` は `len(overflow) + (1 if slot occupied else 0)` を返します。

### 消去 {#clearing}

セッションのキューに積まれたイベントは、`/new` と `/reset` で（`_handle_reset_command` を通じて）消去されます。
`/stop` は、中断されたターンの最中に利用者が送った 1 枠だけの追いかけメッセージを捨てます。
どちらの置き場にあっても、**内部の**呼び起こし（非同期の委任の完了通知、かんばんや cron の
`notify+wake`）は 3 つのコマンドすべてを生き延びます。`_interrupt_and_clear_session` はそれを枠に
残し（捨てられた人間の追いかけメッセージが枠を占めていた場合は、あふれの側から枠へ繰り上げます）、
コマンドのあとの掃き出しがすぐにそれを始めます。セッションが次の利用者のメッセージまで
止まったままにならないようにするためです。`/new` が閉じたばかりのセッションに結び付いた
呼び起こしを動かしてよいかどうかは、処理の時点で決まります（`_resolve_async_delegation_session`。
判断できないときは動かしません）。

### FIFO の不変条件 {#fifo-invariant}

`/queue` を1回呼ぶと、エージェントの完全なターンがちょうど1回、FIFO の順で、まとめられることなく
生まれます。1枠の `_pending_messages` とあふれた分を受ける `_queued_events` という設計によって、
ターンの最中にメッセージを繰り返し送っても、処理の順番が入れ替わらないようになっています。

---

## 9. セッションコンテキストの注入 {#9-session-context-injection}

`SessionContext` は `SessionSource` と `GatewayConfig` から組み立てられ、エージェントの
システムプロンプトに注入されます。これによってエージェントは次のことを知ります。

- いまのメッセージがどこから来たか
- どのプラットフォームが接続されているか
- 定期タスクの出力をどこへ届けられるか
- これが共有のマルチユーザーセッションかどうか

### 組み立て（`build_session_context`） {#construction-buildsessioncontext}

```python
def build_session_context(source, config, session_entry=None) -> SessionContext
```

1. 設定から、接続されているプラットフォームを集めます。
2. 各プラットフォームのホームチャンネルを集めます。
3. `is_shared_multi_user_session()` で `shared_multi_user_session` を判定します。
4. `session_entry` が渡されていれば、セッションのメタデータ（キー、ID、日時）を付けます。

### 個人情報の伏せ字化（`build_session_context_prompt`） {#pii-redaction-buildsessioncontextprompt}

システムプロンプトの動的な部分（`## Current Session Context`）では、LLM に送る前に
個人を特定できる情報を伏せることができます（任意）。

- ユーザー ID → `user_<12hex>`（SHA-256 の先頭部分）
- チャット ID → `<platform>:<12hex>` または単に `<12hex>`
- 伏せ字化の対象外になるプラットフォーム: Discord（`@mentions` に生の ID が必要なため）と、
  プラグインで登録されたプラットフォームのうち `pii_safe` の印がないもの。

伏せ字化が効くのはシステムプロンプトの文面だけです。ルーティング、セッションキー、アダプターの
操作では、常に元の値が使われます。

---

## 10. バックグラウンドでの定期整理 {#10-background-housekeeping}

`_session_housekeeping_watcher` は定期的に、動きのないキャッシュ済みエージェントを片付け、
メモリが逼迫したときにはキャッシュのエントリーを手放し、古いルーティングエントリーを1時間ごとに削除します。
動きがないことや時刻を理由に、トランスクリプトを終わらせることはありません。

TTL、LRU、メモリ逼迫による退避では、クライアントを穏やかに解放する前に、動いているトランスクリプトを
メモリプロバイダーに書き込みます。進行中のターンは守られたままで、ターミナル、ブラウザー、バックグラウンド
プロセスのリソースは、穏やかな解放の後も残ります。ルーティングエントリーの削除では正本の
SQLite トランスクリプトが保たれ、動いているプロセスは自分のルーティングエントリーを削除から守ります。
過去の `expiry_finalized` フラグは復旧のための境界として残りますが、
タイマーの監視役がこれを書き込むことはもうありません。

---

## 11. エージェントのキャッシュ {#11-agent-cache}

ゲートウェイは、ターンをまたいでプロンプトキャッシュを保つために、`session_key` をキーにした
`AIAgent` インスタンスの LRU キャッシュを持っています。

### キャッシュの特性 {#cache-properties}

- **最大サイズ:** 128エントリー（`agent.agent_cache.max_size`、既定値は `_AGENT_CACHE_MAX_SIZE`）。
- **退避の方針:** 最も長く使われていないものから（`OrderedDict` による LRU）。
- **アイドル TTL:** 3600秒（1時間）— `agent.agent_cache.idle_ttl_secs`。
  `_session_housekeeping_watcher` が適用します。
- **メモリの予算:** `agent.agent_cache.memory_high_mb`（既定 `auto`）— 下記を参照。
- **ロック:** スレッド安全のための `_agent_cache_lock`（threading）。

### メモリ逼迫による退避 {#memory-pressure-eviction}

キャッシュされたエージェントは `_session_messages` を抱えています。これはツールの出力を含む、動いている
トランスクリプトの全体で、ツール呼び出しが100回を超えるセッションでは数十 MB になります。エントリー数の上限も
アイドル TTL も、この大きさは見ていません。多くのチャットを受け持つゲートウェイは、温まったトランスクリプトを
すべてメモリに置いたままにします（TTL 内にターンがあったエージェントは、アイドルとして片付けられません）。
そのため RSS は増え続け、やがて cgroup が絞り込みを始め、SIGTERM を受けても systemd の停止タイムアウト内に
書き出しを終えられなくなります（#80764）。

`_sweep_agent_cache_under_pressure()` はその逃がし弁です。監視役が動くたびに、
匿名メモリを `memory_high_mb` と比べます。ゲートウェイが cgroup の上限の下で動いているときは
cgroup 自身の `memory.stat` の `anon`（予算が課される範囲なので、同じユニットの子プロセス、
たとえば `execute_code` のカーネルも数に入ります。#110549）を、そうでなければプロセス自身の匿名 RSS を使います。予算を超えていれば、上限の適用と同じ
穏やかな経路（`_commit_then_release_soft`）で LRU のエージェントを退避させ、そのあと
`malloc_trim` を実行して、解放したアリーナが実際に OS へ返るようにします。退避されたセッションは、
次のターンで保存済みのセッションからトランスクリプトを組み立て直します。

次の3種類のセッションは、決して手放されません。

- ターンの途中にあるエージェント（クライアントとサンドボックスが使用中のため）
- 最も最近使われた `protect_recent` 個のセッション（プロンプトキャッシュの価値が
  最も高いため）
- 動いているトランスクリプトがまだディスクに書き終わっていないセッション —
  `transcript_persistence_caught_up()` は `_last_flushed_db_idx` と
  `len(_session_messages)` を比べます。これは、FTS の書き込み破損ガードが、遅れているトランスクリプトより
  動いている履歴を優先して残すときに反応するのと同じずれです。

`memory_high_mb: auto` は、ゲートウェイが動いている cgroup の上限から予算を導きます
（`memory.high`、次に `memory.max`、次に cgroup v1）。上限がなければ搭載 RAM の合計を使います。
数値を指定すれば固定でき、`0`/`off` にすればこの処理を完全に無効にできます。ヘルパーは
`gateway/agent_cache_pressure.py` にあります。

### キャッシュのライフサイクル {#cache-lifecycle}

```
Message arrives
    │
    ▼
get_or_create_session()  →  session_key obtained
    │
    ▼
Lookup _agent_cache[session_key]
    │
    ├── Hit → move_to_end(), reuse AIAgent (preserves prompt cache)
    │
    └── Miss → create new AIAgent, store in cache
                (if at capacity, popitem(last=False) evicts LRU entry)
    │
    ▼
run_conversation()  →  agent processes message
    │
    ▼
Housekeeping soft-releases idle agents without ending transcripts
```

### 後片付けの流れ {#cleanup-flow}

リソースの退避では、キャッシュ済みのエージェントを取り除き、クライアントを穏やかに解放する前に
メモリへ書き込みます。`_cleanup_agent_resources(agent)` による完全な後片付けは、実際の
会話の区切りとシャットダウンのときだけに使われます。

---

## 付録: 主な設定 {#appendix-key-configuration}

| 設定キー | 型 | 既定値 | 説明 |
|---|---|---|---|
| `group_sessions_per_user` | `bool` | `true` | グループ／チャンネルのセッションをユーザーごとに分離する |
| `thread_sessions_per_user` | `bool` | `false` | スレッドのセッションをユーザーごとに分離する |
| `session_store_max_age_days` | `int` | `0` | N 日より古いセッションを削除する（0=無効） |
| `agent.gateway_auto_continue_freshness` | `int` | `3600` | 再開を認める鮮度の窓（秒） |
| `agent.gateway_timeout` | `int` | `1800` | エージェントのターンのタイムアウト（既定30分） |
| `agent.agent_cache.max_size` | `int` | `128` | キャッシュする AIAgent の LRU エントリー数の上限 |
| `agent.agent_cache.idle_ttl_secs` | `int` | `3600` | この時間動きのないエージェントを退避する |
| `agent.agent_cache.memory_high_mb` | `int`/`str` | `auto` | これを超えると LRU のトランスクリプトを手放す、匿名 RSS の予算 |
| `agent.agent_cache.max_evictions_per_pass` | `int` | `16` | 1回の逼迫処理で手放すセッション数の上限 |
| `agent.agent_cache.protect_recent` | `int` | `8` | 逼迫処理が決して触れない、最近使われたセッションの数 |

## 状態データベースと FTS の復旧 {#state-database-and-fts-recovery}

正本のトランスクリプトは `sessions` と `messages` のテーブルにあります。FTS5 の
テーブルとその同期トリガーは派生したインデックスで、正本のメッセージを消さずに切り離して
作り直せます。動作中に起こりうる、範囲の限られた障害と、明示的な修復手順については
[State DB の復旧](/hermes/docs/developer-guide/state-db-recovery/)を参照してください。

### 会話の寿命 {#conversation-lifetime}

アイドル時や日次でリセットする設定はサポートされていません。明示的な `/new` と `/reset`、
圧縮、一時停止、クラッシュからの復旧は、それぞれ別のライフサイクル上の役割を持ち続けます。
