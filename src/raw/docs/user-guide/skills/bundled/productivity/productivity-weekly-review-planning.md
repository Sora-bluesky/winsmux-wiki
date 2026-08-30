---
title: "Weekly Review Planning — 週ごとの仕切り直し: 約束、止まっている仕事、来週の計画"
description: "週ごとの仕切り直し: 約束、止まっている仕事、来週の計画"
upstream_path: user-guide/skills/bundled/productivity/productivity-weekly-review-planning.md
upstream_blob: 353389b4ae23b5a6b265ec41b35035a9ef3082e2
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/productivity/productivity-weekly-review-planning
---

# Weekly Review Planning {#weekly-review-planning}

週ごとの仕切り直しです。約束、止まっている仕事、来週の計画を扱います。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/productivity\weekly-review-planning` |
| バージョン | `0.1.0` |
| 作者 | Ben Barclay (benbarclay), Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Weekly-Review`, `Planning`, `Tasks`, `Calendar`, `Productivity` |
| 関連 skill | [`obsidian`](/hermes/docs/user-guide/skills/bundled/note-taking/note-taking-obsidian/), [`notion`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-notion/), [`airtable`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-airtable/), [`google-workspace`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-google-workspace/), [`email-inbox-triage`](/hermes/docs/user-guide/skills/bundled/email/email-email-inbox-triage/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Weekly Review and Planning {#weekly-review-and-planning}

利用者が選んだ道具立ての範囲で、週ごとの仕切り直しを区切って行います。これは決まった手順の繰り返しの仕事であって、一般的な仕事術の話ではありません。`weekly-review` の自動化ひな形が、これを cron のジョブとして予定に組み込みます。

## こんなときに使います {#when-to-use}

- 「週の振り返りをやって」
- 「何を約束していて、どれが遅れている?」
- 「予定表とタスクとメモから来週の計画を立てて」
- 「止まっている案件と、返事待ちのものを探して」
- 予定してある週の振り返りに対して cron の実行が始まったとき。

こういうときには使いません: 毎日のまとめ（`google-workspace` の daily-brief の資料を参照）、受信箱ひとつ分の仕分け（`email-inbox-triage`）。

## 手順 {#procedure}

### 1. 対象と期間を決める {#1-set-systems-and-window}

タイムゾーン、振り返る期間、計画を立てる先の範囲、正本となるタスクや案件の置き場所、予定表、受信箱、行ってよい書き込みを確かめます。既定は提案と下書きまでで、実際の変更は行いません。正本どうしが食い違ったときにどちらを優先するかが決まったら、この手順は完了です。

### 2. 予定表から事実を拾う {#2-review-calendar-evidence}

`google-workspace` か、該当する予定表のつなぎ役を読み込みます。終わった 1 週間の会議と約束を見てから、これからの 1〜2 週間の締め切り・移動・準備・空き具合を見ます。過去の予定から生まれた後追いの用件と、この先の重なりを拾います。振り返りと先の見通しの両方をたどれたら、この手順は完了です。

### 3. 受け皿を空にする {#3-clear-capture-inboxes}

タスクの受け皿、メモ（`obsidian`、`notion`）、目印を付けたメール（スレッド単位の仕分けは `email-inbox-triage` が受け持ちます）、そのほか決めておいた受け皿を見ます。それぞれを、次にやること・案件・返事待ち・日付を決めたもの・いつか・参考・書庫入り・削除の提案のどれかに変えます。範囲の了解が出るまでは実際に変えないでください。手つかずのまま残った件数を数えて伝えられたら、この手順は完了です。

### 4. 動いている案件を突き合わせる {#4-reconcile-active-projects}

案件ごとに、目指す結果・次にやること・担当・締め切り・詰まっているところ・最後に動いた日・元へのリンクを押さえます。次にやることがない案件、日付を過ぎた案件、記録が重複している案件、状態が食い違っている案件に目印を付けます。動いている案件がすべて手を付けられる状態か、はっきり止めた状態になったら、この手順は完了です。

### 5. 返事待ちと約束を見る {#5-review-waiting-and-commitments}

利用者がした約束と、相手からの返事を待っているものを探します。日付と連絡手段を添えて、後追いの案を出します。返事がないことを、終わったことだと受け取ってはいけません。返事待ちの一つひとつに担当と、次に見る日か後追いの日が付いたら、この手順は完了です。

### 6. 空き具合に合う計画を組む {#6-build-a-capacity-aware-plan}

予定表で埋まっている時間を見積もり、その週に出す結果を絞って選び、近いうちの次にやることを添えます。影響の大きさ・締め切り・前後関係・手間で順を付けます。空いている時間を全部埋めてはいけません。計画が実際の空き具合に収まり、見送った仕事の名前も挙げられたら、この手順は完了です。

### 7. 了解を得た更新を反映する {#7-apply-approved-updates}

タスクや案件の更新、予定表の枠取り、処理済みの書庫入り、後追いの下書きは、了解を得たものだけ行います。変えた記録は、提供元からすべて読み直します。読み直した結果が振り返りのまとめと合っていたら、この手順は完了です。

## 出力の形 {#output-shape}

1. うまくいったことと、果たした約束
2. 遅れているもの、危ういもの
3. 返事待ちと後追い
4. 止まっている案件、はっきりしない案件
5. 来週出す結果と、予定表の制約
6. 了解待ちの更新案
7. 見きれていないところ

## つまずきやすいところ {#pitfalls}

- 予定表の空き具合を見ずに、タスクだけで計画を立てること。
- 終わらなかったものを全部そのまま最優先として持ち越すこと。
- 次にやることがない案件を、動いていることにしてしまうこと。
- 私的な約束を、断りなく消したり動かしたりすること。
- 相手からの返事がないことを、終わったことだと受け取ること。

## 確認 {#verification}

- [ ] 終わった 1 週間と、計画を立てる先の範囲の両方をたどれている。たどれていないところははっきり書いてある。
- [ ] 止まっている・返事待ちの目印が、どれも特定の記録・予定・スレッドにたどれる。
- [ ] 了解なしに変えたタスク・予定・メモがない。了解を得て書いたものは読み直してある。
- [ ] 計画に、選んだものだけでなく、見送ったものも書いてある。
