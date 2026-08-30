---
title: "プロンプトの組み立て"
description: "Hermes がシステムプロンプトをどう組み立て、キャッシュの安定を保ち、その場限りの層を差し込むか"
upstream_path: developer-guide/prompt-assembly.md
upstream_blob: 209c4c3e1908c49775754d7e5165a38d1400f950
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/prompt-assembly
---

# プロンプトの組み立て {#prompt-assembly}

Hermes は次の 2 つを意識して分けています。

- **キャッシュされるシステムプロンプトの状態**
- **API を呼ぶそのときだけ足される、その場限りの内容**

これはこのプロジェクトでもっとも大事な設計判断のひとつです。次のことに効いてくるからです。

- トークンの使用量
- プロンプトキャッシュの効きやすさ
- セッションの連続性
- メモリの正しさ

主なファイルです。

- `run_agent.py`
- `agent/prompt_builder.py`
- `tools/memory_tool.py`

## キャッシュされるシステムプロンプトの層 {#cached-system-prompt-layers}

キャッシュされるシステムプロンプトは、順番の決まった 3 つの段に組み立てられます（`agent/system_prompt.py` を参照）。

1. **stable** — 人格（`SOUL.md`、なければ既定のもの）、ツールとモデルの手引き、スキルのプロンプト、環境のヒント、プラットフォームのヒント
2. **context** — 呼び出し側が渡した `system_message` と、プロジェクトのコンテキストファイル（`.hermes.md` / `AGENTS.md` / `CLAUDE.md` / `.cursorrules`）
3. **volatile** — 組み込みメモリのスナップショット（`MEMORY.md`）、利用者プロフィールのスナップショット（`USER.md`）、外部メモリ提供元のブロック、日時・セッション・モデル・プロバイダの行

最終的なシステムプロンプトは、`stable` → `context` → `volatile` の順につなげられます。

この順番は、どちらが優先されるかを考えるときに効いてきます。
- スキルは **stable** の段に入る
- メモリとプロフィールのスナップショットは **volatile** の段に入る
- どちらもキャッシュされるシステムプロンプトの一部である（ターンの途中で場当たり的に重ねられるものではない）

`skip_context_files` が指定されているとき（子エージェントへの委任など）は SOUL.md を読み込まず、コードに書かれた `DEFAULT_AGENT_IDENTITY` が代わりに使われます。

### 具体例: 組み上がったシステムプロンプト {#concrete-example-assembled-system-prompt}

すべての層がそろったときに、最終的なシステムプロンプトがどう見えるかを簡単にした例です（コメントは各部分の出どころを示しています）。

```
# Layer 1: Agent Identity (from ~/.hermes/SOUL.md)
You are Hermes, an AI assistant created by Nous Research.
You are an expert software engineer and researcher.
You value correctness, clarity, and efficiency.
...

# Layer 2: Tool-aware behavior guidance
You have persistent memory across sessions. Save durable facts using
the memory tool: user preferences, environment details, tool quirks,
and stable conventions. Memory is injected into every turn, so keep
it compact and focused on facts that will still matter later.
...
When the user references something from a past conversation or you
suspect relevant cross-session context exists, use session_search
to recall it before asking them to repeat themselves.

# Tool-use enforcement (for GPT/Codex models only)
You MUST use your tools to take action — do not describe what you
would do or plan to do without actually doing it.
...

# Layer 3: Honcho static block (when active)
[Honcho personality/context data]

# Layer 4: Optional system message (from config or API)
[User-configured system message override]

# Layer 5: Frozen MEMORY snapshot
## Persistent Memory
- User prefers Python 3.12, uses pyproject.toml
- Default editor is nvim
- Working on project "atlas" in ~/code/atlas
- Timezone: US/Pacific

# Layer 6: Frozen USER profile snapshot
## User Profile
- Name: Alice
- GitHub: alice-dev

# Layer 7: Skills index
## Skills (mandatory)
Before replying, scan the skills below. If one clearly matches
your task, load it with skill_view(name) and follow its instructions.
...
<available_skills>
  software-development:
    - code-review: Structured code review workflow
    - test-driven-development: TDD methodology
  research:
    - arxiv: Search and summarize arXiv papers
</available_skills>

# Layer 8: Context files (from project directory)
# Project Context
The following project context files have been loaded and should be followed:

## AGENTS.md
This is the atlas project. Use pytest for testing. The main
entry point is src/atlas/main.py. Always run `make lint` before
committing.

# Layer 9: Timestamp + session
Current time: 2026-03-30T14:30:00-07:00
Session: abc123

# Layer 10: Platform hint
You are a CLI AI Agent. Try not to use markdown but simple text
renderable inside a terminal.
```

