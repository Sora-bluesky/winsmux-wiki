---
title: "コンテキストファイル"
description: "プロジェクトのコンテキストファイル（.hermes.md、AGENTS.md、CLAUDE.md、グローバルな SOUL.md、.cursorrules）は、すべての会話に自動で読み込まれます"
upstream_path: user-guide/features/context-files.md
upstream_blob: b5c628213d4309c32f9a51cbcd6d3d845396a6cb
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/context-files
---

# コンテキストファイル {#context-files}

Hermes Agent は、振る舞いを決めるコンテキストファイルを自動で見つけて読み込みます。一部はプロジェクトごとのファイルで、作業ディレクトリから探し出されます。`SOUL.md` は現在 Hermes インスタンス全体に対するグローバルな設定になっていて、`HERMES_HOME` からのみ読み込まれます。

## 対応しているコンテキストファイル {#supported-context-files}

| ファイル | 役割 | 探し方 |
|------|---------|-----------| 
| **.hermes.md** / **HERMES.md** | プロジェクトへの指示（最優先） | git のルートまでさかのぼる |
| **AGENTS.override.md** | AGENTS.md をディレクトリ単位で個人的に上書きするもの（通常は gitignore する） | 起動時のカレントディレクトリ + サブディレクトリを随時 |
| **AGENTS.md** | プロジェクトへの指示、規約、アーキテクチャ | 起動時のカレントディレクトリ + サブディレクトリを随時 |
| **CLAUDE.md** | Claude Code のコンテキストファイル（これも検出されます） | 起動時のカレントディレクトリ + サブディレクトリを随時 |
| **SOUL.md** | この Hermes インスタンスの人格と話し方をグローバルに調整する | `HERMES_HOME/SOUL.md` のみ |
| **.cursorrules** | Cursor IDE のコーディング規約 | カレントディレクトリのみ |
| **.cursor/rules/*.mdc** | Cursor IDE のルールモジュール | カレントディレクトリのみ |

:::info 優先順位のしくみ
1 つのセッションで読み込まれるプロジェクトのコンテキストは **1 種類だけ** です（最初に見つかったものが採用されます）。順番は `.hermes.md` → `AGENTS.override.md` → `AGENTS.md` → `CLAUDE.md` → `.cursorrules` です。**SOUL.md** はこれとは別に、エージェントの人格（スロット #1）として常に読み込まれます。

`AGENTS.md` の隣に `AGENTS.override.md` があると、コミット済みのファイルの **代わりに** 上書き用のファイルが読み込まれます。リポジトリに入っている `AGENTS.md` はそのままにして、自分だけの指示を使いたいときは、個人用（通常は gitignore する）の `AGENTS.override.md` を置いてください。
:::

## AGENTS.md {#agentsmd}

`AGENTS.md` は、プロジェクトのコンテキストファイルの中心になるものです。プロジェクトがどう構成されているか、どんな規約に従うか、特別な指示があるかをエージェントに伝えます。

### ディレクトリの連なり（git のルート → 作業ディレクトリ） {#directory-chain-git-root-working-directory}

作業ディレクトリが git リポジトリの中にある場合、Hermes はセッション開始時に `AGENTS.md` を **つなげて** 読み込みます。まず git のルートにある `AGENTS.md`、続いて作業ディレクトリまでの途中にあるすべてのディレクトリの `AGENTS.md` です。深い場所のファイルほどプロンプトの後ろに置かれるので、より具体的な指示が優先されます。それぞれのファイルには出どころを示す見出し（たとえば `## ../../AGENTS.md`）が付き、連なりの中で内容がまったく同じものは重複が取り除かれます。

```
monorepo/                   (git root, cwd = packages/webapp/)
├── AGENTS.md              ← Loaded first (repo-wide conventions)
└── packages/
    ├── AGENTS.md          ← Loaded second
    └── webapp/
        └── AGENTS.md      ← Loaded last (most specific, takes precedence)
```

git リポジトリの外では、作業ディレクトリ自身しか調べません。親ディレクトリは一切見ないので、`/tmp` や `$HOME` に置かれた `AGENTS.md` が無関係なセッションに紛れ込むことはありません。

### サブディレクトリを随時見つけるしくみ {#progressive-subdirectory-discovery}

セッション開始時、Hermes は作業ディレクトリの `AGENTS.md` をシステムプロンプトに読み込みます。セッション中にエージェントがサブディレクトリへ入っていくと（`read_file`、`terminal`、`search_files` などを通じて）、そのディレクトリのコンテキストファイルを **その都度見つけて**、必要になった時点で会話に差し込みます。

```
my-project/
├── AGENTS.md              ← Loaded at startup (system prompt)
├── frontend/
│   └── AGENTS.md          ← Discovered when agent reads frontend/ files
├── backend/
│   └── AGENTS.md          ← Discovered when agent reads backend/ files
└── shared/
    └── AGENTS.md          ← Discovered when agent reads shared/ files
```

このやり方には、起動時にすべてを読み込む場合と比べて 2 つの利点があります。

- **システムプロンプトが膨らまない** — サブディレクトリの情報は必要になったときだけ現れます
- **プロンプトキャッシュが保たれる** — システムプロンプトがやり取りをまたいで変わりません

サブディレクトリを調べるのは、1 セッションにつき 1 回までです。この探索は親ディレクトリにもさかのぼるので、`backend/src/main.py` を読めば、`backend/src/` 自体にコンテキストファイルがなくても `backend/AGENTS.md` が見つかります。

:::info
サブディレクトリのコンテキストファイルも、起動時のファイルと同じ[セキュリティ検査](#security-prompt-injection-protection)を通ります。悪意のあるファイルは読み込みが止められます。
:::

### AGENTS.md の例 {#example-agentsmd}

```markdown
# Project Context

This is a Next.js 14 web application with a Python FastAPI backend.

## Architecture
- Frontend: Next.js 14 with App Router in `/frontend`
- Backend: FastAPI in `/backend`, uses SQLAlchemy ORM
- Database: PostgreSQL 16
- Deployment: Docker Compose on a Hetzner VPS

## Conventions
- Use TypeScript strict mode for all frontend code
- Python code follows PEP 8, use type hints everywhere
- All API endpoints return JSON with `{data, error, meta}` shape
- Tests go in `__tests__/` directories (frontend) or `tests/` (backend)

## Important Notes
- Never modify migration files directly — use Alembic commands
- The `.env.local` file has real API keys, don't commit it
- Frontend port is 3000, backend is 8000, DB is 5432
```

## SOUL.md {#soulmd}

`SOUL.md` は、エージェントの人格、話し方、伝え方を決めます。詳しくは[人格](/hermes/docs/user-guide/features/personality/)のページをご覧ください。

**置き場所:**

- `~/.hermes/SOUL.md`
- カスタムのホームディレクトリで Hermes を動かしている場合は `$HERMES_HOME/SOUL.md`

押さえておきたい点は次のとおりです。

- `SOUL.md` がまだ無ければ、Hermes が既定の内容で自動的に作ります
- Hermes は `SOUL.md` を `HERMES_HOME` からのみ読み込みます
- Hermes は作業ディレクトリの `SOUL.md` を探しません
- ファイルが空の場合、`SOUL.md` からプロンプトに加わるものはありません
- 中身がある場合は、検査と切り詰めを経たうえでそのまま差し込まれます

## .cursorrules {#cursorrules}

Hermes は Cursor IDE の `.cursorrules` ファイルと `.cursor/rules/*.mdc` のルールモジュールに対応しています。これらがプロジェクトのルートにあり、優先度の高いコンテキストファイル（`.hermes.md`、`AGENTS.md`、`CLAUDE.md`）が見つからなければ、プロジェクトのコンテキストとして読み込まれます。

つまり、Cursor で使っている規約が、Hermes でもそのまま効きます。

## コンテキストファイルが読み込まれるまで {#how-context-files-are-loaded}

### 起動時（システムプロンプト） {#at-startup-system-prompt}

コンテキストファイルは `agent/prompt_builder.py` の `build_context_files_prompt()` が読み込みます。

1. **作業ディレクトリを調べる** — `.hermes.md` → `AGENTS.md` → `CLAUDE.md` → `.cursorrules` の順に探し、最初に見つかったものを使います
2. **中身を読み取る** — 各ファイルを UTF-8 のテキストとして読みます
3. **セキュリティ検査** — プロンプトインジェクションのパターンがないか確認します
4. **切り詰め** — 文字数の上限を超えるファイルは、先頭と末尾を残して切り詰めます（先頭 70%、末尾 20%、間に印を入れます）。上限は config.yaml で `context_file_max_chars` を指定していればその値、指定がなければモデルのコンテキストウィンドウに応じて自動で決まります（下限 20,000 文字、上限 500,000 文字）
5. **組み立て** — すべての節を `# Project Context` という見出しの下にまとめます
6. **差し込み** — まとめた内容をシステムプロンプトに加えます

### セッション中（随時見つける） {#during-the-session-progressive-discovery}

`agent/subdirectory_hints.py` の `SubdirectoryHintTracker` が、ツール呼び出しの引数にファイルパスがないか見張っています。

1. **パスの抽出** — ツールを呼び出すたびに、引数（`path`、`workdir`、シェルコマンド）からファイルパスを取り出します
2. **親をたどる** — そのディレクトリと最大 5 階層上の親ディレクトリを調べます（すでに見たディレクトリで打ち切ります）
3. **読み込み** — `AGENTS.md`、`CLAUDE.md`、`.cursorrules` のいずれかが見つかれば読み込みます（ディレクトリごとに最初の 1 つ）
4. **セキュリティ検査** — 起動時のファイルと同じプロンプトインジェクション検査を通します
5. **切り詰め** — 1 ファイルあたり 8,000 文字が上限です
6. **差し込み** — ツールの結果に続けて付け加えるので、モデルは自然な流れで内容を目にします

最終的なプロンプトの該当部分は、おおよそ次のようになります。

```text
# Project Context

The following project context files have been loaded and should be followed:

## AGENTS.md

[Your AGENTS.md content here]

## .cursorrules

[Your .cursorrules content here]

[Your SOUL.md content here]
```

SOUL の内容は、余計な前置きなしにそのまま差し込まれている点に注目してください。

## セキュリティ: プロンプトインジェクション対策 {#security-prompt-injection-protection}

コンテキストファイルは、取り込まれる前にすべてプロンプトインジェクションの疑いがないか検査されます。検査で見ているのは次のようなものです。

- **指示を上書きしようとするもの**: 「ignore previous instructions」「disregard your rules」
- **だまそうとするもの**: 「do not tell the user」
- **システムプロンプトの上書き**: 「system prompt override」
- **隠された HTML コメント**: `<!-- ignore instructions -->`
- **隠された div 要素**: `<div style="display:none">`
- **認証情報の持ち出し**: `curl ... $API_KEY`
- **秘密のファイルへのアクセス**: `cat .env`、`cat credentials`
- **目に見えない文字**: ゼロ幅スペース、双方向テキストの上書き、ワードジョイナー

危険なパターンが 1 つでも見つかると、そのファイルは読み込まれません。

```
[BLOCKED: AGENTS.md contained potential prompt injection (prompt_injection). Content not loaded.]
```

:::warning
この検査はよくあるインジェクションのパターンを防ぎますが、共有リポジトリのコンテキストファイルに目を通す代わりにはなりません。自分で書いたのではないプロジェクトの AGENTS.md は、必ず中身を確かめてください。
:::

## 大きさの上限 {#size-limits}

| 項目 | 値 |
|-------|-------|
| 1 ファイルあたりの最大文字数 | `context_file_max_chars` を指定していればその値。指定がなければ自動（モデルのコンテキストウィンドウに応じて変わり、下限 20,000、上限 500,000） |
| 先頭に残す割合 | 70% |
| 末尾に残す割合 | 20% |
| 切り詰めの印 | 10%（文字数を示し、ファイル用のツールを使うようすすめます） |

上限を超えたファイルでは、次のような切り詰めのメッセージが表示されます。

```
[...truncated AGENTS.md: kept 14000+4000 of 25000 chars. Use file tools to read the full file.]
```

## 効果的なコンテキストファイルのこつ {#tips-for-effective-context-files}

:::tip AGENTS.md をうまく書くために
1. **簡潔に保つ** — 設定した `context_file_max_chars` の範囲に収めます。エージェントは毎回これを読みます
2. **見出しで構造を作る** — アーキテクチャ、規約、注意点などを `##` の節に分けます
3. **具体例を入れる** — 好ましいコードの書き方、API の形、命名規約を示します
4. **やってはいけないことも書く** — 「マイグレーションファイルを直接書き換えない」など
5. **主要なパスとポートを挙げる** — エージェントはこれをターミナルのコマンドで使います
6. **プロジェクトの変化に合わせて更新する** — 古い情報は、情報が無いより悪い結果になります
:::

### サブディレクトリごとのコンテキスト {#per-subdirectory-context}

モノレポでは、サブディレクトリ向けの指示を入れ子の AGENTS.md に置いてください。

```markdown
<!-- frontend/AGENTS.md -->
# Frontend Context

- Use `pnpm` not `npm` for package management
- Components go in `src/components/`, pages in `src/app/`
- Use Tailwind CSS, never inline styles
- Run tests with `pnpm test`
```

```markdown
<!-- backend/AGENTS.md -->
# Backend Context

- Use `poetry` for dependency management
- Run the dev server with `poetry run uvicorn main:app --reload`
- All endpoints need OpenAPI docstrings
- Database models are in `models/`, schemas in `schemas/`
```
