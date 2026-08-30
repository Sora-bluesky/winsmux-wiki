---
title: "Publish Site — サイトに版を付けて GitHub / Cloudflare / Netlify の Pages へ公開します"
description: "サイトに版を付けて GitHub / Cloudflare / Netlify の Pages へ公開します"
upstream_path: user-guide/skills/optional/web-development/web-development-publish-site.md
upstream_blob: 731dc0c9e4ed6c829742cb28be0b404479b955de
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/web-development/web-development-publish-site
---

# Publish Site {#publish-site}

サイトに版を付けて GitHub / Cloudflare / Netlify の Pages へ公開します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加 skill — `hermes skills install official/web-development/publish-site` で入れます |
| パス | `optional-skills/web-development\publish-site` |
| バージョン | `1.0.0` |
| 作者 | Hermes Agent (Nous Research) |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `publish`, `deploy`, `hosting`, `github-pages`, `cloudflare-pages`, `netlify`, `static-site`, `versioning`, `rollback`, `web-development` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Publish Site {#publish-site}

ユーザーが作った（あるいはユーザーのために作った）サイト、ダッシュボード、ウェブアプリを、ユーザー自身のものとして使える置き場所に出します。既定は GitHub Pages で、もっと必要なときは Cloudflare Pages か Netlify を使います。守りかたはこうです。手元で表示して内容の了解をもらい、公開のたびに git のタグで版を付け、置き場所を上から順に試して公開し、公開先の URL を実際に HTTP でたたいて確かめ、いつでも一発で前の版に戻せるようにしておきます。

この skill が扱うのは、静的なサイトと SPA のビルド結果（素の HTML/CSS/JS か、Vite・Next の export・Astro などが吐く `dist/`/`build/` フォルダ）です。サーバー側で動くものは対象外です。アカウントの用意なしで使い捨てのサーバーレス公開をしたいときは、追加 skill の `cloudflare-temporary-deploy` を使ってください。

## こんなときに使います {#when-to-use}

ユーザーから次のような依頼が来たら、この skill を読み込みます。

- **サイトをネットに出したい** — 「これを公開して」「どこかに置いて」「人に渡せるリンクがほしい」
- 作ったばかりの**ダッシュボード、レポート、ポートフォリオ、ドキュメントサイト、試作を公開したい**
- すでに公開しているサイトを**新しい内容に更新したい**（出し直すたびに新しい版になります）
- 失敗した公開を前の版に**戻したい**
- **置き場所を選んでほしい** — どこでもいいから URL がほしい

## 事前に必要なもの {#prerequisites}

認証を済ませた公開先の CLI が、少なくとも 1 つあること（次の順に確かめます）。

- **GitHub Pages（既定）:** `gh auth status` が通ること。あわせて `git` も要ります。
- **Cloudflare Pages:** `wrangler whoami` が通ること（または `CLOUDFLARE_API_TOKEN` が設定されていること）。入れかたは `npm i -g wrangler`、もしくは `npx wrangler@latest` を使います。
- **Netlify（代わりの選択肢）:** `netlify status` が通ること。入れかたは `npm i -g netlify-cli`。

あわせて次も要ります。

- 公開する静的な出力の入ったディレクトリ（サイトの直下か、`dist/`/`build/` フォルダ）。ビルドが要るプロジェクトなら、先にビルドしてから、その出力のディレクトリを公開します。元のソースを公開してはいけません。
- 手元の表示を人に見せたいとき用に `cloudflared`（任意です。自分だけで見るなら `python3 -m http.server` で足ります）。

## 実行のしかた {#how-to-run}

以下のコマンドはすべて、サイトのプロジェクトのディレクトリから `terminal` ツールで実行します。流れはいつも同じ 5 手です。

1. ビルドする → 2. 表示して内容の了解をもらう → 3. コミットしてタグを打つ（公開の前に版を切る） → 4. 置き場所を上から順に試して公開する → 5. 公開先の URL を `curl` で確かめて報告する。

## 早見表 {#quick-reference}

| 手順 | コマンド |
|---|---|
| 手元で表示する | `python3 -m http.server 8080 --directory dist` |
| 人に見せる形で表示する | `cloudflared tunnel --url http://localhost:8080` |
| 公開に版を付ける | `git add -A && git commit -m "deploy: <what>" && git tag deploy-YYYYMMDD-HHMM` |
| GitHub Pages（ブランチを使う形） | `git subtree push --prefix dist origin gh-pages` |
| リポジトリで Pages を有効にする | `gh api repos/{owner}/{repo}/pages -X POST -f 'source[branch]=gh-pages' -f 'source[path]=/'` |
| Cloudflare Pages | `npx wrangler@latest pages deploy dist --project-name <name>` |
| Netlify | `netlify deploy --prod --dir dist` |
| 前の版に戻す | `git checkout <previous-tag> -- . && redeploy`（または公開先の管理画面から） |
| 公開先を確かめる | `curl -sS -o /dev/null -w '%{http_code}' <url>` → `200` が返るはずです |

## 手順 {#procedure}

### 1. ビルドして手元で表示する {#1-build-and-preview-locally}

必要ならビルドし（`npm run build` など）、出力のディレクトリを見つけます。そして配信します。

```bash
python3 -m http.server 8080 --directory dist
```

人に見せられるリンクがほしいとき（ユーザーが別の端末にいる、公開の前に了解をもらいたい、といった場合）は、`terminal` の裏で動くセッションでトンネルをさっと開きます。

```bash
cloudflared tunnel --url http://localhost:8080
```

`https://*.trycloudflare.com` の URL をユーザーに渡し、了解をもらってから公開します。終わったらトンネルは止めます。

### 2. 公開の前に版を切る — 例外なし {#2-version-before-deploy-no-exceptions}

公開はすべて git のコミットから出します。そうすれば、どの公開も同じものを作り直せますし、前の版に戻すのも簡単です。

```bash
git init 2>/dev/null; git add -A
git commit -m "deploy: <short description>"
git tag "deploy-$(date +%Y%m%d-%H%M)"
```

プロジェクトにリポジトリがすでにあるなら、コミットしてタグを打つだけです。コミットしていないファイルを公開してはいけません。

### 3. 公開する — 置き場所を上から順に試す {#3-deploy-provider-ladder}

**1 段目 — GitHub Pages（既定。無料で、`gh` の認証が済んでいれば追加のアカウントは要りません）:**

```bash
gh repo create <name> --public --source . --push   # skip if repo exists
git subtree push --prefix dist origin gh-pages      # publish build output
gh api "repos/{owner}/<name>/pages" -X POST \
  -f 'source[branch]=gh-pages' -f 'source[path]=/'  # first time only
```

サイトは `https://<owner>.github.io/<name>/` に出ます。サイトがリポジトリの直下にある（ビルド用のディレクトリがない）場合は、subtree を使わずに `main` を push し、Pages の元を `main` にします。ビルドが要って何度も出し直すプロジェクトなら、push するだけで自動的に公開される公式の `actions/deploy-pages` ワークフローのほうが向いています。

**2 段目 — Cloudflare Pages（独自ドメイン、リダイレクトやヘッダーの設定、Functions が要るとき）:**

```bash
npx wrangler@latest pages deploy dist --project-name <name>
```

初回の実行でプロジェクトが作られ、`https://<name>.pages.dev` の URL が表示されます。独自ドメインは Cloudflare の管理画面（Pages → プロジェクト → Custom domains）で結び付けます。

**3 段目 — Netlify（ほかが使えないとき、またはユーザーがすでにここを使っているとき）:**

```bash
netlify deploy --prod --dir dist
```

`--prod` を付けない `netlify deploy --dir dist` は下書きの URL を返します。2 段目の確認用として使えます。

### 4. 前の版に戻す {#4-rollback}

前の版に戻すとは、前のタグを公開し直すことです。公開されている出力を手で書き換えてはいけません。

```bash
git checkout deploy-<previous> -- .   # or: git checkout deploy-<previous>; rebuild
# then rerun the same deploy command from step 3
```

Cloudflare Pages と Netlify は、公開ごとの履歴も管理画面に残しています（「Rollback to this deploy」）。CLI がすぐ使えないときは、こちらのほうが早いです。

### 5. 秘密の値と環境変数 {#5-secrets-and-environment-variables}

- **秘密の値、API キー、`.env` ファイルは絶対にコミットしないでください** — Pages の置き場所では誰にでも見えてしまいます。最初のコミットの前に `git status` で確かめ、`.env*` は `.gitignore` に入れておきます。
- 実行時の環境変数は、公開先の管理画面に置きます。Cloudflare Pages なら Settings → Environment variables、Netlify なら Site settings → Environment variables です。GitHub Pages は静的なファイルだけで、サーバー側の環境変数はありません。ビルド結果に埋め込まれたものは、その時点で公開されているのと同じです。ユーザーのビルドがキーを埋め込んでいるなら、そのことを伝えてください。

## つまずきやすいところ {#pitfalls}

- **GitHub Pages では SPA のルートが 404 になります。** Pages には書き換えの仕組みがありません。出力のディレクトリで `index.html` を `404.html` にコピーしておくと（`cp dist/index.html dist/404.html`）、ブラウザ側のルーティングが立て直せます。Cloudflare Pages と Netlify なら `_redirects`（`/* /index.html 200`）で SPA に対応できます。
- **GitHub Pages は反映が遅れます。** 最初に有効にしたあとサイトが出るまで 1〜10 分、そのあとの push は 1 分ほどかかります。最初の 404 で失敗と決めつけず、`curl` を数回たたいてから原因を探してください。
- **パスの大文字小文字を区別します。** Pages の置き場所は大文字小文字を区別する Linux です。macOS や Windows では動いていたサイトでも、`Logo.PNG` と書いた参照先が `logo.png` でコミットされていれば 404 になります。ファイルが 404 になったら、HTML の中で大文字小文字が食い違っていないか探してください。
- **プロジェクトのページは URL の途中に名前が入ります。** `https://<owner>.github.io/<name>/` は `/<name>/` の下で配信されるので、`/app.js` のような絶対パスの参照は壊れます。相対パスにするか、ビルドツールの基準パスを設定してください（`vite build --base=/<name>/`）。
- **`wrangler` の認証にはブラウザが要ります。** `wrangler login` は OAuth の画面を開きます。画面のないセッションでは `CLOUDFLARE_API_TOKEN` を使い（ユーザーが dash.cloudflare.com → API Tokens で作ります）、そのトークンをログに出さないでください。
- **独自ドメインは DNS が広まるまで待ちます。** 新しい CNAME は数分から数時間かかることがあります。まず公開先の既定の URL（`*.pages.dev`、`*.netlify.app`、`*.github.io`）で確かめ、独自ドメインはそのあと別に確かめてください。2 つの失敗を一緒くたにしないことです。
- **ビルド結果ではなくソースを公開してしまう。** 実体が `dist/` にあるのにリポジトリの直下を公開すると、ファイル一覧や生の JSX が出てきます。出力のディレクトリに `index.html` があることを必ず確かめてください。

## 動作確認 {#verification}

公開時のログだけを見て成功と報告してはいけません。ユーザーに何かを伝える前に、次を確かめます。

1. `curl -sS -o /dev/null -w '%{http_code}' <live-url>` が `200` を返すこと（GitHub Pages の初回の公開では 2 分ほど繰り返します）。
2. `curl -sS <live-url> | head -30` に、想定どおりの `index.html` の中身が出ること。公開先の URL に対して `web_extract` を使い、HTML を確かめてもかまいません。
3. SPA なら、深いところのルート（たとえば `/about`）も curl して、`404` ではなく `200` が返ることを確かめること。
4. `git tag --list 'deploy-*'` に、この公開のタグが出ること。

そのうえで、公開先の URL と、戻すときに使えるタグをユーザーに伝えます。
