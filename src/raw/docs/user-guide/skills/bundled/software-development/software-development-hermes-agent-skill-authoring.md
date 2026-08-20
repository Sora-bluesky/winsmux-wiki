---
title: "Hermes Agent Skill Authoring — リポジトリ内の SKILL.md を書く: フロントマターと構成"
description: "リポジトリ内の SKILL.md を書く: フロントマターと構成"
upstream_path: user-guide/skills/bundled/software-development/software-development-hermes-agent-skill-authoring.md
upstream_blob: 8953ec3d863442de809b29a4652dd90f8dba1d28
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/software-development/software-development-hermes-agent-skill-authoring
---

# Hermes Agent Skill Authoring {#hermes-agent-skill-authoring}

リポジトリ内の SKILL.md を書きます。フロントマターと構成を扱います。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/software-development/hermes-agent-skill-authoring` |
| バージョン | `2.0.0` |
| 作者 | Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `skills`, `authoring`, `hermes-agent`, `conventions`, `skill-md` |
| 関連 skill | [`plan`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-plan/), [`requesting-code-review`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-requesting-code-review/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Hermes-Agent の skill を書く（リポジトリ内） {#authoring-hermes-agent-skills-in-repo}

## 概要 {#overview}

SKILL.md を置ける場所は2つあります。

1. **利用者の手元:** `~/.hermes/skills/<maybe-category>/<name>/SKILL.md` — 個人用で、共有されません。`skill_manage(action='create')` で作ります。
2. **リポジトリ内（この skill が扱うのはこちらです）:** hermes-agent リポジトリの中の `skills/<category>/<name>/SKILL.md` または `optional-skills/<category>/<name>/SKILL.md` — コミットされ、パッケージと一緒に配布されます。`write_file` と `git add` を使います。`skill_manage(action='create')` はこのツリーには書き込みません。

リポジトリ内の skill は、リポジトリの**厳格な作成基準**を満たす必要があります（AGENTS.md の "Skill authoring standards (HARDLINE)" が正本で、この skill はその実践編です）。基準を外れた PR はレビューで却下されるので、あとから直すより最初から満たしておく方が安上がりです。

## こんなときに使います {#when-to-use}

- 「このブランチ / リポジトリ / コミットに」skill を追加してほしいと頼まれたとき
- hermes-agent と一緒に配布したい、再利用できる手順をコミットするとき
- `skills/` や `optional-skills/` にある既存の skill を編集するとき（小さな修正は `patch`、書き直しは `write_file`。リポジトリ内の skill でも `skill_manage` の patch は使えますが、`create` は使えません）
- 使わない場面: `~/.hermes/skills/` にある個人用の skill（`skill_manage` を使えば済みます）

## まず段階を決めます: Bundled か Optional か {#decide-the-tier-first-bundled-vs-optional}

- **Bundled (`skills/<category>/`)** — 日常的に使う挙動で、幅広い利用者に役立ち、負荷が小さいもの。基準は厳しく、「利用者は月に5回以上のセッションでこれを読み込む」と真顔で言えることです。
- **Optional (`optional-skills/<category>/`)** — 用途が狭いもの、特定分野向け（ブロックチェーン、ゲーム、金融、1つのアプリなど）、定期実行や単発の作業向け、あるいは重いもの。`hermes skills install official/<category>/<skill>` で導入します。

**迷ったら optional にします。** あとから昇格させるのは簡単ですが、降格は手間だけが残ります。「必要になった人には誰にでも役立つ」は optional 側の理由であって、bundled の理由にはなりません。

分類は、そのツールが感覚的にどう見えるかではなく、実際に何であるかで選びます（AI エージェントの CLI は、たとえ「生産性っぽい」と感じても `autonomous-ai-agents/` に入ります）。既存の分類は `search_files(pattern='*', target='files', path='skills')` で確認し、新しい最上位の分類を軽い気持ちで作らないでください。

**振り分け役・目次役・ハブ役の skill は作りません。** 中身が兄弟 skill を指す振り分け表だけの skill は、1段よけいな寄り道を増やし、兄弟側の `When to Use` の呼び出し条件をなぞるだけになります。「代わりに skill X を読み込め」という案内を取り除くと何も残らないなら、書かないでください。カタログと各兄弟の呼び出し条件が、すでにその役目を果たしています。

## 必要なフロントマター {#required-frontmatter}

正本となるバリデータ: `tools/skill_manager_tool.py::_validate_frontmatter`。バリデータが必ず要求するのは次のとおりです。

- 先頭のバイトが `---` であること（先頭に空行を入れない）。
- 本文の前を `\n---\n` で閉じること。
- YAML のマッピングとして解析できること。
- `name` フィールドがあること。
- `description` フィールドがあること（バリデータの上限は 1024 文字。ただし後述のリポジトリ側の厳格な基準はもっと厳しいです）。
- 閉じる `---` のあとに、空でない本文があること。

リポジトリ標準の形（バリデータが強制しないものも含め、すべてのフィールドを書きます）:

```yaml
---
name: my-skill-name               # lowercase, hyphens, ≤64 chars (MAX_NAME_LENGTH)
description: Concise capability statement, under sixty chars.
version: 0.1.0                    # semver; new skills start at 0.1.0
author: Real Name (github-handle), Hermes Agent
license: MIT
platforms: [linux, macos, windows]   # audit, don't guess — see Platform Gating
metadata:
  hermes:
    tags: [Short, Descriptive, Tags]
    related_skills: [other-in-repo-skill]
