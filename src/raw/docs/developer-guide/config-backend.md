---
title: "設定バックエンドの境界（seam）"
description: "プロファイルのユーザー用 config.yaml をどこで読み書きしているか。ConfigBackend という境界、そのファイル用バックエンド、そしてすべての呼び出し元がこの境界を通るよう保つ CI の lint について説明します"
upstream_path: developer-guide/config-backend.md
upstream_blob: 158fd4fa42c48f272b75ed3388d4b8364c83cb0e
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/config-backend
---

# 設定バックエンドの境界（seam） {#config-backend-seam}

プロファイルのユーザー用 `config.yaml` に対する読み込み、stat の取得、存在確認、書き込みは、すべて
`hermes_cli/config_backend.py` を通ります。`get_config_backend()` は、どのホームに対してもバックエンドを返します。現在の実装は
`FileBackend` で、ローカルの `config.yaml` を扱います。中身は、この境界ができる前に Hermes が使っていた処理とまったく同じです
（stat によるシグネチャ、`fast_safe_load`、ruamel で書式を保ったまま書き戻す writer）。設定の層をローカルファイルとして
保存しないバックエンドを作る場合も、同じ `ConfigBackend` プロトコルを実装するだけで済みます。呼び出し元はすべて、
すでにこの境界を経由しているからです。

## ヘルパー {#helpers}

| ヘルパー | 用途 |
|---|---|
| `read_config_doc(path)` | ユーザー層を解析した結果を返します（エラーの出し方は `open` + `fast_safe_load` と同じです） |
| `read_config_doc_readonly(path)` | シグネチャでキャッシュされた読み込みです。結果は絶対に書き換えないでください |
| `config_version(path)` | 変更検出用のシグネチャ（ファイルの stat タプル）を返します |
| `config_cache_version(path)` (`config_cache_version_or_none`) | 解析結果をキャッシュするためのシグネチャです。stat タプルに加えて、mtime と ctime のうち新しいほうが `utils.RACY_MTIME_WINDOW_NS` より若い間は、内容のダイジェストも含みます（ファイル用バックエンドでは `utils.file_cache_version`） |
| `config_exists(path)` | 層が存在するかどうかを返します |
| `probe_config_readable(path)` | 層を読めない間は `OSError` を送出します（解析はしません） |
| `write_config_document(path, doc)` / `write_config_key(path, key, value)` | 書き込み用です。呼び出し元は通常 `atomic_config_write` / `atomic_config_replace` を使います |

ユーザー層として扱われるのは `<home>/config.yaml` だけです。それ以外のファイル（インポート元やテスト用のフィクスチャなど）を
これらのヘルパーに渡した場合は、そのファイルがある場所でそのまま読み書きされます。解析結果のキャッシュは
`config_version` ではなく `config_cache_version` をキーにします。マルチグレインのタイムスタンプを持たないカーネルでは、
読み込みと同じ時刻の刻み（tick）の間に同じサイズのままその場で書き換えられると、mtime、ctime、サイズ、inode がどれも変わりません。
そのため stat タプルだけでは、プロセスが動いている間ずっと古い解析結果が使われ続けます（よく被害を受けるのは、ローテーションした `api_key` です）。
キャッシュの元になるそれ以外のファイル（`auth.json`、ペアリングの一覧、`.env`、トークンファイル、管理用の重ね合わせ層）は、
`utils.file_cache_version(path)` をキーにします。保存してからずっと後で比較するシグネチャ（誤検知すると何かを再接続してしまう変更検出や、
解析失敗の記録など）には `always_digest=True` を渡します。直近の書き換えに備えたダイジェストは、ファイルが落ち着くと空になってしまうためです
（スキルのマニフェスト、フックの同意、無料枠、オンボーディングの各スタンプがこれに当たります）。「最近かどうか」は mtime だけでなく
ctime でも判断します。`cp -p` や `rsync --inplace -t` は、書き込んだあとで古い mtime を復元するからです。固定された設定スナップショットに
結び付いたワーカーは、`config.yaml` のハッシュを計算しません。そこではキーが stat だけのままなので、内容の確認のためにそうしたワーカーが
プロファイルのファイルを開くことはありません。管理用スコープ（`/etc/hermes`）は、バックエンドがどんなユーザー層を返しても、
常にその上に重ねられる層のままです。

## lint {#lints}

- `scripts/check_config_yaml_writers.py` は、設定ファイルのパスに YAML を直接書き出す処理を拒否します。
- `scripts/check_config_yaml_readers.py` は、設定ファイルのパスに対する直接の `open` / `read_text` / `stat` /
  `exists` / YAML 読み込みを拒否します。本当に誤検知である場合（別の製品の設定
  ファイルや、ローカルファイルそのものをコピー・編集するツール。たとえば `config edit`、バックアップ、プロファイルの
  複製など）は、その行に `# config-reader: ok — <why>` を付けます。