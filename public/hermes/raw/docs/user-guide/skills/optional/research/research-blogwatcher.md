---
title: "Blogwatcher — blogwatcher-cli でブログと RSS/Atom フィードを監視する"
description: "blogwatcher-cli でブログと RSS/Atom フィードを監視する"
upstream_path: user-guide/skills/optional/research/research-blogwatcher.md
upstream_blob: 84d9ac28aa0f74d83a1e3f8d89921c1c984f83df
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/research/research-blogwatcher
---

# Blogwatcher {#blogwatcher}

blogwatcher-cli というツールで、ブログと RSS/Atom フィードを監視します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加 skill — `hermes skills install official/research/blogwatcher` で入れます |
| パス | `optional-skills/research\blogwatcher` |
| バージョン | `2.0.0` |
| 作者 | JulienTant (fork of Hyaxia/blogwatcher) |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `RSS`, `Blogs`, `Feed-Reader`, `Monitoring` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Blogwatcher {#blogwatcher}

`blogwatcher-cli` というツールで、ブログと RSS/Atom フィードの更新を追いかけます。フィードの自動発見、フィードが無いときの HTML 読み取り、OPML の取り込み、既読・未読の管理に対応しています。

## Hermes のツールと組み合わせる（最初に読んでください） {#working-with-hermes-tools-read-this-first}

`blogwatcher-cli` はフィードのデータベースにあたる部分で、そのまわりの自動化は Hermes のツールが受け持ちます。

- **定期的な監視には、単なるスケジュールではなく cronjob ツールの `monitor` 欄を使ってください。** `monitor` は指定したスクリプトを一定間隔で実行し、出力が変わったときだけエージェントを起こします。ここに `blogwatcher-cli scan >/dev/null 2>&1 && blogwatcher-cli articles` を走らせるスクリプトを指定します（出力は毎回同じ形になるので、新しい記事が出た＝出力が変わった＝差分つきでエージェントが起きる、という関係になります）。変化がなかった回は LLM の呼び出しがまったく発生しません。まとめた結果をチャットやチャンネルへ送るには `deliver` を設定し、`continuity: true` を足すと連続した配信のあいだで重複を省けます。
- **利用者から尋ねられた記事を読むとき**: `blogwatcher-cli articles` に出てきた記事の URL に対して `web_extract([url])` を使ってください。自分で取得し直す必要はありません。
- **フィードとは関係なく「このページの変化を見張りたい」だけのとき**: この skill は使いません。cronjob ツールの `monitor` 欄は http(s) の URL をそのまま受け取れます。
- **企業や競合の動きを、分析と出典つきで追いかけたいとき**: `competitor-news-monitor` skill のほうが向いています。blogwatcher は、その土台になる軽いフィード取得の層です。

## 導入 {#installation}

次のいずれかの方法で入れます。

- **Go:** `go install github.com/JulienTant/blogwatcher-cli/cmd/blogwatcher-cli@latest`
- **Docker:** `docker run --rm -v blogwatcher-cli:/data ghcr.io/julientant/blogwatcher-cli`
- **バイナリ (Linux amd64):** `curl -sL https://github.com/JulienTant/blogwatcher-cli/releases/latest/download/blogwatcher-cli_linux_amd64.tar.gz | tar xz -C /usr/local/bin blogwatcher-cli`
- **バイナリ (Linux arm64):** `curl -sL https://github.com/JulienTant/blogwatcher-cli/releases/latest/download/blogwatcher-cli_linux_arm64.tar.gz | tar xz -C /usr/local/bin blogwatcher-cli`
- **バイナリ (macOS Apple Silicon):** `curl -sL https://github.com/JulienTant/blogwatcher-cli/releases/latest/download/blogwatcher-cli_darwin_arm64.tar.gz | tar xz -C /usr/local/bin blogwatcher-cli`
- **バイナリ (macOS Intel):** `curl -sL https://github.com/JulienTant/blogwatcher-cli/releases/latest/download/blogwatcher-cli_darwin_amd64.tar.gz | tar xz -C /usr/local/bin blogwatcher-cli`

配布物の一覧: https://github.com/JulienTant/blogwatcher-cli/releases

### データを残す形で Docker を使う {#docker-with-persistent-storage}

データベースは、何も指定しなければ `~/.blogwatcher-cli/blogwatcher-cli.db` に置かれます。Docker ではコンテナを作り直すたびに消えてしまうので、`BLOGWATCHER_DB` かボリュームのマウントで残るようにします。

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

実行ファイルの名前は `blogwatcher` から `blogwatcher-cli` に変わりました。

## よく使うコマンド {#common-commands}

### ブログを管理する {#managing-blogs}

- ブログを追加する: `blogwatcher-cli add "My Blog" https://example.com`
- フィードを指定して追加する: `blogwatcher-cli add "My Blog" https://example.com --feed-url https://example.com/feed.xml`
- HTML を読み取る形で追加する: `blogwatcher-cli add "My Blog" https://example.com --scrape-selector "article h2 a"`
- 追いかけているブログを一覧する: `blogwatcher-cli blogs`
- ブログを外す: `blogwatcher-cli remove "My Blog" --yes`
- OPML から取り込む: `blogwatcher-cli import subscriptions.opml`

### 取得と閲覧 {#scanning-and-reading}

- すべてのブログを取得する: `blogwatcher-cli scan`
- 1つのブログだけ取得する: `blogwatcher-cli scan "My Blog"`
- 未読の記事を一覧する: `blogwatcher-cli articles`
- すべての記事を一覧する: `blogwatcher-cli articles --all`
- ブログで絞り込む: `blogwatcher-cli articles --blog "My Blog"`
- カテゴリで絞り込む: `blogwatcher-cli articles --category "Engineering"`
- 記事を既読にする: `blogwatcher-cli read 1`
- 記事を未読に戻す: `blogwatcher-cli unread 1`
- すべて既読にする: `blogwatcher-cli read-all`
- 特定のブログをすべて既読にする: `blogwatcher-cli read-all --blog "My Blog" --yes`

## 環境変数 {#environment-variables}

フラグはすべて、`BLOGWATCHER_` で始まる環境変数でも指定できます。

| 変数 | 説明 |
|---|---|
| `BLOGWATCHER_DB` | SQLite のデータベースファイルの場所 |
| `BLOGWATCHER_WORKERS` | 同時に取得する数（既定: 8） |
| `BLOGWATCHER_SILENT` | 取得時に "scan done" だけを出す |
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

- `--feed-url` を指定しなかった場合は、ブログのトップページから RSS/Atom フィードを自動で探します。
- RSS の取得に失敗し、`--scrape-selector` が設定されていれば、HTML の読み取りに切り替えます。
- RSS/Atom フィードのカテゴリは保存され、記事の絞り込みに使えます。
- Feedly、Inoreader、NewsBlur などから書き出した OPML ファイルで、ブログをまとめて取り込めます。
- データベースは、何も指定しなければ `~/.blogwatcher-cli/blogwatcher-cli.db` に置かれます（`--db` か `BLOGWATCHER_DB` で変えられます）。
- 使えるフラグやオプションをすべて見るには `blogwatcher-cli <command> --help` を実行します。