---
```

### `description` のルール（厳格 — バリデータの 1024 は基準ではありません） {#description-rules-hardline-the-validators-1024-is-not-the-standard}

- **60 文字以内。** 一文で書き、ピリオドで終えます。
- 実装ではなく、何ができるかを書きます。skill 名を繰り返さないでください。
- 宣伝めいた語（"powerful"、"comprehensive"、"seamless"、"advanced"）は使いません。
- システムプロンプトの skill 索引は 57 文字で切って "..." を付けるので、呼び出し条件と機能はその範囲内で完結している必要があります。
- 説明に `:` が入る場合は二重引用符で囲んでください。囲まないと YAML がマッピングとして解析し、ドキュメント生成が落ちます。引用符は 60 文字に数えません。

良い例: `Track named companies for material news with cited digests.`
悪い例: `Use when a user asks to monitor named competitors or companies for product launches, pricing changes, funding, ...`（240 文字。レビューで却下されます）

### `author` のルール {#author-rules}

- **人間を先に**書き、"Hermes Agent" を協力者として後ろに置きます: `Ben Barclay (benbarclay), Hermes Agent`。
- 寄稿された skill に `author: Hermes Agent` だけを書くことは決してしないでください。文章をエージェントが下書きした場合こそ、道具ではなく人間を記載します。
- 保守担当が書いた skill の場合: `Teknium (teknium1), Hermes Agent`。

### `related_skills` のルール {#relatedskills-rules}

- 各項目は、PR と同じツリーの状態で実在する**リポジトリ内**の skill を指す必要があります。構想中のもの、別の PR にあるもの、`~/.hermes/skills/` にしかないものは書かないでください。
- 各項目を確認します: `search_files(pattern='<name>', target='files', path='skills')`（`optional-skills/` も同様）。

## プラットフォームの制限: 信じずに確かめます {#platform-gating-audit-dont-trust}

`platforms:` は、ホスト OS によって読み込みを制限します。skill の文章とスクリプトが実際に呼び出しているものから決めてください。

| skill が使うのが…だけ | `platforms:` |
|---|---|
| Hermes のツール + 標準ライブラリの Python + どの OS でも動く CLI | `[linux, macos, windows]` |
| bash のパイプ、`grep`/`awk`/`sed` の連結、ヒアドキュメント | `[linux, macos]` |
| `osascript`, `defaults`, `pmset` | `[macos]` |
| `apt`/`systemctl`/`/proc` | `[linux]` |

`scripts/` の中で探すべき POSIX 限定の手がかり: `fcntl`, `termios`, `pty`, `os.fork`, `os.killpg`, `signal.SIGKILL`, `os.kill(pid, 0)` による生存確認、直書きされた `/tmp` `/proc` `/etc`。基本の姿勢は、まず OS をまたいで動くように直すこと（`tempfile.gettempdir()`, `pathlib.Path`, `psutil.pid_exists`）です。本当にそのプラットフォームでしか動かない依存があるときだけ範囲を狭め、その理由を `## Pitfalls` に書いてください。

## 大きさの上限 {#size-limits}

- SKILL.md 全体: 100,000 文字以内が強制されます（`MAX_SKILL_CONTENT_CHARS`）。ただし目安は、**単純な skill で約 100 行、複雑なもので約 200 行**です。同種の skill は 8〜14k 文字あたりに収まっています。
- 量が多い部分や場合分けの細かい部分は、`references/*.md`、`templates/`、`scripts/` に置き、SKILL.md からは参照するだけにします。本文に貼り込まないでください。
- 呼び出しのたびにモデルがその場でパーサーや込み入った処理を書くことを期待しないでください。補助スクリプトを `scripts/` に置き、パスで参照します。

## 本文の構成（今の節の並び） {#body-structure-modern-section-order}

