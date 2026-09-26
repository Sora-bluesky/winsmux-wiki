---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "プロンプトの組み立て"
description: "Hermes がシステムプロンプトをどう組み立て、キャッシュの安定性をどう保ち、その場限りの層をどう差し込むか"
upstream_path: developer-guide/prompt-assembly.md
upstream_blob: a7482ad24e6658ef9d89cf3012e7c1f2fc554b27
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/prompt-assembly
---

# プロンプトの組み立て {#prompt-assembly}

Hermes は、次の 2 つを意図的に分けています。

- **キャッシュされるシステムプロンプトの状態**
- **API を呼ぶそのときだけ足される、その場限りの部分**

これはこのプロジェクトでもっとも重要な設計判断の一つです。次のすべてに効いてくるからです。

- トークンの消費量
- プロンプトキャッシュの効き具合
- セッションのつながり
- 記憶の正しさ

主なファイルは次のとおりです。

- `run_agent.py`
- `agent/prompt_builder.py`
- `tools/memory_tool.py`

## キャッシュされるシステムプロンプトの層 {#cached-system-prompt-layers}

キャッシュされるシステムプロンプトは、順番の決まった 3 つの段として組み立てられます（`agent/system_prompt.py` を参照）。

1. **stable** — 人格（`SOUL.md`、なければ既定のもの）、ツールとモデルの使い方の指針、コーディング時の行動指針
2. **context** — 呼び出し側が渡した `system_message`、プロジェクトの文脈ファイル（`.hermes.md` / `AGENTS.md` / `CLAUDE.md` / `.cursorrules`）、続いて作業ツリーごとに変わる git のワークスペースの様子、運用者からの指示、実行環境のヒント
3. **volatile** — スキルの索引、組み込みの記憶の写し（`MEMORY.md`）、利用者のプロフィールの写し（`USER.md`）、外部の記憶プロバイダーのブロック、時刻・セッション・モデル・プロバイダーの行、そして実行時の環境のヒント（ホスト / ホームディレクトリー / **今の作業ディレクトリー**）

最終的なシステムプロンプトは、`stable` → `context` → `volatile` の順につなげたものになります。

この順番は、どれが優先されるかを話すときに効いてきます。
- スキルは **stable** の段に入ります
- 記憶とプロフィールの写しは **volatile** の段に入ります
- どちらもキャッシュされるシステムプロンプトの中にあります（ターンの途中で場当たりに重ねているわけではありません）

context の段の中では、共有されるプロジェクトのファイルが、今の作業ツリーの名前が出てくるものより**先**に来ます。
そうすると、同じプロジェクトを別々の git の作業ツリーで動かしているセッション同士が、最初に作業ディレクトリー依存の行が出たところで止まらずに、
文脈のブロック全体にわたって同じ前半部分を共有できます。最長一致でキャッシュを効かせるプロバイダーが再利用するのは、この前半部分です。
ワークスペースの様子を持たないセッションでは、末尾の案内が stable の段に残ります。実行環境のブロックは、常に volatile の段の最後に来ます。

保存されたプロンプトへの影響もあります。`_stored_prompt_matches_runtime()`（`agent/conversation_loop.py`）は、
描画された `# Hermes runtime environment` の区切りより後にある最初のホスト情報の段落を読みます。
末尾には終わりを示す印があり、見出しを引用しているだけの古い文章とこの並びを見分けられるようになっています。
実行環境の区切りは、プロジェクト・運用者・記憶・プラグインの文章のすべてより後に来るので、それらのブロックの中の例が
実行時の作業ディレクトリーのふりをすることはありません。モデルとプロバイダーは、この区切りより前で読み取り、
埋め込みモデルの説明は除外します。`Platform:` は、あえて同一性を判定する項目に入れていません。入口が切り替わっても
（デスクトップ ↔ TUI）保存されているバイト列はそのままで、今の入口向けの案内はターンごとのユーザーメッセージの経路に
一度だけ流します（`agent/surface_switch.py`）。こうしてキャッシュされる前半部分が生き残ります（#104414）。
古いプロンプトは元どおり「ホストが文脈より前」という印を持ったままなので、
並べ替えの前に保存されたプロンプトも問題なく通ります。

