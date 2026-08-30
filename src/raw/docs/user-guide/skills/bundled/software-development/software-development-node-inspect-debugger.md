---
title: "Node Inspect Debugger — --inspect と Chrome DevTools Protocol の CLI で Node.js をデバッグする"
description: "--inspect と Chrome DevTools Protocol の CLI で Node.js をデバッグする"
upstream_path: user-guide/skills/bundled/software-development/software-development-node-inspect-debugger.md
upstream_blob: 18580751bc58581f0e894caa7d2a4e2e8407b2fc
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/software-development/software-development-node-inspect-debugger
---

# Node Inspect Debugger {#node-inspect-debugger}

--inspect と Chrome DevTools Protocol の CLI で Node.js をデバッグします。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/software-development\node-inspect-debugger` |
| バージョン | `1.0.0` |
| 作者 | Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `debugging`, `nodejs`, `node-inspect`, `cdp`, `breakpoints`, `ui-tui` |
| 関連 skill | [`systematic-debugging`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-systematic-debugging/), [`python-debugpy`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-python-debugpy/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Node.js の Inspect デバッガ {#nodejs-inspect-debugger}

## 概要 {#overview}

`console.log` では足りないときに、Node に組み込みの V8 インスペクタをターミナルからプログラム的に動かします。本物のブレークポイント、ステップイン / オーバー / アウト、コールスタックの追跡、ローカル変数やクロージャのスコープの一覧、そして停止したフレームでの任意の式の評価ができます。

道具は2つあります。どちらかを選んでください。

- **`node inspect`** — 組み込みで、導入不要の CLI の REPL。ちょっと覗くのに向いています。
- **`ndb` / `chrome-remote-interface` 経由の CDP** — Node や Python からスクリプトで動かせます。多数のブレークポイントを自動で仕掛けたい、複数回の実行にまたがって状態を集めたい、エージェントのループから対話なしでデバッグしたい、といった場合に向いています。

**まずは `node inspect` を選んでください。** いつでも使えて、REPL の反応も速いです。

## こんなときに使います {#when-to-use}

- Node のテストが落ちて、途中の状態を見たいとき
- ui-tui が落ちる、または動きがおかしくて、描画前の React/Ink の状態を調べたいとき
- tui_gateway の子プロセス（`_SlashWorker`、PTY のブリッジ用ワーカー）の様子がおかしいとき
- クロージャの中の値を見たいが、`console.log` を差し込まないと届かないとき
- 性能: 動いているプロセスに接続して、CPU プロファイルやヒープスナップショットを取りたいとき

**使わない場面:** `console.log` で1分もかからず片づくこと。ブレークポイントを使うデバッグは手間が大きいので、それに見合う場面で使ってください。

## 早見表: `node inspect` の REPL {#quick-reference-node-inspect-repl}

最初の行で止めた状態で起動します。

```bash
node inspect path/to/script.js
# or with tsx
node --inspect-brk $(which tsx) path/to/script.ts
```

`debug>` のプロンプトでは次が使えます。

| コマンド | 動き |
|---|---|
| `c` または `cont` | 実行を続ける |
| `n` または `next` | ステップオーバー |
| `s` または `step` | ステップイン |
| `o` または `out` | ステップアウト |
| `pause` | 実行中のコードを止める |
| `sb('file.js', 42)` | file.js の 42 行目にブレークポイントを置く |
| `sb(42)` | 今のファイルの 42 行目にブレークポイントを置く |
| `sb('functionName')` | その関数が呼ばれたら止める |
| `cb('file.js', 42)` | ブレークポイントを消す |
| `breakpoints` | ブレークポイントを一覧する |
| `bt` | バックトレース（コールスタック） |
| `list(5)` | 今の位置の前後5行のソースを表示する |
| `watch('expr')` | 止まるたびに expr を評価する |
| `watchers` | 監視している式を表示する |
| `repl` | 今のスコープの REPL に入る（Ctrl+C で REPL を抜ける） |
| `exec expr` | 式を1回だけ評価する |
| `restart` | スクリプトを再起動する |
| `kill` | スクリプトを終了する |
| `.exit` | デバッガを終了する |

**`repl` のモードでは:** ローカル変数やクロージャの変数へのアクセスを含め、任意の JS の式を書けます。`Ctrl+C` で `debug>` に戻ります。

## 動いているプロセスに接続する {#attaching-to-a-running-process}

対象がすでに動いている場合（長く動かしている開発サーバーや TUI のゲートウェイなど）:

```bash
# 1. Send SIGUSR1 to enable the inspector on an existing process
kill -SIGUSR1 <pid>
# Node prints: Debugger listening on ws://127.0.0.1:9229/<uuid>

