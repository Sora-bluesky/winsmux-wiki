---
title: "Cloudflare Temporary Deploy — アカウントなしで Worker を公開する（wrangler --temporary）"
description: "アカウントなしで Worker を公開する（wrangler --temporary）"
upstream_path: user-guide/skills/optional/web-development/web-development-cloudflare-temporary-deploy.md
upstream_blob: 3650a0bda8405a12ea0bdeb3c52ba4b4123d0e70
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/web-development/web-development-cloudflare-temporary-deploy
---

# Cloudflare Temporary Deploy {#cloudflare-temporary-deploy}

wrangler --temporary を使って、アカウントなしで Worker を公開します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加で入れるもの — `hermes skills install official/web-development/cloudflare-temporary-deploy` で導入します |
| パス | `optional-skills/web-development\cloudflare-temporary-deploy` |
| バージョン | `1.0.0` |
| 作者 | Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `cloudflare`, `workers`, `wrangler`, `deploy`, `temporary`, `agent`, `serverless`, `web-development` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Cloudflare Temporary Deploy Skill {#cloudflare-temporary-deploy-skill}

`wrangler deploy --temporary` を使って、アカウントの用意なしに Cloudflare Worker を `workers.dev` の公開 URL へ出します。Cloudflare が使い捨てのアカウントを用意して公開し、60 分だけ有効な引き取り用の URL を表示します。引き取られなかったアカウントは自動で消えます。おかげでエージェントは、OAuth もサインアップもトークンの貼り付けもなしに、書く → 公開する → 確かめる、という短い輪を回せます。

この skill は本番向けの公開は扱いません（そちらは `wrangler login` と恒久的なアカウントを使ってください）。また、下にある一時アカウントの上限を超えるような、Worker 以外の Cloudflare 製品も対象外です。

## こんなときに使います {#when-to-use}

次のような場面で、この skill を読み込みます。

- **エージェントが書いたコードを公開 URL に出したい**、しかも先に Cloudflare のアカウントを作りたくない — 「これを公開してリンクをちょうだい」
- **裏で自動的に進むセッションで反復したい** — ブラウザでの OAuth があると、そこで止まってしまいます
- **Workers を手早く試したい・評価したい** — 使い捨てで、あとから引き取れる先が要るとき
- **自分で確かめられる公開の輪を作りたい** — 公開して、公開 URL を `curl` して、コードどおりの出力かを確かめて、また公開する

## こんなときは使いません {#when-not-to-use}

- **本番や CI/CD** → 恒久的なアカウントを使ってください（`wrangler login` か `CLOUDFLARE_API_TOKEN`）。資格情報がひとつでもあると `--temporary` はエラーになります。
- **wrangler がすでに認証済み** → `--temporary` は仕様どおりエラーを返します。使い捨てで公開したいと本人がはっきり望むときだけ、先に `wrangler logout` を実行してください。
- **長く置いておきたい** → 一時的な公開は、引き取らなければ 60 分で消えます。

## 事前に必要なもの {#prerequisites}

- **Wrangler 4.102.0 以上。** `--temporary` が入ったのがこの版です。これより古い版にはありません。`npx wrangler@latest --version` で確かめます。
- **Node 18 以上と npm**（`npx`、`yarn`、`pnpm` でも構いません）。全体への導入は不要で、`npx wrangler@latest` で動きます。
- **Cloudflare の資格情報が無いこと。** `--temporary` は wrangler が未認証のときだけ動きます。OAuth でのログイン、環境変数の `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_API_KEY`、`~/.wrangler` / `~/.config/.wrangler` に残った OAuth の情報、どれも無い状態にしてください。`terminal` ツールの環境はそのまま使い、これらの変数を設定しないでください。
- `cloudflare.com` と `workers.dev` への通信ができること。
- `--temporary` を使うことは、Cloudflare の利用規約とプライバシーポリシーに同意することにあたります。

## 実行のしかた {#how-to-run}

どの手順も `terminal` ツールで行います。版は必ず固定してください（`wrangler@latest` か `wrangler@4.102.0` 以上）。そうしないと、このフラグを持たない古い wrangler がうっかり動いてしまいます。

1. **最小構成の Worker を用意します**（すでにプロジェクトがあれば飛ばします）。Worker には `wrangler.toml`（または `wrangler.jsonc`）と、入口になるスクリプトが要ります。TypeScript での最小例は次のとおりです。`write_file` で書き出してください。

   `wrangler.jsonc`:
   ```jsonc
   {
     "name": "hello-agent",
     "main": "src/index.ts",
     "compatibility_date": "2025-01-01"
   }
   ```

   `src/index.ts`:
   ```typescript
   export default {
     async fetch(): Promise<Response> {
       return new Response("hello cloudflare");
     },
   };
   ```

2. **プロジェクトのディレクトリで `--temporary` を付けて公開します**:
   ```
   npx wrangler@latest deploy --temporary
   ```
   計算量による確認が入るため、自動で少し待ちが入ります。うまくいくと wrangler が `Account: <name> (created)`（あるいは `(reused)`）の行、`Claim URL`、そして公開された `https://<worker>.<account>.workers.dev` の URL を表示します。

3. **その出力から URL を取り出します。** 目で拾わず、付属のスクリプトで確実に抜き出してください:
   ```
   npx wrangler@latest deploy --temporary 2>&1 | python scripts/parse_deploy_output.py
   ```
   （`scripts/parse_deploy_output.py` は、この skill の絶対パスに読み替えてください。）`{"live_url", "claim_url", "account", "account_state", "expires_minutes", "deployed"}` という JSON が出力されます。

4. **本当に公開できているかを確かめます** — 公開時のログだけを信じないでください。公開 URL を `curl` して、本文がコードの返す内容と一致するかを見ます:
   ```
   curl -sS <live_url>
   ```

5. **繰り返します。** コードを直したら、同じ `npx wrangler@latest deploy --temporary` でもう一度公開します。60 分のあいだは wrangler が一時アカウントを使い回すので（`Account: <name> (reused)`）、URL は変わりません。もう一度 `curl` して、変更が反映されたかを確かめます。

6. **引き取り用の URL をユーザーに渡します。** 次のことを伝えてください。60 分以内に開けば、公開したものと関連する資源をそのまま保持できます。引き取らなければ、すべて自動で消えます。この URL はアカウントの所有権そのものなので、秘密として扱ってください。

## 早見表 {#quick-reference}

| 手順 | コマンド |
|---|---|
| 版を確かめる（4.102.0 以上が必要） | `npx wrangler@latest --version` |
| 公開する（アカウント不要） | `npx wrangler@latest deploy --temporary` |
| 公開して URL を取り出す | `npx wrangler@latest deploy --temporary 2>&1 \| python scripts/parse_deploy_output.py` |
| 公開できたか確かめる | `curl -sS <live_url>` |
| 使い回している一時アカウントを消す | `npx wrangler@latest logout` |

### 一時アカウントでの製品ごとの上限 {#temporary-account-product-limits}

| 製品 | 一時アカウントでの上限 |
|---|---|
| Workers | `workers.dev` へ公開できます |
| Static Assets | 1,000 ファイルまで、1 つ 5 MiB まで |
| KV | 使えます |
| D1 | データベース 1 つ、1 つあたり 100 MB / 合計 100 MB |
| Durable Objects | 使えます |
| Hyperdrive | 設定 2 つ、接続 10 本 |
| Queues | 10 個まで |
| SSL/TLS の証明書 | 使えます |

## つまずきやすいところ {#pitfalls}

- **`--temporary` は `wrangler deploy --help` に出てこず、全体で使えるフラグでもありません。** わざと隠されていて、必要なときだけ出てきます。未認証で `wrangler deploy` が失敗すると、wrangler が「`--temporary` を付けて実行し直してください」と表示します。`--help` に無いからといって、フラグが存在しないと決めつけないでください。確かめるのは版のほうです。
- **古い wrangler が入っている。** 全体に入れたままの古い `wrangler`（`< 4.102.0`）には、黙ってこのフラグがありません。版をこちらで決められるよう、必ず `npx wrangler@latest`（または `>=4.102.0` を固定したもの）で呼び出してください。
- **資格情報があると、はっきりエラーになります。** 一度でも `wrangler login` を実行していたり、`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_API_KEY` が設定されていたりすると、`--temporary` はエラーになります。そのシェルで変数を解除するか、`wrangler logout` を実行してください。断りなく本人の資格情報を消してはいけません。
- **回数の制限。** 一時アカウントを立て続けに作ると失敗します。新しく作り直さず、60 分のあいだは使い回しているアカウントへ公開し直してください。制限に当たったら、待つか、恒久的なアカウントを使います。
- **60 分でぴったり切れます。延長はできません。** 1 時間より長く残す必要があるなら、ユーザーに引き取ってもらうしかありません。ここははっきり伝えてください。
- **公開し直した直後、`curl` が古い本文を返すことがあります。** `workers.dev` には短いエッジのキャッシュがあります。`(reused)` の行と新しい `Current Version ID` が出ていれば、数秒のあいだ `curl` が古い内容を見せても、公開は成功しています。失敗と決める前に、もう一度取得し直すか、キャッシュ避けのクエリ文字列を付けてください。
- **引き取り用の URL を「ただのリンク」として共有の記録に残さないでください。** 資格情報と同じものです。

## 確認 {#verification}

- `npx wrangler@latest --version` が `>= 4.102.0` を返す。
- `npx wrangler@latest deploy --temporary` が `workers.dev` の公開 URL と、`claim-preview?claimToken=` を含む引き取り用の URL を表示する。
- `curl -sS <live_url>` が、Worker のコードどおりの本文を返す。
- 2 回目の公開で `Account: <name> (reused)` と表示され、公開 URL が変わらない。
- 取り出し用スクリプトの自己確認が通る: `python scripts/parse_deploy_output.py --selftest`。
