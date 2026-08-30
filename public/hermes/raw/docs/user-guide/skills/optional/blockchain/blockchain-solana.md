---
title: "Solana — Solana のウォレット・トークン・取引・NFT を米ドル建てで調べる"
description: "Solana のウォレット・トークン・取引・NFT を米ドル建てで調べる"
upstream_path: user-guide/skills/optional/blockchain/blockchain-solana.md
upstream_blob: a9b4c55b7ed12a6ddf4664119bae092bfbd0ab5f
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/blockchain/blockchain-solana
---

# Solana {#solana}

Solana のウォレット・トークン・取引・NFT を米ドル建てで調べます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加で入れるもの — `hermes skills install official/blockchain/solana` で導入します |
| パス | `optional-skills/blockchain\solana` |
| バージョン | `0.2.0` |
| 作者 | Deniz Alagoz (gizdusum), enhanced by Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Solana`, `Blockchain`, `Crypto`, `Web3`, `RPC`, `DeFi`, `NFT` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Solana Blockchain Skill {#solana-blockchain-skill}

Solana のオンチェーンデータを取得し、CoinGecko の米ドル価格を添えて表示します。
コマンドは 8 つあります。ウォレットの資産一覧、トークンの情報、取引の中身、直近の履歴、NFT、
大口送金の検出、ネットワークの状況、そして価格の確認です。

API キーは要りません。Python の標準ライブラリ（urllib、json、argparse）だけで動きます。

---

## こんなときに使います {#when-to-use}

- Solana のウォレット残高、保有トークン、資産の合計額を聞かれたとき
- 署名を指定して特定の取引の中身を見たいとき
- SPL トークンの基本情報、価格、発行量、上位保有者を知りたいとき
- あるアドレスの直近の取引履歴を見たいとき
- あるウォレットが持っている NFT を知りたいとき
- 大口の SOL 送金（クジラ）を見つけたいとき
- Solana ネットワークの状態、TPS、エポック、SOL の価格を知りたいとき
- 「BONK / JUP / SOL はいくら？」と聞かれたとき

---

## 事前に必要なもの {#prerequisites}

補助スクリプトは Python の標準ライブラリ（urllib、json、argparse）だけを使います。
外部パッケージを入れる必要はありません。

価格は CoinGecko の無料 API から取ります（キー不要、1 分あたり 10〜30 回程度の制限つき）。
早く結果がほしいときは `--no-prices` を付けてください。

---

## 早見表 {#quick-reference}

RPC のアドレス（既定）: https://api.mainnet-beta.solana.com
差し替えるとき: export SOLANA_RPC_URL=https://your-private-rpc.com

補助スクリプトの場所: ~/.hermes/skills/blockchain/solana/scripts/solana_client.py

```
python solana_client.py wallet   <address> [--limit N] [--all] [--no-prices]
python solana_client.py tx       <signature>
python solana_client.py token    <mint_address>
python solana_client.py activity <address> [--limit N]
python solana_client.py nft      <address>
python solana_client.py whales   [--min-sol N]
python solana_client.py stats
python solana_client.py price    <mint_or_symbol>
```

---

## 手順 {#procedure}

### 0. 動く状態か確かめる {#0-setup-check}

```bash
python --version

# Optional: set a private RPC for better rate limits
export SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"

# Confirm connectivity
python ~/.hermes/skills/blockchain/solana/scripts/solana_client.py stats
```

### 1. ウォレットの資産一覧 {#1-wallet-portfolio}

SOL の残高、SPL トークンの保有量と米ドル換算、NFT の数、そして資産の合計額をまとめて出します。
トークンは金額順に並び、ごく少額のものは除かれ、名前の分かるトークン（BONK、JUP、USDC など）は
名前で表示されます。

```bash
python ~/.hermes/skills/blockchain/solana/scripts/solana_client.py \
  wallet 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM
```

指定できるもの:
- `--limit N` — 上位 N 件のトークンを表示します（既定は 20）
- `--all` — 少額のものも含め、件数を絞らずすべて表示します
- `--no-prices` — CoinGecko の価格取得を省きます（RPC だけを使うので速くなります）

出力には、SOL の残高と米ドル換算、金額順に並んだトークン一覧と価格、少額トークンの件数、
NFT のまとめ、資産の合計額（米ドル）が含まれます。

### 2. 取引の中身 {#2-transaction-details}

base58 の署名を指定して、取引の全体を見ます。残高の増減は SOL と米ドルの両方で表示されます。

```bash
python ~/.hermes/skills/blockchain/solana/scripts/solana_client.py \
  tx 5j7s8K...your_signature_here
