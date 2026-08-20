---
title: "Evm — 読み取り専用の EVM クライアント。8 つのチェーンの残高、トークン、ガス代を見る"
description: "読み取り専用の EVM クライアント。8 つのチェーンの残高、トークン、ガス代を見る"
upstream_path: user-guide/skills/optional/blockchain/blockchain-evm.md
upstream_blob: 01006870ee420b2496269d1c330f0b62be9fc054
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/blockchain/blockchain-evm
---

# Evm {#evm}

読み取り専用の EVM クライアントです。8 つのチェーンの残高、トークン、ガス代を見られます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加 skill — `hermes skills install official/blockchain/evm` で入れます |
| パス | `optional-skills/blockchain/evm` |
| バージョン | `1.0.0` |
| 作者 | Mibayy (@Mibayy), youssefea (@youssefea), ethernet8023 (@ethernet8023), Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `EVM`, `Ethereum`, `BNB`, `BSC`, `Base`, `Arbitrum`, `Polygon`, `Optimism`, `Avalanche`, `zkSync`, `Blockchain`, `Crypto`, `Web3`, `DeFi`, `NFT`, `ENS`, `Whale`, `Security` |
| 関連 skill | [`solana`](/hermes/docs/user-guide/skills/optional/blockchain/blockchain-solana/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# EVM ブロックチェーンの skill {#evm-blockchain-skill}

EVM 互換のブロックチェーン 8 つについて、米ドル換算付きでデータを調べます。
コマンドは 14 個。残高の一覧、トークンの情報、取引の内容、最近の動き、ガス代の確認、
ネットワークの状況、価格の照会、複数チェーンの一括確認、大口の送金の検出、ENS の解決、
承認の点検、コントラクトの調査、取引データの読み解きです。

対応するのは次の 8 チェーンです。Ethereum、BNB Chain（BSC）、Base、Arbitrum One、Polygon、
Optimism、Avalanche（C-Chain）、zkSync Era。

API キーは要りません。外部のライブラリも使わず、Python の標準ライブラリだけで動きます
（urllib、json、argparse、threading）。

> **単独の `base` skill はこちらに引き継がれました。** Base 特有のトークン（AERO、DEGEN、
> TOSHI、BRETT、WELL、cbETH、cbBTC、wstETH、rETH）と、以前 `optional-skills/blockchain/base/`
> にあった Base の RPC まわりの機能は、すべてこの skill に取り込まれています。
> どのコマンドでも `--chain base` を渡せば Base を見られます。

---

## こんなときに使います {#when-to-use}
- どれかの EVM チェーンで、残高や保有の一覧を知りたいと言われたとき
- 同じ残高を、すべてのチェーンについて一度に確認したいとき
- ハッシュから取引の中身を調べたい（あるいは何をした取引かを読み解きたい）とき
- ERC-20 トークンの情報、価格、発行量、時価総額を知りたいとき
- あるアドレスの最近の取引履歴を知りたいとき
- 今のガス代を知りたい、あるいはチェーンごとの手数料を比べたいとき
- 直近のブロックから大口の送金を探したいとき
- ENS の名前（vitalik.eth）を解決したい、あるいはアドレスから名前を逆引きしたいと言われたとき
- コントラクトに危ないトークンの承認が残っていないか確認したいとき
- スマートコントラクトを調べたいとき（プロキシか? ERC-20 か? ERC-721 か? バイトコードの大きさは?）
- 取引の前に、チェーンごとのガス代を比べたいとき

---

## 事前に必要なもの {#prerequisites}
Python 3.8 以上の標準ライブラリだけです。pip でのインストールは要りません。
価格: CoinGecko の無料 API（回数制限あり、毎分およそ 10〜30 回）。
ENS: ensideas.com の公開 API。
取引の読み解き: 4byte.directory の公開 API。

RPC の接続先を変えるには: `export EVM_RPC_URL=https://your-rpc.com`

補助スクリプトの場所: `~/.hermes/skills/blockchain/evm/scripts/evm_client.py`

---

## 早見表 {#quick-reference}

```
SCRIPT=~/.hermes/skills/blockchain/evm/scripts/evm_client.py

# Network & prices
python3 $SCRIPT stats                            # Ethereum stats
python3 $SCRIPT stats --chain arbitrum           # Arbitrum stats
python3 $SCRIPT compare                          # Gas + prices ALL 8 chains

# Wallet
python3 $SCRIPT wallet 0xd8dA...96045            # Portfolio (ETH + ERC-20)
python3 $SCRIPT wallet 0xd8dA...96045 --chain bsc
python3 $SCRIPT multichain 0xd8dA...96045        # Same wallet on ALL chains

# Tokens & prices
python3 $SCRIPT price ETH
python3 $SCRIPT price 0xdAC1...1ec7              # By contract address
python3 $SCRIPT token 0xdAC1...1ec7              # ERC-20 metadata + market cap

# Transactions
python3 $SCRIPT tx 0x5c50...f060                 # Transaction details
python3 $SCRIPT decode 0x5c50...f060             # Decode input data (4byte.directory)
python3 $SCRIPT activity 0xd8dA...96045          # Recent transactions

# Gas
python3 $SCRIPT gas                              # Gas prices + cost estimates
python3 $SCRIPT gas --chain optimism

# Security
python3 $SCRIPT allowance 0xd8dA...96045         # Dangerous ERC-20 approvals
python3 $SCRIPT contract 0xdAC1...1ec7           # Contract inspection (proxy? standards?)

# ENS
python3 $SCRIPT ens vitalik.eth                  # Name -> address + profile
python3 $SCRIPT ens 0xd8dA...96045               # Address -> ENS name

# Whale detection
python3 $SCRIPT whale                            # Large transfers (last 20 blocks, >$10k)
python3 $SCRIPT whale --blocks 50 --min-usd 100000 --chain arbitrum
```

---

## 手順 {#procedure}

### 0. 準備の確認 {#0-setup-check}
```bash
python3 --version   # 3.8+ required
python3 ~/.hermes/skills/blockchain/evm/scripts/evm_client.py stats
```

### 1. 残高の一覧 {#1-wallet-portfolio}
そのチェーンの通貨の残高と、分かっている ERC-20 トークンを、米ドル換算の大きい順に並べます。
```bash
python3 $SCRIPT wallet 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
python3 $SCRIPT wallet 0xd8dA... --chain bsc --no-prices   # faster
```

### 2. 複数チェーンの一括確認 {#2-multi-chain-scan}
同じアドレスについて、8 つのチェーンをスレッドで同時に調べます。
```bash
python3 $SCRIPT multichain 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```
出力: チェーンごとの通貨の残高とトークンの保有、それに全体の米ドル合計です。

### 3. 比較（ガス代と価格） {#3-compare-gas-prices}
8 つのチェーンを同時に調べます。いちばん安いチェーンと高いチェーンが分かります。
```bash
python3 $SCRIPT compare
```

### 4. 取引の中身と読み解き {#4-transaction-details-decode}
```bash
python3 $SCRIPT tx 0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060
python3 $SCRIPT decode 0x5c504ed...   # Shows human-readable function signature
```
読み解きには 4byte.directory を使い、0xa9059cbb を transfer(address,uint256) のように変換します。

### 5. ENS の解決 {#5-ens-resolution}
```bash
python3 $SCRIPT ens vitalik.eth          # -> 0xd8dA... + avatar + social links
python3 $SCRIPT ens 0xd8dA...96045       # -> vitalik.eth
```

### 6. 承認の点検（安全のため） {#6-allowance-checker-security}
分かっている DEX やブリッジのコントラクトに与えた ERC-20 の承認を調べます。
```bash
python3 $SCRIPT allowance 0xYourWallet
```
無制限の承認は、危険度が高いものとして印を付けます。

### 7. コントラクトの調査 {#7-contract-inspector}
```bash
python3 $SCRIPT contract 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48   # USDC (proxy)
python3 $SCRIPT contract 0xdAC17F958D2ee523a2206206994597C13D831ec7   # USDT (ERC-20)
```
判別できるもの: プロキシ（EIP-1967 / EIP-1167）、ERC-20、ERC-721、ERC-165。バイトコードの大きさと、プロキシの場合は実装側のアドレスも表示します。

### 8. 大口の送金の検出 {#8-whale-detection}
```bash
python3 $SCRIPT whale                                    # ETH, last 20 blocks, >$10k
python3 $SCRIPT whale --blocks 50 --min-usd 50000 --chain bsc
```

### 9. ガス代の確認 {#9-gas-tracker}
```bash
python3 $SCRIPT gas
python3 $SCRIPT gas --chain polygon
```
gwei 単位の価格と、次の操作にかかる米ドルの費用を表示します。送金、ERC-20 の送付、承認、交換、NFT の発行、NFT の送付。

---

## 対応しているチェーン {#supported-chains}
| キー      | 名前           | 通貨   | チェーン ID |
|-----------|----------------|--------|----------|
| ethereum  | Ethereum       | ETH    | 1        |
| bsc       | BNB Chain      | BNB    | 56       |
| base      | Base           | ETH    | 8453     |
| arbitrum  | Arbitrum One   | ETH    | 42161    |
| polygon   | Polygon        | POL    | 137      |
| optimism  | Optimism       | ETH    | 10       |
| avalanche | Avalanche C    | AVAX   | 43114    |
| zksync    | zkSync Era     | ETH    | 324      |

---

## つまずきやすいところ {#pitfalls}
- CoinGecko の無料枠は毎分およそ 10〜30 回です。残高を速く調べたいときは `--no-prices` を使ってください。
- 公開の RPC は速度を絞ることがあります。本番では EVM_RPC_URL に自前の接続先を設定してください。
- `wallet` と `allowance` が見るのは、分かっているトークンの一覧だけです（チェーンごとにおよそ 30 種類）。保有するトークンをもれなく調べるにはブロックエクスプローラーを使ってください。
- `activity` が見るのは直近のブロックだけです（最大 200）。すべての履歴が要るときは Etherscan の API を使ってください。
- `multichain` は 8 本のスレッドを同時に走らせるので、公開の RPC では回数制限にかかることがあります。
- ENS の解決は、代わりの手段が無いまま一つの公開エンドポイント（ensideas.com / ens.vitalik.ca）に頼っています。そこが落ちていると `ens` は失敗します。あとで実行しなおすか、ブロックエクスプローラーを使ってください。
- 取引の読み解きも、代わりの手段が無いまま一つの公開エンドポイント（4byte.directory）に頼っています。そこのデータベースに無いセレクタは `unknown` と表示されます。
- **L2 のガス代の見積もりは、L2 での実行分だけです。** Base、Arbitrum、Optimism、zkSync のようなロールアップでは、実際の費用に L1 へデータを書き込む分の手数料も加わります。これは calldata の大きさと、そのときの L1 のガス代で決まります。`gas` コマンドはこの L1 の分を見積もりません。Base については、ネットワークの L1 手数料オラクル（コントラクト `0x420000000000000000000000000000000000000F`）を参照してください。
- アドレスや取引ハッシュの入力は、0x で始まるか、長さは正しいか、16 進かを確かめますが、EIP-55 のチェックサム（大文字小文字の使い分け）までは**見ていません**（RPC のエンドポイントは大文字小文字を問わず受け付けます）。

---

## 動作の確認 {#verification}
```bash
# Should print current block, gas price, ETH price
python3 ~/.hermes/skills/blockchain/evm/scripts/evm_client.py stats

# Should resolve vitalik.eth to 0xd8dA...
python3 ~/.hermes/skills/blockchain/evm/scripts/evm_client.py ens vitalik.eth
```
