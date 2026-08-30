---
title: "Inspecting Hermes Desktop Dom — 動いている Hermes デスクトップの DOM/CSS を CDP で読む"
description: "動いている Hermes デスクトップの DOM/CSS を CDP で読む"
upstream_path: user-guide/skills/bundled/software-development/software-development-inspecting-hermes-desktop-dom.md
upstream_blob: d3f5e423cda7a9110ae74be6991a00793c725652
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/software-development/software-development-inspecting-hermes-desktop-dom
---

# Inspecting Hermes Desktop Dom {#inspecting-hermes-desktop-dom}

動いている Hermes デスクトップの DOM/CSS を CDP で読みます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/software-development\inspecting-hermes-desktop-dom` |
| バージョン | `1.0.0` |
| 作者 | Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `desktop`, `electron`, `cdp`, `dom`, `ui-verification`, `self-inspection` |
| 関連 skill | [`node-inspect-debugger`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-node-inspect-debugger/), [`systematic-debugging`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-systematic-debugging/), [`dogfood`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-dogfood/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# 動いている Hermes デスクトップの DOM を調べる {#inspecting-the-live-hermes-desktop-dom}

## 概要 {#overview}

`apps/desktop` を開発していて、利用者が同じアプリ（`hgui` /
`npm run dev`）を動かしているときは、その人が見ている画面の**実際に描画された DOM**
を読めます。計算後のスタイル、位置と大きさ、どの CSS ルールが実際に勝ったか、
コンソールの出力まで分かるので、`.tsx` から推測して外すことがなくなります。

開発サーバーで起動した場合、Chrome DevTools Protocol のポートが `127.0.0.1:9222`
に自動で開きます。描画側は Chromium のページなので、DevTools で読めるものは
スクリプトからも読めます。

**これは実際に目で見ることの代わりにはなりません。** CDP が答えられるのは*事実*の問い
（「計算後の padding はいくつか」「この要素は描画されたか」「どのセレクタが当たっているか」）
です。結果の見栄えが良いかどうかは判断できません。色の釣り合い、余白の感じ、
「これは見苦しいか」は、やはり利用者の目かスクリーンショットが必要です。事実は
CDP で答え、美しさの判断は利用者に委ねてください。

## こんなときに使います {#when-to-use}

- UI の変更が、動いているアプリに本当に反映されたか確かめたいとき
- 「なぜこの要素はまだ X のままなのか」— 何かを直す前に、勝っているルールを突き止めたいとき
- これから変更するコンポーネントの、安定したセレクタを探したいとき
- デザイントークンの計算後の値を、実際のノードで確かめたいとき
- 利用者が言っているのに書き写せない、描画側のコンソールエラーを読みたいとき

**使わない場面:** 性能の計測やヒープの調査（`node-inspect-debugger`、
`debugging-hermes-desktop`）、そして本当の問いが「これは見た目として正しいか」である場合。

## ポート {#the-port}

開発サーバーで起動すると `127.0.0.1:9222` に開きます。閉じるのはちょうど2つの場合だけです
（`apps/desktop/electron/dev-cdp.ts`）。

- **パッケージ済みのビルド** — 常に閉じており、環境変数でも上書きできません。
- **`HERMES_DESKTOP_DEV_SERVER` がない場合** — パッケージ化していない `electron .` を
  `dist/` に対して動かすのは、パッケージ済みアプリの動作確認のやり方なので、同じ扱いになります。

`HERMES_DESKTOP_CDP_PORT` でポートを変えられます（`=9333`）。無効にもできます（`=off`）。

何かを始める前に確認します。

```bash
curl -s --max-time 3 http://127.0.0.1:${HERMES_DESKTOP_CDP_PORT:-9222}/json/version
```

空なら、ポートは開いていません。黙って別のポートを当てずっぽうで試さないでください。

**ポートを得るために利用者のアプリを再起動しては決していけません。** セッションも作業中の状態も
壊れます。代わりに、自分専用の隔離したインスタンスを起動してください（後述）。

## DOM を読む {#reading-the-dom}

`apps/desktop/scripts/eval.mjs` が一行で済ませる方法です。

```bash
cd apps/desktop
node scripts/eval.mjs "document.querySelectorAll('[data-slot]').length"
```

何段階かに分かれる作業では、共有のクライアントを使います。対象の探索と、
Promise を待てる eval が付いています。

```js

