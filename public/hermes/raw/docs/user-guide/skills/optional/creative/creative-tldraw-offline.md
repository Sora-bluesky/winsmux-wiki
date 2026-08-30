---
title: "Tldraw Offline — tldraw のオフラインキャンバスをエージェントで操作・スクリプト化する"
description: "tldraw のオフラインキャンバスをエージェントで操作・スクリプト化する"
upstream_path: user-guide/skills/optional/creative/creative-tldraw-offline.md
upstream_blob: 737d51391205f927c60c0089c72b923c3a3f1258
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/creative/creative-tldraw-offline
---

# Tldraw Offline {#tldraw-offline}

tldraw のオフラインキャンバスをエージェントで操作・スクリプト化します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/creative/tldraw-offline` で導入します |
| パス | `optional-skills/creative\tldraw-offline` |
| バージョン | `1.0.0` |
| 作者 | Teknium + Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `tldraw`, `canvas`, `whiteboard`, `document-script`, `diagramming` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# tldraw offline Skill {#tldraw-offline-skill}

tldraw のオフライン版デスクトップアプリ（offline.tldraw.com）を扱います。開いているキャンバス
を読み、編集し、**ドキュメントスクリプト**を書きます。ドキュメントスクリプトとは
`.tldraw` ファイルに埋め込まれた JavaScript で、読み込み時に実行され、そのファイルに永続的な
振る舞いを与えるものです。このアプリは**ローカルの HTTP API**（既定は `localhost:7236`）を
動かしていて、コーディングエージェントはターミナルからただの `curl` でそれを操作します。
アプリ公式サイトのデモ（Codex がキャンバスをその場で編集するもの）もまさにこの仕組みです。
エージェントは computer-use や GUI のクリックを使わず、`.tldraw` ファイルを直接手で編集する
こともしません。作業中は tldraw offline を開いたままにしてください。

## 使いどころ {#when-to-use}

- ユーザーが tldraw offline を開いた状態で、キャンバス（図、ワイヤーフレーム、レイアウト）
  の作成や変更を頼んできたとき。
- 埋め込みのドキュメントスクリプトで、描いたものに永続的な振る舞い（反応する図形、押せる
  ボタン、アニメーション、接続のロジック）を持たせたいとき。

図を真似て図形を手で置いていくのはやめてください。図形を生成するコードのほうを書きます。
エージェントはキャンバスに絵を描くより、キャンバスをスクリプトで動かすほうがはるかに得意です。

## 前提条件 {#prerequisites}

- **tldraw offline がインストールされ、起動していて**、ドキュメントが開いていること。配布物:
  https://github.com/tldraw/tldraw-offline/releases/latest （macOS の DMG、Windows の
  x64/Arm64、Linux の `x86_64`/`arm64` AppImage または amd64/arm64 の `.deb`）。
- **アプリ側でエージェント skill を入れておくこと**: `Develop → Install Agent Skills`。アプリが
  自前の tldraw skill を `~/.codex/skills/`、`~/.claude/skills/`、`~/.cursor/skills/`、
  `~/.gemini/skills/` へ書き出し、そのエージェントに以下の `curl` の書き方を教えます。
  （この Hermes skill は同じ内容を Hermes 向けに写したものです。）
- **ローカルの制御 API。** 起動時にアプリは設定ディレクトリ（Linux は `~/.config/tldraw/`、
  macOS は `~/Library/Application Support/tldraw/`、Windows は `%APPDATA%\tldraw\`）へ
  `server.json` を書き出します。中身は `port`（既定は `7236`）、bearer の `token`、`pid`、
  `startedAt` です。`GET /` 以外のすべてのリクエストには
  `Authorization: Bearer <token>` が必要です。正常終了すると `server.json` は消えます。
  ファイルはあるのにポートが応答しない場合は異常終了しているので、起動していないものとして
  扱ってください。
- **シェルを呼ぶたびにポートとトークンを読み直すこと。** ターミナルの呼び出しは毎回まっさらな
  シェルなので、`export` したトークンは残りません。「一度 export して使い回す」と空のトークンが
  送られて 401 になります。呼び出しの先頭で毎回その場で両方を読みます:
  `PORT=$(jq -r .port <server.json>); TOKEN=$(jq -r .token <server.json>)`。
- ローカルでの編集にアカウントもネットワークも要りません。

## 実行方法 {#how-to-run}

作業の流れは 2 通りに分かれます。その変更が再読み込み後も残るべきかどうかで選んでください。

**A. 一度きりのキャンバス編集（`/exec`）** — レイアウト、図形の生成、後片付けなど。これは
その場の編集で、保存されるスクリプトではありません:

```bash
BASE=http://localhost:7236
TOKEN=$(python -c "import json;print(json.load(open('$HOME/.config/tldraw/server.json'))['token'])")
# find the focused document id
DOC=$(curl -s "$BASE/api/search" -X POST -H 'content-type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"code":"return (await api.getFocusedDoc()).id"}' | python -c "import sys,json;print(json.load(sys.stdin)['result'])")
# run code with the live `editor` + `helpers` in scope
curl -s "$BASE/api/doc/$DOC/exec" -X POST -H 'content-type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"code":"const {createShapeId,toRichText}=await import(\"tldraw\"); editor.createShape({id:createShapeId(),type:\"geo\",x:0,y:0,props:{geo:\"rectangle\",w:200,h:100,color:\"blue\",fill:\"solid\",richText:toRichText(\"hello\")}}); return editor.getCurrentPageShapes().length"}'
```

**B. 永続的な振る舞い（`script/main.js`）** — 再読み込み後も残ってほしい、反応や操作の
ロジック。ディスク上のファイルを編集すると、アプリの監視機能がそれを反映します:

```bash
# get the live script file path for the doc
curl -s "$BASE/api/doc/$DOC/script-workspace" -X POST \
  -H "Authorization: Bearer $TOKEN"          # -> result.mainJsPath, result.isDefaultScript
