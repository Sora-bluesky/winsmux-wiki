---
title: "Blogwatcher — blogwatcher-cli を使ってブログや RSS/Atom フィードの更新を追いかける"
description: "blogwatcher-cli を使ってブログや RSS/Atom フィードの更新を追いかける"
upstream_path: user-guide/skills/optional/research/research-blogwatcher.md
upstream_blob: e929ea0863ca182e0136b7757d5dff412dfa8d80
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/research/research-blogwatcher
---

# Blogwatcher {#blogwatcher}

blogwatcher-cli を使って、ブログや RSS/Atom フィードの更新を追いかけます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加で導入します。`hermes skills install official/research/blogwatcher` で入ります |
| パス | `optional-skills/research/blogwatcher` |
| バージョン | `2.0.0` |
| 作者 | JulienTant (fork of Hyaxia/blogwatcher) |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `RSS`, `Blogs`, `Feed-Reader`, `Monitoring` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Blogwatcher {#blogwatcher}

`blogwatcher-cli` を使って、ブログと RSS/Atom フィードの更新を追いかけます。フィードの自動検出、うまくいかないときの HTML からの抽出、OPML の取り込み、既読・未読の管理に対応しています。

## Hermes のツールと組み合わせる（最初に読んでください） {#working-with-hermes-tools-read-this-first}

`blogwatcher-cli` はフィードのデータベースで、そのまわりの自動化は Hermes のツールが受け持ちます。

- **定期的に見張るときは、ただのスケジュールではなく cronjob ツールの `monitor` を使ってください。** `monitor` は実行のたびにスクリプトを走らせ、出力が変わったときだけエージェントを起こします。`blogwatcher-cli scan >/dev/null 2>&1 && blogwatcher-cli articles` を実行するスクリプトを指定してください（出力が毎回同じ形になるので、新しい記事が出た＝出力が変わった＝差分が渡された状態でエージェントが起きる、という流れになります）。変化がなかった回は LLM の呼び出しがゼロです。`deliver` を設定するとダイジェストをチャットやチャンネルへ流せます。`continuity: true` を足しておくと、続けて届くダイジェストどうしで重複を省けます。
- **利用者から聞かれた記事を読むとき**: `blogwatcher-cli articles` に出ている記事の URL に対して `web_extract([url])` を使ってください。自分で取り直さないでください。
- **フィードの仕組みは要らず、1回きり「このページの変化を見張りたい」だけのとき**: この skill は使いません。cronjob ツールの `monitor` は http(s) の URL をそのまま受け取れます。
- **1回きりフィードやサイトの最新記事を読むだけで、何も入れたくないとき**: 最初から入っている `rss-feeds` skill（`scripts/feed.py read URL`）を使ってください。blogwatcher が生きてくるのは、たくさんのフィードを既読・未読の状態付きで追いかけるときです。
- **企業や競合の追跡を、分析と出典付きで行いたいとき**: `competitor-news-monitor` skill のほうが向いています。blogwatcher は、その土台になる軽いフィード層です。

## 導入 {#installation}

どれかひとつを選んでください。

- **Go:** `go install github.com/JulienTant/blogwatcher-cli/cmd/blogwatcher-cli@latest`
- **Docker:** `docker run --rm -v blogwatcher-cli:/data ghcr.io/julientant/blogwatcher-cli`
- **バイナリ (Linux amd64):** `curl -sL https://github.com/JulienTant/blogwatcher-cli/releases/latest/download/blogwatcher-cli_linux_amd64.tar.gz | tar xz -C /usr/local/bin blogwatcher-cli`
- **バイナリ (Linux arm64):** `curl -sL https://github.com/JulienTant/blogwatcher-cli/releases/latest/download/blogwatcher-cli_linux_arm64.tar.gz | tar xz -C /usr/local/bin blogwatcher-cli`
- **バイナリ (macOS Apple Silicon):** `curl -sL https://github.com/JulienTant/blogwatcher-cli/releases/latest/download/blogwatcher-cli_darwin_arm64.tar.gz | tar xz -C /usr/local/bin blogwatcher-cli`
- **バイナリ (macOS Intel):** `curl -sL https://github.com/JulienTant/blogwatcher-cli/releases/latest/download/blogwatcher-cli_darwin_amd64.tar.gz | tar xz -C /usr/local/bin blogwatcher-cli`

リリースの一覧: https://github.com/JulienTant/blogwatcher-cli/releases

### Docker で保存先を残す {#docker-with-persistent-storage}

データベースは既定では `~/.blogwatcher-cli/blogwatcher-cli.db` に置かれます。Docker ではコンテナを作り直すたびに消えてしまうので、`BLOGWATCHER_DB` かボリュームのマウントで残してください。

```bash
# Named volume (simplest)
docker run --rm -v blogwatcher-cli:/data -e BLOGWATCHER_DB=/data/blogwatcher-cli.db ghcr.io/julientant/blogwatcher-cli scan

# Host bind mount
docker run --rm -v /path/on/host:/data -e BLOGWATCHER_DB=/data/blogwatcher-cli.db ghcr.io/julientant/blogwatcher-cli scan
```

### 元の blogwatcher からの移行 {#migrating-from-the-original-blogwatcher}

`Hyaxia/blogwatcher` から乗り換えるときは、データベースを移してください。

```bash
mv ~/.blogwatcher/blogwatcher.db ~/.blogwatcher-cli/blogwatcher-cli.db
```

実行ファイルの名前は `blogwatcher` から `blogwatcher-cli` に変わりました。

## よく使うコマンド {#common-commands}

### ブログの管理 {#managing-blogs}

- ブログを追加する: `blogwatcher-cli add "My Blog" https://example.com`
- フィードを明示して追加する: `blogwatcher-cli add "My Blog" https://example.com --feed-url https://example.com/feed.xml`
- HTML からの抽出で追加する: `blogwatcher-cli add "My Blog" https://example.com --scrape-selector "article h2 a"`
- 追いかけているブログを一覧する: `blogwatcher-cli blogs`
- ブログを外す: `blogwatcher-cli remove "My Blog" --yes`
- OPML から取り込む: `blogwatcher-cli import subscriptions.opml`

### 巡回と閲覧 {#scanning-and-reading}

- すべてのブログを巡回する: `blogwatcher-cli scan`
- ひとつのブログだけ巡回する: `blogwatcher-cli scan "My Blog"`
- 未読の記事を一覧する: `blogwatcher-cli articles`
- すべての記事を一覧する: `blogwatcher-cli articles --all`
- ブログで絞り込む: `blogwatcher-cli articles --blog "My Blog"`
- カテゴリで絞り込む: `blogwatcher-cli articles --category "Engineering"`
- 記事を既読にする: `blogwatcher-cli read 1`
- 記事を未読に戻す: `blogwatcher-cli unread 1`
- すべて既読にする: `blogwatcher-cli read-all`
- ひとつのブログをすべて既読にする: `blogwatcher-cli read-all --blog "My Blog" --yes`

## 環境変数 {#environment-variables}

すべてのフラグは、`BLOGWATCHER_` で始まる環境変数でも指定できます。

| 変数 | 説明 |
|---|---|
| `BLOGWATCHER_DB` | SQLite のデータベースファイルのパス |
| `BLOGWATCHER_WORKERS` | 同時に巡回するワーカーの数（既定は 8） |
| `BLOGWATCHER_SILENT` | 巡回時に "scan done" だけを出力する |
| `BLOGWATCHER_YES` | 確認のプロンプトを飛ばす |
| `BLOGWATCHER_CATEGORY` | 記事をカテゴリで絞り込むときの既定値 |

## 出力の例 {#example-output}

```
$ blogwatcher-cli blogs
Tracked blogs (1):

  xkcd
    URL: https://xkcd.com
    Feed: https://xkcd.com/atom.xml
    Last scanned: 2026-04-03 10:30
```

```
$ blogwatcher-cli scan
Scanning 1 blog(s)...

  xkcd
    Source: RSS | Found: 4 | New: 4

Found 4 new article(s) total!
```

```
$ blogwatcher-cli articles
Unread articles (2):

  [1] [new] Barrel - Part 13
       Blog: xkcd
       URL: https://xkcd.com/3095/
       Published: 2026-04-02
       Categories: Comics, Science

  [2] [new] Volcano Fact
       Blog: xkcd
       URL: https://xkcd.com/3094/
       Published: 2026-04-01
       Categories: Comics
```

## 補足 {#notes}

- `--feed-url` を渡さなかったときは、ブログのトップページから RSS/Atom のフィードを自動で見つけます。
- RSS がうまくいかず、`--scrape-selector` が設定されているときは、HTML からの抽出に切り替えます。
- RSS/Atom フィードのカテゴリは保存されるので、記事の絞り込みに使えます。
- Feedly、Inoreader、NewsBlur などから書き出した OPML ファイルで、ブログをまとめて取り込めます。
- データベースは既定で `~/.blogwatcher-cli/blogwatcher-cli.db` に置かれます（`--db` か `BLOGWATCHER_DB` で変えられます）。
- すべてのフラグとオプションは `blogwatcher-cli <command> --help` で確認できます。
