---
title: "スキルの仕組み"
description: "必要なときだけ読み込む知識のドキュメント — 段階的な読み込み、エージェントによる管理、スキルハブ"
upstream_path: user-guide/features/skills.md
upstream_blob: b751f30487f1a24c6ba53a932021cf53df3a5596
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/skills
---

# スキルの仕組み {#skills-system}

スキルとは、エージェントが必要になったときだけ読み込める知識のドキュメントです。トークンの消費を抑えるために **段階的な読み込み** という形をとっていて、[agentskills.io](https://agentskills.io/specification) のオープンな仕様とも互換があります。

スキルはすべて **`~/.hermes/skills/`** に置かれます。ここが本来の置き場所であり、正本でもあります。新しく入れたときは、リポジトリから同梱のスキルがここへコピーされます。ハブから入れたスキルや、エージェントが自分で作ったスキルもここへ入ります。エージェントはどのスキルでも書き換えたり消したりできます。

Hermes に **外部のスキルディレクトリ** を見に行かせることもできます。ローカルのディレクトリと並べて読み込まれる別のフォルダのことです。下の [外部のスキルディレクトリ](#external-skill-directories) を見てください。

あわせてどうぞ:

- [同梱スキルの一覧](/hermes/docs/reference/skills-catalog/)
- [公式の追加スキル一覧](/hermes/docs/reference/optional-skills-catalog/)

## まっさらな状態から使い始める {#starting-with-a-blank-slate}

既定では、どのプロファイルにも同梱スキルの一式が最初から入り、`hermes update` のたびに新しく同梱されたスキルが足されていきます。**同梱スキルを一切持たない** プロファイルにしたい、しかも更新してもその状態を保ちたい、という場合は 2 つのやり方があります。

**入れるとき**（既定の `~/.hermes` プロファイルが対象です）:

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash -s -- --no-skills
```

**プロファイルを作るとき**（名前付きのプロファイル）:

```bash
hermes profile create research --no-skills
```

**すでに入れてあるプロファイル**（既定でも名前付きでも）なら、動かしたまま切り替えられます:

```bash
hermes skills opt-out            # stop future seeding — nothing on disk is touched
hermes skills opt-out --remove   # also delete UNMODIFIED bundled skills (confirms first)
hermes skills opt-in --sync      # undo: remove the marker and re-seed now
```

どのやり方でも、プロファイルのディレクトリに `.no-bundled-skills` という目印のファイルが書かれます。この目印がある間は、インストーラーも `hermes update` もスキルの同期も、そのプロファイルへの同梱スキルの配置をすべて飛ばします。目印を消すか `hermes skills opt-in` を実行すれば、また入るようになります。

:::note そのままで安全です
`hermes skills opt-out` が止めるのは *これから先* の配置だけで、すでにディスクにあるものには一切手をつけません。任意の `--remove` を付けた場合でも、消えるのは手を加えていない同梱スキル（Hermes が入れたものとバイト単位で同じもの）**だけ** です。自分で編集したスキル、ハブから入れたスキル、自分で書いたスキルは必ず残ります。
:::

## スキルを使う {#using-skills}

入っているスキルは、どれも自動でスラッシュコマンドとして使えます:

```bash
# In the CLI or any messaging platform:
/gif-search funny cats
/axolotl help me fine-tune Llama 3 on my dataset
/github-pr-workflow create a PR for the auth refactor
/songsee analyze the frequency spread of this mix

# Just the skill name loads it and lets the agent ask what you need:
/excalidraw
```

### 1 つのコマンドで複数のスキルを重ねる {#stacking-multiple-skills-in-one-command}

メッセージの先頭にスラッシュコマンドを並べれば、1 通で複数のスキルを呼び出せます。
先頭に並んだ `/skill` の形をしたもの（最大 5 つ）がすべて読み込まれ、残りが
指示の文になります:

```bash
/github-pr-workflow /test-driven-development fix issue #123 and open a PR
```

入っているスキルではない語が出てきた時点で読み取りが止まるので、たまたま `/` で
始まる引数（ファイルのパスなど）が飲み込まれることはありません:

```bash
/ocr-and-documents /tmp/scan.pdf extract the tables   # loads one skill; /tmp/scan.pdf is the argument
```

いつも同じ組み合わせで使うなら、[スキルのバンドル](#skill-bundles) のほうが向いています。
短いコマンド 1 つで同じことができます。

（プランモードも同じ形で呼び出せますが、いまは組み込みのコマンドになっています。`/plan [request]` と書くと、Hermes は必要に応じて状況を調べたうえで、作業をその場で実行する代わりに実装の計画を markdown で書き、いま使っているワークスペースやバックエンドの作業ディレクトリからの相対で `.hermes/plans/` の下に保存します。）

ふつうの会話の中でスキルに触れることもできます:

```bash
hermes chat --toolsets skills -q "What skills do you have?"
hermes chat --toolsets skills -q "Show me the axolotl skill"
```

## 元になる資料からスキルを学ばせる（`/learn`） {#learning-a-skill-from-sources-learn}

`/learn` は、すでに知っていることや手元に積み上がった資料を、`SKILL.md` を
手書きせずに再利用できるスキルへ変える近道です。対象は何でもかまいません。
*言葉で説明できるもの* を指し示せば、エージェントが手持ちの道具で材料を集め、
[この場所の書き方の決まり](#skillmd-format)（説明は 60 文字以内、決まった節の
並び、Hermes の道具を前提にした書き方、勝手なコマンドを作らないこと）に沿った
スキルを書き上げます。

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

### 大きな資料は知識ベース型のスキルになる {#large-sources-become-knowledge-base-skills}

元になるものが本や論文の束、仕様書、大きなドキュメントのフォルダだった場合、
エージェントはそれを 1 つのファイルに詰め込んだり、抜け落ちの多い要約にまとめ
たりはしません。代わりに **広がりのある知識ベース型のスキル** を書きます。
中心になる考え方と目次を持った軽い `SKILL.md` があり、章やテーマごとに
まとめ直したファイルが `references/` の下に 1 つずつ置かれます（元の資料に
値するなら用語集や早見表も付きます）。参照ファイルは、実際に必要になる質問が
来るまで何の負担にもなりません。エージェントが `skill_view` でその場で読み込む
ので、かかるコストは元の資料の大きさではなく答えの大きさに比例します。同じ
テーマで新しい材料を足して `/learn` をもう一度実行すると、別のスキルが増える
のではなく既存のスキルに取り込まれます。

まとめ直すときに作られるのは構造そのもの（枠組み、定義、判断の基準、やっては
いけない型）で、元の文章をそのまま写すことはありません。

材料集めをするのが動いているエージェント自身なので、`/learn` は CLI でも、
メッセージのゲートウェイでも、TUI でも、ダッシュボードでも同じように動きます。
取り込み専用のエンジンが別にあるわけではないため、どのターミナルのバックエンド
（ローカル、Docker、リモート）でも同じです。**ダッシュボード** では、スキルの
ページに **Learn a skill** ボタンがあり、押すとディレクトリの入力欄、URL の
入力欄、自由に書けるテキスト欄が並んだパネルが開きます。ここで `/learn` の
リクエストが組み立てられ、チャットで実行されます。

モデル側の道具は一切増えません。`/learn` は決まりに沿ったプロンプトを組み立てて、
ふつうの 1 ターンとしてエージェントに渡すだけです。結果は `skill_manage` ツール
で保存されるので、[書き込みの承認](#gating-agent-skill-writes-skillswrite_approval)
を有効にしていればそれが効きます。

## 段階的な読み込み {#progressive-disclosure}

スキルは、トークンを無駄にしない読み込み方をします:

```
Level 0: skills_list()           → [{name, description, category}, ...]   (~3k tokens)
Level 1: skill_view(name)        → Full content + metadata       (varies)
Level 2: skill_view(name, path)  → Specific reference file       (varies)
```

エージェントは、本当に必要になったときだけスキルの中身を丸ごと読み込みます。

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

### プラットフォームを限定したスキル {#platform-specific-skills}

`platforms` の項目を使うと、スキルが動く OS を限定できます:

| 値 | 対象 |
|-------|---------|
| `macos` | macOS（Darwin） |
| `linux` | Linux |
| `windows` | Windows |

```yaml
platforms: [macos]            # macOS only (e.g., iMessage, Apple Reminders, FindMy)
platforms: [macos, linux]     # macOS and Linux
```

これを書いておくと、合わない OS ではシステムプロンプトからも `skills_list()` からもスラッシュコマンドからも自動で隠れます。書かなければ、どの OS でも読み込まれます。

## スキルの出力とメディアの配信 {#skill-output-and-media-delivery}

スキルの応答（に限らずエージェントの応答）の中に、メディアファイルの絶対パスがそのまま含まれていた場合 — たとえば `/home/user/screenshots/diagram.png` のような形です — ゲートウェイがそれを見つけて表示される文からは取り除き、そのファイル自体をチャットへ届けます（Telegram なら写真、Discord なら添付ファイル、といった具合です）。生のパスがメッセージに残ることはありません。

音声については、`[[audio_as_voice]]` という指示を書くと、対応しているプラットフォーム（Telegram、WhatsApp）でボイスメッセージの吹き出しとして送られます。

### ファイル添付での配信を強制する: `[[as_document]]` {#forcing-document-style-delivery-asdocument}

その場でプレビューするのとは **逆** のことをしたい場合もあります。画像の吹き出しとして再圧縮されるのではなく、そのままダウンロードできる添付ファイルとして届けたい、というときです。よくあるのが高解像度のスクリーンショットや図で、Telegram の `sendPhoto` は 1280 px・200 KB ほどまで圧縮してしまい、読めなくなります。1〜2 MB の PNG を `sendDocument` で送れば、元のデータのまま届きます。

応答（またはその中のどこか、ふつうは最後の行）に `[[as_document]]` という文字列がそのまま入っていると、その応答から取り出されたメディアのパスはすべて、画像の吹き出しではなくファイルの添付として届きます:

```
Here is your rendered chart:

/home/user/.hermes/cache/chart-q4-2025.png

[[as_document]]
```

この指示は届ける前に取り除かれるので、受け取る側の目に触れることはありません。効き方は応答ごとに全部か全くなしかで、これは意図した設計です。`[[as_document]]` を 1 回書けば、同じ応答の中の画像のパスはすべてファイルとして届きます。`[[audio_as_voice]]` と同じ考え方です。

スキルからこれを使うのは、たとえばこんなときです:

- 受け取る側がファイルとして必要とするスクリーンショットや図を作るとき（別のツールで編集する、保存しておく、そのままの形で渡す、といった用途です）。
- 既定の圧縮されたプレビューでは細部が潰れてしまうとき（小さな文字、1 ドットまで正確な図、色が重要な描画など）。

ファイル添付の仕組みを別に持たないプラットフォーム（SMS など）では、そこにある添付の手段にそのまま落ちます。

### 条件付きの有効化（フォールバックのスキル） {#conditional-activation-fallback-skills}

スキルは、いまのセッションで使える道具に応じて自分を出したり隠したりできます。いちばん役に立つのは **フォールバックのスキル** です。有料の道具が使えないときにだけ現れる、無料またはローカルの代替手段のことです。

```yaml
metadata:
  hermes:
    fallback_for_toolsets: [web]      # Show ONLY when these toolsets are unavailable
    requires_toolsets: [terminal]     # Show ONLY when these toolsets are available
    fallback_for_tools: [web_search]  # Show ONLY when these specific tools are unavailable
    requires_tools: [terminal]        # Show ONLY when these specific tools are available
```

| 項目 | ふるまい |
|-------|----------|
| `fallback_for_toolsets` | 並べたツールセットが使えるとき、スキルは **隠れます**。使えないときに現れます。 |
| `fallback_for_tools` | 同じですが、ツールセットではなく個々の道具を見ます。 |
| `requires_toolsets` | 並べたツールセットが使えないとき、スキルは **隠れます**。使えるときに現れます。 |
| `requires_tools` | 同じですが、個々の道具を見ます。 |

**例:** 同梱の `duckduckgo-search` スキルは `fallback_for_toolsets: [web]` を使っています。`FIRECRAWL_API_KEY` を設定していれば web のツールセットが使えるので、エージェントは `web_search` を使い、DuckDuckGo のスキルは隠れたままです。API キーがなければ web のツールセットは使えないので、DuckDuckGo のスキルが代わりとして自動的に現れます。

条件の項目を何も書かないスキルは、これまでどおり常に表示されます。

## 読み込み時の安全な設定 {#secure-setup-on-load}

スキルは、必要な環境変数を宣言しても一覧から消えることはありません:

```yaml
required_environment_variables:
  - name: TENOR_API_KEY
    prompt: Tenor API key
    help: Get a key from https://developers.google.com/tenor
    required_for: full functionality
```

値が足りないことがわかったとき、Hermes はそのスキルが実際に読み込まれた時点で、ローカルの CLI に限って安全に入力を求めます。設定を飛ばして、そのままスキルを使い続けることもできます。メッセージ経由の画面で秘密の値を聞くことは決してなく、代わりにローカルで `hermes setup` を使うか `~/.hermes/.env` に書くよう案内します。

いったん設定すると、宣言された環境変数は `execute_code` と `terminal` のサンドボックスへ **自動で引き渡されます**。スキルのスクリプトはそのまま `$TENOR_API_KEY` を使えます。スキル以外の環境変数には `terminal.env_passthrough` の設定を使ってください。詳しくは [環境変数の引き渡し](/hermes/docs/user-guide/security/#environment-variable-passthrough) を見てください。

### スキルの設定項目 {#skill-config-settings}

スキルは、秘密ではない設定項目（パスや好みなど）を `config.yaml` に置く形で宣言することもできます:

```yaml
metadata:
  hermes:
    config:
      - key: myplugin.path
        description: Path to the plugin data directory
        default: "~/myplugin-data"
        prompt: Plugin data directory path
```

設定は config.yaml の `skills.config` の下に保存されます。`hermes config migrate` は未設定の項目を尋ね、`hermes config show` は設定内容を表示します。スキルが読み込まれると、解決済みの設定値がそのまま文脈に差し込まれるので、エージェントは設定された値をひとりでに把握できます。

詳しくは [スキルの設定](/hermes/docs/user-guide/configuration/#skill-settings) と [スキルを作る — 設定項目](/hermes/docs/developer-guide/creating-skills/#config-settings-configyaml) を見てください。

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

URL や GitHub から入れた第三者のスキルには、`SKILL.md` と、そこから実際に
参照されているローカルのファイルが `references/`、`templates/`、`scripts/`、
`assets/`、`examples/` の下に含まれます。参照されていないリポジトリのファイルは
コピーされません。Hermes は隔離した一式をすべてスキャンし、取得元の URL、内容の
ハッシュ、スキャナーのバージョン、見つかった事柄、日時、その場で調べたのか
キャッシュを使ったのかを
`skills/.hub/lock.json` に記録します。

### 参考情報としての SkillEvaluator スキャン {#advisory-skillevaluator-scan}

上の導入ポリシーを実際に効かせている内蔵のセキュリティスキャナーとは別に、
Hermes はハブからの導入のたびに [NVIDIA SkillEvaluator](https://github.com/NVIDIA/SkillEvaluator)
の Tier 1 の検査を second opinion として走らせられます。Tier 1 は結果が
一定でキーも要りません。個人情報の検出（漏れたメールアドレス、個人のパス、
接続文字列）、Unicode を使った隠し文字の検出、スクリプトの静的チェック、
ライセンスの適合性、そして
[NVIDIA SkillSpector](https://github.com/NVIDIA/SkillSpector) によるセキュリティの静的スキャンです。

このスキャンは **あくまで参考** です。見つかった事柄はファイル名と行番号つきで
導入の確認の前に表示され、導入はそのまま続きます。本物の認証情報らしきもの
（秘密鍵、クラウドのアクセスキー、トークン、認証情報を含む接続文字列）は
赤で強調されるので、決める前にその行を確かめられます。個人情報の類は
参考情報の扱いです。元のスキャナーには誤検出しやすいものが知られていて
（`git@github.com` という SSH の書き方、ドキュメントの例のメールアドレスなど）、
これらが何かを止めることはありません。

有効にするには、任意のスキャナーの実行ファイルを入れてください（2 つめは
`security` の検査に使われ、これがないとその検査は「実行されませんでした」と出るだけです）:

```bash
uv tool install --python 3.13 \
  "skillevaluator @ git+https://github.com/NVIDIA/SkillEvaluator.git@v0.1.0"
uv tool install "git+https://github.com/NVIDIA/SkillSpector.git@v2.9.5"
```

実行ファイルが PATH になければ、スキャンは黙って飛ばされます。完全に切るには、
こう書きます:

```yaml
skills:
  tier1_advisory: false
```

ダッシュボードのハブを見るスキャンのボタンも、内蔵スキャナーの判定とあわせて
同じ参考情報を応答（`tier1` の項目）で返します。

## 外部のスキルディレクトリ {#external-skill-directories}

Hermes の外でスキルを管理している場合 — たとえば、いくつもの AI ツールで共用している `~/.agents/skills/` のようなディレクトリがある場合 — そこも読み込むよう Hermes に伝えられます。

`~/.hermes/config.yaml` の `skills` の節に `external_dirs` を足します:

```yaml
skills:
  external_dirs:
    - ~/.agents/skills
    - /home/shared/team-skills
    - ${SKILLS_REPO}/skills
```

パスには `~` の展開と `${VAR}` による環境変数の置き換えが使えます。

### 動きかた {#how-it-works}

- **作るのはローカル、書き換えはその場で**: エージェントが新しく作ったスキルは `~/.hermes/skills/`（設定していれば `skills.create_dir` — 下で説明します）に書かれます。すでにあるスキルは見つかった場所で書き換えられ、これは `external_dirs` の下にあるスキルも同じです（エージェントが `skill_manage` の `patch`、`edit`、`write_file`、`remove_file`、`delete` といった操作を使ったとき）。
- **外部ディレクトリは書き込みを止める境界ではありません**: 外部のスキルディレクトリが Hermes のプロセスから書き込める場所にあるなら、エージェントによるスキルの更新はそのディレクトリのファイルを変えられます。共用の外部スキルを読み取り専用に保ちたいなら、ファイルシステムの権限を使うか、プロファイルやツールセットを分けて設定してください。
- **ローカルが優先されます**: 同じ名前のスキルがローカルのディレクトリと外部のディレクトリの両方にある場合、ローカルのものが勝ちます。
- **扱いは完全に同じです**: 外部のスキルも、システムプロンプトの一覧、`skills_list`、`skill_view`、そして `/skill-name` のスラッシュコマンドに、ローカルのスキルとまったく同じように現れます。
- **存在しないパスは黙って飛ばされます**: 設定したディレクトリがなくても、Hermes はエラーを出さずに無視します。端末によってはない共用ディレクトリを、任意で足しておきたいときに便利です。

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

この 4 つのスキルはすべて一覧に出てきます。`my-custom-workflow` という名前のスキルをローカルに新しく作れば、そちらが外部のものを覆い隠します。

## スキル作成先を変える（`skills.create_dir`） {#redirecting-skill-creation-skillscreatedir}

既定では、エージェントが新しく作るスキルはプロファイル内の `~/.hermes/skills/` に書かれます。エージェントが作ったスキルを別の場所に置きたい場合 — 共用の「brain」ディレクトリ、git で管理しているリポジトリ、複数の端末で共有するスキルの置き場など — は、`skills` の節で `create_dir` を設定します:

```yaml
skills:
  create_dir: /opt/brain/skills
```

これで変わること:

- **`skill_manage` の create はそこに書き込みます。** 新しいスキル（カテゴリのサブディレクトリを含みます）は、ローカルのスキルディレクトリの代わりに `create_dir` の下に作られます。ディレクトリがまだなければ、最初の書き込み時に作られます。
- **エージェントへの指示は設定に従います。** スキル作成先のパスを示すエージェント向けの指示 — `skill_manage` ツールの説明や関連するプロンプトの文言 — はすべて、設定したディレクトリをその場で反映して表示されます。エージェントにはそこへスキルを作るよう伝わり、システムプロンプトの上書きやファイルシステムの小細工は要りません。
- **ディレクトリは完全に統合されます。** `create_dir` の下のスキルはローカルのディレクトリと並んでスキャンされ、スキルの一覧、`skills_list`、`skill_view`、スラッシュコマンドに現れ、ほかのローカルのスキルと同じように直したり消したりできます。
- **それ以外はローカルのままです。** すでにあるスキルは、どこにあってもその場で書き換えられます。同梱スキルの同期、ハブ、キュレーターは引き続きプロファイル内のディレクトリで動きます。

パスには `~` の展開と `${VAR}` の置き換えが使えます。相対パスは Hermes のホームディレクトリを起点に解決されます。`create_dir` をローカルのスキルディレクトリに設定するのは、何も設定しないのと同じです。

## プロジェクト内のスキル {#project-local-skills}

リポジトリは自分専用のスキルを持てます。そのプロジェクトの中で始めたセッションでだけ効くもので、他のエージェント環境がリポジトリごとの設定に使っているのと同じ考え方です。git のチェックアウトの中で Hermes を起動すると、次の場所からスキルを探します:

```text
<project-root>/.hermes/skills/    # Hermes-native location
<project-root>/.agents/skills/    # cross-tool convention (shared with other agent CLIs)
```

プロジェクトのルートとは、`.git` を持つ一番近い親ディレクトリのことです（worktree や submodule も対象になります）。

### プロジェクトを信頼する {#trusting-a-project}

スキルはエージェントがそのとおりに動く手順書なので、Hermes はどこかから clone してきたリポジトリのスキルを勝手に読み込むことは **しません**。プロジェクトのスキルを持つリポジトリで初めて Hermes を動かすと、起動時の表示にこんな案内が出ます:

```text
◆ 3 project skill(s) found in /home/you/myproject but not loaded — run `hermes skills trust` to enable them.
```

そのリポジトリを一度だけ信頼します（中に入って実行するか、パスを渡します）:

```bash
hermes skills trust             # trust the current repo
hermes skills trust ~/myproject # or explicitly
hermes skills untrust           # revoke
```

信頼したルートは `~/.hermes/config.yaml` の `skills.trusted_project_dirs` に保存されます。`skills.project_discovery: false` にすれば、この仕組みそのものを切れます（探索も案内も出なくなります）。

### 優先順位 {#precedence}

プロジェクトのスキルは **いちばん強い段** です。`project → local (~/.hermes/skills/) → external_dirs` の順になります。`deploy` という名前のプロジェクトスキルは、そのリポジトリの中のセッションでは同名のプロファイルのスキルや同梱スキルを上書きします。これは狙いどおりで、リポジトリに置いたスキルは自分の陣地では必ず勝ち、しかも全体のプロファイルには手を触れません。プロジェクトのスキルはエージェントの一覧で `[project]` と印が付くので、出どころが見てわかります。

外部のディレクトリと同じく、プロジェクトのスキルのディレクトリはリポジトリのものとして扱われます。自動でスキルを手入れする仕組み（キュレーター）がそこを書き換えることはなく、エージェントが新しく作るスキルは必ず `~/.hermes/skills/` へ入ります。

### スキャン時の隔離 {#scan-time-quarantine}

信頼するかどうかはリポジトリ単位で決めますが、リポジトリの中身は `git pull` のたびに変わります。その隙間を埋めるため、プロジェクトのスキルはすべて、一覧に載る前にスキルハブの導入と同じセキュリティスキャンにかけられます。判定が **危険** だったスキル（プロンプトへの仕込み、認証情報を持ち出すコマンド、隠し文字を使った細工など）は隔離されます。一覧にも `skills_list` にもスラッシュコマンドにも出てこず、名前を指定して読み込もうとしても理由を添えて断られます。スキャンの結果は内容のハッシュをキーに `~/.hermes/cache/project_skill_scans/` に保存され（リポジトリの中には決して置きません）、スキルの中身が変われば自動でやり直されます。

### 対話しない経路（cron、API、ACP） {#non-interactive-surfaces-cron-api-acp}

cron のジョブなど、対話しない経路は、対話のときに決めた信頼をそのまま引き継ぎます。自分から尋ねることも、勝手に信頼することもありません。プロジェクトのルートはその経路の作業ディレクトリ（cron のジョブなら `workdir`）から決まり、これはターミナルの道具が使うのと同じ仕組みです。以前に信頼したリポジトリの中を `workdir` にした cron のジョブは、そのリポジトリのプロジェクトスキルを読み込みます。信頼していない、あるいはまだ決めていないリポジトリのジョブは、何も読み込みません。

## スキルのバンドル {#skill-bundles}

スキルのバンドルとは、複数のスキルを 1 つのスラッシュコマンドにまとめる小さな YAML のファイルです。`/<bundle-name>` を実行すると、そのバンドルに並べたスキルが一度にすべて読み込まれます。ある種の作業でいつも同じ組み合わせが効く、というときに便利です。

### 手早い例 {#quick-example}

```bash
# Create a bundle for backend feature work
hermes bundles create backend-dev \
  --skill github-code-review \
  --skill test-driven-development \
  --skill github-pr-workflow \
  -d "Backend feature work — review, test, PR workflow"
```

あとは CLI でも、どのゲートウェイのプラットフォームでも:

```
/backend-dev refactor the auth middleware
```

エージェントは 3 つのスキルを 1 通のユーザーメッセージにまとめて受け取り、スラッシュコマンドのあとに書いた文はそのまま指示として添えられます。

### YAML の書式 {#yaml-schema}

バンドルは **`~/.hermes/skill-bundles/<slug>.yaml`** に置き、こんな形をしています:

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

項目は次のとおりです:
- `name`（任意 — 省略するとファイル名がそのまま使われます）— バンドルの表示名です。スラッシュコマンド用にハイフンつなぎへ整えられます（`Backend Dev` → `/backend-dev`）。
- `description`（任意）— `/bundles` と `hermes bundles list` に出る短い説明です。
- `skills`（必須、空にできない一覧）— スキルの名前か、スキルのディレクトリからの相対パスです。`/<skill-name>` に渡すのと同じ書き方をします。
- `instruction`（任意）— 読み込んだスキルの中身の前に足される、追加の案内です。「この組み合わせをいつもこう使う」という決まりを書き残すのに向いています。

### バンドルを管理する {#managing-bundles}

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

チャットのセッションの中では、`/bundles` で入っているバンドルとその中身のスキルが一覧できます。

### ふるまい {#behavior}

- **名前がぶつかったらバンドルが優先されます**。`research` という名前のバンドルを作り、同時に `research` というスキルも持っている場合、`/research` はバンドルを呼びます。これは意図した動きです。その名前を付けた時点で、そちらを選んだことになります。
- **ないスキルは飛ばされるだけで、止まりません。** バンドルに `skill-foo` と書いてあってそれを入れていなくても、バンドルは見つかったスキルを読み込み、飛ばしたものをエージェントに書き添えて伝えます。
- **バンドルはどの経路でも動きます** — 対話式の CLI、TUI、ダッシュボードのチャット、そしてすべてのゲートウェイのプラットフォーム（Telegram、Discord、Slack、…）。個々のスキルのコマンドと同じ場所で振り分けているからです。
- **バンドルはプロンプトのキャッシュを壊しません。** `/<skill-name>` と同じように、呼ばれた時点で新しいユーザーメッセージを作るだけで、システムプロンプトには手を触れません。

### 個別に呼ぶよりバンドルが向く場面 {#when-bundles-beat-installing-each-skill-manually}

こんなときにバンドルを使ってください:
- 決まった作業でいつも同じスキルを組み合わせている（`/backend-dev`、`/release-prep`、`/incident-response`）。
- `/skill` を何度も打ち込むより、頭の中で扱いやすい形にしたい。
- バンドルの YAML を共用の dotfiles のリポジトリに入れて `~/.hermes/skill-bundles/` へシンボリックリンクを張り、チーム共通の「作業の型」として配りたい。

バンドルはあくまで YAML の別名で、スキルそのものを入れてくれるわけではありません。スキルは先に手元にある必要があります（`~/.hermes/skills/` か、外部のスキルディレクトリの中）。なければ、バンドルを呼んでもその分が飛ばされるだけです。

## エージェントが自分で管理するスキル（skill_manage ツール） {#agent-managed-skills-skillmanage-tool}

エージェントは `skill_manage` ツールを使って、自分のスキルを作り、直し、消せます。これはエージェントにとっての **手順の記憶** です。ひと筋縄ではいかない進め方を見つけたら、その方法をスキルとして残し、次回また使います。

スキルと記憶は、自分で良くなっていく流れの中で組みになって働きます。記憶はいつも文脈に置いておきたい小さくて変わらない事実を持ち、スキルは関係があるときだけ読み込みたい長めの手順を持ちます。裏で走る振り返りはセッションのあとでスキルの変更を提案したり下書きしたりできますが、下に書いた書き込みの承認を使えば、それが実際に反映される前に人が目を通すようにできます。

### エージェントがスキルを作るとき {#when-the-agent-creates-skills}

システムプロンプトは、ひと筋縄ではいかない進め方を `skill_manage` で残して次に使えるようにするよう、エージェントに求めています。実際には次のような場面です:

- 何度も使えそうな、いくつもの手順を踏むやり方を組み立てたとき
- エラーや行き止まりにぶつかって、通る道を見つけたとき
- こちらがやり方を正したとき

### 操作の一覧 {#actions}

| 操作 | 使いどころ | 主な引数 |
|--------|---------|------------|
| `create` | スキルをゼロから作る | `name`、`content`（SKILL.md 全文）、任意で `category` |
| `patch` | 狙いを定めた直し（おすすめ） | `name`、`old_string`、`new_string` |
| `edit` | 構成から書き直す大きな変更 | `name`、`content`（SKILL.md 全文の置き換え） |
| `delete` | スキルを丸ごと消す | `name` |
| `write_file` | 付属のファイルを足す・直す | `name`、`file_path`、`file_content` |
| `remove_file` | 付属のファイルを消す | `name`、`file_path` |

:::tip
直すときは `patch` が向いています。変わった部分だけがツールの呼び出しに現れるので、`edit` よりトークンを使いません。
:::

### エージェントのスキル書き込みに承認を挟む（`skills.write_approval`） {#gating-agent-skill-writes-skillswriteapproval}

既定では、エージェントは自由にスキルを書き込みます。ターンのあとに走る
[裏の自己改善の振り返り](/hermes/docs/user-guide/features/memory/#controlling-memory-writes-write_approval)
からの書き込みも含みます。スキルの書き込みを毎回自分で承認したいなら
（学んだ内容を取り違えがちな小さいモデルを使っている、安全性の求められる環境、
あるいは単に自己改善の流れに目を通しておきたい場合）、書き込みの承認を入にします:

```yaml
skills:
  write_approval: false     # false = write freely (default) | true = require approval
```

`write_approval: true` のとき、`skill_manage` の書き込み（create / edit /
patch / delete / write_file / remove_file）は反映されずに **保留** されます。
SKILL.md はその場で読み切るには大きすぎるので、前面のターンから来た書き込みでも
裏の振り返りから来た書き込みでも、等しく保留になります。
保留された書き込みは再起動しても `~/.hermes/pending/skills/` の下に残り、
危険なコマンドのときと同じ、見慣れた承認・却下の流れで確かめられます:

```
/skills pending             # list staged skill writes + a one-line gist each
/skills diff <id>           # full unified diff (best viewed in CLI or dashboard)
/skills approve <id>        # apply it (or 'all')
/skills reject <id>         # drop it (or 'all')
/skills approval on         # turn the gate on (or 'off') and persist it
```

この確認の画面は、対話式の CLI でもメッセージのプラットフォームでも使えます
（チャットの吹き出しに収めるため差分は途中で切られます。全文は CLI か保留中の
JSON ファイルで読んでください）。記憶の書き込みにも `memory.write_approval`
という同じ仕組みがあります。[記憶の書き込みを制御する](/hermes/docs/user-guide/features/memory/#controlling-memory-writes-write_approval) を見てください。

> これとは別の `skills.guard_agent_created` という設定は中身を調べるスキャナー
> （危険なパターンを見つける仕組み）であって、承認の関門ではありません。2 つは
> それぞれ独立しています。[エージェントが作ったスキルの書き込みを見張る](/hermes/docs/user-guide/configuration/#guard-on-agent-created-skill-writes) を見てください。

## スキルハブ {#skills-hub}

オンラインの登録先、`skills.sh`、well-known のスキル配信先、そして公式の追加スキルから、スキルを探し、検索し、導入し、管理できます。

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

### 対応している配布元 {#supported-hub-sources}

| 配布元 | 例 | 補足 |
|--------|---------|-------|
| `official` | `official/security/1password` | Hermes に同梱されている、任意で入れるスキルです。 |
| `skills-sh` | `skills-sh/vercel-labs/agent-skills/vercel-react-best-practices` | `hermes skills search <query> --source skills-sh` で検索できます。skills.sh 側の slug がリポジトリのフォルダ名と違う場合も、Hermes が別名として解決します。 |
| `well-known` | `well-known:https://mintlify.com/docs/.well-known/skills/mintlify` | サイトの `/.well-known/skills/index.json` から直接配られているスキルです。サイトやドキュメントの URL で検索します。 |
| `url` | `https://sharethis.chat/SKILL.md` | `SKILL.md` とそこから明示的に参照されている付属ファイルへの、直接の HTTP(S) URL です。名前の決め方は frontmatter → URL の slug → 対話での入力 → `--name` の指定、の順です。 |
| `github` | `openai/skills/k8s` | GitHub のリポジトリやパスからの直接の導入と、独自の tap です。 |
| `clawhub`、`lobehub`、`browse-sh` | 配布元ごとの識別子 | コミュニティやマーケットプレイスとの連携です。 |

### 連携しているハブと登録先 {#integrated-hubs-and-registries}

Hermes はいま、次のスキルの生態系や見つけ方と連携しています:

#### 1. 公式の追加スキル（`official`） {#1-official-optional-skills-official}

Hermes のリポジトリそのもので手入れされていて、最初から信頼された状態で入ります。

- 一覧: [公式の追加スキル一覧](/hermes/docs/reference/optional-skills-catalog/)
- リポジトリ内の場所: `optional-skills/`
- 例:

```bash
hermes skills browse --source official
hermes skills install official/security/1password
```

#### 2. skills.sh（`skills-sh`） {#2-skillssh-skills-sh}

Vercel が公開しているスキルのディレクトリです。Hermes はここを直接検索し、スキルの詳細ページを覗き、別名の slug を解決し、元のリポジトリから導入できます。

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

`/.well-known/skills/index.json` を公開しているサイトから、URL で見つける方法です。中央に集まったハブが 1 つあるわけではなく、Web 上の取り決めです。

- 実際に動いている例: [Mintlify のドキュメントのスキル一覧](https://mintlify.com/docs/.well-known/skills/index.json)
- 実装の見本となるサーバー: [vercel-labs/skills-handler](https://github.com/vercel-labs/skills-handler)
- 例:

```bash
hermes skills search https://mintlify.com/docs --source well-known
hermes skills inspect well-known:https://mintlify.com/docs/.well-known/skills/mintlify
hermes skills install well-known:https://mintlify.com/docs/.well-known/skills/mintlify
```

#### 4. GitHub から直接（`github`） {#4-direct-github-skills-github}

Hermes は GitHub のリポジトリや、GitHub をもとにした tap から直接導入できます。リポジトリとパスがすでにわかっているときや、自分の配布元を足したいときに便利です。

最初から見られる既定の tap:
- [openai/skills](https://github.com/openai/skills)
- [anthropics/skills](https://github.com/anthropics/skills)
- [huggingface/skills](https://github.com/huggingface/skills)
- [NVIDIA/skills](https://github.com/NVIDIA/skills) — NVIDIA が検証したスキルです（署名付きの `skill.oms.sig` と、取り扱いを示す `skill-card.md` が付きます）
- [garrytan/gstack](https://github.com/garrytan/gstack)

- 例:

```bash
hermes skills install openai/skills/k8s
hermes skills tap add myorg/skills-repo
```

**カテゴリのまとめ方（`skills.sh.json`）。** GitHub の tap は、リポジトリの
直下に [skills.sh の書式](https://skills.sh/schemas/skills.sh.schema.json)
に沿った `skills.sh.json` を置けます。その中の
`groupings`（それぞれ `title` とスキル名の並びを持ちます）が一覧を作るときに
読まれ、
[スキルハブ](https://hermes-agent.nousresearch.com/docs) のページに出る
カテゴリの名前になります。タグからの推測ではなくなる、ということです。これは
どの tap にも共通で、このファイルを置けば正しく分類されます。Hermes 側に手を
入れる必要はありません。

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

コミュニティの配布元として連携している、第三者のスキルのマーケットプレイスです。

- サイト: [clawhub.ai](https://clawhub.ai/)
- Hermes での配布元 id: `clawhub`

#### 6. LobeHub（`lobehub`） {#6-lobehub-lobehub}

Hermes は LobeHub が公開している一覧を検索し、そこにあるエージェントの項目を Hermes に入れられるスキルへ変換できます。

- サイト: [LobeHub](https://lobehub.com/)
- 公開エージェントの一覧: [chat-agents.lobehub.com](https://chat-agents.lobehub.com/)
- 元のリポジトリ: [lobehub/lobe-chat-agents](https://github.com/lobehub/lobe-chat-agents)
- Hermes での配布元 id: `lobehub`

#### 7. browse.sh（`browse-sh`） {#7-browsesh-browse-sh}

Hermes は [browse.sh](https://browse.sh) と連携しています。Browserbase が集めた、サイトごとのブラウザ操作を書いた 200 以上の SKILL.md の一覧です（Airbnb、Amazon、arXiv、12306.cn、Etsy、Xero、その他たくさん）。それぞれのスキルが 1 つのサイトを最初から最後まで動かす方法を書いていて、Hermes のブラウザの道具や、すでに入れてあるブラウザ操作のスキルと組み合わせて使えます。

- サイト: [browse.sh](https://browse.sh/)
- 一覧の API: `https://browse.sh/api/skills`
- Hermes での配布元 id: `browse-sh`
- 信頼レベル: `community`

```bash
hermes skills search airbnb --source browse-sh
hermes skills inspect browse-sh/airbnb.com/search-listings-ddgioa
hermes skills install browse-sh/airbnb.com/search-listings-ddgioa
```

識別子は `browse-sh/<hostname>/<task-id>` という形で、browse.sh の一覧が出している slug と同じです。中身は一覧の GitHub の `sourceUrl` ではなく、スキルごとの詳細の配信先（`/api/skills/<slug>` → `skillMdUrl`）から取り出されます。

#### 8. URL から直接（`url`） {#8-direct-url-url}

`SKILL.md` を HTTP(S) の URL から直接入れられます。作者が自分のサイトでスキルを配っているときに便利です（ハブに載っていない、GitHub のパスを打ち込む必要もない、という場合です）。Hermes は `references/`、`templates/`、`scripts/`、`assets/`、`examples/` の下から明示的に参照されているファイルもあわせて取ってきて、一式をスキャンしてから導入します。

- Hermes での配布元 id: `url`
- 識別子: URL そのもの（前に何も付けません）
- 範囲: `SKILL.md` と、許された上のディレクトリにある、実際に参照されている付属ファイルだけです。Hermes がその配信元の関係ないファイルを数え上げたりコピーしたりすることはありません。

```bash
hermes skills install https://sharethis.chat/SKILL.md
hermes skills install https://example.com/my-skill/SKILL.md --category productivity
```

名前は次の順で決まります:
1. SKILL.md の YAML frontmatter の `name:` の項目（これがおすすめです。きちんと書かれたスキルには必ずあります）。
2. URL のパスの親ディレクトリの名前（たとえば `.../my-skill/SKILL.md` → `my-skill`、`.../my-skill.md` → `my-skill`）。ただし識別子として使える形（`^[a-z][a-z0-9_-]*$`）のときだけです。
3. TTY のあるターミナルでの入力。
4. 対話しない経路（TUI の中の `/skills install` スラッシュコマンド、ゲートウェイのプラットフォーム、スクリプト）では、`--name` で指定するよう促すはっきりしたエラーになります。

```bash
# Frontmatter has no name and the URL slug is unhelpful — supply one:
hermes skills install https://example.com/SKILL.md --name sharethis-chat

# Or inside a chat session:
/skills install https://example.com/SKILL.md --name sharethis-chat
```

信頼レベルは必ず `community` で、他のどの配布元とも同じセキュリティスキャンが走ります。URL は導入時の識別子として保存されるので、更新したくなったら `hermes skills update` が同じ URL から取り直してくれます。

### セキュリティスキャンと `--force` {#security-scanning-and---force}

ハブから入れたスキルはすべて **セキュリティスキャナー** を通り、データの持ち出し、プロンプトへの仕込み、壊しにかかるコマンド、供給網の怪しい兆候、その他の脅威がないか調べられます。

`hermes skills inspect ...` は、取れる場合には配布元の情報もあわせて見せます:
- リポジトリの URL
- skills.sh の詳細ページの URL
- 導入のコマンド
- 週あたりの導入数
- 配布元でのセキュリティ監査の状況
- well-known の一覧や配信先の URL

第三者のスキルを自分で確かめたうえで、危険とまではいかない判定による停止を越えて進めたいときは `--force` を使います:

```bash
hermes skills install skills-sh/anthropics/skills/pdf --force
```

押さえておきたい点:
- `--force` は、注意や警告どまりの指摘による停止を越えられます。
- `--force` は `dangerous` という判定を越えることは **できません**。
- 公式の追加スキル（`official/...`）は最初から信頼されたものとして扱われ、第三者向けの警告の画面は出ません。

### 信頼レベル {#trust-levels}

| レベル | 配布元 | 扱い |
|-------|--------|--------|
| `builtin` | Hermes に同梱 | 常に信頼されます |
| `official` | リポジトリの `optional-skills/` | 最初から信頼され、第三者向けの警告は出ません |
| `trusted` | `openai/skills`、`anthropics/skills`、`huggingface/skills`、`NVIDIA/skills` のような信頼された登録先・リポジトリ | コミュニティの配布元より緩やかに扱われます |
| `community` | それ以外すべて（`skills.sh`、well-known の配信先、独自の GitHub リポジトリ、たいていのマーケットプレイス） | 危険とまではいかない指摘は `--force` で越えられます。`dangerous` の判定は止められたままです |

### 更新の流れ {#update-lifecycle}

ハブは、入れたスキルの配布元をもう一度確かめられるだけの出どころの情報を持つようになりました:

```bash
hermes skills check          # Report which installed hub skills changed upstream
hermes skills update         # Reinstall only the skills with updates available
hermes skills update react   # Update one specific installed hub skill
hermes skills update react --force   # Overwrite a skill you've edited locally
```

これには、保存してある配布元の識別子と、いまの配布元の一式の内容のハッシュを使って、ずれを見つけています。

自分で手を入れたスキル（ディスク上の中身が、導入したときに記録したハッシュと合わなくなったもの）は `hermes skills update` から **飛ばされる** ので、変更が黙って上書きされることはありません。それでも配布元のもので置き換えたいときは `--force` を付けてください。

:::tip GitHub の回数制限
スキルハブの操作は GitHub の API を使っていて、認証しない場合は 1 時間あたり 60 回までという制限があります。導入や検索の途中で回数制限のエラーが出たら、`.env` に `GITHUB_TOKEN` を設定すると 1 時間あたり 5,000 回まで増えます。この場合、エラーのメッセージにも次にすべきことが書かれます。
:::

### 独自の tap を公開する {#publishing-a-custom-skill-tap}

自分で選んだスキルの一式を、チームや組織、あるいは広く公開したいなら、**tap** として出せます。他の Hermes 利用者が `hermes skills tap add <owner/repo>` で足せる GitHub のリポジトリのことです。サーバーも、登録先への申し込みも、公開のための仕組みも要りません。`SKILL.md` の入ったディレクトリがあるだけです。

#### リポジトリの構成 {#repo-layout}

tap は、こんな形に整えた GitHub のリポジトリなら何でもかまいません（公開でも非公開でも。非公開の場合は `GITHUB_TOKEN` が要ります）:

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
- スキルはそれぞれ、tap の起点となるパス（既定では `skills/`）の下に自分のディレクトリを持ちます。
- ディレクトリの名前が、そのまま導入時の slug になります。
- 各スキルのディレクトリには、決まった形の [SKILL.md の frontmatter](#skillmd-format)（`name`、`description`、必要に応じて `metadata.hermes.tags`、`version`、`author`、`platforms`、`metadata.hermes.config`）を持つ `SKILL.md` が必要です。
- `references/`、`templates/`、`scripts/`、`assets/` といったサブディレクトリは、導入のときに `SKILL.md` と一緒に取ってこられます。
- ディレクトリ名が `.` か `_` で始まるスキルは無視されます。

Hermes は、tap のパスの下にあるサブディレクトリをすべて並べ、それぞれに `SKILL.md` があるかを確かめてスキルを見つけます。

#### 最小の tap の例 {#minimal-tap-example}

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

これを GitHub に push すれば、どの Hermes 利用者でも登録して導入できます:

```bash
hermes skills tap add my-org/hermes-skills
hermes skills search deploy
hermes skills install my-org/hermes-skills/deploy-runbook
```

#### 既定と違うパス {#non-default-paths}

スキルが `skills/` の下にない場合（既存のプロジェクトに `skills/` を後から足したときによくあります）、`~/.hermes/skills/.hub/taps.json` の該当する tap を書き換えます:

```json
{
  "taps": [
    {"repo": "my-org/platform-docs", "path": "internal/skills/"}
  ]
}
```

`hermes skills tap add` は新しい tap を `path: "skills/"` として足します。違うパスにしたいときは、このファイルを直接書き換えてください。`hermes skills tap list` を実行すると、tap ごとの実際のパスが見られます。

#### tap を追加せずに 1 つずつ入れる {#installing-individual-skills-directly-without-adding-a-tap}

リポジトリ全体を tap として足さなくても、公開されている GitHub のリポジトリから 1 つのスキルだけを入れることもできます:

```bash
hermes skills install owner/repo/skills/my-workflow
```

自分の配布元をまるごと登録してもらわずに、スキルを 1 つだけ渡したいときに便利です。

#### tap の信頼レベル {#trust-levels-for-taps}

新しく足した tap には、既定で `community` の信頼が与えられます。そこから入れたスキルは通常のセキュリティスキャンを通り、最初の導入では第三者向けの警告の画面が出ます。自分の組織や広く信頼されている配布元にもっと高い信頼を与えたい場合は、`tools/skills_hub.py` の `TRUSTED_REPOS` にそのリポジトリを足します（Hermes 本体への PR が必要です）。

#### tap の管理 {#tap-management}

```bash
hermes skills tap list                                # show all configured taps
hermes skills tap add myorg/skills-repo               # add (default path: skills/)
hermes skills tap remove myorg/skills-repo            # remove
```

セッションを動かしている中では:

```
/skills tap list
/skills tap add myorg/skills-repo
/skills tap remove myorg/skills-repo
```

tap は `~/.hermes/skills/.hub/taps.json` に保存されます（必要になった時点で作られます）。

## 同梱スキルの更新（`hermes skills reset`） {#bundled-skill-updates-hermes-skills-reset}

Hermes はリポジトリの `skills/` の中に、同梱のスキルを一式持っています。導入のときと `hermes update` のたびに、それらが `~/.hermes/skills/` へコピーされ、`~/.hermes/skills/.bundled_manifest` に、そのときの各スキルの名前と内容のハッシュ（**もとのハッシュ**）の対応が記録されます。

同期のたびに、Hermes は手元のコピーのハッシュを計算し直して、もとのハッシュと比べます:

- **変わっていない** → 配布元の変更を取り込んでよい、と判断して新しい同梱版をコピーし、新しいもとのハッシュを記録します。
- **変わっている** → **手を加えたもの** とみなして、以後ずっと飛ばします。編集した内容が踏み潰されることはありません。

守り方としてはよくできていますが、ひとつ引っかかる点があります。同梱スキルを編集したあとで、その変更をやめて同梱版に戻したくなり、`~/.hermes/hermes-agent/skills/` からコピーして貼り付けただけの場合、manifest には最後に同期が成功したときの *古い* もとのハッシュが残ったままです。貼り付けた中身（いまの同梱版のハッシュ）はその古いハッシュと合わないので、同期はいつまでも「手を加えたもの」として扱い続けます。

`hermes skills reset` はその抜け道です:

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

同じコマンドは、チャットの中でもスラッシュコマンドとして使えます:

```text
/skills reset google-workspace
/skills reset google-workspace --restore
```

:::note プロファイルについて
プロファイルはそれぞれ自分の `HERMES_HOME` の下に自分の `.bundled_manifest` を持つので、`hermes -p coder skills reset <name>` はそのプロファイルにしか効きません。
:::

### チャットの中のスラッシュコマンド {#slash-commands-inside-chat}

同じコマンドはすべて `/skills` でも使えます:

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

公式の追加スキルは、いまも `official/security/1password` や `official/migration/openclaw-migration` のような識別子で指定します。