# 2. Attach the debugger CLI
node inspect -p <pid>
# or by URL
node inspect ws://127.0.0.1:9229/<uuid>
```

最初からインスペクタつきでプロセスを起動する場合:

```bash
node --inspect script.js           # listen on 127.0.0.1:9229, keep running
node --inspect-brk script.js       # listen AND pause on first line
node --inspect=0.0.0.0:9230 script.js   # custom host:port
```

tsx 経由の TypeScript の場合:

```bash
node --inspect-brk --import tsx script.ts
# or older tsx
node --inspect-brk -r tsx/cjs script.ts
```

## CDP をプログラムから使う（ターミナルから自動化する） {#programmatic-cdp-scripting-from-terminal}

自動化したいとき — ブレークポイントをたくさん仕掛ける、スコープの状態を集める、再現手順をスクリプトにする — には `chrome-remote-interface` を使います。

```bash
npm i -g chrome-remote-interface        # or project-local
# Start your target:
node --inspect-brk=9229 target.js &
```

動かす側のスクリプト（`/tmp/cdp-debug.js` として保存します）:

```javascript
const CDP = require('chrome-remote-interface');

(async () => {
  const client = await CDP({ port: 9229 });
  const { Debugger, Runtime } = client;

  Debugger.paused(async ({ callFrames, reason }) => {
    const top = callFrames[0];
    console.log(`PAUSED: ${reason} @ ${top.url}:${top.location.lineNumber + 1}`);

    // Walk scopes for locals
    for (const scope of top.scopeChain) {
      if (scope.type === 'local' || scope.type === 'closure') {
        const { result } = await Runtime.getProperties({
          objectId: scope.object.objectId,
          ownProperties: true,
        });
        for (const p of result) {
          console.log(`  ${scope.type}.${p.name} =`, p.value?.value ?? p.value?.description);
        }
      }
    }

    // Evaluate an expression in the paused frame
    const { result } = await Debugger.evaluateOnCallFrame({
      callFrameId: top.callFrameId,
      expression: 'typeof state !== "undefined" ? JSON.stringify(state) : "n/a"',
    });
    console.log('state =', result.value ?? result.description);

    await Debugger.resume();
  });

  await Runtime.enable();
  await Debugger.enable();

  // Set a breakpoint by URL regex + line
  await Debugger.setBreakpointByUrl({
    urlRegex: '.*app\\.tsx$',
    lineNumber: 119,       // 0-indexed
    columnNumber: 0,
  });

  await Runtime.runIfWaitingForDebugger();
})();
```

実行します。

```bash
node /tmp/cdp-debug.js
```

Hermes 固有の注意: `chrome-remote-interface` は `ui-tui/package.json` に入っていません。プロジェクトを汚したくない場合は、使い捨ての場所に入れてください。

```bash
mkdir -p /tmp/cdp-tools && cd /tmp/cdp-tools && npm i chrome-remote-interface
NODE_PATH=/tmp/cdp-tools/node_modules node /tmp/cdp-debug.js
```

## Hermes の ui-tui をデバッグする {#debugging-hermes-ui-tui}

TUI は Ink と tsx で作られています。よくあるのは次の2つの場面です。

### 開発中の Ink コンポーネント1つをデバッグする {#debugging-a-single-ink-component-under-dev}

`ui-tui/package.json` には `npm run dev`（tsx --watch）があります。tsx を直接動かして `--inspect-brk` を足します。

```bash
cd <hermes-agent-repo>/ui-tui
npm run build    # produce dist/ once so transpile isn't needed on first load
node --inspect-brk dist/entry.js
# In another terminal:
node inspect -p <node pid>
```

そのうえで `debug>` の中で:

```
sb('dist/app.js', 220)     # or wherever the suspect render is
cont
```

止まったら `repl` に入り、`props`、state の参照、`useInput` のハンドラの値などを調べます。

### 動いている `hermes --tui` をデバッグする {#debugging-a-running-hermes---tui}

TUI は Python の CLI から Node を起動します。いちばん簡単な手順は次のとおりです。

```bash
# 1. Launch TUI
hermes --tui &
TUI_PID=$(pgrep -f 'ui-tui/dist/entry' | head -1)

# 2. Enable inspector on that Node PID
kill -SIGUSR1 "$TUI_PID"

# 3. Find the WS URL
curl -s http://127.0.0.1:9229/json/list | jq -r '.[0].webSocketDebuggerUrl'