const cdp = await CDP.connect({ port: 9222, match: '5174' })
const out = await cdp.eval(`JSON.stringify({
  radius: getComputedStyle(document.documentElement).getPropertyValue('--radius-scalar').trim(),
  composer: !!document.querySelector('[data-slot="composer-rich-input"]')
})`)
cdp.close()
```

`scripts/perf/lib/cdp.mjs` の `SELECTORS` に、安定した `data-slot` の取っかかりがまとまっています
（composer、スレッドの表示領域、アシスタントのメッセージ、やり取りの組、プロフィールの帯）。
自分で `querySelector` を考えるより、こちらを使ってください。コンポーネントが移動したときに
まとめて更新されます。

## いちばん得意な問い: どのルールが勝ったのか {#the-question-this-is-best-at-which-rule-won}

スタイルが「効かない」からといって呼び出し箇所を片端から直すのは、典型的な無駄です。
まず実際のノードを読みます。

```js
const el = document.querySelector('[data-slot="aui_assistant-message-root"] a')
JSON.stringify({
  ownClasses: el.className,
  weight: getComputedStyle(el).fontWeight,
  parents: (() => {
    const out = []
    let n = el
    while ((n = n.parentElement) && out.length < 6) out.push(n.className)
    return out
  })()
})
```

そのノードが自分のクラスを持っていないなら、値は**継承されたもの**です。呼び出し箇所を
なぎ払っても直りません。必要なのは先祖側のルールです。プラグインのスタイルシート
（たとえば `@tailwindcss/typography` の `prose a { font-weight: 500 }`）は、ユーティリティクラスに
普通に勝ちます。使うたびに上書きするのではなく、共通のクラス側で上書きしてください。

## 自分専用の隔離したインスタンス {#your-own-isolated-instance}

ポートが開いていないとき、あるいは利用者の画面を邪魔できないときに使います。

```bash
cd apps/desktop
HERMES_HOME=/tmp/cdp-probe-home \
HERMES_DESKTOP_DEV_SERVER=http://127.0.0.1:5174 \
HERMES_DESKTOP_CDP_PORT=9333 \
  npx electron . --user-data-dir=/tmp/cdp-probe-userdata
```

`--user-data-dir` を分けると Electron の単一インスタンスのロックを避けられるので、動いている
`hgui` とぶつかりません。`HERMES_HOME` を分けることで、本物のセッションからも離せます。
同じ理由で、ポートも 9222 以外を選んでください。バックグラウンドで動かし、終わったら止めます。

性能計測の仕組みも一緒に使いたい場合は、`npm run perf:serve` が一時的な `HERMES_HOME` を
組み込んだ同じことをしてくれます。

## 落とし穴 {#pitfalls}

- **何かを「空ける」ために、利用者の開発サーバーやアプリを止めては決していけません。** 配信の途中で
  止めると Chromium のソケットの管理が壊れ、そこで出た `ERR_NETWORK_CHANGED` が、
  直前に変更した箇所のせいにされます。
- **使い捨ての `HERMES_HOME` にはバックエンドがありません。** アプリは `hermes:api` について
  `ECONNREFUSED` をログに出し、自分で終了することもあります。それでも描画側は立ち上がり、DOM は
  読めます。早めに読み、自分で終了しただけの調査用インスタンスを、ポートの不具合と取り違えないで
  ください。Chromium はポートを確保したとき `DevTools listening on ws://127.0.0.1:<port>/…` と
  ログに出します。この行が、ポートが開いた証拠です。
- **1回だけ試すのではなく、繰り返し確認してください。** 起動直後のアプリは、ポートが応答するまでに
  1〜2秒かかります。
- **DOM 全体を出力しては決していけません。** デスクトップは何百ものノードを描画するので、
  `outerHTML` はコンテキストを埋め尽くします。評価する式の中で、小さな JSON オブジェクトまで
  絞り込んでください。
- **`CDP.connect` には `match` を渡してください。** これがないと、メインの画面ではなくペットの
  重ね表示、クイック入力の画面、devtools の対象につながることがあります。
- **`cdp.eval` は値をそのまま返しますが、生の `Runtime.evaluate` は二重に包みます**
  （`.result.result.value`）。ラッパーを使ってください。
- **このリポジトリでは `vite dev` のもとで `import.meta.env.DEV` は `true` です。** そうでないと書いてある
  `apps/desktop/scripts/profile-typing-lag.md` の記述は古いものです。
