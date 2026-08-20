---
title: "プロファイルのコマンド早見表"
description: ""
upstream_path: reference/profile-commands.md
upstream_blob: 1f13d8e03b2785bc68292736d87f48aee38be208
sources:
  - https://hermes-agent.nousresearch.com/docs/reference/profile-commands
---

# プロファイルのコマンド早見表 {#profile-commands-reference}

このページでは [Hermes のプロファイル](/hermes/docs/user-guide/profiles/) に関わるコマンドをすべて扱います。CLI のコマンド全般については [CLI コマンド早見表](/hermes/docs/reference/cli-commands/) を見てください。

## `hermes profile` {#hermes-profile}

```bash
hermes profile <subcommand>
```

プロファイルを管理する親コマンドです。`hermes profile` だけを実行するとヘルプが出ます。

| サブコマンド | 説明 |
|------------|-------------|
| `list` | すべてのプロファイルを一覧表示します。 |
| `use` | 使うプロファイル（既定のもの）を切り替えます。 |
| `create` | 新しいプロファイルを作ります。 |
| `describe` | プロファイルの説明文を読む、または設定します（かんばんの割り振りで使われます）。 |
| `delete` | プロファイルを削除します。 |
| `show` | プロファイルの詳細を表示します。 |
| `alias` | プロファイル用のシェルの別名を作り直します。 |
| `rename` | プロファイルの名前を変えます。 |
| `export` | プロファイルを tar.gz の書庫に書き出します。 |
| `import` | tar.gz の書庫からプロファイルを取り込みます。 |
| `install` | git の URL か手元のディレクトリから、配布されたプロファイルを入れます。[プロファイルの配布](/hermes/docs/user-guide/profile-distributions/) を参照。 |
| `update` | 配布で管理しているプロファイルを取得し直し、その内容を当て直します。 |
| `info` | プロファイルの配布情報（取得元の URL、コミット、最終更新）を表示します。 |

## `hermes profile list` {#hermes-profile-list}

```bash
hermes profile list
```

すべてのプロファイルを一覧表示します。いま使っているプロファイルには `*` が付きます。

**例:**

```bash
$ hermes profile list
  default
* work
  dev
  personal
```

オプションはありません。

## `hermes profile use` {#hermes-profile-use}

```bash
hermes profile use <name>
```

`<name>` を、いま使うプロファイルにします。これ以降の `hermes` コマンドは（`-p` を付けない限り）このプロファイルで動きます。

| 引数 | 説明 |
|----------|-------------|
| `<name>` | 切り替え先のプロファイル名。`default` を指定すると元のプロファイルに戻ります。 |

**例:**

```bash
hermes profile use work
hermes profile use default
```

## `hermes profile create` {#hermes-profile-create}

```bash
hermes profile create <name> [options]
```

新しいプロファイルを作ります。

| 引数 / オプション | 説明 |
|-------------------|-------------|
| `<name>` | 新しいプロファイルの名前。ディレクトリ名として使える文字（英数字、ハイフン、アンダースコア）にしてください。 |
| `--clone` | いま使っているプロファイルから `config.yaml`、`.env`、`SOUL.md`、スキルをコピーします。 |
| `--clone-all` | いま使っているプロファイルからすべて（設定、記憶、スキル、定期実行、プラグイン）をコピーします。プロファイルごとの履歴（セッション、`state.db`、バックアップ、状態のスナップショット、復元ポイント）は除きます。 |
| `--clone-from <profile>` | いま使っているプロファイルではなく、指定したプロファイルから設定・スキル・SOUL をコピーします。`--clone-all` と一緒に使わない限り、`--clone` を指定したのと同じ扱いになります。 |
| `--no-alias` | ラッパースクリプトを作りません。 |
| `--description "<text>"` | このプロファイルが得意なことを 1〜2 文で書きます。かんばんの割り振りが、プロファイル名だけで推測するのではなく、役割を見てタスクを配るために使います。あとから `hermes profile describe` で足してもかまいません。`<profile_dir>/profile.yaml` に保存されます。 |
| `--no-skills` | 同梱スキルを一つも有効にしていない**空の**プロファイルを作ります。プロファイルの中に `.no-bundled-skills` の印を書き込むので、以後 `hermes update` を実行しても同梱スキルが入り直すことはありません。また `--clone`、`--clone-from`、`--clone-all`（結局スキルをコピーしてしまう指定）との併用は拒否します。用途を絞った割り振り役のプロファイルや、スキルをすべて引き継がせたくない実験用のプロファイルに向いています。すでに作ってあるプロファイル（既定の `~/.hermes` も含みます）で切り替えるには、`hermes skills opt-out` / `hermes skills opt-in` を使ってください。 |

