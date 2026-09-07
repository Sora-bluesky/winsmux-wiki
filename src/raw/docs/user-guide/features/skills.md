---
title: "skill のしくみ"
description: "必要なときだけ読み込む知識の文書 — 段階的な開示、エージェントが自分で育てる skill、Skills Hub"
upstream_path: user-guide/features/skills.md
upstream_blob: a380826956fba34b3eb695b74b049f542a0c58fe
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/skills
---

# skill のしくみ {#skills-system}

skill は、必要になったときにエージェントが読み込める知識の文書です。トークンの使用を抑えるために**段階的な開示**という形をとっていて、[agentskills.io](https://agentskills.io/specification) の公開された仕様とも互換があります。

skill はすべて **`~/.hermes/skills/`** に置かれます — ここが主たる場所であり、正本です。入れたてのときは、同梱の skill がリポからここへ写されます。ハブから入れたものも、エージェントが自分で作ったものも、ここへ入ります。エージェントはどの skill も書き換えたり消したりできます。

Hermes に**外部の skill ディレクトリ**を見に行かせることもできます — 手元のディレクトリと並んで走査される、追加のフォルダです。下の[外部の skill ディレクトリ](#external-skill-directories)を参照してください。

あわせて参照:

- [同梱 skill のカタログ](/hermes/docs/reference/skills-catalog/)
- [公式の追加 skill のカタログ](/hermes/docs/reference/optional-skills-catalog/)

## 何も入っていない状態から始める {#starting-with-a-blank-slate}

既定では、どのプロファイルにも同梱の skill のカタログが最初から入り、`hermes update` のたびに新しく同梱されたものが足されます。**同梱の skill が入っていない**プロファイル — しかも更新をまたいで空のままのもの — がほしいときは、2つの道があります。

**入れるとき**（既定の `~/.hermes` のプロファイルに効きます）:

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash -s -- --no-skills
```

**プロファイルを作るとき**（名前付きのプロファイル）:

```bash
hermes profile create research --no-skills
```

**すでに入っているプロファイル**（既定でも名前付きでも）なら、動かしながら切り替えます。

```bash
hermes skills opt-out            # stop future seeding — nothing on disk is touched
hermes skills opt-out --remove   # also delete UNMODIFIED bundled skills (confirms first)
hermes skills opt-in --sync      # undo: remove the marker and re-seed now
```

この3つの道はどれも、プロファイルのディレクトリに `.no-bundled-skills` という目印を書きます。この目印があるあいだ、インストーラも `hermes update` も skill の同期も、そのプロファイルへの同梱 skill の配置を飛ばします。元に戻すには目印を消す（または `hermes skills opt-in` を実行する）だけです。

:::note 既定で安全
`hermes skills opt-out` が止めるのは*これから先の*配置だけです — すでにディスクにあるものを消すことは決してありません。任意の `--remove` を付けたときに消えるのは、手を入れていない同梱の skill **だけ**です（Hermes が入れた版とバイト単位で同じもの）。自分で編集した skill、ハブから入れた skill、自分で書いた skill は、いつでも残ります。
:::

## skill を使う {#using-skills}

入っている skill は、どれも自動でスラッシュコマンドとして使えます。

```bash
# In the CLI or any messaging platform:
/gif-search funny cats
/axolotl help me fine-tune Llama 3 on my dataset
/github-pr-workflow create a PR for the auth refactor
/songsee analyze the frequency spread of this mix

# Just the skill name loads it and lets the agent ask what you need:
/excalidraw
```

### 1つのコマンドに複数の skill を重ねる {#stacking-multiple-skills-in-one-command}

メッセージの先頭でスラッシュコマンドをつなげると、1つのメッセージで複数の skill を呼び出せます — 先頭に並んだ `/skill` のかたまり（5つまで）がすべて読み込まれ、残りが指示になります。

```bash
/github-pr-workflow /test-driven-development fix issue #123 and open a PR
```

読み取りは、入っている skill ではない最初のかたまりで止まります。そのため `/` で始まる引数（ファイルの場所など）が飲み込まれることはありません。

```bash
/ocr-and-documents /tmp/scan.pdf extract the tables   # loads one skill; /tmp/scan.pdf is the argument
```

何度も使う組み合わせなら、[skill の束](#skill-bundles)のほうが向いています — 同じ効き目を、短いコマンド1つで得られます。

（計画のモードも同じように働きますが、いまは組み込みのコマンドです。`/plan [request]` と書くと、Hermes は必要なら文脈を調べ、作業をこなす代わりに markdown の実装計画を書き、その結果を、いま使っている作業場や実行先の作業ディレクトリからの相対で `.hermes/plans/` の下に保存します。）

普通の会話を通して skill をやり取りすることもできます。

```bash
hermes chat --toolsets skills -q "What skills do you have?"
hermes chat --toolsets skills -q "Show me the axolotl skill"
```

## 材料から skill を学ばせる（`/learn`） {#learning-a-skill-from-sources-learn}

`/learn` は、すでに知っていること — あるいは山ほどの参照する材料 — を、`SKILL.md` を手で書かずに、使い回せる skill に変える近道です。用途は開かれています。*言葉で言い表せるものなら何でも*指し示せば、エージェントはすでに持っている道具で材料を集め、[この家の書き方の決まり](#skillmd-format)（説明は60文字以下、決まった節の並び、Hermes の道具に沿った書きぶり、でっち上げのコマンドを書かない）に従った skill を書き上げます。

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

### 大きな材料は、知識の土台としての skill になる {#large-sources-become-knowledge-base-skills}

材料が本や、論文の束や、仕様書や、大きな文書のフォルダのときは、エージェントはそれを1つのファイルに詰め込んだり、こぼれの多い要約に縮めたりしません。代わりに、**広がりのある、知識の土台としての skill** を書き上げます。材料の芯にある考え方と索引を載せた身軽な `SKILL.md` に、章や話題ごとに1つずつ煮詰めたファイルを `references/` の下へ置く形です（材料に見合うなら、用語集や早見表も付きます）。参照ファイルは、それを必要とする問いが来るまで費用がかかりません — エージェントが `skill_view` で必要なときだけ読み込むので、問い合わせの費用は材料の大きさではなく答えの大きさに見合ったままです。同じ話題で新しい材料をもとに `/learn` をもう一度回すと、重複を作らず、すでにある skill へ織り込まれます。

煮詰める作業は構造 — 枠組み、定義、判断の決まり、まずいやり方 — をまとめ上げるもので、元の文の一節をそのまま写すことは決してありません。

材料を集めるのが実際に動いているエージェントなので、`/learn` は CLI でも、メッセージのゲートウェイでも、TUI でも、ダッシュボードでも同じように働きます — そしてどのターミナルの実行先（手元、Docker、離れたサーバー）でも同じです。取り込み専用の仕掛けが別にあるわけではないからです。**ダッシュボード**では、Skills のページに **Learn a skill** のボタンがあり、ディレクトリの欄、URL の欄、自由に書ける文の欄を持つパネルが開きます。そこから `/learn` の依頼が組み立てられ、チャットで実行されます。

モデルの側に道具としての足あとは残りません。`/learn` は決まりに沿ったプロンプトを組み立て、普通のターンとしてエージェントへ渡すだけです。エージェントは結果を `skill_manage` ツールで保存するので、[書き込みの承認の関門](#gating-agent-skill-writes-skillswrite_approval)を入れているなら、それが効きます。

## 段階的な開示 {#progressive-disclosure}

skill は、トークンを無駄にしない読み込み方をします。

```
Level 0: skills_list()           → [{name, description, category}, ...]   (~3k tokens)
Level 1: skill_view(name)        → Full content + metadata       (varies)
Level 2: skill_view(name, path)  → Specific reference file       (varies)
```

エージェントが skill の中身を丸ごと読み込むのは、実際に必要になったときだけです。

## SKILL.md の形式 {#skillmd-format}

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

### OS を限った skill {#platform-specific-skills}

skill は `platforms` の欄で、自分が働く OS を限れます。

| 値 | 当てはまるもの |
|-------|---------|
| `macos` | macOS（Darwin） |
| `linux` | Linux |
| `windows` | Windows |

```yaml
platforms: [macos]            # macOS only (e.g., iMessage, Apple Reminders, FindMy)
platforms: [macos, linux]     # macOS and Linux
```

これを書くと、当てはまらない OS では、その skill はシステムプロンプト、`skills_list()`、スラッシュコマンドから自動で隠れます。書かなければ、どの OS でも読み込まれます。

## skill の出力と、メディアの届け方 {#skill-output-and-media-delivery}

skill の応答（あるいはエージェントのどんな応答でも）に、メディアファイルの絶対パスが裸で入っていると — たとえば `/home/user/screenshots/diagram.png` — ゲートウェイがそれを見つけ、見える文からは取り除いたうえで、そのファイルを利用者のチャットへその形式のまま届けます（Telegram なら写真、Discord なら添付、といった具合です）。メッセージに生のパスが残ることはありません。

とりわけ音声については、`[[audio_as_voice]]` という指示で、対応しているサービス（Telegram、WhatsApp）では音声ファイルがその形式の音声メッセージの吹き出しに格上げされます。

### 書類として届けさせる: `[[as_document]]` {#forcing-document-style-delivery-asdocument}

ときには、その場での下見とは**逆**がほしいこともあります。圧縮し直された画像の吹き出しではなく、落として保存できる添付として届けてほしいときです。分かりやすい例が、高い解像度のスクリーンショットや図です — Telegram の `sendPhoto` は 1280 px の約 200 KB に圧縮し直すので、読めるものではなくなります。1〜2 MB の PNG を `sendDocument` で送れば、元のバイトのまま届きます。

応答（あるいはその中のどこかの文、たいていは最後の行）に `[[as_document]]` という指示がそのまま入っていると、その応答から取り出されたメディアのパスはすべて、画像の吹き出しではなく書類・ファイルの添付として届けられます。

```
Here is your rendered chart:

/home/user/.hermes/cache/chart-q4-2025.png

[[as_document]]
```

この指示は届ける前に取り除かれるので、利用者の目に触れることはありません。効き方は応答ごとに全部か無かで、これは意図したものです。`[[as_document]]` を1回書けば、同じ応答の中のすべての画像のパスが書類として届きます。`[[audio_as_voice]]` の効く範囲と同じ考え方です。

skill から使うのは、こんなときです。

- 利用者がファイルとして受け取る必要のあるスクリーンショットや図を作るとき（別の道具で編集したい、保管したい、そのままの形で共有したい）。
- 既定の、質を落とした下見では細かいところが潰れてしまうとき（小さな文字、画素単位で正確な図、色に敏感な描画）。

書類のための別の道筋を持たないサービス（SMS など）では、そのサービスにある添付の仕組みに落ちます。

### 条件付きの現れ方（控えの skill） {#conditional-activation-fallback-skills}

skill は、いまのセッションでどの道具が使えるかに応じて、自動で現れたり隠れたりできます。とりわけ役に立つのが**控えの skill** — 有料の道具が使えないときだけ現れてほしい、無料や手元での代わりの手段です。

```yaml
metadata:
  hermes:
    fallback_for_toolsets: [web]      # Show ONLY when these toolsets are unavailable
    requires_toolsets: [terminal]     # Show ONLY when these toolsets are available
    fallback_for_tools: [web_search]  # Show ONLY when these specific tools are unavailable
    requires_tools: [terminal]        # Show ONLY when these specific tools are available
```

| 欄 | ふるまい |
|-------|----------|
| `fallback_for_toolsets` | 挙げたツールセットが使えるとき、skill は**隠れます**。無いときに現れます。 |
| `fallback_for_tools` | 同じですが、ツールセットではなく個々のツールを見ます。 |
| `requires_toolsets` | 挙げたツールセットが使えないとき、skill は**隠れます**。あるときに現れます。 |
| `requires_tools` | 同じですが、個々のツールを見ます。 |

**例:** 組み込みの `duckduckgo-search` という skill は `fallback_for_toolsets: [web]` を使っています。`FIRECRAWL_API_KEY` を設定していると web のツールセットが使えるので、エージェントは `web_search` を使い、DuckDuckGo の skill は隠れたままです。API キーが無ければ web のツールセットが使えず、DuckDuckGo の skill が控えとして自動で現れます。

条件の欄を持たない skill は、これまでどおりのふるまいです — いつでも現れます。

## 読み込むときの安全な用意 {#secure-setup-on-load}

skill は、探し出される場から消えることなく、必要な環境変数を宣言できます。

```yaml
required_environment_variables:
  - name: TENOR_API_KEY
    prompt: Tenor API key
    help: Get a key from https://developers.google.com/tenor
    required_for: full functionality
```

値が足りないと分かったとき、Hermes は、手元の CLI でその skill が実際に読み込まれたときにだけ、安全なやり方でそれを尋ねます。用意を飛ばして、そのまま skill を使い続けても構いません。メッセージ系の画面では、チャットで秘密を尋ねることは決してありません — 代わりに、手元で `hermes setup` か `~/.hermes/.env` を使うよう伝えます。

いったん設定すると、宣言された環境変数は `execute_code` と `terminal` の砂場へ**自動で受け渡されます** — skill のスクリプトから `$TENOR_API_KEY` をそのまま使えます。skill 以外の環境変数には、`terminal.env_passthrough` の設定を使ってください。詳しくは[環境変数の受け渡し](/hermes/docs/user-guide/security/#environment-variable-passthrough)を参照してください。

### skill の設定 {#skill-config-settings}

skill は、秘密ではない設定（場所や好み）を `config.yaml` に保存する形で宣言することもできます。

```yaml
metadata:
  hermes:
    config:
      - key: myplugin.path
        description: Path to the plugin data directory
        default: "~/myplugin-data"
        prompt: Plugin data directory path
```

設定は config.yaml の `skills.config` の下に保存されます。`hermes config migrate` は決まっていない設定を尋ね、`hermes config show` はそれらを表示します。skill が読み込まれると、解決された設定の値が文脈へ差し込まれるので、エージェントは設定された値を自動で知ります。

詳しくは [skill の設定](/hermes/docs/user-guide/configuration/#skill-settings) と [skill を作る — 設定](/hermes/docs/developer-guide/creating-skills/#config-settings-configyaml) を参照してください。

## skill のディレクトリの作り {#skill-directory-structure}

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

よそから URL や GitHub 経由で入れたものには、`SKILL.md` と、それが実際に指している `references/`、`templates/`、`scripts/`、`assets/`、`examples/` の下のファイルが含まれます。指されていないリポのファイルは写されません。Hermes は隔離した束を丸ごと走査し、元の URL、中身のハッシュ、走査した版、見つかったこと、時刻、取り立てか保存済みかの別を `skills/.hub/lock.json` に記録します。

### 参考としての SkillEvaluator の走査 {#advisory-skillevaluator-scan}

上の入れ方の決まりを守らせる組み込みの安全の走査に加えて、Hermes はハブから何かを入れるたびに [NVIDIA SkillEvaluator](https://github.com/NVIDIA/SkillEvaluator) の Tier 1 の検査を、第二の意見として走らせられます。Tier 1 は結果が毎回同じで、鍵も要りません — 個人情報の検出（漏れたメールアドレス、個人の場所、接続文字列）、Unicode を使った隠し込みの検出、スクリプトの lint、ライセンスの適合、それに [NVIDIA SkillSpector](https://github.com/NVIDIA/SkillSpector) による静的な安全の走査です。

この走査は**参考にとどまります**。見つかったことは、入れる前の確認の手前でファイル名と行番号とともに表示され、そのまま作業は進みます。本物の資格情報らしきもの（秘密鍵、クラウドのアクセスキー、トークン、資格情報を含む接続文字列）は赤で目立たせるので、決める前に印の付いた行を確かめられます。個人情報の類は知らせるだけです — 上流の走査には誤検知として知られている型（`git@github.com` の SSH の書き方、文書中の例のメールアドレスなど）があるので、これが何かを止めることはありません。

有効にするには、任意の走査のプログラムを入れてください（2つ目は `security` の検査を支えるもので、無ければその検査は単に「走らなかった」と報告されます）。

```bash
uv tool install --python 3.13 \
  "skillevaluator @ git+https://github.com/NVIDIA/SkillEvaluator.git@v0.1.0"
uv tool install "git+https://github.com/NVIDIA/SkillSpector.git@v2.9.5"
```

そのプログラムが PATH に無ければ、走査は黙って飛ばされます。完全に切りたいときはこうします。

```yaml
skills:
  tier1_advisory: false
```

ダッシュボードの Browse-hub の走査ボタンも、組み込みの走査の判定と並べて、同じ参考のデータを応答（`tier1` の欄）で返します。

## 外部の skill ディレクトリ {#external-skill-directories}

Hermes の外で skill を持っているなら — たとえば複数の AI の道具で共有している `~/.agents/skills/` のようなディレクトリなら — Hermes にそこも走査するよう伝えられます。

`~/.hermes/config.yaml` の `skills` の節に `external_dirs` を足します。

```yaml
skills:
  external_dirs:
    - ~/.agents/skills
    - /home/shared/team-skills
    - ${SKILLS_REPO}/skills
```

場所は `~` の展開と、`${VAR}` による環境変数の差し込みに対応しています。

### 仕組み {#how-it-works}

- **作るのは手元、更新はその場で**: エージェントが新しく作る skill は `~/.hermes/skills/`（設定してあれば `skills.create_dir` — 下を参照）に書かれます。すでにある skill は、`external_dirs` の下のものも含めて、見つかったその場所で書き換えられます。エージェントが `skill_manage` の `patch`、`edit`、`write_file`、`remove_file`、`delete` などを使ったときです。
- **外部のディレクトリは書き込みを防ぐ壁ではありません**: 外部の skill のディレクトリに Hermes のプロセスが書き込めるなら、エージェントによる skill の更新はそのディレクトリのファイルを変えられます。共有している外部の skill を読み取り専用に保ちたいなら、ファイルシステムの権限を使うか、プロファイルやツールセットを分けてください。
- **手元が優先**: 同じ名前の skill が手元のディレクトリと外部のディレクトリの両方にあるときは、手元のほうが勝ちます。
- **完全に組み込まれます**: 外部の skill も、システムプロンプトの索引、`skills_list`、`skill_view`、そして `/skill-name` のスラッシュコマンドに現れます — 手元の skill と何ら変わりません。
- **無い場所は黙って飛ばされます**: 設定したディレクトリが存在しなくても、Hermes はエラーを出さずに無視します。どの機械にもあるとはかぎらない、任意の共有ディレクトリに便利です。

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

4つの skill がすべて、自分の skill の索引に現れます。手元で `my-custom-workflow` という新しい skill を作ると、外部の版はその陰に隠れます。

## skill を作る場所を変える（`skills.create_dir`） {#redirecting-skill-creation-skillscreatedir}

既定では、エージェントは新しい skill を、そのプロファイルの手元の `~/.hermes/skills/` に書きます。エージェントの作る skill を別のところ — 共有の「頭脳」ディレクトリ、git で管理しているリポ、まとめて配る skill のボリューム — に置きたいなら、`skills` の節に `create_dir` を設定します。

```yaml
skills:
  create_dir: /opt/brain/skills
```

これで変わるのは次のところです。

- **`skill_manage` の create がそこへ書きます。** 新しい skill（分類のためのサブディレクトリも含めて）は、手元の skill のディレクトリではなく `create_dir` の下に作られます。ディレクトリが無ければ、最初の書き込みのときに作られます。
- **エージェントへの案内も設定に従います。** skill を作る場所を名指しするエージェント向けの案内 — `skill_manage` ツールの説明とそれに関わるプロンプトの文 — は、設定されたディレクトリをその場で描くので、エージェントはそこに作るよう伝えられます。システムプロンプトの上書きも、ファイルシステムの小細工も要りません。
- **そのディレクトリも完全に組み込まれます。** `create_dir` の下の skill は手元のディレクトリと並んで走査されます。skill の索引、`skills_list`、`skill_view`、スラッシュコマンドに現れ、手元の skill と同じように部分修正も削除もできます。
- **ほかはすべて手元のままです。** すでにある skill は、どこにあってもその場で書き換えられます。同梱 skill の同期、ハブ、世話役は、これまでどおりプロファイルの手元のディレクトリを相手にします。

場所は `~` の展開と `${VAR}` の差し込みに対応していて、相対の場所は Hermes ホームを基準に解決されます。`create_dir` に手元の skill のディレクトリを設定するのは、設定しないのと同じことです。

## プロジェクトの中に置く skill {#project-local-skills}

リポは自分の skill を持てます。それが効くのは、そのプロジェクトの中で始めたセッションだけです — 他のエージェントの土台がリポごとの設定に使っているのと同じ形です。git の作業ツリーの中で Hermes を立ち上げると、次の場所に skill を探しにいきます。

```text
<project-root>/.hermes/skills/    # Hermes-native location
<project-root>/.agents/skills/    # cross-tool convention (shared with other agent CLIs)
```

プロジェクトの根は、`.git` を含むいちばん近い先祖のディレクトリです（作業ツリーやサブモジュールも数えます）。

### プロジェクトを信用する {#trusting-a-project}

skill はエージェントがそのとおりに動く手順書なので、Hermes は、どこからか複製してきたリポのものを勝手に読み込むことは**しません**。プロジェクトの skill があるリポで初めて Hermes を動かすと、見出しの帯に知らせが出ます。

```text
◆ 3 project skill(s) found in /home/you/myproject but not loaded — run `hermes skills trust` to enable them.
```

そのリポを一度だけ信用します（中から実行するか、場所を渡します）。

```bash
hermes skills trust             # trust the current repo
hermes skills trust ~/myproject # or explicitly
hermes skills untrust           # revoke
```

信用した根は、`~/.hermes/config.yaml` の `skills.trusted_project_dirs` に保存されます。`skills.project_discovery: false` にすると、この仕組みを完全に切れます（走査も知らせもありません）。

### 優先の順 {#precedence}

プロジェクトの skill は**いちばん優先される段**です。`project → local (~/.hermes/skills/) → external_dirs` の順です。`deploy` という名前のプロジェクトの skill は、そのリポの中のセッションでは、同じ名前のプロファイルの skill や同梱の skill を上書きします — そこが狙いです。リポに持ち込まれた skill が自分の陣地で勝ち、こちらの全体のプロファイルには手を触れません。プロジェクトの skill は、エージェントの skill の索引で `[project]` と印が付くので、どこから来たものかは見えたままです。

外部のディレクトリと同じく、プロジェクトの skill のディレクトリはリポのものとして扱われます。自ら動く skill の手入れ（世話役）がそれらを書き換えることはなく、エージェントの作る新しい skill はいつでも `~/.hermes/skills/` へ入ります。

### 走査のときの隔離 {#scan-time-quarantine}

信用はリポの水準での判断ですが、リポの skill の中身は `git pull` のたびに変わります。その隙間を埋めるため、プロジェクトの skill はすべて、索引に入る前に、Skills Hub から入れるときと同じ安全の走査にかけられます。判定が**危険**（プロンプトの注入の指示、資格情報を持ち出すコマンド、隠し文字の小細工）だった skill は隔離されます。skill の索引にも `skills_list` にもスラッシュコマンドにも現れず、名前で読み込もうとしても、その理由を添えて断られます。走査の結果は中身のハッシュをもとに `~/.hermes/cache/project_skill_scans/`（決してリポの中ではありません）に取っておかれ、skill の中身が変われば自動で走り直します。

### 対話のない画面（cron、API、ACP） {#non-interactive-surfaces-cron-api-acp}

cron の作業やその他の対話のない画面は、対話のときのこちらの信用の判断を引き継ぎます — 自分から尋ねることも、勝手に信用することもありません。プロジェクトの根は、その画面の作業ディレクトリ（cron の作業なら `workdir`。ターミナルのツールと同じ仕組みです）から決まります。以前に信用したリポの中に `workdir` がある cron の作業は、そのリポのプロジェクトの skill を読み込みます。信用していない、あるいはまだ決めていないリポの作業は、何も読み込みません。

## skill の束 {#skill-bundles}

skill の束は、いくつかの skill を1つのスラッシュコマンドにまとめる、小さな YAML のファイルです。`/<bundle-name>` を実行すると、その束に並べたすべての skill が一度に読み込まれます — ある作業でいつも同じ組み合わせが効く、というときに便利です。

### 手早い例 {#quick-example}

```bash
# Create a bundle for backend feature work
hermes bundles create backend-dev \
  --skill github-code-review \
  --skill test-driven-development \
  --skill github-pr-workflow \
  -d "Backend feature work — review, test, PR workflow"
```

そのあと、CLI でも、どのゲートウェイのサービスでも、こうします。

```
/backend-dev refactor the auth middleware
```

エージェントは3つの skill をまとめて1つのユーザーのメッセージとして受け取り、スラッシュコマンドのあとに書いた文は、そのまま利用者の指示として添えられます。

### YAML の形 {#yaml-schema}

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

欄は次のとおりです。
- `name`（任意 — 書かなければファイル名の幹が使われます） — 束の表示上の名前です。スラッシュコマンド用にハイフンの slug へ整えられます（`Backend Dev` → `/backend-dev`）。
- `description`（任意） — `/bundles` と `hermes bundles list` に出る短い文です。
- `skills`（必須。空でない一覧） — skill の名前か、skill のディレクトリからの相対の場所です。`/<skill-name>` に渡すのと同じ呼び名を使ってください。
- `instruction`（任意） — 読み込んだ skill の中身の前に足される、追加の案内です。「この組み合わせをいつもこう使う」を明文化するのに向いています。

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

チャットのセッションの中からなら、`/bundles` で入っている束とその skill が並びます。

### ふるまい {#behavior}

- slug がぶつかったときは、**束が個々の skill より優先されます**。`research` という名前の束を作り、`research` という skill も持っているなら、`/research` は束を呼びます。これは意図したものです — 名前を付けた時点で、束を選んだことになります。
- **無い skill は飛ばされるだけで、致命的ではありません。** 束が `skill-foo` を挙げていて、それを入れていない場合でも、束は見つかった skill を読み込み、エージェントには何を飛ばしたかの注記が渡ります。
- **束はどの画面でも動きます** — 対話式の CLI、TUI、ダッシュボードのチャット、そしてすべてのゲートウェイのサービス（Telegram、Discord、Slack、…） — 個々の skill のコマンドと同じところで一手に振り分けているからです。
- **束はプロンプトのキャッシュを無効にしません。** `/<skill-name>` と同じで、呼び出された時点で新しいユーザーのメッセージを作るだけです — システムプロンプトを書き換えません。

### 束が、1つずつ入れるより効くとき {#when-bundles-beat-installing-each-skill-manually}

束を使うのは、こんなときです。
- 繰り返し来る作業に、いつも同じ skill の組み合わせを当てている（`/backend-dev`、`/release-prep`、`/incident-response`）。
- `/skill` を何度も続けて打つより、頭の中を1文字ぶん短くしたい。
- 束の YAML を共有の dotfiles のリポに入れ、`~/.hermes/skill-bundles/` へシンボリックリンクすることで、チーム共通の「作業の型」を配りたい。

束はただの YAML の別名で、skill を入れてくれるわけではありません。skill そのものは、すでに手元にある必要があります（`~/.hermes/skills/` か、外部の skill のディレクトリに）。無ければ、束を呼んでも足りないぶんが飛ばされるだけです。

## エージェントが育てる skill（skill_manage ツール） {#agent-managed-skills-skillmanage-tool}

エージェントは `skill_manage` ツールで、自分の skill を作り、更新し、消せます。これはエージェントの**手順の記憶**です — 一筋縄ではいかない進め方を見つけたら、そのやり方を、あとで使い回すための skill として保存します。

skill と記憶は、自己改善の輪の中で組んで働きます。記憶は、つねに文脈にあってほしい小さくて長持ちする事実を持ち、skill は、関わりのあるときだけ読み込まれるべき長い手順を持ちます。裏側の見直しは、セッションのあとに skill の変更を提案したり下書きに回したりできますが、下に書く書き込みの承認の関門を使えば、それらが定着する前に人の目を通させられます。

### エージェントが skill を作るとき {#when-the-agent-creates-skills}

システムプロンプトは、一筋縄ではいかない進め方を、あとで使い回すために `skill_manage` で書き留めるようエージェントに求めます。実際には、次のような場面です。

- 繰り返す価値のある、いくつもの段階を踏む進め方を見つけたとき
- エラーや行き止まりに当たったうえで、通る道を見つけたとき
- 利用者にやり方を直されたとき

### skill の中身はどんなものか {#what-a-skill-entry-looks-like}

skill とは、ある種類の作業を、いちばん無駄がなく正しいやり方で、こちらの求めるとおりにこなすための指示です。順を追った手順、実際に効くコマンドとツールの呼び出し、結果をどんな形にしてほしいか、そして時間を食った落とし穴です。表のターンで書かれたものでも、裏側の見直しが書いたものでも、世話役がまとめ直したものでも、そこに収まるのは**教訓であって記録ではありません**。落とし穴とは、一般に使える決まりに、*なぜ*そうなるのか（その仕組み）を一節足したもので、それが効く段階に添えて、一度だけ書かれます。事件の語り、PR や issue の番号、日付、引用したチャットは skill の中身ではありません。決まりは、その裏にある物語なしで立てなければなりません。いつでも効く決まりは `SKILL.md` そのものに置きます。`references/` には、話題ごとに名前を付けた少数のファイル（判断の表、手順、プロバイダの癖）を置き、セッションごとに1ファイルずつ溜めるのではなく、その場で書き足していきます。また skill は、毎ターン読み込まれているもの（リポの `AGENTS.md`、ツールの仕様）を言い直しません。

`skill_manage` は `create` のときと `references/` への書き込みのときに参考としての lint を走らせ、見つかったことをツールの結果で返します。この形のためだけの決まりが2つあります。`incident-log-shape`（本文に PR や issue の番号が詰まっている）と `references-sprawl`（参照ファイルが60を超えている）です。どちらも警告するだけで、書き込みを止めることはありません。

### 操作 {#actions}

| 操作 | 使いどころ | 主な引数 |
|--------|---------|------------|
| `create` | まっさらから新しい skill を作る | `name`、`content`（SKILL.md の全文）、任意で `category` |
| `patch` | 狙いを絞った直し（こちらが望ましい） | `name`、`old_string`、`new_string` |
| `edit` | 構造から書き直す大きな改訂 | `name`、`content`（SKILL.md をまるごと差し替え） |
| `delete` | skill を丸ごと消す | `name` |
| `write_file` | 付随するファイルを足す・更新する | `name`、`file_path`、`file_content` |
| `remove_file` | 付随するファイルを消す | `name`、`file_path` |

:::tip
更新には `patch` が望ましい形です — ツールの呼び出しに変わった文だけが載るので、`edit` よりトークンを食いません。
:::

### エージェントの skill の書き込みを関門で止める（`skills.write_approval`） {#gating-agent-skill-writes-skillswriteapproval}

既定では、エージェントは自由に skill を書き込みます — ターンのあとに走る[裏側の自己改善の見直し](/hermes/docs/user-guide/features/memory/#controlling-memory-writes-write_approval)からのものも含めてです。すべての skill の書き込みに先に承認を挟みたいなら（学んだ内容を読み違える小さなモデル、守りの固い環境、あるいはただ自己改善の輪に目を通しておきたいとき）、書き込みの承認の関門を入れてください。

```yaml
skills:
  write_approval: false     # false = write freely (default) | true = require approval
```

`write_approval: true` のとき、`skill_manage` によるすべての書き込み（create / edit / patch / delete / write_file / remove_file）は、その場で確定せず**下書きに回されます**。SKILL.md はその場で読み通すには大きすぎるので、表のターンから来たものでも裏側の見直しから来たものでも、区別なく下書きになります。下書きは `~/.hermes/pending/skills/` の下で再起動を越えて残り、危ないコマンドと同じ、見慣れた承認・却下の流れで見直せます。

```
/skills pending             # list staged skill writes + a one-line gist each
/skills diff <id>           # full unified diff (best viewed in CLI or dashboard)
/skills approve <id>        # apply it (or 'all')
/skills reject <id>         # drop it (or 'all')
/skills approval on         # turn the gate on (or 'off') and persist it
```

この見直しの画面は、対話式の CLI でもメッセージ系のサービスでも動きます（差分の出力はチャットの吹き出しに合わせて切り詰められます — 全文は CLI か、下書きの JSON ファイルで読んでください）。記憶の書き込みにも `memory.write_approval` という同じ関門があります — [記憶の書き込みを止めておく](/hermes/docs/user-guide/features/memory/#controlling-memory-writes-write_approval)を参照してください。

> これとは別の `skills.guard_agent_created` という設定は、中身を調べる走査（危ない型を見つける推し量り）であって、承認の関門ではありません — 2つは別のものです。[エージェントが作る skill の書き込みへの守り](/hermes/docs/user-guide/configuration/#guard-on-agent-created-skill-writes)を参照してください。

## Skills Hub {#skills-hub}

オンラインの登録所、`skills.sh`、よく知られた場所を直に指す skill の窓口、そして公式の追加 skill から、skill を眺め、探し、入れ、管理します。

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

### 対応しているハブの出どころ {#supported-hub-sources}

| 出どころ | 例 | 覚えておきたいこと |
|--------|---------|-------|
| `official` | `official/security/1password` | Hermes と一緒に配られる、追加の skill です。 |
| `skills-sh` | `skills-sh/vercel-labs/agent-skills/vercel-react-best-practices` | `hermes skills search <query> --source skills-sh` で探せます。skills.sh の slug がリポのフォルダと違うときは、Hermes が別名として解決します。 |
| `well-known` | `well-known:https://mintlify.com/docs/.well-known/skills/mintlify` | サイトの `/.well-known/skills/index.json` から直に配られる skill です。サイトか文書の URL で探します。 |
| `url` | `https://sharethis.chat/SKILL.md` | `SKILL.md` を直に指す HTTP(S) の URL と、そこからはっきり指されている付随ファイルです。名前の決まり方は、frontmatter → URL の slug → その場での問いかけ → `--name` の指定、の順です。 |
| `github` | `openai/skills/k8s` | GitHub のリポや場所を直に指して入れる形と、自分で足した取り出し口です。 |
| `clawhub`、`lobehub`、`browse-sh` | それぞれの出どころの呼び名 | 界隈や市場との連携です。 |

### 組み込まれているハブと登録所 {#integrated-hubs-and-registries}

Hermes はいま、次の skill の生態系と探し先に繋がっています。

#### 1. 公式の追加 skill（`official`） {#1-official-optional-skills-official}

Hermes のリポそのものの中で手入れされているもので、組み込みの信用のまま入ります。

- カタログ: [公式の追加 skill のカタログ](/hermes/docs/reference/optional-skills-catalog/)
- リポの中の場所: `optional-skills/`
- 例:

```bash
hermes skills browse --source official
hermes skills install official/security/1password
```

#### 2. skills.sh（`skills-sh`） {#2-skillssh-skills-sh}

Vercel が公開している skill の一覧です。Hermes はここを直に探し、skill の詳しいページを見て、別名の slug を解決し、その元になっているリポから入れられます。

- 一覧: [skills.sh](https://skills.sh/)
- CLI・道具のリポ: [vercel-labs/skills](https://github.com/vercel-labs/skills)
- Vercel 公式の skill のリポ: [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)
- 例:

```bash
hermes skills search react --source skills-sh
hermes skills inspect skills-sh/vercel-labs/json-render/json-render-react
hermes skills install skills-sh/vercel-labs/json-render/json-render-react --force
```

#### 3. よく知られた場所の skill の窓口（`well-known`） {#3-well-known-skill-endpoints-well-known}

`/.well-known/skills/index.json` を公開しているサイトから、URL をもとに探す形です。ひとつの中央のハブがあるわけではなく、Web 上の探し方の取り決めです。

- 実際に動いている窓口の例: [Mintlify の文書の skill の索引](https://mintlify.com/docs/.well-known/skills/index.json)
- 参考になるサーバーの実装: [vercel-labs/skills-handler](https://github.com/vercel-labs/skills-handler)
- 例:

```bash
hermes skills search https://mintlify.com/docs --source well-known
hermes skills inspect well-known:https://mintlify.com/docs/.well-known/skills/mintlify
hermes skills install well-known:https://mintlify.com/docs/.well-known/skills/mintlify
```

#### 4. GitHub から直に入れる skill（`github`） {#4-direct-github-skills-github}

Hermes は GitHub のリポジトリと、GitHub をもとにした取り出し口から直に入れられます。リポと場所がすでに分かっているときや、自分の出どころのリポを足したいときに便利です。

用意なしで眺められる、既定の取り出し口:
- [openai/skills](https://github.com/openai/skills)
- [anthropics/skills](https://github.com/anthropics/skills)
- [huggingface/skills](https://github.com/huggingface/skills)
- [NVIDIA/skills](https://github.com/NVIDIA/skills) — NVIDIA が検めた skill です（署名された `skill.oms.sig` と、取り決めを書いた `skill-card.md` が付きます）
- [garrytan/gstack](https://github.com/garrytan/gstack)

- 例:

```bash
hermes skills install openai/skills/k8s
hermes skills tap add myorg/skills-repo
```

**分類のまとめ方（`skills.sh.json`）。** GitHub の取り出し口は、リポの根に [skills.sh の形](https://skills.sh/schemas/skills.sh.schema.json)に従った `skills.sh.json` を置けます。その `groupings`（それぞれに `title` と skill の名前の並びを持ちます）が索引を作るときに読まれ、[Skills Hub](https://hermes-agent.nousresearch.com/docs) のページに出る分類の名札になります — タグから推し量ったものの代わりです。これは汎用の仕組みで、このファイルを置いた取り出し口はどれも本物の分類を得られます。Hermes の側に手を入れる必要はありません。

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

界隈の出どころとして組み込まれている、よその skill の市場です。

- サイト: [clawhub.ai](https://clawhub.ai/)
- Hermes での出どころの id: `clawhub`

#### 6. LobeHub（`lobehub`） {#6-lobehub-lobehub}

Hermes は LobeHub の公開カタログにあるエージェントの項目を探し、入れられる Hermes の skill に変換できます。

- サイト: [LobeHub](https://lobehub.com/)
- 公開エージェントの索引: [chat-agents.lobehub.com](https://chat-agents.lobehub.com/)
- 元のリポ: [lobehub/lobe-chat-agents](https://github.com/lobehub/lobe-chat-agents)
- Hermes での出どころの id: `lobehub`

#### 7. browse.sh（`browse-sh`） {#7-browsesh-browse-sh}

Hermes は [browse.sh](https://browse.sh) と繋がっています。Browserbase が集めた、サイトごとのブラウザ自動操作の SKILL.md が200本以上あるカタログです（Airbnb、Amazon、arXiv、12306.cn、Etsy、Xero など）。どの skill も、1つのサイトを端から端まで動かす方法を書いたもので、Hermes のブラウザの道具や、すでに入れてあるブラウザ自動操作の skill と一緒に使えます。

- サイト: [browse.sh](https://browse.sh/)
- カタログの API: `https://browse.sh/api/skills`
- Hermes での出どころの id: `browse-sh`
- 信用の段階: `community`

```bash
hermes skills search airbnb --source browse-sh
hermes skills inspect browse-sh/airbnb.com/search-listings-ddgioa
hermes skills install browse-sh/airbnb.com/search-listings-ddgioa
```

呼び名は `browse-sh/<hostname>/<task-id>` の形で、browse.sh のカタログが見せている slug と一致します。中身はカタログの GitHub の `sourceUrl` からではなく、skill ごとの詳細の窓口（`/api/skills/<slug>` → `skillMdUrl`）を通して解決されます。

#### 8. URL を直に指す（`url`） {#8-direct-url-url}

どんな HTTP(S) の URL からでも `SKILL.md` を直に入れられます — 作った人が自分のサイトに skill を置いているとき（ハブに載っておらず、打ち込む GitHub の場所もないとき）に便利です。Hermes は `references/`、`templates/`、`scripts/`、`assets/`、`examples/` の下ではっきり指されているファイルも取ってきて、束を丸ごと走査してから入れます。

- Hermes での出どころの id: `url`
- 呼び名: URL そのもの（前置きは要りません）
- 及ぶ範囲: `SKILL.md` と、許した場所の中ではっきり指されている付随ファイルだけです。Hermes が、そのホストにある関係のないファイルを数え上げたり写したりすることはありません。

```bash
hermes skills install https://sharethis.chat/SKILL.md
hermes skills install https://example.com/my-skill/SKILL.md --category productivity
```

名前は次の順で決まります。
1. SKILL.md の YAML frontmatter の `name:` の欄（これが勧められる形です — きちんと書かれた skill には必ずあります）。
2. URL の道筋にある親のディレクトリの名前（たとえば `.../my-skill/SKILL.md` → `my-skill`、`.../my-skill.md` → `my-skill`）。使える呼び名（`^[a-z][a-z0-9_-]*$`）のときだけです。
3. TTY のあるターミナルでの、その場の問いかけ。
4. 対話のない画面（TUI の中の `/skills install` のスラッシュコマンド、ゲートウェイのサービス、スクリプト）では、`--name` での指定を促す、はっきりしたエラー。

```bash
# Frontmatter has no name and the URL slug is unhelpful — supply one:
hermes skills install https://example.com/SKILL.md --name sharethis-chat

# Or inside a chat session:
/skills install https://example.com/SKILL.md --name sharethis-chat
```

信用の段階はつねに `community` で、他のどの出どころとも同じ安全の走査が走ります。入れたときの呼び名として URL が保存されるので、`hermes skills update` すると同じ URL から自動で取り直せます。

### 安全の走査と `--force` {#security-scanning-and---force}

ハブから入れる skill はすべて、データの持ち出し、プロンプトの注入、壊す働きのコマンド、供給の連なりに関わる兆し、その他の脅威を調べる**安全の走査**を通ります。

`hermes skills inspect ...` は、手に入るなら上流の付随する情報も見せるようになりました。
- リポの URL
- skills.sh の詳細ページの URL
- 入れるためのコマンド
- 週あたりの導入数
- 上流での安全の監査の状態
- よく知られた場所の索引・窓口の URL

よそから来た skill を確かめたうえで、危険ではない決まりによる差し止めを越えたいときは、`--force` を使います。

```bash
hermes skills install skills-sh/anthropics/skills/pdf --force
```

大事なふるまい:
- `--force` は、注意や警告の水準で見つかったことによる差し止めを越えられます。
- `--force` は、`dangerous` という走査の判定を越えることは**できません**。
- 公式の追加 skill（`official/...`）は組み込みの信用として扱われ、よそから来たものへの警告のパネルは出ません。

### 信用の段階 {#trust-levels}

| 段階 | 出どころ | 決まり |
|-------|--------|--------|
| `builtin` | Hermes と一緒に配られる | いつでも信用します |
| `official` | リポの `optional-skills/` | 組み込みの信用。よそから来たものへの警告なし |
| `trusted` | `openai/skills`、`anthropics/skills`、`huggingface/skills`、`NVIDIA/skills` のような、信用している登録所やリポ | 界隈の出どころより緩やかな決まり |
| `community` | それ以外すべて（`skills.sh`、よく知られた場所の窓口、自分で足した GitHub のリポ、たいていの市場） | 危険ではない指摘は `--force` で越えられます。`dangerous` の判定は止まったままです |

### 更新のめぐり方 {#update-lifecycle}

ハブは、入れた skill の上流の写しを確かめ直せるだけの、出どころの記録を持つようになりました。

```bash
hermes skills check          # Report which installed hub skills changed upstream
hermes skills update         # Reinstall only the skills with updates available
hermes skills update react   # Update one specific installed hub skill
hermes skills update react --force   # Overwrite a skill you've edited locally
```

保存しておいた出どころの呼び名と、いまの上流の束の中身のハッシュを突き合わせて、ずれを見つけます。

見当たらない、あるいはディレクトリでない導入（`orphaned`）と、安全でない・解決できない記録上の場所（`invalid_install`）については、確かめのためのネットワークの呼び出しを飛ばします。ディレクトリが見当たらない項目は `hermes skills uninstall <name>` で消せます。場所が正しくないものは、やり直す前に、いま使っているプロファイルの `skills/.hub/lock.json` を調べて直す必要があります。項目が自動で消されることはありません。

まっとうに入っているものは、これまでどおり、その出どころの受け口が持つ同期の取り出しと通信の打ち切りの時間を使います。更新の確認に、全体としての厳しい締め切りはありません。すでに入っているものの出どころが繋がらなかったり遅かったりすると、あとの項目が待たされることがあります。

手元で編集した skill（ディスク上の中身が、入れたときに記録したハッシュと合わなくなったもの）は、`hermes skills update` に**飛ばされます**。こちらの変更が黙って上書きされることはありません。それでも上流の版に置き換えたいときは `--force` を渡してください。

:::tip GitHub の呼び出し回数の上限
skill のハブの操作は GitHub の API を使います。認証していない利用者には1時間あたり60回という上限があります。導入や検索のときに上限のエラーが出たら、`.env` ファイルに `GITHUB_TOKEN` を設定してください。上限が1時間あたり5,000回に上がります。この場合、エラーの文面にも次の一手の手がかりが載ります。
:::

### 自分の skill の取り出し口を公開する {#publishing-a-custom-skill-tap}

選り抜きの skill を配りたいなら — チームへ、組織へ、あるいは広く世の中へ — **取り出し口**として公開できます。ほかの Hermes の利用者が `hermes skills tap add <owner/repo>` で足す、GitHub のリポジトリのことです。サーバーも、登録所への申し込みも、公開の仕掛けも要りません。`SKILL.md` の並んだディレクトリがあればそれで足ります。

#### リポの並び {#repo-layout}

取り出し口とは、こんな並びをした GitHub のリポです（公開でも非公開でも構いません。非公開なら `GITHUB_TOKEN` が要ります）。

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
- どの skill も、取り出し口の根の場所（既定では `skills/`）の下に、自分のディレクトリを持ちます。
- ディレクトリの名前が、その skill を入れるときの slug になります。
- どの skill のディレクトリにも、標準の [SKILL.md の frontmatter](#skillmd-format)（`name`、`description` と、任意で `metadata.hermes.tags`、`version`、`author`、`platforms`、`metadata.hermes.config`）を持つ `SKILL.md` が必要です。
- `references/`、`templates/`、`scripts/`、`assets/` のような下位のディレクトリは、入れるときに `SKILL.md` と一緒に落とされます。
- ディレクトリの名前が `.` か `_` で始まる skill は無視されます。

Hermes は、取り出し口の場所の下にあるすべての下位ディレクトリを並べ、それぞれに `SKILL.md` があるかを見て skill を見つけます。

#### いちばん小さい取り出し口の例 {#minimal-tap-example}

```
my-org/hermes-skills
└── skills/
    └── deploy-runbook/
        └── SKILL.md
```

`skills/deploy-runbook/SKILL.md` はこうです。

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

これを GitHub へ送れば、どの Hermes の利用者も、こうして受け取って入れられます。

```bash
hermes skills tap add my-org/hermes-skills
hermes skills search deploy
hermes skills install my-org/hermes-skills/deploy-runbook
```

#### 既定ではない場所 {#non-default-paths}

skill が `skills/` の下に無いなら（すでにあるプロジェクトへ `skills/` の枝を足すときによくあります）、`~/.hermes/skills/.hub/taps.json` の取り出し口の項目を書き換えます。

```json
{
  "taps": [
    {"repo": "my-org/platform-docs", "path": "internal/skills/"}
  ]
}
```

`hermes skills tap add` の CLI は、新しい取り出し口を既定で `path: "skills/"` にします。別の場所が要るなら、ファイルを直に書き換えてください。`hermes skills tap list` で、取り出し口ごとに効いている場所が分かります。

#### 取り出し口を足さずに、skill をひとつだけ入れる {#installing-individual-skills-directly-without-adding-a-tap}

リポ全体を取り出し口として足さなくても、公開されている GitHub のリポから skill をひとつだけ入れることもできます。

```bash
hermes skills install owner/repo/skills/my-workflow
```

自分の登録所すべてを受け取ってもらわずに、skill をひとつだけ配りたいときに便利です。

#### 取り出し口の信用の段階 {#trust-levels-for-taps}

新しい取り出し口には、既定で `community` の信用が付きます。そこから入れた skill は標準の安全の走査を通り、最初に入れるときによそから来たものへの警告のパネルが出ます。自分の組織や、広く信用されている出どころにもっと高い信用を与えたいなら、そのリポを `tools/skills_guard.py` の `TRUSTED_REPOS` へ足してください（Hermes 本体への PR が要ります）。

#### 取り出し口の管理 {#tap-management}

```bash
hermes skills tap list                                # show all configured taps
hermes skills tap add myorg/skills-repo               # add (default path: skills/)
hermes skills tap remove myorg/skills-repo            # remove
```

動いているセッションの中からなら、こうです。

```
/skills tap list
/skills tap add myorg/skills-repo
/skills tap remove myorg/skills-repo
```

取り出し口は `~/.hermes/skills/.hub/taps.json` に保存されます（必要になったときに作られます）。

## 同梱 skill の更新（`hermes skills reset`） {#bundled-skill-updates-hermes-skills-reset}

Hermes は、リポの中の `skills/` に同梱の skill をひとそろい持っています。導入時と `hermes update` のたびに、同期のひと回しがそれらを `~/.hermes/skills/` へ写し、`~/.hermes/skills/.bundled_manifest` に一覧を記録します。そこには skill の名前ごとに、同期した時点での中身のハッシュ（**出どころのハッシュ**）が入ります。

同期のたびに、Hermes は手元の写しのハッシュを取り直し、出どころのハッシュと比べます。

- **変わっていない** → 上流の変更を取り込んで安全なので、新しい同梱の版を写し、新しい出どころのハッシュを記録します。
- **変わっている** → **利用者が手を入れた**ものとして扱い、以後ずっと飛ばします。こちらの編集が踏み潰されることはありません。

skill の中にできる実行時のキャッシュ（`__pycache__/`、`.pytest_cache/`、`.mypy_cache/`、`.ruff_cache/`、それに `.py` の隣にできる `.pyc`）はハッシュの対象に入りません。そのため、skill の補助のスクリプトを走らせただけで「利用者が手を入れた」印が付いたり、`hermes skills list-modified` や `diff` から隠れたりすることはありません。

この守りはよくできていますが、ひとつ鋭い縁があります。同梱の skill を編集したあとで、その変更をあきらめて `~/.hermes/hermes-agent/skills/` からただ写して同梱の版に戻したとき、一覧のほうには、最後にうまくいった同期のときの*古い*出どころのハッシュが残ったままです。写したての中身（いまの同梱のハッシュ）はその古い出どころのハッシュと合わないので、同期はそれを「利用者が手を入れた」と印を付け続けます。

`hermes skills reset` が、そこからの抜け道です。

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

同じコマンドが、チャットではスラッシュコマンドとして動きます。

```text
/skills reset google-workspace
/skills reset google-workspace --restore
```

:::note プロファイル
プロファイルはそれぞれ、自分の `HERMES_HOME` の下に自分の `.bundled_manifest` を持ちます。そのため `hermes -p coder skills reset <name>` は、そのプロファイルにしか効きません。
:::

### スラッシュコマンド（チャットの中） {#slash-commands-inside-chat}

同じコマンドはすべて `/skills` でも動きます。

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

公式の追加 skill は、これまでどおり `official/security/1password` や `official/migration/openclaw-migration` のような呼び名を使います。
