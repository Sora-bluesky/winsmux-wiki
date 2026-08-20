---
title: "デスクトッププラグイン SDK（@hermes/plugin-sdk）"
description: "ネイティブの Hermes Desktop アプリを拡張します。ペイン、ページ、サイドバーのナビ、ステータスバー、パレットのコマンド、キー割り当て、テーマ、そしてプラグイン専用のバックエンド領域までを、import 1 行だけ、ビルドなしで扱えます。"
upstream_path: developer-guide/desktop-plugin-sdk.md
upstream_blob: 5a4c0dc4ed2a9a82739cf30b8325cc793c459d35
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/desktop-plugin-sdk
---

# デスクトッププラグイン SDK {#desktop-plugin-sdk}

ネイティブの [Hermes Desktop](/hermes/docs/user-guide/desktop/) アプリは、あらゆる部品が「寄与」として登録される作りになっています。ウィンドウの中に見えるもの、つまりペイン、ルート、サイドバーのナビ、ステータスバーの表示、パレットの項目、キー割り当て、テーマは、すべて 1 つの中央レジストリに登録されます。アプリ本体も、プラグインとまったく同じやり方で自分の部品を登録しています。だからプラグインの仕組みは後付けの飾りではなく、本物です。

**デスクトッププラグイン**とは、`HermesPlugin` を default export する ESM ファイル 1 つのことです。読み込むモジュールは `@hermes/plugin-sdk` の 1 つだけで、それだけで必要なものが全部手に入ります。アプリの生きた状態、ゲートウェイの JSON-RPC の入口、プラグイン専用の REST / ソケットの領域、React Query、そしてアプリ自身の UI キットです。UI キットのおかげで、プラグインの見た目は最初からアプリになじみます。リポジトリを clone する必要も、`npm run build` する必要も、アプリのソースに手を入れる必要もありません。`$HERMES_HOME/desktop-plugins/<id>/plugin.js` にファイルを置けば、アプリが数秒で読み込み、以降は保存するたびにその場で反映します。

:::warning これはウェブダッシュボードのプラグイン SDK ではありません
Hermes では「プラグイン」という言葉がいくつかの別ものを指します。このページで扱うのは**ネイティブのデスクトップアプリ**（`hermes desktop`）の SDK、つまり `@hermes/plugin-sdk` モジュールと `$HERMES_HOME/desktop-plugins/` です。**ウェブダッシュボード**（`hermes dashboard`）には、`window.__HERMES_PLUGIN_SDK__` と `manifest.json` を使うまったく別のプラグインの仕組みがあり、[ダッシュボードを拡張する](/hermes/docs/user-guide/features/extending-the-dashboard/) で説明しています。Python の CLI / ゲートウェイ向けプラグインは [Hermes プラグインを作る](/hermes/docs/developer-guide/plugins/) にあります。3 つはコードも API も配り方も共有していません。デスクトップとダッシュボードの SDK で共通なのは、バックエンドの `plugin_api.py` の領域（`/api/plugins/<id>`）だけです。
:::

## 全体像 {#mental-model}

この SDK は VS Code のモジュールの考え方をなぞっています。プラグインの作者が読み込むモジュールはきっちり 1 つで、アプリの内部には一切触れません（同梱プラグインでは lint が遮り、ディスクに置いたプラグインでは解決に失敗します）。できることは段階に分かれています。

- **`host.state.*`** — アプリの生きた状態（nanostore の atom）を読み取り専用で覗く窓です。現在のセッション、セッションごとのターン実行中フラグ、cwd、ゲートウェイのソケットの状態、モデル、プロファイル、ビューポート。`gateway` はあくまで WebSocket の状態で、ターンの実行中かどうかではありません。
- **`host.*` のアクション** — 安全だと確認された動詞だけを揃えたものです。トースト表示、画面遷移、ログの追尾、ゲートウェイの再起動、ゲートウェイのイベント購読。
- **`host.request`** — ゲートウェイの JSON-RPC の入口です。セッション、設定、スキル、cron など、アプリ自身が呼んでいるものがすべて通ります。
- **`ctx.rest` / `ctx.socket`** — `plugin_api.py` を同梱していれば使える、プラグイン専用のバックエンド領域（`/api/plugins/<id>`）です。
- **`ui.*`** — 見た目の言語です。アプリが実際に使っているコンポーネント、テーマ変数、アイコン、書式整形が入っているので、UI がアプリと 1 ピクセル単位でそろいます。

## 2 つの届け方 {#two-delivery-modes}

| 方式 | 置き場所 | 誰が書くか | ビルド |
|------|-------|-----|------------|
| **ディスク**（おすすめ） | `$HERMES_HOME/desktop-plugins/<id>/plugin.js` | 利用者、エージェント | 不要 — 素の ESM をそのまま読み込みます |
| **ひとまとめのパッケージ** | `$HERMES_HOME/plugins/<id>/desktop/plugin.js` | エージェント側のコードも一緒に配るプラグイン | 不要 — ディスク方式と同じ経路です |
| **同梱** | `apps/desktop/src/plugins/<id>/plugin.tsx` | ツリー内、アプリと一緒に配られるもの | アプリ自身の Vite ビルド |

