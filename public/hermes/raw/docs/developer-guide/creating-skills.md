---
title: "スキルを作る"
description: "Hermes Agent 向けのスキルの作り方 — SKILL.md の書式、指針、公開まで"
upstream_path: developer-guide/creating-skills.md
upstream_blob: 25d023ed57c826d473a451b83921103e4f465d56
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/creating-skills
---

# スキルを作る {#creating-skills}

Hermes Agent に新しいことをさせたいときは、スキルにするのがいちばんの近道です。ツールより作るのが簡単で、エージェント側のコードには手を入れずに済み、ほかの人と分け合うこともできます。

## スキルにするか、ツールにするか {#should-it-be-a-skill-or-a-tool}

次のような場合は **スキル** にします。

- やりたいことを、手順の説明とシェルのコマンド、それに既存のツールの組み合わせで書き表せる
- 外部の CLI や API を包むだけで、エージェントは `terminal` や `web_extract` から呼べる
- Python での作り込みや、エージェント本体に API キーの管理を組み込む必要がない
- 例: arXiv の検索、git の作業手順、Docker の管理、PDF の処理、CLI ツールを使ったメール送信

次のような場合は **ツール** にします。

- API キー、認証の流れ、複数の部品にまたがる設定まで含めて、ひととおり組み込む必要がある
- 毎回きっちり同じ順に動かないと困る、独自の処理がある
- バイナリのデータ、ストリーミング、リアルタイムのイベントを扱う
- 例: ブラウザの自動操作、音声合成、画像の解析

## スキルのディレクトリ構成 {#skill-directory-structure}

同梱のスキルは `skills/` の下にカテゴリ別に置かれています。公式の任意スキルも、`optional-skills/` に同じ構成で入っています。

```text
skills/
├── research/
│   └── arxiv/
│       ├── SKILL.md              # Required: main instructions
│       └── scripts/              # Optional: helper scripts
│           └── search_arxiv.py
├── productivity/
│   └── ocr-and-documents/
│       ├── SKILL.md
│       ├── scripts/
│       └── references/
└── ...
```

## SKILL.md の書式 {#skillmd-format}

```markdown
---
name: my-skill
description: Brief description (shown in skill search results)
version: 1.0.0
author: Your Name
license: MIT
platforms: [macos, linux]          # Optional — restrict to specific OS platforms
                                   #   Valid: macos, linux, windows
                                   #   Omit to load on all platforms (default)
metadata:
  hermes:
    tags: [Category, Subcategory, Keywords]
    related_skills: [other-skill-name]
    requires_toolsets: [web]            # Optional — only show when these toolsets are active
    requires_tools: [web_search]        # Optional — only show when these tools are available
    fallback_for_toolsets: [browser]    # Optional — hide when these toolsets are active
    fallback_for_tools: [browser_navigate]  # Optional — hide when these tools exist
    config:                              # Optional — config.yaml settings the skill needs
      - key: my.setting
        description: "What this setting controls"
        default: "sensible-default"
        prompt: "Display prompt for setup"
    blueprint:                              # Optional — marks this skill a runnable automation
      schedule: "0 9 * * *"              #   cron expr / "every 2h" / ISO timestamp
      deliver: origin                    #   optional (default origin)
      prompt: "Task instruction for each run"  # optional
      no_agent: false                    # optional
required_environment_variables:          # Optional — env vars the skill needs
  - name: MY_API_KEY
    prompt: "Enter your API key"
    help: "Get one at https://example.com"
    required_for: "API access"
---

# Skill Title

Brief intro.

## When to Use
Trigger conditions — when should the agent load this skill?

## Quick Reference
Table of common commands or API calls.

## Procedure
Step-by-step instructions the agent follows.

## Pitfalls
Known failure modes and how to handle them.

## Verification
How the agent confirms it worked.
```

### プラットフォームを限定したスキル {#platform-specific-skills}

`platforms` の項目を使うと、スキルを特定の OS だけに限定できます。

```yaml
platforms: [macos]            # macOS only (e.g., iMessage, Apple Reminders)
platforms: [macos, linux]     # macOS and Linux
platforms: [windows]          # Windows only
```

指定しておくと、合わない環境ではシステムプロンプトからも `skills_list()` からもスラッシュコマンドからも自動的に外れます。書かなかった場合や空の場合は、どの環境でも読み込まれます（従来どおりの動きです）。

### 条件によって出し分ける {#conditional-skill-activation}

スキルは、特定のツールやツールセットに依存することを宣言できます。これによって、そのセッションのシステムプロンプトにスキルを載せるかどうかが決まります。