```
# <Skill> Skill
2-3 sentence intro: what it does, what it doesn't do, dependency stance.

## When to Use          — bulleted triggers (+ "Don't use for:" counter-triggers)
## Prerequisites        — exact env vars, installs, API key sourcing
## How to Run           — canonical invocation through the `terminal` tool
## Quick Reference      — flat command list, no narration
## Procedure            — numbered steps, each with a checkable completion criterion
## Pitfalls             — known limits, things that look broken but aren't
## Verification         — how to prove the skill worked
```

すべての節がすべての skill に当てはまるわけではありません（手順だけの skill には早見表がないこともあります）。ただし When to Use、実際に動ける本文、Pitfalls、Verification は最低限そろえます。宣伝じみた前置き、何もしない "Setup Check"、Prerequisites にすでに書いた環境変数の再説明は削ってください。

### 生のシェルではなく Hermes のツールを挙げます {#reference-hermes-tools-not-raw-shell}

skill が何かの機能を必要とするときは、対応する Hermes のツールをバッククォートで示します: `terminal`, `read_file`, `write_file`, `patch`, `search_files`, `web_search`, `web_extract`, `browser_navigate`, `vision_analyze`, `delegate_task`, `cronjob`。エージェントがすでにラップ済みのシェルコマンドの名前は書かないでください（`grep` → `search_files`、`cat` → `read_file`、`sed`/`awk` → `patch`、`find`/`ls` → `search_files target='files'`）。CLI をラップする skill は、呼び出しを `terminal(command="<tool> ...", timeout=...)` の形で書きます。素のシェルの言い回し（「`foo --version` を実行する」）は、レビューで差し戻される規約違反です。skill が MCP サーバーに依存する場合は、その名前を挙げて Prerequisites に設定方法を書いてください。

### 自分の端末固有のパスは書きません {#never-use-machine-local-paths}

リポジトリからの相対パスを書きます（`skills/...`、`tools/skill_manager_tool.py`）。コミットされた skill に `/home/<you>/...` のようなパスが焼き込まれていると、ほかの利用者全員で動かなくなり、レビューで即座に指摘されます。

## 書き方の原則 {#writing-quality-principles}

skill があるのは、エージェントの進め方をぶれにくくするためです。同じ有用な規律を、エージェントが確実に繰り返せるようにします。

1. **進め方のぶれなさを最優先にします。** 挙動を変えない行は削ってください。
2. **読み込む量を選びます。** 説明文は毎ターン読み込まれます。細かい話は本文か、参照先に置きます。
3. **各手順を完了条件で締めます。** 確認できる形で、必要なら漏れなく。「変更点をまとめる」より「変更したファイルがすべて確認済み」の方が優れています。
4. **ルールは、それが支配する内容のすぐ隣に置きます。**
5. **強い言葉を選びます**（"tight loop"、"root cause"、"regression test"）。長い説明を繰り返すより効きます。
6. **重複と無意味な記述を削ります。** 「気をつける」「ベストプラクティスに従う」はモデルの挙動を変えません。確認できる条件に置き換えるか、削除してください。

## テストとドキュメント（リポジトリ内 skill では必須） {#tests-and-docs-required-for-repo-skills}

1. **テスト**は `tests/skills/test_<skill>_skill.py` に置きます。標準ライブラリ + pytest + `unittest.mock` だけで、ネットワークにはつなぎません。実行は `scripts/run_tests.sh tests/skills/test_<skill>_skill.py -q` です。（共通の `tests/tools/test_skill_manager_tool.py` が通っても、自分の skill については何も証明しません。）
2. **ドキュメントの再生成:** `python3 website/scripts/generate-skill-docs.py` を実行したあと、範囲を厳しく絞ります。生成器は自動生成のページをすべて書き換えてしまいます。自分のもの以外は `git checkout --` で戻してください。最終的な差分に出てよいのは、自分の SKILL.md、自分の skill のドキュメントページ1枚、カタログの1行、`website/sidebars.ts` への1行の追加だけです（`search_files(pattern='<your-slug>', path='website/sidebars.ts')` で確認し、ヒットがちょうど1件でなければページは迷子になっています）。
3. **`.env.example`**（新しい環境変数が必要な場合のみ）: コメントで明確に区切った1ブロックだけを足し、ファイル内のほかの部分には触れません。

## 進め方 {#workflow}