# 4. Attach
node inspect ws://127.0.0.1:9229/<uuid>
```

TUI をそのまま操作しても（その画面で入力しても）実行は進みます。デバッガ側は、`sb(...)` を置いたところでいつでも止められます。

### `_SlashWorker` と PTY の子プロセスをデバッグする {#debugging-slashworker-pty-child-processes}

これらは Node ではなく Python なので、`python-debugpy` の skill を使ってください。この skill が対象にするのは Node の部分だけです（Ink の UI、tui_gateway のクライアント、`ui-tui/` 配下の tsx で動くテスト）。

## デバッガの下で Vitest のテストを走らせる {#running-vitest-tests-under-the-debugger}

```bash
cd <hermes-agent-repo>/ui-tui
# Run a single test file paused on entry
node --inspect-brk ./node_modules/vitest/vitest.mjs run --no-file-parallelism src/app/foo.test.tsx
```

別のターミナルで `node inspect -p <pid>` を実行し、`sb('src/app/foo.tsx', 42)`、`cont` と進めます。

ワーカーが1つだけになるよう `--no-file-parallelism`（vitest）か `--runInBand`（jest）を使ってください。並列で動くものをデバッグするのは骨が折れます。

## ヒープスナップショットと CPU プロファイル（対話なし） {#heap-snapshots-cpu-profiles-non-interactive}

先ほどの CDP のスクリプトで、Debugger の代わりに `HeapProfiler` / `Profiler` を使います。

```javascript
// CPU profile for 5 seconds
await client.Profiler.enable();
await client.Profiler.start();
await new Promise(r => setTimeout(r, 5000));
const { profile } = await client.Profiler.stop();
require('fs').writeFileSync('/tmp/cpu.cpuprofile', JSON.stringify(profile));
// Open /tmp/cpu.cpuprofile in Chrome DevTools → Performance tab
```

```javascript
// Heap snapshot
await client.HeapProfiler.enable();
const chunks = [];
client.HeapProfiler.addHeapSnapshotChunk(({ chunk }) => chunks.push(chunk));
await client.HeapProfiler.takeHeapSnapshot({ reportProgress: false });
require('fs').writeFileSync('/tmp/heap.heapsnapshot', chunks.join(''));
```

## よくある落とし穴 {#common-pitfalls}

1. **TS のソースで行番号がずれる。** ブレークポイントが当たるのは `.ts` ではなく、生成された JS です。(a) ビルド後の `dist/*.js` で止めるか、(b) ソースマップを有効にして（`node --enable-source-maps`）`sb('src/app.tsx', N)` を使ってください。ただし後者は、ソースマップを追える CDP のクライアントでしか使えません。`node inspect` の CLI は追えません。

2. **`--inspect` と `--inspect-brk` の違い。** `--inspect` はインスペクタを起動するだけで止めないので、接続が遅れると最初のブレークポイントを通り過ぎてしまいます。コードが動き出す前にブレークポイントを置きたいときは `--inspect-brk` を使ってください。

3. **ポートの衝突。** 既定は `9229` です。複数の Node プロセスを調べている場合は `--inspect=0`（空きポートを自動で選ぶ）を渡し、実際の URL を `/json/list` から読み取ってください:
   ```bash
   curl -s http://127.0.0.1:9229/json/list   # lists all inspectable targets on the host
   ```

4. **子プロセス。** 親に `--inspect` を付けても、子は対象になりません。すべての子に広げるには `NODE_OPTIONS='--inspect-brk' node parent.js` を使います。その場合、子ごとに別のポートが必要になります（`NODE_OPTIONS='--inspect'` が引き継がれると、Node が番号を自動で繰り上げます）。

5. **止め忘れ。** 対象が止まったままの状態で `node inspect` を `Ctrl+C` で抜けると、対象は止まったままになります。先に `cont` するか、対象を明示的に `kill` してください。

6. **エージェントのターミナルから `node inspect` を動かす場合。** これは PTY 向けの REPL です。Hermes では `terminal(pty=true)` か、`background=true` と `process(action='submit', data='...')` の組み合わせで起動してください。PTY を使わない前面での実行は、単発のコマンドなら動きますが、対話的なステップ実行はできません。

7. **安全性。** `--inspect=0.0.0.0:9229` は任意のコードの実行を外部にさらします。隔離されたネットワークでない限り、必ず `127.0.0.1`（既定）に限定してください。

## 確認リスト {#verification-checklist}

デバッグの準備ができたら、次を確認します。

- [ ] `curl -s http://127.0.0.1:9229/json/list` が、意図した対象だけを返す
- [ ] 最初のブレークポイントが実際に当たる（当たらないなら、`--inspect-brk` を付け忘れたか、実行が終わったあとに接続した可能性が高いです）
- [ ] 停止時に表示されるソースが、正しいファイルである（食い違うならソースマップの問題です。落とし穴の1を参照）
- [ ] `repl` で `exec process.pid` を実行すると、接続したかった PID が返る

## 単発のレシピ {#one-shot-recipes}

**「なぜ X 行目でこの変数が undefined なのか」**
```bash
node --inspect-brk script.js &
node inspect -p $!
# debug>
sb('script.js', X)
cont
# paused. Now:
repl
> myVariable
> Object.keys(this)
```

**「この関数はどの経路から呼ばれているのか」**
```
debug> sb('suspectFn')
debug> cont
# paused on entry
debug> bt
```

**「この非同期の連鎖が止まる。どこで止まっているのか」**
```
# Start with --inspect (no -brk), let it run to the hang, then:
debug> pause
debug> bt
# Now you see the stuck frame
```
