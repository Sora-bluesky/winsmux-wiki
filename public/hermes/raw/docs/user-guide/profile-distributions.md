---
title: "プロファイル配布: エージェントまるごと共有する"
description: ""
upstream_path: user-guide/profile-distributions.md
upstream_blob: 14bbba02f75c94188185b5d2b194b2359df976bf
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/profile-distributions
---

# プロファイル配布: エージェントまるごと共有する {#profile-distributions-share-a-whole-agent}

**プロファイル配布** は、Hermes エージェント一式（人格、スキル、cron ジョブ、MCP 接続、設定）を git リポジトリとしてまとめたものです。リポジトリにアクセスできる人なら、コマンド1つでエージェント全体を導入し、その場で更新でき、自分のメモリーやセッション、API キーはそのまま保てます。

[プロファイル](/hermes/docs/user-guide/profiles/) がローカルのエージェントだとすれば、配布はそのエージェントを人に渡せる形にしたものです。

## プロファイルを共有する2つの方法 {#two-ways-to-share-a-profile}

Hermes には共有の道が2つあり、それぞれ答える問いが違います。配布は長く使い続ける側、エクスポートファイルは手早く渡す側です。

| | **配布**（git リポジトリ） | **エクスポートファイル**（`.tar.gz`） |
|---|---|---|
| 渡し方 | `hermes profile install <repo>` | ファイルを送る — チャット、AirDrop、USB、メール |
| 受け取る側に必要なもの | git と、リポジトリへのアクセス権 | ファイルそのもの |
| 更新 | `hermes profile update` で新しい版を取り込む | ファイルを送り直す |
| 版の管理 | タグ、ブランチ、コミット SHA | なし — その時点のスナップショット |
| 作る側の手間 | `distribution.yaml` と `.gitignore`、それにリポジトリ | なし — コマンド1つ |
| 運ばれるもの | SOUL、設定、スキル、cron、MCP、プラグイン | 同じもの、**さらに** デスクトップのテーマと画面配置 |
| 作り方 | `hermes profile install` / `update` | `/export` と `/import`、または `hermes profile export` / `import` |

**配布** を選ぶのは、そのエージェントがこれからも改良し続ける製品で、ほかの人にも新しい版を追いかけてほしいときです。チームで審査した社内エージェント、コミュニティ向けの公開版、同じエージェントを5つの端末に配置する場合などが当てはまります。

