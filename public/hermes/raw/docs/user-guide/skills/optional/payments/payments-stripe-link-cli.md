---
title: "Stripe Link Cli — Stripe Link を使ったエージェントの支払い — カード、SPT、承認"
description: "Stripe Link を使ったエージェントの支払い — カード、SPT、承認"
upstream_path: user-guide/skills/optional/payments/payments-stripe-link-cli.md
upstream_blob: fdabbab6cb146e10fc242cff6555d2ec8fc33263
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/payments/payments-stripe-link-cli
---

# Stripe Link Cli {#stripe-link-cli}

Stripe Link を使ったエージェントの支払いです — カード、SPT、承認。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/payments/stripe-link-cli` で導入します |
| パス | `optional-skills/payments/stripe-link-cli` |
| バージョン | `0.1.0` |
| 作者 | Teknium (teknium1), Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos |
| タグ | `Payments`, `Stripe`, `Link`, `Checkout`, `MPP` |
| 関連 skill | [`mpp-agent`](/hermes/docs/user-guide/skills/optional/payments/payments-mpp-agent/), [`stripe-projects`](/hermes/docs/user-guide/skills/optional/payments/payments-stripe-projects/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Stripe Link CLI Skill {#stripe-link-cli-skill}

[@stripe/link-cli](https://github.com/stripe/link-cli) をまとめた skill です。使い捨てのバーチャルカードか Shared Payment Token（SPT）を使って、Hermes が本人に代わって買い物を済ませられるようになります。支払いのたびに Link のモバイル / ウェブアプリでの承認が必要で、Hermes が自分で承認することはできません。

いまのところ米国内のみで使えます（Link のアカウント条件のため）。上流の CLI が Windows に対応していないので、この skill は `[linux, macos]` に限定しています。

## 使うとき {#when-to-use}

呼び出しのきっかけになる言い方:

- 「X を買って」「X の支払いをして」「買い物をして」「決済を済ませて」
- 「カードを用意して」「支払い方法が要る」
- 「Link にログインして」「Link のウォレットにつないで」
- 販売側の API から `www-authenticate: ... method="stripe"` 付きの HTTP 402 が返ってきたとき

有料の API 呼び出し（決済フォームのない HTTP 402）をしたい場合、`card` の道筋は合いません。同じ skill の SPT を使うか、`mpp-agent` skill に引き渡してください。

## 事前に必要なもの {#prerequisites}

- `PATH` の通った Node.js 20 以降（`node --version`）
- 米国内にいること（Link のアカウント条件）

Link のアカウント、支払い方法、支払い承認用のアプリは、Hermes が支払いを試みる前に用意しておく必要はありません。初回の実行時に CLI が案内してくれます:

- https://app.link.com の Link アカウント — 初回の `link-cli` 認証で作成・連携されます
- 支払い方法が最低 1 つ — 初回の実行時に https://app.link.com/wallet で追加します
- Link のモバイル / ウェブアプリ — 最初の支払い要求が出たときに開いて承認します

環境変数は必要ありません。認証の状態は CLI が自分の設定ディレクトリに保存します。

## インストール {#install}

一度だけ、全体に入れておきます:

```
npm install -g @stripe/link-cli
```

その場かぎりで `npx @stripe/link-cli` として呼ぶこともできます。以下では、インストール済みの `link-cli` の形で書いています。

## 動かし方 {#how-to-run}

コマンドはすべて `terminal` ツールから実行します。CLI は端末以外からの呼び出しを自動で判別し、既定でコンパクトな `toon` 形式で出力します。モデルが読むぶんにはこれで十分です。構造化された項目が必要な手順では `--format json` を渡してください。

コマンドを調べる: `link-cli --llms-full`。
呼び出す前にコマンドの引数を確認する: `link-cli <command> --schema`。

## 手順 {#procedure}

### 1. 認証を確認する / 済ませる {#1-check-establish-auth}

```
link-cli auth status
```

認証されていない場合は、わかりやすいクライアント名を付けてログインします（この名前が Link アプリに表示されます）:

```
link-cli auth login --client-name "Hermes" --interval 5 --timeout 300
```

`--interval` と `--timeout` を付けると、その場で状態を確認し続けるので、エージェントが `_next` の手順を自分で管理せずに済みます。確認用の URL と合言葉を利用者に伝えて、CLI が戻るまで待ってください。

**`auth status` でログインが確認できるまで、次の手順に進まないでください。**

### 2. 支払い要求を作る前に販売側を見極める {#2-evaluate-the-merchant-before-creating-a-spend-request}

使う認証情報の種類を決めます:

| 販売側の形態 | `--credential-type` |
|---|---|
| 一般的なウェブの決済フォーム / Stripe Elements | `card`（既定） |
| `www-authenticate` に `method="stripe"` を含む HTTP 402 を返す | `shared_payment_token` |
| `method="stripe"` のない HTTP 402 を返す | 対応していません — ここで止めます |

402 の応答では、チャレンジを自分で解読しないでください。ヘッダーをそのまま渡します:

```
link-cli mpp decode --challenge '<full WWW-Authenticate header>'
```

これでチャレンジの妥当性が確認され、ネットワーク ID と解読済みのリクエスト本文が取り出せます。

### 3. 支払い方法と配送先を一覧する {#3-list-payment-methods-shipping}

```
link-cli payment-methods list
link-cli shipping-address list
```

とくに指定がなければ、最初の項目を使ってください。`payment-methods list` の `id` が、次の手順の `--payment-method-id` になります。

### 4. 支払い要求を作る {#4-create-the-spend-request}

このコマンドを打つ前に、最終的な合計金額を利用者に確認してください。金額の単位はセントです。

```
link-cli spend-request create \
  --payment-method-id <pm_id> \
  --merchant-name "<name>" \
  --merchant-url "<url>" \
  --context "<one sentence: what is being purchased and why>" \
  --amount <cents> \
  --line-item "name:<item>,unit_amount:<cents>,quantity:1" \
  --total "type:total,display_text:Total,amount:<cents>" \
  --request-approval