## プラットフォームのヒントを変える {#customizing-platform-hints}

プラットフォームのヒント（上の Layer 10）は、Telegram、WhatsApp、Slack、CLI
などの窓口ごとに Hermes が差し込む案内文です。たとえば「今は端末の上にいるので
Markdown は控えめに」といったものです。組み込みの既定値は
`PLATFORM_HINTS`（`agent/system_prompt.py`）にあり、プラグインが提供する
プラットフォームは、プラットフォームのレジストリを通して自前のヒントを渡します。

管理する人は、`config.yaml` のトップレベルにある `platform_hints` キーから、
ほかのプラットフォームに触れることなく、特定のプラットフォームのヒントだけを
足したり置き換えたりできます。

```yaml
platform_hints:
  whatsapp:
    append: >
      When tabular output would be useful, invoke the table_formatting
      skill instead of emitting a Markdown table.
  slack:
    replace: "You are on Slack. Keep responses tight and avoid wide tables."
  telegram: "Prefer short messages; split long answers."   # shorthand = append
```

- `append` — 組み込みのヒントを残し、そのうしろに文章を足します。
- `replace` — 組み込みのヒントをまるごと差し替えます。
- 文字列をそのまま書いた場合 — `append` の省略記法です。
- 両方が書かれているときは `replace` が `append` に勝ちます。
- 書き方が壊れている項目は安全側に倒して無視され、手を加えていない既定値に戻ります。設定値が悪くても、プロンプトの組み立てが壊れたり、別のプラットフォームに漏れ出したりすることはありません。

この上書きは、システムプロンプトを組み立てるとき（セッションの開始時と、プロンプトを組み直す圧縮のとき）に解決されます。設定が同じなら毎回同じバイト列のヒントになるので、組み込みのヒントと並んで **stable** の段に置かれ、プロンプトキャッシュを壊しません。凍結済みのプロンプトをセッションの途中で書き換えるものではないからです。

## SOUL.md がプロンプトにどう現れるか {#how-soulmd-appears-in-the-prompt}

`SOUL.md` は `~/.hermes/SOUL.md` に置かれ、エージェントの人格として働きます。システムプロンプトのいちばん最初の部分です。`prompt_builder.py` での読み込みは次のようになっています。

```python
# From agent/prompt_builder.py (simplified)
def load_soul_md() -> Optional[str]:
    soul_path = get_hermes_home() / "SOUL.md"
    if not soul_path.exists():
        return None
    content = soul_path.read_text(encoding="utf-8").strip()
    content = _scan_context_content(content, "SOUL.md")  # Security scan
    content = _truncate_content(content, "SOUL.md")       # Cap scales with model context window (20k floor); config override wins
    return content
```

`load_soul_md()` が中身を返したときは、それがコードに書かれた `DEFAULT_AGENT_IDENTITY` に取って代わります。続いて `build_context_files_prompt()` が `skip_soul=True` 付きで呼ばれ、SOUL.md が二重に現れること（人格として 1 回、コンテキストファイルとして 1 回）を防ぎます。

`SOUL.md` が存在しない場合は、次の文章に落ちます。

```
You are Hermes Agent, built by Nous Research. Be direct: match the length
of your reply to the weight of the ask — a one-line question gets a
one-line answer, and finished work gets a short report of what changed,
what's verified, and what's left, never a replay of the process. No
filler ("Great question," "I'd be happy to"), no restating the request
back, no re-summarizing what you already said, no narrating tool calls
the user can see. Plain claims over adjectives; when unsure, say so
plainly. Agree because it's right, not because the user said it. Depth
is earned — give it when the user asks for detail, teaches, or the
stakes demand it, not by default.
```

