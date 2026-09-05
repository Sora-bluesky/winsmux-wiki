---
title: "Rss Feeds — RSS・Atom・JSON のフィードを読み、ページの裏にあるフィードを見つける"
description: "RSS・Atom・JSON のフィードを読み、ページの裏にあるフィードを見つける"
upstream_path: user-guide/skills/bundled/research/research-rss-feeds.md
upstream_blob: 4946eaa94b5f1eadfbe614677feb55639c26be5c
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/research/research-rss-feeds
---

# Rss Feeds {#rss-feeds}

RSS・Atom・JSON のフィードを読み、ページの裏にあるフィードを見つけます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/research/rss-feeds` |
| バージョン | `1.0.0` |
| 作者 | Teknium (teknium1), Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `RSS`, `Atom`, `Feeds`, `Monitoring`, `Research`, `Blogs`, `Releases` |
| 関連 skill | [`reddit-reading`](/hermes/docs/user-guide/skills/bundled/social-media/social-media-reddit-reading/), [`competitor-news-monitor`](/hermes/docs/user-guide/skills/bundled/research/research-competitor-news-monitor/), [`grounded-citations`](/hermes/docs/user-guide/skills/bundled/research/research-grounded-citations/), [`youtube-content`](/hermes/docs/user-guide/skills/bundled/media/media-youtube-content/), [`blogwatcher`](/hermes/docs/user-guide/skills/optional/research/research-blogwatcher/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# RSS Feeds Skill {#rss-feeds-skill}

RSS 2.0、RSS 1.0/RDF、Atom、JSON Feed のどの URL でも読み込んで、日付順に並んだ
すっきりした記事の一覧にします。ふつうのページの URL からその裏にあるフィードを見つけることもできます（`<link rel="alternate">`
か、よくある `/feed`、`/rss.xml`、`/atom.xml` のパスを見ます）。標準ライブラリだけで動くので、入れるものはありません。
記事の本文までは取ってきません。本文が要るときは、記事のリンクを `web_extract` に渡してください。

## 使いどころ {#when-to-use}

- 「&lt;ブログやサイト> の新着は？」「&lt;GitHub リポジトリ> の最新リリースは？」「&lt;サブレディット> の最近の投稿は？」
  「このフィードを読んで」「このサイトに RSS フィードはある？」といった場面。
- `cronjob_manage` で定期的なダイジェストを作るとき（毎回 HTML のトップページを取りに行くより、フィードのほうが軽くて壊れにくいです）。
  たくさんのフィードにまたがって既読・未読を保存しておきたいなら、追加導入の `blogwatcher` skill を入れてください。こちらは何も入れずに読むための skill です。
- `title / link / date / author / summary` という決まった形の一覧のほうが、描画されたページより扱いやすい場面すべて。
  ポッドキャスト、更新履歴、YouTube チャンネル、ニュースルーム、掲示板のカテゴリなど。

## 前提 {#prerequisites}

ありません。Python 3.10 以上と、フィードの配信元へつながるネットワークだけです。

## 実行のしかた {#how-to-run}

`terminal` から、skill からの相対パスでスクリプトを実行します。

```bash
python3 scripts/feed.py read https://hnrss.org/frontpage --limit 10
python3 scripts/feed.py read https://simonwillison.net/            # page URL → discovers the feed
python3 scripts/feed.py read URL --since 2026-09-01 --json          # only newer entries, machine-readable
python3 scripts/feed.py discover https://example.com/               # list candidate feed URLs
```

## 早見表 {#quick-reference}

| 対象 | フィード URL の形 |
|---|---|
| GitHub のリリース / コミット / タグ | `https://github.com/OWNER/REPO/releases.atom`, `…/commits/BRANCH.atom`, `…/tags.atom` |
| サブレディット / Reddit の検索 | `https://www.reddit.com/r/NAME/.rss`, `https://www.reddit.com/search.rss?q=…`（匿名だと毎分1回まで。`reddit-reading` を参照） |
| YouTube チャンネル | `https://www.youtube.com/feeds/videos.xml?channel_id=UC…` |
| Hacker News | `https://hnrss.org/frontpage`, `https://hnrss.org/newest?q=TERM` |
| arXiv のカテゴリ | `https://rss.arxiv.org/rss/cs.CL` |
| Substack / Medium / WordPress / Ghost | `SITE/feed`, `medium.com/feed/@user`, `SITE/rss/` |
| ポッドキャスト | 配信ページに載っている番組の RSS URL（`discover` が見つけてくれます） |

記事ごとに返る項目は `title`、`link`、`published`（UTC の ISO 8601）、`author`、`summary`
（HTML を取り除いた 2000 文字以内）です。新しいものから順に並びます。

## 手順 {#procedure}

① サイトの URL しか分からないときは、そのまま `read` にかけてください。スクリプトがフィードを見つけて、
どの URL を使ったかを教えてくれます（`discovered_from`）。複数のフィードが用意されていて選びたいとき
（コメント用と記事用、カテゴリごとのフィードなど）は `discover` を使います。

② 取る量を絞ります。「最新の N 件」なら `--limit`、「前回の確認以降」なら `--since YYYY-MM-DD` です。
cron でダイジェストを作るなら、最後に見た `published` の値を保存しておいて、次回それを
`--since` に渡してください。

③ 本文が要るときは、記事の `link` を `web_extract` に渡します。フィードの要約は途中で切れていたり、
最初の段落だけだったりすることがよくあります。

④ 結果をレポートに使うときは、フィードの URL ではなく記事の `link` を出典にしてください
（`grounded-citations`）。

## つまずきやすいところ {#pitfalls}

- 200 が返ってきても中身が HTML なら、その URL はフィードではなくページです。その場合スクリプトは自動でフィード探しに
  切り替わりますが、`<link rel="alternate">` も無く、よくあるパスにも何も無いサイトでは `no feed found` と出ます。
  無いと決めつける前に、サイトのフッターか `/sitemap.xml` を見てください。
- Reddit のフィードは Reddit の匿名アクセスの制限を共有します（IP ごとにおよそ毎分1回）。
  Reddit への呼び出しが2回以上必要なときは、制限が明けるまで待ってくれる `reddit-reading` を通してください。
- 日付について。RSS の `pubDate` は RFC 822、Atom は ISO 8601 ですが、スクリプトはどちらも UTC に
  そろえます。日付が入っていないフィードは末尾に並び、`--since` では落ちます。
- Cloudflare の後ろにあって、ブラウザ以外のクライアントに 403 を返すフィードもあります。この手のものは
  `blocked-page-recovery` が扱います。

## 確認 {#verification}

`python3 scripts/feed.py read https://github.com/NousResearch/hermes-agent/releases.atom
--limit 1` を実行すると、`releases/tag/` を含むリンクと `[atom]` という形式のタグが付いた記事が1件表示されます。
`discover https://simonwillison.net/` を実行すると `/atom/` の URL が表示されます。