3 つとも同じ `HermesPlugin` の約束事に従い、**設定 → プラグイン**に並び、その場で有効・無効を切り替えられます。ひとまとめのパッケージは、エージェント用プラグインのフォルダの中をディスク方式の入口が覗きに行くだけのものです。[1 つのパッケージで両方の SDK](#one-package-both-sdks) を参照してください。このページの内容はすべてディスク方式（あなたやエージェントが書くもの）を前提に書いてあり、[同梱プラグイン](#bundled-plugins) に 2 点だけ違いを記しています。今のところ中核のツリーにデスクトッププラグインは 1 つも入っていません。手本になるデモは、別リポジトリの [`hermes-example-plugins`](https://github.com/NousResearch/hermes-example-plugins) にあります。

## 手早く試す — 最初のプラグイン {#quick-start-your-first-plugin}

`$HERMES_HOME/desktop-plugins/hello/plugin.js` を作ります（既定では `~/.hermes/...`、名前付きプロファイルなら `~/.hermes/profiles/<name>/...` です）。フォルダ名はプラグインの `id` と同じでなければいけません。

```javascript
// ~/.hermes/desktop-plugins/hello/plugin.js

function HelloPane() {
  const gateway = useValue(host.state.gateway)

  return jsxs('div', {
    className: 'flex h-full flex-col gap-2 p-3 text-sm',
    children: [
      jsx('div', { className: 'font-medium', children: 'Hello, Hermes' }),
      jsx('div', {
        className: 'text-(--ui-text-tertiary)',
        children: `gateway: ${gateway}`
      })
    ]
  })
}

export default {
  id: 'hello', // must match the folder name
  name: 'Hello',
  register(ctx) {
    ctx.register({
      id: 'pane',
      area: 'panes',
      title: 'hello',
      data: { placement: 'right', width: '260px' },
      render: () => jsx(HelloPane, {})
    })
    ctx.register({
      id: 'chip',
      area: 'statusBar.right',
      order: 130,
      render: () =>
        jsx('button', {
          type: 'button',
          className: 'px-1.5 text-[0.6875rem] text-(--ui-text-tertiary)',
          onClick: () => {
            haptic('tap')
            host.notify({ kind: 'info', message: 'Hello from my plugin!' })
          },
          children: 'hello'
        })
    })
  }
}
```

保存してください。アプリは `desktop-plugins/` を見張っていて、数秒でファイルを読み込みます。それ以降は保存するたびにその場で反映されます。出てこないときは ⌘K から **Reload desktop plugins** を実行してください。読み込みに失敗した場合はトーストが原因を教えてくれるので、直して保存し直します。

:::note JSX もビルドも使いません
ディスク上のファイルは**そのまま**読み込まれるので、JSX の書き方では構文解析できません。UI は `react/jsx-runtime` の `jsx()` / `jsxs()`（あるいは `React.createElement`）で書いてください。import できるのは `@hermes/plugin-sdk`、`react`、`react/jsx-runtime` の 3 つだけで、それ以外はわざと解決に失敗するようになっています。
:::

## プラグインの約束事 {#the-plugin-contract}

プラグインは `HermesPlugin` を default export します。

```ts
interface HermesPlugin {
  /** Stable slug — becomes the `plugin:<id>` source and the id namespace. */
  id: string
  /** Human name for Settings / about UI. Defaults to `id`. */
  name?: string
  /** Registers on load when the user hasn't chosen (default true). Set false
   *  for opt-in plugins: they inventory in Settings ▸ Plugins, off until the
   *  user flips the switch. */
  defaultEnabled?: boolean
  /** Called once at load; wire contributions through `ctx`. */
  register: (ctx: PluginContext) => void
}
```

`register` が受け取る `PluginContext` は、そのプラグイン専用に**閉じられた**ものです。レジストリを直接触ることはありません。出どころ（`source: 'plugin:<id>'`）が自動で付き、寄与の id にも名前空間（`<id>:<localId>`）が付くので、2 つのプラグインがぶつかることはあり得ません。

```ts
interface PluginContext {
  /** Resolved source tag, e.g. `'plugin:hello'`. */
  readonly source: string
  /** Register one contribution (id namespaced, source stamped). Returns a disposer. */
  register: (c: PluginContribution) => () => void
  /** Register several at once; the returned disposer removes all of them. */
  registerMany: (cs: PluginContribution[]) => () => void
  /** REST to this plugin's own backend namespace (`/api/plugins/<id>`). */
  rest: <T>(path: string, opts?: PluginRestOptions) => Promise<T>
  /** Live WebSocket to this plugin's own namespace. Returns a disposer. */
  socket: (path: string, onMessage: (data: unknown) => void) => () => void
  /** The curated OS door: native notification, open-external, reveal-in-file-manager, clipboard. */
  os: PluginOs
  /** Plugin-scoped JSON persistence (keys live under `hermes.plugin.<id>.`). */
  storage: PluginStorage
}
```

**寄与**は、どの部品も共通で使うただ 1 つの基本単位です。

```ts
interface Contribution {
  id: string          // you write the local id; the host namespaces it
  area: string        // WHERE it goes (a contribution-area constant)
  title?: string
  order?: number      // sort within the area (lower = earlier)
  when?: () => boolean // dynamic visibility; re-evaluated by the area
  enabled?: boolean
  render?: () => ReactNode  // the component to mount
  data?: unknown      // area-specific payload (see the cookbook)
}
```

`render` と `data` のどちらか、あるいは両方を、置き場所に応じて渡します。

## 寄与できる場所 — 実例集 {#contribution-areas-the-cookbook}

場所を表す定数は SDK から import します。場所ごとに `data` の中身が決まっています。

| 部品 | `area` | 渡すもの |
|---------|--------|-------------|
| レイアウトのペイン | `PANES_AREA`（`'panes'`） | `title` + `render` + `data: { placement, dock?, width?, height? }` |
| 全面ページ | `ROUTES_AREA` | `data: { path }` + `render` |
| サイドバーのナビ | `SIDEBAR_NAV_AREA` | `data: { path, label, codicon }` |
| ステータスバー | `STATUSBAR_AREAS.left` / `.right` | `render`（または `StatusbarItem` としての `data`） |
| タイトルバー | `TITLEBAR_AREAS.left` / `.center` / `.right` | `TitlebarTool` としての `data`、または表示中だけ有効な `<Contribute>` |
| ⌘K パレット | `PALETTE_AREA` | `data: PaletteContribution` |
| キー割り当て | `KEYBINDS_AREA` | `data: KeybindContribution` |
| テーマ | `THEMES_AREA` | `DesktopTheme` としての `data` |
| 入力欄まわり | `COMPOSER_AREAS.*` | 描画スロット、あるいは中間処理・添付の提供元 |

### ペイン {#panes}

ペインはレイアウトの木に置かれるタイルです。`placement` はその役割を表すもので、ペインは同じ役割の既存のペインとタブとして重なります。あとから利用者が好きな位置へドラッグできます。

```javascript
ctx.register({
  id: 'pane',
  area: 'panes',
  title: 'my pane',
  data: { placement: 'right', width: '260px' },
  render: () => jsx(MyPane, {})
})
```

`placement` に指定できるのは `'main' | 'left' | 'right' | 'top' | 'bottom'` です。重ねるのではなく特定の**辺**に置きたいときは、`dock` の指定を足します。ペインのドロップ用のつまみにドラッグするのと同じ操作にあたります。

```javascript
// Below the conversation, 200px tall.
data: {
  placement: 'bottom',
  dock: { pane: 'workspace', pos: 'bottom' },
  height: '200px'
}
```

`dock.pane` には任意のペイン id を指定します（`workspace` は会話の本体で、ほかに `sessions`、`terminal`、`files`、`review`、`logs` があります）。`dock.pos` は `'top' | 'bottom' | 'left' | 'right' | 'center'` です。ペインがその区画の半分を占めてしまわないよう、`width` か `height` を宣言しておいてください。

プラグインが出しているペインが 1 つだけのとき、それを閉じるとプラグイン自体が無効になります。**設定 → プラグイン**から戻せます。複数のペインを出しているプラグインなら、1 つ閉じてもそのペインが消えるだけで、残りのペインもコマンドも中間処理も動いたままです。**レイアウトをリセット**すると、閉じた寄与ペインが元に戻ります。

### ページとサイドバーのナビ {#pages-and-sidebar-nav}

ルートは、組み込みの画面と同じようにワークスペースのペインへ全面のページを表示します。サイドバーのナビの行（やパレットのコマンド）と組み合わせて、たどり着けるようにしてください。

```javascript

ctx.registerMany([
  {
    id: 'page',
    area: ROUTES_AREA,
    data: { path: '/my-page' },
    render: () => jsx(MyPage, {})
  },
  {
    id: 'nav',
    area: SIDEBAR_NAV_AREA,
    data: { path: '/my-page', label: 'My Page', codicon: 'project' }
  }
])
```

`codicon` は [VS Code の codicon](https://microsoft.github.io/vscode-codicons/dist/codicon.html) の id です。どこからでも `host.navigate('/my-page')` でそのルートへ移動できます。

### ステータスバーとタイトルバー {#status-bar-and-title-bar}

ステータスバーの項目は、画面下のバーの左右どちらかのまとまりに表示されます。いちばん手軽なのは `render` 関数を渡す形です。ただのボタンなら `StatusbarItem` としての `data`（`{ id, label?, icon?, detail?, variant?, menuItems?, … }`）で済みます。

```javascript

ctx.register({
  id: 'count',
  area: STATUSBAR_AREAS.right,
  order: 120,
  render: () => jsx(MyStatus, {})
})
```

タイトルバーの道具は `TITLEBAR_AREAS.left | .center | .right` に `TitlebarTool` の data（`{ id, label, icon, active?, onSelect? }`）として置きます。

### パレットのコマンドとキー割り当て {#palette-commands-and-keybinds}

```javascript

ctx.registerMany([
  {
    id: 'open',
    area: PALETTE_AREA,
    data: {
      id: 'my-page.open',
      label: 'Open My Page',
      keywords: ['my', 'page'],
      run: () => host.navigate('/my-page')
    }
  },
  {
    id: 'refresh',
    area: KEYBINDS_AREA,
    data: {
      id: 'my-page.refresh',
      label: 'Refresh My Page',
      category: 'My Plugin',
      defaults: ['mod+shift+r'],
      run: () => void doRefresh()
    }
  }
])
```

キー割り当ては設定画面から利用者が変更できます。`defaults` は最初の割り当てにすぎません。

### テーマ {#themes}

テーマの寄与は、`data` として `DesktopTheme` 一式（名前、ラベル、色など）を渡します。組み込みのテーマと同じようにテーマの選択肢に並びます。

```javascript

ctx.register({ id: 'noir', area: THEMES_AREA, data: myDesktopTheme })
```

### 入力欄の拡張 {#composer-extensions}

`COMPOSER_AREAS`（`top`、`bottom`、`leading`、`actions`、`attachments`、`middleware`）を使うと、メッセージの入力欄のまわりに操作を足したり、添付の取得元を提供したり、送信前に下書きを加工したり（`handler(draft) => draft | null` を持つ `ComposerMiddleware`）できます。

### 会話中の指示子 — モデルが名指しできる埋め込み部品 {#transcript-directives-inline-components-the-model-addresses}

`TRANSCRIPT_DIRECTIVE_AREA` は、会話の表示そのものを寄与できる場所にします。名前付きの指示子を登録しておくと、エージェントは `::name{key="value"}` という形の段落を書くだけで、アシスタントのメッセージの中にあなたのコンポーネントを描画できます。

```javascript

ctx.register({
  id: 'task-card',
  area: TRANSCRIPT_DIRECTIVE_AREA,
  data: {
    name: 'task', // the model writes ::task{id="BB-12"}
    render: ({ attrs, streaming }) => jsx(TaskCard, { taskId: attrs.id, streaming })
  }
})
```

この場所を安全に保つため、ホスト側が次の決まりを守らせます。

- 指示子は**段落まるごと**でなければいけません。文の途中に出てくる `::name` はただの文として扱われるので、プラグインのコンポーネントが本文を乗っ取ることはできません。
- 属性は**モデルが出力した信用できない文字列**です（`key="value"` の組で、値は必ず文字列）。自分のフィールドは自分で検証し、おかしな値なら推測せず何も描かないでください。
- 誰も**引き取っていない**指示子（その名前でプラグインが登録されていないもの）は、もとどおりただの段落として表示されます。プラグインを切っていても何も壊れません。
- 描画は寄与ごとのエラー境界に包まれています。例外が出ても、その場に小さなエラー表示が出るだけで、メッセージ全体が死ぬことはありません。
- 名前がぶつかったときは先に登録したほうが勝ちます。冒険的な名前には自分のスラッグを付けてください（`board` ではなく `myplugin-board`）。

アプリ本体も手本として指示子を 1 つ持っています。`::preview{file="…"}` は、ワークスペースの HTML ファイルを**メッセージの中でそのまま**表示します。中身は隔離された `srcdoc` の iframe で、生成元は不透明です（スクリプトは動き、部品としてきちんと操作できますが、アプリやそのデータや橋渡しには手が届きません）。枠は中身に合わせて大きさを決め（高さは動きに追従し、幅は中身の本来の広がりを取り、メッセージの流れの中で左に寄ります）、先頭に差し込まれるテーマの記述がアプリの色（`--foreground`、`--muted-foreground`、`--accent`、`--border`、`--card`）、アプリのフォント、そして透明な背景をその文書に渡します。おかげで、部品らしい HTML はアプリの一部のように見え、ページまるごとのものは自分のデザインを保てます。HTML 以外の対象や、離れた場所のゲートウェイでは、従来のプレビューのカードに戻ります。自分の指示子のことは、スキルに書いてエージェントに教えてください（そうやって書き方を覚えます）。

表示された部品は**話しかけ返す**こともできます。枠の中で `window.hermes.send('get-price eth')` を呼ぶか、書くだけで済む `<button data-hermes-send="get-price eth">` を置くと、その文がユーザーの発言としてエージェントに渡ります。画面の外での出来事なので、会話に吹き出しが増えることはなく、部品が更新されること自体が目に見える返事になります。それでもこのターンは本物です。エージェントを動かし、入力欄の割り込み・順番待ちの規則にも従い、`hidden` という種別で保存されるので、再開してもセッションのデータベースにも記録が丸ごと残ります。渡す文は前後の空白が落とされ、500 文字までに切られ、1 つの枠につき毎秒 1 回までに抑えられます。

### 表示中だけ生きる部品（`Contribute`） {#mount-scoped-chrome-contribute}

`ctx.register` は**ずっと残る**寄与のためのものです。すでに画面に出ているコンポーネントと生死をともにしてほしい部品（そのページ専用のタイトルバーの操作は、ページが消えたら一緒に消えてほしい）は、代わりにその中で `<Contribute>` を描画してください。

```javascript

jsx(Contribute, {
  area: TITLEBAR_AREAS.center,
  id: 'my-page:switcher', // namespace with your slug
  children: jsx(MySwitcher, {})
})
```

表示されたときに登録し、消えたときに自動で片付けます。

## ホスト API {#host-api}

`host` にあるものは、プラグインのどこからでも呼べます。状態の atom は読み取り専用で、ハンドラの中では `.get()` で読み、コンポーネントでは `useValue(atom)` で購読します。

```ts
host.state.activeSessionId  // ReadableAtom<string | null>
host.state.awaitingResponse // ReadableAtom<boolean>  true until the first assistant payload
host.state.busy             // ReadableAtom<boolean>  focused chat is working after a send
host.state.busyBySession    // ReadableAtom<Record<string, boolean>>  runtime id → mid-turn
host.state.focusedSessionId // ReadableAtom<string | null>  (runtime id of the FOCUSED session — tile-aware; prefer for session.* RPC)
host.state.focusedSessionProfile // ReadableAtom<string>  (owner profile of the focused chat — prefer over `profile` for per-bot/profile readouts)
host.state.focusedStoredSessionId // ReadableAtom<string | null>  (durable id — navigation / session-list matching)
host.state.focusedUsage     // ReadableAtom<UsageStats | null>  (live streamed usage of the focused session, no RPC needed)
host.state.cwd              // ReadableAtom<string>
host.state.gateway          // ReadableAtom<string>  socket state ('idle' | 'connecting' | 'open' | …)
host.state.model            // ReadableAtom<string>
host.state.profile          // ReadableAtom<string>
host.state.viewport         // ReadableAtom<{ width, height, narrow }>
```

`host.state.gateway` は WebSocket の接続の状態であって、会話のターンが走っているかどうかではありません。ソケットが `open` のままターンの途中ということもあれば、同じときに別のセッションが何もしていないこともあります。入力欄やプラグインの操作を止めるかどうかは、**注目しているセッション**のターン実行中フラグ（`host.state.busyBySession[sessionId]`、またはそのセッションの `view.$busy`）で決めてください。`gateway` で決めてはいけませんし、プロセス全体で 1 つの実行中フラグを使うのも避けてください。

```ts
host.notify({ kind, message, title?, detail?, action? })  // toast; returns id
host.notifyError(error, fallbackMessage)                   // toast an error
ctx.os.notify({ title, body?, silent?, icon?, activate?, onActivate?, actions? })
                                           // native OS notification (attributed to your plugin)
ctx.os.openExternal(url)                   // OS default handler (browser, mail, spotify:) → Promise<boolean>
ctx.os.revealPath(path)                    // reveal in Finder / Explorer → Promise<boolean>
ctx.os.writeClipboard(text)                // system clipboard → Promise<boolean>
host.navigate('/route')                    // hash-route navigation
host.openSession(id, { profile?, intent? }) // open a stored session core-style;
                                           //   profile: soft-swap to that profile's backend first
                                           //   intent: 'in-place' (default) | 'stack' | 'tab' | 'window'
host.newChat(profile?)                     // fresh chat draft, optionally in another profile
host.openWorkspace(id, { render, title?, minWidth?, onClose? })
                                           // dock a plugin-rendered tab into the MAIN
                                           //   workspace zone and reveal it; returns a disposer
host.paneVisibility(paneId)                // ReadableAtom<boolean> — is a contributed pane
                                           //   actually on screen (its zone's active tab)?
host.onEvent(type, fn)                     // gateway event stream ('*' = all); returns disposer
host.logs(...)                             // tail an app log file
host.status()                              // one-shot system status snapshot
host.restartGateway()                      // restart the backend gateway
host.profileRoutes()                       // [{ profile, targetProfile, connectionId, mode }]
host.requestProfile<T>(route, method, params?)   // registry-routed RPC; no foreground swap
host.requestProfile<T>(profile, method, params?) // legacy v1/local overload
host.request<T>(method, params?)           // active-gateway JSON-RPC — the real power
```

`host.request` は、アプリ自身が使っているのと同じ JSON-RPC です（セッション、設定、スキル、cron、かんばん、など）。`host.requestProfile` は `host.profileRoutes()` が返した情報を受け取り、その RPC を対応するレジストリの供給元とプロファイルへ正確に流します。今表示している会話やゲートウェイを切り替えることはありません。プロファイル名だけを渡す形は、ローカル 1 つだけという古い構成のために残してあるものです。レジストリを意識したプラグインは、同じプロファイル名を持つ供給元が 2 つあってもぶつからないよう、必ず情報のほうを渡してください。

`host.openWorkspace(id, { render, title?, minWidth?, onClose? })` は、プラグインが描いた画面を**ワークスペースの主区画**、つまりセッションのタイルやプレビューが使う中央の領域にタブとして差し込み、前面に出します。同じ `id` でもう一度呼ぶと、新しいタブを作らずに中身をその場で差し替えてタブを前に出します。タブを閉じると（タブの閉じるボタンか ⌘W）登録が解除され、`onClose` が呼ばれます。返ってくる後始末の関数を呼べばプログラムからも閉じられます。この関数があるか（`typeof host.openWorkspace === 'function'`）を確かめて、古いデスクトップでは普通の寄与ペインに切り替えてください。Bot Mode のグループチャットの部屋が手本です（使えるときは主画面を占有し、そうでなければパネル内の表示になります）。

`host.paneVisibility(paneId)` は、寄与したペインが実際に画面に出ている間だけ `true` になる読み取り専用の atom を返します。レイアウトの木にあり、閉じられても隠されてもおらず、その区画が最小化されておらず、区画の中で選ばれているタブになっている状態です（その区画に 1 つしかないペインも該当します）。id は寄与としてのペイン id、`<pluginId>:<paneId>` です。atom は id ごとに使い回されるので、描画の中で呼んでも問題ありません。自分のペインが見えている間だけ相棒の UI を登録する、といった使い方ができます。Bot Mode の Cronjobs のペインが手本で、Bots のペインがサイドバーのタブを持っている間だけ登録し、利用者が Sessions に戻ると登録を外します。古いデスクトップ向けに `typeof host.paneVisibility === 'function'` で存在を確かめ、なければ常に登録したままにしてください。

`host.profileRoutes()` は、今の接続レジストリに登録されている供給元をすべて洗い出します。必要になってからつなぐ SSH の供給元は、トンネルを開かなくても資格情報なしの `default` の経路を見せるので、プラグインが最初の呼び出し役になれます。SSH の `remoteProfile` は、その経路のバックエンド側 `targetProfile` として残ります。`connectionId` はレジストリ上の経路の識別子で、キーや保存に使うときは `profile` と組み合わせてください。接続先、トークン、SSH のホストや鍵といった生の接続情報が、プラグインとの境界を越えて渡ることはありません。`profile` は要求を出すときに使う供給元の中での経路名、`targetProfile` はその経路が実際につながっている Hermes 側のプロファイルです。経路が明示的に別のプロファイルへ割り当てられている場合（たとえば SSH の `remoteProfile` による上書きや、古いプロファイル別 URL の別名）に、この 2 つは食い違います。この区別のおかげで、接続の秘密を出さずにバックエンド側の身元を保てます。

プロファイルを扱うプラグイン向けの専用メソッドもあります。`profiles.list` は各プロファイルと、その直近の会話を `last_session` として返します（`include_sessions: false` を渡せばプロファイルごとのデータベース参照を省けます。`preferred_session_ids: { profileName: sessionId }` を渡すと、プロファイルごとに 1 つ固定したセッションを、存在確認込みで正確に引けます。指定した行には `preferred_session` の要約が付き、隠れた行や圧縮でつながった系譜は生きている先端まで解決されます。もう完全に無いものは `null` になります。古いゲートウェイはこの引数を無視し、このフィールドも返しません）。`profiles.create` は `name`、`description`、`clone_from`、`clone_all`、`no_skills`、`soul`、任意の `model` と `provider` の固定を受け取ります。どちらも、ダッシュボードの `/api/profiles` という REST の経路の WebSocket 版です。

`host.state.busy` は、注目している会話が今まさに動いているか（考え中と、文字を返している最中）を表します。`host.state.awaitingResponse` は、送信してからアシスタントの最初の応答が届くまで true のままです。どちらも利用者が実際に見ている会話に追従します。フォーカスを持つセッションのタイルがあればそれ、なければワークスペースの主たる会話です（ステータスバーの動作中の脈打ちが読んでいるのと同じ信号です）。コンポーネントの中ではこう購読します。

```javascript
const busy = useValue(host.state.busy)
```

トークン単位の細かい様子が要るときは、`host.onEvent` で `message.start`、`message.delta`、`message.complete` を聞いてください。

`host.onEvent` は、ゲートウェイのイベント（メッセージの差分、セッションの一生、ツールの動き）をそのまま流します。購読の処理は互いに切り離されていて、あなたの処理が例外を投げてもアプリ側の配送には影響しません。`host` の入口はどれも非同期として安全です。内部の補助処理が同期的に例外を投げた場合（たとえばただのブラウザでデスクトップの橋渡しが無いとき）も、それは `.catch()` で受け取れる rejection になり、エラー境界でアプリが落ちることはありません。

`ctx.os` は、OS へつながる入口をまとめたものです。プラグインがアプリのウィンドウの外へ手を伸ばす手段が、あなたのプラグイン名義で 1 か所に揃っています。`ctx.os.notify` は **OS のネイティブな通知**を出します。アプリ自身の承認待ちやターン終了の知らせと同じ Electron の経路です。これが鳴るのは利用者が Hermes から離れているとき（背面にあるか、フォーカスが無いとき）だけです。画面を見ているときにアプリ内のトーストを出したいなら `host.notify` を使ってください。利用者は端末ごとに、設定 ▸ 通知 ▸ 「Plugin notifications」で黙らせることができ、同じプラグインからの連発は抑えられます。ですから、本当に知らせる価値のある出来事のための信号として扱ってください。ログ代わりにはしないことです。

見せ方と押したときの動き（もともとの `ctx.os` の入口を広げたもの）は次のとおりです。

```ts
ctx.os.notify({
  title: 'New match found',
  body: 'Someone matched your signal',
  icon: '/abs/path/to/icon.png', // Electron Notification icon
  // Body click → focus Hermes + navigate. Same vocabulary as OS deep links:
  activate: 'hermes://index-network/intent/1',
  // or: activate: '/index-network/intent/1'
  // or: activate: { path: '/index-network/intent/1' }
  onActivate: () => focusLocalState('1'), // optional renderer callback
  actions: [
    { id: 'open', label: 'Open', activate: 'hermes://index-network/intent/1' },
    { id: 'dismiss', label: 'Dismiss', onAction: () => dismiss('1') },
  ],
})
```

`activate` はディープリンクと同じ書き方です。`hermes://index-network/intent/1` と、ハッシュのパス `/index-network/intent/1` は、アプリ内の同じルートに解決されます（同じ `hermes://…` の URL は、OS のディープリンクとしても働きます）。操作ボタンが出るのは署名済みの macOS のビルドだけで、それ以外の環境でも本文のクリックは効きます。画面が移動するのは利用者が押したときだけで、裏で起きたイベントだけで動くことはありません。

残りの入口（`openExternal`、`revealPath`、`writeClipboard`）は、その機能が使えないとき（古いデスクトップの外殻、ただのブラウザ）に例外ではなく `false` を返します。橋渡しの有無を探るのではなく、返り値で分岐してください。

## データの扱い — React Query と nanostores {#data-layer-react-query-nanostores}

プラグインはアプリと同じ `QueryClient` を共有します。ですからプラグインの問い合わせも、アプリ本体の画面とまったく同じようにキャッシュされ、重複が省かれ、定期的に取り直され、無効化されます。取得のループを自作しないでください。

```javascript

function MyPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-plugin', 'items'],
    queryFn: () => host.request('my.list', {})
  })
  // …
}
```

きっかけの部品とパネルの間で共有する状態（あるいは定期取得のループ）には、`atom` / `computed` を使ってください。`host.state` が使っているのと同じ道具です。購読するのは、その値を実際に描く末端のコンポーネントだけにして、`useValue` を使います。React の**外側**から問い合わせを無効化したいとき（たとえば `ctx.socket` のフレームが届いたとき）は、共有の `queryClient` を import します。

```javascript

ctx.socket('/events', () => {
  queryClient.invalidateQueries({ queryKey: ['my-plugin', 'items'] })
})
```

## UI キットとテーマ {#the-ui-kit-and-theming}

アプリが実際に使っているコンポーネントをそのまま import すれば、UI は最初からアプリになじみます。

> `Button`、`Input`、`Textarea`、`Select*`、`Switch`、`Checkbox`、
> `SegmentedControl`、`Tabs*`、`Dialog*`、`ConfirmDialog`、`DropdownMenu*`、
> `ContextMenu*`、`Popover*`、`Tip`/`Tooltip*`、`Badge`、`Kbd`/`KbdGroup`、
> `SearchField`、`ScrollArea`、`Separator`、`Skeleton`、`GlyphSpinner`、`Loader`、
> `EmptyState`、`ErrorState`、`CopyButton`、`StatusDot`、`LogView`、`Codicon`、
> `DecodeText`。

補助的なものもあります。`cn`（クラスの結合）、`icons.*`（アプリで使っている lucide のアイコン）、`haptic`、`profileColor` / `profileColorSoft`（同じ相手には必ず同じ色が付きます）、時刻の書式整形の `relativeTime` / `fmtDateTime` / `fmtDayTime` / `coarseElapsed`、`useI18n`（各言語の文言。プラグインも翻訳できるようになります）、そして `evaluateRuntimeReadiness` です。

**色は直接書かず、テーマ変数で指定してください。** ペインはすでにアプリのエディタの背景の上に乗っているので、背景はそのままにして、それ以外を変数で指定します。`var(--ui-text-secondary)`、`var(--ui-text-tertiary)`、`var(--ui-text-quaternary)`、`var(--ui-stroke-secondary)`、`var(--ui-accent)` などです。canvas に描くときは、`getComputedStyle(canvas).getPropertyValue('--ui-accent')` で一度だけ値を取り出してください。これが、テーマを変えるたびにプラグインの見た目も自動で追従する理由です。

## プラグイン用のバックエンド {#a-backend-for-your-plugin}

サーバ側の処理が必要なら、Python の `plugin_api.py` を同梱して `ctx.rest` / `ctx.socket` から呼んでください。作りからしてプラグインごとに**閉じた**領域になっています。

### 1 つのパッケージで両方の SDK {#one-package-both-sdks}

デスクトップの UI **と**エージェント側のコード（Python のプラグイン、そのバックエンドの経路、スキル）の両方が要る機能でも、互いに依存する 2 つのインストール物に分ける必要はありません。デスクトップアプリは、通常のエージェント用プラグインの置き場所である `$HERMES_HOME/plugins/<id>/` も見に行って、そこに `desktop/plugin.js` があれば、単体のディスク方式とまったく同じ経路で読み込みます（保存のたびに反映されるのも同じです）。

```
~/.hermes/plugins/<id>/           # ONE installable folder
├── plugin.yaml                   # the agent half: tools, hooks, commands
├── skills/…
├── dashboard/
│   ├── manifest.json             # { "name": "<id>", "api": "plugin_api.py" }
│   └── plugin_api.py             # backend routes → /api/plugins/<id>/
└── desktop/
    └── plugin.js                 # the desktop half: panes, commands, ctx.rest
```

`desktop/plugin.js` の側は、ごく普通のディスクプラグインです。約束事も、import できるものも、隣に置いた `plugin_api.py` へ届く `ctx.rest('/…')` も同じです。インストールも、人に渡すのも、消すのも、フォルダ 1 つで済みます。

有効化のスイッチが 2 つあるのはわざとで、どちらも既定は**オフ**です。デスクトップ側は入れただけでは動かず、**設定 → プラグイン**に並ぶものの、利用者が切り替えるまで無効のままです。これは Python 側が `config.yaml` の `plugins.enabled` で守られているのと揃えたものです（安全の線引きについては後述します）。`~/.hermes/plugins` にパッケージを置いただけでは、どこでも何も動きません。利用者がそう言うまでは動かないのです。バックエンド側が無効なときも、デスクトップ側は静かに縮退します。`ctx.rest` はエラーを返すだけで、落ちることはありません。

:::note
探しに行くのは、デスクトップアプリが動いている端末の中だけです。離れたバックエンドにつないでいる場合、向こうの `~/.hermes/plugins` はファイルとしては見えないので、デスクトップ側が加わるのはその端末に入っているパッケージだけです（単体のディスク方式と同じ決まりです）。
:::

### インストール用のリンクで配る {#install-link}

プラグインのリポジトリ（エージェント側、デスクトップ側、あるいは両方）を公開して、`hermes://` の形式でリンクしてください。ウェブサイトや README に置く、ただのアンカーで済みます。

```html
<a href="hermes://plugin/install?repo=owner/repo&enable=1">Install in Hermes</a>
```

利用者には確認のダイアログ（リポジトリの id、出どころへのリンク、そのリポジトリが何を含んでいるかの下調べ）が出て、何かが入る前にどの部分を入れるかを選べます。ディープリンクが勝手にインストールすることはありません。`force=1` は既存のインストールを置き換えます。開発版のビルドでは `hermes-dev://` を使います。リンクの詳しい一覧は [ワンクリックのインストールリンク](/hermes/docs/user-guide/features/plugins/#one-click-install-links-desktop) にあります。

### Python 側 {#the-python-side}

デスクトッププラグインは、ダッシュボードのプラグインのバックエンドの取り付け口をそのまま使います。バックエンドは通常の Hermes プラグインの `dashboard/` サブフォルダに置き、`manifest.json` で宣言します。

```
~/.hermes/plugins/<id>/
└── dashboard/
    ├── manifest.json      # { "name": "<id>", "api": "plugin_api.py" }
    └── plugin_api.py      # exports `router = APIRouter()`
```

```python
# plugin_api.py
from fastapi import APIRouter

router = APIRouter()

@router.get("/board")
async def board():
    return {"items": ["one", "two", "three"]}

@router.post("/action")
async def action(body: dict):
    return {"ok": True, "received": body}
```

経路は `/api/plugins/<id>/` の下に取り付けられます（`GET /api/plugins/<id>/board` など）。バックエンドのコードはゲートウェイのプロセスの中で動くので、hermes-agent のコードベースから直接 import できます（`hermes_state`、`hermes_cli.config` など）。バックエンド側の詳しい説明は [ダッシュボードを拡張する → バックエンドの API 経路](/hermes/docs/user-guide/features/extending-the-dashboard/#backend-api-routes) を参照してください。取り付け口は同じものです。

:::caution Python のバックエンドは別に守られています
デスクトップの**設定 → プラグイン**でプラグインを有効にするのは画面側の話で、Python を読み込むわけでは**ありません**。利用者が入れたプラグインの `plugin_api.py` が読み込まれるのは、そのプラグインが `config.yaml` の `plugins.enabled` の許可一覧に入っている（かつ `plugins.disabled` に入っていない）ときだけです。プロジェクトのプラグイン（`./.hermes/`）が Python を自動で読み込むことはありません。これは見落としではなく、安全のための線引きです（GHSA-mcfc-hp25-cjv7）。
:::

### プラグインから呼ぶ {#calling-it-from-the-plugin}

```javascript
register(ctx) {
  // REST — namespace-relative path.
  const load = () => ctx.rest('/board')                 // GET /api/plugins/<id>/board
  const act  = () => ctx.rest('/action', { method: 'POST', body: { go: true } })

  // Live twin — a WebSocket to your own namespace.
  const stop = ctx.socket('/events', frame => {
    queryClient.invalidateQueries({ queryKey: [ctx.source, 'board'] })
  })
}
```

`ctx.rest` はプロファイルを見分けたうえで、上の階層へ抜ける書き方（`..`）を拒否します。ですから、これを通して他のプラグインの API や本体の経路を呼ぶことはできません。`PluginRestOptions` は `{ method?, body?, upload?: { filename, contentType?, bytes }, timeoutMs? }` です。

`ctx.socket` は、片付けられるまで間隔を空けながら自動で再接続します。**OAuth でつなぐ離れた環境では何もしません**（使い捨ての WebSocket 用の券は本体が管理しているためです）。ソケットは定期取得を速くするおまけと考えて、置き換えにはしないでください。どんなソケットも切れることはあるので、どの利用側にも定期取得の逃げ道が必要です。

自分の領域ではなくゲートウェイ全体のデータが欲しいときは、代わりに `host.request`（JSON-RPC）と `host.onEvent`（ゲートウェイのイベント）を使ってください。

## 設定、有効・無効の状態、保存 {#settings-enable-state-and-storage}

有効かどうかによらず、すべてのプラグインが**設定 → プラグイン**に並びます。ここで利用者は、アプリを再起動せずに切り替えたり、フォルダを開いたり、探し直させたりできます。選んだ内容は覚えられます。

- まだ選んでいなければ、そのプラグインの `defaultEnabled`（既定は `true`）に従います。`defaultEnabled: false` にすれば、利用者が入れるまで暗いままの、選んで使う形のプラグインにできます。
- はっきり選ばれた場合は保存され、再起動しても守られます。無効にされたプラグインは無効のままです。抗わないでください。利用者があなたを切ったのです。

自分の状態を残すには `ctx.storage` を使います。プラグインごとに名前空間が分かれている（`hermes.plugin.<id>.*`）ので、プラグイン同士で読んだり壊したりできません。

```javascript
ctx.storage.set('lastTab', 'board')
const tab = ctx.storage.get('lastTab', 'summary')
ctx.storage.remove('lastTab')
```

## 同梱プラグイン {#bundled-plugins}

プラグインは、ツリーの中の `apps/desktop/src/plugins/<id>/plugin.tsx` として同梱することもできます（`HermesPlugin` を default export します）。起動時に `discoverBundledPlugins()` が見つけるので、import もレジストリの書き換えも要りません。並びに出ることも、その場で有効・無効を切り替えられることも、ディスク方式とまったく同じです。違うのは 2 点だけです。

1. アプリの Vite ビルドを通るので、**本物の JSX** が書けて、SDK も `@hermes/plugin-sdk` の別名で import できます。
2. それでも lint により `@hermes/plugin-sdk` と `react` だけに制限されていて、`@/…` のアプリ内部には触れません。

今のところ中核のツリーにデスクトッププラグインは 1 つも入っていません。配られるアプリを散らかさないためで、デモは別リポジトリの [`hermes-example-plugins`](https://github.com/NousResearch/hermes-example-plugins) にあります。

## 安全の考え方 {#security-model}

読み込まれたプラグインは、画面を描く側の領域で ESM として評価され、**アプリと同じ権限**を持ちます。React の実体、SDK 全体（`host.request` のゲートウェイ RPC、`ctx.rest`、保存、`navigate`）に手が届きます。読み込みの仕組みが用意しているのは**例外の切り離しだけ**です。プラグインがアプリを落とすことはできません（寄与はエラー境界に包まれ、購読の処理も切り離されています）が、アプリにできることは何でもできます。

これが許されるのは**手元の**出どころに限った話です。ディスク上のファイルは、そもそもあなたの端末でコードを実行できてしまうからです。だからディスク方式の入口は、あなた（かあなたのエージェント）が書いた手元のファイルしか読み込みません。任意の `integrity`（`sha256-…`）の検査は、バイト列がハッシュと一致することを示すだけで、隔離は**しません**。将来、離れた場所から取ってくる入口を作るなら、その前に本物の境界（iframe か worker、CSP、権限の絞り込み）が必要です。この経路を信用の境界として扱わないでください。

## つまずきやすいところ {#pitfalls}

- **ディスクに置いたプラグインでは JSX は解釈されません。** ファイルはそのまま読み込まれるので、JSX の構文ではなく `jsx()` / `jsxs()`（あるいは `React.createElement`）を使ってください。（同梱プラグインはビルドされるので、そちらでは JSX で構いません。）
- **解決されるのは 3 つだけです。** `@hermes/plugin-sdk`、`react`、`react/jsx-runtime`。ほかの import があると、読み込みの時点でエラーになります。
- **色を直接書かないでください**（`#000`、`black`、`rgb(...)`）。背景はそのままにして、それ以外はテーマ変数（`var(--ui-*)`）で指定します。
- **import したものだけを使ってください。** import し忘れたコンポーネント（たとえば `StatusDot`）は、描画時に `ReferenceError` になります。`jsx()` の中に出てくる名前が、すべて import の行にあるか確かめてください。
- **ハンドラの中では状態を都度読み取ってください**（`$atom.get()`）。描画時に閉じ込めた値を使うと、素早く続くイベントで古い値を見てしまいます。購読（`useValue`）するのは、その値を実際に描く末端だけにします。
- **canvas のペインは入れ物の大きさを追いかけてください。** `ResizeObserver` を使い、canvas の大きさを（CSS だけでなく width / height の属性で）変えます。ペインの大きさは絶えず変わります。
- **`host.request` を数秒より短い間隔で叩かないでください。** `host.onEvent` / `ctx.socket` を選び、重複は React Query に任せます。
- **`ctx.socket` は OAuth の離れた環境では何もしません。** 必ず定期取得の逃げ道を用意してください。

## 早見表 {#reference}

### SDK が公開しているもの {#sdk-exports-at-a-glance}

| 分類 | 公開されているもの |
|----------|---------|
| ホスト | `host`（`.state.*`、`.notify`、`.notifyError`、`.navigate`、`.onEvent`、`.logs`、`.status`、`.restartGateway`、`.request`） |
| プラグインの約束事 | `HermesPlugin`、`PluginContext`、`PluginContribution`、`PluginStorage`、`PluginOs`、`PluginRestOptions`、`PluginNativeNotificationInput`、`PluginNotificationAction`、`HermesOpenTarget`、`Contribution` |
| 場所を表す定数 | `PANES_AREA`、`ROUTES_AREA`、`SIDEBAR_NAV_AREA`、`STATUSBAR_AREAS`、`TITLEBAR_AREAS`、`PALETTE_AREA`、`KEYBINDS_AREA`、`THEMES_AREA`、`COMPOSER_AREAS` |
| 場所ごとの中身 | `RouteContribution`、`SidebarNavContribution`、`StatusbarItem`、`TitlebarTool`、`PaletteContribution`、`KeybindContribution`、`ComposerMiddleware`、`ComposerAttachmentProvider` |
| React と状態 | `useValue`、`atom`、`computed`、`useQuery`、`useMutation`、`useQueryClient`、`queryClient`、`Contribute` |
| UI キット | `Button`、`Input`、`Textarea`、`Select*`、`Switch`、`Checkbox`、`SegmentedControl`、`Tabs*`、`Dialog*`、`ConfirmDialog`、`DropdownMenu*`、`ContextMenu*`、`Popover*`、`Tip`/`Tooltip*`、`Badge`、`Kbd`/`KbdGroup`、`SearchField`、`ScrollArea`、`Separator`、`Skeleton`、`GlyphSpinner`、`Loader`、`EmptyState`、`ErrorState`、`CopyButton`、`StatusDot`、`LogView`、`Codicon`、`DecodeText` |
| 補助 | `cn`、`icons`、`haptic`、`useI18n`、`profileColor`、`profileColorSoft`、`relativeTime`、`fmtDateTime`、`fmtDayTime`、`coarseElapsed`、`evaluateRuntimeReadiness` |

いつでも最新の正式な一覧は `apps/desktop/src/sdk/index.ts` です。

### エージェント向け: `hermes-desktop-plugins` スキル {#agents-the-hermes-desktop-plugins-skill}

エージェントがデスクトッププラグインを書くときは、同梱の **`hermes-desktop-plugins`** スキルを読み込ませてください。このページと同じ内容を、エージェントが読む形にまとめたもので、そのまま写して使える `templates/plugin.js` も付いています。このページは人が読むための資料、スキルは作業用のチェックリストです。

## うまくいかないとき {#troubleshooting}

**プラグインが出てこない。** ファイルが `$HERMES_HOME/desktop-plugins/<id>/plugin.js` にあり、フォルダ名が export した `id` と一致しているか確かめてください。⌘K → **Reload desktop plugins** を実行します。失敗の内容を告げるエラーのトーストが出ていないか確認し、`hermes logs gui -f` でログを追ってください。

**読み込み時に「unsupported import」と出る。** ディスクに置いたプラグインが import できるのは `@hermes/plugin-sdk`、`react`、`react/jsx-runtime` だけです。ほかの import を消してください。

**`jsx` の要素が何も出ない、または `ReferenceError` になる。** `jsx()` の中で使っている名前が import されていません。import の行に足してください。

**`ctx.rest` が 404 を返す。** バックエンドが取り付けられていません。`~/.hermes/plugins/<id>/dashboard/manifest.json` に `"api": "plugin_api.py"` があるか、そのプラグインが `config.yaml` の `plugins.enabled` に入っているかを確かめて、ゲートウェイを再起動してください（バックエンドの経路は起動時に取り付けられます）。`~/.hermes/logs/errors.log` を追って `Failed to load plugin <id> API routes` が出ていないか見てください。

**`ctx.socket` が一度も呼ばれない。** OAuth でつなぐ離れた環境では、設計どおり何もしません。定期取得の逃げ道を使ってください。それ以外の場合は、バックエンドがその領域に対応する `@router.websocket(...)` の経路を出しているか確かめます。

**テーマを切り替えたら色がおかしい。** 色を直接書いています。`var(--ui-*)` のテーマ変数に置き換えてください。