## コンテキストファイルの差し込み方 {#how-context-files-are-injected}

`build_context_files_prompt()` は **優先順位のしくみ** を使います。プロジェクトのコンテキストは 1 種類だけが読み込まれ、最初に見つかったものが勝ちます。

```python
# From agent/prompt_builder.py (simplified)
def build_context_files_prompt(cwd=None, skip_soul=False):
    cwd_path = Path(cwd).resolve()

    # Priority: first match wins — only ONE project context loaded
    project_context = (
        _load_hermes_md(cwd_path)       # 1. .hermes.md / HERMES.md (walks to git root)
        or _load_agents_md(cwd_path)    # 2. AGENTS.md (cwd only)
        or _load_claude_md(cwd_path)    # 3. CLAUDE.md (cwd only)
        or _load_cursorrules(cwd_path)  # 4. .cursorrules / .cursor/rules/*.mdc
    )

    sections = []
    if project_context:
        sections.append(project_context)

    # SOUL.md from HERMES_HOME (independent of project context)
    if not skip_soul:
        soul_content = load_soul_md()
        if soul_content:
            sections.append(soul_content)

    if not sections:
        return ""

    return (
        "# Project Context\n\n"
        "The following project context files have been loaded "
        "and should be followed:\n\n"
        + "\n".join(sections)
    )
```

### コンテキストファイルの探し方の細かいところ {#context-file-discovery-details}

| 優先順位 | ファイル | 探す範囲 | 補足 |
|----------|-------|-------------|-------|
| 1 | `.hermes.md`, `HERMES.md` | 作業ディレクトリから git のルートまで | Hermes 独自のプロジェクト設定 |
| 2 | `AGENTS.md` | 作業ディレクトリのみ | 広く使われているエージェント向け指示ファイル |
| 3 | `CLAUDE.md` | 作業ディレクトリのみ | Claude Code との互換 |
| 4 | `.cursorrules`, `.cursor/rules/*.mdc` | 作業ディレクトリのみ | Cursor との互換 |

コンテキストファイルはすべて、次の扱いを受けます。

- **安全性の検査** — プロンプトインジェクションの型（見えない Unicode 文字、「これまでの指示を無視せよ」、資格情報を持ち出そうとする文言）が調べられます
- **切り詰め** — `context_file_max_chars` 文字を上限に、先頭 70 / 末尾 20 の割合で残し、切り詰めた印を挟みます。上限はモデルのコンテキストウィンドウに合わせて伸び縮みします（下限 20,000 文字、上限 500K）。`config.yaml` に `context_file_max_chars` を書いた場合は必ずそちらが優先されます。
- **YAML フロントマターの除去** — `.hermes.md` のフロントマターは取り除かれます（将来の設定上書きのために予約されています）

## API を呼ぶときだけの層 {#api-call-time-only-layers}

これらは意図的に、キャッシュされるシステムプロンプトには *残しません*。

- `ephemeral_system_prompt`
- 先頭に差し込むメッセージ
- ゲートウェイ由来のセッションコンテキストの重ね書き
- 後続のターンで、その回の利用者メッセージに差し込まれる Honcho や外部からの想起

