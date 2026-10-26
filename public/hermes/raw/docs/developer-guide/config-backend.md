---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "設定バックエンドの境界（seam）"
description: "プロファイルのユーザー用 config.yaml をどこで読み書きしているか。ConfigBackend という境界、そのファイル用バックエンド、そしてすべての呼び出し元がこの境界を通るよう保つ CI の lint について説明します"
upstream_path: developer-guide/config-backend.md
upstream_blob: 8c3afdf9499752bd40ba25ad7b324a9054ba5461
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
| `config_version(path)` | キャッシュ用のシグネチャ（ファイルの stat タプル）を返します |
| `config_exists(path)` | 層が存在するかどうかを返します |
| `probe_config_readable(path)` | 層を読めない間は `OSError` を送出します（解析はしません） |
| `write_config_document(path, doc)` / `write_config_key(path, key, value)` | 書き込み用です。呼び出し元は通常 `atomic_config_write` / `atomic_config_replace` を使います |

ユーザー層として扱われるのは `<home>/config.yaml` だけです。それ以外のファイル（インポート元やテスト用のフィクスチャなど）を
これらのヘルパーに渡した場合は、そのファイルがある場所でそのまま読み書きされます。`config_version` をキーにしたキャッシュは、
バックエンドの層が変わるたびに無効になります。管理用スコープ（`/etc/hermes`）は、バックエンドがどんなユーザー層を返しても、
常にその上に重ねられる層のままです。

## lint {#lints}

- `scripts/check_config_yaml_writers.py` は、設定ファイルのパスに YAML を直接書き出す処理を拒否します。
- `scripts/check_config_yaml_readers.py` は、設定ファイルのパスに対する直接の `open` / `read_text` / `stat` /
  `exists` / YAML 読み込みを拒否します。本当に誤検知である場合（別の製品の設定
  ファイルや、ローカルファイルそのものをコピー・編集するツール。たとえば `config edit`、バックアップ、プロファイルの
  複製など）は、その行に `# config-reader: ok — <why>` を付けます。