1. `search_files(target='files')` で対象の分類にある**同種の skill を調べ**、2〜3本の SKILL.md を読んで書き方と構成を合わせます。狭い兄弟を新設するより、既存の skill を広げる方を優先してください。
2. **段階と分類を決めます**（前述）。迷ったら optional にし、そのまま進めずに確認してください。
3. `write_file` で `skills/<category>/<name>/SKILL.md`（または `optional-skills/...`）に**下書きします**。
4. **手元で検証します**:
   ```python
   import yaml, re, pathlib
   content = pathlib.Path("skills/<category>/<name>/SKILL.md").read_text()
   assert content.startswith("---")
   m = re.search(r'\n---\s*\n', content[3:])
   fm = yaml.safe_load(content[3:m.start()+3])
   assert "name" in fm and "description" in fm
   assert len(fm["description"]) <= 60, f"description {len(fm['description'])} chars — hardline is 60"
   assert fm["description"].endswith(".")
   assert "platforms" in fm
   assert len(content) <= 100_000
   ```
   `related_skills` の各項目がリポジトリ内に実在することも確認してください。
5. **テストを追加し、ドキュメントを再生成します**（前の節）。
6. 作業中のブランチで **git add してコミット**し、PR を出します。
7. **注意:** 現在のセッションの skill 読み込みはキャッシュされています。新しい skill は、次のセッションになるまで `skill_view` や `skills_list` には出てきません。これは想定どおりの動きで、不具合ではありません。

## リポジトリ内の既存 skill を編集する {#editing-existing-in-repo-skills}

- **小さな修正:** `skill_manage(action='patch', ...)` はリポジトリ内の skill でも動きます。`patch` も同様です。
- **大きな書き直し:** `write_file` で SKILL.md 全体を書き換えます。
- **付属ファイル:** skill のディレクトリ配下の `references/`、`templates/`、`scripts/` に `write_file` します。
- **必ずコミットします。** リポジトリ内の skill は実行時の状態ではなく、ソースです。フロントマターを変えたら、ドキュメント生成をやり直してください。

## よくある落とし穴 {#common-pitfalls}

1. **リポジトリ内の skill に `skill_manage(action='create')` を使う。** これはリポジトリのツリーではなく `~/.hermes/skills/` に書き込みます。`write_file` を使ってください。
2. **バリデータの上限を基準だと思い込む。** バリデータは 1024 文字の説明を許しますが、レビューは 60 文字を超えたものを却下します。バリデータは `platforms:`、作者の書き方、テスト、ドキュメントを見ません。見るのはレビューです。
3. **寄稿された skill に `author: Hermes Agent` と書く。** 人間を先に記載してください。
4. **`---` の前に空白がある。** 先頭の空行や BOM があると検証に失敗します。
5. **説明が漠然としている、または呼び出し条件が 57 文字目より後ろに埋もれている。**
6. **`related_skills` がリポジトリ内に存在しない skill を指している**（利用者の手元のもの、構想中のもの、兄弟 PR にあるもの）。
7. **同種の skill をそのまま重ねる。** 先に分類を調べて、兄弟を作るのではなく既存を広げてください。
8. **ドキュメント生成を飛ばす、または生成器が起こした無関係な差分をそのまま出す。** どちらも誤りです。再生成しなければドキュメントページのない迷子の skill になり、何も考えずに再生成すれば、ほかの skill の差分で膨れ上がった変更になります。
9. **現在のセッションが新しい skill を認識すると期待する。** 読み込みはセッション開始時に初期化されます。
10. **skill に古い記述を溜める。** ルールを足すときは、それが置き換える古い言い回しを消してください。

## 確認リスト {#verification-checklist}

- [ ] 段階を意識して決めた（bundled の基準は月5回以上のセッション。それ以外は `optional-skills/`）
- [ ] ファイルが `skills/<category>/<name>/SKILL.md` または `optional-skills/<category>/<name>/SKILL.md` にある
- [ ] フロントマターが先頭のバイトから `---` で始まり、`\n---\n` で閉じている
- [ ] `name`, `description`, `version`, `author`, `license`, `platforms`, `metadata.hermes.{tags, related_skills}` がすべてある
- [ ] 説明が 60 文字以内、一文、ピリオドで終わり、宣伝めいた語がない
- [ ] `author` が人間の寄稿者を先に記載している
- [ ] `platforms:` を、兄弟からの写しではなく実際の文章とスクリプトに照らして確かめた
- [ ] `related_skills` の各項目がリポジトリ内で解決できる
- [ ] 本文が今の節の並びに沿っていて、コマンドが Hermes のツールの形で書かれている
- [ ] 端末固有のパスがファイル内のどこにもない
- [ ] 番号付きの各手順に、確認できる完了条件がある
- [ ] `tests/skills/test_<skill>_skill.py` のテストが `scripts/run_tests.sh` で通る
- [ ] 範囲を絞ってドキュメントを再生成し、サイドバーにそのスラッグの項目がちょうど1つある
- [ ] 意図したブランチで `git add` とコミットを行い、PR を出した
