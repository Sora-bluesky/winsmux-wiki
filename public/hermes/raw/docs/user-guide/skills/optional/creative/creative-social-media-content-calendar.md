---
title: "Social Media Content Calendar — 複数の SNS にまたがる企画を、指示書から投稿まで組み立てる"
description: "複数の SNS にまたがる企画を、指示書から投稿まで組み立てる"
upstream_path: user-guide/skills/optional/creative/creative-social-media-content-calendar.md
upstream_blob: eaf72464eb7c95e4e0b927d0b3ae37a3731fe215
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/creative/creative-social-media-content-calendar
---

# Social Media Content Calendar {#social-media-content-calendar}

複数の SNS にまたがる企画を、指示書から投稿まで組み立てます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール型 — `hermes skills install official/creative/social-media-content-calendar` で入れます |
| パス | `optional-skills/creative\social-media-content-calendar` |
| バージョン | `0.1.0` |
| 作者 | Ben Barclay (benbarclay), Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Social-Media`, `Content-Calendar`, `Campaigns`, `Publishing` |
| 関連 skill | [`xurl`](/hermes/docs/user-guide/skills/bundled/social-media/social-media-xurl/), [`humanizer`](/hermes/docs/user-guide/skills/bundled/creative/creative-humanizer/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として見ています。
:::

# Social Media Content Calendar {#social-media-content-calendar}

選んだ SNS をまたいで、具体的な予定表を組み立てます。この skill が受け持つのは企画の組み立て、投稿ごとの指示書、媒体ごとの作り分け、承認、そして投稿できたことの確認です。API のコマンドは `xurl` のような媒体ごとの skill が受け持ちます。つなぎ込みの無い媒体では、確かに渡せるところまでが「承認済みの下書き」までです — 相手の予約投稿ツールに渡すところで終わりだと伝えてください。投稿したと言ってはいけません。

## こんなときに使います {#when-to-use}

- 「来月の SNS の予定表を作って」
- 「この発表を X、LinkedIn、Instagram、TikTok 向けの投稿にして」
- 「企画の下書きを作って、予約まで入れて」
- 「この記事や動画を SNS 向けに作り直して」

使わない場面: 単発の投稿 1 本だけのとき（その媒体の skill を直接使ってください）。

## 手順 {#procedure}

### 1. 企画の制約を決める {#1-define-campaign-constraints}

目的、届けたい相手、打ち出す内容、使う媒体、期間、出す頻度、語り口、必ず言うこと・言ってはいけないこと、リンク、計測用の付け方の決まり、地域ごとの出し分け、承認と投稿の権限を書き留めます。提案する投稿のどれにも事業上のねらいがはっきりあれば、この段階は完了です。

### 2. 元になる材料を洗い出す {#2-inventory-source-material}

`read_file` と `web_extract` を使い、確認済みの製品情報、発表、記事、素材、許諾を得た推薦の声、ブランド素材、大事な日付を集めます。それぞれの主張について、誰が責任を持つのかと、いつまで有効かを記します。裏の取れていない主張と、足りない素材が目に見えるようになれば完了です。

### 3. 切り口と枠を組み立てる {#3-build-themes-and-calendar-slots}

学び、実績、製品、コミュニティ、催し、舞台裏、対話といった切り口を、偏りなく混ぜます。媒体ごとの出す頻度と、企画の節目も考えに入れてください。日付・媒体・切り口・ねらいがそろい、同じものを media 横断で貼り回しただけではない予定表になっていれば完了です。

### 4. 媒体ごとの指示書を書く {#4-write-platform-specific-briefs}

投稿ごとに、つかみ、伝えたいこと、形式、文の長さ、行動を促す一文、リンク、素材の寸法と中身、読み上げ用の説明文、タグとメンション、成果を測る指標を決めます。媒体のあいだで貼り回すのではなく、作り分けてください。作り手が、隠れた前提なしにその素材を作れる状態になっていれば完了です。

### 5. 文と素材の下書きを作る {#5-draft-copy-and-assets}

語り口には `humanizer` を読み込みます。素材が要るところでは `image_generate` の道具で絵を作ります。事実にあたる部分と、企画を通した一貫した見え方は保ちつつ、媒体ごとの作法には従ってください。予定表のどの枠にも下書きの文があり、素材の状況が分かるようになっていれば完了です。

### 6. 内容と危うさを見直す {#6-run-editorial-and-risk-review}

事実の正しさ、語り口、繰り返し、権利と許諾、読みやすさへの配慮、開示の要否、リンクの飛び先、日付として今も合っているか、世の中の状況から見て差し障りがないかを確かめます。`draft`、`needs review`、`approved` のいずれかを付けてください。下書きのまま投稿してはいけません。どの投稿にも扱いと責任者が付いていれば完了です。

### 7. 予約するか、渡す {#7-schedule-or-hand-off}

承認にかける一式を示します。使える媒体の skill（X なら `xurl`）で、承認済みの投稿だけを投稿・予約してください。つなぎ込みの無い媒体では、承認済みの一式（文、素材、出す時刻）を相手の予約投稿ツール向けに渡し、その枠は「投稿済み」ではなく「引き渡し済み」と記します。実際に投稿したものについては、予約した時刻、アカウント、内容の下見、媒体側の投稿 ID か処理 ID を読み上げて確かめてください。予定表の枠ごとに、確認の取れた投稿状況か引き渡し状況が反映されていれば完了です。

## つまずきやすいところ {#pitfalls}

- どの媒体にも同じ文をそのまま出してしまう。
- 中身の薄い似た投稿で、出す頻度だけ埋めてしまう。
- 裏の取れていない数字、推薦の声、これからの約束を投稿してしまう。
- 素材ができたことを、予約が入ったことと取り違える。
- 下書きまでで終わった媒体について「予約済み」と言ってしまう。

## 確かめ方 {#verification}

- [ ] どの投稿も、企画のねらいと、裏の取れた主張の一覧までたどれる。
- [ ] `draft` や `needs review` の状態から投稿されたものが 1 つも無い。
- [ ] 投稿した枠には媒体側が確認した ID があり、引き渡した枠にはその旨が記されている。
- [ ] 投稿する前に、権利・許諾・開示を確かめてある。
