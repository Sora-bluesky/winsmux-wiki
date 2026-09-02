---
title: "コンテキストファイル"
description: "プロジェクトのコンテキストファイル（.hermes.md、AGENTS.md、CLAUDE.md、全体共通の SOUL.md、.cursorrules）は、どの会話にも自動で読み込まれます"
upstream_path: user-guide/features/context-files.md
upstream_blob: 2906c4f780bbcc2920a691bb9e6d1a73756cf5ec
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/context-files
---

# コンテキストファイル {#context-files}

Hermes Agent は、自分のふるまいを決めるコンテキストファイルを自動で見つけて読み込みます。プロジェクトに置くものは、作業ディレクトリを起点に探します。`SOUL.md` は現在では Hermes のインスタンス全体で共通のものになり、`HERMES_HOME` からだけ読み込まれます。

## 対応しているコンテキストファイル {#supported-context-files}

| ファイル | 役割 | 探し方 |
|------|---------|-----------| 
| **.hermes.md** / **HERMES.md** | プロジェクトへの指示（最優先） | git のルートまでさかのぼる |
| **AGENTS.override.md** | AGENTS.md をディレクトリごとに個人用に上書きするもの（ふつうは git 管理から外す） | 起動時の作業ディレクトリ＋その下は進みながら |
| **AGENTS.md** | プロジェクトへの指示、決めごと、構成 | 起動時の作業ディレクトリ＋その下は進みながら |
| **CLAUDE.md** | Claude Code のコンテキストファイル（これも見ます） | 起動時の作業ディレクトリ＋その下は進みながら |
| **SOUL.md** | この Hermes インスタンス全体の人格と口調の調整 | `HERMES_HOME/SOUL.md` だけ |
| **.cursorrules** | Cursor IDE のコーディングの決めごと | 作業ディレクトリだけ |
| **.cursor/rules/*.mdc** | Cursor IDE のルールのまとまり | 作業ディレクトリだけ |

:::info 優先順位のしくみ
プロジェクト側のコンテキストは、1 セッションにつき **ひとつ** だけ読み込まれます（最初に見つかったものが勝ちます）。順番は `.hermes.md` → `AGENTS.override.md` → `AGENTS.md` → `CLAUDE.md` → `.cursorrules` です。**SOUL.md** はこれとは別に、エージェントの人格としてつねに読み込まれます（枠 #1）。

`AGENTS.md` の隣に `AGENTS.override.md` があると、コミットされているほうの **代わりに** 上書き側が読み込まれます。リポジトリに入っている指示とは違う指示で動かしたいけれど、追跡されている `AGENTS.md` は触りたくない、というときは、個人用の（たいていは git 管理から外した）`AGENTS.override.md` を置いてください。
:::

## AGENTS.md {#agentsmd}

`AGENTS.md` は、プロジェクトのコンテキストファイルの本命です。プロジェクトがどう組み立てられているか、どんな決めごとに従うか、特別な指示があるかを、エージェントに伝えます。

### ディレクトリの連なり（git のルート → 作業ディレクトリ） {#directory-chain-git-root-working-directory}

作業ディレクトリが git リポジトリの中にあるとき、Hermes はセッションの開始時に `AGENTS.md` を **つなげて** 読み込みます。まず git のルートの `AGENTS.md`、続いてそこから作業ディレクトリまでの途中にある各ディレクトリの `AGENTS.md` です。深いところにあるファイルほどプロンプトの後ろに置かれるので、より具体的な指示が優先されます。それぞれのファイルには出どころの見出し（たとえば `## ../../AGENTS.md`）が付き、連なりの中に同じ内容があれば重複は取り除かれます。

```
monorepo/                   (git root, cwd = packages/webapp/)
├── AGENTS.md              ← Loaded first (repo-wide conventions)
└── packages/
    ├── AGENTS.md          ← Loaded second
    └── webapp/
        └── AGENTS.md      ← Loaded last (most specific, takes precedence)
```

git リポジトリの外では、作業ディレクトリそのものしか見ません。親をたどることはないので、`/tmp` や `$HOME` に置かれた `AGENTS.md` が、関係のないセッションに紛れ込むことはありません。

### 下のディレクトリを進みながら見つける {#progressive-subdirectory-discovery}

セッションの開始時、Hermes は作業ディレクトリの `AGENTS.md` をシステムプロンプトに読み込みます。そしてセッションの途中でエージェントが下のディレクトリへ入っていくと（`read_file`、`terminal`、`search_files` などを通して）、そこにあるコンテキストファイルを **進みながら見つけて**、必要になったその場で会話に差し込みます。

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

このやり方には、起動時に全部読み込む場合と比べて 2 つの利点があります。
- **システムプロンプトが膨らまない** — 下のディレクトリの手がかりは、必要になったときだけ出てきます
- **プロンプトキャッシュが保たれる** — システムプロンプトがターンをまたいで変わりません

同じディレクトリを見にいくのは、1 セッションにつき多くても 1 回です。探すときは親のディレクトリもさかのぼるので、`backend/src/main.py` を読めば、`backend/src/` 自身にコンテキストファイルが無くても `backend/AGENTS.md` が見つかります。

:::info
下のディレクトリのコンテキストファイルも、起動時のものと同じ[安全性の検査](#security-prompt-injection-protection)を通ります。悪意のあるファイルは止められます。
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

`SOUL.md` は、エージェントの人格、口調、話し方を決めます。くわしくは[人格](/hermes/docs/user-guide/features/personality/)のページを見てください。

**置き場所：**

- `~/.hermes/SOUL.md`
- ホームディレクトリを自分で指定して Hermes を動かしている場合は `$HERMES_HOME/SOUL.md`

押さえておきたい点：

- `SOUL.md` がまだ無ければ、Hermes が既定のものを自動で置きます
- Hermes が `SOUL.md` を読むのは `HERMES_HOME` からだけです
- Hermes は作業ディレクトリに `SOUL.md` を探しにいきません
- ファイルが空なら、`SOUL.md` からはプロンプトに何も足されません
- 中身があれば、検査と長さの切り詰めを経て、そのままの形でプロンプトに差し込まれます

## .cursorrules {#cursorrules}

Hermes は、Cursor IDE の `.cursorrules` ファイルと `.cursor/rules/*.mdc` のルールのまとまりに対応しています。これらがプロジェクトのルートにあり、より優先度の高いコンテキストファイル（`.hermes.md`、`AGENTS.md`、`CLAUDE.md`）が見つからなければ、プロジェクトのコンテキストとして読み込まれます。

つまり、Cursor で使ってきた決めごとが、Hermes でもそのまま効きます。

## コンテキストファイルはどう読み込まれるか {#how-context-files-are-loaded}

### 起動時（システムプロンプト） {#at-startup-system-prompt}

コンテキストファイルは、`agent/prompt_builder.py` の `build_context_files_prompt()` が読み込みます。

1. **作業ディレクトリを見る** — `.hermes.md` → `AGENTS.md` → `CLAUDE.md` → `.cursorrules` の順に探します（最初に見つかったものが勝ちます）
2. **中身を読む** — 各ファイルを UTF-8 のテキストとして読みます
3. **安全性の検査** — プロンプトインジェクションらしい書きぶりが無いか調べます
4. **切り詰め** — 文字数の上限を超えたファイルは、先頭と末尾を残して切り詰めます（先頭 70%、末尾 20%、あいだに目印を入れます）。上限は、config.yaml で `context_file_max_chars` が指定されていればその値です。指定が無ければ、モデルのコンテキストウィンドウに応じて自動で決まります（下限 20,000 文字、上限 500,000 文字）
5. **組み立て** — すべてのまとまりを `# Project Context` という見出しの下にまとめます
6. **差し込み** — 組み立てた中身をシステムプロンプトに足します

### セッションの途中（進みながら見つける） {#during-the-session-progressive-discovery}

`agent/subdirectory_hints.py` の `SubdirectoryHintTracker` が、ツール呼び出しの引数にファイルのパスが出てこないか見ています。

1. **パスの取り出し** — ツール呼び出しのたびに、引数（`path`、`workdir`、シェルのコマンド）からファイルのパスを取り出します
2. **親をさかのぼる** — そのディレクトリと、親を 5 段まで見ます（すでに見たディレクトリに当たったら、そこで止めます）
3. **手がかりの読み込み** — `AGENTS.md`、`CLAUDE.md`、`.cursorrules` が見つかれば読み込みます（1 ディレクトリにつき、最初に見つかったもの）
4. **安全性の検査** — 起動時のファイルと同じ、プロンプトインジェクションの検査です
5. **切り詰め** — 1 ファイルあたり 8,000 文字までにします
6. **差し込み** — ツールの結果に足すので、モデルは会話の流れの中で自然に目にします

出来上がったプロンプトのまとまりは、だいたい次のような形です。

```text
# Project Context

The following project context files have been loaded and should be followed:

## AGENTS.md

[Your AGENTS.md content here]

## .cursorrules

[Your .cursorrules content here]

[Your SOUL.md content here]
```

SOUL の中身だけは、包む文を足さずにそのまま入っている点に注目してください。

## 安全性：プロンプトインジェクションへの備え {#security-prompt-injection-protection}

コンテキストファイルは、取り込む前にすべて、プロンプトインジェクションの疑いがないか調べられます。検査で見ているのは次のようなものです。

- **指示を上書きしようとする書き方**：「これまでの指示は無視して」「決まりは気にしないで」
- **だまそうとする書き方**：「ユーザーには言わないで」
- **システムプロンプトの上書き**：「システムプロンプトを上書きする」
- **隠された HTML コメント**：`<!-- ignore instructions -->`
- **隠された div 要素**：`<div style="display:none">`
- **認証情報の持ち出し**：`curl ... $API_KEY`
- **秘密のファイルを読む動き**：`cat .env`、`cat credentials`
- **目に見えない文字**：ゼロ幅スペース、書字方向の上書き、ワードジョイナー

危ないパターンがひとつでも見つかると、そのファイルは止められます。

```
[BLOCKED: AGENTS.md contained potential prompt injection (prompt_injection). Content not loaded.]
```

:::warning
この検査はよくある手口を防ぎますが、みんなで使うリポジトリのコンテキストファイルに目を通す代わりにはなりません。自分で書いたのではないプロジェクトでは、AGENTS.md の中身をかならず確かめてください。
:::

## 大きさの上限 {#size-limits}

| 上限 | 値 |
|-------|-------|
| 1 ファイルあたりの最大文字数 | 指定があれば `context_file_max_chars`。無ければ自動（モデルのコンテキストウィンドウに応じて変わり、下限 20,000、上限 500,000） |
| 1 ファイルあたりの読み込み待ち時間 | `context_file_read_timeout`（既定は 5 秒）。これより時間のかかるファイル（iCloud Drive、OneDrive、NFS の上にあるものなど）は、警告を出して読み飛ばします |
| 先頭を残す割合 | 70% |
| 末尾を残す割合 | 20% |
| 切り詰めの目印 | 10%（文字数を示し、ファイル用のツールで読むようすすめます） |

決められた上限をファイルが超えると、切り詰めの知らせはこう出ます。

```
[...truncated AGENTS.md: kept 14000+4000 of 25000 chars. Use file tools to read the full file.]
```

## 効くコンテキストファイルにするコツ {#tips-for-effective-context-files}

:::tip AGENTS.md をうまく書くために
1. **短くまとめる** — 決めた `context_file_max_chars` の内に収めます。エージェントは毎ターンこれを読みます
2. **見出しで整える** — 構成、決めごと、注意点を `##` のまとまりに分けます
3. **具体例を入れる** — 好ましいコードの書き方、API の形、名前の付け方を実際に見せます
4. **やってほしくないことも書く** — 「マイグレーションのファイルを直に触らないこと」など
5. **大事なパスとポートを並べる** — エージェントは端末のコマンドを組み立てるときに使います
6. **プロジェクトの変化に合わせて直す** — 古びたコンテキストは、無いより悪いです
:::

### ディレクトリごとのコンテキスト {#per-subdirectory-context}

モノレポでは、その下のディレクトリだけに効く指示を、入れ子にした AGENTS.md に書いてください。

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