プロファイルを作っても、そのプロファイルのディレクトリがターミナルのコマンドの既定の作業場所になるわけではありません。特定のプロジェクトから始めたい場合は、そのプロファイルの `config.yaml` で `terminal.cwd` を設定してください。

**例:**

```bash
# Blank profile — needs full setup
hermes profile create mybot

# Clone config only from current profile
hermes profile create work --clone

# Clone everything from current profile
hermes profile create backup --clone-all

# Clone config from a specific profile
hermes profile create work2 --clone-from work

# Clone everything from a specific profile
hermes profile create work2-backup --clone-from work --clone-all
```

## `hermes profile describe` {#hermes-profile-describe}

```bash
hermes profile describe [<name>] [options]
```

プロファイルの説明文を読む、または設定します。この説明文は、かんばんの割り振りが、プロファイル名から推し量るのではなく、それぞれのプロファイルが得意なことを見てタスクを配るために使います。`<profile_dir>/profile.yaml` に保存されるので、再起動しても残り、ゲートウェイとも共有されます。

オプションを付けなければ、いまの説明文（未設定なら `(no description set for '<name>')`）を表示します。

| 引数 / オプション | 説明 |
|-------------------|-------------|
| `<name>` | 説明を付けるプロファイル。`--all --auto` を使う場合を除いて必須です。 |
| `--text "<text>"` | 説明文をこの文章そのままに設定します（自分で書く場合）。すでにある説明文は上書きされます。 |
| `--auto` | プロファイルに入っているスキル、設定されたモデル、名前をもとに、補助の LLM が 1〜2 文の説明文を自動生成します。使うモデルは `config.yaml` の `auxiliary.profile_describer` で設定します。自動生成された説明文には `description_auto: true` の印が付くので、ダッシュボードで見直しの対象として区別できます。 |
| `--overwrite` | `--auto` と一緒に使うと、自分で書いた説明文も置き換えます（既定では、明示的に設定された説明文は飛ばします）。 |
| `--all` | `--auto` と一緒に使うと、説明文のないプロファイルをすべて処理します。 |

**例:**

```bash
# Read the current description
hermes profile describe researcher

# Set it explicitly
hermes profile describe researcher --text "Reads source code and writes findings."

# Let the LLM generate one
hermes profile describe researcher --auto

# Fill in descriptions for every profile that doesn't have one
hermes profile describe --all --auto
```

## `hermes profile delete` {#hermes-profile-delete}

```bash
hermes profile delete <name> [options]
```

プロファイルを削除し、シェルの別名も取り除きます。

| 引数 / オプション | 説明 |
|-------------------|-------------|
| `<name>` | 削除するプロファイル。 |
| `--yes`、`-y` | 確認を飛ばします。 |

**例:**

```bash
hermes profile delete mybot
hermes profile delete mybot --yes
```

:::warning
これは、設定・記憶・セッション・スキルを含むプロファイルのディレクトリ全体を完全に削除します。`default` のプロファイル（`~/.hermes`）は削除できません。すべて消したい場合は `hermes uninstall` を使ってください。
:::

## `hermes profile show` {#hermes-profile-show}

```bash
hermes profile show <name>
```

プロファイルの詳細として、ホームディレクトリ、設定されたモデル、ゲートウェイの状態、スキルの数、設定ファイルの状態を表示します。

ここに出るのは、そのプロファイルの Hermes のホームディレクトリで、ターミナルの作業ディレクトリではありません。ターミナルのコマンドは `terminal.cwd`（ローカルのバックエンドで `cwd: "."` の場合は起動したディレクトリ）から始まります。

| 引数 | 説明 |
|----------|-------------|
| `<name>` | 詳細を見るプロファイル。 |

**例:**

