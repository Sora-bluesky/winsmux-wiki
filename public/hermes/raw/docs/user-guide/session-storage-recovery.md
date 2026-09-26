---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "セッション保存領域の復旧"
description: "別のプロセスがセッションデータベースの先行書き込みログの古いコピーを保持していると Hermes に言われたときの対処と、state.db の横にあるファイルの正体"
upstream_path: user-guide/session-storage-recovery.md
upstream_blob: aa1e522f3f7d9cd1722e54ca4af23463f0fee04e
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/session-storage-recovery
---

# セッション保存領域の復旧 {#session-storage-recovery}

Hermes はすべての会話を、プロファイルごとに 1 つの SQLite ファイル `state.db` に保存しています。その横には、
SQLite 自身が管理する 2 つの付属ファイル `state.db-wal`（先行書き込みログ）と `state.db-shm` があります。
このファイルは複数の Hermes プロセスで安全に共有できます。ゲートウェイ、Desktop アプリ、
ダッシュボード、cron、CLI コマンドは、どれも SQLite 自身のロックを通して書き込むからです。

ただし 1 つだけ安全でない操作があります。**別のプロセスが書き込んでいる最中に保存領域を書き換えること**です。
これが起きると、ログの*古い*コピーを持ったままのプロセスは意図的に書き込みを止め、
どのターンにも次のようなメッセージで応答するようになります。

> 別の Hermes プロセスがセッションデータベースの先行書き込みログの古いコピーをまだ保持しているため、
> ファイルを守るために Hermes は書き込みを停止しました …

このページは、そのメッセージからリンクされている案内です。このメッセージが出ても、何も失われていません。
書き込みを拒否しているのは、まさに何も失わないためです。

## 3 ステップで直す {#the-fix-in-three-steps}

1. **そのプロファイルの Hermes プロセスをすべて終了します。** Desktop アプリ、ゲートウェイ、ダッシュボード、cron です。

   ```bash
   hermes gateway stop          # add -p <profile> for a named profile
   ```

   続いて Desktop アプリをメニューから終了し、ダッシュボード（`hermes dashboard --stop`）や
   独自に動かしているサービスも止めます。どれか*1 つ*を再起動するだけでは足りません。古いログを持ったプロセスが
   1 つでも残っていると、新しく起動したプロセスはすべて書き込みを拒否し続けます。

2. **まだログを保持しているのが誰かを doctor に確認します。**

   ```bash
   hermes doctor                # add -p <profile> for a named profile
   ```

   退役したログを保持しているプロセスが残っている間、doctor は保持しているプロセスを 1 つずつ
   `PID N (command)` の形で、同じ対処方法と一緒に表示します。このとき doctor はヘルスチェックも `--fix` の処理も行いません。
   自分がもう 1 つの書き込み手にならないようにするためです。表示されたプロセスを止め、
   その行が出なくなるまで doctor を実行し直してください。

3. **Hermes を再び起動し**（まずは 1 つのプロセスだけ。ゲートウェイか Desktop アプリ）、メッセージをもう一度
   送ります。会話は止まったところから再開します。

## やってはいけないこと {#do-not}

- **プロセスが動いている間に `hermes doctor --fix` を実行しないでください。** 退役したログを保持しているプロセスが
  見える間は doctor がチェックポイントを拒否します。しかし、プロセスを調べられないホストでは、
  この修復処理こそが問題を引き起こした 2 つ目の書き込み手そのものになります。
- **`state.db-wal` や `state.db-shm` を削除しないでください。** このログには、コミット済みでまだ `state.db` に
  反映されていない会話が入っています。削除は、単なる書き込み拒否を本当のデータ消失に変えてしまう唯一の操作です。
- **`state.db` だけをコピーしないでください。** 3 つのファイルで 1 つのイメージです。スナップショット
  （`hermes backup`）か `hermes sessions recover` を使い、`cp state.db somewhere/` のようなコピーは決してしないでください。
- **エージェントに直させようとしないでください。** エージェント自身のセッションも同じ保存領域にあるので、
  エージェントも同じ拒否に突き当たります。

## 書き込み中のプロセスがあると保守コマンドは実行を拒否する {#maintenance-commands-refuse-while-someone-is-writing}

