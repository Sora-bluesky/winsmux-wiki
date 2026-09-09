---
title: "Rss Feeds — RSS・Atom・JSON のフィードを読み、ページの裏にあるフィードを見つける"
description: "RSS・Atom・JSON のフィードを読み、ページの裏にあるフィードを見つける"
upstream_path: user-guide/skills/optional/research/research-rss-feeds.md
upstream_blob: e5e951d1f5909e9112f408a7f8219ad22cf58b43
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/research/research-rss-feeds
---

# Rss Feeds {#rss-feeds}

RSS・Atom・JSON のフィードを読み、ページの裏にあるフィードを見つけます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加で導入します。`hermes skills install official/research/rss-feeds` で入ります |
| パス | `optional-skills/research/rss-feeds` |
| バージョン | `1.0.0` |
| 作者 | Teknium (teknium1), Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `RSS`, `Atom`, `Feeds`, `Monitoring`, `Research`, `Blogs`, `Releases` |
| 関連 skill | [`reddit-reading`](/hermes/docs/user-guide/skills/optional/social-media/social-media-reddit-reading/), [`competitor-news-monitor`](/hermes/docs/user-guide/skills/bundled/research/research-competitor-news-monitor/), [`grounded-citations`](/hermes/docs/user-guide/skills/bundled/research/research-grounded-citations/), [`youtube-content`](/hermes/docs/user-guide/skills/bundled/media/media-youtube-content/), [`blogwatcher`](/hermes/docs/user-guide/skills/optional/research/research-blogwatcher/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# RSS Feeds Skill {#rss-feeds-skill}

RSS 2.0、RSS 1.0/RDF、Atom、JSON Feed のどの URL でも読み込んで、日付順に並んだ見やすい記事の
一覧にします。ふつうのページの URL からその裏にあるフィードを見つけることもできます（`<link rel="alternate">` や、
よくある `/feed`、`/rss.xml`、`/atom.xml` といったパスをたどります）。標準ライブラリだけで動くので、
入れるものはありません。記事の本文までは取ってきません。本文が必要なときは、記事のリンクを `web_extract` に渡してください。

## こんなときに使います {#when-to-use}

- 「&lt;blog/site> の新着は？」「&lt;GitHub repo> の最新リリースは？」「&lt;subreddit> の最近の投稿は？」
  「このフィードを読んで」「このサイトに RSS はある？」
- `cronjob_manage` で定期的なダイジェストを作るとき（毎回 HTML のトップページを取りに行くより、フィードのほうが
  安上がりで壊れにくいからです）。たくさんのフィードを既読・未読の状態付きで持ち続けたいなら、追加で導入する
  `blogwatcher` skill を入れてください。この skill は、何も入れずに読むための道具です。
- `title / link / date / author / summary` の構造化された一覧が、表示されたページより役に立つ場面すべて。
  ポッドキャスト、更新履歴、YouTube のチャンネル、報道発表、掲示板のカテゴリなどです。

## 事前に必要なもの {#prerequisites}

ありません。Python 3.10 以上と、フィードのあるホストへの通信ができれば動きます。

## 実行のしかた {#how-to-run}

`terminal` から、skill からの相対パスでスクリプトを実行します。

```bash
python3 scripts/feed.py read https://hnrss.org/frontpage --limit 10
python3 scripts/feed.py read https://simonwillison.net/            # page URL → discovers the feed
python3 scripts/feed.py read URL --since 2026-09-01 --json          # only newer entries, machine-readable
python3 scripts/feed.py discover https://example.com/               # list candidate feed URLs
```

## 早見表 {#quick-reference}

| 情報源 | フィードの URL の形 |
|---|---|
| GitHub のリリース / コミット / タグ | `https://github.com/OWNER/REPO/releases.atom`, `…/commits/BRANCH.atom`, `…/tags.atom` |
| サブレディット / Reddit の検索 | `https://www.reddit.com/r/NAME/.rss`, `https://www.reddit.com/search.rss?q=…`（未ログインでは 1 分に 1 回。`reddit-reading` も見てください） |
| YouTube のチャンネル | `https://www.youtube.com/feeds/videos.xml?channel_id=UC…` |
| Hacker News | `https://hnrss.org/frontpage`, `https://hnrss.org/newest?q=TERM` |
| arXiv のカテゴリ | `https://rss.arxiv.org/rss/cs.CL` |
| Substack / Medium / WordPress / Ghost | `SITE/feed`, `medium.com/feed/@user`, `SITE/rss/` |
| ポッドキャスト | 配信ページに書かれているその番組の RSS URL（`discover` が見つけます） |

1 件ごとに返る項目は `title`、`link`、`published`（UTC の ISO 8601）、`author`、`summary`
（HTML を取り除いた 2000 文字以内）です。新しいものから順に並びます。

## 手順 {#procedure}

① サイトの URL しか分からないときは、そのまま `read` にかけてください。スクリプトがフィードを見つけ、
どの URL を使ったかを `discovered_from` として教えてくれます。宣言されている複数のフィード
（コメント用と投稿用、カテゴリごとなど）から選びたいときは `discover` を使います。

② 取る範囲を区切ります。「最新の N 件」なら `--limit`、「前回のチェック以降」なら
`--since YYYY-MM-DD` です。定期的なダイジェストでは、最後に見た `published` の値を残しておき、
次回それを `--since` に渡します。

③ 本文が要るときは、記事の `link` を `web_extract` に渡してください。フィードの要約は、
途中で切れていたり最初の段落だけだったりすることがよくあります。

④ 結果をレポートに使うときは、フィードの URL ではなく記事の `link` を出典にします
（`grounded-citations`）。

## つまずきやすいところ {#pitfalls}

- 200 が返ってきても中身が HTML なら、その URL はフィードではなくページです。スクリプトは自動で
  フィード探しに切り替えますが、`<link rel="alternate">` も無く、よくあるパスにも何も無いサイトでは
  `no feed found` と報告します。無いと決める前に、サイトのフッターや `/sitemap.xml` を確かめてください。
- Reddit のフィードは Reddit の未ログイン時の制限（同じ IP から 1 分に 1 回ほど）を共有します。
  Reddit への呼び出しが 2 回以上必要なときは、待ち時間をやり過ごしてくれる `reddit-reading` を
  経由してください。
- 日付について。RSS の `pubDate` は RFC 822、Atom は ISO 8601 ですが、スクリプトはどちらも
  UTC にそろえます。日付の無いフィードは末尾に並び、`--since` では落ちます。
- 一部のフィードは Cloudflare の前にあり、ブラウザ以外からの取得を 403 で断ります。この手のものは
  `blocked-page-recovery` が扱います。

## 確認 {#verification}

`python3 scripts/feed.py read https://github.com/NousResearch/hermes-agent/releases.atom --limit 1` を実行すると、
`releases/tag/` を含むリンクと `[atom]` という形式の表示が付いた記事が 1 件出ます。
`discover https://simonwillison.net/` を実行すると `/atom/` の URL が出ます。
