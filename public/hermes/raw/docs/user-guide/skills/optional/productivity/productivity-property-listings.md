---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "Property Listings — 物件や賃貸の情報をデスクトップのカードとして見せる"
description: "物件や賃貸の情報をデスクトップのカードとして見せる"
upstream_path: user-guide/skills/optional/productivity/productivity-property-listings.md
upstream_blob: 664697b200bbf6c9739867f3f5f895feeffbb669
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/productivity/productivity-property-listings
---

# Property Listings {#property-listings}

物件や賃貸の情報を、デスクトップのカードとして見せます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加で導入します。`hermes skills install official/productivity/property-listings` で入ります |
| パス | `optional-skills/productivity/property-listings` |
| バージョン | `0.1.0` |
| 作者 | Teknium (teknium1), Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `property`, `rental`, `real-estate`, `listings`, `desktop`, `cards` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Property Listings Skill {#property-listings-skill}

調べた物件を、Hermes デスクトップの会話の中で見比べられるカードとして見せます。
これは見せ方の作法であって、物件検索のサービスでも、投資価値を査定するものでもありません。

## こんなときに使います {#when-to-use}

- 物件や賃貸の検索結果を見せるとき、候補をしぼって比べるとき、順位を付け直すとき。
- 一度見せた物件について話が続くとき。カードのまま続けると、候補どうしを比べられる状態が保てます。
- デスクトップアプリの外では、代わりにふつうの Markdown と出典リンクを使ってください。ほかのクライアントが物件用のコードブロックを表示できるとは限りません。

## 事前に必要なもの {#prerequisites}

- カードとして表示するには Hermes デスクトップでの会話が必要です。バックエンドは手元でも遠隔でもかまいません。
- 物件の内容は、利用者から教わったものか、`web_search`、`web_extract`、あるいはその会話で使えるブラウザのツールで裏を取ったものにしてください。
- カードの書式そのものに、追加の API キーや依存するものはありません。

## 実行のしかた {#how-to-run}

この追加 skill は Skills のカタログから入れるか、`terminal` で入れてください。

```text
hermes skills install official/productivity/property-listings
```

物件を見せるときは `skill_view(name="property-listings")` で読み込みます。
入れただけでは、いま動いている会話の skill 一覧には反映されません。自動で見つけてほしければ
新しい会話を始めるか、入れた skill をその場で明示的に読み込んでください。

## 早見表 {#quick-reference}

言語に `listing` を指定したコードブロックを出し、その中身を正しい JSON にします。
オブジェクトひとつ、オブジェクトの配列、あるいは比較なら `{ "listings": [...] }` の形が使えます。

| 項目 | 形と意味 |
|---|---|
| `address` | 必須。空でない住所、または物件の見出し。 |
| `price` | 通貨記号と、賃貸なら期間まで含めて整形した文字列。 |
| `beds`, `baths` | 正の数。分からない場合は書きません。 |
| `size` | 単位まで含めて整形した面積。 |
| `note` | この物件を見る価値がどこにあるか。 |
| `facts` | 裏の取れた仕様や設備を、短い文で並べた配列。 |
| `catches` | 内見の前に確かめたい懸念や質問を並べた配列。 |
| `images` | 直接開ける HTTPS の写真 URL を掲載順に。先頭が主役の写真になります。 |
| `links` | `{ "label": "Source", "url": "https://..." }` の形で、検索結果ではなく物件詳細ページへのリンクを並べた配列。 |

## 手順 {#procedure}

1. 住所、価格、仕様、写真、正式な詳細ページの URL を集めます。裏の取れた事実と
   分からないことを区別してください。価格、設備、写真の URL を作り出さないでください。
2. 同じ物件が複数のポータルに出ている場合はひとつのカードにまとめ、役に立つ出典リンクは
   残します。情報の日付や空室状況の但し書きは、カードの前後の文章に書いてください。
3. 見せる物件はすべて `listing` のコードブロックで出します。あとから話が続くときも、
   順位を付け直すときも同じです。facts は短く保ち、片付いていない懸念は `catches` に入れます。
4. 送る前に JSON を確かめてください。次の例は架空の内容で、すべての項目の書き方を示すためのものです。
   値と例の URL は、裏の取れた実際の物件の内容に置き換えてください。

```listing
{
  "address": "12 Example Lane",
  "price": "$2,400/mo",
  "beds": 3,
  "baths": 2.5,
  "size": "1,600 sqft",
  "note": "Fits the requested space and budget.",
  "facts": ["12-month lease", "Covered parking"],
  "catches": ["Verify pet policy and total move-in fees"],
  "images": ["https://example.com/property/front.jpg", "https://example.com/property/kitchen.jpg"],
  "links": [{"label": "Listing details", "url": "https://example.com/property/12"}]
}
```

## つまずきやすいところ {#pitfalls}

- カードは集めた内容から自分で書くものです。物件の URL から取ってくるものでも、ポータルのページを埋め込むものでもありません。
- 中身の薄いカードでも、住所さえあれば成り立ちます。分からない項目は当て推量で埋めず、書かないでください。
- 画像は遠隔にある直接の URL を使ってください。手元のパス、データ URL、検索結果のページは使えません。
  期限切れや遮断された画像はギャラリーから消えますが、文章とリンクは残って役に立ちます。
- ひとつのコードブロックに入れるのは物件 24 件まで、1 物件あたり写真 40 枚まで、
  facts、catches、links はそれぞれ 12 件までにしてください。文字の項目は表示側で 400 文字に切られます。
- JSON が壊れていたり、どの物件か分からないカードは、ただのコードブロックとして表示されます。
  カードとして成り立っていることは、その物件の情報が最新で正しいことの証明にはなりません。

## 確認 {#verification}

- 見せたすべての物件に住所と裏の取れた出典リンクがあり、分からないことは分からないと書いてある。
- デスクトップで、住所、価格、仕様、facts、catches、links がカードとして表示される。
- 写真がギャラリーになり、選ぶと拡大表示が開く。3 枚以上あるときは主役の写真と脇の写真を
  組み合わせた並びになり、残りの写真もそこからたどれる。
- カードが表示されないときは、コードブロックの言語と JSON を確かめたうえで、
  同じ事実とリンクを持つ読みやすい Markdown を代わりに残してください。
