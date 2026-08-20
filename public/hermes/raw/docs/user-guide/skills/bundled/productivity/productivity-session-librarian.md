---
title: "Session Librarian — 話しかけるだけでセッションを整理する: 探す・名前を変える・しまう・減らす"
description: "話しかけるだけでセッションを整理する: 探す・名前を変える・しまう・減らす"
upstream_path: user-guide/skills/bundled/productivity/productivity-session-librarian.md
upstream_blob: d1992db21e2a4c73aba5e708c8c5e7b80568d2f9
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/productivity/productivity-session-librarian
---

# Session Librarian {#session-librarian}

話しかけるだけでセッションを整理します。探す、名前を変える、しまう、減らす、をまかなえます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/productivity/session-librarian` |
| バージョン | `1.0.0` |
| 作者 | Hermes Agent + Teknium |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Sessions`, `Organization`, `Cleanup`, `Library`, `Productivity` |
| 関連 skill | [`weekly-review-planning`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-weekly-review-planning/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Session Librarian {#session-librarian}

セッションの書棚を、話しかけるだけで管理します。あるテーマについての過去の
セッションを探し、そこで何を決めたかをまとめ、分かりやすい名前を付け直し、
作業を並行のセッションに分け、古くなったものをしまうか消すかを提案します。
*「Q3 の価格の話をしたセッションを探して、役に立つものを残して、重複を
片付けて」* のような、ふだんの言い方だけで動きます。

Perplexity Computer の、指示から進めるセッション管理（2026 年 8 月）から
着想を得ています。エージェントが利用者自身のセッションの書棚を立ち上げ、
整理し、片付けます。そして何かに手を付ける前に、必ず計画を見せます。

## こんなときに使います {#when-to-use}

- 「X についてのセッションはある?」「X について何を決めたっけ?」
- 「これらのセッションに分かりやすい名前を付けて」
- 「セッションの書棚を片付けて」「古いものをしまって」
- 「あのセッションから枝分かれして、Y に絞った続きにして」
- 「これをチケットごとのセッションに分けて」（下の「並行の作業の流れ」を参照）

## 2 つの入り口 {#the-two-surfaces}

| やりたいこと | 入り口 |
|---|---|
| テーマからセッションを探し、中身を読み、決めたことをまとめる | `session_search` ツール（メッセージの保管庫に対する FTS5） |
| 付随情報（経過日数、発生元、費用、トークン、作業場所）で一覧・絞り込み | terminal から `hermes sessions list` / `stats` |
| 名前を変える | `hermes sessions rename <session_id> <title...>` |
| まとめて隠す（元に戻せます） | `hermes sessions archive <filters>` |
| 削除する（元に戻せません） | `hermes sessions delete` / `hermes sessions prune <filters>` |
| 大事なものを消す前に書き出す | `hermes sessions export --session-id <id> --format md` |
| 別の場所で続きをする | `/branch`（今のセッションから枝分かれ）、または新しいセッションを始めてまとめを引用する |

## 手順 {#procedure}

① **見つけます。** `session_search(query=..., limit=5-10)` にテーマの言葉を
渡します。言い方を変えて何度か試してください（機能名、症状、案件名）。
「telegram から来た 60 日より古いセッション」のように付随情報でまとめて
調べるときは、代わりに `hermes sessions list --source telegram --limit 50` を
使います。

② **セッションごとにまとめます。** 見つけた結果の `bookend_start`（目的）、
一致した箇所の前後、`bookend_end`（決着）でたいてい足ります。決めたことを
詳しく知りたいと頼まれたときだけ、セッションの全体
（`session_search(session_id=...)`）を出してください。報告はそれぞれ、
リンク（`@session:` の形）—— 目的を 1 行 —— 結果を 1 行、の形にします。

③ **手を付ける前に計画を出します（何かを変える操作では必須です）。**
まず計画の表を見せてください。どのセッションをどんな名前に変えるか、
どれをしまうか、どれを削除の候補にするか、その理由（どれと重複しているか、
古くなっている、中身がない）。そのうえで利用者の了解を待ちます。例外は、
名前を利用者がはっきり指定した 1 件の変更だけで、これはそのまま行って
構いません。

④ **いちばん安全な手段で行います。**
- `delete`/`prune` より `archive`（元に戻せる、隠すだけの操作）を選びます。
- 元に戻せない操作は必ず先に `--dry-run` を付けて実行し、その出力を見せて
  から、了解を得たうえで `--yes` を付けて実行し直します。
- 意味のある中身が入っているものを消す前には、控えとして
  `hermes sessions export --format md` を提案してください。

⑤ **報告します。** 変えた名前、しまったセッション（件数と戻し方: しまった
セッションはデータベースに残っていて、`--include-archived` を付けると
一覧に出ます）、書き出したもの、飛ばしたものとその理由。

## 並行の作業の流れ {#parallel-workstreams}

「チケットごとにセッションを分けて、それぞれ調べて、結果を教えて」と
頼まれたときは、動いているほかのセッションを操作しようとしないでください。
作業の流れごとに 1 つずつ `delegate_task` を使います。下請けのエージェントは
それぞれ自動的に自分のセッションで動くので、あとからそのまとめを
つなぎ合わせます。委ねたやり取りの記録も、あとから `session_search` で
探せることを伝えておいてください。

## つまずきやすいところ {#pitfalls}

- **空実行と、この会話でのはっきりした了解なしに削除しないでください。**
  以前に言われた「片付けておいて」は*提案してよい*という意味であって、
  消してよいという意味ではありません。
- **`session_search` が探すのは中身で、付随情報ではありません。** 経過日数・
  費用・発生元での絞り込みはコマンド側にあります。依頼が両方をまたぐとき
  （「価格の話をした古いセッション」）は、両方を組み合わせてください。
- **名前は `/resume <title>` での目印になります。** 名前を変えるときは、
  短く、重ならず、先頭の文字で見分けられるものにしてください。既にある
  名前とぶつかるときは利用者に知らせます。
- **しまうことと消すことは違います。** しまう操作は、既定の一覧から
  隠すだけです。どちらを行ったかをはっきり伝えてください。
- **プロファイルをまたいだセッションのリンク**（`@session:<profile>/<id>`）は、
  別のプロファイルからは読むことしかできません。管理用のコマンドは、今の
  プロファイルのデータベースに対して働きます。

## 確認 {#verification}

片付けが一通り終わったら、探すときの条件と `hermes sessions list` をもう一度
実行し、書棚が計画どおりになっているか確かめてください（残したものが新しい
名前で並んでいて、しまったものが既定の一覧から消えていること）。
