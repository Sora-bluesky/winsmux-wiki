---
title: "スキルの仕組み"
description: "必要になったときだけ読む知識の文書 — 段階的な開示、エージェントが管理するスキル、Skills Hub"
upstream_path: user-guide/features/skills.md
upstream_blob: 07522d5e62d37bba5ebfa1a4c533724cdecb8c61
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/skills
---

# スキルの仕組み {#skills-system}

スキルは、必要になったときにエージェントが読み込める、知識の文書です。トークンの消費を抑えるために**段階的な開示**の型に従っていて、[agentskills.io](https://agentskills.io/specification) のオープンな標準とも互換があります。

スキルはすべて **`~/.hermes/skills/`** に置かれます。ここが主となるディレクトリであり、正本です。新しく入れたときは、同梱のスキルがリポジトリからコピーされます。ハブから入れたスキルや、エージェントが作ったスキルもここへ入ります。エージェントはどのスキルでも変更・削除できます。

Hermes に**外部のスキルディレクトリ**を見させることもできます。ローカルのものと並べて走査する、追加のフォルダーです。下の[外部のスキルディレクトリ](#external-skill-directories)を参照してください。

関連:

- [同梱スキルの一覧](/hermes/docs/reference/skills-catalog/)
- [公式オプションスキルの一覧](/hermes/docs/reference/optional-skills-catalog/)

## Desktop で探して入れる {#browse-and-install-in-desktop}

**Capabilities → Skills** を開き、**Installed** と **Browse** を切り替えます。
検索欄は上に固定され、タブの切り替えと操作は同じ行に並びます。
**Installed** は、選んでいるプロファイルの実際のスキルと有効・無効の状態を読みます。
公開カタログから推測しているのではありません。**Browse** はネイティブのカタログ画面で、
サイトを埋め込んだものでも、もうひとつの小さなカタログでもありません。カードが既定の
表示です。フィルターの右にある一覧表示とカード表示のアイコンで、検索やフィルターを
消さずにレイアウトを切り替えられます。この選択は Skills と Plugins の間で覚えられます。
カードをクリックすると詳細が出ますし、そのカードの Install ボタンを直接押すこともできます。

Desktop と公開の [Skills Hub](https://hermes-agent.nousresearch.com/skills) は、同じ公開済みの CDN
スナップショット [`/docs/api/skills.json`](https://hermes-agent.nousresearch.com/docs/api/skills.json) を読みます。
公開ドキュメント側の別名は、Desktop が取りにいく URL
`https://nousresearch.github.io/hermes-agent/docs/api/skills.json` と同じスナップショットを配ります。
ドキュメントのビルドが、同梱の `skills/`、`optional-skills/`、そして中央のスキル索引から
これを生成します。閲覧のときに GitHub をたどったり、上流のマーケットプレイスへ問い合わせたり
することはありません。導入のときには、選んだスキルをその出どころの導入処理が取ってきます。

### サイトから入れる {#install-from-the-website}

Skills Hub では、入れられるカードのそれぞれに **Install in Hermes** のボタンが付いています。押すと、
インストール済みの Hermes Desktop アプリが、URL エンコードされた、出どころ付きのスキル指定で開きます。
たとえばオプションスキルなら `official/...`、ClawHub なら `clawhub/...` です。
同梱のスキルは、あいまいな名前だけではなく、明示的なリポジトリのパスを使います。
古いスナップショットにその明示的な同梱の指定が無い場合、サイトは導入リンクを出さず、
ネイティブの Browse も、あいまいな名前を解決するのではなく導入を無効にします。
次にドキュメントが公開されると、その指定が入ります。
同じ指定を、ネイティブの Browse とカードの CLI フォールバックも使います。

```text
hermes://skill/install?identifier=official%2Fsecurity%2F1password
```

Hermes は **Install “skill-name”?** を、**Source** と **Install to** の行を分けて表示します。
Cancel を押しても何も変わりません。確認したあとは、同じダイアログが **Installing…**、
続いて **Installed** を表示し、完了の通知が出ます。エラーはダイアログに残るので、読んでから
やり直せます。導入はこれまでの Skills Hub の流れを使い、セキュリティの走査、操作のログ、
導入済み一覧の更新も含みます。確認のダイアログを開いたままプロファイルや接続を切り替えた場合は、
新しい行き先でリンクを開き直してください。変更は新しいセッションから効きます。リンクで走査を
迂回したり、別のプロファイルを選んだりはできません。

公開のリンクは `hermes://` を使い、開発専用の `hermes-dev://` のスキームは使いません。
`skill/install` の経路には、更新された Desktop のビルドが必要です。アプリが無い、あるいは
リンクが認識されない場合は、Desktop を更新するか、カードを広げて CLI の導入コマンドを
コピーしてください。

## まっさらな状態から使う {#starting-with-a-blank-slate}

既定では、どのプロファイルにも同梱スキルの一式が入り、`hermes update` のたびに新しく同梱されたスキルが足されます。**同梱スキルの無い**プロファイルが欲しい、しかも更新をまたいで空のままにしたい、という場合は 2 つの道があります。

**インストールのとき**（既定の `~/.hermes` プロファイルに効きます）:

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash -s -- --no-skills
```

**プロファイルを作るとき**（名前付きのプロファイル）:

```bash
hermes profile create research --no-skills
```

**すでに入れてあるプロファイル**（既定でも名前付きでも）では、実行時に切り替えます:

```bash
hermes skills opt-out            # stop future seeding — nothing on disk is touched
hermes skills opt-out --remove   # also delete UNMODIFIED bundled skills (confirms first)
hermes skills opt-in --sync      # undo: remove the marker and re-seed now
```

どの道も、プロファイルのディレクトリに `.no-bundled-skills` の印を書きます。この印がある間、インストーラーも、`hermes update` も、スキルの同期も、そのプロファイルへの同梱スキルの配置をすべて飛ばします。印を消す（または `hermes skills opt-in` を実行する）と、また有効になります。

:::note 既定で安全
`hermes skills opt-out` が止めるのは*これから*の配置だけで、すでにディスクにあるものを消すことはありません。任意の `--remove` フラグは、同梱スキルが手つかずのとき（Hermes が入れた版とバイト単位で同じとき）**だけ**それを消します。自分で編集したスキル、ハブから入れたスキル、自分で書いたスキルは、いつでも残ります。
:::

## スキルを使う {#using-skills}

入れてあるスキルは、すべて自動的にスラッシュコマンドとして使えます。

```bash
# In the CLI or any messaging platform:
/gif-search funny cats
/axolotl help me fine-tune Llama 3 on my dataset
/github-pr-workflow create a PR for the auth refactor
/songsee analyze the frequency spread of this mix

# Just the skill name loads it and lets the agent ask what you need:
/excalidraw
```

### ひとつのコマンドでスキルを重ねる {#stacking-multiple-skills-in-one-command}

メッセージの先頭にスラッシュコマンドを並べれば、1 通で複数のスキルを呼び出せます。
先頭に続く `/skill` の語（5 つまで）がすべて読み込まれ、残りが指示になります。

```bash
/github-pr-workflow /test-driven-development fix issue #123 and open a PR
```

解釈は、入れてあるスキルではない最初の語で止まります。そのため、たまたま `/` で始まる引数
（ファイルのパスなど）が飲み込まれることはありません。

```bash
/ocr-and-documents /tmp/scan.pdf extract the tables   # loads one skill; /tmp/scan.pdf is the argument
```

何度も使う組み合わせには、[スキルの束](#skill-bundles)のほうが向いています。
短いコマンドひとつで同じことができます。

（プランモードも同じ形ですが、いまは組み込みのコマンドです。`/plan [request]` と打つと、Hermes は必要に応じて文脈を調べ、タスクを実行する代わりに markdown の実装計画を書き、その結果を、動いているワークスペースやバックエンドの作業ディレクトリからの相対で `.hermes/plans/` の下に保存します。）

自然な会話でスキルとやりとりすることもできます。

```bash
hermes chat --toolsets skills -q "What skills do you have?"
hermes chat --toolsets skills -q "Show me the axolotl skill"
```

## 素材からスキルを学ばせる（`/learn`） {#learning-a-skill-from-sources-learn}

`/learn` は、自分がすでに知っていること、あるいは手元に積み上がった資料を、`SKILL.md` を
手書きせずに使い回せるスキルへ変える、いちばん速い道です。用途は開かれています。*言葉で
説明できるものなら何でも*指し示せば、エージェントは手持ちの道具で素材を集め、
[この家の書き方の基準](#skillmd-format)（60 字以内の説明、決まった節の並び、Hermes のツールに
沿った書き方、でっち上げのコマンドを書かないこと）に従ったスキルを書き上げます。

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

### 大きな素材は知識ベースのスキルになります {#large-sources-become-knowledge-base-skills}

素材が本や、積み上がった論文、仕様書、大きなドキュメントのフォルダーのとき、エージェントは
それを 1 つのファイルへ詰め込んだり、情報の落ちた要約に縮めたりはしません。代わりに
**広がりのある知識ベースのスキル**を書きます。素材の中核となる考え方と索引を載せた身軽な
`SKILL.md` と、章やトピックごとに 1 ファイルへ蒸留したものを `references/` の下に置きます
（素材にふさわしければ用語集や早見表も足します）。参照ファイルは、質問がそれを必要とするまで
費用がかかりません。エージェントが `skill_view` で必要なときだけ読むので、問い合わせの費用は
素材の大きさではなく答えの大きさに比例します。同じ話題であたらしい素材を渡して `/learn` を
もう一度動かすと、重複を作らずに既存のスキルへ畳み込まれます。

蒸留が合成するのは構造 — 枠組み、定義、判断の規則、避けるべき型 — であって、素材の文章をそのまま
写すことはありません。

素材集めを生きたエージェントがやるので、`/learn` は CLI でも、メッセージングのゲートウェイでも、
TUI でも、ダッシュボードでも同じように動きますし、どの端末のバックエンド（ローカル、Docker、
リモート）でも同じです。取り込み専用のエンジンが別にあるわけではないからです。**ダッシュボード**
では、Skills のページに **Learn a skill** のボタンがあり、ディレクトリの欄、URL の欄、そして
自由に書けるテキスト欄を持つパネルが開きます。それが `/learn` の依頼を組み立てて、チャットで
実行します。

モデルのツールとしての足あとはありません。`/learn` は基準に沿ったプロンプトを組み立て、普通の
ターンとしてエージェントへ渡すだけです。エージェントは結果を `skill_manage` ツールで保存するので、
有効にしていれば[書き込み承認の関門](#gating-agent-skill-writes-skillswrite_approval)が効きます。

## 段階的な開示 {#progressive-disclosure}

スキルは、トークンを節約する読み込み方をします。

```
Level 0: skills_list()           → [{name, description, category}, ...]   (~3k tokens)
Level 1: skill_view(name)        → Full content + metadata       (varies)
Level 2: skill_view(name, path)  → Specific reference file       (varies)
```

エージェントは、本当に必要になったときだけスキルの全文を読み込みます。

## SKILL.md の書式 {#skillmd-format}

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

### OS を限定したスキル {#platform-specific-skills}

スキルは、`platforms` のフィールドで自分を特定の OS に限定できます。

| 値 | 対象 |
|-------|---------|
| `macos` | macOS（Darwin） |
| `linux` | Linux |
| `windows` | Windows |

```yaml
platforms: [macos]            # macOS only (e.g., iMessage, Apple Reminders, FindMy)
platforms: [macos, linux]     # macOS and Linux
```

設定すると、合わない OS では、そのスキルはシステムプロンプト、`skills_list()`、スラッシュコマンドから自動的に隠れます。省いた場合は、すべての OS で読み込まれます。

## スキルの出力とメディアの配信 {#skill-output-and-media-delivery}

スキルの応答（または、どのエージェントの応答でも）に、メディアファイルへの絶対パスが裸で含まれているとき — たとえば `/home/user/screenshots/diagram.png` — ゲートウェイはそれを見つけ、見える文章から取り除き、生のパスをメッセージに残す代わりに、そのファイルを相手のチャットへネイティブに届けます（Telegram の写真、Discord の添付など）。

音声については、`[[audio_as_voice]]` の指示子が、対応しているプラットフォーム（Telegram、WhatsApp）でファイルをネイティブのボイスメッセージの吹き出しへ格上げします。

### 文書として届けさせる: `[[as_document]]` {#forcing-document-style-delivery-asdocument}

インラインのプレビューとは**逆**が欲しいこともあります。再圧縮された画像の吹き出しではなく、ダウンロードできる添付としてファイルを届けたい、という場合です。よくある例が高解像度のスクリーンショットや図です。Telegram の `sendPhoto` は 1280 px、200 KB ほどに再圧縮してしまい、読めなくなります。1〜2 MB の PNG を `sendDocument` で送れば、元のバイト列がそのまま残ります。

応答の中（ふつうは最後の行）に `[[as_document]]` という指示子がそのまま含まれていると、その応答から取り出したメディアのパスはすべて、画像の吹き出しではなく文書・ファイルの添付として届きます。

```
Here is your rendered chart:

/home/user/.hermes/cache/chart-q4-2025.png

[[as_document]]
```

指示子は届ける前に取り除かれるので、受け取った人の目には触れません。粒度は意図して応答ごとの全か無かです。`[[as_document]]` を 1 回書けば、同じ応答の中のすべての画像のパスが文書として届きます。これは `[[audio_as_voice]]` の及ぶ範囲と同じです。

スキルからこれを使うのは、こんなときです。

- スクリーンショットや図を、ファイルとして渡す必要があるとき（別のツールで編集する、保管する、そのまま共有する）。
- 既定の劣化するプレビューでは細部が潰れるとき（小さな文字、1 ピクセル単位で正確な図、色が大事な描画）。

文書の経路を別に持たないプラットフォーム（SMS など）は、そこにある添付の仕組みへ落ちます。

### 条件付きの有効化（フォールバックのスキル） {#conditional-activation-fallback-skills}

スキルは、いまのセッションでどのツールが使えるかに応じて、自分を出したり隠したりできます。いちばん役に立つのは**フォールバックのスキル** — 有料のツールが使えないときにだけ出したい、無料やローカルの代わり — です。

```yaml
metadata:
  hermes:
    fallback_for_toolsets: [web]      # Show ONLY when these toolsets are unavailable
    requires_toolsets: [terminal]     # Show ONLY when these toolsets are available
    fallback_for_tools: [web_search]  # Show ONLY when these specific tools are unavailable
    requires_tools: [terminal]        # Show ONLY when these specific tools are available
```

| フィールド | 挙動 |
|-------|----------|
| `fallback_for_toolsets` | 並べたツールセットが使えるとき、そのスキルは**隠れます**。無いときに出ます。 |
| `fallback_for_tools` | 同じですが、ツールセットではなく個々のツールを見ます。 |
| `requires_toolsets` | 並べたツールセットが使えないとき、そのスキルは**隠れます**。あるときに出ます。 |
| `requires_tools` | 同じですが、個々のツールを見ます。 |

**例:** 組み込みの `duckduckgo-search` スキルは `fallback_for_toolsets: [web]` を使っています。`FIRECRAWL_API_KEY` を設定していると web のツールセットが使えるので、エージェントは `web_search` を使い、DuckDuckGo のスキルは隠れたままです。API キーが無ければ web のツールセットは使えないので、DuckDuckGo のスキルが自動でフォールバックとして現れます。

条件のフィールドを持たないスキルは、これまでどおり、いつでも出ます。

## 読み込み時の安全な初期設定 {#secure-setup-on-load}

スキルは、見つけられなくなることなく、必要な環境変数を宣言できます。

```yaml
required_environment_variables:
  - name: TENOR_API_KEY
    prompt: Tenor API key
    help: Get a key from https://developers.google.com/tenor
    required_for: full functionality
```

値が足りないとき、Hermes はそれを安全に尋ねますが、それはローカルの CLI でそのスキルが実際に読み込まれたときだけです。設定を飛ばしたまま、そのスキルを使い続けることもできます。メッセージングの画面で秘密情報を尋ねることは決してありません。代わりに、ローカルで `hermes setup` か `~/.hermes/.env` を使うよう伝えます。

いちど設定すると、宣言された環境変数は `execute_code` と `terminal` のサンドボックスへ**自動で渡されます**。スキルのスクリプトは `$TENOR_API_KEY` をそのまま使えます。スキル以外の環境変数には、`terminal.env_passthrough` の設定を使ってください。詳しくは[環境変数の受け渡し](/hermes/docs/user-guide/security/#environment-variable-passthrough)を参照してください。

### スキルの設定項目 {#skill-config-settings}

スキルは、秘密ではない設定（パスや好み）を `config.yaml` に置くことも宣言できます。

```yaml
metadata:
  hermes:
    config:
      - key: myplugin.path
        description: Path to the plugin data directory
        default: "~/myplugin-data"
        prompt: Plugin data directory path
```

設定は config.yaml の `skills.config` の下に保存されます。`hermes config migrate` は未設定の項目を尋ね、`hermes config show` はそれを表示します。スキルが読み込まれると、解決された設定値が文脈へ差し込まれるので、エージェントは設定された値を自動的に知ります。

詳しくは[スキルの設定](/hermes/docs/user-guide/configuration/#skill-settings)と[スキルを作る — 設定項目](/hermes/docs/developer-guide/creating-skills/#config-settings-configyaml)を参照してください。

## スキルのディレクトリ構成 {#skill-directory-structure}

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

第三者の URL や GitHub から入れる場合は、`SKILL.md` に加えて、それが指している `references/`、
`templates/`、`scripts/`、`assets/`、`examples/` の下のファイルだけが入ります。参照されていない
リポジトリのファイルはコピーされません。Hermes は隔離した束をまるごと走査し、出どころの URL、
正確な内容のハッシュ、走査器の版、見つかったもの、時刻、取りたてかキャッシュかを
`skills/.hub/lock.json` に記録します。

### 助言としての SkillEvaluator の走査 {#advisory-skillevaluator-scan}

組み込みのセキュリティ走査器（上の導入方針を強制するもの）に加えて、Hermes はハブからの
導入のたびに [NVIDIA SkillEvaluator](https://github.com/NVIDIA/SkillEvaluator) の Tier 1 の検査を
第二の意見として走らせられます。Tier 1 は決定的で、鍵が要りません。個人情報の検出（漏れた
メールアドレス、個人のパス、接続文字列）、Unicode による密輸の検出、スクリプトの lint、
ライセンスの適合、そして [NVIDIA SkillSpector](https://github.com/NVIDIA/SkillSpector) による
静的なセキュリティ走査です。

この走査は**助言だけ**です。見つかったものはファイル名と行番号とともに導入の確認の前に
表示され、導入はそのまま進みます。本物の認証情報らしく見えるもの（秘密鍵、クラウドの
アクセスキー、トークン、認証情報つきの接続文字列）は赤で強調されるので、決める前に
その行を確かめられます。個人情報の類は参考情報です。上流の走査器には誤検出として
知られている種類があるので（`git@github.com` の SSH の書き方、ドキュメントの例に出る
メールアドレスなど）、それが何かを止めることはありません。

有効にするには、任意の走査器のバイナリを入れます（2 つ目が `security` の検査を動かします。
無い場合、その検査は「未実行」と報告するだけです）。

```bash
uv tool install --python 3.13 \
  "skillevaluator @ git+https://github.com/NVIDIA/SkillEvaluator.git@v0.1.0"
uv tool install "git+https://github.com/NVIDIA/SkillSpector.git@v2.9.5"
```

バイナリが PATH に無ければ、走査は黙って飛ばされます。まるごと切りたいときは、
次のようにします。

```yaml
skills:
  tier1_advisory: false
```

ダッシュボードの Browse-hub の走査ボタンも、組み込みの走査器の判定と並べて、同じ助言の
データを応答の `tier1` フィールドで返します。

## 外部のスキルディレクトリ {#external-skill-directories}

Hermes の外でスキルを持っている場合 — たとえば、複数の AI ツールで共有している `~/.agents/skills/` のディレクトリ — Hermes にそれらも走査させられます。

`~/.hermes/config.yaml` の `skills` の節に `external_dirs` を足します。

```yaml
skills:
  external_dirs:
    - ~/.agents/skills
    - /home/shared/team-skills
    - ${SKILLS_REPO}/skills
```

パスは `~` の展開と、`${VAR}` の環境変数の置き換えに対応しています。

### 仕組み {#how-it-works}

- **作るのはローカル、更新はその場で**: エージェントが新しく作るスキルは `~/.hermes/skills/`（設定していれば `skills.create_dir`。下を参照）へ書かれます。すでにあるスキルは、`external_dirs` の下にあるものも含め、見つかった場所で書き換えられます。エージェントが `skill_manage` の `patch`（狙いを絞った直しでも、まるごとの書き直しでも）、`write_file`、`remove_file`、`delete` といった操作を使ったときです。
- **外部のディレクトリは書き込み防止の境界ではありません**: 外部のスキルディレクトリが Hermes のプロセスから書ける状態なら、エージェントによるスキルの更新はそのディレクトリのファイルを変えられます。共有している外部のスキルを読み取り専用にしておきたいなら、ファイルシステムの権限か、別のプロファイル／ツールセットの構成を使ってください。
- **ローカルが優先**: 同じ名前のスキルがローカルのディレクトリと外部のディレクトリの両方にある場合、ローカルのほうが勝ちます。
- **完全に統合されます**: 外部のスキルも、システムプロンプトの索引、`skills_list`、`skill_view`、そして `/skill-name` のスラッシュコマンドに出てきます。ローカルのスキルと何も変わりません。
- **存在しないパスは黙って飛ばされます**: 設定したディレクトリが無くても、Hermes はエラーを出さずに無視します。すべてのマシンにあるとは限らない、任意の共有ディレクトリに便利です。

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

4 つのスキルがすべて、あなたのスキルの索引に出ます。`my-custom-workflow` という名前のスキルをローカルに新しく作ると、外部の版はその陰に隠れます。

## スキルの作成先を変える（`skills.create_dir`） {#redirecting-skill-creation-skillscreatedir}

既定では、エージェントは新しいスキルをプロファイルのローカルの `~/.hermes/skills/` へ書きます。エージェントが作るスキルを別の場所 — 共有の「頭脳」ディレクトリ、git で管理しているリポジトリ、群ぜんたいで共有するスキルのボリューム — へ置きたいときは、`skills` の節に `create_dir` を設定します。

```yaml
skills:
  create_dir: /opt/brain/skills
```

これで変わるのは次の点です。

- **`skill_manage` の create がそこへ書きます。** 新しいスキル（カテゴリーのサブディレクトリも含めて）は、ローカルのスキルディレクトリではなく `create_dir` の下に作られます。そのディレクトリが無ければ、最初の書き込みのときに作られます。
- **エージェントへの指示も設定に従います。** スキルを作る場所を示すエージェント向けの指示 — `skill_manage` ツールの説明や、関連するプロンプトの文 — はすべて、設定したディレクトリを動的に埋めて表示します。だからエージェントは、そこへスキルを作るよう伝えられます。システムプロンプトの上書きも、ファイルシステムの小細工も要りません。
- **そのディレクトリは完全に統合されます。** `create_dir` の下のスキルも、ローカルのディレクトリと並べて走査されます。スキルの索引、`skills_list`、`skill_view`、スラッシュコマンドに出てきますし、ローカルのスキルと同じように patch や削除ができます。
- **それ以外はローカルのままです。** すでにあるスキルは、これまでどおりそれがある場所で書き換えられます。同梱スキルの同期、ハブ、そして手入れ役は、プロファイルのローカルのディレクトリに対して動き続けます。

パスは `~` の展開と `${VAR}` の置き換えに対応しています。相対パスは Hermes ホームからの相対で解決されます。`create_dir` にローカルのスキルディレクトリを設定するのは、設定しないのと同じです。

## プロジェクトに置くスキル {#project-local-skills}

リポジトリは自分のスキルを持てます。そのプロジェクトの中で始めたセッションでだけ効きます。ほかのエージェントのハーネスが、リポジトリごとの設定に使っているのと同じ型です。git のチェックアウトの中で Hermes を起こすと、次の場所のスキルを探します。

```text
<project-root>/.hermes/skills/    # Hermes-native location
<project-root>/.agents/skills/    # cross-tool convention (shared with other agent CLIs)
```

プロジェクトのルートは、`.git` を含む最も近い先祖のディレクトリです（worktree と submodule も数えます）。

### プロジェクトを信頼する {#trusting-a-project}

スキルはエージェントが従う手順の文書なので、Hermes は、どこからか clone してきたリポジトリのスキルを**自動では読み込みません**。プロジェクトのスキルがあるリポジトリで初めて Hermes を動かすと、バナーに知らせが出ます。

```text
◆ 3 project skill(s) found in /home/you/myproject but not loaded — run `hermes skills trust` to enable them.
```

そのリポジトリを 1 回信頼します（その中から、あるいはパスを渡して）。

```bash
hermes skills trust             # trust the current repo
hermes skills trust ~/myproject # or explicitly
hermes skills untrust           # revoke
```

信頼したルートは、`~/.hermes/config.yaml` の `skills.trusted_project_dirs` に保存されます。`skills.project_discovery: false` を設定すると、この機能をまるごと切れます（走査もせず、知らせも出ません）。

### 優先順位 {#precedence}

プロジェクトのスキルは**いちばん優先される段**です。`project → local (~/.hermes/skills/) → external_dirs` の順になります。`deploy` という名前のプロジェクトスキルは、そのリポジトリの中のセッションでは、同じ名前のプロファイルのスキルや同梱のスキルを上書きします。そこが狙いです。リポジトリに同梱したスキルは自分の土俵で勝ち、グローバルのプロファイルには手を触れません。プロジェクトのスキルは、エージェントのスキルの索引で `[project]` と印が付くので、出どころは見えたままです。

外部のディレクトリと同じく、プロジェクトのスキルのディレクトリはリポジトリのものとして扱われます。自動でのスキルの手入れ（手入れ役）がそれらを変えることはなく、エージェントが新しく作るスキルは、いつでも `~/.hermes/skills/` へ行きます。

### 走査時の隔離 {#scan-time-quarantine}

信頼はリポジトリ単位の判断ですが、リポジトリのスキルの中身は `git pull` のたびに変わります。その隙間を塞ぐため、プロジェクトのスキルはすべて、索引に入る前に、Skills Hub からの導入と同じセキュリティ走査器で走査されます。走査の判定が**危険**のスキル（プロンプトインジェクションの指示、認証情報を持ち出すコマンド、隠し文字の細工）は隔離されます。スキルの索引、`skills_list`、スラッシュコマンドに出ず、名前で読み込もうとしても説明つきのエラーで断られます。走査は `~/.hermes/cache/project_skill_scans/` の下で内容のハッシュごとにキャッシュされ（リポジトリの中には決して置きません）、スキルの中身が変わると自動で走り直します。

### 対話しない画面（cron、API、ACP） {#non-interactive-surfaces-cron-api-acp}

cron のジョブや、ほかの対話しない画面は、あなたが対話のときに下した信頼の判断を引き継ぎます。そこで尋ねることも、勝手に信頼することもありません。プロジェクトのルートは、その画面の作業ディレクトリから解決されます（cron のジョブなら `workdir`。terminal ツールと同じ仕組みです）。`workdir` が、以前に信頼したリポジトリの中にある cron のジョブは、そのリポジトリのプロジェクトスキルを読み込みます。信頼していない、あるいはまだ決めていないリポジトリのジョブは、何も読み込みません。

TUI とデスクトップでは、プロジェクトのルートはセッションごとの**ワークスペース**（サイドバーに表示され、ワークスペースの選択で切り替えられるディレクトリ）に従います。そのため、信頼済みのリポジトリの中で `hermes --tui` を起動すれば、`terminal.cwd` が既定の `.` のままでも、そのリポジトリのプロジェクトスキルがスラッシュコマンドとして登録されます。二つのリポジトリで二つのセッションを開けば、それぞれが自分のぶんだけを見ます。

## スキルの束 {#skill-bundles}

スキルの束は、複数のスキルをひとつのスラッシュコマンドにまとめる、小さな YAML のファイルです。`/<bundle-name>` を実行すると、その束に並べたスキルが一度にすべて読み込まれます。ある作業では必ず同じスキルの組が効く、というときに便利です。

### 手早い例 {#quick-example}

```bash
# Create a bundle for backend feature work
hermes bundles create backend-dev \
  --skill github-code-review \
  --skill test-driven-development \
  --skill github-pr-workflow \
  -d "Backend feature work — review, test, PR workflow"
```

そのあと CLI でも、どのゲートウェイのプラットフォームでも:

```
/backend-dev refactor the auth middleware
```

エージェントは 3 つのスキルすべてを 1 通のユーザーメッセージとして受け取り、スラッシュコマンドのあとに書いた文章は、ユーザーからの指示として添えられます。

### YAML の書式 {#yaml-schema}

束は **`~/.hermes/skill-bundles/<slug>.yaml`** に置かれ、こんな形をしています。

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

フィールド:
- `name`（任意 — 省くとファイル名の語幹になります） — 束の表示名です。スラッシュコマンド用に、ハイフンつなぎの slug へ正規化されます（`Backend Dev` → `/backend-dev`）。
- `description`（任意） — `/bundles` と `hermes bundles list` に出る短い説明です。
- `skills`（必須。空でないリスト） — スキルの名前か、スキルのディレクトリからの相対パスです。`/<skill-name>` に渡すのと同じ識別子を使います。
- `instruction`（任意） — 読み込んだスキルの内容の前に置かれる、追加の案内です。「この組をいつもこう使う」を書き留めるのに向いています。

### 束を管理する {#managing-bundles}

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

チャットのセッションの中では、`/bundles` が入れてあるすべての束と、そのスキルを並べます。

### 挙動 {#behavior}

- slug がぶつかったとき、**束のほうが個々のスキルより優先されます**。`research` という束を作り、`research` というスキルも持っている場合、`/research` は束を呼びます。これは意図した動きです。その名前を付けた時点で、束を選んだことになります。
- **足りないスキルは飛ばされるだけで、致命的にはなりません。** 束が `skill-foo` を挙げていて、それを入れていない場合でも、束は見つかったスキルを読み込み、エージェントには飛ばしたものの一覧が知らされます。
- **束はどの画面でも働きます** — 対話の CLI、TUI、ダッシュボードのチャット、そしてすべてのゲートウェイのプラットフォーム（Telegram、Discord、Slack、…） — 個々のスキルのコマンドと同じところで振り分けているからです。
- **束はプロンプトのキャッシュを無効にしません。** `/<skill-name>` と同じように、呼び出したその時に新しいユーザーメッセージを作るだけで、システムプロンプトは書き換えません。

### 個別に入れるより束が勝つとき {#when-bundles-beat-installing-each-skill-manually}

束を使うのは、こんなときです。
- 繰り返す作業で、いつも同じスキルを組にしている（`/backend-dev`、`/release-prep`、`/incident-response`）。
- `/skill` を何度も続けて打つより、1 文字短い頭の使い方をしたい。
- 束の YAML を共有の dotfiles リポジトリへ入れ、`~/.hermes/skill-bundles/` へシンボリックリンクを張って、チーム共通の「作業プロファイル」を配りたい。

束はただの YAML の別名で、スキルを代わりに入れてくれるわけではありません。スキル本体は先にそろっている必要があります（`~/.hermes/skills/` か、外部のスキルディレクトリに）。そろっていなければ、束を呼んでも足りないものが飛ばされるだけです。

## エージェントが管理するスキル（skill_manage ツール） {#agent-managed-skills-skillmanage-tool}

エージェントは `skill_manage` ツールで、自分のスキルを作り、更新し、削除できます。これはエージェントの**手続き記憶**です。ひとくせある手順を組み立てられたとき、その進め方をあとで使い回せるようスキルとして保存します。

スキルと記憶は、自己改善のループの中で組んで働きます。記憶はいつでも文脈にあるべき小さく
変わらない事実を、スキルは関係するときだけ読み込むべき長い手順を持ちます。背景の見直しは、
セッションのあとにスキルの変更を提案したり下書きしたりできますが、下にある書き込み承認の関門を
使えば、それが着地する前に人の確認を挟めます。

### エージェントがスキルを作るとき {#when-the-agent-creates-skills}

システムプロンプトは、ひとくせある手順をあとで使い回せるよう `skill_manage` で記録することを
エージェントに求めています。実際には、次のような場面です。

- 繰り返す価値のある多段の手順を組み立てたとき
- エラーや行き止まりにぶつかって、うまくいく道を見つけたとき
- 利用者に進め方を直されたとき

### スキルの項目はどんな形か {#what-a-skill-entry-looks-like}

スキルとは、ある種類の作業を、いちばん効率よく正しく、あなたの流儀でこなすための指示です。
手順を順番どおりに、うまくいくコマンドとツールの呼び出し、結果をどんな形にしたいか、そして
時間を溶かす落とし穴を書きます。前面のターンで書かれたものでも、背景の見直しが書いたものでも、
手入れ役がまとめ直したものでも、そこに入るのは**教訓であって、ログではありません**。落とし穴は、
一般化できる規則と*なぜ*という仕組みの一節を、それが効く手順に添えて、1 回だけ述べたものです。
事故の語り、PR や issue の番号、日付、引用したチャットは、スキルの中身ではありません。規則は、
背後の物語なしで立っていなければなりません。いつでも効く規則は `SKILL.md` そのものに置きます。
`references/` が持つのは、話題で名付けた少数のファイル（判断の表、手順のレシピ、プロバイダーの
癖）で、セッションごとに 1 ファイル積み上げるのではなく、その場で書き足していきます。スキルは、
毎ターン読み込まれているもの（リポジトリの `AGENTS.md`、ツールのスキーマ）を言い直しもしません。

`skill_manage` は、`create` のときと `references/` への書き込みのときに助言の linter を走らせ、
見つかったものをツールの結果に返します。この形のために作られた規則が 2 つあります。
`incident-log-shape`（PR や issue の番号がぎっしり詰まった本文）と `references-sprawl`
（参照ファイルが 60 を超える）です。これらは警告するだけで、書き込みを止めることはありません。

### 操作 {#actions}

| 操作 | 使いどころ | 主なパラメーター |
|--------|---------|------------|
| `create` | まっさらから新しいスキルを作る | `name`、`content`（SKILL.md の全文）、任意で `category` |
| `patch` | 狙いを絞った直し（こちらを推奨） | `name`、`old_string`、`new_string` |
| `patch` に `content` を渡す | 大きな構造の書き直し（SKILL.md をまるごと差し替えます。`edit` は以前からの別名です） | `name`、`content` |
| `delete` | スキルをまるごと消す | `name` |
| `write_file` | 補助のファイルを足す・更新する | `name`、`file_path`、`file_content` |
| `remove_file` | 補助のファイルを消す | `name`、`file_path` |

各操作は、それぞれ別の形として示されます。文章を入れる場所は操作ごとに 1 つだけです
（`content` は create とまるごとの書き直し、`new_string` は狙いを絞った直し、`file_content` は
write_file です）。ほかの操作の場所を使った指示 — たとえば `create` に `file_content` を
付けたもの — はツールの形式に合いません（形式を縛って動くローカルの実行基盤は、そもそも
そういう指示を出しません）。それでも届いてしまった場合は、**その束のどの指示も適用される
前に**はねられ、文章がどのキーに入っているか、どこへ移せばよいかがエラーに示されます。

:::tip
更新には狙いを絞った `patch` を勧めます。変わった文章だけがツールの呼び出しに現れるので、まるごと書き直すよりトークンの効率が良いためです。
:::

### エージェントのスキル書き込みに関門を置く（`skills.write_approval`） {#gating-agent-skill-writes-skillswriteapproval}

既定では、エージェントは自由にスキルを書きます。ターンのあとに動く[背景の自己改善の
見直し](/hermes/docs/user-guide/features/memory/#controlling-memory-writes-write_approval)
からのものも含めてです。スキルへの書き込みを毎回先に承認したいなら（学んだことを見誤る
小さなモデル、厳しい環境、あるいは自己改善のループに目を光らせておきたいとき）、
書き込み承認の関門を入れます。

```yaml
skills:
  write_approval: false     # false = write freely (default) | true = require approval
```

`write_approval: true` のとき、`skill_manage` の書き込み（create / edit / patch / delete /
write_file / remove_file）はすべて、確定されずに**下書きとして置かれます**。SKILL.md はその場で
読むには大きすぎるので、前面のターンから来た書き込みでも、背景の見直しから来たものでも、
等しく下書きになります。下書きは再起動をまたいで `~/.hermes/pending/skills/` の下に残り、
危険なコマンドと同じ、見慣れた承認・却下の流れで確認できます。

```
/skills pending             # list staged skill writes + a one-line gist each
/skills diff <id>           # full unified diff (best viewed in CLI or dashboard)
/skills approve <id>        # apply it (or 'all')
/skills reject <id>         # drop it (or 'all')
/skills approval on         # turn the gate on (or 'off') and persist it
```

確認の画面は、対話の CLI でもメッセージングのプラットフォームでも使えます（チャットの吹き出し
では diff の出力が切り詰められます。全文は CLI か、保留の JSON ファイルで読んでください）。
記憶への書き込みにも `memory.write_approval` という同じ関門があります。[記憶への書き込みを
制御する](/hermes/docs/user-guide/features/memory/#controlling-memory-writes-write_approval)を
参照してください。

> これとは別の `skills.guard_agent_created` の設定は、内容の走査器（危険なパターンの推定）で
> あって、承認の関門ではありません。2 つは独立しています。[エージェントが作ったスキルの
> 書き込みへの防護](/hermes/docs/user-guide/configuration/#guard-on-agent-created-skill-writes)を
> 参照してください。

## Skills Hub {#skills-hub}

オンラインのレジストリ、`skills.sh`、well-known のスキルの配信先、そして公式のオプションスキルから、スキルを探し、検索し、入れ、管理できます。

絞り込みのない検索（CLI、TUI、ダッシュボード）は、外部のレジストリを覆うキャッシュ済みの中央索引から答えます。その索引は定期的に作り直されるので、問い合わせに当たりが無いときは、Hermes が `skills.sh`、ClawHub、LobeHub、well-known の配信先へ直接も尋ねます。数分前に公開されたスキルでも出てきます。この追加の一巡には検索の持ち時間のうち最大 8 秒しか使わないので、遅いレジストリのせいで「見つからない」が長い待ちに化けることはありません。独自の GitHub のタップはこのフォールバックには含まれません（`--source github` で検索するか、索引が追い付くのを待ってください）。`--source nvidia` のようなプロバイダーの絞り込みもこれを呼びません（それらのレジストリはプロバイダーの情報を持っていないためです）。

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

### 使えるハブの出どころ {#supported-hub-sources}

| 出どころ | 例 | 備考 |
|--------|---------|-------|
| `official` | `official/security/1password` | Hermes に同梱されるオプションのスキルです。 |
| `skills-sh` | `skills-sh/vercel-labs/agent-skills/vercel-react-best-practices` | `hermes skills search <query> --source skills-sh` で検索できます。skills.sh の slug がリポジトリのフォルダー名と違うとき、Hermes は別名のスキルも解決します。 |
| `well-known` | `well-known:https://mintlify.com/docs/.well-known/skills/mintlify` | サイトの `/.well-known/skills/index.json` から直接配られるスキルです。サイトやドキュメントの URL で検索します。 |
| `url` | `https://sharethis.chat/SKILL.md` | `SKILL.md` への直接の HTTP(S) URL と、そこから明示的に参照される補助ファイルです。名前の決め方は、frontmatter → URL の slug → 対話での入力 → `--name` フラグ、の順です。 |
| `github` | `openai/skills/k8s` | GitHub のリポジトリ／パスからの直接の導入と、独自のタップです。 |
| `clawhub`、`lobehub`、`browse-sh` | 出どころごとの識別子 | コミュニティやマーケットプレイスとの連携です。 |

### つながっているハブとレジストリ {#integrated-hubs-and-registries}

Hermes はいま、次のスキルの生態系と発見の経路につながっています。

#### 1. 公式のオプションスキル（`official`） {#1-official-optional-skills-official}

Hermes のリポジトリ自体で手入れされていて、組み込みの信頼で入ります。

- 一覧: [公式オプションスキルの一覧](/hermes/docs/reference/optional-skills-catalog/)
- リポジトリ内の場所: `optional-skills/`
- 例:

```bash
hermes skills browse --source official
hermes skills install official/security/1password
```

#### 2. skills.sh（`skills-sh`） {#2-skillssh-skills-sh}

Vercel が公開しているスキルのディレクトリです。Hermes は直接検索し、スキルの詳細ページを調べ、別名の slug を解決し、元のリポジトリから入れられます。

- ディレクトリ: [skills.sh](https://skills.sh/)
- CLI・ツールのリポジトリ: [vercel-labs/skills](https://github.com/vercel-labs/skills)
- Vercel 公式のスキルのリポジトリ: [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)
- 例:

```bash
hermes skills search react --source skills-sh
hermes skills inspect skills-sh/vercel-labs/json-render/json-render-react
hermes skills install skills-sh/vercel-labs/json-render/json-render-react --force
```

#### 3. well-known のスキル配信先（`well-known`） {#3-well-known-skill-endpoints-well-known}

`/.well-known/skills/index.json` を公開しているサイトから、URL で見つける方式です。中央のハブがひとつあるわけではなく、Web 上の発見の約束ごとです。

- 生きている配信先の例: [Mintlify ドキュメントのスキル索引](https://mintlify.com/docs/.well-known/skills/index.json)
- サーバーの参照実装: [vercel-labs/skills-handler](https://github.com/vercel-labs/skills-handler)
- 例:

```bash
hermes skills search https://mintlify.com/docs --source well-known
hermes skills inspect well-known:https://mintlify.com/docs/.well-known/skills/mintlify
hermes skills install well-known:https://mintlify.com/docs/.well-known/skills/mintlify
```

#### 4. GitHub から直接（`github`） {#4-direct-github-skills-github}

Hermes は GitHub のリポジトリや、GitHub を使ったタップから直接入れられます。リポジトリとパスがすでに分かっているときや、自分の独自の出どころを足したいときに便利です。

既定のタップ（何も設定せずに見られます）:
- [openai/skills](https://github.com/openai/skills)
- [anthropics/skills](https://github.com/anthropics/skills)
- [huggingface/skills](https://github.com/huggingface/skills)
- [NVIDIA/skills](https://github.com/NVIDIA/skills) — NVIDIA が検証したスキル（署名つきの `skill.oms.sig` と、統制のための `skill-card.md`）
- [garrytan/gstack](https://github.com/garrytan/gstack)
- [K-Dense-AI/scientific-agent-skills](https://github.com/K-Dense-AI/scientific-agent-skills) と [synthetic-sciences/openscience](https://github.com/synthetic-sciences/openscience) — 約 480 の科学研究向けスキル（バイオインフォマティクス、化学、物理、機械学習の訓練、学術のツール類）が、ひとつの `science` カテゴリーにまとまっています。信頼はコミュニティ水準で、導入のたびにセキュリティ走査が走ります。多くは第三者のツールを包んでいて、それぞれのライセンスがあります（GPL のものもあり、KEGG は学術以外の利用に商用ライセンスが要ります）。それぞれのスキルの前提条件を確かめてください。

- 例:

```bash
hermes skills install openai/skills/k8s
hermes skills tap add myorg/skills-repo
```

**カテゴリーのまとめ方（`skills.sh.json`）。** GitHub のタップは、リポジトリのルートに
[skills.sh のスキーマ](https://skills.sh/schemas/skills.sh.schema.json)に従った
`skills.sh.json` を置けます。その `groupings`（それぞれ `title` とスキル名の並びを持ちます）は
索引を作るときに読まれ、[Skills Hub](https://hermes-agent.nousresearch.com/docs) のページに出る
カテゴリーの見出しになります。タグから推測したものではなくなります。これは汎用の仕組みで、
このファイルを置いたタップはどれも本当のカテゴリー分けを得られますし、Hermes 側の変更は要りません。

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

コミュニティの出どころとしてつながっている、第三者のスキルのマーケットプレイスです。

- サイト: [clawhub.ai](https://clawhub.ai/)
- Hermes での出どころ id: `clawhub`

#### 6. LobeHub（`lobehub`） {#6-lobehub-lobehub}

Hermes は LobeHub の公開カタログからエージェントの項目を検索し、入れられる Hermes のスキルへ変換できます。

- サイト: [LobeHub](https://lobehub.com/)
- 公開エージェントの索引: [chat-agents.lobehub.com](https://chat-agents.lobehub.com/)
- 元になるリポジトリ: [lobehub/lobe-chat-agents](https://github.com/lobehub/lobe-chat-agents)
- Hermes での出どころ id: `lobehub`

#### 7. browse.sh（`browse-sh`） {#7-browsesh-browse-sh}

Hermes は [browse.sh](https://browse.sh) とつながっています。Browserbase が集めた、サイトごとのブラウザー操作の SKILL.md が 200 以上あるカタログです（Airbnb、Amazon、arXiv、12306.cn、Etsy、Xero など）。それぞれのスキルは、あるサイトを端から端まで操作する方法を書いたもので、Hermes のブラウザーのツールや、すでに入れてあるブラウザー操作のスキルと組んで使えます。

- サイト: [browse.sh](https://browse.sh/)
- カタログの API: `https://browse.sh/api/skills`
- Hermes での出どころ id: `browse-sh`
- 信頼の水準: `community`

```bash
hermes skills search airbnb --source browse-sh
hermes skills inspect browse-sh/airbnb.com/search-listings-ddgioa
hermes skills install browse-sh/airbnb.com/search-listings-ddgioa
```

識別子は `browse-sh/<hostname>/<task-id>` の形で、browse.sh のカタログが出している slug と一致します。中身は、カタログの GitHub の `sourceUrl` からではなく、スキルごとの詳細の配信先（`/api/skills/<slug>` → `skillMdUrl`）を通じて解決されます。

#### 8. URL から直接（`url`） {#8-direct-url-url}

`SKILL.md` を、どんな HTTP(S) の URL からでも直接入れられます。作者が自分のサイトでスキルを配っているとき（ハブに載っていない、打ち込む GitHub のパスも無い）に便利です。Hermes は `references/`、`templates/`、`scripts/`、`assets/`、`examples/` の下から明示的に参照されているファイルも取ってきて、束ぜんたいを走査してから入れます。

- Hermes での出どころ id: `url`
- 識別子: URL そのもの（前置きは要りません）
- 範囲: `SKILL.md` と、許可されたディレクトリの中で実際に参照されている補助ファイルです。Hermes が、配信元から関係のないファイルを数え上げたりコピーしたりすることはありません。

```bash
hermes skills install https://sharethis.chat/SKILL.md
hermes skills install https://example.com/my-skill/SKILL.md --category productivity
```

名前の決め方は、次の順です。
1. SKILL.md の YAML frontmatter の `name:` フィールド（推奨。きちんと書かれたスキルには必ずあります）。
2. URL のパスの親ディレクトリ名（たとえば `.../my-skill/SKILL.md` → `my-skill`、`.../my-skill.md` → `my-skill`）。有効な識別子（`^[a-z][a-z0-9_-]*$`）のときに限ります。
3. TTY のある端末での対話による入力。
4. 対話しない画面（TUI の中の `/skills install` のスラッシュコマンド、ゲートウェイのプラットフォーム、スクリプト）では、`--name` での上書きを指し示す、きれいなエラー。

```bash
# Frontmatter has no name and the URL slug is unhelpful — supply one:
hermes skills install https://example.com/SKILL.md --name sharethis-chat

# Or inside a chat session:
/skills install https://example.com/SKILL.md --name sharethis-chat
```

信頼の水準はいつでも `community` で、ほかのどの出どころとも同じセキュリティ走査が走ります。URL は導入の識別子として保存されるので、`hermes skills update` は更新したいときに同じ URL から自動で取り直します。

### セキュリティの走査と `--force` {#security-scanning-and---force}

ハブから入れるスキルはすべて、データの持ち出し、プロンプトインジェクション、破壊的なコマンド、サプライチェーンの兆候、そのほかの脅威を見る**セキュリティ走査器**を通ります。

`hermes skills inspect ...` は、上流のメタデータが取れるならそれも見せます。
- リポジトリの URL
- skills.sh の詳細ページの URL
- 導入のコマンド
- 週あたりの導入数
- 上流のセキュリティ監査の状態
- well-known の索引・配信先の URL

第三者のスキルを自分で確かめたうえで、危険ではない方針によるブロックを越えたいときは `--force` を使います。

```bash
hermes skills install skills-sh/anthropics/skills/pdf --force
```

大事な挙動:
- `--force` は、注意・警告の水準の指摘による方針のブロックを越えられます。
- `--force` は、`dangerous` の走査判定を越えることは**できません**。
- 公式のオプションスキル（`official/...`）は組み込みの信頼として扱われ、第三者への警告パネルは出ません。

### 信頼の水準 {#trust-levels}

| 水準 | 出どころ | 方針 |
|-------|--------|--------|
| `builtin` | Hermes に同梱 | いつでも信頼します |
| `official` | リポジトリの `optional-skills/` | 組み込みの信頼。第三者への警告なし |
| `trusted` | `openai/skills`、`anthropics/skills`、`huggingface/skills`、`NVIDIA/skills` のような信頼済みのレジストリ／リポジトリ | コミュニティの出どころより緩やかな方針 |
| `community` | それ以外すべて（`skills.sh`、well-known の配信先、独自の GitHub リポジトリ、ほとんどのマーケットプレイス） | 危険ではない指摘は `--force` で越えられます。`dangerous` の判定はブロックされたままです |

### 更新の流れ {#update-lifecycle}

ハブは、入れてあるスキルの上流の版を見直せるだけの出どころの情報を持つようになりました。

```bash
hermes skills check          # Report which installed hub skills changed upstream
hermes skills update         # Reinstall only the skills with updates available
hermes skills update react   # Update one specific installed hub skill
hermes skills update react --force   # Overwrite a skill you've edited locally
```

これは、保存してある出どころの識別子と、いまの上流の束の内容のハッシュを使って、ずれを見つけます。

導入が無くなっている、あるいはディレクトリでないもの（`orphaned`）と、安全でない・解決できない記録済みのパス（`invalid_install`）については、ネットワークへの問い合わせを飛ばします。ディレクトリが無い項目は `hermes skills uninstall <name>` で消せます。不正なパスの場合は、やり直す前に、動いているプロファイルの `skills/.hub/lock.json` を調べて直す必要があります。自動で消される項目はありません。

有効な導入は、これまでどおり、その出どころのアダプターにある同期の取得と転送のタイムアウトを使います。更新の確認ぜんたいに厳密な締め切りはありません。既存の導入について出どころへ届かない、あるいは遅いと、あとの項目が遅れることがあります。

自分でローカルを編集したスキル（ディスク上の中身が、導入したときに記録したハッシュと合わなくなったもの）は、`hermes skills update` から**飛ばされます**。変更が黙って上書きされることはありません。それでも上流の版に置き換えたいときは `--force` を渡します。

:::tip GitHub のレート制限
スキルのハブの操作は GitHub の API を使います。認証していない利用者は 1 時間あたり 60 リクエストの上限があります。導入や検索でレート制限のエラーが出たら、`.env` に `GITHUB_TOKEN` を設定して、上限を 1 時間 5,000 リクエストへ上げてください。そのときのエラーメッセージには、次に何をすればよいかの案内が入ります。
:::

### 独自のスキルのタップを公開する {#publishing-a-custom-skill-tap}

選りすぐったスキルの一式を、チームや組織、あるいは広く公開したいときは、**タップ**として公開できます。ほかの Hermes の利用者が `hermes skills tap add <owner/repo>` で足す、GitHub のリポジトリです。サーバーも、レジストリへの登録も、リリースの仕組みも要りません。`SKILL.md` のファイルが並んだディレクトリがあればよいのです。

#### リポジトリの並べ方 {#repo-layout}

タップは、こんな形に並べた GitHub のリポジトリなら何でも構いません（公開でも非公開でも。非公開には `GITHUB_TOKEN` が要ります）。

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

決まりごと:
- スキルはそれぞれ、タップのルートのパス（既定は `skills/`）の下の、自分のディレクトリに置きます。
- ディレクトリ名が、そのスキルの導入用の slug になります。
- スキルのディレクトリには、標準の [SKILL.md の frontmatter](#skillmd-format)（`name`、`description`、加えて任意で `metadata.hermes.tags`、`version`、`author`、`platforms`、`metadata.hermes.config`）を持つ `SKILL.md` が必要です。
- `references/`、`templates/`、`scripts/`、`assets/` といったサブディレクトリは、導入のときに `SKILL.md` と一緒に取ってこられます。
- ディレクトリ名が `.` か `_` で始まるスキルは無視されます。

Hermes は、タップのパスの下のサブディレクトリをすべて並べ、それぞれに `SKILL.md` があるかを見て、スキルを見つけます。

#### 最小のタップの例 {#minimal-tap-example}

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

これを GitHub へ push すれば、どの Hermes 利用者でも購読して入れられます。

```bash
hermes skills tap add my-org/hermes-skills
hermes skills search deploy
hermes skills install my-org/hermes-skills/deploy-runbook
```

#### 既定ではないパス {#non-default-paths}

スキルが `skills/` の下に無い場合（既存のプロジェクトへ `skills/` のサブツリーを足すときによくあります）、`~/.hermes/skills/.hub/taps.json` のタップの項目を書き換えます。

```json
{
  "taps": [
    {"repo": "my-org/platform-docs", "path": "internal/skills/"}
  ]
}
```

`hermes skills tap add` の CLI は、新しいタップの既定を `path: "skills/"` にします。別のパスが要るときは、このファイルを直接書き換えてください。`hermes skills tap list` は、タップごとの実際のパスを表示します。

#### タップを足さずに個々のスキルを直接入れる {#installing-individual-skills-directly-without-adding-a-tap}

リポジトリぜんたいをタップとして足さなくても、公開の GitHub リポジトリからスキルをひとつだけ入れられます。

```bash
hermes skills install owner/repo/skills/my-workflow
```

自分のレジストリを丸ごと購読してもらわずに、スキルをひとつだけ配りたいときに便利です。

#### タップの信頼の水準 {#trust-levels-for-taps}

新しいタップは、既定で `community` の信頼になります。そこから入れたスキルは標準のセキュリティ走査を通り、初回の導入では第三者への警告パネルが出ます。自分の組織や、広く信頼されている出どころにもっと高い信頼を与えたい場合は、そのリポジトリを `tools/skills_guard.py` の `TRUSTED_REPOS` へ足してください（Hermes 本体への PR が必要です）。

#### タップの管理 {#tap-management}

```bash
hermes skills tap list                                # show all configured taps
hermes skills tap add myorg/skills-repo               # add (default path: skills/)
hermes skills tap remove myorg/skills-repo            # remove
```

セッションの中からは:

```
/skills tap list
/skills tap add myorg/skills-repo
/skills tap remove myorg/skills-repo
```

タップは `~/.hermes/skills/.hub/taps.json` に保存されます（必要になったときに作られます）。

## 同梱スキルの更新（`hermes skills reset`） {#bundled-skill-updates-hermes-skills-reset}

Hermes は、リポジトリの中の `skills/` に同梱スキルの一式を持っています。インストールのときと、`hermes update` のたびに、同期の処理がそれらを `~/.hermes/skills/` へコピーし、`~/.hermes/skills/.bundled_manifest` に、スキル名と、同期したときの内容のハッシュ（**元のハッシュ**）を対応づけた台帳を記録します。

同期のたびに、Hermes はあなたのローカルの版のハッシュを計算し直し、元のハッシュと比べます。

- **変わっていない** → 上流の変更を取り込んで安全なので、新しい同梱の版をコピーし、新しい元のハッシュを記録します。
- **変わっている** → **利用者が変更したもの**として扱い、以後ずっと飛ばします。あなたの編集が踏み潰されることはありません。

スキルの中に生まれる実行時のキャッシュ（`__pycache__/`、`.pytest_cache/`、`.mypy_cache/`、`.ruff_cache/`、そして `.py` の隣に置かれる `.pyc`）はハッシュに含まれません。そのため、スキルの補助スクリプトを動かしても、それが「利用者が変更したもの」と印を付けられたり、`hermes skills list-modified` や `diff` から隠れたりすることはありません。

この守りはよくできていますが、ひとつ角が立っています。同梱スキルを編集したあとで、その変更をあきらめて同梱の版へ戻したくなり、`~/.hermes/hermes-agent/skills/` からコピー＆ペーストするだけで済ませたとします。すると台帳には、最後に同期がうまくいったときの*古い*元のハッシュが残ったままです。貼り直した中身（いまの同梱のハッシュ）はその古い元のハッシュと合わないので、同期はそれを「利用者が変更したもの」と見なし続けます。

`hermes skills reset` が、その逃げ道です。

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

同じコマンドは、チャットでもスラッシュコマンドとして働きます。

```text
/skills reset google-workspace
/skills reset google-workspace --restore
```

:::note プロファイル
プロファイルはそれぞれ、自分の `HERMES_HOME` の下に自分の `.bundled_manifest` を持ちます。そのため `hermes -p coder skills reset <name>` は、そのプロファイルにだけ効きます。
:::

### スラッシュコマンド（チャットの中） {#slash-commands-inside-chat}

同じコマンドはすべて `/skills` で使えます。

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

公式のオプションスキルは、これまでどおり `official/security/1password` や `official/migration/openclaw-migration` のような識別子を使います。
