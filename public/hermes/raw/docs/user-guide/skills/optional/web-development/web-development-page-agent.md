---
title: "Page Agent — Web アプリの中に、自然言語で操作できる相棒を組み込む"
description: "Web アプリの中に、自然言語で操作できる相棒を組み込む"
upstream_path: user-guide/skills/optional/web-development/web-development-page-agent.md
upstream_blob: f8332ab3dd5a9e110460e4f30d90eeeab06abdff
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/web-development/web-development-page-agent
---

# Page Agent {#page-agent}

Web アプリの中に、自然言語で操作できる相棒を組み込みます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加で入れるもの — `hermes skills install official/web-development/page-agent` で導入します |
| パス | `optional-skills/web-development/page-agent` |
| バージョン | `1.0.0` |
| 作者 | Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `web`, `javascript`, `agent`, `browser`, `gui`, `alibaba`, `embed`, `copilot`, `saas` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# page-agent {#page-agent}

alibaba/page-agent（https://github.com/alibaba/page-agent 、スター 17,000 超、MIT）は、TypeScript で書かれた、ページの中で動く GUI エージェントです。Web ページの内側に住み、DOM をテキストとして読み（画面の撮影も、複数の形式を扱う LLM も使いません）、「ログインボタンを押して、ユーザー名に John と入れて」のような自然言語の指示を、いま開いているページに対して実行します。すべてブラウザ側で完結し、載せる側はスクリプトを読み込んで、OpenAI 互換の LLM の接続先を渡すだけです。

## こんなときに使います {#when-to-use-this-skill}

次のような場面で、この skill を読み込みます。

- **自分の Web アプリに AI の相棒を載せたい**（SaaS、管理画面、法人向けツール、ERP、CRM）— 「ダッシュボードの利用者に、5 画面をたどらせる代わりに『Acme Corp の請求書を作ってメールして』と打ってもらいたい」
- **古い Web アプリを、画面を作り直さずに今風にしたい** — page-agent は既存の DOM の上にそのまま載ります
- **自然言語での操作を足して、使いやすくしたい** — 音声や読み上げを使う人が、やりたいことを言葉で伝えて画面を操作できます
- **page-agent を試したい・評価したい** — 手元の LLM（Ollama）でも、提供されている LLM（Qwen、OpenAI、OpenRouter）でも動かせます
- **対話型の研修や製品デモを作りたい** — 「経費精算の出し方」を、実際の画面の上で AI に案内させられます

## こんなときは使いません {#when-not-to-use-this-skill}

- **Hermes 自身にブラウザを操作させたい** → Hermes に組み込みのブラウザツール（Browserbase / Camofox）を使ってください。page-agent は *逆向き* のものです。
- **組み込まずに、タブをまたぐ自動操作をしたい** → Playwright、browser-use、あるいは page-agent の Chrome 拡張を使ってください
- **画面を見て位置を判断してほしい** → page-agent は DOM のテキストしか見ません。画像も扱えるブラウザエージェントを使ってください

## 事前に必要なもの {#prerequisites}

- Node 22.13 以上または 24 以上、npm 10 以上（ドキュメントには 11 以上とありますが、10.9 でも問題なく動きます）
- OpenAI 互換の LLM の接続先。Qwen（DashScope）、OpenAI、Ollama、OpenRouter、あるいは `/v1/chat/completions` を話せるものなら何でも構いません
- 開発者ツールが使えるブラウザ（調べもの用）

## 方法 1 — CDN を使って 30 秒で試す（導入なし） {#path-1-30-second-demo-via-cdn-no-install}

いちばん早く動きを見られる方法です。alibaba が無償で公開している評価用の LLM 中継を使います。**評価だけに使ってください**。先方の規約が適用されます。

好きな HTML ページに次の 1 行を足します（開発者ツールのコンソールに貼って、ブックマークレットとして使っても構いません）。

```html
<script src="https://cdn.jsdelivr.net/npm/page-agent@1.8.0/dist/iife/page-agent.demo.js" crossorigin="true"></script>
```

パネルが現れます。指示を打ちます。これだけです。

ブックマークレットの形（ブックマークバーに入れて、好きなページで押します）:

```javascript
javascript:(function(){var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/page-agent@1.8.0/dist/iife/page-agent.demo.js';document.head.appendChild(s);})();
```

## 方法 2 — 自分の Web アプリに npm で入れる（本番向け） {#path-2-npm-install-into-your-own-web-app-production-use}

既にある Web プロジェクトの中で（React / Vue / Svelte / 素の JavaScript、どれでも）:

```bash
npm install page-agent
```

自分の LLM の接続先をつないで動かします。**評価用の CDN を実際の利用者に届けてはいけません。**

```javascript

const agent = new PageAgent({
    model: 'qwen3.5-plus',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: process.env.LLM_API_KEY,   // never hardcode
    language: 'en-US',
})

// Show the panel for end users:
agent.panel.show()

// Or drive it programmatically:
await agent.execute('Click submit button, then fill username as John')
```

接続先の例です（OpenAI 互換ならどれでも動きます）。

| 提供元 | `baseURL` | `model` |
|----------|-----------|---------|
| Qwen / DashScope | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen3.5-plus` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| Ollama（手元で動かす） | `http://localhost:11434/v1` | `qwen3:14b` |
| OpenRouter | `https://openrouter.ai/api/v1` | `anthropic/claude-sonnet-4.6` |

**主な設定項目**（`new PageAgent({...})` に渡します）:

- `model`、`baseURL`、`apiKey` — LLM への接続
- `language` — 画面の言語（`en-US`、`zh-CN` など）
- エージェントが触れる範囲を絞るための、許可リストとデータの伏せ字の仕組みもあります。項目の全体は https://alibaba.github.io/page-agent/ を見てください