`skip_context_files` が指定されているとき（たとえばサブエージェントへの委任）は、SOUL.md は読み込まれず、コードに直接書かれた `DEFAULT_AGENT_IDENTITY` が使われます。

### 実例: 組み上がったシステムプロンプト {#concrete-example-assembled-system-prompt}

すべての層がそろったときに、最終的なシステムプロンプトがどう見えるかを簡略化したものです（コメントは各部分の出どころを示しています）。

```
# Layer 1: Agent Identity (from ~/.hermes/SOUL.md)
You are Hermes, an AI assistant created by Nous Research.
You are an expert software engineer and researcher.
You value correctness, clarity, and efficiency.
...

# Layer 2: Tool-aware behavior guidance
Task-learned procedures, pitfalls, and task-specific preferences belong
in skills. Memory is the narrow exception for facts that apply to EVERY
session regardless of task. Skill-writing instructions appear here only
when skill_manage is available; its absence does not widen memory's scope.
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

## 環境ごとのヒントを変える {#customizing-platform-hints}

環境ごとのヒント（上の Layer 10）は、Telegram、WhatsApp、Slack、CLI などの
入口ごとに Hermes が差し込む案内です。たとえば
「今は端末の上なので Markdown は避けて」といったものです。組み込みの既定値は
`PLATFORM_HINTS`（`agent/system_prompt.py`）にあります。プラグインが足した
入口は、環境の登録先を通して自分のヒントを渡します。

管理者は `config.yaml` の最上位の `platform_hints` を使って、ほかの入口には
一切触れずに、特定の入口のヒントだけを付け足したり丸ごと差し替えたりできます。

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

- `append` — 組み込みのヒントを残し、その後ろに文章を足します。
- `replace` — 組み込みのヒントを丸ごと置き換えます。
- 文字列だけを書いた場合 — `append` の略記です。
- 両方が書かれているときは、`append` より `replace` が勝ちます。
- 書き方が壊れている項目は安全側に倒して無視され、手を加えていない
  既定値に戻ります。設定の値がおかしくても、プロンプトの組み立てが壊れたり、
  ほかの入口に漏れたりすることはありません。

Cron のジョブはプラットフォームとしては `cron` として動きますが、最終的な応答は
そのジョブの `deliver` で指定した経路に届きます。そのため cron のエージェントの
プロンプトには、その経路のヒント（組み込みの文章と、その経路の
`platform_hints.<channel>` による上書き）も `Delivery destination (<channel>):`
という行の下に一緒に載ります。つまり `platform_hints.slack.append` は、その場の
やり取りの Slack だけでなく、Slack へ届ける予約実行のジョブにも効きます。cron
そのものの段落は、引き続き `platform_hints.cron` が受け持ちます。

この上書きは、システムプロンプトを組み立てるとき（セッションの開始時と、
プロンプトを組み直す圧縮のとき）に解決されます。設定が同じなら毎回同じ内容になるので、
組み込みのヒントと並んで **stable** の段に置かれ、プロンプトキャッシュを壊しません。
固まったプロンプトをセッションの途中で書き換えるものではないということです。

## SOUL.md はプロンプトのどこに出るのか {#how-soulmd-appears-in-the-prompt}

`SOUL.md` は `~/.hermes/SOUL.md` に置かれ、エージェントの人格として使われます。システムプロンプトのいちばん最初の部分です。`prompt_builder.py` の読み込み処理は次のようになっています。

```python
# From agent/prompt_builder.py (simplified)
def load_soul_md() -> Optional[str]:
    soul_path = get_hermes_home() / "SOUL.md"
    if not soul_path.exists():
        return None
    content = soul_path.read_text(encoding="utf-8").strip()
    content = _scan_context_content(content, "SOUL.md", user_authored=True)  # Security scan: warn + load, never block
    content = _truncate_content(content, "SOUL.md")       # Cap scales with model context window (20k floor); config override wins
    return content
