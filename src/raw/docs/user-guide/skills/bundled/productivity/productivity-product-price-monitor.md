---
title: "Product Price Monitor — 商品・航空券・出品の価格を見張り、目標に届いたら知らせる"
description: "商品・航空券・出品の価格を見張り、目標に届いたら知らせる"
upstream_path: user-guide/skills/bundled/productivity/productivity-product-price-monitor.md
upstream_blob: d757afe4eb2a60613e91cf25afb79d175350c691
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/productivity/productivity-product-price-monitor
---

# Product Price Monitor {#product-price-monitor}

商品・航空券・出品の価格を見張り、目標に届いたら知らせます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/productivity\product-price-monitor` |
| バージョン | `0.1.0` |
| 作者 | Ben Barclay (benbarclay), Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Prices`, `Availability`, `Shopping`, `Travel`, `Alerts` |
| 関連 skill | [`maps`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-maps/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Product Price Monitor {#product-price-monitor}

実際に買える品物ひとつを見張り、税込み・手数料込みにそろえた価格や、在庫の条件が満たされたときに知らせます。仕様違い、税、手数料、通貨、在庫、キャンセル条件、同じ知らせの重複は、あいまいにせずはっきり扱います。準備はその場で一度だけ行い、繰り返しの確認は `cronjob` の実行として動きます（`price-watch` の自動化ひな形がこの土台を用意します）。

## こんなときに使います {#when-to-use}

- 「このノートパソコンが 1,000 ドルを切ったら教えて」
- 「この便を見張って、運賃が 500 ドルを下回ったら知らせて」
- 「このホテルで返金可能な部屋が出たら教えて」
- 「チケットや出品の在庫を追いかけて」
- 既にある価格の見張りに対して cron の実行が始まったとき（手順 4〜6）。

こういうときには使いません: 「今いくら?」と一度だけ調べる用途（`web_search`/`web_extract` を直接使ってください）。

## 手順 — 準備（その場で一度だけ） {#procedure-setup-foreground-once}

### 1. 品物を正確に決める {#1-define-the-exact-item}

取得元の URL や提供元、あれば商品や出品の ID、仕様違い、数量、場所、日付、搭乗者や宿泊人数、会員資格やログインの前提、状態、販売者、代わりに認めてよいものを記録します。仕様違いの 2 つを取り違えようがなくなったら、この手順は完了です。

### 2. 知らせる条件を決める {#2-define-the-alert-condition}

通貨、税込みか税抜きか、上限の価格、在庫の扱い、送料、返金の可否、座席や部屋やチケットの等級、次に知らせるまでの間隔、通知先を決めます。作った例に対して知らせるかどうかが一通りに決まるなら、この手順は完了です。

### 3. 実際の値を 1 回取って基準にし、そのうえで予定を組む {#3-establish-a-live-baseline-then-schedule}

`web_extract` か `browser_navigate` で範囲を絞って実際の値を取り、取得した時刻・掲載価格・手数料や税・在庫・条件を記録します。その場での取得が一度成功するまでは、予定を組まないでください。見張りの取り決め（品物、条件、基準にした観測）を `~/.hermes/price-watches/<watch-slug>.json` の状態ファイルに書いてから、ジョブを作ります:

```
cronjob(action="create",
        schedule="every 6h",
        prompt="Load the product-price-monitor skill and run the tick for the watch contract at ~/.hermes/price-watches/<watch-slug>.json.",
        deliver=<user's destination>)
```

間隔は、アクセス制限とサイトの利用条件を守れるものにしてください。基準にした値が品物の取り決めと一致し、ジョブができたら、この手順は完了です。

## 手順 — 定期の確認（実行のたび） {#procedure-tick-each-scheduled-run}

### 4. 取得してそろえる {#4-fetch-and-normalize}

取得元をもう一度読みます。通貨の換算は、時刻の付いたレートがあるときだけ行い、元の通貨も残します。本体価格、必ずかかる手数料、送料や税、合計、在庫を分けて記録します。ページの中で頻繁に変わる付随情報は除きます。取得に失敗したときは状態が分からないということです。報告するか飛ばすかは選べますが、直前の正常な観測をエラーページで上書きしてはいけません。観測が基準と比べられる形になるか、失敗としてはっきり記録されたら、この手順は完了です。

### 5. 比べて、重複を抑える {#5-compare-and-suppress-duplicates}

依頼に応じて、条件に入ったとき、在庫の条件を満たしたとき、はっきり安くなったとき、あるいは在庫が戻ったときに知らせます。直前の正常な観測と、最後に知らせた内容の目印を状態ファイルに保存します。同じ売り出しをもう一度見かけても、二度目の知らせを送ってはいけません。次に知らせるまでの間隔も守ります。保存した状態に照らして知らせるかどうかが一通りに決まるなら、この手順は完了です。

### 6. 知らせるか、黙っているか {#6-deliver-or-stay-silent}

条件を満たしたときの知らせには、次を含めます: 品物と仕様違い、観測した税込み・手数料込みの価格と元の通貨、在庫と条件、目標の水準、取得した時刻、取得元へのリンク、そして大事な不確かさ。在庫を押さえたかのように言ってはいけません。条件に当てはまるものがなければ黙っています。定期的な「異常なし」を頼まれていない限り、「まだ見ています」といった知らせは送りません。状態ファイルが今回の実行を反映したら、この手順は完了です。

## つまずきやすいところ {#pitfalls}

- 本体だけの運賃を、税込み・手数料込みの目標と比べてしまうこと。
- サイズ・販売者・座席の等級・日付・部屋の条件を取り違えて知らせてしまうこと。
- 直前の正常な値をエラーページで上書きしてしまうこと。
- アクセスが多すぎて遮断されたり、サイトの利用条件に反したりすること。
- その場での取得が一度も成功していないうちに予定を組むこと。

## 確認 {#verification}

- [ ] 見張りの取り決めが品物を絞り込んでおり、仕様違いの 2 つを取り違えようがない。
- [ ] ジョブを作る前に、その場での取得が一度成功している。
- [ ] 知らせるかどうかの判断が状態ファイルから同じようにたどれ、重複が抑えられている。
- [ ] 取得に失敗しても、直前の正常な状態を置き換えていない。
- [ ] 知らせに、税込み・手数料込みの価格、元の通貨、時刻、取得元へのリンクが入っている。