```yaml
metadata:
  hermes:
    requires_toolsets: [web]           # Hide if the web toolset is NOT active
    requires_tools: [web_search]       # Hide if web_search tool is NOT available
    fallback_for_toolsets: [browser]   # Hide if the browser toolset IS active
    fallback_for_tools: [browser_navigate]  # Hide if browser_navigate IS available
```

| 項目 | 動き |
|-------|----------|
| `requires_toolsets` | 挙げたツールセットのどれかが使えないとき、スキルは**隠れます** |
| `requires_tools` | 挙げたツールのどれかが使えないとき、スキルは**隠れます** |
| `fallback_for_toolsets` | 挙げたツールセットのどれかが使えるとき、スキルは**隠れます** |
| `fallback_for_tools` | 挙げたツールのどれかが使えるとき、スキルは**隠れます** |

**`fallback_for_*` の使いどころ:** 本命のツールが使えないときの代わりになるスキルを作れます。たとえば `fallback_for_tools: [web_search]` を付けた `duckduckgo-search` スキルは、API キーが要るウェブ検索ツールが設定されていないときにだけ出てきます。

**`requires_*` の使いどころ:** あるツールが揃っているときにだけ意味を持つスキルを作れます。たとえば `requires_toolsets: [web]` を付けたウェブ収集の手順スキルは、ウェブ系のツールを切っているときにプロンプトを無駄に埋めません。

### 必要な環境変数 {#environment-variable-requirements}

スキルは、自分に必要な環境変数を宣言できます。`skill_view` でスキルが読み込まれると、宣言された変数は、隔離された実行環境（terminal、execute_code）へ渡すものとして自動で登録されます。

```yaml
required_environment_variables:
  - name: TENOR_API_KEY
    prompt: "Tenor API key"               # Shown when prompting user
    help: "Get your key at https://tenor.com"  # Help text or URL
    required_for: "GIF search functionality"   # What needs this var
```

それぞれの項目で書けるのは次のとおりです。

- `name`（必須） — 環境変数の名前
- `prompt`（任意） — 値を尋ねるときに出す文言
- `help`（任意） — 値の入手先を示す説明や URL
- `required_for`（任意） — どの機能にこの変数が要るのかの説明

利用者は `config.yaml` で、渡す変数を自分で指定することもできます。

```yaml
terminal:
  env_passthrough:
    - MY_CUSTOM_VAR
    - ANOTHER_VAR
```

macOS 専用スキルの例は `skills/apple/` にあります。

## 読み込み時に安全に設定する {#secure-setup-on-load}

スキルに API キーやトークンが要るときは `required_environment_variables` を使います。値が入っていなくても、スキルが見つからなくなるわけでは**ありません**。手元の CLI でスキルを読み込むときに、Hermes が安全な形で値を尋ねます。

```yaml
required_environment_variables:
  - name: TENOR_API_KEY
    prompt: Tenor API key
    help: Get a key from https://developers.google.com/tenor
    required_for: full functionality
```

設定を飛ばしたままスキルを読み込むこともできます。Hermes が秘密の値そのものをモデルに見せることはありません。ゲートウェイやメッセージ経由のセッションでは、値をその場で集めるのではなく、手元で設定するための案内が出ます。

