---
title: "Blogwatcher — blogwatcher-cli ツールでブログや RSS / Atom フィードを見張る"
description: "blogwatcher-cli ツールでブログや RSS / Atom フィードを見張る"
upstream_path: user-guide/skills/bundled/research/research-blogwatcher.md
upstream_blob: f0fcad76f76447b3235e898b780c81ce9e27247e
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/research/research-blogwatcher
---

# Blogwatcher {#blogwatcher}

blogwatcher-cli ツールでブログや RSS / Atom フィードを見張ります。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/research/blogwatcher` |
| バージョン | `2.0.0` |
| 作者 | JulienTant（Hyaxia/blogwatcher からのフォーク） |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `RSS`, `Blogs`, `Feed-Reader`, `Monitoring` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Blogwatcher {#blogwatcher}

`blogwatcher-cli` ツールで、ブログや RSS / Atom フィードの更新を追いかけます。フィードの自動検出、フィードがないときの HTML からの読み取り、OPML の取り込み、既読・未読の管理ができます。

## 導入 {#installation}

どれか 1 つを選んでください。

- **Go:** `go install github.com/JulienTant/blogwatcher-cli/cmd/blogwatcher-cli@latest`
- **Docker:** `docker run --rm -v blogwatcher-cli:/data ghcr.io/julientant/blogwatcher-cli`
- **実行ファイル（Linux amd64）:** `curl -sL https://github.com/JulienTant/blogwatcher-cli/releases/latest/download/blogwatcher-cli_linux_amd64.tar.gz | tar xz -C /usr/local/bin blogwatcher-cli`
- **実行ファイル（Linux arm64）:** `curl -sL https://github.com/JulienTant/blogwatcher-cli/releases/latest/download/blogwatcher-cli_linux_arm64.tar.gz | tar xz -C /usr/local/bin blogwatcher-cli`
- **実行ファイル（macOS Apple Silicon）:** `curl -sL https://github.com/JulienTant/blogwatcher-cli/releases/latest/download/blogwatcher-cli_darwin_arm64.tar.gz | tar xz -C /usr/local/bin blogwatcher-cli`
- **実行ファイル（macOS Intel）:** `curl -sL https://github.com/JulienTant/blogwatcher-cli/releases/latest/download/blogwatcher-cli_darwin_amd64.tar.gz | tar xz -C /usr/local/bin blogwatcher-cli`

すべての配布物はこちらにあります: https://github.com/JulienTant/blogwatcher-cli/releases

### データを残したまま Docker で動かす {#docker-with-persistent-storage}

そのままだとデータベースは `~/.blogwatcher-cli/blogwatcher-cli.db` に置かれます。Docker ではコンテナを再起動すると消えてしまうので、`BLOGWATCHER_DB` を指定するかボリュームを割り当てて残してください。

```bash
# Named volume (simplest)
docker run --rm -v blogwatcher-cli:/data -e BLOGWATCHER_DB=/data/blogwatcher-cli.db ghcr.io/julientant/blogwatcher-cli scan

# Host bind mount
docker run --rm -v /path/on/host:/data -e BLOGWATCHER_DB=/data/blogwatcher-cli.db ghcr.io/julientant/blogwatcher-cli scan
```

### もとの blogwatcher から移ってくる {#migrating-from-the-original-blogwatcher}

`Hyaxia/blogwatcher` から乗り換える場合は、データベースを移動してください。

```bash
mv ~/.blogwatcher/blogwatcher.db ~/.blogwatcher-cli/blogwatcher-cli.db
```

実行ファイルの名前が `blogwatcher` から `blogwatcher-cli` に変わっています。

## よく使うコマンド {#common-commands}

### ブログを管理する {#managing-blogs}

- ブログを追加する: `blogwatcher-cli add "My Blog" https://example.com`
- フィードを明示して追加する: `blogwatcher-cli add "My Blog" https://example.com --feed-url https://example.com/feed.xml`
- HTML の読み取りで追加する: `blogwatcher-cli add "My Blog" https://example.com --scrape-selector "article h2 a"`
- 追いかけているブログを並べる: `blogwatcher-cli blogs`
- ブログを外す: `blogwatcher-cli remove "My Blog" --yes`
- OPML から取り込む: `blogwatcher-cli import subscriptions.opml`

### 巡回して読む {#scanning-and-reading}

- すべてのブログを巡回する: `blogwatcher-cli scan`
- ブログを 1 つだけ巡回する: `blogwatcher-cli scan "My Blog"`
- 未読の記事を並べる: `blogwatcher-cli articles`
- すべての記事を並べる: `blogwatcher-cli articles --all`
- ブログで絞り込む: `blogwatcher-cli articles --blog "My Blog"`
- カテゴリで絞り込む: `blogwatcher-cli articles --category "Engineering"`
- 記事を既読にする: `blogwatcher-cli read 1`
- 記事を未読に戻す: `blogwatcher-cli unread 1`
- すべて既読にする: `blogwatcher-cli read-all`
- 特定のブログをすべて既読にする: `blogwatcher-cli read-all --blog "My Blog" --yes`

## 環境変数 {#environment-variables}

どのフラグも、`BLOGWATCHER_` を頭に付けた環境変数で指定できます。

| 変数 | 説明 |
|---|---|
| `BLOGWATCHER_DB` | SQLite のデータベースファイルの場所 |
| `BLOGWATCHER_WORKERS` | 同時に巡回する数（初期値は 8） |
| `BLOGWATCHER_SILENT` | 巡回時に "scan done" だけを表示する |
| `BLOGWATCHER_YES` | 確認の問い合わせを飛ばす |
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

- `--feed-url` を指定しなかったときは、ブログのトップページから RSS / Atom のフィードを自動で見つけます。
- RSS がうまくいかず `--scrape-selector` が設定されている場合は、HTML の読み取りに切り替えます。
- RSS / Atom のカテゴリは保存され、記事の絞り込みに使えます。
- Feedly、Inoreader、NewsBlur などが書き出した OPML ファイルから、ブログをまとめて取り込めます。
- データベースはそのままだと `~/.blogwatcher-cli/blogwatcher-cli.db` に置かれます（`--db` か `BLOGWATCHER_DB` で変更できます）。
- 使えるフラグや設定をすべて見るには `blogwatcher-cli <command> --help` を実行してください。
