---
title: "Reddit Reading — Reddit を読む: サブレディット、検索、スレッド、ユーザー"
description: "Reddit を読む: サブレディット、検索、スレッド、ユーザー"
upstream_path: user-guide/skills/bundled/social-media/social-media-reddit-reading.md
upstream_blob: 812e9d89b994a7a531ff7fad90cc352c778c2ed1
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/social-media/social-media-reddit-reading
---

# Reddit Reading {#reddit-reading}

Reddit を読みます。サブレディット、検索、スレッド、ユーザーに対応し、ブラウザは使いません。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/social-media/reddit-reading` |
| バージョン | `1.0.0` |
| 作者 | Teknium (teknium1), Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Reddit`, `Social Media`, `Research`, `Discussions`, `Community` |
| 関連 skill | [`rss-feeds`](/hermes/docs/user-guide/skills/bundled/research/research-rss-feeds/), [`grounded-citations`](/hermes/docs/user-guide/skills/bundled/research/research-grounded-citations/), [`blocked-page-recovery`](/hermes/docs/user-guide/skills/bundled/web/web-blocked-page-recovery/), [`xurl`](/hermes/docs/user-guide/skills/bundled/social-media/social-media-xurl/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Reddit Reading Skill {#reddit-reading-skill}

Reddit の中身を読みます。サブレディットの一覧、サイト全体やサブレディット内の検索、コメントまで含めた
スレッド全体、ユーザーの活動を、ふつうの経路がふさがれているサーバーや画面のない端末からでも取れます。
投稿も投票もせず、ユーザーとしてログインもしません。着想は [Agent Reach](https://github.com/Panniantong/Agent-Reach)
のプラットフォームごとのバックエンド切り替えから得ています。

## 使いどころ {#when-to-use}

- 「r/LocalLLaMA では X について何が言われている？」「Y についての Reddit のスレッドを探して」「この
  Reddit のスレッドを要約して」「u/someone は最近どんな投稿をしている？」といった場面。
- 利用者から渡された `reddit.com` の URL すべて。サーバーの IP からだと `web_extract`、`browser_navigate`、
  `.json` のエンドポイントはどれも失敗します（403 か "Prove your humanity" の壁）。この skill が通る道です。
- 投稿、投票、メッセージ送信など、ユーザーとしてのログインが要ることには使いません。

## 前提 {#prerequisites}

**ありません。** Reddit のアカウントも、ログインも、Cookie も、API キーも要りません。既定のバックエンドは
Reddit が公開している Atom フィード（`.rss` のエンドポイント）で、これは住宅回線以外の IP に対して Reddit が
いまも返してくれる唯一の未認証の経路です。IP ごとにおよそ毎分1回に絞られていて、返ってくるデータも薄め
（スコアなし、トップレベルのコメントのみ）ですが、数回の呼び出しなら十分です。

**任意の格上げ（アプリの認証情報。ユーザーのログインは不要）:** 継続的に使いたいときや、そろったデータが
欲しいときは、https://www.reddit.com/prefs/apps で "script" タイプのアプリを無料で登録し、その2つの値を
`~/.hermes/.env` に書いてください。

```
REDDIT_CLIENT_ID=...
REDDIT_CLIENT_SECRET=...
```

これはアプリの登録であって、ログインではありません。スクリプトはアプリ単位の `client_credentials` の
付与方式だけを使い、ユーザー名もパスワードもブラウザの Cookie も使わず、そのユーザーとして振る舞うことも
ありません。2つの値がそろっていれば自動で OAuth の API に切り替わります（毎分およそ100回、スコアあり、
入れ子のコメント、`num_comments` 付き）。値が無い、あるいは拒否されたときは匿名のフィードに戻り、その旨を標準エラーに出します。

| | 匿名のフィード（既定） | OAuth のアプリ認証情報 |
|---|---|---|
| 準備 | 不要 | 1分ほどのアプリ登録と、`.env` への2つの値 |
| 回数の上限 | IP ごとにおよそ毎分1回 | およそ毎分100回 |
| スレッドのデータ | 投稿とトップレベルのコメント、スコアなし | 入れ子のコメント、スコア、コメント数 |
| ユーザーとして振る舞うか | いいえ | いいえ |

## 実行のしかた {#how-to-run}

どのコマンドも `terminal` から、skill からの相対パスで実行します。

```bash
python3 scripts/reddit.py doctor                                  # which backend, current rate-limit window
python3 scripts/reddit.py sub LocalLLaMA --sort hot --limit 15
python3 scripts/reddit.py search "hermes agent" --sub LocalLLaMA --sort new
python3 scripts/reddit.py thread https://www.reddit.com/r/x/comments/abc123/slug/ --limit 40
python3 scripts/reddit.py user spez --limit 10
python3 scripts/reddit.py --json search "topic"                  # machine-readable
```

## 早見表 {#quick-reference}

どのコマンドも両方のバックエンドで動きます。どちらを使うかはスクリプトが決めるので、フラグを渡す必要はありません。

| やりたいこと | コマンド | 匿名 | OAuth |
|---|---|---|---|
| サブレディットのトップページ | `sub NAME --sort hot\|new\|top\|rising [--time week]` | ✔ | ✔ |
| Reddit 全体を検索する | `search "q" --sort relevance\|new\|top\|comments` | ✔ | ✔ |
| ひとつのサブレディットを検索する | `search "q" --sub NAME` | ✔ | ✔ |
| スレッドとコメント | `thread URL --limit N` | ✔ トップレベルのみ、スコアなし | ✔ 入れ子とスコアあり |
| ユーザーの投稿とコメント | `user NAME` | ✔ | ✔ |
| バックエンドと回数の上限 | `doctor` | ✔ | ✔ |

## 手順 {#procedure}

① そのセッションでまだ呼んでいなければ、作業ごとに1回 `doctor` を実行します。どちらのバックエンドが
生きているか、匿名の待ち時間があと何秒残っているかが分かります。

② 呼び出す前に組み立てを考えます。匿名の Reddit で許されるのは、おおよそ **IP ごとに毎分1回** です。
429 が返ると、スクリプトは待ち時間が明けるまで眠ってから1回だけ再試行するので、5回呼ぶ計画はおよそ5分かかります。
`sub` の一覧を何度も取るより `search --sub` を1回、一覧全体を読むよりスレッドを1本、というふうに寄せてください。

③ 「コミュニティで何が言われているか」を知りたいときは、タイトルで止めずにスレッドの本文（`thread`）まで
読んでください。一覧には各投稿の先頭 300 文字ほどしか入っていません。

④ 結果をレポートに使うときは、一覧のページではなくパーマリンク（`url` の項目）を出典にしてください。
`grounded-citations` は、ほかの出典と同じようにこの URL を登録します。

⑤ 利用者が Reddit を継続して使いたいとき（見張りたい、10回以上呼びたい）は、制限をこすりながら進めずに
いったん止めて、アプリの認証情報の登録（前提の節）をお願いしてください。そのとき、これは無料のアプリ登録で
あって、Hermes を相手のアカウントにログインさせるものではない、とはっきり伝えてください。Reddit のパスワードや
ブラウザの Cookie を求めては絶対にいけません。

## つまずきやすいところ {#pitfalls}

- `www.reddit.com/…/.json`、`api.reddit.com`、`old.reddit.com` は、データセンターの IP に対しては 403 か
  中身のない "Welcome to Reddit" の殻を返します。これらに切り替えないでください。ブラウザの User-Agent を
  名乗るのもやめてください（これも 403 になります）。
- `r.jina.ai` と `browser_navigate` ツールも同じ壁に当たります（"blocked by network security" や人間かどうかの確認）。
  `blocked-page-recovery` の Wayback 経路なら、保存されている **古い** スレッドは取り戻せますが、
  新しいものは取れません。
- 匿名のスレッドのフィードには、投稿とトップレベルのコメントしか入っていません（Reddit がフィードの件数を
  ごくわずかに抑えています）。スコアと返信の入れ子は OAuth でしか取れません。
- フィードに対する Reddit の `limit` は目安でしかありません。いくつ指定しても 5〜25 件だと思ってください。
- `REDDIT_CLIENT_SECRET` をチャットやログに貼らないでください。スクリプトは環境からしか読みません。
- 429 をループでの再試行やプロキシの追加で「直そう」としないでください。制限は IP ごとにかかっていて、
  スクリプトはすでに1回待っています。429 が続けて出るなら、その作業にはアプリの認証情報が必要です。

## 確認 {#verification}

`python3 scripts/reddit.py doctor` を実行すると `anonymous_feed: ok` と
`x-ratelimit-reset` の値が表示されます。`sub announcements --limit 1` を実行すると、
`reddit.com/r/announcements/comments/` の URL を含む記事が1件返ります。認証情報を設定していれば、`doctor` は
`active_backend: oauth` と表示し、`thread …` の出力にはスコアの数字が出ます。
