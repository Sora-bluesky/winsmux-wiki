---
title: "スキルの仕組み"
description: "必要なときだけ読み込む知識の文書 — 段階的な開示、エージェント管理のスキル、スキルのハブ"
upstream_path: user-guide/features/skills.md
upstream_blob: a8594f51897b373f690ce1c83fc9e9f4986b16ba
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/skills
---

# スキルの仕組み {#skills-system}

スキルは、エージェントが必要になったときに読み込む知識の文書です。トークンの消費を抑えるために**段階的な開示**の形を取っていて、[agentskills.io](https://agentskills.io/specification) のオープンな規格とも互換があります。

スキルはすべて **`~/.hermes/skills/`** に置かれます。ここが主たるディレクトリであり、正本です。入れたばかりのときは、同梱のスキルがリポジトリから複製されます。ハブから入れたスキルや、エージェントが作ったスキルもここに入ります。エージェントはどのスキルでも書き換えたり消したりできます。

Hermes に**外部のスキルのディレクトリ**を教えることもできます。手元のディレクトリと並べて走査される追加のフォルダです。下の[外部のスキルのディレクトリ](#external-skill-directories)を参照してください。

あわせて次も参照してください。

- [同梱スキル一覧](/hermes/docs/reference/skills-catalog/)
- [公式の追加スキル一覧](/hermes/docs/reference/optional-skills-catalog/)

## Desktop で探して入れる {#browse-and-install-in-desktop}

**Capabilities → Skills** を開き、**Installed** と **Browse** を切り替えます。
検索は上に固定され、タブの切り替えと操作のボタンは同じ1行に並びます。
**Installed** は、選んでいるプロファイルに実際に入っているスキルと、それぞれが有効かどうかを読み取って表示します。
公開されている一覧から推測したものではありません。**Browse** は Desktop に組み込まれた一覧の画面で、
Web サイトを埋め込んだものでも、別に用意した小さな一覧でもありません。

Desktop と公開されている [Skills Hub](https://hermes-agent.nousresearch.com/skills) は、CDN に公開された同じ
スナップショットを読みます: [`/docs/api/skills.json`](https://hermes-agent.nousresearch.com/docs/api/skills.json)。
公開ドキュメント側の別名も、Desktop が取りにいく URL と同じスナップショットを返します。
`https://nousresearch.github.io/hermes-agent/docs/api/skills.json` です。これは
ドキュメントのビルドが、同梱の `skills/`、`optional-skills/`、そして
一か所にまとめたスキルの索引から作ります。一覧を見ている間に GitHub を巡回したり、上流の
マーケットプレイスへその場で問い合わせたりはしません。ただしインストールするときは、選んだスキルを
その提供元のインストーラーから取ってきます。

### Web サイトから入れる {#install-from-the-website}

Skills Hub では、インストールできるカードそれぞれに **Install in Hermes** のボタンがあります。押すと、
インストール済みの Hermes Desktop アプリが、URL エンコードされ提供元を明示したスキルの指定付きで開きます。
たとえば追加スキルなら `official/...`、ClawHub なら `clawhub/...` です。
同梱のスキルは、紛らわしい名前だけの指定ではなく、リポジトリ内のパスをはっきり書いて指定します。
古いスナップショットにその明示的な同梱スキルの指定が無い場合、Web サイトは
インストールのリンクを出さず、Desktop の Browse もインストールを無効にします。紛らわしい名前を推測で解決することはしません。
次にドキュメントが公開されるときに、その指定が補われます。
Desktop の Browse とカードの CLI 向けの代替手段も、同じ指定を使います。

```text
hermes://skill/install?identifier=official%2Fsecurity%2F1password
```

Hermes は **Install “skill-name”?** と表示し、**Source**（提供元）と **Install to**（入れる先）を
別々の行で示します。Cancel を押せば何も変わりません。確定すると、同じダイアログに
**Installing…**、続いて **Installed** が表示され、完了の通知が出ます。エラーが起きたときは
ダイアログに残るので、読んでからやり直せます。インストールには、これまでの
Skills Hub の流れがそのまま使われます。安全性の検査、操作の記録、インストール済み一覧の
更新も含みます。確認の画面を開いたままプロファイルや接続を切り替えた場合は、
新しい入れ先に向けてリンクを開き直してください。変更が効くのは
新しいセッションからです。リンクから検査を飛ばしたり、別のプロファイルを選んだりすることはできません。

公開のリンクが使うのは `hermes://` で、開発専用の `hermes-dev://`
ではありません。`skill/install` の経路を使うには、更新した Desktop が必要です。
アプリが入っていない、またはリンクが認識されない場合は、Desktop を更新するか、
カードを広げて CLI のインストールコマンドをコピーしてください。

## まっさらな状態から始める {#starting-with-a-blank-slate}

既定では、どのプロファイルにも同梱のスキルが最初から入り、`hermes update` のたびに新しく同梱されたスキルが足されます。**同梱のスキルが1つも無い**プロファイルがほしい、しかも更新後も空のままにしたい、という場合は2つの道があります。

**入れるとき**（既定の `~/.hermes` のプロファイルに効きます）:
インストーラーに `--no-skills` のフラグはありません。Blank Slate の設定を選ぶと、設定の段階で
同梱のスキルを最初から入れるかどうかを尋ねられます。いいえと答えると、下で説明する
やめる印が書き込まれます。対話なしのインストールでは同梱のスキルが入るので、
プロファイルを空にしたい場合は、あとで `hermes skills opt-out` を実行してください。

**プロファイルを作るとき**（名前付きのプロファイル）:

```bash
hermes profile create research --no-skills
```

**すでにあるプロファイルに対して**（既定でも名前付きでも）、実行時に切り替えます。

```bash
hermes skills opt-out            # stop future seeding — nothing on disk is touched
hermes skills opt-out --remove   # also delete UNMODIFIED bundled skills (confirms first)
hermes skills opt-in --sync      # undo: remove the marker and re-seed now
```

どの方法でも、プロファイルのディレクトリに `.no-bundled-skills` という印のファイルを書きます。この印がある間は、インストーラーも `hermes update` もスキルの同期も、そのプロファイルへの同梱スキルの配置を飛ばします。印を消せば（または `hermes skills opt-in` を実行すれば）元に戻ります。

:::note 既定で安全です
`hermes skills opt-out` が止めるのは*これから*の配置だけで、ディスク上のものを消すことはありません。任意の `--remove` を付けたときに消えるのは、手を加えていない同梱のスキル**だけ**です（Hermes が入れた版とバイト単位で同じもの）。自分が編集したスキル、ハブから入れたスキル、自分で書いたスキルは必ず残ります。
:::

## スキルを使う {#using-skills}

入っているスキルはどれも、自動でスラッシュコマンドとして使えます。

```bash
# In the CLI or any messaging platform:
/gif-search funny cats
/axolotl help me fine-tune Llama 3 on my dataset
/github-pr-workflow create a PR for the auth refactor
/songsee analyze the frequency spread of this mix

# Just the skill name loads it and lets the agent ask what you need:
/excalidraw
```

### 1つのコマンドで複数のスキルを重ねる {#stacking-multiple-skills-in-one-command}

メッセージの先頭にスラッシュコマンドを並べれば、1回でいくつものスキルを呼べます。
先頭から続く `/skill` の並び（最大5つ）が読み込まれ、残りが指示になります。

```bash
/github-pr-workflow /test-driven-development fix issue #123 and open a PR
```

読み取りは、入っているスキルではない最初の語で止まります。ですから、たまたま `/` で
始まる引数（ファイルのパスなど）が飲み込まれることはありません。

```bash
/ocr-and-documents ~/.hermes/cache/scratch/scan.pdf extract the tables   # loads one skill; ~/.hermes/cache/scratch/scan.pdf is the argument
```

何度も使う組み合わせなら、[スキルのまとめ](#skill-bundles)のほうが向いています。
短いコマンド1つで同じ結果になります。

（計画のモードも同じ形で動きますが、いまは組み込みのコマンドです。`/plan [request]` と打つと、Hermes は必要なら状況を調べ、作業を実行する代わりに実装の計画を Markdown で書き、その結果を、いま使っているワークスペースやバックエンドの作業ディレクトリからの相対で `.hermes/plans/` に保存します。）

ふつうの会話からスキルに触れることもできます。

```bash
hermes chat --toolsets skills -q "What skills do you have?"
hermes chat --toolsets skills -q "Show me the axolotl skill"
```

## 素材からスキルを覚えさせる（`/learn`） {#learning-a-skill-from-sources-learn}

`/learn` は、すでに自分が知っていること、あるいは山積みの資料を、`SKILL.md` を
手書きせずに再利用できるスキルへ変える近道です。対象は選びません。*説明できるもの*なら
何でも指し示せば、エージェントは手持ちのツールで材料を集め、
[この場の書き方の決まり](#skillmd-format)に沿ったスキルを書きます（説明は60文字以内、
決まった節の並び、Hermes のツールを前提にした書き方、存在しないコマンドを作らない）。

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

### 大きな素材は知識ベースのスキルになる {#large-sources-become-knowledge-base-skills}

素材が本や論文の束、仕様書、大きなドキュメントのフォルダのときは、エージェントは
それを1つのファイルに詰め込んだり、取りこぼしの多い要約にしたりはしません。
代わりに**大きく広がる知識ベースのスキル**を書きます。素材の中心にある考え方と索引を
載せた身軽な `SKILL.md` と、章や話題ごとに1ファイルずつ蒸留したものを `references/` に
置く形です（素材に見合うなら用語集や早見表も足します）。参照するファイルは、問いが
それを必要とするまで費用になりません。エージェントが `skill_view` で必要なときだけ
読み込むので、かかる費用は素材の大きさではなく答えの大きさに比例します。同じ話題で
新しい素材を足して `/learn` を実行し直すと、重複を作らず既存のスキルに織り込まれます。

蒸留がまとめるのは構造 — 枠組み、定義、判断の規則、避けるべき形 — であって、
素材の文章をそのまま写すことはありません。

素材集めを動いているエージェント自身が行うので、`/learn` は CLI でも、メッセージの
ゲートウェイでも、TUI でも、ダッシュボードでも同じように働きます。取り込み専用のエンジンが
無いので、どのターミナルのバックエンド（手元、Docker、遠隔）でも同じです。
**ダッシュボード**では、スキルのページに **Learn a skill** ボタンがあり、ディレクトリの欄、
URL の欄、自由に書ける文章の欄を持つパネルが開きます。これが `/learn` の依頼を組み立てて
チャットで実行します。

モデルのツールとしての痕跡は残りません。`/learn` は決まりに沿ったプロンプトを組み立てて、
ふつうのターンとしてエージェントに渡します。エージェントは結果を `skill_manage` ツールで
保存するので、有効にしていれば[書き込みの承認の関門](#gating-agent-skill-writes-skillswrite_approval)が
そのまま効きます。

## 段階的な開示 {#progressive-disclosure}

スキルは、トークンを節約する読み込み方をします。

```
Level 0: skills_list()           → [{name, description, category}, ...]   (~3k tokens)
Level 1: skill_view(name)        → Full content + metadata       (varies)
Level 2: skill_view(name, path)  → Specific reference file       (varies)
```

エージェントがスキルの中身をまるごと読み込むのは、本当に必要になったときだけです。

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

### OS を限定したスキル {#platform-specific-skills}

スキルは `platforms` の項目で、自分が使える OS を限定できます。

| 値 | 対象 |
|-------|---------|
| `macos` | macOS（Darwin） |
| `linux` | Linux |
| `windows` | Windows |

```yaml
platforms: [macos]            # macOS only (e.g., iMessage, Apple Reminders, FindMy)
platforms: [macos, linux]     # macOS and Linux
```

これを書くと、合わない OS ではそのスキルが、システムのプロンプトからも `skills_list()` からもスラッシュコマンドからも自動で隠れます。省いた場合は、すべての OS で読み込まれます。

## スキルの出力とメディアの受け渡し {#skill-output-and-media-delivery}

スキルの応答（あるいはエージェントのどの応答でも）に、メディアのファイルの絶対パスがそのまま含まれていると — たとえば `/home/user/screenshots/diagram.png` — ゲートウェイがそれを見つけ、見える文章から取り除き、生のパスをメッセージに残す代わりに、ファイルそのものを利用者のチャットへ届けます（Telegram の写真、Discord の添付など）。

音声についてはさらに、`[[audio_as_voice]]` という指示を書くと、対応しているプラットフォーム（Telegram、WhatsApp）で音声ファイルがそのままボイスメッセージの吹き出しになります。

### ファイルとして届けさせる: `[[as_document]]` {#forcing-document-style-delivery-asdocument}

その場で表示するのとは**逆**をやりたいこともあります。つまり、再圧縮された画像の吹き出しではなく、ダウンロードできる添付として届けたい場合です。よくある例が高解像度のスクリーンショットやグラフです。Telegram の `sendPhoto` はそれを 1280 px・およそ 200 KB まで再圧縮するので、読めなくなってしまいます。1〜2 MB の PNG を `sendDocument` で送れば、元のバイト列がそのまま残ります。

応答（あるいはその中のどこかの文章。たいていは最終行）に `[[as_document]]` という文字列がそのまま入っていると、その応答から取り出されたメディアのパスはすべて、画像の吹き出しではなく文書・ファイルの添付として届きます。

```
Here is your rendered chart:

/home/user/.hermes/cache/chart-q4-2025.png

[[as_document]]
```

この指示は届ける前に取り除かれるので、利用者の目には触れません。粒度は意図的に、応答ごとの全部か無しかです。`[[as_document]]` を1回書けば、同じ応答の中の画像のパスはすべて文書として届きます。`[[audio_as_voice]]` の適用範囲と同じ考え方です。

スキルからこれを使うのは、次のようなときです。

- スクリーンショットやグラフを、利用者がファイルとして必要とするとき（別のツールで編集する、保管する、そのまま共有する）。
- 既定の劣化するプレビューでは細部が分からなくなるとき（小さな文字、画素まで正確な図、色が大事な描画）。

文書の経路を別に持たないプラットフォーム（SMS など）は、そこにある添付の仕組みで届けます。

### 条件つきの表示（控えのスキル） {#conditional-activation-fallback-skills}

スキルは、いまのセッションで使えるツールに応じて、自分を出したり隠したりできます。これがいちばん役に立つのが**控えのスキル** — 有料のツールが使えないときだけ現れてほしい、無料や手元で動く代わりの手段です。

```yaml
metadata:
  hermes:
    fallback_for_toolsets: [web]      # Show ONLY when these toolsets are unavailable
    requires_toolsets: [terminal]     # Show ONLY when these toolsets are available
    fallback_for_tools: [web_search]  # Show ONLY when these specific tools are unavailable
    requires_tools: [terminal]        # Show ONLY when these specific tools are available
```

| 項目 | 動き |
|-------|----------|
| `fallback_for_toolsets` | 並べたツール群が使えるとき、スキルは**隠れます**。使えないときに現れます。 |
| `fallback_for_tools` | 同じですが、ツール群ではなく個々のツールを見ます。 |
| `requires_toolsets` | 並べたツール群が使えないとき、スキルは**隠れます**。使えるときに現れます。 |
| `requires_tools` | 同じですが、個々のツールを見ます。 |

**例:** 組み込みの `duckduckgo-search` スキルは `fallback_for_toolsets: [web]` を使っています。`FIRECRAWL_API_KEY` を設定していれば web のツール群が使えるのでエージェントは `web_search` を使い、DuckDuckGo のスキルは隠れたままです。API キーが無ければ web のツール群が使えないので、DuckDuckGo のスキルが控えとして自動で現れます。

条件の項目を何も持たないスキルは、これまでどおり常に表示されます。

## 読み込み時の安全な設定 {#secure-setup-on-load}

スキルは、必要な環境変数を宣言しても、一覧から消えずにいられます。

```yaml
required_environment_variables:
  - name: TENOR_API_KEY
    prompt: Tenor API key
    help: Get a key from https://developers.google.com/tenor
    required_for: full functionality
```

値が足りないと分かったとき、Hermes は、そのスキルが手元の CLI で実際に読み込まれたときにだけ、安全な形で値を尋ねます。設定を飛ばして、そのままスキルを使うこともできます。メッセージの画面で秘密の情報を尋ねることは決してありません。代わりに、手元で `hermes setup` か `~/.hermes/.env` を使うよう案内します。

いったん設定すると、宣言された環境変数は `execute_code` と `terminal` のサンドボックスへ**自動で引き渡されます**。スキルのスクリプトは `$TENOR_API_KEY` をそのまま使えます。スキル以外の環境変数には `terminal.env_passthrough` の設定を使ってください。詳しくは[環境変数の引き渡し](/hermes/docs/user-guide/security/#environment-variable-passthrough)を参照してください。

### スキルの設定値 {#skill-config-settings}

スキルは、秘密でない設定（パスや好み）を `config.yaml` に保存する形で宣言することもできます。

```yaml
metadata:
  hermes:
    config:
      - key: myplugin.path
        description: Path to the plugin data directory
        default: "~/myplugin-data"
        prompt: Plugin data directory path
```

設定は config.yaml の `skills.config` の下に保存されます。`hermes config migrate` は未設定のものを尋ね、`hermes config show` はそれらを表示します。スキルが読み込まれると、解決された設定値が文脈へ差し込まれるので、エージェントは設定された値を自動で把握します。

詳しくは[スキルの設定](/hermes/docs/user-guide/configuration/#skill-settings)と[スキルを作る — 設定値](/hermes/docs/developer-guide/creating-skills/#config-settings-configyaml)を参照してください。

## スキルのディレクトリの構造 {#skill-directory-structure}

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

第三者の URL や GitHub から入れたものには、`SKILL.md` に加えて、それが参照している
`references/`、`templates/`、`scripts/`、`assets/`、`examples/` の下のファイルが
そのまま入ります。参照されていないリポジトリのファイルは複製されません。Hermes は
隔離した束をまるごと走査し、入手元の URL、正確な内容のハッシュ、走査の版、指摘、時刻、
取得したてかキャッシュかを `skills/.hub/lock.json` に記録します。

### 参考として走る SkillEvaluator の走査 {#advisory-skillevaluator-scan}

上のインストールの方針を強制する組み込みのセキュリティ走査に加えて、Hermes は
ハブからのインストールのたびに [NVIDIA SkillEvaluator](https://github.com/NVIDIA/SkillEvaluator)
の Tier 1 の検査を第二の意見として走らせられます。Tier 1 は決まった手順で動き、
キーも要りません。個人情報の検出（漏れたメールアドレス、個人のパス、接続文字列）、
Unicode を使ったごまかしの検出、スクリプトの lint、ライセンスの適合、そして
[NVIDIA SkillSpector](https://github.com/NVIDIA/SkillSpector) による静的なセキュリティ走査です。

この走査は**参考にとどまります**。指摘はインストールの確認の前にファイルと行を添えて
表示され、インストールはそのまま進みます。本物の資格情報らしく見える指摘（秘密鍵、
クラウドのアクセスキー、トークン、資格情報つきの接続文字列）は赤で強調されるので、
決める前にその行を確認できます。個人情報の類の指摘は参考情報です。上流の走査には
誤検出しやすい種類が知られているので（`git@github.com` の SSH の書き方、
ドキュメントの例のメールアドレスなど）、それが何かを止めることはありません。

有効にするには、任意の走査のバイナリを入れます（2つめは `security` の検査を動かすもので、
これが無いとその検査は単に「実行していない」と報告します）。

```bash
uv tool install --python 3.13 \
  "skillevaluator @ git+https://github.com/NVIDIA/SkillEvaluator.git@v0.1.0"
uv tool install "git+https://github.com/NVIDIA/SkillSpector.git@v2.9.5"
```

PATH にバイナリが無ければ、走査は黙って飛ばされます。まるごと止めたいときは
次のようにします。

```yaml
skills:
  tier1_advisory: false
```

ダッシュボードのハブを見る画面の走査のボタンも、組み込みの走査の判定と並べて、
同じ参考情報を応答に返します（`tier1` の項目）。

## 外部のスキルのディレクトリ {#external-skill-directories}

Hermes の外でスキルを保っている場合 — たとえば複数の AI ツールで共有している `~/.agents/skills/` のようなディレクトリ — その場所も走査するよう Hermes に伝えられます。

`~/.hermes/config.yaml` の `skills` の節に `external_dirs` を足します。

```yaml
skills:
  external_dirs:
    - ~/.agents/skills
    - /home/shared/team-skills
    - ${SKILLS_REPO}/skills
```

パスは `~` の展開と `${VAR}` による環境変数の置き換えに対応しています。

### 動き方 {#how-it-works}

- **作るのは手元、更新はその場で**: エージェントが新しく作るスキルは `~/.hermes/skills/` に書かれます（設定している場合は `skills.create_dir`。下記参照）。すでにあるスキルは、`external_dirs` の下にあるものも含め、見つかった場所で書き換えられます。エージェントが `skill_manage` の `patch`（一部だけ、または全文の書き換え）、`write_file`、`remove_file`、`delete` といった操作をしたときです。
- **外部のディレクトリは書き込みを防ぐ壁ではありません**: 外部のスキルのディレクトリが Hermes のプロセスから書き込めるなら、エージェントによるスキルの更新はそのディレクトリのファイルを変えられます。共有する外部のスキルを読み取り専用に保ちたいなら、ファイルシステムの権限か、別のプロファイル・ツール群の設定を使ってください。
- **手元が優先**: 同じ名前のスキルが手元のディレクトリと外部のディレクトリの両方にあるときは、手元のほうが勝ちます。
- **完全に統合されます**: 外部のスキルも、システムのプロンプトの索引、`skills_list`、`skill_view`、`/skill-name` のスラッシュコマンドに現れます。手元のスキルと変わりません。
- **無いパスは黙って飛ばされます**: 設定したディレクトリが存在しなくても、Hermes はエラーを出さずに無視します。端末によって在ったり無かったりする共有のディレクトリに向いています。

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

この4つのスキルがすべて、自分のスキルの索引に現れます。手元に `my-custom-workflow` という名前のスキルを新しく作ると、外部の版が隠れます。

## スキルの作成先を変える（`skills.create_dir`） {#redirecting-skill-creation-skillscreatedir}

既定では、エージェントは新しいスキルをプロファイルごとの `~/.hermes/skills/` に書きます。エージェントが作るスキルを別の場所 — 共有の「頭脳」のディレクトリ、git で管理するリポジトリ、全端末で共有するスキルの置き場 — に置きたいときは、`skills` の節に `create_dir` を設定します。

```yaml
skills:
  create_dir: /opt/brain/skills
```

これで変わるのは次のとおりです。

- **`skill_manage` の create がそこへ書きます。** 新しいスキル（カテゴリのサブディレクトリも含みます）は、手元のスキルのディレクトリではなく `create_dir` の下に作られます。無ければ最初の書き込みのときに作られます。
- **エージェントへの指示も設定に従います。** スキルの作成先を名指しするエージェント向けの指示 — `skill_manage` ツールの説明や関連するプロンプトの文言 — は、設定されたディレクトリを動的に埋め込みます。つまりエージェントは、そこへ作るように伝えられます。システムのプロンプトの上書きや、ファイルシステムの小細工は要りません。
- **そのディレクトリは完全に統合されます。** `create_dir` の下のスキルは手元のディレクトリと並べて走査され、スキルの索引、`skills_list`、`skill_view`、スラッシュコマンドに現れますし、手元のスキルと同じように手を入れたり消したりできます。
- **それ以外は手元のままです。** すでにあるスキルは、どこにあってもその場で書き換えられます。同梱スキルの同期、ハブ、キュレーターは、引き続きプロファイルごとのディレクトリを相手にします。

パスは `~` の展開と `${VAR}` の置き換えに対応し、相対パスは Hermes のホームからの相対として解決されます。`create_dir` に手元のスキルのディレクトリを設定するのは、設定しないのと同じです。

## プロジェクトごとのスキル {#project-local-skills}

リポジトリは自分のスキルを持てます。そのプロジェクトの中で始めたセッションでだけ有効になるもので、他のエージェントの土台がリポジトリごとの設定に使っているのと同じやり方です。git のチェックアウトの中で Hermes を起動すると、次の場所のスキルを探します。

```text
<project-root>/.hermes/skills/    # Hermes-native location
<project-root>/.agents/skills/    # cross-tool convention (shared with other agent CLIs)
```

プロジェクトのルートは、`.git` を含むいちばん近い上位のディレクトリです（worktree と submodule も数えます）。

### プロジェクトを信頼する {#trusting-a-project}

スキルはエージェントが従う手順書なので、Hermes は、適当にクローンしてきたリポジトリからそれを自動では読み込み**ません**。プロジェクトのスキルを持つリポジトリで初めて Hermes を動かすと、冒頭に知らせが出ます。

```text
◆ 3 project skill(s) found in /home/you/myproject but not loaded — run `hermes skills trust` to enable them.
```

そのリポジトリを1度だけ信頼します（中で実行するか、パスを渡します）。

```bash
hermes skills trust             # trust the current repo
hermes skills trust ~/myproject # or explicitly
hermes skills untrust           # revoke
```

信頼したルートは `~/.hermes/config.yaml` の `skills.trusted_project_dirs` に保存されます。`skills.project_discovery: false` にすると、この機能をまるごと止められます（走査もせず、知らせも出ません）。

### 優先の順 {#precedence}

プロジェクトのスキルは**いちばん優先される段**です。`project → local (~/.hermes/skills/) → external_dirs` の順になります。`deploy` という名前のプロジェクトのスキルは、そのリポジトリの中のセッションでは、同じ名前のプロファイルのスキルや同梱のスキルを上書きします。それが狙いです。リポジトリに同梱されたスキルは自分の土俵で勝ち、しかも全体のプロファイルには触れません。プロジェクトのスキルは、エージェントのスキルの索引で `[project]` と印が付くので、出どころが見えたままになります。

外部のディレクトリと同じく、プロジェクトのスキルのディレクトリはリポジトリの持ち物として扱われます。自律的なスキルの手入れ（キュレーター）がそれを書き換えることはありませんし、エージェントが新しく作るスキルは必ず `~/.hermes/skills/` へ行きます。

### 走査したうえでの隔離 {#scan-time-quarantine}

信頼はリポジトリ単位の判断ですが、リポジトリのスキルの中身は `git pull` のたびに変わります。その隙間を埋めるため、プロジェクトのスキルはどれも、索引に入る前に、スキルのハブからのインストールと同じセキュリティ走査を受けます。走査の判定が **dangerous** のスキル（プロンプトを注入する指示、資格情報を持ち出すコマンド、隠し文字の小細工）は隔離されます。スキルの索引にも `skills_list` にもスラッシュコマンドにも現れず、名前で読み込もうとしても理由を添えて断られます。走査の結果は内容のハッシュで `~/.hermes/cache/project_skill_scans/` にキャッシュされ（リポジトリの中には置きません）、スキルの中身が変われば自動で走り直します。

### 対話しない画面（cron、API、ACP） {#non-interactive-surfaces-cron-api-acp}

cron のジョブなど対話しない画面は、対話のときに下した信頼の判断をそのまま引き継ぎます。自分で尋ねることも、勝手に信頼することもありません。プロジェクトのルートは、その画面の作業ディレクトリから解決されます（cron のジョブなら `workdir`。ターミナルのツールと同じ仕組みです）。以前に信頼したリポジトリの中に `workdir` がある cron のジョブは、そのリポジトリのプロジェクトのスキルを読み込みます。信頼していない、あるいはまだ決めていないリポジトリのジョブは、何も読み込みません。

TUI とデスクトップでは、プロジェクトのルートは**セッションごとのワークスペース**（サイドバーに表示され、ワークスペースの選択画面で決めるディレクトリ）に従います。ですから、信頼したリポジトリの中で `hermes --tui` を始めれば、`terminal.cwd` が既定の `.` のままでも、そのリポジトリのプロジェクトのスキルがスラッシュコマンドとして登録されます。2つのリポジトリで2つのセッションを開けば、それぞれが自分のぶんを見ます。

## スキルのまとめ {#skill-bundles}

スキルのまとめは、いくつかのスキルを1つのスラッシュコマンドの下に束ねる、小さな YAML のファイルです。`/<bundle-name>` を実行すると、そのまとめに並んでいるスキルが一度に読み込まれます。ある作業にいつも同じ組み合わせが効く、というときに便利です。

### 短い例 {#quick-example}

```bash
# Create a bundle for backend feature work
hermes bundles create backend-dev \
  --skill github-code-review \
  --skill test-driven-development \
  --skill github-pr-workflow \
  -d "Backend feature work — review, test, PR workflow"
```

そのあと CLI でも、どのゲートウェイのプラットフォームでも次のように使います。

```
/backend-dev refactor the auth middleware
```

エージェントは3つのスキルがまとめて読み込まれた1通のメッセージを受け取り、スラッシュコマンドのあとの文章は利用者の指示として添えられます。

### YAML の書き方 {#yaml-schema}

まとめは **`~/.hermes/skill-bundles/<slug>.yaml`** に置き、こんな形をしています。

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

項目:
- `name`（任意 — 省くとファイル名がそのまま使われます） — まとめの表示名です。スラッシュコマンド用にハイフンの slug へ正規化されます（`Backend Dev` → `/backend-dev`）。
- `description`（任意） — `/bundles` と `hermes bundles list` に出る短い文章です。
- `skills`（必須、空にできない並び） — スキルの名前か、自分のスキルのディレクトリからの相対のパスです。`/<skill-name>` に渡すのと同じ識別子を使ってください。
- `instruction`（任意） — 読み込んだスキルの内容の前に足される案内です。「これらをいつもどう組み合わせて使うか」を書き留めておくのに向いています。

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

チャットのセッションの中では、`/bundles` が入っているまとめとそのスキルをすべて表示します。

### 動き {#behavior}

- slug がぶつかったとき、**まとめが個々のスキルより優先されます**。`research` という名前のまとめを作り、`research` という名前のスキルも持っている場合、`/research` はまとめを呼びます。これは意図した動きです。その名前を付けた時点で、まとめを選んだことになるからです。
- **足りないスキルは飛ばされるだけで、致命的ではありません。** まとめに `skill-foo` が並んでいて、それを入れていない場合でも、解決できたスキルは読み込まれ、飛ばしたものの一覧がエージェントに伝えられます。
- **まとめはどの画面でも動きます。** 対話の CLI、TUI、ダッシュボードのチャット、そしてすべてのゲートウェイのプラットフォーム（Telegram、Discord、Slack など）で使えます。個々のスキルのコマンドと同じ場所で振り分けているからです。
- **まとめはプロンプトのキャッシュを壊しません。** `/<skill-name>` と同じく、呼ばれたときに新しい利用者のメッセージを組み立てるだけで、システムのプロンプトを書き換えません。

### 個々に入れるより、まとめが向いているとき {#when-bundles-beat-installing-each-skill-manually}

次のようなときにまとめを使ってください。
- 繰り返す作業で、いつも同じスキルを組み合わせている（`/backend-dev`、`/release-prep`、`/incident-response`）。
- `/skill` を何回も続けて打つより、頭の中で簡単に扱える形にしたい。
- まとめの YAML を共有の dotfiles のリポジトリに入れ、`~/.hermes/skill-bundles/` へシンボリックリンクを張ることで、チーム全体の「作業の型」を配りたい。

まとめはただの YAML の別名で、スキルを入れてくれるわけではありません。スキル自体はすでに手元にある必要があります（`~/.hermes/skills/` か、外部のスキルのディレクトリに）。無ければ、まとめを呼んだときにそれが飛ばされるだけです。

## エージェントが管理するスキル（skill_manage ツール） {#agent-managed-skills-skillmanage-tool}

エージェントは `skill_manage` ツールを使って、自分のスキルを作り、更新し、消せます。これはエージェントの**手続きの記憶**です。ひととおり工夫の要る進め方を見つけたら、その手順をスキルとして保存し、次から再利用します。

スキルとメモリは、自己改善のループの中で組んで働きます。メモリは、常に文脈にあってほしい
小さくて長持ちする事実を保ち、スキルは、関係するときだけ読み込まれるべき長めの手順を保ちます。
バックグラウンドのレビューは、セッションのあとでスキルの変更を提案したり用意したりできますが、
下の書き込みの承認の関門を使えば、その変更が反映される前に人の目を通すよう求められます。

### エージェントがスキルを作るとき {#when-the-agent-creates-skills}

システムのプロンプトは、工夫の要る進め方を次に活かせるよう `skill_manage` で
書き留めるようエージェントに求めています。実際には次のような場合です。

- 繰り返す価値のある、いくつもの段階からなる進め方を見つけたとき
- エラーや行き止まりにぶつかり、うまくいく道を見つけたとき
- 利用者がやり方を正してくれたとき

### スキルの中身はどんなものか {#what-a-skill-entry-looks-like}

スキルとは、ある種類の作業を、いちばん効率よく正しく、しかも自分の望むやり方で進めるための
指示です。順を追った手順、実際に動くコマンドとツールの呼び方、結果をどんな形にしたいか、
そして時間を奪った落とし穴です。前面のターンで書かれたものでも、バックグラウンドのレビューが
書いたものでも、キュレーターの統合が書いたものでも、そこに残るのは**教訓であって記録では
ありません**。落とし穴とは、一般化された規則に、*なぜ*そうなるか（その仕組み）を1節添えたもので、
関係する手順に結び付け、1回だけ書きます。出来事の語り、PR や
issue の番号、日付、引用したチャットは、スキルの中身ではありません。その規則は、背景の物語が
無くても立っていなければなりません。いつでも当てはまる規則は `SKILL.md` そのものに書きます。
`references/` には、話題ごとに名前を付けた少数のファイル（判断の表、手順、プロバイダーの癖）を
置き、セッションごとに1ファイル増やすのではなく、その場で書き足していきます。また、毎ターン
すでに読み込まれているもの（リポジトリの `AGENTS.md`、ツールのスキーマ）を言い直しません。

`skill_manage` は `create` のとき、`SKILL.md` への手直しのとき、`references/` への
書き込みのときに参考用の lint を走らせ、その指摘をツールの結果に返します。この形のために
用意された規則が3つあります。`incident-log-shape`（PR や issue の番号が詰まった本文）、
`references-sprawl`（参照するファイルが60本を超えている）、`oversized-body`（`SKILL.md` の
本文がおよそ 24k 文字を超えている。`skill_view` はファイル全体を読み込み、その後のセッションの
あいだ文脈に残り続けます）です。これらは警告するだけで、書き込みを止めることはありません。

### 操作 {#actions}

| 操作 | 使いどころ | 主な引数 |
|--------|---------|------------|
| `create` | 新しいスキルを一から作る | `name`、`content`（SKILL.md の全文）、任意で `category` |
| `patch` | 狙いを定めた修正（こちらが基本） | `name`、`old_string`、`new_string` |
| `content` を付けた `patch` | 大きな構造の書き換え（SKILL.md をまるごと差し替えます。`edit` は古い別名です） | `name`、`content` |
| `delete` | スキルをまるごと消す | `name` |
| `write_file` | 補助のファイルを足す・更新する | `name`、`file_path`、`file_content` |
| `remove_file` | 補助のファイルを消す | `name`、`file_path` |

どの操作も、それぞれ別の形として示されます。文章を入れる場所は、1つの操作にだけ属します
（`content` → create と全文の書き換え、`new_string` → 狙いを定めた手直し、`file_content` →
write_file）。別の操作の場所を持った指示 — たとえば `create` に付いた `file_content` — は、
ツールのスキーマに照らして不正です（文法で制約された手元のバックエンドがそれを出すことは
ありません）。それでも届いた場合は、**その一括処理のどの操作も適用される前に**拒まれ、
文章がどのキーに入っていて、どこへ移すべきかを名指しするエラーが返ります。

:::tip
更新には、狙いを定めた `patch` のほうが向いています。変わった文章だけがツールの呼び出しに現れるので、全文の書き換えよりトークンを節約できます。
:::

### エージェントのスキルの書き込みに関門を置く（`skills.write_approval`） {#gating-agent-skill-writes-skillswriteapproval}

既定では、エージェントは自由にスキルを書きます。ターンのあとに走る[バックグラウンドの
自己改善のレビュー](/hermes/docs/user-guide/features/memory/#controlling-memory-writes-write_approval)
からの書き込みも含みます。スキルの書き込みを毎回先に承認したいなら（学んだ内容の見極めを
誤りやすい小さなモデル、厳しく守りたい環境、あるいは単に自己改善のループに目を通したい場合）、
書き込みの承認の関門を有効にしてください。

```yaml
skills:
  write_approval: false     # false = write freely (default) | true = require approval
```

`write_approval: true` のとき、`skill_manage` のすべての書き込み（create / edit /
patch / delete / write_file / remove_file）は、反映されずに**待たされます**。SKILL.md は
その場で読むには大きすぎるので、前面のターンからの書き込みでも、バックグラウンドの
レビューからの書き込みでも、同じように待たされます。
待っている書き込みは `~/.hermes/pending/skills/` に置かれて再起動をまたいで残り、
危ないコマンドと同じ、見慣れた承認・拒否の流れで確認します。

```
/skills pending             # list staged skill writes + a one-line gist each
/skills diff <id>           # full unified diff (best viewed in CLI or dashboard)
/skills approve <id>        # apply it (or 'all')
/skills reject <id>         # drop it (or 'all')
/skills approval on         # turn the gate on (or 'off') and persist it
```

この確認の画面は、対話の CLI でもメッセージのプラットフォームでも使えます
（チャットの吹き出し向けに差分は切り詰められます。全文は CLI か、待ち行列の JSON
ファイルで読んでください）。メモリの書き込みにも
`memory.write_approval` という同じ関門があります。[メモリの書き込みを制御する](/hermes/docs/user-guide/features/memory/#controlling-memory-writes-write_approval)を参照してください。

> これとは別の `skills.guard_agent_created` の設定は、内容を走査するもの
> （危ないパターンの経験則）であって、承認の関門ではありません。この2つは
> 独立しています。[エージェントが作るスキルの書き込みの防護](/hermes/docs/user-guide/configuration/#guard-on-agent-created-skill-writes)を参照してください。

## スキルのハブ {#skills-hub}

オンラインの登録所、`skills.sh`、well-known のスキルの窓口、そして公式の追加スキルから、スキルを見て、探して、入れて、管理します。

絞り込みなしの検索（CLI、TUI、ダッシュボード）には、外部の登録所をまとめてキャッシュした中央の索引が答えます。その索引は定期的に作り直されるので、問い合わせに一致するものが無いときは、Hermes が `skills.sh`、ClawHub、LobeHub、well-known の窓口にも直接尋ねます。数分前に公開されたスキルでも出てくるわけです。この追加の問い合わせに使えるのは検索の持ち時間のうち最大8秒なので、遅い登録所のせいで「見つからない」が長い待ち時間に変わることはありません。独自の GitHub の tap はこの追加の問い合わせの対象外ですし（`--source github` で探すか、索引が追いつくのを待ってください）、`--source nvidia` のような提供元の絞り込みでもこの動きは起きません（それらの登録所は提供元の情報を持っていません）。

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

### 対応している入手元 {#supported-hub-sources}

| 入手元 | 例 | 注記 |
|--------|---------|-------|
| `official` | `official/security/1password` | Hermes に同梱されている追加のスキルです。 |
| `skills-sh` | `skills-sh/vercel-labs/agent-skills/vercel-react-best-practices` | `hermes skills search <query> --source skills-sh` で探せます。skills.sh の slug がリポジトリのフォルダ名と違う場合、Hermes は別名の形のスキルも解決します。 |
| `well-known` | `well-known:https://mintlify.com/docs/.well-known/skills/mintlify` | サイトの `/.well-known/skills/index.json` から直接配られるスキルです。サイトやドキュメントの URL で検索します。 |
| `url` | `https://sharethis.chat/SKILL.md` | `SKILL.md` と、そこから明示的に参照されている補助のファイルへの、直接の HTTP(S) の URL です。名前の決め方は、frontmatter → URL の slug → 対話での入力 → `--name` の順です。 |
| `github` | `openai/skills/k8s` | GitHub のリポジトリやパスからの直接のインストールと、独自の tap です。 |
| `clawhub`、`lobehub`、`browse-sh` | 入手元ごとの識別子 | コミュニティや市場との連携です。 |

### 連携しているハブと登録所 {#integrated-hubs-and-registries}

Hermes はいま、次のスキルのまわりの仕組みや、見つけるための情報源と連携しています。

#### 1. 公式の追加スキル（`official`） {#1-official-optional-skills-official}

Hermes のリポジトリ自体で保守されているもので、組み込みの信頼を持って入ります。

- 一覧: [公式の追加スキル一覧](/hermes/docs/reference/optional-skills-catalog/)
- リポジトリ内の場所: `optional-skills/`
- 例:

```bash
hermes skills browse --source official
hermes skills install official/security/1password
```

#### 2. skills.sh（`skills-sh`） {#2-skillssh-skills-sh}

Vercel が公開しているスキルのディレクトリです。Hermes はこれを直接検索し、スキルの詳細ページを見て、別名の形の slug を解決し、元のリポジトリから入れられます。

- ディレクトリ: [skills.sh](https://skills.sh/)
- CLI とツールのリポジトリ: [vercel-labs/skills](https://github.com/vercel-labs/skills)
- Vercel の公式スキルのリポジトリ: [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)
- 例:

```bash
hermes skills search react --source skills-sh
hermes skills inspect skills-sh/vercel-labs/json-render/json-render-react
hermes skills install skills-sh/vercel-labs/json-render/json-render-react --force
```

#### 3. well-known のスキルの窓口（`well-known`） {#3-well-known-skill-endpoints-well-known}

`/.well-known/skills/index.json` を公開しているサイトから、URL で見つける方法です。1つに集約されたハブではなく、Web 上の見つけ方の取り決めです。

- 動いている窓口の例: [Mintlify のドキュメントのスキルの索引](https://mintlify.com/docs/.well-known/skills/index.json)
- 参考になるサーバーの実装: [vercel-labs/skills-handler](https://github.com/vercel-labs/skills-handler)
- 例:

```bash
hermes skills search https://mintlify.com/docs --source well-known
hermes skills inspect well-known:https://mintlify.com/docs/.well-known/skills/mintlify
hermes skills install well-known:https://mintlify.com/docs/.well-known/skills/mintlify
```

#### 4. GitHub から直接（`github`） {#4-direct-github-skills-github}

Hermes は GitHub のリポジトリや、GitHub を土台にした tap から直接入れられます。リポジトリとパスがすでに分かっているときや、自分の独自の入手元のリポジトリを足したいときに便利です。

既定の tap（設定なしで見られます）:
- [openai/skills](https://github.com/openai/skills)
- [anthropics/skills](https://github.com/anthropics/skills)
- [huggingface/skills](https://github.com/huggingface/skills)
- [NVIDIA/skills](https://github.com/NVIDIA/skills) — NVIDIA が検証したスキル（署名された `skill.oms.sig` と、運営のための `skill-card.md` 付き）
- [garrytan/gstack](https://github.com/garrytan/gstack)
- [K-Dense-AI/scientific-agent-skills](https://github.com/K-Dense-AI/scientific-agent-skills) と [synthetic-sciences/openscience](https://github.com/synthetic-sciences/openscience) — およそ480本の科学研究向けスキル（バイオインフォマティクス、化学、物理、機械学習の学習、学術のためのツール）で、`science` という1つのカテゴリにまとめられています。信頼はコミュニティの段階で、どのインストールもセキュリティ走査を受けます。多くは自前のライセンスを持つ第三者のツールを包んでいるので（GPL のものもあり、KEGG は学術以外の利用に商用ライセンスが要ります）、スキルごとの前提条件を確認してください。

- 例:

```bash
hermes skills install openai/skills/k8s
hermes skills tap add myorg/skills-repo
```

**カテゴリのまとめ方（`skills.sh.json`）。** GitHub の tap は、リポジトリのルートに
[skills.sh のスキーマ](https://skills.sh/schemas/skills.sh.schema.json)に沿った
`skills.sh.json` を置けます。その
`groupings`（それぞれ `title` とスキル名の並びを持ちます）が索引を作るときに読まれ、
[スキルのハブ](https://hermes-agent.nousresearch.com/docs)のページに出るカテゴリの
ラベルになります。タグからの推測に頼らずに済むわけです。これは特定の tap 向けではありません。
このファイルを置いた tap はどれも本物の分類を得られ、Hermes 側の変更は要りません。

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

コミュニティの入手元として組み込まれた、第三者のスキルの市場です。

- サイト: [clawhub.ai](https://clawhub.ai/)
- Hermes での入手元 id: `clawhub`

#### 6. LobeHub（`lobehub`） {#6-lobehub-lobehub}

Hermes は LobeHub の公開されている一覧を検索し、そこのエージェントの項目を、入れられる Hermes のスキルへ変換できます。

- サイト: [LobeHub](https://lobehub.com/)
- 公開エージェントの索引: [chat-agents.lobehub.com](https://chat-agents.lobehub.com/)
- 元のリポジトリ: [lobehub/lobe-chat-agents](https://github.com/lobehub/lobe-chat-agents)
- Hermes での入手元 id: `lobehub`

#### 7. browse.sh（`browse-sh`） {#7-browsesh-browse-sh}

Hermes は [browse.sh](https://browse.sh) と連携しています。Browserbase が集めた、サイトごとのブラウザ操作の SKILL.md が200本以上ある一覧です（Airbnb、Amazon、arXiv、12306.cn、Etsy、Xero など）。各スキルは、1つのサイトを最初から最後まで操作するやり方を書いたもので、Hermes のブラウザのツールや、すでに入れているブラウザ操作のスキルと組み合わせて使えます。

- サイト: [browse.sh](https://browse.sh/)
- 一覧の API: `https://browse.sh/api/skills`
- Hermes での入手元 id: `browse-sh`
- 信頼の段階: `community`

```bash
hermes skills search airbnb --source browse-sh
hermes skills inspect browse-sh/airbnb.com/search-listings-ddgioa
hermes skills install browse-sh/airbnb.com/search-listings-ddgioa
```

識別子は `browse-sh/<hostname>/<task-id>` の形で、browse.sh の一覧が出している slug と一致します。中身は、一覧の GitHub の `sourceUrl` ではなく、スキルごとの詳細の窓口（`/api/skills/<slug>` → `skillMdUrl`）を通して取得されます。

#### 8. URL から直接（`url`） {#8-direct-url-url}

どんな HTTP(S) の URL からでも `SKILL.md` を直接入れられます。作者が自分のサイトでスキルを配っているとき（ハブに載っておらず、打ち込む GitHub のパスも無いとき）に便利です。Hermes は `references/`、`templates/`、`scripts/`、`assets/`、`examples/` の下で明示的に参照されているファイルも取得し、束ごと走査して入れます。

- Hermes での入手元 id: `url`
- 識別子: URL そのもの（前置きは要りません）
- 範囲: `SKILL.md` と、許可されたディレクトリの中で実際に参照されている補助のファイルです。Hermes が、配信元の関係ない他のファイルを列挙したり複製したりすることはありません。

```bash
hermes skills install https://sharethis.chat/SKILL.md
hermes skills install https://example.com/my-skill/SKILL.md --category productivity
```

名前の決め方は、次の順です。
1. SKILL.md の YAML frontmatter の `name:` の項目（きちんと書かれたスキルなら必ずあるので、これが基本です）。
2. URL のパスの、1つ上のディレクトリの名前（例: `.../my-skill/SKILL.md` → `my-skill`、`.../my-skill.md` → `my-skill`）。正しい識別子の形（`^[a-z][a-z0-9_-]*$`）のときに限ります。
3. 端末が TTY を持つときの、対話での入力。
4. 対話しない画面（TUI の中の `/skills install` のスラッシュコマンド、ゲートウェイのプラットフォーム、スクリプト）では、`--name` での指定を案内する分かりやすいエラー。

```bash
# Frontmatter has no name and the URL slug is unhelpful — supply one:
hermes skills install https://example.com/SKILL.md --name sharethis-chat

# Or inside a chat session:
/skills install https://example.com/SKILL.md --name sharethis-chat
```

信頼の段階は常に `community` で、他のどの入手元とも同じセキュリティ走査が走ります。URL がインストールの識別子として保存されるので、更新したくなったとき `hermes skills update` が同じ URL から自動で取り直します。

### セキュリティ走査と `--force` {#security-scanning-and---force}

ハブから入れるスキルはすべて、データの持ち出し、プロンプトの注入、破壊的なコマンド、供給経路の危険な兆候などを調べる**セキュリティ走査**を通ります。

`hermes skills inspect ...` は、分かる範囲で上流の情報も表示するようになりました。
- リポジトリの URL
- skills.sh の詳細ページの URL
- インストールのコマンド
- 週あたりのインストール数
- 上流のセキュリティ監査の状態
- well-known の索引や窓口の URL

第三者のスキルを自分で確認したうえで、dangerous ではない方針上の遮断を越えたいときは `--force` を使います。

```bash
hermes skills install skills-sh/anthropics/skills/pdf --force
```

大事な動き:
- `--force` は、caution や warn の類の指摘による方針上の遮断を越えられます。
- `--force` は `dangerous` の判定を越えることは**できません**。
- 公式の追加スキル（`official/...`）は組み込みの信頼として扱われ、第三者向けの警告の画面は出ません。

### 信頼の段階 {#trust-levels}

| 段階 | 入手元 | 方針 |
|-------|--------|--------|
| `builtin` | Hermes に同梱 | 常に信頼されます |
| `official` | リポジトリの `optional-skills/` | 組み込みの信頼で、第三者向けの警告は出ません |
| `trusted` | `openai/skills`、`anthropics/skills`、`huggingface/skills`、`NVIDIA/skills` などの信頼された登録所やリポジトリ | コミュニティの入手元より緩やかな方針 |
| `community` | それ以外すべて（`skills.sh`、well-known の窓口、独自の GitHub のリポジトリ、たいていの市場） | dangerous でない指摘は `--force` で越えられます。`dangerous` の判定は遮断されたままです |

### 更新の流れ {#update-lifecycle}

ハブは、入れたスキルの上流の版を確かめ直せるだけの出どころを記録するようになりました。

```bash
hermes skills check          # Report which installed hub skills changed upstream
hermes skills update         # Reinstall only the skills with updates available
hermes skills update react   # Update one specific installed hub skill
hermes skills update react --force   # Overwrite a skill you've edited locally
```

保存された入手元の識別子と、いまの上流の束の内容のハッシュを使って、ずれを見つけます。

無いインストールやディレクトリでないインストール（`orphaned`）、安全でない・解決できない記録されたパス（`invalid_install`）については、ネットワークへの問い合わせを飛ばします。ディレクトリの無い項目は `hermes skills uninstall <name>` で取り除けます。不正なパスは、再試行の前に、使っているプロファイルの `skills/.hub/lock.json` を確認して直す必要があります。自動で取り除かれる項目はありません。

正しく入っているものは、これまでどおり入手元ごとの同期的な取得と通信のタイムアウトを使います。更新の確認に厳密な全体の期限はありません。すでに入っているものの入手元が届かなかったり遅かったりすると、そのあとの項目が遅れることはあり得ます。

手元で編集したスキル（ディスク上の内容が、入れたときに記録したハッシュと合わなくなったもの）は `hermes skills update` から**飛ばされる**ので、変更が黙って上書きされることはありません。それでも上流の版に置き換えたいときは `--force` を付けてください。

:::tip GitHub の回数制限
スキルのハブの操作は GitHub の API を使います。認証していない場合、1時間あたり60回という制限があります。インストールや検索の途中で制限のエラーが出たら、`.env` に `GITHUB_TOKEN` を設定すると1時間あたり5,000回まで上がります。この場合、エラーの文言にも対処の手がかりが添えられます。
:::

### 独自の tap を公開する {#publishing-a-custom-skill-tap}

選りすぐったスキルを配りたいなら — チーム向け、組織向け、あるいは広く公開して — **tap** として公開できます。他の Hermes の利用者が `hermes skills tap add <owner/repo>` で足せる GitHub のリポジトリです。サーバーも、登録所への申し込みも、リリースの仕組みも要りません。`SKILL.md` を並べたディレクトリがあればいいのです。

#### リポジトリの構成 {#repo-layout}

tap は、次のように並べた GitHub のリポジトリです（公開でも非公開でも。非公開には `GITHUB_TOKEN` が要ります）。

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
- 各スキルは、tap のルートのパス（既定は `skills/`）の下の、自分のディレクトリに置きます。
- ディレクトリの名前が、そのスキルの識別子になります。
- 各スキルのディレクトリには、標準の [SKILL.md の frontmatter](#skillmd-format)（`name`、`description`、加えて任意で `metadata.hermes.tags`、`version`、`author`、`platforms`、`metadata.hermes.config`）を持つ `SKILL.md` が必要です。
- `references/`、`templates/`、`scripts/`、`assets/` といったサブディレクトリは、インストール時に `SKILL.md` と一緒に取得されます。
- ディレクトリ名が `.` か `_` で始まるスキルは無視されます。

Hermes は、tap のパスの下のサブディレクトリを列挙し、それぞれに `SKILL.md` があるか調べることでスキルを見つけます。

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

これを GitHub に push すれば、どの Hermes の利用者も登録して入れられます。

```bash
hermes skills tap add my-org/hermes-skills
hermes skills search deploy
hermes skills install my-org/hermes-skills/deploy-runbook
```

#### 既定と違うパス {#non-default-paths}

スキルが `skills/` の下に無い場合（既存のプロジェクトに `skills/` の枝を足すときによくあります）、`~/.hermes/skills/.hub/taps.json` の tap の項目を編集します。

```json
{
  "taps": [
    {"repo": "my-org/platform-docs", "path": "internal/skills/"}
  ]
}
```

`hermes skills tap add` の CLI は、新しい tap の既定を `path: "skills/"` にします。別のパスが要るときはファイルを直接編集してください。`hermes skills tap list` は、tap ごとに実際に使われているパスを表示します。

#### tap を足さずに1本ずつ入れる {#installing-individual-skills-directly-without-adding-a-tap}

リポジトリ全体を tap として足さなくても、公開されている GitHub のリポジトリから1本だけ入れられます。

```bash
hermes skills install owner/repo/skills/my-workflow
```

登録所ごと購読してもらわなくても、1本のスキルを渡したいときに便利です。

#### tap の信頼の段階 {#trust-levels-for-taps}

新しい tap には既定で `community` の信頼が与えられます。そこから入れたスキルは標準のセキュリティ走査を通り、初回のインストールで第三者向けの警告の画面が出ます。自分の組織や、広く信頼されている入手元をより高い信頼にすべき場合は、そのリポジトリを `tools/skills_guard.py` の `TRUSTED_REPOS` に足してください（Hermes 本体への PR が必要です）。

#### tap の管理 {#tap-management}

```bash
hermes skills tap list                                # show all configured taps
hermes skills tap add myorg/skills-repo               # add (default path: skills/)
hermes skills tap remove myorg/skills-repo            # remove
```

動いているセッションの中では次のようにします。

```
/skills tap list
/skills tap add myorg/skills-repo
/skills tap remove myorg/skills-repo
```

tap は `~/.hermes/skills/.hub/taps.json` に保存されます（必要になったときに作られます）。

## 同梱スキルの更新（`hermes skills reset`） {#bundled-skill-updates-hermes-skills-reset}

Hermes は、リポジトリの `skills/` に同梱のスキルを持っています。インストール時と `hermes update` のたびに、同期の処理がそれらを `~/.hermes/skills/` へ複製し、同期した時点での内容のハッシュ（**元のハッシュ**）とスキル名の対応を `~/.hermes/skills/.bundled_manifest` に記録します。

同期のたびに、Hermes は手元の複製のハッシュを計算し直し、元のハッシュと比べます。

- **変わっていない** → 上流の変更を取り込んでよいので、新しい同梱の版を複製し、新しい元のハッシュを記録します。
- **変わっている** → **利用者が手を入れた**ものとして扱い、以後ずっと飛ばします。編集が踏みつぶされることはありません。

スキルの中に生成される実行時のキャッシュ（`__pycache__/`、`.pytest_cache/`、`.mypy_cache/`、`.ruff_cache/`、そして `.py` の隣に置かれる `.pyc`）はハッシュの対象外です。ですから、スキルの補助のスクリプトを動かしても、それが「利用者が手を入れた」扱いになったり、`hermes skills list-modified` や `diff` から隠れたりすることはありません。

この守りはよくできていますが、1つだけ鋭い角があります。同梱のスキルを編集したあとで、その変更をやめて同梱の版に戻ろうと、`~/.hermes/hermes-agent/skills/` から単に複製し直した場合、記録には最後に同期が成功したときの*古い*元のハッシュが残ったままです。複製し直した中身（いまの同梱のハッシュ）はその古い元のハッシュと合わないので、同期はそれを「利用者が手を入れた」と言い続けます。

`hermes skills reset` がその抜け道です。

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

同じコマンドは、チャットの中でもスラッシュコマンドとして使えます。

```text
/skills reset google-workspace
/skills reset google-workspace --restore
```

:::note プロファイル
プロファイルごとに、自分の `HERMES_HOME` の下に自分の `.bundled_manifest` を持ちます。ですから `hermes -p coder skills reset <name>` は、そのプロファイルにだけ効きます。
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

公式の追加スキルは、いまも `official/security/1password` や `official/migration/openclaw-migration` のような識別子を使います。
