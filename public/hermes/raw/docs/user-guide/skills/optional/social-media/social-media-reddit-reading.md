---
title: "Reddit Reading — Reddit を読む。サブレディット、検索、スレッド、ユーザー"
description: "Reddit を読む。サブレディット、検索、スレッド、ユーザー"
upstream_path: user-guide/skills/optional/social-media/social-media-reddit-reading.md
upstream_blob: f3c4e12ecb3eb71526def9746136415a6b411f19
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/social-media/social-media-reddit-reading
---

# Reddit Reading {#reddit-reading}

Reddit を読みます。サブレディット、検索、スレッド、ユーザー。ブラウザは使いません。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加で導入します。`hermes skills install official/social-media/reddit-reading` で入ります |
| パス | `optional-skills/social-media/reddit-reading` |
| バージョン | `1.0.0` |
| 作者 | Teknium (teknium1), Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Reddit`, `Social Media`, `Research`, `Discussions`, `Community` |
| 関連 skill | [`rss-feeds`](/hermes/docs/user-guide/skills/optional/research/research-rss-feeds/), [`grounded-citations`](/hermes/docs/user-guide/skills/bundled/research/research-grounded-citations/), [`blocked-page-recovery`](/hermes/docs/user-guide/skills/bundled/web/web-blocked-page-recovery/), [`xurl`](/hermes/docs/user-guide/skills/bundled/social-media/social-media-xurl/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Reddit Reading Skill {#reddit-reading-skill}

Reddit の中身、つまりサブレディットの一覧、サイト全体や特定サブレディットの検索、コメント込みの
スレッド全文、ユーザーの活動を読みます。ふつうの経路が通らないサーバーや画面のない環境からでも
読めます。投稿も、投票も、ユーザーとしてのログインもしません。着想のもとは
[Agent Reach](https://github.com/Panniantong/Agent-Reach) の、プラットフォームごとに経路を選ぶ作りです。

## こんなときに使います {#when-to-use}

- 「r/LocalLLaMA では X がどう言われている？」「Y についての Reddit のスレッドを探して」
  「この Reddit のスレッドを要約して」「u/someone は最近何を投稿している？」
- 利用者が渡してきた `reddit.com` の URL すべて。`web_extract`、`browser_navigate`、
  `.json` の各エンドポイントは、サーバーの IP からはどれも通りません（403 か「人間であることを証明してください」の壁です）。
  この skill が、いま通る道です。
- 投稿、投票、メッセージ送信など、ユーザーとしてのログインが要ることには使えません。

## 事前に必要なもの {#prerequisites}

**ありません。** Reddit のアカウントも、ログインも、Cookie も、API キーも要りません。既定の経路は
Reddit が公開している Atom フィード（`.rss` のエンドポイント）で、家庭用以外の IP に対して Reddit がいまも
返してくれる、認証なしの唯一の道です。同じ IP から 1 分に 1 回ほどに制限され、返る内容も薄め
（スコアが無く、コメントは第一階層だけ）ですが、数回の呼び出しなら十分です。

**任意の上積み（アプリの認証情報。それでもユーザーのログインではありません）:** 続けて使う場合や、
そろった内容が欲しい場合は、https://www.reddit.com/prefs/apps で「script」種別のアプリを無料で登録し、
その二つの値を `~/.hermes/.env` に書いてください。

```
REDDIT_CLIENT_ID=...
REDDIT_CLIENT_SECRET=...
```

これはアプリの登録であって、ログインではありません。スクリプトはアプリだけで完結する
`client_credentials` の方式を使い、ユーザー名もパスワードもブラウザの Cookie も使わず、
利用者本人として振る舞うこともありません。両方の値がそろうと自動で OAuth の API に切り替わります
（1 分あたり 100 回ほど、スコア、入れ子のコメント、`num_comments` が取れます）。値が無い、あるいは
弾かれた場合は、認証なしのフィードに戻り、そのことを標準エラー出力に伝えます。

| | 認証なしのフィード（既定） | OAuth のアプリ認証情報 |
|---|---|---|
| 準備 | 不要 | アプリ登録 1 分と、`.env` への 2 つの値 |
| 呼び出しの上限 | IP ごとに 1 分に 1 回ほど | 1 分に 100 回ほど |
| スレッドの内容 | 投稿と第一階層のコメント。スコアなし | 入れ子のコメント、スコア、コメント数 |
| 本人として振る舞うか | いいえ | いいえ |

## 実行のしかた {#how-to-run}

コマンドはすべて `terminal` から、skill からの相対パスで実行します。

```bash
python3 scripts/reddit.py doctor                                  # which backend, current rate-limit window
python3 scripts/reddit.py sub LocalLLaMA --sort hot --limit 15
python3 scripts/reddit.py search "hermes agent" --sub LocalLLaMA --sort new
python3 scripts/reddit.py thread https://www.reddit.com/r/x/comments/abc123/slug/ --limit 40
python3 scripts/reddit.py user spez --limit 10
python3 scripts/reddit.py --json search "topic"                  # machine-readable
```

## 早見表 {#quick-reference}

どのコマンドもどちらの経路でも動きます。経路はスクリプトが選ぶので、指定は要りません。

| したいこと | コマンド | 認証なし | OAuth |
|---|---|---|---|
| サブレディットのトップ | `sub NAME --sort hot\|new\|top\|rising [--time week]` | ✔ | ✔ |
| Reddit 全体を検索 | `search "q" --sort relevance\|new\|top\|comments` | ✔ | ✔ |
| ひとつのサブレディットを検索 | `search "q" --sub NAME` | ✔ | ✔ |
| スレッドとコメント | `thread URL --limit N` | ✔ 第一階層だけ、スコアなし | ✔ 入れ子、スコアあり |
| ユーザーの投稿とコメント | `user NAME` | ✔ | ✔ |
| 経路と呼び出し制限 | `doctor` | ✔ | ✔ |

## 手順 {#procedure}

① その会話でまだ呼んでいなければ、作業のはじめに `doctor` を 1 回。どちらの経路が生きていて、
認証なしの待ち時間があと何秒残っているかが分かります。

② 呼び出す前に計画を立ててください。認証なしの Reddit は、おおよそ **同じ IP から 1 分に 1 回**です。
429 が返るとスクリプトは待ち時間が明けるまで眠って 1 回だけやり直すので、5 回呼ぶ計画は
5 分ほどかかります。`sub` の一覧を何度も取るより `search --sub` を 1 回、一覧をまるごと読むより
スレッドを 1 本読むほうを選んでください。

③ 「コミュニティが何と言っているか」を知りたいときは、タイトルで止めずにスレッドの本文
（`thread`）まで読んでください。一覧には各投稿の先頭 300 文字ほどしか載りません。

④ 結果をレポートに使うときは、一覧のページではなく個別のリンク（`url` の項目）を出典にします。
`grounded-citations` は、これらの URL をほかの情報源と同じように登録します。

⑤ 利用者が Reddit を継続的に使う必要があるとき（見張りたい、10 回以上呼びたい）は、制限の中で
粘らずに手を止めて、事前に必要なもののところにあるアプリの認証情報を登録してもらってください。
はっきりこう伝えてください。これは無料のアプリ登録であって、Hermes を本人のアカウントに
ログインさせるものではありません、と。Reddit のパスワードやブラウザの Cookie を求めてはいけません。

## つまずきやすいところ {#pitfalls}

- `www.reddit.com/…/.json`、`api.reddit.com`、`old.reddit.com` は、データセンターの IP に対しては
  403 か、中身の無い「Welcome to Reddit」の外枠を返します。そこへ逃げないでください。ブラウザの
  User-Agent を名乗るのもだめです（これも 403 です）。
- `r.jina.ai` と `browser_navigate` ツールも同じ壁（「blocked by network security」や人間確認）に当たります。
  `blocked-page-recovery` の Wayback を通る道なら、保存されていた**古い**スレッドは拾えますが、
  新しいものは取れません。
- 認証なしのスレッドのフィードには、投稿と第一階層のコメントしか入りません（Reddit がフィードの件数を
  数件に絞っています）。スコアと返信の入れ子は OAuth のときだけです。
- フィードでの Reddit の `limit` は目安でしかありません。いくつ頼んでも 5〜25 件だと思ってください。
- `REDDIT_CLIENT_SECRET` をチャットやログに貼らないでください。スクリプトは環境からしか読みません。
- 429 を、繰り返し呼び直したりプロキシを足したりして「直そう」としないでください。制限は IP ごとで、
  スクリプトはすでに 1 回待ち時間をやり過ごしています。429 が続けて出るなら、その作業には
  アプリの認証情報が要ります。

## 確認 {#verification}

`python3 scripts/reddit.py doctor` を実行すると `anonymous_feed: ok` と
`x-ratelimit-reset` の値が出ます。`sub announcements --limit 1` を実行すると、
`reddit.com/r/announcements/comments/` の URL を持つ記事が 1 件返ります。認証情報を設定してあれば、
`doctor` は `active_backend: oauth` を出し、`thread …` の出力にはスコアの数値が並びます。
