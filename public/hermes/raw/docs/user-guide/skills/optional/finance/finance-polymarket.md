---
title: "Polymarket — Polymarket を調べる: 市場、価格、板、履歴"
description: "Polymarket を調べる: 市場、価格、板、履歴"
upstream_path: user-guide/skills/optional/finance/finance-polymarket.md
upstream_blob: 78f370685af25cb7a83c5a0ee5612e5a3db003ee
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/finance/finance-polymarket
---

# Polymarket {#polymarket}

Polymarket を調べます。市場、価格、板、履歴を取得できます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加 skill — `hermes skills install official/finance/polymarket` で入れます |
| パス | `optional-skills/finance/polymarket` |
| バージョン | `1.0.0` |
| 作者 | Hermes Agent + Teknium |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Polymarket — 予測市場のデータ {#polymarket-prediction-market-data}

Polymarket の公開 REST API を使って、予測市場のデータを取得します。
どのエンドポイントも読み取り専用で、認証はいっさい要りません。

curl の例を添えたエンドポイントの一覧は `references/api-endpoints.md` にあります。

## こんなときに使います {#when-to-use}

- 予測市場、賭けのオッズ、出来事の起こりやすさについて聞かれたとき
- 「X が起こる確率はどれくらい？」と聞かれたとき
- Polymarket そのものについて聞かれたとき
- 市場価格、板の情報、価格の履歴がほしいとき
- 予測市場の値動きを見張ってほしいと言われたとき

## 押さえておく用語 {#key-concepts}

- **イベント**は 1 つ以上の**マーケット**を持ちます（1 対多の関係です）
- **マーケット**は Yes / No の二択で、価格は 0.00 から 1.00 のあいだを動きます
- 価格はそのまま確率です。価格 0.65 は、市場が 65% の見込みだと考えていることを意味します
- `outcomePrices` フィールド: `["0.80", "0.20"]` のような JSON エンコード済みの配列
- `clobTokenIds` フィールド: 価格や板の取得に使う 2 つのトークン ID [Yes, No] の、JSON エンコード済みの配列
- `conditionId` フィールド: 価格履歴の取得に使う 16 進数の文字列
- 出来高は USDC（米ドル）建てです

## 3 つの公開 API {#three-public-apis}

1. **Gamma API**（`gamma-api.polymarket.com`） — 市場を探す、検索する、一覧を見る
2. **CLOB API**（`clob.polymarket.com`） — リアルタイムの価格、板、履歴
3. **Data API**（`data-api.polymarket.com`） — 約定、建玉

## 基本の流れ {#typical-workflow}

予測市場のオッズについて聞かれたら:

1. Gamma API の公開検索エンドポイントに、聞かれた内容を渡して**検索します**
2. 返ってきた内容を**読み解きます** — イベントと、その中のマーケットを取り出します
3. マーケットの設問、現在の価格をパーセントにしたもの、出来高を**示します**
4. さらに詳しく求められたら**掘り下げます** — 板には clobTokenIds、履歴には conditionId を使います

## 結果の見せ方 {#presenting-results}

読みやすいように、価格はパーセントに直します。
- outcomePrices `["0.652", "0.348"]` は「Yes: 65.2%、No: 34.8%」と表します
- マーケットの設問と確率は必ず示します
- 出来高が取れるときは添えます

例: `"Will X happen?" — 65.2% Yes ($1.2M volume)`

## 二重にエンコードされたフィールドの扱い {#parsing-double-encoded-fields}

Gamma API は `outcomePrices`、`outcomes`、`clobTokenIds` を、JSON レスポンスの中に
JSON 文字列として返します（二重エンコードです）。Python で扱うときは
`json.loads(market['outcomePrices'])` で読み解くと、本来の配列が得られます。

## レート制限 {#rate-limits}

余裕があるので、普通の使い方で引っかかることはまずありません。
- Gamma: 10 秒あたり 4,000 リクエスト（全般）
- CLOB: 10 秒あたり 9,000 リクエスト（全般）
- Data: 10 秒あたり 1,000 リクエスト（全般）

## できないこと {#limitations}

- この skill は読み取り専用で、取引の発注には対応していません
- 取引にはウォレットを使った暗号署名（EIP-712）による認証が必要です
- 新しいマーケットは、価格履歴が空のことがあります
- 取引には地域ごとの制限がかかりますが、読み取り専用のデータはどこからでも取得できます
