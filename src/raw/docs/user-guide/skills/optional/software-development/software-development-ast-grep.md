---
title: "Ast Grep — ast-grep で構文木を見ながらコードを検索・書き換えする"
description: "ast-grep で構文木を見ながらコードを検索・書き換えする"
upstream_path: user-guide/skills/optional/software-development/software-development-ast-grep.md
upstream_blob: 5d02d37d11e57e7dce593a16b8f1c641772cb250
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/software-development/software-development-ast-grep
---

# Ast Grep {#ast-grep}

ast-grep で構文木を見ながらコードを検索・書き換えします。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加 skill — `hermes skills install official/software-development/ast-grep` で入れます |
| パス | `optional-skills/software-development\ast-grep` |
| バージョン | `1.0.0` |
| 作者 | Yeongyu Kim (code-yeongyu), adapted by Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `ast`, `codemod`, `refactoring`, `structural-search`, `code-search`, `rewrite`, `tree-sitter` |
| 関連 skill | [`simplify-code`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-simplify-code/), [`systematic-debugging`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-systematic-debugging/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# ast-grep {#ast-grep}

`ast-grep`（実行ファイルの名前は `sg` でもあります）は、25 の言語にまたがる **構文木を見て検索・書き換えするツール** です。渡したパターンをコードとして扱い、プロジェクトのコードと同じやり方で解析して、構造として一致するものを探します。文字の並びではなく **コードの形** で答えが決まる場面には、これが向いています。

この skill には、Python のラッパー `scripts/ast_grep_helper.py` と、環境ごとの導入用スクリプト `install.sh`（POSIX 系）・`install.ps1`（Windows）が入っています。ラッパーは、通信せずにパターンを検査する機能、2 回に分けて書き換える手順、実行ファイルの自動判別を足してくれます。まずはこれを使ってください。

元になったもの: [code-yeongyu/ast-grep-skill](https://github.com/code-yeongyu/ast-grep-skill)（MIT）を、oh-my-openagent の shared-skills 一式に入っている形のまま取り込んでいます。

---

## この skill を使う場面 {#when-to-use-this-skill}

文字の並びではなく **コードの構造** が問われるときに使います。

- 「`Request` を引数に取る関数をすべて探して」
- 「`console.log(x)` をすべて `logger.info(x)` に書き換えて」
- 「`as any` のキャストをすべて外して」
- 「リポジトリ全体で `require(...)` を `import` に置き換えて」
- 「中身が空の catch を探して」
- 「`Optional[X]` を `X | None` に移して」
- 「この一括変換を 200 ファイルに当てて」
- 「YAML で書いた検査の決まりを走らせて、違反を出して」

答えが文字の並びで決まるとき（文字列リテラルの中身、コメント、ライセンス表記、ファイル名、言語をまたぐ正規表現）は `search_files`（あるいは素の `rg`）に切り替えてください。迷ったら「答えはその言語の構文木で決まるのか、それともファイルの文字の並びで決まるのか」と考えます。前者なら ast-grep、後者なら search_files です。

Hermes と組み合わせるときの注意です。
- ラッパーや `sg` は `terminal` ツールから実行してください。パターンは必ずシングルクォートで囲み、シェルに `$VAR` を展開させないようにします。
- 一致した箇所を探してから読む、という流れでは `--json-out` を使い、インタープリタにパイプせず `execute_code` で処理してください。
- これは Hermes の `patch` ツールを置き換えるものではなく、補うものです。`patch` は自分で書いた狙い撃ちの編集用、ast-grep はパターンで多数の箇所をまとめて書き換える用です。

---

## エージェントが頭に入れておくべき 3 点 {#three-things-the-agent-must-internalize}

### 1. ast-grep は正規表現ではありません {#1-ast-grep-is-not-regex}

使えるワイルドカードは `$VAR`（構文木のノード 1 つ）と `$$$`（0 個以上のノード）です。正規表現の書き方は、エラーも出ないまま外れます。

| 書いたもの | ast-grep が受け取ったもの | 本当にやりたかったこと |
|---|---|---|
| `foo\|bar` | `foo` と `bar` のビット論理和 | 2 回に分けて検索する |
| `.*foo` | 解析できない | `$$$ foo`（`$$$` がノードの並びのとき）、または rg を使う |
| `\w+` | 解析できない | 任意の識別子を取るなら `$VAR` |
| `[a-z]` | 文字クラス。解析できない | rg に切り替える |

外しやすい書き方の一覧は `references/pitfalls.md` の §1 にあります。ラッパーの `validate` を使えば機械的に見つかるので、「一致しない」を手で調べ始める前に呼んでください。

### 2. パターン自体が正しいコードである必要があります {#2-patterns-must-be-valid-code}

パターンそのものが解析できないといけません。`def $FN($$$):` は末尾の `:` のせいで途中で切れた形になり、通りません。`def $FN($$$)` と書きます。引数も本体もない `function $NAME` も通りません。`function $NAME($$$) { $$$ }` と書きます。言語ごとの一覧は `references/pitfalls.md` の §2 にあります。

### 3. `--update-all` と `--json` は同時に使えません（何も言わずに）{#3---update-all-and---json-are-mutually-exclusive-silently}

スクリプトを書くときに、いちばん引っかかるところです。`sg run -p P -r R --json --update-all` は JSON を返しますが、**ファイルは書き換わりません**。下見と適用の両方をしたいなら、**2 回に分けて** 実行します。

```bash
sg run -p P -r R --json=compact .   # pass 1: see what would change
sg run -p P -r R --update-all .     # pass 2: actually apply
```

`replace --apply` を呼べば、ラッパーがこれを自動でやってくれます。`references/pitfalls.md` の §9 も読んでください。

---

## ラッパー — `scripts/ast_grep_helper.py` {#the-helper-script-scriptsastgrephelperpy}

Python 3 の標準ライブラリだけで書かれた 1 ファイルのラッパーです。どの OS でも同じように動きます。エージェントはまずこれを使ってください。

### `search` — パターンに一致するものをすべて探す {#search-find-all-matches-of-a-pattern}

```bash
python scripts/ast_grep_helper.py search 'console.log($MSG)' --lang ts src/
```

先に、通信せずにパターンを検査します。パターンが正規表現に見える場合（`\w`、`.*`、`|` など）は、助言を出して終了し、`sg` を呼びません。往復が 1 回減ります。検査を飛ばしたいときは `--force` を付けます。

指定できるもの:
- `--lang ts`（対応する 25 言語のいずれか。`js`、`py`、`rs`、`kt` のような別名も使えます）
- `--globs '!**/*.test.ts'`（何度でも指定できます。先頭に `!` を付けると除外です）
- `-C 3`（前後に出す行数）
- `--json-out`（読みやすい形ではなく、そのままの JSON を出します）

### `replace` — パターンで書き換える。既定は下見だけ {#replace-rewrite-by-pattern-dry-run-by-default}

```bash
# Dry-run preview (default — no files mutated)
python scripts/ast_grep_helper.py replace 'console.log($MSG)' 'logger.info($MSG)' --lang ts src/

# Actually apply
python scripts/ast_grep_helper.py replace 'console.log($MSG)' 'logger.info($MSG)' --lang ts src/ --apply
```

ラッパーがすること:
1. `pattern` と `rewrite` の両方を検査して、助言できる間違いを見つけます。
2. 1 回目を `--json=compact` で走らせ、一致した箇所を集めて下見を出します。
3. `--apply` が付いていれば、2 回目を `--update-all` で走らせてファイルを書き換えます。

### `scan` — YAML で書いた決まりを走らせる {#scan-run-yaml-rules}

```bash
# Discover sgconfig.yml from cwd and run all rules
python scripts/ast_grep_helper.py scan src/

# Run a single rule file
python scripts/ast_grep_helper.py scan -r rules/no-console.yml src/

# Apply auto-fixes
python scripts/ast_grep_helper.py scan -U src/

# CI-friendly GitHub annotations
python scripts/ast_grep_helper.py scan --report-style short src/
```

### `validate` — 通信せずにパターンを検査する（`sg` を呼びません）{#validate-offline-pattern-check-no-sg-call}

CI での検査、コミット前のフック、ちょっとした確認に向いています。

```bash
python scripts/ast_grep_helper.py validate '\w+' --lang ts
# → exit 2: regex \w not supported. Use $VAR for identifiers.

python scripts/ast_grep_helper.py validate 'console.log($MSG)' --lang ts
# → exit 0: pattern looks plausible for ast-grep.
```

### `langs` / `doctor` / `install` {#langs-doctor-install}

```bash
python scripts/ast_grep_helper.py langs       # list 25 supported languages and aliases
python scripts/ast_grep_helper.py doctor      # check ast-grep binary availability
python scripts/ast_grep_helper.py install     # delegate to install.sh / install.ps1
```

`new` と `test` は、そのまま `sg new`・`sg test` に渡されます。

---

## `sg` を直接使う（ラッパーでは足りないとき）{#direct-sg-use-when-the-helper-isnt-enough}

ラッパーはやり方を決め打ちにしています。細かく制御したいときは `sg` を直接使ってください。この skill には `references/cli.md` に CLI の早見表が入っています。最小限の使い方は次のとおりです。

```bash
# Search
sg run -p 'console.log($MSG)' --lang ts src/

# Search with JSON for scripting
sg run -p 'console.log($MSG)' --lang ts --json=compact src/

# Rewrite, dry-run
sg run -p 'console.log($MSG)' -r 'logger.info($MSG)' --lang ts --json=compact src/

# Rewrite, apply
sg run -p 'console.log($MSG)' -r 'logger.info($MSG)' --lang ts --update-all src/

# Pattern from stdin (great for ad-hoc experiments)
echo 'console.log("hi")' | sg run -p 'console.log($MSG)' --lang js --stdin

# Debug a pattern that returns 0 matches
sg run -p '<your pattern>' --lang <lang> --debug-query=ast --stdin <<< '<sample-code>'

# Run YAML rules
sg scan src/

# Inline YAML rule (one-off)
sg scan --inline-rules '
id: no-todo
language: TypeScript
severity: warning
rule: { pattern: TODO }' src/
```

シェルから `sg` を直接使うときは、**パターンを必ずシングルクォートで囲んで** ください。そうしないと `$VAR` がシェルに展開されます。

---

## 何をいつ使うかの見取り図 {#decision-tree-what-to-use-when}

<!-- ascii-guard-ignore -->
```
USER asks for "find/rewrite/codemod"
│
├─ structural pattern (function shape, call, class, import, control flow)
│  └→ ast-grep (this skill)
│
├─ text pattern (regex, alternation, character classes, file names)
│  └→ search_files / rg
│
├─ semantic question (what variable does this refer to? does this throw?)
│  └→ LSP tools, TypeScript compiler, Pyright, Semgrep with type inference
│
└─ multiple repos / federated search
   └→ a search engine + then ast-grep / rg / LSP per-repo
```
<!-- ascii-guard-ignore-end -->

「すべて探して」と頼まれたら、対象が形のあるもの（関数、クラス、呼び出し、import、文）なら ast-grep を既定にします。対象が文字の並び（文字列の中身、コメント、ライセンス表記、ファイル名、識別子の一部）なら search_files を既定にします。

---

## 書き換えるときは、必ず先に下見をする {#always-run-dry-run-first-when-rewriting}

パターンを間違えると、何も言わないまま別のものが書き換わります。ラッパーの `replace` が既定で下見だけにしてあるのは、このためです。手順は次のとおりです。

1. まず検索して、一致するものを確かめます: `helper search '<pattern>' --lang X .`
2. 書き換えを下見します: `helper replace '<pattern>' '<rewrite>' --lang X .`（`--apply` は付けません）
3. 下見の結果を確かめます。一致した数、影響するファイル、場所ごとの書き換え後の姿です。
4. 違っていたら、パターンを直して 1 に戻ります。
5. 合っていたら `helper replace '<pattern>' '<rewrite>' --lang X . --apply` を実行します。

下見をしていない書き換えを当てないでください。git のリポジトリで `--apply` したあとは、コミットの前に `git diff --stat` で見直します。

---

## コードはあるはずなのに `sg` が 0 件を返すとき {#when-sg-returns-0-matches-but-you-know-the-code-is-there}

上から順に試してください。

1. **`helper validate '<pattern>' --lang <lang>` を実行します** — 正規表現の混入、関数の本体の書き忘れ、Python の末尾のコロンを見つけてくれます。
2. **`--lang` を確かめます** — `sg` は拡張子から推測します。`.tsx` のファイルに `--lang ts`（`tsx` ではありません）を渡すと、JSX が解析できません。
3. **解析されたパターンを見ます**: `sg run -p '<pattern>' --lang <lang> --debug-query=ast --stdin <<< '<sample>'`。`ERROR` のノードが出ていれば、パターンが壊れています。
4. **対象ファイルの構文木を見ます**: `sg run -p '$_' --lang <lang> --debug-query=cst path/to/file | head -40` を実行し、一致させたい `kind` を探します。
5. **playground を試します**: &lt;https://ast-grep.github.io/playground.html> にコードとパターンを貼ると、何が起きているか見えます。

当てずっぽうで書き換えて再試行しないでください。外れには必ず理由があるので、それを突き止めます。

---

## YAML の決まりと、その場で書く `-p` パターンの使い分け {#when-to-use-yaml-rules-vs-inline--p-patterns}

**その場で `-p` を書く** のは、こんなときです。
- 一度きりの調べもの。
- パターンが単純（条件も、修正の型もない）。
- まだ探っている段階。

**YAML の決まりを使う**（`rules/` の下にファイルを置き、`sg scan` で走らせる）のは、こんなときです。
- 同じパターンを繰り返し使う（検査の決まり、CI で走らせる一括変換）。
- `constraints`、`transform`、入り組んだ `inside` / `has`、複数条件の組み合わせが要る。
- 自動修正（`fix:` の項目）を使いたい。
- 決まり自体を試験したい（`sg test` による記録との突き合わせ）。

YAML の決まりの書き方は `references/yaml-rules.md` にすべて載っています。プロジェクト側の設定（`sgconfig.yml`、`ruleDirs`、`utilDirs`）は `references/sgconfig.md` です。

---

## 出力の扱い方 {#output-discipline}

- `sg run --json=compact` は、一致したものの配列を返します: `{ file, range: {start, end}, text, replacement?, lines, language, ... }`。
- `--json` を付けないときは、`sg` が端末で読みやすい色付きの出力を出します。
- ラッパーの既定は読みやすい形（file:line:column と一致部分の抜粋）です。そのままの JSON がほしいときは `--json-out` を付けます。
- ラッパーの `replace` は必ずまとめを出します。一致した数、ファイルの数、場所ごとの書き換え後の姿です。

利用者に結果を伝えるときは、一致した数だけでなく、**影響するファイルの数も必ず入れて** ください。どこまで波及するかが知りたいからです。

---

## 先に読むもの（優先度の順）{#required-reading-in-order-of-priority}

1. `references/patterns.md` — メタ変数、名前の付け方、厳密さの段階。パターンが一致しない理由がわからないときに読みます。
2. `references/pitfalls.md` — 外れ方をまとめた手引き。0 件が意外だったときに読みます。
3. `references/recipes.md` — 言語ごとの、そのまま使えるパターン集。新しい作業を始めるときに最初に読みます。
4. `references/cli.md` — `sg run`、`sg scan`、`sg test`、`sg new`、`sg lsp`。ラッパーでは足りないときに読みます。
5. `references/yaml-rules.md` — YAML の決まりの書き方。その場で書くパターンでは手に負えなくなったら読みます。
6. `references/sgconfig.md` — プロジェクト全体の設定。実際のプロジェクトで `sg scan` を用意するときに読みます。
7. `references/install.md` — OS ごとの導入方法。`install.sh` / `install.ps1` がうまくいかないときだけ読みます。

---

## 守ること {#invariants-do-not-break}

- **検索の前に検査する。** プログラムでパターンを組み立てるときは、まず `helper validate` を呼びます。「0 件」の原因を調べる作業のおよそ 7 割を占める、正規表現の混入を捕まえてくれます。
- **当てる前に下見する。** 一致したものを確かめずに `sg run -r ... --update-all` を実行しないでください。ラッパーの `replace` は、既定でこれを守らせます。
- **書き換えは 2 回に分ける。** `sg` を直接使って下見と適用の両方をするときは、2 回呼びます。`--json` を付けると `--update-all` が無視されます。
- **シェルではパターンをシングルクォートで囲む。** `"$VAR"` ではなく `'$VAR'` です。ダブルクォートだとシェルが `$VAR` を空文字に展開し、パターンが壊れます。
- **パターンはコードであって、正規表現ではない。** `|`、`.*`、`\w`、`[a-z]` が要る形になったら、search_files に切り替えてください。ast-grep を正規表現のように使おうとしないことです。
- **標準入力から読むときは `--lang` が要る。** `--stdin` でパイプするときは `--lang` を明示してください。拡張子がないので `sg` には推測できません。
- **Linux では `sg` より `ast-grep` を使う。** `sg` は `util-linux` の `setgroups` とぶつかります。ラッパーはこれを見て使い分けますが、`sg` を直接呼ぶなら `alias sg=ast-grep` と別名を付けてください。