```

出力は、スロット、時刻、手数料、成否、残高の増減（SOL と米ドル）、呼び出されたプログラムです。

### 3. トークンの情報 {#3-token-info}

SPL トークンの基本情報、現在の価格、時価総額、発行量、小数点以下の桁数、
発行・凍結の権限、そして上位 5 名の保有者を調べます。

```bash
python ~/.hermes/skills/blockchain/solana/scripts/solana_client.py \
  token DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263
```

出力は、名称、シンボル、小数点以下の桁数、発行量、価格、時価総額、
上位 5 名の保有者と保有比率です。

### 4. 直近の動き {#4-recent-activity}

あるアドレスの直近の取引を並べます（既定は 10 件、最大 25 件）。

```bash
python ~/.hermes/skills/blockchain/solana/scripts/solana_client.py \
  activity 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM --limit 25
```

### 5. NFT の一覧 {#5-nft-portfolio}

ウォレットが持っている NFT を並べます（数量 1・小数点以下 0 桁の SPL トークンを NFT とみなす方法です）。

```bash
python ~/.hermes/skills/blockchain/solana/scripts/solana_client.py \
  nft 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM
```

注意: 圧縮 NFT（cNFT）はこの見分け方では拾えません。

### 6. 大口送金の検出 {#6-whale-detector}

いちばん新しいブロックを調べて、大口の SOL 送金を米ドル換算つきで拾います。

```bash
python ~/.hermes/skills/blockchain/solana/scripts/solana_client.py \
  whales --min-sol 500
```

注意: 調べるのは最新のブロックだけです。その瞬間の断面であって、過去にさかのぼるものではありません。

### 7. ネットワークの状況 {#7-network-stats}

Solana ネットワークの今の状態です。スロット、エポック、TPS、供給量、バリデータの
バージョン、SOL の価格、時価総額が分かります。

```bash
python ~/.hermes/skills/blockchain/solana/scripts/solana_client.py stats
```

### 8. 価格の確認 {#8-price-lookup}

ミントアドレスか、よく知られたシンボルを指定して、手早く価格を確かめます。

```bash
python ~/.hermes/skills/blockchain/solana/scripts/solana_client.py price BONK
python ~/.hermes/skills/blockchain/solana/scripts/solana_client.py price JUP
python ~/.hermes/skills/blockchain/solana/scripts/solana_client.py price SOL
python ~/.hermes/skills/blockchain/solana/scripts/solana_client.py price DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263
```

名前で指定できるシンボル: SOL, USDC, USDT, BONK, JUP, WETH, JTO, mSOL, stSOL,
PYTH, HNT, RNDR, WEN, W, TNSR, DRIFT, bSOL, JLP, WIF, MEW, BOME, PENGU。

---

## つまずきやすいところ {#pitfalls}

- **CoinGecko の回数制限** — 無料の枠は 1 分あたり 10〜30 回ほどです。
  価格の取得はトークン 1 つにつき 1 回使うので、保有トークンが多いウォレットでは
  すべての価格がそろわないことがあります。速さがほしいときは `--no-prices` を使ってください。
- **公開 RPC の回数制限** — Solana メインネットの公開 RPC にも制限があります。
  本格的に使うなら、SOLANA_RPC_URL に専用のアドレス（Helius、QuickNode、Triton）を
  設定してください。
- **NFT の見分けは目安** — 数量 1・小数点以下 0 桁という条件で判定しています。圧縮 NFT
  （cNFT）や Token-2022 の NFT は出てきません。
- **大口送金の検出は最新ブロックだけ** — 過去はさかのぼりません。いつ実行したかで
  結果が変わります。
- **取引履歴** — 公開 RPC が保つのは 2 日ほどです。それより古い取引は
  取れないことがあります。
- **トークンの名称** — 名前が付くのはよく知られた 25 種類ほどです。それ以外は
  ミントアドレスを短くしたものが出ます。詳しく知りたいときは `token` コマンドを使ってください。
- **429 のときは再試行** — RPC も CoinGecko も、回数制限のエラーが返ったときは
  間隔を空けながら最大 2 回まで試し直します。

---

## 確かめかた {#verification}

```bash
# Should print current Solana slot, TPS, and SOL price
python ~/.hermes/skills/blockchain/solana/scripts/solana_client.py stats
```