**安全のために。** 実際に公開するなら、`apiKey` をブラウザ側のコードに置かないでください。LLM の呼び出しは自分のサーバー経由にして、`baseURL` をそちらに向けます。評価用の CDN があるのは、その中継を alibaba が評価向けに動かしているからです。

## 方法 3 — 元のリポジトリを取ってくる（開発に加わる、あるいは手を入れる） {#path-3-clone-the-source-repo-contributing-or-hacking-on-it}

page-agent そのものを直したい、手元でまとめた IIFE 版を使って好きなサイトで試したい、ブラウザ拡張を開発したい、というときに使います。

```bash
git clone https://github.com/alibaba/page-agent.git
cd page-agent
npm ci              # exact lockfile install (or `npm i` to allow updates)
```

リポジトリの直下に `.env` を作り、LLM の接続先を書きます。例:

```
LLM_MODEL_NAME=gpt-4o-mini
LLM_API_KEY=sk-...
LLM_BASE_URL=https://api.openai.com/v1
```

Ollama の場合:

```
LLM_BASE_URL=http://localhost:11434/v1
LLM_API_KEY=NA
LLM_MODEL_NAME=qwen3:14b
```

よく使うコマンド:

```bash
npm start           # docs/website dev server
npm run build       # build every package
npm run dev:demo    # serve IIFE bundle at http://localhost:5174/page-agent.demo.js
npm run dev:ext     # develop the browser extension (WXT + React)
npm run build:ext   # build the extension
```

**好きなサイトで試す**には、手元でまとめた IIFE 版を使います。次のブックマークレットを登録してください。

```javascript
javascript:(function(){var s=document.createElement('script');s.src=`http://localhost:5174/page-agent.demo.js?t=${Math.random()}`;s.onload=()=>console.log('PageAgent ready!');document.head.appendChild(s);})();
```

そのうえで `npm run dev:demo` を実行し、好きなページでブックマークレットを押すと、手元の版が読み込まれます。保存するたびに作り直されます。

**注意:** 開発用にまとめると、`.env` の `LLM_API_KEY` がそのまま IIFE 版の中に埋め込まれます。まとめたファイルを共有しないでください。コミットもしないでください。URL を Slack に貼るのもやめてください。（実際に、公開されている開発用の版を検索すると `.env` の値がそのまま出てきます。）

## リポジトリの構成（方法 3） {#repo-layout-path-3}

npm のワークスペースを使ったモノレポです。主なパッケージはこちらです。

| パッケージ | パス | 役割 |
|---------|------|---------|
| `page-agent` | `packages/page-agent/` | パネル付きの本体 |
| `@page-agent/core` | `packages/core/` | エージェントの中核。画面は持ちません |
| `@page-agent/mcp` | `packages/mcp/` | MCP サーバー（ベータ） |
| — | `packages/llms/` | LLM のクライアント |
| — | `packages/page-controller/` | DOM の操作と、目に見える手応え |
| — | `packages/ui/` | パネルと多言語対応 |
| — | `packages/extension/` | Chrome / Firefox の拡張 |
| — | `packages/website/` | ドキュメントと紹介サイト |

## 動いているかを確かめる {#verifying-it-works}

方法 1 か方法 2 のあと:
1. 開発者ツールを開いた状態で、そのページをブラウザで開きます
2. 浮いたパネルが見えるはずです。見えなければコンソールのエラーを確認してください（多いのは、LLM の接続先の CORS、`baseURL` の誤り、API キーの誤りです）
3. そのページに見えているものに合わせて、簡単な指示を打ちます（「ログインのリンクを押して」など）
4. ネットワークのタブを見ます。`baseURL` あての通信が出ているはずです

方法 3 のあと:
1. `npm run dev:demo` が `Accepting connections at http://localhost:5174` と表示します
2. `curl -I http://localhost:5174/page-agent.demo.js` が `HTTP/1.1 200 OK` と `Content-Type: application/javascript` を返します
3. 好きなサイトでブックマークレットを押すと、パネルが出ます

## つまずきやすいところ {#pitfalls}

- **評価用の CDN を本番で使う** — やめてください。回数の制限があり、alibaba の無償の中継を使っていて、先方の規約でも本番利用は禁じられています。
- **API キーが見えてしまう** — `new PageAgent({apiKey: ...})` に渡したキーは、JavaScript の配布物に載ります。実際に公開するなら、必ず自分のサーバー経由にしてください。
- **OpenAI 互換でない接続先** は、黙って失敗するか、意味の取りにくいエラーになります。Anthropic や Gemini の形式が必要な提供元なら、あいだに OpenAI 互換の中継（LiteLLM、OpenRouter）を挟んでください。
- **CSP で止まる** — Content-Security-Policy が厳しいサイトでは、CDN のスクリプトを読み込めなかったり、インラインでの評価が禁じられていたりします。その場合は自分のドメインから配ってください。
- 方法 3 で `.env` を直したら **開発サーバーを立て直してください** — Vite は起動時にしか環境変数を読みません。
- **Node の版** — リポジトリの宣言は `^22.13.0 || >=24` です。Node 20 では `npm ci` が engine のエラーで失敗します。
- **npm 10 と 11** — ドキュメントには npm 11 以上とありますが、npm 10.9 でも問題なく動きます。

## 一覧 {#reference}

- リポジトリ: https://github.com/alibaba/page-agent
- ドキュメント: https://alibaba.github.io/page-agent/
- ライセンス: MIT（browser-use の DOM 処理の内部実装をもとにしています。Copyright 2024 Gregor Zunic）
