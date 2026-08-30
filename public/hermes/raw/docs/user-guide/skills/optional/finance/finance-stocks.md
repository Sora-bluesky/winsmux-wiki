---
title: "Stocks — Yahoo 経由の株価、履歴、検索、比較、暗号資産"
description: "Yahoo 経由の株価、履歴、検索、比較、暗号資産"
upstream_path: user-guide/skills/optional/finance/finance-stocks.md
upstream_blob: b855ca4ac35ee7148e07dd9c5d67b36c22202718
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/finance/finance-stocks
---

# Stocks {#stocks}

Yahoo 経由で株価、履歴、検索、比較、暗号資産の情報を取得します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加 skill — `hermes skills install official/finance/stocks` で入れます |
| パス | `optional-skills/finance\stocks` |
| バージョン | `0.1.0` |
| 作者 | Mibay (Mibayy), Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Stocks`, `Finance`, `Market`, `Crypto`, `Investing` |
| 関連 skill | [`dcf-model`](/hermes/docs/user-guide/skills/optional/finance/finance-dcf-model/), [`comps-analysis`](/hermes/docs/user-guide/skills/optional/finance/finance-comps-analysis/), [`lbo-model`](/hermes/docs/user-guide/skills/optional/finance/finance-lbo-model/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Stocks Skill {#stocks-skill}

Yahoo Finance 経由で市場データを読み取ります。コマンドは `quote`、`search`、
`history`、`compare`、`crypto` の 5 つです。Python の標準ライブラリだけで動くので、
API キーも pip での追加インストールも要りません。Yahoo のエンドポイントは非公式なので、
アクセス制限がかかったり、仕様が変わったりすることがあります。

## こんなときに使います {#when-to-use}

- 今の株価を聞かれたとき（AAPL、TSLA、MSFT など）
- 会社名からティッカーを調べたいとき
- OHLCV の履歴や、ある期間の値動きを知りたいとき
- 複数のティッカーを並べて比べたいとき
- 暗号資産の価格を聞かれたとき（BTC、ETH、SOL など）

## 事前に必要なもの {#prerequisites}

Python 3.8 以上の標準ライブラリだけで動きます。任意で `ALPHA_VANTAGE_KEY` を設定しておくと、
Yahoo 側の crumb 保護がかかったフィールドが null で返るときに、`market_cap`、`pe_ratio`、
52 週の高値・安値を補えます。無料のキーはこちらです: https://www.alphavantage.co/support/#api-key

## 実行のしかた {#how-to-run}

`terminal` ツールから呼び出します。インストール後は次のようにします。

```
SCRIPT=~/.hermes/skills/finance/stocks/scripts/stocks_client.py
python $SCRIPT quote AAPL
```

出力はすべて標準出力への JSON です。切り出したいときは `jq` に通してください。

## 早見表 {#quick-reference}

```
python $SCRIPT quote AAPL
python $SCRIPT quote AAPL MSFT GOOGL TSLA
python $SCRIPT search "Tesla"
python $SCRIPT history NVDA --range 6mo
python $SCRIPT compare AAPL MSFT GOOGL
python $SCRIPT crypto BTC ETH SOL
```

## コマンド {#commands}

### `quote SYMBOL [SYMBOL2 ...]` {#quote-symbol-symbol2}

現在値、変化額、変化率、出来高、52 週の高値・安値を返します。

### `search QUERY` {#search-query}

会社名からティッカーを探します。上位 5 件について、シンボル、名称、取引所、種別を返します。

### `history SYMBOL [--range RANGE]` {#history-symbol---range-range}

日次の OHLCV に加えて、統計値（最小、最大、平均、期間リターン %）を返します。指定できる期間は `1mo`、
`3mo`、`6mo`、`1y`、`5y` です。既定は `1mo` です。

### `compare SYMBOL1 SYMBOL2 [...]` {#compare-symbol1-symbol2}

価格、変化率、52 週の騰落を並べて比べます。

### `crypto SYMBOL [SYMBOL2 ...]` {#crypto-symbol-symbol2}

暗号資産の価格を返します。`BTC` のように渡せば、スクリプトが `-USD` を自動で付けます。

## つまずきやすいところ {#pitfalls}

- Yahoo Finance の API は非公式です。予告なくエンドポイントが変わったり、アクセス制限が
  かかったりします。急にリクエストが失敗し始めたら、たいていこれが原因です。
- `quote` で `market_cap` や `pe_ratio` が null になることがあります。Yahoo の crumb セッションが
  確立していないときに起きます。`ALPHA_VANTAGE_KEY` を設定すると補えます。
- まとめてリクエストするときは、あいだに少し間隔を空けてアクセス制限を避けてください。
- これは読み取り専用です。発注も、口座との連携もできません。

## 確認 {#verification}

```
python ~/.hermes/skills/finance/stocks/scripts/stocks_client.py quote AAPL
```

`symbol: "AAPL"` と、数値の `price` フィールドを持つ JSON オブジェクトが返ります。
