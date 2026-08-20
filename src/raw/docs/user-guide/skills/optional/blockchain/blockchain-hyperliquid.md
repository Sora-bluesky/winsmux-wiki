---
title: "Hyperliquid — Hyperliquid の相場データ、口座の履歴、取引の振り返り"
description: "Hyperliquid の相場データ、口座の履歴、取引の振り返り"
upstream_path: user-guide/skills/optional/blockchain/blockchain-hyperliquid.md
upstream_blob: 177dfe36a10bf8bfe5b7b71517662dd22550fe09
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/blockchain/blockchain-hyperliquid
---

# Hyperliquid {#hyperliquid}

Hyperliquid の相場データ、口座の履歴、取引の振り返りです。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加 skill — `hermes skills install official/blockchain/hyperliquid` で入れます |
| パス | `optional-skills/blockchain/hyperliquid` |
| バージョン | `0.1.0` |
| 作者 | Hugo Sequier (Hugo-SEQUIER), Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Hyperliquid`, `Blockchain`, `Crypto`, `Trading`, `Perpetuals`, `Spot`, `DeFi` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Hyperliquid の skill {#hyperliquid-skill}

公開されている `/info` のエンドポイント経由で、Hyperliquid の相場と口座のデータを調べます。
読み取り専用です。API キーも、署名も、注文の発注もありません。

コマンドは 12 個です。`dexs`、`markets`、`spots`、`candles`、`funding`、`l2`、`state`、
`spot-balances`、`fills`、`orders`、`review`、`export`。標準ライブラリだけで動きます
（`urllib`、`json`、`argparse`）。

---

## こんなときに使います {#when-to-use}

- Hyperliquid の無期限先物や現物の相場データ、ローソク足、資金調達率、板情報を知りたいと言われたとき
- あるアドレスの先物の建玉、現物の残高、約定、注文を調べたいとき
- 直近の約定と相場の状況を合わせて、取引を振り返りたいとき
- 事業者が立てた先物の DEX や HIP-3 の市場を調べたいとき
- 検証の下準備として、ローソク足と資金調達率をそろえた JSON がほしいとき

---

## 事前に必要なもの {#prerequisites}

標準ライブラリだけです。外部のパッケージも API キーも要りません。

スクリプトは `${HERMES_HOME:-~/.hermes}/.env` を読み、任意で二つの既定値を受け取ります。

- `HYPERLIQUID_API_URL` — 既定は `https://api.hyperliquid.xyz` です。テストネットを使うなら
  `https://api.hyperliquid-testnet.xyz` を設定してください。
- `HYPERLIQUID_USER_ADDRESS` — `state`、`spot-balances`、
  `fills`、`orders`、`review` で使う既定のアドレスです。設定していない場合は、最初の
  位置引数としてアドレスを渡してください。

開発時の代わりの手段として、作業ディレクトリにある `.env` も読まれます。

補助スクリプト: `~/.hermes/skills/blockchain/hyperliquid/scripts/hyperliquid_client.py`

---

## 動かし方 {#how-to-run}

`terminal` ツール経由で呼び出します。

```bash
python3 ~/.hermes/skills/blockchain/hyperliquid/scripts/hyperliquid_client.py <command> [args]
```

どのコマンドでも `--json` を付ければ、機械で扱いやすい形で出力されます。

---

## 早見表 {#quick-reference}

```bash
hyperliquid_client.py dexs
hyperliquid_client.py markets [--dex DEX] [--limit N] [--sort volume|oi|funding_abs|change_abs|name]
hyperliquid_client.py spots [--limit N]
hyperliquid_client.py candles <coin> [--interval 1h] [--hours 24] [--limit N]
hyperliquid_client.py funding <coin> [--hours 72] [--limit N]
hyperliquid_client.py l2 <coin> [--levels N]
hyperliquid_client.py state [address] [--dex DEX]
hyperliquid_client.py spot-balances [address] [--limit N]
hyperliquid_client.py fills [address] [--hours N] [--limit N] [--aggregate-by-time]
hyperliquid_client.py orders [address] [--limit N]
hyperliquid_client.py review [address] [--coin COIN] [--hours N] [--fills N]
hyperliquid_client.py export <coin> [--interval 1h] [--hours N] [--output PATH]
```

`state`、`spot-balances`、`fills`、`orders`、`review` では、
`${HERMES_HOME:-~/.hermes}/.env` に `HYPERLIQUID_USER_ADDRESS` を設定していればアドレスは省けます。

---

## 手順 {#procedure}

### 1. DEX と市場を調べる {#1-discover-dexs-and-markets}

```bash
python3 ~/.hermes/skills/blockchain/hyperliquid/scripts/hyperliquid_client.py dexs

python3 ~/.hermes/skills/blockchain/hyperliquid/scripts/hyperliquid_client.py \
  markets --limit 15 --sort volume

python3 ~/.hermes/skills/blockchain/hyperliquid/scripts/hyperliquid_client.py \
  spots --limit 15
```

