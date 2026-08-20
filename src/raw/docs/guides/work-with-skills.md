---
title: "スキルを使いこなす"
description: "スキルの探し方、入れ方、使い方、作り方をまとめます。スキルは Hermes に新しい進め方を教える、必要なときだけ読み込まれる知識です。"
upstream_path: guides/work-with-skills.md
upstream_blob: 2a011a2b7bf57d17652cec98eb4fa907b1307334
sources:
  - https://hermes-agent.nousresearch.com/docs/guides/work-with-skills
---

# スキルを使いこなす {#working-with-skills}

スキルは、ある仕事のやり方を Hermes に教える、必要なときだけ読み込まれる知識の文書です。アスキーアートを作ることから GitHub の PR をさばくことまで、内容はさまざまです。このページでは、日々どう使っていくかを順に見ていきます。

技術的な内容をひととおり知りたい場合は、[スキルの仕組み](/hermes/docs/user-guide/features/skills/) を見てください。

---

## スキルを探す {#finding-skills}

Hermes には最初からいくつものスキルが同梱されています。何があるかを見てみましょう。

```bash
# In any chat session:
/skills

# Or from the CLI:
hermes skills list
```

名前と説明が並んだ、短い一覧が出ます。

```
ascii-art         Generate ASCII art using pyfiglet, cowsay, boxes...
arxiv             Search and retrieve academic papers from arXiv...
github-pr-workflow Full PR lifecycle — create branches, commit...
plan              Plan mode — inspect context, write a markdown...
excalidraw        Create hand-drawn style diagrams using Excalidraw...
```

### 探したいスキルを検索する {#searching-for-a-skill}

```bash
# Search by keyword
/skills search docker
/skills search music
```

### スキルのハブ {#the-skills-hub}

公式の追加スキル（重かったり用途がしぼられていたりして、最初から有効になっていないもの）はハブから手に入ります。

```bash
# Browse official optional skills
/skills browse

# Search the hub
/skills search blockchain
```

---

## スキルを使う {#using-a-skill}

入っているスキルは、そのままスラッシュコマンドになります。名前を打つだけです。

```bash
# Load a skill and give it a task
/ascii-art Make a banner that says "HELLO WORLD"
/plan Design a REST API for a todo app
/github-pr-workflow Create a PR for the auth refactor

# Just the skill name (no task) loads it and lets you describe what you need
/excalidraw
```

ふつうの会話の中でスキルを呼び出すこともできます。使ってほしいスキルを伝えれば、Hermes が `skill_view` ツールで読み込みます。

### 少しずつ読み込むしくみ {#progressive-disclosure}

スキルはトークンを節約する形で読み込まれます。エージェントは一度に全部を抱え込みません。

1. **`skills_list()`** — すべてのスキルの短い一覧（3k トークンほど）。セッションの始まりに読み込まれます。
2. **`skill_view(name)`** — ひとつのスキルの SKILL.md の全文。エージェントがそのスキルが要ると判断したときに読み込まれます。
3. **`skill_view(name, file_path)`** — そのスキルの中の特定の資料。必要になったときだけ読み込まれます。

つまり、実際に使われるまでスキルはトークンを消費しません。

---

## ハブから入れる {#installing-from-the-hub}

公式の追加スキルは Hermes に同梱されていますが、最初から有効にはなっていません。自分で入れてください。

```bash
# Install an official optional skill
hermes skills install official/research/arxiv

# Install from the hub in a chat session
/skills install official/creative/songwriting-and-ai-music

# Install SKILL.md and its referenced support files from an HTTP(S) URL
hermes skills install https://sharethis.chat/SKILL.md
/skills install https://example.com/SKILL.md --name my-skill
```

このとき起きることは次のとおりです。
1. スキルのディレクトリが `~/.hermes/skills/` に複写されます
2. `skills_list` の出力に現れます
3. スラッシュコマンドとして使えるようになります

:::tip
入れたスキルが効くのは、次のセッションからです。今のセッションでも使いたい場合は `/reset` でやり直すか、`--now` を付けてプロンプトのキャッシュをその場で作り直してください（次のやり取りでトークンを多めに使います）。
:::

### ちゃんと入ったか確かめる {#verifying-installation}

```bash
# Check it's there
hermes skills list | grep arxiv

# Or in chat
/skills search arxiv
```

---

## プラグインが持ち込むスキル {#plugin-provided-skills}

プラグインは、名前空間付きの名前（`plugin:skill`）で自分のスキルを同梱できます。こうすることで、もともとあるスキルと名前がぶつかりません。

```bash
# Load a plugin skill by its qualified name
skill_view("superpowers:writing-plans")

# Built-in skill with the same base name is unaffected
skill_view("writing-plans")
```

プラグインのスキルはシステムプロンプトには載らず、`skills_list` にも現れ**ません**。使うかどうかは自分で決める形なので、そのプラグインが持っていると分かっているときに明示的に読み込んでください。読み込むと、同じプラグインにある兄弟スキルの案内がエージェントに示されます。