```bash
$ hermes profile show work
Profile: work
Path:    ~/.hermes/profiles/work
Model:   anthropic/claude-sonnet-4 (anthropic)
Gateway: stopped
Skills:  12
.env:    exists
SOUL.md: exists
Alias:   ~/.local/bin/work
```

## `hermes profile alias` {#hermes-profile-alias}

```bash
hermes profile alias <name> [options]
```

`~/.local/bin/<name>` にあるシェルの別名スクリプトを作り直します。うっかり消してしまったときや、Hermes のインストール先を移したあとに更新したいときに使います。

| 引数 / オプション | 説明 |
|-------------------|-------------|
| `<name>` | 別名を作る、または更新するプロファイル。 |
| `--remove` | 作るのではなく、ラッパースクリプトを取り除きます。 |
| `--name <alias>` | 別名を自分で決めます（既定はプロファイル名）。 |

**例:**

```bash
hermes profile alias work
# Creates/updates ~/.local/bin/work

hermes profile alias work --name mywork
# Creates ~/.local/bin/mywork

hermes profile alias work --remove
# Removes the wrapper script
```

## `hermes profile rename` {#hermes-profile-rename}

```bash
hermes profile rename <old-name> <new-name>
```

プロファイルの名前を変えます。ディレクトリとシェルの別名も合わせて更新されます。

| 引数 | 説明 |
|----------|-------------|
| `<old-name>` | いまのプロファイル名。 |
| `<new-name>` | 新しいプロファイル名。 |

**例:**

```bash
hermes profile rename mybot assistant
# ~/.hermes/profiles/mybot → ~/.hermes/profiles/assistant
# ~/.local/bin/mybot → ~/.local/bin/assistant
```

## `hermes profile export` {#hermes-profile-export}

```bash
hermes profile export <name> [options]
```

プロファイルを圧縮した tar.gz の書庫として書き出します。持ち運べる控えなので、バックアップにも、別の端末へ移すのにも、誰かに渡すのにも使えます。`auth.json` と `.env` は必ず除かれます。

チャットからは [`/export`](/hermes/docs/reference/slash-commands/) でも実行でき、デスクトップアプリでは **⌘K → Export profile…**、またはプロファイルのタイルの右クリックメニューから使えます。デスクトップからの書き出しでは、`desktop.json`（スキン、ライト／ダークの設定、独自テーマ、レールの色、ウィンドウの配置）も書庫に入ります。

| 引数 / オプション | 説明 |
|-------------------|-------------|
| `<name>` | 書き出すプロファイル。 |
| `-o`、`--output <path>` | 出力先のパス（既定: `<name>.tar.gz`）。 |

**例:**

```bash
hermes profile export work
# Creates work.tar.gz in the current directory

hermes profile export work -o ./work-2026-03-29.tar.gz
```