```

MPP の販売側には `--credential-type shared_payment_token` を足してください。

`--request-approval` を付けると利用者の Link アプリに通知が届き、承認か拒否があるまで状態を確認し続けます。拒否や時間切れの場合、CLI は 0 以外の終了コードで終わります。

### 5. 認証情報を取り出す — 安全に {#5-retrieve-the-credential-securely}

**カードの詳細を標準出力に表示しないでください。** `--output-file` を使い、カード番号がエージェントの記録やログに残らないようにします:

```
link-cli spend-request retrieve <lsrq_id> \
  --include card \
  --output-file /tmp/link-card.json \
  --format json
```

ファイルは `0600` の権限で書き出されます。標準出力に出るのは伏せ字にした項目（ブランド、下 4 桁、有効期限）と `card_output_file` のパスだけです。

### 6. 認証情報を使う {#6-use-the-credential}

- ウェブの決済フォームの場合: ファイルのパスを利用者に渡すか、ディスクから直接フォームを埋めるブラウザ操作ツールに渡してください。カードのファイルを `read_file` や `cat` でエージェントの思考の中に読み込まないでください。
- MPP の販売側の場合:

  ```
  link-cli mpp pay <merchant-url> \
    --spend-request-id <lsrq_id> \
    --method POST \
    --data '<json body>'
  ```

### 7. 後片付け {#7-clean-up}

買い物が終わったら、すぐにカードのファイルを消してください:

```
rm -f /tmp/link-card.json
```

## 任意: MCP サーバーとして動かす {#optional-run-as-an-mcp-server-instead}

`@stripe/link-cli --mcp` を使うと、同じコマンド群を stdio 越しの MCP ツールとして公開できます。Hermes 標準の MCP に登録するには:

```
hermes mcp add stripe-link --command "npx" --args "@stripe/link-cli --mcp"
```

そのあと `hermes mcp list` に `stripe-link` が出ていれば登録できています。承認の決まりは同じで、MCP 経由でも Link アプリでの承認は省けません。

## 落とし穴 {#pitfalls}

- **米国内のみです。** 米国外では `auth login` が失敗します。何度も試さずに、その旨を利用者に伝えてください。
- **カード番号をエージェントの文脈に入れてはいけません。** 毎回 `--output-file` を使ってください。もし付けずに取得してしまった場合、`link-cli auth logout` だけでは足りません。カードは使い捨てですが、入れ替えの手当ては必要です。
- **`--request-approval` は利用者が操作するまで止まります。** 利用者が寝ていれば、CLI は時間切れになります。そのつもりで伝えてください。
- **`_next` で続く複数手順のコマンド。** コマンドによっては `_next.command` が返り、それを実行しないと先に進めません。迷ったら、その場で確認し続ける形の引数（`--interval` / `--timeout`）を選んでください。
- **端末以外から呼ぶと出力は既定で `toon` 形式です。** 文章として読むぶんには問題ありませんが、後続の処理で特定の項目を解析するなら `--format json` を渡してください。
- **何も考えず `card` にしないこと。** 認証情報の種類を選び間違えると、買い物が黙って失敗したり、必要以上の情報が渡ったりします。だからこそ販売側を見極める手順（第 2 節）があります。

## 確認 {#verification}

```
link-cli --version && link-cli auth status
```

終了コードが 0 なら、インストール済みでログインもできている状態です。