自分のプラグインにスキルを載せる方法は、[Hermes のプラグインを作る → スキルを同梱する](/hermes/docs/developer-guide/plugins/#bundle-skills) を見てください。

---

## スキルの設定を決める {#configuring-skill-settings}

スキルによっては、必要な設定を冒頭の情報として書いているものがあります。

```yaml
metadata:
  hermes:
    config:
      - key: tenor.api_key
        description: "Tenor API key for GIF search"
        prompt: "Enter your Tenor API key"
        url: "https://developers.google.com/tenor/guides/quickstart"
```

設定を持つスキルを最初に読み込んだとき、Hermes が値をたずねます。答えた値は `config.yaml` の `skills.config.*` の下に保存されます。

スキルの設定は CLI からも扱えます。

```bash
# Interactive config for a specific skill
hermes skills config gif-search

# View all skill config
hermes config get skills.config --json
```

---

## 自分のスキルを作る {#creating-your-own-skill}

スキルの正体は、YAML の冒頭情報が付いたマークダウンのファイルです。ひとつ作るのに 5 分もかかりません。

### 1. ディレクトリを作る {#1-create-the-directory}

```bash
mkdir -p ~/.hermes/skills/my-category/my-skill
```

### 2. SKILL.md を書く {#2-write-skillmd}

```markdown title="~/.hermes/skills/my-category/my-skill/SKILL.md"
---
name: my-skill
description: Brief description of what this skill does
version: 1.0.0
metadata:
  hermes:
    tags: [my-tag, automation]
    category: my-category
---

# My Skill

## When to Use
Use this skill when the user asks about [specific topic] or needs to [specific task].

## Procedure
1. First, check if [prerequisite] is available
2. Run `command --with-flags`
3. Parse the output and present results

## Pitfalls
- Common failure: [description]. Fix: [solution]
- Watch out for [edge case]

## Verification
Run `check-command` to confirm the result is correct.
```

### 3. 資料のファイルを足す（任意） {#3-add-reference-files-optional}

スキルには、エージェントが必要になったときに読み込む補助のファイルを入れられます。

```
my-skill/
├── SKILL.md                    # Main skill document
├── references/
│   ├── api-docs.md             # API reference the agent can consult
│   └── examples.md             # Example inputs/outputs
├── templates/
│   └── config.yaml             # Template files the agent can use
└── scripts/
    └── setup.sh                # Scripts the agent can execute
```

SKILL.md の中からはこう指し示します。

```markdown
For API details, load the reference: `skill_view("my-skill", "references/api-docs.md")`
```

### 4. 試す {#4-test-it}

新しいセッションを始めて、作ったスキルを呼んでみます。

```bash
hermes chat -q "/my-skill help me with the thing"
```

登録の手続きは要りません。`~/.hermes/skills/` に置けば、そのまま使えるようになります。

:::info
エージェント自身も `skill_manage` を使ってスキルを作ったり直したりできます。込み入った問題を解いたあと、Hermes のほうから「次のためにこのやり方をスキルにしておきますか」と持ちかけてくることがあります。
:::

---

## サービスごとにスキルを切り替える {#per-platform-skill-management}

どのスキルをどのサービスで使えるようにするかを決められます。

```bash
hermes skills
```

対話式の画面が開き、サービスごと（CLI、Telegram、Discord など）にスキルの有効・無効を切り替えられます。特定の場面でだけ使いたいスキルがあるときに便利です。たとえば、開発向けのスキルは Telegram では出さない、といった具合です。

---

## スキルと記憶のちがい {#skills-vs-memory}

どちらもセッションをまたいで残りますが、役割が違います。

| | スキル | 記憶 |
|---|---|---|
| **中身** | やり方の知識 — 何をどうするか | 事実の知識 — 何がどうなっているか |
| **読み込み** | 必要なときだけ読み込まれます | どのセッションにも自動で差し込まれます |
| **大きさ** | 大きくても構いません（数百行でも） | 小さく保つべきです（大事な事実だけ） |
| **費用** | 読み込まれるまでゼロ | わずかですが常にかかります |
| **例** | 「Kubernetes へのデプロイのしかた」 | 「暗い配色が好み、太平洋時間で暮らしている」 |
| **作る人** | 自分、エージェント、あるいはハブから | エージェントが会話をもとに作ります |

**目安:** 手引きの文書に書くような内容ならスキル、付箋に書くような内容なら記憶です。

---

## こつ {#tips}

**ひとつのことに絞ります。** 「DevOps のすべて」を扱おうとするスキルは、長くなりすぎてぼやけます。「Python のアプリを Fly.io にデプロイする」くらいまで絞ると、本当に役に立ちます。

**エージェントにスキルを作らせます。** 何段階もかかる仕事を終えたあと、Hermes のほうから「このやり方をスキルにしておきますか」と持ちかけてくることがよくあります。ぜひ受けてください。途中で見つけた落とし穴まで含めて、実際の進め方がそのまま残ります。

**分類を使います。** スキルは下位のディレクトリに分けて整理してください（`~/.hermes/skills/devops/`、`~/.hermes/skills/research/` など）。一覧が見やすくなり、エージェントも目当てのスキルを見つけやすくなります。

**古くなったら直します。** スキルを使っていて、そこに書かれていない問題にぶつかったら、学んだことをスキルに書き足すよう Hermes に伝えてください。手入れをやめたスキルは、かえって足を引っ張ります。

---

*冒頭情報の項目、条件付きの有効化、外部のディレクトリなど、スキルのすべては [スキルの仕組み](/hermes/docs/user-guide/features/skills/) を見てください。*