:::tip 隔離環境への受け渡し
スキルが読み込まれると、`required_environment_variables` に書かれていて値が入っている変数は、`execute_code` と `terminal` の隔離環境へ**自動で渡されます**。Docker や Modal といった遠隔のバックエンドでも同じです。スキルのスクリプトからは、利用者が追加の設定をしなくても `$TENOR_API_KEY`（Python なら `os.environ["TENOR_API_KEY"]`）を読めます。詳しくは [環境変数の受け渡し](/hermes/docs/user-guide/security/#environment-variable-passthrough) を参照してください。
:::

古い書き方の `prerequisites.env_vars` も、そのまま使えるように残してあります。

### 設定項目（config.yaml） {#config-settings-configyaml}

スキルは、秘密ではない設定項目を宣言できます。値は `config.yaml` の `skills.config` の下に保存されます。`.env` に置く環境変数（秘密）とは違って、こちらはパスや好みなど、見られて困らない値のためのものです。

```yaml
metadata:
  hermes:
    config:
      - key: myplugin.path
        description: Path to the plugin data directory
        default: "~/myplugin-data"
        prompt: Plugin data directory path
      - key: myplugin.domain
        description: Domain the plugin operates on
        default: ""
        prompt: Plugin domain (e.g., AI/ML research)
```

それぞれの項目で書けるのは次のとおりです。

- `key`（必須） — 設定のドット区切りのパス（例: `myplugin.path`）
- `description`（必須） — その設定が何を左右するのかの説明
- `default`（任意） — 利用者が設定しなかったときの既定値
- `prompt`（任意） — `hermes config migrate` のときに出す文言。書かなければ `description` が使われます

**動きの流れ:**

1. **保存:** 値は `config.yaml` の `skills.config.<key>` の下に書かれます。
   ```yaml
   skills:
     config:
       myplugin:
         path: ~/my-data
   ```

2. **見つけ方:** `hermes config migrate` が有効なスキルをすべて調べ、まだ設定されていない項目を見つけて利用者に尋ねます。設定は `hermes config show` の "Skill Settings" にも出てきます。

3. **実行時の差し込み:** スキルが読み込まれると、設定値が解決されてスキルのメッセージに付け足されます。
   ```
   [Skill config (from ~/.hermes/config.yaml):
     myplugin.path = /home/user/my-data
   ]
   ```
   エージェントは `config.yaml` を自分で読まなくても、設定された値を見られます。

4. **手で設定する:** 値を直接書き込むこともできます。
   ```bash
   hermes config set skills.config.myplugin.path ~/my-data
   ```

:::tip どちらを使うか
API キーやトークンなど**秘密**にあたるものには `required_environment_variables` を使います（`~/.hermes/.env` に保存され、モデルには見せません）。パスや好みなど**秘密でない設定**には `config` を使います（`config.yaml` に保存され、config show に出てきます）。
:::

### 認証情報のファイル（OAuth のトークンなど） {#credential-file-requirements-oauth-tokens-etc}

OAuth やファイル形式の認証情報を使うスキルは、遠隔の隔離環境へ持ち込む必要のあるファイルを宣言できます。これは環境変数ではなく**ファイル**として保存された認証情報のためのもので、たいていはセットアップ用のスクリプトが作る OAuth のトークンファイルです。

```yaml
required_credential_files:
  - path: google_token.json
    description: Google OAuth2 token (created by setup script)
  - path: google_client_secret.json
    description: Google OAuth2 client credentials
```

それぞれの項目で書けるのは次のとおりです。

- `path`（必須） — `~/.hermes/` からの相対パス
- `description`（任意） — そのファイルが何で、どう作られるのかの説明

読み込み時に、Hermes はこれらのファイルがあるかどうかを確かめます。無ければ `setup_needed` になります。あるファイルは自動的に次のように扱われます。

- **Docker** のコンテナには読み取り専用でマウントされます
- **Modal** の隔離環境には同期されます（作成時と、コマンドを実行するたび。そのため途中で OAuth をやり直しても効きます）
- **ローカル**のバックエンドでは、特別なことをしなくてもそのまま使えます

:::tip どちらを使うか
単純な API キーやトークンには `required_environment_variables` を使います（`~/.hermes/.env` に文字列として保存されます）。OAuth のトークンファイル、クライアントシークレット、サービスアカウントの JSON、証明書など、ディスク上のファイルになっている認証情報には `required_credential_files` を使います。
:::

両方を使った例の全体は `skills/productivity/google-workspace/SKILL.md` にあります。

## スキルを書くときの指針 {#skill-guidelines}

### 外部の依存を持ち込まない {#no-external-dependencies}

Python の標準ライブラリ、curl、それに Hermes に元からあるツール（`web_extract`、`terminal`、`read_file`）で済ませてください。どうしても依存が要るなら、入れ方をスキルの中に書いておきます。

### よく使うものを先に書く {#progressive-disclosure}

いちばんよく通る手順を先頭に置きます。例外的な使い方や凝った使い方は下のほうにまとめます。こうしておくと、ふだんの作業でのトークンの消費が抑えられます。

### 補助スクリプトを添える {#include-helper-scripts}

XML や JSON の解析、込み入った処理は、`scripts/` に補助スクリプトとして入れておきます。毎回 LLM にその場で書かせるのは避けてください。

### メディアはファイルとして届ける（`[[as_document]]`） {#deliver-media-as-documents-asdocument}

高解像度の画面写真や図など、プレビュー用に圧縮されると困る画像をスキルが作るときは、返答のどこか（多くは最終行）に `[[as_document]]` という文字列をそのまま書きます。ゲートウェイはこの指定を取り除き、その返答から取り出したメディアを、画像として並べる代わりにダウンロードできる添付ファイルとして届けます。細かい決まりは [スキルの出力とメディアの届け方](/hermes/docs/user-guide/features/skills/#skill-output-and-media-delivery) を参照してください。

#### SKILL.md から同梱スクリプトを指す {#referencing-bundled-scripts-from-skillmd}

スキルが読み込まれると、有効化のメッセージにスキルのディレクトリの絶対パスが `[Skill directory: /abs/path]` として載ります。さらに、SKILL.md の本文にある次の 2 つの記号は、どこに書いてあっても置き換えられます。

| 記号 | 置き換わるもの |
|---|---|
| `${HERMES_SKILL_DIR}` | スキルのディレクトリの絶対パス |
| `${HERMES_SESSION_ID}` | 動いているセッションの ID（セッションが無ければそのまま残ります） |

そのため、SKILL.md からエージェントに同梱スクリプトを直接動かさせるには、こう書けます。

```markdown
To analyse the input, run:

    node ${HERMES_SKILL_DIR}/scripts/analyse.js <input>
```

エージェントは置き換わったあとの絶対パスを見て、そのまま動かせるコマンドとして `terminal` ツールを呼びます。パスを組み立て直す必要も、`skill_view` をもう一度呼ぶ必要もありません。置き換えをやめたいときは、`config.yaml` で `skills.template_vars: false` にします。

#### 本文に埋め込むシェルの断片（既定では無効） {#inline-shell-snippets-opt-in}

SKILL.md の本文には、`` !`cmd` `` という書き方でシェルの断片を埋め込むこともできます。有効にしておくと、エージェントがメッセージを読む前に、その断片の標準出力が本文へ差し込まれます。そのため、スキルがその場の情報を持ち込めます。

```markdown
Current date: !`date -u +%Y-%m-%d`
Git branch: !`git -C ${HERMES_SKILL_DIR} rev-parse --abbrev-ref HEAD`
```

これは**既定では無効**です。SKILL.md に書かれた断片は、確認を挟まずにそのまま手元の環境で動きます。信用できる配布元のスキルにだけ有効にしてください。

```yaml
# config.yaml
skills:
  inline_shell: true
  inline_shell_timeout: 10   # seconds per snippet
```

断片はスキルのディレクトリを作業ディレクトリとして動き、出力は 4000 文字までに切られます。時間切れや異常終了で失敗したときは、スキル全体が壊れるのではなく、`[inline-shell error: ...]` という短い印が出ます。

### 試してみる {#test-it}

スキルを動かして、エージェントが指示どおりに動くか確かめます。

```bash
hermes chat --toolsets skills -q "Use the X skill to do Y"
```

## スキルはどこに置くか {#where-should-the-skill-live}

同梱のスキル（`skills/` にあるもの）は、Hermes を入れれば必ず付いてきます。ですから、**多くの利用者にとって広く役に立つもの**であるべきです。

- 文書の扱い、ウェブでの調べもの、よくある開発の手順、システムの管理
- 幅広い人がふだんから使うもの

公式ではあっても、誰にでも要るわけではないもの（有料サービスとの連携、重い依存が要るものなど）は **`optional-skills/`** に置きます。リポジトリには同梱され、`hermes skills browse` から「official」の表示付きで見つけられ、信用された状態で入ります。

用途が限られたもの、有志が作ったもの、ごく狭い分野のものは、**Skills Hub** のほうが向いています。登録先にアップロードして、`hermes skills install` で分け合えます。

## ブループリント: 自動実行もできるスキル {#blueprints-skills-that-are-also-automations}

**ブループリント** とは、ふつうのスキルの先頭にスケジュールを書き足したものです。`metadata.hermes.blueprint` のかたまりを足せば、そのスキルは、人に渡せて自動で動く仕組みになります。

```yaml
metadata:
  hermes:
    tags: [blueprint, email]
    blueprint:
      schedule: "0 8 * * *"     # presence of `blueprint:` marks it runnable
      deliver: telegram          # optional (default: origin)
      prompt: "Summarize my unread email and today's calendar."  # optional
      no_agent: false            # optional
```

ブループリントはスキル**そのもの**なので、スキルの仕組みをそのまま通ります。検索、中身の確認、インストール、安全性の検査、出どころの記録、tap、まとめられた索引、それに共有のための `hermes skills publish` まで、何ひとつ変わりません。新しく覚えることはありません。

**ブループリントを入れると。** `blueprint:` のかたまりを持つスキルを入れると、Hermes はそれを**候補として提案される定期実行**に登録します。実際に動かすかどうかは**自分で決めます**。入れただけで定期実行が黙って作られることはありません。`/suggestions` で内容を見て受け入れます。

```bash
hermes skills install owner/morning-brief
# → Blueprint: 'morning-brief' is an automation (schedule 0 8 * * *).
#   Added to your suggestions — run /suggestions to schedule or dismiss it.

# then, in a session:
/suggestions             # lists pending suggestions, numbered
/suggestions accept 1    # creates the cron job
/suggestions dismiss 1   # never offer it again
```

ブループリントは、まとめられた定期実行の提案の**出どころ**の 1 つです。同じ場所に、選りすぐりの入門用の自動処理や、のちのち使い方の傾向や連携から生まれる提案も並びます。下の [提案される定期実行](#suggested-cron-jobs) を参照してください。

**作った自動処理を分け合う。** 定期実行（`hermes cron create --skill <name> ...`）から読み込まれているブループリントは、SKILL.md に書き出して、ほかのスキルと同じように公開できます。自分向けに調整した自動処理が、ほかの人にとってはコマンド 1 つで入るものになります。

ブループリントの仕組みは、新しい種類のものも、新しい保管場所も、新しい受け渡しの経路も増やしません。ブループリントはスキルであり、スケジュールは定期実行であり、共有は今までどおりの publish・tap・索引の道筋です。

## 提案される定期実行 {#suggested-cron-jobs}

Hermes は、定期実行を自分で組み立てさせる代わりに、自動処理を*提案*して、ひと押しで受け入れられるようにできます。どこから来た提案でも、出てくる場所は `/suggestions` コマンドの 1 か所です。

| 出どころ | きっかけ |
|--------|---------|
| `catalog` | 選りすぐりの入門用の自動処理（`/suggestions catalog`）。日々のまとめ、大事なメールの見張り、週の振り返り、始業時の声かけ |
| `blueprint` | `blueprint:` のかたまりを持つスキルを入れたとき |
| `usage` | 裏で動く見直しが、定期実行にすると良さそうな繰り返しの頼みごとに気づいたとき |
| `integration` | アカウント（Gmail、GitHub など）をつないだときに、思い当たる自動処理が示されます |

```bash
/suggestions             # list pending
/suggestions accept N    # schedule suggestion N (creates the cron job)
/suggestions dismiss N   # dismiss it — latched, never re-offered
/suggestions catalog     # add the curated starter automations
```

提案を受け入れると、`cronjob` ツールが使うのと同じ `cron.jobs.create_job` が呼ばれます。定期実行の仕組みが二重になることはありません。提案から勝手に定期実行が作られることは**ありません**。受け入れるのはいつも自分の操作です。断った提案は決まった鍵で覚えられ、同じものが二度と出てくることはありません。待機中の一覧には上限があるので、うるさく積み上がることもありません。

catalog にある **大事なメールの見張り** は、集めて、選り分けて、必要なものだけ見せるという型のお手本です。受信箱の内容を軽い判定用モデル（`config.yaml` の `auxiliary.monitor`）で採点し、急ぎと判断されたものだけを届けて、それ以外のときは黙っています。

## スキルを公開する {#publishing-skills}

### Skills Hub へ {#to-the-skills-hub}

```bash
hermes skills publish skills/my-skill --to github --repo owner/repo
```

### 自分のリポジトリへ {#to-a-custom-repository}

自分のリポジトリを tap として登録します。

```bash
hermes skills tap add owner/repo
```

これで、ほかの人がそのリポジトリから探して入れられるようになります。

## 安全性の検査 {#security-scanning}

Hub から入れたスキルは、すべて次の点を調べる検査を通ります。

- データを外へ持ち出そうとする書き方
- プロンプトへの割り込みを狙った書き方
- 壊してしまうコマンド
- シェルへの割り込みを狙った書き方

信用の段階は次のとおりです。

- `builtin` — Hermes に同梱されているもの（いつでも信用されます）
- `official` — リポジトリの `optional-skills/` にあるもの（信用済みとして扱われ、第三者向けの警告は出ません）
- `trusted` — openai/skills、anthropics/skills、huggingface/skills から来たもの
- `community` — 危険とまでは言えない指摘なら `--force` で押し切れます。`dangerous` と判定されたものは止められたままです

Hermes は今では、外部から見つける仕組みをいくつも使って、第三者のスキルを取り込めます。

- GitHub の識別子を直接指定する（たとえば `openai/skills/k8s`）
- `skills.sh` の識別子を指定する（たとえば `skills-sh/vercel-labs/json-render/json-render-react`）
- `/.well-known/skills/index.json` で配られる well-known のエンドポイント

GitHub 専用の入れ方に頼らずにスキルを見つけてもらいたいなら、リポジトリやマーケットプレイスでの公開に加えて、well-known のエンドポイントから配ることも考えてみてください。