```

`load_soul_md()` が中身を返したときは、コードに直接書かれた `DEFAULT_AGENT_IDENTITY` の代わりにそれが使われます。続いて `build_context_files_prompt()` が `skip_soul=True` を付けて呼ばれ、SOUL.md が二重に出ないようにします（人格として一度、文脈ファイルとしてもう一度、とならないためです）。

`SOUL.md` が無い場合は、次の内容に落ちます。

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

## 文脈ファイルはどう差し込まれるのか {#how-context-files-are-injected}

`build_context_files_prompt()` は**優先順位の仕組み**を使っていて、プロジェクトの文脈は 1 種類だけが読み込まれます（最初に見つかったものが勝ちます）。

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

### 文脈ファイルの探し方 {#context-file-discovery-details}

| 優先順位 | ファイル | 探す範囲 | 備考 |
|----------|-------|-------------|-------|
| 1 | `.hermes.md`、`HERMES.md` | 作業ディレクトリーから git のルートまで | Hermes 本来のプロジェクト設定 |
| 2 | `AGENTS.md` | 作業ディレクトリーのみ | 広く使われているエージェント向けの指示ファイル |
| 3 | `CLAUDE.md` | 作業ディレクトリーのみ | Claude Code との互換のため |
| 4 | `.cursorrules`、`.cursor/rules/*.mdc` | 作業ディレクトリーのみ | Cursor との互換のため |

文脈ファイルはすべて、次の扱いを受けます。
- **安全性の検査** — プロンプトへの攻撃の型（見えない Unicode 文字、「これまでの指示を無視しろ」、認証情報を持ち出そうとする記述）が無いか調べます。見つかった場合、プロジェクト側のファイルは `[BLOCKED: …]` の印に置き換わります。`HERMES_HOME` にある本人の `SOUL.md` は警告を出したうえでそのまま読み込みます（書き込むときに人が確かめているので、`config.yaml` と同じ信頼の扱いになります）
- **切り詰め** — `context_file_max_chars` 文字を上限に、先頭 70 / 末尾 20 の割合で残し、切り詰めた印を入れます。上限はモデルの文脈の広さに応じて変わります（下限 20,000 文字、上限 500K）。`config.yaml` に `context_file_max_chars` が明示されていれば必ずそちらが優先されます。
- **YAML の前書きの除去** — `.hermes.md` の前書きは取り除かれます（将来の設定の上書き用に予約されています）

## API を呼ぶときだけの層 {#api-call-time-only-layers}

次のものは、キャッシュされるシステムプロンプトの一部として保存され *ない* ようにしてあります。

- `ephemeral_system_prompt`
- あらかじめ差し込むメッセージ
- ゲートウェイ由来のセッションの文脈の重ね書き
- 後のターンで、今のターンのユーザーメッセージに差し込まれる Honcho や外部からの想起

`pre_llm_call` プラグインの文脈も、この「API を呼ぶときだけ」の経路に入ります。今のターンの**ユーザーメッセージ**に足されるのであって、キャッシュされるシステムプロンプトには書き込まれません。複数のプラグインが文脈を返したときは、Hermes がそれらのブロックをつなげます（[フック → `pre_llm_call`](/hermes/docs/user-guide/features/hooks/#pre_llm_call) を参照）。

この切り分けによって、キャッシュのための安定した前半部分が安定したままになります。

## 記憶の写し {#memory-snapshots}

手元の記憶と利用者のプロフィールは、システムプロンプトの **volatile の段**に取り込まれます。セッションの途中で書き込むとディスク上の状態は変わりますが、すでに組み上がったキャッシュ済みのシステムプロンプトは、組み直しが走るまで変わりません（新しいセッション、あるいは圧縮をきっかけにした組み直しなど、明示的に無効化して作り直す流れです）。

## 文脈ファイル {#context-files}

`agent/prompt_builder.py` は、**優先順位の仕組み**でプロジェクトの文脈ファイルを探して安全に整えます。読み込まれるのは 1 種類だけです（最初に見つかったものが勝ちます）。

1. `.hermes.md` / `HERMES.md`（git のルートまでさかのぼります）
2. `AGENTS.md`（起動時の作業ディレクトリー。下位のディレクトリーは、セッションの途中で `agent/subdirectory_hints.py` によって少しずつ見つかります）
3. `CLAUDE.md`（作業ディレクトリーのみ）
4. `.cursorrules` / `.cursor/rules/*.mdc`（作業ディレクトリーのみ）

`SOUL.md` は人格の枠のために `load_soul_md()` で別に読み込まれます。読み込みに成功したときは、`build_context_files_prompt(skip_soul=True)` が二重に出るのを防ぎます。

長いファイルは、差し込む前に切り詰められます。

## スキルの索引 {#skills-index}

スキルの仕組みは、スキル用のツールが使える状態のときに、コンパクトなスキルの索引をプロンプトに足します。

## プロンプトを変えるための正式な入口 {#supported-prompt-customization-surfaces}

ほとんどの利用者にとって、`agent/prompt_builder.py` は設定の入口ではなく実装コードだと思ってください。正式なやり方は、Python のテンプレートをその場で書き換えるのではなく、Hermes がすでに読み込んでいるプロンプトの材料のほうを変えることです。

### まずこの入口を使う {#use-these-surfaces-first}

- `~/.hermes/SOUL.md` — 組み込みの既定の人格のブロックを、自分のエージェント像と普段の振る舞いに置き換えます。
- `~/.hermes/MEMORY.md` と `~/.hermes/USER.md` — セッションをまたいで持ち続けたい事実と、新しいセッションに写しておきたい利用者のプロフィールを書きます。
- `.hermes.md`、`HERMES.md`、`AGENTS.md`、`CLAUDE.md`、`.cursorrules` といったプロジェクトの文脈ファイル — そのリポジトリー固有の作業ルールを差し込みます。
- スキル — 中核のプロンプトのコードに触らずに、繰り返し使う手順や参照先をまとめます。
- 任意のシステムプロンプトの設定や API からの上書き — Hermes を fork せずに、その導入先に固有の指示文を足します。
- `HERMES_EPHEMERAL_SYSTEM_PROMPT` やあらかじめ差し込むメッセージのような、その場限りの重ね書き — キャッシュされる前半部分に含めたくない、そのターンだけの案内を足します。

### コードを直すべきとき {#when-to-edit-code-instead}

`agent/prompt_builder.py` を直すのは、意図して fork を維持している場合か、上流に振る舞いの変更を出す場合だけにしてください。このファイルは、すべてのセッションのプロンプトの配管、キャッシュの境目、差し込みの順番を組み立てています。ここを直接いじるのは、利用者ごとのプロンプトの調整ではなく、製品全体を変える行為です。

言い換えると、次のようになります。

- 別の人格にしたいなら `SOUL.md` を直します
- リポジトリーのルールを変えたいなら、プロジェクトの文脈ファイルを直します
- 繰り返し使える手順がほしいなら、スキルを足すか直します
- 全員に対する Hermes のプロンプトの組み立て方を変えたいなら、Python を変えて、コードへの貢献として扱います

## なぜこう分けているのか {#why-prompt-assembly-is-split-this-way}

この構造は、次のことを狙って意図的に最適化されています。

- プロバイダー側のプロンプトキャッシュを効かせ続ける
- 必要もなく履歴を書き換えない
- 記憶の意味を分かりやすく保つ
- ゲートウェイ・ACP・CLI が、永続的なプロンプトの状態を汚さずに文脈を足せるようにする

## 関連するドキュメント {#related-docs}

- [文脈の圧縮とプロンプトキャッシュ](/hermes/docs/developer-guide/context-compression-and-caching/)
- [セッションの保存](/hermes/docs/developer-guide/session-storage/)
- [ゲートウェイの内部構造](/hermes/docs/developer-guide/gateway-internals/)
