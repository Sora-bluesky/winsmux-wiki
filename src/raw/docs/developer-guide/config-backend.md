---
title: "設定バックエンドの境界層"
description: "プロファイルのユーザー config.yaml がどこで読み書きされるかを解説します。ConfigBackend という境界層、file と remote の各バックエンド、そしてすべての呼び出し元にこの境界層を使わせる CI の lint について説明します"
upstream_path: developer-guide/config-backend.md
upstream_blob: 4a921560f6945a42644901c9ba164abc53751da1
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/config-backend
---

# 設定バックエンドの境界層 {#config-backend-seam}

プロファイルのユーザー `config.yaml` に対する読み込み、stat、存在確認、書き込みは、すべて
`hermes_cli/config_backend.py` を経由します。バックエンドはプロセスごとに一度だけ
`HERMES_CONFIG_BACKEND` から選ばれ、設定値から選ばれることはありません。既定は `file` で、`remote` は
[リモート設定](/hermes/docs/user-guide/remote-config/)（`plugins/config_backends/remote/`）を指します。

## ヘルパー {#helpers}

| ヘルパー | 用途 |
|---|---|
| `read_config_doc(path)` | パース済みのユーザーレイヤーを返します（例外の出し方は `open` + `fast_safe_load` と同じです） |
| `read_config_doc_readonly(path)` | シグネチャでキャッシュされた読み込みです。結果は決して変更しないでください |
| `config_version(path)` | 変更シグネチャです（ファイルの stat タプル、またはリモートのバージョン） |
| `config_cache_version(path)`（`config_cache_version_or_none`） | パース結果のキャッシュに使うシグネチャです。file バックエンドでは stat タプルに加え、mtime と ctime の新しい方が `utils.RACY_MTIME_WINDOW_NS` より若い間は内容のダイジェストも含めます（`utils.file_cache_version`）。remote バックエンドではリモートのバージョンです |
| `config_exists(path)` | レイヤーが存在するかどうかです（リモートのレイヤーは常に存在します） |
| `config_version_or_none(path)` / `version_token(version)` | バージョン、または存在しない場合は None を返します。後者はバージョンに連動して変わる数値です（TUI／セッションの `mtime`） |
| `probe_config_readable(path)` | レイヤーを読めない間は `OSError` を送出します（パースはしません）。remote バックエンドでは、プレーンがレイヤーを提供できない間 `ConfigBackendUnavailable` を送出します |
| `write_config_document(path, doc)` / `write_config_key(path, key, value)` | 書き込みです。呼び出し元は通常 `atomic_config_write` / `atomic_config_replace` を使います |
| `supports_file_tooling()` / `require_file_tooling(what)` | ファイルそのものをコピー・編集・バックアップするツール（`config edit`、バックアップ／復元、プロファイルの複製）を通すかどうかの関門です |

ユーザーレイヤーとして扱われるのは `<home>/config.yaml` だけです。これらのヘルパーに渡されたそれ以外のファイル（インポート元やフィクスチャなど）は、どのバックエンドが選ばれていても、その場所でそのまま読み書きされます。パース結果のキャッシュは `config_version` ではなく `config_cache_version` をキーにします。マルチグレインのタイムスタンプを持たないカーネルでは、読み込みと同じティック内でサイズの変わらないインプレース書き換えが起きると、mtime、ctime、サイズ、inode がすべて変わりません。そのため stat タプルだけでは、プロセスが動いている間ずっと古いパース結果が固定されてしまいます（よく被害を受けるのは、ローテーションされた `api_key` です）。
キャッシュの元になるそれ以外のファイル（`auth.json`、ペアリング一覧、`.env`、トークンファイル、管理用オーバーレイ）は `utils.file_cache_version(path)` をキーにします。保存しておいて、かなり後で比較するシグネチャ（誤検知すると何かを再接続してしまう変更検知や、パース失敗の記録など）では `always_digest=True` を渡します。ファイルが落ち着くと、競合対策のダイジェストは空になってしまうからです（skills のマニフェスト、フックの同意、無料枠、オンボーディングの各スタンプがこれに当たります）。「最近かどうか」は mtime だけでなく ctime でも判定します。`cp -p` や `rsync --inplace -t` は書き込み後に古い mtime を復元するためです。凍結された設定スナップショットに結び付いたワーカーは、`config.yaml` のハッシュを取りません。そこではキーが stat のみのままなので、内容チェックのためにそうしたワーカーがプロファイルのファイルを開くことはありません。`config_cache_version` をキーにしたキャッシュは、リモートのポーリングで新しいレイヤーが反映されたときにもミスします。ローカルのファイルを編集した後とまったく同じです。file バックエンドでは、管理スコープ（`/etc/hermes`）はユーザーレイヤーの上に重なるオーバーレイのままです。remote バックエンドは管理用の `config.yaml` を無視します。設定とロックはリモート設定からのみ取得され、このファイルが存在すると `hermes doctor` が警告します。管理用の `.env` は、どちらのモードでも引き続き適用されます。

一緒に変更しなければならない関連キー（モデル切り替え時の `model.*` キーや、TUI の `/focus` の切り替えなど）は、`write_config_keys(path, {key: value, ...})` を通します。remote バックエンドはこれらを 1 回の CAS 書き込みとして送るため、どれか 1 つにロックがかかっていれば、すべての書き込みが拒否されます。

## lint {#lints}

- `scripts/check_config_yaml_writers.py` は、設定パスへの YAML の直接ダンプを拒否します。
- `scripts/check_config_yaml_readers.py` は、設定パスに対する直接の `open` / `read_text` / `stat` /
  `exists` / YAML 読み込みを拒否します。本当に誤検知である場合（別の製品の設定ファイルや、
  すでに `supports_file_tooling()` で制限されているファイル操作ツールなど）は、その行に
  `# config-reader: ok — <why>` を付けます。