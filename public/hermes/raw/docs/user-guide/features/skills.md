---
title: "skill のしくみ"
description: "必要なときだけ読み込む知識の文書 — 段階的な開示、エージェントが自分で育てる skill、Skills Hub"
upstream_path: user-guide/features/skills.md
upstream_blob: cf856f44956cefbcab0e9a33c419fbcb2bce5d27
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/skills
---

# skill のしくみ {#skills-system}

skill は、エージェントが必要になったときに読み込む知識の文書です。トークンの消費を抑えるために**段階的な開示**という考え方に沿っていて、[agentskills.io](https://agentskills.io/specification) のオープンな仕様にも合わせてあります。

skill はすべて **`~/.hermes/skills/`** に置かれます。ここが主のディレクトリであり、正本です。新しく入れたときは、同梱の skill がリポジトリからここへ写されます。Hub から入れた skill も、エージェントが作った skill もここに入ります。エージェントはどの skill も書き換えたり消したりできます。

Hermes に**外部の skill ディレクトリ**を教えることもできます。ローカルのものと並べて読まれる追加のフォルダーです。後述の[外部の skill ディレクトリ](#external-skill-directories)を参照してください。

あわせて次も参照してください。

- [同梱 skill の一覧](/hermes/docs/reference/skills-catalog/)
- [公式の追加 skill の一覧](/hermes/docs/reference/optional-skills-catalog/)

## まっさらな状態から使う {#starting-with-a-blank-slate}

既定では、どのプロファイルにも同梱の skill 一式が入り、`hermes update` のたびに新しく同梱されたものが足されます。**同梱の skill を入れない**プロファイルにしたい、しかも更新しても空のままにしたい場合は、2 つのやり方があります。

**インストールのとき**（既定の `~/.hermes` のプロファイルが対象です）:

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash -s -- --no-skills
```

**プロファイルを作るとき**（名前付きのプロファイル）:

```bash
hermes profile create research --no-skills
```

**すでに入れてあるプロファイル**（既定でも名前付きでも）では、動作中に切り替えられます。

```bash
hermes skills opt-out            # stop future seeding — nothing on disk is touched
hermes skills opt-out --remove   # also delete UNMODIFIED bundled skills (confirms first)
hermes skills opt-in --sync      # undo: remove the marker and re-seed now
```

どのやり方でも、プロファイルのディレクトリに `.no-bundled-skills` という目印が書かれます。この目印がある間は、インストーラーも `hermes update` も skill の同期も、そのプロファイルへの同梱 skill の配置を飛ばします。目印を消すか、`hermes skills opt-in` を実行すれば元に戻ります。

:::note 既定で安全です
`hermes skills opt-out` が止めるのは*これから*の配置だけで、すでにディスクにあるものを消すことはありません。任意の `--remove` を付けたときに消えるのは、手を加えていない同梱 skill（Hermes が入れた版と 1 バイトも違わないもの）**だけ**です。自分で編集した skill、hub から入れた skill、自分で書いた skill は必ず残ります。
:::

## skill を使う {#using-skills}

入っている skill はすべて、自動でスラッシュコマンドとして使えます。

```bash
# In the CLI or any messaging platform:
/gif-search funny cats
/axolotl help me fine-tune Llama 3 on my dataset
/github-pr-workflow create a PR for the auth refactor
/songsee analyze the frequency spread of this mix

# Just the skill name loads it and lets the agent ask what you need:
/excalidraw
```

### 1 つのコマンドで複数の skill を重ねる {#stacking-multiple-skills-in-one-command}

メッセージの先頭にスラッシュコマンドを並べれば、1 通で複数の skill を呼び出せます。
先頭に続く `/skill` は（5 つまで）すべて読み込まれ、残りが指示になります。

```bash
/github-pr-workflow /test-driven-development fix issue #123 and open a PR
```

読み取りは、入っている skill ではない語が出た時点で止まります。ファイルのパスのように
たまたま `/` で始まる引数が飲み込まれることはありません。

```bash
/ocr-and-documents /tmp/scan.pdf extract the tables   # loads one skill; /tmp/scan.pdf is the argument
```

いつも同じ組み合わせで使うなら、[skill のまとめ](#skill-bundles)のほうが向いています。
短いコマンド 1 つで同じことができます。

（計画モードも同じ書き方ですが、いまは組み込みのコマンドです。`/plan [request]` と書くと、Hermes は必要に応じて状況を調べ、作業を実行する代わりに Markdown の実装計画を書き、その結果を、動いている作業場所やバックエンドの作業ディレクトリからの相対で `.hermes/plans/` の下に保存します。）

普通の会話の中で skill に触れることもできます。

```bash
hermes chat --toolsets skills -q "What skills do you have?"
hermes chat --toolsets skills -q "Show me the axolotl skill"
```

## 資料から skill を覚えさせる（`/learn`） {#learning-a-skill-from-sources-learn}

`/learn` は、自分がすでに知っていることや、手元の資料の山を、`SKILL.md` を手書きせずに
使い回せる skill に変えるための近道です。使い道は限定されていません。*言葉で説明できるもの*なら
何でも指させば、エージェントが手持ちのツールで材料を集め、[この場所の書き方の決まり](#skillmd-format)
（説明は 60 文字以内、決まった節の順、Hermes のツールに沿った書き方、存在しないコマンドを
作らないこと）に沿って skill を書き上げます。

```bash
# A local SDK or doc directory — read with read_file / search_files
/learn the REST client in ~/projects/acme-sdk, focus on auth + pagination

# An online doc page — fetched with web_extract
/learn https://docs.example.com/api/quickstart

# The workflow you just walked the agent through in this conversation
/learn how I just deployed the staging server

# Pasted notes / a described procedure
/learn filing an expense: open the portal, New > Expense, attach the receipt, submit

# A whole book, paper stack, or large docs corpus — becomes a knowledge-base skill
/learn ~/books/designing-data-intensive-applications.pdf
```

### 大きな資料は知識ベースの skill になります {#large-sources-become-knowledge-base-skills}

材料が 1 冊の本、論文の束、仕様書、あるいは大きなドキュメントのフォルダーの場合、
エージェントはそれを 1 ファイルに詰め込んだり、削ぎ落とした要約にしたりはしません。
代わりに**広がりのある知識ベースの skill** を書きます。中心となる考え方と目次を載せた
軽い `SKILL.md` に、章や話題ごとに 1 ファイルずつまとめたものを `references/` の下に置きます
（材料に見合うなら用語集や早見表も足します）。参照用のファイルは、質問が必要とするまで
費用がかかりません。エージェントが `skill_view` で必要なときだけ読むので、費用は材料の量では
なく答えの大きさに見合います。同じ話題で新しい材料を使って `/learn` をもう一度実行すると、
別の skill を作るのではなく、いまある skill に取り込みます。

まとめ直しでは構造——枠組み、定義、判断の決まり、やってはいけない形——を組み立てるだけで、
もとの文章をそのまま写すことはありません。

材料集めをするのが動いているエージェント自身なので、`/learn` は CLI でも、メッセージングの
ゲートウェイでも、TUI でも、ダッシュボードでも同じように動きます。取り込み専用のしくみが
別にあるわけではないので、どのターミナルのバックエンド（ローカル、Docker、リモート）でも同じです。
**ダッシュボード**では、Skills のページに **Learn a skill** のボタンがあり、ディレクトリの欄、
URL の欄、自由に書ける入力欄が並んだ画面が開きます。そこから `/learn` の依頼を組み立てて
チャットで実行します。

モデルのツールとしての痕跡は残りません。`/learn` は決まりに沿ったプロンプトを組み立て、
普通のターンとしてエージェントに渡すだけです。エージェントは結果を `skill_manage` ツールで
保存するので、[書き込みの承認](#gating-agent-skill-writes-skillswrite_approval)を有効にしていれば
そちらが効きます。

## 段階的な開示 {#progressive-disclosure}

skill は、トークンを無駄にしない読み込み方をします。

```
Level 0: skills_list()           → [{name, description, category}, ...]   (~3k tokens)
Level 1: skill_view(name)        → Full content + metadata       (varies)
Level 2: skill_view(name, path)  → Specific reference file       (varies)
```

エージェントは、本当に必要になったときだけ skill の本文を読み込みます。

## SKILL.md の書き方 {#skillmd-format}

```markdown
---
name: my-skill
description: Brief description of what this skill does
version: 1.0.0
platforms: [macos, linux]     # Optional — restrict to specific OS platforms
metadata:
  hermes:
    tags: [python, automation]
    category: devops
    fallback_for_toolsets: [web]    # Optional — conditional activation (see below)
    requires_toolsets: [terminal]   # Optional — conditional activation (see below)
    config:                          # Optional — config.yaml settings
      - key: my.setting
        description: "What this controls"
        default: "value"
        prompt: "Prompt for setup"
---

# Skill Title

## When to Use
Trigger conditions for this skill.

## Procedure
1. Step one
2. Step two

## Pitfalls
- Known failure modes and fixes

## Verification
How to confirm it worked.
```

### OS を限定した skill {#platform-specific-skills}

`platforms` の項目を使うと、skill を特定の OS に限定できます。

| 値 | 対象 |
|-------|---------|
| `macos` | macOS（Darwin） |
| `linux` | Linux |
| `windows` | Windows |

```yaml
platforms: [macos]            # macOS only (e.g., iMessage, Apple Reminders, FindMy)
platforms: [macos, linux]     # macOS and Linux
```

これを書くと、合わない OS ではシステムプロンプト、`skills_list()`、スラッシュコマンドから自動的に隠れます。省略した場合は、どの OS でも読み込まれます。

## skill の出力とメディアの届け方 {#skill-output-and-media-delivery}

skill の応答（あるいはエージェントのどの応答でも）に、メディアファイルの絶対パスがそのまま含まれていると——たとえば `/home/user/screenshots/diagram.png`——ゲートウェイがそれを見つけて表示上の文章から取り除き、パスを文面に残す代わりに、ファイルそのものをチャットへ届けます（Telegram なら写真、Discord なら添付ファイルという具合です）。

音声については、`[[audio_as_voice]]` と書くと、対応しているプラットフォーム（Telegram、WhatsApp）でボイスメッセージの形になります。

### ファイルとして届けさせる: `[[as_document]]` {#forcing-document-style-delivery-asdocument}

その場で見えるプレビューではなく、**その逆**がほしいこともあります。つまり、再圧縮された画像の吹き出しではなく、ダウンロードできる添付ファイルとして届けたい場合です。典型的なのは高解像度のスクリーンショットや図です。Telegram の `sendPhoto` は 1280 px・約 200 KB に再圧縮するので、読めなくなってしまいます。1〜2 MB の PNG を `sendDocument` で送れば、もとのバイト列のまま届きます。

応答（またはその中のどこか、たいていは最後の行）に `[[as_document]]` という記述があると、その応答から取り出されたメディアのパスはすべて、画像の吹き出しではなく文書・ファイルの添付として届きます。

```
Here is your rendered chart:

/home/user/.hermes/cache/chart-q4-2025.png

[[as_document]]
```

この記述は届ける前に取り除かれるので、受け取る側の目に触れることはありません。効き方は応答ごとに全部かゼロかで、あえてそうしています。`[[as_document]]` を 1 回書けば、同じ応答の中のすべての画像のパスが文書として届きます。`[[audio_as_voice]]` と同じ範囲の考え方です。

skill から使うのは、次のような場面です。

- スクリーンショットや図を、相手がファイルとして受け取る必要があるとき（別のツールで編集する、保管する、そのままの形で共有する）。
- 既定の圧縮されたプレビューでは細部が失われるとき（小さな文字、画素単位で正確な図、色の再現が大事な描画）。

文書として送るしくみが別にないプラットフォーム（SMS など）では、そのプラットフォームにある添付の方法にそのまま落ちます。

### 条件付きの表示（控えの skill） {#conditional-activation-fallback-skills}

skill は、いまのセッションで使えるツールに応じて、自分を出したり隠したりできます。これがいちばん役立つのは**控えの skill**、つまり有料のツールが使えないときにだけ出したい、無料またはローカルの代わりの手段です。

```yaml
metadata:
  hermes:
    fallback_for_toolsets: [web]      # Show ONLY when these toolsets are unavailable
    requires_toolsets: [terminal]     # Show ONLY when these toolsets are available
    fallback_for_tools: [web_search]  # Show ONLY when these specific tools are unavailable
    requires_tools: [terminal]        # Show ONLY when these specific tools are available
```

| 項目 | 挙動 |
|-------|----------|
| `fallback_for_toolsets` | 挙げたツールセットが使えるとき、skill は**隠れ**ます。使えないときに出ます。 |
| `fallback_for_tools` | 同じですが、ツールセットではなく個々のツールを見ます。 |
| `requires_toolsets` | 挙げたツールセットが使えないとき、skill は**隠れ**ます。使えるときに出ます。 |
| `requires_tools` | 同じですが、個々のツールを見ます。 |

**例:** 組み込みの `duckduckgo-search` skill は `fallback_for_toolsets: [web]` を使っています。`FIRECRAWL_API_KEY` を設定していれば web のツールセットが使えるので、エージェントは `web_search` を使い、DuckDuckGo の skill は隠れたままです。API キーがなければ web のツールセットは使えないので、DuckDuckGo の skill が控えとして自動的に出てきます。

条件の項目を書いていない skill は、これまでどおり常に表示されます。

## 読み込み時の安全な設定 {#secure-setup-on-load}

skill は、必要な環境変数を宣言しても、一覧から消えることはありません。

```yaml
required_environment_variables:
  - name: TENOR_API_KEY
    prompt: Tenor API key
    help: Get a key from https://developers.google.com/tenor
    required_for: full functionality
```

値がないことに気づいたとき、Hermes は、その skill が手元の CLI で実際に読み込まれた場合に限り、安全な方法で入力を求めます。設定を飛ばしてそのまま skill を使うこともできます。メッセージングの画面で秘密の値をチャットに入力させることは決してありません。代わりに、手元で `hermes setup` か `~/.hermes/.env` を使うよう案内します。

設定した環境変数は、`execute_code` と `terminal` のサンドボックスへ**自動的に渡されます**。skill のスクリプトはそのまま `$TENOR_API_KEY` を使えます。skill と関係のない環境変数には、`terminal.env_passthrough` の設定を使ってください。詳しくは[環境変数の受け渡し](/hermes/docs/user-guide/security/#environment-variable-passthrough)を参照してください。

### skill の設定項目 {#skill-config-settings}

skill は、秘密ではない設定（パスや好み）を `config.yaml` に置く形で宣言することもできます。

```yaml
metadata:
  hermes:
    config:
      - key: myplugin.path
        description: Path to the plugin data directory
        default: "~/myplugin-data"
        prompt: Plugin data directory path
```

設定は config.yaml の `skills.config` の下に保存されます。`hermes config migrate` は未設定の項目について入力を求め、`hermes config show` は設定内容を表示します。skill が読み込まれると、その設定値が文脈に差し込まれるので、エージェントは設定された値を自動的に知ることができます。

詳しくは [skill の設定](/hermes/docs/user-guide/configuration/#skill-settings)と [skill を作る — 設定項目](/hermes/docs/developer-guide/creating-skills/#config-settings-configyaml)を参照してください。

## skill のディレクトリ構成 {#skill-directory-structure}

```text
~/.hermes/skills/                  # Single source of truth
├── mlops/                         # Category directory
│   ├── axolotl/
│   │   ├── SKILL.md               # Main instructions (required)
│   │   ├── references/            # Additional docs
│   │   ├── templates/             # Output formats
│   │   ├── scripts/               # Helper scripts callable from the skill
│   │   ├── examples/              # Referenced example outputs
│   │   └── assets/                # Supplementary files
│   └── vllm/
│       └── SKILL.md
├── devops/
│   └── deploy-k8s/                # Agent-created skill
│       ├── SKILL.md
│       └── references/
├── .hub/                          # Skills Hub state
│   ├── lock.json
│   ├── quarantine/
│   └── audit.log
└── .bundled_manifest              # Tracks seeded bundled skills
```

第三者の URL や GitHub から入れる場合に含まれるのは、`SKILL.md` と、それが
`references/`、`templates/`、`scripts/`、`assets/`、`examples/` の下で実際に参照している
ファイルだけです。参照されていないリポジトリのファイルは写されません。Hermes は
隔離した束の全体を検査し、取得元の URL、内容のハッシュ、検査するプログラムの版、
見つかったこと、時刻、その場で取得したか手元の控えかを
`skills/.hub/lock.json` に記録します。

### 参考としての SkillEvaluator の検査 {#advisory-skillevaluator-scan}

上のインストール方針を強制する組み込みの検査に加えて、Hermes は
hub からのインストールのたびに [NVIDIA SkillEvaluator](https://github.com/NVIDIA/SkillEvaluator)
の Tier 1 の検査を、もう一つの意見として実行できます。Tier 1 は
結果が毎回同じで、鍵も要りません。個人情報の検出（漏れたメールアドレス、
個人のパス、接続文字列）、unicode を使った紛れ込ませの検出、スクリプトの検査、
ライセンスの確認、そして
[NVIDIA SkillSpector](https://github.com/NVIDIA/SkillSpector) による静的な安全検査です。

この検査は**参考にすぎません**。見つかったことはインストールの確認の前に
ファイル名と行番号付きで表示され、インストールはそのまま進みます。本物の
認証情報らしきもの（秘密鍵、クラウドのアクセスキー、トークン、認証情報付きの
接続文字列）は赤で強調されるので、決める前にその行を確かめられます。
個人情報の種類のものはお知らせにすぎません。上流の検査には誤って引っかかる
既知の形（`git@github.com` の SSH の書き方、ドキュメントの例のメールアドレスなど）が
あるので、これで何かが止まることはありません。

使うには、任意の検査プログラムを入れてください（2 つめは
`security` の検査に使われます。入っていない場合、その検査は「not run」と表示されます）。

```bash
uv tool install --python 3.13 \
  "skillevaluator @ git+https://github.com/NVIDIA/SkillEvaluator.git@v0.1.0"
uv tool install "git+https://github.com/NVIDIA/SkillSpector.git@v2.9.5"
```

PATH にプログラムがなければ、検査は黙って飛ばされます。完全に止めたい場合は
次のようにします。

```yaml
skills:
  tier1_advisory: false
```

ダッシュボードの Browse-hub の検査ボタンも、組み込みの検査の判定と並べて
同じ参考のデータを応答（`tier1` の項目）に返します。

## 外部の skill ディレクトリ {#external-skill-directories}

Hermes の外で skill を管理しているなら——たとえば複数の AI ツールで共有している `~/.agents/skills/` のようなディレクトリ——Hermes にそこも読むよう伝えられます。

`~/.hermes/config.yaml` の `skills` の節に `external_dirs` を足します。

```yaml
skills:
  external_dirs:
    - ~/.agents/skills
    - /home/shared/team-skills
    - ${SKILLS_REPO}/skills
```

パスでは `~` の展開と、`${VAR}` による環境変数の置き換えが使えます。

### しくみ {#how-it-works}

- **作るのはローカル、更新はその場で**: エージェントが新しく作る skill は `~/.hermes/skills/`（設定していれば `skills.create_dir`。後述します）に書かれます。すでにある skill は見つかった場所で書き換えられ、エージェントが `skill_manage` の `patch`、`edit`、`write_file`、`remove_file`、`delete` といった操作を使えば、`external_dirs` にある skill も対象になります。
- **外部ディレクトリは書き込み禁止の境界ではありません**: 外部の skill ディレクトリが Hermes のプロセスから書き込める状態なら、エージェントによる skill の更新はそのディレクトリのファイルを変えられます。共有している外部の skill を読み取り専用に保ちたいなら、ファイルシステムの権限か、別のプロファイル・ツールセットの構成を使ってください。
- **ローカルが優先**: 同じ名前の skill がローカルと外部の両方にあるときは、ローカルのほうが使われます。
- **同じように扱われます**: 外部の skill も、システムプロンプトの目次、`skills_list`、`skill_view`、`/skill-name` のスラッシュコマンドに現れます。ローカルの skill と何も変わりません。
- **存在しないパスは黙って飛ばされます**: 設定したディレクトリがなくても、Hermes はエラーを出さずに無視します。端末によってあったりなかったりする共有ディレクトリを書いておくときに便利です。

### 例 {#example}

```text
~/.hermes/skills/               # Local (primary, read-write)
├── devops/deploy-k8s/
│   └── SKILL.md
└── mlops/axolotl/
    └── SKILL.md

~/.agents/skills/               # External (shared, mutable if writable)
├── my-custom-workflow/
│   └── SKILL.md
└── team-conventions/
    └── SKILL.md
```

この 4 つの skill はすべて目次に出ます。`my-custom-workflow` という名前の skill をローカルに作れば、外部のほうは覆い隠されます。

## skill を作る場所を変える（`skills.create_dir`） {#redirecting-skill-creation-skillscreatedir}

既定では、エージェントが作る新しい skill はプロファイル内の `~/.hermes/skills/` に書かれます。別の場所へ置きたい場合——共有の「頭脳」ディレクトリ、git で管理しているリポジトリ、端末群で共有する skill の置き場——は、`skills` の節に `create_dir` を設定します。

```yaml
skills:
  create_dir: /opt/brain/skills
```

これで変わるのは次の点です。

- **`skill_manage` の create がそこへ書きます。** 新しい skill（分類のためのサブディレクトリも含めて）は、ローカルの skill ディレクトリではなく `create_dir` の下に作られます。ディレクトリがなければ最初の書き込み時に作られます。
- **エージェントへの指示も設定に従います。** skill を作る場所を示すエージェント向けの記述——`skill_manage` ツールの説明や関連するプロンプトの文——は、設定したディレクトリをその場で反映するので、エージェントはそこへ作るよう伝えられます。システムプロンプトの上書きも、ファイルシステムの小細工も要りません。
- **そのディレクトリも同じように扱われます。** `create_dir` の下の skill はローカルのディレクトリと並べて読まれ、目次、`skills_list`、`skill_view`、スラッシュコマンドに現れ、ローカルの skill と同じように書き換えたり消したりできます。
- **それ以外はローカルのままです。** すでにある skill はある場所で書き換えられますし、同梱 skill の同期、hub、整理の処理はプロファイル内のディレクトリを対象に動き続けます。

パスでは `~` の展開と `${VAR}` の置き換えが使えます。相対パスは Hermes のホームを基準に解決されます。`create_dir` にローカルの skill ディレクトリを指定するのは、設定しないのと同じです。

## プロジェクトに置く skill {#project-local-skills}

リポジトリは自分専用の skill を持てます。これはそのプロジェクトの中で始めたセッションでだけ効きます。他のエージェント環境がリポジトリごとの設定に使っているのと同じやり方です。git のチェックアウトの中で Hermes を起動すると、次の場所から skill を探します。

```text
<project-root>/.hermes/skills/    # Hermes-native location
<project-root>/.agents/skills/    # cross-tool convention (shared with other agent CLIs)
```

プロジェクトのルートは、`.git` を含むいちばん近い親ディレクトリです（worktree と submodule も含みます）。

### プロジェクトを信頼する {#trusting-a-project}

skill はエージェントが従う手順の文書なので、Hermes はどこかからクローンしただけのリポジトリからそれを**自動では読み込みません**。プロジェクトの skill があるリポジトリで初めて Hermes を実行すると、起動時の表示にお知らせが出ます。

```text
◆ 3 project skill(s) found in /home/you/myproject but not loaded — run `hermes skills trust` to enable them.
```

そのリポジトリを一度だけ信頼します（中で実行するか、パスを渡します）。

```bash
hermes skills trust             # trust the current repo
hermes skills trust ~/myproject # or explicitly
hermes skills untrust           # revoke
```

信頼したルートは `~/.hermes/config.yaml` の `skills.trusted_project_dirs` に保存されます。`skills.project_discovery: false` にすれば、この機能そのものを止められます（探索もお知らせもなくなります）。

### 優先の順 {#precedence}

プロジェクトの skill が**いちばん優先されます**。順は `project → local (~/.hermes/skills/) → external_dirs` です。`deploy` という名前のプロジェクト skill は、そのリポジトリの中のセッションでは同名のプロファイルの skill や同梱の skill を上書きします。それが狙いです。リポジトリに同梱された skill は自分の土俵で勝ち、全体のプロファイルには手を触れません。プロジェクトの skill はエージェントの目次で `[project]` の印が付くので、どこから来たものかが見えます。

外部ディレクトリと同じく、プロジェクトの skill ディレクトリはリポジトリのものとして扱われます。自動での skill の手入れ（整理の処理）が手を加えることはなく、エージェントが新しく作る skill は必ず `~/.hermes/skills/` へ行きます。

### 検査による隔離 {#scan-time-quarantine}

信頼はリポジトリ単位の判断ですが、リポジトリの skill の中身は `git pull` のたびに変わります。その隙を埋めるため、プロジェクトの skill はどれも、Skills Hub からのインストールと同じ検査を通ってから目次に入ります。検査の判定が**危険**（プロンプトへの注入の指示、認証情報を持ち出すコマンド、隠し文字の細工）だった skill は隔離されます。目次にも `skills_list` にもスラッシュコマンドにも現れず、名前を指定して読み込もうとしても理由を示して断ります。検査の結果は内容のハッシュをキーに `~/.hermes/cache/project_skill_scans/` に控えられ（自分のリポジトリの中には決して置かれません）、skill の中身が変われば自動でやり直されます。

### 対話しない場面（cron、API、ACP） {#non-interactive-surfaces-cron-api-acp}

cron の処理をはじめ、対話のない場面は、対話時に下した信頼の判断を受け継ぎます。自分から尋ねることも、勝手に信頼することもありません。プロジェクトのルートは、その場面の作業ディレクトリ（cron なら `workdir`。ターミナルのツールと同じしくみです）から決まります。`workdir` が以前に信頼したリポジトリの中にある cron の処理は、そのリポジトリのプロジェクト skill を読み込みます。信頼していない、あるいはまだ決めていないリポジトリの処理は何も読み込みません。

## skill のまとめ {#skill-bundles}

skill のまとめは、複数の skill を 1 つのスラッシュコマンドに束ねる小さな YAML ファイルです。`/<bundle-name>` を実行すると、そこに並べた skill が一度に読み込まれます。ある作業ではいつも同じ組み合わせが効く、というときに便利です。

### 手早い例 {#quick-example}

```bash
# Create a bundle for backend feature work
hermes bundles create backend-dev \
  --skill github-code-review \
  --skill test-driven-development \
  --skill github-pr-workflow \
  -d "Backend feature work — review, test, PR workflow"
```

そのあと、CLI でもゲートウェイのどのプラットフォームでも、次のように使います。

```
/backend-dev refactor the auth middleware
```

エージェントは 3 つの skill を 1 通のユーザーメッセージとして受け取り、スラッシュコマンドのあとに書いた文章が指示として添えられます。

### YAML の書き方 {#yaml-schema}

まとめは **`~/.hermes/skill-bundles/<slug>.yaml`** に置き、次のような形です。

```yaml
name: backend-dev
description: Backend feature work — review, test, PR workflow.
skills:
  - github-code-review
  - test-driven-development
  - github-pr-workflow
instruction: |
  Always start by writing failing tests, then implement.
  Open the PR through the standard workflow with co-author tags.
```

項目は次のとおりです。

- `name`（任意。省略するとファイル名がそのまま使われます）— 表示に使う名前。スラッシュコマンド用にハイフン区切りへ整えられます（`Backend Dev` → `/backend-dev`）。
- `description`（任意）— `/bundles` と `hermes bundles list` に出る短い説明。
- `skills`（必須。空にはできません）— skill 名、または skill ディレクトリからの相対パス。`/<skill-name>` に渡すのと同じ書き方をします。
- `instruction`（任意）— 読み込んだ skill の内容の前に置かれる追加の案内。「この組み合わせはいつもこう使う」を書き留めるのに向いています。

### まとめを管理する {#managing-bundles}

```bash
# List all installed bundles
hermes bundles list

# Inspect one bundle
hermes bundles show backend-dev

# Create a bundle interactively (omit --skill flags to enter them one per line)
hermes bundles create research

# Overwrite an existing bundle
hermes bundles create backend-dev --skill ... --force

# Delete a bundle
hermes bundles delete backend-dev

# Re-scan ~/.hermes/skill-bundles/ and report changes
hermes bundles reload
```

チャットのセッションの中では、`/bundles` で入っているまとめとその skill が一覧できます。

### 挙動 {#behavior}

- 名前がぶつかったときは、**まとめのほうが個々の skill より優先されます**。`research` という名前のまとめを作り、`research` という skill も持っている場合、`/research` はまとめを呼びます。これは意図した動きです。その名前を選んだのはあなただからです。
- **足りない skill は飛ばされるだけで、失敗にはなりません。** まとめに `skill-foo` と書いてあってそれが入っていなくても、見つかった skill は読み込まれ、飛ばしたものの一覧がエージェントに伝えられます。
- **まとめはどの場面でも使えます** — 対話形式の CLI、TUI、ダッシュボードのチャット、ゲートウェイのすべてのプラットフォーム（Telegram、Discord、Slack など）。個々の skill コマンドと同じ場所で振り分けているからです。
- **まとめはプロンプトの控えを無効にしません。** `/<skill-name>` と同じように、呼び出したときに新しいユーザーメッセージを作るだけで、システムプロンプトは書き換えません。

### 個別に入れるよりまとめが向く場面 {#when-bundles-beat-installing-each-skill-manually}

次のようなときにまとめを使います。

- 繰り返す作業でいつも同じ skill を組み合わせている（`/backend-dev`、`/release-prep`、`/incident-response`）。
- `/skill` を何度も打つより、頭の中の手数を減らしたい。
- まとめの YAML を共有の dotfiles リポジトリに入れて `~/.hermes/skill-bundles/` からリンクし、チーム共通の「作業の型」として配りたい。

まとめはただの YAML の別名で、skill を入れてくれるわけではありません。skill そのものが先にある必要があります（`~/.hermes/skills/` か、外部の skill ディレクトリに）。なければ、まとめを呼んでも足りないものは飛ばされるだけです。

## エージェントが管理する skill（skill_manage ツール） {#agent-managed-skills-skillmanage-tool}

エージェントは `skill_manage` ツールを使って、自分の skill を作り、更新し、消せます。これはエージェントの**手順の記憶**です。込み入った進め方を編み出したら、あとでまた使えるよう skill として保存します。

skill と記憶は、自分を良くしていく流れの中で組みになって働きます。記憶は常に文脈にあるべき
小さくて変わらない事実を、skill は必要なときだけ読み込むべき長めの手順を保存します。
セッションのあとに走る裏側の見直しが skill の変更を提案したり下書きしたりできますが、
下に書く書き込みの承認を使えば、その変更が反映される前に人の目を通させられます。

### エージェントが skill を作るとき {#when-the-agent-creates-skills}

システムプロンプトは、込み入った進め方をあとで使えるよう `skill_manage` で記録するようエージェントに求めています。
実際には次のような場面です。

- 繰り返す価値のある多段の進め方を組み立てたとき
- 失敗や行き止まりに当たって、うまくいく道を見つけたとき
- 利用者にやり方を正されたとき

### skill の中身はどういうものか {#what-a-skill-entry-looks-like}

skill とは、ある種類の作業を、いちばん効率よく正しく、あなたのやり方どおりに進めるための
指示です。順を追った手順、実際に動くコマンドとツールの呼び出し、結果をどんな形にしたいか、
そして時間を奪う落とし穴。表のターンで書かれたものでも、裏側の見直しが書いたものでも、
整理の処理がまとめ直したものでも、そこに残すのは**教訓であって記録ではありません**。落とし穴とは、
一般化できる決まりに、*なぜ*そうなるか（そのしくみ）を一節だけ添えて、影響する手順のところに
一度だけ書いたものです。出来事の語り、PR や issue の番号、日付、引用したチャットは skill の
中身ではありません。決まりは、その背景の話がなくても成り立つ必要があります。常に効く決まりは
`SKILL.md` そのものに置きます。`references/` には話題ごとに名前を付けた少数のファイル
（判断の表、手順書、提供元ごとの癖）を置き、セッションごとにファイルを増やすのではなく、
その場に書き足していきます。また skill には、毎ターン読み込まれるもの（リポジトリの `AGENTS.md`、
ツールの定義）を書き直す必要はありません。

`skill_manage` は `create` のときと `references/` への書き込みのときに参考としての検査を走らせ、
その結果をツールの結果に返します。この形のためだけにある決まりが 2 つあります。
`incident-log-shape`（PR や issue の番号だらけの本文）と `references-sprawl`（参照ファイルが
60 を超える）です。どちらも注意を出すだけで、書き込みを止めることはありません。

### 操作 {#actions}

| 操作 | 用途 | 主な引数 |
|--------|---------|------------|
| `create` | 新しい skill を一から作る | `name`、`content`（SKILL.md の全文）、任意で `category` |
| `patch` | 狙いを絞った修正（こちらが望ましい） | `name`、`old_string`、`new_string` |
| `edit` | 構成から大きく書き直す | `name`、`content`（SKILL.md の全文の差し替え） |
| `delete` | skill をまるごと消す | `name` |
| `write_file` | 補助のファイルを足す・更新する | `name`、`file_path`、`file_content` |
| `remove_file` | 補助のファイルを消す | `name`、`file_path` |

:::tip
更新には `patch` が向いています。変わった部分だけがツールの呼び出しに現れるので、`edit` よりトークンを使いません。
:::

### エージェントの skill 書き込みに承認を挟む（`skills.write_approval`） {#gating-agent-skill-writes-skillswriteapproval}

既定では、エージェントは自由に skill を書きます。ターンのあとに走る[裏側の自己改善の見直し](/hermes/docs/user-guide/features/memory/#controlling-memory-writes-write_approval)
からの書き込みも含みます。書き込みのたびに先に承認したい場合（学んだことを見誤りやすい
小さなモデルを使っている、厳しい環境にいる、あるいは自己改善の流れに目を通しておきたい）は、
書き込みの承認を有効にします。

```yaml
skills:
  write_approval: false     # false = write freely (default) | true = require approval
```

`write_approval: true` にすると、`skill_manage` のすべての書き込み（create / edit /
patch / delete / write_file / remove_file）は、反映される代わりに**下書きとして置かれます**。
SKILL.md はその場で読むには大きすぎるので、表のターンからの書き込みでも裏側の見直しからの
ものでも、同じように下書きになります。下書きは `~/.hermes/pending/skills/` の下で
再起動をまたいで残り、危険なコマンドと同じおなじみの承認・却下の流れで確認します。

```
/skills pending             # list staged skill writes + a one-line gist each
/skills diff <id>           # full unified diff (best viewed in CLI or dashboard)
/skills approve <id>        # apply it (or 'all')
/skills reject <id>         # drop it (or 'all')
/skills approval on         # turn the gate on (or 'off') and persist it
```

確認の画面は、対話形式の CLI でもメッセージングプラットフォームでも使えます
（チャットの吹き出しでは差分が切り詰められます。全体は CLI か、下書きの JSON ファイルで
読んでください）。記憶の書き込みにも `memory.write_approval` として同じしくみがあります。
[記憶の書き込みを制御する](/hermes/docs/user-guide/features/memory/#controlling-memory-writes-write_approval)を参照してください。

> これとは別の `skills.guard_agent_created` は内容を検査するもの
> （危険な形かどうかの見当を付ける）で、承認のしくみではありません。この 2 つは
> 互いに関係ありません。[エージェントが作る skill の書き込みを見張る](/hermes/docs/user-guide/configuration/#guard-on-agent-created-skill-writes)を参照してください。

## Skills Hub {#skills-hub}

オンラインの登録所、`skills.sh`、well-known の入口を直接指定する形、そして公式の追加 skill から、skill を探し、検索し、入れ、管理できます。

### よく使うコマンド {#common-commands}

```bash
hermes skills browse                              # Browse all hub skills (official first)
hermes skills browse --source official            # Browse only official optional skills
hermes skills search kubernetes                   # Search all sources
hermes skills search react --source skills-sh     # Search the skills.sh directory
hermes skills search https://mintlify.com/docs --source well-known
hermes skills inspect openai/skills/k8s           # Preview before installing
hermes skills install openai/skills/k8s           # Install with security scan
hermes skills install official/security/1password
hermes skills install skills-sh/vercel-labs/json-render/json-render-react --force
hermes skills install well-known:https://mintlify.com/docs/.well-known/skills/mintlify
hermes skills install https://sharethis.chat/SKILL.md              # Direct URL (+ referenced support files)
hermes skills install https://example.com/SKILL.md --name my-skill # Override name when frontmatter has none
hermes skills list --source hub                   # List hub-installed skills
hermes skills check                               # Check installed hub skills for upstream updates
hermes skills update                              # Reinstall hub skills with upstream changes when needed
hermes skills audit                               # Re-scan all hub skills for security
hermes skills uninstall k8s                       # Remove a hub skill
hermes skills reset google-workspace              # Un-stick a bundled skill from "user-modified" (see below)
hermes skills reset google-workspace --restore    # Also restore the bundled version, deleting your local edits
hermes skills publish skills/my-skill --to github --repo owner/repo
hermes skills snapshot export setup.json          # Export skill config
hermes skills tap add myorg/skills-repo           # Add a custom GitHub source
```

### 使える hub の取得元 {#supported-hub-sources}

| 取得元 | 例 | 補足 |
|--------|---------|-------|
| `official` | `official/security/1password` | Hermes と一緒に配られる追加の skill。 |
| `skills-sh` | `skills-sh/vercel-labs/agent-skills/vercel-react-best-practices` | `hermes skills search <query> --source skills-sh` で検索できます。skills.sh の名前とリポジトリのフォルダー名が違う場合、Hermes が別名として解決します。 |
| `well-known` | `well-known:https://mintlify.com/docs/.well-known/skills/mintlify` | サイトの `/.well-known/skills/index.json` から直接配られる skill。サイトやドキュメントの URL で検索します。 |
| `url` | `https://sharethis.chat/SKILL.md` | `SKILL.md` の HTTP(S) の URL と、そこで明示的に参照されている補助ファイル。名前の決め方は、frontmatter → URL の末尾 → 対話での入力 → `--name` の指定、の順です。 |
| `github` | `openai/skills/k8s` | GitHub のリポジトリやパスからの直接のインストールと、独自の取得元。 |
| `clawhub`、`lobehub`、`browse-sh` | 取得元ごとの識別子 | コミュニティやマーケットプレイスとの連携。 |

### つながっている hub と登録所 {#integrated-hubs-and-registries}

Hermes はいま、次の skill のしくみと探索の経路につながっています。

#### 1. 公式の追加 skill（`official`） {#1-official-optional-skills-official}

Hermes のリポジトリ自身で管理されているもので、最初から信頼された扱いで入ります。

- 一覧: [公式の追加 skill の一覧](/hermes/docs/reference/optional-skills-catalog/)
- リポジトリ内の場所: `optional-skills/`
- 例:

```bash
hermes skills browse --source official
hermes skills install official/security/1password
```

#### 2. skills.sh（`skills-sh`） {#2-skillssh-skills-sh}

Vercel が公開している skill のディレクトリです。Hermes はそこを直接検索し、skill の詳細ページを見て、別名の解決をして、もとのリポジトリからインストールできます。

- ディレクトリ: [skills.sh](https://skills.sh/)
- CLI とツールのリポジトリ: [vercel-labs/skills](https://github.com/vercel-labs/skills)
- Vercel 公式の skill リポジトリ: [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)
- 例:

```bash
hermes skills search react --source skills-sh
hermes skills inspect skills-sh/vercel-labs/json-render/json-render-react
hermes skills install skills-sh/vercel-labs/json-render/json-render-react --force
```

#### 3. well-known の skill の入口（`well-known`） {#3-well-known-skill-endpoints-well-known}

`/.well-known/skills/index.json` を公開しているサイトから、URL で見つける方法です。中央に 1 つの hub があるわけではなく、Web の取り決めです。

- 実際に動いている入口の例: [Mintlify のドキュメントの skill 目次](https://mintlify.com/docs/.well-known/skills/index.json)
- 参考になるサーバーの実装: [vercel-labs/skills-handler](https://github.com/vercel-labs/skills-handler)
- 例:

```bash
hermes skills search https://mintlify.com/docs --source well-known
hermes skills inspect well-known:https://mintlify.com/docs/.well-known/skills/mintlify
hermes skills install well-known:https://mintlify.com/docs/.well-known/skills/mintlify
```

#### 4. GitHub から直接（`github`） {#4-direct-github-skills-github}

Hermes は GitHub のリポジトリや、GitHub をもとにした取得元から直接インストールできます。リポジトリとパスがすでに分かっているときや、自分の取得元を足したいときに便利です。

すぐに見られる既定の取得元は次のとおりです。

- [openai/skills](https://github.com/openai/skills)
- [anthropics/skills](https://github.com/anthropics/skills)
- [huggingface/skills](https://github.com/huggingface/skills)
- [NVIDIA/skills](https://github.com/NVIDIA/skills) — NVIDIA が検証した skill（署名付きの `skill.oms.sig` と、運用方針を書いた `skill-card.md` が付きます）
- [garrytan/gstack](https://github.com/garrytan/gstack)

- 例:

```bash
hermes skills install openai/skills/k8s
hermes skills tap add myorg/skills-repo
```

**分類のまとまり（`skills.sh.json`）。** GitHub の取得元は、リポジトリの直下に
[skills.sh の仕様](https://skills.sh/schemas/skills.sh.schema.json)に沿った
`skills.sh.json` を置けます。その `groupings`（それぞれ `title` と skill 名の並び）は
目次を作るときに読まれ、[Skills Hub](https://hermes-agent.nousresearch.com/docs) の
ページに出る分類の名前になります。タグからの推測より正確です。これは特定の相手向けの
しくみではありません。このファイルを置いた取得元なら、Hermes 側を変えなくても
きちんと分類されます。

```json
{
  "$schema": "https://skills.sh/schemas/skills.sh.schema.json",
  "groupings": [
    { "title": "Inference AI", "skills": ["dynamo-recipe-runner", "dynamo-router-sla"] },
    { "title": "Decision Optimization", "skills": ["cuopt-developer", "cuopt-install"] }
  ]
}
```

#### 5. ClawHub（`clawhub`） {#5-clawhub-clawhub}

コミュニティの取得元としてつながっている、第三者の skill のマーケットプレイスです。

- サイト: [clawhub.ai](https://clawhub.ai/)
- Hermes での取得元 id: `clawhub`

#### 6. LobeHub（`lobehub`） {#6-lobehub-lobehub}

Hermes は LobeHub が公開している目録のエージェントの項目を検索し、Hermes に入れられる skill へ変換できます。

- サイト: [LobeHub](https://lobehub.com/)
- 公開エージェントの目次: [chat-agents.lobehub.com](https://chat-agents.lobehub.com/)
- もとになっているリポジトリ: [lobehub/lobe-chat-agents](https://github.com/lobehub/lobe-chat-agents)
- Hermes での取得元 id: `lobehub`

#### 7. browse.sh（`browse-sh`） {#7-browsesh-browse-sh}

Hermes は [browse.sh](https://browse.sh) とつながっています。これは Browserbase が集めた、サイトごとのブラウザー操作の SKILL.md が 200 以上ある目録です（Airbnb、Amazon、arXiv、12306.cn、Etsy、Xero など）。それぞれの skill は 1 つのサイトを最初から最後まで操作する方法を書いたもので、Hermes のブラウザーのツールや、すでに入れてあるブラウザー操作の skill と組み合わせて使えます。

- サイト: [browse.sh](https://browse.sh/)
- 目録の API: `https://browse.sh/api/skills`
- Hermes での取得元 id: `browse-sh`
- 信頼の水準: `community`

```bash
hermes skills search airbnb --source browse-sh
hermes skills inspect browse-sh/airbnb.com/search-listings-ddgioa
hermes skills install browse-sh/airbnb.com/search-listings-ddgioa
```

識別子は `browse-sh/<hostname>/<task-id>` の形で、browse.sh の目録が公開している名前と同じです。中身は目録の GitHub の `sourceUrl` ではなく、skill ごとの詳細の入口（`/api/skills/<slug>` → `skillMdUrl`）から取ってきます。

#### 8. URL を直接指定（`url`） {#8-direct-url-url}

HTTP(S) の URL から `SKILL.md` を直接入れられます。作者が自分のサイトで skill を公開している（hub に載っていない、GitHub のパスもない）ときに便利です。Hermes は `references/`、`templates/`、`scripts/`、`assets/`、`examples/` の下で明示的に参照されているファイルも取得し、束の全体を検査してから入れます。

- Hermes での取得元 id: `url`
- 識別子: URL そのもの（前置きは不要です）
- 範囲: `SKILL.md` と、許可されたディレクトリの下で実際に参照されている補助ファイルだけ。Hermes が配布元の関係ないファイルを一覧したり写したりすることはありません。

```bash
hermes skills install https://sharethis.chat/SKILL.md
hermes skills install https://example.com/my-skill/SKILL.md --category productivity
```

名前は次の順で決まります。

1. SKILL.md の YAML frontmatter の `name:`（これが望ましく、きちんと書かれた skill には必ずあります）。
2. URL のパスの親ディレクトリ名（例: `.../my-skill/SKILL.md` → `my-skill`、`.../my-skill.md` → `my-skill`）。ただし名前として使える形（`^[a-z][a-z0-9_-]*$`）のときだけです。
3. TTY のある端末での対話での入力。
4. 対話しない場面（TUI の中の `/skills install` スラッシュコマンド、ゲートウェイのプラットフォーム、スクリプト）では、`--name` で指定するよう促す分かりやすいエラー。

```bash
# Frontmatter has no name and the URL slug is unhelpful — supply one:
hermes skills install https://example.com/SKILL.md --name sharethis-chat

# Or inside a chat session:
/skills install https://example.com/SKILL.md --name sharethis-chat
```

信頼の水準は必ず `community` で、他の取得元と同じ安全の検査が走ります。URL はインストールの識別子として保存されるので、`hermes skills update` で最新にしたいときは同じ URL から自動で取り直されます。

### 安全の検査と `--force` {#security-scanning-and---force}

hub から入れる skill はすべて、**安全の検査**を通ります。データの持ち出し、プロンプトへの注入、破壊的なコマンド、供給網の危うい兆候などを調べます。

`hermes skills inspect ...` は、取得できる場合に上流の情報も見せるようになりました。

- リポジトリの URL
- skills.sh の詳細ページの URL
- インストールのコマンド
- 週あたりのインストール数
- 上流での安全確認の状態
- well-known の目次や入口の URL

第三者の skill を自分で確かめたうえで、危険とまでは言えない方針上の停止を押し切りたいときは `--force` を使います。

```bash
hermes skills install skills-sh/anthropics/skills/pdf --force
```

大事な点は次のとおりです。

- `--force` は、注意や警告の水準の指摘による停止を押し切れます。
- `--force` は、検査の判定が `dangerous` の場合には**効きません**。
- 公式の追加 skill（`official/...`）は最初から信頼された扱いなので、第三者向けの警告の画面は出ません。

### 信頼の水準 {#trust-levels}

| 水準 | 取得元 | 方針 |
|-------|--------|--------|
| `builtin` | Hermes に同梱 | 常に信頼されます |
| `official` | リポジトリの `optional-skills/` | 最初から信頼され、第三者向けの警告は出ません |
| `trusted` | `openai/skills`、`anthropics/skills`、`huggingface/skills`、`NVIDIA/skills` のような信頼された登録所・リポジトリ | コミュニティの取得元より緩やかな方針です |
| `community` | それ以外すべて（`skills.sh`、well-known の入口、独自の GitHub リポジトリ、たいていのマーケットプレイス） | 危険とまでは言えない指摘は `--force` で押し切れます。`dangerous` の判定は止まったままです |

### 更新の流れ {#update-lifecycle}

hub は、入れてある skill の上流の版をもう一度調べられるだけの出どころを記録するようになりました。

```bash
hermes skills check          # Report which installed hub skills changed upstream
hermes skills update         # Reinstall only the skills with updates available
hermes skills update react   # Update one specific installed hub skill
hermes skills update react --force   # Overwrite a skill you've edited locally
```

保存された取得元の識別子と、いまの上流の束の内容のハッシュを使って、ずれを見つけます。

自分で編集した skill（ディスク上の内容が、インストール時に記録したハッシュと合わなくなったもの）は、`hermes skills update` の対象から**外されます**。変更が黙って上書きされることはありません。それでも上流の版に置き換えたいときは `--force` を渡します。

:::tip GitHub の流量制限
skill の hub の操作は GitHub の API を使います。認証していない場合の上限は 1 時間あたり 60 リクエストです。インストールや検索のときに上限のエラーが出たら、`.env` に `GITHUB_TOKEN` を設定すれば 1 時間あたり 5,000 リクエストまで増えます。エラーのメッセージにも、そのときに何をすればよいかが書かれています。
:::

### 自分の skill の取得元を公開する {#publishing-a-custom-skill-tap}

選んだ skill をまとめて共有したい——チーム内、組織内、あるいは広く公開——という場合、**tap** として公開できます。tap とは、他の Hermes の利用者が `hermes skills tap add <owner/repo>` で足せる GitHub のリポジトリのことです。サーバーも、登録所への登録も、リリースの仕組みも要りません。`SKILL.md` を置いたディレクトリがあれば十分です。

#### リポジトリの構成 {#repo-layout}

tap は、次のように並べた GitHub のリポジトリなら何でも構いません（公開でも非公開でも。非公開なら `GITHUB_TOKEN` が必要です）。

```
owner/repo
├── skills/                       # default path; configurable per-tap
│   ├── my-workflow/
│   │   ├── SKILL.md              # required
│   │   ├── references/           # optional supporting files
│   │   ├── templates/
│   │   └── scripts/
│   ├── another-skill/
│   │   └── SKILL.md
│   └── third-skill/
│       └── SKILL.md
└── README.md                     # optional but helpful
```

決まりは次のとおりです。

- skill はそれぞれ、tap のルートのパス（既定は `skills/`）の下の自分のディレクトリに置きます。
- ディレクトリ名が、そのまま skill のインストール名になります。
- 各 skill のディレクトリには、標準の [SKILL.md の frontmatter](#skillmd-format)（`name`、`description`、任意で `metadata.hermes.tags`、`version`、`author`、`platforms`、`metadata.hermes.config`）を持つ `SKILL.md` が必要です。
- `references/`、`templates/`、`scripts/`、`assets/` のようなサブディレクトリは、インストール時に `SKILL.md` と一緒に取得されます。
- ディレクトリ名が `.` または `_` で始まる skill は無視されます。

Hermes は、tap のパスの下のサブディレクトリをすべて並べ、それぞれに `SKILL.md` があるかを見て skill を見つけます。

#### いちばん小さい tap の例 {#minimal-tap-example}

```
my-org/hermes-skills
└── skills/
    └── deploy-runbook/
        └── SKILL.md
```

`skills/deploy-runbook/SKILL.md`:

```markdown
---
name: deploy-runbook
description: Our deployment runbook — services, rollback, Slack channels
version: 1.0.0
author: My Org Platform Team
metadata:
  hermes:
    tags: [deployment, runbook, internal]
---

# Deploy Runbook

Step 1: ...
```

これを GitHub へ push すれば、どの Hermes の利用者も購読してインストールできます。

```bash
hermes skills tap add my-org/hermes-skills
hermes skills search deploy
hermes skills install my-org/hermes-skills/deploy-runbook
```

#### 既定と違うパス {#non-default-paths}

skill が `skills/` の下にない場合（すでにあるプロジェクトに `skills/` の一部を足したときによくあります）、`~/.hermes/skills/.hub/taps.json` の tap の項目を編集します。

```json
{
  "taps": [
    {"repo": "my-org/platform-docs", "path": "internal/skills/"}
  ]
}
```

`hermes skills tap add` は、新しい tap を既定で `path: "skills/"` にします。別のパスが必要なときはファイルを直接編集してください。`hermes skills tap list` は tap ごとに実際に使われるパスを表示します。

#### tap を足さずに 1 つだけ入れる {#installing-individual-skills-directly-without-adding-a-tap}

公開されている GitHub のリポジトリから、リポジトリ全体を tap として足さずに、skill を 1 つだけ入れることもできます。

```bash
hermes skills install owner/repo/skills/my-workflow
```

登録所ごと購読してもらわずに、skill を 1 つだけ共有したいときに便利です。

#### tap の信頼の水準 {#trust-levels-for-taps}

新しい tap は既定で `community` の信頼になります。そこから入れた skill は通常の安全の検査を通り、最初のインストール時には第三者向けの警告の画面が出ます。自分の組織や広く信頼されている取得元をもっと高い水準にしたい場合は、`tools/skills_guard.py` の `TRUSTED_REPOS` にそのリポジトリを足します（Hermes 本体への PR が必要です）。

#### tap の管理 {#tap-management}

```bash
hermes skills tap list                                # show all configured taps
hermes skills tap add myorg/skills-repo               # add (default path: skills/)
hermes skills tap remove myorg/skills-repo            # remove
```

セッションの中では次のように使います。

```
/skills tap list
/skills tap add myorg/skills-repo
/skills tap remove myorg/skills-repo
```

tap は `~/.hermes/skills/.hub/taps.json` に保存されます（必要になったときに作られます）。

## 同梱 skill の更新（`hermes skills reset`） {#bundled-skill-updates-hermes-skills-reset}

Hermes は、リポジトリの `skills/` に同梱の skill を持っています。インストール時と `hermes update` のたびに、同期の処理がそれらを `~/.hermes/skills/` へ写し、`~/.hermes/skills/.bundled_manifest` に、各 skill 名と、同期した時点の内容のハッシュ（**もとのハッシュ**）の対応を記録します。

同期のたびに、Hermes は手元の写しのハッシュを計算し直し、もとのハッシュと比べます。

- **変わっていない** → 上流の変更を取り込んで問題ないので、新しい同梱の版を写し、新しいもとのハッシュを記録します。
- **変わっている** → **利用者が手を入れたもの**として、以後ずっと対象外にします。編集が踏み潰されることはありません。

skill の中に作られる実行時の一時ファイル（`__pycache__/`、`.pytest_cache/`、`.mypy_cache/`、`.ruff_cache/`、`.py` の隣にある `.pyc`）はハッシュに含まれないので、skill の補助スクリプトを動かしただけで手を入れた扱いになったり、`hermes skills list-modified` や `diff` から消えたりすることはありません。

この守りはよくできていますが、ひとつ厄介な角があります。同梱の skill を編集したあとで、その変更をやめて `~/.hermes/hermes-agent/skills/` からコピー＆ペーストして同梱の版に戻した場合、記録には最後に同期が成功したときの*古い*もとのハッシュが残ったままです。貼り付けた中身（いまの同梱のハッシュ）はその古いハッシュと合わないので、同期は手を入れたものとして印を付け続けます。

`hermes skills reset` はそのための逃げ道です。

```bash
# Safe: clears the manifest entry for this skill. Your current copy is preserved,
# but the next sync re-baselines against it so future updates work normally.
hermes skills reset google-workspace

# Full restore: also deletes your local copy and re-copies the current bundled
# version. Use this when you want the pristine upstream skill back.
hermes skills reset google-workspace --restore

# Non-interactive (e.g. in scripts or TUI mode) — skip the --restore confirmation.
hermes skills reset google-workspace --restore --yes
```

同じコマンドは、チャットではスラッシュコマンドとして使えます。

```text
/skills reset google-workspace
/skills reset google-workspace --restore
```

:::note プロファイル
プロファイルごとに、それぞれの `HERMES_HOME` の下に自分の `.bundled_manifest` があります。`hermes -p coder skills reset <name>` は、そのプロファイルにだけ効きます。
:::

### スラッシュコマンド（チャットの中） {#slash-commands-inside-chat}

同じコマンドはすべて `/skills` でも使えます。

```text
/skills browse
/skills search react --source skills-sh
/skills search https://mintlify.com/docs --source well-known
/skills inspect skills-sh/vercel-labs/json-render/json-render-react
/skills install openai/skills/skill-creator --force
/skills check
/skills update
/skills reset google-workspace
/skills list
```

公式の追加 skill は、いまも `official/security/1password` や `official/migration/openclaw-migration` のような識別子を使います。