`hermes sessions optimize`、`hermes sessions optimize-storage`、`hermes sessions prune` は
保存領域を書き換えます（VACUUM、全文検索インデックスの再構築、一括削除）。動作中のゲートウェイの下でこれらを
実行することこそ、エージェント群がそろって上の拒否状態に陥る原因です。そのため、これらのコマンドは実行前に確認を行い、
別のプロセスがデータベースを保持している間は実行を拒否するようになりました。

```text
Refusing `hermes sessions optimize-storage`: another process is using ~/.hermes/state.db.
  PID 41230 (hermes gateway run): state.db, state.db-shm, state.db-wal
  PID 41355 (hermes serve --profile work): state.db-wal
Rewriting the database under a live writer is how every agent ends up refusing turns with the
retired state.db-wal error. Nothing is lost.
Stop them first (`hermes gateway stop`, quit the Desktop app, pause cron), then re-run.
Override with --force if you accept the risk.
```

`--dry-run` によるプレビューは決して止められません。`--force` を付けると構わず実行します。表示されたプロセスが
何もしていないと分かっている場合（たとえば自分で起動した読み取り専用のプロセス）にだけ使ってください。Desktop のコンソールで
`sessions optimize` と入力したときも、同じ確認が行われます。

## `state.db` の横に見つかることがあるファイル {#files-you-may-find-beside-statedb}

| ファイルまたはディレクトリ | 何か | どうするか |
|---|---|---|
| `state.db-wal`, `state.db-shm` | SQLite の稼働中の先行書き込みログと、その共有メモリ索引です。ゲートウェイや Desktop が動いている間は、`-wal` が大きくても正常です。 | 触らずにそのままにします。次のチェックポイントで自然に小さくなります。 |
| `state.db.retired-wal-<timestamp>-<pid>/` | あるプロセスが書き込みを拒否したときに保持していたログのコピーを Hermes が取り込んだもので、その内容を記した `manifest.json` が付いています。調査用の証拠であり、中身を確かめずに戻すためのバックアップではありません。 | 残しておきます。復旧後に、障害の直前の会話が欠けている場合は、このディレクトリをバグ報告に添付してください。メンテナーは `manifest.json` を見て、それらのフレームを現在のファイルの上に積むべきかどうかを判断できます。 |
| `state.db.pre-update-emergency-<timestamp>.bak` | Desktop のアップデーターが保存領域に手を加える前に取るスナップショットです。 | 更新後のアプリをしばらく使うまでは残しておきます。戻すときは Hermes のプロセスをすべて止めたうえで、まず `hermes sessions recover --source <file> --inspect-only` を実行します。 |
| `state.db.corrupt.<timestamp>.bak`, `*.malformed-backup` | Hermes が破損を見つけ、修復または隔離する前に取ったファイルのコピーです。 | `state.db` の上に戻さないでください。同じ破損を抱えています。報告用に残しておき、通常の状態に戻ったら削除してかまいません。 |
| `state-snapshots/` | `hermes update` と `hermes backup` が取る簡易スナップショットです。 | Hermes のプロセスをすべて止めたうえで戻します。[`hermes backup`](/hermes/docs/reference/cli-commands/#hermes-backup) を参照してください。 |

## 3 ステップで直らないとき {#when-the-three-steps-do-not-work}

Hermes のプロセスをすべて止め、`hermes doctor` が保持しているプロセスをもう表示しないのに、
ゲートウェイを起動するとまだ書き込みを拒否する場合は、ファイル自体が壊れている可能性があります。
もう一度すべてを止めてから、書き込まずに中身を調べます。

```bash
hermes sessions recover --source ~/.hermes/state.db --inspect-only
```

`--inspect-only` はファイルを一切変更しません。保存領域が復旧可能だと報告された場合は、
表示されたコマンドに従うか、`state-snapshots/` から最新のスナップショットを戻してください。これらすべての
背後にある仕組みは、開発者ガイドで解説しています。
[State DB の復旧](/hermes/docs/developer-guide/state-db-recovery/) と
[セッションの保存](/hermes/docs/developer-guide/session-storage/) です。
