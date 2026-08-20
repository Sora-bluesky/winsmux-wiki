---
title: "Codebase Inspection — pygount でコードベースを調べる: 行数・言語・比率"
description: "pygount でコードベースを調べる: 行数・言語・比率"
upstream_path: user-guide/skills/bundled/github/github-codebase-inspection.md
upstream_blob: f727c1cd311dc597047d9365924821fecd214684
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/github/github-codebase-inspection
---

# Codebase Inspection {#codebase-inspection}

pygount でコードベースを調べます。行数、言語、比率が分かります。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/github/codebase-inspection` |
| バージョン | `1.0.0` |
| 作者 | Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `LOC`, `Code Analysis`, `pygount`, `Codebase`, `Metrics`, `Repository` |
| 関連 skill | [`github-repo-management`](/hermes/docs/user-guide/skills/bundled/github/github-github-repo-management/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# pygount でコードベースを調べる {#codebase-inspection-with-pygount}

`pygount` を使って、リポジトリのコード行数、言語ごとの内訳、ファイル数、コードとコメントの比率を調べます。

## こんなときに使います {#when-to-use}

- コード行数（LOC）を数えてほしいと言われたとき
- リポジトリの言語ごとの内訳を知りたいと言われたとき
- コードベースの規模や中身の割合について聞かれたとき
- コードとコメントの比率を知りたいと言われたとき
- 「このリポジトリはどれくらいの大きさ?」といった漠然とした質問

## 事前に必要なもの {#prerequisites}

```bash
pip install --break-system-packages pygount 2>/dev/null || pip install pygount
```

## 1. 基本の集計（いちばんよく使います） {#1-basic-summary-most-common}

ファイル数、コード行数、コメント行数を含む、言語ごとの内訳をひととおり出します。

```bash
cd /path/to/repo
pygount --format=summary \
  --folders-to-skip=".git,node_modules,venv,.venv,__pycache__,.cache,dist,build,.next,.tox,.eggs,*.egg-info" \
  .
```

**重要:** 依存関係やビルド成果物のディレクトリーを外すため、`--folders-to-skip` を必ず付けてください。付けないと pygount がそれらまで走査して、とても時間がかかるか、そのまま固まります。

## 2. よく除外するフォルダー {#2-common-folder-exclusions}

プロジェクトの種類に合わせて変えてください。

```bash
# Python projects
--folders-to-skip=".git,venv,.venv,__pycache__,.cache,dist,build,.tox,.eggs,.mypy_cache"

# JavaScript/TypeScript projects
--folders-to-skip=".git,node_modules,dist,build,.next,.cache,.turbo,coverage"

# General catch-all
--folders-to-skip=".git,node_modules,venv,.venv,__pycache__,.cache,dist,build,.next,.tox,vendor,third_party"
```

## 3. 言語をしぼって数える {#3-filter-by-specific-language}

```bash
# Only count Python files
pygount --suffix=py --format=summary .

# Only count Python and YAML
pygount --suffix=py,yaml,yml --format=summary .
```

## 4. ファイルごとの詳しい出力 {#4-detailed-file-by-file-output}

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

集計表の列は次のとおりです。
- **Language** — 判別した言語
- **Files** — その言語のファイル数
- **Code** — 実際のコードの行数（実行される部分や宣言）
- **Comment** — コメントや説明の行数
- **%** — 全体に占める割合

特別な擬似言語です。
- `__empty__` — 空のファイル
- `__binary__` — バイナリーファイル（画像、コンパイル済みのものなど）
- `__generated__` — 自動生成されたファイル（推測で判別しています）
- `__duplicate__` — 中身がまったく同じファイル
- `__unknown__` — 種類を判別できなかったファイル

## つまずきやすいところ {#pitfalls}

1. **.git、node_modules、venv は必ず除外してください** — `--folders-to-skip` を付けないと pygount はすべてを走査するので、大きな依存関係のツリーでは数分かかったり、固まったりします。
2. **Markdown のコード行数が 0 になります** — pygount は Markdown の中身をすべてコメントとして数え、コードとしては数えません。そういう仕様です。
3. **JSON のコード行数が少なく出ます** — pygount は JSON の行を控えめに数えることがあります。JSON の正確な行数がほしいときは `wc -l` を直接使ってください。
4. **大きなモノレポ** — とても大きなリポジトリでは、全部を走査するのではなく `--suffix` で言語をしぼることを検討してください。