- `--dex` は先物のエンドポイントにだけ効きます。省くと最初の先物 DEX が使われます。
- 現物のペアは `PURR/USDC` の形で出ることも、`@107` のような別名で出ることもあります。
- HIP-3 の市場では、銘柄名の前に DEX が付きます。例: `mydex:BTC`。

### 2. 過去の相場データを取る {#2-pull-historical-market-data}

```bash
python3 ~/.hermes/skills/blockchain/hyperliquid/scripts/hyperliquid_client.py \
  candles BTC --interval 1h --hours 72 --limit 48

python3 ~/.hermes/skills/blockchain/hyperliquid/scripts/hyperliquid_client.py \
  funding BTC --hours 168 --limit 30
```

期間を指定するエンドポイントは分割して返ってきます。もっと長い期間が要るときは、
`startTime` を後ろにずらして繰り返すか、下記の `export` を使ってください。

### 3. いまの板を見る {#3-inspect-live-order-book}

```bash
python3 ~/.hermes/skills/blockchain/hyperliquid/scripts/hyperliquid_client.py \
  l2 BTC --levels 10
```

板の厚み、目先の流動性、大きな注文が相場に与えそうな影響について聞かれたときに使います。

### 4. 口座を確認する {#4-review-an-account}

```bash
python3 ~/.hermes/skills/blockchain/hyperliquid/scripts/hyperliquid_client.py \
  state 0xabc...

python3 ~/.hermes/skills/blockchain/hyperliquid/scripts/hyperliquid_client.py \
  spot-balances
```

`state` は先物の建玉を、`spot-balances` は現物の保有を返します。
「いまの建玉はどうなっている?」「何を持っている?」「いくら引き出せる?」
といった問いに使ってください。

### 5. 約定と注文を確認する {#5-review-fills-and-orders}

```bash
python3 ~/.hermes/skills/blockchain/hyperliquid/scripts/hyperliquid_client.py \
  fills 0xabc... --hours 72 --limit 25

python3 ~/.hermes/skills/blockchain/hyperliquid/scripts/hyperliquid_client.py \
  orders --limit 25
```

### 6. 取引の振り返りを作る {#6-generate-a-trade-review}

```bash
python3 ~/.hermes/skills/blockchain/hyperliquid/scripts/hyperliquid_client.py \
  review 0xabc... --hours 72 --fills 50

python3 ~/.hermes/skills/blockchain/hyperliquid/scripts/hyperliquid_client.py \
  review --coin BTC --hours 168
```

確定した損益、手数料、勝ち負けの回数、銘柄ごとの内訳、取引した先物ごとの相場の
方向と平均の資金調達率、それに気づきの手がかり（手数料の重さ、
銘柄の偏り、流れに逆らって出した損）を報告します。

もっと深く振り返るなら、まず `review` で問題のある銘柄や期間を見つけ →
その期間の `fills` と `orders` を取り、→ 取引した銘柄ごとに `candles` と
`funding` を取って、→ 判断の良し悪しと結果の良し悪しを分けて考えてください。

### 7. 再利用できるデータを書き出す {#7-export-a-reusable-dataset}

```bash
python3 ~/.hermes/skills/blockchain/hyperliquid/scripts/hyperliquid_client.py \
  export BTC --interval 1h --hours 168 --output ./btc-1h-7d.json

python3 ~/.hermes/skills/blockchain/hyperliquid/scripts/hyperliquid_client.py \
  export BTC --interval 15m --hours 72 --end-time-ms 1760000000000
```

書き出される JSON に入るのは、形式の版、取得元の情報、正確な期間、
形をそろえたローソク足の行、形をそろえた資金調達率の行、集計値です。
同じ期間を何度でも取り直せるよう、`--end-time-ms` を使ってください。

---

## つまずきやすいところ {#pitfalls}

- 公開されている情報のエンドポイントには回数制限があります。長い期間をまとめて
  問い合わせると、返る期間が切り詰められることがあります。`startTime` を後ろへ
  ずらしながら繰り返してください。
- `fills --hours ...` は `userFillsByTime` を使っており、これは直近の
  一定期間しか見られません。すべての履歴が取れるわけではありません。
- `historicalOrders` が返すのは直近の注文だけです。全件の書き出しではありません。
- `review` コマンドは手がかりを示すものです。約定だけから、意図や
  注文の出し方の良し悪し、実際の滑りを組み立て直すことはできません。
- `export` コマンドが書き出すのは形をそろえたデータであって、検証の
  しくみそのものではありません。滑りや約定のモデルは自分で用意してください。
- `@107` のような現物の別名は、画面でもっと分かりやすい名前が出ていても、
  そのまま識別子として使えます。
- `l2` はある時点の写しであって、時系列のデータではありません。

---

## 動作の確認 {#verification}

```bash
python3 ~/.hermes/skills/blockchain/hyperliquid/scripts/hyperliquid_client.py \
  markets --limit 5
```

24 時間の想定元本の大きい順に、Hyperliquid の先物市場の上位が表示されるはずです。