# edit result.mainJsPath with read_file / patch / write_file (see scripts/main.js)
# then confirm the watcher applied it:
curl -s "$BASE/api/doc/$DOC/script-status" -H "Authorization: Bearer $TOKEN"
```

そのまま流用できるドキュメントスクリプトが `scripts/main.js` です。

## 早見表 {#quick-reference}

ドキュメントスクリプトの取り決めです（アプリに同梱の `script-context.d.ts` と突き合わせて
確認済み）:

```js

export default function ({ editor, helpers, signal }) {
  editor.run(() => {                                 // batch = one undo step
    helpers.createShapeIfMissing({                   // idempotent furniture
      id: createShapeId('node-1'), type: 'geo', x: 0, y: 0,
      props: { geo: 'rectangle', w: 200, h: 100, richText: toRichText('hi') },
    })
  })

  const stop = editor.store.listen(() => { /* react */ })  // fires the tick AFTER a commit
  signal.addEventListener('abort', () => stop())           // REQUIRED cleanup on rerun/close
}
```

- `ctx.editor` — 実物の `Editor` です（`createShape`、`updateShape`、`deleteShapes`、
  `getCurrentPageShapes`、`getShape`、`getBindingsFromShape`、`zoomToFit`、
  `on('tick'|'event', fn)`、`run(fn, { history: 'ignore' })`）。
- `ctx.helpers` — `createShapeIfMissing`、`createShapesIfMissing`、
  `createArrowBetweenShapes(from, to, { arrowheadEnd })`、`translateShapes`、
  `onShapeTranslate(id, fn, { signal })`、`richTextToPlainText`、`boxShapes`、
  `getLints`。
- `ctx.signal` — `AbortSignal` です。リスナーやインターバルの後片付けはすべてこれに繋ぎます。
- `config.js`（別ファイル）は独自の shape/tool/component の util を登録し、マウント前に
  実行されます。`main.js` はマウント済みの editor に対して動き、保存のたびに再実行されます。

## 操作できる UI（状態を動かす押せるボタン） {#interactive-ui-clickable-buttons-that-drive-state}

描いた図形は本物のアプリのように振る舞えます。静的なホワイトボードにはできないことです。
完全な例は `scripts/counter.js`（数値の表示と MINUS / RESET / PLUS のボタン）にあります。

検証の線引き — 操作が効く・効かないと言う前にここを読んでください。アプリ自身のエージェント
向け手引きでは、クリックできる UI のスクリプトは `/exec` 経由の「シミュレートしたクリック 1 回と
状態の読み取り 1 回」で確かめる、とされています（`editor.dispatch` でポインタイベントを送り、
1 tick 待って、図形の状態を読む）。実際のマウスを動かすのではありません。この基準では
カウンターは検証済みで、送り込んだクリックで `0 → 1 → 2 → 1 → 0` と動きました。書き留めて
おく価値のある注意点が 2 つあります:
- **スクリプトはアプリのファイル監視が反映して初めて動きます。** Linux ではこの監視に inotify を
  使うため、`fs.inotify.max_user_instances` を使い切ったホストでは
  `inotify_add_watch ... No space left on device` がログに出て、`script-status` は
  `state: "not-watching"` / `hasEntry: false` を示し、スクリプトは一度も実行されません。
  これはスクリプトの不具合ではなくホスト側の上限です。ふつうのデスクトップでは起きません。
- **computer-use でキャンバスを操作するには、バックグラウンドではなくフォアグラウンドでの
  送出が要ります。** cua-driver の既定である `background` の送出は、Electron の隠れた
  レンダラーに対して `background_unavailable` を返します。ただしこれは最初の一段であって
  行き止まりではありません。cua-driver は `escalation: "foreground"` というヒントを返すので、
  `delivery_mode: "foreground"` を設定し（`bring_to_front` と組み合わせて）ください。すると
  X11 XTest の経路（`x11_xtest_fg`）でクリックが届き、「Run Script」の確認ダイアログを閉じたり
  キャンバスをクリックしたりできます。Cua チームがまさにこの v1.11.0 の AppImage（Linux/X11）
  で確認しています。バックグラウンドのまま「Electron は合成クリックを受け付けない」と結論して
  諦めないでください。フォアグラウンドまで上げます。（本来の道筋はあくまでクリックではなく
  `/exec` です。この注意書きは computer-use でテストする場合のものです。）

型はこうなります:

```js
export default function ({ editor, helpers, signal }) {
  // 1. Build buttons idempotently; tag each with meta so the handler finds them.
  //    Give buttons a visible label AND a meta.action.
  // 2. Hit-test pointer_down in PAGE coordinates against the button bounds:
  const inside = (b, p) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h
  function onEvent(info) {
    if (!info || info.name !== 'pointer_down') return
    let p = null
    try { if (info.point && editor.screenToPage) p = editor.screenToPage(info.point) } catch {}
    p = p ?? editor.inputs?.currentPagePoint
    if (!p) return
    const hit = editor.getCurrentPageShapes().find(
      (s) => s.meta?.ui === 'button' &&
        inside({ x: s.x, y: s.y, w: s.props.w, h: s.props.h }, p)
    )
    if (hit) runAction(hit.meta.action)   // mutate state; store it in a shape's meta
  }
  editor.on('event', onEvent)
  signal.addEventListener('abort', () => editor.off('event', onEvent))  // REQUIRED
}
```

- ボタンは座標を直書きして探すのではなく、`meta`（または `helpers.richTextToPlainText` で
  読める見た目のラベル）から探します。
- **作る側と読む側を 1 つのスクリプトが持ちます。** 図形を作るコードが `meta.action: 'inc'` を
  付けているのに、ハンドラ側が別の決まり（`meta.action === 'PLUS'`）で読んでいると、クリック
  しても何も起きないまま黙って終わります。ボタンは、それを処理するのと同じスクリプトで作って
  配布するか、空のキャンバスを配ってスクリプトに一から作らせてください。食い違った図形を
  ファイルの db に焼き込んで配るのは避けます。
- アプリの状態は図形の `meta`（たとえば `meta.count`）に持たせ、その図形の `richText` ラベル
  として描画します。こうすると保存しても残り、検証のときにも読めます。
- **`signal` の abort でリスナーを外してください。** これを飛ばすのは見た目の問題ではありません。
  次の保存のときに古い `onEvent` が新しいものと並んで残るので、クリックのたびに 2 回発火し、
  カウンターは 1 ずつではなく 2 ずつ進みます。
- 動き続けるものには `editor.on('tick', fn)` を使います。動くアンカーに部品が付いてくる形なら
  `helpers.onShapeTranslate(id, fn, { signal })` を使います。

### スクリプト入りの `.tldraw` を自動実行できる形で配る {#shipping-a-self-running-scripted-tldraw}

`.tldraw` は `metadata.json` + `session.json` + `db.sqlite` + `assets/` + `script/` を
まとめた zip です（同梱できるのはこれらの項目だけです）。「This document contains a script →
Run Script」の確認ダイアログを出さずにスクリプトを自動実行させるには:

- `metadata.json` に `script` のマニフェスト `{ "sha256": "<digest>" }` を持たせます。この
  digest は、並べ替えた `script/` の各パスを `` `${path}\0${sha256hex(bytes)}\n` `` の形にした
  ものに対する `sha256` です。食い違うと改竄とみなして拒否されます。
- digest を `~/.tldraw/script-trust.json` に追加して、あらかじめ信頼させます
  （`{ "trusted": ["<digest>"] }`、または `$TLDRAW_SCRIPT_TRUST`）。`isScriptTrusted(digest)`
  が true になると、アプリは確認をとばします。

## 手順 {#procedure}

1. `server.json` から現在のトークンとポートを読みます。対象のドキュメントは
   `api.getFocusedDoc()`（または `api.getDocs()`）で見つけます。複数開いているなら明示的に
   名前で指定します。
2. レイアウトや生成には `/exec` を使います。永続的な振る舞いには `/script-workspace` 経由で
   `script/main.js` を編集します。
3. スクリプトは何度実行しても同じ結果になるようにします。残す図形は
   `helpers.createShapeIfMissing` と、変わらない `createShapeId('name')` の id で作ります。
   スクリプトは読み込みのたびに再実行されます。
4. スクリプトが書いた内容をユーザーの undo 履歴に混ぜないようにします:
   `editor.run(fn, { history: 'ignore' })`（`helpers.translateShapes` は最初からそうなって
   います）。
5. 反応させるには `editor.store.listen(cb)` を使い、`signal` の abort で片付けます。
   操作には `editor.on('event', h)`（`pointer_down` をページ座標で当たり判定）、
   アニメーションには `editor.on('tick', h)` を使います。
6. 動くアンカーが 1 つあり、それに中身が付いてくる形なら、広く張った store のリスナーよりも
   `helpers.onShapeTranslate(anchorId, fn, { signal })` を選んでください。広いリスナーは
   自分の書き込みをそのまま拾って堂々巡りになることがあります。

## 図形の props（tldraw SDK v5 のスキーマで検証済み） {#shape-props-validated-against-tldraw-sdk-v5-schema}

`editor.createShape` と `createShapeIfMissing` は props の一部だけでも受け付けます（shape の
util が既定値を埋めます）。ファイルのスナップショット向けに**生のレコード**を組み立てる場合は、
下の props がすべて必要です（`scripts/validate_shapes.mjs` を実行してください）:

| 図形 | 必要な props |
|-------|----------------|
| `note`  | `richText`, `color`, `labelColor`, `size`, `font`, `align`, `verticalAlign`, `growY`, `fontSizeAdjustment`, `url`, `scale`, `textLastEditedBy` |
| `text`  | `richText`, `color`, `size`, `font`, `textAlign`, `w`, `scale`, `autoSize` |
| `frame` | `w`, `h`, `name`, `color` |
| `geo`   | `geo`, `w`, `h`, `color`, `fill`, `richText`（加えて dash や size などは既定値が入ります） |

`richText` は `toRichText('...')` でなければならず、ただの文字列は拒否されます。`color` に
使える値は `black grey light-violet violet blue light-blue yellow orange green light-green
light-red red white` です。`font` に使える値は `draw sans serif mono` です。

## つまずきどころ {#pitfalls}

- **`store.listen` はコミットと同時ではなく、その次の tick で発火します。** 図形を書いてすぐに
  状態を読み、リスナーが動いた前提でいると、まだ動いていません。実機で確認しました。同じ
  ターン内で読むと発火回数は 0、`setTimeout` を 1 tick はさむと 1 になります。アプリが
  `editor.dispatch` は非同期だと注記しているのも同じ理由です。確認する前に 1 tick 待ってください。
- **グローバルではなく `ctx` です。** 入口は `export default function ({ editor,
  helpers, signal })` です。ドキュメントスクリプトに素の `editor` グローバルはありません。
  `createShapeId` / `toRichText` / `Vec` は `import ... from 'tldraw'` から取ります。
- **`text` ではなく `richText` です。** text / note / geo のラベルは `richText: toRichText(s)` を
  使います。
- **生のレコードには全 props が要り、`createShape` には要りません。** アプリ内では気にする
  props だけを渡します。手で組んだ `.tldraw` のスナップショットには一式（上の表）が必要です。
- **スクリプトは読み込みのたびに再実行されます。何度実行しても同じ結果になるように。**
  変わらない id と `createShapeIfMissing` を使わないと、内容が重複してユーザーの編集を潰します。
- **`signal` で後片付けを。** `store.listen` / `editor.on` / `setInterval` のすべてに
  `signal.addEventListener('abort', () => stop())` を付けます。signal は再実行の前と終了時に
  発火します。
- **スクリプトの書き込みを undo に混ぜない:** `editor.run(fn, { history: 'ignore' })`。
- **`editor.on('tick')` はウィンドウが隠れると止まります**（RAF のループだからです）。
  `setInterval` は動き続けますが、Electron がバックグラウンドで 1 秒に 1 回程度まで絞ります。
- **API には `server.json` の bearer トークンが必要です。** ポートは既定でないこともある
  （`server.listen(0)` が選びます）ので、`7236` を直書きせず必ずファイルを読んでください。
- **import できるのは `tldraw` / `react` / `react-dom` だけです。** Node のプロジェクトでは
  ありません。

## 検証 {#verification}

- **図形のスキーマ（オフライン・アプリ不要）:** `node scripts/validate_shapes.mjs` を実行すると、
  本物の tldraw スキーマを組み立てて note / text / frame を検証します。通れば `3/3` と出ます。
- **キャンバスのその場の編集:** `/exec` のあと、`/api/search` 経由で
  `api.getShapes(docId)`（`{ page, viewport, shapes }` が返ります）と
  `api.getBindings(docId)`（配列）を読み返します。期待した図形とバインディングがあるか確かめて
  ください。`api.getScreenshot(docId)`（`{ filePath, ... }` が返ります）で画像を取り、PNG/JPEG を
  `vision_analyze` で確認します。
- **永続スクリプトが反映されたか:** `GET /api/doc/:id/script-status`。成功は
  `state: "applied"` です（`currentDiskDigest === lastAppliedDigest === manifestSha256`、
  `pendingApply === false`、`lastApplyError === null`）。少し待ち直しても `"pending"` のままなら、
  成功したと言わずにその状態を報告してください。`"error"` は反映に失敗した状態なので、
  `errorLogPath` を読みます。
