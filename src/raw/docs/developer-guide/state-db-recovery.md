---
title: "state.db の復旧"
description: "FTS インデックスやファイルそのものが壊れたときに、Hermes が state.db をどう復旧するか"
upstream_path: developer-guide/state-db-recovery.md
upstream_blob: 7a7af15bd6c39fe06f060bf91a68a7fecf4236cf
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/state-db-recovery
---

# state データベースと FTS の復旧 {#state-database-and-fts-recovery}

`state.db` には、性質の異なる 2 種類のデータが入っています。

- `sessions` と `messages` は、正本となる会話記録です。
- `messages_fts*` テーブルとその同期トリガーは、正本から作られる検索インデックスです。

派生したインデックスは、一時的に切り離されることがあります。ただしそれによって、稼働中の
メッセージ書き込みや検索が、会話記録全体の際限のない再構築に変わってはいけません。

## FTS が壊れているときの稼働中の挙動 {#live-behavior-when-fts-is-corrupt}

FTS への書き込みや検索で破損系のエラーが報告されると、`SessionDB` は次のように動きます。

1. 永続的な `fts_stale` マーカーを記録します。
2. 同じトランザクション内で、FTS の同期トリガーを削除します。
3. 派生インデックスへの書き込みを外して、正本への書き込みをやり直します。
4. 検索は、`LIKE` によるフォールバックで正本の行から返します。

失敗した稼働中の処理が `FTS5('rebuild')` を実行することはありません。復旧を誰が担当するかは
これまでと変わりません。後で `SessionDB` を開いたときに、プロセス間の入場ロックと
他プロセス保持者の確認を経たうえで再構築することがあります。その確認付きの再構築が
実行できない場合は、FTS は切り離されたまま、正本への書き込みは使える状態が続き、
`hermes doctor` が明示的な修復コマンドを案内します。

## ファイルそのものが壊れているときの稼働中の挙動 {#live-behavior-when-the-file-itself-is-corrupt}

稼働中の書き込みで、FTS 由来ではない素の `SQLITE_CORRUPT` / `SQLITE_NOTADB`（`database
disk image is malformed`、`file is not a database`）が報告された場合、損傷は正本の B-tree、
スキーマ、またはフリーリストにあります。このとき `SessionDB` はそのハンドルを隔離します（`StateDbCorruptError`）。

1. 失敗した書き込みは型付きのエラーをそのまま上に伝え、やり直しはしません。
2. そのハンドルでの以降の書き込みは、ファイルに触れずに即座に失敗します。
3. `close()` の後、そのハンドルが接続を開き直すことはありません。
4. `close()` は明示的な WAL チェックポイントを省きます。

書き込みを止めること自体が保護になります。実際の環境では、最初の構造エラーの後も約 50 分間
書き込みを続けたハンドルが、終了時のチェックポイントで 15 ページを誤ったページ番号に書き込み
（ページ 1 に `messages_fts_trigram_data` のリーフが入りました）、壊れてはいても読めた
ファイルを、まったく開けないファイルにしてしまいました。明示的なチェックポイントを省くのは
第二の防御線です。Python 3.12 以降では、隔離によって SQLite 自身が最後の接続を閉じるときに行う
チェックポイント（`SQLITE_DBCONFIG_NO_CKPT_ON_CLOSE`）も無効になるため、`-wal` の付随ファイルは
`close()` の後も調査用に残ります。Python 3.11 ではこの切り替えが使えず、閉じるときに SQLite が
1 回チェックポイントを行うことがあります。そのため、何かを再起動する前に `state.db`、`state.db-wal`、
`state.db-shm` をまとめてコピーしておいてください。

ゲートウェイとエージェントの書き出し経路は、隔離をファイルが差し替えられたときと同じように扱います。
保留中の会話記録は、やり直し用のキューではなく `sessions/<id>.jsonl` とゲートウェイの
`pending_messages/` スプールに送られ、FTS の一回限りの再構築が壊れたファイルに対して
実行されることはありません。隔離はプロセス単位です。共有ハンドルは、修復済みまたは復元済みの
ファイルでプロセスが再起動されるまで、すべての保持者にとって使えない状態のままです。ゲートウェイが
動いている間は `hermes doctor --fix` を実行しないでください。次の手順は以下のとおりです。

```bash
hermes gateway stop
HERMES_HOME="$HOME/.hermes" hermes sessions recover --source "$HOME/.hermes/state.db" --inspect-only
# if recoverable:
HERMES_HOME="$HOME/.hermes" hermes sessions recover --source "$HOME/.hermes/state.db" --output "$HOME/recovered-state.db"
```

または、`state-snapshots/` から最新のスナップショットを復元します。

## 明示的な修復 {#explicit-repair}

修復する前に、プロファイルのデータベースを開く可能性のあるプロセスをすべて止めてください。
修復と確認が終わるまで、止めたままにしておきます。

```bash
hermes gateway stop
HERMES_HOME="$HOME/.hermes" hermes sessions repair --check-only
HERMES_HOME="$HOME/.hermes" hermes sessions repair
```

`sessions repair` は、既定で SQLite のバックアップを作成し、リポジトリの確認付きの
「スナップショットを取ってから昇格する」経路を通して構造の作業を行います。`state.db`、
`state.db-wal`、`state.db-shm` を `cp` で別々にコピーしないでください。これらのファイルは
1 つの稼働中の SQLite イメージです。

修復後は、ゲートウェイを再起動する前に、ヘルスチェック、stale マーカー、トリガーの一式、
正本の行数を確認します。

```bash
HERMES_HOME="$HOME/.hermes" hermes sessions repair --check-only
sqlite3 "$HOME/.hermes/state.db" \
  "SELECT key, value FROM state_meta WHERE key = 'fts_stale';"
sqlite3 "$HOME/.hermes/state.db" \
  "SELECT type, name FROM sqlite_master WHERE name IN
   ('messages_fts_insert','messages_fts_update','messages_fts_delete')
   ORDER BY name;"
sqlite3 "$HOME/.hermes/state.db" \
  "SELECT 'sessions', COUNT(*) FROM sessions
   UNION ALL SELECT 'messages', COUNT(*) FROM messages;"
```

マーカーのクエリは行を 1 件も返さず、想定どおりの FTS トリガーがそろっていて、正本の行数が
減っていないことが条件です。修復に失敗した場合は、稼働中のデータベースと報告されたバックアップの
両方を保全してください。派生インデックスのエラーを消すために、正本の行を削除してはいけません。