プラグインの `pre_llm_call` が返すコンテキストも、この「API を呼ぶときだけ」の経路に乗ります。キャッシュされるシステムプロンプトに書き込まれるのではなく、そのターンの **利用者メッセージ** のうしろに足されます。複数のプラグインがコンテキストを返したときは、Hermes がそれらのブロックをつなげます（[フック → `pre_llm_call`](/hermes/docs/user-guide/features/hooks/#pre_llm_call) を参照）。

この切り分けによって、キャッシュのもとになる前半部分が安定したまま保たれます。

## メモリのスナップショット {#memory-snapshots}

手元のメモリと利用者プロフィールのデータは、システムプロンプトの **volatile** の段に取り込まれます。セッション途中の書き込みはディスク上の状態を更新しますが、組み立て済みのキャッシュされたシステムプロンプトは、組み直しの経路（新しいセッション、あるいは圧縮をきっかけにした組み直しなど、明示的な無効化・再構築の流れ）が走るまで書き換わりません。

## コンテキストファイル {#context-files}

`agent/prompt_builder.py` は **優先順位のしくみ** でプロジェクトのコンテキストファイルを読み取り、危険な内容を取り除きます。読み込まれるのは 1 種類だけで、最初に見つかったものが勝ちます。

1. `.hermes.md` / `HERMES.md`（git のルートまでさかのぼって探す）
2. `AGENTS.md`（起動時の作業ディレクトリ。サブディレクトリは `agent/subdirectory_hints.py` によってセッション中に少しずつ見つかります）
3. `CLAUDE.md`（作業ディレクトリのみ）
4. `.cursorrules` / `.cursor/rules/*.mdc`（作業ディレクトリのみ）

`SOUL.md` は人格の枠のために `load_soul_md()` で別途読み込まれます。読み込みに成功したときは `build_context_files_prompt(skip_soul=True)` によって、二重に現れないようにします。

長いファイルは、差し込む前に切り詰められます。

## スキルの索引 {#skills-index}

スキルのしくみは、スキル関連のツールが使えるときに、簡潔なスキルの索引をプロンプトに足します。

## 用意されているプロンプト調整の口 {#supported-prompt-customization-surfaces}

ほとんどの利用者にとって、`agent/prompt_builder.py` は設定の場所ではなく実装コードだと考えるのが正しい見方です。用意されている調整のしかたは、Python のテンプレートをその場で書き換えるのではなく、Hermes がもともと読み込んでいるプロンプトの材料のほうを変えることです。

### まずはこれらの口を使う {#use-these-surfaces-first}

- `~/.hermes/SOUL.md` — 組み込みの既定の人格ブロックを、自分のエージェント像と普段の振る舞いに置き換えます。
- `~/.hermes/MEMORY.md` と `~/.hermes/USER.md` — セッションをまたいで残したい事実や、利用者プロフィールのデータを置きます。新しいセッションにスナップショットとして取り込まれます。
- `.hermes.md`、`HERMES.md`、`AGENTS.md`、`CLAUDE.md`、`.cursorrules` といったプロジェクトのコンテキストファイル — そのリポジトリでの作業のきまりを差し込みます。
- スキル — 中核のプロンプトのコードに触れずに、繰り返し使う手順や資料をひとまとめにします。
- 任意のシステムプロンプト設定や API からの上書き — Hermes を分岐させずに、その環境ならではの指示文を足します。
- `HERMES_EPHEMERAL_SYSTEM_PROMPT` や先頭に差し込むメッセージのような、その場限りの重ね書き — キャッシュされる前半部分に残したくない、そのターンだけの案内を足します。

### コードのほうを直すべきとき {#when-to-edit-code-instead}

`agent/prompt_builder.py` に手を入れてよいのは、意図して分岐版を保守しているか、上流に動作の変更を提案する場合だけです。このファイルは、すべてのセッションについてプロンプトの配管、キャッシュの境目、差し込む順番を決めています。ここを直接いじるのは、利用者ごとのプロンプト調整ではなく、製品全体の変更です。

言い換えると、こうなります。

- 助手の人格を変えたいなら `SOUL.md` を書き換える
- リポジトリのきまりを変えたいならプロジェクトのコンテキストファイルを書き換える
- 繰り返し使う手順がほしいならスキルを足すか直す
- Hermes がみんなのためにプロンプトを組み立てる方法そのものを変えたいなら、Python を書き換え、コードへの貢献として扱う

## プロンプトの組み立てをこう分けている理由 {#why-prompt-assembly-is-split-this-way}

この作りは、次のことを狙って組まれています。

- プロバイダ側のプロンプトキャッシュを保つ
- 履歴をむやみに書き換えない
- メモリの意味づけを分かりやすく保つ
- ゲートウェイ・ACP・CLI が、永続するプロンプトの状態を汚さずにコンテキストを足せるようにする

## 関連するドキュメント {#related-docs}

- [コンテキスト圧縮とプロンプトキャッシュ](/hermes/docs/developer-guide/context-compression-and-caching/)
- [セッションの保存](/hermes/docs/developer-guide/session-storage/)
- [ゲートウェイの内部構造](/hermes/docs/developer-guide/gateway-internals/)
