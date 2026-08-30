---
title: "Codebase Inspection — pygount でコードベースを調べる: 行数・言語の内訳・比率"
description: "pygount でコードベースを調べる: 行数・言語の内訳・比率"
upstream_path: user-guide/skills/bundled/software-development/software-development-codebase-inspection.md
upstream_blob: e4d49e9d14fb4b14781d3cbdb62ea8457391e1b4
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/software-development/software-development-codebase-inspection
---

# Codebase Inspection {#codebase-inspection}

pygount でコードベースを調べます。行数、言語の内訳、比率がわかります。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/software-development\codebase-inspection` |
| バージョン | `1.0.0` |
| 作者 | Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `LOC`, `Code Analysis`, `pygount`, `Codebase`, `Metrics`, `Repository` |
| 関連 skill | [`github`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-github/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# pygount でコードベースを調べる {#codebase-inspection-with-pygount}

`pygount` を使って、リポジトリのコード行数、言語ごとの内訳、ファイル数、コードとコメントの比率を調べます。

## こんなときに使います {#when-to-use}

- コード行数（LOC）を数えてほしいと言われたとき
- リポジトリの言語ごとの内訳を知りたいとき
- コードベースの規模や構成について聞かれたとき
- コードとコメントの比率を知りたいとき
- 「このリポジトリはどれくらいの大きさ？」といった大まかな質問

## 事前に必要なもの {#prerequisites}

```bash
pip install --break-system-packages pygount 2>/dev/null || pip install pygount
```

## 1. 基本のまとめ（いちばんよく使う） {#1-basic-summary-most-common}

ファイル数、コード行数、コメント行数を含む、言語ごとの内訳をひととおり出します。

```bash
cd /path/to/repo
pygount --format=summary \
  --folders-to-skip=".git,node_modules,venv,.venv,__pycache__,.cache,dist,build,.next,.tox,.eggs,*.egg-info" \
  .
```

**重要:** `--folders-to-skip` で依存パッケージやビルド成果物のディレクトリを必ず除外してください。除外しないと pygount がそこまで走査してしまい、非常に時間がかかったり、応答が返らなくなったりします。

## 2. よく除外するフォルダ {#2-common-folder-exclusions}

プロジェクトの種類に合わせて調整します。

```bash
# Python projects
--folders-to-skip=".git,venv,.venv,__pycache__,.cache,dist,build,.tox,.eggs,.mypy_cache"

# JavaScript/TypeScript projects
--folders-to-skip=".git,node_modules,dist,build,.next,.cache,.turbo,coverage"

# General catch-all
--folders-to-skip=".git,node_modules,venv,.venv,__pycache__,.cache,dist,build,.next,.tox,vendor,third_party"
```

## 3. 言語を絞って数える {#3-filter-by-specific-language}

```bash
# Only count Python files
pygount --suffix=py --format=summary .

# Only count Python and YAML
pygount --suffix=py,yaml,yml --format=summary .
```

## 4. ファイル単位で細かく出す {#4-detailed-file-by-file-output}

```bash
# Default format shows per-file breakdown
pygount --folders-to-skip=".git,node_modules,venv" .

# Sort by code lines (pipe through sort)
pygount --folders-to-skip=".git,node_modules,venv" . | sort -t$'\t' -k1 -nr | head -20
```

## 5. 出力の形式 {#5-output-formats}

```bash
# Summary table (default recommendation)
pygount --format=summary .

# JSON output for programmatic use
pygount --format=json .

# Pipe-friendly: Language, file count, code, docs, empty, string
pygount --format=summary . 2>/dev/null
```

## 6. 結果の読み方 {#6-interpreting-results}

まとめの表の列は次のとおりです。
- **Language** — 判定された言語
- **Files** — その言語のファイル数
- **Code** — 実際のコード行数（実行される行や宣言の行）
- **Comment** — コメントや説明にあたる行数
- **%** — 全体に占める割合

言語のように見えて、特別な意味を持つ表示もあります。
- `__empty__` — 中身が空のファイル
- `__binary__` — バイナリのファイル（画像やコンパイル済みのものなど）
- `__generated__` — 自動生成されたファイル（推定で判定）
- `__duplicate__` — 中身がまったく同じファイル
- `__unknown__` — 種類を判定できなかったファイル

## つまずきやすいところ {#pitfalls}

1. **.git、node_modules、venv は必ず除外する** — `--folders-to-skip` を付けないと pygount がすべてを走査するため、依存パッケージが多いと数分かかったり、応答が返らなくなったりします。
2. **Markdown のコード行数が 0 になる** — pygount は Markdown の中身をすべてコメント扱いにし、コードとは数えません。仕様どおりの動きです。
3. **JSON のコード行数が少なく出る** — pygount は JSON の行を控えめに数えることがあります。正確な行数がほしいときは `wc -l` を直接使ってください。
4. **大きなモノレポ** — 規模がとても大きいリポジトリでは、全体を走査せず `--suffix` で言語を絞ることを検討してください。