書庫に何が入るのか、誰かに渡す前に何を確かめるべきかは、[プロファイルをファイルで書き出す・取り込む](/hermes/docs/user-guide/profile-distributions/#export-and-import-a-profile-file) を見てください。

## `hermes profile import` {#hermes-profile-import}

```bash
hermes profile import <archive> [options]
```

tar.gz の書庫から、新しいプロファイルとして取り込みます。既存のプロファイルを上書きすることはなく、`default`（組み込みの大元のプロファイル）としての取り込みもできません。どちらの場合も `--name` を渡してください。名前が既存のコマンドとぶつからなければ、シェルのラッパーも作られます。

チャットからは [`/import`](/hermes/docs/reference/slash-commands/) でも実行でき、デスクトップアプリでは **⌘K → Import profile…**、またはプロファイルのレールの **+** の横にある取り込みボタンから使えます。デスクトップからの取り込みでは、同梱された `desktop.json`（テーマや配置）も適用され、そのまま新しいプロファイルに切り替わります。

| 引数 / オプション | 説明 |
|-------------------|-------------|
| `<archive>` | 取り込む tar.gz の書庫のパス。 |
| `--name <name>` | 取り込んだプロファイルの名前（既定: 書庫から推測）。 |

**例:**

```bash
hermes profile import ./work-2026-03-29.tar.gz
# Infers profile name from the archive

hermes profile import ./work-2026-03-29.tar.gz --name work-restored
```

## 配布まわりのコマンド {#distribution-commands}

:::tip
**配布は初めてですか？** まずは [プロファイルの配布のガイド](/hermes/docs/user-guide/profile-distributions/) を読んでください。なぜ・いつ・どうやるのかを、実例を添えて説明しています。以下の節は、やりたいことが決まっている人向けの淡々とした CLI の説明です。
:::

配布は、プロファイルを **git リポジトリ**として公開し、版を管理しながら共有できる形にする仕組みです。受け取った側はコマンド 1 つで導入でき、あとから自分の記憶・セッション・認証情報に触れないまま、その場で更新できます。

`auth.json` と `.env` が配布に含まれることはありません。これらは導入した人の端末に残ります。

受け取った側の記憶、セッション、認証情報、自分で編集した `.env` は、最初の導入時にも、その後の更新でも常に保たれます。

:::info
プロファイルの共有には 2 つのやり方があり、互いを補い合います。`hermes profile export` / `import`（チャットの `/export` と `/import` も同じ）は**ファイル 1 つ**を作ります。リポジトリも定義ファイルもなく、デスクトップからの書き出しならテーマや配置も一緒に入ります。配布（`install` / `update` / `info`）はプロファイルを **git リポジトリ**として公開するので、受け取った側があとから版を上げていけます。バックアップと復元は、書き出したファイルのもう一つの役目です。[プロファイルを共有する2つのやり方](/hermes/docs/user-guide/profile-distributions/#two-ways-to-share-a-profile) を参照。
:::

### `hermes profile install` {#hermes-profile-install}

```bash
hermes profile install <source> [--name <name>] [--alias] [--force] [--yes]
```

git の URL か手元のディレクトリから、配布されたプロファイルを入れます。

| オプション | 説明 |
|--------|-------------|
| `<source>` | git の URL（`github.com/user/repo`、`https://...`、`git@...`、`ssh://`、`git://`）か、直下に `distribution.yaml` がある手元のディレクトリ。 |
| `--name NAME` | 定義ファイルに書かれたプロファイル名を上書きします。 |
| `--alias` | シェルのラッパーも作ります（例: `telemetry` → `hermes -p telemetry`）。 |
| `--force` | 同じ名前のプロファイルがあっても上書きします。利用者のデータは保たれます。 |
| `-y`、`--yes` | 定義ファイルを見せて確認する手順を飛ばします。 |

導入時には定義ファイルの内容が表示され、必要な環境変数が並び、定期実行のジョブがあれば注意を出したうえで、確認を求めます。必要な環境変数は `.env.EXAMPLE` に書き出されるので、`.env` にコピーして中身を埋めてください。

**例:**

```bash
# Install from a GitHub repo (shorthand)
hermes profile install github.com/kyle/telemetry-distribution --alias

# Install from a full HTTPS git URL
hermes profile install https://github.com/kyle/telemetry-distribution.git

# Install from SSH
hermes profile install git@github.com:kyle/telemetry-distribution.git

# Install from a local directory during development
hermes profile install ./telemetry/
```

### `hermes profile update` {#hermes-profile-update}

```bash
hermes profile update <name> [--force-config] [--yes]
```

記録されている取得元から配布を取り直し、更新を当てます。配布側が持つファイル（SOUL.md、skills/、cron/、mcp.json）は上書きされますが、利用者のデータ（記憶、セッション、認証情報、.env）には触れません。

`config.yaml` は、手元での上書き設定を残すため既定では保たれます。配布に同梱された設定に戻したい場合は `--force-config` を渡してください。

### `hermes profile info` {#hermes-profile-info}

```bash
hermes profile info <name>
```

そのプロファイルの配布の定義ファイルを表示します。名前、版、必要な Hermes の版、作者、必要な環境変数、取得元の URL やパス、そして最後に `install` または `update` したときの `Installed:` の時刻がわかります。共有されたプロファイルを入れる前に何が必要かを確かめたり、「このプロファイルは半年前に入れたきり更新していない」と気づいたりするのに便利です。

`hermes profile list` も `Distribution` の列に配布の名前と版を出しますし、`hermes profile show <name>` と `delete <name>` は取得元の URL を見せるので、git リポジトリ由来のプロファイルか、手元で作ったものかがひと目でわかります。

### 非公開の配布 {#private-distributions}

非公開の git リポジトリも、追加の設定なしで配布の取得元として使えます。導入時にはいつもの `git` を呼び出すだけなので、シェルにすでに設定してある認証（SSH の鍵、`git credential` の補助、GitHub CLI が保存している HTTPS の認証情報）がそのまま効きます。

```bash
# Uses your SSH key, the same as any other `git clone`
hermes profile install git@github.com:your-org/internal-assistant.git

# Uses your git credential helper
hermes profile install https://github.com/your-org/internal-assistant.git
```

導入の途中で、取得のためにターミナルで認証情報を聞かれた場合は、その問い合わせがそのまま出てきます。同じリポジトリに対して普通に `git clone` するときと同じように認証を用意してから、導入してください。

### 配布の定義ファイル（`distribution.yaml`） {#distribution-manifest-distributionyaml}

どの配布にも、リポジトリの直下に `distribution.yaml` があります。

```yaml
name: telemetry
version: 0.1.0
description: "Compliance monitoring harness"
hermes_requires: ">=0.12.0"
author: "Your Name"
license: "MIT"
env_requires:
  - name: OPENAI_API_KEY
    description: "OpenAI API key"
    required: true
  - name: GRAPHITI_MCP_URL
    description: "Memory graph URL"
    required: false
    default: "http://127.0.0.1:8000/sse"
distribution_owned:   # optional; defaults to SOUL.md, config.yaml,
                      #   mcp.json, skills/, cron/, distribution.yaml
  - SOUL.md
  - skills/compliance/
  - cron/
```

`hermes_requires` では `>=`、`<=`、`==`、`!=`、`>`、`<` と、記号なしの版（`>=` として扱われます）が使えます。いま入っている Hermes の版が条件を満たさない場合は、理由がわかる形で導入が止まります。

`distribution_owned` は任意です。書いた場合は、更新で置き換わるのはそこに挙げたパスだけで、それ以外はすべて利用者のものとして残ります。省いた場合は、上に書いた既定が使われます。

### 配布を公開する {#publishing-a-distribution}

配布を作るのは、git に push するだけです。

1. プロファイルのディレクトリで、少なくとも `name` と `version` を書いた `distribution.yaml` を作ります。
2. git リポジトリを用意し（すでにあるものでもかまいません）、GitHub、GitLab など Hermes が取得できるところへ push します。
3. 受け取る人に `hermes profile install <your-repo-url>` を実行してもらいます。

版を切って配るときは git のタグを使ってください。`HEAD` を取得した人にはいまの状態が届きますし、定義ファイルの `version:` はいつでも上げられます。

## `hermes -p` / `hermes --profile` {#hermes--p-hermes---profile}

```bash
hermes -p <name> <command> [options]
hermes --profile <name> <command> [options]
```

普段使うプロファイルを変えないまま、任意の Hermes のコマンドを特定のプロファイルで実行するための共通のオプションです。そのコマンドの間だけ、使うプロファイルを上書きします。

| オプション | 説明 |
|--------|-------------|
| `-p <name>`、`--profile <name>` | このコマンドで使うプロファイル。 |

**例:**

```bash
hermes -p work chat -q "Check the server status"
hermes --profile dev gateway start
hermes -p personal skills list
hermes -p work config edit
```

## `hermes completion` {#hermes-completion}

```bash
hermes completion <shell>
```

シェルの入力補完のスクリプトを作ります。プロファイル名とプロファイルのサブコマンドの補完も含まれます。

| 引数 | 説明 |
|----------|-------------|
| `<shell>` | 補完を作る対象のシェル: `bash`、`zsh`、`fish`。 |

**例:**

```bash
# Install completions
hermes completion bash >> ~/.bashrc
hermes completion zsh >> ~/.zshrc
hermes completion fish > ~/.config/fish/completions/hermes.fish

# Reload shell
source ~/.bashrc
```

入れたあとは、次のところでタブ補完が効きます。
- `hermes profile <TAB>` — サブコマンド（list、use、create など）
- `hermes profile use <TAB>` — プロファイル名
- `hermes -p <TAB>` — プロファイル名

## 関連ページ {#see-also}

- [プロファイルのガイド](/hermes/docs/user-guide/profiles/)
- [CLI コマンド早見表](/hermes/docs/reference/cli-commands/)
- [よくある質問 — プロファイルの節](/hermes/docs/reference/faq/#profiles)