**エクスポートファイル** を選ぶのは、今この場で自分の環境を誰かに渡したいときや、新しいノート PC へ移るときです。リポジトリもマニフェストも要りません。チャットで `/export` を実行し、できたファイルを渡し、相手が `/import` を実行するだけです。[プロファイルをファイルで書き出す・読み込む](#export-and-import-a-profile-file) を参照してください。

この2つは排他ではありません。まず自分でプロファイルを使い込み、`/export` で同僚に渡して意見をもらい、版を管理する価値が出てきた段階で配布として公開する。そういう作者はたくさんいます。

## これで何が変わるか {#what-this-means}

配布が使えるようになる前は、Hermes エージェントを共有するには相手に次のものを送る必要がありました。

1. 自分の SOUL.md
2. 導入してもらうスキルの一覧
3. 秘密情報を抜いた config.yaml
4. どの MCP サーバーをつないだかの説明
5. 登録してある cron ジョブ
6. どの環境変数を設定すればよいかの手順

…そのうえで、相手が正しく組み立ててくれることを祈るしかありませんでした。版を上げるたび、バグを直すたびに、この受け渡しをまた繰り返すことになります。

配布なら、それが全部1つの git リポジトリに収まります。

```
my-research-agent/
├── distribution.yaml    # manifest: name, version, env-var requirements
├── SOUL.md              # the agent's personality / system prompt
├── config.yaml          # model, temperature, reasoning, tool defaults
├── skills/              # bundled skills that come with the agent
├── cron/                # scheduled tasks the agent runs
└── mcp.json             # MCP servers the agent connects to
```

受け取る側はこれを実行します。

```bash
hermes profile install github.com/you/my-research-agent --alias
```

…これでエージェント一式が手に入ります。あとは自分の API キーを入れて（`.env.EXAMPLE` を `.env` にコピー）、`my-research-agent chat` を実行するか、Telegram / Discord / Slack などのゲートウェイ経由で話しかけられます。作者が新しい版を push したら、`hermes profile update my-research-agent` を実行すれば変更を取り込めます。メモリーとセッションはそのまま残ります。

## なぜ git なのか {#why-git}

tarball、HTTP アーカイブ、独自形式も検討しましたが、どれも git には及びませんでした。

- **作者側にビルド作業がない。** GitHub に push すれば、利用者はもう導入できます。「固めて、アップロードして、索引を更新して」という手順はありません。
- **タグ・ブランチ・コミットが、そのまま版の管理になる。** タグを push するだけで、ほかのツールでいう「パッケージ化してリリースをアップロード」に当たる作業が済みます。
- **更新は fetch で済む。** アーカイブ全体をダウンロードし直す必要はありません。
- **中身が見える。** 利用者はリポジトリを読み、版どうしの差分を確かめ、issue を立て、fork して手を入れられます。
- **プライベートリポジトリも追加費用なしで使える。** SSH 鍵、`git credential` ヘルパー、GitHub CLI に保存された資格情報など、ターミナルで既に設定済みの認証がそのまま効きます。
- **再現性はコミット SHA で担保される。** pip や npm が記録しているのと同じものです。

引き換えになるのは、受け取る側に git が必要なことです。2026 年に Hermes を動かしている端末なら、まず入っています。

## 配布はどんなときに使うか {#when-should-you-use-a-distribution}

向いている場面:

- **専門特化したエージェントを共有したいとき** — コンプライアンス監視、コードレビュー、リサーチ補助、カスタマーサポートのボットなどを、チームやコミュニティに渡す場合。
- **同じエージェントをいくつもの端末に配置したいとき**。毎回手作業でファイルをコピーせずに済みます。
- **エージェントを改良し続けていて**、受け取る側にコマンド1つで新しい版を取り込んでほしいとき。
- **エージェントを製品として作っているとき** — 方針を固めた既定値、選び抜いたスキル、調整済みのプロンプトを、ほかの人の出発点として使ってもらう場合。

向いていない場面:

- **今すぐ一度だけ、自分の環境を誰かに渡したいとき。** 配布にはリポジトリとマニフェストと `.gitignore` が要ります。`/export` はどれも要りません — [プロファイルをファイルで書き出す・読み込む](#export-and-import-a-profile-file) を参照してください。バックアップや、新しい端末への引っ越しも同じです。
- **デスクトップのテーマや画面配置を共有したいとき。** 配布が運ぶのはエージェント本体、つまり SOUL、設定、スキル、cron、MCP、プラグインです。デスクトップアプリから作ったエクスポートは見た目も一緒に運びます。スキン、ライト/ダークの切り替え、スキンが必要とする独自テーマ、そのプロファイルのレール色、ウィンドウの配置です。
- **API キーもエージェントと一緒に渡したいとき。** `auth.json` と `.env` は配布から意図的に除いてあります。導入する人がそれぞれ自分の資格情報を用意します。（エクスポートファイルでも同じように取り除かれます。）
- **メモリーやセッション、会話履歴を共有したいとき。** これらは利用者のデータであって、配布の中身ではありません。同梱されることはありません。（エクスポートファイルはここが違います。送る前に [エクスポートファイルに入るもの](#what-an-export-file-contains) を読んでください。）

:::caution
**Hermes は git を制御しません。** このページで説明しているファイルの除外は、誰かが `hermes profile install` や `hermes profile update` を実行したときに **導入する側** で適用されます。`git add` や `git commit` を実行したときには適用され **ません**。
:::

## 全体の流れ: 作る側から導入、そして更新まで {#the-lifecycle-author-to-installer-to-update}

ここからが最初から最後までの流れです。自分に関係する側を読んでください。

---

## 作る側: 配布を公開する {#for-authors-publishing-a-distribution}

### 手順1 — 動くプロファイルから出発する {#step-1-start-from-a-working-profile}

ほかのプロファイルと同じように、エージェントを作って磨きます。

```bash
hermes profile create research-bot
research-bot setup                    # configure model, API keys
# Edit ~/.hermes/profiles/research-bot/SOUL.md
# Install skills, wire up MCP servers, schedule cron jobs, etc.
research-bot chat                     # dogfood until it feels right
```

### 手順2 — `distribution.yaml` を追加する {#step-2-add-a-distributionyaml}

`~/.hermes/profiles/research-bot/distribution.yaml` を作ります。

```yaml
name: research-bot
version: 1.0.0
description: "Autonomous research assistant with arXiv and web tools"
hermes_requires: ">=0.12.0"
author: "Your Name"
license: "MIT"

# Tell installers which env vars the agent needs. These are checked against
# the installer's shell and existing .env file so they don't get nagged
# about keys they already have configured.
env_requires:
  - name: OPENAI_API_KEY
    description: "OpenAI API key (for model access)"
    required: true
  - name: SERPAPI_KEY
    description: "SerpAPI key for web search"
    required: false
    default: ""
```

マニフェストはこれで全部です。`name` 以外の項目にはすべて妥当な既定値があります。

### 手順3 — 最初のコミットの前に `.gitignore` を作る {#step-3-create-a-gitignore-before-the-first-commit}

:::warning
これは `git init` や `git add` を実行する **前に** 済ませてください。すでにそのプロファイルとチャットしたり、setup を走らせたり、何かしら使っていたりすると、ディレクトリには絶対に配ってはいけないファイルが入っています。`.env`、`auth.json`、`memories/`、`sessions/`、`state.db*`、`logs/` などです。
:::

`~/.hermes/profiles/research-bot/.gitignore` を作り、少なくとも次の内容を入れます。

```gitignore
# Credentials & secrets — NEVER commit
auth.json
.env
.env.EXAMPLE    # generated by install, not authorship domain

# Runtime databases & state
state.db
state.db-shm
state.db-wal
hermes_state.db
response_store.db
response_store.db-shm
response_store.db-wal
gateway.pid
gateway_state.json
processes.json
auth.lock
active_profile
.update_check

# User data — NEVER commit
memories/
sessions/
logs/
plans/
workspace/
home/

# Caches & generated artifacts
image_cache/
audio_cache/
document_cache/
browser_screenshots/
cache/

# Infrastructure (should not be in profile dir, but safe to exclude)
hermes-agent/
.worktrees/
profiles/
bin/
node_modules/

# User customization namespace — your local overrides
local/

# Checkpoints & backups (can be huge)
checkpoints/
sandboxes/
backups/

# Logs
errors.log
.hermes_history
```

これは、導入する側で installer が取り除く [完全に除外されるパス](#whats-not-in-a-distribution-ever) と対応しています。ほかにリポジトリへ入れたくないもの（作業用の一時ファイル、大きな素材、ローカル専用のスキル）も、ここに書き足してください。

### 手順4 — git リポジトリへ push する {#step-4-push-to-a-git-repo}

```bash
cd ~/.hermes/profiles/research-bot
git init
git add .
git commit -m "v1.0.0"
git remote add origin git@github.com:you/research-bot.git
git tag v1.0.0
git push -u origin main --tags
```

これでこのリポジトリが配布になりました。アクセスできる人なら誰でも導入できます。

:::note
作者がうっかり同梱してしまった場合でも、installer は [完全に除外されるパス](#whats-not-in-a-distribution-ever) をさらに取り除きます。ただしそれが守るのは導入する側であって、作者自身ではありません。
:::

### 手順5 — 版にタグを付けて出す {#step-5-tag-versioned-releases}

エージェントが安定した区切りに達するたびに、版を上げてタグを打ちます。

```bash
# Edit distribution.yaml: version: 1.1.0
git add distribution.yaml SOUL.md skills/
git commit -m "v1.1.0: tighter research SOUL, add arxiv skill"
git tag v1.1.0
git push --tags
```

`hermes profile update research-bot` を実行した受け取り側には、最新版が届きます。

### リポジトリはどんな姿になるか {#what-the-repo-looks-like}

作り込んだ配布の全体像です。

```
research-bot/
├── .gitignore                   # excludes secrets & user data (see Step 3)
├── distribution.yaml            # required
├── SOUL.md                      # strongly recommended
├── config.yaml                  # model, provider, tool defaults
├── mcp.json                     # MCP server connections
├── skills/
│   ├── arxiv-search/SKILL.md
│   ├── paper-summarization/SKILL.md
│   └── citation-lookup/SKILL.md
├── cron/
│   └── weekly-digest.json       # scheduled tasks
└── README.md                    # human-facing description (optional)
```

### 配布側のもの・利用者側のもの {#distribution-owned-vs-user-owned}

導入した人が新しい版へ更新すると、置き換わるもの（作者の領分）と、そのまま残るもの（導入した人の領分）に分かれます。既定は次のとおりです。

| 区分 | パス | 更新したとき |
|---|---|---|
| **配布側のもの** | `SOUL.md`, `config.yaml`, `mcp.json`, `skills/`, `cron/`, `distribution.yaml` | 新しいクローンの内容に置き換わります |
| **設定の上書き** | `config.yaml` | 実際には既定で保持されます。導入した人がモデルやプロバイダーを調整しているかもしれないためです。更新時に `--force-config` を付けると初期状態に戻ります。 |
| **利用者側のもの** | `memories/`, `sessions/`, `state.db*`, `auth.json`, `.env`, `logs/`, `workspace/`, `plans/`, `home/`, `*_cache/`, `local/` | 触れられません |

配布側のものの一覧は、マニフェストで上書きできます。

```yaml
distribution_owned:
  - SOUL.md
  - skills/research/            # only my research skills; other installed skills stay
  - cron/digest.json
```

省いた場合は上記の既定が適用されます。たいていの配布はそれで足ります。

---

## 導入する側: 配布を使う {#for-installers-using-a-distribution}

### 導入する {#install}

```bash
hermes profile install github.com/you/research-bot --alias
```

このとき何が起きるか:

1. リポジトリを一時ディレクトリへクローンします。
2. `distribution.yaml` を読み、マニフェストの内容（名前、版、説明、作者、必要な環境変数）を表示します。
3. 必要な環境変数それぞれを、自分のシェル環境と、対象プロファイルの既存の `.env` と突き合わせます。`✓ set` か `needs setting` が付くので、何を設定すればよいかがはっきりします。
4. 確認を求めます。`-y` / `--yes` を付ければ省略できます。
5. 配布側のファイルを `~/.hermes/profiles/research-bot/`（マニフェストの `name` が指す先）へコピーします。このコピーの際、作者がうっかりリポジトリに残していたとしても [完全に除外されるパス](#whats-not-in-a-distribution-ever) は取り除かれます。
6. 必要なキーをコメントアウトした状態で `.env.EXAMPLE` を書き出します。`.env` にコピーして値を入れてください。
7. `--alias` を付けると、`research-bot chat` と直接実行できるラッパーが作られます。

### 指定できる場所の種類 {#source-types}

git の URL ならどれでも使えます。

```bash
# GitHub shorthand
hermes profile install github.com/you/research-bot

# Full HTTPS
hermes profile install https://github.com/you/research-bot.git

# SSH
hermes profile install git@github.com:you/research-bot.git

# Self-hosted, GitLab, Gitea, Forgejo — any Git host
hermes profile install https://git.example.com/team/research-bot.git

# Private repo using your configured git auth
hermes profile install git@github.com:your-org/internal-bot.git

# Local directory during development (no git push needed)
hermes profile install ~/my-profile-in-progress/
```

### プロファイル名を変える {#override-the-profile-name}

同じ配布を、別のプロファイル名で使いたい2人の例です。

```bash
# Alice
hermes profile install github.com/acme/support-bot --name support-us --alias
# Bob (same distribution, different local name)
hermes profile install github.com/acme/support-bot --name support-eu --alias
```

### 環境変数を埋める {#fill-in-env-vars}

導入が済むと、そのエージェントのプロファイルには `.env.EXAMPLE` が置かれています。

```
# Environment variables required by this Hermes distribution.
# Copy to `.env` and fill in your own values before running.

# OpenAI API key (for model access)
# (required)
OPENAI_API_KEY=

# SerpAPI key for web search
# (optional)
# SERPAPI_KEY=
```

これをコピーします。

```bash
cp ~/.hermes/profiles/research-bot/.env.EXAMPLE ~/.hermes/profiles/research-bot/.env
# Edit .env, paste your real keys
```

すでに自分のシェル環境にあるキー（たとえば `~/.zshrc` で export した `OPENAI_API_KEY`）は、導入時に `✓ set` と表示されます。`.env` に書き直す必要はありません。

### 何を導入したのか確かめる {#check-what-you-installed}

```bash
hermes profile info research-bot
```

こう表示されます。

```
Distribution: research-bot
Version:      1.0.0
Description:  Autonomous research assistant with arXiv and web tools
Author:       Your Name
Requires:     Hermes >=0.12.0
Source:       https://github.com/you/research-bot
Installed:    2026-05-08T17:04:32+00:00

Environment variables:
  OPENAI_API_KEY (required) — OpenAI API key (for model access)
  SERPAPI_KEY (optional) — SerpAPI key for web search
```

`hermes profile list` にも `Distribution` の列が出るので、どのプロファイルがリポジトリ由来で、どれを自分で組んだのかが一目で分かります。

```
 Profile          Model                        Gateway      Alias        Distribution
 ───────────────    ───────────────────────────    ───────────    ───────────    ────────────────────
 ◆default         claude-sonnet-4              stopped      —            —
  coder           gpt-5                        stopped      coder        —
  research-bot    claude-opus-4                stopped      research-bot research-bot@1.0.0
  telemetry       claude-sonnet-4              running      telemetry    telemetry@2.3.1
```

### 更新する {#update}

```bash
hermes profile update research-bot
```

このとき何が起きるか:

1. 記録してある取得元 URL から、リポジトリを再びクローンします。
2. 配布側のファイル（SOUL、スキル、cron、mcp.json）を置き換えます。
3. `config.yaml` は **保持します**。モデルや temperature などを自分で調整しているかもしれないためです。上書きしたいときは `--force-config` を付けます。
4. 利用者のデータ、つまりメモリー、セッション、認証情報、`.env`、ログ、状態には **一切触れません**。

アーカイブ全体を落とし直すこともなく、設定へのローカルな変更が踏み潰されることもなく、会話履歴が消えることもありません。

### 削除する {#remove}

```bash
hermes profile delete research-bot
```

削除の確認では、答える前に配布の情報が表示されます。

```
Profile: research-bot
Path:    ~/.hermes/profiles/research-bot
Model:   claude-opus-4 (anthropic)
Skills:  12
Distribution: research-bot@1.0.0
Installed from: https://github.com/you/research-bot

This will permanently delete:
  • All config, API keys, memories, sessions, skills, cron jobs
  • Command alias (~/.local/bin/research-bot)

Type 'research-bot' to confirm:
```

そのおかげで、どこから来たエージェントなのか、入れ直せるのかを知らないまま、うっかり消してしまうことはありません。

---

## 使いどころとパターン {#use-cases-and-patterns}

### 個人: 1つのエージェントを複数の端末で揃える {#personal-sync-one-agent-across-machines}

ノート PC でリサーチ補助を作りました。同じエージェントをデスクトップ機でも使いたい、という場面です。

```bash
# Laptop — create .gitignore first (see "For authors" Step 3), then:
cd ~/.hermes/profiles/research-bot
git init && git add . && git status   # confirm no secrets staged
git commit -m "initial"
git remote add origin git@github.com:you/research-bot.git
git push -u origin main

# Workstation
hermes profile install github.com/you/research-bot --alias
# Fill in .env. Done.
```

ノート PC 側で手を入れたら（`git commit && push`）、デスクトップ機では `hermes profile update research-bot` で取り込めます。メモリーは端末ごとに分かれたままです。ノート PC は自分の会話を、デスクトップ機は自分の会話を覚えていて、混ざりません。

### チーム: 審査を通した社内エージェントを配る {#team-ship-a-reviewed-internal-agent}

開発チームで、決まった SOUL と決まったスキルを持ち、すべての PR を通す cron を備えた PR レビューボットを共有したい、という場面です。

```bash
# Engineering lead — create .gitignore first (see "For authors" Step 3), then:
cd ~/.hermes/profiles/pr-reviewer
# ... build and tune ...
git init && git add . && git status   # confirm no secrets staged
git commit -m "v1.0 PR reviewer"
git tag v1.0.0
git push -u origin main --tags    # push to your company's internal Git host

# Each engineer
hermes profile install git@github.com:your-org/pr-reviewer.git --alias
# Fill in .env with their own API key (billed to them), .env.EXAMPLE points at what's required
pr-reviewer chat
```

リーダーが v1.1（SOUL の改善、新しいスキル）を出したら、各メンバーは `hermes profile update pr-reviewer` を実行し、数分で全員が新しい版になります。

### コミュニティ: 公開エージェントを出す {#community-publish-a-public-agent}

これまでにないものを作ったとします。「Polymarket トレーダー」かもしれませんし、「学術論文の要約役」や「Minecraft サーバー運用の相棒」かもしれません。それを共有したい、という場面です。

```bash
# You — create .gitignore first (see "For authors" Step 3), then:
cd ~/.hermes/profiles/polymarket-trader
# Write a solid README.md at the repo root — GitHub shows it on the repo page
git init && git add . && git status   # confirm no secrets staged
git commit -m "v1.0"
git tag v1.0.0
# Publish to a public GitHub repo
git remote add origin https://github.com/you/hermes-polymarket-trader.git
git push -u origin main --tags

# Anyone
hermes profile install github.com/you/hermes-polymarket-trader --alias
```

導入コマンドをそのまま投稿しましょう。試した人が issue や PR を送ってくれます。手を入れたい人は fork します。誰もが知っている git の流れそのままです。

### 製品: 方針を固めたエージェントを出荷する {#product-ship-an-opinionated-agent}

Hermes の上に何かを作ったとします。コンプライアンス監視の仕組み、カスタマーサポート一式、特定分野のリサーチ基盤かもしれません。これを製品として配りたい、という場面です。

```yaml
# distribution.yaml
name: telemetry-harness
version: 2.3.1
description: "Compliance telemetry harness — monitors and reviews regulated workflows"
hermes_requires: ">=0.13.0"
author: "Acme Compliance Inc."
license: "Commercial"

env_requires:
  - name: ACME_API_KEY
    description: "Your Acme Compliance license key (email support@acme.com)"
    required: true
  - name: OPENAI_API_KEY
    description: "OpenAI API key for model access"
    required: true
  - name: GRAPHITI_MCP_URL
    description: "URL for your Graphiti knowledge graph instance"
    required: false
    default: "http://127.0.0.1:8000/sse"
```

顧客はコマンド1つで導入できます。導入前の確認画面が、どのキーを用意すべきかを正確に伝えます。新しい版にタグを打った瞬間から更新が行き渡ります。顧客のコンプライアンスデータ（`memories/`、`sessions/`）が顧客の端末から出ることはありません。

### 使い捨て: 共用環境での単発の作業 {#ephemeral-one-off-scripts-on-shared-infra}

自分が運用のリーダーだとします。本番障害を切り分けるための一時的なエージェント（必要なツールと MCP 接続を備えた、用意済みの SOUL）を、これから1週間、3人のオンコール担当のノート PC で動かしたい、という場面です。

```bash
# You — create .gitignore first (see "For authors" Step 3), then:
# Build the profile, commit, push a private repo
git push -u origin main

# Each on-call
hermes profile install git@github.com:your-org/incident-2026-q2.git --alias

# Incident resolved — tear it down
hermes profile delete incident-2026-q2
```

導入して削除するまでが十分に軽いので、使い捨てにできます。

---

## レシピ {#recipes}

### 特定の版に固定する {#pin-to-a-specific-version}

:::note
git の ref を指定して固定する書き方（`#v1.2.0`）は予定されていますが、最初の版には入っていません。今の install は既定ブランチを追いかけます。導入した版は `hermes profile info <name>` で把握し、準備が整うまで更新を控えてください。
:::

### 自分の版と最新版を見比べる {#check-what-version-youre-on-vs-latest}

```bash
# Your installed version
hermes profile info research-bot | grep Version

# Latest upstream (without installing)
git ls-remote --tags https://github.com/you/research-bot | tail -5
```

### ローカルの設定を更新後も保つ {#keep-local-config-customizations-through-updates}

既定の更新動作がすでにそうなっています。`config.yaml` は保持されます。念のため、配布側が持たないファイルに自分の調整を書いておくと安心です。

```yaml
# ~/.hermes/profiles/research-bot/local/my-overrides.yaml
# (distribution never touches local/)
```

…そのうえで、必要に応じて `config.yaml` や SOUL から参照します。

### まっさらな状態で入れ直す {#force-a-clean-re-install}

```bash
# Nuke and re-install from scratch (loses memories/sessions too)
hermes profile delete research-bot --yes
hermes profile install github.com/you/research-bot --alias

# Update to current main but reset config.yaml to the distribution's default
hermes profile update research-bot --force-config --yes
```

### fork して手を入れる {#fork-and-customize}

git のいつもの流れです。配布は要するにリポジトリなので。

```bash
# Fork the repo on GitHub, then install your fork
hermes profile install github.com/yourname/forked-research-bot --alias

# Iterate locally in ~/.hermes/profiles/forked-research-bot/
# Edit SOUL.md, commit, push to your fork
# Upstream changes: pull them into your fork the usual way
```

### push する前に配布を試す {#test-a-distribution-before-pushing}

作者の端末では、こうします。

```bash
# Install from a local directory (no git push needed)
hermes profile install ~/.hermes/profiles/research-bot --name research-bot-test --alias

# Tweak, delete, re-install until it's right
hermes profile delete research-bot-test --yes
hermes profile install ~/.hermes/profiles/research-bot --name research-bot-test
```

---

## プロファイルをファイルで書き出す・読み込む {#export-and-import-a-profile-file}

版の管理が要らないなら、リポジトリは省けます。`/export` はプロファイルを1つの `.tar.gz` にまとめ、`/import` は受け取った側でそれを新しいプロファイルとして展開します。資格情報は書き出しの時点で取り除かれます。

### 書き出す {#export}

CLI、TUI、デスクトップのチャットのいずれでも:

```
/export                          # the active profile → managed profile-exports/<name>-<timestamp>.tar.gz
/export research-bot             # a named profile
/export research-bot -o ~/Desktop/research-bot.tar.gz
```

`-o` を指定しない場合、CLI と TUI はアーカイブを、いまいる作業ディレクトリではなく、既定の Hermes ホームの下にある Hermes 管理の `profile-exports/` ディレクトリへ置きます。こうしておけば、普段の書き出しがソースの作業コピーの中に紛れ込まず、生成されたプロファイルのスナップショットをリポジトリのソースファイルと取り違えることもありません。Hermes ホーム自体が Git の作業コピーの中にある場合（Docker や独自構成の環境ではそうなることがあります）、アーカイブは `~/.hermes-profile-exports/` に、それも無理なら OS の一時ディレクトリ配下のユーザーごとのディレクトリに置かれます。作業コピーの中に入ることはありません。安全な自動の置き場所がどこにも見つからない場合（候補がすべて Git の作業コピーの中にある場合）、書き出しは "No safe automatic export destination" と告げて中止するので、作業コピーの外を指す `-o` を渡してください。保存先を自分で決めたいときは、明示した `-o` のパスがこれまでどおり使われます。

シェルからでも、同じ仕組みが使えます。

```bash
hermes profile export research-bot
hermes profile export research-bot -o ./research-bot.tar.gz
```

**デスクトップアプリ** には入口が3つあり、どれもネイティブの保存ダイアログにつながります。

- **⌘K → Export profile…**
- サイドバーのレールにあるプロファイルの四角を右クリック → **Export profile…**
- レールの **+** の隣にあるインポートボタンが、逆方向を受け持ちます

デスクトップからの書き出しには、CLI にはないファイルが1つ増えます。`desktop.json` です。スキン、ライト/ダークの設定、スキンが必要とする独自テーマの定義、そのプロファイルのレール色、ウィンドウの配置が入っています。デスクトップから共有したプロファイルが、振る舞いだけでなく*見た目*まで自分のものと同じになるのはこのためです。

### 読み込む {#import}

```
/import ~/Downloads/research-bot.tar.gz
/import ~/Downloads/research-bot.tar.gz --name research-bot-2
```

```bash
hermes profile import ./research-bot.tar.gz
hermes profile import ./research-bot.tar.gz --name research-bot-2
```

プロファイル名はアーカイブから推測されます。`--name` を渡した場合はそちらが使われます。既存のプロファイルに上書きする形の読み込みは拒否されるので、先に古いほうの名前を変えるか削除してください。名前が既存のコマンドとぶつからなければ、シェルのラッパー（`research-bot` → `hermes -p research-bot`）も作られます。

デスクトップアプリで読み込むと `desktop.json` の内容も適用され、新しいプロファイルの新しいチャットが開きます。デスクトップで作ったアーカイブを CLI から読み込んでも問題ありません。その設定ファイルはディスク上に一緒に置かれ、次にそのプロファイルをデスクトップで開いたときに効きます。

:::note
`default` という名前では読み込めません。これは組み込みの root プロファイル（`~/.hermes`）の名前です。`--name something-else` を指定してください。
:::

### エクスポートファイルに入るもの {#what-an-export-file-contains}

どちらの種類のプロファイルでも常に除外されるのは `auth.json` と `.env` です。API キーが端末の外へ出ることはありません。

**default プロファイル**（`~/.hermes`）は許可リスト方式で書き出されます。Hermes が把握している成果物だけが対象なので、ホームディレクトリに置いてある無関係なファイルが巻き込まれることはありません。

対象は `config.yaml`、`SOUL.md`、`MEMORY.md`、`USER.md`、`todo.json`、`system_prompt.md`、`AGENTS.md`、`CLAUDE.md`、`.cursorrules`、`skills/`、`plugins/`、`cron/`、`scripts/`、`sessions/`、`memories/`、`knowledge/`、`preferences/`、そしてデスクトップが用意していれば `desktop.json` です。

**名前付きプロファイル**（`~/.hermes/profiles/<name>`）は、`auth.json` と `.env` を除いたディレクトリ全体をコピーします。こちらは対象が広く、そのプロファイルに `state.db` やログ、キャッシュがあればアーカイブにも入り、ファイルは大きくなります。

:::caution 送る前にアーカイブの中身を読む
エクスポートはプロファイルのスナップショットであって、整えた公開物ではありません。配布と違い、`memories/` や `sessions/`、`USER.md` が **入りえます**。しかも、スキルやメモリー、自分の人格に書き込んだ個人的な内容を走査する仕組みはありません。資格情報はファイル名で振り分けているだけで、中身までは見ていません。

ほかの人に渡す前に、何が入っているか一覧で確かめてください。

```bash
tar -tzf research-bot.tar.gz | less
```

渡したくない会話履歴が入っているなら、代わりに [配布](#for-authors-publishing-a-distribution) として公開してください。配布はメモリーやセッションを同梱しません。
:::

## 配布に決して入らないもの {#whats-not-in-a-distribution-ever}

作者がうっかり同梱してしまっても、installer は次のパスを完全に除外します。これを覆す設定項目はありません。この安全装置は、回帰テストで守られている不変条件です。

- `auth.json` — OAuth トークン、プラットフォームの資格情報
- `.env` — API キー、秘密情報
- `memories/` — 会話のメモリー
- `sessions/` — 会話の履歴
- `state.db`, `state.db-shm`, `state.db-wal` — セッションのメタデータ
- `logs/` — エージェントとエラーのログ
- `workspace/` — 生成された作業ファイル
- `plans/` — 一時的な計画
- `home/` — Docker バックエンドでのユーザーのホーム
- `*_cache/` — 画像・音声・文書のキャッシュ
- `local/` — 利用者が自由に使える設定の置き場所

導入する側として配布をクローンしても、これらは自分のプロファイルディレクトリにコピーされません。更新しても、自分の分はそのまま残ります。同じ配布を5つの端末に入れたなら、このデータは端末ごとに独立した5組になります。

:::caution
この除外が働くのは **導入する人の端末で install / update を実行したとき** です。作者が機微なファイルや不要なファイルをコミットしてしまうこと自体を防ぐわけでは **ありません**。作者の側は [`.gitignore`](#step-3--create-a-gitignore-before-the-first-commit) で秘密情報をリポジトリの外に保つ必要があります。
:::

## 安全性と信頼 {#security-and-trust}

プロファイル配布には、既定では署名がありません。信頼しているのは次の2つです。

- **git のホスト**（GitHub / GitLab など）が、作者の push したバイト列をそのまま配ること。
- **作者** が、悪意のある SOUL やスキル、cron ジョブを同梱しないこと。

配布に含まれる cron ジョブは **自動では登録されません**。installer が `hermes -p <name> cron list` を表示するので、自分で明示的に有効にします。一方 SOUL.md とスキルは、そのプロファイルとチャットを始めた時点でもう効いています。知らない相手の配布を入れるなら、最初に動かす前に中身を読んでください。

大まかにたとえるなら、配布を入れるのはブラウザ拡張や VS Code の拡張を入れるのに似ています。手間は小さく、力は大きく、出どころを信頼して使うものです。社内向けの配布ならプライベートリポジトリと普段の git 認証をそのまま使えます。新しく設定するものはありません。

今後の版では、署名や、解決済みのコミット SHA を記録するロックファイル（`.distribution-lock.yaml`）、更新前に差分を表示する `--dry-run` が加わるかもしれません。いずれもまだ提供されていません。

## 内部の仕組み {#under-the-hood}

実装の詳細、CLI の正確な挙動、すべてのオプションは [プロファイルコマンド一覧](/hermes/docs/reference/profile-commands/#distribution-commands) を参照してください。

要点はこうです。

- `install`、`update`、`info` は `hermes profile` の中にあります。別のコマンド体系ではありません。
- マニフェストの形式は YAML で、必須項目は `name` だけという小さなスキーマです。
- installer はクローンにローカルの `git` バイナリを使うので、シェルが既に扱っている認証（SSH 鍵、credential ヘルパー）はそのまま効きます。
- クローンのあと `.git/` は取り除かれます。導入されたプロファイル自体は git のチェックアウトではないので、「配布の git 履歴に `.env` をうっかりコミットしてしまった」という事故を避けられます。
- 予約済みのプロファイル名（`hermes`、`test`、`tmp`、`root`、`sudo`）は、よくあるコマンド名との衝突を避けるため、導入時に拒否されます。

## 関連ページ {#see-also}

- [プロファイル: 複数のエージェントを動かす](/hermes/docs/user-guide/profiles/) — 土台になる考え方
- [プロファイルコマンド一覧](/hermes/docs/reference/profile-commands/) — すべてのオプション
- [`hermes profile export` / `import`](/hermes/docs/reference/profile-commands/#hermes-profile-export) — [エクスポートファイル](#export-and-import-a-profile-file) を扱う CLI コマンド
- [スラッシュコマンド一覧](/hermes/docs/reference/slash-commands/) — `/export`、`/import` ほか、チャットの中で使えるコマンド
- [Hermes で SOUL を使う](/hermes/docs/guides/use-soul-with-hermes/) — 人格の書き方
- [人格と SOUL](/hermes/docs/user-guide/features/personality/) — SOUL がエージェントの中でどう働くか
- [スキルカタログ](/hermes/docs/reference/skills-catalog/) — 同梱できるスキル
