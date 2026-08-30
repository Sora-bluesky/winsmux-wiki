---
title: "Mpp Agent — Machine Payments Protocol (MPP) で HTTP 402 の API に支払う"
description: "Machine Payments Protocol (MPP) で HTTP 402 の API に支払う"
upstream_path: user-guide/skills/optional/payments/payments-mpp-agent.md
upstream_blob: c20c9d84e556a2ee1bb648f7c21a7d87337bd8c2
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/payments/payments-mpp-agent
---

# Mpp Agent {#mpp-agent}

Machine Payments Protocol (MPP) で HTTP 402 の API に支払います。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/payments/mpp-agent` で導入します |
| パス | `optional-skills/payments\mpp-agent` |
| バージョン | `0.1.0` |
| 作者 | Teknium (teknium1), Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos |
| タグ | `Payments`, `MPP`, `HTTP-402`, `Tempo`, `Stripe` |
| 関連 skill | [`stripe-link-cli`](/hermes/docs/user-guide/skills/optional/payments/payments-stripe-link-cli/), [`stripe-projects`](/hermes/docs/user-guide/skills/optional/payments/payments-stripe-projects/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# MPP Agent Skill {#mpp-agent-skill}

Machine Payments Protocol（MPP、https://mpp.dev）のクライアントをまとめた skill です。`HTTP 402 Payment Required` を返すサーバーに対して、Hermes がリクエストごとに料金を支払って API を使えるようになります。

クライアントは 3 種類あり、いずれも npm で配布されています。用件を満たせるもののうち、いちばん軽いものを選んでください。Windows 向けの決済まわりの整備が進むまでは `[linux, macos]` に限定しています。

## 使うとき {#when-to-use}

- 販売側の API が `www-authenticate` ヘッダー付きで `HTTP 402` を返し、応答を記録するだけでなく実際に支払いたいとき。
- 「リクエストごとに支払いたい」「エージェント用のウォレットを用意したい」「Tempo / Privy / AgentCash を使いたい」と言われたとき、あるいは MPP で値付けされたサービスを探したいとき。
- Stripe Link での支払いから Shared Payment Token（SPT）が発行され、それを 402 のチャレンジに添える必要があるとき。この流れでは `link-cli mpp pay` を優先してください（`stripe-link-cli` skill を参照）。

## クライアントの選び方 {#choosing-a-client}

| ツール | 使いどころ | 準備 |
|---|---|---|
| `link-cli` | すでに Stripe Link を設定済み、または 402 のチャレンジが `method="stripe"` を示している | `stripe-link-cli` skill を参照 |
| Tempo Wallet | 支出の制限やサービスの検索がある MPP のサービス | `tempo wallet login` |
| Privy Agent CLI | 複数チェーン対応のウォレット、ブラウザからの入金 | `privy-agent-wallets login` |
| AgentCash | 値付け済みの API 300 種類以上を USDC.e の残高ひとつで使う | `npx agentcash onboard` |
| `mppx` | 開発と不具合の調査向け。依存が最小 | `npm install -g mppx` のあと `mppx account create` |

既定の選び方: すでに Stripe Link を設定してある、または 402 のチャレンジが `method="stripe"` を指定しているなら `link-cli mpp pay`（`stripe-link-cli` skill）を使います。それ以外なら、単発の有料呼び出しや調査には `mppx`、支出の制限を継続して効かせたい場合は Tempo Wallet を選んでください。

## 事前に必要なもの {#prerequisites}

- `PATH` の通った Node.js 20 以降
- 入金済みのウォレット（Tempo / Privy / AgentCash）か、`mppx` のアカウント
- Tempo / Privy / AgentCash の場合は、それぞれの導入用 skill に従ってください:
  - `https://tempo.xyz/SKILL.md`
  - `https://agents.privy.io/skill.md`
  - `https://agentcash.dev/skill.md`

どれかを選んだら、`web_extract` でその SKILL.md を取得してください。

## 手順（mppx。いちばん手早い道筋） {#procedure-mppx-fastest-path}

コマンドはすべて `terminal` ツールから実行します。

### 1. インストールしてアカウントを作る {#1-install-create-an-account}

```
npm install -g mppx
mppx account create
```

発行されたアカウントの認証情報は、CLI が指示する場所に保管してください（CLI が自身の設定として書き出します。エージェントの記録に貼り付けないでください）。

### 2. 販売側の 402 チャレンジを確かめる {#2-inspect-the-merchants-402-challenge}

URL を渡されたら、まず叩いてみて本当に MPP に対応しているかを確認します:

```
curl -i <url>
```

本物の MPP の 402 は次のような形です:

```
HTTP/1.1 402 Payment Required
www-authenticate: tempo amount=0.1 currency=...
```

### 3. リクエストに支払う {#3-pay-the-request}

```
mppx <url>
```

GET 以外のメソッドや、リクエストの本文を送る場合:

```
mppx <url> --method POST --data '<json>'
```

`mppx` は 402 のチャレンジと認証情報のやり取りを自動でこなし、成功すると販売側の本来の応答をそのまま表示します。

### 4. 領収の記録を確認する {#4-verify-the-receipt}

`mppx` は領収のヘッダーを自動で添えます。中身を見るには:

```
mppx <url> -v
```

## 手順（Tempo Wallet） {#procedure-tempo-wallet}

https://tempo.xyz/SKILL.md にある Tempo Wallet の skill が正式な案内です。`web_extract` で取得して、その内容に従ってください。要点は次のとおりです:

```
tempo wallet login
tempo wallet pay <url>
```

支出の制限とサービスの検索は、https://wallet.tempo.xyz のウォレット画面にあります。

## 落とし穴 {#pitfalls}

- **`method="stripe"` のない `HTTP 402` は Stripe Link では支払えません。** チャレンジが Tempo など別の方法しか示していない場合は、`mppx`（または手元のウォレットに合ったもの）を使ってください。Link では拒否されます。逆に `method="stripe"` が示されているなら、`stripe-link-cli` skill 経由の Link を優先し、承認済みのカードから支払うようにします。
- **1 つのヘッダーに複数のチャレンジが並ぶことがあります。** `www-authenticate` に複数の方法（たとえば `tempo, stripe`）が載る場合があります。Link CLI の `mpp decode` は Stripe のほうを、`mppx` は Tempo のほうを選びます。どれが「正解」ということはなく、入金済みのウォレットに合わせて選んでください。
- **金額が 0 のチャレンジ。** MPP のエンドポイントには `$0.00` を請求し、証明用の認証情報だけを求めるものがあります。これは入金済みのウォレットがなくても通ります。「壊れている」と判断して断らないでください。
- **ウォレットの鍵をエージェントの文脈に入れないこと。** 4 つのクライアントはいずれも、鍵を自身の設定ディレクトリに保管します（Privy の場合はセッションごとの一時的な鍵ペアを生成します）。`cat` や `read_file` で読み出さないでください。
- **サーバー側の MPP は別の skill です。** 自分の API に 402 を組み込みたいという相談には、この skill は合いません。https://mpp.dev/quickstart/server と `mppx/nextjs` / `mppx/hono` / `mppx/express` / `mppx/elysia` のミドルウェアを案内してください。専用の `mpp-server` skill は今後追加されるかもしれません。

## 確認 {#verification}

```
mppx --version && mppx account list
```

終了コードが 0 なら、インストール済みでアカウントもある状態です。
